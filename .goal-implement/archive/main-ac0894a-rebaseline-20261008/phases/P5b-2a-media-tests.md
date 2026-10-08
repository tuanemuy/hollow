# P5b-2a 媒体対応の限定結合テスト

## 結果と適用範囲

2026-09-28 06:02:44 JST 開始の限定 Node Vitest は 8/8 成功、3.13 秒、exit 0。専有ファイルの Biome も初回成功。製品不具合は検出していない。

主担当が通知した build 58127 以後の製品変更 0 の source を対象に、主担当の Node / formatter / build 停止中に実行した。Vitest による source の結合検査であり、build artifact 自体や実 UI を動かした結果ではない。P5b-2a-B/F/H の実装補助根拠で、独立 Verifier の受入とは区別する。

所有・変更した path は次の 2 件のみ。実際の test 配置は主担当と確認した。

- `packages/core/src/adapters/libsql/__tests__/llmSourceMedia.integration.test.ts`
- `.goal-implement/phases/P5b-2a-media-tests.md`

製品、既存テスト、共有 fixture、管理正本、旧 proof は変更していない。

## 根拠と fixture

原文は `spec/scenario/import.md` IM-05 の取得済み媒体と相対参照、IM-06 の再生成・失敗時旧本文保持。共有契約は `design.md` の P5b-2 本文生成、検証済み媒体 map、未知・欠落・過剰拒否、現在条件再照合。コードは `application/llm/current.ts` / `worker.ts`、`application/note/commitNote.ts`、既存 `llmFlow.integration.test.ts`、reference / asset repository の公開 API を参照した。

実体は自己隔離 libSQL DB、CoordinatedStorage / FileObjectStorage、SourceReader、実 `NodeLlmSourcePreparer` と `sourceWorker.mjs`、ResultProcessor、既 sanitizer、commit / revision / pin。account・session・連携・原本・取得済み reference / asset の合成 metadata は正規 repository で準備した。workspace 作成と検査中の降格は現在 usecase を通す。

原本は小さい HTML / Markdown。どちらも raw `../images/figure.png` を 2 回使い、既取得 reference row の `url` と完全一致させる。これは取得済み row からの再生成接続を検査する fixture であり、IM-05 の bundle 解決・外部 fetch・媒体 validator の取得工程を再実行したものではない。asset の実 storage bytes は自己合成 8 bytes で、画像 decode や実画像の有効性を証明しない。

モデル profile / generator / OpenRouter control / runtime ownership は typed fake。generator は原則として受け取った prepared HTML を返し、異常対だけ明示的に改変する。実外部通信・LLM 課金は 0。

## 8 対

| 対 | 内容 | 結果 |
| --- | --- | --- |
| 1 | HTML 原本の raw 相対 src 2 回を同 placeholder として生成入力へ渡し、同 note-owned URL 2 回へ復元して commit | 成功 |
| 2 | Markdown 原本で同じ接続。両形式とも原本 URL / placeholder を最終本文へ残さず、current と baseline / generated revision の pin を保持 | 成功 |
| 3 | 未知 marker を生成結果へ追加すると `LLM_RESPONSE_INVALID`、旧本文 / version / current pin を保持 | 成功 |
| 4 | 期待 marker を 1 回欠落させると同じ安全な失敗。新 revision / pin を作らない | 成功 |
| 5 | 期待 marker を 1 回過剰にすると同じ安全な失敗。無言 dedup しない | 成功 |
| 6 | acquired row が他 note の ready asset を指しても、当該 note の現在関係がなければ map を作らず他 note asset を採用しない。兄弟 note の関係は保持 | 成功 |
| 7 | generator 待機中に自己 repository fixture で現在 media 関係を解除すると、返却後の再照合で `LLM_SOURCE_CHANGED`。旧本文・baseline pin を保持 | 成功 |
| 8 | Markdown の generator 待機中、正規 membership usecase で editor → viewer に変更。遅い応答を返しても cancelled、本文と current pin は旧状態 | 成功 |

対 1・2 はさらに通常 `saveNote` で媒体を現本文から除去し、current pin だけが消えて revision 1 / 2 の pin、ready asset、`unreferencedAt:null` が残ることを確認した。有限 20 版の全 pruning 行列や 7 日後の回収をこの対で再実証したとは扱わない。

対 6・7 の repository 操作は不一致・競合を作る自己 fault fixture。利用者が変換中にその操作を実行できることの証拠ではない。対 8 は編集権限喪失であり、閲覧権限喪失・除名の全行列ではない。

## 実行と回収

Manager と主担当が許可した専有枠で次を直列実行した。

```sh
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/llmSourceMedia.integration.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/llmSourceMedia.integration.test.ts --fileParallelism=false
```

初回で Biome / 8 対とも成功。session 90753 は exit 0 まで回収済み。各対の終了時に generator gate を解放して実 execution.stop を待ち、FK 違反 0 / active object owner 0 を確認後、自己 DB を close し、その対の自己 storage directory を削除した。source Worker は実 adapter の終了待機を通り、execution の実 work 終了後に DB を閉じている。

未回収の自己 Worker / storage handle / deferred / DB / exec は 0。fresh、実 runtime、browser、既存正常保存物、秘密、鍵、外部 HTTP は操作していない。全体型・build・実 UI は主担当へ残す。

専有 source と本報告を全文確認し、2 path を主担当へ返却する。文書を含む全操作を停止する。
