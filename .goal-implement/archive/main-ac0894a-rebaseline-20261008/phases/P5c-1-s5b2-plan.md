# P5c-1 S5b-2 同bundle契約UI・起動の実行案

2026-09-30。製品・dist・主検証rootはfreeze。本書だけを編集した静的案で、実行許可ではない。新root/fixture/DB/鍵/helper/browser/server/networkの作成・起動・copyは0。候補 `6ac02ce1e30dbb9be1a03e4e24c855d4366a3e69` の独立検証中であり、DrivePickerPageのcurrentUser読取とsettings DTO actor照合の間についてVerifierが反例を調べている。差戻しがあれば修正と独立受入後の同bundleを基点にし、この旧candidateを実行しない。

入力はS5b-1候補、採用design/元固定P5c-1 A〜FとP1-E/P2a-E、旧S5b-plan、[tooling](P5c-1-s5b-tooling.md)、[capability末尾まで](P5c-1-s5b-capability.md)。受入条件を追加せず、既条件の実文書・配備・正常/代表異常をつなぐ。過去のDB/HTTP全枝は反復しない。

## 1. 固定bundleと3bootの配置

静的確認ではbuilt `apps/web/dist/server/server.node.js` はnamed `boot` をexportし、`boot({ driveFactory })` だけで既server-only seamへ注入できる。通常production mjsは選択entryと同directoryの `nodeShutdown.mjs` を読む。いずれも通常bundleを編集しない。

注意点は `boot()` がcwdの `.env` をloadし、worker資材をcwdの `dist/server/...` で解決すること。利用者のrepo `.env` を読む起動はしない。新0700 contract rootをcwdにし、そこには `.env` を作らず、`dist` だけを固定した公開 `apps/web/dist` への明示read-only利用symlinkとする案を採用対象へ出す。リンク先の全配列指紋を開始前/各停止後に照合し、旧private rootへのlinkやpublic distのcopyはしない。新root内の唯一の許容symlinkとして別計上し、generic budget walkerが追従して公開distをprivate容量へ重複計上しない。

|段階|起動入口と最小操作|直接確かめる条件|
|---|---|---|
|B1 未構成|絶対pathの現 `listen.node.mjs` を新cwd/限定envで起動。新account1を通常UI signup→自己localメールで確認。Drive設定の未構成表示、通常画面表示、明示停止|P1-E production entry/資材、P5c E/F 未構成の通常利用継続|
|B2 構成あり契約|新helperから同built named bootへdriveFactoryだけを注入し、同built nodeShutdownを使用。B1と同DB/accountへ通常signin。下表の認可/保存先/UI操作。通常停止|A〜Fの同bundle契約UI、nonce/document境界、遷移後GET、main root/owner停止|
|B3 未構成|B1と同じproduction mjs、Drive設定envなし。新browser contextで同accountへ通常signin。保存済linkedを確認→local解除→reload→jobs履歴共存を確認、通常停止|D/E/F 未構成解除の実入口接続、GoogleログインとDrive物の非操作、P2a-E履歴共存|

3段とも同dist/DDL/lock。各段でbrowserを正常closeしてからappを停止し、停止後opaque/auditを作る。ブラウザは最大3回のfresh launch、同時tree1/context1/page1。profile/storageState/cookieを段間で保存・複製しない。B1で作った自己fixtureのemail/passwordだけを新rootのprivate材料又は親memoryで保持し、B2/B3はUIで再ログインする。既存本人session/SSO/profile/CDP attachは0。

最初の新空DBへ現正式migrate.node.tsを既installed tsxのabsolute CLIで1回だけ実行する案。限定envのDATABASE_URLは新root内のabsolute file URL、移行sourceは現在の0038までの正本をそのまま使う。package scriptのenv-file optionや旧DB、schema生成は使わない。これはcontract DB初期化でありactualfreshへの移行受入ではない。

## 2. 構成ありのfactoryとwireをどう区分するか

製品NodeDriveFactoryは任意endpointを受け取らず、HTTPS固定送信先のままである。これを製品設定でlocalhost化しない。新helperのdriveFactoryは、受入済み公開sourceのNodeDriveExecution/acquireDriveRuntime/secretProtector/NodeDriveAuthorization/NodeDriveFolderProvider/NodeDriveHttpを明示importして組み立てる案とする。既installed tsxで新helperを実行すればsource側のTS/adapters依存を解決でき、built appはそのままbootできる。新依存・追加製品build・private monkey patchは不要である。

NodeDriveHttpの公開constructorにあるrequest factoryだけを自己loopback requestへ差し替える。originalの固定Google URL/method/path/許可headerをmemoryで照合し、最後にnative URLとoptionsのprotocol/hostname/portを自己listenerの実addressへ**両方**揃える。socketPath/host/auth/createConnection等のoverrideなし、URLとoptionsの完全一致をnative call直前にassert。443 fallback/redirect/retry/実Google0。要求・response・socketの実closeを各requestで監視する。

これにより同built app/root/usecaseと、同candidate公開sourceから読み込んだ実Drive adapterの契約wireを接続する。注入adapterがbuilt entry内部の同module instanceだとは言わない。通常factoryの実config組立はS5a、実wire/OIDCの広い枝はS3から明示借用する。built configured production mjsへ注入できるとは偽装せず、B2だけhelper bootであることを報告する。

認可fixtureは自己RSA2048pair1をmemoryで生成し、実NodeDriveAuthorizationのRS256/issuer/aud/nonce/expiry/at_hash/PKCEの固定条件を通す。認可URLのstate/nonce/認可code等はexact fake認可documentのrouteでmemory内だけに束縛し、bounded IPCで自己providerへ渡す。raw URL/secret/body/JWT/hashをlogへ出さない。認可失敗をfake verifyCandidateの成功返却で代替しない。鍵/private DERを旧rootから取得しない。

## 3. 最小操作表と有限provider予約

全操作は固定UIの現在本人を確認してから1回ずつ。native確認は本文/種別/候補1一致時だけ承認する。timeout/候補不明/見知らぬdialogで再click・再POSTしない。

|B2の操作|最大回数|観測と対応条件|
|---|---:|---|
|Drive認可|4|初回refresh不足で非連携→初回成功→明示再連携失敗で旧連携/保存先保持→明示再連携成功。chooseAccount/consent、影響確認、callback結果→設定GET、Google Identityを増やさない。A/D/E|
|Picker開始|5|shortcut正常、trash、曖昧404、通常folder再選択（selection ACK不明と兼用）、pagehide寿命の代表集合。B/E|
|selection POST|4|正常shortcut/trash/404/通常folderのうち最後の1件をACK不明対にも兼用する。残るPicker1件はpagehide/Back/明示取消の寿命観測に使い、selectionを増やさない。B/E|
|保存先confirm|最大3|shortcut targetの名称/ID確認→再検証、通常folder確認、folder-createの現在親確認。B/C|
|folder作成|logical1|事前ID1個。最初の作成ACK不明→同ID照会→曖昧404なら明示同ID再送1回→現在親の確認。別ID自動作成0。C|
|明示cancel|最大4|寿命/失敗操作の現在receiptをUIで取消し、実owner終了まで完了扱いしない。自動retryのための掃除ではない。C/D/E|

手順の実行前にこの表をcommand予約へ落とし、使わない枠を別シナリオの再試行に転用しない。特にrelink成功は既操作を終端させてから実施し、バックアップ転送0のため「旧backup取消が実行された」とは主張しない。P5c-2への利用者決定を保持する。

providerは最大32要求/10MiB、同時1。内訳の保守予約はcode交換4＋cert最大4、必要時通常refresh最大4、selection/shortcut/confirm metadata最大12、generate1＋create sends2＋作成inspect/confirm最大5。合計32×320KiB＝10MiB。合成tokenは通常1時間有効とし、UI試験のための不必要な待機・expiry操作を加えない。未使用refresh/cert枠は自動retry許可ではない。expected endpoint/phase/回数とbound token generationを外れた要求は転送前に有限拒否し停止する。

自動採用/target変更/unknown再送の広い全枝、403/401/署名異常全件、実前任再起動異常は受入済みS1〜S5aから借用する。この段階で新しく直接確かめるのは実UI/文書/同bundleの接続である。

## 4. HTTP redirectを含むbrowserの遮断

toolingはexact Playwright1.63.0 / Chrome154。RaaaPDの公開package指紋を再確認して使用するが、旧profile/cache/DB/resultsを読まない。公開helperを再利用するなら別途metadata→全文read→新rootへの排他copy/adaptであり、今回copyは0。

Chrome launchより前に自己HTTP proxyをbindする。launch optionのproxy.serverを自己実addressへ指定し、Playwrightの現固定版が既定で加える `<-loopback>` を保持してloopback直結の逃げをなくす。公開sourceのdesktop Chromium起動部43349〜43364とshouldProxyLoopbackの38302〜38308を静的確認した。bypass指定と `PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK` は限定envへ入れない。OS設定を変更せず、proxy自体は**自己Hollow originだけ**をforward可能にする。provider fixture origin・外部Google・未知HTTP・すべてのCONNECTはforward禁止。proxy targetはmemoryでscheme/host/portをexact照合し、Hollow上のredirectも外部へ追従しない。upstream agent:false、body/headers/要求数/累積bytes有限、accepted/upstream socket実closeを別に数える。

newContextはserviceWorkers:block。newPage前に単一catch-all context.routeとrouteWebSocketの拒否を登録する。exact `https://apis.google.com/js/api.js` だけ正しいJS MIME/nosniffでfake SDKをfulfillし、exact合成認可documentは同意とbounded callback URLを含むfixtureとしてfulfillする。実Google SDKのfetch、route.fetchによる外部転送、ignore HTTPS、CSP無効化、page evaluateによるSDK差込みは0。

**HTTP redirect後はcontext.routeを通らない。** callback→Hollow結果画面はproxyがsame-originだけforwardする。Google等の外部redirect先はproxyで拒否する。routeカウンタ0を外部要求0の証明とせず、proxyカウンタ/forward先と合成fixture直接結果を合わせる。proxyはDNS/OS全通信のfirewallではない限界を明記し、制御済みHTTP/CONNECTの外部forward0を証明範囲にする。

fake SDKは通常scriptとしてloadされる最小DocsView/PickerBuilder実装とし、合成選択は可視UIから行う。許可frame/拒否script-frame-connectの代表はこの合成SDK/小fixture内で観測し、製品bundleやwindowへ外からfakeを注入しない。実Google iframe通信・組織制限・scope grant成功とは区別する。header/SSR nonce/meta/inline scripts一致とhydration後のnonceは秘密を出さないDOM/response投影で確認する。必要なread-only DOM projectionの具体APIは実行委譲で固定する。

selection ACK不明は本人が押した1POSTにだけarmする。最初に観測したbounded requestのcommandをその1回へ固定し、exact same-origin selection endpoint/現在page/fixture選択と照合する。public `route.fetch` を使う場合はmaxRedirects0/maxRetries0、元Requestを変更せず1回だけ自己Hollowへ送り、responseを採用せずroute.abortで失う。これはHollow要求枠へ計上し、Googleには使わない。元POSTをcontinueし直したり、隠しcommandを直接再送しない。以後は可視「結果を確認」から同command GET、arm解除とPOST追加0を証明する。実装時に本人/commandとの一意対応を証明できなければfaultを発動しない。

## 5. 代表文書操作と履歴共存

同bundleでSettingsのdirty取消→値保持、承認→専用documentを確認する。専用文書では説明前GET/POST0、明示Picker→close、設定へ戻る、誤SPA/prefetchは局所受入と直接document観測を区分する。UIに誤SPA入口がない場合、hidden routerへの直接调用で実UI根拠を作らない。

通常navigation/Backで元policyへ戻ること、pagehideの旧selectionが採用されないことを合成fixtureで確認する。BFCacheが実際に復帰した場合だけpageshow.persistedを根拠に数える。ChromeがBFCacheへ載せなかった場合は通常Backの成功と区別し、synthetic event dispatchで実BFCache成功へ置換しない。

代表1画面を390px幅/通常Tab/折返し/disabled/pending/errorで観測する。jobsではDrive本人履歴と既ImportJobs領域の共存・過去Drive結果の読取を確認するが、ノート/jobを追加生成してリストを埋めない。他actor非開示の広い対は既DB/局所から借用し、account2を作らない。provider値だけで連携や保存先成功を決めず、UI GETと停止auditの保存結果を照合する。

## 6. 新資源と停止保全

新rootは採用後に排他作成する `p5c1-s5b2-YYYYMMDD-XXXXXX` 0700。実pathは実行前に報告。旧actualfresh/backupは非操作。公開distリンク以外のsymlinkなし。新root内の材料/鍵/DB/メールだけが後段の明示読取対象になる。

|対象|上限と保存|
|---|---|
|DB|新active1＋B1/B2/B3各opaque1/audit1＝最大7。sidecar含め総96MiB、active16MiB、各停止copy8MiB。異常の追加copyは再申告|
|fixture|account1、WS/member/note/original/asset/LLM/実backup生成0。Drive attempt最大4/control最大24。新mailboxの確認メールをboundedに本人UI確認へ使い、secret URLをlogへ出さない|
|鍵|invitation32B/share32B/Drive AES2×32B＝128B、新自己RSA2048pair1はB2 memoryだけ。Google SSO/OpenRouter鍵0|
|材料|256KiB：private configuration/keyring各16KiB、runtime記録計128KiB、fakeSDK16KiB/合成認可文書8KiB/provider fixture32KiB等|
|helper/log/seal|8MiB。新public helpers最大8×64KiBを基本とし、全指紋配列2MiB以内、有限ログ計1MiB。tsx compile cache無効、TMPDIR新rootのみ|
|browser TMPDIR|別枠128MiB、各boot fresh profile/artifacts。通常close後の正規cleanupのみ。失敗残存を手動削除しない|
|Hollow/browser|最大1000要求/64MiB、全3boot合算。static asset/読取poll/fixture/ACK faultの自己POSTを含む。read poll各30回/2秒まで|
|proxy|非Hollow背景/拒否だけの別counterを提案200要求/2MiBとする。Hollow forwardは上記1000要求/64MiB共用で二重の新予算を作らない。外部forward0、超過は有限失敗で新操作停止|
|provider|前節32要求/10MiB、同時1。自己listener1だけ|
|runtime/listener|Hollow1＋browser proxy1＋B2 provider1、browser control listener1。固定自己3100のexclusive bind又は自己port0を実addressから固定し、未知3000非操作|

B1/B3は開始時に自己3100をexclusive bindで確認→解放→実起動する案。既知自己childのstdoutから固定listen markerと実address一致を有限booleanへ投影し、child生存/終了を監督してからready GETへ進む。rawログは保存しない。bind競合やlisten marker欠落なら別portを走査せず停止。APP_URLは固定http://127.0.0.1:3100、B2のcontract callbackも同originにする。通常productionのDrive config loaderはHTTPSを要求するため、httpで実config成功したとは言わない。B2は注入factoryでcallbackを固定し、通常config境界はS5aから借用する。

停止順はbrowser page/context/BrowserServer正常close→appの新受付停止/quiesce/listener/drain→shutdown/DB close→各自己childと全pipe終了。B1/B3はproduction SIGTERM1回、B2は同shutdown helperの通常経路を1回使う。unknown終了を成功へ変えず、copyは全終了後だけ。opaqueは開かず、さらにaudit copyだけをdriver-openする。各停止でledger39/business103/FK0、同account保持、Drive状態/owner0、note/material/dispatch/LLM/消費0、Google Identity0を有限照合する。notes0なので通常削除回収も0。全account/鍵/mailbox/opaque/auditを保持する。

## 7. 自己終了の根拠と未確定点

修正済みpublic runnerはspawn直後にexit/closeと両pipe EOF/closeを同期登録し、それぞれを独立awaitする。旧capabilityの失われたpipe履歴を新成功で補修しない。Node smoke成功はrunnerの根拠だけで、3bootの実終了は毎回採る。

Playwright BrowserServer.process()から自己Chrome PID/stdio fd1〜4を直ちに捕捉する。context/BrowserServer.closeは通常1回。標準libraryが自己process groupへfallbackする権限は別途採用済みだが、signal発動又は終了未証明ならそのUI試行は不成功として停止する。手動forcekillや未知PID操作はしない。

control listener/accepted socketはBrowserServer公開APIだけでは個別closeが見えない。追加案は、取得したexact wsEndpointの自己host/portに限る終了後のexclusive bind probeと、browser harness Nodeの全pipe/自然終端を組み合わせ、listener解放とharness終了を別記する。最大3probe、未知port走査0。Chrome groupの残存についても、起動時に捕捉した自己PGIDだけの数値PID/PPID/PGID照会を必要時採用対象とし、未知process名/command lineの全体取得はしない。この追加観測を採用しない場合、旧capabilityと同じ『全OS子孫/個別control socket未証明』を残し、全終了を言い切らない。

proxy/provider/Hollow helperの自己serverについては公開Node socket/close eventを生成時から記録し、accepted/upstream/request-response/pipeを別々に確定する。HTTP返却やDB owner0だけでsocket終了を代替しない。自己資源の照合に必要な有限metadata以外は出力しない。

## Managerの採用点

1. 独立受入後candidateを固定し、新cwd＋公開distへの唯一のsymlinkで3bootする配置と、B2だけ公開sourceの実adapterを既boot seamへ注入する根拠区分。
2. 3 fresh browser launches、proxy背景枠200/2MiB、新browser TMPDIR128MiB、終了後exact control port probe最大3の追加実行枠。必要なら自己PGID数値照会の限定権限。
3. 3boot/7DB/32providerと表のUI操作、初期新DB正式移行1、128Bの新鍵。actualfresh0038適用は別のまま。

静的readで誤った既source filenameを数件指定してENOENTになったが、内容読取や代替実行はせず、実在する公開application/adapter/sourceへ限定し直した。製品・主root・tooling rootの変更0、package評価/import・新helper/DB/key/profile/listener・実HTTP0。本書を全文EOF確認後、文書を含む全read/write/runを停止し、Managerの次委譲を待つ。
