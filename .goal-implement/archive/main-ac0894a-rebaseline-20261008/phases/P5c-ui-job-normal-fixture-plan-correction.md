# 通常 DB / import fixture：候補前の限定補正

判定：元plan13198B/a52d6c91の同一operation方針を維持し、独立review17745B/e23b116eの指摘を採用する。新3helper候補へ進む前に、PUBLIC runtime依存の有限読取と同期preload/原closure scopeをRootが別採用する必要がある。今回は新文書のみ作成、helper/製品/SOURCE変更・default/preflight/CLI/import/build/native/DB/Worker/rootprobe/createは0。

## 原serviceとDBの順序

新一operation：排他新SOURCE327→元browse4 asyncbuild→元service実閉鎖→同owned新outputsで通常fixture→元work停止→正常DB閉鎖→outer physical closure→strict/copy/readonlyaudit→operation seal。旧完成671ce834 SOURCE/output/manifestは永久NONOP、copy/import/reopen0。

serviceの原child.stderrはinherit/NULL。stderr EOF/FDcloseを要求・補完しない。browse4 Promise正常完了、追加buildwork0、同actual child.stdin.endを元this/args/returnで一回、actualexit0/close・stdout end/close・allocated stdin finish/close、最後に元esbuild.stopの順序へ訂正する。stop戻値は子終了証拠ではない。原stdin.end1のpostbuild制御はdefault stop同timingの主張ではなく採用済み順序。service.stderrNULL、outer Node.stderr実EOF-FDを別欄に保つ。

DBは元createLibsqlClient(file URLのみ、authToken/encryptionKeyなし)が元serializeLocalClientを返す→元applyPragmas→元getDatabase→正式drizzle migratorで同SOURCEのjournal44/45files/履歴+statement878→元createHollowContainer→通常usecases。migrate.nodeトップレベルやclient生成前のmigration実行をしない。transaction/closeの架空追加修正をしない。

## 認証と状態数

原optional経路に固定：signUp(container,input,undefined,undefined)→memory-only mailer1回から正式verification token取得→verifyEmail(container,token,元browserToken,undefined)→元発行sessionでsignOut→signIn(container,input,undefined)。AuthenticationRequest/context/browser actorを合成せず、invitationなし、personal scopeのみ、workspace/member0。元hash/verifyはBoundedAuthenticationPasswordHasher + NodePasswordHasher、crypto randomBytes/scrypt/timingSafeEqual。JS Worker/OS child/addon追加0、libuv/native thread数はNULL。signinと正常import停止後、元passwordHasher.stopを必ずawaitする。不存在のstorage.stop/不要なAuthenticationExecution instanceを足さない。

正常期待の根拠はimmutable79 signUp / verifyEmail / signIn / session：account1 verified、verification1 consumedAtあり（削除0）、signUp mail throttle1、signin throttle0（正常delete）、最終session1（verify発行→signOut削除→signin発行）、authBrowsers/actor/context関連0、mailer send1。tokens/password/email/ID/URL本文はmemory内のみ。初回3usecase正常入力なので失敗throttle行追加0。最後のsession削除を勝手に追加しない。browser/current-document認証成功とは扱わない。

元upload2のacceptUploadは各collectEvents ImportQueued1、relayは起動しないのでoutbox ImportQueued2 pending/未配送。元runnerが元queued jobを直接claimする正常経路を使い、イベントrelay delivery証拠へ格上げしない。import-upload2 + conversion-job2の元withObjectOwnerがbeginWrite→正常finally endWriteへ進む。endWriteはDELETEでなくactive=false UPDATEなのでobjectWrites4/inactive4/active0。upload putとjob readが各元registerKeyを通るためobjectWriteKeys4、objectDeletes0（原本2は維持）。これらはSOURCE-derived期待、未知DBからexpectedを作らない。

元2入力はASCII1024/UI1.txt/UI2.txt、useAi=false/reference=false。notes2、originals2 ready/text/complete、conversionJobs2 succeeded、batches/reservations/bundles各2、sealed2、referenceSettings2 disabled、heads2/revisions4/browse current2を維持。references acquired0/LLMquota-admission-dispatch0/Drive-machine0。account/session正規tokenで通常requireAccount→personal scopeを使う。normal logger portはsafe finitecounter/discardへ配線しrawprovider/error.messageを出力しないが、元error/result/Promise分類は変更しない。

## Worker観測：stock優先、NULLを残す

元Worker constructor/imported binding/URL/args/options/execArgv/resourceLimits/workerData/transferListを変更しない。元stock diagnostics publicationのoriginal Worker handleをafterstartで受け取る方式を優先する。publicationはpermission-before-spawnでも副作用防止でもない。元shared withParserAdmissionのactive2/wait8を新limiterへ置換せず、同canonical source moduleを維持する。未知handle/上限超過はheldへ、人工イベント/brand/privatehandle/constructorcast0。

per-instance terminateを置換しない。新async wrapper/Promiseを作らず、元terminatePromiseを透明に取得できないためterminateReceipt=NULL/unobservedを明記する。parser actualexit0又は1・両reader end+closeは原handle由来として別記し、exit1だけで正常terminate成立へ昇格しない。元parserのreturned正常resolve/assertはapplication結果、独立physicalclosureと別。projection actualexit0/result resolveとstdout/stderr end+closeも別条件。stream errorは原公的errorMonitorが適用できる場合だけ観測、そうでなければNULL。元stderr consumer/error意味を消費しない。

callgraph期待はdetect2/empty projection2/extract2/body projection2、Worker8/live保守8。native8数とartifact roleは元normalports/controlled loadとの別束縛が必要で、stock publicationの公開payloadに無いfilenameをprivate getterから取得しない。直接役割束縛が不足する場合は役割NULLと原source期待を区別する。2 job overlapは元call/resultと当該runningの直接観測だけ、terminal2やactive admission2からglobalExecuting≤2を推定しない。自然overlap欠測時はdelay/retry/barrierによる作成0。

## 同期hook非継承への exact preload 案

新3helperのmjsをpreloadとentryに共用する案。future exactCLIは固定Node24.15 + `--experimental-transform-types --import fileURL(新p5c-ui-job-normal-fixture.mjs) 新p5c-ui-job-normal-fixture.mjs`。fileはRoot採用済み新PUBLIC helper唯一pathから新operation内materialへwx600生成し、そのexactbytes/SHA/canonical/modeをspawn前に固定する。同helperを異なるURLで二重loadしない。今は未作成のためSHAを先取りしない。候補manifest gateとして提出する。

preload static importはNode builtinsだけ。同期registerHooksを先に完了し、その後main branchがdynamic original fixture/build importsを行う。`isMainThread`で分岐し、mainのみouter-owned正常flowを一回開始、Worker branchは同期hookと有限policyの登録だけを行い、esbuild/DB/mailer/fixture/repeatbuildを一切実行しない。preloadとentryは同canonical module cacheにより一回。worker原optionsにexecArgv指定はなく親CLIの--importを継承するため、元Worker URL/optionsを変えず同exactpreloadを再登録する。main内registerHooksだけの非継承問題と区別する。async module.register/loaderthread/tsx service0。

policyは別class：ownSOURCE327（Gitblob/hash/mode600/UID/NOFOLLOW）、同operation新output4（実build後のexacthash/相互binding/mode600）、固定PUBLIC runtime dependency集合（元mode/canonical/正式exports）、ownmaterial helper（exactbytes/hash）。root全read許可/一律PUBLIC扱いにしない。source extensionlessはnext-first失敗した既知relative .tsのみ、unknown/query/escape一般fallback0。compiled Worker entryは同owned parserWorker.mjs又は新noteProjection.mjsのみ。新output4 metadataをbuild/service閉鎖後に同operationのwx600 data-only manifestへ保存し、Worker preloadはそのexactmetadataを確認する。秘密/原handle/proofをJSON化しない。

stock Node diagnostics APIの具体publication payload / main-observer registration時点、preloadのmain/Worker branch、元Worker execArgv継承とmodule-cache同一性は候補static reviewの起動gate。future helper/type/syntax0でruntime importやWorker bootstrap成功を補完しない。新CLI/preload scopeはRoot明示採用後のみ実装する。

## runtime依存：未読取targetの追加scope案

既build708/14,014,031Bはesbuild閉包であり、normal fixtureのruntime閉包とは別。css-tree/@libsql/client/libsqlをexternalにしたbuild成功からruntime解決を補完しない。

今回PUBLIC既aliasのreadlink2だけを直接確認。target本文/stat/metadataは未読取。以下はlink textからのlexical canonical候補であり、target regular/UID/nlink/canonical一致の実証ではない。

| 原alias | readlink由来のtarget候補 | 次に採用を求めるexact entry / 上限 |
| --- | --- | --- |
| packages/core/node_modules/css-tree | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree | 同target/package.json / 32768B |
| packages/core/node_modules/@libsql/client | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client | 同target/package.json / 32768B |

link textは順に `../../../node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree`、`../../../../node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client`。未採用regular targetへmetadata取得/read/hash0。次の有限scopeは上記package.json2をNOFOLLOW/stable/UID/canonical確認してexportsを読むこと、および元@libsql/client node/import chainが明示するlibsql aliasへのreadlink1。候補aliasは `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/libsql`、今は未操作/targetUNKNOWN。その結果に基づく唯一libsql package.json（32768B）とexports-derived exactJS pathsを追加提案する。推測libsql targetを一般探索で補わない。

各正式exports→relative imports由来JSの次読取案は一file65536B/既知32fileまで/全2MiB以内、選別集合はpackage metadata読取後に先固定してRootへ返す。今回この全JS scopeは未採用、実読取0。未知storewalk/glob/別binary0。唯一native addonは既静的7837712B/3fd9… rowを借用するだけで、現在metadata/ABI/loadを主張しない。metadata/fullSHA再確認を必要とする場合はexact addon1へのRoot別採用を求める。

runtime aliasは新SOURCEの原bare解決と、新noteProjection.mjs所在からcss-treeへの原解決を成立させる最小exactaliasのみ。libsqlが原client package内の正式依存で解決するならroot libsql aliasは不要。NODE_PATH/任意prefix/独自mainFields/unknowninput許可0。extra alias/依存bytesはbuild708から別集計し、候補で原source/runtime classに束縛する。

## 上限と候補順序

一operation root192、source32/output16/TMP8/cache16/DB app32+opaque8+audit8 max4sum80/originals8/log2/material256KiB/records8KiB/entries8192、buildservice1/businessOSchild0/businessWorker8 live8、work240+sharedtail30=outer270/guard200msを維持する案。rawNodePIPE/元clientAPI4096/batch4096/UoW512/migration878/poll60/sweep65/heartbeat8は異なる単位。publicpacked/dependencyはreadonly、runtime複製/material/frame/recordの累積computed bytesはhelper候補で提示し、cap内を未実装時に先取りしない。

正常runner.stop→元hasher.stop→全original Worker settled/actual stream終了→objectWrites active0等通常UoW/FK-integrity→ONE strictTRUNCATE000→原finally client.close/client.closedの順。normalclient.closedとnative FD物理閉鎖NULLを区別。outer Node0/allknownPGabsent/実2PIPE EOF-FD/force0→strict sidecar0→bounded wxopaque/audit readonlyquery-only/FK-integrity/exactcounts/actualauditclose→outer finalstrictが全部必要。checkpoint/afterAll/readable closeを互いの代用にしない。unknown/non0/force/guardfaultはsticky held、後続copy/audit0、retry/cleanup0。

次はRootが上記2package metadata＋libsql aliasの有限読取とexactpreload/stockobserver/原service閉鎖scopeを採用→exports-derived追加JS集合/aliasを固定→新3helper候補作成→独立source/tool static review。新SOURCE/BUILD memoryliteral/default/ONE actualの採用はその後。main79/S5/P5d/product/ports/DDL変更0、IN07DriveUI/allfeature未完を維持する。

この補正文書以外のwriterは0。通常plan旧hash/D1固定candidate8748は編集0。D1 reviewer用の既知inverse suffixは新 `p5c-s5-native-d1-stage2-67a198c4` →旧exact `p5c-s5-d1-9d230b41` 各1、旧private path操作なし。全旧generated SOURCE/build/output/TMP/actual rootsは永久NONOP。本文固定・全文hash後、ALLreader/writerSTOP。
