# OWNER-RACE1 predicate ONE — Root held receipt

2026-10-06T13:47:30.856336+00:00。HELD / cause UNKNOWN。独立diagnostic delta6599B/1cc158d6fb7523467c176bd11396c816f6b59121956a4dbc11ba2773c9d3e8e5をRoot全文採用、directprecheck1551B/d080ac27d9d2d7277cdaededb93ec5dac24a57139f02696a5875d6bb7fc47bdeのSOURCE100/1934224B＋extra9/PUBLIC10883/CF/shims/HEADparentblob一致後、既default全出力exit0/preflighttrue/executedfalse/database0/newRoot0をinspect。別ONE --executeのみ実行。

SOURCE40bf8f25977e18ce3ba4d9aa84f67b298d71d940 parent5481756c8b3521fdb35c6750c9954955a4d9f2a3。runner24755B/dcb2ea98133171273320e577b873880c0c6e09fd8986a026bf0042f7ba3a90bb、loader18669B/1df987213466479c020b3410eb6133e403e86b2795f8a01792a7b5defff9af62。原testへの7checkpoint assignmentのみ、元assert/await/thisargs/resultPromise/throw/finally/正常closure/caps不変更。source1之外99不変、whole3checks0。

新root /Users/hikaru/.local/share/hollow-validation/p5d-owner-race-predicate-20261006-f39cd672 とsibling-tool-tmp/DB/sidecars/records/全entryは完了時点から永久NOOPS。stat/read/hash/copy/import/reopen/replay/cleanup0、旧ae972c41含む全private同じ。失敗後copy/audit0。稼働中の工具finite safeJSONだけを固定する。

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

RACE_TRANSACTION_RECEIPT entrymarker＋AssertionError/nativeCode none/indexNULLを観測。前markerにはRACE_CALLER_OVERLAPがあるが、これはlast-enteredの投影であり単独のpredicate成功receiptではない。元endRace return5fieldsのどの値が期待に一致しないか、原driver/observer/receipt各count・accepted/refusal・failurecauseはUNKNOWN。sourceFaultNULLからobserver正常/driver正例を推定0。過去ae972c41の群内値へ遡及0。

Node1/casefailed、hooks開始終了とstockfork actualcloseがあってもfixture-closed marker0/正常二client receipt0/normalPipeCloseReceiptNULL/auditNULLのため正常不可。ownPG/leaderabsent・2PIPEEOF＋finallyhandlesClosedtrue・force0は工具終了に限る。elapsed7248ms/output865B、原有限予算は維持、同診断盲目再実行0。次はPUBLIC receipt/SOURCE静的比例照合から必要有限診断を別提案する。native/proof/Driver normal/最後owner維持/全P5d受入0。
