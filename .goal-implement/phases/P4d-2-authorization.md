# P4d-2-C/F 本人 PDF 認可の隔離 DB 試験

## 範囲

実装補助であり、独立 Verifier の受入ではない。製品変更は `packages/core/src/adapters/libsql/__tests__/pdfAuthorization.integration.test.ts` のみ。goal-implement と manager-loop を全文確認し、管理正本・共有 port・製品実装は変更していない。

既存 `pdfFlow.integration.test.ts`、`pdf.integration.test.ts`、workspace / invitation / move の試験と現 usecase・repository を必要範囲で参照した。`createTestContainer()` が作る新しい自己 tmp DB のみを使用し、各対の `afterEach` で提供 helper の `close()` を実行する。追加 storage directory は作らない。

アカウントは実 signUp → verifyEmail → signIn、参加は実 invitation 発行・継続・join、変更は実 membership / move / sharing usecase を使用する。招待・共有 token 保護のみ、binding を照合するメモリ fixture に置換する。メールは自己 fixture 配列だけに保持し外送しない。PDF writer / supervisor / workspace / sources / execution / transfers と storage の物理操作は、呼ばれれば例外になる。`wake` は noop。

## 実対

| 対 | 確認内容 |
| --- | --- |
| owner / editor / viewer 各受付（3） | private note は現在 member が受理される。outsider の新要求・他人 command lookup・他人 cancel は拒否。本人 cancel は terminal。 |
| 全降格 / 除外（6） | owner→editor、owner→viewer、editor→viewer、各 role→null。実 UoW 内の membership 書込直前に対象 request が cancelled、別 actor の兄弟が queued、旧 role がまだ存在することを確認。commit 後も取消と version 増加を確認。 |
| 各 role の脱退・再参加（3） | 旧 command replay は取消のまま。新要求だけを受付け、別 actor の兄弟は維持。再招待は既存 60 秒規則を clock 進行で満たす。 |
| rollback（1） | 同 Tx の membership write 直前に取消を確認した後、試験だけの書込失敗を注入。アダプターの DATABASE_ERROR と、DB の旧 role / queued / version 復元を確認。 |
| 先移出（1） | 別 WS へ同内容 move 済みかつ移出先で本人 viewer の note は旧 WS 除外で取消されず、source identity と計算の current demand claim が維持される。 |
| 公開と旧未終端（1） | current-public read と新 command は可でも、降格 / 除外で取り消された旧 command は lookup / replay / prepare で復活しない。別 actor 兄弟維持。公開解除後は public read / 新要求を拒否。 |
| link-only outsider（1） | 内部 PDF の authority として限定リンク visibility を流用せず、計算受付も行わない。匿名 PDF は実装しない。 |
| 完了後の新取得（1） | 現在本人 session と独立 current-public による新 ticket は可。他人の request は取得不可。公開解除後は新 ticket 不可。完了履歴自体は保持。 |
| 完了後の本文変更（1） | 旧 member が current-public を読めても、現在本文と異なる PDF の新取得は PDF_CONTENT_CHANGED。 |

完了対の `publishMetadataOnly` は repository の begin / publish / succeed / closed で作る明記された ready metadata fixture。実 PDF bytes・物理 storage・renderer 成功を意味しない。

公開の区分は Manager / main が design「単件 PDF の製品接続」と再照合したもの。旧未終端取消の非復活と、既完了 artifact の新取得を現在 scope または独立 current-public で認可することは別であり、過去の membership 喪失を永久 blacklist にしない。

## 実行記録

許可された限定 command:

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/pdfAuthorization.integration.test.ts
```

- 2026-09-20 08:41:12 JST 開始: 16 対中 12 成功、4 失敗。3 対は fixture が既存再招待 60 秒 rate を満たさず、1 対は注入 Error が repository 境界で DATABASE_ERROR へ変換されることを期待に反映していなかった。試験だけを修正。
- 2026-09-20 08:43:05 JST 開始: 18 対中 17 成功、1 失敗。完了後の新 ticket で `pdf_delivery_lifetime` CHECK に拒否された。実入力の createdAt→expiresAt 差は 120000 ms、先の読取・初回実行時は 600000 ms。main の並行寿命変更中の接続差として根拠を返却し、こちらは usecase / schema / migration を変更していない。
- `pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/pdfAuthorization.integration.test.ts`: exit 0、専有 1 file の整形のみ。
- `pnpm exec biome check packages/core/src/adapters/libsql/__tests__/pdfAuthorization.integration.test.ts`: exit 0、変更なし。

- main から、Manager 採用の本人 delivery 120 秒・artifact 期限 clamp に合わせて既存実装 / schema / migration の整合完了を受領。初回 10 分での成功と、変更途中の CHECK 拒否を現行結果へ混ぜない。
- 2026-09-20 08:44:40 JST 開始: **18 対すべて成功、exit 0**。Duration 6.94s、tests 6.12s。主担当固定後の新しい自己 tmp DB で実行した。追加の製品不具合は検出していない。

## 未検証

実 PDF、Chrome、worker 実生成、媒体 / 実 file 配信 / actual close、runtime、HTTP、ブラウザー、匿名 PDF、全 suite、全体型検査、独立受入は未実行。本試験の成功を P4d-2 全体の完了としない。全実行の自己 DB は helper 正規 close 済み。

対象 source と本報告の全文確認後、専有 test / 報告の書込を含む全操作を停止して main / Manager へ返却する。
