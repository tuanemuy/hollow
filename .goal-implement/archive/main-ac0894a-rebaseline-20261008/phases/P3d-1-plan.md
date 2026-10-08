# P3d-1 タグ付与・管理の接続準備

## 範囲と根拠

対象は [OR-06/07/08](../../spec/scenario/organize.md) の一覧・詳細からの付与/解除とタグ管理。[design の P3d 節](../design.md#p3dのタグ書込管理と単一移動)、[brief](../brief.md)、[P3d-contract](P3d-contract.md) の採用部分を具体化する。元接続案の「未採用」は現在の design を上書きしない。

P3c 引渡し候補 `01b55c9294eb2bf77d41c06f5db7a67fb0d5dcd6` の source を読み取った。今回 git/hash による再照合はしていない。P3c の独立検証・環境所有は Verifier にある。本書は実装案であり、試験成功・方式の実測成立・新しい完了条件を意味しない。

single move、membership revision、容量移管、writer ownership generation、P3e を実装対象に含めない。旧環境/D01、鍵・資格情報、DB、storage、browser、process、依存、test/build は操作しない。P3d準備の変更先は本書だけである。別途明示許可されたP3c引渡し文書の訂正は末尾に記録する。

## 固定 source の接続点

| 現在の責務 | 確認した source | 今回追加する責務 |
| --- | --- | --- |
| tag ID、scope/key 一意、note/tag 複合 PK、双方向 FK cascade、tag→note 逆引き index | `adapters/libsql/browseSchema.ts` | tag mutation revision と変更追跡 trigger。既存 ID/name/key/版/関係は保持 |
| 本文 projection と現在 note tags 最大50件 | `application/browse/ports.ts`、`repositories/browseIndexRepository.ts` | 本文索引とタグ command を分離。既存 `tagsForNote` は正規 read として再利用 |
| active 使用数付き filter、現在認可と SQL の同 snapshot | `adapters/libsql/browseReadSnapshot.ts` | picker/admin/確認の用途別 read。filter の使用0除外・AND・無効 ID の0件を維持 |
| 現在 account・scope・active note の edit 判定 | `application/account/session.ts`、`application/workspace/access.ts` | tag usecase から同じ現在認可を呼ぶ。client の scope/canEdit は認可根拠にしない |
| 一つの DB transaction に repository を束ねる | `application/execution/hollowUnitOfWork.ts`、`adapters/libsql/hollowUnitOfWork.ts` | `tags: TagRepository` を追加。repository 自身は transaction を開始しない |
| trash/restore と purge 開始の lifecycle 更新 | `application/note/trash.ts`、`application/note/purge.ts` → `repositories/noteRepository.ts` | lifecycle trigger が該当タグ revision を同 Tx で進める。本文操作へタグを混ぜない |
| 完全回収後の notes DELETE | `repositories/purgeRepository.ts` | FK の note_tags 削除から残存 tag revision へ接続。物理回収/claim/容量方式は変更しない |
| 親一覧の page/trash/pending/rollback、詳細タグ表示 | `ScopedNotesBoard.tsx`、`NoteList.tsx`、`routes/notes.$noteId.index.tsx` | 親所有の delta mutation、共通 picker、詳細リンク、管理入口 |

上表の `repositories/` は `packages/core/src/adapters/libsql/repositories/`、application/adapter は `packages/core/src/`、UI名は `apps/web/app/components/hollow/`、route は `apps/web/app/routes/` を基準とする。現 schema に tag mutation revision と tag command repository はない。全文検索は tag 名を本文 projection に埋めず、現在の tags/note_tags を join している。

## 内向きの型と port

`domain/tag/name.ts` に `TagName` を置く。trim 後1〜50 Unicode code point の表示名を保持する。既存 `TagNormalizerPort` の Unicode16 key と版を application で組み合わせる。表示名の validation を node normalizer へ移さず、正規化後 key に50文字制限を掛けない。

`TagId`、正の安全な整数の `TagMutationRevision`、`TagIdentity = { id, scope, name, key, normalizationVersion, revision }` を内側で扱う。revision は比較用で、時刻・権限・本文版を表さない。新設列の初期値1は移行基準であり、過去の操作回数を復元した値ではない。

`domain/tag/ports/tagRepository.ts` は現在 transaction の tag/関係操作を担う。候補 method は `find`、`findByKey`、`ensureNamed`、`selectedForNote`、`attach`、`detach`、`inspectImpact`、`rename`、`merge`、`delete`、`deleteUnused`。SQLやdriver型を返さず、変更有無・競合・現在の小さい tag DTO/件数を返す。認可、名前生成、時計、ID生成は repository に隠さない。

application の command は次の意図別 union にする。全 tag 配列の置換は作らない。

| 操作 | 入力の比較対象 | 同 UoW の結果 |
| --- | --- | --- |
| 既存付与 | note ID、expectedScope、tag ID | 現在の正規 tag 集合と changed |
| 作成して付与 | note ID、expectedScope、TagName | 現在の同名 ID 再利用または新 ID 作成と付与、正規集合 |
| 解除 | note ID、expectedScope、tag ID | 正規集合と changed。scope 内の既存 tag が既に外れていれば同値 |
| rename | scope、source ID/revision、表示名 | 同 ID 更新、または同名 target を含む merge 確認結果 |
| merge/delete | scope、確認した source/target identity と revision | 照合後の集合更新、または再確認。失われた ID を復活させない |
| 使用0の削除 | scope、表示して確認した最大50 ID/revision | 全対象の0関係再照合後だけ一括削除。1件でも変化なら全体不変 |

各 delta は `requireAccount` → 現在 active note/edit → expectedScope 比較 → 同 scope/正規化版の tag 確認を行う。同値判断はこの後に置く。未知・別 scope・削除済み ID を成功や新規作成へ置き換えない。tag revision の無関係な変化を単純 attach/detach の必須 OCC にせず、明示 delta の現在状態へ適用する。

tag command は `commitNote`/`notes.save` を呼ばない。note.version/title/html/display/updatedAt、本文 revision、human mutation head、origin/pin、creator、job actor を更新しない。変換/参照の進行と独立してタグを更新できる。本文保存/版復元も現在タグ集合を旧値に戻さない。

## 有限 read と SQL の境界

`application/tag/ports.ts` に用途別の `TagReadPort` と有限 DTO を定義する。picker は note ID・expectedScope・検索語・cursor、manager は scope・検索語・使用0選択・cursor、impact は scope・最大2 tag ID を入力にする。現在 session/account/scope policy と selected tags/counts/revision を一つの snapshot で取得する。

推奨配置は既存 query Worker を再利用し、内側 read request/response union と wire validation に専用 discriminant を追加する方式。`SearchExecutionPort` を tags の write 窓口にはしない。`TagReadPort` の adapter が同じ runtime instance を共有し、active1/queue16・受付から3秒・child close まで slot 保持・query-only transaction を維持する。DB body projection を新たに監視 child main へ入れない。新しい process/queue/期限は作らない。

この追加 read は本文検索条件や索引準備の完了に依存しない。filter の `kind: tags` を流用して使用0を消したり、未完本文索引のため管理を0件表示したりしない。実行失敗/timeout/busy は再試行であり、同名不存在や削除成功ではない。

| read | SQL と DTO の要点 |
| --- | --- |
| picker | 同 scope/版の tags を起点に LEFT JOIN。active 頻度降順→key→ID。50件＋次 cursor 用1件。選択済み最大50件と exact normalized key の存在は同 snapshot の別 query |
| manager | 使用0を含む50件＋1、key→ID の安定順を第一案とする。active/trashed/purging/total を別数値で返す。本文/title の一覧は返さない |
| impact | source/target identity/revision、全関係数、lifecycle 内訳、重複数、統合後 distinct 数だけ。全 note ID を JS/transport へ展開しない |

cursor は用途・scope・検索/使用0条件・正規化版・順序 key/ID に束縛する。picker では頻度も cursor に含める。変更後は先頭へ rebase し、他利用者の変更を跨ぐ page に固定 snapshot の保証を付けない。exact 同名 query は scope/key 一意 index を使い、候補 page が部分一致だけでも明示新規作成を出す。read 失敗を exact 不在に変えない。

attach は既存複合 PK と同 UoW の count を使う。既存関係なら changed=false。新規関係の `INSERT SELECT` は対象 note/scope/tag と現在 count<50 を SQL 条件にも含める。作成と付与を一 transaction にし、51個目や認可失敗で tag だけ残さない。同 scope/key の `ON CONFLICT DO NOTHING` 後に現在 row を読み、既存表示名を上書きせず同 ID へ収束する。FK/一意性以外のエラーを同名成功へ握り潰さない。

merge は source=target を実統合として扱わない。別 ID の source/target を current edit と revision で照合し、両方の関係を持つ note の source 関係を DELETE、残る source 関係の tag_id を target へ UPDATE、最後に source tag を DELETE する。note_tag_reverse と複合 PK を使い、途中でも51関係を作らない。source3/target4/重複2なら統合後5である。target 名/IDを保持し、元 ID の alias を作らない。

delete は確認した tag の全関係を FK cascade で外す。note は削除しない。使用0cleanupは最大50個の ID/revision を個別に認可済み scope へ束縛し、`NOT EXISTS (SELECT 1 FROM note_tags WHERE tag_id=t.id)` を全件再確認する。表示上の active0だけでは削除しない。0件、51件入力、重複 ID、別 scope、確認後 attach を区別し、対象を黙って減らした部分成功にしない。

通常関係は note と tag の同 scope を command で保証する。既存の不整合関係を管理 query が隠して全関係0と判定しない。cleanup は scope による note join をせず全 relation の不存在で判定し、管理の整合性検査で foreign/orphan を検出した場合は書込を拒否する。今回 legacy row を自動修正しない。

## mutation revision と cascade の同 Tx 接続

推奨 schema は `tags.mutation_revision INTEGER NOT NULL DEFAULT 1` の1列追加。既存 `browseSchema.ts` に列を宣言し、新規 migration に trigger を置く。既存0018/0019や確定済み migration を書き換えない。安全整数上限を越える増分は rollback する guard とし、wrap/reset/別 ID 生成へ逃がさない。

| 変更 | 同 Tx の追跡 |
| --- | --- |
| note_tags INSERT | AFTER INSERT が NEW.tag_id の revision を進める。重複を挿入しなければ進まない |
| note_tags DELETE | AFTER DELETE が OLD.tag_id の残存 tag 行を進める。note FK cascade でも parent note を再参照せず取り漏らさない |
| note_tags note_id/tag_id UPDATE | 実際に組が変わった場合だけ OLD/NEW の distinct tag ID を進める。同数入替と merge の付替えを追跡 |
| tags name/key/normalization version UPDATE | 差がある場合だけ AFTER UPDATE で該当 revision を進める。revision 自身の UPDATE は対象列にしない |
| notes lifecycle UPDATE | OLD/NEW.lifecycle が異なる場合、現在 note_tags にある各 tag を一度進める。active→trash→purging と restore を追跡 |
| tags DELETE | 行の消失自体を旧確認拒否の根拠にする。消えた行の revision を保存する tombstone/alias は不要 |

repository は trigger と重複する手動 increment を加えない。revision は単調な変更印であり「一 command で必ず+1」とは規定しない。大きい merge では複数 relation の変更で複数増加する。無関係 tag の確認を無効にせず、rename の同値や重複 attach は進めない。

trash/restore は既存 `notes.save`、manual/期限/empty purge は既存 `beginNotePurge`、回収完了は既存 `purgeRepository` の notes DELETE を通る。application の全 callsite へ手書き revision 更新を散らさない。cascade 中の発火・rollback は正式実装時の小隔離 DB で確認する。source 読取だけで SQLite の発火順を実測済みとはしない。

この trigger は権限判定や UoW 外 I/O を行わない。adapter schema が relational consistency を保つ方式であり、既存 projection/FTS trigger と同じ配置である。現在認可・確認比較・50個の業務制約は application/domain に残す。driver error は既存 `LibsqlHollowUnitOfWorkProvider` の共有 error 境界で変換し、application の広い catch/retry を追加しない。

後続 move は relation INSERT/DELETE/UPDATE の同 Tx 追跡を利用できる。将来 note.owner 変更の途中状態を今回の lifecycle trigger がタグ移管済みと推定しない。membership revision や ownership fence の列・処理は今回追加しない。

## UI の所有と既存表示の維持

一覧は `ScopedNotesBoard` が delta/pending/error/optimistic と `router.invalidate()` を所有する。`NoteList` の各 tile/list/calendar leaf は picker を開き操作を親へ渡す。現在 AND filter の tag を外して leaf が消えても、親に rollback と理由を残す。未読込 note の一致を client で推測せず、成功後は現在条件の先頭 page/calendar を再取得する。scope/URL/操作 generation が変わった旧 success/catch/finally は新画面を上書きしない。

picker は検索候補の request generation と選択済み集合を分ける。新規作成の楽観表示には UI 専用 pending identity を使い、server ID のように URL や別 command へ送らない。同名競合は返却された既存 ID へ収束する。未確認の再送で二重付与を表示しない。scope 変更・権限喪失時は候補と mutation UI を閉じ、現在の read を取り直す。

詳細は存続する `NoteTags` client 領域が mutation を所有する。初期 tags/current scope は既存 getNote DTO を使い、body editor/PM/mode/backup は触らない。タグ名は現在 detail scope から `/notes` の tag 条件へリンクし、解除は別 button にする。viewer は link だけ、tag追加/解除を出さない。追加操作を hover だけに閉じず、keyboard focus/touch でも到達可能にする。

管理は `/tags`＋検証済み workspace/query/cursor を第一案とする。既存 filter 領域へ current edit 時だけ入口を置く。URL1:1の初期 read は非 await RSC promise＋fragment Skeleton、client `TagManager` が page/rename/merge/delete/最大50cleanup の pending・rollback・error を所有する。成功後は `router.invalidate()` と page1 rebase。未知の hydration 問題を前提に loader bridge/ssr:false を採用しない。

確認は現在影響件数と source/target 名を表示する。変更検出後は新版 preview を表示し、次の明示確認まで書かない。取消は不変。応答喪失は受付済み/未受付を断言せず現在 read で照合し、page 不在だけを成功の証拠にしない。削除/merge元 ID が既存 URL 条件に残る場合、P3c の「使用できないタグ・0件・解除導線」を維持する。

## 変更 path と先行影響の候補

| path 群 | 実装予定 | 先行条件の影響枝 |
| --- | --- | --- |
| 新 `domain/tag/*`、`application/tag/*`、`repositories/tagRepository.ts`、両 `hollowUnitOfWork.ts`、`di/hollowTypes.ts`/Node wiring | VO、delta、管理確認、Tx repository、DI | 新 OR-06〜08。型/DI追加だけで無変更の全認証・editor条件を開かない |
| `browseSchema.ts`、新 migration/metadata | revision と trigger | P2d-1-A/D の trash/restore保全、P2d-2-A/C/E の lifecycle副作用/cascade/移行、P2d-3-B/F の共通begin・構造保全に限定 |
| `application/browse/ports.ts`、`adapters/node/browse/wire.ts`/`searchExecution.ts`、`adapters/libsql/browseReadSnapshot.ts`、`worker/node/searchQuery.ts` | 専用 read kind/DTO、同 runtime への dispatch | P3c-A/D/G の有限 read/current policy/型。既存 queue/停止の挙動変更がなければ全FD/停止方式を再監査しない |
| 新 `presentation/tagInput.ts`/`tagServerFn.ts`、新 `TagPicker`/`NoteTags`/`TagManager`/fragment/route、root manifest登録 | 境界validation、read/command/UI | P1-C/E、P3c-B/D/F/G の表示・URL・現在policy・RSC/keyboard |
| `ScopedNotesBoard.tsx`、`NoteList.tsx`、専用CSS、詳細route | 親 tag delta、管理入口、タグリンク | P1-B/E、P3a-B/F、P2d-1-A/D の親page/trash/rollback/旧応答、P3c-B/D/F の3表示/filter/detail |

上記は予定影響であり、再openの決定ではない。実編集時に path と責務で Manager へ確定報告する。P3c 自体も現在は独立確認中である。P3b招待/設定/icon、本文codec、projection parser、20版/pin数、PM、物理claim/容量、FD実装は変更しない。タグと本文/jobの共存は不変契約を確認する小対とし、全方式の再設計・再試験へ広げない。

## Manager 判断と実装順

採用判断が必要な追加共有構造は二つである。

1. **revision の schema 管理**: 上記の1列＋relation/lifecycle/name trigger を第一案とする。全 caller の手動 increment は cascade/同数入替の取り漏らしを増やすため採らない。追加の scope-wide revision、tombstone、確認期限は不要。
2. **picker/admin read の配置**: 新しい内向き TagReadPort を既存 read child/runtime の discriminant へ接続する案を推奨する。単純な main UoW read は差分が小さいが、頻度/全関係の集計時間を現在の3秒監視から外す。新 process を増やさず既存有限資源を共有する案で進めるか確認する。

管理の key/ID 順、page50、`/tags` route は通常詳細化の候補であり、新しいタグ総数上限ではない。merge/delete の indexed SQL は全関係へ原子的に作用するため、件数に比例する Tx 時間は未測定である。小規模・多数関係で時間/返却量/rollback を測り、不成立が判明した場合だけ具体的な非同期案を返す。無断で部分適用・新件数打切りにしない。

正式開始後の候補見込みは3〜4.5時間。順序は、VO/Tx/trigger・clone保全 → read/picker・一覧/詳細 → 管理preview/merge/delete/0cleanup → 同bundle実UI/規定checks/保全/明示commitとする。最初の15分で実変更範囲と見込みを更新する。

狭い自己確認は、50→51同時付与/同名作成収束、rename同値/競合同名、同数 relation入替/無関係tag不干渉、trash→restore/purging/cascade、merge重複/最大50、0cleanup確認後付与の全体拒否、現在owner/editor/viewerと失効、3表示でfilter脱落rollback、detail link/390keyboard/旧応答、本文・job・版・pin不変を対象にする。今は全て未実行であり、新規の合否 gate を定めていない。

## 停止と未実行

本書は doc-style/markdown-style に従い、採用済み条件・固定 source の事実・実装提案・未測定を分離した。製品編集・環境操作・試験・migration・git/hash は実行していない。別件の引渡し照会には、明示許可された自己 auth helper の argv/fill 分岐だけを読み、CLI順の説明を返した。helper実行や資格情報ファイルの読取は行っていない。

開始は2026-09-11 09:31:45 JST、全文確認時の実時計は09:40:04 JST。引渡し helper の許可 session は `p3c-fresh-` prefix であり、`p3c-verify-owner` を使えるとした先の説明を訂正した。Managerの追加許可により09:40:32 JSTの訂正として `P3c.md` の使用例/許可regexだけを追記し、元識別子/09:26停止記録を保持した。認証値/既存helperは変更しない。

全文確認後、本書を含む全操作を停止して Manager へ返却する。P3d-1 実装は別の正式委譲を待つ。
