# OWNER OR-RECEIPT5 safe actual classification

2026-10-06T14:40:44.140409+00:00

判定は **ACTUAL FAIL / HELD**。OR01はRACE_TRANSACTION_RECEIPT群で失敗し、投影actualOpened1が元期待2と異なる。元期待、業務assert、driverguardを変更しない。新5field診断transportは安全結果へ到達したが、正常OWNER競合・原fixture閉鎖・監査は成立していない。

私は新diagnostic deltaの独立reviewerでありRootがactual producer。実結果は固定Rootsafephase全文から借用し、root/結果/DB/log/bufferを独立再取得していない。元OWNER意味はUI11979/b1979の独立根拠借用。自分が作者の旧7marker/fixture全体について新たな全面独立business判定を行わない。

## 実観測と欠測の分類

```json
{
  "decision": "ACTUAL FAIL / HELD; no OWNER business acceptance",
  "safeActualSource": {
    "path": "phases/P5d-owner-race-predicate-receipt-actual.md",
    "bytes": 6631,
    "sha256": "0fcd4527f79ed6040fc1fa8ba89d76b29dd7e904b745785b0ea3eb1d4994b26d",
    "mode": "0600",
    "fullStableDirectRead": true,
    "actualFDClosed": true
  },
  "borrowedRootActual": {
    "precheck": "1525/a6c103633776d9077b99a16b0c72d790601cc62c3dbf69c2344ab67a54700189",
    "defaultExit": 0,
    "defaultPreflight": true,
    "defaultExecuted": false,
    "defaultDatabase": 0,
    "defaultNewRoot": 0,
    "actualRuns": 1,
    "pythonExit": 1,
    "pythonKnownPG": "absent",
    "outerStdoutEOF": true,
    "outerStderrEOF": true,
    "outerStdoutFDClosed": true,
    "outerStderrFDClosed": true,
    "outerForcedTerm": false,
    "outerForcedKill": false,
    "outerFault": null,
    "nodeExit": 1,
    "nodeOwnedPG": "absent",
    "nodeLeader": "absent",
    "innerEOF2": true,
    "innerFinallyHandlesClosed": true,
    "normalPipeCloseReceipt": null,
    "case": "OR01",
    "caseState": "failed",
    "checkpoint": "RACE_TRANSACTION_RECEIPT",
    "sourceFault": null,
    "raceReceipt": {
      "overlappingRequests": true,
      "requested": 2,
      "actualOpened": 1,
      "completed": 2,
      "observerFault": false
    },
    "errorClass": "AssertionError",
    "nativeCode": "none",
    "statementIndex": null,
    "allHooksStartEnd": true,
    "stockForkCount": 1,
    "stockForkActualClosed": true,
    "WorkerCount": 0,
    "denied": false,
    "summaryOk": false,
    "summaryCompleted": [],
    "audits": null,
    "held": true
  },
  "directSourceFiles": [
    {
      "path": "packages/core/src/adapters/libsql/__tests__/accountDeletionOwnerRaceFixtures.ts",
      "bytes": 15150,
      "sha256": "7504d3ece2386fb2528427d9885401509223948c6b2bcd1bfabbec8d9b138056",
      "mode": "0600",
      "canonical": true,
      "regular": true,
      "uid": 501,
      "nlink": 1,
      "fullStable": true,
      "actualFDClosed": true
    },
    {
      "path": "packages/core/src/adapters/libsql/client.ts",
      "bytes": 2372,
      "sha256": "0fa9c5f6b9e81a0b5c0733f7cf908833bac74c08461eef9d42cdde6bb49a0b75",
      "mode": "0600",
      "canonical": true,
      "regular": true,
      "uid": 501,
      "nlink": 1,
      "fullStable": true,
      "actualFDClosed": true
    },
    {
      "path": "packages/core/src/adapters/libsql/hollowUnitOfWork.ts",
      "bytes": 12224,
      "sha256": "b6434a068b8cbcb8780592390e9bdab5697bb0ed1e938ec220976982eac5036e",
      "mode": "0600",
      "canonical": true,
      "regular": true,
      "uid": 501,
      "nlink": 1,
      "fullStable": true,
      "actualFDClosed": true
    },
    {
      "path": "packages/core/src/application/account/deletion.ts",
      "bytes": 1542,
      "sha256": "da08ec61121843b2e1734609ece2050aa6c4544b20c81db648af40e55345c021",
      "mode": "0644",
      "canonical": true,
      "regular": true,
      "uid": 501,
      "nlink": 1,
      "fullStable": true,
      "actualFDClosed": true
    }
  ],
  "unknown": [
    "specific original driver rejection code/cause",
    "winning/losing account or deletion outcome",
    "refusal class/code",
    "final SQL/intent/owner/auth state",
    "normal fixture/client closure marker",
    "normalPipeCloseReceipt",
    "audit",
    "native closure/proof"
  ],
  "allStop": true
}
```

Python/Node actualexit1、自己登録PG/leader absent、実EOF、finally FDclose、force0は異常終了回収の限定根拠である。outer安全JSONはstdoutFDClosed/stderrFDClosedの二fieldを明示し、Root本文の四独立FDclosure報告は別のRootproducer借用として保持する。これらをnormalPipeCloseReceipt NULLや原fixture/client/nativeの正常閉鎖に補完しない。before/afterAll開始終了trueはhook到達でありfixture-closed markerではない。audit NULLを実FK/integrity/最終状態へ変えない。

case-error AssertionError/nativeCode noneはreceipt assertのエラー分類で、元client transaction Promiseのreject理由ではない。sourceFault NULL/observerFault falseは既source observerのsticky faultがない記録であり、driver全成功・正常監査・SQL正しさを証明しない。

## SOURCE-onlyの計数意味

fixture175-184はrace中の元client.transaction要求ごとにRequestを一つ追加し、別laneの未completed requestが存在した時overlapをtrueへする。したがってoverlappingRequestsは要求Promiseの重なりであり、二つの実transaction handleが同時に開いたことやSQL同時実行ではない。

fixture185-188は元transactionを元arguments.lengthの分岐・modeで呼び、元Promiseそのものを204で返す。189-200の派生observerは元Promiseを置換しない。fulfilledのhandleはinstrumentTransaction104でrequest.opened=trueとなる。reject observer198-199はそのrequest.completed=trueにする。opened handleのcompletedはcommit/rollbackの成功observer120-132、又は元close戻り後139でもtrueになる。completedは原request/handle終端観測のbool合算であり、commit成功数・business採用数・native/物理FD終了数ではない。

endRace355-364はraceをfalseへし、既observers全部をbounded awaitしてからplain primitive recordを返す。requested2/actualOpened1/completed2/observerFaultfalseとこのコードを合わせると、二つのrequestの一方はhandle fulfillmentを通り、もう一方はhandle返却前に元transaction Promiseのreject observer198-199を通ったというSOURCE-supported分岐推論に絞れる。生driverがどの内部原因でrejectしたかはこのreceiptから決まらない。serialized facade/queue/DBBEGINなどの内部を未読で因果断定しない。元Promiseがfulfilled/rejectedになったこととnative/DBの実closureは別である。

client.ts24-38は通常createClientのfile protocolにserializeLocalClientをかけて返す。そのためfixtureが観測する元client.transactionはその正式serialized facadeのPromiseであり、最内driver APIと同一視しない。client.ts47-57のWAL/FK/busy_timeout5000は静的通常設定だけで、今回の具体busy/code原因を示さない。

LibsqlHollowUnitOfWorkProvider.run102-106はdb.transaction内でcallbackを実行する。234-239でserializable/LLM共有エラーはそのまま、その他は正式mapDbErrorへ元errorをthrowする。deleteAccount14-43はこのUoWで認可・本人メール・通常取消・accept・afterCommitを行い、正常返却時だけaccepted44を返す。今回のreceipt assertが後続winner/refusal/fence/finalSQL assertより前なので、これらの業務結果を本actualから補完できない。

## 次の最小SOURCE-only調査案

最初に client.ts4の正式 `./serializedClient` importだけから導出する exact `packages/core/src/adapters/libsql/serializedClient.ts` ≤65536Bを、frozen516の正規Gitblob/size/SHA期待に先に束縛して読む案を提案する。現在は当該ファイル本文/実metadata/Gitblob取得0。元file-key共通queue/transaction開設・同期throw/Promise reject・finally release等を閉じ、known原transactionに到達する前の正式拒否条件があるかを確認する。期待2を観測1へ変える修正やblind freshrunではない。

必要なら第二段階にUoW33の正式 `./repositories/helpers` import由来 exact `packages/core/src/adapters/libsql/repositories/helpers.ts` ≤65536Bを同じ方式で採用依頼する。mapDbError分類条件だけの読取でよく、repo/driver依存全walkへ広げない。静的分岐が閉じても具体actualcode未観測なら、元transaction reject observer198-199で固定class/code nullableだけを元erroridentity/Promise/receiver/args/return不変で投影できるかを別設計する。現在は新diagnostic/source実装・helper変更・actual・新root予約を行わない。

SOURCE選択用のformal100表を有限読取した際、hollowUnitOfWork.ts suffixはapplicationとadapterの二rowに一致したため初回selectioncount guardでSOURCE body前停止した。その後採用されたadapter12224/b6434…のexactpathに固定して4fileを読み、全stable/actualmode/FDcloseを確認した。未知pathへfallbackしない。

新c8bd52a4/root+toolTMPと全旧actual/privateは恒久NOOPS。source/helper/product/manager編集0。全SOURCE/Git/publicreport/helper読取終了、全reader/writer/runtime STOP。cause specific UNKNOWNを保ち、当該業務caseをP5d-A–H受入へ昇格しない。
