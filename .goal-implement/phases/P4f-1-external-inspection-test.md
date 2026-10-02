# P4f-1 ZIP外部参照検査のテスト準備

## 状態

新規`packages/core/src/adapters/libsql/__tests__/zipExternalInspection.integration.test.ts`に5境界を記述した。テスト、型検査、Biomeは未実行。成功・実close・自己DB回収の実測根拠にはしない。

編集対象は新規テストと本報告だけ。製品、既存テスト、共有契約、管理正本は非編集。Node / pnpm / DB / browserの実行禁止を維持し、読取には`/usr/bin/sed`を`login:false`で使用した。外部アクセスは行っていない。

## 記述した5境界

| 境界 | 期待する検証 |
| --- | --- |
| 配信prepare / getでDNS・timeout | `REFERENCE_DNS`と`REFERENCE_TIMEOUT`をそれぞれ注入し、`EXTERNAL_API_ERROR`で拒否。artifact全フィールドとready ticketを保持する。許可応答へ戻した後に同ticketを取得し、保存bytesと比較 |
| PRIVATEの確定拒否 | 許可済み外部画像を含むZIPへ`REFERENCE_PRIVATE`を返す。外部projectionの確定不一致として`ZIP_NOT_FOUND`とartifact cleanupを確認し、再許可後も旧ZIPを復活させない |
| generationの一部判定不能 | 外部参照ありの子だけをDNS失敗、外部参照なしの兄弟を成功にする。partial、failed / succeededの区別、exclusions空、成功spoolのready ref保持を確認 |
| assemblyの判定不能 | 対象の全子attemptがsucceededになった後のinspectだけをtimeoutにする。run失敗・除外0・成功attempt維持・retry refとspool実bytes / 予約保持を確認 |
| failed-child retryの一時失敗 | 外部参照ありの成功spoolを含むpartialを作り、再試行確認後にtimeoutを注入。preview / retryを運用例外で拒否し、旧run / ref不変、新generation / ref / command receiptなしを確認 |

表は実行結果ではなく、現在のテストコードの期待値である。

## 静的根拠

`application/export/snapshot.ts`の`inspectExportSources`は既定`best-effort`を保ち、第4引数`require-determinate`でZIPの厳密検査を選ぶ。falseの理由が`REFERENCE_URL` / `REFERENCE_PRIVATE`以外なら`SystemErrorCode.ExternalApiError`を送出する。signal取消を検査結果より先に確認する。

`application/zip/generation.ts`は生成前と生成後のinspectに厳密方針を渡す。通常の運用例外は子の失敗へ分類する。`assembly.ts`は判定不能の運用例外を除外理由へ変換せず上位へ返す。`retry.ts`は再利用source検査を新run受付前に行う。`delivery.ts`は確定した外部identity不一致だけを本人照合後の退役へ接続する。

実公開portの理由文字列は`REFERENCE_`接頭辞付きである。fixtureは略称`DNS` / `PRIVATE`ではなく実wire値を使う。

## fixtureと後続実行の範囲

既存`zipFlow.integration.test.ts` / `zipRetirement.integration.test.ts`の自己DB・storage・純粋文書計画を局所参照した。

- 正式account / note受付と実UoWを使う構成。参照ありnoteと参照なしnoteを用意する
- `ReferenceProcessor`は既知の合成画像URLだけを返すpure fake。実DNS / HTTPは使用しない
- `inspectMany`は型付きfake、`fetch`は呼出時に失敗するspy。afterEachにfetch呼出0のassertionを置く
- 参照機能はfixture note保存後に接続し、保存時の外部取得・参照jobとZIP工程を分ける
- 成立確認用の生成は自己tmpの小STORE ZIPとpure plannerに限定。実外部画像bytesは取得しない
- assemblyへのfault切替はinspectの呼出回数に依存しない。自己DBの子成功状態を観測して切り替える
- afterEachはbody取消、execution / transfersのstop、owner / FK確認、DB close、自己tmp削除の順で記述

上記fixtureは起動していない。自己DB / tmp / native handleは今回生成していない。全体型との適合、pure fake候補とsanitizer / plannerの実接続、5対の到達と成功、afterEach回収は実行再開後の確認事項である。

## 実行再開時の限定候補

実行禁止解除と主担当の枠調整後に、主担当が次を実施する。

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipExternalInspection.integration.test.ts --fileParallelism=false
pnpm exec biome check packages/core/src/adapters/libsql/__tests__/zipExternalInspection.integration.test.ts
```

CANCELLED / RESOURCE_LIMIT / 未知 / null / signal取消優先と既定best-effortの純粋分類テストは主担当の`snapshot`テストが所有する。ここでは行列を複製しない。実DNS障害、HTTP / UI、実runtime、PDF、全体型、全OS終了保証は対象外。

## 返却

新規テストと本報告を全文静的確認した。読取execはすべて終端回収済み、未回収execは0。存在しなかった`snapshot.test.ts`の読取1件はexit 1で終了し、同試行を反復していない。

主担当へ新規ソースと報告の所有を返却し、担当文書を含む全操作を停止する。これは未実行の実装補助候補であり、独立受入や製品合格の報告ではない。
