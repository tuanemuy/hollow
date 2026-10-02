# P4f-2 PDF一括 ZIP 実装前契約案

## 現在の結論・判断依頼

2026-09-27、現製品 `adf4c637` の非秘密コードと採用design/specを読んだ提案。P4f-1固定38条件はManagerが18:53:27 JSTに正式受入済み。P4f-2の開始・製品成立・新条件の固定ではない。当方は本書以外を書き換えず、DB/runtime/browser/test/build/install/git操作をしていない。

次の正式実装時の開始基準はManager引継ぎの `J=/Users/hikaru/.local/share/hollow/verification/p4f-ui-independent-20260927-R4qBdG`、`J/final`（18:48:38.511）と `final-comparison/inventory-v2/details/seal`（18:49:46）。旧Sを次baselineへ使わない。引継ぎ値はsession59、ZIP19親/20run/39attempt/19artifacts、予約/ref/owner0、outbox83（旧81全列保持、新未処理1）、旧12objects/3107B・20scope・FTS8253、全manifest `f0454e…`一致。独立は18:51:51に全停止/exec0。これはManager通知の引用であり、本提案作業ではJ/DB/proofを再読・操作していない。

推奨は既存ZIPの受理・逐次子処理・spool・組立・7日取得をそのまま使い、PDF子だけを共用PDF computeの第三需要へ接続する構成。需要の正本は既存 `zip_attempts`、追加は内部所有の `zip_pdf_holds` 1表。本人/匿名request、単件delivery、500件の単件履歴は作らない。既存PDF renderer/font/pack/単件identity、HTML/MD、匿名ticket/rateを発明し直さない。

Managerに判断を求める詳細は次の4点。既採用の業務条件・資源値を変える質問や利用者への追加判断はない。

1. attemptのtop-level既存stateを保ち、`running`の内部PDF phaseとしてwaiting-pdf/copy-ready/copyingを型・列で追加する。旧state CHECKと既存FK集合を作り直さない最小案。前準備書のtop-level state案からの具体配置変更であり、未採用。
2. 中立 `application/pdf/demandPorts.ts` の第三branch、同UoWのZIP PDF repository、ZIP executionの中断可能な2秒待機portを追加する。signature候補は下記。
3. `zip-source` ownerとholdを物理delete・run終了・boot/recoverの共通境界へ接続する。ZIP PDF設定欠落時はその機能だけ受付拒否、残存PDF依存資源があれば回復前boot拒否。
4. 下記8完成条件候補を次の正式委譲で固定する。実装見込み **8〜12時間＋独立別**。最初はclone移行/需要holdの原子性、次に実copy/取消close、最後にPDF format/UIと同bundle実PDF ZIPを接続する。

## 原要件・変更しない契約

[EX-02/03](../../spec/scenario/export.md)のPDFを含む形式選択→固定500以下→親1件/子結果→ZIP/失敗一覧→7日反復取得、[JB-01〜03](../../spec/scenario/jobs.md)の本人履歴/画面離脱/失敗子retry/取消を完成させる。[EX-01/04](../../spec/scenario/export.md)の本人・匿名PDF single-flight/cache/24時間/独立履歴と元認可を壊さない。[design ZIP節](../design.md#一括zipの接続判断)を正本とし、古い準備書の未採用値・表名より優先する。

- ZIPの既存500/圧縮前実entry＋manifest合計1,000,000,000B/本人1active/global run1/ZIP delivery2/4GiB、元親90日非延長/新attempt90日、STORE、安全flat名、7日、同command同payload明示ACK再送は維持する。
- PDF生成は既存PDF compute枠とPDF poolを使用する正当な第三需要。ZIP copy/spool/組立/配信はZIP側予算、内部copyを本人/匿名delivery2枠へ混ぜない。既存6GiB全量headroomを引くZIP admissionも変えない。新pool・新待機列・OS hardquota・ライブラリを追加しない。
- ZIP child120秒は待機/取得/copy/closeを含む一つの既存工程期限、親総30分に制限される。PDF compute自体の既存deadlineを延長しない。500件の最大合法入力が30分で必ず完了する保証を追加しない。
- PDF24時間は元publishedAt固定。期限内holdで開始した有限copyだけは期限を跨げるが、新hold・単件ダウンロードを延長しない。copy後はZIP専用spoolだけでretry/7日を支え、元PDFを90日保持しない。

## 現コードとの具体的な差

| 現接続点 | 読取結果 / 必要差 |
| --- | --- |
| `domain/zip/entity.ts`, `application/zip/ports.ts`, `zip/preview.ts`, `presentation/zipHttp.node.ts`, `ZipSelection.tsx` | 保存 `ZipFormat` は3形式、受付 `ZipAvailableFormat`/transportは2形式、生成とUIはPDF拒否。受理を3形式へ開きPDF構成を境界確認する |
| `pdf/anonymousPorts.ts`, `pdfDemandRepository.ts` | 需要はaccount/anonymousだけ。共通需要型を中立位置へ移しzip-child追加、find/running/succeed/fail/currentAnyへ同一predicateを適用する |
| `pdf/worker.ts` | `current()`は匿名/本人二分岐、publish+succeedは既に同UoW。この原子境界へhold挿入/子copy-readyを加える |
| `pdf/usecases.ts`, `pdf/snapshot.ts`, `zip/snapshot.ts` | 単件 `readPdfSnapshot` はpublic fallbackを持つ。ZIPでは呼ばず、`readZipSnapshot`の本人/current scope readを先に確認して `buildPdfSnapshot` を呼ぶ |
| `zip/generation.ts`, `zip/worker.ts` | 子は最大500の逐次await、PDFを拒否。PDF branchを差し込み、待機中もZIP execution/leaseは継続し、別PDF pumpが進める。組立へ未完成子を渡さない |
| `ObjectStorage`, `zip/storage.ts`, `objectOperationRepository.ts` | 実owned read/writeとtyped unknownは接続済み。`zip-source` ownerの明示追加、source key登録とhold照合だけを追加する |
| PDF artifact/request/compute repos、ZIP prune、purge、boot | 内部holdをまだ知らない。未open holdを含むdelete禁止/参照prune除外/安全recoverを追加する |

### identity と認可の分離

`ZipContentIdentity`（既存preview/attempt.expectedIdentity）と `PdfComputeIdentity`（既存buildPdfSnapshot.identity）は別の内向き型/名前で扱う。値を同一視・上書き・既存canonical変更しない。PDF側identityにはPDF profile/runtime/defaultCss/mediaが入り、ZIPのexport content identityとは一致しない。

PDF子の開始時は同UoWで現在run/actor/target/current read/ZIP expectedIdentityを確認し、その認可済みnoteから `buildPdfSnapshot` を構築する。得たPDF identity/profileを当該attemptへ束縛する。PDF workerがzip-childを選ぶ場合も同経路を通る。共有publicや匿名authorityへfallbackしない。本人/匿名branchは既存入口を維持する。

ZIP spool/entryには既存のZIP `sourceIdentity`/`externalIdentity`を保存し、PDF runtime profileを結果profileへ保存する。既存assembly/retry/deliveryのZIP current content/require-determinate inspectionをそのまま通す。PDF compute identityは需要/hold一致確認にだけ使い、コピー済みZIPの7日取得を元PDFの24h・生存compute・holdへ再依存させない。

## 保存構造・型の候補

新migration候補名は **0031_zip_pdf_demand.sql**。0030/旧保存row/旧result JSONを書換えない。旧HTML/MD attemptsは新列全nullで互換。以下は具体DDL設計であり、実行可能SQL/移行成功は未検証。

### zip_attempts の追加列

nullable `pdf_compute_id`（pdf_computations FK RESTRICT）、`pdf_source_identity`、`pdf_profile`、`pdf_external_identity`、`pdf_deadline_at`、`pdf_phase` を追加する。phaseはwaiting-pdf/copy-ready/copying。これらは親/actor/需要を複製する別表ではない。

- 型では `running` を「既存document子、PDF初期準備」又は「PDF binding有り」のunionへ分け、PDF binding内のphaseをdiscriminantにする。旧queued/terminalの外形・immutable outcomeは維持する。
- CHECK/INSERT・UPDATE guardで binding全null又は全必須、hex identity、有限epoch、親format=pdf、binding中はstate=running、attempt/runの現在generation/latest target、child deadline<=run deadlineを検査する。phase不在のqueued PDFは未開始であり偽compute値を持たない。
- waiting-pdf→copy-readyはheld行必須、copy-ready→copyingは一致claim付きhold必須。bindingのcompute/identity/profile/deadlineは途中変更不可。巻戻し・released hold再取得不可。同じattemptを再試行へ転用せず新attemptを作る。
- 終端化とbinding切離しは、該当holdの実close/owner不在・released確定後又は同Txでだけ許可する。純waiting-pdfの取消は後述の需要切離し規則。terminal outcomeを後から失敗へ書換えない。
- 索引 `(pdf_compute_id,pdf_phase,id)`、既存run/ordinal work indexを使用。PDF用最小projectionはactor/target/run lease/deadline/exclusion/二identity/profileだけで、titleや履歴期限から需要可否を決めない。

top-level stateを増やさないのは、既存attemptを参照するspool/target/runのFK再構築と旧terminal CHECK改変を避けるため。Managerがtop-level拡張を選ぶ場合は別途cloneでtable-rebuildの保全手順を確定し、移行方式の成立を推測しない。

### zip_pdf_holds 1表

| 列 | 制約案 |
| --- | --- |
| attempt_id | PK、zip_attempts FK RESTRICT。1 attemptに1 hold、再取得/差替え不可 |
| artifact_id / artifact_generation | pdf_artifacts FK RESTRICT / 正安全整数。取得した物理世代を固定 |
| acquired_at | 有限epoch、取得時にartifact.readyかつexpires_at>nowを同Tx確認。あとで更新しない |
| state | held / reading / closing / released |
| claim_token / runtime_id | heldでは両null、readingでは両必須、closingでは元のpairを保持（未open取消は両null）、releasedでは両null |
| version | 正安全整数CAS、巻戻し拒否 |

索引 `(artifact_id,state,attempt_id)` と `(state,attempt_id)`。新hold INSERTは現在waiting-pdfとartifact identity/profile/compute一致、期限内、cleanup/delete claimなしを要求する。copy-ready更新は同じUoW。claim側はheld→readingとattempt copyingを同Tx。held/reading/closingはいずれも物理deleteを止める。

既存object_writesのTypeScript WriteOwnerへ `zip-source` を追加し、ownerId=attemptId。`ObjectOwnershipUnprovenError` のretained ZIP owner unionにも追加する。現purgeSchemaのkind列はenum CHECKを宣言していないため、既存列を無根拠に再構築せず、採用ownerのINSERT/開始照合と当該kindの実装を明示する。汎用conversion分岐へfallthroughしない。

## 内向きport・同Tx境界

型/名称は提案で未採用。PDF domainがZIP application/adapterに依存する形にはしない。共通需要契約はapplication同階層へ置く。

```ts
// application/pdf/demandPorts.ts
type PdfDemand = AccountPdfDemand | AnonymousPdfDemand |
  Readonly<{ kind: "zip-child"; demand: ZipPdfDemand }>;
// ZipPdfDemand: attemptId, requestId, runGeneration, ordinal,
// accountId, noteId, zipIdentity, pdfIdentity, profile, computeId,
// deadlineAt。title/session/cookie/署名ticketは持たない。

interface ZipPdfRepository {
  attach(input: ZipPdfAttach, now: Date): Promise<ZipPdfProgress>;
  find(attemptId: string): Promise<ZipPdfProgress | null>;
  acquireCached(attemptId: string, version: number,
    artifactId: string, now: Date): Promise<boolean>;
  claimCopy(attemptId: string, version: number,
    claim: { token: string; runtimeId: string }, now: Date):
    Promise<ZipPdfCopyClaim | null>;
  beginClose(attemptId: string, token: string | null, now: Date): Promise<void>;
  releaseClosed(attemptId: string, token: string | null, now: Date): Promise<boolean>;
  detachWaiting(attemptId: string, version: number, now: Date): Promise<boolean>;
  recover(now: Date): Promise<void>;
  prune(now: Date): Promise<void>;
}
// 共通PdfDemandRepository find/running/succeed/failは署名維持。
// succeedの数は「受理した有効需要数」、ZIP終端成功数ではない。

interface ZipExecution {
  // 既存membersを維持。Node timer/Clockに閉じた既存tick間隔の待機。
  waitForPoll(signal: AbortSignal): Promise<void>;
}
```

ZipPdfAttachは当該現在run lease/attempt versionと検証済み二identity/profile/externalIdentity/deadline/computeIdを持つ最小入力。ZipPdfProgressはwaiting/copy-ready/copying/terminalの型付きprojection。CopyClaimは元PDF file/key/generationと一致tokenを内向きに返し、client DTOへ出さない。releaseClosedはDBだけでOS終了を推測せず、後述の実closeを終えたapplication呼出＋active owner不在を要求する。

attachとacquireCachedは同じ外側UoW内で束ねる操作であり、repositoryが別Txを開始しない。detachWaitingは需要を現在集合からfenceする操作で、最後の需要の終了待ち参照を直ちにnull化する意味ではない。既存run停止/単調exclusionで需要を無効にし、実終了待ちが必要なcompute bindingは残す。worker用projectionは有効需要照会とは別に、この停止待ちbindingを読み取れるものとする。

1. **attach Tx**: 現在ZIP認可/identity確認→期限内PDF cache照会。cacheならそのcomputeへattach＋hold INSERT＋copy-readyを同Tx。cache missなら同note active computeの同identity/profileを合流し、異内容/stoppingは既存PDF_STOPPINGの失敗境界へ。同内容activeがなければ既存pdfComputations.beginで正当PDF予約を確保してattemptをwaiting-pdfへ。本人/匿名request INSERTは0。
2. **publish Tx**: 既存 `pdfArtifacts.publish` と `pdfDemands.succeed` の同UoWを保持。有効waiting-pdf集合についてhold INSERTとcopy-ready更新を不可分にする。片方件数不一致はrollback。account/anonymousの既存終端更新もそのまま。ZIPだけが無効なら除外し、有効な本人/匿名兄弟のpublishを妨げない。逆も同じ。
3. **claim copy Tx**: held/current run/actor/content/元PDF identity/同artifact generationを照合、source keyのdelete claimとPDF writer実終了を確認し、hold reading＋attempt copyingをCAS。PDF writer終了待ちはholdを保って有限pollし、readyになっただけでwriter完了とはしない。
4. **copy Tx外**: ZIP disk admissionで既存spool予約を確定してから、`zip-source` ownerでCoordinatedObjectStorage.openOwnedRead、`zip-spool` ownerでputOwnedBounded。PDF生bytesをコピーし、ZIP media readerのbase64変換を使わない。64KiB逐次、期待bytes/hash/短読/過読を検査。既存実payload検査を共用し、実超過だけZIP_TOO_LARGE。metadata上界/予約拒否を業務1GB超過としない。
5. **finish Tx**: source.closeとclosed、write FD close、両withOwner終了、copy workの完了を確認。現在run/actor/ZIP identity/PDF identity/externalIdentity/期限/世代を再確認し、spool ready＋attempt成功＋active ref＋hold released＋不要PDF binding切離しを同Tx。body/copy失敗で実close成功ならspool cleanupと子failed/取消/除外へ、holdを正当にreleaseする。close不明なら型付きretained owner/hold/予約を残しrun stopping、成功publish/terminalへ進めない。

### 待機と取消をrun終了から分ける

ZIP実行は一度に1子。`execution.within(childDeadline,parentSignal,...)` 内で短いUoW照会→`waitForPoll(signal)`→再照会を行う。待機中にTx/DB handle専有・500タイマー・新slot/queueを作らない。Nodeだけがtimer/Clockを扱い、既存2秒間隔、abortで直ちに待機を終え、120秒/親30分を越えた遅い成功を採用しない。別PDF pumpは独立にclaim/renew/publishを続ける。wakeは待機効率向上用であり、wake喪失を永続状態喪失にしない。

| 取消時の状態 | PDF / ZIP の終了条件 |
| --- | --- |
| waiting-pdf、他の正当account/anonymous需要あり | 当該attemptの需要だけ同Txでdetach。共有computeを止めずZIP子を取消へ進められる。共有compute完了をZIP parent終了の条件にしない |
| waiting-pdf、最後の正当需要 | demand fence＋compute.stopを同Tx。queuedなら通常closed、実runningはPDF executionへ取消を伝え実closed/所有終了を待つ。待機対象compute bindingはその実証まで切り離さず、attempt終端を先行させない。ZIP runはこの間stopping/global枠保持。PDF unknownはZIP側も未完として保持し、stop成功に変換しない |
| held（まだsource未open） | claim競合をCASで止めclosing→owner不在確認→release。同じTx競合でcopyが先にclaimしたらreading側の終了へ委ねる。未openを理由にdelete guardを迂回しない |
| reading/copying | 当該copy signal中止→全native close＋owner終了→hold release。共有PDF/他deliveryは停止しない。ZIP中間物は正規cleanupへ |

子timeout/生成失敗はfailedとして正当兄弟継続、明示/外部取消はcancelled、内容変更は既存ZIP_CONTENT_CHANGED除外、単なるread不可観測はNOTE_UNAVAILABLE除外。最後の需要を止める実終了待ちと、他需要に実所有を正当に引き継いだ場合を混同しない。futureのzip-child同士にも同じ有効需要集合を適用する。

## cleanup / purge / recovery / 配備の接続

- PDF `currentAnyPdfDemand` はactive current run/attempt/lease/deadline/latest target/exclusion/current actor/readとwaiting-pdfを条件にする。parent/attempt履歴90日だけで正当な受理済み需要を落とさない。copy-ready以降はrender需要でなくhold所有。
- PDF cleanup claim/cleanedと物理keyの `claimDelete` に、key→pdf_artifacts→`zip_pdf_holds state!='released'` 不在を追加する。未open heldにも同じpredicateを使う。DB guardもsource owner/holdが残るremoved/key-null/容量0を拒否する。hold新規取得側もdelete claim/cleanup状態を検査して対称化する。
- `zipWork.finishClosed`/request terminal guardは非released hold、zip-source owner、最後の需要停止待ちcomputeを除外条件へ加える。純cleanup負債だけで本人/global枠を永久保持しない。PDF artifact容量はPDF poolに一回、spoolはZIP poolに一回、holdはpinでbytesを二重課算しない。
- note trash/purge/現在WS削除/離脱降格は既存ZIP hookで現在runをfenceし、PDF待機・copyを同じ分類で中止する。purgeはhold/zip-sourceを実終了待ちへ含め、未open holdも解除確定前にobject列挙→removeへ進めない。先移出note/別actor/正当兄弟は保持。live_note_id切離しと旧attempt最小shellは既存履歴方針に従う。
- released holdは有限pruneで削除後、不要compute bindingを切り離す。PDF request/compute/artifact pruneにはhold/attempt FK参照除外を加える。PDF専有workspaceはholdが読む最終storage keyとは別なので、closed computeのworkspaceを不要に長期保持しない。元PDF実体removed/実remove receiptの前に容量を戻さない。
- bootは旧Node/監督/関連worker実終了証明→共通recoverOwners→PDF/ZIP需要とholdを一つの明示順序でrecover→通常pump。単なるlease期限/boot起動をclose証明にしない。初期heldも旧active runの回復対象へ含める。未完copyを自動再開して新holdを捏造せず、既存中断失敗/取消へ収束し、正当な既成功spool refを残す。回復順の途中でPDF cleanupが先に走らないようrunner開始は全回復Tx後。
- ZIP configなしの既存残存検査へhold/zip-sourceを追加。PDF configなしでもHTML/MD ZIPと資源0履歴だけは利用可能だが、waiting-pdf/非released PDF hold/依存する未終了compute・所有が残る状態で黙って回復/掃引を飛ばさない。明示boot拒否とする。removed PDF/ZIP・released holdだけの純履歴は拒否理由にしない。
- drainは新ZIP claim停止→待機/copy中止と所有完了→必要な最後のcompute終了確認→PDF runner/execution/supervisor停止→DB/lock終了。現在のZIP stop先行順を活かすが、ZIPの最後の需要終了待ち中もPDF pumpが進められることを確認する。unknownなら既存同様DB/lock正常解放へ進めない。

## PDF受付・表示と完成条件候補

保存format3形式を変更せず、ZipAvailableFormatをZipFormatへ統一しtransport enumへpdfを加える。HTML/MDの既存digestは同じまま、PDFも既存の固定format discriminantで区別する。新規PDF preview/受理/retryはPDF構成を検査し、未構成なら安全な説明で非受理。既存commandのreceipt照会は新しいPDF生成条件と混同しない。

UIにはサーバーの実構成から許可形式を投影し、構成済みだけPDF選択可能、未構成ならHTML/MDと説明を保つ案。`listZip` のconfigured booleanを壊さず `availableFormats` を追加する候補。旧job historyのformatは保存結果から表示する。第三需要はPDF単件ticker/本人履歴へ出さずZIP親子の進捗にだけ出す。copy-readyは完了数へ入れない。UI-S1 completion ticket/actor/context/ACK guardは変更理由にしない。

以下は未固定の8条件案。Managerが採否・正式IDを定める。

| 案 | 原要件 / 観測可能な完成状態 |
| --- | --- |
| A 型・永続 | EX/JB/CLAUDE: 正式第三需要/hold/ZIP所有が内向き型と同UoWで保存され、0031 clone/freshで旧全列・FK・trigger・期限を保つ。偽単件要求/独立需要表なし |
| B PDF受理・共用 | EX-01/02/04: PDFを選び固定対象で受理、既存本人/匿名との同内容compute/cache合流。500単件履歴を作らず、異内容active非混在/本人とglobal既存枠/未構成非受理を保つ |
| C hold→spool | EX-02/design: cache/publish同Txでcopy-ready+hold、未openからdelete阻止、実bytes/hash/全close後だけZIP子成功。PDF ready単独では成功表示しない |
| D 取消・兄弟 | EX-02/03/JB-03: ZIP当該需要だけ取消、正当な本人/匿名兄弟は完了。最後の需要・コピー中取消/期限は実closeまでrun/予約を保持、外部取消をfailedへ変えない |
| E ZIP成果物・取得 | EX-02/03: 実PDF entryの安全名/順/bytes/hashをSTORE ZIPへ格納し部分成功manifest、実1GB規則、全件失敗未公開、現在全含有read/contentを守る。元PDF24h後も正当ZIP7日取得、失権後非復活 |
| F retry・寿命 | JB-01/02: 最新failedのみ明示retry、旧成功spool不再生成、assembly中拒否、新親assemblyretry/期限内ref跨ぎをPDFでも維持。元親/attempt90日、PDF24h、ZIP7日を混ぜない |
| G UI縦接続 | EX-02/03/JB/OR-09: 同bundleでPDF選択→進捗/離脱再訪/本人結果→native ZIP/通知/取消/retry。viewer/current context・390keyboard・UI-S1/ACK維持。抽出した実PDFの全page確認 |
| H 実資源・固定 | design/CLAUDE: PDF/ZIP別予約と既採用headroom、hold込みpurge/prune/boot/drain/unknown、小real-close対/規定checks/旧保全/自己通常回収/候補指紋/全停止を揃える。全1GB/全OS保証を足さない |

## 旧条件の実変更見込み・検証・見積り

これは先行reopen依頼ではない。正式着手後に実path/責務を報告し、Managerが影響部分だけ判断する。

| 予定差 | 旧条件の見込み / 限定再確認 |
| --- | --- |
| 需要型/compute current/worker publish/fail/recover | P4d-2-A/C/F/G、P4d-3-A/C/F。第三需要の合流/取消/publish/保持対だけ、匿名署名/rate/no-JS全行列は不変更 |
| hold/migration/object owner/physical delete/purge/prune | P4f-1-A/F/H、P2d-2-E/B/C/FD、P3f-D/H、既移行保全P4a-H/P4b-G/P4c-K/P4d-2-H。旧column/trigger/物理byte/容量/FTSの差を正確に比較 |
| PDF snapshot選択とcopy→実ZIP | P4d-2-B、P4f-1-C/D/E。実保存済み本文/媒体と同bundle PDF全page、renderer/font/binaryを変更しなければ既隔離/全matrixを借用 |
| PDF形式/履歴進捗/通知 | P4f-1-B/G、P4d-2-E、P2a-E。PDF job重複表示なし、copy前成功なし、既UI-S1不変。選択portを変えない限りP3e-Bは再open理由にしない |
| 起動/停止順と構成 | P1-E/P2d-2-FD/P4d-2-G/P4d-3-Fの実影響。資源0履歴許可/必要構成なし拒否/未知stop保持を小対で |

検証は、pure型/phase guards/identity別名・未構成UI、自己DBのcache/publish同Tx rollback・3需要共有・期限等号・prune100・FK、実storageの未open hold/key-delete・reader/write close gate・短過読/hash/cancel/unknownへ分ける。失敗注入のfake rendererと実Chrome成功を混ぜない。最後に既固定Chrome/fontsで同bundle実PDF ZIP（日本語/両saved style/小画像・表/code・複数pageの小集合）を取得し、ZIP entry名/順/bytes/hashと抽出PDF全pageを確認する。PDF skill/manual-testはその実ファイル/実UI作業前に適用する。外部URL通信/Drive/LLM/mail/OAuthは使わない。

期限は注入Clockの自己対で24h内hold→期限跨ぎcopy、期限後新hold拒否、コピー済ZIP7日等号、合法retry期限跨ぎを検査する。fresh時刻を改変しない。1GB±は同検査器の算術/小閾値stream、500は既受入受付根拠と第三需要の非複製を確認する小集合を組み合わせ、500実Chrome生成や全1GB負荷を新gateにしない。

工程見込み: 型/0031/需要hold/clone 2〜3h、copy・close・cancel/recovery 3〜4h、受付/UI/履歴 1h、関連回帰/同bundlePDF ZIP/保全回収固定 2〜4h。合計8〜12h、独立別。最大の技術リスクは第三需要predicateの抜け・最後の需要と兄弟所有の終了区別・hold releaseとcopy成功Txの競合であり、ライブラリや新OS配備ではない。最初の正式15分報告で採用signature/DDLと実変更影響を確定し、未成立をdoneへ落とさない。

本書はgoal-implementの「共有契約を編集前に報告」「実変更後に影響条件を判断」の手順に従った提案のみ。全文静的確認後に本書を含む全読取/書込みを停止し、製品/実行環境の新操作はManagerの正式委譲まで開始しない。
