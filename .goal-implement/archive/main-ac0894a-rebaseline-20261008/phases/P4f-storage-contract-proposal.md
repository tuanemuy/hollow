# ZIP保存構造・PDF内部holdの接続案

## 結論

2026-09-26、Asia/Tokyo時点のsource読取に基づく未採用案。正式P4f実装、新受入条件、既受入PDFの再検証ではない。[採用済みZIP契約](../design.md#一括zipの接続判断)を保存構造へ具体化する。

Manager判断は、受理generationを保持する`zip_runs`、成功実体への`zip_spool_refs`、ZIP子attemptに束縛した`zip_pdf_holds`を独立した責務として置く構成に限る。PDF需要の正本はattemptとし、第三の需要表は作らない。型名・DDLは候補であり製品契約を変更しない。

親90日、新attempt90日、完成ZIP7日、期限内PDF hold、実close後解放、必要spoolだけの保持は採用済みであり再決議しない。新しい資源値・library・外部サービスは提案しない。

## 根拠と現コードの差

| 根拠 | 読取で確認した接続点 |
| --- | --- |
| [ZIP接続準備](P4f-zip-contract.md)、[ZIP具体案](P4f-zip-proposal.md)、[保持案](P4f-retention-proposal.md) | 親・子・assembly・artifact・deliveryを分離。旧資料の未採用表記より現在designを優先する |
| [PDF schema](../../packages/core/src/adapters/libsql/pdfSchema.ts) | live noteと履歴target ID、compute/artifactのFKは分離。artifactはwriting/ready/cleanup/removed、generation、実容量、削除leaseを持つ |
| [需要port](../../packages/core/src/application/pdf/anonymousPorts.ts)、[需要repository](../../packages/core/src/adapters/libsql/repositories/pdfDemandRepository.ts) | account/anonymousだけ。`find`は現在有効な1候補、`running/succeed/fail`は集合更新。`currentAnyPdfDemand`が計算・公開・保存ownerを制御する |
| [PDF worker](../../packages/core/src/application/pdf/worker.ts) | publishと需要succeedが同UoW。需要更新0なら公開を採用しない。snapshot分岐は第三種別を扱わない |
| [artifact repository](../../packages/core/src/adapters/libsql/repositories/pdfArtifactRepository.ts) | cacheはreadyかつ期限内。cleanup/cleanedは既存deliveryとpdf-artifact writerを見る。内部holdはない。`retire`と実cleanup claimは別操作 |
| [compute repository](../../packages/core/src/adapters/libsql/repositories/pdfComputationRepository.ts)、[request prune](../../packages/core/src/adapters/libsql/repositories/pdfRequestRepository.ts) | boot recoverは既存2需要だけを終端化。artifact/compute pruneの参照除外も既存2種のみ |
| [物理owner](../../packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts)、[purge](../../packages/core/src/adapters/libsql/repositories/purgeRepository.ts) | `claimDelete`はkeyに登録されたactive ownerを確認。まだreaderを開いていないholdを知らない。note purgeにもPDF実体の列挙・owner待ち・FK解放がある |
| [UoW](../../packages/core/src/adapters/libsql/hollowUnitOfWork.ts)、[ObjectStorage](../../packages/core/src/application/ports/objectStorage.ts) | repositoriesは同一transactionで構築。stream/withOwner/putBounded/removeClaimedを再利用できる。ファイルI/OをDB transaction内で待たない |

## 保存構造の候補

以下は列・制約・索引を含むDDL設計案であり、実行可能migrationではない。時刻は既存同様epoch milliseconds、IDは既存生成portを使う。JSONへ置くのは固定options・小さな表示metadataに限り、存在検査する参照は列にする。

| 表候補 | 主な列・制約 | 索引候補 |
| --- | --- | --- |
| `zip_requests` | PK id、account_id、command_id、input_digest、固定options、created_at、history_expires_at、generation、state、cancel_generation、nullable旧表示metadata。UNIQUE(account_id,command_id)、history_expires_at=created_at+90日。stateはactive/assembling/stopping/terminal | UNIQUE(account_id) WHERE state IN(active,assembling,stopping)。履歴(account_id,created_at,id)、消去(history_expires_at,id) |
| `zip_runs` | PK(request_id,generation)、accept_command_id/digest、accepted_at、history_expires_at=accepted_at+90日、state、published_at nullable、artifact_id nullable。初回と正当な明示retryだけ作る。published_atは一度設定したら消さない | UNIQUE(request_id,accept_command_id)、履歴(history_expires_at,request_id,generation)、artifact_id |
| `zip_targets` | PK(request_id,ordinal)、target_note_id、nullable live_note_id、latest_attempt_number。UNIQUE(request_id,target_note_id)。固定集合・順序を変更しない | (live_note_id,request_id)、(request_id,latest_attempt_number)は実queryに必要な場合だけ |
| `zip_attempts` | PK id、request_id/ordinal/generation、attempt_number、created_at/history_expires_at、source_identity/profile、state、failure、compute_id nullable、spool_id nullable、lease/runtime、version。UNIQUE(request_id,ordinal,attempt_number)。targetとrunへ複合FK RESTRICT | (compute_id,state,id)、(request_id,generation,state,ordinal)、(history_expires_at,id)、spool_id |
| `zip_spools` | PK id、storage_key UNIQUE、source_identity/profile/format、bytes/hash、state writing/ready/cleanup/removed、generation、reserved_bytes、cleanup token/until/next_at。removedではkey/fileを消し容量0、readyには検証済bytes/hashが必要 | (state,next_cleanup_at,id) |
| `zip_spool_refs` | PK(request_id,generation,ordinal)、spool_id FK RESTRICT、purpose active/retry、retry_until nullable。run/targetへ複合FK RESTRICT。activeではretry_untilなし。retryは採用済み根拠から導いた固定期限 | (spool_id)、(purpose,retry_until,request_id,generation) |
| `zip_pdf_holds` | PK attempt_id（FK RESTRICT）、artifact_id（PDFへFK RESTRICT）、artifact_generation、acquired_at、state held/reading/closing/released、claim_token/runtime_id、version。需要のstateやactorを複製しない | (artifact_id,state,attempt_id)、(state,attempt_id) |

`zip_runs`の親FKはRESTRICT。親の表示消去とshellの物理削除を分離する。actor IDと必要な同内容受理識別子をshellに置くが、元title・本文を期限後の追跡用に残さない。再試行表示は新run/attemptの期限を検査し、旧親一覧の90日条件を緩めない。初回runを別の新履歴として二重表示しない。

attemptの`state`候補はqueued/running/waiting-pdf/copy-ready/copying/succeeded/failed/excluded/cancelled。PDF待機時はcompute_id必須、copy-ready/copyingは対応hold必須。同一行で表せないhold存在条件は専用repositoryの同Tx遷移で守る。成功結果のmetadataと生存中spool参照を分け、正当な実体解放後にspool_idを外しても過去のsucceededをfailedへ変えない。`spool_id IS NOT NULL`だけを永続的な成功CHECKにはしない。

lease token/until、claim token/runtimeは対でnull許容を揃える。generation/version/bytesは既存のsafe integer制約を踏襲する。`live_note_id`はnullable FK RESTRICT、target_note_idは履歴値。purgeでは該当需要をfenceし、必要な実close・参照整理後にlive側を切る。履歴からnotesをcascade削除せず、履歴のためだけにnoteの物理削除を永久に止めない。

### 組立・完成物との最小対応

組立は既存案の`zip_assemblies`にPK id、run複合FK、assembly_generation、state、lease/runtime、seal_digestを置く。UNIQUE(request_id,generation,assembly_generation)と、runごとに未closeの組立1件となるpartial UNIQUEを候補にする。内部の単調除外・再組立はassembly_generationだけを進め、run受理日時を更新しない。

`zip_artifacts`はassembly参照、immutable published_at/expires_at、key/file、generation、cleanup lease/容量を持つ。expires_at=published_at+7日。`zip_artifact_entries`はPK(artifact_id,ordinal)、noteの履歴ID/nullable live ID、source_identity/profile、確定entry名を持ち、現在全含有対象を有限照合する。spoolへの強いFKは置かない。完成ZIPがあることを理由に不要子spoolを保持しないためである。

`zip_deliveries`はartifact FK、本人、ready/sending/closing/closed、claim/runtimeを持ち、(artifact_id,state)で回収を除外する。詳細な配信期限・枠は本案では決めない。PDF配信表へZIPを偽装しない。assembly readerの実所有は既存object ownerへ接続し、汎用reader需要表を追加しない。

`retry_of`は来歴IDとして強い祖先FKを作らない。新親の固定target/optionsとspool refは自分で持つ。同一keyを親ごとに複製・二重課算しない。必要な成功bytesを参照する表と、結果表示の表を分けることが最小保持の要点である。

## retry受理と保持の原子性

受理port候補は`ZipRequestRepository.acceptRetry(confirmation, now)`。confirmationは本人、旧run/親generation、latest failed attempt IDs/version、明示command/digestを含む。認可値やSQLをclientから受け取らない。

同UoWで次を実行する。

1. 本人の同commandがあればdigestを照合し、元runを返す。時刻・generation・ref期限は変えない
2. assembly/closing中でないこと、本人active枠、現在actor/read、対象最新failedと確認内容、成功子の内容一致・生存spoolを検査する
3. 旧runがpublished済みならartifactのready/期限内と有効失敗履歴の両方を要求する。未公開runなら有効な失敗履歴を使い、7日期限を作らない。artifact_idがpruneされてもpublished_atを消さないため、未公開へ誤分類しない
4. 親generationをCASし、新run/attemptを作る。必要な成功spoolのready/generationを検査し、新runのactive refをINSERT SELECTする。期待した必要ordinal数と不一致なら全体rollbackする
5. 新ref成立後に旧runの不要retry refを除く。親created_at/history_expires_atは更新しない

同じUoWにより、先にprune/cleanupが勝てばretryは非受理となり、先にretryが勝てば新active refがcleanupを止める。CAS失敗後にpayloadやcommandを勝手に変えて再受理しない。DB内部の通常driver retryと明示新操作を区別する。

refのretry_untilは未公開失敗なら対応run/attemptの有効履歴、完成partialなら有効失敗履歴とartifact期限の早い方から導く。実行中はactive refへ引継ぐため、旧期限を跨いでも消えない。新runが未公開のままassembly失敗した場合は、そのrunの固定履歴期限を根拠にretry refへ遷移する。全成功の公開・全close後はrefを外せる。

旧親履歴の期限が来てもactive/new receipt/有効artifactを削除しない。新attemptの90日後も必要な実所有・回収負債だけは残すが、新retryの根拠には使わない。空retry・最新failedなし・成功済みへのno-opで新runを作らない。

## PDF第三需要とatomic hold

### 内向きport候補

`PdfDemand`は中立な`application/pdf/demandPorts.ts`へ移し、既存2branchと`{ kind: "zip-child"; attempt: ZipPdfDemandSnapshot }`を明示する案。ZIP側snapshotはattempt/run/actor/note/identity/profile/computeの必要情報だけを持つ。PDF domainからZIP adapterへ依存させず、同一application層の契約で接続する。

| port候補 | 契約 |
| --- | --- |
| `PdfDemandRepository.find/running/succeed/fail` | 既存signatureを維持可能。succeedの戻り値は終端ZIP子数ではなくartifactを受理した有効需要数。ZIPはcopy-ready+holdへの更新数を含む |
| `ZipPdfHoldRepository.acquireCached(attemptId, expectedVersion, now)` | 現在有効waiting-pdf子と期限内cacheを同Txで検査し、hold作成とcopy-readyを不可分にする。missはcache未取得として共用computeへ合流する |
| `ZipPdfHoldRepository.claim(attemptId, expectedVersion, owner, now)` | heldからreadingへCAS。既存holdとartifact generation/key、現在read/content/run fenceを再確認。取得済みholdのcopy開始・継続に24h取得期限を再適用しない |
| `ZipPdfHoldRepository.beginClose / releaseClosed` | cancel/失敗はclosingへ。releaseClosedはZIP工程の実close・withOwner終了・runtime解放後にだけ呼ぶ。token/version一致とactive object owner不在を確認する |
| `ZipSpoolRepository.publish / claimCleanup / cleaned` | publishは実bytes/hashと現在子/run/認可/内容を照合し、成功結果とactive refを同Tx確定。cleanupと容量解放は後述の条件を要求する |
| `ZipRequestRepository.prune / ZipPdfHoldRepository.prune` | 有限候補の条件付き削除。履歴表示消去、FK切離し、実資源回収を別段階にする |

`claim`のownerは内側のruntime ID/token型であり、Node stream/processを内側へ渡さない。汎用SQL実行や`ignoreAuthorization`をportに出さない。現在認可のapplication側検査に加え、repositoryの受理・公開条件にもcurrent predicateを置き、read後の別Tx変更を採用しない。

### publish/cacheからの接続

PDF workerの既存publish+succeed同UoWで、現在有効なwaiting-pdf attemptsを対象にholdを作り、同じ集合をcopy-readyへ更新する。PDF artifactはready・一致identity/profile・expires_at>nowが条件。holdのPK attempt_idで重複を排除する。既存holdへの再照会はartifact/generationと対応attempt状態が一致する場合だけ元結果を返し、状態を巻き戻さない。released holdの再取得、異なる実体への上書き、期限後の新用途への再発行はしない。

cache経路も同じrepository内部操作を使う。候補readだけ先にcommitしてholdを後付けしない。hold挿入かattempt更新の片方でも期待件数と不一致ならrollbackする。hold IDを新生成する必要はなくattempt_idを所有識別に使える。compute合流後に有効需要0なら既存どおり公開しない。

`currentAnyPdfDemand`、find、claim/renew、保存owner、worker snapshot switch、fail、boot recoverへZIP branchを追加する。ZIP判定は親の90日ではなく、受理済みrunの現在実行状態・取消世代・現在actor/read/contentを使う。無効なZIP候補で有効な既存兄弟を止めず、ZIP取消はそのattemptだけを外す。

PDF ready後はrender需要からcopy所有へ移る。copy-ready/reading holdをrender需要として残さない。recoverはwaiting-pdfの中断結果と、既に実体を得たholdのclose/recoveryを分ける。既存2表だけ失敗化してZIP待機子を残す実装にしない。

### holdと実close

`zip-source` ownerのidをattempt_idとし、内部holdとactive run/claimへ照合する。spool writerは`zip-spool`、組立/配信はそれぞれの工程ownerへ接続する。必要なkindは`WriteOwner`とschema CHECKの両方へ追加し、既存最後のconversion分岐へfallbackさせない。

`retire`による取得禁止と物理cleanup claimは分ける。既存holdはartifactが取得期限切れ又はretire済みでも、現在ZIP認可が有効で実delete未claimなら所有されたcopyを完了できる。新holdはreadyかつ期限内だけ。purge/認可喪失時はcurrent checkでcopyを止め、closing holdは実closeまで保持する。単にready状態だけをsource owner条件にすると、retireとcloseの競合を正しく扱えない。

コピーは期待bytes/hashを検証し、source readerとspool writerの実close後にspool結果を確定する。withOwner/runtime解放後にholdをreleasedとする。DB解放失敗はholdを残す。lease切れ・abort返却・TTLはclose証明ではない。再起動時の旧runtime終了確認は既存所有回復へ接続し、起動したという理由だけで新しい独立hold回収規則を作らない。

## 条件付き回収と索引

以下はadapter内SQLの形を示す。`:limit`は既存の有限処理方針へ接続する値で、本案は具体値を追加しない。対象候補選択と更新は同UoWで行い、更新側でもstate/generation・参照不在を照合する。

```sql
UPDATE zip_spools
SET state='cleanup', generation=generation+1,
    cleanup_token=:token, cleanup_until=:until
WHERE id=:id AND generation=:generation
  AND state IN ('writing','ready','cleanup')
  AND NOT EXISTS (SELECT 1 FROM zip_spool_refs r WHERE r.spool_id=zip_spools.id)
  AND NOT EXISTS (/* このkeyのactive reader/writer */)
  AND (/* 生成owner終端、cleanup候補時刻、既存claim非競合 */)
RETURNING id;
```

refの期限切れだけではspoolを直接削除しない。期限切れretry refを条件付きで外し、activeへの同Tx引継ぎ済みrefを残してから上のclaimを行う。readyへ戻す経路やcleanup世代への新ref取得は設けない。再取得側もspool ready/generationをINSERT条件に含める。

PDFのcleanup claim/cleanedには次の存在検査を追加する。

```sql
NOT EXISTS (
  SELECT 1 FROM zip_pdf_holds h
  WHERE h.artifact_id=pdf_artifacts.id AND h.state!='released'
)
```

索引`(artifact_id,state,attempt_id)`で支える。同条件を物理`claimDelete`にもkey→pdf_artifacts→holdで適用する。note purgeなど別入口が直接removeClaimedへ進んでも、未openのheld参照を飛び越さないためである。spool/ZIP artifactもref・delivery・active readerをkey単位の削除条件に含める。runtimeにreaderがある間は既存object_write_keys/object_writesの排他も維持する。

PDF artifactのstateをremovedへ進めるには同じhold/owner不在と現在delete tokenのdone receiptを要求する。key・bytesの解放はその後だけ。失敗はcleanup負債を保持し、履歴期限から容量を戻さない。本人active枠は実処理終了で外せるが、物理負債は独立して残す。

metadata pruneの順序候補は、released holdの削除とattemptの不要compute/spool参照切離し、removed実体行、期限外terminal attempts、不要run、不要targets/parent shellである。各段階はFK RESTRICTとNOT EXISTSで防御する。artifact参照はrunから切り離せるが、published_atの事実はrunが必要な間保持する。PDF側既存pruneにはzip hold/attemptのFK参照除外を追加し、closed+workspaceRemovedでもZIPが参照中のcomputeを消さない。

期限外titleの消去は物理pruneと独立に実行する。receipt表示はhistory_expires_at>now、新成果物取得はartifact期限と現在全含有認可/内容、active追跡は最小状態だけを返す。期限外親の残存行を履歴可視性の根拠にしない。

## 採否と実装境界

採否が必要なのは次の保存・port配置だけである。

- 受理generationを`zip_runs`へ置き、内部assembly世代と分ける。artifact参照をpruneしてもpublished済みの事実を保持し、期限切れpartialをnever-publishedへ誤分類しない
- 成功spoolの必要参照をrun/ordinal単位の`zip_spool_refs`へ置く。歴史上の成功結果から物理実体への参照を外せる型にする
- `zip_pdf_holds`をattempt単位の内部所有表とし、需要はattemptから導く。共通需要portを中立位置へ移し、既存publish+succeedの同Txを維持する
- 正常cleanupだけでなく物理claimDelete・purge・recover・metadata pruneにも同じ保持条件を接続する。新しい汎用workflowやstorage rootは作らない

製品変更候補は新ZIP domain/application/adapter schema・repositoriesと、PDF需要port/worker/需要・compute・artifact・prune repositories、UoW登録、object owner/schema・purgeの接続点である。匿名ticket/cookie/rate、既存PDF配信2枠、renderer、本人PDF90日、本文保存、batch mutation worker、公開URL、Driveは変更理由にしない。

DDL名・CHECKの完全形・索引query plan・移行・同時Tx・real close・容量・実ZIPは未検証。実装担当が正式段階で具体化する。本書は新しい合格条件を定めない。doc-style/markdown-styleに従い、採用済み制約と本案の保存形を分けている。

作業は文書・非秘密sourceの読取と本書作成だけ。製品、管理正本、既存報告、DB、fresh/旧proof、鍵、外部、browser、test/build/gitを操作していない。全文確認後、担当文書を含む全操作を停止する。
