# S5 finite test tooling candidate

Fixed at 2026-10-06T08:22:53.092703+00:00. Candidate tooling only; actual tests/default preflight/source imports/DB/Worker/owner/probe/new validation-root operations are **0**. All source/helper/report writers and readers stop after this report metadata is submitted. Independent tooling preflight and a separate Root one-family run adoption are required before execution.

## Exact candidate and scope

- Source: `/Users/hikaru/github.com/tuanemuy/hollow-p5c-machine-79ef126-20261006`, HEAD `e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42`. Product/test bytes remain unchanged and tracked diff is empty.
- Existing immutable D1 report `P5c-3-s5-d1.md`: 31,765 B / `cda85c77d1d42468d93a90affff4e4da3c973f5214243edac36f0dc1e0360718`; no edits.
- Source manifest: 1470 regular entries / `d1b9a0b801f758742051495c7c5f9daa9645a778aee57279340f9fad4a7ec29e`; shape `5ad960552ccd92b0e667d17b832096b68027349ce2324cf4e3bce42dbfe92477`. Regular1469 mode600 and unique Git100755 source mode700; sole AGENTS tracked link to CLAUDE.md. Manifest is embedded in the new candidate, not recovered from private data.
- NEW public helper `.goal-implement/helpers/p5c-s5-test-runner.py`: 289768 B / SHA256 `a365763b796fa27e38543dcabf4f54320f4fed5865dbf0210f789a23927e5c10`.
- NEW public helper `.goal-implement/helpers/p5c-s5-test-config.mts`: 389687 B / SHA256 `13dd50e505c00cd0e4813ceb25593ea2cff26630c265751814b00d912f6f203e`. Exact CONFIG_SHA binding matches.
- NEW report is this path only. No bootstrap, source, fixture, product, port, DDL, main or management-document changes.
- Both helpers are own regular nonlink nlink1 mode600, created O_EXCL. Existing public helper bytes are unchanged.
- Public dependencies: exact108 declaration links (105 declared + root canvas/pdfjs/sharp3), self core/web target this SOURCE. 108 package-metadata bindings / 83 unique canonical package.json files, each exact bytes/SHA in both helpers. No package/dependency changes or install/download.
- Own CF986 / SHA `1803d60aa0818e5a3a7630807466ffaae8fdeb0fd85b7fa59431638fc5a479fa` remains bound and is not regenerated.

## Public baseline and proportional delta

The two known public baselines were read in full and SHA checked, never imported or executed:

- S4 runner275167 / `b6cf65118fbde4f42cc99c03a00862a749e83c4ab7a913dd7ed04f019d335af8`.
- S4 config17853 / `e73ffbd516191f1aac3df1ab9833bd3ddc6072942120a5c67e7ad44b5f57b3df`.

Exact AST source-segment byte equality holds for 13 reused functions: `checkpoint`, `safe_diagnostic`, `validate_diagnostic`, `require`, `read_regular`, `resource_io_context`, `resource_diagnostic`, `group_state`, `owned_signal`, `diagnostic_json`, `fork_ledger_receipt`, `copy_db`, `save_summary`. Changed functions are `source_guard`, `root_guard`, `diagnostic_reporter`, `run_group`, `audit`, `main`, `supervise`. New `s5_native_receipt` validates only S5 bounded observer rows. The original run_group PG/pipe/resource supervision loop and outer supervisor stopping sequence are preserved; invocation, family/control schema, S5 result decoders/counts and root selection change. Legacy source/root constants, bootstrap and all S4 business branches are removed. No existing private helper/root/cache/results are read or reused.

## Families and exact invocation

Each later adoption runs one family, one fresh exclusive root, one NodeCLI and stock fork. There is no multi-family auto loop. These names are memory reservations and have never been probed or created:

| Family | Root suffix | Exact source file | Required / formal skip | Group / case seconds | Business resources |
| --- | --- | --- | --- | --- | --- |
| pure | p5c-s5-pure-341ca982 | application/regeneration/machine.test.ts | 4 / 0 | 120 / 30 | DB0, Worker0, owner0 |
| app | p5c-s5-app-a184c90e | adapters/libsql/__tests__/machineRegeneration.integration.test.ts | 7 / 0 | 180 / 10 | app DB1, fake codec, Worker0/owner0 |
| native | p5c-s5-native-5382beaf | adapters/node/regeneration/__tests__/machineRegenerationNative.integration.test.ts | 2 / 8 | 180 / 40 | native DB1, actual parser Worker2 cumulative/sim1, owner0 |
| native-d1 | p5c-s5-d1-9d230b41 | same native file | 1 / 9 | 180 / 40 | native DB1, Worker0, actual original owner child1/sim1, ps metadata role1 |

All files above are under `packages/core/src/`. Formal native skips are imported app7 plus D1one; D1 skips are app7 plus native2. Required test titles, suite/fullName and registration order are embedded from current source. JsonReporter space formatting and public TestCase ` > ` fullName are separate fixed contracts. No suffix matching, aggregate-pass substitution or unknown skip allowance. Exact selected module, same TestCase ready/result identity each once, formal unstarted skip `options.mode=skip/result=skipped/diagnostic=undefined`, all required real passes and hook counts/errors are required.

Future direct outer argv, cwd main:

```text
/etc/profiles/per-user/hikaru/bin/python3 -I -S /Users/hikaru/github.com/tuanemuy/hollow/.goal-implement/helpers/p5c-s5-test-runner.py --supervise <exact family>
```

The inner invocation is the same pinned Python `--run <family>`; Node argv is exact canonical `/nix/store/a5sxfwnzi3kzxrgj3zfngcqamdhnr161-nodejs-24.18.0/bin/node`, pinned Vitest4.1.6 public CLI, `run --config <new config> --configLoader native <single exact source file>`, cwd own SOURCE. Node environment is PATH/LANG/TMPDIR/HOLLOW_S5_ROOT/HOLLOW_S5_GROUP/NO_COLOR only. No HOME/NODE_OPTIONS/env-copy or shell. Node actual canonical execPath/version24.18.0 is checked by both parent config and setup before fixture/source import. Parent sets its known NodePG metadata into the stock fork's original copied environment; stock fork original env reference is preserved. New explicit `--preflight <family>` is source/public-only and creates0 bytes/root0/DB0; it has not been executed. No default CLI is invented.

## Controlled source and setup gates

Root adopted controlled-source guard, not per-load-hash proof. Original inline Node24 registerHooks/argv remain unchanged. Runner startup, native owner spawn immediately before original Reflect.apply, immediately afterward, setup completion and family tail bind the same e25/1470 full regular bytes/mode/canonical/hash and exact public package metadata. Extra owncore source entries/links reject; no dependency traversal beyond declared canonical targets. All product writers remain stopped. Resolver errors, changed declarations or canonical off-scope results hold.

D1 original inline hook is synchronized next-first, original returned value/this/error preserved. Only relative no-extension/query-free ERR_MODULE_NOT_FOUND fallback within canonical regular600 own core source is allowed, as defined in accepted SOURCE. Original owner argv remains `process.execPath --experimental-transform-types --input-type=module -e <exact bound ownerProgram> <original trusted DTO>`; cwd/three-env-fields/three PIPE/own DB/object/directory root are checked before spawn without changing original args or DTO. No bootstrap/tsx/loader thread/service. Per-load FD/hash and actual transitive TS import success remain **unobserved** until a separately adopted actual.

Self config is an official setupFiles entry exactly once. Parent/fork discrimination uses public Vitest init.D98-gwRW.js assignment of VITEST_WORKER_ID and VITEST_POOL_ID; only positive worker id / pool1 enters setup, with exact execPath/version/group/root gate. Parent Reporter/pool registration and setup observability have distinct roles. Setup module top-level imports, framework setup execution and real fork realm module-binding reachability require independent review; syntax success does not prove startup. No other constructors/handles are observed.

## Original handles and closure

- Custom pool initializer name `s5-observed-forks`; original ForksPoolWorker.name/protocol forks unchanged. `cacheFs=false`. Original super.start is surrounded by an exact temporary public fork Proxy, with reserve/check before original spawn and same actual handle registration before later guards. entrypoint/empty args/execArgv reference/env reference/stdio pipe/serialization advanced must match. Both normal/abnormal finally restore only the same wrapper, preserving unrelated mutations as failure.
- Fork original exit/close/stdin close+finish/stdout and stderr actual EOF+close/disconnect/channel release/PID ESRCH are independent. Original stock SIGTERM stop may be normal if its requestedStop/termRequested fields and all physical closure fields agree; SIGKILL or outer force cannot become normal. IPC EOF and IPC FD are null because the public ChildProcess IPC channel has no readable EOF/FD API. Disconnect is not IPC EOF.
- Native Worker observer checks canonical parserWorker.mjs, original options/URL/stdio/transferList. Reserve cumulative2/sim1 before original construct, retain the same actual Worker immediately, preserve receiver/args/return/error. Source original requested terminate Promise is returned unchanged. Its derived observation Promise handles its own rejection and records sticky observerFault; it does not issue a second terminate or a new capability. Separate real `message.ok=true`, original terminate fulfilled code, actual exit same code in 0/1 and real stdout/stderr EOF+close are required. Code1 generally, timeout/abort/cleanup and missing events do not establish normal closure. Thread id is never PID. Stream errors are null/unobserved; no consuming stream error listeners are added.
- D1 original child spawn has reserve1/early same-handle registration, exact actual PID and three real stdio events, natural exit0/no signal, individual known PID ESRCH distinct from whole NodePG absence. Exact own child `ps -p PID -o ppid=,pgid=` role1 uses original spawn with its own early handle, stdio ignore/PIPE/PIPE, input/output≤1024 bytes,1s timeout. Actual exit/close, two readable EOF/close and known PID ESRCH are independent. No wide PID/env/argv scans or raw ps output. PPID must equal actual stock-fork PID and PG must equal registered NodePG. Probe forced/unknown/EPERM holds. No fake PID/birth/privateproof/handle/event or IPC clone.
- Owner source client order is parent checkpoint/close, child open→normal writes/checkpoint strict000→original finally close→READY, original owner natural exit/EOF-FD/PIDabsent, normal record3 acquire and parent resume. Logical DB is reused sequentially; no simultaneous parent+owner clients assumed.
- Source input closed0/consume/ACK assertions and unused lease D1 do not prove original read/parser/pin native closure. Helpers do not read private WeakMaps or transform proof/results. App fake outcomes are contract evidence only.

## Finite resources and physical audit

Root192MiB; DB app32 for app, native32 for native or D1, inactive family DB0; opaque8/audit8, logical3 and maximum4/sum80MiB. Original8MiB/cache16MiB/TMP8MiB/records8MiB/entries8192. Private dirs700/regular600/no link or special-file exceptions. Source declaration links never enter private root. Pure DB/original bytes0. Each family tool outerPython1/innerPython1/NodeCLI1/stockfork1; native business Worker2 cumulative/sim1; D1 business owner1 plus separate metadataCLI1. No network/browser/realDrive/audio/download.

Body430 + shared closure50 = outer480; guard200ms; NodePG first finite TERM10/KILL10, inner-owner grace20 before PythonPG stop, pipe tail shares remaining50. Actual leader exit, PG absent/alive/unproven, EOF, FD close, force and sticky fault are separate. Resource fault once observed can never pass. TMP listed-entry ENOENT tolerance only under registered actual alive owner/root+tmp700 fixed identity; inner128 + outer128 <=256 (no phase resets), final all-owner PG absent+2EOF-FD requires quiescent strict walk. Cache/DB/object/native/records/root/tmp anchor disappearance remains held.

Each public helper/config stays at its public path and is read-only at runtime; copied private material bytes=0. Explicit preflight generated material bytes=0. No compiled-control material is generated by launcher. Native configLoader avoids config compilation output; setup transforms are confined to normal bounded cache16MiB with cacheFs=false. Public config 389687B is below its newly adopted1MiB readonly limit and is **not** charged as a private256KiB material copy. All actual cache/FS reachability remains unverified and root guard rejects off-mode/oversized private artifacts. Raw Node output ≤2MiB bounded in-memory only, outer safe control ≤32KiB; records each≤8KiB except safe summary bounded by outer control schema. Native/Reporter/fork ledgers retain same inode/dev/UID/nlink1/mode600 and fsync. No raw errors/SQL/message/stack/domain IDs/proofs/body/credentials are saved or printed.

Only all required pass+formal skip identity+afterAll assertions+original native/fork physical receipts+Node0/no force/whole selfPG absence+2EOF-FD+source recheck+strict both WAL/journal **absent** permits wx opaque then wx audit copies, each8MiB/10s/64KiB/fsync/full hash. Read-only immutable/query_only/FK/integrity/exact counts then original audit connection.close; final strict guard follows. Busy/unknown/error/nonzero/force holds with no copy/audit/retry. Native family audits have no proof-producing SQL.

| Audit field | app | native | native-d1 |
| --- | --- | --- | --- |
| account / workspace | 1 / 0 | 1 / 0 | 1 / 0 |
| notes/originals/slots | 7 | 2 | 2 |
| jobs (seed + machine) | 14 | 4 | 4 |
| machine succeeded/failed/cancelled | 2 / 4 / 1 | 2 / 0 / 0 | 0 / 2 / 0 |
| note revisions | 11 (7baseline+2adopt+2undo) | 4 | 2 |
| machine live/memory, active pins | 0 | 0 | 0 |
| LLM/previews/quota/dispatch | 0 | 0 | 0 |

Counts derive from current exact f.seed/request/complete/undo and D1 two-row recovery, not SQL expected-value copying. Normal fixture and owner strict checkpoint000 are source assertions; checkpoint/client.closed are not a replacement for physical process/sidecar closure. A direct client.close observer is not added: fixture close reaching assertions and physical NodePG/sidecar closure are explicitly separate receipts.

## Static checks and remaining gate

- Initial config type command failed TS5112 (explicit file requires --ignoreConfig); corrected invocation then reported own descriptor/rest-parameter typing errors. Those new-helper errors were corrected without casts/any/source changes. Final public `tsgo --ignoreConfig --noEmit --strict --skipLibCheck --module NodeNext --moduleResolution NodeNext --target ESNext --types node <newconfig>` exit0.
- Pinned Node24.18 `--experimental-transform-types --check <newconfig>` exit0; syntax only, imports/root creation/fixture execution0.
- Python AST+compile source string, pycache0, exit0. Full configSHA dependent matches; runner has no old-source/root/group/bootstrap literals.
- Current e25 regular1470 bytes rechecked, own HEAD unchanged/tracked diff0. No main/P5d/source mutation. Public108 package metadata is newly bound; no package writes.
- Actual framework setup/fork capture, D1 TS import, native original handle closure, DB fixture/count/audit/source lifecycle, abnormal outerstop and runtime cache filesystem behavior are all **not executed**. Root independent preflight plus one-family actual adoption is required.
- F normal IN07 Drive feature UI remains outside this backend tool scope; no full phase acceptance from these candidate bytes.

All code/source/helper/report reads and writers stop at final notification; no retained runtime was started. All previous private success/failed/tool/validation roots remain permanently nonoperative.
