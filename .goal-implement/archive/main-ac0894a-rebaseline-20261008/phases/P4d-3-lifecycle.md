# P4d-3匿名PDF lifecycleテスト

## 結果

2026-09-20T13:08:27+09:00の限定Node integrationは7件成功、失敗0件、unhandled error 0件、全体2.28秒でexit0となった。2026-09-20T13:08:51+09:00までの限定Biome検査は1ファイル・指摘0・exit0である。製品不具合は今回の対では再現していない。これは主担当候補のテスト実装であり、独立受入ではない。

変更先は新規`packages/core/src/adapters/libsql/__tests__/pdfAnonymousLifecycle.integration.test.ts`と本報告だけである。既存製品、共有fixture、前担当の署名器とpage、管理正本は変更していない。

goal-implement/manager-loop/CLAUDE.mdの同日既読版、brief.mdの匿名PDF節、design.mdの匿名PDF・共通物理所有・purge境界を適用する。`pdfAuthorization`のアカウント/WS構成と`pdfFlow`の自己隔離fixtureを読み、必要部分だけを新ファイル内へ局所構成した。spec/spec-implementは使用していない。

## 観測した対

| 対 | 操作と確認 | 結果 |
|---|---|---|
| trash/restore | `trashNote`直後に旧匿名requestがinvalidated。restore後も旧ticket、同command再送、manual prepareを拒否し、新commandだけが現在のready cacheを取得 | 成功 |
| ready deliveryとpurge | private workspaceのcleanup完了を先に確認。匿名ready delivery中はpurgeを完了せずlive参照と実bytesを保持。delivery閉鎖・回収後だけnote削除とlive切離し | 成功 |
| reader closeとpurge | 実`getAnonymousPdfFile`でreaderをholdし、cancel後のsource finallyをgateで停止。slot、sending row、active object owner、live参照、実bytesを保持。close解除後だけ回収が進む | 成功 |
| artifact実削除 | `removeClaimed`の実行直前でgateを停止。purge runningとnote/requestのlive参照、実bytesを確認。解除後の実削除を経てsucceeded/live nullになる | 成功 |
| move後の旧WS削除 | 同内容のnoteを別WSへ移し、旧WSを削除・sweep。旧WSの対象note数0、移出先noteと匿名request/authority/source identityを保持。旧ticketによる新deliveryも成立 | 成功 |
| compute/workspaceと有限prune | 101件のterminal shellをcompute未終端中とworkspace未回収中に保持。回収後の1回目pruneで1件、2回目で0件になる | 成功 |
| delivery/artifactとprune | ticket期限後もnonclosed deliveryとartifact参照を保持。artifact期限後も非closed deliveryがある間はartifact cleanup不可。delivery閉鎖後もartifact実体の回収までshellを保持し、実回収後にprune | 成功 |

各対の終端で`PRAGMA foreign_key_check`は0件だった。purge対ではrequest/artifact/computeのliveNoteId切離しを確認する。単なるcancel要求や期限通過を物理終了の証明には使わない。

## Fixtureの範囲

DBは既存`createTestContainer`が毎回新規作成する自己隔離libSQLを使う。`createHollowContainer`、signUp/verifyEmail、createWorkspace、saveNoteは実applicationを通す。link状態の投入は既存pdfFlowと同じ小さなrepository fixtureであり、共有設定UIの検証ではない。

NodePdfExecution、NodePdfTransfers、CoordinatedObjectStorage、FilePdfSourceReaderは実adapterを使う。writerは既存の純粋document plan、workspace/supervisorはfakeである。artifactは小さな固定synthetic bytesを自己storageへ実保存し、readerと物理removeの境界を通す。PDFらしいprefixは配信境界を通すためのfixtureで、実PDF文書・Chrome描画・private workspace実回収の成功を意味しない。

署名器は自己mkdtempの0700 directoryと固定synthetic keyの0600 fileだけを読む。製品用鍵を生成・取得していない。101件のshellは正当な既存CHECK/portに従うrepository fixtureであり、APIから101要求を受理できることやrate制限の成立を主張しない。100件は既存の有限prune技術値であり、新しい業務上限ではない。

afterEachは全gateを解除し、stream cancelと開始済みの元cancel/回収Promiseを待つ。その後execution.stop、transfers.stopをawaitし、DB.close、自己mkdtempだけのrmの順で片付ける。mockは復元する。既存temp/proofへの探索・操作は行わない。

## 実行記録とfixture修正

指定コマンドだけでNode integrationを実行した。

```text
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/pdfAnonymousLifecycle.integration.test.ts --fileParallelism=false
pnpm exec biome check packages/core/src/adapters/libsql/__tests__/pdfAnonymousLifecycle.integration.test.ts
```

| 日時 | 結果 | 分類 |
|---|---|---|
| 2026-09-20T13:05:36+09:00 | 2/6成功、4失敗、unhandled 1、exit1 | Buffer/Uint8Arrayのfixture比較差と、先行assert失敗時の元cancel Promise未回収 |
| 2026-09-20T13:06:37+09:00 | 6/6成功、unhandled 0、2.10秒、exit0 | 型を揃え、元cancel Promiseの回収を接続 |
| 2026-09-20T13:07:25+09:00 | 6/6成功、unhandled 0、2.07秒、exit0 | workspace回収済みを先にassertし、delivery待機を分離 |
| 2026-09-20T13:08:27+09:00 | 7/7成功、unhandled 0、2.28秒、exit0 | artifact実削除gateと、artifact期限後のnonclosed delivery保護を含む最終候補 |
| 2026-09-20T13:08:51+09:00まで | Biome指摘0、exit0 | 対象1ファイルだけの最終read-only検査 |

初回4失敗のbytes内容は同じで、比較対象のBuffer/Uint8Array型が異なっていた。内容の期待を弱めずfixtureをBufferへ揃えた。sending対で先行assertが失敗した際、2回目のbody.cancelは元cancelの完了待ちを代替せず、DB.closeと競合してCLIENT_CLOSEDが出た。元Promiseを追跡してafterEachで待つよう修正した。これらはfixtureの誤りであり、製品を修正していない。

初回の限定Biomeはrequest helperと同名localの宣言前使用を1件検出した。local名をstoredRequestへ変更した。apply_patchの文脈不一致は適用前に失敗し、部分変更はない。最終検査では指摘0となった。

## 未検証と返却

全体型検査、Node全量、実PDF生成、OS/Chrome/browser、HTTP、fresh配備、native reader/process障害、公開authority分岐、membership競合の全組合せは未検証である。ここでのlink・同内容move・自己file回収の成立を、P4d-3全体の完成や独立検証の代替にしない。

製品DB/storage、既存鍵、runtime、既存proof、秘密、build、依存、gitは操作していない。自己テストのDBとmkdtempは回収済み。全execは1本ずつexitまで回収し、未回収execは0本である。無出力readは重複起動・中断していない。

新テストと本報告の全文確認後、主担当へ所有を返却し、コード・文書・検証を含む全操作を停止する。最終commitと全量checksは主担当が所有する。
