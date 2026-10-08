# C1 SOURCE CODE independent review

判定: **限定 SOURCE CODE PASS**。固定候補に対する今回の比例レビューでは、採用済み capture/reentry/owner寿命/停止契約に結び付く確定した重大欠陥を検出しなかった。これは候補コードを次の有限検証設計へ渡す判定であり、C1機能、genuine proof/ACK、DB応答不明、native閉鎖、S5-F又は通常Drive UIの受入ではない。テスト・import・runtime・default/preflight・DB・browser・root生成/probeは全て0。全読取を停止した。

## 固定入力と独立性

- PUBLIC phase `phases/P5c-3-drive-llm-c1-candidate.md`: 173423 B / SHA256 `d1c16e3a17f14e4a3216fafcbdefa5cbbcc03364e13976c993a3c137863b6810`、regular600/nonlink/nlink1/selfUID、NOFOLLOW全文と前後FD/path metadataの安定を直接確認。compressed一行は表示しない。
- SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-p5c-drive-machine-721bc7ad-20261006`: HEAD `8edbbac7c342353adf9949b8c5e6ccc2ba2aee34`、parent `176ea15b572c610e97f99a021ea94e2ba60637c7`。直接Git比較は正規PUBLIC SOURCEだけ。
- bounded memory decodeの6列manifestは282565 B / SHA256 `1a57de0c7e91a136e377773dc64fa8d47ba7ef82ce2aa5e125382099e1eac97f`。1477 rowsをtracked stage0/path/mode/blobへ直接照合し、1476 regular /21350117 BをNOFOLLOW/stable全文SHA/Git blobで確認した。actual600、唯一provision Git100755/actual700、AGENTSだけCLAUDE.mdへの内部canonical link。pair compact tuples `[path,bytes,SHA256]` は `f1d849538f5b50b26364c0cf8bfb1ad3f94c44ddc407b060ce3cf2ca86f98760`。未知physical entryの不存在は主張しない。
- changed15はphaseの12SOURCE+3testsと一致。outside15 tracked差分0、tracked clean。parentの既受入C0/機械/DDL/codec/factory/storage portsを新実装の実証へ転用しない。
- ReviewerはP1方向文書の作者だが、この新SOURCE15の実装と候補checksには参加していない。今回CODE判定は独立である。旧capture/reentry方向と既C0局所論理結果は借用、文書static PASSをCODE PASSの代替にしていない。
- 正規whole3の最終exit0、PUBLIC108/83 package binding/CF/shimsは作者の固定報告と先行正本を借用。再実行・PUBLIC全再走査0。current SOURCEのfull guardと必要依存の本文は直接確認。
- criteria `P5c-3-S5.md`: 6285 B / SHA256 `fc37135e92fbff63fd8de9a40357efbbdb6641bb65555a8946b22179c115e3f0`。S5-A–Fの全状態はこのレビューで変更しない。

## 個別CODE判定

| 対象 | 限定判定 | 直接SOURCE根拠 |
| --- | --- | --- |
| 同Tx受付/command/Original/quota | PASS | application/llm/driveRequest.ts:47–196 は verified actor/edit/note版、HTML/Markdown50MiB、利用可能Drive record/subject、本人OpenRouter epoch/expiryを確認。同UoWでbinding/batch/generic jobを作りadmitLlmへ渡す。request.ts:29–76,114–145,217–264の元recipe/queue/Original/quota更新を再用。machine commandとの衝突・同command異値を拒否し、同値receiptを返す。local requestのdigest式request.ts:283は元bytesのまま。Drive retryはrequest.ts:475でlocal経路へ流れる前に拒否。 |
| non-PDF codec/generation/current | PASS | conversion preparation1/prompt1、pdfProof/sourceOwnershipGeneration nullを維持。sourceBindingSchemaのownershipGenerationはpositive。regeneration/current.ts:184–198,238–249 は同binding consumer/executor/note/Original/fingerprintから正規generationを取得。llm/current.ts:76–105 がそれをDrive current/binding cancellation/metadata/subject/epoch、note sourceGeneration/revision head/generic tokenと照合。nullをgeneration wildcardとして使わない。 |
| shared DI/required ACK | PASS | server.node.ts:270–325,491–512 は元共有regenerationを一度構築し、同NodeDrive provider/Drive/execution/storage参照をC0とC1へ渡す。createNodeLlmはsourceMode discriminantを完全pairで構成。regenerationServices:242–274がrequired confirmSourceAcknowledgedを確認し、欠けるpairを正常化しない。新Drive/proof factoryなし。 |
| 一回のwithOwnerと入力寿命 | PASS | worker.ts:98–122のDrive専用outer withOwnerがprocessOwned全体をawait。Drive prepareは249–250で既nested local/PDF owner枝を通らず、dispatch/body/projection/finalize/commitのawaitまで同callbackを保持。input.ts:828–929が同leaseと原finish proof参照を保持し、原finalCheck/void source ACK/save-readを通してmemory.consumed(proof,sameLease)/同savedreceipt/runtime/token/attemptReleasedを要求する。fake boolean/clone/private brand又は新pin-release APIなし。 |
| FIRSTWRITE前の六captureと原更新順 | PASS | worker.ts:593 beforeWriteはcommitNoteより前。failure:694はdispatch.failより前。success:646–649/failure:706–714の元complete点でnow1、同Date/outcome/argsをrecorderとcompleteLlmへ渡す。inputStage.ts:236–280がLLM/generic/dispatch/quota/Original/bindingを同Txでコピーし、Dateをepochへ変換。terminal snapshot:298–319はfail後/scrub前のdispatch/quota。unknown ownershipとfailed DELIVERY_UNKNOWNはdriveLlmOutcomeで拒否。local/PDFはrecorderなしの元順。 |
| saved terminal/read-confirm | PASS | input.ts:1034–1065 は同proof/sameLeaseのconsumeを前提に正規read-only UoWでsavedを取得。inputStage.ts:328–393はcall base.version+1/outcome/clock/closed owner/response0、generic leaseclear、response→scrub、quota sent/released条件、immutable bindingをexact比較する。llmRepository.replace:450–474/scrub:1052–1063/releaseUnsent:1152–1201の元更新と一致。saved terminal時は同commit Promiseだけresolveし、body/project/write/ACK/consume/callbackを再演しない。Originalは六rollback照合に含め、terminal後に新current許可を取り直して保存済bodyを再採用しない。 |
| invocation/reentry/unknown保持 | PASS | input.ts:963–1065 は一原UoW invocationにつき新record。記録後の6prewrite exact一致だけでそのattemptを外し、同work callbackを次原Txで再呼出。unknown/mismatch/readerrorはexpected変更・clock更新・無条件再入0。FIRSTWRITE前のknown closed current拒否だけを原callbackへ通知し、workerの別failure invocationへ渡す。record前write/capture不明は固定reentry:79のunrecorded-heldであり、terminal-callを後付けしない。 |
| recover-only停止 | PASS | node/llm/runner.ts:10–94 は既timer1/2000ms+元microtaskのみ。stopDriveは同cached Promise、同execution.stop待機中もwake/recover-onlyを継続、late pendingをrecoverDriveCompletionsへ渡す。sweepLlm:881–918は既owned cancel/current確認の後admit=falseでreturn、new claim/resume/generate/PDF preview/pruneをしない。原maintenance errorはsticky reject、known currentは元workへ通知。原execution finally/withOwner finallyを直接偽終了しない。server quiesceはcaller停止とDrive queue/http quiesceのallSettledを維持し、失敗後にfinalDrive stopへ進まない。 |
| local/PDF/legacy共有意味 | PASS（差分限定） | parentdiffでlocal digest/recipe、既local/PDF準備・classify/redraw所有/preview/pruneの枝を保持。新capture/Drive coordinatorはleasedDrive判定内、non-Driveには既work順。原legacy retryのDrive誤入口だけ拒否。既local/PDFのactual結果を再演・再受入しない。 |

ここでいうPASSは、今回の固定型・静的制御順・元repository契約が一致したことを示す。ネイティブ資源が閉じた、同proofが実際に保存/ACK/consumeされた、callbackが自然終了したというactual receiptではない。

## SOURCE境界、準備tests、残条件

driveRequest.test.tsはcommand以外の同intentとrecord/note版/epoch/model/instruction異値を検査する。inputStage.test.tsの新4casesは6領域rollbackとfail後quota分離、wrong version/outcome/clock、immutable bindingと後続cancelの区別、unknown failure排除を検査するdata-only正負対。driveRegeneration.integration.test.tsの新2casesはsameTx logical admission/同recipe codec/shared DI/cross-kind command/retry/cancel generation fenceを検査する。fake provider/profileはこのlogical受付だけのstubであり、genuine finish proof/ACK/native閉鎖の正例として扱わない。全tests未実行。

同原withOwner/deferredの自然終端、same proofに対するfinish-saveとterminal Txのcommit応答不明、full6rollback再入→次known current拒否→failure別invocation、stop中late pending/recovery errorはSOURCE経路を確認したが直接runtime根拠はない。現3testにはこのcoordinatorの実private continuation/stop正例はない。次の有限検証計画でこれらを必要条件へ対応させることが残務であり、本レビューで新case/run/helper/rootを採用しない。旧runtime proofとlegacy/unknown birthをこのsame-runtime pendingから完了扱いにしない。

候補はdrivePending2、各同callback terminal invocations最大2で、2回exactrollback後はheld。記録途中不明/unknown phase/read不一致はheldであり、timeout/cancel/absenceでresolveしない。これは安全なSOURCE制限であるが、任意回数DB障害の後にも収束する一般保証ではない。原known current拒否は別failure callbackで独立recordを持つ。無限retry・取消時の原成功body再採用・expectedの観測値rebasingはない。

pending個数と最大2 invocationは保持heapの総bytes上限を確定しない。body/projection/media/原error/同proof参照、prepared/response/snapshotの保持と複製分がある。phaseが明記する50MiB読取/1MiB segments/1MiB dispatch content/8KiB指示/2MiB parser responseだけからaggregate holdingを作らない。actual familyのprivate holding/case/native/DB/root/cap予算は未確定で、候補SOURCE PASSを実行許可にしない。

現LLM Driver/native/providerのunknownや、正規domain final-check errorをclosed proofだけで普通のbusiness successへ変換しない。所定capture未成立、partial/mismatched row、別runtime/token/g/consumer、wrong receipt/proof、未consume、unknown source/ACK/read/nativeは保留。個別proof/rawrow/派生counts/physicalFD結果は未観測。C1通常UI、browser、OpenRouter/Google実接続、P5d/current統合、main統合/build、全S5-A–Fはこの候補から完了にしない。

## 正式依存の直接読取

変更15は全manifest SHA/blobを直接読取済み。predicateと元保存規則の照合で追加したknown manifest依存は次のとおり。各≤64KiB、SOURCE600/nonlink/nlink1/selfUID、前後stableFD/pathとfullSHA/Gitblob一致で読取を閉じた。

- `packages/core/src/application/llm/completion.ts`: 3105 B / SHA256 `47f05252131da3f64705885c7c71a57a2c83e2fdf65dfb8e5505c4f547574e08` / Git blob `0d9611438d32fe35180b68ba21445251248c3e4c`.
- `packages/core/src/application/regeneration/memory.ts`: 3281 B / SHA256 `914ef68f217941417472d4d21730286f132a44cda31b7558bcab2ab56ecbe23e` / Git blob `602758743d6810b42fb5e30515c5533595f08a6c`.
- `packages/core/src/adapters/libsql/repositories/llmRepository.ts`: 39043 B / SHA256 `13335b88bc15effd4a19e22790e103e966a33f5c7849cb1f29eac5606fd75b62` / Git blob `839a60bbf395604abad78dcf03e90c1f31df56b7`.
- `packages/core/src/domain/llm/entity.ts`: 7524 B / SHA256 `29fc41d9f9e7f66724547cfc7de61726f45752c006ca184326e28993e155c8fd` / Git blob `54e930cabbcbb4e8efc1647968c5187dc3ad4301`.
- `packages/core/src/domain/regeneration/source.ts`: 3296 B / SHA256 `65704cc89ec4c57e6a72f6c39873fa46dd3fc25d81c69ac7c5065da2cff496c0` / Git blob `42de64a82c5f19002b3a072a52d6dc3e54880a6b`.
- `packages/core/src/adapters/libsql/repositories/importRepository.ts`: 8074 B / SHA256 `94b7cb423bf31d077ca5448dbca97e5f279f080a424dfcfbbe6b971dbe5200c0` / Git blob `b5a7710fe10d55fc67b40ccb1c7d35a4decb585a`.
- `packages/core/src/domain/import/entity.ts`: 3921 B / SHA256 `727534315f86b400a6f927d40aa0dd5d2b8d6a61e37631e70609e0212446bc86` / Git blob `8c9bf3f749f9e7d6322f3604a8d0a7b7f6808bb7`.
- `packages/core/src/adapters/libsql/repositories/jobRepository.ts`: 5091 B / SHA256 `7b7fc3f4099031af44e9154df41b7416e0de372952d9b715b21e9244335e6b51` / Git blob `ac123444bb941a466fb34710f30bca329376baa3`.
- `packages/core/src/application/regeneration/source.ts`: 10359 B / SHA256 `3340c3080cff87dd9c0abdbd7ec9285e3ab91be826627462351db62d29965cc4` / Git blob `ea3da61313a296d61b13e59f20b5f66622aaed16`.
- `packages/core/src/application/regeneration/services.ts`: 9713 B / SHA256 `657b34347525567295cd4ab5e85a136881a646aace734ea011882fbd9294d561` / Git blob `85bf4fe1d2ba2ef6437adbf992a8aa170ecc05a4`.
- `packages/core/src/domain/regeneration/entity.ts`: 6214 B / SHA256 `e8302bbfc23d4d9baebd704466e00c2ba13629f721de366d2a720668d128af79` / Git blob `ba2a056fbce432d46dbfca925bb63b12993fecf0`.

固定capture/reentry文書は方向を借用し、reentry15711B/SHA4ae0ba74b4f16944437e57f100fdba2bddc8b12db44efc3d2bd1685cabebb019の必要遷移を直接限定照合した。未知source探索/全PUBLIC再walk/private読取0。コード・helper・Manager台帳の編集0。今回新reviewだけをwx600で保存し、全読取停止。
