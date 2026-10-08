# P5b-2a回復ライフサイクル限定結合テスト

## 結果

P5b-2a-C/Hの限定3対が成功した。実自己childのowner record確定・自発終了・ESRCHと、正規UoWのdurable dispatch・回復を接続する。製品変更0、外部通信0。実装側補助であり、独立Verifierの受け入れではない。

対象は[llmRecoveryLifecycle.integration.test.ts](../../packages/core/src/adapters/libsql/__tests__/llmRecoveryLifecycle.integration.test.ts)。主担当が最新build35680の内側coreを固定し、通常環境停止・保全後に限定Node枠を移譲した。検査はソースに対するVitestであり、配布bundleや実HTTPのcrash試験ではない。

## 3対の根拠

| 対 | 期待と実結果 |
| --- | --- |
| intent-onlyと回復対象 | 自己childの実runtime UUIDでclaim/dispatch intentを正規repoに保存する。生存中の同領域acquireはLLM_OWNERSHIP_UNKNOWNを返し、別領域のpredecessors空のownerからrecoverしても対象DB行を変更しない。旧jobのlease超過時も機械jobs.claimはnullで行不変。childの実close・ESRCH後に同領域acquireが旧UUIDをpredecessorへ引継ぎ、recoverはterminal/unknown・local owner closed・budget0へ収束。生成再送0、旧本文保持、消費1保持 |
| 全応答保存済み | 正規repoに全1segment応答を保存しresponse-readyとする。childの実close・ESRCH後のrecoverはresponse-ready/closed/pendingへ収束。鍵portを外しconfigured=falseでも、実source Workerの入力identity再照合とresult/sanitizer/commitの後処理だけで成功する。generator呼出0、累積消費1 |
| ACK未確定の第三boot | first child終了後のmiddle childがfirst UUIDを未ACKで引き継ぐ。parentのrecoverはDBをunknown/closedへ確定し、ACK代替portだけがLLM_OWNERSHIP_UNKNOWNを返す。middleも自発終了すると、第三bootの実ownerはfirstとmiddleの両UUIDを保持する。assertReadyはACK前に拒否、再recover後は両ACK済み。既終端DB行を変更せず、再送0・消費1を保持 |

intent-onlyの外部結果unknownと、実process終了により証明されたlocal owner closedは別状態である。unknownを生成成功へ変換しない。lease期限は機械claim拒否の入力にだけ使い、終了証明には使わない。

## 実部分と代替部分

- 実自己childはNodeLlmRuntimeOwnership.acquireとowner recordの保存を行う。IPC終了指示でprocess.exit(0)し、parentがcloseイベント・exit0・その自己PIDのESRCHを確認する
- childのstdout/stderr/stdinは破棄する。IPCはruntime UUID・predecessor UUID・安全な失敗flagのみ。未知PIDの探索・列挙、他processへのsignal、強制killは行わない
- 15秒のchild内自発exit watchdogはテストの安全弁であり、実行3対では発火せず全childが通常exit0した。期限をclose成功と扱わない
- parentが自己file-backed libSQL DBに正規request・claim・prepare・dispatching CAS・intent・responseを保存する。DB I/Oの実行process自体はfixtureによる対応であり、child内のDB/HTTP crash E2Eではない
- intentはquota consumeを同Txで行う実repoを使用する。DDL/guard/既存テストを変更しない
- 実CoordinatedObjectStorage、source reader、SourceWorker、NodeLlmExecution、result processor、sanitizer、commitNoteを使用する。OpenRouter・profile・generatorは合成portで外部通信0
- ACK障害だけを代替portで注入する。実filesystemの電源断・fsync障害や全OS耐久を証明しない
- 同領域の記録再照合とESRCHは実adapter内部経路を使う。記録改ざん・PID再利用・EPERM・current runtimeのactive行回復拒否を本3対で全面再試験しない

## 実行

最終実行は2026-09-28T06:29:17+09:00開始、2.14秒、3/3成功、exit0。session56879は終端回収済み。最終限定Biomeはexit0、修正0。

```bash
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/llmRecoveryLifecycle.integration.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/llmRecoveryLifecycle.integration.test.ts --fileParallelism=false
```

初回は2026-09-28T06:28:42+09:00開始、1.90秒、0/3、session67170・exit1。fixtureがclaim後のdispatching CASより先にintentを呼び、全対がllm_dispatch_fencedで拒否された。正規worker順にfixtureだけを訂正し、許可された同file1回の再実行が上記3/3である。初回child3本も通常exit0・ESRCH、DB/tmp回収済み。初回失敗を製品不具合や回復失敗とは分類しない。

全体型・全量Node・build・runtime・ブラウザは補助未実行。実行成功と全体型成立は別であり、統合型検査は主担当へ残す。

## 回収と返却

最終3対のchildは計4本。全childの共有finish Promiseを回収し、execution.stop、SourceWorkerの実exit、FK違反0・active object_writes0を確認後、自己DBをcloseし当該mkdtempだけを削除した。未回収exec、自己child、SourceWorker、FD、DB、tmpは0。

新テストと本報告の全文を確認し、専有2pathを主担当へ返却する。製品・共有型・既存テスト・管理正本・fresh・旧proof・秘密は非変更。文書を含む全操作を停止する。
