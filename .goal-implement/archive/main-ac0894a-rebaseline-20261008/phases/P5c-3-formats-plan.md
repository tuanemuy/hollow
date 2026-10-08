# Slice A — local残形式の版付き入力寿命・前任回復

計画日時: 2026-10-05T22:55:07.265646+00:00。状態は共有契約の採用待ち、製品/DDL/DB/runtime/helper実装0。対象R03/R08/R10・IM-06。V1/S1–S3、既P5b byte/hash/recipe/policy/取消/quotaを維持し、Office・strict-text PDF・画像・PDF pending/preview/全頁redrawの新receipt接続だけを実装範囲とする。Machine/Drive受付は後続B/C、音声/D01/actualfresh/旧private/failed roots・P5d writer中worktreeは非操作。

## 判断

A-P1/A-P2はrecipe predicateを広げるだけでは閉じない。既SourceInputReceiptはconsumer/runtime/token/generationを持ち、0043の保存triggerはNULL→active g1、closed0→active g+1、同g active/unknown→closed0を既に許す。**新DB列/DDLは提案しない。** pending→fixedのsealでrecipeが変わる前に旧gを閉鎖確定し、manifest準備と次reader寿命を分離する。

文書Workerは親runtime実終了に従うがimage/PDFは別Node childを生成する。現在runtimeOwnershipの親PID不在だけを新形式のchild閉鎖proofへ代用しない。version3 capabilityと限定native birth/knownPID記録を同runtime正本へ加える提案が必要。新形の汎用transport/全crash保証へ広げない。

## 共有port案

既LlmPreparedSourceのV1–4 unionは増やさず、RegenerationInput.prepareTextを残して版付きprepareを追加する。LlmInputStage.prepareの結果を同unionへ広げ、local対象判定をrecipe組(V1/prompt1、V2/prompt1、V3/prompt2、V4/prompt3)で閉じる。既V1のmedia処理は保持、非V1にmediaを渡さない。

```ts
type LocalInputWork =
  | { kind: 'prepare'; contract: LlmSourceContract }
  | { kind: 'classify-pdf'; source: LlmSourceIdentity<'pdf'> }
  | { kind: 'redraw-pdf'; source: LlmSourceIdentity<'pdf'>;
       manifest: PdfPageManifest; page: PdfPageIdentity };
// 非exportのopaque handle/registryは同consumer・source・owner・gに束縛する。
type WorkResult =
  | { kind: 'prepare'; prepared: LlmPreparedSource }
  | { kind: 'classify-pdf'; choice: PdfChoice }
  | { kind: 'redraw-pdf'; raster: LlmImageRaster };
```

実portはwork/resultの対応をoverload/discriminated signatureで固定し、無検証castでunionを広げない。RegenerationInputはadoptした原本だけをbusy中にpreparer/classifier/redrawへ貸し、戻り値とrecipe/hash/manifest/pageを境界で検証する。adapterのclosed=true/実終了後だけ原本参照を落とす。busy/reading/bytes/unknownがある状態からfinish proofを作らない。SourceInputLease/Proofのprivate registryとsame-g verify/consumeは維持する。

LlmInputStageには固定prepareに加え、pending/preview classify、fixedV4 redraw、同consumerの次世代begin/finishを型付きで接続する。previewはconsumer='pdf-preview'/id、conversionは='llm-conversion'/jobId。同job同runtime/tokenでもconsume済leaseを再用しない。beginでreserve→current/read-only候補→exact UoW CAS→commitの順、初回no-claimとunknown replay falseを区別し、unknown admissionを解放しない。preview claimも同exact claim Txへreceipt/memory予約を含める。servicesの旧inputModeは旧legacy/V1互換枝として残し、新leased-local-v2枝でclassifier/preparer/pagesと新入力stageを配線する。

## A-P2: reader世代・保存protocol

| 境界 | leaseと保存 | dispatch/返却条件 |
| --- | --- | --- |
| V1/V2/V3固定prepare | claim g→read/adopt→prepare実close→原本bytes0→finish同g closed/memory0確定→consume | 同receipt/current再照合後のみ発注 |
| pending分類 | pending claim g→read→strict classifier/必要時全頁manifest検査→全Worker/child実close→finish g確定/consume | pending発注0、close確定後だけ現在owner/version/source/取消世代を再照合してseal |
| preview分類 | 正規preview claim g→read/classify実close→finish g確定/consume→ready現在CAS | readyはquota0/本文lock0、確認消費とconversion受理は既同Tx |
| V4の頁k | 保存manifestだけではreadしない。fresh g+1をexact begin→read/adopt→redraw(page k/hash)→実close→finish closed0確定/consume | 同g current/source/manifest/取消再照合後に頁kだけ発注 |
| 次頁/中断 | 前頁派生rasterを発注work終了後に落とし、原本再読は新g。取消/失権/期限なら次begin/dispatch0 | 全未送信の正式dispatch集合＋物理closedだけquota返却、先行送信ありは論理消費1 |

finishのDB応答不明は同opaque proofとlease/execution/object pinを保持する。正規同値再照合で同consumer/runtime/token/g/proofId/closed0だけを認識してconsume。別gやreadだけで解放しない。finishが確定するまでseal/ready/dispatchへ進めず、保存応答不明を通常エラーへ畳まない。seal/readyの応答不明は既現在/receipt確認で収束し、新分類/再送で穴埋めしない。

ready/confirmは既note.version/原本hashbytes/ownershipGeneration/credentialEpoch/取消/期限/権限/manifest renderer+policyを再照合する。confirm後conversionは**別consumer**で新receipt、ready closed proofを再利用しない。preview失効はdispatch0。pendingからstrictV2へseal後の本文準備もfresh g+1で原本を読み、保存preparedDocumentHashを照合する。V4は準備manifestの原本readerを閉じてから頁ごと再取得する（全N頁準備＋N頁redraw、既2N render契約を維持）。

V3 raster（最大8MiB）、V4 current-page PNG（最大4MiB）、V2 segments（16×64KiB）とmanifest（64KiB）は **原本input memory/pinと別の派生保持**。original readclose/closed0はこれらの消失を証明しない。派生入力は生成/応答処理を所有する既execution内に留め、prepare取消/finish unknownではdispatch0のまま保持し、正常終端で参照を落とす。PNGを全頁cacheしない。未知child/pipeはoriginal input、object pin、executionもheld。JS参照を落とすことからGC/RSS消失を断定しない。

## A-P1: runtime capabilityと正規前任回復

version3 record/inputMode='leased-local-v2'を新runtimeだけが生成する。旧record2/leased-text-v1は既fixedV1だけ、legacy-unverifiedは入力proofなし。旧保存値を新capabilityへ書換えた扱いにしない。predecessor recordにも元version/inputMode/termination能力を保存し、64前任/opaque input proof最大2を維持する。

bindingをlocal conversion固定V1–4・pdf-pending・pdf-previewの閉じたunionへする。consumer kind/id、executor/note/command/noteVersion/原本revision・source state/coverage/hash/bytes/format、source ownership世代/credential epoch、owner runtime/token、receipt g、selectionと合法recipe/prompt、V4 manifest hash/policy/renderer・page identityをexact束縛する。取消やphase進捗から別原本を採用せず、回復の現在権限失効は入力物理終了とは分けてterminalへ収束させる。

新capabilityのimage/PDF childだけに同runtime正本の限定native ledgerを設ける。最大2slot（既global2/account1）、receipt consumer/g/work binding付きbirth reservationを**spawn前に正規persist**→actual child PID取得→同binding knownPID登録persist→成功した後だけ原本pipelineを開始する。元child/args/env/streams/resultは変えず、image/PDF各factoryの所有境界へ注入する。register失敗では元handleを保持して既有限stopへ進み、正常実child exit/child close/input pipeline完了/4pipe close後だけslotをcloseする。persist応答不明はreserved/ownedを消さない。

前任runtime acquireでは記録済み親PIDと全known child PIDに限るactual ESRCHを別確認する（広域PID/argv/env探索0・古いPIDへの推測signal0）。親不在だけでchild閉鎖としない。birth未確定/EPERM/生存PID/PID再利用疑義はheld、proof0/ACK0。birth-gapを完全crash回復できると保証しない。このunknown枝を通常回復成功へ算入しない。登録済childが実終了した新capabilityはnormal recoveryを提供する。

前任active/unknown双方で正規capabilityを根拠に同Tx owner closed CAS→receipt closed0 CASを確定する。第二CAS false/例外は第一もrollback、commit不明は同opaque proofを保持しpendingInputProofsから再照合する。saved exact closed owner/receipt/proofIdの同値確定後のみconsume→ownership ACK。previewもconsumer別同protocolでterminalへ閉じる。旧proofの新g利用・JSON偽造・current GETだけの解放0。原本bufferの回復を意味せず、unfinished workの自動dispatch/再送をしない。

## Exact変更候補

共有契約・application:

- packages/core/src/application/llm/ports.ts
- packages/core/src/application/llm/services.ts
- packages/core/src/application/llm/inputStage.ts
- packages/core/src/application/llm/current.ts
- packages/core/src/application/llm/worker.ts
- packages/core/src/application/llm/pdfPreview.ts
- packages/core/src/application/llm/pdfClassificationPorts.ts
- packages/core/src/application/regeneration/services.ts
- packages/core/src/application/regeneration/memory.ts
- packages/core/src/application/regeneration/current.ts

Node配線・所有境界:

- packages/core/src/adapters/node/regeneration/input.ts
- packages/core/src/adapters/node/regeneration/memory.ts
- packages/core/src/adapters/node/llm/config.ts
- packages/core/src/adapters/node/llm/runtimeOwnership.ts （A-P1追加、version3/限定native slotのみ）
- packages/core/src/adapters/node/llm/imagePreparer.ts （birth/knownPID/closed callbackのみ）
- packages/core/src/adapters/node/llm/pdfPagesPreparer.ts （同上）
- packages/core/src/adapters/libsql/repositories/llmRepository.ts （preview exact receipt claim/返却shapeだけ）

比例test新規候補:

- packages/core/src/application/regeneration/localFormats.test.ts
- packages/core/src/adapters/libsql/__tests__/llmLocalFormats.integration.test.ts
- packages/core/src/adapters/libsql/__tests__/llmLocalFormatsNative.integration.test.ts

既documentPreparer/pdfClassifier/sourcePreparerと.mjs codec/render/workerは再設計せず借用。既P5b recipe/schema/DDL/派生byte上限・各adapter成功結果型を変えない。追加path/DB guard差が実装上必要なら根拠と新exact集合をManagerへ先に提案する。既testsは必要な型追従だけを追加pathとして申告し、accepted全suiteを再演しない。

## 比例検証と有限budget（実行採用待ち）

新persistent0700 root192MiBを一回排他生成、logicalDB4/合計80MiBをapp32/native32/opaque8/audit8へ予約。original fixtures合計8MiB・原本各50MiB上限はproduct値を変えない。派生fixtures/output8MiB、logs/material/tools16MiB以内をroot192に含める。DB/root失敗は非再読/非再利用、追加自動run0。新buildが必要になった時だけ別archive256MiB/600秒を提案し、今はbuild0。

pureはfake preparer/generatorでcase30秒/群120、appケース10秒/群180。Nativeはgenerator fake・実正常documentWorker最大6回/同時1、image child1＋PDF準備/2頁redraw child3＋前任回復自己子1で生成最大6回/同時1、metadata子/追加probe0。全native群360秒/外480秒、各準備は既文書/画像30秒・PDF120秒・頁10秒を維持する。正規adapter stop60秒、外known child TERM10/KILL10/pipe10 tailは異常回収として別記録し、信号要求を実終了へ数えない。birth登録/record保存は各5秒以内、失敗heldでstopへ進める。期限/枠を満たすためproduction既stop/prepareを短縮しない。実行前に具体root/Worker・child各case順/fixtures公開生成source/candidateを固定する。

必要対はOffice3形式＋strictPDF/画像/2頁PDF正常、pending seal/preview ready→confirm→頁g逐次・quota論理1、同consumer旧g proof拒否/取消交差・ready失効dispatch0、finish応答不明pin/input/execution保持→同値解放、新capability active/unknown前任2CAS rollback/不明ACK保持、旧V1/legacy能力の区分、native birth未確定/known-child生存はproof0。fake境界対と実Worker/child結果+各actualexit/pipe EOFclose+input pipelineを別記録する。画像原本closed0でもraster保持とそのdispatch終了を別assertする。先行PDF送信後の頁失敗は消費1/旧本文維持、全未送信実closeだけ返却。

32頁/64MiB product上限、RSS/native peak・全PDF互換・実外部認識品質は今回small fixtureの直接証明ではない。既accepted報告はbyte/codec/policy不変更の根拠としてのみ借用し、新receipt/PID/proof接続成功へ転用しない。数合わせのtestは作らず、各条件に有限caseを割当てる。本案は共有port/native正本変更の提案であり製品実装・新実行の許可ではない。
