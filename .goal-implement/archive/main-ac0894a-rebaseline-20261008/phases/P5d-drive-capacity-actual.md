# P5d CA67 ONE actual

判定: FAIL / held。case CA67がcheckpoint drain67で失敗。容量拒否・回収・同attempt再開・matched pruneの全条件を受入しない。監査未到達、原因UNKNOWN。新private rootとderived TMPはこの監督終了直後から恒久非操作（stat/read/hash/copy/reopen/replay/cleanup0）、追加retry0。

## 対象と採用

controlled SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006` HEAD abdac900e012d4e93550ed905f8ecee3b300ac8a / parent e30bb941572fcfb4253a25b5a04a27bbf41276b1。candidate30151B/c2c8940bdb84ed797dc57deed718b2d3ecba3dd1b2b4e0092eab12274a7e8851、independent review8510B/9e5a1f851e919f5c5ede321cb95c01f8dc7b8bd18b64a8b4e7a75c6f5f372cbeをRoot全文stable/read採用。repo save/read observerのasync wrapperは元Promise identityを保持しない限界を採用済み。必須native ACK/client/tx/UoW元Promise/handle保持とは区別し、人工waitや保存代行は認めない。

Root直接helper2 regular600/selfUID/nlink1/canonical/stable/fullSHA照合: runner25257B/a23139fe143733c5413ce8372cabd53e97309d3ab2029b9dce77d246ee0f29cb、loader24441B/51ed0bbc7ae1bde600535a54af0a20d8c838afeac8095ea434d28e272928c5db。SOURCE98/1911367B/fullSHA/Gitblob/actualMode、pair9a890e7eff557b604209e8fe3be18019032634c7880b260c3b3c538328478b60、shapeaac01127eec9f95e58d3ef05458f94b27cb5387dc6ce60b39fb000caddad8547、pinned Git metadataとHEAD/parent一致。PUBLIC108 exact formal table canonical targets/前後symlink metadata全一致。Root compact sorted [path,target] hash1382fe198736894738df75469144b6046c637f5d24ef232364d4f788a861dcdcは作者5e9019...の未知serializationと同一と言わず、全108target直接一致を根拠とする。CF986B/1803d60aa0818e5a3a7630807466ffaae8fdeb0fd85b7fa59431638fc5a479fa/actual600、pinnedNode24.18 metadataも直接PASS。

既runner defaultをONE前に実行し、exit0、全結果 {preflight:true,executed:false,database:0,newRoot:0} を確認。その後同runner --executeをONEだけ実行。Python3.14.3 -I -S、対象Node24.18はhelper gate、wholechecks3はcandidateで借用し変更なし再演0。

## 安全結果（生ログ/SQL/ID/proof/key本文0）

fresh suffix493ea817。Python exit1 / actualNodeexit1 / elapsed2841ms / outputBytes804。failure tool-exit-or-eof、normalExitfalse、forcedTermfalse、forcedKillfalse。stdoutEOFtrue/stderrEOFtrue/pipeHandlesClosedtrue、normalPipeCloseReceipt NULL、supervisorPGObservedtrue/helperOwnPGObservedtrue、ownPGState absent / leaderState absent、poll200ms。観測されたouter EOF/FDcloseはstrict正常recepitの成立と区別する。

event stage drive-capacity。fork sameOwnedPGtrue。case-failure CA67 checkpoint drain67。case failed。diagnostic phase results / source case / beforeAllStarted true / beforeAllEnded true / afterAllStarted true / afterAllEnded true、errors一件 Error/nativeCode none/statementIndex NULL。Error message/stack/rawstderr/SQLは読まない。checkpointは直近source entered stageであり、throw位置・成功回収数・保存成功を確定しない。

failure code P5D_CASE_FAILURE。summary okfalse/completed[]/case CA67 failed/forks1/forksActualClosedtrue/workerCount0/deniedfalse。audit NULL / heldtrue。normal original fork individual exit/signal/IPC/stdio detailはこのsummaryから補完しない。Worker0はこの工具観測範囲でありnative内部thread/FDを証明しない。

## 未成立と次判断

正常case/file/fixture/strict normal gateを満たさずreadonly query_only/FK/integrity/sourcecounts audit0。ACK保存/回収25,25,17,1/同68再開/prune68/version69の成立とwholeP5dは未確認。checkpoint drain67から前段の個別assert成功を独立保証しない。Rootが期待を観測値へ変更しない。

独立Verifierには固定safe結果の分類とcontrolled SOURCEのfinite source-only照合を委譲する。全private/root/TMP/results/proof/key/cacheは非操作。決定的SOURCE不一致が見つかった場合だけ作者修正へ返し、原因不明のまま新root再試行しない。C0独立reviewと通常fixture PUBLIC closureを進める。

固定日時: 2026-10-06T11:30:07.236845+00:00
