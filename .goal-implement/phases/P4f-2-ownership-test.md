# P4f-2 PDF ZIP所有と回収検査

## 結果

2026-09-27 19:40:07 JST開始の限定Node検査は3/3成功、失敗0、1.85秒、exit 0。対象Biomeも成功した。固定P4f-2-C/D/Hに対するImplementer補助であり、独立受入ではない。

専有変更は次の2ファイルだけである。

- `packages/core/src/adapters/libsql/__tests__/zipPdfOwnership.integration.test.ts`
- `.goal-implement/phases/P4f-2-ownership-test.md`

製品、0031、既存テスト、共有fixture、管理正本は変更していない。参考fixtureは`zipPdfFlow.integration.test.ts`、`zipDelivery.integration.test.ts`、`zipWriteOwnership.integration.test.ts`、`zipFlow.integration.test.ts`である。

## 3対の観測

| ID | 期待 | 実結果 |
| --- | --- | --- |
| O1 | cache readの実native close待ち中の取消は所有を解放しない | 実FileHandleのclose呼出をgateし、FDが開いた状態で取消。hold reading、zip-source owner、run stopping、execution active、正のZIP予約を保持。sweepでも予約・hold不変。gate解放後のnative closeでFD=-1、run cancelled、binding解除、active owner0。通常sweep後にZIP予約0 |
| O2 | close拒否はunknownとして保持する | 実FDのclose呼出に拒否を注入。run stopping/ZIP_OWNERSHIP_UNKNOWN、hold reading、zip-source owner、execution active、予約を保持。stopは同codeで拒否。sweepでもhold/予約を解放しない |
| O3 | 未open holdは論理失効を妨げず、物理回収を待たせる | 正規trash→requestNotePurgeが確定しnoteはpurging。requestPdfはPDF_NOT_FOUND、ZIP previewはitems0/total0/excluded1、その確認によるrequestZipはZIP_NO_TARGETS。claimCopy/claimCleanupはnull。hold heldのままkey/generation/reservedBytesと実PDFファイルを保持、openOwnedRead呼出0、purge未完了。gate解放・ZIP処理終了・通常sweep後にpurge succeeded、note不在、実PDFはENOENT |

O3の新hold経路の拒否は、新規ZIP受付自体が成立しないこととして検査する。任意の別attemptを作ってacquireCachedの全predicateを独立検査する対ではない。

## 実部分と故障注入

実部分は自己隔離libSQL、正規account/save/PDF・ZIP受付、repository/UoW、CoordinatedObjectStorage、native FileHandle、owned read/write、Node execution/transfers、trash/purge/sweepである。PDF plannerは既存pure実装を使う。

PDF supervisor/renderer/workspaceはfakeで、41byteの合成出力を返す。Chrome、PDF形式妥当性、外部fetch、実renderer子processの停止は検査していない。テストのwaitForPoll gateは公開port上の自己待機を制御する。

O1/O2のfaultは、実storageが開いた自己FileHandleのcloseだけを差し替える。O1はgate解放後に保存したnative closeを実行する。O2は拒否を注入し、製品上の所有はunknownのまま残す。

O2のteardownは製品stopの拒否を確認し、故障注入を解除して保存したnative closeを実行する。全自己FD=-1を確認した後だけ自己DBとstorageを回収する。業務owner行をinactiveへ変更せず、hold解放・run終端・成功状態を偽造しない。この後片付けは製品recover成功の証拠ではない。

## 契約差と実行記録

| 開始時刻 JST | session | 結果 |
| --- | --- | --- |
| 19:37:17 | 50618 | O1/O2成功。O3の即artifact cleanup期待とready観測が不一致、exit 1 |
| 19:39:14 | 29172 | O1/O2成功。O3でpreview自体のthrowを期待したfixture誤り、exit 1 |
| 19:40:07 | 75055 | O1/O2/O3成功、exit 0 |

Manager採用判断では、trash/purgeの論理失効の正本はnote lifecycle/current readであり、artifactの内部ready状態だけでは取得できない。O3は即cleanup期待を除き、正規現在取得・新規受付・copyの拒否、物理pin、回収収束を検査する。直接retireによるcleanup移行とpin保持は[既flow検査](P4f-2-flow-test.md)に分離される。

ZIP previewは全対象除外時に空の候補と除外数を返す。ZIP_NO_TARGETSはrequestZipの拒否である。O3はこの公開API差を反映する。製品側の失権漏れには分類しない。

初回Biomeは複数変数宣言を指摘したため、専有testの宣言を分離した。最終対象Biomeは成功した。

```sh
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/zipPdfOwnership.integration.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipPdfOwnership.integration.test.ts --fileParallelism=false
```

## 限界と回収

- 3対は小さな1ノートのsynthetic検査である。500件、1GB、OS硬保証、実PDF出力、UI/HTTP、配備全体の安全性を証明しない
- O3は未open holdを解放する対であり、そこでnative readは開始されない。実reader close待ちはO1/O2に分離する
- 正常2対は全execution/transfers stop後にactive owner0、全3対はFK違反0を確認する。unknown対は業務ownerの保持を期待する
- 自己gateをすべて解放し、全stop Promiseを終端まで回収する。捕捉した自己FDを実closeし、DB helperの当該DB/WAL/SHMと自己mkdtemp storageだけを削除する。今回の全実行でこの終了処理は成功した
- 全体型検査、全量テスト、build、fresh、本体runtime、旧proof、秘密、外部通信は担当外で実施していない。全体型の確認は主担当へ渡す

対象ソースと本報告を全文確認した。未回収execは0、実行枠と専有2パスを主担当へ返却する。文書を含む全操作を停止する。
