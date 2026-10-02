# P5b-1 設定・暗号保護・実行枠の限定テスト

## 結果

2026-09-28 01:07:43 JST に専有 unit 27 件が成功した。実装側の補助根拠であり、独立受入ではない。製品コードの変更はない。

所有対象は次の 2 ファイル。

- `packages/core/src/adapters/node/openrouter/config.test.ts`
- `.goal-implement/phases/P5b-1-config-tests.md`

## 検査範囲

設定・暗号保護の 24 件は、自己生成した 0700 ディレクトリと 0600 合成鍵だけを使用する。

- 設定の 16 KiB 境界、未構成・相対パス・不存在、不正 JSON・UTF-8・余分フィールド・空 keyFile。
- 設定・鍵・親ディレクトリの権限、各 symlink、鍵の 31/32/33 byte 境界。
- verifier・candidate・credential の往復と purpose 分離。account、attempt、browser hash/epoch、credential epoch の AAD 不一致拒否。
- nonce・本文・tag の改変、別鍵、不正 envelope、未構成、平文の長さ・制御文字境界。
- assertion は boolean または安全な code を比較し、鍵・平文・暗号文・hash の値を出力しない。

実行枠の 3 件は、自己 deferred Promise と fake timer を使用する。

- 4 枠使用中の 5 件目を待ち行列へ入れず拒否し、実 settlement 後に枠を再利用する。
- 10 秒で abort しても work が未 settlement なら 4 枠を保持する。work 完了後に安全な失敗へ収束し、枠を解放する。
- stop は abort 後も work の実 settlement を待つ。試験上 60 秒進めても未完了を終了扱いせず、全 work 完了後だけ解決する。stop 後の新規受付は拒否する。

60 秒は試験の観測区間であり、製品の新しい timeout・上限ではない。

## 実行

主担当から単独実行枠を受け、次を直列実行した。

```sh
pnpm exec biome check --write packages/core/src/adapters/node/openrouter/config.test.ts
pnpm exec vitest run packages/core/src/adapters/node/openrouter/config.test.ts --fileParallelism=false
```

Biome は 1 ファイルを整形して exit 0。Vitest は 1 ファイル・27/27 件成功、288 ms、exit 0。失敗した実行はない。全体型検査・全量テストは主担当の範囲であり、この補助では実施していない。

## 実部分と限界

ファイル権限・非 symlink 読取・サイズ制限・AES-GCM は実 adapter を使用した。provider は構築だけで HTTP を呼ばない。実行枠は実 execution adapter と制御した Promise を使用したが、native socket の終了・実 OS 時間・外部 OpenRouter の成功を証明しない。それらを timeout や abort の発生だけで終了済みと扱わない。

DB、runtime、fresh、旧 proof、既存秘密、外部 HTTP、共有製品、他のテストは操作していない。

## 回収・返却

各自己 deferred は finally で解放・await し、execution.stop を await した。fake timer は復元済み。設定試験の自己ディレクトリと合成鍵は afterEach で削除済み。未回収 exec、自己 work、自己一時資源は 0。単独 Node 枠は主担当へ返却済み。

専有テストと本報告を全文確認し、2 パスの所有を主担当へ返却する。以後、文書を含む全操作を停止する。
