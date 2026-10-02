# P2d ゴミ箱・完全削除の接続案

2026-09-06 22:29:18 JST 時点の read-only 調査に基づく未採用・未実装の提案。C3 の独立検証とは別資料であり、以下の試験は未実行。本体・依存・DB・原本・固定資材・ブラウザ・プロセスには変更も検証操作も行っていない。

2026-09-10（Asia/Tokyo）に保存済み全文を確認し、共有原本と削除後job履歴の契約を補足して文書作成を完了した。最新のgoal-implementとmanager-loopを全文再読済み。本資料だけを更新し、再開時の本体・環境照合はVerifierへ残す。

## 対象と原文

- [ED-09/10](../../spec/scenario/editing.md): 個人ノートの削除確認、直後の取消、ゴミ箱一覧、残り30日、復元、確認付き完全削除、空にする、期限回収。公開URL停止と共有情報の復元は後続公開機能の接続契約。
- [OR-09](../../spec/scenario/organize.md): 選択上限500、一部失敗の継続、理由内訳、権限別操作。P2dでは全一覧選択・タグ・移動等を実装しない。後続から再利用する型付き親子処理の境界だけ用意する。
- [JB-01〜03](../../spec/scenario/jobs.md): 永続親子job、本人だけの進捗・90日履歴、新job再試行、通常取消の実行中完了待ち、ゴミ箱移動等による自動取消。
- [採用設計](../design.md): 本文を含む最新20版、currentと履歴の認可分離、最後のpin解除から通常7日GC、物理削除確認まで容量維持、最後の関連note完全削除までbundle原本保持。

「50件超で非同期」はED-10の空にする操作だけの明記。一般bulkすべての同期閾値や、ゴミ箱全体500件上限へ読み替えない。

## 現在の再利用点と不足

| 接続点 | 固定sourceの現状 | P2dで必要な最小変更 |
| --- | --- | --- |
| `domain/note/entity.ts`、`noteRepository.ts` | Noteは`status: ready`のみ。listPersonalは本人の全noteを返す。trash日時・削除操作はない | 変換状態と独立したlifecycle、active/trash別query、条件付き状態遷移 |
| `application/note/getNote.ts` | requirePersonalNoteは所有者だけを確認 | 通常閲覧・編集はactive必須。trash管理の認可入口を分離 |
| `application/asset/access.ts` | current/historyはnote認可、bind済draftもnote認可を通る | lifecycleを同じ境界へ接続。保持pinをtrash閲覧権限にしない |
| `application/import/readImports.ts` | originalDownloadはoriginalのaccountIdだけを確認 | 原本にも現在noteとactive状態の確認を追加。attachment方式は維持 |
| `application/note/commitNote.ts`、revision repository | 本文/title/styleの意味ある更新だけ20版・pinを整合 | soft-delete/restoreは本文保存でない専用command。履歴を増やさず旧20版を保持 |
| import/reference worker | lease、noteVersion、現在所有、activeJobを確認 | 全取得・heartbeat・結果採用にlifecycle、削除による世代失効を追加 |
| asset/import/reference cleanup | DBの回収状態→storage.remove→行/予約解放、起動sweep | 完全削除intentと排他fenceを追加し、既存quotaの実削除後解放を維持 |
| reference bundle | reference_settingsがnoteとbundleの永続関係。sealed・関連noteなし・awaiting/uploadingなしがorphan条件 | trash中の関係を維持。最後のnoteのpurgeと進行中I/Oの排他を接続 |
| job schema | conversion_jobsはnote/originalへ必須FK、reference_jobsもnoteへFK | 実データ削除後も90日結果を残せる最小表示snapshot/nullable targetの分離 |

既存Node runnersのoutboxはwake-upだけ。正確性は新処理もDB truth、boot/sweep、lease、条件commitで担う。共通libSQL resource queueを維持し、storage I/OはUoWへ入れない。

## 状態と認可

最小候補は `active → trashed → purging → absent`。trashedだけがactiveへ戻れる。Noteの変換状態や公開状態と混ぜず、型付きlifecycleを追加する。trashedは`trashedAt / purgeAfter / trashOperationId`、purgingは`purgeId`を持つ。中途半端なnullable列の組合せはDB checkとhydrationで拒否する。

状態遷移は現在所有権と期待lifecycleを同じUoWで確認し、note.versionを進める。title/html/display値、revisionNo、20版、各pin、原本、参照設定はsoft-delete/restoreで巻き戻さない。updatedAtは本文編集日時として保持し、trash一覧はtrashedAtで並べる候補。削除履歴として本文を複製した隠し21版は作らない。

- 通常detail/edit/render/preview/save/style/history/履歴版restore/WYS-origin照会、current/history/draft asset、原本取得はactive必須。URL直打ち・HEAD・Range・416も同じ認可を先行させる。
- trash一覧とrestore/purgeは別の管理操作。個人は現在所有者のみ。trash一覧ではタイトル・削除日・残日数を表示し、通常本文・原本の閲覧入口を迂回させない。
- 直後undoはtrashOperationIdを含む復元要求。同じ削除操作だけを戻し、別tabが復元→再削除した結果を古いtoastで戻さない。IDは認可証明ではない。
- 既存editorは削除後の保存拒否で最新本文・mode・変換元hint・downloadを保持する。trashedを同owner後勝ちの通常本文保存で暗黙復活させない。
- 新規unbound draftは対象noteを持たないので一括無効化しない。bind済draftの新upload/受理/previewは対象noteのactiveを再確認する。実行中uploadは確定を拒否して原本予約のcleanupへ進める。

復元可能期限はserver clockの`now < purgeAfter`を候補とする。残日数は切り上げ、境界以降は「完全削除待ち」で復元不可。sweepの遅延で保管期限が実質延長しない。手動restoreと期限purgeは同じ状態/version条件で一方だけ成立する。

## 単一削除と復元

削除確認は最新の処理中状態も表示する。確認後に変換が開始された場合、処理取消への確認がなければ拒否して再確認する。単一noteを消すために同batchの兄弟upload/jobを一括取消しない。

削除UoWでlifecycle/version更新、対象noteのqueued/running仕事のhard失効、必要な初回display終端化、outbox通知を整合する。初回displayは記録済み判定だけで確定し、手動user値や本文を変更しない。原本は保持し、進行中変換はcancelledへ。復元で旧lease・pending初回job・取消済みjobを再開しない。原文の「削除前の状態」は保存済み本文・装飾・関係の復元であり、取消済み外部処理の復活ではない。

復元後も参照on/off・恒久台帳・既取得CSS/assetはそのまま。未完了の取り込みは理由と明示的な再実行導線を示す。retry時は現在versionと原本の条件を取り直す。cancelledからの操作はJB-02の失敗retryと混同せず「取り込み直す」等の新操作として扱う。既存retryImportがcancelledも受理する点は、P2d対象由来の取消を安易に旧job retryへ流さない接続注意。

後続共有では公開値・共有link行・タグ関係をtrash移動時に破壊しない。公開/限定URLの解決guardがactiveを必須とし、restoreで保存済み関係を再利用する。存在しなくなったWS/タグ/失効済み共有権限を自動再作成する権限は与えない。この将来差分はP3/P4で具体化する。

## 完全削除と物理容量

完全削除確認後のUoWを不可逆の境界にする。対象をpurgingへ変更し、本文・履歴への全アクセスと再添付を拒否する。currentの0と全保持版の正数pinを解除し、元ファイル・note由来asset・bind済draft staging・未採用reference object等の型付き回収対象を永続化する。各objectのDB所有/provenanceから列挙し、HTMLの任意URLやclient storageKeyを削除対象にしない。

専用 `NotePurgeRepository` と `PurgeObjectRepository` をUoWへ追加する候補。親purgeには対象note、起点trashOperationId、要求者/期限起因、状態、lease、進捗を持たせる。objectには種別、内部key、bytes、計上先、状態とretry時刻を持たせる。汎用JSON内へ本文・全関係を複製しない。

1. UoWでpurge fence、pin解除、対象所有と他pin不存在、回収intentを確定する。
2. UoW外でobjectを削除する。不存在は冪等な成功。他の削除失敗を不存在に読み替えない。
3. UoWで同intent/leaseを確認し、実削除済みobjectの行と課金容量だけを解放する。
4. 進行中書込の収束と全対象の削除を確認し、本文・全revision/head・台帳・原本等の関係を削除してpurge完了にする。残る履歴はjob結果の最小情報だけであり、本文を保持しない。

通常の編集で最後のpinを外したときの7日GCは変更しない。明示/期限完全削除は、復元不能fenceと正当な対象所有に基づく専用回収であり、他noteのpinがない対象を追加7日待たずに削除する候補。今後他noteに正当に共有されたobjectはそのpinが残る間は削除しない。期限内draftがあっても、完全削除noteにbindしたdraftは救済pinにしない。

trashedは原本/media/companionと全予約を従来どおり容量計上する。purgingも実削除まで計上する。既存object行を残して数える方式を優先し、FK解消のため回収台帳へ移す場合だけ同transactionで計上責任を移す。二重計上・先行解放・0byte仮置換をしない。

削除失敗は対象別理由と「削除中/再試行が必要」を表示する。復元不能fence後にstorage失敗してもtrashへ戻さない。90日job履歴pruneで未回収intentや容量を消さない。既に不可逆境界を越えたcleanupは後のセッション失効でも継続し、要求時に確定した削除権限を使う。未開始対象への新しい破壊的遷移は引き続き現在権限を確認する。

## 書込中・bundle・遅いworker

version更新だけでなく現在lifecycleをworkerの取得前・結果commitに加える。trash→restoreでactiveへ戻っても旧jobのactiveId/世代を復活させない。通常JB-03取消は現在の1取得/実行中子を完了待ちして安全な結果を残すが、trashによる自動取消はhard guardで本文・台帳・版・assetへの遅い結果を不採用にする。cancelledにfailureを付けず、結果objectはcleanupへ回す。

I/O途中で「不存在」を確認した直後、旧workerが同keyへ書き終える競合を防ぐ必要がある。新規書込のadmissionをfenceし、既存attemptの書込所有/終了または既存の有限I/O deadlineと失効を確認するまで、回収intent/予約を保持する。結果commit拒否だけを物理漏れ防止の証明にしない。heartbeat無効化直後を「書込完了」と扱わず、遅い完了通知後の再削除・crash後sweepを対にする。I/O中止・回収は既存期限を使い、無期限待ちや一律sleepで解決しない。

bundleはactiveとtrashedの全関連noteから保持される。off/failedでもreference_settingsをsoft-deleteで消さない。最後の関連noteのpurge時にのみ関係を外し、sealed、関連note0、本文受理予約0、進行中companion利用の収束を確認して原本回収へ進める。別noteが残る、同batch兄弟がupload中、未受理本文がある場合は保持する。初回削除対象noteだけを理由にbundle全体を削除しない。

現行originalはnoteId一意・storageKey一意で、同じbatchというだけでは同じ物理原本を意味しない。将来原本objectを複数noteで共有する場合は、objectの永続参照を基準に最後の関連先が外れるまで保持する。companionを含め、同一hashやファイル名から共有・所有を推測しない。対象noteの関係だけを外し、共有objectの物理容量は残る所有関係へ維持する。job履歴はobject保持の参照に数えない。

現行orphanCompanionのsealed/関係/予約条件を再利用し、purge workerと既存referenceRunnerで同objectの回収を競合させない共有claimを加える候補。最後の関連noteが空になるtransactionで回収fenceを取り、再受理や再関連付けが既にdeletingのbundleを利用できないことをadapterで保証する。

## 親子bulk・履歴・期限sweep

空にする確認では現在scope、対象件数、取消不能な開始済み削除、原本/媒体/履歴の削除、Driveバックアップは残る旨を示す。確認対象はserverで固定し、後からゴミ箱へ入ったnoteを同操作へ追加しない。子ごとにnoteIdとtrashOperationIdを持ち、restore済み/再削除された別世代を削除しない。

- 51件以上は永続親job1・対象ごとの子job。50件以下は同じ子処理を短いrequest内で進める候補だが、物理回収が残れば「受付済み/処理中」であり成功と偽らない。大きいobjectをHTTP応答まで無制限に待たない。
- emptyは500件を超える場合も全対象が対象であると説明し、server側cursorによるbounded列挙/child作成を行う。OR-09の明示選択portは別途500件validationを持つ。全件HTMLやobjectを一回のUoWへ載せない。
- 親子は操作固有の型付きpayloadと共通state/lease/実行者を持つ。job一覧DTOを既存import/referenceと統合し、tickerで親1件と子内訳を表示する。title/target種別/結果の最小snapshotは実行者本人だけがnote削除後も90日参照できる。「対象削除済み」を表示し、元noteへのリンク・変換や参照取得の再試行は無効にする。本文/原本binaryはjob履歴へ複製せず、履歴のためにassetや原本行を保持しない。
- 一部失敗でも他子を継続。成功・失敗・取消の件数は子の永続状態から算出する。failed子の再試行は新attempt/jobへつなぎ重複を抑止し、親は必要に応じrunningへ戻る。削除済み対象への新破壊操作と、確定済みpurgeの残cleanup再開を区別する。
- 親の通常取消は未開始子をcancelled、既にpurge fenceを越えた子は物理回収まで待つ。完了分を戻さず、失敗理由と取消理由を混ぜない。取消後の一部削除済みをUIへ明示する。
- 自動30日期限は利用者sessionなしの専用policy。`purgeAfter <= clock.now()`と現在trashedをUoWで再確認する。運用候補は100対象/掃引、lease付き子の並行2、既存runner同様boot+周期wake。数値は原文ではなく本体測定で確定する。
- 毒のある先頭対象や削除失敗で後続が飢餓にならないcursor/nextAttemptAtを使う。worker二重claim、crash前後、通知欠落、lease奪取後の旧finishを実DBで検証する。

## UIと段階的な接続

1. 個人lifecycle、一覧から消す/直後undo、trash一覧/復元、通常URLと保存/全asset/原本の拒否を先につなぐ。membership変更は親client islandのoptimistic状態、失敗rollback、invalidate、一覧Skeletonを使う。
2. 単一完全削除と期限sweep、型付きcleanup・quota・全pin・bundleの正常/失敗対をつなぐ。
3. emptyの50/51境界、親子進捗/取消/再試行と90日履歴、mobile/keyboardをつなぐ。OR-09の選択UIは追加しない。

trash一覧は削除日時降順+IDで安定pagination。空状態は通常一覧へ戻る導線、エラーは再試行。復元/完全削除は押下中pendingと二重送信抑止。操作で消える行自身にoptimistic/error所有を置かない。完全削除確認と通常trash移動の文言を区別し、storage失敗を「元に戻す」操作で隠さない。

後続WSは`NoteOwner`とaction別の現在policyへ接続する。owner/editorのみtrash操作、viewer拒否。account退会は個人所有分だけpurgeしWS所有noteを残す。WS削除はそのscopeのactive/trash両方をpurgeする。両者とも先にscope/session/公開アクセスを失効し、型付きcleanupへ委譲する。Drive上のbackup削除や外部API権限撤回はこのportの仕事にしない。

## 実装時の検証案

以下は元要件と共有境界に対する試験案。受け入れ項目と変更範囲は実装委譲時にManagerが確定する。

| 範囲 | 成功対と拒否・障害対 |
| --- | --- |
| 移行 | 全既存noteをactive初期値、旧本文/title/style/version/日時/全revision/pin/原本hash一致。migration前backup→clone検査 |
| soft delete/undo | 本人単一削除→消失→同操作undo、別人拒否、削除再実行のidempotency、古いundo拒否、30日直前/境界restore競合 |
| 現在認可 | detail/save/history/WYS-origin/原本/current/history/draft GET・HEAD・Range・416がtrashで拒否、restoreで元の正当なscopeだけ再許可 |
| 編集保護 | 他tab削除後autosave拒否、最新HTML/mode/変換hint/download保持、restore後再読込、V5同ID保存の旧正常対 |
| job取消 | queued取消、running遅い成功/失敗いずれも本文・版変更0、trash→restore後旧workerも不採用、兄弟note処理継続 |
| 完全削除 | current+20版全pin解除、原本/媒体/履歴消失、即時アクセス拒否、実削除前容量不変、削除失敗→retry→不存在確認→解放 |
| 共有資源 | bundle関連noteがactive/trash/off/failedなら保持、最後purgeで回収、upload中/遅いwrite/二worker/復旧で漏れ・早期解放0 |
| empty | 0/1/50/51、500超server分割、新trash不混入、restore済み子はskip/取消、途中cancel部分成功、failed子retry、90日後も未回収intent保持 |
| UI | desktop/mobile390px/keyboard、confirm取消、optimistic失敗rollback、残日数、本人ticker/親子内訳、別人job履歴拒否 |

この変更で再open候補はP1-B/D（保存/認可/移行）、P2a-B/D/E/F（job/原本/容量/履歴）、P2b-A/B/C/D（asset/draft/reference/display初回guard）、C1の履歴/復元/pinとC2/C3の失効時退避。codec・HTML/CSS安全化・safe-fetch・認証方式は変更理由がなければ既存根拠を保持する。P3共有認可、公開停止本体、退会/WS削除、Drive保持の実接続は今回の合格に数えない。

## 判断と未検証

個人trashの実装を阻む原文矛盾や新しい利用者判断は見つかっていない。期限時点で復元を閉じること、完全削除専用fenceで通常7日猶予を追加しないこと、50件以下でも残物理回収を処理中とすることはManager採用待ちの通常実装案であり、現採用済み仕様と偽らない。

後続WSで削除中に消滅したタグ/リンクをどう表示するかは、その機能の現在権限と失効規則に従う。個人P2dで架空の共有行や外部削除権限を実装しない。

調査はsource/docの読み取りと本資料作成のみ。テスト・DB照合・hash再取得・browser・build・依存・一時listener・production操作は未実行。固定C3のハッシュ不変を今回再測定したとは主張しない。
