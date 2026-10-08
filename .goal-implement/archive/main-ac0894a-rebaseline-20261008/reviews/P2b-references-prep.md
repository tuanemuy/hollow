# P2b-C 独立 fixture 準備

## 対象と状態

2026-09-06 07:25:29〜07:29:29 JST に準備した。元 IM-05 / ED-03、最新版 design の P2b と P2b-C 永続化・資源境界、plan の C 四範囲を読んだ。本体実装のコード・依存・DB/storage・production・browser は読取/操作していない。実装担当が環境所有を継続する。

これは固定入力の準備であり、P2b-C 本体や CSS gate の合格判定ではない。実装者へ fixture を渡さず、候補固定後の独立検証に保持する。報告の期待値・未実行の区分には markdown-style を使用した。

## 固定成果と出所

専用 temp は `/tmp/hollow-p2b-reference-prep.1Ccimv`。全 7 ファイル、6,254 bytes。すべて Verifier が今回手書きした synthetic fixture で、CC0-1.0 とする。既存 spike、既存独立 fixture、本体へ追加・変更していない。SVG 2 個も新規の手書きであり、第三者素材や取得物を含めない。JS は含めず、後続 job の観測は本文の専用文字列だけで行う。

| path | bytes | SHA-256 |
| --- | ---: | --- |
| `bundle/pages/main.html` | 1539 | `044481037bde8f3c3632c48cab3049101d6c4bc5ff7e42d7a6b52c7df1ceca9d` |
| `bundle/pages/notes.md` | 508 | `e780a556784791d8b9ee03195757d2f996423cf1c9498cd1733153b8e563d096` |
| `bundle/styles/main.css` | 841 | `7cae029fe80d2448e6ba63db0944dc575cca0aa0a05869033aeb6d8bf6aabb2c` |
| `bundle/styles/nested/accent.css` | 305 | `377a6981a71411d3ff402fe2fafade9a1a4699c7c91d69d346560ee72638c19b` |
| `bundle/images/safe.svg` | 482 | `9d0f19525d8ee5baf630ebae3879a866b3fd5ead7e0a7d10f9517706d691b642` |
| `bundle/images/alternate.svg` | 170 | `fef81825c80f276e2156b111ecafb350afafaa3c83723f78ece8f5a430213927` |
| `selection-manifest.json` | 2409 | `096d44fb2bb78961b2661813b5b0bd38f168478576f1fbad2653a7ad49211663` |

temp root からの相対 path をソートし、各 path + NUL + bytes + NUL を連結した SHA-256 は `3eb110282ebd8ed36ed6df8a636bfda83ff26b971312c2ed0758af813cee9a62`。

manifest は試験記述であり、Hollow の upload API schema を推測したものではない。通常選択は HTML/MD を note、CSS 2 個と `safe.svg` を companion とする 5 項目・3,675 bytes。曖昧選択は `alternate.svg` の別 selectionId を同じ論理 `images/safe.svg` に追加する 6 項目・3,845 bytes。物理ファイルを上書きして曖昧さを消さない。manifest 自体は upload 対象ではない。

## 最小の期待 matrix

| 固定入力・操作差 | 後で観測すること | 主な範囲 |
| --- | --- | --- |
| base selection の HTML と MD を既定 on で取り込み、HTML 保存でも参照を追加 | A/B は別 note。CSS は companion、SVG は明示した companion のまま。両 source の `../images/safe.svg` は bundle 内の同じ候補へ解決し、現在 note 用の認可 URL になる。HTML の CSS は埋め込み、元 link の追加読込を残さない | UI/同梱、CSS/本文 |
| 同じ参照を明示 off で保存し、その後 on を選び直す | 未試行と取得失敗を区別。off の外部 CSS は適用されず、候補を失わない。on で候補を取得して装飾が当たる。画像の off/公開宛先失敗と CSS の off/失敗を同じ結果へ潰さない | UI/同梱、永続処理 |
| `missing.svg` と `missing.css` の公開失敗、および相対 missing/root 外 escape/loopback | 公開失敗画像は元 URL と失敗状態を保持し、公開 CSS 失敗は外部 link を描画へ残さず装飾欠落を伝える。相対未解決と escape をアプリ自身の URL へ誤解決しない。内部宛先は server 取得も browser 直読も無効化し、URL/理由は台帳へ残す | 取得境界、CSS/本文 |
| `main.css` と実 HTML の classes/style 属性 | grid/flex・有限 caption/absolute・小さい transform・色 var を保持。異なる要素の position-only と edge-only を合成しない。同一要素 split、0px/0.0px/100.0vw/100.0vh と inline inset 合成の全面配置を通知付きで制限。@import は除去し、別 link の同じ accent CSS は通常の独立取得として扱う | CSS/本文 |
| ambiguous selection と繰り返し on/save | 同じ論理 path を最後の file で勝手に解決しない。曖昧な参照を未解決にしても A/B note の別作成を維持。1 note 内の同じ SVG 2 出現や既取得 URL を再取得・重複計上しない。別 note 間の物理 object 全体 dedupe までは新条件にしない | UI/同梱、永続処理 |
| A 参照 job 開始後に見出しを `REFERENCE-A-LATER-SAVED` へ変更、job 履歴の寿命/権限を分離して確認 | 古い generation/version/lease の結果が新本文を上書きしない。再試行しても取得済みの二重化や容量解放漏れを起こさない。参照台帳は note に属し job 履歴の削除後も残り、job 履歴は実行本人のみ。後続共有未実装を架空の browser 合格にしない | 永続処理 |

`safe.svg` は viewBox・gradient・clipPath を持つ正常小画像。青緑地・黄色の円・白い山を視覚上の区別に使い、曖昧側は赤い矩形と `AMBIGUOUS-OTHER` にする。単に XML が読めることを、本体 sanitizer や見た目保持の成功と扱わない。

`accent.css` の外部背景画像・font は原文どおり参照取得対象へ追加しない。元 URL と外部依存が残ることを、stylesheet 自身の埋め込み・@import 除去と分ける。入力中の通常 caption は有限 top/left/width/height であり、既知の小さい親 inset-zero の保守的損失を「通常装飾は全部保持」と説明するために使わない。

## 後続の差替条件と証拠の分離

この入力をそのまま browser で開いたり、ネットワークを使う取込へ投入しない。`https://p2b-public-fixture.invalid/...` は通信しない placeholder であり、実際の公開 host、404、タイムアウトの根拠ではない。`http://127.0.0.1/NEVER_SEND.svg` も拒否 sentinel のみで、実 listener を用意しない。標準 port 80 にして、許可外 port の拒否だけで内部 IP 拒否を確認したと誤認しない。

候補固定後の本体試験では別 temp の派生コピーを作り、source hash と置換表を残す。公開宛先の成功/404/CSS/画像/背景/font を識別できる、事前に妥当性を確認した public-safe な URL へ差し替える。公開 URL をまだ選んでおらず、host の作成・公開・外部送信を今回認可されたものとして扱わない。内部 sentinel と root escape は拒否の対象に留める。通常 bundle だけを先に確認する場合は、外部 placeholder 群を派生コピーで除き、そのケースでは外部失敗や直読を検証していないと記録する。

DNS/private/redirect/socket pin/TLS/deadline の決定的な異常系や遅い job の競合は、別の test-only resolver/socket・一時 DB/worker の証拠として扱う。本体で public-safe な取得が動いた証拠と混同しない。production に allowPrivate を導入する試験設計は採らない。controlled endpoint や短い待機の具体手段は、候補の公開契約を読める正式レビュー時に決める。

## 実行したことと未実行

- `/usr/bin/xmllint --nonet --noout` で SVG 2 個の XML 妥当性を確認し、exit 0。
- Node 24.19.0 単発で JSON parse、manifest の全 source の存在、base role 2 notes、7 ファイルのサイズ/hash を確認した。途中の無出力 session は回収後に成功結果を受領し、未完を残していない。
- CSS/HTML/Markdown parser、本体 sanitizer、import/save、公開 fetch、DNS/redirect/TLS/stream、job/容量/台帳/認可は実行していない。CSS 描画、SVG 表示、スクリーンショットも未実施。
- 100 件/500MiB、200 件/100MiB、data URI 閾値、CSS/DOM/AST/探索量、最終回収、取消/restart を覆う巨大 fixture は作らない。今回の小入力だけで plan C の四範囲全体が検証済みになるとは扱わない。design の追加運用上限を原要求へ格上げしない。
- listener/browser/process/環境設定を追加・変更せず、実装担当の所有を維持する。報告作成後は操作を停止する。

報告終了は 2026-09-06 07:31:23 JST。実行中 session は残っていない。以後の fixture 差替・本体試験は正式な検証委譲を待つ。
