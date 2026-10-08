# P5b-1 OpenRouter保存・回収の隔離テスト

## 結果

新規`packages/core/src/adapters/libsql/__tests__/openRouterSchema.integration.test.ts`の限定18対が成功した。P5b-1-A/B/C/Gと、実編集されたP5a-C/G/Hのbrowser参照回収を支えるImplementer補助であり、独立受入ではない。

- 実行開始: `2026-09-28T00:55:59+09:00`
- 単独Node: 18/18、1file、3.11秒、session6793、exit0終端回収
- 限定Biome: 1file成功。テスト実行前に整形し、成功後のソース変更なし
- 各対FK0、自己DB/WAL/SHM回収済み、未回収exec0
- 製品・他test・共有fixture・管理正本の編集なし。全体型とintegration/UIは主担当へ渡す

## 参照契約

正本は[plan P5b-1](../plan.md)と[採用設計](../design.md)。実装参照は`domain/integration/openRouter{,Repository}.ts`、`libsql/{openRouterSchema,hollowUnitOfWork}.ts`、`repositories/{openRouterRepository,authBrowserRepository}.ts`、`migrations/0033_openrouter_connection.sql`である。

自己DBは既存`createTestContainer`で最新migrationを適用する。verified account、browser、sessionは型付きdomain/repositoryで作り、connection/attempt/modelsは専用3repoを優先して操作する。型が表せない違法形・immutable fieldの変更だけを自己DBのSQL負対にする。秘密値やhashはassert差分へ出さず、boolean・状態・件数で比較する。

## 18対の期待と実結果

| 対 | 対象 | 実結果 |
| --- | --- | --- |
| 1 | connection ensure/CAS/epoch/旧auth | 初期epoch0/version1/unlinkedは1行。linked→needs_relink→unlinkedを正規版で保存、stale CASはfalse、everLinkedAtとaccount/session全fieldを保持 |
| 2 | connectionの世代fence | 同epochでcredential差替え、epoch逆行、初回連携時刻の改変を拒否 |
| 3 | connection形と版 | NULL/空credential、linked/ever時刻NULL、版飛越を拒否 |
| 4 | attempt正規状態遷移 | pending→exchanging→checking→completed、前段秘密scrub、stale CAS拒否、terminal復活拒否 |
| 5 | metadata再確認 | checking→checkingは同candidate＋version進行だけ成功。candidate差替え拒否 |
| 6 | immutable値 | correlation/session/authVersion/browser epoch/expected connection/returnTo/作成・期限の改変を拒否 |
| 7 | insert/一意/固定期限 | 非pending挿入、correlation重複、10分期限＋1msを拒否 |
| 8 | 空秘密の違法形 | NULL/空verifier・candidateを拒否し、保存後に読めない状態を防ぐ |
| 9 | terminal形 | completedのresultEpoch/firstLink NULL、failedの残存candidate/理由NULLを拒否 |
| 10 | account fence | keep対象以外のactiveだけfailed/scrubへ。反復fenceでterminal版を進めず、復活も拒否 |
| 11 | model settings | defaultsは初回だけ、OCC旧版拒否、保存済choice保持、defaultsVersion改変と空model ID拒否 |
| 12 | attempt有限回収 | 期限−1msは0、期限ちょうどに最大100scrub＋残1。作成24h−1msは0、24hちょうどに最大100delete＋残1 |
| 13〜17 | browser参照保持 | pending/exchanging/checking/completed/failedの全5状態でbrowserをpin。receipt削除後だけbrowser回収 |
| 18 | browser共有budget/legacy | 期限切れbound session削除とbrowser削除の合計100を維持。legacy NULL-binding sessionとaccountを保持 |

## 静的指摘と修正の区分

初期DDLはpending/checking envelopeを`IS NOT NULL`だけで受け入れ、repository.findは空文字を拒否するため、空値を保存すると読めない状態を作れた。この静的差を主担当へ報告し、主担当がschema/0033/snapshotへ`length > 0`を追加した。補助は製品を編集していない。

空値負対は主修正後の初回実行で成功した。修正前の実DB失敗を観測したという記録ではない。18対すべてが初回成功であり、期待を弱めた再実行はない。

## 実行

```bash
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/openRouterSchema.integration.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/openRouterSchema.integration.test.ts --fileParallelism=false
```

主担当の専有実行枠で直列実行し、session6793をexit0まで回収した。主へNode枠を返却済み。101attemptのfixtureは有限prune用の正規repository metadataであり、利用者受付rateや非terminal3件制限を通した要求ではない。100browserも回収budget専用の小fixtureである。

## 回収・限界・返却

各対の`afterEach`はFK検査を行い、`finally`で自己`base.close()`を実行する。helperは当該connectionをcloseし、正確な自己DB/WAL/SHMだけを削除する。生存worker/socket/外部通信/実資格情報はない。

schema/repoの代表正負とcurrent保存値保持を検査した。既存実DB移行cloneの全列・FTS・objects保全、applicationの本人認可・OAuth受付制限・複数process競合、暗号化の実体、外部API、runtime/UIは未検証である。空DBへの最新migration適用と自己account/session比較を既存環境の移行保全と混同しない。`openRouterWaiting`のE readは主担当の範囲である。

ソースと本報告を全文確認し、専有新testと報告の所有を主担当へ返却する。文書を含む全書込み・全操作を停止する。未回収exec0、自己DB資源0である。
