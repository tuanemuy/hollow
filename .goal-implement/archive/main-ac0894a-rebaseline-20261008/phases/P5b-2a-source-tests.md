# P5b-2a 本文準備adapter

## 結果

固定P5b-2a-B/Hの本文準備とWorker所有境界を実装した。媒体placeholder補足後の最終unitは2026-09-28T04:26:32+09:00に49/49件成功、2.29秒、exit 0。専有3ファイルの最終Biomeも指摘なしで成功した。実装側の自己検査であり、独立受入ではない。

表の結合セルとリスト番号の安全な数値属性を保持する。共有ポート、既存parser、build、DI、runtime、DBは変更していない。

## 対象

- `packages/core/src/adapters/node/llm/sourcePreparer.ts`
- `packages/core/src/adapters/node/llm/sourceWorker.mjs`
- `packages/core/src/adapters/node/llm/sourcePreparer.test.ts`
- `.goal-implement/phases/P5b-2a-source-tests.md`

`NodeLlmSourcePreparer(workerPath: string | URL)`は固定`LlmSourcePreparer`を実装する。workerのbuild配備と通常DI接続は主担当が所有する。

## B: 入力・構造・coverage

UTF-8 text、HTML、Markdownを専用Workerで処理する。既存parse5とmarkedを使用し、新規依存を加えない。textは文字をescapeし、段落と行を保持する。HTML/Markdownは許可した本文構造だけを再構成する。script、style、能動要素、URL・event属性は出力しない。画像等は固定の未解釈noticeと代替テキストを残し、画像の意味を理解した結果としない。network APIをWorker内で拒否し、外部srcやCSSを取得しない。

送信する安全HTMLをUTF-8で64 KiB以下、最大16segmentにする。通常文章はcode point境界で分割し、wrapperを閉じて再開する。table/pre/codeは不可分で、超過は`LLM_RESOURCE_LIMIT`として全文の採用を拒否する。無言切詰めはない。

`firstBlock`と`blockCount`は安全化・分割後の順序付きblock列を示す。全segmentの連続coverage、ordinal、HTMLのSHA-256とbytesを親でも検証する。元のDOM node数や原本byte位置を表す値ではない。

原本50 MiBと生成本文800 KiBは別責務である。801 KiBのHTML原本から本文を準備する対と、50 MiB超をWorker生成前に拒否する対を分ける。全50 MiBを正常変換できるという資源保証は加えない。

### 認可済み媒体

主担当の固定portに従い、入力の任意`media`と出力の必須`media`を扱う。入力mapは主担当がcurrent note、固定原本、readyなnote-owned assetから認可済み対応を作る。本adapterはその認可を代替しない。

HTML/Markdownのparse済み`src`が`sourceUrl`と完全一致する場合だけ、固定`[[hollow-media:UUID]]`へ置換する。相対URLの正規化・外部取得はしない。UUIDはlowercase 8-4-4-4-12 hex表記、placeholderは不可分とする。mapped媒体にも未解釈noticeを付ける。未一致は既存alt/未解釈表示、text入力は置換なし、出現0のmapは出力から除外する。video/audioの直接srcが未一致の場合は子sourceも調べる。

mapは最大200、sourceUrlは2048 UTF-8 bytes以下、全出現は最大200。sourceUrlまたはplaceholderの重複、不正placeholderを拒否する。原本の予約prefix混入はraw入力とparse済みtext/属性・head/templateも検査し、HTML entity経由も拒否する。

Workerが同placeholderの出現数を集計し、親は全segmentの許可token集合・総数・各`occurrences`を再照合する。未知・不足・過剰・重複metadataを採用しない。生成後の未知/欠落/過剰検査とasset復元、本文commitは主担当が所有する。

## H: Worker所有

Workerは128 MiB old generation、16 MiB young generation、stack 4 MiBで実行する。30秒deadlineと外側AbortSignalを監視し、stdout/stderrを利用者出力へ転送しない。成功、通常失敗、取消、期限切れは実`exit`の観測後だけ返す。

`terminate()`のresolve/reject/throwだけでは終了を証明しない。実exit未観測なら`LLM_OWNERSHIP_UNKNOWN`、`delivery: not-sent`、`closed: false`を返す。実exitが先に証明されている場合は、terminateの後続rejectだけでunknownへ変更しない。外側のowner保持は主担当の責務である。

取消は`LLM_UNAVAILABLE`と外側signal、期限切れは`LLM_TIMEOUT`で区別する。不正応答は`LLM_SOURCE_INVALID`、Worker OOM codeは`LLM_RESOURCE_LIMIT`へ安全に変換する。入力・本文・元errorのcauseをerrorやlogへ出力しない。

## 検査

```sh
pnpm exec biome check --write packages/core/src/adapters/node/llm/sourcePreparer.ts packages/core/src/adapters/node/llm/sourceWorker.mjs packages/core/src/adapters/node/llm/sourcePreparer.test.ts
pnpm exec vitest run packages/core/src/adapters/node/llm/sourcePreparer.test.ts --fileParallelism=false
```

初回Biomeはglobal名のshadowと制御文字regexを指摘しexit 1。専有コードの命名と文字検査を修正後、3ファイルでexit 0。初回unitは2026-09-28T03:58:44+09:00に27/27件成功、1.47秒、exit 0。安全な構造属性保持の1件を加えた旧28件は2026-09-28T04:03:05+09:00に成功、1.52秒、exit 0。これは媒体port追加前の根拠である。

媒体補足後は49/49件成功。Biomeのtemplate literal推奨2件を局所修正し、最終checkは指摘なし・exit 0。unitの失敗はない。

構造対は日本語・emoji・escape、HTML/MDの見出し/table/code順、未解釈媒体、安全化、全文分割、16segment境界、巨大な不可分block、原本と本文上限の区別、不正UTF-8・制御文字を確認する。所有対は実Workerのtermination gate、成功/失敗/取消のexit待ち、遅い応答、期限、終了未証明3種、実exit後のterminate rejectを確認する。

媒体追加21件はHTML/MDの正当2回出現、segment境界の不可分、子source、非一致・text非置換、URLの2048 UTF-8 bytes境界、map/出現数の200境界、map重複・不正・大文字、原本の予約marker混入6形、親metadataの不足・数不一致・未知を確認する。親metadata故障注入はWorker protocolの検査であり、生成結果や本文commitの成立を証明しない。

OOMはcode注入の分類対であり、実OS OOMの資源保証ではない。30秒はfake timerによる期限分岐検査であり、全OSでの硬い終了時間保証ではない。unknown対の自己Workerは試験teardownで本来のnative terminateと実exitを回収する。その回収で業務結果をclosedへ書き換えない。

## 残り・回収

全体型、build、通常runtime、owned source read、model適合性、生成後sanitizer、外部LLM品質・課金はこの補助の対象外である。主担当の統合検査へ渡す。

全unitの自己Worker、一時workerファイル、timer/gateは回収済み。fake timerとspyは復元済み。未回収execと自己資源は0。単独Node枠は主担当へ返却済み。製品3ファイルと本報告を全文確認し、4パスの所有を返却する。文書を含む全操作を停止する。
