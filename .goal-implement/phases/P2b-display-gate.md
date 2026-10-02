# P2b 表示方式 gate: 空 sandbox と cookie

## 結論

2026-09-06 04:25〜04:41 JST、Implementer `/root/implementer`。対象Chromeでは、現行cookie属性を維持した空sandbox srcdoc内のPNG/SVG取得にcookieが送られず、認可失敗となった。CSPへ配信originだけを追加しても解消しなかった。cookie-only方式のこの組合せを採用せず、Managerの代替方式判断へ戻す。

これは一時fixtureによる方式試験であり、本アプリのasset認可やP2b-A/Bの完成候補ではない。SameSite、sandbox権限、bearer grantは変更/採用していない。

## 条件と実行経路

- 入力: 最新plan/design、P2b設計提案・独立レビュー、現行 `NoteContent.tsx` / `hollowServer.ts`。manual-testの専用セッション・観測手順を使用し、Manager指定の単独担当と既存環境保持を優先した。
- 一時dir: `/tmp/hollow-display-gate.4k8s4O`。依存追加なし、`server.mjs` はapply_patchで作成した。PNGは既存FFmpeg生成32px fixtureのread-only再利用、SVGはscript・外部参照なしの安全な手製fixture。SVGサニタイザーの試験ではない。
- HTTP listener: `127.0.0.1` のOS割当port。最終実行URL `http://localhost:54853`。本アプリのlocalhost:3000、DB/auth、原本attachment endpointは使っていない。
- 本体Node22の起動が遅延したため、既知のアプリ同梱Node24.19.0で一時serverを起動した。本体runtime/依存は変更なし。再実行は `/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node server.mjs`。
- 実browser: agent-browser0.36.0、専用 `hollow-display-gate --restore`。navigator.userAgent は `HeadlessChrome/152.0.0.0`、Macintosh。OS標準以外の追加browser/設定変更なし。`focus-debug` は未操作。
- test cookie: HttpOnly、SameSite=Lax、Path=/、HTTPなのでSecureなし。本体と同じ属性だがcookie名・認可はtest専用。600秒有効のin-memory session A/B。ログはcookie有無/accountラベル/HTTP statusだけで、値は記録しない。
- 両frameは `sandbox=""` / no-referrer。現行対照は `default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; form-action 'none'; base-uri 'none'`。追加origin対照だけimg-src/media-srcへ正確な一時server originを許可した。iframe内scriptなし。外側DOMに未信頼CSSを入れていない。

## 観測

| 条件 | request / 描画 | 結果 |
| --- | --- | --- |
| anonymous 親PNG | cookieなし、401 | test認可対照成立 |
| A signin後の親PNG | cookieあり、account A、200。naturalWidth32、色付きtest pattern描画 | cookie発行・画像自体・server配信は成立 |
| data-only CSPの空sandbox | 許可originがなくPNG/SVGの取得を阻止、broken image | 現行CSPのままでは外部inline表示不可 |
| origin追加CSPの空sandbox PNG/SVG | 両方cookieなし、account null、401。broken image | CSP追加だけでは認可付き表示が不成立 |
| SPA相当remount / preview remount | UIの二つのボタンを順に操作。親PNG200が繰り返され、frame PNG/SVGは401 | 同じ完成srcdocを新しいiframeへmountしてもcookie欠落。個々のframe完了を独立写真で認定はしていない |
| reload | 親PNG200 / naturalWidth32を維持、空sandbox内PNG/SVGはcookieなし401 | reloadでも不成立 |

04:38 JSTに `signed-a.png` を画像として自身で確認した。親の色付きPNGと、枠内の `Detail / sandbox empty`、PNG/SVGのbroken imageを同時に確認した。写真の `Anonymous` はreload後のfixtureの初期ラベルであり、認可状態の正本ではない。認可の根拠は同時期のserver account A / cookieあり200と親画像のnaturalWidthである。スクリーンショットは一時dirにのみ保存した。

初回fixtureはsrcdoc用引用符のescape不備で外側scriptが実行できず、frame自体がなかった。String.rawへ修正してframe生成・request到達を確認した後の結果だけを上表へ採用した。修正前の白紙画面をcookie失敗の根拠にしていない。

## 中断範囲と次の判断

PNG/SVGで認可欠落を確定できたため、Manager指示によりMP4/Range/seek、A対B・別note・失効の網羅、HTTPS/他engineへ広げず止めた。A/B/revokeボタンとnote限定認可はfixtureにあるが、その合格を報告していない。MP4 Range経路はまだfixtureに実装していない。元画像の既読画素と、次の認可付き取得の失効も未検証である。

候補は、空sandboxを維持する失効可能な短期asset bearer grantと、`allow-same-origin` だけを追加してscript禁止を維持する方式の比較。前者はURLコピーのbearer権限・expiry/epoch/current permission・非永続化、後者は同origin化による親DOMとの境界・script/event/危険要素除去・CSPを別gateで検証する必要がある。今回はいずれも試験・採用していない。SameSite=None、allow-scripts、未信頼CSSの親DOM投入を代替として採用していない。

根拠となる仕様は [HTML iframe sandbox](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox) と [cookie draft §5.2.1](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.2.1)。draftを確定RFCと扱わず、今回の実測を未確認browser/HTTPSへ一般化しない。

## 実行環境の障害と引継ぎ

開始時にNode22/PATHコマンドが数分無応答になり、標準absolute `/bin/cat` 等は成功した。既知の別Node24は即時成功。CUAのChrome tab作成は `Browser is not available: chrome`、browser一覧は空、native Chromeは `Sky Computer Use native pipe startup failed`。CUAではtabを作成できず、その結果をcookie不成立と扱っていない。その後Node22 `--version` は遅れてv22.22.3を返し、agent-browserも遅れて0.36.0を返したため標準CLIで上記実測を行った。再度遅延した追加SPA単独確認は打ち切り、観測済み根拠以上を合格にしていない。OS設定/サービス/別作業processは変更していない。

本体461filesの開始・終了fingerprintは `8b20b45bdee8aeae4a0f2641df4018f99c6c8433c3be2bd817796e889209b10c` で一致。tracked+untracked path+NUL+bytes+NUL、`.goal-implement/` 除外。HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。一時 `server.mjs` SHA256は `4b771e036d02e3bea5e3329c2da59d0daec6cd8ef178781df7ae704177998edc`。

一時server session9418はCtrl-Cで終了済み（exit130）。前の一時server24597/51682も終了済み。本番production6016/PID30665・同DB/storage/mailboxは維持し、再起動していない。04:42:12 JSTに専用browser close（session85542）の成功とexit0を確認した。focus-debugを含む一括cleanupはしない。全コード/browser操作を停止し、以後のsandbox候補比較はManagerの委譲を待つ。

## 代替 gate: allow-same-origin 単独

2026-09-06 04:56〜04:58 JST、Implementer `/root/implementer`。上記の空sandbox失敗を保持した別versionで、`sandbox="allow-same-origin"` 単独と現行cookie属性の組合せは代表条件で成立した。本体接続へ進む候補として推奨するが、これは方式gateでありP2b-A/B・本体認可・P1-C安全性の受入ではない。

### 条件・境界

最新design/planおよび `reviews/P2b-display-alternatives.md` を参照。Node24.19.0の依存なし一時serverを `http://localhost:56402` に起動した。本体Node22・DB・storage・mailboxは使用していない。標準agent-browser0.36.0専用session `hollow-display-alt --restore`、実UAはMacintosh / HeadlessChrome152.0.0.0。

test cookieはHttpOnly・SameSite=Lax・Path=/・Max-Age600、HTTPなのでSecureなし。SameSite変更、grant、allow-scripts等の追加sandbox権限は一切ない。session A/B、現在のnote-a参照有無をメモリーで判定し、GET/HEAD/Rangeすべて同じ認可を通す。cookie値はログに出さない。失効は明示的session削除で試験し、serverの時刻ベースexpiryは実装/検証していない。

子srcdocは完成HTMLを新iframeへ設定してmountする。CSPは `default-src 'none'`、`script-src 'none'`、`object-src 'none'`、`frame-src 'none'`、`connect-src 'none'`、`form-action 'none'`、`base-uri 'none'`。styleはunsafe-inline、img/mediaは一時originの `/assets/` 配下のみ。`navigate-to` に依存しない。

既存NodeHtmlSanitizerの一時importとFFmpeg fixture生成は起動遅延で各約4分無出力となり、自分のexecをCtrl-Cで終了した。その後、依存なしNode24の既存起動session85658も約5分後に復帰した。並行起動を増やさず回収した。したがって安全化は明示的test-onlyのinert template境界である。script/form/base/meta/iframe/object/embed/style/linkを表示前に除去、on属性・javascript hrefを除去、src/posterは正確なsame-origin note-a asset3種へ限定、url付きinline styleを除去する。これは一般HTML/CSS sanitizerではなく、実sanitizer合格の根拠にしない。未信頼CSSを外側の通常DOMへ挿入していない。

### 代表実測

UIの `Run bounded matrix` を実クリックし、23段階の観測を完了した。CLI evalは画面の結果JSON/DOMの読み取りに使用した。

| 条件 | 観測 | 判定 |
| --- | --- | --- |
| A初期表示 | PNG naturalWidth32、SVG160、MP4 videoWidth960 / duration5.055 / readyState4 / errorなし。PNG/SVG cookieあり200、動画cookieあり206 | 成立 |
| SPA相当remount / preview | 各々同じ画像寸法と動画readyState4。子URLはabout:srcdoc | 成立 |
| reload | 別の実Reloadクリック後もPNG32/SVG160/動画960、cookie200/206 | 成立 |
| MP4 seek | currentTime2、readyState4、errorなし。別のSeekクリック後の画像でも0:02と花の変化した画素を確認 | 成立。seek時に新Rangeが必ず発生するとは主張しない |
| Text全消去 / 再入力 | 既知Text.dataだけを空文字→「再入力 日本語」へ変更。要素・全属性・子nodeTypesのfingerprint不変 | 成立。空Textのreload跨ぎidentityは対象外 |
| 危険HTMLの表示前除去 | script/form/base/meta refresh/iframe/object/embed残数0、trap request0 | fixture限定で成立 |
| script/event再挿入probe | 親trusted codeから無害なmarker変更scriptとonclickを子へ挿入/起動後削除。親sentinel UNCHANGED、子markerなし、trap0 | script禁止の防御層が成立 |
| child通常link / unsafe self link | 両方preventDefault。子about:srcdoc・親URL維持、trap0。通常linkだけ親の許可linkを提示 | fixture限定で成立 |
| 通常navigation | 実child linkクリック→親の許可linkクリックで「Normal linked document」へ正常遷移 | 成立 |
| A HEAD / Range | note-a HEAD200 body0、Range0-99は206/100bytes。別noteはHEAD/Rangeとも401/body0、不正multi-rangeは416 | test認可成立 |
| B / 匿名 / 参照除去 / session失効 | 画像寸法0、動画readyState0。各HEAD/Range401/body0。BはcookieありB、匿名cookieなし、失効cookieありaccount null | test認可成立 |
| 参照復元 / 再signin A | 画像・動画復帰、HEAD200/Range206 | 成立 |

親の通常link仲介は既知 `/normal` だけを許可する試験用policyである。sandbox単独が自己遷移を禁止するとは主張しない。実装では表示前に危険なnavigation要素とURLを除去し、クリック/auxclick/keyboard等の対象操作を設計してから表示可能にする必要がある。この試験はonload後の通常clickのみで、初回loadとのrace、補助クリック、全操作経路を網羅していない。CSP script禁止だけではcookie付きの受動GETを防げないため、正確なasset参照検証と副作用のないGET契約を維持する。

`alternative-a.png`、`alternative-seek.png`、`alternative-svg-direct.png` を04:57〜04:58 JSTに自身で画像確認した。色付きPNG、緑の「SVG SAFE」、花の動画0:00→0:02、SVG直接表示を確認。SVGは安全な手製fixtureのみで、responseには `default-src 'none'; script-src 'none'; connect-src 'none'; sandbox` を設定している。悪性SVGのサニタイズ/response CSP負例試験は未実施であり、SVG sanitizer完成とは扱わない。原本 `/original` はcurl HEADで `application/octet-stream` / attachment / CSP default-none+sandboxを確認した。本体の原本endpointには変更していない。

### 再現物・出所・hash

一時dirは `/tmp/hollow-display-gate.4k8s4O`。新しい `server-same-origin.mjs` と `client-same-origin.js` はapply_patchで作成した。再現はNode24でserverを起動し、専用CLI sessionでopen、snapshot、Run bounded matrix、Reload、Seek、通常linkを操作する。元 `server.mjs` は不変。

- server-same-origin.mjs: `b8de03ff0626586d757552b9279707982713a01491806aaddedbb442903d428d`
- client-same-origin.js: `bc11365bbd3436be26eab988ff8f594b2f756c4122bda3c3e66426269dccea5e`
- video.mp4: `0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451`
- 旧server.mjs: `4b771e036d02e3bea5e3329c2da59d0daec6cd8ef178781df7ae704177998edc`、前回と一致。

動画は [MDN video公式例](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video) のflower動画と同系統の [MDN cc0-videos配下](https://github.com/mdn/interactive-examples/tree/main/live-examples/media/cc0-videos) の `flower.mp4`。`curl --fail --max-time 15 --output /tmp/hollow-display-gate.4k8s4O/video.mp4 https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4` で取得。CC0-labelled配布元を記録し、一時読み取り試験だけに使用した。本体fixtureへ採用/再配布していない。PNGは既存media-valid.pngをread-only再利用、SVGはこの試験用に手製した。

### 未実施・引継ぎ

実サニタイザー、悪性SVG、全リンク入力手段、HTTPS/Secure cookie、別engine/OS、production TanStack/React、共有/公開grant、キャッシュ済み画素の即時撤回は未検証。本gateは失効後の新しい取得を拒否するもので、既に届いた画素・動画bytesを回収できるとは主張しない。単体/build等の本体checksは無変更のため再実行していない。

04:57 JSTの全tracked+untracked・管理report除外fingerprintは461files / `8b20b45bdee8aeae4a0f2641df4018f99c6c8433c3be2bd817796e889209b10c`。HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、commitなし。本体の変更/未追跡集合はP2a固定対象と一致し、差分はこのreport追記のみ。

04:58 JSTに自分のbrowser `hollow-display-alt` close成功exit0、一時listener85658はCtrl-Cで終了exit130。production6016/PID30665を維持し、再起動/DB変更なし。focus-debugを含む別sessionとOS設定には触れていない。全コード/browser操作を停止し、Managerの方式採用・本体実装委譲へ返す。
