# P4d-2-D 本人単件PDF UI 補助

2026-09-20 JST。Manager委譲の本人向けパネルのみ。P4d-2全体の受入・実PDF生成成功を示す報告ではない。

## 変更対象

- `apps/web/app/components/pdf/PdfRequestPanel.tsx`
- `apps/web/app/components/pdf/model.ts`
- `apps/web/app/components/pdf/model.test.ts`

公開APIは固定された `PdfRequestPanelProps` と `PdfRequestPanel`。共有DTO `PdfJobView` / `PdfRequestInput` は変更していない。goal-implementとManager Loopに従い、親永続化・HTTP・ジョブ画面・ticker・ルート組込み・環境は主担当へ残した。

## 実装

- 送信前にランダムUUIDを作り、親のpending保存callbackを呼ぶ。保存callbackが失敗した場合はPOSTしない。requestのthrowは応答不明として扱い、同じ識別子を保持する。
- queued/running中はpendingを保持。同actor/note/commandの終端確定、または明示rejectedだけ該当pendingを解除する。null照会は未受理の証拠とせず、未知状態から自動POSTしない。
- 再mountのpendingはGETのみ。既知のqueued/runningは2秒間隔の非重複照会を行い、照会不明では自動pollを止めて明示照会へ戻す。
- 新POSTが直接acceptedとなった当該mountのcommandだけ、自動取得資格を持つ。即時cached succeededと、queued/runningから通常pollでsucceededになる場合を含む。元POSTがunknownの場合・再mountで見つかった場合は明示取得のみ。自動取得資格はdelivery準備前に一回消費する。
- succeededかつavailableの場合だけdelivery準備を呼び、戻りURLはUUIDのidと完全一致する相対 `/api/pdf-deliveries/{id}` に限定。hidden anchorのdownload / target / relを指定してnative取得を開始する。HTTP応答や端末保存の成功は断定せず、失敗・不明時は明示取得を案内する。
- actor ID / actor epoch / note / mount / operation tokenとcurrentActorを結果採用時・callback前後・取得前に照合する。React 19 transitionを使い、busyは独自の当該operation所有状態から表示する。旧finallyは新operationのbusyを解除しない。
- 取消は進行中pollを置き換えられる。旧pollの結果は不採用とし、古いGETが実際に返るまでは次GETを開始しない。StrictModeのeffect再実行中に残ったGETも重複させず、必要な初回照会を待機する。
- 保存済み本文対象、編集中内容には触れないこと、未構成理由、期限、進捗・取消・明示照会・明示取得を表示する。ルート変更・本文保存/破棄・focus移動は行わない。native button、live region、focus-visible、狭幅の折返しを実装した。

## 限局検査

| 検査 | 実結果 |
| --- | --- |
| `pnpm exec vitest run apps/web/app/components/pdf/model.test.ts` | 2026-09-20 07:48 JST、1 file / 11 tests passed |
| `pnpm exec biome format --write apps/web/app/components/pdf/PdfRequestPanel.tsx apps/web/app/components/pdf/model.ts apps/web/app/components/pdf/model.test.ts` | 専有3ファイルだけ整形 |
| `pnpm exec biome check apps/web/app/components/pdf/PdfRequestPanel.tsx apps/web/app/components/pdf/model.ts apps/web/app/components/pdf/model.test.ts` | 3 files、exit 0 |
| 製品3ファイル全文確認 | 整形後に全文読取済み |

pure testsはpending/ACK状態、actor・epoch・mount・operation拒否、job identity/version/終端の非後退、terminal限定clear、delivery route拒否、取得資格と表示を対象にした。React effect・実native download・親永続化そのものの実行検証ではない。

## 主担当への引継ぎ

親はactor/note別pendingを保持し、actor epochとcurrentActorを同期させ、通知された終端jobも履歴へ残す。親のpending更新callbackは要求送信前に識別子を保持できる同期契約。本人ジョブ画面の履歴再取得とtickerは親の所有であり、このパネルは現在のcommandを表示する。

全体型チェック、実ブラウザー、390px/keyboard実操作、StrictMode非同期対、native取得/HTTP、保存済み本文の実PDF、DB・runtime・Chrome、独立検証は未実行。最終server認可・期限判定は既存主担当側契約を利用する。新しい受入条件や共有型変更は追加していない。

本報告も全文確認後、専有3製品ファイルと報告の所有を返却し、testを含む全操作を停止する。
