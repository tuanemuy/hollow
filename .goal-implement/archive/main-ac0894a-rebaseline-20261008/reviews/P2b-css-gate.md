# P2b CSS 追加 gate 独立レビュー

## 結論

固定コードのレビューと Node 24 による固定 12 件の独立再実行で、同一要素への宣言集合という方式と、既知 split / important / escaped position / edge calc 対策の対応を確認した。別要素や通常 absolute/grid/flex/color variable を stylesheet 全体で無差別に合成・除去する実装ではない。小さい親を満たす inset-zero caption 等の正常損失は実装報告どおり存在し、安全合格とは区別する。

CG1: `inset:0px` 等の既知ゼロ配置の等価表現が正規化されず、既知パターンの文字列表記差による漏れを独立追加試験で再現した。Manager は P2b-C 本体採用前の必須小修正として受領した。完全 cascade / pixel 判定への拡張は不要。この結果を P2b-C 本体合格とは扱わない。

## 対象と条件

- Verifier `/root/verifier`。開始 2026-09-06 06:49:19 JST（clock）。
- [実装報告](../phases/P2b-css-gate.md) 全文、[design](../design.md) の P2b 境界、[旧独立レビュー](P2b-reference-spike.md)、固定 `gate.mjs` / `gate.test.mjs` を読了した。
- 対象は `/tmp/hollow-css-gate.HVEjeV` の 2 ファイル。旧 spike は readonly import。元 spike・本体コード・依存・DB・storage・production・browser・設定へ書込み/操作していない。本体 hash は採取しない。
- 追加試験は `/tmp/hollow-css-verify.UYANJa/equivalent-zero.test.mjs`。既知 literal パターンの表記差だけを 2 群で確認し、固定 12 ケースは編集しない。

| ファイル | 開始 SHA-256 |
| --- | --- |
| 新 gate.mjs | `d98ebe0adaec60f6f7361249cc37ff0a74895b5cbc913b8f02f323b998995a82` |
| 新 gate.test.mjs | `dba1664a00ba0deda351ee197462528c9d76c14f76527425aa2e2343c7bb6ec4` |
| 旧 css.mjs | `2041055bb55c1a8d0dca6b0db5d38b907b76105a42a651d139a76738a7fdca96` |
| 旧 package-lock.json | `396c5b31f6b8bf660a0908e94334d221ccb8617c598911a175b3b39ccd87312c` |

開始値はすべて指定値と一致。installed metadata は css-tree 3.2.1 / MIT、mdn-data 2.27.1 / CC0-1.0、source-map-js 1.2.1 / BSD-3-Clause。旧 lock と整合する。registry 再取得・installed 全ファイル hash 比較は行っていない。

## 固定試験の意味

| 固定ケース | 評価する内容 |
| --- | --- |
| 1 / 5 / 6 / 8 / 9 | 既知同一要素 split、escape、先行 important、動的配置、未対応 selector/Raw の境界。8 は無関係な色変数保持も確認する |
| 2 / 3 | 別要素・親子を合成しないこと、局所 absolute/grid/flex/有限 transform の保持 |
| 4 / 7 | 正常な caption、実 cascade で上書きされる宣言を失うことの assert。安全性・互換性の合格ではなく、既知の保守的損失を確認する |
| 10 | 条件別候補の合成と unknown at-rule の明示的損失。条件の排他性を証明していない |
| 11 / 12 | import 除去、stylesheet 最終 URL に基づく参照解決、Raw/不正 scheme 除去。公開 IP・取得安全性の合格ではない |

候補を最後の一宣言に狭めないので、先行 `!important` を後続通常宣言で隠せない。identifier decode は selector と value の Identifier に適用される。dynamic 判定は literal position の成立を前提にしない。物理四辺も placement 集合へ入り、var/calc/env または lexer 未解決を除去対象にできる。

共通 rule の宣言自体を削除するため、一要素で除去判定された配置が同じ rule の別の正常要素にも影響する。この損失は報告に明記されている。selector ごとの rule 複製・完全 cascade を今回必須にしない。保持できる subset と UI notice を本体の契約にする。

## CG1: literal の数値表記差

`value()` は Identifier を decode するが、Number / Dimension の数値を正規化しない。css-tree の該当 node 実装も token の元数値文字列を generate へ渡す。`edges` は inset の単位なし文字列 `0`、`fullSize` は `100vw` / `100vh` 等の文字列へ正規表現で一致させている。

確認対象は `.x{position:fixed}.fill{inset:0px}` を同じ `.x.fill` 要素へ適用するケースと、`width:100.0vw;height:100.0vh` のケース。期待は既存の `inset:0` / `100vw` と同じ既知パターン判定。これは全視覚意味解析ではなく、既に扱っている literal の AST 数値比較の不足である。

独立追加試験は次の出力を確認した。実 browser の描画試験ではなく、固定 gate の返す CSS と notice の実行結果である。

| 入力の主要配置 | 実際の結果 |
| --- | --- |
| `.x{position:fixed}.fill{inset:0}` | `.x{}.fill{}`、overlay notice 2 件 |
| `.x{position:fixed}.fill{inset:0px}` | そのまま残存、notice 0 |
| `.x{position:fixed}.fill{inset:0px 0px}` | そのまま残存、notice 0 |
| `.x{position:fixed}.fill{inset:0.0}` | そのまま残存、notice 0 |
| `.x{position:fixed;top:0;left:0;width:100.0vw;height:100.0vh}` | そのまま残存、notice 0 |

追加 2 群は現状の残存を assert しており、runner 成功を安全合格へ数えない。修正範囲は既に扱う literal の AST Number / Dimension / Percentage の数値、単位、ゼロ shorthand の比較に絞れる。var/calc の評価や全単位換算・全 layout 解析は追加要求にしない。

## 本体接続前の最小条件

1. サニタイズ後の実 HTML から class/id/type/親子関係を構成し、style 属性と stylesheet を同じ要素集合へ投入する。DOM や class/style の保存変更時にも再計算する。静的 fixture の object を production DOM 対応の完成証拠にしない。
2. root Raw、nesting、許可 at-rule 内の未対応構文は「そのまま返す」と「理由付き除去/拒否」を明示する。小さい negative fixture を置き、Declaration.value 内の Raw 処理だけで stylesheet 全体の fail-closed を主張しない。
3. 入力・AST・DOM 要素数と探索量の上限、超過時の安全な結果を決める。spike の 64 KiB / 128 targets / 10,000 nodes を原要求の新上限と扱わない。
4. 除去理由/source と参照 URL を恒久台帳/UIへ接続する。URL 解決は取得許可ではなく、SSRF と既知 private の描画拒否を別の本体 adapter で確認する。sandbox containment をこの heuristic で置き換えない。

Manager 判断案: 要素ごとの候補集合は採用可能な方式。CG1 と上記接続境界を本体で閉じ、報告された正常損失を許容するか明示して採用する。小さい親の `absolute;inset:0` を「viewport 全面と証明できた」と説明しない。

## 実行・引継ぎ

Node 22.22.3 の単発 version/test は version 出力前の無応答で中断し、session 72408 を exit 130 で回収した。Node 24.19.0 の既知 binary で次を実行し、session 91558 は exit 0、固定 12 + 追加 2 群すべて runner 成功、0 fail/skip、1168.320792 ms を確認した。固定 12 のうち損失の assert と、追加 2 の不足再現は、上記のとおり安全合格へ加算しない。

```sh
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test /tmp/hollow-css-gate.HVEjeV/gate.test.mjs /tmp/hollow-css-verify.UYANJa/equivalent-zero.test.mjs
```

Node 22 の独立実行成功とは扱わない。依存 install・設定変更・全 process 情報取得・listener/browser は使っていない。

終了照合: 2026-09-06 06:54:16 JST。固定 gate/test と旧 css/lock の 4 hash は開始値に完全一致。追加 test の SHA-256 は `bb7fc172cfff22a85002bf1d1d3d34c1c60cce9445c6596783e4b3b55f25ebf2`。自身の未完 exec はなく、全操作を停止する。本体の main hash / DB / production は調べていない。

markdown-style は報告の判定区分と空行に使用した。spec/spec-implement、goal API は使用していない。本体の環境所有は Implementer のままである。
