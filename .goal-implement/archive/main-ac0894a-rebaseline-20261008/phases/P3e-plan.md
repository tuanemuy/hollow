# P3e 固定D2への接続案

## 範囲と結論

OR-09/JB、brief/designの採用P3e、`P3e-contract.md`全文とD2候補`9bc4f9a3ea7e8f2103b9056246f2691b7788d6b6`のsourceを読む設計準備である。製品freezeとVerifierの環境専有を維持する。選択・本人履歴・同設定retry等の既採用意味論は変更しない。

推奨は、親/固定target/attemptと最大500件のmove holding receiptを専用に持ち、単一commandのUoW内部処理を再利用する構成である。同parentの成功receiptで差し替えられるのは共有holdingと、そのholdingから計算する移管増減額だけ。B自身の条件を最新値で置き換えない。新しい資源正本・全操作監査・第二bytes台帳は作らない。

本書は採用依頼であり、実装・試験・500件性能・race成立の証明ではない。P3d-2独立結果で変更が生じた場合、その受入sourceへ再照合する。

## D2の実形と自己干渉

参照は`application/move/{ports,usecases}.ts`、`adapters/libsql/repositories/noteMoveRepository.ts`、新0021と0020 migrationである。

| 確認成分 | A成功によるBへの実source上の波及 | P3eで許す導出 |
| --- | --- | --- |
| Bのnote/version/ownershipGeneration | applyのUPDATEはAのIDだけ。Bは不変 | なし |
| BのresourceRevision/固定6種類count・bytes | 0021のresource triggerはoriginal/note-asset/draft/reference jobの帰属noteへ更新する。Aのmedia失敗化はAだけ。bundle holding更新からBへのresource triggerはない | なし。時刻による予約内訳変化も再inspectで一致必須 |
| Bのsource/destination ID/name/membershipRevision | A移動でWS/memberを変更しない | なし。改名/同数member入替は再確認 |
| Bのtag source/destination ID/key/name | Aのnote_tags解除/付替えで共通tagのmutation_revisionは進むが、tags行自体は削除/renameしない。D2 inspectは管理revisionを含めない | なし。Aのrelation減少だけではBを競合にしない。管理merge/delete/renameは実対応の変化として再確認 |
| bundle ID/contentRevision/bytes | A移動はreference_settings.bundle_idやcompanion_sourcesを変更しない。active_job_id解除はbundle変更trigger対象外。content_revisionはcompanion実変更で進む | 原値保持。自己receiptでもcontent更新を正当化しない |
| 同bundleのsource/destination holding | `holding_note_move`が全関係から理由countを再集計し、変化したholdingだけrevisionを進める。absent→present0/正数も区別する | 同parentのcommit済みbefore/after鎖だけ |
| sourceRelease/destinationIncrease | holdingと固有資源bytesからinspectが導出するため、Aの成功でBの値が変わる | 検証済みholdingを入力に同じ純粋式で再計算 |
| scope usedBytes | A、無関係note、cleanup等で変わり得る。D2 expectedには含めない | 確認固定しない。各子で現在quotaを計算し上限内を確認 |

これは合法なD2 provenanceを前提にしたコード上の分離である。自己childの非同期cleanupが後から起こしても、当該move commitに含まれない変化はreceiptで説明しない。想定外の共有帰属やtrigger波及はBの厳密比較で拒否し、検証時に確認する。

## 内向きportと単一commandの再利用

### command coreの抽出

現在の`moveNote`、`changeNoteTags`、`trashNote`はそれぞれ外側でUoWを開始する。そのままbatchから呼ぶと子変更とreceiptが別transactionになるため再利用しない。

各application moduleに、`HollowUnitOfWorkContext`と認可済みactor ID、clock/id/normalizerの必要portだけを受ける内部commandを抽出する。対話入口は従来どおり同UoWの`requireAccount`から呼ぶ。batch workerは永続actorの現在verified accountと現在scope/note権限を同UoWで確認して呼ぶ。cookie/sessionをjobへ保存せず、元session失効だけで継続jobを停止しない。これは既存empty-trash admissionと同じactor/current policy境界である。

- move core: current note/両scope edit、conversion不在、expected厳密比較、safe revision、現在quota、applyを一か所へ残す。JSON比較のための現canonical入力順も維持する。
- tag core: TagName/Unicode16、expectedScope、現在tag/read関係、50上限、ensure/attach/detachを一か所へ残す。管理rename/merge/deleteを一括タグcommandに混ぜない。明示createの同名収束と51個目rollbackを保持する。
- trash core: version・現在active/edit・処理取消確認、original/reference/display/lifecycleを同UoWで処理する。batchでは受理source scopeも外側で照合する。単一APIに新必須scopeを強制しない。

DB adapterへ認可・操作選択を移さない。UoWをnested runせず、driver型を内側へ露出しない。application catchでDB errorを成功へ読み替えない。

### 最小追加port案

| 配置案 | 責務 |
| --- | --- |
| `domain/batch/entity.ts` | 最大500一意IDとordinal、固定operation、attempt状態union、取消/成功/retryの不変条件 |
| `application/batch/ports.ts` | `BatchRepository`のaccept/read/claim/finish/cancel/retry/prune。UoW repositoryとして型付きheader/target/attemptを扱う |
| `application/batch/selection.ts` | `BatchSelectionReadPort.select(sessionHash, conditions)`。既存SearchExecutionPortの新typed kindへ接続 |
| `application/move/ports.ts`追加 | `bundleState(bundleId, source, destination)`。ID/contentRevision/bytes/2holdingだけを同UoWで返す。不存在も型で返す |
| `application/move/expected.ts`候補 | holdingからsourceRelease/destinationIncreaseを計算する純粋関数。inspectとbatchの導出を共用し、2つの算式を持たない |
| `application/batch/movePlan.ts` | 同parent receipt鎖の照合とholding限定導出。単一move coreの現在認可やquotaを省略するAPIは作らない |

`bundleState`が必要なのはapply後のsourceが変わるためである。apply後に元destinationで`inspect`を呼ぶとsource/destinationが同じになり、before/after receiptを正しく取れない。追加portは元sourceとdestinationを明示して読み、旧inspectの意味は変えない。

## 受理・schema・実行順

### 新migrationの4表案

旧0021以前は変更しない。履歴からnote/tag/bundleへ削除cascadeを掛けず、IDと最小結果は対象消失後も本人履歴に残す。現行資源の保持は既存provenanceだけが所有する。

| 表案 | 最小列・制約 |
| --- | --- |
| `note_batches` | id、actor_id、受理request_id/digest、operation/settings、固定source scope、created/updated、admission_generation、cancel_requested、last_move_sequence、固定選択/対象外/受理total。unique(actor, request_id) |
| `note_batch_targets` | parent_id/ordinal PK、note_id、受理時source、move時destination、latest_attempt_id、最小終端count。unique(parent,note_id)。titleは期限内表示用で権限証拠ではない |
| `note_batch_attempts` | id、parent/ordinal、retry_of、受付順generation、state、lease token/until、created/updated、確認expected、preview_base_sequence、固定enum failure、最小result。activeの同target二重作成禁止 |
| `note_batch_move_receipts` | parent/sequence PK、attempt_id unique、bundle_id、source/destination scope、before/after contentRevisionとbytes、before/after各2holding。成功attemptと同commit。親内bundle/sequence index |

headerに全HTML/全resource ID/全memberを入れない。expectedはD2の最大50tag・固定6種類・bundle最大1だけ。bytesは当時の条件比較用であり、quota計算/physical cleanupが参照する正本にはしない。receipt数は成功した固定target数以下、最大500である。failedの明示attempt履歴だけは増え得るため90日とbounded pruneで扱う。

current policy取消用indexはattemptのstate、target.note_id、actor＋source/destination scopeに置く。全batch走査や自由形式JSON全文検索を取消入口へ入れない。整数は既存safe整数に揃え、sequence/generationのoverflowをrollbackさせる。

### 初回previewとaccept

1. 表示済み選択またはwhole-filter readから得た明示順序IDを受ける。previewは最大50件のページごとに現在認可/対象外と操作固有expectedを返す。scope外のIDからtitleや新scopeを返さない。
2. クライアント親は最大500個の確認値を保持し、最後まで取得した固定ID集合と対象外/実行数を確認する。readページが変わっても選択を検索し直さない。新しい確認token/TTL・永続prepared jobは追加しない。
3. 共有bundleの同一scope holding/content状態がpreviewページ間で異なる場合、合算説明を作らず再確認へ戻す。別時点のpreviewを同snapshot全量確認と説明しない。
4. acceptはactor/request ID/正規化設定＋ID順序＋確認値digestの同内容だけ同親へ収束する。現在認可された受理対象を集合SQLで再照合し、表示した対象外/実行集合が変わった場合は黙って減らさず再確認する。0実行なら破壊jobなし。
5. 受理は有限header/targets/初回attemptを同UoWで保存し、BatchQueued outboxを同commitへ入れる。500個のmove/tag/trash自体を一括Txにしない。受理後に変わった操作固有条件は各子の厳密比較で対象別失敗となる。

500確認値のtransport byte上限、集合INSERT/認可SQLの量と所要時間は未測定。最大500を縮めず、既存server body境界を確認してから必要な有限codecを提案する。ここでは巨大payloadを許可済みとしない。request IDは多重受理識別であって権限tokenではなく、90日を超える永久dedup保証は追加しない。

### 子実行と不明応答

同parentは一度に1running childをclaimし、初回はordinal順、追加retryは受付generation→ordinal順にする。異なるparentまで一つのDB lockを永続保持しない。claimを別の短いUoWでrunningへ置き、mutation UoWは当該attempt/tokenと未終端を再検査する。

mutation・成功result・holding receipt・target latest結果を同UoWでcommitする。commit後の応答喪失は同attemptの結果読取へ戻し、commandを再適用しない。progressや通知を成功receiptにしない。通常例外ではtransactionをrollbackし、別UoWで同token/未成功/未取消を照合してfailedへ記録する。commit有無が不明ならまず永続receiptを確認し、不明のまま失敗確定/再実行へ進まない。

中断したrunningは既存worker型の有限lease/recoveryで失敗または同attempt内の内部回復とする。回復前に旧executionの採用可能性とreceiptを照合する。具体lease/周期は正式実装時の既存drain接続から決める。3秒のread deadlineをwrite job leaseへ流用しない。

## holding receipt鎖の具体比較

各move attemptは確認した`MoveExpected`と`previewBaseSequence`を持つ。初回は0。retry previewは現在parent sequenceとholdingを同UoWで読む。

1. 現在actor/policy/attempt所有を確認し、Bを`inspect`する。
2. Bのexpected.bundleがnullならreceiptによる導出なし。bundleありなら、同parent・同bundleでbaseより後のcommit済receiptをsequence順に有限取得する。1親の成功は最大500なので全履歴監査にはならない。
3. 期待holdingを確認時状態から始める。各receiptの対象scope、contentRevision/bytes、before holdingが現在の導出値と一致する場合だけafterへ進める。関係しないscopeのedgeは当該成分を変えず、別bundle/別parentを混ぜない。実値revisionの連続比較を使い、単純`revision+1`を予想しない。
4. 導出後のholding/content/bytesを現在DBと比較する。旧と同じcountでもrevision差があれば拒否する。base以後の必要receipt欠落/pruneを示す保持境界も検査し、鎖が切れたら最新値採用へfallbackしない。
5. Bのexpectedの2holdingだけを導出値へ置き、sourceRelease/destinationIncreaseを既存式で再計算する。Bのnote/version/gen/resourceRevision/resources、tag対応、scope/name/member revision、normalization/bundle ID/content/bytesは原値のまま。これを単一move coreの現在inspectと全成分厳密比較へ渡す。
6. coreは現在quotaを計算してapplyする。同Txで元2scopeのbundleStateを読み、実before/afterをreceiptにしてsequenceを進め、成功resultと一緒に確定する。Aの失敗/取消はedgeを作らない。

欠落検出は親のreceipt保持下限とsequence coverageを使う。sequenceは成功moveのreceiptだけで進み、同bundle抽出前に必要区間の保持が保証されることを確認する。pruneは削除可能な連続prefixだけを同Txで削除し、保持下限を進める。必要区間の中抜けや、成功attemptがあるのに対応receiptがない場合は再確認/整合性エラーで止める。別parentや外部変化を「同じbytesだから自己変更」と認定しない。

### A/B/外部C

確認時、bundle Xは個人のnoteHolds=2、移動先WSはabsent、companion=100Bとする。A/Bは同親Pで個人→WSへ移す。

- A成功: receiptは個人2→1、WS absent→present1の実revisionを記録する。Bはこのedgeだけで期待holdingを進め、destinationのcompanion増分0、sourceのcompanion解放100Bへ導出できる。B固有資源は変えない。
- A失敗: edgeなし。Bは元holdingと比較し、companion増分100B、source解放0のまま実行する。Aの予測成功をreceiptにしない。
- A後に外部Cが同bundle関係を追加→除去: countが1へ戻ってもrevisionは進む。Bの導出afterと不一致なので再確認。
- 別親Qが変更した場合もPのreceiptには存在せず同じ拒否となる。PのA後cleanupなどcommit外変化も同様。
- retryで新previewを確認したBは、その時点の現在holdingとbase sequenceを新しい起点にする。過去の外部変更を自己edgeとして説明し直すのではない。

### 初回合計移管量と容量説明

各単一previewのdestinationIncreaseを単純加算しない。固定順で確認済みholding理由countの仮想遷移を行い、固有6種類bytesは各note分を加え、同bundle companionは各scopeの「保持なし→あり」一回だけ増分にする。sourceは最後のnote保持が消え、admission/cleanupも0になる時だけ減分にする。既存trash noteの保持や未完受付を選択対象と誤認して差し引かない。

仮想計算は説明用でありrevisionを予言しない。実処理は実receiptを使う。A/B例では「全件成功ならWSへcompanion100Bを一回、個人から100Bを一回解放」と表示する。固有bytesを別項目で合算し、現在使用量/上限から想定後使用量を示す。全件成功を仮定した説明と、部分失敗で残る実課算を分ける。容量予約や全親成功の保証を作らず、各子の現在quotaで上限超過を対象別に拒否する。

## retry・cancel・90日の接続

### 明示retry

同targetのlatestがfailedで、同actor/current policy/対象存続/元のsourceと固定設定が成立する場合だけ、最新影響をpreviewする。変更先やtag deltaを変更するなら新親である。元対象が外部moveで別sourceへ変わった場合は、同設定retryのまま新scopeを採用しない。

preview時のlatestAttempt IDを固定し、受付時にも同じfailedであることを照合する。同じretry requestは一回だけ新attemptを作り、成功/取消済targetは含めない。新attemptは新expected＋同時取得base sequenceを持つ。旧failedの期待値や旧receipt連鎖をそのまま継続しない。親集計は固定totalと各target最新attemptだけ、retryで再びactiveになる。親admission generationは待機受付の所有に使い、既にrunningの他子がcommitする結果を捨てない。

### JB-03の外部取消と通常失敗

`cancelled`は理由なし、`failed`だけ安全な理由enumを持つunionにする。lease tokenとは別の不可逆cancel状態を同Txで持たせ、再参加/再昇格でも旧attemptを復活させない。

| 契機 | 接続案 |
| --- | --- |
| 利用者の親取消 | waitingだけcancelled。runningは待ち、current policyを守った結果を保持。success/failedは書き換えない |
| membership edit-loss | `application/workspace/membership.ts`の実変化判定と同UoWで、当該actorかつsourceまたはmove destinationが当該WSの未終端子を終端化。owner→editorや同値roleは取消しない |
| note trash/purging | `trash.ts`/`beginNotePurge`の同UoWへnote ID限定の未終端子取消を接続。batch自身のtrash commandは現在実行attemptだけを除外し、他の関連子は取消する |
| account/WS削除・外部連携解除 | 現P3eに実在しない入口は接続済みとしない。専用cancelByActor/scope/dependencyの内向き契約を後続へ渡す。未提供Driveをcancel試験の代用にしない |
| claim後のpolicy再照合 | 既存入口が同Txで付けた取消は尊重。account/権限喪失/非activeの外部停止を判定できる場合は理由なし取消。条件変更・quota・削除tag・conversion追加・receipt鎖切れ等は理由あり失敗。どちらか不明を「取消済みだった」と捏造しない |

今回対象のmutationはDB内で原子的に終わる。外部取消Txが先なら旧attempt/tokenでcommit不可、子commitが先なら完成結果は残る。claimしたがまだcommand Txへ入っていないrunningも外部取消の対象である。「user cancelはrunningを待つ」と「role失効後でもrunningを採用する」を混同しない。将来外部I/Oは既存writer/世代fenceを維持し、batch取消で物理writer終了を偽装しない。

### 履歴とreceiptの寿命

本人readは未完了/90日内完了の独立keyset page、server summary、有限watchを使い、子を親tickerと二重計上しない。page不在を受理失敗/完了にしない。既存EmptyTrashの表示設計を参考にするが、15分prepared TTL/50件境界/物理purge intent共有はコピーしない。

表示用title/旧attempt詳細は元作成日時から90日を延ばさない。古親の新retryは最小headerと新attemptの現在確認内容だけを期限内表示する。既に90日を過ぎた古いfailed詳細を無条件に復元してretry可能にしない。

move receiptは消費するwaiting/running attemptがある間、最小before/afterだけを保持する。安全側の最小実装は「親に未終端が一件でもあれば最大500edgeを保持」。全target終端後は、90日内のreceiptを保持し、期限外のedgeは依存がないことを確認してbounded pruneする。後日のfailed retryは必ず新preview/baseから始まるため古いedgeを必要としない。pruneとretry受付は同UoWでbase/保持下限を照合する。

受理dedupの最小headerは未終端または期限内attemptがある間保持する。未回収の物理資源/holdingはD2のnote/job/draft/provenanceが引き続き所有し、batch receiptを消して容量を解放しない。完了moveが裏で残したcleanup負債のために本文/title/全attempt履歴を延命しない。

## selection readとUIの最小接続

`BrowseRequest/Response`へselection kindを追加し、同じexecutor instance・active1/queue16/受付から3秒/hrtime/readonly/current session snapshotを使う。`browseReadSnapshot.notesSnapshot`のscope/current projection/FTS candidate＋exact term/tag AND/月条件を内部SQL builderに抽出し、同じwhereの後でIDだけLIMIT501する。通常50pageやexcerpt/image readを501へ拡大しない。calendarのday/cursorは選択全体入力型から除き、適用月とzoneを明示する。

返却は`selected(ids<=500, order, filterIdentity)`か`too-many`のunionで、501件目を切って成功にしない。sortは全選択時の確定順に使うが、以後sort/layout変更で集合を消さない。空/未完索引/timeout/旧応答は別状態。通常browseのreadモデルと選択用有限DTOを混ぜない。

`ScopedNotesBoard`が選択・確認・受付中・失敗・parent導線を所有し、tile/list/calendar leafには操作委譲だけを渡す。既存trash/タグoptimistic rebaseと排他を保つ。filter/scope/zone変更で選択解除、sort/layout/page/day追加では維持。受理済parentは解除しない。jobs側は親一覧/子50page/failed再確認を独立したclient ownerにする。RSC非await/Skeleton、mutation invalidateを維持する。

viewerには選択を残し、P4未提供downloadを明示する。公開/export/Driveの偽button成功・疑似artifactは作らない。

## 先行影響候補と実装順

実編集前の候補であり、現時点で再openを求めない。

| 具体path群 | 条件への影響候補 |
| --- | --- |
| application/move core/ports、noteMoveRepositoryの有限post-state read | P3d-2-B/C/D/E/G。strict比較とquotaを維持しreceipt導出を追加 |
| application/tag/usecases、note/trash.ts、note/purge.ts | P3d-1-A/E/F、P2d-1-A、P2d-2-A/C。同Tx core抽出/外部取消対象拡張だけ |
| workspace/membership.ts、batch repository/index | P3b-1-C。edit-loss取消/ABA/同値不増、旧job/icon/inviteの無関係枝は変更しない |
| browse ports/wire/snapshot、selection adapter/DI | P3c-A/D/G、P3d-1-F。exact-before-501と同runtime。検索意味/Unicode/clock方式は変更しない |
| ScopedNotesBoard/NoteList/三表示、batch history/ticker/root登録 | P3c-B/E/F、P2d-1-D、P1-E、JB表示の既存親owner/再訪/poll枝 |
| 新batch schema/migration/UoW/worker boot-drain/outbox decoder | 移行保全とJB永続継続。既存FD停止順は新batch taskを待つ枝だけ、全FD/codec/PMを再監査しない |

実装は、選択read＋command core抽出→親子/attempt/receiptと小さいA/B/C・cancel対→board確認/履歴/ticker→500境界・移行保全・同bundle UIの順が最小である。目安は正式開始から4〜6時間。500previewの有限受理量や既存jobs UI統合で不成立があれば、その箇所だけ根拠と代案をManagerへ返す。

## Manager判断点

1. 4表と「同parent 1running、成功moveだけ単調sequence、receipt最大500」の構成。oldhistoryを延命せず未終端依存edgeだけ保持する案。
2. 単一application command core抽出と、bundleState有限read/増減額の共通純粋式。同parent receiptに限定したholding導出を、既存strict coreの手前で行う案。
3. preview50置換×最大500の確認値、acceptの集合認可と同内容受理、失敗retryの新expected/base、JB-03取消入口拡張。transport上限/DB単発量・worker leaseの具体運用値は正式実装時の狭い確認前で未決。

## 未実行と停止

source・原文・非秘密報告の読取と本書のapply_patchだけを実施した。補助は起動していない。doc-style/markdown-styleで整え、失敗した読取path指定は正しいsource読取へ訂正したが、実行検証の成功数には含めない。

本文を全文通読して文書を含む全操作を停止し、採否とP3e正式開始をManagerへ返す。D2独立検証への操作権は引き続きVerifierだけにある。

## 補足: tag固定identityとreceipt coverage

以下を本書の具体化案とする。4表・500件・既定意味論は維持し、新しいUI機能や期限は追加しない。`tag/usecases.ts`と`tagRepository.ts`のensure/attach/rollbackをsourceで再照合した。実行検証はしていない。

### 明示createを一度だけ固定する

一括設定は既存ID操作と明示名操作を型で分ける。

```text
attach/detach: fixed(scope, tagId)
create: intent(scope, trimmedName, normalizedKey, UnicodeVersion)
        + binding = unresolved | resolved(tagId)
```

intentは受理digestに含む不変設定、bindingは一度だけ確定する実行結果である。resolvedをunresolvedへ戻さず、tagへのFK SET NULL/CASCADEで消さない。明示createをUIから落とさない。

1. 既存IDを選んだ場合は受理時から固定する。削除済みIDを同名lookup/ensureで補わない。
2. 明示createのaccept Txではscope/current policyと同名keyを調べる。同名が既にあればそのIDへresolvedとする。なければunresolvedを保存し、この段階では新tagをINSERTしない。全子が50上限等で失敗した際に空tagを残さないためである。
3. unresolvedの最初の実行子は、現在note/scope/選択済tag整合を検査した後、既存ensureで同名IDを取得し、attachと親bindingの確定、子成功resultを同じUoWでcommitする。子失敗ならensureで作ったtagとbindingを一緒にrollbackする。すでに同tagが付いている同値成功も、現在認可後の最初の成功としてbindingを確定できる。
4. 以後の子はresolved IDを通常attach coreへ渡す。元nameによるensureを一切呼ばない。親は1runningだが、bindingのUPDATEにもunresolved条件を付け、再配送・内部回復で二重確定させない。

ensureは現`(scope_key, normalized_key)`の一意制約に対するINSERT ON CONFLICT DO NOTHINGとfindByKeyである。受理時不在から最初の子までに外部が同名tagを作った場合、その既存IDへ最初の成功Txで収束する。外部作成と成功Txの競合も同じ一意制約で扱い、別ID二つを採用しない。

Aの成功後に外部が固定tagを削除/mergeし、同名別IDを作っても、Bとfailed retryは元resolved IDの不在として理由あり失敗/再試行不可となる。別IDを選ぶか作り直す行為は新しい親操作である。受理時に既存同名へresolvedになった場合も、受理後deleteを再createへ置換しない。

unresolvedのまま全子が失敗した場合は、まだ成功したtag identityがない。同じ明示名intentでfailed retryを確認し、最初の成功で一度だけIDを確定できる。resolved済みなら新previewでもbindingを変更しない。元intentと確定IDを保持し、旧成功Aをretryに含めない。renameだけでIDが変わらない場合は既存ID指定と同じ扱いとし、再確認/履歴には現在認可で読める現tag名を表示する。旧名のtagを再作成する操作とは説明しない。

単一tag core抽出時は、内部結果に実際のtag IDを返せる形にする。既存presentation向け`TagDeltaResult`のtags配列から表示名を逆引きしてidentityを推測しない。batch binding列は親operationがcreateの場合だけ有効なunionとして境界検査し、他種のparentへ混ぜない。

### sequenceはbundleあり成功moveだけ

`last_move_sequence`は「全成功子の連番」ではなく、holding edgeの連番と定義する。

- move成功かつbundleありなら、bytesが0でもbefore/after receiptを1行書き、sequenceを1進める。receiptと成功attemptのresultに同じsequenceを保存する。
- bundleなしmove成功、tag/trash成功、failed/cancelledはsequenceを進めず、holding receiptも作らない。成功moveのresultは`holdingSequence: number | null`を持ち、bundleなしのnullと「必要receipt欠落」を分ける。
- 同じattemptの成功再読取・ack喪失・再配送では既存resultを返し、sequenceを再採番しない。親の最大500成功targetという上限は変わらない。

保持下限は`prunedThrough`（削除済み連続prefixの最後、初期0）とする。`last_move_sequence = L`のとき、保存中は`prunedThrough + 1 ... L`を重複なしで連続保持する。pruneは依存がなく90日を過ぎた連続prefixだけを削除し、同Txで下限を進める。中間行だけを期限順で消さない。

子のbaseをBとした場合、まず`0 <= B <= L`かつ`B >= prunedThrough`を要求し、同bundleで絞る前に`(B, L]`の全receiptを最大500行取得する。PKの一意性と昇順の隣接sequence/件数`L-B`を確認し、成功attemptの対応resultとも照合する。保持中receiptが存在しないのに必要sequenceがある場合は再確認/整合性エラーである。`B = L`なら空区間が正当であり、bundleなし成功が間に何件あっても欠番にはならない。

coverage確認後だけ同bundleのedgeを折り畳む。別bundleの正当なsequenceはcoverageには含むがBのholdingを変えない。別parentは取得しない。prefix prune後に新previewが同Txで取得した現在Lをbaseとするretryは、削除済みprefixを必要としない。古いbaseや欠落を新baseへ無断で差し替えない。

補足を全文確認し、文書を含め操作を停止する。preview/受理payload上限・SQL量・worker leaseの運用値は前節どおり未測定であり、今回の補足で決定していない。
