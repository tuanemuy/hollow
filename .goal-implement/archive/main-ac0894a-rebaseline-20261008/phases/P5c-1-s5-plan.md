# P5c-1 S5 接続・配備・契約UI案

## 状態と判断事項

2026-09-29。S4候補 `c4c5eb08560488433d0eff0a81b235dcd6b25683` の独立確認中に作成した静的案。S3部品受入とS4の局所根拠を基点とし、S5開始・製品変更・新root・試験・保全・実Google接続の許可ではない。実行環境はVerifier専有。本書だけを編集する。

対象は固定P5c-1-A〜Fに残るNode接続、未構成起動、通常停止、同bundle契約UI、0038の既存データ適用。backup/P5c-2、Drive再生成/P5c-3、退会、保留中の音声は含めない。S4案の32 HTTP等の暫定値を採用済みと扱わない。

先にManager判断が必要なのは、(1)下記factory/launcher quiesceの最小interface、(2)CSPのSPA遷移とSSR nonceの実装範囲、(3)契約用factory/ブラウザinterceptionを製品設定から分離する検証方式、(4)段階別の保存集合・実行上限。新DDL/依存/共有domain変更は提案しない。

## 現コードからの直接差

- `server.node.ts` はGoogle/OpenRouter/LLM factory、各runner、専用HTTP handlerを組むがDriveは未登録。`HollowContainer.drive?` とS4の`DriveServices.runtimeGeneration/picker`で型は足り、`serverHollow.ts`/`hollowTypes.ts`/`serverNode.ts`の変更は既定にしない。
- S3 `createNodeDriveRunner` はwake/stopを持つが自身の周期timerはない。S5 rootが初回wake、受付wake、60秒maintenanceを所有する必要がある。GETからwakeを呼ばない。
- S4 `createDriveHttp` はcallbackとPicker/selection POSTを処理するが未登録。callback単一正本は`loadDriveConfig`がAPP_URLから作る`/auth/drive/callback`。通常DTOとsecret POSTの経路は分離済み。
- 現`listen.node.ts`は`server.close()`完了を待ってから`booted.shutdown()`。進行中callback/PickerがDrive outboundを待つ場合、受信close待ちの前にDrive停止を開始する入口が要る。全runner/DBのshutdownを先行するだけでは他の進行中requestを壊す。
- 既note/publication/media/PDFのCSPは個別response/iframeに閉じる。アプリ文書全体のnonce付きscript policyは現静的照合で見つからず、`__root.tsx`は`HeadContent`/`Scripts`を出す。Google originを既note sandboxへ追加してはならない。

## Node factory・boot・wake・stop

### 内外境界

新`packages/core/src/adapters/node/drive/factory.ts`を候補とする。`createNodeDrive(base, options)`は次を受ける：configFile optional、APP_URL、canonical local DB path、専用runtime directory、wake callback。戻り値は`null`又は`{services: DriveServices, callbackUrl: string}`。config検証→専用runtime取得→execution/HTTP/authorization/provider/protectorの順に一回構成する。generationはruntime record・execution・services・root runnerで同一。adapter内にDB importを追加せず、DB接続/current/CASは既applicationのまま。

productionは既固定endpointの`NodeDriveHttp`を既定factoryで生成する。任意endpoint/baseURL/envによる送信先変更は追加しない。config/keyring各16KiB・鍵1〜8本・32B・0600/直親0700・no-symlink・49,095B平文上限はS3を維持。`HOLLOW_DRIVE_CONFIG_FILE`のみ新設定入口。runtime directoryはcanonical DBの直親に専用`.drive-runtime`を置く案で、既LLM/PDF/writer ownerを流用しない。remote DBや`:memory:`で専用前任bindingを証明できなければ、構成時は有限拒否し架空のfile pathを使わない。Node単一local参照配備の範囲をdocsに明記する。

`NodeServerDependencies.driveFactory?`を既auth/OpenRouterと同じserver-only注入面として追加する案。署名は`(base, {canonicalDatabasePath,runtimeDirectory,wake}) => Promise<null | {services,callbackUrl}>`。通常起動は未指定でproduction factory。契約helperだけが既`DriveRequestFactory`を自己loopbackへ写像する。client入力/envフラグで選べるfake modeは設けない。

未構成は`drive`なし、専用入口は既有限未構成応答、設定GETは保存状態とconfigured=falseを区別する。通常password/既Google/ノート利用を継続。明示された不正config・鍵欠損/権限不正はS3どおり有限boot失敗であり、黙って未構成成功へ変えない。keyringを復元したとの推測で旧envelopeを書換えない。boot途中失敗は、このbootが取得した資源だけを通常終了・有限診断し、未知ownerを削除しない。

### 順序

1. config/パス検証と明示0038適用状態の確認を行う。bootでmigrationを暗黙実行しない。
2. 同DB専用runtime record取得、前任実終了証拠をexecutionへ渡す。前任不明は送信不可。新世代への既操作付替えやprovider再送はしない。
3. `hollow.drive`を組み、root runnerを一つ生成。listen可能になる前に前任proof→DB CAS→commit ACKのmaintenanceを一度完了させる。pending/unknownがあればfail-closedのまま理由を有限化する。
4. 初回wakeを一回、以後受付wake/60秒timerを同runnerへ合流。global2/account1、callback/Picker直実行も同execution coordinatorのまま。60秒tickは秘密なしで失敗を記録し未監督Promiseを放流しない。
5. `fenceAuthenticationRequest`後、通常SSRへ渡す前にDrive handlerを登録。既auth/OpenRouterのpathとcookie/fenceを変更しない。設定/履歴/receipt GETは外部I/O0。

### quiesceの最小公開root契約

`NodeServerBoot`とlauncher内部型に`quiesce(): Promise<void>`を追加する案。これは業務portではなくNode rootの停止interfaceである。

- 同期に`accepting=false`、Drive timer解除、同一Drive runnerの`stop()`を一回開始し、そのPromiseを保持する。abort通知を始めてから受信listenerのclose待ちへ進める。
- launcherは`const q = booted.quiesce()`を開始して拒否を監督し、`server.close`のPromiseも直ちに開始する。q/受信closeの両方が成功してから既`booted.shutdown()`へ進む。qをawaitしてからserver.close開始にせず、片方の失敗を未監督にしない。
- rootはDrive専用受信handlerの進行Promise/Response body寿命も追跡し、Drive stopとその終端をdrainする。一般requestのDBを先に閉じない。Driveが未知closeならqを成功にせず、後続DB close/成功exitへ進まない。有限状態を報告し所有を保持、forcekillなし。
- shutdownから直接呼ばれた場合も同quiesceをawaitする。Drive正常閉鎖後に、既LLM→auth/OpenRouter→PDF/ZIP/export→検索/batch/import等→worker cleanup/DB closeの相対順序は変えない。launcherが既requestを先にdrainする性質も維持する。
- S3 stop内部のabort→caller終端→実close proof→DB保存→ACK/maintenanceは変更しない。Map消失/timeout/受信response endを終了証明にしない。新claimは停止後不可。旧wake failureのみで復旧後stopを永久拒否しない。

このroot差は専用boot/drain対で確認する。既LLM/import停止の実装を全面再設計しない。既listenerの同時終了が必要な場合だけ上記2pathへ差を限定する。

## handler・CSP・ブラウザ境界

専用POST4KiB/selection16KiB/secret response64KiB、通常DTO128KiB、same-origin/現在本人/no-store/private/no-cache/no-referrer/nosniffを維持。callback state/codeは受信内部だけ、303先はoperation IDのみ。HTTP request logger/boot loggerへ元URL・headers・causeを渡さず有限codeにする。callbackは一回消費入口で、pure receipt GETとは別。

2026-09-29に[Google公式Web Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker)を限定確認した。固定loader `https://apis.google.com/js/api.js`、`gapi.load('picker')`、Picker iframeの`docs.google.com`、API keyのweb restrictionでapp originとdocs originが必要なことが記載される。これはCloud設定・SDK・CSPの実成功ではない。公式sampleのGIS browser token取得やrevokeは今回方式に追加しない。新scope/SDK依存も不要。

CSPの推奨は、既sandboxを不変更に保ち、アプリ文書側の固定script入口とframeだけを限定する方式。開始候補はscriptのself＋nonce＋`https://apis.google.com`、frameのself＋`https://docs.google.com`、connectはself。`object-src 'none'`/`base-uri 'self'`等は既router/RSC挙動との直接対を置く。これはGoogle SDK全依存先を満たす確定allowlistではない。公式の上記資料から全connect/子script originは確認できず、wildcard・unsafe-eval・policy削除で埋めない。未確認先が必要なら実接続前の追加一次確認/判断へ返す。

重要な未決はnonceのframework配線とSPA遷移。`/settings/drive`直アクセスにだけheaderを付けても、他routeからclient遷移するとdocument policyは変わらない。settings routeだけpolicyを緩めたと称さず、アプリ文書共通policy＋必要時だけ固定SDKをloadする案を推奨する。ただしSSR/RSCの全inline scriptにrequest nonceを正規APIで渡せるか、公開installed型/一次docsの短い静的確認が必要。`Asset.d.ts`のnonce一箇所を見たことだけでStart全体対応を断定しない。`__root.tsx`/router/startへの必要差はexact根拠を出してから許可を求め、HTML本文regex書換えはしない。これが大きな共有差となる場合、CSPを未完として分け、UI成功だけでE完了にしない。

contract browserでは製品bundleのfixed loader要求だけを、外部送信前にテスト所有の有限fake SDKでfulfillする案。OAuth固定認可URLも自己合成同意画面へinterceptし、自己callbackへ通常redirectする。製品が任意script/provider URLを受ける穴を作らない。fakeはGoogle UI/権限grant/実CSP依存/審査の証明ではない。外部全拒否をfixture側で維持し、未知hostは停止する。

## actual編集pathと旧条件の直接影響

|候補path|最小責務|旧IDの限定影響|
|---|---|---|
|新`packages/core/src/adapters/node/drive/factory.ts`と同test|既8部品構成/config/専用owner/generation|P5c-A/C/F。旧auth/LLM内部非変更|
|`apps/web/app/server.node.ts`|factory注入・handler・wake/timer・quiesce・shutdown|P1-E起動/停止。P5a-C/Gは既fence/dispatch共存だけ、必要な実差が出た行のみ|
|`apps/web/scripts/listen.node.ts`、新直接test|quiesceとlistener drain順序|P1-E起動/通常終了。既worker runner本体は非変更|
|新`apps/web/app/presentation/driveSecurity.node.ts`と同test（採用後）|限定CSP/response policy|P5c-E/F。app文書の共通差が出ればP1-E、既公開/編集sandboxは不変更対|
|必要確定後だけ`apps/web/app/{start.ts,router.tsx,routes/__root.tsx}`|nonce正規連携|今は未確定・未許可。P1-EのSSR/RSC/hydration直接部分を申告|
|新`apps/web/app/worker/node/__tests__/driveBoot.integration.test.ts`|未構成/configured・restart/stop・handler契約|P5c-A〜Fのroot接続|
|`docs/runtime_node.md`、公開`.env.example`|専用設定・停止保全・未構成/実接続前提|P1-E配備手順/P5c-F|
|既0038 SQL/snapshot/journal|編集0、正式migrator適用のみ|P5b-1-Aの加算移行旧保持、P5c-F|

`driveHttp.node.ts`は原則登録のみで不変更。`drive/runner.ts`等S3所有契約、S4 component/serverFn/usecase、domain/repo/UoW/旧認証/OpenRouter/LLM/lockは不変更を第一案。差が必要なら先に申告する。routeTree再生成、新build資材copyは不要の見込み（純TS adapterは通常bundleへ入る）。build設定/worker資材の変更は必要性を確認して別申告する。

P2a-Eの履歴併設はS4根拠を借用し、UIで並存だけ確認。P5a-Eのログイン方法/SSO解除本体は変更せず、Drive解除時の既SSO保持を契約UIで観測する。旧条件を一括reopenしない。共有CSPが既本文側に届く場合はこの表の想定から外れるため実装前に止める。

## 実行段階と有限検証候補

以下は新規の許可申告案。いずれも未実施。S4独立差戻しがあれば先にその受入を待ち、同時編集しない。

1. **S5a 接続部品**：型→lint:fix→format、factory/config/未構成/秘密投影6対、root wake/前任/通常stop/途中boot失敗/unknown/handlerdrain8対、dispatch/CSP/SSR/SPA適用8対の最大22新対。S4 transport12は直接配線影響、S3 closure10はstop bridge影響を比例再照合候補とし包含を別記。S3 wire26・S4 app48/pure17/persistence20は不変更を借用、全反復しない。live HTTPが必要なroot対だけ自己port0へ限定し最大12要求/2MiB、HTTP逐次1。新case/test fixtureを先に固定する。
2. **S5b 凍結build**：規定checks後build1、source/apps/entry/dist/lock全配列を固定。built entryを使う未構成起動/設定済root smoke。同じsourceのcomponent成功をbuilt配備成功へ流用しない。旧PDF/LLM converterは起動/生成しない構成を優先し、通常bootが必要とする既監督資源はexact公開資材/停止手順を別申告する。
3. **S5c 移行clone**：下記新copyだけで0038正常/SQLfault/FKfault。全旧列/行/構造・ledger/FK/objects不変、正常3表追加、失敗atomic rollbackを確認。旧証拠DBの再移行はしない。
4. **S5d 契約UI**：同一built bundle・新contract、下記12操作群。外部0。自己全停止→opaque→更なるaudit→指紋同値。失敗時は保全して次試行の予算/権限を再確認する。
5. **S5e actualfresh**：clone正常と正式0038指紋確定後、開始再保全/現baseline一致を必須に、通常migrator1回だけ。boot/auth/UIはfreshで行わない。差/失敗は停止、復元/再適用は別許可。
6. **引渡し**：A〜Fの直接/借用/未実施、旧影響行、commit、公開path個別bytesとcanonical aggregate、SQL、全停止・外部未検証を固定し独立へ返す。S5成功でも実Google条件やP5c-2/3を完成としない。

新root候補は永続private base内`p5c1-s5-YYYYMMDD-XXXXXX`0700の一つ。今は作成0。旧公開helperのcopy許可は求めず、current公開sourceから小さい専用runner/監査を作る第一案。再利用が必要なら旧公開exact名/bytes/no-symlinkを別申告し、包括copyしない。

## 契約UIの集合・鍵・HTTP

新Hollow account1、通常signup/verify/local mailbox、WS/note/original/asset/LLM生成0。Google SSO保持を実DOMで確認する場合だけ同accountへ合成Google Identity1を既通常連携で追加する案。追加account/実Google0。Drive連携1（途中失敗/再連携を同accountで観測）、合成folder最大2＋shortcut1、全てprovider fixtureのmemory状態で実Drive物0。autoBackupは常に未提供/OFF。

UI12群：未構成と旧password経路、初回refresh不足、通常連携成功/SSO助言又は別account、token説明前POST0→Picker、shared/resource-key/shortcutの確認、trash案内、曖昧404案内、同ID create unknown→inspect404→明示send2/409→親確認、明示再連携失敗時旧保持→成功時新epoch、localunlinkとSSO保持、同command ACK喪失GET回復、390px/Tab/dirty/route・actor/履歴。全枝を実ブラウザで重複再現するのでなく、current競合/悪性payloadはS3/S4対を借用し各群の具体操作を確定する。

操作予約上限：Drive認可begin4（初回不足/初回成功/再連携失敗/再連携成功）、Picker5、folder選択4（正常shortcut、trash、曖昧404、再選択正常）、create1・same-ID sends2、confirm最大3、inspect1、unlink1、取消最大4。Picker5のうち1はACK喪失して選択0、残4が選択4に対応する。ACKはそのbegin応答を一回だけdropし、同command純GET・再POST0、次Pickerは明示取消後の別操作として数える。未確認表示literalは直接観測とcomponent借用を分け、文言捕捉だけで再armしない。

provider要求の予約：Drive code交換4＋cert取得最大4＝8、通常refresh最大5、Picker自体はtoken有効時外部0、4選択のmetadata/shortcut再検証最大8、create generate1＋send2＋inspect/結果metadata最大4＝7、合成SSO login/link用交換/JWKS最大8、計36。root local契約12を加え累積48要求、予備を無言再試行に使わず総上限50要求/累積wire16MiBを提案。OAuth同意画面/SDKのfixture配信、Hollow API/asset要求はproviderと別に最大1000要求/64MiBで計数し、body secretは保存しない。超過前停止。元32案ではSSO/ACK/各confirm分を見落とすため採用しない。

Drive HTTPはproduction URL/method/headers/body/response制約を先に実adapterで通し、`DriveRequestFactory`だけ固定許可endpoint→自己127.0.0.1:3101へ写像。一般URL代理を作らず未知pathはnative前拒否。callbackは正規built handlerへ戻す。実OIDC署名・nonce/scope検証は自己RSA2048一組の合成issuer claimsで通し、署名検証のfake化をしない。Google署名鍵/実本人/同意成立の根拠ではない。

新鍵候補はHollow invitation/sharing各32B、Drive AES2×32B、合成Google認証専用AES32Bの計5本160B。RSA2048pair1はmemoryのみ（private DER≤2KiB/public≤512B）。SSO省略なら専用AES1本を減らす。既秘密/旧keyring/private/mail/DB流用0。専用config/keyring各16KiB、自己runtime record16KiB、fakeSDK≤16KiB、OAuth page≤8KiB、総material256KiB・script/log/seal/cache8MiB（browser有限ログ各128KiB、全配列seal2MiB内）。実actor/token/code/state/key/body/ciphertextはtool出力0。

browserは従前の固定公開`/etc/profiles/per-user/hikaru/bin/agent-browser`を第一候補とし、新namespace `p5c1-s5-<root suffix>` /短session `p5c5ui`を提案。未取得/未起動。正式実行前に利用skillと公開referenceを読了し、documented network interceptionが使えるか有限に確認する。できなければ製品fake switchやDOM直submitへ逃げず、別の公開ブラウザ手段/権限を再提案する。

今回goal-implementは段階分離のため使用。manual-testのSKILLは方式比較として読了したが、明示invoke/委譲条件ではないため起動していない。同skillの自動seed/port走査/強制終了/Issue送信/失敗再演/restore手順をこの承認案へ取り込まない。将来CUAを選ぶならcomputer-useと該当browser skillを開始前に読了する。今はbrowser操作0。

起動許可後だけ3100/3101 exact不在・自己namespace/session/socket/regular/inode/既known PIDを確認。未知3000は非操作。browser no-auto-dialog・20秒/idle120秒・restore/state流用0。exact role/name候補1・現在actor/route・enabled・非遮蔽を確認、通常scrollだけ。未知dialog/timeoutは再POST/accept0で停止。秘密を含まない操作欄の有限投影で確認し、download/export/原本文字取得0。通常close→全PID/pipe/socket/ports/DBhandles0。note0なので通常削除対象なし、account/key/mail/input/backupは保持する。

## 移行・保全は別枠のexact申告

正本baselineは`/Users/hikaru/.local/share/hollow/verification/p5b3a1-independent-20260929-oMeLTO/final`（07:32:24.828）だけ。ledger38/100業務表/953列/204trigger/16objects3891Bを基点とし、objects aggregateは既報告の`a6668191a82704dae709badef1d6c167a6a6a93ab3dfda929332849d7e7d34bc`。表示専用root/gate/proofはactualfresh基点にしない。現在fresh exact DB/storage pathと停止状態は未読・未照合であり、許可前の申告時に管理正本で確定する。推測パスをmigratorへ渡さない。

唯一opaque/元freshへ監査driverを直接接続しない。停止実証→regular/no-symlink集合→copy前後stat一致→新opaque→更なるauditcopyだけ接続の順。objects/資格/旧値は内部比較してbool/count/bytesだけ記録。0038 SQL/snapshot/journalはS4基点から不変更で、旧100表の再構築0、新3表/guardのみ。ledger39・業務103表が正常予想で、実数は新SQL監査で確認し台帳と業務表を混同しない。

|順|新root相対保存集合|追加DB数|driver接続可否|
|---|---|---:|---|
|開始|`start/app.db`、`audit-start/baseline/app.db`、`audit-start/current/app.db`|3|startはopaque。baselineは既finalからの更なるcopy、currentはstartの更なるcopyだけ監査可|
|clone|`clone-0038/{normal,sql-fault,fk-fault}/app.db`、`audit-clone-0038/{before,normal,sql-fault,fk-fault}/app.db`|7|startコピーのclone3に通常migrator/故障runner。終了後のaudit4だけ比較|
|契約UI|`contract/app.db`、`contract-final/app.db`、`audit-contract-final/app.db`|3|contract通常利用、final opaque、auditだけ停止後検査|
|本体適用前|`premigrate/app.db`、`audit-premigrate/{baseline,current}/app.db`|3|baselineはstartの更なるcopy。currentはpremigrateから。元fresh/opaque監査0|
|本体適用後|`postmigrate/app.db`、`audit-postmigrate/app.db`|2|正式migratorのみ元freshへ1回。post opaque、auditだけ旧全値/新schema照合|

計18保存DB。局所成功tempは正規finally、失敗1保持＋逐次active1の最大20DBを提案。移行/保全DB枠192MiB、activeはsidecar込み16MiB、opaque/audit各8MiB。各段階で実使用＋active16MiB＋未作成copyの実source bytesと余白を再guardし、見積りを容量実測と称さない。activeが16MiBを超す予兆（WAL等）があれば実行前に見直す。UI/局所検証は先行32MiBで始め、移行枠は別許可時だけ加える。old/new失敗証跡を削除して枠を戻さない。

objects copyは原文集合のまま最大64KiB/集合、累計512KiB別枠。note0の契約storageは空を確認する。監査用schema/public構造・logはother8MiB内、SQL/body/秘密diff0。cloneのSQLfault/FKfaultはprivate runner注入のみで正式SQL変更0、元baselineへのrestoreを行ったと称さない。

actualfresh適用前にpremigrateがstart/最新基点と全旧一致しなければ停止する。成功時のみ`apps/web/scripts/migrate.node.ts`の通常入口をexact DATABASE_URL allowlistで1回使う。環境全量を継承せず、既鍵/認証/Google/課金は不要。本体0038済みと判明したら再適用せずManagerへ返す。失敗/差は復元・再適用・既DB削除をせず停止、保持済premigrateと失敗状態を返す。正常終了後のpostmigrateを新actualfresh停止保全に採用するかはManagerが判定する。

## 固定条件への根拠と限界

|固定条件|S5直接候補|借用/残限界|
|---|---|---|
|A|built callback/fence/認可不足・成功・再連携/ACK|S2/S4 current/悪性境界、S3 OIDC有限wire。実Google本人/同意未検証|
|B|Picker説明→専用POST→server確認/対象名/失敗案内|S3/S4 shared/key/shortcut判定。実grant/実共有Drive/完全SDK CSPは未検証|
|C|boot前任・wake・same-ID unknown/409/明示確認/stop|S1/S2 strictsends/非復活、S3 proof。契約HTTPと実Google副作用は別|
|D|localunlink確認/旧SSO維持/owner drain|実backup取消はP5c-2。provider revoke/delete0|
|E|同bundle日本語/未構成/日時/dirty/ACK/390/Tab/秘密非露出|componentの構造確認を実layoutと混同せず、実GooglePicker未検証を明記|
|F|checks/build/公開指紋/clone・actualmigration/全停止保全|旧native全反復0。外部・最大性能・hardRSS/OS隔離の保証なし|

見込みはS4受入後、配線/停止と比例試験4〜6h、CSP最小共有配線の判断/検証2〜4h、保全clone/契約UI/本体移行4〜6h、報告/独立準備1〜2hの計11〜18h＋独立別。CSPやbrowser interception未確定を時間内成立保証にしない。15分ごと具体根拠/障害/次手を報告し、各許可集合が成立したら追加磨き・無関係再試験を増やさない。

## 独立S4からの引継ぎとDの未完接続

Managerから、同actorのresult route A→BでB読取失敗後に旧A receipt/currentが残りA cancelのmock POST1へ届くE反例の確定連絡を受領した。S4候補の凍結を維持し、ここで修正/反証試験はしない。S5はS4修正の独立受入を基点にし、上のcandidate IDを無条件の最終基点とはしない。

別のD残件は静的に確認できる。`control.ts`の共通admitは`driveServices(c)`とlinkedを要求し、`disconnectDrive`もそれを経由し、Tx後abortも同serviceを要求する。needs-relinkや未構成時の独立解除はこのままでは成立しない。既S3 HTTP部品の受入を取り消す話でなく、P5c-1-Dの未完接続として次の最小案を追加する。

- `disconnectDrive`専用のlocal admissionを`control.ts`内に置き、他のfolder/refresh/Pickerのlinked/configured条件は緩めない。現在本人/browser/auth世代・初回actor+command/digest・跨表collision・expected epoch/settings・同account live disconnect1・既queue例外を維持する。linked/needs-relinkの保存済credentialを内部参照するが復号・provider・protector.availableを要求しない。
- 正規disconnect行受付→現actor/epoch/settings再照合→旧attempt/candidate/folder control取消intent、資格/folderのlocal消去・epoch/CV/SV進行、disconnect receiptを既Tx/CASで保存する。既command再照会は同actor/同digestだけ、接続なし/既解除は新資格を捏造せず有限現在状態へ戻す。新table/state/列を既定としない。既0038と型がこの正規経路を許すか、実装前に必要範囲だけ照合する。
- held ownerは保存値をそのまま保持。現在このprocessが所有するexecutionがあれば、protector利用可能性とは別にexact owner abortをcommit後通知する。service不在ならabort成功/close成功を偽装せず取消intentとownerを保持する。後に専用runtimeを正規復旧したときだけ前任実終了/証拠/DB CAS/ACKへ収束する。再構成待ちを外部再送許可へしない。
- UIは未構成/needs-relinkでもlocal資格を失効できる独立ボタンを認可fieldsetのconfigured gateから分離し、保存済状態/現在actorで判定する。「Hollow内の連携を解除」と「通信の終了確認中」を分け、Google側revoke・既folder削除・Googleログイン解除を行わない。P5c-2のbackup取消完成とは表示しない。
- 追加候補pathは既`application/integration/drive/control.ts`、`DriveSettings.tsx`と直接tests、既`driveApplication.integration.test.ts`のみ。read DTOに新権限booleanが必要かは最小静的照合後に判断し、clientだけで可否を保証しない。新共有port/DDLが必要なら別提案。
- 最大8局所対をS5a22へ追加し新局所30以内とする：linked互換、needs-relink、未構成、queue飽和、unknown owner保持、二重/跨command/current拒否、protector不要かつHTTP0、後の実close収束の正負。UI設定gate対を含め、S3 closure10と重複した結果を合算しない。HTTP追加0。将来contract UIでは最後のlocalunlinkをneeds-relink又は未構成再起動下で一回行う案とし、リンク/解除回数を無言追加しない。

本書以外の編集0。製品/test/helper/root/DB/runtime/browser/build/新材料・鍵/旧proof/実API操作0。公開source/設計と上記公式資料の静的読取だけを行った。全文EOF確認後、文書を含むread/write/runを全停止しManagerへ返却する。S5実装・実行は別委譲を待つ。

## 2026-09-30 S5a exact追補：接続とlocal-only解除

### 今回の境界と採否

S4修正候補`a85ccdd84bd1a690e68e752e8d38cf904d11aebf`の独立確認中の静的補足。正式着手前の案であり、製品・test・新root・鍵・DB・HTTP・browser・buildの作成/実行はしていない。本節は前記「S5a新22＝factory6＋root8＋CSP8」と「localD8を追加して30」の配分を置換する。**S5aはfactory6＋root8＋localD8＝新22対**とし、CSP8は後段へ送る。

対象はNodeのDrive構成/世代/handler登録/wake/停止と、needs-relink・未構成下のHollow内解除だけ。共通nonce方式と専用Picker文書方式はどちらも未採用で、S5aでpolicy/SDK/routeを追加しない。build/同bundle UI/actualfresh0038適用/保全cloneも後段。既S4結果画面の修正やbackup/音声は触らない。S5aのsource接続成功を配備・実Google・実画面合格と表現しない。

### 1. exact製品境界

|候補path|S5aの差|旧受入への直接影響|
|---|---|---|
|新`packages/core/src/adapters/node/drive/factory.ts`と`factory.test.ts`|S3構成部品のfactory、未構成null、同一generation、固定endpoint|P5c-A/C/F。既auth/LLM内部は不変更|
|新`apps/web/app/driveRuntime.node.ts`と`driveRuntime.node.test.ts`|Drive専用boot準備/wake/timer、専用受信task、quiesceのroot資源所有|P1-Eのboot/stopに届く箇所、P5c-C/F|
|`apps/web/app/server.node.ts`|factory/DriveServices/handler注入、初期maintenance、quiesceと既shutdownの接続|P1-E。P5a-C/Gは既fence後のdispatch共存のみ|
|新`apps/web/scripts/nodeShutdown.ts`、既`listen.node.ts`|純粋な停止順序helperをlauncherから利用、Promise監督。helper対は上のroot8内|P1-Eのlistener drain/正常終了だけ|
|`apps/web/app/presentation/driveHttp.node.ts`|専用request abort時のbody reader取消と読取終端待ち、dispatch直前signal確認|P5c-E/F。method/origin/本人/bytesの既制限は不変更|
|`packages/core/src/application/integration/drive/control.ts`|disconnect専用local admissionとoptional実owner abort。通常folder等のadmitは不変更|P5c-D/F。旧P5a認証/SSOデータの書込なし|
|`apps/web/app/components/hollow/DriveSettings.tsx`と同test|解除buttonだけconfigured fieldsetから分離、既確認/command/ACK/current維持|P5c-D/E。Shell/notes.jobsは非編集|
|`packages/core/src/adapters/libsql/__tests__/driveApplication.integration.test.ts`|新localDの実DB6対だけ追加、旧期待は不変更|既application根拠のうち解除/取消/純GETのみ直接再照合|
|新`packages/core/src/adapters/libsql/__tests__/driveRoot.integration.test.ts`|root8のうち前任・初期maintenance・stop unknownの実DB3対|P5c-C/F。既closure10の期待は不変更|

表の展開は**既7path＋新6path＝13path**（factory2、driveRuntime2、server1、nodeShutdown1、listen1、driveHttp1、control1、Settings2、application test1、root DB test1）。新`nodeShutdown.ts`の試験を別fileに増やさず`driveRuntime.node.test.ts`へ置く。既`driveHttp.node.test.ts`等transport3fileは原則実行だけ。`driveClosure.integration.test.ts`/`driveFixtures.ts`も再利用・実行だけで、型fixture差が必要ならexact差を先に戻す。

domain/repo/UoW/ports/DDL/snapshot/journal、既Google/OpenRouter/LLM、request設定共通schema、build/CSP/router/docs/.envは非変更。環境設定の新nameはserver rootが読む`HOLLOW_DRIVE_CONFIG_FILE`だけで、運用docs追加は後段の配備と合わせる。新依存なし。P5b-1-Aの移行、P2a-Eの履歴、P5a-C/GのOAuth本体を一律reopenしない。新root helperはcurrent公開sourceから作り、旧proof/helper/privateをコピーしない。

### 2. factory・generation・未構成

factoryの内向き依存は`Pick<HollowContainer, "clock" | "tokens">`までとし、UoW/DBを受け取らない。入力はreadonly `{configFile?: string; appUrl: string; canonicalDatabasePath: string | null; runtimeDirectory: string | null; wake: () => void}`。戻り値は`Promise<null | Readonly<{services: DriveServices; callbackUrl: string}>>`。未構成ではパス/鍵/runtime取得も不要。明示構成時だけlocal canonical DB path・専用directoryを必須にし、remote/`:memory:`を偽のlocal所有へ割り当てない。

`loadDriveConfig`→`acquireDriveRuntime`→`NodeDriveExecution`→`NodeDriveHttp`→`NodeDriveAuthorization`/`NodeDriveFolderProvider`/protectorを構成する。configのcallbackUrl、services.runtimeGeneration、execution/runtime recordを一正本で一致させる。readonly picker設定は既Servicesだけへ。constructor/factoryにDB importなし。鍵Bufferの複製/破棄はS3の保護責務を維持し、JSメモリ消去保証とは称さない。

`NodeServerDependencies.driveFactory?`はserver-onlyの同署名注入。通常はproduction factory、テストだけ既`DriveRequestFactory`へexact固定endpoint→自己loopbackの写像を注入する構成済serviceを返す。製品config/env/client入力に任意provider URLやfake flagを足さない。factory公開署名へテスト専用endpointを追加しない。

serverはDBを開いた後、既local file DBの実canonical pathから専用`.drive-runtime`を導出する。明示0038適用済みDBだけを使い、bootでmigrationしない。前任の確定終了→proof→同DB CAS→commit ACKの`maintainDrive`をlisten前に直接awaitし、`wake()`の内部catchをboot成功判定の代わりにしない。S3のbounded維持処理でまだ前任証拠/未ACKが残る場合は有限未準備として返し、勝手に無限loop/再送をしない。初期完了後にrunner生成/初回wake1、受付wakeと60秒timerを同runnerに合流する。GET由来wake0。

boot失敗では今回取得したexecutionをstopして証拠を保存できる範囲を確認し、既他runnerの停止順序は変えない。owner.jsonは永続記録であり、factory例外やMap不在だけを理由に削除しない。同processで同directoryへ再acquireしても前任終了とはならない。S5aは後述の専用fake root harnessでこの順序を確認し、既本体`boot()`を起動しない。実server bootとdistの検証は後段に残す。

未構成時も専用pathを一般SSRへ落とさず既有限応答へdispatchする。callback pathは`/auth/drive/callback`の一正本、通常POSTは`/api/integrations/drive/{picker,selection}`。既fence後、旧authentication/openRouter dispatchの相対順序を保ち、その後にDriveを置く。未構成なら秘密POST失敗、callbackは秘密なし結果routeへの既応答、local解除serverFnは利用可能とする。設定GETは既保存stateとconfigured=falseを区別し、GETから復号/外部I/O/取消をしない。

### 3. quiesce・受信・outbound・DB終了の別証明

`NodeServerBoot.quiesce(): Promise<void>`とlauncher内部の同型だけを追加する。新root ownerは`accepting`、timer、Drive受信task集合、進行中quiesce Promiseを保持する。applicationに資源registryを持ち込まず、S3executionのproof/coordinatorを置き換えない。

1. `fetch`は最初にacceptingを検査する。Drive専用3pathは**最初のawait（既fenceを含む）より前**にtaskとabort controllerを登録する。同一JS同期区間でquiesceが割り込まないため、登録前stopなら拒否、登録後stopならdrain集合に必ず含む。fence後と専用handler開始直前にもsignal/acceptingを照合し、stop後の新claim/body処理開始を拒否する。一般requestの登録/強制取消を新設しない。
2. quiesce呼出し時に同期でaccepting=false、timer解除、登録済Drive受信へabort通知、S3 runner.stop開始。body読取中はrequest.signalに連動して専用reader.cancelを一回開始し、pending readとcancelの両settlementを監督してhandlerを有限拒否へ返す。cancelが未解決ならhandler終端未証明のまま。method/origin/4KiB・16KiB制限を緩めない。
3. rootは専用handler Promiseのfinallyまで追跡する。現在のDrive応答は有限buffer JSON又は空303であり、Responseを作ったことをnative送信終了としない。callbackが結果を捨てても、S3 withCallerの最後のDB保存/ACK終端は別に待つ。body reader取消やAbortSignal通知だけでsocket終了/HTTP閉鎖を記録しない。
4. launcherの停止helperは`q=quiesce()`をまず開始し、直後に既`server.close(callback)`も開始。両Promiseへ直ちに成功/失敗handlerを付けて未監督rejectionを防ぎ、両方のsettlementを照合する。q成功とlistener close成功が揃ったときだけ既shutdownへ進む。`await q`の後でlistener closeを始める順序にはしない。
5. nativeの受信request/response/socket寿命は既Hono/Node listenerが所有する。productionの停止根拠はlistener close callback成功、検証ではさらに自己socketのclose、response finish又はclose、client request closeを別boolで観測する。rootのtask0やreader.cancel完了はこの代用にならない。一般keepalive/送信中requestを新たにdestroy/forcekillしない。
6. qはroot lock/coordinatorを保持してS3stopをawaitしない。stopのabort→lock外caller drain→proof/current CAS→commit ACK→maintenanceをそのまま通し、入れ子coordinateを作らない。callback/Pickerを含む受付停止とDB閉鎖の間に全元callerを収束させる。DB closeは既worker cleanupまで遅延する。
7. いずれかunknown/失敗なら成功exit/DB closeへ進まず、有限失敗を返しowner/task/証拠を保持する。有限watchdogによる「観測打切り」を実closeに変えない。後に実closeが揃った場合の明示drain再確認は同じ停止世代で可能とし、accepting=false/timer停止のまま、新claim/restart/再送を起こさない。過去の失敗Promiseを永久に成功不能の正本にせず、同時呼出しだけcoalesceする。自動無制限再試行はしない。

`shutdown()`直呼出しもqを通り、既LLM→authentication/OpenRouter→ZIP/PDF/export→検索/batch/import等→worker cleanup/DB closeの相対順序を保持する。launcherからの正常経路では先に既listener全request drainを完了する。既signal handlerの停止Promiseには有限catchを付けるがrawcauseを出さず、reject時process.exit(0)を呼ばない。新timeout成功扱い/全一般request killは追加しない。

### 4. local-only解除の保存契約

現在の`control.ts`は共通admit先頭とcommit後abortで`driveServices`を要求する。これはprotector.availableとlinkedを要求し、needs-relink/未構成解除を阻害する。一方、現domainのneeds-relinkはcredentialを保持し、repoの`connectionCurrent`はunlinked以外の同subjectを許し、disconnectのinsertにはqueue枠例外・同account live1が既にある。connectionのdisconnect CASと0038 CHECKも正規unlinked/epoch進行を表現できる。従ってdomain/port/repo/DDL変更を本案の前提にしない。

解除専用admissionだけを分離し、`DriveConnection & {state:"linked"|"needs-relink"}`の保存済subjectを使用する。provider tokenの復号/refresh/HTTP/鍵利用可能性は不要。actor/session/browser/auth世代、actor+command immutable digest、跨表collision、expected epoch/settings、同account live disconnect1を維持。queue飽和は従来の解除例外だけで通す。通常folder/Picker/refresh/認可の構成条件は緩めない。

既同commandは同actor/digestだけのreceipt再利用とし、完了済みなら新epoch増加/取消をしない。unlinkedへの新commandは新subjectを捏造せず有限現在不一致。queuedの既commandは現在rowとconnectionを再照合して正規Txを続行する。取消済/terminalを復活しない。

Txで旧attempt/controlの取消intent・資格/folder/null化・epoch/CV/SV進行・disconnect完了を保存する。旧ownerはnone/closed/active/unknownの実値を保ち、terminal化とHTTP閉鎖を分離する。commit後、`c.drive?.execution`がある場合だけexact所有へのabortを通知する（protector.availableを再条件にしない）。service不在ではprovider仕事0、所有解放0、旧heldは後の正規前任回復まで保持。DB/commit不明を成功解除へ畳まず同command純GETへ導く。既SSO/session/identity、Google grant/物、利用枠を変更しない。

UIは解除buttonと確認だけをconfigured-disabledの認可fieldset外へ移し、busy/current/stateで制限する。設定不能を「解除不能」と表示しない。外部取消を成功と呼ばず「Hollow内の連携解除」と「処理の終了確認」を区分する。既command保管/uncertain→GET/dirty/actor guardを再利用し、同command自動再POSTや新確認仕様は追加しない。restore/reselect/newの利用者決定、autoOFF、実backup取消はP5c-2という境界を維持する。

### 5. exact試験集合と包含

|集合|新対数|方法と有限目的|
|---|---:|---|
|F1〜F6 factory|6|F1未構成はFS/runtime0、F2正常構成・同generation・固定HTTP1、F3明示不正configは有限拒否、F4remote/memory/callback境界、F5自己live ownerの再取得拒否、F6取得後の構成失敗で新送信0/自己資源終了・記録保持。DB0|
|R1〜R8 root|8|R1初期maintenance→listen/初回wake順、R2handler現在fence/純GET/秘密header/未構成、R3実終了前任→同DB保存ACK、R4受信中quiesceとlistenerの並行drain、R5body待機abort・登録/stop race、R6unknown時DB close0→実close/ACK後明示drain成功、R7wake合流/60秒timer解除/重複停止、R8旧auth/OpenRouter/SSR dispatch不変。R1/R3/R6だけ実DB、他はroot fake/lifecycle対|
|D1〜D6 local application|6|D1needs-relink→解除・SSO保持、D2service不在/鍵不可のlinked・needs-relink→HTTP0、D3queue飽和＋live disconnect1、D4active/unknown取消保持→fake実close後正規回復（late採用0）、D5actor/browser/epoch/settings/跨command拒否、D6同command receipt/ACK再照会・queued中断再開/取消terminal非復活。各case内の正負を別caseへ水増ししない|
|D7〜D8 local component|2|D7configured=false/needs-relinkでも解除導線、D8busy/current/確認取消・ACK純GETで再POST0。構造/イベントだけ、browser layout0|

新22＝factory6＋root8＋localD8。比例既25＝transport12（`driveInput.test.ts`、`driveServerFn.test.ts`、`driveHttp.node.test.ts`）＋`driveClosure.integration.test.ts`10＋旧application3（`independent disconnect keeps authentication and never revokes provider grant`、`cancel targets only the owned request and rejects its late result`、`pure settings receipt and history reads perform no writes or provider work`）。**直接最大47、非重複**。applicationの実行は新6＋旧3＝9/既48全体ではなく、root DB3＋closure10と合わせ実DB22 case。旧48/closure10をさらに部分和へ二重加算しない。filterはexact test nameの固定allowlist、選択case実数をreporterで照合する。

原則この集合を一回ずつ。新factory/rootの内部開発部分runを最終47に加算しない。負対が必要なら本集合内の修正前runとして別履歴・資源加算し、失敗後無許可再runしない。型→lint:fix→format→有限unit/DB。wholeunit/全app48/全S3wire26/移行3は反復しない。借用はS4 pure17/persistence20/残app45、S4修正のResult12を含む不変更component範囲、S3wire26/authprune8・0038移行3の実差非到達範囲。closure10とtransport12は今回直接なので借用へ重複記載しない。新受信取消差はS4transportだけでnative証明せずR4/R5を対応づける。

### 6. 新root・素材・所有・HTTPの上限申告

新root案は`p5c1-s5a-20260930-XXXXXX`一つ、0700排他。現在未作成。公開sourceからrunner/config/reporterを新作し、実行時に選択されたpublic sourceだけimportする。旧proof/sourcecopy/DB/private/秘密/manifest流用0。test runner childは逐次1、cache無効、`TMPDIR=<P>/gen1`/`DRIVE_TEST_ROOT=<P>/gen1/db`、正規成功tempだけfinally cleanup。本文/hash/鍵/ciphertext/provider error/stackを出さずfinite code/bool/countに限定する。

|資材/実行|exact提案上限|
|---|---|
|DB|保存失敗1＋逐次active1の最大2、DB/WAL/SHM合計32MiB、各active16MiB。新localD6＋root3＋closure10＋旧app3を同時1で順次。fixtureが空DBへ既0038まで適用する初期化はするが、移行受入3の再実行/actualfresh適用ではない|
|自己AES|`config/active.key`、`config/previous.key`の2本×32B、0600/直親0700。新生成のみ。RSA/SSO/Hollow invitation/sharing鍵0。OAuth署名wireをS3から借用し、S5aで新code交換成功を必要としない|
|config|`config/drive.json`、`config/keyring.json`各16KiB以内・計32KiB。不正形は同case memory入力/自己test専用pathのみ、既rootの資格へ触れない|
|runtime記録|`runtime/{configured,collision,partial,predecessor}`の4directory。各`owner.json`≤16KiB＋atomic置換時temp≤16KiB、全4同時最悪128KiB。`recovery.lock`最大各1・0B、正常正規release。未知lock削除0|
|generation|成功acquire最大5＝configured1/collision1/partial1/predecessor2。collisionの第2取得は拒否。root通常restart実証はpredecessor child→parentの1回だけ。他root対はmemory fake runtimeで新record0|
|前任child|専用1回・同時1、通常IPC終了だけ。childはroot新runtime記録を取得、DB/network0。親が既知PIDのexit＋stdout/stderr/IPC close→ESRCHを確認してから同directoryの後任取得。生存中確認は拒否対、kill0。test runnerとこの専用childは別計数（runner1＋専用child1が瞬間最大）|
|素材|上記keys64B＋config32KiB＋runtime最悪128KiB＋自己canonical-binding marker4×32B以内＋固定request/response fixture合計≤32KiB＝196,800B以下、material256KiB内。markerはfactory単体のパスbinding用regular fileでDBと称さず、root DB対は実fixture DBを使う|
|other|新helper最大8本×64KiB、有限log合計1MiB、公開seal/manifest2MiB、自己child IPC/pipe累積64KiB、その他config/report reserve512KiB、cache0の約4.1MiB予約。other8MiB上限、素材は別計数。全array指紋の追加重複保存は無条件に増やさない|

HTTPは**要求総上限12、予定11、累積wire2MiB、同時HTTP1**。自己127.0.0.1:port0のserverは同時1、最大5回のlisten lifecycle（F2、R2、R4、R5、R8）。予約port番号の走査/3100/3101/3000への接触0。

- F2：実NodeDriveHttpの固定metadata要求1（自己requestFactory写像）。
- R2：callback2、Picker2（新規/receiptのみ再操作）、selection1の受信5。application呼出しはfakeでoutbound0。tokenは合成値を内部assertのみ、秘密応答を保存しない。
- R4：受信1。outboundは有限deferred fakeで、実native接続を2本同時にしない。自己response finish/closeとserver socket closeを直接観測。
- R5：専用POST途中body1。通常clientの終了/cancelで自己socketが閉じる対だけ。watchdogは成功条件にせず、未知closeなら止める。
- R8：旧auth1/旧OpenRouter1/一般fallback1の受信3。既dispatchのfakeを使い実SSO/SSR bundle起動0。

計11。各要求は固定body/headersを含む送受信保守予約128KiB、11×128KiB＝1,441,792B≤2MiB。残1要求は自動retry用ではなく上限の余地であり、追加原因が出たら申告する。handlerに入れるin-memory Request、DB fakeprovider呼出し、実loopback要求を別計数する。全Google/Drive/OpenRouter/mail/SDK endpointへの実送信0。秘密なし有限計数を保存し、payloadの全記録でwireを測らない。

各DB case前に実保存量＋active16MiB≤32MiB、素材/other実量＋そのcase最悪reserveを照合する。失敗DBはclose後そのまま保持し再接続0、次generation前にManagerへ有限根拠/容量/残存を返す。失敗保存2本を作る余地はこの案にない。HTTP/child/socket/DB終了がunknownなら同じ予算内でも後続停止。forcekill・広域ps・未知artifact除去・失敗証跡削除で枠を戻さない。成功DB cleanupは既fixtureの自己exact集合のみ。

DB seed上限は各case account4/connection4/attempt24/control32、queue飽和対だけaccount2/control合計102。note/WS/original0。F3の不正configとF6の取得後失敗はtest-only module factoryの有限読取/constructor拒否で注入し、製品の任意factory入口を広げず追加不正config保存0。正規config/keyring/鍵の実読取はF2、permissions/重複kid等の細目は不変更S3対を借用する。S5aのfactory構成試験をS3全wireの再実行と称さない。

### 7. 判定と次段への残件

採用待ちは、(a)13path/Node root quiesceと専用body abort差、(b)local-only解除の専用admission、(c)新22＋比例25＝47と資源表。S3 execution/共有port/DDLを変える必要が判明したら実装前に再申告する。見込みは接続/停止3〜4h、localD1〜2h、比例試験/報告1〜2hの5〜8h＋独立別。段階内の実装者成功をA〜F全体完了にしない。

S5a後もCSP二案の選択、SDK依存先/Cloud審査、build/dist、同bundle browserの日本語/390/keyboard/ACK、正常clone/故障rollback/actualfresh適用・停止保全は未実施として残す。latest actualfresh基点`oMeLTO/final`には今回read/copy/接続しない。バックアップ/Drive再生成/実Googleと保留音声も別の未完範囲。

本追補は公開sourceと採用designの静的照合のみ。本書への追記以外のwrite0、製品/test/helper/root/DB/HTTP/browser/build/鍵生成0。EOF全文確認後、全文書を含むread/write/runを停止してManagerへ返却する。
