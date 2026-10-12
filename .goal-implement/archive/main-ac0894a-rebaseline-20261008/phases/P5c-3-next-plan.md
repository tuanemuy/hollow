計画日時: 2026-10-05T22:20:38.970766+00:00

# 通常再生成の次slice案

状態: 読取計画。実装未着手。UI候補の独立レビューを優先し、UIhelpers/runner/C/Bは停止・無変更。製品/root/pure/DB/runtime/browser操作0。対象R03/R08/R10、IM-06/IN-07。

## 判断と順序

S1の保存・候補、S2の実取得/opaque入力終了、S3のlocal text/HTML/Markdown version1を維持し、次は **残形式の入力寿命→機械/共通本文→Drive受付/worker/UI** の3sliceに分ける。番号・criteria・正式資源はManager採用で固定する。全形式/Driveを一度に既leasedText predicateへ足す実装はしない。

公開sourceの直接差:

- `llm/inputStage.ts:leasedText` と `llm/current.ts:currentLlmSource` はlocal-original/固定version1に限定。`adapters/node/regeneration/input.ts` の通常prepareもtext/html/markdown限定。version2文書/3画像/4全ページPDFは `llm/worker.ts` の既preparer経路に残る。既P5b形式成功を新receipt寿命接続の成功へ転用できない。
- `adapters/node/llm/config.ts:createNodeLlm` はNodeRegenerationInputへinput/localのみを注入する。`regeneration/services.ts` と `drive/sourceProvider.ts` はDrive取得契約を持つが、通常Drive factoryの返却servicesにsource providerがなく、通常LLM currentはdrive-recordを拒否する。
- `llm/request.ts:admitLlm` はlocal-original/null/0を保存する。候補読取 `regeneration/read.ts` とmachine保存型は存在するが、Drive正規受付/機械処理/候補UIから通常本文採用までの接続はない。既 `LlmNoteAction` はlocal OriginalとLLM/PDF preview向け。

## Slice A: local残形式の入力寿命

完了像: 正規 local再生成のOffice、strict-text PDF、画像、全ページPDFに、同receipt/source/owner/versionのclaim→prepare→実inputfinish→dispatch/terminalを接続する。PDF pending分類とready manifestは別段階として扱い、previewでquota/本文lockを始めない。legacy本文/opaque前任区分を維持する。

exact変更候補:

- `packages/core/src/application/llm/{ports.ts,services.ts,inputStage.ts,current.ts,worker.ts,pdfPreview.ts,pdfClassificationPorts.ts}`
- `packages/core/src/application/regeneration/{services.ts,memory.ts,current.ts}`
- `packages/core/src/adapters/node/regeneration/{input.ts,memory.ts}`
- `packages/core/src/adapters/node/llm/{config.ts,documentPreparer.ts,imagePreparer.ts,pdfPagesPreparer.ts}`
- 比例追加test: `packages/core/src/application/llm/inputStage.test.ts` と新 `packages/core/src/application/regeneration/localFormats.test.ts`

共有契約追加: prepareTextだけのportをversion2/3/4の具体prepared unionへ拡張する案を事前採用する。input leaseがretainする原本buffer、Worker、prepared PDF/image manifest、object pinとexecutionの各所有を別に記録する。closed0/consume/ACKは各実終了の正規proofでのみ進め、全prepared型への無検証castやversion一般による解放を禁止。新保存列/DDLは現時点では提案しない。

意味ある検証: 各新branch正常1対、文書/image/PDFごとのprepare失敗・実Worker閉鎖、prepare中取消とfinish応答不明保持/同値回復の共有境界対。PDFはpreview失効→dispatch0とready全ページ→論理quota1を分ける。generatorはfake、実parser/renderの寿命はnative直接対として区別する。旧text/S1–S3全suite再演を要求しない。

## Slice B: 機械再生成と共通本文採用

完了像: 既machine保存型のHTML/Markdown再生成を正規永続job/receipt/編集lockへ接続し、現在本文の版保存→全量採用→直前本文undoを行う。LLMのrecipe/quota/既undoは再設計せず、共通化は現在認可/version/原本identity/atomic本文採用/参照/projection/タグ・公開設定・共有リンク保持に限定する。他形式の機械経路を増やす場合はschema/処理方式を別判断にし、音声へ広げない。

exact変更候補:

- 新 `packages/core/src/application/regeneration/{request.ts,worker.ts,control.ts,completion.ts}`
- `packages/core/src/application/regeneration/{ports.ts,current.ts,services.ts}`
- `packages/core/src/application/llm/{completion.ts,control.ts}`（共通採用関数を使う必要箇所だけ）
- `packages/core/src/application/import/processJob.ts` と `packages/core/src/application/note/commitNote.ts`（既body/projection/ref採用を再用する境界確認後、必要な最小差だけ）
- 新 `packages/core/src/application/regeneration/machine.test.ts`

共有契約追加: machineの受付idempotency/recipe元版/undo許可と現在revision fence、入力finishと本文採用前のfinal currentを確定する。job終端・失敗時旧本文保持・cancel/timeout・queued never-readをLLMと同じ意味へ結ぶが、machineにLLM quota/dispatchを作らない。

意味ある検証: HTML/Markdown各正常採用→undo、stale note/version/権限取消→旧本文保持、sanitize/projection失敗→部分採用0、取消/retryのsamecommand receipt、actor本人historyのみ。本文/タグ/公開/共有link/revisionは正規APIと同Txから照合し、SQLでfixture前提を飛ばさない。

## Slice C: Drive製品受付・候補UI・本文採用

依存: A/B受入、進行中Drive UIの同bundle接続、P5d account shell/current/read補正の正式受入。未受入P5dをmainへ先取りしない。

exact変更候補:

- `packages/core/src/application/regeneration/{request.ts,worker.ts,control.ts,completion.ts,current.ts,source.ts,read.ts,services.ts}`
- `packages/core/src/application/llm/{request.ts,current.ts,worker.ts,pdfPreview.ts}`
- `packages/core/src/application/integration/drive/{ports.ts,runner.ts,control.ts}` と `backup/cancellation.ts`（disconnectDriveの正規取消入口とsource consumer fenceを接続）
- `packages/core/src/adapters/node/drive/{factory.ts,sourceProvider.ts}` と `packages/core/src/adapters/node/llm/config.ts`
- `apps/web/app/server.node.ts`（通常DI/runnerの必要配線のみ、追加exportを前提にしない）
- 新 `apps/web/app/presentation/regenerationServerFn.ts` と新 `apps/web/app/components/hollow/RegenerationSourceAction.tsx`
- `apps/web/app/components/hollow/{LlmNoteAction.tsx,NoteContent.tsx}` と `apps/web/app/routes/notes.$noteId.index.tsx`（正規メニューと候補導線の最小差）
- 新 `packages/core/src/application/regeneration/driveRequest.test.ts` と新 `apps/web/app/components/hollow/RegenerationSourceAction.test.tsx`

共有契約追加: 選択immutable recordをsamecommand/bindingへ確定し、note編集者/記録本人same-sub Drive資格/実行者本人OpenRouter+quotaを分離する。binding/instruction/model/PDFchoice/current revisionを受付digestへ含める。S2 data global1/資格owner1、control global2/account1、caller/close/ACKとbuffer保持を正式runnerへ接続する。unlink/relink/retarget/退会/WS失権/purgeの全入口fenceの必要差を固定する。現在head/folderへの差替え・Drive失敗localfallback0。外部final観測と本文DBcommitの分散transaction保証は付けない。

UI: 25件keyset候補/immutable record選択、本人と他メンバー向け再連携/再backup理由、本文置換警告、pending/未知受付のcurrent読取と同intent明示再送、取消、完了→undo。画面離脱でjobを止めず、編集lockと本人履歴を正規DTOで表示する。SDK/privatefixtureをDOMへ差し込まない。

意味ある検証: owner/editorから他人記録を選ぶ正常対、viewer拒否、記録者WS脱退だけでは失効しない対、同sub relinkとsub変更/unlink/deleted recorder、元parent/size/hash/version不一致と取得後final-check変化、取消/失権の各source read/dispatch0境界、取得失敗localread0、月枠1論理消費、全量本文採用/失敗維持/undo。S1候補単体・S2隔離nativeは借用し、通常API→binding→native→本文の新接続を直接証明する。

## 比例資源・採用gate

各sliceでcandidate・exactpaths・API差・case-to-condition・fixtureと新root/DB割当を先にManager採用する。暫定検証枠は新persistent0700 root192MiB、logicalDB最大4/合計80MiB、original fixtures8MiB、正常Native Worker最大6/同時1、Drive data1/control2。新PDF render subprocessが既枠に収まることは未確認なので、Aの詳細化で公開sourceから自身子数/closed/pipeとmemory上限を固定して追加必要なら実行前提案する。

各pure/test30秒、appケース10秒/群180秒、native群300秒/外360秒、自己既知PID/PG stop10+10/pipe10というS3の比例形を暫定値とする。case数の目標は設けず条件に結び付ける。buildは新candidateから別archive256MiB/600秒、旧B/privateは再利用0。外部資格/Google/OpenRouter/費用は引き続き未許可で、loopback/fakeと実外部を明確に分ける。

今はこの計画だけ保存しwriter停止。UI起動preflightの返答へ戻り、新helper/製品/実行は開始しない。
