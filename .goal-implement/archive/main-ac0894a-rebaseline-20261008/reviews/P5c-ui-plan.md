# Drive 残 UI 計画の独立比例レビュー

## 新C/B完成 binding の独立判定

2026-10-05T20:33–20:35Z。C=`c2a3d45f1097533c6344346aca303dc1d2aef368`、新B=`/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-348847e5-ea53-4aed-8940-995bc59826e8`。公開source/dist/material manifestだけを静的照合し、**同候補・必須assets・namedexport/private graphの完成binding条件は個別合格**。UI起動/実browser/bridge純対を合格へ含めない。自己の新test/build/runtime/DB/Worker/browser/root操作0、旧B/failedprivate操作0、生成秘密本文出力0。

release正本regular/nonlink600・3,701B/SHA256 `93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0`、linked artifact/build/source/link四manifestのexact path/bytes/SHAを直接照合した。1457source blob/20,978,281Bはgit Cと全一致、前後hash/source manifestも同値。492outputs/23,200,855Bはbytes/SHA全一致、source/dist mode700/600、97exactlinks＋唯一AGENTS linkも一致。両RSC各69reference/bootstrap1/JS82CSS7の全89assetが新clientに存在。482JSの独立3215literal edgeは相対欠落/dist外/mandatory bare欠落0、optional PDF3は各try/catch内を確認。主3329件数との差は集計範囲の追加観察を継承し、再走査・差戻し0。named boot・相対client・cwd aux16も成立。

named `NodeDriveBackupSource` はentry内の同名ClassExpressionへ直接exportされ、entry SHAは `5ecc231d17b11d31b9de23a50199fe141366dcf3120174f709b952cd592d0573`。同moduleの唯一readCloseUnproven Symbolをerror class/guardが使い、FileObjectStorage・BackupSource・backup runnerが同guardを参照する。BackupSourceの実register呼出、source.closed成功時release、拒否時空handler=release0、closed Promiseそのままの返却をASTで直接確認。Unproven同graphの静的条件は成立し、実close faultの追加native再演は行わない。BusinessRuleErrorは新entryのquery-G26IDSH8.js import alias a→BusinessRuleError、module SHA `bb2b1bf41a2bea332c16627bd8d77e9c1f89204966e5dff09adc6ddd0fd5656b` を新manifest/実exportから固定した。旧aliasの推測流用0。

規定checksと新build/終了はprimary直接記録の借用：archive PID13954 exit0/0.622秒、Vite13955 exit0/4.695秒、search13956 exit0/0.465秒。各known PID/PG不在・redirectFD close・PIPE不使用・stop0、finalroot55,522,484B/採用枠内、全writer/session停止・所有権返却。S3 A–D/backend根拠とE source/guard/checkを継承し、新Cのartifact不足も今回解消した。残UIは採用済工具/profile設計と未作成5helperの型/純対/停止guard、新root実行条件の独立preflight待ち。自己artifact照合は終了し、P5d案のread-onlyレビューへ戻る。

## 新C archive build helper の独立 preflight

2026-10-05T20:28:26Z。新公開 `.goal-implement/helpers/p5c-ui-build-generator.py` を許可済公開845版と比例照合し、preflight合格。regular/nonlink600・14,610B・SHA256 `f7fc4c63ebcfc468c547b8cfa06320f4ef779df7a33ec4d72f9401dc802e9056`、base13,811B/SHA845db9全文同値を直接確認した。差分はC c2a3d45f・新root prefix・stdlib re・entry namedexportのfail-closed lexical確認とそのmanifest fieldだけ。既mode/wx/700/600/97links/capacity/200ms/archive60/全600/自己PG finiteStop/redirectFD/CLI/cadenceとsource/blob照合は不変更。namedexport lexical gateはentry/local identifier/hashを記録する予備確認であり、class/privateSymbol同graphの証拠へ昇格しない。alias/privateSymbol/ASTと同Cの新成果は後続独立staticへ残す。outer/embedded compile成功はprimary借用、source準備build一巡へ進める。自己prepare/root/CLI/build/test/browser/DB/旧private/root/helper操作0。UI-P3の正式起動制約採用・実観測は別gateとして維持する。

## UI-P3 macOS の最小起動契約案

2026-10-05T20:25–20:27Z。許可された標準二候補だけをlstat/Info.plist確認：`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` はregular/nonlink0775・367,696B、com.google.Chrome/154.0.8037.93。標準Chromiumは不存在。公開codesign metadataはGoogle LLC/Team EQHXZ8M8AV、CDHash `c635fc379480f1e5b56c772595ddc12709261116`。署名metadata取得だけでChrome CLIは実行していない。公開executableはUIrootの700/600規則の対象へ取り込まず、起動前後に同候補metadataを固定する。

[Chromium Apple GetTempDir](https://raw.githubusercontent.com/chromium/chromium/main/base/files/file_util_apple.mm) はMAC_CHROMIUM_TMPDIRを優先し、未設定時はNSTemporaryDirectoryへ落ちる。child限定envでMAC_CHROMIUM_TMPDIRとTMPDIRを同じ新ChromeTMPへ固定する案が必要で、TMPDIR単独からSingletonの配置を保証しない。[mac Singleton branch](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/process_singleton_posix.cc) はsocketのUTF-8 pathを253byte以下で扱う。新root生成前にChromeTMP＋唯一native temp名＋SingletonSocketの最大長を計算し、超過なら別root/probe追加ではなく短い同root内名へ補正する。installed154 tagとのsource同値は未確認なので、配置・mode・targetは初回正常起動guardで確かめる未検証条件を残す。

起動案は既public Puppeteerのlaunchにexplicit executablePath、custom新userDataDir、protocol=cdp、pipe=true、headless=true、dumpio=false、timeout=30秒、handleSIGINT/TERM/HUP=false、ignoreDefaultArgs=['--disable-back-forward-cache']と限定envを渡す。自前umask0077・finiteStopを維持し、新root以外へenv設定差を広げない。標準初期pageを唯一のdefault contextで再用するなら余分なcontext/page生成を避けられる（default contextは独立closeせずBrowser.closeで終了するため停止案へ明記）。別contextを選ぶ場合は初期page/implicit contextも実countsへ計上して採用前に補正する。ARIA一意handleのvisible/enabled/current ticketを確認して単発click、dialog一回応答、interceptionは許可host/pathだけfixture応答して外部continue0。Browser.processの自己handleでexit/closeとstdio0–4の各end/finish/closeを役割別に記録し、未使用stdinを閉じ、stdout/stderrは生文字列を保存せず有限にdrainする。子PID/PGとclosedの実証は別ledger、killを正常drainへ変換0。

例外は新profileのSingletonLock/Socket/Cookieと新ChromeTMPの一登録700dir内socket/対応cookieだけ。lockは自己launch PID/PGとの一致、cookieはmemory対照、socket targetは既所有ChromeTMP内の字句pathと全親dir lstat、symlink不追跡で束縛する。socketにはregular600を当てず、同UID・group/other権限0を必要条件とし、正確なowner permissionは初回guardの有限分類へ残す。symlink modeを後付chmodしない。Chrome profile内部の全regular600保証までは得られていない。[公開file creation](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/base/files/file_posix.cc) は通常600だが、[copy path](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/base/files/file_util_posix.cc) は元modeを引き継ぐ場合があるため、必要なら **Chrome profile内部だけ** regular{0600,0644}/dir{0700,0755}という有限補正をManagerへ提案できる。外側root/ChromeTMP/profile入口は700を維持し、各entry同UID・symlink/実行bit/特殊bit拒否、128MiB枠・例外名集合を維持する。他modeが現れたら成功へ補完せず停止/未検証、広いcache例外やchmod修正0。これは未採用案で、browser/profile/root/probe/install/旧private操作は全0。

## UI-P3 公開Puppeteer代案と新候補の比例照合

2026-10-05T20:19–20:24Z。公開installed `node_modules/.pnpm/puppeteer-core@25.11.0_yauzl@3.4.0/node_modules/puppeteer-core` のpackage/sourceと、その公開依存 `@puppeteer/browsers@3.2.2_yauzl@3.4.0` を読取。未確認Playwrightに代わるPuppeteer案は必要APIの面で成立可能。launchの明示executablePath/userDataDir/env/pipe/ignoreDefaultArgs、自己launch Browser.process()、browser.target().createCDPSession/Page.createCDPSession、request interception/respond/abort、ARIA query、Dialog.accept/dismiss、goBack、単context/pageを確認した。connect由来Browser.process()はnullなので、launchで得た自己handleを所有する案にする。SystemInfo等のCDP実応答/子一覧の完全性は未検証。locator.clickには内部retryがあるため、mutationは一意ARIA handle確認後の単発clickと有限ledgerへ限定し、unknown後のclick再試行0を新helperへ明記する。

public BrowserLauncher/@browsers launchはPOSIX detached自己PG、stdio3本又はpipe=true時5本、実exit待ちを持つ。Browser.close解決だけでは各pipe/FDの終了証拠にならないため、自己ChildProcessのexit/close/stdio終了を別記録する。libraryのsignal handler/close fallbackは即killも行うので、自前の採用停止期限と整合する明示handleSIG設定・正常終了とkillの区分を必要とする。custom userDataDir指定はisTemp=falseとなりlibraryのautomatic rm対象外で、失敗root保全に合う。省略時の自動temporary profileは終了hookでrmされるため採らない。dumpio=false、限定env、公開Chrome executableのexact bindingを固定し、download/install/cache探索0を維持する。25.11のdefaultArgsにはdisable-back-forward-cache文字列はなく、同ignoreDefaultArgs指定をBFCache成立の証拠にはしない。

Chrome profileの有限例外は必要。[Chromium公式POSIX source](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/process_singleton_posix.cc)（読取blob9a83a1d2d2f9bf68ac8b832744b34fbe00ca724e）はprofileのSingletonLock/SingletonSocket/SingletonCookie symlinkと、別700 temporary directoryのsocket/対応cookieを作り、shutdownでprofile側をunlinkする。したがって現planの「UIroot例外0/全entry regular600」はこの通常挙動と矛盾する。採用案は一つの新profileの三つのexact名、自己Chrome PID/PGに束縛したlock、同cookieをmemoryで比較する対、ChromeTMP内の新700登録dir一つとそのexact socket/cookieだけへ例外を限定する。lstat/readlinkの型と有限target検査だけを行い、lock/cookieをpathとして追跡せず、socket symlinkも任意targetへfollowしない。通常データは700/600/nosymlinkを維持し、control entryへregular600を適用しない。実binary/platformのsocket mode・temp target/prefix・path長制約とTMPDIR反映は未確認なので具体案の起動gateへ残す。公式main sourceは未固定binaryの実観測ではなく、新probe/旧profile読取で補完0。広いprofile例外や失敗後のcleanup/chmodで帳尻を合わせない。

新C `c2a3d45f1097533c6344346aca303dc1d2aef368`（親863097f）の独立delta preflightは合格。git差分はserver.node.ts一path・既NodeDriveBackupSourceの正規named re-export一行と空行の2insertionsだけ、HEAD一致/tracked clean/diff-checkも直接確認した。既class/logic/ports/DDL/LLM/backend/pure/RSC build修正は不変更。S3 A–D/P/app/native/auditとEのsource/guard/check根拠は継承でき、新C archive buildへ進める。規定checks成功・全writer/session停止はprimary借用。863/fae1の完成asset/export/hashを新Cの成果へ流用せず、新Bのnamedexport実binding/privateSymbol同graph・必須assets/moduleedges・同候補hashは後続独立static待ちに残す。工具/profile gateはUI起動に残るが、この独立準備buildの阻害条件ではない。新test/build/DB/browser/probe/install/旧B/root/helper操作0、製品/全体管理正本/goal編集0、外部/音声0。

## 正式 execution-plan の条件付き preflight

2026-10-05T20:07–20:09Z。`.goal-implement/phases/P5c-ui-execution-plan.md` をC863097f/fae1Bの公開binding・source契約へ比例照合した。二方向facadeとbuilt BackupSourceの最小export案は妥当。ブラウザ工具の公開bindingとprofileの許可種別が未確定のため、実行preflight全体はまだ合格にしない。全将来helperの実装調査やnative再演を要求する判定ではない。helper/root/browser/DB/build生成・実行0、旧B/root/helper/秘密資材操作0、製品/全体管理正本/goal変更0、外部/音声0。以下の旧UI-P1指摘は経過として保持する。

| ID | 現正式案の判定 | 必要な次の確認 |
| --- | --- | --- |
| UI-P1 | 計画上の不足は解消 | execution.runへ渡すworkの捕捉前でbuilt→source、backup provider/application捕捉前でsource→built。exact class/prototype/serializer/schemaを限定し、sync/async・往復identity・unknown/transport/Unproven非変換・success/closed/proof/ACK非変換を同じbridgeの純対へ結び付けている。実helperの型/APIと純対実行は後続preflight |
| UI-P2 | built BackupSource namedexport一path案は妥当 | Rootはserver.node.tsの既class namedexportだけを採用したと通知。新C/Bと同graph/export/hashの固定・独立delta照合は未完。現C/Bのままsource BackupSourceを使う起動は許可しない |
| UI-P3 | 起動gate未解消 | 「pinned Playwright」の公開package/version/pathとlaunchServer実装の所在・profile生成/停止APIがまだ固定されていない。repo公開node_modulesに該当Playwright packageは確認できず、Root発見の公開global agent-browser nativebinaryは別工具であり代用未採用。いずれを使うか、公開実装/型に合う起動argv/依存と一つの新profileの所有範囲を固定してからhelper案を照合する |

UI-P2の根拠：ObjectReadCloseUnprovenErrorはinstanceofとmodule内private Symbolの両方で認識される。source BackupSourceがbuilt storageのerrorを受けるとopen/readAtのguardで拾えずordinary source failureへ落ち得る。built storage→built BackupSource→built backup runnerを同bundle graphに揃える一path exportはこの因果へ直接対応する。BackupSource.openは実registerを先に呼び、Unproven open errorではreleaseせず同objectをthrowする。source.closed.thenは成功時だけrelease、拒否側はrelease0、close/closedも元handle/Promiseを通す。executionのresourcesが残ればclosed proofを作れず、runnerはdidClose=false/Unprovenを保持する。既公開unit sourceのopen-time/closed-rejection対と既寿命受入を借用し、この計画のための追加native faultを要求しない。exportだけでmodule graph同一を実証済みとはせず、新Bの独立staticへ残す。

UI-P3にはprofile guardの整合も含む。現案はUIroot全体「symlink例外0/dir700/file600」の一方、Chrome新profileを置くとしている。Chrome固有control entryのsymlink/socketが生成される場合、そのままではguard拒否となる。公開launcher未固定なので、現段階で実際のentryや生成場所を観測済みと断定しない。ChromeTMP128MiBへのprofile/関連temporary entryの置き方、種類・mode・参照先・所有Chromeとの束縛、終了後の扱いを有限に定める必要がある。例外が必要なら新profile内のexact control entryだけをManagerへ提案し、一般symlink追従・全root例外・既存profile探索・modeの後付け修正へ広げない。新ブラウザprobeやagent-browser代用を自動追加しない。

残stageは通常signup/verify/signinと2uploads、F1 trash/復元本人再選択/404、held backup中のfailed/same-sub success relink、同F2 IDのunknown/inspect/明示再送、retarget record/link/reload、実pagehide/BackとBFCache未成立区分を具体化している。元host/query/headers/bodyを公開NodeDriveHttp constantsへ束縛し、grant/metadata/ID/marker/offsetとnative request/socketの実closeを通す。mutation/confirm取消/ACK GETのみ、混在document観測破棄、fixture成功代行禁止は維持される。

256MiB/12分、正常uploads native Worker8・同時2、browse query/fork各16以内・逐次fork1/各Worker1、Chrome親1/子16/profile128MiB、logicalDB3/48MiBとstop120秒/known自己PID・PG finiteStopは有限案として具体的で、今回の静的範囲で追加重大不足を認めない。Worker/fork観測wrapperのpath/型/戻り値/stdio/終了identity、pure24条件以内30秒、normal stop→copy/audit一回のguard・正式SQL列は実helper preflightへ残す。これらの数値とBFCache欠測時の継続はManager採用前提。

## 初回 resume-plan のレビュー履歴

2026-10-05T19:32:30Z。候補 `863097f628f3bd5c7ffcc4b43ed0e590ed0cfc4b`。計画は未採用、起動前の条件付き案として扱う。公開sourceと計画・固定P5c-1 A–F/P5c-2 A/E/I/J・Drive UI契約・既レビュー要約のみを静的照合した。製品/全体管理変更、helper/root生成、DB/test/runtime/build/browser、旧root/helper/PID探索、外部/音声操作は0。

## 判断

必要な同bundleブラウザ証拠、fixture成功代行禁止、文書寿命、実終了と監査、有限操作数の重大な省略は見つけなかった。ただし下記 UI-P1 のcomposition案は現在のAPIと一致せず、具体化して独立照合するまで実行preflightを合格にしない。これは計画工具の不足であり、製品欠陥や新export追加要求ではない。

計画の旧読取HEADから現候補まで、指定Drive UI/server entry/Drive application・Node adapter群に差分0。S3 backendとE build設定の変更は別受入を参照する。現在の新B成果は待機中であり、親候補の必須preload欠落を修正済みと推測しない。

## UI-P1：エラーidentityの方向と適用位置

計画は「source execution.run の rejectionだけ」で「built側error identityへ」橋渡しする。しかし公開 `NodeDriveExecution.run` はworkのthrow/rejectionを内部で捕捉し、source `BusinessRuleError` のinstanceofとdriveFailureSchemaで分類して、handle.resultをfailure値としてresolveする。resultのrejectionをbuiltへ変換しても、既にDRIVE_UNAVAILABLE/unknownへ落ちた分類は戻らない。

逆方向にも境界がある。source `NodeDriveBackupProvider` は非成功statusでsource BusinessRuleErrorをthrowする一方、built backup runnerは同bundleのBusinessRuleErrorをinstanceofで判定し、driveBackupFailureSchemaによってfailure outcomeを作る。sourceエラーをそのまま渡すと本来のfailureが拾われず、execution側のfailureからDRIVE_BACKUP_UNKNOWNへ投影され得る。根拠は公開 execution.ts のwork捕捉、backupProvider.ts のrequireAccess/startResumable、backup/runner.ts のtransfer catchとsettle投影。旧helperの実装を読んでいない。

新exact bundleの公開exportからclassを統一できるかを先に確認する。できなければ、計画の五helper内で必要な境界と方向を固定する最小案をManagerへ提出する：built work failureをsource executionの分類より前で扱う境界、source provider rejectionをbuilt applicationの分類より前で扱う境界。許可instance/prototype・kind/code/retryable/serializerの正負対、同期throw/非同期reject、未知error/transport errorの非変換を起動前に示す。成功値、ownership/closed/ACK、socket/source終了を変換せず、一般的なエラー復旧や製品改変へ広げない。

## 条件を満たす計画部分

- relink失敗の旧folder/epoch/settings/job保持と同sub成功の取消・実abort/close/ACK、same-ID作成のunknown→GET→明示inspect404→同ID再送→確認保存を分けている。selection ACKをfolder作成成功へ代用しない。
- trashは明示外部復元済みfixtureと利用者再選択を区分し、404は曖昧扱い。retargetは旧closed/unallocated targetを正規preview/確認commandで新headへ進め、実record/link/reloadと旧結果不変を確認する。DB直書き・DOM成功挿入・unknownのnever-sent化を禁じている。
- 実pagehide/pageshow.persistedとreload Backを区分する。controllerのgeneration/secret消去、document nonce、現在DTO/ticketを照合し、BFCache不成立を未検証として残す。旧callbackは実保持参照のみで、合成eventやfixture証拠で埋めない。
- 正規boot/DI/worker/routesを使い、輸送先だけ自己fixtureへ限定する。新exactentryと相対client/worker/DDL/lockの同候補性を起動前に要求し、旧launcher探索・旧bundle再利用を避ける。
- 一度のmutation、確認取消POST0、ACK不明後GETのみ、document混在snapshotの破棄、callsite別predicate・有限countsを定めている。停止はbrowser/app/drain/DB/自己PID・PG/両pipe/FDの実終端を区分し、正常close後だけopaque/auditへ進む。未終端をclose成功へ変換しない。

## 限界・次の判断

新helper未作成なので型整合、具体的stage/endpoint表、純対、mode/容量/終了guard、実browserの証拠は未検証。12分・各資源枠・各mutation上限・BFCache単一欠測後の継続条件はManager採用前である。既acceptedの390px/keyboard/nonce/局所backend・migration/check根拠は借用可能性と直接browser不足を分け、全suite再演を要求しない。UI-P1補正と新B独立成果照合後に、起動案の採否を判断できる。
