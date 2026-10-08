# DA01 plan independent review: LIMITED static PASS

対象は新計画 `P5d-unknown-ack-followup-plan.md` の DA01 一条件である。saved-closed/caller-ended の元 local-close proof に対する ACK method 呼出前 fault、fault-on 正常 reconcile、fault-off 同 proof の正常 ACK、genuine retirement receipt の保存・読戻・消費、同 intent の通常再開は、固定 source040b07 の既公開経路から到達可能と判断する。計画の最小候補準備へ進むための限定静的 PASS とする。実装・工具 preflight・actual test・正常閉鎖・DB audit・P5d 全体の受入ではない。blocking source gap は今回の範囲では見つからなかった。

Verifier は P5d proposal/source の author ではない。自身の UI helper は固定 writer/read STOP のまま、本件だけを独立に読んだ。UI build の別 actual failure は本レビュー根拠に用いない。

## 固定入力と読取範囲

| PUBLIC document | bytes | SHA256 |
| --- | --- | --- |
| phases/P5d-unknown-ack-followup-plan.md | 14836 | aaa52d59c32fbc7c95c1732ee031286c9903b8a30cdf5e6bfd6ae1327bb1caa2 |
| criteria/P5d.md | 2779 | 0c3f093dd413868384750bec6c46d275792aac349dcfeca809c2bc5a51e14f55 |
| contracts/account-delete.md | 11056 | 02c847cd9175cbbdad52163e70226ba178504817735844d489f74a3be050e999 |
| phases/P5d-literal-debt-version-implementation.md | 20816 | 3fed67ca2874843d32bdfd50b7ce4cb1b16f2d5ab447df05a7452883e9d66185 |

計画・criteria は regular600、共有契約は元 regular644。各対象は自身 UID/nlink1/canonical/NOFOLLOW の全文安定読取・SHA を確認した。共有契約に最初の外部読取で誤った600一律assertを適用したため、その公開読取だけ停止し、元644の正式 metadata で再確認した。chmod・source変更・runtimeはない。

PUBLIC source は `hollow-p5d-c2a3d45f-20261006` の固定 commit `040b07cf6ad18c08a2137535b34613adde2ba1d5`、source94 manifest `a293920f3546ca927fda68a7fd834064451fc3ff5fe0321462f83e13fdc57f21` の必要 exact13 bodies、計236716Bに限定した。既phase-listed SHAと必要 import の既知経路を使い、全文安定 regular/nonlink/nlink1/自身UID/canonicalを確認した。初期9 files は fixed commit の exact Git tree entry と memory Git blob を照合した。追加 driveRepository/runtimeOwnership/LD01二本は既固定 PUBLIC manifest の exact SHA に照合し、memory Git blob を記録した。source94全体検証や未知entry不存在は主張しない。既知テスト名選別時に他Driveテストの公開namesだけを見たが、そのbodyを追加探索seedとして読んでいない。

| Exact source path | bytes | SHA256 | memory Git blob | actual mode |
| --- | --- | --- | --- | --- |
| packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts | 65709 | 23a03b0d1414cd2d83e9c5d48beae198a573f71a2d6efb186b98929cdf255f49 | efda92da653eb57e525372c1f448aa1d637e6c2a | 644 |
| packages/core/src/adapters/node/drive/authorization.ts | 9681 | 0fb22943c5049da1671037c64d925b460b50e2ce707d5a4c4b67e2939cf0c405 | 3cc9aa2cb9ba551297988fe88baa6556bf408cc2 | 600 |
| packages/core/src/adapters/node/drive/execution.ts | 17151 | de88261f15b303732f095e85f626cc722d8b88486c52b628ee72cdd0ef958d09 | 1dd5248d0e7e9dfa0ab520c629ae4230dc219c71 | 600 |
| packages/core/src/adapters/node/drive/factory.ts | 3003 | 6f7ef37efe43c8fa62ebab67d3841162ad28c763deff4898e94a58f896854405 | fda22f505f9fa558f4b53efea3a2dade8488e640 | 600 |
| packages/core/src/application/account/deletionWorker.ts | 8150 | efe1164dbe04e57368955b9b6387c7cca121ae6b11f53774436934766f6cacfb | be75a84975b9c2b9cc9cff23b1a0e05c5f803e49 | 644 |
| packages/core/src/application/integration/drive/connection.ts | 17913 | dab47422012091b38b34e1f2cf8a6b8437857415933c9bc1558834b974e0bb9a | 0a750abd90e33d0a544cb074b763b2b1936a2e74 | 600 |
| packages/core/src/application/integration/drive/ports.ts | 6949 | c6e47c5541c4bd8b9299efa1cf482b5e8484fd9957431fc8d8e4f7225dd8d97f | 000fa76a69db688d02a8cffd9937986a10f65801 | 600 |
| packages/core/src/application/integration/drive/runner.ts | 25186 | d8aca1e28924ec29f5f626bce2f5501c9c4c47489f15652b49747dc47f1f93bf | 8087de5e4d14b29619f26d61d25ec0e6062fc0da | 600 |
| packages/core/src/domain/account/deletion.ts | 4492 | 49bdd4e4c17e66b660a22cb12aac40d62967295509b79ba20599bfa3efdd977c | 2b2a7565f4ebe38ae9ce7be7c1920e06eed48cc0 | 644 |
| packages/core/src/adapters/libsql/repositories/driveRepository.ts | 39274 | 89c4ca9fbab28adc7290610036668931ccb3587d8b42705d1f62215774be7572 | 617f19d975bdd4cdbc7c238ba4693168ae4b72f9 | 600 |
| packages/core/src/adapters/node/drive/runtimeOwnership.ts | 8286 | f9d04799b5da89f5306abbe2459f20eec188be81fad187dd6b5889295a1890c5 | 38c6874f302b9b76d9c78adfa80f7d468710557a | 600 |
| packages/core/src/adapters/libsql/__tests__/accountDeletionLiteralDebt.integration.test.ts | 12505 | e0690ee7097b2e86fa15c455f04f7ee3dd17dc3ee9d13af05aef34db29447e50 | 503d5ab3b13c89bf3ffe852d5017236ffcb6f965 | 600 |
| packages/core/src/adapters/libsql/__tests__/accountDeletionLiteralDebtFixtures.ts | 18417 | 50133913a3dc8c7faf4059ee3c1ff4963bfc3b7b65ac8de2f743b0693d3861fb | bc1f87539de403089ab196984619ee6cb03eb7ca | 600 |

## saved read → 未ACK → original caller ended

`application/integration/drive/runner.ts:197–216` は元 closure が closed のとき、元 UoW で同 row ID/owner closed/runtimeGeneration-token を読んで await し、その後に元 `execution.acknowledge(proof.proof)` を呼ぶ。`executeDriveAttempt:445–511` の settle UoW はこの ACK より前に commit する。したがって exact A method-entry fault は保存を rollback せず、元 native ACK を未呼出のまま拒否させられる。saved closed read は native evidence/private proof の保存証明ではなく、business row の閉鎖tuple確認である。

`adapters/node/drive/execution.ts:220–294` の元 withCaller finally は callback reject にも実行され、caller ended を設定する。ACKをまだ呼んでいない entry は acknowledged=false のまま保持される。`observe` は workEnded/resources0 を元処理から確認して local-close proof を一度だけ作り、`unacknowledged:430–438` はその同 proof 参照を返す。新 sentinel は method entry の拒否だけであり、false返値・fake resource registration・gateによる caller pending・ブランド合成は不要である。

元 `authorization.ts:84–101` の empty-code は元 DRIVE_UNVERIFIED を token HTTP/read/register より前に拒否する。resources0 はこの限定入力経路の結果であり、外部transport正常入力、HTTP-positive、unknown owner、abort/deadlineの正常閉鎖へ拡張できない。

factory/runtimeOwnership は元 acquire-before-use object と private取得registryに束縛される。新 fixture は original createNodeDrive / execution / provider / protector / storage を保持し、型付けされた元 method を同 this/args/result/error で透過委譲する必要がある。非targetの任意拒否や cast でブランドを作る実装は計画の受入外である。

## 正常 reconcile と genuine receipt

`runner.ts:513–635` の元 maintenance reconciliation は original unacknowledged proof を列挙し、local-close proof なら caller ended を要求する。元 row を同owner tupleで再読し、既 closed row は576行で更新せず戻る。その後633行で同 proof を元 ACK に渡す。したがって fault-on 一回では row/version/proof/debt/intent を変更せず同 sentinel を拒否できる。deleted actor を通常利用として再claimする例外ではなく、既 closed owner の exact closure cleanup である。

fault-off は同 original proof を元 `acknowledge` に渡す。`execution.ts:440–465` は元 entry/proof、evidence/source、caller ended/workEnded/resources0 を検査して native-only `retainAcknowledgment(actual)` を呼び entry を退役する。ただし元 ACK は Promise<void> で、actual proof がなければ early return もある。void fulfillment や invocation count だけで ACK成功としない。計画が要求する同entry/proof確認、unacknowledged消失、元 retirement receipt の private verify true を別条件に保つ。

retirement receipt 内 proof は元 ACK proof の frozen copyであり、同objectではない。元 ACK引数の identity と retirement receipt 本体の元 private registry identity を区別する。fixture の公開count/booleanは証跡投影であり新 nativeproof を生成しない。

`application/account/deletionWorker.ts:15–69` の元 drain は genuine receipt を検査し、保存・再verify・元 durable exactread を await 後に同 receipt をconsumeする。`accountDeletionRepository.ts:185–224` の durable ACK read は kind/id/generation/token/evidenceId の exact一致、save は元 closed business row と同owner tupleを前提にする。この順序を fixture が透過観測すれば、ACK履行とdurable保存・consumeを混同せず確認できる。

同workerの fallback は取得済み predecessor-generation と predecessor-exit proof に限定される。fresh acquisition の predecessor list は空で、repository:229 は空を返す。通常 sweep が A の local-close proof を勝手に ACK する枝ではない。fault-on中の A receipt0 と C receipt drain は両立する。

## literal debt・fairness・通常再開

元 repository の drive-attempts cleanup は active/unknown、又は closedでも exact durable ACKなしのrowをblockする。元blockは実rowからliteral locatorを作るので handcrafted debt/ACK SQL write は不要である。Cの元receiptを保存・読戻・consumeして Cを通常回収し、未ACK Aのみ literal debt1として残せる。accountHeld/final verify は debt/attempt/durable ACK等の residual をORで検査するため、debt1を残して succeeded へ進める計画ではない。

`accountDeletionRepository.ts:1045–1048` の drive-connection cleanup対象は credential又はfolderが存在するrowだけ。今回は original ensure の empty/unlinked shellなので二つ目のdebtやcleanup version増加を作らない。元 connection/source の begin による version1+2=3、epoch0を保つ根拠がある。LD01の version4（begin3）を流用しない。

fault-off receiptの通常 drain は claim前に行われる。nextAttemptAt未到達の一回は receipt save/read/consumeだけ進み、same intent/cursor/lease/version/debtを保てる。logical clock2001後は元claim/step/releaseでA rowとliteral debtを回収し、durable ACKcursorも通常処理し、最後の residual0でだけ同intent succeededとなる。manualcursor、CAS guard緩和、通常auth fence迂回、claim期限の延長は必要ない。

## source-derived 有限数

| 項目 | 静的導出と将来actualで別確認する点 |
| --- | --- |
| attempts2 | 正常 command C/Aだけ。退会後beginは拒否され、成功3件目を作らない。 |
| connection version3/epoch0 | ensure1＋原begin2回。credential/folder無しshellはcleanup対象外。 |
| literal debt1 | Cは正常ACK/receipt済、Aだけclosed未ACK。空connectionはdebtに含めない。 |
| selected fault throws2 | A callback1＋fault-on正常 reconcile1。別proof/別target/追加throwはheld。 |
| original native ACK2 | C1＋fault-off A1。fault2回はoriginal ACK未呼出。Promise<void>からboolean成功を作らない。 |
| reconcile calls2 | fault-on1、fault-off1。sweep回数とは別枠。 |
| nominal sweeps53/hard64 | domain/deletion.ts:29–56に原cursor26。各tableのseedはpage25未満なので二巡26×2＋not-due drain1=53。blocked pageも元advanceのcursor処理を使う。64は工具停止上限で、actual回数を静的期待へ補完しない。 |
| retirement receipts/durable ACK aggregate2→0 | C/A各1の正常保存・消費・回収。live上限2であり同時2が存在したとは要求・推定しない。 |
| native entries | C whole終了後にAを始める逐次入力でlive max1。work resources0はempty-code枝限定。 |

既page25/lease30000/normal tuple-CAS、通常退会受付/fence/currentUser拒否とfinal EXISTS条件は変更しない。本人/account setupやexact論理値は元正常APIを使う候補で固定する必要がある。expected値をactualから生成してassertを自明にする案は受入外である。

## 借用LD01と future候補の境界

LD01 exact2 files の source/fullSHA とRootによる既局所受入だけを借用した。LD01はcaller pendingのまま元native ACKを実行した literal2/connection version4 条件であり、DA01のcaller ended・元ACK未呼出・literal1/version3とは異なる。既gatesや成功root/TMPを再利用・再読・再実行していない。元normalfactory、透過step/save観測、genuine receipt順序、元stop/closeを静的対照とした。

計画のfuture source94+new2=96、new runner/loader/phase、memory-only freshroot名は候補準備の提案であり、今回のレビューがsource/helper writerやrootprobe/actualを許可しない。候補実装では exact typed ACK wrapper と saved-read-after-commit 観測位置、sentinel同object、原proof/retirementreceiptの別identity、fault-on不変、原consumechannel、実閉鎖を検証対象に固定すること。

元 execution.stop はcaller終了とworkEnded/resources0を要求する。passwordHasher.stop/client.closeの元動作とstockforkのactualexit/close/publicIPC disconnect-channel release、outer Nodeのactualexit/knownPGabsence/両PIPE EOF/4実FDclose/force0を工具候補で保持し、その全部が成立した後だけ同DB1 readonly auditへ進む。stop返値/client.closed flag/local disconnect要求だけで欠測の閉鎖を埋めない。storageに存在しないclose APIや一般FDreceiptを足さない。source上の正常到達可能性とfuture actualの閉鎖受入を分離する。

case40/suite180/outer240と共有TERM10/KILL10/PIPE10、root192/DB1各32・合計64/TMP8/output2/material256K/frames40、official stockfork1、business child/Worker/network0は計画値のまま候補化対象である。元 acquire/config/keyring/storage metadata handlesは必要原APIの実閉鎖・source-bindingを工具独立reviewで確認する。今回その工具を作成・実行していない。

P5d-EのACK未確定、P5d-Fの一debt/fairness/sameintent再開と既C/G guardsの小範囲だけを支持する。true unknown/HTTP positive/credential durable ACKfalse/commit応答喪失/legacy/cutover/51-history/F02/full-copy/UI/全P5d A–Hは未受入を保つ。

## 非操作と停止

本レビュー以外のsource/helper/test/product/main/S5/UI候補/Manager台帳を変更していない。default preflight、source import、test、DB/key/HTTP/native runtime、rootprobe/create/retry/cleanupは0。全旧success/failed private roots、およびRootがheldを通知した新UI job SOURCE/BUILD/toolTMPをstat/read/hash/copy/import/reopenしていない。private結果・logs・rawstdout/stderr・SQL/body/IDs/proof秘密を読んでいない。

このPUBLIC review一pathをown wx600で作成し、fsync/actualFDclose後のstable NOFOLLOW regular/nlink1/UID/canonical/fullSHAを固定して、全reader/writer/runtime STOPでRootへ返す。独立plan静的レビューの結果は LIMITED PASS、actual受入は未実施である。
