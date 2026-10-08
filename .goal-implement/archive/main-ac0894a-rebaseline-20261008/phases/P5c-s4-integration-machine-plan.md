# S4 main統合と機械HTML/Markdown・共通本文採用の正式候補案

改訂日時: 2026-10-06T06:04:55+00:00。要件対応補正: IM-06はLLMのみ、IN-07はbackup/Drive再生成（非LLM含む）。local機械menu追加を撤回しlocal-originalは内部/test producerだけとする。S5 A–EはIN-07機械/body基盤、FはOpenRouter非依存Node接続＋後続SliceC/P5dの通常Drive UI依存。統合22/Parser2/blob表は不変更。

原案固定日時: 2026-10-06T06:00:21+00:00。状態: PUBLIC-only proposal、実装/実行未許可。RootはS4 A–Fを独立受入済み。sourceC4cba/正常C9・Native7・D2・E・forkの受入は継承し、成功/failed validation rootsは全非操作。今回の変更は本doc新1のみ。UI text-boundary candidateはmain b6/currentBを固定しているため、main writer所有権の解放前に統合しない。音声、D01、旧private/actualfresh、実Drive/OpenRouter/新外部接続は対象外。

## 最初の判断

1. S4の受入net delta22pathsをmainへ別の統合commitとして取り込む。Parser2pathsとの交差0、対象22のmain blobはcommon c2と一致する。過去の工具/報告/生成型をコピーせず、sourceの受入末尾blobだけを固定適用する。
2. Slice BはIN-07のHTML/Markdown機械再生成・共通本文採用/undoのcore foundation。local-originalは既正規source/inputを用いる内部/test producerに限定し、独立した利用者menuは追加しない。通常entry/警告/候補選択/undoは後続Slice CのDrive RegenerationSourceActionへ集約する。本人job history/Node runnerはbackend条件として接続するが、実Drive取得/記録選択/P5d依存の通常UIが未完なら同feature製品完成はpending。保存済みdrive-record型の存在から取得成功を主張しない。
3. machine保存型、receipt/source/current、既commitNoteとrevision/referenceを再用する。machine受付/claim/終了/runnerは未実装。入力port・candidate repository・前任capabilityのmachine対象差はRoot採用が必要。共通input/local/runtime/executionはOpenRouterより前のNode factoryで一度生成しmachineとLLMへ注入する。machine受付・boot・実行にOpenRouter連携/secret/profiles/月limit正常性を条件とせず、既LLMのconfigured/資格/quota/dispatch意味は維持する。

## 受入S4のmain統合

common `c2a3d45f1097533c6344346aca303dc1d2aef368`、accepted `4cba22b7a62121b32bf72964cd62c15a9774c26f`、currentmain `b6e567b24e24c78e26bb1bbb147bdf0fc6588bd3`。readonly git tree照合でmainのS4対象22blobはcommonと同値。下表はbase/main共通Git blobと受入末尾Git blob。新規fileのbaseはabsent。Git blobはSHA1オブジェクトidentityでありSHA256報告値と区別する。

| exact integration path | base/main blob | accepted blob |
| --- | --- | --- |
| `packages/core/src/adapters/libsql/__tests__/llmInputStage.integration.test.ts` | `7045287efbe3f9405b40d21d7b4e404c9f800ccd` | `b994ab269e79cad825df37047dcca6618f2785c7` |
| `packages/core/src/adapters/libsql/__tests__/llmLocalFormats.integration.test.ts` | `absent` | `876adab85daa23b47e4f6c89bae4eea55bc36336` |
| `packages/core/src/adapters/libsql/__tests__/llmLocalFormatsNative.integration.test.ts` | `absent` | `d0dd44d4736ea07cbaf0e849c2cdc9748d908dc8` |
| `packages/core/src/adapters/libsql/repositories/llmRepository.ts` | `ff7151a750e01b76f279e3da48804031ae333b73` | `839a60bbf395604abad78dcf03e90c1f31df56b7` |
| `packages/core/src/adapters/libsql/repositories/pdfPreviewRepository.ts` | `c50d82406969a5f3d6c2a51a34b31b804cb53033` | `86b5406303e97696089f26cc90793507744d4bb5` |
| `packages/core/src/adapters/node/llm/config.ts` | `a03622f1e03a79bbcbd78da402c00884d0d55b66` | `21006854794c22e0a94b8e371acda825ce7850e1` |
| `packages/core/src/adapters/node/llm/imagePreparer.ts` | `f623c7d73157b75df123147ed333a3ed69a7c01d` | `e5e045418a6de15576871c6529aa2adc5bed082b` |
| `packages/core/src/adapters/node/llm/pdfClassifier.ts` | `c6d00e887a4515cd80a79c3f3780268c46b775fe` | `aa8b8f08db791b75ec424d46b86a52a98dc8937a` |
| `packages/core/src/adapters/node/llm/pdfPagesPreparer.ts` | `5205fb8dc4ade8abd891864b949bb05d89a71b7a` | `b8e3ff65995ecdc7a5d6d74a1d08d91a73f836ab` |
| `packages/core/src/adapters/node/llm/runtimeOwnership.ts` | `b8fc9c1994cc4377311d294f605c42f2857cd69b` | `c2feeca992fe6501baf3c7265698418818428034` |
| `packages/core/src/adapters/node/regeneration/input.ts` | `4925c55d4f504c9723951657bf14867b6e7984ea` | `57704db4166b917e9518ff0a7bd0a2f2775a719b` |
| `packages/core/src/adapters/node/regeneration/memory.ts` | `b4df87294f4f0a4fb2e89322391af13051cc2eeb` | `840322f07c78ed3be07306d7e83248d5a0756111` |
| `packages/core/src/application/llm/current.ts` | `ffd1c51bd7c0bbeffe7a695fbccbd13708e6ad8f` | `702d637a55bacd161702ec5b3c2fd273b8011b83` |
| `packages/core/src/application/llm/inputStage.ts` | `8a9ef6616fda4911e07a39a488d7bb7df5ae3221` | `9aefbe55232cabc9ed70d0c438b6900cb5c13623` |
| `packages/core/src/application/llm/pdfClassificationPorts.ts` | `5f6c1242c8270bd285d678a240a4b2ce03f47267` | `42351d7892ef64f9562448cd3b6fa33c15ec72ba` |
| `packages/core/src/application/llm/pdfPreview.ts` | `001339141418818eeb8b78ea11dc2fb7a238a09f` | `562233e4d2509c0dba8d738771b9e5a7ebf8260a` |
| `packages/core/src/application/llm/ports.ts` | `63783484001d4c5aa53c70293e88a71a23e03c5f` | `143e893bf5853afbb4b4c6bc8d2e690d7bf29b05` |
| `packages/core/src/application/llm/services.ts` | `8db4adfc3420447c74efb1ff0080d9d628d146d1` | `888c774e8aae06fce42a6ba3f1348e4e828de13e` |
| `packages/core/src/application/llm/worker.ts` | `45de01589abe8067f056008c9b88e48febd5e5c8` | `8bda8245b7045d02bcf2241df2c8106d1f59f4b9` |
| `packages/core/src/application/regeneration/localFormats.test.ts` | `absent` | `b2433fe1aae8c757dd1c46e2e73b5ebbc4c09248` |
| `packages/core/src/application/regeneration/services.ts` | `47b83288b7d4d816bfbfbc6273790ffbbf029537` | `cfc0abed366e0e78e320f91631efd7bed35cc0ad` |
| `packages/core/src/domain/llm/pdfPreview.ts` | `0423bb3753e3a53461803eca9b4d0a67d3feb6aa` | `273321d06dac01ba9184022d5aad8ffcf694a3ba` |

mainだけのParser差は次2path（S4適用対象外、mainblobを前後保存して完全一致を検査）:

- `packages/core/src/adapters/node/import/__tests__/documentExtractor.test.ts` — `d220a54934e99fcf179b00567fd1ab5f58086694`
- `packages/core/src/adapters/node/import/documentExtractor.ts` — `cda8c5a4e63f3e9e2966a2d7e8b87e4cd37fb17a`

方法: RootがUI source固定を解除した後、最新main HEAD/clean tracked diff/22targetのcommon同値/Parser2末尾blobを再照合し、common→acceptedの**列挙22だけ**をgit patch/restoreによるnet deltaとして適用する。S4の途中commitやhelper履歴を連続cherry-pickしない。統合commit1を別途固定し、candidate親main、22pathsの受入blob一致、outside22のHEAD tree差0、Parser2一致、package/lock/DDL/server.node.ts不変を独立Verifierへ渡す。mainが進んだ場合は親を新HEADへ更新して交差を再判断する。UI側変更を上書きしない。

mainの通常working fileはGit100644→644/100755→755を保ち、AGENTS.md tracked内部link=CLAUDE.mdを維持。隔離S4 treeの検証用600/700や依存symlinkをmainへコピーしない。規定 `pnpm typecheck`→`pnpm lint:fix`→`pnpm format` をmainで実施し結果/意図しないformat差をinspectする。自動install/download0。CF生成型が必要なら採用済み公開toolの**main専用新output**を別採用し、別tree生成物はコピーしない。静的blob/ports/DI/Parser差依存とwholechecksが統合の基本根拠。S4 unchanged各family全再演は要求しない。新結合故障が見つかった場合だけconditionに結ぶ限定回帰を別採用する。通常新archive build/UIはUI再固定の後、別candidate/B予算でRootが採用する。今はbuild/probe0。

## Slice Bの公開source根拠と製品の欠落

- `domain/regeneration/entity.ts:machineRegenerationSchema` はhtml/markdown、commandId/requestDigest、noteVersion/ownershipGeneration、originalRevisionNo、previous原本state/coverage/activeJobId、queued/acquiring/preparing/final-check/terminal、owner none/active/unknown/closed、sourceMemoryBytes、receipt、resultVersionを既保存する。
- `application/regeneration/ports.ts` のMachineRepositoryはinsert/find/command/replace/removeのみ。due candidate/exact claim/activeForNote/本人page/cancel/pruneがなく、`adapters/libsql/repositories/regenerationRepository.ts` も同形。schemaのexecutor+command uniqueとlive-note uniqueを再用する。旧0043 input triggerはinsert memory0/receiptNULL、nextg/current/runtime/token、ownerunknownからの直接memory縮小禁止を既強制する。DDL緩和は予定しない。
- `application/regeneration/current.ts:inputConsumer/currentInput` はmachine consumerを既扱う。`memory.ts:beginInput/finishInput` と `source.ts:readInput` は同opaque lease、原本identity/current再検査、read終了後のadopt、verify→saved closed0→consumeを備える。beginInputのboundTx応答不明はhold、finishInputは自己proof同値の応答確定後のみconsume。queued admission/no-claim境界はLLM専用NodeInput claimTransactionにありmachineへ無条件流用できない。
- S4のNodeRegenerationMemoryは2×50MiB共通原本admission、typed prepared6kindと実終了を扱う。通常machine HTMLを作る `DocumentExtractor.extract({bytes,format})` は別契約。`adapters/node/import/documentExtractor.ts`/parserWorker.mjsのHTML/Markdown変換を再用する（Parser2受入の実Worker終了→caller settleを保持）。LLMのsourceWorker HTML→text/segmentsを機械本文HTMLとして誤用しない。
- `application/note/commitNote.ts` はnote/version、asset/current reference、revision head/pins/prune、browse projectionを同UoWで採用する。`import/processJob.ts` はreferences.prepare→dependencies inspection→sanitize→projection→scheduleReferences→commitNoteを持つ。`note/history.ts` はrestored revision resourcesも扱う。LLM worker/undoは別のfinal currentを持つので全面置換せず、本文採用/undoの必要共通関数だけを抽出する。
- `Original.state=processing` はsaveNote/history restore/style変更、詳細編集UI、LLM再生成受付の既lock。機械requestもここを使用し、元本文はstateと別に保持する。既conversionJobをmachineと同idで保存し、通常import claimがmachine行を拾わないpredicate追加が必要。単独machine rowだけでは通常ImportJobs本人履歴/取消/再試行/画面離脱継続が成立しない。
- `server.node.ts` はcreateNodeLlm/runner wake/stopのみ。HollowContainerにmachineサービスなし。`LlmNoteAction`はOpenRouter条件付きLLM/PDF導線、Regeneration候補readはDrive一覧のみで機械機能を起動しない。

## 提案する共有契約と保存順

要件の正本: `spec/scenario/import.md` IM-06はOpenRouter連携済みの「LLMで作り直す」。`spec/scenario/integration.md` IN-07は「元ファイルから再生成」→Drive取得→形式に応じた機械/LLM変換、現在本文版保存/警告/undo/編集lock/失敗維持。R03機械importの既変換と本文処理を共用し、R08/IN-07 foundationとR10永続jobへ結ぶ。localの独立機械menuを要件から導かない。

受付core候補: `requestMachineRegeneration(token, {noteId, commandId, expectedNoteVersion, originalId})`、このfoundation委譲ではsourceorigin local/format html|markdownの内部/test producer。利用者POST公開/独立menuは作らない。後続IN-07 entryはimmutable Drive record/bindingを確定する通常RegenerationSourceActionから同じmachine orchestrationへ接続し、そのtypedrequest/source差をSlice Cで採用する。verified actorと現在edit、active WS、note lifecycle、original.noteId/sha/bytes/format、ownershipGeneration、original.state処理なし、live LLM/machine/jobを同Txで検査。recipe識別は固定machine-html-markdown/v1をdigestの閉じた構成へ含める（モデル/指示/LLMepochなし）。client未確定intentは同commandでcommand読取から復元する。executor+command同digestは同receipt、異digestはconflict。受付時 `ensureRevisionHead` で現在本文のrevisionNoをpin済み履歴へ確定し、original previousを保存、batch/job(useAi=false)・machine row・original processing/activeJobId同idを同Tx。本文/Note.version/タグ/visibility/sharelinkは受付で変更しない。jobRepo.claimはmachine id除外、claimの消費競合はmachineRepoがexact version/current/owner/receiptに束縛する。現sourceDigestにない新recipe保存列は作らず、過去recipeの変更が必要なら別migration判断。

入力: MachineServicesに **既RegenerationInput/local/execution/ownershipの正規参照** を渡す。新Node regeneration configがbase container/storage/directory/worker paths/既DocumentExtractorから共通input/local/runtime/executionを一度生成し、machine runnerとcreateNodeLlmへ同参照を注入する。OpenRouter reader/factory/linked判定とは独立に構築し、machine boot/request/claimにsecret/profiles/月limitを要求しない。LLM factoryは従来configured/資格/quota/profilesを独立に判定する。既NodeLlmOptionsへの共有参照オプションはRoot採用後、従来callerの意味を維持する。LLM factory内private WeakMapから回収しない。同時原本memory共通2枠を保ち、別Mapで上限を倍増させない。shared RegenerationInputに`prepareMachine(lease, html|markdown source, signal): Promise<Extraction>`を追加し、NodeMemoryの既entry内bufferのみを正規DocumentExtractorへ渡す。lease/bufferをWorkerメッセージへ送らずbytes+formatだけ、元extractorのthis/args/result/実終了順は不変更。busy/read/native終了が揃うまでfinish不可。HTML/Markdown parserの実Workerが閉じるまで取消のsignal要求を成功closedへしない（既30秒parser timeoutの範囲で完了をawait）。新business子process0。

claim: candidate read-only→同期reserve/bind→exact write Tx→commitBeginの順。machine row/genericJob/current/owner/receipt/memory保存はexact原子性を持たせる。元recipe/source/account/noteversionの再検査、初回確定no-claimのみadmission返却。DB応答不明後のfalseは返却不可、元privateintent+同世代queued cancel fence/同savedclaim/同proofの正常再照合だけ回復する。claim前取消/失権/期限はnever-read terminal、read/prepare0。bound lifetimeが不明ならunknownを保持する。

owner/proof: machine parserはown Node内Workerでchild process0、原本readの実closedとparser caller settleを別観測する。既S4 record3/acquireは全native-child出生と既知PID確認を変えない。現在inputPredecessor/verifyの型はLlmConversion/PdfPreview専用なので**machine snapshotのexact対象追加は共有契約変更**。提案は既registry/record3とSourceInputReceipt proofを使い、consumer=machine/id/runtime/token/g、source/digest/currentrow/owner/memoryをexact束縛し、active/unknown owner closed→input closed0の2CAS同Tx→自己saved同値verify→consume→ACK。legacy能力/JSONproof/親不在からunknown child閉鎖の推定は禁止。machine専用一般operation基盤/第二journalは作らない。未対応の前任はheldで起動blockとなるため、この差を採用せず正常製品完了としない。

本文採用: prepare/sanitize/projectionと参照依存inspectionはTx前のbounded readonly準備。sanitized HTMLのsourceTitle/sourceHtmlをprojectionに束縛。input real finish proofの正常保存/consume後final-checkを行い、actor verified/edit/activeWS、note.version/ownershipGeneration、original id/hash/bytes/format/activeJobId、machine cancel/deadline/version/ownerclosed/receiptclosed0、generic job状態を最終同Txで再読。`scheduleReferences` + `commitNote` + notices/original ready/coverage + genericJob finish + machine success/resultVersion/terminalAtを同Tx。1個でもfalse/例外なら全rollback、旧本文/旧version/参照/タグ/public/share維持。sanitizeやprojection失敗で空/部分HTMLを成功へしない。scheduleReferencesは既loopback/fake検証以外の新外部実取得を今回許可しない。

失敗/取消: inputなしowner noneまたはexactclosed0だけ通常terminal。cancelGeneration+1とversion+1、genericJob/原本state戻しを同Tx、activeはabort要求後の実終了をawaitしてterminal。処理中の失権/削除/移動/source変更はcurrent guardから終端し旧本文保持。timeoutも実終了を待ち、未知native/read/proofは普通failedへ潰さずunknown/held。quota/dispatchテーブルは全境界0変更。本人history readは同commandを維持する。既JB取消/retry/reimportにmachine jobが実際に現れる場合だけ本人+machine判別の必要分岐を採用し、新commandによる明示retryだけ新receiptとする。local専用の再生成導線や新JB種類は作らない。IN-07の正常受付が未接続の段階では既JBに無関係な分岐を先取りしない。

undo: request時originalRevisionNo、成功resultVersionのexact同値、現在edit、他livejobなし、revision保持を確認。revision HTMLとresourcesから既historyのsafe reference restoration/projectionを準備し、最終Txで再検査→shared commitNote(cause restore/restoredFrom)→正常stateを保持。受入LLM undoの許可・quota・recipe意味は変えず同じbody helperを呼ぶ必要差だけ。undo後Note.versionが進むため2回目は拒否、他人jobのundo/履歴取得は拒否。元本文以外のタグ/公開/共有/現在titleを不意に巻き戻さない。共通採用関数はcallerの認可/job guardを引き受けるgenericoperationframeworkにしない。

## exact変更候補（Root採用前編集0）

以下はintegration22と別のSlice B許可案。Rootがwhole製品slice又はbackend→通常配線の2委譲に採番する。パス数を満たすための編集はしない。

| scope | exact proposed paths | 必要差 |
| --- | --- | --- |
| domain | `packages/core/src/domain/regeneration/machine.ts` (new) | existing MachineRegenerationの合法terminal/current/recipe/digest helper。schema/DDL不変更 |
| application | `packages/core/src/application/regeneration/request.ts`, `worker.ts`, `control.ts`, `completion.ts` (new) | machine受付/claim/現在fence/終端/取消/undo |
| application | `packages/core/src/application/regeneration/ports.ts`, `services.ts`, `current.ts`, `memory.ts`, `read.ts` | repo候補/exactclaim/live/page/cancel/prune、typedmachine prepare、sameproof/final current、normal本人DTO |
| body | `packages/core/src/application/regeneration/body.ts` (new), `packages/core/src/application/llm/worker.ts`, `control.ts` | guarded body採用/undoでcommitNote/reference/revision/projectionを再用、LLM既意味保持 |
| normal jobs | `packages/core/src/application/import/readImports.ts`、必要性を実装前固定する条件付き `controlJobs.ts` | actor本人history/pending DTO。既JBにmachine jobが現れる正常branchだけcancel/retry/reimportを接続、local専用導線0 |
| DI | `packages/core/src/application/di/hollowTypes.ts`, `packages/core/src/application/llm/ports.ts` | OpenRouter非依存MachineServicesと共有readonly正規input/execution/ownership、machine前任proof型。LLMサービス意味を拡張する不要export0 |
| libsql | `packages/core/src/adapters/libsql/repositories/regenerationRepository.ts`, `jobRepository.ts` | candidate read/exact CAS/history/cancel/prune、stock import claim machine除外 |
| Node | `packages/core/src/adapters/node/regeneration/memory.ts`, `packages/core/src/adapters/node/llm/config.ts`, `runtimeOwnership.ts`, `packages/core/src/adapters/node/regeneration/config.ts`, `runner.ts` (new) | OpenRouterより前の共通input/native/execution生成、正規extractorをowned bytes内から起動、proof対象machine、wake/sweep/normalstop |
| Node product | `apps/web/app/server.node.ts` | factory生成/DI/wake/stop、OpenRouter未連携でもmachine利用可、新export不要 |
| normal history | `apps/web/app/components/hollow/ImportJobs.tsx`（既machine job表示を必要とする場合だけ） | existing JB actor本人history/pending DTO。独立local機械menu0 |
| tests | `packages/core/src/application/regeneration/machine.test.ts` (new), `packages/core/src/adapters/libsql/__tests__/machineRegeneration.integration.test.ts` (new), `packages/core/src/adapters/node/regeneration/__tests__/machineRegenerationNative.integration.test.ts` (new) | grouped foundation/normalNode/history条件の必要直接対のみ。後続IN-07 component testはSlice C採用 |

通常利用者entryの次pathsは**後続Slice Cの依存であり今回Slice B実装scopeではない**: `apps/web/app/presentation/regenerationServerFn.ts`, `apps/web/app/components/hollow/RegenerationSourceAction.tsx`, `apps/web/app/routes/notes.$noteId.index.tsx`。Drive候補immutable record選択/警告/機械又はLLM/取消/undo、useTransition/useOptimistic pending/error/router.invalidateを同featureとして接続する。P5d本人資格/currentの正式受入とsource writer所有権が前提。

`commitNote.ts`/import `processJob.ts`/note revision/Parser2は再用の読取基点で、現案では編集しない。body helper抽出が既LLM意味を保てない場合はscopeを増やさずRootへ差を先通知する。workspace/trash/purgeは既genericjob/originalprocessing/currentguardによる取消とheld purge防止を借用し、新machine cancel時のactualabortはnormal import control/runnerから結ぶ。移動/削除Txがgenericjob状態を変えない入口が見つかれば最小exact追加pathを実装前提案する。P5dの未統合account変更は先取りしない。

Node backend完成はcore tests単体では証明できない。normal serverfactory→sameport→wakerunner→persistentjob、本人history/current DTO、boot-stop-chainを直接結ぶ。共通Node machine runnerのtimer/active/stopは既runner方針に従い、whole app停止時にLLMと共有execution/inputを二重finalizeしない明示所有順を固定する。利用者機能完成には後続IN-07の同RegenerationSourceAction→Drive binding/input→machine又はLLM→本文/undoと通常serverFn/pending/error/最終invalidateが必要。backend局所合格は同feature UI doneへ転用しない。Slice C/P5d/UI source所有権が残れば製品条件をpendingとする。

## 固定完了条件IDの提案

Root採番案: `P5c-3-S5` A–F（未採用）。A–EはR08/IN-07の機械/body foundation、R10永続job、R03機械importの共有処理。IM-06はLLM-onlyの既本文/undo契約維持として参照し、localMachine menuの要件にしない。Fは正常Node sharedservices/runner/historyと後続Slice C/P5dの同IN-07 feature UI依存。backend/core局所合格は通常feature全doneにならない。RootはFをbackend受入とUI残依存へ分けて管理可能。Drive実取得・音声・実サービスの未完は保持する。

| ID | grouped outcome/完了像 | direct evidence / 借用境界 |
| --- | --- | --- |
| S5-A | HTMLとMarkdownの内部正規producer→機械foundation→全量採用→直前本文undo、元原本/本文版/resources保持、タグ/公開/share不変 | application+実DBの両形式、旧commitNote/revision保持を借用。通常Drive entryはSlice Cで直接 |
| S5-B | 同command同receipt/異設定conflict、機械quota/dispatch0、editlock、actor本人historyと必要JB branch、画面離脱と独立の永続進行 | 実DB exact受付/claim/normalgenericjob exclusion/本人history。通常entry UI pendingはSlice C依存、件数でsuccess補完0 |
| S5-C | queued/nextbegin取消・期限・認可/source/revision変更でread0又は採用0、旧本文/version保持 | source-derived parametric共有guard。currentrole/source/version/clockは正規API、fake codecはcontractのみ |
| S5-D | input genuine finish、saved response-loss保持→同proof再照合consume/ACK、前任machine active/unknownの2CAS rollback/commit-loss回復 | 既S4 lifetimeを借用、machine対象の新proof/DB predicateは直接opaque正例+拒否。legacy/未知child保持 |
| S5-E | reference/projection/sanitize失敗のatomicrollback、正常refs/browse/revision/notice同時採用、undo権限/版fence | sanitizer/projection固定fault port、実DB Txrollback、loopback正規refのみ、oldbody維持 |
| S5-F | OpenRouter非依存normalNode sharedfactory/runner/bootstop/本人history、main統合wholechecks。IN-07 entry/警告/undo/error/pendingは後続Slice C/P5dと同featureで完了 | backend実DIを直接、後続samecandidate Drive entry/UIを別正式委譲で直接。isolated localcoreからF全doneへ転用0 |

IM-06は「LLMで作り直す」のみ。新local機械menuは提案しない。IN-07の既「元ファイルから再生成」entryがformatに応じた機械/LLM処理を起動する。今回の共有body受入のみでR08/IN-07全完了とはしない。

## 有限検証案と後続gate

今はtestcode/tools/root/DB/runtime/build/browser/probe作成実行0。Rootがsourcecandidate/正式criteria/exactケース順/fixturecount/helperhashを採用してから一巡する。

- pure/application: machine閉じた型/receipt/digest/current/undo条件、原本read/inputfakeをopaque正常portから生成する対。既LLM/全S4 suitesは再演しない。ケース30秒/pure群120秒。固定expected ops/state/quota0はseedsourceからcandidate固定時に導出し、SQL値をexpected成功へ写さない。
- fresh app family: memory予約案 `/Users/hikaru/.local/share/hollow-validation/p5c-s5-machine-app-4d9820ce`、root192MiB/DBapp32 native0 opaque8 audit8（max4/合計80MiB）、original8/cache16/TMP8/records8/entries8192。account2/WS1/slots HTML+MD2、machine同時1、所有memory枠2をLLMと共有、businessNative0。正常採用undo/idempotency/fences/atomicfaultを条件に応じた少数操作へ配分。case40/group180/body430+sharedclosure50=outer480/guard200ms、正常ownerPGabsent/EOF-FD/strict/DBsidecar0→bounded8MiB10秒64KiB wxcopy/readonlyqueryonlyFKintegrity/expectedcounts/actualclose。faultheld/自動retry0。既TMP-only内128+外128/最終strict方式を必要検討し、元helperを無採用実行しない。
- native family: 別memory予約案 `.../p5c-s5-machine-native-b03e8714`、同root/DB枠、HTML+Markdown正規NodeDocumentExtractorのactualWorker各1=計2/同時1、businesschild0、toolFork1。object OwnedRead.close/closed、parser結果と実exit/stdio終端、inputfinish、memory/pin/executionを別観測。条件付き取消/unknownfinishは既portで観測できる最小追加対を固定し、受入S4のcodec6familyを再演しない。最大Worker6以内、case40/group180/outer480、見えないIPC EOF/FDはnull。
- normalNode/backend: 共通factoryがOpenRouter未連携/secret未設定でもmachine portを構築し、LLM資格/quota branchは従来通り独立拒否する対をcore固定後の新mergedcandidateで直接確認する。stock server runnerは同input参照・本人history・normalstopを保持する。
- IN-07 normal UI（後続Slice C）: 上記coreが固定後、P5d/current正式受入、Drive製品source/binding/候補選択実装、UI所有権解放と新mergedcandidate/buildを別正式採用する。新archive256MiB/600秒、public exact依存だけ、旧B再利用0。同compiled graph/migration/assets/Worker entry/errorclass bindingと通常routeが必要。UI root/browser/Puppeteer/proxy/profile/child capsは受入tool現正式案をそのcandidateで再採用する（今回新probe/旧helperroot操作0）。外部ref/Drive/Google/OpenRouter通信0、loopback fixturesのみ。

独立Verifierはintegrationoutside22差0/Parser2同値、machine sharedport/domain→adapter依存、0043合法保存順、claim原子性/unknown返却禁止、共通body rollback、通常DI/UIの縦経路と有限資源を事前照合する。backend source採用・実検証・通常UI接続はそれぞれ根拠を分ける。未知未観測を正常closed/proof/ACKへ補完しない。

## 次にRootが決める事項と停止

- UI main writer release後のS4統合時点/親commitと独立integration委譲。
- S5 A–F/上表exactpaths/typedprepareMachine・machineexactclaim/history・正規共有input/execution・machine前任capability拡張の採用。machine genericJob同id連携とimportclaim除外は正常製品接続の必須差。
- 全量共通body/undoをLLM2箇所で抽出する比例範囲、FのnormalNode backend受入とIN-07/Slice C/P5d通常UI依存のpending条件。独立local機械feature/UI追加は採用案から除外。
- 実行前のsource-derivedfixturecounts/公開toolbinding/Worker数/新root/閉鎖監査予算。予約名はmemory-only、存在確認も0。

本doc固定後、全public reader/doc writerを停止。source/helper/main/C/B/製品/管理文書の変更0。accepted/failed私有rootのstat/read/hash/import/copy/reuse0。音声/実外部保留を維持。goal API/spec/spec-implement/追加agent0。

要件対応改訂検証: 原案 a443a562 から上記要件mapping/入力構成/通常UI scopeのみ補正。integration22 Git blob表/Parser2 table/commitstrategyは全文一致。共有契約はRoot採用待ち、製品/helper/main/管理/runtime/private変更0。全read/docwriter停止。
