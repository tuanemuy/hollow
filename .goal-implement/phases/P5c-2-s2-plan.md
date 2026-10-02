# P5c-2 S2 — 受信位置・所有回復の差分計画

2026-10-01。基点は S1 V1 候補 `b5198816268e06afdd4220aa09b283245ae881d5`。Manager 採否用の静的提案であり、実装・実行許可ではない。製品・DDL・helper・private root の作成変更、test/build/runtime/HTTP/browser/鍵生成は 0。この文書だけを編集した。管理正本、旧 proof/DB/秘密/results/cache、actualfresh は非操作。

goal-implement の Implementer として委譲目標だけを扱う。spec/spec-implement、独立 phase goal、補助起動は使用しない。read-only rg/sed/cat と公開仕様・source・正式報告の読取は Manager の補足許可に従う。

## 対象と借用

対象は採用済み P5c-2-B/C/D/J の未完と、追加指定の A 原本なし拒否 1 対。S3 auto/bulk/ticker、P5c-1 残 UI、P5c-3、退会、最大 200 MiB の性能測定は対象外。永久削除を含む保存先異常は確認→再選択/新規作成という最新利用者決定を維持する。古い詳細案の自動再作成記述を復活させない。

根拠は `design.md` 冒頭、`plan.md` の P5c-2 固定条件、`phases/P5c-2-plan.md` の転送/所有契約、`phases/P5c-2-s1.md` と `P5c-2-s1-v1.md`、下記現 source。外部 API の意味は既採用の公式資料整理を借用し、今回はネット閲覧・実外部送信を行っていない。

S1 の 219 対、V1 の影響 67 対は再演を既定にしない。Manager 通知による独立 UI5 の通常 backup→reload/link→別 command dedup→history/390px/Tab、停止 audit の jobs2/succeeded2/record1/provider5/upload1(1024 B)/pin・object_writes0 は独立の先行根拠。正式レビューの確定は Manager 管理であり、本静的案が受入を代行しない。原本なし拒否は静的根拠しか特定できていない。

| 固定 ID | 現コード・既根拠 | S2 差分の判定 |
| --- | --- | --- |
| A 限定 | request.ts は original 不在を target/job 作成前に SOURCE_INVALID として拒否 | 追加検証だけを第一案。原本のない自己 note 1 つで backup 5 表・owner・provider/source 呼出しが増えないこと |
| B | actor+command、original/actor/sub target unique、live transfer unique、現在 record 再利用は実装済み。別 command の逐次 UI dedup は独立成功 | 並行別 command と 90 日 prune 後の再利用は追加検証。回復用 retryOf の参照寿命だけ prune に限定変更を提案。表示90日/record存続は不変更 |
| C | 既 application 正常対は既に 1 MiB+17 B の 2 chunk。ACK 不明→status、正当な offset0、provider の Range/404/409 分類もある | 正常 multichunk 自体を新機能とはしない。非整列部分受信を実 source+HTTP+DB に接続する追加検証、保存 session 再開と明示単件 retry は追加実装が必要 |
| D | 全 hash/同 FD/covering-block digest と unknown pin、実 close ACK は成立。前任証明の共通 adapter も存在 | 前任終了後の backup 業務継続は未接続。phase 保持/reclaim/再検証を実装し、自己前任 child の終了と DB 上の pin/slot 回復を直接結ぶ |
| J | 0039、5 表、0038/lock/既 control guard 保持、移行 rollback は S1 根拠 | まず新 DDL なしの案。型・mapper・claim の到達範囲、既 guard 拒否/許可、規定 checks、同 candidate/停止保全を比例確認。旧移行全 clone の再演なし |

## 読解で確認した実装不足

1. `backup/runner.ts:756` の claim と repository の claim/scan は queued/none だけ。`settleBackupClosure` は非 terminal の実終了証明を得ても failed/UNKNOWN に確定し、保存 session に戻る入口がない。
2. `transfer()` は毎回 startResumable に進む。sessionEnvelope は保存するが、復号して queryReceived を先行する再開経路がない。`requestDriveBackup` は既 target・record なし・live なしでも UNKNOWN を返すため、閉鎖済み失敗からの明示再試行は未提供。
3. ACK 不明時の `change(...,"reconciling")` で offset/length を削除し、libSQL mapper も uploading 以外を NULL 化する。実行中はローカル sentEnd があるが、再起動後の送信済み上限に流用できない。欠けた intent を「1 MiB 送ったはず」等で補完してはいけない。
4. 現 transfer update guard は非 terminal closed→別 owner active を許容し、unknown→active と terminal 復活を拒否する。既列で安全な reclaim が可能な余地がある。terminal 行を queued に戻す案は不要かつ不採用。

これらは静的な到達性/保存形の観察で、今回の動的反例ではない。S1 の正常転送や前任実終了証明自体を不合格へ戻す主張ではない。

## 推奨する最小実装

### 保存 intent と受信位置

送信前の uploading(offset,length) を ACK 不明の status 照会中も保持する。statusAttempts だけを同 phase の CAS で増やし、受信位置が確定するまで reconciling へ変えない。reconciling は「未解決の送信 intent がない既知 offset」の状態へ限定する。新 field/phase を足さず、既 offset/length/CHECK/mapper を使う。

再開は同 target/file ID/marker を保持し、現在 identity/資格/folder と原本全長/hashを再確認する。保存済み URI が正規復号できる場合だけ、既 provider の空 PUT query を先行する。独立レビュー B2 の次の行列を採用する。判定元は旧保存行であり、新 queued 行の received=0 や原本全長を欠落 intent の代わりにしない。

| 保存された根拠 | incomplete の採用条件 | 採用できない場合 |
| --- | --- | --- |
| 非 terminal uploading の有効 offset/length | `旧received <= 回答位置 <= offset+length`。末尾到達だけでは完成しない | 同ID完成metadataの確認かUNKNOWN、追加chunk0 |
| intent のない reconciling、旧 failed（terminal化でintentを失った行を含む） | `回答位置 === 旧received` だけ。新意味のreconcilingも同じ保守条件 | 超過/後退は同ID完成metadataの確認かUNKNOWN、追加chunk0 |
| 保存 URI なし・正規復号不能 | status query/位置推測なし。metadataだけ | 自動start0。metadata404だけではsession失効の証拠にしない |

Rangeなしの正当な0は旧確定値0と上の条件が成立する場合だけ位置0として採用する。不正Range/未知bodyを0へ変換しない。incompleteの末尾Rangeだけでは送信も完成も進めず、同IDの完全metadata一致を要求する。complete 200/201 と metadata は file ID/marker/parent/size/非trash/返却checksumを照合し、unknownを成功にしない。旧 reconciling/failed の欠落 intent を書き換えて補わない。

### 閉鎖と restart

`settleBackupClosure` は terminal/cancelled を従来どおり保持する。非 terminal で実 owner 終了証明・現在 identity・未期限切れが成立した場合のみ、元 phase/received/session/intent を維持した owner:closed を保存する。既maintenanceのcoordinate内でDB保存→exact proof ACK、既withCallerのcoordinate/accepting再検査→claimという順序を必須にする。repositoryのclosed許可だけで直接claimせず、DB closed→proof ACKの間は新claim0。commit ACK不明時はexact owner/保存状態を再読し、確定前のproof ACK0。proof ACK失敗は同proofで再処理可能にし、Map消失・期限・shutdown要求・signal送信を終了証明としない。

既 repository の `scan` に recoverable（非 terminal/closed）、`claim` に新規開始と再開の区分を追加することを推奨する。新規 queued/none は親 cancelledAt を拒否、開始済み closed の再開には親の手動取消を失効条件として加えない。外部 cancelGeneration、失権、trash、epoch/sub/原本/所有先変更、期限切れは再開拒否。旧 owner の pin を実 close 後に解放し、新 owner の read pin を新しい Tx claim で取り直してから FD を開く。間の purge が先に成立した場合は新 source open を拒否する。

ownerless queue 補充や fairness、合算 backup1/control2 は変更しない。Node の既 pump に recoverable scan を接続し、新 ticker や別 runtime を作らない。再起動しても statusAttempts/元 deadline をリセットしない。initiating/Location ACK 不明は同 ID metadata 確認のみで、自動 start 再送を許可しない。

### session 失効・409 と明示単件 retry

session失効/409/Location ACK不明は同file metadataを先に確認する。完成一致なら採用、不整合/権限不明なら結果を保持し、自動別ID/外部cleanupを行わない。明確なsession失効の応答を得た場合だけ、現在資格/同sub/同folder/原本/旧owner終了を再確認した明示retryで同ID session再作成を最大1回許す。409/未知/denied/metadata404は失効扱いにしない。再作成のLocation ACK不明はmetadataのみで自動再作成0。statusは既最大3回、期限とUNKNOWNを自動retryで埋めない。

単件の明示 retry は S3 bulk の失敗子補充ではなく、既手動操作の回復入口とする案。既 request POST の入力を initial/retry に判別可能にし、retry は現在 GET が示す prior transfer ID/version と新 command を必須にする。現在 actor/epoch/settings/original/旧 owner closed と対象を Tx で再検査し、terminal 旧 job/transfer を変更せず、新 manual request/job/transfer を同 target に作る。旧 request の期限や cancelledAt をリセットしない。replayed command は同 receipt、payload/locator/版違いは拒否する。

新transferは既insert guardどおりqueued/received0/sessionnullで作成する。新job.retryOfから一意の旧job/transferを特定し、同actor/sub/target/file ID/原本と旧owner実終了を確認する。旧sessionはその行の旧bindingでrevealし、新transferのbindingでprotectする。claim後、現在性と正規status/metadataの証拠を得たCASでsession/receivedを採用する。旧行更新/旧ciphertext無条件コピー/旧receivedの無照会引継ぎ0。旧結果cancelledは失敗retryに偽装せず、新明示操作と区別する。

独立レビューB1のDDLなし契約を採用する。新transferのepoch/settings/credentialVersionは現在connection、identity.folderはimmutable target.folder snapshotとする。target.folderEpochは旧値のまま、target/recordのlocatorは更新しない。application helperがtargetとidentity.folderの厳密一致を確認したうえで、target側keyをtarget.folderEpochのAAD、現在connection側keyを現在epochのAADで正規revealし、ID/driveIdとkeyの意味をmemory内比較する。null/nullだけ一致、null/非null・異値・復号不能は拒否またはUNKNOWNで送信0。domainへI/Oやprotectorを入れず、backupCurrent/admission/resumeでconnection対identityのciphertext比較を使い続けない。await後のTx/CASでactor/epoch/settings/credential/target/原本/取消の版を再確認する。旧transferの再連携取消は維持し、移管・復活しない。

一意旧行を任意の最新行から選ばないため、Manager採用の既TransferRepository `forJob(jobId)` exact lookup（最大2件、0/1/複数を区分、0/複数は拒否）を追加する。現forTargetの最新100件探索で代用しない。現pruneは依存中retryOfもnull化するので、旧jobを参照するretryが非terminalまたはowner/pin/refresh保持中は旧jobの物理pruneを延期する。同Txで受付とpruneを競合処理し、先にpruneされて参照不能なら受付拒否、先にretry受付なら参照保持。本人historyは従来90日で非表示、回復後のterminal/closeで保持解除し通常pruneへ戻す。直接のretryOf一辺だけを参照し、依存連鎖の無制限探索0。連鎖が必要と判明した場合は具体的必要性/有限境界を実装前に返す。新表/列なし、旧job/transfer/targetの内容不変。

UI は不明と実終了待ちを区別し、現在 GET に束縛した「同じファイルで再試行」を明示確認後だけ提供する。自動 POST/GETからの転送再開を作らず、既 1flight/queued reread/foreign/ABA/unmount を維持する。成功/link/history の新デザインや ticker は作らない。

## 変更予定 exact path と共有差

B1/B2とexact lookup/pruneの契約はManager採用済み。以下18 pathは最終実装委譲待ちであり、製品編集許可ではない。基点sourceの最小予約で、追加pathは編集前に返す。

| path | 差 |
| --- | --- |
| `packages/core/src/application/integration/drive/backup/runner.ts` | intent保持、保存session照会、非terminal閉鎖/reclaim/有限完了 |
| `packages/core/src/application/integration/drive/backup/request.ts` | 明示単件retryのTx受付、command/locator/current/dedup |
| `packages/core/src/application/integration/drive/backup/read.ts` | 本人用retry可否と固定locator/version（秘密なし） |
| `packages/core/src/application/integration/drive/backup/recovery.ts`（新） | application内のtarget/current folder各AAD意味比較、旧binding→新bindingの有限回復判断。既protectorを引数で使いdomainへI/Oを入れない |
| `packages/core/src/application/integration/drive/backup/recovery.test.ts`（新） | key意味比較/旧session binding/Range行列のpure・fake port対、秘密出力0 |
| `packages/core/src/domain/integration/driveBackupRepository.ts` | 既claimの新規/再開区分、scan recoverable、forJob exact lookupの0/1/複数区分。新port種類なし |
| `packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts` | claim/scan/forJob最大2件、closed→active CAS/総枠、依存retry中の旧job物理prune延期 |
| `packages/core/src/adapters/libsql/__tests__/driveBackupApplication.integration.test.ts` | A限定、B並行/90日、C/D回復境界 |
| `packages/core/src/adapters/libsql/__tests__/driveBackupFixtures.ts` | 有限provider列/障害点/時計/元原本なしfixture、既caller追跡保持 |
| `packages/core/src/adapters/libsql/__tests__/driveBackupClosure.integration.test.ts` | 非terminal継続、ACK rollback、手動取消後reclaim/外部取消 |
| `packages/core/src/adapters/node/drive/backupProvider.test.ts` | 未検証の実HTTP連鎖だけ。既status分類全対は借用 |
| `packages/core/src/adapters/node/drive/backupSource.test.ts` | 必要ならreopen/full-hash→非整列range連鎖の比例対だけ |
| `packages/core/src/adapters/libsql/__tests__/driveBackupRecovery.integration.test.ts`（新） | 同candidate実UoW+source+HTTP、自己前任終了/restartの統合対 |
| `apps/web/app/presentation/driveBackupInput.ts` / `apps/web/app/presentation/driveBackupInput.test.ts` | retry union/locatorと境界拒否 |
| `apps/web/app/presentation/driveBackupServerFn.ts` | 既POSTへ判別入力を接続（必要なexportの型のみ） |
| `apps/web/app/components/hollow/DriveBackupPanel.tsx` / `apps/web/app/components/hollow/DriveBackupPanel.test.tsx` | 明示retryの説明/確認/current GET、late/二重POST拒否 |

新table/column/migration、既0039/0038、lock、ObjectStorage/DriveBackupProvider/DriveExecutionの変更は不要。既repository member/意味拡張とtransport DTOだけを共有差とする。target.folder snapshotをidentityに保持するため既insert guardを変更せず成立する。型だけでなくDB guardもclosed→activeを許可するが、動的安全性の証明にはしない。source/provider実装やruntimeOwnershipの製品差は予約しない。共通domainのfolder一致関数はsnapshot同一性に残せるが、現在connectionとの意味比較には使わない。不変条件に追加差が必要なら実装前に返す。

## 追加受入対と最小資源の提案

固定IDから必要な違いだけを確認する。対数は計画時の目安であり、数を満たすための新 gate を作らない。

- A: 原本なし1対。新自己note以外不変、5表/owner/source/provider増分0。
- B: 並行別commandの同target受付競合、片側Tx失敗/再読、90日直前/境界prune後の新command再利用、別actor/sub非流用。2つのcallerを実UoWへ到達させ、直列を並行証拠にしない。record/target/file ID不変・upload追加0。追加としてexact lookupの0/1/2件、最新100件非依存、retry受付とpruneの両Tx順序、90日history非表示と参照保持、依存terminal/close後の通常pruneを確認する。旧行の内容変更0。
- C: 非整列partial Range→verified range→次chunk、Range無し0、upload ACK不明とDB ACK不明は別障害点。非terminal uploadingの保存intent上限対と、旧failed/intentなしreconcilingのequal/greater/less/malformed/end Range対を分け、equalだけ再開・他はmetadata一致以外chunk0を直接確認する。末尾Rangeだけの成功0、同ID完全metadata成立だけ成功。URIなし/不正AADはquery/start0、metadata404/409/deniedでsession再作成0、明確失効＋明示retryだけ同ID start1、再作成ACK不明でstart追加0、status3回/期限を確認。全部をHTTPで再演せず実HTTP連鎖2本＋DB/fakeへ分ける。
- C/D（B1契約追加）: 同sub新epoch・非null同一key/異なるciphertextで新identity資格currentと旧target.folder snapshotを両立。異値/null不一致/復号不能/await中current変更は送信0、旧target.folderEpoch/record/取消済み旧transfer不変。旧sessionの正規旧AAD→新AAD、誤AAD拒否、新queued received0/sessionnull→証拠付きCASの競合拒否を確認する。
- D: 原本再openの全hash、未知/生存前任では新claim/HTTP0、実前任終了→proof保存ACK→新owner。DB closed保存済み/proof ACK未了の間を止めて既withCallerがclaimを拒否する対、commit ACK不明の再読、ACK再処理、手動取消後開始済みreclaimと外部取消拒否、purgeとreclaim両順序を含む。実resource closeと業務結果を別記録する。
- J: 型/局所/通常buildとposttype、DDL/lock不変更、driver/source/socket/caller/pinの終端、停止保全。S1移行rollback全再演ではなく今回触れるclaim/旧terminal不変の拒否対を追加する。

| 資源 | 提案上限（未作成・未実行） |
| --- | --- |
| root | 新排他0700 root 1、計128MiB。旧 proof/material/result/cache 流用0 |
| DB | logical4/64MiB（application1・native recovery1各16MiB、recovery停止opaque/audit各8MiB、総枠内余裕）。正式0039新空初期化2。失敗DBを再実行せず、予備追加はRoot判断。actualfresh0 |
| synthetic data | account最大3/WS1/notes最大4（原本なし1含む）。原本は1KiB、1MiB+17B、2MiB+17B、総実file16MiB以内。最大原本性能試験0 |
| 自己HTTP | native連鎖2本、fixture listener同時1、実要求合計32/16MiB、要求同時1。新固定実URL/optionsのみ、redirect/外部fallback0。正常partial/ACK/restartで必要要求を準備時に列挙し、未使用枠を根拠なしretryへ転用しない |
| runtime | 本体boot/Chrome0を第一案。DB writer同時1。前任/後任の実Node子は通算3、同時2以下（生存前任の拒否対だけ重なる）。自己既知PIDの正常終了/pipe終端/正規acquire、未知scan/manualkill0。自己listener終了後exact bind probe最大2 |
| 素材/ログ | 新AES2本64B以内、material256KiB、helper/log8MiB、NodeTMP8MiB。NODE_DISABLE_COMPILE_CACHE/TSX_DISABLE_CACHE、vitest cache:false/native loader。raw body/token/session/例外stack0、有限schema投影 |
| 通常checks | type→lint:fix→format→影響局所→build1→posttype。dist別256MiB。実装変更を伴うS2の影響対は上記差分と接続先だけ。reporterのDBなし1対で件数/JSON/終了確認後にDB対を開始 |

既UI5成功は再演しない。ただし新 retry UI の実browser根拠は上のbackend資源に含まれない。最小component契約だけで UI 完成扱いにはせず、独立側が新retry導線だけを確認する別の1boot計画を必要に応じて採用する（過去1navigation約45assetを見込む）。この点と shared claim/transport 案を Root の採用判断へ返す。S2をbackend回復だけで分割受入する場合も新retry UIを未確認として残す。

B1/B2追補の資源増分は0。key/AAD/Range拒否はpureまたは既application DBの有限fixture、prune/claim競合は同DB/同時writer1のTx制御で検証する。18 pathは旧16 pathへrecovery.ts/test.tsの2つだけ追加。HTTP2連鎖/32要求、logical4/64MiB、root128MiB等を増やさない。暗号材料は同新AES2本を異なるAADで使い、epoch追加をkey追加にしない。前任proof gapは既ExecutionとClosure対を実UoWへ接続して検証し、共有Execution製品差を予定に加えない。

## 返却と残る判断

2026-10-01 実装中の採用追補: JB-02末尾とIN-06に従い、未開始取消後はretryでなく新initial操作を受け付ける。追加変更は既18path中のrequest.ts/domain DriveBackupTransferRepository/libsql実装/application integration testの4path。`canStartUnallocated(targetId)` は同Txのexact targetに対しunallocated/fileId null、cancelled/owner none行のEXISTSと、received0/session null/statusAttempts0/readPinned false/refreshPending falseを含む全条件に反する行のNOT EXISTSを使う。履歴100件scanの陰性を採用しない。現在資格/原本/folder意味を再照合し、旧取消行は不変、新job retryOf null、旧command冪等、並行新command集約を維持する。開始済み/owner未証明/allocated ID/session/ACK不明へ許可を広げない。

この追補の新label application DB1/16MiB・正式0039初期化1をManagerが追加採用。logical5/合算64MiB（16×3+8×2）、root128MiB・自己HTTP32/16MiB・子通算3・鍵64Bは据置。既app45対/native2対の成功DBを再実行せず、新7対のみ新DBへ分離する。UI/browser/外部通信0。

追加7対のうち3成功後、fixtureのowner field誤記で4番目準備が失敗したため、失敗DB保持と残4対限定の新label1をManagerが追加採用した。最終予約はlogical6/DB合算80MiB・正式新空初期化4、root128MiBとその他枠は不変。既成功対のDB再演0。実行結果はP5c-2-s2.mdへ記録する。

独立 `reviews/P5c-2-s2-plan.md` を全文確認し、Manager採用のB1/B2と一意参照/prune保護を反映した。「既列intent保持＋非terminal closed reclaim＋明示単件retry、DDLなし」を最終提案とする。旧failed/reconcilingの欠落intentを復元しない行列、immutable target snapshotと現在資格の分離、maintenance/withCallerのproof ACK gateを完了条件に加える。未決は実装委譲と新retry UIの独立追加資源であり、静的案から実行へ移らない。成功しやすい通常単件だけへ範囲を縮めない。

計画のみをEOFまで確認後、文書を含む全read/writeを停止してRootへ返す。次の正式委譲まで製品/検証環境の所有は返却状態を維持する。
