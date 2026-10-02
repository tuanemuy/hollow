# P5c-2 S3 提案：自動・一括原本バックアップ

状態：独立静的レビュー V1〜V5 の採用補正を統合した改訂提案・実装未着手。2026-10-01。基点は S2 受入済み `c660ced51319175a8c506be1cce5cd7a743d85ad`。A/B/C/D の既受入を借用し、S3 の成功根拠には読み替えない。製品・DDL・lock・dist・proof・runtime の操作は行わない。Manager の改訂案採用・実装委譲後に限り実装する。

## 1. 完成条件と範囲

| ID | S3 で閉じる範囲 | 元の条件 |
| --- | --- | --- |
| F | 現在の本人による自動 ON/OFF、ON 以降の原本成立と同じ Tx の受付、変換結果とは独立した本人 Drive への処理 | IN-05、IM-01/02 |
| G | 固定選択最大500件、除外内訳、親と子、混在結果、失敗子だけの明示 retry、同じ親の再処理表示と再 cancel | IN-06、OR-09、JB-01/02/03 |
| E | 待機子にも現在資格・原本・所属・権限、外部取消と影響確認、物理 close までの既 owner 保持を適用 | IN-09、JB-03、S1/S2 採用契約 |
| H | 本人だけの ticker・toast・親子履歴・詳細状態、90日表示と存続 record の分離、秘密非露出、390px/Tab、mutation 後の現在 GET | JB-01、OR-11、IN-07寿命接続 |
| I | 待機/auto/転送の失敗理由とretry、trash復元案内、所在不明・権限・容量・rate等に応じた確認付き再選択/新規作成 | IN-05/06、利用者保存先決定 |
| J | 限定移行、旧値保持、比例局所、規定 checks/build、同 bundle 小 UI と正常停止保全 | P5c-2 採用条件 |

IN-05 原文の削除時自動再作成は利用者の後続決定で置換済み。永久削除を含め利用不可では確認→再選択/新規作成、trash は復元も案内する。削除と失権を推測で区別せず、復元・フォルダ作成を自動実行しない。音声変換、P5c-1 残 UI、P5c-3 再生成、退会本体、actualfresh、Google 実接続は本段で実装/合格にしない。既原本 bytes のバックアップは変換の再開を意味しない。

## 2. 現在の接続点と必要差

- `acceptUpload.ts` は primary 原本・note・変換 job・reservation accepted を同 UoW で保存する。ここへ自動受付を接続する。companion 分岐は原本ではなく対象外。変換失敗/needs-ai/LLM quota とバックアップ結果を相互に上書きしない。
- `request.ts` は単件 request/job/target/transfer を同 Tx で作る。`DriveBackupRequest.kind` は automatic/bulk を既に許し、job ordinal は0〜499だが、固定対象の未 admission identity や親 retry の集約関係は保存していない。
- `driveBackupJobs.queued()` は全非終端 job を数え、account10/global100で単件受付を拒否する。500 transfer の一括作成、先頭100 scanだけでの陰性判定、500並列 HTTP は採らない。
- `backupCurrent()` は settingsVersion 完全一致も要求する。auto-setting は既 repository で settingsVersion を進めるので、ここを据え置くと ON/OFF が既転送を失効させる。backup に限り epoch/sub/immutable target folder の意味一致を現在条件とし、設定 version は受付・UI CAS の正本として残す。
- `cancelDriveBackups()`、影響確認、purge は現状 transfer を主に見る。transfer 未作成待機も対象にする必要がある。`DriveBackupHistory` は単件 flat100件、`ImportTicker` は backup 未接続、`BatchSelectionBar` は Drive 未提供表示である。

## 3. 推奨する永続モデルと限定0040

新テーブルは増やさず、既5表のうち requests/jobs の加算列と限定 guard/index 変更を推奨する。0038/0039、connection/control の既 CHECK/trigger、targets/transfers/records の旧値・暗号 binding・DDL は変更しない。0040 SQL、対応 snapshot/journal、Drizzle schema だけを追加する。生成差がこの範囲を超える場合は採用前に戻す。

### 3.1 待機を job、実 admission を transfer として分ける

- jobs に nullable `admission_identity`（既 `DriveBackupIdentity` の strict snapshot）を加える。新 automatic/bulk の非終端子は必須、note/original/account/ownershipGeneration/workspace/epoch/sub/folder/原本 hash・bytes・key を受付 Tx で固定する。旧単件は null のまま既 transfer が正本。資格 token、session URI、raw resource key をこの列へ保存しない。
- 実行対象の target は受付 Tx で `(originalId,accountId,subject)` を exact 解決する。未存在なら `unallocated/fileId=null` のtargetを先に保存し、その固定targetIdと完全snapshotを持つjobをinsertする。snapshot.folderは確定target.folderと同値にし、既targetの旧AAD/現在connectionの新AADは既S2のrevealによる意味比較を使う。ciphertext一致で現在性を代用しない。既recordも同targetの成功子とする。この時点のID割当はDB内target IDだけで、Drive file ID発行/HTTP/owner/pinは0。新待機/即時failedのtargetIdをnullにして後で埋める経路は作らない。原本/actor/sub/folder/target相互一致を型・mapper・insert/update guardで揃え、target/snapshot付替えは拒否する。snapshot縮小はterminal note purgeの専用redactionだけ許す。
- public state は従来の `queued`。`queued + admission_identity + exact transfer 不在` が未 admission、transfer があるものが admission 済み。application の型はこの差を union として扱い、欠測を未 admission に推測しない。`forJob` は既 exact 最大2件 lookup、複数は拒否。
- 待機子は FD/HTTP/owner/read pin を持たない。scheduler が同 Tx で親取消・期限・原本・現在権限/epoch/sub/folder意味・固定target/record/live transfer・空き枠を再確認し、transfer1件だけを insertする。credentialVersion はこの時点の現在版へ bind。targetを再選択せず、snapshotを現在の別原本・別folder・別subに差し替えない。
- 未 admission の同 target も重複抑止対象とする。job の非終端 target に部分 unique index、既 live transfer の unknown/held も exact 判定する。旧行に不整合があれば移行を失敗させ、勝手に重複削除しない。terminal job でも実 owner が残る transfer は別 job 受付を許さない。
- 30分期限は既 `executionMs` を維持する。待機時間も元受付時刻から数え、admission 時に期限を延ばさない。期限到達は有限 failure、既 unknown owner は期限だけで解放しない。大量選択が全件成功する保証を新設しない。
- 受付 backlog の有限化案：未完親 account10/global100、各親最大500子。直接rootを持つretry receiptは同じ親として1回だけ数え、各ordinalの現在子も1件だけ数える。取消ラベルでもstarted/unknownが残る親は未完枠に含める。既 admitted transfer account10/global100、実 owner backup1/account1・control込み global3 は維持する。これにより未 admission の上限は account5000/global50000。単件は count1親なので既 account10/global100 の拒否条件を緩めない。これは既10/100を親受付と転送 admission の二段へ適用する提案であり、Manager採用事項。
- scheduler は actor round-robin、actor内 FIFO、1周最大100 admission/terminal化を行い、続きがあれば既 Node wake の次 turnへ返す。global先頭100を同actorが占めても別actorを永久に隠さない exact actor選択/query を用いる。unknown owner による停止は公平性保証の例外として表示する。DB未保存 cursorや browser の常駐は進行の前提にしない。

### 3.2 固定集合・親集約・retry

- requests に nullable `bulk_summary`（version付き固定選択digest、選択数、原本なし/権限なし/処理中/既保存の排他的件数）、nullable `root_request_id`、`generation`（旧行default1）を加える。root参照は同actorのbulk原親への直接1段のみ、root自身と通常単件は null。root→root以外、cycle、別actorは拒否。選択された実行対象の固定IDは子jobで保持し、除外された他人のID/題名を履歴に新規保存しない。
- jobs に nullable `root_ordinal` を加える。bulk原親では own ordinal と同じ、retry子では原親の固定ordinal。retry受付requestの own ordinal は dense0..count-1 のまま既 guardを維持。retry受付requestのgenerationは新原親generationと同値で固定し、root/ordinalの最新generationを一意に選べるよう制約する。原親直下の初回子の採用世代は常に1であり、可変の原親generationから読み替えない。`retryOf` は直前の exact 旧job、`root_request_id/root_ordinal` は親表示の集約だけで、session探索には使わない。
- parent detail は原親の最大500 root ordinal ごとに最新採用attemptを集約し、queued/running/succeeded/failed/cancelled・bytes・開始/経過・除外件数を返す。latest はSQLの exact root/ordinal 条件で決め、履歴先頭100から推測しない。successful/cancelled子は再生成しない。
- 「失敗分だけ再試行」は current親generation・各失敗子version・現在資格/原本/権限を同 Tx で確認する。新 command receipt/request と新 jobs を保存し、原親 generation/version を進め、原親 cancelledAt を解除して再び処理中にする。旧子/旧transfer/旧sessionは不変。全成功済み/取消のみの親にretryは提供しない。失権等で再受付できない子は理由を返し、成功扱いにしない。
- 旧request更新guardの全面緩和はしない。bulk原親の世代更新/取消解除は、同 Tx の新retry receiptが直接rootを参照し、採用対象の旧子が直前failedで、下記3分岐の未開始証明または実close証明がある専用CAS経路だけ許す。他ordinalのstarted完了をretryの追加前提にはせず、その子も原親の集約に残す。単件の旧 replace/cancel は維持する。
- 親 cancel はcurrent generationをCASし、全root ordinalの最新子へ作用する（前世代から継続しているstartedも表示集計には残す）。未 admission と queued/none は取消、started/prepared/reconciling/closed再claim等は途中abortせず実結果を待つ。元親の再retry後は再度cancelできる。外部取消は世代を問わず現scopeの全待機/転送をfenceし、手動取消後startedにもabort通知する。started判定は永続値とTx競合で決める。
- 失敗retryの公開locator/DTOを `priorJobId/priorJobVersion` 起点に揃える。本人・現在note認可・失敗状態・版を先に確認し、server内のclosed unionを使う。(1) 新snapshot付き待機失敗で `forJob=missing` とtarget未割当・他live/送信証拠なしをexactに証明したものは、同source/target/folder/subの新attemptを受付。(2) transfer有りでも、target unallocated/fileId null、該当する全旧transferのowner none・received0/session null/statusAttempts0/readPinned0/refreshPending0・送信intentなしをexact EXISTS/NOT EXISTSで証明した永続未開始失敗は、closedを捏造せず新attemptを受付。(3) 既開始/割当済み/ACK不明は既S2の一意旧transferと実closed、旧binding reveal→新binding protect、同ID、証拠付きCAS、maintenance/withCallerを通す。unknown owner・複数・legacy snapshot欠測は(1)/(2)へ分類しない。歴史scan100の陰性推測や別ID初回化は禁止する。
- 各新attemptの期限は明示受付時刻+30分、同attemptのadmissionでは延長0。現在資格epoch/credentialVersionへbindできるが、旧snapshot/target/folderEpochは不変。現在連携のsub/原本と旧target folderの意味が一致してから新snapshotの資格epochだけを現在へbindする。保存先解決・要再連携の案内を先に出し、未解決ならretry受付0。単件UI/履歴/親子detailは同job/versionを返し、転送未作成の失敗を隠さない。
- cancelledは「失敗を再試行」集合へ入れず、JB-02の「元の操作をやり直す」として別commandのinitial導線に分ける。未開始取消はexact未開始条件、既開始取消の結果確認/再開はS2の同ID・実close条件を保持し、必要な旧job/versionを明示locatorとして渡す。transportの失敗retryと取消redoをstrict unionにし、取消をfailedに書換えたり無条件に新file IDを作ったりしない。
- 表示90日は各request/jobの元createdAtからで、原親の期限をretryで更新しない。原親が90日を越えた後は新retry受付履歴を表示し、期限切れ原親を一覧へ復活させない。原親が表示期間内、またはfamilyに非terminal/実owner保持子・表示期間内retry receiptがある間は、rootと全root ordinalのlatest jobを集約依存として物理保持する。再retryしていない成功/取消・前世代startedも落とさず、新receiptへ返す値は現在認可した最小値に限る。
- 非latest旧attemptは既S2の直接retryOf/owner保持条件で通常pruneする。familyに表示/実行/held依存がなくなれば、leaf retry jobs/receipts→原親直下latest jobs→rootの順に回収する。rootの物理存在だけで期限切れleafを保持せず、leaf存在だけで全root結果を永続保持する循環も作らない。直接root family/直接retryOfのEXISTSで判定し再帰探索0。root FKのため必要な最小rootは最後まで残す。recordは不変・削除しない。

## 4. 自動設定とアップロード受付

- 新 `setAutoBackup` は actor、expectedEpoch/settingsVersion、boolean をvalidateし、linked+検証済folder+構成能力をON条件とする。既 `driveConnections.replace(...,'auto-setting')` を使う。OFFは今後の原本成立だけに作用し、既pending/admittedを取消しない。CAS失敗/ACK不明時は現在GETで照会し、暗黙POST再送0。
- ON以前に成立済み原本は走査しない。設定とupload成立の競合は同DB Tx順序で決める。upload開始時の古いcheckboxやmemory値を採用せず、原本成立 Txの現在autoBackupが正本。autoのcommand identityは既reservation/originalに一意に結び、retryされたTxや同upload応答再読でjobを二重化しない。
- `acceptUpload` の primary 保存Tx内で専用 `admitAutomaticInTransaction` を呼ぶ。認可済みuploader本人・保存したoriginal/noteを渡し、公開request usecaseのnested UoW/HTTPを呼ばない。WS所有でもDrive actorはuploader、WS ownerやconversion workerのactorにしない。
- auto=falseならbackup副作用0。既connection CHECKによりauto=trueはlinked/needs-relinkかつfolder非nullであり、正常経路にauto=true/folderなしの架空caseや偽identityを追加しない。unlink/adoptでOFFとなる既境界を維持する。構成不可・受付枠不足・needs-relinkの既知業務失敗でも、保存済みconnectionのsub/epoch/folderと成立原本から完全snapshot/固定targetを作り、failed automatic request/job・原本・conversionを同Txで保持する。外部保存先不可視/失権はsnapshotがある状態の有限failureとする。DB不具合/commitACK不明を業務failureへ握り潰さず、原本との原子性を維持する。既object-owner/cleanup境界やconnection CHECKは広げない。
- conversion成功・失敗・needs_aiのいずれでも同じ原本identityのbackup。companion・upload自体未成立・再生成処理・auto切替前の原本には新auto jobを作らない。独立したbackup失敗はnote本文・conversion結果・quotaを変更しない。
- backup currentのsettingsVersion比較だけを除外し、既epoch/sub/sourceGeneration/原本hash/権限/immutable folder意味照合を維持する。folder変更は既成功採用Txから明示cancel、relink成功は同subでもepochが変わり取消、失敗relinkは旧保持、通常refreshは資格版再bindのみ。control側settingsVersion契約は変更しない。

## 5. Bulk受付・安全hook・UI

- `BatchSelectionProvider/model` の既固定ID選択を借用する。viewerにDrive変更操作を出さず、専用 `DriveBackupSelection` を操作バーに置く。既 BatchOperation union/ZIPの処理系へ混ぜない。filter/scope/actor/zone変更で選択・previewを無効化、sort/layoutでは固定集合を維持する。
- preview GETは最大500の重複なしUUID集合に対して本人/current scopeを再確認し、原本なし・編集不可・既進行中を除外、既recordは「送信不要の成功予定」と明示する。`選択数=除外数+既保存数+新処理数`、request.countは実子数（既保存+新処理）で統一する。確認画面は除外/送信予定/既保存の件数、本人Drive/保存先、背景継続と取消の意味を示す。全除外は空親を作らない。
- POSTはpreviewのversion付きcanonical digest（actor/action/scope/固定順ID/各対象の原本・ownership/epoch/folder意味・分類）を同Txで再計算する。条件変化は再確認へ戻す。既保存は再uploadせず成功子、同command同digestは既receipt、異なる意図は拒否。固定受付digestへ後の可変root generationを混ぜず、新retry commandの期待世代束縛とは分離する。競合した別commandもtarget/job/transferのexact判定で集約/再確認し、対象を増やさない。
- 全pendingにはscope付きlive job query/cancelを追加する。影響確認は sorted stable job ID とjobなしheld transferのnamespaced IDをserver内でexact集約する。admission/進捗だけでIDは変わらない。新子/新attemptで変化する。
- Drive本人確認の旧 `backupIds:max11` は500子に使えないため、`backupImpact:{count,fingerprint}` を追加し、既count/action/actor/epoch/scope付きhashへ移行する。旧receipt欠落は実影響空の場合だけ一致、非空なら再確認。旧暗号receiptを勝手に書換えない。他actorを含むmove/batchの既opaque fingerprintも同じ待機集合を含め、raw IDs/題名/連携先を投影しない。完全集合は最大50000+既heldの有限範囲でページ走査、上限超過は拒否し切捨て比較しない。
- unlink/成功relink/保存先変更、trash、membership喪失、move、WS deletion、purgeの既入口をすべて接続する。pendingを取消済みにしたTxの後だけpurge可。terminal note消去時はjob identityに残る原本key/封筒/題名も既redaction同等に縮小する。実transfer owner/pin保持判定は変更しない。afterCommitは既sync no-throw exact abort+wakeだけ。
- 新activity providerをnotes shell配下に1つ置き、ImportTickerへbackup親のactive count/代表名を追加する（子500を500親と数えない）。terminal判定は実親集約、取得失敗を完了としない。toastは親id+generation+terminal結果の一度だけ。別actor/epoch・logout・unmountでcache/noticeを破棄し、ABA/遅着を採用しない。
- activity GETはactor束縛cursor・watch最大50、履歴page最大50・子detail最大50で巡回する。DTOは既64KiBを維持し、UTF-8の実byteで次item追加前に打ち切り、最大50未満でも続きcursorを返す。50件なら収まると推測せず、題名/必要最小値以外のsnapshot/key/秘密locatorは返さない。1flight/1queued、可視時3秒・hidden停止・復帰純GET。終端toastの後もserver正本で履歴を読める。background完了検出はcursor/watchの有限巡回で行い、先頭100だけで未完を失わない。
- React transitionによるpending/重複flight拒否、mutation後router.invalidate→onResolvedの新current ticket純GET、dirty/receipt/scope束縛を維持する。新親受付ACK不明はcommand locatorの純GET、再POST0。詳細・履歴から親cancel/失敗子retry、成功リンク、取消にfailure理由を付けないことを提供する。

## 6. Exact変更予定path（採用候補）

以下は改修所有の提案。新規は `(new)`。追加共有pathが判明した場合は編集前に差を返す。旧runtimeテンプレートや全体管理正本、specは変更しない。

| 区分 | Exact path |
| --- | --- |
| domain | `packages/core/src/domain/integration/driveBackup.ts`、`packages/core/src/domain/integration/driveBackupRepository.ts`、`packages/core/src/domain/integration/drive.ts` |
| application backup | `packages/core/src/application/integration/drive/backup/request.ts`、`runner.ts`、`read.ts`、`cancellation.ts`（すべて同directory）、`packages/core/src/application/integration/drive/backup/recovery.ts`、同directory `admission.ts` (new)、`automatic.ts` (new)、`bulk.ts` (new)、`activity.ts` (new) |
| setting/control接続 | `packages/core/src/application/integration/drive/autoSetting.ts` (new)、同directory `connection.ts`、`control.ts`、`folders.ts`、`read.ts` |
| upload/既安全入口 | `packages/core/src/application/import/acceptUpload.ts`、`packages/core/src/application/note/trash.ts`、`packages/core/src/application/batch/processing.ts` |
| persistence | `packages/core/src/adapters/libsql/driveBackupSchema.ts`、`packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts`、同repositories `noteMoveRepository.ts`、`purgeRepository.ts` |
| migration | `packages/core/src/adapters/libsql/migrations/0040_drive_backup_queue.sql` (new)、同migrations `meta/0040_snapshot.json` (new)、`meta/_journal.json` |
| Node pump | `packages/core/src/adapters/node/drive/runner.ts` |
| transport | `apps/web/app/presentation/driveBackupInput.ts`、`driveBackupServerFn.ts`、`driveInput.ts`、`driveServerFn.ts`（すべて同directory） |
| UI | `apps/web/app/components/hollow/DriveSettings.tsx`、同directory `DriveBackupHistory.tsx`、`DriveBackupPanel.tsx`、`ImportJobs.tsx`、`DriveBackupActivityProvider.tsx` (new)、`driveBackupActivityModel.ts` (new) |
| selection/route | `apps/web/app/components/batch/BatchSelectionBar.tsx`、同directory `DriveBackupSelection.tsx` (new)、`apps/web/app/routes/notes.tsx`、`apps/web/app/routes/notes.jobs.tsx` |
| domain tests | `packages/core/src/domain/integration/driveBackup.test.ts`、`packages/core/src/domain/integration/drive.test.ts` |
| recovery tests | `packages/core/src/application/integration/drive/backup/recovery.test.ts` |
| DB tests | `packages/core/src/adapters/libsql/__tests__/driveBackupFixtures.ts`、同directory `driveBackupMigration.integration.test.ts`、`driveBackupAutomatic.integration.test.ts` (new)、`driveBackupBulk.integration.test.ts` (new) |
| component/transport tests | `apps/web/app/components/hollow/DriveSettings.test.tsx`、同directory `DriveBackupHistory.test.tsx`、`DriveBackupPanel.test.tsx`、`ImportJobs.test.ts`、`driveBackupActivityModel.test.ts` (new)、`DriveBackupActivityProvider.test.tsx` (new)、`apps/web/app/components/batch/DriveBackupSelection.test.tsx` (new)、`apps/web/app/presentation/driveBackupInput.test.ts`、同presentation `driveInput.test.ts`、`driveServerFn.test.ts` |

新port種類・provider/ObjectStorage/Execution・鍵形式・外部APIは不要。既request/job repositoryにroot集約/待機admission/CAS/activity cursor/live影響/取消/prune方法、既transfer repositoryにV2のexact未開始失敗証明を追加する。既canStartUnallocatedは取消initialの条件を維持し、failedとcancelledを無差別に同一化しない。上表のrequest/read/driveBackupInput/ServerFn/Panel/History/新Selectionがjob/version locatorの実接続先であり、recovery.ts/test.tsの追加はclosed-onlyと未開始証明の分離に限る。UoWの既5 repository登録を再利用するためUoW/DI型を増やす予定はない。move/usecases、workspace/membership/deletion、note/purgeは共通cancel呼出しを通るため原則不変更、待機追加で直接guardの追加が必要なら事前申告する。shared authentication hookは不変更。既tableでは不変が表現できないとの実装結果ならDDL範囲を無言で広げない。

## 7. 比例受入候補と順序

| 群 | 新しい直接根拠 |
| --- | --- |
| F-auto | OFF時副作用0、ON前原本0、ON以後1、ON/OFFとseal両Tx順序、同upload二重受付0、個人/WS uploader本人、conversion成功/失敗/needs-ai独立、companion/未成立0、構成不可/混雑/needs-relinkのsnapshot付failed受付とDB rollbackの区別 |
| G-fixed | 0/1/500/501、duplicate IDs拒否、filter/scope/actor解除、sort維持、排他的除外計数、既record送信0、preview後変化/全除外、同command/並行bulk/manual/autoのtarget固定、最初の100外対象を残す固定集合 |
| G-scheduler | actor11で親受付とadmitted transferそれぞれaccount10/11・global100/101、500待機から有限admission、actual owner1/合算3不変、actor公平性、途中再wake、待機期限、停止再開集合不変、pending→admittedとcancel/purge/current両Tx順序、unknown保持 |
| G-retry/cancel | mixed成功/失敗/取消、transferなし期限切れ/即時failureとqueued-none failedのjob/version retry、none/unknown/legacy欠測拒否差、元親再処理/再cancel、started成功/failure/unknown結果保持、外部取消はその後も即fence、S2旧session/ID契約、旧terminal不変/同attempt期限維持 |
| E | pendingを含むunlink/同sub relink成功/失敗保持/通常refresh、folder変更、trash/全role降格・除名・脱退/move/WS削除/purge、impact旧receipt/新子/同job進捗、cross-actor非露出、実close前pin保持、待機取消だけでもwake/結果保持 |
| H | actor/ABA/late拒否、oneflight+queue、実routerイベント後現在GET、GET失敗で完了化0、親ticker/toast1回、byte/pagination、原親90日直前部分retry→通過後の非retry成功/取消/前世代started保持、旧親非表示/新receipt表示、依存解消後leaf→root prune/record不変、秘密非露出、390px/Tab |
| I | 待機/autoの新failure理由とjob/version retry案内、要再連携先行、既providerのtrash/所在不明/権限/容量/rate理由をHの履歴と結合、復元/確認付き再選択・新規作成、folder無断代替0/外部delete0。既不変更理由の実HTTP全再演は不要 |
| J | 0039→0040旧値/null/FK/ledger/全旧guard、snapshot/target不一致・root自己/別actor/非root参照・世代飛び・同ordinal同世代・一般取消解除の直接拒否、3 rollback位置、旧record/transfer不変、checks/同bundle UI/自己終了/opaque/audit |

S1/S2 pure/source/native/providerの不変更部分は正式報告を借用し全再演しない。変更到達した request/current/cancel/prune/history/input/component は直接比例対を行う。S2の52対をfixture改変の影響なしに機械的全再演する必要はないが、共通fixtureを変えるなら独立順序汚染の再発防止として同一DB通常順の対象群を通す。成功ケースだけ有限cleanup、失敗caseのDB/resultsは保全してfail-stop。期待件数は実装時に登録一覧で固定し、skipを成功へ加算しない。

実装順：永続型/移行→受付/admission/root集約と安全hook→auto seal→bulk/read→UI/activity→typecheck→lint:fix→format→影響局所→通常build1→postbuild type→指紋固定→UI1boot→停止保全。安全hook完成前にUIを提供/起動しない。rollback対は新cloneだけ、actualfresh適用0。

## 8. 新環境資源案（まだ作成/実行しない）

| 対象 | 提案する硬い上限/予約 |
| --- | --- |
| root | 新排他0700 `p5c2-s3-YYYYMMDD-XXXXXX` 1個、総384MiB。旧proof/key/DB/results/cacheはread/hash/import/実行0 |
| DB | logical9、合算144MiB：0039 synthetic baseline16MiB、0040成功migration clone16MiB、rollback clone3×16MiB、application32MiB、UI16MiB、UI opaque8MiB、audit8MiB。WAL/SHM込み。正式初期化はbaseline0039 1回、app/UI新0040各1回。成功移行1＋rollback3。失敗DBへの再実行/追加DBは再申告 |
| fixture | app actor11/WS2、note/original最大540（500境界＋差分40、UIとは別DB）。同application DB32MiBで親/transfer各account10/11・global100/101を本来の値で直接確認する。既fixture原本を正当に再利用し、global50000子の実作成/全送信は行わない。一件1KiB程度のsynthetic bytes、原本file合算16MiB。UI actor1/WS1、note最大8（原本なし1を含む）、asset/LLM0。既ノート0、外部実Google/OpenRouter/mail0 |
| keys/material | 新AES2本64B、UI invitation/share64B、計128B。RSA0、material256KiB。mailは自己signup確認のbounded memory1通のみ、秘密/本文/URL出力0 |
| helper/log/TMP | helper/log8MiB、NodeTMP8MiB、browser専用TMP128MiB。NODE_DISABLE_COMPILE_CACHE/TSX_DISABLE_CACHE有効。容量walkerはdist symlink非追従、自己TMP特殊entryはlstat別計数で内容read0 |
| process | test worker1/DB writer1。独立native predecessor/runtime追加0。UI production本体boot1/Chrome fresh launch1/context1/page1、同時app1。既profile/CDP/SSO0 |
| network | UIだけ自己provider HTTP1系統、最大64要求/16MiB、逐次1。Hollow/browser最大1200要求/64MiB（1文書約45assetを含む）、背景deny150要求/1MiB。fixture自動retry0、送信前にendpoint順/上限台帳を確定 |
| dist | 通常build1、既repo dist別256MiB。UI前後source/production/entry/shutdown/dist/DDLlock指紋一致を比較。新source/distを過去成功へ遡及適用しない |

app群はmemory providerで制御し実HTTP0、500件は最大500件の実Drive送信ではなく受付/queue/有限stepの契約対として観測する。正常実adapter/uploadは後述UI小原本だけ。UI要求64は概算ではなく、実装後に成功最大5原本×通常5要求＋失敗/再開/確認等最大39の操作表へ落とし、上限に余りがあっても根拠のないretryへ転用しない。

## 9. 同bundle代表UIと停止の完成像

1. 通常signup/確認mail/サインイン。新自己accountだけへ公開UoWでfixture連携・検証済folderを設定しowner0を確認する。S1で採用されたsetupと同じ限界：OAuth/Picker/実Google成功の代用にはしない。providerは同candidate実adapterを明示自己originへ接続、通常configured production資格検証ではない。
2. auto OFFで小原本1を通常upload、backupなし。設定画面でON保存→現在GET、遡及backupなし。小原本2をuploadしauto job/ticker/detail/successを観測、別の変換失敗fixtureも原本成立後backup成功を観測する。UIで音声変換や外部LLMは実行しない。
3. 正常送信を有限gateで待たせ、OFF保存でも既jobが取消されないことを示す。後続uploadはbackupなし。gateはfixture開始前の有限設定であり製品stateを書き換えない。GET/DOMの世代安定後に観測し、actionに広いsnapshotを抱き合わせない。
4. 一覧で小集合（既保存・未保存・原本なしを含む）を固定選択→preview除外内訳→confirm。1子だけ有限provider失敗、他は成功。親mixed/detail→失敗子だけretryで元親処理中→started待ちを含む親cancel→結果保持。再retryして親を再cancel可能なことは最低component/application直接対、同UIで不必要な反復はしない。
5. ticker/toastの消失と1回性、履歴親子、成功link、reload、390px/Tab、notes/jobs/通常導線共存。GET要求をServerFn endpoint別に有限count化し、networkidleを成功条件にしない。POST完了/現在GET/DOMを別々に観測する。

fixture複雑度や有限gateが上限内で成立しなければUI開始前に小操作表を修正申告する。UI1boot失敗後の追加bootを既定にしない。timeoutはmutation停止、同文書read-only有限診断へ。read-resultの操作受付と実GET結果を区別、原POST再送0。raw body/error/stack/nonce/token/パスワードは出さず、許可code/count/boolean/hashだけ外側schema投影する。

browser起動前に自己proxyを指定し、exact自己Hollow originだけforward、unknown/CONNECT/外部Google等を拒否する。redirect後のcontext.route非適用を前提にproxyでも閉じ、route.fetchをACK障害注入に使わない。本段にOAuth/Picker SDK fixtureは不要。公開adapterとbuilt bundleを混ぜる場合のError class同一性は準備純対で確認し、既採用の限定error bridgeを使う場合も介在を記録する。旧public helperの再利用はexact metadata/hash→全文読取の別許可後だけで、旧proof全体の列挙や旧runtime実行はしない。

停止は browser標準close→app quiesce/drain→DBclose→既知自己PID/pipe/socket/control endpointの終端→DB main/WAL/SHMをlogical snapshotとしてexclusive opaque→さらにauditをcopy。opaque/activeはdriver再open0、auditだけschema/ledger/FK/親子内訳/record/原本保持/owner/pin/object_writesを有限確認。標準fallback発動は試行不成功、未知PID/広域scan/手動kill0。失敗/欠けたcounterを後付け完全成功へ再構成しない。

## 10. 採用待ち事項と見積り

ManagerのV1〜V5補正方針に沿う共有差は、(a) 受付時target確定とrequests/jobs加算列・限定0040、(b) queued待機identityと二段10/100枠・30分期限維持、(c) job/version起点の3回復分岐と直接root/ordinal/generationによる元親retry/再cancel・latest集合保持/prune、(d) 待機を含むimpact fingerprint/取消/purge、(e) auto-settingとbackup currentのversion分離、(f) actor11を含む上記path/資源だけ。V1〜V5以外の新port種類/DDL範囲/機能差は提案しない。byte可変pageと固定digest/世代束縛分離は既64KiB/冪等条件の実現方法で、新しい受入gateではない。新利用者選択は求めず、改訂案の採用と実装委譲を待つ。

実装・比例検証の見込みは約8〜14時間。最大の差は待機/親retryの永続不変と全安全hookであり、UIだけを先に接続しない。移行＋型/契約を第一節目、auto/bulk局所と安全hookを第二節目、同bundle UIと停止保全を第三節目とする。15分停滞時は実根拠/具体障害/次手を通知する。計画は合格報告ではなく、S1/S2成果を借用する範囲とS3未実行を維持する。
