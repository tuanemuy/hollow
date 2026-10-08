# OWNER-RACE1 ONE — Root held receipt

2026-10-06T13:25:32.951931+00:00。HELD / cause UNKNOWN。Root独立candidate review11979B/b1979b2778e91af766f4759b11cfc9e9c6b834543532c1a831507655d6c3695bを全文read採用。direct SOURCE100/1933953B＋extra9/56867B・PUBLIC10883/CF3shims/HEADparentselectedblob precheck1447B/cd87ac62e08aeb8afe508c0718e41a9009851db72bf80149726de2a44fe9689a後、existing default全出力exit0/preflighttrue/executedfalse/database0/newRoot0をinspect、別ONE --executeだけ実行。

SOURCE5481756c8b3521fdb35c6750c9954955a4d9f2a3 parent55ef3b226babeb6269654c66dbe0198eae35d366。runner24577B/d0ea54629344656661c9ab473912ce8096f57bf88b7d5ce0ad33836f1ffa2d3e・loader18517B/5cc1e5071d743cf31431d7ca8081c4c29771ba55073e3420c774362a472162b9。original client2/database1、UoW32/client4096/stmt4096/observer64、body180outer240/sharedtail30/poll200/case40/root192/DB32sum64/TMP8/raw2/material256K。

new root /Users/hikaru/.local/share/hollow-validation/p5d-owner-race-20261006-ae972c41 と sibling-tool-tmp/DB/sidecars/results/全entryは完了時点から恒久NOOPS。stat/read/hash/copy/import/reopen/replay/cleanup0。工具が稼働中に返した有限safeJSONのみ固定。失敗後copy/audit0、旧privateも全0。

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
  "elapsedMs": 7195,
  "outputBytes": 825,
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
      "checkpoint": "race",
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

OR01 race群に入ったcheckpointを観測、AssertionError/nativeCode none/statementIndex NULL、sourceFault NULL。群内のpredicate・実値・accepted count・overlap・driver outcome・真の失敗原因は未観測でUNKNOWN。sourceFaultNULLはdriver正常又はobserver全成功の証明ではない。casefailed/Node1、afterAll begin/endとstockfork actualcloseがあってもfixture-closed marker0/正常二client closure receipt0/normalPipeCloseReceipt NULL/auditsNULLのためnormalにしない。

forcedTERM/KILL0、known ownPG/leader absent、2PIPE EOF＋finallyhandlesclosedtrueは工具終了のみ。正常4個close gateが未採取なので正常DB監査へ転用0。bounded elapsed7195/output825、Worker count0/deniedfalseを未知nativeや業務guard正例へ補完0。最後owner保持/並行退会正常/全P5d/ブラウザは未受入。新root永久非操作、盲目同test反復0。次はPUBLIC候補SOURCEと固定receiptの比例照合・必要ならfinite次診断案だけ。
