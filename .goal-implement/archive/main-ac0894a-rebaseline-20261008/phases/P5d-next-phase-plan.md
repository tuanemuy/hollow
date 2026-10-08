# P5d next phase: CA67 ordinary ready-receipt capacity and prune

SOURCE-only proposal。未採用・未実装・未実行。現正規 SOURCE は hollow-p5d-c2a3d45f-20261006 / e30bb941572fcfb4253a25b5a04a27bbf41276b1。既 LD01 / DA01 / e30bb941 の局所受入を保持し、全 P5d-A–H は in_progress。旧・成功を含む全 actual root は恒久 NONOP。

## 選択と元条件

次一 phase は **CA67: 退会 intent のない通常 active account の ready receipt67→容量拒否→25行 drain→通常再開→matched prune** に限定する。共有 account-delete 契約の「全account ready receiptをintent claim前に25件保存・同値再読・consume」「67件後の恒久 fence/恒久台帳を作らない」「通常 prune と matched acknowledgment の同Tx削除」を直接埋める。P5d-E/F/G の一部分であり、account deletion 成功、全copy回収や native HTTP positive ではない。

unknown / legacy cutover / acquire-confirmed 前任65 / Google / 複数epoch / 移動両順序 / 並行owner競合 / browser は別 phase。既受入 LD01/DA01 の fault・退会ページを再演しない。CA67 は新 family 一 case とする。

## 直接 source 根拠と合法生成

- application/account/deletionWorker.ts:15–72 の drain は genuine receipt の verify→正規 save UoW resolve→再verify→正規 exact durable read→consume。188–200行はこの処理を deletion intent claim より前に行う。intent0 の通常 account でも drain 可能。
- adapters/node/drive/execution.ts:229–245 は entries+previousProofs+receipts>=67 で新 caller を claim 前に拒否する。440–460行と original withCaller finally は native acquired ownership / original local closed proof / actual ended caller / ACK を条件に receipt を保持。public acknowledgedReceipts は常に最大25件であり、67件を取得できる API と誤記しない。
- application/integration/drive/connection.ts:267–340 は withCaller の外側に claim/settle を移さず、capacity 拒否時は business attempt の最初の read より後、claim より前。正常 empty-code authorization を正規 factory/API で実行する方式は DA01 の producer 根拠を借用する。empty-code resources0 は local closure であり HTTP/socket/TLS actualclose 正例ではない。
- domain/integration/drive.ts:4–24 の browserAttempts3 / browserRecent5 / authorization600000ms / receipt86400000ms / history7776000000ms / pruneBatch100 を保持。
- 追加採用範囲の adapters/libsql/hollowUnitOfWork.ts（12224B/b6434a068b8cbcb8780592390e9bdab5697bb0ed1e938ec220976982eac5036e）の import から exact driveRepository.ts を確定。後者39274B/89c4ca9fbab28adc7290610036668931ccb3587d8b42705d1f62215774be7572 を bounded stable read。insert:574–600 は直近10分の同browser全attempt>=5又は非終端/held>=3を拒否。terminal closed行を順次作るので live は次開始前0、生成中1。**同clockで68回beginは不合法**。
- 正規 logical clock を5件ごとに600001ms進める。各 callback は begin直後に同clockで完了、各 command/state は正規生成。13回の clock前進で68開始が合法な recent window となり、全体は receiptMs内。browser/sessionの原本有効期限・current actorを開始毎に正規API/UoWで確認する。実clock待機、guard緩和、terminal時刻/row/secretのSQL seedはしない。確認を満たせなければ起動候補を差戻し、期待を実値から作り直さない。
- driveRepository.ts:734–798 は current same Tx上、intent不存在・closed owner の exact saved ACKがある行だけを prune。historyMs経過後は business attempt と matched ACK を同Tx DELETE。application drive runner の reconcile 最終 maintenance は private ready receipt / pending caller / unacknowledged / predecessor がある間 prune0（747–771行）。

上記 selected source bodiesは公開固定 SOURCE の直接読取。scope96 guard/Git全走査はしていない。DA01 正常実行・whole checks・genuine factory/private identityは既レビュー/報告の借用であり、今回 actual proof ではない。最新 DA01 phase4280B/7ed7246e6f4b1dfefe6171c5599902e99b20ecdd7861d6e84e56bbc8cade10ea と独立レビューを参照。

## 一 case の通常対

1. 正規 account1 / browser1 / session1 / never-linked Drive connection1 を作る。新 acquired NativeDriveRuntime と元 createNodeDrive / protectors / UoW を使う。deletion intent/debt0、WS/note/object/credential use0、network/HTTP/DNS/Worker/business child0。
2. 正規 begin→元 exchange(empty code)→元 result save→original ACK→original withCaller finally を67回順次完了する。毎回 exact durable failed/closed/current bindingを正規 repositoryで確認、current actorはactive。callback pending最大1。原ackを観察する場合は original this/args/Promise/result/error保持の型安全delegateだけで、proof/receiptの発行・consumeを置換しない。
3. 68番目も正規 begin を一回行い、同state/code callbackを容量満杯の時に一回呼ぶ。原 unavailable の class/codeを確認し、attemptはpending/owner none/元version不変、private caller/closure生成0、新claim0。容量拒否を完了/failed/nativeclosedの証拠にしない。既67行/receiptを残す。
4. この時点で正規 reconcile の maintenance/prune は0、未保存 receiptが欠けないことを確認。deletion intentを作らず sweepAccountDeletions を3回呼ぶ。各25/25/17の original save→commit→exact read→consumeを source-bound observerで確認する。観察receiptは各 public25pageから得る同objectだけ、正規private verify true→consume後false。失敗/不明commitは成功化せずheld。durable ACK累積25/50/67、intent/debtは0。
5. 同68番目のstateを一回正常再開。別beginや直SQLclaimを行わない。初回capacity拒否でowner能力が発行されていないことを維持し、正常 withCaller による新ownerを使う。元 failed/closed→actual caller ended→ACKによる genuine receipt1、通常API結果を確認。4回目の sweep で1件 save/read/consume。private ready0、durable ACK68、history68。
6. 全 private pending/unacknowledged/predecessor0を元publicAPIで確認してから、logical clock を最後のterminalAtから historyMs+1 へ進める。正規 reconcile maintenance 一回（pruneBatch100）で history68 と matched ACK68 が同Txで消えることを確認。ageは通常履歴削除の条件だけで、能力・閉鎖・ACKの代用品にしない。new callback/claimはこの時刻で行わず、期限切れsessionを active cookie の証拠にしない。
7. normal original execution.stop / password stop / client.close と tool/fork/PG/PIPE正常終了後だけ同新DB readonly audit。途中failed/forced/unknownは監査0・全root恒久held。

public receipt pageは最大25。67 readyの合成 countは67正規完了・private entry/pending0・capacity境界からsource-derivedに判定し、内部registryを読む/公開67dumpを新設しない。正確な67個の genuine receiptは3回のpublic drain pageでのみ逐次観察する。source controlflow/assertを個別rawproof/物理FD監督receiptにしない。

## expected counts と有限制約

全て candidate sourceから独立固定し、監査のobserved値を期待に採用しない。開始最大68 / 完了68 / 初回capacity拒否1 / 原ACK68 / normaldrain4（25,25,17,1）/ save+exact read+consume68。ensure version1+normal begin68で connection version69、epoch0/settingsVersion1/secret NULL / everLinkedNULL。retry68はbegin0なのでversion加算0。new deletion intent0、account active1（deleted anchorへの縮小0）、authVersion元値維持。history最大68/最終0、durable ACK最大68/最終0、private ready最大67/最終0、pending/maxlive1、business native resource0、predecessor0。最終accounts1/browsers1/connection1、WS/note/credentialuse/origin/objectwrite/debt/intent0。session期限は上記90日logical advanceで通常期限切れになり得るため、最終currentUser非NULLを固定しない。

履歴51の基本P5d予算から、**本一caseに限る max68 authorization history +68 ACK** の明示追加採用が必要。DB1+sidecars32MiB/合計64MiB/root192MiB、logs/output2MiB/TMP8MiB/object8MiB（実object0）、material256KiB、one account/browser/session、owner metadata1/recovery1、key32B（本文出力/hash0）、config<=16KiB。秘密/owner fileの各元FD closeは取得できた実証だけを記録し、dispose不存在から一般FD閉鎖を推定しない。

case/hook40s、suite/body180s、outer240s（TERM10/KILL10/PIPE10共有tailを含む）、200ms guard、bail1、stockFork1同時1/Node1/Python1/Worker・business child0。registry private67は製品上限を変えない。fullnormalset fixture guardはcase途中でも最大68/ACK68/intent0/sidecar/source mode/inode/capを検査。frame<=40/各512B/log原上限を維持し、68件ごとのrawframeを追加せず bounded count/enumのみ。logical13前進+history age前進は同期clockport操作でsleep0。68 native local operationsの実時間は未測定、40s超過時は未合格heldでありtimer延長/再試行をこの計画から許可しない。

## exact実装候補と採用 gate

初期製品/ports/DDL変更0。追加は SOURCE既系統の2fileのみを提案:

- packages/core/src/adapters/libsql/__tests__/accountDeletionDriveCapacity.integration.test.ts（新、一case CA67）
- packages/core/src/adapters/libsql/__tests__/accountDeletionDriveCapacityFixtures.ts（新、DA01 fixtureの正規factory・通常close/guardを再使用できる公開source基点から限定派生、fault/deletionpage観察は除去。旧runtime/root/results import0）

tooling proposalは新 PUBLIC helpers/p5d-drive-capacity-runner.py と p5d-drive-capacity-loader.mjs（新2、元DA01 finite supervisor/officialcacheFsfalse stockfork/read-onlyauditを限定再利用）。現DA01/LD01 test/fixture/helper/reportは不変更。source aggregate/manifest・新helperstrictframes・official single test/result/hook・native resources0正直な記録・same canonical DB provenance・normal checkpoint/actualclientclose/FK・exact audit SQL/columns/expected counts・stockfork正常SIGTERMと監督force区分・両outer EOF/actual FDclose/knownPG三値を固定候補で独立レビューしてから実行する。

元API/guardがこの正規対を成立させないことがsource/実対で判明した場合だけ、trigger/path/invariantの具体製品修正案を別提出する。execution.ts/deletionWorker.ts/drive ports/runner/driveRepositoryを先行変更せず、67上限緩和・public proof fake・通常guard無効・新対の期待弱化は採らない。possible product fixはこのproposalから自動採用されない。

Root採用後: fixed source/helper/cap/bodyの独立preflight→Root direct finite PUBLIC precheck→既default（新root absence採用を含めexecutedfalse）→未使用freshroot1+derivedtoolTMPに sole actual1。成功全writer/child/PG/EOF/FD停止後のみsameDB direct readonly FK/integrity＋exact source-derived capacity/prune監査を行う。新root名は未予約で、生成/probe/import/runtimeは本提案で許可しない。失敗rootのread/stat/hash/copy/import/reopen/再利用は0。

CA67成功時に受入可能なのは通常 ready容量67/drain/pruneの局所E/F/G条件だけ。全A–H、退会finalEXISTS全世代0、未知/legacy/65/Google/HTTP未ACK/fullcopy/並行競合/browserは未完。actual原因を推測して過去失敗を修正済み扱いにしない。Manager管理文書/source/main/helpers変更0、本proposalのみwx600固定、全read STOP。
