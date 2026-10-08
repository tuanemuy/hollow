# P5c normal fixture runtime closure step12

Status: PUBLIC static partial closure only. Runtime/import/native/DB/browser/network/rootprobe/sourcecreate/helper execution = 0. C0 SOURCE and helpers unchanged; all old generated/source/build/results/TMP/private roots remain permanent NOOPS. This report creates no fixture permission and proves no native initialization, runtime resource closure, or product acceptance.

## Accepted anchors and scope

Step11 is borrowed without reread: `.goal-implement/phases/P5c-ui-job-normal-fixture-runtime-closure-step11.md`, 5489B, SHA256 `a25be616a5d26c9ac356aba38fc40f7e649033e3966d2d74338233d78107e043`. Its wrapper.mjs is 554B, SHA256 `fe154662301fd558f935f9c217fccbe7a7dac02ff39e648a000589403ff27c7f`, with the eight explicit ESM default imports examined here.

Step10 is borrowed without reread: `.goal-implement/phases/P5c-ui-job-normal-fixture-runtime-closure-step10.md`, 3371B, SHA256 `5b0b4f133b45b535b9042581be40c88bafdd9a4cc869af323cb772171df38ace`. Its ws package.json binding is 1753B, SHA256 `c642fa2a61006bd082f620bbaab30df014340f96c429bbe97c718df5bad3c968`; Node import export is `./wrapper.mjs`. The optional peer declarations bufferutil and utf-8-validate remain declarations only.

The exact approved directory is `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/`. Only the eight named JS bodies were read. Each cap is 65536B; unique aggregate cap is 524288B. Actual aggregate is 113130B. No target derived below was statted, canonicalized, hashed, read, imported, or probed. No directory walk/glob or package-store search occurred.

## Fullstable source bindings

For every row: regular, nonlink, canonical path equals the approved absolute path, UID501, nlink1, actual mode0644, device16777233. Before lstat, open with O_NOFOLLOW, initial fstat, final fstat after full read, and postclose lstat agree on dev/ino/mode/UID/nlink/size/mtimeNs/ctimeNs. Each source FD actually closed. A second bounded static read of the same approved eight reconfirmed all bytes/SHA values for exact require-edge extraction; unique byte accounting counts each body once.

| File | Bytes | SHA256 | Inode | mtimeNs | ctimeNs |
|---|---:|---|---:|---:|---:|
| stream.js | 4204 | a56fcb6e2b152097ee820b6f5410b1f71e59819b45d08d9f8bda588fe39070ec | 103430661 | 1779202363618767714 | 1788622717111304052 |
| extension.js | 6183 | 852564f0f6b460287043803eae732666fb5610f676874354fc89f06aa4e986ed | 103430631 | 1779002297594270159 | 1788622717110060648 |
| permessage-deflate.js | 14532 | 02c31796f0132a335d4efe7b7adcebadbb69543a1ce65ae04aaccc3530e27ab9 | 103430650 | 1779202363617960680 | 1788622717110813265 |
| receiver.js | 16460 | 7b9f6afc1fffb5c98d768d7d3d6fc1b709f28b45c6ae2682ff255075394323d9 | 103430656 | 1779002297594679811 | 1788622717111060555 |
| sender.js | 16886 | d0791d30c3defd44dcabbddb879a901c757993fea2c00a7ffea01d53b23b4b77 | 103430659 | 1779202363618611132 | 1788622717111165387 |
| subprotocol.js | 1498 | be3f6323d6f549568577dcba9004c1479d95c65a7abb0fe0c582875b9fac0b7c | 103430664 | 1779002297594987342 | 1788622717111479259 |
| websocket.js | 36724 | e2308419b4f64007a79095e4eda12ee5db6ddcea7ca89dfc301666ad686e1874 | 103430674 | 1779202363619331376 | 1788622717111896088 |
| websocket-server.js | 16643 | 88139775699dbc17474a074cc92f6682cb5968022db6ec856e6e46a5dc341c61 | 103430670 | 1779202363619168336 | 1788622717111762298 |

## Formal module edges

The following are unconditional top-level CommonJS require expressions, hence evaluation dependencies when these modules are evaluated. Static analysis does not execute them. Relative extensionless targets retain their literal spelling here; `.js` targets in the next-scope proposal use the package's observed CommonJS JS layout and require-resolution convention, without asserting actual target resolution/existence.

| Source | Existing-read relative edges (line) | Proposed unread relative edges (line) | Node builtin edges (line) |
|---|---|---|---|
| stream.js | ./websocket (4) | none | stream (5) |
| extension.js | none | ./validation (3) | none |
| permessage-deflate.js | none | ./buffer-util (5), ./limiter (6), ./constants (7) | zlib (3) |
| receiver.js | ./permessage-deflate (5) | ./constants (11), ./buffer-util (12), ./validation (13) | stream (3) |
| sender.js | ./permessage-deflate (11) | ./constants (12), ./validation (13), ./buffer-util (14) | stream (5), crypto (6), util (9) |
| subprotocol.js | none | ./validation (3) | none |
| websocket.js | ./permessage-deflate (14), ./receiver (15), ./sender (16), ./extension (33) | ./validation (17), ./constants (29), ./event-target (32), ./buffer-util (34) | events (5), https (6), http (7), net (8), tls (9), crypto (10), stream (11), url (12) |
| websocket-server.js | ./extension (10), ./permessage-deflate (11), ./subprotocol (12), ./websocket (13) | ./constants (14) | events (5), http (6), stream (7), crypto (8) |

Existing-read edges use the eight stable bindings above; no new package/binary/builtin-source body is inferred as approved. There is no additional static import/export-from or dynamic require edge in these eight bodies.

## Evaluation versus later resource operations

These eight sources contain no direct require of bufferutil or utf-8-validate, `.node` load, or explicit existsSync/accessSync/statSync/lstatSync path probe. No WS_NO_BUFFER_UTIL/WS_NO_UTF_8_VALIDATE branch appears here. This is a statement about these source bodies only. Original CommonJS resolver-internal existence checks are unobserved because no module is evaluated. It does not establish absence of probes or optional native initialization in transitive dependencies.

The unconditional `./buffer-util` and `./validation` evaluation dependencies are the relevant unread boundary for optional-peer questions; their bodies and conditional branches are UNKNOWN until separately approved. No optional-native target, metadata, package, or binary has been explored. The peer declarations alone are not a native closure.

permessage-deflate.js defines Buffer/Symbol bookkeeping at module scope; its Limiter allocation is in the class constructor, and zlib compression/decompression resources are reached in methods. sender.js defines masking bookkeeping; randomFillSync runs in frame construction rather than module evaluation. websocket.js defines client connection behavior in the constructor/initAsClient path; websocket-server.js selects/listens to a server in constructor/runtime paths. Their mere imports do not show an actual socket/server/compressor/Worker exists. No network permission is requested or broadened. Top-level builtin module loading and object allocation are not represented as resource lifetime proof.

## Next finite scope proposal, not yet authorized

Exactly five candidate bodies, each <=65536B; proposed aggregate <=327680B, same canonical/nonlink/regular/UID501/nlink1/fullstable/actualmode checks. Targets are derived solely from the literal edges above, not from unknown names or optional-peer searches:

1. `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/validation.js`
2. `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/buffer-util.js`
3. `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/limiter.js`
4. `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/constants.js`
5. `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/event-target.js`

Next bodies may identify formal additional JS edges, module-eval optional conditional native branches and explicit existence probes, but any further targets would again require Root adoption before metadata/body access. Runtime native-addon permission remains zero even if a conditional optional edge is found. No guessed fallback/NodePaths/plugin/resolver/ambient-grant change is proposed.

## Remaining bounds and stop

Current step: 8 distinct JS / 113130B <=8x65536 / 524288B. Next proposal: 5 candidates, not counted as verified files. Prior cumulative closure already had 69 candidate JS against the original JS32 bound; that unresolved wider-budget condition remains. The whole closure's <=2MiB body/material budget and completeness remain unproven; this step does not certify a global count or invent native/runtime closure. Fixture helper creation, imports, DB, build, startup and actual tests remain zero.

Only this new PUBLIC report was written (wx600, O_EXCL/O_NOFOLLOW, fsync, actual output FD close, stable postread fullSHA). All source/helper/phase readers and writers STOP after report fixation. No next-step read or C1 design work starts without Root delegation.
