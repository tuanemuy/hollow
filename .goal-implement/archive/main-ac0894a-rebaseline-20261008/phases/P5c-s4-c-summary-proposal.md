# S4 C9 summary: PUBLIC-only minimal correction proposal

Fixed 2026-10-06T05:42:18+00:00. 調査・新proposal文書だけを作成、source/helper/config/現actualphase変更0、runtime/DB/rootprobe/新root生成0、failed9f53及び全oldprivate再操作0。現候補C `4cba22b7a62121b32bf72964cd62c15a9774c26f` と9directcase passは維持する。

## Decision

C専用 JSON `assertionResults[].fullName` の期待へ加えた `APP + " " +` を1箇所だけ外す案。正式固定formatterはfileをfullNameへ含めず、suite+titleを半角spaceで結合する。file pathは既独立 `testResults[0].name == SOURCE / APP` gateで束縛済みなので、これを維持すれば正確なmodule+9case identityは弱まらない。

これは公開sourceで確定するconstant contract defectである。実9f53の最初の拒否predicateがこの行だったか、実fullname値が何だったかは未取得・未確認。正常JSON/count9/Node0/Reporterrun-endというsafe観測と整合するが、先行file/status gateの実値は欠測のためactualcauseへ格上げしない。

## Fixed input

|public artifact|bytes|SHA256|
|---|---:|---|
|`helpers/p5c-s4-test-runner.py`|275179|0afb6eaeb90aa1a30dccefd7bb031a278479f3379e3b36f08c3d12484ef69641|
|`helpers/p5c-s4-test-config.mts`|17853|eab9357d0c7b28bcc1da7a85f695f4383f8ead94b5a82a74bf1ffa4d52f8b9fa|
|immutable actual `phases/P5c-3-s4.md`|284518|5e47b20b84be9b04412426a64ea1819bb66e3351445a6a5e61b5c2f4d1cbf5c0|
|own source `llmLocalFormats.integration.test.ts`|60421|874800a10b8f5b35a452f6c7247aeade20cab814c2b777882f39c496493c3b32|

Tools/report paths above are relative to main `.goal-implement`; testsource belongs to `/Users/hikaru/github.com/tuanemuy/hollow-p5c-formats-c2a3d45f-20261006/packages/core/src/adapters/libsql/__tests__/`. Head/source1459 pair5369d9fe/shape b1d1c091/108declareddeps/CFtype/casebodies remain unchanged. Public bytehashes were rechecked without operating any validationroot. Actualphase remains byte immutable.

## Official installed source facts

Vitest public canonical package is main `node_modules/.pnpm/vitest@4.1.6_@opentelemetry+api@1.9.0_@types+node@25.7.0_vite@8.0.12_@types+node@25.7.0_4c045a538af06962bfc9bc6cdc886256/node_modules/vitest`; runner counterpart main `node_modules/.pnpm/@vitest+runner@4.1.6/node_modules/@vitest/runner`. Both installed package.json versions are4.1.6. No import or runtime execution of these modules was performed.

|official public source|bytes/SHA256|relevant definition|
|---|---|---|
|Vitest `dist/chunks/index.UpGiHP7g.js`|151531 / cdafaf8e508042dddba72f8c7bbae84e2836ddb6b06c7026520c35d91af4e798|JsonReporter:3559–3589 iterates `t.suite` ancestry, returns fullName as `[...ancestorTitles,t.name].join(" ")`; file filepath is separate testResults.name.|
|Vitest `dist/chunks/cli-api.B5majYba.js`|494822 / 97b106a61e995661ef7c16b729c4df5d4a676bf8e4ee57ab82ec7d1cdedff548|TestCase.fullName:11599–11602 and TestSuite.fullName:11807–11810 use ` > ` between suites/title and exclude module-parent name.|
|runner `dist/chunk-artifact.js`|118951 / 25a9a7575905cbd4811421f3211e498e55b6e7c303d0ed9722f21588b3a6fc2d|createDefaultSuite:1643–1654 deletes collector.suite so top-level suite has no file-parent suite; initSuite:1845–1858 keeps file separately. getNames:1475–1487 explicitly prepends task.file.name when needed.|

These three representations are distinct: JSON fullName=`suite title`, public TestCase.fullName=`suite > title`, runner getNames includes a separate leading file name. Existing F-only filtering learned the latter distinction but C's JSON expectation incorrectly retained APP. This proposal changes only the active C JSON expectation; inactive F-only path is not rerun or expanded.

Ownsource:1199 guards original PA9 registration with exactgroup app, :1399 guards C suite with exactgroup app-c. Therefore app-c registers one named C suite and9tests only. C01 versions2/3/4 and C02 cancel/role/deadline loops produce3+3titles, then three literal C03/C04/C05 titles. Source :1400 suite name and :1493/:1578/:1681/:1724/:1754 titles match runner C_SUITE/C_CASES. There is no `it.skip`, name filter, conditional case, anonymous nested suite, or alias title in C. Config uses app-c→exact APP include and setupfile, custom s4-observed-forks initializer, and JSON plus the official typed Reporter. No native file/oldPA describe is selected by C.

Known9passed/0pending/0todo and Reporter9passed support absence of formal skips; numTotalTestSuites2 is compatible with file+oneC suite and is not evidence of oldPA registration. No new skip acceptance is needed for C. Existing F SKIP lifecycle rules are outside this delta.

## Exact proposed gate delta

Current active C expression:

```python
[APP + " " + C_SUITE + " " + title for title in C_CASES]
```

Proposed expression at the same existing predicate, exactly1match:

```python
[C_SUITE + " " + title for title in C_CASES]
```

Continue to require1JSONfile with exactabsolute SOURCE/APP name/statuspassed;9assertionResults in fixed order; all9statuses passed; global success true/9requiredpassed/failed0/pending0/todo0/failedSuites0; Reporter samefixedmodule/run-end/passed/errors[]/overflowfalse/9passed/hookstarts=ends. The formatter's title and ancestor fields need no extra acceptance branch. Do not accept arbitrary fullname suffixes, alternate delimiters, duplicates, unknownskip, shortenedcounts, or aggregate success in place of these gates.

Preserve rawboundedstdout parsing restrictions and safe finite summary. No private fullname/error/message/key/value is printed. If Root requires finer future diagnostics, public fixed enums `case-file`, `case-count`, `case-name-order`, `case-status`, `reporter` could be proposed at these existing boundaries, without persisting observed names/values; this proposal does not require or implement that extra change.

All normal gates after this expression remain required: source_guard/actualruntime Nodebinding receipts; knownowner Node/Python/toolFork actualexit/PGabsence/2EOF-FD/force0; stockFork samehandle/PIDactualexit-close/stdioEOFclose/IPC publicEOF-FDnull/stockSIGTERM distinct from outerforce; actualnormalafterAll; finalquiescent strictwalk/TMPcaps/rootcaps; BOTHwal/journal absence or0; boundedcopy/freshreadonlyaudit/queryOnly/FK/integrity/fixedcounts/actualauditclose; outerfinalstrict. No prior9pass or fork-normal is substituted for an unobserved downstream predicate, and no original privateproof/ACK/normalclassification changes.

## Smallest candidate scope and separate actual rationale

After Root adoption only: runner expectation1expression; newfresh ROOT literal; config constroot1literal and runner CONFIG_SHA dependent1literal. No source/test/product/port/bootstrap/DDL/Reporter/ObservedFork/operationalcap changes. PythonAST+compile and proportionalconfig typecheck, reverse actualexpression→old plus root/SHA binding undo must restore fullold runner0afb6ea and configeab935 bytehash. ProductC4cba22/source1459/shape/108deps/CFtypes unchanged, no backend checks or business tests in this candidate-preparation task.

Suggested fresh memory-only literal for later Root adoption: `/Users/hikaru/.local/share/hollow-validation/p5c-s4-c-b5860f4e`. It has not been probed or created. Existingfailed9f53 is never reopened/read/copied/imported/reused.

C9's directcase proof is already obtained and can be assessed independently for C; F-local physicalfork proof needs no F-only repeat. However, wholeF's normalNode/Python0→finalstrict→immutable DBcountaudit path remains unexecuted because the oldsummary gate blocked it and Root's held-root policy forbids completing the oldDB audit later. If Root requires that final path, one separate fresh C9 fixture run after the corrected gate is the smallest alreadyprepared meaningful normalownedDB family: no newcase, fakepass, derivedDBcopy, faultretry, or extra nativefixture. Its need is normalclosure/readonlyaudit, not repeating C behavior or fork proof to satisfy a test count.

Future actual remains a separate adoption/review: group app-c9case only/case40/group180/body430+sharedclosure50outer480; root192MiB/DBapp32native0opaque8audit8/max4sum80/original8cache16TMP8records8/entries8192; accounts2WS1slots4/LLM9preview5/businessWorker0/businesschild0/toolFork1; TMP inner128+outer128=256 with finalstrict/no cache exception. Normalfixture ONE strict checkpoint columns busy/log/checkpointed/rowlen3/all safeinteger number000 afterexecution/stage/memory/pin0/FK-integrity and before originalfinallyclient.close; failedfixture nevercheckpoint. Checkpoint/client.closed are not physicalFD proof. Copy uses8MiB/10sec/64KiB/fsync per stage; fixed auditcounts remain ops9(cancel5/failed4)/preview consumed5/quota1consumed8released/dispatch3(scrubbed1/unknown1/not-sent1)/activePins0. Failure/unknown/force/guarddenial/non0 holds newroot with nextgroup/copyaudit/retry0.

## Freeze

New proposal only, helper/source/config/actualphase untouched. No root/runtime/DB/native/wholetest/newagent/network/audio/spec/goal/managerfile operations. Stop publicread and thisproposalwriter after fixedhash delivery; Root owns nextscope and separateactualadoption.


## Adopted minimal candidate fixed — 2026-10-06T05:44:04+00:00

Root正式採用のhelper-only候補実装を完了、actual/rootprobe/DB/native/新root生成0。C9 actual受入又はwholeF正常監査成功へは格上げしない。

|fixed candidate|bytes|SHA256|
|---|---:|---|
|`helpers/p5c-s4-test-runner.py`|275167|b6cf65118fbde4f42cc99c03a00862a749e83c4ab7a913dd7ed04f019d335af8|
|`helpers/p5c-s4-test-config.mts`|17853|e73ffbd516191f1aac3df1ab9833bd3ddc6072942120a5c67e7ad44b5f57b3df|

Old固定runner0afb6ea/configeab935のfullbytes/hash/regular600/nlink1/UID/canonicalとoriginalproposal9202/06dad6・actualphase284518/5e47を先に個別PASS確認した。変更はC専用期待式 `[APP + " " + C_SUITE + " " + title for title in C_CASES]`→`[C_SUITE + " " + title for title in C_CASES]` exact1、runnerROOT `9f53a80b`→`b5860f4e` exact1、config constroot同literal exact1、runnerCONFIG_SHA従属 exact1だけ。

新memory-only rootは `/Users/hikaru/.local/share/hollow-validation/p5c-s4-c-b5860f4e`。probe/stat/非存在確認/生成/起動は0。sourceC4cba22/1459pair5369d9fe/shape b1d1c091/全case9/固定schema counts/108deps/CFtype/bootstrap/Reporter/ObservedFork/ROOT以外env/ケース期限/caps/正常strict/copyaudit/TMP/held及び全privateproof規則は不変。

逆fullname1式+ROOT1literal+CONFIG_SHA1literalを戻すとrunner275179B/SHA0afb6eaeb90aa1a30dccefd7bb031a278479f3379e3b36f08c3d12484ef69641へ全文byte一致。config ROOT1literalを戻すと17853B/SHAeab9357d0c7b28bcc1da7a85f695f4383f8ead94b5a82a74bf1ffa4d52f8b9faへ全文一致。PythonAST/compile成功（helper実行/import/pycache0）、official publictsgo strict nodenext/noEmit config型検査exit0。source無変更なのでwholechecks再演0。

actualphaseは284518B/SHA5e47b20b84be9b04412426a64ea1819bb66e3351445a6a5e61b5c2f4d1cbf5c0の全文byte不変、新候補結果はこの文書だけへ追記した。helperは全canonical regular600/nonlink/nlink1/sameUIDを再確認。以上を固定してhelpers/newreport/publicreaders全停止、独立比例reviewへ所有権返却。新actualはRootの別採用まで禁止、old9f53含全private非操作、F-only再演0。実JSONfullname又はactual拒否predicateの欠測は維持する。


## Fresh C9 / F-normal actual receipt — 2026-10-06T05:50:51+00:00

Root adopted the independent summary delta PASS and exactly one fresh `app-c` family. Candidate C4cba22b7, source pair5369/shape b1d1, runner b6cf6511, config e73ffbd5 and bootstrap1b5a remained unchanged. Separate public stable fullhash/mode/canonical/UID/nlink checks, own HEAD and all1459 Git blobs/modes, source_guard108 public dependency links/config/CF/Vitest and actual canonical Node24.18.0 metadata all passed before runtime. The new b5860f4e root absence was checked once under the explicit adoption. No default CLI preflight existed; none was invented.

One direct pinned Python `-I -S runner --supervise` was executed from main with the adopted minimal PATH environment. No PA, Native7, D2, E or F-only suite was rerun. Actual outer command exited0. All nine required C cases passed: C01-V2/V3/V4, C02-cancel/role/deadline, C03-partial, C04-prepare and C05-intent. Exact JSON file/fullname/status gate passed; JSON totals9 passed9 failed0 pending0 todo0, failed suites0. Reporter reached run-end with hooks20 starts/20 ends, callbacks53, nine passed states, errors0 and overflowfalse. Inner afterAll assertions-passed, actual Node bindings were canonical24.18.0 for both registered roles; PID values are omitted here.

Normal fixture checkpoint000 and execution/stage/memory/pin quiescence assertions are covered by the completed normal afterAll and fixed source, not by a separately logged PRAGMA row or a physical SQLite FD inspection. Fake codec contract cases do not provide native codec closure proof. Accepted standalone C evidence is retained; this run supplies the fresh F-normal audit chain.

Closure receipt: Node actualExit0, own Node PG absent, both stdout/stderr EOFtrue and FDClosedtrue, forcefalse, faultnull. Python actualExit0, own Python PG absent, registered Node PG absent, both EOF/FDClosedtrue, Node TERM/KILL counts0, Python TERM/KILLfalse. Observed stock toolFork had attempts1/handles1/knownPIDtrue, connectedInitiallytrue, actualClose/absenttrue. Its actual exit code was null with signal SIGTERM; this is the stock requested stop (termRequestedtrue/killRequestedfalse), distinct from outer force. stdinClosedtrue/finishfalse, stdout/stderr EOF and close true, IPC disconnected/channelReleasedtrue; IPC EOF and FDClosed stayed null because no public readable/FD observation exists. No synthetic event or closure/proof substitution was used.

Inner and outer strictClosedGuardtrue, resourceDiagnosticnull, heldfalse, faultnull. Registered owner closure plus strict sidecar gates preceded bounded wx opaque/audit copies. Audit returned ok/queryOnly/foreignKeys/integrity/actualClosed true. Exact counts: accounts2, workspaces1, notes4, originals4, operations9 (live0/succeeded0/failed4/cancelled5), previews5 (live0/consumed5), quota reserved0/consumed1/released8, bucket reserved0/consumed1, dispatches3 (scrubbed1/unknown1/notSent1), activePins0. The copy hash was returned by the runner; no post-run copy/hash/read was performed.

Final observed capacity bytes: total6730834, originals69, tmp0, cache0, records901; DB app2265088/native0/opaque2232320/audit2232320; entries20. These are below adopted caps. TMP volatile counts inner0/outer0/combined0, caps128/128/256; no volatile disappearance was inferred. Final diagnostics reached complete/normal-gate and outer-summary/normal-gate with faultEnum null.

Runtime is stopped. After this bounded receipt, b5860f4e joins all previous success/failed validation roots as nonoperative: stat/read/hash/copy/import/reconnect/reuse0. No raw stderr, error message/stack, SQL values, IDs, credentials, private proof or log was reopened or recorded. No retry or root cleanup occurred. Code/source/helper bytes and the immutable old actual phase284518/5e47 remain unchanged. This proposal alone receives the safe receipt. All public source/helper/report readers and writers stop after fixed report metadata; independent actual acceptance belongs to Root.
