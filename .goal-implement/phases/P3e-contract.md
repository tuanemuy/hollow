# P3e 選択集合と一括操作の共通契約案

2026-09-11 08:27〜08:35 JST の読み取り専用設計調査。対象は OR-09。P3e の正式開始、製品実装、独立検証、追加受入条件ではない。P3c/P3d の受入後に詳細化する入力である。

## 結論

選択は最大500件の明示的な note ID 集合とし、実行時に検索条件を再評価して対象を増減させない。表示済み項目の選択と、現在の絞り込み結果全体の選択を別操作にする。権限・対象の存続・単一操作の確認条件は、選択とは別に現在値で検査する。

一括操作は原文どおり親ジョブ1件と対象別の子ジョブへ接続する。P3d のタグ delta / 単一移動と既存の trash を対象単位で再利用し、成功済みの兄弟を巻き戻さない。ジョブの再試行と、選択し直して別の操作を行うことを区別する。

Manager 判断は末尾の3点に限定する。特に、同一移動 batch の先行成功による移管条件の変化を、P3d の再確認契約へどう接続するかは未採用である。

## 原文と採用済みの境界

| 出所 | 維持する契約 |
| --- | --- |
| [OR-09](../../spec/scenario/organize.md#or-09-複数のノートを選択して一括操作する) | 最大500件、絞り込み結果全体かどうかの明示、絞り込み変更で解除、viewer は選択とダウンロードのみ、権限外の操作を無効化または対象外件数表示、部分成功と失敗理由 |
| [JB のジョブ種類・JB-01〜03](../../spec/scenario/jobs.md) | 親1件＋対象別子、画面離脱後も継続、実行者本人だけの90日履歴、失敗子だけ同対象・同設定で再試行、多重実行抑止、待機子の取消と実行済み結果の保持 |
| [P3c 共有契約](../design.md#p3cの検索日付タグ共有契約) | 現在認可と active note を正本にする検索、正確照合が LIMIT より前、最大50件の一覧、calendar の月集合と日別追加、live cursor はリクエスト間 snapshot ではない |
| [P3d 採用契約](../design.md#p3dのタグ書込管理と単一移動) | タグは本文 version / updatedAt と独立、用途別 tag reader、現在権限、単一移動の preview 比較と同 UoW、Q2/Q3 の容量・所有世代 fence |
| [P4 採用契約](../design.md#p4の接続判断) | 公開前提は現在所有 scope 別、一括開始後は対象別結果、公開済み移動で URL / 公開状態を変更しない、artifact の内容一致と現在認可を分離 |
| [EX-02〜04](../../spec/scenario/export.md) | ZIP は最大500件・合計1 GB、空本文除外、成功分と失敗一覧、7日保持、実行中の一括 download は1件で待機列なし、匿名閲覧者に一括 download は提供しない |

[brief](../brief.md) の外部接続境界を維持する。P4 の公開/export、P5 の Drive は後続の操作 port であり、この案で提供済みとはしない。既存の empty-trash 固有の15分確認期限、50件を境にする実行方式、admission 件数を OR-09 へ流用しない。

## 現在の接続点と不足

以下は上記時点の source 読取であり、動作確認ではない。P3c 本体は主担当が変更中である。

- [browse ports](../../packages/core/src/application/browse/ports.ts) は `BrowseConditions`、`BrowsePage`、`BrowseRequest` の notes / tags、有限 DTO、専用 read execution を持つ。選択集合・一括 command はない。`BrowseNote` は version を持たず、操作の確認値を一覧から捏造できない。
- [browse read snapshot](../../packages/core/src/adapters/libsql/browseReadSnapshot.ts) は同じ read snapshot 内で session / scope / membership と現在条件を検査する。検索 candidate と正確照合、tag AND、createdAt 月区間を共用する選択用 read が接続候補である。
- [ScopedNotesBoard](../../apps/web/app/components/hollow/ScopedNotesBoard.tsx) は追加 page、日別追加、trash の optimistic / rollback / invalidate を親所有する。[requestState](../../apps/web/app/components/browse/requestState.ts) は generation、seed 参照、identity、location による旧応答排除を持つ。選択はこの親に追加する責務であり、leaf に移さない。
- [trash usecase](../../packages/core/src/application/note/trash.ts) は現在認可、version、実行中処理の取消確認を同 UoW で検査する。OR-09 の削除は通常一覧からのゴミ箱移動へ接続し、完全削除へ置換しない。
- [empty-trash usecase](../../packages/core/src/application/note/emptyTrash.ts) と [repository](../../packages/core/src/domain/purge/ports/emptyTrashRepository.ts) は永続対象、親世代、対象別 attempt、取消・再試行・本人履歴の参考になる。purge / trash operation ID 固有の契約を共通 batch 型へコピーしない。[ConversionJob](../../packages/core/src/domain/job/entity.ts) も汎用 batch 型ではない。
- P3d のタグ command / 移動所有世代接続は採用設計であり、再利用可能な完成済みコードとして数えない。実装時に単一操作の UoW 内部処理と結果 receipt を接続する境界を主担当が確定する。

## 提案1: 選択する集合

### 表示済みと結果全体を分ける

「表示中の N 件を選択」は、その時点で board に表示されている一意 ID だけを対象とする。追加読み込み済みの項目を含むため、固定の50件を「表示中」と呼ばない。calendar では現在表示済みの日別項目の和集合であり、各日の未表示項目を含めない。

「絞り込み結果全 N 件を選択」は別の明示操作にする。適用済みの scope / query / tag / month / zone を使い、サーバーで現在の可視 active 集合を一度読む。calendar は月の結果全体であることを表示する。`day` と cursor は日別続きを読むための条件であり、既存 UI にない日フィルターを追加しない。

結果全体の read は ID と集合確認に必要な有限 metadata だけを返す。検索の正確照合・現在認可・全 filter を適用した後に最大501 ID を読む案とする。501件目は500超過の検知用で、選択可能件数の拡張ではない。超過時は分割を案内し、先頭500件を「全選択」として黙って採用しない。既存の total 表示は古い可能性があるため、受理の根拠にしない。

通常の50件 read を十数回進める方式では、live cursor 間の変更により「全体」を確定できない。選択用途を型で分け、既存一覧の LIMIT を任意に外す API、全本文の JS 展開、永続全件 snapshot は追加しない。501 ID に至るまでの SQL 自体が軽いとは未確認であり、既存の検索実行境界・中断・未結果表示を維持する。timeout / SEARCH_PREPARING を空集合成功にしない。

選択 state は、検証済み scope、filter identity、選択方法、最大500一意 ID と確定順を持つ案とする。手動追加時にも500を超えない。全体選択後に一部を外したら「全体選択」ではなく明示 subset と表示する。次 page、新しい検索一致、後から作成された note を自動追加しない。0件や旧応答で全件操作へ fallback しない。

### filter 変更と外部変更

filter identity は request identity と分ける。scope、適用 query、tag ID 集合、月、月の意味を決める zone を含める。sort / layout だけの変更、cursor、日別展開は集合条件ではない。calendar 切替で月が設定される、月解除で list になる等、集合条件も変わる操作では解除する。zone は月境界を変え得るため、zone 変更時にも解除する簡単な案を推奨する。

未適用の palette draft は選択を解除しない。適用 URL の filter 変更、scope 変更、再訪で別 filter になった場合は解除する。sort / layout だけでは ID 集合を保持する案が原文の「絞り込み変更」と対応する。既存 request identity をそのまま使って解除しても安全側ではあるが、表示切替だけで消える追加仕様になる。

全体選択 read は操作世代と現在 filter に束縛する。A→B→A の移動でも古い A の結果を復活させない。応答の success / catch / finally 全てに同じ guard を適用する。board の seed / page guard を削除せず、選択 ID の意味と read 応答の新旧を別に管理する。

選択後の外部変更では ID 集合を再計算しない案を推奨する。例: 選択後に他の利用者がタグを外して検索不一致になっても、実行対象の意味は「選んだ note」である。新たに一致した note は加えない。現在読めない・trash / deleted・別 scope へ移った対象は実行前に対象外として扱う。known invalidation は件数と確認情報を更新するが、選択を別の ID で埋めない。

未送信の選択は画面内の短命 state とし、reload / 一覧離脱後の自動復元は追加しない。これは未指定の可逆案である。受理済みジョブは選択 state と独立して継続し、本人履歴から確認する。

## 提案2: 認可・確認・対象別実行

1. 選択 ID と型付き操作を受け取り、入力境界で一意 ID 最大500件と操作固有の設定を検査する。現在の session / account / scope を使い、クライアントの `canEdit`、選択時の資格、検索条件を認可証明としない。
2. 現在読める対象、操作可能対象、対象外件数を確認する。OR-09 の許容する二案のうち「対象外 N 件、実行 M 件」を示して明示確認する案を推奨する。全件対象外ならジョブを開始しない。未知・別 scope の ID から新しい title / 所属先を取得して説明しない。
3. 操作固有の全体前提を確認する。公開 handle / slug 不足、EX の件数・サイズ等による全体中止を、通常の対象別失敗へ勝手に変えない。
4. 確認された有限集合と操作設定で親1件＋子を永続受理する。対象順を固定し、後から検索で置換しない。各子は実行時の current policy と単一操作の guard を再確認し、自分の UoW で変更と結果を確定する。500件を一つの長い write transaction へ入れない。
5. 子の通常失敗は理由を保存して兄弟を継続する。現在権限の失効や削除等を、他の所有者へ付け替えて再試行しない。成功済みの変更を親失敗時に自動補償しない。

確認情報は権限 token ではない。P3d の expectedScope / version / membership revision / tag mapping 等の比較値をそのまま使う。新しい暗号 token、全 member の永続 snapshot、共通確認期限を加えない。画面上の表示順を変更しても、受理済み子の実行順は変更しない。

多重送信と worker 再配送を区別する。受理 ID と actor、操作、設定、対象集合を結び付け、同じ受理の再送は同じ親へ収束させる案とする。異なる内容で同じ ID を送った場合は拒否する。自己 child attempt の receipt とドメイン変更を同 UoW に置き、commit 後の応答喪失で move / trash を二重適用しない。これは JB-02 の多重実行抑止に接続する案であり、新しい資格 token や exactly-once 外部 API 保証ではない。

### 操作別の再利用

| 操作 | 共通 batch から渡すものと、単一操作が所有するもの |
| --- | --- |
| タグ付与・解除 | expectedScope と tag ID / 明示新規名、対象 ID を渡す。P3d の現在 edit、Unicode16 key、既存同名再利用、note50上限、delta 同 UoW を再利用する。本文 version / updatedAt を一括操作の都合で進めない。削除済み tag を別 tag へ付け替えない |
| 単一移動の反復 | 共通の移動先と各 note の確認値を渡す。両側 current edit、所属・タグ・容量の原子変更、変換/再生成中拒否、Q2/Q3 fence、version 以外の保持を再利用する。容量超過の「移動全体拒否」は一つの note の原子変更であり、成功済み兄弟の取消を意味しない |
| ゴミ箱へ移動 | 現在 trash intent を取り直し、version と処理取消の同意を渡す。選択時になかった running job を無断で取消しない。競合は対象別に再確認へ戻す。完全削除ではない |
| 公開変更・download・Drive | 後続 P4/P5 の操作別 port へ渡す。共通 runner が公開条件、renderer、原本/credential を代行しない。未接続の項目に架空の成功や完了 toast を出さない |

タグは「全タグ集合の置換」ではなく指定した attach / detach の delta とする。途中の別利用者の無関係タグ操作を消さない。同値操作も現在認可後に成功として扱い、成功 receipt の再送で後から行われた反対操作を上書きしない。候補は P3d の使用0を含む付与 reader を使い、P3c filter reader を流用しない。

### 移動 batch の自己進行と外部変更

例: 同じ bundle の note A/B が個人 scope にあり、companion 全量 C は個人に一度課金されている。A/B を同じ WS へ移す。独立した初期 preview では、WS がまだ保持しない C が A/B 双方の移管条件に現れ得る。A の成功後、WS は C を保持するため B の増分が変わる。B が最後の個人 note なら、元 scope の C の保持解除条件も変わる。単純に全 note の初期増分を足すと Q3 に反する。

二案を比較し、ここでは採用しない。

- 単一契約をそのまま反復する最小案: 各子の確認値を現在値と厳密比較する。自己 batch の先行成功でも条件が違えば B は再確認が必要な失敗とし、A は保持する。既存 guard の追加変更は小さいが、正当な一括操作が自己干渉で複数回に分かれることを確認 UI に明示する必要がある。
- 確認済み計画を自己 receipt だけで進める案: 順序付き対象と、関係する移管条件の確認値を起点にする。同じ親の既に commit 済みの子だけが出した所有/holding 変更 receipt で、後続に期待する条件を更新する。先行失敗は移管済みと見なさない。現在値はこの期待値と比較し、membership / scope / note version / tag mapping の外部変更、説明できない provenance / holding 変更は再確認にする。現在 quota は各子で再計算する。これは無条件の最新値採用ではない。

後者でも scope 全体の member snapshot や全 object 本文を保存しない。receipt が示す自己変更で現在の移管条件差を説明できる、操作固有の有限表現が必要になる。bytes 合計や「同じ親が動いている」だけでは同数入替・外部変更と区別できない。現在 source にその receipt / 比較 port は未接続であり、可能だと実測した主張はしない。P3d の単一 command を緩めず、その上の一括 preview 計画を追加する判断として Manager に返す。

共通の閲覧者増減は両側 membership revision に束縛して有限 page で確認できるが、各 note の tag 対応や provenance を共通と仮定しない。移動先は現在本人個人・owner/editor WS のみ。公開済み note の移動を新規公開として handle / slug 必須に変更しない。

## 提案3: 結果・取消・再試行と UI 所有

受理前の「対象外」は、まだ子ジョブを開始していない集合である。受理後は waiting / running / succeeded / failed / cancelled を区別する。表示は選択数、対象外数、受理数、対象別結果の対応を保つ。失敗理由は利用者向けで、内部 driver error や新しい非可視情報を出さない。

JB-01 の cancelled は理由を持たない独立状態である。JB-03 の明示取消・外部 lifecycle による取消を、一般失敗へ書き換えない。通常の対象別検査失敗は失敗理由を持つ。取消 generation による取消が成立している場合はそれを尊重する。明示取消は待機子を止め、既に実行中の子の結果を残す。一方、権限喪失を無視して実行中の mutation を commit してよいという意味ではなく、各操作の current policy / 所有世代 fence は最後まで維持する。

再試行は JB-02 に従い失敗した子だけ、同じ対象・同じ設定で新 attempt を作る。親の集計は最新 attempt に対応させ、過去の成功数を二重加算しない。削除・権限喪失中は再試行不可。同じ子の active attempt と親世代を検査し、重複要求で並行実行しない。現在値に基づく安全確認は取り直すが、移動先や tag 設定の変更は「再試行」ではなく新しい操作とする。

完了済み・取消済みを再試行対象にしない。元操作のやり直しは新しい現在認可と選択から始める。既に移動した成功子を含めて元 scope の古い選択を再送しない。サービス中断後の再開は永続 receipt に従い、未反映の UI 応答だけを理由に mutation をやり直さない。中断判定の新しい秒数はこの案では設定しない。

board が選択、確認、送信中、対象外表示、親 job への導線、結果に応じた invalidate を所有する。leaf が消えてもエラー表示と rollback を失わない。受理成功は「処理を開始」と表示し、子の完了と同一視しない。既存の optimistic / transition を維持するが、500件の完了を先に確定表示しない。操作中の条件変更で画面の選択は解除しても、受理済み job は取り消さない。

viewer は選択と一括 download だけを出し、タグ・移動・公開・Drive・削除を隠す。これは UI の都合であり server 認可の代替ではない。download がまだ未提供の段階では未提供を明示し、viewer の別 mutation で代用しない。匿名の公開・限定リンク画面へ OR-09 の一括選択を持ち込まない。

port の責務は、有限選択 read、操作固有の preview / 子実行、親・子・attempt の永続状態、worker の対象別実行に分ける案とする。application が現在認可と単一操作を編成し、domain が集合上限と許される状態遷移、adapter が query / receipt / lease の永続化、presentation が境界検証と本人向け DTO を所有する。型名・schema・新たな実行数はここで固定しない。

## P4/P5 への後続 port 契約

- 公開変更: P4-Q3 の個人 handle / WS slug 前提不足は開始前に全体中止する。開始後の対象変化は対象別結果とする。SH-07 の未決をこの案で決めない。
- Download: EX-02 の最大500件・1 GB、本文空の対象外、部分成功 ZIP と失敗一覧を operation-specific preflight / child result / assembly へ分ける。EX-03 の一括実行1件・待機列なしを他の batch 種別へ一般化しない。ZIP 組立中の失敗子 retry は JB-02 どおり全件受け付けない。
- Artifact: PDF24時間、ZIP7日、job90日を分離する。生成入力の正確な内容 identity と現在閲覧認可を毎回評価し、選択 ID や job 所有だけで配布しない。完成後の一部失効・内容変更は旧 ZIP 全体を配らず、現在取得可能な対象で作り直す明示的な新操作へ接続する。完成済み job の失敗子 retry と偽装しない。
- Drive: 実行者本人の credential / Google sub / 連携 epoch と対象の現在 policy を後続 port が扱う。現在 owner / creator の credential へ代替しない。外部送信の重複防止・取消後の遅い結果・再試行の実接続条件は P5 に残す。

## Manager 判断事項

1. 選択の時間的意味: 最大500 ID を選択時点で固定し、外部の filter 不一致だけでは別集合へ置換しない案を推奨する。sort / layout だけでは保持し、適用 filter / scope / zone 変更では解除する。原文が指定しない reload 復元は追加しない。
2. 権限外混在: OR-09 が許す「操作全体を無効化」と「対象外件数を示して残りを確認」のうち、後者を推奨する。公開前提不足等の操作固有の全体中止を例外として保持する。
3. 一括移動の自己干渉: 初期の安全な接続は単一 guard の厳密反復である。ただし共有 companion がある通常の一括移動を一回で進めるには、同じ親の commit receipt だけで確認済み計画を進める後者を詳細化することを推奨する。これは追加の採用判断であり、単一 move の current 権限・tag 対応・容量原子性を緩める許可ではない。

## 未実行と停止

製品コード、DB、objects、browser、server / worker / process、build、test、依存、秘密ファイル、旧 recovery / temp は操作していない。source と要件を読んだだけで、UI、SQL 性能、500件、job 再配送、競合、port 成立を検証済みとはしない。管理文書、goal API、個別 stage / commit は操作していない。

変更先は本報告1文書のみ。doc-style / markdown-style を用い、原文・採用済み・提案・未決を分離した。全文確認後に文書を含む全操作を停止し、設計採否と正式フェーズ開始を Manager に返す。
