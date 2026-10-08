# S5 native D1 actual: independent safeFAIL / bootstrap review

判定: **FAIL held の分類を受入。D1 機能、真正 native proof / ACK、CAS rollback / commit-response-loss recovery の受入は不可。実原因 UNKNOWN。** 公開コード照合で決定的な invocation / constructor / import 定数不一致は確認できなかった。次回の有限診断は提案であり、source / helper の変更・新 root 予約・実行を許可するものではない。

## 読取範囲と固定根拠

Root が選別した安全な stdout 投影だけを actual 根拠として借用した。今回の直接読取は固定 PUBLIC phase、runner、config と、既知 import / 呼出しに必要な own PUBLIC source 9 files のみ。source1470 全体 walk / 全体 hash 検証は行っていない。source9 本文は合計 94,280 bytes。全直接読取対象は regular / mode600 / nlink1 / self UID / nonlink / canonical / NOFOLLOW と、lstat・open/fstat 前後・close後 path identity、全文 SHA を照合した。既実行 root、DB、proof、owner records、results、cache、TMP、stderr の再読は 0。

| PUBLIC 固定対象 | bytes | SHA-256 |
| --- | ---: | --- |
| phases/P5c-3-s5-native-d1-actual.md | 4271 | 2021ae6a97ff78054758be0bd7bd9d5de6bcd4c822fa63a847af741f2e1b24ff |
| current S5 runner | 289795 | 7fa7fe9818524fcbc58aa1becc1038a193a1a999b127e44ffc98c3f13b29516c |
| current S5 config | 389705 | eaa3eb9cf1547dbcc8334e25b78563d06ff2886cf8ecfb79acc029dad3f1acb2 |
| adapters/node/regeneration/__tests__/machineRegenerationNative.integration.test.ts | 19932 | 74e1199efd2dd1c81eb3dd9e508d901e890b06f9448f11934a9d92383b9fc400 |
| adapters/libsql/__tests__/machineRegeneration.integration.test.ts | 21188 | 2b80c745b86220f360e673b97bb9b5bf6601f7cc361d95c77159a938b8646700 |
| adapters/node/regeneration/config.ts | 4089 | e0c6a4ad56b6dcf11bbb57c8eb6cd0e64ceaaf457838e9502d3a00260cd67cf3 |
| adapters/libsql/client.ts | 1882 | 17ed1f017f4ea39496f3eb9c3210a1542235995d79d7c13788b095755b4c1035 |
| application/di/serverHollow.ts | 1605 | f22807b3d988dd46d7d1b992786a9eec5d99a24853be08baa4a34998abd8765a |
| adapters/node/coordinatedObjectStorage.ts | 9473 | 549c01041320a5450a586a6293c17c3a11403b375524f2099ca94895a8f43d92 |
| application/regeneration/current.ts | 9410 | 8fc22dac39bb06b3a7f498083c4b936bd928a0f4d35875a2fcfc8591ed8d47ed |
| application/regeneration/memory.ts | 3281 | 914ef68f217941417472d4d21730286f132a44cda31b7558bcab2ab56ecbe23e |
| adapters/node/llm/runtimeOwnership.ts | 23420 | b5e1ad66b2a0a5b6879e6d162db03cf3db78ea1a73c522272eb581628e5d9ea2 |

Source paths in this table are relative to packages/core/src within the approved PUBLIC own tree `/Users/hikaru/github.com/tuanemuy/hollow-p5c-machine-79ef126-20261006`. Source bindings are derived from the frozen runner's literal SOURCE_FILES / SOURCE_SIZES using Python AST, without evaluating or importing the runner. Fixed source candidate is e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42. Current working main / HEAD / untracked / environment files and UI / P5d tools were not read.

Root's earlier whole source1470/public108/CF/public2 precheck and `--preflight native-d1` PASS are borrowed results. They are not rerun by this review. All runtime roots, including the D1 9d230b41 root and successful APP audit2 root, remain permanent NONOP: stat/read/hash/copy/import/reopen/replay/cleanup 0.

## Actual: observed closure and missing acceptance

Root's sole native-d1 actual returned Python1 / Node1 and held. The outer known PG was absent, both PIPE EOF and actual FD close were recorded, and no outer TERM/KILL was used. The inner fault is test-or-closure-failed; aggregate caseCount/pass/fail are NULL and afterAll is unobserved. Audit is NULL, strictClosedGuard false, resourceDiagnostic NULL. This accepts physical outer closure only, not successful test or native proof.

The reporter result is valid JSON: total10, pass0, fail1, pending9, todo0; suites4, failedSuites2. Nine formal skips and one failed case were observed. Reporter callbacks27, hooks3 start / 1 end, ready1 / result1, skippedReady9 / skippedResult9 and sameIdentity true were recorded. The finite error classes are AssertionError-unknown, then Error-unknown twice. These classes do not reveal a failing expression, module, database operation or teardown site. Hook counts do not supply the missing afterAll receipt.

The detailed original stockfork ledger reports actual close, known absence, readable EOF/close and public IPC disconnect/channel release, with original requested SIGTERM stop. stdinFinish false and stdinClosed true remain distinct. IPC EOF/FD are NULL. Original stockfork stop is distinct from outer force. Detailed fork evidence does not fill aggregate forkPID/PIPE fields that remain unobserved.

The original owner child ledger records attempts1 / handles1, known birth metadata and same PG, natural exit1 with no signal, actual close, stdin closed, stdout+stderr EOF/close, known absence and no force. streamErrorObserved is NULL; normal is false. Its physical closure and exit1 do not establish the source READY marker, normal owner exit0, private ownership retirement, saved input rows or genuine proof. The independent metadata ps child exited0 with no signal/force, actual close and PIPE EOF-FD close. ps0 verifies that observer operation, not owner-program success.

The scoped native Worker ledger records attempts0 / active0 / workers[], restored true / observerFault false / normal false. This is an observed count in this observer scope; it does not prove absence of every native worker or unregistered resource. Missing native completion is not replaced by the APP7 or native format2 locally accepted families.

## Static bootstrap / original call compatibility

The selected source rows were inspected proportionally: native test inline ownerProgram and its construction (52–124, 157–187), original consumer / wait / normal-close gates (188–276), D1 recovery assertions and catch; fixture suspendDatabase/resumeDatabase/close (324–389); original factories, constructors, currentMachine, finishInput and runtime ownership signatures; config known original spawn and child observer guards. No full source tree exploration was used.

The ownerProgram reads its options from the original index1. The source creates exactly five argv entries, with the original module-input, transform-types and eval flags followed by the program and options. Transform-types is enabled; strip-types alone and loader import flags are not the launch contract. A parameter-property incompatibility cannot be inferred from this invocation. Original argv values / serialized DTO / private runtime identifiers are not reproduced here.

The seven-parent SOURCE URL construction resolves lexically to the fixed source binding. The six exact entry imports and four expected worker artifact paths are manifest-listed. These memberships do not prove actual module import or worker execution. The resolver hook delegates to original next first, with a finite expected extensionless-relative `.ts` fallback guarded by regular600 / UID / nlink1 / canonical source scope. It is not a custom load implementation. Module parse, transitive import, native initialization or unexpected resolver error can still reject without a specific diagnostic.

Original createLibsqlClient / applyPragmas / getDatabase / createHollowContainer wiring, the coordinated storage three-argument constructor, createNodeRegeneration options and returned execution/input/ownership, currentMachine and finishInput signatures are compatible with the selected call sites. No missing c.machine/shared.execution contradiction was established. The config known-spawn guard checks the original command / five-argument shape / exact source program / options / cwd / environment / stdio, then sourceGuard before the original Reflect.apply. The actual owner attempt/handle receipt establishes the observer registration reached that guard branch; it does not establish the child imported its sources or ran a claim.

The normal source path creates a formal local client, applies pragmas, builds the original UoW/container and regeneration services, then makes two acquiring claims. The first input goes through original finish / finishInput and zero-memory consumption; the second remains unclosed at 50 MiB. Original execution/passwordHasher stop, FK/integrity/checkpoint, client.close/closed precede READY. Parent readiness wait and original exit0 + both EOF/close + absent gates precede predecessor acquire and parent resumeDatabase. These are separate original assertions and acceptance boundaries.

## Reachable failures: cause still UNKNOWN

Without a source-own stage, all of the following reachable boundaries remain ambiguous: argument/hook setup; exact source imports / transitive dependencies / type transformation; formal native client construction; pragmas/container; regeneration ownership/factory/storage/worker configuration; first row lookup/reserve/bind/claimTransaction/currentMachine/claimExact; first finishInput/zero-save/consume; second claim; original stop/FK/integrity/checkpoint; client.close/closed; ready publication; parent's ready timeout, original child exit/stdio gate, predecessor acquire or later recovery assertions. A config guard failure and a test assertion failure remain distinct possibilities. This list is static reachability, not actual attribution.

A secondary teardown path is visible: suspendDatabase closes the parent client before spawning the owner; resumeDatabase follows the READY/normal owner assertions. If failure prevents resume, afterAll fixture.close still executes FK/integrity on that suspended client, despite f.fail having been set; its finally closes/checks the client. This can explain an additional reachable teardown rejection. It neither identifies the original child exit1 cause nor attributes the two actual Error-unknown classes. No teardown bypass or modified normal gate is proposed.

Closed0/unclosed50MiB, original exact proof verification, premature ACK rejection, false CAS rollback, postcommit reply-loss recovery, same saved-row identity and final ready/pendingProofs gates remain unproved in this actual. Ordinary source signatures and earlier family successes cannot supply these receipts.

## Minimal next candidate proposal: own finite stage through existing stderr

A future candidate may instrument only the existing inline ownerProgram's own statement boundaries with one primitive lastPhase, using this closed 11-value enum: ARGUMENTS, SOURCE_IMPORTS, CLIENT_OPEN, PRAGMAS_CONTAINER, REGENERATION_FACTORY, FIRST_CLAIM, FIRST_FINISH, SECOND_CLAIM, STOP_CHECKS, CLIENT_CLOSE, READY. A stage records the boundary entered; it is not a receipt that the operation completed, that a native resource was closed, or that proof was issued. The existing catch must keep unknown error properties unread.

On the existing catch failure path, emit only an exact ASCII marker `S5_D1_STAGE:` + one registered enum + newline to the existing original child stderr. Longest marker is 33 bytes. No error name/message/stack, path, SQL, DTO, identifier, argv or environment is included. Existing stdout READY bytes and the parent READY predicate remain unchanged. Success emits no stage failure marker and needs no new marker receipt. Exceptions outside this catch, parse failure, abrupt native termination or unknown stream bytes leave the phase NULL/UNKNOWN.

Transport is the same original child.stderr data events already observed by config and discarded/count-limited by the test. A passive scanner at the existing known original child observer may recognize this exact marker only. Use a bounded byte-state machine with only fixed-prefix position, enum candidate state and count: no dynamic line buffer, retained suffix, raw message, raw stderr log or additional FD/control frame. Recognition requires complete registered marker bytes and newline; arbitrary bytes are immediately discarded. The current count-only original stderr consumer continues to run. Do not replace/pause/wrap the stream or consume it through a competing reader. One child / at most one accepted marker; repeated/invalid or incomplete markers remain diagnostic UNKNOWN, without success promotion.

Project only a nullable exact enum and finite marker count into the existing owner ledger / existing safecontrol receipt. The runner must decode exact keys/enum/count and preserve held failure. Missing marker is NULL; unknown exit remains UNKNOWN. Existing raw-byte limit65536 and resource deadlines stay fixed. Exact marker contributes at most33 bytes; the two projected fields contribute a fixed bounded increment below100 bytes. Candidate preparation must derive the full modified existing record's worst-case JSON bound and prove <=512 bytes and existing frame/control caps; no additional frames are proposed. No stdout/normal closure predicate may depend on this diagnostic becoming present.

Original child command, argv count/order/flags/options, cwd/environment, stock constructor/exports, handles, Promise behavior, original this/args/result delegation, ready and closure gates remain unchanged. Honesty on byte identity: adding stage statements necessarily changes the program string supplied in the existing eval argument. Therefore the future native test source hash and exact expected ownerProgram equality binding must change together. Entire argv byte equality cannot be claimed. If the program bytes must stay immutable, the existing generic failed marker cannot provide these own stages; a richer source-own stage would remain unavailable. No binding guard should be weakened to admit arbitrary programs.

The proposed future edit scope is the existing native integration test's inline ownerProgram plus current config/runner finite diagnostic decoding and dependent source/program/CONFIG hashes, with a separate candidate report. Product functions/exports are unchanged; source file count1470 stays unchanged, one test blob/bytes and corresponding full source manifest hash change. Case total10, one required D1 case / nine formal skips, two owner claims, original closed0/unclosed50MiB and all CAS/ACK assertions stay unchanged. No new case or artificial event/proof/brand/native export is introduced. Whole source checks would be required after a separately adopted source edit; none are run now.

This proposal needs Root adoption before any source/helper write, candidate generation, fresh root reservation, preflight or actual. A new forward marker cannot recover previous stderr or establish a past failing stage. Existing private roots remain held and permanently nonoperable. All current source/helper bytes and criteria are unchanged.

## Scope close

This review writes only this new PUBLIC review file with wx600. Runtime/import/default/preflight/DB/key/proof/rootprobe/retry/source edits/helper edits/UI candidate edits/main/P5d edits are 0. Tool and product success are not declared. Static invocation mismatch is unconfirmed and actual cause remains UNKNOWN. After stable file hash, all review readers/writers stop; there is no pending runtime or background task owned by this review.
