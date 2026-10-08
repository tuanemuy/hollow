# S5 PURE sole actual independent safe-result review

判定: **actual FAIL/held、pure4未成立**。別に、公開sourceから起動契約の矛盾 **S5-WID0** を確定した。今回のactual exception/throw箇所はUNK2026-10-06T08:48:28.057151+00:00Nのままであり、その矛盾を実失敗原因の観測へ補完しない。追加actual・root再試行は未許可。全対象読取を停止した。

検証時刻: 2026-10-06T08:48:28.057151+00:00

## 固定公開対象・借用actual

| 対象 | bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-3-s5-pure-actual.md | 6026 | 334782c0458b7c4ef20d37ce26ec4401ac2256d1f75e10c2843f2796f5130f08 |
| helpers/p5c-s5-test-config.mts | 389704 | 631f4cf095f20fff771c98866e1aa5382daa0173d3918cf9f3e6cde0d72335cd |
| helpers/p5c-s5-test-runner.py | 289768 | 49de11e5187baa63af3eaf44c3f648d3e7d889e9f1eee8cf56f38dd3264100f1 |

公開3ファイルの全文、regular600/nonlink/nlink1/ownUID/canonical、NOFOLLOW前後dev/ino/size/mtime/ctime、全文SHAを直接確認し、末尾で再確認した。製品e25/source1470/d1b9の不変更とRoot公開6/source fullstable precheck PASS、明示pure preflight PASSは固定phaseから借用する。今回は1470/source/dependenciesの全走査やhelper実行を繰り返していない。

Rootが唯一の --supervise pure 一巡で取得したsafe stdout全文を借用する。Verifierがprivate actual root、ledger、logs、DBへ直接接続した根拠ではない。

```json
{"actualPythonExit":1,"ownPythonPG":"absent","registeredNodePG":{"pure":"absent"},"stdoutEOF":true,"stderrEOF":true,"stdoutFDClosed":true,"stderrFDClosed":true,"nodeTERM":0,"nodeKILL":0,"pythonTERM":false,"pythonKILL":false,"fault":"inner-held","inner":{"candidate":"e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42","family":"pure","result":{"group":"pure","actualExit":1,"ownNodePG":"absent","stdoutEOF":true,"stderrEOF":true,"stdoutFDClosed":true,"stderrFDClosed":true,"force":false,"fault":"test-or-closure-failed","caseCount":null,"passed":null,"failed":null,"afterAll":"unobserved","testForkPID":"unobserved","testForkPipeEOF":"unobserved","resourceDiagnostic":null,"strictClosedGuard":false,"volatileMissing":0,"jsonDiagnostic":{"presence":"valid","counts":{"numTotalTests":0,"numPassedTests":0,"numFailedTests":0,"numPendingTests":0,"numTodoTests":0,"numTotalTestSuites":1,"numFailedTestSuites":1},"caseStates":[],"reportedSuccess":false},"reporterDiagnostic":{"presence":"valid","group":"pure","phase":"run-end","callbacks":3,"hookStarts":0,"hookEnds":0,"caseStates":[],"ready":0,"result":0,"skippedReady":0,"skippedResult":0,"sameIdentity":false,"errors":[{"errorClass":"Error","nativeCode":"unknown"},{"errorClass":"Error","nativeCode":"unknown"}],"runReason":"failed"},"testFork":{"presence":"valid","normal":true,"version":1,"attempts":1,"handles":1,"pidKnown":true,"connectedInitially":true,"exit":0,"signal":null,"actualClose":true,"absent":true,"requestedStop":true,"termRequested":true,"killRequested":false,"stdinFinish":false,"stdinClosed":true,"stdoutEOF":true,"stdoutClosed":true,"stderrEOF":true,"stderrClosed":true,"disconnected":true,"channelReleased":true,"ipcEOF":null,"ipcFDClosed":null},"nativeLedger":{"presence":"unproven","normal":false},"ok":false,"diagnostic":{"stage":"node-supervise","field":"supervision","sourceFileIndex":null,"rootMkdirReturned":true,"nodePopenAttempts":1,"nodeHandlesReturned":1,"ownerFramesReturned":1,"pythonPopenAttempts":0,"pythonHandlesReturned":0,"faultEnum":null}},"audit":null,"held":true,"fault":"boundary-or-phase-failed","diagnostic":{"stage":"node-supervise","field":"supervision","sourceFileIndex":null,"rootMkdirReturned":true,"nodePopenAttempts":1,"nodeHandlesReturned":1,"ownerFramesReturned":1,"pythonPopenAttempts":0,"pythonHandlesReturned":0,"faultEnum":"native-failed"},"volatileMissing":0},"held":true,"resourceDiagnostic":null,"strictClosedGuard":false,"volatileMissing":{"outerCount":0,"innerCount":0,"combinedCount":0,"outerCap":128,"innerCap":128,"combinedCap":256},"diagnostic":{"stage":"outer-summary","field":"normal-gate","sourceFileIndex":null,"rootMkdirReturned":false,"nodePopenAttempts":0,"nodeHandlesReturned":0,"ownerFramesReturned":0,"pythonPopenAttempts":1,"pythonHandlesReturned":1,"faultEnum":null}}
```

公式JSONはtests0/suite1failed1、Reporterはready/result/hooks0、sameIdentityfalse/errors2(Error/codeunknown)。required4case、各assertion、fixture、afterAll、setup完了は未成立・未観測。NULLのcaseCount/passed/failed/afterAllをJSONの集計値で補完しない。native ledger unprovenからWorker/child不存在を推定しない。

借用safe根拠ではNode1/ownNodePGabsent、inner両rawPIPE EOF/FDclosed・forcefalse、Python1/ownPythonPGabsent・registeredNodePGabsent、outer両rawPIPE EOF/FDclosed、TERM/KILL0、heldtrue、auditNULL。strictClosedGuardfalseを実終了と混同しない。

詳細stockfork ledgerのnormaltrueは、同actualhandle1、exit0/無signal、PIDknown/absent、actualclose、stdinClosed、両readable EOF/close、public disconnect/channelReleasedを独立記録した局所tool閉鎖根拠として扱う。stdinFinishfalse、IPC EOF/FDnull、aggregate testForkPID/pipe未観測を保持し、詳細ledgerで以前の欠測fieldを遡及補完しない。これは正常suite完了・pure4・nativeproof・S5 F総合合格ではない。

## S5-WID0: 初回task ID 0を正整数guardが拒否する

config21–24行は workerId undefinedを親、definedをsetupとして分岐し、setupで `/^[1-9][0-9]*$/` とpool ID exact1を要求する。このworker ID条件が、固定Vitest4.1.6の正規producerと矛盾する。

直接読んだ公開一次sourceは、既知Vitest4.1.6 packageのdist/chunks/cli-api.B5majYba.jsとinit.D98-gwRW.jsの必要箇所だけである。

| 正規呼出列 | 公開source位置 | 静的値 |
| --- | --- | --- |
| executeTestsでtask用counter開始 | cli-api:3609 | workerId = 0 |
| sorted taskへ割当 | cli-api:3654–3666 | context.workerId = workerId++ |
| 初回runner start | cli-api:3449 | task.context.workerIdをそのまま渡す |
| start message送信 | cli-api:2900–2903 | options.workerIdをそのまま送信 |
| fork側start処理 | init:216–217 | VITEST_WORKER_ID = String(message.workerId) |
| pool slotは別counter | cli-api:3398/3420–3421 | maxWorkers1の初回poolIdは1 |

本familyは単一module/file・maxWorkers1・単一stockfork。正規最初のtask workerIdは **0**、poolIdは **1**。fixture import以前にsetupへ入り、config24行の正整数条件が正規0をS5_SETUP_PHASEで拒否する。このsource列は公開コードから確定できる起動contract defectである。

今回actualのraw exception/message/stack/env/throw箇所は読んでいない。Error/codeunknown・native ledger未観測というsafe結果はこの枝と両立するが、earlier top-level imports等の他throwも区別できない。したがって「今回実際にS5_SETUP_PHASEだった」とは断定しない。

前preflightはinitのenv割当を確認し、正整数guardを妥当扱いしたが、そのproducerの0起点まで追えていなかった。この境界を見落とした。source-static D1製品判定やS5-TG1追加sourceGuardの差分一致は不変更として保持し、共通工具の次actual前にS5-WID0修正が必要とする。

## 必要最小の次candidate

configのsetup workerId条件だけを、採用済み単一file/単一fork/初回taskの **canonical exact0** に合わせる。poolId exact1・execPath/version/group/root・同realm selfsetup・fixture前sourceGuard・元constructor/this/args/Promise・native proof/ACK・全caps/正常PG/EOF-FD/copy/audit gatesは維持する。undefinedの親branchとarbitrary malformed/他worker ID拒否を維持し、test expectationsやrequired4caseを緩めない。runnerはCONFIG_SHA従属1値と固定公開phaseだけを更新する。

新candidate writer停止・全文inverse/hashを固定後、Rootが独立比例preflightを委譲し、その後に別fresh family一回を別途判断する。今回の失敗rootは再使用せず、blind retryを採用しない。本scopeで診断frame追加は必須として要求しない。修正後に別startup欠測が残れば、元known guardの有限enumだけを別提案し、rawerrorや成功合成へ広げない。

## 保全・未検証

S5 PURE expected4 PASSは0。app/native/native-d1は未実行、共通startup・transitiveTS import・resource native閉鎖・D truepredecessor・normalDB/audit・全UIは未検証。Node/fork閉鎖をケース/論理結果/privateproof能力へ昇格しない。root永久nonoperationはRoot報告の保全方針として記録し、Verifierが実領域を観測したものではない。

PURE341ca982/root/cache/records/results/TMPを含む全新旧private roots、成功root/B/key/proof/DB/old dataはstat/read/hash/import/copy/reopen/cleanup/retry0。main、UI、P5d、他worktreeは非操作。default/明示preflight/runtime/Worker/Node/Vitest/helper起動・root probe/createは0。source/helper/product/Manager正本編集0、goal/spec/spec-implement/agent追加0。この新公開reviewだけをwx600で保存し、ALLread STOP。
