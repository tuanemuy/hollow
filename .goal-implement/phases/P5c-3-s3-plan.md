# P5c-3 S3：通常local text LLMへのinput stage接続案

2026-10-01。固定候補 `a013479e748fb755baf21af8f3765c888458e884` の公開sourceを照合した静的提案。S2独立は残35成功の通知を受けたが正式報告確定待ち。製品/test/helper/DDL/runtime/DB/HTTP/worker/build変更・実行0。本書だけを更新した。以下の共有差・資源はRoot採用前であり、実装許可ではない。

## 1. 一つの完成像

既local text/HTML/Markdown・固定preparationVersion1のLLMについて、通常受付→quota予約→通常runner claim→原本取得→実text準備→input closed/0確定→既generator/dispatch→本文版CASを接続する。月30回・segment非加算・取消/未送信返金・既期限・media placeholder・undoは維持。入力終了はconsumer業務完了ではなく、owner activeのままdispatchへ進む。

Drive正規受付/UI、PDF/preview新lease、Office/画像新lease、machine/common body resolver、全format再生成、実Google/OpenRouter/mail、音声、退会本体は提供しない。旧local PDF/preview/Office/画像は既経路を継続。M4の全fence・影響確認・purge接続前にDrive原本からの通常再生成を公開しない。S2隔離契約成功を通常機能成功へ移さない。

## 2. sourceから確定した制約

- `application/llm/worker.ts` はclaim後execution.start、process catchが通常failure/返金又はunknownへ終端させる。入力容量不足をこのcatchへ投げる単純接続は不可。
- `llmRepository.ts:539–627` のclaimはqueued/idle又はresponse-ready/closedからowner tokenを更新する。0043はreceiptとconsumerのruntime/token一致を要求する。closed/0 receiptを残したままownerだけを更新する再claimは不可。owner＋次generation active receipt/50の同Tx更新で解く。
- S2のDB前排他は成立するが、bound結果不明の通常pump向け回復は未提供。F1保守保持を削らず、既所有opaque intentだけの照合と安全終端を本段で接続する。
- NodeRegenerationInput/Memory.prepareTextは既workerのmedia投影を渡さない。version1のsourceUrl/placeholderを保持する限定引数が必要。
- purgeRepository.hasWritersはphase/owner/response/quotaを見るが、source memoryの独立保持を明示していない。SQL DELETE拒否だけでphysical remove前の保全を代替しない。

## 3. claim：DB前の枠不足はqueued待機

repositoryに `claimCandidate(now)` と `claimExact(candidateVersion, owner, optionalInputReceipt, now)` を追加する。候補は現claimと同じ順序・global/account/response-budget条件の先頭1件。exact側で全条件を再確認し、別候補へのfallback0。旧claimは隔離呼出互換用に残し、通常sweepはexact経路へ統一。domain portにcallbackやNode依存を入れない。

1. 同UoW内で候補を取得。local/version1固定textなら同期tryReserveBeginでreserved/busyを型区分。不正identityは既error。busyならclaim/write0で正常Tx終了、queued/response-ready/quota/job attempt不変。次の既2秒pumpで待機し、新queue/table/timer群なし。旧formatにはinput予約を要求しない。
2. exact候補version・旧receipt/0・予定runtime/token・次generationをbindし、claimExactがowner/phase/response-budget/job leaseとactive receipt/50を同Tx保存。current編集権限/OR epoch/既quotaを確認、Tx内でFD/worker/HTTP待機0。
3. UoW確定成功＋claim成立後だけadmission→lease→execution.start。quota再予約なし。start拒否時はread0で正規finishし、既未送信終端へ。source容量競合をclaim成功と称さない。
4. UoW確定成功＋claimExact=falseは予約/owner更新なしのno-claim。bind済みでも枠を戻す。false後にjob等を更新しない。partial writeなら例外でTx全体を戻し結果不明側へ。callback内falseだけでは解放せず、外側commit応答成功が必須。
5. SQL合算容量は同Txで明示照合し、不足はno-claim。例外名だけでno-claimにしない。max2/100MiBはadmission/lease/未消費proof/不明intentを合算する。busyのためだけに失敗・返金・再受付を作らない。

限定port差はtyped busy、確定no-claim settle、同intent再照合。facadeが自分でawaitしたUoWの確定結果だけをsettleへ渡し、外部JSON/booleanを終了証拠として受けない。偽handle/他registry/二重settle/commit済み/unknownをno-claimとして解放する呼出は拒否。成功確定したwrite未到達とcommit不明を同一stateにしない。

## 4. bound/commit不明の有限回復

Node facadeが最大2件のpendingを保持する。opaque admission、exact consumer/source/旧receipt/旧version、予定owner/receipt、元claim呼出終了を束縛。期限は元consumer deadline、枠は元100MiB内。新recovery store/新commandなし。限定再照合の対象は既保存エラー契約のみ、domain/programming例外は成功へ変換しない。

| state/証拠 | 操作 | 解放/実I/O |
| --- | --- | --- |
| reserved・bind未到達 | 既holdBegin | 枠返却、write/read0 |
| bound・UoW成功/no-claim | 確定no-claim settle | 枠返却、旧proof不変 |
| bound・commit応答不明 | 同opaque intent保持 | 新read/次generation0 |
| 予定owner/receipt active50・source等完全同値 | 同intentをleaseへ。current再確認後だけread | 新予約0。取消/失権ならread0でfinish→元job終端 |
| exact旧version/旧receipt0のまま | 元caller終了後、同旧versionを条件に**同じ予定claim/receipt**を再CAS | 読取だけでrollback推定しない。次generation再計算0 |
| 上記旧行だが取消/期限/失権先行 | 正規未送信終端をversion CAS確定、旧claim expectedVersionを失効 | source/binding不変・memory0・never-read証拠後だけ返却 |
| 別世代/別owner/非同値・読取失敗・CAS不明 | 保守保持/finite通知 | 推測解放/新read0 |
| finishのclosed0応答不明 | 既opaque proofのexact同値再照合 | consume確定前の新begin/dispatch0 |

bound後の再CAS/終端もUoW成功が必要。古いwriteが後で成立しないことはversion fenceと元caller終了で扱う。cleanupはinputConsumerのexact所有/source/receiptで行い、currentInputの現在編集権限を要求しない。取得/本文採用には必ずcurrentを要求する。取消確定後のcleanupまで失権で阻害しない。

既2秒pump内でpending最大2を各1回照合してから新claim。1intent/1wakeにつきread Tx1＋必要なCAS Tx1まで、再帰retry0。DB回復・exact同値成立時には同intentを閉じる。元deadline以後は新read0でcleanupだけ。継続DB障害/実close未証明まで必ず回復とはしない。stopは新claim停止→実進行中abort/close→pending最終照合1回、未証明なら正常stopを偽らない。

## 5. local能力・buffer・前任

RegenerationServicesは共通input/localと、Drive/provider必須の組を分離する。構造union `Common & ({drive:Drive;provider:Provider}|{drive?:never;provider?:never})` を推奨し、既Drive構成のshapeを維持する。Drive branchだけnarrow、local-onlyからDrive accessへ入れば提供前拒否。LlmServicesは明示legacy-local/leased-textの判別unionとし、leased側stage必須。Node factoryはleased-text、既test fakeはlegacy-localを明示。capability欠落を暗黙legacy fallbackにしない。

version1のstorage.withOwnerはread→current再確認→media付きprepare→実worker exit/両pipe→input参照破棄→finish確定までを包む。message/prepare結果だけでcloseにしない。その後に既dispatchへ進み、final current/bodyCAS/既mediaを維持。response-ready再finalizeも同じclaim/input経路で新ownerと次receiptを原子的に保存し、既responseを再送しない。

read後prepare前abort用に限定discardUnreadInput(lease)を提案。実read終了後の自分のbytes参照だけを破棄し、reading/busy/unknown中は拒否→正規finish proof。signal.abortedを実終了証拠にしない。準備closed=true失敗もfinish先行、unknownは既execution枠/object pin/input枠を保持する。取得/workerが終わっていない状態を期限だけで解放しない。

再起動の既recoverLlmを未接続のまま公開しない。NodeLlmRuntimeOwnershipが既自己owner recordの旧PID消失を確定したruntimeにだけopaqueな前任終了capabilityを発行する限定案を追加する。text Worker thread/local FDは同Node process内なのでこの境界だけに適用。JSON receipt/proofId/predecessors文字列配列のみでは発行しない。PID再利用で消失未確認なら拒否、未知kill0。

前任cleanupはlocal/version1/bindingNULL限定。元runtime/token/receipt固定、実前任proof→owner closed→stage closed0を同Txの正規CASで確定後に既response-ready/terminal回復へ。owner unknownからは必要なowner closed更新とstage終了を同Txの2CASに分け、0043のOLD unknownからmemory減少拒否を緩めない。新runtimeへreceiptだけ移植0、所有acknowledgeはDB確定後。別processを使うOffice/画像やDrive wireへこのproofを拡張しない。このcapability追加はRoot採用判断点であり未実装。

## 6. 取消/影響確認/purgeの全到達

| 入口 | 既到達と必要差 |
| --- | --- |
| LLM手動取消/期限 | queued未開始終端維持。claim後cancelGeneration/abort→input実終了/finish→既complete。input不明のまま返金/owner closedへ進めない |
| OR解除/成功relink | cancelAccount維持。旧資格で新dispatch0。normal refresh/失敗relinkは取消にしない |
| trash/一括trash | note/trashのcancelNote、batch同usecase。復元で取消stage再開0 |
| move/所有変更/WS失権・脱退・削除 | note version/ownership/current又はcancelScopeActor/cancelNote→既sweep abort。既影響件数/fingerprint維持、LLM job二重加算0 |
| 手動/期限/WS purge | beginNotePurge/beginWorkspaceNotePurge→cancelNote。共通hasWritersをcapture/readyToDelete/completeObject/finishの全既呼出で使い、input保持中physical remove0 |
| 90日prune/前任 | memory0/bindingNULL/owner終端にreceipt安全状態を併記、held DELETE0。前任は§5proof後だけ |

hasWritersはLLM/preview/machineのmemory非0・input receipt未closed、sourceHeld、machine実ownerのread-only unionで保全する案。これら未提供機能を業務受付へ公開する変更ではない。redaction/attempt→binding→recordのS1/M5順序不変。既入口の取消fence不足が具体的に判明したらexactpathをRootへ返し、無断で広域hookを増やさない。

PDFは既分類/各頁の逐次readを変更せず、後段で同consumer leaseに接続。previewはclassifier/input実終了→closed0確定→ready保存で5分待機前解放、quota0/期限不変。Office/PDFの256+16+4MiB Worker、画像/頁child/native/copyの既予算は維持し、textの576MiB概算を全形式RSS保証に転用しない。M4未接続のDrive正規受付/UIは非提供を維持する。

## 7. Exact変更予定

製品17path。以下はpackages/core/src/相対、新規は明記。

| path | 差分 |
| --- | --- |
| domain/llm/repositories.ts | candidate/exact claim型 |
| application/llm/services.ts | legacy/leased-text union |
| application/llm/ports.ts | local stage/前任終了capability |
| application/llm/worker.ts | claim/prepare/finish/取消/recover |
| application/llm/inputStage.ts（新規） | 同intent照合/cleanup限定orchestration |
| application/regeneration/services.ts | local能力/busy/settle/discard/media |
| application/regeneration/memory.ts | 正規admission/finish接続 |
| application/regeneration/source.ts | local/Drive narrow、取得契約不変 |
| application/regeneration/current.ts | exact保存snapshot/versionの投影 |
| adapters/node/regeneration/input.ts | 最大2pending/既proof所有facade |
| adapters/node/regeneration/memory.ts | admission状態/discard/media保持 |
| adapters/node/llm/config.ts | local-only構成/registry |
| adapters/node/llm/runner.ts | wake照合/stop順 |
| adapters/node/llm/runtimeOwnership.ts | text同process限定opaque前任proof |
| adapters/libsql/repositories/llmRepository.ts | atomic exact claim/prune |
| adapters/libsql/repositories/purgeRepository.ts | physical guard union |
| application/llm/current.ts | 既current/media投影維持の接続だけ |

server.node.tsはfactory/runner署名維持で変更不要。0043以前/lock/設定/新DDL変更0を提案。既SQLでatomic claim/cleanupが成立しなければguardを緩めず一点を返す。

test予定8path: application/llm/inputStage.test.ts（新規）、application/regeneration/{memory,source}.test.ts、adapters/node/regeneration/input.test.ts、adapters/node/llm/runtimeOwnership.test.ts、adapters/libsql/__tests__/llmInputStage.integration.test.ts（新規）、同llmInputStageFixtures.ts（新規）、同llmInputStageNative.integration.test.ts（新規）。
inputMode明示の既fixture機械追従と比例test8path: 同__tests__のllmRecoveryLifecycle.integration.test.ts、llmControl.integration.test.ts、llmFlow.integration.test.ts、llmSourceMedia.integration.test.ts、llmPdfApplication.integration.test.ts、llmDocument.integration.test.ts、llmImage.integration.test.ts、llmIdentity.integration.test.ts。追加型追従pathは判明時に編集前通知。既期待/scope不変更。

## 8. 固定case列と有限資源

一意54対を提案。旧S2の受入根拠は正式独立報告の範囲だけ借用し、主137/独立予定94を無差別に再演しない。内部assertion/重複成功を加算しない。

| 群 | 対数 | 直接条件 |
| --- | ---: | --- |
| P pure | 20 | busy/no-claim/commit不明、sameconsumer/global2、偽/二重settle、saved/未保存同intent、取消/失権cleanup、読取失敗、finish不明dispatch0、世代差、discard reading/busy/unknown、media/local能力、前任偽proof/legacy互換 |
| A 同一appDB | 14 | queued busy不変、parallel claim1、no-claim返却、saved/未保存commit不明、取消先行/失権終端、closed receipt再claim、response再送0、held purge拒否、解放後purge、90日prune保持、legacyNULL互換、前任限定CAS |
| R 既local比例 | 12 | PDF preview quota0・ready期限・consume各1、PDF pending・page・finalCAS各1、Office recipe・limit各1、画像recipe・raster limit各1、media1、undo/OR current1。通常順のport/fake対として実native全再演と区別 |
| N 同一nativeDB | 8 | text/HTML/Markdown本文CAS各1、準備中取消1、prepare失敗1、入力終了後generator不明1、read後prepare前abort1、stop pending照合1 |

W1 text正常、W2 HTML＋media、W3 Markdown＋media、W4開始後取消、W5不正UTF8等既失敗境界、W6正常prepare後generator不明の実text Worker計6/同時1。最後のN2対はworker0。前任Node子1（Workerなし、正規runtime record生成→自然終了）で実process消失capabilityと合成旧行cleanupを確認。Worker付きcrash全回復の実証とはしない。未知PID/追加kill0。

新0700root192MiB、正式新空0043 app/native各32MiB、停止native opaque8MiB→audit8MiBの計4logicalDB80MiB。writer/testworker各1、自己account3/WS1/note-original最大20、原本8MiB（1file最大1MiB）、helper/log8MiB/NodeTMP8MiB/material256KiB、新AES2本64B以内。runtime recordはmaterial内。停止writer/FD確認後だけcopy、opaque非接続/audit query_only、失敗物非再利用・追加DB反復0、秘密/DBhash0。

generator/profileはin-memory契約、HTTP/外部/Chrome/appboot0。正式migrationは新2DB、旧DDL不変更のためbaseline/rollback3再演なし。text prepare既30秒/close5秒、既業務deadline延長0。pure case2/群60/外90秒、app case10/群120/外180秒、比例case10/群180/外240秒、native case40/群300/外360秒、前任子5/外15秒、stop60/子pipe10秒。tool wait50秒以下。timeout/terminate/自然exit/pipe/FD/DB/worker exitを別観測。未使用枠を失敗retryに転用しない。

規定typecheck→lint:fix→format→54比例→build1→posttype、dist別256MiB。public source/旧DDL/lock/新dist/entry固定。旧S2 distは未搭載なので新通常接続の根拠へ流用しない。主candidate/report/全終了後にRootが独立委譲。見込6–10時間、15分で具体進捗/障害/次手。

## 9. 採用判断点と停止

追加共有差は、candidate/exact claim＋receipt同Tx、確定no-claim/不明の区分と同intent回復、local能力/media/discard、text同process前任capability、physical purge前の入力保持union。新DDL/一般recovery frameworkは提案しない。Root採用前の実装0。

前案のclaim後枠待機は、closed receipt再claim制約によりDB前busy→既queued待機へ具体化した。不明beginを恒久保持のまま通常公開せず、同intent継続/安全cleanupまでをこのsliceに含める。一方、継続DB障害/実close不明まで無条件解放する仕様は作らない。新Drive/他formatのM4・予算・ready解放は依存残である。

本書のEOF確認後、文書を含む全read/writeを停止する。製品freeze/独立所有には干渉していない。

EOF
