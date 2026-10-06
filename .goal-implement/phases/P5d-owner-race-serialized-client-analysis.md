# OWNER serialized client SOURCE-only analysis

2026-10-06T14:44:39.085036+00:00

serializedClient.tsはfrozenP5d516のimmutable Git blobから期待を先に固定し、actual600の公開workingfileと全文一致を確認した。queueは同ファイル全client共通ではなく、一回のserializeLocalClient呼出ごとに閉じたpendingである。通常fixtureの二clientはそれぞれ別serializerを持つ（既client.ts/createClientとfixture構築根拠借用）。原transaction invocation/await失敗時に同errorを再throwする明示境界があるが、今回の具体nativecode/拒否原因は依然UNKNOWN。元expected actualOpened2を変更しない。

## 固定根拠

```json
{
  "head": "516af3ba5e64f0ba1a7e3c9da697ca21d2b576f7",
  "sourcePath": "packages/core/src/adapters/libsql/serializedClient.ts",
  "pinnedGit": "/nix/store/09lvdab6qif434wbjzz6wlcf6njp8m4h-git-2.51.2/bin/git",
  "gitMode": "100644",
  "gitBlob": "c02f6d323d214b29a9243fbdbea50521e733cd0e",
  "expectedBytes": 3121,
  "expectedSha256": "44e29b4c33f2e314649222b9b86b4c24457e443afbff1e069f1f85e04ba70dcb",
  "expectationOrigin": "ls-tree frozenHEAD exactpath then cat-file size/blob before workingfile read",
  "workingCanonical": true,
  "workingRegular": true,
  "workingMode": "0600",
  "workingUID": 501,
  "workingNlink": 1,
  "workingFullStable": true,
  "actualFDClosed": true,
  "workingEqualsImmutableGit": true,
  "HEADBeforeAfter": true,
  "formalImportOrigin": "adapters/libsql/client.ts4 -> ./serializedClient",
  "borrowedActual": {
    "requested": 2,
    "actualOpened": 1,
    "completed": 2,
    "overlappingRequests": true,
    "observerFault": false,
    "checkpoint": "RACE_TRANSACTION_RECEIPT",
    "state": "HELD"
  },
  "findings": [
    {
      "code": "QUEUE_SCOPE",
      "status": "STATIC DIRECT",
      "lines": [
        11,
        21
      ],
      "value": "one pending closure per serializer invocation; no file parameter, shared file-key Map or global queue"
    },
    {
      "code": "ACQUIRE_CHAIN",
      "status": "STATIC DIRECT",
      "lines": [
        12,
        20
      ],
      "value": "pending starts fulfilled and future gates are resolve-only promises; no rejection producer in this acquire chain"
    },
    {
      "code": "TX_OPEN_BOUNDARY",
      "status": "STATIC DIRECT",
      "lines": [
        50,
        58
      ],
      "value": "await acquire -> original client.transaction(mode) await; original invocation throw/rejection releases queue and rethrows same error before wrapper handle returned"
    },
    {
      "code": "TX_LIFETIME",
      "status": "STATIC DIRECT",
      "lines": [
        59,
        115
      ],
      "value": "unlock only once; commit rejection does not unlock; rollback/close finally unlock; none proves physical FD closure"
    },
    {
      "code": "ACTUAL_BRANCH_CORRELATION",
      "status": "SOURCE-SUPPORTED INFERENCE",
      "value": "prior observer notopened+completed request maps to rejection before wrapped handle; serializer narrows producer to original driver-client transaction invocation/await boundary, not concrete native SQL/code or successful native attempt"
    }
  ],
  "nextReadProposal": [
    {
      "path": "packages/core/src/adapters/libsql/repositories/helpers.ts",
      "maximum": 65536,
      "formalOrigin": "adapters/libsql/hollowUnitOfWork.ts33 -> ./repositories/helpers",
      "purpose": "mapDbError handling to locate whether exact original rejection class/code is translated; no general repository walk",
      "beforeWorkingRead": "Root adopts exact immutableGit expectedbinding first",
      "bodyRead": false,
      "metadataRead": false
    },
    {
      "scope": "formal PUBLIC @libsql/client metadata row from fixed108/83 binding",
      "purpose": "derive exact Node/file transaction entry from exports/import before any implementation-body read; physical target/path/version needs Root exactbinding adoption",
      "bodyRead": false,
      "metadataRead": false
    }
  ],
  "operations": {
    "SOURCEWrites": 0,
    "helperWrites": 0,
    "fixtureChanges": 0,
    "expectedChanges": 0,
    "importsBeyondSourceFile": 0,
    "mapperBodyRead": 0,
    "driverBodyRead": 0,
    "runtime": 0,
    "default": 0,
    "preflight": 0,
    "DB": 0,
    "native": 0,
    "rootProbe": 0,
    "rootCreate": 0,
    "privateRead": 0,
    "newRootReservation": 0
  },
  "allStop": true
}
```

pinnedGitでHEAD516一致→exactpath ls-tree→mode100644/blob一件→cat-file -s上限64KiB→そのimmutable blob全文3121B/SHAを取得した後、初めてactualmetadataとworkingfile本文を確認した。workingfile観測からexpectedを作っていない。actual600はRoot正式採用modeで、一律644や失敗後chmodは行わない。C0の大manifestを再読する必要は無く、P5d同HEAD immutable expectedとRoot採用actualmodeを使った。Git型/size/hash/actualUID/nlink/canonical/NOFOLLOW/前後stat signature/HEAD/実FDcloseは直接確認。

## queueと寿命

11-21のpendingは関数local。各acquireは先行pendingを取り、次のresolve-only promiseをqueueへ置き、先行が解放された後に自身releaseを返す。12の初期resolved promiseと16のresolve-only gateにreject producerはない。file-keyを受け取る引数やglobal registryはこのファイルにない。これは同一clientのtransaction寿命中に、そのclientのexecute/batch等を入れない設計である。二clientを同fileだから同queueと扱う根拠はない。

22-28の通常runはawait operation後、成功/失敗ともfinally release。transaction50-58は先にqueueをacquireしてから元client.transaction(mode)をinvoke/awaitする。その呼出の同期throw又はPromise rejectは55-57でreleaseして同errorをthrowし、73のwrapped handleまで到達しない。ここに再試行、errorcode正規化、busy限定判定はない。acquire自体のresolve-only構造に別のerrorproducerを追加推定しない。

既fixture189-200は元facade transaction Promiseのfulfilled時のみhandleをinstrumentしopened=true、reject時はcompleted=true。今回のsafe requested2/opened1/completed2/observerFaultfalseは、handle返却前にrejectしたrequestが一つあるという前回SOURCE-supported分岐推論を、この元driver-client transaction invocation/await境界へさらに絞れる。ただしnative側が実BEGINを試行したか、同期methodthrowか非同期rejectか、SQLitebusy/lock/timeout/adapter条件のどれかは、このsafe frameと本SOURCEから決まらない。driver codeやwinner/refusalを推測確定しない。

59-65のunlockは一回だけfinishedを立てqueueをreleaseする。commit89-94はassertOpen→元commit await成功→unlockの順なので、commit reject時はownershipを保持する。rollback95-105は元rollbackの成功/失敗にかかわらず元transaction.closeをfinally実行し、その後unlockする。close107-114も元closeのfinallyでunlockする。getter closedはfinished又はdriver.closedを返す。これらは原queue/論理transaction境界であり、原native/DB/実FD/PG閉鎖proofではない。client.close/reconnect48-49は元methodへ直接委譲し、queue-drainをここで捏造しない。

66-71のTRANSACTION_CLOSEDは既wrapped handleがfinished後に再利用された時のguardで、opened=falseになる前段拒否の説明には用いない。今回そのcodeが観測されたという主張は0。

## 次の最小一手

今必要なのは期待値・業務assert・productguardの変更ではなく、元rejectの層を静的に閉じること。必要なら上記formal mapper exactpathをRoot採用のimmutableGit expected先行で読み、source alreadyobservedのUoW共有error変換境界だけ確認する。最内driver実装は@libsql/clientの正式公開metadata/export→Node/file branch→literal importの順で次scopeを先に固定する必要がある。既normalclosureで読んだ別実行contextのtargetを無条件流用せず、P5dのfixed PUBLIC dependency正本への一致から導く。現mapper/driver package本文/metadata読取0。

静的読取後もactual拒否codeが欠測なら、既元transaction rejected observerで固定class/code nullableの受動投影を追加できるかを別候補としてRoot判断へ返す。元error、元Promise、receiver/args/return、opened/completed計数、closure/guard/time/原期待を保持し、rawmessage/stack/SQL/IDs/任意causeは読まない方向に限定する。現在このobserverを実装・実行していない。blind同一巡、timeout増、expect1へのreset、新root予約、native/DBprobeは不要であり未実施。

全SOURCE/Git/公開読取終了、全reader/writer/runtime STOP。c8bd52a4と派生TMPを含む全旧actual/privateは恒久NOOPS。正式SRC分岐推論とactual native原因UNKNOWNを区分し、OWNER受入へ昇格しない。
