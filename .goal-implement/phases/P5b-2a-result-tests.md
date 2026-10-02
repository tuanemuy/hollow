# P5b-2a 生成結果の媒体復元テスト

## 結果

2026-09-28 04:49:16 JST 開始の限定 Vitest は 28/28 成功、383 ms、exit 0。専有ファイルの Biome も exit 0。実装側補助であり、独立受入ではない。

専有変更は次の 2 path のみ。

- `packages/core/src/adapters/node/llm/resultProcessor.test.ts`
- `.goal-implement/phases/P5b-2a-result-tests.md`

正本は `application/llm/ports.ts` の `LlmResultProcessor.restore` / `LlmVerifiedMedia`、`adapters/node/llm/resultProcessor.ts`、`domain/note/entity.ts` の `MAX_HTML_BYTES`、design の本文生成・検証済み媒体復元契約。

## 検査範囲

- 同一 asset の正当な 2 回出現を segment を跨いで復元し、前後のテキスト順を保持。
- 正当な image / video と、HTML entity で表現された placeholder の復元。
- raw / entity の未知 marker、欠落・過剰出現、attribute marker、壊れた予約表記を拒否。
- script / template / comment / style / video の破棄対象にある未知 marker を、削除によって隠さず拒否。
- 大文字を含む予約 prefix を本文の前後と entity-decoded attribute で拒否。
- 重複 map、外部・不正 asset URL、draft-scoped URL を拒否。note-scoped の構造検査と、実際の現在 note 認可は分離する。
- 生成された img/video/audio/source、CSS/style/link、script/iframe/object/embed/template を保持しない。生成内容が既存 owned URL を直接記述しても、それだけでは復元しない。
- 見出し・表・code・escaped text の通常構造を保持。
- 800 KiB ちょうどの UTF-8 本文を無切詰めで受理し、segment 連結改行を含む 1 byte 超過を拒否。
- entity serialization の膨張と媒体復元後についても出力上限を再検査。exact boundary は受理し、超過は `LLM_RESOURCE_LIMIT / possible / closed:true`。

## 主担当へ返した差分

初期 source の静的読取で、`parseAssetUrl` の真偽だけでは draft URL も許可すること、破棄要素・comment 内の未知 marker と大小違い予約 prefix の検査が不足することを報告した。主担当が notes scope 限定、case-insensitive reserved prefix、破棄要素と comment の検査を追加した。補助は製品ファイルを変更していない。

上記負対を追加し、主担当の修正後 source で初回 28/28 成功した。修正前の失敗実行はしていないため、静的指摘と修正後回帰根拠として記録する。失敗対・再実行はない。

## 実行と限界

主担当の明示的な単独実行枠で次を直列実行した。

```sh
pnpm exec biome check --write packages/core/src/adapters/node/llm/resultProcessor.test.ts
pnpm exec vitest run packages/core/src/adapters/node/llm/resultProcessor.test.ts --fileParallelism=false
```

Biome は 1 file を整形して成功。Vitest は 1 file、28 対成功、yield なしの exit 0。自己の合成文字列だけを使う純粋テストで、network、DB、worker、child、temporary directory、timer の生成はない。秘密値・既存本文・旧 proof は読み取っていない。

現在認可、note / asset の実対応、生成 HTTP、既 sanitizer 全体、DB commit、UI、全体型検査は対象外。認可済み map を作る application の責務や、後段 sanitizer の完全性をこの adapter テストで証明したとは扱わない。

専有 source と本報告を全文確認し、2 path を主担当へ返却する。未回収資源 / exec は 0、文書を含む全操作を停止する。
