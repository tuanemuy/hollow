# P5b-2a runtime 所有・実行枠の実装補助検査

## 結果

2026-09-28 04:38:55 JST に開始した限定 Vitest は 2 files、21/21 成功、822 ms、exit 0。専有 2 files の Biome も exit 0。製品コードの変更と製品不具合の検出はない。これは Implementer 補助の自己検査であり、独立受入ではない。

変更したファイルは次の 3 件のみ。

- `packages/core/src/adapters/node/llm/runtimeOwnership.test.ts`
- `packages/core/src/adapters/node/llm/execution.test.ts`
- `.goal-implement/phases/P5b-2a-ownership-tests.md`

## 対象と根拠

正本は `application/llm/ports.ts` の `LlmRuntimeOwnership` / `LlmExecution`、`application/llm/ownershipError.ts`、`adapters/node/llm/runtimeOwnership.ts` / `execution.ts`。製品 source は読み取りのみ。採用済み runtime 世代の保全、実終了前の枠保持、typed unknown の停止拒否を対象とした。

### Runtime 所有: 10 対

- 新規 private directory 0700 / owner record 0600、predecessor なしの readiness。
- 現在生存中の自己 process を記録した owner の再取得拒否。
- 自己 child が実 adapter を取得し正常終了。child の close event、exit 0、当該 PID の ESRCH を観測してから次の acquire。
- 未 ACK predecessor を自己 child の 2 回目の取得・終了後も保持。親で再取得すると両 predecessor が残り、全 ACK 前は readiness を拒否する。
- ACK の永続反映と同じ ID に対する冪等性。ACK の業務処理順序はこの対の対象外。
- 既存 recovery lock を拒否し、その lock を削除しない。
- acquire 後に自己 owner record が変化すると ACK を拒否し、記録と未 ACK 状態を保持する。
- directory 0755、record 0644、record symlink を拒否する。
- 不正 JSON、必須 field 欠落、16 KiB 超 record を拒否する。

child は既存 `process.execPath` と `--experimental-transform-types` で実 adapter を直接読み込む。新依存、ビルド、旧生成物は使用しない。stdout/stderr は破棄し、IPC は自己 runtime ID / predecessor ID のみ。今回の自己 child は計 3 個で、すべて IPC 終了指示後に正常 exit 0 と ESRCH を確認した。fixture の 3 秒 SIGTERM fallback は終了証明を代用せず、今回の成功経路では使用しない。

### 実行枠: 11 対

- global 2、account 1、同じ job ID の重複拒否と正常 settle 後の再利用。
- deadline abort 後も work Promise が未 settle なら active と account 枠を保持。追加 60 秒の仮想時間経過でも解放しない。
- stop は 2 件とも abort するが、一方だけ終了しても完了せず、両 work Promise の settle 後に完了する。stop 後は新規開始を拒否。
- dispatch 前 cancel と期限経過済み開始では、work に aborted signal を渡す。
- `LlmOperationError(closed:false)` と当該 job の `LlmObjectOwnershipUnprovenError` は active を残し、他 account の開始も拒否。stop は `LLM_OWNERSHIP_UNKNOWN / possible / closed:false` を返す。
- `closed:true` の通常失敗、別 job ID の typed object error、通常 Error は当該所有 unknown とせず解放する。
- runtime readiness が拒否した場合、work を呼ばず operation を登録しない。

実行枠の ownership port / clock / work は fake と deferred。実 process 終了は runtime の自己 child 対だけで確認し、実行枠の Promise settle を OS 終了証明とは扱わない。typed unknown の work Promise 自体は終了済みだが、adapter 内の unknown 状態は保持したまま検査を終える。業務上の closed や ACK に変換する後片付けは行わない。

## 実行

主担当から明示された単独実行枠で次を直列実行した。

```sh
pnpm exec biome check --write packages/core/src/adapters/node/llm/runtimeOwnership.test.ts packages/core/src/adapters/node/llm/execution.test.ts
pnpm exec vitest run packages/core/src/adapters/node/llm/runtimeOwnership.test.ts packages/core/src/adapters/node/llm/execution.test.ts --fileParallelism=false
```

Biome は 2 files を整形し成功。Vitest は初回で 21/21 成功、失敗対・再実行なし。session 14563 は exit 0 まで回収済み。限定テスト以外の型検査・全量検査は実行していない。

## 回収と限界

自己 child の close 回収後に自己 `mkdtemp` directory だけを削除した。deferred は afterEach で解放し、execution stop の settle を待った。fake timers は復元し、child 用 fallback timer は解除済み。未回収 child / temporary directory / timer / exec は 0。

PID 再利用、同時 recovery の全行列、電源断や filesystem durability、DB recovery と ACK の原子性、実 HTTP / LLM / runtime の起動は未検証。未知 PID や既存 process に対する探索・signal、DB、fresh、旧 proof、秘密、外部通信、共有 fixture、管理正本の操作はない。

専有 source と本報告の全文確認後、3 path を主担当へ返却し、文書を含む全操作を停止する。
