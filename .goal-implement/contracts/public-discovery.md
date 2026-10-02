# P4c の公開・発見とプロフィール

公開workerの説明文字列境界はdomainの2000 Unicode code pointsを損失なく含む最大4000 UTF-16 unitsとし、domain上限や表示を狭めない。公開cursorはscope/正規化query/sorted tag keys/zone/from/untilの既存canonical条件identityをdomain-separated SHA-256の固定64hexへまとめ、version付きstrict形式で照合する。条件全文をcursorへ複写せず、旧形式・別scope/条件・異なるidentityを明示拒否する。cursorを認可根拠にせず、URL32768/response cursor16384の有限上限を維持する。

本人/memberの外部表示バナーは、HTTPが重複なしsession cookieから生成した内部専用viewerSessionHashを公開list requestへ渡して判定する。URL入力や公開DTO/HTML/logへhashを出さない。worker内で現在Clock・verified account・session期限と現本人/memberを照合し、viewer導線だけを返す。無効/失効/重複cookieはviewerなし、公開結果集合は変えない。二つのsnapshotで認可元も再照合し、内部WS ID導線は現memberにだけ返す。設定画面のreadonly/owner制御は変えず、親SSRの追加I/Oを設けない。

WorkspacePublicationRepository.resolve(slug)はactiveかつpagePublicの一意な現slugからworkspaceId/settingsVersion/publicationVersionを返す。公開WS iconはこの解決と既存repoの現在pointer/世代を組み合わせ、storage読取後にも同じ選択を確認する。公開profile iconも現handleとcurrent pointerを再照合する。一般WS認可を緩めず、通常媒体GETを検索rateへ混ぜない。

PublicDiscoveryExecution.execute(request, signal)を公開検索の実行portとし、listのall/handle/WS slugとquery/tag/updated範囲/cursor、sitemap index/500件leafを判別requestにする。Node childの有限snapshotと採用前の現在公開・所有・内容/projection版・profile/handle版・WS公開設定/slug/activeの照合を受付から同じ3秒内で行う。親はcard/profile/WS DTOとcanonicalを追加I/Oなしで同期SSRし、本文全体や秘密を検索結果へ返さない。既存app readerの認証と独立実行枠を変更せず、公開rateを実行前に予約する。

ObjectOperationRepositoryのcanPublish/registerKeyは現在Dateを必須とし、coordinated storageが各呼出時の注入Clock.nowを渡す。profile-icon-uploadは現在session・確認済みaccount・profile版・期限をregister/publishごとに照合し、登録時刻の使い回しで後続の期限切れを許さない。既存owner分岐の意味は変えず、beginWriteは既存の現在時刻入力を使う。

[公開・発見の接続案](../phases/P4c-contract.md)を次の補足で採用する。実装着手はP4b独立受入後とし、この設計採用だけで次フェーズを開始しない。対象はAC-07の表示名/handle/bio/icon、WSページ公開設定、単件public変更、公開本文/媒体/metadata、現在所有の個人/WS公開ページ、ページ内/横断検索、sitemap、public HTML/Markdown。PDF/ZIP・一括public変更・AC-09本体・Google/Drive/LLMは残条件とする。

公開identity、個人公開profile、個人icon物理所有、WSページ設定、公開検索rateの五責務を新schemaへ分離する。既存表示名と共有正本を二重化せず、新migrationだけを追加する。未使用の将来列/operationを作らず、portと新schemaの具体差分を実装担当が報告する。public identity必須の整合性はDB境界でも閉じ、既存の異常rowを架空のidentity/handleで隠さない。

canonicalは `/p/{publicId}/{urlGeneration}`、公開profileは `/@{handle}`、WSは `/w/{slug}`、横断検索は `/discover` とする。publicIdは既存ID portから初回public時だけ発行し、URL世代は1から始める。今回世代を増やす操作は作らない。初回identity・必要な限定token・共有変更は同Txで確定し、既発行tokenは維持する。現在編集権限・本文・所有scopeのhandle/slug・確認版を再検査し、password解除確認とgrant失効を同Txにする。

短期public exportの失効はURL世代とは別のaccess epochで表す。publicからprivate/linkへ変えると旧operationを失効させ、再publicで復活させない。handle/slug変更、SH-04、同内容移動ではこのepochを進めない。匿名read/取得は現在の公開状態・lifecycle・現在ownerを確認し、URLやepochだけを閲覧権限にしない。

handleはtrim後ASCII小文字化、3〜63文字、先頭末尾英数字・内部ハイフンとする。予約語はsettings/api/loginを含む静的namespaceの明示集合との完全一致で拒否する。入力中の最大3候補は助言であり予約ではなく、確定Txのunique/OCCを正本とする。設定済みhandleの解除は本人所有のpublic noteが0件の場合だけ確認して許す。trash中のpublic noteも除外せず、勝手な一括非公開化をしない。退会後のhandle解放はP5のaccount/profile確定削除に接続し、今回退会完了とは扱わない。

bioはtrim後最大300 Unicode code pointsのplain text、改行を許しNUL等の不要な制御文字を拒否する。表示名はP4aの規則/OCCを維持し、名前・handle・bioの合成保存はnameVersion/profileVersionを同Txで確認して部分保存しない。iconは別操作とし、未送信フォームを保存済みにしない。ACK不明、actor ABA、確認後の競合、設定からの安全な戻りと未保存入力保持を共通方針に合わせる。

個人iconは既存画像処理の5MiB入力・PNG/JPEG/WebP・512px以下static WebP・512KiB出力・30秒を使う。WSの認可やrowは流用せず、個人5GiBへ予約・ready・cleanup debtを課算する。専用writer/世代とcurrent pointerを分け、失敗で旧iconを失わず、差替/削除で旧URLを直ちに拒否する。実close/removeと同世代の確定前に課算を解放しない。account FKはRESTRICTとし、将来の退会でも未回収物をcascadeで消さない。公開iconは現在handle/profile/current pointerで再認可し、旧handleの再取得者へ古いiconを割り当てない。

WSページ設定は現在ownerだけがsettingsVersion/publicationVersionを照合して変更する。pagePublicとnote visibilityは独立し、非公開化でnoteを変更しない。公開中のslug解除は先にページ非公開化を求め、slug変更はページ公開を保って旧対象へ転送しない。WS非公開時はpublic noteの親/本文/検索/metadataへWS名・説明・icon・memberや公開ページリンクを追加漏洩しない。削除受理後はactive fenceで直ちに拒否し、設定rowは後続回収へ接続する。

公開本文は独立した `/p/{id}/{generation}/document` の全文SSRをiframe srcで表示し、親にはtitle/著者/tag/更新日時/説明/代表画像/canonicalと「本文を別画面で開く」通常anchorを置く。親・子とも同じ現在認可を使い、子のcanonicalは親とする。通常browserとcrawlerへ同じ情報を返し、bot専用本文や隠しSEO本文は作らない。CSSを親へ持ち出さず、iframe sandboxと直接取得時のCSPでscript/object/base/formを抑止する。HTTPの親metadata・子全文・anchor・canonical・失効を実検証し、親への本文index統合や外部検索の実掲載は未検証として分ける。[GoogleのSSR/リンク説明](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)と[canonicalの説明](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)は、この構成での掲載保証ではない。

publicは現在状態でのみindex対象とし、private/link/purging/削除ownerは共通404、現在publicのtrashだけ情報なし410、復元は同URLとする。`/s/`はpublic noteの現tokenでもnoindexを維持し、検索結果/作業一覧/設定もnoindexとする。robots拒否を認可やnoindexの代わりにしない。当初はno-storeを使い、配信済みbytes・外部cacheの回収や即時インデックス削除を保証しない。代表画像は現在取得済みの安全な画像または既定画像とし、新しい外部fetchを行わない。

匿名検索は認証付きapp readerを緩めず、別の判別request/DTOでcurrent-publicをLIMIT/count/facet/snippet/画像より先にSQLへ適用する。現在所有の個人/WS一覧とcreatorを区別する。語規則は既存2文字以上・日本語部分一致・英数字語頭・混合AND、タグは正規化name key、期間はupdatedAtのIANA zone付き半開区間を使う。最大50件/有限cursor、一覧は更新降順、検索は関連度とIDで安定化する。共通deadline内の採用前再照合で公開解除/本文変更を検出し、失敗を0件へ変換しない。

公開検索用に実行枠1・待機16・受付から3秒を設け、既存app枠とは別にNode全体最大2processを許す。timeout/満杯は503と再試行導線を返し、実close前に枠を再利用しない。検索rateは30/browserと300/globalの固定60秒、成功返金/拒否での延長なし、100行/60秒pruneとする。初期一覧/ページ検索も対象、sitemapはglobalだけを使い、通常note/媒体GETとは分ける。cookie破棄の人物追跡や大規模SLOを保証せず、未知のproxy headerでIPを信頼しない。

sitemapはrootのindexと種別ごと500 URLのleafを有限SQL/deadlineで作り、note canonical・現handle profile・公開WSだけを列挙する。500は処理単位であり総公開件数の上限ではない。子document・token・旧名前・非公開/削除/trashを含めず、lastmodは実時刻を得られる対象だけに付ける。[protocol](https://www.sitemaps.org/protocol.html)の件数/bytes上界以下で応答を制限し、超過を切れた成功XMLや完全一覧として返さない。indexとleaf間の原子的な全catalogue snapshotは保証せず、各応答の現在公開性と有限性を確かめる。最大offset/巨大indexの未測定を小fixture成功へ拡大しない。

public exportは元public ID/URL世代/access epoch/browserに束縛し、現在認可とP4b内容identityを別々に再照合する。既存2操作slot・30秒/120秒・service spool/実close/回収を維持し、account/link authorityをpublicへ付け替えない。public/linkの6/browser-note・30/note窓を共用する。新root cookie・2bucket・cookie bridgeは導入しない。

[nonce入口の追補](../phases/P4c-contract.md#追補-download-nonce-の移行を不要にする最小入口)を採用する。canonicalのダウンロード導線から `/s/export-public/{id}/{generation}` の形式選択GETへ進み、明示形式選択POST→成功時303一回→同配下operation GETで取得する。生成後の追加clickは作らない。既存 `/s` nonceは値/Path/属性を変えず再発行せず、同hash/同noteの既存rateを一度だけ予約する。publicではnonceをrate/operation bindingだけに用い、password grantを参照・作成・延長しない。準備GETにも現在公開とmetadata採用前の再照合を適用し、失効時は情報もnonceも新発行しない。

nonceなしの初回発行は形式選択のtop-level GETで、Fetch-Mode=navigate/Dest=documentかつSite=same-origin又はnoneに限定する。欠落/不整合では無条件発行や自動redirectをせず説明と固定canonicalへのlinkを返す。POSTは既存Origin一致又はnull＋厳密same-origin/navigate/documentの例外だけを許し、GETのnoneをPOSTへ広げない。新入口は既存43文字token routeと厳密に分け、余分なsuffix/入力やmethodを拒否する。操作頁/取得はnoindex/no-store/no-referrer/nosniff、戻り先は検証済みcanonicalだけとする。

準備GETでoperation/slotを確保しない。初回並行Set-CookieはPOSTが実際に送ったnonceへ束縛し、後でcookieが変わっても旧operationを再bindせず404/期限内回収へ進める。cookie不足/不明応答の自動POSTはなく、重複同名nonceも曖昧な先頭選択をせず拒否する。既存窓6回後の初public、5回→public1回→link拒否、最後の1枠の並行、旧link operation保持、cookie不受理/初回raceを有限対で確かめる。cookie削除を跨ぐ物理browserの永久同定は保証せず、note全体枠と有限実行を維持する。
