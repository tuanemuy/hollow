# P5c-3-S3 実行前独立照合

2026-10-05 18:37:47–18:45:13 UTC（日本時間2026-10-06）。固定候補 `11a7703b9ef1571eb73787ad5429f4c0af3b365b`。開始時と18:43:36の製品照合終了時にHEAD同一、tracked clean、候補からの差分0を確認し、その後は報告のみを編集した。公開source/staticのみで32変更path、必要な正式0037/0043・notes lifecycle・通常取消/権限/回収APIを照合した。

判定：**2件の必須欠陥を修正してから新fresh実行へ進む**。F1はS3-D/M1のactive前任回復、F2はS3-B/C/M2の通常queued取消後の不明intent回復へ直接影響する。A–Eを動的合格にしない。製品・test・docsを変更せず、編集は本報告のみ。旧失敗rootや旧結果の内容を根拠に使っていない。

## F1：activeのまま終了した正規前任を回復できない

出所：[S3-D](../criteria/P5c-3-S3.md)、[採用M1](../phases/P5c-3-s3-resume-plan.md)。通常のclaimでowner active/input active50を保存した直後、前任processが終了する場合も、この限定正規前任回復の対象である。

根拠は `application/llm/worker.ts:615–640` と `adapters/node/llm/runtimeOwnership.ts:360–365`。前任capabilityはactive/unknownの双方へ発行できるが、recoverLlmのowner closed CASはunknownの場合にしか行われない。activeの場合はowner activeを残したままreceipt closed/memory0へCASし、直後のverifyPredecessorInputはclosed receiptにowner closedを必須としてfalseを返す。unproven例外によりUoW全体がrollbackし、次の再照合でも同じ列で失敗する。実終了した正規前任にもかかわらず入力50MiBと未ACK前任が残り、通常起動へ進めない。

静的再現列：正規version2 leased-text-v1 record → local/version1の通常claimExactでowner active/receipt active50 → 前任の実終了確認を伴う新acquire → recoverLlm → stage closed0保存 → owner activeなのでproof照合false → Tx rollback/ACKなし。JSON/legacy由来を補う例ではない。

期待：activeとunknownの双方について、exact前任capabilityを検証した後、必要なowner closed更新とstage closed0を正式CAS/同一Txで確定し、保存同値確認後だけproof消費/ownership ACKを行う。0043:33/65のOLD unknownからのmemory減少拒否、receipt/runtime/token/generation一致を維持する。unknownの第1CAS/第2CAS間失敗は全rollback、commit応答不明はproofと前任を保持し、保存同値確認後だけ消費する。

`llmInputStageNative.integration.test.ts:447–475` のN08は通常claimで作ったactive orphanを直ちにunknownへ変更してから回復しており、active分岐を証明しない。既N08の限定前任対内でactive正例とunknown/2CAS rollback/commit応答不明を区別することが必要である。追加Worker・子・DB・全crash試験は要求しない。P21のcapability単体正例もrecoverLlmの実保存列を代替しない。

## F2：通常queued取消の確定terminal fenceを不明intentが認識しない

出所：[S3-B/C](../criteria/P5c-3-S3.md)、[採用M2/M3](../phases/P5c-3-s3-resume-plan.md)。通常のcancelLlmRegenerationはqueued/idleをそのTx内でterminalへ変更する。

根拠は `application/llm/control.ts:16–41,57–58`、`adapters/node/regeneration/input.ts:199–228,252–260`、`application/llm/completion.ts:32–41`。unsaved claim応答不明でpending admissionが残り、その後cancelQueuedLlmが旧queued/idle行をversion CASでterminal/cancelledにする場合、intent.fencedは設定されない。resumeはsaved claimにも自分のfenced一致にも該当しないため、cancelGenerationを見てterminateCandidateへ進む。しかしcompleteLlmのnever-read枝はqueued又はresponse-readyしか受けず、既terminalを拒否する。これはDatabaseErrorではないためintent.recoverable=falseとなり、以後のwake/stopで同intentを回復できない。DBには取消確定済み・memory0・receipt旧値がある一方、process内の50MiB予約が残る。

静的再現列：通常request → bind済みclaimの未保存応答不明（A05と同じ正式claim注入）→ 通常cancelLlmRegeneration → cancelQueuedLlmのterminal/cancelled、version+1、unsent quota release確定 → stage.resume → terminal行の再終端を試みて拒否 → admission保持/recoverable=false。取消後に原本を読み直す必要はない。

期待：元opaque intent/consumer/source/旧receipt/未readに束縛した、通常取消で確定済みのterminal version fenceを正規に認識して同intentだけを解放し、元expectedVersionのlate claimExactを拒否する。terminalを再終端しない。別version一般・readのみ・replay false・CAS/commit応答不明からの推測解放は許可しない。既fenced記録のcommit応答喪失再照合と、初回no-claimだけの返却を維持する。

現A06 (`llmInputStage.integration.test.ts:243–245`) はrepository.cancelNoteによるcancelGeneration/version更新だけを行い、resume自身がterminalへCASするためこの通常即時終端との交差を通らない。既A06の範囲で通常取消のterminal fenceと同intent解放/late claim拒否を区別する必要がある。新root・DBの追加は要求しない。

## その他の静的照合

| ID/境界 | 照合結果と動的検証の限界 |
| --- | --- |
| S3-A 通常接続・M4比例 | factoryの明示leased-text、local/version1限定、candidate read → admission → exact claim Tx → storage.withOwner/read/media prepare/finish → worker closed0再読 → 既dispatch/body CASの接続を確認。既8suiteの差はinputMode/narrowingの型追従で、期待を緩めていない。Rは新app fixtureへ移され、Office/画像/PDF fakeと実text Workerを区別している。native、月30、media/undo、比例成功はこの照合では未実行。 |
| A09/A16 正式dispatch | A09はwithOwner内のstage.prepareを通し、closed0後にdispatching CAS → prepare → quota consume → intent → response → current再読 → response-ready/closedを保存する。0037:182–191のactive owner/token/runtime/fixed/dispatching/pending/cancel0/linked epoch/quota条件と整合。A16も同じphase前提を持つ。fixtureの成立を動的合格にしない。 |
| S3-B 不明claim/no-claim | memory.claimTransactionは外側provider.run完了後だけ初回bound/no-claimを返却し、unknown/no-claimは保持する。facadeのexact claimは一部write後falseを返さず、job lease更新失敗は例外/rollback。A04/A05/A17は同予定token/generationのsaved/replay false/両commit順、A06は自己terminalの応答不明を置く。F2の通常API交差は不足している。 |
| S3-B 所有/pin/execution | prepareはfinish確定までwithOwner内にあり、非closed errorは同jobのLlmObjectOwnershipUnprovenErrorへ変換する。既CoordinatedObjectStorageはその同owner errorでendWriteを保留、NodeLlmExecutionも同errorで枠を保持する。A19はclosed0保存応答喪失後の照合をgateし、pin/execution/admission/dispatch0と再照合後解放を確認する予定。実保持/終了の直接証拠は未実行。 |
| S3-C 取消/期限/現在認可 | candidateOutcomeは取消/期限をcurrent呼出しより先に判別。claimCandidateのcleanup優先とfacadeのreserve前cleanupで容量待機へ残さない。leased側currentはopaque lease/active50/owner/receipt/sourceを限定確認し、dispatch/body側の既memory0/current認可を残す。役割・OR・原本・mediaの現状態チェックを削除していない。F2の通常queued取消交差は要修正。 |
| A07 通常role失効 | slot7はWS内のaccount2 editor、slot1 account1 owner。通常changeWorkspaceMember editor→viewerはmembershipとjobs/conversion取消を同Txに保存する。fixtureはcanScope edit=false・note.version不変を確認してからnever-read cleanupを通し、復元後の旧job非再開も確認する。cleanup結果は取消との複合根拠であり、取消なしの認可失効検知の独立動的証拠とは扱わない。現在認可のコード条件は別に照合した。 |
| S3-D 前任/legacy | strict版2・leased由来・acquire時exact PID不在とrecord再読・private registry・他registry/consumer/source拒否を確認。legacy文字列の由来補完なし。pendingInputProofsからterminal/response-ready closed0保存同値を照合してからconsume/ACKする順序は保持。F1以外のこの照合は動的保証ではない。 |
| A11/A12 正式purge | synthetic lifecycleを廃止し、trashNoteInTransaction(cancelProcessing:true)の30日lifecycleとcancelNote/jobs.cancelNote → beginNotePurge → 正式purge claimを使う。notes_lifecycle_validのpurgeAfter>trashedAt、purging枝、通常version/操作IDを満たす。terminal ownerclosed/responseBudget0/quota releasedの入力だけ保持する対で、readyToDelete/finish拒否 → 正規stage.finish → ready/physical remove/completeObject/finishを確認する予定。captureが作る対象keyとarchiveJobsのgeneric job取消条件を照合した。 |
| S3-D purge/prune guard | 共通hasWritersの全4呼出でLLM/preview/machine memory/非closed receipt、machine active/unknown、sourceHeld（closed未caller/未ACK含む）を確認。pruneはterminal/owner終端/budget0/memory0/receiptNULL又はclosed/bindingNULLを要求する。A13のheld保持→proof保存後pruneは正式0043/旧pin条件と整合。これらの動的成功は未検証。 |
| S3-E 型/規約/有限資源 | application/domain製品差の外向きadapter importやambient時間/I/O追加は見つからない。明示union/portを維持。0037/0043以前・lockの差分0。app/nativeのwx新DB、正式migration、sidecar込guard、account3/WS1/slots20、A/R共有DB、native Worker6/同時1・前任自然終了子1の計画を照合。new opaque/audit/build/最終checks/全終了は未提出・未実行。過去checksは実装報告の自己申告として読み、この照合の直接成功へ加算しない。 |

ケース数を合格条件にしない。pureの14成功・旧appの部分成功は[実装報告](../phases/P5c-3-s3.md)の記載範囲に限り、三失敗のbail後のケースやDB正常close欠測を補完しない。A07改訂版は未実行で、以前のNoteRepository.saveによるowner変更仮定のpassを権限失効の根拠に使わない。

## 追加観察と返却

運用文書の「populated root is refused」はfixture全体の完全empty検証とは一致しない。createStageFixtureは既DB/原本のwx衝突とmode/容量を拒否するが、guardFiles自体は任意の既存regular fileを限度内なら通す。今回はManagerが新empty排他rootを作って固定する前提なので、この文言差をF1/F2とは別の追加観察とし、受入条件追加や差戻し理由にしない。実行資源の新割当・clone監査・buildは別途固定が必要な未検証範囲である。

本照合と報告は8分未満で終了し、途中にF1/F2と判断点をManagerへ通知した。goal/管理正本変更0、補助agent起動0、spec/spec-implement使用0。音声保留・外部実接続未許可を維持する。本報告確定後は全read/writeを停止し、製品freeze/検証所有をManagerへ返却する。

EOF
