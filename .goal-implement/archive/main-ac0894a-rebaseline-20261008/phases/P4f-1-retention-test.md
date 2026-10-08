# P4f-1 ZIP保持期限の接続テスト

## 結果

2026-09-27T15:09:58+09:00開始の単独Node検査は3/3成功、exit 0。全体1.78秒、テスト724ms。15:10 JSTの限定Biomeは1 file / no fixes / exit 0。未処理エラー・afterEach失敗の報告はない。

固定P4f-1-Fの実装補助根拠であり、独立受入検証ではない。編集対象は新規`packages/core/src/adapters/libsql/__tests__/zipRetention.integration.test.ts`と本報告だけ。製品、既存テスト、共有契約、管理正本は非編集。製品不具合は観測していない。

## 3対の観測

| 条件 | 観測 |
| --- | --- |
| partial ZIPの7日期限直前に確認し、期限到達後に新規retryを要求 | previewと受付の両方が`ZIP_NEW_REQUEST_REQUIRED`。command receiptを作らず、親行・旧終了日時を保持。sweepでartifactをremoved、retry refを0、予約を0にし、旧履歴はpartialのまま取得できる。旧artifactの配信受付は拒否 |
| partial ZIPの期限1秒前にfailed-child retryを受理し、旧期限1秒後にsweep | generation 2のactive refと元spoolの実bytesを保持。再試行は成功し、新artifactの公開時刻から7日を設定。旧generationの終了日時と元親の履歴期限は不変。新結果は成功済み子の再利用と第2試行を区別 |
| 一度もZIPを公開できていないassembly failureから、旧親90日期限1秒前にassembly retryを新親として受理 | active refを同じspoolへ引き継ぐ。旧期限1秒後に旧attemptのtitleを空へscrubし、旧履歴取得・旧command lookupを拒否。新receiptは追跡でき、同commandの再送で期限を延長しない。新runの成功結果は`origin: reused`、`title: null`。旧履歴や題名を新90日へ複製しない |

第3対は新artifactの期限後に実storageのcleanup経路を実行する。予約は0となり、旧親をpruneする。新receiptの90日期限後には新親・spool・artifact・assembly行もpruneされる。新runの終了日時は履歴期限まで不変。

第2・第3対のclock進行は、受理済みrunの処理期限内の2秒間である。期限後の新規要求を許すテストではない。完成partial ZIPを90日直前まで再試行できる前提も置かない。

## fixtureと境界

既存`zipFlow.integration.test.ts`の自己DB・storage・pure planner構成を局所参照する。実`previewZip` / `requestZip` / `previewZipRetry` / `retryZip` / `getZip` / `getZipDetails` / `lookupZip` / `pumpZip` / `sweepZip`を使用する。

- 自己`createTestContainer`、実Hollow UoW / repository、正式signUp / verifyEmail / saveNoteを使用
- 自己`mkdtemp`配下のCoordinatedObjectStorageと実Node STORE writer、source reader、execution / transfersを使用
- HTML文書計画はpure `planExportDocument`を使用。媒体なしの小synthetic文書だけを生成
- partial生成では特定子のplanner失敗、assembly failureではwriter失敗を注入。保持する成功spoolは実生成bytes
- 注入clockで境界時刻へ進める。自己sessionは毎回新しいtokenを発行してrepositoryへ配置し、認証期限とZIP保持期限を分離
- 元親、run、attemptの期限や終了日時、DB制約は変更しない
- 実storageのsweepを通す。物理削除APIのfake成功やDB削除だけによる回収代用は行わない

## 実行と回収

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipRetention.integration.test.ts --fileParallelism=false
pnpm exec biome check packages/core/src/adapters/libsql/__tests__/zipRetention.integration.test.ts
```

15:09:15 JST開始の初回検査はfixtureのsession tokenHash再利用によるUNIQUE制約違反で3対とも失敗した。ZIP期限検査前のfixture誤りであり、製品不具合ではない。helperで新tokenを生成する修正後、上記3対が成功した。期限の期待値は弱めていない。

初回session 66172はexit 1、再実行session 96145はexit 0まで回収した。全対のafterEachはexecution.stopとtransfers.stopをawaitし、active object owner 0件・FK違反0件を確認する。その後に自己DBをcloseし、helperのDB / WAL / SHMと自己`hollow-zip-retention-test-*`ディレクトリを回収する。別runtime、既存proof、fresh、秘密、外部資源は操作しない。

## 未検証と返却

pruneの大量行上限、全形式、媒体、PDF、HTTP / UI、実runtime、OS障害、unknown close、全体型検査は対象外。有限pruneはこの小fixtureの4回以内のsweepで確認しており、任意件数の回収回数を保証しない。

テストと本報告を全文確認し、主担当へ所有を返却する。単独Node枠は返却済み、未回収execは0。返却後は担当ソース・文書を含め全操作を停止する。
