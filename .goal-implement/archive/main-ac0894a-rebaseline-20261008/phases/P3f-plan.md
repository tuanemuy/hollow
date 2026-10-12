# P3f 現行実装への接続案

観測終了: 2026-09-19T16:52:40+09:00。対象は WS-10 と JB-01〜03、採用済みの scope 失効・現在所有・有限回収契約である。製品の実装開始、受け入れ条件の追加、P3e の合否判定は含まない。

## 結論と判断依頼

通常の利用者操作は `requireScope` / `requireNote` と active WS の role を経由する。移動と一括子の実行も同じ現在認可を使う。これらは WS の `state='deleted'` による失効を再利用できる。

ストレージの `ownerActive` は icon 以外で WS の状態を直接照合しない。未 bind 資源の回収も通常の期限・猶予待ちである。したがって、WS 行の状態変更だけでは全入口の失効と回収は成立しない。後述の writer 境界と削除専用 admission を先に接続する。

最小案は、既存 `workspaces` の deleted 縮小行を scope 識別子・slug 予約として残し、削除 intent と本人履歴を別に持つ方式である。資源の課算先を新 tombstone ID に移さない。正式採用は Manager 判断とする。

- 判断 1: deleted 縮小行、削除 intent、期限内の本人 receipt を分離する案。
- 判断 2: slug は現在の unique 予約を保持する。再利用を有効にしない案。
- 判断 3: 本人の操作履歴・request receipt は削除受理日時から既存 JB の 90 日。未回収 intent と対象対応は表示履歴と別寿命にする案。独自 TTL は加えない。
- 判断 4: admission 前に既存 purge が note を消す競合は、purge 完了の同 Tx で削除 intent との対応を確保する案。履歴から後付け推測しない。

判断 3 は既存の変換・参照・batch 履歴の時計を変更しない。各履歴は元の作成日時から 90 日であり、WS 削除を起点に延長しない。

## 入力と観測範囲

原文は [WS-10](../../spec/scenario/workspace.md#ws-10-ワークスペースを削除する) と [JB](../../spec/scenario/jobs.md)。採用設計は [brief](../brief.md)、[design の P3f](../design.md#p3fのワークスペース削除)、進捗は [plan](../plan.md)、準備契約は [P3f-contract](P3f-contract.md) を参照する。

source は作業中の現行ファイルを読んだ。P3d-2 の `ownership_generation` / `resource_revision` / `bundle_scope_holdings` と P3e の `note_batches` / `note_batch_targets` / `note_batch_attempts` / `note_batch_move_receipts` が存在する。commit、候補 manifest、DB 適用状態との一致はこの調査の対象外である。

## 現在入口と scope fence

「接続済み」は source 上の現在認可経路が存在する意味であり、WS 削除を実行して通した意味ではない。全行の削除後動作と競合試験は未実行である。

| 入口 | 現在の同 Tx / snapshot の検査 | P3f 接続と残る確認 |
| --- | --- | --- |
| WS 一覧・設定・member 操作 | `WorkspaceRepository.role/list` は active WS に join。owner は `requireWorkspaceOwner` | deleted により通常認可を失う。`find` は deleted も返すため、縮小行を通常 Workspace として配らない型・port 分離が必要 |
| note read/save/style/history/WYS/trash/restore/manual purge | application の `requireNote` → 現在 note.owner → `canScope` → active role。新規保存は `requireScope` | 既存経路を維持する。失効後の保存失敗でも未保存本文の退避・download を壊さない。purge の内部回収だけを別入口にする |
| browse 三表示・検索・calendar・tag 候補・P3e 全選択 | `LibsqlBrowseReadSnapshot.snapshot` が read Tx 内で session と `w.state='active'` を照合。tag 管理も同 snapshot から呼ぶ | scope 不在は 404 系。0 件成功や無条件 personal 一覧へ変換しない。既に開始した snapshot の応答と削除後の新要求を区別する |
| tag command / move preview・commit | tag は `requireNote/requireScope`。move は note の現在 owner、両側 current edit、`moves.scope` の active を同 UoW で読む | 削除 commit と移動 commit の順序で所属を確定する。旧 preview を権限にしない |
| 現在・過去版・draft 媒体 | `authorizedAsset/authorizedHistoryAsset/requireDraft` が現在 note または未 bind draft の scope を照合 | bound draft は現在 note.owner を優先。旧 draft.workspaceId が削除済みでも移動先 note の媒体を消さない |
| 原本取得・参照台帳・retry | import/readImports、reference/read が現在 note と scope を照合。本人履歴と retry 可否は別 | 履歴は本人へ残せるが、削除済み対象の原本取得・新 retry は拒否する |
| media draft / upload の作成・受理・最終 insert | `createMediaDraft` と `requireDraft` は current scope を読む。最終 UoW でも `requireDraft` と upload state を再照合 | 利用者入口は接続済み。I/O 内の begin/register/publish は別途下表の不足を閉じる。asset metadata と予約状態を同 Tx で扱う |
| import begin / upload accept / companion accept | begin は `requireScope`。accept の最初と最終 UoW は batch の scope、cancelledAt、reservation、bundle sealed を照合 | 未受理 upload はまだ note を持たない。reservation→batch/sourceBundle の現在 admission 所有を失効させる。受理済みで移動した note に元 batch WS を適用しない |
| conversion claim後・最終本文採用 | `processImportJob` は note.lifecycle、現在 `canScope`、job token 等を検査 | 全 actor の当該 WS 現在所有 note の job を受理同 Tx で取消。旧 job の結果、再参加・古い token を採用しない |
| reference の予約・I/O 後 asset・本文採用 | application は current note/role を検査。repository の upsert は running/lifecycle/ownership generation を検査 | `upsertObject` 自体の scope fence は未接続。削除同 Tx の job 取消と current WS 検査を合わせる。cleaned 遷移は回収経路として妨げない |
| P3e preview / accept / retry / 子実行 | source/destination の `requireScope`、子の current note、actor verified、両側 `canScope` を同 UoW で読む | 実行 token と子結果を同 Tx で終端化する。取消対象は後述の現在所属と未終端 attempt。成功済み receipt は変更しない |
| invitation landing / continuation / accept / delivery | `activeInvitation` は issuer の active owner を照合。配送前後も現在 role。icon は WS active と current pointer を検査 | WS 単位の token/envelope/deliverySnapshot/lease 失効と continuation 除去が未提供。外部送信済みメールの撤回は保証しない |
| icon upload / commit / HTTP | 現在 owner/settingsVersion と active WS。object ownerActive も active と owner を読む | 受理同 Tx で current pointer を外し、全専用 icon 行を cleanup 対象にする。実 remove まで行・課算を保持 |
| sealUpload / 本人 job の通常 cancel | actor 所有の batch/job を確認し終端化するが、全経路に scopeRole があるわけではない | 削除後に通常 mutation として再開・再採用させない。既存 cleanup の収束を通常権限付き mutation と混同しない。自己 job の取消の可否を明示して確認する |
| purge / empty の既 fence 子 / GC / finally | システムの claim・writer・実削除の契約。通常 membership は回収根拠でない | deleted scope でも継続。未入場の empty 子は停止し、既存 purge intent は共有する。WS 自身の削除 worker を全 job 取消へ含めない |
| 公開・限定 URL / export artifact / Drive | P4/P5 は未提供の接続先 | current lifecycle と現在所有 WS を判定する契約だけを残す。今回の source 調査を実接続の証拠にしない |

主な根拠: [workspace/access](../../packages/core/src/application/workspace/access.ts)、[browse snapshot](../../packages/core/src/adapters/libsql/browseReadSnapshot.ts)、[asset/access](../../packages/core/src/application/asset/access.ts)、[acceptUpload](../../packages/core/src/application/import/acceptUpload.ts)、[batch worker](../../packages/core/src/application/batch/worker.ts)、[icons](../../packages/core/src/application/workspace/icons.ts)。

### Object writer の不足

`ObjectOperationRepository.beginWrite` は `ownerActive` を呼ぶ。`registerKey` は `canPublish` を呼び、`canPublish` も `ownerActive` と取得済み所有世代を使う。ここへ同じ現在 scope 検査を接続すれば、各入口に別の WS 判定を発明せず閉じられる。

| WriteOwner | 現在 ownerActive の条件 | 追加する current scope 判定の正本 |
| --- | --- | --- |
| `media-upload` | upload awaiting/uploading、未 bind または note active | draft.noteId がある場合はその note の現在 owner。ない場合だけ draft.workspaceId。参照 note 不存在を personal と扱わない |
| `import-upload` | reservation awaiting/uploading、sourceBundle unsealed | 未受理 reservation の batch/sourceBundle の WS。既に note を生成した資源の課算・回収をこの元 WS へ戻さない |
| `reference-job` | job running、note active、job と note の所有世代一致 | job.noteId → note.owner_workspace_id。reference_object の古い workspaceId を current owner としない |
| `conversion-job` | job running、note active | job.noteId → note の現在 owner。元 import batch の WS を使わない |
| `icon-upload` | icon processing/writing、WS active、現在 owner、settingsVersion 一致 | 現行条件を維持。current pointer 解除後の cleanup だけを許可 |

active WS の存在条件は I/O を始める直前と key register / publish の各 UoW 内に置く。開始時だけの認可キャッシュでは足りない。guard 通過後の遅い物理 write は完全には取り消せないため、最終 metadata/本文採用も current scope・state/token・所有世代で拒否する。writer 終了・key・予約は finally まで保持し、最初の不存在で課算を消さない。

根拠: [objectOperationRepository](../../packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts)、[referenceRepository.upsertObject](../../packages/core/src/adapters/libsql/repositories/referenceRepository.ts)、[scopeCapacityRepository](../../packages/core/src/adapters/libsql/repositories/scopeCapacityRepository.ts)。

## 削除受理と現在所有

受理の同 UoW で session/account、active WS、現在 owner、保存済み name と確認入力の完全一致を検査する。name の trim/Unicode folding をこの確認へ追加しない。現在名の変更は再確認、無関係設定の変更は削除確認の別条件にしない。

同 Tx で deleted fence、唯一の削除 intent、本人 request receipt、outbox 契機、通常 job の取消、icon pointer 解除、招待秘密・継続の失効を確定する。全 note 本文の読込・同期 purging 更新は不要とする案である。集合取消 SQL 自体は対象 job 数に比例するため、有限 admission と同じ意味の定数時間処理とは呼ばない。

対象所有は次の順で判定する。

- note が存続する資源は現在 note.owner を使う。原本、current/保持版/grace asset、bound draft/upload、reference object が該当する。
- 未 bind media だけは draft.workspaceId、未受理 import だけは batch/sourceBundle の admission 所有を使う。
- icon は専用 workspaceId、companion は既存 holding の note/admission/cleanup 理由を使う。
- 参照 note の不在は整合性エラーまたは確定済み purge の処理状態である。旧 uploader/creator/元 WS への fallback を作らない。

移出 commit が削除より先なら、その note と資源は生きた移動先に残る。移入が先なら削除対象になる。削除が先なら移出・移入・新規 bind を拒否する。削除確認時の件数や古い検索結果で集合を狭めない。

### P3e の取消対象

現 `cancelScopeActor` は actor と親 source/destination 列だけで queued/running を取消す。WS 削除用に actor を外すだけの流用はしない。専用の集合取消は attempt と current note を join して評価する。

- current note が削除 WS に属する queued/running attempt は、その parent source にかかわらず対象 note の外部失効として取消す。
- move の destination が削除 WS で、current note がその親の固定 source にまだ属する queued/running attempt は移入不能として取消す。
- 親 source が削除 WS という事実だけでは、既に他 scope へ移動した note の attempt や成功子を変更しない。現在 source 不一致の旧 attempt が通常 worker の既存 policy で拒否されることとは別である。
- succeeded/failed/cancelled の旧結果、成功移動済み子、保持 sequence / receipt を書き換えない。無関係な親の兄弟を親全体の cancelRequested で巻き込まない。
- 取消は failure null、lease/token null。同 Tx 競合で実行成功が先なら成功を保持し、削除が先なら旧 token の finish を拒否する。

P3e の成功 mutation と result/receipt は同 UoW である。この順序を再利用し、WS 削除用の補償移動や成功取消は加えない。

## 有限 admission と回収

閉集合の前提は全 current writer の scope fence である。実装と検証前に閉集合が成立したとは宣言しない。

note admission は `owner_workspace_id = 対象` の metadata ID を index 付き keyset / bounded SQL で読む。active/trashed/purging を含める。親の全件上限は設けない。各有限 Tx で削除 intent・deleted WS・現在所有を再照合し、既存 purge intent に対応付けるか、専用 cause で新規 purge を開始する。

`beginNotePurge` は manual/expired と trashed 操作 ID を前提にするため、そのまま内部認可 bypass で呼ばない。`workspace-deletion` と削除 intent ID を持つ専用入力を追加する案とする。active/trashed から purging への不可逆遷移と、既存 purging への対応付けを区別する。回収を認める根拠は DB の intent と current ownership であり、session、旧 membership、任意 boolean ではない。

既存 purge が WS worker の admission より早く note を削除できる。単に note ID cursor を進めるとこの対象が台帳から抜ける。提案は `PurgeRepository.finish` の note 削除前に、現在所有 WS の削除 intent へ `(intentId,noteId,purgeId)` を同 Tx で upsert すること。admission と finish のどちらが先でも一意対応に収束する。WS 削除より前に完了した古い purge を workspaceId と日時だけで拾わない。

通常 purge の cause/actor/元時刻は、既存 intent を共有するために書き換えない。親削除 intent は対応を持つだけにする。進捗は「受付済み」「回収中」「回収完了」を分け、page 不在や admission 済み数を全件完了にしない。全件数を表示する場合は、受理時点の同 SQL snapshot の count と終端対応を照合する。性能未測定の数値を UI 必須条件にしない。

### 未 bind 資源

現在の media GC は未参照 7 日と draft 期限を待つ。import の failed/cancelled storage cleanup も upload 期限後の条件を使う。これらを WS の明示削除にそのまま流用すると不要な猶予が入る。

削除 intent に束縛した資源 admission を追加し、未 bind draft/upload/asset、未受理 import、icon、最後の companion cleanup の ID/key を有限取得する案とする。bytes の新しい正本は持たず、既存所有行に課算を残す。共通 object delete claim と実 remove 確認を使い、writer 終了前に行・draft・batch を除去しない。通常 GC に使う期限値を過去へ捏造して回収を促す実装は避ける。

bound note を持つ media draft は旧 workspaceId で抽出しない。sourceBundle を元 WS 単位で丸ごと消さない。他 scope の note が持つ companion は保持する。削除 WS の全資源完了判定と、他 scope のために残る共有 bundle の生存を区別する。

## 最小 schema と port 案

名称は説明用であり未採用である。旧 migration は変更せず、新 migration で追加する。

| 対象 | 最小責務と保存値 |
| --- | --- |
| `workspaces` deleted 縮小行 | 同じ WS ID、deleted、slug 予約、削除 intent 参照。name/description/creator を通常 Workspace DTO として残さない。active/deleted の判別可能な型にし、現在 non-null の profile 列を縮小可能にする移行方法を詳細化する |
| `workspace_deletions` | 一意 workspaceId、intent ID、受付日時、処理状態、lease/token/次回再開、有限 admission 位置、必要最小 counters。actor や本文を回収権限の根拠にしない |
| `workspace_deletion_targets` | `(intentId,noteId)` 一意、purgeId と観測結果。既存 purge の終了・prune と競合して対応を失わないための最小永続接続。note 本文/title を複製しない |
| 削除の本人 receipt / 履歴 | actorId、requestId、digest、intentId、受理日時、期限内表示に必要な最小名前・状態。actor/request 一意。scope 権限や他 member 履歴の閲覧権限を与えない |
| 資源 admission の記録 | 必要なら intent/resource-kind/resource-id/key/回収確認を保存。bytes・所有者・writer 台帳を複製しない。既存 cleanup row だけで再開可能な種類は新表に二重化しない |
| note purge の拡張 | `workspace-deletion` cause と intent 参照、型と DB check の整合。既存 manual actor 制約を単に緩めない。WS 内部 purge に本人 title 履歴を無期限保持しない |

`WorkspaceRepository` は active 読取/通常操作を保ち、deleted の内部読取を削除 repository へ分ける案とする。`HollowUnitOfWorkContext` に削除 repository を追加し、受理・一意 receipt・有限候補・purge 対応・進捗・完了判定を transaction-bound port にする。clock/id は既存 ports、wake は永続 intent の補助とし、kick 欠落後も sweep から再開できるようにする。

必要な既存 port 差分は、workspace 単位の invitation/continuation/delivery 失効、icon pointer 解除と全専用資源 fence、current note / destination に基づく batch 取消、未 bind admission の失効、内部 purge 開始と完了対応である。これらを `skipAuthorization`、全 repo の汎用 SQL port、複数 membership の JS 全展開にしない。

### deleted 縮小行を推奨する理由

note/資源の課算は既存 WS ID または現在 note 所有へ接続する。`bundle_scope_holdings` は scope ID を値として持つ。member と icon は既存 WS 行を FK で参照する。専用 tombstone でも同じ ID は保持できるが、通常 WS 行を除去する場合は既存 FK と通常行/回収行の参照先を整理する必要がある。新しい ID へ所有を付け替える必要はない。

同じ WS ID の縮小行なら、参照先を一本に保てる。profile 列の null 許可と active 行の必須値制約を併設する案は、schema 再構築時の FK/trigger 保全確認を要する。空文字の架空 creator を作る回避は採用しない。新 tombstone はこの移行が安全に成立しない場合の比較案に残す。

slug は同じ行の unique 値として保持できる。回収完了後も予約だけが必要なら ID/slug/deleted の最小行を残せる。削除時の null 化、別 WS による旧 URL の再取得、新たな再利用期限は追加しない。

本人 receipt の 90 日後は名前・actor/request/digest を回収のために保持しない案とする。未回収 intent と対象対応は残る。90 日後の旧 request 再送を再実行せず、期限外または利用不可として扱う。受付 ACK 不明は期限内の本人 receipt を明示照会し、任意 WS ID だけで受理者や内部状態を列挙できない形にする。

## 保持と履歴の接続

既存 capacity SQL は WS active を課算条件にしない。deleted に変えても資源が残れば負債を保持できる。bound の参照 note を先に消すと provenance integrity 検査に違反するため、既存 purge の実回収・関連行除去・最後の note 除去の順序を維持する。

`0021` の holding trigger は現在 note 所有から note_holds を数え、最後の reference_settings 除去では note が存続する間に cleanup 所有を作る。他 scope に正当な保持があればその物理 companion を消さない。0 holding の行と revision も batch expected の意味を持つため、WS profile cleanup と一緒に無条件削除しない。

conversion/reference は既存 `archiveJobs` が元 ID、actor、元作成時刻で最小 snapshot へ移す。P3e attempts は note の FK を持たず、成功子と親内訳を保持できる。所有者全員へ他 actor の履歴を見せる権限は加えない。未完了の回収情報と 90 日を超えた title・job 詳細を分離する点は、既存 purge/empty の実形を踏まえて検証する。

membership と招待関連 metadata は失効後の有限 cleanup で除去する。最後 owner 制約を WS 全体の除去へ適用しない。tag は使用 0 件を含め、現在 note 関係の purge と整合した順で削除 WS の scope だけを除去する。移動先 tag と同名 tag は残す。これらを回収権限のために保管し続けない。

根拠: [purgeRepository](../../packages/core/src/adapters/libsql/repositories/purgeRepository.ts)、[move schema](../../packages/core/src/adapters/libsql/moveSchema.ts)、[0021 holding trigger](../../packages/core/src/adapters/libsql/migrations/0021_real_carmella_unuscione.sql)、[batch schema](../../packages/core/src/adapters/libsql/batchSchema.ts)。

## 影響する先行枝と検証案

再オープンと正式な完了条件は Manager が決める。次は変更が入る場合の影響候補であり、新しい台帳ではない。

- P3a-B/C/D/E、P3b-1-A/B/C/D/E、P3b-2-B/C: deleted の型、現在 scope、招待/continuation/icon、本人以外への失効、課算。
- P3d-2-B/C/D/E と P3e-D/E/F/G: 移動と削除の commit 順、現所有、holding、bound writer、子の外部取消、成功 receipt と履歴保持。
- P2a-E/F、P2b-A/B/C、P2d-1、P2d-2、P2d-3 の実編集境界: job 終端、媒体/原本/版、purge 原因・完了 hook、empty 既入場、未 bind 回収。
- P3c-A/B/E/G、P3d-1-A/D/E/F: current scope の read、selection/tag、note 削除と索引/関係 cascade。SQL を変えなければ Unicode 意味や検索算法まで再受入を要求しない。
- P1-E と R12 の該当枝: 新 worker の開始/停止/drain、pending/ACK 不明/個人遷移、規定 checks、移行 clone、同 bundle UI。

主要な未実行対は次のとおり。

- 現 owner/非 owner、保存名不一致/確認中改名、同 request 再送/異内容/別 actor、受付 ACK 喪失と本人照会。
- 全 member の新 read/write、通常 HTTP 媒体と原本、旧 draft・過去版・招待 continuation・icon・検索を削除後に拒否する。
- `guard → deletion → late put/link/final metadata`、既 put/第二 put、通常 TERM/drain と既知 owner の再起動、remove 故障で負債維持。
- 移出先 commit/削除先 commit/移入先 commit、一括 A 成功後 B 待機の削除、外部移動済み C と無関係 sibling の保持。
- active/trashed/既 purging、0 件/500 超/追加規模、既存 purge が admission 前に完了、kick 欠落、lease 失効、二 claim、page 不在を成功としない。
- 未 bind upload/accepted unbound asset/icon、別 personal draft 非対象、他 scope companion 保持、最後の保持と failed cleanup の課算。
- 元 90 日の本人履歴、未回収 90 日超、receipt prune 後の回収継続、slug 予約、削除済 WS の作成枠と物理負債の区別。
- 新 migration を clone に適用し、既存の全旧列・通常版/pin・object/charge・holding/revision・0022 batch receipt を比較する。

SQL の全件数比例コスト、admission/page 件数、lease/巡回値、UI 応答、実 filesystem 収束は未測定である。既存の 500 選択上限、通常 7 日 GC 猶予、独自 TTL、新 quota を WS 削除の条件に持ち込まない。

## 後続と停止

P4 は現在所有 WS の deleted を公開/限定 note と媒体・原本・artifact 配信に適用する。削除より前に移動した note の中立 identity は保持する。P5 は関連 backup を取消すが、個人 Google 連携の解除や既存 Drive ファイルの外部削除を伴わない。両方とも未接続・未検証である。

変更は本報告だけである。doc-style / markdown-style に従い、source の事実・未採用案・未検証を分離した。報告提出後は文書を含む全操作を停止する。
