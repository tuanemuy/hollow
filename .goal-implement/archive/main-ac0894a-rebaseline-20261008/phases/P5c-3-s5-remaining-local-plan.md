# P5c-3-S5 残条件の局所計画

2026-10-06T09:45:10+00:00。提案段階。SOURCE基点は `/Users/hikaru/github.com/tuanemuy/hollow-p5c-machine-79ef126-20261006`、HEAD `e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42` を直接確認した。実装・default/preflight・import・test・DB・native・root操作は0。

最初に **Cの最終保存fenceをappの3対で確認する1フェーズ** を提案する。次にA/Eの本文・参照・履歴・undo、次にDの実parser応答不明を扱う。D1のbootstrap診断は独立担当の結果待ちであり本案では調べない。必要な候補を実装してcounts/型/保存前提を固定し、各actualはManagerの別採用と独立工具レビュー後に限る。

## 継承と残差

| 条件 | 継承する根拠 | 新しく必要な直接根拠 |
| --- | --- | --- |
| A 本文採用・保持 | PURE4、APP7のHTML/MD採用と旧本文undo、native2の正常実parser終了 | タイトル・tags・public/share・元原本・履歴資源を前後で実比較。本文文字列だけのundoから資源復元へ拡張 |
| C 認可・current fence | currentMachineの静的guard、APP queued取消/期限の終端 | input finish後から最終Txまでの失権、noteVersion、revision head変化の採用拒否。undoのresultVersion/実行者/別livejob最終再検査 |
| E 原子性 | commitNoteの共通Tx、APP sanitize失敗の旧本文 | refs/assets/browseIndex/revision/notices/body/job全体の正常整合と途中失敗rollback。projection準備失敗とTx中失敗を分離 |
| D 入力・所有 | native2正常HTML/MDのWorker終了、APP finishReply後の保持/回復 | 同じgenuine lease/proof、原本read閉鎖、object write pin、実行枠を個別観測した実parser reply-loss→consume→同deferred finally |
| D 前任 | D1のowner-only closed0/未closed2CAS静的契約 | D1 actual成功は未取得。独立bootstrap判断後に既準備対を使い、原因調査/新能力を重複追加しない |
| F | 各局所のNode/fork/閉鎖監査 | 後続IN-07 Drive SliceC/P5dの同機能UI。局所backend対から全Fへ格上げしない |

最新根拠は `reviews/P5c-3-s5-pure-startup2-actual.md`、`P5c-3-s5-app-audit2-actual.md`、`P5c-3-s5-native-actual.md` と `criteria/P5c-3-S5.md`。Rootのsafe actualを借用した受入を継承し、private結果を再取得していない。APP codecはTextDecoderのdata-only fakeである。native正常2件はreply-loss/unknown保持/undo/ref rollbackを実行していない。

## 第1フェーズ C-final（3対、codec/native資源0）

変更候補は既 `packages/core/src/adapters/libsql/__tests__/machineRegeneration.integration.test.ts` のfixtureと新describeだけ。既APP7/native2/D1のbody・assert・待機時間は保持する。製品/port/DDLは変更しない。必要な工具差は新family binding、casefullname/skip正式契約、source manifest、正常監査countsに限り、exact helper pathはManagerが実装時に採用する。

`prepareBody` の `NoteProjectionPort.project` は入力finish後かつ最終UoW前にawaitされる。fixtureに型付きprojectionを接続し、正規結果を返す前に単一の明示gateで一度だけ中断する。このgateはPromiseの進行のみを制御し、lease/proof/args/receiver/result/closedを書換えない。テストが正規mutationを完了したらgateを解放する。sleep延長/ポーリング増加/失敗receiptの捏造はしない。

| 対 | gate中の実変更 | 必須assert |
| --- | --- | --- |
| C-F1 最終失権 | 正規Workspace/membership設定でownerとexecutor editorを別accountにし、`changeWorkspaceMember` によりeditor→viewer | 現role viewer、noteVersion不変、通常APIによるgeneric job取消と最終認可拒否を別assert。採用本文/結果version無し、旧本文・revision維持、finish済み原receipt/proofId維持、正常終端/入力返却。復権後旧jobの再採用0 |
| C-F2 source noteVersion | 元noteに対する純粋domain編集と正式NotesRepositoryのexpectedVersion CASを同UoWで確定するcontrolled concurrent producer | 変更済み版とmachine snapshotの差を実比較、機械結果の上書き0。外部mutationの新本文を「旧本文」と混同しない。機械専用revision/notice/refs作成0、generic/machine終端整合 |
| C-F3 source revision head | 保存済み実revisionを通常RevisionRepositoryで作りheadを進めるcontrolled producer。noteVersionを別assert | originalRevisionNoの不一致で採用0。原receipt/proofは変造せず、元採用対象の新revision/body/reference書込0。単なるsameMachineSource pure対では代用しない |

C-F2/F3はテスト内の正式repository/domainによる競合producerであり、通常UIに編集lockを回避する入口を追加する案ではない。fixture実装時に保存guardがそのproducerを拒む場合は、そのbranchを成功へ弱めずManagerへshape/必要な既通常mutationを通知する。deadline/取消のnext-begin read0は既queued対のsource guardを借用できるが、実read開始回数を未観測のまま0としない。必要なら後続の2短対で `openOwnedRead` と正規extractorの呼出カウンタを別assertする。

`currentMachine` は executor編集権限、deadline/cancel、note.version、head.currentNo、original/hash/bytes/format/activeJob、source ownershipGeneration、Workspace state、generic job cancel/owner tokenを再検査する。workerの最終Txはこれを再実行し `adoptBody` と完了を同Txに置く。製品不備は今のSOURCE読取だけから確定しておらず、まず欠けている到達対を作る。

このfamilyの予算案はaccount2/WS1/note3/original3/slot3/machine operation3、seed generic3+machine generic3=6。新たなrevision数はC-F2/C-F3の合法producerと既初期head生成から候補時に式で確定する。終端分類はmembershipが変更するgeneric cancel状態とmachine cancelGenerationを区別してsourceから固定する。countは提案上限/式でありactual成功件数ではない。

## 第2フェーズ A/E-body（正常+失敗+undoを5群）

fixtureには既 `ReferenceProcessor` / `NoteProjectionPort` を型に沿って配線する。外部fetchは行わずdata URIと同noteの正式Asset/RevisionResourceを使う。正規processor/projector実装のexact pathとconstructor依存は候補採用前に限定確認し、必要な新pathは先にManagerへ通知する。fake data-only projectionでTxの整合を確認する場合も実Node projectionの終了証拠へ転用しない。

1. 正常採用→undo：HTML/MD共通 `adoptBody` への1代表入力で本文・browse sourceHtml/sourceTitle・revision head/current captured version・notices・reference current・asset current/revision pinsを実assertする。undoでは保持済revision資源がcurrentに戻り、元原本が保持されることを実assert。タイトル/tags/public/shareは要求前から設定し前後同値を確認する。format物理変換のHTML/MD差は受入native2を借用する。
2. projection準備失敗：元正式portに固定故障を置き、採用Txへ入らず全body/ref/browse/revision/current資源が保持されることをassert。BusinessRule失敗とunknown projection errorを混同しない。
3. Tx rollback：正規UoW中の透明repository wrapperで、原保存をawaitした後に固定例外をthrowし原Txをrollbackさせる。`commitNote` のnotes→asset current/pins→scheduleReferences→revision/head→browse saveと、notices/job完了の連鎖から一つの後方故障点を選ぶ。故障前/rollback直後/通常maintenance終端後を分離し、全対象が旧snapshotへ戻ることをassert。after-commit response-lossとは別の対。
4. undo拒否：採用resultVersion後の正規編集、別executor、live generic jobを閉じたtableのvariantとして検査。禁止されたundoが本文・ref・revisionを変更しない。`control.ts` の最初と最後のUoW双方のguardを、prepareUndoBody gateの間で競合させる。jobがgeneric/machineで同idのため最終generic active guardとmachine active guardの関係をsourceから確認する。
5. resource undo拒否：保存済資源revisionから `authorizedHistoryAsset` の同note/retained revision/pin/ready条件をそれぞれ必要最小の正規変更で破る対。未知資源を成功resource manifestへ写さない。保存済revisionの削除/非ready assetは元repositoryの合法状態遷移に限定する。

実ケース数は上の群とvariantを候補で閉じて決める。正常undo用machineは1、他群は必要な独立noteに限定。assertする全tableと採用/undo/外部producerによるrevision数、reference job/outbox発生、ready assets/pins、generic/machine終端別件数をSOURCE seedと `commitNote` / `scheduleReferences` から事前固定する。refs追加がreference job/outboxを生むことをmachine/quota countsへ混ぜない。参照worker/networkを起動せず準備・保存段階だけを対象にする。

## 第3フェーズ D-native-response（実parser1対）

最小source変更候補は既native test `packages/core/src/adapters/node/regeneration/__tests__/machineRegenerationNative.integration.test.ts` と上記fixture。既正常2件/D1のbodyは不変。fixture native=trueの正規extractorを使い、既finishReply注入（原replace/UoW commitをawait後DatabaseError）を1回だけ使う。HTML代表Worker1、business child0。Markdown物理経路は正常2件と同adapter graphを借用し、両形式のreply-loss再演を数合わせで追加しない。

直接順序は original owned read開始→実parser成功/actual handle終端→original `closed` await→genuine `input.finish`→保存応答不明→同progressで保持→正規finishInput read/verify/consume→同snapshot terminal確定→confirmCompletion→元work自然return→storage元finally endWrite→execution元done自然settle。各段階の待機は既Promise/gateを使い、lease/proofをclone/再発行/JSON化しない。

- `progress.pendingCompletion(id)` の返す元lease/proofと `progress.owned(id)` の元参照を `===` で比較する。proofId/generationは正規receiptとの一致をboolだけで残す。`input.consumed(proof, lease)` 前後、`activeInputs()`、`execution.isActive(id)` を個別assert。activeInputsは保持entryの数であり実RAM/GC/byte量の物理証明ではない。
- input read閉鎖は `openOwnedRead` の元handle/closed Promiseを観測して元closeを保持する。実native Workerのexit/terminate Promise/stream EOF-closeは既観測工具の原handleを使い、テストassertから捏造しない。
- object pinは `withOwner` の原Promiseがpendingであることだけからcountを推定しない。ObjectOperationRepositoryには公開のactive-count getterが無い。既fixture DBの固定object-write schemaを候補前に限定確認し、同normal job/noteの正式joinによるread-only boolean/count witnessを提案するか、既正常object-purge拒否対を採用する。追加SQLはRootの先採用が必要。private AsyncLocalStorage/Map/WeakMapアクセスや新Storage release APIは不要。
- saved terminal読戻し後も同lease/proof、sameMachineSource、consumer/runtime/token/g、closed receipt/proofId同値と元deferredだけを確認する。confirm成功値だけでnative closureやpin0を補完しない。original callback/finallyと実operation settled、DB write pin0を最後に別assertする。

この1対でDのreply-loss直接残差を縮める。unknown read/parserの本当の閉鎖不能は別問題であり、fake codec closed=falseやfake事件を実native unknownに格上げしない。現在の正常adapterに元handle回収を保持した合法controlled faultが用意できるか、追加exact test seamが必要かは別のSOURCE-only設計を先に採用する。unknownbirth/EPERM/旧capを実発生したと捏造しない。D1は独立bootstrap review後の既準備familyでowner-onlyと未closed2CAS/rollback/commit-lossを確認し、本response対では前任能力のactualを主張しない。

D-response seed概数はaccount1/WS0/note1/original1/slot1/machine1/generic2。保存応答不明の既normal recoveryは完了をfailedへ収束させるため、新本文採用数を1成功と数えない。expected failed1、revisionは旧initial1を基本にSOURCE branchとseedで確定する。quota/LLM/preview/dispatchは全familyで0。

## 実装・有限検証の境界

各familyごと新memory-only rootをManagerが別に採番し、独立候補レビュー前にprobe/createしない。共通予算案：root192MiB、logical DB最大4/合計80MiB（main32/opaque8/audit8、他DB0）、原本8/cache16/TMP8/records8、entry8192、単一family/stock toolfork1、appケース最大40秒/group180、body430+shared closure50=outer480、200ms監督。C/A/Eはbusiness Worker/child0。D-responseはWorker1/child0同時1、D1は既予算のowner child1/probe1と別family。残inputは共通max2を守る。公開materialのSOURCE1470監査とprivate material上限は別に計数する。

actual採用前にSOURCE HEAD/1470 blob・mode・公開108deps・CF986・Node24.18・config/worker realm・exactcasefullname/skip・fixturecountsを固定する。候補変更後はwhole typecheck→lint:fix→formatを確認し、旧受入body/outsidepath同値を示す。実行はdefaultが存在すればそのnonmutating結果を別inspect、成功後Managerが採用した一巡のみ。

正常は全required assertions/Reporter→fixture execution/stage/memory/pin終端→ONE strict main.wal_checkpoint(TRUNCATE)（busy/log/checkpointed、1row、safeinteger000）→原finally clientclose→tool/native原handle実exit・stdio EOF/FD close・IPC EOF/FD null区分→Node/Python leaderとown PG absent/2EOF/FD→最終strict/cap/wal+journal無し→wx opaque/audit bounded各8MiB10秒64KiB/fsync/fullhash→immutable/query_only/FK/integrity/source固定counts/audit実close。checkpoint/client.closed/testpassは個別FD閉鎖の代用にならない。fault/unknown/non0/forceならheld、後続copyaudit0、追加自動root/run/旧root再操作0。

## 直接SOURCE固定と停止

有限読取した主要SOURCEは全regular600/nlink1/UID/canonical/NOFOLLOWの全文と前後metadata同値を直接確認した。

| SOURCE | bytes | SHA256 |
| --- | ---: | --- |
| adapters/libsql/__tests__/machineRegeneration.integration.test.ts | 21188 | 2b80c745b86220f360e673b97bb9b5bf6601f7cc361d95c77159a938b8646700 |
| adapters/node/regeneration/__tests__/machineRegenerationNative.integration.test.ts | 19932 | 74e1199efd2dd1c81eb3dd9e508d901e890b06f9448f11934a9d92383b9fc400 |
| application/regeneration/worker.ts | 17716 | 6154919239f839e93a5f13ec1d916435e4bb10e23077d5d612e779c9efa855db |
| application/regeneration/control.ts | 6138 | ac6f8ec234bb2af908cc57107b0cd42f0b4f1ca63b1de52012e38afd189556ad |
| adapters/node/coordinatedObjectStorage.ts | 9473 | 549c01041320a5450a586a6293c17c3a11403b375524f2099ca94895a8f43d92 |

全SOURCE/helper/Manager正本 writer停止を維持し、本proposal以外の変更0。全accepted/failed validation rootsは恒久NONOP。D1原因調査、private proof/SQL/log、未知process/PID/env探索を行っていない。固定proposalの自己全文hash確認後、全read/writeを停止してManager判断へ返す。
