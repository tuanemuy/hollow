# C0-F1 shutdown 独立レビュー — FAIL

対象 candidate `5214cf94bfd4df7b9da002775d65394c9c17b9d3`、parent `204482e52c6e8bfc4828a56aba4800c6fa13bbd3`、tree `7a9101b13d2b4c74aaa2c694f6d8cb6552684dc0`。2026-10-06、独立 PUBLIC/SOURCE 静的照合のみ。runtime/default/test/import/native/DB/root probe は実行していない。全 validation/private/generated roots は成功・失敗とも metadata/read/hash/copy/reuse/cleanup 0。全 read を本報告固定後に停止する。

起動・終了契約の事前判定は **FAIL**。機械 callback の原 proof による回復待ちと execution.stop の間に、SOURCE で確定する停止循環が残る。実発生、旧失敗原因、native 閉鎖の動作結果は未観測である。

## 必須不足 C0-F2: pendingCompletion と原 callback 終了待ちの循環

`packages/core/src/application/regeneration/worker.ts` の runOwned は finishInput / final transaction の応答不明を捕捉すると、同じ owned lease と genuine original proof を保持したまま `progress.awaitCompletion({ ...owned, proof })` を await する。releaseInput はこの待ちの後にある。`NodeMachineProgress.awaitCompletion` は当該 completion の deferred を保存し、正常な `confirmCompletion` がその deferred を解く。

同 worker の sweepMachine は、active execution でも pendingCompletion がある行について、原 consumed proof、同 source/current receipt/proofId、memory 状態を照合して回復し、`progress.confirmCompletion(row)` に進む。admit=false はこの回復処理の後、claim の前で return するため、新しい job を受け入れない。

しかし `packages/core/src/adapters/node/regeneration/runner.ts` の stop は stopped=true、interval 停止、active issuance sweep 待ち、原 input cancel の後に `await c.machine?.execution.stop()`、その **後** に `await sweepMachine(c, false)` を置く。`packages/core/src/adapters/node/llm/execution.ts` の原 stop は controller を abort した後、各 operation.done の allSettled を await する。operation.done は runOwned callback とその原 finally を含む。

したがって、callback が既に pendingCompletion を待つ場合、または停止開始後にその待ちへ入る場合、次の因果列が成立する。

1. interval が停止し、原 callback が同 proof の confirmCompletion を待つ。
2. execution.stop はその callback の operation.done を待つ。
3. confirmCompletion を実行する recover-only sweep は execution.stop の後なので到達できない。
4. server の allSettled caller drain も完了せず、共有 Drive の最終 stop に進めない。

abort signal だけでは当該 deferred は解けない。停止前に sweep を一回追加するだけでは、停止中に pendingCompletion が生じる分岐を閉じない。

最小補正方向は、原 execution.stop 待機中も、既存 runner の interval / wake 資源を用いた **admit=false の正規 recovery** を継続可能にすること。原 proof、deferred callback、stop Promise の identity・拒否、unknown 保持、共有 Drive 維持と caller drain の順序は保持する。任意 timeout resolve、手動 deferred 成功化、新 finish proof / ACK 捏造、unknown release は認めない。変更 exact scope と回帰対は Manager 採用後に決める。実装参加はしていない。

## 独立静的 PASS 部分

- server.node.ts は同 tick に machine / LLM stop と Drive queue/http quiesce を開始し、allSettled で caller drain を待つ。quiescing / shuttingDown を cached Promise として保持する。caller drain の原拒否を維持し、拒否時は共有 Drive final stop に進まない。
- DriveRuntime.quiesce は admission と timer を止め、tracked HTTP controller を abort し、queue と HTTP tasks の quiescence を待つ。共有 execution.stop は quiesce から呼ばず、final stop の段階に置く。stop の拒否も cache する。
- DriveRunner.quiesce の追加は queue / backup を止める。既存 `async stop()` からファイル末尾までの本文は parent と全 byte 同値であり、元 execution.stop / reconcileClosures / unacknowledged・predecessor guard / maintainDrive を保持する。
- sweepMachine の default admit=true は元回復と claim の順序を保持する。admit=false は回復後、claim 前で停止する。
- launcher の先行 quiesce と listener close、直接 shutdown、重複呼出の cached Promise という source 配線は保持する。
- 原 accepting/proof/ACK/current/unknown-release の守衛を弱める変更は今回差分に見つからない。R7 の論理対は prepare-only の source 証拠であり、native 成功証拠ではない。

上記 PASS は C0-F2 の停止循環を相殺せず、候補全体を受け入れる根拠にはしない。

## 固定候補・照合範囲

正本 phase `.goal-implement/phases/P5c-3-drive-machine-c0-shutdown.md` は 161055 B / SHA256 `ff1a0d3645bdfbc2c6a6ec2cc7a3a77595f569dcdf581da74419c6027bf9885d`。packed manifest は memory-only decode 281985 B / SHA256 `7acc683d389bd824035c4304f91e10d9e76f837b22cf6ebe79a91f6c8949a9b4`、正式 6 columns と照合した。

独立 Git HEAD / parent / tree / tracked clean を確認した。source regular1473 / 21297303 B と唯一 AGENTS 内部 symlink、各列挙 source の canonical・regular・UID・nlink・mode・full stable SHA256・Git blob を直接照合した。pair `aa502a7c6c6e519a5e009318fc850609d955fa191462ce285bf06d0b737aa58b`、shape `846e3c4b64c57631fcf53c385aa4e713c6b98518891829a2a09f973ed415f1a6` は正式表と一致する。fix6 / cumulative17、outsideFix1468 の parent table と working bytes は同値。fix6 binary diff は 7968 B / SHA256 `6943ada5546684fee3b370e0d503da2e256c152691e920822c5489c12e00f21e`。

直接読む必要がある正式依存は regeneration config、Node LLM execution / runner、listen.node.ts / nodeShutdown.ts に限定した。製品 six-path の full stable hashes、原 DriveRunner stop 全 byte 同値、原 callback / progress / execution.stop の source 因果を直接確認した。whole typecheck/lint/format、PUBLIC108/83、CF、先行レビューの不変更部分は主報告を借用し、再演していない。

## 限界・保全

actual shutdown、同時停止、pendingCompletion の動作再現、個別 native handle / proof / ACK / UI の証拠は本レビューでは取得していない。current / atomic refs / resource undo / 全 UI 等の未完条件を、この静的照合から完成へ昇格させない。既受入不変更部分を好みで再開していない。

初回 phase 表示で semantic header の切断位置を誤り、PUBLIC 圧縮 manifest の先頭を表示した。指定 print0 への逸脱を Manager に報告済み。以後は manifest heading 前の semantic 本文のみ表示し、decode / hash / source bind は memory-only で継続した。私的 data / raw proof の読取・露出と同一扱いにはしない。

判定: SOURCE 必須不足 C0-F2 により差戻し。Manager はこの不足と正規 recover-only 継続の補正方向を採用済み。source/helper/管理正本変更0、追加実行0。報告を固定して ALL read STOP。
