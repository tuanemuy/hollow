# OWNER OR-RECEIPT5 F1 JSON bytes fix review

2026-10-06T14:27:30.087416+00:00

判定は **LIMITED F1 STATIC PASS**。新runner269のserialize結果に `.encode("utf-8")` を一箇所加え、元bytes wireと同じ型で比較する。正規compact ASCII frameの比較は成立し、重複key/未知key/範囲外/別case/二回目frameの拒否は維持される。先行レビューのF1は本16B差分で解消した。

独立範囲は今回のF1差分と隔離条件式だけ。私は旧7marker作者、新5field/このfix作者ではない。元SOURCE100/loader/元OWNER意味/whole3checksは前回review・既Root独立根拠を借用し、再読sourcewalk/再実行しない。作者fixphaseの18vectorは報告から借用し、別に今回direct18vectorを元AST抽出で確認した。両者を実際のreceipt取得やfixture閉鎖へ格上げしない。

## 直接確認

固定runner全文stablehashを照合し、新serialize expressionの件数1をassertした。16B除去で旧runner25396B/35afd771…全文SHAに一致し、それ以外の正常guard/ROOT/REPORT/LOADER/MANIFEST/limits/監督/監査はbytes不変。helper全体はAST/compileだけで実行していない。純粋なvalid_race_receipt、fixedallowlists、case-failure-frame require条件だけをASTから抽出し、手製の境界inputで隔離評価した。新SOURCEimport/fixture/default/preflight/runtime/DB/private操作0。

```json
{
  "verdict": "LIMITED F1 STATIC PASS",
  "independentScope": "one serialize UTF8bytes delta; prior newprojection review inherited, originalOWNERmeaning borrowed independent UI review",
  "directRunner": {
    "path": ".goal-implement/helpers/p5d-owner-race-predicate-receipt-runner.py",
    "bytes": 25412,
    "sha256": "b5f13abff953100e8066b9a5fe39a551b8350542c0d1c999d8edcae180dbd6f9",
    "canonical": true,
    "regular": true,
    "mode": "0600",
    "uid": 501,
    "nlink": 1,
    "fullStableRead": true,
    "actualFDClosed": true
  },
  "directFixPhase": {
    "path": ".goal-implement/phases/P5d-owner-race-predicate-receipt-json-fix.md",
    "bytes": 4831,
    "sha256": "75ec6e017e2c5d826fb31b80d1f7e1764e6a459a0bb800894e77755f6526c9e5",
    "mode": "0600",
    "uid": 501,
    "nlink": 1,
    "fullStableRead": true,
    "actualFDClosed": true
  },
  "inverse": {
    "newExpressionCount": 1,
    "removedDelta": ".encode(\"utf-8\")",
    "deltaBytes": 16,
    "oldBytes": 25396,
    "oldSha256": "35afd7718d237491c5ef040a5bcb33dc09a2ed4278d11bc894b09ebe2828d048",
    "fullByteMatch": true,
    "otherDelta": 0
  },
  "directIsolatedVectors": [
    {
      "name": "canonical-positive",
      "expectedAccept": true,
      "actualAccept": true,
      "status": "PASS"
    },
    {
      "name": "null-receipt-positive",
      "expectedAccept": true,
      "actualAccept": true,
      "status": "PASS"
    },
    {
      "name": "all-fields-null-positive",
      "expectedAccept": true,
      "actualAccept": true,
      "status": "PASS"
    },
    {
      "name": "maximum64-positive",
      "expectedAccept": true,
      "actualAccept": true,
      "status": "PASS"
    },
    {
      "name": "reordered-key-positive-no-order-enforcement",
      "expectedAccept": true,
      "actualAccept": true,
      "status": "PASS"
    },
    {
      "name": "duplicate-top-key",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "duplicate-nested-key",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "unknown-top-key",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "unknown-nested-key",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "wrongcase",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "wrongcheckpoint",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "range65",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "negative",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "bool-as-integer",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "string-as-bool",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "duplicate-frame",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "array-receipt",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    },
    {
      "name": "whitespace-noncanonical",
      "expectedAccept": false,
      "actualAccept": false,
      "status": "PASS"
    }
  ],
  "checks": {
    "PythonASTCompile": "PASS noexec",
    "isolatedPurePredicateEvaluation": true,
    "fullHelperImport": false,
    "helperMainExecution": false,
    "sourceRechecks": 0,
    "NodeSyntaxRerun": 0
  },
  "borrowedImmutable": {
    "sourceHead": "516af3ba5e64f0ba1a7e3c9da697ca21d2b576f7",
    "sourceRows": 100,
    "sourcePair": "d94f54469a1bc2548378fdba11b0988fcf5fef4fe36f07591845f963350f8440",
    "sourceShape": "0ae1690d9b1469d27c879b0600605bbf01cbbdecfbf148e86a25e295933ae615",
    "loaderBytes": 19301,
    "loaderSha256": "3fdebe6c26735c6dd6ee6ff31ba4a1281acd8f7124249db500790b5e8cafa316",
    "candidateBytes": 28183,
    "candidateSha256": "dd135792183cc4806e03ac0ae72ae5c56d6e4ec5a2b65fe67c08a2b4e7eb5a65",
    "priorReviewBytes": 9809,
    "priorReviewSha256": "b45165c1db922772850f3700c4d71aa11c03e74a9abb81775f2b8f23062e003b",
    "wholeTypeLintFormat": "borrowed prior reported0; not rerun"
  },
  "bounds": {
    "sourceFailureFrame": 240,
    "outerFailureFrame": 229,
    "frameCap": 512,
    "frameCountCap": 40,
    "runtimeMaterialBytes": 72896,
    "materialCap": 262144,
    "rootMiB": 192,
    "DBSumCapMiB": 64,
    "bodySeconds": 180,
    "outerSeconds": 240,
    "changedExcept16MaterialBytes": false
  },
  "operations": {
    "sourceWrites": 0,
    "helperWrites": 0,
    "default": 0,
    "preflight": 0,
    "actual": 0,
    "runtime": 0,
    "privateRead": 0,
    "rootProbe": 0,
    "rootCreate": 0,
    "DB": 0,
    "native": 0,
    "NodeImport": 0
  },
  "allStop": true
}
```

unique-key順は入力JSONから保持されるため、roundtripはキー順固定を強制しない。並び替え正例をdirect確認した。これはRootが受け入れた記述の限定で、新gate追加ではない。exactkeyset/型/整数範囲は別predicateで保持し、duplicate top/nested keyはparseで消え元wireと不一致になるのでrejectする。NULLはUNKNOWNであり、0や正常receiptへ補完しない。

今回のmaterial増分はrunner16Bだけ。25412+19301+28183=72896B≤256KiB。本review/fixphaseは既runtime material参照へ追加していない。source240B/outer229B/packet40等は元SOURCE-derived根拠を借用し不変。

未検証はbusiness raceの実predicate/5field値、genuine driver/owner/input能力、actualfixture/fork/Node/PG/FDclose、DBaudit、ROOT freshabsenceである。候補PASSはactual許可/P5d完了を意味しない。全SOURCE/helper読取・書込・runtime STOP。旧actual/private領域は恒久NOOPS。
