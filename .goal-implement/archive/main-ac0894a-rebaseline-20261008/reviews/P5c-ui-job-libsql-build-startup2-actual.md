# UI browse4 startup2 — SAFE result / limited STATIC classification

判定: actual FAIL/held。有限診断の受領と外側の既知PG回収は Root 借用結果に整合する。source/runtime/native build cause は UNKNOWN、正常service閉鎖/build4outputs/UI/job/libSQL は未成立。公開codeで必然的なsource/root binding矛盾は今回確定しなかった。全actualは借用でありVerifierのruntime実行0。report固定後 ALL read STOP。

## 固定根拠

PUBLIC `phases/P5c-ui-job-libsql-build-startup2-actual.md` 4108 B / SHA256 `6ce02c02369a1cc5a8a0bbcdd2cbf004eee118b85a357f3834046c22e2ccbfd8` は complete original safe Root stdout と記載された正本。次の固定3helperとともに canonical regular600/nonlink/nlink1/selfUID、NOFOLLOW full read/path-FD前後 dev/ino/mode/UID/nlink/size/mtime/ctime 安定とfullSHAを直接確認し、reader FDを実closeした。

| PUBLIC helper | bytes | SHA256 |
| --- | ---: | --- |
| p5c-ui-job-libsql-build.py | 26503 | 9b55aa9ffc7bca02e8aa447be3706c17573a7e4274639d1a6cedf4a0c9ed74d2 |
| p5c-ui-job-libsql-build-driver.mjs | 10061 | 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac |
| p5c-ui-job-libsql-build-manifest.json | 117105 | d2b84a5a01c5ac2ea756bab5df138222fd25db892432d1ccd2cf0d6a2a631fa8 |

先の独立候補 preflight 8767/e13688b8 の診断/schema/fullinverse/API/caps/閉鎖gateを継承。元source327/deps707/Git blob/body閉包のprecheckはRoot報告借用、今回はpacked既知metadataだけをメモリdecodeして必要bindingを直接比較した。全deps/source本文再走査、currentmain/workingHEAD読取0。

必要な既登録 public esbuild0.27.7 `node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild/lib/main.js` 97214 B / `bce772de103e1cbb118f1b7313916caa81f0e85461b3b6e3531607e7ed75ec85` は canonical regular644/nonlink/nlink1/UID501/NOFOLLOW stablefullread で直接照合。これは公開installed sourceであり旧生成B/helperではない。package全体やnative binaryを再読・import・実行していない。

## SAFE actual（Root 借用）

PUBLIC5/deps707/source327record precheck PASS → original default PASS（immutableGit reader実使用、新root/source/runtime0）→ sole fresh startup2 --run。safe stdoutは下記のみで、raw stderr本文を取得していない。

- Python1、Node -15、force true、TERM sent-success / KILL not-attempted。
- known Node PG absent true、raw PIPE EOF2/controlEOF true、独立FD4 true。
- strict受理 frames: header(entries4/Worker0/DBfalse) → service registered1/after-start/actualOwnedPGMatch true/stderr NULL → held(kind UNKNOWN, phase BUILD_PENDING, reason UNKNOWN)。
- normal false/held true/databaseAudit false。後続generic UNKNOWN summaryもnormalへ補完しない。
- rawDiscardBytes stdout0/stderr906は破棄件数のみ。906B本文・復元・旧結果再読0。

normal header/service/built/closed のうち built/closed未受領。4output生成/bytes/hash/manifestは未受入であり物理不存在と断定しない。service個別actualexit/close/stdout end-close/stdin finish-close/originalstopはNULL/未観測。外Node TERM-15・PGabsence・outerEOF/FD4はgraceful service閉鎖やnative proofの代替ではない。publication/ownedPG登録はnative開始後の観測でありpermission先行証拠ではない。

## BUILD_PENDING / UNKNOWN で分かる範囲

直接driver:107–112では元module import await解決後に IMPORT_RETURNED、元timer設定後に BUILD_PENDING を代入し、原 `await esbuild.build({...})` へ進む。BUILD_RETURNED は原await解決後、続くresult/input/output/closureのphaseはさらに後である。受理held:154–158はcatchにより作られた。したがって最後に受領したstatement境界はbuild invocation/await領域であり、正常return/input/output/closeの後段へ到達した証拠はない。

phaseはawaitの内部状態を観測していない。options式の評価、member callの同期throw、callが返した元Promiseのreject、元awaitを通過しなかった他の同期例外を現在frameだけで区別できない。後段phaseや正常frame欠測から個別native callback/JS throw/TS parse/resolver/ABIを断定しない。reason UNKNOWNはcatch時に先の非NULLreasonがまだ無かったことを表す。既knownsiteのguard拒否labelが保存されたという証拠は無いが、未分類のnext/API例外・native内部失敗は依然可能である。catchを経たという事実だけを具体Error型や実throwclassへ変換しない。

driverのknownguardは first nonNULL stickyreason。後続 UNKNOWNで SPAWN_BINDING/PORT_DENIED/FRAME_WRITE 等を上書きしない。今回UNKNOWNを受領したこととservice frameがあることを、全guard predicateや原source解決の正常証明へ変換しない。unknown error properties/name/code/message/stack/cause/location/bodyには触れない。

## 公開source / resolver binding の有限比較

packed自己linkの正しいkeyは `apps/web/node_modules/@repo/core`、targetは fresh SOURCEstartup2 + `/packages/core` に一致。4entryは source recordsの `apps/web/app/worker/node/{searchSupervisor,searchQuery,publicQuery,noteProjection}.ts` 全てに一致。元driverのentryPoint式も同relative paths。これはmetadata string/setの整合であり、実link作成/exports選択/解決先ファイル/存在/permissionを証明しない。初回の一般key `node_modules/@repo/core` での参照は該当key無しだったため、正式列挙keyに絞って確認した。誤ったfilesystem不足として扱っていない。

元esbuild main.js:2166は `ensureServiceIsRunning().build(options)`。2265–2272は元stock spawn、2315–2323は new Promise 内の buildOrContext/callback→reject/resolve。従って既registered service後のbuildcallでも、同期準備又は元Promiseが失敗する合法経路がある。1191–1210は元native build responseから内部エラーがあればcallback error、他はresultを返す。これは公開sourceの可能性であり、今回のresponse/error arrays/messageを取得した証拠ではない。原buildは常にPromise正常resolveするという期待はない。

固定 options/API/exports/cache/function/receiver/Promise identity、stocksource/runtime version、resolve/load exactset、build external libSQL/css-tree、output4期待とpostbuild原stdin.end一回の既staticpreflightは維持される。実rejectの理由無しにentry/exports/TS format/包絡/guardを緩める根拠は無い。

## 必要なら次の最小前向き案（未採用・未実装）

現在の診断では元build callが返ったかを区別できない。Rootが別scopeを採用する場合に限り、driverのこの1callを同receiver/元args/optionsで一度呼び、その元返却Promiseをlocalへ保持し、call return直後だけ固定 `BUILD_PROMISE_RETURNED` 境界を記録して同Promiseを一度awaitする案が最小である。元Promiseのwrap/then/catch差替え、error/resultのproperty読取、originalerror置換、追加frame/nativeobserver/scope grantは不要。同期throwならBUILD_PENDING、元Promise await拒否ならBUILD_PROMISE_RETURNEDに区分できるが、後者でもnative/compiler/resolver原因はUNKNOWNのまま。

変更が必要になるexactscopeは PUBLIC driverの元build call周辺と既held phaseenumへの1定数、runner decoder phaseenum＋DRIVER_SHA従属、candidate/manifest binding報告だけ。原source/deps/options/receiver/result/closure/gate/capsを保持し、新byte/material/frame最大の有限再算出と独立delta reviewが必要。ここではhelper/rootを作らず、retryを許可していない。現在でもPUBLIC metadata/source-only閉包確認は可能だが、旧生成SOURCE/rootのresolution probeや外部fallback/unknown error inspectionへ広げない。

## 保全・返却

startup2生成SOURCE/BUILD94f1c6ab/toolTMP、元SOURCE/a063/toolTMP、全旧failed/success private、B/log/results/cache/key/proof/DB は permanent NONOP: stat/read/hash/copy/import/reopen/reuse/replay/cleanup0。Verifierのdefault/Gitreader/sourcecreate/Nodeimport/runtime/build/test/Worker/network/browser/DB/rootprobe0。main/S5/P5d/source1470walk/管理正本/goal/spec/spec-implement/追加agent操作0。

今回writeはこのNEW wx600 reviewのみ。sourcehelper変更0、raw906/body/drivererror取得0。全reader FD閉鎖後、reportをfsync/actualclose/stablepostread/fullSHAで固定し ALL read STOP。新ONE/helper修正はRoot別scope判断まで未採用、通常UI/job/libSQL/native受入0を維持。

記録時刻: 2026-10-06T09:21:41.474580+00:00
