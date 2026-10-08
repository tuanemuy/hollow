# P5d next local family: OWNER-RACE1

SOURCE-only proposal。未採用・未実装・未実行。次の一 family は **二ownerの正規同時退会**に限定する。controlled SOURCE `55ef3b226babeb6269654c66dbe0198eae35d366` を基点とし、既 LD01 / DA01 / CA67 / EF01 と nativeHTTP 局所受入を保持する。P5d-A–H 全体は未完。新私的能力・proof・ACK港は作らない。

## 選択と完成条件

P5d-B の「active WS最後ownerをDB同Tx正本で保護し、二owner退会/降格の競合でowner0成功0」のうち **二owner退会**を直接埋める。二つの通常利用者操作の受理競合、deleted anchor / authVersion fence と現在の active owner を同じDBから確認する。降格との混合競合、WS削除fence、move両順序はこの family の合格へ含めない。

unknown / nativeHTTP未ACK は正規閉鎖・保存・ACK保持をさらに結ぶ family が必要である。legacy cutover は旧 whole-runtime閉鎖capability の未確定に依存し、複数epoch / 全copy はより多い正常producerの準備に依存する。browser は通常UI起動に依存する。OWNER-RACE1 は既DB受理portだけで新たな競合条件を直接検証できるため次に選ぶ。これは他の必須残条件を優先順位から除く判断ではない。

## 直接 SOURCE 根拠

すべて SOURCE98 named table 内の必要 file の stable fullread。Git blob は読取bytesから Git blob object SHA1 を計算し、固定表の値へ一致を確認した。HEAD/98全体の再走査はしていない。

| SOURCE path（packages/core/src/以下） | bytes | SHA256 | Git blob |
| --- | ---: | --- | --- |
| application/account/deletion.ts | 1542 | da08ec61121843b2e1734609ece2050aa6c4544b20c81db648af40e55345c021 | 59f4dddb04e6fbd248fa76ca23755cf72b62712b |
| domain/account/deletion.ts | 4492 | 49bdd4e4c17e66b660a22cb12aac40d62967295509b79ba20599bfa3efdd977c | 2b2a7565f4ebe38ae9ce7be7c1920e06eed48cc0 |
| adapters/libsql/repositories/accountDeletionRepository.ts | 65709 | 23a03b0d1414cd2d83e9c5d48beae198a573f71a2d6efb186b98929cdf255f49 | efda92da653eb57e525372c1f448aa1d637e6c2a |
| adapters/libsql/repositories/workspaceRepository.ts | 8087 | 9849b60c65631911b731bf28af9b82c925f86c9176905a24e3a430cdf240e6e4 | 46ee8151c8b94f3e39cfb2357654ab711487b7da |
| adapters/libsql/repositories/accountRepository.ts | 7363 | 00fbdf4e1250f2d1fa6e0684631488cad64757396f6fb3142bb2958f03d62de3 | a48028fe2a0ae1d5204133d671866ea4bfa2832c |
| adapters/libsql/hollowUnitOfWork.ts | 12224 | b6434a068b8cbcb8780592390e9bdab5697bb0ed1e938ec220976982eac5036e | 693b975bdddf433159be29b6f1532c8a0aa99d83 |
| adapters/libsql/client.ts | 2372 | 0fa9c5f6b9e81a0b5c0733f7cf908833bac74c08461eef9d42cdde6bb49a0b75 | 06b731cc164bae45a321146efac0cfa459952355 |
| adapters/libsql/__tests__/accountDeletion.integration.test.ts | 8483 | 5a79dd087f225769841015ae47d0f0acf0ab18bbff763c0640f3fc63d65f334c | 21dbc9df1eed6e7ed87fcecb01eed1c73553342e |
| adapters/libsql/__tests__/accountDeletionFixtures.ts | 6886 | 5876ca9e38a788c471e59f7ea3d5a023140952f788bb410535a80553760d299a | 249f15751a29bb76f8b6537e918763605b5bd377 |
| adapters/libsql/migrations/0044_account_deletion.sql | 366498 | c74adb1b00cabbb81440a3fc9128d661fcd81696ad0ced1b52754ac158430df7 | 030da8ed5357345b1d663ba617cb4b9e2203a2d8 |

- deleteAccount:14–43 は本人 session / email を確認し、cancelと accept を同原UoW内で行い、afterCommit通知後に accepted を返す。
- accept:573–580 は同Txの active WS / owner membership / 他active owner不存在を確認して WORKSPACE_LAST_OWNER。581–627 は intent insert、active/expectedAuthVersion付きaccount縮小、session / membership削除を同Txで行う。
- 0044:3079–3093 は account retirement の同Tx last-owner guard と membership DELETE / UPDATE の last-owner guardを保持する。applicationの事前readだけに依存せず、account state変更時点でも他active ownerが必要となる。
- workspaceRepository:184–203 は active account に属する ownerCount。roleも active account / active WS に束縛される。accountRepository.findSession は active account EXISTS、identity は active/deleted/missingを区分する。
- 基本 test B01 は単独 last owner、B02 は残ownerの逐次降格拒否であり、二ownerの二退会Promiseは未検証。新対はこの既対を再実行しない。
- client.ts:24–38 は file client を serializeLocalClientへ渡し、applyPragmasは WAL / FK / busy_timeout5000を設定する。原UoWは原transactionを使い、application OCC retryはない。二Promiseを起動しただけで二DB Txが物理的に同時進行したとは主張しない。

## 候補前の有限追加読取 gate

正式 client.ts が import する exact `packages/core/src/adapters/libsql/serializedClient.ts`（各32KiB以内、canonical / regular / selfUID / nlink1 / stable fullSHA / Gitblob）の読取を Root に提案する。**現時点は未採用・未読取**。同fileの直列化scopeが per-client / per-file のどちらかを確認し、production portを迂回せず caller競合とDB transaction序列を分けて観察するためである。未知resolver / ancestor / directory探索は行わない。

正規 account / workspace生成とcontainer型を候補で準備する際、上記既testが明記する exact `application/workspace/usecases.ts` と既fixture import の exact `application/di/serverHollow.ts` が必要なら、必要関数 / 型 / 65536B各の追加読取を別採用する。現proposalはこれらの本文を読んだ扱いにしない。SOURCE table外の追加はRoot採用後だけとし、不明な retry/error mapperを推定しない。

## 正常対 OWNER-RACE1（新1case）

1. 正式空 migration0044 の新DB1。正規account2 / session2 / activeWS1 / owner2 / WS note1を作る。既testと同じ正規createWorkspaceとUoW.workspaces.join(owner)・notes.insertを使用する。直SQLseed / authVersion / fence / cursor / role強制は0。shared noteは本人領域へ移さず、元WS owner / creator / html / versionを保存して比較する。
2. original client / getDatabase / original UoW / original deleteAccountを使う。追加client2が必要かは serializedClientの正式契約から決める。原local clientの直列化を無効化・複製しない。両callerはDB Txの外側に置く同じ有限start gateから本人emailで退会を呼ぶ。先行operationのsettlement前に両original呼出が始まったことをtest-local boolで確認する。gateはrepository / Tx callback内で待たせず、lockを取得した一方が他Tx開始を待つdeadlockを作らない。
3. 両original PromiseをallSettledで最後まで待つ。正常正例は accepted1 と WORKSPACE_LAST_OWNER1。winnerの人物名・順番は固定しない。両accepted、owner0はFAIL。driver busy / DATABASE_ERROR / unknown / timeout /片方未settledは、このfamilyの正常受入に使わずheld。原APIのPromise / this / args / errorを観測で置換せず、application retryを新設しない。
4. 同originalUoWのreadで、winner deleted anchor/authVersion+1/session拒否/membership0、loser active/authVersion元値/currentUser有効/owner membership1を確認する。intent1はwinnerだけ、loser intent/fence0。activeWS1/ownerCount1、WS noteの元owner/creator/body/versionを保持。必要source-derived SQLはreadonly検査だけで、未知driver messageから成功を分類しない。
5. 退会worker/sweep/pruneは呼ばない。intentはqueued/personal-notes/version1のまま。この対は不可逆受理とowner正本だけを対象にし、全回収/succeededを合成しない。unknown ACK / debt / receiptは作らず、原recover-beforeclaim / saved exact read / voidACK / consumeの意味を変更しない。
6. 全originalcallerがsettled後、所有している全clientの実closeとpassword resource停止を待つ。close呼出/return・case assertions・stockfork正常終了と外側PG/EOF/FDを区分する。閉鎖不確定やforceはaudit0で新root全体held。

事前mockで「ownerCountは2だった」と返す対はproduction concurrent正例にならない。fabricatedSQL error、fake BusinessRuleError、手製native brand/proofを使わない。SOURCE机上のDBguardと実DBの正規二caller対は別根拠である。serializedClientによる正常直列化なら、その実装が通常同時callerを安全に序列化した範囲だけを主張し、物理Tx overlapの証拠としない。

## 固定期待と有限資源

新family1case / retirecaller2同時最大2 / normalaccepted1 / businesslastowner拒否1 / account2（active1 deleted1）/ auth fence winner1 loser0 / intent1 queued / sessions1 / activeWS1 / activeowner1 / membership1 / sharednote1。不明な ancillary browser / profile / outbox row数は候補sourceから固定し、観測値に合わせて期待を作らない。WS / note versionは開始snapshotから元不変をassertし、snapshotを予測値で置換しない。nativeuse/Driveattempt/readyreceipt/ACK/history/object/debt/purgeは未seedの0であり、非空閉鎖証拠ではない。

root192MiB / logicalDB1＋sidecars32MiB / DB合計64MiB / object0（元8MiB上限内）/ TMP8MiB / log2MiB / material256KiB。account2 / WS1 / note1 / history0 / credential key0 / browser0。Node1 / stockVitestfork1 / Python1 / businessWorker0 / businesschild0 / socket/TLS/DNS/外部provider0。password実装の原resourceはcandidateでsource/APIに従い所有・終了を台帳化し、未読型からWorker0の保証を捏造しない。工具capsを変える必要が判明すれば実行前に別scope採用する。

case/hook40s / body180s / outer240s（TERM10＋KILL10＋PIPE10の共有tailを含む）/ 200ms監督 / bail1。gateは一回だけ、両callersettlementはbody内。busy_timeout5000を維持し、再試行・別rootblindretry・timer延長は許可しない。UoW / clientmethod / statementsはSOURCEから候補時に保守的上限を固定する。CA67の837や1024を新対の実数/必要予算として転用しない。

## exact 変更候補と実行採用順

製品/port/DDL変更0。新SOURCE2だけを提案する:

- `packages/core/src/adapters/libsql/__tests__/accountDeletionOwnerRace.integration.test.ts`
- `packages/core/src/adapters/libsql/__tests__/accountDeletionOwnerRaceFixtures.ts`

PUBLIC工具は新 `helpers/p5d-owner-race-runner.py` と `helpers/p5d-owner-race-loader.mjs`。既CA/LD/DA/EF/helperは無変更。stockForksPoolWorker(cacheFsfalse)の原argv / receiver / handle / IPC / stopと既三値PG / leader-after-exit / EOF-FD / exactformalcase / afterAll / normalreceipt / sameDBreadonlyauditを限定再使用する。ログはfixed stage / bool / finite countだけ、各frame512B / 最大40。原error.message / stack / IDs / token / SQL / proof / keyを読まない。

正常audit期待はformalcolumnsでaccounts2/active1/deleted1/intent1・matchinganchorとauthVersion・sessions1・WS1/activeowner1/membership1/note1のWS保全、FK/integrity/query_onlyと監査actualclose。expectedanchorwinnerは正規identityから束縛し、arbitrary ID本文を出力しない。fixture DBcloseと監査readonlycloseは別で、EOFをFDcloseへ補完しない。sidecar/strict source/metadata/容量guardの成功を必須にし、失敗rootはaudit/copy0。

Root採用→追加PUBLIC SOURCE読取 gate→新2source/2helperとsource-derived counts/caps固定→独立candidate preflight→Root有限PUBLICprecheck→既default全stdout inspection(executed=false/root0)→未使用freshroot1/derivedTMPへのONE、の順とする。ここでは新root名の予約・probe・default・生成・実行を一切行わない。

成功時の局所受入はP5d-Bの二owner退会競合および同対のA/C/G受理fence整合のみ。降格競合・WS削除・move両順序・unknown/ACK未確定/nativeHTTP未ACK/legacy/複数epoch/全copy/browserとwhole A–Hは残る。事前codeだけで機能合格にしない。原guardが正規対を阻むと判明した場合はpath/trigger/invariantを独立所見にし、期待やerror分類を弱めない。

## 保全と停止

本proposalのみwx600固定。製品/helper/main/Manager正本変更0。全新旧private/generated SOURCE/build/DB/results/cache/TMP/key/proof rootは恒久NOOPS、stat/read/hash/import/copy/reopen/replay/cleanup0。Nodeimport/native/runtime/default/rootprobe/test/DB/通信0。追加agent/spec/spec-implement/goal操作0。公開criteria/current planと上記必要SOURCEの読取を終了し、ALL read STOP。

## Manager追加採用後の確定補正（本文prefix保持）

上の追加読取gateをRootが採用したため、serializedClient.ts を直接 stable fullreadした。3121B / regular600 / canonical / selfUID / nlink1、SHA256 `44e29b4c33f2e314649222b9b86b4c24457e443afbff1e069f1f85e04ba70dcb`、Git blob `c02f6d323d214b29a9243fbdbea50521e733cd0e`。上の「現時点未採用・未読取」はprefix作成時の事実であり、現在はこの1fileのみ採用・直接確認済み。その他追加sourceは未読取のまま。

pending/acquire は serializeLocalClient の各呼出内部のprivate closureであり、**一clientのtransaction全寿命をそのclientの他呼出から直列化する**。file全体の共有queueではない。transaction生成失敗はrelease、commit成功でunlock、commit失敗はrollback/closeまでownership保持。元wrapped client / transactionの受信者・API・Promise・commit/rollback/close結果を観察delegateで変えない。この通常wrapper自体の既Promise生成は製品契約であり、新fixtureがそれを別Promiseへ置換してよいという意味ではない。

OWNER-RACE1候補は **同canonical newDB fileに原normalclient2 / 別originalhandle / 原getDatabase2 / 原UoW2**を必須とする。全fixture/account/WS作成とmigrateはclient1だけで完了し、client2へ原applyPragmasを適用後に両DB handlesを使う。migration2重適用0、別DB生成0、同clientのqueueだけを二DB競合正例にしない。両clientそれぞれの正常直列化を迂回せず、stock driverのlock / busy_timeoutと既機構はそのまま保つ。新application retry0。

競合観測はtest-local bounded boolだけとする。両callerのoriginaldeleteAccount invocationがsettlement前に始まったことに加え、**別clientのoriginal transaction APIへの二つの開始要求が、先行transactionのcommit/rollback/close完了前に存在した**ことを正常正例のgateにする。これは原APIへの重なる要求を示すが、lock取得済み二write Txの同時進行を主張しない。fixtureの型安全delegateが必要なら、原methodを元this/argsで一回呼び、その元Promiseをそのまま返す。受動settlement observerは原結果/errorを変えず、observerfailureはnormaldenyとし、unknownhandleやcloseを推定しない。getter / private nativehandle / arbitraryerror属性を読まない。開始した原handleを即所有登録し、clientclose2を独立に確認する。

先行write Txが後続transactionの **取得成功**を待つgateを置くとSQLiteのlock循環になるため禁止する。開始要求を受動観測するだけであり、原commit前やrepository predicateの人工await / timing変更を追加しない。二開始要求の重なりを実観測できなければ concurrency欠測でheldとし、Promise並列だけでPASSにしない。driver transient/unknown拒否を WORKSPACE_LAST_OWNER に分類して正常化しない。

資源補正は同DB1・originalDBclient最大2 / UoW2（同時original caller2）だけ。logicalDB・sidecar・root capは本文のまま。新test/fixture2と将来PUBLIChelper2scopeは本文のexact namesに限定する。各clientがclosedである正規API結果と実close呼出returnを別記録し、片方不明ならaudit0。実client/transaction concurrency、driverの待機・拒否分類、両originalcloseの実時間はまだ未検証。候補準備中にこれらを成功として埋めない。

SOURCE/controller/helperの変更0、default/preflight/actual/native/DB/rootprobe/private操作0。追加採用1fileの読取を終了し、ALL read STOP。新ONEは独立候補レビュー後の別Root採用まで未許可。
