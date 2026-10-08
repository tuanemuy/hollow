# UI BUILD B-GIT-PG1 — independent proportional static PASS

判定: **限定静的PASS。** source_objectsの元known Git leaderとPGを分けた異常回収がB-GIT-PG1を閉じる。実Git reader/default/source materialization/native build/root probe/startup/closureは未実行・未観測であり、ONE actual採用や機能合格を代行しない。レビュー後ALL PUBLIC read STOP。

Rootが指定したPUBLIC runner/driver/packed manifest/new fixphase/old candidatephase/old reviewだけをcanonical regular600/selfUID/nonlink/nlink1/NOFOLLOWで全文読取し、open前・fd前後・path後のdev/ino/mode/uid/nlink/size/mtime/ctime及びfullSHAを直接確認した。旧レビューで正常部分が静的PASS・B-GIT-PG1だけFAILだったことを照合した。UI helperを実装していない独立担当によるレビューである。

## Direct fixed bindings

| PUBLIC file | Bytes | SHA256 |
| --- | ---: | --- |
| helpers/p5c-ui-job-libsql-build.py | 25775 | ec269455b0af834c037c7ef76672cf5497316044c89f87d25615da6332d9c1ab |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 9182 | fab719add4dc74f1f9a53121a61b9033b93a6562cd47375a989aefb8125b7617 |
| helpers/p5c-ui-job-libsql-build-manifest.json | 117081 | be5f62d1617cf269d6bfb0f384d70fbe7b9b038f9b5ba8c9f823ab9e2b57ba5d |
| phases/P5c-ui-job-libsql-build-gitpg.md | 8100 | 760ddfa744d22838e5d823f36ec3928dcb07eedbad28d9a3862178b5b5ab0f4a |
| phases/P5c-ui-job-libsql-build-candidate.md | 13460 | 2322cb7879ae6f7b90b3e82e6ae04096e4a6e86d2613a766b761993c31b64bf3 |
| reviews/P5c-ui-job-libsql-build.md | 8986 | 8e3693c1d0433345a606d929879c6ebceb1e6d18ff979de9daf007332abeef11 |

最初の旧phase basename確認では、短名build.mdは公開path不在だった。旧reviewの既知linkから正しいbuild-candidate.mdを確認し、上記13460B/hashに全文一致した。private探索/再試行/build起動を行ったものではない。全対象のcanonical公共pathを直接確認した。

## Full inverse and unchanged scope

fixphaseの公開oldprefix code blockを、current runnerのsource_objects declarationから最初のoutput=bytes(output)までに逆適応した。得た全文は **21738B/SHA 9964056ebce51fbf0fb15d1d1601fd50487cbb25382053aebbeb638498c685d3** と直接一致した。したがってそのprefix以外のbyteは旧候補全文と同一。blobparse loop、binding/public deps/manifest、main CLI、materialization、Node supervisor、strict4frames、normal output manifest返却とcapsはこの差分で変更していない。

driver/packed117081Bは旧reviewのhashと全文同値を直接確認した。strict duplicate-key拒否によるpacked envelope独立JSON読取も成功した。旧reviewのpayload bounded inflate/1557908B SHA/source327/707publicdeps/aliases10/links6 metadata照合は、全byte不変更の既静的PASSとして明示借用する。今回327 Git body readerや707depsの再起動/再読をしていない。Node/esbuild primarysource/eventorderの旧静的PASSとdriver syntax-only checkも不変更部分として借用し、native実終了の証拠とはしない。

## B-GIT-PG1 closure

正常branchは元stdin write/close、selectorで元stdout/stderr実read(0) EOF2、leader originalwait exit0、group_absent True、stderr0の順でbody_completeを設定する。finallyは元selectorとstdin/stdout/stderr各stream.closeを実行し、3独立closed flagsを保存する。最後にbody_complete＋failedfalse＋forcedfalse、leader_waited/exit0/finalPGabsent True、EOF2/FDclose3/stderr0が全部揃った時だけ元blobparse loopへ進みsourceを返す。close/selector errorはそのnormalgateを拒否する。

異常branchはBaseExceptionをheldとして固定しoutput.clear、元known child.pid/start_new_session PGの所有を維持する。leader_doneはpollの実観測のみ、例外はFalseでunproven相当。group_absentはos.killpg(pid,0)のESRCHのみTrue、aliveFalse、EPERM等OSErrorはNone。leader終了をPGabsenceへ転写しない。

- leader未終了 **又は** same knownPG absentがTrueでない時にTERMを試みる。leaderが先に退出してPGalive/Noneでもこの条件を通る。
- 元二PIPEだけを再registerして実read(0)だけをEOFへ反映する。register/read/selector errorは欠測のまま、EOFやFDcloseを合成しない。recovery bytesはdiscardし元source出力へ戻さない。
- TERM window後もleader未終了 **又は** PGabsent Trueでない場合KILLを試みる。old defectのchild.wait即returnによるKILLskipはない。selector例外は次のPG停止stageを迂回しない。
- TERM/KILL syscall returnはnot-attempted/sent-success/ESRCH-absent/EPERM-unknown/other-unknownで区分。sent-success/ESRCH syscallをfinalPGabsentへ直接昇格しない。最後にoriginalwaitとgroup_absentを別に再観測する。
- failedは成功cleanup後も消さず、body_complete/normal gateでsource返却を禁止。未知PG/EOF/FD又はforceはnormalmaterialization/buildへ進まない。

shared cleanup_endは異常入口のmonotonic＋2s。TERM/drain≤1s、KILL後/drain/waitは残り≤1sを共有し、PIPE観測のため別tailを加えない。元reader body10s、別Gitreader1を維持。finallyの元stream closeは実return＋closed flagsで扱い、失敗stdin未close時はnonblockingにしてcloseを試す。通常return/unknownをactualcloseに置換しない。async setup/reader/期限失敗の到達可能条件を静的に照合したもので、実Git hang/descendant/signal/EOF欠測発生は主張しない。

knownPGへのsignal以外、unknownPID探索・process scan・追加reader・元failedbytes再利用・追加root cleanup・retryはない。source roleとNative build roleの終了証拠を混ぜない。

## Bound and outstanding actual observations

runner delta4037B。25775＋9182＋117081＝152038B、control32768＋summary4096を加え **188902B≤256KiB** を直接検算した。packed/source/normal4frame509B/max256B/frame512×16/8192B、body60/sharedtail30、source32MiB/output16MiB/TMP8MiB/log2MiB/root192MiB/entries4096は旧byte同値である。Source/BUILD/TMP memory literalも不変更・未probe。

Python AST＋compile（helper評価/importなし）はPASS。今回はdefault/Git reader/Node import/build/runtime/root probe/create/DB/browser/Worker/native/source materialization0。driver/meta/main/product/S5/P5d source/helpers/報告変更0、DAO proposal frozenのまま非読取。private roots/old B/log/結果/key/proofのstat/read/hash/copy/reopen/cleanup0。

未観測のまま残すもの: current canonical Node実startup gate、actualGitleader/PG/EOF/FDclose、native esbuild service actualPID/eventorder/exit0/stdout EOF/stdin finish/close、outerNode/controlPIPE/4FDclose、exact output4 build/manifests、全UI job/DB/libSQLaddon/Worker admissionとapplication native ownership。UI Node -6のcause UNKNOWNも保持する。本PASSはB-GIT-PG1の公開差分だけであり、actualBuildや全UI/P5d機能PASSではない。

NEW reviewのみwx600で固定し、ALL read/write/runtime STOP。Rootが別precheck/default/ONEの範囲を採用するまで実行しない。goal/spec/spec-implement/追加agent/manager正本変更0。
