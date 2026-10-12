# P5c-3 S3 再開計画

2026-10-06。Manager採用待ち。製品・DB・test・runtime・build開始0。受入基点a013479と現在HEAD a243480のtracked treeは同一（efab02a58d2dc5335c3f384d58a10bf3992fc57c）。旧S3案と独立レビューのM1–M4を、現tracked sourceへ照合した。S1/S2受入は維持する。spec/spec-implementを呼ばない。

## 完成条件と境界

R08/IM-06、IN-07、R12に対し、通常local text/HTML/Markdown・fixed preparationVersion1を既受付/quota→candidate→atomic claim/input予約→read/実準備→closed0確定→既dispatch→本文CASへ接続する。取消・失権・期限・不明commit・正規前任回復とphysical purge前の保持を含む。既月30回、media、undo、PDF/Office/画像legacy、response再送禁止を維持する。

Drive通常受付/UI、他formatの新lease、音声、退会、実外部は後続。音声保留と外部操作/費用未許可を保持する。旧PID探索・広域process/env一覧0。

## 採用を求める共有契約

### M1 正規前任の由来とlegacy

現runtimeOwnership.tsの文字列predecessorsを新input proofの根拠にしない。既owner recordにstrictなversion2枝を追加し、現runtimeのinputMode（leased-text-v1）を最初のclaim前にfsync/rename/dir syncで保存する。前任履歴はruntimeId、由来（legacy又はleased-text-v1）、正規acquireによる同process終了確認を保持する。旧schemaから継承した文字列はlegacyとし、由来を補完しない。再起動を跨ぐ未ACKのleased履歴もその由来を保持する。

正規acquireは既0700 directory/0600 regular/nosymlink owner/排他lock/読取前後同値とexact PID不在を確認する。現record版/履歴の欠測・差替え・live/reused PID・読取不能ではcapability0。Node ownership adapter内のprivate registryだけがopaque capabilityを発行/検証する。capabilityは発行registry/現runtimeとexact前任runtime、consumer、元token/generation/source/receiptへ束縛する。JSON/proofId/boolean/legacy文字列から発行0、別registry/consumer/runtimeへの流用0。

新receipt cleanupはlocal-original、bindingNULL、fixed/version1だけ。元owner unknownならowner closed（memory/receipt不変）→stage closed0の2CASを同Txへ束ねる。2番目のfalseはTx全体を失敗させ、partial commit0。既0043 OLD unknown guardを緩めない。DB確定又はexact保存同値確認前にproofを消費/前任ACKしない。新receiptの未回収行が残るruntimeはlegacy回復だけでACKしない。receipt NULLの旧回復を維持し、欠測由来の新receiptは保持して有限報告する。

同host/PID namespace・exact DB/storage・local単一processを前提とする（docs/runtime_node.md:122–124,271–278）。移設/コピーrecordの真正性やmulti-host failoverをPID不在で証明しない。実子1は正規record作成→自然終了の限定正例であり、Worker付きcrash全回復の根拠ではない。

### M2 初回no-claimとunknown replay

repositoryはcallback/commit booleanを受けず、candidate snapshotとexact claimだけを扱う。Node facadeはopaque admissionと自分がawaitしたUoWをprivateに束縛する。初回のUoWがwriteなしno-claimを返し、外側commit成功まで確認した場合だけ予約返却を認める。job等のpartial write後falseは禁止し、失敗ならTx rollback/unknownへ。

| private状態/確定根拠 | 結果 |
| --- | --- |
| reserved・bind未到達 | holdで返却、write/read0 |
| first-bound・確定writeなしno-claim | 初回限定settleで返却 |
| first-bound・claim確定 | 同admissionからleaseへ一度だけ移行 |
| bound・保存応答不明 | 同予定owner/token/receipt/expectedVersionのintentを保持 |
| unknown・saved完全同値 | 同leaseへ一度だけ移行、current確認後read |
| unknown・同expectedVersionへ同じ予定claimのCAS/commit確定 | version fence後に同leaseへ移行 |
| unknown・取消/失権/期限のexact never-read terminal CAS/commit確定 | 元writeをversion fenceし返却 |
| unknown・replay false/busy/旧値読取だけ/別version/例外/commit不明 | 予約保持、新read/新世代0 |

元caller Promise終了を旧write不能の証拠にしない。再CAS falseのTx成功だけでも解放しない。late original writeとreplay成功/終端fenceの両順、replay false、終端commit応答喪失を同じexpectedVersionで確認する。偽/二重/別registry settleは無作用拒否。最大2intent/lease/proof・100MiB合算、既2秒wakeで1intentあたり読取Tx1＋必要CAS Tx1、再帰retry0。deadline後read0、stop最終照合1回。継続DB障害/実close未証明は保持し、正常stopを偽らない。

### M3 初回never-read終端とcurrent

candidate処理は容量busy/競合無変更、atomic claim、取消/期限/失権確定never-read終端を判別する。candidateはcapacityによる無変更待機の前に、確定取消等のcleanup対象を選べる。never-readは旧version/source/memory0/元receiptを保存したexact版CASと、既quota/job/original/表示の正規終端を同Txで行う。新active50/new receiptを作らず、現在編集権限をcleanupの再条件にしない。旧dispatchを権威にall-unsentだけ返却し、保存済response/intentの消費を無条件返金しない。旧本文を維持し、次候補の永久待機を作らない。

worker.completeのidle拒否はqueued never-read専用枝で扱い、idleのままterminalへ移行する。ownedの通常complete契約を弱めない。response-ready失効は旧owner/receipt/response保持の正規終端とする。

currentLlmSourceの既closed0条件はdispatch/本文採用に残す。read/prepare前と稼働sweepだけexact opaque lease、active50、runtime/token/generation/source一致を検証する限定枝を設け、既認可/OR/media照合を再用する。capabilityなしのmemory50を許可しない。入力終了後はclosed0へ戻り、media付きprepared結果のasset再確認を維持する。

### 通常接続・保全

LlmServicesは明示legacy-local/leased-textのunion、leased側stage必須。Node factoryはleased-text、既fakeはlegacy-localを明示する。RegenerationServicesはinput/local共通＋Drive/provider有無のunionにし、能力欠落の暗黙fallback0。local-onlyからDrive branchは提供前拒否。

textのstorage.withOwnerはread→current再確認→media付きprepare→実Worker exit/両pipe終了→親bytes参照破棄→finish closed0 DB確定まで保つ。read後prepare前abortは自身のidle bytesだけdiscard、reading/busy/unknownでは拒否する。finish応答不明ではproofだけでなくobject pin/execution/input枠を保守保持し、dispatch0。response-readyもowner＋次receipt＋50＋job lease/responseBudgetを同Txでclaimし、旧responseを再送しない。

purgeの共通hasWriters全既4呼出にinput unionを加える。LLM/preview/machineのmemory非0又は非NULL active/unknown receipt、sourceHeld（closedかつcaller未終了/未ACKも含む）、machine実ownerを同read-only guardへ含める。NULL receiptはlegacyとして扱う。pruneは既memory0/bindingNULL/owner終端にreceipt NULL又はclosedを明示し、保持中physical remove0、解除後正規purge/prune成功を対で確認する。S1のDrive-only redaction/raw結果とattempt→binding→record順を変えない。

## Exact変更path

以下はpackages/core/src/相対。新DDL/旧0043以前/lock/設定/server.node.ts変更0。

製品17path：domain/llm/repositories.ts、application/llm/{services,ports,worker,current}.ts、application/llm/inputStage.ts（新規）、application/regeneration/{services,memory,source,current}.ts、adapters/node/regeneration/{input,memory}.ts、adapters/node/llm/{config,runner,runtimeOwnership}.ts、adapters/libsql/repositories/{llmRepository,purgeRepository}.ts。

test8path：application/llm/inputStage.test.ts（新規）、application/regeneration/{memory,source}.test.ts、adapters/node/regeneration/input.test.ts、adapters/node/llm/runtimeOwnership.test.ts、adapters/libsql/__tests__/llmInputStage.integration.test.ts（新規）、同llmInputStageFixtures.ts（新規）、同llmInputStageNative.integration.test.ts（新規）。既input.testやruntimeOwnership.testの非S3ケースをまとめて実行しない。

型追従のみ8path：adapters/libsql/__tests__/{llmRecoveryLifecycle,llmControl,llmFlow,llmSourceMedia,llmPdfApplication,llmDocument,llmImage,llmIdentity}.integration.test.ts。これらのbeforeEach/createTestContainer/mkdtemp/PDF fixtureは本検証では実行0。R12の期待は新app fixtureへ移植する。追加の型追従pathが必要なら編集前にRootへ通知する。

docs/runtime_node.mdへrecord版、限定前任回復、unknown/stop保持と再実行手順を記載する。こちらは製品17path外の運用文書1pathとして採用を求める。旧helperはimport/再利用0。新fixtureは既public client/UoW/正式migration APIを直接使い、既private rootを参照しない。

## M4 比例ケースと予約資源

ケース数は受入条件ではなく、下記60境界の計画値。数合わせのassert追加0。case識別はS3-P/A/R/N接頭辞に限定する。

| 群 | 対応するケース | DB/slot |
| --- | --- | --- |
| P01–P22 | global2/sameconsumer、busy、初回no-claim、unknown saved/同intent replay成功/false、偽/二重settle、取消/期限/失権cleanup、read失敗、finish不明pin保持、世代差、discard reading/busy/unknown、media/local能力、版付き前任/legacy/別registry拒否 | DB0/実Worker0。ownershipのFS/processは注入fakeで確認 |
| A01–A06 | queued busy不変、parallel claim1、初回no-claim返却、saved/未保存commit不明、取消先行 | app、slots01–06 |
| A07–A10 | 失権終端、closed receipt再claim、response再送0、旧NULL互換 | app、slots07–08（各ケース正常cleanup後のみ再利用） |
| R01–R12 | PDF preview quota0/ready期限/consume、PDF pending/page/finalCAS、Office recipe/limit、画像recipe/raster limit、media、undo/OR current | 同じapp、slots01–08。fake parser/generator、native/child0 |
| A11–A14 | held purge拒否、解放後purge、90日prune保持/解放、前任限定CAS | app、slots09–12 |
| A15–A18 | 初回queued取消のnever-read、current失権＋response-ready失効、late original/replay false/成功/terminal fence両順、前任2CAS途中失敗/commit不明再照合 | app、slots01–08。成功正常cleanup済みslotのみ再利用 |
| N01–N06 | text/HTML+media/Markdown+media本文CAS、準備中取消、UTF8等prepare失敗、prepare後generator不明 | native、slots13–18、各実text Worker1（W1–W6）、同時1 |
| N07 | read後prepare前abort、finish前後の所有/pin/dispatch確認 | native、slot19、Worker0 |
| N08 | stop pending最終照合＋正規前任recordの子自然終了と限定cleanup | native、slot20、Worker0、前任Node子1 |

実行順A01–A10→R01–R12→A11–A18→N01–N08。appに自己account2/WS1、nativeに自己account1/WS0、総account3/WS1/note-original slots20。fixtureはslots12+8を一度だけ作り、同noteの後続jobは既受付により差替える。既caseに失敗が生じた時点でbailし、成功未確定DB/slot/resultsの再使用0。期待されたfault injectionは同case内で正規reconcile/終端確定まで完了したものだけ次caseへ進む。quotaは既月30のまま、clockを限定fixture月へ進めてリセットし、運用limitを上げない。

新0700 persistent rootはRoot採用後に一度だけ割当。root192MiB、app/native各32MiB（sidecar込）、停止native opaque8MiB→audit8MiB、計4logicalDB80MiB。app/nativeは正式新空0043、migration2回だけ。opaqueは非接続、auditはquery_only。停止/子pipe/FD/DB確定を確認できた時だけcopyし、8MiB超又は実終了不明ならcopy成功を偽らず保持して報告する。copy前後DB hash0。旧DB0、failed追加DB/retry0、未使用枠転用0。

原本計8MiB/1file1MiB、helper/log8MiB、NodeTMP8MiB、material256KiB（record含む）、新AES2本/64B以内。新fixtureはroot・mode・regular/nosymlink・容量をcase前後で検証し、失敗後unlink0。formal migrationはtracked public folderを直接使い、旧helper/旧結果/旧鍵を参照しない。writer/testworker各1。generator/profileはin-memory契約、HTTP/Chrome/appboot/外部0。前任子は自作の固定helper1で自然終了だけ、自己PIDのみ限定観測、未知PID探索/追加kill0。

期限：P case2秒/群60/外90、A case10/群120/外180、R case10/群180/外240、N case40/群300/外360、前任子5/外15、stop60/子pipe10。text既prepare30秒/close5秒と既業務deadlineを延長しない。tool wait50秒以下。timeout/terminate要求/自然exit/Worker exit/両pipe/FD/DB確定を別観測し、欠測は補完しない。

規定pnpm typecheck→pnpm lint:fix→pnpm format→接頭辞限定P/A/R/N→build1→posttype。規定checksはこの順を一巡する。lint/formatの対象外変更が生じたら自分の差分だけを戻す判断をRootへ通知する。db:generateと全既suiteは実行0。buildは新別outDir256MiB/旧distへのwrite/read/import0、事前に設定成立を確認しRootへexact invocationを通知する。新worker/entry/source/DDL/lock/distのpublic hashでcandidateを固定する。主実装候補と全writer終了をRootへ報告後、Rootが独立Verifier資源を別に割当する。本枠を独立枠へ使い回さない。

見込6–10時間、15分停滞で試行/根拠/障害/次手を通知する。Root採用後に製品を変更し、具体path/資源/契約の拡張が必要なら該当編集・実行の前に差を提案する。

## 採用後の限定差

Manager採用済み：application/llm/completion.tsを追加し、既owned終端とqueued idle never-read専用終端を共通化する。candidate read-only Tx→同期reserve/bind→exact claim Txへ分離し、後者で同version/current/容量を再確認する。owner/receipt/jobの同Tx、fallback0を維持する。前任Tx commit済み応答不明のterminal/closed0行照合用に、ownership自身の未consume proofを最大2列挙するpendingInputProofs(runtimeId)を追加する。外部JSON復元0、exact保存同値後のみconsume/ACK。
