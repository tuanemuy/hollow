# S5 finite helper candidate independent preflight

判定: **FAIL — S5-TG1 の最小工具補正が必要**。製品候補 e25 の D1 source-static PASS は保持する。この結果は工具起動前の静的判定であり、S5 criteria の完成・実行許可・fixture/native 閉鎖証拠にはしない。対象の全読取を停止した。実行/default/明示 preflight/import/root probe/create/DB/native/build/browser はすべて0。

検証時刻: 2026-10-06T08:38:08.349584+00:00

## 固定対象と直接照合

| 公開対象 | bytes | SHA256 |
| --- | ---: | --- |
| helpers/p5c-s5-test-runner.py | 289768 | a365763b796fa27e38543dcabf4f54320f4fed5865dbf0210f789a23927e5c10 |
| helpers/p5c-s5-test-config.mts | 389687 | 13dd50e505c00cd0e4813ceb25593ea2cff26630c265751814b00d912f6f203e |
| phases/P5c-3-s5-test-candidate.md | 15611 | 1e44b704c3368a487fd9a2558725b80ede0fdcfd5fb135383cf91ce147cc6083 |

3公開ファイルは canonical regular600/nonlink/nlink1/ownUID、NOFOLLOW open、前後 dev/ino/size/mtime/ctime、全文SHAを直接確認し、末尾でも同値を確認した。

SOURCE は hollow-p5c-machine-79ef126-20261006 の e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42。1470 regular / 21,263,983B の全文SHA・Git blob・HEAD tree・実mode600/唯一Git100755の実700・ownUID/nlink1/canonical/前後FD identityを直接照合。AGENTS→CLAUDE.md は唯一の tracked internal link。config/runner の1470 path/bytes/SHA、108 public link、108 metadata rows の内容は一致し、各link targetと83 unique package.jsonの固定bytes/fullSHAを直接確認した。manifest d1b9a0b801f758742051495c7c5f9daa9645a778aee57279340f9fad4a7ec29e とCF 986BのSHA1803d60aa0818e5a3a7630807466ffaae8fdeb0fd85b7fa59431638fc5a479faは一致。main working source、他worktree、validation/private/B実物は読んでいない。

旧S4公開runner275167B/b6cf65118fbde4f42cc99c03a00862a749e83c4ab7a913dd7ed04f019d335af8のテキストだけを比較した。checkpoint/safe_diagnostic/validate_diagnostic/require/read_regular/resource_io_context/resource_diagnostic/group_state/owned_signal/diagnostic_json/fork_ledger_receipt/copy_db/save_summary の13 AST source segmentsは全文同値。run_groupの5 while、superviseの3 whileは各AST同値。旧rootに紐付く資材の探索・読取・再利用は0。

## S5-TG1: setup完了時のsource guard呼出がない

phase「Controlled source and setup gates」は runner startup、owner spawn直前/直後、**setup completion**、family tail のcontrolled source guardを約束する。configのsourceGuard定義は28–42行だが、実呼出は192行・212行のD1 spawn前後と223行のafterAllのみ。162–227行のsetup branchはProxyとafterAllを登録して終了し、fixture収集前のsourceGuardを実行しない。

因果: runner startupで公開sourceを照合 → Node config/setup起動 → setup完了guardなし → fixture import/beforeAllのDB作成と通常APIへ進む → 後のafterAll/family tailでしか相違を拒否できない。現在source変化やこの動作は未観測であり、実失敗原因とは扱わない。採用済みのsetup checkpointがコードに欠ける静的不足である。

最小対応: 同じsetup realm内で、observer/afterAll登録後・fixture collectへ渡す前に、既存sourceGuardを一度実呼出する。guard/error/source/proof/native仕様を新設・緩和しない。変更したconfigのSHAだけをrunnerへ従属更新し、必要な公開固定報告を更新する。異常は既存outerのown NodePG有限回収/held/no-copy/no-auditへ進める。Rootはこの補正を採用済み。修正candidate固定後にこの影響deltaだけを再照合する。

## その他の有限静的照合

- pure4/app7/native2+正式skip8/native-d1 1+正式skip9のtitle、順番、moduleを現sourceに対応。public TestCaseの ` > ` とJSONのspace fullNameは分離され、同TestCase ready/result、skip mode/result/diagnosticと実開始なし、全required pass/error0/hook start=endが通常gate。skipをpassにしていない。app countsは2success/4failed/1cancel、7notes/originals・14jobs・11revisions、native2success/4jobs/4revisions、D1 2failed/4jobs/2revisionsのsource由来固定期待であり、実値ではない。
- custom initializer s5-observed-forksはbuiltin名を避け、stock ForksPoolWorker.name/protocolを保持。public Vitest4.1.6 cli-apiの元fork(entrypoint,[],envREF,execArgvREF,stdio pipe,serialization advanced)とProxy guardは一致。Reflect.applyで元receiver/argsと同ChildProcessを返し、early登録、元kill委譲、same-wrapper限定finally復元を保持。stockSIGTERMと監督force/KILLを別扱い。正常forkにactualexit/close/PID ESRCH/stdio EOF-close/public disconnect・connectedfalse・channel releaseを要求し、IPC EOF/FDはnullの未観測を保持。
- 公開Vitest initはworker/pool envをsetup前に設定し、runner collectTestsはsetup import完了後にfixture collectへ渡す。sequence.hooks=stackでfixture afterAllがsetup observerより先に走る設計。self configのtop-level vitest/node・vitest/config importとSSRed同realmでの実到達、変換cacheの挙動は未実行であり、起動成功とは判定しない。Node execPath/version24.18 gateはconfig/setupの双方にあり、receipt2を要求する。
- native Proxyは元canonical parserWorker.mjs URL/options/transferListを通し、元Workerと元terminate Promiseを保持。新Promiseで置換せず、派生観測のrejectionはobserverFaultへ。累積2/sim1、successmessage・同handle termination fulfillment・actualexit0/1一致・両readable END/closeを要求。streamErrorObserved=nullは欠測であり、新しいerror消費/閉鎖能力/proof生成はない。
- D1原sourceのownerProgram・Node argv5・DTO sourceRoot/database/objects/directory・cwd/env3/PIPE3をProxyが束縛し、元spawn/this/args/resultを保持する。original childは同期保存後にイベントを登録し、sourceGuardのspawn前後チェックを保持する。原inline registerHooksやDTOは書換えない。/bin/ps -p exactownPID -o ppid=,pgid= は元spawnによる別role1で、1024B/1s・実exit/close/両EOF-FD/PID ESRCHとPPID/registeredNodePGを正常条件にする。強制/未知/EPERMはheld。ownerは自然exit0/無signal/PID ESRCH/PIPE閉鎖を要求し、全PG不在とは区別する。actual ps、transitive TS import、個別閉鎖、record3 acquire・同cap rollback/commit-response-lossは未実行。
- 正常requiredcase/Reporter/fork/native/Node0・無force/knownPGabsent・2rawPIPE EOF/実FDclose・source tail/strict guardの後だけauditへ進む。WAL/journalの存在拒否→exclusive600のbounded opaque/audit8MiBコピー→immutable query_only/FK/integrity/固定期待counts→実auditclose→最終strict/capacity。原fixture停止・checkpoint strict000・client.closedはsourceの同期assert由来であり、SQL監査やnormal ledgerだけでnative閉鎖proofを作らない。
- public config389687Bは採用1MiB readonly枠内。private256KiB materialへコピーしない。source32MiB、root192MiB、DB sum80MiBとfamily DB32/opaque8/audit8、original8/cache16/TMP8/records8、8192entries、rawoutput2MiB/control32KiB、native ledger8KiBを保持。pure DB/original0。独立family一回、NodeCLI1/fork1、native W2/live1またはD1owner1+ps1、network/browser/external/audio0の計画。200ms監督、430+50/outer480、TERM10/KILL10、actualleader exitとPG不在/EOF/FD/forceを別に扱う。TMPの累積inner128+outer128、live-ownPG条件、quiescent strictのbaseline guardを保持。

## 根拠と限界・次の順番

直接: 公開code/source/HEAD/blob/metadata/SHA・13functions/監督loopsの同値・family source assertions・公開Vitest正常fork/setup順・Python AST/compile-in-memory。借用: phaseのwholeworkspace/typecheck/strictconfig・Node syntax成功、既S5-D1 source-static PASS。tsgo/Node/Vitest CLIは今回起動していない。

本candidateの静的不足1点を修正し固定SHAへ比例delta preflight → Rootによる公開precheck/明示 --preflight <exactfamily> の別採用 → Rootが一つのfresh familyだけを別採用する。現在candidateの --supervise/--run は採用しない。元source/backendは変更不要。familyを自動連続実行しない。

actual startup/realm/import/cache/通常native閉鎖/前任能力/DB/auditはすべて未実行。D truepredecessor、S5残current/atomicrefs/resourceundo・全F UI等は未完のまま。sourceassertやapp codec outcomeを物理閉鎖・private proof/ACK・S5 criteria合格へ昇格しない。全新旧private roots/results/keys/DB/cache/proofs、B、main、P5d/UI工具はstat/read/hash/import/copy/reuse0。公開報告のみ新規保存し、全対象読取を終了した。
