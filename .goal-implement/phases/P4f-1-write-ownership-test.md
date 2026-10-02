# P4f-1 ZIP write ownership 限定テスト

## 結果

2026-09-27T14:43:37+09:00開始の単独Node検査は6/6成功、exit 0。全体2.49秒、テスト1.27秒。2026-09-27T14:43:57+09:00の限定Biomeは1 file / no fixes / exit 0。未処理エラーとafterEach失敗の報告はない。

固定P4f-1-D/F/Hの実装補助根拠。独立受入検証ではない。編集は次の新規テストと本報告だけ。

- `packages/core/src/adapters/libsql/__tests__/zipWriteOwnership.integration.test.ts`
- `.goal-implement/phases/P4f-1-write-ownership-test.md`

既存製品、既存テスト、共有fixture、管理正本は非編集。製品不具合は観測していない。全体型・統合検査は主担当の担当範囲。

## 確認した所有境界

| 工程 | 故障・待機 | 結果 |
| --- | --- | --- |
| child / assembly 各1対 | 実FD closeをgateし、取消後にsweep | native FDは開いたまま、stagingが存在。DB active owner、予約bytes、runtime activeを保持し、runはstopping。gate解除・実close後だけcancelled / owner解放となり、sweep後に予約0 |
| child / assembly 各1対 | 実FDのclose呼出をrejectへ差替え | `ZIP_OWNERSHIP_UNKNOWN`、run stopping、runtime active、DB active owner、staging、予約を保持。sweepでも変わらず、execution.stopは型付き所有未確認エラーでreject |
| child / assembly 各1対 | 実FDのwrite呼出をrejectへ差替え、closeは実行 | FDは-1、stagingなし、owner0、run failed。child予約はsweep後0。assemblyのkey/予約は回収されるが、正当なassembly retryに必要な成功spool参照とbytesは残る |

成功spoolを保持するassembly通常失敗で、全予約0を誤った期待にしない。unknownのUI失敗と実行枠・永続所有の解放を同一視しない。

## 接続とfixture

局所fixtureは既存`node/zip/ownedWrite.test.ts`のnative FileHandle故障注入と、`libsql/__tests__/zipFlow.integration.test.ts`の自己DB / storage接続を参照した。共有fixtureの抽出・変更はしていない。

- `createTestContainer`の自己DBと自己`mkdtemp`配下を使用
- 正式signUp / verifyEmail / saveNote / previewZip / requestZip / cancelZipと、実pump / sweep / repositoryを接続
- 実`CoordinatedObjectStorage.putOwnedBounded`、`NodeZipExecution` / `NodeZipTransfers`、`NodeZipWriter`、pure文書plannerを使用
- `node:fs/promises.open`は実openを呼び、自己root直下の該当`_zip_spool.part-` / `_zip.part-`だけを捕捉
- FileHandleの元closeを保存し、fault対象以外のファイルやprocessを操作しない
- FD close gate中・close拒否中の`fd >= 0`、staging存在、DB ownerと予約の維持を観測。通常経路・回収後は`fd === -1`を確認

`ObjectWriteCloseUnprovenError`から工程owner付き`ObjectOwnershipUnprovenError`への変換、`withOwner`のendWrite抑止、run stopping / runtime unknown保持までを実製品接続で確認した。

## 実行と回収

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipWriteOwnership.integration.test.ts --fileParallelism=false
pnpm exec biome check packages/core/src/adapters/libsql/__tests__/zipWriteOwnership.integration.test.ts
```

主担当から単独Node枠を受領し、session 14804をexit 0まで回収した。再実行は不要。終端後にNode枠を返却済み。

afterEachはgate解放、execution / transfersの停止Promise回収、spy解除、保存した元closeによる自己FD回収、FK確認、DB close、自己tmp削除の順。全6対の`pragma foreign_key_check`は0件。通常対のactive ownerは0件。

unknown対のexecution.stopは想定どおりrejectし、DB owner / runは保持したまま。保存した元closeによるテスト資源の回収を、製品のunknown解除・正常stop・復旧成功とは扱わない。永続ownerを手動で消さず、自己DBを閉じてfixtureを回収する。

## 限界と返却

小さい合成HTMLと実STORE / 自己FD / 自己DBの接続検査。close / write拒否は人工注入であり、実OSで当該障害が発生した証拠ではない。最大1GB、OS硬保証、未知process、実fresh / proof、HTTP / UI、製品再起動復旧、全体型検査は対象外。

テストと本報告を全文確認し、主担当へ所有を返却する。未回収execは0。返却後は担当ソース・文書を含む全操作を停止する。
