# S5-C final-fence independent candidate review

判定: **LIMITED STATIC PASS**。固定候補の app-c source/case/helper gate を受入し、Root の別 precheck → `--preflight app-c` → ONE actual 判断へ返す。これは C の actual 合格、whole feature、native/DB/proof/ACK/物理 resource closure、E/A/D/UI の受入ではない。実行・root probe・DB・private 操作は0。

## 固定 PUBLIC 候補

Root/Implementer の停止済候補を読み、source/helperを編集せず独立照合した。直接読取は全対象 canonical / regular / nonlink / mode600 / selfUID / nlink1 / NOFOLLOW、lstat-open-fstat前後-close後path の dev/ino/size/mtime/ctime/mode/UID/nlink 一致、全文 SHA に固定。

| 対象 | bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-3-s5-final-fence-candidate.md | 9997 | d18fd95bd7f4ec54744ac9b09a21b6b0a7f8eef1300e559e2ddace6c84b80023 |
| helpers/p5c-s5-test-runner.py | 290461 | db87311aa7caa58d7d802d6a9427c27ad5b1b5aed50024e7701280fb05dff753 |
| helpers/p5c-s5-test-config.mts | 390161 | 6b1f414dbc694fc0f5f669f20d89c268ec198e942a5d06316d6e1a04f86524fb |
| source: adapters/libsql/__tests__/machineRegeneration.integration.test.ts | 31026 | f0291113c51292cae9266fa993928fdc9c28e8b0de98a8f775429f6af4cfa3d4 |

SOURCE は `/Users/hikaru/github.com/tuanemuy/hollow-p5c-machine-79ef126-20261006`、候補 C `c13759984c18b4f01825da93d4a9962844372aef`、親 `e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42`。対象testの Git blob は実bytesから memory Gitblob計算し `f987cebf008cfd409e653a7888a96701d7d646aa` と一致した。独立の Git HEAD/tree/subprocess は実行していない。

Root/Implementer の full source1470 / 21,273,821 B / 唯一test差・残1469同値・trackedclean、PUBLIC108link/package metadata108、CF986、canonicalNode24.18 および whole checks の結果を明示借用した。このレビューの direct source1470 全再walk/body読取とはしない。Source候補commit/parent・outside1差についてもその固定結果を借用する。

runner の SOURCE_FILES/SOURCE_SIZES を Python AST literal だけで取得し、config の declared manifest JSON と全1470の path/hash/sizeを memory比較した。合計21,273,821 B、pair compact `[[path,sha256],...]` SHA `5324ac851818d7b4faa37b119e6b3b70a46c8dbfde93524c27d9d9f9e8bbedd9`、shape `[[path,Gitmode,bytes],...]` SHA `c660398a77096c255cc63481e451dbceb6ca3f3814069972698b5ee654f800b7` を独立再計算し一致。declared recordの検算と物理全source検証を区別する。

## helper full inverse: 独立直接一致

runner の許可14差（family追加、name表/required、候補C、CONFIG_SHA、source唯一hash/size、app DB routing/cap、source-derived audit counts）を memoryで元literalへ逆適用。結果 **289795 B / 7fa7fe9818524fcbc58aa1becc1038a193a1a999b127e44ffc98c3f13b29516c** と一致。

config の app-c root/group/required/skipped/selectedFile、新name行、およびmanifest唯一test rowのhash/bytes/Gitblobを memoryで元へ逆適用。結果 **389705 B / eaa3eb9cf1547dbcc8334e25b78563d06ff2886cf8ecfb79acc029dad3f1acb2** と一致。Authorが提示した旧 selectedFile の exact literalと旧blob `a1d757074687473f5cd04ff0e62f628089db84ca` は PUBLIC定数として借用した。初期独立再構成ではGitblob復元を漏らし同bytesでもSHA未一致だったが、正確row復元で全文SHAへ収束した。候補の欠陥ではない。

元 selectedFile は `group==="pure"?pureFile:group==="app"?appFile:nativeFile`。新条件は app-cを同appFileへ追加するだけ。lexical分割ではconfig9置換（manifest row3field、name表周辺を分割）となるが、authorの6 grouped replacements と境界の数え方が違うだけで、旧全文SHAに直接一致する。旧helper/private rootを開く逆操作ではない。

この全文逆一致によって、stockfork、early known handles、native observer、sourceGuard before/after、workerId0/poolId1、normal/force/unknown、copy/audit/supervisor/PIPE/FD closureの既bodyに追加緩和がないことを確認した。PURE/native/D1の旧required/skip/count/deadline/ownershipのbindingも変更されていない。現在 source manifestはnewCへ束縛されるので、旧family成功をnewCのactualへ転用しない。

## app-c exact case gating

旧 APP7 suite は `HOLLOW_S5_GROUP === "app"` に限って enabled、app-cではformal skip。new suite は `if (HOLLOW_S5_GROUP === "app-c")` のみ登録する。fixture newargumentはdefault falseなので旧呼出意味を維持する。app-c selectedFile内は APP7 skip + new3 required =10。native2/D1/pureはこのapp-c fileの追加caseに数えない。

required3のJSON fullname（suite/title空白結合）とReporter fullname（` > `）はそれぞれ源it.each formatterに一致:

- machine regeneration final fence C-F1 rejects changed authorization in the final transaction
- machine regeneration final fence C-F2 rejects changed note version in the final transaction
- machine regeneration final fence C-F3 rejects changed revision head in the final transaction

runner FAMILIES app-cは(3required,7skip,180)。CASE_NAMESはAPP_NAMES+FINAL_FENCE_NAMES、REQUIRED_NAMESはFINAL_FENCE_NAMESだけ。config requiredNames/skippedNames/selectedFileも一致する。JSON exact順序/fullname/required passed・formal skipped/status/total10/pass3/fail0/pending7/todo0/file identity と Reporter 同TestCase ready/result各一回・run-end passed・errors0・sameIdentity・ready/result3・skippedReady/result7・hooks start=endを元normal条件として要求する。aggregate passだけで埋めない。

config nativeState normalのapp-c枝は元非native枝（Worker attempts0 / owner attempts0、observerFaultなし）で、原native2/owner1をapp-cへ許可していない。worker globals復元/sourceGuard/afterAllに変化なし。maxWorkers1/maxConcurrency1/正式ForksPoolWorker/setupFiles同file二相/worker0 pool1を維持。APP fakecodecはpublic inputの正常検証用であり、native extractor/PDF/実50MiBRAM/FD閉鎖の証拠ではない。

## source-supported final transaction boundary

直接読取したselected sourceは11files / 106,404 B。test以外は既知import・normalrepository wiringからの必要pathに限定し、declared source hashに全文一致。全source/path探索は0。

| packages/core/src relative path | bytes | SHA256 |
| --- | ---: | --- |
| application/regeneration/worker.ts | 17716 | 6154919239f839e93a5f13ec1d916435e4bb10e23077d5d612e779c9efa855db |
| application/regeneration/current.ts | 9410 | 8fc22dac39bb06b3a7f498083c4b936bd928a0f4d35875a2fcfc8591ed8d47ed |
| application/regeneration/completion.ts | 1687 | 48caa5193c09828e8d65cb41cc607e464198d19dd76851f96c4df03c12e970eb |
| application/workspace/membership.ts | 7625 | 1903969509dbdb06dd17947a38a53e061d0ff4ab96cc7efb24268a53a14393de |
| application/regeneration/body.ts | 2759 | 8a74cb69a385e96560ae678184ab8e5effdf6a2408d29e0871c521e407fa8fa6 |
| application/workspace/access.ts | 2616 | 627a529df725fd1fae951c40762b744a416bbd00383eee331d197f2f9639831a |
| adapters/libsql/repositories/revisionRepository.ts | 1923 | a741001afd7a7e7c5c817435c5671f720e5d5565908f05597f7de3cd4b1b32e7 |
| domain/note/entity.ts | 2418 | 3f60b8e162ea9801d2ea8fe7a1ba3ee8488b1b5365b63d90029abcdd99d4afaf |
| adapters/libsql/repositories/regenerationRepository.ts | 17241 | dbd912c3cb6f608aa6bd1ba57560df5189a6183ed12ac105ad796674a6b62433 |
| adapters/libsql/hollowUnitOfWork.ts | 11983 | 83037f439b915e4e921c3bd3608bdf2e6d326c150b8bb8a95a69c8a843bba7ae |

Test rows156–187/249–290 define a typed NoteProjectionPort, one-use Promise gate and normal workspace setup. project captures the gate, nulls it, signals entered, waits the samePromise then calls original pure projectNote(value). No input/proof/lease/class/receiver/result replacement is added. c.browsing exists only for finalFence, with search execute fixedunused rejection; no search Worker start. finally releases the same gate and source failure sets f.fail/rethrows. Timeouts/held are not converted to pass.

Original worker.runOwned rows346–358 call original input.finish, retain sameproof, await finishInput, load source then await prepareBody. prepareBody rows13–27 awaits typed c.browsing.projection. After gate, worker rows364–394 runs original finalUoW, checks same source / memory0 / closed input / exactproofId and currentMachine again, converts known source-invalid error to REGENERATION_SOURCE_CHANGED and completes failed before adoptBody. Test never substitutes final currentMachine or proof.

At gate, test asserts genuine original proof consumed for samelease, activeInputs0 but execution active, saved preparing / owneractive / memory0 / exactreceipt / resultVersion null. After terminal it asserts same receipt/lease consumption, ownerclosed/memory0/input0/progressrelease/executioninactive and generic failed/lease null/quota null. These are APP logical/resource-port assertions, not native physical termination evidence.

## Three normal concurrent producers / adoption0

C-F1: normal repository creates workspace with a distinct owner and executor editor. Normal changeWorkspaceMember authenticates the owner and downgrades editor→viewer in the projection window. Test separately observes roleviewer, noteVersion unchanged and generic job cancelled. requireNote(edit) rejects viewer; currentMachine also rejects generic cancelled. This case exercises the real compound normal authorization-loss path, not isolation of role as the only changed predicate. Original machine cancelGeneration is not directly changed. Final worker completes failed, and finishJob's existing cancelled→non-success branch (repository rows483–486) legally writes generic failed/clears lease. Test verifies previous body/notes/head/revisions/references/notices unchanged from the external snapshot, previous original state/coverage and sha restored, then restores editor via normal API and sweeps without reviving the same ended operation. Nativeproof is neither forged nor claimed.

C-F2: controlled normal domain editNote adds note.version+1 and normal NotesRepository.save(expectedVersion) within UoW. Same source currentMachine sees old bound noteVersion and fences final adoption. Test compares saved full note/head/revision/reference/notice values with external snapshot, so concurrent body persists and machine cannot overwrite it. No SQL write or editing-lock policy relaxation is added to product/UI.

C-F3: normal typed RevisionRepository.insert and saveHead in one UoW create external revision/currentNo+1 from original savedrevision, with same noteVersion. currentMachine requires originalRevisionNo; mismatch fences adoption. Test requires the external revision/head remain exactly after finalization. Domain revision type validity uses source types/wholechecks; actual transaction success is still unobserved.

All3 assert terminal failed / REGENERATION_SOURCE_CHANGED / resultVersion null, same proofreceipt and originals restoration, with no machine note/head/revision/reference/notice writes relative to external snapshot. The static contract is precise enough for oneactual; assertions/producers' actual arrival and persistence are not inferred from source.

## Expected count derivation / caps / normal gates

Single fixture executoraccount1; C-F1 adds owneraccount1 and Workspace1. Each case seeds note/original/succeeded generic1 and requests sameoperation generic1+machine1, adding baseline revision1. Three cases give accounts2 / WS1 / notes3 / originals3 / conversion_jobs6 / machineops3. Final allfailed3 with succeeded0/cancelled0/live0. Baseline revisions3 + external C-F3 revision1 =4. LLM/preview/quota/dispatch/active object pin0. These match runner app-c readonly audit expectations; generic C-F1 interim cancellation is not mistaken for machine cancelled. Query bodies/data are not observed or printed from an actual DB.

Root app-c memory literal is `p5c-s5-final-fence-4e91b08a` only. No presence/nonexistence statement is made. Existing budgets remain root192MiB / appDB32MiB nativeDB0 opaque8 audit8 total80 / originals8 cache16 TMP8 records8 / entry8192, slot2逐次case3, businessWorker0/ownerchild0/ps0, stock toolfork1; case40/group180/body430+closure50=outer480 / guard200ms / original volatile TMP policy. No case/newresult-derived cap relaxation.

Normal acceptance must still follow exact3case pass and source afterAll, input0/execution stop, FK/integrity, strict normal checkpoint row000 and client.closed, plus independent stockfork actualexit/publicIPC/readableEOFclose, Node/Python0/knownPGabsence/outer2PIPEEOF+actualFDclose/noforce. IPC EOF remains NULL; original fork SIGTERM stop is distinguished from outer force. Only then source/WAL/journal strict guard, bounded opaque/audit copy with actual fsync/FDclose/hash, readonly immutable/query_only/FK/integrity/counts and actual auditclose may run. Logical DB/client.closed is not physicalPIPE/FD proof. Non0/fault/unknown/force stays held, copy/audit0 underguard, no retry.

## Checks borrowed and scope close

Whole SOURCE typecheck→lint:fix→format exit0 was borrowed from fixed author report and Root current source precheck; no repeat. Source-before/after exactguard remains as oldbody. Python AST parse/memorycompile independently passed with no pycache/helper evaluation. Config syntax/isolatedtypecheck PASS are explicit author borrow; no Node/helper/Vitest/import executed by this reviewer.

No source/helper/main/Manager/UI/P5d edits. New review wx600 only, fsync and actualFDclose, stable fullread/hash. All existing/new runtime roots and UI zod3/e762 reservations remain NOOP stat/read/hash/copy/import/replay/cleanup0. No default/preflight/actual/rootprobe/create/DB/native/network/proof read. D1failure UNKNOWN and missing genuine recovery/proof/ACK remain unchanged. WholeC/resourceundo/native/D1/IN-07UI not complete. On review hash fixation ALLreader/writer/runtime STOP; Root decides any next actual separately.
