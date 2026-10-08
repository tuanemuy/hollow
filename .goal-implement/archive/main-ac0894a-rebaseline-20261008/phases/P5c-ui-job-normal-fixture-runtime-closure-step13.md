# P5c normal fixture runtime closure step13

Status: PUBLIC static ws relative-JS closure only; optional-package/runtime/native closure remains incomplete. Runtime/import/default/build/native/DB/browser/network/env-or-flag mutation/rootprobe/sourcecreate = 0. C0 SOURCE/helpers remain NOOPS. All old generated SOURCE/build/results/TMP/private roots remain permanent NOOPS. No fixture helpers are created and no success/proof/absence is inferred.

## Accepted anchor and exact scope

Root accepted step12 `.goal-implement/phases/P5c-ui-job-normal-fixture-runtime-closure-step12.md`, 8776B / SHA256 `2ccf707f952439391bd2787db9bfcde787cece69b6737a56a410453d44a740eb`; its eight ws lib files total 113130B. This binding is borrowed without rereading the report or those eight files.

Only five approved JS bodies in `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/` were read: validation.js, buffer-util.js, limiter.js, constants.js, event-target.js. Each cap65536B; aggregate cap327680B. Actual unique aggregate15817B. No additional target was statted/read/hashed/canonicalized/probed. No directory walk/glob/native search was used.

## Fullstable bindings

All five: device16777233, UID501, nlink1, regular/nonlink, canonical equals the exact approved absolute path, actual mode0644. Initial lstat, initial fstat after O_NOFOLLOW open, final fstat after full read, and postclose lstat are identical across dev/ino/mode/UID/nlink/size/mtimeNs/ctimeNs. All source FDs actually closed.

| File | Bytes | SHA256 | Inode | mtimeNs | ctimeNs |
|---|---:|---|---:|---:|---:|
| validation.js | 3903 | 41ce8e83d0d434132e1704895fedb91f6703a701b42d91c80954ab29b2845593 | 103430667 | 1779002297595081339 | 1788622717111618882 |
| buffer-util.js | 3056 | 8b0a45739132f82e25ea13163780abf547ccfe989267f3eb7abb475beec92da3 | 103430617 | 1779002297593947629 | 1788622717109395821 |
| limiter.js | 1034 | e0469d4b83f6ba764b15f80e1766b75c136fbff68f048f4c050f0b1c7f065f69 | 103430638 | 1779002297594449070 | 1788622717110287729 |
| constants.js | 503 | 391e823142b8b370e55a2fd32b022deaf03b8415c56000009674ebc86a0b4f86 | 103430622 | 1779202363617163188 | 1788622717109639735 |
| event-target.js | 7321 | c45d3c6e12d170c860c0c3f1a050aa0f864d9806632b609a1e607d675aba128c | 103430628 | 1779002297594165288 | 1788622717109934732 |

## Formal edges and evaluation branches

| Source | Formal edge | Timing / condition |
|---|---|---|
| validation.js:3 | require('buffer'), destructures isUtf8 | Unconditional module evaluation; Node builtin lookup, not an optional package |
| validation.js:5 | require('./constants') | Unconditional; bound above, no new target |
| validation.js:144 | require('utf-8-validate') | Conditional module evaluation: isUtf8 falsy AND process.env.WS_NO_UTF_8_VALIDATE falsy |
| buffer-util.js:3 | require('./constants') | Unconditional; bound above, no new target |
| buffer-util.js:117 | require('bufferutil') | Conditional module evaluation: process.env.WS_NO_BUFFER_UTIL falsy |
| event-target.js:3 | require('./constants') | Unconditional; bound above, no new target |
| limiter.js / constants.js | No require/import edge | Symbols, class definitions and fixed Buffer/array metadata only |

No additional static import/export-from or dynamic require is present in these five. All literal ws-relative JS edges from step11/12/13 now refer to the fourteen examined ws JS bodies (wrapper plus thirteen lib files). This closes the observed relative-JS set; it does not authenticate optional bare-package targets or claim a complete runtime closure.

### validation.js:138–152

The source contains a builtin `isUtf8` binding and a truthiness test. If truthy, it replaces isValidUTF8 with a function that uses the JS validator for buffers shorter than24 and builtin isUtf8 otherwise. This branch bypasses the utf-8-validate require regardless of WS_NO_UTF_8_VALIDATE. If builtin isUtf8 is falsy, the else-if checks `!process.env.WS_NO_UTF_8_VALIDATE`; only then does the try perform require('utf-8-validate'), before replacing isValidUTF8 with a length<32 JS / otherwise optional implementation function. If the require throws, the original catch silently keeps the JS validator.

This static read proves the source's builtin-member use and branch order. It does not observe the pinned Node24.15 actual builtin member/value or original runtime env. No Node import/probe or builtin implementation/doc body was read. The optional native/package branch therefore stays conditional/unobserved rather than declared absent. Package resolution or native initialization may occur at require time before any UTF8 function call.

### buffer-util.js:115–131

The top-level condition is `!process.env.WS_NO_BUFFER_UTIL`. When satisfied, require('bufferutil') occurs immediately in module evaluation. A successful require replaces mask/unmask with wrappers: mask length<48 and unmask buffer.length<32 use JS, longer inputs invoke the loaded optional implementation. These input thresholds affect later calls only; they do not avoid the earlier require/native initialization. Any require error is caught by the original code and leaves the original JS functions installed.

For both env gates, any nonempty string is truthy (including '0') and bypasses the optional require; unset/empty is falsy and permits its branch, subject also to builtin isUtf8 for validation. No actual env value was read and no flags/env are changed or adopted here. An original catch is not evidence that an optional package is absent or that a denied native initialization attempt is harmless under the tool's held policy.

### Other module-eval behavior

constants.js:4 inspects `typeof Blob`, conditionally adds the 'blob' binary type and exports hasBlob; line11 creates Buffer.alloc(0). This inspects a global but does not open a file/socket or instantiate a Blob. limiter.js defines two Symbols and the queue class; no Limiter instance is constructed at its own module evaluation. event-target.js defines event classes, prototype property descriptors and the EventTarget mixin; listener callbacks, access to error.message, and this.on/once calls occur only when those methods/callbacks run. No event/proof/native brand is fabricated by this analysis.

## Existence probes and remaining targets

These five bodies have no direct fs import or explicit existsSync/accessSync/statSync/lstatSync probe, no .node filename or process.dlopen call. Bare optional require can invoke original resolution and initialization transitively, including implementation-specific probes; those internals are unread and unobserved. Optional packages cannot be treated as absent. A file-backed DB fixture or absence of WebSocket network use does not prevent unconditional/conditional import-time evaluation of these sources.

Exactly two new unresolved bare specifiers are source-derived: `bufferutil` and `utf-8-validate`. Their installed aliases, package.json, exports/main, JS entry, native loader and binary are NOT determined by the five bodies. No exact target path is guessed; no optional peer/store/ancestor walk or metadata access occurred. Previous ws peer declarations alone do not supply installed canonical targets. Further readonly investigation would require Root to adopt exact known public alias/packageJSON bindings first, then each formal exports/main edge before reading it. Native .node read/import/ABI/init permission remains zero unless separately authorized; resolution investigation itself would not grant initialization.

A separate potential future policy choice is to adopt fixed `WS_NO_BUFFER_UTIL` and `WS_NO_UTF_8_VALIDATE` truthy values before first import, using the library's existing optional-disable gates. That would be an explicit env/behavior contract change and requires Root adoption; this report does not implement it, choose values for runtime, simulate missing modules, replace exports, or widen a native allowlist. Node builtin isUtf8 branch verification would also require separately authorized official-source or actual public-probe scope. No optional absent/native neverloaded assertion follows from either proposed path.

## Budgets and stop

Current five verified JS:15817B <=327680B, all individually<=65536B. Step12 eight113130B + step13 five15817B = thirteen lib files128947B; accepted wrapper554B adds up to fourteen ws JS129501B. Counts cover these exact observed files only. Prior global closure69 candidate JS versus JS32 cap remains a separate unresolved wider-budget condition; no revised global count/material allocation or whole<=2MiB closure is certified. New optional specifiers are unresolved, not verified JS/native files. Runtime/resource lifecycle/normal UI/nativeproof remain unaccepted.

Only this new PUBLIC report is written with wx600/O_EXCL/O_NOFOLLOW, fsync, actual output FD close and stable full postread SHA. All readers/writers/runtime STOP after fixation. C0/C1, source/helper/Manager/main/S5/P5d remain untouched. No further target read starts without Root delegation.
