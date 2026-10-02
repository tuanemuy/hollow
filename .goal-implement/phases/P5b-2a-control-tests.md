# P5b-2a 取消・本文 undo・現在権限の結合テスト

## 結果

追加 2 対を含む最終実行は 2026-09-28 05:17:36 JST 開始、13/13 成功、3.94 秒、exit 0。最終の専有 Biome も成功。初期 11 対は 05:07:10 JST 開始、11/11 成功、3.35 秒だった。重複する実行を合算しない。実装側補助の代表対であり、独立受入ではない。

専有変更は次の 2 path のみ。

- `packages/core/src/adapters/libsql/__tests__/llmControl.integration.test.ts`
- `.goal-implement/phases/P5b-2a-control-tests.md`

製品・共有型・専有外の既存テスト・管理正本は変更していない。製品不具合は検出していない。

## Fixture と実体の区分

`llmFlow.integration.test.ts` の公開 fixture 構成を新ファイル内へ局所再利用した。各対で `createTestContainer` による自己隔離 libSQL DB と専用 `mkdtemp` storage を作り、正規 repository で合成 account / session / OpenRouter 接続 / original / 既存 job を準備する。ワークスペース作成と降格は現在の usecase を通し、初期 membership だけ正規 repository で設定する。

実体を用いる部分は UoW / repository、`CoordinatedObjectStorage`、`FileObjectStorage`、`NodeLlmSourceReader`、`NodeLlmExecution`、`NodeLlmResultProcessor`、既 HTML sanitizer、各 control / request / worker / note / workspace usecase。

原本 preparer は固定の正当 1 segment、モデル profile と生成応答は fake。原本 Worker、実 HTTP、実 LLM 出力の妥当性を本ファイルでは証明しない。生成終了 gate は work Promise の終了を模擬し、OS process 終了の証拠とは扱わない。runtime ownership と OpenRouter protector / control port も自己 fixture の fake であり、秘密・外部接続は使用しない。

## 13 対の確認結果

| 対 | 確認した境界 | 結果 |
| --- | --- | --- |
| 1 | queued 取消の冪等性、未送信予約のみ解放、旧本文維持、既 job 履歴 cancelled、生成未呼出 | 成功 |
| 2 | active 取消後も work 未終了なら owner / execution active、終了後 cancelled、消費済み 1 件は非返却 | 成功 |
| 3 | 別 actor の cancel / undo は非開示拒否、対象 job / 予約を変更しない | 成功 |
| 4 | undo は旧本文を新 revision として保存し、タイトル・user/original style・owner を保持。消費非返却、二度目 undo 拒否 | 成功 |
| 5 | 後続の通常編集後は undo 拒否し、後続本文・題名を上書きしない | 成功 |
| 6 | 新しい regeneration が待機中なら旧結果 undo 拒否、新 request の取消世代・予約を維持 | 成功 |
| 7 | 2 回の成功と各 undo 後も月内 consumed は 2。終端 job の cancel でも返却しない | 成功 |
| 8 | editor から viewer へ降格後の request / undo は現在 edit 権限で拒否し、既成功本文・履歴は維持 | 成功 |
| 9 | membership 変更の取消 fence は対象 actor × workspace だけ。同 WS の別 actor と同 actor の personal request は非干渉 | 成功 |
| 10 | active 生成中の trash → restore 後も旧生成は cancelled。遅い生成応答を本文へ採用せず consumed を維持 | 成功 |
| 11 | purge intent / purging lifecycle を確定して旧 undo を拒否。既成功履歴と consumed は維持 | 成功 |
| 12 | 正規 purge worker が実原本を物理削除し、terminal job を snapshot へ保存。note / original / LLM conversion / dispatch / reservation を解放して consumed を維持 | 成功 |
| 13 | editor → viewer → editor 復帰後も、abort を無視して返った旧生成応答は非採用。旧 job cancelled と旧本文を維持し、明示した新 command だけ成功 | 成功 |

対 9 は取消世代 fence、対 11 は purge intent と現在アクセスの範囲。対 12 で別途、同じ実 CoordinatedStorage を importing port へ接続し、正規 `sweepNotePurges` の物理回収完了を確認した。原本の exact storage key が処理前に存在し、処理後には所有管理ファイル `.hollow-writer-owner` だけが残ることを確認している。所有 sentinel は payload と数えず、製品 worker では削除しない。

対 13 は正規 `changeWorkspaceMember` によるロール降格・復帰であり、除名・再参加の実証ではない。旧 generator Promise が実際に合成応答を返した後も旧 note の version 0 / 本文を保持し、新 command でのみ version 1 へ進む。旧消費と新消費の合計 2 件を維持する。

タグ・公開設定の変更を伴う undo、全 role / scope 行列、月境界、quota overflow は追加していない。

## 実行

主担当の全体型検査終端後、明示された単独枠で実行した。

```sh
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/llmControl.integration.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/llmControl.integration.test.ts --fileParallelism=false
```

初期 11 対の Biome は専有 fixture の複数変数宣言 12 件を指摘して exit 1。`apply_patch` で宣言を分離し、再度 Biome が exit 0。意味の変更はない。初期 Node テストは初回で 11/11 成功し、session 2998 を exit 0 まで回収した。

追加後の初回実行は 05:16:55 JST 開始、12/13 成功、3.60 秒、session 11873 / exit 1。purge 前の root 件数を「原本だけ 1」とした fixture 期待が、実際の原本 1 と所有 sentinel 1 の計 2 に一致しなかった。この段階では purge を呼んでいない。製品不具合ではなく、自己所有 metadata と payload の区分を訂正した。

主担当の許可後に exact original key と sentinel の処理前後を比較する期待へ直し、最終 Biome 成功後、1 回だけ再実行した。05:17:36 JST 開始の最終 13/13 は 3.94 秒、session 37461 / exit 0。全 session は終端回収済み。

初期実行時の共有 worker 並行修正は、追加対実行前に主担当が安定を通知した。追加後の専有検査中は主担当も製品書込みを停止している。control API は変更されていない。補助による全体型・全量検査は未実行で、最終 build / 統合候補の精算は主担当が所有する。

## 回収と引渡し

各 afterEach で全 generator gate を解放し、実 `execution.stop()` の終了を待った。FK 違反 0 と `object_writes.active=1` が 0 を確認してから自己 DB を close し、当該 test の自己 storage directory だけを削除した。queued な自己業務 row の物理回収を製品の正常回収と偽装していない。

fresh / 既存 runtime / browser / 旧 proof / 既存鍵 / 秘密 / 外部通信 / 共有 fixture の操作はない。自己 DB / storage / deferred / exec の未回収は 0。

専有 source と本報告を全文確認し、2 path を主担当へ返却する。文書を含む全操作を停止する。
