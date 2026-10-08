# P4d-2 本人単件PDF・限定詳細提案

2026-09-20 05:58:45 JST時点の読取提案。正式P4d-2開始・採用判断・製品実装ではない。書込はこの文書だけ。P4d-1のsource/proof/reportと独立検証には一切介入していない。goal-implementの役割分離に従い、全体goal/管理正本はManagerに保持する。

## 要点と判断依頼

採用designのrequest/compute/artifact/deliveryを、既存短期HTML/MDとは別の4表・4repoで実装する案を推奨する。ここでの「本人」はjobの実行者本人であり、note著者/owner限定ではない。現在閲覧できるowner/editor/viewerを含む。

追加判断は次の具体化に限定する。

1. 専用compute workspaceは既存ObjectStorageの別rootインスタンスにせず、compute自身の永続所有と監督に置く。完成PDFと配信readerだけは既存単一storageの新owner kindに接続する。
2. メンバー変更時のPDF取消を既存編集jobの条件へ混ぜず、全降格/除名/脱退で専用のindexed同Tx取消を呼ぶ。SQLite内の行数依存処理時間を確認し、成立しない場合だけ永続fence追加を再提案する。
3. 今回検証するNode参照配備は、実証したmacOS arm64＋明示Python/Chrome/font配備物とする候補。利用者の将来本番OSを決めた意味ではない。Linux/GCP imageを同時に完成扱いしない。別の本番対象を選ぶなら、その対象だけの配備差を別途確認する。
4. PDF並行生成1・待機queueなし、配信2、生成30秒/全作業120秒等を小規模の初期技術設定として提案するが未採用。byte予約は設定必須とし、未測定のGiB数を保証値として既定採用しない。短期HTML/MDの2slot/2GiBを先に保護する。

P4d-1は現在独立検証中で、Managerから06:02:41の明示channel-close hold後の取消でPDFが公開される不成立通知を受けた。正式報告/全停止/差戻しを待ち、修正・同時再現には一切介入しない。是正され正式採用された最終監督/close契約だけを製品へ移植する。現在の試作を製品採用しない。

## 照合した正本と現在source

`design.md` P4-Q2と「単件PDFの製品接続」、`P4d-product-contract.md`全文、EX/JB原文全文を読み直した。最初のread24028は遅延後exit0となり、一部出力切れは分割再読で補った。以下は製品sourceの読取事実で、動作試験ではない。

| 現source | 接続上の事実 |
| --- | --- |
| `application/export/ports.ts` | account authorityはaccountId＋sessionHash。`ExportOperation`はpreparing/ready/sending/cleanup、claimSendとretireがある。PDFの長寿命要求へそのまま流用しない |
| `adapters/libsql/repositories/objectOperationRepository.ts:18` | `ownerActive`は種別ごとに現在note/WS/session等を検査。export-operationは現在noteを使い、既存bound writerのownershipGenerationとは分離されている |
| 同file:71 | `recoverWrites(runtime)`は異なる全runtimeのwriterをinactive化し、未完objectDeletesも消す。PDF旧Chromeの実終了前に呼べない |
| `adapters/node/coordinatedObjectStorage.ts:115` | rootごとの初期化が上記recoverWritesを呼ぶ。別PDF directoryへ二個目を作るだけでは既存writerを壊す |
| `adapters/libsql/repositories/purgeRepository.ts:279/316/426` | captureは100件ずつexportを含め列挙し、finish直前にもcapture＋hasWritersを再確認。PDF資源とprivate workspaceを双方へ接続しないと先行完了する |
| `application/workspace/membership.ts:126` | 既存job取消はold非viewerかつnextがviewer/nullのとき。viewerのPDFとowner→editorの降格は、この既存編集job条件だけでは覆えない |
| `adapters/libsql/repositories/workspaceRepository.ts:186` | 既存conversion/reference取消は現在note所有WSでindexed SQL更新する。旧受理WSだけを使っていない |
| `apps/web/app/server.node.ts:155/350` | Nodeのexport reader/worker/停止を明示配線。新PDFもHTTP停止→実資源終了→DBcloseの寿命へ接続が必要 |
| `apps/web/Dockerfile.gcp` | GCP用node:22-slim/別launcherのtemplateで、固定Chrome/font/Pythonを含まない。これをNode PDFの検証済みimageとは扱えない |

core pathは `packages/core/src/` 基準。既存source内容・依存・鍵・DB・HTTP・browserは変更していない。

## 最小の型とports

新 `application/pdf/` に提出/本人照会/取消/再試行/配信準備/worker orchestrationを置く。framework/Node型はadapter内へ閉じる。新 `domain/pdf/` はID、状態union、固定期限、同意した要求設定等の純粋規則だけを持つ。採用済み責務の具体型案であり、ここでコードを生成しない。

| Port | 入出力と不変条件の具体案 |
| --- | --- |
| `PdfRequestRepository` | actor accountId＋commandId＋正規化payload digestの同内容受理/照会、本人keyset、同本人取消、failedからの明示新retry。pending/cancelled/failed/succeededのunion。本文/manifest/raw sessionを履歴へ返さない |
| `PdfComputationRepository` | noteId/contentIdentity/profileでjoin-or-create、note一意active/stopping、claim/renew/stop/closed、需要のkeyset cursor、workspace予約/回収状態。lease tokenだけで実終了を断定しない |
| `PdfArtifactRepository` | 一致かつ期限内cache、writing→readyの原子的採用、publishedAt＋24h、期限/失効→cleanup、物理remove後だけ完了。成果物bytes/SHA/filename/profileを保持 |
| `PdfDeliveryRepository` | 現在本人/要求/artifactに紐付く一回の送信claim、固定短期期限、reader世代、実close/回収。既存artifactを送信終了だけで消さない |
| `PdfBinarySourceReader` | 現在認可済みmanifestの型付きobject/inlineだけからbinary chunk＋`closed` Promise。O_NOFOLLOW/regular/bytes/SHA/abort。raw path/Buffer/provider errorは外へ漏らさない |
| `PdfWorkspace` | 計算世代へ束縛したopaque handleのprepare/seal/remove、実bytes/予約/回収負債。固定slot indexと少数種類の資源だけ。外部URLを開かない |
| `PdfRendererSupervisor` | rendererProfile＋sealed handle＋signal→PDF chunk、完了結果、実`closed`。child PID/PGID/flock/channel headerはadapter内。cancel要求とclosed確認を別結果にする |
| `PdfServiceCapacity` | 短期枠保護を含むSQL予約/確定/実remove後解放。owner/WS保存quotaには課算しない。生成枠と回収負債を分ける |

repoは新Hollow UoW contextのtyped field、process/file/cryptoはNode adapter、HTTPはpresentationへ置く。`Date.now`等を内側へ入れずClock/IDを注入する。現在HTML/MDのdata URI reader、120秒operation、同session比較、serializerには変更を入れない。

本人PDF authorityは永続 `{kind: account, accountId}`。提出/一覧/取得の入口では現在sessionを検査し、workerは内部専用のstored-authority resolverで現在account/現在note/現在scope又は独立current-publicを検査する。認証不要の外部APIへaccountIdをそのまま渡せる形にはしない。

後続匿名用のlink/public判別unionとticket境界は追加可能にしておくが、今回のtransportはaccount分岐しか受け付けない。匿名専用32B key ring/HMAC/1KiB claims/受理から固定10分は採用済みだが、本人sliceのために鍵を導入しない。本人native取得は推測困難なdelivery IDに加えて現在本人sessionを必須にし、IDだけで読めるbearer URLにはしない。

## 新SQLite migration案

旧migrationの改変・再適用はしない。次の新migrationで4表と必要な索引/CHECKだけを追加し、旧全列・trigger本文・FKをclone比較する。下記は責務を示す最小field案でありSQL詳細は正式委譲後に確定する。

| 表 | 最小fields/index/check |
| --- | --- |
| `pdf_requests` | id/accountId/commandId/payloadDigest、immutable targetNoteId、nullable liveNoteId、requested identity/settings、computeId/artifactId、state/failure、createdAt/historyExpiresAt、retryOf、version。UNIQUE(accountId,commandId)、本人(createdAt,id)、非終端(accountId,liveNoteId,state)索引。succeededだけartifact必須、cancelledは失敗理由を持たない |
| `pdf_computations` | id/targetNoteId/nullable liveNoteId/contentIdentity/rendererProfile、queued/running/stopping/closed、generation/claim token/leaseUntil/deadline、workspace identity、pack/output予約、cleanup state/cursor。active/stoppingのliveNoteId partial UNIQUE。note FK RESTRICTはworkspaceと残債務が消えるまで維持 |
| `pdf_artifacts` | id/targetNoteId/nullable liveNoteId/contentIdentity/profile、storageKey、writing/ready/cleanup/removed、bytes/SHA/filename/notices、publishedAt/expiresAt、cleanup token/lease。readyには完全なfile情報・期限必須。cache lookupはnote/identity/profile/state/expiry |
| `pdf_deliveries` | id/requestId/artifactId/accountId、ready/sending/closing、generation/claim token、createdAt/expiresAt、runtime reader owner、closedAt。未close同requestを部分一意、expiry/cleanup索引。短期readerを90日履歴へ複製しない |

要求の表示寿命はcreatedAtから90日、artifactは実体close後に同Txで公開したpublishedAtから24h。どちらも取得/retryで元期限を延長しない。期限外title/詳細はSQL/DTOで非表示、未close/cleanup用の最小shellだけ残す。

物理note FKを単純CASCADEで消してwriter/cleanup所有まで失う設計は不可。purge.finishが全PDF回収/実closeを確認してから、同Txで要求/compute/artifactのliveNoteIdを解消し最小削除済みshellへ移す。active又は物理負債ありではliveNoteId必須、compute closedかつworkspace回収済み/artifact removedだけnullを許すCHECKにする。24h回収後もrequestが参照するartifactはremovedの最小shellを残し、readyと偽らず期限切れ/削除済みを表示する。元note識別子・元日時を保持しても本文/CSS/manifest/storageKeyをshellへ残さない。delivery/compute/artifactの関連FKは、物理負債のあるrowをpruneできない方向に置く。account FKもAC-09の将来実削除で資源所有をcascade消去しない。今回account削除機能は実装せず、先に取消/実close/最小shell化する専用repo接続点を残す。

物理所有行の独立寿命が4表内のworkspace/cleanup fieldsだけでは表現できないことが判明した場合に限り、専用resource tableを再提案する。最初から全将来ZIP/task汎用schemaへ広げない。

## SQLite・物理所有の危険な境界

### storage ownerとboot

private input pack/Chrome profile/tempは `PdfWorkspace` とcompute rowの所有にする。既存ObjectStorageへ二つ目のrootを追加しない。完成PDFを既存storageへコピーする部分は `WriteOwner: pdf-artifact`、送信中readerを保護する部分は既存export-operation/sendingと同じ発想の `pdf-delivery` を追加する案。

`ownerActive` の新分岐は現在note lifecycle/現在WS active、compute/artifact/deliveryの正しい世代と状態を検査する。過去WSやnote ownershipGenerationだけで同内容移動を落とさない。既存media/referenceのbound writer fenceは変更しない。登録・publishの現在Clockを使い回さず、その時点ごとに評価する。

bootはHTTP受付/通常writer回収より前にPDF監督ledgerを照合する。旧親PID不在を旧Chrome終了とみなさず、flock/GO/実group確認を満たさない間はrecoverWritesを実行しない。未知PID/壊れたledgerはfail-closedで未知processをkillしない。ここは起動を妨げ得る実運用上の停止であり、PDFだけを無言で再起動して旧書込を放置しない。

既存共通storageへ最終出力をコピーする時点はrendererが実close済みなので、外部Chromeがそのstorageへ直接書かない。旧Chromeが使えるのは計算専用workspaceだけ。とはいえ共通object writerをinactive化する前に旧Nodeコピー/配信reader終了も確認する。複数resource-rootのglobal recoverWrites問題を、別runtime IDを増やすだけで解決したと言わない。

### purge・現在所有・late delivery

`purge.capture` にartifact keyを100件以下ずつ列挙し、`hasWriters/finish` はPDFのcopy/read ownerと非終端compute/private cleanup debtも確認する。PDF private workspaceのremoveが失敗すればnote purgeは完了にしない。元媒体には新holdを作らず、pack中の消失/改変は生成失敗にする。

元noteが先に他WSへ移出した場合は、現在note所有が判定元。旧WS削除でそのcompute/artifactを巻き込まない。先に現WS削除が確定した場合は新source/read/register/publish/配信claimを拒否し、不可逆cleanupだけを継続する。

native GETは、現在認可/内容一致→delivery claimとreader owner登録→open→実体bytes/SHA確認と現在snapshot再照合→attachment responseの順。read開始から最終照合までの失効/変更を成功へしない。全fileをJS bufferにせず、事前検証パス又は前回sealed fileの強い所有と実readの照合を使う。ヘッダー送信後の変更で既取得byteを回収する保証はしないが、失効/期限/切断時のabortと実closeは維持する。

期限やleaseだけでreader ownerをinactive化しない。実close前はartifact delete/予約解放を拒否、遅いreaderのfinallyも同delivery世代だけをcloseできる。送信終了で24h artifactをretireしない。ready artifactの期限前早期evictでdiskを空けない。

## 取消・singleflight・履歴

通常logoutや元session期限で本人要求は止めない。workerはcurrent accountと現在readを内部で再検査し、再ログイン後は同accountの現sessionで履歴/取得する。accountは同じでも失効sessionからの新APIは拒否する。

`mutateMembership` にはPDF専用のrank判定（owner→editor/viewer、editor→viewer、全role→離脱）を足す。既存conversion/reference/batchの条件を無関係に拡張しない。現在note ownerWorkspaceIdで対象本人の非終端PDF要求だけを同Tx取消し、成功済み/別actor/先移出/兄弟を保持する。viewer PDFがあるためold viewer→nullも必要。再参加/再昇格で旧requestや旧leaseを復活させない。

第一案は既存と同様のindexed SQL UPDATEであり、全履歴をJSへ読まない。多数active rowで許容取引時間を超えるならTx全体が安全に失敗することを確認し、遅いoutbox取消だけに変更しない。永続fenceを追加する場合は、同内容移動時の現在scopeと過去scope再入場を誤判定しない正本が必要なので、未検証の単純workspace epochを今採用しない。

本人がcancelした要求だけを終端化し、有効な兄弟demandが残る計算は止めない。noteのactive/stopping computeは一つ。異内容の新要求は旧停止/終了を待つ必要を説明し、旧計算へ別内容を混ぜない。最後の需要消失→stopping→abort→外部取消をcleanup完了まで監視→実close→slot解放とする。close中の新joinは新旧世代を跨いで受理しない。

需要はindexed EXISTS＋有限keyset走査。最初の50件が失効しても全需要0と断定せずcursorを進める。publish直前は少なくとも一つの有効demandと現在identityを同Tx確認する。同Txの最後の取消と新joinを直列化する。compute終端の全request一括JS fanoutはせず、有限 projection/updateで表示を整合する。

履歴page50、prune100/stepなどは実装バッチ値候補であり履歴総数capではない。失敗のretryは現在同対象/同設定で新requestを作り旧jobを保持。取消/成功は元操作のやり直し。同commandのACK照会は新要求ではない。本文なし、失効、運用busy/構成不足、timeout/renderer故障を区別して表示する。

## 本人HTTP/UIの縦slice

提出POSTにcommandId/noteId/現在保存版確認用identityを持たせ、現在のsaved snapshotのみを対象にする。dirty editorを自動保存・送信・破棄しない。短い受理結果はrequestId/状態/本人DTOだけで、storageKey/path/内部channelを返さない。

本人照会GET、cancel POST、failed retry POST、delivery準備POST、native GETを専用boundaryに置く。同actorの旧操作でもactor epoch/note/request世代を照合する。ACK不明は同command照会を維持して新ID自動再送しない。readyで既存の編集画面を保持する取得方式を使い、404/期限/通信断でもdirtyを失わない。download開始を端末保存完了と表示しない。

job/tickerは本人だけ。既存import/reference/batch/WS削除と件数・通知・独立dismissを共存させ、初回terminalを新transition通知にしない。生成中の画面離脱は取消ではない。本人完了jobの新取得は現在scope又は独立current-publicで認可し、古いmembershipの喪失を永久blacklistにしない。旧本文と現在内容不一致なら旧artifactを渡さず、閲覧可能な本人に明示新作成を案内する。

匿名route、署名ticket、no-JS Refresh、/s nonce/rate接続は後続。今回の本人jobを匿名画面へ仮表示しない。ZIPも実装しない。

## Node配備・暫定技術値

今回検証するNode参照配備候補は現在実証対象のmacOS arm64/Node22.22.3で、利用者の将来本番OSを選定したものではない。別の本番OSが選ばれればそのOS用Chrome/監督/依存だけを追加照合する。GCP Dockerfileや未起動Linux環境を現在成功扱いせず、全OS/Linux実測を今回の自動gateにもしない。

最小導入手順案:

1. build/deploy用の明示install/verify scriptを新設し、固定Chrome153.0.8010.36、Puppeteer Core25.11.0、固定Noto本文/mono font、ライセンス、監督shimをimmutable runtime manifestへ固定する。ブラウザbinaryはOS/arch別digestを選び、不一致は失敗。起動時のdownloadはしない。
2. Python3を明示runtime prerequisiteとし、絶対pathとversionを配備設定へ固定する。試作では3.14.3を観測したが、通常Nodeに当然入っているとはしない。fcntl/flock/POSIX group/stdio/execのself-checkを用意する。Pythonを使わない代案はnative監督実装の別検証が要るので今すり替えない。
3. `PDF_RUNTIME_DIR`、`PDF_WORK_DIR`、`PDF_PYTHON_BIN`等の設定名を正式実装時に固定。runtimeはread-only、workspaceは0700、app cookie/keyを置かない。Chrome sandboxを有効に起動できない配備ではPDFを構成失敗にし、no-sandboxへfallbackしない。
4. bootはmanifest digest/ライセンスprofile/実行前提/残存ledgerを照合し、合格後だけPDF受付を開く。未構成は偽jobを返さず明示し、既存HTML/MDを使用可能に保つ。設定誤りが旧storage owner安全回復を妨げる場合のfail-closedは別扱い。
5. 同配備物で小さい実PDF/全page/取消/再起動を検証し、そのbyteを最終bundle/runtime manifestへ結び付ける。ホスト変更、sudo、Docker起動、外部送信等の許可をこの提案から推測しない。

| 技術値候補 | 根拠と未実証 |
| --- | --- |
| PDF生成1、別note queueなし | 一つのChrome treeを直列実証。サービス規模の並列能力は未測定。既存HTML/MD2slotは別枠 |
| channel4reader/slot4回、64KiB供給 | 小fixtureで実要求はslot毎1回、保持4reader/5番拒否の自己根拠。P4d-1独立結果が正本。合法最大入力全体への十分性は未測定 |
| renderer30秒、pack→採用全作業120秒 | 小fixtureの1〜3秒前後に対する初期運用案。正当な大入力はtimeoutとなり得るが権限/内容不正に分類しない。未採用値 |
| delivery2、1request同時1、短期120秒 | HTML/MD保護と有限reader所有の最小案。高負荷/遅いclientの実測なし。anonymous ticket10分とは別寿命 |
| lease60秒、wake2秒、1wake最大20step | 既存runnerの有限運用形と整合させる候補。leaseは物理I/O期限・終了証明ではない |
| 作業/保持/全service byte枠は明示設定 | 数値を自動採用しない。正確pack bytes＋設定output/workspace/native-temp予約＋ready実bytes＋cleanup debtを足す。短期2GiBを差し引いたPDF枠を超えれば受付拒否し、未構成/恒常不足と一時busyを区別 |

P4d-1のRSS合計は共有page二重計数を含むsampleで、物理RAM/OS強制capではない。1GiB/64MiB/単件1GBを業務上限に持ち込まない。既存の800KiB本文/20MiB画像/200MiB動画を受理できることと、各配備の有限資源内で全例が生成成功する保証は別である。今回最大容量試験・native hardcap測定は一切行っていない。

## 観測可能な受入分割候補と見積り

正式ID/採否はManagerが固定する。下記は本人縦sliceの内部順序で、途中を全製品PDF完成にしない。

| 候補 | 観測可能な結果 | 作業見込み |
| --- | --- | --- |
| 接続基盤 | 新migration clone全旧列/trigger/FK保全、型付き状態/同command/一意compute、配備self-check、既存HTML/MD不変 |1.5〜2.5h|
| 本人生成/取得 | owner/editor/viewerが実PDF、進捗→自動native取得。2style/媒体/本文なし/filename、dirty/ACK/actor ABAを同bundle確認 |2〜3h|
| 寿命・取消 | logout継続、再login本人履歴、降格/離脱同Tx取消、新要求許可、兄弟需要、24h/90d境界、cache再利用/内容不一致 |1.5〜2.5h|
| 回収・再開 | late write/late delivery、先移出、purge/WS、remove失敗負債、lease切れ旧process、boot/正常drainを小隔離＋自己対象だけで実証 |2〜3h|
| 固定 | 規定checks/同bundle実file/UI、旧保全・自己回収量・製品only commit/配備manifest/全停止 |1〜1.5h|

合計初期見込み8〜12.5h、独立検証別。環境待ちや配備対象変更は別途再見積り。匿名/ZIP/P5を同時に完遂する見積りではない。

重要な故障対は、①snapshot後元媒体消失/改変、②PDF close中取消、③publish Txと最後の需要取消競合、④delivery open後/response前の権限・本文変更、⑤expiry到達中reader保持、⑥purgeと遅いwriter/reader/第二put、⑦先移出後旧WS削除、⑧global recoverWrites前の旧Chrome存在、⑨旧lease/finallyが新世代を終了しない、⑩90日表示消失後も物理負債保持。既存FD300回や全UIを無関係に再実行せず変更責務の対に絞る。

## 実編集した場合だけの既受入影響候補

現時点製品編集0で再open要求なし。planの固定条件を読んだ上で、将来の実差分に応じて報告する。

- writer/claim/delete/purge/FK/minimal history: P2d-2-B/C/E、P3f-D/H。WSの旧未終端取消追加でP3f-E。
- membership専用PDF取消: P3b-1-D。設定name/description/slugを変更しなければP3b-1-Eは対象外。
- boot/HTTP/bundle/Python/runtime手順、実drain→DBclose: P1-E、P2d-2-FDの停止責務。
- 本人jobs/ticker/通知/retry/cancel: P2a-E。詳細download islandの実編集にP4b-F、公開/profile islandを触らなければP4c-J全体は自動再openしない。
- snapshotの共通純粋選択/現在認可helper抽出: P4b-A。HTML/MD serializer無変更ならP4b-B/Cは保持。
- 共通service予約又はexport既存回収接続の実変更: P4b-D/G。本人sliceでは/s rate/cookie/匿名nativeを変更せず、P4b-E/P4c-Iを未編集のまま再openしない。

## 未実施・停止

この提案で行ったのは文書/source読取と本ファイル作成だけ。依存追加、製品コード、移行、DB、HTTP、Chrome、proof、鍵、test/build/git操作なし。P4d-1独立結果を未確認のまま受入とはしない。全文確認後、文書を含め停止してManagerへ返す。
