# CA67 UoW budget — SOURCE-derived correction plan

固定日時: 2026-10-06T12:05:55+00:00
提案: **正常 nominal837 / bounded settle upper905 / CA67-only UoW cap1024**。cap変更はまだ0、製品repair0、SOURCE/helper編集0、default/preflight/actual/probe0。正常nominalを実観測769等から逆算していない。旧701の欠落を正常callgraphで特定した。元begin68/ACK68/pages25,25,17,1/prune68/version69、client各12288、40秒case/body180/outer240、normal closure/audit/proof gatesは維持する。

私は旧CA67本体作者として新予算を計数する。今回safe実結果の分類は別 .goal-implement/reviews/P5d-drive-capacity-drain-code-actual.md 4,501 B / SHA256 34da06755d3e6695e7178dd436d194b1339bf191c18d5223eec275c281ee796f に固定し、Root receipt借用/producer静的対応を区分した。次の予算candidateは別担当の独立reviewが必要。

## 固定 SOURCE と追加読取の区分

controlled SOURCE /Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006、HEAD e55b08cbb691835736c8e14392ee025b1eaba99a / parent abdac900e012d4e93550ed905f8ecee3b300ac8a。原98 = 1,912,323 B / pair596af1dd4ea11581035e84baa5a0a06985aff73dd85c948013198cc5ce55d0d4 / shapee9cc3a7baca0fec0bbd847b460b57842ed552c936a9693bff4de83fe3c40ae8b。旧96/source2 の全文保持根拠は前diagnostic reviewの直接検査を借用。今回 SOURCE98 内の fixture/test、deletionWorker/drive.runner、NodeDriveExecution、LibsqlHollowUnitOfWork の relevant callgraph を限定読取した。

Root追加採用9個は計数補助根拠。各個別cap65,536 B、canonical regular/selfUID/nlink1/actualmode、O_NOFOLLOW/fullstable前後metadata/元FD実close、HEAD exact Git blob一致。合計56,867 B。現helper98manifestのscope/countをこの報告で勝手に107へ変更していない。次candidateでもこの9個は変更0、必要起動前Root独立publicprecheckでは下表の固定同値を補助確認できる。

| exact SOURCE relative path | bytes | actual mode | SHA256 | HEAD blob |
| --- | ---: | --- | --- | --- |
| packages/core/src/application/integration/drive/connection.ts | 17913 | 0o600 | dab47422012091b38b34e1f2cf8a6b8437857415933c9bc1558834b974e0bb9a | 0a750abd90e33d0a544cb074b763b2b1936a2e74 |
| packages/core/src/application/account/context.ts | 4135 | 0o600 | b3c957cbd478d2d6b64e5442449dc683174aeadd42b1ac4d3811ca7fd4c2ede4 | f736dbe816ffaac1a04569adc51c2521699e7186 |
| packages/core/src/application/account/session.ts | 2714 | 0o600 | da6abc18ed13ba468aa617735c99d554377dc83ad41cac34affcc34f5a3b3118 | 7687e4d15cdc84c83b2f60ad69933eef8721795f |
| packages/core/src/application/integration/drive/current.ts | 4725 | 0o600 | 36cf60994500b9d8e944a6fb5a0ccc2f76301b213bfd7b1dc59f978aeac35c70 | ff9648c7d60e6a437863bd8a6ae8f9bbead404b9 |
| packages/core/src/application/integration/drive/control.ts | 12022 | 0o600 | c63df7661712ff2ca696a3b69c2070054c2c144cadd8949b828f35d897739525 | 71fe6c26a01317bcfb2a48425af410671bca9aeb |
| packages/core/src/application/integration/drive/backup/cancellation.ts | 1277 | 0o600 | 29ba9c3fe766061b93885416c14f1e37c9403937397154127b0e52fe120f23ac | 1c0570f032c9fbae693360ddf6acd3e1d8e9bdee |
| packages/core/src/adapters/node/coordinatedObjectStorage.ts | 9473 | 0o600 | 549c01041320a5450a586a6293c17c3a11403b375524f2099ca94895a8f43d92 | 4586e523bc86b148a243bb1e6f246a94ce0c7eda |
| packages/core/src/adapters/node/drive/factory.ts | 3003 | 0o600 | 6f7ef37efe43c8fa62ebab67d3841162ad28c763deff4898e94a58f896854405 | fda22f505f9fa558f4b53efea3a2dade8488e640 |
| packages/core/src/application/di/serverHollow.ts | 1605 | 0o600 | f22807b3d988dd46d7d1b992786a9eec5d99a24853be08baa4a34998abd8765a | b0ee178f51d3f95688bde1be9cae354d71d5a303 |

提案時の application/integration/drive/services.ts は exact path不存在（選択path lstat失敗・body0、pinned HEAD ls-tree exact結果空）。unknown fallback/探索は行わず、connection.ts正式importのcurrent.tsをRoot別採用して読取した。

旧PUBLIC予算報告 .goal-implement/phases/P5d-drive-capacity-candidate.md 30,151 B / SHA256 c2c8940bdb84ed797dc57deed718b2d3ecba3dd1b2b4e0092eab12274a7e8851 をfullstable有限読取し、nominalbudget節:25–27だけ計数比較へ使用。旧root literalは比較文字列のみで操作0。

## counter の単位

fixture:302–312 の original.run wrapperを通る一呼出につき ++unitOfWorkCalls 一回。originalRun(fn)の元Promise/result/receiverを保持。UoW callback内のrepository SQL数、driver内部retry、afterCommit通知数、coordinate lane、native ACKはこのcounterと別。LibsqlHollowUnitOfWork:102–240は一transactionを実行し、commit後通知を呼び同resultを返す。callback保存observerはafterCommit memory更新のみ、再 original.run は発行しない。

browser/account/auth現在確認は可能な限り渡されたu/context内で読む。captureAuthentication(context.ts:42–75)、driveActor/current(read/current.ts:26–126)、sameDriveActor(control.ts:24–33)、driveFolderConfirmation(connection.ts:57–89)/backupImpactIds(cancellation.ts:27–38) は追加run0。渡されたu内repo I/OをUoW一回と混同しない。

## normal callgraph — source先定義837

| phase | original.run 回数 | exact SOURCE 根拠 |
| --- | ---: | --- |
| initial storage recovery | 1 | coordinatedObjectStorage:148–150 newresource.ready が uow.run(recoverWrites)。recoverOwners:155–157は同ready awaitだけ。fresh root一回、再storage生成なし |
| setup account/browser/session | 2 | fixture:533 ensureAuthenticationBrowser→context:33 のrun1、fixture:537 account save+issueSession のrun1。issueSession(session:15–36)は渡されたaccounts使用、追加run0 |
| initial connection ensure | 1 | test:72–74 の一run |
| confirmation before each normal begin | 68 | test:76–87 の一run内 captureAuthentication + driveFolderConfirmation |
| normal begin selection/current confirmation | 136 | connection:137 selection と:256 current validation 各run1、68×2。freshcommand branch、再begin/digest conflictなし |
| normal exchange initial read | 68 | connection:274 findByState、68×1 |
| normal claim | 68 | connection:283 prepareDriveClaim→runner:181 run1、68×1 |
| normal settle | 68 | runner:459–508 settleOwnedResultの第一 callback→:460 run1、68×1 |
| saved owner closure read before native ACK | 68 | runner:197–216 acknowledgeSaved→:204 run1、68×1。ACK自体run0 |
| adoptDriveCandidate early guard | 68 | connection:434から:448–457へ。row.data.phase failedでも:449のrunを開始してからfalse返却 |
| normal return phase read | 68 | connection:435–438 run1、68×1 |
| normalComplete saved row assertion | 68 | test:110 provider.run(find)一回、68×1 |
| capacity68 extra complete initialread | 1 | test:149 complete(pending)→connection:274一回。execution:228–245 capacity拒否はclaim callback:261より前なのでprepareClaim/settle/adopt/return0 |
| capacity block/pending checks | 3 | test:145 beforefind、:152 afterreject find、:187 afterdrain67 pendingfind 各run1 |
| maintenance normal two calls | 6 | test:156/:212 maintainDrive 各3: runner:516 held scan、:695 held scan、:749 prune admission。required rowsはownerclosed/held empty/unACK/predecessor0。初回readyreceipt67のためprune return0でも第三runを数える |
| four sweeps save+exactread | 136 | deletionWorker:32と:38が正常一receipt各1。68×2、sameproof/commit/read/consume順不変更 |
| four sweeps no-intent claim | 4 | deletionWorker:193各run1、intent無し:200 return。productside intent/debtをseedしない |
| short pages pending acknowledgment scans | 2 | deletionWorker:46初期page25ならreturn、17/1 pageでのみ:47一run。pending empty/新predecessor無し |
| final connection assertion | 1 | test:201 provider.run(find) |
| guard/count/assert/stop/checkpoint | 0 | fixture.guard/countは原client.executeのみ、closeは原execution.stop/hasher.stop/FK-integrity/checkpoint/client.close。UoWを追加発行しない |
| **合計** | **837** | normal pathのexpected SOURCE 呼出回数、実counter値ではない |

同じ算術を旧表のgroupで示す:
setup account/browser2 + initial connection1 + storage1
+68×(confirmation1+begin2+complete6+closedRow1)
+capacity/pending4 +maintenance6 +drain142 +finalconnection1
=4+680+4+6+142+1=837。

drain detail: page25→save/read50+intentclaim1=51、page25→51、page17→34+pendingscan1+intentclaim1=36、page1→2+pendingscan1+intentclaim1=4。51+51+36+4=142。原receipt25/25/17/1は件数計数であり、新proof/boolean ACKやnative物理閉鎖を作らない。

serverHollow:20–40はgoogleAuthentication/openRouter servicesを注入しない。fixture:nativeContainerもdriveのみ追加するためdeletionWorker:158–185のcredential loopsは各4sweepで0、intent無しの後続resource/body cleanup runも0。createNodeDrive(factory:29–79)はclock/tokensとoptions/storageを受け、factory自身のrun発行0、storageの元withOwner/openOwnedRandomReadはmethod存在gateのみで呼ばず、backup sourceは未利用。migration/applyPragmasは計数wrapper設置前client呼出でUoW0。既unACK0/predecessor0のrequired normal assertsがあるためmaintenance extra perproof/perpredecessor loopsをnormalbudgetへ足さない。

## 旧701の欠落と保守upper

旧PUBLIC報告:25 は complete4 として initialread/claim/settle/ackSavedreadを数えたが、常に呼ばれる **adoptDriveCandidate:449 と normal returnread:435** を落としていた。正常failed rowでもadopt関数のrunは開始済みなので削除できない。2×68=136が欠落で701+136=837。drain136+4+2は旧表でも142と計上済みであり、今回drainを「未計上」と断定しない。

requirednormalは837。bounded exception allowanceは runner:settleOwnedResult:301–342 の単一catch後第二settle1回を全68 completionについて保守的に許す **追加最大68**。同関数に繰返しloop/第三settleはない。これはprotectionFailure exactidentity branchの上限であり、通常入力・branch到達・partial成功を新たに要求するものではない。異常なら元case失敗/held/proof保持が優先する。905=837+68をSOURCE-derived conservative upper、提案cap1024のheadroom119（normal nominalとの差187）とする。capはfinite failclosedのまま、上限到達で元firststicky uow-bound/元throwを保持する。driver内部 SQL retryはUoW wrapper回数から計数せず、その成功をbudgetから保証しない。

今回actual borrowed sourceFault=uow-boundは「cap768 guard到達」の独立観測で、837/905/1024の算出入力ではない。実最終count・どのdrainpage・その他原因はUNKNOWN。stage label drain67をthrow位置や新expectedcountにしない。

## client上限とscope不変

client-method/statement各12288は変更しない。元採用coarse upper9730=1534migration+68×(begin48+exchange56+drain9)+setup/maintenance/assert512を借用する。complete4→6の二つ追加read-only UoWは各一find、元fixture counter単位でtransaction/execute/commit/closeを保守的に各4methodとして計8×68=544、originalmodelより保守的なmethod bookkeeping upper10274<12288（余裕2014）。statementはclose0を使えば計6×68の補正で10138<12288。ここは既coarse driverモデルの保守補正であり、実API/SQL/thread/trigger/retry countやnative physicalproofではない。不要なdriver依存再調査・cap自動拡大をしない。secondsettle allowanceを正常client期待に写さず、unknown/drivererror/cap超過時は元held。

business sequence/ACK68/history68/connectionversion69/browserRecent5/10min、logicalclock13×600001ms/historyMs+1、normalcurrent認可を不変更。40secを件数から延長しない。stockfork1/Worker0/businesschild0/HTTP-DNS0、root192MiB/DBside32/sum64/TMP8/log2/original8/material256KiB/control40×512、normalNode0/Python0/knownPGabsent/2EOF独立FD/元checkpointawait・clientclose→strictaudit gatesは不変更。checkpoint strict000等の新意味は未採用。

## 次candidateの最小scope提案 — Root採用前は編集0

1. 既 fixture:306 guard integer768→1024と既 test:219 upper assertion integer768→1024 の2既sourcepathsのみ。元operator/record/throw/body/assertmeaning/callback/observer/normalproof不変更。
2. 診断enum+NULL/firststickyの現在SOURCE2を保持したまま、新commit parent e55。source98 countを維持し、二entrySHA/bytes/Gitblob/pairshapeを更新。追加9counting sourceは変更0の補助照合根拠で、盲目的source107/runtimewhitelist拡大はしない。
3. current diagnostic PUBLICrunner/loaderを固定baselineとして必要bindingだけ新candidateへ。future新root literalはRoot別予約、現在a79/旧493 reuse0。SOURCE/reportmanifestSHA、loaderSHA/path（新helperにする場合）、rootだけ必要比例差。protocol/frame/caps/guards追加変更0。
4. SOURCE変更後 requiredtypecheck→lint:fix→format、固定全文inverse/全98source2外不変/helpermetadata/finite budgetsを別candidateへ。独立source/helperpreflight後にRootがSOURCE98+追加9の補助同値を確認し、既defaultfullresult→ONEactualを別採用する。
5. 成功なら同normalphysicalclosure gates後だけreadonlyaudit。失敗/non0/unknown/force/cap超過はheld/nextaudit0。budget変更で旧rootを再読/復元/再実行しない。

本planはSOURCE-derived予算候補であり、機能受入・CA67actual成功を代替しない。cap1024は提案値のまま。product/ports/schema/normalguards/期待/proof/既helpers/sourceは今変更0。newroot memory予約/probe/create、test/Vitest/default/native/DB/build/network/runtimeは0。新plan排他0600作成・自身全文stablehash/FDcloseの後、ALL SOURCE/git/PUBLIC報告/helper read/writer STOP。全actual/private成功失敗ROOT/TMP/DB/key/proof/results/cacheは永久NOOPS。spec/spec-implement/Managerfiles/main/S5/UI/P5d他phase編集0。
