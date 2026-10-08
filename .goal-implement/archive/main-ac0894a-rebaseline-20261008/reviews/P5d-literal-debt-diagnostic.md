# LD01-DIAG 独立限定preflight

**PASS（診断producerと固定bindingの静的限定判定）**。Rootの次の独立precheck→default preflight→ONE actual判断へ返却できる。これはLD01/literal debt2/ACK/caller/resume/全P5dの機能合格でも実行許可でもない。新root、defaultpreflight、import、Node/Vitest/DB/key/native/runtimeは0。

確認日時: 2026-10-06T07:31:53.974653+00:00。許可されたP5d隔離tracked source／公開helper／公開safe reportだけをread-onlyで照合した。main working source、B実物、成功・失敗を含む全private root/TMP/results/keys/proofs/D01はstat/read/hash/import/copy/reuse 0。source/helper/Manager文書編集、goal/spec/spec-implement/追加agentは0。本報告はwx600で新規固定し、その後全readerを停止する。既LD01 review `1af28483fe8f4322fc23402e05ace2becb47252b9049fbae322210a86c8c5522` は変更していない。

## 固定候補と直接根拠

P5d隔離HEAD `c5f570524342359ce9c216ef62a29f5e12aa80ec`、親 `e1e07e51d0726d92b54e14dcd05adc4efcfe11cb`。Git差分は既 `accountDeletionLiteralDebt.integration.test.ts` 1path、47 insertion/1 deletion、tracked cleanを直接確認。新test12,505 B/SHA `66c6fa21f5b18c5c95461e762f499924ebfc84359224801aab0c81fc5238c7c6`、actual600/nonlink/nlink1/canonical/UID。全文source94をNOFOLLOW/stable dev/ino/size/mtime/ctimeで読み、全HEADblob/個別bytes/SHA一致、他93は親blob不変更。合計1,853,065 B、source94 manifest `55721abae3950a3515e1e686de289d51b282206bdec2abdac733ba1eae840ebb` をsorted path+SHA+LFから独立再計算して一致。

公開phase20,121 B / SHA `c82c51507c2fd3db5a36e7ce6024fbdf6c747d3caacadffab74feb6b38946384`、proposal6,316 B / `fb0ff63759c99854778ed8a96a118f516dc19053333e54ed4804eace2475184b`、safe actual report3,920 B / `f8489dd5449c98549e7661a9907892dfb8e0e2947c7e0a3ec8c50f0098383f71` を公開600/nonlink/nlink1/canonical/stable metadata/fullhashで直接確認。safe actualはRootの借用結果であり、旧private実物を再読していない。

runner25,898 B / SHA `4a06f2f50772bb9af12d2814e52daae722b87d759f9637230eb32b9a1a246032` とloader24,600 B / `9d6103dfd8e8b2c52ea039dfe466adc9eccefd5f3941b276f7138c264d90723a` を全文stable read/hash、600/nonlink/nlink1/canonical/UIDで確認。runnerはPython AST parseだけ直接実施し、helper実行/compile importは0。own whole typecheck/lint:fix/format成功と既lint347 warning/61 info/unsafe0、loader syntax成功は担当報告借用。

## 差分とfail-closed

- testの13 unified hunksを現在全文へ逆適用して、親11,219 B/SHA `4f7f4df2cf30c9f32824ff18665698437344337dc2ed86ff978cb0764c8ac79d` とfullbytes一致を直接確認。差は16-key union/one-frame flag、元beforeEachのofficial onTestFailed observer置換、checkpoint/resetの固定代入だけ。元API/this/args/assertion/await/body/finally/gates/40秒制約を変えていない。checkpoint代入16＋failureFrameSent reset1の17 reset/marker差で、entry初期値と各groupのenteredを示す。
- observerは元f.failを最初に呼び、同caseに最大1 frameだけ固定event=case-failure/case=LD01/checkpointをstdoutへ書く。error/getter/message/stack/cause/SQL/path/id/proof/expected/actualを読まない。元errorはVitestが保持し、外catch/rethrowへ置換していない。同期write throwはこのobserver内だけでcatchして再度f.failし、元case失敗を残す。beforeAll失敗に架空checkpointを補わない。
- loader既24-key schemaは新16-key subsetを受け付け、exact3keys/LD01/max1を要求する。caseFailureはfile/case/unhandled/fixture/normal gateを永久拒否する。runnerもstrict frameを検査し、denial/diagnostic/case-failureのいずれかでnormal/audit不可。async stdout failure又は欠測でcase失敗を正常に補完する枝はない。fixture failed flagは既afterAllの正常checkpoint/fixture-closedを抑止する。診断write成功は閉鎖証拠ではない。
- runnerのROOT/report path/MANIFEST_SHAの3literalをメモリ逆置換し、旧25,876 B/SHA `48f54648fbadd39a9a4dc3106ecf78558b5688a3dd50879023a41827469a201d` 全文一致を確認。loaderは旧fullSHA同値、変更0。新memory root `goal-implement-p5d-literal-diagnostic-20261006-54b3ca27` と派生tool-tmpだけがbinding差で、存在確認/probe/createはしていない。

## 継承・未観測

元LD01 preflightのstockfork1/cacheFsfalse/Node24.18 binding/PG三値・leader後有限TERM10/KILL10/PIPE10、2PIPE EOFと独立FD close receipt、normal actualfixture/client close→sameDB read-only audit、persistent failure/denyはfullinverseから不変更を継承。DB1≤32MiB、sidecars込み合計64MiB、root192MiB/TMP8MiB/output2MiB/frames40、case-hook40/body180/outer240/200ms、account1/attempt3/native callers2/64wakes、exact Drive/storage owner FS grantsとsynthetic32B keyの上限を拡張しない。追加frameは既3field/max1の範囲で、FS/FD/ネット/native permissionを追加していない。

旧ONEのAssertionError、actualNode1、PG/PIPE終了、normalPipeCloseReceipt=NULL、audit=NULL/heldはRoot safe reportの借用として保持する。checkpoint producerが旧testに無かったことは静的に確定するが、実際の失敗predicate/native/owner/receipt causeはUNKNOWNのまま。entered checkpointからassertion成功、genuine native proof、ACK、debt2、finally完全終了を推論しない。前提API・proof・callback継続・業務期待を修正するcandidateではなく、観測の最小差である。

結論: 判明した起動blocker／元error置換／normal弱化なし。今回の静的scopeはPASS、LD01 actual・全P5d完成は未成立。次実行はRootが固定scopeの一巡を別採用した場合だけ。全read STOP。
