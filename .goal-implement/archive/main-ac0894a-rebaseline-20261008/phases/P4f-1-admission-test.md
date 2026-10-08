# P4f-1 ZIP受付境界テスト

## 結果

2026-09-27T15:15:44+09:00開始の単独Node検査は5/5成功、exit 0。全体4.05秒、テスト3.11秒。15:16 JSTの限定Biomeは1 file / no fixes / exit 0。未処理エラー・最終afterEach失敗の報告はない。

固定P4f-1-Bの実装補助根拠であり、独立受入検証ではない。編集は新規`packages/core/src/adapters/libsql/__tests__/zipAdmission.integration.test.ts`と本報告だけ。製品、既存テスト、共有契約、管理正本は非編集。製品不具合は観測していない。

## 5対の観測

| 対象 | 観測 |
| --- | --- |
| 500件 / 501件・確認50件 | 正式saveNoteで作成した500件を10ページで確認。各ページ50件、同一confirmation、ordinal / IDの欠落・重複なし。最終nextOffsetはnull。受付は固定target / attempt各500件。501個の一意IDはpreview / requestとも`ZIP_SELECTION`で拒否し、新親0件 |
| 空本文・不可視・不存在を含む選択 | 選択4件、有効1件、除外3件。応答には有効noteのordinal / ID / titleだけを含む。除外ID・題名・本文をJSONへ出力しない。受付targetは元ordinal 2の有効noteだけ |
| 全件空本文 | previewは有効0件・除外1件・items空。requestは`ZIP_NO_TARGETS`で拒否。親とcommand receiptを作成しない |
| 本人枠 / global枠 | personal HTMLを受理中、同じ本人のWS Markdownは`ZIP_ACTIVE`、別本人のMarkdownは`ZIP_BUSY`。取消要求直後も枠を保持。queued取消をpumpで終端化した後だけ次の利用者が受理される。続いてWS Markdownも受理できる |
| 同commandの並行要求 | 同じpayloadの同時受付2件は同じreceiptへ収束し、lookupも一致。formatを変えた同commandは`ZIP_COMMAND_CONFLICT`。親・target・attemptは各1件 |

保存スタイルは`style: saved`を確認する。501件対は500個の実note IDに新しい非存在UUIDを1個加えた入力で、件数の前処理拒否を調べる。501件の本文生成は行わない。

## fixtureと範囲

既存`zipFlow.integration.test.ts`の自己DB・account・container接続を局所参照する。実`previewZip` / `requestZip` / `lookupZip` / `cancelZip` / `getZip`と、queued取消の収束だけを行う`pumpZip`を使う。

- 自己`createTestContainer`と実repository / UoW、正式signUp / verifyEmail / saveNote / createWorkspaceを使用
- 自己`mkdtemp`配下のCoordinatedObjectStorageを構成し、`recoverOwners`完了を待つ。既存rootには接続しない
- writer / planner / source reader / disk reservation / importerは、呼出時に失敗するspy。全5対で呼出0を確認
- native execution / transfersはstopをawaitする。生成worker・HTTP・ブラウザ・配信readerは起動しない
- spool / artifact / assembly行は全5対で0件。自己storage rootは所有sentinelだけで、ZIP bytesを生成しない
- 500件対の30秒はテスト実行の待ち時間上限。製品の期限や追加業務制約ではない

## 実行と回収

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipAdmission.integration.test.ts --fileParallelism=false
pnpm exec biome check packages/core/src/adapters/libsql/__tests__/zipAdmission.integration.test.ts
```

15:15:00 JST開始の初回検査は全5対のafterEachで失敗した。空ディレクトリを期待したfixtureに対し、正当な`.hollow-writer-owner`が存在したためである。業務assertionと生成port呼出0のassertionは通過した。自己所有の初期化を明示awaitし、sentinelだけを許す確認へ修正した。ZIP成果物を許す修正ではない。

初回session 7018はexit 1、再実行session 88349はexit 0まで回収した。全対でFK違反0件・active object owner 0件。afterEachはexecution / transfersのstop後に自己DBをcloseし、helperのDB / WAL / SHMと自己`hollow-zip-admission-test-*`ディレクトリを回収する。sentinelも自己tmpとともに削除する。既存runtime、fresh、proof、秘密、外部資源は操作しない。

## 未検証と返却

500件の実ZIP生成、媒体、PDF、配信、実runtime、UI / HTTP、全体型検査、全組合せの並行競合は対象外。受付とqueued取消の小対であり、生成性能やOS終了保証を示すものではない。

テストと本報告を全文確認し、主担当へ所有を返却する。単独Node枠は返却済み、未回収execは0。返却後は担当ソース・文書を含め全操作を停止する。
