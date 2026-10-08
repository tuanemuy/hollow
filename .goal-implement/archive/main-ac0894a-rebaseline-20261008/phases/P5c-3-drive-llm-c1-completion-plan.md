# C1-P1 Drive LLM completion の typed SOURCE 契約案

Status: 詳細設計案 / SOURCE実装0 / runtime0。RootはC1方向とC0-F2 SOURCE局所PASSを採用し、C1 source scopeへの既Node LLM runner追加を設計採用した。C1 implementation-readyやnative成功、S5-F完了は主張しない。

基点 controlled SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-p5c-drive-machine-721bc7ad-20261006` HEAD `176ea15b572c610e97f99a021ea94e2ba60637c7`。C1 plan24158/fb729a8a5ffec19b85fb9661112b559d8c3a998ce0bef56512e929b7e5a7d94b と独立review9875/5a3190204aea7ab0021237f0f8cf495753952ebd8789dea6048c825c8253ad8cを基点とする。今回C1 named20の全文stable SHA/Gitblobを同HEADで再確認し、追加はNode LLM runner一つだけ。main/P5d/全private/generated rootsは非操作。

## 維持する資格と保存表現

HTML/Markdownは row.sourceOwnershipGeneration=null / pdfProof=null のまま。Drive source generationは保存済SourceBinding.ownershipGenerationを同Txで解決し、exact bindingId/consumer llm-conversion jobId/executor/note/original/fingerprint/cancelGeneration/sha/bytesと現在transfer generationを検査する。現nullをcurrent世代で上書きして旧bindingとの差を隠さない。PDF世代/codec/schema/DDLは変更0。

サービスは既legacy/local branchesに加え、例えば `inputMode: "leased-local-drive-v1"` のDrive-capable branchを設ける。ownershipは原LlmLocalRuntimeOwnership、inputStageは原local/PDF方法も保持するLlmDriveInputStage。NodeLlmOptionsのsource pairは `{provider, drive}` 一体のoptional unionで、regenerationServicesのrequired original void ACK検証を通す。半構成/ACK欠如ならunavailable、optionalcall成功化0。新branchのlocal/PDF処理は既leased-local-v2と同じ経路・タイミングを使う。literal名は候補時に固定し、既switchを型guardで正確に追従する。

shared input/execution/ownership/storage/preparerは同original参照。NodeDriveをsingle生成し、LLM stage/recoverLlm前にpairを渡す。machineはOpenRouter不要、LLMはexecutor自身のOpenRouter資格を従来通り必要とする。recorder Drive資格をexecutor OR資格へ代用しない。入力2枠・既quota/possible-delivery/localdigest/PDF意味を保持する。

## 追加portとprivate状態の境界

LlmDriveInputStageはLlmLocalInputStageを拡張する案とする。新機能はDriveだけで必須にし、非Drive既呼出に影響させない。

| 必須method案 | 契約 |
| --- | --- |
| `finalizeDrive(value, signal): Promise<void>` | same active original leaseのfinalCheck→genuine Drive actualclose/callerEnded/savedread/originalvoidACK→原 input.finish proofの保存/read/consumeを確定する。保存応答不明だけ同Promiseをpendingにできる |
| `commitDrive(value, expected, commit): Promise<void>` | finalized original lease/proofをprivate状態で確定できるvalueだけ受ける。expectedは型付き終端期待、commitはapplicationが作った原閉鎖DB Tx callback。直接rawproof/booleanをcallerから受けない |
| `recoverDriveCompletions(): Promise<void>` | 同runtime private pendingだけ、finish保存又は元terminalTxの回復を進める。新begin/claim/read/generate/prepare/projection/ACKを起動しない |
| 既 `stop(): Promise<void>` | callbackが自然終了し回復sweepがquiescentになった後にprivatepending/lease/admission/retainedなしを検査。未知を空と見なさない |

method名/typedcallbackの細部は候補で固定する。expectedは少なくとも succeeded(noteVersion)、failed(code)、cancelledを区別する。既正規delivery-unknown終端がclosed/callerEndedを伴う場合は、既completeLlmが保持する型をそのまま別枝にする。native/read/input未知をそのdelivery-unknownへ移し替えない。

commit callbackは元workerの閉鎖DB Txだけを捕捉し、body/projection/refs/noticeの準備値は一度作ったimmutable値を保持する。retry時にgenerate/sanitize/project/extractを再実行せず、異値bodyを作らない。callback内の認可/current/lease/deadlineを毎回元方法で検査する。driver guard・単なるboolean・outcome cloneを原proofの代替にしない。application/domainにmutable mapやadapter privatebrandを持ち込まない。

NodeRegenerationInputの同runtime private stateは以下のdiscriminated unionで表す方向とする。

- active-prepared: originallease、原source snapshot、prepared。finish proofはまだない。
- input-save-pending: genuine original input.finish proof、samelease、immutable source/runtime/token/g/consumer、原awaiter deferred。DBfinish未確定。bodycommit callbackはまだ発行しない。
- input-closed: sameproofのexact closed receipt/memory0保存確認と原consume済み。finalize awaitが戻り、原callbackは仍originalwithOwner内にある。
- terminal-save-pending: 上記sameproof、型付きexpected、原DBcommit callback、元awaiter deferred、保持済みimmutable準備値のclosure。入力byte/nativehandleを別copyせず、既owner内の必要referenceだけ保持する。
- confirmed: terminalexactread、expectedoutcome/resultVersion、sameproof/receipt/source/current identityを確認済み。元awaiterだけを自然に返し、原finallyに委ねる。
- held: native/read/ACK/保存確定不明・別snapshot/別proof/旧runtime等。成功deferred解放能力は持たない。

このmapはnative proof factoryではない。proofは元 input.finish の実参照のみで、verify/consumedは既正規方法。private状態は同operationに一つ、処理枠2内、二重finalize/commitはsamelease/sameproof/sameexpected/同callbackに限り同pending Promiseを返す案とする。異値・別callbackは拒否/held。履歴/工具/外部materialへのproof/IDs/nativehandle保存0。private元参照と最小typedmetadataの保持は必要であり、JSONへ出して復元しない。

## 入力保存: rollback と commit応答不明

finalCheckが正常に閉鎖/保存/read/voidACKを終えた後だけ、既 input.finish を一度呼んでoriginalproofをcacheする。そこで既finishInputを実行する。

- 正常return後も原保存read/receipt/memory0とconsume契約を確認してinput-closedへ。
- DatabaseErrorの直後、read-only確定でsame原proofId/g/runtime/token/consumer/closedreceipt/memory0が保存済みと確認できれば、既consumeを一度行い正常finalize return。
- rollback又は未確定readなら元proofとcallbackを保持してinput-save-pending。recoverは同proofによるfinishInputだけを再用し、毎回その後のread-only確定と原consumeを要求する。errorをclosed=trueに置き換えない。
- CAS false、異receipt、owner unknown、別source、proof未検証、read不能はpending/heldであり、row absence/newproof/reclaimedtokenから解放しない。

取消/期限/失権/source current失効はbody採用0だが、genuine inputの閉鎖保存まで未知に戻す理由にはしない。閉鎖predicateは元finishInputが許可するexact入力receipt/owner/CASを使い、live/currentLlmSourceのpending限定判定と混同しない。閉鎖後、originalcallback内で既通常failure/cancel handlerが本文/versionを保持して正規終端へ進む。

finalCheckのnative/read/Drive ACKが未知ならgenuinefinish能力を作らずheld。finalCheckを後から「新requestで成功したので旧requestもclosed」としない。readInput既unknown記録と原LlmObjectOwnershipUnprovenError保持のまま、成功待機経路へ入れない。

## 本文Tx: exact保存readからだけ自然finally

Drive original storage.withOwner callbackはprepareからdispatch/result/restore/sanitize/projection/finalCheck/finalize/terminalcommitとそのfailure handlerまでを包含する。prepareだけのcallbackを返してleaseを持ち越す形は不可。outer original execution callbackもその同Promiseをawaitする。

commitDriveの正常原Txは既currentLlmSourceのDrive-aware closed branchでnote/head/version/executor/edit/account/workspace、original.activeJob/hash/bytes/format、genericjob/token/cancel/deadline、binding/record/recorder/subject/Drive epoch/g、executor OR epochを再検査する。HTTP/nativeをTx中に行わない。body/revision/refs/browse/notices/original/LLM+generic終端は同Txの原処理を再用する。

DatabaseError時は次を分ける。

1. **commit応答不明・保存済み**: read-only exact terminal predicateがexpected終端/resultVersion・sameproof consumed・closedreceipt/memory0・原job/runtime/token/source/binding・同Txの結果を確認した場合だけ、元deferredをnormal returnへ進める。単なるterminal/null/nonpendingからの確認0。
2. **rollback・元pendingが確定**: exactsame lease/proof/source/jobの入力閉鎖は確認済みで、bodyが未採用の元状態と確認できた場合だけ、保持した元DBcallbackを再実行する。そのcallbackのcurrent guardを緩めない。成功後は再度read-only exact terminal確認を通す。rollbackをcommit成功にしない。
3. **再Tx current拒否**: 新bodyは採用しない。元guardのsameerrorでoriginalcallback内failure handlerへ戻し、原閉鎖証明を使う正規failed/cancelled終端Txに切り替える。これはcompletion成功解放ではない。withOwner外へ先に返さず、新expectedと原failureTxの確定を待つ。
4. **保存状態不明・異outcome/異proof**: 元callback/deferredを保持してpending又はheld。expectedをobservedoutcomeに合わせて書き換えない。

既終端を確定するread predicateはactive/pending限定currentLlmSourceをそのまま呼ばない。active commit current guardとterminal exact-readは別predicateである。Txが既成功した後の通常編集でcurrent noteVersionが進んでも、同resultVersionの当該保存済み結果の同値確認を「新本文採用」にはしない。逆に保存済み別job/別outcomeから成功を推測しない。

原catchのpossible-delivery/quota意味を保つ。Drive検査エラーが既not-sent型でも、元dispatch intent/response状態を取り消してrefundやresendに戻さない。月次quota不足の既failedterminal保存は正常receiptであり、repo例外rollbackとは別。finish/body/save response-lossの同proofを新proofに替えない。

## 同runtime と再起動前任は別能力

同runtimeのpending mapにはoriginallease/proof/awaiterと原Tx callbackが存在する。そのため同snapshot保存確認後に同callbackを継続できる。mapをJSON保存しない。

再起動時にはそのcallback・preparedbody・同runtimeproof参照がない。既ownership acquire-confirmed record/predecessor input proofの正規capabilityからのrecoveryだけを使い、同runtime pendingへ変換しない。legacy/unknownchild/旧Drive ACK/read閉鎖未確定はheld。旧preparedbodyやraw proofを復元して新callbackへ渡さない。既recoverLlmが正規dispatch保存状態から可能とする失敗/取消/delivery-unknown又は再開範囲に留め、Drive source currentを再検査する。C1新receipt表、DDL、新nativeproof発行は0。

## 停止中のDrive-only回復

追加 exact `packages/core/src/adapters/node/llm/runner.ts` は必須。現sourceはstopped→clearInterval→awaitactive→execution.stopであり、新pending callbackを入れるとC0旧循環が再発する。

Drive-capable branchだけ、C0-F2と同型の既timer1/2000msを残す。stopped=trueでadmissionを同期に閉じ、既issued activeを待ち、原execution.stopを一度取得、即recover-only wakeを要求して原Promiseをawaitする。await中のtimerはrecoverDriveCompletionsのみ。新LLM claim/resume-begin、PDFpreview claim/分類、prune、新Drive read/dispatch/prepareは起動しない。latependingもintervalで回復する。finallyでfinished=true→既timerclear→active回復await、原stopreject/最初のrecoveryerrorをcache保持し、正常時だけfinalrecover/stage.stopのpendingなしを検査する。

正常稼働wakeはDrive recoveryを通常claim/preview/prune前に置き、既serializedactiveを再用する。active operationのpending回復は可能でなければならない。既local/PDF枝のscheduler/preview/prune・既stop rejection意味は維持し、Drive能力なしの枝を新pending状態へ移さない。Shared originalexecution.stopの拒否をtimeout成功に変えない。serverの同tick machine/LLM callerdrain+Drive queueHTTPquiesce→成功後だけshared finalstopを保持する。

## exact source scope と未確定根拠

C1の11pathsは維持: new application/llm/driveRequest.ts、既llm request/current/inputStage/ports/services/worker、regeneration/current、Node regeneration/input、Node llm/config、server.node.ts。Root採用追加はNode llm/runner.ts一つで **12source**。DDL/domain codec/source proof factory/SourceExecution/ACK/native execution/storage portは変更案0。既3tests案を維持し、必要completion negative/response-loss対はこの採用test範囲のcandidate時に導出する。論理/codec対をnative positiveにしない。

編集path追加なしだが、terminal exact predicateの正式field/CAS/consume順を最終確定するには、次のread-only exact依存確認が必要である。今回20+runner外なので未読取/採用待ち。

- `packages/core/src/application/llm/completion.ts`: 原completeLlmの終端/owner/generic/original/quota write-setと合法outcome。
- `packages/core/src/application/regeneration/memory.ts`: 原finishInputのreceipt2CAS/read/consume順と取消・期限時の閉鎖許可境界。

この必要read確認なしに「既terminalがあるのでcommitDrive正常」と実装してはならない。callback再Txとsource-current拒否の分岐型は候補のstrict typecheckで固定する。privatepending件数/保持material/timeの実予算は新sourceからderiveして別採用し、今回はroot/case/工具作成を許可しない。

正負期待は、(a)正常Drivefinalinspect/ACK/finish/同Txterminal、(b)finish rollback同proof再保存、(c)finish commit応答不明readconsume、(d)terminal rollback同immutablecallback、(e)terminal commit応答不明exactread、(f)current失効で本文0かつ正規failed/cancelled、(g)native/read/ACK未知held、(h)stop直前/待機中latependingと原拒否保持、(i)旧runtimeproofを同runtimeawaiterに転用0、(j)local/PDF/機械不変更、である。これらは設計期待で未実行。準備testの人工callback/deferredは契約対だけでgenuineprivateproofを発行しない。

## PUBLIC/SOURCE根拠・停止

C1named20 total247559 Bは原plan exacttableの各path/bytes/SHA256/Gitblobと直接再照合して全同値。canonical/regular600/selfUID/nlink1/NOFOLLOW FD+path dev/inode/mode/UID/nlink/size/mtime/ctime前後fullstable。全1474 walk/Git clean/currentmain guardは0。HEAD176eaをexactGit readで確認し、C0-F2のprivateproofクラス・不変更20への影響は先行レビュー借用。

追加 direct Node llm/runner.tsは1640 B / SHA256 `f9a7a1e9308a80230ea641b25705442dea3b8287b4095b5cdfb897eaa6b30770` / Gitblob `0670221961dc57966f36faece97c88a18391e33a`。現stopのtimer先停止とinputStage.stop leased-text限定を直接確認した。新Drive専用branchは原local/PDF意味を変えずrequired stage.stopを持つ必要がある。

source/product/helper/Manager編集0、native/runtime/default/preflight/import/test/DB/key/browser/worktree/rootprobe/create0。全validation/generatedSOURCE/build/cache/TMP/results/log/proof旧privateは恒久NOOPS。報告へraw proof/IDs/nativehandle/SQL/secretを保存しない。この新designだけwx600で固定しALL reader STOP。C1実装とONE実行はRoot別採用、全goal未完。
