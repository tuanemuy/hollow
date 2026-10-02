# P4f-2 PDF copy異常検査

## 結果と所有範囲

2026-09-27 19:53:41 JST開始の単独Node検査は2/2成功、失敗0、1.68秒、exit 0。対象Biomeも成功した。固定P4f-2-C/Eの実装補助であり、独立受入ではない。

追加は次の2ファイルだけである。

- `packages/core/src/adapters/libsql/__tests__/zipPdfCopyFailure.integration.test.ts`
- `.goal-implement/phases/P4f-2-copy-failure-test.md`

製品、既存テスト、共有fixture、管理正本は変更していない。既存`zipPdfFlow.integration.test.ts`の局所fixtureと、`zipPdfOwnership.integration.test.ts`の実FileHandle観測パターンを参照した。

## 2対の期待と観測

両対とも本人の正規PDF要求を2件受け付け、同一compute・artifactで成功させる。そのcacheを新しいPDF ZIP要求から取得し、返却bodyだけに故障を注入する。

| ID | 故障 | 結果 |
| --- | --- | --- |
| S1 | 先頭の非空chunkから1byteを除くshort read | ZIP childはfailed/ZIP_SOURCE_CHANGED、result=null。spoolはcleanup/result=nullで公開refなし、ZIP artifactなし |
| S2 | bytes数を変えず先頭1bitを反転するhash不一致 | ZIP childはfailed/ZIP_SOURCE_CHANGED、result=null。spoolはcleanup/result=nullで公開refなし、ZIP artifactなし |

共通の確認事項は次のとおりである。

- 実OwnedObjectRead.closedがresolveし、捕捉した実FileHandleはFD=-1
- ZIP execution終了、hold released、binding解除、active object owner0
- 元の本人要求と正当な兄弟要求は全フィールド不変
- 元PDF artifactは全フィールド不変、実storageの元bytesも不変、追加renderなし
- 正規sweepZip後にZIP予約0。PDF artifactは引き続き不変
- 終了時のFK違反0

## 実部分と故障注入の境界

実部分は自己隔離libSQL、正規account/save/PDF・ZIP受付、repository/UoW、CoordinatedObjectStorage、native FileHandle、owned read/write、終了待ち、通常ZIP回収である。

PDF plannerは既存pure実装を使う。PDF supervisor/renderer/workspaceはfakeで、小さい固定合成bytesを返す。実PDF形式やChromeの成功は主張しない。

注入対象は該当PDF storage keyの`openOwnedRead`返却bodyだけである。TransformStreamで1byte除去または1bit反転し、close関数とclosed Promiseは実体をそのまま返す。native closeにはgate・拒否・置換を加えない。元storage object、ZIP spool読取、他ノートのsourceは変更しない。

この2対は異常copy後の終了状態を確認する。close待ち中の保持、close拒否、unknown終了は[既所有検査](P4f-2-ownership-test.md)に分離し、故障行列を増やしていない。

## 実行と回収

主担当の整形・unit・build終了後に書込とNode枠の明示許可を受け、次を直列実行した。Nodeは初回成功、再実行なし。session 78342は終端exit 0まで回収済み。

```sh
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/zipPdfCopyFailure.integration.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipPdfCopyFailure.integration.test.ts --fileParallelism=false
```

teardownは全execution/transfers stopを待ち、自己変換streamのcancelと実owned close/closedを回収し、自己FileHandleのFD=-1を確認する。その後に自己DBをcloseし、当該DB/WAL/SHMと自己mkdtemp storageだけを削除する。2対の終了処理は成功した。未回収execは0、Node枠は主担当へ返却済み。

## 未検証と返却

実PDF妥当性、rendererのOS終了、500件/1GB、追加のread故障行列、HTTP/UI、全体型、全量テスト、build、本体runtime、fresh、旧proof、秘密、外部通信は対象外である。全体型の確認は主担当へ残す。

対象ソースと本報告を全文確認し、専有2パスを主担当へ返却する。文書を含む全操作を停止する。
