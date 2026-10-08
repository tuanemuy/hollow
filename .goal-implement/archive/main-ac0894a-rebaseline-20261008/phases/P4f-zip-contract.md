# 一括 ZIP 書き出しの接続準備

2026-09-20。限定 read-only 調査。ファイル名は後続候補を表し、正式 P4f の開始・実装・受入を意味しない。既存採用契約を根拠として、追加 port/schema・資源値・未指定 UX はすべて未採用案とする。製品・環境・依存・DB・test/build・実 ZIP 生成は操作していない。

## 結論

最小の縦接続候補は、本人の固定選択から HTML/Markdown の子ファイルを生成し、親専有の一回の組立で ZIP を保存、現在認可・全含有内容一致を確認して 7 日以内に繰り返し配信する経路である。PDF は同じ子成果物契約へ接続するが、正式 P4d の durable compute/artifact が成立する前に提供済みとしない。匿名 ZIP は EX-04 の対象外。

現 `prepareExport` を 500 回呼ぶ構成にはしない。これは session/browser に束縛した HTML/MD の 120 秒・一回配信 operation であり、7 日の親・子成果物・再試行の寿命を持たない。既存 batch の固定選択と idempotency/lease の考え方は使えるが、編集権限と元 scope 一致を要求する worker は ZIP の現在閲覧権限とは異なる。

## 根拠と現接続点

| 根拠・source | 確認した現在の意味 | 最小の追加境界 |
| --- | --- | --- |
| `spec/scenario/export.md` EX-01〜04 | 500 件/合計 1GB、空本文除外・件数表示、一部失敗は成功 ZIP と失敗一覧、同名連番、生成中削除は除外、7 日、同時一括 1 件・キューなし、匿名は単件のみ | ZIP 専用 parent/child/artifact。1GB の byte 定義は原文未指定 |
| `spec/scenario/jobs.md` JB-01〜03 | 本人限定履歴、親と子、同じ対象/設定、失敗子 retry で親再開、組立中は retry 全拒否、取消時 ZIP 中間物破棄 | 組立状態と実 close を親子状態とは別に管理。artifact の ready と job の部分失敗を分離 |
| `spec/scenario/organize.md` OR-09、brief 固定選択 | viewer も選択/ダウンロード可。500 以下の固定 ID、条件変更で解除、結果全体と表示済みを区別 | ダウンロードは `canEdit` の外。選択 DTO を認可証として使用しない |
| design P4-Q2、寿命、単件PDFの製品接続 | snapshot/実体/要求/認可分離、同内容 move 再利用、旧 ZIP の一部失効で全体拒否、publishedAt 起点、本人 createdAt+90 日 | 既決を変更しない。旧 PDF 予備報告の terminal+90 日や 15 分 ticket は使わない |
| `application/export/{document,snapshot,source,stream,usecases}.ts` | `ExportFormat` は HTML/MD。current note/媒体参照、文書 plan、data URI の逐次供給、生成後/配信直前の再認可と identity 比較 | accountId の durable 内部 snapshot 読取と current-public 独立根拠を追加。sessionHash が同一であることを 7 日要求の生存条件にしない |
| `adapters/libsql/{exportSchema,repositories/exportRepository}.ts` | `export_operations` は preparing/ready/sending/cleanup、送信 claim 一回、2 operation、全予約合計、削除確認まで予約保持 | ZIP を enum 追加だけで入れず、durable 正本と短期 delivery を分ける |
| `application/batch/{ports,usecases,worker}.ts` | operation/expected/result は tag/trash/move。worker は現在 edit + 元 source edit + `sameMoveScope`。retry は generation/digest と latest failed 子を照合 | export 専用 current-read worker。元 scope は選択の説明、認可の恒久根拠や移動拒否条件ではない |
| `adapters/libsql/repositories/batchRepository.ts` | 子 lease/最新 attempt/親 generation、履歴は親 createdAt と新子/active を併用、旧子 title は createdAt から prune | 新 export は採用済み固定 createdAt+90 日へ。既存 job の方式を変更しない |
| `application/ports/objectStorage.ts`、Node storage、object operation repository | bounded write/hash、登録→公開 fence、owner 終了、active writer 排他、削除 receipt がある。現 owner kind は ZIP を含まない | ZIP child/assembly/artifact/delivery/hold の実所有を追加し、begin/register/publish/late 結果/回収へ接続 |

`P4-export-feasibility.md` 全文と履歴起点追補を確認した。そこで未接続とされた公開 HTML/MD は現在 P4c source に入口がある。一方、今回確認した製品 `application/export` には durable PDF/ZIP の repository/port はまだない。現在の P4d-1 合成 channel 作業を製品接続の完成根拠にはしない。

## 受付から取得までの案

| 境界 | 対象・現在確認・永続化 |
| --- | --- |
| 選択/preview | 元 list の scope/適用条件/時区と固定 ID を説明し、500 超は分割。件数上限を空本文除外後の数で回避しない。本人の現在 read、active note/WS、本文の有無を確認し、空本文・閲覧不可を件数で分離する。閲覧不可の現在 title を取らない。検索結果を worker で再実行して新一致を追加しない |
| accept | verified 本人、command UUID+固定 IDs/順序/format/options digest、現在対象、本人 active ZIP 不在、有限技術容量を同 Tx で検査。初期 child snapshot identity を固定し、本文/manifest は短命の生成記録へ置く。応答喪失は同 command の本人照会で確認し、新 ID の自動再送なし |
| 子 claim/生成 | accountId の生存と取消 fence、現在 note/WS/read/内容 identity を確認。HTML/MD は既存 plan と検証付き媒体 stream を使用。媒体原本・draft/history へ fallback しない。PDF は note 単位共用 compute の demand として join し、別並列生成をしない |
| 子 finish | 全 bytes/hash/実 close の後に current read/content と親/attempt/lease generation を同 Tx 再確認して成功ファイル参照を確定。内容変更は旧入力を配らず対象別 changed。削除/権限失効は対象別 excluded/cancelled、正当な兄弟を続ける |
| assembly claim | 子生成が終端、親取消なし、親 generation 一致、assembler が未所有であることを CAS。成功候補ごとに現在 read/content と実体を再確認、entry 名/順序と失敗一覧を seal。一つの組立 generation のみを許す |
| 組立/公開 | seal 済みファイルを逐次読み、bytes/hash と合計、ZIP 出力を検査。全 source/出力 close 後、含有全対象の現在 read/content、親 generation、取消、owner を同 Tx 照合し artifact を available にする。この publishedAt+7 日を固定する |
| poll/history | 本人 job だけを返す。元 metadata/順序と安全な定型理由を使用し、権限失効対象の現在 title を補完しない。job の failed/partial と ZIP が取得可能かを別項目にする |
| download | 現在本人 session、artifact 未期限切れ、全含有 note の現在 read と snapshot 一致を確認。独立 current-public の読取も評価する。一件でも失効/変更なら旧 ZIP 全体を返さず、明示した新現在集合の新 request へ案内 |

組立前の対象別変化は再分類できる。既に entry を出力した後の変化はその entry を取り除けないため、未公開 ZIP を破棄する。EX-02 の「生成中削除は除外して続行」と整合させる第一候補は、その対象を当該 request 内で単調に除外し、残る成功実体と更新した manifest で未公開 assembly をやり直すこと。除外済みを復活させず、新版へ差し替えず、対象集合を増やさないため、対象変化によるやり直しは最大 500 回の対象減少に限られる。実工程の有限時間/資源を越える場合は運用上の親失敗とする。単に組立末尾で削除を見つけたことだけで兄弟継続を常にやめる案は EX と緊張するため推奨しない。既に完成・公開した ZIP の不一致はこの内部再組立に入れず、必ず明示新 request とする。

内容不一致を伝える前に閲覧可否を確認する。全対象を単一の短い Tx で最終照合できるよう、500 件の metadata/identity を有界に扱う。全本文や媒体 500 件分を JS 配列に materialize しない。物理ファイル読み取りや archive 圧縮を DB Tx 内で待たない。

## move・権限・取消の区別

| 変化 | 案と根拠 |
| --- | --- |
| 内容不変 move、現在 owner/member/viewer として読める | 入力 identity を変えず reuse。元 workspace への現在 membership、元 source 一致、note.version/updatedAt 一致は要求しない。Q2 と `readExportSnapshot` の現 owner 読取に合わせる |
| move 後に現在読めない | 子の現在チェックで失効。完成 ZIP は全体拒否。元 selection/古い membership は許可にしない |
| 元 WS 削除だが note は既に外へ移動 | source 固定の一括 cancel で巻き込まない。current note と実 demand/依存を評価。P3f と Q2 の現在所有優先を維持 |
| 除名/脱退/降格など旧未終端要求への明示失効 | JB-03 と最新 PDF 方針に従い関連子 demand を同 Tx 取消又は永続 fence。再参加で旧 attempt を復活させない。影響を受けない兄弟まで元 scope 一致だけで取消さない |
| 完成後 membership 喪失、note は現在 public | 新しい本人取得は current-public の独立根拠を評価できる。旧未終端要求の取消を解除することとは別。過去 membership の blacklist は作らない |
| 通常 logout/session 満了/画面離脱 | accepted 本人 job は継続。poll/取得には再度現在本人 session。actor 変更後、旧 success/catch/finally/通知/選択解除が新 actor に作用しない |

viewer は初期から許可する。owner/editor 固有の edit 前提、公開 handle/WS slug 設定、Google/Drive は ZIP の前提ではない。本人 ZIP が内部で current-public を使う場合でも、匿名/link の元 authority を public へ付け替える処理を共用しない。

## 1GB と資源会計の未採用比較

| 判断 | 第一候補 | 比較・未決 |
| --- | --- | --- |
| 単位 | 1GB = 1,000,000,000 bytes、等号は許可、超過で拒否 | 原文は binary/decimal 未指定。1GiB=1,073,741,824 を使うなら表示も含む別採用判断が必要 |
| 計測対象 | ZIP に含める生成済みノート entry の圧縮前 bytes と失敗 manifest UTF-8 bytes の合計 | 原本 input bytes は HTML base64/MD/PDF のサイズと一致しない。最終 ZIP bytes のみでは圧縮率で同じ選択の可否が変わる。EX の「合計」を格納ファイル全体と読む最小案 |
| 失敗一覧/ZIP header | 最大 500 行の manifest も payload として 1GB 内へ算入。ZIP header は別の有限技術予約・実測 | 以前の予備案のようにノート entry だけに 1GB を適用する読みも可能。manifest 算入案では境界上の集合が失敗一覧を加えて超過しうるが、一覧だけ省略して成功にはしない。原文に含む/除くの明示がなく Manager 判断が必要 |
| 生成前 | 固定 500、既知生成サイズ/厳密下限、技術容量で判定。HTML/MD plan の exact 有限 bytes と cache PDF 実 bytes は使える | 未生成 PDF は exact bytes 不明。上限見積りが 1GB を超えるだけで必ず超過するとは言えない。容量不足と業務合計超過を同じ理由にしない |
| 生成中 | 専用 child を逐次 spool し、確定成功合計+現在 child 実 bytes+確定 manifest bytes が上限を超える直前に停止。manifest 最終確定時も再計数。全体 oversize として分割案内、ZIP は非公開・中間物 cleanup | 一般の子生成失敗なら成功兄弟で ZIP を作れるが、合計超過した大きい子だけを「失敗」として落とすと全体制限を回避する。残り未処理があっても oversize は親結果で明示する |
| 共用 PDF が大きい | この ZIP demand を外し親 oversize。別単件利用者がいれば共用 compute を止めない | ZIP の残り byte 上限を単件 PDF の renderer 上限に渡して他要求を失敗させない |
| 組立後 | 出力 ZIP の実 bytes/hash を別に確認し、技術予約を超えれば未公開の全体失敗 | 圧縮後+header が 1GB をわずかに超えることを直ちに EX 違反とはしない。最終 archive 自体も 1GB とする二重上限は未採用 |

第一候補の式は `sum(includedNoteEntry.bytes) + utf8Bytes(failureManifest) <= 1_000_000_000` である。失敗 child の未完成 bytes は ZIP payload には数えず、物理容量には削除まで数える。manifest 算入の有無も採用前である。既存個人 5GiB/WS 容量や単件 PDF の任意上限から値を借りない。合計の early stop は当該 generation の既に固定された候補について行う。内容変化後の小さい新版へ黙って差し替えて制限内に収めない。

サービス容量は別会計で、子 spool、共用 PDF/pack、組立中 ZIP、公開 ZIP 7 日、配信中 hold、回収負債、native temp を含む。共有実体は物理 key 一つにつき一度だけ数え、参照数を容量として重複課金しない。既存 HTML/MD 2 slot/2GiB を保護する。具体全体 disk/並行数/期限は配備条件から決める未採用値で、EX の業務制限ではない。

本人「同時一括 1 件」は accountId ごと、個人/WS/format を跨いで accept〜生成〜組立〜stopping の実 close まで一件、同 command 照会は新件数にしない案。global 技術 slot は別で、空きがなければ受付前に一時混雑を返し個人の二件目を待機登録しない。親内で子が順番待ちすることと、本人の別 ZIP をキューへ積むことを区別する。close 後の純粋な削除負債は disk を占めるが本人 active job を永久占有しない。

## retry・部分失敗・寿命

失敗子 retry は元 format/options と固定 note IDs の中の最新 failed attempt のみ。現在 account/read/content、重複 retry、親 generation、本人 active slot、artifact/hold を照合する。成功子を再実行せず、その実体と identity を保持する。取消済み子や新一致 note を failed に偽装して追加しない。内容が変わった failed 子には現在内容の明示確認を要求し、同じ設定という理由で旧版を出力しない。

assembly/closing 中は一件も子 retry を受け付けない。終端後の failed 子再試行は親を reopen し、新 generation の ZIP を作る。既存成功 artifact が残り現在内容一致ならその bytes を再利用する。成功子が変更/失効済みなら、成功扱いのまま新しい bytes に置換せず新現在集合の新 request を案内する。

子成功実体をどこまで retry 用に保持するかは未指定である。第一候補は公開 ZIP がある間、その entry を検証付きで再利用できる有限手段を持つか、child spool を ZIP 期限まで hold する。最小実装は後者だが disk 二重保持が生じる。親が組立失敗して ZIP がないときの child spool 保持期間は別途判断が必要で、90 日全 child 実体保持を勝手に採用しない。実体消失/期限切れの成功子を自動再生成して「失敗子だけ retry」と表示する案は避け、明示新要求へ案内する。

純粋な assembler 失敗で failed 子がない場合、JB-02 基本フローの同対象/設定による新親 job を第一候補とする。既存成功ファイルを current 再確認して reuse できる。これを同親 reopen として提供する必要があるかは未決であり、失敗子を捏造しない。

取消は新 claim/公開を fence し、待機子を取消、実行子は有限終端を待って結果を残し、当該 ZIP 中間物を破棄する。EX/JB のこの文言から、実行子を常に即時 kill するとは決めない。中断が必要な I/O は abort して close を待つが、共用 PDF では当該 demand だけを外し、正当な他要求が残れば止めない。取消済みは理由なしの独立状態、除外件数や manifest の「選択 N 番は含まれない」と状態を混同しない。

| 記録 | 起点・取得条件 | 回収と retry |
| --- | --- | --- |
| ZIP artifact generation | 完成 bytes 保存+同 Tx available の publishedAt+7 日。now>=expiresAt は取得不可 | 再取得で延長しない。再組立の新 artifact は別 generation/別 publishedAt。完成/期限切れ ZIP の再作成は明示新 request |
| 共用 PDF artifact | 元 publishedAt+24 時間 | 期限前取得した assembly hold は必要な内部保持のみ。期限切れ単件取得を復活させない。完成 ZIP の埋込 PDF は ZIP 自身の 7 日と現在内容/認可条件で扱い、元 PDF 期限を ZIP の早期失効にしない |
| 本人 job/child 履歴 | 親 accept createdAt+90 日固定。retry 親 createdAt 維持、新 child attempt の createdAt は新規 | 旧 title/詳細の表示期限を延長しない。新子/active/artifact/cleanup の最小 shell を別保持。本文/manifest を 90 日履歴へ複製しない |
| delivery/assembly hold | server 所有の lease/世代と実 reader close | clock expiry だけで使用中 file を消さない。lease 回復と actual-close 所有証拠を揃え、消去完了まで disk 負債を残す |

PDF の保持を新規 ZIP が無制限に延ばすことはしない。hold は特定 assembly/子 demand に束縛し、終了・取消・中断回復で解放する。期限切れ後に新 hold を取得して古い単件 PDF を再利用するかは一般公開 cache 規則を広げるため、第一候補では禁止し、期限前の既存 hold だけを完了させる。

## 最小 port/schema 案

具体名は仮称。既存 inward port/adapter/UoW の方向を維持し、共用 PDF の今後の正本と重複 table を作らない。

| 責務 | 最小データ・操作 |
| --- | --- |
| `ZipRequestRepository` | actorId/requestId unique、固定順序 IDs・format/options digest、source は説明情報、createdAt/historyExpiresAt、generation、cancel fence、active/assembling/stopping/terminal。`acceptOrFind`、本人 slot 原子的取得、generation CAS、history projection |
| `ZipTargetAttemptRepository` | parent/ordinal/noteId、latestAttempt、retryOf/attemptNumber、createdAt、snapshotIdentity、profile、結果/定型 failure、lease token/until、artifact 参照。latest failed のみ retry、元設定不変、成功子保持 |
| `ZipAssemblyRepository` | parent+generation unique、seal 対象 digest、assembler lease/owner、ordered entry names、実 bytes/hash、取消/公開 fence。`claim` と retry 受付を同 Tx 排他 |
| 共用 `ExportArtifactRepository`/hold | format/inputIdentity/profile/key/bytes/hash、publishedAt/expiresAt、availability、含有 note と identity の対応、hold owner/世代、削除状態。PDF compute は別責務のまま |
| `CurrentExportSnapshotReader` | initial session 認証後、worker は actorId と要求失効世代で現在 read/content。完成取得は本人 session+current scope 又は current-public。read不可とchangedの開示順を保証 |
| `ZipWriter`/entry opener | ordered safe flat name + expected bytes/hash + owned lazy opener。`write(..., signal)` は出力 bytes/hash と全 resources closed 後に resolve。Node 固有 stream/archiver は adapter 内 |
| 配信/容量/物理所有 | durable artifact と短期 delivery claim を分離。複数回取得、有限同時 read、byte 予約、writer register/publish/late 結果 fence、confirmed delete、cleanup retry。現 `WriteOwner`/`PurgeObjectOwner`/ownerActive と FK 回収へ新責務を明示接続 |

必要な schema 不変条件は、本人 active 親一件、親世代 assembler 一件、対象最新 attempt 一件、immutable 固定集合/options、succeeded に実 artifact 参照、published に実 bytes/hash/日時、lease の対、有限整数、artifact key 一意、hold 存在中の回収不可である。履歴が消えても物理負債/active owner を cascade で失わない。note 削除が ZIP の履歴 row 全体を消す FK にしない。含有全対象の現在照合と purge 失効を参照 table から行えるようにする。

## ZIP writer・ファイル名・実 close

`pnpm-lock.yaml` に `archiver@5.3.2` と `jszip@3.10.1` があり、前者は ExcelJS、後者は ExcelJS/Mammoth の推移依存である。core/web の direct ZIP dependency や製品 adapter の採用根拠ではない。

第一候補は小さい Node `ZipWriter` の内側で Archiver の stream append を使用し、direct dependency と型/版を正式に固定すること。現公式 API は `append(stream,{name})`、`finalize()`、`pointer()` を提供するが、`abort()` は best effort で残り source を drain しない。finalize と保存先 close は別に待つ。[公式 API](https://www.archiverjs.com/docs/archiver/) と [公式 quickstart](https://www.archiverjs.com/docs/quickstart/)。既存 lock の [5.3.2 source](https://raw.githubusercontent.com/archiverjs/node-archiver/5.3.2/lib/core.js) にも source 非 drain と順次 queue がある。公式 master の [package metadata](https://raw.githubusercontent.com/archiverjs/node-archiver/master/package.json) は調査時 8.0.0/ESM/Node>=18 であり、lock の CommonJS 5.3.2 と同一 API packaging とみなさない。master を採用版や最新公開安定版と断定しない。

各 entry は一つずつ遅延 open、期待 byte/hash を照合し、前の source の close 後に次を開く。`file/directory/glob/symlink` API と利用者 path は使わない。warning でファイルが欠けても成功にする例示コードは流用しない。途中 entry の失敗は壊れた archive を publish せず、親組立失敗にする。

Node pipeline の signal は破棄へ伝播できる一方、`finished` の signal は待機を中断するだけの場合があり、highWaterMark は RAM 上限ではない。独自 source opener の `close()` 完了を所有側が待つ必要がある。[Node 22 stream docs](https://nodejs.org/docs/latest-v22.x/api/stream.html)。source/writer/output の abort→close→owner release→cleanup の順を守り、timeout Promise が先に reject しただけで slot/disk を解放しない。read chunk/HWM は有限の設定値で、native/zlib を含む実 RAM/CPU 成立は今回未検証。

既存 `exportDocument/filename.ts` は NFC、control/format/path/予約文字、末尾 dot/space、Windows 予約名、空題の noteId fallback、stem UTF-8 180 byte を処理する。ZIP では format 拡張子と ` (2)` 等の suffix を確保して切詰め、固定 ordinal 順で既存名と全予約 manifest 名の両方に衝突しないまで採番する。`a (2)` が元からある場合も衝突表で確認する。最小の重複 key 候補は、表示 filename は NFC のまま、比較だけ既存 `browse/tagNormalizer.ts` と同じ固定 Unicode 版の幅 mapping→NFD→full case fold→NFD とすること。タグ業務 port を ZIP に直接依存させず、同じ純粋 Unicode mapping primitive を共有する。`A/a`、合成/分解文字、全半角、manifest 名も同じ key で比較し、異なる展開先の全ての同値規則を保証するとは言わない。flat name 限定、`/`・`\`・drive/UNC・`.`/`..`・NUL/CRLF を通さず、symlink entry を作らない。

失敗一覧は UTF-8 plain text 又は JSON、最大選択件数の定型 code/説明と元 ordinal のみを第一候補とする。閲覧不能になった note の現在 title/body/URL/token、storage key/内部 path/例外全文は含めない。元 title を入れる必要性は低く、Q2 が許す最小元 metadata より増やさない。全件空本文/除外で成功 entry がゼロの場合、空 ZIP を成功扱いせず「取得可能なファイルなし」と件数を示す候補であり、親最終状態の表示は未決。

完成ファイルの MIME は `application/zip`、attachment の ASCII fallback+RFC 5987 filename*、実 bytes の Content-Length、private/no-store/nosniff を使用する案。既存 HTML/MD HTTP の安全 header 構造を再利用するが、一回の ready→sending を durable artifact 本体に適用しない。各取得の新 delivery 所有で backpressure と切断を close へ繋ぐ。range/resume は現単件同様まず未提供を候補とし、7 日の再取得を拒否する理由にはしない。取得済 bytes の回収や無限の配信途中再認可を保証しない。

## 判断点と未成立

1. 1GB の decimal/圧縮前ノート entry 合計と manifest 算入。最終 ZIP 自体の二重 1GB 制限は追加しない案。
2. 成功 child spool の retry 用保持期間、ZIP entry 再読取との比較、全件除外の親状態、純粋 assembler 失敗の新親/同親表示。成功子を自動再生成して retry の意味を変えない。
3. global 並行数、disk 配分、各工程の有限期限と queue 表示。個人一件・キューなしと global 技術容量を分け、7 日実体を容量確保のため早期削除しない。
4. Archiver direct 版/型/ESM 接続、stream bridge の実 close、最大対象/境界 byte・中断・回復・同時公開判定は未実行。今回の公式 API 読取を実 ZIP の成立実証と呼ばない。

影響範囲は EX-01 の形式生成再利用、EX-02/03 の ZIP、EX-04 の PDF compute 共用を壊さない境界、OR-09 の viewer と固定選択、JB-01〜03、P3f の現在所有/物理回収、P4-Q2 と採用 PDF の要求/実体/配信分離に限る。公開 URL/SH-07、Google/Drive、LLM、既存 job 寿命方式の再設計は含めない。新受入 gate・正式 phase・追加の利用者権限制限は作成していない。
