# P2b CSS declaration-set gate

## 対象と状態

2026-09-06 06:24 JST 回収時点で 12 tests 成功 / 0 失敗。P2b-C の方式候補であり、本体実装・採用決定・ブラウザの全面遮蔽防止の合格ではない。新規一時ディレクトリ `/tmp/hollow-css-gate.HVEjeV` にだけコードと合成 fixture を用意した。独立検証中の本体、依存、production、DB、storage、browser と固定済み旧 spike は変更していない。

Node22/24 起動は数分間無出力になったが、既存 3 session の回収ですべて exit 0 を確認した。試験 runtime は Node24.19.0、アプリ runtime の変更はない。追加環境診断、browser、listener は使っていない。

## 最小候補

CSS AST の selector を、別々の静的要素へ対応付ける。class / id / type / universal の compound、子・子孫 combinator、selector list を試験対象にする。サニタイズ後の DOM を想定した明示的な要素 fixture を使い、CSS の文字列連結で同一要素を推定しない。class/id と property/value identifier の CSS escape をデコードする。

要素ごとに全対応 rule の配置宣言候補を集合化する。最後の宣言だけを採用せず、重要度・条件・上書きの異なる候補も残す。これにより `.x{position:absolute}.fill{inset:0}` を同一 `.x.fill` 要素で検出し、別々の `.x` / `.fill` 要素には合成しない。以前の `!important` を後の通常宣言で隠せない一方、実 cascade では無効になる宣言も検出対象になる。

次の限定規則で配置を除去し、理由と除去元宣言を notice に残す。

- absolute/fixed/sticky と inset 全辺 0、物理四辺 0、または幅・高さ 100 viewport/% の組合せを既知パターンとする。位置・辺・重なり・transform 系を除去し、背景色などは残す。
- placement property の var/calc/env、lexer で未解決の値、未対応の論理配置を検出した場合は、その要素に対応する配置・寸法宣言を制限する。`position:var(...)` は literal position の検査より先に対象にする。top/right/bottom/left も対象。
- 未対応 selector の配置宣言は対象要素を推測せず除去する。通常色・背景の宣言は残す。unknown at-rule は全体を除去して明示 notice とする。media/supports/layer の枝は条件を評価せず候補を合成する。
- 通常の色変数 `--ink:red;color:var(--ink)` は残す。通常の局所 absolute、grid/flex、小さい transform は残す。時間で配置を変える animation/transition と keyframes は制限する。

これは full cascade、container/query 評価、pseudo-element の幾何、painting、画面サイズ判定ではない。外側アプリを守る正本は既存 sandbox containment のままである。

## 12 件の固定 fixture と意図

| Fixture | 期待する結果 |
| --- | --- |
| 旧 gate と同一要素 split の対比 | 旧は残存、新は位置除去・背景保持 |
| 同じ CSS を別々の要素へ適用 | split 合成なし、局所 absolute/grid/flex/transform 保持 |
| 親 100vw/100vh と子の有限 caption | 親子の宣言を混ぜず、子の局所配置保持 |
| 小さい親内の正常 inset-zero caption | 保守的な除去を明示的に期待し、失う装飾を記録 |
| 子孫・ID・compound・escaped identifier | 同一要素の全面候補を検出 |
| 先行 important / 後行通常 position | 危険な先行候補を見落とさない |
| 通常の後行 position で実際には上書き | cascade 未解決による保守的な正常損失を期待 |
| 動的 position、物理四辺 calc と色変数 | 配置だけ制限、色変数保持 |
| 論理配置、Raw position、hover selector | 未解析の配置を理由付き制限 |
| media/supports の分散・unknown at-rule | 条件候補を保守的に合成、unknown を通知 |
| escaped/nested import、URL/image-set/font | import 除去、最終 stylesheet URL を基準に相対解決 |
| escaped URL payload、Raw escaped function、非 HTTP URL | payload 解決、Raw/不正 scheme は通知して除去 |

試験は author 作成の CSS/静的要素 fixture のみであり、第三者文書互換性や production DOM 対応の根拠ではない。

## 外部参照 AST の継承範囲

固定旧 spike の CSS 実装を比較用に readonly import する。新 gate は css-tree 3.2.1 を旧一時 package から readonly import し、依存追加・コピー先 package install を行わない。旧 spike の成功済み HTTP/TLS 試験を今回は再実行しない。listener も作成していない。

AST Url と image-set 直下 String を `new URL(value, finalStylesheetURL)` で解決する。escaped import 名は識別子をデコードして除去する。escaped `url` function が Raw になる場合は URL 正常解決と見なさず宣言を除去する。この試験で URL が public/安全と認定されるわけではなく、SSRF・DNS 固定・台帳・描画 URL 制限は後続 adapter の別契約。

一次資料: [css-tree 3.2.1 parsing](https://github.com/csstree/csstree/blob/v3.2.1/docs/parsing.md)、[identifier utilities](https://github.com/csstree/csstree/blob/v3.2.1/docs/utils.md)。MIT の既存 package を利用し、Node 宣言範囲は旧 spike の記録を継承する。今回の gate は Node24.19.0 で実行し、Node22 の gate 再実行はしていない。

## 正常損失と未解決

小さい親を満たす `absolute;inset:0`、有効な `calc` 寸法、論理プロパティ、hover/pseudo/attribute selector の局所配置、互いに排他的な query、cascade で無効な前方宣言、配置以外の animation/transition を失い得る。共通 rule の一宣言を除去するため、同じ rule に対応する別の正常要素にも影響する。notice は source declaration と理由を保持するが、恒久台帳/UI 接続は本体 C の対象。

現在の fixture は HTML parser に接続していない。style 属性の同じ集合への投入、DOM 変更後の再計算、budget の production 値、根レベル Raw / nesting / 特殊 at-rule 全体の fail-closed 境界は未検証。100% と viewport の違いや min/max/transform の組合せを完全な視覚モデルに展開していない。通常 CSS をすべて保ちながら全文面配置を除去できる保証は置かない。採用時はこの限定構文と正常損失が許容されるか Manager が判断する。

## コマンド・hash・handoff

作成: `/usr/bin/mktemp -d /tmp/hollow-css-gate.XXXXXX`、ファイル編集は apply_patch のみ。

試験コマンド: `/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test /tmp/hollow-css-gate.HVEjeV/gate.test.mjs`。session 28595 は exit 0、12 tests / 12 pass / 0 fail、duration 1146.494125 ms。待機中に最終 fixture を整えた後、返却された test 名に最後の「normal inset-zero caption」追加と親子 fixture 更新が含まれることを確認した。最終コードは hash 採取後変更していない。

native `/usr/bin/openssl dgst -sha256` は 06:23 JST 頃に即時成功。

| 対象 | SHA-256 |
| --- | --- |
| 新 gate.mjs | `d98ebe0adaec60f6f7361249cc37ff0a74895b5cbc913b8f02f323b998995a82` |
| 新 gate.test.mjs | `dba1664a00ba0deda351ee197462528c9d76c14f76527425aa2e2343c7bb6ec4` |
| 旧 css.mjs | `2041055bb55c1a8d0dca6b0db5d38b907b76105a42a651d139a76738a7fdca96` |
| 旧 package-lock.json | `396c5b31f6b8bf660a0908e94334d221ccb8617c598911a175b3b39ccd87312c` |

旧 2 hash は前回の固定値と一致。依存は css-tree 3.2.1、mdn-data 2.27.1、source-map-js 1.2.1。本体の基準は HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a` / 487 files / `b9f13b9aeb52986515fc55edae4e9f26040d2d1131673f206ddcd08e7dc570b8`。Node22.22.3 session 19913 と Node24.19.0 session 48762 の readonly fingerprint は 06:22:19 JST に双方この基準と一致し、tracked modified 21 / untracked porcelain entries 75、lock hash `02ee47aa5787fe11fb3b49d819a8283c1cdd7778803985e29d0a3d7cc209680e` も一致した。開始要求は起動遅延でこの時刻になった。fingerprint は `.goal-implement/` を除いた tracked/untracked 全実ファイルを含む。

本体・ブラウザの owner は Verifier のまま。独自 listener・browser はなし。既存 3 session は回収済み。遅延していた 2 fingerprint コマンドに後続した mktemp が空の `/tmp/hollow-css-gate.SlBCiF` と `/tmp/hollow-css-gate.bykMLO` を作ったが、成果は HVEjeV だけにある。追加の本体実装へ進まない。

終了照合は 2026-09-06 06:25:25 JST、Node24.19.0 による同 fingerprint コマンド exit 0。487 files / `b9f13b9aeb52986515fc55edae4e9f26040d2d1131673f206ddcd08e7dc570b8`、HEAD/status/lock すべて開始基準と一致した。同コマンドに続く native openssl で新 gate/test の上記 2 hash も再一致。自己所有の未完了 process はなし。コードと browser 操作を停止し、方式採用の判断を Manager へ返す。

## CG1 revision — 等価な数値表記

2026-09-06 07:08 JST。独立レビュー `reviews/P2b-css-gate.md` の CG1 だけを、新規 `/tmp/hollow-css-cg1.sbAWwy` の派生コピーで修正した。元 `/tmp/hollow-css-gate.HVEjeV` と独立再現 `/tmp/hollow-css-verify.UYANJa/equivalent-zero.test.mjs` は固定のまま。mkdir は mktemp、固定コピーは cp、派生編集は apply_patch。依存は既存 css-tree 3.2.1 の readonly import を継続し、install を行っていない。

比較用 AST clone の Number / Dimension / Percentage について、有限の数値 token を Number 値に基づく表記へ正規化し、Dimension の単位を identifier decode / lowercase する。数値 0 の Dimension / Percentage は比較上の単位なし 0 へ統一する。これにより zero shorthand の 1〜4 値と物理四辺、100.0 viewport/% を既存 literal と同じ検出規則へ渡す。出力側の AST は変更せず、正常な CSS の数値表記を勝手に書き換えない。非ゼロの異なる単位の換算、calc/var/env 評価、追加の layout/cascade 解析は行わない。元の value に対する lexer 検査も維持する。

### 実行結果

```sh
node --test /tmp/hollow-css-cg1.sbAWwy/gate.test.mjs /tmp/hollow-css-cg1.sbAWwy/equivalent-zero.test.mjs
```

Node22.22.3、session 8348、exit 0。16 tests / 16 pass / 0 fail / 0 skipped、373.304125 ms。開始直後は Node の無出力起動待ちが発生したが、追加 runtime 起動はせず既存 session を回収した。結果回収は 07:08 JST 頃。

- 固定 12 tests は byte 同一のコピーで成功。既知の正常損失を期待する tests も含むため、16 件すべてを安全性・互換性の合格とは表現しない。
- 独立 CG1 の 2 群は、以前の「position が残る」というバグ再現の期待値を「position が除去され、declaration-set-overlay notice がある」へ変更して成功した。`inset:0px`、`0px 0px`、`0.0` は `.x{}.fill{}` となる。`100.0vw/100.0vh` は position/top/left が除去され、幅・高さの元表記は保持される。
- 追加の同値ケースとして `0%`、符号付き/小数/指数 0 の mixed shorthand、`100.00%/1e2%`、大文字/escaped viewport 単位、物理四辺の 0 を確認した。
- 正常の `inset:0px 12.50px;width:120.0px;height:24.00px;transform:translateX(2.0px)` と `width:99.5vw;height:100.00vh`、relative/grid/色変数は配置・表記を保持し notice 0。これ以上の任意精度数値や全単位の意味評価を検証済みとはしない。

### 固定 hash と影響

| 対象 | SHA-256 |
| --- | --- |
| 派生 gate.mjs | `6ac32be53133777fc6c85dfd93067cf399a5998d818033e1cd47222879dbffeb` |
| 派生 gate.test.mjs（固定 12 と同一） | `dba1664a00ba0deda351ee197462528c9d76c14f76527425aa2e2343c7bb6ec4` |
| 派生 equivalent-zero.test.mjs | `a0f5f7b8ea393cb8b240af3b082005fb4b13eb04c5b0862a5b0c55789ef178c7` |
| 元 gate.mjs（不変） | `d98ebe0adaec60f6f7361249cc37ff0a74895b5cbc913b8f02f323b998995a82` |
| 独立再現 source（不変） | `bb7fc172cfff22a85002bf1d1d3d34c1c60cce9445c6596783e4b3b55f25ebf2` |

native openssl で派生/元 source hash を照合した。旧依存 lock は `396c5b31f6b8bf660a0908e94334d221ccb8617c598911a175b3b39ccd87312c` のまま。

今回の本体固定基準は V1 修正後の 489 files / `deb0ae0a12248bb263b33fe89cdbe72053434a8141e8edd0fde287041414c0ef`、HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。起動待ちから回収した fingerprint は 07:07:52 JST にこの値と一致し、tracked modified 21 / untracked porcelain entries 75 / lock hash `02ee47aa5787fe11fb3b49d819a8283c1cdd7778803985e29d0a3d7cc209680e` も不変。変更は派生 temp とこの報告のみであり、V1 本体レビューに影響しない。

本体 C、HTML/style 属性接続、root Raw/nesting、恒久 notice 台帳、全 CSS 視覚意味解析は未実施のまま。browser/listener/production/DB/storage に操作していない。環境 owner は Verifier。自己所有の実行 session は回収済みで、追加実装を停止する。

終了照合: 2026-09-06 07:08:58 JST、Node22.22.3 fingerprint は上記 489 files / HEAD / status / lock と再一致。native openssl の派生 3 ファイル・元 2 ファイル・旧 lock の 6 hash もすべて表の固定値に一致した。
