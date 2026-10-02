# P5c-2 原本バックアップ：静的設計案

2026-09-30。Manager採否用。原本単件の手動backupを先頭に、自動・一括・取消・履歴へ同じ転送契約を接続する。実装開始許可ではない。S5b-3の製品/dist/proof/runtimeは停止・固定のまま、未完のfolder付き再連携・same-ID folder作成・文書寿命をdoneにしない。本書だけを編集した。製品/DDL/lock/管理正本/helper生成/DB/ブラウザ/実API/鍵/費用0。公開資料のWeb読取は実Google接続ではない。

## 根拠と完成対象

入力はbrief、design「Google Driveの連携境界」、[P5c-proposal](P5c-proposal.md)、原文[IN-05/06/09](../../spec/scenario/integration.md)、[IM-01](../../spec/scenario/import.md)、[OR-09/11](../../spec/scenario/organize.md)、[JB-01〜03](../../spec/scenario/jobs.md)。利用者決定を維持する。

- 手動は操作本人、自動はupload本人のDrive。WS owner/editorは可、viewerは不可。変換の成功・失敗とbackupの成否を分離する。
- 自動ONは過去原本へ遡及しない。原本なしは操作対象外、既backupは再送せず成功、多重実行は永続的に抑止する。
- 新連携成功時だけ、同subを含む旧転送を取り消す。新認可失敗時は旧資格・旧転送を保持し、通常refreshは取消対象外。
- 解除・trash・失権・WS変更等では新chunk/refresh/readを止める。取消intentと実closeを分離し、実close前にpin/枠を解放しない。Google上のfile/folderをdelete/trash/revokeしない。
- folderがtrashなら復元/再選択/新規作成を確認付きで案内。404等の所在不明を永久削除に見立てず、自動代替しない。永久削除を十分に証明できた場合の原文自動再作成は未達のまま保持する。
- 本人履歴90日と、存続noteに必要なbackup記録は別寿命。公開URL、LLM月30回、音声変換保留は変更しない。保存済み音声原本のbytes backupは変換再開ではない。

## 現コードとの接続点

| 公開source | 確認した現状 | 必要な差 |
| --- | --- | --- |
| application/import/acceptUpload.ts | storage.putでbytes/hashを取得し、note/original/conversion jobを同Txで保存 | 同Txにauto intent。外部I/Oは追加しない。検出/変換失敗でも原本が成立した場合は独立受付 |
| domain/import/entity.ts | Originalにid/noteId/accountId/storageKey/bytes/sha256。既上限は非音声50MiB/音声200MiB | 原本identityをそのまま固定。本文版やLLM用途を転送identityに混ぜない |
| application/integration/drive/ports.ts | OAuth/folder/control用、Execution targetはauthorization/controlのみ | backup target、転送provider、source owner、session秘密purposeを明示追加 |
| drive/connection.ts adoptDriveCandidate / control.ts disconnectDrive | 採用/解除Txでepochと旧control失効を確定 | 同Txで旧backup cancel fence・auto OFF、commit後にexact owner abort |
| drive/credentials.ts | refreshOwnedCredentialはcontrol rowの所有/使用資格版へ束縛 | backup所有でも同じ資格CASを使える閉じたunion。controlを偽装しない |
| domain/integration/drive.ts / libsql/driveSchema.ts | autoBackupはliteral false、DB CHECKもauto_backup=0 | boolean提供には限定DDL変更が必須。別表の隠れた第二正本にしない |
| application/ports/objectStorage.ts | openOwnedReadにbody/closed/close、withOwner。LLM readerは最大50MiB全量buffer | backup専用有限stream/range契約。LLM reader流用・200MiB全量bufferなし |
| domain/purge/entity.ts / node/coordinatedObjectStorage.ts / libsql/repositories/purgeRepository.ts | owner kindと実close不明の保持、hasWritersが各jobを確認 | drive-backup owner/pinと実終了不明保持を追加。通常finallyで解放しない |
| note/trash.ts / note/purge.ts / workspace/membership.ts / move/usecases.ts / workspace/deletion.ts | 既処理取消・所有世代変更・purge保護の接続点 | 同Txのbackup取消/確認集合/物理削除順を追加 |
| notes.$noteId.index.tsx / BatchSelectionBar.tsx | Drive未提供表示 | 単件状態/リンク、選択操作、本人backup履歴とtickerを接続 |

Nodeだけを対象にする。既HollowContainer/UoWへ明示repository/servicesを加えるが、認証・LLM・他runtimeの広域再構成はしない。S5b-3のsource/built二重classを製品で再現する構成は採らない。

## 公式前提と実装上の帰結

2026-09-30のGoogle公式資料読取。resumableは小fileにも使用可能、初期応答のLocationを保存し、非最終chunkは256KiB倍数。中断後は空PUTのstatus照会を行い、308のRangeを受信位置の正本にする。200/201は転送完了、session 404は期限切れ。session URIは1週間で失効する。事前生成IDを用いたfile作成は再試行の重複を避け、成功後の再作成は409になる。これは外部実測ではない。[Upload file data](https://developers.google.com/workspace/drive/api/guides/manage-uploads)

File metadataはparents/size/appProperties等を持ち、sha256Checksumは利用可能な場合に返る。欠落をhash一致と扱わない。webViewLinkは表示用でありサーバーfetch先にしない。[File resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)

一般fileの404は不存在と権限不足を区別しない。storageQuotaExceeded、権限、rate、provider障害は有限codeに分ける。session endpointの404とfolder/file metadataの404を同じ意味にしない。[Resolve errors](https://developers.google.com/workspace/drive/api/guides/handle-errors)

以下はその資料を用いた設計提案であり、Googleが保証するHollowの振る舞いではない。Google形式への変換はせず原本binaryを保存する。既drive.file/明示選択folder/shared Drive/resource-key境界を維持し、必要なsupportsAllDrives等をcreate/getへ渡す。[files.create](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create)の契約対と実接続待ちを分ける。共有Driveへ事前ID/resumableを組み合わせる実適合も未検証であり、無言に対象外へ縮小しない。

## 同一性と保存モデル

実行identityはactor=credential owner、verified sub、受理時epoch、note ID/ownershipGeneration/owner scope、original ID/storage identity/bytes/hash、folder ID/resource-key/driveId・設定版。各外部stepの使用credentialVersionは別に持ち、通常refreshだけで受理identityを失効させない。

重複抑止はまず `(originalId, credentialOwnerAccountId, subject)` とする。同じbytesを持つ別noteの原本は、削除・移動・再生成の寿命が違うためhashだけで全利用者共通化しない。既confirm済recordがあれば新bytes送信0で「既にバックアップ済み」と返し、設定folder変更や同subの新epochで既recordを付け替えない。別actor/subの成功を借用しない。

新表は次の5表を候補とする。履歴とlogical targetを同一行に詰めて90日pruneする設計を避ける。

| 表候補 | 内容・不変条件 | 寿命 |
| --- | --- | --- |
| drive_backup_requests | actor/command/digest、manual/automatic/bulk、作成時固定対象集合、cancel flag、親集計版 | 本人表示はcreatedAt起点90日。再試行で元期限を延長しない |
| drive_backup_jobs | request/ordinal/attempt/retryOf、note参照、安全な名前snapshot、状態・有限失敗、bytes進捗 | 本人90日。削除noteは安全snapshot化、現在権限なしの内容を返さない |
| drive_backup_targets | 上記dedup key、事前file ID、opaque marker、最初の送信先folder、logical状態、active transfer ID/版 | 存続原本の重複抑止。ACK不明を期限だけで消さない |
| drive_backup_transfers | target/job、epoch/実使用資格版、cancel generation、step intent、encrypted session、受信offset、runtime/owner/closed proof、read pin | 実owner/pin/外部不明の解決まで保持。履歴pruneと独立 |
| drive_backup_records | confirm済targetからだけ生成。note/original/owner/sub/file/folder/bytes/hash、成立日時、検証済表示link、resource-key秘密 | note存続中保持。job FKのcascadeで消さない |

recordの原本hashは送信元identityであり、Googleにhash fieldが無かった場合の遠隔bytes検証成功を意味しない。P5c-3は必ず取得全bytes/hashを照合する。遠隔checksumが返った場合は一致必須。recordはcredential envelopeを複製せず、旧epochの値は来歴として保持するだけ。

types/mapper/CHECKでphaseとowner、session存在、offset 0..bytes、intent range、取消済の送信禁止、成功recordの必要metadataを一致させる。target uniqueと同target live transferのpartial uniqueを持ち、actor+commandの再送はdigest一致だけ同receiptへ戻す。別payload・ABA・跨表command衝突を拒否する。provider file ID/markerは初回副作用前に保存し、unknownになってから別IDを発行しない。

### DDLと旧保持

次番号の正式migration（現HEADでは0039候補）とsnapshot/journal追記を提案する。上記5表を加算し、auto_backup=0固定CHECKを変えるためdrive_connectionsだけを限定再構築する。既auto_backup全値0、全旧列/NULL/PK/FK/index/trigger/ledgerを比較保存し、既資格/epoch/folderを再暗号化しない。新CHECKはauto_backup in(0,1)、ONはlinked/needs-relinkかつfolderあり、unlink/adoptでOFFを要求する。ONへ変更する操作はlinked限定。needs-relinkになっただけでは既利用者設定を無言でOFFにせず、送信を停止して新auto jobを再連携必要の失敗にする。0038/旧migrationは変更しない。

現drive_connectionsはaccount_id PK、accounts(id)へのON DELETE RESTRICT。資格JSON・folder JSON・last_used_atのNULLをbyte/値同値で保持する。drive_connection_update_guardは本表のversion/epoch/sub不変条件を持ち、drive_control_update_guardは本表をsubquery参照する。限定再構築では関連triggerを列挙して退避・再作成し、旧table名への参照rewriteやtrigger欠落を許さない。接続表を参照するFK/trigger/indexのsqlite_schema集合を前後比較し、意図したauto設定の差だけを許可する。旧tableのrename後に参照先を黙って旧名へ残す方式を避ける。

接続repositoryのchange unionにauto-settingを加え、epoch/credential不変・settingsVersion+1・autoBackup以外不変を検査する。利用者のauto-settingによるON/OFFとは別に、強制OFFを許可・必須化するのはadopt/disconnectとし、refresh/invalidate/touchはauto設定を変更しない。epoch変更時OFFとauto変更時settingsVersion+1はDB guardでも拒否可能にする。全旧値比較に加え、旧CAS/同sub制約/更新版飛び/不正FK/新auto条件の拒否対を持つ。正式migrationの一つのtransaction内でcopy件数/全列同値/FK確認を完了し、SQL中断・copy失敗・trigger再作成失敗・末尾FK assertion失敗で旧表/全旧値/trigger/ledgerが丸ごと残ることをsynthetic cloneで確認する。書込runtime停止とopaque保全の別許可前に適用しない。

object_writes.kindは現schemaでtext型・固定CHECKなしなので、type追加だけで旧object表の再構築は不要の見込み。backup job履歴は新表で安全snapshotを保持し、既conversion専用job_result_snapshotsのunion/DDLを不要に広げない。FK/trigger実定義を確定するDDL差が上記を超える場合は再申告する。新DB局所/旧fixture clone移行検証は別委譲時のexact容量・保全許可を要し、現actualfresh/旧保全物を開かない。

## 転送と受信位置照会

転送状態は `queued → checking-source/folder → allocating-id → initiating → uploading ↔ reconciling → verifying → succeeded`、別にfailed/cancelledを持つ。物理ownerはnone/active/unknown/closedで直交させる。利用者の表示をcancelledへ進めても物理unknownやexternal-may-existを消さない。

1. 受理Txで本人/現在編集権限/非trash/原本/connectionを確認し、dedup targetとjobを確保。バックグラウンドはsession期限や通常logoutに依存させず、account存続・現在scope権限・ownershipGeneration・epochを毎step確認する。
2. 検証済み原本identityに対するread pinをTxで確保。owned sourceは有限streamで全長/hashを先に確認し、immutable storage keyを保持したhandleから指定rangeだけ送る。送信前の全長/hash検査失敗時は外部bytes送信0。途中range読取失敗では既送信/受信offsetとintentを保持して残送信を止め、総送信0とはしない。200MiB全量buffer、全ファイル一時copy、LLM quota消費0。
3. 現folderを同subでserver再確認。trash/曖昧非可視/書込不可は送信前停止、利用者決定に沿う案内。任意URL/shortcut多段追跡/権限付与/Google物削除0。
4. 事前file IDとmarkerを保存し、resumable開始intent→外部開始→Locationを専用AAD envelopeで保存。保存ACK前にchunkを送らない。Locationは固定https host/path/許可query/port/userinfoなしを検証し、opaque session型へ閉じる。redirect0、URLやtokenをDTO/logへ出さない。
5. 各chunkのoffset/length/sequence/owner intentを短Txで確定してから送信し、結果＋実close後に同owner/CASで受信offsetを保存。新epoch/権限喪失/取消と競合した結果を採用しない。ネットワークI/O中にDB Txを保持しない。
6. timeout/5xx/ACK欠落は同sessionの受信位置照会へ進める。308 Range無しは0、厳密な0..NはN+1。負値・飛び地・上限超過・旧確定offsetより後退する応答は拒否して不明保持。send()の成功bytesやTCP closeからoffsetを推測しない。308をHTTP redirectとして追従しない。
7. status200/201または完了応答後、同file ID/marker/parents/非trash/sizeと可能なchecksumを検証。現在note/原本/本人資格を再確認してrecordとjob成功を同Txで保存。409だけで成功にしない。

session404/開始LocationのACK不明では、まず事前IDのmetadataで既完成を確認する。再開する場合も同IDだけを用い、競合はmetadata検証へ戻す。metadata404は永久削除の証拠ではないが、同ID再送により別file生成は防ぐ。自動の無制限session再作成は設けず、有限再照会後に失敗/不明と明示再試行へ収束させる。旧sessionの実終了不明やID競合・metadata不整合なら新upload禁止。

新epochへの旧transfer移管はしない。同subに再連携しても旧transferは取消終端まで保持し、明示した新jobの前処理として既targetの同IDを現在資格で照会する。旧完成が検証できれば同targetのrecordを採用、未完成で再開が必要なら同ID・同folderの新transferだけを作る。設定folderが変わって旧targetと一致しない場合は無言移動/新ID作成せず、保存先と不明結果の解決を案内する。この枝のUXはManager採用判断を要し、無断の外部cleanupを追加しない。

## 共有port・DI・有限資源

`DriveBackupProvider`はallocateFileId/startResumable/queryReceived/uploadChunk/inspectFileだけを公開し、任意URL request関数を内側へ渡さない。statusはincomplete(offset)/complete(metadata)/session-expired/rejected/unknownのdiscriminated union。外部status/raw bodyをapplicationの業務条件に流用しない。

`DriveBackupSource`はidentity検証とpinに束縛したbounded range reader、cancel/closed証明を提供する。推奨をObjectStorageへの独立したoptional capability `openOwnedRandomRead` に固定する。既 `OwnedObjectRead` / `openOwnedRead` のbody・EOF自動close・利用者を変更しない。plain stream()をowned readの代用にしない。WriteOwnerへdrive-backupを追加し、専用ownership-unprovenの厳密brand/owner照合でobject pinを保持する。LLM/ZIPの既例外判定は緩めない。差分型と寿命は後述する。

DriveExecutionTargetへbackupを追加し、同runtimeGeneration/ownerTokenのcaller/close proof/前任実終了照合を使う。現在runnerのauthorization/control二択・held件数上界・maintenance/pruneをbackup込みの明示契約へ変更する。内側へ可変registryやNode HTTP objectを渡さない。資格refreshの使用版CASはcontrol/backupの閉じたowner unionで同Tx更新し、commit前の新token使用と遅い旧401による新資格失効を禁止する。

長いbackupが既controlのaccount1枠を占有すると、再連携成功前に旧backupを取消さない条件との待合いが生じる。推奨は既control global2/account1を維持したまま、backup専用global1/account1を追加すること（総HTTP最大3、同accountはcontrol1+backup1）。unknown backupはbackup枠を保持するが、新認可成功/ローカル解除を妨げない。通常refreshは同credential単位single-flightで共有し、同時refreshを作らない。この総枠増と共有port変更は採用判断対象で、現枠を黙って緩めない。

合算上限はregistryとDB claimの両方で確認し、同じphysical requestをcontrol/backupへ二重予約しない。backup内のrefreshもbackup枠で実行し、既controlが同資格refreshを保持中なら新要求を送らず保存結果を待つ。認可候補の新code交換は旧資格refreshと別目的でcontrol枠を使える。backup queueはaccount内FIFO、空き枠取得時にaccount間round-robinで選び、bulkの500子が他actorを先取りしないよう有限補充する。実行中のjobは強制preemptせず最大実行時間まで、unknown ownerはその期限後も枠を保持する。この場合の公平な進行は保証せず所有確認待ちを表示し、次accountへunknown枠を貸さない。controlの既順序/上限は変更しない。

refreshの実ownerと待機subscriberを分ける。初回control subscriberは `withCaller` / DB owner claim **前**のqueued・owner:noneであり、socket/source/pin/HTTP枠を取得しない。待機Promiseを実ownerのclosed Promiseへ連結せず、取消・scope変更・30秒の有限待機でsubscriberだけ終端できる。実refreshがunknownでもsubscriberのownerはunknownにせず、queuedの待機終了を有限失敗へ保存する。従って `driveControls.held(account)` はこの待機では0のままで、候補交換/採用/解除を妨げない。subscriber解除は実ownerのabortでもrefresh再送許可でもない。既にsourceを保有するbackupがcontrol refreshを待つ場合は自身のpin/backup枠を保持し、待機期限で自分のsourceを通常closeする。他者のcloseを待ち続けず、自分の実closeが不明な場合だけ自身のunknownを残す。

Node単一runtimeの短い `coordinate` 区間で、refresh予約判定とowner claimを直列化する。backupの実refresh intentは新transfer行に、既controlの資格使用予約は既active/unknown control ownerに結び付ける。既control ownerは保守的にrefreshし得る資格使用予約として扱い、その実終了前にbackupが同資格refreshを開始しない。反対にbackupのrefresh intentがactive/unknownなら新controlはclaimせず上記subscriberになる。controlが既にHTTP/sourceを所有してからsubscriberへ移る方式は採らず、一旦実close/DB proof ACKした後のqueued再判定とする。credentialVersion進行後は新資格をGET/CASで取得し、旧intentの応答や旧401を採用しない。旧runtime回復時は永続owner/intentと実前任終了を先に照合し、memory lock消失だけでは新refreshを許可しない。この案ではrefresh専用第6表・既controlのCHECK変更・connection新列を追加しない。短区間にnetwork待機を持ち込まないこと、unknown backup refresh＋control subscriber＋成功relinkが循環しないことをslice1の直接対にする。

subscriber結果はtokenを返すAPIではなく再検査の通知だけとする。通知後に現在actor/session（controlのみ）・epoch/sub・settings/folder・credentialVersion・取消・期限を再確認してからclaimする。初回queuedはowner:none、既に1stepを実終了したcontrolの待機は閉鎖ACK済owner:closedの既phaseを維持し、prepared等を副作用前queuedへ巻き戻さない。claim時にcurrent credentialVersionへ `bound` する既0038 triggerの `none/closed → active` 条件を使い、expectedCredentialVersionは受理証跡として不変。進行中ownerのbound版を他者refreshで書換えず、`self-refreshed` はそのownerが実refreshした場合だけにする。専用kind=refreshの待機者は他者成功をcompletedと偽装せず、資格更新済みの有限結果/現在GETへ収束し、不要な再refreshを送らない（既failure unionで表せない場合は型だけの有限code追加を先に申告）。既 `drive_control_result` のself-refreshed条件は維持する。subscriberの有限終端/held0と実refreshの閉鎖不明/backup枠保持を別々に直接観測する。列/CHECK/trigger拡張が必要と判明したら本案の限定DDLを超えるため実装前にRootへ返す。

順序は「影響確認→旧backupを維持したままcontrol枠で候補検証→candidateの実HTTP/caller close→採用Txで現在本人/確認集合/候補期限/旧epochを照合→新資格保存と旧backup cancelGeneration更新を同時commit→exact旧ownerへabort→read/HTTP/caller実終了→DB closed proof ACK→pin/backup枠解放」。採用Txの失敗は旧資格・旧backupの取消を残さない。新資格保存後の通知失敗は永続cancel fenceからpumpが再通知し、新chunkはDB current検査で拒否する。candidate成立前にbackupを停止させて条件を満たす方式は採らない。backup unknownを既control held数へ加えてadoptを妨げず、unknownの旧所有は別の総資源計数へ残す。

初期運用値案はchunk1MiB（最終以外256KiB倍数）、一要求30秒/close猶予5秒、転送実行全体30分、status再照会3回まで（1/2/4秒、取消で中止）、session再作成は明示再試行時のみ1回。原本上限は既50/200MiBを維持し、再試行回数と物理chunk数を利用者LLM quotaへ加算しない。1MiB chunkの同時常駐1＋source/hash streamだけにし、受信JSON64KiB/header16KiB/session envelope64KiB、tick100行/60秒を候補とする。実性能/RSS/OS硬上限とはしない。

bulk500件は500 HTTP同時発行ではない。親と固定child集合を保存し、転送admissionはaccount10/global100内をcursorで補充、activeは1。automatic受付もjob自体を残し、混雑/未構成は有限失敗として変換を継続する。DB保存障害を架空のbackup失敗に置き換えてimportだけ成功させず、同Txは全体rollback・元upload冪等再確認とする。

## 自動・一括・履歴・取消

自動ON/OFFは現在actor/epoch/settingsVersionへCASし、提供構成＋linked＋folder検証を条件とする。原本成立Tx時の設定で1jobを固定し、設定ON時の全原本scanを行わない。通常OFFは将来uploadへの適用停止で、受理済jobを無言取消しない。資格失効/解除は別の外部取消である。

受理時settingsVersionは確認証跡として固定するが、実行中のcurrent判定はepoch/subとfolder fingerprintを比較する。auto ON/OFFだけのsettingsVersion更新で旧jobを取消さず、folder ID/resource-key/driveId変更は旧送信先を新設定へ付け替えず停止する。旧original bytes/hashの変更・ownershipGeneration変更は本文編集/タグ変更とは区別し、backupに無関係な本文版更新だけで取消さない。

bulkは既選択モデルの最大500明示ID・filter/scope変更解除を再用。previewで原本なし・編集不可・既backup・稼働中を内訳化し、実行可能残りだけ本人確認後に受理する。実行直前に再認可する。新backup親/子を既batchのtag/trash/move/sharing実行unionへ無理に詰めず、選択UIと履歴projectionだけ共用する。

単件/一覧は自身のbackup進捗・理由・再試行・検証済みDrive linkを表示する。WSの他人のjob/連携メール/token/session URIは出さない。他人のrecordを使うP5c-3の現在編集者には必要最小限のrecord locatorと可否だけを渡し、serverで記録本人の資格を選ぶ。Driveへの権限自動付与やリンクからのサーバーdownloadは行わない。

履歴は本人のみ、createdAtから90日・境界同時刻から非表示。失敗子再試行は同対象/同設定の新job、親の集計版を更新して処理中へ戻す。成功/取消子は再試行せず元操作へ。古い親の期限を延長しない。90日を跨ぐ新試行の表示は新jobで確保し、古い名前snapshotを復活させない。purgeでは全owner閉鎖後にrecord/targetをnoteとともに回収し、履歴jobには安全snapshotだけ残す。期限pruneでactive/unknown transfer、未解決target、存続noteのrecordを削除しない。

手動JB-03の親取消は未開始子を取消、開始済み子は完了待ち・結果保持。これと外部取消（解除/再連携成功/失権/trash/WS削除等）の即時fence+abortを分ける。画面閉鎖・通常logoutは受理済jobを取り消さない。取消済表示には業務失敗理由を付けず、外部にfileが残った可能性は別の安全説明にする。

同Tx接続はadoptDriveCandidate/disconnectDrive、trash/purge、membership降格/除名/脱退、note移動のownershipGeneration変更、WS削除の受付。影響確認の対象集合へbackup kind/idを追加し、確認後の新job出現は再確認、同IDの進捗だけでは再確認しない。全rank降格で停止するかはJB-03の原文どおりbackup側で照合し、既conversionの「edit権限を失った場合だけ」の条件を無言流用しない。current guardsと定期pumpは同Tx fenceの代用でなく二重の防御。

再連携の影響確認にはlive backup ID集合を含める。新候補が検証・採用されたTxで旧epochの取消intentを保存し、新credential/folder未設定/auto OFFを確定する。失敗候補では何も取消さない。実ownerがunknownでも新資格採用自体を永久待機させず、旧pin/枠は保持して後続実closeだけで解放する。退会本体は後段から呼ぶ同Tx cancelAccount＋drain/status契約だけ用意し、退会UI/全データ削除を本段達成とはしない。

## 実装の最小垂直sliceと依存

1. 単件手動：新型/5表・限定connection移行、本人受理→小原本owned読取→resumable1chunk→record→ノート状態/link/本人job。偽providerを使って通常UIで1本通す。duplicate・ACK不明に加え、既UIから起こせる解除、再連携成功、trash、失権、移動、purge、WS削除の全同Tx fence/abort/pin保護を実UI提供前に接続し直接対を持つ。基本hookや通常refreshの継続安全性は後回しにしない。
2. 受信位置と所有回復：複数chunk・非整列の部分受信・DB ACK不明・旧runtime実終了・same-sub/別sub再連携等の追加回復/境界検証を拡張する。slice1の安全hookを初めて実装する段ではない。初期検証は最小fixture、200MiB全量/速度試験は別exact予算。
3. auto/bulk：upload Tx intent、ON/OFF、既500選択と親子内訳/失敗子retry/手動cancel、ticker/toast/90日prune/存続recordを仕上げる。

S5b-3の局所受入を借用できるが、P5c-1実UI未完は継続して別管理。backupの取消で変更するrelink/adopt/Settingsについては、単に旧S5b成功を借用せず変更条件だけ再確認する。未検証のfolder作成/文書寿命へ依存する試験を合格に読み替えない。最初の契約fixtureは検証済folderを明示setupし、既folder経路の残条件を避けたことを記録する。

P5c-3への公開契約はrecord locator→現在note編集権限→記録credential ownerの同sub接続→現在parents/hash検証、解除/退会時の案内だけ。Drive取得・LLM生成・本文置換/undoは本段に実装しない。保存済原本への無言fallbackは追加しない。

## 固定受入候補と比例検証

| 候補 | 観測する結果 | 出どころ/検証 |
| --- | --- | --- |
| B2-A | 単件本人/WS editorの原本backup、viewer/他actor/原本なし拒否、成功link・現在GET/再訪保持 | IN-06、OR-11。pure/domain、UoW、同bundle UI |
| B2-B | 同command/並行別command/90日後の既recordで再upload0、別actor/sub非流用 | IN-06、design。DB unique/CAS/restart直接対 |
| B2-C | normal/部分Range/Range無し/ACK不明/200照会/expired/409、offset推測0・別ID重複0 | designと公式契約。自己HTTP実adapter、有限native closeとDBintent対応 |
| B2-D | 原本全長/hash、source/socket/caller close、取消とunknown保持、purge先行0 | design/CLAUDE。切断/遅着/実終了不明/前任終了をfake+自己nativeで別確認 |
| B2-E | 再連携失敗は旧継続、同sub成功も旧取消、通常refresh継続、local-only解除/失権/trash/移動/WS削除停止 | 利用者決定、IN-09/JB-03。Tx競合＋実abort/close＋Settings UI |
| B2-F | auto ON後の新uploadだけ、upload本人のDrive、変換成功/失敗と独立、OFF/混雑で説明 | IN-05/IM-01。受理Txと変換既条件への比例対 |
| B2-G | bulk固定集合/最大500、原本なし等内訳、混在結果、失敗子のみretry、手動cancel開始済み完了保持 | OR-09/JB。選択component/DB child＋小UI集合 |
| B2-H | 本人history/ticker/toast、90日境界、record存続、削除note snapshot、秘密なし | JB/IN-07接続。時間fake＋現在権限＋prune/purge対 |
| B2-I | trash/ambiguous/denied/容量/rate別案内、folderを自動代替せず外部delete0 | IN-05/06、利用者決定。provider contract＋receipt UI |

規定typecheck→lint:fix→format、影響局所、通常build/postbuildtype、実UIを候補とする。既SSO/profile/LLM quota/本文commit等は実差が届いた箇所だけ比例確認し、全受入の一括reopenや新gateを増やさない。移行は旧全値/FK/索引/trigger/ledger同値、正常・中断・末尾FK失敗rollbackを直接確認する。

外部は契約検証まで。Google同意/実Picker適合、共有Drive実転送、provider実権限変更、大小原本の実送信は明示試験account/folder/bytes/操作/残存物方針の別許可待ち。テストroot/DB/鍵/通信/生成物のexact予算は実装委譲時に見積り、S5bの残枠を流用しない。

## Managerへ返す判断

採用判断は、5加算表＋drive_connections限定再構築、backup専用枠（既control非変更）、所有range sourceとExecution/refresh union、同Tx取消hook、受信位置/同ID再試行の契約。これは共有実装境界の判断で、既利用者決定を聞き直す事項ではない。

利用者結果を変え得る未指定点は、未完成・外部成立不明targetを保持したまま保存先を変えた後の再試行。推奨は旧targetの同ID確認を先行し、確認不能なら新folderへ別fileを無断作成せず、旧結果の解決と明示操作を案内すること。重複の可能性を承認して別IDへ新規backupする機能は本案に含めず、必要ならRootから判断を求める。

IN-05の「永久削除を確認できたfolderの自動再作成」は、現API観測では証明経路がない既未完。404/trashで代用しない。P5c-2案の採用で解決扱いにせず、元要件と利用者決定の両方を保ってRoot管理へ残す。

## slice1の具体的source契約

次の追加型を推奨する。既owned streamの型・挙動は不変更。他runtimeへ実装を強制しないが、Node backup構成ではcapability欠落を起動時の明示構成失敗とする。未構成Driveは非提供表示のままで、plain stream・openし直し・全量bufferへfallbackしない。

```ts
export interface OwnedObjectRandomRead {
  readonly bytes: number;
  readAt(offset: number, length: number): Promise<Uint8Array>;
  readonly closed: Promise<void>;
  close(): Promise<void>;
}

// ObjectStorageへの追加member
openOwnedRandomRead?(
  key: string,
  signal?: AbortSignal,
): Promise<OwnedObjectRandomRead>;
```

raw `readAt` はsafe integer、範囲内、length 1..64KiB、同時read最大1、short read拒否。close/abort後の開始を拒否する。Node adapterは一度だけO_RDONLY|O_NOFOLLOWでopenし、regular/sizeを確認したFileHandleの明示positionで読む。closeは開始前にclosingを確定し、進行中read終了→FD closeを待ってclosedを成立させる。FD close失敗は未証明のまま。既owned streamはEOFでcloseするため、この用途に拡張流用しない。

backup source adapterは同handleを64KiBずつ読み、全bytes/SHA256とoriginal identityを比較する。同時にcanonical 1MiB blockごとのSHA256を保持する（最大200個、digest本体6,400B）。送信rangeは最大1MiB、非整列開始でも最大2個のcanonical block **全体**を同handleから再読・再hashする。必要rangeだけ最大1MiB出力bufferへcopyし、関係する全blockが一致してから初めて返す。不一致ならそのrangeのネット送信0。追加常駐は出力1MiB＋読取64KiB＋digest/固定metadataで、全原本copy/全量bufferなし。既送信済rangeを後から物理消去したとは扱わない。

同FDはpathname交換による別file再openを防ぐが、それだけでimmutableとは主張しない。既FileObjectStorageの排他publish（stagingを新keyへlink、既key上書きなし）を前提に、in-place書換えもblock digestで検出する。返却したrange bufferは検証後の独立bytesなので、後のfile変更が当該送信bytesを変えない。hash耐衝突性とアプリ管理外のOS攻撃を区別し、OSレベルの不変性保証はしない。fstatの前後size/identity確認は追加異常検出であってhashの代わりではない。

`withOwner({kind:"drive-backup", id:transferId}, work)` はsource準備から全送信・結果DB ACK・実closeまでを包む。CoordinatedObjectStorageはopen前にexact keyを登録し、ownerActive/ownershipGeneration/current原本をDBで検査する。objectOperationRepositoryのbeginWrite scope投影・claimDelete、およびpurgeRepository.hasWritersに新transferを加える。close不明時は専用owner一致のbranded errorでpin保持する。既recoverWritesは他runtimeのobject writeをinactiveにできるため、新transferのactive/unknownをclaimDelete/hasWritersでも独立に拒否し、owner終了証明前の回収を許可しない。再起動では旧FDを再利用せず、前任実終了確認後に新ownerで全量hashからやり直して同IDの受信位置を照会する。

## slice1のexact変更予定path

以下は採用前の変更予約であり、現在の差分ではない。表内のprefix＋各file名がexact path。共有境界変更を隠さないため、基本取消hookを含む。実装中にここにない製品pathが必要なら根拠を返し、一覧を無断拡大しない。

| prefix | 変更予定file（新規は「新」） | 目的 |
| --- | --- | --- |
| `packages/core/src/domain/integration/` | `drive.ts`, `driveRepository.ts`, `driveBackup.ts`（新）, `driveBackupRepository.ts`（新）, `driveBackup.test.ts`（新） | auto型、backup型/5repository、影響確認集合 |
| `packages/core/src/domain/purge/` | `entity.ts` | drive-backup owner追加 |
| `packages/core/src/application/ports/` | `objectStorage.ts` | random owned read capability |
| `packages/core/src/application/execution/` | `hollowUnitOfWork.ts` | 5repositoryのTx公開 |
| `packages/core/src/application/integration/drive/` | `ports.ts`, `credentials.ts`, `connection.ts`, `control.ts`, `read.ts`, `runner.ts` | backup service/owner/秘密purpose、refresh予約、採用/解除、影響確認/閉鎖回収 |
| `packages/core/src/application/integration/drive/backup/` | `ports.ts`（新）, `request.ts`（新）, `runner.ts`（新）, `read.ts`（新）, `cancellation.ts`（新）, `ownershipError.ts`（新） | 単件受理/実行/照会、共通Tx fence、source/provider境界 |
| `packages/core/src/application/note/` | `trash.ts`, `purge.ts` | trash/purge fence・記録回収 |
| `packages/core/src/application/workspace/` | `membership.ts`, `deletion.ts` | 降格/除名/脱退/WS削除fence |
| `packages/core/src/application/move/` | `usecases.ts` | 所有移動Tx fence |
| `packages/core/src/adapters/libsql/` | `driveSchema.ts`, `driveBackupSchema.ts`（新）, `hollowUnitOfWork.ts` | connection限定差・5表とDI |
| `packages/core/src/adapters/libsql/repositories/` | `driveRepository.ts`, `driveBackupRepository.ts`（新）, `objectOperationRepository.ts`, `purgeRepository.ts` | CAS/claim/dedup/prune/pin |
| `packages/core/src/adapters/libsql/migrations/` | `0039_drive_backup.sql`（新） | 5表＋connection限定再構築 |
| `packages/core/src/adapters/libsql/migrations/meta/` | `0039_snapshot.json`（新）, `_journal.json` | 正式移行の登録。旧0038は不変更 |
| `packages/core/src/adapters/libsql/__tests__/` | `driveBackupFixtures.ts`（新）, `driveBackupMigration.integration.test.ts`（新）, `driveBackupApplication.integration.test.ts`（新）, `driveBackupClosure.integration.test.ts`（新） | 旧保持/rollback、単件/取消hook/refresh待機/所有 |
| `packages/core/src/adapters/node/` | `objectStorage.ts`, `coordinatedObjectStorage.ts` | 同handle random readとpin保持 |
| `packages/core/src/adapters/node/__tests__/` | `objectStorageRandomRead.test.ts`（新）, `coordinatedObjectStorage.test.ts` | range/abort/close/旧ownedRead非退行 |
| `packages/core/src/adapters/node/drive/` | `factory.ts`, `execution.ts`, `http.ts`, `secretProtector.ts`, `runner.ts`, `backupProvider.ts`（新）, `backupSource.ts`（新） | 注入/別lane/総枠、resumable/秘密/session/受信position |
| `packages/core/src/adapters/node/drive/` | `factory.test.ts`, `http.test.ts`, `secretProtector.test.ts`, `backupProvider.test.ts`（新）, `backupSource.test.ts`（新）, `backupExecution.test.ts`（新） | 自己HTTP・pure/native所有・閉鎖・未知refresh |
| `apps/web/app/` | `server.node.ts` | 既driveFactory seamでstorage/source構成、起動前capability判定 |
| `apps/web/app/presentation/` | `driveBackupInput.ts`（新）, `driveBackupInput.test.ts`（新）, `driveBackupServerFn.ts`（新） | bounded入力/本人read/mutation |
| `apps/web/app/components/hollow/` | `DriveSettings.tsx`, `DriveSettings.test.tsx`, `DriveBackupPanel.tsx`（新）, `DriveBackupPanel.test.tsx`（新）, `DriveBackupHistory.tsx`（新）, `DriveBackupHistory.test.tsx`（新） | 既Settingsの現在pathを維持。backup影響説明/確認、単件状態・純GET・本人履歴 |
| `apps/web/app/routes/` | `notes.$noteId.index.tsx`, `notes.jobs.tsx` | 既未提供表示から単件導線/本人履歴 |

5表以外への波及は上記の既connection再構築、UoW/DriveServices/Execution/SecretBinding/ObjectStorage/WriteOwnerの型、既取消・pin repository、Node DI/runner、UI確認集合。既object表はkindがtextで固定CHECKなしなので再構築しない。新owner用scopeとcurrent判定はrepositoryの明示分岐にする。drive_attempts/drive_controlsの列・CHECK、job_result_snapshots、import/LLM/SSOのDDL、lockfile、他runtimeは変更しない推奨。runtimeOwnershipの公開record formatはtarget kindを保存しておらずそのまま借用する。HollowContainerは既drive/importingの内側型拡張で足り、serverNodeテンプレートを広げない。Node runnerは長いbackupをcontrol pump内でawaitせず独立1laneを追跡し、stopで両laneの実closeを待つ。

auto受付/一括/tickerの実装pathはslice3で別予約し、slice1では隠れた第二設定や未接続ON UIを作らない。今のP5c-1未完UIをこの一覧に混ぜて成功扱いにしない。

## slice1の最小検証資源見積り

以下も採用前の上限提案。S5bの旧root/枠/鍵/DB/結果は一切流用しない。新 `p5c2-s1-YYYYMMDD-XXXXXX` 排他0700 root 1個で主担当だけが操作する。数は成功を得るまで増やす枠ではなく、準備失敗を含め超過前に返す上限。

| 資源 | 上限・配分 |
| --- | --- |
| synthetic DB | logical 9集合、計128MiB。正式0038までのsynthetic baseline1、0039成功clone1、rollback clone3（copy途中、trigger再作成、末尾FK assertion）、application対1、UI active1を各16MiB。UI停止opaque1＋さらにaudit1を各8MiB。main/WAL/SHMは1集合、物理file数は別計数 |
| 移行 | 新baselineの正式初期化1。baselineから新排他cloneだけへ正常1/失敗注入3。全旧列/NULL/JSON/PK/FK/trigger/index/ledger比較。baseline/opaqueは以後driveropenせず、auditだけ再open。途中SQL中断はcopy途中失敗対で確認。actualfresh/旧保全物0 |
| domain/UoW fixture | 新synthetic account最大3、WS1、notes最大3/originals最大3をapplication DB内で再初期化して逐次対。全hookの同Tx fence/遅着拒否、duplicate、unknown pin、refresh subscriber deadlockをDB直接対。cloneに複製された同fixtureを実利用者データと混同しない |
| 小原本 | 固定synthetic 1KiB、256KiB、1MiB+17B、2MiBの最大4種類、storage/fixture総16MiB。範囲改変対は新専用fileのみ。UIは通常uploadで1KiB原本1・note1、LLM0。200MiB全量/速度/RSSは未検証 |
| 自己HTTP局所 | loopback provider listener1・request同時1、最大32要求/8MiB（headers+request+response）。既HTTP adapterのstart/query/chunk/Range/切断/closeを直接確認。redirect/外部Google0 |
| 同bundle UI | configured contract boot1、fresh Chrome launch1/context1/page1。通常signup/mail確認account1＋backup1＋現在GET/reload/duplicate。取消の実abort/closeはDB/native代表対で直接確認し、この1原本UIで成功後に別転送を捏造しない。UI provider最大24要求/8MiB、Hollow/proxy600要求/32MiB、背景拒否100要求/1MiB。過去1navigation約45assetを踏まえ専用文書入出をsetupに多用しない。外部forward0 |
| runtime | 局所suiteは逐次1、自己HTTP対とUIを重ねない。UIはHollow1＋fixture1＋proxy1の3listener、Chrome tree1。前任所有拒否の直接対のみ新自己owner child2を一時重ね、DB writerは1。手動kill/未知PID/port走査0、bind probeは自己listener終了後各最大3 |
| 鍵/秘密 | 新Drive AES2本＋invitation/share計128B、自己RSA2048 memory1、確認mail bounded memory。material合計256KiB。資格/本文/nonce/session/raw例外の保存出力0 |
| root容量 | DB128MiB＋原本16MiB＋Chrome専用TMP128MiB＋helper/log8MiB＋Node TMP8MiB＋material256KiB、全root上限320MiB。Chrome/Node専用TMPのsocket/symlinkはlstat別計数で追従0。他永続領域の未知特殊entryは拒否 |
| 通常checks | repo上のtypecheck→lint:fix→format→影響局所→通常build1→postbuildtype。DB/HTTPの副作用を伴う対は上記9集合/要求枠に計上。cache無効・新root TMP/logのみ。通常distは別256MiB予約、既依存node_modulesをroot容量へ二重計上しない |

局所は新backup対と実変更が及ぶ既Drive/ownedRead/purge/membership/moveの比例対に絞り、S5bの全枝・全既機能を再演しない。正確なtest件数は実装時にfixed条件との対応表で確定し、件数を作るための新gateを設けない。基本安全hookはslice1で全種DB直接、native cancel/closeは代表直接、UIは代表1本として根拠を区分する。残UI/実Googleはこの成功から推定しない。

UIは現在DOMから操作し、mutation完了応答→現在GET→reload前DOM→reload後を別観測する。networkidleを業務成功条件にしない。準備pure対でserializer/有限snapshot/GET専用pauseを確認してから唯一のlaunchへ進む。公開helperを新rootへ再利用する場合もexact metadata/fullread/exclusive copyが前提で、旧結果/資格は読まない。source/builtを混ぜる契約注入が必要なら、既厳密cross-bundle error bridgeの適用先を新build公開exportへ再照合し、通常configured production実接続とは区別する。新配備で製品にbridgeを混入しない。

この資源で同時全異常をUI再演しない。S5b未完3群の完了をsetupに要求せず、検証済folder fixtureの明示設定を使用する場合は通常UIによるfolder設定成功の根拠に数えない。configured contract UI以外の追加bootや実Google接続が必要なら別申告する。

本書EOFを再読後、文書を含む全read/write/runを停止してManagerへ返却する。実装・実行許可待ち。

EOF
