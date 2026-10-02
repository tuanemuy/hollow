# P2b 設計提案

## 調査対象と状態

2026-09-06T03:39:22+09:00（Asia/Tokyo）。P2a の独立検証中に行った読み取り専用調査。実装・依存追加・migration・プロセス再起動・ブラウザ操作は行っていない。本書だけを書き込んだ。採用決定と実装完了を示す文書ではない。

対象は [IM-05](../../spec/scenario/import.md)、[ED-02〜11](../../spec/scenario/editing.md)、P-11/12/14 と JB の依存。brief/design/plan、現行 sanitizer・表示/編集 component・note 保存・storage/import ports・lockfile を参照した。

確認対象は main / `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。03:34:09 JST のコード fingerprint は `2e732dcd2c988afcb19e6f6dbecd2d162e98f82dde41c0ac63f5c30a6c544e76`、441 files。P2a 完了候補と一致した。`git ls-files -co --exclude-standard -z` を重複除去・sortし、`.goal-implement/` を除いた path/NUL/bytes/NUL を SHA-256 に入力した。未コミット・未追跡コードも含む。ignored DB/build成果物は対象外。

## 分割案

P2b を一括実装せず、次の縦スライスで独立受け入れする。ワークスペース・公開・AI実接続は後続フェーズに残す。各スライスでも現在の個人認可と P1/P2a 回帰を確認する。

| スライス | 対象 | 観測する完成条件 | 先行条件 |
| --- | --- | --- | --- |
| B0: 表示成立 gate | IM-05 / ED-06 の境界 | 現行 sandbox のまま、認可付き PNG/SVG/MP4 を詳細・preview・SPA・再読込で表示。cookie が成立しなければ grant 候補を比較 | 独立ブラウザ検証終了後の専用環境 |
| B1: private メディア | ED-06 | HTML/WYSIWYGへの画像・動画挿入、進捗、alt、失敗placeholder除去、取消/離脱、再表示、他人拒否 | B0、容量/asset relation |
| B2: 外部参照と表示style | IM-05 / ED-03 / ED-11 | HTML/MD取込とHTML保存→安全取得job→asset差替/CSS埋込→恒久一覧→既定style切替。相対同梱、失敗/未試行、上限を含む | B1のasset配信、batch manifest |
| C1: 保存と版 | ED-08 / ED-05 | 保存ごと直近20版、復元、未保存退避、同一人last-writeと別人競合を区別、切替前保存 | B2のbody更新も版契約へ統合 |
| C2: 三モード編集 | ED-02/03/04/05 | text-node限定visual、HTML構文/補正preview、WYSIWYG表/画像/code/link、unsupported保持、警告設定とundo | C1、visual bridge gate |
| D: ゴミ箱 | ED-09/10 / JB | 移動/undo/復元/30日期限/完全削除、原本asset版の回収、50超は500件chunk job、取消commit guard | note lifecycle、C1の版/asset参照 |

B1のWYSIWYG挿入は現行 richFragment が画像を落とすため、画像用安全node保持を同時に必要とする。完全なWYSIWYG操作はC2へ残すが、B1の挿入直後に別入力で画像が消える状態は受け入れない。

## 現行実装の再利用と不足

- `ObjectStorage` の private streaming保存・hash・staging・remove、容量reservation、Hollow UoW、outbox通知、DB正本job、起動/周期sweep、lease/条件commitを再利用する。外部通信・decode・object I/Oをtransaction内に入れない。
- 現行 `ObjectStorage.put` は確定 `expectedBytes` が必須。Content-Length不明の外部応答にはそのまま適用できない。上限付きstaging streamで実bytesを確定してからprivate objectへpromoteする契約を追加する。動画seek用 `stat` と範囲streamも現在はない。
- `NoteContent.tsx` は `sandbox=""`、`img-src data:`、`font-src 'none'`、`default-src 'none'`。外部画像・動画・フォントは表示できない。常に既定styleを埋め込み、styleMode未実装。完成srcdocだけを初回mountするP1修正は維持する。
- 原本取得は attachment/octet-stream、本人認可、no-store。画像表示のためにこのendpointをinlineへ変更しない。型検証済みメディア用endpointを別に作る。
- `NodeHtmlSanitizer` は `style` を許可するが、style要素内のCSS AST除去規則はない。`link` と大きなdata URIは保存前に消えるため、参照収集を既存sanitizeの後だけで行うと復元できない。
- `UploadFile` はname/bytesのみ。folder選択でも相対pathを送っていない。CSS companionは現在のimport選択対象外。相対path解決は現行データだけでは成立しない。
- `saveNote` は入力versionを競合判定に使用せず、transaction内の最新版を更新する。個人の同時タブlast-writeは成立するが、版履歴・actor・trashはない。
- `RichText` は許可tag以外を平坦化し、属性・画像・表構造を保持しない。contentEditable DOMをHTML正本の代わりにして三モード共通化できない。

## メディアの認可と sandbox 表示

### 最小の共通閲覧契約

`canReadNote(principal, note)` と `canReadAsset(principal, noteId, assetId)` をapplicationに置く。assetの所有者一致だけで許可せず、そのnoteから参照可能なassetであることも確認する。principalは現在account、後続で共有link/publicを追加できる判別unionにする。保存URLは安定したnote/asset参照で、sessionや期限付きtokenを本文へ永続化しない。

private asset endpointは認可後に確定MIME、nosniff、private/no-storeでstreamする。MP4/WebMはGET/HEAD、単一Range、206/416とContent-Rangeを実装し、無制限multi-rangeを拒否する。全200MBをRSC payloadやdata URIへ展開しない。原本は従来どおりattachment。

### cookieを先に実証する

HTML標準のsandbox originはopaqueとなり親からDOMアクセスできない。しかし、これだけでHTTP cookieの不送信は断定できない。Cookie仕様draftのdocument-based判定には、sandbox時にdocument URIのoriginを使う処理もある。srcdoc、SameSite=Lax、ブラウザ実装の組合せを実測する。参照したCookie文書はdraftであり確定RFCとして扱わない。[HTML Standard](https://html.spec.whatwg.org/dev/document-sequences.html)、[Cookie draft §5.2.1](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.2.1)

第一候補は、現行cookie認可付きinline endpointの絶対URLを描画時に用い、sandboxを変更せず必要なimg-src/media-srcだけに自サービスの正確なoriginを許可する方式。`'self'` の解釈やCORS/CORPも実測する。表示のためにSameSite=Noneへ変更したりallow-same-originを足したりしない。

cookie経路が対象browserで成立しない場合だけ、描画時に発行する短期asset grantを比較する。grantはnoteId/assetId/read/expiryと認可epoch、失効可能なsessionまたは共有principalに結びつけ、取得時にも現在の閲覧権限・trash状態を確認する。URLを得た第三者が有効期間内に利用できるbearer性を明記する。query/log/referrerへの漏出を抑え、アクセスlogはtokenを伏せる。単なる期限付き署名だけで権限取消の即時反映を満たしたとしない。

親の認可fetch→Blob URL案は小画像の比較候補に留める。Blobはstorage partition一致の制約があり、opaque iframeから必ず使えるとは限らない。動画全件のmemory利用も増える。[File API §8.3.2](https://www.w3.org/TR/FileAPI/#blob-url-partitioning)

### B0のブラウザ試験

- Chromium/Firefox/WebKit、mobile、第三者cookie拒否設定、HTTPS本番相当とlocalhostの双方。最低限の対象browserをManagerが決める。
- 同一の `sandbox=""` srcdocでPNG/SVG/video poster/MP4 seek。初回/編集完了SPA/一覧からSPA/preview/再読込。HTTP到達と実描画を別々に記録する。
- Cookie request headerの有無だけを観測し、値は記録しない。anonymous/他利用者/失効session/他noteへのassetID差替/Rangeによる迂回を拒否する。
- セッション失効・trash後の新規取得拒否。既に読み込んだ画素や再生bufferは回収不能であることを区別する。
- grant比較時は期限/epoch失効、コピーURL、referrer・log・履歴への残留、video Range再取得を確認する。

この調査では全項目未実行。cookie不成立もgrant採用も未決定。

## private media と SVG

`Asset`（storageKey/hash/bytes/validatedMime/state）と `NoteAssetReference` を追加する。upload sessionはaccount＋draftまたはnoteに紐づく。新規空ノートへmediaを先行uploadしても空noteを作らず、保存でattachment relationを確定する。未使用session/objectは期限後に回収する。

画像PNG/JPEG/GIF/WebP/SVGは20MB、動画MP4/WebMは200MB。拡張子・申告MIME・magicだけで正常とせず、コンテナ/画像構造を隔離したvalidatorで確認する。全再生codecの対応とファイル正常性は別に表示する。画素数・フレーム数・decode時間/メモリも制限する。P2aの破損GIF/FLAC指摘は未修正であり、本提案で解消したとは扱わない。

SVGはサーバーでDOMPurify＋保守されたNode DOM実装を候補とする。SVG profileに加えscript/foreignObject/event/external href/CSS外部参照/危険なanimationを禁止し、DOCTYPE/entity、深さ/サイズ上限を検査する。fragment-local paint/clip参照だけを検証して残す。sanitize後のSVGを保存し、inline SVG DOMへ注入せずimgとして配信する。直接URL navigationでもactive contentにならないようresponse CSP sandboxを付ける。SVGの画像利用時と直接閲覧時は処理modeが異なるため、imgの安全性だけに依存しない。[DOMPurify server usage](https://github.com/cure53/DOMPurify)、[SVG 2 conformance](https://www.w3.org/TR/SVG/conform.html)

SVG rasterizationは代替表示候補だが、サニタイズSVG保存という原文を勝手に置き換えない。現行sanitize-htmlをHTML用に維持し、SVG専用adapterを分ける。DOMPurify/jsdomのNode22.13互換版と悪性SVG fixtureは次のspikeで固定する。

容量はoriginal/media/reference/trashを合算し、確定objectと予約を二重に数えない。共有ファイルの物理dedupは初期採用しない。reference tableで現在本文・20版・trashがpinするobjectを判定する。本文から外れただけで、復元対象版が使う画像を消さない。未参照回収の猶予は未定（提案7日）。

## IM-05 の取り込み契約

### 恒久台帳とジョブ

`Reference` はnoteId、出現位置、kind、元URL、正規化URL、解決base、statusを保持する。statusはunattempted/imported/failed/skipped、失敗理由はnot_found/timeout/denied/unsafe/limit/invalidを区別する。asset参照、CSS除去内容、検出時bodyVersionを型付き列/子tableで持つ。本文のCSS実体は保存HTMLに埋め込む。

台帳はnote閲覧者が読める。実行者だけの90日job履歴とは別に保持し、job pruningで消さない。失敗理由の詳細がpruneされても元URLと未取得状態は残す。再試行はattemptを追加し、以前の検出/失敗を成功したように改ざんしない。URLに資格情報が含まれる場合は取得拒否し、安全な表示を行う。query付き外部URLの共有時の扱いは原文に従い閲覧者へ見えるため、秘密付きURLを貼る際の警告が必要。

HTML/MD変換とHTML編集保存は同じreference pipelineを通す。sanitize前の未信頼ASTから候補を収集するが、fetchしない。危険なHTMLを保存せず、外部CSSの未取得候補は台帳へ退避する。取り込み既定on、offではunattemptedとして後で選び直せる。既存内部storage参照はIDと現在の権限を検証し、外部URLへ再fetchしない。

ネットワーク取得は独立 `ReferenceFetch` port/Node adapter。typed reference jobをDBに置き、wake/sweep/leaseを再利用する。現行ConversionJobへoptional fieldを増やすのではなくjob kind別payload/resultをunionにする。参照jobは本文全体を古いsnapshotで置換せず、versionと該当URL occurrenceが一致する場合だけ差替する。不一致なら未適用として再検出へ回す。guardはlease、current job、note lifecycle、権限、body versionを同一UoWで検査する。

object確定前crash、object後DB前crash、commit後wake欠落、retry/取消/旧leaseを実DBで検証する。staging/object cleanupを永続化し、削除済みでもack再試行できる。external requestを業務callback retryで重複実行しない。

### SSRF境界

1. WHATWG URLで一度正規化する。http/httpsだけ、userinfo・不正host・zone IDを拒否。localhost系と内部名を拒否し、URL表示文字列の前方一致では検証しない。WHATWGは16進/8進/短縮IPv4等も解釈するため、正規化済みIPへ判定する。[URL Standard](https://url.spec.whatwg.org/#ipv4-parser)
2. DNSはA/AAAA全回答を検査し、一つでも非public範囲があれば拒否する。IPv4 loopback/private/link-local/CGNAT/unspecified/multicast/reservedとIPv6 loopback/ULA/link-local/multicast/IPv4-mapped/移行アドレスを含む。IANA special-use rangeをもとにtable化し、IPv4埋込IPv6を正規化して再判定する。NAT64/6to4/Teredo等は最初は拒否する提案。cloud metadata個別hostnameだけのblocklistにしない。[OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
3. 検証した一つのIPを実際のconnectionへ固定する。hostnameは元のものを保持し、custom lookupがそのIPだけを返す。通常のfetchによる再DNS解決を挟まない。Host/TLS SNI/証明書検証は元hostnameを使い、rejectUnauthorizedを無効化しない。Node22.13のhttp/https requestはlookupとservernameを提供する。[Node22.13 HTTP](https://raw.githubusercontent.com/nodejs/node/v22.13.0/doc/api/http.md)、[Node22.13 HTTPS](https://raw.githubusercontent.com/nodejs/node/v22.13.0/doc/api/https.md)
4. 自動redirectを使わず、各Locationをfinal URL基準で再正規化→DNS全検査→IP固定。最大5hop、loop拒否。proxy環境変数・cookie jar・Authorization・利用者cookie・Refererを転送しない。global agentを共有せず再接続も検証済みIPだけにする。
5. DNS/connect/TLS/header/bodyそれぞれと全体deadlineを置き、timeout時はrequest/responseをdestroyする。Nodeのtimeout設定だけではabortしない。初期案はDNS/connect各5秒、1resource全体20秒、1job全体120秒、同時取得2件。上限で後続はlimit理由を残す。[Node22.13 HTTP timeout](https://raw.githubusercontent.com/nodejs/node/v22.13.0/doc/api/http.md)
6. 200件/100MBはCSSを含めたnoteの取り込みbudgetとする。retryで無限にbudgetが増えないよう取得済みと今回予約を合算する。Content-Lengthを信用せずstream実bytesを数える。Accept-Encoding:identityを要求し、対応しないContent-Encodingは明示拒否する初期案。圧縮対応を追加する場合はwireと展開後の両上限を持つ。HTML偽装画像、CSS偽装HTMLは失敗扱い。

IP classificationはipaddr.js候補＋自前の明示range policyを使う。分類名だけで「public」を判断しない。server network egressでもprivate範囲を閉じるのが防御の第二層。アプリ層のDNS固定でOS routingや透過proxyまで保証したとは言わない。[ipaddr.js](https://github.com/whitequark/ipaddr.js)

テストは127.1/2130706433/0177.0.0.1/0x7f000001/IPv4-mapped/zone/percent host/trailing dot/IDN/userinfo、public→private redirect、DNS回答差替、混合A/AAAA、圧縮bomb、chunked過大、slow headers/body、quota並行予約を含める。ローカルtest用listenerへの許可はtest adapterだけに閉じ、production SSRF policyに例外を混ぜない。

### CSS AST と相対参照

CSSはcss-treeを第一候補とする。stylesheet/inline declarationの両方をAST化し、at-rule/URL/valueまで走査する。parse errorのRawは残さずnoticeにする。css-treeはRawを保持する寛容parserであり、parserを通しただけではsanitizeされない。[CSSTree](https://github.com/csstree/csstree)

- 全階層の@importを除去する。エスケープされた名前、@media/@supports/@layer内、コメント/大小文字、malformedを含める。未知at-ruleや解釈不能valueは保守的に落として明示する。
- ページ全面配置の定義は採用判断が必要。安全な初期案はpositionのfixed/sticky/absoluteとinset/top/right/bottom/left/z-index、viewport全面化に使うtransform/animation等を制限し、除去propertyを通知する。static/relativeや通常grid/flexは残す。var()/custom property/!important/animationが禁止値を復活させない検査が要る。単純な文字列置換や「fixedだけ削除」では完了にしない。
- url()/image-set()/@font-faceの参照はCSSの最終取得URLで絶対化する。背景画像/フォントは原文どおり取得対象に加えず、external依存として恒久表示する。内部/危険schemeは除去。style要素の閉じタグ注入を防ぐserializerとHTML境界を使う。
- 失敗CSSのlinkは本文へ残さない。台帳のunavailableStylesheetsとstyle切替導線を表示する。off選択のCSSはunattemptedとして再保存時に再検出できる。
- 同時uploadにはbatch相対path manifestを追加する。ルート外 `..`、絶対path、NUL、重複pathを拒否する。URL percent-decodingは一回、case-sensitive完全一致、曖昧なbasename推測はしない。兄弟upload完了を参照jobが待てるbatch sealing契約を持つ。
- CSS/画像/video companionをnote変換入力と別roleで受け付ける。CSSを無理にtext noteへ変換しない。一般ZIPの自動展開は追加しない。未解決相対URLは本文正本/台帳に保持し、描画時にアプリの `/api` へ誤解決させない。
- 大きなdata URIはdecode後の実サイズ・MIMEを検証してasset化する。閾値は未定（提案32KiB）。小さいものも許可済み画像のみ残す。SVG data URIも専用sanitizeを通す。

IM-05は未取得の外部画像/videoとCSS背景/fontを表示時に外部読込する仕様。現行CSPから必要なimg/media/font許可を追加するが、script/connect/frame/formは閉じる。外部style-srcは開けず埋込styleだけ。no-referrerと外部依存表示を維持する。HTTPSページのHTTP mixed contentやfont CORSで表示できない場合は取得成功と表示成功を区別する。

サーバーSSRF拒否と、利用者ブラウザからの外部直読は別の脅威境界。public hostnameの再bindや配布元の追跡をCSPだけで完全防止できない。元URL表示を保つ原文と、失敗資源の直読を全部proxy化する案は同一でない。内部literal URLは描画でも無効化し、残余リスクをManager判断に出す。

ED-11はnote.styleModeをdefault/originalで永続化し、取込時だけsanitized装飾の有無から初期判定する。後の編集で自動変更しない。preview→確認→保存を提供し、共有/exportも同じrender policyを使用する。既定CSSなしでも安全CSPと最小containmentは外さない。

## 残編集の契約

### Visual: テキストだけのpatch

HTML正本をparse5等でparseし、編集可能Text nodeへセッション内のpath/識別子と基準versionを割り当てる。script/style/commentは対象外。保存入力は `baseVersion + [{nodeId, oldText, newText}]`。サーバーが基準HTMLの該当Textだけを書き換え、その他node/属性/class/style/data-*が不変であることを検査する。クライアントのinnerHTML全置換を信用しない。[parse5](https://github.com/inikulin/parse5)

空文字TextはセッションのASTに残す。HTML serializationでは空Textの存在を表現できないので、「再読込後も同じ空Textを編集する」にはnode-map等のsidecarか安全な境界markerが必要。仕様の構造保持をbyte完全一致と混同せず、この要件を明示的に決める。source locationに対するtext範囲置換なら属性の記法も保てるが、HTML parserの補正nodeやentity、CRLF、table foster parentingを検証する。

最大の成立gateはopaque iframe内の編集操作。現行sandboxのまま親がText nodeへ触れる方式は成立しない。候補はvisual専用のtrusted bridgeを持つiframeで、allow-scriptsだけを許可し、allow-same-originは付けない。固定hashの自サービスscriptのみCSPで実行し、未信頼HTMLのscript/event等を投入前に除去する。MessageChannelまたはsource window＋nonce＋schema/size検査でtext patchだけを受け取る。originがnullだから全messageを信頼する実装は禁止。

これは閲覧用sandboxとは別の実行権限を追加する設計判断であり、無条件採用しない。Manager承認後、悪性HTMLがbridge script権限を得ないこと、DOM clobbering、偽message、paste/drop/IME/Enter/backspace/undo/cross-node selectionで構造が変わらないことを独立browser gateで確認する。shadow DOM内へ未信頼CSSを直接入れる方式を安易な代替にしない。

### WYSIWYGとモード切替

ProseMirror schema＋node viewsを第一候補とする。表/画像/code/linkを明示schemaへ入れ、未対応要素はopaque blockとしてHTML断片を保持する。node viewは安全previewとHTML編集への導線を示し、そのままアプリDOMへ未信頼styleを注入しない。未知inlineも可能な限り保持する。schema標準のparseだけに任せると未知nodeが落ちるため、事前分割とround-trip testsが必要。[ProseMirror guide](https://prosemirror.net/docs/guide/)

保存境界ではschema→HTMLをserializeして既存sanitizeへ通す。HTMLを正本とし、ProseMirror JSONを別の権威データにしない。WYSIWYGへ入る前のHTMLを版として残し、warning opt-outと設定画面での再表示を実装する。20版保持がない状態でlossy変換を先に提供しない。

モード切替はdirtyなら保存確認→成功後切替。pending/失敗/競合/回復案内中に切替を進めない。利用者単位のlocal preferenceを保存し、新規は常にWYSIWYG。空本文/編集可能Textなしはvisualを無効化する。HTML editorはsyntax highlightとparse error location/補正previewを追加する。

### 20版、autosave、競合

`NoteRevision` はimmutableのtitle/html/styleMode、version、actorId、reason、日時とasset relationを持つ。本文変更をcommitするUoW内で版を作り、20版を超えた古い版をpruneする。restoreも新しいversionの通常保存で、version番号を巻き戻さない。初期案は最新20版を記録し、現在版には「現在」を表示する。現在版を含めた数え方はUI文言とともに確定する。

autosaveは同一editor内を直列化し、保存開始snapshot/返却version/その後のtypingを分離する。失敗時のbrowser退避、権限喪失時のdownload、mode切替/離脱/取消を共通state machineで扱う。保存していない入力を自動復元やrouter.invalidateで上書きしない。

同じ利用者の複数タブは後保存を許可して通知する。別利用者の更新がbaseVersion以降に一度でもあれば競合確認する。lastActorIdだけでは他人の更新→本人更新を見逃すため、actor別最後の更新versionや変更履歴を使う。履歴prune後の不明baseは保守的に競合とする。force overwriteも「確認したserverVersion」をCAS条件にし、その後の第三者更新を無視しない。worker更新はsystem actorとして競合規則を明示し、手編集を古い結果で上書きしない。

## ゴミ箱とstorage回収

Note lifecycleはactive/trashed(deletedAt,purgeAfter)/purgingの判別状態にする。公開・共有・タグ等の設定は移動時に破棄しない。通常一覧/get/edit/assetsはtrashedを拒否し、trash専用queryだけ所有者権限で取得する。復元は同じIDと設定へ戻す。後続の共有/public grant判定も同じlifecycleを見る。

移動時はqueuedだけでなく対象のrunning jobも取消状態へ変更する。P2aの利用者batch取消ではrunning完了可だが、trashでは結果反映禁止という別契約。active job/generation、note lifecycleをcommit guardに足す。復元しても古いworkerが結果を適用できないようepochを進める。

完全削除はDBで閲覧不可のtombstone＋削除taskをcommitし、storage I/Oを後で実行する。object削除前後のcrashでもsweepが継続し、最終ack後に版/台帳/関連行を整理する。objectが実在する間の容量計上を保守的に保持する。復元不可と画面へ明示し、Google Drive backupには触れない。

30日期限sweepと「空にする」50件超の500件chunk jobは同じpurge経路を使う。対象IDのsnapshot/cursor、処理件数、再実行の冪等性を持ち、job開始後に復元されたnoteはCASで除外する。shared assetは残存note/版参照がある間は削除しない。一覧membership mutationは親client islandにoptimistic ownershipを置く。

## 依存候補と採用判断

lockfileにはsanitize-html 2.17.7系、htmlparser2 12/10、PostCSS 8.5.14、parse5 7.3、undici、sharp 0.34.5がある。多くは推移依存であり、直接importできる契約ではない。新adapterが使うものは担当packageの直接依存に宣言する。今回依存解決・追加は行っていない。

| 判断 | 提案 | 未確認 |
| --- | --- | --- |
| inline認可 | cookie経路をB0で先に実証。失敗した場合のみ短期grant | browser/CSP/CORP/Range、将来共有失効 |
| CSS AST | css-tree。既存PostCSSだけのvalue文字列判定は避ける | Node22.13/型/escape・Raw adversarial tests |
| SSRF | Node22.13 http/https custom lookup＋ipaddr.js＋明示range | real DNS/socket pin、TLS、abort、OS egress |
| SVG | DOMPurify＋現行保守DOM、SVG専用隔離adapter | Node22.13互換、悪性SVG、総RSS/decoder限界 |
| HTML AST | parse5のlocation付きparse。既存htmlparser2は収集用途も比較 | 空Text永続・補正HTML・日本語IME |
| WYSIWYG | ProseMirror＋opaque unsupported nodes | client bundle、表/画像/貼付/round-trip |
| policy閾値 | external100MB/200件、data切出32KiB、未参照7日、HTTP80/HTTPS443初期限定を候補 | 追加port許可、全面配置の許容範囲、20版の数え方 |

最短の次手はB0の小さい実browser gateと、外部参照台帳/asset relation/batch manifestの契約確定。visual bridgeと20版を同時にB1へ混ぜない。B2で外部参照を接続する前に、ネットワーク・CSS・cookie表示の各gateを合格させる。

## 検証と引き継ぎ

成功: 原文/現行code/lockfileの読み取り、公式一次資料照合、P2aコードfingerprint一致確認、git diff --check。03:39:22 JST の再計測でも同じ441files/hashを確認した。本体typecheck/lint/format/unit/integration/buildは本調査では未実行。変更がないためP2a検証を再実行していない。

未実行: 全ブラウザ成立確認、候補依存インストール、SSRF実socket/CSS/SVG/visual spike、production接続。Nodeのversioned docsとcookie draft等の資料に基づく設計提案であり、実動作保証ではない。

production session6689/PID99648、DB/原本/mailbox、Verifierブラウザを操作していない。P2aのレビュー結果を待ち、差戻し修正の委譲なしにコード変更を始めない。
