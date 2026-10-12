# P5c-3 Drive Slice C: 通常 IN-07 接続の最小 phase 提案

固定日時: 2026-10-06T10:31:02.924773+00:00

状態: **SOURCE-only proposal / 未採用・未実装・未実行**。S5-F の通常Drive利用者経路へ接続する次phaseの候補であり、全S5-F/IN-07完了判定ではない。既normalDB/job fixture計画は別担当で、本案はその工具・ケースを重複作成しない。

## 基点と未接続境界

要件基点は `criteria/P5c-3-S5.md` A–F、採用 `P5c-s4-integration-machine-plan.md` の後続Slice C、R03/R08/R10、`spec/scenario/integration.md` IN-07。IM-06 は既local LLM再生成のまま維持する。

S5 SOURCEは `/Users/hikaru/github.com/tuanemuy/hollow-p5c-machine-79ef126-20261006` の Root固定 `c13759984c18b4f01825da93d4a9962844372aef`。このcommit基点は公開candidate報告借用であり、今回Git/HEAD/1470全manifestを再検証しない。main側は固定79ef126の既note route・LLM UI/serverFn・containerとsearch schemaの公開bodyを限定読取した。S5基盤はまだmain未統合であり、二基点のコードを混ぜた完成candidateとして扱わない。

直接確認した境界:

- S5 `regeneration/request.ts` は内部 `requestMachineRegeneration(noteId,commandId)` をlocal-originalで受付する。Drive record選択・binding作成入口はまだない。
- `read.ts/current.ts` は record候補、format、mine、available/unavailable理由、記録した本人のDrive状態を扱う。共通 `source.ts` はdrive-record bindingから本人credentialを読み、actual owned attempt・caller終了・saved closure・ACKを扱う。
- `MachineServices/createNodeMachine` と `createNodeLlm` の `NodeRegenerationInput` は現在input/localのみ。共通resourcesはOpenRouter判定前に生成されるが、Drive providerをこの同じ参照へ注入する配線がない。
- machine workerはread→prepareMachine→finishInputで、Drive final-checkを実行する枝はない。currentMachineの最終Tx検査はnote/job/source/version等までで、Drive binding/current credentialのTx検査はまだない。
- main note routeはLlmNoteAction / DriveBackupPanelを描画する。後続採用path `RegenerationSourceAction.tsx` / `regenerationServerFn.ts` は現mainのnamedpathに未存在。未実装を既候補のFAILへしない。
- 既 `NodeDriveHttp.source(metadata/download)` が52,428,800B上限、元native HTTPS/execution登録/close経路を持つ。別HTTP transportを新設する必要はない。

## このphaseの利用者経路

初回実装・直接証拠を **Drive recordのHTML/Markdown → 機械、または同形式の既text-LLM** に限定する。これは段階scopeであり、他形式のIN-07完成・既format提供の削除を意味しない。text/Office/image/PDFのDrive LLM準備、PDF用途確認とready-preview bindingの接続は後続依存として残す。音声保留を変更しない。

1. 通常note詳細に「元ファイルから再生成」のDrive入口を置く。独立local機械menuを作らず、既local LlmNoteAction（IM-06）を維持する。
2. 現sessionのactor/edit権限で候補GETを読む。ページ25件・bounded cursor/responseを再用し、immutable recordIdを選ぶ。secret locator/fileId/resourceKey/credentialOwnerId/subject/epoch/proofをclient payloadへ出さない。`mine` と既availability理由で、記録本人には再連携、別executorには自分のDriveへの再バックアップを案内する。
3. exact candidateを再読し、現在noteVersion/format/可用性を確認。HTML/Markdownは「機械」「LLM」を選べる。機械はOpenRouter設定・本人OpenRouter鍵を必要としない。LLMはexecutor本人の既モデル/指示/epoch/quotaの契約を使い、未連携ならLLMだけ無効化する。
4. 「現在の本文を置き換え、直前の版を保持する。タグ・公開・共有は維持する」の警告を読み、confirmed:trueで確定する。LLMだけ既料金/送信後使用枠の説明を表示する。
5. 既serverFn POST transportで同commandの永続jobを受付し、queued/processing/終了未確認/failed/cancelled/succeededを表示する。画面を離れても進行し、再訪時に本人履歴を再読する。応答不明を同command GETで照合し、自動POST再送・未知結果の成功化はしない。
6. 処理中は編集lockを既original.processing/genericjob/現在note DTOへ結ぶ。取消要求とactual終了待ちを分け、unknown ownershipは解除しない。成功時に同resultVersionのundoを提示し、本人/edit/他livejob無し/保存版fenceを既controlで再検査する。取消/undo/receipt確認後にrouter.invalidateで通常note/historyへrebaseする。

React19は同leaf `RegenerationSourceAction` が選択・pending/error・receiptを所有する。useTransitionで実mutationのpendingを保持し、useOptimisticは受付/取消要求の局所表示に限定する（新本文/成功/解放を楽観確定しない）。actor/note keyと既useAuthenticationOperationでactor切替・document破棄後の応答を隔離する。dirty/unknownの離脱確認、samecommand読戻し、error UIを保持する。list-membershipを変える操作は親の既所有に従い、leaf unmountでerrorを失わせない。

## transport と型境界

**新POST/new HTTP endpointは0。** 既 `requestLlmFn`、`cancelLlmFn`、`undoLlmFn` の factory/transport identityを保持し、その入力とapplication dispatchを限定unionへ拡張する。既local LLMのpayload/動作は既枝でそのまま。

Driveの新受付枝は概念上 `{origin:"drive-record", recordId, noteId, noteVersion, commandId, confirmed:true, method:{kind:"machine"}|{kind:"llm", expectedEpoch,modelId,instruction}}` のstrict discriminated union。machineへLLM fieldsを要求/混入しない。secret/current ownerはserverでderiveする。取消/undoは既jobIdの正規保存operationをserver側で判別し、executor/editを各既controlで検査する（clientkindだけで権限/保存種別を確定しない）。型をcastで既RegenerateLlmInputへ落とさず、分岐後だけ既LLM用型へ渡す。

新 `regenerationServerFn.ts` は **GETのみ** の candidate page/exact/receipt/history facade。既inline createServerFn→errorResponseMiddleware→inputValidator→handler/hollowContextパターンを使う。外部dataをschemaless serverDataへ渡さない。serverDataは内部RSC/usecase loaderで必要な場合だけ既契約を再用する。manual HTTP/unknownRPCID fallback/serializer緩和は行わない。

`llmRegenerateInput` の旧枝を保持し、Drive unionの正確なkeys/UUID/noteVersion/instruction UTF8 8KiB等をtransport境界で検査。URL searchは既workspace/sharing schemaを維持する。recordId/commandIdをURLへ入れて再送する導線や新query protocolは追加しない。

## 一回のUoWで binding と jobを保存

新application facadeがcurrent account/session・edit・active workspace・selected exact record/target/original・記録本人のactive資格/Drive linked/subject/epoch・noteVersion/ownershipGeneration・format・他livejob無しを同Txで検査する。record選択失効/退会shell/Drive解除/別account subjectは利用不可。selected recordのoriginalId/sha256/bytes/formatを使い、最新local originalへのfallbackをしない。

jobIdを一度生成し、consumerをmachine-regeneration又はllm-conversionへ固定する。既 `sourceBindingSchema` の recordId/executorId/credentialOwnerId/noteId/originalId/subject/driveEpoch/ownershipGeneration/fingerprint/consumer/version等をserver snapshotから構築し、binding + machine又はLLM + genericjob + original.processingを **同UoW/同Tx** で保存する。fingerprint/digestはrecord/method/同設定/note版を含む固定codecとする。同executor command同内容は同receipt、異内容はconflict、machineとLLMを同commandで切り替えた再利用もconflict。途中bindingだけ/jobだけのcommitやnested UoW受付をしない。

既machine受付と `admitLlm(u,...)` の内部admissionを再用するために既request.tsで必要なtyped helperを抽出する。local public関数・旧LLM recipe/preview/quota意味を変えない。machine quota/dispatchは0。通常import claim除外・同idgenericjob・deadline/cancel/unknown admissionの既S5保証を維持する。

Drive recordのformatは原本の保存formatから得る。バックアップは既providerが `application/octet-stream` で保存するため、remote MIMEをHTML/Markdown MIMEへ強制して正常原本を拒否しない。一方Google-native文書/shortcut、trash、size/hash/parent不一致やdownload不可は正規metadata検査で拒否し、移動/欠落をlocal fallbackで隠さない。

## provider / current / lifecycle 配線

新Node providerは既 `NodeDriveHttp.source` を同 `NodeDriveExecution` と組み合わせてmetadata/read/inspectを実装する。fileId/resourceKey/accessTokenはprivate recordとprotectorからだけ渡し、URL/headers/Node optionsはdomainに漏らさない。既metadata fieldsのsha256Checksum/size/version/parents/trash/canDownloadとbounded owned bytesの実sha256をrecordへ照合し、checksum不明・中断・native閉鎖不明を普通成功へしない。checkCurrentは元呼出契約の前後/各必要境界で実行する。

shared input/execution/ownershipは **既createNodeRegenerationの同original参照を1回だけ**。MachineServicesとLLM inputStageへ同RegenerationServicesのprovider/drive pairをtyped injectionする。半構成を違法状態にし、confirmSourceAcknowledgedの正規能力がなければunavailable。OpenRouter判定より前のshared生成と2×52,428,800B総input枠を維持する。machine用別memory/別runtime/execution/privateproofを作らない。

machineはleaseがactiveの間にDriveのfinal-check（既provider.inspect/owned source attempt）を行い、そのactual closure・caller終了・savedread/ACK後に既finishInputの原proofへ進む。closed inputへ新read/newfinishproofを作らない。prepare/body処理後・本文Tx直前のcurrentもserverで検査し、最終Txでbinding/record/credential owner資格・subject/epoch/ownershipGenerationを再検査する。遠隔metadataは最終Tx中にHTTPで取得しない。外部file freshness snapshotとDB現在fenceを別々の条件として扱い、非原子的な外部更新を原子的と主張しない。

LLMのDrive枝も同InputStageと同current-source fenceを通す。既local-v2 `prepare` がDrive final-checkを通る保証はまだないので、lease active中のcheckと最終Tx currentをexactscopeに含める。既local・PDF/imageレシピ枝には不要な挙動追加0。正規source attempt closure/ACK、machine finish response-lossのdeferred originalfinally、unknown/held、正常stop順を共有する。bootで永続jobをwake/recoverし、shutdownは新begin拒否→machine/LLM caller drain→既Drive/shared resource停止の所有順を維持して二重資源作成・証明なしreleaseをしない。

## exact proposed change scope（採用前編集0）

| group | exact paths | 必要差 |
| --- | --- | --- |
| application entry | `packages/core/src/application/regeneration/driveRequest.ts` (new), `request.ts`, `read.ts` | 単一Tx Drive binding/admission、同command receipt/current候補DTO |
| application fence/lifetime | `packages/core/src/application/regeneration/current.ts`, `services.ts`, `worker.ts`, `control.ts` | typed provider pair/final-check/finalTx current、Drive retryのlocal fallback禁止/取消undo |
| existing LLM | `packages/core/src/application/llm/request.ts`, `read.ts`, `worker.ts` | 既admit/local意味保持、Drive selected original/access注入、current/read/最終fence |
| Node provider/DI | `packages/core/src/adapters/node/drive/sourceProvider.ts` (new), `factory.ts`, `packages/core/src/adapters/node/regeneration/config.ts`, `input.ts`, `packages/core/src/adapters/node/llm/config.ts`, `apps/web/app/server.node.ts` | 元NodeDriveHttp再用provider、shared original refsの注入/boot-stop |
| presentation | `apps/web/app/presentation/regenerationInput.ts` (new), `regenerationServerFn.ts` (new, GET only), `llmInput.ts`, `llmServerFn.ts` | strict union/現在actor/既POST3保持/GET facade |
| UI | `apps/web/app/components/hollow/RegenerationSourceAction.tsx` (new), `LlmNoteAction.tsx`, `apps/web/app/routes/notes.$noteId.index.tsx` | Drive候補・警告・mode・既LLM設定/pending/error/取消undo/invalidate |
| contract tests | `packages/core/src/application/regeneration/driveRequest.test.ts` (new), `packages/core/src/adapters/libsql/__tests__/driveRegeneration.integration.test.ts` (new), `apps/web/app/components/hollow/RegenerationSourceAction.test.tsx` (new) | 必要typed/同Tx/現在fence/UI所有の通常直接対 |

表は新source作成/追加pathsのRoot採用を要する。新provider pathの既ファイル衝突や必要ports型の追加があれば作者が具体exactpathで採用前通知する。DDL/journal/source codecs/SourceBindingSchema/LLM recipe/package/lock/独立menu/newPOST変更0。

条件付きexact追加は `packages/core/src/application/llm/ports.ts`（Drive currentを型で保持するrequired portが必要な場合だけ）、`apps/web/app/components/hollow/ImportJobs.tsx`（Drive jobが既JBに現れた時の表示/再確認導線差だけ）。retryがrecordを失ったlocal受付へ進まないことをcorecontrolで保証し、旧履歴本人fenceを維持する。条件外source/pathを黙って増やさない。

## 通常contract test / 後続browser根拠

固定source提出後に意味のある最小対とexpectedcountsを導出する。今回新case数/工具/root/cap/実行は採用しない。

- typed/純粋対: machine branchにLLMfields不要、Drive availability/shell別branch、transport unknownkeys拒否、samecommand同receipt/changedmode conflict。fakecodecはcodec契約だけを証明しnativeproofを発行しない。
- 正規DB/usecase対: selected immutable recordと本人credential（executorと記録本人が異なるWSを含む）、binding/job同Txとrollback、OpenRouter無しmachine/LLM拒否、queued取消/read0、失権/epoch/source/version変更による採用0、旧本文version/原本/tag/public/share保持、同resultVersion undoと競合拒否、本人history/currentだけの読取。旧accepted suiteの全再演は要求しない。
- 正規Node/connect対: normalfactoryから同input/execution/ownership、owned Drive metadata/download/final-inspect→実close/caller終了/保存readACK→machine/LLM準備→本文commit/自然finally、画面離脱後job進行とboot-stop。HTTP実接続は行わず、別採用の新root内loopback/provider fixtureの工具/容量/identity/closure計画が必要。providerのfake result/callback成功をactualclose/privateproofへ代用しない。既normalDB/job fixture担当の計画に重複しない。
- 後続通常browser: 新mergedcandidate/new同操作内buildで通常ログイン→note entry→record選択→警告→OR無しmachine→pending/編集lock→成功/本文/tag/public/share/undo/history/invalidate。既同形式LLMモデル指示branch、不可用本人/他人案内、取消終了待ち/unknown受付GET・自動再送0、dirty離脱・actor切替・390px/keyboardを同featureで直接確認する。旧compiledartifact/旧browser/privateproofの借用を新利用者経路の直接証拠にしない。

## 依存と残条件

S5 c137を正式baseへmain統合し、outside-scope/Parser2/受入S4を保持した固定candidateと規定checksが必要。c137 final-fence等の局所actual/audit限界は既管理正本のまま、本計画でacceptしない。P5dのStoredAccount/identity/deletedanchorと現在資格の正式受入・main統合は退会shell/credentialfenceを型安全に接続する依存。先に独自の削除schema/cast/並行current規約を作らない。

まず上記HTML/Markdown Drive二方法の接続をReview可能に固定する。残supported formats/PDF previewのDrive接続、native unknown/predecessor等S5-A–E残証拠、全S5-F browser、実外部・音声は未完を維持する。本計画自体で個別条件の完了を増やさない。

## 読取範囲・停止

public sourceを限定して読取: S5 request/read/current/ports/services/source/entity/source receipt/worker/control/completion/config/input/llm request-read-worker-ports/config/Drive factory-provider-http-backupProvider、main note route/LlmNoteAction/既presentation serverAction-hollowServer-llmInput-llmServerFn-driveServerFn/serverNode DI/worker runner、上記criteria/plan/requirements/IN07。存在しないnamedpathはscope gapとして記録し、未知ancestor/body/root walkをしなかった。main79 workingがS5と同値だと仮定しない。

新proposalだけwx0600で固定し、全読取STOP。

PUBLIC文書の今回stable全文hash（動作証拠ではない）:

- `.goal-implement/criteria/P5c-3-S5.md`: 6285 B / `fc37135e92fbff63fd8de9a40357efbbdb6641bb65555a8946b22179c115e3f0`
- `.goal-implement/phases/P5c-s4-integration-machine-plan.md`: 29736 B / `e404b65981180f68f176b345c1bf04bc84c5d770daea7a3c6415a8aabf289f6f`
- `.goal-implement/phases/P5c-3-s5-final-fence-candidate.md`: 9997 B / `d18fd95bd7f4ec54744ac9b09a21b6b0a7f8eef1300e559e2ddace6c84b80023`
- `spec/scenario/integration.md`: 10915 B / `495a0582cefe367d0e93b8cf2318916ac3378c4e615a3018b21272cac366caba`
- `spec/requirements.md`: 3306 B / `c327a342d1bf3a4aa94293a220df78d4732209a83feb4d9836ba848a51fd6a67`
