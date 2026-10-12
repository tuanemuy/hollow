# P3d タグと単一移動の接続案

## 結論と位置付け

対象は OR-06/07 のタグ付与、OR-08 の管理、OR-12 の単一移動。タグ mutation/管理を先に接続し、所有・容量・writer fencing を伴う移動を別の実装単位にする案を推奨する。P3c の reader と UI を再利用できるが、タグ command、管理用 read、移動 command、所有世代の接続は追加が必要である。

本書は Implementer 補助の接続提案であり、製品の合否、方式採用、新しい受入 gate を決定しない。元要件と採用済み設計を「正本」、追加の具体化を「提案」、不足を「現 source で未接続」と区別する。DB・test・build・browser・process・storage・recovery・秘密ファイル・goal API は操作していない。変更は本書のみ。

source 読取時点は `2026-09-11T07:50:40+09:00` 以降。P3c は主担当による統合中であり、commit 固定のレビューではない。主担当から「P3c のタグは reader まで、P3d command と移動 ownership generation の未反映追加予定なし、ScopeCapacity の SQL 抽出は算式不変」と確認した。以下の接続名は候補であり、公開 port の型を確定したものではない。

## 正本と観測条件候補

原文は [OR-06〜08/12](../../spec/scenario/organize.md)、規約は [CLAUDE](../../CLAUDE.md)。共有契約は [design の P3 所有/Q2/Q3、P3c タグ、P4 identity](../design.md) と [brief の採用仮定](../brief.md) を正本とする。[P3-contract](P3-contract.md) の未採用表記・過去の現コード記述は現在の design/source を上書きしない。

| 出所 | 正本の条件 | 実装時の観測候補。今回は未実行 |
| --- | --- | --- |
| OR-06 | 一覧で追加/解除、頻度順候補、選択済み、即時反映と失敗 rollback、編集者のみ | ポインター・keyboard/touch から同じ操作へ進み、二重付与せず、失敗後も理由が残る |
| OR-06、design P3c | trim 後1〜50 code point、scope 別同名 key、note50一意 tag ID | 幅/大小文字同値で同じ ID を再利用し、別 scope では混ざらない。50→51 の競合も同 UoW で拒否する |
| OR-07 | 詳細で同じ付与/解除、タグから絞込一覧、viewer は表示のみ | 現 detail scope を使い、旧一覧 scope を流用せず、未保存離脱 blocker を通す |
| OR-08 | 件数付き管理、rename、全ノートから削除、同名 rename は確認して統合、使用0件 cleanup | rename は ID 維持、delete は note を消さず、merge は重複関係を減らす。確認後の変化を黙って拡大適用しない |
| OR-12 | 両側の現在 edit、本人個人/owner/editor の WS、具体的な閲覧増減、変換/再生成中拒否 | preview 後の除名・同数メンバー入替・タグ対応変更・容量超過を確定時に検出する |
| design Q2/Q3、IM 共通、AC-10 | scope 容量と予約、provenance 一括移管、companion 全量を scope 毎一度 | 個人→W1→W2→本人個人で、原本/版/猶予/予約/負債を取り落とさず、拒否は全体不変 |
| design P3/P4、OR-12 | move は version のみ更新し内容/日時/版/人物/公開 identity を保持 | 旧 writer 結果を採用せず、現在 charge で回収する。公開操作・URL token 再発行に置き換えない |

## 現在再利用できる境界と不足

| 現 source | 再利用する部分 | P3d で必要な接続 |
| --- | --- | --- |
| [browse/ports](../../packages/core/src/application/browse/ports.ts)、[browseSchema](../../packages/core/src/adapters/libsql/browseSchema.ts) | `TagNormalizerPort`、`BrowseTag`、scope+normalizedKey 一意、immutable tag ID、note/tag 複合 PK、逆引き index | tag name VO、mutation/admin read port。現 `HollowUnitOfWorkContext` に tag command repository はない |
| [tagNormalizer](../../packages/core/src/adapters/node/browse/tagNormalizer.ts) | Unicode16.0.0 の同期純粋 key。版 assertion は外側 | trim/非空/50cp は内側 VO。key 関数に表示名の業務制約を追加しない |
| [browseReadSnapshot](../../packages/core/src/adapters/libsql/browseReadSnapshot.ts) | 現在 scope/policy、active note 使用数、key/ID tie-break、有限50件と次 cursor | filter と付与候補/管理を用途別に分ける。現在の tagPage は inner join と active 条件なので使用0件が存在しない |
| [browseIndexRepository](../../packages/core/src/adapters/libsql/repositories/browseIndexRepository.ts) | scope/版を照合した note tags 最大50件、projection の保持 | tag relation を同 UoW で変更。全文 projection に tag名を埋め込まず現在 relation を join する |
| [workspace/access](../../packages/core/src/application/workspace/access.ts)、[workspaceRepository port](../../packages/core/src/domain/workspace/ports/workspaceRepository.ts) | `requireAccount` と組み合わせる current `requireNote(...,'edit')`/`requireScope(...,'edit')`、scope 候補と member page | move 向け両側 audience 差分/確認 revision。既存 `settingsVersion` は membership 変更を検知しない |
| [NoteRepository](../../packages/core/src/domain/note/ports/noteRepository.ts)、[libSQL noteRepository](../../packages/core/src/adapters/libsql/repositories/noteRepository.ts) | 現 note/expectedVersion の取得・OCC | 現 `save` は owner 列を書かない。専用 `transferOwnership` 相当が必要。通常 save の全 field 更新へ無条件に owner を加えない |
| [scopeCapacityRepository](../../packages/core/src/adapters/libsql/repositories/scopeCapacityRepository.ts) | 原本、asset、upload/reference 予約、companion 等の scope 集計 | `usedBytes` だけでは移管計画/所有世代/最後 cleanup owner を表せない。型付き transfer 窓口が必要 |
| [ObjectOperationRepository](../../packages/core/src/domain/purge/ports/purgeRepository.ts)、[objectOperationRepository](../../packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts) | writer ID/runtime/active、key 登録、一意 delete claim、endWrite | `WriteOwner` は kind/id、現 `canPublish` は active owner/lifecycle を確認するが移動所有世代を照合しない。publish 直前と結果 commit の両方へ接続する |
| [ScopedNotesBoard](../../apps/web/app/components/hollow/ScopedNotesBoard.tsx)、[NoteList](../../apps/web/app/components/hollow/NoteList.tsx)、[detail route](../../apps/web/app/routes/notes.$noteId.index.tsx) | 親の page/trash ownership、identity/generation、現在 scope、タグ表示、invalidate | 一覧の付与/解除 callback、詳細の共通 picker、管理入口、move preview/confirm。現 `BrowseNote` に note version はない |

## タグの型と読取を分ける

### 正本の名前と identity

`TagName` は trim 後の表示名1〜50 code point を保持する。比較 key は Unicode16.0.0 の `NFD(CF(NFD(W(name))))`。W は wide/narrow mapping、CF は default full C/F mapping であり、Turkic T mapping、かな変換、アクセント除去、内部空白圧縮、不可視文字除去を加えない。表示名を key へ置き換えず、正規化後 key の長さへ50文字制限を移さない。版違いの同名判定を混ぜない。（design P3c）

`Ａ/ａ`、`ｶﾞ/ガ`、`σ/ς`、`ß/SS`、canonical composed/decomposed は同値。`①/1`、`²/2`、`㎒/MHz`、`カ/か`、`é/e` は非同値。これらは既存採用意味の例であり、本調査の実測結果ではない。

tag ID は scope 間で移動しない。同名作成は `(scope,key)` の現在 row を再利用し、既存表示名を上書きしない。同時作成も最終 DB 一意性で一つへ収束する。明示 rename は表示名を更新し、key が異なるときだけ比較 key も変える。同 ID の大小文字・幅表記変更は merge ではない。

### 三つの read 用途の提案

| 用途 | 対象と順序 | DTO/候補判定 |
| --- | --- | --- |
| OR-04 filter | 採用済みの active 可視 note 使用数>0、頻度→key→ID | 現 reader を維持。query/month による facet 追加なし |
| OR-06/07 picker | current edit note の scope 全 tag。active 使用数降順、0件は後方、key/ID tie-break | 有限 page と検索、現在 note の選択済み ID は別に最大50件。使用0の同名 tag も再利用する |
| OR-08 manager | current edit scope の全 tag、0件を含む | active 使用数と削除影響の総関係数を区別。検索/page の identity に用途と scope を含める |

picker の `create` 可否は現在検索 page の空/非空で決めず、完全一致 key の存在を別に読む。部分一致候補や続き page に同名 tag が隠れていても二重作成しない。完全一致がなく部分一致だけある場合にも「この名前で作成」を併記する案を推奨するが、OR-06 の「一致する候補がない」の具体的 UI 解釈として Manager 判断に残す。失敗/未読込を不存在と表示しない。

管理の件数は、active だけを「削除影響件数」と呼ばない。提案では現在 scope の存続 note に付く全関係を総数とし、ゴミ箱・削除処理中を含む内訳を示す。0件 cleanup は全関係0件だけを対象とする。trash-only tag を未使用として消さない。purging note の本文やタイトルを管理一覧へ追加公開する必要はない。OR-08 は件数の lifecycle 内訳を未指定としているため、この読み分けは未採用。

### mutation と本文 guard の提案

`attachExisting(noteId, expectedScope, tagId)`、`createAndAttach(noteId, expectedScope, name)`、`detach(noteId, expectedScope, tagId)` の意図別 command にする。任意配列を保存する全置換 API は避け、同 UoW 内で現在 session/account、active note、scope edit、expectedScope、一意性、note50件を確認する。scope は client の許可情報ではなく stale 文脈を検出する比較値である。移動済み note に元 scope の操作を黙って適用しない。

既に付いた tag の attach、外れた tag の detach は認可後の同値操作にできる。削除済み既存 ID の attach は失敗し、別名/別 ID を勝手に新規作成しない。作成と付与は一つの UoW とし、51個目の失敗で空の新 tag だけを残さない。未知/他 scope の ID は存在情報を返さない。

推奨は、タグ関係/表示名の変更で `note.version`、`updatedAt`、本文 revision、human mutation head、origin/pin を変えない方式である。タグは独立した関係であり、変換/参照 worker が保存する本文には含まれない。これなら処理中のタグ操作だけで既存 `job.noteVersion` を失効させず、本文の他 actor 確認も発生しない。OR-06〜08 は本文版/更新日時を未指定なので、この点は Manager の採用が必要である。

代替はタグで note.version のみ進める方式。ただし現 worker の exact noteVersion guard が参照/変換結果を拒否するため、単なる UI 追加では完結しない。タグで updatedAt も進める方式は更新順と将来 P4 の更新期間を変え、merge/delete が大量 note の時刻を更新する。本文 revision を追加する方式はタグを snapshot に持たない現20版へ内容同一の版を消費する。いずれも無断採用しない。

tag command は最新の正規 tag 集合と変更有無を返す。`BrowseNote` へ本文 version を足すことは上記 delta 方式の必須条件ではない。管理確認には後述の tag revision を使い、本文版との二重利用を避ける。本文/タグの同時更新は別項目の変更として共存し、最終 read は現在 relation を返す。

## タグ管理の確認と競合

rename は同 ID の name/key 更新。既存別 ID の同名 key があれば、その場で自動 merge せず preview を返す。merge は既存の移行先 ID を残し、元 ID の関係を移す。両 tag が付いている note は1関係へ dedup するため、note50件を超えない。元 ID は削除し alias を作らない。（OR-08、design P3c）削除で note を消さないことは正本であり、本文版・容量・日時も保持する具体案は前節の未採用方針に従う。

確認 DTO の提案は source/target の ID・現在表示名・比較 key/version・各使用件数・重複件数・distinct 影響件数・比較 revision。例えば source3件、target4件、共通2件なら統合後は5件、付替え対象は source の3件であり7件ではない。delete は全解除件数を表示し、0件 cleanup は tag 件数を示す。note 本文配列は返さない。

確認後に使用 note が入れ替われば、件数が同じでも変更である。件数だけの比較では防げない。最小案は tag ごとの単調な mutation revision を、rename/attach/detach/merge/delete と relation を変える move/purge で同 Tx に進める方式。表示する active/trash 内訳まで確認対象にするなら該当 lifecycle 変更も revision へ含める。revision の保存場所、cascade を取り漏らさない adapter/trigger 構成は実装前の共有設計事項であり、本書では schema を決めない。

commit は current edit と source/target identity/revision/key を読み直す。変化なら新 preview を返して再確認し、最新集合へ自動拡大しない。relation 全 ID の永続 snapshot、暗号 token、新しい確認有効期限は不要である。比較値は認可を与えない。小規模な scoped catalog revision 一つで代替すると実装は単純だが、無関係 tag の変更でも再確認が増える。per-tag revision を第一候補、scope revision を可逆な簡素代替とする。

merge/delete は索引付き集合更新で実装し、全 note 本文を JS 配列へ読まない。全関係への作用は OR-08 の意味だが、大規模 scope の transaction 時間は未測定である。部分適用を成功と表示したり、OR-09 の500件で silently 切り捨てたりしない。有限資源内での成立が不明なら、非同期化を含む具体案を Manager へ返す。新しいタグ総数上限・timeout・件数閾値は本書で定めない。

0件 cleanup は OR-09 の500選択ではない。server が current scope 内の0関係 tag を有限 page で提示し、確認した ID/revision の有限集合だけを再照合して削除する案を推奨する。途中で付与された tag は削除せず、集合全体を再確認へ戻す。全 scope を一度に無界取得/無界 command へ渡さない。1回の上限や非同期化の閾値は原文未指定であり、本書では固定しない。繰返しの scoped page cleanup で足りるかは Manager 判断に残す。

削除/merge 元 ID が URL 条件に残る場合は、P3c 正本どおり0件＋解除導線。rename は同 ID で追従する。merge 先への自動 URL 置換や、消えた条件の自動除去をしない。管理/付与後は tag 候補 cursor・一覧 page を invalidate し、page1へ rebasing する。

## 単一移動の preview と確定

### 現在権限と具体表示

移動先は実行者本人の個人 scope と現在 owner/editor の active WS。現在と同じ scope と viewer WS は候補から除く。WS→個人は creator/uploader の個人ではなく、実行者本人の個人である。scope 候補を既存 `list` から得る場合、先頭50件を viewer 除外して終わらず後続 cursor を維持する。server 側 edit 条件付き有限 query を追加する案が明瞭である。（OR-12）

preview は current note を読み両側 edit を確認した UoW で、対象 version/source、移動先、閲覧 audience の増減、最大50件の tag mapping、容量増減・移動後量、処理中の拒否理由を返す。membership や容量を別時点の UI キャッシュから組み立てない。

private note の例: W1 の A(owner)/B(viewer)/C(editor) から W2 の A(editor)/C(viewer)/D(owner) へ A が移動すると、B は読めなくなり、D は読めるようになり、C の閲覧は継続する。W1→A個人は A 以外が失い、A個人→W2 は C/D が得る。重複メンバーを増減へ二重に数えない。名前/現在表示可能ラベルと件数を出し、多数なら増減の有限 page を同じ audience revision に束縛する。既存 member read は参加者から利用できるが、無関係 scope の membership 検索へ広げない。

将来 public/link note では「この WS のメンバーとして読めなくなる」と表示し、独立した公開/限定経路まで失うと断言しない。元メンバー blacklist や share 自動取消は追加しない。P3d の現在 private 実装で、未提供 public policy の結果を架空表示しない。（design Q1/P4）

### preview から commit までの差分検出案

推奨は保存済み大規模 snapshot ではなく、現在 state の revision と小さい比較値を返す方式である。

| 比較対象 | preview に含める候補 | commit の扱い |
| --- | --- | --- |
| note | ID、expected source、note.version | 現 active note と一致。違えば再読込/再確認。両側現在 edit は必ず別に確認 |
| audience/role | 両 WS の membership revision、表示 scope の名前/ID | 同数入替も検出。join/除名/脱退/role変更を同 Tx で revision 更新し、変化なら再確認 |
| tags | 現 source の ID/key/name と dest 同名 ID/key/name の最大50対応表、normalization version | 同 UoW で再計算して exact 比較。rename/delete/作成/付与・解除による対応変化なら再確認 |
| 資源と容量 | note 移管所有世代、移管額/companion 差分、両側現在使用量・移動後量 | 同 UoW で provenance と現在 quota を再計算。上限超過は拒否、表示額が変われば更新 preview へ |
| conversion/regeneration | 現 original/job の状態 | preview が ready でも確定時に処理中なら拒否。queue を含む処理ライフサイクルから判定し、UI status だけに依存しない |

現 `WorkspaceRepository.settingsVersion` は settings/icon の OCC であり、`join`/`membership` はこれを進めない。追加の membership revision を内側の専用 read 契約で取得し、招待参加/role/退出を含む既存 mutation へ同 Tx で接続する案を推奨する。単純人数、最大 joinedAt、現在 actor の role だけでは、B退出/D参加のような同数入替を検出できない。scope 廃止と account 失効も現在 policy で拒否する。将来 AC-09/WS-10 の実装時はそれらの経路も revision/保持契約へ接続し、今それらを完成扱いしない。

代替は既存 `settingsVersion` に membership 変更も含める方式。列追加を減らせるが、メンバー参加だけで設定編集/icon処理を競合させるため推奨しない。全 member ID/role を client 往復で比較する方式は規模に比例し、有限 DTO 方針に合わない。暗号署名は current 権限・同 Tx 再確認を代替しないため追加しない。

容量変化は preview の両側使用量/移管差分との数値比較で検出でき、scope 全 write ごとの専用 quota revision は必須ではない。第一案は金額表示に相当する bytes が変わったら再確認する保守的方式。無関係 upload による再確認が多い場合は、移管増分/保持条件が同じで最終 quota 内なら、現在残量だけ更新して commit する代替がある。どちらを採るかは確認体験の Manager 判断とする。容量確認値を client から信頼して受理しない。

preview 比較値の改変耐性を認可能力と混同しない。利用者が旧確認値を書き換えても、server の current policy/正規化/provenance/容量計算を迂回できない構造にする。再確認後の再変化も同じ比較で検出する。新たな token 保持期限は導入しない。

### 原子的な command の責務

専用 `moveNote` usecase は同 UoW で上記照合、capacity 差分判定、所有変更、tag 付替え、資源所有世代の更新、必要な旧試行の失効を確定する。quota 判定と他 upload 予約は同じ予約/集計境界を通す。採用上限は個人 `5×1024³`、WS `20×1024³` bytes。移動後の使用量と予約が上限を超える場合だけ容量理由で全体拒否し、ちょうど上限は受理側である。storage I/O の待機を UoW 内へ入れない。

dest の同じ比較 key を持つ既存 tag だけへ付替え、存在しない tag は解除する。dest tag を自動作成せず、source tag の ID/scope/name は維持する。preview に「保持される名前/移動先 ID」と「解除される名前」を分ける。source tag は使用0件になっても移動だけで削除しない。scope+key 一意と最大50件のため付替え後件数は増えない。

note は owner と version のみ変更する。本文/title/display、createdAt/updatedAt、revisionNo、20版/pin、capturedNoteVersion、保存済み origin、creator/uploader/job actor、物理 key、将来 public identity/URL世代/token を保持する。`commitNote` や `editNote` を移動の代用品にしない。旧 editor が現在 dest edit を持つ場合の通常保存は既存 C1〜C3 に従い、持たなければ最新未保存入力を保全した拒否にする。

## 資源移管と writer/cleanup の接続

### provenance 集合

| 移管するもの | 正本にする関係 | 変更しないもの |
| --- | --- | --- |
| original | original.noteId | original ID/key、upload actor、conversion 履歴 |
| current/held asset | sourceNoteId または bound draft.noteId と正当な current/revision pin | asset ID/key、pin/revision、bytes、媒体内容 |
| 未参照猶予 asset | 同 note 由来/同 note bound draft | unreferencedAt と既存猶予。deleting を ready に戻さない |
| bound staging/media reservation | draft.noteId と upload ID | draft の作者限定 read、expiresAt、writer ID |
| reference 未完予約/written object/回収負債 | reference object→job→note と永続所有参照 | job actor、実 key、現在 delete claim |
| companion | 永続 note→bundle と各 scope の保持関係 | 同梱素材全量、off/失敗からの再利用、物理一意 key |

未bind draft、note 未生成の import予約、同 bundle の兄弟 note/upload は移管しない。asset を current HTML URL だけから列挙しない。同じ asset が20版にあっても一実体分だけ数える。予約と確定実体を二重に加算せず、回収待ちを無料にしない。（design Q2/Q3）

現 scope 集計は original/note、asset/sourceNote/bound draft、reference job/note から現在所有を導く部分がある。所有変更だけで適切に追従する分と、note/job が消えた後も保持すべき負債を分ける必要がある。特に asset/media の `coalesce(n.owner_workspace_id,d.workspace_id)` は、WS→個人で現 note の workspace が null になると旧 draft.workspace へ fallback し得る。reference の同様の fallback も、明示的な個人所有と「note 不存在」を区別する必要がある。これは将来 move 接続の source 上の懸念であり、実 DB の誤集計を測定した主張ではない。

`ScopeCapacityRepository` に無制限の物理 object 配列を返させず、provenance を使った集計/集合更新を adapter に閉じる `NoteResourceTransferRepository` 相当を提案する。内側は typed source/dest、所有世代、集計差分、適用成否を扱う。これを current policy と同 UoW で呼ぶ。所有行 ID が note/job の履歴 pruning より長く必要な場合は、最小の charge/provenance を別に残す。本文や資格情報を回収のために長期保持しない。

### 旧 writer の時系列

1. bound upload/reference writer が所有行 ID と generation g を取得し、既存 write ID/key を登録する。
2. move が同 UoW で所有を dest、generation g+1、note.version を次へ進める。未完予約と未回収負債を dest に残し、既存物理 key/claim は変えない。
3. 旧 writer の `registerKey`/publish と結果 commit は g 不一致で拒否する。actor が今も両 scope の editor でも旧試行を採用しない。move 往復で元 scope に戻っても generation 不一致を保つ。
4. 旧 writer の finally は write ID の終了を記録し、cleanup は所有行 ID から現在 charge を読む。古い accountId/workspaceId から解放先を推定しない。
5. writer 終了と実削除/不存在確認後に現在 charge を解放する。lease切れ、job cancelled、HTTP応答終了だけで writer 終了とみなさない。削除失敗中は charge/最小 tombstone を保持する。

既存 object operation の writer/key/delete claim を再利用し、generation をその境界と application の最終受理へ加える。conversion/reference は noteVersion による結果 guard が既にある一方、media upload は current edit が再び成立すると旧試行を採用できる構造なので、noteVersion だけで全 writer を保護したとは扱わない。新たに開始する正当な upload と旧 writer の finally を同じ owner ID の状態更新で混同しない。

OR-12 の conversion/regeneration 拒否以外に live I/O 一律拒否を加えない。旧参照/未保存媒体の試行が移動で失効し再試行が必要になる場合は警告へ含める。新 scope での再試行は現在の正当な依頼者による新 job/世代とし、旧 job actor を書き換えない。世代接続を成立させられない具体経路が判明した場合だけ、局所的な代替と影響を Manager に返す。

### Q3 の最後の保持と回収

例として companion 全量10、note固有実体/予約2を持つ N1/N2 が W1 にある場合、N1 を初めて W2 へ移す増分は W2 に12。W1 は N2 のため companion10を保持し、N1 固有2だけ減る。次に N2 を W2 へ移すと、companion は W2 に既にあるためその増分は0、W1 の最後の保持10が解除される。これは説明用の bytes 単位の模式値であり実測ではない。

各 scope の同 bundle 全量は一度だけ。移動による最後の元 scope 関係解除は、dest を含む別 scope が保持する限り物理削除を起こさない。全 scope の最後の関係を外す purge/WS削除との競合では、一意の cleanup 所有へ charge を残す。writer と未完受理の終了、既存一意 claim による実削除を確認して解放する。

現 query の note→reference_settings→bundle による `exists` 集計は再利用できるが、最後の元 scope 解除と最後の全 scope cleanup の区別、未bind受付 charge、共有 writer の終了先を表す専用契約は未接続である。bundle の uploader/受付 workspace を唯一の永久 owner にしない。元 uploader 退会や accountId 一致削除で残存 WS の素材を失わない。（design Q3、AC-09/WS-10 への共有依存）

## UI ownership と read の再接続

一覧の tag picker は leaf 内に表示できるが、mutation 所有は `ScopedNotesBoard` に置く案を推奨する。filter 中のタグ解除は note を一覧から外し、管理 merge/delete も集合を変えるため、leaf-owned rollback ではエラーが消える。親の `useOptimistic` で最大50の note tags と必要な表示集合を更新し、失敗時に戻す。未読込 note まで client で全件一致を推測せず、成功後は invalidate/page1へ rebasing する。現在適用 tag filter を解除した note の退出は親が処理する。

詳細は存続する親タグ領域が picker/optimistic/error を所有する。viewer は tag link のみ。tag click は detail DTO の current scope と tag ID から `/notes` 条件を作り、別 scope の旧 query/month/cursor を持ち込まない。共通 picker は表示/候補選択を共有し、policy を UI boolean へ移さない。readonly fallback を編集可能の根拠にしない。

move dialog は detail の存続 owner が preview/confirm/pending/error を持つ。成功後に現在 scope を取り直して context/navigation を更新し、失敗は元画面を保持する。移動完了前に完了 toast や新 scope の内容を表示しない。OR-12 の単一入口は詳細であり、一括移動 UI は P3e に残す。既存 editor の離脱 blocker/最新入力保全を通し、勝手に save/discard してから移動しない。

現 detail route は scope を含まない `/notes/$noteId`。OR-12 の「アプリ内 URL は新しい所属先の文脈へ変わる」への最小案は、detail の scope query を検証し、認可済み note.scope から canonical context URL を生成する方式。personal/WS の path 全再編は不要。URL は認可に使わず、旧 URL の要求者が current read を失った場合に新所属名や destination URL を漏らさない。query か path かの具体選択は Manager 判断に残す。

P3c の projection は現在 note/scope/tag を join する。既存 [0019 migration](../../packages/core/src/adapters/libsql/migrations/0019_huge_black_knight.sql) の `projection_control_version` は HTML/title 不変の version 更新で既存 projection の version を同 Tx に追従させる。move で全文を再解析する必要はないが、owner/tag の同 Tx 更新とこの追従を正式実装で接続する。既知変更後の page/candidate/calendar cursor は破棄し、旧 success/catch/finally を新 scope へ適用しない。

## 安全な実装順と Manager 判断

1. タグの更新日時/本文版方針と管理件数の意味を決める。既存 normalizer を使う VO、scope別 command/admin/picker read、UoW repository を追加する。P3c reader の意味は変えない。
2. attach/detach/create の current policy/一意性/50件、親 optimistic、detail tag link を接続する。単一 move や P3e をこの単位へ混ぜない。
3. rename/delete/merge/zero cleanup と確認 revision を接続する。relation が変わる move/purge、表示件数が変わる lifecycle との更新境界を明示する。
4. move の audience revision、最大50 tag mapping、provenance transfer、writer generation/finally/cleanup を共有 port に接続する。現在 scope 集計の WS→個人 fallback と最後 bundle charge を具体化する。
5. preview/confirm/UI context を接続し、OR-12 と Q2/Q3 に由来する正常/競合/拒否の観測を主担当と独立 Verifier の正式委譲で行う。実装前の案を合格根拠にしない。

Manager の採否が必要な具体化は次の一組である。既に採用済みの Q2/Q3、Unicode、public URL 保持、live I/O 一律拒否の非採用は再決議しない。

- タグは note.version/updatedAt/本文 revision を変えず、管理競合を tag revision に分離する推奨。代替は version 更新に伴う worker guard の再設計。
- 管理の削除影響は全関係、filter/picker 頻度は active と分ける推奨。0件 cleanup の有限 page 実行と、partial一致候補がある場合の明示新規作成を具体化する。
- 確認後競合は per-tag revision と独立 membership revision を推奨。scope catalog revision/既存 settingsVersion 流用との誤競合コストを比較する。容量の表示額変化を毎回再確認するか、増分不変かつ quota 内なら現在値で続行するかを決める。
- OR-12 のアプリ内文脈 URL を query で表す推奨。note ID と将来の中立 public URL/token は維持する。

OR-09 の500件選択/一括 job、P4 public/link/export、P5 Drive/LLM、退会/WS削除本体は作らない。公開済み移動は新しい公開操作ではないため、将来 handle/slug 不足を理由に拒否/自動非公開化しない。未決 SH-07 creator handle 世代と AC-03 Google の判断には立ち入らない。

## 未実行と返却

本書の観測条件、競合例、容量模式例は全て接続提案。製品操作・試験・測定・migration・性能/合否判定は未実行である。source 読取と主担当への port 状況照会、本書の作成/通読だけを行う。doc-style と markdown-style により、正本・観測事実・提案・未決を分離した。全文確認後、書込みを含む全操作を停止して Manager に返却する。
