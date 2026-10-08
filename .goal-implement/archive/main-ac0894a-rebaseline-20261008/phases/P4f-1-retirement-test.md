# P4f-1 ZIP取得時の不可逆退役テスト

## 結果

2026-09-27T16:13:46+09:00開始の単独Node検査は6/6成功、exit 0。全体4.89秒、テスト2.46秒。16:14 JSTの限定Biomeは1 file / no fixes / exit 0。初回成功で、未処理エラー・afterEach失敗の報告はない。

固定P4f-1-E/Gの局所修正に対する実装補助根拠であり、独立受入検証ではない。編集は新規`packages/core/src/adapters/libsql/__tests__/zipRetirement.integration.test.ts`と本報告だけ。製品、既存テスト、共有port / schema、管理正本は非編集。主担当の安定通知後に限定検査を実行した。

## 6対の観測

| 対象 | 観測 |
| --- | --- |
| 配信受付で本人の現在read喪失を確認 | viewer本人の完成ZIPに含まれるnoteをownerがWSからpersonalへ正式移動。artifactは観測前ready、本人のprepareは`ZIP_NOT_FOUND`、別Txからartifact cleanupを確認。WSへ正式移動で戻してreadが復帰しても旧prepare / ticket取得は拒否 |
| 既存ticketの取得で本人の現在read喪失を確認 | 同じ正式移動後、getで`ZIP_NOT_FOUND`。artifactのcleanupがTx確定し、read復帰後も旧ZIPは利用不可 |
| 内容不一致を確認 | note repositoryのread結果に別titleを注入。prepareは`ZIP_NOT_FOUND`、artifactはcleanup。注入解除後も旧ZIPは復活しない。本文保存hookではなく、取得時検査による確定退役を確認 |
| 未認証 / 別actor / 一時DB失敗 | prepareとgetの両方で拒否。本人の完成artifactは全フィールド不変。DB readの`SystemError(ExternalApiError)`はそのまま失敗し、失権の証拠にしない。本人による後続取得は成功し、実bytesが保存artifactと一致 |
| 内容不変moveとread維持 | ZIP要求本人であるownerがWSから自身のpersonalへ正式移動。旧artifactとrunは不変、旧ZIPを取得でき、実bytesが移動前と一致 |
| native close待ちと退役回収 | viewerの既存readerの実FileHandle.closeをgateで保留。他のprepareで失権を観測してretireし、sweepしてもartifact cleanup・ファイル実在・予約・非closed delivery・active owner・runtime transferを保持。gate解放後に実fd=-1 / delivery closed、次sweepでartifact removed / 実ファイルENOENT / 予約0を確認 |

read喪失2対は旧runと成功attemptの全フィールド不変も確認する。jobの履歴成功を書き換えず、現在のavailableだけをfalseにする。

ここで検査する拒否はapplicationの`ZIP_NOT_FOUND`。HTTPステータス変換や画面表示は実行していない。

## fixtureと接続

既存`zipDelivery.integration.test.ts`の自己storage・実FD gateと、`zipLifecycle.integration.test.ts`の正式move接続を局所参照した。

- 自己`createTestContainer`、実UoW / repository、正式account / workspace / note作成を使用
- viewer membershipは自己DBのrepositoryで配置。read喪失と復帰は`previewNoteMove` / `moveNote`で行い、membership取消hookの先行retireに依存しない
- 自己`mkdtemp`、CoordinatedObjectStorage、実STORE writer、source reader、execution / transfersを使用。HTML計画はpure planner、媒体なしの小synthetic文書
- 完成ZIPは`pumpZip`で生成し、成功とexecution終了を待つ。既存proofや本体生成物を借用しない
- 内容不一致と一時エラーは、専用containerのUoW内でnote readに局所注入する。自己DBの元note行は変更せず、spyは各Txのfinallyで復元
- native gateは実readerから得たFileHandleのcloseだけを遅らせ、解放後は保存した本来のcloseをawaitする。timeoutや取消を実close成功の代わりにしない

主担当修正の`checkedCurrentZipArtifact`を利用する入口は`prepareZipDelivery`と`getZipFile`。本検査はschema / repository / shared portを追加しない。

## 実行と回収

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipRetirement.integration.test.ts --fileParallelism=false
pnpm exec biome check packages/core/src/adapters/libsql/__tests__/zipRetirement.integration.test.ts
```

主担当とNode枠を調整し、session 2444をexit 0まで回収した。afterEachは自己gateを解放し、body.cancelと追跡中Promiseを回収する。execution / transfersのstop、spy復元、残る自己FileHandleのclose後にactive object owner 0件・FK違反0件を確認する。その後に自己DBをcloseし、helperのDB / WAL / SHMと自己`hollow-zip-retirement-test-*`ディレクトリを回収する。

既存runtime、fresh、proof、秘密、外部資源、未知PIDは操作していない。

## 未検証と返却

HTTP / UI、全体型検査、媒体の外部identity不一致、各recheck時点の全競合、実close拒否によるunknown保持、全1GB、全OS保証は対象外。内容不一致は取得時のread注入であり、DB内容変更の永続化を証明する対ではない。

テストと本報告を全文確認し、主担当へ所有を返却する。単独Node枠は返却済み、未回収execは0。返却後は担当ソース・文書を含め全操作を停止する。
