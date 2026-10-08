# OWNER-RACE1 独立候補レビュー

判定: **LIMITED static PASS（SOURCE2／工具2の新 delta のみ）**。
現時点で SOURCE の型・工具の通常閉鎖条件を変更すべき決定的不一致は確認しない。Root が別途 direct precheck → 既 default preflight → 一回 actual を採用するための候補として扱える。実行許可、OR01 合格、native／private proof、ACK、P5d 全受入を意味しない。

Reviewer は OWNER-RACE1 SOURCE2／helper2 を実装していない。元 CA 工具と既 source98／受入済み wholechecks の意味は借用し、独立判定の範囲を今回の変更に限定した。SOURCE の全 walk、Git／HEAD 確認、default/preflight、Node import、Vitest、DB、root probe／生成、未知 public target、全旧 private root の stat/read/hash/import/copy/replay/cleanup は行っていない。SOURCE／helper／Manager／main／UI は変更していない。本レビュー新規一ファイルのみを wx0600 で固定した。

## 固定 PUBLIC 入力と独立逆差分

全入力は canonical regular、nonlink、UID501、nlink1、mode0600、O_NOFOLLOW fullread、開いた FD と path の前後 dev/ino/mode/UID/nlink/bytes/mtime/ctime 同値、full SHA、実 FD close を確認した。

|入力|bytes|SHA256|
|---|---:|---|
|phases/P5d-owner-race-candidate.md|31824|928e9c7e4f9a7d09b9f1f7c76533935fcbb1ec3924c00558945ea38c394dcb49|
|helpers/p5d-owner-race-runner.py|24577|d0ea54629344656661c9ab473912ce8096f57bf88b7d5ce0ad33836f1ffa2d3e|
|helpers/p5d-owner-race-loader.mjs|18517|5cc1e5071d743cf31431d7ca8081c4c29771ba55073e3420c774362a472162b9|
|phases/P5d-next-local-family-plan.md|16417|5998800e982204aa2c46c4fb8684ed68446fabef5fc6aac3e23950b0299d6572|
|helpers/p5d-drive-capacity-uow-runner.py|25589|780b3e4b058adf52001374ca1dccddeea1135408c853499bf1a85b82ed7b355a|
|helpers/p5d-drive-capacity-uow-loader.mjs|24711|9af650917c662a7d9c053972a85de49ca6bff61b7fb2eedbac38160f86adc21a|
|phases/P5d-drive-capacity-uow-candidate.md|32036|8ec8337c6c48a786d217bc62c408d75aa6ddc6cf628ea86ccf7215bcade60570|

runner 15 changed hunks と loader 14 changed hunks を独立に逆変換し、元 CA 各全文 bytes／上表 full SHA へ直接一致した。小部分 hash の一致だけではない。runner Python AST／cache を作らない compile は成功。helper 本体の import／eval／実行はゼロ。loader Node syntax と SOURCE wholechecks は author の既固定結果を借用し、自分で再実行していない。

SOURCE candidate は 5481756c8b3521fdb35c6750c9954955a4d9f2a3、parent 55ef3b226babeb6269654c66dbe0198eae35d366 の申告 binding。候補 manifest100 の旧98行を元 CA 表と比較し、relative path／bytes／mode／SHA／Gitblob の全値が同一、新規は下記2のみと確認した。100行1933953B、sorted path-space-SHA-LF の manifest pair は 57192637427786821864c309239bc32b4858b663c2f7649d17a6badcd31ab29d で runner 定数と一致。物理 SOURCE100 全体／HEAD／未知 entry 不存在を直接観測した主張はしない。Root の将来独立 precheck が必要である。

|新 SOURCE（libsql/__tests__ 以下）|bytes|SHA256|memory Gitblob|
|---|---:|---|---|
|accountDeletionOwnerRace.integration.test.ts|6478|e37472600f4f98fa50f63c23ffa15a136a3412afc98d5ff76d57465fb2123356|ed0042d58c748ee5e1c2ffeb064bec39ee3108da|
|accountDeletionOwnerRaceFixtures.ts|15150|7504d3ece2386fb2528427d9885401509223948c6b2bcd1bfabbec8d9b138056|7f0c69aaad0b3a67757b270036b788bc398a1f66|

この2ファイルは own public SOURCE の exact listed path だけを mode0600／stable fullread し、memory Gitblob を直接検算した。既 source selected read は client.ts 2372/0fa9c5f6、hollowUnitOfWork.ts 12224/b6434a06、accountDeletionRepository.ts 65709/23a03b0d、application/account/deletion.ts 1542/da08ec61、formal extra9 の serverHollow.ts 1605/f22807b3 と session.ts 2714/da6abc18、manifest-listed authenticationExecution.ts 4807/a4cf2349 に限定した。各 full SHA は固定候補表と照合、actual600（repository/deletion は formal644）／UID501／nlink1／NOFOLLOW／前後 stable。未知 import 先は読まない。

## OR01 の SOURCE 因果

sole required case は `OR01 preserves an active owner when two original clients request retirement concurrently`。元 createLibsqlClient が返す別 client2 を即時台帳へ登録し、それぞれ applyPragmas／drizzle／正常 createHollowContainer を接続する。libsql local serialization は client ごとの原 wrapper であり、2 client 間の人工 global limiter／Tx barrier は加えない。migration は first client だけ。両 account は createAccount → verifyAccount → repositories.save → issueSession の原 domain/UoW ports を使用する。HTTP signup 成功、メール送信、外部 auth/native proof の正例に転用しない。

workspace 原 createWorkspace 後、同 UoW で second owner を登録して workspace-owned note1 を作る。race 前に whole workspace/note snapshot を保存する。外 caller の Promise.then で原 deleteAccount2 を開始し、2 call が settled0の時点で到達したことを独立に assert。fixture の passive transaction observer は別 lane2 request の重なり、actual returned Tx handle2、completed2、observerFault=false を assert する。これは original API request の interval overlap であり、同一 nanosecond／SQLite lock／native transaction 実行の同時性を証明しない。

client.execute は captured original bound method と original argument count を保ち、batch／Tx methods は original this/args/return を維持する。transaction も original Promise を caller に返し、観測用 then を先に登録する。success/rollback/close の実原 API callback から completed を記録し、別 handle、fake transaction、Promise clone、内部 client/Tx gate、原 error の書換えは作らない。UoW run も元 callback／Promise に透明委譲する。

requirement は accepted1 と same-realm BusinessRuleError WORKSPACE_LAST_OWNER1。BUSY／native DatabaseError／timeout／observer fault をこの業務拒否へ置換しない。元 repository.accept は same Tx で active workspace の最終 active owner を検査し、同 Tx で deleted shell CAS・queued intent・sessions/profile/membership removal を行う。accounts2 のうち survivor active/auth1、retired shell auth2/intent fence2/version1、live session1／owner1 を case で検査する。whole workspace/note は race 前 snapshot と deep equal、外部 note/workspace 値を人工期待へ変換しない。driver の争い方がこの outcome を得られるかは将来 actual の事項であり、static で PASS を補完しない。

## 原 API 閉鎖と監査

正常 fixture は両 BoundedAuthenticationPasswordHasher.stop を await → outstanding original observers settled → FK/integrity → original wal_checkpoint(TRUNCATE) の busy/log/checkpointed all0 → actual client2.close → direct closed getter2 → wrapper restore → exact fixture-closed marker の順。元 bounded hasher.stop は新 hash/verify を拒否し既 running Promise を allSettled する公開契約であり、物理 native worker/thread/resource の終了 proof ではない。本レビューでは未許可 NodePasswordHasher body/native package の追加調査をしない。

close は idempotent。finally で両 original client.close を独立に試み、原 close error は保存して再送出、unknown を normal marker にしない。failed/observer fault は sticky failed となり marker を出さない。setup failure は登録済 client を独立に close、stop handler が成立した範囲で元 hasher stop を試み、元 error を再 throw する。setup の未成立 receipt を成功へ補完しない。bounded timeout は cancel／成功化ではなく reject である。

loader は exact test include/full OR01 name/one original fork。official reporter ready/result、sole passed case、afterAll end、fixture marker を要求する。原 stock fork exit/close と stdout/stderr EOF の gate は元 CA と同じで、正常 Vitest SIGTERM と Root force は区別する。IPC EOF／public channel release や child per-FD close が未採取である点を補完しない。stock constructor/module identity、original fork receiver/args/return、FS/network denial が維持される。

runner: actual Node exit0 + actual2 PIPE EOF → same known PG absent → exact summary/case order/pass/closed stage + fixture marker1 → stdout/stderr close が両 returned かつ closed true → 240s 内の readonly audit。runner lines298–301 の4独立 bool gate は audit より前に存在する。未知/nonzero/force/denial/missing marker は normal/audit acceptance にしない。failure の known PG cleanup と raw discard は元 CA の有限役割を保持する。unknown PID の scan/signal はない。

監査は same registered DB1 を readonly/query_only、FK/integrity、fixed migration schema と dev/ino/size/mtime guard の下で開き、finally 原 close が成功して初めて normal return。原 source の whole snapshot assertion と、audit の counts/fields subset は別の証拠。expected accounts2/active1/shell1、WS1/owner1、note1、queued intent1、live session1 は source-derived 期待であり、現在の actual DB 実数として報告しない。objects/Drive/provider debt/native proof/ACK/resource retirement/LLM/Google/OpenRouter は未実行であり全 P5d criteria を満たすとはしない。

## 借用工具の観測限界と候補文書の表記

候補 phase の `sameTestCase` は強すぎる表記である。元 CA Reporter と今回 Reporter の両方に ready 時の TestCase object を保存して result object と reference-identity 照合する gate はない。今回独立に確認したのは公式 ready/result callback、exact full case name/code、sole result/status/order の拘束である。直接 same-object identity receipt は未採取。これは元工具からの借用限界であり、新 delta の不合格根拠／normal gate の追加強化にしない。候補文書の説明をこの実装可能な観測範囲へ訂正し、直接 identity を観測済と主張しないことを Root に返す。原 Reporter をこのレビューで改造しない。

## 有限予算と未採用条件

new ROOT p5d-owner-race-20261006-ae972c41 と sibling -tool-tmp は memory literal のみ、存在 probe 未実施。pinned Node24.18 formal gate、SOURCE100、PUBLIC108/83、CF986、extra9 と元 migration45/1534 は既 fixed scope の借用。新 public package install/download/broad walk はない。

DB1/client2、UoW nominal10/cap32（account2、WS1、join1、snapshot1、delete2、currentUser2、final1）、race transaction2、observer cap64、client method/statement 各4096。API calls、batch statement slots、native internal SQL の回数は別概念であり APIcount から native 回数を推定しない。正常 BEGIN/terminal observation は各 UoW に従うが current actual count ではない。ROOT192MiB、DB+wal/shm 実 guard32MiB、TMP8MiB、raw2MiB/log2MiB、material256KiB、40frames×512B、case/hook40s、bounded10s/migration30s、body180/outer240/sharedtail30/poll200ms は固定。source/deps count を actual running owners 数へ転用しない。

SOURCE wholechecks は author 固定成功結果を借用。独立 review は runner AST と全文 inverse／manifest/table／selected source 因果まで。将来 direct full SOURCE100/metadata/public binding precheck と default inspect が全 PASS の時だけ Root が別 actual scope を採用する。現 runtime/default/actual/root probe/DB/private 操作はゼロ。unknown-driver behavior、lock timing、source method閉鎖の実 receipt、audit counts はまだ未観測。

固定後 ALL reader/writer/runtime STOP。次作業は別 Root scope のみ。
