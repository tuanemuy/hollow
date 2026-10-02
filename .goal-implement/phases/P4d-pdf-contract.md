# 単件 PDF の接続準備

2026-09-20T03:42:42+09:00、P4c 独立検証中の read-only 調査。EX-01〜04/JB 全文、採用 design P4-Q2・寿命・P4b/P4c、[既報告全文](P4-export-feasibility.md)と現 source/lock、公式 API を照合した。これは正式 P4d 開始・設計採用・成立実証ではない。製品・依存・DB・runtime・browser・test/build/git・鍵は無操作。本報告だけを新規保存する。

## 結論と Manager 判断

HTML/Markdown の `export_operations` はそのまま維持し、PDF は **note 単位の実生成、要求者単位の request、24h artifact** を分ける案を推奨する。既存 snapshot/media 検証・物理 write/delete 調停・匿名 rate の意味は再利用できるが、現 row/runner の寿命は再利用できない。新 ticket 署名 port、秘密を保持しない worker 用現在認可、PDF 専用 profile/renderer、durable 物理所有の追加が必要である。

採否が必要なのは、(a) 下記分離 schema/port、(b) account job を元 session から分離する方法、(c) 専用 HMAC ticket と固定10分候補、(d) renderer/配備と入力の有限化、(e) 24h 保存 disk の配分である。すべて未採用。PDF24h=`publishedAt`、本人履歴90日=`createdAt`、現在内容一致・現在認可・元匿名入口維持は採用済みで再決議しない。

## 現 source からの差分

以下の core パスは `packages/core/src/` 基準。

| 現在の根拠 | PDF 接続で必要な差分 |
| --- | --- |
| `application/export/{ports,document}.ts` は html/markdown、account(sessionHash)/link/public authority。`usecases.ts` は120秒・生成30秒、送信後 retire | `format: pdf` を足して同じ operation を24hに延ばさない。`claimSend` は一度だけ、boot の `recover` は非 active writer 行を cleanup にするため、再取得可能な durable artifact と整合しない |
| `snapshot.ts#readExportSnapshot` は current note/owner、current refs の ready asset、title/HTML/style/media metadata/hash を読む | note ID と snapshot identity の組に PDF profile、実使用 default CSS、font digest/renderer 版・全出力設定、inline検査後digest、外部の非能動表示/noticeを含むoffline planの正規形を追加。raw session/token 入力だけの helper を durable worker に直結しない |
| `snapshot.ts#inspectExportSources` は外部 inspect-only と小 inline 実検査。`FileExportSourceReader` は bytes/SHA256 完全検査しながら data URI を出す | 外部 body fetch を追加せず、PDF 用 offline plan を作る。元媒体の hold は現方式同様必須にせず、途中消失/改変は全文不採用。renderer へ渡す前に全媒体 EOF/digest が成立していることを確認 |
| `exportDocument/plan.ts` の HTML は通常 anchor を維持し、外部媒体許可集合と http(s) 許可 CSP を持つ | PDF 用には外部能動参照なしの別 profile/CSP が必要。既存 HTML の CSP をそのまま PDF に渡して「offline」としない。未取得素材は安全な欠落説明と正当な元 URL の非能動表示にし、内部/history/draft/原本への fallback を作らない |
| `exportLifetime.ts` の最大2操作/実 task 終了待ち、`exportRunner.ts` の有限掃引、`exportRepository.ts` の予約/回収 | 実終了を待つ考え方だけ再利用。PDF の待機 request、24h ready artifact、90日履歴が短期2slotを占有しないよう別 lifetime/runner にする |
| `CoordinatedObjectStorage` の `withOwner/registerKey/canPublish/removeClaimed`、`purgeRepository.ts#capture/hasWriters/completeObject` | 新 PDF owner の実書込・配信 reader・回収を追加。現 export-operation は unbound owner で current note を見るが、新 kind はまだない。既存 note/resource writer の ownership-generation fence は緩めない |
| `exportSchema.ts` と repository は `sum(export_operations.reserved_bytes)` のみを disk 計数 | PDF 入力 staging、生成上界予約、完成24h bytes、削除負債を追加しない限り service 全体の有限 disk にはならない。別表を足すだけで既存2GiBが全出力を保護するとはいえない |
| `apps/web/app/presentation/exportHttp.node.ts` は `/s` nonce と public/link 同じ note/browser rate、厳密 Origin/Fetch Metadata | PDF も同じ cookie/hash・bucket・元 authority を使う。最初の PDF 専用 nonce 再発行や window reset は禁止。既存 HTML/MD transport を暗黙に durable へ変更しない |

## 最小 schema/port 案

責務を3表＋有限 delivery leaseへ分ける。名前・列は提案であり migration を作成していない。

| 責務 | 必要最小の正本と制約 |
| --- | --- |
| `pdf_computations` | id/noteId、固定 sourceIdentity/profile、state、generation、runtime/leaseToken/leaseUntil、deadline、artifactId、終了分類。noteId に active/stopping の一意制約、又は同等の専用一意 slot。lease切れだけで別生成を開始せず、実 child/process group 終了後に slot を解放 |
| `pdf_requests` | id、computeId/artifactId、noteId、固定 authority、expectedIdentity/profile、requestGeneration、createdAt、cancel/terminal、本人 accountId または匿名 ticketExpiresAt の排他的 shape。明示 command ID＋主体＋payload digest を一意対応し ACK不明を同要求に照会可能にする。匿名 row に本人履歴を作らない |
| `pdf_artifacts` | id/noteId、sourceIdentity/profile、storageKey、bytes/SHA/MIME/filename/notices、writing/ready/cleanup、publishedAt/expiresAt、予約と cleanup generation/lease。ready は全保存完了かつ現内容照合を同Txで通ったものだけ。期限切れ/参照がないことと実 remove 完了を分離 |
| delivery lease | artifactId/requestId/元 authority、取得期限、reader世代/実 close。短い配信だけ枠を取り、同一 file の何度もの取得が artifact を retire/延命しない。既存120秒 sender を使うなら、新しい artifact-reader purpose と cleanup の意味を分離する必要があり、現 row の key を流用して artifact を消す案は不可 |

note/artifact の物理所有参照は RESTRICT とし、purge が全実体と active reader/writer を有限回収してから対応を外す。入力staging等の複数keyもcompute所有の有限key台帳で追跡し、artifactの最終keyだけを回収して終えない。本人履歴の最小 shell は note 削除後も保持できる nullable/tombstone 対応を別に設け、PDF 全文/元媒体 manifest を90日保持する理由にしない。匿名 ticket row は固定期限後に表示不可、計算/回収が参照する最小対応だけ後処理まで残す。request の全件 JS 配列化や無制限 fanout を避け、indexed keyset と限定件数で取消/通知/掃引する。

追加 port の候補は、`PdfRequestRepository`（受理/本人又はticket照会/取消/履歴）、`PdfComputationRepository`（合流/claim/heartbeat/current-demand/finish）、`PdfArtifactRepository`（一致cache/publish/reader/cleanup）、`PdfTicketSigner`（issue/verify）、`PdfRenderer`。repository は UoW 内、外部 I/O と timer は adapter、Clock/ID は既存 port を使う。

`PdfRenderer.render(offlineDocument, profile, limits, signal)` は PDF body stream だけでなく、`cancel()` と **入力/source・PDF stream・Chrome/child の実 close を待つ `closed`** を返す契約候補とする。stream EOF 又は Promise.race の timeout だけで complete/slot解放しない。Puppeteer/Node/provider 例外は安全な失敗分類に変換し、HTML・URL・path・stderr を理由へ入れない。

## 受理から取得までの接続

1. 現入口の認可後、元 authority と現在 snapshot identity を固定する。匿名の明示 download 受理は既存 `reserveDownload(noteId,browserHash,now)` を一度予約する。認可・受理/合流の確定を同UoWで再確認し、Tx外の媒体準備をまたいだ旧認可だけで受理しない。cache hit/同計算への合流も download 操作である。poll は予約も window 延長もしない。同 command の ACK照会は新受理・再予約にしない。
2. 同 note/同 identity/profile・期限内 artifact があれば、新しい要求者の現在認可の下でその artifact に接続する。publishedAt/expiresAt は変更しない。本人名義の request と匿名 request は別で、他人の job ID/title/status を共有しない。
3. active compute が同 identity なら合流する。別 identity なら二つ目の実生成を開始せず、現在実行の収束と「最新内容で作成」の明示操作へ戻す。新 snapshot を自動予約して旧 ticket を付け替えない。初期は起動中断を安全な timeout/失敗に終わらせ、明示再試行にする小さな案が可能。自動回復する場合も固定 identity と attempt を再確認する。
4. claim →媒体/文書準備→register/write→publish の各入口で current note active/current owner active、compute generation、必要な現有効 demand を照合する。media は固定 manifest と実 bytes を照合。失効検知は有限 runner/heartbeatで abort を要求し、登録/公開/取得の同Tx fence は直ちに拒否する。数秒おきの検知を「瞬時に OS child が終了する保証」としない。
5. request 一件の取消/失効で正当な兄弟を止めない。有効 demand が0になれば stopping にし、renderer/source/sink を abort、実終了後に slot解放、未採用出力を cleanup。ここで有効とは単なる未取消 row でなく、元 authority が現在有効、匿名ならticket期限内、期待する内容が当該 compute と現在内容に一致すること。新要求追加と最後の取消は同Txで直列化し、stopping 世代へ新 demand を接続しない。
6. 内容変更なら旧結果を採用しない。現在閲覧可の本人/元ticketにだけ変更と明示再要求を案内し、閲覧不可なら共通 not found。内容不変 move は sourceIdentityを維持し、移動後 owner/current member/public/link を再判定する。旧WSの削除・元ownerの喪失だけでは移出済み note を拒否しない。
7. `publishedAt` は実 bytes/SHA と保存完了が確定し current identity を再確認したTxの Clock。PDFはそこから24h、`now >= expiresAt` で取得不可。ready cache の後に全requestが閉じても、単なる画面離脱だけで24h cacheを早期削除しない。note purge・失効・期限は別で、現在認可なしに cache を配らない。
8. poll/attachment 直前に ticket/session主体・元 authority・現在内容・artifact期限を再検査する。artifact key を署名URLだけで直接公開せず常に application を経由する。配信 reader を物理回収から保護し、切断/期限で cancel→実close→lease解放。既配信 bytes の回収や無期限の配信途中監視は保証しない。

### account と匿名の現在認可

現 `readExportSnapshot` をそのまま worker に使うには raw session/token が必要になる。新しい内部 `readForStoredAuthority` 相当を提案し、DBに保存した hash/ID/世代から current account/status、scope、sharing/grant、public identity/epochを再検査する。クライアントから渡された hash を認可にしない。

account の durable job 所有は accountId に固定し、画面離脱/通常の再ログイン後も同本人から到達できる案を推奨する。取得時は現在 verified session が同 account を示すことを必須とし、受理時 sessionHash の有効期限を90日jobや24hartifactの寿命にしない。worker は本人の現在 scope read と採用 Q2 の独立 current-public 認可を評価する。現 account helper は `canScope(read)` だけなので、そのままでは後者を満たさない。通常ログアウト時の job 継続と account 停止時の取消を明示して正式設計する必要がある。

link は元 tokenHash/linkGeneration/grantEpoch/browserHash と、必要なら現在有効な password grant を照合する。public は元 publicId/urlGeneration/accessEpoch/browserHash と現在public/current owner。元 link失効後に publicへ、元public epoch失効後に再publicへ付け替えない。匿名が後でログインしても元requestを本人jobへ変換しない。

## チケットと寿命

`NodeTokenGenerator` は32B乱数＋SHA256、`NodeTokenProtector`/`NodeShareTokenProtector` は AES-GCM envelopeであり、現 application/Node sourceに PDF の署名portはない。保護済tokenを署名ticketと呼び替えず、専用の **HMAC-SHA256サーバー署名** を候補とする。公開鍵署名を要求する意味ではなく、serverだけが発行・検証するMAC案である。

- 専用32B key ring・kid、purpose `hollow-pdf-ticket-v1`。共有key loaderの owner/0700 directory・0600 regular32B・symlink拒否・有限読取・fail closed の方式を再利用するが、招待/共有の実鍵は流用しない。署名は active kid、検証は保持旧kidも許す。旧key保持期間は発行済ticketの最大固定期限と復旧方針から決め、今回 key生成/読取/rotation は行わない。
- ticket claims は version/kid/requestId/requestGeneration/issuedAt/expiresAt を有限の固定順正規形で署名し、request正本の note/元authority/browserHashに束縛する。本文、title、token、password、storageKeyを入れない。MAC対象にpurposeとbinding digestを含め、同browser cookieとDB対応を毎回照合。改変/未知kid/別browser/期限切れ/失効は情報なし拒否。長さ上限1KiB・canonical base64url・整数時刻・32B MACを候補とし、長さを検査してからtimingSafeEqualを使う。[Node 22 crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptotimingsafeequala-b)
- **固定10分**を今回の第一候補とする。後述60秒生成候補に対して受取と一時的な画面操作の余裕を取り、放置匿名demandを有限にするため。既報告15分も採用済みではない。poll/同command再照会で延長せず、元grant等が先に失効すればticketが残っていても拒否。期限切れ後は元画面の明示新downloadで新ticketを発行し、一致cacheなら再生成しない。
- raw ticketはログ/analytics/history/通知へ保存しない。匿名の進捗と受取は既存 `/s` cookie範囲に収める（正確なrouteは正式設計時）。no-store/noindex/no-referrer/nosniffとticket経路のログ秘匿が必要。URL中ticketでもcookie照合なしのbearerにしない。既存cookieを削除/変更する初PDF移行は不要。
- 新受理の rate は既存6/browser-note・30/note・固定60秒の同じ表を使う。発行済ticketのprogressと1回の受取を初回予約で扱い、追加の明示再downloadは新予約とする案。無限の同ticket並列GETを許さず、有限 delivery claimで多重配信を制限する。key欠損時は発行不可を安全に伝え、閲覧やHTML/MDを止めない。

本人 request/job の履歴は受理 `createdAt +90日`で、元親や元attemptを終端/再取得で延命しない。artifactが期限切れでも期限内履歴には期限切れと明示再要求を出す。期限外履歴のtitle/detailと、実行・artifact対応・物理負債の最小shellは別。匿名ticket10分候補、PDF24h、本人90日を一つのexpiresAt列にしない。

## renderer の公式 API と配備候補

調査時の公式文書は Puppeteer 25.11.0、対応表は Chrome for Testing 153.0.8010.36。これは確認した版であって採用版ではない。現 `packages/core/package.json`/lockに Puppeteer/実PDF writerの直接依存はなく、PDF.jsは入力読取側のままである。最小候補は **Node adapter の直接依存 `puppeteer-core` と、対応する固定 Chrome binary/固定fontを配備物へ含める**方式。起動時downloadを行わず、ユーザーChrome/profile/cookieを使わない。coreではPuppeteer設定file/環境変数が無視されるのでexecutablePath等を明示する。[対応表](https://pptr.dev/supported-browsers)、[設定](https://pptr.dev/guides/configuration)

公式の Node 要件22.12+はrepoの22.13+と宣言上は整合する。ただしLinux Chrome for Testingの公式対象はx64の所定OSで、Macで読めたことからLinux arm64成立を推定しない。Chrome sandbox、OS library、font/license、init/reaper、read-only root＋専用private tmp、別UID、egress拒否とresource limitが運用側に必要。公式Docker例のSYS_ADMINをそのまま追加したり `--no-sandbox` で回避したりすることは提案しない。[system requirements](https://pptr.dev/guides/system-requirements)、[Docker](https://pptr.dev/guides/docker)

| 公式事実 | 接続上の判断 |
| --- | --- |
| `createBrowserContext()` は cookie/cache 非共有のcontextを作る | 専用 fresh Chrome child＋context/page。ユーザーbrowserへconnectしない。[API](https://pptr.dev/api/puppeteer.browser.createbrowsercontext) |
| `setContent(html: string, options)` はstring入力で、input streamではない | 最初の小さな候補は検証済offline HTMLをchild内で有限にmaterializeしてsetContentする方式。現media streamを無制限string/Bufferにすることは不可。上界超過を一般要件の新単件制限にするには採否が必要。[API](https://pptr.dev/api/puppeteer.page.setcontent) |
| `createPDFStream()` は `ReadableStream<Uint8Array>`、既定print CSS | bodyを `putBounded` へstreamし、全PDF配列を返す `pdf()` は使わない。screen/printはprofileで固定。[API](https://pptr.dev/api/puppeteer.page.createpdfstream) |
| 当該版sourceはfont待ちと `Page.printToPDF(ReturnAsStream)` をそれぞれtimeoutし、その後protocol streamを返す | `PDFOptions.timeout` 一個だけでは入力から出力drain/実closeまでの全期限にならない。親の共通deadline/kill監督を別に持つ。stream APIもChrome native memory上限の証明ではない。[公式source](https://raw.githubusercontent.com/puppeteer/puppeteer/puppeteer-v25.11.0/packages/puppeteer-core/src/cdp/Page.ts) |
| launchはpipe接続、AbortSignal、有限起動timeoutを持ち、`browser.process()` はchildを返す | debugging TCP portなしのpipeを候補にする。abort要求と実child/descendant終了を分ける。disconnectだけでは停止扱いにしない。[LaunchOptions](https://pptr.dev/api/puppeteer.launchoptions)、[process](https://pptr.dev/api/puppeteer.browser.process) |

offline planは元HTMLを構造/CSS policyで安全化したものに限定する。JSは文書投入前に `setJavaScriptEnabled(false)`、form/frame/object/base/meta-refresh等を除去、通常安全anchorは表示/PDFリンクとして保持するが追跡しない。任意HTTP/file/navigationは禁止し、許可するdata URIは実検査済media slotと固定fontだけ。既存HTMLの外部許可CSPより強い `default-src 'none'` と必要なdata画像/font・inline styleだけを使う。[JS API](https://pptr.dev/api/puppeteer.page.setjavascriptenabled)

request interceptionは全て拒否、cache無効、service worker bypassを防御に重ねる。data URIへのrespondは公式にno-opであり、respondへstreamを渡すAPIでもないため、これを「base64をbufferせず任意サイズを供給できる」代案にしない。ページ外/別target/background通信とfileアクセスはOS隔離/権限でも制限する。**interceptionだけでOS通信完全遮断と主張しない。**[interception](https://pptr.dev/api/puppeteer.page.setrequestinterception)、[cache](https://pptr.dev/api/puppeteer.page.setcacheenabled)、[service worker](https://pptr.dev/api/puppeteer.page.setbypassserviceworker)、[respond](https://pptr.dev/api/puppeteer.httprequest.respond)、[response body型](https://pptr.dev/api/puppeteer.responseforrequest)

## 未採用の数値・disk判断

以下は小さく開始するための運用候補であり、要件の単件/全体制限ではない。代表最大入力での実測なしに十分性を保証しない。

| 対象 | 候補と理由・残る判断 |
| --- | --- |
| renderer実行 | Node全体1生成、別note待機列なし、同noteの同内容要求は合流。Chrome多重native memoryをまず抑える候補。2件の既存HTML/MD slotとは別で、同時負荷の配備容量確認が必要 |
| deadline | claimから入力/media/起動/生成/output保存まで共通60秒。launch10秒、setContent10秒、print30秒をその残時間以下に切る。終了grace5秒→kill後5秒を候補とし、実終了不明なら新生成slotを解放せず運用異常。lease20秒/heartbeat5秒候補も、lease失効だけで二重生成を許さない |
| メモリ/CPU | 専用child＋Chrome全process groupに1GiBのOS上限、CPU1相当を初期候補。Node V8 heapは256MiB候補。親プロセス、既存worker、Chrome native、IPC/string複製を別計数し、V8 heapだけで1GiBを保証しない |
| 入力/output | setContent方式の展開済HTML/data URI入力64MiB、PDF出力256MiBを初期検討値とする。800KiB本文でも画像で超えるため、採用済み単件上限とはしない。超過は部分PDF成功にせず資源/配備上限として説明する。EXの「閲覧可ならdownload可」と緊張する場合、採用せず配備拡大又は別の有限素材供給方式を再設計する判断が必要。ZIPの1GBを流用しない |
| appearance | A4縦/余白10mm、screen CSS、背景あり、scale1、header/footerなし、固定viewport1280×900/DPR1、固定locale/timezone。日本語を含むNoto Sans CJK JP等の同梱font＋固定fallbackとdigestを候補にする。default/original styleを尊重し、ページサイズやfont差による改頁/欠落は実生成で確認。`waitForFonts:true` と有限期限を併用する。[PDFOptions](https://pptr.dev/api/puppeteer.pdfoptions) |

現2GiBは短期 `export_operations` の予約枠で、24h保存契約の容量ではない。共通物理disk上で独立した二つの「2GiB」を各々満杯まで許すのは危険である。推奨案は、既存短期枠を維持しつつPDF保持/中間物の枠とservice全体上界を明示し、`短期予約＋PDF入力staging＋PDF生成予約＋ready実bytes＋cleanup debt＋配備temp上界` を共通admissionで照合すること。完成時は実byteに縮約できても、remove前の失効/期限切れ/debtを計数から外さない。配信は同じfileの複製を作らなければ二重disk予約不要だがreader leaseは必要。

単純に既存2GiBの中に24h保存を合算する案も安全にはできるが、PDF cacheが短期HTML/MD受付を保持期限まで圧迫し、回収負債があれば24hを超えて影響する。新規失敗の説明は「サービスの書き出し領域を使用中。回収後又は管理者の領域調整後に再操作」で、ユーザー使用量/1GB超過/再試行すれば必ず直るとは言わない。**空きを作るため期限内PDFを早期evictしたり24hを短縮したりしない。** PDF保存枠のGiB値と短期の保護配分は要件から決まらず、今回は未決。採用まで別の任意合計容量を確定しない。

## 未成立の接続と停止

実rendererの起動・実PDF・font/画像/改頁・悪性CSS・egress/file拒否・abort/実child終了・再起動時の孤児process・spool競合は未検証。特に現storageの旧Node PID不在による回復だけでは、旧Nodeが残したChrome子の不在を証明しない。専用process group/cgroupの終了確認とbootの保留/回収契約が必要である。既存PDF読取ライブラリで仮に開けるだけでは成立確認にならない。

将来ZIPは同じ note/sourceIdentity/profile のcompute/artifactを内部consumerとして参照できる境界だけ残す。ZIP子の認可/取消を匿名ticketへ偽装せず、必要な内部holdは単件24h取得権限を延ばさない。ZIP schema/1GB計数/組立の詳細化、Google/Drive、外部PDFサービスは今回行わない。

この文書は既存条件の接続上の不足・採用前案を示すもので、新受入gateや実装phaseを追加しない。Managerが採否と正式委譲を行う。全文確認後、全操作を停止する。
