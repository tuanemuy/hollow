# P3e 一括選択・永続処理

## 状態

P3e-A〜H と既オープン先行18枝の完成候補を 2026-09-19 に固定した。自己検証は合格、独立検証は未実施。候補は `2ee4826b6422a9f5ae38aa0e2c637e0c3b9276a8`。再開後の根拠・借用範囲・保全・全停止は本書後半に記す。Manager 管理文書と goal API は変更していない。P4/P5 の公開・ダウンロード・Drive、P3f は未提供。

## 開始保全

15:19:18.634 JST に固定識別子と新保全を確認した。

- HEAD: `9bc4f9a3ea7e8f2103b9056246f2691b7788d6b6`
- source: 807 files / `5d26b4d314fb650eb77e0b9f70feb0a65cbea4dab9631b690d6cf2dbe4b8b79d`
- lock: `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`
- bundle: `a89bb2b12847977d8f7dd492ea37f2899766b315f0884b59dc7065dbf756d611`
- production: PID 95692 / session 97756。Node 22.22.3、cwd `apps/web`、127.0.0.1:3000。既知 PID の cwd と fresh DB 接続を限定照合した。
- 新保全: `/Users/hikaru/.local/share/hollow/verification/p3e-batch-QvYtHy/start`。online DB backup と 8 objects / 2,817 B の排他コピーを保持。57 B の writer owner lock は payload と quota から除外する。
- 基準: 87 notes、2 assets、5 originals、98 revisions、87 projections、23 tags、140 relations、9 scopes。writer/conversion/reference/displaypending/nonactive は 0。

招待鍵と資格情報の値・値 hash は取得しない。

## 初回接続

新 migration 0022 を生成した。clone と本体には未適用。4 表は parent / target / attempt / holding receipt。最大 500 の固定順と同 parent の単一 running を保持する。

| 実変更 | 責務 | 先行条件 |
| --- | --- | --- |
| `application/tag/usecases.ts` | 単一 tag command の Tx 内 core 共用。新規 tag と付与・binding・結果を同 commit にする | P3d-1-A/E |
| `application/note/trash.ts`, `purge.ts` | 単一 trash core、外部 lifecycle 取消、自己 trash attempt の除外 | P2d-1-A、P2d-2-A/C |
| `application/workspace/membership.ts` | edit-loss の actor/scope batch 取消。owner→editor と同値は不変 | P3b-1-C |
| `application/move/usecases.ts`, `expected.ts`, `ports.ts`, `noteMoveRepository.ts` | Tx 内 move core と有限 bundle post-state。holding だけを自己 receipt から導出 | P3d-2-B/C/D |
| `application/browse/ports.ts`, `node/browse/wire.ts`, `libsql/browseReadSnapshot.ts` | 同 executor の selection kind、現在認可・exact 条件後の 501 sentinel | P3c-A/G |
| `application/batch/*`, `domain/batch/entity.ts`, `batchSchema.ts`, `batchRepository.ts`, UoW/DI | 新しい永続受理・子処理・履歴・取消 | P3e-A〜H |

selection は既存 tag AND 条件を呼ぶ。AND SQL、Unicode 同名、既存 tag 候補の意味は変更しないため、P3c-D 全体の再検証は申請しない。

15:29 の初回通知時点では型・DB・500 件計測は未実行。schema 生成と保全成功を機能合格には数えない。受理 DTO は表示用 audience 配列を含めず expected だけを送る。payload と受理 SQL、worker lease/周期は次の隔離測定で具体化する。既存 R1 時計、FD、codec、PM、20 版本体、容量算式は変更しない。

補助は未起動。全環境は主担当だけが操作する。

## 15:41〜15:56 の途中根拠

全体 `pnpm typecheck` が成功した。後続の attempt number / retry digest / runner 追加後は core typecheck が成功した。補助 UI は作成中で、最終全体 checks は未実行。

`pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/batch.integration.test.ts` は 15:41:24 run で 9/9 成功。受理冪等、固定順、tag binding 後の外部 delete 拒否、51 個目の全 rollback、新 failed attempt、waiting cancel と running 結果、自己 trash 成功・外部 trash 取消、A/B shared holding receipt、外部 C の往復 ABA を含む。

| 隔離測定 | JSON bytes | preview | 受理 | 最初の子 |
| --- | ---: | ---: | ---: | ---: |
| 500 tag 対象、タグなし | 75,605 | 未記録 | 154.4 ms（別 run 180.9 ms） | 順序と binding を確認 |
| 500 move、0 tag/資源なし | 450,648 | 512.8 ms | 267.2 ms | 6.70 ms |
| 500 move × 50 合法長名 tag 対応、資源なし | 34,025,148 | 806.7 ms | 1,136.9 ms | 198.7 ms |

最後の形は 25,000 mapping、各 50 codepoint の Hangul 名による NFD 展開を含む。15:52:10 の installed Seroval 対では wire 39,328,873 B、encode 697.2 ms / decode 151.2 ms、同値復元後の受理 1,134.2 ms。実参照は start-client-core 1.168.2 / start-server-core 1.167.30。後者の 1,000,000 文字制限は GET payload の分岐で、POST は `request.json()` → Seroval decode。POST である受理の HTTP 成立は別途確認する。

初回 codec 測定は require 条件のない ESM package main の解決で fixture が失敗した。実依存 package の所在から codec を読み、再実行が成功した。製品の受理失敗ではない。heap 前後差は peak/上限/SLO の保証ではない。大きい固定資源値はこの資源 0 の対と分ける。

15:55:13.236 JST の clone 結果は `clone-result.json`。新規コピーの before/after DB だけを driver で読んだ。旧 52 tables の全旧列/全行差 0、9 scope の charge pairs は 2143/0/0/516/0/0/0/75/83 B で全一致、FK 0、integrity `ok`、migration 履歴 22→23。基準 8 objects は start の排他コピーを保持。本体 0022 は未適用。

worker 初期運用値は Manager 採用済みの lease 60 秒、周期 2 秒、1 wake 最大 20 子。同 parent 1 running、stop は新規 claim 停止後に現在 Tx を待つ。60 秒は hard I/O deadline ではない。旧 running は lease 超過で `BATCH_INTERRUPTED` failed、同 attempt の自動再実行なし。明示 retry だけ新 attempt/試行番号 +1、親 generation とは別。成功 ack 喪失では結果だけを確認する。

補助 `/root/p4_contract` は承認済みの `components/batch/**`、`components/hollow/{ScopedNotesBoard,NoteList,ImportJobs}.tsx`、`routes/notes.jobs.tsx` を whole-file 専有して作成中。型・test・format・build・環境実行は禁止。主担当は返却まで同 file を変更しない。root provider/manifest、CSS import、API/core/schema/runtime と全環境は主担当が所有する。

## 16:04〜16:12 の途中根拠

16:04:56 までの batch integration は 22/22 成功。lease 59,999 ms/60,000 ms、別 instance の中断 failed、旧 token 不採用、明示 attempt 1→2、commit 後 ack 喪失の結果保持、receipt 欠落・別 parent・外部 ABA、B 自身の resource 変更、tag 管理 revision 非干渉を含む。5 GiB 原本と移動先 15 GiB は論理 metadata の隔離容量対で、実 20 GiB file は作っていない。上限一致は成功、追加 1 B は全体不採用、無関係 83 B usage 変化は再確認にしない。

selection snapshot は 3/3 成功。502 件の 501 sentinel、500 件許容、exact 前の false candidate、AND tag/current scope、未完 index と期限切れ認証を区別した。初回 tag fixture の meaningVersion に `16.0.0` を使用したため通常一覧も selection も 0 件になった。実 normalizer の algorithm version へ fixture を訂正し、製品 guard は変更していない。500×50 tag 測定も正しい algorithm version で再成功した。

最新の大 payload は JSON 34,025,148 B / installed codec wire 39,328,873 B。preview 966.44 ms、encode 730.18 ms、decode 166.34 ms、受理 1,063.53 ms、最初の子 196.35 ms。自己隔離 DB と ephemeral loopback Hono server の POST は HTTP 200 / 500 受理、2,023.46 ms。実 installed codec と HTTP body の成立であり、本体 serverFn/middleware/Zod の成功ではない。heap 前後差 53,450,680 B は peak 保証ではない。

16:11:13 run の追加寿命 1 対は成功。未終端 parent の 90 日期限外 receipt を保持し、title だけ非表示、終端後に期限外連続 prefix と親を回収する。期限外 failed 子を新 preview で復活させない。16:11:57 run の native executor 追加 1 対も成功し、selection→通常 notes→認証失効拒否→同 executor の次正常を確認した。旧 clock/停止方式は変更しない。

実変更の先行影響は計 18 枝。上表の 11 枝に、三表示/親 selection の P3c-B/E・P3d-1-B、履歴/ticker/通知共存の P2a-E・P2d-3-D/E・P1-E を追加した。UI 補助は作成のみで、実 UI はまだ未確認。本体 PID 95692 / session 97756・schema 0021・受入 bundle は不変。

## 16:14〜16:39 の統合根拠

16:14:45 の隔離対で、trash の bool/version が同じまま active job ID が入れ替わると、旧 expected が新処理を取り消す不具合を再現した。期待は failed/succeeded、実結果は succeeded/succeeded。Manager 承認後、batch trash expected だけへ `processingFingerprint` を追加した。同 UoW の queued/running の種類・ID を正規順で hash し、preview/受理/子 Tx で比較する。同 ID の queued→running/進捗は許容し、新 ID は拒否する。単一 trash core/schema/job 方式は不変。修正後 25 DB 対が成功した。

補助は 16:15:43 に 14 製品 path と報告を返却し、全操作を停止した。20 pure 対は返却時には未実行。主担当が root provider、validated matches 由来の actor 表示 guard、manifest/CSS、picker の頻度順候補を統合した。BrowseProvider/単一 palette は移動していない。picker は固定選択内の現在合法な note を最大 500 まで有限に探し、実 scope を照合する。その note の selected 状態を batch の選択へ流用しない。

- 規定 `pnpm typecheck && pnpm lint:fix && pnpm format` は成功。初回 lint は新試験の単一変数宣言規則 1 件で停止し、fixture 記法訂正後に再成功した。既存 warning/info は別扱い。
- 16:19:26 の標準 `pnpm test:unit` は 727/727、69 files。
- 16:19:38 開始の全直列 Node は `pnpm exec vitest run --config vitest.config.integration.node.ts --fileParallelism=false`、332/332、25 files、120.45 秒。無変更の 800 KiB projection もこの run は成功。過去 timeout の原因解消を意味しない。
- 本体 PID 95692 は既知 cwd/DB 確認後、16:17:10.637 に通常 TERM。draining、exit 0、SystemError 0、ESRCH を確認した。live dist は停止後に build した。
- `premigrate` の online backup/8 objects を保持し、16:19:18.337 に本体 0022 を適用した。新コピー同士で旧 52 tables 全旧列/行差 0、9 charge pairs 同値、FK 0、integrity ok。
- build 成功後、16:22:07 に PID 11316 / session 53387 を同 fresh root・127.0.0.1:3000 で起動した。鍵は同 private path のみ参照し、値・値 hash は取得していない。

本体 UI の自己新規 2 note `Batchself Alpha/Beta` に明示 create `Batchself Label` を一括付与した。親 1 / 子 2 成功、履歴は試行 1。既存 87 note/23 tag は破壊試験に使っていない。初回 URL の tags 省略→補完後の loading 残留 1 回は SystemError 0。完成 URL の通常 reload/hardopen は 2 件を表示した。元 R1 再発・恒久修正とは扱わない。

大 payload は同 built artifact の専用サーバーで確認した。root は `/Users/hikaru/.local/share/hollow/verification/p3e-batch-QvYtHy/transport-jAln7x`、DB/objects/mailbox/private key は新規分離、APP_URL は `http://127.0.0.1:3001`、PID 24029。16:37:21.822〜16:37:30.334 に通常 serverFn/middleware/Zod/実 session 認可で JSON 34,031,648 B / wire 39,335,373 B を送った。preview 838.06 ms、HTTP 1,568.66 ms、HTTP 200、同 request の DB parent 1 / targets 500 / attempts 500。同 payload 再送は同 parent 1、認証なしは 401、FK 0。正常 TERM→close exit 0、SystemError 0。main PID 11316 は切替・変更していない。以前の大 payload とは入力/run が異なり、6,500 B 差の原因は未確認。

試験用 response decoder は TypeError。response 解析成功とは扱わず、HTTP と DB 永続結果を根拠とする。前 2 回の `transport-l4MB2n` / `transport-xaYZcx` も受理後の decoder 失敗で、それぞれ parent 1 / targets 500 を保持する。初回 CJS/ESM helper 初期化失敗と起動失敗は別試行。いずれも追加巨大 POST の反復を終了し、専用 child を停止した。類似の small UI 受理応答は通常成功している。

16:39 までの自己 small UI 対では、2 note の tag detach を実受理した直後に fetch 応答だけを喪失させた。UI は「受付結果は未確認」、履歴への通常 navigation/invalidate 後も送信回数 1。利用者の「同じ要求の結果を確認」で 2 回目となり、body 同一、受理表示へ回復した。自動再送なし。自己 fetch hook は復元・除去済み。単一 move の応答不明契約と混同しない。

## 2026-09-19 完成候補

goal-implement/manager-loop に従い、再開照合 `reviews/P3e-resume-20260919.md` を引き継いだ。ブラウザ検証には manual-test を用い、Manager の制約を優先して単独で操作した。以下の日時はすべて `+09:00`。

### 固定識別と最終コマンド

| 対象 | 根拠 |
| --- | --- |
| candidate commit | `2ee4826b6422a9f5ae38aa0e2c637e0c3b9276a8`。56製品ファイルのみ。管理文書は stage/commit していない |
| source | 837 files / `a3099ee518ddbd0a6b329d45edc0090814b3a0cf296387bcf0472aaa35c526ac` |
| lock | `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`、無変更 |
| bundle | `4891ac67e8142ced8b8c748c809cc1f2e650540144fd8940ab3d3924596c5a78` (`dist/server/server.node.js`) |
| native workers | searchSupervisor `c64c52954e3c50b8c22a2d24de708025bc58ed205568e38ea24383286b05116d`、searchQuery `fa56e315877d3bcb83730178ac9505f049bf6e72c1ef000494f8345cb025c955`、noteProjection `55a3ab762a09b7b22abaf091dd1f8f1a3334942a1eb549929cd2714778694133`。再開監査と一致 |
| 規定 checks | 17:04台の `pnpm typecheck && pnpm lint:fix && pnpm format` 成功、修正0。既存36 warnings/34 infosは残る |
| unit | 17:12:27開始 `pnpm test:unit`、734/734、71 files、9.24秒 |
| Node | 17:12:37開始 `pnpm exec vitest run --config vitest.config.integration.node.ts --fileParallelism=false`、332/332、25 files、115.21秒 |
| build | 17:04台、通常drain後の `pnpm build` 成功。同成果物で以下の17:05以後のUIを実行 |
| source固定方法 | sorted/dedup `git ls-files -co --exclude-standard -z`、`.goal-implement/` 除外、path NUL bytes NUL 集約。最終17:14:52.097 |

再開時835 source/hash `33dc92f94ea1dae8f937ca1c8199d5500f47ee79a98853e39999702a63778749` に対する16:41の727 unit/16:42の332 Node、actor修正直後の729 unit/332 Node、通知flow修正前の734 unit/332 Nodeは途中根拠である。最終合格は上表の再実行へ置き換える。新pure fixtureのDate/string型誤りは初回型検査で検出し訂正、製品失敗とは扱わない。

### 再開後に発見・修正した不具合

| 対象 | before / 原因 | 修正と after |
| --- | --- | --- |
| P3e-B / P1-E | owner の受理POST応答を保留して正常signout→editor signinすると、新actorの複数選択が旧React transition終了までdisabled | `BatchSelectionProvider` のbusy/activeをactor epoch/token所有に限定。旧success/catch/finallyのreceipt・selection・invalidate・busy解除をguard。16:48台の同操作で保留中でもeditor選択可、1件選択後に旧successを返しても1件維持・旧receipt/dialog/alert/route変更なし。`model.test.ts` のactor A/B/ABA/unmount/新request所有2対が成功 |
| P3e-G / P2a-E | fresh mountで過去のfailed親を実行中監視へ登録し、初回の終端行を新しい終了として通知 | `activeBatchWatches` はqueued/runningがある親だけを発見対象へ入れる。明示receiptのIDは終了済みでも別途watch。最大50親を維持。`activity.test.ts` 3対、17:00/17:05のfresh mountで旧failedが残っていても通知0。通常受理直後に終わった親の通知は表示 |
| P3e-G / P2a-E | import成功とbatch終了が共存すると `toast || batch.toast` がbatchを隠す。閉じるhandlerも両stateを消す | kind別2通知と独立dismiss、pure2対。16:52の新import＋人工running/queued親はactive2→1→0、終了後importのみ表示をbeforeとして観測。beforeのcloseはidle復帰により未実測であり、source上の両clearと分ける |
| P3e-B/G/H | 2通知を固定位置へ縦積みした途中候補では、既存fixed receiptが上に重なり通知ボタンへのhitがP/ASIDEとなる | 新通知containerをticker直下の通常flowへ配置。receiptの右上移動案は採用していない。17:06:33.933、2通知とreceipt共存で通知hit=true。390×844で通知/receiptの6リンク・ボタンすべてhit=true、横overflowなし |

再開後の局所修正は `components/batch/{BatchSelectionProvider,model,model.test,useBatchActivity,activity.test}` と `components/hollow/{ImportJobs,ImportJobs.test,import.css}`。port/schema/backendの追加変更はない。既存のP3e-B/G/H、P1-E、P2a-E内としてManager承認を得た。

### 実ブラウザと永続実行

ブラウザは明示HTTP Chrome140 User-Agent、timeout20秒/idle120秒、自己 `p3c-fresh-batch-*` sessionのみ。認証helperは既知pathの `fill owner|editor` だけを呼び、本文・資格情報・cookie・secret hashは取得していない。

| 実日時 | 操作・期待 | 結果と限定 |
| --- | --- | --- |
| 16:36〜16:40 | 全体選択GETを保留しquery A→B→A後に旧success返却。別対でzone Asia/Tokyo→UTC→Asia/Tokyo後に旧failure返却 | 現集合0を維持、旧alertなし、新操作enabled。通信だけを保留/拒否する自己fetch hookは復元・除去 |
| 16:40台 | 2件選択後paletteに未適用draftを入力してEscape | 固定2件維持。適用されないdraftをfilter変化と扱わない |
| 16:40台 | tags省略URL→自動補完、完成URLhardopen、palette SPAを限定比較 | 省略時の初回networkidleはskeleton、4秒後は通常一覧2件。恒常loadingは再現せず。過去R1原因解消・恒久修正とは主張しない。未知キーnormalSortを含めた初回試行はURL検証拒否で、正規URLへ訂正 |
| 16:40台 / 17:12〜17:13 | editorを自己新WSのviewerにして全体選択 | 最終bundleでも2/500、閲覧のみ・download未提供、mutation入口0。前半の通常client preview RPCはアクセス拒否。viewer accept RPCを本体へ別送信してはいない。preview/accept共用validateOperationのedit認可と現認可のNode対をコード/自動根拠にする |
| 16:46:47.025→16:47:32起動後 | runtime停止中に自己2noteへexpired-running1＋queued1を人工保存、outbox kickなしでboot | expiredはBATCH_INTERRUPTED failed/attempt1、queuedはsucceeded/attempt1。旧runningの自動再適用なし。DB準備は通常受理UIの証明ではなく、実production boot/recoveryの証明 |
| 16:48台 | actor修正前と同じ通常accept→応答保留→owner signout/editor signin→選択→旧success返却 | 新actorの選択とrouteを維持。現在actorの同時別mutation、actor切替中の旧catchは本体別試行なし。所有pure対と共通guardを根拠とし、filter旧failure実対と区別 |
| 17:05〜17:08 | 正常import59Bと通常UIbatch5子、2通知・receipt共存 | 通常受理5/成功5。390幅の両通知・receipt全導線hit。batch結果linkへfocusを置きTab→Spaceでbatchだけ閉じimport保持。次の通常batch5成功後importをclickで閉じbatch保持。receipt close成功、結果link click→対象5結果。初回focus位置だけscriptで設定しTab/Spaceは実keyboard |
| 17:09:19.616〜17:10台 | 自己2note人工running60秒＋queuedを作り、通常UIで待機取消を確認・確定 | queuedだけcancelled/failure NULL、runningは残存。lease後runningはBATCH_INTERRUPTED failed。破壊や本文変更をcancelの代用にしていない |
| 17:10〜17:11 | 自己parentのfailed1/succeeded1を再訪、失敗した子だけ同じ固定タグIDで再preview/retry | ordinal0 attempt1 failed→attempt2 succeeded、ordinal1 attempt1 succeededのまま。親は2成功/0失敗、初回名と固定tagIDを表示 |
| 17:11〜17:13 | ownerの新終端通知表示から正常signout→editor signin | 通知0、receiptなし、新actorの複数選択enabled。自己WS viewer確認後自己browserをclose |

16:52/17:01/17:05台の3回の新HTML原本は各59B、合計177B。通常client beginUpload→実POST HTTP200→seal→worker成功を使った。ファイル選択dialogの操作ではない。外部API/AI/参照取り込みは使っていない。

### 項目別自己判定

以下は自己合格でありManagerの受け入れ・独立合格ではない。

| ID | 判定 | 実装・根拠 |
| --- | --- | --- |
| P3e-A | 自己合格 | selection executor、同snapshot/current認可/exact/501 sentinel。Node selection3対/native共用対、pure固定集合/500/union501、実query/zone ABA |
| P3e-B | 自己合格 | board/root所有、actor epoch、三表示/条件identity、pending/旧応答。最新actor/viewer/390/keyboard実対、selection/admission純粋回帰。三表示/月day保持は下記前回UIを借用 |
| P3e-C | 自己合格 | 50件preview/最大500固定accept、対象外非漏洩/集合変更/同内容dedup。Node25対内と実5件受理。39MB通常serverFnの前回HTTP/DB根拠は限定借用 |
| P3e-D | 自己合格 | tag/trash共用Tx core、binding/51rollback/外部delete/処理fingerprint。全Nodeの既存単一操作と新batch対、通常tag/同名反復。新破壊試験で既存87を使用せず |
| P3e-E | 自己合格 | 有限holding receipt/固定expected/同Tx結果/現在quota。A成功/失敗・外部ABA・別parent・0B・欠落・期限・GiB上限のNode対、移動UIは前回自己4対象を借用 |
| P3e-F | 自己合格 | durable UoW/outbox、単一running/lease60秒/周期2秒/最大20子、ack loss/token/currentactor。最終Nodeと本体正常drain、kickなしboot人工running/queued回復 |
| P3e-G | 自己合格 | 本人だけの有限親子/summary/watch、waiting取消/failed新attempt/90日期限。最終同bundle取消・retry・再訪・通知共存・独立dismiss、Node寿命/認可/外部取消 |
| P3e-H | 自己合格 | 内向きport、旧migration不変、新0022。最終checks/734/332/build、candidate commit/source/bundle、旧列/objects/課算の新コピー比較、全停止 |

既オープン先行18枝は、無変更条件の総再証明ではなく、実変更の影響範囲を確認した。

| 先行ID | 影響根拠と自己判定 |
| --- | --- |
| P1-E、P2a-E | 合格：actor pending/通知2種/flow/390/keyboard/同bundle、既存importの実59Bとticker2→1→0 |
| P2d-1-A、P2d-2-A/C | 合格：共用trash core/外部batch取消の変更。最終Node内の既存trash/purgeとbatch自己trash/外部trash/current-processing対。既存資料の通常UIは借用、既存データ破壊を反復しない |
| P2d-3-D/E | 合格：ImportJobsへの併記のみ。親summary二重計数を変えず、最終Nodeのempty-trash対と通知/履歴共存。旧物理回収・retry方式の変更なし |
| P3b-1-C | 合格：edit-loss同Tx取消。Node owner→editor維持、editor→viewer取消/rejoin非復活。既存memberの実role変更なし、新WSだけviewer設定 |
| P3c-A/B/E/G | 合格：selection native枠/現認可/条件/三表示親ownership。Node executorとselection3対、最終規定checks、query/zone ABA、viewer。月day/追加表示保持は前回UIを借用 |
| P3d-1-A/B/E | 合格：tag core共用/親選択の競合抑止。Nodeタグ上限/rollback/identity/本文独立、実新タグ/同名5件、viewer mutation非表示 |
| P3d-2-B/C/D | 合格：move Tx core/有限bundle post-state/holding導出。最終Nodeの既存moveと新25batch対、旧列/objects/charge保持。移動実UIは前回自己対象のみを借用 |

### 借用・未検証の境界

- 前回 `2026-09-11T16:39〜16:51+09:00` の明示結果照会（初回ACK喪失、同bodyだけ手動再送）、同設定retry、待機取消、自己4notesの通常move/trash、390/Space、calendar表示3→day展開後も固定3→月全体4はManager記録から借用した。現sourceでは該当実装を読み合わせ、影響するactor/通知を修正し、現同bundleの正常/取消/retry/再訪は上記で再実行した。借用UIを今回の同時刻独立実行とは扱わない。
- 前回通常serverFnの39,335,373B受理はHTTP200/DB500/重複同parentまでで、試験decoderはTypeError。今回は最終Nodeで installed codec39,328,873B/隔離HTTP対を再成功させたが、同じ巨大POSTを本体へ再送していない。現payload/schema/backendは前回から無変更。
- 5GiB原本/15GiB使用量のquota境界は論理metadataの隔離対である。実20GiB fileの転送、heap peak保証、SLO保証はしていない。
- R1 loadingの原因解消は主張しない。外部LLM・実メール・Drive・公開/downloadは本フェーズ対象外/後続であり、今回実接続成功とは扱わない。

### 最終保全と自己対象

新証跡rootは `/Users/hikaru/.local/share/hollow/verification/p3e-finish-20260919-udnRoV`（0700）。`start/` は16:35:52、`final/` は17:14:52.097の排他backup/objects/manifest、DB0600。既存保全と新再開監査rootは不変。比較driverは新 `compare/` コピーだけを使用した。

`comparison.json`（17:14:54.683）では前回baseline54表の旧全列/旧行を比較し、業務表の欠落・変更0。FTS内部 `note_search_data`7行/`note_search_idx`1行と `sqlite_sequence`1行は内部更新として区別した。既存87notes/98revisions/87heads・projections/23tags/140relations/2assets/5originals/account/WS/member等は全保持。`resume-comparison.json`（17:15:29.845）は再開開始58表との同様比較で、業務表差0、FTS内部14/6行・sequence1行のみ。前回自己6notesも変更していない。

- 既存8objects/2,817Bは相対path・各bytes・SHA全一致で保持。最終11objects/2,994B、差分は自己新3原本177Bだけ。57B writer lockはpayload/chargeから除外。
- 旧9scopeの正規capacity queryは `2143→2320`（owner personal、新177B）、残8scope `0/0/516/0/0/0/75/83` は全一致。旧物理量の変更や無断quota補正はない。
- 最終 integrity `ok`、FK0、notes100全active、tags29、originals8、assets2、unfinished batch0。
- 今回の自己新対象はfixture4notes（personal2/newWS2）＋正常import3notes。新WSのeditorはviewer、新membership2。自己新tag4。fixture4は通常新規作成UIではなくapplication UoWの検証準備として記録した。
- 自己2noteの人工親は `5301b23f-c6a7-4eb5-92e7-5710cad7ff5b`（boot）、`dcbf42b6-60e2-483f-9da9-48ba84fdde81`（hold/retry）、`ba2845df-090c-4967-ba55-01108f93ccc6`（waiting cancel）。通常受理の親とは区別する。
- 今回の物理削除、trash、restore、旧対象cleanupは0。新対象はすべてactiveで保持した。前回4trash対象も再開時activeだったためrestore/cleanupしていない。過去のrestore主体は未解明のまま。

### 正常停止と引渡し

自己productionは既知PIDのcwd/fresh DBだけを照合して通常TERMした。各回draining→exit0/SystemError0、PID不在を確認。distは停止後だけbuildした。

| PID | 起動 | 正常drain / close |
| --- | --- | --- |
| 26372 | 16:36:16 | 16:46:11.469 / .487 |
| 33194 | 16:47:32.385 | 16:59:04.908 / .915 |
| 47542 | 17:00:29.631 | 17:04:31.920 / .926 |
| 50635 | 17:05:12.056 | 17:13:51.361 / .367 |

3000/3001 listenerとfresh DB open handleは最終停止後0。自己browser `resume-owner`、`resume-viewer`、`fixed-owner` はclose、fetch hook/一時client module変数も除去した。helper/test/buildは完了しており操作主体を残していない。以前の11316/24029不在は再開照合を引継いだだけで、終了理由を今回証明したとは扱わない。

再開先は同fresh `/Users/hikaru/.local/share/hollow/verification/p3c-20260911-dyHGjx`、Node22.22.3、127.0.0.1:3000、DB `app.db` / `objects` / `mailbox` / 同 `private/invitation.key` path。`server.mjs` は限定起動と安全な状態要約だけを出す。0022を再適用せず、lockを手削除しない。次の所有者がport/DB handleとcandidateを照合して起動する。

2026-09-19T17:19+09:00 の最終確認後、製品・DB・browser・runtime・test・build・報告編集の全操作を停止してManagerへ返却する。独立Verifierの受け入れ前であり、goal APIと全体台帳は変更しない。
