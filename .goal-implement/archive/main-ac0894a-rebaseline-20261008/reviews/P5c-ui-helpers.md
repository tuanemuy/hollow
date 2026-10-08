# Drive UI whole helper の独立 preflight

## F1/F2最小固定deltaの最終preflight

2026-10-05T21:39:57Z。**今回F1/F2は静的pass、既F3–F6/static passを維持。pure21/max24・30秒の実行preflightへ進めるgateは成立した。** pure/新root/実UI/PG終端/bytes/DBauditの実成功は未実行であり、Managerの別実行委譲を待つ。

phase=18,982B/SHA256 `76df746bd62ea24c967f70c6f3d99db30ef9b1ea7cd6166dc257a1ca86c64a85`。変更browser=18,761B/SHA256 `a4b2192dc6bef805352628197553527d5343a8df9676e903d207e75e3e249de8`、stop-audit=41,212B/SHA256 `3cb4b5b5a3b7ec6d20b08588a14abda2c79772044d1348a25559622cc117d638`。全5helperのregular/nonlink/nlink1/600と全文hashを直接確認。boot418ef0a2/provider937fbbee/pureecd265c6は直前固定候補と全bytes/hash同一。C c2/new3488B/release93d264不変更の管理報告を借用し、既成果再scan0。

| ID | 直接静的判定と必要条件 |
| --- | --- |
| F1 | pass。proxy socketのactual data chunkを一回だけinputへ加算し、header/body/CONNECT headの推算・別加算を除去。同固定raw403 BufferをHTTP/CONNECT/Expectへ送り、byteLengthを送信前予約しinput＋予約が1MiB超なら書込せずfail/所有socket全停止。150deny/150connection/8秒を維持。close時bytesWritten差分でactual outputを別ledgerへ記録、予約量を実出力量へ昇格しない。Socket境界guard、server役割3、外部forward0/exact app port以外DIRECT0を維持 |
| F2 | pass。knownPID不在とchromeGroupPresenceを分離し、既PPID/PG検証済みown childだけへkill(-pid,0)。ESRCHのみabsent、成功alive、EPERM/他error/未確認PGはunproven。actualClosedはPIDとPG不在の両方を必須とし、normal/copy-audit採否へ到達する。leader終了済みでもPG aliveなら既確認自己PGへ有限TERM/KILL、未知/未確認PGへsignal0。不在/欠測の独立bool/ledgerを追加し、既reader EOF・writer FDclose/finish区分と120/10/10/pipe10を維持 |

影響sourceは上記proxy計数/応答とPG/終了採否だけを読む。F3–F6、二方向bridge/分類前接続・privateSymbol/closed拒否release0・正規API/DTO-ID JOIN監査mappingは直前静的受入の範囲を継承する。全5path strict型actualexit0はprimary直接記録借用、自己type/pure/新root/runtime/browser/probe/DB/native/build/外部0。P5d別tree source0、旧/failed root/B/helper/資材読取0、製品/管理正本/goal編集0、音声保留を維持。

実launcher/新root manifest・pure21/30秒はRootの後続委譲条件。pure成功を確認した後も、U0–U7/normal closure/一回auditとBFCacheの個別欠測を分けて報告する。静的preflight passを実UI成功へ振り替えない。今回scopeに重大残差なし、全read/report停止・所有権返却。

## 以下は前候補の履歴

## 固定F1–F6修正版の影響delta判定

2026-10-05T21:32:30Z以降。C c2a3d45f/new3488B/release93d264は不変更。**起動preflightはF1/F2の残差だけ差戻し。F3/F4/F5/F6の補正は静的pass。pure21/30秒・新root・実UIは未実行、まだ実行採用へ渡さない。** 製品や既artifactの差戻しではない。

新固定phase=15,466B/SHA256 `6a4e1bd1a4b14eca35a50890cd4d3f6a3526f914e921aeffa47641de569cbf7c`、5helperの全文hash/regular/nonlink/nlink1/600を直接確認した。補正の必要関数・相互呼出と正式parserの成功/terminate経路をread-only照合し、既静的pass部分を全面再検証しない。

| helper | bytes | SHA256 |
| --- | ---: | --- |
| boot.mts | 37,854 | 418ef0a2f486069f5b73d5d1ea0b67aae98a68c7edbfdba3e76dfdca03283f47 |
| provider.mts | 11,902 | 937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0 |
| browser.mts | 18,106 | 3002d5d4602cf9446c40113c1b8c21f2c425b42af632b4f13007845187bc9e99 |
| contract-pure.mts | 6,069 | ecd265c621895c6bdc188701dbda3c214717db6686d755e0122e50580f14a617 |
| stop-audit.mts | 40,243 | 172fd86e2c0a5b558dd194783838b81cfd64121527523680fb410b35684ce3a5 |

| ID | 個別判定・直接静的根拠 |
| --- | --- |
| F1 | 部分pass/残差あり。proxyをlaunch前に所有、app/provider/proxy役割3、HTTP/CONNECT403・外部forward0、固定proxyとdefault loopback bypass除去/exact app portだけ例外、150deny/150connection/8秒成立。ただし下記実bytes計数が不足 |
| F2 | 部分pass/残差あり。exact spawn argv/5stdioを生成前予約→生成直後台帳登録/early ownChrome、30秒setup guard直列化・有限Singleton例外、setup catch/finally回収、boot closeがbrowser失敗後もapp/providerへ進む。reader1/2/4の実EOF+close、writer0/3の実close/FD破棄とfinish未観測を別countにする。既知子が残る場合のleader終了後PG signalは補正済み。ただし下記PG不在判定が不足 |
| F3 | pass。bootの正規driveBackupHistory DTOでN1 failed/FOLDER_UNAVAILABLEを待ち、通常Panelの「削除とは断定できないため」を待つ。generateFile0維持、fixture/DOM差込0 |
| F4 | pass。exact許可parser path/operation、同Workerの正式success message/result→元adapter terminate→実exit/pipeを区分。公開documentExtractorの成功finish→terminateと整合。parserだけsuccess/adapterTerminate/monitorTerminate=falseとcode0又は1、projection/searchはcode0。監督stopはmonitorTerminateを先に立て、code1一般の成功化0 |
| F5 | pass。同documentの実SDK setCallback関数を待ち、document/callbackの元JSHandleを保存して実Back一周。persistedかつ両元handle同一のときだけcallbackを一回呼び、呼出観測/selectionPOST0を要求。realm/callback不一致はBFCache欠測として正規cancel/currentGET/明示restartを続行。再構築/合成pagehide0 |
| F6 | pass。同opcap gateをapp POST continue前に接続、違反時abortとsupervisor失敗へ結ぶ。parser/projection/search fork/Chromeは生成前reserve、生成失敗cancel、生成成功commitで元handle登録。元args/return/result/IPC/closedの改変0。上限引上げ0 |

### F1残差: proxyの実入力/拒否応答bytesが1MiBへ入らない

`browser.mts:52–56` のdenyBytesはURL＋JSON化headers＋固定128の推算だけ、CONNECTはheadも足す。connection handlerにsocket data計数がなく、HTTP request bodyと実拒否応答bytesを加算しない。したがって一要求のbodyが増えてもcountは1のまま、採用背景通信1MiB超過を検知できない。外部forward0とbytes有限性は別条件であり、403成功だけから両方をpassにしない。

最小補正は同proxyの実socket入力量と送る固定403応答量を同1MiB台帳へ束縛し、超過時fail/所有socket停止へ接続すること。headers/bodyの二重計数や有限上限を推算へ戻す必要はない。新fault/外部probe/新server/予算追加は要求しない。

### F2残差: 正常終了とforce対象が既知PIDだけでPG全終了を代用する

`stop-audit.mts:239–247` のchromeAbsentは登録PIDへのkill(pid,0)だけ。actualClosed/normal採否はこれを使い、確認済み自己PGへの不在観測がない。leader/登録子が終了しても同PGの未登録子が残るとactualClosed/normalが通り得る。force側のownedGroupAliveも同chromeAbsentなので、その状態ではleader exitによりsignalをskipできる。採用済み「leader終了と自己PG全終了を分ける」の未完である。

最小補正は既にPPID/PG照合済みのexact自己PGに限定したkill(-pgid,0)/ESRCHの不在判定を、known PID終端と別にnormal/actualClosedとforce対象へ結ぶこと。EPERM等を不在扱いしない。未確認PGを勝手にsignalせず、その欠測はunprovenへ残す。既120/TERM10/KILL10/pipe10を維持し、広域PID探索/追加ps/probe/子caseは不要。

## deltaで保持する成立範囲・未実行

pure fileのbytes/hashは不変更。二方向bridgeの分類前接続・exact class/schema/unknown identity保持、built BackupSource同graph/privateSymbol/closed拒否release0、正常API/正式DTO-ID JOIN監査mappingの既静的passを維持する。providerの未知endpoint/cap/protocol失敗はonFailureへ結び、意図した初回create socket破断と区別される。全体strict型check actualexit0はprimary記録借用、自分のpure/type/native/build/browser/DB再演0。

実profile配置/mode、PG/pipe/FD/DB実終端、BFCache成立、全U0–U7・一回auditは未検証。過去helper/失敗rootの読取・実行/再利用0、既B成果全再scan0、P5d別worktree source0、製品/管理正本/goal変更0、外部/音声0。新root/runtime/probe/Worker/child/pure操作0。F1/F2の上記残差だけImplementerへ返し、新固定deltaを待つ。全read/report操作停止。

## 以下は初回whole候補の履歴

2026-10-05T21:01–21:15Z。C=`c2a3d45f1097533c6344346aca303dc1d2aef368`、新3488B/release=`93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0`。**起動 preflight は差戻し。重大不足 F1–F6 を5 helper内で補正し、固定候補を再提出する。pure/newroot/UI実行はまだ許可判断へ渡さない。** 製品候補・既artifactの不具合とは分ける。

全5 helperの全文と相互呼出、必要な公開source/API、正式 U0–U7/P5c1 A–F/P5c2 A/E/I/J の起動条件を比例照合した。[whole提出](../phases/P5c-ui-helpers.md)は8,833B/SHA256 `c65a454f0fa414dea176b0c5cee247f517d79e54330c04ef65df966fab9494c2`、regular/nonlink600/nlink1。次の bytes/SHA/modeを直接確認した。親dirの既固定700は提出記録を借用する。

| helper | bytes | SHA256 |
| --- | ---: | --- |
| boot.mts | 36,165 | aa4a5337820f45693eacffef2258b08b767f9c9e2f1c3a18a4153834145b0a52 |
| provider.mts | 11,830 | cc4b4be8100feccb4578e5a320fd7c6a3ce4712ea1d69a2f17fe96250933188e |
| browser.mts | 13,276 | 42d33e96e29994ce2c8e70b86b8b9cf9348ea6c04d21edfe79f08c1cf8f37bf3 |
| contract-pure.mts | 6,069 | ecd265c621895c6bdc188701dbda3c214717db6686d755e0122e50580f14a617 |
| stop-audit.mts | 33,106 | b4208cec5bc11cee649fef8f39b88942c9eebac4892e2f9786ee471aea5dc42a |

各helperはregular/nonlink600/nlink1。primaryの全体 strict 型連結・exit0 は借用。自己の型/test/pure/build/root/migration/DB/runtime/browser/probe/Worker/fault 実行0、旧B/failedprivate/旧root/helper/cache/key/results/PID探索0、秘密本文出力0、外部/音声0。製品・管理正本・goal変更0。既3488成果の全asset再走査・無関係suite再演0。

## 起動を妨げる不足

### F1: Chrome背景通信を閉じる経路がない

`browser.mts:44` のlaunchにはproxy設定がなく、拒否は `page.on('request')` のページinterceptionだけ（同114行はapp originをcontinue）。`provider.mts`のloopback factoryはNode Drive HTTPにのみ注入され、Chrome背景通信の代理先にならない。main page/CDPの有限countsからChrome processの背景外部通信0を宣言できない。

必要最小は、launch前に所有・台帳登録した採用loopback proxyへChromeを束縛し、外部forward/direct fallbackを拒否、背景deny count/bytesを有限に保持して上限時停止すること。fixtureページだけで外部禁止を保証しない。既app/providerの2server上限と一つのprofileを含め、proxyの所有・容量・close/FD条件を同root契約へ明示する。新外部接続・別browser probe・広域環境調査は不要。

### F2: Chrome準備失敗とleader終了後の停止所有が閉じていない

`createBrowserHarness` はlaunch成功後にCDP→SystemInfo→registerChrome→version/context/page確認→interception→guardと進むが、返却前例外のcatch/finally closeがない。bootの `browser=await createBrowserHarness(...)` は未代入なので、boot側closeはそのローカルbrowserへ到達できない。CDP失敗がregister前ならchild/5pipeも未登録で、stopの台帳からChromeが抜ける。

さらにsupervisorはlaunch前から200ms strict walkを開始し、`chrome===null` の間はSingleton例外を認識しない。launchが作ったcontrol link/socketを登録前に特殊entryとして拒否し得る。`stop-audit.mts:310` は主child.exitならsignal対象から除くため、leader exit後に既知Chrome子だけ生存すると、確認済み自己PGへTERM/KILLが届かない。

必要最小は、返却前にも生成済み自己browser/child/5pipeを確実に所有する有限setup登録gateと例外close経路、control例外の登録時期とstrict guardの整合、leaderのexitと自己PG/既知子全終了の分離。既有限120/10/10/10秒とknown PID/PGの範囲を維持し、未証明をnormal/actualClosedへ補完しない。広域PID探索・後付chmod・失敗root再利用0。stdioは実役割に沿うEOF/finish/closeで区分し、Puppeteer.close解決だけを5pipe終了にしない。

### F3: backup404のDOM期待が別UIの文言になっている

`boot.mts:169` はN1通常backup retryの404後に「削除されたとは限りません」を待つ。現 `DriveBackupPanel.tsx:44` の該当文言は「削除とは断定できないため」で、前者はfolder-control用 `DriveResult.tsx:25`。正常製品でもこのwaitは8秒でbailしU3以降へ進めない。

通常backup DTOの該当failure/terminal結果と、実DriveBackupPanelの非断定案内に期待を合わせる。fixture/DOMへ期待文言を差し込まない。generateFile0/同一targetの条件は維持する。

### F4: 正常parser終了を全Worker exit0と仮定している

`stop-audit.mts:320` は全upload Workerのcode0をnormal条件にする。一方、公開 `documentExtractor.ts:152` の通常成功messageも `finish(null,value)`→`worker.terminate()` を実行する。parserのadapter終了はcode1となり得て、成功した通常uploadでも一律code0 guardと整合しない。現在のupload kindはparserとprojectionを区別していない。

必要最小はexact parser handleについて、正式成功message/result、元adapterの実terminate呼出、同handleの実exit/pipe終了を改変せず観測し、監視stop/timeout/abortと分けた限定条件を固定すること。code1一般を正常化しない。projection/searchは各正規経路のcode0条件を維持し、未知・失敗・未終了を解除しない。新native replayや製品parser変更は不要。

### F5: BFCache旧callbackを呼ばずPOST0へ合格できる

`boot.mts:183` のU6はPicker receipt/controlId到着だけでpagehideし、fixture SDKの実setCallback完了を待たない。persisted枝も `typeof __uiLatePicker==='function'` の時だけ呼び、存在しなければ何もせずPOST0を合格にする。実callbackが未準備でもlate callback拒否の正例になってしまう。

必要最小は同document内の実SDK callback準備を確認してから離れ、persisted枝でその実旧callbackの存在・同document・一回呼出を必須観測すること。欠けた場合は当該BFCache直接対を欠測とし、正規receipt GET/取消/明示Picker再開は計画どおり区分して進める。成功値/proof捏造、旧realmの再構築、追加probe/case0。

### F6: mutation/生成上限の検査が副作用の後になっている

`browser.mts:114` のapp request handlerはcontinueし、後から登録された `boot.mts:145` のmutation gateは上限超過/未知POSTをresponseFaultへ保存するだけでabortしない。wait時に停止しても、そのPOSTは既に送信できる。native観測wrapperも `super(file,options)` / `originalFork(...)` 後にknownWorker/knownChildを呼び、上限検査でthrowすると生成済みhandleが台帳へ入らない。

必要最小は同じopcap gateをapp POSTのcontinue前へ接続し、unknown/超過を送信前に拒否すること。Worker/forkは生成前の有限予約/上限検査と生成失敗時release、生成後の確実登録を組にするか、登録拒否時に生成済み自己handleを確実に有限停止へ引き渡す。正規args/戻り値/result/IPCを改変せず、上限の引上げや新case/native fault再演は要求しない。採用済finite countsとknown所有の補正であり、別の安全条件の追加ではない。

## 静的に成立した部分と残る限界

同C/Bのmain・BusinessRuleError alias/hash固定と正規client RPC binding、正規migrate→client.close→built bootの接続は妥当。wrapperの型はprimary成功を借用し、source native adapterへ渡すHTTPは自己loopback factory。built named BackupSourceはbuilt storageと同graphのprivateSymbol/guardを使い、実native.registerを渡す。closed拒否release0・元closed Promise保持は既独立artifact根拠を継承する。

bridgeはexact class/prototype/name/code/schema/serializerを限定し、built→sourceをexecution work捕捉前、source→builtをbackup provider/protector等の分類前に置く。成功handle/value/buffer/closed/ACK/proofを置換せず、unknown/native transport/Unprovenを同objectに保つ。pureは21条件/max24・30秒の同bridgeへ結合し、private brand/proofを捏造していない。静的成立だけでpure成功へ昇格しない。

normal signup/verify/signout/signin、各1024bytesの2upload、正式begin/POST/sealとDTO ID捕捉は公開APIに沿う。SDK fixtureは実script/iframeとcontrollerの選択callbackを通し、folder/create/uploadはnativeHTTP応答と実socket破断/閉鎖を使う。強制成功値によるowner解放0。U0–U7のmutationsとstage結果の採否はF3/F5補正後の実観測待ちであり、計画値を条件の成功件数へ使わない。

Worker/fork wrapperのexact pathと元args/戻り値は保持され、parser＋projection8/同時2、search fork16/同時1と子Worker IPC代理の区分は採用枠に沿う。searchのworker-start/worker-exit＋fork actualexit0を代理根拠とし、子Workerのstdout/stderr EOF直接未観測0を借用と分けている。実counts/native modes/5pipe/knownChromePID集合と253byte制御pathは未実測。live profileの変動entry/raceは有限初回guardの観測gateであり、未確認を成功へ補完しない。

監査はnormal/actualClosed後だけwx active→未open opaque→wx audit、一回DatabaseSync(readOnly)/query_only、FK/integrityとknown DTO-IDからJOINしたaccount/note/attempt/job/record/target/headを照合する。必要なpublic schemaのowner_state/read_pinned/refresh_pending/object_writes.active、flat admission_identity、credential.subject/folder.id等を限定確認し、明白な列名誤記は見つからなかった。SQL取得IDを期待へ転写しない。copyFD/audit実close、全owner/pin/write終了は未実行でありF2/F4の補正なしに合格しない。

追加観察として、provider routeの予期しない失敗はnote後socket.destroyへ落ちる。補正時には採用cap違反/未知endpointを、意図した初回create socket破断と区別して停止理由へ残すこと。これを新機能や別fault群の追加要求にはしない。規定checks/build出口/旧backend合格は借用・継承、helper純対/実UI/BFCache/Chrome/停止/auditは未検証。実Google/実SDK/configured factory/外部接続/actualfresh/D01/全browser/音声保留を維持する。

正式A–F/A/E/I/J全体の成功を本一巡へ包括しない。U0–U7は採用された残差範囲で、unlink/autoON/追加actor/390px/keyboard等の未実行又は既受入借用は条件別に残す。ここから新mutationや無関係受入の再演を追加しない。

F1–F6を既5helperと同root契約へ最小補正すれば再preflightへ進める。Managerの調査打切り指示に従い、自己の全read/report操作を終了、共有runtime操作0。全体管理/修正/実行採用はManager、実装修正はImplementerに返す。
