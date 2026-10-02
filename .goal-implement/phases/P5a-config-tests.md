# P5a 認証設定・PKCE保護の限定テスト

## 結果

新規`packages/core/src/adapters/node/auth/config.test.ts`の23対が成功した。P5a-C/Gの設定境界・秘密保管に関するImplementer補助であり、独立受入ではない。製品・既存テスト・共有fixture・管理正本の変更はない。

- 実行開始: `2026-09-27T22:42:51+09:00`
- 単独unit: 23/23、1file、335ms、exit0
- 限定Biome: 1file成功、Node実行前に整形。実行後のソース変更なし
- 自己一時領域と合成鍵を回収済み。未回収exec0
- 製品不具合の検出・追加設計判断なし。全体型と統合は主担当へ渡す

## 検査範囲

正本は[採用設計](../design.md)と[plan](../plan.md)のP5a-C/G。安定APIの`readNodeGoogleAuthentication`と`NodeAuthenticationSecretProtector.load/protect/reveal`を直接検査する。

| 境界 | 対数 | 結果 |
| --- | --- | --- |
| config 16KiBちょうど／1byte超 | 2 | 前者を構成、後者を未構成として拒否 |
| config未設定・欠落・相対path | 1 | 例外や秘密を公開せず未構成 |
| unknown field・空client/secret・不正JSON/UTF8 | 5 | 未構成 |
| config/keyの0644、親0755 | 3 | 未構成。key/親はprotector単体でも不可 |
| config/key/直親symlink | 3 | 未構成。key/親はprotector単体でも不可 |
| key 31B/33B | 2 | 32B以外を拒否 |
| key未設定・欠落・相対path | 1 | available=false、protect/revealは固定安全code |
| AES-GCM往復・nonce独立 | 1 | 同じ入力を2回保護し両方復号一致、envelopeは異なり平文を含まない |
| attempt/mode/browser hash/browser epoch AAD | 4 | 変更時は拒否し、元bindingでは復号一致 |
| nonce/body/tag改変・別key・不正envelope | 1 | すべて`AUTH_KEY_UNAVAILABLE` |

assertionはbooleanまたは安全codeだけを比較する。key、verifier、envelope、client secret、browser binding値の実体やhashを結果・失敗diffへ渡さない。fixtureの値は合成値のみで、実設定・実鍵・環境変数を読み取らない。

## 実行

```bash
pnpm exec biome check --write packages/core/src/adapters/node/auth/config.test.ts
pnpm exec vitest run packages/core/src/adapters/node/auth/config.test.ts --fileParallelism=false
```

主担当から専有実行枠を受け、直列に実行した。両commandはexit0で即時回収した。初回23対が成功し、製品変更・期待変更・再実行はない。

## 回収と限界

各対が`mkdtemp`で作る自己領域を0700とし、合成32B鍵とconfigを0600で作る。権限・symlinkの変更対象はこの領域内だけである。`afterEach`は構成済みexecutionの`stop()`をすべて待ち、自己領域だけを削除する。自己鍵・config・symlinkを含む一時fixtureは回収済みで、再生成できる。DB、socket、Worker、外部通信は作成しない。

実OSのfile permission/symlinkと実Node AES-256-GCMを使用した。別uid、読み取り中の差替え競合、ancestor全階層、全OS/ACL、鍵rotation、実Google、実runtime設定、全体型/buildは未検証である。23小対からこれらを保証しない。

ソースと報告を全文確認した。専有testと本報告の所有を主担当へ返却し、文書を含む全書込み・全操作を停止する。未回収execは0である。
