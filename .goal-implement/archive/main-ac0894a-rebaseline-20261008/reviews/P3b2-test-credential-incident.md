# P3b2 自己試験資格情報の出力事故

2026-09-10T23:28:55+09:00、P3b-2-V1独立検証の既知記録だけを対象とする非秘密metadata報告。password/token/key/構成式/原ソース全文を再掲しない。本報告のためのDB/browser接続、他account探索、認証値の追加読取り、資格情報変更は行っていない。

## 確定している対象

- synthetic email: `p3b2-v-owner-qt@example.test`
- このaccountで通常signinした専用browser: `p3b2-rv-owner`。検証終了時にclose済み。
- account IDは手元の既知記録から確定できない。今回DBへ取得しに行っていない。
- 試験対象WS: `01a08b89-c2c7-714a-badb-f14e3bb947ed`。既知の100文字名/現在iconを表示するために使用した。

## 同じ値の共有範囲

出力したsignin helperは対象email/sessionを引数に取る共通helperであり、認証値の構成はemail/sessionごとに分岐していない。したがって、当該1accountだけのために生成された値とは断定できない。

既知の関連自己accountは`p3b2-v-owner2-qt@example.test`。前回P3b-2検証で同じ自己fixture系列によりsignup・明示joinを行った相手ownerである。同一password値かどうかの追加照合はしていないため、確定した漏出対象と混ぜず、封じ込めを判断する際の関連候補として記録する。

他の自己accountへの共有範囲は不明。以前のフェーズへ値が共通かどうかを、記憶上のhelper再利用だけで確定していない。通常名の表示に引き継いだ`p3b2-icon`は保存済み認証状態を利用しており、今回そのpasswordを取得していない。`p3b2-v-cancel-qt@example.test`は既知記録では招待宛先として使ったものであり、この名前のaccountをsignupした証拠はない。

## 出力元の所在

| 区分 | 既知path |
| --- | --- |
| toolへ出力した独立copy | `.goal-implement/reviews/p3b-2-v1-independent.ZLdUG3/signin.cjs` |
| そのcopyの直接の元helper | `.goal-implement/reviews/p3b-2-independent.qGd0HC/signin.cjs` |
| 関連する前回signup fixture | `.goal-implement/reviews/p3b-2-independent.qGd0HC/setup.cjs` |

さらに前の元ファイルの正確なcopy元pathは、この報告では確定していない。上表の内容を再読して値を調べる操作は行っていない。既存tool出力を削除したとは主張しない。

## 引継ぎ

これは製品の表示不具合ではなく、Verifierによる認証コードのtool出力という運用上の逸脱である。P3b-2-V1の機能4条件の合格とは分離する。無効化・再発行・session失効などの環境操作はManagerと次の環境所有者の判断へ返す。本書だけを書き込み、文書を含む全操作を停止する。spec/spec-implement、goal API、補助は使用していない。
