# P2d-2: 単一完全削除・期限回収の接続案

2026-09-10T11:32:46+09:00 の実時計を確認したread-only調査。対象はED-10と関連JB、PD-T4/T5/T6/T9。P2d-1の独立合否とは別の、次実装への提案である。

新しい利用者判断を必要とする原文矛盾は見つからない。既採用の不可逆fence・実削除後の容量解放を、現在の三系統のcleanupへ共通接続する必要がある。最も重要な変更は、jobの失効とstorageへの旧書込終了を分離すること。単なる期限待ちをその証明にしない。

## 入力と維持する条件

[採用design](../design.md#p2d-ゴミ箱と完全削除)、[前段契約](P2d-contract.md)、[独立準備](../reviews/P2d-prep.md)、[ED-10](../../spec/scenario/editing.md)、[JB-01〜03](../../spec/scenario/jobs.md)を参照した。前段契約の古い「採用待ち」表現より、designの採用記録を優先する。

- 明示purgeと`now >= purgeAfter`の期限purgeは同じ回収処理を使う。通常の未参照7日GCを追加しない。
- soft-trashは従来どおり本文・20版・pin・原本を保持する。P2d-2でもtrash/restoreが本文版を増やすことはない。
- 単一削除の確認・処理中・失敗・再訪を接続する。emptyの50/51/501件、親子取消・再試行集約はP2d-3へ残す。
- purgeによる現在認可拒否と、後続の物理回収完了を別状態として表示する。受付を「完全削除済み」と表示しない。

参照した製品はP2d-1候補commit `4f996f44bfb11aded2611eae1305a84a77e7defe`として受領したもの。今回git/hash/DBで再照合していない。

## 現コードから必要になる差分

| 現在の接続点 | 確認した現状 | P2d-2の最小変更 |
| --- | --- | --- |
| `domain/note/lifecycle.ts`、`application/note/trash.ts` | active/trashed、操作世代・30日境界、versionだけ進行。対象jobを同UoWで取消 | purgingとpurgeIdを追加。本人・trash世代、または期限policyを確認して一度だけ不可逆化 |
| `application/execution/hollowUnitOfWork.ts` | accounts/assets/notes/revisions/imports/jobs/references | 型付きpurge repositoryと回収対象のclaim/確定を追加。既存共有libSQL resource境界を利用 |
| `application/asset/collectGarbage.ts`、asset repository | deletingへのfence、storage.remove後finishDelete。全deleting取得で専用leaseはない | purge対象と通常GCが同objectの削除所有を共有。通常7日eligibilityは変更しない |
| import repository / `importRunner.ts` | 失敗・取消予約のstorageCleanedまで容量保持。期限＋5分後に回収 | purge対象の予約と競合するcleanupを同claimへ。予約期限だけで旧writer終了を断定しない |
| reference repository / `referenceRunner.ts` | abandoned objectは10分経過＋有効running leaseなし。companionはsealed/関連note0/受理予約0、最大100件候補 | purge・orphan・失敗cleanupの共通claim、bundle利用のfence。既存100件は次workerの固定要件にしない |
| `FileObjectStorage` | stagingへ書き、最後にlinkで公開。removeはtargetと同keyのpartを削除。pipeline期限5分 | publishと削除の競合を閉じるadapter境界。partの不存在だけを処理終了と扱わない |
| conversion/reference job schema | note/originalへの必須FK。job表示は原本名などを実体から読む | 対象消去後の最小本人結果snapshotへ分離。本文・原本行を90日保持する回避策は使わない |

## 型付き状態とportの責務

型名・method名は提案であり、まだ製品APIではない。

`NoteLifecycle`へ`{ kind: "purging"; purgeId }`を追加する。復元可能なtrashedの日時tupleと混在させず、DB CHECKとhydrateで正当な組合せだけを認める。`requirePersonalNote`のactive必須はそのまま使い、trash一覧にはpurgingの最小進捗を別DTOで渡す。通常本文/原本/媒体の閲覧権限は付けない。

`NotePurge`はnoteId、accountId、元trashOperationId、起因（本人要求/期限）、開始日時、状態、試行、lease、次回試行、完了日時を持つ。本文を複製しない。noteごとに一つの不可逆intentを正とし、二重要求は現在本人認可を確認して同intentを返す。再試行はこのintentの新しい実行attemptであり、削除済みnoteに新しい破壊権限を作らない。P2d-3のjob retry IDとは分離する。

`PurgeObject`はserverがDB関係から構築した判別unionにする。

- original: originalId / storageKey / original行の容量所有。
- asset: assetId / storageKey / asset行の容量所有。currentだけでなく履歴のみ・既に未参照の同note由来も含む。
- media-upload: uploadId / bound draftId / sourceまたはsafe key / upload予約の容量所有。
- reference-object: objectId / jobId / reservedまたはwrittenの容量所有。
- companion: companionId / bundleId / storageKey / companion行の容量所有。

一つのstorageKeyに一つの回収claimを置く。accepted media-uploadとasset、committed reference-objectとassetは同じ物理objectを表すことがあるため、二重削除・二重容量解放をしない。クライアントからstorageKeyや種別を受け付けず、HTML内URL・同名・同hashを所有根拠にしない。

最小repository責務は`beginPurge`、metadataだけの`dueNotes/claimPurge`、`claimObject`、同token条件の`completeObject/deferObject`、`completePurge`。purge開始のusecaseは既存UoW内、removeは外、確定は再びUoW内に置く。adapter-native errorと利用者向け理由の境界は既存規約を守る。

## 不可逆境界と容量

1. UoWで現在本人・trashed・operation世代を検証する。期限起因はsessionの代わりに現在trashedとserver clockを確認する。restoreとの競合は同じOCCで片方だけ成立する。
2. purging/version更新、対象jobのhard失効、新write admissionの閉鎖、回収対象の永続列挙を同時に確定する。currentの0と全revisionの正数pinを解除する前に対象assetを捕捉する。本文commit/新revisionは呼ばない。
3. 対象objectに残る他noteの正当なpinを再確認する。対象noteにbindしたdraftはpurge後の保持理由にしない。無関係unbound draftは対象外。
4. 旧writeの収束後、claim所有下でUoW外のremoveを実行する。失敗はnextAttemptAt/理由を記録し、復元可能状態へ戻さない。
5. 同intent・同lease・同object generationを再確認して、実削除済みの行/予約だけを解放する。まだ回収していないobjectの容量は保持する。
6. 未終了writerと未回収objectがなく、共有関係処理とjob snapshotが整合した後に、本文・全revision/head・台帳・原本notice・bound draft等をFK順序に従って削除し、intentを完了する。

容量は既存`imports.reservedAndUsedBytes + assets.reservedAndUsedBytes + references.usedBytes`の所有行を残す第一案とする。deleting assetも現行sumに入る。FKの都合で行を先に消す必要が生じた場合だけ、同UoWで回収台帳へ容量所有を移す。0byte化や二重のreservationは使わない。source/safeの両keyは一つのupload予約に属し、両方の回収確認前に予約を解放しない。

同note由来assetに別note pinがある状態は、現在の個人モデルでは通常の正当な生成経路がない。それでも機械的に削除せず整合性問題として保持する。将来の共有assetではprovenanceと生存所有参照を別にする必要があるが、P2d-2で架空の共有機能を実装しない。

## 旧writeの収束と共通cleanup

現在の結果採用guardは維持するが、それだけでは物理回収は閉じない。`reference/processJob.ts`には書込後の`saveObject` upsertと、SVG検査後の同key再書込がある。mediaもsource保存後にsafe保存を行う。最初のput終了やjobのcancelledだけで全write終了とみなせない。

第一案は、既存upload/reference attemptに型付きwrite ownershipを付け、全put・再put・publish・finallyまで一つの有限attemptとして扱うこと。purgeは新attemptをDBで拒否し、既存attemptの終了と回収を区別して記録する。削除leaseの失効はwriterの終了証明ではない。旧`saveObject`の無条件upsertでcleaned/fencedをwrittenへ戻せないよう、attempt/tokenを条件にした遷移へ変更する。

Node adapterではstorage root/keyに対応した資源境界を、SSR/serverFn/workerのDIインスタンスをまたいで共有する必要がある。publishとremoveが追い越さず、purge後に遅い第二putが始まらないことを確認する。DB UoWを保持したままstream完了を待つ方式は使わない。

具体的な実装確認点は次のとおり。

- 生きたattemptの終了通知前にremoveが不存在でも、intent/予約を完了させない。終了後に再削除する。
- 5分pipeline timeoutはlink/publish後処理全体の終了証明ではない。signalの適用範囲と最後のpublish guardまで確認する。
- crash後は永続attemptとstagingを回収する。boot時に旧実行者が生存しないと保証できない場合、lease期限だけで完了扱いにしない。現採用Node単一processを超える同storage複数processの保証は先取りしない。
- importer・media GC・reference finally/runner・purgeのすべてが同objectの削除claimを使う。purgeだけをlease化し、旧cleanupが無条件でstorageCleanedにする抜け道を残さない。
- 取消による遅い結果拒否と、旧read中の原本unlinkは別問題。既に開いたstreamが終了する場合でも、新規取得と結果commitを許可しない。転送済みbytesの回収を保証しない。

ここは本体実装時のPD-T6の必須対であり、別の方式gateを追加する提案ではない。現コードを読んだだけでは収束成功を主張できない。

## bundleと原本の保持

現在のoriginalはnoteIdとstorageKeyが一意。対象originalだけを消し、同batch兄弟の原本や予約を名前で列挙しない。companionは別の共有物理資源である。

最後のnoteのreference_settings関係を外す前後を同UoWで評価する。active/trashed、off/failedの別noteが一つでも残ればcompanionを保持する。最後の関係がなくてもsealedと未完了本文受理予約0を必要とし、既に開始したcompanion利用attemptの収束を待つ。

現`orphanCompanions()`は読取候補選択と削除時の条件再確認で、永続claimはない。回収開始時にbundle/objectをfenceし、purge workerと既存referenceRunnerが同じclaimを共有する。deleting bundleへの遅い受理・新関連付けを拒否する。最後のnoteの物理回収とbundle待機を別に進めても、利用者へ残companionを回収済みと表示しない。

## 90日結果snapshotとFK

最小案は、実行中jobの型をnullableだらけにする代わりに、対象削除時のterminal結果を専用の型付き`JobResultSnapshot`へ移すこと。conversion/reference/purgeの種別unionと、id、実行者、batch/再試行の関連ID、対象表示名、元の日時、状態・必要な失敗理由・進捗を保持する。原HTML、CSS本文、原本binary、asset、raw参照URLの台帳は複製しない。

対象jobの旧I/Oが収束した後、同UoWでsnapshot挿入と実行行削除を行う。job IDは表示上維持し、現一覧とsnapshotの重複を防ぐ。90日は元の履歴日時から数え、purge時に延長しない。本人だけが読め、「対象削除済み・取り込み直し不可」を表示する。cancelledは理由なしを維持する。残purge cleanupの再開はこの変換retryとは別操作である。

conversion_jobsのoriginal/note FK、reference_jobsのnote FKをこの移送で解消する。batchのpruneは保存したsnapshotの必要期間と未回収intentを区別する。reference_objectsのjobIdは現状FKではないが、関連job消去でprovenanceを失わないよう、回収intentへ所有情報を確定してから移送する。

P2d-2では単一purgeを正確に追える最小結果/進捗と、既存conversion/reference履歴の削除後表示までを接続候補とする。P2d-3は同snapshotとintentを親子集約へ利用する。全job種類の統合再設計は不要。

## 起動・掃引・UI・次の検証

DBを正とし、boot/周期sweepとoutbox wakeを使う。期限note列挙、object列挙、retryはmetadata/cursorとnextAttemptAtでboundedにする。失敗先頭が後続を止めない。既存runnerの並行2や候補100件を新workerの確定値にせず、小fixtureでUoW/IO時間を測って設定する。

`/trash`はP2d-1の型付きloader→親TrashListとroute-level pendingを維持する。本人の確認付き単一完全削除、確認取消、受付後purging表示、失敗理由、再訪・回収再開を追加する。不可逆受付後の通信切断ではtrashへ楽観復元せず、同intentのserver状態を再取得する。処理中に「元に戻す」を出さない。

| 観測群 | 次実装で必要な狭い対 |
| --- | --- |
| PD-T4 | current/履歴のみ/未参照asset・原本・bound stagingの回収、同key重複、削除失敗→容量保持→再試行→一度だけ解放 |
| PD-T5 | 同bundleのactive/trash/off/failed保持、最後note、未受理兄弟、同名別key、二worker共通claim |
| PD-T6 | put/link/第二putを保留、purge前後、旧upsert/finally、先行不存在、crash/旧lease、実storageの正常対 |
| PD-T9 | 期限一致、restore競合、通知欠落boot回収、失敗先頭の非飢餓、90日snapshot後も未回収intent/容量保持 |

移行は既存note/版/pin/原本を変えない追加構造を優先する。実行時はonline backup→cloneで旧全列とobject保全→最終source移行の手順を使う。今回これらは未実行。

共有変更の再open候補はP2d-1のlifecycle/restore/UI、P1-Dの永続化、P2aの原本/job履歴/予約cleanup、P2bのmedia/reference storage終了、C1の全pin削除境界。通常20版pruneやcodec/SSRF/HTML安全化は変更がなければ旧根拠を保持する。P3 workspace、P4公開、P5退会/Drive、OR-09全選択、empty親子は未実装のまま。

## 判断と停止

Managerへの技術選択候補は、共通object claim＋write ownership、terminal job snapshotへの移送の二点。いずれも採用済み完全削除の実現方法であり、新たな破壊的権限や保持規則を求めない。Node publishの実排他と旧attempt収束は実装・検証前であるため、成功と扱わない。

本資料だけをapply_patchで作成した。goal-implementの所有分離、doc-style/markdown-styleの簡潔な採用差分整理を使用した。製品・既存temp・DB・storage・browser・test・build・hash・git操作・process・依存には無操作。固定候補の不変を再測定したとは主張しない。文書提出後は全操作を停止し、Managerの次委譲を待つ。
