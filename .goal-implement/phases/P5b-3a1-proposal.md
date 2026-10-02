# P5b-3a1 PDF分類protocolの最小詳細案

## 結論・判断点

2026-09-29。製品基点は `f6ecdc515445bd8ae7b34dccd9c1cbdf73118699`。本書だけを編集し、製品・P5b-3a0候補・新旧proof・管理正本は変更/実行していない。独立Verifierが環境を所有する。goal-implement/manager-loopに従う静的提案であり、spec/spec-implement、goal API、Node/test/build/DB/native/browser/外部接続0。

推奨は、uploadでは既conversionへ「PDF用途未確定」を明示する枝を加え、原本保存直後に空note/job/予約をdurable受付すること。分類完了後にtextかpagesの一方へ一度だけsealする。IM06では別の短命preview receiptを使い、用途確認→本人のモデル選択→本文置換確認の順にする。previewは本文編集lockでもLLM受付でもない。確認transactionで初めて既conversion/予約を作る。

Managerの判断が必要な差は、(1) 未分類conversionの専用union/一回seal、(2) 新 `llm_pdf_previews` 一表と所有/purge接続、(3) previewの有限期限/枠、(4) 健全strict対象外だけをpagesへ分類する型。前gateの二表移行案だけでは足りず、conversion/dispatchの限定再構築＋preview加算表が必要。旧0036の一表例外は流用しない。利用者にDDLを選ばせず、本書の最小案をManagerが採否判断する。

## 原文と現コードの根拠

[IM-01](../../spec/scenario/import.md) step5/6はupload完了時に空note/処理中jobを作り詳細へ移動、長時間処理は離脱後も継続する。[IM-06](../../spec/scenario/import.md) はモデル・追加指示を選んでから本文置換を確認し、実行中だけ編集禁止。[IN-02/03](../../spec/scenario/integration.md) は用途別設定/解除、[JB](../../spec/scenario/jobs.md) は本人履歴、queued取消とrunning完了の区別、権限失効等の取消を規定する。これら3原文を全文再読した。

静的に確認した現実装は次のとおり。

| 実path | 現在の契約・提案への制約 |
| --- | --- |
| `packages/core/src/application/import/acceptUpload.ts` | storage.put/detect/projectionはUoW外。最後のTxでnote/original/job/conversion/予約を作る。一般catchはupload失敗としてstorage.removeするため、保存後の分類失敗をここへthrowすると原本保持に反する |
| `packages/core/src/application/import/withObjectOwner.ts` | upload ownerの寿命を外側へ束縛。これを120秒の同期分類へ延ばして返答を遅らせない |
| `packages/core/src/application/llm/request.ts` | PDFは現在recipe2/prompt1でmodelを受理時固定。command digest/idempotency、noteVersion/epoch、activeForNoteをTxで検査 |
| `packages/core/src/adapters/libsql/llmSchema.ts` / `repositories/llmRepository.ts` | quota reservationのFKはconversion必須、月はconversion.createdAt。claimはglobal2/account1/unknown保持。モデル・recipeはimmutable。未分類を仮のrecipe2やmodelへ偽装できない |
| `packages/core/src/adapters/libsql/repositories/jobRepository.ts` | 機械claimはllm_conversions所属を除外。別intakeだけを先に作ると除外不足になる |
| `packages/core/src/application/llm/{current,worker,control,read}.ts` | 原本/現在role/epoch/版/取消再照合、実close後終端、非再送回復、本文lock/undo、command receipt。新branchでも維持 |
| `apps/web/app/components/hollow/LlmNoteAction.tsx` | dirty/uncertain route確認、現在actor世代、pending/GET receipt、自動再POSTなし。現在用途はformatから推定するためPDF preview DTOが必要 |
| `packages/core/src/adapters/node/llm/{execution,runtimeOwnership}.ts` | 同account1、global2、unknownがあれば次を開始しない。通常logoutは既受理conversionを取消さない |
| `packages/core/src/adapters/libsql/repositories/{purgeRepository,objectOperationRepository}.ts` | conversionとobject writerはpurge pinになる。新previewは現在のpin集合に存在せず、単なるメモリAbortControllerでは保護不足 |

## 二案の比較

| 案 | 利点 | 問題/判断 |
| --- | --- | --- |
| A: upload前/受理前の分類receiptを全経路に必須化 | conversionは従来どおり完成contractだけ、nullable枝を増やさない | 原本upload後に最大120秒待ってnoteを作るとIM01違反。ブラウザ分類は権威にできずserver再検査が要る。別durable intake→後でconversionではquota FK/予約月・優先順位・機械claimを変更するか別正本が要る。同期I/OをTxへ入れる解決は不可 |
| B: uploadは未分類conversion、IM06だけ短命preview（推奨） | upload即note/job/予約、既単一job/current/取消/UTC受理月を維持。IM06は用途を確認して任意モデルを選べる。previewにLLM job/quotaを捏造しない | conversion CHECK/mapper/identity triggerに新明示枝、新preview一表/owner/purge hookが必要。影響は隠さず比例検証する |

Aをasync receiptで補修する場合は、実質Bのintake状態を別表に移すだけで、quota reservationの参照先変更まで増える。従ってBを推奨する。一般目的job基盤、別quota正本、HMAC鍵、新tokenサービスは作らない。

## 1. 分類結果の意味と内向き型

以下は未採用の具体shape。既text/Office/単画像の型を型alias変更だけで付け替えない。`SourceBinding` は内部値で、DTOにhash/storageKeyを出さない。

```ts
type PdfSourceBinding = Readonly<{
  originalId: string; sha256: string; bytes: number;
  noteId: string; noteVersion: number; ownershipGeneration: number;
  accountId: string; credentialEpoch: number;
}>;
type PdfChoice =
  | Readonly<{
      kind: 'strict-text'; preparationVersion: 2; promptVersion: 1;
      modelKind: 'chat-text'; preparedDocumentHash: string;
      pages: number; policy: 'strict-text-v1';
    }>
  | Readonly<{
      kind: 'pages'; preparationVersion: 4; promptVersion: 3;
      modelKind: 'chat-image'; manifest: PdfPageManifest;
      reason: 'VISUAL_CONTENT' | 'ORDER_UNPROVEN';
    }>;
type PdfClassification =
  | Readonly<{ kind: 'accepted'; source: PdfSourceBinding; choice: PdfChoice }>
  | Readonly<{
      kind: 'rejected'; closed: true;
      code: 'LLM_DOCUMENT_CORRUPT' | 'LLM_DOCUMENT_ENCRYPTED'
        | 'LLM_DOCUMENT_UNSUPPORTED' | 'LLM_DOCUMENT_NO_TEXT'
        | 'LLM_RESOURCE_LIMIT' | 'LLM_TIMEOUT' | 'LLM_SOURCE_CHANGED';
    }>
  | Readonly<{ kind: 'closure-unproven'; closed: false }>;
```

正常strictの全文準備成功は既recipe2のbyte/hashをそのまま使う。既adapterが返す有限 `LLM_PDF_VISUAL_REQUIRED` / `LLM_PDF_ORDER_UNPROVEN` だけを「pages検査の候補」へ写すが、これだけで健全と断定しない。strictが早い頁で対象外を返すと末尾破損をまだ検査していないため、別pages preparerが全頁policy・全描画・warning0・実closeまで検査した時だけpagesを返す。途中のCORRUPT/暗号/資源/unknown/その他unsupportedをpagesへ流さない。`catch(any) => image` は禁止。

空白全頁でstrictがNO_TEXTなら、その意味を変えてpages成功にしない。画像/混在/順序不明でtext-only対象外という分類と、PNG生成は可能でもform/action/未知policyにより非提供という分類は別。prompt4等の未実装placeholderは導入せず、recipe4/prompt3も採用後の実装だけに置く。

`PdfPageManifest` はsource/policy/renderer版・total・0始まり連続ordinal・各寸法/bytes/PNG内部hash・全体hashの閉じた有限集合。新pagesのhash規則は別に固定し、recipe2 hash/recipe3 identityは不変更。分類結果は利用可能なモデルの保証ではなく、profileは受理時の選択検証と実dispatch前に別途現在照合する。

## 2. Upload: 受付を待たせない一回seal

### durable順序

1. 既beginUploadとowner内put/形式判定を維持する。AIoff/未連携/未構成、HTML/MD、他形式は現経路のまま。新分類はPDF＋AI希望＋有効連携だけ。
2. 最後の短いUoWで現在actor/scope/reservation/epochを確認し、空note/original/jobと未分類conversionを同時に作る。同じjob ID・admission sequence・受理時createdAt/deadline・月間予約1を使う。モデル設定versionとtext/image両候補model IDをこの時点で固定する。上限超過は既失敗job/原本保持、分類未開始。
3. upload reservationをacceptedへ、原本をnoteに結び、既writerownerの実closeを待ってHTTPへnoteId/jobIdを返す。120秒の分類を待たない。note詳細/JBは「処理中・PDFの変換方式を確認中」。この時点で原本はdurable conversionのpinを持ち、upload ownerから隙間なく引き継ぐ。
4. 通常LLM runnerが未分類conversionをclaimする。既global2/account1/queue100/unknown拒否に含め、既conversion-job object owner下でUoW外のread/classifierを実行する。mechanical claimは既LLM所属除外がそのまま効く。
5. 完全分類・child実close後、短いUoWで現在owner token/runtime/version/cancelGeneration、note版/ownershipGeneration/原本identity、現在権限と連携epochを再照合。分類に対応する受理時model候補だけを選び、用途/recipe/prompt/model/manifestを一度sealする。候補2つは消して以後変更不可。設定変更があっても新defaultへ無言交換しない。元候補が現在非適合なら失敗、別用途/別modelへ切替えない。
6. sealされたcontractで通常準備・profile・dispatch/commitへ進む。同一job/予約/作業ownerの継続であり、月跨ぎでも新予約を作らない。source/role/epoch等の再確認はsealを根拠に省略しない。

upload失敗catchへ分類結果を戻さない。保存成功後のCORRUPT等は非同期conversionの終端失敗として原本/note/JBを保持する。応答喪失後は既batch/本人job取得で受付を確認し、同fileを自動再uploadしない。長い分類をHTTP通信切断/route離脱/logoutで取消さない。サービス再起動で所有が失われた未分類jobは、旧所有の実終了証明後に未送信失敗/取消と予約返却にし、新ownerで分類から自動再開しない案を第一選択とする（既非再送回復を拡張しない）。

### conversion unionと保存

```ts
type PdfCandidateModels = Readonly<{
  settingsVersion: number; textModelId: string; imageModelId: string;
}>;
type ConversionSelection =
  | Readonly<{
      kind: 'pdf-pending'; source: LlmSourceIdentity<'pdf'>;
      candidates: PdfCandidateModels;
      contract?: never; modelId?: never; manifest?: never;
    }>
  | Readonly<{
      kind: 'fixed'; contract: LlmSourceContract | PdfPagesContract;
      modelId: string; candidates?: never;
      pdfProof: PdfChoice | null;
    }>;
```

共通conversion baseにaccount/job/note/command/digest/epoch/createdAt/期限/取消/所有/本文版等を残す。pendingはqueued/classifying/terminalだけ、dispatch・response-ready・succeededを型/DBの両方で拒否する。旧fixedにpdfProofがなくても正常、旧データから勝手に新classificationを作らない。

具体列案は `selection_state`（既行default fixed）、`candidate_text_model_id`、`candidate_image_model_id`、`candidate_settings_version`、`pdf_selection_manifest`（有限JSON）。新pendingだけmodel_id/preparation_version/prompt_versionをNULL許可し、`selection_state='pdf-pending' AND source_format='pdf' AND operation='import'` とphase/全candidate非NULL/manifest NULLを明示CHECKする。`fixed`は新候補列NULL、旧のformat/recipe/prompt組合せまたは新4/3のみ。JSONは最大64KiB候補、shapeはmapper/VO境界で検証する。

旧NULL preparationはfixed旧text/HTML/MDに限りV1読取正規化、更新時NULL→1非SETを維持する。pendingのNULLは新selection判別下の「契約未決定」であり、旧V1 normalizationへ通さない。model_id等の既全値はcopy保持。identity triggerは旧fixed→任意identity変更を引き続き拒否し、新pending→fixedだけを同owner/CAS/完全classification/dispatch0で一度許可する専用repository操作にする。汎用replaceに「modelが変えられる」例外を持たせない。

pendingが破損/取消等で終端になる場合はmodel未確定のままでも終端型を成立させ、架空model/recipeを埋めない。JBは「方式確定前の失敗」。旧jobの元model表示/undoを壊すcastをしない。retryは新job/new予約で両候補を同設定として再固定し、旧epochなら現行どおり明示再確認へ戻す。

## 3. IM06: 本文lockなしpreview receipt

### 画面と操作

PDFで「LLMで作り直す」を開いたら、通常GETは現在状態だけを返す。高負荷分類をGETやpollで暗黙に作らない。利用者のこの操作を契機にCSRF保護のprepare POSTを一度行い、即座にreceipt/queuedを返す。begin時にも現在の有効連携/構成/編集権限/原本を確認し、未連携の既機械経路へ分類を追加しない。画面は「PDF方式を確認中。本文はまだ変更しません」。note編集/移動を禁止せず、原本の物理読取りpinだけ保持する。これはIM06の実行ではなく、モデル選択の準備で、quota0/dispatch0/履歴conversion0。

readyで用途(text/image)・対応範囲・resource-only注意とその用途のモデル候補を出す。初期値は前回本人model/指示を尊重し、用途不適合なら選択不可と理由を示し、勝手にdefaultへ戻さない。前回値がない場合だけ現在の用途別defaultを提案する。本人は対応する別modelと追加指示を選べる。分類receiptにmodel選択権を代行させない。

「本文を置き換える」確認後のrequest POSTにreceiptId/receiptVersion/commandId/noteVersion/expectedEpoch/modelId/instruction/confirmedを渡す。clientからrecipe/用途/原本hashを受け付けない。Tx外の必要profile確認とTx内の再照合後、receiptをconsumeし、同Txで既regenerate conversion/job/予約/元本文revisionを作る。ここから既実行中lockが始まる。確認取消ではconversion/予約0。結果を置換する前のcurrent/版guardとundoは既契約を使う。

### binding・一回性・ACK

新 `llm_pdf_previews` はreceiptの単一正本。opaque IDは認可tokenではない。begin/status/cancel/confirmの毎回、現在sessionのactorとnote edit権限を照合し、他actorには存在を露出しない。束縛はaccount、note、noteVersion、ownershipGeneration、original ID/hash/bytes、credentialEpoch、分類policy/renderer版、created/expiresAt。rawsource/本文/PNG/credential/session tokenは保存しない。

beginはactor＋previewCommandId unique、入力digest固定。同key/同入力は同receipt、異入力は拒否。begin ACK不明はcommandによるstatus GETだけ、autopost0。ready後のconfirmは既conversionのactor＋commandId uniqueを第一照合し、同digestなら同job、異model/instruction/receiptなら競合。receipt消費とconversion INSERTは一Txなので、confirm ACK不明は既job receipt GETへ収束する。別commandが同receiptをconsumeしようとしても1件だけ。同note別receiptもactiveForNote/CASで二重受理不可。

previewの一回性は有限receipt生存期間内の約束。消費後の生成idempotencyは既conversion command履歴へ移す。期限後/削除済みstatusはexpired/not-foundで、GETから新previewを作らない。UIが改めて準備する場合は明示操作＋新previewCommandId。古いprepare POSTの長期再配達を永久履歴なしで全排除したとは称さず、再配達されても限定CPU準備のみ・生成0/確認流用不可、枠は毎回guardする。

## 4. preview保存・所有・cleanup

新表の必要列は `id, account_id, command_id, request_digest, note_id, note_version, ownership_generation, original_id, source_sha256, source_bytes, credential_epoch, policy_version, created_at, expires_at, state, owner_state, owner_token, runtime_id, cancel_generation, version, result_json, failure_code, consumed_job_id`。FKは既account/note/originalと消費先conversionへrestrict。PKid、unique(account,command)、live note用部分unique、claim/state/deadline索引。raw秘密/原本/生成応答0、result_json≤64KiB候補。用途の決定とsourcebindingを検証してからtyped hydrateする。

```ts
type PdfPreviewState =
  | { kind: 'queued'; owner: { state: 'idle' }; result?: never }
  | { kind: 'running'; owner: ActiveOwner; result?: never }
  | { kind: 'ready'; owner: ClosedOwner; result: PdfChoice }
  | { kind: 'consumed'; owner: ClosedOwner; jobId: string }
  | { kind: 'terminal'; owner: IdleOrClosedOwner;
      outcome: 'cancelled' | 'expired' | 'failed';
      code: Extract<PdfClassification, { kind: 'rejected' }>['code'] | null }
  | { kind: 'unknown'; owner: UnknownOwner; result?: never };
```

数値候補はreceipt全寿命5分（作成時から固定、poll/再読で延長0）、分類120秒以内かつreceipt残時間、ready含む未消費previewはnote全体1/actor1、終了receiptはactor100件・10分まで（既queue100に合わせた限定記録枠、満杯は新準備拒否）。unknownは期限/件数整理で消さない。preview readyが即purge pinを持ち続ける必要はなく、実close後はpin解除し、confirmで原本が現存するか再照合する。消費済み生成receiptは既90日側が正本で、previewを先に除去してもACK追跡を失わない。

並列実行は既LLM physical pool global2/account1を共有し、第二のnative poolを作らない。DB claimもconversion owner(active/unknown)とpreview owner(active/unknown)の合算を一UoWで確認し、既execution.startで二重admissionを再防御する。previewは返信予算を使わず局所CPUのためだけで、conversion response予算を予約しない。未消費actor1上限でpreviewがqueue100本を埋めない。既conversionを優先し、previewは空き枠でのみclaimする。unknownが残る時のfail-closedは旧物理実行契約と同等に保つ。

preview queued行はdurable read-pinとなり、purgeはcancel要求を立てる。runningでは新WriteOwner kind `llm-pdf-preview` を使い、objectOperationRepositoryのcurrent/ownershipGenerationとpurgeRepository.hasWritersへ接続する。object_writes既表はkindをTEXTで保持するため、このkind追加だけで同表の再構築は不要（正式SQLでは全既triggerも照合）。purposeの違うconversion-job ownerを偽装しない。

cancel/expiry/revoke/trashはcancelGenerationを増やし新claim/ready公開/confirmをfence、activeならabortを要求する。期限だけでowner closed・pin解放しない。child/FD/pipe実close後にterminal/closedへCASし、writerを閉じる。close不明はunknown＋pin/枠保持、normal stop失敗を正常終了へ読み替えない。次bootは既runtime predecessorの本物の終了証明後だけpreviewを失敗/取消へ確定してpinを解放し、分類の自動再実行はしない。conversion回復とは別のpreview行も全て処理してから同runtime acknowledgeする。

新ready/resultには最大manifestだけ残し、PNG/HTMLspoolは保存しない。期限掃除はbounded sweepでclosed/idleの行だけ、readyのresultを消し有限tombstone化する。unknown/activeをhistory期限や件数超過で追い出さない。permanent purgeはcancel→実close→当該closed preview行を正規purge内で除去→既conversion/原本の通常回収という順序にする。これでnote/original/consumed_jobへのrestrict参照を残さない。通常期限内のtombstoneも対象原本の永久削除を妨げず、削除後statusはnot-found。raw DB/FS削除を利用者操作の代用にしない。

## 5. route/logout/revoke・競合表

| 事象 | upload/既受理conversion | IM06 preview |
| --- | --- | --- |
| route離脱/通常logout/ブラウザ終了 | 継続。現在account/role/epochの業務fenceは維持、session失効だけで取消しない | clientはlate resultを捨てpoll終了。best-effort cancelは任意、届かなくても固定期限で新利用を禁止して取消要求する。実close不明ならunknown/pin保持であり、5分以内の実終了保証ではない。まだLLM/本文変更0。再signin後のGETも本人確認必須 |
| 本文編集/移動 | 現行実行中lock/現在版・ownership guard | 編集を許可。ready/confirmで旧noteVersion/ownershipGenerationを拒否、本文を戻さない。他actorのプレビューは表示0 |
| 権限降格/除名/trash/account削除/連携解除 | 既同Tx cancelをpendingにも適用 | preview cancel/fenceも同Txへ追加。再参加/再連携で古いrowを復活させない |
| 同note複数tab/actor | active conversion uniqueを維持 | live preview note1、actor1。違うactorにはbusyの有限理由だけ、他人のID/モデル/進捗を返さない。新開始で旧activeを暗黙supersedeしない |
| 再連携確認中にpreview→confirm | conversion admitで既admission watermarkを増やし再確認を要求 | preview単独は外部発注予約0なのでwatermarkの生成件数へ加算しない。epoch交換のTxは旧previewもfence。交換失敗なら旧preview/旧鍵継続 |
| default model設定変更 | 受理時の両候補を使い、seal後選択modelはimmutable | 分類は用途だけ。本人が選んだmodelを確認時に固定する。default更新で入力中modelを上書きしない。profile不適合なら本人の再選択 |
| cancelとseal/confirm競合 | 同version/cancelGenerationで勝者1つ、取消後seal0 | consumeとcancelはCAS、後勝ちのconfirm0。confirm済みなら既conversion取消へ案内し、preview取消だけでjob取消済みと表示しない |
| classification/confirmのACK不明 | 既jobのreceipt読取、新送信0 | prepare receipt GET又は既conversion receipt GET。通信失敗を未受付と断定しない |

IM02/JBのbatch取消はqueuedだけ取消、running処理を待つ既意味を保持する。previewは変換jobではなく明示準備取消なので独立したcancel用途を持つ。userの再生成取消・revokeの強制fenceとbatch running完了待ちを同一処理へ潰さない。

## 6. 費用・二度準備・UoW境界

分類CPU/メモリは無料外部処理ではなく有限local負荷で、利用者LLM料金/消費は発生しない。importは最初のTxで月間枠を予約するが初intentまでは消費しない。prep失敗は全owner実close後だけ予約返却する。IM06 previewは予約も0、confirmで既受理月予約に入る。既UTC月/limit30/80%警告計算は変更しない。

strict成功は分類で既準備hashを得る。importは同ownerで保持できる有限prepared textを通常処理へ渡し、不要な二回抽出を避ける。IM06は本文をpreview表へ保存しないためconfirm後に再準備/hash照合が必要。pagesでは分類が全N頁を描画しmanifestを作り、dispatch時に同原本を逐次再描画してhash一致を要求するので基本2N render。これを実測せずNだけの時間と称さない。IM06もpreview manifestをconfirm Txでconversionへ移せば、confirm後に「全頁予備描画＋再描画」を追加せず、合計2Nを基本にできる。preview→confirm間の原本hash/policy/renderer/current差は再利用拒否で、任意cache命中ではない。

全頁準備済みでも、送信時再描画の途中に新故障が起きた場合は既送信分の消費1を保持、残発注停止/旧本文保持。再描画を失敗fallbackや自動再送で救済しない。120秒は全頁準備の候補で、N×10秒を全体120秒へ無理に収めた成功保証ではない。dispatch再描画/外部待ちは既30分job期限との最小残時間で別制限する。144dpi/1728px/32頁等はgate候補で製品値未採用、native peak保証ではない。

全UoWはbegin/current snapshot、claim、result seal、confirm、cancel/close等の短いDB処理だけ。source read、PDF native、profile HTTP、生成、projectionはUoW外。各I/O前後のCAS/currentで競合を防ぎ、HTTP待ちのためDB lockを保持しない。

## 7. port/DTOと実pathの変更候補

内向き追加portは `application/llm/pdfClassificationPorts.ts`（新）に `classify(binding, bytes, signal): Promise<PdfClassification>`、`domain/llm/pdfPreview.ts`（新）に上のunion、`domain/llm/repositories.ts` にpreview repositoryのbegin/byCommand/find/claim/seal/consume/cancel/owned/pruneを置く案。名前は採用後に固定し、未実装throw-only exportは作らない。

applicationは新 `llm/pdfPreview.ts`（begin/status/cancel/consume）、既request/admit、worker/current/recover/sweep、import/acceptUploadとcontrolJobsのretry境界を接続する。既currentLlmSourceはfixed conversionに対するまま、pending用は共通source/authority条件を明示共用し、型のany/castで回避しない。UoWへpreview repo、LlmServicesへclassifierを追加、実行poolは既executionを共有する。

DTO候補は未開始 `idle` と、共通の `{previewId,version,expiresAt}` を持つ `queued | classifying | ready{purpose,defaultModelId,modelKind,pages,noticeCodes} | failed{code} | expired | closure-unproven` の判別union。code/noticeは既有限code＋採用する分類理由の閉じた集合とする。hash/source bytes/owner token/runtime/PID/候補二model/秘密は出さない。本文/ページ内容をDTOへ持たない。confirm DTOには用途を含めずreceipt参照と本人選択model/instructionだけ。status GETは純読取。begin/cancel/confirmはtransportの有限validatorとserverActionを使い、現在actor/contextとReact pending/disable/receipt照会/390/keyboardを維持する。

永続adapterは既 `llmSchema.ts`/`llmRepository.ts` と新 `pdfPreviewRepository.ts`、配線 `adapters/libsql/hollowUnitOfWork.ts` / `application/execution/hollowUnitOfWork.ts`、Node classifier/preparer/child/runtime配備、`apps/web/scripts/build-search.node.mjs`。UIは `apps/web/app/presentation/{llmInput,llmServerFn}.ts`、`components/hollow/{LlmNoteAction,ImportJobs}.tsx` と用途説明。OpenRouterモデル一覧のkind検証は再用し、client kindを認可やrecipe確定の根拠にしない。

所有の直接差は `domain/purge/entity.ts` の新owner kind、`application/llm/ownershipError.ts` と `adapters/node/llm/execution.ts` の新owner unknown識別、`objectOperationRepository.ts` / `purgeRepository.ts` のpin/current、membership/trash/purge/OpenRouter cancel hook・起動回復/sweep。既actor公開範囲/認証cookie/秘密保存を作り直さない。

正式DDL案は0037/ledger38（採用時確認）：①llm_conversions限定再構築（上記列/新pending/fixed CHECK/一回seal trigger）、②llm_dispatches限定再構築（pages4だけ0..31/旧0..15維持、pending発注禁止join guard）、③llm_pdf_previews加算。既quota4関連表、conversion_jobs、originals、notes、object_writesは構造再構築0の案。ただしguard triggerの新preview参照追加やpurge delete順は必要で、「他表へ影響0」とは称さない。旧99表なら新100表になる見込み。正式SQLの全旧値/NULL/CAS/PKFK/trigger/index/ledger保持、normal/途中SQL/末尾FKrollbackは実装phaseで別実証する。

## 8. 次phaseの固定条件候補・直接影響

固定条件はManager採用待ち。gate A〜Eへの追加ではない。

1. IM01: upload完了→空note/job/旧月予約→detailを分類待ちにしない。離脱/logout後継続、AIoff/未連携/機械分岐不変更。
2. 型/保存: pendingは仮recipeなし、両model受理時固定・一回seal後不変。旧NULL/V1/V2/V3全値/byte/hash維持、追加表・二表移行の正常/SQL/FK故障/CASを実証。
3. 分類: strict全文成功は2維持、健全対象外だけ全頁pages4、末尾破損/暗号/予算/unknownをfallbackで隠さず原本/JB保持。
4. IM06 preview: lockなし/原本pin/有限期限、用途→本人model選択→確認の順、他actor漏えい0、入力中設定無断変更0。
5. 所有: global2/account1を共有、同note1preview、cancel/期限/遅close/unknown/purge/再起動で実終了前pin/枠解放0。
6. current/ACK: role/ownershipGeneration/epoch/本文版/原本の前後照合、relink watermark/候補失敗旧継続、二重confirm・ACK不明から新送信0。
7. 全頁送信:全N準備→逐次hash照合/有限JSON、論理1回、partial/全response回復/旧本文版保持/undo。実品質とは区分。
8. 同bundleUI/配備/checks/最終保全: source/dist owner/正常停止、規定type/lint/format/unit/影響Node、最新基点の許可保全/移行・自己通常回収と全指紋/全停止。

直接影響はP5b-2a-A〜H（未分類保存/同1回/取消/回復/表示の差）、P5b-2b1-A/C/D/E/F/G/H/I/J（新PDF選択と共有caller）、P5b-2b2-A/C/D/E/F/G/H（共有型/owner/画像用途・wire非変更の比例）、P2a-B/E/F、P2c-1-A、P1-E。preview pin/失権hookの実編集が届くP3a-D/E、P3b-1-C/D、P4d-2-Gも局所再検証候補。製品編集前にactual pathと一緒にManagerが必要IDだけreopenする。Office-B/画像codec-B・全OAuth/旧PDF/ZIP全機能の一律取消ではない。

最小UI候補はaccount1/WS0、正常mixed3頁1737B＋tail1115Bの2note。native代替で全3頁・用途model表示/待機、同noteIM06 preview中編集可→確認後lock→成功undo、tail原本/失敗/JB/dispatch0、route離脱/reload390/keyboardと単発ACK喪失を有限に確認。生成上限は正常import1＋IM06一回の論理2、実API0。role/epoch/cancel/未知所有/並行/旧strict正常/UTC境界は小DB/native対を主にし、別actor/WS実UIが必要なら追加申告する。各fixture/root/保全/移行/回収は別許可で、現段階は何も作成しない。

見込みは採用後16〜24時間＋独立。従来12〜18時間案から、非同期分類受付/preview/第三加算表・purge/所有の直接差を明確化した増分である。分類・所有/保存とPDF dispatchを別フェーズへ切るなら、先行phaseは内部基盤/未提供のままにし、previewだけを公開して生成完成としない。新条件を無制限に足す意図ではなく、原文UXと既所有/計数を保つための必要差である。

## 実施範囲と返却

今回行ったのは上記公開コード・原文・plan条件の静的読取と本書作成だけ。存在しない推測pathを指定したread/rgは有限エラーで訂正し、旧proof/秘密探索へ広げていない。製品/既報告/管理正本/prototypeのwrite0、test/build/Node/native/DB/runtime/browser/外部0。新自己資源0/未回収exec0。02:31 JST時点で全章を再読し、最終訂正後のEOF確認をもって本書を含む全read/write/runを停止、Managerへ判断を返す。P5b-3a0独立環境/候補へ影響0、次製品実装開始0。
