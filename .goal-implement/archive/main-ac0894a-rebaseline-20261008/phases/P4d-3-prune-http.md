# P4d-3 期限・prune後HTTPの限定補完

## 結果

2026-09-26T15:01:03+09:00 時点。P4d-3-B/G、[独立検証準備 M2](../reviews/P4d-3-prep.md) の残確認に対する限定テストは 3/3 成功、unhandled error なし、exit 0。製品不具合や共有 port の不整合は再現していない。これは実装補助の候補テストであり、独立 Verifier の受入や P4d-3 全体の合格ではない。

作成した製品側 path は `packages/core/src/adapters/libsql/__tests__/pdfAnonymousPruneHttp.integration.test.ts` のみ。報告先は本書のみ。既存製品・他 test・管理正本・本体 fresh・proof・runtime・browser・鍵・外部サービス・git・build は操作していない。

| 対 | 実行した経路 | 観測 |
| --- | --- | --- |
| 元 read が有効な単純 ticket expiry | 実 anonymous HTTP POST/303 → worker による ready → 注入 clock を ticket 期限へ進める → status / receive | status 200 は最小期限説明と元入口だけを返す。receive 410。両方 Refresh なし、no-store、title/body/form/script/meta Refresh なし。artifact bytes と元 link 設定は維持 |
| 正規回収・prune 後 | 実 manual POST で ready delivery → ticket 期限で `sweepPdf` → artifact 期限で `sweepPdf` → 次の `sweepPdf` | ready delivery は通常の期限処理で終了・削除。compute は closed/workspaceRemoved。artifact 保持中は expired shell と HTTP 200 の期限説明を維持。24h artifact の通常物理回収後に request が prune され、同じ receipt は HTTP 404。fixture signer は同じ claims を返し、元 link は有効なので、鍵喪失や共有解除による 404 ではない |
| ticket expiry と元認可喪失が同時 | ticket 期限の clock で実 `getSharing` / `changeSharing` により private 化 → sweep 前に status | request row は succeeded、artifact bytes は存在していても HTTP 404 が優先する。期限説明・元入口 anchor・title/body・Refresh は返さない |

各対で `PRAGMA foreign_key_check` は 0 行。prune を成立させるための直接 DELETE、参照の手動 null 化、状態の強制書換えは行っていない。

## 最小借用と隔離

fixture の局所構成は既存 `pdfFlow.integration.test.ts` と `pdfAnonymousLifecycle.integration.test.ts` を読み取り参照する。共有 fixture の抽出や既存 test の変更はない。

- 実 `createTestContainer` の自己 temp file DB と migrations、`createHollowContainer`、signUp / verifyEmail / saveNote を使う。メール送信はメモリ代替であり、外部へ送信しない
- 初期 link 設定だけは既存 flow と同じ synthetic token / envelope の SQL fixture を使う。認可喪失の操作は実単件共有 command を使う
- 実 `anonymousPdfHttp` と form binding、application usecases、実 libSQL repositories、`NodePdfExecution`、`NodePdfTransfers`、`CoordinatedObjectStorage` を接続する。HTTP handler はプロセス内で直接呼び、server を起動しない
- 専有 `mkdtemp` の storage に小さな synthetic PDF 風 bytes を publish する。artifact の存在と通常 worker による物理削除は実ファイルで確認する。workspace / supervisor は代替であり、実 Chrome の workspace や PDF 描画ではない
- 署名 port は fixture 自身が発行した receipt の完全一致だけを受け入れる in-memory map とする。外部文字列を decode して信頼せず、期限後も同じ claims を返す。実 key file の生成・読取はない。このテストは HMAC / strict canonical claims / rotation の検証を代替しない
- 各対の `afterEach` は execution.stop と transfers.stop を await し、その後 DB.close と自己 mkdtemp の削除を行う。sending reader を開く対はなく、ready delivery は通常期限処理で解放する。未回収 exec は 0

## 実行結果

主担当は UI のみを操作し、全量 Node と重ねないことを確認してから単一 file を実行した。

```sh
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/pdfAnonymousPruneHttp.integration.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/pdfAnonymousPruneHttp.integration.test.ts --fileParallelism=false
```

Biome は 1 file を整形し診断なし、exit 0。Node は 2026-09-26T15:00:50+09:00 開始、3/3 成功、所要 1.66 秒（tests 532ms）、exit 0。初回実行で全対が成功し、期待値の緩和や製品修正はない。yield された各 exec は同じ session を終端まで回収した。

## 未検証と返却

実署名器・本番 key・rotation、実 Chrome / PDF 描画、native browser の Refresh / ダウンロード、公開 canonical の別入口、password grant の別失効、sending reader の close 待機、全体型 / 全量 Node / build は本補助の未実行範囲。これらの先行根拠の現候補への適用と正式受入は主担当・Manager・独立 Verifier が扱う。新しい gate や試験行列は追加しない。

最終 test source と本書を全文確認して主担当へ所有を返却する。返却後はコード・文書・検査を含む全操作を停止する。
