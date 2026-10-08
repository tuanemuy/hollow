# P4f-1 UI 限定独立静的レビュー

対象は commit `5a12d06856bc39bb2393a99552d225e000691bfb`。2026-09-27、製品実装に参加していない限定Verifierが読取で照合した。開始時と最終読取時のgit statusは管理文書 `.goal-implement/` のみ未追跡。製品の変更・テスト・ビルド・runtime・browser・DB・外部通信は実行していない。正式Verifierの環境所有には触れていない。

対象IDはP4f-1-B/G、既存影響P3e-B/P2a-E/P4d-2-E。静的確認から実UI合格や正式受入を出さない。主報告の試験結果は借用であり、独立再実行ではない。

## 判定と発見

既存の操作世代条件に関係する不整合候補を1件確認した。コード上の到達経路は下記のとおりで、実UI再現は未実行。正式Verifierへ限定した確認候補として返す。それ以外の読取範囲では、下表の責務に明確な逸脱を特定していない。

### UI-S1: ZIP受付中に作り直した同一文脈の選択が、旧要求の成功callbackで消える

- 対応条件: P4f-1-Gの操作世代、P3e-Bの旧success拒否。`design.md` のP3e選択文脈（特に445行の新selection消去防止）と既存選択状態を共用する接続に関係する。新しい受入条件ではない。
- 重要度: 中。未送信の選択を失わせるUI状態の競合。受理済ZIPの対象改変・追加生成・情報漏洩とは主張しない。
- 起点: `apps/web/app/components/zip/ZipSelection.tsx:166` の作成click。`zip.submit` に成功callbackを渡した直後、183行で確認dialogを閉じる。
- callbackは同file178–180行で `sameBatchContext(context, selection.currentContext())` だけを確認し `selection.clear()` する。`ZipProvider.tsx:174` のaccepted分岐が182行でこのcallbackを呼ぶ。
- `BatchContext` はactor ID/actor epoch/filter文脈key/context epochを持つが、選択ID集合の変更世代を持たない。`BatchSelectionProvider.tsx` の `change` は同一filter内の選択変更でcontext epochを進めない。
- ZIP受付中でも `BatchSelectionBar.tsx:83` のdisabledは `blocked || pending || selection.accepting || selection.unresolved` であり、ZIP Providerのpending/blockedを含まない。`ScopedNotesBoard.tsx:442` のselectionPendingも同様。旧batch受付のpendingとは別状態である。

確実なコード経路に基づく実UI確認手順:

1. 同一actor・同一filterの一覧でAだけを選択し、ZIP preview後に作成する。
2. A要求の正常受付応答が届く前に、閉じたdialogの背後にある選択barで「選択をすべて解除」を実行し、Bだけを選ぶ。route/filter/actorを変えない。
3. A要求の正常ACKを到着させる。
4. 現コードでは同じBatchContextなのでcallbackが真になり、Bの選択も `emptySelection()` に置き換わる。期待は、新たに作ったB選択へ旧Aの成功処理を適用しないこと。

選択bar内のtarget epochは全体選択readと確認UI用であり、このZIP成功callbackには渡されない。Confirmが閉じられアンマウントしても、Providerに渡したcallback自身は残る。ACK不明後の明示再送はcallbackを渡さない別経路なので、この候補は初回応答が遅延して正常到着する場合に限定する。

主報告のUI1は「preview応答保留→一覧離脱→復帰」の旧応答拒否と、actor A→Bの履歴応答拒否を扱っている。同一actor/filterのまま、受付ACK待ち中にID集合だけを変更する本経路は、その証跡では覆われない。実行を伴う再現・修正はこの担当では行っていない。

## 読取による責務確認

| ID / 責務 | 独立静的根拠 | 限界 |
| --- | --- | --- |
| P4f-1-B 固定選択とpreview | `batch/model.ts` の選択union上限500、filter key、subset、`BatchSelectionBar` の501案内と表示済み/全体操作の分離。`zip/preview.ts` の一意1–500件、actor付きconfirmation、itemsの50件slice | 500件の生成・性能・実SQLの全列挙は実行していない |
| P4f-1-B viewer / 非開示 | `BatchSelectionBar` はcanEdit外にZIPを配置し変更操作だけcanEditで限定。`zip/snapshot.ts` はverified actor・active note・現在scope readを検査。previewはnotFound/空本文を件数にまとめ、取得不能対象のtitleをDTOへ含めない | role/失権の実UI・実DB行列は未実行 |
| P4f-1-B 冪等 / 枠 | `zip/usecases.ts` はactor+commandを先に照会、digest違いを拒否、同receiptへ収束、空previewを未登録拒否。`libsql/repositories/zipRequestRepository.ts` のidleは非terminalをscope/format非依存で確認しZIP_ACTIVE/ZIP_BUSYを返す | UNIQUE・競合・停止実closeの証明は正式backend検証に委ねる |
| P4f-1-B/G ACK | `zip/client.ts` のsendZipは単発fetchで、確定拒否とunknownを区別。`ZipProvider` は送信前sessionStorage保存必須、同command/payload保持、保存失敗は送信しない。mountは復元だけでPOSTせず、照会・同要求再送は明示button | 実storage拒否/通信障害は主UI1借用のみ |
| P4f-1-G actor/context | `SharingActorProvider` の現在route actor/epoch、`ZipProvider`/`ZipHistory` のactor+epoch keyとcurrent/mount確認、historyのrevision、previewのcontext/op確認、`BatchDialog` のcontext付きfocus復帰 | UI-S1を除く静的整合。ABAの最終解放やReact実renderは未実行 |
| P4f-1-G pending / 状態 | ZIPの確認・受付・履歴操作にuseTransition、送信中表示とdisabled、受付は「要求を受け付けました」と表示。queued/running/assembling/stoppingと終端を区別し、native取得開始を端末保存完了としない | 390幅、keyboard、dialogの操作性は静的コードから合格にしない |
| P4f-1-G 新要求導線 | `client.ts` の型付きZIP_NOT_FOUND/CONTENT_CHANGED/SOURCE_CHANGED判定、`ZipHistory.tsx` の新しいZIP用Link、期限切れ/利用不可表示と一覧Link | 実artifact退役/復活防止の内部証明は担当外 |
| P4f-1-G 形式 | UIはHTML/Markdownとdisabled PDF（未提供）。HTTP selection enumもHTML/Markdownだけで、PDF POSTはusecase開始前に422。`ZipFormat`/保存optionsと履歴DTOは三形式を表現、`ZipAvailableFormat`はPDFを除外 | PDF処理完成の主張はない。汎用422の日本語は明確な拒否であり、専用PDF文言を追加条件にしない |
| P3e-B 旧一覧選択 | keyはactor/scope/query/tags/month/zoneを含みsort/layout/page/dayを含まない。一覧離脱のoutside keyとeffectが未送信選択を解除。ZIPはこの選択を共用 | UI-S1の受付後callbackに選択変更世代の不足 |
| P2a-E / P4d-2-E 共存 | `__root.tsx` はSharingActor→PDF→ZIP→Batch等のProviderを共存配置。`notes.jobs.tsx` はImportJobs/既存batch等にPdfHistory/ZipHistoryを併記。`ImportJobs.tsx:510`以降でactive件数加算、import/batch/PDF/ZIP通知を各状態で描画し各dismissへ接続 | PDF寿命/renderer・import本体・全ジョブ行列を再検証していない |

## 主報告から借用した証拠の範囲

`.goal-implement/phases/P4f-1.md` の最終38表と15:37/15:52/16:08/16:19以降のUI記述を読んだ。そこに記載された生proofや成果物は、この担当では開いていない。

- UI1（bundle b376b3d0）: owner/viewer preview、ACK明示同payload再送、自動POSTなし、390px/keyboard、媒体と保存style、failed-only retry、PDF/batch/ZIP通知と個別dismiss、actor A→B履歴応答拒否、previewのroute往復拒否。最新bundleで同じ対を実行したとは扱わない。
- UIR（bundle 4fe1f535）: 失権時の新要求Link、read回復後も旧ZIP拒否。実資源状態をこの静的レビューの結果として再主張しない。
- E2（bundle 6b3b7be5）: 最新の取得・通常dialog取消・履歴等。旧UI1の全項目がE2で再演されたとはしない。
- U2/N2/T2: 主のunit1282/Node315/規定checksを主実行結果としてのみ扱う。`zip/client.test.ts` は読取したが未実行。React競合UI-S1をこのpure transport testの成功で覆わない。
- 参照取り込み通知の独立dismiss、actor ABA最終解放、全変更外UIは主報告自身も未実証として分離している。

## 読んだ原文と終了

`brief.md`、`design.md` のZIP節/P3e関連条件、`plan.md` の対象5ID、`CLAUDE.md`、`spec/requirements.md`、`spec/scenario/export.md`、`organize.md` OR-09、`jobs.md` を照合した。原文EX-04の匿名閲覧者と、OR-09のサインイン済みWS viewerを区別した。未提供PDFの段階的接続は確定したP4f-1範囲に従った。

追加の好みや新要件に基づく欠陥指摘はない。書込みはこの報告一つだけ、製品修正なし。runtime/browser/DB/テスト/ビルド/秘密情報・旧proof操作なし、子agentなし。報告書込みの完了後に全操作停止し、未回収execは0としてrootへ返却する。
