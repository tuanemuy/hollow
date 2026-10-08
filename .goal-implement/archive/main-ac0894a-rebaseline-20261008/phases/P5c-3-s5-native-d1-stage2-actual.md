# S5 native D1 stage2 actual

判定: **FAIL / held**。2026-10-06T19:59:53+09:00。Root sole PUBLIC3 stable SHA・SOURCE1470全SHA/21274202B・PUBLIC108/108 package rows83 unique・CF986・pinned Node/Git metadata PASS後、既 `--preflight native-d1` はexit0/executedfalse/DB0/newRoot0。独立DS1修正[静的PASS](../reviews/P5c-3-s5-native-d1-stage-dfa-candidate.md)を受入し、`--supervise native-d1` を新memory literal `p5c-s5-native-d1-stage2-67a198c4` へONE実行した。

SOURCE721bc7ad2741b673db9b2ab22023b7071e283212、runner291003B/625d735653e766dc0188be4d96410bfdac331c31c4aae5a102ef80a8a750e8e9、config392626B/4a6e1d619d08e0fd045142f686e9e38be6a21c0199ef2fe1075cfbe5c01cda8d。

必要case1failed/正式skip9、reporter errors3（AssertionError unknown1/Error unknown2）。owner1/metadata ps1が実自然exit1/0・既知absent・各pipeEOF/close。parent側Worker0、stockforkは原stop要求SIGTERMの実close/absent/両reader EOF-closeでnormaltrue。stdinFinishfalse、IPC EOF/FDNULLは欠測。afterAll/hook完了/requiredcase pass、auditと正常strictは未成立。outer Python1/Node1、PG2不在/両PIPE EOF-FD閉鎖、outerforce0。これら工具閉鎖を正常business/proof/ACKへ昇格しない。

**stageEntered=NULL / stageMarkerCount=0**。last entered groupは取得できなかった。parse/abrupt/catch外/元stderr投影等のどれが起きたかは欠測、実原因UNKNOWN。child exit1をnative資源閉鎖成功としない。旧9d230b41を再読せず、今回も同proof回復・第二CAS rollback・commit-response-loss/save-read-consume ACKの正例未実証。全S5-D/全goal未完。

new actual SOURCE派生root/DB/objects/key/proof/result/logs/TMP/cacheはreceipt受領後ただちに恒久NOOPS。stat/read/hash/copy/import/reopen/replay/cleanupを行わない。保存する以下JSONは元supervisorが有限safe schemaから返したONE receiptのみで、原stdout/stderr/error.message/stack/body/SQL/個別proof/IDsは記録しない。今後は独立classificationと公開sourceのstage/catch topology照合のみ。追加actualは別scopeが必要。

```json
{
  "actualPythonExit": 1,
  "ownPythonPG": "absent",
  "registeredNodePG": {
    "native-d1": "absent"
  },
  "stdoutEOF": true,
  "stderrEOF": true,
  "stdoutFDClosed": true,
  "stderrFDClosed": true,
  "nodeTERM": 0,
  "nodeKILL": 0,
  "pythonTERM": false,
  "pythonKILL": false,
  "fault": "inner-held",
  "inner": {
    "candidate": "721bc7ad2741b673db9b2ab22023b7071e283212",
    "family": "native-d1",
    "result": {
      "group": "native-d1",
      "actualExit": 1,
      "ownNodePG": "absent",
      "stdoutEOF": true,
      "stderrEOF": true,
      "stdoutFDClosed": true,
      "stderrFDClosed": true,
      "force": false,
      "fault": "test-or-closure-failed",
      "caseCount": null,
      "passed": null,
      "failed": null,
      "afterAll": "unobserved",
      "testForkPID": "unobserved",
      "testForkPipeEOF": "unobserved",
      "resourceDiagnostic": null,
      "strictClosedGuard": false,
      "volatileMissing": 0,
      "jsonDiagnostic": {
        "presence": "valid",
        "counts": {
          "numTotalTests": 10,
          "numPassedTests": 0,
          "numFailedTests": 1,
          "numPendingTests": 9,
          "numTodoTests": 0,
          "numTotalTestSuites": 4,
          "numFailedTestSuites": 2
        },
        "caseStates": [
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "failed"
        ],
        "reportedSuccess": false
      },
      "reporterDiagnostic": {
        "presence": "valid",
        "group": "native-d1",
        "phase": "run-end",
        "callbacks": 27,
        "hookStarts": 3,
        "hookEnds": 1,
        "caseStates": [
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "skipped",
          "failed"
        ],
        "ready": 1,
        "result": 1,
        "skippedReady": 9,
        "skippedResult": 9,
        "sameIdentity": true,
        "errors": [
          {
            "errorClass": "AssertionError",
            "nativeCode": "unknown"
          },
          {
            "errorClass": "Error",
            "nativeCode": "unknown"
          },
          {
            "errorClass": "Error",
            "nativeCode": "unknown"
          }
        ],
        "runReason": "interrupted"
      },
      "testFork": {
        "presence": "valid",
        "normal": true,
        "version": 1,
        "attempts": 1,
        "handles": 1,
        "pidKnown": true,
        "connectedInitially": true,
        "exit": null,
        "signal": "SIGTERM",
        "actualClose": true,
        "absent": true,
        "requestedStop": true,
        "termRequested": true,
        "killRequested": false,
        "stdinFinish": false,
        "stdinClosed": true,
        "stdoutEOF": true,
        "stdoutClosed": true,
        "stderrEOF": true,
        "stderrClosed": true,
        "disconnected": true,
        "channelReleased": true,
        "ipcEOF": null,
        "ipcFDClosed": null
      },
      "nativeLedger": {
        "presence": "valid",
        "version": 1,
        "group": "native-d1",
        "workerAttempts": 0,
        "workerActive": 0,
        "workers": [],
        "owner": {
          "stageEntered": null,
          "stageMarkerCount": 0,
          "attempts": 1,
          "handles": 1,
          "pidKnown": true,
          "birthMetadata": true,
          "samePG": true,
          "originalExit": 1,
          "signal": null,
          "closed": true,
          "stdinClosed": true,
          "stdoutEOF": true,
          "stdoutClosed": true,
          "stderrEOF": true,
          "stderrClosed": true,
          "absent": true,
          "force": false,
          "psAttempts": 1,
          "psClosed": true,
          "psEOF": true,
          "psFDClosed": true,
          "psPidKnown": true,
          "psAbsent": true,
          "psExit": 0,
          "psSignal": null,
          "psForced": false,
          "streamErrorObserved": null,
          "normal": false
        },
        "restored": true,
        "observerFault": false,
        "normal": false
      },
      "ok": false,
      "diagnostic": {
        "stage": "node-supervise",
        "field": "supervision",
        "sourceFileIndex": null,
        "rootMkdirReturned": true,
        "nodePopenAttempts": 1,
        "nodeHandlesReturned": 1,
        "ownerFramesReturned": 1,
        "pythonPopenAttempts": 0,
        "pythonHandlesReturned": 0,
        "faultEnum": null
      }
    },
    "audit": null,
    "held": true,
    "fault": "boundary-or-phase-failed",
    "diagnostic": {
      "stage": "node-supervise",
      "field": "supervision",
      "sourceFileIndex": null,
      "rootMkdirReturned": true,
      "nodePopenAttempts": 1,
      "nodeHandlesReturned": 1,
      "ownerFramesReturned": 1,
      "pythonPopenAttempts": 0,
      "pythonHandlesReturned": 0,
      "faultEnum": "native-failed"
    },
    "volatileMissing": 0
  },
  "held": true,
  "resourceDiagnostic": null,
  "strictClosedGuard": false,
  "volatileMissing": {
    "outerCount": 0,
    "innerCount": 0,
    "combinedCount": 0,
    "outerCap": 128,
    "innerCap": 128,
    "combinedCap": 256
  },
  "diagnostic": {
    "stage": "outer-summary",
    "field": "normal-gate",
    "sourceFileIndex": null,
    "rootMkdirReturned": false,
    "nodePopenAttempts": 0,
    "nodeHandlesReturned": 0,
    "ownerFramesReturned": 0,
    "pythonPopenAttempts": 1,
    "pythonHandlesReturned": 1,
    "faultEnum": null
  }
}
```
