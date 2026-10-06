# OWNER-RACE1 OR-RECEIPT5 ONE safe actual receipt

ACTUAL FAIL / HELD. The receipt comparison remains failed. The new finite projection shows requested=2, overlappingRequests=true, actualOpened=1, completed=2, observerFault=false. actualOpened differs from the original expected2. Driver error class/code, business rejection/winner, final database state, and physical fixture closure/audit remain UNKNOWN. No expected assertion is changed from these observations.

## Fixed inputs and preflight

SOURCE516af3ba5e64f0ba1a7e3c9da697ca21d2b576f7 parent40bf8f25977e18ce3ba4d9aa84f67b298d71d940. SOURCE1001935881B paird94f54469a1bc2548378fdba11b0988fcf5fef4fe36f07591845f963350f8440. Test8406/cee6e7308cdf7b41f49b51718fb28b49ef8f4f65ab4350ed32dfd5ac7cbbb7cf; fixture15150/7504d3ece2386fb2528427d9885401509223948c6b2bcd1bfabbec8d9b138056. Current runner25412/b5f13abff953100e8066b9a5fe39a551b8350542c0d1c999d8edcae180dbd6f9, loader19301/3fdebe6c26735c6dd6ee6ff31ba4a1281acd8f7124249db500790b5e8cafa316; candidate28183/dd135792183cc4806e03ac0ae72ae5c56d6e4ec5a2b65fe67c08a2b4e7eb5a65. Limited delta review9809/b45165c1 failed str/bytes canonical comparison; fix4831/75ec6e017e2c5d826fb31b80d1f7e1764e6a459a0bb800894e77755f6526c9e5 and independent7464/788e75b72d4508191cae4a6e262bd6ea2edf23955533aaa9d04873499a772cc1 accepted LIMITED STATIC PASS. Exact keyset/range/duplicate checks maintained; unique-key order is not forced by roundtrip.

Root direct PUBLIC/SOURCE precheck1525/a6c103633776d9077b99a16b0c72d790601cc62c3dbf69c2344ab67a54700189 verified100+extra9 fullstable SHA/Gitblob/actualmode/currentHEAD/parent/outside1, PUBLIC108/83unique422152B/CF986/three shims/pinnedNodeGit. Source expected before actual; old roots never reopened. Existing default Python-I-S-B runner returned exit0 with all fields {preflight:true,executed:false,database:0,newRoot:0}. Only then ONE --execute was adopted.

## Safe live supervisor result

Root launched exactly one original Python helper in its own registered session/PG, then drained its original stdout/stderr PIPEs without printing raw stderr. The original helper launched one Node helper/one original stockfork, businessWorker0. Root-only supervisor overhead is separate from the helper/Node budgets. Outer240s/output2MiB/poll200ms and only registered ownPG signals were fixed before launch. No forced signal occurred. The following data came from the live safe terminal JSON and registered supervisor; no after-exit private source, SQL, file, logs, results, key, proof, root or TMP were read.

{
  "outer": {
    "pythonActualExit": 1,
    "registeredOwnPG": true,
    "ownPGState": "absent",
    "stdoutEOF": true,
    "stderrEOF": true,
    "stdoutFDClosed": true,
    "stderrFDClosed": true,
    "forcedTerm": false,
    "forcedKill": false,
    "fault": null,
    "pollMs": 200,
    "elapsedMs": 7329,
    "stdoutBytes": 1230,
    "stderrBytes": 0
  },
  "result": {
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
    "elapsedMs": 7262,
    "outputBytes": 1084,
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
        "sourceFault": null,
        "raceReceipt": {
          "overlappingRequests": true,
          "requested": 2,
          "actualOpened": 1,
          "completed": 2,
          "observerFault": false
        }
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
}

## Interpretation and preservation

The bounded receipt records two original transaction requests and their original request overlap, one observed opened transaction handle, and two completed request observations. It does not record the unobserved driver rejection or assert a second handle opened. The test failed before later business outcome/fence assertions completed. SourceFault=null is not a proof of driver success; observerFault=false describes the existing observer only. ErrorClass AssertionError/nativeCode none is the case-error projection, not the rejected driver request's code. Before/afterAll start/end and forksActualClosed are partial lifecycle observations; fixture-closed marker is absent, normalPipeCloseReceipt=null, audits=null, held=true.

Python helper and Node helper actual exits are1, registered helperPG and owned NodePG absent, outer2EOF+4explicitFDclose true, inner2EOF/finallyhandlesClosed true, force0. These do not replace the missing original normal fixture/client/sidecar/normal-pipe/audit receipt. P5d-A-H and OWNER business acceptance remain incomplete. No raw IDs, SQL, private proof, native error text, or failure body are published.

Seal immediately: /Users/hikaru/.local/share/hollow-validation/p5d-owner-race-predicate-receipt-20261006-c8bd52a4 and its -tool-tmp sibling, with all descendants/source/build/results/logs/cache/TMP/DB/key/proof, are permanent NOOPS: no stat/read/hash/copy/import/reopen/replay/cleanup. All successful/failed old private roots stay NOOPS. Do not blindly rerun. Next investigation is SOURCE-only original request/observer/UoW error contracts, with any required new field/source scope proposed separately. Goal ACTIVE; no done/feature promotion.
