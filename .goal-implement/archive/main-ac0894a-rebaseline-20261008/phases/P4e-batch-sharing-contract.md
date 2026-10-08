# 一括公開範囲変更の接続案

2026-09-26、Asia/Tokyo。P4e の正式委譲に向けた source 読取準備。採用判断の正本は [design.md の一括公開範囲変更](../design.md#一括公開範囲変更の接続判断) と [brief.md](../brief.md)。本報告は製品実装・正式フェーズ開始・独立受入を意味しない。製品・管理正本・依存・環境・DB・鍵・既存証跡・test/build/git・外部サービスは操作していない。

## 正式委譲向け要約

新しい Manager 判断事項はない。同 visibility、子確認版への解除同意、空本文、設定後の選び直しは正本で採用済みであり、再決議しない。残る作業は既存 batch へ共有操作を接続する実装と検証である。P4d-3 の正式 30 条件の検証には参加していない。

- 固定 source・最大 500 ID・確認 50 件ずつ・501 超過検知・現在認可・親/子 attempt・同 UoW 結果・本人 90 日履歴を維持する
- 親は目標 visibility だけを保持する。解除同意は note ID / shareVersion に束縛し、新しい retry preview で取り直す。snapshot 比較と同意検証を分け、両方を同内容 digest に含める
- 同 visibility は現在認可・確認版・業務条件の確認後だけ変更不要の成功にする。shareVersion / grantEpoch / token を更新しない。単件 API の再適用の意味は維持する
- handle / slug 不足は public の全体開始を中止する。設定後は一覧で選び直し、新 preview と明示確認を行う。自動選択復元や専用継続 ticket は作らない
- 認可済みの空本文は public / link の子失敗として理由を残し、兄弟を続ける。private 化へ本文条件を加えず、非開示の権限外除外とも混同しない
- ACK 不明は同 ID・同 payload の明示再送とする。現 visibility から元要求の成功を推定しない

### 変更候補 path と再利用先

以下は読取時点の変更候補であり、専有 path の委譲や新しい受入 gate ではない。`core/` は `packages/core/src/`、`web/` は `apps/web/app/` を表す。

| 変更候補 | 現在の source と必要な接続 |
| --- | --- |
| `core/domain/batch/entity.ts`、`core/application/batch/ports.ts` | operation / expected は tag・trash・move のみ。sharing variant、確認 snapshot と解除同意、変更済み/変更不要を区別する成功結果を追加する。現在の成功 result は noteId / holdingSequence だけで、この区別を表現できない |
| `core/application/sharing/settings.ts`（必要なら同配下の Tx core 新規 file） | `checked` の現在権限・ShareExpected 比較、本文/public 前提、token / grant / identity / accessEpoch を共用する。session と自前 UoW を持つ `changeSharing` を worker から直接呼ばず、actorId + UoW の core を抽出する |
| `core/application/batch/usecases.ts` | `validateOperation` の全体前提、`previewOne` の明示 sharing branch、`compareConfirmation` と accept/retry の同意照合を接続する。`getBatch` は現在 result を返さないため、変更不要を本人子結果へ安全に投影する差分が必要 |
| `core/application/batch/worker.ts` | activePolicy / 固定 source / lease / 同 Tx finish を再利用し、共有 core と安全な共有失敗 code を追加する。変更不要も子成功として保存し、move holdingSequence は null のまま扱う |
| `core/adapters/libsql/repositories/batchRepository.ts` | 既存 operation / expected / result の JSON 保存と旧 move expected 補完を維持する。結果型や読取投影に必要な差分だけを扱う。`batchSchema.ts` と `migrations/0022_dashing_the_hand.sql` の読取では新列・新 table を必須にする制約はない。正式担当が最終 DTO と互換性を確定する |
| `web/presentation/batchInput.ts` | strict operation / expected / confirmation の新 variant。preview の最大 50、accept/retry の最大 500、重複拒否を維持する。既存 `batchServerFn.ts` の各入口を再利用でき、新 HTTP route は前提にしない |
| `web/components/batch/{BatchOperationPicker,BatchConfirmation,BatchHistory,BatchSelectionBar}.tsx`、同 `model.ts` | 操作選択、現在→目標 audience、公開/解除確認、空本文理由、変更不要の結果、retry、種別 label を接続する。bar の「公開変更は未提供」を実装成立後に更新し、Drive / download は未提供のまま残す |
| `web/components/batch/{BatchSelectionProvider,BatchDialog}.tsx`、同 `batch.css` | 既存選択寿命・同 ID unknown ACK・React pending・invalidate を再利用する。確認値の組立で子同意を落とさず、拡張経路の旧応答/focus guard と狭幅表示を接続する。新しい root provider や選択永続化は不要 |

単件設定画面・profile / WS settings・一覧検索・PDF / ZIP renderer・物理所有/回収基盤は作り直さない。設定案内は既存の権限に合う設定先を利用し、設定 route へ batch 自動復帰を追加しない。単件共有 core の抽出は P4a/P4c、共通 batch branch は P3e の回帰範囲になる。公開読取・検索・export の現在認可は共有状態変更の影響先であり、今回の準備で動作成立を主張しない。

### 実装担当へ残す詳細と見込み

実装順は型/strict 境界と Tx core、preview/受理/worker/子結果、確認 UI/履歴、既存回帰と実 UI の順が小さい。新基盤・外部依存・鍵設定・資源枠の追加は前提にしない。正確な工数は正式担当の DTO 差分確定後に見積もる。

成功 result の具体的な discriminant、preview の表示専用情報と永続同意の配置、旧成功 row の投影は実装詳細として残る。旧 tag/trash/move を sharing の変更不要へ読み替えず、現在値から過去の結果を補完しない。正本どおりの UI 表示と互換性が満たせる限り、これらは追加の利用者判断ではない。共有契約の変更が必要と判明した場合だけ Manager へ戻す。

根拠は OR-09、SH-01〜04/08、JB-01〜03、design の P3e と一括公開範囲変更、および上表の source 読取。テスト・型検査・DB・browser・HTTP・build は未実行で、製品の合否や schema 不要の実証はしていない。

## 結論

既存 P3e の固定選択、親受理、子 attempt、同 Tx 結果、本人履歴へ `sharing` 操作を追加するのが最小候補。別のジョブ基盤や全件 mutation Tx は不要。現在の単件 `changeSharing` は session と自前 UoW に包まれているため、そのまま worker から呼ばず、現在 actor を再認可する Tx 内 visibility core を抽出する必要がある。

親は目標 visibility だけを不変 intent として保存し、現在共有版・所有世代・閲覧範囲とパスワード解除同意は子の attempt に束縛する案を推奨する。親 operation に解除同意 boolean を固定すると、再試行時に新しく保護された子へ再同意できない、または過去の同意が将来の保護へ拡大する。

同 visibility は変更不要の成功、本文空は理由付き子失敗、設定往復は自動選択復元なしとして採用済み。以下の型・配置案は、その意味を実装へ接続する候補である。

## 原文・採用済み境界

| 根拠 | この操作が守る内容 |
| --- | --- |
| `spec/scenario/organize.md` OR-09 | 最大 500 件、権限別操作、権限外は対象外件数、公開前提不足は開始中止、部分失敗は兄弟継続、成功・失敗内訳、filter 変更で選択解除 |
| `spec/scenario/sharing.md` SH-01〜04/08 | 現在 editor の公開範囲変更、公開確認、所有 scope の handle/slug、本文空の公開拒否理由、保護解除同意、private 中のリンク非表示、再限定は同 token、再発行は別の明示操作、member 数は本人 member のみ |
| `spec/scenario/jobs.md` JB-01〜03 | 親 1 件と対象別子、本人履歴 90 日、同対象・同設定の失敗子だけ再試行、成功/取消済みは元操作をやり直す、通常取消は waiting 停止・running 結果保持 |
| `.goal-implement/design.md` P4-Q3（503 行付近） | 個人は現在所有者 handle、WS は現在 slug。全体前提不足は開始前に停止、開始後の対象変更は対象別結果 |
| 同 P3e 選択・受理（417〜445 行付近） | 固定 ID/順序、preview 50 件ずつ、全体選択は ID 501 件で超過検知、不可視 title/新所属非開示、reload/一覧離脱後の未送信選択自動復元なし |
| `.goal-implement/brief.md` 利用者 SH-07 決定（85 行付近）、design P4c | handle 変更は既存 note URL/token に不影響。creator 脱退・他人/WS 所有でも同じ。public identity は所有・creator と独立、再 public は同 canonical、public 離脱時の accessEpoch は旧取得認可を復活させない |

SH-01 の「利用者: 所有者」だけから WS editor を除かない。同原文の編集権限という事前条件、OR-09、採用 P4a-A/P4c-D と現在 `canScope(...,"edit")` は owner/editor を許す。WS slug 設定権限まで editor に拡大しない。WS ページが private でも slug があれば note 公開は可能で、ページ公開を新たな前提にしない。

## 現実装への最小接続

| 入口 / source | 再利用と必要差分 |
| --- | --- |
| `domain/batch/entity.ts`、`application/batch/ports.ts` | `BatchOperation` は tag/trash/move のみ。候補 `{kind:"sharing", visibility:"private"|"link"|"public"}` を追加。password 設定・任意解除・token 再発行を一括操作に加えない |
| `application/batch/usecases.ts` `validateOperation` | source の現在 edit を再利用。target public だけ現在 source の owner handle / active WS slug を確認。preview と accept、failed retry に同じ全体前提を適用する |
| 同 `previewOne` | active・固定 source・現在 edit の判定と対象外 DTO を再利用。共有版/本文版/所有世代/現在 membership 確認と、現在 visibility、保護有無、リンク有無、現在→目標 audience の安全な表示情報を取得する明示 branch が必要。現末尾の tag fallback に流さない |
| 同 accept / retry | 同 actor/request/digest の受理収束、全 target の再 preview 比較、固定順、最新 failed のみ、親 generation と retryDigest、outbox を再利用。同意を digest と永続 expected に含める。別 scope や新しい検索一致へ置き換えない |
| `application/sharing/settings.ts` | `checked` の ShareExpected 比較、現在本文/権限/public 前提、token 初発行、public identity と epoch 更新を共有する Tx 内 core を抽出。単件 wrapper は session 認可と DTO 再読込を保持。worker は session/cookie を保持せず actorId を使い、同 UoW の現在 verified actor / note edit を確認する |
| `application/batch/worker.ts` | activePolicy、固定 source 一致、claim/lease を維持し、visibility core と `batches.finish` を同 Tx にする。holdingSequence は null とし、成功 result には変更済み/変更不要の区別を追加する。SH 系の安全な失敗理由を現在 whitelist に追加し、秘密や生例外を履歴へ保存しない |
| `presentation/batchInput.ts` / `batchServerFn.ts` | strict operation/expected/confirmation schema の追加。既存 preview/accept/retry/get/watch を使える。共有生 token・URL・password/hash/envelope は DTO/confirmation/job に入れない |
| `components/batch/*` | picker/bar、preview と公開/解除確認、件数、history の種別ラベル・結果・retry 導線へ追加。既存 unknown receipt、選択 parent 所有、watch/ticker を再利用し、公開になったという現在値だけで元要求成功を推定しない |

`BatchExpected` の共有候補は `kind:"sharing"`、`share:ShareExpected`、表示・確認に必要な `visibility/hasPassword/hasLink` を持つ。`ShareExpected` 自体は noteId/shareVersion/noteVersion と scope の ownershipGeneration/workspaceId/membershipRevision/name/memberCount を保持する。現在の共有照合と同じ厳密さを維持し、本文更新・membership ABA・移動往復を「同じ目標だからよい」と緩和しない。

### 保存構造

`adapters/libsql/batchSchema.ts` と migration `0022_dashing_the_hand.sql` は operation/expected/result が JSON text、operation kind の SQL 列挙制約なし。候補は既存 JSON の新 variant と型/validator/decoder の追加で入り、物理列・新 table・migration は現時点で必須ではない。親 `operation` と子 `expected` は更新 trigger が不変にしている。親に後から同意を書き足す案はこの契約にも反する。

`note_sharing` の token 整合・public password null CHECK、`note_public_identities` の一意 identity と現在 public 連携は既存 core を通す。直接 batch SQL で visibility だけ書き換えない。既存 row の unknown variant を勝手に tag として読む互換処理を追加しない。旧 tag/trash/move、特に旧 move expected 補完の意味は変えない。

共有は holding 増減も成果物も作らない。move receipt、source bundle、容量予約、新しい物理 cleanup、PDF/ZIP の資源寿命を共用しない。新しい永続 receipt table は不要で、親受理と子成功 result が操作結果の正本となる。

## 確認と子実行の契約候補

### 1. 固定集合・権限・公開前提

既存通り、一つの固定 source に属する一意 ID/順序 1〜500 件を使う。「混在」は主にその source 内の visibility/password の混在であり、新たな multi-scope bulk を導入しない。対象外は現在読めない・非 active・別 source・編集不能な ID。タイトルや移動先を出さず「対象外 N / 実行 M」を示す。全件対象外なら親を作らない。

public 前提は creator の handle ではなく現在所有 source で確認する。個人 source なら owner の handle、WS なら slug。欠損は preview/accept/retry の全体停止と設定案内であり、対象をすべて failed として受理しない。WS editor には owner への設定依頼を示せるが、他人のプロフィール設定や WS owner 権限を代行させない。handle/slug の「存在」以外に初回公開専用の新要件や待機時間を加えない。

preview は 50 件ずつでも、accept は現在集合・版・前提をもう一度比較してから同 Tx で親/子を受理する。preview と accept の間に条件が変われば受理前の conflict。受理後に変われば子の現在確認で failure/cancelled とし、他の正当な子は続ける。

### 2. 公開確認・混在保護の解除同意

public 確認は「保存済み本文が誰でも閲覧でき、公開一覧・検索・検索エンジンの対象になる」を明示する。WS の非公開ページとは別であることも示す。実行 M 件のうちパスワード保護 P 件を列挙/件数表示し、その P 件の解除を明示確認する。private で準備済みの password も P に含め、現在 link の子だけに限定しない。

同意の候補は確認 request の各 ready item に追加する `passwordRemovalConsent: null | {noteId,shareVersion}`。受理側が現在 expected と照合し、target public かつ保護ありなら一致する同意を必須にする。保護なし/別 target への余分な同意は受け入れない。公開操作自体への最終確認とは別に検証する。UI は一つの明示確認で表示済み P 件分を作れるが、未知の将来の保護まで含む包括同意にはしない。

preview snapshot と利用者の同意は別値である。現在 `compareConfirmation` の JSON 比較に同意 boolean を混ぜて false→true を conflict にする実装は避ける。snapshot の厳密一致を先に検証し、その snapshot への同意を別に検証して、検証済み同意を子 expected の JSON へ保存する案。accept/retry digest は両方を含む。worker も shareVersion 一致後にのみ同意を適用する。

再試行は親 target を変更せず、新しい子 snapshot に対して改めて P 件を確認する。親の `confirmPasswordRemoval:false` を固定したり、初回 true だけを将来の別 password への同意とみなしたりしない。JB-02 の「同じ設定」は同じ目標 visibility を意味し、確認版と安全同意は取り直す。これは design の採用済み契約である。

### 3. identity / token / grant の維持

| 遷移 | 既存 core で保つ内容 |
| --- | --- |
| private → link | 未発行だけ初発行。既発行は同 token / linkGeneration。password を保持し、private 化以前の grant を復活させない |
| link/public → private | token/password を破棄・再発行せず URL を使えなくする。grantEpoch を進める。public からなら accessEpoch も進める |
| private/link → public | 必要な password 解除同意、password null、grantEpoch 更新。token は未発行だけ発行。初回 canonical identity 作成を共有変更と同 Tx、既存 identity は保持 |
| public → link | canonical の現在 public 読取は停止し accessEpoch 更新。token は保持、password を勝手に生成しない |
| 再 public / handle・slug・creator 変更 | 同 canonical。過去の public accessEpoch の export は復活させない。handle/slug 変更は token/URL 再発行理由にしない |

一括で SH-04 再発行を兼ねない。raw link の一括取得・コピー機能も今回の最小 slice に含めない。秘密 key がない場合、未発行 token の初発行が必要な子は安全に failed、既発行 token を触らない private 化まで無条件で禁止しない。既存 protector の閉じた動作をそのまま使い、job に鍵 material を保存しない。

### 4. 同 visibility は変更不要の成功

原文 SH-01 は「別のステータスを選ぶ」、現在単件 `SharingPanel` も同値ボタンを無効化する。一方 `changeSharing` の API は同値を受けると必ず shareVersion+1、private/public はさらに grantEpoch+1、link は version だけ進める。public→public では canonical/accessEpoch は変わらない。従って「現 domain は同値 no-op」とは言えない。

一括では現在 snapshot・認可・業務条件が一致する同値子を変更不要の成功とし、結果表示で変更済みと区別する。単件 API の再適用の意味は変えない。no-op は visibility 文字列だけの比較ではない。preview 後の password/token/grant/shareVersion 差は、目標 visibility が同じでも conflict/子 failure とし、元 mutation 成功や no-op 成功に変換しない。現在 private/link 内で password 有無が違う子は、それぞれの保護をそのまま保持し、同じ password 設定へ揃える intent は存在しない。public+password の不正 row は no-op で隠さない。既 public の handle/slug が後からなくなっていても、P4-Q3 の全体前提を no-op で迂回しない。

### 5. 空本文・現在変更・外部取消

SH-01 は本文空の公開拒否と理由表示を要求する。現 core は public だけでなく link でも空の保存済み HTML を `SHARE_BODY_REQUIRED` として拒否する。EX の「空本文は書き出し対象外」を共有へ流用しない。この既存 link 条件を本補助で変更しない。

認可された空本文は preview で理由付き表示し、権限外と同じ匿名 excluded にしない。public/link の対象別 failed として理由を残し、正当な兄弟を続ける。本文が用意された後は失敗子を新 preview で再試行する。全体を止める「全件本文完成」gate や private 化の本文条件は追加しない。

| race | 必要な既存 fence / 結果 |
| --- | --- |
| preview 後、受理前に本文・共有・member が変わる | accept の snapshot 再比較で conflict、古い解除同意を使わない |
| 受理後に同 source の本文・共有・membership 確認版が変わる | worker の Tx 内 core で子 failed、安全な理由、兄弟継続 |
| 他 scope へ移動、両方の edit はまだある | worker の `sameMoveScope(note.owner,header.source)` が false。元 source の intent を移動先へ追従させず子 failed |
| 移動して元へ戻る | ShareExpected.ownershipGeneration が異なるため拒否。同一 scope 名や現在権限だけで ABA を通さない |
| 現在 actor 無効・edit loss・trash/purging・削除 WS | 現在 activePolicy / canScope と既存 lifecycle cancel。外部取消は cancelled、失敗理由なし。再参加・復元で旧 attempt を復活させない |
| WS 削除前に移出済み | deletion repository の現在 note 所有判定は先移出を削除対象にしない。共有 attempt は fixed source と現在権限の確認で実行を拒否し、移出済み note の共有設定を巻き戻さない |
| commit 後 ACK 喪失 / claim 再配送 | 共有 mutation と子 finish が同 Tx。既存 claim token と終端判定で再 mutation を行わない |

`workspaceDeletionRepository` の source/destination 特別判定は move 用であり、sharing に架空 destination を入れない。通常の親取消は waiting のみ、既に running の共有変更が正常完了すれば結果を残す。完了した公開/非公開変更を「取消」で逆転させない。

## UI・設定復帰・ACK 不明

下部 bar は現在 owner/editor だけに範囲変更を出し、viewer の選択自体は保持する。確認では現在→目標 audience、private の意味（個人本人 / WS member 全員）、password/link 有無、公開 P 件の保護解除、保存済み本文対象を表示する。WS member 数は現在 member にだけ返す。選択 note の draft を保存/破棄せず、dirty のある別画面へ暗黙移動しない。

既存 `BatchSelectionProvider` は actor/actorEpoch/operation token により旧受理応答を拒否し、受理中/不明 receipt を未送信 selection と別に持つ。現在の不明時ボタンは read-only lookup ではなく、同 requestId・同 input の明示 accept 再送である。server は既受理なら元 receipt を返すが、未受理なら現在条件を満たして初めて受理する。これを「照会だけ」と誤説明しない。新 ID 自動再送や現在 visibility からの成功推定は不可。より純粋な request receipt lookup を足す案は任意差分で、最小案の必須 port にしない。

retry 不明も元 parent/generation/items/digest のまま確認し、別の confirmation に同じ retry request をすり替えない。ACK 不明の解消前に設定往復や新 selection で receipt を上書きしない。

### 設定後は一覧で選び直す

採用判断は public 前提不足で全体中止し、現在利用者の権限に合う設定を案内する。一覧離脱/reload で未送信 selection を復元せず、専用継続 ticket も作らない。設定後は一覧で選び直し、現在認可と新 preview、対象外・password・公開前提を確認して明示実行する。設定保存だけで公開を実行しない。SH-01 の単件設定復帰は変更しない。

新 dialog には actor+epoch+route/scope+mount+operation token の success/catch/finally/focus guard が必要。React transition の共有 pending だけで別 actor の busy を導かない。現 `BatchDialog` cleanup の `previous.isConnected` だけの focus 復帰、`BatchHistory` mutation finally の無条件 invalidate/busy 更新は、この経路を拡張する際に current context guard の接続対象。静的読取上の接続注意であり、実 UI 不具合を実証したとの主張ではない。Escape/取消/pending、390px、keyboard は正式実装時の実 UI 確認に残る。

## 再試行・90 日・結果の寿命

本人だけの既存 batch history をそのまま使う。最新 failed かつ期限内の子だけを同 source/target、現在 preview と新同意で再試行する。成功/取消子、削除・失効・別 source 子を retry へ混ぜない。親 active 中の多重 retry を拒否する。成功子は再変更せず、新 attempt は同 ordinal/retryOf と新 createdAt を持つ。親 createdAt と固定 intent は変わらない。

現 `batchRepository.page` は親 createdAt が 90 日内、または最新子が未終端/子 createdAt が 90 日内の場合を対象にする。子 title の消去・retry 判定は子 createdAt、親 prune は親 createdAt と未終端/新しい最新子/古い非最新 attempt の残存を確認する。`ownedBatch`/watch は updatedAt と未終端の条件も使う。従って既存 batch の実装を単純な「終端から一律 90 日」と呼ばない。今回、新 sharing だけの終端起点や親時計のリセットは提案しない。

共有子に成果物の期限はない。note 共有正本/public identity と本人 job 表示履歴は別寿命で、履歴 prune が共有設定や URL を解除しない。既存未終端 attempt と move receipt の保持も変えず、90 日を理由に進行中 job を消さない。

## 実変更で影響する採用条件と未成立

| 採用済み ID | この候補で直接影響する部分 |
| --- | --- |
| P3e-B/C | 操作 bar・確認・同内容受理、actor/context と既存の選択解除規則 |
| P3e-D/F/G | Tx 内共有 core の追加、worker dispatch、子結果原子性、current policy、partial failure/retry/本人履歴ラベル。既存 tag/trash/move の意味は変更対象ではないが、共通 branch の回帰範囲になる |
| P3e-H | 新 union / strict validator / JSON 永続互換。新 schema が不要なら migration 作成を形式的な作業にしない |
| P4a-A/B/C、P4c-D | 抽出する単件共有 core の現在認可/OCC、初発行・同 token・grant・public identity/password/accessEpoch 不変条件 |
| P4a-E、P4c-J | 新確認/unknown ACK/dirty/actor・focus 境界。単件 UI を編集しないなら既存全画面を改修対象にしない |
| P4c-A/C | 既存設定への案内先として再利用。profile/WS 保存機能・icon・slug 権限・単件設定復帰は変更対象にしない |

P4c-F/G/H/I の現在 public 読取・discovery/sitemap・export 失効は新一括 mutation の結果が正しく現れるかを見る関連動作であり、検索 query/rate/export 資源を作り直す依頼ではない。P4a-G/P3f の現在 WS/lifecycle fence は新入口が通る既存境界で、削除基盤の変更は提案しない。P3e-A の 500/501 選択、P3e-E の holding receipt は再利用であり、新 quota・並行数・TTL を追加しない。

正式担当へ残るのは新 kind の型/DTO/旧 row 互換、Tx core 抽出と結果投影の具体化であり、新しい Manager 判断事項はない。採用契約を確かめる対象は、strict 境界・旧 row 互換、初回 public/token/同 Tx rollback、混在保護と retry 再同意、変更不要の非更新、空本文の子失敗、move ABA/edit loss/WS 削除、commit 後 ACK 喪失、500 件の有限 preview/受理と UI の現在 context 保護。これは既存要件・採用リスクの接続先であり、新たな受入 gate や phase を採用しない。

本報告は source 上の接続可能性だけを示す。新 UI・worker・DB・HTTP・browser の実行確認は一切していない。PDF renderer や deployment の成否に依存しない後続準備であり、未実装機能を提供済みとは表示しない。製品実装は Manager の正式委譲後に行う。本補助は全文確認後、文書を含む全操作を停止する。
