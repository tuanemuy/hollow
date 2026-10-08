# P5c-2 保存先変更後の再受付: 静的整合確認

判定: **P5c-2-I / IN-05・IN-06 の要求上の不足**。追加観察ではない。原本があり、本人の新保存先が検証済みでも、旧 target の folder と違うだけで永続未送信の原本まで以後バックアップできない。確認付き再選択/新規作成という回復導線の結果が成立しない。現在の拒否 guard 自体は安全側の実装であり、単純に取り除くべきではない。

推奨は、後続フェーズで **原本/actor/sub ごとの一意な現行 target 参照を1表へ分離し、外部 file 作成前であることを証明した旧 target だけ、明示確認と同 Tx CAS により新 target へ切り替える** 方式である。旧 target/job/transfer/record の値は保持する。既割当・session開始/ACK不明・実 owner 不明を対象へ広げない。現 S3 の限定0040と通常順検証へ混ぜる義務はなく、本報告は実装許可ではない。

2026-10-01T04:45:03+09:00 を基準に公開 working tree を読んだ。HEAD は `c660ced51319175a8c506be1cce5cd7a743d85ad` だが、S3未commit差分を含むためHEAD単独を対象識別には用いない。主担当の45対は実行中との委譲情報として扱い、成功根拠を借用していない。製品/DDL/管理正本の変更、実行、DB、HTTP/browser、private/鍵/旧結果/cache操作は0。この報告だけを新規作成した。

## 要求と観測した不足

[brief](../brief.md:117) の利用者決定は、永久削除を含め保存先利用不可時は確認後に再選択/新規作成へ統一し、trashでは復元も案内するもの。[IN-06](../../spec/scenario/integration.md:105) は原本の手動バックアップ、理由と再試行導線、既保存の再送0、多重実行抑止を要求する。[正本I](../plan.md:46) も両者を対応付けている。「設定だけ別folderへ保存できるが、その障害を起こした原本は永久に処理不能」という制限は利用者の選択に含まれていない。

一方、[brief](../brief.md:90) の同ID先行確認は、未完成または外部成立不明の物を別IDで重複作成しないための仮定である。fileIdを一度も保存しておらず、外部file作成前の永続証拠がある対象まで永久固定する理由にはならない。既割当/不明結果については、この制限を引き続き守る。

| 公開コード根拠 | 現在の帰結 |
| --- | --- |
| [request.ts](../../packages/core/src/application/integration/drive/backup/request.ts:164) の retry/redo は `backupFolderCurrent` 必須、同238行の initial も canStartUnallocated と同folder必須 | 新folderへ設定後は全通常入口から拒否 |
| [read.ts](../../packages/core/src/application/integration/drive/backup/read.ts:74) | folder不一致ではretry locatorなし |
| [admission.ts](../../packages/core/src/application/integration/drive/backup/admission.ts:58) の captureBackup は original/account/sub で既targetを再利用し、同95行で旧target.folderをsnapshotへ採用 | 新folderが設定されても当該原本の送信先は更新されない |
| [driveBackupSchema.ts](../../packages/core/src/adapters/libsql/driveBackupSchema.ts:76) と [0039](../../packages/core/src/adapters/libsql/migrations/0039_drive_backup.sql:139) の全tuple UNIQUE | 同tupleに新targetをそのまま追加できない |
| [0039 target update guard](../../packages/core/src/adapters/libsql/migrations/0039_drive_backup.sql:260) と [repository](../../packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts:531) | 旧targetのfolder/epoch/markerを変更できない |
| [folders.ts](../../packages/core/src/application/integration/drive/folders.ts:116) | 新保存先採用Txで旧backupを取消してから設定を更新するため、未送信子もこの状態に入る |
| [DriveBackupPanel.tsx](../../apps/web/app/components/hollow/DriveBackupPanel.tsx:15) | trash/所在不明では再選択・新規作成を案内するが、変更後の旧原本を処理する入口がない |

静的再現条件は「F1で同原本targetを受付→待機中にF2へ確認付き保存先変更→旧job取消、target unallocated/fileId null/実ownerなし→同原本の元操作をやり直す」で足りる。期待値はF2への明示新受付、現実は同folder条件の拒否。実際のUI/DB再現はこの担当では実行していない。

## 1案: immutable target と現行参照の分離

既 target は、外部file ID・marker・保存先の不変な来歴として維持する。新 `drive_backup_target_heads` は次の最小情報だけを持つ。

| 列/制約 | 意味 |
| --- | --- |
| `original_id, account_id, subject` 複合主キー | 同原本/本人/Drive主体で現行targetは必ず1件 |
| `target_id` 非null・unique | 現行targetへの参照。targetのtupleとの一致を複合FKで強制 |
| `version` 正整数、更新は+1のみ | 確認とCASの正本。ABAを防ぎ旧versionへ戻さない |

target側に `(id, original_id, account_id, subject)` の参照用unique indexを追加し、headの複合FKを `DEFERRABLE INITIALLY DEFERRED` とする。これにより後述のhead先行→target insertを同Txに閉じ、commit時にdangling headを拒否できる。account識別子の寿命は既target/recordと揃え、退会を理由とする新cascadeで記録を消さない。通常のhead初期作成は同tupleの既targetがない場合だけ、削除/再初期化は通常受付から不可とする。

旧 `drive_backup_target_original` の全行unique indexはこの後続migrationで置換するが、同tuple排他を無くすのではなくheadの複合主キーへ移す。新target insert、job insert、transfer insert、target割当、owner claimが必ず同Txのheadを検査する追加guardを一緒に提供する。headに選ばれていない旧targetは新しい副作用を開始できない。現行先の参照だけを最新createdAtや先頭100件から推測しない。

この方式を推す理由は、旧targetのfolderを書き換えずに新しい送信意思を表現でき、履歴寿命と現在の重複抑止を分けられるためである。targetへretired列を追加してpartial uniqueに変える方式では、旧行の状態変更と全受付/claimの新たな排他条件が必要になる。単にfolderをunique keyへ追加する方式ではfolderごとに並行liveが成立してしまう。本案は同tupleの現在先を1行へ集約し、旧target自体の全値を不変にできる。新provider API・外部scope・新設定画面は不要である。

## 受付可能な証拠と拒否境界

新しい明示操作の対象は、現在編集可能・active note・同一original/source identity・同actor/sub・検証済み現在folderを持ち、旧headと全関連行について次を同Txで満たすものだけとする。

- 旧targetは `unallocated` かつ `fileId=null`、同tupleに成功recordなし。旧targetの永続fileIdは一度非nullになれば戻せないため、この不変条件を維持したDBの証拠として用いる。
- 全関連jobはfailed/cancelledのterminal。待機/非terminalがあれば先に既取消経路を完了させる。新操作は勝手にstartedをabortして条件を作らない。
- 全関連transfer（job FKが90日pruneでnullになった行も含む）はterminal failed/cancelled、received0/session null/statusAttempts0/offset null/length null/readPinned0/refreshPending0。一意性不明、identity不整合、旧証拠欠測は拒否する。全集合のEXISTS/NOT EXISTSで確認し、最新100件による陰性判定をしない。
- owner noneの未開始行、または実close・caller終了・DBへの閉鎖ACKが既Execution契約で確認されたclosed行に限る。active/unknownは拒否する。closedというDBラベルだけで実終了を推測しない。既maintenance/closure/predecessorの照合を再利用し、未ACK/保留caller/前任終了不明なら受付せず現在GETで待機を示す。

closedかつfileId未割当の枝は必要である。現 [runner.ts](../../packages/core/src/application/integration/drive/backup/runner.ts:375) はsource準備とfolder検査をfileId割当前に行い、trash/不可視を返す。その結果はowner closedでもtarget unallocatedのままになり得る。同408〜435行ではfileIdをDBへ保存した後にだけ同510行の `startResumable` へ進む。この「file作成開始前の永続割当」順序と旧fileId不変、全履歴の副作用証拠なし、実closeの組合せで未送信を証明する。単に `received=0` や `session=null` だから安全とはしない。割当API応答/DB ACKの境界に疑義があれば、実証されるまでこの枝を提供しない。

fileId非nullは、実bytesが0でも本案の対象外。allocated/unknown/confirmed、session開始ACK不明、実owner不明、旧folderの404や権限喪失は、別ID作成を許す根拠にならない。既同ID照会/retry・旧folder回復案内を維持する。これらの制限と未送信対象の回復を同じ「再選択すれば必ず続けられる」と表示しない。成功recordがある場合は従来どおり送信不要の成功を返し、記録folderを付け替えない。

## 同Txの順序と競合

### 初回

同command receiptがあれば固定digest一致を確認して元receiptを返す。新規なら現在認可/原本/connectionと枠を検査し、同tupleのheadをexactに解決する。未存在時は新target IDを生成し、head version1をinsert→そのheadが指すunallocated targetをinsert→request/job/必要なtransferをinsertする。同じTxのcommitで複合FKを成立させる。targetの通常insert guardはheadのtarget ID/tuple一致を要求する。別commandの並行初回はhead主キーで直列化され、既receipt/live targetへ集約する。

### 新保存先での元操作やり直し

既単件の確認/元操作やり直し導線へ、server判定の「新しい保存先にバックアップ」を追加する。設定の新folder選択そのものと、当該原本を新folderへ送る意思を区別する。確認画面は本人Drive・新保存先・対象原本・旧結果保持を示す。旧folderの復元/再選択は現在のSettings導線を使い、新設定画面を作らない。

GETは現在actorとscopeに束縛したpreviewを返す。確認digestは用途/version、note/original/source hash・bytes・ownership、旧head target/version、現在epoch/settingsVersion/sub、新folder意味に束縛する。resource-key平文/封筒はDTOへ出さずserver内で意味照合する。

POSTは新commandとdigestを受け、既receiptを先に照会する。新規なら既Executionのmaintenance区間で旧caller/closeの証拠を確認し、短いUoW内で全条件を再評価する。旧head target/versionのCAS→新target insert→新manual request/job/transfer保存→既admissionSequence更新を同Txで行う。head CASは新target IDが未使用であることと旧全関連行の未送信条件をDB guardでも検査する。新targetのfolder/key envelopeは現在epochで正しく保護された現在folder snapshotから作り、旧AAD封筒をコピーして現在epochへ偽装しない。

これは同設定のretryではなく元操作の新受付なので、新jobの `retryOf=null`、新親とする。旧bulk親/ordinalの失敗結果を成功へ上書きせず、既JB-02の同設定retryは従来経路に残す。新受付から30分、既10/100枠と実owner1/合算3を維持する。新folder側は新しいtarget/file IDであり、旧targetには外部fileが作成されていない証拠が前提になる。

admission/claim/currentは常にheadがrow.targetIdを指すことを同Txで確認する。旧確認後にF2→F3、再連携、原本/ownership変更、旧targetの割当、別commandによるhead更新があれば古いconfirmを拒否して再確認へ戻す。反対に新受付が先にcommitし、後から保存先が変更されれば、既saveFolderの同Tx取消がその新jobを止める。旧retry/redoの遅延POSTは旧head CASに失敗し、新targetへ無言に読み替えない。

同command同digestは設定/headが後から変わっても元receiptを照会できる。同command別digestは拒否する。POST ACK不明は同commandの現在GETだけ、自動再POST0。DB commit ACK不明をbackup失敗や未受付と決めつけず、既receipt照会で解決する。全失敗時は旧head/旧行と新受付の全体をrollbackし、headだけ進むcommitをFKで拒否する。

## DDL・共有契約・寿命

後続migrationの仮名は `0041_drive_backup_target_heads.sql`（実装開始時に次番号を確認）。0040を変更しない。必要差は新head表1、複合参照index、旧tuple uniqueの置換、headのinsert/update/delete guard、既targets/jobs/transfersへの現行head検査guard、snapshot/journal/schema更新に限る。旧表の全列再構築・旧暗号文再保護・旧terminal更新は不要である。

移行は既uniqueで一意な各targetからhead version1をbackfillする。対象はunallocatedだけでなくallocated/unknown/confirmedもすべてであり、unknownを除外して別初回を可能にしない。全旧targetがexactに1headへ対応しtuple一致、全旧値/NULL/暗号文/PK/FK/recordと旧guardが保持されたことを検査してから、旧tuple indexを置換する。期待と違う重複/欠測/FKは移行全体を失敗させ、勝手な最新選択/削除をしない。正式migrationは同Txでrollback可能にし、中断/guard作成/末尾FK失敗の対を新cloneへ用意する。

`DriveBackupTargetRepository.original` はhead経由の現在targetを返す契約へ変更し、`find(id)` は歴史的targetを返すままとする。初回と切替は専用原子的port操作にし、通常replaceではheadを更新しない。純粋な未送信判定型とserver側の所有終了確認を分ける。Hollow UoWには既target repository内部で接続できるため、新repository種類/DI登録を増やす必要はない。

head/targetはjob履歴90日とは独立し、history pruneでは消さない。旧jobの安全snapshot/旧失敗・取消・同command結果を保持し、通常90日後の非表示とpruneだけを適用する。target/transferをhead切替のcleanupで削除しない。旧head対象を含む同tuple全体で不明/成功記録を照合し、過去targetが見えなくなることを安全の根拠にしない。

note purgeでは現在と過去すべてのtarget/job/transferを既owner/pin条件で検査し、job redaction→head削除→record/transfer/target削除→原本/note削除を同Txへ閉じる。head削除はこのpurge経路だけ、通常操作のdelete/reinsertによるversion resetは拒否する。deferred FKを含め最終整合を確認する。recordはnote存続中不変、90日やhead切替で削除しない。旧targetの暗号bindingは旧folderEpochのままとする。

## 変更予定pathと比例検証

これは予約案であり、本担当は編集しない。追加pathが必要なら実装前にManagerへ返す。

| 区分 | path |
| --- | --- |
| 型/port | `packages/core/src/domain/integration/driveBackup.ts`、`driveBackupRepository.ts` |
| 永続化 | `packages/core/src/adapters/libsql/driveBackupSchema.ts`、`repositories/driveBackupRepository.ts`、`migrations/0041_drive_backup_target_heads.sql`、`migrations/meta/0041_snapshot.json`、`migrations/meta/_journal.json` |
| application | `packages/core/src/application/integration/drive/backup/retarget.ts` 新規、同directory `request.ts`、`read.ts`、`admission.ts`、`runner.ts`、`recovery.ts`、`bulk.ts`（現在target lookupと拒否理由の追従） |
| transport/UI | `apps/web/app/presentation/driveBackupInput.ts`、`driveBackupServerFn.ts`、`apps/web/app/components/hollow/DriveBackupPanel.tsx`。Settingsの既保存先導線を再利用し、新設定画面なし |
| 比例対 | 上記型/transport/componentの既 `.test.ts(x)`、`packages/core/src/adapters/libsql/__tests__/driveBackupRetarget.integration.test.ts` 新規、既 `driveBackupMigration.integration.test.ts` / `driveBackupFixtures.ts`。必要なrunner/closure既対のみ追従 |

合格条件は次の既要求に直接対応する対である。

1. F1待機→設定F2採用/旧取消→確認付き元操作やり直し→新target/new receipt/F2成功。原本・本文・旧target/terminal値不変、外部delete/move0。本人/WS editor可、viewer/他actor/別sub不可。
2. folder検査で失敗し、fileId未割当かつ実closed/ACK済みの場合も同じ導線が成立。caller終了前/未ACK/前任不明なら拒否し、成立を推測しない。noneとclosed枝を区別して直接確認する。
3. allocatedでbytes0、session/ACK不明、active/unknown、recordあり、legacy欠測/複数、古いjob FK nullのheld行では新target切替0。folder404や権限喪失を未送信の代わりに使わない。既同ID retryの安全条件保持。
4. 同command再送は同receipt、異digest拒否、並行別commandは新現行target/生存job1。head CAS/旧claim/設定変更/取消/relink/source変更の両Tx順序、遅い旧confirm/旧retry拒否。初回でもhead排他が働く。
5. DB直接でhead欠落・tuple不一致・旧targetへの新job/transfer・旧target割当/claim・版飛び/reset・dangling head commitを拒否。途中失敗でhead/新target/request/job全rollback。0039/0040 legacy値/record/FK/guard保持。
6. 90日prune後もheadによるdedupと旧transferの安全検査が残る。purgeで全世代のowner/pin保護、閉鎖後だけ回収。headが旧履歴をpublicへ復活させない。
7. 現単件パネルの確認→POST→現在GET→reloadで新受付と旧結果保持を確認し、ACK不明の純GET照会、遅着/actor切替/390px/Tab、秘密非露出を確かめる。既Settingsのfolder採用fixtureは実Picker/Google成功の代用にしない。

新provider操作はなく、S1/S2の未変更range/source/暗号binding/同IDsessionの公開正式根拠を借用できる。current/head/admission/claim/prune/移行/確認UIに達する差は新しく検証する。旧privateや旧結果を再読・再実行して根拠を水増ししない。新DB/UI/自己HTTPのexact資源案は実装委譲時に別途固定し、現在S3の枠を転用しない。実Google接続・権限変更・削除・移動の許可を追加しない。

## 根拠の識別と未検証

| 公開 working-tree source | SHA256 |
| --- | --- |
| backup/request.ts | `5546910ebda11d01b77c69ac469c80fbbdf654ab32a83b497f56e82468f7137c` |
| backup/read.ts | `9cb5b1671d4d51522d00cd13581324b9d3ff9e174fb6988f5cd242a3c05a2176` |
| backup/admission.ts | `6c87d3b2fdb8dea1d40ef79a23d5de9c4f894318a607bc8413aeac76979b3588` |
| backup/recovery.ts | `fe7cb997974cb5c6b13986c887d965f9b07966be51259e4a17a6ef9b3fbcc04d` |
| libsql/repositories/driveBackupRepository.ts | `185dd0e7f6dd10343b98e5355826bd22869f6db2f959ac75d2d2d68fcfa7e454` |
| migrations/0039_drive_backup.sql | `ce4c92a62baf7d57205f7b41830a9d614786301db10dbd6ed5613d574ccdfbb4` |
| migrations/0040_drive_backup_queue.sql | `b47ea40abca3cb3937d3b70c76e114e0c4142e8d006b26ce0ea9d91f0bdb73c4` |

不足の判定は静的コード根拠に基づく。新DDL/guard/portの成立、移行、競合、UI/実closeはすべて未実行。S3本体の受入可否をこの報告で決めず、Iの後続必須として分離する。既割当/不明状態に新folderへの別ID作成を追加する要求や、未知結果を安全と判定する例外は提案していない。

報告EOFの再読後、文書を含む全操作を停止しRootへ返却する。

EOF
