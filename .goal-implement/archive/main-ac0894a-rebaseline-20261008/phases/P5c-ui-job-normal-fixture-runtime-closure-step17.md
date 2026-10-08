# Normal fixture runtime closure step17

Status: one PUBLIC native binary static fullread plus one explicitly adopted pinned Node finite process probe. No business/source/helper imports, native load, DB, Worker, browser/network, fixture/root creation or product/helper/env/global mutation occurred. C0/C1/main/S5/P5d and all old generated/source/build/private roots remain NOOPS. Binary identity and Node metadata do not prove ABI compatibility, native initialization, DB closure, proof/ACK or UI acceptance.

## Borrowed formal route

Accepted step16:6733B / SHA256 `74333ece0405fb7c19a9229e54e96463607927baca55c1bf2ec216cdac1c3658`. Its native package.json761B / SHA256 `6e7a953e9b488c562ec816c4fcbd998d39a6a88d1241d00f0ec26982415e9a51` binds name@libsql/darwin-arm64/version0.5.29/main index.node/files[index.node]/exports absent/type absent/osdarwin/cpuarm64/neon.abi null. It and the original libsql parent/index/ordinary route source bindings are borrowed, not reopened. No alternate package/binary or platform is searched.

## Direct static binary observation

Exact path:
`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+darwin-arm64@0.5.29/node_modules/@libsql/darwin-arm64/index.node`

| Field | Actual |
|---|---|
| Bytes / adopted cap | 7837712 / 8388608 |
| Full SHA256 | 3fd9e58190311b5ee027c3e5452a6a410b31a5d610fd55853d797bb3c9f5db0c |
| Type / canonical | regular nonlink / exact approved absolute path |
| Actual mode / UID / nlink | 0755 / 501 / 1 |
| Device / inode | 16777233 / 103373681 |
| mtimeNs / ctimeNs | 1779412890374351257 / 1788622537607022137 |
| Fullstable | initial lstat, open initial fstat, final fstat after full body, postclose lstat dev/ino/mode/UID/nlink/size/mtimeNs/ctimeNs identical |
| Read FD | O_NOFOLLOW, full hash in65536B chunks, actual close |
| Header layout | thin Mach-O64 little endian |
| Header CPU/subtype | ARM64 / ARM64_ALL |
| Header filetype | dylib |
| Declared command area | positive count, header32+declared command bytes within full file |

Only the32-byte header was structurally decoded. Full hashing necessarily reads all file bytes, including load-command bytes; no load commands, linked-library names, exports/symbols, ABI/interface, arbitrary strings, code/disassembly or native behavior were decoded. The static script's combined output label loadCommandsReadOrDecoded=false refers to no separate command decoding; it must NOT be read as a claim that full binary hashing skipped those bytes. No otool/lipo/subprocess/native export inspection or second binary was used.

This is fresh fullstable PUBLIC-binary evidence and supplies the complete current hash, rather than merely borrowing the old truncated3fd9 row. A matching historical prefix does not establish any old runtime/root operation or native success. Original native initialization count remains0.

## Pinned Node metadata gate before the sole probe

Exact canonical path:
`/nix/store/4366l8b6kz1f2sxq6243rfs53grc73zz-nodejs-slim-24.15.0/bin/node`

The adopted regular/nonlink/mode0555/UID0/nlink2/64896912B/canonical expectations all matched before launch, and full metadata tuple was unchanged after probe. Device16777231/inode23076897/mtimeNs1000000000/ctimeNs1779563789721926342. Node executable body was not read or hashed in this step; its metadata is separate from the native binary full-body hash.

Exactly one original Node process was launched with literal argv `-e` followed by:

```js
process.stdout.write(JSON.stringify({execPath:process.execPath,node:process.versions.node,platform:process.platform,arch:process.arch,modules:process.versions.modules,napi:process.versions.napi}))
```

Child environment is the explicit minimal map with only PATH set to the pinned executable directory and WS_NO_BUFFER_UTIL='1'/WS_NO_UTF_8_VALIDATE='1'. LIBSQL_JS_DEV is omitted; no parent environment inheritance, global/package/product env mutation or env-value dump occurs. This tests no business import. Child process.env was not added to the permitted six-key JSON; omission is the explicit launch-map condition, not an extra observed JSON field. Future business fixture still requires its own before-import undefined gate.

The JSON exact keys/types are checked; modules/napi are bounded numeric strings. JSON output167B <=1024. stderr raw bytes discarded0; no stderr body/message/stack is saved or output. Literal probe includes no module import/require, addon/Worker/database/socket/browser/default/preflight/helper loading.

| Field | Actual |
|---|---|
| process.execPath | /nix/store/4366l8b6kz1f2sxq6243rfs53grc73zz-nodejs-slim-24.15.0/bin/node |
| process.versions.node | 24.15.0 |
| process.platform / process.arch | darwin / arm64 |
| process.versions.modules / process.versions.napi | 137 / 10 |
| Original exit | 0 |
| Known birth PG matches original process | true |
| Same known PG absence | actual ESRCH after exit |
| stdout/stderr PIPE EOF | true / true |
| stdout/stderr actual FD close | true / true |
| Force TERM/KILL | false / false |
| Adopted deadline / measured elapsed | 10s / 49ms |
| Probe count | 1 |

Known PID/PG is retained only inside the bounded observer and is not emitted. No unknown PID/group scan or signal occurred. Popen starts a new session, known birth PG was directly compared, selector drain observes each original PIPE EOF and closes that actual FD, original leader exit and known PG absence are separate checks. The bounded script reserves finite TERM/KILL observation within10s for a failing probe; those branches were not entered. Probe normal classification applies only to this literal metadata child, not to the future service/business family. There are no inferred native or Worker lifecycle receipts.

## Candidate binding proposal, not load authorization

Candidate data can now bind the single ordinary original libsql load route to:

- accepted libsql/index.js11757/SHA cc6f0fb815d302185ba69d4f749b423dfe304add1c58d6ff687842f8c1e39152 and package.json2614/SHA2c5b92e04a5c0f41139bfd678e67fc1569d7ba5fd9d35ac285901d122fa3522f;
- accepted exact libsql sibling @libsql/darwin-arm64 alias string, its bound package.json761/SHA6e7a953e9b488c562ec816c4fcbd998d39a6a88d1241d00f0ec26982415e9a51 and formal main index.node;
- the exact current native file7837712B/SHA3fd9e58190311b5ee027c3e5452a6a410b31a5d610fd55853d797bb3c9f5db0c/mode0755/UID501/nlink1/headerARM64;
- pinned Node canonical path and before-import actual version24.15.0/platformdarwin/archarm64/modules137/napi10;
- future fixture Node/Worker-only WS flags1 and LIBSQL_JS_DEV unset/undefined-before-import ordinary route, preserving stock module/constructor/exports/cache/this/args/result/Promise identities.

Required original-parent/context authentication and native API/resource admission are not implemented or exercised. The single binary can be a proposed allowlist identity only after independent candidate review and separate Root load scope. Direct unknown .node/dlopen, unrelated family, unsupported Worker context, alternate platform/dev-loader paths and identity drift stay denied. No shim/nativebrand/export replacement is introduced.

Header CPU, package declared target and actual Node architecture agree as finite architecture observations. Node modules137/napi10 plus package neon.abi null do not demonstrate which native ABI/interface this file uses or whether it is compatible. No export/symbol decode or real load occurred. ABI compatibility remains UNKNOWN. A later genuine original load might establish that particular initialization, but would still not prove original client/transaction/database close, native owners, Worker terminationPromise/endclose, outer PG/EOF-FD/control, proof/ACK/copy audit or normal UI behavior.

## Counts and stop

Regular JS/JSON set remains222/1210651B:204JS739022B +18JSON471629B. Native static set adds exactly1 binary7837712B in its prospective separate8MiB bucket; it does not consume a JS/JSON record or replace material accounting. Runtime native load/DB/businessWorker count=0. Node metadata probe1/exit0/knownPGabsent/2PIPEEOF+actualFDclose/noforce is an independent observed tool child only. Material256KiB final helper union, future own SOURCE/outputs/runtime resolver union and real native/normal-family closure remain unaccepted.

Only this new report is written wx0600/O_EXCL/O_NOFOLLOW/fsync, actual output FDclose and stable postread fullSHA. No helper/source/product/Manager changes, private/root operations, followup read/probe/load or retry occurs. All readers/writers/runtime STOP after fixation.
