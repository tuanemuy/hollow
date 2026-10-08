# 通常fixture 公開runtime closure step6

Status: 採用16 JS＋JSON4＋Hrana alias1の正式edge固定 / 全runtime closure未確定 / helper作成・actual0。

基点PUBLIC step5報告 `phases/P5c-ui-job-normal-fixture-runtime-closure-step5.md` 15755 B / SHA256 `42545a94b4ccacc004153637a935e618b4c78e6293710c5e94b11712cd2af411` をO_NOFOLLOW全文と前後same inode/size/mtimeで直接照合。そこnext table以外のtargets本文/metadataは読まない。C0 SOURCE/P5d/S5 helpers、全旧private/generated SOURCE/build/results/TMP/cacheは非操作のまま。

## 直接読取とcap補正

初巡は16 JSの全文まで進み、CSS data/patch.jsonのmetadataで46707 Bを観測した。個別採用32768 Bを超えたため本文前で停止し、残package JSON3とalias1もその時点では未読。regular0644/selfUID/nlink1/canonical一致であり、source誤りやnative原因と断定していない。Rootへ通知し、**このexact patch.jsonだけ65536 B**への補正を正式採用された。その他のJSON32768 Bを拡げず、unique上限は16×65536＋3×32768＋65536＝1212416 Bへ訂正。

完了巡は20 files/unique116750 B（JS16=65905 B、JSON4=50845 B）。canonical exact lexical path、regular/selfUID501/nlink1、全実mode0644、個別cap以内、O_NOFOLLOW全文・前後lstat/fstat dev/ino/mode/UID/nlink/size/mtime/ctime同値。modeは実観測で、一律0644の追加guardではない。

初巡本文を保守16×65536＝1048576 Bで計数、完了巡116750 B＋step5公開報告二読31510 Bを含むround本文上限1196836 B＜2MiB。初巡の読取を0扱いにしない。alias readlink71 Bは別計数。nativeaddon/未知targetへのmetadata/body/import/eval0。

| Exact direct public file | Bytes | Actual mode | SHA256 |
| --- | ---: | --- | --- |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/lib/syntax/scope/default.js` | 2360 | 0644 | `96dc78a97b49b02a9c4e768ad658b04cde0ccca92d46ec5a016d2b94b8df3aa7` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/lib/syntax/function/expression.js` | 156 | 0644 | `e1c4196e41ccc87ca37d658dcc04eb0c393bd6722ae4edc264d8e5cda6f2ef22` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/lib/syntax/function/var.js` | 1135 | 0644 | `e56be12d3341d1d4538119c0963fcb7d6dfb1692f63133983800d09026c0f48b` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/ws/client.js` | 13336 | 0644 | `e303e1449464828d376fd0adc49a279e6023f2d6ee43023ae3f25693d34df826` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/errors.js` | 2877 | 0644 | `f89144e7d248ca9f1609bdb468d2736118441ab997d6d54ffa0048bd820bbeca` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/http/client.js` | 4315 | 0644 | `87ca35c92f571d9987e94a2022e3c48a3fb3119bf03da1e4684ad3322e88857c` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/client.js` | 487 | 0644 | `8f73fb7b5fb4e7875643b578cb2ecf0ddc2bf69f5325d7b5bcca1d0cf236f61e` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/batch.js` | 10056 | 0644 | `7c6b7b3fd948bfe43f013eeb003b84301dc67e78617c9847d93d8c24f3739360` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/libsql_url.js` | 3020 | 0644 | `19c21c257fb98035fe26dee28b6159347b1fd91c340ecb21931e886b45b6b8bf` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/sql.js` | 1333 | 0644 | `04f907763d0599d0212381e01a105277faee4362b6b91232f380b661bb0acda6` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/stmt.js` | 2333 | 0644 | `077b7ba4c3db8553360f1097797a473ec8867907ecc83e70695be07ac9bf283c` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/stream.js` | 2328 | 0644 | `97434495fe853b5556538d7daea72f87d08414aa596b8389050ce25eefcc57ee` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/http/stream.js` | 13799 | 0644 | `39c51566b469656a5fc1ed34714efce6fe42ba2513fb6b25230a6c11f7dd1ff2` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/ws/stream.js` | 7254 | 0644 | `1d574dd3b7ae7543aea72d881dc48a6984b9945b98807ec9258d809ce0bda1f2` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/detect-libc@2.0.2/node_modules/detect-libc/lib/process.js` | 399 | 0644 | `9207c543613d6f14a4d65ccd8420c66521fd3fa35a69095695e151350c7490be` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/detect-libc@2.0.2/node_modules/detect-libc/lib/filesystem.js` | 717 | 0644 | `5d99d01ed4cdb368ef42ae8d0f0a3e63b246719d662d1e6c2b3fd8761b8be9a0` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/data/patch.json` | 46707 | 0644 | `4b54d2f1543107553977ea47ce61b7e0eb20c6bea17934de1a17165bc5bdd85f` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/package.json` | 2548 | 0644 | `58f8e94a461a5e461e0cb2bb2be681cbd89b9181989fd26fceb858e67711469a` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/mdn-data@2.27.1/node_modules/mdn-data/package.json` | 763 | 0644 | `4454243524dd13a032e0c70554ef1c51a92033559647edd8d12e6f0c0b992df3` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/js-base64@3.7.8/node_modules/js-base64/package.json` | 827 | 0644 | `f19e81376787c8b53f1fe46f8563b13917805a0b92c91daeeb87f0f5d89d30b5` |

## 今回の正式edge・CJS branch

CSS scope/default.js:1–14とfunction/var.js:1は既tokenizer/index.jsへのstatic import。function/expression.jsに新literal module辺なし。patch.jsonはJSON.parseによりdata object（atrules/properties/types）を確認しただけで、module importやJS評価を行っていない。CSS node49は全て未読として保留。

Hrana11 JSのstatic importを直接分類した。client.js/errors.jsは追加import無し。ws/client、http/stream等はencoding/protobuf/JSON/result/queue/cursorへさらに依存する。今回読んだclient/errors/sql/stmt/stream/batch等へのround内辺は去重し、未読relative18 JSを下表へ出す。WebSocket/HTTP関連のclass・関数bodyを読み、constructor/socket/fetchを呼んでいない。file DBの計画を理由にstatic import辺を省略しない。

detect-libcのexact process.js/filesystem.jsは採用CJS .js候補として実file/hashを確認した。require('./process')の本番Node resolverがこのfileへ実到達したという証明ではなく、未知extensionless/JSON/native fallback探索は0。

process.js:6のisLinuxはprocess.platform==='linux'。getReport:12–14はisLinux && process.reportの時だけgetReportを呼び、それ以外は{}。filesystem.js:6のbuiltin fs、readFileSync/readFile wrapperはexport関数であり、module本文にOS read実行はない。先のdetect-libc family/version関数のisLinux条件と合せ、Darwinなら条件内部のfilesystem/report/exec枝を呼ばないSOURCE上の分岐を示せるが、実platform/本番call graph/ABIの新観測ではない。/usr/bin/lddやreportを読み出していない。shell/exec/execSync実行0。

先に読んだNeon load(dirname)→path.join(dirname,'index.node')→existsSync→require(m)の動的native branchは今回未実行。dirname/caller・native exact target・ABI/load成功は未確定。新nativeaddon body/metadata/dlopen/unknown platform探索0を維持する。

## package JSONから選択した正式entry

source-map-js1.2.1はexports無し、main='./source-map.js'。CSSからの正式specifierはsource-map-js/lib/source-map-generator.jsという**subpath**であるためmain全体へ寄り道せず、actual aliasのpackage root＋当該subpathだけを次候補にする。package files[]にlib/があることはtargetの存在/hash/実resolve成功の証拠ではない。

mdn-data2.27.1はexports無し、main='index.js'。CSSのcreateRequireはmdn-data/css/at-rules.json・properties.json・syntaxes.jsonの3 literal subpathsで、root main/API/l10nをclosureへ追加しない。JSON実容量/内容/hashは未読。package filesのglobを実探索/読み許可へしない。

js-base643.7.8はexports['.'].import.default='./base64.mjs'、require.default='./base64.js'。現在CORE/HranaのESM importに対してbase64.mjsを正式次候補へ選ぶ。types/main/module一般fallback又はCJS branchまで勝手に読むことはしない。

## Hrana sibling alias1

exact alias `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/isomorphic-ws` をlstat symlink/selfUID501、前後dev/ino/mode/UID/size/mtime/ctime一致でreadlink。実mode0755、link value `../../../@libsql+isomorphic-ws@0.1.5/node_modules/@libsql/isomorphic-ws`、71 B≤4096。字句targetは `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+isomorphic-ws@0.1.5/node_modules/@libsql/isomorphic-ws`。targetのrealpath/lstat/package/body未読であり、versionはdependency rangeからの推定でなく実link字句由来。次はこのrootのpackage.json一つだけを採用依頼する。

## 次exact JS20候補（全てUNREAD）

個別65536 B、canonical/regular/selfUID/nlink1/actualmode/fullstableで次Root採用後だけ読む。Hrana18はrelative static import由来、source-map/js-base64各1は上記正式subpath/exports選択由来。

| Exact next path | Formal source origin |
| --- | --- |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/encoding/index.js` | Hrana ws/client.js:2, http/stream.js:2 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/id_alloc.js` | Hrana ws/client.js:4, http/stream.js:3 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/result.js` | Hrana ws/client.js:5, batch.js:2, stream.js:3, http/stream.js:6 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/util.js` | Hrana ws/client.js:7, batch.js:4, http/stream.js:9 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/ws/json_encode.js` | Hrana ws/client.js:9 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_encode.js` | Hrana ws/client.js:10 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/ws/json_decode.js` | Hrana ws/client.js:11 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_decode.js` | Hrana ws/client.js:12 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/value.js` | Hrana stmt.js:2 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/describe.js` | Hrana stream.js:2 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/queue.js` | Hrana http/stream.js:4, ws/stream.js:2 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/queue_microtask.js` | Hrana http/stream.js:5 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/http/cursor.js` | Hrana http/stream.js:10 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/http/json_encode.js` | Hrana http/stream.js:11, http/stream.js:13 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/http/protobuf_encode.js` | Hrana http/stream.js:12, http/stream.js:14 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/http/json_decode.js` | Hrana http/stream.js:15 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/http/protobuf_decode.js` | Hrana http/stream.js:16 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/ws/cursor.js` | Hrana ws/stream.js:4 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-generator.js` | CSS generator/sourceMap.js literal subpath＋今回source-map-js package exports無し |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/js-base64@3.7.8/node_modules/js-base64/base64.mjs` | CORE util.js/ESM import、js-base64 exports['.'].import.default |

次package JSON1：`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+isomorphic-ws@0.1.5/node_modules/@libsql/isomorphic-ws/package.json`。個別32768 B、target本文/metadata未読。Hrana index.jsの@libsql/isomorphic-ws importと今回actual aliasだけをoriginとする。次JS20×65536＋JSON1×32768＝**1343488 B**、round本文2MiB以内の提案。CSS node49はここに混ぜない。

## 別round：MDN exact JSON3候補（全てUNREAD）

`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/mdn-data@2.27.1/node_modules/mdn-data/css/at-rules.json`

`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/mdn-data@2.27.1/node_modules/mdn-data/css/properties.json`

`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/mdn-data@2.27.1/node_modules/mdn-data/css/syntaxes.json`

正式originは先のCSS data.js:5–7のcreateRequire literal、今回actual aliasとexports無しpackage JSON。新metadata/bytes/body0。初期提案は各524288 B、合算1572864 B/round2MiB。これはRootへの有限読取cap案であり、実sizeが収まると先取りしていない。cap超過なら本文前に停止・exact必要性通知し、今回patch補正をMDNへ一般化しない。JS20のroundと合算すると2MiBを超えるため一roundに混ぜない。

## 未確定・停止

wholeJS32旧cap超過は維持。今回増えた正式relative18/entries2とCSS node49保留等を含む全closureのdistinct count/totalbytes/whole2MiB成立は未確定。全graph去重のため未知本文/walk/歴史一括scanをしていない。fixture helper3の作成、通常import jobs/DB/nativeWorker/proof/closure、IN-07/通常UI featureの完了は0。

runtime/default/Nodeimport/eval/test/build/DB/child/nativeaddon/load/ABI/WebSocket/HTTP/DNS/browser/network/rootprobe/create0。C0/P5d/S5/main/source/helper/Manager編集読取0、旧生成/private/root/cache/results/stat-read-hash-copy-import-reopen-cleanup0。spec/spec-implement0、追加subagent0。

書込はこの新step6一pathだけwx0600、regular/selfUID/nlink1/fsync/実FDclose/same-inode全文SHAを固定する。全scope読取終了、固定後ALL read/writer/runtime STOP。次targetを自動読取しない。

固定日時: 2026-10-06T11:40:45.240980+00:00
