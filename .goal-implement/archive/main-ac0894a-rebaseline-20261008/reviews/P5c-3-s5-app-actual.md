# P5c-3 S5 APP7 actual 局所レビュー

判定: APP7 source assertions は局所 PASS（actual は Root 借用）。family 全体は FAIL/held、readonly audit は未成立。STATIC 工具不足 S5-AUDIT-TABLE1 を確認した。全 S5 A–F の受入、Native/D1 の直接条件、UI 完成へ昇格しない。レビュー後 ALL read STOP。actual/default/preflight/import/DB/root probe/Worker/外部操作は 0。

## 固定根拠と範囲

- SOURCE `e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42`、1470 source manifest `d1b9a0b801f758742051495c7c5f9daa9645a778aee57279340f9fad4a7ec29e`。既受入 preflight を借用し、全1470/108再走査は行っていない。
- PUBLIC actual phase `phases/P5c-3-s5-app-actual.md`: 5027 B / SHA256 `1d33d042b4c4c47af87901153489e270d1e49d1223546ccca43e85cdb6d70899`。原 Root stdout の選択投影であり、完全コピーではない。
- PUBLIC runner `helpers/p5c-s5-test-runner.py`: 289777 B / `c257bf79051768fec3707e6c2251769a110c78cef781a981e7c767ae75d4a75e`。config `8802fd05112faa4a23f235eb6dc5a4299c27da4d4ae1e65da82ec5af3e81e6d9` は既固定 preflight の継承。phase/runner は regular600/nonlink/nlink1/canonical/UID、NOFOLLOW 全文読取と前後 dev/ino/size/mtime/ctime/hash を直接確認。
- exact APP test `packages/core/src/adapters/libsql/__tests__/machineRegeneration.integration.test.ts`: 21188 B / `2b80c745b86220f360e673b97bb9b5bf6601f7cc361d95c77159a938b8646700`。必要な PUBLIC schema/repository/migration を source tree 内だけで読んだ。下記9ファイルも600/nonlink/nlink1/UID/canonical/full stable read を直接確認。

## Actual 安全結果（Root 借用）

PUBLIC precheck/source binding PASS → existing `--preflight app` PASS → sole APP `a184c90e` 実行。Node 0、official JSON 7 passed / 0 failed、Reporter ready/result 各7・sameTestCase identity・skip0・errors0・hook start/end 各3。afterAll assertions-passed、inner normal result は strict true/ok true。

stock fork は actual same handle、既知PID absent、actual exit/close、readable1/2 EOF/close、public disconnect/connected false/channel release を満たす normal requested SIGTERM。code null、signal SIGTERM、KILL false。stdin finish false、IPC EOF/FD は null のまま。native ledger は restored/no observer fault、Worker0/ownerAttempts0。これらは個別 native proof や DB OS FD の閉鎖証明ではない。

Node PG absent、outer Python/Node PG absent、両 raw PIPE EOF と FD close、force TERM/KILL 0。post-result readonly audit は `audit-driver-error`、audit null、Python 1、held true、outer final strictClosedGuard false/resource null。inner success や outer safe diagnostic の null fault で audit/family normal を補完しない。audit connection/copy の実状態、実FK/integrity/件数/actual audit close は未観測。

## STATIC S5-AUDIT-TABLE1: jobs は正式物理 table 名ではない

runner `audit()` の queries（約643行）は jobs ラベルに `SELECT count(*) FROM jobs` を使う。正式 `hollowSchema.ts:122–123` は `conversionJobs = sqliteTable("conversion_jobs", ...)`、`repositories/jobRepository.ts:5` は `conversionJobs as jobs` を import する。`jobs` は TypeScript の局所 alias であり、SQL table 名ではない。正式 `migrations/0001_polite_speedball.sql:1` も `CREATE TABLE conversion_jobs`。固定 migrations の CREATE TABLE/VIEW jobs 名照合に jobs 定義は無い。

因果列は「正式 migration → conversion_jobs 作成 → LibsqlJobRepository はその table を使用 → runner は異なる jobs を問い合わせる」。これは actual SQL/driver raw error を読まずに確定できる schema 不一致。今回 driver error の具体原因・実際の到達SQL・値をこれと断定しない。

最小修正案は runner-only の SQL `FROM jobs` → `FROM conversion_jobs`。診断ラベル jobs、期待 `n*2`、normal predicates、copy/audit/closure、資源・deadline・case/source を変更しない。APP に限らず同 audit を使う未実行 Native/D1 の工具にも関係するが、追加実行は未採用。

残 audit 識別子は正式 schema に存在する: machine_regenerations / phase / outcome / owner_state / source_memory_bytes / source_input_receipt、note_revisions、llm_conversions、llm_pdf_previews、llm_quota_reservations、llm_dispatches、object_writes.active。特に `inputReceipt` の物理名は `source_input_receipt`（regenerationSchema.ts:190、0043:5）。そこを input_receipt に変更する必要はない。本照合は実 SQL/SQLite driver 実行成功の証拠ではない。

## APP7 の局所意味と未成立

1. HTML/Markdown 各1: normal request 重複は同返却、machine succeeded、closed input/activeInputs0、LLM quota reservation null、undo で previous body を保持。fake extractor による codec 本文対であり、各format native producer の閉鎖や current race 全条件ではない。
2. unused finish: genuine same input proof を finishInput に渡した後、owner active/acquiring、closed receipt 同値/sourceMemory0、consumed true、generic job running/quota null を assert。その後 normal completeMachine failed。true predecessor の record3/acquire/owner-only recovery はこの case から補完しない。
3. queued cancel: cancelled/input receipt null/activeInputs0。
4. finish response loss: pendingCompletion に元 proof、execution active/input1/previous body を維持した後、same completion reconciliation で failed、input0/execution false/previous body。failed terminal を成功採用や正常自然 pin 解放と同一視しない。
5. sanitize failure: failed/previous note version0/input0。
6. expired queued: failed/input receipt null/input0/previous body。

source fixture close は execution.stop 後 activeInputs0、FK/integrity assertions、normal-only WAL TRUNCATE の columns/one-row/safeinteger000、finally client.close/client.closed を要求する。afterAll assertions 成功との局所整合はあるが、readonly audit の欠測を埋めず、PRAGMA/driver property を native FD proof にしない。

source-derived audit 期待は据置: account1/workspace0/note7/original7、generic conversion_jobs14（seed7 + 各 normal machine request7、重複 request は追加なし）、machine7（success2/failed4/cancel1）、revisions11（initial7 + success2 adoption + undo2）、live machine0/pins0/LLM関連各0。これは現在 source/helper の期待であり、失敗 root の観測値ではない。実 audit 件数は全て未観測。

## 直接 static ファイル指紋

| PUBLIC own-source path（libsql 以下） | SHA256 |
| --- | --- |
| hollowSchema.ts | 7c0aca7474735509acf52d17dde51d00c0d36da924e8bc2a87112361f6359c78 |
| regenerationSchema.ts | 6cbdbcfee5b2d0ca1079d4f2c7d529b5f4de80b76483648191e934378a47cd5b |
| revisionSchema.ts | 9b82b791e47b6630825e835b62172b554ff32fcecea1301b3fb5fbde3a81b95c |
| llmSchema.ts | e29bce7183b4f86c232fcfc861875cb316a99959e6a7c89aeca0f3987b8ba5d3 |
| purgeSchema.ts | dd211135275965b7bac2647d2552a86219e41949bb79a05fe40ede974184ada8 |
| repositories/jobRepository.ts | 7b7fc3f4099031af44e9154df41b7416e0de372952d9b715b21e9244335e6b51 |
| migrations/0001_polite_speedball.sql | f4cd56cad09f80bee5273ae31a0b7b6c84fdb46061eca2bcecf392b282322752 |
| migrations/0043_regeneration_input_stage.sql | c97c1d73d1ac4c99f461163dc81a4320f4b6dcb61c775fea5d5c8b0cba68316e |

全 a184c90e DB/sidecar/opaque/audit/results/cache/TMP と旧privateは permanent NONOP。stat/read/hash/copy/import/reuse/replay/cleanup 0。main/P5d/UI/B実物操作0。Native/D1 actual0、body rollback/final current/atomic refs/resource undo の未網羅部分と F UI は未完。旧 PURE341 cause と今回 raw driver cause は UNKNOWN。追加試行を本reviewは許可しない。

記録時刻: 2026-10-06T09:05:09.556071+00:00
