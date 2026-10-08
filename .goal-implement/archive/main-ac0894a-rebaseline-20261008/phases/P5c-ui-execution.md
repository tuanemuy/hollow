# 新root有限一巡結果 — pure21 PASS / UI_UNKNOWN_DATABASE

2026-10-05T22:59:09.753788+00:00。**第二一巡actual exit1/unproven、UI機能受入未成立。全writer/実行停止。** 実行前runner9a379bdd/boot2c639d6b/launcher c8c05c58/既4helper/newB release93d264・sourceManifest1457・build・entry・queryは全文読了/fullhash/mode600/nlink1/canonical同値、新ui/toolだけ非存在確認、portprobe0。採用済direct `python3 -B publicrunner --run` / cwd repoを一回実行した。

| Safe観測 | 今回の直接結果 |
| --- | --- |
| outer/Node actual exit | 1 / 1、kind unproven |
| 純対 | purePassed=true / pureCount=21（max24、同Node先行gate） |
| UI | root生成true / uiCompleted=false / outerPhase=ui |
| fault | stage ui-work / CAUGHT / 固定marker UI_UNKNOWN_DATABASE |
| finished | seen=true / innerFinishedSuccess=false |
| Node/Chrome自己PG | state absent / absent、absence true / true |
| stdout/stderr | 実EOF true/true、実FDclose true/true |
| control regularFD | actualclose=true、PIPE/EOF不使用(false/false) |
| force / 外期限超過 | false / null |
| ownership mirror / fatal recovery | validated=true / recoveryClosed=null（実回収成功に補完しない） |
| metadata / raw出力 | controlFrames18 / outputBytes321、本文保存・公表0 |
| native hook | sync=true、loaderThreads0 / transformServices0 |

直接stage列は initialization→native-hooks→boot-import→pure→ui-root→ui-work→finalize-restore→finalize-recovery→finalize-hooks→finalize-frame→finalize-fd。例外はcontrol faultへ届き、前候補のerror=null/観測射影欠落と区別できた。各純対名の個別結果は未公表で、aggregate21 PASSとして扱う。U0–U7/inner正常closed/audit/BFCache各結果の直接成功はなく、UI全条件未検証を保持する。自己PG/PIPE/FDの実終了をinner domain closure/proof/ACK/audit正常へ転用しない。UI_UNKNOWN_DATABASEがどの公開guard/生成DBに由来するかはこの時点で未分析。

今回の `/Users/hikaru/.local/share/hollow-validation/ui-67e9b2ca` と `/Users/hikaru/.local/share/hollow-validation/ui-tool-67e9b2ca` もfailedheldへ移し、再読/hash/import/再接続/再利用/追加run/root/port選択/probe0。旧ui0d/tool0d等全failed rootsも非操作。製品C/B/5helpers/runner無変更、報告だけ安全summaryで固定し全writer停止、所有権をManagerへ返す。A正式案はreview中のまま製品実装0。

---

以下は第二一巡の事前binding提出と履歴。

# 別一巡準備 — 新root literal binding fixed candidate

2026-10-05T22:56:04.920262+00:00。**新実行未採用・0、全writer停止。** 前一巡のfailed UI/tool root全非操作/再読/hash/import/再利用0を保持する。新rootはmemory予約だけで生成/非存在probe/portprobe0。origin43173/Cc2/newB3488/sourceManifestde7c/既privatepuregate/nativehook/services0/純対30・UI720・tail30/全caps/proof・正常終了条件は無変更。

| Fixed path | Bytes | SHA256 | Mode/nlink |
| --- | ---: | --- | --- |
| public p5c-ui-runner.py | 35508 | 9a379bddf668be3fcb982b7137111c1e4d2f69386adb45de2386f2410bd32706 | regular600/1 |
| p5c-ui/boot.mts | 38376 | 2c639d6b94fae4ca5b99b34cf61ac61fd7ac2885b48b77fcbd7228b1adbc87f4 | regular600/1 |

新UI `/Users/hikaru/.local/share/hollow-validation/ui-67e9b2ca` とnewtool `/Users/hikaru/.local/share/hollow-validation/ui-tool-67e9b2ca` に固定した。Runner差分はUI literal2箇所(Python ROOT/launcher ROOT)・tool literal1箇所・従属boot SHA1箇所のみ。Bootは `reservedAbsoluteRoot===join(base,"ui-67e9b2ca")` の比較literal1箇所だけで、逆置換の全bytes一致を直接確認した。knownbase/canonicalparent/非存在/排他700/privatepuregateを維持し、scopeを一般regex/root選択へ緩めていない。既4helper hashは全同値、全R1/R2/F1–F6/summary分類の内容を変更していない。

Launcher template10283B/SHA `c8c05c58699a36c13f0a5607983a15afbf1c1be3b4d40e3d3bd95d84cc3f446a`。Python ast.parse/compile actual0(no self-import/pycache)、pinned Node --check stdin actual0/stdout0B/stderr0B、boot比例静的逆差分check成功。追加import/pure/root/DB/browser/Worker/runtime/portprobe0。Normal条件/実観測によるsafe summary/unknown欠測の扱いは同じ。独立binding delta reviewへ所有権を返し、Managerの明示一巡開始まで実行しない。

A-P1/A-P2正式案は `.goal-implement/phases/P5c-3-formats-plan.md`12988B/SHA `ce2200520b51375c2ee5a70ec4295fbd455061ed991ad0e1bd9dbf12d9f82b88`/regular600/nlink1へ保存してAの調査writerも停止。共有port/version3 native birth記録は提案だけ、製品/DB実装0。

---

以下は前candidateの観測補正と失敗履歴。

# 安全summary / 停止経路補正 fixed candidate

2026-10-05T22:50:19.556043+00:00。**最小runner補正を固定、全writer停止。新実行は未採用・0。** 変更はpublicrunnerと本報告だけ。5helpers fullhash同値、製品C c2a3d45f/newB3488/既class・bridge・domain closure・proof/ACK契約は無変更。失敗UI/tool rootは再読/hash/import/再接続/再実行0。

- Publicrunner **35508B / SHA256 `f44353ba66b451e9b862882bac368ccc28d3fd62f847e0036cdca8169df96a51` / regular600 / nlink1**。
- Launcher template **10283B / SHA256 `8804a630e94d6298785bd226b023b262cbf0d3e8e0063cc43387c5e31eadf48b`**。binding置換はownFD/selfrun tag/既5hash/固定case・native enumだけ。
- Python ast.parse/compile actual0、自作module import/pycache0。pinned Node `--check` stdin actual0/stdout0B/stderr0B。アプリ/import/pure/root/DB/browser/Worker/probeは0。追加type/backend再演0。

## Deltaと安全観測

Outerは既receiptのpurePassed、受理したpureCount、uiCompleted、finishedSeen/innerFinishedSuccess、outerPhase、actualNodeExit、PGabsenceとPGstate(absent/alive/unproven/unobserved)、両PIPE実EOF/FDclose、force、外側期限超過stage、control regularFD close、outputBytes/controlFrames、ownership mirror/recoveryClosedを公表summaryへ保持する。従来の6field射影を廃止した。実観測がない値はnull/false/unobservedのまま、EOFを最後のstream.closeで補完しない。Node actual非0は `NODE_NONZERO_EXIT`、finished未取得は `INNER_FINISHED_MISSING` と有限分類する。他の先行faultがあれば上書きせず、非0exit自身も独立fieldに残す。

Node側は initialization/native-hooks/boot-import/pure/ui-root/ui-work/finalize-restore/recovery/hooks/frame/fd の11stage enumをcontrolへ記録する。FD初期validationやhooks/importのawait例外はcatch、restore/deregister/最終frame/FDcloseは個別のfinalization faultへ、async IIFE rejectionもdefault unhandled rejectionへ再throwする前にsafe faultへ結ぶ。`uncaughtExceptionMonitor` はoriginとstage/safe分類だけを記録し、Nodeの既定異常終了を変更しない。uncaughtException/unhandledRejectionを捕捉して続行するlistenerは追加しない。monitorやcontrol書込が不成立なら外側の非0/finished欠測分類へ留める。

Fault frameは固定stage/fault enumとcase markerだけ。fixed5helperのcheck/fail/Error固定literal218件＋launcher固定assertの合算233件を静的固定し、完全一致するErrorのown message descriptorだけをmarkerへ写す。native codeは事前15enumだけ。accessor/dynamic message/未知errorは UNKNOWN、stack・実Error.message・SQL・credentials・rawstderr・tagは公表しない。こうしたmarkerは停止原因の識別であり、case PASS・寿命proof・ACKではない。stage32件/fault16件、既control64frame/32KiB/各512B内。値/metadataからdomain成功を新規生成しない。

Outerの既TERM/KILL/sharedtail、内Chrome actualhandle/5FD/PG回収、全資源cap・同Node pure→UI private gateと元Worker/fork argsは無変更。現safe candidateは過去失敗の原因を回復・特定していない。失敗一巡のUI各条件未検証/21各結果・audit/BFCache欠測は保持する。まず独立delta reviewへ渡し、新root再試行を要求しない。次はA-P1(runtimeOwnership fixedv1拡張)/A-P2(PDF preview readerlease世代)の詳細契約へ切り替える。

---

以下は補正前の公開静的分析と失敗一巡の履歴。

# UI一巡後の公開source静的分析 / 最小補正案

2026-10-05T22:45:47.837937+00:00。**実原因未特定、UI全条件未検証。runner/5helpers/C/Bは変更0、失敗UI/tool root再読/hash/import/再実行0。** 以下は公開runner/helperだけの静的因果であり、新しい実行観測ではない。報告だけ更新し全writerを停止した。

## 確定したprotocol不足

- runner `drain_pipes` は各PIPEの実EOF/closeをreceiptへ保存し、finallyはpurePassed/uiCompleted/controlFrames/outputBytes/force/actual exit/PG/FDを集約する。しかし最後のprintは **kind/nodeExit/error/nodePGAbsent/chromePGAbsent/controlRegularFdClosedだけ** を射影する。pure/PIPE/force等が公表出力から失われた経路はここで確定する。失敗rootにあるreceiptを回復していないので値は欠測のまま。
- 外側はactualNodeexit!=0だけではreceipt.errorを設定しない。`failed`/`finished=false`を受けた時やouter guard等だけがerrorを設定するため、未捕捉例外や最終化失敗でNode1でもerror=nullが可能。**非0actual exitの分類不足**であり例外不在の証拠ではない。
- launcherの通常await import/native hook/pure/completeUiの例外はtry catchへ入りfailed frameを送るが、finallyの `hooks.deregister()` はそのcatchの外、`fs.closeSync(FD)` のcatchはexitCode1だけでfault frameを出さない。イベントcallbackの未捕捉throw/非同期拒否やこのasync IIFE自身のfinally rejectionも通常await catchへ届かない。こうした経路はNode1+failed frame無しを許す。どれが今回起きたかは特定していない。
- 公表ChromePGAbsent=trueにはknownChromePID登録が必要。regular Chrome frameはouter phase=uiを、mirrorはpure_ok/phase=uiを要求する。従って **初回bootstrap/import/native hookだけの起動直後失敗**はこのsummary全体の説明にならない。後続dynamic load/Browserイベント/最終化のどこかは依然未区別。これはsource制御からの推論で、21各条件やU0–U7の直接成功へ格上げしない。

## 次の一手（未実装 / 未実行）

許可を求める最小変更は **publicrunner1pathと本報告だけ**。boot/既4helper/B/Cやdomain private proof/ACK・closure正常条件は変更しない。

1. 現receiptの安全なbool/有限countを全て公表summaryへ含める。purePassed/uiCompleted/controlFrames/outputBytes/ownershipMirrorValidated/recoveryClosed/force/stdoutEof/stderrEof/stdoutClosed/stderrClosedを実観測値のまま出し、phaseとfinishedSeenも加える。ID/SQL値/URL/body/rawstderr/argv/env/識別tagは出さない。closedとEOFを別field、normal/forced/unproven分類を維持する。
2. Node actual非0かつ他fault未分類は `NODE_NONZERO_EXIT`、必要finished欠測は `INNER_FINISHED_MISSING` とouterが分類する。原因を推測した名前にはしない。既unknownはnormalへ変更しない。
3. Launcherが有限stage enum（hook登録/boot import/pure/root/UI/finally）とsafe fault categoryをcontrolへ出す。既自作guard uppercase codeだけ、native codeは事前固定allowlistのみ、未知はgeneric。最後のrestore/deregister/FD-close例外もstage/finalization failureとして区別する。control cap64/32KiB/各512Bは増やさない。
4. Node `uncaughtExceptionMonitor` で未捕捉originと現stageだけを同期metadataへ記録する案。通常uncaught/default terminationを維持し、`uncaughtException`/`unhandledRejection`を捕捉して続行するlistenerは追加しない。controlが不成立ならouterの非0分類へ留める。monitorをdomain終了proofに使わない。

これで次回の結果提出に必要な観測を失わず、raw例外/秘密回復なしで停止経路を区別できる。原因未特定のまま新root再試行を要求していない。まずManager/独立reviewが公開最小差分scopeを判断し、正式採用後だけ補正する。新故障case/資源/probe/FD/socketは追加しない。S4はUI静的分析終了後、独立reviewのruntimeOwnership固定v1/PDF preview readerlease世代findingを入力に契約詳細化する（今は製品/計画追加変更0）。

---

# 採用固定candidate一巡: unproven / 終了保全

2026-10-05T22:43:17.439271+00:00。**一巡actual exit1、機能受入未成立。全writer/実行停止、追加run0。** 実行前のrunner2bc5ec4a/launcher06f96a10/5helper全hash/newB release93d264・build・entry・query・sourceManifestde7c(1457)は全文読了、各regular600/nlink1/canonical/hash同値、予約UI/tool root非存在を確認した。採用済 `python3 -B publicrunner --run` / cwd repoを一回だけ実行した。

公表された安全summaryは `kind=unproven, nodeExit=1, error=null, nodePGAbsent=true, chromePGAbsent=true, controlRegularFdClosed=true`。外側runnerのactual exitも1。**error=nullは原因特定成功を意味しない。** この出力から直接言えるのは自己Node/ChromePGの実不在、Node actual exit1、own control regularFD実closeである。regularFDはPIPE/EOF不使用。

| 条件 | 今回の根拠 |
| --- | --- |
| 実行前固定binding/knownroot非存在 | 直接PASS、socket/probe0 |
| outer/Node actual exit | 直接1、normal成功ではない |
| 自己NodePG/ChromePG不在 | 公表summaryで直接true |
| control regularFD actual close | 公表summaryで直接true |
| 純対21/max24/30秒各結果 | 公表summary未出力、直接結果欠測 |
| U0–U7・inner normal/closed/audit | 公表summary未出力、直接結果欠測 |
| stdout/stderr実EOF・FDclose、force詳細 | 公表summary未出力、直接結果欠測 |
| BFCache persisted/旧callback一回観測 | 公表summary未出力、直接結果欠測 |
| 既S3/backend/artifact/helper静的根拠 | 既受入から借用、今回UI成功の代用品にしない |

この一巡でlogical Chrome PGが外側に取得されたことはChromePGAbsent=trueに表れているが、stage到達やprivate pure gateの制御から各純対/UI成功を逆算して直接PASSへ補完しない。未知/欠測はunprovenのまま。失敗のUI `/Users/hikaru/.local/share/hollow-validation/ui-0d73d1ac` とtool `/Users/hikaru/.local/share/hollow-validation/ui-tool-0d73d1ac` を保全し、実行後の内容再読/再接続/再利用/追加root/portprobe/再実行0。生stderr/SQL値/個人dataを取得していない。製品C/newB/5helpers/runnerの編集0、報告だけを安全summaryで更新して全writer停止、所有権をManagerへ返した。

---

以下は固定candidateの事前提出・履歴。現在の一巡成功を示さない。

# R1/R2 fixed runner — 独立delta preflight提出

2026-10-05T22:36:45.620515+00:00。**R1/R2実装・静的構文check成功、runner/reportを含む全writer停止。実行未許可。** 新UI/tool root・pure・DB・runtime・browser・Worker・socket probeは0。変更はpublicrunnerと本報告だけ、5helpers/C `c2a3d45f1097533c6344346aca303dc1d2aef368` / B3488 release `93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0` は無変更。旧/failed roots・B・helper/privateの読取/再利用0。

- Runner `.goal-implement/helpers/p5c-ui-runner.py`: **26115B / SHA256 `2bc5ec4a1e14285b48e0297647e468c2e79bb48d9ccb86d3b7a5cc8a80b93dff` / regular600 / nlink1**。
- Launcher template: **8660B / SHA256 `06f96a10f5eaf8a3bd045b876b5efb21b141b85d405b4044610b339004f40093`**。実行時置換はown heldFD、selfrun一度生成32hex tag、下記固定5hashだけ。tagはprocess ownership frameを識別する値で、domain secret/proof/ACKを表さない。
- Python AST/compile actual0（自作module import/pycache0）、pinned Node `--check` stdinで固定launcherの構文check actual0/stdout0B/stderr0B。純対やimportの実行0。5helper全hash比較は同値、各regular600/nlink1。旧型check根拠を継承し追加type/runtime再演0。

| Frozen helper | SHA256 |
| --- | --- |
| boot.mts | 497ed39d7a191c3236437404c24adfa052119f0cfc94b8f7f1135b62efbd06d3 |
| provider.mts | 937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0 |
| browser.mts | a4b2192dc6bef805352628197553527d5343a8df9676e903d207e75e3e249de8 |
| contract-pure.mts | ecd265c621895c6bdc188701dbda3c214717db6686d755e0122e50580f14a617 |
| stop-audit.mts | 3cb4b5b5a3b7ec6d20b08588a14abda2c79772044d1348a25559622cc117d638 |

## 現R1 / R2 delta

R1はtsx登録/サービス/loader realmを削除し、main同期 `registerHooks` 登録→boot dynamic importの順にした。追加loader thread・transform/esbuild service・transform子は0。newSのsource-manifest 1457entryをSHA `de7c79fa0c283d1881912c9d7d8a4465edc98b488d5b5d755609e44bc8ec7552` に束縛し、同core/src `.ts` とexact5helpers `.mts` のcanonical regular/nlink1/bytes/fullhash一致だけをnative transformしてJSとして返す。resolveは通常next優先、ERR_MODULE_NOT_FOUNDかつknown source親からrelative/noextである時だけ同manifestの `.ts` を補完。未知/escape/query/TSX/cts/CommonJS TS拒否、bare/compiledJSは通常next、正規Worker/fork args/handlesとsource/B class/privateSymbol identityは無変更。生成JSのFS書込0。programmatic同期hookのWorker default非継承は[Node24.15 module API](https://nodejs.org/download/release/v24.15.0/docs/api/module.html)に基づく。旧async hooks非継承記述は誤りで、以下のtsx案は履歴のみ。

R2はChrome actual childと5stdioのexit/close観測を生成直後に保存し、**既stderrへの同期mirror→regular FD**の順でmetadataを送る。mirrorはselfrun tag付きprefix/固定JSON4field、PID=PG・selfNode PID以外・logical Chrome1件・512B以内。outerはraw本文を保存せずselfrun exact prefixだけを有限scanし、regular側と同PID/PGの重複だけを許す（各channel1件）。通常provider/user本文や異なるtagをsignal対象へ採用しない。合算出力12MiB/regular32KiB・64frame/各512Bを維持、新FD/socket/probe0。

FD write例外では元childをinnerobserverへ返し、自己ChromePGのfatal KILLと5FD destroyを行う。参照付き200ms timerの10秒gateは **actual child exit + actual child close + 5actualFD close + negative PG ESRCH** を待つ。signal要求をclosureへ読み替えず、gate未成立は recoveryClosed=false / failure。outerは通常/異常tailとも両PIPEとregularFDをdrainし、Chrome PGを独立保持する。outer NodeTERMはtail10秒より前には送らずKILL20秒、Chromeは既knownPGのみTERM/KILL、全shared tail30秒内。Node実exit後もPGabsenceを別に確認する。両metadata channel欠測/不正/partial/EPERM/未知/未終端はunproven、未通知Chromeをnormalへ補完しない。特にUI段階でChrome所有を得られない場合はNodeだけの強制終端をforced成功へ分類しない。mirrorはprocess所有だけで、domain closed/proof/ACKを作らない。

## 固定invocation / 資源 / 未実行gate

Rootがこのfixed candidateを採用後だけ、outer direct argv `python3 -B /Users/hikaru/github.com/tuanemuy/hollow/.goal-implement/helpers/p5c-ui-runner.py --run` / cwd repo。Node direct argv `[ /nix/store/3mvbmkd7lmxi3xlka1avra24flwbgjv9-nodejs-24.15.0/bin/node, --eval, boundLauncher ]`、cwd newB/source/apps/web、stdinDEVNULL/PIPE2/ownRegularFD1/start_new_session=true。Node env **PATH=/usr/bin:/bin、LANG=C、TMPDIR=/Users/hikaru/.local/share/hollow-validation/ui-tool-0d73d1ac の3キーだけ**。HOME/NODE_OPTIONS/ambient env/.env/tsx envコピー0、shell/install/download0。

UI root `/Users/hikaru/.local/share/hollow-validation/ui-0d73d1ac` / origin `http://127.0.0.1:43173` / tool root `/Users/hikaru/.local/share/hollow-validation/ui-tool-0d73d1ac` は未生成・port未probe。tool排他700/regularwx600、pure21/max24/30秒成功時のみ既private gate経由でUIroot生成へ進む。UI720秒（normalstop120秒内）を別stage開始、閉鎖tail30秒は操作延長0。既U0–U7/DB/native mutation/Chrome profile/proxy/SQL/bridge capsは変更0。tool+NodeTMP合算8MiB、UI+tool256MiB、outer容量guard200msを維持。

Normalはinner done(actualClosed/auditClosed) + finished + pure + 両channel同Chrome + actualNodeexit0 + Node/ChromePG実不在 + 両PIPE実EOF/FDclose + ownregularFD実close + force0/error0の全成立に限定。regularFDはPIPE/EOF不使用。個別Chrome孫の判定は既inner台帳、outerはexact known自己PGのみ。今回まだ実終了・pure・UI・BFCache・auditの直接結果はない。失敗時新root保全/追加自動run0。全writersを停止し、固定candidateの所有権をManagerへ返す。

---

以下は過去proposalと差戻し候補の履歴であり、現hash/起動許可を示さない。

# R1/R2 起動補正 proposal（未実装）

2026-10-05T22:26:36.707201+00:00。**現runnerはR1/R2差戻し、実行不可。全helpers/runner/C/B writer停止、新root/pure/runtime/probe0。** 次slice案はP5c-3-next-plan.mdへ保存して停止済み。

## R1: 同期 native hookだけをrunnerへ入れる

変更提案は既publicrunnerのlauncher/loader bindingと本報告だけ。bootの採用済fixed-root入口・helper4file・C/B・全Worker/forkの元args/handlesは無変更。新publichelperやresolverの外部互換層を追加しない。

- Node24.15 `module.registerHooks({resolve,load})` と `stripTypeScriptTypes(source,{mode:'transform',sourceUrl:canonicalURL})` をmainで直接呼ぶ。同sync hookを登録してからbootをdynamic importする。loadでnative transform済みJSを返すため追加--import/--loader/tsxやWorker用transform flagを渡さない。thread/service/esbuild/sync子を0へ縮小する。
- source allowlistは新B `material/source-manifest.json` のSHA256 **de7c79fa0c283d1881912c9d7d8a4465edc98b488d5b5d755609e44bc8ec7552**、1457path、各entry(blob/bytes/mode/sha256)を正本としnewS配下の.tsのみ。helper allowlistは現exact5path/fullhash。load前にcanonicalURL/lstat regular/nonlink/bytes/hashを確認する。TSX/.cts/CommonJS TS/未知TS/escape/query復元を拒否。ソースbufferは公開sourceだけ、生成JSをFSへ書かない。
- resolveは**元nextResolveを先に一回**試す。ERR_MODULE_NOT_FOUNDであり、parentが同allowlist newS TS、specifierがrelative/no extension/no queryfragment、lexical候補がnewS内の**manifest正当な同path+'.ts'だけ**の場合に補完してnextResolveを呼ぶ。他error/ディレクトリindex/JS候補/.tsx/package一般fallbackは行わない。bare package/compiledJS/builtinsは通常next。source canonicalURLを保持し、同module-cacheとsource/B二方向bridgeのclass/privateSymbol identityを変えない。
- [Node24.15 module API](https://nodejs.org/download/release/v24.15.0/docs/api/module.html)はprogrammatic同期hooksのWorker default非継承とnative変換APIを提供する。**旧reportの『async hooksをdynamic importだけで子非継承』は誤り**。同manualはasync default継承を明記しており、旧tsx/thread≤1案は継承せず履歴へ退ける。

## R2: regular FD失敗でも元Chrome所有を失わない

既early observerのexact executable/profile/proxy/detached/5pipe束縛を維持する。元actual child/5stdioを生成直後に保存・exit/close観測してから、ownership metadataを記録する。新faultケースは増やさず、既F2の異常時実閉鎖条件へ結ぶ。

提案は**既stderr PIPEへのbounded ownership mirror**とNode側finite実閉鎖gateの組合せ。Chrome PID/PGのみの固定prefix frame（512B以内・1件、body/secret/domain proofなし）を同期stderr書込→regular FD記録の順で行い、regular write例外でもouterが自己held stderrからPID/PGを復元できる。outerはraw本文を保存せず、このexact metadata frameだけを識別し、重複は同PID同PGのみ許す。既PIPE2/出力cap内で、新socket/FD/秘密/物理子を追加しない。

write失敗では元childをinnerobserverへ返して登録を保ち、Nodeownerが参照とref付きfinite待機を保持する。fatal時のみ自己ChromePGをKILLし、**要求したsignalではなく**actual child exit/5FD close/negativePG ESRCHを最大10秒で確認する。未確認を正常/closedへ変換しない。outerのNodeTERMはこの10秒回収windowより先行させず、その間も両PIPE/regularFDをdrainして所有情報を保持する。known Chrome PGはouterも独立監督し、NodeTERM10/KILL20/pipe30のshared closure tailへ収める。

同waitが期限/EPERM/未知になればunproven。fallback mirrorによりNodeを強制終了してもknown Chrome PGはouterのledgerに残るため、未通知PGを放棄した正常終了にしない。両channelが同時に不成立なら未通知unprovenのまま、親へ所有欠測を明記する。このmetadataはprivate input/closed/proof/ACKの代用品ではない。mirrorの識別/Nodefatal実閉鎖/outer順序は独立delta reviewで確認する。

現UIroot/origin/tool scratch/privatepuregate/30+720/tail30/256MiBは維持する。tsx追加thread/service資源だけ0へ縮小。helperwriter許可前なのでこの案を固定して返す。実helper編集/新pure/root/probeは0。

---

以下は差戻しrunnerの履歴であり、現在の起動許可を意味しない。

# Current operational candidate: static preflight submission

2026-10-05T22:17:04.078358+00:00。**実行未許可・全writer停止**。変更はboot root入口・新publicrunner・この報告だけ。新UI/tool root、pure、アプリ/DB/runtime/browser/Workers/socket probe は0。C c2a3d45f と B3488/release93d264 は無変更。helper4fileは既受入fullhashと同値、既bridge/F1–F6/SQL/DTO/native capsは再実装していない。

| Path | Bytes | SHA256 | Mode | nlink |
| --- | ---: | --- | --- | ---: |
| .goal-implement/helpers/p5c-ui/boot.mts | 38376 | 497ed39d7a191c3236437404c24adfa052119f0cfc94b8f7f1135b62efbd06d3 | 0o600 | 1 |
| .goal-implement/helpers/p5c-ui/provider.mts | 11902 | 937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0 | 0o600 | 1 |
| .goal-implement/helpers/p5c-ui/browser.mts | 18761 | a4b2192dc6bef805352628197553527d5343a8df9676e903d207e75e3e249de8 | 0o600 | 1 |
| .goal-implement/helpers/p5c-ui/contract-pure.mts | 6069 | ecd265c621895c6bdc188701dbda3c214717db6686d755e0122e50580f14a617 | 0o600 | 1 |
| .goal-implement/helpers/p5c-ui/stop-audit.mts | 41212 | 3cb4b5b5a3b7ec6d20b08588a14abda2c79772044d1348a25559622cc117d638 | 0o600 | 1 |
| .goal-implement/helpers/p5c-ui-runner.py | 21100 | 142f2d6d67ac2e58d91c6530d475dc81f04e1bc2b08898c8b86d72b0d6decff5 | 0o600 | 1 |

Launcher template SHA256 `5666aab744dd8287ada01f7c780aede47f854b283888c47a29688b936b1c5912`、4789B。FD数値だけは自分のwx生成heldFDを入れる実行時binding。新publicrunnerは未実行で、Python ast.parse/compile(no self-import/pycache0)、固定launcher JSのNode --check(actual0/出力0)、exact5helper strict noEmit型check(actual0/出力0)だけ実施した。check後の変更はPython終端分類/台帳のみでPython compile再成功、launcher/boot/type対象は同値。

## 採用候補の起動と所有

Rootの別一巡採用後だけ、外側direct argv `python3 -B /Users/hikaru/github.com/tuanemuy/hollow/.goal-implement/helpers/p5c-ui-runner.py --run`、cwd repo を使用する。shell0。runnerは5hashを確認し、新tool scratch `/Users/hikaru/.local/share/hollow-validation/ui-tool-0d73d1ac` の排他mkdir700とownership.jsonl wx600/heldregularFDを作る。UI root `/Users/hikaru/.local/share/hollow-validation/ui-0d73d1ac`、origin `http://127.0.0.1:43173`（probe0）を固定し、Node Popenは direct `[pinnedNode, '--eval', launcher]` / cwd B/source/apps/web / start_new_session=true / stdinDEVNULL / stdoutstderrPIPE2 / pass_fds=[ownControlFD]。

Node envは PATH=/usr/bin:/bin、LANG=C、TSX_DISABLE_CACHE=1、ESBUILD_WORKER_THREADS=0、TMPDIR=新tool scratch の5キーだけ。HOME/NODE_OPTIONS/ambient env/.envコピー0。Node実pathは `/nix/store/3mvbmkd7lmxi3xlka1avra24flwbgjv9-nodejs-24.15.0/bin/node`。tsx同公開loader.mjsをlauncher内で一度await dynamic import→boot import→prepareContracts21/max24→成功時だけprepareUiRoot(reservedAbsoluteRoot)→completeUi。--importをexecArgvへ置かず、正常Worker/forkに追加tsx初期化を渡さない。search forkは正規execArgv=[]。boot入口は同privatepuregate/knownbaseとexactname/canonicalparent/lstat非存在/排他700/既rootfallback0。

mainのspawn限定observerは既innerChromeobserverが包む元関数となる。正規Chrome executable/profile/proxy/bypass/CDPpipe5/detachedtrueを生成前検査し、actual childを生成直後保持し同期FDframeを記録、同childを返してinner登録を維持。同期write例外でも元childを捨てずselfknownChromePGへTERMと有限KILLを組み、元handleをinnerobserverへ返す。未通知/未知はnormalへ数えない。own metadataは最大64frame/各512B/合算32KiB、outerは同heldFD pread200msで通常・異常tailとも読み、Nodehangでも別ChromePG所有を保持する。metadataはregularFDでありcontrolPIPE/EOF不使用、privateproof/ACK/closed成功値には使わない。

OuterはselfNodePGと受け取ったselfChromePGだけを停止対象にし、leaderactualexitとnegativePG/ESRCH absenceを別条件にする。EPERM/未知は未証明。stdout/stderrはraw本文を保存/出力せず実bytecount(cap合算12MiB)/EOF/actualFDcloseだけ記録する。実Node exit0、同内normal+actualClosed+auditClosed、両実PIPE EOF/close、自己両PGabsence、regularFDactualcloseが揃う時だけnormal。force/unknown/partialframe/未登録所有/欠測は成功補完0。失敗root/scratch保全、追加自動run/再選択0。

Pure30秒とUI720秒（normalstop120秒含む）は別stage。launcherのpure30時計とouterの初期30上限でpre-root純対を監督し、outerはui-start受信で720を別開始する。閉鎖tail最大30秒=TERM10/KILL10/pipe10、正常operation延長0。通常Node自然exit後の子/pipeclosureが不明なら有限forceに移行しnormalにしない。tool scratch+UI node-tmp合算8MiBと全UI+scratch256MiBを200ms metadata容量監督し、既innerSupervisorのmode/Chromecontrol/DB/mutation守備は維持する。

## Loader上限と未観測境界

[Node24.15 hooks公開source](https://raw.githubusercontent.com/nodejs/node/v24.15.0/lib/internal/modules/esm/hooks.js)はnon-loader realmあたりsingleton hook thread、tsx4.21 esm/indexのisMainThread guardがmainのregisterを行う。direct runtime import方式では子Worker/fork用execArgvに--import/--loaderが存在しない。main+loaderの2realmからesbuild0.27.7 ensureServiceIsRunningのrealm内singleton async serviceを**合算≤2**と保守的に計上。追加loader thread≤1。個別esbuildPID/pipeEOFとloader個別threadexitは直接未観測、自己NodePG実absenceを必須にし、個別成功へ補完しない。

**sync分岐の限界はpreflight判断点。** 正常直接TSsourceはtype:module、helper.mts/B.jsはESM、明示createRequire先はcompiledJS（drizzle migrator/TypeScript）。mainの正規esbuild execFileSync入口はexpected/cap0で副作用前拒否する。公開tsx esm/indexにはCommonJS.jsがESM構文を持つ場合のtransformSyncも存在し、loader realmのそのexecFileSyncをmain observerは直接観測できない。ここをmain cap0だけで全realm実0と断定しない。正常binding到達根拠/追加有限capの必要性は独立preflightへ渡す。未知の子数をasync1へ黙示算入・正常へ補完0、新resolver/hook改変/追加private資源探索は0。

現在candidateはstatic準備でありUI/Chrome終了・audit/BFCacheの直接成功ではない。起動の最終採用前に本loader境界を判断する。全boot/runner/report writer停止、所有権をManagerへ返す。

---

以下は以前の提案・判断履歴。現invocationの正本は上記candidate。

提案日時: 2026-10-05T21:49:31.877991+00:00

# P5c UI operational invocation proposal

状態: 実行前提案。5 helpers / C / B は無変更。新 UI root・pure・runtime・DB・browser・socket probe は未実行。F1–F6 static PASS の受入は実 UI / 正常終了の成功を意味しない。

## 固定入力と memory reservation

- C: `c2a3d45f1097533c6344346aca303dc1d2aef368`
- B: `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-348847e5-ea53-4aed-8940-995bc59826e8`
- W/cwd: B `/source/apps/web`
- release SHA256: `93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0`
- helper review SHA256: `4af303f9784ba36586572c02d481c6cab038c254870fb5bad6ddcb701da3b9ed`
- UI root proposal: `/Users/hikaru/.local/share/hollow-validation/ui-0d73d1ac`
- origin proposal: `http://127.0.0.1:43173`; availability unprobed. EADDRINUSE は失敗・再選択/自動再実行0。

| Helper | Bytes | SHA256 |
| --- | ---: | --- |
| boot.mts | 37854 | 418ef0a2f486069f5b73d5d1ea0b67aae98a68c7edbfdba3e76dfdca03283f47 |
| provider.mts | 11902 | 937fbbee03105f2761d71c076ec9a8ecff1d7af60860eba1a976a41bd7a372d0 |
| browser.mts | 18761 | a4b2192dc6bef805352628197553527d5343a8df9676e903d207e75e3e249de8 |
| contract-pure.mts | 6069 | ecd265c621895c6bdc188701dbda3c214717db6686d755e0122e50580f14a617 |
| stop-audit.mts | 41212 | 3cb4b5b5a3b7ec6d20b08588a14abda2c79772044d1348a25559622cc117d638 |

Helper base は `/Users/hikaru/github.com/tuanemuy/hollow/.goal-implement/helpers/p5c-ui`。実行前 mode600/regular/nonlink とこの全 hash を再照合する。B の既受入 artifact / graph / assets は借用し重複 scan しない。

## 最小判断点

1. **root 固定入口が未対応。** 現 `prepareUiRoot()` は引数0、内部 randomUUID の8桁で排他 mkdir700 を行う。現 bytes のままでは上記 root を事前束縛できない。推奨差は boot の同関数に reserved absolute root を渡し、固定 base/name・canonical parent・排他 mkdir を検査する最小変更。既 `contractsPrepared` gate は維持し、pure 成功前 mkdir0 / 既存 root fallback0。採用・限定 delta review 後に新 boot hash を manifest に差し替える。UUID monkeypatch / arbitrary externally prepared root を成功 gate にする変更は行わない。
2. **tsx は cache-disable だけでは無資源でない。** 公開 loader は temporary socket 接続と esbuild service 子を使う。下記新 tool scratch / loader worker / service 子の有限所有を採用するか、loader 代案を静的確定する必要がある。未採用のまま実行しない。
3. **outer に Chrome 早期所有を引き渡す経路が必要。** 内 Supervisor は早期 child を所有するが、Node hang 時に Python がその detached PG を知らない。別 public runner の限定 spawn 観測と専用 metadata FD を採用する。frame は process 所有の事実だけであり closure/proof/ACK の代用品にしない。

現在の未決はこの3点。製品/B変更・新 fault・受入済 guards/SQL/bridge 再実装は不要。

## tsx 公開確認と argv 案

根の createRequire から tsx/package.json 解決は MODULE_NOT_FOUND。web の宣言 link から canonical public package `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/tsx@4.21.0/node_modules/tsx`、version4.21.0 を静的確認した。公開 export `.` は `dist/loader.mjs`。

- loader SHA256 `0b1c5b86192772fe9257710e739959cee5947c11ae1f93b61abfaa9b80c6def1`
- `dist/index-7AaEi15b.mjs` SHA256 `47851348bc3bbc11413edd4bf44758b7a85e28419847583231d74a182b044e22`: `process.env.TSX_DISABLE_CACHE ? new Map : new wn`。CLI の no-cache も値 `1` を設定する。
- `dist/client-BQVF1NaW.mjs` SHA256 `334ad3dbfaf820eeb08dd2fa40750c8316e6f8a61311bdf99defd3c361fbece4`: loader import 時に os.tmpdir()/tsx-UID/parentPID.pipe へ接続を試みる。CLI 経由でなくてもこの試行があるため旧 /tmp cache/socket を探索させない。
- public esbuild0.27.7 `lib/main.js` SHA256 `bce772de103e1cbb118f1b7313916caa81f0e85461b3b6e3531607e7ed75ec85`: async transform は non-detached service 子、stdin/stdout pipe、stderr inherited。`ESBUILD_WORKER_THREADS=0` は sync-transform 専用 worker の作成を無効化するが async service 子は残る。

提案 direct argv は shell/pnpm/tsx CLI/auto-install を使わない:

```text
/nix/store/3mvbmkd7lmxi3xlka1avra24flwbgjv9-nodejs-24.15.0/bin/node
--import
file:///Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs
--input-type=module
--eval
<runner 固定・hash 済み launcher text>
```

launcher の順序は `prepareContracts()`（21 / max24 / 30秒）→成功時だけ `prepareUiRoot(reservedRoot)`→`completeUi(root, origin)`。private gate を同 Node/module instance に保持する。pure failure は UI root0、UI failure は当該 root を非操作保持し追加 run0。現 prepareUiRoot API のままこの argv を実行してよいという提案ではない。

child env は ambient をコピーせず PATH=`/usr/bin:/bin`、LANG=`C`、TSX_DISABLE_CACHE=`1`、ESBUILD_WORKER_THREADS=`0`、TMPDIR=`<新 tool scratch>`、必要専用 metadata FD のみ。HOME / NODE_OPTIONS / .env / provider secrets / coverage / tsx private config を引き継がない。cwd は W、W の同 candidate tsconfig を正規探索する。runUi が自分の新 root を設定した後の app env と browser child env は現 helper の exact map を維持する。

loader の事前 tool scratch 案は `/Users/hikaru/.local/share/hollow-validation/ui-tool-0d73d1ac` の排他700 directory1。pure failure 時も UI root は作らない。scratch＋UI node-tmp の合算8MiBを既 TMP 枠内に収め、最終 scratch を保全し自動削除/再利用0。追加 service 子1＋Node loader thread1 の有限枠を明示採用する必要がある。service は自己 Node PG に属する正規 non-detached spawn を公開 source で確認済み。正常/異常とも Node PG absence を必須にし、service の個別 pipe EOF は直接取得しない場合未観測とする。

## outer runner scope proposal

作成候補は新公開 `.goal-implement/helpers/p5c-ui-runner.py` 1path（未作成）。wx600・parent700・python -B/no self-import、固定 launcher を自分の literal として保持する。追加既 helper 編集は上記 root 入口の採用差だけ。runner の生成・compile・fullhash preflight 合格後に具体 argv text / runner hash を Root へ固定して一巡採用を受ける。

- 自己 Node child は direct argv、start_new_session=true、stdin DEVNULL、stdout/stderr PIPE2、専用 ownership FD1。Node PID=ownPG を生成時 ledger 登録する。
- launcher が child_process.spawn の限定観測を boot import/run 前に登録し、既 browser observer がこれを包む形で共存する。Chrome の exact executable/profile/proxy/bypass/CDP5pipe/detached=true を検査し、元 spawn を一回呼び、生成直後 PID/ownPG の finite metadata frame を送って同 child を返す。args/env/streams/return value は変更0、finally 復元は他 wrapper clobber0。
- frame ≤512B・最大64・合算32KiB、既知 kind/PID/sequence だけ。生成秘密/token/body/proof/callback/SQL ID は送らない。outer は UI proof を作らず、自分が生成した detached child の停止対象だけを記録する。
- selectors 200ms、全体720秒。stdout/stderr は各有限 byte cap・合算12MiB、raw本文を出力/保存せず drain と EOF/FDclose/count のみ記録。root 未作成時の metadata も有限 memory に保持する。
- 初期 pure30秒、内 stage/U7 期限は既 helper のまま。外720秒時に Nodeへ正常停止要求を出せる時だけ grace を与え、正常終了の証拠が不足すれば成功にしない。終端処理 TERM10＋KILL10＋pipe10 は別最大30秒の closure tail として記録する（正常 UI 12分枠を延長して操作はしない）。
- Node hang/failed ownership frame でも既取得 Chrome ownPG を失わない。必要時 own ChromePG と own NodePG だけ finite TERM/KILL、negative PG absence/ESRCH を別確認。EPERM/unknown は unproven、leader exit を PG absence に読み替えない。広域 PID/ps/env 検索・追加 probe0。
- 内 Supervisor の normal/actualClosed/audit 成功に加え、outer Node actual exit0・stdout/stderr 実 EOF/FDclose・control FDclose・自己 Node PG/既知 Chrome PG absence が全て必要。forced cleanup 成功は正常成功に変換しない。early frame は metadata probe1 の正規 PG 証拠を偽造しない。

## 一巡資源と結果

既 UI256MiB 上限・logical DB3×16=48MiB（active/opaque/audit）・objects1MiB・material256KiB・TMP合算8MiB・ChromeTMP128MiB・logs12MiB を維持。app/provider/proxy server 各1、proxy deny150/actualbytes1MiB、app1800/48MiB、fixture80/12MiB。正常 upload2×1024B、native Worker8/同時2、search fork16/同時1＋proxied search Worker16、Chrome parent1/CDP既知子≤16、metadata ps child1/probe1、browser WebWorker2。tool loader/service 枠は上記未採用追加を別記する。

U0–U7 の既 finite mutation/正常 DTO/正規 schema監査/known terminal counts をそのまま使う。BFCache direct 対は actual persisted/currentdocument/実旧SDKcallback が欠ければ欠測、normal control の結果とは分ける。UI 成功と BFCache 対の直接成功を混同しない。

実行0 / 新 root0 / 全5helper・C・B writer停止。提案文書だけ作成し writer停止。上記3判断点と runner hash preflight が解決するまで一巡を開始しない。

追記日時: 2026-10-05T21:52:40.391352+00:00

## Loader 代案の確定（実行前 static）

Native `--experimental-transform-types` 単独は採用不可。固定 Node24.15.0 の `--help` metadata を direct argv で1回実行し exit0、stdout24412B/stderr0B。アプリ/pure import・root・Workers・socket は0。

[Node v24.15.0 TypeScript manual](https://nodejs.org/download/release/v24.15.0/docs/api/typescript.html) と help で parameter properties の変換対応を確認した。一方、同 manual の relative import extension 必須・tsconfig 無視という契約に、現固定 source が適合しない。newS `packages/core/src/adapters/libsql/client.ts:3–4` の **value import** `./schema` / `./serializedClient`、`adapters/node/drive/http.ts:4` の **value import** `./execution` が具体的な起動阻害点。5helper `.mts` 自体の relative import は拡張子付きで、core package export は `.ts` を指すが、この runtime relative import を解決しない。

これは syntax-transform の可否とは別の module-resolution 不適合。native の先行 import 実行や、製品/source/B の specifier 編集は行わない。新 resolver hook を追加するなら別契約が必要なので、この提案では追加しない。**既 tsx4.21.0 正規 loader＋cache-disable＋新 toolTMP/追加 service 子1/loaderthread1 の有限所有案を推奨**。その追加採用と actual child/FD ownership の preflight が起動 gate になる。

期限を明確化: pure30秒を開始時から個別監督し、その成功後に UI720秒（normalstop120秒を含む）を別開始する。失敗後 closure tail TERM10/KILL10/pipe10 最大30秒は操作延長0、正常 UI 成功へ補完0。外監督は各期間と全終了を区別する。

この追記のみ変更。固定5helper/C/B無変更、runner未作成、新root/runtime/browser0、文書writer停止。
