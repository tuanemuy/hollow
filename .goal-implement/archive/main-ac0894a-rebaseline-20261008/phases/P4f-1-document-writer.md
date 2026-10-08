# P4f-1 ZIP document writer

## 結果

限定unitは2026-09-27T14:36:46+09:00に15/15成功、exit 0。全体589ms、テスト396ms。限定Biomeは2026-09-27T14:37:32+09:00に2 pathで成功、exit 0。未処理エラーの報告はない。

編集範囲は次の専有2 pathと本報告のみ。既存単件writer、共有port、DI、runtime、管理正本は非編集。

- `packages/core/src/adapters/node/zip/documentWriter.ts`
- `packages/core/src/adapters/node/zip/documentWriter.test.ts`

本作業は実装補助であり、独立受入検証ではない。主担当が全体型・統合・commitを担当する。

## 実装

`IsolatedZipDocumentWriter` は既存 `ExportDocumentWriter` を実装する。入力検査、plan schema、filename、planned bytes を既存 helper から再利用し、30 秒 deadline と Worker heap 128 + 16 MiB / stack 4 MiB を維持する。

メッセージは結果候補として保持し、実 `exit` event を観測してから成功・通常失敗を返す構造。終了 API の reject / throw、又は fulfilled でも exit 未観測の場合は `ZipExecutionUnprovenError` を返す。実 exit 済みなら終了 API の rejection 単独を unknown にしない。取消と deadline は終了待機中にも有効で、停止開始後の message は採用しない。

実装はspool作成前の文書計画を所有する。`ObjectOwnershipUnprovenError`や偽のstorage ownerを作らず、専用`ZipExecutionUnprovenError`を外側へ伝える。

## 検証

| 対 | 件数 | 観測 |
| --- | --- | --- |
| HTML / Markdown成功 | 2 | 検証済みplanを実Worker exit後だけ返す |
| 成功の終了待機gate | 1 | native terminateを遅らせる間は未settled、実exit後に成功 |
| 通常失敗の終了待機gate | 1 | 未知failureを固定安全エラーへ変換し、実exitまで未settled |
| 既知failure / 不整合maxBytes / crash / 結果なしexit | 4 | 安全な通常failureで終了。未証明エラーと区別 |
| preabort / 入力UTF-8上限 | 1 | Worker終了APIの呼出なしで拒否 |
| 終了待機中の取消 | 1 | 成功候補を取消に置換するが実exitを追い越さない |
| 30秒期限 / 遅い成功message | 1 | fake timerで既存期限を進め、実Workerからの遅いmessageを受信しても成功に戻らない |
| terminate reject / fulfilled / throwかつexitなし | 3 | 人工的なAPI故障を専用typed unknownへ区分。成功・closedにはしない |
| 実exit後のterminate rejection | 1 | 実終了証明を優先し、API rejectionだけでunknownにしない |

```sh
pnpm exec vitest run packages/core/src/adapters/node/zip/documentWriter.test.ts --fileParallelism=false
pnpm exec biome check --write packages/core/src/adapters/node/zip/documentWriter.ts packages/core/src/adapters/node/zip/documentWriter.test.ts
```

unit後の変更はテストspyの型注釈を公開`MockInstance<Worker["terminate"]>`へ明示したtype-only変更とBiome整形のみ。unitの実行コードは変えていない。全体型検査は未実施で主担当へ渡す。

## 自己資源と未検証

各対は自己`mkdtemp`配下の小さい合成`.mjs` workerを使う。terminate介入で把握した自己WorkerはafterEachでnative terminateを回収し、実exitを観測してから自己tmpだけを削除する。自然exit対はadapterのexit境界で応答する。全15対でafterEach失敗はない。unknown故障は自己APIへの注入であり、実OSの終了API障害が発生したとの主張ではない。

実`exit`も終了API settlementも発生しない場合、新しい終了期限を追加していない。終了待機を成功に変換しないが、その故障の有限応答は未証明。30秒は計画期限であり、OS終了の硬い上限ではない。主担当へこの境界を通知済み。

本対はworker protocolと所有境界の検査。実製品bundleのplanner実行、最大合法入力、OOM、native全メモリ上限、DB / runtime / HTTP / UI統合は未検証。既存fresh / proof / runtime / 秘密 / 他processは操作していない。

## 再開棚卸の記録と返却

2026-09-27T14:23:00+09:00の棚卸時点は2 path作成済み、unit / Biome / 型未実行、自己Worker / tmp未生成だった。Managerの凍結解除後に、主担当から単独unit枠を受領して本検査を実行した。

unit session 12730はexit 0で終端回収済み。Node枠を主担当へ返却し、未回収execは0。対象ソースと本報告を全文確認して所有を返却する。返却後は担当ファイル・報告を含む全操作を停止する。
