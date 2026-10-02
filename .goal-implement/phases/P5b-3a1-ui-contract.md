# P5b-3a1 S5: IM06 preview UI 接続案

## 結論

2026-09-29、固定 D/F/H の静的接続提案。製品実装・独立検証・新受入条件ではない。主が S4/native と実行環境を所有しており、本書以外の編集と全実行は行っていない。

推奨は既 `LlmNoteAction` を存続 owner とし、PDF だけ「用途確認 receipt」を生成要求の前段へ加えること。begin/cancel は明示 POST、status は純 GET、confirm は既 `requestLlmFn` に `previewId` を加える。既 request usecase が preview consume/conversion/予約を同 Tx で実施するため、別の confirm usecase や quota 正本は不要。

実装前に主へ返す差は次の 3 点。

1. `getPdfPreview` の ready 表示は現時点では元 receipt の projection だけ。現在原本/所属世代/epoch/本文版を純読取で照合し、現在差を「もう確認に使えない」と表示できる有限 projection が必要。
2. purpose ごとの既定 model と、前回本人 model の区別が不足する。現在 `getLlmNote` は PDF 初期に text 既定、pending では modelId=null。image 用途へ text 既定を無言採用しないため、用途確定後の default を server projection で供給する必要がある。
3. status は noteId+commandId 必須、現在 UI の command は ref だけ。reload 後の生存 preview 再発見は未接続。既 `getLlmNote` へ現在本人・同 note の live preview locator を加える案が最小。別 actor の preview ID/command/purpose は返さない。

具体 DTO 名は主が決める。本書は型・port・保存形を新設していない。previewVersion を client 必須入力に増やす提案はしない。現在の confirm は server の `readyPdfPreview` と `consume(preview.id, preview.version, ...)` の CAS を使う。

## 現在の実 path と再利用先

| path | 現在の事実 | 最小接続差 |
| --- | --- | --- |
| `apps/web/app/presentation/llmInput.ts` | note/job/modelKind/regenerate の validator。regenerate に previewId がない | begin の noteId/noteVersion/expectedEpoch/commandId、status の noteId/commandId、cancel の previewId を有限・strict に検証。regenerate に optional UUID previewId。client purpose/recipe/hash は不受理 |
| `apps/web/app/presentation/llmServerFn.ts` | GET getNote/models/usage、POST request/cancelJob/undo のみ | begin/get/cancel preview の 3 bridge。GET は `hollowContext()`、POST は既 `hollowContext(true)` と error middleware。分類を GET から wake しない |
| `packages/core/src/application/llm/pdfPreview.ts` | begin は command idempotency、note/epoch/競合を検査し queued receipt 作成後 wake。get は現在本人 edit と保存 receipt を読む。cancel は現在本人 edit、cancelGeneration、実 execution.cancel | ready の current 不一致を有限表示へ反映する純読取 projection。expiry/unknown を closed と扱わない。ready check の source/hash は server 内だけ |
| `packages/core/src/application/llm/request.ts` | `RegenerateLlmInput.previewId?`、PDF に必須、非PDFの previewId は拒否。confirm で現在版/epoch/原本/ownership を照合、consume と job/conversion/quota を同 Tx | 既 caller の接続だけ。別 confirm POST/usecase/preview 用月間計数を増やさない |
| `packages/core/src/application/llm/read.ts` | note actor/epoch/version、processing、pdfClassification、modelKind、modelId nullable、receipt、本人 job を返す。models は用途で絞る | 本人 live preview locator、用途別 default の最小 projection を主が選択。PDFが文字だけという availability 表現も現在提供へ整合 |
| `apps/web/app/components/hollow/LlmNoteAction.tsx` | useTransition、busy ref、直列 reload、actor-route valid、未送信設定 guard、GET-only ACK再読、model/instruction/seed、job取消/undo | PDF receipt 状態を parent に追加。用途 ready 後だけ model list、確認 submit に previewId。preview と conversion の uncertain を混同しない |
| `apps/web/app/components/hollow/useAuthenticationOperation.ts` | mounted/revision/href/actor id+epoch を毎回束縛、navigate/signout で失効 | 再利用。新 poll が mutation を勝手に supersede しないよう呼出しを直列化 |
| `apps/web/app/routes/notes.$noteId.index.tsx` | canEdit＋original の場合だけ action、key は actorId:noteId、noteVersion は prop | 原則不変更。本文表示・編集導線に preview lock を追加しない。現在 route/actor の remount 境界を保持 |
| `LlmUsage.tsx`、`llmDocumentMessage.ts`、`ImportJobs.tsx` | usage GET、旧PDF文字限定/未提供文言、job表示 | usage は preview を計数に足さない。旧失敗履歴の説明と、新PDF「用途確認中/画像化」表示を区別。既 image/Office/音声未提供を維持 |
| `styles/hollow.css`、`styles/import.css`、`components/hollow/import.css` | focus-visible、section/button、既 job 幅と小画面規則 | 既構造優先。必要な場合だけ action 内 select/textarea の min-width:0/max-width:100% と折返しを局所追加 |

root/route を新規に設けたり provider を移動したりする必要はない。既 server-function 配備登録の方式へ主が接続し、bridge を作っただけで到達可能と断定しない。

## UI の最小状態機械

以下は local state の意味の提案で、既 domain `PdfPreview` を置き換える新製品型ではない。server receipt、通信状態、入力設定を区分する。

| 状態/契機 | 表示・許可 | 通信/計数 |
| --- | --- | --- |
| 初期 PDF、receipt なし | 「PDF の用途を確認」。まだ本文は変更せず、本文編集可 | 通常 getNote GET だけ。クリック時に固定 command で begin POST 1回。quota0 |
| begin 通信中 | ボタン pending/重複禁止、元本文は閲覧・編集可 | command/payload を保持。分類完了を HTTP 内で待たない |
| begin ACK 不明 | 「用途確認の受付結果は未確認」。同受付再読だけ | noteId+同command の GET。null は未受理証明ではなく unknown 維持。自動再POST/新command0 |
| queued/running | 「用途確認中、本文はまだ変更しません」、準備取消導線 | 既2秒の非重複 GET poll を再利用。quota0/本文lock0 |
| ready＋current一致 | 用途（文字/全頁画像）、頁数、期限、限界→本人model/追加指示→本文置換確認 | purpose を `listLlmModelsFn` に渡す。ready受領・モデル読取だけでconfirmしない |
| 本文版/原本/所属/epoch差 | 「用途確認が古くなりました。確認し直してください」。入力model/指示は保持 | 古い receipt で confirm不可。現在再読＋旧preview取消/終了確認後、明示 begin。自動再準備0 |
| expired/cancelRequested/failed | 有限理由、旧本文維持、準備し直す明示導線 | expiresAt は表示用にも使うが、最終判定は server。unknown/active の物理終了を期限で推定しない |
| unknown | 「準備の終了未確認、保持中」。確認不可、再読可 | quota0であっても実行枠/原本pinが空いたとは表示しない |
| ready から確認取消 | 生成せず設定を保持 | conversion0/予約0/本文lock0。preview自体を取り消す操作とは別 |
| confirm POST中 | 既置換確認後、pending/重複禁止 | 新生成command＋固定 previewId/版/epoch/model/指示。server同Tx確定後だけ生成受付扱い |
| confirm ACK不明 | 既「受付結果未確認・自動再送なし」 | `getLlmNoteFn` の生成command receipt GET だけ。preview begin command と取り違えない |
| consumed | server jobId を既job表示/履歴へ引継ぐ | previewの期限切れ表示より消費済み事実を優先。再confirm不可。quota/lock は生成の現在状態 |

生成用 command と preview 用 command は別 purpose の参照として保持する。ready取得によって生成commandの不明結果を消さず、生成receipt取得によって古いpreviewを復活させない。reload後のexact生成ACK照合 locator が失われる既境界では本人履歴へ案内し、別の生成を自動作成しない。

## 現在性・遅い応答・モデル入力

`getPdfPreview` は現在 note の edit 権限を要求するが、ready receipt を返す前に `previewSource` 相当の source/version/ownership/epoch/expiry を再確認してはいない。confirm 側にはその全照合があるため、現時点の不足は ready の利用可能表示であって、confirm が無条件採用するという指摘ではない。GET では分類開始・cancel・再作成をせず、現在差の安全な projection だけを返す。失権は既 NotFound/認証 error とし、他actor receipt は null/非開示を維持する。

UI は現在 noteVersion prop、getNote の epoch/version、receipt の noteVersion/epoch を比較し、観測済み差だけでも先に確認を無効化する。未公開の source hash/ownershipGeneration を client 認可根拠に追加しない。原本差は server の current projection/confirm が権威になる。

`useAuthenticationOperation()` は呼出すたびに generation を進める。新 preview poll、既 processing poll、onResolved reload、catalog read、mutation が並行してこの関数を呼ぶと、必要な mutation の応答まで古いものになる。既 busy＋読取 queue を一つの owner で直列化し、mutation 中の onResolved/poll は現在再読の予約に留める。receipt ID/command/purpose の generation も照合し、旧 ready/catalog の success/catch/finally が新選択の pending/error を消さない。本文が変わり A→B→A に戻っても単なる値一致で古い応答を復活させない。

用途未確定 PDF に `format==='pdf' ? chat-text` を使わない。ready purpose を model kind とし、その kind の catalog だけ表示する。前回本人modelが不適合なら「提供未確認/この用途では選択不可」を残し、本人が選び直す。未入力・前回値なしの場合だけ対応用途のserver既定を初期提案する。poll/default変更/ready再読で dirty な model/instruction を上書きしない。catalogは用途能力の候補であり、現在provider適合/原本認可を保証しない。

reload時の preview locator 追加は read-only に限定する。本人liveForNoteだけを返し、別actorの live が存在してもそのID/用途を返さない。終端receiptを新長期履歴として増やさず、既5分/10分の保持境界を延長しない。locatorが見つからなければ受付なしと断定せず、未確認/期限/再開始可能性をserver状態に従って案内する。

## React・390px・keyboard・旧動作

既 section/form/label/select/textarea/button、role=alert/status、focus-visible と `useTransition` を再利用する。新modalを必須にせず、「用途確認→用途/注意→model/指示→本文置換確認」を縦に並べる。準備中や期限で本文全体を disabled にしない。pending/error は unmount されない親で保持し、mutation後は既 router.invalidate と現在再読へ収束させる。POST失敗時にも成功表示を残さず、receipt GETで同受付が確認された場合だけ対応するerrorを解除する。

Enter/Spaceは通常button、select/textareaはlabel関連付け、取消はtype=button、置換だけsubmit。pollのたびにfocusを移さない。ready時の新フォームへ自動focusは不要で、消える取消ボタン等からのfocus returnだけ既DOMの安定要素で扱う。390pxで長いmodel名/エラー/期限を折り返し、横スクロール・固定幅・disabled fieldset内の取消不能を避ける。これらの実画面検査は主の H に残す。

非PDFは現 `requestLlmFn`、model kind、8 KiB指示、window.confirm、処理中取消、本文undo、GET ACK再読を維持する。PDF branchでも過去成功job/undo表示は既共通部分を使う。既 image resource-only説明、Office文字範囲、音声未提供は消さない。旧PDF失敗履歴の「当時視覚未提供」と今回の分類対象を混同しない文言へ必要箇所だけ整える。

## 固定 D/F/H へ渡す最小確認案

新gateは追加しない。既 `LlmNoteAction.test.tsx` の actor/route/receipt-read 対を基に、PDF初期GETでPOST0、begin二重0、ACK再読POST0、ready purpose切替と旧catalog非採用、dirty保持、本文版差、confirm取消、confirm ACK再読、unknown期限の非closed、非PDF旧枝を比例確認する。`llmInput.test.ts` は有限UUID/余剰field/非PDF既payloadの境界を追加する候補。既hook順序を仮定するpure fixtureは新state追加で更新が必要で、実React/390pxの証明と数えない。

主の既同bundle H シナリオで preview中本文編集可→現在差→明示再準備、用途/本人model→置換確認→生成/undo、reload/390/keyboard/ACKを確認する。本文/秘密/原本hashをUIに新表示しない。backendの同Tx/current/expiry/ownership証明は既D/E/F担当の根拠と接続し、component fakeだけで証明しない。

## 停止・返却

本書だけを apply_patch で作成し、参照ソースと採用design/planを静的照合した。製品・既報告・renderer4path・管理4正本の編集0、Node/test/type/formatter/build/native/browser/DB/外部/旧proof操作0。不存在CSS候補のreadは有限エラーであり、実在 `styles/hollow.css` へ限定訂正した。自己生成資源0・未回収exec0。全文EOF確認後、本書の所有を主/Managerへ返し、全read/write/runを停止する。
