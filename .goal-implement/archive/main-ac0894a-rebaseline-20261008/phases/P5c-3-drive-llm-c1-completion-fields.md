# C1-P1 completion fields / exact read-confirm design

2026-10-06T12:33:34+00:00。PUBLIC SOURCE-only 設計補足。controlled SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-p5c-drive-machine-721bc7ad-20261006` HEAD `176ea15b572c610e97f99a021ea94e2ba60637c7`。SOURCE/helper/Manager変更0、default/preflight/import/test/runtime/DB/native/rootprobe/create0。C1実装やnative closureの成功を主張しない。CA67 source/helpers/全actual rootsを操作しない。

Root採用 completion-plan15975B/SHA0cb474551a483f0ff328fd419e1e89416bd05976861af76bf08072841ae4f094、元C1plan24158B/SHAfb729a8a5ffec19b85fb9661112b559d8c3a998ce0bef56512e929b7e5a7d94b、review9875B/SHA5a3190204aea7ab0021237f0f8cf495753952ebd8789dea6048c825c8253ad8c を全文stable確認。編集案は既12source/3test内のみ。以下の追加READは型確認であり編集scopeの追加ではない。

## 保存fieldの結論

- LLM successは既 `LlmOutcome={kind:"succeeded",noteVersion}`。llmRepository:78–80 が既SQL `result_version` を `outcome.noteVersion` にdecode、:337–338でencodeする。LLM rowには `resultVersion` という公開domain propertyを追加しない。
- generic `ConversionJob` は既id/batchId/originalId/accountId/noteId/noteVersion/useAi/createdAt/updatedAt/attempt/retryOf/state/failure/leaseToken/leaseUntil。version/resultVersion/owner/runtime/inputProofというfieldはない。元source noteVersionを成功後の本文版に上書きしない。
- SourceInputReceiptは既consumer(kind,id)/runtimeId/token/generation/state。closed枝だけproofId。原original lease/proofの参照同一性はadapter内で保持し、これらdata-only fieldsの一致だけで能力を作らない。
- Drive HTML/Markdown rowはselection=fixed/preparationVersion1/promptVersion1/pdfProof=null/sourceOwnershipGeneration=nullを維持。Drive世代は既access.bindingId→SourceBindingのimmutable snapshotとして確認し、新列/PDF偽装0。

## 原write-setとCAS

`application/llm/completion.ts:14–25` の replaceLlmは `previous.version+1` を作り、expectedVersion=previous.versionの原replace falseをLLM_OWNERSHIP_UNKNOWN/possible/closedfalseとしてthrowする。completeLlm:27以降はpending outcomeを拒否し、phase terminal、ownerがidle以外なら同runtime/tokenでclosed、responseBudget0、updatedAt=原nowを保存。ownedではidle拒否。normal finishInputとowner終端を同じ操作と見なさない。

`llmRepository.ts:378–449` はexisting version CAS、immutable encoded fieldsを保持し、source/access/receipt/memory/phase/outcome/failure/resultVersion/owner/runtime/token/cancelGeneration/responseBudget/version/updatedAtだけを既合法規則内で更新する。:450–473は同Tx generic jobを success→succeeded/null、cancel→cancelled/null、failed又はdeliveryunknown→failed/code、leaseToken/leaseUntil=null、updatedAt=同nowへ更新する。genericにCAS版を捏造しない。

completeLlmの同Tx sibling writesは quota.releaseUnsent(jobId,now)、dispatch.scrub(jobId)。非successで同original.activeJobId==jobIdならoperation regenerateはsourceState/sourceCoverageへ復元する（source identityやactiveJobIdは書換えない）。operation importだけ条件付きdisplay失敗completionがあるがC1 Driveはregenerateで、その枝を新規実行しない。success worker:519–592は元current guard→同commitRegeneratedBody→original ready/coverageとnotices→completeLlm succeeded(note.version)を一Txで行う。body/revision/refs/browse/noticeの新並列writeやrecoveryでの再projectionは0。

## typed expected outcome と原Tx内capture

設計上のDrive completion outcomeは既LlmOutcomeから以下だけを選ぶ。native/read/ACK/input ownership unknownはこの型へ入場しない。

```ts
type DriveLlmCompletionOutcome =
  | Extract<LlmOutcome, { kind: "succeeded" | "cancelled" }>
  | Readonly<{
      kind: "failed";
      code: Exclude<LlmFailure, "LLM_OWNERSHIP_UNKNOWN">;
    }>
  | Readonly<{ kind: "unknown"; code: "LLM_DELIVERY_UNKNOWN" }>;
```

success.noteVersionは一度生成したimmutable note.versionそのもの。failed.codeとcancelledは元failure.closed=true/current.cancelGenerationの正規分岐で決める。deliveryunknownは元possible deliveryの既意味で、native/read/Drive ACK unknownとは別である。delivery-unknownにもgenuine input closureとconsume成功が必要。expectedをreadbackのoutcomeへ合わせ直さない。

`commitDrive(value,outcome,commit)` のcommit callbackは原UoWだけであり、stageは元withOwner/execution callback内でそれをawaitする。原callbackでcurrent検査後、completeLlm直前に一度、次のdata-only attemptをstageのprivate recorderへ渡す案を固定する。この型案はまだSOURCE実装/新API採用ではなく独立設計レビュー対象。

- before: 原Txがcurrent guardで取得したsame operationの `LlmFixedConversion` snapshot。phase非terminal/outcome pending、same closed inputReceipt/memory0、same runtime/token/consumer/g/source/access/command/requestDigest/recipeであることをstage内で確認。
- updatedAtMs: completeLlmへ実際渡す原clock DateのgetTime()。stageはnormalterminalのupdatedAtと比較する。
- genericBefore: 同jobの正式 `ConversionJob` identity snapshot。終端保存後のresultVersionをここへ追加しない。
- quotaBefore: 正式 `LlmQuotaReservation` metadata（job/account/month/state/firstIntentAt/createdAt/updatedAt）。正常入場はreserved又はconsumedのみ、null/releasedを能力にしない。
- dispatchBefore: 原dispatch listのmetadata投影（id/jobId/ordinal/runtimeId/ownerToken/input/state/intentAt）。response.content/token値は再copy/外出力しない。
- originalBefore: 原 `Original` identityとstate/coverage/activeJobId。body/projection/refs/noticesのimmutable準備値は元callback closureだけに一度保持する。

callback型は `(recordAttempt: (attempt: DriveLlmCompletionAttempt) => void) => Promise<void>` とし、recordAttempt自体はBoolean/proof/正常closed能力を返さない。同attempt内1回のみ、stageはsamevalue/outcome/lease/proofと束縛する。正規record後でもDB保存/read確認が不明ならpending/heldである。no-op fulfill/callbackから任意terminal cloneを渡すだけ/別job/outcome/別closure/repeatは正常化しない。commit response-lossではPromise結果が返らなくても、commit前に捕捉済みのexact version/now/outcomeを保てる。成功／rollbackの期待をobserved terminalから逆算しない。

terminal row期待はbeforeのimmutable fieldsを保持し、version=before.version+1、phase terminal、owner={same runtimeId/token,state:closed}、outcome=元expected、responseBudget0、updatedAt=原clock、same closed inputReceipt/sourceMemory0とする。これはcompleteLlm既write-setのdata projectionであり、新domain receipt/新native proofではない。cancelGeneration等はそのattempt.beforeの値を保持する。入力保存とterminal保存のCASを別々に記録する。

## input-save-pending: exact closed / consumed

`application/regeneration/memory.ts:60–90` はcurrentInputでなくinputConsumerを使う。現在のlive/期限/取消/note権限/Drive linked判定をfinish predicateへ追加していない。必要条件はrow存在、receipt存在、original input.verify(proof,row.receipt)、owner.state!=unknown、Drive bindingの全attemptReleased。active入力ではmemory=52428800と原row.write(proof.receipt,0) CAS成功が必要。既closed入力ではmemory0かつsameproofIdを要求し新CASしない。UoW正常return後だけ原consume(proof)。

正常同runtime finishはreceipt+memoryを原expected-version CAS一つで保存し、ownerはactiveのままが合法。terminal ownerclosedは後続completeLlm CASであり、finishだけからowner closedと推測しない。前任owner/input2CAS回復は別契約を維持する。

`NodeRegenerationInput.finish:733–765` はWeakMapに同original proofをcache。DatabaseErrorだけsaved inputConsumerをreadし、owner非unknown/memory0/receipt/原verify/sameInputReceiptを満たすと元consumeへ進む。新C1入力pendingもこの原能力を使う。
`NodeRegenerationMemory:426–451` のverifyは未consume Entryのsame proof＋busy/read/bytes/unknownなしを検査する。consume成功時だけEntryを削除しexisting WeakMapへproof→sameleaseを記録、consumed(proof,lease)で原参照を確認できる。consume後はverifyがfalseになるため「consume済でもverify必須」で回復を阻害しない。弱いexternal consumed flagを作らない。

finalizeの入口はsameactivelease、原final-checkのactual close/callerEnded/saved read/originalvoidACK全成功。その後だけ原input.finish一回のgenuine proofを使う。same proofを保持してfinishInput→saved exact closed receipt/read→原consume成功を待つ。recoverは先に既consumed(proof,lease)を調べ、trueならexact保存closed確認だけを行い二重consumeをしない。falseならsame未consume proofのoriginal verify→finishInput/read/consumeだけを再用する。closed receiptをJSONから復元してproofにしない。

保存応答不明時のsavedreadはsame consumer/runtime/token/g/proofIdと元source/access/command digest/recipe/owner snapshotに一致し、Drive attemptReleasedを原finishInputと同等に確認する。ownerunknown/異receipt/新g/DBabsence/read failure/native/read/ACKunknownはheld。取消/期限/失権は本文不採用の根拠であって同proofの入力closed保存を拒否する根拠にしない。marker/receiptだけからactual native closureを作らない。

## terminal read-confirm: 現在資格と別predicate

same input-closed private entryに保持したsameoriginallease/proofについて既consumed(proof,lease)===trueを要求する。元SourceInputLease/proofをprivate保持するだけで、Entry/bytes/pin/nativehandleを復活させない。

原read-only UoWで `u.llmConversions.find(jobId)` と `u.jobs.find(jobId)` を使用し、以下すべてを一致確認する。

1. LLM rowはsamejob/account/note/command/digest/operation/source/access/recipe/credentialEpoch/originalRevisionNo/source initial noteVersion。exact attempt terminal version=before.version+1/updatedAt=原now、terminal/closed same runtime/token、responseBudget0、sourceMemory0、sameclosed receipt consumer/runtime/token/g/proofId。
2. outcomeは元expectedとexact一致。successはexisting outcome.noteVersionを比較（SQL result_versionの正式decode）；failedとdeliveryunknownはcode exact、cancelledはcodeなし。pending/LLM_OWNERSHIP_UNKNOWN/異code/異resultVersionは拒否。
3. generic jobはsameid/originalId/accountId/noteId/batchId/attempt/retryOf/useAi/createdAt/元noteVersion、上記原outcome mappingのterminalstate/failure、leaseToken/leaseUntil=null、updatedAt=同now。generic resultVersion/owner/rowversionは存在しないので比較fieldを増やさない。
4. 原source snapshotはLLM immutable source/accessと保持済binding identityに束縛する。bindingのconsumer/job/executor/note/original/fingerprint/recordId/credentialOwner/Drive epoch/subject/ownershipGenerationを保持済immutable snapshotと比較する。terminal確認時にcurrentDriveSource/currentLlmSourceのactive資格（cancel0/live/linked現在epoch/現在noteVersion）を再度必須にしない。binding・receipt行のabsenceから正常を推測しない。
5. dispatch metadataは同集合/owner/token/runtime/input/ordinalを保持し、元response行だけscrubbed/response:nullへ、それ以外は原stateのまま。quotaはbeforeのaccount/month/identityを保持し、原before dispatchにprepared/not-sent以外が一つでもあれば状態/firstIntentAt保持；全部未送信ならreserved又はconsumed→released/updatedAt=同now。元releaseUnsent/scrubの同Tx write-setを確認し、quota bucketの他job進行を妨げるaggregate一致を要求しない。

元withOwner内のoriginalcallbackしかこのnormalterminalを作れず、body/revision/refs/browse/original/notices/LLM/genericを同Txで保存することが設計前提。そのoriginal callback binding＋exactLLM/generic terminal保存はcommit confirmationであり、現bodyを再adoptする要求ではない。保存後に通常編集/undoが進んだらlive note.versionをsuccess.noteVersionへ巻き戻さない。current noteやcurrent refs/browseを旧準備値と再比較して原finallyを永久に止めない。Original state/coverage/activeJobIdの同Tx変更は原callbackで行い、後続jobの正常進行を旧operationのlive guardで拒否しない。typed original identityをmutable current資格として使わない。existing revision/undoのwriteとactor/job結びは原commitRegeneratedBodyのまま、同expectedと異なるoldjob/resultから確認しない。

普通の同token terminalだけをsuccessとするworker:624–626の既分岐をC1 Drive確認には使わない。原local branch意味は維持し、Driveの保存済み確認は上記exact predicateへ分ける。callback外boolean/外proof/HTTP成功/Mapが空をconfirmationに使わない。

## rollback-only retry と否定時の帰結

- input-save response-loss: samegenuineproofで正規finishInputを再用し、保存済closed branchはidempotent。read不能/異receiptで新finishproofを作らない。
- terminal response-lossでexactterminalが確認された: 元deferredだけresolveし、原callbackのreturn→元withOwner/endWrite→原execution finallyを自然に進める。
- sameLLM rowがattempt.before（closedreceipt/memory0/pending/outcome/runtime/token/versionを含む）で、generic/dispatch/quotaが原prewrite状態と確認された: rollback-onlyとして同immutablecallbackを再実行可能。binding/source/currentの新資格をそのcallback内で毎回原方法により検査する。未確認readや別versionをrollbackと推測しない。
- rollback後のcurrent取消/期限/失権/source版/epoch拒否: 同errorを原withOwner内failure handlerへ戻し、本文0で原正規failed/cancelled又はdeliveryunknownを決める。異expectedへ勝手に再設定せず、先attemptが未commitの確定と元failure分岐だけから新failure attemptを作り、そのexactterminal保存を待つ。
- read-only mismatch/absence/別outcome/proof/read応答不明/native or ACK unknown: 同deferred/lease/proof/callback保持、held。callbackを再読込・再prepare・再generate・再project・再ACKしない。
- 驗証済pendingと即刻current eligibilityは別。rollback read後に変化しても原Tx guardが拒否する。read-only closed判定にdeadline>=nowを入れない。driverの正式retryはadapter内、completionでは元応答不明の同callback継続だけでOCC一般retryを増設しない。

## typed正負ケース（未実装/未実行）

| 条件 | 必要期待 |
| --- | --- |
| genuine finalcheck/voidACK→finish→closed/read/consume→terminal normal | samelease/proof/expected、original return/finally一回 |
| input CAS rollback / commit-response loss | 同proof保存再用、readconsume一回、別g/clone/absence拒否 |
| terminal rollback / commit-response loss | 同immutableTxだけ再用、原version+1/now/outcome一致後return、project/generate追加0 |
| 成功保存後にcurrent note.edit/undo/Drive資格変更 | 旧terminal exact保存を確認し新adoption0、current pending guardを呼ばない |
| rollback後にcancel/deadline/role/source/current変化 | 原currentTx拒否/本文0/原failure終端、possiblequota返却へ変更0 |
| samejobでも別outcome/result noteVersion/token/proofId/callback/attemptversion | held。observedへexpectedを書換え0 |
| native/read/ACK/input unknown、ownerunknown、未consume/旧proof | ordinary failed/successへ0、元unproven held |
| no-op Tx callback又はtyped captureのみ | row不足/非一致でnormalconfirmation0 |
| stop待機中latepending | 元Drive-only timer1 recovery-only、admit0、自然finally、原stop拒否を保持 |

既3test予定はnew application/llm/driveRequest.test.ts、既 application/llm/inputStage.test.ts、既 adapters/libsql/__tests__/driveRegeneration.integration.test.ts。finite native lifetime/actualDrive response-loss/normalstop根拠は別採用であり、このdata-only計画で生成しない。テストのfakecallback/論理guardはgenuineproof/nativeFDのpositiveを代行できない。

## 根拠と未確定の境界

直接READは下表20unique221691B。最初追加提案 `domain/import/repositories.ts` は正式import由来ではなく誤提案で、exact不存在/body0停止、未知fallback探索0。completionの正式HollowUnitOfWork import→正式jobsport→その../entityをRootが個別採用して確認した。Original portは正しい `domain/import/ports/importRepository.ts` をHollowUnitOfWork正式importから導出したが、本文read不要/未読取。

12SOURCE編集予定/3test数、sameproof/privatepending2以内/immutableoriginalcallback/noDDL/Drive-onlytimer1の方向は元Root採用。今回callback recorder型・exact equality実装・privatepending総保持bytes/必要case順・actual budgetは今後独立設計レビュー/候補typecheckで確定する。既方法名/fieldを架空列で埋めず、SOURCE追加変更は別exact通知。原commitRegeneratedBodyの本体は今回追加read0（既受入設計を借用）、revision/undo/outputatomicの新独立実測は未検証。新native能力、旧runtime復元、newframework/journal/表0。

| Direct SOURCE path | Bytes | SHA256 | Gitblob |
| --- | ---: | --- | --- |
| `packages/core/src/adapters/libsql/llmSchema.ts` | 19956 | `e29bce7183b4f86c232fcfc861875cb316a99959e6a7c89aeca0f3987b8ba5d3` | `9f9792aa93c12490b6b8789b4af37c9a08381343` |
| `packages/core/src/adapters/libsql/repositories/llmRepository.ts` | 39043 | `13335b88bc15effd4a19e22790e103e966a33f5c7849cb1f29eac5606fd75b62` | `839a60bbf395604abad78dcf03e90c1f31df56b7` |
| `packages/core/src/adapters/node/regeneration/input.ts` | 27320 | `4c17625f85f756446f1a722b94c50d17d7d334efa0494ca1419df900253e5210` | `57704db4166b917e9518ff0a7bd0a2f2775a719b` |
| `packages/core/src/adapters/node/regeneration/memory.ts` | 15434 | `2264632b4eb4703e2b445a21e66980545b8d74ef7b77e303909617edaf715bbd` | `ff942a1c81ab2512b45b310dd0e644af904260d0` |
| `packages/core/src/application/execution/hollowUnitOfWork.ts` | 7199 | `c22d1dcff055a6e015ba1731840951c4295c23e9eb615323b851f9e4990f3a94` | `0e35f36f2ec455012ec1459d041be34f5ec5472a` |
| `packages/core/src/application/llm/completion.ts` | 3105 | `47f05252131da3f64705885c7c71a57a2c83e2fdf65dfb8e5505c4f547574e08` | `0d9611438d32fe35180b68ba21445251248c3e4c` |
| `packages/core/src/application/llm/current.ts` | 4253 | `7f31a9c440bb07e1cddc00c0dc574144334fa7e50dfaa91c3a19d1332d0c550b` | `702d637a55bacd161702ec5b3c2fd273b8011b83` |
| `packages/core/src/application/llm/inputStage.ts` | 3675 | `58ed11dec749e0cf5616d1bcbb1bbfe141ee0797dbf3f06195d54da94ede75f2` | `9aefbe55232cabc9ed70d0c438b6900cb5c13623` |
| `packages/core/src/application/llm/ports.ts` | 10214 | `48dc60e09ff1001c9af41e04e94b9a51392bc69b1c28702d5acea598f656529e` | `143e893bf5853afbb4b4c6bc8d2e690d7bf29b05` |
| `packages/core/src/application/llm/request.ts` | 15334 | `32991083aa133c3c092b80e2bada555d2f12e7d97913950d3746a178ec0697ca` | `67e45a76ddd7e37f3639bf1eeeaafe263dcc5c0a` |
| `packages/core/src/application/llm/worker.ts` | 32277 | `0f2e0837dc29b2577deb556ebe1ff58b11437ef6ac46b754569a5f177eb2ddc6` | `8b54a79d19c84336fc4ba642064a2182600fe527` |
| `packages/core/src/application/regeneration/current.ts` | 11509 | `5f0b1f3acd48ca34467b31fd326b24eb715bd663c2988c97ad84f7f7cd49c271` | `facd27e12f920a947900d3b18fa346ab998bbccb` |
| `packages/core/src/application/regeneration/memory.ts` | 3281 | `914ef68f217941417472d4d21730286f132a44cda31b7558bcab2ab56ecbe23e` | `602758743d6810b42fb5e30515c5533595f08a6c` |
| `packages/core/src/application/regeneration/services.ts` | 9713 | `657b34347525567295cd4ab5e85a136881a646aace734ea011882fbd9294d561` | `85bf4fe1d2ba2ef6437adbf992a8aa170ecc05a4` |
| `packages/core/src/domain/import/entity.ts` | 3921 | `727534315f86b400a6f927d40aa0dd5d2b8d6a61e37631e70609e0212446bc86` | `8c9bf3f749f9e7d6322f3604a8d0a7b7f6808bb7` |
| `packages/core/src/domain/job/entity.ts` | 885 | `55cbfee14e5a341ad15bccfccbc62a81af2bcb5dedca50621863a66e82814cf8` | `3344919e7311f65e20b00b86d22c997c6949b945` |
| `packages/core/src/domain/job/ports/jobRepository.ts` | 884 | `f62be73d988a9e3c8f91058b1a8bab9ed6f48ba8c4f3dd47410798c0ff86883b` | `a1064d1f11afc8260b7e7fd175e905bb3250b511` |
| `packages/core/src/domain/llm/entity.ts` | 7524 | `29fc41d9f9e7f66724547cfc7de61726f45752c006ca184326e28993e155c8fd` | `54e930cabbcbb4e8efc1647968c5187dc3ad4301` |
| `packages/core/src/domain/llm/repositories.ts` | 2868 | `1185e395f35781f2f878a706be89b2a31459708005fb860aa8d2d1370813707b` | `d98da42096fb24a0077f68ff06e0f7acb58ccab2` |
| `packages/core/src/domain/regeneration/source.ts` | 3296 | `65704cc89ec4c57e6a72f6c39873fa46dd3fc25d81c69ac7c5065da2cff496c0` | `42de64a82c5f19002b3a072a52d6dc3e54880a6b` |

各readはcanonical/regular/selfUID/nlink1/actual600/O_NOFOLLOW、全文SHA、前後FDidentity/mode/size/mtime/ctime、HEAD Gitblobとworking Gitblob一致を確認。full SOURCEwalk/mainclean/全依存scan/実Node importなし。今回exact2のread cap各65536（実3105/3281）、個別追加READも各65536以内。原C1named20の不使用pathsを広域再readしない。

新補足報告だけwx600/fsync/FDclose/fullstable固定し、ALL readers/writers STOP。設計PASSとfuture ONE actualはRoot別採用。
