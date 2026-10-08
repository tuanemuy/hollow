# P4f-2 PDF binding/holdスキーマ検査

## 結果と所有範囲

2026-09-27 19:12:52 JST開始の単独Node検査は16/16成功、失敗0、1.91秒、exit 0。対象Biomeは1ファイル成功。P4f-2-A/C/Hのスキーマ保証に対するImplementer補助であり、独立受入ではない。

追加ファイルは次の2点だけである。

- `packages/core/src/adapters/libsql/__tests__/zipPdfSchema.integration.test.ts`
- `.goal-implement/phases/P4f-2-schema-test.md`

製品、共有型、0031、既存テスト、管理正本は変更していない。実行時の製品不具合は検出していない。

## 固定条件と観測範囲

根拠は[固定計画](../plan.md)のP4f-2-A/C/H、[採用設計](../design.md)のPDF一括接続、[P4f-2提案](P4f-2-proposal.md)、`migrations/0031_zip_pdf_demand.sql`、`zipSchema.ts`、`zipPdfSchema.ts`、`domain/zip/pdf.ts`である。各ソースパスは`packages/core/src/adapters/libsql`を基準とし、domainのみ`packages/core/src`を基準とする。

| 条件 | 対数 | 許可と拒否の観測 |
| --- | ---: | --- |
| A: 旧HTML/Markdown互換 | 2 | running移行でもPDF6列は全null。PDF binding付与は拒否 |
| A: binding形・identity・期限・不変性 | 1 | admission後の完全bindingを許可。INSERT時binding、6種類の単独列、source/profile不一致、外部identity形式不正、run期限超過、付与後変更、holdなしcopy-readyを拒否 |
| A: 現在の親・世代・attempt | 6 | 非active親、異なるgeneration、旧attempt、取消generation、queued run、除外ordinalへの付与を拒否 |
| C: hold初期条件と期限 | 1 | 正常heldを許可。異なるartifact世代、初期reading、初期version不正、lease境界、child期限境界、delete claimあり、同attempt重複を拒否 |
| C: artifact期限・状態 | 1 | expiryと取得時刻の一致、cleanup artifactからのhold取得を拒否 |
| C/H: 未open holdの保護 | 1 | heldからcopy-readyを許可。artifact退役、世代変更、予約減少、cleanup claim、delete claim、artifact/hold削除、binding解除を拒否。closing→released→binding解除後にhold削除とcleanup/delete claimを許可 |
| C/H: claim・phase・再取得 | 1 | readingの完全claim pair、copying、closing、releasedを許可。片側claim、version飛越、phase逆行、closing時claim変更、released再取得、残るreleased holdへの再bindingを拒否 |
| H: active owner保持 | 2 | zip-sourceとzip-spoolそれぞれのactive owner行がhold/binding解放を拒否。inactive後は解放を許可 |
| H: stopping computeとrun終端 | 1 | stopping compute参照中のbinding解除、binding保持中のrun終端を拒否。compute closed・binding解除・attempt取消後のrun終端を許可 |

16対の内訳は許可・拒否を組み合わせる9対と、拒否を主目的とする7対である。各対の終了時に`pragma foreign_key_check`が空であることも確認する。

## 実行と自己資源

主担当からNode枠を取得し、次の1ファイルだけを実行した。session 89843は終端exit 0まで回収済み。再実行はない。

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipPdfSchema.integration.test.ts --fileParallelism=false
```

対象BiomeはNode検査前に実行し、exit 0。専有ファイルの整形だけを適用した。

```sh
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/zipPdfSchema.integration.test.ts
```

自己DBは既存`createTestContainer`が対ごとに新規作成する一時libSQLファイルである。`afterEach`の`finally`から`close()`を呼び、client close後に当該DBと当該WAL/SHMだけを回収する。16対の終了処理は成功した。独自Worker、FD、実PDF、storage objectは作成していない。実行枠は主担当へ返却済み、未回収execは0。

## 未検証と適用限界

- PDF artifact/file/hash、compute workspace、spool、object ownerは正規形の合成metadataである。実PDF生成、実bytes一致、Chrome、OS closeは検証していない
- active ownerをinactiveにする操作はSQL guardの条件差を示すfixtureであり、実close成功やunknown解消を表さない
- 未open holdの検査はmetadata退役・削除claimの拒否である。物理ファイル削除処理の接続は対象外
- bindingとholdを順に変更する自己SQLはスキーマ保証の検査である。cache取得/publish/copy-readyを同一UoWで確定する製品経路の原子性は証明していない
- 実需要判定、本人/匿名需要との共存、worker copy、prune/recover/boot/drain、容量、UI/HTTP、実PDFは主担当の後続統合範囲である
- 全体型検査、全量テスト、build、fresh環境、旧proof、秘密、外部通信は実施していない

対象ソースと本報告は全文確認済み。専有パスを主担当へ返却し、文書を含む全操作を停止する。
