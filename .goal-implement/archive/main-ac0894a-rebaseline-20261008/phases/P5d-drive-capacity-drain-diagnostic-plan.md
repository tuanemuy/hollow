# CA67 DRAIN-CODE1 有限診断scope案

提案のみ、未採用/未実装/未実行。基点SOURCE abdac900e012d4e93550ed905f8ecee3b300ac8a、source98 pair9a890e7e、newtest8134/fa4b0d2a・fixture18625/23a243d5、runner25257/a23139fe・loader24441/51ed0bbc。actual FAIL分類5920/e4dc96c3は維持し、実原因/throw位置UNKNOWN。Rootが新scopeを採用し固定candidate独立preflightを終えるまで新実行0。

## 選択と情報増分

drain67は3pageの全operationとpending再読に共通の直近entered checkpoint。さらにentered labelを増やす案では、元UoW内部のcounter・repo observer拒否を一度で区別しにくい。最小案として、候補fixture自身の既固定throw条件だけの有限sourceFault enumを一個の既case-failure frameへ追加する。provider/driver error propsやmessageから分類しない。正常rawrow/proof/SQL/ID/path/counter実値は出力しない。

既guardが異常を検出した事実とactual根本原因は別。例えばnative-receiptは3条件をまとめた枝の診断であり、個別proof absence/verify false/duplicateの特定ではない。schemaを細分化せず、未割当errorはNULLのまま返す。

## Exact変更案4path

- SOURCE packages/core/src/adapters/libsql/__tests__/accountDeletionDriveCapacityFixtures.ts: private nullable enum、first-write-only記録関数、read-only getterを追加。以下の既throw直前だけに代入し、condition/元Error生成/元throw/await/receiver/arguments/result/Promise/transaction/finally/afterCommitをそのまま残す。capを増やさない。
- SOURCE packages/core/src/adapters/libsql/__tests__/accountDeletionDriveCapacity.integration.test.ts: 元onTestFailedの既一frameにsourceFault一fieldを追加。現在checkpoint・onTestFailed・f.fail・sameError/期待assert/case/hook/finally・診断writefailure時failを変更しない。新frame0。
- PUBLIC .goal-implement/helpers/p5d-drive-capacity-loader.mjs: case-failure strict exactkeys＋enum/NULLを対応更新。同既prefix、maxone/caseFailure stickyを保ち、正常化・diagnostic suppression・生error属性読取0。
- PUBLIC .goal-implement/helpers/p5d-drive-capacity-runner.py: 同strict parser/projectionとSOURCE pair/report/LOADER_SHA/fresh root依存のみ。既normalgate/audit拒否/正常closure/stockfork/PG/EOF/実FD/FS/ネット/capsは変更しない。

新PUBLIC candidate phase/reportと必要source98表は作者提出。既actual reportと採用reviewは上書きしない。product/ports/schema/P5d source旧96/API0。

## 固定enumと元条件

| sourceFault | 元fixture条件 |
| --- | --- |
| client-method-bound | countClient: methods>12288かつstatement<=12288 |
| client-statement-bound | countClient: statements>12288かつmethods<=12288 |
| client-both-bound | countClient: 両上限超過 |
| uow-bound | original.run wrapper: ++unitOfWorkCalls>768 |
| native-receipt | save observer: receipt無し/verify false/既drains ID duplicateの既OR条件 |
| save-result | 元save結果false又はdrains length>=68の既OR条件 |
| exact-read | read observer: found false/read済/value key-order不一致/verify falseの既OR条件 |
| count-result | f.countの元row無し/typeof n不正 |
| NULL | その他の元throw・business/provider/driver/expect error・未到達 |

数値分岐はcountClientが既に計算済みのmethods/statementsだけ使う。native-receipt/exact-read等では既条件の短絡評価順と呼出回数を保持し、診断のためverify再呼出/JSON再serialize/DB再read/原getters呼出を増やさない。最初のsourceFault以後は上書きしない。既failedフラグやthrowを置換せず、元catchの意味も変更しない。

元Errorへcodeを後付けせず、Error.message/stack/cause/toSerialized/constructor/未知propertyを読まない。getterはfixture自身のenumを返すだけで、public producer receipt/private proofの能力を発行しない。通知は失敗時の一frameだけ、schema unknown/duplicate/oversizeは原heldへ。NULLは未到達/未分類であって正常を示さない。

## 不変scopeと再採用条件

native ACK/client/tx/UoW原Promise・同handle identity、repo原await/同result/元afterCommit観測、正規save→commit→exactread→commit→consume、25/25/17/1、同68resume、version69、matched-prune68の期待は変えない。資源counter768/12288・case/hook40/body180/outer240・stockfork1・businessWorker/child/HTTP/DNS0・root192/DB32/TMP8/log2/material256Kを維持。既40×512B control枠で一frameにfield追加、正常時frame/生成資源0増分。candidateでmax encoded frame/materialを再計算し512/256K内を確認する。

fresh ROOT/TMPはManagerが別の未使用memory literalを予約してcandidateに固定する。493ea817を含む全成功/失敗private rootsは永久NOOPS。default/actualでも再利用・read/hash/copy/reopen/cleanup0。diagnostic-only差だからという理由で既oldrootを開かない。

作者は元source/helperへの全文inverse、旧body/assert/API不変、currentHEAD/source98/pair/shapes/strict schema/全規定checks・syntax、normal closure gates不変を提示。独立STATIC PASS後のRoot PUBLIC precheck→既default full結果確認→ONEは別採用であり、本案は実行許可ではない。literal expectation/cap拡大/架空physical proof/新product repairは提案しない。

この案は新SOURCE/body/readを追加せず、独立分類済みcode上の既固定条件から作成。計画固定後ALL read STOP。source/helper/main/Manager編集0、runtime/import/default/preflight/rootprobe/DB/key/native/test/private操作0。

UTC: 2026-10-06T11:36:07.497903+00:00
