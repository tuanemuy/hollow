# P3c Unicode・日付 adapter 補助

2026-09-10T23:51:02+09:00 開始、2026-09-11T00:00:20+09:00 最終確認。P3c-D / P3c-E / P3c-G の専有 adapter と unit test を実装した。限定 54 tests、対象の型検査、対象の Biome 検査、Unicode 再生成一致が成功した。製品の検索・UI・DB 接続の合格報告ではない。

## 変更と受渡し

| 専有 path | 変更 |
| --- | --- |
| [tagNormalizer.ts](../../packages/core/src/adapters/node/browse/tagNormalizer.ts) | Unicode 16 の幅 mapping＋NFD＋default full folding＋NFD を純粋 key 計算にする。trim / 非空 / 50 code point 検証は呼出側へ分離 |
| [civilDate.ts](../../packages/core/src/adapters/node/browse/civilDate.ts) | polyfill 0.5.1 の実 API に currentMonth を接続し、日付の最初の有効 instant を境界にする。IANA 名と入力年月を確認 |
| [unicodeData.ts](../../packages/core/src/adapters/node/browse/unicodeData.ts) | 同版の公式 data から再生成。幅 226 件、C/F 1557 件。生成 script・copyright・license・manifest を記録 |
| [unicode-sources.json](../../packages/core/src/adapters/node/browse/unicode-sources.json) | 既存 2 source の URL / SHA-256 を保持し、Unicode-3.0 license の URL / SHA-256 / 配布 file を追加 |
| [tagNormalizer.test.ts](../../packages/core/src/adapters/node/browse/tagNormalizer.test.ts) | 29 tests。幅・full folding・canonical 同値、意図しない互換統合の防止、版確認、全 mapping の整合 |
| [civilDate.test.ts](../../packages/core/src/adapters/node/browse/civilDate.test.ts) | 25 tests。UTC 半開区間、連続日、gap / overlap / skipped day、月境界・currentMonth・不正入力 |
| [UNICODE-LICENSE.txt](../../packages/core/src/adapters/node/browse/UNICODE-LICENSE.txt) | 公式 Unicode License V3 の全文を固定して同梱 |
| [generate-unicode.node.mjs](../../apps/web/scripts/generate-unicode.node.mjs) | 固定 manifest を入力として公式 URL と checksum を検査し、同版 data・license の確認完了後に生成。起動時 fetch は追加しない |

既存 [browse ports](../../packages/core/src/application/browse/ports.ts) は変更していない。主担当から引き継いだ型・名称と mapping の意味を保持した。port / source / schema / runtime / 他担当の test は編集していない。

主担当の wiring では `assertTagNormalizerUnicodeVersion(process.versions.unicode)` を起動時に一度呼ぶ。helper は `tagNormalizer.ts` の公開 export で、`16.0` 以外・未定義を `UNICODE_VERSION` で拒否する。`NodeTagNormalizer.key` 自体は ambient runtime を参照しない。主担当へ helper 名と責務を連絡済みで、callsite 変更はこの補助では行っていない。

表示名 trim / 1〜50 code point は内側 VO / 境界・後続 P3d に残す。key は空文字や長い候補検索入力も計算でき、入力を切り詰めない。scope 一意性・50 tag 制約を adapter に追加していない。

## 確認した意味

### Unicode

- 同値: 全角英数字、半角カナ＋濁点、Σ / σ / ς、ß / ẞ / SS、Straße / STRASSE、composed / decomposed、結合記号の順序、補助平面の case pair。
- 非同値: ① / 1、² / 2、㎒ / MHz、カ / か、é / e、I / dotless ı、İ / i、内部空白数、ZWJ の有無。
- default C/F を使い、Turkic T・simple S へ置き換えない。NFKC 全体、かな変換、アクセント除去、default-ignorable 除去を追加しない。
- 全 226 幅 mapping と全 1557 fold mapping を canonical key 同値として確認した。full folding 自体が定める ﬀ / ff、canonical な K / K は同値になる。
- 現 runtime の Unicode 16.0 を確認した。key の NFD と idempotence、runtime 版確認と key 計算の分離を確認した。

### 日付

`ZonedDateTime.toPlainYearMonth()` の未提供 API を、`toPlainDate().toPlainYearMonth()` へ修正した。日付境界は `PlainDate.toZonedDateTime({timeZone})` を使い、明示 00:00 の補正に依存しない。[Temporal の first-valid day 契約](https://tc39.es/proposal-temporal/docs/plaindate.html#toZonedDateTime)

| 対象 | 確認 |
| --- | --- |
| UTC 2024-02 / 2023-02 | 29 / 28 日、月全体と日別区間の一致 |
| Tokyo 2024-12 | 年越しの月境界、UTC との差 |
| New York 2024-03-10 / 2024-11-03 | 23 / 25 時間の日 |
| São Paulo 2018-11-04 | midnight gap、最初の有効 instant |
| Havana 2020-11-01 | midnight overlap、早い側からの日・月境界 |
| Apia 2011-12-30 | 存在しない日を start=end の空区間、月には civil 31 日を保持 |
| currentMonth | Tokyo の月末直前・直後、NY の UTC 月初、Tokyo 年越し、Apia の飛び越し |

各日区間は隣接境界が一致し、合計が月全体に一致する。固定 24 時間・月 30 日・固定 offset で生成していない。数値 offset は IANA 名として受け付けない。polyfill と Intl の RangeError は既存の BROWSE_MONTH / BROWSE_ZONE に変換し、予期しない別種の例外は隠さない。

## 実行根拠

| 日時 JST | 検査 | 結果 |
| --- | --- | --- |
| 2026-09-10T23:55:47+09:00 | 初回限定 tests | 52 成功 / 1 失敗。Intl が `+09:00` も受け付けたため、IANA-only の期待に不一致 |
| 2026-09-10T23:57:12+09:00 | named-zone の明示検査後 | 53 / 53 成功 |
| 2026-09-10T23:59:26+09:00 | 全 mapping と actual runtime 版確認追加後 | 54 / 54 成功、760 ms |
| 2026-09-10T23:59:40+09:00 まで | 固定 data / license の再生成 | 再生成前後の両 file bytes が完全一致 |
| 2026-09-10T23:59:40+09:00 | 対象 7 files の Biome check | 成功、変更なし |
| 2026-09-11T00:00:20+09:00 まで | adapter / test 4 files を入口にした strict 型検査 | 成功 |

```sh
pnpm exec vitest run packages/core/src/adapters/node/browse/tagNormalizer.test.ts packages/core/src/adapters/node/browse/civilDate.test.ts --maxWorkers=1 --no-file-parallelism
pnpm exec tsgo --ignoreConfig --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --types node --moduleResolution bundler --module esnext --target es2022 --skipLibCheck --allowImportingTsExtensions packages/core/src/adapters/node/browse/tagNormalizer.ts packages/core/src/adapters/node/browse/civilDate.ts packages/core/src/adapters/node/browse/tagNormalizer.test.ts packages/core/src/adapters/node/browse/civilDate.test.ts
node apps/web/scripts/generate-unicode.node.mjs
```

型検査の初回は files 指定時の `--ignoreConfig` 不足で TS5112、actual runtime を参照する test 追加後は standalone 呼出の `--types node` 不足で TS2591 となった。最終コマンドは両 option を明記して成功した。依存の追加・既存 tsconfig 変更はしていない。

Biome は専有 7 files に限定して import / format を整えた。全体 lint:fix / format / build、全体 typecheck / test は実行していない。再生成一致は生成物と license の bytes をメモリに保持し、既存 generator の再実行後に比較した。旧 temp / DB / storage は利用していない。

## 出所と生成

Unicode data の source は [16.0.0 UnicodeData.txt](https://www.unicode.org/Public/16.0.0/ucd/UnicodeData.txt) と [16.0.0 CaseFolding.txt](https://www.unicode.org/Public/16.0.0/ucd/CaseFolding.txt)。Unicode 16 の [ReadMe](https://www.unicode.org/Public/16.0.0/ucd/ReadMe.txt) の年と版を確認した。license は[公式 license.txt](https://www.unicode.org/license.txt)の Unicode License V3 を SHA-256 で固定した。

generator は Unicode source URL の版と CaseFolding header、全 source の SHA-256、license の URL / ID / SHA-256 を確認する。変化を自動採用せず不一致で停止する。license URL は版を含まないため、固定 checksum が更新検出の基準となる。source 更新時は manifest と版と配布 notice を明示的に見直す。生成物だけを runtime が import し、runtime / unit tests は外部 fetch しない。

生成物は正規化用の幅 / C/F mapping だけを保持する。canonical NFD は採用済み runtime の同 Unicode 版を使い、全 Unicode normalization を独自実装していない。新 library は追加していない。polyfill 0.5.1 は主担当が配置した既存 dependency を使用した。

## 対象の識別と残り

SHA-256 は 2026-09-11T00:00:20+09:00 の専有 file。個別 stage / commit は行わず、統合 commit は主担当へ返す。

| file | SHA-256 |
| --- | --- |
| tagNormalizer.ts | `a40140b4671b479e0f39a96d365b15268fd0dacfd7e7602aa74bd925ef101667` |
| civilDate.ts | `f0599ced056426df9cf850e1a7589c23cf15758860aeddd4127aa1cc0a181590` |
| unicodeData.ts | `aa19122222c72532cffecd3d79ed24b479bdee0c83285c36efe044fdb6342e01` |
| unicode-sources.json | `46532f078fac72dc9b2f4cc1624ecaa3bcc8622d42103decf810d68cf32b6b52` |
| tagNormalizer.test.ts | `216952421da2a5a0728040ca97eed4c38b2ecef77e2c83995f55f7bc0405aef1` |
| civilDate.test.ts | `d18201c1347b12f2f50c86d019efc412ad254c4abe7bf13b3ddcc2b7da8bdc37` |
| UNICODE-LICENSE.txt | `e7a93b009565cfce55919a381437ac4db883e9da2126fa28b91d12732bc53d96` |
| generate-unicode.node.mjs | `f6316e107c41c924fceabec45a21a6b9a65ea08f7d1e5dbaff7005cb5746ccf6` |

残りは主担当の外側 Unicode 版確認 callsite、実 tag reader / relation 接続、calendar / query / URL 接続と独立 Verifier の確認である。全 timezone・全 Unicode caseless conformance・製品認可・DB保全・UI・production は今回の検証範囲ではない。scope / tag の業務制約と日付条件を緩める新 gate は作成していない。

`goal-implement` の専有境界を守り、`doc-style` / `markdown-style` で結果と未実施を分けた。`spec` / `spec-implement`、補助 agent、goal API は使用していない。変更は指定 8 paths と本報告だけで、他担当・ユーザーの既存差分を上書きしていない。引渡し後は当該 path の書込みと全操作を停止する。

2026-09-11T00:02:12+09:00 に提出し、専有 8 paths を主担当へ返却する。実行中の自己 test / generator はなく、文書を含む全操作を停止する。
