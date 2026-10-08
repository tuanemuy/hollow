# P2d2-V1 — 未完了回収の再訪読取

2026-09-10T13:20:55+09:00。独立報告の再現と固定sourceを照合した修正案。製品・DB・browser・process・test・build・hash・gitは操作していない。本資料だけを作成し、正式返却まで実装しない。

## 原因と限定範囲

`PurgeRepository.list`は未完了または90日以内の行を合わせ、createdAt降順で100件に切っている。古いfailed1件より新しいsucceeded100件があると、未完了を返さない。`listNotePurges`のDTOはitemsのみで、残件数・cursorがない。

`PurgeHistory`は返されたitemsだけからpoll継続を判定する。返却100件がすべてsucceededならpollが止まり、`/trash`と`/notes/jobs`の両方で古いfailedへ到達できない。`retryNotePurge`の現在本人・failed認可や物理sweepは別境界であり、今回の原因ではない。

対象はP2d-2-D/JB-01の再訪・失敗回復、共有P2d-1-Dの表示。上限増加や全件取得では修正しない。P2d-3の親子job・集合固定は追加しない。

## 最小の読取契約案

未完了と完了履歴をqueryで分離し、どちらにもkeyset cursorを付ける。未完了はqueued/running/failedの全保管対象、完了履歴は既存どおりcreatedAtが90日以内のsucceeded。古い未回収intentを履歴期限で消さない。

`PurgeRepository.list`を次の型付きportへ置き換える案をManagerへ提案する。

- `page(accountId, { scope: unfinished | completed, before?: { createdAt, id }, limit }, since)` → 有限rowsとnextCursor。
- `summary(accountId)` → 未完了件数、queued/running件数、failed件数、代表する実行中1件。SQL集計/有限取得で返し、全metadataをNodeへ読み込まない。

件数はserver固定の小page（候補50＋hasNext判定1）。clientに任意limitを指定させない。cursorの日時/ID/scopeはtransportでshape・長さを検証し、accountIdは現在sessionからのみ決める。順序は`createdAt DESC, id DESC`。更新で変わるupdatedAtをcursorにせず、同時刻の抜けも防ぐ。cursorは認可証明ではない。

公開`listNotePurgesFn`は検証済みscope/cursorを受け取り、summaryとpageを返す。schemaは既存`hollowSchemas`、DTOはapplicationへ置き、RSC server-fn splitの既存規約を維持する。各読取は同じ短いUoWで本人と結果を照合し、storage I/Oを入れない。破壊command/worker/claim/quota/90日pruneは変更しない。

## UIとpoll

初回は未完了を優先表示し、「未完了 N件」「完了履歴（90日）」を明示する。新しい成功100件があっても元V1のfailedが最初に表示される。未完了自体が50件を超えても「次の結果」ですべてへ到達できる。完了履歴も同様にページを進め、成功履歴を消して解決した扱いにしない。

- ページは置換表示し、全ページを無制限appendしない。先頭へ戻る導線を付ける。
- pollは現在pageだけでなくserver summaryの未完了件数で決める。failedだけでも継続し、完了履歴ページを見ていても未回収の存在を表示する。
- 現在pageのfailed→running→succeededはIDで比較し、更新noticeとinvalidateへつなぐ。成功で未完了一覧から外れるときは「一覧から消えた」だけを成功証拠にせず、既知IDの状態を有限に再確認するか、同読取responseにこのpageで直前表示したIDの最新結果を返す。照会IDは表示page分の上限を持ち、毎回本人を確認する。
- 新しい未完了がpage先頭に増えた場合はsummaryと「最新へ戻る」を示す。pollが利用者の読んでいる古いpageを勝手に置換しない。取消/切替/unmount後の古いresponseはgenerationで無効化する。
- retryは既存の親所有optimistic/pending/errorを維持し、一つの実要求に絞る。成功/受付不明後に現在pageとsummaryを更新する。ページ外へ移ったことを完了や復元可能と推測しない。
- `TrashList`の受付不明reconcileはpageに対象がないだけで解除しない。既知purge IDがある場合は本人限定の有限ID照会で確認できる。cursorとは別に任意全件ID配列を受け取らない。

`ImportTicker`も返されたpageから総件数を数えない。summaryのactiveCountと代表1件を使い、未完了の一部しか表示していないことによる過少計数を防ぐ。toastは実際に観測できた状態遷移だけから出し、page外の全件完了通知を新保証にしない。未完了0になったときだけ回収pollを停止する。現在の通常ticker全体の周期を刷新しない。

## 変更面と回帰

主な変更先はpurge repository port/adapter、applicationのlist/限定ID読取DTO、transport schema/serverFn、PurgeHistory/状態helper、ImportTickerのpurge部分。schema migrationや依存更新は不要見込み。有限ID照会を追加する場合も現在本人・同intentの読取のみで、新しい操作権限は与えない。

| 対 | 確認する結果 |
| --- | --- |
| 元独立再現 | 実要求の古いfailed1＋新succeeded100、再訪でfailedが見える→手動retry→実完了表示。両routeで同じ結果 |
| 多数未完了 | 101件以上、同時刻ID、全page到達/重複なし、途中完了/新規追加でも残件案内・先頭復帰可能 |
| 完了履歴 | 100件超もcursorで取得可能、90日境界と古い未完了を分離、本人以外拒否、不正cursor/照会ID拒否 |
| poll/表示 | 成功しかないpageでもsummary未完了ありなら継続、failed→自動回復/手動回復、完了後停止、旧page responseで最新表示を戻さない |
| 既存UI | retry多重抑止、通信失敗の退避表示、受付応答喪失、親reconcile、keyboard/390px、reload/SPA |

本体大量quotaや古い既存noteを改変しない。多数metadata/clockの対は隔離DB、実画面は新自己対象に限定する。未変更codec/SSRF/物理claim/FD/20版を全面再試験しない。P2d-2の最終独立報告で追加不合格があれば、正式委譲後に範囲を合わせる。

## 判断待ち

採用依頼は「未完了/完了の独立cursor page＋server summary＋表示中/受付済みIDの有限本人読取」という共有read portだけ。既存100件を増やすだけではなく、全対象への到達経路と全未完了の存在表示を用意する。実装・試験・環境変更は未実行。文書提出後は停止し、Verifierの返却と正式修正依頼を待つ。
