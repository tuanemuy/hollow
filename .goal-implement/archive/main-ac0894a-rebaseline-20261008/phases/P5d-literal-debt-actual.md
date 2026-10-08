# LD01 actual — held, normal acceptance absent

Recorded at 2026-10-06T07:22:51.607501+00:00. Root executed the adopted LD01 family once; this report records Root's fixed safe stdout, not a reread of private results. The sole case failed with AssertionError; the failure checkpoint is UNKNOWN. Native/owner/receipt cause is unobserved. Audit did not run. No retry is authorized.

## Fixed inputs and invocation evidence

- source `e1e07e51d0726d92b54e14dcd05adc4efcfe11cb`; source94 manifest `0301b5c743dcf36197e127acab5be9232507611e9bca149dd788b86aa84b98e3`.
- public runner 25876 B SHA256 `48f54648fbadd39a9a4dc3106ecf78558b5688a3dd50879023a41827469a201d`; loader 24600 B SHA256 `9d6103dfd8e8b2c52ea039dfe466adc9eccefd5f3941b276f7138c264d90723a`.
- Root's separate four public prechecks: PASS, exit0, actualfalse/rootprobefalse. Prior independent preflight PASS was adopted.
- default stdout: `{"preflight":true,"executed":false,"database":0,"newRoot":0}`. Then one `--execute`; Python exit1. No additional invocation.
- held root `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-literal-20261006-2b864a9c` and derived `-tool-tmp` are permanently nonoperative: stat/read/hash/import/copy/cleanup/DB/key/results/proof/reopen0.

## Root fixed safe result

```json
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
  "elapsedMs": 2176,
  "outputBytes": 662,
  "events": [
    {
      "event": "stage",
      "stage": "literal-debts"
    },
    {
      "event": "fork",
      "sameOwnedPG": true
    },
    {
      "event": "case",
      "stage": "literal-debts",
      "code": "LD01",
      "state": "failed"
    },
    {
      "event": "diagnostic",
      "stage": "literal-debts",
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
      "stage": "literal-debts",
      "code": "P5D_CASE_FAILURE",
      "case": "LD01"
    },
    {
      "event": "summary",
      "ok": false,
      "completed": [],
      "cases": [
        {
          "code": "LD01",
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
```

## Evidence and limits

Root observed Node actualExit1, leader/known ownPG absent, both PIPE EOF and outer pipeHandlesClosed true, no forced TERM/KILL, 2176 ms. `normalExit=false` and `normalPipeCloseReceipt=null` remain distinct: the four normal close flags are unavailable; simple pipeHandlesClosed does not replace that receipt. The stock fork actual-closed field is true, while whole normal acceptance remains false.

The case and file failed. beforeAll/afterAll start/end booleans are true; these do not prove fixture closed, native ownership closure, or closure/ACK/debt transitions. Statement index is null and no case-failure checkpoint frame was observed. Literal debts2, caller/proof/ACK/resume and targeted readonly audit have no successful actual evidence in this run. `audits=null`, `held=true`; no ordinary failure cause is inferred from class name.

All actual runtime and private-root operations have stopped. S5 candidate/source/helper/report remains frozen and nonoperative. Only a separate public-source diagnostic proposal is permitted next; no product/fixture/helper mutation or actual rerun.
