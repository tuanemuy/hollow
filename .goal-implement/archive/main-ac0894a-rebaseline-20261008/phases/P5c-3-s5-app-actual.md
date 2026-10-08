# S5 APP7: cases passed, readonly audit failed

Result: whole family FAIL/held at audit-driver-error. APP7 case portion passed; independent review pending. Fixed at 2026-10-06T17:59:23+09:00; execution owner Root.

Sourcee25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42 and helpers runner289777/c257bf79051768fec3707e6c2251769a110c78cef781a981e7c767ae75d4a75e/config389698/8802fd05112faa4a23f235eb6dc5a4299c27da4d4ae1e65da82ec5af3e81e6d9 remain frozen. [WID0/static tool gate](../reviews/P5c-3-s5-test-worker-id.md) applies; source/family APP7 bindings and expected counts remain unchanged.

Root separate direct fullstable/hash of helper2/source1470/21263983B/publiclinks108/publicmetadata108/CF986 PASS, AST compile evaluation0; rootprobe/newRoot/actual0. Existing helper --preflight app returned Python0 {"preflight":true,"executed":false,"database":0,"newRoot":0,"family":"app"}. Root then authorized ONE --supervise app at previously unprobed a184c90e. No replay.

## Selected original safe stdout

This is a selected projection of original Root tool stdout, not a reconstruction of omitted native/private fields.

- Outer actualPythonExit1, ownPythonPG absent, registeredNodePG.app absent, stdoutEOF/stderrEOF/stdoutFDClosed/stderrFDClosed true. nodeTERM0/nodeKILL0/pythonTERMfalse/pythonKILLfalse. fault inner-held, heldtrue, strictClosedGuardfalse, resourceDiagnosticNULL.
- Inner result groupapp/actualExit0/ownNodePGabsent/bothPIPE EOF+FDclosed true/forcefalse/faultNULL/caseCount7/passed7/failed0/afterAll assertions-passed/testForkPID observed-known-absent/testForkPipeEOF observed-stdio1-2-ipc-null/strictClosedGuardtrue/oktrue.
- JSON valid: numTotalTests7/numPassedTests7/numFailedTests0/numPendingTests0/numTodoTests0/numTotalTestSuites2/numFailedTestSuites0; seven passed states/reportedSuccess true.
- Reporter valid/run-end/callbacks24/hookStarts3/hookEnds3/ready7/result7/skippedReady0/skippedResult0/sameIdentitytrue/errors[]/runReasonpassed.
- Original stockfork valid/normaltrue/attempts1/handles1/pidKnowntrue/connectedInitiallytrue/exitNULL/signalSIGTERM/actualClosetrue/absenttrue/requestedStoptrue/termRequestedtrue/killRequestedfalse/stdinFinishfalse/stdinClosedtrue/two readableEOF+close true/disconnectedtrue/channelReleasedtrue/ipcEOFNULL/ipcFDClosedNULL.
- Native ledger valid/version1/groupapp/workerAttempts0/workerActive0/workers[]/ownerattempts0/ownerhandles0/restoredtrue/observerFaultfalse/normaltrue; actualNodeBindings2. Inactive owner false/NULL detail fields are not native closure receipts.
- Inner auditNULL/heldtrue/fault boundary-or-phase-failed/diagnostic stageaudit-fieldreadonly-audit-faultEnumaudit-driver-error. VolatileMissing0.
- Outer volatileMissing outer0/inner0/combined0 and unchanged128/128/256 caps. Outer diagnostic outer-summary/normal-gate with faultEnumNULL; outer fault/held above remain authoritative.

## Interpretation and limits

Seven exact TestCase ready/results/pass and source afterAll assertions are observed through the same fixed Reporter/JSON/ledger gates. Original stockfork requestedStop SIGTERM and physical close/readable EOF differ from outer force; supervisor sent no TERM/KILL. IPCNULL/stdinFinishfalse remain explicit. Source/clientcheckpoint/afterAll assertions do not by themselves prove native database FD closure.

The inner result normal gate passed before audit. The later readonly audit threw a driver-specific error and returned auditNULL; thus the whole family normal/finalstrict gate did not pass. No FK/integrity/row count/native-close/readonly audit success is inferred. The enum does not identify a SQL statement/error.message/code or source exception. Raw body/message/stack/SQL/proof/key/log remains unread and is not saved. Any opaque/audit copies or audit connection states are not inspected after receipt.

Current expected rows remain source-derived account1/workspace0/notes-originals-slots7/jobs14/machine succeeded2-failed4-cancelled1/revisions11/live-memory-pin0/LLM-preview-quota-dispatch0. They were not adjusted to actual database values. The audit-driver-error is not evidence of business row mismatch, FK corruption or SQLite closure cause. APP7 assertions use contract/fake codec paths; genuine parser/native input/proof ACK/source race/resource undo/full feature UI remain independent unproven conditions.

## Permanent held scope

New a184c90e APP validation root and all DB/sidecars/opaque/audit/records/results/cache/objects/TMP contents are permanently nonoperative: no stat/read/hash/copy/import/rerun/cleanup after receipt. All earlier private roots including PURE341 and successfulPURE6074 remain nonoperative. Only fixed PUBLIC helper/source/schema/static bindings and this safe report may be read for next classification.

Main/product/helper/source e25 unchanged; no external/audio/D01/UI action. Native/native-d1 remain unexecuted. Next step is independent safe-result and PUBLIC audit/schema static comparison; no automatic new actual/root/helper change authorized. S5 criteria/global done states unchanged.
