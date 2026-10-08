# P4d-3 匿名単件PDF 接続提案

## 状態・根拠

読取時刻は2026-09-20 11:29:25 JST。P4d-2は独立検証中であり、本書は正式着手・受入・数値の新規採用ではない。製品、test、build、DB、runtime、browser、proof、鍵、gitは無操作。許可された本書だけを作成した。goal-implementとmanager-loopを全文読了して適用し、Managerの正本・採否と実装提案を分離する。

全文照合した入力は `spec/scenario/export.md`、`sharing.md`、`jobs.md`、`phases/P4d-anonymous-contract.md`。最新briefとdesignの「匿名PDFの接続判断」、単件PDFの責務・寿命・現在認可を優先した。現sourceは `application/pdf/{ports,snapshot,usecases,worker}.ts`、`application/export/{ports,snapshot}.ts`、`application/sharing/reading.ts`、libSQLのPDF repository/物理owner条件、`presentation/exportHttp.node.ts` を必要範囲で照合した。外部技術事実・新依存の判断はしていない。

EX-04は現在閲覧できる公開/限定ノートの単件PDF、進捗と自動取得、短期ticket、毎回の現在認可、期限切れ/失敗時の明示やり直しを要求する。EX-01は24時間artifactと同note生成共有、空本文拒否を要求する。JBの本人90日履歴/取消と匿名要求を混同しない。SH-03/04/06と採用public identity/access epochが失効の出所である。

## 先にManagerが確定する小さい判断

1. **サインイン済みの公開/共有入口もbrowser-boundとするか。** EX-04は未サインイン者のticket/履歴なしを明記する一方、サインイン済みで公開入口を開く場合は未指定。現HTMLMDの `/s` と `/s/export-public` はsessionを認可根拠へ昇格せず、共有readerもsessionを編集導線表示にだけ用いる。推奨は入口を維持し、同じ公開/共有画面ではログイン有無にかかわらずbrowser-bound要求、本人履歴なしとする。内部アプリの本人PDFは従来どおり。短い説明を形式選択に置き、隠れた履歴追加はしない。別案は明示的な本人操作への遷移だが、追加導線と新たなcurrent-account認可が必要で最小sliceから外す。これは原文から一意に確定した仕様ではなく採否待ち。
2. **匿名delivery期限。** `min(prepareNow + 120秒, ticketExpiresAt, artifactExpiresAt, originalGrantExpiresAtがあればそれ)` を推奨。120秒は現在本人deliveryの参照配備値を再利用する提案で、匿名への採用はまだない。ticketの10分やartifact24時間を120秒へ短縮する意味ではない。期限切れでも実close前の枠/owner保持は既定どおり。
3. **ACK不明。** 最小は「受理を確認できません。元画面から明示的にやり直す」であり、自動再POSTや匿名履歴は追加しない。既定の同command非再課算を守るため、同じnative formの再送は冪等に同receipt/ticketを返す。ただし新たなcommand照会画面/APIは設けない案を推奨。別案のbrowser+command専用lookupはACKからの回復を良くするが、pre-ACK識別子保持/復帰UIが追加になる。両者を混ぜず採否を固定する。
4. **no-JSの一回自動取得。** 下記の永続auto-delivery latchと有限Refreshを推奨する。生成完了後に追加clickを必須にしないが、応答喪失後の自動再取得はしない。これは具体方式の提案で、実browser成立は未検証。

## 最小の型・portと状態

本人 `PdfRequest.accountId`、90日履歴、本人DTO/actorは不変とする。`ExportFormat` はHTML/Markdownのまま。PDF匿名専用のtransport/usecaseを追加し、既存HTMLMD serializerをPDF対応へ広げない。

`PdfAnonymousAuthority` は次の閉じたunionを提案する。

- public: `publicId, urlGeneration, accessEpoch`。
- link: `tokenHash, linkGeneration, grantEpoch, passwordProof`。proofは `none` または `grant` のunionで、後者は受付時grantの `verifiedAt, expiresAt` を固定する。browserHashはrequest共通に置く。

current判定は毎回現在note/lifecycle/現在所有scopeを読む。publicは同identity/世代/epochで現在public、linkは同token hash/世代/epochで非privateを要求する。passwordありは同browserの現在grantが有効で、かつ固定した元expiresAtを過ぎていないことを要求する。後の同epoch再unlockが現在grant行を更新しても元の上限は延長しない。元proofを失効させるpassword変更/解除、token再発行、private化を新public/loginで救済しない。public要求にはSH-04を適用しない。移動は旧WSを認可正本にせず現在noteの所有/lifecycleと同内容で判定する。

補足のsource照合では `application/sharing/settings.ts` がprivate化/public化・再発行・password変更/解除でgrantEpochを進め、publicから非publicへの変更でaccessEpochを進めている。passwordProof=noneでも元grantEpoch比較を必須とすれば、短時間private→link復帰をsweepが観測しなくても旧要求を復活させない。現在の安全fenceを再利用し、原則としてsharing mutationそのものは変更しない。

`PdfAnonymousRequest` は `queued | running | succeeded | failed | invalidated | expired` のdiscriminated union。失効状態は内部管理用で、外部には共通not-foundを返す。匿名cancel操作は追加しない。queued/runningだけが生成需要。成功時はartifact参照、失敗時は安全な固定error codeを持ち、本人title/historyを複製しない。ticket期限で需要は終わるが、物理資源が消えたとは扱わない。

提案port:

- `PdfAnonymousRequestRepository`: browser/commandによるreceipt、insert、current read、computeに紐づく状態更新、bounded expiry/prune、auto-delivery latchのCAS。原authorityの一致をreceipt再送にも要求する。
- `PdfAnonymousDeliveryRepository`: prepare/claim/actual-close、期限ready回収、boot recovery。本人deliveryと共通総数/同request排他を使う。
- `PdfDemandRepository`（物理表は増やさない）: `account | anonymous` の判別需要を両request表から選択し、claim/renew/publishに必要な現在valid需要の存在と成功更新数を扱う。bounded selectionとSQLのEXISTS/集合更新を使い、全履歴や全需要をJSへ無制限展開しない。
- `PdfAnonymousTicketSigner`: strict claimsのsign/verifyだけ。Node crypto/設定読込はadapter。applicationへsecret値やprovider例外を漏らさない。
- `PdfTransfers` はaccount/anonymousを識別できるopaque transfer refへ最小拡張する案。同ID衝突・別table誤照会を型で防ぎ、最大2件の実所有だけを列挙する。期限は注入Clock、stopは実readerとwithOwner終了まで待つ。

既存 `readPdfSnapshot` はaccount認可と内容構築が一体である。account wrapperを維持し、認可済み現在noteからidentity/manifestを構築する内部共通関数へ分ける。anonymous wrapperは元authorityを検証してから同関数へ渡す。clientから「認可済み」を受け取らない。HTMLMDのexternal-inspect snapshotを流用して新外部fetchを足さない。PDFの現在source identity、runtime profile、保存済み本文/title/style/current mediaは共通にして同内容のcache/compute共有を成立させる。

## schema候補と移行

新migrationで2表だけを追加する第一案。具体DDLは正式着手前に確定する。

| 表 | 最小責務/列群 | 制約/索引候補 |
| --- | --- | --- |
| `pdf_anonymous_requests` | id、browserHash、commandId/inputDigest、targetNoteId/liveNoteId、原authority判別列、sourceIdentity/profile、computeId/artifactId、状態/failure/version、acceptedAt/ticketExpiresAt、ticketGeneration/ticketKid、autoDeliveryId | unique(browserHash,commandId)、stateごとのnull整合、ticket固定10分、grant期限整合、compute/state、期限/id、liveNote索引。active/物理参照中のliveNote null禁止 |
| `pdf_anonymous_deliveries` | id/requestId/artifactId、ready/sending/closed、generation/claimToken/runtimeId、createdAt/expiresAt、cleanup情報 | request+artifact整合、ready/sending時必須列、同request非closed一つ、期限/index、owner実close前closed禁止 |

authorityはstrict union列/CHECKでpublicとlinkの混在を拒否し、raw token/password/cookie/signed ticket本文は保存しない。ticketKidは元ticket再署名の同一性/旧key保持判断用の非秘密識別子。ticket寿命に履歴90日を流用しない。autoDeliveryIdは成功状態の最初の自動取得を一回だけ選ぶCASであり、全取得履歴ではない。

ticketGenerationは受付時に固定する識別世代で、queued→running→succeeded等のOCC versionとは分ける。通常進捗でticketを失効/再発行しない。新たな明示やり直しは新requestとして作り、旧ticketの時刻/世代を書き換えない。

noteへのlive FKはRESTRICTを維持し、現在note purgeは匿名要求失効→active delivery/compute実close→資源回収→最小shell化/FK解消の順。要求期限だけでartifactやcomputeのcleanup負債をcascade削除しない。artifactの24時間保持は匿名ticket10分とは独立で、最後の要求期限で早期evictしない。期限後request/closed deliveryは依存とactive writerがなくなったものから有限pruneし、公開可能な本人履歴へ変換しない。90日保存は追加しない。

新migrationは2表だけでなく、物理owner種別CHECKと参照triggerに必要な追加を含む可能性がある。既存本人列/寿命の緩和はしない。旧全列/trigger差の意図をcloneで比較し、旧資料・fresh移行は正式委譲後にのみ実施する。

## 混合需要・公開・回収の接続

現 `pdfComputationRepository.ts` のclaim/renew、`pdfArtifactRepository.publish`、`objectOperationRepository` のpdf-artifact guardは `pdf_requests` のEXISTSに限定される。workerも本人demandの先頭からsnapshotを構築し、publish時 `pdfRequests.succeed` の件数だけを成功条件にする。匿名HTTPを足すだけでは生成が止まるので、以下を同時に接続する必要がある。

1. 明示POSTで現在authority/内容を照合し、同command priorを先に照合する。新requestはcache→同identity active compute→新computeの順。rate予約とrequest受理を同Txにし、失敗はrollback。同note異内容またはstoppingなら既存の待機理由を返し、新queue/旧artifactを足さない。
2. claim/renew/reserve後再認可・artifact writer begin/register/publishでは、本人または匿名の**現在valid需要が最低一つ**あることを同じ定義で検査する。消えた先頭需要が別の正当な兄弟を止めないよう、有効な判別需要を選ぶ。
3. artifact採用Txで現在snapshot/content identity、世代/lease、取消、期限、ownerを再確認し、両request種別の有効なものだけをsucceededへ更新する。両者合計0なら公開しない。render後close中に最後の需要が失効した場合も遅い結果を採用しない。
4. 本人cancel/降格はその本人requestだけを止め、正当な匿名public/link兄弟は残す。SH/private/grant失効は当該匿名需要を失効させ、現在account readを保つ本人需要まで止めない。note trash/current WS deletionは両需要へ適用し、先に移出したnoteは保持する。
5. periodic sweepと全採用guardに失効を含め、期限境界は `now >= expiresAt` で不可。共有設定mutationに早期wakeを足しても、wake配送を唯一の失効fenceにしない。最後の需要なし→stopもTxで直列化し、実close前の枠/予約解放は禁止。

artifactの物理ownerは既存 `pdf-artifact` 一つのまま。匿名配信readerには `pdf-anonymous-delivery` owner分岐を追加する最小案で、共通object write/cleanup台帳へ接続する。本人と匿名のready/sendingを合算して最大2、同匿名requestも一つ、runtime実reader holdも合算する。各表で2件ずつにしない。prepareのTxとruntime hold両方を守り、preparedだが送信されないslotも期限まで有限保持する。

stream open前後・応答前・配信中有限再認可で元authority/内容/期限を照合し、失効ならabortする。abort要求だけでDB closedや枠解放をしない。purge/boot/drainは両delivery ownerの実終了を待つ。旧監督/reader所有不明なら既存共通recoverWritesのfail-closedを維持し、匿名だけ未構成と誤認しない。既存PDF4GiB/HTMLMD2GiB予約partition・HTMLMD2slotと固定rendererは変更しない。

## ticket・鍵・rate

採用済みは専用32-byte keyring、HMAC-SHA256、purpose分離、固定10分、最大1KiBのcanonical claims。claims候補はversion/purpose/kid/requestId/requestGeneration/iat/exp/browser binding digest/authority digestだけ。元proofそのものはDBで参照し、raw token/password/session/本文/titleを署名本文へ入れない。verifyは署名だけでなく、DBの原authority・browser・世代・固定時刻・現在readを照合する。署名ticket自体もbearer相当としてログ/通常DTO/証拠へ出さない。

設定候補は専用keyringのkey-ID一覧とactive ID、各32-byte secretの安全な注入方法。共有token保護鍵やsession secretとは共用しない。旧keyは少なくとも発行済みticketの最終期限まで保持し、早期除去は当該ticket拒否となる。未配備/不正設定時は匿名PDFだけが安全な未構成表示となる構成を推奨し、本人PDF/HTMLMDを偽成功にしない。設定名/配布方法は正式実装時に既存keyringパターンへ合わせる。今回秘密を探索していない。

rateは既存 `reserveDownload` を流用し、同じ `/s` browser nonceとnoteでHTML/MD/PDF、public/linkを合算する。6/browser-note/60秒と30/note/60秒、再発行非reset、既存prune100の意味は維持。明示新操作はcache/joinでも一回課算、同command receipt/GET/poll/native取得は再課算しない。parallel最終枠はTxで一件だけ受理。password unlock rateと共用しない。

## HTTP/no-JSの最小候補

既存HTMLMD format GETを維持し、PDF選択だけ専用native POSTへ送る。例はlink `/s/{token}/pdf`、public `/s/export-public/{id}/{generation}/pdf`。statusはそれぞれ `/pdf/{ticket}`、自動受信はその `/receive`、手動再取得は専用POSTとする。具体route名は未採用。token readerとのsegment衝突を検査する。リンクraw tokenは従来の共有URLのtransportにのみ残り、DB/claims/fileへ新規保存しない。statusの元画面リンクもそのHTTPで検証した元入口からだけ作り、別public/loginへ誘導し直さない。public入口はcanonicalへ固定して戻す。

形式GETは現在read確認後にのみmetadataを出し、既存/s nonceを維持、未設定の場合だけ既存native navigation条件で発行する。cookie初回並行発行で別nonceになった旧operationはfail-closed、無限cookie修復redirectなし。session cookieはこの入口のauthority選択に使わない（上の判断1が採用された場合）。

POSTは既存のOrigin一致、またはOrigin文字列nullかつSec-Fetch-Site/Mode/Dest厳密一致例外を維持。欠落/別origin/不足metadataは拒否。bounded formはPDF形式とcommandだけをstrictに受け、明示POST→303 statusとする。レスポンスACK不明時は自動POSTしない。同form再送は同command receipt、元画面からの新明示操作は新command/current snapshotでcache/joinする。

no-JSでレスポンス自体が喪失した場合はブラウザーの通信エラー画面になることがあり、サーバーがその場に独自エラー文を表示できるとは保証しない。送信前の説明と元画面への復帰で明示やり直しを案内する。専用lookupを追加しない案では、commandだけから新たな画面へ確実に復帰するUXは約束しない。

pending statusはserver-rendered進捗と同一ticketへの有限Refresh。提案の間隔2秒は技術値で、ticket残時間以内、最大300回相当/10分で停止する。毎回現在authorityを確認し、expires/revoked/failureではRefreshを出さない。GETで生成を再受理/再rateしない。HTTP clientsが勝手に超過再訪することまで300回を保証せず、serverは固定expiry後に拒否する。

ready statusから自動receiveへ一度だけ進める。receiveは同Txで現在認可・共通delivery枠・auto latchを確定し、採れた一件だけattachmentへ進む。別tab/再読込がlatch既使用ならready表示と明示再取得へ戻し、自動取得を再発行しない。slot不足はlatchを消費せずticket残期間の有限待機/明示再操作として説明する。native取得が失敗/切断しても自動POST/無限GETへ戻さない。配信開始は「端末へ保存成功」と断定しない。JS版を先に別実装せずno-JSの同一status契約を基盤にする。

manual再取得はticket有効中に現在readで新deliveryをprepareするだけで、生成request/ticket/artifact期限を延長しない。ticket失効後は元入口から明示新操作を必要とし、24h一致artifactを再利用できる。private/no-store、no-referrer、noindex/nofollow、CSP/form-action/frame-ancestors、MIME/attachment filename、HEAD/Range拒否を既存境界に合わせる。pathに含むtoken/ticketは安全log redaction対象で、referer・外部assetへ流さない。

## 完成条件案（採否前、7項目）

| 候補 | 元要件/採用根拠 | 観測する最小の完成像 |
| --- | --- | --- |
| A 型/移行/分離 | EX-04/JB、design独立匿名2責務 | 本人account/90日履歴不変、2表と判別需要、strict authority/状態/期限、clone旧全列/FK/trigger保全。匿名が本人履歴へ混入しない |
| B 現在認可/ticket | SH-01/03/04/06、design原根拠 | public/link/password、元grant上限、browser/改ざん/kid/期限、private→再public非復活、link失効後public/login非昇格、canonical SH04不失効。current snapshot/内容変化も拒否 |
| C 共有生成/寿命 | EX-01/04、design混合需要 | 本人+匿名/匿名兄弟のsingleflight/cache、異内容active拒否、各取消/失効の独立、最後の需要とpublish race、24h非延長、同内容移動/current所有保持 |
| D native UX/ACK | EX-04進捗/自動取得/やり直し | 同bundle public/link/passwordの実PDF、no-JS pending→一回自動取得、明示再取得/期限/失敗、ACK自動再POSTなし、390/keyboard。サインイン済み公開入口は採用判断どおり |
| E rate/入口安全 | EX-04、P4b/P4c採用境界 | /s既存nonce、HTMLMD合算6/30最終並行枠、cache/join一回、receipt再課算なし、再発行非reset、native Origin例外限定、初回nonce競合fail-closed |
| F 配信/回収/復帰 | design物理owner/共通資源 | 本人匿名合計2/same request1、claim/open後失効と切断、実close前保持、purge/current WS/先移出/boot/drain、未構成keyと所有不明区別、HTMLMD枠保護 |
| G 引継ぎ | CLAUDE/既存保全契約 | 規定checksと適用unit/Node/実UI/file、自己対象のみ保全/回収、旧データ比較、同bundle/commit/runtime/key-IDだけの非秘密設定文書、全停止して独立へ |

表は新しい最大容量/OS隔離/全故障matrix再演gateを追加しない。renderer/固定font/sealed packが無変更なら受入済み根拠を借用し、匿名の実native fileを内容/全page確認する範囲と分ける。

## 予定pathと先行影響候補（未reopen）

- `application/pdf` snapshot/worker/usecases、PDF repo/UoW/schema: P4d-2-A/C/F/G/H。本人request取消・publish・history pruneが共通化で変わる枝だけ。P4d-2-Bのrenderer本体、Eのticker UIは変更予定なし。
- delivery/transfer facadeとowner repository: P4d-2-D/G、P2d-2-B/C、P3f-D/E。配信2枠/current purge/実closeに限定。既存FD300全対を新たに要求しない。
- 新migration/shared schema export: P2d-2-E/P3f-H/P4b-G/P4c-Kの保全部分候補。実編集後に該当するものだけManagerへ通知する。
- `exportHttp.node.ts` のPDF形式導線、専用匿名PDF handler/server dispatch: P4b-E/F、P4c-I、P1-E。P4a-Dは共有reader/nonce/native formを実際に編集した場合だけ、P4a-Cはgrant mutation実編集時だけ候補。元token/password mutationを変更せずread-only resolverを追加できるなら不要。
- 本人UI/jobs/provider、HTMLMD serializer、public検索/sitemap、固定Chrome監督は現案で変更不要。P4b-Cを匿名rate理由で再開しない。P4d-2受入前なのでその既存根拠を合格確定とは扱わない。

## 順序・見込み・未実証

正式開始前に4判断（入口、delivery clamp、ACK、once/no-JS）とshared demand/transferの正確型を固定する。工程見込みは、型/2表/混合SQLと隔離対2〜3時間、signer/HTTP/no-JS/rate2〜3時間、配信/失効/purge/boot回帰1.5〜2.5時間、同bundle実UI/保全/候補固定2〜3時間、計7.5〜11.5時間。独立検証は別。新Renderer開発は含まないが、P4d-2差戻しがあれば見直す。

最初の実証は隔離DBで「本人だけ/匿名だけ/混合」で同じclaim・writer・publish・delivery2枠が成立するかと、元grant expiry後に新unlockしても旧ticketが復活しない対。次に小実HTTP/no-JSでRefresh→attachmentの一回性・ACK/nonce初回raceを確認し、それから本体同bundle UIへ進む。原文の同note共有をrequest countの業務上限で回避しない。

未実証は新schema/SQL unionの実行計画・期限pruneとFK、signed ticket canonical化/rotation実装、native Refresh/downloadブラウザー挙動、元grant再発行競合、共通deliveryの実close、鍵未配備の起動分離。今回はread-onlyであり、いずれも成功したとは主張しない。OS/native容量/最大合法入力の未実測はP4d-2から拡大保証しない。

## Manager確認後の限定追補

Managerは上記4判断の方向を採用した。正確port/DDL/設定名と正式開始は別途確定し、本追補も実装・実証ではない。既読の原文/採用境界に基づき、追加の製品・環境・proof読取や実行は行っていない。

### ticket期限と失権の表示優先順位

1. strictなticket形/署名/purpose/既知kidとbrowser bindingを検証する。不正MAC、browser不一致、未知key、改変claimsは共通not-found。期限を過ぎた署名を「期限切れ表示の候補」として識別する処理と、取得を認可する処理を分け、期限を無視した認可へ流用しない。
2. 保存済みrequestが存在し、元ticket世代・固定iat/exp・原authorityが一致することを照合する。row消失、失効済み、照合不能は共通not-found。過去に有効だったという署名だけからnoteや原入口の情報を復元しない。
3. 元入口の現在readを、元public/link/browser/元grant期限の境界で照合する。note削除/private化、原リンクやgrant失効、元grant期限切れ等がticket期限切れと同時なら、**失権の共通not-foundを優先**し、title/body/thumbnail/所有者等を出さない。後のpublic化/login/再unlockでこの判定を救済しない。
4. ここまで現在readが成立し、ticketだけが期限切れなら、「ダウンロードの受付期限が切れました。元の画面からもう一度操作してください」と最小限に案内する。本文・artifact・履歴は返さず、検証済みの同じ元入口へのリンクだけを示す。元リンクURLは当該HTTP入口からのみ組み立て、DBのhashから復元しない。Refresh、自動取得、delivery prepareを止め、新たな明示操作だけが新ticketを得る。

期限前でもcurrent read失敗は共通not-found、期限切れ案内は取得許可ではない。期限後pruneでrequestが消えた場合は共通not-foundに戻るため、過去ticketから期限切れ専用画面へ永久に復帰できるとは約束しない。必要ならnot-foundにも秘密やnote情報を含まない一般的な「元の画面から確認してください」を置くが、無検証の個別入口リンクは出さない。追加の期限切れ履歴・永久tombstone・クライアント永続cacheは作らない。

### status/receiveの一回分岐と実close

status GETはlatchを消費しない。現在認可/期限が有効な場合の分岐を次のように固定する案である。

| 状態 | statusの応答 | receiveの扱い |
| --- | --- | --- |
| queued/running | 同じstatusへの有限Refresh | PDFを返さずstatusへ一回戻す。生成を再POSTしない |
| succeeded・autoDeliveryIdなし | receiveへの一回の自動遷移を提示 | Tx内で現在認可/期限/共通slotを確認し、delivery作成とlatch CASを一緒に確定する。勝者だけclaimしてattachmentを返す |
| succeeded・slot満杯 | 有限の待機表示。再試行するなら少なくとも既提案2秒間隔、ticket期限まで | deliveryもlatchも作らず戻す。即時redirectの往復loopにしない |
| succeeded・autoDeliveryIdあり | **自動遷移/Refreshなし**のmanual ready。明示再取得と元入口への戻りを表示 | 新たなauto deliveryを作らずmanual readyへ一回戻す。attachment失敗も自動再取得へ転送しない |
| failed/expired/失権 | 前節の優先順位で失敗/期限/共通not-found。Refreshなし | attachmentなし。元入口の明示操作以外で生成を再開しない |

最初のstatusが既にreceiveへの遷移を返した後、別tabが先にCASを取っても、遅いreceiveはlatch使用済みを読みmanual readyへ戻る。reloadも現在latchを読むため自動取得を繰り返さない。CAS後に応答が喪失した場合もlatchを戻さず、明示再取得で回復する。autoDeliveryIdは物理delivery rowのprune後もrequest存続中は使用済み識別として保持し、FK削除でnullへ戻して自動取得を復活させない。

manual readyは「端末への保存成功」を意味しない。古いdeliveryがready/sending/closingなら同request排他により明示再取得も一時待機になり得ることを説明する。旧readyは有限期限、sending/closingは実closeへ収束させ、未終了ownerを迂回して別deliveryを作らない。slot待機や手動操作でticket/artifactの元期限を延長しない。

前節のdelivery状態案は既本人との整合のため **ready | sending | closing | closed** に補正する。期限/失効/切断時のstop要求はclosingとし、claimToken/runtime owner・実reader hold・writer登録・共通2枠を実終了まで保持する。readyでも実reader/ownerが存在する可能性がある経路では同じ扱いとする。実reader closeとwithOwner終了、active writer不在を確認した後だけclosedにして枠を解放する。実資源を持たないことを証明できる未claim readyだけは直接closedへ移せる。close未証明ならclosingと負債を残し、closed扱いで新配信を受けない。要求結果の失効と物理回収完了は別である。

この分岐は具体実装案であり、no-JS Refreshとattachment後に元文書が残る実ブラウザー挙動、別tab競合、応答喪失、共通slot満杯は正式開始後の小実対で確認する。今回新しい実試験や新gateは追加していない。
