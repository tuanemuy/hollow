# P4f-2 PDF待機需要の取消検査

## 結果と変更範囲

2026-09-27 19:46:26 JST開始の単独Node検査は3/3成功、失敗0、5.90秒、exit 0。対象Biomeも成功した。固定P4f-2-D/Hに対するImplementer補助であり、独立受入ではない。

追加は次の2ファイルだけである。

- `packages/core/src/adapters/libsql/__tests__/zipPdfCancellation.integration.test.ts`
- `.goal-implement/phases/P4f-2-cancellation-test.md`

製品、共有契約、0031、既存テスト、共有fixture、管理正本は変更していない。参考は`zipPdfFlow.integration.test.ts`、`pdfFlow.integration.test.ts`、`pdfAnonymousLifecycle.integration.test.ts`、`application/zip/pdfGeneration.ts`、`application/pdf/demandPorts.ts`である。

## 3対の期待と実結果

| ID | 期待 | 観測 |
| --- | --- | --- |
| C1 | 最後のwaiting需要はrenderer終了前に取消確定しない | 正規ZIP受付→第三需要→fake render開始後にcancelZip。rendererのsignalはabortedだがPromise未完了、PDF/ZIP execution active、compute stopping・workspaceRemoved=false・予約あり、ZIP run stopping/finishedAt=null、binding保持。sweepでもworkspace removeなし。gate解放によるfake終了後だけcompute closed、ZIP cancelled、binding解除 |
| C2 | 正当匿名兄弟がある場合はZIPだけdetachする | 正規匿名PDF要求が同一computeへ参加し、需要kindはanonymous。ZIP取消後にbinding解除・ZIP cancelledとなる一方、render signalは非aborted、PDF execution active、compute running。gate解放後に匿名status ready/匿名要求succeeded。本人PDF要求は0件 |
| C3 | typed PDF unknownを通常終了にしない | fake supervisorがSystemError(PdfOwnershipUnknown)を返す。fake PromiseとPDF executionが終了してもcompute stopping・workspaceRemoved=false・正の予約とZIP bindingが残る。ZIP runはstopping/ZIP_EXECUTION_UNPROVEN/finishedAt=null、ZIP execution active、stopは同codeで拒否。sweep後もcompute記録全体・binding・停止状態が保持され、workspace removeなし |

各対の終了時にactive object ownerは0件、FK違反は0件である。C3で必要な所有はcompute/workspace予約とZIP binding/runの形で残り、実object writerが動作中であることを要求しない。

## 実装経路とfakeの境界

実経路は自己隔離libSQL、正規account/save/ZIP受付と取消、匿名PDF受付/status、PDF/ZIP repository・UoW、Node execution/transfers、独立sweep、CoordinatedObjectStorageである。ZIPのwaitForPollは既存2秒実装のままで、短縮・差し替えをしていない。

PDF plannerは既存pure実装を使う。PDF supervisor/renderer/workspaceは小さい合成bytesを扱うfakeである。render Promiseはgateを待ち、abort後もそのgateが解放されるまで終わらない。終了フラグはPromiseのfinallyで記録する。これはfake処理の実際の終端観測であり、Chrome/native renderer/OS子processの終了証明ではない。

匿名署名portは、そのfixture内でsignしたclaimsだけをMapから返すin-memory実装である。署名暗号・鍵管理・wire形式の根拠にはしない。共有リンクの前提は自己DBのSharingRepository.saveを正規version/OCCで設定する。暗号envelopeは合成値であり、共有設定UIやリンク復号の検査ではない。匿名要求と現在authority検査は正規usecaseを通る。

## 実行と回収

主担当の実行枠で次を直列実行した。Nodeは初回成功、再実行なし。session 33848は終端exit 0まで回収済み。

```sh
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/zipPdfCancellation.integration.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipPdfCancellation.integration.test.ts --fileParallelism=false
```

各対のVitest全体timeoutはtest-only 15秒である。製品の120秒child期限、30分親期限、2秒pollは変更していない。

teardownは全render gateを解放し、開始したfake rendererの終了フラグと全execution/transfers stopのPromise終端を確認してから自己DBをcloseする。C3のZIP stop拒否は期待どおり保持し、業務computeをclosedへ書き換えたりbindingを消したりしない。fakeは実OS子process・workspace FDを持たないため、fake処理がsettledした後の自己fixture破棄と、製品上のunknown解除は別である。

DB helperの当該DB/WAL/SHMと自己mkdtemp storageだけを回収した。今回の全終了処理は成功した。未回収execは0、Node実行枠は主担当へ返却済み。

## 未検証と返却

実PDF妥当性、rendererのOS終了、native close故障、500件/1GB、期限境界の全行列、匿名の複数兄弟、HTTP/UI、recoveryによるunknown解除は未検証である。全体型検査、全量テスト、build、fresh、本体runtime、旧proof、秘密、外部通信は実施していない。

対象ソースと本報告を全文確認し、専有2パスを主担当へ返却する。文書を含む全操作を停止する。
