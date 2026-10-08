# P4f-1 製品接続の初回詳細案

## 判断依頼

2026-09-26、JST。固定 P4f-1-A〜H の実装前提案。採用済みの業務寿命・500件・1GB・本人1 active・HTML/Markdown先行を変更しない。以下の10表・5 repository、共有storageの実close契約、ZIP専用配備値を採否対象とする。製品編集・install・DB・runtime起動はまだ行っていない。

主実装は10〜16時間、独立検証は別。最大の不確実性は新しい参照保持とpurge/bootの接続で、ZIPライブラリ自体は[P4f-0独立合格](../reviews/P4f-0.md)を借用する。初期DDLと所有対を先行し、型だけの基盤を利用者向け完了とはしない。

## 内向き型と共有境界

`domain/zip/entity.ts` に保存用 `ZipFormat = 'html' | 'markdown' | 'pdf'`、`application/zip/ports.ts` に提供用 `ZipAvailableFormat = Exclude<ZipFormat,'pdf'>` を置く。domainはapplicationをimportしない。既存単件 `ExportFormat` と既存batch操作unionは変えない。

初回受付は `requestZip(c, {session, commandId, confirmation})`、previewは `previewZip(c, {session, context, selectedNoteIds, format})`。保存options.styleは`saved`固定policyで、各noteの保存styleを使用し追加選択UIは作らない。transportでUUID・重複・500件・optionsを検査、applicationは現在本人と現在内部readを検査する。confirmationは正規化した固定選択・形式・現在の対象版/内容と保存styleのidentity・空本文除外のdigest。元selectionの順をordinalとする。previewは50件ずつ表示し、件数とdigestは固定500以下を対象にする。501検出と全空は未受理。漏洩する不可読noteのtitle/状態は返さない。

受理後はaccountIdだけを保存し、session/cookie/公開URL/共有tokenを保存しない。`readZipSnapshot(c,u,{accountId,noteId})` を別入口にし、verified account＋`canScope(...,'read')`＋active noteだけを認可する。失権後のpublic/link fallbackはない。

既存 `export/snapshot.ts` の媒体列挙と `EXPORT_DOCUMENT_PROFILE` identity計算を `buildExportContentSnapshot(c,u,note)` へ抽出する。単件のaccount/public/link認可とidentityのproperty順・値は不変。ZIPはこの内容部分だけを使い、単件prepareを500回呼ばず、PDF構成も要求しない。本文800KiB等の既存合法境界は変更しない。単件が別に確認する `inspectExportSources` のexternalIdentityもspool/artifact-entryへ固定64hexとして保持し、生成・公開・取得前の同じ安全inspectionを照合する。外部URL本文をZIP DTO/historyへ出さない。

`ZipPreview`、`ZipReceipt`、`ZipJobView`、`ZipTargetView`、`ZipHistoryPage` はZIP専用。受理応答は `accepted(receipt) | rejected(code)`、通信不明はclient側unknown。command/digest再送は同じreceiptと時刻を返す。保存済み結果を現在title/設定から補完しない。履歴上の成功と現在生存spoolは別unionにする。

### Repository と port の責務

全repositoryは既存UoW内で構築する。時刻/ID/認可は既存portを使い、Node型・ambient clock・SQLを内側へ出さない。以下の入力型名は同じapplication/zip内のreadonly構造型とする。

| repository / 操作 | 入出力と原子性 |
| --- | --- |
| `ZipRequestRepository.accept(input: ZipAccept, now): Promise<ZipReceipt>` | account/command一意、digest一致の既存receipt又は新parent/run/targets/attempts。本人activeとglobal execution予約を同Txで確保。対象0は不可 |
| `acceptRetry(input: ZipRetryAccept, now): Promise<ZipReceipt>` | 最新failed IDs/version、現在read、旧runのpublished事実/有効期限、成功spoolの現在identityを確認後、新run/attemptとactive refsを同Tx作成。旧parent90日は不変更 |
| `acceptAssemblyRetry(input: ZipAssemblyRetryAccept, now)` | failed childrenがなく純粋assembly failureの有効receiptだけから新parent/retryOfを作成。成功metadata/refsを新parent自身へ移す。祖先FKは作らない |
| `lookup(accountId, commandId)`、`get/list/summary/active/watched` | bounded表示と本人認可。旧parent期限後は新runの最小receiptだけを新受理90日で表示。履歴50・active/watched50単位 |
| `cancel / cancelWorkspaceMember / invalidateNote / prune` | generation fence、waiting取消、running終端とclosing所有を分離。全降格/離脱の既存同Tx取消へ接続。移出後の現在所属を検査し、旧scopeだけで無関係な仕事を取消さない |
| `ZipWorkRepository.claim/renew/finishAttempt/beginAssembly/exclude/publish/fail/closed/recover` | runtime/lease/run generationとcurrent account/read。spool成功＋attempt結果＋ref、artifact公開＋run結果をそれぞれ同Tx。assembly世代は受理世代と別。現在identity再確認も同UoW内で行う |
| `ZipSpoolRepository.reserve/publish/claimCleanup/cleaned` | writing→ready又はcleanup→removed。verified bytes/hashと参照の確定。削除receiptと実owner不在後だけ容量0。retry ref取得とcleanup claimは同Tx競合 |
| `ZipArtifactRepository.reserve/publish/retire/claimCleanup/cleaned` | assemblyの同一物理keyを完成artifactへ移管し、reserved bytesを一度だけ移す。公開7日不変。公開後の全含有認可失効は旧ZIP全体取得不可 |
| `ZipDeliveryRepository.prepare/claim/beginClose/close/prune` | owner accountとartifact世代、期限、全entry現在read/contentを検査。DB枠とruntime実reader枠を整合。reader/withOwner終了→runtime release→DBclosedの順 |

`ZipExecution` はrun1件のactual promiseとabort/closeを保持し、`start/ids/stop` を有限にする。`ZipTransfers` は専用配信2件、同delivery二重hold拒否、`stop`は実終了Promise。既存PDF/HTMLMD枠には登録しない。

`ZipWriter.write({entries, manifest, signal, sink}): Promise<ZipWriteResult>` は内向きの逐次owned sourceとowned sinkだけを扱う。成功結果はbytes/hash、全source/sink closed確認済み。Node adapterのみが公開 `ZipArchive` を使用する。P4f-0のAPI/STORE式/close対を移植し、同期renameをDB公開の代用にしない。

## 0030 migration 候補

新規10表。PDF用hold・compute FKは次phaseであり、未提供値のダミー列を作らない。safe integer、generation>0、bytes>=0、nullable lease組の一致、固定state/formatをCHECKする。FKは原則RESTRICTで、物理資源をcascadeで失わない。

| 表 | 主要列・制約・索引 |
| --- | --- |
| `zip_requests` | id PK、account_id FK、command_id/digest、format3値/style、created_at/history_expires_at=created+90日、generation/cancel_generation、state active/assembling/stopping/terminal、retry_of来歴。UNIQUE(account,command)、partial UNIQUE(account) active/assembling/stopping、および同stateを対象とするconstant expression UNIQUEでglobal run1、履歴(account,created,id) |
| `zip_runs` | PK(request_id,generation)、account_id、accept_command/digest、accepted_at/history_expires_at=accepted+90日、state、published_at不変nullable、artifact_id nullable。UNIQUE(account_id,accept_command)、accountは親との一致guard、期限索引。初回もretryもこの同command索引を通す。親とartifact FK RESTRICT、不要artifact参照は解放してもpublished事実は保持 |
| `zip_targets` | PK(request_id,ordinal)、target_note_id履歴値、live_note_id nullable FK RESTRICT、latest_attempt_number。UNIQUE(request,note)、ordinal 0..499、live_note索引。元固定順は更新禁止 |
| `zip_attempts` | id PK、request/ordinal/run generation複合FK、attempt_number、created/history+90日、queued/running/succeeded/failed/excluded/cancelled、result metadata/identity/profile、lease/runtime/version。UNIQUE(request,ordinal,attempt_number)、run/state/ordinal索引・期限索引。成功metadata必須だが生存spool FKは必須にしない |
| `zip_spools` | id PK、storage_key UNIQUE nullable、format/profile/source_identity、writing/ready/cleanup/removed、bytes/hash/reserved_bytes、generation/cleanup token/until/nextAt。readyに検証済key/bytes/hash、removedにkey null/予約0。cleanup索引 |
| `zip_spool_refs` | PK(request,generation,ordinal)、spool_id FK、purpose active/retry、retry_until。run/target FK RESTRICT、spool索引、purpose/期限索引。activeにはretry_untilなし。新refはready spool世代と同Tx照合 |
| `zip_assemblies` | id PK、run FK、assembly_generation、writing/closing/closed、outcome success/failure/excluded/cancelled nullable、storage_key/bytes/hash/reserved、lease/runtime/seal_digest。UNIQUE(run,assembly_generation)、runごと非closed1、global非closed1のguard。現在採用ordinal集合は500以下の固定JSON。refsはcloseまで残す |
| `zip_artifacts` | id PK、assembly FK、ready/cleanup/removed、key UNIQUE nullable、bytes/hash/reserved、published_at/expires_at=published+7日、generation/cleanup lease。readyのkey/bytes/hash必須、removedはkey null/予約0。期限/cleanup索引 |
| `zip_artifact_entries` | PK(artifact_id,ordinal)、target_note_id/live_note_id FK nullable、identity/profile、確定entry_name/bytes/hash。spool FKなし。artifact/current-note索引。全含有再認可とpurgeに使用 |
| `zip_deliveries` | id PK、account_id/artifact FK、artifact_generation、ready/sending/closing/closed、created/expires、runtime/claim。期限<=artifact期限、非closed全体2 guard、artifact/state/期限索引 |

immutable作成時刻/業務期限/published_at/固定target、合法state遷移、spool refへのcleanup世代取得拒否、全owner activeが終わる前のremoved/closed禁止をtriggerと条件付きUPDATEで守る。cross-tableの容量・global admissionはUoW内集合確認＋INSERT/UPDATE guardに置く。closed履歴行の削除を新受付用guardで妨げない。

親/runの循環artifact参照はnullableで作り、公開Txで設定、prune時は必要な参照を外してから順序付き削除する。history cutoffは表示条件とmetadata scrubで先に適用し、active/new receipt/有効artifact/所有/負債のshellは保持する。

0029までの旧構造・trigger・全列を停止下cloneで比較してからfreshへ適用する。fresh ledger30→31以外の既存製品値を移行試験で変えない。失敗中途DDL rollback/FK/guardと旧rows read互換を小fixtureで検証する。

## HTML/Markdown生成・実所有

現 `IsolatedExportDocumentWriter` のworker_thread termination待ちとsafe segment plan、`exportStream` の逐次data URI、`FileExportSourceReader` のbytes/hash照合を使う。ZIP用abort/deadlineを渡し、plan workerを待たず次子を開かない。1子ずつ生成、spoolのsink閉鎖と入力読取完了後に現在内容を再取得し、identity一致・current read・run fenceを同Tx確認して成功へ進める。

共有storageには optional `openOwnedRead(key, signal): Promise<OwnedObjectRead>` を追加する案。`OwnedObjectRead = { body: ReadableStream<Uint8Array>; closed: Promise<void>; cancel(reason?: unknown): Promise<void> }`。closedはnative stream/file handleのclose完了でのみ解決する。configured ZIP DIはこの実装を必須にし、既存 `stream` のsignature/挙動は変えない。Node coordinated wrapperはkey登録を行い、`stat`だけを所有登録の代用にしない。

`WriteOwner` に `zip-spool` / `zip-assembly` / `zip-delivery` を追加。spoolの媒体読取と出力はzip-spool、assemblyのspool読取と出力はzip-assembly、配信はzip-deliveryへ束縛する。対応する新ZIP guard、ownerActive、canPublish、物理claimDelete、purge列挙/FK切離しを一緒に変更する。現在object_writes.kind自体はCHECKなしの型指定であり、既存CHECKがあるとは扱わない。PDF需要・compute・rendererは変更しない。

現 `withOwner` はfinallyでendWriteするため、実close不明のままworkをrejectしてはいけない。ZIP operationは全native closed Promiseを保持し、abort/deadlineは失敗結果のfenceを立ててもclose待ちは終わらせない。UIには安全確認中/失敗を返せてもexecution/active object owner/予約/本人activeは残す。正常停止が閉鎖確認できないときは停止未完として返し、common recoverWritesも旧runtimeの終了証明なしに進めない。任意timeoutをclose成功としない。

FileExportSourceReaderのcloseは現在boolean先行なので、ZIPで利用する前にclosePromiseを共有する局所修正を提案する。cancelとpending readが並ぶ際、再呼出が未完file.closeを追い越さないようにする。正常単件bytes/identity/lifetimeは不変更で、遅延close対だけを追加する。

完成outputは共有storage putBoundedの実close後、sealされたentry集合を再認可し、ZipArtifact publishを同Tx実行する。公開前に無効になったentryを単調に除外、旧assemblyは実close/remove後に次世代を組み直す。各再組立で少なくとも1 ordinalを除き、最大500回だが工程総期限で有限。追加・復活・新本文採用なし。manifestしか残らなければ失敗。公開後は一部除外による透過再組立をしない。

## 名前とSTORE

既存filenameのNFC/禁止文字/DOS名/180byte stem処理を再利用し、ZIP平坦名だけに全Unicode case fold＋width mappingの衝突keyを適用する。既存Unicode16データを中立Node helperへ移し、browse側は同じmapping/NFDの関数を使う互換再exportを残す。tagや検索keyの正規化結果は変更しない。

先に全元候補名と `hollow-export-report.txt` の衝突keyを予約し、ordinal順にsuffixを割当てる。元`(2)`等を後付suffixで奪わず、拡張子を維持。既存stem180byte＋最大500 suffix＋拡張子から全名200UTF8byte以内を技術的出力境界とする（利用者title上限は増減しない）。manifestとcase/幅/fold衝突も同じ割当器を通す。

1GB集計はbigintで portable entry bytes＋UTF8 manifest bytes、等号許可。payloadが超過したら全体失敗・分割案内で、小さいZIPへ勝手に削らない。STORE出力上界は固定依存のlocal/central headers・UTF8名・descriptor・ZIP64余裕を含むP4f-0検査器を使い、実出力bytesと照合する。ZIP overheadは業務1GBへ含めず、物理予約には含める。

## Node参照配備の数値案（未採用）

`HOLLOW_ZIP_CONFIG` を非秘密JSON設定pathとする。未設定は一括ZIP未構成、既存単件は継続。既存ZIP資源の所有不明なら未構成扱いで回復を飛ばさずboot fail-closed。今回の参照配備はNode22/macOS、将来本番OSを決めない。

| 項目 | 提案と根拠 |
| --- | --- |
| global execution | 1 run、child1/assembly1は直列。本人1activeと別に全体busyを返す。別の永続待機列を作らない。STOREと既存plan workerの同時負荷を限定 |
| ZIP delivery | 全体2、同delivery1。既存HTMLMD2枠/PDF2枠を借りない。1GB大成果物なのでprepare/転送を含む10分、artifact期限でclamp。延長せず明示再取得可能 |
| 専用容量 | ZIP4GiB。既存HTMLMD2GiB＋PDF4GiBと合計10GiBのexport予約区画として構成確認。1GB spool＋約1GB assembly＋旧partial約1GBを同時保持するケースと余裕を初期根拠にする。複数の7日artifact/retry spoolで埋まれば新処理は技術的容量不足、約束済み実体を早期evictしない |
| 予約単位 | spool生成前にplan上界（残業務容量+超過検出1byteまで）を予約、実close後actualへ。assemblyは実entry/manifestのSTORE上界を予約。物理key一回計上、ref数で増やさない。assembly→artifact同じkeyをDBで一回移管、copyなし。deliveryは既存artifactをpinするだけでbytes再計上なし |
| 工程期限 | run総30分、1子120秒（既存plan30秒を含む）、1assembly120秒、delivery600秒、cleanup1試行30秒。いずれも調整可能技術値、合法最大入力で十分とは未実証。期限は失敗/abort理由でありclose保証ではない |
| lease/loop | lease60秒、renew/wake2秒、1tick最大20遷移、prune/cleanup100候補。全対象500以上を隠れ読取しない。所有切れでも旧実処理closeまで次claim不可 |
| stream | source同時1、64KiB chunk/HWM、entry metadata<=501、writerはsource.closed後だけ次open。sinkのbackpressureとcancel伝播。output上界超過/短読/過読/hash不一致は未公開 |

4GiBは業務上限でなく初期operator設定で、既存PDF/HTMLMDの予約を圧迫しない分割。共有diskの実空きは別問題であり、同じ10GiBを各機能が二重に利用しない。外部process・元notes・一時的FS増加もあるためOS物理hardquotaとは主張しない。I/O容量不足は安全な失敗として全所有を回収する。実生成超過があればactual負債を記録し、解消まで新ZIP予約を止める。

### 初回確認への具体化

新物理予約のNode容量portは、ZIP用mutex内で同filesystemのstatfs.availableを採取し、そこから既存HTMLMD＋PDFの設定区画全量（参照配備6GiB）とZIPの未実体化予約を控除する。残量が新予約を満たす場合だけ、同じmutexを保持してUoWでZIP4GiB上限・run世代・予約を再検査しCAS取得する。予約前のsampleを使い回さず、取得前にwriterを開かない。metadata I/OはDB transaction外、予約の確定はDB内で行う。global run1が他ZIP生成を防ぎ、deliveryは新bytesを作らない。

既存実体量をDBから引いて保護量を減らす最適化はしない。fileが実体化/削除される時刻とDB状態の差による過大受付を避け、既存の未使用保証分・書込中未実体化分を区画全量の包絡で保護する。既存実体済み分もheadroomへ再度保護するため保守的に拒否し得る。10GiBは予約会計の合計であり「10GiBのvolumeだけで常に全区画併用できる」という保証ではない。このheadroomは追加file課算ではなく受付の安全余裕で、同じ物理keyの容量ledgerは一回のみ。既存native tempの未保証超過や他processによる空き変動はこの論拠の外で、検知失敗/負債を隠さない。

global run1はassemblyだけでなく受付Txのrequest activeからstoppingの実closeまでDB partial UNIQUEで保持する。close不明・停止途中では別accountを含む次runを受けない。pure cleanup負債は実所有終了と区別し、本人activeは外せても容量を戻さない。

予約上界やplan.maxBytesに達した事実だけでは業務1GB超過にしない。実entry出力＋manifestの実UTF8 bytesを同じ検査器で数え、1,000,000,001 bytesに達した場合だけ`ZIP_TOO_LARGE`とする。技術予約不足は`ZIP_CAPACITY_BUSY`、source短読/過読/hash不一致はsource failure、close不明はownership failureとして別に残す。manifest最終値が未確定な途中では、上界予約と実合計を別に保持する。

使用しない予約は実close/実removeの根拠後だけ戻す。削除不能、close不明、DBclose失敗は負債として残す。受付拒否や失敗理由はpermission/空本文/1GB業務超過と技術容量・期限・未構成を分ける。

## UI・HTTP・寿命接続

既存selection ownerのID集合とactor/context fenceを共用し、`ZipSelectionDialog`を別islandとして追加。viewerにもHTML/Markdown ZIPを表示。PDF/Driveは未提供のまま。送信前command保持、unknownは同ID同payload明示再送、actor/context変更で旧応答破棄、設定後の自動選択復元なし。

`/api/zip/requests`（POST）、`/api/zip/requests/:id`（GET）、preview/retry-preview/retry/cancel、本人command lookup、history/summary/active/watched、delivery prepareとnative GETを専用HTTPへ置く。JSON schemaでformatを2形式に限定。cookie/sessionは毎入口で現確認するがDBへ保存しない。通知は親/run単位、既存import/batch/PDFと独立dismiss、初回過去終端一斉通知なし。

7日成果物の再取得はartifact存在だけでなく全artifact_entries最大500の現在内部read/contentを同UoW照合し、claim/継続renewでも失効を検知する。内容不変moveは許可。purgeは対象entryをfenceし、全writer/reader/withOwner終了と共有spool refsを確認、実remove receipt後にlive FKを外す。別親の有効refsを誤削除しない。

部分成功retryは最新failedだけをfresh previewして受理し、成功spoolを現在identity一致のまま新runへ同Tx移す。assembly/closingはretry全拒否。新runの未公開失敗はその新90日、旧parent90日は不変。artifact失効後に新retryを開始せず、期限前受理済みrunのactive refは維持する。履歴scrub→期限retry ref解放→実体回収→FK shell pruneを分ける。

## 工程・根拠・見込み

1. 共有契約採用後、停止確認/新proof保全と候補指紋。型・0030・5repo・owner/guardの隔離DB対、clone旧比較（2〜3時間）。
2. durable snapshot/HTMLMD spool・STORE/name・実close/負債・worker、retry/retention/purge/boot小対（3〜5時間）。
3. HTTP/selection/history/通知/ACK/currentcontextと設定/配備（2〜3時間）。
4. 規定checks・関連Node、停止下build、同bundle実HTML/MD ZIP内容/日本語/manifest/反復取得/390・自己回収保全・旧比較/固定（3〜5時間）。

不変PDF renderer/font/channelや元公開全matrixは借用。共有storage/Unicode抽出/単件snapshotは既存回帰の必要小対を足す。初期影響候補は既存selection関連P3e-B、jobs P2a-E、単件export P3f-D/E/H、所有/回復 P2d-2-B/C/E/FD、purge P2d-1-C/P3b-1-D、schema保全 P4a-H/P4b-G/P4c-K/P4d-2-A/H、PDF delivery/purgeの共有境界など。正確な旧IDは実編集後に完了条件を照合して報告し、予定だけで再openしない。

補助を使う場合、共有型固定後の新safe-name pure adapter/test又は限定repo testだけを専有pathで提案する。環境・migration・全量検査は主担当が直列所有。最終は製品only commit、source/bundle/lock/dist、runtime設定/依存notice、全停止と同bundle根拠を固定して独立へ返す。
