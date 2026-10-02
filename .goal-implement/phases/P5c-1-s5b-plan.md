# P5c-1 S5b CSP・同bundle配備の静的提案

2026-09-30。S5a `96f5c33705f10fe14e7115c9c0ffa975b9047734` の独立確認中に作成開始し、完成前にManagerから47/type・指紋同値・全停止と局所受入を受領した。製品/環境freezeは維持、本書だけを編集し、製品/test/helper/root/鍵/DB/build/browser/SDK/実API/旧proofを作成・実行・コピーしていない。管理正本/goal/spec/spec-implement非操作。

基点は[現S5案](P5c-1-s5-plan.md)と[CSP補助全文](P5c-1-s5-csp.md)、現在designのDrive節・固定A〜F。S5aの合否は独立結果に従い、差戻し時はこの案を停止して修正を優先する。以下の方式・数値は採用待ちである。

## 推奨と比較

**専用TanStack routeを通常document navigationで入出する案B**を第一候補にする。既Start build/認証/ServerFn/controllerを再利用し、新しい非SPA bundleやread APIを追加しない。全appのCSP変更は不要。ただしrouter/rootに文書境界とnonce伝播の共有差が届くため、その直接対を省略しない。

|案|最小構成|利点と費用|
|---|---|---|
|A 独立した小HTML文書|専用Node GET＋新client build entry＋必要な読取bridge|SSR nonceの共有差が小さい。一方既ServerFn/RSC manifestを独立bundleから使える根拠が未成立で、新API/build資材又はUI複製が増え得る。今回第一案にしない|
|B 専用TanStack文書（推奨）|新 `/integrations/drive/picker` route＋既Start SSR nonce＋document境界|既build/ServerFn/actor/current/receiptを使える。専用文書内でも既root providers/RSC/hydrationが動くのでnonce・退出を直接確認する必要あり|
|C 全app nonce|通常app HTML全体へnonce/CSP、既設定SPA内でPicker継続|導線移動は少ないがGoogle許可とscript制約が通常SSR/RSC/error/SPA全体へ届く。既画面全体の再確認が必要。専用化より広い旧P1-E影響、SDK全origin未確認も解決しない|

Bは同origin内のdocument policy分離であり、Google scriptをHollow originから隔離する別origin sandboxではない。通常app文書には今回Google用許可を追加しないが、従前CSPがGoogleを全面拒否していたとも、通常文書のXSSからGoogle要求が不可能になるとも主張しない。製品の正規loader実行箇所を専用文書に限定することと、全appネットワーク隔離は別である。

## 1. SSR nonceと現在documentの束縛

### serverから正規APIへ

Node通常Start dispatch直前のexact pathname `/integrations/drive/picker` だけで、serverのCSPRNGから16 bytes以上のrequest固有nonceを作る。GET/HEADの文書応答が対象。API/asset/既note-publication-media-PDF応答へ後掛けしない。query/header/client POSTからnonce・policyを受け取らず、GETからtoken発行/外部I/O/wakeをしない。

候補のserver-only request contextは `Readonly<{ drivePickerDocument?: Readonly<{ nonce: string }> }>`。同nonceを `entry.fetch(request, { context: { nonce, drivePickerDocument: { nonce } } })` に渡し、`getRouter()`が公開 `getGlobalStartContext()` を読み `createRouter({ ssr: { nonce }, ... })` へ設定する。通常文書は両field無し、他runtimeの既呼出はoptionalのまま。URLとの一致はNode rootで決め、routerは受け取ったserver正本だけを使う。

`entry.fetch`へcontextを渡すだけではnonceは伝播しない。installed sourceではSSR router生成→load/dehydrateより前に設定する必要があり、render callback後の注入では遅い。既HeadContent/Scripts/React stream/SSR script挿入とhydrateのcsp-nonce meta経路を使用する。HTML regexの書換え、文字列置換によるinline許可、clientからnonceを送って更新する方法は採らない。

応答headerとSSR nonceは同じ一呼出の値。HTMLは `Cache-Control: no-store, private`、`Pragma: no-cache`、`Referrer-Policy: no-referrer`、`X-Content-Type-Options: nosniff`。redirect/error/HEADでも秘密・古いcacheを残さず、header処理のためにstreamを全buffer化しない。正常・errorのHTMLだけへ同policyを付け、既callback 303の専用CSPは不変更。nonceは認可tokenではなく文書実行許可値であり、ログ/一般DTOには加えない。

### 誤SPA進入と退出

文書判定の候補型は `Readonly<{ kind: 'ordinary' } | { kind: 'drive-picker'; nonce: string }>`。clientでは**router bootstrap時、hydrate/route head更新より前**に元のdocument locationとSSRの単一 `meta[property="csp-nonce"]`、SSR scriptのnonce整合を読み、一度だけprivate closureへ固定する。元pathが専用pathでなく、正規nonceがない/複数/不一致ならordinary又は有限拒否。serverではrequest contextから一呼出ごとに作り、module globalへrequest nonceを保存しない。

このcapture用moduleをrouterの静的importに置く。lazyなPicker componentを開いた時点のDOMを「元文書」として採らない。後からroute headへmetaを追加、loader/query/POSTの値、現在pathだけの一致によってordinary→pickerへ昇格しない。既JSへXSSが成立した場合にmetaの真正性まで保証する仕組みではなく、信頼したSSR出力とheader一致をbuild/browser対で確認する文書寿命のguardである。

root `beforeLoad`の最初（現在のloadAppContextより前）に文書境界を照合する。ordinary documentから専用routeへclient遷移した場合はPicker component/SDK/POSTを動かさず、検証済み同originの固定専用pathへ `reloadDocument` 付きredirect。逆にpicker documentから他routeへSPA移動する場合も、現在世代を失効し、既same-origin routeのhrefへfull navigationする。専用routeはprefetchを行わず、一般Linkの誤preloadは副作用0・document遷移0の有限拒否とし、実navigation時に改めて判定する。実装時はinstalled redirect/preload APIの具体signatureへ合わせ、preloadでページを勝手に移動させない直接対を置く。

専用pathを直接開いた文書で正規server context/nonceがない場合は再reloadせず、有限な利用不可表示で止める。非Node配備やSSR異常をdocument redirectの無限ループで隠さない。

専用画面はShellを複製せず、固定「Drive設定へ戻る」と現在receiptだけを持つ。将来又はerror画面経由で既Shell Linkが存在してもroot境界を通る。document内でSDKが読み込まれたまま別業務画面へSPA移動する経路を残さない。通常document同士は従前のSPAのまま。任意returnTo、popup/opener、アプリ独自postMessage橋0。Google SDK自身のiframe内部実装までpostMessage不使用と保証する意味ではない。

`pagehide`/unmount/sign-out/route離脱ではcontroller.dispose、pending/read generationを失効し、late応答を新画面へ採用しない。BFCache復帰の`pageshow.persisted`でもcontrollerを再利用・自動POSTせず、現在本人/epoch/settingsを純GETで再照合して明示開始を待つ。古いdoc nonceはその文書policyと一組のまま、他document nonceに更新しない。ブラウザBackでordinary文書へ戻った場合はその元policyに戻る。Backで専用文書へ戻った場合も秘密参照破棄済み・受付再開なしを要求する。

## 2. 専用Picker UI・receipt・秘密境界

設定のPickerボタンは固定full navigationへ変更し、そのクリックではtoken POSTをしない。専用routeは既currentUserFnとdriveSettingsFnで本人/構成/linkedを確認し、未構成・未連携なら説明と通常戻りだけ。画面に次を表示してから、明示「説明を確認してGoogle Pickerを開く」で既controller.openを呼ぶ。

- access tokenをこのブラウザに渡すこと、以前許可したcombined権限を含み得ること。
- pickerExpiresAtはアプリの受付期限、accessExpiresAtはprovider期限。5分へのtoken短縮/downscope/画面closeでのGoogle失効は保証しないこと。
- 選択はserverの現在資格/非trash/folder能力/設定版の検証前であり、成功扱いしないこと。

既 `DriveInitialInput`、launch/selection専用POST、4KiB/64KiB/16KiB上限、no-store/current/一回accepted契約を維持する。token/ticket/resourceKeyはcontroller closureだけ、React state/action result/SSR/loader/URL/storage/logへ渡さない。固定SDK URLだけをloadし、GET/BFCache/結果照会からloadしない。新SDK wrapper依存やGIS client token発行は追加しない。

初回commandはPOST前にrefで保持し、ACK不明では同command純GETのみ。receiptが得られた後もserver採用前のtarget確認を省かず、既DriveReceiptPanelを使用する。戻り候補は次のclosed search union。token/code/state/resourceKey/任意URLは受け付けない。

```ts
type DriveReturnSearch =
  | { controlId?: undefined; controlCommand?: undefined }
  | { controlId: string; controlCommand?: undefined }
  | { controlId?: undefined; controlCommand: string };
```

UUID・一方だけ・長さ上限をrouteのvalidateSearchで検証し、既 `DriveReceiptLookup` へ変換する。新application port/DB列は不要。Settingsではuser＋lookup identityにstate/late response/actionを束縛し、A→B読取失敗後の旧A表示/操作を防ぐ。keyだけに依存しない。receiptが他actor/期限切れなら有限拒否、他actorのlive/目的は表示しない。locatorなしの通常復帰は既同actor live再発見を利用し、履歴やcommandを捏造しない。

設定にあるchooseAccount/consent等のdirty値は同documentのGETで上書きしない。専用文書へ進む場合だけ、未確定の入力があれば離脱確認を示す。取消なら移動0/値保持。承認したdocument離脱ではmemoryを破棄し、storageやURLへ保存して復元しない。新業務上の同意を離脱確認で代用しない。

## 3. CSPの確定範囲と外部未検証

候補policyは専用文書の `script-src 'self' 'nonce-…' https://apis.google.com`、`script-src-attr 'none'`、`frame-src https://docs.google.com`、`connect-src 'self'`、`object-src 'none'`、`base-uri 'self'`、`frame-ancestors 'none'`。これは**契約試験の開始候補であり実SDK完全適合済みpolicyではない**。style/img/font/default-srcを今回は包括変更せず、既React inline styleを許可するためにscriptのunsafe-inlineを追加する誤りを避ける。将来resource制限を足す場合は影響を別申告する。

固定loaderは `https://apis.google.com/js/api.js`、Google iframeはdocs.google.comと公式資料で確認できる。gapi動的依存の完全origin、inline生成/Trusted Types/CSP細部、実Cloud API-key restriction、組織制限、shared Driveの実表示は未確認。wildcard/unsafe-eval/strict-dynamic/全Google domain許可/エラー時policy削除で解消しない。nonce付きscriptはsource制限より優先されるため、未知のSDK子scriptへnonceを無差別伝播させない。CSPは実scriptにnonceを要求する部分と固定host許可を区別する。

SDK不能時は有限「選択画面を利用できない」→純GET/本人取消/設定へ戻るを維持し、自動再token発行0。fake SDK成功を実SDKのCSP成功・Google権限grant・審査合格へ流用しない。実接続前に必要originの一次確認ができなければ、その外部条件は未完のまま返す。

## 4. exact変更候補と旧影響

以下は実編集前の申告集合。新共有domain/port/DDL/依存/lock/auth/LLM/Drive owner契約の変更は提案しない。

|path|最小差|
|---|---|
|新 `apps/web/app/presentation/driveDocument.node.ts`、同 `.test.ts`|exact文書選択、nonce生成/header、通常応答不変更のpure境界|
|新 `apps/web/app/presentation/driveDocument.ts`、同 `.test.ts`|bootstrap一回のdocument binding、beforeLoadの入出/preload/BFCache判定。server request stateはglobalへ置かない|
|`apps/web/app/server.node.ts`|通常Startへ渡すcontextとHTML headerの限定接続。S5a handler/owner/drain順は不変更|
|`apps/web/app/router.tsx`、`routes/__root.tsx`|正規ssr.nonceとroot文書境界。既providers/HeadContent/Scriptsは維持|
|新 `apps/web/app/routes/integrations.drive.picker.tsx`|本人route、専用client component、読取だけの初期表示|
|`apps/web/app/routeTree.gen.ts`|新1routeの機械的型登録のみ|
|新 `apps/web/app/components/hollow/DrivePickerPage.tsx`、同 `.test.tsx`|既controllerを使う専用文書UI・世代/receipt/退出|
|`apps/web/app/components/hollow/DriveSettings.tsx`、同 `.test.tsx`、`apps/web/app/routes/settings.drive.tsx`|full navigation導線、dirty離脱確認、closed return locatorとcurrent state|
|`apps/web/app/components/hollow/DrivePicker.ts`、同 `.test.ts`|原則不変更借用。document許可の明示guardがloader入口に必要ならexact最小差を申告、勝手にnonce/任意SDK URL portを追加しない|
|`apps/web/scripts/listen.node.mjs`、`apps/web/scripts/build-search.node.mjs`|production launcherをS5aと同じquiesce契約へ接続、既nodeShutdown.tsを同じbuildで `dist/server/nodeShutdown.mjs` へ出力|
|新 `apps/web/scripts/nodeShutdown.test.ts`|production入口の共有helper利用とquiesce/listener/DB順序の比例2対、前任/HTTP全再演0|
|`docs/runtime_node.md`、`apps/web/.env.example`|Drive config/keyring/callback/未構成/localunlink/秘密/CSP/停止/実接続待ちの局所運用追記|

第一案は19実編集path（DrivePicker2は必要時だけで含めず）。`start.ts`、vite config、package scripts、新非SPA entry/read API、Shell、notes.jobs、application/domain/repo/migrationsは原則不変更。__rootに既ServerFnのRSC登録importが必要と判明した場合も同許可path内に限定し、秘密moduleをclientへ引き込まない。

productionの `start:node:prod` は現在 `listen.node.mjs` を実行し、同mjsはserver.close→shutdownの旧順序である。TS側だけのS5a成功をproductionへ適用しない。mjsからTSを直接importせず、通常buildが既nodeShutdown.tsをESMへbundleする。launcherが見つけたserver entryと同directoryの固定helperを読む案で、異なるbuild世代をfallbackで混ぜない。失敗を別candidateのimportで隠さず、quiesce/close失敗時にexit0を呼ばない。NodeServerBoot/業務portを再変更する必要はない。

旧受入の実影響はP1-EのSSR/router/hydrate/新route/production launcher/build/docs。P2a-Eは新return検索と本人Drive履歴の共存を実DOMで観測する範囲だけ、ImportJobs保存/DTO/件数は変更しない。P5a-Cはcallback前後の文書dispatch/CSP干渉なし、既認可/署名/JWKS/SSO解除は不変更。P5c A/B/C/Dは同bundleの既業務接続、E/Fが新CSP/文書境界・配備の直接対象。未変更の旧IDを一律reopenしない。

## 5. 最小検証集合と段階

この案の受入観測は既固定条件の具体化で、新gate IDを増やさない。先に新CSP8＋文書UI6＋production停止2＝新16、比例既はPicker9/Settings8/Result12/transport12＝41、**最大57局所対**を提案する。新UI6にはSettings locatorのA→B/lateとdirty離脱を含める。旧Settings2対の期待導線を専用文書へ合わせる場合は意味差を先に明記し、current/秘密/ACKの期待は保持する。DB不要のcomponent/pure/fake境界を使い、新application対/既closure全再実行は既定にしない。

|既6群|局所/同bundleで確認する観測|
|---|---|
|1 文書入出|ordinary→専用→ordinaryはfull document、誤SPA/preload/Shell Link/Back・BFCacheでもpolicy持越し/POST自動発行0。ヘッダー/SSR nonce/全inline script一致と通常文書不変更|
|2 受理前|GET/説明表示/未構成/未連携はtoken/SDK0。明示本人選択後だけPOST。nonce無し・旧doc判定ではload拒否|
|3 memory/ACK|発行/選択の一回性、秘密のURL/storage/SSR/React action/log非露出、同command純GET。期限2種を区分、unknownを再発行で消さない|
|4 current/寿命|actor/route/epoch変化、pagehide/BFCache/遅着で旧採用0。進行中退出は秘密破棄、server実owner閉鎖とは区別|
|5 許可範囲|固定SDK fake fulfillment、許可外script/frame/connect拒否、SDK失敗有限、既本文sandbox不変更。mjsのquiesce→listener drain→既shutdown|
|6 UX/receipt|日本語/名称・時刻/未提供OFF、native確認・dirty・readonly照会、390px/Tab/折返し、本人jobs履歴との共存|

規定typecheck→lint:fix→format→局所57→build1の順。失敗で製品差が出た場合だけ影響範囲を再計算し、旧47/wholeunit/native/移行3を機械的に反復しない。source/apps/entry/dist/lock全配列をcanonical方式で固定し、実UI開始後はbundleを変更しない。

同bundle stageは新contractだけ。未構成通常起動→signup/verify→全停止、同DBをDrive構成で起動→契約認可/保存先→全停止、最後に未構成起動でlocal解除→全停止の最大3bootを提案。最初の未構成bootをproduction mjs launcherの直接smokeに兼用し、別の第4bootは計上しない。第2bootは契約provider注入helper、第3bootは同production launcherとし、実入口の根拠を区分する。契約providerを注入するroot helperは同じbuilt entryの既server-only driveFactoryだけを使い、製品configの任意endpoint化やproduction fake modeを作らない。通常factoryの実config組立はS5a、実wire/OIDCはS3から借用し、同bundle注入の限界を残す。

contractのUI操作は、認可4（refresh不足/成功/再連携失敗/成功）、Picker最大5（正常shortcut/trash/曖昧404/正常再選択/ACK不明）、selection4、create1/same-ID sends2/inspect1/confirm最大3、localunlink1/明示cancel最大4に限定する。既accepted caseの全枝をUIで再実行する意味ではなく、この集合を実行前に個別command予約へ落とす。account1、WS/note/original/asset/LLM生成0。Google SSOの新連携は今回は0、既SSO保持はDB/既受入を借用と明記する。

## 6. ブラウザ方式とcapability前提

computer-use、built-in-browser、chrome-browserのSKILLを全文確認した。Webはnative desktop controlへ落とさない。built-in-browser skillは永続profile/利用者sessionとlocal preview到達の制限を示し、Chrome拡張skillも本人既存profile・dialog制限を持つ。今回の新専用profileと送信前interceptionを、それらが無条件に提供すると仮定しない。現CUA tool APIのsurface文書取得やbrowser接続も未実行であり、能力を確認済みとしない。

第一候補はこれまでの固定公開 `/etc/profiles/per-user/hikaru/bin/agent-browser` の新専用namespace/session。公開referenceを読んだ範囲では `network route --abort` と `--body` 応答、通常DOM操作がある。ただしJS content-typeのfulfill、document redirect、catch-all遮断とexact例外の順序、navigation前の全外部遮断を保証するexact APIは未確定。この一点は**実契約アカウント/認可を始める前の限定能力確認**として別許可を求める。現在は実行しない。

将来の能力確認は秘密なし合成小ページ1とfixed loaderの合成JSだけ。document開始前にself origin以外を遮断し、exact `apis.google.com/js/api.js` と必要な合成認可documentだけを送信前fulfillする。実外部到達0を有限counterで確認する。未知URLは記録全文でなく有限種別にして停止。Google実SDK/sourceのfetch0。製品bundle/SDK global/DOMへevalでfakeを差し込んでCSPを迂回しない。

scriptの正規content-type/byte上限を保つfulfillmentが使えない場合、製品loaderをlocalhostへ変更・CSP無効化・ignore HTTPS・本物Googleへ接続して埋めない。Managerへ同bundle実UI未実施として戻し、公開documented browser APIへ切替えるならそのskill/isolated context/interception契約と権限を先に確定する。

manual-testと共有CLI referenceは方式比較のため全文を読んだが、同skillのワークフローを起動していない。自動seed、広域port検索、forcekill、Issue/PR送信、録画再演、restore保存、秘密cookie列挙はこの案へ採用しない。新namespace `p5c1-s5b-<suffix>`、短session `p5c5b`、no-auto-dialog/20秒/idle120秒・restore保存なしを候補とし、unknown artifactは上書き/除去しない。

実操作はexact role/name候補1＋現在actor/route＋enabled＋hit-testを確認、通常scroll/Tabだけ。native confirmは全文内部一致＋種別＋候補1が証明できた場合だけ明示承認。未知dialog/timeoutは再click/再POST0。ACK faultはexact本人commandに一回だけ、原Request非消費、restore/disarm/追加POST0を別に証明する。console/networkのraw token/URL/code/state/body取得は禁止し、finite count/bool/statusだけに投影する。

## 7. 新資源・容量の申告候補

いずれも未許可・未作成。新root `p5c1-s5b-YYYYMMDD-XXXXXX`0700一つ、旧proof/helper/key/DB/results流用0。current公開sourceからrunner/contract/監査を新作する。

|対象|提案上限・根拠|
|---|---|
|局所57|DB/HTTP0を基本。production停止2はfinite fake listener/bootで、実shutdownは後のbuilt段階。runner逐次1、cache無効、開始PIDと全pipe終端を先登録|
|DB|新contract1＋各3停止のopaque/audit各1で保存7。総96MiB、active sidecar込16MiB、各copy8MiB。各stage actual＋active＋残copy実source/余白をguard。失敗保存が増えれば停止再申告|
|contract DB初期化|新空DBへ現正式0038まで通常適用1回。既DB/actualfreshの移行受入とは別。fixture account1/Drive1、attempt≤4/control≤24、notes0|
|鍵|新Hollow invitation32B/share32B/Drive AES2×32B＝4本128B。Google SSO/OpenRouter専用鍵0。自己RSA2048pair1を必要な合成OIDC署名だけmemory保持（privateDER≤2KiB/public≤512B）|
|runtime/boot|同contract最大3boot、Drive構成1boot/成功acquire1、前任専用child0。writer/LLM等の既通常ownerは各boot正規取得・正常終了、未知artifact削除0。server root1＋fixture server1を同時上限、browserは自己tree1。converter/native生成0|
|材料|256KiB：config/keyring各16KiB、runtime記録合計128KiB、fakeSDK16KiB/合成認可文書8KiB/有限provider fixture32KiB/鍵上記。超過見込みは作成前再申告|
|provider wire|最大32要求/10MiB、同時1。code4＋cert最大4＋通常refresh最大4＝12、metadata/shortcut確認最大12、generate1＋create sends2＋create inspect/confirm等最大5＝8、計32。各320KiB保守予約（最大cert256KiB＋request16KiB＋headers等の余白）であり実wire測定ではない。未使用枠は自動retry許可でない|
|Hollow/browser資源|最大1000要求/64MiB（static asset/読取poll/合成doc含む）、read poll各30回/2秒まで。provider32と別計数。自己3100/3101 exact不在確認後のみ、未知3000非操作。実同時要求はbrowserの通常asset並列とprovider逐次1を区分|
|能力確認|account/DB/鍵0、小HTML≤1KiB/JS≤4KiB、自己HTTP最大4/64KiBを上記1000/64MiBへ内包。未成立ならUIへ進まない|
|script/log/seal/cache|8MiB、helper最大8×64KiB、有限UIログ各128KiB/計1MiB、source/apps/entry/dist全array正本2MiB、残量は計測して保持。重複arrayは完全再計算一致summaryで代替可|
|build出力|通常workspace dist再生成1回、別枠256MiB候補。開始前に既dist実量と一時出力最悪256MiBを測り空き容量を申告、超過なら停止。今はdist stat/read/buildをしていないので実量未確定|

provider metadata12とcreate系5は各UI操作の既再検証最大を含む保守配分。型付きfixtureの固定順へ落とした際にこの内数を超えるなら開始前に訂正し、値を途中で小さくして再試行枠を作らない。実署名/実HTTPcloseを省くfakeで「同bundle実adapter」と称さない。

各停止はbrowser通常close→quiesce/runner/drain→全既知PID/pipe/listener/socket/DBhandles0→opaque→更なるauditだけdriver接続。元contract/sole opaqueへ監査driver0。note/material/dispatch/LLM消費0・Drive操作状態/owner0・FKを有限照合、account/key/mail/全backup保持。note0なので削除回収なし。全量のFS/プロセス探索や未知PIDkill0。

## 8. 移行を再混合しない境界・判断事項

actualfresh/clone/rollbackの対象は後段別許可。正本は `/Users/hikaru/.local/share/hollow/verification/p5b3a1-independent-20260929-oMeLTO/final`（07:32:24.828、ledger38）だけで、本書ではstat/read/copy/driveropen0。contract ledger39やUI停止backupで置換しない。0038/旧snapshot/旧値保持の受入根拠は不変更借用し、actualfresh適用済みとはしない。

Manager判断点は、B方式と19path/共有document guard、script/frame/connectだけの限定CSP開始案と外部未検証、production mjsの同helper配備、57局所＋新contract/能力確認の資源枠である。ブラウザinterceptionと実SDK originの未確認は別問題で、前者の契約能力成立だけで後者を合格にしない。

見込みは文書境界/nonce/画面移動4〜6h、局所・production helper/build2〜3h、能力確認と契約UI/保全3〜5h、報告1hの10〜15h＋独立。時間保証でなく、能力不成立/新共有契約/予算超過で止める。S5a差戻しなら先にそちらへ戻す。

## 公開根拠・読取記録

2026-09-30取得の[Google Web Picker公式](https://developers.google.com/workspace/drive/picker/guides/web-picker)検索本文は固定loader/iframe originを示すが全SDK依存を列挙しない。直接openは取得失敗し、公式検索結果で限定確認した。[TanStack Server Entry公式](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)はtyped request contextを公開する。exact nonce動作はinstalled公開sourceを根拠とし、latest docsへ依存版を勝手に置換しない。[W3C CSP3](https://www.w3.org/TR/CSP/)はpolicy/nonce/strict-dynamicの意味の根拠で、実Chrome成功ではない。

installed根拠: react-start1.167.65、router-core/react-router1.169.2、start-server-core1.167.30の`request-handler.ts`/`createStartHandler.ts`、start-client-core1.168.2の`getGlobalStartContext.ts`、react-routerの`Scripts`/`HeadContent`/`ScriptOnce`/`renderRouterToStream`、router-coreの`ssr-server`/`ssr-client`。repoではrouter/root/DriveSettings/DrivePicker/server/launcher/build-search/configの公開sourceを限定読取した。SDK import実行/CloudConsole/資格情報/API操作0。

goal-implementの段階/所有分離に従い静的提案だけを作成した。computer-use/各browser skillの制約から、未確認interceptionを利用可能と仮定せず能力前提を残した。全文EOF確認後、本書を含む全read/write/runを停止しManagerへ返す。

## 2026-09-30 ブラウザ実行面の限定静的追補

本節は先の「第一候補agent-browser」を精密化する。製品/環境の実行・module import・browser接続・新root作成0。公開tool metadata、公開installed CLI文書、公式source/docsだけを読み、node_replが利用できないとは判断しない。Claude固有browser技能の利用面と、現Codexの正規Node実行面は別である。

### exact確認結果

|対象|確認済み|未確認・判断|
|---|---|---|
|CLI入口|`/etc/profiles/per-user/hikaru/bin/agent-browser` → `/nix/store/8ik44vzqd3k8lp9jf3krzgzkfx5afc67-home-manager-path/bin/agent-browser` → `/nix/store/svzi7cjr0w1jgwqaxwgias07xj9dpjid-agent-browser-0.38.1/bin/agent-browser`。最終regular executable 19,170,880 Bをmetadataで確認、実行0|バイナリとupstream tagの内容同一をhash/build検証したものではない|
|installed CLI文書|同packageの `share/agent-browser/skill-data/core/references/commands.md` はrouteのabort/body/resource-typeと新tabへのroute継承を示す|独立したresponse header/status指定を文書から確認できない|
|upstream v0.38.1|公式 `cli/src/commands.rs` のparse_networkはURL/abort/resourceTypeと `response:{body}` だけを構築|`--headers`は一般request設定と混同しない。route用content-type/status/Locationが実行面へ届く根拠なし。bodyへJSON文字列を書いてもheader objectへ変換されない|
|正規Node tool|metadataに `mcp__node_repl__js`、`mcp__node_repl__js_add_node_module_dir`、`mcp__node_repl__js_reset` が存在。jsはpersistent binding/top-level await/dynamic import例 `await import("playwright")` を明示|toolをまだ一度も起動していない。import例はpackage installed保証ではない。node:process unavailableというtool制約も維持|
|Node module候補|specifierは `playwright`。追加登録toolはabsolute node_modules directoryを受け取る正式面|exact resolved module/version/browser executableは未取得。repo node_modulesと限定した標準global/Nix package名の静的確認では発見できず、別実行面の可視FS/解決先を推測しない。任意directory追加やinstallはしない|

CLIのNix derivationに記載されたsource store pathは現FSに存在しなかったため、daemon側route優先順/既定MIME/redirect処理のinstalled source照合は未成立。パーサーがheader指定を渡さない事実だけではdispatcherの既定MIMEは決まらず、CLIでJSが利用不可能とは断定しない。バイナリの文字列抽出やprivate daemon命令送信で補完しない。標準CLIだけで適切なJS MIMEと厳密な全遮断が成立したとは返せず、この能力検証の第一候補を**正規node_repl＋既installed Playwrightの解決確認付き**へ変更提案する。

### Playwright公式APIで成立する部分と追加前提

[BrowserContext公式](https://playwright.dev/docs/api/class-browsercontext)は `browser.newContext()` の非永続隔離、context-wide route、Service Workerを `serviceWorkers:'block'` で止める必要を示す。[Route公式source](https://github.com/microsoft/playwright/blob/main/docs/src/api/class-route.md)は `route.fulfill({status, headers, contentType, body})` を定義する。既profile/storageState/CDP attachを使わず、新browser/newContextだけを候補にできる。公式current APIの能力であって、この環境のinstalled版/実ブラウザ成功ではない。

候補は `context.route('**/*', handler)` をnewPage/gotoより先にawaitして登録し、handler一つでexact分類する。自己originの許可だけcontinue、固定合成JSは `application/javascript`＋nosniff、合成文書は `text/html`、必要な合成redirectはstatus＋Locationを明示fulfill、それ以外はabort。route.fetch/実Google転送/ページevalでSDK差込み0。redirect先も新requestとして同allowlistへ入ることをcapability1で直接確認する。複数routeの優先順には依存しない。

HTTP routeはブラウザ全OS通信のfirewallではない。Service Workerは無効化し、WebSocket等の別通信面やbrowser background trafficを「全外部遮断済み」と一括保証しない。capability1は固定小文書/JSだけで通信面を有限化し、後続同bundle用にはinstalled版のWebSocket遮断面とlaunch既定背景通信の公開sourceを先に確認する。未確認の通信面を持つ任意外部scriptはロードしない。

正常終了はpage/context/browserの順でawaitするが、API完了やconnection切断だけを全native process/pipe閉鎖と同一視しない。[Browser公式](https://playwright.dev/docs/api/class-browser)の接続browser.closeは切断であり、自己launch終了と区別する。自己PID/close eventを公開面で所有できる `launchServer`＋自己接続案は候補だが、exact installed実装のPID/stdio取得と正常close内のtimeout強制kill有無を起動前に読む必要がある。BrowserServer公開面が確認できなければ勝手に内部processへ触れず、全自己closeの観測方法をManagerへ戻す。node_repl resetはcleanupの代替にしない。

### capability1より前の最小解決段階

次の順で別実行許可を求める。今はどれも未実施。

1. 正規node_replでmoduleを評価せず、公開resolverの利用可否と `playwright` のexact解決path/versionを取得するmetadata-only前段。tool文書が許す公開resolverが無ければそこで停止し、任意探索/install0。shellとNode面のcwd/FS同一を仮定しない。
2. 解決先のpackage/source/browsers manifestを静的readし、対応browser executableのexact既存path/regular/no-symlink・必要なclose/route面を固定する。既browser cacheのprofile内容を読まない。browser binary download0。欠落なら「未導入」で返し、追加依存を自動採用しない。
3. path/版/自己所有・正常close手順が固定できた場合だけmodule importとcapability1起動を許可対象へ。new非永続context、storageState/個人profile0、browser tree1・context1・page1・自己port0 server1。root/profile等の新作成はここから別承認で、metadata段階では0。
4. 既予算内の秘密なしHTML≤1KiB/JS≤4KiB、4request/64KiBで、HTML1・exact外部URLへの合成JS1・合成redirect1・その先の拒否1を観測。実自己server到達、fulfill/abort計数、正規MIMEでのJS成功、許可外要求非continueを有限bool/countで確認。実ネット送信0の判断範囲はこの文書が発生させる制御済み要求だけ。fail/unknown時retry0。

最初の1文書は全secret/account/DB/Google0。合成終了後、new context/browser/自己serverの全実closeを保存して初めて57局所/build/UIへの判断材料とする。正常closeの証明不足なら次stageへ進めない。先の3boot/7DB/32provider要求はこのmetadata/capabilityで消費しない。外部全遮断・BFCache・CSP全体の合格を小対1へ拡張しない。

取得日2026-09-30。CLI根拠は[公式v0.38.1 command parser](https://github.com/vercel-labs/agent-browser/blob/v0.38.1/cli/src/commands.rs)、Playwrightは上記公式APIのみ。公式raw/docsの一部取得失敗は未確認のまま、別権限や実APIで埋めていない。追補を含む全文EOF確認後、文書を含む全read/write/runを停止し返却する。

### Manager追加許可のmetadata-only結果

上記静的追補後、Managerから固定2packageの解決1段だけ追加許可を受けた。正規 `mcp__node_repl__js` を1call実施し、標準 `node:module`/`node:fs`/`node:path` のみimport。`createRequire` の基点は `nodeRepl.cwd` 内の架空filename（作成0）、対象は `playwright` / `playwright-core` のpackage.jsonとentry解決だけである。

両候補は `MODULE_NOT_FOUND`。package公開version/absolute path/browser executableは未取得、未解決なのでFS探索や別packageへの切替0。cwd基点の通常Node resolverによる結果であり、tool固有dynamic-importの追加探索先にまで不存在と断定しない。Playwright本体import・browser launch/connect・新root・FSwrite・外部ネット・環境値全量・requestMeta・profile・旧proof操作0。標準APIのpersistent bindingだけが残り、自己browser/process/socket/server/DB/未完Promiseの作成0。

従って現段階で起動に使えるexact Playwright executableは提示できず、capability1は未実施。次判断はtoolが公開する追加module directoryのexact既存場所をManagerから得て静的確認するか、CLI dispatcherの公開根拠を追加確認するかであり、自動install/広域探索/未解決のままlaunchはしない。本文のmetadata未実施表記は追加許可前の状態で、この結果が現状の正本となる。

### 正規dynamic importの追加確認・停止

Managerの別許可により、正規 `mcp__node_repl__js` で `import("playwright")` / `import("playwright-core")` を各1回だけ実行した。両方import不成立で、出力は既知code allowlist外を秘匿した有限分類 `IMPORT_UNAVAILABLE`。raw error/message/stackは出力も再読もしておらず、失敗原因の詳細は未確定。これは先のcwd `createRequire` による `MODULE_NOT_FOUND` と別の直接結果であり、同原因とは断定しない。

import不成立なので公開 `chromium.executablePath()` / lstatには到達せず、package version/browser path未取得。launch/connect/install/download/ブラウザprofile/ネット/新root/製品書込0。再importや新package・module directory追加はしない。この正規dynamic-import手段でのcapability1を停止し、実ブラウザ未検証を残す。局所57/実装/buildへ進む権限はこの追加許可に含まれず、以降の切分け・工程境界をManagerへ返す。

追補を含む全文EOFを再確認し、文書read/write/Node実行を全停止。未完の自己Promise・browser/server/socket/child/DB作成0。Nodeの標準APIと有限結果bindingのみ保持し、resetを資源終了証明の代替として呼ばない。
