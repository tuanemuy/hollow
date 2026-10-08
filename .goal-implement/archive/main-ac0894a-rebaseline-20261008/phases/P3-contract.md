# P3 接続契約案

2026-09-10、P2d-3独立検証中のread-only提案。15:23:48 JSTに途中の実時計を確認した。P3の実装・試験・方式採用を示さない。Q1は採用済み、Q2/Q3と以下の型・port名はManager判断用の候補である。

## 入力と範囲

[brief](../brief.md)、[design](../design.md)、[P3独立準備全文と容量補足](../reviews/P3-prep.md)、[WS-01〜10](../../spec/scenario/workspace.md)、[OR-01〜12](../../spec/scenario/organize.md)、[IM共通前提](../../spec/scenario/import.md)、[AC-09/10](../../spec/scenario/account.md)、[SH-05/07](../../spec/scenario/sharing.md)を照合した。既存P2dのlifecycle・回収とC1〜C3の保存契約を再利用する。

P3ではmembershipと所有scopeを先に接続し、個人/WSの整理・移動へ進む。WS公開、公開状態の一括変更、download/Drive、退会は後続の実機能と接続して合否を取る。設定値やportだけを作ってWS-08/09、OR-09、AC-09/10全体を合格にしない。P2d-3の候補を受入済みとも扱わない。

## 現コードとの具体的な差

| 接続点 | 現在の事実 | P3で必要な変更 |
| --- | --- | --- |
| `domain/note/entity.ts` / `hollowSchema.ts` | `NoteOwner`はpersonal/workspace union、DBも排他的なowner列を持つ。作成はpersonal固定、creator項目はない | 所有scopeを作成者と分離。workspace実体/現在membershipを導入し、既存個人noteを保全する |
| `application/note/getNote.ts` | `requirePersonalNote`は本人所有＋active、trash用は本人所有のみ | 通常read/edit、trash操作、WS管理を目的別policyに分ける。単なるowner条件の削除にしない |
| `application/asset/access.ts` / `commitNote.ts` | viewerと`asset.accountId`の一致、personal owner、draft本人に依存 | current note権限＋exact ref/pin/provenanceへ接続。容量所有者をviewerと比較しない。未保存draftは実行者限定を維持 |
| import/asset/reference entity・repository | original、asset、reservation、reference object、companionの`accountId`で容量集計。job/batchの同名fieldは本人履歴にも使う | 容量scopeを追加し、人物の実行者fieldを書き換えない。既存の状態別予約/実体計数を共通scope窓口から利用する |
| `saveNote.ts` / `commitNote.ts` | current個人認可、最新2人actor、同値save、独立revisionNo、20版pinを共通commitで処理 | 認可だけをscope化し、人間actorは現在session本人を維持。移動を本文編集や新WYS変換に偽装しない |
| `noteRepository.ts` | `listPersonal`は全本文配列。初回displayの終端回収もpersonal account join | scope付きmetadata keyset検索へ。初回display回収・各workerの現在権限をWSにも接続する |
| `purgeRepository.ts` | note由来のoriginal/draft/asset/referenceと最後bundle関係から対象を捕捉。actor本人snapshotは90日、実削除後に行を解放 | scope削除の認可/対象fenceを追加し、共通object claimは維持。uploader一致でWSの残存objectを選別・削除しない |
| `domain/account/entity.ts` | verified/unverifiedのみ。退会状態・creator匿名化は未実装 | P3のresource ownerを生きたAccount FKに依存させない。退会処理本体は後続へ残す |

workspace/tagのdomainと専用routeはまだない。現行の個人向け前提は将来接続箇所であり、P2d-3の新しい不具合という評価ではない。

## 共通の型・認可・保存境界

### 所有者と利用者

- `StorageScope = PersonalScope | WorkspaceScope`をnote ownerとquota ownerの共通識別子にする。`createdBy`、`uploadedBy`、`requestedBy`、revisionのhuman actorは人物であり、scope移動で変更しない。
- `Workspace`には存続状態、設定、creator、membershipのowner/editor/viewerを持たせる。WS作成20件は「作成したWS」の上限であり、参加数上限へ流用しない。
- domainの純粋policyは現在note lifecycle、現在scope状態、現在membership、操作を入力にする。applicationが同UoW内で読んだ事実を渡す。clientのscope/role/creator、昔のmembership、sidecarは権限の証拠にしない。
- `requireNoteRead`、`requireNoteEdit`、`requireTrashAction`、`requireWorkspaceOwner`を目的別にする。personal本人・WS各roleの許可を明示し、viewerの保存/タグ/移動/削除はUIを隠すだけでなくserverで拒否する。
- 新規note、import batch、unbound media draftも受付scopeを確定する。WS編集権限が途中で失効した新規uploadは、旧scope文字列だけでnote化しない。すでに受理した別の兄弟noteを巻き戻さない。

Q1は確定している。除名/脱退が失効させるのはmembership由来のprivate閲覧・編集である。将来のpublic/link policyは独立した現在条件で評価し、former-member blacklistを作らない。ただしprivate asset endpointを公開入口へ変更するわけではない。public/link本文・asset配信とURL存続の実証はP4で行う。

### 全読取・非同期結果

一覧、検索候補/抜粋/件数、detail、preview、current/history/bound-draft media、原本attachment、参照台帳、保存/復元/styleを同じ現在policyへ接続する。履歴pinはcurrent閲覧権限を作らず、note履歴の正確な所属とpinも必要である。未保存stagingは現在編集可能なnoteにbindされていてもdraft作成者限定とし、WS全員の未保存uploadを公開しない。

conversion/referenceのactorは元の依頼者を保持する。claimと結果commitで現在編集権限・active scope/note・noteVersion・generation・leaseを確認する。除名/降格、移動、WS削除の前に始めた結果を、ownerが残っているという理由で採用しない。hard失効は通常取消の「現在処理の結果を残す」と区別し、不要objectは既存write ownership/cleanupへ渡す。影響対象を絞るbounded sweep/outboxで失効を収束させ、通知到達だけを防御にしない。

job履歴は依頼者本人限定のまま。WS ownerへ全員の90日履歴を公開しない。note-readable参照台帳はnoteの現在read policy、job本文へのリンクやretryは現在対象認可を追加する。削除済み最小snapshotとraw本文/CSSの保持を混同しない。

### C1〜C3と移動

`commitNote`を複製しない。他の人間actorによるbase以後の更新にはexact-currentの確認を求め、確認後再進行なら再確認する。同owner/同actor後勝ちの既存条件を保持する。失効時は最新HTML/mode/origin hint/downloadを保持し、古いhostを保存済みと表示しない。

scope移動は専用commandで最新noteの所有・タグ関係・容量を変更し、stale workerを防ぐためnote.versionを進める。本文/title/display、createdAt/updatedAt、20版/current pin、revisionNo、saved originは保持する案とする。移動自体を本文版や人間の本文変更履歴へ数えない。WYSのcapturedVersionは保持revisionの記録versionであり、移動後headとの一致を新たに要求しない。旧tabも現在の移動先権限があれば通常の保存規則へ、なければ回収可能な拒否へ進む。

## Q2: 移動先上限と容量移転

### 要件と推奨

IMは個人5 GB/WS20 GBを別scope上限とし、OR-12は両側の現在編集権限と変換/再生成中の移動拒否を定める。移動先満杯の扱いは原文未指定である。

推奨は「移動で増える移動先の使用量＋既存予約が上限を超える場合、移動全体を拒否」。原文に追加する具体化として採用判断を求める。確認UIへ移動先、増分、容量不足理由を出し、拒否で所有/タグ/charge/jobを半端に変更しない。既存個人5 GiBとの互換を維持し、WSを20×1024³ bytesとする案も、GB表示と実bytesを明記して採用を求める。

### 移転する集合

| DB由来の集合 | 推奨する容量/保持の扱い |
| --- | --- |
| note原本、現在/保持20版のasset | 移動先へ同UoW移転。同じassetをpin数だけ重複計上しない。URL/ID/物理keyは変えない |
| 同noteのsource provenanceまたはbound draftに属する未参照猶予asset | 同noteへ再添付可能なので移転。未参照時刻や7日を更新しない。既にdeletingなら回収所有を維持し、readyへ戻さない |
| 同note bound staging、未完了media予約、reference予約/未採用object | 予約・cleanup負債も移転し、無料の穴を作らない。新scopeで解放まで数える。確定前後のwriter条件は下記 |
| 未bind draft、まだnoteがないimport予約、兄弟note/兄弟upload | 移転しない。元の受付scopeに残す。後から同bundleだっただけで移動先へ受理しない |
| companion/bundle | Q3のscope別関係差分。現在img refだけで選ばず、off/失敗も含む永続bundle関係を使う |

`ScopeCapacityRepository`はUoWの既存容量所有行へ接続する窓口であり、actor accountIdを書き換えて計数を合わせる実装にしない。`planNoteTransfer(noteId, source, destination)`相当でDB provenanceから追加/解除chargeを算出し、同transactionで両側権限・対象version・最終容量を確認して移転する。全asset本文配列をJSへ返す必要はない。quota集計は表示キャッシュと分け、競合uploadも同じ予約窓口へ入る。

### 実行中I/Oとの接続案

容量所有をwriterが記憶したactorから推定しない。所有行のscope/ownership generationをDB正本にし、publish・finally・cleanupは所有行IDを介して現在のchargeへ接続する。移動前のwrite attemptは新generationとしてpublishできない。noteに紐付いた予約は容量を移転したまま保持し、旧writerの終了と実削除を確認して新scopeから解放する。moveはstorage I/Oの完了をUoW内で待たない。

そのため、変換/再生成中は原文どおり拒否し、その他の未保存upload/参照取得は移動による旧試行の失効・再試行が起き得ることを確認UIで明示する案とする。参照onの後続再scheduleは新scopeの現在編集可能な依頼者で新世代として行い、旧actorのjobを別人の実行履歴へ書き換えない。新取得と旧cleanup予約が一時的に共存して容量が不足する場合は、既存成功を失わず再試行案内にする。

これは採用前のQ2詳細である。実装時に所有行の世代を全publishへ一貫して接続できなければ、live writeがある間だけ移動を理由付き拒否する局所代替をManagerへ返す。単にlease切れやjob cancelledをwriter終了とみなさない。

### 代替と利害

- 上限超でも移動を許し、以後uploadだけ拒否する案は移動の自由度が高い。一方、scopeを往復して上限以上を恒常保持でき、使用量表示が上限を超える仕様が必要になる。
- 移動時に全履歴/猶予/予約を元scopeへ残す案は移転が小さいが、元利用者の退会と残存WS媒体が結び付いたままになる。noteの完全な移動としては推奨しない。
- live writeがある間の移動拒否は単純だが、OR-12に書かれていない追加の一時拒否である。黙って確定要件にしない。

## Q3: 跨scope companionと回収容量

### 推奨する論理charge

物理objectは既存の一意key/claim/容量所有行を一つ保持する。これと別に、正当なnote→bundle関係がある各scopeへcompanion全bytesを一度ずつ計上する案を推奨する。同scope内のnote数・保持版数では重複計上しない。取得off/失敗から将来再利用できるbundle全体を数え、現在使用中の画像だけを計数しない。

このとき全scopeの表示使用量合計は物理disk bytesを上回り得る。「scopeが保持する容量」であって全体disk実測値ではないことを表示/契約へ明記する。materialized assetとその原companionは別実体なので従来どおり両方を数える。

`BundleScopeHolding`相当の型付き関係をnoteの現在scopeから作り、`(bundle, scope)`の最初の関係追加でcharge、最後の関係除去で解除候補にする。関係やchargeは認可能力ではない。任意bundle IDやsource markerで別scopeの素材を読めないよう、具体noteの永続bundle所属＋現在read/editを必要とする。

### 移動・削除・退会

- 同scopeに他noteが残る移動では元scopeのcompanion chargeは残る。移動先に初めて同bundleが入ると全量を追加し、すでに関係があれば増分0。Q2の容量判定と同UoWで扱う。
- 最後の元scope関係を外しても別scopeが正当に保持する間は実削除しない。元scopeの論理chargeだけ解除し、残scopeの全量chargeは保持する。これは物理削除による容量解放とは区別する。
- 全scopeの最後の関係を外すときは、最後のchargeをcleanup状態のscopeへ残す。未完了受理/共有writerが収束し、一意claimによる実削除または不存在確認後にだけ解放する。削除失敗でも無料の孤立objectを作らない。
- 同時に複数scopeが削除される場合も同UoWで最後の保持/cleanup所有を一意に確定する。deleted workspace/accountの最小resource-owner tombstoneは回収終了まで残せるが、本文・退会者の資格情報・90日を超えるjob詳細をそのために保存しない。
- WSのnote/原本/asset/companionは元uploaderの退会で消さない。uploader/creator参照の退会済み表示と、存続WSへのcharge/実体保持は別である。個人note削除が必要でも共通provenance/最後関係判定を通し、`accountId`一致のobject全削除をしない。

代替の「最初のuploaderだけへ全量課金」は他scopeが無料になり、退会時の移管先選定が必要。「scope数で按分」は関係追加/削除のたびに他scopeのchargeが変わり、他人の操作で突然上限を超える。物理copyは単純な所有になるがI/O・一時二重容量・失敗回復が増える。全量scope計上が最小の予測可能な案である。ただし原文未指定の論理chargeなのでManager採用後に期待値を固定する。

## WSと整理機能の最小接続順

以下は縦スライス候補であり、planの受入ID追加ではない。Q2/Q3は移動実装前に確定し、quota ownerの型は最初から導入する。

1. **WS作成・切替＋private note縦スライス。** workspace/membership、scope URL validation、owner作成、一覧/detail/new/importのscope確定を接続。原本/current/history/stagingとC1別actor、失効時退避まで、実際のowner/editor/viewer/非memberで対を取る。既存個人は不変。
2. **招待・役割・退出・設定。** owner管理、最後owner invariantを同UoWで守る。招待はtoken hash/期限/一回消費、14日、取消/再送、本人確認後の参加。別メール参加は原文の確認付き正常対。同メールsignup検証は招待用の限定確認として既存authへ接続し、未決Google自動linkを解決したことにしない。local mailboxのみを実機能根拠とし、実メール到達は別。招待rateの数値は詳細実装時に根拠付き提案する。
3. **scope一覧・検索・カレンダー。** metadata keyset、title/htmltext検索と抜粋、URL/端末復帰、sort、createdAt＋利用者TZ月。日本語部分一致と英語word prefixはSQL/検索adapterの契約として対を取り、曖昧な全文LIKE一つで両方を合格にしない。query長/候補件数/timeoutはboundedに詳細化し、本文全配列をclientへ流さない。
4. **scopeタグと単一移動＋使用量。** 正規化したscopeタグ、50文字/50タグ、rename/merge/delete。移動先既存同名タグへだけ対応、他は解除。Q2/Q3、元/先認可、現在/保持版媒体、worker失効とquotaを同じ小noteで端から端まで検証する。AC-10の必要なscope別量/80%超/上限/更新時刻表示を接続し、設定全体の未完は分ける。
5. **OR-09の選択と実装済み操作。** filter結果全体の明示選択、最大500、filter変更で解除、対象別権限/部分失敗。タグ・移動・trashを先に実接続。P2d-3のprepared集合/親子結果/read・watchの考え方は再利用できるが、不可逆purgeのtarget型を可逆操作に流用しない。既fenceと通常取消の違い、actorとscopeを明示したtyped batch portを使う。公開/download/Driveは各後続へ残す。
6. **WS削除と全失効。** 名前確認→workspaceを不可逆状態へfence→membership新規操作停止→全note/trash対象をDBで固定→既存purge/claimに接続。active noteもWS削除対象であり、trash専用commandを偽のUI操作で連打しない。shared companionの別scope保持、遅いwrite、失敗再訪、snapshot本人限定を確認。public/link閉鎖とbackup取消はP4/P5側の最終接続まで未完欄へ。

型の候補は`WorkspaceRepository`、`MembershipRepository`、`InvitationRepository`、`ScopedNoteQuery`、`TagRepository`、`ScopeCapacityRepository`。immutable DTOとpurpose-specific commandで境界を分け、万能なowner bypassやclient発行の許可ticketは作らない。外部mail/storage I/OはUoW外、イベントは既存outbox/decode登録とboot+sweepに接続する。

移行では既存のpersonal ownerと容量所有行からpersonal scopeをbackfillし、body/version/日時/display/版/pin/物理keyは変更しない。creatorは既存の作成経路と記録で裏付けられるものだけを移す。job actorや直近編集者から過去の作者を推測しない。追加schemaのclone比較ではscope chargeの新旧合計も照合し、companionを既存行と新関係の両方で二重計上しない。新規uploadの経路をscope化する前に容量窓口を揃える。

## 本体接続時の狭い合否対

- WS A/B owner・C editor・D viewer・X非memberで同noteを読取/編集。C除名後の旧API/原本/current/history/draft/preview拒否、Bは保持。Cの最新入力download、他actor確認後の再更新で再確認。
- 最後ownerの同時降格/退出、20作成、14日招待、別メール確認、cancel/resend/二重consumeを隔離DB/clockで実証。UIは実招待→認証復帰→参加までlocal mailboxで行う。
- 同語/同名タグが別scopeへ漏れず、scope切替で検索/月/タグを解除。sort/月TZ/英語prefix/Japanese/本文未生成/空/timeout/続き読込を対にする。
- 小original＋current/history/grace/staging/予約を持つnoteの個人→W1→W2→個人。容量一致/超過/同時upload、移動前後失効、保持revisionのWYS origin、同じasset ID、拒否時全関係不変を照合する。
- shared bundleをW1/W2/個人に保持し、off/失敗noteも残す。片scope移動/削除では他を保持し、最後の実削除失敗中charge保持→回復後解放。元uploaderを削除する実操作はAC-09正式委譲まで行わず、P3は型/削除計画の安全対として区別する。
- 選択500/501、未読込対象、部分失敗、旧応答/失効、取消後再訪、keyboard/390pxを確認。P2d emptyの総件数へ500を持ち込まない。

大量20 GB fixtureや新しいstand-alone storage方式gateは不要。移転集合・残chargeは小objectと正規port/隔離DBで境界化し、実UIは代表操作と正確なusage表示を取る。runtime・migration・全旧データ保全は正式実装時の別作業である。

## 再open候補と残条件

| 実変更 | 狭く再確認する先行条件 |
| --- | --- |
| scope現在policy・別actor・作成/移動 | P1-B/C/D、C1-A/C/D/E/F、C2-D/E、C3-C/D/E/F。保存正当accept/新規stable/退避をmembership変更で落とさない |
| current/history/draft/originalとscope quota | P2a-B/D/F、P2b-A/B/C、C1-Bの認可/保持接続。codec、safe-fetch実接続方式、20版数そのものは変更しない |
| display回収/参照workerの現在権限 | P2b-C/D、P2a-B/F。初回pendingを勝手に再判定せず、旧結果を採用しない |
| scope trash/purge/companion/actor結果 | P2d-1〜3の該当read/begin/収束/履歴。現P2d-3は独立review中であり、未確定合格を借用しない |
| schema/DI/route/query/outbox | P1-D/E、P2a-E。旧全列/pin/objectと起動/drain、通知decoder、parent optimistic/pending/errorを検証 |

Manager判断はQ2/Q3の2点に限定する。Q1は再決議不要。公開/linkとWS非公開の独立性、WS削除による全URL停止、退会とDriveの後続実接続は未完として残す。上限値や招待rate、検索方式の細部をこの文書で無断確定しない。

15:28:00 JSTの実時計確認後に本文を通読し、移行の保全境界を追記した。goal-implementの限定委譲とmarkdown-styleに沿って、本書のみ作成した。source/spec/designは読み取りだけ。製品・依存・test・helper・DB・browser・production・process・git・hash・固定tempへの操作は行っていない。外部資料取得や外部送信も行っていない。全提案/試験対は未実装・未検証であり、文書提出後は停止する。

## 補足: 最初のP3a縦スライス

2026-09-10T15:30:56+09:00の実時計確認からの限定文書補足。ManagerがQ2/Q3、個人5×1024³/WS20×1024³ bytes、移動versionのみの更新を採用した。前節の未採用表記は初稿の記録であり、現在の採用範囲はdesignを正本とする。live I/O一律拒否は採用されていない。以下のP3a分割・運用値は新たな提案で、製品変更はしていない。

### 推奨する到達点

本人がWSを作り、個人/WSを切り替え、WSに新規note・媒体のみnote・同梱参照付きimportを作成し、再訪・編集・原本/履歴媒体閲覧・trash/restoreまで行える状態を最初の候補にする。容量は最初からscope単位、role policyは最初からowner/editor/viewerを表現する。

招待/参加/role変更/除名/脱退の実UIはP3bへ分けることを推奨する。これらをP3aへ加えると、14日期限・認証復帰・メール一致/不一致・最後owner・送信再試行まで一つの候補へ入る。現在のauth/serverFn/workerとscope quotaの変更だけでも広いため、小さく確実にはならない。owner membershipはWS作成と同UoWで必ず作る。P3aに招待用の仮token発行や認可例外を置かない。

WS-01の「作成直後の招待導線」はP3bまで未完欄に残す。未実装ボタンを成功する招待として出さず、作成結果はWSができたことだけを示す。P3aだけでWS-01全体やR07全体を完了にしない。P3bではその場から実招待へ接続して初めて当該導線を受け入れる。

### 候補の完了条件と実装単位

| 単位 | P3aで利用者が達成する結果 | 最小の実装・検証境界 |
| --- | --- | --- |
| 作成/切替 | 名前/説明/任意slugで非公開WS作成→自分owner→WS一覧へ。現在scopeを常時表示しURL/reload/再訪へ保持 | WS/creator/membership schema、作成のUoW、slug一意/予約語・20件、親pending/error。複数role管理UIは含めない |
| 基本一覧 | 個人と各参加WSのnoteが混ざらず、更新日時降順の一覧と続きを読める。無効/削除scopeは理由＋個人へ回復 | scope付きmetadata keyset、同日時id tie-break、現在認可、ページscope/generation。最初は既存tile相当。全文検索/タグ/月/カレンダー/任意sortは後続 |
| 所有/新規/編集 | 現WSに白紙・媒体のみnoteを作成、同ID保存/再読込、既存HTML/visual/WYSで編集できる | note/draftの受付scopeを固定し、最新保存/退避mode/request ownershipは再利用。detailはnoteからscopeを導出し、URLのscope指定を認可にしない |
| 取込/容量 | 現WSへ通常原本と同梱素材を取り込み、参照on/off、job結果、原本/媒体が同WSで利用できる。個人とWSで容量を別表示 | 全予約/受理/変換後bytes/参照取得が共通capacity portを通る。actor本人履歴とscope所有を分離。既存parser/外部取得方式は変えない |
| 現在policy/保持 | ownerのread/edit/trash/restoreが成功し、viewer/非memberの禁止操作がserverで拒否される。trashで本文版・容量は減らない | current/history/draft/original、save/style/restore、conversion/reference、初回display sweepのguard。複数roleは隔離DBの本物UoW/HTTP相当契約で確認し、実UI多actorは未接続と明記 |
| 保全/引渡し | 個人の全既存note/版/pin/objectと容量が保たれ、WS追加後も通常起動・操作できる | online backup→clone migration→新旧列/合計/FK比較→同source build/start→owner実UI→明示製品commit/独立handoff |

P3aのtrashはscope別の一覧/直後undo/期限内restoreを含む。すでに利用可能な単一purge・期限回収・empty/read/watchにpersonal owner前提を残して、WSでは受付後に永久失敗する状態にはしない。必要なscope認可・quota/actor接続と少数正常対はP3aに含め、新しい回収方式やWS全体削除UIは含めない。これは新規WS noteを既存lifecycleへ接続する条件であり、P2d方式の全面再設計ではない。

期限回収はsession不要の既存条件を守る。内部回収の権限は現在の期限/lifecycle/fenceから得るので、WSのcreatorや「最初のowner」を実行者として偽造しない。利用者が依頼したpurge/emptyの履歴はrequestedBy本人に残す。system由来回収のscope/provenanceと本人向け履歴の区別はtyped initiatorで表現する候補とし、既存P2dの表示/物理intentを分離した形に接続する。必要差分がこの範囲を超えれば実装前に返す。

### scope・容量の最初の接続

1. personal/workspace scope、現在membership policy、capacity ownerと人物actorの型を導入する。新規受付にはscopeを明示する。既存note/draft/batchでは保存済み受付scopeを正本にし、表示中scopeの後変更で投入先を変えない。
2. import・media・referenceの既存集計を`ScopeCapacityRepository`相当へ集約する。単なる共通functionでactorIdを渡す形ではなく、original/asset/予約/cleanup負債のscopeを同UoWで照会する。個人5 GiBとWS20 GiBの予約判定、実安全化後bytes再評価、削除失敗中のchargeを同じ窓口で扱う。
3. 既存行は現在のaccount所有からpersonal scopeへbackfillする。job/batchの実行者fieldは保持する。新しいscope chargeと旧account合算の両方をquotaへ足さない。元から未参照猶予/failed cleanup状態の行も落とさず、新旧合計を照合する。
4. bundle受付scopeと保持scope関係を導入する。まだnoteがない受付中は予約/素材のchargeを受付scopeへ保持し、最初のnote→bundle関係成立で二重加算しない。sealed/全失敗/companion-only拒否でも実回収まで容量を残す。同scopeに同bundleを使う複数noteがあっても素材全量は1回、素材からできたassetは別に数える。
5. Q3の複数scope関係は型/集計/最後関係の隔離DB対で確認する。P3aではscope移動UIを作らず、任意client bundle IDで新たな関係を作れるAPIも作らない。実際の跨scope移動・Q2の一括移転/旧writer世代失効は後の移動スライスで完成させる。P3aの初期ownership generationは将来接続用であり、移動race成功を先取りしない。

新規draftの回収・予約はcreator本人と受付scopeの現在編集認可の両方を確認する。bound stagingの他人非公開、確定済みassetの現在ref、history正確pin、save限定再添付を保つ。WSの別editorがreadyな同note媒体を保存できることと、元draft作者でない者が未保存媒体を読めることを同じ許可にしない。

### 作者の移行型

`NoteCreator = { kind: "account"; accountId } | { kind: "unknown" }`を候補にする。退会済みは確認できたaccountが後で退会した状態の表示であり、unknownを「退会済み」に偽装しない。P3以後の新規/importは確定した実行者を記録する。

旧noteは作成記録で確認できる場合だけaccountへ移す。現在owner、最新revision actor、original uploaderのどれかを無条件にcreatorとみなすbackfillはしない。記録不足はunknownとして「作成者不明」を表示し、権限はowner scopeから決める。既存全列を保全したまま新しいnullable creator参照＋由来状態へ接続でき、過去の人物関係を捏造しない。未知作者がいても移行やnote閲覧を失敗にしない。

### P3aで必要な運用値の候補

下記は原文の追加運用値で、未採用。既存の形式上限・800 KiB・容量の採用値は変更しない。

| 項目 | 候補 | 理由・採用範囲 |
| --- | --- | --- |
| WS名/説明 | 前後trim、名前1〜100 Unicode code point、説明0〜2,000 code point | 空名拒否は原文。追加上限はDTO/一覧/入力の有限化。勝手な切詰めはしない |
| slug | 空はnull。非空3〜63 ASCII、英小文字/数字/内部hyphen、前後は英数字。入力時小文字化を表示 | 公開に備えるが公開機能は未接続。任意slugと公開時必須を分ける。短い既存有効slugがないことは正式実装時の移行確認事項 |
| slug予約語 | `admin/api/auth/settings/new/edit/trash/notes/workspaces/assets/static/help`を初期明示集合、今後の実routeと照合 | 安易な全文部分一致禁止。非空slugのDB一意制約＋競合同時作成拒否、候補表示の応答世代も確認 |
| 作成上限20の集計 | 現存するcreator本人のWS数を同UoWで数える候補 | 参加数や他owner数ではない。削除済みを永久累積する制限は追加しない。原文で存続/累積が明記されていないためManagerへ確認 |
| scope/基本note page | 1page50、server hard max50、metadata DTOのみ | 続きはkeyset。参加数を20へ制限せずscope chooserにも続きを持たせる。cursorはscope＋sortに束縛し異scopeへ再利用不可 |
| slug availability | debounce300ms、最新1要求だけ採用。問い合わせは本人毎分60回を候補 | 保存の一意制約を代替しない。timeout時に空きと断言しない。ネットワーク失敗は名前/説明を保持 |
| 招待上限/rate（P3b用） | 1回10件、WS毎rolling24h100送信、実行者毎hour20送信を候補 | 再送も送信として数える。14日期限は要件値。P3aでは実装せず、P3bでUI/誤拒否/atomic集計の対を確認して確定 |

名前/slugで既存文字列を無言変更しない。transportは型・bytes等DoS境界、VOは業務値を検査する。quota表示はGiBと実bytes、usage/limit/予約を含む旨・最終更新時刻を明示し、80%超警告を同scopeへ出す。AC-10全設定ページは後続でも、P3aの作成/import/media画面で保存先と容量を取り違えない表示は完了条件にする。

### 代表回帰と未接続の線引き

- 本人owner実UI: 個人→新WS→空note非作成→title autosave＋追記→同ID保存、媒体のみ同asset保存/失敗reload、HTML＋companionをimport、原本/current/history閲覧、trash/undo/reload/restore。keyboard/390pxと失敗rollbackを確認する。
- 隔離DB/本物application: owner/editor/viewer/非member、同UoW中のrole失効、worker開始後失効、他actor exact-current確認、scope quota一致/超過、同bundle複数note、元uploaderと保持WSの分離。test-only認可例外で通さない。実招待/role UI経由の別actor操作はP3b未確認として残す。
- 個人回帰: scope省略時personal、旧URL/backup・現在asset/原本の正常取得、旧note列/版/pin/charge/object保持、旧job actor/private履歴、通常GC/purgeの容量解放、起動/drain。scope cookie/local設定を失っただけで新規noteを他WSへ保存しない。
- 一覧はscope＋更新順＋cursorだけ先に合格とする。全文検索/タグAND/月/三表示/任意sort、移動、500選択、WS削除、public/link、招待/role設定、退会はこの候補に含めない。

### 現実的な所要時間と影響範囲

正式実装開始から最初の候補まで**3〜4.5時間**を見込む。これは独立受入時間を含まない。主な区切りは、型/schemaと共通capacity・個人backfillのcloneまで45〜60分、全read/save/job/lifecycleのscope接続と隔離DB対まで追加60〜90分、owner UI/媒体・import/移行/最終checks・保全まで追加60〜90分。起動/全suiteの環境待ちや未知の所有行接続があれば、15分報告で根拠と残りへ更新する。

招待/role管理UIを同時に含める代替は、認証復帰・招待の異常対を含めてさらに90〜120分を見込む。先に全部のrole UIを作ることによるcore差分削減は小さいため、P3b分離を推奨する。UI補助を使う場合もscope DTO確定後のshell/routeに限定し、環境所有とVerifier枠を維持する。

P3aの再open候補はP1-B/C/D/E（scope作成保存・描画認可・移行/起動）、P2a-B/D/E/F（取込先/容量/actor job）、P2b-A/B/C/D（媒体/参照/初回displayの現在policy）、C1-A/B/C/D/E/F（別actor/履歴asset/保存保持）、C2-D/EとC3-C/D/E/F（mode/失効回収/退避）、P2d-1〜3のscope read/begin/期限/履歴/容量接続である。広いIDでも再検証条件は変更箇所だけに限定し、codec・safe-fetch方式・20版数・PM入力方式の無変更根拠は維持する。

P3aの実装はまだ始めていない。追加の書込は本補足だけで、製品/DB/helper/環境/hash/gitは無操作。goal-implement/manager-loopに従い、正式委譲で確定する完成条件と、この未採用候補を区別したまま停止する。
