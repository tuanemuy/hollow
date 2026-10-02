# P4d: Node単件PDF製品接続案

2026-09-20、P4d-0独立検証と並行したread-only準備。EX/JB全文、design P4-Q2、P4d-pdf-contract全文、現製品sourceを照合した。本文の追加port/schema/数値/phase名はすべてManager採否前。P4d-0のproof/scripts/reportは再読・再実行・変更していない。今回の変更先はこの文書だけで、製品・依存・runtime・DB・browser・鍵・build/test/gitは無操作。

## 推奨する最小構成

現HTML/Markdown短期操作を保持し、PDFを別のdurable要求・計算・artifact・deliveryとして追加する。最初に小さい資源供給/監督packaging実験を行い、成立後に本人の実PDF縦slice、次に限定/公開の署名ticket縦sliceへ進む。24h artifactを既存120秒operationに偽装せず、PDF未提供時もHTML/Markdownを使えるままにする。

EX-04の「閲覧できればdownload可」は追加の閲覧専用権限を設けないという条件で、無限RAMや無故障の保証ではない。EX-01はPDF生成失敗と理由/再試行を明記する。したがって実サービスの一時混雑・設定容量不足・deadline・renderer故障は説明可能な失敗として扱える。ただし任意の64MiB展開HTML/256MiB PDFや1GiB nativeを新業務上限として加え、合法noteを内容不正/無権限にする案は推奨しない。

採用が必要な点は次の5つに絞る。

1. binary pack＋private allowlist local channelによる素材供給を先行実験すること。
2. durable本人要求を元sessionから分離し、JB外部取消とQ2の現在publicによる新取得を区別すること。
3. request/compute/artifact/deliveryの4責務と、実close前に世代/予約を解放しない永続所有。
4. POSIX監督の明示配備前提、PDF保持/作業領域の設定可能service枠と短期HTML/MD用枠の保護。
5. 署名ticketの具体形式/固定期限、匿名rateの予約単位、no-JS進捗から自動native取得までのHTTP契約。

## 現sourceから確認した制約

以下のcore pathは `packages/core/src/` 基準。

| 根拠 | 接続判断 |
| --- | --- |
| `application/export/ports.ts` のaccount authorityはaccountId＋sessionHash | これを長寿命jobへ流用しない。現短期HTML/MDの同session契約は不変更 |
| `application/export/usecases.ts` は120秒/1回claimSend/送信後retire、repository recoverは非active writerをcleanup | PDF24h保持・再取得とは別repo/runnerが必要 |
| `application/export/source.ts`、`adapters/node/exportSourceReader.ts` はdata URI prefix/base64を返す | binary raw stream portを別途追加する。既存HTML/MD consumerの型や出力を変えない |
| `application/export/snapshot.ts` はcurrent ready/ref媒体とsource bytes/hashを選ぶ | 選択/identityの純粋部分は再利用可能。raw token/sessionをworkerへ再投入する認可部分は分離 |
| `domain/note/entity.ts` | 正本本文800KiB、title200 code points。AST/HTML文字列はこの既存境界と変換による入力由来上界を使う |
| `domain/asset/entity.ts`、`domain/reference/entity.ts` | 画像20MiB/動画200MiB。参照取込1jobは200件/100MiB、CSS1MiB。これをnote全体の媒体数/総量の新制限にしない |
| `application/reference/processJob.ts` | 検査済み32KiB以下の小data URI画像はassetなしで正本へ保存される。stylesheetは安全化され本文へ反映、その他は実検査してasset化。未取得font/CSSをPDF時に新fetchする根拠はない |
| `domain/workspace/entity.ts` | 5GiB個人/20GiB WSは保存容量であり、PDFの新容量ではない。800KiB本文が多数の既存媒体を参照できるため展開base6464MiB十分性は導けない |
| `objectOperationRepository.ts`、`coordinatedObjectStorage.ts` | 現recoverWritesは旧runtimeをinactive化する。旧Node PID不在だけで旧Chrome/素材server不在とはならず、PDF監督の収束を先に確認する必要がある |
| `apps/web/app/server.node.ts`、`scripts/listen.node.ts` | HTTP停止→各lifetime/runner停止→DB closeの既存順序へ組込む。Python/Chromeの製品配備保証は現在ない。既存 `Dockerfile.gcp` をNode PDFの検証済みimageとは扱わない |

## 入力/font/mediaを有限に供給する案

### 比較と推奨

| 方式 | 成立性/残点 | 判断 |
| --- | --- | --- |
| 全媒体data URIを一つのsetContent stringへ埋込 | 小probeで実PDFは作れたが、base64膨張・JS文字列・IPC・Chromeの複製が増える。既存合法の画像数枚だけで任意64MiBを超え得る | 小probeの基準として保持、製品の一般経路にはしない |
| interceptionのrespondで素材供給 | `ResponseForRequest.body` はstring/Uint8Arrayでstreamではなく、data URI respondはno-op。全media無制限streamの代案ではない | 固定小response以外には選ばない |
| 検証済みbinary packを専用local channelからstream | 本文/manifestとbinaryを分離し、full base64 stringを作らない。HTTPは原URLの取得ではなく自分の不変packの有限読取だけ | 最小の製品候補。最初の追加実験が必要 |

Puppeteerのbody型とdata URI no-opは[公式ResponseForRequest](https://pptr.dev/api/puppeteer.responseforrequest)、[respond](https://pptr.dev/api/puppeteer.httprequest.respond)を確認した。local channelは今回未実装/未実測の設計案であり、P4d-0の「全request拒否」がそのまま成立するとは言わない。

### 推奨データ経路

1. 短いUoWで現在認可とsource snapshotを固定。body/style/titleとcurrent ready assetのID/MIME/bytes/SHA、正当小inline画像の検査後bytes/SHAを得る。媒体集合の大きさは正本800KiB由来の有限数で、任意200件という新媒体総数capを足さない。既採用inline200の検査境界は別扱い。
2. `PdfSourceReader.openVerified(source, signal)` はNode型/pathを外へ出さないbinary stream＋実close待機を返す。現在のFileExportSourceReaderと同じO_NOFOLLOW/regular-file/size/hash/abort規則を適用する。元media holdは作らず、途中消失/改変は全出力不採用。HTML/MD用data URI readerは保持する。
3. compute所有の単一packへ、重複sourceを一度だけ逐次保存する。indexはopaque slot ID、offset/length/MIME/SHAだけ。全bytes/SHAが一致しpack sealが完了してからChromeへ渡す。正本本文の媒体URLをslot URLへ変換し、本文800KiB由来のAST/HTMLとindexだけを有限materializeする。複数画像を全base64配列へしない。
4. 固定fontは配備時にdigest/ライセンスを固定したfileから同じchannelで供給する。Noto＋code等のfallbackもprofileに含め、OS Menlo任せにしない。request時download・ユーザーfont directory探索・原URL fallbackはしない。subsetは別実験なしに採用しない。
5. 専用renderer childが127.0.0.1の一時portだけにserverをbindし、固定document/fontとsealed packの登録slotだけを返す。絶対pathやstorageKeyをURLへ出さない。Host/method/path/compute世代を厳密検査、redirect/Cookie/Set-Cookie/任意filesystem path解決を禁止する。推測不能なcompute内秘密headerをCDPの許可requestにだけ付与し、外部request・ログ・PDF本文へ渡さない。app session/share cookieは一切使わない。
6. document投入前JS無効/CSP default none、script/frame/object/form/base/navigation/SW/cacheを遮断。img/font/style資源はこのexact originと検証済みslotだけ。interceptionはexact許可集合以外を拒否する。CSSの外部URL/未取得stylesheetは復活させない。通常利用者anchorは安全表示/PDF linkとして保持するが生成中に追跡しない。rendererが付加したlocal URL/秘密headerが成果物へ残らないことは合成markerのPDF byte/annotation検査で確認する。
7. pack読取は64KiB目安のbackpressure、同時reader数/総供給bytes/再読回数は実rendererの要求特性を先行実験して設定する。無制限retry/Range/二重取得を許さず、必要なRangeがある場合だけmanifest範囲内に実装する。countは業務上の媒体数制限ではなく、一操作の有限資源境界。期限/reader拒否時は部分PDF成功にしない。
8. document/font/imageのload完了を有限確認してから印刷する。networkidleやページ数推定だけを成功判定にしない。静的PDFに動画再生を実装せず、現在posterがあれば静止表示、なければ動画を含む旨を明記する案を採否へ返す。動画200MiBを無意味にbase64埋込/全部decodeする方式を既定にしない。
9. PDFはCDP明示chunk read→所有sinkへ逐次出力。全bytes/digest/実close後に現在内容と有効demandを再照合しpublish。期限内のready cacheは現在identity一致の場合だけ使う。source identityにはnote ID、実出力title/filename/body/style、全使用媒体digestとtransform profile/default CSS/font集合/renderer版/ページ設定を含め、現在owner/versionだけでは変えない。

local channelは一般外部通信の許可ではない。Linuxでnetwork namespaceのloopbackだけ等を使う案は未検証。macOSのapplication-layer allowlist成功とOS全egress拒否を区別する。失敗したら原URL取得/hostfile/open networkへfallbackしない。

最初の小実験は、固定font file＋小PNG/SVG＋複数slotの実PDF全page目視、zero app cookie、外部/file/別path/別世代/headerなし拒否、部分read/改変/abort時のserver socket/FD/Chrome全close、local付加識別子の成果物非残存。既存probeを再設計せず新proofで行う。最大画像/多数媒体/巨大fixtureは先に測定予算を決め、最初の小実験を最大規模成功としない。

## authorityとjob所有の分離

提案する保存authorityは判別unionとし、accountはaccountIdだけ、linkはtokenHash/browserHash/linkGeneration/grantEpoch、publicはpublicId/urlGeneration/accessEpoch/browserHashを保存する。raw token/password/session/ticketをrowやjob DTOへ保存しない。入力時のsession/ticket検証はtransportから内部authorityへ変換する境界だけで行う。

| 場面 | 推奨挙動 |
| --- | --- |
| 本人が通常logout/画面離脱 | requestの所有はaccountIdのまま、元session期限を生成期限にしない。workerはverified account/current note/scope又は独立current-publicを再認可。現在の本人sessionを使う再ログイン後に履歴/取得可能 |
| account削除/停止 | 有効demandなし、未終端要求取消、本人履歴へsignin不可。実AC-09削除実装は後続だがcurrent status拒否と取消portを用意する |
| member除名/脱退/降格 | JB-03どおり旧未終端要求は取消す。viewerへ降格しても単なるcanRead trueを理由に旧jobを復活させない。一方、現在viewer/publicで読めるなら新しい明示downloadは許可し、一致cacheを使用可能。永久blacklistは作らない |
| 完了済み本人jobからの取得 | 同本人の現session＋現在のscope read又は独立current-public＋内容一致が必要。過去membership喪失だけを永久拒否理由にしない。失効情報の表示は元job最小metadataに限る |
| link/private化/password更新/token再発行 | 元link世代/grantと現browserを再検証。publicに変わっていても元link要求を付け替えない。ticket未期限でも拒否 |
| public→private→public | accessEpochが変わるので元public要求/ticketは復活しない。同identityのready artifactは新しい有効要求から取得できるが、元要求の認可復活ではない |
| 内容不変move | compute/artifact identityを変えず、現在所有noteを基準に認可/削除判定。旧WS削除で移出済みnoteのPDFを回収しない |
| trash/restore/purge | trash時は要求/取得を拒否し未終端を取消。restoreしても取消requestは復活しない。保持中の一致artifactがあれば新操作で使用可。purge/現WS削除は期限前でも実体回収を行う |

降格/除名と旧running取消はJBから、完了jobの独立current-public取得はQ2から読み分けた推奨解釈。正式採用が必要。どちらもaccountの元sessionHashや過去ロールを現在の認可根拠にはしない。

外部取消は現在readの再判定だけに依存しない。既存workspaceの降格/除名commitに、該当accountかつ現在所有scopeの未終端PDF要求を取消すrepo処理を同Txで接続する。再参加/昇格で取消済み要求を再び有効にしない。履歴全件を読んで更新せずactiveの専用索引を用いる。大量active要求の同Tx更新時間が境界内に収まらない場合は、遅いoutbox掃引だけへ落とさず、同Txの永続取消fence＋有限後処理へ変更する必要があり、その最小追加正本は実装前に再提案する。

worker内部の `readForStoredPdfAuthority` とHTTP本人/匿名の `resolvePdfActor` を分ける。前者を外部APIにせず、scope/共有/grant/current-ownerをClock.nowで検査する。共通snapshotの純粋projectionは抽出しても、既存HTML/MDの同session/同authority比較を弱めない。

## 最小永続構造・typed ports案

4責務を新migrationで追加する。既存 `export_operations` のformat/120秒/送信終了cleanupは保持する。名称やSQL詳細は正式委譲で固定する。

| 正本 | 最小内容/不変条件 |
| --- | --- |
| `pdf_computations` | noteId/sourceIdentity/profile、状態、実行世代/lease/監督owner、固定deadline、inputPack/workspace所有、作業予約/cleanup debt、artifact参照。note単位のactive/stopping一意slot。lease切れだけで再生成を許さない |
| `pdf_requests` | actor union、commandId/payload digest、compute/artifact参照、受理日時、本人90日又は匿名ticket期限、取消/失効・retry元。本人所有を計算共有と分離。terminal jobは本文/manifestを90日複製しない |
| `pdf_artifacts` | noteId/contentIdentity/profile、storage key/bytes/SHA/filename/MIME/notices、writing/ready/cleanup、publishedAt/expiresAt、予約/cleanup lease。readyの期限はpublishから固定24h、再取得/再ticketで延長なし |
| `pdf_deliveries` | request/artifact/元authority/世代、固定短期期限、reader claim/実close/cleanup状態。同requestの無制限多重readerを拒否、終了してもartifactはretireしない |

媒体毎の追加DB rowは必須にしない案。inputPack一つ＋compute private workspace一つ＋artifact一つという固定種類の所有を追跡し、pack内slot indexは入力由来の有限manifestにする。Chrome profile/tempのdirectoryは専用workspace portが追跡し、symlinkを辿らず有限分割で回収する。directoryの負債も実removeまで残す。単純なpath JSON/期限だけで削除成功にしない。もしこの固定所有形で回収/予約が表現できなければ、汎用全将来schemaへ広げず専用resource tableの必要箇所だけ再提案する。

portsは `PdfRequestRepository`（受理/本人keyset/同command照会/取消）、`PdfComputationRepository`（join/claim/demand/singleflight/finish）、`PdfArtifactRepository`（一致cache/publish/cleanup）、`PdfDeliveryRepository`（現在認可付きclaim/close）、`PdfSourceReader`、`PdfWorkspace`、`PdfRendererSupervisor`、`PdfTicketSigner` を候補とする。repoはUoW内、I/O/crypto/processはadapter。rendererはprofile IDとsealed入力handleだけを受け、結果stream＋abort＋**実close Promise**を返す。path/ChildProcess/Buffer/provider例外をapplicationへ漏らさない。

note/artifactの物理所有はRESTRICT相当でpurgeと協調。本人履歴はnote削除後の最小shellを許し、元ID/日時/理由だけを維持する。新writer kindはcomputeとdeliveryを現在note/独自世代でguardし、既存bound note writerのownershipGeneration fenceを緩めない。

重要な実装制約: `CoordinatedObjectStorage` を別PDF directoryへ新規instantiateするだけの案は不可。現 `recoverWrites(runtime)` は全旧runtime writeをinactive化するため、既存storageのactive writerと共存を壊し得る。既存同一所有resourceへ新kindを接続するか、PDF workspace専用の回収正本/ownerを明示的に分離し、既存recoverWritesがPDFの旧Chromeを終了済みと扱う前に監督reconciliationを置く。

## singleflight・demand・保持と有限読取

受理は現在認可→command同内容照合→匿名rate予約→cache又は同identity computeへjoinを同UoWで確定する。同commandのACK照会は新rate予約/新要求にしない。noteのactive computeが別identityなら旧結果を採用せず、収束/更新を説明して最新内容での明示新要求へ戻す。旧ticketを自動付替えしない。

実生成は最初はservice全体1枠候補、別noteの待機列は設けず明示busyにする。これは未採用運用案。同note/同identityへの合流は新Chromeを作らない。受理済み本人要求を「画面を閉じた」で取消さず、匿名は固定ticket期限内だけdemandとして数える。

有効demandは未取消・未期限・現在account/元link/public認可・current identity一致の要求。repoがindexed predicate/EXISTSで判定できる部分はSQLへ置き、残検証はkeyset pageと同deadlineを使う。全requestをJS配列へ読み、先頭50だけ不許可だったから需要0と判定することはしない。有限走査で結論が出ない間はstopping/終了を断定せず次cursorへ継続し、publish直前は少なくとも一つの有効demandを同Txで確定する。新joinと最後の取消を直列化し、stopping世代へjoinしない。

要求1件の取消は兄弟を止めない。最後の有効demandが消えたらabort→実close→slot解放→中間物回収。既にreadyのartifactは需要0/画面離脱だけでは24h前にevictしない。生成中の入力変化は不採用、保持中の不一致artifactは取得不可とし、新要求で現在内容から作成する。

本人jobはcreatedAt＋90日、artifactはpublishedAt＋24h、匿名ticketは別固定短期期限、deliveryは固定短期期限。now>=期限で不可。pruneは終了時刻で延長せず、処理/物理負債の最小shellだけを別寿命で残す。本人履歴は(accountId,createdAt,id) keyset、active countはSQL集計、描画page50/掃引100等は初期実装値候補であって履歴件数上限にしない。compute終端を全requestへ一括fanout更新せず、state projection/有限更新を使う。他人のtitle/job ID/進捗は共有しない。

## ticket・HTTP・UI案

署名は専用HMAC-SHA256 key ring、固定10分、claims version/kid/requestId/requestGeneration/iat/exp＋元authority/browser binding digest、最大1KiB等の前案を候補として維持するが未採用。招待/共有key流用なし。key不在はPDF匿名発行だけ安全に運用失敗とし、閲覧・HTML/MDを停止しない。

限定/publicは既存 `/s` の `hollow_share_browser` を使い、公開PDFも `/s/export-public/{id}/{generation}` の形式選択から進む。root cookie/別nonce/二bucket/bridgeを復活させない。進捗/取得は `/s/pdf/...` のreserved route候補とし現token routeとの衝突を避ける。ticketだけのbearerにはせず、各poll/取得で元authorityと現browserを照合。pollで期限/rateを延長しない。

新明示downloadは現6/browser-note＋30/note固定60秒の同じbucketへ一度予約する案。同commandの回復は再予約しない。新ticket/期限切れ後のやり直しは新downloadとして予約し、artifact一致なら再生成不要。progressは別に有限頻度/同時readを制限するが、新business rateを無断追加しない。既存の再発行非reset/同nonce最終枠並行を保持する。

本人は短い受理POST→本人request ID→進捗UI→ready時のnative取得。元sessionが変わっても同accountの現sessionで取得可能。匿名は明示POST→303進捗GET→ready時native attachmentへ遷移。no-JSは有限Refresh又は明示更新導線を使う候補で、進捗GETはPOSTを再実行しない。readyで元画面のdirty editorを遷移破棄しない取得方式を既存UIから継承する。ticket経路/redirect/例外ログを秘匿し、no-store/no-referrer/noindex/nosniff、安全filename/MIME/Content-Dispositionを維持する。

no-JSの第一候補はticket固定期限までの有限Refresh付き進捗GETとし、readyならattachment GETへ303、終端失敗/期限ならRefreshを停止する。明示更新は通信失敗時の回復導線で、生成完了後の追加クリックを正常系の必須手順にはしない。自動取得のbrowser動作・RefreshとCSP/履歴/戻るの組合せはP4d-3の実native対が必要で、現在実証済みとはしない。

UIは受理済みと保存完了を分け、actor ABA/note/操作epochを再照合。ACK不明は同command/requestのGET照会で確認し、新ID自動POST/現在状態からの成功推測なし。本人ticker/jobsは既存通知と共存、初回terminalを新完了transition扱いしない。生成失敗は理由＋明示再試行、expired/staleは元操作のやり直し。retryは同じ形式/profile設定と現在snapshotで新attemptを作り、旧artifactへ無言で付替えない。

## service容量と監督配備

短期HTML/MDの既存2slot/2GiB予約をPDF24h cacheで占有しない。推奨は既存短期枠を保護し、PDF作業/保持枠と全service物理枠を設定で分離すること。共有diskなら `短期予約＋sealed input/workspace予約＋生成output予約＋ready実bytes＋cleanup debt＋native temp予算` を同admissionで照合する。outputの厳密な圧縮後上界は一般HTMLから導けないので、renderer用service output予約を設定し実writeで検査する。既知pack bytes/manifest由来分は事前に正確に予約する。使用量はowner/WS quotaへ課算しない。

総枠を増やす前提なしに既存2GiBへ24h保持を押し込むとHTML/MDが長時間拒否される。PDF枠のGiB数・native RAM/CPU/process数・deadlineは測定/配備容量から別途採用する。期限内artifactの早期evictで空きを作らない。単体必要予約が設定枠より大きい場合は設定不足/調整を案内し、現在使用中による一時busyとは別分類。renderer OOM/timeoutも内容不正や権限エラーにしない。EX-02の1GBは単件に持ち込まない。

P4d-0のRSS合計はshared page重複を含み、物理使用量やcgroup課算ではない。未採用1GiBが十分/不十分という証明に使わない。local channelで文字列複製を減らしてもChrome decoded image/font/native memoryが一定になる保証はなく、実配備のhardcapacity確認は別作業。

最小packaging候補はNode adapter＋固定Chrome/font配備物＋小さいPOSIX監督shim。試作のPython fcntl/flockを使う場合は**Python3を明示runtime prerequisite**にし、固定absolute executable/config・対応OS/version・標準module・起動self-checkと配備手順を採用する必要がある。Node productionにPythonが当然あるとはしない。追加native依存を避けられる利点と、別runtime運用の負担がある。代案のNode supervisor＋native POSIX lock/helperはbuild/ABI/OS検証が追加となり、Nodeの通常file openだけをflockと呼び替えない。

監督はweb親と別にflockを持ちrendererへ継承、ledger/世代を耐久記録してGO、親EOFで停止、guardだけ死亡してもrendererがlock保持、guard/engine両死亡後も旧PGID/cgroup消滅確認まで新生成を拒否する。PID/PGIDの再利用、壊れたledger、owner未証明はfail-closed/運用復旧で、未知processを自動killしない。signal送信やlease期限を実終了としない。Node公式もchild `exit` とstdio `close` を区別し、detachedはPOSIX process group/sessionを作る挙動である。[Node22.22.3 child_process](https://nodejs.org/download/release/v22.22.3/docs/api/child_process.html)

既存writer recoverより前にPDF supervisorの孤児処理をreconcileし、旧Chromeが実ファイルへ書ける間はwriter inactive/cleanup/新slotを確定しない。shutdownは新受理停止→生成/素材server/delivery abortと実close→cleanup停止→DB close。正常logoutはこのshutdownと無関係。起動時download、userChrome、no-sandbox、privileged container、外部PDF serviceは採用しない。

macOSの試作application boundaryをNodeローカル配備の実証範囲として扱い、Linuxの非root/Chrome sandbox＋egress/file境界＋init/cgroup/PID/CPU/diskを確認する配備検証を別に残す。許可されたLinux環境がなければ具体設定/手順を用意して未検証とし、本番成立を宣言しない。

## 正式phase分割の提案

| 候補 | 利用者/検証者に観測できる終端条件 | 初期見込み |
| --- | --- | --- |
| P4d-1 資源供給・packaging | 新proofでlocal channel/font/媒体の実PDF全page、外部/file/別slot拒否、実close/親guard異常再開、配備prerequisiteを固定。製品schemaなし | 2〜4時間、Linux環境待ちは別 |
| P4d-2 本人単件PDF | owner/editor/viewerが実PDFを生成・自動取得、logout再login/jobs/取消/retry、同note合流、内容/所有変更、24h/90日、purge/WS/予約/bootを新schemaと実UIで完結。HTML/MD不変 | 8〜12時間＋独立検証 |
| P4d-3 匿名限定/public PDF | 同nonce/rate/署名ticket、no-JS進捗→実取得、元grant/epoch失効/期限/兄弟demand、本人履歴に混入なし、再ticket一致cacheを実証 | 4〜6時間＋独立検証 |
| P4d-4 配備/統合の残条件 | 採用対象Linux等の実制約、最終font profile/容量測定、全変更枝保全/停止/再起動と最終同bundle。未用意環境は明示残条件 | 2〜4時間の作業見込み、環境調達時間除外 |

番号/分割は提案。P4d-2/3を内部で先行開発しても、P4d-1の資源供給/監督が不成立ならrendererをfakeで受入しない。P4d-4は任意OS全保証という新gateでなく、採用する実配備条件の確認範囲を明示する段階。ZIP/7日/全500対象/Drive等はここへ混入しない。

## 実装時だけ再open候補となる既受入条件

今は実製品編集0なので再openを求めない。次のpath/責務を実変更したときだけManagerへ報告する。

| 予定接続 | 直接影響する候補ID |
| --- | --- |
| 新writer kind/回収正本、purge capture/hasWriters/terminal shell、clone | P2d-2-B/C/E、P3f-D/H。WS未終端PDF取消を加えた場合だけP3f-E |
| Node boot/packaging/HTTP dispatchとrenderer/source/delivery drain→DB close | P1-E、P2d-2-FD（停止順序部分。既存FD300対を無関係に反復しない） |
| 本人jobs/ticker/通知/retry/cancel接続 | P2a-E。actor/旧callback共存を実編集した範囲のP4b-F/P4c-J |
| export snapshotの純粋部抽出又は現在認可helperの共有変更 | P4b-A。新PDFだけで旧source選択/serializerを変えないならP4b-B/Cは保持 |
| 短期予約とPDF予約の共通service admission | P4b-D/G。短期2slot/120秒/既存2GiB保護の回帰に絞る |
| 形式選択/匿名rate/cookie/native route追加 | P4b-E/F、P4c-I。shared reader/共有mutation未編集ならP4a-D/G、P4c-D/Eを自動reopenしない |

### 未実施と停止

この準備では新renderer/channel/schema/署名/容量設定の実験・実装・採用は一切していない。P4d-0独立結果を先取りして合格扱いにせず、記憶上の試作性質は追加実験候補の根拠だけに使った。source調査の存在しない候補path globは正しい `application/reference/` 等へ訂正し、読めなかったfileを調査済みとしない。全文照合後、文書を含め全操作停止してManager判断へ返す。
