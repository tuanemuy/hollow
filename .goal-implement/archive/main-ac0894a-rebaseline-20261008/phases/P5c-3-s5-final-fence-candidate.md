# P5c-3-S5 C-final 候補

2026-10-06T10:01:26.716118+00:00。SOURCE/testと工具の候補を固定し、全read/writer停止。actual/default/preflight/source import/DB/native/root stat/probe/createは0。これはCの候補提出であり受入/実測成功ではない。E/A/Dと通常Drive UIは後続。

## 固定候補

SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-p5c-machine-79ef126-20261006`。

- C `c13759984c18b4f01825da93d4a9962844372aef`、親 `e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42`。
- 唯一変更 `packages/core/src/adapters/libsql/__tests__/machineRegeneration.integration.test.ts`：31026 B、SHA256 `f0291113c51292cae9266fa993928fdc9c28e8b0de98a8f775429f6af4cfa3d4`、Git blob `f987cebf008cfd409e653a7888a96701d7d646aa`。Git100644/実600。
- PUBLIC runner `.goal-implement/helpers/p5c-s5-test-runner.py`：290461 B / `db87311aa7caa58d7d802d6a9427c27ad5b1b5aed50024e7701280fb05dff753`。
- PUBLIC config `.goal-implement/helpers/p5c-s5-test-config.mts`：390161 B / `6b1f414dbc694fc0f5f669f20d89c268ec198e942a5d06316d6e1a04f86524fb`。
- 両helper regular600/nlink1/同UID/canonical/NOFOLLOW全文・前後stat同値を確認。新report wx600/fsync/実close/全文照合。
- 新app-c rootはmemory-only `/Users/hikaru/.local/share/hollow-validation/p5c-s5-final-fence-4e91b08a`。非存在確認も未実施。既family literalは変更しておらず再利用しない。

## 3対と正規境界

new describeは `HOLLOW_S5_GROUP === "app-c"` の場合だけ登録する。旧APP7のconst enabled以降のbodyを親の全文と比較し同値。旧native2/D1 testはGit blob全体同値。PURE/APP/native/D1のrequired/skip/timeout/native handle契約を変更しない。app-cで読まれる1fileは旧APP7 formal skip + 新3 required（10 total）。

| code / exact title（suite: machine regeneration final fence） | producer | 拒否と保持のassert |
| --- | --- | --- |
| C-F1 rejects changed authorization in the final transaction | 正規WorkspaceRepository create/joinでowner別account、executor editor。同input finish後のprojection gate中、通常changeWorkspaceMemberでeditor→viewer | role viewer、noteVersion不変、通常API generic job cancelledを別assert。最終failed/SOURCE_CHANGED、結果version null、旧note/head/revision/ref/notices同値。元original状態/coverage復元、generic failed/lease null。復権後sweepでも旧operation/本文不変 |
| C-F2 rejects changed note version in the final transaction | 同gate中、純粋editNote＋NotesRepository.save(expectedVersion)を正規UoWで確定 | noteVersion+1、head不変、外部concurrent body保持。機械のnote/revision/ref/notices書込0、結果version null、failed終端整合 |
| C-F3 rejects changed revision head in the final transaction | 同gate中、保存済revisionから型付き新revisionNo/actor/causeでRevisionRepository.insert→saveHead、同Tx | noteVersion不変、head+1、外部revision保持。機械のnote/head/revision/ref/notices書込0、結果version null、failed終端整合 |

C-F2/C-F3は正式domain/repositoryのcontrolled concurrent producerである。通常UIに編集lock回避を追加していない。SQL直書き、保存guard変更、機械snapshot/CAS/proof変造0。producerのactual到達/保存成功は未実測。guard拒否時は失敗を保持し、弱めて成功させない。

fixtureの `machineFixture(native, finalFence=false)` は旧呼出を維持。Cだけbrowsingに型付きprojection gateを接続し、公開のpure `projectNote` に元入力を渡す。検索executeは固定unused error、search/Workerは起動しない。gateは一回のPromise進行制御のみで、lease/proof/handle/receiver/値を変更しない。finallyで同gateを解放し元failureを再throw/f.fail保持。wait回数・時間は元fixtureのまま。

`worker.runOwned` は genuine input finish/save/consume後 `prepareBody` をawaitし、最終UoWでcurrentMachineを再実行する。この境界で元progress.ownedの同lease/proofを捕捉し、consumed真・input数0・execution active、保存済preparing/owneractive/memory0/receipt同値をassert。終端後は同proof.receipt維持・同lease消費・ownerclosed/memory0/input0/progress release/execution inactiveを別assert。native exit/物理FDやRAM量をこのAPP fake codecから主張しない。

## SOURCE由来の期待値

各caseは独立noteをseedしrequest1。初期fixtureのexecutor1+追加Workspace owner1、Workspace1/members2（復権後executor editor）。各seedはoriginal1と成功済generic1、各requestは同id generic1+machine1とbaseline revision1。C-F2はnotes CASのみ、C-F3は外部revision1/head+1。機械採用/undoは0。

| 監査項目 | 固定期待 |
| --- | ---: |
| accounts / workspaces | 2 / 1 |
| notes / originals | 3 / 3 |
| conversion_jobs / machine_regenerations | 6 / 3 |
| machine succeeded / failed / cancelled / live | 0 / 3 / 0 / 0 |
| note_revisions | 4（baseline3+外部C-F3 1） |
| LLM / preview / quota / dispatch / active object pin | 全0 |

C-F1の通常membershipはgeneric jobをcancelledへ変更するがmachine cancelGenerationを変更しない。最終completeMachineのfailed結果を `finishJob` が同id generic failedへ揃える。既repositoryのcancelled→non-success合法枝を静的確認した。cancelledをmachine cancelledへ誤推定していない。上の期待値はactualから逆算していない。

JSON exact fullnameはsuiteとtitleを空白で結ぶ公式formatter形、Reporterは `suite > title` の形で固定。旧7 formal skipは正規mode skip/result skipped/diagnostic undefined・ready/result同TestCase各一回。required3実passed・file同一性・errors0・hooks開始/終了・same identityをすべて要求し、aggregate passから補完しない。

## 差分と全逆適用

helper基点runner289795 / `7fa7fe9818524fcbc58aa1becc1038a193a1a999b127e44ffc98c3f13b29516c`、config389705 / `eaa3eb9cf1547dbcc8334e25b78563d06ff2886cf8ecfb79acc029dad3f1acb2` を変更前に全文hash照合した。

config差はapp-c root/group/selectedFile/required3/skipped7とmanifest唯一test entry。runner差はapp-c family(3,7,180)/fullname/required、新C/source唯一hash-size、app-c DB app routing/cap・counts、新CONFIG_SHAだけ。変換tableを逆順に適用し、runner/configそれぞれ元の全bytesと一致をassertした（14/6 exact replacement）。stockFork/early actual handles/native observer/proof/normal closure/unknown-held/normal-copy guardのbodyは変えていない。

SOURCE1470の全declared entryをNOFOLLOWで全文hash/size/600（唯一Git755は700）/UID/nlink1/canonical/前後stat同値へ直接照合。変更はtest entry1、残1469同値。outside test差0、tracked作業木clean。AGENTSは内部CLAUDE.md link。SOURCE bytes21273821。

- pair定義：JSON compact `[[path,sha256],...]`、helper順、SHA256 `5324ac851818d7b4faa37b119e6b3b70a46c8dbfde93524c27d9d9f9e8bbedd9`。
- shape定義：JSON compact `[[path,Gitmode,bytes],...]`、同順、SHA256 `c660398a77096c255cc63481e451dbceb6ca3f3814069972698b5ee654f800b7`。
- 宣言PUBLIC108linksのexact targetとpackage metadata108全文hashを直接確認。extra dependency/copy/install/download0。
- CF outputはown既986 B / `1803d60aa0818e5a3a7630807466ffaae8fdeb0fd85b7fa59431638fc5a479fa` 同値、再生成0。

## Checksと有限actual案（未採用）

初回whole typecheck2。許可されたSOURCE-only有限file/line/column/TScode診断で2550（ES libにないPromise.withResolvers）、2345（it.each tuple callback）、18047（closure内nullable）を修正。元Promise gate、tuple引数、narrowed original参照に収束し、cast/型guard弱化0。最終順序 typecheck0→lint:fix0→format0、raw出力はdiscard。SOURCE変更あり、runtime/private操作なしを区別する。

Python AST/compile no pycache0。config Node24.18 `--experimental-transform-types --check` 0、source import0。単独tsgo初回指定は2/file診断0、`--ignoreConfig --noEmit --target esnext --module nodenext --moduleResolution nodenext --skipLibCheck --types node` のisolated config型check0。whole SOURCE checksの再演ではない。

future invocationはManager別採用後、pinned Python3.14 `-I -S .../p5c-s5-test-runner.py --preflight app-c`（existing nonmutating mode）を別inspectしてから `--supervise app-c` 一回。同SOURCE1470/deps/config/CF/canonical Node24.18 exact precheck、全result inspect。現在は双方未実行。

予算はroot192MiB/DB app32 native0 opaque8 audit8（logical最大4合計80上限）、原本8/cache16/TMP8/records8/entry8192、account2/WS1/slot最大2・逐次case3、business Worker0/ownerchild0/probe0、stock toolfork1。case40/group180/body430+shared closure50=outer480、guard200ms、TMP volatile128 inner合算+128 outer後quiescent strict維持。PUBLIC readonly config390161 Bは1MiB読取内/privateへコピー0、既material cap不変更。

全assert/fixture execution stop/input0/FK-integrity→normal ONE checkpoint strictbusy/log/checkpointed 1row3safe000→原finally clientclose→原stockforkの実exit/stdio EOF-FD/IPC public null区分→Node/Python0/known PG absent/2EOF-FD/force0→strict/cap/bothwal-journal0→bounded wx opaque/audit各8MiB10秒64KiB/fsync/hash→immutable/query_only/FK/integrity/source counts/actual audit close→outerstrictの既normal gatesを維持。checkpoint/client.closed/test assertionを物理FDの代用にしない。失敗/unknown/non0/forceはheld・copyaudit0・自動retry0。

## 停止と未検証

source/test/helper writerとGit操作を停止。reportの自己全文hash確認後read STOP。全旧/成功/失敗private rootsは恒久NONOP。main/UI/P5d/Manager正本変更0。実3case到達、producer合法保存、最終拒否、native/DB/FD閉鎖、実監査は未検証。E/A rollback/resourceundo、D native reply-loss/unknown held/D1 actual、後続IN-07 UIを完了へ補完していない。
