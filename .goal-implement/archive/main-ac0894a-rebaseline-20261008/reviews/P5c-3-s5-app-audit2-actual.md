# S5 APP7 audit2 — independent local actual review

判定: **APP7 assertions＋元readonly auditの局所 PASS。** Rootのsole actualから公開選択投影を借用し、固定PUBLIC helperとexact APP testの静的条件へ照合した。APP familyのこの一巡はheldfalse/normal監督・audit成立の範囲で整合する。全S5 A–F、genuine parser/nativeSourceProof/private ACK、final current/source race、atomic refs/resource undo、Native/D1、factory/presentation/Drive UI完成へ昇格しない。

Verifierはmachine/product/testsのauthorではない。実行を再現せず、actual DB/proofs/results/logsを開いていない。レビュー固定後ALL reader/writer/runtime STOP。

## Direct PUBLIC bindings and borrowed prechecks

| Direct PUBLIC target | bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-3-s5-app-audit2-actual.md | 4465 | 8bbff7727840a32c47be5653971797859cc5a132c6afc0036dd20178c204e694 |
| helpers/p5c-s5-test-runner.py | 289795 | 7fa7fe9818524fcbc58aa1becc1038a193a1a999b127e44ffc98c3f13b29516c |
| helpers/p5c-s5-test-config.mts | 389705 | eaa3eb9cf1547dbcc8334e25b78563d06ff2886cf8ecfb79acc029dad3f1acb2 |
| reviews/P5c-3-s5-test-audit-table.md | 7443 | b9eddb079c5d8ab857f30f064662d11a539b41fb98103b901b2a2dea439d1ae7 |
| PUBLIC own-source machineRegeneration.integration.test.ts | 21188 | 2b80c745b86220f360e673b97bb9b5bf6601f7cc361d95c77159a938b8646700 |

direct testのexactpathは `/Users/hikaru/github.com/tuanemuy/hollow-p5c-machine-79ef126-20261006/packages/core/src/adapters/libsql/__tests__/machineRegeneration.integration.test.ts`。全上記をregular600/selfUID/nonlink/nlink1/canonical/NOFOLLOWで全文読取し、lstat/open/fstat前後/path後dev/ino/mode/UID/nlink/size/mtime/ctime同値、fullSHAを確認した。sourcee25の当該既知test1file以外の製品source/worker/fixture/schema/migration本文は今回再読していない。main working/HEAD、source1470walkや依存108再走査は0。

SOURCE e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42、1470manifest d1b9a0b801f758742051495c7c5f9daa9645a778aee57279340f9fad4a7ec29e、1470/21263983B/public108/CF986のfullstable precheck PASS、既 --preflight app exit0はRoot actual phaseの借用事実である。独立に再実行・全source検証したとは記さない。自身既minimal TOOL reviewのtable correction全inverse/件数・正常gate不変更を前提として借用し、今回helperがその固定currentSHAと一致することを直接確認した。

## Borrowed ONE actual receipts

Root selected stdout projectionであり、未記載欄・privateproof・copySHAを復元しない。

| Boundary | Rootが公開した観測 |
| --- | --- |
| outer Python/Node PG | Python exit0/ownPG absent/registeredNodePG.app absent/両PIPE EOFと実FDclose/TERM-KILL0/faultNULL/heldfalse/strictClosedGuardtrue |
| inner Node | actual exit0/ownPG absent/両PIPE EOFと実FDclose/forcefalse/faultNULL/caseCount7/passed7/failed0/afterAll assertions-passed/oktrue |
| official JSON＋Reporter | exact7 passed/0failed/skip0/todo0、ready7/result7/sameIdentitytrue/errors[]/runReasonpassed、hooks3 start+3end |
| stockfork | original samehandle/attempt1、actualexit codeNULL/signalSIGTERM/close true/knownPIDabsent、requestedStop+TERM true/KILL false、stdinClosedtrue/stdinFinishfalse、stdout/stderr EOF-close、actualdisconnect/connectedfalse/channelReleasedtrue、IPC EOF/FD NULL |
| native ledger | groupapp/workerAttempts0/active0/workers[]/ownerAttempts0/ownerHandles0/restoredtrue/observerFaultfalse/normaltrue、actualNodeBindings2 |
| readonly audit | ok/queryOnly/FK/integrity/actualClosed true、exact counts下表 |
| capacity/guards | total6661944B/originals215/tmp0/cache0/records1497、app/opaque/audit各2220032B、entries22、volatileMissing0、resourceDiagnosticNULL |

stockforkの元requested SIGTERMによる正常終了はouterのforceとは別である。NULL exitとSIGTERM、stdinFinishfalse、IPC EOF/FDNULLを正直に保持する。Readable EOF-closeとpublic disconnect/channel release/actualexit-closeをIPCの架空Readable EOFへ変換しない。Node0/PGabsent/PIPEEOF-FDは元inner/outer各境界の受領値であり、個々libSQL/native handleのFD proofを新たに生成しない。ledgerの0はこの既observer範囲のcountであり、任意native資源全体の不存在証明ではない。

今回Root記録は正常strict/WAL/process/stdio guard→copy二段→readonly auditへ進んだ原工具の結果である。copySHAは選択投影から省略されているので具体hashを記載しない。元helperは両copy hash一致を正常条件とするが、Verifierがコピーを開き直して確認した事実ではない。

## Exact seven cases: port/assertion scope

APP suiteのbeforeAll:423–425は `machineFixture(false)` を使用する。fixture:86–104は元regeneration factoryにfake extractorを渡し、bytesをTextDecoderでhtmlとして返す。native workerPathsの設定が存在しても今回real parserを実行した根拠にはならない。source setupは元libSQL client/UoW/storageとoriginal source input capabilitiesを使うが、account/sessionはテスト内synthetic setupであり外部signup/mail/Google/transportを検証しない。

| Exact case | Source rows | 本文が直接assertする意味 | 広げない条件 |
| --- | --- | --- | --- |
| adopts html and undoes preserving the current title | 429–462（html parameter） | 同command request返却が同値、sweep→settled succeeded、closed input/activeInputs0、quota reservationNULL、undo後previous html body | fakecodec。current title field自体のassertやタイトル変更raceはない。 |
| adopts markdown and undoes preserving the current title | 同markdown parameter | 上と同じapplication/undo body条件をmarkdown original metadataで通す | bytesは同HTML text/fakeextractor。native Markdown codec・parser lifecycleの証明ではない。 |
| preserves the genuine closed input while the machine owner is still active | 463–496 | 元reserveBegin/bindBegin/claimTransaction/claimExactを用いるunused lease、元input.finish proof→finishInput、owneractive/acquiring、savedreceipt同値/sourceMemory0/activeInputs0、元consumed(proof,lease)true、generic jobrunning/quotaNULL。その後原completeMachine failed | 元unused leaseの入力閉鎖/消費の局所確認。realWorker/nativeSourceProof/owner退役/ACK/true predecessor/D1を補完しない。 |
| cancels a queued request without an original read or quota reservation | 497–513 | queued request→元cancel、settled cancelled/inputReceiptNULL/activeInputs0 | このcase本文には独立read-call count/個別quota readのassertはない。タイトルだけから全no-read証拠を増やさない。 |
| holds the original execution until a lost finish response is exactly reconciled | 514–550 | aftercommit finishReply fault、pendingCompletion.proofのnot-null assertion、execution.active true/input1/previous html、次sweep→failed/input0/executioninactive/previous html | 同proof identity/privatebrand/ACKをassertしていない。not-nullだけはundefinedを排除するassertでもなく、その一行からproof存在・真正性を増補しない。failed terminalを成功採用へ変換しない。 |
| keeps the previous body on sanitize failure and terminates atomically | 552–574 | 元sanitizer failure fixture→failed、note version0、activeInputs0 | 本文の直接検査はnote versionであり、全refs/本文/料金/resource undoの原子的rollbackを網羅しない。 |
| fences an expired queued request before reserving or reading input | 575–598 | logical120001後sweep、failed/inputReceiptNULL/activeInputs0/previous html | realread/reserve実呼出countやfinal-current競合対の独立観測ではない。 |

unused claim:274–322は元admission/source input transactionの能力を使う。proof値を手製ブランドで生成したとは読まないが、原native producerの実閉鎖と等置しない。finish response fixture:108–150は元UoW commit後に固定SystemErrorをthrowし、消費/終了の応答不明application枝を試す。rawerror message/stack/privatepayloadはレビューへ出力していない。

case7本の成功数はit.each2＋個別5。集計上succeeded2、failed4（unused/lost-response/sanitize/expired）、cancelled1がRoot readonly auditと一致する。undoが2あることとoriginal seed7によりrevision11の既source-derived期待に整合する。試験名の約束を本文assert以上の独立検証として取り扱わない。

## Source close, tool gate, and readonly counts

test afterAll:426–428はfixture.closeをawaitする。close:378–413は元machine.execution.stop、activeInputs0、source FK/integrity、normal-only WAL TRUNCATEのexactcolumns/onerow/safeinteger000を確認してfinally元client.close/client.closedを要求する。config observer afterAllのnormal/restored receiptとsource close assertionsは別である。PRAGMA/client.closedをper-native actualFDclose proofへ変換しない。

runner:533–580はactualNode0/knownPGabsence/force0/両EOF-FD/strictrootguard後、exact7 names/status/JSON skip/error fields、Reporter sameCase/hook balance、originalstockfork/nativeledger正常を要求する。configはpublicdisconnect/channel release/actualforkcloseとoriginal requested-stop SIGTERMの枝を正式normalとして扱い、IPCNULL/finishfalseを正常receipt内に保つ。Rootの選択投影はこの正常枝と整合する。

runner audit:621–658はWAL/journal sidecar条件、元copy_db→opaque→auditの二段/hash一致、readonly immutable接続/query_only、FK/integrityと各exactexpected、finally connection.close→actualClosedを要求する。outer:866–877はPython0/knownPythonPGabsent/expectedNodePGabsent/両EOF-FD/forceなし/strictrootguard/innerheldfalse/faultNULLでだけheldfalseを返す。この順序/正常条件は自身minimal reviewのfullinverseで不変更と確認済みである。

| Audit label | Root actual selected count | Fixed APP expectation |
| --- | ---: | ---: |
| accounts / workspaces | 1 / 0 | 1 / 0 |
| notes / originals | 7 / 7 | 7 / 7 |
| jobs（formal conversion_jobs）/ operations | 14 / 7 | n×2 / n、n=7 |
| operationLive | 0 | 0 |
| succeeded / failed / cancelled | 2 / 4 / 1 | 2 / 4 / 1 |
| revisions | 11 | 11 |
| llm / previews / quota / dispatches / activePins | 各0 | 各0 |

全countsはRoot original readonly auditの実返却値を借用した。VerifierによるDBquery/driver実行/コピー再読ではない。expectedをactualから生成したりraw SQL/values/IDsで補完していない。APP normal audit成功をNative/D1 expected4の実観測へ流用しない。root total6661944BはRoot capacity報告値で、未観測file/sidecarの詳細やunknownentry不存在を推定しない。

## Acceptance boundary

今回Root metadataのAPP7＋audit正常局所候補を支持する。旧APPa184 auditdriver errorの実原因はUNKNOWNを維持し、今回の成功から過去到達SQLやoldcopy状態を断定しない。旧ROOT/PURE341/6074/DA5b8/UI failure rootsを開いていない。

Native2/native-d1一条件は未実行で、それぞれ独立PUBLIC/preflight/ONE actual/normalclosure/audit受入が必要である。real parser/source native proof、genuine predecessor/owner recovery、privateACK、final current/source race、atomic refs/reference retention/resource undo、未網羅body invariants、factory/HTTP presentation/Drive UIは未確認のまま。application fakecodecの局所assertionからS5全体A–Fやuser completionを宣言しない。

新audit2 rootのDB/sidecars/opaque/audit/source-originals/records/results/cache/objects/TMPと全過去privateを永久NONOPで保持した。stat/read/hash/copy/import/reopen/replay/rerun/cleanup0。source1470walk/dependencywalk/default/preflight/test/import/native/DB/Worker/rootprobe/actual0。main/P5d/UIhelper/S5productを変更していない。

NEW review一pathだけown wx600/fsync/actualFDclose/postread stable600/nlink1/canonical/fullSHAで固定してALL reader/writer/runtime STOP。goal/spec/spec-implement/Manager正本/追加agent操作0。
