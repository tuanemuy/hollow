# OWNER-RACE1 actual 独立局所分類

固定日時: 2026-10-06T13:27:34.656891+00:00

**HELD維持・OWNER要件の正常受入不可。原因UNKNOWN。** 本レビュー担当はOWNER engineering/candidate作者ではない。Rootが稼働中に取得した安全receiptの独立分類に限る。通常race/最後owner/並行退会/全P5d成功を主張しない。SOURCEのguard/Tx/driverlock正例は今回未実証。

## 直接入力と借用境界

phases/P5d-owner-race-actual.md3892B/SHA92865eb60b606f5062fe1a7944f56e222787f9851f9f89899cd0b28679efd10aをcanonical regular0600/selfUID/nlink1/NOFOLLOW/前後fstat安定・全文SHA・actualFDcloseで直接読んだ。私領域から結果を取得し直していない。

借用したRoot観測: SOURCE5481756c8b3521fdb35c6750c9954955a4d9f2a3 parent55ef3b226babeb6269654c66dbe0198eae35d366、direct SOURCE100/1933953B＋extra9/56867B・PUBLIC10883/CF/shims/HEAD-parent-selectedblob precheck1447B/SHAcd87ac62e08aeb8afe508c0718e41a9009851db72bf80149726de2a44fe9689a PASS。既default exit0/preflighttrue/executedfalse/database0/newRoot0をinspectしてONEだけ実行したこと、元candidate31824B/928e9c…と独立staticreview11979B/SHAb1979b2778e91af766f4759b11cfc9e9c6b834543532c1a831507655d6c3695bの採用はRoot報告借用。candidate/helper/dependencyの再検査は行わず、下記新source2だけ直接静的確認した。

## 安全receiptの直接分類

| 観測 | 値 | 意味と限界 |
| --- | --- | --- |
| actualExit / Root報告Node exit | 1 / 1 | 非正常。全case/family成功へ転換しない |
| elapsedMs/outputBytes | 7195 / 825 | 有限観測値。予算余裕は成功根拠でない |
| OR01 state | failed | 唯一case失敗 |
| checkpoint | race | そのstatement群へ入ったことのみ。群内各predicate通過は未証明 |
| sourceFault | NULL | guard/driver正常、全observer成功を証明しない |
| errorClass/nativeCode/index | AssertionError / none / NULL | 原assert失敗分類のみ。実値・SQL・throw地点・原native状態は未観測 |
| beforeAll/afterAll began-ended | true / true | hook開始終了。fixture client/native/ownerの正常閉鎖とは別 |
| stockforks / forksActualClosed | 1 / true | Root工具fork観測の局所閉鎖のみ |
| Worker count / denied | 0 / false | 記録範囲の値。業務guard正例や未知native不在へ一般化しない |
| TERM / KILL | false / false | 外工具force未観測。case/native normalの証明でない |
| supervisorPG/helperOwnPG observed | true / true | 既知自己PG観測あり |
| ownPG/leader | absent / absent | 原known工具PG/leader終了に限る |
| stdoutEOF/stderrEOF | true / true | outer原PIPEの実EOF |
| pipeHandlesClosed | true | finallyでの工具FD閉鎖観測。正常個別four-FD受入へ補完しない |
| normalPipeCloseReceipt | NULL | 正常個別receipt欠測。falseとも成功とも扱わない |
| fixture-closed marker/二client normal receipt | 0 / 未取得 | hook完了から物理閉鎖を推定しない |
| audits | NULL | 実行/成功/closeは未検証。後追いcopy/audit0 |
| summary ok/held/completed | false / true / [] | family恒久heldを維持 |

JSON eventはstage(owner-race)→fork(sameOwnedPGtrue)→case-failure OR01 race/sourceFaultNULL→case failed→results diagnostic AssertionError→P5D_CASE_FAILURE→summary okfalse。casefailureが原因の細分類を保持していないので、accepted数、race overlap、どちらのowner result、driver lock/transient error、guard拒否等はUNKNOWN。nativeCode noneからdriver failureなしと結論しない。assert期待不一致と工具正常受入欠測を同一causeへまとめない。

default/precheck PASSは副作用前binding/gateの借用根拠であり、race実assert/closure/audit/OWNER要件の代替ではない。Node/Python非0とnormalfalseを、fork物理局所閉鎖/outerEOF-FD/PGabsenceが上書きしない。audit0で停止したfailclosed判断は支持する。

## 次の有限診断方向（未実装）

Rootがexactpathを追加提示した後、controlled SOURCEの次2fileだけcanonical regular0600/selfUID/nlink1/NOFOLLOW/前後fstat安定・全文SHA・actualFDcloseで直接確認した。SOURCE全walk/Git実行/他source再検査0。

| exact controlled SOURCE path | bytes | SHA256 | Root固定Gitblob（借用） |
| --- | ---: | --- | --- |
| packages/core/src/adapters/libsql/__tests__/accountDeletionOwnerRace.integration.test.ts | 6478 | e37472600f4f98fa50f63c23ffa15a136a3412afc98d5ff76d57465fb2123356 | ed0042d58c748ee5e1c2ffeb064bec39ee3108da |
| packages/core/src/adapters/libsql/__tests__/accountDeletionOwnerRaceFixtures.ts | 15150 | 7504d3ece2386fb2528427d9885401509223948c6b2bcd1bfabbec8d9b138056 | 7f0c69aaad0b3a67757b270036b788bc398a1f66 |

source test70でcheckpoint=race、71beginRace→93allSettled→97endRace、129でfenceへ進む。この間のdirectexpectは次7site（上限8内）。既markerからどのsiteを通過したか、元await/deleteAccount/driver等から同classが流れたかは判別できない。

| 将来の固定入場marker案 | exact test line | 原assertの対象 |
| --- | ---: | --- |
| RACE_CALLER_OVERLAP | 98 | overlappingCallers===true |
| RACE_TRANSACTION_RECEIPT | 99–105 | 原endRaceの5field receipt exact |
| RACE_WINNER_COUNT | 112 | fulfilled winners length1 |
| RACE_LOSER_COUNT | 113 | rejected losers length1 |
| RACE_ACCEPTED | 122 | winner value status accepted |
| RACE_REFUSAL_CLASS | 123 | 元refusal BusinessRuleError |
| RACE_REFUSAL_CODE | 124 | WORKSPACE_LAST_OWNER code |

次診断は元assert直前のpassive last-entered enumだけ＋元official failure observerの一回投影に限定する案。原receiver/args/await/resultPromise/throw/finally/elapsed/guardは変更しない。line116/120/128のresult-shape固定Errorやdelegateからのfailureは、このmarkerをthrow地点/causeへ格上げせずUNKNOWNを保持する。任意assert値・IDs・SQL・error message/stack・rawstderr・proof/ACK読取/出力0。marker入場はpredicatepass証明でなく、新scope/actual採用はまだない。

fixtureのsource counters・close/checkpoint経路の存在は静的に確認できるが、今回のclient実閉鎖やcheckpoint成功は未測定。afterAllboolからこれらを補完しない。driver lock/Tx isolationと最後owner判定は元case実失敗のため未受入。この最小7site案をRoot採用・独立candidate review後の新finiteoperationに使う判断は可能だが、旧結果から値を回収しない。SOURCE編集0。

## 非操作とSTOP

新ae972c41/root＋派生TMP、DB/sidecars/key/owner/proof/cache/results/全entryと全旧actual/private/generated領域は永久NOOPS。stat/read/hash/copy/import/reopen/replay/cleanup0。default/preflight/runtime/Nodeimport/native/DB/browser/network/rootprobe/create/test0。SOURCE/main/S5/P5d/UI/helper/Manager/既phase編集0。規定checks等の再演0、原client2/UoW32/client4096/stmt4096/observer64/body180outer240/sharedtail30/poll200/case40/root192/DB32sum64/TMP8/raw2/material256Kは不変更。

本NEWreviewのみwx0600/O_EXCL/O_NOFOLLOW/fsync/actualFDclose固定。全reader/writer/runtime STOP。局所分類完了でありOWNER/P5d要件受入ではない。spec/spec-implement/新agent0。
