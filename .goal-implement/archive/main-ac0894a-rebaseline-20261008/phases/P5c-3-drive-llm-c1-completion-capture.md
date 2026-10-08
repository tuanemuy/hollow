# C1-P1 completion capture correction

2026-10-06。PUBLIC SOURCE-only delta design。Root採用 CP-CAPTURE1 の補正。新補正文書だけを作成し、旧 completion-plan / completion-fields / review、SOURCE、helpers、Manager は変更しない。runtime / tests / DB / native / sourceimport / Git / rootprobe / create / oldprivate 操作0。実装・actual・LLM提供可能性・native closure・UI成功を主張しない。

## 固定根拠と変更範囲

- detailed plan 15975B / SHA256 `0cb474551a483f0ff328fd419e1e89416bd05976861af76bf08072841ae4f094`、fields 22037B / `41b26b3539286a36b182e5e1513240d40aa27344b40f309f9c22fb16e675fd46` は immutable。
- CP-CAPTURE1 review 22516B / `6f7a92b62dd141636984e199bbe6aab7ebba1e2425967833bdf92714d826dc60` の差戻しを補正する。旧「completeLlm直前の before を原Tx prewriteとして使う」案を置換する。
- controlled SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-p5c-drive-machine-721bc7ad-20261006`、固定 accepted commit `176ea15b572c610e97f99a021ea94e2ba60637c7`。現在HEAD/worktree status/Git/fullwalkを読まない。表の14 knownfilesだけ stable fullSHA＋memory Gitblobを確認した。
- 将来編集 scope は既12SOURCE / 3tests。DDL/domain proof factory/storage port/new codec/native capability追加0。具体型コードは設計例であり、型検査を実行したSOURCEではない。private保持量・case順・runtime予算は候補で別固定し、今回の読取予算を実行許可へ使わない。

## 二つの時点

**prewrite** は同じ原UoW callback内、どの write よりも先に取得するDB data snapshot。LLM全field（immutable identityだけでなくphase/outcome/owner/version/cancelGeneration/source/inputも含む）、generic全field、dispatch全data、job quota reservation、Original全data、SourceBinding全dataを保持する。Dateは元Dateから一度取得したepochMs、nested objects/arraysは既domainのtyped dataをreadonly scalar snapshotへ射影する。ORM object/Date可変参照や後で変わる shallow objectを snapshot と呼ばない。proof/lease/nativehandle/Promise/callback はこの data の中へ入れず、既private別slotで原参照のまま保持する。

**terminal-call** は current/final fence を通った元callbackが、原 completeLlm を実際に呼ぶ直前に取得する別snapshot。元 completeLlm の実 value/base、元 outcome、元 clock の値、それまでの同Tx sibling writes を区別する。prewriteと同一型/同一before変数にはしない。terminal value のversionに+1するのは原 replaceLlm:16–20 の規則。clockをFIRSTWRITE前へ前倒ししない。completeLlmが元時点で使う `container.clock.now()` を同じ時点で一度取得し、同じDateを原呼出へ渡す。

prewrite取得後に同Txで行われた dispatch.fail / body / Original / notices を反映した値は、terminal-callの効果入力であってrollback-beforeではない。terminal readbackをobservedからexpectedへ書き換えない。readonly data snapshotはnative proofでもcommit proofでもない。

## 原SOURCEから導く位置と write-set 順

| 分岐 | FIRSTWRITE前のcapture位置 | 原write順／terminal-call位置 |
| --- | --- | --- |
| normal Drive success予定枝 | worker:519 UoW入口、原 current guard:520 / media照合:521–530 / signal:531–532 の後、commitNote:533 の前。guardが返すsame current/original と同UoWの generic/list/reservation/binding を読む | commitNote:533–539 → saveOriginal ready/coverage:540–549 → replaceNotices:550–583 → terminal-callをcapture → completeLlm:585–591 |
| known closed failure / cancellation / possible delivery | worker:616 UoW入口、find/同owner:617–623 と既terminal分岐:624–627を通った後、dispatch.fail:628–629より前。same currentと同UoWの他全prewriteを読む | 元 dispatch.fail:628–629 → closed判定:630–638 → 元cancel優先/outcome分類:639–644 → terminal-callをcapture → completeLlm:645–651 |
| unproven native/input/ACK / failure.closed=false | 元known error分類・owner検査を保持。normal completion attemptへ入れない | 元dispatch.failと ownerunknown replace:631–635 の原順を変えず、通常 closed completionへ昇格0。finish/consume/terminal resolve正常根拠0 |
| predecessor recoverLlm | 既SOURCE:782–803ではintent→possible fail後completeLlm。今回新live Drive同proof completionとは別family | 既recoverを今回のcallback再試行に置換しない／旧predecessor proofをlive sameawaiterへ流用しない。既local/PDF orderを維持 |

success captureの前に current guardが失敗した場合は本文write0。failure captureは current eligibilityの再要求ではなく、原failure handlerが既に取得したsameowner currentに基づく。取消や失権したjobを「資格がないから失敗保存も不可」にしない。Drive新current/finalTx fenceの意味は元C1案通りで、local/PDFにはcapture・追加read・clock移動・write順変更を入れない。

completeLlm:44–61 のLLM CAS(version+1/terminal/closed/responseBudget0/原now)は llmRepository:450–473 のgeneric terminal更新を含む。その後 **releaseUnsent:62 → scrub:63 → Original read/非success復元:64–75**。Driveはregenerateなのでimport-only note display branch:76–97を実行しない。body/projection/refs/revisions/noticeのatomic保存を別Txへ分けない。

既 dispatch.fail:1031–1050 は、指定id/同ownerToken/state=intentに対し not-sent又はunknownへだけ変更する。返値falseのときはstate不変で、原呼出がBooleanを無視する意味も変えない。terminal期待は「呼んだから変更された」としない。既正式find/listの同Tx readが必要ならその結果と元predicateから効果入力を束縛する。返値を新proofにしない。

**quota期待の追加補正**: releaseUnsentはfail後、scrub前のdispatch集合を読む。failure前intent→not-sentになった場合、prewriteのintentから「quota維持」と計算するのは誤り。fail後unknownなら possibleのままreleaseしない。success responseはscrub前にresponseなのでreleaseしない。terminal-callはreleaseUnsentが見るこの効果状態を保持し、rollback照合は元intent/responseを保持する。この順を逆転しない。

## 型例：prewriteとterminal-callの分離

以下は既型からのdata射影案。新domain型/列/codecを要求しない。実装ではknown型ごとの明示field copyを用い、unknownobjectのgetter/constructor/toSerialized/汎用JSON副作用を実行しない。数値epochと元Dateの参照は別物で、原APIへは元Dateをそのまま渡す。

```ts
type Data<T> =
  T extends Date ? Readonly<{ epochMs: number }> :
  T extends readonly (infer V)[] ? readonly Data<V>[] :
  T extends object ? { readonly [K in keyof T]: Data<T[K]> } :
  T;

type Binding = NonNullable<Awaited<ReturnType<
  HollowUnitOfWorkContext["regenerationBindings"]["find"]
>>>;

type DriveLlmOutcome =
  | Extract<LlmOutcome, { kind: "succeeded" | "cancelled" }>
  | Readonly<{
      kind: "failed";
      code: Exclude<
        LlmFailure,
        "LLM_OWNERSHIP_UNKNOWN" | "LLM_DELIVERY_UNKNOWN"
      >;
    }>
  | Readonly<{ kind: "unknown"; code: "LLM_DELIVERY_UNKNOWN" }>;

type DriveLlmPrewrite = Readonly<{
  point: "prewrite";
  llm: Data<LlmFixedConversion>;
  generic: Data<ConversionJob>;
  dispatches: readonly Data<LlmDispatch>[];
  quota: Data<LlmQuotaReservation>;
  original: Data<Original>;
  sourceBinding: Data<Binding>;
}>;

type DriveLlmTerminalCall = Readonly<{
  point: "terminal-call";
  base: Data<LlmFixedConversion>;
  outcome: DriveLlmOutcome;
  nowMs: number;
  genericBase: Data<ConversionJob>;
  dispatchesBeforeRelease: readonly Data<LlmDispatch>[];
  quotaBeforeRelease: Data<LlmQuotaReservation>;
}>;

type DriveLlmCompletionAttempt = Readonly<{
  prewrite: DriveLlmPrewrite;
  terminalCall: DriveLlmTerminalCall;
}>;
```

genericBase/dispatchesBeforeRelease/quotaBeforeReleaseはprewriteと混同しないsameTx data。successではgeneric/quotaがprewriteと同じ、dispatchもfailがないが、同じということをscopeと元write-setから確認する。failureはdispatch差を保持する。base.llmのsameoperation immutableallはprewriteと一致し、同Tx別LLM writeを勝手に認めない。input closed CASはすでに別finish段階で済んでおり、このterminal attemptの中でLLM.versionを再採番しない。

LLM 全identityは既型145–203からsource/access/inputReceipt/job/account/note/command/requestDigest/operation/retryOf/sourceState/sourceCoverage/noteVersion/originalRevisionNo/credentialEpoch/instruction/admissionSequence/createdAt/deadlineAt/updatedAt/owner/cancelGeneration/responseBudget/version/selection/modelId/preparationVersion/promptVersion/pdfProof/sourceOwnershipGeneration/outcome/phaseを保持する。Drive HTML/Markdown固定recipe・generation/binding意味は旧C1案のまま。不存在fieldを作らない。

genericはJobBase:1–13とstate/failure/leaseToken/leaseUntilを保持し、row version/resultVersion/ownerを足さない。Originalは48–61の正式全field。bindingは正式repositoryfind戻り値を用い、knownsource identityとmutable cancel stateを区別する。LLM source/inputとbinding/consumer/executor/job/note/original/fingerprint/record/credential owner/subject/Drive epoch/ownership generationを元currentで束縛する。

dispatchは235–252の既全dataをprivateで保持する案。response枝のcontent/finish/tokensもdataであり、metadataをfull rowと偽らない。既immutable文字列の参照保持は可能だが保持memoryを無料とは数えない。新body複製/外部serialization/raw出力0。旧fieldsの「response.contentはrecopyしない」方向と整合する実装・holdingbytesが必要。完全prewrite照合をmetadata-onlyに落とすなら原単調state契約だけで十分な根拠を別提示し、勝手に省略しない。現private2 pending/保持bytes上限は未採用で、候補typecheck/保持量固定が前提。

quotaはjob/account/month/state/firstIntentAt/createdAt/updatedAtを保持する。null reservation/releasedの正常入場を作らない。aggregate usage bucketは他jobが進むので、旧bucket絶対値との再一致をnormal終端必須にしない。原releaseUnsentはbucket該当列を同Txで1減らし、非正値ならinvalidをthrowする元atomic契約を使う。原aggregate原子性を新snapshotで代用しない。

## recorder一回と取得不足の扱い

原callback内でprewriteをreadonly localとして保持し、上記terminal-call点に到達したら `recordAttempt({prewrite, terminalCall})` 一回だけ。record自体はvoidでBoolean/commitreceipt/proofを返さない。stageの同pending entryへsame original callback/lease/proof/job/outcomeと束縛し、第二回recordや別closure/callback/no-op/別jobを正常化しない。

record後の原 completeLlm/UoW応答が不明でも、expectedはこの二つの時点から固定できる。completeLlm前にwrite errorが生じrecord未到達なら、complete terminal expectedを後から作らない。recordmissingはexactterminal未確認としてheld。元callbackがcurrent guardをFIRSTWRITE前に拒否した既知分岐は原failure handlerへ進めるが、未知DBerror/Promise rejectionだけで「rollback済み／write0」と推定しない。

prewrite capture自体のread失敗、null必要row、異job/receipt/lease/current、snapshot完成前errorはattemptの正常作成0。元currentのknown拒否とunknownDB/native不足を区別する。持続pendingを自動successやordinaryfinally-releaseへ変換しない。record前writeerrorのrollbackが別exact source契約によって確定しない場合はunknown-heldとして残る。今回補正はその欠測を新timer/deadline/Booleanで解消しない。

失敗終端は cancellationを先に選び、それ以外のLLM_DELIVERY_UNKNOWNは必ずunknown delivery枝。ownershipunknownはnormal failedから除外するだけでなく、failure.closed=false/native/read/ACK未知を正常型へ入れない。型narrowingをcastで通さず、原known failure分類とclosed根拠から候補で実装する。

## 正常commit-response lossとrollback-readは別判定

| 読取結果 | 結論と許可 |
| --- | --- |
| 原UoWが正常return | normalterminal保存を原returnとして扱い、同callbackのreturn/finallyへ自然に進む。DB/nativeclosureまでこのreturnで推定しない |
| 応答不明だが exactterminal期待とsame consumed proof/leaseをread-confirm | 原commit確認。同deferredだけ解決し、原callback→withOwner/endWrite→原executionfinallyを自然に進める。生成/project/write/ACK/consumeを再演しない |
| 同row全prewrite＋generic全prewrite＋dispatch全prewrite＋reservation全prewrite＋Original全prewrite＋sameBinding prewriteが一つの原readonlyTxで一致 | exact rollback-before確認として同immutablecallbackだけ再用可能。全prewrite一致と本attemptの原CAS版/atomic契約が前提。read失敗/absence/別version/部分一致はrollbackでない |
| terminalとprewriteのどちらにも完全一致しない | unknown-held。同expectedを書換えず、新finishproof/lease/ACK/job/callbackを作らない |
| rollback-confirm後にcurrent資格/取消/期限/source版/epochが変化 | 再用callbackの原Tx current guardが再検査し拒否。旧successを再採用0。旧attempt未commit確定後だけ、同withOwner内の原failure handlerが新failure TxのFIRSTWRITE前snapshotを作る |
| 他job/edit/undoがcommit後に進む | terminal confirmationは旧current eligibilityを再要求しない。現body/Original/binding mutablecurrentへ旧expectedを押し戻さない |

exactterminal:
- LLM immutableallは元baseと同一、version=terminal.base.version+1、phase terminal、sameruntime/token closed、responseBudget0、sourceMemory0、sameclosedreceipt consumer/g/proofId、updatedAt=terminal.nowMs、outcome元値。successは既 outcome.noteVersion。SQLresult_versionを新domainfieldにしない。
- genericは元identity全fieldと元terminal mapping、leaseToken/leaseUntil null、updatedAt同now。failed又はunknown delivery→failed/code、success/cancelled→各state/failure null。
- dispatch期待はterminal.dispatchesBeforeReleaseから元scrub規則 response→scrubbed/response:null、他state保持。同set/id/ordinal/input/runtime/ownerToken/intentAt一致。failの効果は既にその入力へ反映済み。
- quota期待はterminal.dispatchesBeforeReleaseにprepared/not-sent以外があれば元reservation保持。全部未送信なら元reserved/consumed→released、updatedAt=同now、firstIntentAt保持。未知fail効果/予約不一致でquota正常を補完0。
- same proof consumed(proof,lease)原参照必須。SourceBindingは元immutablecolumnsとsame identityを束縛し、terminal後のcurrent cancel/linked/epoch/noteVersionをliveadmission必須にしない。closed input saved predicateとterminal currentguardを分ける。
- Original/body/noticesは原callbackの同Tx atomicwriteのまま。terminal後のmutableOriginalを旧snapshotへ合わせ直さない。saved readは正常DBcommit confirmationであり、currentbody再採用/nativeclosure能力ではない。

rollback predicateの全prewriteにOriginal/sourcebindingを含めることで、LLMだけpendingに見えている異operation/state差をnormalrollbackにしない。通常合法な同時変更がprewrite一致を壊す場合もheldであって、値を新observedへrebasingしない。sourceBindingの未知削除／newgeneration／別consumer／別proofは拒否。Proofなど非data参照はprivate元能力で検査し、data一致からproofを生成しない。

## 静的具体例と意味あるnegative対（未実装・未実行）

1. failureの原dispatchはintent、quota consumed。prewriteはintent/consumed。原fail(not-sent)後、terminal-callはnot-sent/consumed。completeLlmでreleaseUnsentがreleasedへ、scrub不変。commitresponse lossならterminal readのreleasedを確認して原finallyへ。Txrollbackならintent/consumedのprewriteを確認して同callbackだけ再用。not-sentをprewriteとして渡す誤位置は拒否し、intentからterminalquota維持を計算する誤期待も拒否。
2. 同じ原intentでfailure.delivery=possible。fail後unknownなのでreleaseUnsentはfalse／quota consumedのまま。kindunknown/codeLLM_DELIVERY_UNKNOWN、genericfailed同codeを期待。kindfailedへの混入・quota返却・再dispatchを拒否する。取消優先の原分岐でもpossible dispatch/quotaの意味を残す。
3. successはprewrite Original processing/sourcecoverage、response dispatch。原callbackがbody/noteVersion/Original ready/coverage/noticesを同Txへ書き、completeLlm直前clockを使う。response→scrubbedでquota consumedのまま。rollback readは旧Original/response全prewrite、commitreadはterminal既noteVersionを期待。post-body Original readyをrollbackBeforeとしてrecordする対を拒否。
4. commit後note.edit/undo/currentcredential変更しても、exactsavedterminal＋same consumedproofならcommit確認。旧body再write/project/generate/currentguardで旧finallyを永久阻害0。別savednoteVersion/outcome/token/version/now/proofIdならheld。
5. 全prewrite一致read後の再用callbackでcurrent-source拒否。元callbackがFIRSTWRITE前にthrowし、同withOwnerの原failure handlerへ進む。新failureprewriteはその原Txから取得、旧successoutcomeを書換えず独立attemptを束縛する。先successattemptの未commitが未確定ならこの移行を拒否。
6. prewrite取得read失敗、recordmissing、no-op callback、LLMだけ一致してgeneric/dispatch/quota/Original/binding差、responsepayload差、異callback/二回recordはnormal0。readback結果を期待型の入力にしない。
7. ownershipunknown、voidACK reject/unknown、native/readunproven、consume未確認、旧proofcloneは既held。dispatch/body/data-only型testでgenuine nativeproof/閉鎖positiveを代行しない。
8. stop中latependingは既Drive-onlytimer1/2000msのrecover-onlyを再用。newclaim/preview/prune/prepare/generate/project/再ACK0。knowncurrent拒否→原failurecontinuationの通知と、真のmaintenanceerrorを分離。原stopPromise同一/原拒否/firstactualrecoveryerrorを維持し、callerdrain後だけsharedDrivefinalstop。

既3tests: new `application/llm/driveRequest.test.ts`、既 `application/llm/inputStage.test.ts`、既 `adapters/libsql/__tests__/driveRegeneration.integration.test.ts`。論理/codecの対はSOURCE候補で準備可能だが、actualDB応答損失/native/HTTP/Driveproof/privatepending保持量は別scopeであり未採用。この文書でtest実行・新fixture/private根を許可しない。

## 読取証跡と残条件

今回 unique14 knownSOURCE / 135814B。各全文65536B以内。O_NOFOLLOW/regular600/UID501/nlink1/canonical、FDとpath前後dev/ino/mode/uid/nlink/size/mtime/ctime一致、fullSHAとmemoryGitblob一致、actualFDclose。全文bodyを読んだが利用は元knownfunctions/type/write-set。未知import/target/parentwalkを増やさない。

| Known SOURCE path | Bytes | SHA256 | memory Gitblob |
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

候補実装で固定すべき残条件は、明示typeddata copy／sameUoW captureと元write-set一致／recordmissing未知保持／同proof private保持量と2entry上限の実現／exactrollback predicateのSOURCEテスト／wholetypecheckとcase予算／Drive-only timer分岐のlocal/PDF不変。SOURCE追加path/API/native/resourceが必要なら編集前にexact通知。原local/PDF/current/proof/possiblequota/schema/portsの意味変更を今回補正へ混ぜない。

この新delta文書だけwx600でfsync/実FDclose/fullstablehash固定。旧2詳細docs/レビュー/29SOURCE/helpers/main/S5/P5d/Managerは変更0。旧actual/generatedsource/B/root/log/TMP/cache/key/proof全恒久NOOPS。ALL SOURCE/helper/Git/native/runtime/reader/writer STOP。次独立レビュー・候補実装・actualはRoot別採用。
