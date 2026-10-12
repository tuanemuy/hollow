# P3d-2 単一移動の詳細接続案

## 範囲と結論

対象は OR-12 の単一 note 移動と、採用済み Q2/Q3 の所有・容量・旧 writer 収束である。本文、物理 key、公開 identity、creator/uploader、本文版を変更しない。P3d-1 のタグ command/trigger は未実装の依存、P3e の親子 move は後続の設計課題である。

正本は [brief](../brief.md)、[design の P3/Q2/Q3・P3d・P3e](../design.md)、[OR-12](../../spec/scenario/organize.md)、[既存接続案](P3d-contract.md)。既存案の未採用表記より現在の design を優先する。本書の列名・port 名・holding receipt は提案であり、製品への採用・実装・合格を意味しない。

有限な確認値は、note/version/所有世代、両 scope の表示名と membership revision、最大50 tag 対応、note 固有資源の条件 revision、最大1 bundle の source/dest 保持条件に分ける。全 object/member 配列、使用量の固定 snapshot、新 token、確認期限は作らない。移管条件が同じで現在上限内なら、無関係な使用量の変化だけで確認をやり直さない。

## 現コードの接続根拠

| 現 path / 責務 | 接続に必要な差分 |
| --- | --- |
| `domain/note/ports/noteRepository.ts`、`adapters/libsql/repositories/noteRepository.ts` | 通常 save は owner を更新しない。専用 transfer command で owner/version の条件付き更新を行う |
| `domain/workspace/ports/workspaceRepository.ts`、`adapters/libsql/workspaceSchema.ts` | 現在 role/list/member と settingsVersion はある。独立 membership revision と両 scope の差分 page は未接続 |
| `adapters/libsql/repositories/scopeCapacityRepository.ts` | `scopeCapacityQuery` は原本・asset・予約・reference object・icon・companion を集計する。asset/media/reference の workspace `coalesce` は個人の null と note 不在を区別しない |
| `adapters/libsql/referenceSchema.ts` | `reference_settings.note_id` は PK、bundle は note ごと0または1。companion は bundle に複数存在するが、移動確認へ個別配列を返す必要はない |
| `application/asset/uploads.ts`、`asset/access.ts`、`repositories/assetRepository.ts` | bound draft は現在 note 認可と作者限定を併用する。媒体受付/最終受理に所有世代はない。`bindDraft` は現在 noteId だけを更新する |
| `domain/purge/ports/purgeRepository.ts`、`repositories/objectOperationRepository.ts` | `WriteOwner` は kind/id。begin/register/canPublish は現在 owner state/lifecycle を検査するが取得所有世代は持たない。endWrite は writer ID の終了である |
| `adapters/node/coordinatedObjectStorage.ts`、`objectStorage.ts` | DI を跨ぐ root 別 writer/key 排他、publish 前の DB guard、一意 remove claim がある。stream 中に DB UoW を保持しない |
| `application/reference/processJob.ts`、`repositories/referenceRepository.ts` | 参照予約は実行時 note scope と旧 job actor を持つ。saveObject は終了 state/job を拒否するが、実行中の旧 row による scope/bytes 上書きには移動世代を追加する必要がある |
| `repositories/purgeRepository.ts` | note provenance、全 pin、bound upload、reference object、最後の companion を捕捉する。最後の関係・未完受付・writer が収束するまで finish を拒否する。移動後 charge の接続先が必要 |
| `migrations/0019_huge_black_knight.sql` | `projection_control_version` は HTML/title 不変の version 更新を同 Tx で追従する。移動で再解析/新 FTS 意味を追加しない |

表中の省略 path は `packages/core/src/` 起点。これらは読取で確認した現構造であり、移動 race の実測ではない。

## 確認値と内向き port

次の型は意味を示す擬似型。ID、revision、bytes は境界で既存 ID 制約・非負安全整数を検証し、revision の上限超過は rollback する。比較値は認可能力ではない。

```ts
type Scope =
  | { kind: 'personal'; accountId: AccountId }
  | { kind: 'workspace'; workspaceId: WorkspaceId };
type AudienceStamp =
  | { scope: PersonalScope; label: string }
  | { scope: WorkspaceScope; name: string; membershipRevision: Revision };
type TagIdentity = { id: TagId; key: string; name: TagName };
type TagMapping = {
  source: TagIdentity;
  destination: { kind: 'existing'; tag: TagIdentity } | { kind: 'removed' };
};
type HoldingStamp = { kind: 'absent' } | {
  kind: 'present';
  revision: Revision;
  noteHolds: Count;
  admissionHolds: Count;
  cleanupHolds: Count;
};
type TransferConditions = {
  ownerId: ResourceOwnerId;
  ownershipGeneration: Revision;
  resourceRevision: Revision;
  unique: FixedResourceTotals;
  bundle: null | {
    id: BundleId;
    contentRevision: Revision;
    bytes: Bytes;
    source: HoldingStamp;
    destination: HoldingStamp;
  };
  sourceRelease: Bytes;
  destinationIncrease: Bytes;
};
type MoveExpected = {
  noteId: NoteId;
  version: NoteVersion;
  source: AudienceStamp;
  destination: AudienceStamp;
  normalizationVersion: '16.0.0';
  tags: AtMost50<TagMapping>;
  transfer: TransferConditions;
};
```

`FixedResourceTotals` は original/asset/bound-media-reservation/reference-reservation-or-debt の固定種類別 count/bytes とする。current/held/grace は asset の内訳であり、同一 asset を複数加算しない。未知の種類を無制限 map に追加しない。物理 key・本文・全資源 ID を client に返さない。

`MovePreview` は `MoveExpected`、両 scope の現在 used/limit/after、閲覧者増減の各件数と最初の有限 page、失効する未完試行の種類別件数を返す。used/after は表示情報であり expected の一致対象にしない。最大1 bundle は現 schema の基数であって新しい業務制限ではない。

内側の候補は `NoteMoveRepository.inspect(noteId, destination, now)` / `apply(expected, destination, now)`、`MoveAudienceRepository.page(expectedAudience, direction, cursor, limit)`。現在 policy は application が同 UoW で確認し、repository が SQL の provenance/集計/条件付き集合更新を担当する。preview/confirm は既存 `UnitOfWorkProvider.run` を使い、SQL/driver 型を内側へ渡さない。read child への新 kind は今回必須とせず、採用済み P3d-1 の TagReadPort と混同しない。

## audience・タグ・現在 policy の照合

- 移動候補は本人 personal と現在 owner/editor の active WS。viewer を読取後の先頭50件から除くだけにせず、SQL の edit 条件と keyset page を使う。
- WS membership revision は実 join/role 変更/除名/脱退を同 Tx で進める。同値 role や既 member consume は進めない。settings/icon の OCC と分離する。INSERT/DELETE/実 role UPDATE の trigger を第一案とし、旧 joinedAt/人物を作り直さない。
- 閲覧者差分は両 scope の集合差で計算する。各 page は両 revision、scope ID/name、方向、最後の account ID に束縛し、同数入替を取り落とさない。表示できる現在属性だけを返し、後続 profile 属性は追加しない。現在表示ラベルが可変になる経路を追加する場合は、その変化も audience stamp の無効化へ接続する。
- confirm は current session/account、active note、両側 edit、変換/再生成の queued/running 拒否を再検査する。認可を失った場合は新しい所属・member 情報を返さない。
- tag は note の現在 source 関係を最大50件で読み、移動先の同じ Unicode key の現在 ID/name と exact 比較する。存在しなければ外す。移動先 tag を自動作成せず、元 tag が0件になっても削除しない。
- `tags.mutation_revision` は管理の影響集合確認用であり、move の同名対応確認へそのまま含めない。A の detach による使用数変化だけでは、B の同じ ID/key/name/付替え先は変わらない。rename/merge/delete/同名作成または B 自身の関係変更で実対応が変われば再確認する。P3d-1 の trigger は移動の relation DELETE/INSERT に自然に反応させ、管理側の古い確認は失効させる。

## 所有 anchor と条件 revision の最小 schema 案

`note_resource_owners` を note ごとの安定した所有 anchor とする案を推奨する。列は安定 ID、note ID、明示 Scope、ownershipGeneration、resourceRevision、存続/回収中の状態に限定する。bytes の第二正本を作らず、資源行の bytes を集計する。note 存続中は note.owner と同 Tx で一致させる。note/job 消去後も未回収がある場合だけ最小 anchor を残し、本文や actor 履歴を保持理由にしない。

bound draft と reference object は anchor の永続参照を持つ。original/sourceNote asset は note provenance、draft asset/media upload は bound draft から解決する。unbound draft は明示受付 Scope を使い、bind 時に anchor へ切り替える。draft.accountId、reference.accountId、batch.accountId は人物であり charge owner へ上書きしない。WS→他人である実行者の personal でも、この分離が必要である。

`resourceRevision` は移管集合の ID/bytes/charge 状態、bind、回収完了、関係/保持条件が実際に変わる場合に進める。旧物と新物が同じ bytes でも入替を検知する。無関係 note の upload、job heartbeat、表示 title 以外の無関係 metadata では進めない。note title 変更は既存 note.version が検知する。索引付き provenance 更新 trigger/adapter へ集約し、各 usecase の手動 increment に依存しない。時刻境界で予約の計上有無が変わる分は revision だけでなく確定時の `FixedResourceTotals` 再算出で検出する。

bundle は `bundle_scope_holdings` の `(bundleId, scopeKind, scopeId)` ごとに明示保持・受付・回収の理由と revision を持つ案とする。note 関係は `reference_settings`、受付は batch/upload、回収は既存 claim/provenance から同 Tx で維持する。物理 bytes の正本は companion_sources。bundle contentRevision は companion の実組/bytes 変更で進める。0保持 row は bundle 存続中に revision をリセットしないための最小 tombstone とし、charge は理由の有無から判定する。全操作履歴や全 quota revision は作らない。

未作成 holding は `absent`、作成後0保持は `present` と区別する。preview のために row を作らず、初回保持の同 Tx で作成する。0保持へ戻っても `absent` に戻さないため、同額/同数の往復を検知できる。holding 集計と元 relation の変更は一つの Tx に置き、未生成の兄弟予約を移動した note の保持理由へ付け替えない。

初期 migration は既存 provenance から anchor/holding を backfill し、旧全列・scope charge の一致を確認する予定。初期 revision は過去操作数ではない。新規 bind/受付/完了/cleanup を同じ所有境界へ接続してから move を有効にする。P3d-1 の1列＋triggerを変更する案ではなく、P3d-2 の追加 schema と共有資源責務の採否判断である。

## 移管と回収の分類

| 対象 | 移管条件・課算 | 保持するもの |
| --- | --- | --- |
| original | `original.noteId` の現在 anchor に追従。一実体一回 | ID/key/bytes/upload人物/job結果 |
| current/held/grace asset | sourceNote または同 note bound draft の provenance と全 pin を照合。asset 一意 ID で課算 | 全20版/pin、state、猶予時刻。deleting を ready に戻さない |
| bound staging/媒体予約 | draft の作者ではなく bound anchor に移す。accepted reservation と asset を二重課算しない | 作者限定 draft 読取、expiresAt、upload/write ID |
| reference reservation/未採用実体/回収負債 | job がある間の note join と、消去後も残る anchor 参照を一致させる | actor/job履歴、実 key、現在 claim。旧 row の scope 上書きを拒否 |
| companion | 移動先が初保持なら全量1回追加。元 scope に別 note/受付が残れば維持 | 同 bundle の兄弟と実ファイル。off/失敗の恒久関係も保持 |
| 未bind draft・未生成 import・兄弟・WS icon | 今回の note 集合に含めない | 元の受付/保持 scope と bytes |

元 scope の最後の note を移しても別 scope が保持すれば元の論理 charge だけ解除する。全 scope の最後の保持が消える purge では一つの cleanup 所有へ charge を残す。旧 writer・受理の収束と実 remove 成功まで無料にしない。cleanup failure、lease 切れ、最初の不存在だけで解放しない。

現 query の修正は `CASE WHEN n.id IS NOT NULL THEN n.owner_workspace_id ELSE ... END` と account 側の対を最低条件にする。新 anchor 接続後は typed owner を正本にし、null を不存在の代理にしない。全 scope sum と物理 disk sum が常に等しいとはしない。

## writer 世代と確定順

1. 受付/試行開始で owner anchor ID と ownershipGeneration を固定する。bound 化した既存未bind試行は bind の同 Tx で所有文脈を確定し、以後の move に追従する charge と旧 publish 権限を分離する。
2. move は現在条件・quota を確認し、同 UoW で owner、note.version、anchor generation、tag 関係、bundle holding を更新する。本文 commit は通さない。旧媒体試行は再受付できない終端へ、旧参照結果は取得世代で不可逆に拒否する。active writer フラグを move で落とさない。
3. beginWrite/registerKey/canPublish と結果採用の両境界が取得世代を照合する。note.version だけでは draft upload を覆えない。旧 reference saveObject の全 row upsert は owner 情報を再書込せず、期待世代・state付きの限定更新にする。
4. finally は write ID を終了する。失敗後の回収完了更新は所有行 ID と現在 claim/token で行い、旧 captured Scope や actor から解放先を決めない。新しい正当な試行は別 ID/新世代とし、旧 finally に reset されない。
5. key 排他・一意 remove claim・確認済み dead process 回復を維持する。stream の待機を UoW 内へ入れない。既知 live I/O を理由に一律 move 拒否しない。

未bindで開始してから正当な bind が起きる媒体試行は、bind だけを move と同一視して一律失効させない。移動時には、その時点で bound になっている upload ID も indexed 集合更新で終端化する。これにより note anchor 取得前に始まった writer も現在 state guard で拒否できる。bind と move の順序は同 UoW の現在 scope 再照合で決め、旧 anchor 世代を後から新世代へ書き換えて publish 権限を復活させない。詳細な列配置と通常 bind 継続の実証は正式実装の未測定事項である。

物理 publish の注意点が一つある。現 `FileObjectStorage` は DB の beforePublish 完了後に filesystem link を行うため、確認と link の間に move が入る隙間は残る。結果採用の世代拒否と late key の回収なら、その実体を本文へ採用せず容量を保持できるが、「move 後に旧 link 自体が絶対に作られない」とは証明できない。

物理 publish 自体も線形化する場合の最小候補は、既存 root 共有 resource に anchor 単位の短い admission gate を追加する。publish は gate 内で DB 世代再確認→link、move は同 gate を UoW 開始前に取り同 Tx 確定まで保持する。stream 全体は gate 外、link は UoW 外、取得順は ownership gate→DB とし、DB を持った gate 待ちを禁止する。新 process/監視基盤ではないが application の外側に実行 port が必要になるため Manager 判断に残す。現 beforePublish だけで解消済みとはしない。

## P3e の自己進行と外部変更

以下は単一 move の比較表現を後続へ利用できるかの比較であり、親 job/receipt 永続化は今回実装しない。

### 案1: holding revision の確定 receipt 連鎖（推奨候補）

bundle X=10B を W1 の A/B が保持し、W2 は未保持とする。各 note 固有2B。確認時は W1 の noteHolds2/rev10、W2 の noteHolds0/rev4、contentRev3。単一 A の差分は W1−2/W2＋12。A 成功後、B の差分は W1−12/W2＋2になる。

親 P の確定 child receipt は、操作 ID、対象 note の before/after owner generation、X の source/destination holding の before/after revision と理由別 count、contentRev、移管差分だけを持つ。成功 UoW 内の結果だけを正本とし、client の「A成功」通知では進めない。B の期待条件は、確認時の holding から P の A receipt が exact before に連結し、その after が現在値に一致する場合だけ進められる。B 自身の note/tag対応/resourceRevision/current policy は再検査する。

外部 C が A 前に W2 を保持して解除した場合、W2 は count0でも rev6となる。A の期待 rev4 に一致せず拒否する。A 後に C が同数入替/往復した場合、A receipt の after から現在 revision への未説明の進行があり、B は再確認になる。別親 Q の receipt は P の連鎖へ使わない。全期間の監査ログは不要で、当該親が確認した holding と当該親の未完処理に必要な確定 receipt だけを扱う。

同時に P の子を確定する場合も DB の順序に沿った before/after 鎖を用いる。receipt の欠落・prune・鎖切れは任意最新受理へ置き換えず、残りの再確認へ戻す。移動先の無関係 upload で usage が増えても holding は不変なので、現在 quota 内なら継続できる。A の tag detach で管理 revision が増えるだけでは B の mapping を変えない。

### 案2: 親が確認した対象集合から残りの期待 holding を毎回再算出

確認対象 A/B と成功 child の owner 結果から、残り B の増分を SQL で再計算する。追加 receipt の before/after は減らせるが、counts/成功 ID だけでは外部 C の同数/ABAを判別できない。結局 holding revision と「どの変化が P 由来か」の証明が必要で、単純な現在集計では不十分である。専用 external epoch を加える案は全 writer に parent 由来分類を持ち込み、単一 move の必要範囲より広い。本案は第一候補にしない。

案1でも body/key や全 companion ID の履歴は不要。現 holding row の monotonic revision を reset しないこと、receipt を同 Tx で記録すること、receipt の保持と再確認への遷移を P3e で決めることが依存となる。P3e の新しい履歴寿命・全件上限はここで採用しない。

## UI・既存条件への影響と見込み

詳細の存続 owner が移動先 page/preview/confirm/pending/error を持ち、現在 editor の未保存離脱 guard を通す。自動 save/discard はしない。成功後に現在認可を読み直し workspace query を canonical 化して invalidate する。再確認は確認済み範囲だけを置換し、失敗/応答不明を移動済みと表示しない。最新 scope を読めなくなった場合は新所属名を漏らさない。P3e の一覧選択や親ジョブ UI は追加しない。

予定の影響枝は、P3d-1 の tag trigger/確認、P3a の現在 scope/capacity/media 認可、P3b-1 の membership 更新、P2a/P2b の受付・参照結果・回収、P2c/C1 の control version/旧保存拒否、P2d-2 の charge/companion 回収、P3c の現在 scope/tag read と cursor 無効化、P1-E の detail 文脈である。これは実編集前の候補であり、各 ID の再open は正式実装の具体 path/責務で Manager が確定する。物理 codec/FD/PM/20版方式の全面再設計はしない。

実装順は、P3d-1受入→所有 anchor/holding と旧 charge 同値移行→membership/preview→move 同 Tx と writer/cleanup→詳細 UI と新隔離環境の競合対。単一移動の初回候補は正式開始から4〜6時間を暫定見込みとする。大きい provenance の SQL 時間、writer gate の成立、移行の同値性は未測定であり、正式開始後の小対で更新する。新しい時間/容量/件数の合否 gate は置かない。

Manager 判断点は二つに絞る。第一は note 所有 anchor・局所 resource revision・bundle scope holding の schema/port。第二は物理 link の線形化までを短い ownership gate で実現するか、結果採用拒否と late key 回収の保証範囲を明確化するか。P3e receipt は将来比較案として留保する。P3d-1/P3c の意味変更は不要で、共有 writer/charge の追加接続を必要とする。

## 未実行と停止

本書は固定 source の read-only 接続提案である。許可された source/設計/skill のテキスト読取と本書の apply_patch だけを行った。doc-style/markdown-style により採用済み規則、現 source の事実、提案、未測定を分けた。指定文書の全文確認後、文書を含む全操作を停止して Manager へ返す。

## 採用前補足: 所有 anchor と publish 保証の縮小

本節を前節の追加表・物理線形化の提案より優先する。新 `note_resource_owners` table と物理 link の ownership gate は必須としない。第一候補を既存 notes の追加列と論理公開/結果採用の世代 guard に縮小する。bundle scope holding の0保持 revision は独立して必要な提案として残す。

### 既存 notes を anchor として使う

現製品の `notes DELETE` は `LibsqlPurgeRepository.finish` にある。finish は capture を再実行し、未完 purge object または `hasWriters(noteId)` があれば戻る。最後の bundle に未完受付/unsealed がある場合、同 note 由来 asset に別 note pin がある場合も完了しない。その後 archiveJobs、reference/settings、original、asset、upload/draft、対象 reference object/companion、note を一つの Tx で削除する。

`hasWriters` は bound media upload、note の reference/conversion、関連 bundle の reference 利用、original key に対応する import writer を追う。`readyToDelete` と `completeObject` も writer と既存 claim/token を照合する。`ReferenceRepository.pruneJobs` は reserved/written object、active reference writer、purging note がある job を削除しない。したがって「通常の正当経路で note 固有の未回収負債だけが残り、notes が先に消える」経路は、読取した現コードから確認できない。

| 比較 | 既存 notes + 追加列（優先） | 新 note_resource_owners table |
| --- | --- | --- |
| 現在所有の正本 | 既存 owner_account_id/owner_workspace_id。重複しない | note.owner との重複を同 Tx で維持する必要がある |
| 世代/集合変化 | notes に ownershipGeneration/resourceRevision を追加 | 別 row に同じ列を追加する |
| finally/回収中 | 資源行→draft/job/sourceNote→存続 noteId で現在 scope を読む | anchor ID を各資源へ追加接続する |
| note 消去後の固有負債 | 現 purge の完了順では不要。完了前は note を保持する | 現時点で存続必須の到達根拠なし |
| 後続 WS/退会削除 | 最後の回収まで保持する現責務との整合を別途確認する | 将来の必要性だけを理由に今導入しない |

`TransferConditions.ownerId` は専用 row ID ではなく `noteId` へ置き換える。original/sourceNote asset、bound draft/media upload、reference job/object の現在 scope を存続 note から取得する。reference object の job join も、未回収なら prune されない現条件を保持する。明示 personal と note 不在の CASE 分離は必要であり、人物欄を変更しない。

move は notes の owner/version/ownershipGeneration を同 Tx 更新し、resourceRevision を該当 provenance の実変化で進める。writer には取得 noteId/ownershipGeneration を記録し、最終 metadata 更新にも期待世代を渡す。新しい資源 anchor table や全資源 FK の付替えをこのためだけに追加しない。正当な未bind→bindは既存文脈を保持し、move がその時点の bound upload を終端化する案は維持する。

この縮小は「note を永久保持する」提案ではない。既存 purge が実回収を確定した時点で notes を消す。将来、未回収のまま note を消す別仕様を採用する場合だけ、その正確な経路に最小 tombstone/anchor を検討する。今回、その仕様は追加しない。

`bundle_scope_holdings` は別責務である。別 scope が bundle を保持している間に、元 scope の最後の note が移動/消去されることは正当である。元 scope の0保持 revision を残す理由は note 固有負債ではなく、holding の absent→保持→0保持の ABA と P3e receipt 連鎖を検出するためである。bytes の正本は companion、note/受付/cleanup の保持理由は元 provenance と同 Tx で一致させる。0保持だけなら charge は0であり、cleanup理由が残るときだけ課算を残す。

### late link と現在 readable metadata を分ける

現 `FileObjectStorage.write` は、新しい `.part-UUID` を `flags: 'wx'` で作り、全 stream 終了後に beforePublish を呼び、`link(staging, target)` する。target を truncate/replace しない。既存 target への link は失敗し、現 ready asset の bytes を上書きする経路ではない。SVG の remove→再put は当該新規試行の未採用 key に対する処理であり、reference の asset row は全処理後の最終 Tx まで作られない。

`CoordinatedObjectStorage.put/putBounded` は raw I/O 前に write ID/key を登録する。key 別排他と active writer を残したまま処理し、`withOwner` の finally で endWrite する。媒体は upload ID の `_source/_safe`、reference は永続予約 object ID を key とする。部分ファイルも登録 base key の `.part-` として既存 remove の対象になる。move で key/予約/active writer を削除しなければ、guard 後に生じた late link は未追跡の key にならない。

`mediaHttp.node.ts` は `getAsset` の現在認可と asset row から storageKey を得る。draft/history/current の経路も、asset state/provenance/pin を検査する。raw storage key の link ができただけで readable asset row や current本文参照を作る経路ではない。媒体 upload の asset insert と accepted 遷移は最終 UoW、reference の asset/entry/本文更新も最終 UoW にある。

ただし現 media 最終受理は current edit と upload state だけであり、未実装の move をそのまま加えれば、再び edit できる旧試行を受理し得る。この不足は move の同 Tx 旧 upload 終端化と、最終受理の期待 noteId/ownershipGeneration 検査で閉じる。reference は既存 note.version/job/lease guard を維持し、予約更新/saveObject の取得世代と現在 scope の限定更新を追加する。新 scope で current edit を再取得した事実だけで旧試行を復活させない。

| move と保存の順 | 保証する結果 |
| --- | --- |
| metadata の最終受理が先に commit | その asset/予約差分は現在 provenance として move が再計算する。preview 条件が変われば再確認する |
| move が register/publish guard より先 | 旧世代/state を拒否する。stream を開始しない、または未採用 staging を既存 finally で回収する |
| guard→move→late link→最終受理 | link 自体は生じ得るが、最終世代/state guard が readable metadata/本文採用を拒否する。予約・key・charge を残して回収する |
| move 後に旧 scope へ往復 | note.version/ownershipGeneration は戻らず、旧試行を採用しない |

媒体 failure の `_source/_safe` remove、reference finally の未採用 object remove、定期 GC、purge の claim/writer 待ちを再利用する。失敗・crash・旧 I/O 継続中は行/charge を保持し、終了が確定した試行の実 remove 後に現在 note scope の課算を解放する。単なる job 終端や先行 ENOENT を回収完了へ置き換えない。移動先の新しい試行は別 ID/key とし、旧 finally が新 metadata を削除しない。

OR-12 は old link 自体の絶対不存在を求めない。上記の論理公開/採用拒否と未採用 late key 回収を実装・検証する案を推奨し、物理 link を線形化する新 ownership gate は導入しない。既存 key 排他、世代 guard、現在認可、実 remove、容量保持を弱めない。現コードだけで移動対応が完成したという主張ではなく、正式実装で必要な最終 guard と現在 charge 接続を限定する結論である。

### 未測定と返却

今回の追加確認は source の到達順・条件の読取だけである。note を先に消す具体経路、late link による ready metadata 生成や既存 bytes 上書きを、採用する世代 guard の外側で必ず起こす経路は確認していない。予定の小対は guard直後→move→late link、move→戻す ABA、cleanup failure→現在scope回収、note purge待ち、reference prune待ちであり、まだ実行していない。

第一候補は notes 追加列＋既存 noteId provenance、局所 bundle holding revision、最終世代拒否＋既存回収である。P3e の同parent receipt 連鎖はこの縮小と両立する。追加表や新 gate の必須主張を取り下げ、指定文書の全文確認後に全操作を停止する。

### cleanup まで消さない provenance

現在の優先案は本補足の notes anchor と論理採用拒否である。本文前半の新 anchor table/物理 link gate は未採用の比較案として残す。

- draft asset は `asset.draftId→media_drafts.noteId→notes`、source asset は `asset.sourceNoteId→notes` を回収完了まで維持する。current/held pin を解除しても所有 provenance を消さない。grace/deleting の asset がある draft を先に削除しない。
- bound media reservation は `media_uploads.draftId→media_drafts.noteId` を保持する。失効/期限/失敗で noteId を null に戻したり、別 note へ再bindして旧 writer の回収先を変えたりしない。正当な初回 bind と move は同 Tx の現在関係で順序付ける。未bindは別受付scopeのままで、note由来と推測しない。
- reference object は `jobId→reference_jobs.noteId→notes` を保持する。reserved/written または active writer がある間は現 prune 除外を維持し、job履歴整理のために先に job を消さない。cleaned/committed の区別を旧 row の upsert で戻さない。
- 移動はこれらの ID/参照を付け替えず、notes の現在 owner を更新する。finally/cleanup は当該永続関係から現在 owner を解決する。まだ負債があるのに参照先が不在なら、旧 actor/受付WSへの fallback で無料化や別scope解放をせず不整合として拒否する。
- purge の `capture→writer/対象/最後bundle確認→実回収確定→子行とnotesの同Tx削除` の順を維持する。bundle の最後の note 関係を先に外す経路には、その同 Tx で holding の cleanup 理由を残す。これを note 固有負債の先行 notes DELETE の許可へ拡張しない。

上記の読取根拠と補足を通読し、指定文書以外を変更せず、文書を含む全操作を停止して返却する。
