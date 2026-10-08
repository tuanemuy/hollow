# C0-F2 recover during stop — 独立 SOURCE 判定 PASS

候補 `176ea15b572c610e97f99a021ea94e2ba60637c7`、parent `5214cf94bfd4df7b9da002775d65394c9c17b9d3`、tree `2690e0c8794e220058ac51083bfad0c61e6a65c4`。独立静的レビュー。対象は controlled C0 SOURCE の runner.ts と新 runner.test.ts の2path、および正式 PUBLIC report/manifest。旧 review7328/0068bba338901a2ec104ff97707fb099b03a3d9b3bb626e75c422d9cd49885f5 の pendingCompletion 循環に対する最小補正を判定した。

**C0-F2 SOURCE gate は PASS。** 原 execution.stop 待機中に既存timerの recover-only sweep を続けることで、同proof deferred の回復が stop の後置処理だけに依存する循環を除去している。4 logical cases は意味のある scheduling / rejection 対だが未実行。genuine proof / native closure / 実 shutdown の成功証拠を取得した判定ではない。

## 個別判定

| 項目 | 静的判定 | 根拠と限界 |
| --- | --- | --- |
| 既 pending と late pending の回復継続 | PASS | stopped=true の後、原 execution.stop を取得して wake を一度呼び、その await 中も既 setInterval(wake,2000) を残す。即時sweep後に callback が pendingCompletion に入る場合も interval が次の admit=false 回復を起動できる |
| 新 claim / timer / prune 増加なし | PASS | timer は既一つ。wake の admit=!stopped は各 issuance 前に capture され、stop後の新sweepはfalse。falseでは pruneにも進まない。停止前に開始済みの admit=true sweep は await active で完了を待ってから original execution.stop に進む |
| 原 callback / proof / deferred identity | PASS | NodeMachineProgress class 全本文はparentとbyte同値。worker/current/finishInput/SourceExecution等はGit outsideFix不変更。原 confirmCompletion の private validator と exact original proofによるdeferred解放を置換しない |
| original execution.stop 呼出と Promise | PASS | original call onceの戻Promiseを直接 await。stopはnonasync関数からcached stopping Promiseを返す。重複callでoriginal stopを再実行せず、fulfilled/ rejected双方をcacheする |
| 原 stop 拒否 / 回復エラー保持 | PASS | finallyでfinished=true/interval clear/active awaitした後、原 stop rejectionはそのままpropagateしfinalsweepへ進まない。回復sweepの最初のerrorは {error} で保持し、後続回復成功があってもnormalstopにしない |
| 原 stop settlement後の閉鎖順 | PASS | finallyのfinished=true以後wakeは無操作。既active回復はawaitしてから、正常時だけfinal sweep(false) とpendingCompletion拒否guardへ進む |
| shared Drive 最終stopへの影響 | PASS（既SOURCE配線継承） | callerdrain Promiseが原拒否/回復errorを保持するため、serverの先行allSettled drainと共有Drive finalstop順を緩めない。今回server/DriveRunner/DriveRuntimeは不変更。実動作は未検証 |

停止前にissuedしたsweepは通常admissionだったという区分を保持する。今回false化するのはstop後に新規issuedするsweepであり、実開始済み処理を「read0だった」と再分類しない。original operation.done が実 callback / withOwner finally を待つ意味も不変更である。

SOURCE上の回復可能性は、原 sweepMachine が active execution中のpendingCompletionを既exact consumedproof/current/receipt/proofIdで回復し、正規confirmCompletionへ進める既契約に依存する。今回そのguardとprivatecapabilityを変更せず、schedulerの待機順だけを直す。unknown/native/read閉鎖不明をtimeout・取消・stop・row absenceから解放する枝はない。回復が永続的に不明ならnormalstop成立を主張せず、無条件resolveをしない。

## Prepared logical4 の有効性（実行0）

1. 初期microtask前のstop: original logical stop once、duplicate Promise identity、全sweep false、stop後wake/timer無作用を検査する。
2. 既issued true sweep: original stop未呼出を確認し、issued完了後original stopが即時回復後にlogical pendingをpublishする。2000msの既timerがそれを回復し、stopがその間pendingであり続けることを検査する。旧「interval停止→stop await→後置sweep」実装では解けない分岐を狙う対である。
3. recover-only failure後のlogical callback completion: 最初のerror objectをnormalstopへ吸収せず同objectでrejectし、cacheとtimer終了を確認する。
4. original logical execution.stop拒否: 同error objectをcallerへ返し、duplicate cache / timer終了を確認する。

sweepMachineはmodule mockであり、logical gateをresolveする対である。正規genuine proof/native operation.done/HTTP/FD/ACKをstubの成功から発行していない。型付きfixtureはunused portsをthrowing getter/functionで閉じ、偽native事件/ブランド/ハンドルを作らない。タイマ対のactualrunner実行とfake-timer APIの動作は未検証。4件は新source回帰対の準備として有効だが、native positiveやC0全体の完了を代行しない。

## 固定・直接根拠

PUBLIC phase `P5c-3-drive-machine-c0-recovery-stop.md` は161455 B / SHA256 `abe0f9066cd632a0d1b2fcacff046bf7bdb14f9df3bd9bdcc60e454d642ef27b`、regular600/nlink1/fullstable。圧縮manifestの本文表示0、memory-only decode282183 B / `004ff039931dcddc3f4c0936b5e3f002f5c028aba47f25bd2f11fb6454f41ea0`、6columns/1475rows/regular1474/21303283 B。

- runner.ts:4717 B / `34250662e4fa669d8ebec826fe7532e41f9cc0ba6c70d68025b0d355f5d08495` / Gitblob `8fce947bef4f7dfc03a51ca5f65c8bac2b787870`。
- runner.test.ts:5386 B / `c82aaf75e2078d73e9b82c250582d2c5ef4402d6b7672e55eea377136453bfce` / Gitblob `aae95ce74071b5ae13562ad8c93ce19785892a66`。

両sourceのcanonical・regular600・self UID・nlink1・NOFOLLOW読取前後stable・全文SHA/Gitblobを直接確認した。Git HEAD/parent/treeを独立照合し、parent差分は上記2pathのみ。全manifestのGit mode/blob表、pair `8318ea1c06630c7cbc58ff6a7e14fcba409f3a5334c5506fba549e9d402a700c`、shape `99f7788f3a6e11f83ea39925c26d5bef811ebfd4a5268f960563a3f5ec3a5a88`、outsideFix1473の既parent Git entry不変更を直接確認した。不変更全working sourceの再fullreadやunknown physical entries不存在の確認はしていない。

最終two-path whole typecheck→lint:fix→format各exit0、PUBLIC108/83・CF不変更・cumulative18・trackedcleanは作者PUBLIC報告借用。初期runner-only checksとnewtestの初回型失敗を最終成功に代用していない。test/runtime/wholechecksをVerifierが再演した証拠ではない。

## 受入範囲・停止

C0-F2のSOURCE blockerは今回最小差で解消したと判定する。ManagerによるSOURCE候補の局所採用に進める。genuine normalstop・実proof応答不明回復・個別native全閉鎖・C1/S5-F/全UIは別の未検証であり、whole acceptanceにしない。追加timer/case/機能を条件外に要求していない。

source/helper/product/管理正本の変更0。runtime/default/preflight/test/import/DB/native/browser/rootprobe/worktree作成0。全旧/private/generated validation rootsは成功・失敗ともstat/read/hash/copy/reuse/cleanup0。この新reviewだけwx600で固定しALL read STOP。

## Root補足への最小論理実行案（未採用・実行0）

新fixed helper/config提出→独立static入口判定→RootのPUBLIC precheck→新rootの論理ONE、の別採用を提案する。対象は固定C176eaの `packages/core/src/adapters/node/regeneration/runner.test.ts` 一つ、上記exact4 fullnameのofficial ready/result各1・passed4・skip0・errors0である。既configのpure scheduling系rowを再用する場合も、この新file/title集合を明示固定し、既accepted pure/native/app suiteは含めない。現configがそのまま起動可能とは未確認であり、具体helper/argv/hashは作者の次候補で固定する。

Node24.18のRoot既採用canonical gateをVitest/fixture前に置き、正式Vitest ForksPoolWorker/cacheFs:false・stockargv/IPC/receiver/handleを保持する。新rootはRootが未使用memory literalを別予約し、存在probe/createは実採用前0。root192MiB以下、DB/object/key/businessWorker/businesschild/network0、tool Node1/fork1 sequential、cache/TMP8MiB/log2MiB/material256KiB内を案とする。body30秒/outer60秒（TERM10+KILL10+PIPE10のtail込み）、各case/hook10秒/200ms監督を目安に次toolcandidateで正式化する。タイムを延長して正常を合成しない。

正常gateは4caseのofficial同TestCase identities、fixture scheduling assertions、原stockfork actualexit/close・readableEOF/actualclose・public IPC disconnect/channelrelease（IPC EOF/FDは公的NULL未観測）、Node0/knownPG absent/outer2EOF独立FDclose・force0・strict新root容量を各々確認する。fork工具の正常SIGTERMをouter forcedと区別する。failed/unknownはheldでroot再操作0、DBcopy/auditなし。

これはmodule-mocked scheduling regressionの実行案だけであり、genuine SourceInputProof/native operation.done/sameproof response-loss/Drive ACK/fullshutdownの正例を作らない。元source/ports/mock範囲・4case期待を緩めず、helper作成・preflight/default/rootprobe/runを今回行っていない。補足固定後もALL read STOP。
