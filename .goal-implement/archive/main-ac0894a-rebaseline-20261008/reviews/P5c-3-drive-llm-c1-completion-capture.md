# C1 completion capture correction independent review

固定 `2026-10-06T13:15:42.224831+00:00`。判定 **LIMITED FAIL / CAPTURE-REENTRY1**。旧 CP-CAPTURE1 の FIRSTWRITE前snapshot不足とfailure後quota計算位置は補正された。保存前とterminal-callの分離、unknown outcome型、元write順は静的PASS。exactrollback後の同callback再入でrecorderを一回に束縛する単位と原clock/expectedの再用がまだ明示されず、正常rollback回復の契約だけ補正が必要。SOURCE/runtime欠陥の発生・native closure・LLM/UI提供可能性・全S5完成は主張しない。

## 独立scope

私は原C1-P1方向案の作者であり、その方向は既採用レビューを借用する。今回 UI作者の新 capture 補正文書、及び他担当の CP-CAPTURE1 review の作成には参加していない。独立判定は新captureの二時点/原write-set/recorder再入差分に限定。元C0F2・generation no-DDL・withOwner lifetime・Drive sharedDI・native proof factory・ACKvoid・local/PDF schedulingの既方向を新しい独立実証へ数えない。

## 直接固定入力

全PUBLIC4文書をO_NOFOLLOW fullread/canonicalregular0600/selfUID/nlink1、path/fstat前後devino/mode/UID/nlink/size/mtime/ctime不変・actual FDcloseで照合した。

| Input | Bytes | SHA256 |
| --- | ---: | --- |
| `phases/P5c-3-drive-llm-c1-completion-capture.md` | 22900 | `9e2fb4f53219440678d5669aceec417d589633edff5f4848a8b08ef3f73d089f` |
| `reviews/P5c-3-drive-llm-c1-completion-plan.md` | 22516 | `6f7a92b62dd141636984e199bbe6aab7ebba1e2425967833bdf92714d826dc60` |
| `phases/P5c-3-drive-llm-c1-completion-fields.md` | 22037 | `41b26b3539286a36b182e5e1513240d40aa27344b40f309f9c22fb16e675fd46` |
| `phases/P5c-3-drive-llm-c1-completion-plan.md` | 15975 | `0cb474551a483f0ff328fd419e1e89416bd05976861af76bf08072841ae4f094` |

controlled C0 SOURCE frozen176ea15b572c610e97f99a021ea94e2ba60637c7 は Root報告借用。currentHEAD/Git/全sourcewalk0。captureの正式14path/135814Bだけ、各≤65536B/fullstable600/UIDself/nlink1/nonlink/canonical/fullSHA＋memory computed Gitblobを直接確認。原全文を読んだが利用はknownfunctions/types/write-set。SOURCE表外読取・Nodeimport/default/runtime/test/DB/native/旧private/rootprobe/create0。

## 個別判定

| 条件 | 判定 | 根拠と限界 |
| --- | --- | --- |
| success FIRSTWRITE前 prewrite | STATIC PASS | worker519–533のsameTx current/media/signal guard後、commitNote533前にcapture。body→Original540→notices550→completeLlm585順を保持。後writeのOriginalをrollback-beforeにしない |
| failure FIRSTWRITE前 prewrite | STATIC PASS | worker616–629のsameowner/read/既terminal分岐後、dispatch.fail628–629より先にcapture。取消・失権したjobのfailure保存に新active資格を要求しない |
| terminal-call値/時刻 | STATIC PASS（初回） | 元 completeLlm 585–591/645–651の同時点clockを一度取得し同Date/args/outcomeを渡す。base version+1/updatedAt元now/generic終端に使用。再入の束縛は下記不足 |
| dispatch/quota効果入力 | STATIC PASS | llmRepository1031–1050のsameintent/token failがnot-sent/unknownにだけ更新、falseなら不変。terminal-callはfail後の同Tx dispatchを入力。releaseUnsent1152–1201がprepared/not-sent以外なら返却しない、scrub1052–1063はresponseのみ。release→scrub順不変 |
| outcome型 | STATIC PASS | failed.codeからOWNERSHIP_UNKNOWN/DELIVERY_UNKNOWN両方を除外。closed deliveryunknownは元unknown枝、cancelGeneration優先。failure.closed=false/native/read/ACK未知はnormal型へ入れない |
| rollback vs commit応答不明 | CONDITIONAL STATIC PASS | 全prewrite typed dataとexactterminalは別predicate。read mismatch/absence/別version/部分一致はheld。terminal確認後にactive current/bodyを再採用0。callback再入のrecord/clock状態遷移は不足 |
| immutable snapshot/proof別private refs | 方向PASS/実装未確定 | Date→epoch、明示typed scalar/nested copy、元proof/lease/callback/Promiseは別slotのsame参照。response.content immutable参照を無料の保持量としない。Data<T>例は型検査済みSOURCEではない |
| original withOwner/deferred/stop timer | 借用方向PASS/未実装 | prepareから生成/本文/finalcheck/finish/terminal/failureまで原callbackを保持、sameproof consumedを要求。timer1 recover-only/claim0/localPDF不変/stop拒否保持は旧詳細案・CPレビュー借用であり実行正例0 |

completeLlm16–20/44–63、repository450–473から、LLM CAS version+1、terminal/closed/responseBudget0/原now、generic terminal/failure/leaseNULL、releaseUnsent→scrubが同Txであることを直接確認。Drive operation regenerateはimport-only display branch76–97に入らない。failed時Original activeJob一致ならsourceState/sourceCoverage復元64–75を保持。単なる同token terminal shortcutを新exact Drive確認に使用しないという旧採用要件は維持。

## CAPTURE-REENTRY1: recorder一回の単位とrollback再入

新文書「recorder一回」は、原callback内のterminal-call点で recordAttempt一回、同pending entryのsamecallback/lease/proof/job/outcomeへ束縛し、「第二回record…を正常化しない」と記す。同文書rollback表と例1は、全prewrite一致後に同immutablecallbackを再用可能としている。

机上因果（実発生0）:
1. 原callbackがsameTx FIRSTWRITE前prewriteをcaptureし、terminal-call点で recordAttemptを発行する。
2. 原 completeLlm/UoW応答が不明になり、readonly原Txで全prewriteをexact確認してrollback-only枝に入る。
3. 同callbackを再呼出すると、元current guardの後、同じcapture/record点/clock呼出に再到達する。
4. 「二回record不可」をpending entry全体に適用する実装なら、この必要な通常回復が二回目でheldとなる。逆に無条件record reset/新now採番で旧expectedを置換する実装は、旧attemptのcommit可能性が未確定の段階へまで広がり得る。

原因はSOURCE実装や旧actualではなく、新設計におけるrecorder/attempt/invocationの状態遷移の未束縛である。新callback・clone proof・readback outcomeに合わせた期待変更・Boolean completionを要求しない。

必要最小補正は、現12source/3testsの契約内で以下の一方を明文化すること:

- 「一回」をtyped Tx invocation/attempt単位と限定する。旧attemptの全prewrite rollbackをexact確認した後だけ同originalcallbackの次invocationへ移り、旧attemptの固定expectedを未確定中に更新しない。次invocationのFIRSTWRITE前captureとterminal-call原nowはその原呼出時点から一度生成する。sameproof/lease/job/outcome/bodyclosureを保持し、新expectedをobserved terminalから作らない。新failure attemptも旧success未commit確定後の原failure handlerだけ。
- 又は同immutableattemptの元now/recordを原参照で再用するcallback契約を固定し、再入で二回recordを発行しない。原current guardは各再Txで実行し、別outcome/clock/source/callbackをsameattemptとして黙認しない。

必要な既論理対: record済→exactrollback→samecallback再入が正常完了し原finallyへ進む、同invocation duplicateは拒否、read不明ではrecord reset/now再採番0、rollback後current拒否→原failure Txの新prewrite、commitresponse lossではcallback/write/ACK再演0。source/helper/runtime実装・実行はこのレビューで許可しない。追加path/native port/DDL/新case familyを求めない。

## 未確定事項（BLOCKERと分離）

capture自体read error/null必要row/異identity/recordmissing/unknown write errorはheldという保守帰結が明記され、既知rollbackやsuccessfulcommitに推論しない。holdingbytes/private2 entry/文字列・body closure保持量、typed data copy全field、job/reservation/list lookupの型、full typecheck、SOURCE-derived case/runtime/material上限、original stop/recovery/current拒否のSOURCE対は候補実装で別固定する残務。未実装であること自体を失敗条件に追加しない。

原sameproof read/consume/ACK/finalcheck、真のnative input close、Driver応答不明とatomic body/revision/refsの実正例、再起動predecessorの別能力、全UI/Drive実外部は未実証。rawproof/ID/nativehandleの新外部保存0、private元参照保持は許可契約内。native/read/ACK unknown・旧runtime・proof cloneはheld。資源予算未採用を今回読取135814Bから実行上限へ転用しない。

## 直接SOURCE証跡

| Relative path | Bytes | SHA256 | memory Gitblob |
| --- | ---: | --- | --- |
| `packages/core/src/application/llm/current.ts` | 4253 | `7f31a9c440bb07e1cddc00c0dc574144334fa7e50dfaa91c3a19d1332d0c550b` | `702d637a55bacd161702ec5b3c2fd273b8011b83` |
| `packages/core/src/application/llm/worker.ts` | 32277 | `0f2e0837dc29b2577deb556ebe1ff58b11437ef6ac46b754569a5f177eb2ddc6` | `8b54a79d19c84336fc4ba642064a2182600fe527` |
| `packages/core/src/domain/llm/entity.ts` | 7524 | `29fc41d9f9e7f66724547cfc7de61726f45752c006ca184326e28993e155c8fd` | `54e930cabbcbb4e8efc1647968c5187dc3ad4301` |
| `packages/core/src/adapters/libsql/repositories/llmRepository.ts` | 39043 | `13335b88bc15effd4a19e22790e103e966a33f5c7849cb1f29eac5606fd75b62` | `839a60bbf395604abad78dcf03e90c1f31df56b7` |
| `packages/core/src/application/llm/completion.ts` | 3105 | `47f05252131da3f64705885c7c71a57a2c83e2fdf65dfb8e5505c4f547574e08` | `0d9611438d32fe35180b68ba21445251248c3e4c` |
| `packages/core/src/domain/import/entity.ts` | 3921 | `727534315f86b400a6f927d40aa0dd5d2b8d6a61e37631e70609e0212446bc86` | `8c9bf3f749f9e7d6322f3604a8d0a7b7f6808bb7` |
| `packages/core/src/domain/job/entity.ts` | 885 | `55cbfee14e5a341ad15bccfccbc62a81af2bcb5dedca50621863a66e82814cf8` | `3344919e7311f65e20b00b86d22c997c6949b945` |
| `packages/core/src/domain/llm/repositories.ts` | 2868 | `1185e395f35781f2f878a706be89b2a31459708005fb860aa8d2d1370813707b` | `d98da42096fb24a0077f68ff06e0f7acb58ccab2` |
| `packages/core/src/domain/regeneration/source.ts` | 3296 | `65704cc89ec4c57e6a72f6c39873fa46dd3fc25d81c69ac7c5065da2cff496c0` | `42de64a82c5f19002b3a072a52d6dc3e54880a6b` |
| `packages/core/src/application/integration/drive/ports.ts` | 5980 | `527e530fb08854373e2736614c344a4310e8fbb75b412ce76a6771cbab011ae6` | `aaea3d0bb5aad901f75a08c22537a51efc9dd1b5` |
| `packages/core/src/application/regeneration/driveRequest.ts` | 4241 | `a292915b8a279d4aab43e352e92a157cba4850bde1a2c155647aaaeb05480250` | `30cf6a6e3aa649ff657fdd76e6677b508ae170d2` |
| `packages/core/src/application/regeneration/current.ts` | 11509 | `5f0b1f3acd48ca34467b31fd326b24eb715bd663c2988c97ad84f7f7cd49c271` | `facd27e12f920a947900d3b18fa346ab998bbccb` |
| `packages/core/src/application/regeneration/services.ts` | 9713 | `657b34347525567295cd4ab5e85a136881a646aace734ea011882fbd9294d561` | `85bf4fe1d2ba2ef6437adbf992a8aa170ecc05a4` |
| `packages/core/src/application/execution/hollowUnitOfWork.ts` | 7199 | `c22d1dcff055a6e015ba1731840951c4295c23e9eb615323b851f9e4990f3a94` | `0e35f36f2ec455012ec1459d041be34f5ec5472a` |

## STOP

この新reviewだけwx600/O_EXCL/O_NOFOLLOW/fsync/actualwrite FDclose/postread fullstableSHAで固定。旧PUBLIC docs/reviews、SOURCE/helper/Manager/main/S5/P5d/UI/built artifactの変更0。全private success/failed/generated SOURCE/B/TMP/records/cache/key/proofはstat/read/hash/import/copy/reopen/retry/cleanupを含め0。実session0、全reader/writer STOP。Rootへ設計補正の限定FAILと解消済みCP項目を返し、次候補・実装・実行は別採用を待つ。
