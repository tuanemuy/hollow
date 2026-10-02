# P5c-3 最初の縦切り案：S1 独立静的判定

2026-10-01。判定は「S1の限定実装へ進める共有方向。確定したbackfill衝突はManager採用のexact3 trigger一時解除で補正し、下記SQL/未接続境界をS1完了ゲートに固定」。12–20時間の全縦切り、native/worker/UI、実Googleの一括許可ではない。機能の受入は未完、型/移行の動的成立は未検証。

対象候補 `fd4a2476a60a3ad4db3da2ac92235b0334e7e895`、code/bundle `4b3995711c94957454cfbaf6863b6e9695abfb4a`。対象案 [first-slice-plan](../phases/P5c-3-first-slice-plan.md) は135行/23,742 B/SHA256 `a9444d0faae7528bed01a74feeefbdcbe16f1476ecd2cb86ee767c059bfd3766` を照合しEOF読了。[contract](../phases/P5c-3-contract.md)、[contract-check](../phases/P5c-3-contract-check.md)、[M1–M5](P5c-3-plan.md)、brief/design/planの採用条件、IN-07/IM-06、現公開sourceへ照合した。goal-implement/manager-loopを全文読了、製品・管理正本は編集しない。DB/test/build/import/helper/runtime/browser/HTTP/旧private/外部仕様照会0。

## 結論と採否

| 論点 | 判定 | S1で必要な最小差 |
| --- | --- | --- |
| 追加3表・既2表3列、record/head/Original非再構築 | 採用可 | 0042・schema/mapper/UoWの正式経路で成立確認。rebuild/FK OFFへ無言変更しない |
| 旧全列不変の明示local backfill | 案のままでは不成立、限定補正採用済み | 同一停止下migration Txだけexact3 triggerを一時DROPし同一定義で復元。下記根拠とrollback対 |
| binding→consumer composite deferred＋consumer→binding即時FK | 採用可能、実SQLでの成立は未検証 | 受付の一時片側とcommit完全性、安全redaction例外、physical DELETE迂回拒否を小DBで確認 |
| 旧local writer/新NULL拒否 | 採用可 | 新全writerは明示local、mapper NULL補完0、既recipe/履歴版/返金を不変更。旧binaryでの新INSERT互換を要求しない |
| source-memory 0/50 MiBと未接続S1 | 永続型/SQL準備として採用可 | 正規S1 writerは0。Drive/machine実受付・既readerへの付替え・予約runtimeは接続しない。50 MiB管理上限を提供済みと称さない |
| M1全記録者keyset/exact/現在編集認可 | 採用可 | read-only application/UoWと非秘密DTO。既本人backup portを拡張しない |
| M3/M4/M5のnative所有・実取消・prune/purge | 共有契約を維持、S1全体合格ではない | schemaで必要な安全条件だけ先行。実lane/abort/ACK/全入口統合とUIはS2以降に残す |

## 1. 確定衝突：backfillと旧trigger

既 [0037](../../packages/core/src/adapters/libsql/migrations/0037_llm_pdf_pages.sql:144) の `llm_conversion_identity` は、全UPDATEで `NEW.version = OLD.version + 1` を要求する。`llm_pdf_preview_identity`（233行以降）も同じである。新 `source_origin` だけをUPDATEして旧versionを保つbackfillは拒否される。versionを進める解決は「旧全列/receipt版不変更」に反する。

さらに `llm_pdf_preview_ready`（258行以降）は、UPDATE後stateがreadyなら本文版/所有世代/Original/OR epochとexpiryを照合する。既ready履歴が古い、noteが変化した、又は期限到来という合法な旧保存状態でも、新列だけのUPDATEが拒否される。先の2 identityだけを解除すれば全backfill可能という案にはしない。

Managerは次の唯一の例外を採用した。

1. 全writer停止下の正式0042 migrationの同一transaction内だけ、`llm_conversion_identity`、`llm_pdf_preview_identity`、`llm_pdf_preview_ready` のexact3を一時DROPする。
2. 新列のみをlocal-original/binding NULL/memory0へ明示backfillする。旧全列・version・updatedAtを一切進めない。
3. exact3を元と同一定義で再作成し、新origin/整合/削除/容量guardと末尾FK assertionを成立させてcommitする。0037を変更せず、恒久guard緩和0。

成功対は既全行の旧全値・index/FK/trigger定義・ledgerを比較する。失敗rollbackはDROP後、backfill後、再作成/FK段階の3箇所を正式migratorで通し、schema/data/ledger/exact3定義の原子的復元を確認する。追加の必要triggerが出たら名前・発火条件をManagerへ返し、一般DROP許可としない。

[migrate.node.ts](../../apps/web/scripts/migrate.node.ts:57) の実行後finallyにあるFK検証だけでは、migration commit前の原子rollback証拠にならない。案どおり0042内部の末尾assertionで失敗させ、既migrator transaction/ledgerにrollbackさせる。[0041](../../packages/core/src/adapters/libsql/migrations/0041_drive_backup_target_heads.sql:1) はmigration内assertionの既例だが、0042の成功を借用したことにはならない。適用後downmigrationは不要。旧binaryの起動や新行消去をrollbackの代わりにしない。

## 2. 受付・redactionのSQLを閉じる最小ゲート

このモデルに不可避な循環は確認していない。bindingの選択されたconsumer IDとbinding IDの組を、consumer `(PK, source_binding_id)` の通常UNIQUEへdeferred/NO ACTIONで参照する。未選択の2枝はNULLなのでFKを免除されるが、「ちょうど1 consumer」のCHECKと各IDのUNIQUEを別に置く。consumerの通常binding FKと即時INSERT guardが、origin=drive-record・exact bindingのconsumer/record/note/original/実行者identityを検査する。NULL比較はSQLのUNKNOWNを通さず、origin NULLと不整合を明示拒否する。

S1で確認する最小対は、binding→consumer→commit成功、bindingだけ/別consumer/local consumerへのbinding/Drive binding欠測のcommit拒否。parent UNIQUE indexと新表/ADD REFERENCESの作成順・collationを含め、正式migrationで成立しなければその一点で停止して返す。SQLite/Drizzleの挙動を静的読取だけで成功扱いしない。

安全redactionはterminal・consumer実所有終了・memory0・全attemptの終端条件を確認し、consumerをredacted/binding NULLにしてからattempt→bindingを削除する。旧identity triggerはここでもversion+1を要求するので、redaction/memory更新は正規version CASにする。履歴削除のために旧triggerを再度解除しない。

追加すべき具体的な削除条件は「consumerのbinding非NULL又はmemory非0の直接DELETEを拒否」である。deferred FKだけでは、consumerを先に物理DELETEし、同Txでbinding/attemptも消す経路はcommit時に参照が残らず、安全redaction検査を迂回し得る。案の『物理削除で迂回しない』を新BEFORE DELETE guardと比例負例で実装する。既 [LLM prune](../../packages/core/src/adapters/libsql/repositories/llmRepository.ts:695) と [preview prune](../../packages/core/src/adapters/libsql/repositories/pdfPreviewRepository.ts:424) は直接DELETEなので、S1は既local/memory0の挙動を保持し、新Drive行は安全解除なしに対象へ入れない。全機能prune/purge統合は後続だが、新SQLで危険な削除を許さない。

未claimでownerなしのqueued consumer/attemptと、実ownerを持ったunknown/未ACKを混ぜない。前者の取消はfence済み・native所有を一度も作っていない状態として合法に終了/解除できる型を定める。後者はclose/caller/ACKの必須条件を落とさない。『全attemptに必ず実owner proof』と機械的に解釈して未送信行を永久pinにする必要はない。これは既案のnone/queued取消を成立させる型の具体化で、新機能ではない。

## 3. S1の未接続状態と既local互換

[LLM encode/insert](../../packages/core/src/adapters/libsql/repositories/llmRepository.ts:256) と [preview encode/insert](../../packages/core/src/adapters/libsql/repositories/pdfPreviewRepository.ts:147) は新3列を現在書かない。migration後の新NULL拒否と同じ候補で両writerを追従させ、旧local request/import/PDF confirmが明示 `local-original / NULL / 0` を保存するようにする。型の必須フィールドを追加する場合は構築元 `llm/request.ts` と `llm/pdfPreview.ts`、既型付きfixtureへ比例追従し、mapperの欠測→local補完で逃げない。recipe/selection/preparationVersion、quota/dispatch、本文版・undoを再設計しない。

`source_origin` のnullable/no-defaultはALTER制約上の保存表現で、正常domain上のoptionalではない。新INSERT/UPDATEではNULL/未知値を拒否し、localはbinding NULL、Driveはbinding必須、redactedは実行用SourceAccessに含めずterminal履歴だけとする。memoryはINTEGERの0又は52,428,800、初回INSERTは0、予約0→50 MiBはexact owner/runtime/token・現在性・3consumer合算、解放は実終了に基づく正規CASという共有契約を保持する。

ただしS1のproduction経路は全てlocal/memory0であり、新予約service、native downloader、parser/LLM workerへのsource接続は行わない。現 [LLM worker](../../packages/core/src/application/llm/worker.ts:192) と [PDF preview](../../packages/core/src/application/llm/pdfPreview.ts:397) はOriginal.storageKeyを直接読む。したがってS1でDrive consumerを受付・claimさせ、既readerへ流してはならない。新domain/mapperはDrive保存状態を表現できても、稼働中の既local経路へ入る境界はlocalにnarrowする。新source受付API/UI/runnerを公開しないことと、非localを既local claim/current/readとして扱わない拒否を比例確認する。これはworker機能をS1へ前倒しする要求ではない。

S1の小DBでは50 MiB予約値/合算/owner不一致を有限整数として検証してよいが、実50 MiB buffer生成やworkerを起動しない。source-memory列0はS1既localの現行動作に新576 MiB予約を実装済みという意味ではない。S2接続後の全local read・ready previewでの解放・同consumer逐次read/自己待ちなし・unknown保持を共有契約として残す。memory releaseのservice所有証明をconsumerのterminalと同一視せず、既LLMのdispatch中ownerを早期closedにしない。実取得stageの証明/解放接続はS2の検証対象。

## 4. M1現在認可と非秘密候補

既 [record.forNote](../../packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts:1063) はnote＋account/max100であり、そのまま再生成用全記録者候補には使わない。別portのkeyset `(createdAt, recordId)` 昇順25件、note-bound cursor、exact record読取をS1で追加する。各page/exactを同じ現在認可UoWから呼び、verified本人・active note/WS・現在personal owner/WS owner-editorを確認する。[requireNote](../../packages/core/src/application/workspace/access.ts:38) は権限/lifecycleの基礎だが、WS activeは別に照合する（[currentLlmSource](../../packages/core/src/application/llm/current.ts:27)の既例）。

記録者の存続・現在linked同subはDB上のavailability、記録者の現在WS membership/backup folder/settingsVersion/current head一致は候補の恒久失効条件にしない。record IDはexact note/original/targetと照合し、異noteのlocatorを返さない。現recordはformat列を持たないので、formatは照合済みOriginalから導出し、recordのbytes/hashと照合する。既recordにformat/version更新列を足す必要はない。

DTOはrecord locator、形式/量、記録日時、mine、有限availability/reason、note-bound cursorだけ。account/sub/email/provider file/folder/resource-key/他人jobIDを投影しない。25件でJSON16 KiBを超える場合も、黙って一部を落としてnextを失わない。候補26件と同時刻tie、別pageで失権/異note cursor/exact、記録者脱退後の有効editor、viewer拒否、他人record非秘密shapeを小DB/純で確認する。GETからrefresh/download/ownerを開始しない。実Google可読性は候補可で保証しない。

## 5. S1 exact範囲

下表のpathはrepo相対。braceは列挙したbasenameだけでwildcard編集許可ではない。実装開始はManager委譲による。

| 責務 | S1対象 |
| --- | --- |
| 永続/domain型 | 新 `packages/core/src/domain/regeneration/{entity,source}.ts`、既 `domain/llm/{entity,repositories,pdfPreview}.ts` のsource保存追従。domainにI/O/native型を入れない |
| application/ports/読取 | 新 `packages/core/src/application/regeneration/{ports,read,current}.ts`：閉じたbinding/attempt/machine repositoryとread-only候補/identity/current。既 `application/execution/hollowUnitOfWork.ts`、必要な `application/di/hollowTypes.ts` 型。実source受付/request/worker/memoryサービスは未接続 |
| 既local構築/境界 | `packages/core/src/application/llm/{request,current,pdfPreview}.ts`：明示local保存と未接続Drive拒否の最小型追従。既workerの実取得置換、OR/recipe/quota再設計なし |
| 保存 | 新 `packages/core/src/adapters/libsql/{regenerationSchema.ts,repositories/regenerationRepository.ts,migrations/0042_regeneration_source.sql,migrations/meta/0042_snapshot.json}`。既 `llmSchema.ts`, `schema.ts`, `hollowUnitOfWork.ts`, `migrations/meta/_journal.json`, `repositories/{llmRepository,pdfPreviewRepository,driveBackupRepository}.ts` |
| 型/移行/小DB対 | 新 `packages/core/src/domain/regeneration/{entity,source}.test.ts`、`packages/core/src/adapters/libsql/__tests__/regeneration{Migration,Application,Closure}.integration.test.ts` と `regenerationFixtures.ts` のうちS1保存/認可対。既LLM/PDF testは新必須型・local互換到達分のみ。fake UoW追加pathはexact通知してから変更 |

S1対象外はNodeのDrive execution/sourceProvider/所有復旧・runtime/memory lease・parser/worker・boot DI wiring、Drive/ORの取消影響UI、body-operation全既入口の機能接続、HTTP/browser/Google、docsの提供済み表現。domain型に将来のattempt/laneやmachine receiptを持たせることと、現runtimeのtarget union/枠へ有効化することを分ける。実native/worker/UIを伴うテストは上表の名前に入っていても実行しない。

S2以降は全体案§3–6/M3–M5を維持する。data1/control2/合算3・account枠、withCaller外caller-end/ACK→bytes返却、別final-check、同sub refresh非取消、記録者成功relink/解除と実行者失権の二軸fence、全世代purge/90日・unknown分離、機械共通body lock/旧本文/undoを後で勝手に簡略化しない。これらのS1未実装をP5c-3 doneとはしない。

## 6. S1検証の最小分割案（実行未許可）

全体案512 MiB/10 DB/native/UI資源はS1へ自動採用しない。S1の例として新排他root192 MiB、6 logical DB計112 MiB（0041基準16、成功clone16、rollback3×16、小application32）、helper/log8/NodeTMP8 MiB、原本/鍵/Chrome/HTTP/native0、worker/writer逐次1に縮小できる。app fresh0042は正式migratorで1回、cloneは停止した新基準からだけ。失敗DB再利用・上書き0。型/lint/format/純/小DBまでとしbuild/UIは後続。これは資源提案でありRoot採用前の実行許可ではない。

比例ゲートは、旧値/trigger/ledger保持と上記3失敗rollback、相互FK受付/片側拒否/安全redactionとDELETE迂回拒否、新NULL/未知origin/Drive欠測拒否、既localの新受付・hydrate・CAS/ready preview互換、source-memory数値guardとnative未接続、M1の26件keyset/現在認可/秘密なし。M3実close/ACKやM4取消全入口、M5実worker停止purgeはS1の小DBで成功済みと称さない。数値又はfixture数がこの分割に収まらなければ実行前に具体数を返す。

致命的な設計破綻は、採用済みexact3 trigger例外を反映したモデルには確認していない。残るALTER/FK/trigger順序は正式移行ゲートで証明可能な範囲であり、下げた受入条件や汎用新機能を加えずS1を始められる。独立static以外の成功根拠は今回追加していない。外部仕様・実Google・LLM費用/品質は未確認のまま。終了時にcandidate/tracked固定を確認し、本報告を含む全操作を停止してManagerへ返却する。

EOF
