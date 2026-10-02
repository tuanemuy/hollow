# P5a Google OIDC adapter

## 現在の結果

Manager採用のnative固定HTTP経路を実装し、単体40対が成功した。サイズ超過・取消・期限・切断を含め、取得したrequest / response / socketのcloseを呼出元への返却前に確認する。実Google・実TLS・全体型検査はこの補助の検証範囲外。

初回gaxios経路の34成功・実終了2失敗は下記に保持する。取消要求だけを実終了扱いにはしない。

所有は次の3製品pathと担当報告だけである。

- `packages/core/src/adapters/node/auth/googleOidc.ts`
- `packages/core/src/adapters/node/auth/googleOidc.test.ts`
- `packages/core/src/adapters/node/auth/googleHttp.ts`
- `.goal-implement/phases/P5a-oidc-adapter.md`

共有port・製品の他path・依存・管理正本は変更していない。実Google通信、実資格情報、DB、fresh、既存runtimeへの操作はない。

## 候補実装

`GoogleOidc`を実装する`NodeGoogleOidc`を用意した。authorizationは固定Google endpoint、openid/email/profile、online、nonce、S256を使用する。認可URLには`OAuth2Client.generateAuthUrl`、署名には公開`verifySignedJwtWithCertsAsync`を使用する。交換・証明書取得だけをlocalな`NodeGoogleHttp`へ切り出し、内向きportは変更しない。

code 4 KiB、ID token 16 KiB、token応答64 KiB、証明書応答256 KiB、鍵32個を確認する。RS256/kid、issuer、aud/azp、nonce hash、iat/exp、email_verified、subjectを検査する。Google issuerの2表記は正規形へ揃え、emailは正確なgmail.com又は署名済み非空hdだけを管理根拠とする。access/refresh tokenは保存・返却しない。

証明書cacheはmax-ageからAgeを引き、6時間以下に制限する。期限切れは採用せず、未知kidで一操作一回の取得、同時refresh共有を行う。no-cache/no-store・有効max-ageなしは現在候補では拒否する。失敗は安全な固定code/文言へ変換し、元例外・cause・秘密を公開しない。

交換開始からの10秒timerと外側signalを子controllerへ接続し、`finally`でabortする。`NodeGoogleHttp`は固定2HTTPS URL・443・agent:false・retryなし・redirectなしで接続する。identity以外のContent-Encodingを拒否する。request / response / socketのclose listenerを取得直後に登録し、成功・失敗ともdestroyと全close待機を終えてから返す。期限は取消の起点であり、終了未証明のclose待機を成功へ短絡しない。

第3constructor引数は`{ requestFactory?: GoogleRequestFactory }`。factoryの形は`(URL, https.RequestOptions, (IncomingMessage) => void) => ClientRequest`である。本番既定は`https.request`。テストだけが自己loopbackへ差し替える。endpointをenvやリクエスト入力から指定する経路はない。

## native経路の最終検査

2026-09-27T22:23:21+09:00開始、433 ms。40/40成功、1/1file成功、exit 0で即時回収。3file限定Biomeもexit 0。

```bash
pnpm exec biome check --write packages/core/src/adapters/node/auth/googleOidc.ts packages/core/src/adapters/node/auth/googleOidc.test.ts packages/core/src/adapters/node/auth/googleHttp.ts
pnpm exec vitest run packages/core/src/adapters/node/auth/googleOidc.test.ts --fileParallelism=false
```

全HTTP対は127.0.0.1動的portの自己serverを使う。自己RSA署名を公開libraryで検証し、通常claims・改変署名・不正claims・cache共有/回転/期限切れ非fallback・鍵数/Ageを確認する。上限超過2対の期待は削除せず、request / response / socketの3所有closeが返却より先であることへ具体化した。同じclose照合を正常、redirect拒否、encoding拒否、切断、不正JSON、token/certsの遅body取消、合計10秒期限でも確認する。

最大4・queue0の外側executionとの統合は主担当の範囲。adapterのPromiseが全closeより先に完了しないことをこの補助の根拠とする。実OS全障害・実Google TLSの保証には拡張しない。

## 初回gaxios経路の検査

2026-09-27T22:13:07+09:00開始、10.45秒。session 7164はexit 1まで回収した。36対中34成功・2失敗。対象Biomeは2file整形後exit 0。

```bash
pnpm exec biome check --write packages/core/src/adapters/node/auth/googleOidc.ts packages/core/src/adapters/node/auth/googleOidc.test.ts
pnpm exec vitest run packages/core/src/adapters/node/auth/googleOidc.test.ts --fileParallelism=false
```

成功範囲は固定URLとS256、自己生成RSA署名、canonical claims、Gmail/hd区分、改変署名・不正claims拒否、cache共有・回転・6時間上限、鍵数、gaxiosからnode-fetchへ渡るsize/follow/retry/timeout、code/tokenサイズ、secret非露出、signal取消・fake timer期限である。

小さいchunked Responseでは、gaxios 6.7.1の`maxContentLength`がnode-fetch 2.7.0の`size`へ渡り、JSON全体完成前にサイズ超過を拒否した。このfixtureのabortは自らbody.destroyするため、実HTTP終了の根拠には使わない。

### 失敗した実終了2対

token/certsのそれぞれについて、自己HTTP serverを127.0.0.1の動的portで開いた。trusted test fetchだけが固定Google URLをこの自己serverへ置き換え、実node-fetchを使用した。応答は上限+1byteを書き、EOFを保留した。

交換Promiseのサイズ超過拒否後、response bodyの`close`を待つ対が各5秒のtest timeoutで失敗した。期待を削除せず、timeoutを終了成功へ変換しない。実request/socketが漏れたと断定する結果ではないが、body終了を含む必要な終端を現在のAPI返却までに証明できていない。

afterEachは自己Readableをdestroyし、自己socketをdestroyして自己server.closeを待った。全test processは終端回収した。故障中の通常終了とteardownによる回収は区別する。

## 不成立の根拠と採用境界

既存ローカル配布sourceを読取確認した。

- gaxios 6.7.1 `build/src/gaxios.js`は`maxContentLength`を`size`へ写し、JSON取得時に`res.text()`を呼ぶ
- node-fetch 2.7.0 `lib/index.js`のconsumeBodyはサイズ超過で蓄積とPromiseを拒否するが、その分岐ではbodyをdestroyしない
- 同node-fetchのabortはresponse.bodyへerrorをemitし、ClientRequestをabortする。response bodyのcloseを返す公開Promiseはない
- gaxiosの公開responseは変換後dataを返すため、この候補では元request/socket/responseのcloseをawaitできない

公開fetchラッパからbodyをdestroyしてcloseを待つ案は、内部ClientRequest/socketの証明を残す。これだけを解決済みとしない。

Manager採用は汎用Gaxios adapterではなく、内向きGoogleOidcの2HTTPだけを専用native transportへ切り出す形である。汎用`<T>`返却のcastは不要で、JSONはunknownとしてschemaで検証する。新libraryを追加せず、既存外側の同時4/queue0枠は終端Promiseまで保持する。

## 一次資料

2026-09-27に[Google OpenID Connect公式文書](https://developers.google.com/identity/openid-connect/openid-connect)を確認した。固定authorization endpoint、identity scope、state/nonceとID token検証の根拠に使用する。[Node.js 22系Net公式文書](https://nodejs.org/docs/latest-v22.x/api/net.html#event-close_1)を参照した。取得時の文書版は22.23.3であり、実行環境と同版の実測とは扱わない。公式GitHubの指定version URLとNode HTTP文書は取得失敗のため、その内容を閲覧済みとは扱わない。版固有の挙動は既存lockのgoogle-auth-library 9.15.1 / gaxios 6.7.1 / node-fetch 2.7.0配布sourceから確認した。

## 未検証・所有

全体型検査、実Google/実TLS、実外部redirect、実認証画面は未検証。鍵はtest process内の自己RSA鍵だけで、既存keyやenvは読んでいない。自己loopback以外のprovider通信は0。各対afterEachで自己socket・serverを終了し、追跡operation Promiseを回収する。DB・tmp・Workerは作成していない。未回収execは0。コードと報告の全文確認後、3製品pathと担当報告の所有を主担当へ返し、全操作を停止する。
