# P5d CA67 DRAIN-CODE1 — independent diagnostic-delta review

固定時刻: 2026-10-06T11:49:30+00:00
判定: **LIMITED STATIC PASS**。診断 delta のみ独立直接照合した。default/preflight/actual/source import/DB/key/native/runtime/rootprobe/create はすべて 0。旧 CA67 本体は私が作者であり、独立再受入していない。旧本体の条件・資源・正常 closure 根拠は前 Verifier の STATIC 根拠（Root 指定 9e5a1…）を借用し、今回は byte 同値を直接確認した。実 failure の原因・throw 地点・counter 値・ACK/receipt/native/DB 物理閉鎖は UNKNOWN。候補 PASS は機能受入・P5d A–H 完了ではない。

## 固定入力と直接範囲

- candidate phase: phases/P5d-drive-capacity-drain-code-candidate.md — 26,933 B / SHA256 6b9a4f9687fdbff227581907e5b1b15147e1f4c7c18f286d5f7cf82b7ca24789。全文 stable 読取、regular0600/selfUID/nlink1/canonical、元 FD actual close。
- proposal 5,732 B / 101235e8f313e67ba9afba47517ddd1595332784cab66ae3563f7fd9aba8a815 は candidate/Root 採用情報を借用。今回 proposal 本文の再読取・基盤再設計は行わない。
- SOURCE: /Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006
- HEAD e55b08cbb691835736c8e14392ee025b1eaba99a / parent abdac900e012d4e93550ed905f8ecee3b300ac8a を Git 直接確認。
- source98 = 1,912,323 B、pair 596af1dd4ea11581035e84baa5a0a06985aff73dd85c948013198cc5ce55d0d4、shape e9cc3a7baca0fec0bbd847b460b57842ed552c936a9693bff4de83fe3c40ae8b を直接再計算。pair は sorted path + space + SHA + newline、shape は sorted [path,bytes,SHA,actualModeString,HEADblob] の compact JSON。
- manifest98 だけを O_NOFOLLOW 全文読取。self UID/regular/nlink1/canonical、各 exact mode、前後 dev/ino/mode/UID/nlink/size/mtime/ctime を直接照合。working bytes の Git blob と HEAD blob 同値。old96 の親 Git blob 同値、commit outside2 差0、tracked work/index diff --quiet とも exit0。
- 新 source2 の本文・親差分を直接照合。新 public helper2 と旧 public CA67 helper2 の全文 stable hash を直接照合。旧 helper 内の ROOT は比較文字列のみ、root 操作0。

| 種類 | path | bytes | SHA256 |
| --- | --- | ---: | --- |
| new test | packages/core/src/adapters/libsql/__tests__/accountDeletionDriveCapacity.integration.test.ts | 8164 | b0f48dc87d074a9f3ee50e244d75a0c8f59cf0594ee873b2d40a62685927bac3 |
| new fixture | packages/core/src/adapters/libsql/__tests__/accountDeletionDriveCapacityFixtures.ts | 19551 | 967ae00d8011b113ee75910f30ced8020dc577337ea30245a0273aedebabeb48 |
| new runner | .goal-implement/helpers/p5d-drive-capacity-drain-code-runner.py | 25619 | 72121698913a9c6b319cbab834b65b5448dc12e4b2ae1875d19d814b97e9f5f9 |
| new loader | .goal-implement/helpers/p5d-drive-capacity-drain-code-loader.mjs | 24711 | 9af650917c662a7d9c053972a85de49ca6bff61b7fb2eedbac38160f86adc21a |
| old runner PUBLIC | .goal-implement/helpers/p5d-drive-capacity-runner.py | 25257 | a23139fe143733c5413ce8372cabd53e97309d3ab2029b9dce77d246ee0f29cb |
| old loader PUBLIC | .goal-implement/helpers/p5d-drive-capacity-loader.mjs | 24441 | 51ed0bbc7ae1bde600535a54af0a20d8c838afeac8095ea434d28e272928c5db |

public helper4 actual0600/regular/nlink1/selfUID/canonical/fullstable/元readFD actualclosed を直接確認。SOURCE modes は manifest の mixed600/644 等を exact 照合し、mode一般許可・chmodを加えていない。

## 診断 delta の判定

fixture:76–97 の閉じた8literal union と private nullable state、sourceFault ??= value が first-sticky を保つ。fixture:489–491 getter は同 private state のみ返し、Error property/message/stack/cause/constructor/toSerialized、任意 ID/path/SQL/key/proof を読む追加コードはない。state は factory ごと初期 NULL、他 error/未到達を成功値で埋めない。

| enum | direct SOURCE | 元拒否条件・操作を維持 |
| --- | --- | --- |
| client-method-bound / client-statement-bound / client-both-bound | fixture:212–229 | 既 counter 加算後 methods>12288 OR statements>12288 内のみ。既計算済み number だけで分類。元 failed=true と Error/throw 維持、元 count の増加や再 client call なし |
| uow-bound | fixture:305–311 | 元 ++unitOfWorkCalls>768 内。元 failed=true/throw、原 originalRun(fn) の戻りを保持 |
| native-receipt | fixture:374–384 | !receipt OR !verifyAcknowledgedReceipt OR duplicate の元短絡条件不変更。record は条件成立後のみ、追加 verify/receipt生成なし |
| save-result | fixture:386–389 | 原 save.call(u.accountDeletions,value) の await 後、!saved OR drains.length>=68 の元条件/throw 保持 |
| exact-read | fixture:397–408 | 原 read.call 同 receiver/value/result、!found OR row.read OR JSON不一致 OR verifyfalse の元短絡順維持 |
| count-result | fixture:513–519 | 原 SQL execute/row0 後、!row OR typeof row.n!=number。元 throw/return row.n 維持 |

元 UoW/context/transaction/client handles の作成、receiver、args、戻り/error/Promise は診断差で変わらない。native ACK fixture:341–359 は originalAcknowledge.call(execution,proof) の同 Promise を返す旧 body のまま。client/tx wrappers は元結果/Promiseを返す旧 body 同値。repo save/read observer は元から async await wrapper であり、同結果・元 receiver/args は維持するが元 repository Promise と wrapper Promise の同一性は主張しない。

afterCommit drains.push/read=true と finally observer復元（fixture:391–423）は旧 body同値。元 commit/save/read、genuinereceipt verify-consume、ACK retirement、正常fixture.stop/close/checkpoint、originalfinally client.close、監査 gate に新能力/boolean bypass/偽proofを追加していない。

test:50–60 は元 onTestFailed 一回と f.fail()/write例外時 f.fail() を保持し、既 case-failure frame に sourceFault getter 一fieldだけ追加。元 case assertion/API/await/body/finally/checkpoint更新は全文inverseで同値。frame writeの成功をproof/ACK/closureへ昇格しない。sourceFault enumは拒否条件群の分類で、個別 predicate や根本原因ではない。onTestFailed未到達/fixture生成中failで frameが無い可能性は旧制限のまま。

## schema / held / 資源

loader:36 の8enum Set、loader:257 の exact keys case,checkpoint,event,sourceFault と既checkpoint/CA67/duplicate拒否。NULL又はSet memberだけ受入。JSON object/array/bool/number/unknownstring/missingfield は memberではなく拒否。原 caseFailure=true → emit → normal summary拒否を保持。

runner:21 enum8、runner:276–277 は exact4keys、sourceFault NULL 又は stringで8member、元checkpoint/CA67/duplicate拒否。runner:308 normal summary は denial/diagnostic/case-failure 全拒否のまま。非0・unknown・force・denial/failureでauditへ進める変更0。normal actual Node exit0/ownPGabsent/2EOF/元独立FDclose/fixture-closed/afterAll/order/status → audit の旧条件保持。

直接 literal 算術（runtime/原helper importなし）:
- new failure frame最大 fixture prefix込み126 B、outer prefix込み111 B。512 B schema/capを超えない。
- 既 diagnostic 最大479 B は旧 helper body同値として借用。新 field追加を既 diagnostic に混ぜていない。
- control40×512=20,480 B。
- key32 + config16,384 + owner16,384 + storage256 + control20,480 = material53,536 B <= 262,144 B。
- old CA67 case/hook40秒/body180/outer240/200ms、UoW768・client method12288・statement12288、root192MiB/DBside32MiB/sum64MiB/TMP8/log2/original8/material256KiB、stockfork1/cacheFsfalse/businesschild0/nativeWorker0/HTTP-DNS0 は helper/source逆差分で保持。実counter、生成量、physicalclosureは未測定。
- fresh memory literal a79ce408 は runner bindingだけ。existenceprobe/create/default/preflight/actualは0。

fixtureの inherited checkpoint は await PRAGMA wal_checkpoint(TRUNCATE) の結果値未検査という既制限を保持する。今回 strict000、全physicalDB閉鎖、HTTPpositive、元proofページ数やTTL原因の新実測を主張しない。

## inverse と checks の証拠区分

親 source2 と PUBLIC oldhelper2 の exact全文から unified-hunk inverse を memory に適用し全文bytes一致・SHA一致を直接確認。許可差以外があるかは全hunkを直接読んだ。inverse は source/body の等値検査であり、runtime side-effect や原API actual成立の代用ではない。

| inverse | hunks | 親/旧bytes | 完全一致 SHA256 |
| --- | ---: | ---: | --- |
| test sourceFault field除去 | 1 | 8134 | fa4b0d2a10f892f6146ef4d1619d0ba3d4e1771bcabac11d34f3fbdd1eb2db44 |
| fixture union/private state/getter/元拒否条件内記録とbraces逆 | 8 | 18625 | 23a243d52767e7c921c5afeb892b27ae476b6a195b76d216dbb7113f0382c2d3 |
| runner ROOT/loader pathSHA/manifest reportsection/enum/schema逆 | 3 | 25257 | a23139fe143733c5413ce8372cabd53e97309d3ab2029b9dce77d246ee0f29cb |
| loader enum/schema逆 | 2 | 24441 | 51ed0bbc7ae1bde600535a54af0a20d8c838afeac8095ea434d28e272928c5db |

Python ast.parse は new runner text に直接実施成功（helper import/execute/pycache0）。loader --check0 と required whole typecheck→lint:fix→format 各0は候補作者の報告を借用、独立再実行0。内部install/download非発生を checks exit0から推定しない。PUBLIC108 alias metadata/CF986 hashは candidateの既保持報告と binding同値を借用し、未知cache/generateddirs/PID/env/store探索0。

## 未検証と STOP

実failure値/実throw位置/カウンタ値/実TTL/個別branch到達は未検証。normal nativeACK/receipt proof、client/tx physicalclose、全FD/PG/EOF、DB/audit/countsとCA67actual成功は未実行。今回静的PASSは診断差に限定、旧CA67実heldを解除せず、P5d全A–Hを完了にしない。

new review一pathを排他0600作成し、自身全文 stable hash固定・元FD実close後 ALL source/git/helper/report read/writer STOP。作者SOURCE/helper変更0、manager/main/S5/UI編集0。全旧成功/失敗private roots・DB/key/results/cache/proof/TMP/generatedsourceは stat/read/hash/import/copy/reopen/retry/cleanup0。default/runtime/native/rootprobe0、追加agent/goal/spec/spec-implement0。
