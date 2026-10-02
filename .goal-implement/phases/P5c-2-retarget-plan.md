# P5c-2 Retarget: 未送信原本を確認付きで新保存先へ受け付ける

状態: **具体設計・資源の採用待ち、実装未着手**。基点は `574ef4704de74e39392e1d273e2f7e2169d2d88c`。Managerが採用したのは current target head / CAS / 旧全行不変の方向であり、本書の0041・port詳細・資源は未採用である。公開source・要件・[静的不足報告](../reviews/P5c-2-folder-change-gap.md)だけを読み、本書だけを新規作成した。製品/DDL/管理正本・DB・proof・鍵・旧private・実行/build/networkは操作していない。`spec` / `spec-implement` は呼ばない。

## 1. 利用者結果と固定範囲

IN-05の利用者決定に従い、永久削除を含む保存先利用不可は確認→再選択/新規作成、trashは復元も案内する。旧保存先へ外部fileを作成していないと証明できる原本について、本人が新保存先を確認して元操作をやり直し、同じ原本を本人Driveへ保存できる状態にする。IN-06・正本P5c-2-Iの不足を閉じる。旧folderの復元/権限回復を、新folderでの回復成功として数えない。

新保存先への操作は新manual request/jobであり、同じ設定で旧failed子をretryするJB-02とは分ける。旧bulk親・旧terminal・old commandの結果は変えない。自動retarget、一括retarget専用機能、成功recordの移動、旧Google物の削除/移動、別subへの付替え、旧外部結果不明を重複リスク承認で回避する機能は追加しない。新画面は作らず現ノート詳細の単件パネルと既Drive Settings導線を使う。

| ID | この段の完了条件 | 対応する既要件 |
| --- | --- | --- |
| RT-I1 | 旧folder F1の待機取消/未送信失敗後、新folder F2を明示確認して新受付でき、F2の成功record/linkが現在GET・再訪で見える | P5c-2-I/A、IN-05/06 |
| RT-I2 | fileId割当前のfolder検査失敗かつ実close/ACK済みもI1へ進める。allocated/session/ACK不明/owner不明/pin/recordありには別IDを作らない | P5c-2-I/C/D、design同ID/実所有 |
| RT-B | 同tupleの現行先は1つ。初回/並行再受付/旧confirm/旧retry/設定変更・admission競合で二重live0。同commandは旧intentの同receipt | P5c-2-B/E、IN-06 |
| RT-H | 旧target/job/transfer/record値・90日表示・旧scope取消・purge保護を維持し、head更新で旧記録を隠して安全と判定しない | P5c-2-H/E、JB/IN-07 |
| RT-J | 0040→0041の旧全値/FK/guard/ledger保持とrollback、型/境界/規定checks/比例対/同bundle UI/停止保全が成立 | P5c-2-J、CLAUDE/brief |

S3の一覧SSR調査・G/H代表UI、P5c-1残UI、actualfresh、P5c-3、音声は別範囲。Retargetの成功でそれらを完了扱いにしない。外部依存は契約段階だけとし、実Google操作許可を増やさない。

## 2. 既コード根拠と変更の理由

`request.ts:154–247`、`read.ts:69–109`、`captureBackup` は original/account/sub の既targetを選び、旧folder意味一致を要求する。`drive_backup_target_original` は同tupleの全行uniqueで、0039 target update guardはfolder/epoch/marker変更を禁止する。したがって単純な新target insertも旧folder変更もできない。

現 `runner.ts:375–394` はowned source準備とfolder検査をfileId割当前に実行する。fileIdは同408–435行で永続化後だけ同510行のstartResumableへ使われる。一度非nullのtarget.fileIdは旧guardによりnullへ戻せない。owner closedでもfolder検査までしか進まなかった枝は存在し、owner noneだけに絞ると今回の主要な回復要求が残る。一方、received0/session nullだけでは未送信を証明できない。

採用する分離は「target = 不変な保存先/file同一性の来歴」「head = 同tupleで次に使用できる唯一のtarget」。folderをunique keyに加えてfolderごとの並行liveを許す方式や、旧targetをretiredへ書換える方式を採らず、旧全行の値を保持する。

## 3. 型・portと証拠

domainに次の閉じた概念を追加する。UUID/安全整数/subject等は既schemaを再用する。保存・transportの境界でstrictに検証し、domain/applicationはNode/SQL/Executionの可変registryを持ち込まない。

```ts
type DriveBackupTargetHead = Readonly<{
  originalId: string;
  accountId: string;
  subject: string;
  targetId: string;
  version: number;
}>;

type RetargetPersistenceEvidence =
  | Readonly<{ kind: "never-sent"; head: DriveBackupTargetHead;
      target: Extract<DriveBackupTarget, { state: "unallocated" }>;
      closure: "never-owned" | "closed-before-create" }>
  | Readonly<{ kind: "blocked"; reason:
      "active" | "already-saved" | "allocated" | "delivery-unknown" |
      "ownership-unproven" | "changed" | "invalid-evidence" }>;
```

これは永続証拠の分類であり、`never-sent`だけで外部送信を許す型ではない。applicationで現在認可・source・folder・runtime閉鎖確認を併せた時だけ新受付できる。認可用の証拠をDTOへそのまま出さない。blockedは安全な説明コードだけを投影する。

`DriveBackupTargetRepository` 内に `head(tuple)`、`isCurrent(targetId)`、`inspectRetarget(tuple)`、`replaceHead(expectedHead, expectedTargetVersion, nextTarget)` を追加し、既公開 `insert(target)` を `insertInitial(target)` に置き換える。初回/切替の操作は同UoW内でheadとtargetの一組を保存する専用portで、raw target insertはadapter内部に閉じる。通常target.replaceからheadを変更できない。`original(tuple)` はhead経由の現在targetへ変更し、`find(id)` は歴史的targetを返すまま。新repository種類・DI/UoW登録は増やさない。SQL詳細やNode proofをdomain portへ返さない。

### 3.1 永続never-sentの必要十分な採用範囲

同tupleの**全target/全transfer/全job**をEXISTS/NOT EXISTSで評価し、先頭100や直近jobだけで陰性判定しない。historical targetも含める。

1. headはexactに1件、current targetとtuple/note/originalが一致。全targetはunallocated/fileId null、同tupleのrecordなし。既割当/unknown/confirmedが1件でもあれば拒否。
2. 全jobはterminal failed/cancelled、bytes0、原本/actor/targetの整合が保たれる。非terminal、曖昧なjob→transfer参照、既存legacy jobが要求するtransferの欠測は拒否。新snapshot待機jobだけのtransferなしは正規状態。
3. 全transferはterminal failed/cancelled、received0/session null/statusAttempts0/offset null/length null/readPinned0/refreshPending0。jobId nullの保存transferも検査する。identityのoriginal/account/sub/note/target一致を確認する。owner active/unknownを拒否。
4. owner noneは既型/guardによりclaim前である。owner closedは下記の限定枝だけ採用する。UNKNOWN/CONFLICT/送信成否不明をnever-sentへ縮退させない。
5. closed-before-createの旧transferは、`phase=failed`、failureが `DRIVE_BACKUP_FOLDER_TRASHED` または `DRIVE_BACKUP_FOLDER_UNAVAILABLE`、かつ1〜3を満たすものに限定する。この二つは現runnerのfileId割当前のfolder検査で確定する経路であり、対象targetにfileIdがないことと合わせてfile作成前と証明する。closed/cancelledや一般CHANGED・UNKNOWNをこの枝へ推測分類しない。source失敗等を無条件に追加せず、必要なら同じ副作用順序の根拠をManagerへ返す。

folderが不可視という観測自体は安全証拠ではない。永続fileId不変・副作用前の割当保存・上記全行検査を証拠とする。過去のfileId割当/commit ACKが不明な経路、session開始ACK不明、pin残存を許可しない。providerが保存済fileIdなしでstartできないことを比例対で再確認する。

90日pruneでjobが消えていてもtransferはtargetとともに残り、上記3〜5を検査する。全job/transferが0件の場合は、正規pruneで消えるのがjobだけであること、存続するunallocated target/fileId不変、recordなしを根拠に「一度もfile作成開始に進めない正規target」と判定できる。既存legacy jobに対応する必須transferだけが欠けている状態とは区別する。新schema導入時に旧target/transferの整合を検査し、不整合をこのゼロ件枝へ分類しない。旧source snapshotがない場合も新操作は現在の同original ID/hash/bytes/key/ownershipを固定し、過去jobの設定を復活させるretryと扱わない。

### 3.2 実closeとcaller

`closed-before-create`には永続closedだけでなく、既Executionによるcaller終端/closure ACKと前任終了の確認が必要。通常maintenanceが処理済みであることを `accepting()`、`unacknowledged(1)`、`predecessors()` で確認し、該当する旧closed transfer ownerについて `caller(exactTarget)!=="pending"` を確認する。新claimと競合しない既 `coordinate("maintenance", work)` 内でUoWを実行する。`closure()`がack後にunprovenへ戻り得るため、それだけを未閉鎖とも閉鎖証明とも扱わない。既closed永続値＋ACK済みruntime状態の組合せを使う。

local endedだがproof未ACK、前任証明残、caller pendingなら新受付せず「終了確認後にやり直す」と返す。GETがreconcile/ACK/DB更新を実行してはならない。通常runnerのmaintenanceが進める。既maintenanceをその内側から再呼出してcoordinateをネストしない。POSTの結果不明後はGETだけで照会し、利用者の新操作なしにretargetを再発行しない。

閉鎖確認に必要なowner locatorはrepository内部のexact条件からkeysetで最大100件ずつ取得し、各ページは同一Tx snapshotで検査する。歴史全件をDTO/配列1個へ展開せず、切捨てによる「不在」判定をしない。多い履歴で所定の操作期限内に完全集合を検査できなければ安全な未受付で返し、成功へ丸めない。この検査は外部I/O・source open・新owner取得を伴わない。

## 4. 0041の最小DDL

正式名候補 `0041_drive_backup_target_heads.sql`。実装前に次番号を再確認する。0038/0039/0040は編集しない。新表はhead1表のみ。

```sql
CREATE UNIQUE INDEX drive_backup_target_head_identity
ON drive_backup_targets(id, original_id, account_id, subject);

CREATE TABLE drive_backup_target_heads (
  original_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  target_id TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL CHECK(version BETWEEN 1 AND 9007199254740991),
  PRIMARY KEY(original_id, account_id, subject),
  FOREIGN KEY(target_id, original_id, account_id, subject)
    REFERENCES drive_backup_targets(id, original_id, account_id, subject)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);
```

SQLは形の提案であり未実行。subject/UUID等の既境界と新head mapperを対応させる。accountへの新cascadeを追加しない。対象original/noteへの存続制約は参照先targetの既FKを維持する。headを先に保存するためdeferred FKが必要で、PRAGMA foreign_keysをOFFにして代用しない。ORMがdeferred属性を表現できない場合も正式SQL/DDL直接対を正本とし、即時FKへ黙って変えない。Drizzle schema/snapshotは追加表/列/index/FKの対応を記録し、このcustom SQL属性の再生成欠落を移行対で検出する。

既 `drive_backup_target_original` 全行uniqueは、backfill検証後にheadのtuple PKへ役割を移す。新targetを追加できるだけにuniqueを落とす段階を公開しない。表再構築や旧列追加・旧暗号文変換は不要とする。

追加guardは次を満たす。既guardを削除して一般更新を緩めず、必要な新条件を別triggerとして加える。

| guard | 条件 |
| --- | --- |
| head初期insert | version1、tupleに旧targetがない通常初回だけ。backfillはこのtrigger作成前に実施 |
| head更新 | tuple不変/version+1、old target/version CAS、new target ID未使用、全旧行の3.1条件、old/new ID異なる。旧IDへの戻し/版reset不可 |
| target insert | headがNEW.id/tupleを指す、version1/unallocated/fileId null、既original一致。通常新行のfolder/epoch/subは現在connectionと一致（autoのneeds-relink失敗受付は既条件内） |
| 新job/transfer insert | 既target/identity/record条件に加えheadがtargetを指す。旧terminal行へのUPDATEは要求しない |
| target割当/transfer claim・進行/record insert | 当該targetがcurrent。既owner/phase/資格/record一致guardを維持。旧targetを再claim/allocateしてhead排他を迂回不可 |
| head delete | noteがpurgingで全世代のjob terminal・owner/pin/refreshなしのpurge経路だけ。通常delete/reinsertのABA不可 |

失敗/取消/閉鎖保存やpurge用redactionはhistorical targetだからと拒否しない。新副作用を禁止するguardと、既所有の安全な閉鎖/過去の表示・回収のguardを分ける。headの移動条件上、移動時に旧activeは存在しないが、防御側は全世代の閉鎖を可能なままにする。

### Backfillとrollback

一つの正式migration Txで、既schema/unique/guard/FK前提を確認→新参照index/head表作成→全targetからhead version1へcopy→双方向の件数/tuple/ID対応とFKをassert→旧tuple uniqueを置換→新guard作成→全旧表/旧guard/旧値と新不変をassert→ledger確定とする。allocated/unknown/confirmedもheadへ移し、未送信だけを選別しない。孤児や重複はmigration失敗であり、最新行選択・削除・勝手な修復をしない。

正常cloneでは旧全列/NULL/JSON・資格封筒・PK/FK/index/trigger/ledgerを比較し、差は本書の追加head/index/guardと旧tuple index置換/ledger1件だけ。rollbackはbackfill途中、旧index置換後かつguard作成中、末尾FK assertionの3位置。各cloneは新baselineから排他的に作り、失敗cloneへ再実行しない。deferred FKのcommit時違反も直接対にし、headだけ残るcommitを拒否する。

## 5. UoW・CAS・receiptの順序

### 初回/既currentへの通常受付

本人認証とinput shape後、同command receiptを固定request digestで照会する。同intentなら現在folder/headが変わっていても元request/jobを返す。現在資格やheadからdigestを再構成して旧receiptを拒否したり、新targetへ付替えたりしない。別intent同command、Drive attempt/controlとの跨表command衝突は拒否する。GET receiptも旧request/jobへ固定し、失権時は安全projectionを行う。

新commandだけ現在認可/source/connection/枠を検査する。headなしなら `insertInitial` が新target IDのhead(version1)→targetを同Tx保存し、その後request/job/transferを保存する。headありなら現在targetをexactに使い、既成功record/重複/同folder retry規約を適用する。auto/bulkのcaptureも同じ初回portを通る。targetだけを先にinsertする旧経路を残さない。

### 新folderでの明示受付

小さいGET previewとPOST confirmの二段。previewは新target/head/receiptを作らず、current note編集権限、原本、本人連携、新folder意味、head/version、3.1/3.2を読み、後述の有限DTOと確認digestを返す。

POSTは `noteId, commandId, expectedEpoch, expectedSettingsVersion, expectedHeadTargetId, expectedHeadVersion, expectedTargetVersion, expectedDigest` をstrict検証。request intent digestはこれらclientが確認した固定値とactor/action/versionから作り、同command既receiptを先に解決する。expectedDigestはpreview時のcanonical source/新folder意味等のhashであり、POST時の現在値から同Tx再計算して照合する。秘密値をそのままhash入力DTOへ渡さない。

新規の場合のみ、既maintenance区間内の短いUoWで認可/原本/source/ownership・epoch/sub/settingsVersion・folder意味・head/target版・全証拠・親/admitted枠を再検査する。現在と期待値が違えば再確認。旧targetの副作用を止めるために新たなcancel/abortを発行しない。

保存順は `head CAS → 新unallocated target → 新manual request → 新job → 新queued transfer → admissionSequence CAS → commit`。新jobはordinal0/attempt1/retryOf null/rootOrdinal null/new admissionIdentityで、新親generation1。30分はこの受付時刻から。新source identityのfolderだけを現在検証済folderへ固定し、旧original/旧jobのsnapshotを更新しない。新folder resourceKeyEnvelopeは現在epochの正しいbinding、旧封筒はそのまま残す。新request/jobが揃う前のcommitをapplicationで行わず、例外/ACK不明時に部分成功を返さない。

同Tx競合の両順序を確認する。旧claim/割当が先なら証拠不足でretarget拒否、retargetが先なら旧claimはhead不一致。別retargetが先なら古いhead/version/digestを拒否し、同commandだけは既receiptへ戻す。F2→F3やrelink/source/ownership変更が先ならconfirm拒否、新受付が先なら既同Tx外部取消が新jobをfenceする。auto-settingだけでもPOSTは確認settingsVersionへCASするが、受付後のbackup currentは既S3どおりfolder意味で判断する。

commit後の通知は既no-throw sync wakeのみ。provider送信は通常runnerのwithCaller/current/原本検証から開始し、POST/preview Tx内のHTTP0。ACK不明時は同command GETの確認だけで、暗黙POST再送・command再生成0。

## 6. Current head照合の全到達箇所

| 接続点 | 必要差/維持事項 |
| --- | --- |
| `backup/request.ts` initial/retry/redo | head lookup/初回port。旧job/旧transfer locatorはcurrent targetと一致する場合だけ通常retry。receiptは旧intentへ固定 |
| `backup/admission.ts` capture/insertSnapshot/currentSnapshot/fill | 初回port、head一致をsnapshot検査と同Txtransfer insertへ。待機job.targetId付替え0 |
| `backup/automatic.ts` | capture経由でheadを使う。既原本の自動retarget/遡及0、seal独立・混雑failure保持 |
| `backup/bulk.ts` preview/request/parent retry | current lookup、digestへcurrent target/head版を含める。旧ordinalのtargetを新headへ読み替えない。newfolder回復は単件の明示導線 |
| `backup/read.ts` | 現行のretry/retarget可否と歴史的receipt/recordsを区分。folder不一致を利用者に説明 |
| `backup/recovery.ts` | 既S2同ID/source/folder照合を維持。新never-sentは別判定で、旧retry判定を緩めない |
| `backup/runner.ts` backupCurrent/current/change/access/claim | current head検査を各stepに届かせる。旧閉鎖settleは可能なまま、成功record/target割当だけはhead一致必須 |
| `libsql/repositories/driveBackupRepository.ts` | head port、SQL全行証拠、claim/割当/insert/current guard、歴史lookup/全世代purge |
| `libsql/repositories/objectOperationRepository.ts` backup beginWriteの現在条件 | 原本pin開始SQLにもhead一致を追加。claimDelete/既held照合は全世代を維持 |
| `backup/cancellation.ts`, impact, move, membership/trash/WS/purge | scope単位の全live job/transferを維持。headだけへfilterしない。新表だけの履歴を取消対象と誤計数しない |
| record `forNote/find`、history/activity、P5c-3用locator | record/歴史的targetのexact参照を維持。headに無いことをrecord不存在と解釈しない |

## 7. 寿命・purge・legacy

head/target/外部同一性は存続原本のdedup正本で、90日job pruneに連動して削除しない。旧request/jobのcreatedAtとterminal値、旧transfer/session、旧target、旧recordは新受付Txで不変。通常pruneのjobId/retryOf解放・通常purgeのredactionは既寿命規約のまま、今回のretarget成功のために先に実行しない。

headが選ばなくなったtargetも、全scope取消・hasWriters・object pin・retarget証拠に含める。新headに不明targetが見えないことを根拠に安全と判断しない。recordありは新ID拒否/既保存成功を優先する。

note purgeの同Txで、全世代の非terminal/owner/pin/refresh0を確認→job redaction→head削除→records/transfers/targets回収→既original/note回収とする。head delete guardはpurging noteに限定する。headなしのままactive noteへ戻す通常操作、旧head version reset、同tupleへhistoryだけを残した初回扱いを拒否する。移行後にhead欠測を見つけたら読み取り時の自己修復/新規head生成をせず整合性失敗とする。

## 8. 公開DTOと確認UI

preview GET inputはnoteIdだけで16KiB URL問題を持ち込まない。DTO64KiB上限、folder名は既4096B、状態/説明は有限codeにする。

```ts
type RetargetPreview =
  | { kind: "available"; headTargetId: string; headVersion: number;
      targetVersion: number; epoch: number; settingsVersion: number;
      destinationName: string; expectedDigest: string }
  | { kind: "unavailable"; reason: "same-destination" | "active" |
      "already-saved" | "resolve-old-result" | "ownership-pending" |
      "reconnect" | "select-folder" | "changed" };
```

actor/auth/browserの既ticketを外側DTOに持つ。raw subject/token/session/resource-key/旧path/旧driver errorを返さない。旧folder名は回復に必須でないため新DTOへ複製しない。現在note権限がない場合は題名やlocatorも返さない。

`DriveBackupPanel`にavailable時だけ「新しい保存先にバックアップ」を表示し、既同ID retry説明と混同しない。確認文は対象原本と新保存先、旧結果保持、新しい受付であることを示す。取消はfailure理由を付けない。Settingsへ戻る既リンクを利用し、trash復元/確認付き再選択/新規作成を案内する。永久削除を断定する文言や無断復元・無断作成を追加しない。

現在actor/note/epochとconfirm値を束縛し、React transitionのpending、重複flight拒否、POST後router.invalidate→onResolved/current ticketの純GET、遅着拒否/1flight+1queuedを維持する。同commandの未確認receiptはGETでのみ解決し、未確認中に別retargetを出さない。旧command receiptが返ることとcurrent headを別に描画し、成功GETだけで新操作成功としない。390px/Tabとreloadを直接確認する。SSR一覧修正はこの変更に含めない。

## 9. Exact変更path案

以下のprefix＋file名を予約案とする。採用後の実装で範囲を越える前にManagerへ差を返す。

| prefix | file |
| --- | --- |
| `packages/core/src/domain/integration/` | `driveBackup.ts`, `driveBackupRepository.ts`, `driveBackup.test.ts` |
| `packages/core/src/application/integration/drive/backup/` | `retarget.ts` 新, `retarget.test.ts` 新, `request.ts`, `read.ts`, `admission.ts`, `bulk.ts`, `runner.ts`, `recovery.ts`, `recovery.test.ts` |
| `packages/core/src/adapters/libsql/` | `driveBackupSchema.ts` |
| 同 `repositories/` | `driveBackupRepository.ts`, `objectOperationRepository.ts` |
| 同 `migrations/` | `0041_drive_backup_target_heads.sql` 新, `meta/0041_snapshot.json` 新, `meta/_journal.json` |
| 同 `__tests__/` | `driveBackupRetarget.integration.test.ts` 新, `driveBackupMigration.integration.test.ts`, `driveBackupFixtures.ts`, `driveBackupApplication.integration.test.ts`, `driveBackupBulk.integration.test.ts`, `driveBackupAutomatic.integration.test.ts` |
| `apps/web/app/presentation/` | `driveBackupInput.ts`, `driveBackupInput.test.ts`, `driveBackupServerFn.ts`, `driveBackupServerFn.test.ts` |
| `apps/web/app/components/hollow/` | `DriveBackupPanel.tsx`, `DriveBackupPanel.test.tsx` |

automatic/cancellation/activity/Settings/DI/Execution/provider/source/folder-control/purge入口は原則変更不要。current head接続漏れや閉鎖証拠API不足が具体的に見つかった場合は、本表やDDLの無言拡張をせず必要差を返す。source/nativeの既閉鎖テストへ新実行対を置く必要があれば公開test pathを別途申告する。

## 10. 比例検証と順序

| 群 | 直接観測する合格条件 |
| --- | --- |
| 型/分類 | never-owned、folder失敗closed、allocated bytes0、session/ACK不明、UNKNOWN、pin/refresh、record、legacy欠測/曖昧を区別。source/sub/folder意味/任意DTO入力拒否 |
| migration | 旧全stateとlegacy nullをheadへ対応、旧全値と0039/0040guard保持、正常1/rollback3、deferred FK commit失敗、旧tuple重複/孤児拒否 |
| 初回/二重受付 | manual/auto/bulk全入口のhead初回、同/別command並行、new target/live job1、同command旧intent照会、異digest拒否 |
| retarget | F1待機取消→F2明示成功、folder検査失敗closed→F2成功、旧全行不変、epoch/key binding、枠満杯rollback、元bulk集約不変 |
| 競合 | head CAS対旧claim/割当、F2→F3、relink、scope/source変更、late confirm/retry、pending→admission、取消の両Tx順序 |
| 所有 | caller pending、proof未ACK、predecessor未解消では拒否。通常close→caller終了→ACK後だけ受付。旧owner終了不明の解放0、new pinはcurrent headだけ |
| 寿命 | 90日job非表示/prune、jobId nullの古いtransferも検査、100件外の危険行拒否、全世代purgeと通常record存続 |
| UI | 単件確認→新receipt→現在GET→F2成功link→reload、旧失敗/取消保持、ACK照会/POST再送0、390px/Tab、actor/遅着/秘密 |

既S1/S2の不変更provider/source/Range/同IDsession根拠と、S3の500/二段枠/auto独立の不変更部分を正式公開報告から借用する。headが到達するmanual/auto/bulk/claim/current/pin/pruneは局所対を直接実行する。過去の全suiteを機械的再演しないが、共通fixture変更が既対へ届く場合は通常順で汚染がないことを確認する。skip/未実行を成功へ算入しない。

順序は型/永続headとmigration→current接続とDB guard→read/confirm/receipt→UI→規定typecheck→lint:fix→format→比例局所→通常build1→postbuild type→指紋固定→同bundle UI1boot→全終了/opaque/audit。独立Verifierを実装者と別に確保する。safe hook/current全経路の完成前にUIを提供しない。

## 11. 新検証資源の具体案（未採用・未作成）

既S3/UI6/root/DB/鍵/結果/cacheはread/hash/import/実行0。旧public helperも自動再利用しない。必要ならexact source/hashの別採用後に新rootへ適応する。本案は主実装検証用で、独立Verifierの資源を二重に許可したものではない。

| 資源 | 新上限案 |
| --- | --- |
| root | 新排他0700 `p5c2-retarget-YYYYMMDD-XXXXXX` 1個、総320MiB |
| DB | logical10、合算152MiB: 0040 synthetic baseline16、0041成功clone16、rollback3×16、application24、native16、UI16、opaque8、audit8MiB。WAL/SHMを含む |
| fixture | app actor3/WS1/note-original最大24、同targetの過去transfer最大130で先頭100外を確認。UI actor1/note2、原本各1KiB。全original/fixture bytes合算8MiB。LLM0、音声0 |
| material | 新Drive AES64B＋invitation/share64B、合計128B。RSA0、秘密/material総256KiB、mail1通はbounded memory。秘密/nonce/session/本文出力0 |
| helper/TMP | helper/log8MiB、NodeTMP8MiB、Chrome専用TMP128MiB、compile/tsx cache無効。root残15.75MiBは予備であり追加試行枠にしない |
| process | testworker1/DBwriter1。native自己listener1、その終了後UI app1＋fixture1＋proxy1。UI boot1/fresh Chrome1/context1/page1。既profile/CDP/別process前任追加0 |
| network | 自己provider合計32要求/8MiB、逐次1（native最大8、UI最大24）。Hollow/browser600要求/32MiB、背景deny100要求/1MiB。外部forward0、unknown/CONNECT/redirect拒否 |
| build | 通常build1、repo dist別256MiB。source/entry/DDL/lock/production/distの前後指紋一致。cache/TMP/logは新rootに限定 |
| 時間 | 局所群は各60秒の有限枠、UI準備60秒・操作180秒・通常close30秒を初期予算とし、boot前にendpoint/gate操作表を確定。timeoutでmutation停止し有限read-only診断後保全 |

容量合計はDB152＋原本8＋helper8＋NodeTMP8＋Chrome128＋material0.25=304.25MiB、root320内。失敗DBを消して同label再実行しない。新clone/boot/要求/鍵の追加は残容量があっても再申告する。DB fixture内部の成功case cleanupと失敗保全を区別し、通常schema/migrationを使いfixtureのためにFK/guardをOFFにしない。

application群はmemory providerでHTTP0。native群は実Execution/caller/owned sourceと自己folder HTTPの正常close/未ACK代表対を使う。新前任processを追加せず、未検証のpredecessor-exit実動作はS2不変更根拠の範囲を明示借用し、new head拒否はapplication対で確認する。要求表例はnativeのfolder拒否1と成功転送通常5を基本とし、2要求は明示異常対の予約、追加retry用ではない。

UIは検証済F2と、F1の旧待機cancelled/never-ownedを新public UoW fixtureで設定し、通常単件パネルから明示retargetする代表1本。これを通常Picker/新folder作成UIの成功としない。closed-before-createはnative/application直接対で別証拠にする。既S3一覧SSRへ依存せず、通常note詳細導線/設定リンクを確認する。新folderの成功は同candidate実adapter＋自己providerで小原本1件を送る。UI24要求は成功5＋受理/確認/拒否の明示操作表へ落とし、上限余りを自動retryに転用しない。

browser標準close→app quiesce/drain→DB close→既知自己PID/pipe/socket終端→active main/WAL/SHMをexclusive opaque→更なるaudit copyとする。active/opaque再open0、auditだけledger/FK/head対応/旧値/new receipt/record/owner/pin/object_writesを確認。正常停止を超えたfallbackは試行不成功として記録し、未知PID/広域scan/手動kill0。外側出力は有限code/count/boolean/hashに限定する。

## 12. 採用判断と引継ぎ

Managerへ求める判断は、1表head/deferred複合FKと追加guard、上記never-sentの厳密分類、current headの到達path、既パネルの確認付き新manual受付、資源320MiB/10DB152MiB/自己provider32/通常build1/UI1bootだけ。利用者の保存先確認方針を聞き直す必要はない。所要見積りは実装/局所4〜8時間＋代表UI/独立検証/停止保全。15分進展なしなら具体根拠・障害・次手を返す。

計画は成立可能性の提案で、deferred FK・移行・runtime・UIは未実行。既未知結果の新folder作成は対象外を維持し、成功条件へ書換えない。実装採用後も旧source/旧結果を新candidateへ遡及しない。SSR調査担当とは製品を書き分けて並行実装せず、Managerが候補/担当境界を再固定する。

本書EOFを確認後、文書を含む全操作を停止してManagerへ返却する。実装へ自動移行しない。

EOF
