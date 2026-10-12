# P5c-3-S4-C 残familyの公開実装・有限検証案

2026-10-06T05:10:32.057534+00:00。**提案のみ・source/test/helper実装0・runtime/rootprobe0**。source基点d0cc21a1cf53b2ea82cb7d8c63268babc20425d1、1459pair5caa/shapef7c8/public108/currentCF型を採用正本とする。A/B/D/E既受入、個別toolFork物理閉鎖F-local受入を維持。CとwholeFは未完。heldbf301/e547のcopyaudit欠測・Node非0/最終strict欠測は保持し、新Cから旧private結果を補完しない。

## 完成対象と借用

S4-C残条件は取消/編集権限喪失/期限による次begin・dispatch拒否、初回確定no-claim対unknown後のfalse保持、部分送信後失敗の論理quota1消費と旧本文、全未送信の正式input終端＋delivery条件でだけquota返却。finish応答不明の同opaque proof/lease/pin/execution/派生pending→saved同g再読→consume一回はE02、前任rollback/commit応答喪失→sameproof/ACKはD01/D02で受入済みなので再演0。PA queuedV2取消・正常12/9、Native7 A/B、E内部V4とV3・原本/派生/実子閉鎖は不変更借用。今回codec出力port fixtureの成功を実Worker/codecchild/GC/proofの新証拠へ写さない。

公開静的正本（全ownS4source）:

- `application/llm/inputStage.ts:15–30` leasedLocalはV2/prompt1・V3/prompt2・V4/prompt3とpendingを同private local境界へ通す。`adapters/node/regeneration/input.ts:99–196` claimは同candidate/current/version→private admission/bind→claimTransaction。`memory.ts:154–196` 初回bound no-claimだけsettleClaim(first-no-claim)で破棄、unknown時のno-claimは残す。`input.ts:217–292` resumeはnormalcancel exactfence/quota released/dispatch0又はsaved exactclaimを確定してから同admissionをsettleする。
- `application/llm/current.ts:13–78` はcurrent receipt/source/g/memory/owner/cancel/deadlineを形式非依存に判定し、note lifecycle/version/current認可、sourceGeneration/original/account/connectionを続けて判定。`worker.ts:333–347` V4各頁begin前、同404–434で全形式intent前、同456–475でresponse/finalize前に現在値を再検査。`input.ts:617–673` beginLocal自身もcurrentSource→同source/receipt closed0→g+1同Tx保存を要求する。
- `worker.ts:594–653` はprepare失敗でも元leaseをfinishしてからcurrent ownerを再照合、failure.closed falseならunknown保持、trueだけterminal completeLlm。`completion.ts:29–84` は正規owned/never-readを区分して終端しreleaseUnsent。`llmRepository.ts:996–1007` dispatch intentで一回consume、`1152–1196` refundはterminalかつowner非active/unknown・dispatch全prepared/not-sentだけ許可。response/intent/unknownが一件あれば返却しない。

この共通判定の同一性をV2/V3/V4全組合せの9取消対へ膨らませない。初回admission判定はrecipe選択を含むためV2/V3/V4各1対を直接行う。V4は新reader逐次世代を持つので取消/失権/期限を各1直接行い、V2/V3のpost-prepare dispatch/currentは同guard・同finishと下記failure対を併用する。編集権限の通常APIは同Txで取消世代も増やすため、role単独predicateの実隔離証明と混同せず、実role低下＋取消の共存を直接、canScope拒否分岐自体はsource静的根拠に分ける。

## 最小9caseと正規前提

newgroup `app-c` の9testを順に実行、旧app/native7/D2/E/pure bodyを起動しない。fixtureは同existingappを再用し、**real NodeRegenerationInput / NodeRegenerationMemory / NodeLlmRuntimeOwnership / normal.source OwnedRead / 正式libSQL UoW/repos**を保持。data-only fakePreparer/classifier/pagesは元appの有効typed結果のみ。nativeOwner/opaque lease/proofは元実class生成、cast/JSON再構成/私WeakMap/brand/出生/生event偽造0。fake港のnative呼出は0であり、実codec closure根拠は既A/B/Eから借用する。

| ID/直接範囲 | 正規手順と観測 | 終端/期待 |
| --- | --- | --- |
| C01-V2 / C01-V3 / C01-V4（3case） | 各正常受付した同jobで1) bound admissionの**完了UoW no-claim**→activeInputs0/同consumer予約可能/read0/dispatch0。2) 別の同job opaque admissionでUoWのno-claim帰結後DatabaseError応答喪失→stage.claimnullだがactiveInputs1/同consumerbusy。次resumeでcompleted no-claim falseを受けてもheldを維持。3) normal cancelLlmRegeneration→exactterminal fence/quota released/旧receipt同値→同stage.resume確定後だけadmission0。正常DB rowやreadだけから返却しない | cancelled3/released3/dispatch0/read0。V4だけ通常preview ready/normalrequest confirmで合法manifestを取得。初回false及び応答喪失は元claimExact/UoW港に限る一回fault injection、実OCC競合/driver故障を経験したclaim0。Row/guard/DDL緩和0 |
| C02-cancel / C02-role / C02-deadline（3case、V4） | normalpreview→confirm→normalclaim g1のclosed0確定まで進む。元profiles.inspectのworkをgateして各頁の最初のfresh reader開始前に(取消API / workspace editor→viewer / deterministicclockを当該deadlineへ)変更、その後元profile結果を返す。stage.redraw/normal.source.read/派生page港の呼出増分0、dispatch0/生成0を実counter確認。g1leaseは元finishで消費済、次g+1の原本readを開始しない | cancel/roleはcancelled2、deadlineはfailed LLM_TIMEOUT1。全released3/oldbody同値/activeInputs0/pins0/executioninactive。role復元後の通常sweepでも旧job再開0。role低下時note.version不変・roleviewer・正規cancelGeneration変化は別assert |
| C03-partial（1case、V4） | normalpreview/confirm→page0 realstage redraw/finishclosed0→normalgenerator成功response保存、page1もfreshgでinputclosed0を確定してから同fakeGenerator港のclosed=true/possible LLM_UNAVAILABLEを返す。実dispatch intent二つ・一つresponseと第二possible状態、正常workerfailure終端。本文のcommitは全response後なので旧本文/版を維持 | failed1/consumed1（2発注でもquota1）/released0、dispatchの送信可能性をscrub後にも返却許可へ変えない。input/pin/execution全閉鎖。外部実送信/transport closeの新証拠ではなくport delivery契約の正式保存対 |
| C04-prepare-unsent（1case、V2） | 原本normal OwnedReadが閉じたgenuine leaseでfake preparation港だけclosed=true/not-sent LLM_SOURCE_INVALIDを返す。元failedWork→同stage.finish/proof/DBclosed0経由、intents/generator0。終了proofをtestが組立てず元verify-consumeを通す | failed1/released1/consumed0/旧本文、activeInputs0/pins0/executioninactive。実native fault/物理GCを主張0 |
| C05-intent-unsent（1case、V3） | 正常prepare→元inputfinish closed0→DBintentconsume1後、fakeGenerator港のclosed=true/not-sent LLM_UNAVAILABLE。元dispatch.fail(not-sent)とterminal ownerclosed/inputclosed0でのみreleaseUnsentが消費分を戻す | failed1/released1/最終consumed0/oldbody。C03 possibleは返却不可、こちらnot-sentだけ返却可能という反対対。delivery enumを無根拠な実外部未送信証明へ写さない |

C01のfaultwrapperはsourceidentity/this/元argsを変更せず、元UoWの正常no-claim帰結後だけsystem DatabaseErrorを一度返す。保存operation row/SQLを直接作らず、同memoryの本物admissionを一つheldにする。初回returned falseと後続unknown falseが同じpublicboolでも異なるprivate状態であることが対象。normalcancel fence後の自己Tx確定のみ返却し、differentintent/receipt/version一般を許可しない。元typedfixturepayloadはknown数byte、ID/receiptは通常API取得、出力recordは固定bool/count/stateだけ。

C02のprofilegateは元publicportが発注前に呼ばれる地点に限る。取消なら実signalabortedで先にloopを拒否することと、current/permission/timeガードの拒否を同一branchとして断定しない。deadlineはclock portのみ、setTimeout延長/fakeTimer/ループ回数増0。V4 nextbegin=0は正常stageのreader起動counter/保存receiptのg同値/メモリ0を別assert、g値そのものをログ出力しない。g1 prepareを強制したり無効phase/manifestを保存して通さない。

## exact変更案（採用前編集0）

1. ownsource既formal `packages/core/src/adapters/libsql/__tests__/llmLocalFormats.integration.test.ts` **1pathのみ**: `app-c` conditionaldescribe9cases、normalfixture比例API（mutableclock port、normalworkspace/account/editor源のtypedseed、元prep/profile/generator差替え用getter、note/currentのnormalDTO）。旧PA9 guardedbodyとNative7/D2/E sourceは不変更。fixture拡張はnewgroupのみ、既API/default behaviorを保つ。real workspaceをcreateWorkspace＋正式membership repo/APIでowner補助account2/editor既account1にし、workspace note ownerは作成時から正常typedownerへ。旧owner変更save仮定は禁止。changeWorkspaceMemberの実role/取消をそのまま観測する。
2. public `.goal-implement/helpers/p5c-s4-test-runner.py`: groupapp-c/file/ownerframe/normal9case/期待counts/自己appDB32及び新root binding/SOURCE唯一entry・newC・CONFIGhash従属。ObservedFork stock閉鎖はF-local同conditionを正常gateでも要求。旧Native7/D2/E receiptfunctionsを変えず、app-cにだけDB/PID/case/stop/audit閉鎖を結ぶ。
3. public `.goal-implement/helpers/p5c-s4-test-config.mts`: app-c許可group/既app exactfile/timeoutcase40/officialReporter正常9passedを固定。tool-only12skip要求はapp-cへ流用しない。nonbuiltin initializerと元ObservedFork本文・args/IPCは無変更、reporterのF個別閉鎖receiptを再用。sourceCase新9のReporter fullname/Moduleを起動前に固定する。

newhelper/Bootstrap/productports/domain/DDL/configexport/製品変更0。共有契約の変更は提案しない。実装候補後はsource1pathcommit、own全typecheck→lint:fix→format、tools officialtype/PythonAST、1459pair/shape/他1458同値及び逆差分を固定し独立preflightへ。fixtureAPIやguard合法shapeを満たせない場合はRootへ差を提案し、constructorcast/illegalSQL/trigger回避で通さない。

## 予算・終了・監査

futurememory root案 `/Users/hikaru/.local/share/hollow-validation/p5c-s4-c-9f53a80b`（名前案のみ、probe/不存在検査/生成0）。accounts2/WS1、原本slot4（personal docx/image/PDF＋workspace PDF）を順次正常requestで使い、同noteで新commandを受ける各前提/旧terminalを独立に再確認。job9/preview5/quota9（primaryactoraccount1、workspaceownerは補助2）で月30以内。slotを9へ数合わせしない。既original4個3byte程度、fake page2/各1byte、原本全体8MiB以内、Worker/businesschild0同時0、工具Python1/NodeCLI1/stockFork1、clientmax1（auditはbusiness全close後だけ）/論理DBmax4合計80MiB。

root192MiB、appDB32/native0/opaque8/audit8、cache16/TMP8/records8/entry8192、原本8の同上限。case40/group180（9×40を群延長理由にしない）、body430/sharedclosure50/outer480/200ms、TMP-only live128inner+128outer/quiescentstrict、外部/network/install/browser/keys0。各case前提waitは既app timeout5sのbounded状態待機を保持しsleep延長/強制repeatを増やさない。failedunknownならf.fail→後続case/auditcopy0/rootheld、自動retry0。

正常fixtureは元execution.stop→stage.stop→本物memoryactive0/pending0/原本pin0→既FK/integrityを待ち、originalfinallyclient.closeを必須にする。C-ownedclientにも既nativeと**同一一回main.wal_checkpoint(TRUNCATE)/strictbusy-log-checkpointed000**を追加する案をRootへ明示採用依頼（新任意SQL/非正常checkpoint0、原finallyclose保持）。statementは業務normal終端内、clientClosed/000をphysicalcloseへ代用しない。全knownPGabsent/actualNodePython0/2EOF-FD/stockfork正常receipt/force0→quiescentstrict→both app.db-wal/journal absent-or-zero→boundedwxopaque/wxaudit各8MiB/10秒/64KiB/fsync→readonlyquery_only/FK/integrityと実audit.close→outerfinalstrict/capを要求。

candidateから固定するreadonlycounts案: **9operations/terminal9/live0/cancelled5/failed4/succeeded0、preview5/consumed5/live0、quota reserved0/consumed1/released8、activepins0**。response/unknown/not-sent派生dispatch状態は各caseの正常reposで確認し、copySQLから新期待state/proofを作らない。再使用noteのoldbody/version、actual read閉鎖/lease0/個別quotaはcaseで確認、DBcountsと寿命能力を別根拠へ。監査のnote/account/workspace/原本件数はcandidatefixture採用時に正式schemaとseedから固定し、取得値を成功expectedへ写さない。

F-local forkreceipt（actualsamehandle/stockSIGTERM/PID ESRCH/stdio0close/reader1,2EOF-close/IPCdisconnect-channelrelease/IPC EOF-FDnull）は受入済みなのでF-only pure再演不要。このmeaningful Cfamilyの正常9pass＋同Observer終端＋NodePython0/PGabsent/2EOF-FD/finalstrict/DBcopyauditでwholeF残正常実行境界を併せて埋める案。e547/bf301の正常capacity/copyaudit欠測を遡及補完せず、成功newrootも報告固定後は非操作とする。

## 判断を依頼する点

Rootに9case/直接matrix縮約/normalport-fault注入と源workspace初期設定、source既fixture1＋tools2、C-ownedclient既strictcheckpoint000一回の最小scopeを採用いただいてから実装する。quota9/preview5の予算はcaseより導出し、件数そのものを受入条件へ増やさない。実装中のAPI/共有port/path追加は事前通知。formal sourceguard＋candidate independentPASS＋Root別oneactualまでは全DB/runtime/root0。新Cfamilyが失敗した場合も未観測原因の無根拠同一再試行0。

2026-10-06T05:10:32.057534+00:00 提案固定後PUBLIC reader/writer/runtimeを停止する。Managercriteria/design/plan/goal/spec操作0、他writer tree/UI/P5d/B/private/root非操作。
