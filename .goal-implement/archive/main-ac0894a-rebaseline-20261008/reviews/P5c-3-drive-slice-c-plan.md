# Drive Slice C：最小backend phaseの独立設計レビュー

判定：**方向はLIMITED PASS。最初の製品候補はDrive HTML/Markdown machineだけのC0へ限定する。** Rootは本レビュー途中のscope補正を採用済み。元proposalのDrive LLM/GET/UIまでを一phaseで実装可能とは判定しない。C0は同Tx binding/admission、同shared参照のprovider pair、active leaseでのfinal-inspectと保存ACK、closed後の最終Tx DB fenceを接続するSOURCE候補である。HTTP/native/privateproofのactual、通常GET/UI、P5d/main統合、全S5 A–Fは未完のまま。

## 固定資料・方法

- proposal phases/P5c-3-drive-slice-c-plan.md：17974B / a2206304353805a8d79558129fe10f2676c669901eeee1a0cf102b9d0d922b13。
- criteria/P5c-3-S5.md：6285B / fc37135e92fbff63fd8de9a40357efbbdb6641bb65555a8946b22179c115e3f0。
- PUBLIC SOURCEは/Users/hikaru/github.com/tuanemuy/hollow-p5c-machine-79ef126-20261006の以下既知named filesだけ。Rootのcurrent D1 diagnostic SOURCE721bc7ad/parent c137記録を借用し、Git/HEAD/1470 manifest/nativeTest/helper guardを再実行・再検証していない。main workingは未読取。commit受入・全SOURCE同値を本レビューで新たに証明していない。
- documentsとSOURCEはcanonical/regular/self UID/nlink1/NOFOLLOW、lstat・open fstat・読取後fstat・path再照合・全文SHAで固定した。SOURCE実mode600。最初に私的644比較を置いた読取は本文前で止まり、metadata診断で600を確認してPUBLIC static読取を続行した。正式helper/source gateの変更やchmodは行っていない。
- SOURCE本文は全文hashのため有限readし、判断に必要な関数・型・DI順序だけを使用。unknown file/tree/ancestor探索0、working/main/B/private0、runtime/Nodeimport/Git/DB/probe0。

| SOURCE relative path | bytes | SHA256 |
| --- | ---: | --- |
| packages/core/src/application/regeneration/request.ts | 4205 | bb10ea45ed25c59f2086f7b11440eef9adfd1806ffa35de7b4758656adf228fe |
| packages/core/src/application/regeneration/ports.ts | 2190 | 5c23d725b6cfe25f68ba928ecb0f5e0590a5ea2df080047a57201e234758cf44 |
| packages/core/src/application/regeneration/services.ts | 9672 | fe3ab70e284a0e6bb2eff82c2e14f553b69ff9b6eae2dfc90865211fb212a124 |
| packages/core/src/application/regeneration/current.ts | 9410 | 8fc22dac39bb06b3a7f498083c4b936bd928a0f4d35875a2fcfc8591ed8d47ed |
| packages/core/src/application/regeneration/source.ts | 11461 | 9399952caeeea40afb8dcbb6771a6f1a290905124873a28cddeb95ab0c0c5506 |
| packages/core/src/application/regeneration/worker.ts | 17716 | 6154919239f839e93a5f13ec1d916435e4bb10e23077d5d612e779c9efa855db |
| packages/core/src/application/regeneration/control.ts | 6138 | ac6f8ec234bb2af908cc57107b0cd42f0b4f1ca63b1de52012e38afd189556ad |
| packages/core/src/domain/regeneration/entity.ts | 6214 | e8302bbfc23d4d9baebd704466e00c2ba13629f721de366d2a720668d128af79 |
| packages/core/src/application/execution/hollowUnitOfWork.ts | 7199 | c22d1dcff055a6e015ba1731840951c4295c23e9eb615323b851f9e4990f3a94 |
| packages/core/src/application/di/hollowTypes.ts | 4163 | 19e33ae3815b527fce633d44bbbe94d04c87a8c2d78ac16e2deff9fae76c26eb |
| packages/core/src/application/llm/request.ts | 15334 | 32991083aa133c3c092b80e2bada555d2f12e7d97913950d3746a178ec0697ca |
| packages/core/src/application/llm/current.ts | 4253 | 7f31a9c440bb07e1cddc00c0dc574144334fa7e50dfaa91c3a19d1332d0c550b |
| packages/core/src/application/llm/inputStage.ts | 3675 | 58ed11dec749e0cf5616d1bcbb1bbfe141ee0797dbf3f06195d54da94ede75f2 |
| packages/core/src/application/llm/worker.ts | 32277 | 0f2e0837dc29b2577deb556ebe1ff58b11437ef6ac46b754569a5f177eb2ddc6 |
| packages/core/src/adapters/node/regeneration/config.ts | 4089 | e0c6a4ad56b6dcf11bbb57c8eb6cd0e64ceaaf457838e9502d3a00260cd67cf3 |
| packages/core/src/adapters/node/regeneration/input.ts | 27320 | 4c17625f85f756446f1a722b94c50d17d7d334efa0494ca1419df900253e5210 |
| packages/core/src/adapters/node/llm/config.ts | 2326 | 43ead1b8d9aff85a0d8be38a0258510842d3de2adc426cb0aaecee5d678f240c |
| packages/core/src/adapters/node/drive/factory.ts | 3003 | 6f7ef37efe43c8fa62ebab67d3841162ad28c763deff4898e94a58f896854405 |
| packages/core/src/adapters/node/drive/http.ts | 19407 | 3afdf8bd5976d0062dab39ee260fd56b559096ec4390e3b43f243022df44be06 |
| packages/core/src/domain/account/entity.ts | 1932 | f3b026a6b777c6ef9ef62c0b6b673e2752ab83c57ef88f3bd3302663c28bfbc9 |
| packages/core/src/domain/account/ports/accountRepository.ts | 873 | 33c161bebc020ca25bb50aa8fecf85234be8fc7fb110a3060299f816ae6e8124 |
| apps/web/app/server.node.ts | 28493 | 5658badf242b153be86b9252c6ce00a5245396cdabeb183297ef6532143a29c6 |

## 実装可能な基盤と必須補正

### 同Tx受付は既port/schemaで構成できる

HollowUnitOfWorkContextはregenerationBindings/Records/Attempts、machineRegenerations、generic jobs、imports、accounts、driveConnections、targets/transfers、revisionsを同contextに持つ。SourceBindingRepository.insertとmachine/job/original保存を同run callbackで行える。sourceBindingSchemaはexecutor/credential owner/record/note/original/subject/epoch/generation/fingerprint/consumer/versionを既に保持する。新journal/DDL/削除schemaや並行repositoryを作る必要は、今回の入口には認められない。

既requestMachineRegenerationは同Txにbatch/genericjob/machine/original.processingを保存し、after-runでwakeする。ただしsourceはfindByNoteのlocal original、digestはlocal recipe/noteだけ、accessはlocal-original固定である。新Drive facadeから既public requestを呼んで別UoWへ入る方法は不可。既request.tsから型付きのTx内admission helperを抽出し、local関数と新Drive facadeがそれぞれ認可/snapshot/commandを確定して同helperを呼ぶ。local payload/digest/receipt意味を変えない。

C0 Drive入力はrecordId/noteId/noteVersion/commandId/confirmed:trueのmachine-only型とし、LLM fieldsを導入しない。serverで選択record/target/保存original/hash/bytes/formatを再読し、executor現session/edit/active workspace、記録本人verified/linked/subject/epoch、source ownershipGeneration、他livejobを同Txで検査する。対象originalはrecord.originalIdであり、latest localへのfallbackをしない。bindingとjobは同jobId consumerで確定し、途中commit・nested UoW・bindingだけの残留を禁止する。

command codecはserver-derived record/method/設定/note版を含む固定versionへ束縛する。新生成jobIdや処理後のcurrent版をrequest digestへ入れて同command receiptを壊さない。Drive samecommand再読はactor/editを再検査し、same receiptとchanged-record/changed-note/version conflictを区別する。後続machine/LLM unionでは両command repositoryを同Txで照会し、同executor/commandのmode変更を拒否する必要がある。別tableの各command照会だけではcross-kind同一command制約を表せない。DDLが本当に必要と判明した場合は採用前に通知し、独自command tableを黙って追加しない。

### provider pairは同shared参照へ後から型付きで合成する

createNodeRegenerationはownership/input/local/execution/progress/extractorを一回生成する。createNodeMachineはsharedをspreadしてwakeを付けるだけである。server.nodeはこれをOpenRouter判定前に生成し、同regenerationをcreateNodeLlmへ渡す。NodeDriveは後段で一回生成され、そのfactoryが同NodeDriveExecutionを使うNodeDriveHttpを保持する。

C0はNodeDrive factoryの既httpで新SourceProviderを作り、Drive生成後に既shared input/local/execution/ownership/progressと、同Drive execution/protector/provider pairをmachine serviceへtyped合成する。再度createNodeRegeneration/createNodeDriveを呼ばず、private ownershipやruntimeを複製しない。新pairを先に注入するためだけにOpenRouter前のshared作成を遅らせない。containerの最終合成でmachine serviceを差し替える場合もservice wrapperだけで、資源参照は同じである。これはmain接続ではなく隔離SOURCEのNode DI候補差として扱う。

RegenerationServicesは既にprovider+driveのall-or-none unionとSourceExecutionのrequired confirmSourceAcknowledgedを持つ。MachineServicesにも同型境界を組み込み、pair無しlocalは維持、pair片側だけは型で拒否する。c.drive有りだけでDrive受付可能とはしない。確認能力が無いpairはunavailable/failclosedであり、cast/boolean/fake ACKで補わない。NodeDrive returnのprovider公開方法は既NodeDrive/services/テストfactory互換を型で検査する。DriveServicesへ一般source providerを追加する大きなport改変は必要と確定していないため先採用0。

新sourceProviderは原NodeDriveHttp.sourceのmetadata/downloadを使う。既HTTPはmetadata64KiB、download52,428,800B、同native execution登録/closeを持つ。metadataはrecord/hash/bytes/fileId/parent/trash/canDownloadと照合し、bytes digestをadapterで検査する。元backupのoctet-streamをHTML/Markdownのremote MIMEへ強制しない。Google-native/shortcut/unknown checksum等は対応条件を明示して拒否する。new HTTP transport、secretのDTO漏出、metadata成功だけでnativeclose/ACKの合成は禁止する。

### active final-inspectとclosed後のDB fenceを分ける

source.tsのcaptureはreceipt active、runtime/token/generation、memory52,428,800を要求する。readInput(final-check)は同lease activeで新SourceAttemptを作り、原withCaller/runのresult+actual closureを保存し、caller終了後のacknowledgeSourceClosureと再captureを通る。ここをfinish後に呼ぶと契約違反になる。

現在machine workerはread→prepareMachine→input.finish→finishInput→prepareBody→最終Txである。C0 Drive枝は、取得→extractor/body準備→lease-active final-inspect→actualclosure保存/callerEnded/ACK確定→原input.finish/finishInput→最終Tx、という順へ限定変更する。prepareBody後にremote検査が必要なら、そのbody準備をDrive枝だけfinish前へ置く。共通順へ動かす場合はlocal read数/proof取得時点/body sideeffects/rollback/withOwner finally/stop等の意味差をcandidateで明記して別レビューし、不要にlocal枝を変更しない。

同leaseへの新read/newfinish proofをclosed後に作らない。final-inspect失敗又はACK不明はbody採用0、genuine proofを取得できない経路を通常terminalとして資源解放0。保存応答不明は既同original proofのdeferred/readback/consume/自然finally規約を保つ。metadata read/inspectをfake callbackで成功させてもnative closureの受入にはしない。

currentMachineの現在最終Tx fenceはnote/version/head、selected original/hash/bytes/format/activeJob、generic job/lease、ownershipGeneration、active workspace等であり、Drive binding/record/credential owner/current subject/epochはまだ検査しない。active captureからDB-current判定をtyped helperとして分離し、source.tsはactive lease/attempt条件を上乗せ、currentMachineの最終Txはclosed入力のままDB側同snapshotを再検査する。HTTPは最終Tx内へ入れない。このためsource.tsは元proposal表に加えてC0の必須編集pathである。

final-inspect外部snapshotと最終TxのDB状態は別境界で、遠隔更新との原子的採用を主張しない。現provider read/inspect型はbytes/voidであるため、acquire時remote versionを後のinspectへ連続束縛したと無根拠に述べない。同read内のversion比較とfinal metadataのrecord照合を明示し、跨attemptの追加typed snapshotが必要ならport変更を実装前に通知する。

## 最小C0候補のexact change group

Root採用前は編集0。既D1 SOURCEにwriterを入れるとhelper source1470 bindingが変わるため、候補は721bc7ad基点の別隔離worktreeで作る。worktree名/source-owned0700/public108 alias/CF binding/親commit全文は次委譲で固定し、現在はworktree作成/Git/sourcecreate/probe0。main、D1source/helper、S5既fixtureは変更しない。

| exact source path | C0差 |
| --- | --- |
| packages/core/src/application/regeneration/driveRequest.ts (new) | machine-only typed入口、同Tx current record/binding/command受付 |
| packages/core/src/application/regeneration/request.ts | 既localを保持するTx内machine admission抽出 |
| packages/core/src/application/regeneration/current.ts | active取得とclosed最終Txから共有できるDB Drive binding/current fence |
| packages/core/src/application/regeneration/source.ts | 既active capture/attempt/ACKを新typed DB helperへ接続、closed再read禁止 |
| packages/core/src/application/regeneration/services.ts | MachineServicesとRegenerationServicesのall-or-none pair接続 |
| packages/core/src/application/regeneration/worker.ts | Drive限定prepare/body/final-inspect/finish/最終Tx順、unknown保持 |
| packages/core/src/application/regeneration/control.ts | Drive retryをlocal受付へ落とさない。元record/bindingの再受付又は明示拒否 |
| packages/core/src/adapters/node/drive/sourceProvider.ts (new) | 原http/sourceのmetadata/download/inspectとbounded digest照合 |
| packages/core/src/adapters/node/drive/factory.ts | 同http/executionでtyped providerを一回作る |
| packages/core/src/adapters/node/regeneration/config.ts | 同shared refsにsource pairを合成するNode machine型境界 |
| apps/web/app/server.node.ts | Drive生成後のtyped machine合成、共有資源のboot/stop順保持 |
| packages/core/src/application/regeneration/driveRequest.test.ts (new) | command/Tx/認可/選択originalの意味あるapplication対 |
| packages/core/src/adapters/libsql/__tests__/driveRegeneration.integration.test.ts (new) | binding/job rollback、最終Tx fence、通常repository接続の回帰対 |

上記は11 source+2 testの候補groupで、全部編集が不可避という断定ではない。既undo/body/completion/ports/schemaを変更せず契約を満たせるかcandidateで確認する。追加paths/DDL/codec変更が必要なら先報告する。型合わせのためunused interface追加やunsafe castをしない。pure fakecodec testsはcodec/DB論理scopeに限り、private/native success証拠を発行しない。

## C0受入条件とA–Fへの対応

| 条件 | C0が支える範囲 | 残るactual/後続条件 |
| --- | --- | --- |
| A | Drive HTML/Markdown selected owned source/hashから原extractorへ渡すtyped入口。旧本文/原本/tag/public/share、same resultVersion undoの原規約保持 | genuine owned bytes・parser実終了・全量本文/undoの通常actual |
| B | 同Tx binding/machine/generic job同id/original.processing、Drive同command同receipt/変更conflict、machine quota/dispatch0、import競合fence | 通常history/JB/編集lock/UI、LLM cross-kind unionの後続対 |
| C | queued取消でread0、credential/actor/edit/workspace/source/version変化でread又は最終採用0、unknownは保持 | P5d shell型接続・競合raceの直接証拠 |
| D | 原SourceAttempt/withCaller/actualclosure保存read/ACK、同finish proof保存応答不明の能力保持を接続 | native owner/2CAS rollback/応答損失のnormalactual。既未知結果を成功化しない |
| E | body準備とcurrent/finalTx、本文/browse/revision/resources/notice/jobの原同Tx採用・rollback、undo fence維持 | sanitize/projection失敗・finalTx rollback/undoのactual |
| F | OR無しmachineで同shared resources/Node factory/runner/boot-stopを型安全に配線、隔離候補wholechecks | S5/main/P5d統合、GET/POST facade、通常Drive entry/browser pending/error/取消/undo/invalidate |

SOURCE候補に必要な意味のある対：HTML/Markdown両positive、選択recordがlatest localとは別でもfallback無し、同command再読/変更conflict、本人/別executorのedit+recorder資格、OR無しmachineとquota/dispatch変化0、同Tx binding又はjob insert失敗でall rollback、取消before-begin read0、final-inspect失敗/closed未知/ACK未知で採用0、prepare中のrole/epoch/subject/note/head/generation変化で最終Tx採用0、Drive retryが元recordを保持するか明示拒否、same-result undo/競合拒否、same input/execution/ownership/Drive executionの参照identity。nativeイベント/brand/privateproofを人工生成しない。

全候補worktreeのpnpm typecheck→pnpm lint:fix→pnpm format、outside-scope差0、Parser2/既localLLM/S5 accepted branches不変、source manifest/headblob/type/hash固定がsource提出の必要条件。現taskでchecks/runtimeを実行したとはしていない。candidate提出後の有限tests/native/HTTPはRootが別scopeで採用する。loopback TLS/provider工具にoriginal transport identity/自ownPG/PIPE/FD/resource budgetsが必要なら、その工具候補は製品source phaseと分離する。

## 後続phaseとaccount依存

**C1 Drive HTML/Markdown LLM**：llm/request.tsのadmitLlmはaccess local-original固定、HTML/Markdown sourceOwnershipGenerationはnullである。llm/current.tsはcurrent/value originがlocal以外なら明示拒否し、llm/inputStage.tsのleasedText/leasedLocalもlocal-onlyである。request/read/workerだけの旧表ではDrive branchは到達できない。必須後続scopeはllm/current.ts/inputStage.ts、typed admission access/generation、regeneration input/LLM configで同pairを渡すこと、Drive final-inspect/最後のDB source fence。OpenRouter本人credential/epoch/quota/dispatch/recipe/preview意味は既枝のまま。LLM ports差はcandidateの型が必要とする場合だけ先採用する。未対応Drive jobをqueueへ投入してlocalへfallbackさせない。

**C2 P5d current/account接続**：読取S5 Accountはunverified/verified union、AccountRepository.findByIdはAccount|nullで、退会shell/StoredAccountを表せない。したがってS5上のstatus!==verified検査をP5d shell統合済みの直接証拠とはしない。C0はこの既契約でactive qualificationを再検査できるが、shell-specific受入は未完。P5d accepted StoredAccount/identity/deleted anchorを正式型/adapter/currentへ接続する別phaseを固定してからmain上のshell raceを検証する。独自deleted enum/DDL、cast、P5d未統合typeの横取りを行わない。P5d sourceは今回新規読取していない。

**C3 GET/既POST3/UI/main接続**：候補page/exact/receipt/historyのGET facade、既request/cancel/undo POST factoryへstrict union dispatch、保存job種別server再読、React19同leaf所有/actor isolation/unknown GET再照合は別source group。C0に新endpoint/serverFn/UIは0。C1まで終える前にLLM Driveを提供可能にしない。main統合は受入S5・P5dのtyped接続とfresh merged candidate/newbuild/compiled bindingsの後であり、旧UI/B/proofを新Drive entryの根拠へ流用しない。

## 固定・停止

新review一file以外writer0。source/helper/manager/main/S5/P5d変更0。SOURCE1470全walk/guard/Git/nativeTest/default/preflight/import/DB/runtime/worktreecreate/rootprobe/newroot予約0。B実物と全old success/failure/generated/held rootsのstat/read/hash/copy/import/reopen/replay/cleanup0。source readonlyは上記named22 filesだけで終了。D1 actual原因UNKNOWNと既局所評価を変更しない。review wx600/fsync/実FDclose/same-inode全文hash固定後、ALL reader/writer/runtime STOP。
