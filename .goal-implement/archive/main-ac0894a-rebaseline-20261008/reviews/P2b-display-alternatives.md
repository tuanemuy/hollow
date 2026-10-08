# P2b 非公開メディア表示の代替方式

## 判断案と範囲

最初に検証する候補は **(b) `sandbox="allow-same-origin"` 単独** とする。Cookie認可と既存asset権限判定を再利用し、後続ビジュアル編集の親側Text DOM操作にも接続できる。ただし、script禁止・表示前サニタイズ・受動通信・遷移・直接配信のgateを満たすことが条件。方式変更はManager判断待ちであり、本体へ実装しない。

(a) 短期asset bearer grantは、opaque originを維持する代替として成立し得る。しかし同じURLを持つ第三者にも期限内のasset取得権限を渡す。現在note/epochを毎回調べても、この性質は消えない。本人Cookieと同等と説明せず、限定bearer権限を採用する判断が必要である。

- 調査: 2026-09-06 04:38〜04:43 JST（Asia/Tokyo）、Verifier `/root/verifier`。一次資料閲覧と要件/design読取のみ。Markdown報告はmarkdown-styleの構造・空行ルールで記録する。
- 前提観測はImplementer提供: 同一PNGが親DOMではCookieあり200、空sandbox srcdocではCSP origin許可後もCookieなし401、SVGも同様。Verifierが独立に再現したものではない。現在のCookie設定・Chromium実行条件の観測を、全browser・全cookie方式の不可能性へ一般化しない。
- 原要求はHTML隔離、三編集、非公開/共有失効。空sandbox維持は現採用設計であり、変更不可の原要求ではない。現在designとP2b-Aの文言を変更する場合はManagerが記録する。
- コード・依存・環境設定・browser・production・DBを変更/操作していない。外部アカウント接続なし。spec/spec-implement不使用、goal変更なし。

## 標準が保証する差

HTML標準はorigin制限とscript制限を別flagにする。`allow-same-origin`だけではscript実行は再許可されない。同標準は、scriptを無効にしたまま親からsandbox内DOMへアクセスする用途を明示している。したがってsame-origin単独を、`allow-scripts`との併用によるsandbox除去・reload脱出と機械的に同一視しない。[HTML sandbox flags](https://html.spec.whatwg.org/multipage/browsers.html#sandboxed-origin-browsing-context-flag)

一方、iframe自身への遷移はsandboxだけでは全禁止にならない。未信頼ファイルを同じoriginから直接開かせる経路にはiframe属性の保護が適用されない。直接配信とframe内表示を別に検証する必要がある。[HTML iframe sandbox](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox)

同一originなら親の `contentDocument` からDocumentを取得でき、別originならnullになる。(b)で親がTextを書き換える設計はこの境界に沿うが、実入力イベント・IME・undoの成立は別gateで確認する。[MDN contentDocument](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/contentDocument)

## 比較

| 観点 | (a) opaque sandbox + 短期asset grant | (b) same-originのみ + Cookie |
| --- | --- | --- |
| 新たな権限 | token所持者へ対象assetの限定読み取りを委任する | opaque-origin障壁を外す。Cookie/session本人で取得する契約は維持できる候補 |
| 隔離 | origin隔離を維持。未信頼HTMLを安全化する責務は残る | scriptは禁止したまま。CSSは別Document内だが、同一originの受動requestを許す影響が増える |
| 非公開・失効 | 署名/期限だけでなく現在note・asset参照・発行元session/share grant・epochを毎回再評価する必要 | 現sessionと現在note閲覧権限/asset参照を各requestで確認。共有pass状態は後続でも必要 |
| 親のText編集 | 親はopaque DOMを直接編集できない。別AST表示や別途検証する専用bridge等が必要 | 親のtrusted codeからText-only編集できる候補。iframe内scriptを許可する必要はない |
| 運用負担 | 発行・更新・期限・コピー/漏洩・tokenを含むURLログ・Range継続の設計が増える | Cookieを維持できればtoken更新は不要。表示前sanitizer/CSPと親DOM処理を一貫させる負担 |
| 今回未確認 | このbrowserでのgrant表示/seek、期限更新、失効挙動 | このbrowserでCookie復帰/画像SVG/seek、親Text編集、受動通信/遷移遮断 |

### (a) の最小契約

bearerは所持自体が権限になる。URLに置くtokenはログ・履歴等への露出を考慮する必要がある。これはOAuth専用の形式を採用せよという意味ではなく、RFCのbearer脅威モデルをasset grantにも適用する設計上の推論である。[RFC 6750 §2.3 / §5](https://www.rfc-editor.org/rfc/rfc6750.html#section-5)

- 認証済み親だけが、現在表示できるnoteとそのasset/draft参照に限定して発行する。assetの全体検索やnote本文取得に使える権限へ広げない。本文・版・exportには安定IDだけを保存し、短期URLを永続化しない。
- tokenはnote/asset/用途/期限/発行元閲覧根拠に結び、改ざん不能にする。毎requestで現在参照・削除・membership・session失効・share/password epochを再評価。発行時の権限だけをJWT等へ写して終わりにしない。
- それでも、発行元の権限が有効な間にコピーしたtokenを匿名Bへ渡せば、Bも取得できる設計である。発行元sessionが今も有効という確認は、presenterが本人という確認ではない。Cookieなしのimg/videoで追加本人証明を要求すれば、元の表示不成立へ戻り得る。
- HTTPS、URL/tokenのログ秘匿、限定TTL、cache方針、referrer方針を明示する。`no-referrer`だけでURLそのもののログ/コピー/HTMLへの露出は解消しない。未信頼CSS/外部画像を含む本文へtoken付きURLを注入する場合も、単にscriptがないことを秘密保持の証明にしない。
- 期限前更新は親が再認可して行う。長時間閲覧・sleep復帰・期限跨ぎseekを試す。videoのURL交換が再生位置を失わないか確認する。Rangeごとに同じ認可を通し、304/206/416やHEADが認可の抜け道にならないようにする。Rangeは後続requestを生む機構であり、最初の200だけの認可では足りない。[RFC 9110 §14](https://www.rfc-editor.org/rfc/rfc9110.html#section-14)

この方式を採る場合、コピー済みURLを期限内に使える範囲と、失効後の新規取得拒否を受入条件に明記する。既に受信した画像や再生bufferを取り戻せない点は両方式共通である。

### (b) の最小契約

`allow-same-origin`だけを付け、allow-scripts/forms/popups/top-navigation/downloads等を追加しない。特に将来visual編集の都合でallow-scriptsを併記する変更は、この判断の延長ではなく新たな安全性レビューにする。

- 保存時だけでなくHTML preview・取込直後・draftも、サニタイズを通した完成srcdocを初回mountする。未保存HTMLを先に描画してから掃除しない。trusted wrapper/CSPと本文を分離し、本文由来のscript/event属性/javascript URL、base、meta refresh、form、nested frame/object/embed等を制限する。
- 最小CSP候補は `default-src 'none'; script-src 'none'; object-src 'none'; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'` を基礎に、必要なimage/media/font/styleだけ追加する。装飾保持に必要なstyle許可と外部参照はIM-05の選択/台帳へ結ぶ。CSPの `sandbox` をmetaへ書いてiframe属性の代わりにすることはできない。[CSP Level 3](https://w3c.github.io/webappsec-csp/#directive-sandbox)
- `script-src 'none'`は画像やCSSによる受動requestを止めない。アプリorigin全体のimg/media許可は、note asset以外のCookie付きGETにも届き得る。URLのasset正規化・既知内部宛て無効化、GETの副作用禁止、mutating endpointのmethod/CSRF境界を保つ。これらはコード・実request gateで確認し、「JSなしだから安全」で省略しない。
- sandboxはiframe自身のリンク遷移まで一律禁止しない。meta/base等を除去し、編集時リンククリックはtrusted親が抑止する。読む画面で外部リンクを許す場合も、検証したURLを親の明示導線から扱う等、意図した遷移先とsandbox外で開く場合のnoopenerを決める。非標準/未実装の万能 `navigate-to` に依存しない。
- 親bridgeは既知iframeの現在DocumentとText node対応だけを使う。子の任意HTML/関数/属性を親DOMへコピー・実行しない。親のイベントcallback・Text変更がscript禁止のまま動くことを試す。Text全消去/再入力、class/style/data属性保持を確認し、親アプリ側のtrusted命令を子本文から呼べる汎用bridgeにしない。
- SVGはED-06どおり保存時安全化し、imgとしての表示と直接URLを開いた場合を別に見る。SVG標準にはscript/外部参照の制限が異なるprocessing modeがあるため、imgでscriptが動かなかった結果だけを直接document配信の安全根拠にしない。[SVG Integration](https://svgwg.org/specs/integration/#secure-animated-mode)
- 原本HTMLはattachmentのまま。安全化したSVG等のinline assetでも、直接表示のMIME/nosniff/CSP等を別に定義する。本文と同originであるため、script制限を誤って外した将来変更の影響は大きい。

## 採用前の小さいgate

まず(b)を隔離したsynthetic fixtureで試し、通過した場合だけ本体差分を作る。危険な本文を既存利用者noteへ注入しない。

| gate | 必須観測 |
| --- | --- |
| 表示とCookie | 同じCookie属性のAでPNG、安全化SVG、短いMP4/WebMの画像/動画とseek。親/iframe requestのCookie有無と200/206、SPA詳細・HTML preview・reload。未指定の全browser試験へ拡張しない。 |
| script/親境界 | script、イベント属性、javascript URLを持つsynthetic入力をsanitizer前後で確認。子のmarker変更/親sentinel変更/requestが発生しない。sandbox token集合がsame-originのみで固定され、親Text-only変更は成功する。 |
| 非script経路 | form、base、meta refresh、nested frame/object、リンク/targetと受動画像/CSS URL。意図しないアプリ操作・内部宛て・top遷移・self遷移が発生しない。許可された通常asset/装飾は残る。 |
| 現在認可 | B/匿名、別note ID、失効session、削除・参照除去、Range/HEADを拒否。公開/共有は後続実装時にpassword変更・link再発行・非公開化のepochを追加し、現在の個人gateを全共有合格に拡張しない。 |
| 直接配信 | 原本HTMLはdownload、safe SVG直接openもscript/外部接続を許さない。iframe属性を通らない経路を独立確認する。 |

(b)が不成立または境界を維持できない場合だけ、(a)について「opaque frame画像/seek」「コピー先匿名での限定権限を明示」「期限更新/Range」「epoch変更直後の新request拒否」「本文/版/export/logにtokenを残さない」のgateを追加する。(a)でも実AI接続や外部アカウントは不要。

## 影響する受入IDと未確認

- 直近: P2b-A（表示/認可/Range方式）、P2b-B（ED-06の挿入・draft・SVG）、P2b-C（IM-05/ED-03の参照とpreview）、P2b-D（装飾保持）。方式変更後に対象として再検証する。
- 既受入への影響: P1-CのHTML/sandbox/CSS隔離とSPA previewは再オープン対象。P1-Dの非公開認可もasset経路について影響確認する。無関係の認証登録やDB rollback全件を無根拠に再実行しない。
- 後続: R02 / ED-02のText-only visual、R06 / SH-03〜07の共有失効・公開script禁止、R04 / ED-10の削除とasset回収。今回の方式判断だけで合格にしない。
- 今回は一次資料確認のみ。Cookie復帰、same-origin単独での親event/IME/undo、grant再生/更新、実SVG直接配信、全browser差は未検証。資料は2026-09-06に閲覧した。リンク先はHTML Living Standard、W3C/MDNの現行資料、RFC6750/9110であり、実装中のアプリ状態を保証するものではない。

Manager判断待ち。browser/environment ownerはImplementerのまま維持し、本調査から実装・権限設定変更へ進まない。
