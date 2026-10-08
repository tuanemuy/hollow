# Drive UI helpers：F1/F2 残差の最小修正 candidate

2026-10-05T21:39:07.027207+00:00。変更はbrowser.mtsのproxy実bytes台帳、stop-audit.mtsの検証済自己PG不在判定、その現在報告だけ。全5path strict noEmit型checkはactual exit0/出力なし。全writer停止・所有権返却、独立2点deltaレビュー待ち。製品C c2a3d45f1097533c6344346aca303dc1d2aef368、新3488B/release93d264、source/buildmanifest無変更。boot/provider/contract-pureは前candidateの全文hash同一を直接確認し、既F3–F6/bridge/DTO監査passを維持する。

| helper（`.goal-implement/helpers/p5c-ui/`内） | bytes | SHA256 |
| --- | ---: | --- |
| `boot.mts` | 37,854 | `418ef0a2f486069f5b73d5d1ea0b67aae98a68c7edbfdba3e76dfdca03283f47` |
| `provider.mts` | 11,902 | `937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0` |
| `browser.mts` | 18,761 | `a4b2192dc6bef805352628197553527d5343a8df9676e903d207e75e3e249de8` |
| `contract-pure.mts` | 6,069 | `ecd265c621895c6bdc188701dbda3c214717db6686d755e0122e50580f14a617` |
| `stop-audit.mts` | 41,212 | `3cb4b5b5a3b7ec6d20b08588a14abda2c79772044d1348a25559622cc117d638` |

全regular/nonlink/nlink1/0600・親dir0700。新root/pure/browser/DB/runtime/probe/fixture/socket/Worker/child/外部操作は0。旧/failed private/B/helper/cache/key/results/PID探索は0、audiohold。型成功だけから実通信bytes/PG終端/UI成功へ昇格0。

F1: URL/header＋128の推算を除去。同所有proxy socketのdata chunk byteLengthを入力へ一度だけ加算し、HTTP body/CONNECT headを同actual inputへ含める。headers/head/bodyを別途二重加算0。HTTP/CONNECT/Expectは同一固定raw403 Bufferをsocket.endへ渡し、Date/自動chunk等の応答生成を使わない。送る実Buffer byteLengthを送信前に予約し、actual input＋output予約が1MiBを超えれば書込0・自己停止・所有socket全停止。各socket実close時のbytesWritten差分をactual outputへ記録し、input/output別ledgerを保持する。予約量を実出力量へ読み替え0、body本文を保存/出力0。既150deny/150connection/8秒・役割3server・外部forward0/exactappport以外DIRECT fallback0は維持。CONNECTのNode公開型Duplexは実Socket境界guard後だけ同accountingを使い、無検証cast0。追加endpoint/外部fault対0。

F2: known PID不在と自己PG不在を別関数/StopReport bool/ledgerへ分離。既probe1でPPID/PG照合済みのownChrome childだけへnegative `process.kill(-pid,0)`を行い、ESRCHだけabsent、成功はalive、EPERM/他error/未確認PGはunproven。actualClosed/normal/copyaudit gateにはknown PID全不在と検証済PG不在の両方を要求する。leader exit後もPG aliveなら確認済ownPGへTERM10→KILL10を行い、未登録同PG子をknownPID全不在だけで見逃さない。未確認PG/EPERMを不在へ補完0、未知PGをnegative signal0、追加ps/probe/広域探索0。既120/10/10/pipe10・各pipe role/FD終了条件は維持。

最終型コマンドは同exact5pathのtsgo `--ignoreConfig --noEmit --module preserve --moduleResolution bundler --target es2023 --allowImportingTsExtensions --skipLibCheck --strict --esModuleInterop --types node`。初回CONNECT Duplex→Socket型不一致を検出し、公開Socket instanceof guardで修正後actual0。type以外のtest/pure/native/全backend/buildは再演0。影響は上記2点のみとして独立reviewへ返す。

## 以下は先行candidateの履歴

# Drive UI helpers：F1–F6 修正 whole candidate

2026-10-05T21:30:06.960228+00:00。独立preflight差戻しF1–F6を既5helper内で補正した。最終whole strict型/構文チェックはactual exit0、runtime/pure/新root/browser/profile/probe/DB/migration/fixture/socket/Worker/child/外部操作は0。全helper/report writerを停止し、固定hashと下記差分を独立deltaレビューへ返す。補助agentはこの修正に参加0。製品C c2a3d45f1097533c6344346aca303dc1d2aef368、新3488B/release93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0、source/dist/buildmanifestは無変更。旧/failed privateと旧B/helper/cache/keys/results/PIDは全非操作、audiohold継続。

| helper（`.goal-implement/helpers/p5c-ui/`内） | bytes | SHA256 |
| --- | ---: | --- |
| `boot.mts` | 37,854 | `418ef0a2f486069f5b73d5d1ea0b67aae98a68c7edbfdba3e76dfdca03283f47` |
| `provider.mts` | 11,902 | `937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0` |
| `browser.mts` | 18,106 | `3002d5d4602cf9446c40113c1b8c21f2c425b42af632b4f13007845187bc9e99` |
| `contract-pure.mts` | 6,069 | `ecd265c621895c6bdc188701dbda3c214717db6686d755e0122e50580f14a617` |
| `stop-audit.mts` | 40,243 | `172fd86e2c0a5b558dd194783838b81cfd64121527523680fb410b35684ce3a5` |

全5fileはregular/nonlink/nlink1/0600、親dir0700。contract-pureはbytes/hash無変更。現在のpreflight可否は独立レビュー待ちで、型成功から実UI/Chrome/停止/DBaudit成功へ昇格しない。

## sourceに基づく限定差分

| finding | 必要な変更と観測境界 |
| --- | --- |
| F1 | browser launch前に新ownloopback拒否proxyを登録。HTTPとCONNECTは403・外部forward0。Chrome explicit `--proxy-server=http://127.0.0.1:新port`、`--proxy-bypass-list=<-loopback>;exact app host:port` で既定loopback bypassを除き、app自己portだけlocal直結、外部DIRECT fallbackなし。proxy150deny/150connection/1MiB入力＋応答bytes・8秒socket/header/request期限。超過/未知protocolは自己停止へ接続。serverはapp/provider/proxy各1、台帳cap3に役割を固定。proxy socket/実server closeはnormal closureへ結ぶ。Google fixture応答はpage interceptionのまま、背景通信の閉鎖根拠はproxyへ分離。 |
| F2 | 公開@puppeteer/browsers3.2.2 launch.jsの正規spawn(detachedtrue/5stdio)をlaunch中だけ限定観測。exact executable/userDataDir/proxy/bypass/CDP-pipe argv・pipe5を生成前に照合/reserve、生成直後に元child/全stdioを台帳登録し、同childをそのまま返す。observer正常異常finally復元、未知wrapperをclobber0。30秒setup gateは新selfprofile/ChromeTMP/ownPIDに限定、既guardを直列化しchild生成前は有限待機、生成後は200ms容量/mode確認を続ける。未完成Singletonもexact3名と一own700native directoryのCookie/socketだけを暫定追跡し、字句target/UID/mode/opaque cookie/ownPIDを検査、unknownを許容0。既probe1でCDP既知PIDのPPID/PG照合後にsetupを完了しstrict guardへ戻る。setup例外もprivate browser.close/proxy.closeを有限finallyで行い、元boot closeはbrowser失敗でapp/DB/provider停止を飛ばさない。leader exitでも確認済ownPGの既知子が残ればTERM/KILL対象。未確認PG・未知PIDへsignal0、終了未証明をnormalへ補完0。 |
| F3 | 通常driveBackupHistory DTOのN1 terminal failed `DRIVE_BACKUP_FOLDER_UNAVAILABLE`を読み、現DriveBackupPanelの「削除とは断定できないため」をDOMで待つ。folder-control文言をbackupへ流用0、DOM差込0。generateFile0と同target履歴監査は維持。 |
| F4 | parserとprojectionを区別。exact新S parserWorker.mjsのdetect/extract operation、正式success message/result、元adapterの同handle terminate呼出、actualexit/pipeを観測。documentExtractor.tsのsuccess finish→terminateに従い、parserだけsuccess＋adapterterminate＋monitor terminateなしのcode0又は1を正常条件にする。timeout/abort/error/未知result/code1一般を正常化0。projection/searchはcode0、監視stopのterminateは明示別flag。元args/value/result/terminate実装を変更0。 |
| F5 | U6同documentで実SDK setCallback済みの関数を待ち、実document/実callbackのJSHandleを取得してからpagehide。persisted時、元documentと元callbackが現在realmで同一か確認して一回だけ呼び、呼出観測＋selectionPOST0を直接条件にする。callback/realmがない場合はBFCache直接対欠測と記録し、正規receipt/取消/明示再開を続行。関数・realm再構築0、欠測をPOST0正例へ補完0。 |
| F6 | bootの同POST mutation gateをBrowserHarness.operationGateへ一度接続し、app request.continue前にunknown/上限を検査。違反はabort＋自己停止で送信0。Worker/parser/projection/search-fork/Chromeの生成前reservationをcapと同時枠へ数え、生成失敗時cancel、生成後commitで必ず元handleを登録。Chrome追加枠/Worker追加枠0、元argv/env/return/IPC/closed不変。 |

providerの未知endpoint/cap/protocolエラーは有限stop理由へ結び、意図した初回folder createの実socket破断と区別した。新fault/case追加0。pure21/max24/30秒・二方向bridge・builtBackupSource同graph/privateSymbol・normal DTO-ID JOIN auditは静的pass部分を維持した。

F2 pipe roleは公開@browsers launch.jsのpipe5とpuppeteer-core25.11.0/node/PipeTransport.jsを必要箇所だけ読むことで固定した。0(stdin)/3(CDP)writerは実close/FD破棄必須、finishあり/未観測を別countにする。1(stdout)/2(stderr)/4(CDP)readerは実EOF＋close必須。PipeTransport.closeはlistenerdisposeのみなのでそれをFDcloseへ読み替え0。normalは自己leader/確認済PG/既知子の全終了とも組合せる。search子内Worker pipe EOF直接未観測0と代理IPC/actualforkexitの区分は維持。秘密本文/生ログ出力0。

最終checkは同exact5pathのtsgo `--ignoreConfig --noEmit --module preserve --moduleResolution bundler --target es2023 --allowImportingTsExtensions --skipLibCheck --strict --esModuleInterop --types node`、actualexit0/出力なし。途中でChrome childとclosure内spawned比較のcontrol-flow型誤記を検出し、Object.isによる正規handle同一性へ修正して再成功した。型のための無検証API拡張cast0、既spawn/fork overload境界型に従う。追加type/native/fullbackend/build再演0。所有権をManagerへ返し、独立固定hash deltaレビューを待つ。

## 以下は初回whole候補の履歴

# Drive UI helpers：whole candidate 提出

2026-10-05T21:00:30.084950+00:00。5 helper の実装と全体 strict 型連結を完了し、全 helper/report writer と分担 writer を停止する。製品 C=`c2a3d45f1097533c6344346aca303dc1d2aef368`、新3488 B/release=`93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0` への binding 固定。新 B/source/dist/release/artifact は無変更。独立 helper preflight へ所有権を返す。

現在成功は静的型/構文照合だけ。pure・UI root・DB/migration・fixture HTTP・browser/profile/probe・native Worker/child・app runtime・外部操作は全0。実UI/BFCache/native closure/audit の成功は未主張。旧 B/root/private/helper/cache/key/results/PID 探索は0、audio hold継続。

| path（`.goal-implement/helpers/p5c-ui/` 内） | bytes | SHA256 |
| --- | ---: | --- |
| `boot.mts` | 36,165 | `aa4a5337820f45693eacffef2258b08b767f9c9e2f1c3a18a4153834145b0a52` |
| `provider.mts` | 11,830 | `cc4b4be8100feccb4578e5a320fd7c6a3ce4712ea1d69a2f17fe96250933188e` |
| `browser.mts` | 13,276 | `42d33e96e29994ce2c8e70b86b8b9cf9348ea6c04d21edfe79f08c1cf8f37bf3` |
| `contract-pure.mts` | 6,069 | `ecd265c621895c6bdc188701dbda3c214717db6686d755e0122e50580f14a617` |
| `stop-audit.mts` | 33,106 | `b4208cec5bc11cee649fef8f39b88942c9eebac4892e2f9786ee471aea5dc42a` |

5 helper は全 regular/nonlink/nlink1/0600、親dir0700を直接確認した。boot/browser/contract-pure/stop-audit は新exclusive0600作成。provider は初回準備で0644となったため、Manager採用のとおり同新公開bytesを保持してunlink→os.open(O_WRONLY|O_CREAT|O_EXCL,0600)で再作成した。これは実行前公開工具のmode補正で、失敗private rootの再操作ではない。

## 呼出順と責務

`prepareContracts()` は同B BusinessRuleError公開alias `a` と binding hashを確認し、同 `createErrorBridge` への純対を最大24/30秒で一度だけ行う設計。現在静的に21条件（loopを展開した数）、実行0。成功後だけ同module内のprivate状態が `prepareUiRoot()` / `runUi()` を許可する。future callerは新absolute root/origin/固定5hashを実行前にManagerへ通知し、別採用後にのみ呼び出す。黙示main起動はない。

`boot.mts` はCとrelease/build/entry/classchunk hash、正常generated client RPCのAST bindingを確認し、正規migrate→close→同bundle boot一回を組む。新3488 sourceのNodeDriveExecution/Http/Authorization/FolderProvider/BackupProvider/secretProtectorとbuilt NodeDriveBackupSourceだけを注入する。native adapterへ渡すHTTPはproviderの自己loopback ClientRequest、外部URLは転送しない。known ambient configキーは存在時fail closed、cwdは新W。bridgeはbuilt→sourceをexecution.runのwork捕捉より前、source→builtをbackup-provider5method/protector2method/必要execution拒否境界に限定し、exact class/prototype/name/code/retryable/serializer一致だけを投影する。未知/native transport/Unproven/closed拒否は同object、正常handle/result/closed/ACK/proof/bufferを変更0。built BackupSource同graph/privateSymbol/closed拒否register保持は採用済artifact静的根拠を借用し、private brand/proofを純fixtureで偽造0。

`provider.mts` はmemory RSA1/AES32、mailer1、auth3/F1/F2/同IDfolder POST2/chunk1/held native socketを有限stageへ分ける。auth失敗は既folder/epoch保持、成功relinkはheld socket実close待ち、create初回は実socket破断でunknownを作る。SDKはaccounts consent/apis script/docs iframeの許可endpointだけにfixture応答し、通常application/controller/transportの受付・version・権限guardを迂回しない。

`browser.mts` は採用済公開Puppeteer25.11.0/CDP/pipe/Chrome154、default context1/初期page再用、newChromeTMP/customprofile、SIGfalse、唯一BFCache defaultarg除外を使用する設計。own main document realm handle/current locationと一意visible/enabled ARIA handleを照合し一回click、dialogはarm→click→await。OAuth consentはexact accounts.google.com/o/oauth2/v2/authだけの別document境界。current app DTOとは混同しない。U6は実back一回とpageshow.persistedを観測し、同documentでなければBFCache late callback直接対を欠測として残し、明示current receipt/取消/Picker再開へ進む。

`executeUi()` / `completeUi()` はnormal signup/verification/signout/signin→通常2×1KiB upload/detect/extract/projection→U0–U2 trash/restore/404→U3 failed/successful relink→U4 same-ID unknown create→U5 retarget取消/承認/成功record1→U6 actualback/current receipt取消/明示Picker再開→U7 normal実終了→audit一回へ連結した。RPC/bodyの未知mutation、追加upload、余剰count、current actor/note/original不一致は停止。失敗を再試行rootへ自動転用しない。

`stop-audit.mts` は200ms/720秒guardと実known handle台帳、normal120秒/TERM10+KILL10+pipe10を区分する。正常Browser.close→app.quiesce/listener.close/shutdown→provider.close後に、native Worker exit・child exit/close/IPCdisconnect・Chrome own PID群 absent・直接pipe EOF/FD/server/socket closedを確認する。normal actualClosedでない場合copy/audit0。guard/setup/stage失敗も自己停止を試み、boot戻り値未確定ならDBclose成功へ補完0。

## 資源・監査の固定

UI root256MiB、active/opaque/audit各16MiB計48、objects1MiB、helpers/log12MiB、material256KiB、NodeTMP8MiB、ChromeTMP128MiB。dirs/regular data700/600。profile内部だけ既採用sameUID regular600/644・dir700/755とexact Singleton3/native cookie/socket例外、no-follow/字句target/ownPIDPG/253bytesをguardする。例外の後付chmod・個人profile/cache探索は0。

正規normal upload Workerは計8/同時2以内。exact許可は新S/packages/core/src/adapters/node/import/parserWorker.mjs（正規import.meta.resolveがsourceを指すためManager補正採用）と新D/server/browse/noteProjection.mjs。search forkは新D/server/browse/searchSupervisor.mjs計16/同時1、その子内新D/server/browse/searchQuery.mjs Worker計16/同時1。Chrome親1/既知CDP子16、metadata ps一回、webWorker2。LLM/PDF/ZIP/Drive再生成/audio Worker0。観測wrapperはargs/return/result/closed/IPC値を変更0。

search child内Workerは正規IPC worker-start/worker-exit各1＋同fork actualexit0で代理観測し、直接knownWorkerの数と分ける。子内Worker stdout/stderr EOFは親にhandleがなく直接未観測0と記録し、sourceのresume/正常子終了からの借用と区分する。forkのPIPE構造的不使用/IPCdisconnect/actualexitをWorker EOFへ読み替え0。Chrome自身の有限PID集合だけ1回ps pid/ppid/pgid照合、他PID/env/argv探索0。

正常DTOから捕捉したaccount/note2/attempt3/history terminal job4/record1 IDだけが監査expected。N1原本1024bytes/hashは投入した既known内容から算出する。target3（F1 unallocated2/F2 confirmed1）/head2/original2は正式FKとjob/record JOINで対象集合・subject/folder/hash/bytes/current identityを束縛し、SQL取得privateIDをexpectedへ転写0。jobはfailed2/cancelled1/succeeded1、成功record1、owner active/unknown0/readPinned0/refreshPending0/write active0。active正常closeとWAL/journal条件後だけwx opaque(unopened)→wx audit copy、一audit DatabaseSync(readOnly:true)/query_only/FK/integrity→actual auditclose/copyFDclose。正式schema列名とflat admission_identity/credential.subject/folder.id JSONは分担者が公開schemaで静的照合済み。過去private監査工具を参照0。

## 静的check・停止

最終 `node node_modules/@typescript/native-preview/bin/tsgo.js --ignoreConfig --noEmit --module preserve --moduleResolution bundler --target es2023 --allowImportingTsExtensions --skipLibCheck --strict --esModuleInterop --types node` にexact5pathを列挙し、actual exit0/出力なし。初回は--ignoreConfig不足、nodenextによるsource extension規約不一致、その後assert-function/migrator型/mts generic/Job state unionの型誤記を検出して修正した。失敗を最終成功へ消去しない。型checkは同helper解析のみでruntime/pure実行0、compile出力/cache生成0。製品規定typecheck/lint:fix/formatは同Cの既受入成功を借用し、この許可範囲で全repo mutation/check再演0。

補助runtime_ownershipはbrowser/stop-audit2path完成・hash固定・read/write/exec停止を通知済み。親のboot/provider/pure/report writerも本報告固定で停止する。新UI root/実行manifestの生成と全pure/runtime操作は独立preflight＋Managerの別指示待ち。実正常UI/nativeclosure/Chrome native modes/DBaudit/BFCacheは未実行のまま。
