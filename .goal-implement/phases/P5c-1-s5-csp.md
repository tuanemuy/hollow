# P5c-1 S5 CSP 静的成立性

2026-09-29。S5案のCSP未決だけを対象とする。採用・実装・独立検証ではない。製品/管理正本/S4候補/環境は非変更。quiesce・移行・fixture予算は扱わない。

## 判断

Google Pickerの追加だけから**全app文書のnonce policyが必須になるわけではない**。既設計で許容された専用Picker文書へ通常のdocument navigationで入れば、その文書だけにscript/frame制限を設けられる。推奨候補はこの専用文書方式。巨大な独立SPAや新認証方式にはしない。

現在の設定SPA文書内でSDKを動かし続ける方式なら、そのdocumentの全inline scriptを許可するnonce等が必要になる。`/settings/drive`のSSR応答だけにheaderを加えても、他routeからSPA遷移した既存documentには適用されない。逆方向のSPA遷移でも元documentのpolicyが残る。CSPはcomponent単位の制限ではない。[CSP3](https://www.w3.org/TR/CSP3/#framework-policy-delivery)

`script-src 'self' https://apis.google.com`だけでは現在のSSR inline scriptを許可できない。全体にunsafe-inlineを足す案、HTML regexによるnonce挿入、wildcard/unsafe-evalでSDK依存先を埋める案は採らない。strict-dynamicもhost制限をそのまま強化する語ではなく、信頼したscriptからの動的依存を許可するため、未確認originを隠す代替にしない。[CSP3 script規則](https://www.w3.org/TR/CSP3/#strict-dynamic-usage)

## installed正規APIと実際の伝播

読取で確認したinstalled版は `@tanstack/react-start` 1.167.65、`react-router/router-core` 1.169.2、`start-server-core` 1.167.30、`start-client-core` 1.168.2、`react-start-server` 1.166.52、`react-start-rsc` 0.0.44。package/公開srcのみを読み、import実行・型検査・buildはしていない。

| 正規面・公開source | 確認した内容 |
| --- | --- |
| start-server-core `src/request-handler.ts` | `RequestOptions`のcontextにnonce optional型がある。 |
| 同 `src/createStartHandler.ts` | request contextはmiddleware/serverContextへ渡すが、nonceを`router.options.ssr`へ自動コピーしていない。router load/dehydrate後にhandler callbackを呼ぶ。 |
| router-core `src/router.ts` | RouterOptionsの`ssr?: { nonce?: string }`が存在する。 |
| react-router `src/{Scripts,HeadContent,ScriptOnce,headContentUtils}.tsx` | routerのssr.nonceを管理script等へ反映し、`meta[property="csp-nonce"]`を生成する。 |
| react-router `src/ssr/renderRouterToStream.tsx` | React readable/pipeable双方のSSRオプションnonceへ同値を渡す。 |
| router-core `src/ssr/ssr-server.ts` | injectScriptとbuffered scriptへnonceを反映する。 |
| 同 `src/ssr/ssr-client.ts` | hydrate時にcsp-nonce metaを読み、router.options.ssr.nonceへ設定する。SPAで文書nonceを保持する経路がある。 |
| start-client-core `src/getGlobalStartContext.ts` / `src/index.tsx` | 公開getGlobalStartContextはserverでglobal middleware後のrequest contextを返し、clientではundefined。react-startが再exportする。 |
| react-start-rsc `src/serialization.server.ts` | RSC streamをSSR側でdecodeし、依存assetをrequestAssetsへ集約する。これとRouter/Reactのnonce経路は確認したが、全RSC/built scriptの成立実証ではない。 |

公式[Server Entry Point](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)はRequestOptions、typed request context、createStartHandler/defineHandlerCallbackを公開している。現在の公式RouterOptionsページではnonceの説明を確認できず、nonceのexact根拠は上記installed公開型/sourceとする。最新docsだけでinstalled挙動を置換しない。

### 全app方式を選ぶ場合の最小正規導線

1. `apps/web/app/server.node.ts`の既専用handler群より後、通常Start entryへ渡す境界で、server生成のrequest固有nonceと同値CSPを用意する。共有変数やclient headerを正本にしない。既note/publication/media/PDF等の独立Responseへ後掛けしない。
2. `entry.fetch(request, {context: {nonce}})`へ渡し、Router Registerのserver.requestContext型を明示する。**この呼出だけでは不十分**。`apps/web/app/router.tsx`のgetRouter内で公開getGlobalStartContextを読み、createRouterの`ssr: {nonce}`へ設定する。通常SSRではmiddleware後にgetRouterが呼ばれることを上記sourceで確認した。clientはundefinedから開始し、hydrateがmetaから受け継ぐ。
3. nonceはrouter load/dehydrate前に設定する。createStartHandlerのrender callbackに入ってからだけupdateする案は、既に作成されたSSR注入分の完全性を保証できないため推奨しない。
4. 既`__root.tsx`のHeadContent/Scriptsをそのまま使う。nonceのためだけに全tagを手作業で書き換える必要はない。`start.ts`のserializationAdaptersやRSC loaderをnonce目的で変更する根拠も現時点ではない。
5. 初期HTML responseのheaderとHTML nonceを一組にし、別requestのnonceを混ぜない。SPAの追加GETが現在documentのnonceを更新する設計にしない。error/not-found/redirect/prerender時のcontext有無・RSC遅延・CSS動的注入は比例確認が必要。動的HTMLのcacheでnonce/headerが食い違わないことも必要。

これは静的に正規APIで表せる候補であり、全app policyがそのまま動く証明ではない。とくにdefault-srcまで新しく制限すると画像/style/font等へ変更が広がる。script制限検討を全resource再設計へ拡張しない。

## 推奨候補: 専用Picker文書

追加URL候補は **GET `/integrations/drive/picker`**。既API `/api/integrations/drive/picker`とは別にする。appのrouteTreeへ大きな新SPAを加えず、Nodeの専用handlerが小さい完全HTML文書を返し、同originの固定built client module一つが既controllerを使う。nonceを使うならこの文書内だけ。bootstrapも外部moduleにできるため、全appのinline script nonce化を前提にしない。

接続の最小候補は以下。

1. `DriveSettings.tsx`のPicker起動導線を通常anchor/full navigationへ変更する。この時点ではtoken POSTをしない。未保存状態がある場合の既dirty確認を維持する。SPA Linkで専用文書のpolicy取得を省略しない。
2. 専用GETは既auth fence/現在本人readだけ。no-store/private・no-referrer・nosniff、frame-ancestors noneを文書自身へ適用し、token/secret ticket/codeをHTML・URLへ載せない。GET起動でSDK/token発行・refresh・wakeを行わない。
3. 文書内の明示「Google Pickerを開く」ボタンから、現在settings/actorを再確認し既`createDrivePickerController`を起動する。既POST `/api/integrations/drive/picker`とselection POST、bounded response、epoch/settings/current CASを再利用する。tokenは既controller closureとSDK呼出だけで保持し、通常React state/DOM/URL/storageへ渡さない。Reactを使う場合も小さいclient islandのpending/errorだけとし、DriveSettings全体やrouterを複製しない。
4. 初期本人と現在本人が変わったらcurrent=false・disposeとし、選択応答を採用しない。pagehide/離脱でdispose、pageshow/BFCache復帰では自動再発行せず現在条件の読取からやり直す。元routeとgenerationのlate guardを専用document寿命へ置き換える。別tabでのactor変更は現在本人再読とserver POSTのfence双方で拒否し、clientの初期値だけを認可根拠にしない。
5. receipt callbackは秘密なしのcontrol ID/command IDだけを保持する。戻り先候補は `/settings/drive?controlId=<uuid>`、ACK不明でID未受領なら `/settings/drive?controlCommand=<uuid>`。二つは排他・UUID検証し、DriveSettingsで既driveReceiptFnのkind=control/by=id又はcommandの純GETだけを実行する。token再配布・自動POST・任意returnToなし。現在の`/auth/drive-result?id=...`は認可結果の既用途なので無断でcontrolへ流用しない。
6. 戻りもdocument navigationにする。window.opener/新popup/iframeラッパー/postMessage橋は作らない。既Google Picker自身のiframeは別扱い。この方式は同origin documentのCSP範囲分離であって、Google scriptからHollow originを隔離する別origin security境界ではない。

専用clientは既controllerの純TS責務と必要なGET入口だけを再利用する。既serverFnを専用bundleへ解決できるかはbuild配線の確認対象であり、困難なら同じusecaseへの有限read-only HTTP面を**先に追加申告**する。無断で一般API/新session/資格保存を作らない。

path候補は新`apps/web/app/presentation/drivePickerDocument.node.ts`、新`apps/web/app/drive-picker.client.tsx`、既`server.node.ts`（dispatch）、`DriveSettings.tsx`と`routes/settings.drive.tsx`（導線/戻りsearch）。専用client bundleを登録する`vite.config.node.ts`の最小input/asset解決差は別途申告が必要。現時点でbuild成功や追加依存不要の完証とはしない。`DrivePicker.ts`は原則そのまま再利用、actor/page寿命に必要な差があれば直接対付きで申告する。

## SDK allowlist: 確定と未確認

2026-09-29確認の[Google公式Web Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker)には固定loader `https://apis.google.com/js/api.js` と `gapi.load('picker')`、Pickerがdocs.google.comのiframeで表示されることがある。API keyのwebsite restriction説明をCSPの完全allowlistと同一視しない。GIS browser token取得やrevokeを今回追加しない。

候補はscriptのself＋apis.google.com、frameのdocs.google.com、connectのselfを出発点とするだけで、完成policyではない。SDKが親documentへ追加するscript/style/connect、必要画像/font、厳格policy下での動的処理、実shared Drive/組織制限は未確認。子のcross-origin iframe内の全通信先を親connect-srcへ列挙する必要があるとは限らず、親の要求と子iframe内部を区別する。失敗時にGoogle全domain/wildcard/unsafe-evalへ拡張しない。

公式[PickerBuilder.setOrigin](https://developers.google.com/workspace/drive/picker/reference/picker.pickerbuilder.setorigin)はapp自体がiframeの場合のtop-most originを説明する。本案はtop-level専用文書なので、新しい独自iframe橋の成立をこれで証明しない。固定loaderをfakeでfulfillした契約UIは、実SDKのCSP適合・全origin・390px表示の証明ではない。

## 変更面と既IDの比較

| 選択肢 | 主な変更・利点 | 直接影響/残余 |
| --- | --- | --- |
| 全app nonce | server.node.ts＋router.tsxのrequest context/ssr.nonce、通常HTML header。既設定SPAの導線を維持 | P1-EのSSR/stream/RSC/hydration/SPA/errorとP5c-1-E/F。Google許可がapp文書全体へ届く。SDK allowlist未確認は解消しない。 |
| 専用文書（推奨候補） | 小さいGET文書/client module＋設定のfull navigation/receipt search。共通SSR/RSC/nonce非変更 | P5c-1-B/E/F、P1-Eの専用dispatch/build/導線だけ。既S4 current/ACK/pendingを接続し直す直接対が要る。SDK allowlist未確認は残る。 |

旧note/publicationのsandbox/CSPとP5a/P5b認証・LLM業務本体は両案とも非変更。既P5c-1-E/Fの秘密UI/CSP条件を満たすための比例確認であり、新受入IDや外部成功条件を追加しない。

必要な直接対は6群に限定できる：①他routeからの入口/戻りで実document policy取得、②GET時token POST/SDK起動0、③明示POSTとmemory-only/ACK不明GETのみ、④actor変更/離脱/BFCache/late選択拒否、⑤allowlist外拒否＋既sandbox不変更、⑥390px/keyboard/pending/error/receipt再訪。全app方式なら①をSSR/RSC遅延/hydration/SPAのnonce一致対へ広げる必要があり、専用文書と同じ変更リスクとはしない。実Google検証は別許可待ち。

## Manager判断と返却

判断は「既S4の同一SPA内Pickerを維持して全app nonceを接続するか」「一回の文書遷移と専用開始ボタンを許容して共有範囲を狭めるか」。後者を推奨候補とするが採用はしていない。どちらもSDK全依存未確認を隠さず、確認ができなければCSP実成立未完として残す。

公開一次docsとinstalled sourceの静的読取のみ。製品/既報告/管理正本変更0、Node/test/type/build/DB/browser/SDK/API/鍵/proof操作0。本文・token・rawerror・実データ出力0。読取execは終端回収済み、自己実行資源0。本文EOF確認後に本書の所有を返却し、全read/write/runを停止する。
