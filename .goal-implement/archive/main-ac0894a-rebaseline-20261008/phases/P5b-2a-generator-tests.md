# P5b-2a 生成adapter

## 結果

`NodeLlmGenerator`と限定unitを実装した。2026-09-28T04:14:40+09:00の最終unitは35/35件成功、243 ms、exit 0。専有2ファイルのBiomeも成功した。固定P5b-2a-B/C/Hに対する実装側補助であり、独立受入ではない。

所有対象は次の3パス。共有型、既存control adapter、DB、runtime、build、環境は変更していない。

- `packages/core/src/adapters/node/llm/generator.ts`
- `packages/core/src/adapters/node/llm/generator.test.ts`
- `.goal-implement/phases/P5b-2a-generator-tests.md`

## 接続境界

`NodeLlmGenerator(requestFactory?)`は固定`LlmGenerator`を実装する。任意transportはtrusted constructorのrequest factoryだけであり、本番入力・環境変数からendpointを変更しない。

既存catalogのmodel DTOにはcontext/output/supported parametersがない。共有変更はせず、実profile照会は主担当へ分離した。本adapterは与えられたtyped profileの形・用途・必要parameter・有限予算を検査する。`checkedAt`のDate妥当性は検査するが、modelの現在存在・期限・profile鮮度を独自に証明しない。

## B: 入力と応答

profileはchat-text、正のsafe整数context/output、max_tokens対応を要求する。max_tokensはprofileのoutputと8192の小さい方。system、追加指示、segment番号、JSON包装を含む全messageのUTF-8 bytesに1024のframing余白とoutput予算を加え、context以下かを事前確認する。これは保守的な事前見積りであり、実token計数ではない。非適合時はモデルを変更せず`not-sent`で失敗する。

元segmentは64 KiB以下、追加指示は8 KiB以下、segment数は16以下。credentialの構造不正は通信前に安全なcodeへ変換する。固定system promptは元順・全情報・見出し/table/codeの維持とHTML fragmentのみの返却を要求し、原文を未信頼dataとして扱う。生成品質やprompt injection耐性をこの指示だけで保証しない。生成後のsanitizerは主担当の別境界である。

HTTP応答は消費中に2 MiB以下を検査し、identity以外のContent-Encodingを拒否する。正常応答は単一choice、assistant、`finish_reason: stop`、非空の文字列contentだけを採用する。refusal、tool/function呼出、length終端、空・null・不正shape・error応答は採用しない。contentは64 KiB以下。任意usageは非負safe整数だけを採用し、欠落はnullとする。

## C/H: 発注と所有

生成先は固定`https://openrouter.ai:443/api/v1/chat/completions`。POST、非stream、agent false、redirect 0、retry 0とする。provider設定は`allow_fallbacks: false`、`data_collection: deny`、`require_parameters: true`。モデルやprovider設定を失敗時に緩めない。

request、response、socketのclose listenerを生成・取得時から登録する。正常・サイズ超過・切断・取消・期限切れのいずれもdestroy後の全実closeを待ち、結果・失敗を返す。90秒deadlineはローカル通信をabortするが、provider処理・課金の取消を意味しない。parse済みsuccessでもclose待ち中に取消された場合は成功を返さない。closeが未到来なら、timeoutだけでclosedへ変えない。

未送信はpreabort、入力拒否、requestが返る前の同期生成失敗に限定する。request取得後の通信不明は`LLM_DELIVERY_UNKNOWN`かつ`delivery: possible`。401/402/429等のHTTP拒否もpossibleを維持し、quota返却の根拠にしない。401はcredential invalid、403はguardrail等と区別できないためunavailableとする。終了証明に失敗した場合は`LLM_OWNERSHIP_UNKNOWN`、`closed: false`を返す。

例外・logへraw token・credential・入力本文・provider error・causeを出さない。成功DTOは有限検証済みの生成contentとusageだけを返す。dispatch IDによるprovider側のidempotencyを仮定しない。durable intent、唯一dispatcher、再発注禁止、外側owner保持は主担当の接続責務である。

## 検査結果

```sh
pnpm exec biome check --write packages/core/src/adapters/node/llm/generator.ts packages/core/src/adapters/node/llm/generator.test.ts
pnpm exec vitest run packages/core/src/adapters/node/llm/generator.test.ts --fileParallelism=false
```

初回Biomeはfinally内throwを指摘した。終了未証明と通常失敗を変数で分離し、cleanup後に優先順位を付けてthrowする実装へ修正後、exit 0。

2026-09-28T04:13:35+09:00の初回unitは33/34件成功、264 ms、exit 1。exact 2 MiB fixtureのpaddingが文字数基準だったため、日本語のUTF-8 bytes差だけ上限を超えていた。実adapterはRESOURCE_LIMITを返した。fixtureをbyte基準へ修正し、403分類の1件を追加した最終35件が成功した。

検査は自己動的loopbackと合成credentialだけを使用する。

- 固定URL・privacy・非stream・token予算・モデル非変更、正常contentとusage
- profile/context/output/date、入力bytes、ordinal、credentialの通信前拒否
- refusal/tool/function/length/empty/null/multiple/error、不正usageとsafe整数境界
- content 64 KiB、response 2 MiBのexactと超過、chunked overflow
- HTTP 401/402/403/429/503/302、JSON・UTF-8・encoding不正、retry/redirectなし
- preabort、同期生成失敗、接続後切断、遅いbodyのabort、90秒deadline
- 実socket destroy gate中の結果未終端、late abort優先、全request/response/socket close

90秒はfake timerによる分岐検査。close gateは自己socketのnative destroyを保留し、解除後に実closeを観測する。OS全般の硬い終了時間、実TLS、実OpenRouter、生成品質・tokenizer一致・費用は未検証である。新依存・外部API発注・実credential使用はない。

## 一次資料

2026-09-28に公開一次資料をread-onlyで確認した。実外部APIへの認証通信はない。

- [Chat completions](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion): 固定POST、message、max_tokens、非stream応答shape
- [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection): fallback・data collection・必要parameterの制御。data collection設定をゼロ保持保証へ言い換えない
- [Error handling](https://openrouter.ai/docs/api_reference/errors-and-debugging): 401、402、403、429等の意味。403はguardrailやmoderationも含む

## 回収と返却

全自己server、socket、operation Promise、timerを回収し、fake timerとspyを復元した。未回収execと自己資源は0。Node枠は主担当へ返却済み。全体型、通常配備、profile実照会、application・quota・sanitizerとの統合検査は主担当が所有する。

製品2ファイルと本報告を全文確認し、3パスの所有を返却する。文書を含む全操作を停止する。
