# P5c UI normal-job / libSQL PUBLIC bindings plan

Status: proposal fixed for independent review; helper creation, source/archive creation, worker build, preflight, actual run, native import/dlopen and root probe remain unadopted. UI Node-6 cause remains UNKNOWN. Root accepted previous plan 20251 B / SHA256 079fc7e3ab321080e5547a1c420407019201c028d07cec2401729ad4b0275baf. This document replaces no existing receipt or helper bytes.

## Scope and provenance

Read only immutable Git commit 79ef126edd5d3440cde20dbe8fd372e7235010c5 and exact public installed dependency files. The declared source closure has 327 files / 1,920,009 B; canonical manifest SHA256 is 4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206. Each source file is below 2 MiB; cumulative Git source reads, including repeated bounded extraction, remain below 8 MiB of the adopted 32 MiB budget. Source import collection includes type-only dependencies; presence in this set does not imply execution. Migration JSON/SQL are public source, not observed database content.

The source graph was followed from known import literals, Root-selected account entries and the formal worker-build script. One Git mode collection read a wider immutable core/src and worker/scripts names/mode/blob listing. Root accepted using that existing metadata only for the known 327 path set. Unselected names were not new source seeds, were not read as blobs, and prove neither unknown-entry absence nor whole-source verification. Selected mode/blob binding matches the exact table below. Working source, current HEAD/ref, .env, untracked files, B files, all failed/successful private roots, DB/key/proof/log/TMP content: read/stat/hash/import/copy/reopen/cleanup 0.

Public package reads used canonical regular files, O_NOFOLLOW, nlink1/UID501 and stable lstat/fstat identity, bytes and full SHA. Native JS sources were read as text only. The libSQL binary was hashed twice for metadata and Mach-O registration-symbol inspection; no binary execution. Public package/source extraction retries after editor-output truncation were readonly and were not test retries. No fixture/source archive/root has been created.

The previously established client.ts and serializedClient.ts b6/79 blob/bytes/SHA equality is retained. The existing UI boot also calls formal createLibsqlClient. There is no claim that b6→79 changed this wrapper, no raw-client-vs-formal-client UI distinction, and no inferred past native cause.

## Source graph and normal setup

Use one source module graph from immutable79; preserve original exports, BusinessRuleError/SystemError, client/factory identity and resource methods. Do not use compiled old-B server functions, change product exports, or synthesize verified account records, native brands or successful receipts.

| Boundary | Exact original source/API | Normal fixture use |
|---|---|---|
| Database | adapters/libsql/client.ts: createLibsqlClient → serializeLocalClient for protocol=file; applyPragmas; getDatabase | One fresh owned file database, local-only options. No authToken/encryptionKey/syncUrl/remote URI; original defaults retained. |
| Transaction | adapters/libsql/hollowUnitOfWork.ts: LibsqlHollowUnitOfWorkProvider.run | Original Hollow provider returned by createHollowContainer. Template serverNode.ts/unitOfWork.ts are not the Hollow fixture provider. |
| Base container | application/di/serverHollow.ts: createHollowContainer(db, appUrl, mailer) | Original password hasher, tokens, clock/id, sanitizer, UoW. Synthetic Mailer port captures one verification mail in memory, sends externally 0 and emits no token/body. Logger sink discards raw values. |
| Account | application/account/signUp.ts → verifyEmail.ts → session.signOut → signIn.ts | Fresh synthetic example.invalid email, compliant password, termsAccepted true, no invitation. Parse only the normal verification URL into memory; pass the returned browserToken, then sign out and sign in through original APIs. Require original session lookup to resolve verified account; no direct DB status mutation. |
| Authentication coverage | These original APIs have optional AuthenticationRequest | The source fixture may use the normal internal request-absent branch; that is not browser authentication fencing, RSC/HTTP bridge or actor-epoch UI acceptance. Any request-context branch would require its own exact normal binding. |
| Storage | CoordinatedObjectStorage(directory, originalUoW, clock) → recoverOwners() | Constructor starts original exclusive writer/recovery procedure. Await recoverOwners before uploads. Exact withObjectOwner/withOwner perform normal upload/job ownership. Fresh-root protocol must refuse an existing owner; no unknown PID probing or recovery test. |
| Upload | beginUpload(container, session.token, input) → acceptUpload(container, token, returned id, original ReadableStream) → sealUpload | Two original source calls in UI order, flags useAi=false/importReferences=false, no media/reference/LLM branches. IDs/tokens remain in memory. |
| Jobs | createImportRunner(container), normal wake/sweep/claim/heartbeat/runImportJob | Original concurrency2, interval2000, lease90000, heartbeat30000; no tool closure-permit2 barrier or altered claim/admission timing. |
| Conversion | runImportJob → withObjectOwner(conversion-job) → storage.read → original extractor.extract → sanitizer → commitImportResult snapshot → original projection.project → lease/version/account revalidation + real UoW commit | Require two actual normal terminal conversion jobs and corresponding note HTML through original repository reads; all returned content remains private to fixture memory. Counts/booleans only leave the fixture. |
| Stop | runner.stop(), NodeSearchExecution.stop(), normal owned operations settled, client.close(), client.closed | Stop producers before client close. Storage has no stop/close API: do not invent one. Original recovery/writer handles and awaited withOwner operations are distinct from native database/process closure. |

Exact synthetic public upload bytes are the current UI helper boot line197 expression: filename UI1.txt/UI2.txt, body 'UI_ORIGINAL_'+String(i+1)+' '.repeat(1024-13). UTF-8 length is 1024 each; public input SHA values: d6290f45573fa1355d2a53be8dbb93777d68824789ad57d9fba81645dcc25383, 314f8e2afe5e78f3f9a430fc9859a0bb6b805effd35d0276b863ed074564f3c8. The UI stage upload2-start is emitted before second beginUpload RPC. upload1-done is after first accept/seal response, not a conversion-completion barrier. The planned source fixture keeps that order and allows normal background work to overlap; no overlap is claimed for the old held run.

Static normal-path expectation is two detect Workers, two empty projections, two extract Workers and two body projections: total8, conditional on successful text acceptance/current note/valid lease/complete commit. This is not an actual count. Only the original diagnostics_channel Worker publication and actual registered handles/events may populate actual counts. Family stays null unless exact public handle→source invocation attribution is proved. Publication after Worker start is an observer, not permission. Original parser admission2/wait8 and normal runner concurrency2 remain; no extra per-instance terminate wrapper, constructor replacement, native emit or brand. Projection source settles its admission at actual exit, without a both-stream-close gate; a later observer may require eventual actual end+close at the final collection boundary, but must not delay production admission or claim that execution-limit2 proves at most2 unclosed stream handles. Conservative whole-case handle cap8 is separate from executing admission2.

## Official migrations and query budget units

Source migrate.node.ts imports original createLibsqlClient/applyPragmas/getDatabase and drizzle-orm/libsql/migrator. Do not import its executable main() into the fixture. A future driver may call the same original migration API on the prepared source folder, preserving client ownership and the original foreign-key verification predicates, while avoiding .env/default cwd database use. This requires helper adoption, not a product edit.

The installed Drizzle migrator reads only meta/_journal.json then its exact tag-listed .sql files. Git79 journal has44 entries / 45 files including journal / 456809 B. SQL split by the original statement-breakpoint rule produces834 statement slots;44 migration-history inserts yield878 migration slots. These are static input slots, not observed driver/native SQL counts. They are this Git79 binding, not P5d45/1534.

| Proposed bounded unit | Source-derived basis | Limit / observation |
|---|---|---|
| Migration statement slots |834 source slots +44 original migration-history inserts |878 fixed; native BEGIN/COMMIT/DDL setup and other internal statements excluded from this definition. |
| Original account UoW invocations | request-absent successful signup1, verify1, signOut1, signIn2; optional final original currentUser1 |5 + optional1, no direct verified-row creation. |
| Sweep initiation opportunities |120s body /2s interval + startup1 + upload wake2 + completed-task wake2 |At most65 under this single2-job scenario; stop may finish the current sweep. No new jobs/retries/cancellation/expiry backlog. |
| Successful claims / heartbeat callbacks |Only2 submitted jobs; original lease90s and heartbeat30s |Successful claims2; at most8 heartbeat opportunities in120s. Null claims and sweep queries are separate. |
| Fixture completion polling |Both known jobs/note rows through normal repository/UoW APIs |At most60 polling iterations, two known jobs; no raw rows emitted. Polling never changes lease/admission. |
| Whole-case original UoW run attempts |Normal setup/upload/ownership/job + bounded sweeps/polls |Candidate512 cap; implementation must enumerate actual normal branch method budgets before admission. This is a tool budget, not a native statement count. |
| Original client API calls / batch items |Logical migration/account/UoW calls are different units |Candidate4096 API-attempt cap and separate4096 batch-item cap;878 migration slots reserved. Preserve this/args/result/error and promise identity. Exact instrumentation/counting boundary is not implemented or proven in this proposal. |
| Native internal SQL / connection/thread counts |Driver pools/native library may execute internally |null/unobserved; never derived from API count or static SQL slot count. |

Future helper review must resolve the512/4096 counters with transparent original delegation, without reading/outputting SQL body/values or replacing transaction objects/promises. If that exact boundary cannot preserve identity/semantics, return the missing contract to Root before implementation rather than fabricate an API count. The outer time/size limit remains enforceable independently; this proposal does not claim that an unenforced numeric estimate is an actual receipt.

## Installed libSQL / native binding

Original public chain: @libsql/client0.18.0 exports node→lib-esm/node.js→sqlite3.js→libsql0.5.29/index.js→@neon-rs/load.currentTarget→@libsql/darwin-arm64@0.5.29/index.node. No use of @neon-rs/load.load's local dev fallback: LIBSQL_JS_DEV absent/denied in the future admitted minimal environment. Darwin currentTarget selects from process.platform/arch; detect-libc family/command paths are Linux-only. Module initialization imports the addon before database construction, so addon admission must precede normal createLibsqlClient invocation.

The exact addon is canonical regular755 / UID501 / nlink1 / 7,837,712 B / SHA256 3fd9e58190311b5ee027c3e5452a6a410b31a5d610fd55853d797bb3c9f5db0c. Mach-O64 little-endian CPU0x100000c is ARM64; the static symbol table contains napi_register_module_v1. No node_api_module_get_api_version_v1 symbol was observed. Required addon Node-API version/runtime ABI acceptance is not established by this inspection.

Pinned public Node: /nix/store/4366l8b6kz1f2sxq6243rfs53grc73zz-nodejs-slim-24.15.0/bin/node, regular555 / UID0 / nlink2 /64896912B/canonical, Mach-O ARM64 header. It was not executed. [Official v24.15.0 source](https://raw.githubusercontent.com/nodejs/node/v24.15.0/src/node_version.h) sets NODE_MODULE_VERSION137 and Node-API supported range1–10. [Node-API documentation](https://nodejs.org/download/release/v24.15.0/docs/api/n-api.html) describes ABI-stable Node-API; this does not certify this addon or system libraries. Future actual execPath/version/platform/arch gate occurs before DB creation; unknown drift or native load error is held.

The installed local driver defaults config.concurrency to20; original formal serializeLocalClient serializes local calls and owns transaction lifetime. Preserve both original defaults rather than forcing pool capacity1 as a diagnosis. Native borrowed/open connection count is unobserved. sqlite3.js closeQuietly catches native close exceptions; client.closed=true is therefore a logical flag, not independent native-handle close proof. Its transaction.close source guards db.open before native inTransaction access, documenting a potential closed-handle abort hazard; this is public static context only and does not establish any old UI cause.

Future required explicit native policy scope (not granted by this document):

- Exactly one main-context original .node extension load of the fixed canonical addon. Original immediate CJS parent must be fixed libsql/index.js; its package/binary/source hashes must pass before delegation. No worker/parser/plugin context, direct caller dlopen, alternate addon, repeated noncache extension call, unknown parent or arbitrary filename. Delegate stock loader once with original this/args/result/error; native exports/constructor/module cache identity unchanged. A narrow internal dlopen permit, if stock loader requires it, must bind only that same original module/file/call; no general native exemption.
- Original local Database constructor/open/prepare/execute/transaction/rollback/close reached through the formal client, original Drizzle/UoW and bound migrations. Native filesystem scope is one fresh file DB plus its exact WAL/SHM/journal, source-known SQLite work and own TMP. No extension-loading API, sync/replica/remoteURL/encryption branch, network or arbitrary SQL input. JS FS/network observers do not prove native internal I/O absence; platform enforcement/receipt gaps remain explicit.
- Native libSQL internal thread/CPU/FD ownership stays unobserved unless a separately approved public measurement establishes it. Outer known Node/PG termination and2 PIPE EOF/FD close are separate process receipts, not addon cleanup-hook or native proof. NativeHandleClosureObserved=null; no SQLite audit/opaque/private proof/ACK.

## Necessary new public source and worker-build phase

Proposed PUBLIC owned SOURCE literal, unprobed/uncreated: /Users/hikaru/github.com/tuanemuy/hollow-ui-job-source-79ef126e-20261006. Materialize only the exact327 immutable blobs in a future separately adopted writer, no current working-tree borrowing. Preserve each listed Git blob/mode as metadata, write source regular600/nonlink/nlink1; preserve original package.json exports and dependency edges. No AGENTS/internal symlink is needed in this selected set. Source cap32MiB, fixed content1,920,009B; public manifest records exact file set, fullSHA/blob and commit, not physical unknown-entry absence or a proof brand. Public dependency links must be enumerated and canonically verified before type resolution/import; no prefix-based arbitrary node_modules permission.

Normal noteProjection.mjs is not tracked at the initially queried core browse path. The actual formal build entry is apps/web/app/worker/node/noteProjection.ts from apps/web/scripts/build-search.node.mjs. Normal server binding uses generated dist/server/browse/noteProjection.mjs. To preserve genuine NodeSearchExecution constructor checks, prepare all4 formal browse entries—searchSupervisor, searchQuery, publicQuery, noteProjection—with the original build invocation configuration: bundle:true, platform:node, format:esm, target:node22, .js→.mjs, external[@libsql/client,libsql,css-tree]. Copy no old-B projection bundle. The full build-search script also builds unrelated PDF/export/LLM artifacts; do not execute that whole script for this diagnostic.

A separately adopted finite generator may invoke only the original public esbuild.build browse4entry configuration, with new output binding and independent manifest. Proposed generator/helper path .goal-implement/helpers/p5c-ui-job-libsql-build.py (or an explicit separate public driver adopted by Root) must use async build, not sync transformation that creates an extra loader Worker. Installed esbuild0.27.7 main.js and exact Darwin ARM64 service binary are bound below. Main.js shows async service child spawn and separate sync Worker service paths; any generator must preserve stock API/module identities and bind/observe only the one original service child. Proposed build limits: Python1/Node1/esbuild service child1, Worker0/native-addon0/network0,60s body +30s shared TERM10/KILL10/PIPE10 tail, source32MiB/output4 files≤16MiB/TMP8MiB/log2MiB/material256KiB/root192MiB,200ms own metadata guard. Require actual known child/Node exit/close/PG absence and actual PIPE EOF/FD close; forcing/unknown holds output. No artifact content/hash/count is claimed before that separate build and independent manifest review.

NodeSearchExecution constructor needs genuine supervisor/query/database files but creates no child in its constructor. The planned source fixture creates original execution with generated exact paths and does not call execute/search. Its empty-active stop settle is not evidence that4 native owners existed or were closed. The three unused built entries are not executed; any actual fork/query is denied and held. Do not satisfy constructor checks with dummy files or the projection file substituted as a supervisor/query.

Remaining future candidate dependency work: enumerate/hash the complete transitive installed JS/declaration/alias closure for the original source and build contexts before helper typechecks, append only known canonical dependencies, and reject unknown imports. The24 exact package/native/build anchor files below are fixed; they do not assert that all installed dependency files have been preflighted. No install/dependency mutation is authorized here.

## Proposed future helper / actual boundaries

After Root separately adopts source materialization and finite worker-build candidates, then reviews their fixed manifests, proposed runtime helpers are .goal-implement/helpers/p5c-ui-job-libsql-runner.py and .goal-implement/helpers/p5c-ui-job-libsql.mjs. Current source/helper/UI actual phases remain immutable. Source79 fixture is independent of current main writer/HEAD and current B/archive; future S5 final product build/release/compiled UI rebinding is a different family.

Proposed sole runtime case JOB_LIBSQL_PAIR uses the two exact1024-byte uploads above. Proposed memory root /Users/hikaru/.local/share/hollow-validation/goal-implement-ui-job-libsql-20261006-7bf4c291 with own tool-tmp is unprobed/uncreated; existence/freshness unknown. Python1/Node1/child-fork0/browser0/HTTP-listen0/DNS/TLS/remote0. Only approved native libSQL addon1 in main; unrelated addons/sharp/canvas/PDF/Office/audio0. Native parser/projection Worker starts total≤8; executing original admission2/wait8; total unclosed handles tracked≤8, never an extra closure permit. Original parser30s/maxOld256MiB, projection3s/maxOld256MiB, import defaults unchanged. Body120s, outer180s including shared tail30; normal stop is within body,200ms metadata guard. DB1 logical16MiB aggregate including WAL/SHM/journal; objects2×1024B plus normal owner/staging records≤1MiB; root192MiB/TMP8MiB/log2MiB/material256KiB; source32MiB/generated-artifacts16MiB separate public readonly. Limits are proposals awaiting fixed helper/independent preflight/Root actual adoption.

Bounded checkpoints: candidate/header, source-bound, native-admitted, DB-ready, signup, verified, signin, storage-ready, upload1-begin/accepted/sealed, upload2-begin/accepted/sealed, jobs-terminal, stopped. Combine count fields into≤16 checkpoint records; do not add one frame per every query. Native8 registrations+8 exits+8 stream-closure records, header/checkpoints/fault≤4/final fit≤49 frames,≤512B/frame,≤32KiB total; exact schema/worst bytes must be measured in the future candidate, not claimed here. Fixed live stderr prefixes FATAL ERROR:/libc++abi:/Assertion failed: may be projected without suffix only on a newly adopted drain, never old log recovery. All raw bytes are discarded; absence/null is not success.

Closure criteria must remain independent: two actual normal job outcomes; each original registered Worker actual exit and both actual stdout/stderr end+close; original writer/recovery operations settled; original runner.stop and empty-active execution.stop settle; original client.close return/client.closed flag; outer actual Node exit0/known samePG absent/2 raw PIPE EOF+FD close/control FD actual close/forcefalse. TerminatePromiseObserved=null, streamError observation null unless a separately approved exact public event witness exists, productionAdmissionReleaseObserved=null, NativeHandleClosureObserved=null, nativeProof/UI/P5d done/DBaudit/ACK=false. Missing observed handle is not proof of absence; missing normal receipts, any deny/non0/unknown/force retains held root with no retry/cleanup/reopening.

The DB/job case does not exercise HTTP bridge/RSC/private error-bridge actor fencing/Drive/Chrome, full shutdown's other owners or the earlier UI timing exactly; even success cannot exclude UNKNOWN UI Node-6 cause. A future normal UI run depends on final S5 integration, newC whole checks, independently accepted new build/release and exact compiled helper bindings. No oldB or parser-mini acceptance is reused as that evidence.

## Fixed PUBLIC dependency anchors

All listed files are canonical regular/nlink1/UID501 with stable full SHA; modes below are observed public modes, not a new broad mode grant. Native/build binaries are read-only bindings, not authorized execution.

| Canonical public file | Mode | Bytes | SHA256 |
|---|---:|---:|---|
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@esbuild+darwin-arm64@0.27.7/node_modules/@esbuild/darwin-arm64/bin/esbuild | 755 | 10385234 | b82c6243eb58d520d0bc55cddcf6993dd0f5572f3ab8dc2ba6d77058be043e62 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@esbuild+darwin-arm64@0.27.7/node_modules/@esbuild/darwin-arm64/package.json | 644 | 382 | 2716c24eaffc7327a0f910d977a72e266daa0d88f2155390dc31af0e164f4a0e |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client/lib-esm/node.js | 644 | 806 | 37a8115c013d5f5e5ada112059a6abb42dcc24b207e54240c57ced13fffb96e0 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client/lib-esm/sqlite3.js | 644 | 23847 | 453ca868a8f8e9d87362e97ef1d2aabf2039b6afd82b92409c4fee5a5b5a98a0 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client/package.json | 644 | 3615 | 6f28e8e2aed00e442f436657888623245b2edd90c8856f01559133041e93d679 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+core@0.18.0/node_modules/@libsql/core/lib-esm/config.js | 644 | 5375 | 99a76d3605b534e48dfb607983c0717004bce9b37425d758135f5bfffcd3c62a |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+core@0.18.0/node_modules/@libsql/core/package.json | 644 | 2538 | da65aa270b71f26982db2364939a9f019bf3d90a8466098106ac156cc1fb4b6b |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+darwin-arm64@0.5.29/node_modules/@libsql/darwin-arm64/index.node | 755 | 7837712 | 3fd9e58190311b5ee027c3e5452a6a410b31a5d610fd55853d797bb3c9f5db0c |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+darwin-arm64@0.5.29/node_modules/@libsql/darwin-arm64/package.json | 644 | 761 | 6e7a953e9b488c562ec816c4fcbd998d39a6a88d1241d00f0ec26982415e9a51 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@neon-rs+load@0.0.4/node_modules/@neon-rs/load/dist/index.js | 644 | 3572 | 29550731c5e668994fb3bb24d198726555c8570664a80403d6ca02c6615f3801 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@neon-rs+load@0.0.4/node_modules/@neon-rs/load/package.json | 644 | 858 | 154ad669d2f2b3eaae2e23001ae7c08c3e1c70d7d3febe0026967767e6a1b2b2 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/detect-libc@2.0.2/node_modules/detect-libc/lib/detect-libc.js | 644 | 6483 | 456e2d178ee26607b5ac8cb35e71b4b929f15b28a6251372c21498f228d2e4bc |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/detect-libc@2.0.2/node_modules/detect-libc/lib/filesystem.js | 644 | 717 | 5d99d01ed4cdb368ef42ae8d0f0a3e63b246719d662d1e6c2b3fd8761b8be9a0 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/detect-libc@2.0.2/node_modules/detect-libc/lib/process.js | 644 | 399 | 9207c543613d6f14a4d65ccd8420c66521fd3fa35a69095695e151350c7490be |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/detect-libc@2.0.2/node_modules/detect-libc/package.json | 644 | 1102 | 483e653a9d5885730013bd637a328d7fa9b9970c4af3db8075d414fb13134caf |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/drizzle-orm@0.45.2_@cloudflare+workers-types@4.20260511.1_@libsql+client@0.18.0_@opentelemetry+api@1.9.0/node_modules/drizzle-orm/libsql/migrator.js | 644 | 1263 | c5bcba881da0f6d52fc457d1d17612f173121486a80f4bd87df47bb978404748 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/drizzle-orm@0.45.2_@cloudflare+workers-types@4.20260511.1_@libsql+client@0.18.0_@opentelemetry+api@1.9.0/node_modules/drizzle-orm/migrator.js | 644 | 1244 | 8c5e22b76a6a239e426b659ba999f69b4b312a052e74f533758f876795f6377c |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/drizzle-orm@0.45.2_@cloudflare+workers-types@4.20260511.1_@libsql+client@0.18.0_@opentelemetry+api@1.9.0/node_modules/drizzle-orm/package.json | 644 | 177277 | 9fd30ce718965c19178ac6936462b77017f1fffe56865124d0cfe55850de09ff |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild/lib/main.js | 644 | 97214 | bce772de103e1cbb118f1b7313916caa81f0e85461b3b6e3531607e7ed75ec85 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild/package.json | 644 | 1463 | 9ce21c976ffbbb95001f460e9e8af7c6d719f748eb70441e617a14dd0b68a5b8 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql/auth.js | 644 | 447 | 9a624b43d1a57ad474f9c0d860b1432ba24a531af2064763dbcef69869f935c4 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql/index.js | 644 | 11757 | cc6f0fb815d302185ba69d4f749b423dfe304add1c58d6ff687842f8c1e39152 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql/package.json | 644 | 2614 | 2c5b92e04a5c0f41139bfd678e67fc1569d7ba5fd9d35ac285901d122fa3522f |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql/sqlite-error.js | 644 | 848 | e21593dbd9f2b8222b0a110f587836fbfd940f3805f8f792651ed0111997b588 |

## Exact immutable SOURCE manifest

Canonical digest input is compact sorted-key JSON of the following sorted records (path/mode/bytes/gitBlob/sha256), UTF-8, no trailing newline. It binds this selected set; no whole-repository or physical archive claim.

| Immutable79 relative path | Git mode | Bytes | Git blob | SHA256 |
|---|---:|---:|---|---|
| apps/web/app/server.node.ts | 100644 | 27464 | 0809f5b3e42285f9dfe873a40e9949420749a695 | aa4bd67fdafd6a533ff65feb89994814b422590a0a4ccdf581b4c3391bd00c56 |
| apps/web/app/worker/node/noteProjection.ts | 100644 | 727 | 94c6ea38017f7e632e245c616a99199081ac756d | e8274edf2d9ca94a18ce219e256cbf96f65a0bd6275167389a1b066865f62b38 |
| apps/web/app/worker/node/publicQuery.ts | 100644 | 1448 | bde383ecbbeb33b4d93a6c4ba034c81c710ad006 | a4474330d5badb8fc83517ab69ca05be9f7c226c6b3fd5811e0f47682ae1cf89 |
| apps/web/app/worker/node/searchQuery.ts | 100644 | 1589 | 95818f430f715a1ae99d0a51402fad97f925ce95 | 5fd54f5cba4e21a924baebb3f29bd65d126375d4397c24b818b214c60c9e8681 |
| apps/web/app/worker/node/searchSupervisor.ts | 100644 | 2447 | 66b6d144401b2433bc55f0674b6cf1fd3e13f5e0 | bcce11b8d356c711b75931399e0dcda857c5b40c0f7aab24a1759055c553154d |
| apps/web/package.json | 100644 | 7462 | e094205e1a3f06594b1dd10f3d704257533f065e | b85dc06244cd0f0102208708d96ebe75c7e65c2f092de2af3d3a5acdda9538c0 |
| apps/web/scripts/build-search.node.mjs | 100644 | 3383 | a97e72d1a82ffb2f516912a12f52155365673a69 | 860e728884d892984bd8a2f271ebb54dfdabefffda9ddf59a64793be60322fd8 |
| apps/web/scripts/migrate.node.ts | 100644 | 2218 | dd4be9167791c534a0a40e6afad74b9777fe1e4e | 608868853501436f98c7a0dda6ef5803701597033d3349c78b236df168e6abd1 |
| packages/core/package.json | 100644 | 1443 | cbf0c16a8f28f36ecf6a006866d10a68e0759919 | 50bb9d03bf2b3d243f161bea69efa55eaf716df6d935e875c5c46d9d481f6bf9 |
| packages/core/src/adapters/d1/schema.ts | 100644 | 4280 | ecbd141518e054f54752945c2fd26a81d3b28a61 | 8fd4eff78fefb4a5c07413480fbcf67051a2b4ab59134edcd7f37fe55218776e |
| packages/core/src/adapters/libsql/authSchema.ts | 100644 | 6303 | 5b17cd4caed857c552db4fd08e75e66057911b71 | 3588a1c699a32ada7c5111d4b344fa327077f2059a6eb3093fff3b2cc4d3dc19 |
| packages/core/src/adapters/libsql/batchResult.ts | 100644 | 1986 | 741b952f386071db74815b04d47e01e5d2cc3ffd | acb852d3b354fc8187a7e20ddb42439977c03f95c853d9f3a3e26a888a51cbe1 |
| packages/core/src/adapters/libsql/batchSchema.ts | 100644 | 3751 | 12f3989fd20a9e6d2ad203b248d073860b878d46 | b18ddb5528825aff5d8c1651fc5471eb60a0a34bb88020b589e238c57be20c79 |
| packages/core/src/adapters/libsql/browseReadSnapshot.ts | 100644 | 21894 | 08053ceac5969a61df7d0f1199433338a8e66a12 | 6e9bb8ace553671e2ecfe133d2a7e50c3587cbd460fbad08ae0488e3a95b24df |
| packages/core/src/adapters/libsql/browseSchema.ts | 100644 | 2203 | 05cd7d5cdde8f8fc87ceba1d5757e9aebef57e7b | d62918c4df5871dccd0d92f0d0ec5dea1c2bb930cdfd0f5b1c3126288b2bc82a |
| packages/core/src/adapters/libsql/client.ts | 100644 | 1882 | 32a5fa4f78d012405dfdbf5647fd27162f6fecdf | 17ed1f017f4ea39496f3eb9c3210a1542235995d79d7c13788b095755b4c1035 |
| packages/core/src/adapters/libsql/driveBackupSchema.ts | 100644 | 12846 | 656fd5dd38ad0873ec85f5cb203d070a8fcc97aa | b1846c866dfe60a2f5d2bc0d89dcc730d6eb3ec2672eaa6d1a59b6d7c6ab87b5 |
| packages/core/src/adapters/libsql/driveSchema.ts | 100644 | 15968 | f54282d14e254588752ba841ac00a3fa90760187 | 96dd6b57308a65665fb458a8301ab3ea32730d7820b1d0dc7f2f5536bf34ec9a |
| packages/core/src/adapters/libsql/emptyTrashSchema.ts | 100644 | 2497 | 5208cd30798c361f06edf0762bac156f1e7b173b | 3e4db19b94c92b67bdbeadccbac004028718b62194944d82da310a1220afcddf |
| packages/core/src/adapters/libsql/exportSchema.ts | 100644 | 2820 | 4ec5d2b110aaf468937560d23535ac8b7747af25 | 1c204c9992d6f4f845e7e45d4b88cca1a76859995f8630fa46ece9b48aa5a972 |
| packages/core/src/adapters/libsql/hollowSchema.ts | 100644 | 11002 | 627f59f91e4c910710404a122ce1b839afc33420 | 7c0aca7474735509acf52d17dde51d00c0d36da924e8bc2a87112361f6359c78 |
| packages/core/src/adapters/libsql/hollowUnitOfWork.ts | 100644 | 11983 | bd94f7db8b903da4c3f958a37b3a1fd027b489bc | 83037f439b915e4e921c3bd3608bdf2e6d326c150b8bb8a95a69c8a843bba7ae |
| packages/core/src/adapters/libsql/invitationSchema.ts | 100644 | 3797 | 6a65543270cf176b28ecb16713e4b247617b2c34 | 917bc392796525440975e204081f9ac344e340ad37edf3dcc2701f7af6b46def |
| packages/core/src/adapters/libsql/llmSchema.ts | 100644 | 19956 | 9f9792aa93c12490b6b8789b4af37c9a08381343 | e29bce7183b4f86c232fcfc861875cb316a99959e6a7c89aeca0f3987b8ba5d3 |
| packages/core/src/adapters/libsql/migrations/0000_premium_triton.sql | 100644 | 2927 | 66d6256fb2885f842851eae30f31584f683c4111 | 43f644ff45d787b9741a073af95bc87452399a157955b19bfb4513b604d837ed |
| packages/core/src/adapters/libsql/migrations/0001_polite_speedball.sql | 100644 | 3670 | 0659af02310553334efd6a3222e578353d0952d6 | f4cd56cad09f80bee5273ae31a0b7b6c84fdb46061eca2bcecf392b282322752 |
| packages/core/src/adapters/libsql/migrations/0002_safe_wonder_man.sql | 100644 | 87 | 815fc4cc2d7f0875f6938f874706e583f921b2a3 | 70edc142717eaf3ca15420900da72d32bdb76dedb6dac06b32decf353ab44976 |
| packages/core/src/adapters/libsql/migrations/0003_conscious_agent_zero.sql | 100644 | 1970 | ef99e2a275b7fda7c2e7227a7a590685046c14f9 | faf47b20d6d1e4582a0bcc81b5f16a02db4177bfbdd7c1dbe43963492c1e1c07 |
| packages/core/src/adapters/libsql/migrations/0004_previous_garia.sql | 100644 | 257 | 7aedb9f3d9170c9d5d8fc10da14d1957ea1f7f6f | eb180eac78b81f6658abd8470dc0b04056ab3a09b0ad91eaaaf4bd4d302ae182 |
| packages/core/src/adapters/libsql/migrations/0005_mysterious_franklin_richards.sql | 100644 | 5272 | d223b9e5f307fb24e7c1a165dfeeb74bdf543945 | d54f8e6e4cc7e386cd7f7dae50b4a3a8ce7954690cbbd1b6a99b18a616254fe6 |
| packages/core/src/adapters/libsql/migrations/0006_graceful_patriot.sql | 100644 | 151 | bf0d5f0d46e3c5d253721a0c51b12b284baae779 | 3defaadcbcea0e0acfba14c88393bd890784af469de3ce6e3b277d330e3e09bb |
| packages/core/src/adapters/libsql/migrations/0007_fast_menace.sql | 100644 | 2263 | 5889fc7e7145cc83a9160c1b7f03f9affd55aed6 | 66391b394e9d03d8da3db3ff5c0eafdc7ff41a295fdeab4a15855b300cfe93af |
| packages/core/src/adapters/libsql/migrations/0008_wys_origin.sql | 100644 | 62 | d508c1264ee0282f1df7a65c2f93a10628e05ecf | 2c68698dafa0d9c40923e3eb7ad56c65073da23d4361e0542216c38cbcfaa09a |
| packages/core/src/adapters/libsql/migrations/0009_curly_lucky_pierre.sql | 100644 | 1942 | f76bb8131f3b7d04e157cbaaded0056fa6bb046a | 0c9f75b1ceb899761dacf4b04c266b1e48727d73b4f787c7aafda8b35975d83f |
| packages/core/src/adapters/libsql/migrations/0010_complete_bruce_banner.sql | 100644 | 4167 | cc5be1c67b0fa4aefb98f81b5d9b0123cb03fdf6 | 18ffaf45529c3e7c72081fdf83df61db25097e46381f04b6f6dcc2e1877c8b7d |
| packages/core/src/adapters/libsql/migrations/0011_round_wolverine.sql | 100644 | 1776 | 13a5b817a6902a4980db067e2ddf4c169db8a18e | 28499be272cac59220c9daf930d481ab99e528ee1048a5cdfa679459da2f979c |
| packages/core/src/adapters/libsql/migrations/0012_famous_guardsmen.sql | 100644 | 1195 | 7a12b276a46c197fe39a15115e567f3e5bb28262 | 9cb6a2b2500e51096c64466d505ed24aea5c28bb5853789801efdefdfe157ef2 |
| packages/core/src/adapters/libsql/migrations/0013_black_paladin.sql | 100644 | 1625 | 015fce19d8fcdaee9356a52dd47e414d8dff7418 | 156fc3843b0064b2a196868f4e55292fea21afe86375363e5deb7ba117e7d1c0 |
| packages/core/src/adapters/libsql/migrations/0014_worried_lady_deathstrike.sql | 100644 | 3480 | 9edc10f13fa971c7f50bfb4d95172eff8404c30d | adf44b97727779e2ded3fd9bb7465b1022970c6284300359818042b44e722836 |
| packages/core/src/adapters/libsql/migrations/0015_freezing_james_howlett.sql | 100644 | 65 | 4208977a8a8d6dc923ce2f872a20965253818798 | 426f254b6b9812d06c660aae6483dc58c9f1b05e13da4dc20dda2be363693007 |
| packages/core/src/adapters/libsql/migrations/0016_vengeful_golden_guardian.sql | 100644 | 974 | 10f19318973b65eea05580a9cba30e96abcc8deb | 840a3dd2af8d64f863e949bf5c487447375d62180f7a058fd7bf97f01fea7bcd |
| packages/core/src/adapters/libsql/migrations/0017_flaky_retro_girl.sql | 100644 | 49 | be37036b95efef413a8354446c32216fc3a47b02 | 91ba470a5f51f4027a00acd0bf903da6d531ea749e1f111c69c326f07940ce72 |
| packages/core/src/adapters/libsql/migrations/0018_right_lethal_legion.sql | 100644 | 1439 | 0381dce1241636768198e6bb04d95dcfdda6fd6c | 74e53c644f4772e98d4bbbe4dfdddd9ef1528dce9fd254c14079f284ff6fab0e |
| packages/core/src/adapters/libsql/migrations/0019_huge_black_knight.sql | 100644 | 1165 | 90e3a20ebe3d315d9be29d3193025e3cd0758374 | 6e3fc2d16f2aaf3f67632236b862048cfccc46be8c572a61f917a88bdc289825 |
| packages/core/src/adapters/libsql/migrations/0020_sticky_prism.sql | 100644 | 1900 | afdf75293bf7535416b47ebe4f7a1fe3cff4b075 | ce25330b4ddeec1e03232d01a191b92d7b0339a7592974afa20a456b3cf3a7cd |
| packages/core/src/adapters/libsql/migrations/0021_real_carmella_unuscione.sql | 100644 | 66531 | c3baf885482bdfd23201722f8cb0ccc3ad5c8f61 | a78c0e2e499c8998310e58e997a632bc4352bd91bcd41c5a9ec03f502d9d9176 |
| packages/core/src/adapters/libsql/migrations/0022_dashing_the_hand.sql | 100644 | 6567 | 39c9a52f22207918b89c5c320dbf0418e71150c9 | 736ccb7faa86da359036afee38a6a999c25689ef4047090fe46ba55339c1bf13 |
| packages/core/src/adapters/libsql/migrations/0023_sharp_the_professor.sql | 100644 | 7818 | 5e126a59f3e6f90d4f8ed01e44544c5535b05761 | 9eba407ea63a4f458003b23a0efba20ef7d9882c114cbf9ab0e7218045500ebe |
| packages/core/src/adapters/libsql/migrations/0024_massive_lionheart.sql | 100644 | 237 | de2576e60f1516f3dd87c4cb8551db356507affc | 342ea5ce04d2c6efa13719da5993a3a5aa186cb42c0188836404c5d04e92e58c |
| packages/core/src/adapters/libsql/migrations/0025_plain_retro_girl.sql | 100644 | 2879 | 33d95cb0b5482a3757d1cb556b04ece5d3f637fe | f7770b5bf5d8e3be1f5325f1a3e46416f83aa54ee4ce6f2149fee7345225c145 |
| packages/core/src/adapters/libsql/migrations/0026_empty_smasher.sql | 100644 | 2286 | 5f8676b8c25a6339f4c32f50faa21a4f4f681a83 | 740708e3da84431c66aea027c1392b848906bb05985fb2f46c5a0ff181e5c596 |
| packages/core/src/adapters/libsql/migrations/0027_panoramic_komodo.sql | 100644 | 6666 | 904350b2502f42bcd9458ad96a36f71844aebca9 | 806aa69181ebab7282bba84d1dee06567f4abb30efe1887b09b97fd9f5c7ab05 |
| packages/core/src/adapters/libsql/migrations/0028_stormy_doctor_doom.sql | 100644 | 16401 | a0509962d4658bfd38a186bb1292d1e4e2ec8aaf | 0625de077d103f59bf96d325cba0e8b91fc40f00a9f7cf7cfe59532d121a82a2 |
| packages/core/src/adapters/libsql/migrations/0029_anonymous_pdf.sql | 100644 | 13305 | ca77f92aeba539dc2ccc322c92947491556ce469 | ab035cef4b7f5920b364d2c7387f7a489d4fd39e33428cfddcab58efe9040f2c |
| packages/core/src/adapters/libsql/migrations/0030_zip_html_markdown.sql | 100644 | 39310 | dc394223234bc3323a9f80c385c324c4351ee2ad | 2d9fe8a996208ca64a20cfc0e6778816391ed1f3879551df0fc61a2c1d340372 |
| packages/core/src/adapters/libsql/migrations/0031_zip_pdf_demand.sql | 100644 | 9317 | 65a1bf8cb74483ad7045a10e2a3b781fcc22bdce | 83359ec14107910c0f74077f22dc2e4ee0e887d3101f09db048be50e3f28b3f0 |
| packages/core/src/adapters/libsql/migrations/0032_account_authentication.sql | 100644 | 15633 | 64b5c88a5d0f65b0e4066f5b394850be831b460c | d806ef30e088a423da6c9e9b2380d065254aad404f5d32654fa4aa6651ca9e4a |
| packages/core/src/adapters/libsql/migrations/0033_openrouter_connection.sql | 100644 | 8564 | 2aeebe288b47cb4d22b77533454517c0c5114ac1 | bc1020479184aca1f24ee28e835e9bfce52dd05c32541461c2fa54c0a31d1de4 |
| packages/core/src/adapters/libsql/migrations/0034_normal_thunderbolts.sql | 100644 | 14148 | b72d7e70eea6b0d282043edac1611ce80e1ccbb6 | c191ed93944166224457d392adec528f0b5aee57b4186f3d8a0d7bb0c35416a9 |
| packages/core/src/adapters/libsql/migrations/0035_llm_document_preparation.sql | 100644 | 10800 | 841f4de5986c61bd94632b8caf0c069d189f810c | f24ced63e9df8e92f6edd8d7aa90d6c64269bf405810933cc13e7620fa40a951 |
| packages/core/src/adapters/libsql/migrations/0036_llm_image_preparation.sql | 100644 | 11077 | 62f02e0024abb8238454895e5669309eec59616f | 994bf6ce51fc80089bc1a682ef300b183b6d1d7dd416d7156e31d2a326f1d758 |
| packages/core/src/adapters/libsql/migrations/0037_llm_pdf_pages.sql | 100644 | 30995 | 252a3143fece1e68569035bde82d4eaddc0f283a | 6a107de9b029c15cc89374ecd3930a682e22923dff407dbe358ce60c53696069 |
| packages/core/src/adapters/libsql/migrations/0038_drive_connection.sql | 100644 | 33297 | 7517a9d244e343a010f27eac0ddd43d441a86ead | d305836ed40bd36d9febf05aaab9c8b1552dbf7b80b23c097110adc428670112 |
| packages/core/src/adapters/libsql/migrations/0039_drive_backup.sql | 100644 | 32159 | 9c2abdc677bcdfa5e91112cdce70bb37cce22019 | ce4c92a62baf7d57205f7b41830a9d614786301db10dbd6ed5613d574ccdfbb4 |
| packages/core/src/adapters/libsql/migrations/0040_drive_backup_queue.sql | 100644 | 12849 | 7738ab2c50b85643f04a2662fdeb0f7b7afc04c1 | b47ea40abca3cb3937d3b70c76e114e0c4142e8d006b26ce0ea9d91f0bdb73c4 |
| packages/core/src/adapters/libsql/migrations/0041_drive_backup_target_heads.sql | 100644 | 9688 | 5b325d2d4686d4d52fb5c63fab151e281519e5e5 | a0f53ef63329c486b19d69aa6a01790ef0b46dd01684951ff7afb2a555b742ad |
| packages/core/src/adapters/libsql/migrations/0042_regeneration_source.sql | 100644 | 35571 | 8201a705d599b9d770f700dfe58cb7ffcf0b2fbe | 26a033d7f028b64985c9b3aba03b5093de301face173e7cf5e2d58690fe26cae |
| packages/core/src/adapters/libsql/migrations/0043_regeneration_input_stage.sql | 100644 | 27769 | 43fdd3b39fdaa150f1c5c5cf920e1526e46f12c3 | c97c1d73d1ac4c99f461163dc81a4320f4b6dcb61c775fea5d5c8b0cba68316e |
| packages/core/src/adapters/libsql/migrations/meta/_journal.json | 100644 | 6506 | 89e250c88dc37fd6da6207fc9139416133174b3b | e7596bd40c6bbec14c9b3d970d5486ca6aaa8ecde624fd1a1b32ff3eb72b4ae1 |
| packages/core/src/adapters/libsql/moveSchema.ts | 100644 | 779 | 9bbd52edf240dd546236fb3ef695f62ec902eb41 | 08749d253cc42d015c704a35c2ef40341863c72215c537281aab35063943faf9 |
| packages/core/src/adapters/libsql/openRouterSchema.ts | 100644 | 6409 | 62792a7e5f9e991f6711291d2c3981f06c6c6abe | 07f2408943fbc4293eaaa934e59716be935f648626c29e27dbaba12c632de0d1 |
| packages/core/src/adapters/libsql/pdfAnonymousSchema.ts | 100644 | 6525 | 27f9e6061e235370b7f0095f6f3ce57619daa788 | 4597cd1941e8884888750b139e9fd59b1f1ebe62dc3653b353020c32434367e6 |
| packages/core/src/adapters/libsql/pdfSchema.ts | 100644 | 10574 | 62ba6312922a6402c1ef66f25e0b677bf79ad0d6 | 1f8309471f5d197cb5fe4135c6a24e58f319d28bd303316bee27711aba758c7b |
| packages/core/src/adapters/libsql/publicDiscoverySnapshot.ts | 100644 | 21067 | 209299b7952af637642b87f0fb58fef9e7ad8c15 | c1709e962c2caba367121de206a548680a91163a74f025441877c7a3a6f21871 |
| packages/core/src/adapters/libsql/publicationSchema.ts | 100644 | 3803 | 379b7e490a2ed2ed18761c91ef4a4d5e58983d2c | 33917eb738aa0e5817a47db789718c3a57ca9a04954d44409e961a8f4cfe3e91 |
| packages/core/src/adapters/libsql/purgeSchema.ts | 100644 | 3802 | 4ab5920589e3ad72ba65bfb78ff918e8fa0709ed | dd211135275965b7bac2647d2552a86219e41949bb79a05fe40ede974184ada8 |
| packages/core/src/adapters/libsql/referenceSchema.ts | 100644 | 4490 | 6bf048f96ecce9720405f37369c67d2284a85d07 | a23286edfe46bc66f7dd1793769fd8a6794c487993cb69bbf61c763b0903567b |
| packages/core/src/adapters/libsql/regenerationSchema.ts | 100644 | 11322 | c0bd912af2b57b5cfdca0ee2c4087a817d05d154 | 6cbdbcfee5b2d0ca1079d4f2c7d529b5f4de80b76483648191e934378a47cd5b |
| packages/core/src/adapters/libsql/repositories/accountChallengeRepository.ts | 100644 | 3642 | b6c85b81f55db276e3898ada7704574e70c3658c | c00718abd3a3619d9ad1ef1d4a0c830597799957863e1fa6f161d2b3d6f8c4ab |
| packages/core/src/adapters/libsql/repositories/accountRepository.ts | 100644 | 5453 | e2b11dd7ce0e52e4ce047cf96316add040a0f5ff | 0a506720d3066718ccfa309080b1f327af4b094a292c3442347ec18852c27795 |
| packages/core/src/adapters/libsql/repositories/assetRepository.ts | 100644 | 8422 | 6f7cfc0f7b583babf60488e25b32d48479958c5c | c47a335d0161458e4da0035ac468c24cb8f72f1d40913c2a7639fbc6b6ea2dd8 |
| packages/core/src/adapters/libsql/repositories/authBrowserRepository.ts | 100644 | 5176 | 20bc1b1290dd68faa3d4259d8e05a554d59fdb0f | 2beb9e70ad674152940dd013c9a2c74ef08676e3746424126562b893ccc56e47 |
| packages/core/src/adapters/libsql/repositories/authenticationRepository.ts | 100644 | 4147 | 60f38e505efb61528251112e8d45583992e5a325 | 2709c3e6c8e5aab1976829e3b15fb89b432aa3090d6322327ebdfdee3a93c9de |
| packages/core/src/adapters/libsql/repositories/batchRepository.ts | 100644 | 15480 | d32c487d743aa557e22ff908c4f9d888e44b78f1 | a5c5e21955e43cc3ed8c8dccd59f35d44d97cc38c8f5f28bf7ccee2f91f039c5 |
| packages/core/src/adapters/libsql/repositories/browseIndexRepository.ts | 100644 | 3671 | 880c357cdc2da2e1cebc058151da527dedfca2a3 | bbbba9681d31b744875827ec28f1d507dd26a5f91aeb157d1c50fa199c9a505a |
| packages/core/src/adapters/libsql/repositories/displayNameRepository.ts | 100644 | 2308 | 97a5b4c9230393e4341bf1eb50003b41f3523f95 | a6ca44eeb53f813e71f2015998e85d8c1381563598db6b4a1e5742698c14f41e |
| packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts | 100644 | 39938 | a1e399e7a41c65e325e352e84e736e88f811142e | db246c3351edf8175e6d7a4ab7b643350312e1b020d17cdfd03a2adb69969e25 |
| packages/core/src/adapters/libsql/repositories/driveRepository.ts | 100644 | 37998 | da0118a8374997c9f53cf7d84d9d6002a3f58223 | 50664fcaf0cf0e7231f6600e7fd57716ad7caae0763ecd43b9b25f04f11be247 |
| packages/core/src/adapters/libsql/repositories/emptyTrashRepository.ts | 100644 | 17137 | 36d138a60e7f1f1ebddeb3b52163a39c5ca7d701 | 38edf4ac2d4c1e7d7c41bbe3b978baab994dff982cbfd2f58efe6bffefcb098e |
| packages/core/src/adapters/libsql/repositories/exportRepository.ts | 100644 | 9817 | 2e79bc76b84507613f33e3d3b13fbebae3de75c5 | fdab66c08149655daea96941bc8fc65c66e3bc9735b9a11fd45c0d9b498aba8c |
| packages/core/src/adapters/libsql/repositories/googleAuthAttemptRepository.ts | 100644 | 7448 | 252d7cfdf0473e2769939f83ef80917795773c83 | c8529b08dd7b8b87323f77f92c00ed34c9f2b106c2122426c808ba59fed3b397 |
| packages/core/src/adapters/libsql/repositories/helpers.ts | 100644 | 2375 | 24b6e57bb93b31cbb17643d07f322de363c6ddd7 | 939395a815129276880faa8a59a4ae2fe874278f4128a9c983d3be42e8a40974 |
| packages/core/src/adapters/libsql/repositories/importRepository.ts | 100644 | 8074 | b5a7710fe10d55fc67b40ccb1c7d35a4decb585a | 94b7cb423bf31d077ca5448dbca97e5f279f080a424dfcfbbe6b971dbe5200c0 |
| packages/core/src/adapters/libsql/repositories/invitationRepository.ts | 100644 | 7681 | 66b97f907fe1b0c35e0095aa59bdc541cbd327e9 | 493ec44db2a65538ee1fbd3679d570514dcdb91690e48c27baeee9506604f81e |
| packages/core/src/adapters/libsql/repositories/jobRepository.ts | 100644 | 5007 | 7e27c6760863561337ba7bad90f2ae41f969140a | 70abef25c04254369f5e4059345eee5b9f4078c504795673274d3e0cf37b95c3 |
| packages/core/src/adapters/libsql/repositories/llmRepository.ts | 100644 | 39043 | 839a60bbf395604abad78dcf03e90c1f31df56b7 | 13335b88bc15effd4a19e22790e103e966a33f5c7849cb1f29eac5606fd75b62 |
| packages/core/src/adapters/libsql/repositories/noteMoveRepository.ts | 100644 | 13881 | c7d3953fe38a18df286efe2cc1c9a7efbd2d77c3 | 787986eba8b096443423bbda7969264d5d5541cefd637e5ce5d65c8f6c239088 |
| packages/core/src/adapters/libsql/repositories/noteRepository.ts | 100644 | 9323 | 96cf44b92e4d1b5bef759cef73e954e254b3170d | 707677444b708e4ce08f915bbf00c854e0505c9fd18beaa425e63d2328990b59 |
| packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts | 100644 | 16824 | ad5c9b75845f40aa60c6667fb1f0d702374780c8 | 638a8a6988f6be9d0d96737072f92fbd8c818e82995c15ab37085475b43786ed |
| packages/core/src/adapters/libsql/repositories/openRouterRepository.ts | 100644 | 10865 | c07f02efd60abcaaacb38e8900b3a297f95112c6 | fc31ea3eb6c92216dde2e199116b7a3e38fe07e8891f5c87a173ebeb25c711f4 |
| packages/core/src/adapters/libsql/repositories/openRouterWaitingRead.ts | 100644 | 2055 | 3ce9e793f4e85c857bbb58c31f3b34690d775d4c | 04ef2e3b6a0b9dcdc5e84a4929fb4913900c3f9be69b73d16753d6d90b0fd011 |
| packages/core/src/adapters/libsql/repositories/pdfAnonymousDeliveryRepository.ts | 100644 | 5051 | 74ac798000def513d77749424322729701bd9e9a | 7edae36fcbfd90bf51a2f5f9babf4395a695169490e0cca1e2e8b50f775ac4e1 |
| packages/core/src/adapters/libsql/repositories/pdfAnonymousHelpers.ts | 100644 | 6052 | 43c02ece59ce7be22670a2d786b91e141e33b678 | 8dd6d667f79283dfb1fe5c4f00ff0d4546332b2b92105ef2fa0488667a37aaef |
| packages/core/src/adapters/libsql/repositories/pdfAnonymousRequestRepository.ts | 100644 | 3927 | 28afd26e3ac0467e3cefa9f655881776448a53e5 | ef26a8f25c7ad02abc11a982549925e3c5ec36609f368eb2b51295ec84e385ff |
| packages/core/src/adapters/libsql/repositories/pdfArtifactRepository.ts | 100644 | 6970 | e9703ed5274c7a155d0d0b151dd11149e7a6f5dc | 66153a3cb68d6ca18adc215d8fb94cc832f35fdb39f05413bc0cf5af3199bec7 |
| packages/core/src/adapters/libsql/repositories/pdfComputationRepository.ts | 100644 | 8235 | 5033fd2cb2f7c8f4fb2d9469d1f684ebf58a5a95 | 3c14aa51b7a393ad64af315ce58d4d93fefb4c57be504a22057bb31f64681d4a |
| packages/core/src/adapters/libsql/repositories/pdfDeliveryRepository.ts | 100644 | 5005 | 03cbdcaf4f4d2b9dbaaf654abb30698296e60705 | d99aa912913e435a38f74aeece633002a1bee810fe450a83dbd4ec6e3942cbe4 |
| packages/core/src/adapters/libsql/repositories/pdfDemandRepository.ts | 100644 | 5018 | 618aa274bba2f26708352b81e039ec07ef1028d8 | 32d138fd68629c25b23566214b78bef51fd6e8f7b66231b5d1f45e5372c60b3c |
| packages/core/src/adapters/libsql/repositories/pdfHelpers.ts | 100644 | 5822 | 1a13b0713899c6189add79caaa13afd5f142a4a0 | b4242b684b9cdd21e4165a7ded88cd2e4cbb37e57c8d09e264de296dc682b599 |
| packages/core/src/adapters/libsql/repositories/pdfPreviewRepository.ts | 100644 | 20018 | 86b5406303e97696089f26cc90793507744d4bb5 | c48cbd89d820fbc1fcaf412345095362359f46f4a9765833015d4b8b69f83fc5 |
| packages/core/src/adapters/libsql/repositories/pdfRequestRepository.ts | 100644 | 8967 | c6b09aac1af93ea6e2d8b40fb65c4b9b3b1fcb98 | 9c81344ee42d99fb18b56ed16a4b204daa9b11c5396262cb1b9ca63eb92be2f7 |
| packages/core/src/adapters/libsql/repositories/profileIconRepository.ts | 100644 | 5828 | 9da7fe5b6435683e51d7d4d890222a6f4081f7f7 | 2b63ec45d876ca6ec5c8af11a00c4cec26b938427efae29a345bd74a3d685a15 |
| packages/core/src/adapters/libsql/repositories/publicDiscoveryRateRepository.ts | 100644 | 2053 | 75917f516f7f331d1bde73523a585c249f06d28d | 23de5e6c1cfed83bd04fc1857ef1864243bb6f614a620c9d91187779f0e72868 |
| packages/core/src/adapters/libsql/repositories/publicNoteRepository.ts | 100644 | 1585 | 8f7b6d84a7a4d39d499a4314af61025b0a384a67 | af29a284d2131d51231e91b0575db13e20606f77391919b21a0e7c4aadc4f093 |
| packages/core/src/adapters/libsql/repositories/publicProfileRepository.ts | 100644 | 2293 | 477403b2af4149a0f5a3e984b9796e2729031b53 | 9025bf7269a779438ee7619c89009831b9e94e449f0b2b0dd361eab76a26b7bf |
| packages/core/src/adapters/libsql/repositories/purgeRepository.ts | 100644 | 30779 | 547fe404f356620a6e99ab98fdf40a87620d6628 | 157c5eddedb58ae0e4e9a8c1877f4cd9eaccbce61f21113f57744b6b6aab8538 |
| packages/core/src/adapters/libsql/repositories/referenceRepository.ts | 100644 | 11928 | 8858664e6a9be81116515e4a2bd1ee649edd33f8 | 0a30b17fad6662c64268ad941ff041cabe39cfaf98284e27d2832e021f0e669a |
| packages/core/src/adapters/libsql/repositories/regenerationRepository.ts | 100644 | 10969 | e0196eaf63dbe8f98610566b0f5fba1a3d35fd51 | 5c54b7555f3840a122144fb46f46f95080f1045a40957fd6be05bedd8f149f7f |
| packages/core/src/adapters/libsql/repositories/revisionRepository.ts | 100644 | 1923 | c0184386f51a2a386a698f50316ea39008f5f4e4 | a741001afd7a7e7c5c817435c5671f720e5d5565908f05597f7de3cd4b1b32e7 |
| packages/core/src/adapters/libsql/repositories/scopeCapacityRepository.ts | 100644 | 4149 | 793cfd4aca7aee08ffcdd985917fa543d43f2eaa | 7fd5c636b5f26f4b8bf911cf1eda90fdc53a77e9a62bc1cfef513ecc80fda672 |
| packages/core/src/adapters/libsql/repositories/sharingRepository.ts | 100644 | 7879 | df4bc000107264dc192b72819ad7aeae79b3af0e | 0be667ed5611b6b2e343c311fa74bee92b26ea9e9affc306a1abfac8e7a22454 |
| packages/core/src/adapters/libsql/repositories/tagRepository.ts | 100644 | 4585 | 6bc55c385f76225ecd60f1c3f0863278237ad5a1 | a63f942894c1d6d85b8219a6ce0c4d21a1cac59da973209695c8934c4935bfb6 |
| packages/core/src/adapters/libsql/repositories/workspaceDeletionRepository.ts | 100644 | 19179 | 09d1fd0a4bcc857d0c21098a8fd61ca92873c84d | cf3baa4901d427aab43d04d95801d051719a21a55bbc83759880ac160ccbf3dd |
| packages/core/src/adapters/libsql/repositories/workspaceIconRepository.ts | 100644 | 5775 | 4a62a1020855cc57d201267e56c19e76e87c4156 | d42c5f47e014f3af0f905507664aa1fd8af3c3a5acefdafe778a74785b51dea5 |
| packages/core/src/adapters/libsql/repositories/workspacePublicationRepository.ts | 100644 | 2066 | 0a3574e49b6f03d1a79ad61f1d2624ee3511f7be | aa5b9a727781d56e132f6a905dfcf2b9376be0c758db80516fb5347a57fef115 |
| packages/core/src/adapters/libsql/repositories/workspaceRepository.ts | 100644 | 7315 | c64538f29a02501760999e497af08e462eff1c94 | bf5d6bdc18dc50a21979dd177ac5e2acbbd2bf41f9526d6dcf8b9ffea6f22d18 |
| packages/core/src/adapters/libsql/repositories/zipArtifactRepository.ts | 100644 | 6667 | 33b6bbc1c9354806d6b9544b5ca35301549d8469 | f07d1af680a5adb54871d4bc094098ba0aa593dd75a077e6c7295b1d498a95cc |
| packages/core/src/adapters/libsql/repositories/zipDeliveryRepository.ts | 100644 | 4032 | 83973d558b6eef3a8b3e27d4cfeeb72ec849b7e3 | 6a390351bccf328e3fdbe32937306d8a0441a96748e6be2440b22a4c2f947584 |
| packages/core/src/adapters/libsql/repositories/zipHelpers.ts | 100644 | 13994 | c775f255e2b2763a7883a14bde857986c34865b1 | 5ca2f39313d29e0489ae47579fa276c9a0f59fc4d55e7811b1fc1339b4e71049 |
| packages/core/src/adapters/libsql/repositories/zipPdfHelpers.ts | 100644 | 2742 | c573446b1847c5c2058148a6035a9c9ec7f74b63 | d5ac3ff349ab0e750b60f5ae62708c7b05f48132765a27879aec00547034b238 |
| packages/core/src/adapters/libsql/repositories/zipPdfRepository.ts | 100644 | 11956 | a406c222c8631d6b820a4e1ecab5cf422c5584e2 | bd117a29a4e9338bf987685c7dbb7de58f889b9f8feec3e76ea4dac12f274eb7 |
| packages/core/src/adapters/libsql/repositories/zipRequestRepository.ts | 100644 | 20443 | a6737c673fcf6029b22cea7195df5f857ec97d67 | ad0b8556c4f4a406c23b9d98fbf787850af5331d8376626a81ade5f0c840a6c8 |
| packages/core/src/adapters/libsql/repositories/zipSpoolRepository.ts | 100644 | 6265 | d04852b7deef5888cfc8bf0885527cba0ed263ac | 8e4002032eab5d908302064170d8ea7d8ffbbdefcb57e21fc55d3913ab678cd0 |
| packages/core/src/adapters/libsql/repositories/zipWorkRepository.ts | 100644 | 15937 | f0d078f8d8c6b9a3d2f0f38818c66c574d0a6d13 | b9be1dfe08772d7ab603e53ea4d48af2ef22fc1f9494a564950367ab1a3bf920 |
| packages/core/src/adapters/libsql/revisionSchema.ts | 100644 | 1665 | 2f697d02cce6fcec98027173f8715c714c63d561 | 9b82b791e47b6630825e835b62172b554ff32fcecea1301b3fb5fbde3a81b95c |
| packages/core/src/adapters/libsql/schema.ts | 100644 | 878 | fb0524306843c3821de3cff2e53af38635ef353e | 2fab01be3e48d476c3655855b688310448dcde2f45e8031bb1e02de909bca0ad |
| packages/core/src/adapters/libsql/serializedClient.ts | 100644 | 3121 | c02f6d323d214b29a9243fbdbea50521e733cd0e | 44e29b4c33f2e314649222b9b86b4c24457e443afbff1e069f1f85e04ba70dcb |
| packages/core/src/adapters/libsql/sharingSchema.ts | 100644 | 3066 | 859ee7cafe0cf099f50dbb81539c3a7cdfbc6aaf | 3508c1f906d7d22fe65fb7d3b91e32881a09cb6dfdc0a325d58055eec98aaf05 |
| packages/core/src/adapters/libsql/tagReadSnapshot.ts | 100644 | 7310 | 76c69a0b24e89b1c8c4b970874cd6d4a5103181b | 265989c379c061c552f72fe1cfab351545c5e55567d52c38dd2dbd571549cacf |
| packages/core/src/adapters/libsql/workspaceDeletionSchema.ts | 100644 | 3027 | d817061ee7bdc992295616e70500146ee12c34a1 | 95a83264caeb415cc7a1aa81e2c8c10548bd9960a6212e716f6ea85ca50bf594 |
| packages/core/src/adapters/libsql/workspaceIconSchema.ts | 100644 | 1304 | 10b3ce385f2f2f35902dc95a5980104bf6c24087 | c915ee2b477abbd8bdce8b60c023e5e6ae14e9aab36c8cab2a1ba4fc67ddb3df |
| packages/core/src/adapters/libsql/workspaceSchema.ts | 100644 | 1621 | 1e5418757ba4eeb8e354852f85006d286d1a0fd5 | b719332c59d83b503e0ce8a65c07c74b48d85ac7b91ef971b8bd580a37a9f960 |
| packages/core/src/adapters/libsql/zipPdfSchema.ts | 100644 | 1720 | e126b3a3a3a1f7d63b25992108b8f368b4587f6b | a0acd8cfdeef84227f514e4833dacfb4a98a264e9ca16c398d7f252f5481280a |
| packages/core/src/adapters/libsql/zipSchema.ts | 100644 | 18614 | 12042062df8235551d65b397796578ded43f70f7 | 8b47acce9da34057d70342ba61f39a3db74b1f2f58ba17820e36483f1e9ccd65 |
| packages/core/src/adapters/node/authenticationExecution.ts | 100644 | 2490 | 1083676897b67cd79b3e43d763d74fc69b9c0737 | ebd82b2a80232bb30f8697b30a83e9347673559691d8ea1eb895f72597f77473 |
| packages/core/src/adapters/node/browse/civilDate.ts | 100644 | 2052 | e6914ee39a8dc5f3846f9595406b961c25650d68 | f0599ced056426df9cf850e1a7589c23cf15758860aeddd4127aa1cc0a181590 |
| packages/core/src/adapters/node/browse/isolatedProjection.ts | 100644 | 4209 | f8197016414d5c03ac1e23f4c4640f2cebe55f9e | 45ab05b2e24bd1c1d1f60fee03eb6e804ae032f892eddfdf7390d0a13f70e832 |
| packages/core/src/adapters/node/browse/projection.ts | 100644 | 6333 | 8e5f032a2e8d3f84b87c19f2f57b769c7f90b930 | d28deb67362eda54f0e453e643cc3508a6afee34d63398499251195212b40b28 |
| packages/core/src/adapters/node/browse/searchDeadline.ts | 100644 | 911 | 845f557988c6d49b29c8cee72b5ccd783f34709b | 452a11bbaf7b7b363e69667b76d7ff6df4c71a50b8af0d1055dca30f6c5cfe31 |
| packages/core/src/adapters/node/browse/searchDiagnostic.ts | 100644 | 787 | 29930c13811b83bf10c11ca1a901d57ceb5f93a5 | b0203b205df77c6d6597c3efdf0cb2e6eca6d50d68451ce51726347e78ff717d |
| packages/core/src/adapters/node/browse/searchExecution.ts | 100644 | 7419 | 95b4b1a88f91914580043ed50e7d9fa4921d75ec | ac33f7b913ed4804d6d5afb184c94193ad0a569d6e70ade9ec78a1433aaba924 |
| packages/core/src/adapters/node/browse/tagNormalizer.ts | 100644 | 796 | 7d6ec074c5ad35007e83bd7775589eaab137a767 | 70021a32c0fb568c6bf99c6c009d055eba9e5f5eed5653429a2c53832168e6eb |
| packages/core/src/adapters/node/browse/tagWire.ts | 100644 | 1570 | 88af87bd838806d006593833580cba9d88cb6de8 | 1f1a0e14a5f9ba5b3ccb93de09f8b6fa8b2c536937c3cf8359f3441292680b4d |
| packages/core/src/adapters/node/browse/unicodeData.ts | 100644 | 94 | ddaea3c5fd38d28493df97b288003f50edfecafd | 5cf836b97d277edee0c472b667796f5b7a6e042c4539c0a05e8b92e5dcb31b8a |
| packages/core/src/adapters/node/browse/wire.ts | 100644 | 4237 | f7d4e9073193dea8fcfd77ed39490d80811f35ff | ad9fa80c9520da274d42c13c0a86be0f199721420c14696f81d4412463fa9c8c |
| packages/core/src/adapters/node/coordinatedObjectStorage.ts | 100644 | 9473 | 4586e523bc86b148a243bb1e6f246a94ce0c7eda | 549c01041320a5450a586a6293c17c3a11403b375524f2099ca94895a8f43d92 |
| packages/core/src/adapters/node/htmlSanitizer.ts | 100644 | 4595 | 74266ef478c967c75ddc80266ac5325da60b9cf3 | 6d506742469cbba5550093fbaebdf3f398e9f910038d49064d18e577e08c600d |
| packages/core/src/adapters/node/import/documentExtractor.ts | 100644 | 10244 | cda8c5a4e63f3e9e2966a2d7e8b87e4cd37fb17a | 2a3ca8d16a9e67ea9c3f262712c93b8fdc0544638d51ee26043a25155767053f |
| packages/core/src/adapters/node/import/mediaValidator.ts | 100644 | 5038 | 2b818a2890def1802a54cda9f20badb06c33ce49 | 1d5ecd31756adc43753fde8b3e5176b22c9edd45a675c334c463a0a0efa7ec89 |
| packages/core/src/adapters/node/import/parserWorker.mjs | 100644 | 26374 | e660075d47d6275caadc5fa179b847f1747e6379 | 911632fb456c27d5c0ef77cd1ea3eb3b5cb8bfa6be034e291ad7e3944f725bf2 |
| packages/core/src/adapters/node/importRunner.ts | 100644 | 3563 | 0b1d4bda1c068355ee4d1550e06bf8b0301f6b4d | 733bd37769f0822241531d1d890c23eb693a103cb1e9aaf135a484376cf0f406 |
| packages/core/src/adapters/node/objectStorage.ts | 100644 | 15012 | 329ad2f13beb80e9b7789cecc785194c0e487418 | f3598320690d52bb6f81cdd8f9970d6228cca19e7fd8d62a7ff89f23d05ad28e |
| packages/core/src/adapters/node/passwordHasher.ts | 100644 | 1175 | 95d50f9a5ce1c7dc7da213b0f7c86575d5d32083 | 2ac5f172350ac46aeb7cfadcbb326082bf672a47932c5981cde4a382a2252158 |
| packages/core/src/adapters/node/publication/wire.ts | 100644 | 4122 | 373d4f9bc88bc546a9e999eca04c44d4479554bc | 09730b9542ac6b55eb4e85b7c631bd7dd7f70d6ed73ec1f9f139256c5f21bb6b |
| packages/core/src/adapters/node/reference/cssPolicy.ts | 100644 | 14511 | 43f46e92786e83da76e42a1d56520df6de4fd214 | b5176febde08f492d7cc280cdb5922d624cbdbf58f395bca43f914a95a9dbb79 |
| packages/core/src/adapters/node/reference/htmlDocument.ts | 100644 | 6975 | f78d2ebc19f1722a125b541622dc5d33781f2785 | e0711a93d27def70bedc4ef8fe38b131de9e7cf277b001e49383a00c9ab3cd5d |
| packages/core/src/adapters/node/reference/htmlStructure.ts | 100644 | 3080 | e66c71c5041ede4d1d2a23c8386adb256475c49d | d4776e1e1a175c6c8917b7555c27cfe7238231384244e371be3a722cc2ba0408 |
| packages/core/src/adapters/node/tokenGenerator.ts | 100644 | 320 | a12ffed68a255f00efdbbf9cff1e78fc8bda4445 | b5143ecaaecee035dea4687ca2b612ba58f65377c80c0e3e19390f92eadc8f69 |
| packages/core/src/adapters/node/unicode/fold.ts | 100644 | 661 | 2087c322ee1c3a1a34819a8c2ba84550620719d5 | 3dff0b2970087919f5a54e9e4f18e8338c3ed320cad5ab19238077dabe973b70 |
| packages/core/src/adapters/node/unicode/unicodeData.ts | 100644 | 32713 | 70a071bc9e350464df216cca6cf049b2b874c80f | 8a7437a448f60dfd9ab68fa5a2ba110b95c651b530957349d1e04157e554cc86 |
| packages/core/src/application/account/context.ts | 100644 | 4135 | f736dbe816ffaac1a04569adc51c2521699e7186 | b3c957cbd478d2d6b64e5442449dc683174aeadd42b1ac4d3811ca7fd4c2ede4 |
| packages/core/src/application/account/ports.ts | 100644 | 1225 | cd64bfb8ffe7c2d8b4156fc299790ab11a3ddb29 | 7f8cb8fa595c78f664ae813bafc5d01134733616007da7d2ebb06348bd254988 |
| packages/core/src/application/account/session.ts | 100644 | 2714 | 7687e4d15cdc84c83b2f60ad69933eef8721795f | da6abc18ed13ba468aa617735c99d554377dc83ad41cac34affcc34f5a3b3118 |
| packages/core/src/application/account/signIn.ts | 100644 | 3862 | fc148a0b62bc7019af35d29fe1156023858e19d6 | 91a0363a4d78d067f3714613931b8306d074aaf2f5c36f2ee751ea9e5918a3a9 |
| packages/core/src/application/account/signUp.ts | 100644 | 5918 | 7aa127c8fdeffda89425d7c0ae0363a12afbaee3 | 7cf5d97b2fad68b56b1f2fcd77c3e8e055b812a7e7252c8afa1f5e2a2d40c7d5 |
| packages/core/src/application/account/verifyEmail.ts | 100644 | 2313 | 522bb0e14c320a0f66380cbf53c8fe2725d50654 | eddb2866f0b50a3fd3766e6432e50b08cf94a2ecd5366dccdbac081d00a3c44e |
| packages/core/src/application/asset/access.ts | 100644 | 4246 | f5dc9cdad92ee9b589e48de9014d2191cd213829 | e25aed0ba0aa3483a58c81d516137979f06cd1c58856737d4827028d01d08b70 |
| packages/core/src/application/asset/collectGarbage.ts | 100644 | 806 | 0227b4ebb187142fd7f9c6c48a3a6bcf83c033df | 6c8b5b58a5ab6c760ffb21fc1ebb6d3e6b0204fb3c7017a97a7aaf36fa2b61c7 |
| packages/core/src/application/batch/ports.ts | 100644 | 5382 | fb521b20dd78f77d28d5eae31b5d811342939b61 | d2e1153eb85fabb0532f9245635f0cd8926183f44402da8ad6d292abf82cef8a |
| packages/core/src/application/browse/ports.ts | 100644 | 4933 | 6bbea54eb4f633b5252d14091b98726d1cb078bc | 0342e816a281a7cb28560c2e347240ec331c1a9806a3c0e864219ba7cc4ca646 |
| packages/core/src/application/browse/textParts.ts | 100644 | 1482 | 3fd370e4c51feaa9b0e802d56effa3242244ac4d | 39012b262a7ff33c4b2862cd09fc88d582e5ed730977dbc8a86d06bc6b013c50 |
| packages/core/src/application/di/hollowTypes.ts | 100644 | 4067 | 64c07c9f0eba6e0a30b671e181cfd74a47f955c8 | f385be71f4507adfda99503af4aac26752d7586d2bd54fefbf2187d05cbb8d96 |
| packages/core/src/application/di/serverHollow.ts | 100644 | 1605 | b0ee178f51d3f95688bde1be9cae354d71d5a303 | f22807b3d988dd46d7d1b992786a9eec5d99a24853be08baa4a34998abd8765a |
| packages/core/src/application/di/types.ts | 100644 | 2084 | 1f8d73ea26e130633e6f37562f0cd987099bfcf9 | f16c13cc6eb139429b7d0aea2f5bf10e2ab4e0b84155ab42c6788566f2a7529e |
| packages/core/src/application/errors.ts | 100644 | 5355 | 07a10ddbf118f90b656b40775c8bd933510877f0 | d3a266afa7502b96ef88aefca46e1f9c191136527c708d6fea424ac4137ba577 |
| packages/core/src/application/execution/hollowUnitOfWork.ts | 100644 | 7199 | 0e35f36f2ec455012ec1459d041be34f5ec5472a | c22d1dcff055a6e015ba1731840951c4295c23e9eb615323b851f9e4990f3a94 |
| packages/core/src/application/execution/unitOfWork.ts | 100644 | 786 | c03b736a914334ae420a3a2fb527b8fafe0b01da | 30b91687edbd2fb2adce1cf9c3a69e522870793f3307c05d43d6605b0530b2e8 |
| packages/core/src/application/export/document.ts | 100644 | 1151 | 483b251ea30f3ec97bf93716612d78d3ced9844d | 953d5855e45f7600fadd0aada1e738300719747344ae08462363c6358eed4e86 |
| packages/core/src/application/export/ports.ts | 100644 | 2382 | a645b3ad0ed20141d5aade9cae30e8f0cdd1d625 | 5ee7d3aa07de021109cab2e0ceedf76d7528abe61d232aec34f8b0ccbf7124e7 |
| packages/core/src/application/export/source.ts | 100644 | 447 | 71e70011f7a3916e718e5e2df916e720d2906c3f | cc91f99500a9ac0dcd7f1afed768416b11813ef56f747c20bad89147dae5401f |
| packages/core/src/application/import/acceptUpload.ts | 100644 | 13606 | 1352edd388beb27a8daf05fb2e087fa1938b0b62 | aa6e71d34b4ff476725e6635062501d7b1623bfc565896ed7e4358cbe67f1d7b |
| packages/core/src/application/import/beginUpload.ts | 100644 | 2836 | 6f5caf70487070c4338651930e410b4d923ddd27 | 65b9036a8517ad55d792f6bbc1389190d5dbb576c9ba4e3ad65225e0935b33fa |
| packages/core/src/application/import/context.ts | 100644 | 380 | ec509b2ff0748d669416ffb2ba1e33c63cedde4d | 6db5a95d024ffd0d3584cbb48689c4413e223bfd2fa0c53f943bcb9f6f8026ad |
| packages/core/src/application/import/processJob.ts | 100644 | 10246 | 8166df13d3174db10f0916334c241f35ee9ccd2e | 21075d716c5fe135db5fe17b7a3a392136458314f6a08fb8f7dbd4c2988a9659 |
| packages/core/src/application/import/sealBundle.ts | 100644 | 1383 | 368e0e55c1001d658f25967d0123ad3dc03c3ed9 | 4db413910eb7eb199e32c63da46203a1d986023b255761878b580f4cadc3a525 |
| packages/core/src/application/import/withObjectOwner.ts | 100644 | 402 | c93ca6adb7ee045d5e8f6e5ff62bada0fdd53ffa | 6383820e1e064d35af7a9ac55fb0e78ae17f37a20a007620d5507bf8b8270bbd |
| packages/core/src/application/integration/drive/backup/admission.ts | 100644 | 10221 | b4c2fc8ca10feb0d51a9b25e6d7ad73e870258de | ea3a260ac0278c1c6e15b15980c065cbfd460371c0290446d87e4fc6f551b198 |
| packages/core/src/application/integration/drive/backup/automatic.ts | 100644 | 2603 | f439fe5d290b5ac327e90401f3eb3f0d369e83bf | 77422a7beceb33689d512cb269a1e129091e6fb4a01984c5f8ff2f4980ee8a37 |
| packages/core/src/application/integration/drive/backup/cancellation.ts | 100644 | 1277 | 1c0570f032c9fbae693360ddf6acd3e1d8e9bdee | 29ba9c3fe766061b93885416c14f1e37c9403937397154127b0e52fe120f23ac |
| packages/core/src/application/integration/drive/backup/ownershipError.ts | 100644 | 1143 | 7a10892809f9fb04df59470eaaef509369b9e057 | fe641f5ff89af88ff283aeb647564aec02c7ed93bdf1d4d0648cb86e2a992d3b |
| packages/core/src/application/integration/drive/backup/ports.ts | 100644 | 1978 | e0c6626a7871e7816c7e97d9dda80def8c22642e | ab767f88183bb720542028139b55e736ce2dff45d52b75215a8b18a6763fc9d8 |
| packages/core/src/application/integration/drive/backup/recovery.ts | 100644 | 5230 | 2b27077e60e4795fbaa86b5cf94cb5ceb2e0c3f9 | 48fd15eba8f598bd93640688331e4613b883cc7b716c183fa4a8d61c74ec2ded |
| packages/core/src/application/integration/drive/current.ts | 100644 | 4725 | ff9648c7d60e6a437863bd8a6ae8f9bbead404b9 | 36cf60994500b9d8e944a6fb5a0ccc2f76301b213bfd7b1dc59f978aeac35c70 |
| packages/core/src/application/integration/drive/ports.ts | 100644 | 5980 | aaea3d0bb5aad901f75a08c22537a51efc9dd1b5 | 527e530fb08854373e2736614c344a4310e8fbb75b412ce76a6771cbab011ae6 |
| packages/core/src/application/integration/openRouter/ports.ts | 100644 | 3267 | 3e1b14374b99c2386c20090dd853887d86b33ea6 | a8f0e5cdfb73a29d1a936a04bd0a1434705437ecc42483b69743f1ba0c4f3170 |
| packages/core/src/application/llm/completion.ts | 100644 | 3105 | 0d9611438d32fe35180b68ba21445251248c3e4c | 47f05252131da3f64705885c7c71a57a2c83e2fdf65dfb8e5505c4f547574e08 |
| packages/core/src/application/llm/current.ts | 100644 | 4253 | 702d637a55bacd161702ec5b3c2fd273b8011b83 | 7f31a9c440bb07e1cddc00c0dc574144334fa7e50dfaa91c3a19d1332d0c550b |
| packages/core/src/application/llm/inputStage.ts | 100644 | 3675 | 9aefbe55232cabc9ed70d0c438b6900cb5c13623 | 58ed11dec749e0cf5616d1bcbb1bbfe141ee0797dbf3f06195d54da94ede75f2 |
| packages/core/src/application/llm/ownershipError.ts | 100644 | 1225 | 254dce96bfbb30d4e51a7b2bbf747d9fbdc27a2f | 60af00651432af0449c192c5e6ab45e557381e3d667c245a9f92975e7b454439 |
| packages/core/src/application/llm/pdfClassificationPorts.ts | 100644 | 944 | 42351d7892ef64f9562448cd3b6fa33c15ec72ba | 44b55d3c404a9a28c9e71cabdb9af0fc7dc9a158de8f6dd72044b70e215e8143 |
| packages/core/src/application/llm/pdfPreview.ts | 100644 | 22894 | 562233e4d2509c0dba8d738771b9e5a7ebf8260a | 31f665724c2a4d712b93dd05ace2e91855ac05c897defd891e88f1d36e8205f6 |
| packages/core/src/application/llm/ports.ts | 100644 | 10214 | 143e893bf5853afbb4b4c6bc8d2e690d7bf29b05 | 48dc60e09ff1001c9af41e04e94b9a51392bc69b1c28702d5acea598f656529e |
| packages/core/src/application/llm/request.ts | 100644 | 15334 | 67e45a76ddd7e37f3639bf1eeeaafe263dcc5c0a | 32991083aa133c3c092b80e2bada555d2f12e7d97913950d3746a178ec0697ca |
| packages/core/src/application/llm/services.ts | 100644 | 1218 | 888c774e8aae06fce42a6ba3f1348e4e828de13e | 75a4324f195ab2b17410a9a6efd92063a9382266781cfe9b09c16abd621047c0 |
| packages/core/src/application/move/expected.ts | 100644 | 780 | ea05aac46ce3811c13107c9aa798798d93a69246 | ea140bb777b19f29783b641040efd0dd3dbf32ee13f9490d9168a84c19c25004 |
| packages/core/src/application/move/ports.ts | 100644 | 2984 | 56ef697c5643aa4058cbb18f3735382a2db552e4 | 1de17f57340de098124c415cfd98487564024c2c363e386282335f54bfcd9e4a |
| packages/core/src/application/note/commitNote.ts | 100644 | 6916 | a7ba8e31fc8c35149aec98422fafe8e46ec1bced | 56aa9524a4c6750073ca09c50b6daf11abc2afcdc96915993f6e5719577d8c68 |
| packages/core/src/application/pdf/anonymousPorts.ts | 100644 | 1582 | ebcf593896604a7b16b451710b4cff6f79bc3460 | 78664d13ef0cb128bb521cba12a57363618b467b4502b8e5f000b04c79a33109 |
| packages/core/src/application/pdf/demandPorts.ts | 100644 | 1019 | 0b91843e9b71a015da68db0657a08102b2a15d1c | cae92c830e83b042a34fef25e226657cba372e8b53018a7c7a3559dabebb378f |
| packages/core/src/application/pdf/document.ts | 100644 | 806 | 70d87066ccdb1d0b1849d30df726c3073295f1cb | c6392944e5b069e3f012f72be9f1e118d6873317ecba03d7ded4d06b92699c2f |
| packages/core/src/application/pdf/ports.ts | 100644 | 5686 | cd5ea5459273b9955c193d02ca5d7c070d006dff | 5e129b9b0dbe913ad7b634fe04ff43ed940a329d89d1a0a0cd69ed876a6612ec |
| packages/core/src/application/ports/clock.ts | 100644 | 107 | a8b172c41d4e1a6c5df268969ccfff305dfe8a8b | 3be3dce0c0d5f99699777734317dfcc67a4d0635ec1d32f8a86a987c87a14ddd |
| packages/core/src/application/ports/documentExtractor.ts | 100644 | 518 | e8fe3153acbb98876e5b25209cc1a92cf2b24987 | 049523f8d1cbd5a703b4213063f410474140615d235695d3a72a1f24f82dbd7d |
| packages/core/src/application/ports/htmlSanitizer.ts | 100644 | 800 | 3500cc26c4b5368d7c5ce5558222b6e9cf212e33 | 68e86d4b6662be2fc23c2a413c0bf654674fe657946461723d58573ab463a9c1 |
| packages/core/src/application/ports/idGenerator.ts | 100644 | 1307 | 9dfeab59f1687f5fc185238639ed78020ee32883 | 97d3bbaf71df0fd142c8a64d17ac687f78d57de7705eff0fa7563adc21cd9630 |
| packages/core/src/application/ports/idempotencyStore.ts | 100644 | 301 | f07744a2093d848cfc68a7abfe8a81a15b7f8157 | 86c0c108f687cf4e91e6dfb385cdd4b90e2409102b3654510f750191ffffd73b |
| packages/core/src/application/ports/inlineMediaProcessor.ts | 100644 | 373 | a148030e8ff8842f4834a650bd1db8b3323c26d1 | 082e093e79d8ccca6cb6a2709523e1b96635ebd5601d1bd421d7cad0fda0fde8 |
| packages/core/src/application/ports/invitationMailer.ts | 100644 | 144 | 028b5f4906ff610e9b90e65b0bd6940bf60efae4 | e37ef31bddac6cd4715ff8d90edfcb85231bc8a58634da787919d48245c16e8b |
| packages/core/src/application/ports/logger.ts | 100644 | 717 | 2c681d340fe2f26e5fc50d461bb6407577343ac1 | 9dd1c0232611fb1eb4fbf85304e305783751b33281fb19dc390a058ac37a90b6 |
| packages/core/src/application/ports/mailer.ts | 100644 | 139 | fe6510dee538ab6e0e2f1796b2ac2230653489d5 | 063972eccfecf1c96d64f698103a603239f82e3347f7e5a7c20166c4d0d7627d |
| packages/core/src/application/ports/mediaValidator.ts | 100644 | 165 | b1513d9bd5acbfc777bfde9c3789c102786c86eb | 44f86817a5fc93ad04052bd87f5c533b3ac31350dc74d99504bc13e76712c44b |
| packages/core/src/application/ports/objectOwnership.ts | 100644 | 943 | 7bf9407a93c38ced53c0f30a0be53bcb3f0f048b | 1adc9ebdbbf7a2e60185e7e1fa6471623fb6b11dfde1533281f4acd5f5a4719a |
| packages/core/src/application/ports/objectStorage.ts | 100644 | 2229 | f991da4a666b6f25e2c32945998b2dcaa22dc445 | b450c16f03a2c638d0c6e728cee56f8d008cd0a1b519ccdda8619d75bb9f3f55 |
| packages/core/src/application/ports/outboxRepository.ts | 100644 | 2950 | 1e8b8ee85b6ce2effb027588b9c6727c3219be0d | 9139ef19916ae95a976764ed789ba219eb49f04d5320487befe553b4699042a3 |
| packages/core/src/application/ports/passwordHasher.ts | 100644 | 139 | 8320cf4c00746f9a06c906b53fb5779f0fba47c1 | a24ba0c7a726ec17ea1d09c82d27065518fa97186d3e3cea97425c5cafe1904a |
| packages/core/src/application/ports/referenceProcessor.ts | 100644 | 1597 | cca10feb2f644a622c7991d36b9d6f8b60abf132 | e7a05e8e67a39a7a8925d18e965d4ebc6e0cb13567ec9486d2e0527f4a012996 |
| packages/core/src/application/ports/shareSecrets.ts | 100644 | 415 | bf0c26baf44fc0eecc4e129bcda5a26578dd896b | 472f9fe6b6e5c1baa4f2c80aaeffd85a402f05b27046027ea474839e5346268e |
| packages/core/src/application/ports/tokenGenerator.ts | 100644 | 89 | 377d9867909038ff08c97277e298fc0a4b524838 | 1aa1717eab8a3d39151ce91b3800ceb50aeb94dd2f05ce54642f0e4b29610731 |
| packages/core/src/application/ports/tokenProtector.ts | 100644 | 240 | b921a40f12af2b7261b344e74c88ce51ffeab132 | f58a7b8a38206c43caa126902bbe4a5da8bcb6626e2b560d2faf726a1c24677e |
| packages/core/src/application/ports/workspaceIconProcessor.ts | 100644 | 392 | f82fbee9e39cfee9534a8af7017f175857d91a3c | 82e23ffbed3c343dd4f8a5a7b0590b6dcf9fa3a9e21487054b25af39d892eb82 |
| packages/core/src/application/publication/ports.ts | 100644 | 2624 | 3f51db721138308d91732a6908bdd7625727e27c | 03e8c131cc5703dc0674d1de81bf1497f31adcf24130828fd904a3995e590409 |
| packages/core/src/application/reference/dependencies.ts | 100644 | 3905 | 747c2bc0048f85f674535ee775c6ece152526bc0 | 4ea4174beea98aa647c0dd1c29a662828a27d90b11fcedcaf66560693e6858ca |
| packages/core/src/application/reference/schedule.ts | 100644 | 7031 | 75c3d54af7e8b5faf8a1f6e97c5f285ac592c35c | 1a2a9f7514b6ee05b225ddecb3795014cfb57dde55b155af437659eb5bfe8fe9 |
| packages/core/src/application/regeneration/ports.ts | 100644 | 1641 | 2457348a3acbeac5261164dedad77d8fded6deb2 | 60c1faa71dc5dddda12d9ae65c7240909d538111040ac5ef9cf4d970a752b8d2 |
| packages/core/src/application/regeneration/services.ts | 100644 | 6634 | cfc0abed366e0e78e320f91631efd7bed35cc0ad | 85f69a8759e2e524f6bde100632b1afb74d5bb0862c39162a1319bbc38a45139 |
| packages/core/src/application/tag/ports.ts | 100644 | 1902 | 9584bd33d5fa9bf5cc093f9e2213fa757887e0c7 | 2bfe9fdc2aad26d4ae2b56474b7d29b2bda5a8c1fdf45a7add217bd57bc5b1ff |
| packages/core/src/application/workspace/access.ts | 100644 | 2616 | 7f7eb4e0659a072eaa4d5e4c3273cd877e17d090 | 627a529df725fd1fae951c40762b744a416bbd00383eee331d197f2f9639831a |
| packages/core/src/application/workspace/invitationMail.ts | 100644 | 1111 | 71e5a1c5afd4f18949a1bf87c42e87816d927cf5 | d1bb04bc0f4bf7c5fbfb598b705d4a8361bac9a0ee3c3f42bc7a81b4ab815112 |
| packages/core/src/application/workspace/invitationViews.ts | 100644 | 1370 | 9726a926ce9d962a94526662ca2f773c3f10f924 | bbbdd4a7dc2a00e00b137168e508656b87d3eb692d47f21ba6b97befe9741a75 |
| packages/core/src/application/workspace/invitations.ts | 100644 | 15867 | 267397db21755950edca6b4af8f6b502537d7f04 | b2a03531a22e059b18b160fbddb3162a93fbe395a72824e4880186f6d2870db7 |
| packages/core/src/application/workspace/membership.ts | 100644 | 7625 | b133e39f4e0150395559fca5174fbe03cdf8a93c | 1903969509dbdb06dd17947a38a53e061d0ff4ab96cc7efb24268a53a14393de |
| packages/core/src/application/zip/names.ts | 100644 | 258 | d2b8cfcd9f5a54ce6e8bc78f0435601f08c2c7a7 | 4c9c2f2db000f288d3d77bb884c2811cfe2f9967d1044ec5959aa3098cdaa45a |
| packages/core/src/application/zip/pdfPorts.ts | 100644 | 1671 | b15a901fd7a9a63ced24e13a878bfbcd85da4228 | 9789025b70bab56d41ad03a8016e177af4c99964e757f94dd23495d5e7eb44a1 |
| packages/core/src/application/zip/ports.ts | 100644 | 7594 | adea681fc9c268a94d2651921755c28ca812c64b | eb441b67a82af06442e1c1c49a3057477ef7d0d58ca8d705cd03aa29a0783e0a |
| packages/core/src/application/zip/services.ts | 100644 | 1584 | d37ad1bdb45e4d3b6bd2f1837f21770d462b7904 | 155b4bbf268e263e472bb6fd156a8936b2ddff4b667cc46cf1dc94cdf0cc0a66 |
| packages/core/src/application/zip/writer.ts | 100644 | 882 | 85ecb1ffd458ead91a199ca2e06aba254290f231 | 19af28fd1e916ad06c462cdeecb8bf6f4adc6a66c7c53e11d12483659f6cddf8 |
| packages/core/src/domain/account/authentication.ts | 100644 | 3219 | f3e1bff7343f8cc3f9d96533da371754fca74260 | 1bd62042854874cb41332d0fe3cd420242566f30d5c37831275f0c7271796d80 |
| packages/core/src/domain/account/entity.ts | 100644 | 1932 | d0349c400a76ab497ecaac4372cf3930a82d2314 | f3b026a6b777c6ef9ef62c0b6b673e2752ab83c57ef88f3bd3302663c28bfbc9 |
| packages/core/src/domain/account/ports/accountRepository.ts | 100644 | 873 | 76657f1b9d790ee36149b8b9d637bea824f835e5 | 33c161bebc020ca25bb50aa8fecf85234be8fc7fb110a3060299f816ae6e8124 |
| packages/core/src/domain/account/ports/authAttemptRepository.ts | 100644 | 959 | 255037a64b0ef6924a6cf369790243bf4ee02fbb | 6f14672e85146fd3945b7ecd6c802ab78c9adf5f85b4df9324c0896a314c14ba |
| packages/core/src/domain/account/ports/authenticationRepository.ts | 100644 | 1231 | 018c233ddc33700378452ccd0a2c0bdf77614e74 | 2abb3f6590486a4fd07cfea7199fca741af25b3ca9b88cc5ccf246fe5be1a773 |
| packages/core/src/domain/account/ports/displayNameRepository.ts | 100644 | 343 | 0e1b7a407fdda95bfbc1cf744cf76fa7a1c6369c | a2982e35e94277f27a5e2ba0d0eb47a983cb8a9dc00cdd0bff5f7b516a3dc062 |
| packages/core/src/domain/account/ports/profileIconRepository.ts | 100644 | 757 | 710ee0957fb7c90d69ebb524c049fee474e79d11 | 776fb5a3e8711af408c92408ece927dec834a4d21a96b4abb1db4022080752ba |
| packages/core/src/domain/account/ports/publicProfileRepository.ts | 100644 | 465 | 60c1f71302490f74c3c6c3c7618aaafb9f659746 | daf5edf02726fbf95d434ae7ed165ef77f6165591258af1c65fd4168f82221cc |
| packages/core/src/domain/account/profile.ts | 100644 | 2301 | 648e31a6dfc6d5cfcb3ef078a5b6a08d7130ccad | 473598365f36300f3d6b971649ad5f7699d3a1e771cee905263c851b5cfe5c27 |
| packages/core/src/domain/asset/entity.ts | 100644 | 2801 | c060f8f1aa41c134c87d78673b8a0742fb819435 | eecb519811a44c39f0ed20d84e41897b62ac4cc4bcf94b0259cc424826bf76a2 |
| packages/core/src/domain/asset/ports/assetRepository.ts | 100644 | 1497 | 16636973787b5a8e11e94cc58fdf55b32d2e5c65 | 22856ef29b2aea052da13446ce6d015cb7c1d22e99955373e7d8dcaefc799355 |
| packages/core/src/domain/batch/entity.ts | 100644 | 1876 | 40515f7fefa9ebe4c845da65923554b554f59bfe | 7c774cab1992ce517899ee7984d11356d8736c50c82c4383419d208d8afd732e |
| packages/core/src/domain/browse/query.ts | 100644 | 2972 | 7818ba9f9f129f7b5c98dcd9f52547f12242f0b5 | 8b79eaf6ac0ae9261becb79d381516a01a0c2023bb4b3b6b92ed81bf54776a98 |
| packages/core/src/domain/common/event.ts | 100644 | 3218 | c9d071920e94ecefc5146704a3475be0f4adc0f7 | 660aae3429f657b3b275662eec3f6255b2d036ce27559603cfe4a551548036fb |
| packages/core/src/domain/common/pagination.ts | 100644 | 301 | 9429736285dbde1e16adc8ea610c89adab9afe79 | aa8d3a048047a4fe14d8575f5c1941ab5dd22d21c79318d13d59767468990ed2 |
| packages/core/src/domain/common/transactionalRepository.ts | 100644 | 2693 | ef26b7c2956155b1592be7a9a23053e46760d51f | 17737c788ca6820f4d09252ab2c94b2af42df1bbaad2305b55526cdd37455569 |
| packages/core/src/domain/common/version.ts | 100644 | 796 | 6bcb9c762a6c2cf77e68e34a9d78cb2ca67e7aa0 | 3f3a7b7f955f12baf728392a768745614d67a673224de504003a249ae02d8eb2 |
| packages/core/src/domain/error.ts | 100644 | 1914 | 9795fe18aee9c24fc9f18bfb90ec0f8a7190d241 | 4c734a0010826e072ea9698baa22be49b4171a8db7446af703a30b89895ca7cb |
| packages/core/src/domain/import/entity.ts | 100644 | 3921 | 8c9bf3f749f9e7d6322f3604a8d0a7b7f6808bb7 | 727534315f86b400a6f927d40aa0dd5d2b8d6a61e37631e70609e0212446bc86 |
| packages/core/src/domain/import/ports/importRepository.ts | 100644 | 1368 | 39dd4b9c8c2ef348ad93e312ee318f75b8b80c67 | 8ee75492fe7a172999c5fe5c08436413c7a7883f35b5614a06d564f9aec855af |
| packages/core/src/domain/integration/drive.ts | 100644 | 17322 | 11bc6cdfe917f7a8880a78211119c35f45aba0c5 | 54eb360b110d8bce245f22fd586806941f6955a4245a675f43f87ea3de378c84 |
| packages/core/src/domain/integration/driveBackup.ts | 100644 | 11342 | 25986a36090289d451a2bc6a2d410dfc3e69c044 | a94a100a8a7061add2d00c5a73e2e71d79e78aa54e49d39f0958b919030c43eb |
| packages/core/src/domain/integration/driveBackupRepository.ts | 100644 | 4848 | 826c8b28a27909702eb34868925c35c026855ed5 | b7fef219549969a54f94a42a497e2b5482fc4056d2602e596e0400d346ace6e9 |
| packages/core/src/domain/integration/driveRepository.ts | 100644 | 2863 | 9b517cbf52cf205218ac2b5a6ffba867246910bf | eb6f41c67d19b741ba101e9ff583e2016df9f998162562a40a21ec401e75ad25 |
| packages/core/src/domain/integration/openRouter.ts | 100644 | 3995 | ffbb6957159458d1d27c6c393087cde194f2a431 | 61359f94d811ee146efe43d03b955fe54440f1eb26199d458e27c7eb9e2652e2 |
| packages/core/src/domain/integration/openRouterRepository.ts | 100644 | 1292 | 88aa31352144d2fa43250db9c97fbdef3adda4da | 8cda42f38f2e1bef0afe8a9fd09e8e24a84ef73e913241e2933f26c7dc92eeb4 |
| packages/core/src/domain/job/entity.ts | 100644 | 885 | 3344919e7311f65e20b00b86d22c997c6949b945 | 55cbfee14e5a341ad15bccfccbc62a81af2bcb5dedca50621863a66e82814cf8 |
| packages/core/src/domain/job/ports/jobRepository.ts | 100644 | 884 | a1064d1f11afc8260b7e7fd175e905bb3250b511 | f62be73d988a9e3c8f91058b1a8bab9ed6f48ba8c4f3dd47410798c0ff86883b |
| packages/core/src/domain/llm/entity.ts | 100644 | 7524 | 54e930cabbcbb4e8efc1647968c5187dc3ad4301 | 29fc41d9f9e7f66724547cfc7de61726f45752c006ca184326e28993e155c8fd |
| packages/core/src/domain/llm/pdfPreview.ts | 100644 | 8721 | 273321d06dac01ba9184022d5aad8ffcf694a3ba | d356c2144d536c3edeb665c7b403b31ba0ed3fbab9d041c2a8f0c71fcb0f3ab7 |
| packages/core/src/domain/llm/repositories.ts | 100644 | 2868 | d98da42096fb24a0077f68ff06e0f7acb58ccab2 | 1185e395f35781f2f878a706be89b2a31459708005fb860aa8d2d1370813707b |
| packages/core/src/domain/note/displayStyle.ts | 100644 | 1436 | a429752f6d58645b4af5a3cb82a0480b22a2c940 | 26c270f9d7a3b4691acf70e593de52961c2cc36895053559d4cacee8be9d38c1 |
| packages/core/src/domain/note/entity.ts | 100644 | 2418 | ca66bc1a8912240574e736500052cc5ef0f32454 | 3f60b8e162ea9801d2ea8fe7a1ba3ee8488b1b5365b63d90029abcdd99d4afaf |
| packages/core/src/domain/note/lifecycle.ts | 100644 | 1133 | 9d01f064b71f93fc9c427249a108c7bb3067cc12 | 672563de5c14c886fbdebd46fccbdcda8ea0dac49e4cbe63f3ee867b6284a94d |
| packages/core/src/domain/note/ownership.ts | 100644 | 131 | 7434bcb23efad7b8669b529e9409d04d10c0a237 | 9db2c5afbda589171a010792fcf702bbeb4fea5a7e2b55cefb5fa0b8c037eb00 |
| packages/core/src/domain/note/ports/noteRepository.ts | 100644 | 941 | 04a5d5c4d8aae9b962b59de028c78936097ea96f | c1dda0add94530a6aef886d43a7d401ca99b1a889500399ad51564b4531141f3 |
| packages/core/src/domain/note/ports/revisionRepository.ts | 100644 | 453 | 0d069d057ca992413e8a2aa6c0799f357fa57c30 | 4a0330feefd5f60c867f4d42aaf155d63239a41268be8e057129cd9f92d1818c |
| packages/core/src/domain/note/revision.ts | 100644 | 3022 | db1b55b5bac69ef9c57bd57070d2038ee7c756e9 | 7073fadb009753301dd6be21deb8953a70ed7f09ae5aa9fed0b9f0f5c4117f4d |
| packages/core/src/domain/pdf/anonymous.ts | 100644 | 1984 | db8703bb680973242fc4d8651f274a948e0cfd8a | 5d782e9638acf266a88f6c712dc35225a136fcfdaccdf9f7477e2d52a5488a56 |
| packages/core/src/domain/pdf/entity.ts | 100644 | 3398 | 00f6c9696e43bac0cf2ca96deccfc4d0f49efc63 | 7e0bef2b9a37a65f7e3c80d6be3e07bd4b5bc5f579bcb6eca0d2e1ac59560cc1 |
| packages/core/src/domain/publication/entity.ts | 100644 | 446 | 3d673d9100c4c880a7f09863676f037e932eca04 | c19452fd0e3b49c13779503998ea4aef4ee3d00c02f8c79f64f3c8f8d84ae4f2 |
| packages/core/src/domain/publication/ports/publicNoteRepository.ts | 100644 | 379 | 0714f16eb9cd4ec7269b1b731698b3b8542cebfe | e51fbeb884e6d01c7ba2b0884905e7bc11897b3dd3100112e598a1fa76093ad3 |
| packages/core/src/domain/publication/ports/workspacePublicationRepository.ts | 100644 | 457 | 6276c0bcf1dbcaac166c33282d44eabaab51e4a1 | d51679fc0bd8167a400401cb3616397830b1dd39c70577372c9dac10b7b88cff |
| packages/core/src/domain/purge/emptyTrash.ts | 100644 | 1749 | 912600fef76acc916a6549d5bd94cd05aae2adfe | 9f8f4ebe338c470acd50e59d5643d19484a7b586708b6ee79480c7a7486a8d99 |
| packages/core/src/domain/purge/entity.ts | 100644 | 2486 | a503796a965ff8a8dba2a8ad4d68e9e683882312 | 8d91ad925f2d6a15004b5628d2c1b87e4af21ede589a87ff12e936922872c288 |
| packages/core/src/domain/purge/ports/emptyTrashRepository.ts | 100644 | 1841 | 26374ca9dfaa3634fdc480221e87e04a34892dbe | b26aa5f957956d631be7864e3ee2ed74ca6beae90a26a23d9abc9a5a6a84c968 |
| packages/core/src/domain/purge/ports/purgeRepository.ts | 100644 | 2277 | 1212d823332d08147407dd2540b231087a75f487 | 649a4d2e123161cd873504438463a4923359ac221b5116751c7b9108744b4163 |
| packages/core/src/domain/reference/entity.ts | 100644 | 2526 | 0fefba25ff7b4d1f794ab66b114a1ed6397519a2 | fda49e53c1c5d8ff7cc297e9c18641ca484a233fd7df6e40aa07b893e9563207 |
| packages/core/src/domain/reference/ports/referenceRepository.ts | 100644 | 1958 | 51660f8b2b4926c00d68bb790c9733451665961c | dff0be3b19f9ce886c6e8b41534c5d27609ac7d742e362f548a6474ab88bf01b |
| packages/core/src/domain/regeneration/entity.ts | 100644 | 6214 | ba2a056fbce432d46dbfca925bb63b12993fecf0 | e8302bbfc23d4d9baebd704466e00c2ba13629f721de366d2a720668d128af79 |
| packages/core/src/domain/regeneration/source.ts | 100644 | 3296 | 42de64a82c5f19002b3a072a52d6dc3e54880a6b | 65704cc89ec4c57e6a72f6c39873fa46dd3fc25d81c69ac7c5065da2cff496c0 |
| packages/core/src/domain/sharing/entity.ts | 100644 | 2510 | a61f750e8a6fa887bf593e1997c424920738e8a9 | aca79531a62a7bd2d19b8ed5f47559fbbe821af4b934a8aaaf0f1811a5a04923 |
| packages/core/src/domain/sharing/ports/sharingRepository.ts | 100644 | 1249 | 52d4f8f5f8606e737c5d2044c6c319d7e010e693 | f9e21a0cefbebb89fd1c700ac4427f40b537a92e73a5f1c537071be436d496de |
| packages/core/src/domain/tag/entity.ts | 100644 | 1241 | 37ec80825694454f6a97c6d2fc3d37ac6d6c0e26 | ca0fc8365e838566d34a58eebd61e2102ded0286ff6344635d99928a02c59878 |
| packages/core/src/domain/tag/ports/tagRepository.ts | 100644 | 727 | bb7afebb15d2923df1f4920e85df993a545d3206 | 451a4398815900fe2e611b6b7cd1213133c2467c0b0ba743ec093bb6435953b1 |
| packages/core/src/domain/todo/entity.ts | 100644 | 3737 | 16ad4f42582e402684263e91c2a6b3c5862fa68e | 3e91981b8ac0cb6e074ea4b6404e3ad6de5abbd19e8dc0bb483cb3ff0c8920b5 |
| packages/core/src/domain/todo/errorCode.ts | 100644 | 269 | 38799db57a9f6f08edbfa24f11692a6b89d4656f | 1c70ff22a8931e8d492b09413e0d07ab835e97e98bc65f99a2acd92365c863a5 |
| packages/core/src/domain/todo/events.ts | 100644 | 1767 | 75c55ee2cd1157f70bf5ebc0f3f8ab4e6806074b | ed443a90b81865b3f069938e0cc2cbb8617c82cc4660fa4eae8f410309ed8773 |
| packages/core/src/domain/todo/ports/todoRepository.ts | 100644 | 1100 | 94e34fabe61473c92441a671350400f8c8875600 | 7abcf0bfb5d36424342b082b5c2862eabe2ea9673cd2b5c199c48f161e40085d |
| packages/core/src/domain/todo/valueObject.ts | 100644 | 1755 | 1c4d1fe0ee74aefe5d507c3d139552401001811d | e2a1399e76dc279b2c69b09650329324c7e601f76dd1b781a31871620a9b2e3e |
| packages/core/src/domain/workspace/deletion.ts | 100644 | 1290 | 8995c706dae4793ce7e0fc08c9342d136f20132a | 4cdbb5c6350482e0f33e56dd78e09716b4ee6b04a4a224c355f6390325f83919 |
| packages/core/src/domain/workspace/entity.ts | 100644 | 2465 | 9acb25b033a8b4936e978e188bd98f62939f4356 | e96c8f5448e2dec4e525015c00466adb351965517639ca44034c3905020c0fef |
| packages/core/src/domain/workspace/icon.ts | 100644 | 1341 | cf528d5e72340e3fd6da6cb5b2dab8b60b147a09 | c84b9eed5c4bee76632827d4e38b2a71cba899d42e8a7cf3ecac1bea6996a6cd |
| packages/core/src/domain/workspace/invitation.ts | 100644 | 2575 | 06c4a4403163636e877f6d4688a03e949774897d | 507c4c11aa5a4672c06c7b0e05f15ae84a71f24399bca1658e011f60c93695a3 |
| packages/core/src/domain/workspace/ports/invitationRepository.ts | 100644 | 1262 | c93cd515bee4fb775bce2845db47ba44d44e74b3 | 86c86662497f336dc5fbe2a7d3119f7978b4623dfa0beb8cd51823e096b666a3 |
| packages/core/src/domain/workspace/ports/workspaceDeletionRepository.ts | 100644 | 2385 | 75752b05074a5daafdf7c600f8bba06dba944c0c | 634b77d0f33c04b7a63de418757a465ea0219235b929f7e8149179b9e9107a2b |
| packages/core/src/domain/workspace/ports/workspaceIconRepository.ts | 100644 | 835 | 6e0d6a2891bc47c35804b7d0306e84fc0d0e2961 | c400d4de822866c9f4a743d0651fc2ce160bae86e2cd11b57fbf8e21bac56f39 |
| packages/core/src/domain/workspace/ports/workspaceRepository.ts | 100644 | 1414 | 09fefa40ff03833d2d38a64e91b278ded61bc87c | d7151303e9db28da857175e20d6c8d94df9d251eee3bcf04191f1701db58b8f8 |
| packages/core/src/domain/zip/entity.ts | 100644 | 6171 | 992a0ec8d4b69ac07adca8ee93f4ea45d35b13b9 | de6f63500b82761f1164694c81a006fea0be4ba2cb25dd970fbe28b7d2346a46 |
| packages/core/src/domain/zip/pdf.ts | 100644 | 1365 | f74294558a403756eebf1a0817a15c513b4afc6b | b4b9e5334ad2ff0ea418625649edea5c8d4cee5c91a4d4acd25592d3dd75a0e2 |
| packages/core/src/lib/error.ts | 100644 | 960 | dd428589abc9e4c0bfd98b14374e2eb020de27c3 | d7c6de69cd0b6d8bbd5fc7057092e162b64ee01a44191888fdd8286401575f0d |

## Freeze and limits

Only this NEW public plan is written wx600. Existing source/helpers/reports/bundles remain unchanged; no whole typecheck/lint/format applies to a plan-only change. This is a binding/scope proposal, not implementation or runtime evidence. Native policy and counting/build guard contracts above require Root adoption before helper creation. At fixed hash notification all source/B/public-helper/dependency/doc readers and all writers/runtime are stopped. No automatic actual, default preflight, root reservation probe, retry or rebind follows this document.
