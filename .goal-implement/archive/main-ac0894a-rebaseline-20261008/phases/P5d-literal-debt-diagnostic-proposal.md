# LD01 — public-only diagnostic proposal

Fixed at 2026-10-06T07:23:57.908156+00:00. LD01 actual failed with AssertionError; checkpoint and native/owner/receipt cause remain UNKNOWN. This is a source-supported explanation of missing observation, not identification of the actual failed predicate. No source/helper changes or fresh actual run are proposed as already authorized.

## Public source findings

The candidate source is `e1e07e51d0726d92b54e14dcd05adc4efcfe11cb`. The necessary inspected scope is two public files in the adopted P5d checkout:

- `packages/core/src/adapters/libsql/__tests__/accountDeletionLiteralDebt.integration.test.ts` (11219 B, SHA256 `4f7f4df2cf30c9f32824ff18665698437344337dc2ed86ff978cb0764c8ac79d`).
- `packages/core/src/adapters/libsql/__tests__/accountDeletionLiteralDebtFixtures.ts` (18417 B, SHA256 `50133913a3dc8c7faf4059ee3c1ff4963bfc3b7b65ac8de2f743b0693d3861fb`).

The test's beforeEach `onTestFailed(() => f.fail())` changes only fixture failure state. It does not publish `case-failure` or checkpoint metadata. The complete LD01 body has no checkpoint variable, marker, or frame writer. The original assertions flow to Vitest unchanged: the enclosing finally releases the original gates, awaits the original caller promises with allSettled, and restores the original methods. No error.message/stack/SQL/receipt is emitted by this observer. Fixture guard/factory catches set failed or clean up and rethrow the same original error. No new wrapper is needed around the formal Drive calls to retain this behavior.

The public loader `.goal-implement/helpers/p5d-literal-debt-loader.mjs` already accepts one bounded `P5D_LITERAL` case-failure frame containing only event/case/checkpoint; it validates `LD01` and the fixed 24-key allowlist (lines 36, 253–260). The public runner `.goal-implement/helpers/p5d-literal-debt-runner.py` validates the same frame and permanently denies normal success when present (lines 275–283, 308). These consumers cannot invent a frame that no test producer emits. This is the static cause of missing checkpoint observation, independently of the unknown actual assertion failure.

Loader onTestCaseResult records case failure and captureErrors preserves only the configured class/native-code/statementIndex projection. `statementIndex` is emitted only for serialized LibsqlBatchError with a bounded integer; AssertionError yields null (loader lines 285–298, 342–350). Native code outside its allowlist becomes `none`. Consequently the observed AssertionError/nativeCode none/statementIndex null cannot localize any assertion. No raw diagnostic data is needed or recovered.

Fixture close always uses the original execution.stop/passwordHasher stop and original client.close in finally. If onTestFailed marked failed, it intentionally skips normal FK/checkpoint/fileGuard and does not emit the fixture-closed success frame (fixture lines 518–544). afterAll hook ended is therefore compatible with absence of a normal fixture-closed frame. It proves neither checkpoint success nor physical native/DB closure. The actual safe receipt cannot determine whether any particular cleanup resource fulfilled.

The transparent native withCaller wrapper awaits the original settle and only then waits at the caller gate; acknowledge awaits the original native method, records its original proof/reference, and returns its original result. Source inspection exposes no definite failed predicate here. No native or repository implementation expansion was necessary to explain missing metadata; deeper reads without a failing location would be speculative.

## Smallest candidate scope, subject to Root adoption

Only `accountDeletionLiteralDebt.integration.test.ts` needs a passive checkpoint producer. Keep original formal assertions, return values, method receiver/arguments, original proof identity, cleanup/finally, case/time bounds and fixture unchanged. Add a test-local variable whose value is an existing fixed checkpoint key assigned immediately before a finite group of original statements. Register one onTestFailed observer that calls the existing f.fail and writes one fixed-schema frame containing the last key (never an assertion value, error, id, path, proof or SQL). The official failure hook observes the original rejection; it neither catches/replaces the error nor counts any failed predicate as successful.

Use only the relevant existing keys: entry, begin-three, third-proof, gates-ready, active-two, delete-accepted, anchor-intent, session-fence, attempt-page, attempt-membership, verify-held, held-obligations, release-callers, ended-proof, retry-fence, final-verify-and-cleanup. Keys denote the next original statement group entered, not a completed operation or closure witness. In particular entry covers the complete-C path before the A/B try block, and final-verify-and-cleanup never certifies the entire cleanup. No getter/Proxy/constructor/message/cause inspection or arbitrary expected/actual value projection is needed. Failure-observer write errors must remain fail-closed and never create a normal frame.

Existing loader/runner schema already accepts these keys; their gate/normalization definitions need no diagnostic change. Only source commit/source2-entry manifest/head and helper source-binding dependencies would change under a separate adoption. Source input/proof/ACK/native guard and formal Drive assertion semantics remain untouched. A new fresh-root literal and any actual execution require separate Root approval; all old roots stay nonoperative. No deadline increase, sleeps/retries, raw-error recovery, aggregate PASS substitution or unverified resource closure is warranted.

## Stop and remaining limits

The separate actual report records Root's fixed safe receipt: `.goal-implement/phases/P5d-literal-debt-actual.md`, 3920 B SHA256 `f8489dd5449c98549e7661a9907892dfb8e0e2947c7e0a3ec8c50f0098383f71`. Audit NULL/held and LD01 failure are retained. No actual failure cause is established; genuine literal2/caller/ACK/resume acceptance remains absent.

New private reads/stat/hash/import/copy/reopen/cleanup/run/probe are zero. Candidate/source/helper mutation is zero; S5 candidate is entirely untouched. Public proposal writer and all public readers now STOP. Root owns next scope/acceptance.
