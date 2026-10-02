# P5c-3 S3 共有契約案・独立静的レビュー

2026-10-01。固定HEAD `a013479e748fb755baf21af8f3765c888458e884`、tracked clean。対象案は133行/17,447B SHA256 `60a1238f45ef00f50e3040cd2a842cfa832121f9dc5b729f272f8b2929ddb04a`。全文EOFまで読了。S2-A–Eの正式受入と最終独立報告を基点とし、通常local text/HTML/Markdown sliceの共有差だけを確認した。製品/test/helper/DB/runtime/native/build/外部/旧private操作0、編集は本報告だけ。goal-implementの独立Verifierとして条件の出所を限定し、spec/spec-implement/goal APIを使用していない。

判定：方向は採用可能だが、実装開始前にM1–M3の契約とM4の検証資源を最小補正する必要がある。新DDLや全面的な所有基盤再設計は要求しない。Rootはレビュー中の通知で4点を必要補正として受領したが、本書は実装/新資源の許可ではない。

## 1. 採用可能な範囲

通常local/version1に限定して、既受付/quota→通常claim→input取得/準備/closed0→既dispatch/本文CASへ接続する縦切りは、R08/IN-07・IM-06と既recipe/quota/undoを保つ。Drive公開、他format新lease、音声、実外部を広げない方針は妥当。

`llmRepository.ts:539–627` は現claimでowner token/phase/response-budget/job leaseを変更する。0043:55はreceiptのruntime/tokenをconsumerと一致させ、:63はclosed0→次generation active50を許す。したがってresponse-ready再claimのowner＋receipt同Txは必須で、案のcandidate/exact分離は適切。旧closed receiptを消す、新runtimeへreceiptだけ移す、guardを緩める必要はない。

0043:33/65はOLD/NEW owner unknownのmemory減少を拒否する。前任実終了後のowner closed更新→stage closed0を同Tx内2CASとする案はSQL上成立可能であり、片方だけcommitしない正規repository対を実装時に確認する。S1のDrive-only redaction・旧結果不変、S2のproof消費前DB確定を維持する。

local能力をDrive/provider必須組から分離し、LlmServicesにlegacy-local/leased-textを明示する案も適切。Node通常factoryはleased-text、legacy fake/他formatは明示旧枝、能力欠落からの暗黙fallback0。mediaは既 `worker.ts:248` のsourceUrl/placeholder投影を保ち、prepared後のasset再照合を残す。型だけ先行した未接続kernelにはしない。

## 2. M1：前任capabilityを作れる履歴とlegacyを分離する

出所：R08/IM-06、design S2入力寿命・JSONだけで解放0、R12/CLAUDE内向きport。案§5の「旧PID消失だけのruntimeにopaque前任capability」は、正規に作られた新leased-text世代と、既欠測legacy履歴を分ける具体契約が不足する。

現 `adapters/node/llm/runtimeOwnership.ts:8–15` のrecordはpid/runtimeId/predecessors文字列だけ。:22–30はkill(pid,0)のESRCH、readRecordはregular/size/modeとschemaを検査するが、:128–132の継承は旧predecessorsへruntimeIdを加えるだけである。どの旧runtimeが新同process inputを使用できたか、どの前任終了を自分で確認したかは残らない。`worker.ts:608–685` のrecoverLlmはこの一覧全体を回復してacknowledgeする。これをそのまま新stage proofの発行元へ格上げしてはいけない。

必要最小案は、既owner recordの版付き枝に「この正規runtimeはlocal/version1 leased-textを開始可能にした」という由来を、最初の新claimより前にdurableに残すこと。opaque capabilityのconstructor/registryはNode ownership adapter内だけとし、正規acquireが検証したexact前任record/runtimeと終了確認に結び付ける。署名付き新一般store/DB列は不要。recordは既private regular/nosymlink/permissionと排他取得の境界で検証し、取得したrecordとの差替えを拒否する。将来の再起動を跨ぐ未ack履歴も、確認済み由来を失わず保持する形式を確定する。

旧record/predecessors文字列/任意receipt/proofId/booleanだけから新capabilityは発行しない。legacyから現runtimeを新方式で登録することと、旧runtimeを新方式であったと補完することを分ける。新方式で登録された世代は正規再起動で回収できるようにするが、根拠のない古い新receiptは保持・有限報告でよい。receipt NULLの既legacy orphan経路は維持し、新receipt有りへそのconsumerclosedだけの解放を流用しない。

scopeはlocal-original・fixed preparationVersion1・bindingNULL・元runtime/token/receipt/source一致に限定。proofは別registry/別runtime/別consumerへ流用不可、Office/画像のchildやDrive wireへ拡張不可。cleanupのDB確定前にownershipのackを消さず、未回収の新receipt行があるruntimeを既legacy回復だけでackしない。2CASの第2失敗/commit応答不明ではproofを保持して同値再照合する。

これは同host/PID namespaceを跨ぐ新保証の要求ではない。`docs/runtime_node.md:122–124,271–278` の「同一DB/storageのlocal単一process、移設/修復時はoperatorが全writer終了を確立、multi-host failover対象外」を明示的前提として継承する。live/reused PID・読取不能・履歴欠測で自動takeoverしない。PID不在を別host/namespace/コピーしたrecordの真正性まで証明するものと記載しない。実子1の自然終了対はこの限定された正例であり、全環境crash回復の証明ではない。

## 3. M2：初回確定no-claimと不明intent再CAS falseを分ける

出所：design S2-F1「一度boundなら結果不明を保持」、R08/IM-06の重複開始禁止、R12境界型。案§3の初回no-claim解放と§4の同intent再CASのfalse結果を同じsettleへ渡せないことを、型/状態表に明記する。

初回だけの安全な返却は、exact当該UoWがwriteなしno-claimを返し、外側commit応答が成功し、途中のpartial writeがないとfacade自身が確認した場合である。domain repositoryへcallbackや `committed:true` を渡してauthorityにせず、facadeが所有するUoW呼出し/opaque admissionと確定結果を私的に束縛する。外部boolean、callback return値単独、他registry handle、二重settleから枠を返さない。現 `hollowUnitOfWork.ts:102,218–228` はtransaction完了後にresultを返すため、この初回境界は既UoW内で実装可能。

不明intentで旧version/旧receipt0を読めても、旧write不能の証拠にはならない。元callerのPromise終了も、保存側の遅いcommitが不能になった証明ではない。回復先を次の3つに固定する。

- 予定owner/receipt/source/version等のsaved同値：元opaque intentから同一leaseへ一度だけ移行。新readの前にはcurrentを再確認する。
- 同じexpectedVersionへの同じ予定claim、又は取消/失権後のnever-read終端が実際にCAS成功しcommit確認：そのversion更新を旧writeのfenceとする。終端結果/receiptもexactに束縛する。
- 再CAS false、capacity busy、読取だけ、別version、保存例外/応答不明：保持。初回no-claim返却へ流さない。次wakeの限界内でexact saved/既確定fenceを確認するまで新read/新世代0。

特に「旧値を読む→replayが容量条件でfalse→そのTx自体は成功」にはversion fenceがない。旧遅延writeを拒否する更新が一度もなければ返却不可。再CAS成功後に元writeが遅着する順序、逆順、再CAS false、終端fence応答喪失の対を同一expectedVersionで固定する。新世代再計算・新token再発行はしない。version+1を強制する現repository.replaceと正式SQLite CASがfenceの基盤であり、一般的な分散Tx保証を追加する案ではない。

## 4. M3：初回候補の取消/失権を容量待機へしない

出所：既LLM取消/未送信返却・期限、IM-06、design current。案§4にはcommit不明後の取消先行があるが、初回candidateが既取消/失権/期限切れの場合にも必要な終端分岐を明記する。

0043:35–44はcancelGeneration=0、OR linked/epoch、active note/current版・verified本人/編集権限を0→50の条件とする。現 `llmRepository.ts:690–744` のcancelAccount/cancelNote/cancelScopeActorはcancelGeneration/versionを進めるだけ。現 `worker.ts:688–734` はclaim後processへ渡し、`current.ts:11–62` の失効エラーを `worker.ts:554–602` が終端/返却へつなぐ。S3でclaim前current失敗やSQL falseを単にqueued no-claimとすると、この後半へ到達せず、先頭候補とquotaが永久待機し得る。

最小差はcandidate結果を「容量busy/競合で無変更待機」「取得可能でatomic claim」「取消/期限/失権確定でnever-read終端」に分けること。最終枝はsource/memory0/元receiptを維持するexact版CAS、旧claimをfenceする更新、既quota/job/原本/表示結果の正規終端を同Txへ束ねる。現在編集権限をcleanupの再条件にしない。新ownerでinput50を一旦作る必要はない。旧dispatchを権威に全未送信の場合だけ返却し、response-readyに保存済response/intentがあれば再送や無条件返金をしない。取消/期限後の旧本文保持も維持する。

実装checkpoint：`currentLlmSource` は現在current/value双方のsourceMemoryBytes=0を要求する。leased-text input取得/準備前だけexact opaque lease・active50・同runtime/token/generation/sourceを検証する限定分岐を用意し、既media/OR/編集認可を再用する。dispatch/本文採用側はclosed0を維持し、memory guard全体を削除してはならない。stage cleanupは現在権限でなくexact保存所有と終了proofを検証する。finish応答不明時はinput proofだけでなくstorage.withOwner/object pin・execution枠も保守保持する既方針を実assertへ結ぶ。

## 5. purge/prune・atomic更新の実装checkpoint

案の共通hasWriters拡張は必要十分な方向。現 `purgeRepository.ts:318–364` はphase/owner/response/quota/object_writes等を見ており、独立input予約は見ない。SQL DELETE guardはDB行削除時の拒否であり、physical remove前の保全を代替しない。既呼出 `:378,454,495,578` のすべてへ同じread-only unionを適用する。NULL receiptはlegacyとして扱い、非NULL active/unknown又はmemory非0、sourceHeldはclosed未caller/未ACKも含める。unknownを期限だけで解除しない。

現llm prune `llmRepository.ts:747–777` はmemory0/bindingNULL/終端ownerを既に要求する。追加receipt条件はこの不変条件の明示でよく、履歴期間・response/recipeを変更しない。stage解放前physical remove0と、解除後正規purge/prune成功を新appDBで対にする。S1/M5のattempt→binding→record整理順は変更しない。

response-readyのowner＋次receipt＋50＋job lease/responseBudgetは一つの正式Txで更新し、一部だけ成功してfalseを返さない。旧responseは不変、再生成dispatch0。前任owner unknown→closed→stage closed0の2CAS途中失敗をrollbackし、0043のOLD unknown拒否を恒久緩和しない。これは実装時の正式小DB gateで確認でき、現時点で新DDLが必須という衝突は見つかっていない。

## 6. M4：R12と予約DBの対応を確定する

出所：R12/brief有限資源・失敗保全。案§7の既local比例8pathは名前だけでなく実integration fixtureを持つ。`llmRecoveryLifecycle.integration.test.ts:59` と `llmSourceMedia.integration.test.ts:62` はbeforeEachでcreateTestContainer＋mkdtemp、`llmPdfApplication.integration.test.ts:54` も各caseでpdfPersistenceFixtureを作る。そのままR12として通常実行すると、4logicalDB80MiB・子1等の枠と整合しない。fake parserでもDBは増える。

最小案は既8pathをinputModeの型追従に限定し、R12の現在の期待を新 `llmInputStage.integration.test.ts` /共通fixtureのappDBへ移植すること。既PDF/Office/画像native不変更は借用、R12はfake parser/generatorで通常application順を確認する。旧全suite再演を黙示許可しない。AとRは同じ新appDBを通常順で共有し、nativeは別DB、opaque/auditを含め計4DBのまま、caseごとのaccount3/WS1/note-original≤20の割当を実行前表へ固定する。失敗DBの再使用や未使用枠転用はしない。

## 7. 比例ケースの具体化案

54の数自体は受入条件ではない。既P20/A14/R12/N8は多くの必要境界を含むが、M1–M3の因果列をcase名へ割り当てる必要がある。一案はP+2/A+4の60対（P22/A18/R12/N8）。同じ条件が既caseに明示的に入るなら二重加算不要。以下の追加番号は提案であり新実行許可ではない。

| 群 | 必須にする追加又は再割当 | 期待 |
| --- | --- | --- |
| P21 | 正規new runtime由来の前任資格の保持/再読とlegacy文字列・別registryの拒否 | 新通常世代は回収可能、欠測旧行は保持。JSON/booleanだけでproof0 |
| P22 | 初回confirmed-no-claimとunknown再CAS falseの区分 | 初回だけ枠返却。不明falseは予約保持、二重/偽settleは無作用拒否 |
| A15 | 初回queued取消済み、memory0/receipt旧値 | 新50MiB予約0/read0、元job正規終端/未送信返却、次候補を塞がない |
| A16 | 初回current失権と保存済response-readyの失効 | cleanupを権限再要求で阻害0、旧response不変/再送0/消費を誤返金0。期限分岐も既pureに明示 |
| A17 | 元遅延claimと再CAS false/成功・終端fenceを両順で交差 | falseだけで解放0、fence確定後の旧write0、same savedは同lease一回 |
| A18 | 前任unknownの2CAS途中失敗/commit応答不明と再照合 | ownerだけの部分commit0、proof/ownership ack早期消費0、最終closed0後だけ旧回復へ |

既N8内にnew-record正規前任子1の終了→限定cleanup正例を置き、Workerなし自然終了の限界を記録する。host/namespace/全child crash試験を新たに要求しない。media付きHTML/MarkdownのN2/N3、prepare前abort/unknown保持、generator不明後の入力解放・消費維持、stop pending照合の既ケースを維持。fake/port対と実Worker6/同時1の観測を分け、元30秒prepare/5秒closeの期限を延ばさない。

実装予定17path＋入力mode型追従の枠で上記は表現可能。所有recordの版付き枝はruntimeOwnership/portsの既予定差内、新DB列不要。60案にした場合も新DB/原本/worker増を自動採用せず、fixture割当・有限期限に収まらなければ実行前にRootへ返す。build1/dist別256MiBと新通常接続の同candidate検証を行い、旧S2 bundleを使わない方針は妥当。

## 8. 追加観察・返却

案冒頭の「S2正式報告待ち」は既に受入済みのため文書更新対象だが、製品差戻し理由ではない。PID再利用を自動解決すること、cross-host failover、OS/RSS硬保証、全formatの新lease、全既suiteの再演は追加しない。既受入S2の失敗履歴・欠測を補完せず、S3の新証拠と分離する。

本静的レビュー中の実行/DB/private調査は0。利用者の一時停止指示を受け、新たな調査を開始せず本書を固定した。M1–M4の具体実装/正式SQL動作/60案のfixture割当・資源成立は未検証であり、S3実装は未許可・未開始。再開時は主案への反映後にManagerが採用/実装範囲と資源を確定する。これをもって文書含む全read/writeを停止し返却する。
