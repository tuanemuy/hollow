# 通常 DB / import job fixture 計画の独立レビュー

判定：**候補作成前の限定補正が必要**。13198B の提案をそのまま3 helper候補の実装契約にするには、実行時依存・Workerロード制御・閉鎖欄・認証状態の束縛が不足している。製品の決定的欠陥を示す判定ではない。旧UI Node-6の原因はUNKNOWN。正常build、PUBLIC Git読取、既miniの結果から通常DB/job/同時性/Native proof/UI成功を補完していない。

## 固定資料と読取範囲

| PUBLIC資料 | bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-ui-job-normal-fixture-plan.md | 13198 | a52d6c91a9150d7d74ca98640f20d5f2a10a8bed8cb1a6fe685a1c0bc32e515a |
| helpers/p5c-ui-job-libsql-build.py | 26497 | 088b558ff2b4f0bf611b4b649561ebb28f8b766cff7638c8fbe49b30974d00e6 |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 10061 | 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac |
| helpers/p5c-ui-job-libsql-build-manifest.json | 117169 | 4ad86e83ac189da016ba255f901aeb55ed05a0078c2d49a8b3ffe77f4e7a3927 |

上記はcanonical/regular/self UID/mode600/nlink1/NOFOLLOW open、lstat・fstat・読取後fstat・path再照合、全文hashで確認した。packedのimmutable candidateは79ef126edd5d3440cde20dbe8fd372e7235010c5、selected327は1,920,009B、sourceManifestは4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206。PUBLIC dependency708は14,014,031B、packageAlias10、linkTargets7である。packed内の旧生成SOURCE/BUILD literalは不活性な記録として扱い、対象pathへ一切アクセスしていない。327全検証や未知entry不存在を主張していない。

Rootが追加採用したimmutable79の既manifest-listed 12 blobだけを原Git cat-file --batchで照合した。working HEAD・working source・生成SOURCE・B・DB・key・proof・logsは読んでいない。既pinned Gitを使う第一読取9 blob/57,143B（128KiB上限）、第二読取3 blob/9,339B（64KiB上限）、合計66,482B。各既Gitblob・長さ・全文SHA・memory Gitblobを照合した。双方actualexit0、既ownPG absent、stdout/stderr actualEOF、stdin/stdout/stderr actualFDclose、force0、rawstderr discard0で終了した。このPUBLIC読取processの閉鎖はfixture/native閉鎖の証拠ではない。

| immutable79のpath | bytes | Gitblob | SHA256 |
| --- | ---: | --- | --- |
| packages/core/package.json | 1443 | cbf0c16a8f28f36ecf6a006866d10a68e0759919 | 50bb9d03bf2b3d243f161bea69efa55eaf716df6d935e875c5c46d9d481f6bf9 |
| packages/core/src/adapters/node/passwordHasher.ts | 1175 | 95d50f9a5ce1c7dc7da213b0f7c86575d5d32083 | 2ac5f172350ac46aeb7cfadcbb326082bf672a47932c5981cde4a382a2252158 |
| packages/core/src/application/di/serverHollow.ts | 1605 | b0ee178f51d3f95688bde1be9cae354d71d5a303 | f22807b3d988dd46d7d1b992786a9eec5d99a24853be08baa4a34998abd8765a |
| packages/core/src/application/account/signUp.ts | 5918 | 7aa127c8fdeffda89425d7c0ae0363a12afbaee3 | 7cf5d97b2fad68b56b1f2fcd77c3e8e055b812a7e7252c8afa1f5e2a2d40c7d5 |
| packages/core/src/application/account/verifyEmail.ts | 2313 | 522bb0e14c320a0f66380cbf53c8fe2725d50654 | eddb2866f0b50a3fd3766e6432e50b08cf94a2ecd5366dccdbac081d00a3c44e |
| packages/core/src/application/account/signIn.ts | 3862 | fc148a0b62bc7019af35d29fe1156023858e19d6 | 91a0363a4d78d067f3714613931b8306d074aaf2f5c36f2ee751ea9e5918a3a9 |
| packages/core/src/adapters/node/import/documentExtractor.ts | 10244 | cda8c5a4e63f3e9e2966a2d7e8b87e4cd37fb17a | 2a3ca8d16a9e67ea9c3f262712c93b8fdc0544638d51ee26043a25155767053f |
| packages/core/src/adapters/node/import/parserWorker.mjs | 26374 | e660075d47d6275caadc5fa179b847f1747e6379 | 911632fb456c27d5c0ef77cd1ea3eb3b5cb8bfa6be034e291ad7e3944f725bf2 |
| packages/core/src/adapters/node/browse/isolatedProjection.ts | 4209 | f8197016414d5c03ac1e23f4c4640f2cebe55f9e | 45ab05b2e24bd1c1d1f60fee03eb6e804ae032f892eddfdf7390d0a13f70e832 |
| packages/core/src/adapters/node/authenticationExecution.ts | 2490 | 1083676897b67cd79b3e43d763d74fc69b9c0737 | ebd82b2a80232bb30f8697b30a83e9347673559691d8ea1eb895f72597f77473 |
| packages/core/src/application/account/session.ts | 2714 | 7687e4d15cdc84c83b2f60ad69933eef8721795f | da6abc18ed13ba468aa617735c99d554377dc83ad41cac34affcc34f5a3b3118 |
| packages/core/src/application/account/context.ts | 4135 | f736dbe816ffaac1a04569adc51c2521699e7186 | b3c957cbd478d2d6b64e5442449dc683174aeadd42b1ac4d3811ca7fd4c2ede4 |

## 1. build708は通常fixtureの実行時閉包ではない

現driverは@libsql/client/libsql/css-treeをexternalにして四entryをbuildする。packed dependency rowsにcss-treeは無く、linkTargets7にもcss-tree/@libsql/clientの通常fixture用aliasは無い。build成功はこれらexternalの原runtime importを実行しないため、実行時解決の証拠にならない。PUBLIC esbuild閉包708を通常fixture閉包へ流用して「足りる」と判定できない。

noteProjection.mjsのexternal css-tree、通常SOURCEのhtml sanitizer/DB wiring、元@libsql/clientのnode/import→local driver→libsql→native addonは、原import由来のexact pathと正式package exportsから別途閉包を固定する必要がある。新target本文・metadataは今回未読取。既計画に記載された@libsql/darwin-arm64@0.5.29/index.nodeの7837712B/3fd9e58190311b5ee027c3e5452a6a410b31a5d610fd55853d797bb3c9f5db0c/755は借用静的rowであり、今回の現在metadata・ABI・load成功の証拠ではない。

Rootへ返す最小追加読取scopeは、正式source importに対応するPUBLIC alias packages/core/node_modules/{css-tree,@libsql/client}のpackage.json、そこからexportsとrelative importで選別した既知JS files、およびlibsqlの正式package.json→既知JS→exact addon metadata/fullSHAである。canonical targetと個別上限はRoot採用前に列挙する。未知pnpm store walk・glob・別addon read/import/dlopenを行わない。

候補に必要なruntime aliasは、SOURCEからcss-tree/@libsql/clientへ原bare resolutionが到達するもの、および新compiled noteProjection.mjsの所在からcss-treeへ到達するもの。元package依存のlibsqlが自身の正式node_modulesで解決する場合はroot libsql aliasを追加しない。物理exact alias又は採用済みexact parent→正式exportの有限mapを固定し、任意prefix、NODE_PATH、一般fallbackで補わない。新outputのimport集合は同operationの新actual build後にbounded hashとともに固定し、旧outputを読まず、未生成outputの具体import結果を先取りしない。

## 2. package exportsと元Worker URLは整合するが、hook継承は別問題

core package exportsは./package.json→./package.jsonと./*→./src/*.tsを明示する。documentExtractorの原URLはimport.meta.resolve(@repo/core/package.json)を基点にsrc/adapters/node/import/parserWorker.mjsを指す。このexports欠落やURL誤りは確認されなかった。新SOURCEのown core packageと@repo/core aliasをexactに束縛すれば原式を維持できる。projectionは原workerPath string、parserは原URL objectなので、両形式を型と元argsのまま扱い、source Worker pathの任意置換をしない。

両constructorはexecArgvを指定しない。Node24.15公式契約ではWorkerは原parentのexecArgvを既定継承するが、main module内で登録した同期registerHooks自体は既定でWorkerへ継承されない。--import/--requireでpreloadされた登録fileの継承とは区別される。また同moduleのstatic importはhook登録前に評価され得るため、登録後のfixture importは順序を固定する必要がある。[Node24.15 module](https://nodejs.org/download/release/v24.15.0/docs/api/module.html)、[Node24.15 worker_threads](https://nodejs.org/download/release/v24.15.0/docs/api/worker_threads.html)。

必要補正は、原Worker options/URL/execArgvを変更せず、採用する同期preloadのexact file/hash/contextとmain/Worker分岐を先に固定すること、又は原stock Worker解決だけで成立する依存閉包と必要ambient policyの範囲を明確にすること。前者には新CLI --import/preload contractのRoot採用が必要である。同3helperのmjsをpreloadとentryで共用する場合、Workerでfixture本体を二重実行しない条件も静的に示す。async module.registerの専用loader thread、新sourceworker URL、新exports、tsx childは許可しない。

現build-driverのPUBLIC JS load集合は通常SOURCEの.tsを実行する許可でもない。manifest-listed新SOURCE327と同operationの新output4を、固定PUBLIC dependency rowsとは別のfile classとしてexactに登録する。source hash/Gitblob/type/mode600/UID/NOFOLLOW、output hash/type/mode600/相互bindingを維持し、PUBLIC dependencyの元mode/canonicalを保持する。root全体のread許可やunknown entry不存在へ一般化しない。

## 3. 認証は追加JS Workerを作らない。stopと状態数を具体化する

NodePasswordHasherはnode:cryptoのrandomBytes/scrypt/timingSafeEqualを使い、scryptのN32768/r8/p1/key64/maxmem64MiBを原APIで実行する。BoundedAuthenticationPasswordHasherはrunning SetのPromise上限2とstopのallSettled管理であり、Worker/OS child/第三者addon/artifactを作らない。NodeAuthenticationExecutionもPromise/AbortControllerの上限4/deadline10s管理で、Workerを作らない。従って認証由来の追加JS Worker2をWorker8へ足す必要はない。scrypt内部のnative/libuv thread数やnative memory peakをJS Worker数から補完しない。原crypto/entropy APIを採用scopeとして明示し、偽hasher/決め打ちhashは使わない。

通常fixtureはsignup hashとsignin verifyの完了後、元BoundedAuthenticationPasswordHasher.stopをawaitして認証workをdrainする。runner.stopだけで認証work停止を主張しない。不要なNodeAuthenticationExecution instanceや存在しないstorage.stopは追加しない。

signUpは未verified accountと元verification row/browser tokenを作り、mailer portを呼ぶ。verifyEmailはaccount verifiedとverification consumedAtを保存し、元browser tokenが一致する通常経路では原sessionを発行する。signOutは原session token hashを削除し、signInは元password verifyとissueSessionを使う。verificationを消したと期待したり、session/actorをDBへ直接挿入したりしない。

AuthenticationRequestを渡さない原optional経路と、contextを渡すauthBrowsers/captureAuthentication/transitionSession/advance経路は状態数が異なる。候補前にどちらを行うか固定する。前者ならverify session→signOut→signIn後のsession1、consumed verification1は当該正常経路から支持されるが、browser/current-document認証の証拠にはならない。後者をUI相当とするなら原request/context/browser状態とcleanup/countsも必要で、未検証のbrowser actorを合成しない。

signup/verify/signin throttle、AuthenticationRequest関連rows、outbox、workspace/member、CoordinatedObjectStorage ownershipの最終exact countsは現planで未固定である。workspaceとupload actor/contextを用意する正式usecase/UoW/repository経路も候補で列挙する。元repositoryのknown sourceからexpectedを先deriveし、実行後のSQL値を期待値にしない。正常session cleanupとmailerのmemory-only回数・token受渡しは有限bool/countだけで報告し、token/DTO/ID/SQL body/valuesを公開しない。

## 4. Worker8と観測方法の残契約

parserとprojectionは同relative documentExtractorのwithParserAdmissionを参照する。shared canonical module/cache identityが成立する場合のactive2/wait8と、stdio未閉鎖を含むnative handle live数は別である。原admissionの意味・release時点を変えず、globalExecuting≤2やnative全閉鎖を作らない。detect2/empty projection2/extract2/body projection2の期待8は、accept/seal/processJob/commitNoteの正常callgraph・2つの非AI ASCII inputから候補で再束縛する。未実行のsearch/publicQuery artifactを実行済みと数えない。自然overlapは直接観測できた範囲だけ採用する。

計画のconstruct wrapper案は元handle/args/newTargetを委譲しても、置換したconstructorそのもののidentityは原stock identityと異なる。sourceのimported Worker bindingへどう到達するか、module exports/cacheを変えないか、原Promiseとunhandled境界を保持できるかがまだ具体化されていない。新permission wrapperが必要ならそのexact役割をRootへ先提示する。stock diagnostics observerを選ぶ場合、publicationはafterstartであり副作用前permissionではないことを明記し、原source admissionを工具の新limiterで置換しない。

per-instance terminateを置換したり、元Promiseを別async Promiseへ包んだりして観測を作らない。元terminatePromiseを透明に取得できない場合はNULL/unobservedを保持し、actualexitと両stream end+closeを独立receiptにする。projectionのexit resolveは両pipe closeの証拠ではない。errorMonitor/observerの公開契約と未取得NULLを固定し、人工emit/finish代用/private handles/nativebrandは使わない。この方法を候補で決めるまで『terminate Promise identity保持』という文だけを完了証拠にしない。

## 5. 閉鎖と有限予算の必要修正

plan順序3の元service stderr EOF/FDclose要求は現在の原serviceと一致しない。元child.stderrはinheritでNULLである。正式追加契約を、原async build4完了・追加work0→同actual child.stdin.endを原this/args/戻値で一回→child actualexit/close＋stdout end/close＋allocated stdin finish/close→原esbuild.stop、と明記する。child.stderr=NULL/inheritedを保持し、outer Node stderr EOF/FDcloseと分ける。stop戻値だけではchild閉鎖にならず、timeout/unknown/forceはheld。これは採用されたpost-build制御であり、元default stopと同一timingとは主張しない。

正式migrationをclient生成より前に実行する読み方にならないよう、createLibsqlClient→serializeLocalClient→getDatabase等の元構築→元migrator→container/account/usecaseと実argsを固定する。migration journal44/source45/878 statement slots、client method4096、batch items4096、UoW512、poll60/sweep65/heartbeat8は観測単位が異なる。native内部SQL数をAPI counterから推定しない。counterは原this/args/result/error/Promiseを透明に委譲し、async wrapperによる別Promise化や追加catchによるunknown正常化をしない。

同operationの新SOURCE/output/DBをfixtureが使うことは正常familyの必要scopeであるが、fixed PUBLIC依存と同列のread許可ではない。source32/output16/TMP8/log2/material256KiB/root192、DB app/opaque/auditとoriginal/cache/recordsの区分、entries8192、business Worker8/live8・child0、build service1、work240/sharedtail30は維持する。packed複製、control、source/output/release metadata、records8KiBの累積は候補でcomputed bytesを提示する。現時点では新3helperのframe/material/record worst boundは存在せず、上限内実証を先取りしない。

runner/hasher/storageの原settled所有handle→checkpoint→client.close→outer originalNodeexit/PGabsent/2PIPE EOF+FDclose→sidecar不在→copyauditの各条件を分ける。client.closedはlogical stateであり、native FD物理閉鎖ではない。PRAGMA TRUNCATE一回/strict resultと全owner終端はsidecar不在gateの代替ではない。元provider commit/rollback/close契約に対する先のsource-only照合から、架空の追加transaction.close修正やleak原因を本案へ足さない。

## 候補へ進むための最小返却scope

1. authorがservice stderr欄・migration順序・認証モード/原hasher stop・未固定counts・Worker観測方式をPUBLIC計画で補正する。製品/source/helperはまだ変更しない。
2. Rootがcss-tree/@libsql/client/libsqlの正式exports由来JS閉包・exact alias・唯一native binaryの有限PUBLIC static readを別採用する。既708から一般native/JS/package許可を広げない。
3. 同期preloadを採る場合は原Worker execArgv/constructor/URLを変えないexact CLI/file/context契約を先採用する。そうでなければstock resolutionとpolicyの観測限界を明記する。
4. その後に新3helper候補のsource/dependency/output/native各schema、strict parser、original lifecycle receipts、同operation path集合、actual前expected counts、frame/material容量を固定して独立レビューする。fresh literalの採用、default preflight、SOURCE作成/build/DB/native/fixtureのONE実行は別scopeである。

このレビューはflow全体のPASS、DB実数、Worker actual counts/closure、libSQL ABI、nativeproof、通常UI/P5d/S5全完成を示さない。今回のstatic sourceから旧Node-6/既journalheldの実原因は決定していない。

## 固定・停止

新review一file以外はwriter0。PUBLIC計画/helper/packedは変更0。fixture sourcecreate/rootprobe/default/Node import/build/DB/nativeAddon/Worker/browser/network/新actual0。immutable Gitの採用済み12 blob読取を超えるtarget探索0。旧671を含む生成SOURCE/BUILD/TMP、全old success/failure/held DB/key/proof/result/objects/cache/logsはstat/read/hash/copy/import/reopen/replay/cleanup0。このreviewのwx600・fsync・実FDclose・same-inode postread/hash固定後、ALLreader/writer/runtime STOP。
