# OWNER OR-RECEIPT5 diagnostic delta review

2026-10-06T14:19:46.108399+00:00

判定は **LIMITED STATIC FAIL**。outer runner269行に新しいstr/bytes不一致があり、正規case-failure診断frameを保存できない。SOURCE/test/loaderの採用projection範囲は静的適合するが、本候補の実行採用を支持しない。実actual原因やOWNER business成否はUNKNOWN。

## 独立範囲と借用

私は旧7marker/test/helperの作者で、新5field projectionの作者ではない。独立判定は今回のprojection/schema/bindings差分に限定する。旧OWNERの正規競合・業務assert意味は既独立UI11979/b1979レビューをRootから借用する。旧作者性を全OWNER独立検証へ拡張しない。規定whole3各exit0、公108/83/CF/shim前後不変は候補著者報告の借用で、私は再実行していない。

## F1: canonical frame比較の型不一致

`.goal-implement/helpers/p5d-owner-race-predicate-receipt-runner.py:259` のbufferはbytes。261-262でbytes newlineを分割したlineもbytesで、266のjson.loadsはbytesを受け付ける。一方269の新 `json.dumps(packet, separators=(",", ":"), ensure_ascii=False) == line[4:]` はstrとbytesを比較する。両値が同じUTF8表現でもPythonでは同値にならない。requireはBoundaryError("case-failure-frame")となり、293のpackets.append前に脱出する。その結果、正規projectionを持つcase-failureでもsafeeventsへ保持されない。

loader154の `JSON.stringify(packet) !== line.slice(15)` はstring同士なので、この型不一致はない。JSON roundtripでduplicate keyが消えると元wireと一致せず拒否される。両boundaryのschemaはexacttop5/nested5を要求するが、outerの正規positive packet受入だけが壊れている。

最小修正方向はrunner269の新serialize側だけ明示UTF8bytesへ揃えること（又は等価な厳密UTF8decode比較）。compact同値比較・duplicate拒否・全schema/range・existingpersistentheld/normal/auditgateは維持する。未知形の一般許可や診断presenceからの正常補完は不要。私はこのレビュー中source/helperを編集していない。

本findingは静的な診断transport欠陥であり、過去OWNERactualの業務失敗原因を確定しない。bytes/str型挙動の有限比較だけ確認し、helper本体の実行/import/default/preflight/Vitest/DBは0。

## 条件別判定

```json
[
  {
    "id": "OR-R1",
    "status": "STATIC PASS",
    "evidence": "test retains Awaited<ReturnType<endRace>> reference immediately after original await; fixture endRace355-364 returns fresh literal plain primitive five fields. No API/result/receiver/Promise wrapper."
  },
  {
    "id": "OR-R2",
    "status": "STATIC PASS",
    "evidence": "Original onTestFailed f.fail then one stdout.write remains; no new catch/error transformation. bool/null and safeinteger0..64/null; no clamp/reset/raw/private/errorproperty read. Same test assert/operations body inverse."
  },
  {
    "id": "OR-R3",
    "status": "STATIC PASS",
    "evidence": "Loader38-42 validates nested exactfive keys and bounded types; 154 validates top exactfive keys and JSON.stringify equality. Unknown/duplicate literalkeys are rejected by stringroundtrip; caseFailure sticky and existing failure held."
  },
  {
    "id": "OR-R4",
    "status": "STATIC FAIL",
    "evidence": "Runner269 compares json.dumps str directly with bytes line[4:]; positive canonical casefailure cannot pass. Source schema and range checks are structurally exact but unreachable success for validframe."
  },
  {
    "id": "OR-R5",
    "status": "STATIC PASS",
    "evidence": "Loader154 rejects duplicate casefailure via caseFailure; runner269 existing packets duplicategate preserved. Normal Toolsummary300 excludes case-failure; no diagnostic promotion into normal/audit."
  },
  {
    "id": "OR-R6",
    "status": "STATIC PASS",
    "evidence": "Source parent/head and outsideonepath0; three passive transforms reverse to oldtest6749/be401. Loader two delta blocks and runner five delta blocks reverse to fixed prior fullbytes."
  },
  {
    "id": "OR-R7",
    "status": "STATIC PASS",
    "evidence": "source100 exact table rows directly hashed with actual modes384/420, new fourcolumn shape fixed; Git parent/main testblob exact; no unknown/private walk."
  },
  {
    "id": "OR-R8",
    "status": "STATIC PASS",
    "evidence": "Frame upper240(source)/229(outer)<=512; material25396+19301+28183=72880<=262144; unchanged ops/sourcefixture/SQL/guards/caps verified by inverse."
  },
  {
    "id": "OR-R9",
    "status": "UNKNOWN / not executed",
    "evidence": "No actual datafield, genuine driver race, fixturephysicalclose, forkclose, native closure, DBaudit or currentbusiness predicate proven. Fresh c8bd literal unprobed."
  }
]
```

## 直接固定metadataとinverse

```json
{
  "publicFiles": [
    {
      "path": "phases/P5d-owner-race-predicate-receipt-candidate.md",
      "bytes": 28183,
      "sha256": "dd135792183cc4806e03ac0ae72ae5c56d6e4ec5a2b65fe67c08a2b4e7eb5a65",
      "canonical": true,
      "regular": true,
      "mode": "0600",
      "uid": 501,
      "nlink": 1,
      "stableFullRead": true,
      "actualFDClosed": true
    },
    {
      "path": "helpers/p5d-owner-race-predicate-receipt-runner.py",
      "bytes": 25396,
      "sha256": "35afd7718d237491c5ef040a5bcb33dc09a2ed4278d11bc894b09ebe2828d048",
      "canonical": true,
      "regular": true,
      "mode": "0600",
      "uid": 501,
      "nlink": 1,
      "stableFullRead": true,
      "actualFDClosed": true
    },
    {
      "path": "helpers/p5d-owner-race-predicate-receipt-loader.mjs",
      "bytes": 19301,
      "sha256": "3fdebe6c26735c6dd6ee6ff31ba4a1281acd8f7124249db500790b5e8cafa316",
      "canonical": true,
      "regular": true,
      "mode": "0600",
      "uid": 501,
      "nlink": 1,
      "stableFullRead": true,
      "actualFDClosed": true
    }
  ],
  "source": {
    "tree": "/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006",
    "head": "516af3ba5e64f0ba1a7e3c9da697ca21d2b576f7",
    "parent": "40bf8f25977e18ce3ba4d9aa84f67b298d71d940",
    "test": "packages/core/src/adapters/libsql/__tests__/accountDeletionOwnerRace.integration.test.ts",
    "testBytes": 8406,
    "testSha256": "cee6e7308cdf7b41f49b51718fb28b49ef8f4f65ab4350ed32dfd5ac7cbbb7cf",
    "testGitBlob": "6ceaefcc02511a2493b0660c569a42c7bd79d752",
    "testMode": "0600",
    "testInverseBytes": 6749,
    "testInverseSha256": "be401ca8e28c058d7982395c679ba436cd699e4d7f807439c1ed24eb6325890c",
    "testFullInverse": true,
    "outsideTestDiff": 0,
    "workingDiffBytes": 0,
    "cachedDiffBytes": 0,
    "source100Bytes": 1935881,
    "sourcePair": "d94f54469a1bc2548378fdba11b0988fcf5fef4fe36f07591845f963350f8440",
    "sourceShape": "0ae1690d9b1469d27c879b0600605bbf01cbbdecfbf148e86a25e295933ae615",
    "shapeSchema": [
      "path",
      "modeDecimal",
      "bytes",
      "sha256"
    ],
    "actualModesDecimal": [
      384,
      420
    ],
    "directAll100FullStable": true,
    "allReadFDClosed": true
  },
  "unchangedFixture": {
    "path": "packages/core/src/adapters/libsql/__tests__/accountDeletionOwnerRaceFixtures.ts",
    "bytes": 15150,
    "sha256": "7504d3ece2386fb2528427d9885401509223948c6b2bcd1bfabbec8d9b138056",
    "gitBlob": "7f0c69aaad0b3a67757b270036b788bc398a1f66",
    "plainReturnLines": [
      355,
      364
    ]
  },
  "helperInverse": [
    {
      "new": "runner",
      "deltaBlocks": 5,
      "oldBytes": 24755,
      "oldSHA": "dcb2ea98133171273320e577b873880c0c6e09fd8986a026bf0042f7ba3a90bb",
      "fullInverse": true,
      "allowlist": [
        "ROOT",
        "LOADER/SHA",
        "MANIFEST_SHA",
        "REPORT/heading",
        "validationFunction",
        "newcasefailureSchema"
      ]
    },
    {
      "new": "loader",
      "deltaBlocks": 2,
      "oldBytes": 18669,
      "oldSHA": "1df987213466479c020b3410eb6133e403e86b2795f8a01792a7b5defff9af62",
      "fullInverse": true,
      "allowlist": [
        "validationFunction",
        "newcasefailureSchema"
      ]
    }
  ],
  "finiteBounds": {
    "sourceMaxFailureFrameBytes": 240,
    "outerMaxFailureFrameBytes": 229,
    "frameCap": 512,
    "frameCount": 40,
    "materialBytes": 72880,
    "materialCap": 262144,
    "rootMiB": 192,
    "DBCount": 1,
    "DBMiBSumCap": 64,
    "UoWCap": 32,
    "clientMethodStatementCap": 4096,
    "bodySeconds": 180,
    "outerSeconds": 240,
    "pollMilliseconds": 200
  },
  "operations": {
    "SOURCEWrites": 0,
    "helperWrites": 0,
    "productChanges": 0,
    "default": 0,
    "preflight": 0,
    "test": 0,
    "import": 0,
    "runtime": 0,
    "DB": 0,
    "native": 0,
    "rootProbe": 0,
    "rootCreate": 0,
    "privateRead": 0
  },
  "allStop": true
}
```

SOURCE100直接確認では最初に一律600を誤って仮定した自分のreadguardが最初の正式644rowでbody前停止した。その後formal表の各actualmodeへ固定し直し、600/644の100件すべてを直接stableSHA/size/mode/FDcloseで確認した。候補のmode不備ではなく、レビュー工具側の初期仮定訂正である。

JSON roundtripはcompact wireと等価なserializeを要求するが、一般のJSON key順を並び替えて唯一化する実装ではない。literal producerの固定順はtestで直接確認した。任意順も同値serializeされ得るという静的限界は、exactkeyset/型/重複key拒否の成立と区分する。

全SOURCE/Git/helper/report読取終了、全reader/writer/runtime STOP。旧actual/private ROOT/TMP/results/cache/DB/proofは恒久非操作。LIMITED proposal/静的検証であり、P5d-A–H完了やgenuine OWNER race/nativepositiveへの昇格は0。
