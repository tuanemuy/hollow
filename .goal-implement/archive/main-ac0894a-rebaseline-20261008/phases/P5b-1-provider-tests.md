# P5b-1 OpenRouter provider実装と限定テスト

## 結果

専有3ファイルを実装し、限定37対が成功した。P5b-1-B/C/Gのadapter部分を支えるImplementer補助であり、独立受入ではない。共有port・他製品・DB・管理正本・環境・依存の変更はない。

- `packages/core/src/adapters/node/openrouter/provider.ts`
- `packages/core/src/adapters/node/openrouter/http.ts`
- `packages/core/src/adapters/node/openrouter/provider.test.ts`
- 実行: `2026-09-28T00:45:28+09:00`開始、37/37、1file、389ms、exit0
- 限定Biome: 3file成功。テスト前に整形し、成功後のソース変更なし
- 自己loopback server/socket・operation Promiseを全回収、未回収exec0
- 全体型・DI/共有pool・application/HTTP/UI統合は主担当へ渡す。実OpenRouter/TLSは未検証

## 接続API

`NodeOpenRouterProvider implements OpenRouterAuthorization, OpenRouterCatalog`。constructorは`(appUrl: string, clock: Clock, requestFactory?: OpenRouterRequestFactory)`である。通常は固定native HTTPS、最後の引数はtrusted testだけに使う。shared portは変更しない。

`authorization`はAPP_URLから固定`/auth/openrouter/callback`を作り、`correlation`queryを付ける。provider認可先は固定`https://openrouter.ai/auth`、S256を使う。`state`のechoや最新attemptへの割当は実装しない。

`exchange`は固定`/api/v1/auth/keys`へBearerなしJSON POSTを一度だけ送る。入力code4KiB、PKCE verifier、boundedな応答keyを検証し、credential文字列だけを内向きportへ返す。raw keyの外向きDTO/log化は行わない。

`inspectCredential`は固定`/api/v1/key`へBearer GETを送る。`expires_at`と`creator_user_id`だけを`Date|null`/`string|null`へ投影し、label・raw応答を返さない。欠落はnull互換、明示期限切れ・不正日時とmetadata401は`OPENROUTER_CREDENTIAL_INVALID`。429/5xx/通信不明は`OPENROUTER_UNAVAILABLE`と区別する。code交換400/401/403は`OPENROUTER_PROVIDER_REJECTED`。native error/causeをportへ伝播しない。

## HTTP所有と一覧契約

`NodeOpenRouterHttp`は固定`openrouter.ai:443`の3pathだけを選び、`agent:false`、redirect0、retry0、identity encodingを使う。request/response/socketのcloseを開始時から監視し、finallyのdestroy後に実closeをすべて待つ。サイズ超過rejectやabortだけで外側Promiseを完了しない。応答は交換/metadata64KiB、catalogは1page2MiB以下かつ残り総budget以下で消費を止める。JSON/UTF8境界とエラーの安全化はproviderに閉じる。

各adapter operationは外側signalを子AbortControllerへ伝播し、10秒timerを持つ。catalogの全ページは1つのoperation期限を共有する。交換＋metadata合計10秒・全体4/queue0は主担当のcontrol executionが同じ外側signalで束ねる責務であり、このunitだけでは統合済みとしない。

catalogは固定`/api/v1/models?output_modalities=all&offset=N&limit=500`を使う。`data/total_count/links`を検証し、総件数の変化・重複ID・欠落page・不正next・過大件数を全体失敗とする。nextは固定origin/pathと一意のoffset/limit/output_modalitiesだけを照合し、任意URLを直接followしない。20page/5000候補/総8MiB以内で全件完了した場合だけ15分cacheを更新する。失敗・期限切れcacheから部分結果や旧結果へ無言fallbackしない。

能力はtext入力＋text出力、image入力＋text出力、audio入力＋transcription出力を区別する。audio chatを専用STTへ昇格しない。`expiration_date`は検証済みDateへ投影する。日付だけの値はUTC日境界として扱い、選択可否は内向きの現在時刻検査へ渡す。上位の既定集合・再試行・保存値維持は本adapterで代行しない。

## 限定37対

| 検査 | 対数 | 結果 |
| --- | --- | --- |
| 固定認可URL・S256・callback相関・state非仮定 | 1 | 成功 |
| Bearerなし交換・metadata必要fieldだけ投影・3所有close | 1 | 成功 |
| metadata欠落null互換 | 1 | 成功 |
| metadata401/429/500、raw/cause非露出 | 3 | 成功 |
| 交換400/403の既知拒否・再送0 | 2 | 成功 |
| metadata現在期限切れ | 1 | 成功 |
| 過大code・不正credentialの接続前拒否 | 1 | 成功 |
| 交換/metadata/catalogのchunked byte超過・EOF未送信時close | 3 | 成功 |
| redirect/encoding/JSON/UTF8/接続切断 | 5 | 成功 |
| 遅い交換/metadata/catalogの外側取消とclose | 3 | 成功 |
| 複数page全体10秒・preabort接続0 | 2 | 成功 |
| text/image/STT区分・audio chat非STT・期限投影・15分cache | 1 | 成功 |
| 固定ページ再構成・部分失敗非cache・明示再取得 | 1 | 成功 |
| next外部/重複param/offset不一致/欠落/終端矛盾/件数変化/ID重複/total欠落 | 8 | 成功 |
| 正確5000候補、5001拒否、20page上限、総8MiB消費中断 | 4 | 成功 |

```bash
pnpm exec biome check --write packages/core/src/adapters/node/openrouter/provider.ts packages/core/src/adapters/node/openrouter/http.ts packages/core/src/adapters/node/openrouter/provider.test.ts
pnpm exec vitest run packages/core/src/adapters/node/openrouter/provider.test.ts --fileParallelism=false
```

主担当の明示専有枠で直列実行し、両commandはexit0で即時回収した。初回37対が成功し、期待の弱化・再実行はない。期限対はtest-only fake timerで10秒を進め、socketは実loopbackでcloseを観測する。実時間10秒や外部TLSの終了保証へ拡大しない。catalog5000・8MiB対は合成応答であり、実provider性能の測定ではない。

## 一次資料と実接続条件

2026-09-28に公開公式資料をread-onlyで確認した。実API・認可・生成の外部要求は0である。

- [OAuth PKCE](https://openrouter.ai/docs/guides/overview/auth/oauth): S256、callback_url、JSON code交換を照合。callback独自queryの実往復とBearerなし実交換は未検証
- [Current API key](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key): Bearer GETとexpiry/creator項目を照合。labelを採用しない
- [Models reference](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties): offset/limit/output_modalities=all、data/links/total_countを照合。公開取得とreferenceのAuthorization表示の差、およびページfieldを省いた例との差は未接続条件として保持

catalogは上記のページschemaに従い、total/links不足を安全な全体失敗にする。実公開endpointのレスポンスが異なる場合は、上位で既定集合と再試行を示し、実測に基づいて境界の採否を再確認する。匿名取得の失敗を利用者key転送や別endpointへの自動fallbackで隠さない。

## 回収と返却

test factoryだけが固定HTTPS要求を自己127.0.0.1動的portへ差し替える。各対でclient request/response/socketのcloseを別々に観測し、返却時の全closeをassertする。`afterEach`は自己server側socketをdestroyし、server.closeと追跡Promiseを待つ。全fixtureは合成値で、秘密/token/body/keyのassert差分はbooleanまたはsafe codeに限定する。DB/一時鍵/ファイル/実runtimeは作成・操作しない。

実OpenRouter認可・実TLS/ネットワーク・生成品質/課金、全体型/build/UI、shared executionの4枠と交換metadata合計期限は未検証。公開ドキュメントの成立を実接続成功とは扱わない。

ソース3pathと本報告を全文確認し、主担当へ所有を返却する。文書を含む全書込み・全操作を停止し、未回収exec0・自己server/socket0を維持する。
