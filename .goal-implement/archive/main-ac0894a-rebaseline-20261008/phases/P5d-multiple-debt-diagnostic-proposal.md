# EF01-DIAG1 ONE actual safe receipt — held

Root採用の固定候補 C20b61af2014a50838d7127895c30a04efd85545a／source92 a81458adcb6ac809f0cc65d937614ee44516d7c2957b2f081d7370f57082e5cc に対し、独立PUBLIC候補precheck全項目PASSを確認し、既runner default preflight（exit0、preflight true、executed false、database0、newRoot0）を確認した後、採用済みfresh d84be0c1 pairで既 --execute を一度だけ実行した。自動再試行0、source/helper/main変更0。今回root/TMPは held とし、以後read/stat/hash/copy/import/retry/reopenを行わない。

## 実観測の有限結果

- actualExit1／ok false／failure tool-exit-or-eof／elapsedMs1865／outputBytes836。
- EF01 failed。ONE case-failure frame の checkpoint は failed-attempts。これは当該assert群への到達を示し、通過を示さない。元例外の公式case mapperは AssertionError／nativeCode none／statementIndex null。raw message・stack・cause・expected/actual・SQL・row・ID・proof・key・bodyは取得・出力していない。
- beforeAllStarted/Ended true、afterAllStarted/Ended true。これはhook lifecycleのみであり、正常fixture physical close receiptではない。
- fork1／sameOwnedPG true／forksActualClosed true／workerCount0／denied false。summary completedは空、EF01 failed。
- forcedTerm false／forcedKill false。supervisorPGObserved true／helperOwnPGObserved true／ownPGState absent／leaderState absent／pollMs200。
- stdoutEOF true／stderrEOF true／pipeHandlesClosed true。normalPipeCloseReceipt null。正常監査前の独立4stream-close flags receiptは未成立。
- 正常fixture-close frameは未受領。execution.stop／passwordHasher.stop／client.closeの正常receipt、wholecaller end／native closure／private proof save/read/ACKconsume、third-row progress／held final EXISTS／sameintent成功は今回結果から成立としない。
- audits null／held true。diagnostic frame により正常昇格とsameDB readonly auditは禁止され、追加DB0／audit0。

## 現在の境界

最初の業務失敗位置は failed-attempts assert群まで絞れた。群内の具体assertとactual値、根本原因は未観測。新しい期待値・製品修正・診断拡張をこの結果から推測して適用しない。Durable uses2とliteral debts2は別であり、resources0はnative HTTP positiveではない。P5d E/F全体、unknown/ACKfalse/legacy/multiepoch/Google/65/67/allcopies/UIの受入へ転用しない。

実行ツールは終了済み。safe receipt固定後に全reader/writer/runtimeを停止する。旧actual phase43958B／678080096fc6d21eeb0ea1479aba38beb700a2901bcc7484b1841770217a4810、全旧success/failed private、固定source/helperは非操作・不変。

以下は実行前の固定候補本文（37204B／3721e237ad6938179a90aa51f1fe61f4ae3b4c2b68245df7655e7316ebcedc65）を全文そのまま保持する。

# P5d DIAG-ORIGINAL1 fixed candidate

Status: minimal source/static correction complete; independent review/actual run not performed. C `20b61af2014a50838d7127895c30a04efd85545a`, parent `3da7eedb7360aea44f26235c918c247eff9ccfa4`. Exact test1 commit (7insertions/3deletions); other91 source full bytes equal parent, own worktree clean and all92 current files equal HEAD blobs. Current source92 manifest `a81458adcb6ac809f0cc65d937614ee44516d7c2957b2f081d7370f57082e5cc`; the single manifest table below is updated for this current test row. Earlier narrative/bindings describe the previous diagnostic candidate.

| Current fixed item | Bytes | SHA256 |
| --- | ---: | --- |
| existing EF01 test | 14998 | `80623444427013800d834fbf8c54b564ad1ade1fda35a5b3ff0b28d92de9cb5e` |
| runner | 25015 | `3b398932dee7d90ce91adf3c4975397fe3a17ef0c49f95505a1705bcae17bee3` |
| loader (unchanged) | 22845 | `19177532a2dad558e00ce92a3d939ed873b68e93ef66e1cd911cc177cce32ba8` |

The original test error is preserved if diagnostic JSON serialization or process.stdout.write throws synchronously. A narrow diagnostic-only try/catch rethrows that same captured original object on write failure; successful write then falls through to the same original throw. No unsafe-finally control transfer, new expectation, fake write success, skipped original error or replacement write-error is used. Original24 checkpoints/assertions/awaits/inner gate release finally/methods/this/args/native UoW/proof/result semantics remain unchanged. Missing diagnostic output remains unknown; original case failure still forbids normal/audit through unchanged business result gates.

Postformatter full inverse replacing only this new diagnostic boundary reproduces previous test14935B/SHAbf03638575759b3587226b7f041de1e3abfdcdf0bbe66ff10bc9d76d78c95c7f exactly. Runner only changed one92 manifest SHA literal; restoring it reproduces full previous25015B/SHA4176c6b7dd759305f424ae37c0179dc37fd0f34d79a55f1cf6aeb4ff0e75067b exactly. No HEAD/test hash literal exists in runner beyond the report-derived manifest; loader SHA and all other runner bytes are unchanged. Loader full22845B/19177532 bytes remain unchanged, so its previously passed Node --check is borrowed without rerunning unchanged code. Final runner Python AST passed.

Whole own-worktree typecheck→lint:fix→format PASS (root/core/web/AWS/CF) with previously adopted public108/self-core/command-local verify-deps falsyenv/CLI false/PATH prepend. Lint had existing347 warnings/61infos/unsafe260 fixes skipped and applied no fixes; format applied no fixes. All results inspected. New mirroring tests were not added. Exact source92/headblob/other91 full-byte, stable regular600/nonlink/nlink1 helper metadata and SHA were confirmed.

Memory-only ROOT `goal-implement-p5d-multi-20261006-d84be0c1` and derived -tool-tmp remain unchanged/unprobed/uncreated. Actual/default preflight/test/DB/native/caller/key/config/root operations0. Product/fixture/SQL/ports/old actual phase43958B/678080096fc6d21eeb0ea1479aba38beb700a2901bcc7484b1841770217a4810 and all held/success private material remain unchanged/nonoperational. Gates5s/native10s/case40/body180/outer240/wakes64/entire resource caps and normal PG/EOF/actualFDclose/audit versus failure-held conditions are unchanged. Actual EF01 AssertionError location/cause is still unknown; no normal fixture/audit/business proof is inferred.

After fixing this candidate report all reads/writers/runtime stop. Next independent review and separate Root actual adoption precede any defaultpreflight or launch.

## Previous diagnostic candidate context (current92 table updated only)

# P5d EF01-DIAG1 fixed candidate

Status: implementation/static checks complete; independent candidate review and actual run are not performed. C `3da7eedb7360aea44f26235c918c247eff9ccfa4`, parent `33249ffd1d2fb5c5fd1fee4c9618bd7125efd055`. Exact existing test1 only committed; source92 manifest `e93625e3c66be469d25141ce58d94a0f857e50905e6a1721586bb83503386697`. Other91 complete bytes equal parent/currentold92 manifest, including original fixture/product/SQL/ports. Own worktree clean; all92 current files equal HEAD blobs. No assertion/expected value/business meaning is changed.

The failed9e295d65 actual phase43958B/SHA678080096fc6d21eeb0ea1479aba38beb700a2901bcc7484b1841770217a4810 remains immutable; all old success/failed private material is nonoperational. Fresh memory-only ROOT `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-multi-20261006-d84be0c1` and sibling `-tool-tmp` were neither probed nor created. Test/DB/caller/native proof/key/config/runtime/helper execution/preflight0. Only adopted static checks and source/helper/report editing occurred.

## Exact candidate bindings

| Item | Bytes | SHA256 |
| --- | ---: | --- |
| existing EF01 test | 14935 | `bf03638575759b3587226b7f041de1e3abfdcdf0bbe66ff10bc9d76d78c95c7f` |
| `.goal-implement/helpers/p5d-multiple-debt-loader.mjs` | 22845 | `19177532a2dad558e00ce92a3d939ed873b68e93ef66e1cd911cc177cce32ba8` |
| `.goal-implement/helpers/p5d-multiple-debt-runner.py` | 25015 | `4176c6b7dd759305f424ae37c0179dc37fd0f34d79a55f1cf6aeb4ff0e75067b` |

Stable full public reads/SHA/regular600/nonlink/nlink1 were checked. Git index100644 is ordinary tracked mode, not actual file permission. Manifest92 exactly once below; runner binds this new diagnostic report, manifest and loader hash. Previous actual report/helpers/accepted source are not edited except the formally adopted existing test/loader/runner delta.

## Implemented diagnostic contract

Exactly24 named stage-membership keys: entry initial value plus23 assignments immediately before original groups. Three dictionaries (typed test union, loader Set and runner exact set) are equal; assignments match23 non-entry keys exactly. Same single EF01 name/case selection. Outer test catch emits one exact `P5D_MULTI ` JSON frame with eventcase-failure/caseEF01/checkpoint and rethrows the original error. Original inner gate release finally, original assertion/await/control body, methods/this/args/private proof/UoW/clock/deadlines are preserved. Stage entered never means stage passed; nothing in this frame claims closure/ACK/progress/count/cursor proof.

Loader parses only the explicit case-failure branch from its one known fork, exact own keys case/checkpoint/event, fixed EF01 and24 known keys, once only; malformed/unknown/duplicate frames are denied/held. Original fixture-closed frame and denial forwarding remain. caseFailure permanently forbids normal case completion, normal summary/exit. Official TestCase.result().errors class/code/index mapper is byte-unchanged; no new raw error/message/stack/cause/expected/actual/SQL/ID/proof extraction.

Runner admits only the exact one-frame schema and whitelist, forwarding that finite packet. Its normal summary gate now rejects case-failure independently alongside denial/diagnostic; audit can never run after such a frame. Existing original fork/IPC/cacheFsfalse/Node execPath-version/native ENOENT/ownership/file/resource/normal PG-EOF-actual FD close/audit ordering is unchanged. No case/frame/material/output cap was increased; one frame stays inside40/2MiB/256KiB. Unknown error or absent checkpoint stays unknown/held.

## Whole checks and complete inverse

Whole own-worktree typecheck→lint:fix→format PASS, using adopted public108/self-core/PATH prepend plus inherited PATH and command-local pnpm verify-deps falsy env+CLI false. All results inspected. Typecheck passed root/core/web/AWS/CF; lint fixed the one adopted test formatting only, retaining existing347 warnings/61 infos/unsafe260 fixes skipped; format no changes. No other tracked source changed. Python AST and canonical public Node24.18 --check passed; neither runs the helper body or DB. No tests executed.

Preformatter in-memory removal of typed24 declaration,23 stage assignments and outer catch/body indentation reconstructed the entire original test12649B/SHAca97083a3e2cd3f963a3158d4370d159d46aab72dd22f5f4970d222513cc6fd4. Postformatter complete inverse removes the same diagnostic syntax/indent and undoes one known formatter-only SIGN_IN_REQUIRED object line wrap, then canonical public Biome stdin formatting produces exactly that original full source. Every original assertion, await and finally is included; comparison is full bytes, not selected statements or AST-only.

Loader full inverse removes the fixed dictionary/state/frame branch and caseFailure fences and reproduces original21817B/SHA815cbf11e2e27e2d1a9d39c37705d49b017b5472a081d3d97cd6499b66cfb53c. Runner full inverse removes dictionary/one-frame validator/normal-diagnostic fence and restores root/report/current92-manifest/loader-SHA bindings, reproducing original24240B/SHA3259b35d6362756c8f6801cec22b87fb0a6b29ec1fa8f4e54a1dc0be15f15e85. Final bound manifest/hash runner inverse was repeated after bindings and matched complete old bytes. No old helper/report bytes were restored by mutating files.

## Future run and unresolved cause

Next needs independent limited review followed by Root separate ONE actual adoption. Separate public/source/helper/head/meta/fullhash precheck→inspect all→existing default preflight→inspect all precede --execute; no launch if any failure. No current root absence probe or preflight occurs in this candidate phase.

Same resources0 family/caps: accounts1/browser1/attempt3/use3/gates2/callers<=3/history3/page25/wakes<=64; DB1sidecars32/sum64/root192/key32metadata/config16KiB/owner16KiB+bounded temp-lock; notesWSobjectsHTTPDNSlistenerTLSsocketbusinessWorkerchild0/toolNode1fork1/TMP8MiB/output2MiB/material256KiB. Gates5/native10/casehook40/body-suite180/outer240 incl shared TERM10/KILL10/PIPE10/200ms guard/logicalclock2001 unchanged.

Normal passed-case/file/actual native execution.stop-passwordHasher.stop-client.close fixture receipt/original fork actualexit-close+2EOF/Node0/known PGabsent/outer2EOF plus four independently observed stream-close flags/force0 alone permit same fresh DB1 direct readonly query_only/FK/integrity targeted audit. Failure/diagnostic/unknown/non0/denial/force/timeout gives held/audit0/no next case/private inspection/retry. No targeted business PASS or closure receipt is present now. The previous AssertionError position/cause remains actualunknown; this candidate supplies group membership only. Uses2≠literal debt2/resources0≠HTTP; unknown/ACKfalse/legacy/multiepoch/65/67/allcopies/wholeP5d remain unresolved.

All source/helper/report writers, reads and runtime work stop after fixing this report metadata.

## Historical adopted12936-byte proposal and current manifest

# P5d EF01 finite diagnostic proposal

Status: PUBLIC-only proposal. Source C33249ffd1d2fb5c5fd1fee4c9618bd7125efd055/source92 manifest613acdd9cfc301aea0598566040dfd3b3d1bedc431f3c66d20b713e9a18d00c6, helpers3259b35d/815cbf11 and accepted actual phase43958B/SHA678080096fc6d21eeb0ea1479aba38beb700a2901bcc7484b1841770217a4810 are unchanged. Source/helper edits, runtime, DB, root/TMP probes and key/config creation are0. Failed9e295d65 and all earlier success/failed private material remained entirely nonoperational.

## Conclusion

The allowed actual channel identifies EF01 AssertionError, not its assertion location. Normal fixture-close receipt and readonly audit are absent. No inspected public predicate proves a static contradiction requiring a business/test expectation change. Recommend diagnostic-only one-test checkpoint metadata; preserve every original assertion and method/this/argument/UoW/private proof identity. The existing loader already captures official TestCase.result().errors finite metadata, so no new error extraction is needed.

This is limited static review, not proof that every candidate assertion is correct. No guessed runtime row/count/state/error payload is adopted as actual cause. The next separately approved fresh run would locate an assertion group; it must not silently retry the held run or count a checkpoint as a normal proof.

## Public predicate comparison

All isolated source paths below are rooted at `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006`.

| Exact public path | Static comparison and remaining ambiguity |
| --- | --- |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebt.integration.test.ts:166` | Original case first awaits both gates and checks two active uses; then third rejection/closure/consumption, normal delete/auth fence, two per-row pages, held verify, original caller release and same-intent resume. Official actual frame does not identify which expectation failed. |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebtFixtures.ts:224` | Facade calls original.run, restores delegated methods in finally, then captures committed receipt/page and gates only the exact failed source. Native closure object from execution.closure is reused; saved read/verify occur before facade resolves. No statically demonstrated fake/early receipt or changed return is used. Concurrent saved-row ordering and actual timing have not been observed. |
| `packages/core/src/application/account/context.ts:45` and `.../integration/openRouter/connection.ts` | captureAuthentication with remaining browser and absent session returns actorNULL; requireOpenRouterActor then SIGN_IN_REQUIRED. accept deletes sessions and leaves browser; expected post-delete begin rejection is consistent with this public path. This does not prove the actual error branch reached it. |
| `packages/core/src/adapters/libsql/repositories/accountRepository.ts:177` | findSession requires an active account and current browser; deleted account cannot authenticate through retained session. |
| `packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts:565` | accept saves queued intent/version1/personal-notes, shrinks anchor and deletes sessions. No automatic sweep or failed-attempt rewrite is performed in this repository. Fixture has no purging service runner. |
| `packages/core/src/application/account/deletionWorker.ts` | Normal recovery-before-claim skips active entries with no closure/predecessor proof; persistent ACK rollback would throw before claim and remains a separate family. Claim/real step and release paths are unchanged by the case. |
| `packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts:916` | credentialSourceHeld examines exact provider/source and returns held for missing use or any nonclosed/nonACK use. Third closed source is eligible while the other two are held. No global accountHeld is applied to that per-source attempt cleanup. |
| Same repository `:944`, `:1076`, `:1260`, `:1341` | Ordered page limit25, three candidates mean exhausted=true; result is progressed/blocked/finishedfalse. Credential-use deletion requires exact row closed/callerEnded/ACK and its own source absent. Expected1progress/2blocked is consistent with the intended produced states, not an observed count. |
| Same repository `:1511` | Real residual EXISTS or accountHeld persists waiting-owner/personal-notes/nulllease at claimed version+1 and nextAttempt now+2000ms. No residual saves succeeded/verify with now. The case compares mapped intent fields; exact actual saved fields have not been inspected. |
| `packages/core/src/adapters/node/auth/credentialRuntimeOwnership.ts:498` and `:527` | closure returns the registered original proof; verify requires private WeakMap key and matching target/evidence. acknowledge deletes entry/proof, making subsequent closureNULL/verifyfalse consistent with consumption assertions. Actual sequence/timing is not inferred from this source. |
| `packages/core/src/adapters/libsql/repositories/openRouterRepository.ts:91` | ensure creates a never-linked unlinked connection; missing origin does not permit secret retirement. cleanupPage excludes secret/history-NULL connections, and final verify checks only retained secret/history fields. Thus one empty connection may remain without requiring inferred closure. |
| `packages/core/src/adapters/libsql/migrations/0044_account_deletion.sql:3247` | Use DELETE guard is per-row closed/callerEnded/ACK/noorigin; it does not itself block the third row due to another active use. SQL/DDL remain unchanged and are not executed in this review. |

The missing fixture-closed event is consistent with the source deliberately emitting that normal receipt only when failed=false. Hook afterAllEnded establishes lifecycle only. This explains the observability boundary, not the initial AssertionError or physical native closure, and does not justify adding a failure success receipt.

## Proposed diagnostic delta

Exact future source1: `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebt.integration.test.ts`. Existing fixture remains unchanged. Product/ports/repositories/SQL/DDL and all other91 source files remain unchanged. Current source union stays92 with a new candidate hash/commit after checks.

Exact future helpers2: `.goal-implement/helpers/p5d-multiple-debt-loader.mjs` and `.goal-implement/helpers/p5d-multiple-debt-runner.py`. This new public diagnostic proposal becomes the candidate report/manifest reference; old actual phase stays immutable. No extra observer port, file, worker, child, clock or native API.

Wrap only this original test callback in an outer try/catch. The existing original held.release finally and Promise.allSettled remain nested and unchanged. Maintain one typed finite stage key, assigned immediately before a known assertion/operation group. At the outer catch emit exactly ONE frame and rethrow the same original error. Do not read its message, stack, expected/actual, cause, proof, SQL or rows. Normal success emits no diagnostic frame. Do not add assertions, change expected values, move awaits, skip callback errors, swallow failure, add retries or lengthen deadlines.

Proposed24 ordered stage-membership keys (each means a group was entered, not completed):

| Key | Original group |
| --- | --- |
| entry | Enter original test callback before setup |
| begin-three | Three normal begin calls |
| callers-started | Attach original two rejection handlers and invoke real callers |
| gates-ready | Await original two bounded ready gates |
| active-two | Initial count/target/state/closure-null assertions |
| failed-attempts | Original source A/B failed state assertions |
| third-rejection | Await third real internal empty-code rejection |
| third-saved | Count3 and A/B exact saved equality |
| third-closed | Third closed/callerEnded/ACK and no private pending proofs |
| third-proof | Existing same-proof committed closure/ACK/consume assertions |
| origin-empty | Third provider/account/source checks and origins0 |
| delete-accepted | Normal delete acceptance assertion |
| anchor-intent | Read deleted anchor and original queued intent assertions |
| session-fence | currentUserNULL, begin rejection, unchanged uses |
| attempt-page | Normal wakes to attempt page and returned1/2 assertion |
| attempt-membership | C absent, A/B failed and all uses exact assertions |
| use-page | Normal wakes to use page and returned1/2 assertion |
| use-membership | C use absent, A/B exact active closure-null assertions |
| verify-held | Real verify page and exact waiting-owner intent assertions |
| held-obligations | Remaining uses/origin/debt/unacknowledged assertions |
| release-callers | Original gate release and awaiting original rejection handlers |
| ended-proof | Remaining closed uses, original targets and same-proof consumption |
| retry-fence | Unclaimed retry wake, same intent and logical2001ms advance |
| final-verify-and-cleanup | Real resumed succeeded verify, anchor, no attempts/uses/origin/debt/purge, secret-NULL connection, receipt/wake bounds |

One frame through existing tool stdout/IPC channel only:

```json
{"event":"case-failure","case":"EF01","checkpoint":"active-two"}
```

`active-two` is an example enum, not an observed stage. Prefix can use existing `P5D_MULTI `; loader already parses this prefix for the exact fixture-close frame. Add an explicit strict branch: own parsed object exactkeys event/case/checkpoint; eventcase-failure, caseEF01 and fixed24 whitelist; one frame total from the one known fork. Reject unknown/duplicate/malformed frames. Preserve exact fixture-close recognition and fork denial forwarding. Do not emit arbitrary strings or raw logs. Forward only this strict frame to outer safe summary. The extra one frame is within existing40 event/2MiB output/material256KiB caps; do not increase caps.

Official loader `onTestCaseResult` already captures `result.errors` with finite class/code/statementIndex (loader:299). Keep that mapper unchanged, including unknown→unknown/none/NULL. A checkpoint plus this original case metadata identifies an assertion group and real error class; it is not an error-object copy. No new dependency on private assertion/error payloads.

Runner adds only strict event schema/oneframe/24 whitelist forwarding plus changed dependent loader hash, candidate source92 manifest/report binding, and fresh root literal. A case-failure event independently forbids normal-summary/audit promotion even if an inconsistent future frame claims passed. Preserve all original case/file/hook/fork/NodePG/EOF/real stream FD gates and held behavior. Fresh memory-only suggestion: `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-multi-20261006-d84be0c1` and derived `-tool-tmp`; neither is probed or created here. Root separately adopts the actual literal/run after candidate review.

## Candidate and future run proof obligations

After Root adopts this diagnostic source/helper scope, complete whole own-worktree typecheck→lint:fix→format with adopted public108/self-core/command-local verify-deps disable. Exact test1 commit parent33249, other91 byte-equal, current92 manifest/headblob and helper full metadata/SHA checks; full-byte inverse restores original test body/assertions and existing helper parent3259/815c except the enumerated stage framing/bindings/normal-failure gate. No weakening casts/optional ports/new SQL or product fields.

Future one run still requires separate public candidate precheck→inspect all→existing runner default preflight→inspect all→Root ONE --execute. Normal exit0/forkclose+EOF/NodePGabsent/outer2EOF+four real FD flags/afterAll actual execution.stop-passwordHasher.stop-client.close fixture receipt/force0 permit only sameDB1 readonly query_only/FK/integrity targeted audit. Any failure/error/diagnostic/deny/non0/force/timeout remains held/audit0/no next case/retry/private inspection. If beforeAll or failure before checkpoint channel is absent, stage remains unknown; no guessed location.

Resources unchanged: DB1sidecars32/sum64/root192/account1/browser1/attempt3/use3/held2/whole callers<=3/gates2/history3/page25/64wakes. AES32 metadata-size only/config16KiB/owner16KiB plus original bounded temp/lock; notesWSobjects0/HTTPDNSlistenerTLSsocketbusinessWorkerchild0/toolNode1stockfork1/TMP8MiB/output2MiB/material256KiB. Case/hook40/body-suite180/outer240 incl shared TERM10/KILL10/PIPE10/guard200ms. Gates5s/native10s/logicalclock2001ms unchanged. No literal debt2/unknown/ACKfalse producer, HTTP positive, legacy65/67/multiepoch/wholecopy/UI/wholeP5d substitution.

At proposal fixation all reads/writes/runtime work stops. Only this new report was created; original actual phase/source/helpers are untouched. Implementation and actual execution await separate Root adoption.

## Fixed diagnostic candidate source92 manifest

Manifest SHA256 `e93625e3c66be469d25141ce58d94a0f857e50905e6a1721586bb83503386697`. Exact source1 changed; other91 complete bytes equal parent C33249 and old manifest.

| Path | Bytes | SHA256 |
| --- | ---: | --- |
| `apps/web/app/components/hollow/AccountDeletion.test.tsx` | 6275 | `fa1e89fccfd1de45da5246b1ec43b1f043d784bada3c52eb525aa50d42bd8cc1` |
| `apps/web/app/components/hollow/AccountDeletion.tsx` | 6791 | `cc851eb54a632f6094bc9f3b055eb1304c479e0a3a51a358244f91914af74b6c` |
| `apps/web/app/presentation/accountDeletionInput.test.ts` | 3072 | `30d1d8c8eaf2586aeb8b470a5f1da03800bddc3f8038191b6c04fc8cdef04d7d` |
| `apps/web/app/presentation/accountDeletionInput.ts` | 507 | `0a5075d2da9a7cc4e5b533168e8ce240aea936e38bc9613affbe2ad77458dc0d` |
| `apps/web/app/presentation/accountDeletionServerFn.ts` | 796 | `3da967ff5914f274d8a6f194634c8ceae1be04bd23448202cadbcb18d055e35e` |
| `apps/web/app/routes/settings.profile.tsx` | 5782 | `55a193e4dcf6391cd9744dd7e868a4a47622f849d14cbfc667008bc656effb6c` |
| `apps/web/app/server.node.ts` | 28742 | `6ad03065decfcdf2b906901766a7328654a37378dc51597336cfc64af6112b85` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletion.integration.test.ts` | 8483 | `5a79dd087f225769841015ae47d0f0acf0ab18bbff763c0640f3fc63d65f334c` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionCredentials.integration.test.ts` | 5187 | `c4bf84d1b87b2c9f2fe1708219e33beca4360676d4d3e80b6f29ceb291d5e66e` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionFixtures.ts` | 6886 | `5876ca9e38a788c471e59f7ea3d5a023140952f788bb410535a80553760d299a` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebt.integration.test.ts` | 14998 | `80623444427013800d834fbf8c54b564ad1ade1fda35a5b3ff0b28d92de9cb5e` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebtFixtures.ts` | 14909 | `d01de5db451c85a92780ce752561f95db13a7f954afc5953d68207ebd7864ba1` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentials.integration.test.ts` | 13381 | `96188340531e37caddc9eb5ed83e8d162b4543dd66038fedbc6a2abfcfa85f37` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentialsFixtures.ts` | 13851 | `eca0093406477b44aad990fd8f73d5e949d7d1f44106636e31eb4516eb6f2874` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeHttp.integration.test.ts` | 8299 | `210022aeb600ad9c7b7ca3b1d0150af14365dfdf2a33731c2f33e2a61e87f0da` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeHttpFixtures.ts` | 14547 | `0c444eb8950ebbb24785fb82bb94f4750d739a5218a20062cfceb5dc84f369a5` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionPaging.integration.test.ts` | 13738 | `301b0968baa56ea1d63cc0888f4bba3f008df3f6df4003f2d3d2f01394e67c66` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionSchema.integration.test.ts` | 3120 | `55f93dfbe053823593df1c0e23a3cbf432a78ba89ff346c71e89c65b906766b6` |
| `packages/core/src/adapters/libsql/accountDeletionSchema.ts` | 8494 | `bc7da68fd7647053d93a42b753ac5e485d699cf4545831c84b34df9cca853451` |
| `packages/core/src/adapters/libsql/client.ts` | 2372 | `0fa9c5f6b9e81a0b5c0733f7cf908833bac74c08461eef9d42cdde6bb49a0b75` |
| `packages/core/src/adapters/libsql/driveBackupSchema.ts` | 14707 | `f57f9940a5ed8c6f93bf97dd2da312947be73f5ad96c7646b8ac6e5dc768b36f` |
| `packages/core/src/adapters/libsql/hollowSchema.ts` | 11598 | `cd704a1f2ebcb567a5cd4af15b69935d8cbd4ec75246d99350e601df7c7643f4` |
| `packages/core/src/adapters/libsql/hollowUnitOfWork.ts` | 12224 | `b6434a068b8cbcb8780592390e9bdab5697bb0ed1e938ec220976982eac5036e` |
| `packages/core/src/adapters/libsql/migrations/0044_account_deletion.sql` | 366498 | `c74adb1b00cabbb81440a3fc9128d661fcd81696ad0ced1b52754ac158430df7` |
| `packages/core/src/adapters/libsql/migrations/meta/0044_snapshot.json` | 481396 | `77460304b5f310a4e6befed6fbdc0f59e19a36de5e9fd4156c5ad28e778d01b3` |
| `packages/core/src/adapters/libsql/migrations/meta/_journal.json` | 6651 | `1d97708f2cc7ab3fe9060115883863cf1f708e2f8b28a803fc8ffad787465ffe` |
| `packages/core/src/adapters/libsql/publicDiscoverySnapshot.ts` | 21131 | `965e2084e69a8655c830c12e567af4966fd5a8b779d6bd04aca41f9e273a2849` |
| `packages/core/src/adapters/libsql/purgeSchema.ts` | 4453 | `958c282df9162c3070778105afa3b4f20a7fdc89e256c5bfeefbefde38c6b80f` |
| `packages/core/src/adapters/libsql/regenerationSchema.ts` | 11980 | `56b373b0a7a76542eeb6df1ba448d5d4568555fadbf9f14aa3339346ec52d5f7` |
| `packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts` | 65709 | `23a03b0d1414cd2d83e9c5d48beae198a573f71a2d6efb186b98929cdf255f49` |
| `packages/core/src/adapters/libsql/repositories/accountRepository.ts` | 7363 | `00fbdf4e1250f2d1fa6e0684631488cad64757396f6fb3142bb2958f03d62de3` |
| `packages/core/src/adapters/libsql/repositories/authenticationRepository.ts` | 4573 | `621c99454ff9679645b48d3136d5388fc9ca1fecdf53bdcdfcbe99c2bf51388d` |
| `packages/core/src/adapters/libsql/repositories/batchRepository.ts` | 15856 | `baae8440e0402ee6503010b4d51725c6d6e7a9c98e3a843b4c02d50c92fbb535` |
| `packages/core/src/adapters/libsql/repositories/displayNameRepository.ts` | 2432 | `ee8846b6b7e3b5a3219a67022dbd654018e7dd3a6dc361749031086ab192eba3` |
| `packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts` | 41690 | `f636f47a644dafcef83dfa1acb54ca29632802d098f9a8e12e2e49ad9f5fa274` |
| `packages/core/src/adapters/libsql/repositories/driveRepository.ts` | 39274 | `89c4ca9fbab28adc7290610036668931ccb3587d8b42705d1f62215774be7572` |
| `packages/core/src/adapters/libsql/repositories/exportRepository.ts` | 10021 | `c78de2f182afa4237a0e2a2832df0053d12df348bbc6e9fb0aa86df556de0d42` |
| `packages/core/src/adapters/libsql/repositories/googleAuthAttemptRepository.ts` | 7865 | `49aed45b56c377187e6d998b52d45b7ec6f0b2214b80c9593e1855d9e46c7234` |
| `packages/core/src/adapters/libsql/repositories/invitationRepository.ts` | 7975 | `3e5ebfff626adc66c6b9d4ea418e49e3ef846271957f974658cee95604809317` |
| `packages/core/src/adapters/libsql/repositories/jobRepository.ts` | 5427 | `e839ccf2ae90053ad68207e20d2c7e9d8070040d68cb87238d4195c5afb84c85` |
| `packages/core/src/adapters/libsql/repositories/llmRepository.ts` | 39213 | `3fac8cab0f7e7482457a0c6f8ef627fb38bfe82ea56e8f67bb676334b38fa499` |
| `packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts` | 18187 | `02a91a28b69855bd4288b870b17b1f234c8756e2138800a749b873e894c83969` |
| `packages/core/src/adapters/libsql/repositories/openRouterRepository.ts` | 11304 | `abe57355c1f675da94bb0f6b071e5dae687456558b496b3c4103bf51552fbcb3` |
| `packages/core/src/adapters/libsql/repositories/pdfAnonymousHelpers.ts` | 6154 | `b365d7cbfc9fa7d44dbe893656a61b5e4fd864ca31adb557dda72f2880d3f347` |
| `packages/core/src/adapters/libsql/repositories/pdfHelpers.ts` | 5924 | `8318526e98c61ad2e6f35fdf39d5af19a323de1af740245e611a14b61d12bcf4` |
| `packages/core/src/adapters/libsql/repositories/publicNoteRepository.ts` | 1914 | `daec53385e7cea3072abec8919b69e121fd85849c086a3bb025dcc2a4fb25cf2` |
| `packages/core/src/adapters/libsql/repositories/publicProfileRepository.ts` | 2597 | `f4347860f47a5cdbc98b69189177d5454b856ff643052991daaa9da0bb12de8c` |
| `packages/core/src/adapters/libsql/repositories/purgeRepository.ts` | 39949 | `025cede11e220a34f266dfb86fb9ea1f3bd6a9dfa9a5be02ed5796a743096fcb` |
| `packages/core/src/adapters/libsql/repositories/referenceRepository.ts` | 12544 | `4e22e4b6fe8df1b7300f5c8a5af60d4db749e75682e62bdcaa993e23bbea6ea1` |
| `packages/core/src/adapters/libsql/repositories/regenerationRepository.ts` | 13920 | `75faacac2b2046f1b75cf360d348c6243545bb6c3f5859340874b0520e6de565` |
| `packages/core/src/adapters/libsql/repositories/sharingRepository.ts` | 7900 | `09f920e7f9569d75abb2b015721187bf9e18497b009fc5f3529e4797f08495c9` |
| `packages/core/src/adapters/libsql/repositories/workspaceRepository.ts` | 8087 | `9849b60c65631911b731bf28af9b82c925f86c9176905a24e3a430cdf240e6e4` |
| `packages/core/src/adapters/libsql/repositories/zipDeliveryRepository.ts` | 4347 | `3bdad157afb583e38a7e58a6f33b9e8979439f03df5ecbab36928cc58c0c2b7d` |
| `packages/core/src/adapters/libsql/repositories/zipHelpers.ts` | 14096 | `68c26cd212c2de85070efeb431e1deed992106af0a4c77c96e5e4c58290cb134` |
| `packages/core/src/adapters/libsql/repositories/zipWorkRepository.ts` | 16051 | `e4fd34fc71bd481edc27e075b57b0ea789ca2bdff427ce9536be6c837af89850` |
| `packages/core/src/adapters/libsql/schema.ts` | 919 | `9a94c65f2fa63719e120a3863abf68ba746a3e16564e226cb191cbc6d2f98f14` |
| `packages/core/src/adapters/node/__tests__/coordinatedObjectStorage.test.ts` | 15123 | `871b2a0a3714ed005d3bc77a98ee85d962f2a68b1ceaf2e10e74f158b37e3951` |
| `packages/core/src/adapters/node/auth/config.ts` | 3235 | `4b6cace2b6f45dd9e13c0e3c31fc60409853d68e1ed6ec0b5fd639ee67083490` |
| `packages/core/src/adapters/node/auth/credentialLocalTlsDial.ts` | 10249 | `e8a97c5a8e4310b5a2c13b57858041450ac522a0f303ca5ee1f760d4994425e0` |
| `packages/core/src/adapters/node/auth/credentialRuntimeOwnership.ts` | 19325 | `e07cd78565fe7e7b94480fc1253495d3360f24cc3b11c5027f6ad1a83dfb9dcc` |
| `packages/core/src/adapters/node/auth/googleHttp.ts` | 4822 | `a89479a2729bfd49d4a866239d35e38bd56bae37ba2c94e43b48d1bfb4266d14` |
| `packages/core/src/adapters/node/auth/googleOidc.ts` | 8997 | `7d2a3427afeb06ee304821b8979443a90d97b47c16249533a0b982852ad186a7` |
| `packages/core/src/adapters/node/authenticationExecution.ts` | 4807 | `a4cf2349d298d315ee609dcb4ca2d9ef5f4862ee194220912629309921bcdb7b` |
| `packages/core/src/adapters/node/drive/execution.ts` | 17151 | `de88261f15b303732f095e85f626cc722d8b88486c52b628ee72cdd0ef958d09` |
| `packages/core/src/adapters/node/drive/runtimeOwnership.ts` | 8286 | `f9d04799b5da89f5306abbe2459f20eec188be81fad187dd6b5889295a1890c5` |
| `packages/core/src/adapters/node/openrouter/config.ts` | 3172 | `b14711a4086526e309ccf2ed04bc4aa27cc38972d5a25636818397923ab0860a` |
| `packages/core/src/adapters/node/openrouter/execution.ts` | 3711 | `4f6977a3ab2dbd0c861f39c24a1ad4242758f6706baf0a3572de58fec138706f` |
| `packages/core/src/adapters/node/openrouter/http.ts` | 6692 | `8de96984dc935315ce7b6ebcf00bbf36bf5cc69266e299449262dbbbac97d1b3` |
| `packages/core/src/adapters/node/openrouter/provider.ts` | 13688 | `1656363bdb117c2aaba51694f67c369bc7a3843e3f2cc167e6f1cd7f221c13d5` |
| `packages/core/src/adapters/node/purgeRunner.ts` | 1202 | `ee5ddf0c958d93343cf343aa3e2e9c35ea6e5d3541be6fc198c56e0b23634a22` |
| `packages/core/src/adapters/node/zip/ownedStorage.test.ts` | 20521 | `a08866400fff123555fbbc5505978328b44f0cd5901541fdb2761598b706364f` |
| `packages/core/src/application/account/deletion.ts` | 1542 | `da08ec61121843b2e1734609ece2050aa6c4544b20c81db648af40e55345c021` |
| `packages/core/src/application/account/deletionWorker.ts` | 8150 | `efe1164dbe04e57368955b9b6387c7cca121ae6b11f53774436934766f6cacfb` |
| `packages/core/src/application/account/google.ts` | 14366 | `da9cf5609e0a6ef79f4e6631668c99c879ec13574225c95ef85b5243fd174ca3` |
| `packages/core/src/application/account/ports.ts` | 3641 | `a2cab0e0551497dac82a0225013dc6dfb052e53b43081148f27c622158f3c3cf` |
| `packages/core/src/application/execution/hollowUnitOfWork.ts` | 7354 | `df283ea3e7e50d76f982dbd6848494234502a220b7d16fc4ff1b0abf64a0854f` |
| `packages/core/src/application/integration/drive/ports.ts` | 6949 | `c6e47c5541c4bd8b9299efa1cf482b5e8484fd9957431fc8d8e4f7225dd8d97f` |
| `packages/core/src/application/integration/drive/runner.ts` | 25186 | `d8aca1e28924ec29f5f626bce2f5501c9c4c47489f15652b49747dc47f1f93bf` |
| `packages/core/src/application/integration/openRouter/connection.ts` | 20313 | `3d9ad014cc51d204b190bfa809d08ada1dc266c73d5ed66fbedd3c34fd5a5afe` |
| `packages/core/src/application/integration/openRouter/ports.ts` | 3421 | `2e09844e0a28e194133ef20aa9269b1f077a9ed3de8ba022bf46a463aa8702b6` |
| `packages/core/src/application/note/purge.ts` | 14979 | `9cb3636376fd575fb6b6ecf95215fe561675a2e6ecce8a694d509ccae99992f0` |
| `packages/core/src/application/regeneration/current.ts` | 7956 | `edf3d64c07ecbb6aefb910f4d60d32568972369dff151f4340f7d926012eb443` |
| `packages/core/src/application/regeneration/ports.ts` | 1654 | `28f9cb42110e538307f2dc3b0ff3b146c33c3edf78878699836bbe438f03768d` |
| `packages/core/src/application/regeneration/read.ts` | 5318 | `a2179df7f048ef0ee9a43b97c0b8a892aa5297252b6a1ba1e50fcb5ebded06f3` |
| `packages/core/src/application/regeneration/source.ts` | 11589 | `b8b5d5a9ea85036788fe96480d73496a9e64c02d251bc67ac2a96f16c7a883fb` |
| `packages/core/src/application/workspace/access.ts` | 2693 | `b95a3b77babd2754496d0e72cfeaa107f92a3019453e825809806f99331b4c64` |
| `packages/core/src/application/workspace/delivery.ts` | 7389 | `78f644005ebfd35573c2fb10d9a904326c066e6b0f152820b94d53f903863fee` |
| `packages/core/src/domain/account/deletion.ts` | 4492 | `49bdd4e4c17e66b660a22cb12aac40d62967295509b79ba20599bfa3efdd977c` |
| `packages/core/src/domain/account/ports/accountDeletionRepository.ts` | 2987 | `dfc03e777c476c667edec875dcf82bcc4c9728398415e213e12cb0e03761b411` |
| `packages/core/src/domain/account/ports/accountRepository.ts` | 985 | `18fb8a4498ceedcf0d04985f782d0cc4d921305935c96589f6037283131fc6fd` |
| `packages/core/src/domain/integration/driveBackupRepository.ts` | 5396 | `399f1b91efb0b1ccf72ac154d8cfef5cb5af0217920fb384c2d66f60943b4fcf` |
| `packages/core/src/domain/purge/entity.ts` | 2641 | `62b20045c30c37ef230f1c6fe84a78b8202ed5a1b52e1f5250bb965e27a9c91d` |
