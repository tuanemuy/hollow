# P4e policy 実装補助

現在結果: 専有新規テスト 7 / 7 が初回の実 DB 実行で成功。限定 Biome も成功。初回失敗・検出した製品 fault はない。
対象: `packages/core/src/adapters/libsql/__tests__/batchSharingPolicy.integration.test.ts` のみ。P4e-D / F の代表ポリシーと current readers を対象とする。
根拠: 2026-09-26T16:54:53+09:00 開始の単独 Vitest は exit 0、7 成功。下記実行記録を参照。独立 Verifier の報告ではなく、実装補助の自己検証。
主判断: 全体 typecheck・統合・独立検証・P4e 受入判断を主担当へ委ねる。P4e 全体受入や独立検証成功とは扱わない。

## 確認範囲

- editor の sharing 受理後、viewer 降格または leave によって旧 queued 子を取消する。editor 復帰・再参加後も旧子は復活せず、新規 preview / accept からの処理だけが成功する。再参加は既存 repository の `join` を使う自己 fixture 操作。
- source workspace から移出した場合と、移出後に同じ workspace へ戻った ABA の場合、旧確認での新規受付を拒否する。受理済みの旧子も実行時に失敗し、共有状態を変更しない。
- workspace 削除受付は旧 queued sharing を取消し、現ノートがまだ active の段階で `currentPublicNote` / `readPublicNote` / `readSharedNote` を拒否する。
- batch の public / link / private に current readers が従う。公開 identity / canonical path と限定 token は保ち、private 後の link 再公開では旧 grant を許可せず、再解除後に読める。保護あり public の同意は preview の shareVersion に拘束する。
- 空本文の子は失敗しても後続の兄弟は成功する。本文修復前の retry 確認は拒否し、新しい parent preview の最新 failed 子だけを再試行する。成功済み兄弟は excluded で、attempt と共有状態を保持する。

## 実行記録

| 時刻 | コマンド | 区分 | 結果 |
| --- | --- | --- | --- |
| 2026-09-26T07:51:27+00:00 時点 | `pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/batchSharingPolicy.integration.test.ts` | 静的整形 | 成功、1 ファイル整形 |
| 2026-09-26T16:54:53+09:00 開始 | 下記単独 Vitest | 合成 fixture / 実 libSQL DB | 初回 7 成功、0 失敗。1.90 秒、exit 0 |

実 DB テストコマンド:

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/batchSharingPolicy.integration.test.ts
```

主担当の Node / Vitest 走行 0・未回収 exec 0 を確認してから実行し、実行中は主担当の Node 試験と共有 core / DTO / usecase の変更を止めた。session 63304 は終端回収済みで、成功を主担当へ通知し Node 実行枠を返却した。対象識別は上記開始時刻の専有テストと凍結された共有実装による。委譲制約に従い git / hash 操作はしていない。

## fixture と未検証

各ケースは既存 `createTestContainer` による新規 tmp libSQL DB と実 migrations / adapter / UoW / usecase / worker を使う。鍵は新規自己 tmp ディレクトリでのみ生成する。各 `afterEach` は passwordWork 停止、DB close と DB / WAL / SHM cleanup、自己 tmp 鍵ディレクトリ cleanup を行う。秘密値を含む状態は boolean 比較にして assertion diff へ出さない。

既存 core 12 ケース・主担当 batch sharing テスト・製品コード・全体管理正本は編集しない。全量 Node / 全体 typecheck / build / git・hash 操作、Fresh runtime / 旧 proof / ブラウザ / 外部サービスは対象外。全 role / renderer / rate 行列は追加しない。

7 ケースは `afterEach` の cleanup を含めて成功し、自己 fixture DB と tmp 鍵ディレクトリを回収済み。未回収 exec はない。コード・文書を含む担当 2 ファイルの全更新を終了し、所有を主担当へ返却する。
