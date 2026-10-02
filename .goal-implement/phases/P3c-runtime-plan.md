# P3c 読取実行と projection の接続案

2026-09-10T23:25:44+09:00。文書だけの提案。`design.md` の方式・値、`P3c-feasibility.md` 全253行と監視補足、`reviews/P3c-prep.md` 全文、現行のNode boot/launcher/UoW/client/画像Worker/HTML sanitizerを照合した。新しい実装・計測・製品合格はない。FTS、Unicode16.0.0、Temporal polyfill0.5.1、検索意味、queue16/同時読取1/総3秒は採用済みとして扱う。

結論は、公開read transactionを専用read adapterへ閉じ、Manager提案の「HTTP main → 監視専用child main → 同child内query Worker」を第一候補にすること。独立監視の役割を維持しつつ、孤立した孫processを作らない。配置変更と下記の構造非表示規則は採用判断へ返す。

## 1. 内側port・DI・現在snapshot

| 配置候補 | 責務 | 渡さないもの |
| --- | --- | --- |
| application `NoteBrowseQuery` / `SearchExecutionPort` | 検証済みscope、terms、tag IDs、UTC区間、sort/cursor、request identity、取消を表す実行契約 | 任意SQL、DB path、認可済boolean |
| application `BrowseReadSnapshotPort` | 現在session/account/scope policyと一覧・検索・件数・tag/calendarを同snapshotで読む固定query契約 | mutation repository、event collection、汎用execute |
| Node `SearchExecutionAdapter` | 有限FIFO、唯一のChildProcess handle、期限、IPC validation、closeまでの所有 | DB/HTML解析、秘密を含むlog |
| libSQL read adapter | 公開Transactionから固定SQLを発行し、限定DTOへ写像 | write UoW、outbox、storage、mailer、索引作成 |
| Node query-worker wiring | read client、固定read usecase、clock/normalizer/versionの注入 | `boot()`、通常worker runner、全HollowContainer |

名称は詳細実装時に確定する。portをdomainからadapterへ逆向きに参照しない。DTOとquery意味はapplication内、プロセス操作はNode adapter、外部入力Zod等はpresentation/IPC境界へ置く。

現在の `application/note/listNotes.ts` は `unitOfWorkProvider.run` 内で `requireAccount` とnote読取を行う。新検索をそのcallback内で待たせない。外側入口が通常sessionを確認した後、sessionのhash等の型付き参照とactor IDをprivate IPCへ渡す。子は同read transactionのsession期限/account状態を再確認し、actor IDとの一致、scope所有/member、active lifecycleを現在行から判定する。session hashも認証相当の機密参照としてlog/argv/URLへ出さない。親のaccount IDだけを現在認証の証拠にしない。

検索SQLは採用済みFTS候補起点→current rows→exact terms→order/keyset→LIMIT51。同じsnapshotで最大50件のmetadata/抜粋を作る。tag/calendar/countにも同じ可視集合を使う。月集計と日初期項目が複数SELECTでも同一Transactionに閉じる。親が結果後に旧IDからHTML/titleを読み足す方式にはしない。画像URLは同snapshotの正確なcurrent参照から組み立て、実配信時にも既存現在認可を再確認する。

子のDTOは判別union（note page/tag page/calendar）、有限件数、抜粋160code point、有限mark範囲、cursor/conditions identityに限定する。title/tag等も既存VO上限内。calendarは日数分のcount＋各日3件、追加は50件まで。巨大なprojection/HTML全体や曖昧な`unknown[]`を親へ送らない。各IPC hopで件数・文字長・enum・identityを検査し、transportの上限を素通りした内部巨大messageを受けない。

### 公開APIによるread-only境界

配置済み `@libsql/core@0.18.0` のpublic `Client.transaction("read")` は `BEGIN TRANSACTION READONLY` と定義される。local `sqlite3.js` も同じ変換を使い、取得したconnectionをTransaction終了まで保持する。専用adapterはこのTransactionだけに固定SELECTを発行し、finallyで `transaction.close()` と `client.close()` を行う。現 `serializedClient.ts` もmodeを透過し、Transaction生存期間の所有を維持している。private pool/native handleへ触れない。

`client.execute("PRAGMA query_only=ON")` の後で別のlogical connectionを使う構成は採らない。通常 `applyPragmas()` のWAL設定やwrite UoWを子で呼ばない。public configにはOSレベルのread-only open保証がないため、「固定read transactionのみ」と「filesystemが一切書込不能」を同一視しない。SQLiteのWAL/SHM管理も禁止できたという主張はしない。bootで解決した既存のlocal file DBだけをprivate wiringから渡し、不在・`:memory:`・未接続remoteは明示構成エラーとする。利用者指定pathや空DB自動作成へfallbackしない。

正式接続では通常SELECT/同snapshotとread内INSERT拒否を小さい隔離DBで確認する。driverの公開modeが実runtimeで成立しなければ、private BEGIN facadeへ逃げずこのread接続を止めて返す。既存write client/FD/queueは変更しない。

## 2. 監視配置の比較

| 配置 | 根拠・利点 | 未証明/欠点 |
| --- | --- | --- |
| HTTP → supervisor process → read process | 先行の独立timer/SQL終了方式に近い | supervisorがfork後PID登録前に消える空白がある。子のdisconnect callbackも同期SQL中には動かない。追加watchdog/所在台帳が必要 |
| HTTP → supervisor child main → query Worker（第一候補） | SQLをHTTP/監視の両event loopから分離。HTTPが唯一のChildProcessを直接所有。監視process異常終了時、query threadだけが別OS processとして残らない | 現libSQL native addonのWorker内利用、SQL中の監視timerと全process終了は実装時の狭い確認が必要 |

第一候補はqueryごとに1 childを作り、child内にquery Workerを1つ作る。通常結果もWorker/client終了→child終了→HTTP側close確認を経て確定する。常駐childの再利用は追加しない。これで「result受信したが旧資源は残る」期間も同じslotに含める。

Node公式ではWorker内 `process.exit()` はthreadだけを止め、親processへのIPCはWorkerから直接使えない。child mainがIPC/timerを持ち、query WorkerへはMessagePortで有限queryだけを渡す。native addonの複数thread利用には条件があるため、既存sharp Worker成功をlibSQL対応の証明にはしない。[Node22.22.3 Worker](https://nodejs.org/download/release/v22.22.3/docs/api/worker_threads.html#class-worker)

### 所有と期限

- queueはHTTP adapterのprocess共有インスタンスに1つ、FIFO最大16。active1枠と別に数える。requestが17件の待機枠を超えれば再試行可能な混雑を返す。未送信IPCを第2の無界queueにしない。送信するのはactive1件だけ。
- application入口で受付時刻/期限を作る。HTTP mainの同期writeでqueueの掃除が遅れても、取り出し時に残予算を再確認し、期限切れをforkしない。queue待ち・spawn・IPC・Worker起動・SQL・DTO・終了を新しい3秒へ更新しない。
- process間の`performance.now()`単体は比較しない。Node adapterがepochへ換算したmonotonic時刻（timeOrigin＋now）とbudgetを扱う。各process起点の整合は代表確認する。外部ユーザーのdeadline値を採用しない。
- childの最小bootstrapはDBやparser importより先に残期限のtimerを設定する。期限の数値だけはfork起動情報に渡せるが、query/session/DB設定/秘密はargvへ入れない。query IPC未到着でも期限で終了する。SQL用Workerの起動はbootstrap完了後だけ。
- 総予算の末尾に終了余裕を確保する。具体の余裕幅は起動/close測定から設定し、3秒を延長しない。期限前の停止開始とclose完了を別のmetricにする。期限後のDTOは失敗/timeoutであり成功にしない。
- child mainはtimeout/親IPC disconnectを処理し、read process全体を終了する。通常終了はWorkerのexitとclient closeを待つ。native SQL中の `worker.terminate()` 完了や通常 `process.exit()` のshutdown待ちを期限保証にしない。緊急境界はchild mainから `process.kill(process.pid, "SIGKILL")` で自分だけを終了する案を優先する。通常exitとの比較も含め、native SQL実行中の全thread終了は未実測であり、本体冒頭の狭い対で確認する。write processや任意PIDには適用しない。[Node process.exit](https://nodejs.org/download/release/v22.22.3/docs/api/process.html#processexitcode)、[Node process.kill](https://nodejs.org/download/release/v22.22.3/docs/api/process.html#processkillpid-signal)
- HTTP側は同じChildProcess objectのcloseが来るまでslotを保持する。結果message、kill送信、`killed=true`、error、PID不在推測をcloseへ読み替えない。正常結果を受けてもclose前は次をforkしない。[Node ChildProcess close](https://nodejs.org/download/release/v22.22.3/docs/api/child_process.html#event-close)
- childの監視main自体が異常終了した場合も、HTTPが所有するhandleのcloseで同process内Workerを含む終了を確認してから回復する。PID登録前の孫生成がないので、PID再探索/旧孫が消えたとの仮定は不要。
- closeが来ない間は枠を隔離し、新childを増やさず明示利用不可とする。旧processへ任意PID探索で強制終了を広げない。HTTP main自体の突然の死亡時はchildのdisconnectと自律期限で収束する。ただし、その後の別HTTP process起動との原子的handoffや全process同時障害まで実証したとはしない。通常再起動は既知child収束を確認する既存運用に接続する。

これで独立するのは実検索計算の停止と有限実行資源である。同期writeで停止中のHTTP mainから即時に応答を配送する保証、queue timerの厳密リアルタイム保証は加えない。待機中は計算childを持たず、期限切れを後で実行しない。

### 実装時に残す最小確認

public native addonをquery Workerで読取→closeできる正常対、長いSQL中にchild main timerが動く対、query正常/timeout/取消/監視child強制終了/親IPC切断後のcloseと次の正常query、queue満杯/待機期限/起動失敗/旧DTOを確認する。対象は新自己file DBと既知自己childだけ。全FD監査・大量stress・OS service導入へ広げない。

Worker対応またはchild mainによる全体終了が不成立なら、この配置を成功扱いしない。元3process案へ戻す場合も所在未確認のforkを自動再起動で隠さず、必要な回収策をManagerへ返す。現時点は配置の選択案であり、追加gateを先行実行していない。

## 3. Node boot・drain・buildの最小接続

`server.node.ts` のbootで実行adapterを一度作り、HollowContainerにportとして渡す。SSR/RSCで別生成しない。`createHollowContainer` の通常write UoWはそのまま使う。query-worker側は小さな専用DIでread portだけ作り、通常containerの副作用を起動しない。

launcherのHTTP受付停止→boot.shutdownに接続し、検索の新規受付停止/queue取消/active child close待ちをDB closeより前へ置く。既存import/reference/purge/invitation/icon drainとrunner.stop/client.closeの順は維持する。shutdownは既存の共有promiseで冪等とし、検索adapterもstop promiseを一度だけ作る。検索失敗でwrite workerまで強制終了しない。

現Node buildはVite server entry、画像Workerはpackage内の`.mjs`をURLで参照する。新read usecaseはTSなのでdev loader依存のままproductionへ渡さない。Node専用buildに監視entryとquery-worker entryの独立ESM出力を追加し、`dist/server/search/`等の固定成果物として配置する案を採る。native `@libsql/client`/`libsql`は現在同様external。監視entryはNode IPC/timer/型付きwire validatorだけで、DB/HTML parser/大mappingをbundleへ混ぜない。entry位置はbootから固定し、client入力で選ばせない。

buildは本体実装時に既存のproduction停止手順後に行う。実配布物だけの通常起動/停止、entry不在fail-closed、Workerからpublic native module解決、同bundle identityを確認する。CF/AWS/GCP対応を今回の新成功に含めない。

## 4. Unicode・構造text・offset

タグは採用どおりUnicode16.0.0のUnicodeData wide/narrowとCaseFolding C/Fだけを固定data化し、`NFD(CF(NFD(W(name))))`を計算する。generator入力の版/出所/license、生成版を記録する。同期純粋normalizer portは意味versionを返し、wiringがruntime Unicode16.0と正規化の16.0.0対応を照合する。違う版では新key生成/検索を明示停止し、自動mergeしない。locale T、かな統合、互換全体、アクセント除去は追加しない。

検索側のNFKC＋locale非依存lowercaseとタグfull CFは別関数/別意味versionにする。現在/旧projectionとFTS削除tokenは同版で扱う。cursorに意味versionを含め、異版backfillをreadyと偽らない。Temporal0.5.1は日付adapterだけへ入れ、Node/ICU/tzdata識別を保持する。

現在 `NodeHtmlSanitizer.sanitize().text` はregexによる一部改行挿入＋sanitize-htmlのstrip処理であり、検索offset/構造規則の正本へそのまま流用しない。現canonical HTMLを入力とする別のpure projection adapterを置く。正本parser/sanitizerや本文を変更せず、既存parse5 HTML5投影を構造読取に利用する案。解析は保存前の隔離解析側へ置き、結果のsource identity/versionを同UoW commitで照合する。監視processやwrite UoW内で巨大HTMLをparseしない。

構造規則の具体案:

- bodyのtextだけを読む。script/style/head/template/commentはsubtreeごと除く。属性値/URL/alt/CSS sourceを検索textへ加えない。entityはparserのtext値として一度だけdecodeする。
- inline要素間は連結し、block/heading/list item/table cell/row/brの境界を明示separatorにする。境界separatorで語が誤連結しない。段落前後の重複separatorは縮約し、表示projectionと比較projectionに同じ区間関係を持つ。
- `hidden`属性は値によらず構造非表示としてsubtree除外する（until-foundも含む）。inlineの有効な`display:none`と`content-visibility:hidden`もsubtree除外する。
- inline `visibility:hidden/collapse`は当該textの非表示stateとして継承し、子の明示`visibility:visible`で戻せる。display/hiddenによるsubtree除外はvisible指定で戻さない。
- inline宣言は既存css-treeで解析し、同じpropertyの有効な既知値についてimportant優先・同優先度後勝ちで決める。escaped property/valueはparserの解釈を用いる。無効な宣言や未解決varだけから非表示と推定しない。
- stylesheetのselector/cascade、media query、任意custom property解決、opacity/clip/画面外配置、viewport、pseudo textは評価しない。`aria-hidden`だけでは視覚非表示としない。これらは「構造上の本文」であり、pixel可視性の保証ではない。

hidden/inline非表示規則は原文未指定の詳細なので採用確認を求める。一般CSS計算の実装へ拡張しない。正常table暗黙要素、inline連結、CRLF/pre、entity/emoji/結合文字とhidden正常/拒否対を既存800KiB/DOM・深さ資源境界内で確認する。

表示text、比較text、位置の単位は別型にする。SQLite `instr`の文字位置とJS UTF-16 offsetを混用しない。NFKCによる拡張/合成を含む区間対応を生成し、一致範囲を元表示の安全なsegmentへ戻す。code pointを独立にnormalizeして結合列を壊す方式は採らない。必要な対応segmentを派生projectionとして永続化し、SQLで一致周辺の有限区間だけ取得する。queryごとに50件分の全HTMLを親へ運んでhighlightを作らない。正確な範囲対応の実装・量の測定はP3c-A/Cの本体残条件であり、先行の既知text測定に含めない。

## 判断依頼と停止

採用判断は2点だけ: 監視専用child＋同child内query Workerへの簡素化、上記の構造非表示規則。read port/公開read transaction/DI/buildはその成立確認に従う最小接続案。新しいユーザー機能や全write移設を提案しない。

goal-implement/manager-loopとMarkdown/doc-styleを使用。書込みは本書だけ。製品/依存/DB/storage/mailbox/browser/process/test/build/hash/git/固定temp/goal API/管理直下は無操作、補助なし。公式Node資料と配置済みpackage sourceのread-only確認だけを行った。P3b2の修正・P3c本体は開始せず、文書提出後に全停止する。
