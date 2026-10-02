# P5a認証schema・CASの限定検査

## 結果

P5a-A/C/E/Hのschema・repository境界14対は初回実行で成功した。独立受入ではなくImplementer補助の根拠である。実Google認証、HTTP、既存DBの移行保全は対象外。

所有する変更は次の2pathだけである。

- `packages/core/src/adapters/libsql/__tests__/authSchema.integration.test.ts`
- `.goal-implement/phases/P5a-schema-tests.md`

製品schema・repository・共有fixture・既存テスト・管理正本の編集はない。認証情報はsynthetic値だけを使用する。

## 代表境界

| 関連ID | 対数 | 確認内容 | 結果 |
| --- | ---: | --- | --- |
| P5a-A/E | 1 | password-only→both→Google-only→both→password-onlyの専用CAS、旧版拒否、古い`accounts.save`の復活拒否 | 成功 |
| P5a-A/E | 1 | 最後のpassword解除とGoogle削除をschemaで拒否、正規Google-only作成 | 成功 |
| P5a-A/B | 1 | issuer/sub一意、重複作成・linkのTx rollback、Identity更新・不正issuer拒否 | 成功 |
| P5a-C/E | 1 | ensureでepoch維持、advanceの旧版拒否、古いbound sessionのread拒否、legacy session・raw列・固定期限保持、遅い旧epoch session挿入拒否 | 成功 |
| P5a-C | 1 | legacyの現在epochへの一回binding、古いepoch・別browser再binding・binding解除拒否 | 成功 |
| P5a-C/H | 1 | attemptに参照されたbrowserのprune・削除拒否、epoch逆行拒否 | 成功 |
| P5a-C | 2 | reauth-readyのproof期限NULL・親期限超過拒否、合法5分期限の成立 | 成功 |
| P5a-C | 6 | pendingのverifier欠落・actorなしlink・epoch 0・開始同時期限・10分超過・proof混入拒否と行不変 | 成功 |

各対の終了時に`pragma foreign_key_check`の結果が空であることを確認する。負対は合法な自己fixtureから対象列だけを変更する。CASTやguard解除で不正fixtureを成立させない。

## 実行根拠

2026-09-27T21:59:38+09:00開始、2.37秒。session 60946をexit 0まで回収。14/14成功、1/1file成功、unhandled errorの出力なし。

```bash
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/authSchema.integration.test.ts --fileParallelism=false
```

実行前の対象Biomeはexit 0、1fileを整形した。

```bash
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/authSchema.integration.test.ts
```

実行後のsource確認では`GoogleIdentity`型注釈と`GoogleClaims`の`satisfies`を追加した。実値・操作・期待は不変で、Node再実行はしていない。最終sourceの`pnpm exec biome check packages/core/src/adapters/libsql/__tests__/authSchema.integration.test.ts`もexit 0、修正なし。全体型検査は主担当の範囲である。

## 製品修正との境界

静的調査で、reauth-readyの`proofExpiresAt <= expiresAt`だけではSQLのNULL比較がCHECKを通る条件を主担当へ報告した。主担当が`authSchema.ts`と0032の必須期限guardを補強し、安定通知後に14対を実行した。この補助は修正前の失敗を実測していない。修正後のNULL拒否は実測した。

## 限界と回収

- 旧passwordのseedは現在schema上の正規`createAccount`であり、旧DB cloneの0032移行保全を証明しない
- CASは順次の旧版衝突とTx rollbackを確認する。複数プロセスの競合試験ではない
- sessionのrepository readを確認する。HTTP cookie、OAuth callback、秘密暗号化、実Google・実メール、runtime停止は未検証
- `createTestContainer`の自己tempDBだけを使用し、全14対で`finally`から`close()`を呼ぶ。helperの自己DB/WAL/SHM回収以外の削除はない
- Worker・外部process・object storage・鍵は作成していない。fresh・旧proof・秘密ファイルには触れていない

限定実行枠は主担当へ返却済み。未回収execは0。ソースと報告の全文確認後、2pathの所有を主担当へ返し、文書を含む全操作を停止する。
