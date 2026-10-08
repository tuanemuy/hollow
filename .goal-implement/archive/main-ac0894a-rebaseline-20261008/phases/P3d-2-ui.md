# P3d-2 単一移動 UI 実装補助

## 結果と検証境界

OR-12、P3d-2-A/F と G の UI 接続を実装した。詳細の移動先選択、有限な影響表示、確定・取消、再確認、現在認可後の所属 URL 更新を対象とする。製品合格は未判定。型・テスト・整形・ビルド・ブラウザは未実行である。

入力は [採用設計](../design.md#p3d-2の有限確認と所有移管)、[接続案の末尾補足](P3d-2-plan.md)、[OR-12](../../spec/scenario/organize.md#or-12-ノートの所属先を移動する)、現在の `application/move/ports.ts`、`moveInput.ts`、`moveServerFn.ts` である。source 読取と実装の時点は 2026-09-11T13:44:36+09:00〜13:55:58+09:00。公開 port と transport schema は変更していない。

## 変更 path

| path | 責務 |
| --- | --- |
| `apps/web/app/components/move/NoteMoveAction.tsx` | 存続する詳細親の read・pending・確定・error・再確認・invalidate |
| `apps/web/app/components/move/MoveDialog.tsx` | native dialog、Escape、取消、focus return |
| `apps/web/app/components/move/MoveImpact.tsx` | 閲覧者差分、タグ対応、保存容量、資源内訳、終了試行の表示 |
| `apps/web/app/components/move/model.ts` | 所属 identity、preview と詳細の一致、有限 transport copy、応答 guard、error 分類、bytes 表示 |
| `apps/web/app/components/move/model.test.ts` | 純粋13ケース。作成のみ、未実行 |
| `apps/web/app/components/move/move.css` | 390px を含む可変幅・折返し・スクロール・focus・pointer 対象のスタイル |
| `apps/web/app/routes/notes.$noteId.index.tsx` | 移動入口、検証済み workspace query、現在認可済み詳細からの canonical 化 |

報告文書は本書のみ。`index.css` の import と root manifest 登録は主担当が所有する。`components/tag`、NoteEditor、iframe、backups、domain/application、presentation、schema、依存は変更していない。

## 接続した分岐

### 候補と確認

候補は `listMoveDestinationsFn` が返した現在の編集可能先を使う。候補と gained/lost は各 page を置換し、次の50件と最初の50件への操作を持つ。全 member の配列を蓄積しない。人物 label、tag name、scope name は React の text として表示する。

preview には現在の移動元・移動先、閲覧できるようになる人・できなくなる人、移動先の同名タグへの付け替え、同名なしの解除を表示する。閲覧者の喪失とタグ非継承を明示する。現在 used/limit/after と expected の移管差分は分け、bytes は丸めない。原本/current/held/grace/媒体予約・負債/参照予約・負債と共有原本の内訳、媒体・参照の終了試行数を示す。

表示時点で容量を超える場合は確定を無効にし、容量を空けた後の再確認を案内する。現在 quota の最終検査、現在両側 edit、資源・tag・membership 条件の比較は server の責務であり、UI の表示を認可に使わない。

### 現在文脈と旧応答

read と mutation は note ID/version、現在 scope、canEdit、URL と request symbol を照合する。異なる URL・note・scope・版の success/catch を適用しない。未 mount の応答を適用しない。単一の request 枠は対応する処理の finally だけが解放する。

preview の source と detail DTO の現在 scope/version が異なる場合、preview を表示せず現在状態の読直しへ戻る。ページ読取中の `MOVE_CHANGED`、現在権限喪失、変換拒否でも旧 preview と人物ページを破棄する。通常の read failure は再取得として扱い、移動を実行したと表示しない。

### 確定と再認可

確定は元の `MoveExpected` を使用する。transport の配列だけを有限 copy し、容量表示や client で再計算した条件を混入させない。React `useTransition` が pending を持つ。移動の成功を optimistic に先取りしない。POST は成否にかかわらず `router.invalidate()` に接続する。

確定応答の後に `getNoteFn` を呼び、現在認可済みの `note.scope` を得た場合だけ所属 query を更新する。personal は `workspaceId` を除く。mutation 応答の owner を直接 navigate に使わない。再取得失敗は確定応答受信済みと現在表示失敗を区別し、新所属名を error に含めない。

`MOVE_CHANGED` は変更なし・再確認、`MOVE_QUOTA` は全非変更、`MOVE_CONVERSION_ACTIVE` は理由付き拒否を表示する。NOTE/SCOPE の notFound、unauthorized、forbidden は現在利用不可とする。system/transport 不明は未確認とし、POST を再送しない。未確認状態は同 note の invalidate による版・scope 更新だけでは消さず、利用者による現在状態の再取得後に解除する。新たな移動確認はそれまで開始しない。再取得は過去要求の成功証明とは表示しない。

詳細 route は `scopeSearchSchema` で workspace query を検証する。既存 blocking detail loader の `getNoteFn` が現在認可を確認した後だけ canonical 化する。別 note の pathname では更新しない。初期 canonical navigate の失敗はページ読直しとして表示する。

### UI ownership と対象外

移動入口は現在 `note.scope.canEdit` がある詳細読取画面だけに置く。親の instance は同 note の canEdit 変化で移動結果の未確認状態を不要に破棄しない。閲覧専用では新しい移動操作を出さない。

編集画面内の入口、未保存の自動 save/discard、既存 dirty guard の変更はない。既存本文・タグ・履歴・参照・trash・編集リンクの責務を維持する。native dialog と通常 button で pointer/Space/Enter/Escape と focus return を接続する。実際の focus trap、390px、スクロール、取消、pending は未検証である。

P3e 選択集合・一括処理・親子 job、P4 公開 URL・共有操作、P5 外部機能は追加していない。ノート ID や本文を変更する処理は UI に持たせない。

## 作成した純粋テスト

`model.test.ts` は13ケースを持つ。

- personal と workspace の同一文字列 ID の区別。
- preview の note/version/current scope 一致と不一致。
- scope 名に依存しない workspace source 比較。
- expected transport の値保持・配列 copy・容量表示の非混入。
- absent と revision 付き0 holding の保持。
- 現在 context/request/mount の全一致と旧応答の拒否。
- 解放済み request の拒否。
- `MOVE_CHANGED` の再確認分類。
- quota と conversion の区別。
- 現在アクセス喪失の分類。
- transport/system の結果未確認分類。
- validation の明示拒否分類。
- 1 byte と容量境界付近の非丸め表示。

実行件数は0。既存 API の読取とソース上の分岐確認は、型成功・実 UI 成功・DB 成功の根拠にしない。

## 主担当へ残す確認

主担当は全体 type/lint/format/unit/build、CSS import と manifest、同 bundle の実 UI を確認する。特に有限候補/audience の次 page、確定前の同数 membership 入替・別 tab の移動、capacity/tag 変化、access loss、POST 応答喪失後の再取得、canonical URL と戻る操作、390px/native dialog の keyboard/focus、既存 tag/history/trash/edit の接続を確認する。新しい受入条件ではなく P3d-2-A/F/G の未実行部分である。

共有 port の不足は見つかっていない。実行で確認した既知不具合はない。未実行の型・UI・整形に成功の主張はない。doc-style/markdown-style に従い、実装と未実行の境界を分けている。

## 保全と返却

操作は必要な source/設計/skill の限定テキスト読取、現在時刻の取得、専有 path と本書への apply_patch のみ。test/type/format/build、DB/storage、browser/server/process、helper、依存、秘密、旧環境/recovery/D01、全体管理、goal API、git stage/commit を実行していない。削除はない。

本書の全文確認後、コード・文書を含む全操作を停止し、専有7 product path と本書を主担当へ返却する。以後の整形・検証・統合 commit は主担当が所有する。
