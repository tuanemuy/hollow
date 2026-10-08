# P5d next E/F slice: Drive ACK未確定 → exact正常ACK → 同intent再開

次の最小oneunitを **DA01: saved-closed/caller-endedの元native proofに対するACK呼出直前fault** とする。ACK APIはPromise<void>でありfalse返値を生成・期待しない。public unacknowledged/closureが元proofを保持しretirementreceipt未発行の枝を「未ACK/ACK未確定」と区分する。unknown、HTTP実通信、credential durable ACKfalseの受入には数えない。

Rootが受け入れたLD01はworkclosed/callerpending/nativeACKtrue/literal2の局所正例。DA01はcaller endedだがoriginal native ACKが未実行という独立条件を狙う。現SOURCE `040b07cf6ad18c08a2137535b34613adde2ba1d5` / source94 `a293920f3546ca927fda68a7fd834064451fc3ff5fe0321462f83e13fdc57f21`、既source/test/fixtures/helpers/受入報告を変更しない。今回の作業は公開sourceの有限静的読取と本proposal新1pathだけ。actual/default/source import/DB/key/root probe/create/socket/external0。全旧success/failed rootsとLD01成功63a/TMPは永久非操作。

## 完成条件との対応

- P5d-E: 保存owner closedだけでACK済みと推定せず、元local-close proofが未ACKの間の退会回収/新利用を拒否する。通知throwがfenceを復活させない。同じtupleの正規ACK・opaque retirementreceipt保存/同値読戻後だけ回収へ進む。
- P5d-F: literal debt1保持中にも正常C rowを進め、final debt/attempt/accountHeld EXISTSが残る間はwaiting-owner/succeeded0。同intent/version/cursor/leaseを通常claim/step/releaseだけで回復する。51/page25は既F02局所と区分し、新caseで51履歴を再演しない。
- P5d-C/G: deleteAccountの正常受理とcurrentUser/normalbegin fence、旧row正常reconcileのexact cleanup例外を保ち、normalactive条件や保存guardを緩めない。

## 公開producerと元能力

| 公開path/入口 | 元sourceの因果 | DA01で使う条件 |
| --- | --- | --- |
| application/integration/drive/connection.ts:beginDriveAuthorization / exchangeDriveAuthorization | 正規browser/session/command/currentconfirmationを照合しnormalclaim。exchangeは同factory execution.withCaller→executeDriveAttempt→adopt→最終UoW。 | C/Aの異なるnormalcommand2だけ。stateは返却URLの元値をmemoryで利用。empty-codeはinternal application callback入力で、外部transport正常入力とは区分する。 |
| adapters/node/drive/authorization.ts:exchange | empty-codeが元DRIVE_UNVERIFIEDでtoken HTTP.readより前にreject。 | original providerそのまま、resources0。fake authorization work/HTTPS function/globalDNS override0。 |
| adapters/node/drive/factory.ts:createNodeDrive | canonical DB path、acquireDriveRuntimeの元returned ownership object、NodeDriveExecution同object/native factory、元provider/protectorを接続。 | 正規native acquire-before-useを使い、constructor/fake owner/clone/generation文字列だけでreceiptを作らない。 |
| adapters/node/drive/execution.ts:run/observe/withCaller/acknowledge | workEnded＋resources0だけで元local-close proof。withCaller finallyはsettle throwでもcaller endedを設定。acknowledge未実行なら元entry/proofを保持。 | workclose/ACK/caller終了の順序を合成しない。heldをabort/deadline/stopでclosedへ代用しない。 |
| application/integration/drive/runner.ts:executeDriveAttempt / acknowledgeSaved | 元result settle UoWでowner closed/terminalfailedをcommit → closure取得 → same row closed/generation-token saved-readをawait → original execution.acknowledge。 | 最後の元ACK method entryのみfault。保存をrollbackした、ACKfalseを返した、ACK後応答喪失だったとは呼ばない。 |
| 同runner.ts:reconcileDriveClosures | maintenance laneでoriginal unacknowledged proofを列挙。local-closeならcaller ended必須。sameDriveOwner閉鎖tupleをDB再読し、既closed rowは書換せず元acknowledgeへ。 | 元proofそのもの/同entry/evidence/target/runtimeGeneration/tokenを保持し、deletedactorの一般late採用を迂回しない。closure用の既closed exact例外だけを使用する。 |
| application/account/deletionWorker.ts:sweepAccountDeletions | intent claim前saveDriveAcknowledgmentsはgenuine receiptだけ25drain/save-read-consume。Drive unacknowledged proofを勝手にACKする経路ではない。credential回復は別。 | faultonでA receiptなしを保持しつつC receiptを正常drain、通常intentページへ進む。credential recovery-beforeclaimのfaultを迂回しない。 |
| adapters/libsql/repositories/accountDeletionRepository.ts:cleanupCopy/accountHeld/block/verify | active/unknown又はclosedにexact durable ACKなしならblock。blockは元rowからliteral locatorをINSERT。verifyはdebt/attempt/ACK/accountHeld residualをORで見る。 | handcrafted debt/ACK/closed SQLwrite0。未ACKAを実producerからliteral1へ。通常C回収progress1、A blocked1、最終waiting。 |

createNodeDriveの退会receipt発行はisAcquiredDriveRuntimeに束縛され、retainAcknowledgmentは元native-onlyprivate registryへreceiptを登録する。retirementreceiptのproofは元ACKproofからfreezeしたcopyなので、両proof objectを同一objectと捏造しない。original ACK引数のidentityとretirementreceipt自身のprivate registry identityは別々に確認する。

## Exact fault contract

将来fixtureで original execution.acknowledgeを元functionとして保持し、methodの同this/args/正常return semanticsを全non-target callで透過する。target Aのみ、元acknowledgeSavedから渡された元local-close proofのmethod entryで `NativeAckBeforeInvoke` sentinelをthrowする。throwは **exact saved-readを元UoWがawait済み／original ACK未呼出** の境界に限定する。通常claim/work/settle/withCaller finallyは無変更。

fault fixtureの追加能力は無い。元typed `DriveClosedProof` 参照をmemoryに保存し、closure(target).proofとunacknowledged内参照が同一object、target kind authorization/id/元generation/token、owner closed rowの元tuple/terminalfailed/version/cancelGenerationが一致することをmemoryで確認する。型cast/readonly書換/privateMap/ブランド作成/返却proof/返却bool/偽native resource registration0。

- 初回A callback: 保存closed/DRIVE_UNVERIFIEDは正常commit済み、faultはnative ACK前にthrow。outer callback promiseは元sentinelでreject、withCaller original finallyが完了後caller ended。unacknowledged A1、closure closedで同proof、retirementreceipt A0、native ACK invocation A0。
- faulton recovery countercheck: 正規reconcileDriveClosuresを一回だけ呼び、元DB exact closed再読後の同proof ACK entryで同faultをthrow。元row/proof・debt・intentの全文が不変。normalSweepのcursor操作やmanual consumeへ置換しない。
- faultoff: 正規reconcileDriveClosuresを一回だけ呼ぶ。元same proofをoriginal acknowledge.call(execution, proof)へ渡し実await、caller ended/workEnded/resources0を元nativeが確認して元acquired retirementreceipt A1を発行。original ACK正常invocation A1、unacknowledged A0、caller untracked。sentinel後のcatchから偽成功を返さない。

fault throwsはsourceexpected2（callback1＋faulton normal recovery1）、original native ACK total2（C1＋faultoff A1）。知らないtarget/2回超fault/別proofならcandidate失敗held。公開APIACKのfalse値を作らない。初回callback/正常recoveryの元errorはsame objectでassertしrawmessage/stack/cause/privatepayloadを出力しない。未知errorや早期nativeclose欠測はそのまま失敗として別候補へ戻す。

## One finite scenario

1. 新fresh DB1にnormalaccount/session/browser1を作り、initial Driveconnectionを正規ensure。正規createNodeDrive/acquire/protector/storageを使う。normalbegin C/A2の正常commitでsource-derivedconnection version3（1+2）、epoch0/credentialNULL/folderNULL。実値からexpectedを作らない。
2. Cを先に元empty-code callback whole終了。元ACK/retirementreceipt C1を保持する。これは新familyのfairness対照rowであり、既LD01 testを再実行するのではない。
3. A normalcallbackをtarget faultonで完了させ、promise rejectをawaitして元finally caller endedを確認。savedA closed/terminalfailed、元local-close proof exactlysame retained、ACK未実行/receiptA0をmemoryassert。pending callerで止めるLD01と区分する。gate/新long timerは不要。
4. normal deleteAccount accepted、deletedanchor/authVersion/currentUser NULL/normalbegin拒否。callbackthrowが受付前のactorfenceを取り消さない。begin3回目を成功させずattempt上限2を維持する。
5. normal sweepのC receipt save→同値read→consumeを確認後、drive-attempts page25に達する。pageはC progressed1/A blocked1。A literal debt1はoriginalblock producerが元row locatorから生成。C row不存在、A同savedrow/tuple/proof/ACKreceiptなし・sameintent debt1を別assertする。node private pending proofをDB不存在から作らない。
6. 通常26cursor一巡でverify progress0/blocked1 → sameintent waiting-owner/succeeded0。debt1/残A/originalunacknowledged1が維持される。元state/version/cursor/lease/nextAttemptAtを正常APIからcaptureし、faulton normalreconcile一回reject後に同値assertする。ここでliteral debtがあるからといってprovider secretの一般closureを主張しない。
7. faultoff normalreconcileが元sameproof ACKを実行する。元genuine retirementreceipt Aをverify trueで取得、元proof tuple/evidence/sourceと照合。receipt自身のobjectを保持し、sweepがexact DB保存/確定read後に同receiptをconsumeする。ACK実行だけでdurable ACK保存済みとは推定しない。
8. nextAttemptAt未到達のnormal sweep一回はACK drainだけ進み、sameintent waiting/version/cursor/leaseとliteral debt1不変。receiptAは元verify falseへ、同receiptの消費channelを確認する。
9. logical clock2001後normalclaim/sweep再開。sameintent A cleanup/unblock、durable ACK cursor回収、最後debt/attempt/ACK/accountHeld EXISTS空を条件にsucceeded。attempts2/debt1/ACK2→0、origin/use/provider秘密はnever-seeded0、Drive unlinked空shell1はsource-derivedversion3を保持する。guardは同ownerの元privateproof確定だけを用い、unknown/legacyをclosed推定しない。
10. 元execution.stop/passwordHasher.stop/clientclose/stockforkclosed/NodePGabsent/PIPE EOFと独立実FD4flags/force0が正常揃った後だけsameDB1 readonly query_only/FK/integrity/targetedseedcounts/actualclose。欠測・diagnostic・unknown・forceはnormalaudit0、rootheld。

26cursor×2＋not-due drain1でnominal53normal sweeps、hard64wakesを維持。reconcile calls2はnormal sweepとは別にexact有限2。この計数はstaticで、actualprojectionは実行候補の監督frameが受領するまで未観測。通常page25とsameintent keyset/lease/token CASのまま、cursorforce/任意claimskip/期限拡張/旧root再開をしない。

## Future exact scope and resource budget

現段階は本proposal1pathだけ。採用する場合の最小candidate案:

- isolated new `packages/core/src/adapters/libsql/__tests__/accountDeletionDriveAcknowledgment.integration.test.ts` と `accountDeletionDriveAcknowledgmentFixtures.ts`。
- PUBLIC new `.goal-implement/helpers/p5d-drive-ack-runner.py` / `p5d-drive-ack-loader.mjs`。元PUBLIC LDhelperをfullstablehashで導出し既helper/受入caseは不変更。future source94＋2=96、正確なmanifestはcandidateで固定する。
- PUBLIC new `.goal-implement/phases/P5d-drive-ack-implementation.md`。
- 製品/ports/schema/migration/repository/config/sharedcontract変更0。existing normalreconcile APIはtypedpublic。型安全なexact method delegationが書けなければ実装前にManagerへ不足を通知しcastへ逃げない。

memory-only fresh候補名 `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-drive-ack-20261006-5b8bc230` と派生 `-tool-tmp` を提案する。まだRoot採用・probe・生成0。旧rootを再利用しない。

| Resource | Proposed bound |
| --- | --- |
| DB/root | 新DB1/sidecars≤32MiB/formal合計64MiB以内/root192MiB |
| business | account1/browser1/attempt2/native entry max1 after sequential C→A/retirement receipts and durable ACK max2/literal debt1 |
| work | original native work resources0、controlLane2は元上限・同時work1、factory operation30s/close5s、gates0 |
| normal progression | page25/64wakes/logical2001/reconcile2/selectedfaultthrows2 |
| deadlines | casehook40s/suitebody180s/outer240s内共有TERM10/KILL10/PIPE10/guard200ms、未知で延長retry0 |
| children/IO | toolNode1/official stockfork1/cacheFsfalse、businesschild/Worker/HTTP/DNS/socket/TLS/listener0 |
| owner/config | native Driveowner1record/temp/recovery合算16KiB、AES32B/config＋keyring16KiB、emptyobjects0700＋writer-owner600≤256B/recovery600empty、normalrecoverOwners Tx1 |
| copies never seeded | WS/note/objectpayload/objectread/write/credentialuse/origin/adoptedprovidersecret0 |
| tools | TMP8MiB/output2MiB/frames40/material256KiB、exactDrive/Storage FS cap setsのみ、root-prefix grant0 |

有限資源はRootがcandidate scopeを別採用してから固定する。新nativehandles/capability/networkは不要とsource上判断するが、normal native acquire/metadata FileHandleとowner directoryはactual候補で実閉鎖条件を維持する。dispose/stop APIのないstorageに一般FDclose receiptを合成しない。

## Unknown and remaining gaps

true owner unknownをresources0 empty-code＋ACK前throwから作らない。Node runの結果失効時にもwork/resource closeが未成立であるか、HTTP原登録resourceの実request/response/socket close遅延、又はacquire-confirmed前任exitの元capが別に必要である。単なるtimeout/abort/unknown文字列/TTL/PID不存在/newowner代行ではclosed proofを発行しない。現smallest DA01はACK未確定だけに限定し、unknown専用native handle/loopbackTLS/child資源計画は未採用のまま。

credential ACKfalseの元saved-CAS rollbackは既CR局所、回復前claim拒否はその契約を保つ。DA01のDriveACK method未呼出をcredential DB acknowledgedfalseやaftercommit trueの応答喪失と混ぜない。legacy/cutover/nativeHTTPpositive/fullcopy/65/67/Google/全P5dA–Hも未完。今回新実装や実行を始めず、独立plan/source reviewとRoot正式candidate採用を待つ。

本proposal固定後、全PUBLIC読取/全writer/runtime STOP。Manager文書/goal/spec/spec-implement/追加agent0。
