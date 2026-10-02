# P4f-2 PDF ZIP接続検査

## 結果と所有範囲

2026-09-27 19:31:56 JST開始の最終限定Node検査は4/4成功、失敗0、2.05秒、exit 0。対象Biomeも成功した。固定P4f-2-B/C/D/E/Fの小代表flowに対するImplementer補助であり、独立受入ではない。

追加は次の2ファイルだけである。製品、schema、共有fixture、既存テスト、管理正本は変更していない。

- `packages/core/src/adapters/libsql/__tests__/zipPdfFlow.integration.test.ts`
- `.goal-implement/phases/P4f-2-flow-test.md`

## 各対の期待と観測

| ID | 対象 | 実結果 |
| --- | --- | --- |
| F1 | 第三需要からPDF publish、hold、ZIP copy | 正規preview/request/pumpでwaiting-pdfとなり、PDF需要のkindがzip-child。独立sweepPdf後にartifact readyとcopy-ready/heldを観測。本人・匿名要求表は0件。gate解放後に実storageからSTORE ZIPを作成し成功 |
| F2 | 既存本人PDF cache | 本人PDF成功後のZIPが同じartifactのreading holdを取得し、bindingはcopying。render回数は1のまま。ZIP完成後も元本人要求は全フィールド不変 |
| F3 | held中の論理retireとcopy継続 | 正規retireでready→cleanup。key/generation/reservedBytesを保持し、claimCleanupはnull。独立sweepPdfでPDF作業領域の回収を進めてもartifactは保持。既存copyとZIPが成功。次の正規要求から旧artifactへのacquireCachedはfalse、新artifactで完成 |
| F4 | 正当な本人兄弟需要の保持 | 同一computeに結び付くZIPを取消しても本人需要とqueued computeが残る。ZIPはcancelled、bindingは解除。独立sweepPdf後に本人要求はsucceeded |

F1〜F3の完成検査はZIP全体bytes/SHA-256、STORE方式、`PDF集合.pdf`とmanifestのflat名、ZIP内部PDF entryと合成出力bytesの完全一致、hold released、binding解除を含む。各対の終了時にactive object ownerが0件、FK違反が0件であることを確認する。

## 実部分とfake部分

実部分は自己隔離libSQL、正規account/save/preview/request/usecase、PDF/ZIP repositoryとUoW、NodePdfExecution/Transfers、NodeZipExecution/Transfers、CoordinatedObjectStorage、owned read/write、NodeZipWriter、ZIP bytesの読戻しである。

PDF documentは既存pure plannerを使う。PDF supervisor/renderer/workspaceはfakeであり、固定の小さな合成bytesを返す。workspace removeの成功もfake契約である。独立PDF workerは公開されている`sweepPdf`で進める。`pumpPdf`というexportは存在しない。

自己ZIP executionのwaitForPoll gateと、cache対のopenOwnedRead呼出前gateだけをテストで制御する。gate解放後のstorage処理は実実装である。実Chrome、PDF形式の妥当性、OS subprocessの終了保証、1GB/500件の資源特性は測定していない。

## 失敗の切分けと実行記録

| 開始時刻 JST | 対象 | 結果 |
| --- | --- | --- |
| 19:26:23 | 4対、session 23052 | 3成功、F3がVitest既定5秒timeout、exit 1 |
| 19:27:41 | F3全体timeoutをtest-only 15秒にした4対、session 53698 | 3成功、次要求のwaiting-pdf待機で失敗、exit 1 |
| 19:28:29 | F3だけ、session 8394 | 次attemptがfailed/PDF_BUSY、runがfailedと観測、exit 1 |
| 19:29:20 | 正規PDF cleanup pumpを含む4対、session 40533 | 4成功、exit 0 |
| 19:31:31 | computeId明示nonnull guard後の4対、session 37846 | 4成功、exit 0 |
| 19:31:56 | 主担当の取得前poll実装安定通知後、session 92661 | 4成功、exit 0 |

`pdfComputations.begin`はclosedでもworkspaceRemoved=falseの計算があればPDF_BUSYとする。F3の初回fixtureは生成終了後の独立回収pumpを実施していなかった。前ZIP executionはactive=falseまで待機済みであり、ZIPの実終了前再起動ではない。

F3はheld/cleanup中に`sweepPdf`を呼び、workspaceRemoved=trueとartifactのkey/generation/reservedBytes保持を確認してからcopyを進める。製品のPDF_BUSY判定や時間制限は変更していない。連続PDF子での一時busy待機方針は主担当の別作業であり、この検査の完了扱いには含めない。

主担当の型検査でF4のnullable computeId引数2件が検出された。専有testにconst取り出しと明示nonnull guardを追加した。castは使用していない。続く対象Biomeで改行整形差を検出し、当該ファイルだけ整形して成功した。型検査の最終確認は主担当が所有する。

主担当は取得前PDF_BUSY/PDF_STOPPINGのpollを製品に追加した。最終runはその安定通知後のsourceで実行した。4対は正規sweepで回収を進めるため、新pollの繰返し・期限境界を直接検査する対ではない。

実行コマンドは対象1ファイルに限定した。

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipPdfFlow.integration.test.ts --fileParallelism=false
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipPdfFlow.integration.test.ts --fileParallelism=false -t 'allows held copy'
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/zipPdfFlow.integration.test.ts
```

## 証明範囲と後続

- publish→holdとcache→holdは製品の同一UoW経路を通り、確定後の対応状態を観測する。トランザクション途中の故障注入・rollback行列は未実施
- F3の新要求は新computeへattachするため、旧artifactのcleanup状態に加えてcompute不一致も存在する。cleanupだけの拒否predicateを単独で分離した対ではない
- current readが有効で内容が不変のcopy継続を検査する。hold取得後の失権、本文変更、PDF期限越え、匿名兄弟取消、実close故障、prune/recoveryは今回の代表対に含めない
- 4対は1要求1ノートである。同一ZIPの連続PDF子、部分失敗・retry、実UI/HTTPは未検証
- 全体型検査、全量テスト、build、本体runtime、fresh、旧proof、秘密、外部通信は実施していない

## 回収と返却

全自己gateを解除し、ZIP/PDFのexecutionとtransfersのstopを全件awaitしてから自己DBをcloseする。DB helperは当該DB/WAL/SHMだけを回収し、自己mkdtempのstorageだけを削除する。unknown終了を正常closeへ変換しない。今回の全実行で終了処理は成功し、active owner/FK検査も成功した。

全sessionを終端まで回収し、未回収execは0。Node枠は主担当へ返却済み。対象ソースと本報告を全文確認し、専有2パスを主担当へ返却する。文書を含む全操作を停止する。
