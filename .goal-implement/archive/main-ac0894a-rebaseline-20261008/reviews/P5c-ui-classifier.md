## PUBLIC-ONLY parser admission寿命の独立照合

2026-10-06T02:06:21.305196+00:00。static gap確認 PASS（現documentExtractor寿命契約はFAIL）、UI-R03-L1を差戻し候補としてManagerへ返す。Node exit-6の原因は未特定、UI成功/実Worker超過/native故障を断定しない。

直接固定: public phase111207B/SHA `17f8b5a1ab94f5bc8eba1fc17954f887dd6170e4042278b2a83aac78060cfc98` を600regular/nonlink/nlink1/canonical/hash照合。Cc2元sourceのdocumentExtractor6666B/3664979c284e7780009e36a990f460244f3c135ee7880ef54702a90f92f23669、parserWorker26374B/911632fb456c27d5c0ef77cd1ea3eb3b5cb8bfa6be034e291ad7e3944f725bf2、isolatedProjection4209B/45ab05b2e24bd1c1d1f60fee03eb6e804ae032f892eddfdf7390d0a13f70e832、既test18182B/0e7f6412abec0d1f8b4737178629618acd2be1c232b42b9382f59d3a6eb17601を直接全文hash/source照合。source→B3488同候補22module一致/compiled entry bindingは主報告借用、自己B本文再scan0。

UI-R03-L1因果: detect/extractがwithParserAdmissionでslotを所有→real Worker message→runInWorker finishがsettled=true/timeout解除→void terminate→resolve(value)/reject(error)を即発行→withParserAdmission finallyが次waitingをresume又はactiveWorkersを減らす→旧Worker actual exit前に次Worker/projectionを作れる。旧Workerの遅いerror/exitは同settled guardで無視され、無消費terminate Promiseも終了証拠にならない。従って二slotはoperation Promise数を制限しても実生存Worker数の二上限を保証しない。成功messageからnative終了までadmission所有が抜ける静的経路は確定、実三Worker超過/ABI/Buffer破損は未観測。

一次 [Node v24.15.0 worker.js](https://raw.githubusercontent.com/nodejs/node/v24.15.0/lib/internal/worker.js) L344–360/400–444はpendingmessage drain→dispose→必要error→exit、live terminateは実exitまでPromiseを待つ。既dispose後のterminateは即fulfilledになり得るので、Promise fulfillmentやterminate要求単独で新exit receiptを合成しない。exit時点のWorker JS停止、Readable EOF/close/drain等cleanupとstdio監査は根拠を分ける。対照isolatedProjection:72はmessageを暫定resultへ保存し、errorはfailureへ置き、100のexit（code0/abortなし/valid result）で初めてsettle/admission releaseする。projection全寿命の受入を今回再演したわけではない。

最小修正候補exact集合: `packages/core/src/adapters/node/import/documentExtractor.ts`、`packages/core/src/adapters/node/import/__tests__/documentExtractor.test.ts` の二path。Worker result-ready/failure/termination-request/actualexitを閉じたadapter状態で分け、listenerをmessage/terminate前に登録、元Promiseを消費し、actualexitと所有stream cleanup完了後だけcaller settle→slot解放とする。valid message＋自adapter正常terminate由来のexit0/1＋late errorなしだけ成功、一般exit1や監督killを成功にしない。message後error/異常exit、invalid response、exit-before-result、timeout、constructor失敗を各元FailureCodeへ維持し、元result/Format/Extraction検証・50MiB/30秒/二slot/waiting8を変更しない。termination未証明を普通のreject→generic finally releaseへ流さず、held ownership/有限stopへ残す具体状態を実装候補gateにする。欠測をコード値や期限からclosedへ補完0。

共有型/影響: application DocumentExtractor.extract Promise<Extraction>、ImportFormat、detectFormat署名、generic withParserAdmission(work,signal)は変更不要の方向。application/domainへWorker/Node optionsを漏らさない。withParserAdmissionはprojection/media/icon/inline画像も共有するため、generic release/取消queueを弱めずdocument runInWorkerのsettle寿命を修正するのが最小。元server.node正常DI・acceptUpload/processJobが同結果を消費する通常取込へ接続する。新C/B/static bindingを先に固定し、旧BやUIhelper literalだけの差替えで製品修正を代行しない。

既test424（UTF/text/Markdown結果）、453（deadline応答性＋後続reuse）、475（十二並列→十fulfilled/二RESOURCE_LIMIT＋reuse）はoutput/件数の条件でありmessage→exit間slot保有を証明していない。期待output/数を維持し、必要な新有限根拠はmessage後exit前に次slotを譲らない・late errorを成功にしない・actualexit/cleanup後のみreuse・timeoutもterminate Promiseを未処理で残さない順序。制御対を使う場合も実Worker closureの正例へ代用せず、既real text Worker経路で区分する。音声/未変更全suite再演の要求0。

影響ID候補はR03/IM-01–02の通常取込・parser資源隔離（P2a-B/C/Dの取込/上限根拠）とbriefの実終了規則。P2a-FのDB lease/結果冪等性やP5c S2/S3の別prepared/native proof完成をこの欠陥だけで一括無効にしない。R08/S4入力寿命の実終了原則は保持し、ここは別documentExtractor共有admission枝の最小補正として扱う。全体done状態の編集/受入変更はRootのみ。

第九safe actual pure24/upload1-start/Node-6/NodeChrome PG absent/両EOF-FDclose/ChromeTERM sent-successは主借用。fault通知なし/未finished/inner closure・audit欠測を正常に補完0。upload1-start内のどのsubstepでabortしたか、parser起動/lateerror/次slotの実因果は欠測で、今回static UI-R03-L1をabortcauseへ接続しない。report固定後UI対象全read/write停止。

## 第九fault四field診断＋fresh binding独立preflight

2026-10-06T01:51:17.011138+00:00。診断・binding限定static PASS、起動blockerなし。同有限scopeの一巡をManager判断へ返す。新pair不存在は実起動前fresh gateに残す。新ui-bf74ae20/tool-bf74ae20のstat/probe/生成・pure/UI/Chrome/DB/runtime0、第八heldを含む旧private全非操作。UI機能受入・実cause特定・private proof/ACKへの昇格0。

直接固定: boot44639B/SHA `232d243ec02f890922d35dfd2fd9d28119e7308e48d3d1b0e1acac21d1c2114c`、runner42352B/`cdfbf3b1c2ff812416d898257b464f3dc2b490a30bc21e51865be4aeb99f7c0d`、phase96819B/`19339605a47c6537a5b55208669c4c44c2d2a4d260c06d45fc8392407587a356`を全文hash・canonical/600regular/nonlink/nlink1/自己UIDで照合。launcher AST literal13363B/`f045f2611ba11896fd99e395700204530fdc095bb5b577bae586a502ddee22b0`一致。残4helper全文hash不変。メモリ内新root逆置換でboot012df727/runnerf2fb4d4b/launcher2e90d3ca全文SHAへ直接一致。六診断block逆差分で第八runner3febdeae/launcher7fc27703へ一致した主報告とstrict/syntax checksは借用、自己旧helper実物比較0。

recordFaultはProxy errorを入口拒否し、own data descriptorだけからname/code/kind/guardを読む。標準error名の補助はexact builtin prototype Map、message markerはutil.types.isNativeError＋own data messageの既固定whitelist限定。arbitrary message/cause/constructor/stackの射影、getter/toSerializedの呼出はない。toSerialized own又は非Proxy直近prototypeのdata functionはMETHOD_ONLY、未知・accessor・ProxyはUNKNOWNを保持する。guardも非Proxy/plain/frozen/exact三data field・有限location/type/boolのみ。診断名・kind・NativeError分類はbrand/provenanceを証明しない。

outerはfault exact四keys/全str/各enumを再検査し、旧fault typeを保ったerrorInfo三fieldだけ追加。未知shapeは拒否し、fault通知は既INNER_FAULTへ残る。正常判定はpure24、done/finished、mirror/Chrome登録、Node exit0、各ownPG absent、両PIPE EOF-FD、error/forceなし、control FD closeに依存し、診断を成功条件へ使わない。inner actualClosed/auditClosed/private closure gateも不変。Cc2/B3488・Chrome98/Node24.15・各capacity/期限/9操作stage/4signal slot/3prefixは既受入staticの不変更範囲を継承する。

最大fault frameを固定enum最長値で自己計算しnewline込み372B、topkeys7、43×512=22016B≤64frames/32KiBを直接確認。summary6805B見積もりは主報告借用、自己はruntime8192B gateと有限16fault/32stage・raw本文なしを直接確認。Python ASTは自己構文照合、launcher評価/target実行0。第八のUNCAUGHT_EXCEPTION実name/code/kind・inner closure/U0–U7/BFcache/audit欠測は補完しない。UI対象read/writeをここで停止。

## 第八fresh binding・余分Chrome nlink gate撤去の独立preflight

2026-10-06T01:17:46.124464+00:00。限定static PASS、追加blockerなし。boot44639B/SHA `012df7277f43fbb7ee6a02265f724e381d99ee95235a8695e10ab801f92e183d`、runner39497B/`3febdeae639fa9094462785cd9df57a38f2f66c2d7bef2eb7893681f18734619`、phase75174B/`9b3302cda25e4d322ff68b6f493a549daec92ad2a3dd01114cc3025f96ba2771`を直接全文hash/600regular/nonlink/nlink1照合。launcher AST literal11566B/`7fc27703a8b09bfa3ba944dd3ea7b0864d2c58a0c9ab8ea7ad93fcd1564ba3ba`直接一致、残4helper全文hash不変。

新a38cd649はboot rootname1、runner UI2/tool1と従属BOOT_SHAのみ。第七938dfa70/boot5f392へmemory逆置換してboot5f392438/runneredf26f35全文へ直接一致。C c2/B3488・純24/9通知/stage20/43frame・22016B/controlFD、signal4slot/3prefix/容量期限/actor/privatebrand/normalPGEOF/実close/proof/ACK/auditの既static PASSを不変更継承、全面再review0。

公開phaseのfresh script exactdiffはmain/frameworkのtuple nlink列とbinary st_nlink比較だけを除く。browser.mts正式binary guardはregular・mode775・固定size・canonicalを要求し、binary nlink値の要求を持たないため、余分gateの撤去は正式gate同等。Node555/nlink2/64896912/canonical、helper600/nlink1、Info.plist664/nlink1/size/fullSHA/FD前後identity、Current exact98link/canonical/before-after、launch後CDP98・binary前後identityは維持する。binary本体hash/CLI/署名verifyや未知版許可を追加しない。公開metadataの今回再probe/巨大Chrome本文読取0。

第七precheckで正式4binaryfield一致/mainnlinkだけextra条件不一致、runner/新root起動0は主報告借用。第六native -6/旧失敗原因とは別で、UI成功や正常proofへ転用しない。第八same finite one-runをManager採用可能、新ROOT/toolTMP不存在は実起動前fresh gateの未観測条件。新pair probe/stat/生成・pure/UI/Chrome/DB/runtime0、第七予約を含む旧private全非操作。各UI条件の欠測は保持。report固定後全read/write停止。

## 第七UI診断＋fresh binding独立preflight

2026-10-06T01:07:09.801355+00:00。今回診断/binding限定static PASS、追加blockerなし。Managerが同有限scopeの一巡を採用できる候補であり、新pair不存在/実動作は起動前gateで確認する。新ui-938dfa70/tool-938dfa70 stat/probe/生成・pure/UI/Chrome/DB/runtime0、旧failed6pair全非操作。

直接固定: boot44639B/SHA `5f39243874af3be16aaac5ce5b6834181704f70e64e04549d98b7b32a18af1a2`、runner39497B/`edf26f35312f04b8c7db8d5fdfcb5c8ea05923ffe697db5e04c726fa26b8821b`、phase66559B/`444eb5eb80a273eabac6896b6e1850995403570568ff5f99ae17a9fc6a03355a`を全文hash/600regular/nonlink/nlink1照合。AST literalからlauncher11566B/`f638112db5aaab84f4a1aec2f2e552cdd060e27cf02a26ffb9ab08d68712f646`を直接照合。残provider937fbbee/browserc26ff175/pure6493e5f1/stop157f0c4e全文hashと600/nlink1不変を確認。

memory新pair→12c逆置換でboot cdae18df/runner eb3a36ca全文へ直接一致。bootのnotify型/引数/9通知を逆適用すると元44203B/cdac7101全文へ直接一致。runner診断前76618bへの完全逆適用結果は主固定報告借用として区別し、今回は追加signal/matcher/stage/公開fieldと正常停止接続を直接読む。旧helper/private preimage探索0。syntax/strict成功、summary最悪5002B算出は主報告借用、自己Node/型/tool評価0。

stage PASS: UiOperationStageはui-readyとsignup/signin/upload1/upload2各start/doneの9固定literal。ui-readyはrunUi返却後cleanup try内、signup/signinは正規RPC前/返却後、upload doneはPOST検査/sealUpload返却後。callback例外も元stop経路へ流す。last-stageは地点到達のみでnative実操作/abort原因・受入・閉鎖を証明しない。outer STAGESは11+9=20、通知最大43frame≤64、各512Bで22016≤32768。control byte/frame gate不変。

signal PASS: own Node/Chrome×TERM/KILLの4slot、attemptedと5固定outcomeのみ。alive確認後のos.killpg呼出時だけattempted=true、sent-successはsyscall返却事実のみ。ESRCH前/競合をattemptedで区別、EPERM/その他はunknown、absent skipはnot-attempted。登録ownPGだけ、元tail Chrome0/10・Node10/20、forced分類とactualexit/PGabsence/EOF-FDの独立性を維持。signal送信要求をactual close/privateproofに代用しない。

fatal matcher PASS: stderr既12MiB共有drain内で3固定prefixだけを走査、crosschunk状態はinteger進捗3＋bool3のみ。各prefixの先頭byteが残りliteralにないため不一致時先頭byteへの戻りは同literal重複候補を落とさない。公開出力は固定enumのみ、rawmessage/SQL/stack/path/suffix保存追加0。prefix存在をnative起源/原因/回復証明へ転用0、未知は空配列。runtime summary8192B gateとnormal gate(done/finished/pure/ownershipMirror/Chrome frame/Node0/両PG不在/両EOF-FD/error0/force0/controlFDclose)不変。

C c2/B3488、Node24.15 canonical/Chrome98 metadata・CDP、pure24/期限/資源/caps、history正規factory/actor/privatebrand/closureproof/ACK/auditは既固定根拠を継承。第六Node-6・U0–U7/inneraudit/正常ACK等の欠測は補完しない。診断PASSは全P5c UI受入ではない。report固定後全操作停止。

## UI-RPC2最小補正版 独立再preflight PASS

2026-10-06T00:44:43.885558+00:00。限定delta PASS、追加起動blockerなし。boot44203B/SHA `cdac7101d57d3a1666aa24e82e9749288503369ea0a06a58ace02c98aacd47d5`、runner37707B/`76618b0387265a449c72915e1cd4a9737142b7e0ba59e5cb493d812f60f7f6d3`、phase47164B/`5cbca9ce634d4816ceb8c58eb150f0a2214c4650b9db054fffed1087ff57c512`を直接fullhash/600regular/nonlink/nlink1照合。launcher11555B/269bc83bと残4helper全hashは直接不変。

builder/configuredの2境界がexact typeof functionとなり、固定compiled Z/createServerFn・middlewareの正常callable shapeを受理する。unknown型のままmiddleware/handlerのfunction検査、Reflect.applyで元this保持、正式ClientRpc(exactID)/fn()を維持。object fallback/cast/manualHTTP/raw envelope/認可・privatebrand変換0。2guardを戻すmemory逆置換はboot44234B/a14ea11aへ、BOOTSHA従属1を戻すとrunner41026e4aへ全文一致。

UI-RPC1の固定3asset/hash・唯一RSC name/id・GET一middlewareのdiscard AST・import/export辺・必須14名と13通常callは前直接確認を継承する。今回の正規factory選択は静的に成立し、RPC1/2既知不足を解消。C/B/通常DI/private class/actor fence/pure24・全cap/Node24.15/Chrome98/PG/EOF/FD/closure/proof/ACK/audit/normal条件と新ui-12c7ae40/tool-12c7ae40束縛は不変。担当strict型成功は借用、自己型/runtime再演0。

実compiled factory/RPC/UI/U0–7/inner closure/ACK/audit成功はまだ未観測。新root probe/生成/DB/browser/process/run0、failed五pair全非操作、製品変更0。PASSは有限起動前契約の判断で、実一巡採用はManagerに返す。S4第二PAレビューも固定済み。全操作停止。

## UI-RPC1第六候補 独立preflight: UI-RPC2差戻し

2026-10-06T00:42:01.559701+00:00。実UI起動不可、未実行。boot44234B/SHA a14ea11a8a09ea89c1b30731c96a72630b43021fd5ca3b1fd573b97e4763b44a、runner37707B/41026e4a97901adeb042abca065cd842965c1bc6d87e73e1e842bd09f900a2a8、launcher11555B/269bc83b0fc5ba36698c190f94bc391fe9845886af1276bc219d72875f323147、phase44253B/9e258d3a142430bd9afa13ea8e7887b08a07b71cee0076fdefd52ac34284ad0aを直接fullhash/600regular/nonlink/nlink1照合。

**UI-RPC2重大**（R01/R08、P5c同bundle正常UI・元UI-RPC1補正条件）: callRpc history枝がcreate({method:GET})結果builderと.middleware結果configuredをtypeof objectへ限定する。しかし固定compiled dependencyのZ(createServerFn)は `Object.assign(e=>Z(...), {options,middleware,handler...})` のcallable functionを返し、middlewareも同Zでfunctionを返す。AST認識は成功しても、U2の最初のhistory readで正常builderをRPC_FUNCTION拒否する。configuredにも同じ欠陥があり最終history/auditへ進めない。静的確定因果であり実第六失敗の観測ではない。最小修正は両正常callable builderを認める境界（exact typeof function、又は非null object-or-functionの正規method structural検査）。withMiddleware/handlerのfunction判定とReflect.applyのthis保持、fn()、middleware object/正式namespace/exactID束縛を維持し、cast/未知fallback/manualHTTP/認可・brand緩和を追加しない。

pass部分: fixed3assetのmanifestbytes/SHA/600/nlink1/canonical/fullhashを直接照合。唯一RSC history name/id、唯一discarded ExpressionStatement、GET/一middleware/handler/exactClientRpc、依存import i/r/a→r/i/tとdependency Z/ke/Reのexportを読む。names countは正規regexで当該RSCfileだけ1、historyId occurrenceはclient1。元named13結果を確定後に限定history枝を生成し、必須14も維持。正常transport/serializer/actorcontext/privatebrandはcompiled正式factory経路で保つ方向に整合、実合格はまだない。

メモリ逆差分でboot38376B/e3d35c8c、runner37707B/f7c391b9、launcher11555B/9e5f7d53へ直接全文SHA一致。既4helper hashも直接不変。C/B正常DI・built class/privateproof/ACK・pure24/全caps/Node24.15/Chrome98/PG/EOF/FD/停止/監査にscope外差分0。担当strict型/構文成功は借用であり正常runtime型判定を証明しない。新ui-12c7ae40/tool-12c7ae40は予約のみ、新root存在probe/生成/型再演/runtime/UI/DB/Chrome0、failed五pair全非操作、製品変更0。修正fixed候補の比例preflightまで起動しない。report固定後このUI対象read停止。

## 第五UI失敗のpublic-only原因照合

2026-10-06T00:27:02.039085+00:00。UI実完了は未成立。phase38209B/SHA `b8dc2f93951c526005a61834cfa2685c9859331f66b6e9aea3a9f00caaa5e32f`、boot38376B/e3d35c8c・runner37707B/f7c391b9を直接hash確認。主safe結果の借用: pure24 aggregate PASS、UIwork CAUGHT/RPC_REQUIRED_BINDING/guardnull、Nodeexit1/NodeChromePG absent/2PIPE EOF+FDclose/controlFDclosed/force0/deadline無し。binding実名称/画面/inner closure/privateproof/ACK/audit/U0–U7/BFCacheは欠測。第五pair含む全failedroot/results/private資材read/hash/import/copy0、新run/root/process/DB/browser/probe0。

### UI-RPC1: 必須history client namedexportがない

起動blockerの静的原因を確定。throwはboot.mts clientBindingsの14必須名照合一箇所だけ（91行）。RSC metadataのname/idをnamesへ収集し、client VariableDeclarationのid/methodをNamedExportsへjoinする。固定B3488の14全name/idはRSCとclientに存在するが、13だけが変数＋namedexportを持つ。唯一 driveBackupHistoryFn は `client/assets/ImportJobs-D10_FM5n.js` で変数もexportも持たない捨て式へtree-shakeされている。そのため現clientBindingsのresultへ入らず、最後の必須名で必ずRPC_REQUIRED_BINDINGとなる。public sourceのDriveBackupHistory componentは通常activity/detail APIを使っており、古いhistory serverFnをclientで参照しない。

因果は built boot→app listener→browser作成→clientBindings→必須history欠落→runUi catch、exerciseUiのsignup/通常upload/U0–7前。公表summaryのunknown名称を実観測へ補完せず、固定source/Bの静的必要欠落として区分する。出所はR01/R08、P5c-1 A/E/FおよびP5c-2 A/E/I/Jの同bundle通常UI/DTO接続条件。製品の認可/実provider/DB障害をこのmarkerから断定しない。

直接成果根拠: ImportJobs62362B/SHA `d7107ef2cb610ee185c47cdd1466886dec5240c1a933d7c7b8f0a1c60172d338`、RSC driveBackupServerFn12534B/SHA `260f29d21a280bcb1b611c990e21350a40e4b0e216bbb0bf48d45caa6ef434ec`。history式は normal createServerFn GET→errorResponse middleware→createClientRpc(exact RSC history id) のexpression statement。activity/detailは同chunkで通常namedexports y/bを持つ。型/parser/runtime再演0。

### 最小補正の提案（未採用・未実装）

製品変更なしを第一案とする。当該一つのdiscarded expressionだけを、fixed manifest/hash・唯一RSC name/id・GET・正式createServerFn/clientRpc/middlewareのimport辺・AST exact式へ厳密束縛する。ImportJobsのimport i/r/aは `/assets/errorResponseMiddleware-CyKFLMJi.js` の公開 r/i/tへ対応する。同dependencyでiは正式createClientRpc（/_serverFn/＋Ce serializer・serverFnMeta/brand）、rはcreateServerFn、tは既middleware。browserの同compiled namespaceから現式と同じ `.handler(createClientRpc(exactId))` 関数を作り実fnを呼ぶ限定候補なら、正規serverFn transportを保てる。一般fallback/unknownID・manualHTTP・raw envelope・method/schemaの緩和0。現在の13 namedexport枝は維持し、欠落名を外して成功にしない。exact歴史式以外を認める一般resolverへ広げない。実固定候補のAST/import/factoryと型preflightをRootが別scopeで採用するまで起動しない。

normal DIは既公開sourceと同C成果で整合: boot driveFactory/mailer注入→createHollowContainer/DriveServices→app.fetchのALS request container→framework entry.fetch→hollowContextのgetContainer/cookie/currentactor。compiled server.node entry SHA5ecc231dとALS/container-store Symbol markerを直接確認し、関係4sourceはmainとB source bytes同値。RPC1はこの経路をまだ呼んでいないのでDI実動作成功にはしない。同graph built BackupSource/storage/private error brand、execution bridge/閉鎖/ACKの既static条件を維持し、WeakMap fakebinding/Unproven ordinary化0。正常factoryを使った限定復元が証明できない場合だけ、既history APIのtyped public client namedexport用exact source scope→新C/Bを先固定する代案へ返す。現製品修正は要求・実行していない。

pure24を機能受入に代用せず、全UI直接結果と内監査/closureは欠測維持。追加artifact全面scan/旧failed再読/新test/runtime/source編集0。S4/P5d writer中source0。report固定後全操作停止。

## Node canonical・新ui-f901 binding独立preflight

2026-10-06T00:17:32.117428+00:00。限定static preflight PASS。phase34644B/SHA a6e8b181352cdc15b91f792405c92a8e625a0debae2ed432420378055c3e9e8c、boot38376B/e3d35c8ca68996e3aa69243d8a132e9669f44656ecb1f6147325e786fe46d996、runner37707B/f7c391b9449ced99739efa297917b1d5e323beb43c6badd965930d445cb38815、launcher11555B/9e5f7d534c28435358b8ae1cb8e2340c7e6d3038e6a49b4355ea4d039b00b0fbを直接全文hash照合。file600/regular/nonlink/nlink1。

メモリ内root逆置換で前boot a3694e00/runner75e12156/launcherf585ac22へ一致。Node literal・Python metadata gate・launcher初期gate・安全marker2だけを逆差分にすると既確認runner36876B/1ae50ba25dec73a4920b583a102c93cd72a96de2a8bf9a14ef6ce0e1cd3d42af、launcher11167B/1dbb86223aaae58a469df4dcc3b3a4184a31ae0e510ceb185354c0bb0c4c82deへ全文一致。既4helper hashも直接不変。

公開canonical4366slim24.15のlstatはregular64896912B/mode555/nlink2、resolve同値。Python public_bindingはSCRATCH生成・Node起動前、launcher actual execPath/canonical/24.15.0 gateはnative hooks/boot/app/DB/Chrome前。取得不能/異版は安全固定enumで拒否する。spawn observer登録済のfinally restoreを維持。元24.15 runtime版の維持であり実version成功は未観測。

新ui-f901bd37/tool-f901bd37、origin43173のliteral束縛以外、Chrome98/Pure24・30秒/全capacity/UI720/stop120/tail30/PG三値/EOF/FD/private proof/ACK/正常判定に差分0。構文checks成功とC/B不変更は主記録の借用。新root生成/存在probe/純実行/UI/process/DB0、旧全failedpair読取hash0。PASSは起動前契約の判断でありU0–U7/inner audit/実closure受入ではなく、実行採用はManagerに返す。

# UI regular-file classifier — 独立deltaレビュー

## Chrome98公開metadata補正版 / 現在の限定判定

Chrome98 deltaは静的preflight **pass**。実行は未採用の新root literal bindingと公開Node exactcanonical採用gate待ち。全旧4failedpairs非操作、Chrome/Node/metadata helper起動・probe・newroot/DB/pure/UI0。今回読んだ公開helper/report以外のruntime資源への操作0。

phase28426B/SHA `c90896b550bfd632594010e37d9b8391f9905f4e9157c9b983fc891399ddd960`、browser21821B/SHA c26ff175…、stop45822B/SHA157f0c4e…、pure9212B/SHA6493e5f1…、runner36876B/SHA1ae50ba2…を直接全文hash/600regular/nonlink/nlink1確認。メモリ上の最小逆差分でbrowser18761B/a4b2192d…、stop3c399c1f…、pure13ef8190…、runner e951a00f…へ各全文SHA一致、launcher11167B/1dbb8622…は不変。pure24/caps/private proof/ACK/normal stop等への未申告差分はない。

直接source確認: profile mkdir/Chrome spawn前にCurrent exact98/readlink13B/canonical同版framework、両binary regular/canonical/旧size/mode775、Info2 exactbytes/SHA/664/nlink1/O_NOFOLLOW/前後inode-dev-UID-size-mode-mtimeを有限検査する。Info FDは同時最大1/逐次2で既ledgerへ登録しfinally actualcloseを待つ。Currentを末尾再確認する。追加process/thread/巨大binary読取hash0。署名のTeam/Identifier/CDHashは以前のcodesign表示根拠の借用で暗号署名verify成功を宣言しない。

actual Chrome spawnは既earlyown handleを保持した後、exact currentprofile RunningChromeVersion symlink target `154.0.8037.98:1` のみ許可し、CDP `Chrome/154.0.8037.98`一致を要求する。pureの同条件内で98:0/旧93:1を拒否し、全24条件/max24/30秒を維持。版0/任意版/一般symlinkを許可しない。metadataを実Chrome所有や第四失敗の原因確定へ代用しない。

公開Node readonly追加所見: runner固定 `/nix/store/3mvbmkd7lmxi3xlka1avra24flwbgjv9-nodejs-24.15.0/bin/node` は消失しておらずsymlink72Bで、canonicalは `/nix/store/4366l8b6kz1f2sxq6243rfs53grc73zz-nodejs-slim-24.15.0/bin/node`。一方 `/etc/profiles/per-user/hikaru/bin/node` はcanonical `/nix/store/a5sxfwnzi3kzxrgj3zfngcqamdhnr161-nodejs-24.18.0/bin/node`（regular68720016B/555）へ向く。runnerは旧aliasをspawn argvに使い、public Node exactcanonical metadata gateを持たない。literalをcanonicalとする保証は現状成立しないため、Rootが旧24.15 slimか新24.18のexactcanonical/version bindingを採用して起動前条件へ固定する必要がある。旧version availabilityとalias一致を混同せず、Node実版/起動成功は未観測。これはChrome補正の欠陥と別の起動gateであり、製品/C/BやU0–U7を変更する要求ではない。

P5d初回はpublic-node preflight拒否/exit1・root/DB/Nodefork0というsafe結果の借用。固定P5d helperが `NODE.resolve(strict=True)==NODE` を要求するため、同旧aliasのcanonical差はsource上拒否を説明できる。秘密DBや旧rootを読み取った原因解析ではなく、機能/DB受入成功でもない。

2026-10-06T00:07:43.798174+00:00。独立Verifier、report固定後全操作停止。

## 第四一巡の有限原因照合・公開Chrome版不整合

2026-10-05T23:50:40Z。第四一巡はunprovenのまま。phase22364B/SHA `ef7298ce71dcf9fb5103146be62267b504f281b3cfd8f3350da21b29655e0779` を直接確認。pure24 aggregate、owned-chrome-profile/symlink/knownMetadataName=trueのUI_ENTRY_TYPE、exit1/両PG absent/両PIPE EOFclose/controlFD close/forcefalseは主安全報告の借用。実path/target/個別predicateは欠測で、旧4pair全非操作。U0–U7/inner audit/actual private proof/ACKの直接合格を補完しない。

公開guardはcurrent chrome?.profileとlstat属性/readlinkを正規predicateへ渡しており、引数の取り違えはない。UID拒否は先行して別marker、knownMetadataNameはbasename一致に過ぎずprofile直下を証明しない。報告3値からmetadata predicate枝の拒否まで限定できるが、exact直下/nlink/target/size等のどれがfalseかは決められない。registerChromeはPG照合後にguardを呼び、browser.versionの93照合より先なので、版差がUI_ENTRY_TYPEとして先に露出する経路がある。

**現在の公開installed metadataは154.0.8037.98で、固定helperの93と不整合。** executableは既367696B/mode775のまま。app Info.plistのCFBundleShortVersionString/KSVersionは98、framework Versions/Currentのreadlinkはexact98/canonical同版directory、同framework Info.plistも98。これは現在の版確認で、第四実行時の版・実targetが98だったという証拠ではない。

有限直接metadata: app Info.plist18856B/SHA `89dd2f1a7b8a46a153603197c416dab4078d47d499785422ba5286d4f39b2e69`、framework Info.plist1075B/SHA `e18aa35402e19da4924b8db9502466c6997144f3e85b20cd433876629d826f46`。同版framework binaryはregular/517027008B/mode775、全文read/copy/hash0。codesign -d --verbose=4の表示はapp Identifier=com.google.Chrome/CDHash `b839acd3629c96da252d20dc69323e7e694fcf16`、framework Identifier=com.google.Chrome.framework/CDHash `6cd8c7aed9c0185c73bd4bcd01d8d0c8fd265420`、両TeamIdentifier=EQHXZ8M8AV/Developer ID Google LLC。表示を署名検証成功や実browser ownershipへ代用しない。公開appだけの有限lstat/readlink/plist読取/署名metadata表示で、Chrome自身のCLI/probe/profile/runtime0。

93と98の一次tag双方でGenerateForCurrentProcessはversion_infoとis_mojo_ipcz_enabled=trueを固定し、EncodeAsPathはversion＋`:1`。runtime feature選択で`:0`が正常になる枝はこの生成関数にない。98 AppShimも同関数からDIR_USER_DATA直下exact RunningChromeVersionへsymlinkを作る。[98 Config/Encode](https://raw.githubusercontent.com/chromium/chromium/154.0.8037.98/chrome/common/mac/app_mode_common.mm)、[98 AppShim](https://raw.githubusercontent.com/chromium/chromium/154.0.8037.98/chrome/browser/apps/app_shim/app_shim_listener.mm)、[93 Config/Encode](https://raw.githubusercontent.com/chromium/chromium/154.0.8037.93/chrome/common/mac/app_mode_common.mm)。従って版pinを新scopeで98へ更新するならexact targetは `154.0.8037.98:1`、15B。anyversion/`:0`/他symlink許可は提案しない。

### 次scopeへの最小判断案

起動前public metadata drift gateでexact app/Info.plist/Current/canonical framework/同版framework Info・binary/署名CDHashを採用pinに照合し、異版/不明ならChrome起動前に止める。必要な署名検証とmetadata工具の有限deadline/actualwait/出力capは実行scopeへ固定する。既binary size一致だけでは版driftを検出できない。次にactual spawn childをearly ownedへ登録、同pinの新profile native metadataだけを限定許可、CDP actualversionも同pinへ一致させる。所有/proof/閉鎖判定をmetadataへ置き換えない。修正後new manifest/delta preflightまで実一巡は採用しない。

まだ個別predicate原因が必要なら、exact profile直下/current registration/UID一致/nlink1/bytes一致のbooleanとtarget区分expected`:1`/sameversion`:0`/other/not-readだけをfinite safe射影へ加える案に限定する。raw path/target/UID/stat、旧root再読は禁止のまま。これは診断案であり許可predicateを緩和しない。

ManagerのCF全typecheck成功通知は借用として区分し、自己の生成型/root/output読取0。P5d/S4修正候補source読取0、追加agent/spec/spec-implement0。現fixed93 helpersは変更せず、報告固定後全操作停止。

## 新ui-b17/tool-b17 literal binding

2026-10-05T23:46:31Z。独立binding delta preflight PASS。phase18750B/SHA `29af6eee8b05851303505f5a6367b51740b89b60ae216aca0608ffec6d783d67`、boot38376B/`a3694e009d9145ff722492ef3ed6a5cc1da30b5a25abec8ac4ea1e6c0bee4fe5`、runner36876B/`e951a00f16a499c448deccc8cfa42b674ffb46c2cf4b736e2ce5462d6b9bb249`、launcher11167B/`1dbb86223aaae58a469df4dcc3b3a4184a31ae0e510ceb185354c0bb0c4c82de`を直接全文/hash確認。公開fileは600/regular/nonlink/nlink1。

boot比較name1、runner UI名2/tool名1/bootSHA従属1だけをメモリ内逆置換し、全文SHAが前bootdd42a274/runner7e56cfd8/launcher efee1baaへ一致した。残4helper stop3c399c1f/pure13ef8190/provider937fbbee/browsera4b2192dも直接全文hash不変。既同C/B根拠は不変更範囲の借用、成果再走査0。

新literalは `/Users/hikaru/.local/share/hollow-validation/ui-b17f402e` と同 `ui-tool-b17f402e`。origin43173、pure24/max24/30秒の同Node private gate、UI720/normalstop120内/tail30、限定正常metadata例外/finite診断/全caps/PG/EOF/FD/actual closure/private proof/ACK/normal判定に追加差分0。主構文check成功は借用。自己は新root存在probe/生成/純条件/UI/DB/Chrome/process操作0、旧failed全非操作、CF生成中root/output操作0。

実run採用はManager判断へ返す。新pure/残UI/U0–U7/inner auditの直接成功欠測を保持し、binding PASSを機能受入へ代用しない。報告固定後、全操作停止。

## RunningChromeVersion/安全診断の固定delta preflight

2026-10-05T23:44:05Z。独立静的preflight PASS。phase16491B/SHA `9a3f49a61c91761d5e0c9570ebaf263a36f116968a8ca52ae6db003701302e00`、stop45822B/`3c399c1fc341bf02dfb3215c2cedacbb86733224c410afb8dd9508ce30638670`、pure9158B/`13ef8190716dcb3cdb2cc5c2597bbc5752784dd1a3a3eb1dd860fe627020b6fb`、runner36876B/`7e56cfd866453e4e1801a137ba955b6f70899f152199e797fb4bc6c73b641097` を直接全文/hash/600/regular/nonlink/nlink1確認。launcher11167B/`efee1baac0929858ff635135de06393f7714722278428c74a44b213dc41d0efc`、既boot/provider/browserの全文hash不変も直接確認。

メモリ内逆差分で、新pure関数/metadata branch/entryFailと6entry fail置換、同pure条件内追加対、runner射影/shape/2helperSHAだけを戻した全文SHAはstop4b419fa5/pure4bb7af52/runner31ecd2cc/launcher ca40e396と一致。旧private比較0。元DB分類/Singleton/容量/型native hooks/child/Worker/actual closure/private proof/ACK/正常判定の未申告差分0。primaryのstrict noEmit/Python/Node構文check成功は借用、自己実行0。

リンク許可はcurrent登録Chrome、canonical own profile内の直下exact名、symlink/同UID/nlink1、no-follow readlink exact `154.0.8037.93:1`、stat.size=15/32B以内を要求。regular/directory/別位置/別target/所有欠測を拒否し、targetを追跡しない。許可リンクは既files/global256MiB/Chrome128MiBへ15Bを計上、app3DB各16MiB/48MiBは不変。Chrome終了proofやPID所有をmetadataから発行しない。

診断はentry拒否Errorへfrozen primitive3fieldを付け、launcherはown data descriptor/plain/frozen/有限enum/booleanからだけguardを射影。外側はexact keys/type/enumを再検査し、その他はnullとして欠測保持。raw path/target/stat/message/stack/SQL/credentialを送らない。faultのみ7keysへ拡張、frame512B/64件/32KiB・fault16件・summary8192B上限不変。純条件のdone名/24件/max24/30秒/private gateは不変で、同既条件へ正負対を加えただけ。24条件実行/実UIは新候補では未実施。

追加観察: 既periodic guard catchはUI_GUARD_FAILEDへ翻訳するため、その経路の元entry文脈は欠測になり得る。今回診断を全経路観測保証へ扱わず、nullを成功やfalse観測へ補完しない。未知の実対象を推測して追加例外や追試を要求しない。

起動前gateは別新root bindingの採用・独立delta確認。現在literalが参照する旧ui5b/tool5bは失敗保全資材で全非操作、再利用不可。今回のpreflight PASSは実行許可・P5c1/2/U0–U7/inner audit合格ではない。3失敗pairの実entry/cause欠測を維持。自己のroot/pure/UI/DB/browser/runtime/process/旧資材操作0、製品/P5d writer source編集/読取0。全操作停止してManager判断へ返す。

## 第三一巡 safe結果・entry type静的照合

2026-10-05T23:21:19Z。**第三一巡はunproven。pure24 aggregateは主実観測の借用、残UI/inner audit受入は未成立。`UI_ENTRY_TYPE`の唯一throwと通常Chrome metadata symlinkとの静的不整合は確定、今回実entryのtype/領域/pathは欠測のまま。** [主安全結果](../phases/P5c-ui-classifier.md)11,360B/SHA256 `922d5920a873a2411e381bb0163514d8120426382b27b4b2782a2f92b8ad87dd`、regular600/nlink1を直接確認した。

借用結果はpurePassed24/uiRootCreated=true/uiCompleted=false、ui-work/CAUGHT/UI_ENTRY_TYPE、Node exit1、Node/Chrome PG absent、両PIPE各EOF/closeとcontrol regularFD close=true、force=false/deadline null、finished=true/inner success=false、18frames/321bytes。自己の直接根拠は公開code/metadata照合だけで、実rootの再確認ではない。P5c1 A–F/P5c2 A/E/I/J・U0–U7/BFCache/inner正常closure/private proof/ACK/auditは各直接成功欠測を保持する。pure24と外PG/PIPE/FD終了で補完しない。

### 唯一throwと有限branch

stop4b419fa5のperformGuard（204行）は、lstat UID一致、既special集合外、directoryでない、regular fileでもないentryでのみ`UI_ENTRY_TYPE`をthrowする。有限type候補はsymlink/socket/FIFO/character device/block device/other。既SingletonLock/Socket/Cookieと対応native socket/cookieは別exact検証後specialへ登録されるが、その他のnon-regularはprofile内でも拒否する。DB suffix/classifier、regular mode/nlink、SQL/schema翻訳のfaultではない。safe markerには今回の具体type・領域がなく、第三失敗が特定のsymlinkから生じたと断定できない。

### 一次sourceで裏付けた通常entryの不足

browsera4b2192dは`userDataDir=<ownChromeRoot>/profile`、macOS Google Chrome、version `154.0.8037.93`を固定する。Chromiumの同tagではMac PreProfileInitがsingleton取得後にAppShimListener.Initを呼ぶ。[ChromeBrowserMainPartsMac](https://raw.githubusercontent.com/chromium/chromium/154.0.8037.93/chrome/browser/chrome_browser_main_mac.mm)

同listenerはbackground初期化でDIR_USER_DATA直下に`RunningChromeVersion`をCreateSymbolicLinkで作り、終了時は削除callbackを置く。[AppShimListener](https://raw.githubusercontent.com/chromium/chromium/154.0.8037.93/chrome/browser/apps/app_shim/app_shim_listener.mm) 名前は同tagの定数で固定される。[app_mode_common.h](https://raw.githubusercontent.com/chromium/chromium/154.0.8037.93/chrome/common/mac/app_mode_common.h)

同tagのGenerateForCurrentProcessはframework版とMojoIpcz=trueを作り、EncodeAsPathは版＋`:1`をlink targetへする。従ってこの固定版で想定するtargetは`154.0.8037.93:1`であり、実ファイルへ追跡するpathではない。[ChromeConnectionConfig](https://raw.githubusercontent.com/chromium/chromium/154.0.8037.93/chrome/common/mac/app_mode_common.mm)

この正常native metadata entryが生成された場合、現special集合にはないため現在guardは確実に拒否する。**source上の不足は確定したが、今回の実symlink存在・target・時点は未観測。** Headless/各startup時点の実生成成功、削除完了や他non-regularの不存在も証明した扱いにしない。

### 最小補正/診断の提案だけ

採用するならcurrent known Chrome child/PGとcanonical owned profileに束縛した、profile root直下のexact `RunningChromeVersion`1個だけを追加control entryとして扱う。lstat symlink/UID/nlink1とreadlinkのexact固定target/有限bytesを検査し、no-followで扱う。版metadataからPID所有やprivate終了proof/ACKを生成しない。regular fileの600規則をsymlinkへ流用せず、chmodや全profile symlink例外を追加しない。既root/Chrome容量・entry countへ有限計上し、生成前/終了後absence、異type/異target/位置違い/登録なしの扱いを元Chrome寿命に結ぶ公開pure正負対として固定する。Singletonと他未知type拒否は維持する。

今回の実対象を分ける必要があれば、guard failureに有限location enum（owned profile/Chrome TMP/objects/nodeTMP/root/other）、type enum（symlink/socket/FIFO/character/block/other）とexact既知metadata-name一致booleanだけをsafe faultへ加える案に留める。rawfilename/link target/SQL/stack/本文は出さない。未知typeは拒否のまま、実causeを観測前に正常へ変えない。新候補の静的/pure契約を固定する前のblind fresh-root retryは提案しない。

新code/test/run/root/probe/runtime/DB/process操作0、ui5b/tool5bと前2failed pair・他旧private資材はread/hash/import0。S4/P5d writer中tree・外部/音声・製品/管理正本/goal/spec操作0。本レビュー追補だけ保存し、全自己read/report writerを停止する。

## 第三候補のroot binding — 静的pass

2026-10-05T23:15:33Z。**新root予約名だけの比例deltaは独立静的pass。Managerの実行判断へ返す。新pure24/UI/rootは未実行。** [提出](../phases/P5c-ui-classifier.md)7,995B/SHA256 `977c89fe90d96e2c0b3fa6327051e5dfe642ee8d1e1c643f117ae16b941e4b66`、boot38,376B/SHA `dd42a274c2818e2752ec595303deba4416440699a76705ca270104d0b1e20c44`、runner35,508B/SHA `31ecd2cc0af7bc5024b37b6de87bcf804d980fb909e5c99e58fae8260a507965`のregular600/nonlink/nlink1と全文hashを直接確認。launcher10,283B/SHA `ca40e3962206cb6d770c7736848228eafd8423650525d5845a3f81b8993fd88c`もAST literalから確認した。

runnerのUI2/tool1/bootSHA1、bootのexact比較名1をメモリ内で逆置換した全文SHAは、それぞれ1db585df/2c639d6bに一致。launcher逆置換は9852ff2aに一致する。旧failedroot/helper実物を読んだ比較ではない。既4helper全文hashはprovider937fbbee/browsera4b2192d/pure4bb7af52/stop4b419fa5と不変で、分類logic/追加3条件と既21条件を継承する。

Python ROOT・launcher ROOT・boot exact nameは`ui-5b56603c`、toolは`ui-tool-5b56603c`で整合。same Node private pure gate・exact24/max24/30秒成功後のroot生成、knownbase/canonicalparent/非存在/exclusive700、origin43173・最小env/typed native hook・全容量/子数・Chrome所有/proof/ACK・通常/異常終了条件は逆差分で不変更。C/BとPython/Node構文成功は主記録借用、自己CLI/compile/import再演0。新予約名の存在確認/生成/probe/runtime/DB/process操作0、全旧failedroot非操作と過去原因領域欠測を維持する。scope gateのpassを機能合格へ転用せず、保存後自己read/report writerを停止する。

## classifier固定logicの前レビュー

2026-10-05T23:10:53Z。**限定classifier/既guard差/従属pure・runner deltaは静的pass。Managerの次判断へ返し、新実行・機能受入にはしない。** 第二一巡の実fault領域は欠測のまま。Chromeで起きた原因を確定した扱いや、failed DB/結果の回復は0。

[固定提出](../phases/P5c-ui-classifier.md)5,710B/SHA256 `83d6a721bfa9967cf0205970d675a711b45841f1ff9ee6b3da1a11be3fbf05d1`、regular600/nonlink/nlink1を直接確認。

| 直接固定path | bytes | SHA256 |
| --- | ---: | --- |
| stop-audit.mts | 42441 | 4b419fa5e45c40e0c96845ba80aa9c8ff0f9dbbf441c59f4292be310a14b4ac4 |
| contract-pure.mts | 7805 | 4bb7af527346461c63caf6067aaa8c9c69578c7b553792253bc1f5d702267666 |
| p5c-ui-runner.py | 35508 | 1db585dfc0c7bd657095f3a1e7964ebb1f4138eb3e58487570255afb57925ed4 |

各regular600/nonlink/nlink1と全文hashを直接確認。内包launcher10,283B/SHA `9852ff2a72c3fe12712d47d34a16628ff7032c79a56299df513e6f62c27a518b`もAST literalから固定した。メモリ内でclassifier追加/guard差を戻したstop全文SHAは3cb4b5b5、import1/追加3条件を戻したpureはecd265c6、2helper SHAとpure exact期待2値を戻したrunnerは9a379bddに一致。旧helper実物やfailedrootを読まない比較である。boot2c639d6b/provider937fbbee/browsera4b2192dの全文hashは不変、C c2/new3488B不変更は既binding根拠を借用する。

`classifyRegularDatabase`はpath文字列だけを処理しI/O/SQL/clock/processを呼ばない。absolute/normalize同値/root exact descendantを先に要求し、root直下active/opaque/audit.dbとwal/shm/journalだけをname付きapp-databaseへ分類する。その後だけcanonicalでroot内のcurrent owned profile descendantをChromeとする。null所有・profile-other prefix・relative/non-normalized/escapeにはChrome許可がなく、その他DB suffixはunknown拒否、通常regularはother。app3DBの優先順位とcategory名は不変である。

既guard側はSingleton/現在Chrome登録、directory realpath/UID/前後identity、regular lstat/UID・600又はprofile644/nlink1を通した後だけclassifierを呼ぶ。分類器のprofile引数はその内部Chrome登録値であり、新しい任意profile入力はない。全regular bytes/filesへの計上を先に行い、profileDBはChrome128MiB/全root256MiB/20,000entryへ残す。appDBは3×16MiB/合計48MiB、objects1MiB/nodeTMP8MiB等の旧capを維持する。Chrome TMP/objects/nodeTMP/rootの未知DBは拒否され、app監査コピーにprofileDBを混ぜない。mode/UID/link/special-file/stop/proof/ACK/auditへの変更は逆差分で0。

追加3条件は12 exact app/sidecar対＋領域外負対、12 owned profile DB/suffix対＋null所有/prefix負対、absolute/escape/owner prefix/通常regular境界対であり、今回の分類契約を直接検査する。既bridge21本文は全文不変。runnerの両exact pureCount期待を24に合わせ、max24/30秒・同Node private gate・UI720/tail30・root literal・nativehook/child・control/2PIPE/FD/PG・normal/forced/unproven条件を不変に保つ。safe marker/領域enumも追加0。

strict noEmit/Python AST-compile/pinned Node checkのactual0は主記録借用。自己実pure24/UI/newroot/DB/runtime/probe/testは0。分類の静的passだけで今回の実領域やUI受入を確定せず、P5c1 A–F/P5c2 A/E/I/Jの残直接証拠は未成立、旧受入範囲だけ借用する。本レビュー保存後、全自己read/report writerを停止する。
