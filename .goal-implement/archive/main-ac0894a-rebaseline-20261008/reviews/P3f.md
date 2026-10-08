# P3f 独立レビュー

## 判定

2026-09-19 19:25〜19:43（+09:00）に完成候補を独立検証した。P3f-A〜H と変更された先行20枝、計28項目の変更範囲を合格と判定する。受け入れを妨げる不具合は検出していない。追加条件・追加の先行枝再オープンは提案しない。全体の受け入れと管理台帳の更新は Manager が判断する。

実装担当の報告を無条件に受け入れず、候補を独立固定し、Node 104件、pure 20件、追加独立 fault 1対、移行 clone、同 bundle の新専用対象だけの実 UI、終了保全を確認した。全742 unit / 359 Node / build と補足 UI の借用範囲、今回未検証は後述する。

goal-implement / manager-loop に従い、brief・design P3f・plan の固定28枝、原文 WS-10 / JB、phases/P3f.md 全125行、CLAUDE.md を照合した。pr-review の動作・構造・試験保証の観点と manual-test のブラウザ手順を使用した。Manager の独立 Verifier・製品修正禁止・環境単独所有・外部 Issue 禁止を優先し、PR操作や一般的な全環境cleanupは行っていない。spec / spec-implement は呼び出していない。製品・Manager 管理文書・goal API の変更は0。

## 固定候補と環境

開始時と終了時19:43:00.625に commit/source/bundle/lock が一致した。製品 worktree は clean、`git diff --check` 成功。未追跡は管理用 `.goal-implement/` のみ。

| 対象 | 独立確認 |
| --- | --- |
| commit | `05104add96bdec027e949ed2fd1efb444aa44f0b` |
| source | 857 files / `dea32757964d1225f7a4e348037be48c609e5e46b28e47305d77f6a8d7cf6d1a` |
| lock | `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` |
| server.node.js | `738a9275a141e9d0a27fe6622aa068fe25933627bfc5f59f25b7e8e2615039f9` |
| searchSupervisor | `c64c52954e3c50b8c22a2d24de708025bc58ed205568e38ea24383286b05116d` |
| searchQuery | `2a6d34250b870291850db8402b80c38b573c6e4b954e70312946df10e7d25055` |
| noteProjection | `55a3ab762a09b7b22abaf091dd1f8f1a3334942a1eb549929cd2714778694133` |
| runtime | Node v22.22.3、127.0.0.1:3000、APP_URL `http://localhost:3000` |
| fresh | `/Users/hikaru/.local/share/hollow/verification/p3c-20260911-dyHGjx` の `app.db` / `objects` / `mailbox` / `private/invitation.key` path |
| 新証跡 root | `/Users/hikaru/.local/share/hollow/verification/p3f-independent-20260919-f9RmHt` |

source 指紋は sorted/dedup `git ls-files -co --exclude-standard -z` の実 file から `.goal-implement/` を除いた `path NUL bytes NUL`。native は終了時の当該配信成果物の指紋であり、P3eから全て不変とは主張しない。独立検証中の build / dist 上書きは0。

起動前の3000/3001 listener・fresh DB handle・前PID72921は不在。19:30:53.116に停止中の DB と存在する sidecar、12 objects / 3,107Bを `start/` へ排他コピーした。新コピー同士の比較で実装担当の不変 `p3f-delete-20260919-mhDZym/final` と61表双方向差0、ledger25を確認。0023/0024の本体再適用や writer lock の手削除は行っていない。

既知の限定起動 `p3e-finish-20260919-udnRoV/server.mjs` を使用した。PID83532 / session89950 は19:32:07.680起動、19:32:08.118listen。削除前保全のため19:35:34.552にTERM/drain、19:36:02.194にexit0/systemErrors0。約28秒のdrain中、保全helperがopen DBを検出してコピーを拒否した。強制停止・liveコピー・並行再起動はしていない。

19:36:28.063に `before-delete/` を保全してから PID87160 / session27914 を起動、19:36:28.365listen。両PIDとも停止前にcwd・3000 listener・fresh DB pathを限定照合した。実行識別にPID番号だけを使用していない。

## 独立コード照合

41変更ファイルの構成と、新domain/port/application/repository/schema/migrations、UoW、既存purge/runner、writer/import/reference/media差分、通常Workspace repository、strict transport、root provider/panel/receipt/history/operation/model を照合した。P3eの共用batch方式や変更のない旧browse・editor全体を全面再レビューしていない。

- ownerと現在保存名は同UoW。本人同request receiptが存在する場合だけ同内容へ収束し、異内容を拒否する。GETはsession本人＋requestIdで照会し、任意workspaceIdの内部intent列挙を提供しない。
- active-only Workspace型とDB CHECKを使用し、削除行のcreator/name/description/createdAt/iconをnullへ縮小する。通常find/list/role/settings更新と既存scope policyがdeletedを拒否する。slug照合はdeletedも予約対象。
- 受理のfence、intent、本人receipt、通常job/current batch子取消、未bind失効、icon/invitation/continuation失効は同Tx。前に移出した成功子や他scopeの現在noteを親の旧sourceだけで取り消さない。
- 全current note数はSQL count、admissionはID順50件、1wake最大20step。本文全件配列や500capはない。専用内部purgeはintent＋deleted scope＋現在note所有に束縛する。既purge finishがcursorより先に終わっても、その同Txで対応を一意保存する。
- 回収はsession・membership・期限外本人receiptを権限にせず、durable intent/target、lease、現在所有を使用する。receipt90日は元受理から、旧jobの時刻と寿命を延長しない。表示件数だけで完了にせず、残note/資源/metadataと対応完了数を確認する。
- bound writerは現在note所有、未bindだけdraft/import admission所有。begin/register/publishと最終採用が失効を守り、active writerや未確認removeがある間はprovenance/chargeを残す。共通key claimを経由し、他scopeのcompanion参照を保持する。
- clientは最小3UUIDの未確認識別子だけを保存し、strict parse・actor別memory fallback・明示GET・確定分のみ除去を行う。自動POSTしない。server actor DTO、actor-keyed mountとoperation symbol、root epochを照合し、旧応答で別actorへ遷移しない。
- domain/applicationにframework/ambient clock/id/driver依存を加えていない。新0023/0024のみで旧migrationを変更していない。外部公開/Drive接続を実装済みと表示していない。

## 独立自動試験

| 実行 | 独立結果 |
| --- | --- |
| 19:30:23開始、15.63秒 | workspaceDeletion / purge、2 files・42/42成功（P3f27＋purge15） |
| 19:30:25開始、1.41秒 | workspace-deletion model / coordinatedObjectStorage、2 files・20/20成功 |
| 19:32:07開始、13.52秒 | batch / workspace / move、3 files・62/62成功 |
| 19:34:04開始、0.934秒 | 新 `fault.test.ts`、独立1/1成功 |
| 19:31:47.035完了 | 新cloneへ実0023/0024移行、旧56表447列双方向差0、70trigger定義保持、FK0/integrity ok、制約3対とdeleted縮小成功 |
| 19:37〜19:38 | typecheck / lint / format:check、全exit0・修正なし。既存36warning/34infoは残存 |

P3f27対の重点となる実装・assertを読み、実行結果と対応させた。実行範囲はexact owner/rename/dedup/非本人receipt、全入口失効、active/trash/先行purge、0件/501件、50件admission、lease/二claim/旧token、rollback、sessionなしboot、90日prune/actor消失、50＋1履歴、現在所有move、media/import/reference/conversion/icon writer、共有companion、通常job/batch取消と成功移出保持を含む。

501件の回収は隔離fixtureの502回以内の有限wakeとclock+2秒で完了した。実本体501件削除、実時間SLO、任意大容量転送を証明したものではない。batch回帰suiteに既存39,328,873Bの隔離codec/HTTP測定が含まれて再実行されたが、通常本体の巨大POSTを追加実行していない。これはP3fの新gateや巨大通常decoder成功根拠ではない。

独立追加1対は、既存27対とは別に記述した。新隔離DB・架空本人・専用WS・未bind media reservation3Bとsource/safe各3Bの小実objectを用意し、次を確認した。

1. 2keyのうちsource削除成功後、safe削除だけ人工失敗すると、safe実体と3B課算を保持し、本人結果はreclaiming/delayed。
2. 次のremove完了後にfixtureclockを61秒進め、lease切れでmetadata確定できない場合も課算を解放しない。
3. 有効な次claimで両keyの削除証拠を確認した後だけ0B/succeeded。同request再送と追加sweepでも二重変更・負課算なし。

人工fault/clock/SQL準備は隔離DBだけで、本体ディスク障害や実ネットワーク遮断の証明ではない。試験専用DB/objectは試験終了時にfixture cleanupした。freshの既存データを削除対象にしていない。

cloneは既知premigrateとfinal/startを新rootへDB/sidecarコピーしてからdriver接続した。保存された唯一の保全DBとfresh原本への検証driver直結は0。比較は値をDB内部で照合し、秘密列の値・hashを出力していない。

## 同bundleの独立ブラウザ

自己session `p3c-fresh-batch-p3f-independent` だけを使用。Chrome140 HTTP User-Agent、default timeout20秒/idle120秒をブラウザと既知auth helperに明示した。authは既知 `helpers/auth.cjs` の `fill owner|outsider` 実行のみで、本文は読んでいない。

| 操作 | 独立観測 |
| --- | --- |
| 専用新規作成 | 通常UIで新WS2、WYSIWYGで新note1を作成。before-deleteの新読取コピーでWS2 active/対象note1を確認。追加object0B |
| 390px確認 | 削除対象・取消不可・事前移動・受理≠回収完了の説明。横overflowなし。初期focus「確認を閉じる」、末尾space不一致disabled、Escape取消で元buttonへfocus、Enterで再開 |
| pendingと重複防止 | 通常削除POST後、応答だけfetch hookで保留。POST1、全入力/閉じるdisabled、aria-busy=true、Escapeでもdialog保持。応答を返してhook復旧 |
| 正常受付と回収 | 個人 `/notes` へ遷移しworkspace/filterを残さない。本人receiptは19:37:29受理0/1、明示更新で19:37:32回収完了1/1。元note詳細は表示拒否/個人への導線 |
| ACK不明＋保存失敗 | 第二の新zero WSで実POST成功後の応答だけTypeError、該当storage prefixだけQuotaExceededを注入。削除POST1、unknown/保存警告、390横overflowなし。新要求の自動再送なし |
| actor A→B→A | unknown GETを保留してowner signout→outsider signin。Bのunknown0/元対象名なし。ownerへ戻るとmemory fallbackのunknown1/保存警告を保持。POST計5は削除1＋auth4で、削除再送ではない |
| 同request照会 | 明示GETで第二要求の0/0 succeeded receiptへ収束し、unknown/保存警告が消えた。fetch/storage hookを復旧し、保留応答も解放 |
| 本人再訪 | `/notes/jobs` の本人削除履歴に自己2結果・90日説明が表示され、既存batch履歴と共存。390横overflowなし |

旧catch/newbusyについては、A→B→A後に別GETを保留して旧失敗を返す追加試行も行ったが、保留対象をreceipt GETに一意拘束していなかった。観測時は新lookupが既に収束していたため、「旧catch/finallyが新busyを維持した」という独立証明には数えない。該当保証は読んだoperation guard/pureと、実装担当の同構造最終UI根拠を限定借用する。追加の破壊UIや新gateは要求しない。

最後のoutsider jobs/削除済settingsへの再訪はloader完了を待った十分なsnapshotを得ていないため、独立UI認可の合格根拠にしない。非本人receipt/履歴とdeleted scope拒否は独立Nodeで確認済み。実actor切替中にBへunknown/対象名を表示しなかった観測とは分ける。

未保存入力の退避JSON、実editor失効後の次保存、旧loader/history page、old success/catch/finallyの各UI組合せを全部再実行していない。実装担当18:44の当該component不変部分と19:07最終bundleのroot memory/ACK記録を借用する。独立では現在sourceのguard、Node current認可、正常保存→削除→取得拒否、memory失敗と実actor切替を確認した。

## 項目別判定

先行20枝はP3f変更範囲と先行受け入れ根拠の適用を判定したもので、各元項目全体を全面再試験した意味ではない。

| ID | 判定 | 主な独立根拠・借用範囲 |
| --- | --- | --- |
| P3f-A | 合格 | owner/exact/rename/dedup/actor receiptのNode、strict transport、実不一致/取消/pending/ACKと明示照会 |
| P3f-B | 合格 | 既存scope policy/active find、全入口Node、実削除後note拒否。配布済bytes・旧snapshot限界は別 |
| P3f-C | 合格 | 50ID/20step source、0/501・先行purge finish・lease/二claim/rollback/boot、実0/1回収 |
| P3f-D | 合格 | current bound/unbound writer全種・move前後・shared companion Node、独立second-key/lease faultと課算 |
| P3f-E | 合格 | 同Tx現在job/batch取消、成功移出保持、invitation/continuation/配送0/icon失効、有限metadata回収 |
| P3f-F | 合格 | reduced row/slug、90日prune/session/actorなし継続と同request拒否、50＋1本人page、実history/最終DB |
| P3f-G | 合格 | 同bundle390/keyboard/取消/pending/個人遷移/本人結果/ACK/memory/actor。未保存退避と厳密newbusy等は限定借用 |
| P3f-H | 合格 | 内向き型/UoW/new migration、独立clone/104＋20＋1/checks/固定/保全/正常停止。全742/359/buildは自己最終借用 |
| P2a-D | 合格 | import reservation writer取消/終了前課算・実removeのNode、新fault。旧100件/形式上限は変更なし |
| P2a-E | 合格 | 本人DTO/receipt履歴、batch回帰、jobs共存/actor。旧import全UIは既受入と最終359内借用 |
| P2b-B | 合格 | media current ownership/active writer/late put/current・draft・history拒否、独立2key故障。既存挿入UIは不変 |
| P2b-C | 合格 | reference登録/最終採用/GC/finally fence、writerとcompanion Node。旧外部取得全体は不変 |
| P3a-A | 合格 | active-only create quota/slug予約、workspace回帰、実新WS2作成、縮小row保持 |
| P3a-B | 合格 | deleted find/list/roleとbrowse snapshot、一覧空成功への置換拒否、実個人遷移 |
| P3a-C | 合格 | 通常専用WSnote保存、import/media/原本/履歴fence Node、移出保持。三mode全体は既受入 |
| P3a-D | 合格 | current policy/全入口Nodeと非本人receipt、実actor非表示/本人再訪。最終outsider再訪は根拠外 |
| P3a-E | 合格 | writer/回収待ち課算、新fault、全16開始scope課算不変、既存trash/purge回帰 |
| P3a-F | 合格 | clone旧56表447列/70trigger、全旧データ/object保全、型/checks/390/固定 |
| P3b-1-D | 合格 | member失効と全actor通常job取消、irreversible purge継続、workspace回帰。実editor未保存UIは限定借用 |
| P3b-1-E | 合格 | active-only settings更新、rename中旧確認拒否、実一般設定/削除、旧本文/版全列保持 |
| P3d-2-E | 合格 | bound current ownership、移出draft継続、削除後旧writer採用拒否、move回帰と小実object課算 |
| P2d-2-A | 合格 | typed workspace causeとintent-bound内部入口、existing purge共有/所有照合、purge15回帰 |
| P2d-2-B | 合格 | commonkeyclaim/active writer、第二key故障・期限切れ確定拒否・一度だけ課算解放 |
| P2d-2-C | 合格 | finish同Tx対応、旧purge15/共有companion/旧receipt保持、実自己note1回収 |
| P2d-2-D | 合格 | runner接続/boot/session不要/lease/backoffと回復、正常stop。旧期限policy全体は既受入 |
| P2d-2-E | 合格 | clone/保全/新schema/型/有限I/O、隔離故障・390実UI、自己削除/回復限界・終了記録 |
| P3e-B | 合格 | root provider責務/actor keyと操作symbol、実A→B→A/current unknown、既存selection方式不変 |
| P3e-G | 合格 | batch回帰と現在子取消/成功保持、actor history DTO/90日、jobs共存。旧retry UIは不変・限定借用 |

## 保全・自己破壊量・全停止

新root/directoryは0700、保全DB/payloadは0600。`start/` 19:30:53.116、`before-delete/` 19:36:28.063、`final/` 19:42:43.301を作成した。全て停止後DB/存在sidecarの排他コピー。既存実装rootのstart/premigrate/final/比較JSON、P3e保全は書込0。

`comparison.json`（19:42:45.187）は新しい `compare/` コピーへ接続して旧61表の全旧列/旧行を照合した。業務正本の変更・欠落0、trigger定義差0。FTS内部 `note_search_data` 1行と `sqlite_sequence` 1行だけ新規作成/削除に伴う内部更新。SQLite integrity ok/FK0。

| 保護対象 | 開始→終了 | 独立結果 |
| --- | --- | --- |
| notes | 103→103 | 全旧列保持、全active |
| tags / originals / assets | 31 / 9 / 2→同数 | 全旧列・関係保持 |
| revisions / heads | 111 / 95→同数 | 全旧列保持 |
| active WS / members | 9 / 15→同数 | 全既存行保持 |
| batch parents / targets / attempts | 19 / 48 / 51→同数 | 旧全列保持、success43/failed6/cancelled2 |
| objects | 12 / 3,107B→同数 | 全相対path/bytes/SHA一致 |

開始時の全16scope（personal3＋既存active WS9＋既削除WS4）を同一の正規capacity queryで比較して全て一致。保護対象のpersonalは2320/0/0B、active WSは516/0/0/0/75/0/113/83/0B、既deleted4は0B。capacity provenance違反0。最終未終端deletion/purge/batch、active writerはいずれも0。

今回の破壊対象は事前保全した新規分だけ。

- WS `01a0b93a-f558-756f-a5b4-28e573f73c0f` — `P3f independent 1935`、削除前note1。新note `01a0b93b-cb66-7608-b0e2-3bd0ff58c11d` を物理回収した。新slug `p3f-independent-1935` はdeleted縮小行で予約を保持。
- WS `01a0b93c-2e03-724b-8e7c-614d2b6793dc` — `P3f independent ACK 1935`、削除前note0。
- 最終の自己intent2はsucceeded、対応完了は1/1と0/0。新WS2/member2を削除・縮小、新note1を物理削除。fresh objectの追加/物理削除は0B、既存tagやfileの削除0。

通常アプリのundo/restoreは不可。before-delete DB/objectsのコピーを保持するが、コピーからの復元は未実行であり、復元成功とは主張しない。既存P3e独立WS/note/113B原本は全て保護対象として保持した。

試験helperの準備上の失敗を製品欠陥と分ける。最初のbundle pathとVitest config import pathを訂正してから照合/実行した。初回authは127.0.0.1ではhelperの既知APP_URL条件に合わず、localhostで成功。停止直後の保全はopen DBで拒否され、正常exit後に実施。before-deleteの最初の追加読取コピーはWALを含めず新対象が見えなかったため判定に使わず、新しい別directoryへDB/全sidecarをコピーして再確認した。唯一保全DBは変更していない。画面外buttonはscroll into view後に通常clickで確認した。

19:41:49に自己browserをcloseし、PID87160のcwd/listener/DBを照合してTERM。19:41:49.377drain→.382exit0/systemErrors0。19:43に3000/3001 listener、fresh DB handle、PID83532/87160が不在。全test/check/helper sessionは終了済み。保留browser応答は解放、fetch/storage hookを復旧してから自己sessionを閉じた。

最終全742 unit・359 Node・19:17 buildは同候補の自己報告から借用し、独立再buildはしていない。外部LLM/OAuth/メール/Drive/公開/export、他runtime、課金/deploy、巨大通常decoder、実時間90日経過、実大容量/SLO、未保存JSON再取得は今回独立成功に含めない。後続P4/P5の未実装入口、D01/旧37objects、旧環境復旧は別に保持する。

秘密鍵・credential・auth helper本文・cookie・env・全argv・raw runtimeログ/HARは取得・出力0。旧tmp DB/objects/runtime1053、recovery/D01/旧signin等は無操作。外部Issue/API送信/課金/push/PR/deployなし。

再開時は次の所有者が同fresh、Node22.22.3、候補/source/bundle、port/DB handleを再照合して既知safe wrapperを使用する。ledger25のため0022/0023/0024再適用とlock手削除は不要。本報告通読後、文書編集を含む全自己操作を停止してManagerへ返却する。

19:47台に本報告を全文通読し、時刻表記と重点assertの読取範囲を明確化した。新規試験や破壊UIの反復は追加せず、この報告編集をもって全自己操作を停止し、停止中の環境と保全をManagerへ返却する。
