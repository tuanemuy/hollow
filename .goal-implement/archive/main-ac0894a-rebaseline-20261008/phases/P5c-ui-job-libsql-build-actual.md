# P5c UI job browse4 build actual result

Result: FAIL/held. Sole actual failed before the built/closed control frames. Cause remains UNKNOWN. No new source/output/build manifest is accepted. Fixed at 2026-10-06T17:42:15+09:00; execution owner Root.

## Fixed candidate and prior gate

Current runner 25775B / ec269455b0af834c037c7ef76672cf5497316044c89f87d25615da6332d9c1ab; driver9182/fab719add4dc74f1f9a53121a61b9033b93a6562cd47375a989aefb8125b7617 and packed117081/be5f62d1617cf269d6bfb0f384d70fbe7b9b038f9b5ba8c9f823ab9e2b57ba5d. [GitPG correction](P5c-ui-job-libsql-build-gitpg.md) and [independent static PASS](../reviews/P5c-ui-job-libsql-build-gitpg.md) bind the candidate.

Root separately full-read/stable-hashed the three helpers, original candidate phase, correction phase and two reviews (7 files); parsed the packed payload/source327 records, directly full-read/full-hashed707 declared dependency files13984808B and checked10 canonical aliases plus pinned Node/Git metadata. Helper Python AST compile did not evaluate the helper. This direct gate returned publicPrecheck true / gitReader0 / executed false / rootProbed false / created false. Source327 immutable blob bodies were then checked by the existing default preflight through its bounded PUBLIC Git reader.

Default command: pinned Python3 -I -S followed by the fixed public p5c-ui-job-libsql-build.py, argv empty. Exit0:
{"schemaVersion":1,"preflight":true,"executed":false,"rootProbed":false,"sourceCreated":false,"database":false,"sourceFiles":327,"sourceBytes":1920009,"dependencyFiles":707,"dependencyBytes":13984808,"entries":4}

Root then authorized and invoked ONE same helper with --run. No auto-retry or second actual. Tool call duration about0.299s, Python exit1. Duration is tool timing, not fabricated native completion metadata.

## Complete safe stdout borrowed from sole Root execution

{"schemaVersion":1,"executed":true,"normal":false,"held":true,"nodeExit":-15,"knownPGAbsent":true,"pipeEOF":[true,true],"controlEOF":true,"fdClosed":[true,true,true,true],"force":true,"signals":{"TERM":"sent-success","KILL":"not-attempted"},"rawDiscardBytes":[0,906],"frames":[{"event":"header","schemaVersion":1,"entries":4,"nativeWorkers":0,"database":false},{"event":"service","registered":true,"count":1,"stderr":null,"observation":"after-start","actualOwnedPGMatch":true},{"event":"held","kind":"UNKNOWN"}],"databaseAudit":false}
{"schemaVersion":1,"normal":false,"held":true,"kind":"UNKNOWN","databaseAudit":false}

This safe public projection supports header arrival and the registered same-service handle/known owned PG match. It does not prove Worker absence beyond the policy field, native addon permission, service actual exit/stdio closure, output membership or successful build. Service stderr is explicitly NULL. Node termination by supervisor TERM is force, not graceful service closure. Outer knownPG absence, two actual PIPE EOF, control EOF and four actual FD-close flags remain separate from native-service closure.

Raw stdout0/stderr906B were discarded by the helper. No raw body/error.message/stack/SQL/proof/key/log was read or retained. No source exception or earlier UI Node-6 cause is inferred from the UNKNOWN enum. The built/closed normal frames and outputmanifest gate were absent; databaseAudit false is appropriate.

## Permanent held scope and continuation

The newly generated SOURCE /Users/hikaru/github.com/tuanemuy/hollow-ui-job-source-79ef126e-20261006, BUILD /Users/hikaru/.local/share/hollow-validation/goal-implement-ui-job-build-20261006-a0632bfd and its -toolTMP are permanently nonoperative after receipt. No stat/read/hash/copy/import/rerun/cleanup of those roots or contents is authorized. All earlier success/failed/private roots remain nonoperative.

No working main/P5d/S5 product bytes changed. No DB/job/account/upload/native addon/browser/UI acceptance follows from this build attempt. Required next step is independent safe-result/static-source review; any later source-only classification reads fixed PUBLIC helpers and original immutable source/dependency code only. No automatic new root/actual is authorized. Full feature conditions remain unchanged.
