# P2d-3 — ゴミ箱を空にする接続案

2026-09-10T13:10:16+09:00 の文書調査。P2d-2固定source、ED-10、JB-01〜03、採用P2d設計を参照した未実装の提案。製品・依存・DB・browser・process・test・build・hash・git・固定tempは操作していない。本資料だけを作成し、以下の試験は未実行。

## 再利用と変更点

単一purgeの不可逆fence、全object捕捉、writer収束、共通delete claim、容量解放は再実装しない。`application/note/purge.ts`の内部`begin`を、既存UoWに参加する型付き共通commandとして分離する。単一要求・期限・empty子は同じcommandを呼ぶ。session付き公開usecaseをworkerから呼び直したり、子ごとに外側UoWを入れ子にしたりしない。

| 現在の接続点 | emptyで加える最小責務 |
| --- | --- |
| `PurgeRepository.forNote/begin` | 同note・同trashOperationの既存intentを再利用し、子とintentの関係を同UoWで確定する |
| `PurgeRepository.claim/defer/retry/finish` | batchに属する回収結果と最新子attemptの対応を条件更新する。物理回収判定は既存のまま |
| `NoteRepository.listTrashed` | UIの50件cursorを全件集合固定に流用しない。専用のserver snapshot操作を追加する |
| `PurgeRepository.list` | 現在の100件制限をemptyの全対象上限にしない。親summaryと子cursorを別queryにする |
| `ImportTicker`、`PurgeHistory` | 親1件と子内訳を表示し、同じpurgeを親と単独欄で二重に数えない |
| `JobResultSnapshot`、purge prune | 元ID/本人/日時と90日を保持。親子結果の保持と未回収intentの保管を分離する |

新規port候補は`EmptyTrashRepository`。操作固有の親、固定target、子attemptを別の型・表で持つ。全payloadを汎用JSONへ収めない。将来OR-09から再利用できる親子状態の純粋集計だけ共通化し、移動・タグ・公開等の未実装payloadを追加しない。

## 固定集合と50/51/501

確認画面を開いた時点で、本人の個人scopeに属する現在trashedの`noteId / trashOperationId / title`をserverで固定する。本文・CSS・asset・objectをコピーしない。clientはsnapshot IDだけを返し、取得・確認・実行の各境界で本人を照合する。snapshot IDを権限証明にしない。

推奨は同UoWの`INSERT … SELECT`によるmetadataだけの集合保存と件数確定。JSへ全件配列を返さず、後続の子生成・開始・取消・一覧は固定target ordinalのkeyset cursorで有限ページを処理する。snapshot作成自体はDB内で対象件数に比例する一つの操作であり、一定時間/O(1)とは称さない。501件と追加metadata規模で時間・memoryを測る。

`trashedAt <= cutoff`だけの後追い列挙は採用しない。同時刻の新trashやrestore→再trashの世代を取り違え、確認時の集合と異なるためである。全件固定と完全に分割した書込みを両立する別案は、trash世代の履歴を残すas-of列挙となるが、現在のlifecycleへ新しい履歴基盤を持ち込む。単一SQLの小さいmetadata snapshotを第一候補とする。

- 0件は空状態。破壊jobを作らない。
- 1〜50件も同じ永続親1＋targetごとの子を使う。短いrequestで子の開始を進められても、I/OはUoW外。物理未完は「処理中」で返す。
- 51件以上は親queuedを返してworkerへ委譲する。画面・HTTP・500件client配列へ依存せず、501件以降も全固定集合を処理する。
- 件数は固定totalであり、回収object数や過去attempt数ではない。子作成前のtargetも未開始件数に含める。
- 確認取消はsnapshotだけを破棄/期限切れにし、purgeやnote変更を行わない。未確認snapshotの期限・page幅・短い同期進行budgetは実測後の運用値とし、原文の固定値にはしない。
- 確認後に新たに入ったtrashは対象外。復元済み・別trash世代は破壊せず子cancelled、failureなし。表示用の「現在の対象ではない」は操作可否の案内であり、取消理由をfailure列へ入れない。
- 同一snapshotの二重確認/受付response喪失は同じ親IDを返す。別snapshotが同じnote世代を含む場合も、一意のpurge intentを共有する。固定集合のnoteが既に不存在なら、同世代の確定purge成功をserverが証明できる場合だけ完了を再利用する。証明できない不存在を削除成功にしない。

## 型付き親・子・attempt

親は`id / actor / personalScope / snapshotId / total / generation / cancelRequested / createdAt / updatedAt`を持つ。状態はqueued/running/succeeded/failed/cancelled、failureはfailedだけ。確認前snapshotはjobではなく別状態である。

固定targetは`parentId / ordinal / noteId / trashOperationId / title / latestAttemptId`。子attemptは一意job ID、retryOf、対象ordinal、世代、queued/running/terminal、開始/終了日時を持つ。fence後だけ`purgeId`を持つ型に分ける。元note削除後も親子の最小結果が読めるよう、target noteIdを削除を妨げる必須FKにしない。

子のclaim tokenと親generationを照合し、同じUoWで以下を行う。

1. 親が未取消・同generationで、子が最新attemptであることを確認する。
2. 現在の本人policyと同trashOperationを確認する。workerにcookie/sessionを保存しない。
3. 共通beginで不可逆intentを作成または再利用する。
4. 子をそのpurgeIdへbindする。取消と開始が競合した場合、同transactionの先着だけが成立する。

以後は共通purge runnerが回収し、子の成功は`PurgeIntent.state === succeeded`だけから確定する。object progressがtotalに届いた、受付が成功した、noteを通常読取できなくなった、のいずれも物理完了の代替にしない。

## 取消・失敗・再試行

親取消はまず同UoWで`cancelRequested`を立て、新しいfenceを止める。未作成子も固定targetに含まれるので、後続pageはcancelledとして終端化する。既にfenceを越えた子は戻さず、現在の回収を続ける。権限喪失も未開始への新規破壊を止め、既存の不可逆回収権限を消さない。

子の成功・失敗・取消は別々に数える。通常取消の親failureはnullで、子のstorage故障は子の事実として残す。完了待ち中は「取消受付済み、開始済みを回収中」と表示する。未開始分を取消したことを、既に消去した分の復元と説明しない。

失敗子retryは、同じ設定・同じtargetに新しい子job IDを作る。古いattemptは結果のまま保持し、targetのlatestAttemptを同UoWで差し替える。親generationを進めてrunningに戻し、進捗分母は固定total、分子は最新attemptだけを数える。親まとめretryと単独retryが競合しても、expected latestAttemptの条件で各targetに一つだけ作る。成功/取消済み子をretryしない。受付応答喪失は操作IDと最新attempt照会で同じ結果へ合流する。

削除前失敗は現在認可・同trash世代を再確認する。fence後失敗は同じpurge intentの残回収だけを再開し、noteの不存在を理由に回収retryを拒否しない。他note/別世代への新しい破壊操作にはしない。

### 既存自動回復との判断点

現purgeはfailedから30秒後に同intentを再claimし、自動でrunning→succeededへ進む。これを無視して子をfailedのまま固定すると、実回収済みなのに親が永久失敗となる。子failed行を無条件で上書きすると、JB-02の新jobと過去結果を失う。

推奨は、batch関連purgeのfailed→再claimを共通の回復attempt開始に接続する。手動と自動の双方が、同じexpected latestAttempt条件で新しい子attemptを作る。purge ID/object claimは増やさず、同一回収を二重実行しない。writer待ちの通常queuedやlease更新を毎回新jobに数えず、終端failureからの再開だけを新attemptにする。

親取消後も既fenceの自動回収は止めない。回復attemptはそのfenced targetだけに限り、取消済み未開始targetを再開しない。親の取消意図を保持し、回収中の表示と完了/失敗/取消内訳を更新する。失敗した子だけを利用者が明示retryしたときはJB-02/03どおり新しい実行世代として親をrunningへ戻す。この表示・集計規則はManager採用待ち。

別案はbatch所属purgeだけ自動再claimを抑止して明示retryに限定する方式。ただし単一purgeとの挙動差を作り、取消後の不可逆回収継続へ影響するため第一候補にしない。

## 90日・一覧・ticker

親summaryを本人だけに返し、子詳細は有限cursorで取得する。親を開いたときだけ子結果を読む。501件を既存`listNotePurges`の100件sliceやImportTickerの全配列に載せない。単独purgeと親に属するpurgeをDTOで分離し、tickerは親1件＋子進捗、重複toastなしとする。複数親が同じ既存intentを参照しても物理回収を重複計数しない。

90日は元jobの日時を維持する。retryの新attemptには新規日時があるが、親の作成日時を付け替えて過去履歴を延命しない。90日を過ぎても未完了intent・容量・write provenanceは消さない。活動中の最小親子追跡を残す場合は「90日超の未完了処理」と分け、完了後に期限判定して片付ける。最新のretry結果だけ期限内に残る場合も、元親作成日時と種別だけで関連を説明し、本文を復元しない。

`purges.prune`は親/子が参照中のintentを先に消さない条件が必要。回収成功の最小結果を子へ確定した後なら、job表示のためにPurgeObjectやnote/assetを残さない。conversion/referenceの既存snapshot unionと親子件数は変更しない。共通表示DTOにkindを追加し、実行者本人・安全な理由・targetDeletedを維持する。

trashのloader bridge/50件metadata/route-level pendingを維持する。empty confirmは親client所有、受付不明を成功rollbackや復元可能表示にしない。確認取消、queued取消、取消待ち、故障、retry中、完了を区別し、再訪とpollでDB truthへ戻す。dirty editorや新しいtrash行を操作の副作用で消さない。

## 実装時の狭い検証案

| 境界 | 正常・拒否対 |
| --- | --- |
| 集合 | 0/1/50/51/501、501全件の固定totalとページ列挙、新trash追加、同時刻trash、restore→再trash、確認取消、確認response喪失、別人snapshot |
| 同時実行 | 二worker/重複confirm、単一purgeや期限との同世代合流、子開始と親取消の両順序、古いlease/親generationの採用0 |
| 結果 | 一部成功/失敗/未開始取消、遅いwriterの物理回収待ち、storage失敗→自動/手動新attempt、latestだけ集計、親再running、二retryの重複0 |
| 既存再利用 | shared companion最後参照・共通claim・容量未解放の既存対。empty独自removeや早期pin解除を作らない |
| 保持 | 本人のみ90日、元日時不変、期限内retry/期限超親、未回収intent保持、conversion/reference snapshot親子union不変 |
| UI | 確認件数/51非同期/501全件説明、ticker親1、子cursor、reload/再訪/通知欠落、keyboard/390px、未完回収を完了としない |

新規数百note/objectの破壊試験は隔離DBか今回作る自己対象だけ。既存固定データやVerifier環境には適用しない。

## 採用判断と再open候補

判断は2点に絞る。1: 全集合の小さいmetadataを一つのSQLで固定し、子生成以降をbounded pageにする案。2: batch関連purgeの自動回復を新しい子attemptへ一元接続する案。原文の上限変更や新しい利用者の破壊権限は不要。実装を阻む原文矛盾はない。

変更時の再open候補はP2d-1のtrash一覧/世代guard、P2d-2-A/C/D/Eのbegin・結果/prune・UI・migration、JBの本人ticker/履歴へ接続するP2a-E/FとP2b-Cの結果表示部分。runnerへ新しいdrain対象を加える場合だけP1-Eの停止境界も対象とする。object writer/claim/容量/codec/SSRF/通常20版/editor保存を変更しない限り、P2d-2-B/FDおよびC1〜C3の不変根拠を維持する。

本資料は`doc-style`と`markdown-style`で提案/採用/未検証を区別した文書のみ。製品の成立試験やP2d-2の独立合格ではない。文書提出後は操作を停止し、正式なP2d-3実装委譲を待つ。

## 共有intentと長期故障の補足

2026-09-10T13:14:08+09:00。小metadataの同UoW集合固定はManagerが方向を採用した。501件と追加規模で測り、empty全体の件数上限は設けない。以下は親子実装前の補足案であり、P2d-2候補の新不具合ではない。

### 親世代と対象の完了所有

親generationは「今回どの失敗targetを再試行/どの未開始targetを取り消すか」の操作所有に使う。すべての子の結果採用条件へ一律に現在parent generationを要求しない。失敗target Aのretryで親が進んでも、既fenceのtarget Bの遅い成功は有効である。

- fence前: parent cancellation/admission世代と、そのtargetのlatestAttempt IDを同UoWで照合する。
- fence後: targetのlatestAttempt ID、bind済purge ID、同trashOperation、purgeの実結果を照合する。無関係targetのretryによる親generation差では捨てない。
- target Aの古いattempt結果は新Aへ書き込まない。既存purgeが成功した事実は新Aも同じintentから参照できる。別note/別世代へ取り替えない。
- 親のsummary確定は、その時点の全targetのlatestAttemptと取消意図から計算する。古いworkerが「全完了」と書き戻して、後から作った新attemptを覆うことをCASで防ぐ。対象集合の再列挙や原本I/Oは不要。

同じpurge intentをPとQのtargetが参照する場合、物理実行は一つのまま。Pからの手動retryがQに新しい利用者操作を捏造しない。Pの失敗targetだけに新job IDを作り、Qは既存の自動回復として同intentの最新結果を表示する。Qの未開始/取消済みtargetには結果を配らない。

全参照親へ同時にUPDATEするfan-outを必須にしない。`latestAttempt → immutable target → purgeIntent`のjoinを正しい読取結果とし、親summaryキャッシュはversion付きのbounded reconcileで追従する。summary未整合中は計算中と示し、古いキャッシュから成功を断言しない。wake通知を落としてもsweep/再訪で収束する。親数に比例した配列を一つのUoWへ載せない。

### 自動回復は内部attemptとして集約する推奨修正

前節の「故障後の自動再claimごとに新しい子job」は、30秒故障が90日続くと1targetで約259,200行となる。90日という時間上限だけでは、実用上の履歴・UoW資源境界として不十分である。この部分は、明示retryの新jobと自動回復の内部attemptを分離する案へ修正することを推奨する。

JB-02の利用者による再試行は新job IDを維持する。JB-01の自動引継ぎは、同一の最新子job内でattempt回数と回復状態を進める。全自動claimをterminal jobとして永続追加せず、最終failure、最終試行日時、内部attempt回数、現stateだけを持つ。queuedのwriter待ちや通常lease更新を故障attemptに数えない。

この方式では、同intentの自動回復sequence/stateを各親の最新bind済子へ投影する。PとQの表示が一時に読み取るtransactionが同じなら同じ実回収状態となる。古い明示retry元jobはretry受付時のterminal snapshotとして残し、自動回復で書き換えるのは最新jobの投影だけ。raw例外履歴や全claim payloadを別の隠し無期限台帳へ移さない。

親取消後の回収は内部attemptだけ進め、未開始取消は不変。回収が動いている間は取消受付済み/開始済み回収中と示し、失敗待ちは対象の回収失敗を表示する。物理回収の新しい試行回数上限を設けず、既存の有限1回I/OとnextAttemptAtで再開する。回数表示が実装の数値上限に近づいた場合は表示用集約を飽和させてもよいが、所有token/時刻やretry可否の判定へ流用しない。

手動retryが別親で同時に来る場合、各親にはそれぞれ新しい論理子jobが一つ成立し得るが、共通intentのphysical claimは一つだけ。すでに回復実行中なら新physical claimを発行しない。同一親targetへの多重要求はexpected latestAttemptで一つに制限し、他の要求には最新状態を返す。この分離は「自動/手動とも新子job」とした初稿からの限定変更なので、Managerの採用判断を待つ。

### 90日と参照保持

自動回復で増える行はなく、常駐量は固定targetと最新子job、共有intentに比例する。明示retryの結果だけ作成から90日の対象となり、一覧・prune・reconcileはcursorで有限件数を処理する。利用者の明示操作回数による90日内metadata増加までO(1)やheap上限とは称さない。多重retry抑止と境界検証を維持し、取得は全履歴一括にしない。

- 完了済みの古いattemptは元createdAtでpruneする。新retryが参照する元IDのために旧本文や全attempt chainを保持しない。retryOfは履歴照合用IDであり、親行削除を妨げる必須FKにしない。
- 90日を過ぎた親で新しい明示retryが動く場合、親ID/元作成日時/種別/実行者と現在target対応だけを最小headerとして残す。元の全過去結果を「90日以内」に戻さない。期限内新jobの関連表示に必要なheaderであることを区別する。
- 期限を過ぎた最新targetが未回収intentへbindしている場合、job履歴ではなく未完了回収の最小関係として保持する。最終回収後に、期限内の親/新job参照がなくなったものから解除する。
- 子の成功結果を確定・記録した後は、親を表示するためだけにpurge objectsや容量所有行を残さない。逆に履歴をpruneするために未回収intentやwrite provenanceを消さない。
- 複数親の一方をpruneしても他方のtarget対応と未回収intentは残す。最後の表示参照が消えても未回収なら共通purge workerは継続する。

追加の実装対は、P/Q共有intentの手動/自動回復、Aだけretry中のB遅い成功、旧A結果不採用、長期故障clockで自動attempt行数非増加、90日親＋新retry、最後の履歴prune後も未回収intent継続。いずれも未実行。新しいstand-alone gateや回収停止上限を追加しない。
