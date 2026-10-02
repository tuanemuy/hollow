# P4e sharing core 実装補助

現在結果: 限定テスト 12 / 12 が実 DB で成功。対象ファイルの Biome も成功。製品 fault は検出していない。
対象: `packages/core/src/adapters/libsql/__tests__/batchSharingCore.integration.test.ts` のみ。製品実装は変更していない。
根拠: 2026-09-26T16:35:33+09:00 開始の単独 Vitest は exit 0、12 成功。下記の実行記録を参照。独立 Verifier の報告ではなく実装補助の自己検証。
主判断: 全体 typecheck と P4e の統合・受入判断を主担当へ返す。P4e 全体の受入・独立検証成功とは扱わない。

## 確認範囲

- batch の private / link / public 同値指定で `unchanged` を返し、shareVersion・tokenHash / envelope・linkGeneration・grantEpoch・既存 grant・公開 identity の accessEpoch・ノートを変更しない。
- 単件 `changeSharing` の同値再適用では従来どおり shareVersion が進み、private / public の grantEpoch が進む。
- 保存済み空本文は private へ変更でき、private 同値も許される。link / public は拒否する。
- password → public は明示同意が必要。`getSharing` から取得した旧版の同意はパスワード変更後に拒否し、最新確認なら解除して公開する。
- 共有コアの更新後に呼出側が故意に throw したとき、初回公開の identity / token 発行と、公開解除の accessEpoch / grantEpoch 更新をそれぞれ rollback する。
- 保存ノート版の OCC、actor の current verified 状態、現在の編集権限、editor → viewer → editor の membership revision を再確認する。

## 実行記録

| 時刻 | コマンド | 区分 | 結果 |
| --- | --- | --- | --- |
| 2026-09-26T07:33:16+00:00 時点 | `pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/batchSharingCore.integration.test.ts` | 静的整形 | 成功、1 ファイル整形 |
| 2026-09-26T16:34:50+09:00 開始 | 下記単独 Vitest | 合成 fixture / 実 libSQL DB | 11 成功、1 失敗。故意に throw した汎用 Error が既存 UoW のエラー翻訳を通るため、テストの期待メッセージと不一致 |
| 2026-09-26T16:35:33+09:00 開始 | 下記単独 Vitest | 合成 fixture / 実 libSQL DB | 修正後 12 成功、0 失敗。2.29 秒、exit 0 |

実 DB テストコマンド:

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/batchSharingCore.integration.test.ts
```

初回の失敗は製品 fault ではなく、テストが UoW の既存エラー変換を考慮していなかったもの。故意の throw を `ConflictError("FIXTURE_ROLLBACK", ...)` に変更し、共有エラー契約が伝播したことと全状態 rollback の両方を確認した。修正後に限定 Biome の `--write` も成功した。

主担当から全量 Node の実行が 0 であることを確認して実行した。両実行の session は終端回収済み。最終成功を主担当へ通知し、Node 実行枠と core / settings の凍結を返却した。対象識別は上記開始時刻の専有新規テストとその時点で凍結された共有コアによる。委譲制約に従い git / hash 操作はしていない。

## fixture と未検証

既存 `createTestContainer` の自己所有 tmp libSQL DB を毎ケース作成し、既存 migrations と実 adapter / UoW / usecase を使う。共有鍵は各ケースの新規 tmp ディレクトリでのみ生成し、終了時に passwordWork を停止、DB を close して DB / WAL / SHM を削除、新規 tmp ディレクトリを削除する。状態比較は boolean に落とし、失敗時にも秘密値を assertion diff に出さない。

合成 fixture に対する実 DB 検証であり、既存データ・fresh runtime・ブラウザ・実ユーザー環境・外部サービスにはアクセスしない。batch 受理 / worker / UI と全体 typecheck は担当外で未検証。git 操作・build・全量 Node は実行しない。全体管理ファイルと既存テストは編集しない。

各ケースの `afterEach` cleanup を含めて成功し、自己作成の fixture DB / tmp 鍵ディレクトリは回収済み。コード・文書を含む担当ファイルの更新を終了し、専有 2 ファイルの所有を主担当へ返却する。
