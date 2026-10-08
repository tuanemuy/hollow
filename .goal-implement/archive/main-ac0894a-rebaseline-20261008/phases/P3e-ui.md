# P3e 一括操作 UI 実装補助

## 状態と範囲

2026-09-11 15:40:23〜16:13:51 JST の限定実装記録。製品 14 ファイルと本報告を対象とする。コードの作成と読み取り照合までを行い、型検査・テスト・ブラウザ検証は実行していない。製品合格や P3e の受入完了を示す報告ではない。

正本は `.goal-implement/design.md` の P3e 採用契約、`plan.md` の P3e-A〜H、`phases/P3e-plan.md` 全文と補足、元 OR-09/JB である。公開 API は `application/batch/{ports,usecases,holding}.ts` と `presentation/{batchInput,batchServerFn}.ts` を参照する。新しい受入条件や上限は追加しない。

## 作成・変更ファイル

| ファイル | 責務 |
|---|---|
| `apps/web/app/components/batch/model.ts` | 選択集合、条件 identity、確認 payload、未確認応答の純粋処理 |
| `apps/web/app/components/batch/model.test.ts` | 純粋テスト 20 ケース。未実行 |
| `apps/web/app/components/batch/BatchSelectionProvider.tsx` | 一覧をまたぐ選択、受理要求、応答不明の同要求再送、観測対象の親 ID |
| `apps/web/app/components/batch/BatchSelectionBar.tsx` | 表示分・条件全体の選択、操作入口、固定集合からの確認 |
| `apps/web/app/components/batch/BatchDialog.tsx` | native dialog、見出し、pending、Escape、focus return |
| `apps/web/app/components/batch/BatchOperationPicker.tsx` | 有限タグ候補、明示作成、移動先候補、処理取消の明示同意 |
| `apps/web/app/components/batch/BatchConfirmation.tsx` | 50 件ずつの影響確認、除外、移動の合算、人物ページ |
| `apps/web/app/components/batch/BatchHistory.tsx` | 親・子履歴、待機取消、失敗対象の再確認と再試行 |
| `apps/web/app/components/batch/useBatchActivity.ts` | 親件数、最大 50 親の summary 観測、終端通知 |
| `apps/web/app/components/batch/batch.css` | 操作バー、dialog、履歴、狭い画面の折返し |
| `apps/web/app/components/hollow/ScopedNotesBoard.tsx` | 既存親 ownership と選択 UI の接続 |
| `apps/web/app/components/hollow/NoteList.tsx` | Link と独立した選択 checkbox |
| `apps/web/app/components/hollow/ImportJobs.tsx` | 既存履歴・ticker と一括操作の併記 |
| `apps/web/app/routes/notes.jobs.tsx` | 既存 blocking loader に親履歴 seed と validated `batchId` を接続 |

専有外の製品、root、CSS import、presentation、core、schema、全体管理文書は変更していない。既存の本文・タグ・ゴミ箱・ページ追加の所有関係を維持する。

## UI の接続内容

### 選択集合と確認

P3e-A/B/G に対応する。選択は明示 ID の順序付き集合で、最大 500 件を保持する。表示済みページの選択と、現在条件全体の明示全選択を分ける。全体取得の 501 sentinel と既存選択との union 501 は、選択を変えず拒否する。除外後は部分集合と表示し、新しい一致結果を自動追加しない。カレンダーの全体取得は日 cursor を除いた月条件を使う。

選択条件 key は利用者、scope、query、tags、month、zone を含む。sort、layout、追加 page、day 展開だけでは集合を解除しない。一覧離脱と reload では保持しない。条件 A→B→A でも古い応答が適用されないよう epoch と mount 状態を照合する。受理済み job は選択解除で取り消さない。

確認は 50 件ずつ取得し、表示用 MovePreview は現在ページだけに置く。確認 payload は最大 500 件で、excluded ID も維持する。対象の title や scope を excluded 表示へ補わない。全件確認前、再確認が必要な状態、全件 excluded では開始しない。viewer は選択と未提供 download の案内だけを表示し、mutation 操作を出さない。

### タグ・移動・ゴミ箱

P3e-C/D/E と P3d の既存契約を接続する。タグ候補は usage 0 を含む有限 manager reader を使う。明示 create と既存 ID 指定を分け、表示名を UI 独自規則で同一視しない。タグ binding の履歴は固定 ID と当初の入力設定を表示し、削除・merge 後の同名再作成を示さない。

移動先は選択 ID の固定順で候補を調べる。現在の `getNoteFn` が返す scope/canEdit を確認してから既存移動先 API を呼ぶ。既知の非対象理由だけ次へ進み、未知の失敗では停止する。候補と人物は各 50 件のページ置換であり、全 member を配列へ展開しない。

移動合算は共通 `aggregateMoveAmounts(expected[])` を使う。共有 bundle の base 不一致では確認を無効にし、先頭からの再確認を案内する。合計は全対象成功時の移管見込みとして表示する。容量予約や実行成功を意味しない。現在容量などの個別情報は既存 MoveImpact に接続する。

ゴミ箱操作の `cancelProcessing` は明示同意の値を固定する。同意なしで実行中対象が含まれる場合は、その対象が失敗し得ることと他対象の継続を警告する。全体確定を追加で無効化せず、対象を無言で取り除かない。取消を許可するには設定へ戻って再確認する。

### 受理・履歴・再試行

P3e-B/E/G/H に対応する。初回の requestId と payload を root 側で保持する。応答不明では同じ要求だけを再送し、新しい requestId を発行しない。受理を全対象完了と表示しない。mutation は React pending を持ち、終了時に `router.invalidate()` で調整する。

履歴は親 50 件、子 50 件のページで表示する。子の `attemptNumber` を parent generation と分ける。失敗対象の再試行は固定 source/operation と最新 generation を用い、再 preview した excluded を含む同じ確認 payload を送る。主担当の retry dedup API を利用するが、その実行成立は本補助では確認していない。90 日超の failed 子が excluded になる判定は backend の責務である。

待機取消は queued だけを対象とする。running と成功を取り消した表示にしない。cancelled に失敗理由を補わない。古い一覧 read が mutation 後の状態や失敗表示を上書きしないよう、context epoch と mutation revision を照合する。

`notes.jobs` は blocking loader を維持する。受理済み親への入口に optional UUID `batchId` を使う。既存 import 入力へは `scopeSearchSchema.parse` で抽出した scope 条件だけを渡す。

### 通知と後続境界

親件数は `batchActivityFn` の値を一度だけ既存 ticker に加算する。子件数を active job 数へ加えない。終端確認は主担当提供の `watchBatchesFn({ ids })` を使い、最大 50 親の summary だけを取得する。欠落した ID を成功と解釈しない。本 UI の受理・再試行 ID と観測中の親を保持し、未観測親の個別完了を断言しない。

P4 の公開・export と P5 Drive は未提供と表示する。架空の job、artifact、download 成功を作らない。P3e-F の charge、共有 companion、writer fence、実行時現在認可と原子的変更は backend の責務であり、UI の表示で代替しない。

## 統合時の残作業

`BatchSelectionProvider` の export は `apps/web/app/components/batch/BatchSelectionProvider.tsx` にある。現在の userId 読取は BrowseContext に依存する。一方、BrowseProvider は Shell の route 離脱で unmount するため、これを内包した配置では root 永続 receipt を満たさない。主担当が validated router matches からの userId 取得へ接続し、root へ provider を配置する。既存 palette と BrowseProvider 自体は移動しない。この統合は本補助の専有外で、未完了である。

主担当は `batch.css` の import、batch server-function manifest、provider が必要な board/history/ticker を包む配置を接続する。これらは本補助では変更していない。

主担当通知の trash expected には `processingFingerprint` が追加される。UI は preview の expected を保持して送るため、表示や payload の手組みを追加しない。純粋テストの trash literal への固定値補完は主担当が担当する。active job 入替と取消同意の実検証・修正は主担当の範囲で、本補助の検証結果ではない。

## 作成した純粋テスト

20 ケースを作成し、実行は 0 件である。

- 空集合、表示分の安定 dedup、500 件、union 501、500 件時の重複。
- 全体選択からの部分解除、後続一致の非自動追加、再全選択時の既存非一致保持、whole identity。
- 条件 key の sort/layout/page/day 非依存と、利用者/scope/query/tags/month/zone 依存。
- カレンダー全月条件、personal owner と creator の区別。
- 表示用 move 情報だけの除去、excluded の情報制限、固定 request/payload/order。
- retry の attempt/base 保持、応答不明の分類。
- 表示済み calendar ID と通常一覧 ID、ABA と unmount 後の旧 ticket 拒否。

## 未確認と返却境界

型・Biome・format・unit・build・実 browser は未実行である。native dialog の focus trap/return、Escape、Space、390px、pointer、実 RSC 遷移、root user 切替、同時 mutation、応答喪失の実経路は主担当の統合検証に残る。読み取り照合を実 UI 再現や製品合格と扱わない。

通知は最大 50 親の観測範囲に限る。未観測の外部親すべてについて個別終端通知を保証しない。create binding の現在表示名を DTO が返さない場合は固定 ID と当初設定を表示する。履歴の時間は「受付から最新更新まで」であり、実行開始時刻を推測した処理時間ではない。

DB、storage、browser、server、worker、process、旧 temp、recovery、秘密ファイル、依存、helper、git、hash、goal API は操作していない。テストや型確認用の自己 process も起動していない。個別 stage/commit は行わず、統合候補は主担当が管理する。

本報告の全文確認後、専有 14 製品ファイルと報告を主担当へ返却し、コード・文書を含む全操作を停止する。
