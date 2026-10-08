# P5a 認証方法・追加proofの隔離テスト

## 結果

限定14対が成功した。対象はP5a-B/C/D/Eのusecaseと実libSQLトランザクション境界で、独立受入ではなくImplementer補助の根拠である。製品・既存テスト・共有fixture・管理正本の変更はない。

- 対象: `packages/core/src/adapters/libsql/__tests__/authenticationMethods.integration.test.ts`
- Node実行: `2026-09-27T22:30:42+09:00`開始、14/14、1file、2.68秒、exit0
- 限定Biome: 同日、1file成功・整形済み。Node実行後のソース変更なし
- 未回収exec0。自己DB・WAL・SHM回収済み、各対の`foreign_key_check`は0件
- Manager判断事項・検出した製品不具合なし。全体型・統合・実HTTP/UIは主担当へ渡す

## 対象と根拠

正本は[plan P5a](../plan.md#p5a-google認証ログイン方法管理)と[採用設計](../design.md)。参照した製品は`application/account/{methods,proof,resetPassword,google,context,session}.ts`。局所fixtureは`googleAuthentication.integration.test.ts`の公開usecase・`createTestContainer`・`createHollowContainer`構成を再利用する。

| 対 | 固定ID | 期待と実結果 |
| --- | --- | --- |
| 1 | B/C/D | password proofは別browser・誤passwordを拒否。正しい元browserでlinkとsessionを確定し、再利用を拒否。sessionは1件 |
| 2 | C/D | 親attemptの10分ちょうどでpassword proofを拒否、Identity未追加 |
| 3 | C/D | google-link mailは別browserで未消費。元browserだけが消費・link・sessionを確定し、同token再利用を拒否 |
| 4 | C/D | 60秒後のmail再送でchallengeの固定期限を延長しない。期限ちょうどで拒否、Identity未追加 |
| 5 | C/E | Google-onlyへ新same-sub reauth proofでpassword追加。別browserとproof再利用を拒否し、既存session全field・Google Identityを保持 |
| 6 | C/E | 別sub reauthを拒否し、password未追加 |
| 7 | C/E | reauth proofの5分ちょうどでpassword追加を拒否 |
| 8 | A/E | 同版のGoogle解除/password解除を並行送信。成功1・版競合1、認証方法は1つ残り、最後の解除を拒否。session全fieldを保持 |
| 9 | E | password変更は現password必須。成功時はcurrent session全field・固定期限を保持し、他sessionを削除。旧版変更を拒否 |
| 10 | E | resetは全旧sessionを削除しGoogle Identityを保持。同token再利用を拒否 |
| 11 | E | resetの1時間ちょうどで拒否し、旧password/sessionを保持 |
| 12 | D/E | google-linkをresetへ、resetをgoogle-linkへ流用しても拒否し、両challengeとも未消費 |
| 13 | E | Google-onlyのreset申請は案内メールのみ。reset challenge・password変更なし |
| 14 | E | 他端末signoutはcurrent session全fieldと認証方法を保持し、他sessionだけを削除 |

## 実行

```bash
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/authenticationMethods.integration.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/authenticationMethods.integration.test.ts --fileParallelism=false
```

Nodeはsession84748をexit0まで回収した。主担当へ実行枠を返却済み。初回の14対が成功し、失敗期待の弱化・製品修正・再実行はない。

## 実部分と代替部分

実部分は自己file-backed libSQL、最新migration、UoW/CAS/repositories、NodeAuthenticationExecution、browser epoch/session、challenge消費、current認可、FK検査である。方法二解除は同版の2usecaseを`Promise.allSettled`で並行実行する代表競合であり、全分散競合の証明ではない。

clock、password hash/verify、Google provider、PKCE protector、mail送信は注入した契約代替である。Google callbackは正規入口を使い、password accountの種はdomain constructor/repository、追加sessionは正規`issueSession`を使う。認証方法やchallengeの直接SQL改変はない。SQLは結果とFKの読取だけである。

実Google、実メール、HTTP GETの非消費、Origin/cookie/CSRF、ブラウザーUI、実hash強度、全体型・buildは未検証。usecaseにGET入口がないことをHTTP非消費の証明とはしない。元token・synthetic passwordを出力しない。

## 回収・返却

各対の`afterEach`で`execution.stop()`を待ち、FK検査後、`finally`で自己`base.close()`を実行する。helperは当該DB connectionをcloseし、正確な自己DB/WAL/SHMだけを削除する。外部通信・runtime・fresh・旧proof・秘密・既存keyへの操作はない。

テストソースと本報告を全文確認した。新1testと本報告の所有を主担当へ返却し、文書を含む全書込み・全操作を停止する。未回収execは0である。
