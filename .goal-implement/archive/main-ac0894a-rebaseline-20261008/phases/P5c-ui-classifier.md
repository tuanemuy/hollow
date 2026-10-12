# UI-R03-EOF1 — source candidate fixed

Root採用の限定補正。public own worktree `/Users/hikaru/github.com/tuanemuy/hollow-parser-exit-c2a3d45f-20261006`、branch `goal-implement/parser-exit-c2a3d45f-20261006` にcommit `c81862bd33e693dbf1cfb53c17c5da78248d0158`（parent `7e8b80e23bac1f9a2dd8c85889fe56635979506e`）を固定。source writer停止、clean status。main製品/source/B/UI helpers変更0。新test工具3filesは未作成のまま準備停止。

`documentExtractor.ts` のclosed()をactual Worker exit＋両stdio actual end/closeへ統一した。failure/timeoutもこのgateとterminate pending解消を待ち、閉鎖前にordinary BusinessRuleError reject→admission releaseしない。success枝のEOF重複だけを削除。streamerror/late errorは既FailureCodeへ置き、独立exit/両EOF/closeとtermination settledが揃えばclosed failure reject＋release。EOF/close欠測はpending＋slot保持。成功へ補完せず追加deadline/EOF合成0。constructor failure、既negative-only localclass、30s/50MiB/sim2/wait8/Worker body/ports/generic署名不変。Node-6 abort原因は未確定。

- 修正1path：`packages/core/src/adapters/node/import/documentExtractor.ts` 10244B、Git100644/currentregular644/nonlink/nlink1/canonical/fullread stable-fstat、SHA256 `2a3ca8d16a9e67ea9c3f262712c93b8fdc0544638d51ee26043a25155767053f`。差分2追加/3削除。
- test unchanged：`packages/core/src/adapters/node/import/__tests__/documentExtractor.test.ts` 22526B、同metadata、SHA256 `51774d8b6db91cb5b5b9cfd4ebf0ba7a8ffbd7cd7210722a37e032a853283b2e`。既強化飽和＋新2casesの計3、planned realWorker16/detect3/extract13/max2不変。
- tracked1457の全public source metadata/fullhash照合。source manifest（relativepath→bytes/mode/sha256、sort_keys/separators canonical JSON）SHA256 `11527121e7654d80b5d71e25e49513dc06d931cd482790ed99811800c0c0ca4b`。outside2paths1455＋test1がparentと同値。
- 最小2置換のreverse全文bytesがparent adapterと一致。reverse manifest SHA256 `13bca79541765a30af15656b105e95901dd88098844ea87797a570089ddb6a2a`一致。
- 最終意味bytesでwholeworktree `pnpm typecheck` → `pnpm lint:fix` → `pnpm format` 全exit0。typecheck root＋4packages、lint1197files/format1197files、lint formatter1file（closed()改行）だけ、format no fixes。既346warnings/59infos、unsafe fixes0。public exact108links/既CF declaration借用のみ、新install/network/CF生成0。
- actual tests/Worker/runtime/DB/newroot probe生成0。old private/failed/reserved roots/stat/read/hash/copy/import0。helpers借用の公開read準備のみで新helper writer0。独立source再レビュー後のfinite test scope採用待ち。全source/report writer停止。

# UI-R03 parser Worker lifetime — isolated 2path candidate fixed

Root正式採用の独立confirmed R03 gapを修正した候補。Node exit-6の実原因は未確定のまま。専用public worktree `/Users/hikaru/github.com/tuanemuy/hollow-parser-exit-c2a3d45f-20261006` / branch `goal-implement/parser-exit-c2a3d45f-20261006`、基点Cc2 `c2a3d45f1097533c6344346aca303dc1d2aef368`、candidate commit **7e8b80e23bac1f9a2dd8c85889fe56635979506e**。main製品・旧成功B/build/公開UI helpers・held privateは非操作。新runtime/Worker/DB/Chrome/実UI/実test/root reservationは0。

| exact変更source | bytes / mode | full SHA-256 |
| --- | --- | --- |
| packages/core/src/adapters/node/import/documentExtractor.ts | 10278 / 100644 | 7d8e6bdbe60d6d9e5d387f20a635a4ecdf13c50b5cf87277c3583606d059fe59 |
| packages/core/src/adapters/node/import/__tests__/documentExtractor.test.ts | 22526 / 100644 | 51774d8b6db91cb5b5b9cfd4ebf0ba7a8ffbd7cd7210722a37e032a853283b2e |

candidateはexact2path commit（272insertions/37deletions）、own worktree status clean。全1457trackedの現在bytes/mode/SHA-256を相対pathでソートし、JSON separators=(',',':')のUTF-8 canonical manifest SHA **13bca79541765a30af15656b105e95901dd88098844ea87797a570089ddb6a2a**を固定した。対象外1455は基点Cc2のGit blobへ全文一致、変更2sourceはregular644/nonlink/nlink1/canonical・blob/fullSHA一致。manifestは報告のhash bindingで、新private artifactへ保存していない。

normal response/error/timeoutはprovisional outcomeとして保持する。message後は自adapter terminate要求のPromiseをconsumeし、actual Worker exitとstdout/stderrの実end/close eventが揃うまでcaller settleとadmission releaseを進めない。成功はvalid result＋自terminate Promiseのcodeとactual exit一致0/1＋late errorなし＋両stdio actual EOF/closeのみ。後続error/stdio errorはprovisional failureへ変え、最初のFailureCodeを維持する。terminate rejectは成功にせず、独立actualexit/closeが後で揃えば既IMPORT_CORRUPT等へrejectしてreleaseする。exit-before-resultもclosed後に既IMPORT_CORRUPTへrejectする。

追加cleanup deadlineは0。既timeout30秒はpending cleanupをprovisional IMPORT_TIMEOUTへ変えるだけで、exit/closeを合成しない。terminate/exit/stdioがmissingならcaller pending＋slot所有を保持し、上位の別finite ownedstopの責務へ残す。spawn後のunknown observer/setup exceptionは同file非export ParserWorkerCloseUnprovenError（既SystemError/DataIntegrityError、固定message、retryable=false）へ映射し、withParserAdmissionのnegative-only catchがslotをretainする。このclassは正常brand/nativeproof/actor認可/共有portの新型に使わない。constructor前のresource無し拒否は通常releaseできる。generic admission署名、sim2/wait8、入力50MiB、標準30秒、Worker resourceLimits/transfer、source parserWorker.mjs本体、projection本体は変更0。

testはbuiltin native.Workerをsuper(...)で実生成する薄subclass/module hookに、実message/exit/end/closeと本物terminate Promiseの返却観測だけを置いた。emit合成・fakeWorker・worker result改変・native brand・閉鎖の人工証明は0。追加2caseはnormal ASCII detect/extractが実閉鎖後だけ返ること、invalid UTF/1ms ASCII timeoutが閉鎖後だけrejectし回復すること。既12並列飽和caseは10fulfilled/2RESOURCE_LIMIT/後続reuseを維持し、11実Worker全閉鎖とactual native maximumAlive≤2を追加確認する。現timeout PDF/UTF/形式fixture等の既期待は維持し、何も実行していない。Rootが次に有限採用するなら上記3case合計の最大16parser Worker（detect3/extract13、同時≤2）が必要で、現UIのnative total8へ流用せず別scope/caps/PG・PIPE/FD/deadlineを固定する必要がある。late native error/termination rejection/exitmissingのactual発生は未検証で、型とstatic branchを成功へ補完しない。

user AGENTSの**whole worktree** requiredchecksを実施: pnpm typecheck exit0（root＋core/web/aws/pulumi全workspace）、pnpm lint:fix exit0（1197files/no fixes、既346warnings＋59infos）、pnpm format exit0（1197/no fixes）。先の2path-only補助lint/formatはwhole成功の代用にしていない。最終semantic bytesのtypecheck後wholelint/formatは追加fix0、git diff --checkもPASS。git commitは自己branchのみ、hooks/tests/autosigningを無効にしてexact2pathのみ固定した。

static toolingはRoot採用public mapの105declared dependencies＋native hoist3＝108link（自己@repo/core、AGENTS内部tracked link別）、root0700/新dependency dir0700、install/download/network/privateコピー0。公開pnpm11.1.2/tsgo/biome/tscを単発PATH＋verify_deps_before_run falsy/CLI falseで使用し、main/global設定変更0。fixed public cf-env generator9336B/24f6e754e7d159b9360ce0539d44a2a35443def2922fc5c8b439cd93ec08e006を自身worktreeと自身空publicCFtoolだけへ適用し、強いEnv986B/1803d60aa0818e5a3a7630807466ffaae8fdeb0fd85b7fa59431638fc5a479fa、children/Workers/DB/network0・FDclosedの生成PASSを確認した。旧untracked envや他agent treeを借用しない。

この候補を独立source reviewへ渡す。実native regression/normalclosure受入と新C/B/build/次UI採用は未実施・別Root採用待ち。旧9attempt/private・第七予約・S4/P5d tree非操作、helpers/browser/bundle/build実起動0、spec系/追加agent0。sourceと報告を固定後、全writer/read停止。

## PUBLIC-ONLY upload1静的絞り込み — parser admission lifetime候補

本turnは公開Cc2元repoソース＋成功B348847/source/採用済み必要build moduleと公開依存metadata/JS/API型注記のみread-only照合した。helper・製品・依存・test変更0、追加test/runtime/Node版probe/Chrome/DB/key/旧result/rawstderrのread/stat/hash0、新root予約/生成/実run0。第九を含むheld privateと第七予約は非操作。Node exit-6/faults[]/rawdiscard321Bを原因確定へ使わない。以下のstatic R03/resource lifetime候補は現在のabort原因と別件である。

## 有限normal callgraph

boot.mts:196–198の順序はsignup開始/完了→verifyEmail→signOut→signin開始/完了→currentUser確認→upload1-start。最後のstageは次の一連処理の前なので、どのsubstepに達したかは欠測のまま。

| 順 | 公開正常経路 | native/resource境界 |
| --- | --- | --- |
| 1 | hollowImports.ts:6 → beginUpload.ts:17。POST validator/error middleware → hollowContext(true) → account/scope/quota確認 → batch/reservation insert | LibsqlHollowUnitOfWorkProvider.run → Drizzle interactive transaction。file clientはserializeLocalClientで同client lifetimeを直列化 |
| 2 | boot.mts:197のUI1.txt/1024B ASCII body → importHttp.node.ts:14のPOST/origin/body/cookie境界 → acceptUpload.ts:21 | reservation awaiting→uploading UoW、withObjectOwner/CoordinatedObjectStorageのwrite-owner・key登録、FileObjectStorage.put/read |
| 3 | acceptUpload.ts:119 → detectFormat/documentExtractor.ts:202 → run/withParserAdmission → runInWorker:132 | real Worker parserWorker.mjs、Uint8Arrayコピー＋buffer transfer、heap256/young32/stack4、親stdout/stderr drain |
| 4 | parserWorker.mjs:349 classify。固定ASCIIはdecode→拡張子.txt→text、main:778→postMessage:818 | Node Buffer/TextDecoder/Worker。Office/PDF/image/audio/Markdown分岐の動的library importへ進まない |
| 5 | acceptUpload.ts:163 → empty-html IsolatedNoteProjection.project:38 → worker/node/noteProjection.ts | 別real Worker、parse5/css-tree/Intl.Segmenter、valid projection message後actual exitでsettle |
| 6 | acceptUploadのnote/original/queued-job commit → storage owner終了 → importing.wake/relay kick | 主realm libSQL。ImportRunnerはwake/2秒tickでclaimしrunImportJobへ進めるため、HTTP response/seal待ちと背景処理は並行し得る |
| 7 | processJob.ts:263→extractor.extract(text) → parserWorker:804/814のparagraphHtml → commitImportResultのsanitize/projection/UoW。bootはHTTP result→sealUploadFn→upload1-done | extract Worker→projection Worker→DB。useAi:false/importReferences:false。いずれも第九でactual到達を証明していない |

## 独立static defect候補と最小修正契約（未実装）

exact対象はpackages/core/src/adapters/node/import/documentExtractor.ts:74–110、113–182。runInWorkerの返り値はPromise<unknown>、responseのprovisional値はformatまたはExtraction、FailureCodeは既固定union。normal detect successはmessage:165→finish(null,value):153でsettled=true/clearTimeout→**void worker.terminate():157→resolve(value):159**。withParserAdmissionのfinally:106はこのPromise settleだけでwaitingをresumeまたはactiveWorkers--し、actual worker exitを待たない。

terminate():Promise<number>はinstalled worker_threads.d.ts:224でexit event時にfulfillするAPI契約。要求を発行した事実はexit evidenceではない。parserのexit listener:181はmessage成功後にはsettled guardで無視され、同様に遅いerrorも既成功を更新しない。terminate Promiseの拒否があれば現在consumeされない（今回の拒否/actualerrorは未観測）。constructor前失敗はadmission finallyで解放できるが、message後の既起動resourceには同じ扱いをしてはいけない。

従ってnormal result成立からactual exitまでadmission slotの所有が抜け、次detect/extract/projectionを起動できる静的経路がある。2-slotはoperation Promise数を数え、実生存Worker数と一致しない期間を許す。native Buffer transfer自体のuse-after-free/ABI違反や実3-worker超過、abortcauseは未証明。UI helper stop-audit.mts:317は別途actual exit=falseのWorkerを数えてnative simultaneous2を守り、:404はvalid parser success＋adapter termination＋actual exit code0/1をnormal条件にする。このhelperの厳格条件やR03/全native capsを緩和する案ではない。

対照のIsolatedNoteProjection:72はmessageをprovisional resultへ保存するだけで、:100のexit handlerがcode0/abortなし/valid resultを確認してresolveし、初めて同じadmission finallyへ戻る。worker/node/noteProjection.tsはparentPort.closeをfinallyで実行する。projectionのabortもterminate要求だけで即resolveしない。これが正常結果とactualresource終了を分ける既正規実装である。

最小source契約案はdocumentExtractor.tsのWorker state/finishだけ。result-ready/failureを保持し、listenerを先に設置してterminate要求のPromiseをconsumeし、actual exitを確認するまでcaller settleとadmission releaseを保留する。valid result＋actual owned exit（既parser adapter要求によるcode0/1）＋late errorなしだけを成功へ進める。timeout/error/invalid message/exit-before-resultは既IMPORT_TIMEOUT/RESOURCE_LIMIT/CORRUPTへfail closedし、actual closeが未証明なら成功・slot reuseへ補完しない。未終了時はownership-unprovenを有限deadline/owned stopへ伝える契約の独立採用が必要で、黙ってslotを解放しない。output型/format検証・入力50MiB・timeout30秒・同時2/waiting8は維持。公開元sourceが変わる場合は新C/B/build bindingが必要で、旧Bへのliteral差替え再runでは代替できない。

既test影響はdocumentExtractor.test.ts:424のUTF/text結果、:453のtimeout後reuse、:475の12並列=10fulfilled/2RESOURCE_LIMIT＋後続reuse。現testは出力・結果数を見ておりmessage→exit間のadmission保有やlate error/terminate Promiseを観測しない。projection.test.tsはprojectNote純関数でWorker lifetime検査ではない。次採用時の必要追加受入はreal owned Workerでmessage後exitを遅らせ、exit前にslotを渡さないこと、late error/異常exitで成功しないこと、exit後のみreuseすること、拒否/timeoutでもunhandled Promiseを残さずactual closureを得ること。現在testの変更/実行0、fakeNativeを閉鎖証明へ使う案0。

## Native候補の分類と次の必要最小観測（未採用）

主realmは@libsql/client0.18.0 → libsql0.5.29（Neon loader/currentTarget）→ @libsql/darwin-arm64 0.5.29/index.nodeというinstalled公開経路。両versionとplatform os/cpu metadataは一致し、compiled server entryは外部@libsql/clientをimportする。module metadataにNode ABI/engine判定根拠はなく、Node24.15.0 gateやpackage versionだけでbinary ABI/GC安全性をverify済へ補完しない。native binary/body/hash/実importは0。

installed @libsql/client/lib-esm/sqlite3.js:481–483には「closed DBのinTransaction読取はprocess abortし得る」というlibrary側の注記とdb.open guardがある。libsql/index.js:273はdatabaseClose後open=falseにする。serializedClientはtransaction全期間のownershipを保持しcommit/rollback/closeで解放するが、client.close自体はqueue外。server.node shutdownでclient cleanupへ進むまでがlife boundaryで、正常upload入口からclient.closeを呼ぶ静的edgeは確認できない。したがってclosed-handle invariantは候補であり、この第九abortの発生を証明しない。native Rust assertion/GC/finalizer/Node内部OOMの場所はローカルJS/metadataから確定できない。

固定text detect/extractにpdfjs-dist6.3.289→optional @napi-rs/canvas、sharp0.35.4のimage処理は非到達。両engine宣言はNode24を排除しないがnative ABI保証ではない。compiled noteProjection849919B/3ff4d3b8686d7275dc1d16ebb25772cef56d30bbedeb3a2a75e3744d8385edcfはfullhash一致、外部importはnode:worker_threads/css-tree、libSQL/canvas/sharp参照なし。Worker/ICU/V8 teardownは残るが実causeは不明。

独立Verifierによる上記static lifetime確認が先。未確定nativepairをさらに測る場合は別fresh scopeで、同exactNode/depsの実documentExtractor detect→実projection→extractをDBなしで有限観測し、libSQLは別owned childで実client/transaction/closeをDB一つのfresh root内に隔離する。各段階のstart/result/actualexit、native client create/transaction finish/actual closeだけをfinite観測し、両者を同時に載せる前にresource境界を分ける。library本体をmock/置換せず、SQL/body/IDs/rawmessageを出力しない。新regular helper/manifest/caps/deadline/known PG・PIPE/FD closureをRoot別採用してからの案であり、今回は測定helper作成・root予約・実行0。matcher増量や九pair再runは提案しない。

根拠bindingはsource-manifest de7c79faの22module＋2testを元repo/Bsource双方のbytes/fullSHAで一致確認。主要exactSHA: documentExtractor3664979c284e7780009e36a990f460244f3c135ee7880ef54702a90f92f23669、parserWorker911632fb456c27d5c0ef77cd1ea3eb3b5cb8bfa6be034e291ad7e3944f725bf2、isolatedProjection45ab05b2e24bd1c1d1f60fee03eb6e804ae032f892eddfdf7390d0a13f70e832、test0e7f6412abec0d1f8b4737178629618acd2be1c232b42b9382f59d3a6eb17601。compiled server3835965B/5ecc231d17b11d31b9de23a50199fe141366dcf3120174f709b952cd592d0573も一致。installed依存JSは別public read時点hash（source manifest対象外）: sqlite3.js453ca868a8f8e9d87362e97ef1d2aabf2039b6afd82b92409c4fee5a5b5a98a0、libsql/index.jscc6f0fb815d302185ba69d4f749b423dfe304add1c58d6ff687842f8c1e39152、worker_threads.d.ts6eeded8c7e352be6e0efb83f4935ec752513c4d22043b52522b90849a49a3a11（installed API型注記でactualNode binary内部証明ではない）。

公開dependency探索で直接core/node_modules/libsqlは無く、宣言済み@libsql/clientの依存解決先のみへ修正してmetadataを照合した。これはpublic依存pathの欠測でありprivate failureやruntime結果ではない。以下の既actual safe結果を保持し、本先頭section以外は同値、全writer/read停止。

## 第九 actual一巡 — forced / Node exit -6 / upload1-startまで

独立第九有限preflight PASSとRootのexact pair oneRun採用後、strict candidate/static確認とfresh preflightを各inspectして通過。cwd mainから `env -i PATH=/usr/bin:/bin LANG=C python3 -B .goal-implement/helpers/p5c-ui-runner.py --run` を一回だけ実行した。Python actual exit1 / Node actual exit-6 / error=NODE_NONZERO_EXIT / tool kind=forced。UI機能・正常終了監査の受入は不成立。第九bf74ae20/tool-bf74ae20 pairはheld全非操作。第八含む全旧private・第七予約にもread/stat/hash/copy/import/probe/接続0。自動retry・追加root・port変更・cause探索0。

| actual safe field | 観測 |
| --- | --- |
| pure | PASS / count24 |
| outer phase | ui |
| notified stages | initialization → native-hooks → boot-import → pure → ui-root → ui-work → ui-ready → signup-start → signup-done → signin-start → signin-done → upload1-start |
| faults / finite4field | [] / fault frameなしのためtype/name/code/kind未観測 |
| fatal prefix projection | [] |
| UI completed / finished seen / inner finished success | false / false / false |
| Node / Chrome PG | absent / absent、PGAbsent true / true |
| stdout / stderr | EOF true / true、FDclosed true / true |
| control | regular FDclosed true、isPipe false、EOF observed false |
| ownership mirror / Chrome recovery closed | true / null |
| forced / outer deadline exceeded | true / null |
| UI root created | true |
| raw output discarded aggregate / control frames | 321B / 16frames |
| native sync hooks / loader threads / transform services | true / 0 / 0 |

| outer own target signal slot | actual syscall attempted | finite result |
| --- | --- | --- |
| Node TERM | false | not-attempted |
| Node KILL | false | not-attempted |
| Chrome TERM | true | sent-success |
| Chrome KILL | false | not-attempted |

Chrome TERMはos.killpgの成功返却を記録した事実だけであり、到達・Chrome終了原因・Node exit-6原因やinner正常closeを証明しない。Node exit-6とtool forced分類を別に保持する。upload1-startはユーザー操作境界の通知であり、native API実行やabortcauseを証明しない。upload1-done/upload2-start/done・finalization以降は未通知。faults[]/fatalPrefixes[]を正常や未知原因の否定に補完しない。opaque→readonly audit・DBaudit・privateproof/ACK・U0–7/BFCache完了は未観測で、signup/signinのstage通知を機能全体のPASSへ補完しない。raw321Bはrunnerのdrain集計値だけを採用し、本文・stack・SQL・dynamic message・外部IDの保存/公表/事後再読0。

起動前の公開candidateはboot44639B/232d243e、runner42352B/cdfbf3b1、launcher13363B/f045f261、残4helpers既固定、phase96819B/19339605のfullSHA/regular600/nonlink/nlink1/canonicalを確認した。Python AST/compile・launcher stdin --check・公開5helper strict noEmitは各exit0/output0。fresh preflightはCc2 HEAD/B348847のsource/release/build manifests exact fullSHA/regular600/nonlink/nlink1/canonical、Node canonical24.15固定metadata、Chrome98 Current exactlink/canonical/前後identity・両Info.plist exactsize/mode664/nlink1/fullSHA/FD identity・正式binary4field一致、新第九pair非存在でPASS。binaryの余分nlink比較は0、巨大binary body/hash・Chrome CLI/version probe0。

実runでは既caps/期限/正常predicate/closure/privatebrand/RPC13+historyfactory/C/B/sourceを変更していない。pure24/30秒→UI720秒内normalstop120＋outertail30、256MiB/Chrome128/DB48、native/API/HTTP/Worker/PS/FD各上限と43frames22016B within64/32KiBの契約は既固定のまま。observed16framesから未通知処理の実行や正常性を推測しない。新旧privateは終了後に再読せず、本safe reportだけを固定して全writer/read停止。

# 第九 pair 予約binding — 4field候補との独立delta

Root採用の literal 適応のみ完了。新予約は `/Users/hikaru/.local/share/hollow-validation/ui-bf74ae20` と `/Users/hikaru/.local/share/hollow-validation/ui-tool-bf74ae20`。新pairの存在probe・生成・runtime・pure契約実行・UI実行は0。第八a38を含む全旧privateと第七予約pairは非操作。独立preflightとRootの別oneRun採用前は起動不可。

変更はboot内UI literal 1箇所、runner内UI literal 2箇所・tool literal 1箇所・BOOT_SHA従属1箇所だけ。phaseはこの報告prefixのみ追加。4field診断のtype/name/code/kind、descriptor-only/proxy拒否、finite whitelists、UNKNOWN/METHOD_ONLY、getter/toSerialized/constructor非呼出を維持。診断nameはbrandproofにならず、欠測を正常・nativecause・proof/ACKへ補完しない。

| 公開候補 | bytes | SHA-256 |
| --- | ---: | --- |
| boot.mts | 44639 | 232d243ec02f890922d35dfd2fd9d28119e7308e48d3d1b0e1acac21d1c2114c |
| p5c-ui-runner.py | 42352 | cdfbf3b1c2ff812416d898257b464f3dc2b490a30bc21e51865be4aeb99f7c0d |
| runner内LAUNCHER literal | 13363 | f045f2611ba11896fd99e395700204530fdc095bb5b577bae586a502ddee22b0 |
| provider.mts | 11902 | 937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0 |
| browser.mts | 21821 | c26ff1751f7f219c2ddc2d061e79d1410ffd6319e89fc02697aeaa6253c20db2 |
| contract-pure.mts | 9212 | 6493e5f15b3eccf599e275976873f9d9d0c1900388c09a0b78dfb8d3d9dee89c |
| stop-audit.mts | 45822 | 157f0c4e6d0143fee0f59197e161150d79c76d53c7c4736a4538a33aa005abcb |

公開6helperをexact regular600/nonlink/nlink1/canonicalでno-follow全文readし、前後fstat一致・fullSHAを確認。Python AST parse/compileとcanonical NodeのLAUNCHER stdin --checkはexit0/output0、公開5helperのstrict noEmit型checkはexit0/output0。launcherは構文確認のみ、実evaluate/import/versionprobeは0。

逆差分を分離して全文同値確認した。第九bindingをa38 literal/旧BOOT_SHAへ戻すとboot44639B/012df7277f43fbb7ee6a02265f724e381d99ee95235a8695e10ab801f92e183d、runner42352B/f2fb4d4b084ceaceb37c40149efd53244af7b9bd3a84d14c4be385dec27005c1へexact一致。さらに別工程で4field診断6blockを戻すとrunner39497B/3febdeae639fa9094462785cd9df57a38f2f66c2d7bef2eb7893681f18734619へexact一致。bindingによる診断logic/全caps/正常predicate差は0。

C c2a3d45f1097533c6344346aca303dc1d2aef368、B348847/release93d264/source de7c79faの固定bindingは維持し、製品/source操作0。Node canonical24.15/Chrome98正式gate、純24/30秒→UI720秒内normalstop120/共有tail30、global256MiB/Chrome128/DB3×16・合計48、native/API/HTTP/Worker/PS count caps、PG/PIPE EOF-FD/controlFD/opaque→audit/nativeproof/ACK全条件を変更していない。有限9stage・4signal slot・3fatal prefix、topkeys7/512B frame/43frames22016B≤64frames32KiB、最大fault frame372B・静的summary6805B≤8192も同値維持。実cause・終了監査・通常actor/privatebrandへ診断を流用しない。

このprefix追加前のphaseは93499B/51d9349176189bbd0dbaa4ac1c36c0cbad2b32c736d98d077e567769721c58ad。報告固定後は全writer/readを停止し、独立Verifierへ渡す。実run・旧private再読・追加探索・spec系・追加agentは0。

# 有限4field fault診断 — runner限定fixed候補

固定時刻: 2026-10-06 01:36:52 UTC

Root採用のp5c-ui-runner.py 1pathと本phaseだけを変更した。helda38 literalはそのままで起動不可、新root予約/probe/生成・実pure/UI/helper評価0。全old private/第八a38pair/未起動第七予約のread/stat/hash/copy/import/probe/接続0、802B/321B raw再読0。

| candidate | bytes | SHA256 |
| --- | ---: | --- |
| p5c-ui-runner.py | 42352 | f2fb4d4b084ceaceb37c40149efd53244af7b9bd3a84d14c4be385dec27005c1 |
| launcher literal | 13363 | 2e90d3ca3d83a879b4311c70e8c28a6a9e0c7a2efa46d90345ef646721548846 |

faultは{type,name,code,kind}のexact4field objectにした。typeは既FAULTS 5enum、nameは公開error sourceの17known name＋UNKNOWN、codeは既NATIVE_CODES 15enum＋ABSENT/UNKNOWN、kindは公開own data kind6enum＋METHOD_ONLY/ABSENT_AT_BOUNDARY/UNKNOWN。typename17は標準Error系8とCodedError/ApplicationError/BusinessRuleError/RehydrationError/NotFoundError/ConflictError/UnauthorizedError/ForbiddenError/SystemErrorの9。source-kind6はbusiness/notFound/conflict/unauthorized/forbidden/systemのみ。

name/code/kindはown data descriptorだけ。nameがown fieldを持たない標準Errorは既builtin exact prototypeの固定Mapを使う。kindがown fieldを持たなければown/immediate-prototypeのtoSerialized data function存在だけでMETHOD_ONLYとし、実kind値へ補完しない。限定境界でmethodも見つからなければABSENT_AT_BOUNDARY、getter/不明/取得失敗はUNKNOWN。toSerialized・Error/任意constructor・getterは呼ばず、cause/stack/path/SQL/body/任意name/codeは保存・出力しない。

error自身と参照先prototype/guard valueのProxyをNode util.types.isProxyで除外し、prototype/descriptor trapを新診断で呼ばない。既message CASE判定はinstanceofのprototype traversalを避けるためNode util.types.isNativeErrorでnative Errorのown data messageだけを対象にした。これは失敗markerへの有限投影だけで、name/nativeError/own kindをclass identity/privatebrand/actor認可/normal proofに使わない。既CASE/NATIVE marker allowlist値は不変。guardは元のplain/frozen/exact3keys/location/type/boolean条件にdata descriptor検査を明示し、getter/ProxyをUNKNOWN/null側へ保持する。guard root/profile分類・Chrome版条件は変更しない。

outerはfault object exact4keys・全値str・各enum membershipを厳密にdecodeする。旧string/未知shapeに一般fallbackを作らない。publicは既fault=typeを保ち、errorInfo={name,code,kind}を追加する。stage/marker/guard/INNER_FAULT設定と正常判定は不変で、UNKNOWN・未通知・METHOD_ONLY・ABSENTをnormal成功へ変換0。

Python/launcherのtypename/kind whitelistは固定tupleをplaceholderへJSON bindする。B/source-manifestや既5helper SHA従属は不要で、HASHES/BOOT_SHAを変えない。runner自身と派生launcherのfullSHAだけを本候補へ更新し、future予約literalは別採用へ返す。

## 比例逆差分と静的確認

before runner39497B/SHA3febdeae639fa9094462785cd9df57a38f2f66c2d7bef2eb7893681f18734619を600regular/nonlink/nlink1/canonical/fullreadで確認。固定tuple、Node util safe inspector/typename map、recordFault、strict decoder/public projection、2tuple placeholder bindingの6限定blockを逆置換すると、before runnerへ全文bytes完全一致。before launcher11566B/SHA7fc27703a8b09bfa3ba944dd3ea7b0864d2c58a0c9ab8ea7ad93fcd1564ba3baも同deltaの逆差分で回復する。比較は公開before/afterメモリ内のみ、旧private/copy比較0。

全5helper＋runnerをfullread/600regular/nonlink/nlink1/canonical/fullSHA確認。boot012df7277f43fbb7ee6a02265f724e381d99ee95235a8695e10ab801f92e183d/provider937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0/browserc26ff1751f7f219c2ddc2d061e79d1410ffd6319e89fc02697aeaa6253c20db2/pure6493e5f15b3eccf599e275976873f9d9d0c1900388c09a0b78dfb8d3d9dee89c/stop157f0c4e6d0143fee0f59197e161150d79c76d53c7c4736a4538a33aa005abcbは不変。

Python AST parse/compileと固定Node launcher stdin --checkはactual exit0/出力0、自身import/cache/launcher評価0。exact5helper strict noEmitもexit0/出力0。static ASTでtypename17/unique17、known source-kind6、NATIVE15/Stage20不変を確認した。これらは型/構文/shape計算のみで、pure24/diagnostic関数の実実行ではない。

最長stage/fault/CASE-or-NATIVE marker/name/code/kind・guardを詰めた新fault frameはnewline込み372B≤512、topkeys7のまま。前提案369Bから3B増えたのはCASEだけでなく既NATIVE markerの最長も取ったためで、今回のcandidate boundを372Bへ固定する。追加frame0、43frames/22016B≤64/32KiBを維持。public最大32stage/16fault＋errorInfo/4signal/3prefix・保守的64bit output count/80B errorの静的shapeは6805B≤8192、runtime既8192 gateは不変。

stage9/outerSignals4slot/fatalPrefixes3enum/guard null欠測、pure24/max24/Cc2/B3488/release/sourceManifest/Nodecanonical24.15/Chrome98正式gate/privateclass/RPC13+history factory・全HTTP/native/Worker/search/PG/PIPEEOF-FD/controlFD/opaque→audit/proof/ACK/caps期限/normal条件は不変。第六-6/第八exit1の実原因や過去name/code/kindを補完0。

本候補報告を最後に全writer/readを停止しManagerへ返す。独立比例preflight、次pair予約、Root別oneRun採用待ちで、今は実行しない。以下は第八の公開分析とactual履歴。

# 第八 public-only不足整理 — 次のrunner限定案

固定時刻: 2026-10-06 01:26:55 UTC

第八actual reportを先に80035B/SHA3461f06852399801dc2c957b9ae79ba403c379a0752f074235f6fd470ac614a2へ固定した。その後は固定public helperと成功B3488/sourceの既known error modulesだけをread-only確認した。helper編集0/新run0、第八a38pair・旧failed6pairs・未起動第七予約の全操作0、今回802B/第六321B raw再読0、DB/core dump/Chrome/probe0。

## ui-workからui-readyまでの直列公開経路

以下は固定boot/runner source順で、個々のactual到達・成功を追加認定する表ではない。timer/event callbackはこの直列awaitと並行し得るため、UNCAUGHT_EXCEPTIONを最後のcalleeの原因へ割り当てない。

| 順 | exact公開calls |
| --- | --- |
| 1 | launcher enterStage(ui-work) → boot.completeUi → await runUi |
| 2 | contractsPrepared check → await assertBinding → ambient configuration checks → umask/root realpath check |
| 3 | await createSupervisor → installNativeObservation（Worker/fork置換＋syncBuiltinESMExports） |
| 4 | createProviderFixture → supervisor.start(close) |
| 5 | createLibsqlClient → applyPragmas → createRequire(drizzle migrator) → migrate.migrate(getDatabase(client)) → FK query/check → finally client.close |
| 6 | await provider.start → process.chdir(workdir) → 固定own env設定 |
| 7 | await built server import/API check → await built Business import/API check → createErrorBridge |
| 8 | await imported.boot({driveFactory,mailer})。driveFactoryが呼ばれる枝はcheck options → await acquireDriveRuntime → NodeDriveExecution/NodeDriveHttp → Authorization/Folder/Protector/BackupProvider/BuiltBackupSource/Executionの既構築・bridge → key zeroing |
| 9 | serve({fetch,hostname,port}) → supervisor.knownServer(app) |
| 10 | await createBrowserHarness。公開metadata/profile/proxy準備・既owned Chrome launch/CDP setupが含まれる |
| 11 | await clientBindings。typescript createRequire → build manifest hash → RSC name/id scan → client AST/元13named exports → 固定history3assets metadata/hash/AST/import-export認識 → result map |
| 12 | runUi return → completeUiのtry内notify(ui-ready) → executeUi |

runUi例外側にはawait supervisor.stop(close)とactualClosed時restoreObservationがある。close callbackはbrowser.close → app.quiesce → server.close → app.shutdown → provider.closeを既順に試みる。第八ではこれらinner close経路の完了/actualClosed通知も欠測。history正式factoryの実fnはexecuteUiからのcallRpc側にあり、clientBindingsの静的認識を実fn成功へ転用しない。

## UNKNOWNになる境界と最小追加scope

現在recordFaultはErrorのown messageがCASE_MARKERS一致、またはown string codeが既NATIVE_CODES一致の場合だけmarkerを得る。message/codeが範囲外、非string、own data propertyでない、Error以外/別realm、descriptor取得失敗の場合はUNKNOWNのまま。name/class名・serialized kindは現在読んでいない。第八のUNKNOWNはこの分岐集合のどれかを示すだけで、actual name/code/kindを補完しない。

次候補の最小scopeはp5c-ui-runner.py 1path＋phaseのみ。Root別採用まで実装しない。message/stack/cause/path/SQL/body/任意codeを保持・公表せず、finite descriptor projectionを追加する。Node util.types.isProxyでProxyを先にUNKNOWNへ除外し、descriptor/prototype trapを新診断で呼ばない。

- name: own data nameがpublic known whitelist（BusinessRuleError/RehydrationError/CodedError/ApplicationError/NotFoundError/ConflictError/UnauthorizedError/ForbiddenError/SystemError等）ならその固定literal、標準Error系は既builtinのexact prototype identityで有限名を得る。未一致はUNKNOWN。文字列nameはclass identity・privatebrand・actor認可を証明しない。
- code: own data codeが既NATIVE_CODES 15literalだけに一致した場合のみそのenum、own fieldなしはABSENT、それ以外/取得不可はUNKNOWN。業務code/SQLite code/動的文字列の一般出力や一般fallbackを追加しない。
- kind: own data kindがpublic既知business/notFound/conflict/unauthorized/forbidden/system enumならその値。kindが得られず、ownまたはimmediate prototypeのdata descriptorにtoSerialized functionがある場合はMETHOD_ONLY（kind未観測）。確認できた限定境界で両方ない場合はABSENT_AT_BOUNDARY、getter/未知/descriptor失敗はUNKNOWN。toSerialized()/getter/constructor/任意functionを呼ばず、prototype広域探索0。

成功Bのdomain/error.ts/application/errors.ts/lib/error.tsでは、既classesはnameをown readonly dataとして持ち、kindはtoSerialized戻りDTO内である。したがってtoSerializedを呼ばない限り通常のclass Errorのserialized kind値は未観測のまま。name→kindの静的対応をactual kindへ代用せずMETHOD_ONLYで欠測を保持する。既isSerializableErrorはproperty getterへ触れ得るので今回診断には呼ばない。

既7 topkeys/43framesを保つ具体案は、fault frameの既fault欄だけを{type,name,code,kind}の有限4field objectへ包む。stage/marker/guardはそのまま、guard null/既exact3field条件も不変更。outerはobject exactkeys/type/name/code/kind各allowlistで厳密decodeし、publicでは元fault=type＋errorInfo={name,code,kind}へ投影する。未知shapeはfailclosed、legacy一般fallback0。normal proof/ACK/actor/privateclass/RPC13/history factory/case countは変更しない。

静的proposal shape計算ではtopkeys7、最長既stage/fault/marker/Nodecode・known name/ABSENT_AT_BOUNDARY・guardを入れたfault frameはnewline込み369B≤512。追加frame0、worst43/22016≤64/32768を維持できる。public summaryは採用後に16faultの新field込み最大shapeを再計算し既8192B以内を独立preflightで確認する。これは今回実helper試験ではなく、公開literalだけのbyte見積もりである。

## chrome-term other-unknownの静的分岐

stop_groupsはknown targetがabsentでなければ既tail条件でforced=trueを先に立ててown_signalを呼ぶ。own_signalは再度group_stateでkillpg(pgid,0)を行い、aliveだけなら対象TERM/KILL syscallへ進む。absentならattempted=false/ESRCH-absent、unprovenならattempted=false/other-unknownで対象signal syscallへ進まない。group_stateのunprovenはProcessLookupError以外のOSErrorをcatchした結果だが、errnoは現在保持しない。

第八で直接得たのはchrome-term attempted=false/other-unknown、他3slot not-attempted、forced=true、最終ChromePG absentである。固定source上の上記分岐対応を示すが、具体errno/EPERM・signal0 probeの成否の詳細・別inner signal・自然終了/回収原因をactual過去へ補完しない。対象TERM/KILL成功は未証明のまま、PG不在/PIPE閉鎖とinner proof/ACKも別観測である。

第六actual Node -6と第八actual Node exit1/UNCAUGHT_EXCEPTIONは、それぞれ直接終了観測の差だけ。実原因が同じ/変わった/nativeからJSへ移った等とは断定しない。802Bも321Bも読まず、stage欠測・guard=null・fatalPrefixes=[]・finishedなしを保持する。

本公開分析と最小scope案をphaseへ固定して全writer/readを停止する。boot/runner/残4helper bytesは第八fixedのまま変更0、追加診断・新root binding/preflight/実runはRoot別採用まで0。以下は第八actual結果と履歴。

# 第八有限一巡 — pure24 PASS / UNKNOWN uncaught / forced

安全結果固定時刻: 2026-10-06 01:21:02 UTC

独立第八比例preflight限定PASSとRoot一回採用後、fresh precheck PASSを確認してから、固定python3 -B .goal-implement/helpers/p5c-ui-runner.py --run / cwd mainを一度だけ実行した。**Python actual exit1 / Node actual exit1 / error=INNER_FAULT / kind=forced。UI・normalclosure・監査の受入は不成立。** 第八ui-a38cd649/tool-a38cd649 pairをheld全非操作とする。旧failed6pairs・未起動第七予約も全非操作、追加read/stat/hash/copy/import/probe/接続・retry・root/port変更0。

| 安全観測 | actual結果 |
| --- | --- |
| 同Node純条件 | purePassed=true / pureCount=24 / max24。aggregate PASSのみ、個別結果未公表 |
| UI | outerPhase=ui / uiRootCreated=true / uiCompleted=false |
| fault | stage=ui-work / fault=UNCAUGHT_EXCEPTION / marker=UNKNOWN / guard=null、1件 |
| Node | nodeExit=1 / nodePGState=absent / nodePGAbsent=true |
| Chrome | chromePGState=absent / chromePGAbsent=true / ownershipMirrorValidated=true |
| inner final | finishedSeen=false / innerFinishedSuccess=false / chromeRecoveryClosed=null |
| PIPE | stdoutEof=true / stderrEof=true / stdoutClosed=true / stderrClosed=true |
| control | controlRegularFdClosed=true / controlIsPipe=false / controlEofObserved=false |
| tool force / deadline | forced=true / kind=forced / outerDeadlineExceeded=null |
| finite stderr projection | fatalPrefixes=[]。固定3literalの検出なしで、未知原因・native失敗なし・正常成功へ補完0 |
| control/output量 | controlFrames=11 / outputBytes=802、raw再読・保持保存・公表0 |
| 固定構成 | nativeSyncHooks=true / loaderThreads=0 / transformServices=0。個別native処理不在/閉鎖成功へ転用0 |

受信stageはinitialization → native-hooks → boot-import → pure → ui-root → ui-workで途切れた。9操作stageのui-ready/signup/signin/upload1/2通知は未観測。last stageはnativeAPI実行・abort cause・UI操作成功を証明しない。今回のNode exit1は第六のactual -6と異なり、UNKNOWN uncaught marker以上のError name/code/message/関与module/原因は欠測である。第六raw321Bや今回802Bを読む調査は行っていない。

| outer固定slot | attempted | outcome |
| --- | --- | --- |
| node-term | false | not-attempted |
| node-kill | false | not-attempted |
| chrome-term | false | other-unknown |
| chrome-kill | false | not-attempted |

4slotの対象TERM/KILL syscall attemptedはすべてfalse。chrome-termのother-unknownはown_signalの事前known-group-stateがunprovenの場合の有限結果であり、具体errno/reasonは未公表。forced flagはown_signal呼出し前に立つ既tool分類なので、forced=trueをTERM/KILL送信成功やNode exit原因へ置き換えない。outer signal syscall未試行と、実PG absent/PIPE closeの観測を区別する。inner/他のsignal操作や正常resource閉鎖経路を推測補完しない。

両knownPG absence・PIPE EOF/FD close・control regularFD closeはouterから直接観測された。これをinner opaque/native actualclose、privateproof、ACK、DBaudit/normalstopへ補完0。U0–U7/BFCache・history実fn・actor/同realm・opaque→audit/audit各成功は欠測、aggregate pure24で機能受入を代用しない。Chrome/Node actual版の個別fieldは未公表のまま。

fresh precheckはlaunch前にPython exit0/PASS。phase75174B/9b3302cd、boot44639B/012df727、runner39497B/3febdeae、launcher11566B/7fc27703、残4helper fixedのfullhash/600regular/nonlink/nlink1/canonical、Cc2 HEAD/B3488 source/release fullSHA、新第八pair非存在、Node4366slim24.15 canonical regular555/nlink2/64896912B、公有Chrome98の正式binary4field・Current/readlink/canonical・両Info.plist size/mode664/nlink1/fullSHA/FD identityを確認した。binaryの私的nlink比較は撤去済み。public巨大binary body/hash/Chrome CLI/version probe0。旧6failedpairs・第七予約はprecheck/runtimeで開いていない。

fixedcandidate bytes/全caps/Nodecanonical/Chrome98/privateclass/RPC13+historyfactory/finite9stage/4signal/3prefix/actualclosure/proof/ACK条件は無変更。pure24/30秒→UI720含normalstop120/sharedtail30、global256MiB/Chrome128/DB48/objects1/log12/material256KiB/tmp8/native8sim2/search16/Chrome1CDP16/webWorker2/servers3/64frame32KiBを維持し、実control11framesを観測した。

本safe結果だけをphaseへ固定して全writer/readを停止する。第八pairも旧資材も以後全非操作、追加原因調査/変更/一巡はRoot別scope採用へ返す。以下は実行前第八bindingと過去履歴。

# 第八pair literal＋正式Chrome precheck差分 — fixed候補

固定時刻: 2026-10-06 01:14:15 UTC

Root採用のboot/runner予約root literalと従属BOOT_SHAだけを第八ui-a38cd649/ui-tool-a38cd649へ適応した。未起動第七ui-938dfa70/tool-938dfa70予約は以後全非操作、旧failed6pairs/private資材のread/stat/hash/copy/import/probe/接続0、第八pairの存在probe/生成0。pure/UI/runtime/Chrome/DB/version probe0。fresh比例preflightとRoot別一回採用前は起動不可。

| fixed artifact | bytes | SHA256 |
| --- | ---: | --- |
| boot.mts | 44639 | 012df7277f43fbb7ee6a02265f724e381d99ee95235a8695e10ab801f92e183d |
| p5c-ui-runner.py | 39497 | 3febdeae639fa9094462785cd9df57a38f2f66c2d7bef2eb7893681f18734619 |
| launcher literal | 11566 | 7fc27703a8b09bfa3ba944dd3ea7b0864d2c58a0c9ab8ea7ad93fcd1564ba3ba |

boot rootname1、runner UI literal2/tool literal1＋BOOT_SHA従属1だけのdelta。UI/root suffixを第七938dfa70へ、従属bootSHAを5f39243874af3be16aaac5ce5b6834181704f70e64e04549d98b7b32a18af1a2へ逆置換すると、元boot44639B/5f39243874af3be16aaac5ce5b6834181704f70e64e04549d98b7b32a18af1a2、元runner39497B/edf26f35312f04b8c7db8d5fdfcb5c8ea05923ffe697db5e04c726fa26b8821bへ全文bytes一致。比較は公開before/afterをメモリ内だけで行い、旧private/root copy読取り0。他delta0。

全5helper/runnerをfullreadして600regular/nonlink/nlink1/canonical/fullSHAを直接確認した。provider937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0/browserc26ff1751f7f219c2ddc2d061e79d1410ffd6319e89fc02697aeaa6253c20db2/pure6493e5f15b3eccf599e275976873f9d9d0c1900388c09a0b78dfb8d3d9dee89c/stop157f0c4e6d0143fee0f59197e161150d79c76d53c7c4736a4538a33aa005abcbはbyte/hash不変。exact5helper strict noEmit/Python AST parse+compile/固定Node launcher stdin --checkは最終binding後すべてexit0/出力0、自身import/cache/launcher評価0。前phase70168B/a61a1097のfullSHA/600regular/nonlink/nlink1/canonicalも確認してから本節を追記した。

## Root採用の起動前script差分

公開helperのChrome driftgateは変更しない。第七を停止させた私的binary nlink比較は、次のfresh起動前scriptからだけ撤去する。以下は第七scriptの2行に対する正確な差分で、main/frameworkの両反復に適用する。

```diff
-for path,size,nlink in ((app/'MacOS/Google Chrome',367696,2),(framework/'Google Chrome Framework',517027008,1)):
+for path,size in ((app/'MacOS/Google Chrome',367696),(framework/'Google Chrome Framework',517027008)):
     st=path.lstat()
-    assert stat.S_ISREG(st.st_mode) and stat.S_IMODE(st.st_mode)==0o775 and st.st_size==size and st.st_nlink==nlink and path.resolve(strict=True)==path
+    assert stat.S_ISREG(st.st_mode) and stat.S_IMODE(st.st_mode)==0o775 and st.st_size==size and path.resolve(strict=True)==path
```

同fresh scriptの予約targetのみ、UI938dfa70/tool938dfa70を第八a38cd649へ、boot/runner/launcher期待値を本fixed表へ更新する。phaseの期待値は本報告固定後にManagerへ返すfullSHAを使い、報告内へ自己hashを埋めて循環bindingを作らない。この正確差分以外に、正式Chrome gateへ私的predicateを追加しない。scriptは保存実装・実実行せず、Rootの次preflight/oneRun別採用へ渡す。

既read_fixedのhelper/runner regular600/nonlink/nlink1/canonical/fullhash、Node4366slim24.15 regular555/nlink2/64896912B/canonical、Info.plist regular664/nlink1/size/fullSHAとbefore-after FD identity、Current exact98/readlink13B/canonical/before-after identityはそのまま維持する。binaryだけは正式gate同等のregular/mode775/固定size/canonicalで比較する。binary body/hash/CLI/署名暗号verify・任意target/版許可を追加しない。今回の公開metadata再probeは0。

## 不変条件と停止

ui-ready/signup/signin/upload1/2の9固定通知、last-stage≠nativeAPI実行/abort cause/closed proof、ownNode/Chrome×TERM/KILL4slotのattempted＋5outcome、固定3stderr literal enum/未知は空のまま、43FDframes22016B/64-32KiB/fault16/publicsummary8192/drain12MiBは不変。

Cc2/B3488/release93d264/sourceManifestde7c、privateclass/errorbridge/RPC13/history factory、Node24.15/Chrome98gate、pure24/max24/30秒→UI720/normalstop120内/sharedforce30、global256MiB/Chrome128MiB/DB3×16合計48MiB/objects1/log12/material256KiB/NodeTMP8/native8sim2/search16/Chrome1CDP16/webWorker2/servers3、actor/nativeownership/PGESRCH/PIPEEOF-FD/controlFD close/opaque→audit/normalproof/ACK/正常判定はbyte逆差分と残helper SHAにより不変。未知・強制・未通知を正常成功へ補完0。

本reportを最後に全writer/readを停止しManagerへfixed候補を返す。fresh比例preflightとRoot別oneRun採用待ち。以下は第七停止と第六履歴。

# 第七 fresh precheck停止 — 未採用nlink条件の撤去案

固定時刻: 2026-10-06 01:10:45 UTC

Root採用の第七一巡に先立つfresh public precheckで停止し、Python runnerは起動していない。pure/UI/native/app/DB/Chrome実行0、新ui-938dfa70/tool-938dfa70生成0。最初の新pair非存在確認は通過したが、停止後の新pair再probe0、旧failed6pairs/private資材read/stat/hash/copy/import/probe/接続0。root/port変更・自動retry0。

precheckは固定phase66559B/444eb5eb、boot44639B/5f392438、runner39497B/edf26f35、launcher11566B/f638112d、残4helperのfullSHA/600regular/nonlink/nlink1/canonical、Cc2 HEAD/B3488 source/release manifest fullSHA、公有Node4366slim24.15のcanonical metadata、新pair未存在、Chrome Current98/readlink/canonicalまで通過した。公開binary metadataの結合比較（script51）でAssertionErrorになった。precheckそのもののPython exit1であり、Node child exit/fault/control stage/outerSignals/fatalPrefixes/PG/PIPE/controlFD/normal audit/proof/ACKのactual結果は存在しない。第六pure24 PASSやclosed PG/FDを今回へ転用0。Chrome Info.plist hash確認はこのscriptでは後続位置なので今回未到達。

私のprecheckがmain nlink2/framework nlink1を要求した点は、正式browser.mtsのbinary driftgateにない余計な条件だった。Rootの別採用により、固定公開Google Chrome main/framework canonical絶対pathのregular/mode/bytes/canonical/nlinkを一度だけ照合した。body read/hash/Chrome CLI/runtime0、Current/Infoその他の追加探査0。

| 公開binary | regular | mode | bytes | canonical match | nlink | 正式4field match | extra nlink match |
| --- | --- | --- | ---: | --- | ---: | --- | --- |
| main | true | 0o775 | 367696 | true | 3 | 全true | false（私的expected2） |
| framework98 | true | 0o775 | 517027008 | true | 1 | 全true | true（私的expected1） |

この一度のfield照合で不一致だったのはmainの私的nlink条件だけ。正式4fieldのbinary gateへadaptationは不要で、Chrome版drift・native abort・root/DB問題とは断定しない。この観測はInfo.plist hash/CDP版/署名暗号verify/実起動成功の証明ではない。

必要最小diff案は、保存helper変更ではなく次のfresh precheck scriptの2箇所だけである。

```diff
-for path,size,nlink in ((app/'MacOS/Google Chrome',367696,2),(framework/'Google Chrome Framework',517027008,1)):
+for path,size in ((app/'MacOS/Google Chrome',367696),(framework/'Google Chrome Framework',517027008)):
     st=path.lstat()
-    assert stat.S_ISREG(st.st_mode) and stat.S_IMODE(st.st_mode)==0o775 and st.st_size==size and st.st_nlink==nlink and path.resolve(strict=True)==path
+    assert stat.S_ISREG(st.st_mode) and stat.S_IMODE(st.st_mode)==0o775 and st.st_size==size and path.resolve(strict=True)==path
```

helper/runner自身のregular600/nonlink/nlink1、Node canonical regular555/nlink2/bytes64896912、Info.plist regular664/nlink1/size/fullSHA、Current98 exactlink/canonical、全pure/UI容量/期限/normalclosure/proof/ACK/4signal/3literal/9stage制約をこの案は変えない。precheck再実行・runner実起動はRoot別採用前0。public helper5/runner bytesは固定候補のまま変更0、本phase報告だけを追記した。

本公開結果と具体diff案を最後に全writer/readを停止しManagerへ返す。以下は実行前fixedsourceと第六結果履歴。

# UI診断＋第七pair literal — fixed候補

固定時刻: 2026-10-06 01:01:57 UTC

Root採用のboot.mts/p5c-ui-runner.pyだけを変更し、本公開phaseへ報告を追記した。旧failed6pairs/12c/private資材のread/stat/hash/copy/import/probe/接続0、新第七pairの存在probe/生成0、実pure/UI/Chrome/DB/runtime/version probe0。予約literalはui-938dfa70/ui-tool-938dfa70、同origin43173。独立preflightとRoot別実行採用までは起動不可。

## 固定観測境界

bootのUiOperationStageは9literal union。completeUiがrunUiを返した後、cleanup対象のtry内でui-readyを通知し、executeUiへ型付きcallbackを渡す。既signup/signin RPCの直前・返却直後、2回の固定uploadのbeginUpload直前・POST応答の既検査とsealUpload返却後に各start/doneを置いた。通知名はsignup-start/done、signin-start/done、upload1-start/done、upload2-start/done。callbackはlauncherの既enterStageを使い、既制御regularFDの同期frameに接続する。outer STAGESは元11＋操作9の固定20literalで、fault stageの同allowlistにも適用される。

操作名は通知地点到達だけの観測である。last-stageをnativeAPI実行・native abort原因・業務受入・全resource閉鎖の証明へ転用しない。email/password/token/id/path/body/SQL/message/任意文字列は通知しない。元API順序・13named RPC/history factory・入力・actor fence・callback/privatebrand/errorbridgeは無変更。callback例外は既completeUiのcleanup catchへ流れる。

outerSignalsはown Node/Chrome×TERM/KILLの4固定slotのみ。それぞれattempted:booleanとoutcome:sent-success/ESRCH-absent/EPERM-unknown/other-unknown/not-attemptedを持つ。attempted=trueは該当TERM/KILL syscallを呼んだ場合だけ。sent-successはos.killpgが成功返却した事実であり、signal到達・終了原因・PG不在やinner閉鎖証明を代用しない。ESRCH-absentはabsent-before/raceも含むためattempted boolでsignal syscallの有無を区別する。EPERM-unknownは該当signal syscallのOSError errnoがerrno.EPERMの場合だけで、その他error内容は保持・出力しない。事前group_stateがunprovenならattempted=false/other-unknown、stop_groupsの既absent skipならnot-attemptedのまま。未登録targetには送信しない。

既stop_groupsの対象PG・tail期限ChromeTERM0/KILL10秒/NodeTERM10/KILL20秒・送信予約sent set・forced flag設定箇所・group_state回数は不変。own_signalの結果だけをreceiptへ追加した。tool forced分類と実signal outcomeは別欄であり、第六の既欠測を今回の変更でretrofitしない。

fatalPrefixesは次の別採用runの既stderr drain時に限り、完全固定bytes literal FATAL ERROR:/libc++abi:/Assertion failed:に対応したNODE_FATAL_ERROR/LIBCXXABI_FATAL/ASSERTION_FAILEDの3enumだけを重複なし固定順で記録する。matcherが保持するのは各literalの整数進捗3個と検出bool3個だけで、chunk境界を跨ぐraw文字列保存を追加しない。未検出・未知文字列は空配列のまま、正常成功への補完0。既12MiB共有output枠内だけをmemoryviewで走査し、cap超過は既NODE_OUTPUT_CAPを維持。literal一致はその固定表記の存在だけで、native起源・module・原因の証明ではない。Node exit-6、managed faults、inner finished/normal proofの各観測は独立のまま。旧321B再読・raw保存・動的suffix/location/stack/SQL/bodyの公表・core dump設定・native fatal復旧handler・追加process0。

## 固定candidateと比例差分

| artifact | bytes | SHA256 |
| --- | ---: | --- |
| boot.mts | 44639 | 5f39243874af3be16aaac5ce5b6834181704f70e64e04549d98b7b32a18af1a2 |
| p5c-ui-runner.py | 39497 | edf26f35312f04b8c7db8d5fdfcb5c8ea05923ffe697db5e04c726fa26b8821b |
| launcher literal | 11566 | f638112db5aaab84f4a1aec2f2e552cdd060e27cf02a26ffb9ab08d68712f646 |

全5helper＋runnerをfullreadしregular600/nonlink/nlink1/canonical/fullSHAを直接確認した。残4helperはprovider937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0/browserc26ff1751f7f219c2ddc2d061e79d1410ffd6319e89fc02697aeaa6253c20db2/pure6493e5f15b3eccf599e275976873f9d9d0c1900388c09a0b78dfb8d3d9dee89c/stop157f0c4e6d0143fee0f59197e161150d79c76d53c7c4736a4538a33aa005abcbのfixed SHAと不変。

診断deltaを第七bindingとは別に逆差分した。第七bootの予約name1、runnerのUI literal2/tool literal1と従属BOOTSHA1だけを旧12cへ戻すと、boot44639B/SHAcdae18dfa04073cb81d838bdfdfc2a6676cda5997656ce9e7b8c55e65d75aee6、runner39497B/SHAeb3a36ca352e8b80c5aaf8fb281538f2b7834f7c4a479236087f770e7115ed39の診断候補へ全文bytes一致。旧12c診断launcherは11566B/SHA10c3c9edd94cf58871e872b73a1dfca2882b8a2750b7df6ca1f188e24f2d6125。比較は公開before/after bytesのメモリ内のみで、旧root/private copy読取り0。

そこから通知type/接続/9call site、runner stage/接続/errnoとsignal結果/3literal matcher/drain投影/publicfield/従属BOOTSHAの許可deltaを逆置換すると、元boot44203B/SHAcdac7101d57d3a1666aa24e82e9749288503369ea0a06a58ace02c98aacd47d5、元runner37707B/SHA76618b0387265a449c72915e1cd4a9737142b7e0ba59e5cb493d812f60f7f6d3へ全文bytes完全一致。診断deltaとliteral delta以外の差は0。

## 静的checkと維持条件

exact5helper strict noEmitは最終binding後actual exit0/出力0。Python AST parse/compile成功、自身import/cache0。固定canonical Nodeのlauncher stdin --checkはactual exit0/出力0、launcher実評価0/版probe0。作業中の一時indentation不整合はsyntax検査で検出し、実行前に修正して最終parse/compileを再確認した。

static ASTでSTAGES20/unique20と固定3prefix各先頭byteが同literalの残りに現れないことを確認した。この条件で有限matcherは不一致時に先頭byte候補だけへ戻れ、chunk跨ぎでもrawを保持せず固定literalを追跡する。matcher/helper関数・純24条件の実実行は0。

制御frameのstatic最悪は既stage11＋追加9＋fault16＋その他既7＝43≤64、各512Bで22016≤32768B。既frame/byte/fault上限・failclosed guardは不変。summaryは既最大32stage/16fault/最長allowlist値＋4signal slot＋3fatal enumを使う静的shape検査で5002B、既runtime8192B gateは不変。signal/fatal投影はchild control frameを追加しない。stderr matcherは既12MiB共有drain上限内で、raw保存を増やさない。

C c2a3d45f/B3488/release93d264/sourceManifestde7c、Node4366slim24.15 canonical gate/Chrome98 metadata/target/CDP版gate、pure24/max24/30秒→UI720/normalstop120内/sharedforce30、root256MiB/Chrome128MiB/DB3×16合計48MiB/objects1/log12/material256KiB/NodeTMP8/native8sim2/search16/Chrome1CDP16/webWorker2、既HTTP/nativechild/parser/control/PG/PIPEEOF-FD/controlFD/private ownership/nativeclosure/proof/ACK/DBaudit/正常判定は不変。

本報告を最後に全writerを停止し、診断＋第七literalの一つのfixedsource候補をManagerへ返す。独立比例preflightとRoot別one-run採用待ちであり、現在の候補を実行しない。以下は第六の公開分析と実結果履歴。

# 第六 Node -6 — 公開静的経路と次の最小診断案

提案固定時刻: 2026-10-06 00:52:02 UTC

本節はRootの公開限定委譲による提案で、helper実装変更・純条件実行・UI追試・新root生成は0。第六12cpairを含むfailed6pairs/private資材のread/stat/hash/copy/import/probe/接続は0。既321B rawは再読せず、core dump・Chrome/DB調査・native第三者moduleの広域探索・版probeを行っていない。

## 実終了と外側停止分類

直接観測はNode subprocess exit=-6、Python exit1、kind=forced/forced=true、両knownPG absent、両PIPE EOF/FD close、control regularFD closeである。Nodeの-6をouter TERM/KILL送信の結果に置き換えない。runnerはstop_groupsで、known ChromeのTERM/KILLをtail0/10秒、known NodeのTERM/KILLをtail10/20秒に試行する静的経路を持つ。forced=trueはown_signal呼出し前に立ち、own_signalの戻り値は記録されず、absent先行/race/実syscall成功を区別できない。対象別TERM/KILLの実試行・結果は今回の公開summaryにない。kind=forcedはforced flagと実閉鎖等から得たtool分類であり、Node -6は別のactual nonzero終了値である。

purePassed=true/count24は直接aggregate PASS。それ以外はui-workまでのstageしかなく、faults=[]/finishedSeen=falseのため、runUi完了、signup/signin/upload、U0–U7/BFCache、history実fn、正常actor、normal-stop、opaque→audit、privateproof/ACK/DBauditの成功は欠測のまま保持する。outerDeadlineExceeded=nullを正常成功へ補完しない。

## 公開knownmoduleの有限候補

以下のSは成功B3488/source。公開sourceと既helperの静的呼出経路だけを確認した。順位・原因確定・実実行済みを表す表ではない。

| 境界 | 固定公開経路 | 第六の観測限界 |
| --- | --- | --- |
| TS registration/transform | runner launcher installNativeHooks → node:module registerHooks / load hook → stripTypeScriptTypes(mode=transform)。source-manifest-bound source/helperのみ | native-hooks/boot-import/pureは観測された。UI中の個別load/transform、native内部失敗は未観測。loaderThreads=0はnative処理なしの証明ではない |
| SQLite client | boot.runUi createLibsqlClient → S/packages/core/src/adapters/libsql/client.ts → @libsql/client 0.18.0 lib-esm/node.js → sqlite3.js import Database from libsql / file-scheme ConnectionPool.acquireSync。migration後、built bootも同clientを生成 | DB open/PRAGMA/migration/再openの個別成否は欠測。SQL/DB/private rootを読まず、SQLite実原因と断定しない |
| 認証crypto | S/packages/core/src/application/di/serverHollow.ts → BoundedAuthenticationPasswordHasher(NodePasswordHasher) → adapters/node/passwordHasher.ts の node:crypto scrypt、N32768/r8/p1/maxmem64MiB。同時上限2 | 固定executeUiはsignup→verify→signout→signinを呼ぶ形だが、signup/signin到達は欠測。crypto/libuv等の実原因は未確定 |
| text parser Worker | 固定executeUiの2×1024B text upload → adapters/node/import/documentExtractor.ts → parserWorker.mjs detect/extract。text分岐はdecode/paragraphHtml、Office/PDFは別分岐 | Workerの起動・処理・終了は欠測。parser/network制限の静的存在を実閉鎖へ補完しない |
| sharp | adapters/node/import/mediaWorker.mjs のformat=image分岐でのみdynamic import sharp、cache(false)/concurrency(1)。core package sharp0.35.4 | 本UIのtext入力をsharp呼出しへ結び付けない。image/audioは今回非操作。既知依存候補として残すだけで、native binary/body/read/hash/load/probeは0 |

abort候補は上記のようなnative境界を含むが、JS公開呼出経路だけでは「そこで-6になる」と立証できない。一般API observer・全module探索・製品修正を次scopeへ加えない。

## 優先する次の公開限定候補

Rootの別採用がある場合の最小scopeはboot.mts＋p5c-ui-runner.pyの2pathに限定する。現在は提案のみでcandidate bytes/hashは変えていない。

1. bootのcompleteUiがrunUiを返した直後にui-readyを通知し、executeUiの既固定操作だけにsignup-start/done、signin-start/done、upload1-start/done、upload2-start/doneを置く。upload-doneはその固定POST応答とsealUploadの既検査が返った後とする。email/password/token/id/path/body等は通知しない。最大9stage追加で、既制御regularFDへ同期frame、固定literal allowlistだけを使うcallbackをlauncherから渡す。追加HTTP/API/operation countは0、observer全般追加0。
2. 「最後に通知された操作境界」はそのliteral地点到達だけを示す。before markerはnativeAPI実行済みを、after markerは業務受入/全resource閉鎖を証明しない。未通知の段階は欠測、fault stageも現在の有限stage名に追従させるだけで一般messageを出さない。
3. runnerの既stop_groups/own_signal呼出し箇所だけで、node-term/node-kill/chrome-term/chrome-killの4固定slotに attempted:boolean と outcome:not-attempted/absent-before/syscall-returned/esrch/oserror の有限enumを記録する。PID/errno/message/time/rawpathを出さず、syscall-returnedはkillpg成功返却だけを意味し、signal到達・exit cause・PG閉鎖証明を代用しない。今回の実内訳はretrofitせず未観測のまま。
4. 選択可能なouter-only fatal projectionは、次の別採用runの既stderr drain時だけ行う。raw保存・過去321B再読・report/core dump設定・追加signal handler/processは0。改行位置＋固定prefix matcher stateだけを持ち、動的location/message/stack/SQL等を保持も出力もしない。候補literalは行頭FATAL ERROR:または固定空白付きAssertion failedのNode形式だけ、公開codeはNODE_FATAL_LITERAL/NODE_ASSERT_LITERAL、未一致はnull。exit=-6は独立のSIGABRT観測codeとして分類し、literal一致だけでnative起源やmodule原因を認証しない。既faults[]/finished欠測でもouter finalがexit codeと固定literal projectionだけを報告できる。

Node v24.15.0の一次公開sourceはAssert/OnFatalErrorに固定stderr書式とABORTを持つ。この書式は次回matcherの静的根拠であり、第六stderrに存在した証拠ではない。[Node v24.15.0 node_errors.cc](https://raw.githubusercontent.com/nodejs/node/v24.15.0/src/node_errors.cc)

frame64/1frame512B/control32KiB/fault16/publicsummary8192B、既drain12MiB、pure24/max24/30秒→UI720/stop120内/sharedforce30、全容量/native/API/Worker/search/Chrome capsは増やさない。static上限は既stage11＋追加9＋fault16＋その他既loader/pure/ui-start/chrome/done/failed/finished7≤43frames、各512Bなら≤22016B。ただし既cap checksはそのままfailclosedに保つ。外側4signal slotとfatal projectionはchild control frameを増やさない。summary追加後の最大長も8192内で独立検証する必要がある。

将来候補の固定手順は、許可2pathだけのdelta/元13named RPC・history/privatebrand/proof/ACK/caps不変の逆差分、Node/Python構文・exacthelpers strict type静的check、bootSHA従属binding/launcherSHA/fullhash/regular600nonlinknlink1のreport、独立比例preflightである。pure/UI実行や新pair literal/root生成はこの提案には含めず、Root別明示採用が必要。実runに先立つ旧12c literal起動禁止は維持する。

今回のproposal保存前にpublic phase/helper/runnerをfullreadし600regular/nonlink/nlink1を確認。runner37707B/76618b03、boot44203B/cdac7101、provider937fbbee/browserc26ff175/pure6493e5f1/stop157f0c4eは全fixed SHA一致。C/B/source-manifest・boot/runner bytesを変えず、公開phaseの本節追記だけである。本報告固定後writer停止、追加探索/実装/実runをせずManagerへ返す。以下は第六実結果と過去候補履歴。

# 第六有限一巡 — pure24 PASS / Node -6 / forced

安全結果固定時刻: 2026-10-06T00:47:01.287278+00:00

独立UI-RPC2比例preflight PASS後にRootが明示採用した第六一巡を、固定 `python3 -B .goal-implement/helpers/p5c-ui-runner.py --run` / repo cwdで一度実行した。**Python runner actual exit1 / kind=forced、Node actual exit=-6。UI/正常closure/監査の受入は成立しない。** newui-12c/tool-12c pairをfailed-held全非操作へ移行。追加read/hash/copy/import/接続/run/root/probe/port変更0。

| 安全観測 | 実結果 |
| --- | --- |
| 同Node純条件 | purePassed=true / pureCount=24 / max24。aggregate PASSだけで、名前別結果は未公表 |
| UI | uiRootCreated=true / uiCompleted=false / outerPhase=ui |
| Node | actual nodeExit=-6 / error=NODE_NONZERO_EXIT / nodePGState=absent / nodePGAbsent=true |
| Chrome | chromePGState=absent / chromePGAbsent=true / ownershipMirrorValidated=true |
| managed fault | faults=[]。Error marker/guard文脈は取得されていない |
| inner final | finishedSeen=false / innerFinishedSuccess=false / chromeRecoveryClosed=null |
| 両PIPE | stdoutEof=true / stderrEof=true / stdoutClosed=true / stderrClosed=true |
| 制御FD | controlRegularFdClosed=true / controlIsPipe=false / controlEofObserved=false。regularFD closeをPIPE EOFへ転用0 |
| force・期限 | forced=true / outerDeadlineExceeded=null |
| metadata・raw出力 | controlFrames=10 / outputBytes=321。raw内容保存・公表0 |
| 固定構成 | nativeSyncHooks=true / loaderThreads=0 / transformServices=0。個別資源閉鎖観測へ転用0 |

stage列は initialization → native-hooks → boot-import → pure → ui-root → ui-work で途切れた。finalize stages/finished frameは取得されず、以前のCAUGHT/RPC markerとは異なる結果。Nodeの-6は実subprocess終了値であり、具体的native abort原因・関与module/API・UI段階は未観測。managed faultsが空のためRPC/actor/DB/provider等へ原因を推測分類しない。timeout markerはなく、deadline未超過を正常終了へ代用しない。外側forced回収で自己PG/PIPE/FDが閉じた結果をinner opaque/native closure/private proof/ACK/DBaudit成功へ補完しない。

U0–U7/BFCache・history factory実fnの個別結果・正常actor/同realm・opaque→audit close・normal proof/ACKの各直接成功は欠測。aggregate pure24で機能受入を代用しない。Chrome metadata gateやruntime版の詳細独立fieldも未公表で、到達stageだけから個別値を新規観測として記載しない。

preflightではphase47,164B/SHA5cbca9ce、boot44,203B/cdac7101、runner37,707B/76618b03、launcher11,555B/269bc83b、provider937fbbee/browserc26ff175/pure6493e5f1/stop157f0c4eの全文SHA・600/regular/nonlink/nlink1/canonicalを確認した。main Cc2 HEAD/B3488 sourceManifestde7c/release93d264、public Node4366slim regular64,896,912B/555/nlink2/canonical、Chrome98 exactInfo SHA/Current13B/readlink98/canonical、新12cpair各非存在も直接確認。旧failed5pairs read/hash/probe0、version probe/Chrome CLI/portprobe0。

固定Node env・pure24/30秒→UI720/normalstop120内/sharedforce30・root256MiB/Chrome128MiB/DB3×16合計48MiB/objects1MiB/log12MiB/material256KiB/NodeTMP8MiB/native8sim2/search16/Chrome1CDP16/webWorker2/control全caps・private ownership/errorbridge/proof/ACKは無変更。S4の別rootやPGに触れず、自分のUI/port/knownPGだけを所有した。

本安全結果を最後に全writerを停止してManagerへ所有権を返す。新pairも旧資材も全非操作保持、原因分析/追試は別scope判断へ返す。以下は実行前UI-RPC2補正と過去結果の履歴。

# UI-RPC2 callable builder拒否の最小補正 — fixed候補

固定時刻: 2026-10-06T00:43:28.158323+00:00

独立UI-RPC2所見をRootが採用し、実run前にbootのbuilder/configured guard2箇所だけを修正した。VerifierからUI read停止・disjoint S4移行済みの明示通知を受けてから着手した。第六pair literalはui-12c7ae40/tool-12c7ae40のまま、新root存在probe/生成・実pure/UI/Chrome/DB/AST-helper/runtime0、旧failed5pairsは全非操作。

前候補のobject必須guardは、固定compiled createServerFn ZがObject.assign(callable function,{options,middleware,handler})を返すため正常拒否だった。middlewareも同callable Zを返す。この形は独立所見の借用であり、前候補の型check成功を正常runtimeの証明にしない。

両戻り値はunknownのまま受け、固定B exactshapeに合わせて `typeof builder==='function'` / `typeof configured==='function'` を要求する。middleware/handlerのfunction検査、Reflect.applyによるbuilder/configuredのthis保持、exact ClientRpc id、実fn()は維持する。object等の一般fallback・manualHTTP/rawRPC envelope・privatebrand変換・actor fenceの緩和は0。元13namedexport loop/call、厳密history AST/import/export/hash、data未注入は不変。

| candidate | bytes | SHA256 |
| --- | ---: | --- |
| boot.mts | 44203 | cdac7101d57d3a1666aa24e82e9749288503369ea0a06a58ace02c98aacd47d5 |
| p5c-ui-runner.py | 37707 | 76618b0387265a449c72915e1cd4a9737142b7e0ba59e5cb493d812f60f7f6d3 |
| launcher literal | 11555 | 269bc83b0fc5ba36698c190f94bc391fe9845886af1276bc219d72875f323147 |

boot/runnerおよび他4helperのregular600/nonlink/nlink1/fullread/hashを直接確認。boot2guardを前object必須へ逆置換すると前44,234B/SHAa14ea11a8a09ea89c1b30731c96a72630b43021fd5ca3b1fd573b97e4763b44aへ全文bytes完全一致。runnerはbootSHA従属1箇所だけの差で、逆置換が前37,707B/SHA41026e4a97901adeb042abca065cd842965c1bc6d87e73e1e842bd09f900a2a8へ全文bytes完全一致。launcher全文hashは不変でsyntax再演0。比較は公開before bytesのメモリ内だけで、旧private/保存copy比較0。

exact5helper strict noEmitは最終2guard補正後actual exit0/出力0。Python AST parse/compile成功/self-import/cache0。残4helper fullhashはprovider937fbbee/browserc26ff175/pure6493e5f1/stop157f0c4eと不変。C/B/sourceManifest/Chrome98/Nodecanonical24.15/pure24/max24/期限/容量/nativeclosure/PG/EOF/FD/proof/ACK/audit/normal条件は無変更。

本公開報告を最後に全writerを停止し、Managerへ所有権を返す。独立再preflight待ち、実一巡はRoot別明示採用まで0。以下はUI-RPC1候補の履歴で、object戻り値要求の不具合を本補正が置き換える。

# UI-RPC1限定復元＋第六pair binding — fixed候補

固定時刻: 2026-10-06T00:34:19.744633+00:00

Root採用のboot/runner2pathだけを補正した。固定Bの唯一discarded history expressionを正式compiled factoryで再構成する限定枝で、製品C/Bを変更しない。新memory pairは `/Users/hikaru/.local/share/hollow-validation/ui-12c7ae40` と `/Users/hikaru/.local/share/hollow-validation/ui-tool-12c7ae40`。新root生成/存在probe・runtime/AST-helper実行/pure/UI/browser/DB/HTTPは0。旧failed5pairs/private資材のread/hash/import/copy/接続0。

## 正式compiled RPCの限定認識

固定3assetを直接全文read/hashしてbuild-manifest outputsの同entriesを確認した。

| artifact | bytes | SHA256 |
| --- | ---: | --- |
| client/assets/ImportJobs-D10_FM5n.js | 62362 | d7107ef2cb610ee185c47cdd1466886dec5240c1a933d7c7b8f0a1c60172d338 |
| server/rsc/assets/driveBackupServerFn-u4VmcJxQ.js | 12534 | 260f29d21a280bcb1b611c990e21350a40e4b0e216bbb0bf48d45caa6ef434ec |
| client/assets/errorResponseMiddleware-CyKFLMJi.js | 23714 | ebc9b7279f744dc9e64ea82aae999402a01119e87ce687152cb3339b3288e774 |

history exact RSC idは `a55e345a85bd9b6dc3caec547c27379c8cdbb9809e5119cd93d8baaf4b355f75`、nameはdriveBackupHistoryFn。ImportJobs内の同ID literalは直接text上1個で、唯一捨て式は `i({method:GET}).middleware([a]).handler(r(exactID))`。import i/r/aは同dependency namespaceのr/i/tへ対応し、dependencyの正式export Z/ke/ReがそれぞれcreateServerFn/createClientRpc/errorResponse middlewareである。正常意味の根拠は独立UI-RPC1所見の借用と同固定hash/exportmapの直接照合。helperのTS AST実行やclient namespace実importは今回0。

clientBindingsはbuild manifestのSHAをbinding.buildShaへ照合する。元13namedexport loopをそのまま完了してからhistory枝へ進む。固定3outputのbytes/SHA/regular600/nlink1/canonical/fullhash、唯一RSC name/id（同RSC file限定）、ImportJobsの同dependency import辺1個/3正式alias、dependency namedexport map各1個、GET/一middleware/handler/一ClientRpc exactIDというASTを全て検査する。history AST ID数1/唯一ExpressionStatement1、既named resultにhistory無しを要求してからliteral unionの固定history bindingを作る。一般ID/未知式/別method/別schema/name省略/一般fallbackを認めない。必須14名照合は残し、history欠落を条件から外さない。

RpcBindingは元namedexport枝とfixed-drive-backup-history枝のunion。元13binding生成loopと元namedexport呼出式は直接byte同値を確認した。historyのbrowser callbackは同compiled namespaceを実importし、unknown境界でfactory/function/objectを検査する。正式createServerFn({method:GET})→middleware([既middleware])→handler(正式createClientRpc(exactID))からfnを作り、実fn()を呼ぶ。method呼出のthisもReflect.applyで通常builder/configuredへ保持する。callRpcのnameはhistory exact、data===undefinedを要求し、外部inputをschemaless serverDataへ注入しない。normal Ce serializer/transport/metadata/認可/brandは正式APIに任せ、manualfetch/rawRPC envelope/DB seed/actor権限偽装/privatebrand変換を追加しない。

未知値を型castして通さず、compiled namespace/API結果はunknownからtypeof/object境界でnarrowする。型preflightは成功したので製品namedexport追加案への切替は不要。正規factoryが実動作したという成功は、次の実一巡まで未観測を保持する。

## 固定candidate・比例差分

| helper | bytes | SHA256 |
| --- | ---: | --- |
| boot.mts | 44234 | a14ea11a8a09ea89c1b30731c96a72630b43021fd5ca3b1fd573b97e4763b44a |
| p5c-ui-runner.py | 37707 | 41026e4a97901adeb042abca065cd842965c1bc6d87e73e1e842bd09f900a2a8 |
| launcher literal | 11555 | 269bc83b0fc5ba36698c190f94bc391fe9845886af1276bc219d72875f323147 |

全5helper/runnerは直接全文hash/regular600/nonlink/nlink1確認。残4helperはprovider937fbbee/browserc26ff175/pure6493e5f1/stop157f0c4eと全文不変。bootの差分はmanifest hash/RPC型・binding recognition/callRpcの限定history枝とroot名1だけ。runner差はUI名2/tool名1/bootSHA従属1だけ。

scope内RPC節とroot差をメモリ内逆置換すると、前boot38,376B/e3d35c8ca68996e3aa69243d8a132e9669f44656ecb1f6147325e786fe46d996、runner37,707B/f7c391b9449ced99739efa297917b1d5e323beb43c6badd965930d445cb38815へ全文bytes完全一致した。launcherはroot名1の逆差分で9e5f7d53へ復元する。旧private/helper savedcopy比較0。元13namedexport loop/callの直接byte同値と併せ、boot/normal DI/private errorbridge/S3 built class/proof/ACK/stop/auditへのscope外差分0を確認した。

exact5helper strict noEmitは最終history placement/this保持後actual exit0/出力0。初回placementがnamedloop前となっていたことを公開自己delta照合で検出し、後段へ移動して!result条件が元13結果を検査するよう修正した。実run前の静的修正で、旧loop/callは無変更。Python AST parse/compile成功/self-import/cache0、canonical Node24.15 launcher stdin --check actual exit0/出力0/app/module import0。最終bootSHA従属だけの更新後もPython構文再成功、launcher bytesは同値なのでJS構文再演0。

Cc2/B3488/sourceManifestde7c/release93d264、Nodecanonical24.15/Chrome98 gate、pure24/max24/30秒/同Node private gate、origin43173/全部caps/UI720/normalstop120内/tail30、normal nativeclosure/PG/EOF/FD/private proof/ACK/audit条件は無変更。有限fault markerは既RPC_REQUIRED_BINDING/RPC_EXPORT/RPC_FUNCTIONのみ、細診断追加0。新pairも独立preflightとRoot一巡明示採用まで実run0。

本公開報告を最後に全writerを停止してManagerへ所有権を返す。以下は第五実結果と旧候補の履歴。

# 第五有限一巡 — pure24 PASS / RPC_REQUIRED_BINDING

安全結果固定時刻: 2026-10-06T00:20:54.691599+00:00

Root明示採用の第五一巡をdirect `python3 -B .goal-implement/helpers/p5c-ui-runner.py --run`/repo cwdで一度実行した。**Python runner actual exit1 / kind=unproven。UI正常完了・inner auditの受入は成立しない。** 新ui-f901/tool-f901 pairをfailed-held全非操作へ移行。追加read/hash/copy/import/接続/run/root/probe/port変更0。

| 安全観測 | 実結果 |
| --- | --- |
| 同Node純条件 | purePassed=true / pureCount=24 / max24。aggregate PASSのみ、各名前別結果は未公表 |
| UI | uiRootCreated=true / uiCompleted=false / outerPhase=ui |
| fault | ui-work / CAUGHT / RPC_REQUIRED_BINDING / error=INNER_FAULT / guard=null |
| inner final | finishedSeen=true / innerFinishedSuccess=false / chromeRecoveryClosed=null |
| Node | actual nodeExit=1 / nodePGState=absent / nodePGAbsent=true |
| Chrome | chromePGState=absent / chromePGAbsent=true / ownershipMirrorValidated=true |
| 両PIPE | stdoutEof=true / stderrEof=true / stdoutClosed=true / stderrClosed=true |
| 制御FD | controlRegularFdClosed=true / controlIsPipe=false / controlEofObserved=false。regularFD closeをPIPE EOFへ転用0 |
| force・期限 | forced=false / outerDeadlineExceeded=null |
| 有限metadata・出力 | controlFrames=18 / outputBytes=321。raw本文保存・公表0 |
| 固定構成 | nativeSyncHooks=true / loaderThreads=0 / transformServices=0。個別資源終了観測への転用0 |

実stageは initialization → native-hooks → boot-import → pure → ui-root → ui-work → finalize-restore → finalize-recovery → finalize-hooks → finalize-frame → finalize-fd。今回faultは以前のprofile entry拒否ではなくRPC_REQUIRED_BINDINGだが、必要bindingの実名称/対象画面はsafe projectionで未公表。guard=nullは文脈欠測で、location/type/metadata一致を補完しない。U0–U7/BFCache/inner normal closure/private proof/ACK/DBauditの各直接成功は欠測。Node/Chromeの実版、個別metadata predicate通過値、CDP version等も独立summary fieldとしては未公表で、aggregateや自己PG/PIPE終了から証明へ補完しない。

実行前preflightはphase34,644B/SHAa6e8b181、boot e3d35c8c、runner f7c391b9、launcher9e5f7d53、残4helpersの全文SHA/600/nonlink/nlink1/canonicalを直接確認した。main HEAD Cc2、新B3488 sourceManifestde7c/release93d264の全文SHA、public canonical Node4366slim regular64,896,912B/555/nlink2/canonical、Chrome98 exactInfo hashes/Current13B/readlink98/canonical同版、新f901pair各非存在も直接確認。Node version probe/Chrome CLI/old4pairs read/hash/probe/portprobe0。

このpreflightの公開metadata一致は実一巡前の直接観測であり、未公表のruntime版フィールドを作らない。固定candidate writersは全て実行前後停止、最小Node env・pure24/30秒→UI720/normalstop120内/sharedforce30・root256MiB/Chrome128MiB/DB3×16合計48MiB/全native/API/control caps・ownership/closure/proof/ACK/normal条件は無変更。

本公開安全報告を最後に全writerを停止し、Managerへ所有権を返す。RPC_REQUIRED_BINDINGの公開code照合は別scopeへ返し、原因をprivate root探索で回復しない。実一巡1回、再試行0。以下は第五fixed candidateと過去補正/実結果の履歴。

# 第五一巡の新ui-f901/tool-f901 binding — fixed候補

固定時刻: 2026-10-06T00:12:40.288616+00:00

Root採用の参照root literalだけをboot/runnerへ適応した。新UI `/Users/hikaru/.local/share/hollow-validation/ui-f901bd37` と新tool `/Users/hikaru/.local/share/hollow-validation/ui-tool-f901bd37`。新root生成/存在探査/probe・Node version probe・Chrome/DB/pure/UI実行は0。旧failed4pairsはread/hash/import/接続0。

差分はboot exact比較name1、runner UI名2/tool名1/bootSHA従属1のみ。逆置換全文bytes一致により前boot a3694e00・runner75e12156・launcherf585ac22を復元した。Nodecanonical追加はその前候補に既固定されており、今回literalbindingと一つのsource候補として独立preflightへ出す。Node正規path/24.15.0 gateやChrome98 drift gateを緩めず、不一致なら新runもfail closedする。

| candidate | bytes | SHA256 |
| --- | ---: | --- |
| boot.mts | 38376 | e3d35c8ca68996e3aa69243d8a132e9669f44656ecb1f6147325e786fe46d996 |
| p5c-ui-runner.py | 37707 | f7c391b9449ced99739efa297917b1d5e323beb43c6badd965930d445cb38815 |
| launcher literal | 11555 | 9e5f7d534c28435358b8ae1cb8e2340c7e6d3038e6a49b4355ea4d039b00b0fb |

全5helper/runnerはregular600/nonlink/nlink1/fullread/hashを直接確認。残4helper全文hash不変: provider937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0/browserc26ff1751f7f219c2ddc2d061e79d1410ffd6319e89fc02697aeaa6253c20db2/pure6493e5f15b3eccf599e275976873f9d9d0c1900388c09a0b78dfb8d3d9dee89c/stop157f0c4e6d0143fee0f59197e161150d79c76d53c7c4736a4538a33aa005abcb。

fixedC c2/B3488/sourceManifestde7c/release93d264は操作0で既不変更根拠を借用。origin43173/全caps/同Node純24/max24/30秒→UI720/normalstop120内/tail30/元nativeclosure・private proof/ACK・PG/EOF/FD・audit・normal判定に差分0。guard文脈欠測はnullで推測補完しない。

Python AST parse/compile成功/self-import/cache0。採用canonical Node24.15.0へlauncher stdin --checkを渡しsyntax actual exit0/出力0/module import0。version probeでもlauncher実行でもなく、gate実合格を主張しない。型形はroot文字列差だけなので追加型再演0、以前の受入を借用。

本公開報告を最後に全writerを停止し、Managerへ所有権を返す。独立PASS後の別Root明示採用まで一巡runは禁止。以下はNodecanonical補正・Chrome98候補・過去実結果の履歴。

# Node24.15公開canonical gate — runner限定fixed候補

固定時刻: 2026-10-06T00:10:30.637504+00:00

Root通知のChrome98delta独立static PASSを借用し、runner1pathだけへNode正規path固定と二境界gateを追加した。boot含む全5helperのbytes/hashは不変。旧ui-b17/tool-b17 failed literalを変えず実起動は禁止のまま、新root binding/生成/probe・pure/UI/DB/Chrome runtime実行0。

固定Nodeは `/nix/store/4366l8b6kz1f2sxq6243rfs53grc73zz-nodejs-slim-24.15.0/bin/node`。公開lstat/realpathだけでregular64,896,912B/mode555/nlink2/canonical同値を直接確認した。binary本文read/hash/copy0、Node version実probe0、public profileの24.18版や旧aliasの探索/probe0。engine pinは元の24.15.0を保つ。

Python public_bindingの先頭で同exactpathのcanonical/regular/size/mode/nlinkを検査し、OSError/不一致は固定 `NODE_PUBLIC_BINDING` でfail closedする。tool/UIroot生成やNode spawnに先行する。未知の実体を旧alias消失/DB障害などへ推測分類しない。

launcherはinitialization時、元spawn observer登録後・native hooks/boot/app/DB/Chromeを読む前に `process.execPath` のexactpath/canonical同値と `process.versions.node==='24.15.0'` を要求する。canonical取得不明/不一致は固定 `UI_NODE_EXECUTABLE_BINDING`、異版は `UI_NODE_VERSION_BINDING`。既safe CASE_MARKERSへこの2literalだけを追加して分類し、raw path/message/版を出力しない。observerを登録した後にgateを置くため、失敗時も元のfinally restoreに整合する。これをapp/DB/bootstrap/Chromeの成功根拠にしない。

| fixed公開candidate | bytes | SHA256 |
| --- | ---: | --- |
| p5c-ui-runner.py | 37707 | 75e12156d467477ec17b0c9d67cf51d414bc779a5f43cfc8f3d65f6483139e6d |
| launcher literal | 11555 | f585ac22d80353419e35f0dff805b42c24fc035bf867ac6c942ccef0db710b84 |

全5helperのregular600/nonlink/nlink1/fullhashを直接照合し不変: boot a3694e00/provider937fbbee/browserc26ff175/pure6493e5f1/stop157f0c4e。runnerもregular600/nonlink/nlink1/fullhashを直接確認。runnerの元NODE1literal・Python gate追加・launcher開始gate追加・safe marker2literalだけを逆差分で復元すると、前固定runner36,876B/SHA1ae50ba25dec73a4920b583a102c93cd72a96de2a8bf9a14ef6ce0e1cd3d42afへ全文bytes完全一致した。対応launcherは旧11,167B/SHA1dbb86223aaae58a469df4dcc3b3a4184a31ae0e510ceb185354c0bb0c4c82deへ戻る。公開before/afterメモリ比較のみで旧private読取/保存copy0。

Python AST parse/compile成功/self-import/cache0。採用したcanonical Nodeの `--check` へlauncherをstdinとして渡しactual exit0/出力0/app/module import0。これは構文checkで、Node version probeやlauncher gate/runtime成功を証明しない。helper型は無変更範囲の既受入を借用し、追加型再演0。

Chrome98/Info hash/Current gate・scope/private source/B・pure24/30秒/UI720/normalstop120内/tail30・全caps/epochs/child/Worker/HTTP/PS・actual ownership/PG/EOF/FD/private proof/ACK/audit/normal判定は無変更。faultが文脈なしならguard=nullで、個別predicate/原因の補完0。宣言Nodeの変更を汎用PATH/環境へ広げない。

本公開報告を最後に全writerを停止し、Managerへ所有権を返す。独立比例delta確認と別newroot binding採用まで実一巡0。以下はChrome98補正と過去結果の履歴。

# Chrome98固定・公開metadata drift gate — fixed候補

固定時刻: 2026-10-06T00:04:13.584971+00:00

Rootが採用した公開helper補正だけを実装した。実UIの第五一巡は未採用・未実行。公開helper4pathsと本報告以外は編集0、ui-b17/tool-b17のfailed literalは不変で実起動禁止。旧failed4pairs/private資材をread/hash/import/probeしない。

## 公開版の根拠と限定gate

独立review19,311B/SHA `45b225b2b3c7f062ccd27b51d6c286f50793eb4191b8c4ff61a453b40faa7d5b`を直接全文読取し、公開appのlimited lstat/readlink/plist/fullhashだけで以下を確認した。Chrome CLI/probe/profile/runtime0、metadata工具の追加process0。同版framework binary517MBの本文read/copy/hash0。

| metadata | 直接確認 |
| --- | --- |
| app Info.plist | 18,856B/SHA89dd2f1a7b8a46a153603197c416dab4078d47d499785422ba5286d4f39b2e69、regular664/nlink1/canonical、CFBundleShortVersionString98/com.google.Chrome |
| framework Versions/Current | symlink13B/readlink exact154.0.8037.98、canonical target=Versions/154.0.8037.98 |
| framework Info.plist | 1,075B/SHAe18aa35402e19da4924b8db9502466c6997144f3e85b20cd433876629d826f46、regular664/nlink1/canonical、CFBundleShortVersionString98/com.google.Chrome.framework |
| main executable | regular367,696B/mode775/nlink2/canonical。旧main regular/size/modeの条件を維持 |
| framework executable | regular517,027,008B/mode775/nlink1/canonical、本文read/hash0 |

これらは現在の公開installed metadataであり、第四一巡時の実版/targetを98と証明する観測ではない。公開appの664/775/nlink2をvalidation600/nlink1規則へ混ぜず、validation条件を変更しない。

browserのprofile生成とChrome spawn前に `assertChromePublicMetadata` を呼ぶ。Current exact98/13B/nlink1/canonical同版dir、両binary regular/canonical/既size/775、両Info exact bytes/hash/664/nlink1/canonicalを照合する。InfoはO_RDONLY|O_NOFOLLOWで逐次2FD（同時最大1）を開きSupervisorへactual登録し、lstat↔fstat inode/dev/UID/nlink/size/mode、読取前後のidentity/mtimeを検査する。bufferはexpected size+1でhard boundし、ちょうどexpected bytesと既SHA一致を要求する。finallyでactualFDcloseを待ち、close失敗/不明を成功へ補完しない。Currentも照合後identity/readlink/canonicalを再確認する。新file生成・一般app探索・巨大binary hash・新thread/processは行わない。

Gateはmetadata driftをChrome spawn前に拒否するためのもの。既actualChild early ownership → own profile exactmetadata限定許可 → CDP actual `Chrome/154.0.8037.98`一致の順を保つ。後続driftやownership欠測をmetadataからproof化しない。既known FD閉鎖registryを使い、UI/stop/outer資源上限を増やさない。

TeamIdentifier=EQHXZ8M8AV/Developer ID Google LLC、Identifier=com.google.Chrome/com.google.Chrome.framework、app CDHashb839acd3629c96da252d20dc69323e7e694fcf16/framework CDHash6cd8c7aed9c0185c73bd4bcd01d8d0c8fd265420は独立reviewのcodesign表示根拠を借用する。自分のcodesign/暗号署名verify実行0、runtime署名verification gateを追加した扱い0。Info exacthashと既公開identity根拠を保持し、表示を署名検証成功・実Chrome所有へ代用しない。新codesign childが必要なら別scope判断が必要。

## pin・純対・不変更範囲

stop predicateのtargetをexact `154.0.8037.98:1`へ更新し、15B/最大32B、known registration/profile直下/UID/nlink/symlink条件を維持。pure24内の同profile条件を98へ追従し、98:0と旧93:1を拒否する負対だけを足した。98:2/別位置/type/owner/bytes等の既拒否も維持。done名/回数24/max24/30秒は不変、実pure実行0。anyversion/任意target/版0の許可はない。

細predicate診断は今回追加0。既finite location/type/knownMetadataNameだけを維持し、currentfault.guard=null/periodic context欠測は推測補完しない。boot/provider bytes、Cc2/B3488/sourceManifest/release、全mutation/HTTP/Worker/child/PS/容量、early actualChild/PG/EOF/FD、private proof/ACK/audit/normal判定は無変更。

## 固定候補と比例check

| path | bytes | SHA256 |
| --- | ---: | --- |
| browser.mts | 21821 | c26ff1751f7f219c2ddc2d061e79d1410ffd6319e89fc02697aeaa6253c20db2 |
| stop-audit.mts | 45822 | 157f0c4e6d0143fee0f59197e161150d79c76d53c7c4736a4538a33aa005abcb |
| contract-pure.mts | 9212 | 6493e5f15b3eccf599e275976873f9d9d0c1900388c09a0b78dfb8d3d9dee89c |
| p5c-ui-runner.py | 36876 | 1ae50ba25dec73a4920b583a102c93cd72a96de2a8bf9a14ef6ce0e1cd3d42af |

全5helper/runnerのregular600/nonlink/nlink1と全文hashを直接確認。boot38,376B/SHAa3694e009d9145ff722492ef3ed6a5cc1da30b5a25abec8ac4ea1e6c0bee4fe5、provider937fbbeeは不変。runnerは変更3helper SHAの従属bindingだけ差、launcher11,167B/SHA1dbb86223aaae58a469df4dcc3b3a4184a31ae0e510ceb185354c0bb0c4c82de全文hash不変。

public before/afterをメモリだけに保持し、browser metadata gate/import/call/CDP pin、stop target、pure pin/同条件negative2、runner SHA3を逆差分で除去・復元した。前固定browsera4b2192d/stop3c399c1f/pure13ef8190/runnere951a00fへ全文bytes完全一致した。旧private bytesからの比較・保存copy0。

exact5helperの既strict noEmit check actual exit0/出力0（FD登録をtry内へ置いて失敗時finallycloseを保つ最終差分後も再成功）。Python AST parse/compile成功/self-import/cache0、pinned Node24.15 launcher stdin --check actual exit0/出力0/import0。Chromeやhelper moduleのruntime実行は0、metadata gate自身の実行も0。

本報告を最後に全writerを停止してManagerへ所有権を返す。独立比例deltaレビュー待ち。以下は第四一巡と過去candidateの履歴。

# 第四有限一巡 — pure24 PASS / profile symlink guard拒否

安全結果固定時刻: 2026-10-05T23:48:39.108065+00:00

独立binding PASS後にRootが明示採用した一巡を、repo cwdのdirect `python3 -B .goal-implement/helpers/p5c-ui-runner.py --run` で一度実行した。**Python runner actual exit1 / kind=unproven。UI正常完了・inner audit成功は成立しない。** 新ui-b17/tool-b17 pairもfailed-held全非操作へ移行し、追加read/hash/import/接続/run/root/probe/port変更0。対象の実位置・target・拒否されたpredicate項目は未観測を保持する。

| 安全観測 | 実結果 |
| --- | --- |
| 同Node純条件 | purePassed=true / pureCount=24 / max24。各条件名別結果は未公表、aggregate24 PASSのみ |
| UI | uiRootCreated=true / uiCompleted=false / outerPhase=ui |
| fault | ui-work / CAUGHT / UI_ENTRY_TYPE / error=INNER_FAULT |
| guard場所・型 | location=owned-chrome-profile / type=symlink / knownMetadataName=true |
| inner final | finishedSeen=true / innerFinishedSuccess=false / chromeRecoveryClosed=null |
| Node | actual nodeExit=1 / nodePGState=absent / nodePGAbsent=true |
| Chrome | chromePGState=absent / chromePGAbsent=true / ownershipMirrorValidated=true |
| 両PIPE | stdoutEof=true / stderrEof=true / stdoutClosed=true / stderrClosed=true |
| 制御FD | controlRegularFdClosed=true / controlIsPipe=false / controlEofObserved=false。regularFD closeをPIPE EOFへ転用0 |
| force・期限 | forced=false / outerDeadlineExceeded=null |
| 有限metadata・出力 | controlFrames=18 / outputBytes=321。raw内容保存・公表0 |
| 固定構成 | nativeSyncHooks=true / loaderThreads=0 / transformServices=0。個別資源閉鎖の観測へ転用0 |

実stage列は initialization → native-hooks → boot-import → pure → ui-root → ui-work → finalize-restore → finalize-recovery → finalize-hooks → finalize-frame → finalize-fd。前一巡の欠測と異なり、今回は有限guardの上表3値が直接safe projectionに届いた。ただしknownMetadataName一致はexact profile直下の証拠ではなく、位置・target・UID/nlink/size等の個別照合値も公表されていない。symlink例外のどの条件で拒否されたかを推測で決めない。Root/Verifierによる公開sourceの次判断に返し、private rootの探索は行わない。

U0–U7/BFCache/inner normal closure/private proof/ACK/DBauditの各直接成功は欠測。pure aggregateと外側PG/PIPE/FD終了を代用しない。periodic catchのcontext lossという追加観察は引き続き欠測可能性として残し、今回guard値が届いたことから他経路へ一般化しない。

preflightではphase29af6eee、boot a3694e00、runner e951a00f、launcher1dbb8622と残4helperのexact600/nonlink/nlink1/canonical/fullread/hashを直接確認。Cc2 HEAD、新B3488 sourceManifestde7c/release93d264全文SHA、新b17 pairの非存在を確認した。旧failed3pairs read/hash/probe0、portprobe0。全candidate writerは実行前後とも停止、C/B/source/bridge/classifier/24条件/全caps/30秒pure→720秒UI/120秒normalstop内/shared30秒tail/PG/EOF/FD/private proof/ACK/normal判定は無変更。

本公開安全報告を最後に全writerを停止してManagerへ所有権を返す。実一巡1回のみで追加実行0。成功のように補完する分析や秘密SQL/rawmessage/stderr保存出力0。以下は実行前candidateと前一巡の履歴。

# 新ui-b17/tool-b17のliteral binding — fixed候補

固定時刻: 2026-10-05T23:45:57.225811+00:00

Root通知の限定3delta独立PASSを借用し、新UI `/Users/hikaru/.local/share/hollow-validation/ui-b17f402e` と新tool `/Users/hikaru/.local/share/hollow-validation/ui-tool-b17f402e` へliteral参照のみ適応した。root生成・存在probe・pure/UI/Chrome/DB/runtime実行0。旧failed3pairsその他private根のread/hash/import/接続0。

変更はboot exact比較name1・runner UI名2/tool名1/bootSHA従属1だけ。逆置換全文bytes一致とhashを直接確認し、旧bootdd42a274・runner7e56cfd8・launcher efee1baaへ復元した。source/B/caps/期限/normal/PG/EOF/FD/private proof/ACKに未申告差分0。

| 公開candidate | bytes | SHA256 |
| --- | ---: | --- |
| boot.mts | 38376 | a3694e009d9145ff722492ef3ed6a5cc1da30b5a25abec8ac4ea1e6c0bee4fe5 |
| p5c-ui-runner.py | 36876 | e951a00f16a499c448deccc8cfa42b674ffb46c2cf4b736e2ce5462d6b9bb249 |
| runner launcher literal | 11167 | 1dbb86223aaae58a469df4dcc3b3a4184a31ae0e510ceb185354c0bb0c4c82de |

全5helper/runner regular600/nonlink/nlink1/fullread/hash確認。残4helper全文hashはstop3c399c1f/pure13ef8190/provider937fbbee/browsera4b2192dと不変。origin43173・fixedC c2/B3488/sourceManifestde7c/release93d264・全caps・pure24/max24/30秒同Node private gate・UI720/normalstop120内/tail30・RunningChromeVersion限定許可・未知DB拒否・診断finite enumは無変更。

Python AST parse/compile成功/self-import/cache0。pinned Node24.15 launcher stdin `--check` actual exit0/出力0/import0。既helper型checkは不変更範囲の借用で追加再演0。Verifier追加観察のperiodic catchでguard contextが失われる可能性は欠測として残す。contextがなければguard=null、location/type/metadata一致を推測で補完しない。現safe markerの受入やnormal条件を変更しない。

本公開報告を最後に全writerを停止し、Managerへ所有権を返す。独立binding deltaレビュー待ちで、次の一巡実行は別Root明示採用が必要。追加agent/spec/spec-implement・製品/S4/P5d tree・全管理正本/goal操作0。以下は限定3delta候補および以前の一巡結果の履歴。

# RunningChromeVersion限定許可・有限guard診断 — fixed候補

固定時刻: 2026-10-05T23:41:39.869634+00:00

Rootのdesign採用範囲だけを実装した。独立preflight待ちで、新root/toolroot生成・存在probe・実pure/UI/Chrome/DB/runtime/HTTPは0。第三一巡のUI_ENTRY_TYPEの実path/type/領域は欠測のまま保持し、今回metadataリンクが実原因だったと断定しない。候補のroot参照は旧ui5b/tool5bのままで、失敗pairの再利用は許可されない。次の実行には独立レビューと別の新root binding採用が必要である。

## 限定リンク

`isOwnedChromeVersionLink` は入力されたprimitive値だけで判定する。current known Chrome registration、canonical own profileの正規descendantかつ直下exact `RunningChromeVersion`、lstat symlink/同UID/nlink1、no-follow readlink exact target `154.0.8037.93:1`、lstat.sizeがtarget UTF8 bytesの15と一致/32B以内を全て要求する。別位置・profile prefix spoof・未登録・別type・別UID・nlink2・target差・過大sizeは拒否する。profile directory自体のcanonical/UID/modeは既walk境界の検査を維持する。リンクtargetを追跡しない。名前一致のregular/directoryも拒否するため、一般regular許可へ逃がさない。他symlink/特殊entryの拒否と元Singleton処理は不変。

guardはUID検査後、known metadata名一致時だけreadlinkする。size32超またはsymlink以外はreadlink0で拒否。許可リンクのtarget bytesをfiles/global bytes/Chrome bytesへ計数し、既20,000entries/global256MiB/Chrome128MiBの上限を維持する。app3logicalDB各16MiB/合計48MiB・mode/nlink・unknownDB分類・私的closure/proof/ACK/監査への変更は0。

pureの既 `database_owned_profile_requires_exact_boundary` 条件内に上記正負対と安全診断の代表対を追加した。条件名・done回数は変更0、全体24/max24/30秒を保つ。metadata positiveを1、別root/下位directory/prefix/escape/owner-null/currentChrome=false/type=false/UID差/nlink差/target差/size差をnegativeとして固定。profile metadata/symlink、Chrome TMP未知symlink、objects socket、path escape unknownの有限診断を照合する。実pure24は未実行。

## 有限診断

per-entry guardのUID/mode/type/unknownDB/global capacity拒否は、Errorへfrozen own `guardContext` を付ける。値はlocation enum `{root,owned-chrome-profile,chrome-tmp,objects,node-tmp,other,unknown}`、type enum `{directory,regular,symlink,socket,other,unknown}` とknownMetadataName booleanだけ。raw path/target/stat内容/SQL/動的messageをErrorへ追加しない。その他guard/例外でentry文脈がなければrunnerのguard=nullとなり、欠測をfalse観測へ補完しない。

launcherはErrorのown data descriptorからplain/frozen/exact3keys/有限enum/booleanのみを射影し、accessor・未知値は採用しない。fault frameへguardの1fieldを追加し、outerもnullまたはexact3keys/enum/booleanを検証する。faultの最大shapeは7keys、他frameは従来exact shapeのまま。既64frames/512B per frame/32KiB/control・16faults/8192B summaryを上積みしない。case marker・stage・normal/forced/unproven・PG/EOF/FD・actualClosed/private proof/ACKは無変更で、診断を成功根拠へ使わない。

## 固定hashと比例差分

| 公開path | bytes | SHA256 |
| --- | ---: | --- |
| stop-audit.mts | 45822 | 3c399c1fc341bf02dfb3215c2cedacbb86733224c410afb8dd9508ce30638670 |
| contract-pure.mts | 9158 | 13ef8190716dcb3cdb2cc5c2597bbc5752784dd1a3a3eb1dd860fe627020b6fb |
| p5c-ui-runner.py | 36876 | 7e56cfd866453e4e1801a137ba955b6f70899f152199e797fb4bc6c73b641097 |
| runner launcher literal | 11167 | efee1baac0929858ff635135de06393f7714722278428c74a44b213dc41d0efc |

全5helper/runnerの直接全文read/hash・regular600/nonlink/nlink1を確認。bootdd42a274/provider937fbbee/browsera4b2192dは全文hash不変。製品C c2/B3488/source/releaseは操作/変更0で既binding根拠を借用する。

3公開before/after bytesをメモリだけに保持し、限定追加関数・metadata branch・entryFailを除去、per-entry6failを復元、pure import/同条件追加を復元、runner fault射影/shape/2helperSHAを逆置換した。全文bytesはそれぞれ前固定stop4b419fa5・pure4bb7af52・runner31ecd2ccへ完全一致した。旧privateファイルからの比較0、保存copy0。元Singleton/Worker/child/server/stop/監査/所有/normal条件への未申告差分0。

exact5helperの既strict noEmit checkはactual exit0/出力0。Python AST parse/compileは成功/self-import/cache0。pinned Node24.15 `--check` のstdinへlauncher literalを渡しactual exit0/出力0/import0。runtime/pure実行やtypeのための型弱化を行わない。

本報告を最後に全writerを停止し、Managerへ所有権を返す。以下は第三一巡結果と以前の候補履歴。

# 分類修正後の有限一巡結果 — pure24 PASS / UI_ENTRY_TYPE

安全結果固定時刻: 2026-10-05T23:18:10.258084+00:00

Manager明示採用後に一度だけdirect `python3 -B .goal-implement/helpers/p5c-ui-runner.py --run` をrepo cwdで実行した。**Python runner actual exit1、kind=unproven。UI正常完了・inner auditの受入は成立しない。** 新ui5b/tool5b pairは失敗後held・全非操作へ移行し、再読/hash/import/接続/再試行/追加root/port変更を行わない。

| 安全観測 | 実結果 |
| --- | --- |
| 同Node純条件 | purePassed=true / pureCount=24 / max24。同Node先行gate通過。各条件名別結果は未公表、aggregate24 PASSのみ |
| UI | uiRootCreated=true / uiCompleted=false / outerPhase=ui |
| fault | stage=ui-work / fault=CAUGHT / marker=UI_ENTRY_TYPE / error=INNER_FAULT |
| inner final | finishedSeen=true / innerFinishedSuccess=false / chromeRecoveryClosed=null |
| Node | actual nodeExit=1 / nodePGState=absent / nodePGAbsent=true |
| Chrome | chromePGState=absent / chromePGAbsent=true / ownershipMirrorValidated=true |
| 両PIPE | stdoutEof=true / stderrEof=true / stdoutClosed=true / stderrClosed=true |
| 制御FD | controlRegularFdClosed=true / controlIsPipe=false / controlEofObserved=false。regularFD閉鎖をPIPE EOFへ転用0 |
| force・期限 | forced=false / outerDeadlineExceeded=null |
| 有限metadata・出力 | controlFrames=18 / outputBytes=321。raw内容保存・公表0 |
| 固定構成 | nativeSyncHooks=true / loaderThreads=0 / transformServices=0。構成値を資源個別閉鎖証拠へ転用0 |

実stage列は initialization → native-hooks → boot-import → pure → ui-root → ui-work → finalize-restore → finalize-recovery → finalize-hooks → finalize-frame → finalize-fd。安全faultは今回UI_ENTRY_TYPEに変わったが、対象の実path・type・領域・生成元は未観測。Chromeや製品DBへ原因を断定しない。U0–U7/BFCache/inner正常closed/private proof/ACK/auditの各直接結果は欠測を保持し、aggregate pureや外側自己PG/PIPE/FD終了で成功へ補完しない。追加解釈・private readによる原因分析は0。

preflightは公開5helper/runner全regular600/nonlink/nlink1/canonical/fullread/hashを確認し、bootdd42a274・runner31ecd2cc・stop4b419fa5・pure4bb7af52・既provider/browser固定値に一致。main HEAD c2a3d45f、成功B3488のrelease93d264/sourceManifestde7c全文SHA、新ui5b/tool5b各非存在も直接確認した。旧failed rootsへの存在probe/read/hash0、portprobe0。origin43173・全caps・同Node純条件30秒→UI720秒/normalstop120秒内/tail30秒・ownership分類・unknown拒否・private proof/ACK・normal判定は無変更。

独立classification+binding PASScc4be531はManager通知の借用。本担当が観測したのは上表safe runner projectionとプロセス実終了であり、以前のUI失敗結果や失敗root・個別秘密資材を読む追試ではない。全candidate writer停止を実行前後とも維持し、本公開安全報告を最後にwriterを停止してManagerへ所有権を返す。

以下は実行前fixed candidateと分類変更の履歴。

# 新root literal bindingの固定候補

固定時刻: 2026-10-05T23:14:30.933187+00:00

Manager通知のclassifier独立PASS59e12b41を借用し、分類と24条件を固定したまま新root参照だけを変更した。新UI `/Users/hikaru/.local/share/hollow-validation/ui-5b56603c`、新tool `/Users/hikaru/.local/share/hollow-validation/ui-tool-5b56603c`。新root生成・存在probe・actual pure/UI/runtime/browser/DB/source Worker/HTTP実行は0。旧ui0d/ui67/tool両失敗rootその他private根の操作は0。

差分はrunner UI名literal2箇所・tool名1箇所・boot比較name1箇所・runner bootSHA従属1箇所だけ。逆置換全文hashはboot `2c639d6b94fae4ca5b99b34cf61ac61fd7ac2885b48b77fcbd7228b1adbc87f4`、runner `1db585dfc0c7bd657095f3a1e7964ebb1f4138eb3e58487570255afb57925ed4`、launcher `9852ff2a72c3fe12712d47d34a16628ff7032c79a56299df513e6f62c27a518b` に一致した。比較は既公開bytesのメモリ内逆置換のみ。

| 公開candidate | bytes | SHA256 |
| --- | ---: | --- |
| boot.mts | 38376 | dd42a274c2818e2752ec595303deba4416440699a76705ca270104d0b1e20c44 |
| p5c-ui-runner.py | 35508 | 31ecd2cc0af7bc5024b37b6de87bcf804d980fb909e5c99e58fae8260a507965 |
| runner launcher literal | 10283 | ca40e3962206cb6d770c7736848228eafd8423650525d5845a3f81b8993fd88c |

既4helperは全文hash不変を直接確認: provider937fbbee / browsera4b2192d / pure4bb7af52 / stop4b419fa5。全5helper/runnerはregular600/nonlink/nlink1。origin43173・C c2・成功B3488/sourceManifestde7c・release93d264・全caps・同Node private gate・30秒pure24→720秒UI・normal stop120秒内・tail30秒・24条件・classifier・actual closure・private proof/ACK/audit・unknown DB拒否は無変更。

Python AST parse/compileはactual成功、self-import/cache0。pinned Node24.15.0 `--check` のstdinへlauncher literalを渡しactual exit0/出力0/import0。既型checkの受入は無変更範囲の借用で再演0。boot literalの型形は変わらず、製品・仕様・管理台帳・S4/P5d source・goal/spec/spec-implementへの編集0。

本報告を最後に全writerを停止しManagerへ所有権を返す。独立binding deltaレビュー待ちで、実runの許可として扱わない。以下は直前classifier候補の履歴。

# UI regular-file DB分類の最小修正候補

固定時刻: 2026-10-05T23:09:35.062011+00:00

公開classifier・従属pure条件・runner bindingだけを変更した。独立deltaレビュー待ちで、pure24・App/UI・Chrome・DB・HTTP・監査の新実行は0。前回の `UI_UNKNOWN_DATABASE` が実際にChrome profileで生じたという根拠はなく、原因領域未観測を保持する。失敗rootを再読・hash・import・接続・再利用していない。

## 分類と資源境界

`classifyRegularDatabase(root, filename, ownedProfile)` はpath文字列だけを扱い、I/O・ambient time・process・SQLを使わない。絶対正規pathとroot descendant境界を満たさない入力はunknownを返す。root直下のexact `active.db` / `opaque.db` / `audit.db` と各 `-wal` / `-shm` / `-journal` はname付きapp-database、現在のownedProfileの正規descendantはowned-chrome-profile、その他のDB/SQLite suffixはunknown-database、その他regularはotherとなる。prefix一致やnormalize前のescapeを許可に使わない。

呼出は既guardのSingleton/control検査、directory realpath/UID/identity、regular lstat/no-follow・UID・mode600/既profile644・nlink1通過後だけ。profile入力は既supervisor内部の現在のChrome登録値であり、外部pathや新例外表ではない。root3DBが先に分類されるため、app3logicalDBの各16MiB/合計48MiBを保つ。Chrome側は既chromeBytes128MiBと全root256MiB/20,000entriesへ計数し、app DB合算・監査コピーへ混ぜない。Chrome TMP・objects・node-tmp・root unknown DBの拒否は維持する。mode/UID/link/special-file/cap/stop/actualClosed/private proof/ACK/auditを緩める差分は0。safe fault領域enum・CASE_MARKERS追加も0。

## 追加純条件

既bridge21条件の全文は不変。以下3条件を追加し、最大24/30秒と同Node private gateを維持する。runner側はpureCountのexact期待値2箇所だけ21から24にした。未実行なので24 PASSとは扱わない。

| 条件 | 固定入力と期待 |
| --- | --- |
| database_exact_app_and_unknown_outside_profile | exact3DB×4suffixの12個を各name付きapp DBとして分類。root未知DB、active.sqlite、node-tmp/objects/Chrome TMPのapp名DBはunknown |
| database_owned_profile_requires_exact_boundary | owned profile内のdb/sqlite/sqlite3×4suffixの12個はChrome、同pathで所有登録nullはunknown、profile-other prefixはunknown |
| database_escape_and_prefix_spoof_rejected | root prefix spoof・../escape・profile escape・relative pathを拒否。profile自身のroot prefix spoof/非正規/relative入力でChrome許可0。通常objects/document.txtはother |

条件はpath分類と所有境界の正負対であり、既bridgeの形を反復しない。2helperの関数signature以外に製品shared contractを変更しない。boot/provider/browser・製品C c2a3d45f・成功B3488・source/release manifestは無変更。

## 固定候補

全5helperとrunnerは直接全文read/hash、regular/nonlink/nlink1/0600を確認した。既公開受入前候補のrunner35,508B/SHA9a379bdd、boot38,376B/SHA2c639d6bを起点にした。変更前はpure6,069B/SHAecd265c6、stop41,212B/SHA3cb4b5b5。

| 公開path | bytes | SHA256 |
| --- | ---: | --- |
| helpers/p5c-ui/boot.mts | 38376 | 2c639d6b94fae4ca5b99b34cf61ac61fd7ac2885b48b77fcbd7228b1adbc87f4 |
| helpers/p5c-ui/provider.mts | 11902 | 937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0 |
| helpers/p5c-ui/browser.mts | 18761 | a4b2192dc6bef805352628197553527d5343a8df9676e903d207e75e3e249de8 |
| helpers/p5c-ui/contract-pure.mts | 7805 | 4bb7af527346461c63caf6067aaa8c9c69578c7b553792253bc1f5d702267666 |
| helpers/p5c-ui/stop-audit.mts | 42441 | 4b419fa5e45c40e0c96845ba80aa9c8ff0f9dbbf441c59f4292be310a14b4ac4 |
| helpers/p5c-ui-runner.py | 35508 | 1db585dfc0c7bd657095f3a1e7964ebb1f4138eb3e58487570255afb57925ed4 |

Runner launcher literalは10,283B/SHA256 `9852ff2a72c3fe12712d47d34a16628ff7032c79a56299df513e6f62c27a518b`。runner差分4置換は2helper SHA各1とpureCount期待値各1だけ。root literal、stage、loader、control、env、deadline、resources、Chrome ownership、2PIPE/FD/PG、normal/forced/unproven判定は不変。

逆差分をメモリ内で比較した。stopの追加classifierを除去しguard3行を復元した全文SHAは `3cb4b5b5a3b7ec6d20b08588a14abda2c79772044d1348a25559622cc117d638`、pureのimport1と追加3条件を除去した全文SHAは `ecd265c621895c6bdc188701dbda3c214717db6686d755e0122e50580f14a617`、runner4置換の逆置換全文SHAは `9a379bddf668be3fcb982b7137111c1e4d2f69386adb45de2386f2410bd32706` に一致。前private helperの読取や保存copyによる比較ではない。

## 静的checkと停止

exact5helperに既許可strict noEmitコマンドを実施しactual exit0/出力0。`node node_modules/@typescript/native-preview/bin/tsgo.js --ignoreConfig --noEmit --module preserve --moduleResolution bundler --target es2023 --allowImportingTsExtensions --skipLibCheck --strict --esModuleInterop --types node` に5pathを列挙した。Python AST parse/compileはself-import/cache生成0。公開pinned Node24.15.0の `--check` にlauncher literalをstdinとして渡しactual exit0/出力0、launcher実行/importは0。

変更writerは本担当のみ、報告保存を最後に対象writerを停止しManagerへ所有権を返す。実一巡の新root採用・実行は別Manager判断とする。
