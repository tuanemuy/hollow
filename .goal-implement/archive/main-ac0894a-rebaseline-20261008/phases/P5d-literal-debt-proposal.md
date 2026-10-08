# P5d literal debt2 最小family提案

## 結論

次の最小候補は LD01: 正規native Drive authorizationのresources0 failure三件で、Cは正常whole終了、A/Bは元whole caller終了直前を有限保持する。workのnative closedと元native ACKは成立していてもcaller pending中は退会用opaque receiptが発行されず、正規退会sweepがA/Bのliteral debtを2件作る。Cの他row回収、実final EXISTS拒否、元caller解放・genuine receipt保存/同値読戻/消費・同intent再開/debt0→succeededを単一caseで検証する案である。

この案は「literal debts2」「caller未終了」を対象とし、unknownまたはdurable credential ACKfalseを同時成立と呼ばない。これらを一つのcaseへ束ねない。実装・actualはRoot別採用が必要。現source548a8fefe53444ff6ee032fb9e22be7d7f9efbf2／source92 cb5ef0912a6f7d91a76bd462bac25eb2a15dbb059fffbdddc3ee7999c577e2e7、helper/既phase43265/34aac・旧40157/ce941・mainは変更0。全success/failed private非操作、source import/DB/runtime/root probe0。

## literal producer と既局所根拠の区別

`packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts` の正規step→cleanupPage→cleanupCopy→private blockが実literal INSERTを行う。公開repoにdebt insert用portはない。blockは当該実rowからtable/id/version/runtime/token/cancelGeneration等のlocatorを同Txで作り、intent/kind/ownerId/locatorの一意キーでon conflict do nothingとする。source-attempts/source-bindings、Drive attempts/controls/transfers/heads/jobs/targets/records/connectionのheld枝が呼ぶ。全INSERTはこのproducerだけ（同public application/repository限定検索）。

credentialSourceHeldやcredential-usesのactive/unknown/ACKfalseはfalseを返して個別rowを保持するがblockを呼ばない。従って先のEF01 genuine credential-use義務2はliteral debts0だった。0044のdebt tableはintent FK/形状CHECKを持つが、形状合法なテストINSERTはgenuine閉鎖や業務producerではない。LD01ではdebt SQL INSERT・public recordrepoへの手製owned行seedを使わず、元normal begin/claim/native execute/delete/sweepから生成する。

## LD01 原経路とproof obligations

1. 新DB1/正式migrate/createHollowContainer、verified account1/browser1/session1、正規 `createNodeDrive` を使う。same canonical DB pathと新runtime directoryの実 `acquireDriveRuntime` をfactoryが実行し、返った同ownership object→NodeDriveExecutionのnative retirement capabilityへ結ぶ。constructor fake/default predecessor・文字列generation・proof clone・manual brandは使わない。normal config/keyring/AES32とCoordinatedObjectStorageの空owned object directoryを新有限rootに置く（objects0、source/record/note/WS seed0）。factory storageの公開withOwner/openOwnedRandomRead契約を満たし、実objectIOは0とguardする。
2. 正規driveFolderConfirmationと現在connection epoch0/settingsVersion1から、`beginDriveAuthorization` をC/A/Bの3件だけ作る。stateは返却authorization URLの元stateをmemoryで取得、command・browser・account・confirmation・versionを正規値のまま使う。Google identityは不要、chooseAccount true。native authorization URL生成は公開code上ローカルURL組立で、外部DNS/HTTPを行わない。URL/secret/body/IDを報告しない。
3. Cを先に正規 `exchangeDriveAuthorization(...,{state,code:""}, services.runtimeGeneration)` で正常完了させる。NodeDriveAuthorization.exchangeのempty-code拒否は元DriveTransportError DRIVE_UNVERIFIED、HTTP.read前でresources0。nativeexecution run→workEnded/resource0の元local-close proof、executeDriveAttemptの正規closed保存→acknowledgeSaved→元native ACK→withCaller finallyのcallerEnded→native acquired-owner opaque retirementreceipt発行を保つ。返値phase failedを確認し、provider outcomeをunknownへ改変しない。
4. A、次にBを同normal callbackで進める。test fixtureの同実execution.public withCallerメソッドへのtyped委譲wrapperで、元this/target/claim/settleの値をそのまま渡し、元settle結果をawaitした後・同settle callback return直前だけexact A/Bの各gateを待つ。元withCaller finallyはまだ実行されずcaller pendingである。元settle内部のcoordinate("settle")はこの時点で解放済みで、maintenance laneをgateで塞がない。private Map/WeakMap、acknowledge/observe、proof/caller終了状態の書換0。元methodはfinally復元、両gateは各5秒以内、case40/native既30+5 deadlinesを変更しない。
5. A/Bの保存owner closed、元native caller pending、retirementreceipt無しをPUBLIC元APIでmemory assertする。native ACK済みとdurable retirement ACK receipt不存在を区別する。AがclosedになってからBをclaimするためDBのaccountOwners1を破らない。NodeDriveExecutionはcontrol lane2/全entry3上限なので、C完了後のA/B2だけ保持する。3caller同時実行を要求しない。
6. normal deleteAccount→deleted anchor/auth fence・session拒否・sameintent queuedを確認。normal sweepはclaim前saveDriveAcknowledgmentsを行う。Cの元receiptはnative verify→saved exact row→同値read→consume、A/BにはcallerEnded receiptがまだないため保存しない。明示lookupが欠測でもreceiptを合成しない。
7. drive-attempts cursorまでnormal wake。A/B/C三行のpage25はexpected progressed1/blocked2。A/Bはclosed ownerなのに元tuple durable ACK rowがないためcleanupCopyがprivate blockを呼び、kind drive-attempt、same intent、exact ownerId/locatorのliteral2を正規INSERTする。row locatorと元row tupleはmemoryで照合し、報告は件数/固定boolだけ。Cは正規receipt保存済みなので回収・matching debt解除へ進む。再走査時の同blockはidempotent。debt不存在をnative never-owned/closedに読み替えない。
8. 正規current table順を維持してverifyまで進める。global residualはliteral2、A/B attempts、ACK未保存によるaccountHeldで非空。expected実verify progressed0/blocked1/finishedtrue→sameintent waiting-owner/personal-notes/cursorNULL/leaseNULL/version+1/nextAttempt+2000、succeeded0。pageのafterIdはblockedを含むページ末尾へ進み、次周期に初期cursorへ戻る。UUID順に依存しない。手動cursorforce・verify単独直呼・resume skip0。
9. 元gate二つをreleaseし、元callback二つのactualreturnをawait。元withCaller finallyのみがcallerEndedへ進め、workEnded/resource0/nativeACKの全条件からgenuine retirementreceipt二つを作る。testは元private receiptの公開verifyと同元target・既記録receipt/proof identityをmemoryのみで確認、発行/clone/JSON化しない。通常早期wakeでsame saved waiting intent不変、logicalclock2001の一度だけ前進後、normal sweepのpreclaim save/read/consume→drive attempts正規DELETE/unblock→matching receipt回収→同intent final verify0/succeededを確認する。
10. debt2→0、attempt3→2→0、durable Drive ACK receipts0（最終回収後）、private pending retirementreceipt0、deleted anchor/current fence保持、never-linked Drive connection secret/folderNULLを確認する。verifyの直接 `EXISTS(account_deletion_debts WHERE intent_id=...)` を検証対象にし、rowがなくなっただけで成功へ飛ばさない。nativeclosure/callerEnded/ACKを無seed zero表から補完しない。

## source上の重要条件・不明点

- `application/integration/drive/connection.ts` begin/exchange/adopt、`runner.ts` owned/executeDriveAttempt/acknowledgeSaved、`adapters/node/drive/{factory,authorization,execution}.ts` が元producer。execution.retainAcknowledgmentはnative acquired ownershipかつnon-source限定、caller pendingではacknowledgeがentryを消さず、withCaller finallyがcallerEnded時にのみretainする。
- `adapters/libsql/repositories/driveRepository.ts` claimはpending/version/current/expiry/cancel0とactive/unknown held数を照合。closed Aを保持したままBを順にclaimする点が必要。元constant accountOwners1を拡張しない。
- `application/account/deletionWorker.ts` saveDriveAcknowledgmentsはmaintenance laneと25drain/read/consume、claim前順を保つ。原callersはlane外gateであることを候補codeの独立レビューで確認する。method wrapperがtype-safeな公開generic委譲を表せなければ実装前にRootへ通知し、as/cast・private overrideで通さない。
- `accountDeletionRepository.ts` drive-connection選択はcredential/folder非NULLだけ。初期unlinked NULL connectionは選択されず追加connection debtを作らないためliteralちょうど2を狙える。既connected/legacy secretを新利用なしとして回収するテストではない。
- cleanupCopy正常DELETE後はunblockが同intent/ownerId/table locatorを削除する。verifyはdebt EXISTSと全residual＋accountHeldのORでsuccessを拒否し、同version/token CASで状態更新する。origin欠測をclosedとしない。
- PUBLIC static案であり、native Drive factoryの新config/bootstrap/owned FS guards・typed withCaller wrapper・全pageがgate5秒内に達する実時間は未検証。既EF01の短時間結果をDrive実時間保証へ代用しない。deadlineで失敗ならheld、延長/retry0。normal factoryは新native ownership/FSを必要とするので既EF01 helperの資源0 setを勝手に拡張しない。

## unknown / ACKfalse を別familyにする根拠

| 状態 | genuine producer候補 | literal debtとの関係 / 未成立条件 |
| --- | --- | --- |
| Drive closed/workEnded + native ACKtrue + caller pending | 上記normal empty-code callback、元withCaller settle返却後だけ保持 | LD01でliteral2正例を狙う。durable retirementreceipt未保存をnative ACKfalseと呼ばない |
| Credential closed/callerEndedtrue/acknowledgedfalse | 既CR05の元acknowledge awaittrue後Tx commit前throwで実rollback、genuine same private proof保持→faultoff正規recover | genuine ACKfalse局所は既受入範囲を借用し再演0。credential row自身はliteral INSERTしない。persistent fault中はrecover-beforeclaimがthrowしintent未claim、そこで他row進行やcursor到達を主張しない |
| Drive active/unknown | 元native runのworkが実未終了、operation30秒→close5秒実未閉鎖、executeDriveAttemptがsame runtime/tokenのowner unknownを保存する経路 | 正例には元workがまだ終わらない有限producerが必要。resource0 empty rejection単独は直ちに閉鎖するのでunknownを生成しない。30+5秒とcase40で残5秒しかなく、literal2+全resumeを同caseへ束ねる案は今採用しない。unknown二件を同accountでclaimするのもaccountOwners1に反する。separate future case/account2または別正規前任回復sliceをRootへ再提案 |
| Credential unknown | withCredentialUse finallyで元closureがnullのときのみsame target markCredentialUnknown | resources0の元callback終了時はNodeCredentialUses finallyがended/resource0→genuine proofを作る。OR10秒timerはabortのみで元workをraceして返さず、単なる長いgateをunknown正例にしない。native HTTPはrequest/response/socket実closeをawaitしてからresourceをreleaseするので、timeoutをactualcloseへ代用しない。別real native resource/前任provenance scopeが必要 |
| synthetic unknown/ACKfalse record fixture | 公開repo型のinsert/replaceで合法shapeをseed | durable fixture guard countercaseに限り可能な案。native admission/actualowned callback/closed proof producerではない。今回LD01では使わず、これをgenuine unknown受入へ数えない |

将来、LD01でliteral2が正規生成された後に別OR ACKrollbackを同DB/accountで重ねる案は可能性として留める。Drive2/OR1のnamespace・config/key/owner増加とrecover-beforeclaimでの全intent停止を別採用する必要があり、literal2保持中の他row進行とpersistent ACKfalseを同時要求して契約を弱めない。今回の次oneunitに含めない。unknown保持の実native HTTP/stockTLS loopback dialや前任acquire-confirmed crash正例も別formal scope・listener/socket/key/child budgetsなしには開始しない。

## 次candidate exact scope / finite plan

提案するsource変更は新 `packages/core/src/adapters/libsql/__tests__/accountDeletionLiteralDebt.integration.test.ts` と新 `.../accountDeletionLiteralDebtFixtures.ts` の2pathのみ。既fixture/product/DDL/ports/helper/reportは不変。current source92＋2でfuture94になる予定で、採用時にRootへexact manifest差を固定する。main public新工具は `.goal-implement/helpers/p5d-literal-debt-runner.py` と `p5d-literal-debt-loader.mjs` の2path、候補報告は別実装phase新1を提案する。元reviewed PUBLIC helperをregular/nonlink/fullhashで固定読取してから比例導出し、古いprivate材料をimport/reuseしない。現段階作成0。

資源案: fresh memory予約だけ（まだliteral/absenceprobe/生成なし）、root1 192MiB、DB1 sidecars込み32MiB/sum64、account1/browser1/Driveattempt3、native Drive owner1 JSON/temp/lock各finite16KiB、config/keyring合算16KiB/AES32bytes1、objects0/notes0/WS0、TLS/HTTP/DNS/nativeWorker/businesschild0、toolNode1/stockfork1、TMP8MiB/output2MiB/material256KiB/40safe frames、case/hook40秒/body180/suite180/outer240 sharedTERM10/KILL10/PIPE10内、guard200ms、gate5秒各2、native factory operation30/close5不変、normal wakes総64、logicalclock2001一回。工具config/runtime/keyring FS許可set追加は別exact reviewを受ける。

最終auditはallcase/file/afterAll実Driveexecution.stop/passwordHasher.stop/client.close、stockfork実exit/close/EOF、NodeとPython0、ownPGabsent、両PIPEEOF・独立stream.close flags force0を全成立させた場合だけ同DB1readonly query_only/FK/integrity/targetedanchor+intent succeededverify/debt0/attempt0/ACKreceipt0/neverlinkedsecretNULLへ進む。追加DB0。non0/force/unknown/diagnostic/欠測はaudit0・rootheld・同物read/stat/hash/copy/import/retry0。safe enum/count/boolのみ、locator/IDs/proof/body/secret/SQL/error.message/stack出力0。

Criteria P5d-Eのcaller未終了中回収拒否・fence、P5d-Fのliteral複数debt中他row進行/最終EXISTS拒否/同intentresume、P5d-Gの正式DDLと回収FK/auditの局所対。P5d-A〜H全体、legacy/Google/65/67/copy/UI/unknown/native HTTPpositive/ACKfalseをLD01成功で補完しない。既F02/EF01/CR/HTTP局所受入の再演は0。

本PUBLIC proposalだけwx600新規固定し、全reader/writer/runtime停止。Root別scope adoptionと独立candidate review/ONE採用までsource/helper edit・actual・新root/DB/key/config生成0。
