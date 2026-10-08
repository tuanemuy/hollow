# OWNER-RACE1 predicate ONE independent safe classification

判定 **ACTUAL FAIL / HELD、原因UNKNOWN**。新markerはRACE_TRANSACTION_RECEIPTを示し、元五field receiptとのtoEqual群でAssertionErrorが記録された。どのfield/count/observer/driver条件が不一致かは未観測。正常退会競合・最後owner保持・P5d-B受入へ昇格しない。

## 独立scopeと固定入力

私は元OWNER source2/helper2の作者。新Impl marker7/toolingdeltaの独立レビュー6599B/1cc158d6fb7523467c176bd11396c816f6b59121956a4dbc11ba2773c9d3e8e5及び今回Root ONEの安全結果分類だけを担当する。元2client/UoW/要求重なり/normalclose意味はRoot採用UI独立レビュー11979B/b1979…を借用し、原作者による全体自己検証を独立受入と呼ばない。

今回直接stable fullreadしたPUBLIC phase: phases/P5d-owner-race-predicate-actual.md3910B/SHA256715e514d7370544c6e60a8829864116f19d3b895c983deb5fd2cd2bf4112696d。SOURCE fixture15150B/7504d3ece2386fb2528427d9885401509223948c6b2bcd1bfabbec8d9b138056/blob7f0c69aaad0b3a67757b270036b788bc398a1f66は許可exactpathのみ直接stable全文読取・memoryGitblob一致。両regular/nonlink0600/UIDself/nlink1/canonical、O_NOFOLLOW、path/FD前後devino/mode/UID/nlink/bytes/mtime/ctime一致/fullSHA/actualFDcloseを確認した。

test6749B/be401ca8e28c058d7982395c679ba436cd699e4d7f807439c1ed24eb6325890c/blobc27b58468b7148a3b921ff615203210dc9bab831のassert位置は直前独立delta fullreadを借用し、今回は再読0。SOURCE40bf8f25977e18ce3ba4d9aa84f67b298d71d940、runner24755/dcb2ea…、loader18669/1df987…、candidate26209/21cef…、directRootprecheck1551/d080ac27d9d2d7277cdaededb93ec5dac24a57139f02696a5875d6bb7fc47bde、default全inspectとSOLEactualはRoot固定phase借用。全source100/PUBLIC10883/CF/shims/HEAD guardは今回再走査0。helper/code編集・実行0。

## Root actual安全結果（全借用）

Root public/source前検査→existingdefault exit0/preflighttrue/executedfalse/database0/newRoot0→ONE --executeの結果。次JSONは固定PUBLIC phaseの安全な稼働中監督結果であり、私がprivate実物から取得した証跡ではない。

{
  "ok": false,
  "failure": "tool-exit-or-eof",
  "normalExit": false,
  "forcedTerm": false,
  "forcedKill": false,
  "actualExit": 1,
  "stdoutEOF": true,
  "stderrEOF": true,
  "pipeHandlesClosed": true,
  "normalPipeCloseReceipt": null,
  "supervisorPGObserved": true,
  "helperOwnPGObserved": true,
  "ownPGState": "absent",
  "leaderState": "absent",
  "pollMs": 200,
  "elapsedMs": 7248,
  "outputBytes": 865,
  "events": [
    {
      "event": "stage",
      "stage": "owner-race"
    },
    {
      "event": "fork",
      "sameOwnedPG": true
    },
    {
      "event": "case-failure",
      "case": "OR01",
      "checkpoint": "RACE_TRANSACTION_RECEIPT",
      "sourceFault": null
    },
    {
      "event": "case",
      "stage": "owner-race",
      "code": "OR01",
      "state": "failed"
    },
    {
      "event": "diagnostic",
      "stage": "owner-race",
      "phase": "results",
      "beforeAllStarted": true,
      "beforeAllEnded": true,
      "afterAllStarted": true,
      "afterAllEnded": true,
      "source": "case",
      "errors": [
        {
          "errorClass": "AssertionError",
          "nativeCode": "none",
          "statementIndex": null
        }
      ]
    },
    {
      "event": "failure",
      "stage": "owner-race",
      "code": "P5D_CASE_FAILURE",
      "case": "OR01"
    },
    {
      "event": "summary",
      "ok": false,
      "completed": [],
      "cases": [
        {
          "code": "OR01",
          "state": "failed"
        }
      ],
      "forks": 1,
      "forksActualClosed": true,
      "workerCount": 0,
      "denied": false
    }
  ],
  "audits": null,
  "held": true
}

## 条件ごとの分類

| 条件 | 判定 | 根拠と欠測 |
| --- | --- | --- |
| OR01 business case | FAIL/HELD | failed、completed空、NodeactualExit1。AssertionError/nativeCode none/indexNULL。accepted/refusal/WSnote/fence意図の後続assertは未完 |
| marker | 局所在庫のみ | RACE_TRANSACTION_RECEIPTは元receipt assertion入場。前RACE_CALLER_OVERLAPは正常逐次controlflow上通過するが独立rawreceipt/predicate監督証明ではない。不一致fieldは未観測 |
| sourceFaultNULL | 原因UNKNOWN | fixed faultenumが投影されていないことだけ。driver正常、五field observerFault=false、count2、overlaptrueを推定しない |
| before/afterAll | 部分観測 | 開始/終了booltrue。fixture-closed marker0なので原hasher/client2正常receiptは欠測。failed fixtureにnormal SQL/auditを追加していない |
| stockfork | 部分観測借用 | forks1/forksActualClosedtrue/Worker0/deniedfalse。元個別詳細を新監督receiptに合成しない |
| 工具終了 | 安全終了部分のみ | forceTERM/KILLfalse、ownPG/leaderabsent、両PIPEEOF、finally pipeHandlesClosedtrue。normalPipeCloseReceiptNULLなので正常独立FD gate成立とは呼ばない |
| audit/normalaccept | 未成立 | auditsNULL/heldtrue/normalExitfalse。rawSQL/drivererror/値/DB状態を補完しない。経過7248ms/output865Bは工具量だけ |

旧ae972及び今回f39の原因を互いに同定しない。sourceFaultNULLやError分類がないことからrace productの正常性/Driver failure/observer timingを確定しない。現公開情報から、期待値を直ちに変える決定的static defectは認めない。

## fixture endRaceのSOURCE-only意味

beginRace後、元client.transaction呼出時に各laneのRequestを登録し、別lane未completedならoverlapを記録する。返す原Promiseに既observerを付け、元handle取得時opened=true。元commit/rollbackの元Promise成功又は元transaction.close実returnがcompleted=trueへ進める。元transaction開始rejectionでもcompleted=trueとなるがopened=falseであり、driver成功と混同しない。observer例外/上限はsourceFaultを保持する。

endRaceはrace=false→元observersをbounded await→五field plain dataを返す。requested=requests.length、actualOpened=opened数、completed=completed数、overlappingRequests=記録overlap、observerFault=sourceFault!==null。原request2上限/duplicate lane拒否、observer64、method/statement4096、UoW32を保持する。データはprivate proofではなく、Promise並列と二Tx要求重なりも別条件である。

ここでは既fixtureのAPI/receiver/args/元Promise/元handle/await/error処理を変更しない。五fieldのいずれかが期待と違う可能性は安全結果から残るが、現在値は不明。正式UoW/driver他fileを追加読取して特定したかのように記述しない。f.failがfailed=trueとなるのでcloseのnormal SQL/checkpoint/fixturemarkerが抑止されるSOURCE順は、今回正常marker欠測と矛盾しない。これを二client actualcloseのpositive receiptへ代用しない。

## 別次提案：OR-RECEIPT5 diagnostic only（未採用・未実装）

同markerの盲目再実行を提案しない。必要な情報増分は、元endRaceから返った五fieldの有限projection一つ。SOURCE testの元receipt取得後・assert前に元typed戻値のprivate memrefを保持し、既onTestFailedの単一case-failure frameにnullable raceReceiptを追加する。fixture/Tx/client/driver/proofへの変更は不要という最小方向。

| field | 許可投影 | SOURCE由来の意味 |
| --- | --- | --- |
| overlappingRequests | boolean/null | 別lane要求時に先Request未completedという既overlap |
| requested | safeinteger 0..64/null | requests長、正常原上限は2。診断値を2へclampしない |
| actualOpened | safeinteger 0..64/null | 原handle observerでopenedが付いた数 |
| completed | safeinteger 0..64/null | 原commit/rollback成功又はclose返り/rejected-startが付いた数 |
| observerFault | boolean/null | 既sourceFaultの有無。新error属性は読まない |

元receiptが未返却の失敗はraceReceipt=null。nullable数値は値未観測又は投影不能を示し、正常ゼロを合成しない。typed plain戻値の既五fieldだけでgetter/constructor/rawerror/ID/SQL/proofを追加読取しない。rawobject汎用serialize/値から新期待作成なし。0..64外/unknownshapeはheldで、投影を通すためのclamp/driver正常化0。

必要exact編集候補は既accountDeletionOwnerRace.integration.test.ts一つとNEW public predicate-receipt runner/loader二つ、NEW candidatephase。fixture15150全bytesと他99SOURCEは不変更を確認し、旧predicate helpersはimmutable。工具はOR01/exactknown4＋追加raceReceipt key一つ/内部exact5keys/max1 frame、未知/duplicate/範囲外を拒否して診断presenceをnormal/audit成功へ昇格させない。marker/元throw/onTestFailed/f.fail/originalassert/await/Promise/finally/gates/capsを保持する。

全ASCIIのcase-failure projection worst例（sourceFault=statement-bound/長marker/三count64/二boolfalse）を机上compact計算するとP5Dprefix/newline込み229B≤512。packet40/observer64増加0。新helper/report material256KiB及びfinite source/table bytesは候補で再計算必要、今budgetを増やさない。UoW32/stmt4096/casehook40/body180/outer240/root192/DB1handles2/stockfork1/Workerbusinesschildnetwork0/原normalclientclose/PGEOF独立FD/audit条件も不変更。診断write/validation失敗が元assert errorをsuccess/別業務結果へ変換しない境界を候補レビューで固定する。

候補作成・freshmemory予約・default/ONEはRoot別採用が必要。この報告だけで新run/rootを許可しない。

## 保全とSTOP

新reviewのみwx0600/O_EXCL/O_NOFOLLOW/fsync/実FDclose/postread fullstable固定。SOURCE/test/fixture/helper/旧phase/review/main/Manager/goal変更0。成功失敗を含む全generated/private/root/results/cache/TMP/log/key/proof/DBは永久NOOPS（f39/siblingTMPもstat/read/hash/copy/import/reopen/replay/cleanup0）。runtime/default/preflight/test/native/browser/DB/Nodeimport/rootprobe/create0。全reader/writer STOP、session0。
