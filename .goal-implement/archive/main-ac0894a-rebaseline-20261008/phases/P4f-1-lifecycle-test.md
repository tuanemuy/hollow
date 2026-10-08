# P4f-1 ZIP lifecycle hook 限定テスト

## 結果

2026-09-26 21:08:53 JST 開始の単独 Node 検査で 9/9 成功。実行時間は 3.44 秒、テスト部分は 2.41 秒。未処理エラーの報告なし。21:09:21 JST に限定 Biome 成功を確認した。

本作業は主担当候補の実装補助であり、独立受入検証ではない。新規編集は次の 2 path のみ。

- `packages/core/src/adapters/libsql/__tests__/zipLifecycle.integration.test.ts`
- `.goal-implement/phases/P4f-1-lifecycle-test.md`

既存製品、既存テスト、共有 fixture、管理正本は非編集。全体型検査と最終統合は主担当の担当範囲。

## 確認した接続

| 対 | 観測 |
| --- | --- |
| editor → viewer | read 維持でも未終端の該当 ordinal は `ZIP_CANCELLED` / cancelled。失敗・再試行対象にはならず、同じ run の personal 兄弟は成功。完成済みの読取可能 artifact と旧 run / attempt は保持 |
| 除名・本人離脱 | 各 1 対。該当 actor の完成 artifact は cleanup、別 actor の完成 artifact は ready。再参加後も旧取得は `ZIP_NOT_FOUND`。旧成功 attempt / run は不変 |
| 先移出 | 正式 preview / move により別 WS へ先に移した note は、旧 WS からの除名に巻き込まれない。移出先 viewer の current read による取得準備が成功 |
| title・HTML・style 実差分 | 各 1 対。未終端該当 ordinal は `ZIP_CONTENT_CHANGED` / excluded。旧 artifact は cleanup、旧成功 attempt / run は不変。兄弟は成功し、除外対象は retry 候補に含まれない |
| 同値 save / style・タグのみ | 1 対内で正式 usecase を順に実行。待機 run / attempt と旧完成 artifact / history は不変。タグ付与は実 DB で確認し、新 run と旧取得準備は成功 |
| trash → purge 受付 | 明示取消同意付き trash の後に purge を受理。note は purging、該当 ordinal の CANCELLED 除外は重複せず、兄弟は成功。旧成功 attempt / run は不変 |

membership の初期配置・再参加は自己 fixture の repository 操作。降格、除名、離脱、移動、本文変更、表示変更、タグ変更、trash、purge 受付は実 usecase を使用した。

## fixture と保全

局所 fixture は既存 `zipFlow.integration.test.ts` / `zipDelivery.integration.test.ts` の接続を参照した。共有 fixture の抽出・変更はしていない。

- `createTestContainer` による自己隔離 DB、自己生成 `hollow-zip-lifecycle-test-` ディレクトリだけを使用。
- `createHollowContainer`、signUp / verifyEmail、実 UoW / repository、`CoordinatedObjectStorage`、`NodeZipExecution` / `NodeZipTransfers`、実 `NodeZipWriter` を接続。
- HTML 文書計画は既存 pure `planExportDocument`。小さい合成本文による実 STORE 生成であり、ブラウザー / Chrome / PDF 生成ではない。
- 各生成終端後に runtime の当該 run 非 active を待機。afterEach は execution / transfers の stop を await してから、active `object_writes` 0 件と `pragma foreign_key_check` 0 件を確認し、DB close と自己ディレクトリ回収を行う。
- 本対は delivery の取得準備までで、配信 reader を open しない。unknown 所有故障や native reader close gate の証明には用いない。
- 初回失敗を含め afterEach エラーなし。既存 fresh / proof / runtime / 秘密 / 他 process は操作していない。

## 実行記録

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipLifecycle.integration.test.ts --fileParallelism=false
pnpm exec biome check packages/core/src/adapters/libsql/__tests__/zipLifecycle.integration.test.ts
```

初回 21:08:34 JST は 8/9 成功。trash 対の fixture が `cancelProcessing: false` だったため、主担当の active ZIP を含む `hasProcessing` 接続により `TRASH_PROCESSING` で拒否された。必要な明示同意を true に修正し、同じ業務期待で再実行した。製品不具合として扱わず、既存製品は変更していない。

再実行 21:08:53 JST は 9/9 成功、exit 0。最終 Biome は 1 file / no fixes / exit 0。主担当と単独 Node 枠を調整し、終端回収後に返却した。未回収 exec は 0。

## 未検証と返却

この file の範囲は queued ordinal への lifecycle hook と current 完成 artifact の退役・保持。running ordinal の native close 待機、物理 purge sweep 完了、全 retry 世代、HTTP / UI、PDF third-demand、最大件数・1 GB 実資源、全体型検査は本対では検証していない。`cleanup` を物理削除完了とは扱わない。

テスト全文と本報告を確認して主担当へ所有を返却する。返却後は製品・テスト・報告を含め全操作停止。
