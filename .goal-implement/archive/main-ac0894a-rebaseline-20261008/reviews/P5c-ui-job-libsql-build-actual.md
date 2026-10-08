# P5c UI browse4 build — independent SAFE result review

判定: **実build FAIL/held の安全な分類を限定PASSとする。build成功・native service closure・UI機能の受入は0。** Rootのsole実行のsafe公開投影と固定helperの静的条件は整合する。異常原因はUNKNOWNのままであり、後続再実行は許可しない。全読取・書込・runtimeを停止する。

## Direct public bindings

次の既知PUBLIC4filesだけを全文読取し、canonical regular600/selfUID/nonlink/nlink1/NOFOLLOWを確認した。open前、fd前後、path後のdev/ino/mode/uid/nlink/size/mtime/ctime同値と全文SHA256を直接確認した。helperを評価/import/実行していない。

| File | Bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-ui-job-libsql-build-actual.md | 4183 | e4633285bd51725e1827ef52e3d343478927ff34f1058fb1d752f68e9aeffe13 |
| reviews/P5c-ui-job-libsql-build-gitpg.md | 7233 | b88e5d4b5d10508f3ea77c427b460ab97339d592c658cda1644d39dee4befcbd |
| helpers/p5c-ui-job-libsql-build.py | 25775 | ec269455b0af834c037c7ef76672cf5497316044c89f87d25615da6332d9c1ab |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 9182 | fab719add4dc74f1f9a53121a61b9033b93a6562cd47375a989aefb8125b7617 |

前回B-GIT-PG1の全文inverse21738B/SHA9964056ebce51fbf0fb15d1d1601fd50487cbb25382053aebbeb638498c685d3、driver/packed不変更、material188902B上限、公開依存707/source327とnative primarysourceの静的レビューは前回固定PASSを明示借用する。今回はpackedを再inflateせず、依存707/Git327を再読していない。今回のdirect static読取はrunnerのframe schema/normalgate/force/出力返却とdriverのservice登録/build/close/held経路を照合するためである。

## Borrowed Root execution evidence

実行者はRoot。このレビューは実行stdoutを再取得せず、上記固定actual phaseに記録された完全なsafe公開投影を借用した。Rootによる別direct PUBLIC7/deps707/source327records precheck PASS、default preflight exit0、sole --run Python exit1/about0.299sも同phaseの報告借用であり、独立に再実行した事実ではない。defaultはexecutedfalse/rootProbedfalse/sourceCreatedfalse/databasefalseを返した。

sole actualの公開投影:

```json
{"schemaVersion":1,"executed":true,"normal":false,"held":true,"nodeExit":-15,"knownPGAbsent":true,"pipeEOF":[true,true],"controlEOF":true,"fdClosed":[true,true,true,true],"force":true,"signals":{"TERM":"sent-success","KILL":"not-attempted"},"rawDiscardBytes":[0,906],"frames":[{"event":"header","schemaVersion":1,"entries":4,"nativeWorkers":0,"database":false},{"event":"service","registered":true,"count":1,"stderr":null,"observation":"after-start","actualOwnedPGMatch":true},{"event":"held","kind":"UNKNOWN"}],"databaseAudit":false}
{"schemaVersion":1,"normal":false,"held":true,"kind":"UNKNOWN","databaseAudit":false}
```

Python exit1とNode exit-15を区別する。0.299sはRootのtool timingでありservice正常所要時間ではない。raw stderr906Bは元helperで破棄済みの件数のみ。内容を読取・保存・復元せず、件数から原因を推測しない。

## Gate correlation

runner384–413のframe decoderはheader→service→built→closedを正常順序とし、held UNKNOWNを許可するがfaultを恒久設定する。serviceでは元ownedPidへのos.getpgid結果がknownNodePGと一致した時だけPIDをsafe投影から除去しactualOwnedPGMatch trueにする。今回のheader/service/held列はその異常経路に整合する。

runner528のnormalgateはfaultfalse/forcefalse/Node exit0/独立knownPGabsent true/元PIPE EOF2+control EOF/元FDclose4/buffer空/exact4正常framesを全て要求する。今回force true、Node-15、held frame、built/closed欠測によりnormal false。main539–540のnormal branchへ進めず、出力4hash/manifest返却を受入不可とする。generic第二UNKNOWN行とPython1は、mainのnormal拒否から生じ得る元外側catchにも整合し、別の具体例外を証明しない。

driver44のheaderは固定Node runtime gateと公開依存verify loopより後。service67はstock childのspawn後に元handleを登録して発行する。safe receiptはheader到達・登録1・元knownPG一致を支持するが、driverのstart observer検査全てが成功したことや全API不使用を証明しない。observational heldはservice frame前にも設定され得る。

driver129のbuiltは元build Promiseの返却、held/count/errors/warnings/input/output照合後。driver142のclosedは実exit0/signalNULL/child close/stdout end-close/stdin finish-close/streamErrorfalse/originalStopCalled後だけ発行する。今回はどちらもない。driver143–150のcatchは元例外やheld理由を分類せずUNKNOWNのみ発行し、native closure欠測をouterに残す。したがってbuild拒否、input/output照合、observer又はclosure条件等のどの枝が実際に拒否したかは未観測。service実exit/EOF/closeのboolを欠測から作れない。

## Independent outer closure versus missing native closure

Root safe receiptから借用できる外側の観測は、supervisor TERM sent-success、KILL not-attempted、Node-15、knownPGabsent true、元stdout/stderr EOF2、control EOF、元2Popen streams+2control FDsのclose4である。TERMはforce終了でありgraceful normal-stopではない。PG不在はnative-serviceの個別exit code/stream event/閉鎖receiptへ変換しない。

native serviceはafter-start登録1/knownPG matchとstderr NULLだけを受領した。actual service exit/close/stdoutEnd/stdoutClose/stdinFinish/stdinClose/originalStopは未受領。outer終了が成立してもservice closed frameの代用にしない。nativeWorkers0/databasefalseはheaderの固定policy値であり、実Worker不存在/DB未開設/実addon許可の独立receiptではない。build helperはDB auditを実施しないためdatabaseAudit falseは適切である。

outputmanifest未受入、libSQLaddon/Worker admission/DB job実経路/ブラウザ/UI受入は0。以前のUI Node-6と今回のNode-15を同原因へ結ばない。今回のactual source exception及びservice失敗原因もUNKNOWN。

## Held boundary and next authorized work

生成済SOURCE/BUILD/派生toolTMPはRoot指定の永久NONOP境界を維持する。本レビューではそれらの存在確認・stat/read/hash/copy/import/rerun/cleanupを全て0とした。全旧成功/失敗/private roots、main/S5/P5d/currentworking productも非操作。新root/default/Gitreader/runtime/build/import/DB/probe0。

次の候補準備はPUBLIC source-onlyの分類案をRootへ先に提案する。fixed driverの既登録observer/held/build/closure枝と原official esbuild sourceを限定して照合し、静的契約差が証明できなければ既知stage/predicate有限診断案に留める。stderr body取得・私有failed生成物読取・元error.message/stack取得・原因推定・同root再試行を行わない。診断helper変更やfresh actualは別のscope採用と独立preflightが必要であり、このreviewは起動を許可しない。

NEW reviewだけwx600で固定。helper/product/phase bytes変更0。結果は安全なheld分類の独立整合確認であり、全機能PASSではない。ALL read/write/runtime STOP。goal/spec/spec-implement/manager正本/追加agent操作0。
