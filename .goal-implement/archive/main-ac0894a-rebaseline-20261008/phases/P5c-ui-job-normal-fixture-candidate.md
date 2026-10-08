# 通常DB/job fixture候補: runtime closure追加採用待ち

固定日時: 2026-10-06T13:09:48.960055+00:00

通常factoryのruntime importsに固定PUBLIC集合外の5packageを確認したため、契約どおり新3helpers作成前に停止する。現在は実装可能な完全候補ではない。新helpers0、SOURCE/product/helper編集0、runtime/default/preflight/import/DB/native/Worker/build/rootprobe/create0。旧生成SOURCE/build/TMP/results/全actual privateは全非操作。API・正常factory・sanitizerのfixture置換は行わない。

## 固定入力とSOURCE根拠

固定PUBLIC入力は以下のbytes/SHAをcanonical regular/selfUID/nlink1/0600/NOFOLLOW・前後fstat安定・全文hashで直接確認した。

| PUBLIC相対path | bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-ui-job-normal-fixture-plan-correction.md | 12913 | 2c42db316cb7a36af6742ca29dfeced4cdb1fb661c2f6bfaeb76815ebbb1132e |
| helpers/p5c-ui-job-libsql-build.py | 26497 | 088b558ff2b4f0bf611b4b649561ebb28f8b766cff7638c8fbe49b30974d00e6 |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 10061 | 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac |
| helpers/p5c-ui-job-libsql-build-manifest.json | 117169 | 4ad86e83ac189da016ba255f901aeb55ed05a0078c2d49a8b3ffe77f4e7a3927 |
| phases/P5c-ui-job-normal-fixture-runtime-closure-step14-plan.md | 66620 | 88e5cbcc62d30037a859e0ad7d0330a37ba6a091c2256a0c5fdbcce363a9bf07 |
| phases/P5c-ui-job-normal-fixture-runtime-closure-step15.md | 5858 | 588845619036b7c95496cc00004f2db3c94d00ae1842596d82e998237c14a1f3 |
| phases/P5c-ui-job-normal-fixture-runtime-closure-step16.md | 6733 | 74333ece0405fb7c19a9229e54e96463607927baca55c1bf2ec216cdac1c3658 |
| phases/P5c-ui-job-normal-fixture-runtime-closure-step17.md | 8540 | 0b3b88854706f817de9eaba656ef6f81a9702855311144d61e05c1d180e9f944 |

SOURCE正本はimmutable Git候補79ef126edd5d3440cde20dbe8fd372e7235010c5のmanifest327、1920009B、sourceManifestSha=4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206。1558286/26da…という旧呼称は外部file名の確定根拠ではなく、helperの読取pathへ用いない。SOURCE実体・旧payload・生成物は読まない。必要な既知manifest GitblobだけNix Git2.51.2 cat-fileで読み、各bytes/fullSHA/Gitblob一意一致を確認した。SOURCE_BODYは既EXPECTEDからACTUALへの一方向照合であり、期待を取得後に補正しない。

次の因果表の全SOURCE本文は直接固定Gitblobで確認済み。runtime bare importsは型importを除いている。

| SOURCE path | bytes | Gitblob | SHA256 | 正式runtime関係 |
| --- | ---: | --- | --- | --- |
| packages/core/src/application/di/serverHollow.ts | 1605 | b0ee178f51d3f95688bde1be9cae354d71d5a303 | f22807b3d988dd46d7d1b992786a9eec5d99a24853be08baa4a34998abd8765a | createHollowContainer→NodeHtmlSanitizer / UuidV7Generator |
| packages/core/src/application/ports/idGenerator.ts | 1307 | 9dfeab59f1687f5fc185238639ed78020ee32883 | 97d3bbaf71df0fd142c8a64d17ac687f78d57de7705eff0fa7563adc21cd9630 | uuid v7を正式import（clockはuuidをimportしない） |
| packages/core/src/adapters/node/htmlSanitizer.ts | 4595 | 74266ef478c967c75ddc80266ac5325da60b9cf3 | 6d506742469cbba5550093fbaebdf3f398e9f910038d49064d18e577e08c600d | sanitize-html / htmlDocument / htmlStructure / cssPolicy |
| packages/core/src/adapters/node/reference/htmlDocument.ts | 6975 | f78d2ebc19f1722a125b541622dc5d33781f2785 | e0711a93d27def70bedc4ef8fe38b131de9e7cf277b001e49383a00c9ab3cd5d | dom-serializer / domhandler / htmlparser2 |
| packages/core/src/adapters/node/reference/htmlStructure.ts | 3080 | e66c71c5041ede4d1d2a23c8386adb256475c49d | d4776e1e1a175c6c8917b7555c27cfe7238231384244e371be3a722cc2ba0408 | sanitize-html |
| packages/core/src/adapters/node/reference/cssPolicy.ts | 14511 | 43f46e92786e83da76e42a1d56520df6de4fd214 | b5176febde08f492d7cc280cdb5922d624cbdbf58f395bca43f914a95a9dbb79 | css-tree / domhandler |

固定build708/14014031Bとruntime222/1210651Bのexact canonical集合は重複0で、合計930/15224682B。native addon7837712Bは別class。sanitize-html、uuid、dom-serializer、domhandler、htmlparser2の5packageは両集合に登録0。metadata集合の検索結果であり、package不在・正常runtime失敗の実測ではない。normal serverHollow factoryをimportする時点で上記正式importが到達するため、TEXT parserの動的Office/media枝を避けるだけでは閉包しない。

## 必要な追加有限読取scope

まず次のPUBLIC正式alias5のreadlinkだけ、各4096B・前後lstat同一・未知targetへfollow/read0を提案する。対象本文/package.json/metadata読取はこの採用に含めない。

| exact alias |
| --- |
| /Users/hikaru/github.com/tuanemuy/hollow/packages/core/node_modules/sanitize-html |
| /Users/hikaru/github.com/tuanemuy/hollow/packages/core/node_modules/uuid |
| /Users/hikaru/github.com/tuanemuy/hollow/packages/core/node_modules/dom-serializer |
| /Users/hikaru/github.com/tuanemuy/hollow/packages/core/node_modules/domhandler |
| /Users/hikaru/github.com/tuanemuy/hollow/packages/core/node_modules/htmlparser2 |

canonicaltarget確定後、正式package.json各32KiBの別採用を求め、exports/mainに由来するexactJSだけを次scopeへ提案する。未知walk/glob/推測fallback/未採用target metadata/native読取0。SOURCE327は追加不要、既bare importsを一般許可するresolverにはしない。CSS/runtime既222閉包と新5package閉包を合算してclassunion・必要aliases・source imports・Worker preload membershipを確定するまでhelpers生成に進まない。正式packageentryが既capを超える場合は本文前に停止し通知する。

## 維持する候補実装契約

許可されている出力はp5c-ui-job-normal-fixture.py/.mjs/.jsonの新3pathだけ。旧helper bytesは変更しない。新memory-only SOURCE=/Users/hikaru/github.com/tuanemuy/hollow-ui-job-source-79ef126e-normal-20261006-4a86f710、ROOT=/Users/hikaru/.local/share/hollow-validation/goal-implement-ui-job-normal-20261006-4a86f710、派生-toolTMPは存在確認も作成も未実施。

同一future operation内で新SOURCE→original esbuild browse4→原service actualclosed→同freshoutputs4→通常認証/2uploads/通常importRunner→元runner/hasher/Worker stop→checkpoint/clientclose→Node-PG/2EOF-FD/finalstrict/sidecars→wxopaque/readonlyaudit→sealとする。旧成功buildの再読/copy/import/reuse0。service.stderr=NULL、原stdin.end1・実exitclose/stdoutEOF/allocatedstdinclose後originalstopを保持。通常認証・mail/browser/session/API値を偽造せず、optional requestなしの正規pathを用いる。

採用SOURCE-derived期待はaccounts1verified/verification1consumed/session1/signupThrottle1/signinThrottle0/authBrowsers0/WS0/mail1、UI1/UI2.txt各1024ASCII/useAi=false/reference=false、2notes/originals ready TEXT complete/2sealed batches-reservations-bundles/settings2disabled/heads2 revisionNo2/revisions4/browse2/jobs2succeeded/originalobjects2bytes2048/outboxImportQueued2pending、deletion/LLM/Drive/Machine0/objectWrites4inactive-active0/key4。これらは今の実測結果ではない。worker8=detect2+emptyproj2+extract2+bodyproj2、source admission2/wait8とglobalExecutingは別で、globalExecuting≤2を主張しない。

main/Worker共通MJSはsync registerHooks/native transformのsamecanonical --import preloadを用い、Worker branchにfixture/database/serviceを実行させない。正式 stock diagnostic afterstartの同handle観測を用い、元Worker args/constructor/execArgv/resultPromiseを変更しない。per-handle terminate置換/新Promise0、terminateReceipt=NULL、IPCやnativeproofを偽造しない。sole native admissionは元libsql/index.js普通分岐→bare@libsql/darwin-arm64/main index.node・親mainだけ、直接/Worker/未知addon拒否。WS_NO_BUFFER_UTIL=1/WS_NO_UTF_8_VALIDATE=1、LIBSQL_JS_DEV omitted/first-import前undefinedとNode24.15/Darwinarm64/modules137/napi10を副作用前gateへ。ABI互換は未実測。

root192MiB/source32/output16/DBapp32+opaque8+audit8(max4 sum80)/original8/cache16TMP8/records8KiB/raw2MiB/material256KiB/entry8192、build60/fixture120(stop30内)/copyaudit60/work240+tail30outer270/200ms/TERM10KILL10PIPE10を維持。UoW512/client4096/batch4096/poll60/sweep65/heartbeat8はcandidate source由来上限の閉包・最終material256KiB実計測がまだ未完であり、成立を先取りしない。必要超過はRootへexactdelta通知する。

## 完成状況とSTOP

直接確認: SOURCE327中の必要認証/upload/TEXT parser/factory/serializer/sanitizer正式APIと上記bare imports、固定PUBLIC入力metadata/hash/class集合。借用: 既service/build/native addon metadataと採用closure reports。未実施: 新helpers構文/typecheck、helper全inverse/最終material値、完全runtimeclosure、全actual認証/job/native/終了/audit/UI。通常userfeature/IN07DriveUI完了へ昇格しない。

本報告のみ新規wx0600で作成。新3helpers未作成、製品/既SOURCE/helpers/Manager文書は不変更。報告固定後、全SOURCE/helper/報告のreader/writerを停止する。追加alias読取採用後に候補実装を再開する。
