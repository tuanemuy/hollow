# P4f-1 ZIP / batch trash 確認契約テスト

## 結果

2026-09-27T14:59:13+09:00開始の単独Node検査は3/3成功、exit 0。全体1.10秒、テスト234ms。2026-09-27T14:59:31+09:00の限定Biomeは1 file / no fixes / exit 0。未処理エラー・afterEach失敗の報告はない。

固定P3e-C/DへのZIP processing fingerprint追加の実装補助根拠。独立受入検証ではない。編集は新規`packages/core/src/adapters/libsql/__tests__/zipBatchConfirmation.integration.test.ts`と本報告だけ。製品、既存テスト、共有契約、管理正本は非編集。製品不具合は観測していない。

## 3対の観測

| 条件 | 観測 |
| --- | --- |
| trash preview後に対象noteのZIPを受理 | note版は同じでもhasRunningJobsと指紋が変わり、旧確認のacceptは`BATCH_CHANGED` |
| ZIPを含むtrash preview後、同じrequestでfailed-child retryをgeneration 2として受理 | request ID、対象、hasRunningJobs=true、note版は同じ。generationにより指紋が変わり、旧確認のacceptは`BATCH_CHANGED` |
| 同じZIP runのlease期限だけ更新 | expected全体は同一。旧確認のacceptが成功し、batch子はqueued。ZIPのleaseとactive noteをそのまま保持 |

拒否2対はbatch親・子を作成しない。accept前後のZIP request / run / attempt行は不変で、未確認のZIPを取消しない。noteはactive・同じ版を保持する。

## fixtureと接続

既存`batch.integration.test.ts`の確認フローと`zipRepository.integration.test.ts`の正当な受付・完了・retry shapeを局所参照した。

- 自己`createTestContainer`と実Hollow UoW / repositoryを使用
- fixture account / sessionとpure `createNote`を自己DBへ配置。token hashは実containerの計算を使用
- `previewBatch` / `batchConfirmation` / `acceptBatch` / `getBatch`を実行
- ZIPは実repositoryでaccept / claim / finishAttempt / fail / finishClosed / acceptRetry / renewを実行。CHECK / FK / triggerを解除しない
- queued runは現行型の`finishedAt: null`を含む
- ZIP bytes、spool、artifact、native Worker、runtime、HTTPは生成・起動しない

生成成功やnative実closeを示すテストではない。親request・generation・ordinalの同一性とlease非包含の確認契約に限定する。PDF指紋に関する追加観察は調査・修正していない。

## 実行と回収

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipBatchConfirmation.integration.test.ts --fileParallelism=false
pnpm exec biome check packages/core/src/adapters/libsql/__tests__/zipBatchConfirmation.integration.test.ts
```

主担当と単独Node枠を調整し、session 45375をexit 0まで回収した。再実行は不要。全3対でFK違反0件、active object owner 0件。afterEachで自己DBをcloseし、helperが自己DB / WAL / SHMを回収した。追加tmpやnative handleは生成していない。

## 未検証と返却

batch受付後のworker実行、他種類のjobとの全組合せ、UI / HTTP、全体型検査、実fresh / proof、PDF指紋は対象外。全体統合は主担当の担当範囲。

テストと本報告を全文確認し、主担当へ所有を返却する。Node枠は返却済み、未回収execは0。返却後は担当ソース・文書を含め全操作を停止する。
