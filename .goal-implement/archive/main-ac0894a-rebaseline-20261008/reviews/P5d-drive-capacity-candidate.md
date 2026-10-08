# P5d CA67 candidate 独立preflight

判定: 限定STATIC PASS。RootのPUBLIC precheck→既default preflight→fresh ONE採用判断へ返せる。実fixture/case/ACK保存/閉鎖/audit/時間適合は未実証。P5d E/F/Gの容量保護・保存済ACK回収・matched prune候補だけであり、A–H完成や退会成功を認定しない。

## 固定根拠

直接stable NOFOLLOW fullread: phase P5d-drive-capacity-candidate.md 30151B/c2c8940bdb84ed797dc57deed718b2d3ecba3dd1b2b4e0092eab12274a7e8851、new runner25257B/a23139fe143733c5413ce8372cabd53e97309d3ab2029b9dce77d246ee0f29cb、new loader24441B/51ed0bbc7ae1bde600535a54af0a20d8c838afeac8095ea434d28e272928c5db。全canonical/selfUID501/regular600/nonlink/nlink1、前後dev/ino/size/mode/mtime/ctime同値。

SOURCE /Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006。独立Git HEAD abdac900e012d4e93550ed905f8ecee3b300ac8a、parent e30bb941572fcfb4253a25b5a04a27bbf41276b1、diffは新test/fixture2追加だけ、tracked clean。known98本文1911367Bを全stable fullhash/mode/Gitblob照合、pair9a890e7eff557b604209e8fe3be18019032634c7880b260c3b3c538328478b60一致。shapeはphaseのactual modeを`0o600`等文字列で表すcompact JSONとしてaac01127eec9f95e58d3ef05458f94b27cb5387dc6ce60b39fb000caddad8547一致。整数mode表現とは別である。outside2 Git差0＋現98のHEAD blob一致により旧96の不変更を確認した。

新test8134B/fa4b0d2a10f892f6146ef4d1619d0ba3d4e1771bcabac11d34f3fbdd1eb2db44、fixture18625B/23a243d52767e7c921c5afeb892b27ae476b6a195b76d216dbb7113f0382c2d3。原PUBLIC DA helper2（p5d-drive-ack-runner.py25757/4a534a943b6718bf53f5d922968b91f58874e3d26416ab14974169a2e4a58d5b、p5d-drive-ack-loader.mjs24501/945e45276d346b9b12d3cc7e6b0c05e82a62848d0a45845c4bd30f081fe05fe4）もRoot採用exact pathからstable全文を読んだ。全changed spanを直接比較し、対応逆置換で各原全文bytes/SHAへ復元一致（runner15 spans、loader12 spans）。旧embedded private rootの操作0。

PUBLIC108 pair5e9019cbdd3ee8374040e3659b5cdbad6710604f5212a05c568f7136acbdad21とCF986B/1803d60aa0818e5a3a7630807466ffaae8fdeb0fd85b7fa59431638fc5a479faの不変更、whole typecheck/lint:fix/format各0、loader Node syntax/限定公式API型check0は作者固定報告を借用。今回は108 targetやCFを再走査していない。runnerは直接AST parseのみ、target eval/import0。規定checks exit0を内部install/download/native無操作の実証へ転用しない。

## 正規caseと所有/保存契約

一case CA67、browser1/session1/account1/intent0。drive/connection.tsの原begin、原exchangeとgenuine createNodeDrive/acquire/storageを使い、factory/native events/caller/proof/ACK値を捏造しない。empty codeによるDRIVE_UNVERIFIEDはresource0のlocal-closeでありHTTP/socket/TLS positiveではない。

5件ごとの600001ms×13はdomain authorizationMs600000/browserRecent5/browserAttempts3に沿う。各begin直前に元captureAuthenticationとfolderConfirmation、期待actor/authVersionを再確認。67件の正常終了後68件目のpendingを作り、Node execution.ts:233–245のentries+previousProofs+receipts>=67が原claim前に拒否する。testは同pending row全文不変、owner-none、ACK数67、maintainDrive0を確認する設計。同stateを再beginせず、receipt回収後原exchangeで正常再開する。

deletionWorker.ts:19–42は原acknowledgedReceipts25→元saveのcommit成功→元exact readのcommit成功→元verifyのままconsume。fixtureは同元receipt objectを観察し、afterCommitはdrains/readのmemory観測だけ更新する。testは25/25/17/1、各receipt `toBe`、consume後verify=false、DB ACK68/intent0/debt0をassertする。native ACK wrapperはnon-asyncで原receiver/args/Promiseをそのまま返す。client execute/batch/transaction、同transaction各method、原UoW.runのPromise/handleも保持する。

限定注意: repository saveDriveAcknowledgment/driveAcknowledgmentのobserverはasync wrapperであり、repo原Promise identityは保持しない。元methodをawaitし同resultを返す型付き境界で、原errorをcatch/成功化せず、falseをtrueへ変換しない。元u.afterCommitへの観測登録以外の人工wait/gate/タイマー・DB保存/ACK/consume代行0。原runは同Promiseを返し、変えたrepo methodをfn終了finallyで復元する。必須のnative ACK/client/tx/UoW Promise identityとこのrepo observerを混同しない。現採用契約にrepo Promise identityまでの要求が追加されない限り、この差を起動blockerにしない。afterCommit/保存/読戻し/consumeの実成立はONEで確認するまで未成立。

接続versionはensure1+原begin68=69、epoch0/settings1、同68retryで追加begin0。通常never-linked credential/folderNULLを保存期待に使い、後付観測値から期待を作らない。historyMs+1進行後、maintainDriveのready/pending/unACK/predecessor否定guard→driveRepository.ts:734–779のmatching ACKを要求するprune→同UoWでattemptとACKを削除する原経路。全68件はpruneBatch100内、final attempt0/ACK0。90日後のsession有効性はassertせず、開始時の正規認可と区別する。ageだけからclosure/ACK能力を作らない。

## 有限工具とnormal gate

変化はfamily/code/title/checkpoint/prefix19/DB名/fresh binding/source98/audit期待/LOADER_SHAとframe512制限だけ。network/DNS/listen/Worker/business child拒否、stock originalFork receiver/args/元handle、cacheFsfalse公式pool、正常監督・FSのexact inode制限は原DA全文と同じ。新pool名は非builtinで、実forkとそのstdlib eventsを監視する原方式。原requested SIGTERMによるtool正常停止とouter TERM/KILL forceを分ける。fork stdout/stderr ENDとhandle exit/closeは個別gate、IPC EOF/FD NULLは未観測として残す。

Node24.18 canonical/version gateはVitest/fixture前。case/hook40・suite/body180・outer240（body後tail30を含む）/200ms/TERM10 KILL10 PIPE10、fork1/Node1/Python1、root192MiB/DB1+sidecars32MiB/合計64MiB/TMP8/log2/control40×512を維持。新ROOT493ea817とderived tool TMPはmemory literalだけ、fresh existenceも未probe。

Root採用CA67専用UoW768/client methodsとstatement slots各12288。source-derived nominal UoW701、保守statement upper9730は上限内だが実計数・40sec適合の保証ではない。native内部statement/thread/FDをcounterで証明しない。ACK observer上限68/guard attempt68/ACK68、owner/storage exact metadata予算は正常author proposal通り。固定最大diagnosticは512B以内、control20480B、material53536B<262144。未知/false/overflow/denial/diagnosticはheldへ。

原fixture stop(password/execution)→FK/integrity→checkpoint await→finally client.closeとfixture-closed frameを維持する。checkpoint tuple000の新assertは無く、clientClosed boolは物理FD証明ではない。正常case/file/afterAll/fixture/frame、Node actualexit0/ownPG absent/両EOF＋実stream.close return/closed四値normalPipeCloseReceipt、force0/strict guard成立後だけsame DB1 readonly/query_only auditへ進む。新opaque/audit DB追加0。SQL期待はactive1/session1/browser1、deleted intent/debt/use/origin/otherfamilies0、version69未linked shell1、attempt/ACK0、45 migrations/guard79以上。SQL結果からnative proofを発行しない。非0/未知/deny/force/閉鎖欠測ではaudit0・永久held・retry0。

## 未検証と返却

このSTATIC PASSはTool起動gateだけ。実67 native ACK・68preclaim拒否・同68成功・4durable drains・prune・実40sec/呼出上限・normal observer realm/import/stockfork/DB終了/auditは未実行。Root direct PUBLIC bindings/precheck→既runner default preflight結果確認→ONE --executeを別採用する。defaultも今回は実行0。

既LD01/DA01局所受入と未変更sourceは再演しない。unknown/ACKfalse/legacy/65系列/final account deletion/full-copy/並行競合/browser/Google/実外部HTTP/全A–Hは未完。resources0/原save-read型・nonnull proof・checkpointはphysical nativeコピー閉鎖の代替でない。

全target read STOP。source/helper/product/Manager/main/C0/UI変更0。default/preflight/runtime/import/rootprobe/create/DB/key/native/browser/network0。全旧・新・成功・失敗private root/results/cache/proof/TMPへのstat/read/hash/copy/reopen/replay/cleanup0。

UTC: 2026-10-06T11:24:01.554972+00:00
