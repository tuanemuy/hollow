# Normal fixture runtime closure step35

## Scope and result

Root-authorized PUBLIC static read of one exact entities@8.0.0 generated ESM file. C1 SOURCE/branch/Git/dependencies and all old generated/private roots remained frozen and untouched. No Node/codecheck, import/evaluation, default helper, DB, native addon, browser, network, build or runtime operation was performed.

The 65536B per-file limit was checked from lstat before opening the body; actual13401B passed. O_NOFOLLOW original FD read all bytes, stable fstat/lstat before and after, then actual FD close. Canonical path equals the exact requested PUBLIC absolute path, regular/nonlink, self UID501/nlink1/mode0644. No target below the new edge was accessed, probed or canonicalized.

| Field | Observed value |
| --- | --- |
| Exact path | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/encode-html.js` |
| Bytes | 13401 |
| SHA-256 | `3f5dc85b3f48357d246f54e5be07d4b8d6ccb59757f917a1a063af0cea235440` |
| Canonical/nonlink/regular | true/true/true |
| UID/self | 501/true |
| Mode / nlink | 0644 / 1 |
| dev / ino | 16777233 / 103511022 |
| mtime_ns | 1779596641376268500 |
| ctime_ns | 1788623905797769500 |
| Before and after metadata equality | true |
| Full byte read / original FD closed | true / true |

Metadata tuples before and after are identical, in order dev, ino, decimal mode, UID, nlink, size, mtime_ns, ctime_ns:
`[16777233,103511022,420,501,1,13401,1779596641376268500,1788623905797769500]`.

## Direct source syntax and edges

Parent edge is borrowed from Root's fixed entities@8.0.0 dist/encode.js3272B/SHA40a788f341a5e60b3a88c24987565a05cd96fb6d5be6e81820a45c6b6deb1a63: named htmlTrie import. Parent body was not reread.

This file has exactly one formal source ESM import:
`import { parseEncodeTrie, } from "../internal/encode-shared.js";`

| Importing source | Syntax/context | Literal | Lexically derived next exact target |
| --- | --- | --- | --- |
| entities@8.0.0/dist/generated/encode-html.js | Static named import / import | ../internal/encode-shared.js | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/internal/encode-shared.js |

The next-target row is only a lexical normpath derivation from this body. Its metadata, body, existence, size, canonical target and full SHA were not observed in this round. Root must adopt that exact target before any additional read, unless the same exact hash-bound source is already available as an accepted borrowed row in the final union. No extensionless, bare alias, unknown prefix or fallback resolution was used.

The only exported binding is `htmlTrie`. Its initializer calls the imported `parseEncodeTrie` on the file's literal compact HTML entity trie string at module evaluation. This is an evaluation dependency despite the pure annotation; it cannot be dropped because the fixture uses file DB or does not intentionally request an HTML encoder. The file has no source-level require, dynamic import, reexport, bare package import, conditional optional/native require, environment read, Node builtin import, top-level await or filesystem existence probe. These are statements about this source syntax only, not about the uninspected imported implementation or all reachable evaluation.

The sourceMappingURL comment refers to encode-html.js.map; it is not a formal runtime import or a new authorized target. No map read/probe was performed. The generated-code header names a generation script; no source-script read or generation scope is inferred.

## Union and unchanged budgets

Root-borrowed union through33 is359 rows/1918922B: JS313/1402701B and JSON46/516221B. Root states step34 adds formal2 rows/8012B. This round adds the exact one JS row13401B if not already present; cross-report deduplication has not been independently recomputed here.

Simple non-deduplicated arithmetic through35 is362 rows/1940335B, 156817B below2097152. This arithmetic is not a new approved complete union or an authorization to execute that union. The existing runtime JS256/JSON24 budgets are already exceeded by Root's through33 rows; this round does not amend those caps. Whole-body2MiB and material256KiB also remain unchanged. No material-union or normal/native closure claim follows from this per-source read.

Only this PUBLIC source row is fixed in step35. The exact encode-shared edge remains uninspected here; optional peer/runtime/native paths elsewhere remain governed by previous fixed reports and Root decisions. No package absence, native-closure completeness, codec compatibility, original module cache/exports identity, actual native load or normal UI fixture success is claimed.

## Next finite scope proposal and STOP

If not already covered by an accepted exact hash-bound prior row, next proposal is the single explicit JS target `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/internal/encode-shared.js`, static read only, <=65536B before body, canonical regular/nonlink/self UID/nlink1/mode0644 with stable full SHA and actual FD close. No permission to read that target is exercised here.

ALL PUBLIC/static readers and this report writer STOP after report fixation. C1 freeze is not released. SOURCE/helper/main/private/Git/runtime/default/build/probe/native/DB operations remain0.
