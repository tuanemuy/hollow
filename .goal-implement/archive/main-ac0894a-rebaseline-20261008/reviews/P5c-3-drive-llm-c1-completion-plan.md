# C1-P1 completion detailed plan independent review

Verdict: LIMITED FAIL / CP-CAPTURE1. The detailed rollback/retry predicate is not implementation-ready. The original sameproof, withOwner callback, no-DDL and exact-terminal directions remain conditionally supported; no product/runtime defect or native failure cause is inferred. Source/helper implementation and actual execution are not authorized by this review.

## Independent scope and exact inputs

I authored the earlier C1 direction plan, but did not author the new completion-plan, fields supplement, sameproof pending state, typed Tx recorder, exact terminal/rollback predicate or Drive-only recovery scheduler delta. This independent review applies to that new delta only. Earlier C1 direction is borrowed from its independent review rather than newly called independent work.

Fullstable PUBLIC documents directly read:

| Input | Bytes | SHA256 |
|---|---:|---|
| phases/P5c-3-drive-llm-c1-completion-plan.md | 15975 | 0cb474551a483f0ff328fd419e1e89416bd05976861af76bf08072841ae4f094 |
| phases/P5c-3-drive-llm-c1-completion-fields.md | 22037 | 41b26b3539286a36b182e5e1513240d40aa27344b40f309f9c22fb16e675fd46 |
| phases/P5c-3-drive-llm-c1-plan.md | 24158 | fb729a8a5ffec19b85fb9661112b559d8c3a998ce0bef56512e929b7e5a7d94b |
| reviews/P5c-3-drive-llm-c1-plan.md | 9875 | 5a3190204aea7ab0021237f0f8cf495753952ebd8789dea6048c825c8253ad8c |

Each is canonical regular/nonlink0600/UID501/nlink1, O_NOFOLLOW fullread/hash, initial/final lstat/fstat dev/ino/mode/UID/nlink/size/mtimeNs/ctimeNs stable, actual FDclose. Their complete bodies were read; the first combined display exceeded tool output size and was replaced by separately bounded outputs. Source targets were never selected from truncated content.

Controlled SOURCE is /Users/hikaru/github.com/tuanemuy/hollow-p5c-drive-machine-721bc7ad-20261006, frozen176ea15b572c610e97f99a021ea94e2ba60637c7 by Root acceptance. Named20 plus fields20 plus NodeLLMrunner de-duplicate to29 exact source files/286776B, all fullstable0600/nonlink/UID501/nlink1/canonical/fullSHA and memory Gitblob identical to accepted tables. No Git/current HEAD/worktree status/full-source walk or subprocess reader was used. Commit/freeze/C0F2 local PASS is borrowed from Root's accepted review9481/SHA60414df31cb06afc46f67b3e64e934e138e1310df8d3c8f1b45af0f33a74b16d. Source reads are only the accepted29; supplemental line extraction rereads known same files with stable SHA, no new paths.

## CP-CAPTURE1: rollback snapshot is captured after an earlier write

The fields proposal puts its one data-only recorder call immediately before completeLlm, then treats generic/dispatch/quota snapshots as the original prewrite state for rollback-only confirmation and same immutable callback retry. These are different observation points.

Exact original failure path, application/llm/worker.ts:616-652:
1. find same owned LLM row; reject different owner/runtime.
2. if dispatchId exists, await u.llmDispatches.fail(dispatchId,owner.token,failure.delivery) at628-629.
3. determine closed/error outcome, then completeLlm at645-651.

Exact original adapter, adapters/libsql/repositories/llmRepository.ts:1031-1050: fail updates only an intent row with the same owner token, to not-sent or unknown. The original terminal completeLlm then calls releaseUnsent and scrub at application/llm/completion.ts:62-63. Adapter scrub:1052-1063 changes response rows only to scrubbed and nulls content/token columns. releaseUnsent:1152-1201 checks terminal owner, rejects sent states outside prepared/not-sent, and updates the reservation/bucket only by the original rules.

A source-supported rollback example, not an actual claim: an intent dispatch takes a known closed not-sent failure path. The failure Tx first transforms intent to not-sent. A recorder immediately before completeLlm sees not-sent. If that Tx later rolls back, the saved DB dispatch is still intent. It cannot equal the captured dispatchBefore=not-sent. The proposed exact-before predicate will hold instead of reaching its promised same-callback rollback recovery. For possible-delivery failure, the corresponding intent to unknown transition has the same timing mismatch. No invented error/message/proof or runtime fixture is used to establish this static counterexample.

Success has the same distinction for other write-set members: worker.ts:533-539 commits note/body/projection, :540-549 saves Original and :550-583 replaces notices before completeLlm at585-591. A late Original/body snapshot cannot be called the rollback prewrite snapshot. The issue is in the new detailed plan's capture contract, not an instruction to reorder original local/PDF behavior or change producer/repo semantics.

Required correction, accepted in direction by Root during review:
- Capture the complete typed prewrite snapshot inside the SAME original Tx BEFORE ITS FIRST WRITE: original LLM/generic/dispatch/quota/Original/source binding data relevant to that attempt. Keep it private/data-only and do not include response/body/credential/private proof copies.
- Separately capture the post-current-guard completeLlm base/version, original outcome and original clock value used for that terminal write. This is terminal expectation, not the rollback-before snapshot.
- One typed recordAttempt call may carry both snapshots after they were collected at their proper original positions; its call location alone must not replace a before-first-write read.
- Rollback-only read compares the true prewrite state. Exact saved-terminal read compares the derived postwrite expectation and original same proof/consumed identity.
- Existing dispatch.fail/scrub/Original/body writes and original local/PDF order remain unchanged. A read mismatch stays held; do not weaken the predicate to make this example pass.
- Current rejection after confirmed rollback returns the same error to the original withOwner failure path. A new failure attempt is permitted only after the prior attempt is proven uncommitted, using that original failure branch and fresh proper snapshots. Never overwrite expected outcome/version/time from observed terminal data.

This fits the already proposed worker/ports/NodeInput source group; no new DDL/repository/storage/native port or product path is needed merely for the design correction. A corrected document/type contract must be independently re-read before writer adoption. Candidate typecheck cannot replace this temporal design proof.

## Supported sameproof/input closure direction

application/regeneration/memory.ts:55-81 uses inputConsumer, original verify, owner!=unknown, and Drive binding every attemptReleased. Closed receipts require memory0 and sameproofId; active receipt writes proof.receipt/memory0 by original CAS. Only normal UoW return proceeds to original consume. It does not make current authorization/deadline/cancel0 a prerequisite for saving a genuine closed input.

NodeRegenerationInput.finish:733-765 caches the original proof in its WeakMap, runs finishInput, and on DatabaseError can confirm saved memory0/receipt/owner-not-unknown/original verify/same receipt before consume. It then deletes its lease/source/retained entries. NodeRegenerationMemory.finish:408-424 and verify:426-441 bind the original proof reference and lease entry; they do not authenticate a clone. consume:443-448 removes the entry and records proof to SAME lease in consumedProofs; consumed:450-451 checks that exact relationship.

The proposal correctly distinguishes:
- same runtime genuine proof/lease/callback retained in private state;
- a consumed proof, whose original verify can no longer succeed because its entry is removed, from a still-unconsumed proof;
- saved closed input memory0 from later terminal ownerclosed;
- original Drive final-check actual close/caller-ended/saved read/void ACK, from logical receipt equality;
- predecessor recovery capability from the current original callback/awaiter.

The saved-read addition must include the original attemptReleased condition even where the current DatabaseError catch does not repeat it. The proposal explicitly requires that condition. Cancel/deadline/current loss can forbid body adoption without falsifying an already genuine input-closed receipt. Native/read/ACK unknown remains held before genuine finish ability; no new proof is manufactured. No second ACK, boolean ACK success, or clone proof/closed lease re-read is supported.

WithOwner must still surround prepare, dispatch/restore/sanitize/projection, final-check/finish and terminal/failure callback. Merely delaying finish after the existing prepare-only withOwner callback has returned would not satisfy this. Input map cleanup is not an owner lifecycle receipt; the new private terminal state must retain original consumed proof/lease and original callback rather than revive deleted memory Entry/bytes or use input.owns as consumed-proof evidence.

## Exact terminal fields and original write-set

The following detailed mappings have source support:
- domain/llm/entity.ts:135-143 has succeeded.noteVersion. SQL result_version is encoded/decoded by the original LLM repository; no new public row.resultVersion property is justified.
- Generic ConversionJob has the existing identity/state/failure/lease fields, not an invented CAS version/owner/runtime/inputProof/resultVersion. Source noteVersion remains the original source version.
- completeLlm:16-20 writes previous.version+1 by original CAS. :44-61 sets terminal, original owner closed, responseBudget0 and original now. finishInput alone does not close the owner.
- llmRepository:450-473 maps the original generic outcome to state/failure and clears its lease fields in the same Tx.
- dispatch.scrub changes response rows only; quota.releaseUnsent considers the BEFORE-scrub sent state and original reservation. The fields proposal's terminal mapping matches that original order. Shared quota aggregates must not be compared to a private old job snapshot, because other legitimate jobs can advance them.
- An exact terminal predicate must bind every immutable LLM operation field by the preserved before snapshot, including recipe/access/source/command and same proof/input generation/runtime/token. An explicit list must not silently drop admissionSequence/instruction/model/retry/createdAt/deadline/sourceState/sourceCoverage fields merely because the text abbreviated the identity list.

A source guard for a new body commit and an exact saved-terminal predicate are different. After a true commit, normal subsequent edit/undo/current credential change must not require the old current note.version or pending-only currentLlmSource to re-adopt that body. Conversely, a terminal same-token row alone (the old worker624-626 branch) does not provide the new expected outcome/result-version/attempt/proof confirmation. The proposed Drive-specific branch must keep those checks rather than weaken the original generic/local branch.

## Type-level outcome narrowing to retain original semantics

The proposed DriveLlmCompletionOutcome excludes LLM_OWNERSHIP_UNKNOWN from failed.code, but leaves LLM_DELIVERY_UNKNOWN in that failed-code set. Original worker.ts:639-644 maps a closed LLM_DELIVERY_UNKNOWN to kind unknown/code LLM_DELIVERY_UNKNOWN; it maps other closed failures to failed and gives cancelGeneration priority. The new type should encode this original mapping: failed excludes both ownership-unknown and delivery-unknown; delivery-unknown has its distinct existing unknown branch. This is a small required boundary/type clarification within the proposed scope, not a change to the original domain LlmOutcome/codec or a claim that a real invalid row was observed. Original delivery/quota/refund/resend semantics and unknown-native handling must remain intact. Candidate strict types and negative logical tests must confirm the adapter cannot select a broader alternate mapping.

## Drive-only scheduler and stop qualification

Original NodeLLMrunner:10-34 serializes sweepLlm, preview sweep and prune in one active Promise. stop:40-46 currently sets stopped, clears timer, awaits active, then original execution.stop and leased-text-only stage.stop. That old order is insufficient if new sameproof callbacks remain pending.

The new Drive-only design can use the ORIGINAL timer1/2000ms and original active slot:
- stopped synchronously bars new claim/preview/prune issuance, while already-issued active work retains its declared original handling.
- preserve existing timer during original execution.stop, schedule immediate recovery-only wake, and use later ticks for latepending.
- recovery performs only same cached finish/terminal Tx/read/consume; no new begin/read/prepare/generate/project/ACK or preview classification.
- distinguish completion-current rejection delivered to the waiting original callback from an actual maintenance recovery error; only actual recovery errors become sticky stop failure. Otherwise the required normal failure-handler continuation could be mistaken for a fatal maintenance error.
- cache the same stop Promise, retain original rejection and first true recovery error; finally clear the existing timer and await active recovery, then check remaining pending/held state rather than treating Map-empty as native close.
- caller drains must settle successfully before shared Drive finalstop. No direct resolve of execution.done/deferred, new proof/ACK, extra timer/deadline or timeout-to-success is permitted.

Source evidence supports the existing timer role and LLM_LIMITS.concurrency2 declaration, not an actual private pending/byte bound or normal stop execution. No start() API should be invented for this runner. The final candidate must close stop-before-initialmicrotask, already-active sweep, stopping latepending, repeated stop, recovery error and original stop rejection with typed logical tests. Test scope remains the three adopted planned files; actual/native lifecycle evidence requires separate future scope.

## Minimal corrected candidate group and acceptance boundary

Keep existing12source/3tests. Required design edits before product writer adoption are the two-observation typed recorder contract and faithful outcome narrowing; immutable original callback/current guard/sameproof/no-DDL/sharedDI remain. No additional source path, schema, codec, SourceInputProof factory, storage API, optional ACK or port fallback is authorized here.

Meaningful negative/logical coverage in those three planned tests must include:
1. intent to not-sent/unknown write followed by rollback: prewrite comparison uses original intent, terminal expectation uses original derived mapping, same callback reissued only after exact rollback; do not synthesize native proof.
2. post-current-guard success writes/Original update followed by rollback versus true commit-response loss: distinguish prewrite from terminal expectation, with body/projection prepared once.
3. cancellation/current rejection after confirmed rollback invokes original failure Tx and waits exact saved outcome; alternate observed outcome/clone proof/new callback/native unknown never releases.
4. consumed proof does not require original verify twice, and genuine samelease consumed identity is mandatory.
5. stopping latepending with no new admission and original stop/recovery rejection preserved.

Privatepending count2/holding bytes, body/response/immutable closure reference budget, test/case runtime/tool limits, actual source-factory/Worker/native resources, disposal/EOF/PG/control/ACK/audit are NOT adopted or demonstrated here. LLM_LIMITS.concurrency2 is a source limit, not a measurement of all retained state across machine/LLM families. Candidate must derive exact union/caps without asserting shared globalExecuting<=2. Full formal typecheck/lintfix/format and proportional source tests remain later separately authorized work.

No broad source-contract flaw, actual Node-6 cause, normal product/native success or full criterion completion follows. Earlier no-DDL generation/shared binding direction is borrowed as supported; C0F2 local SOURCE PASS is not C1 runtime evidence. C2P5dStoredAccount, C3GET/POST/React/UI/main/build/browser and normal external provider use remain separate unfinished phases.

## Exact SOURCE evidence table

All29 unique paths are under the controlled SOURCE root above. Each original-body fullSHA plus memory Gitblob was checked without Git execution, with stable regular600/nonlink/selfUID/nlink1/canonical and actual FDclose. The table is evidence of accepted named-file content only, not a whole-source walk or current HEAD claim.

| Relative path | Bytes | SHA256 | Gitblob | Borrowed table |
|---|---:|---|---|---|
| packages/core/src/application/llm/request.ts | 15334 | 32991083aa133c3c092b80e2bada555d2f12e7d97913950d3746a178ec0697ca | 67e45a76ddd7e37f3639bf1eeeaafe263dcc5c0a | c1-plan,fields |
| packages/core/src/application/llm/current.ts | 4253 | 7f31a9c440bb07e1cddc00c0dc574144334fa7e50dfaa91c3a19d1332d0c550b | 702d637a55bacd161702ec5b3c2fd273b8011b83 | c1-plan,fields |
| packages/core/src/application/llm/inputStage.ts | 3675 | 58ed11dec749e0cf5616d1bcbb1bbfe141ee0797dbf3f06195d54da94ede75f2 | 9aefbe55232cabc9ed70d0c438b6900cb5c13623 | c1-plan,fields |
| packages/core/src/application/llm/ports.ts | 10214 | 48dc60e09ff1001c9af41e04e94b9a51392bc69b1c28702d5acea598f656529e | 143e893bf5853afbb4b4c6bc8d2e690d7bf29b05 | c1-plan,fields |
| packages/core/src/application/llm/services.ts | 1218 | 75a4324f195ab2b17410a9a6efd92063a9382266781cfe9b09c16abd621047c0 | 888c774e8aae06fce42a6ba3f1348e4e828de13e | c1-plan |
| packages/core/src/application/llm/worker.ts | 32277 | 0f2e0837dc29b2577deb556ebe1ff58b11437ef6ac46b754569a5f177eb2ddc6 | 8b54a79d19c84336fc4ba642064a2182600fe527 | c1-plan,fields |
| packages/core/src/application/llm/control.ts | 5798 | 2ac1a54ea5d8fcb61514b1c19c7af580f39c229e08220231dec97f00acc961f6 | 930229045b2b008ded4d2148901642f67e4c1132 | c1-plan |
| packages/core/src/application/regeneration/driveRequest.ts | 4241 | a292915b8a279d4aab43e352e92a157cba4850bde1a2c155647aaaeb05480250 | 30cf6a6e3aa649ff657fdd76e6677b508ae170d2 | c1-plan |
| packages/core/src/application/regeneration/current.ts | 11509 | 5f0b1f3acd48ca34467b31fd326b24eb715bd663c2988c97ad84f7f7cd49c271 | facd27e12f920a947900d3b18fa346ab998bbccb | c1-plan,fields |
| packages/core/src/application/regeneration/services.ts | 9713 | 657b34347525567295cd4ab5e85a136881a646aace734ea011882fbd9294d561 | 85bf4fe1d2ba2ef6437adbf992a8aa170ecc05a4 | c1-plan,fields |
| packages/core/src/application/regeneration/source.ts | 10359 | 3340c3080cff87dd9c0abdbd7ec9285e3ab91be826627462351db62d29965cc4 | ea3da61313a296d61b13e59f20b5f66622aaed16 | c1-plan |
| packages/core/src/adapters/node/regeneration/input.ts | 27320 | 4c17625f85f756446f1a722b94c50d17d7d334efa0494ca1419df900253e5210 | 57704db4166b917e9518ff0a7bd0a2f2775a719b | c1-plan,fields |
| packages/core/src/adapters/node/regeneration/config.ts | 4627 | eda86c56324da8e7a8c115887d70777ed7e2198c154ca886d367af6974c94ee7 | 6783a8fe5ba09d1fccc153cad30eb983805e0621 | c1-plan |
| packages/core/src/adapters/node/llm/config.ts | 2326 | 43ead1b8d9aff85a0d8be38a0258510842d3de2adc426cb0aaecee5d678f240c | 5c52349bbd84944905460bb8a0915f592c05906c | c1-plan |
| packages/core/src/domain/llm/entity.ts | 7524 | 29fc41d9f9e7f66724547cfc7de61726f45752c006ca184326e28993e155c8fd | 54e930cabbcbb4e8efc1647968c5187dc3ad4301 | c1-plan,fields |
| packages/core/src/domain/regeneration/source.ts | 3296 | 65704cc89ec4c57e6a72f6c39873fa46dd3fc25d81c69ac7c5065da2cff496c0 | 42de64a82c5f19002b3a072a52d6dc3e54880a6b | c1-plan,fields |
| packages/core/src/adapters/libsql/repositories/llmRepository.ts | 39043 | 13335b88bc15effd4a19e22790e103e966a33f5c7849cb1f29eac5606fd75b62 | 839a60bbf395604abad78dcf03e90c1f31df56b7 | c1-plan,fields |
| packages/core/src/adapters/libsql/llmSchema.ts | 19956 | e29bce7183b4f86c232fcfc861875cb316a99959e6a7c89aeca0f3987b8ba5d3 | 9f9792aa93c12490b6b8789b4af37c9a08381343 | c1-plan,fields |
| packages/core/src/application/integration/drive/ports.ts | 5980 | 527e530fb08854373e2736614c344a4310e8fbb75b412ce76a6771cbab011ae6 | aaea3d0bb5aad901f75a08c22537a51efc9dd1b5 | c1-plan |
| apps/web/app/server.node.ts | 28896 | 277245b5a27a7a72ae7b1478f0d6bff066e39c453bd53f9e85b6c0eb7f489310 | 0a6072eb2f69fdefc0e996204a095af9b266dc85 | c1-plan |
| packages/core/src/adapters/node/regeneration/memory.ts | 15434 | 2264632b4eb4703e2b445a21e66980545b8d74ef7b77e303909617edaf715bbd | ff942a1c81ab2512b45b310dd0e644af904260d0 | fields |
| packages/core/src/application/execution/hollowUnitOfWork.ts | 7199 | c22d1dcff055a6e015ba1731840951c4295c23e9eb615323b851f9e4990f3a94 | 0e35f36f2ec455012ec1459d041be34f5ec5472a | fields |
| packages/core/src/application/llm/completion.ts | 3105 | 47f05252131da3f64705885c7c71a57a2c83e2fdf65dfb8e5505c4f547574e08 | 0d9611438d32fe35180b68ba21445251248c3e4c | fields |
| packages/core/src/application/regeneration/memory.ts | 3281 | 914ef68f217941417472d4d21730286f132a44cda31b7558bcab2ab56ecbe23e | 602758743d6810b42fb5e30515c5533595f08a6c | fields |
| packages/core/src/domain/import/entity.ts | 3921 | 727534315f86b400a6f927d40aa0dd5d2b8d6a61e37631e70609e0212446bc86 | 8c9bf3f749f9e7d6322f3604a8d0a7b7f6808bb7 | fields |
| packages/core/src/domain/job/entity.ts | 885 | 55cbfee14e5a341ad15bccfccbc62a81af2bcb5dedca50621863a66e82814cf8 | 3344919e7311f65e20b00b86d22c997c6949b945 | fields |
| packages/core/src/domain/job/ports/jobRepository.ts | 884 | f62be73d988a9e3c8f91058b1a8bab9ed6f48ba8c4f3dd47410798c0ff86883b | a1064d1f11afc8260b7e7fd175e905bb3250b511 | fields |
| packages/core/src/domain/llm/repositories.ts | 2868 | 1185e395f35781f2f878a706be89b2a31459708005fb860aa8d2d1370813707b | d98da42096fb24a0077f68ff06e0f7acb58ccab2 | fields |
| packages/core/src/adapters/node/llm/runner.ts | 1640 | f9a7a1e9308a80230ea641b25705442dea3b8287b4095b5cdfb897eaa6b30770 | 0670221961dc57966f36faece97c88a18391e33a | completion-plan |

## Stop

Only this new review is written wx600/O_EXCL/O_NOFOLLOW/fsync, actual output FDclose and stable full postread SHA. Source/helper/product/Manager edits, actual tests/Node import/default/DB/native/browser/worktree/rootprobe/creation and all private/root operations are zero. All source/helper/report readers and writers STOP after fixation. Return CP-CAPTURE1 to the detailed-plan authors for the minimal correction; no automatic implementation, retry or further read starts here.
