# UI job browse4 BUILD candidate — 独立preflight FAIL（Git異常回収1点）

記録時刻: 2026-10-06T08:27:16.799440+00:00。公開candidateのみの静的レビュー。actual/default/sourcecreate/Git reader/Node import/build/root probe/runtime/DB/browserは全0。全private・旧B・main working・S5/P5d操作0。report保存後ALL read STOP。新ONEの採用前に以下runner-only最小補正が必要。

## B-GIT-PG1 — source_objects の異常回収がleader waitだけ

対象 `.goal-implement/helpers/p5c-ui-job-libsql-build.py`:128–173、とくに160–167。正常158–159はactualwait exit0、stderr0、own Git PG absentを要求しており、未知/失敗を正常source返却へ昇格する欠陥ではない。しかし異常回収はTERM後のchild.wait(timeout=1)がTimeoutExpiredになった時だけKILLを送る。Git leaderが既に終了してown PGがalive/unknownの場合、waitは即returnし、KILL/PG状態の再検査をせずfinallyへ進む。setup/read/selector/期限例外も同じ経路になる。正常gateのPG不在と、異常時の早期owned roleの有限停止が非対称である。

必要最小はrunnerのこのGit reader roleのみ: Popen後の元known PID/PG所有を保持し、leader waitとown PGのabsent/alive/unknownを分け、alive/unknownへ有限TERM→KILLと有限reader drain/actualcloseを行う。leaderが終了したことやsignal syscall returnをPG不在にしない。unknown/未EOF/未close/force/非0はheldであり、source materialization/buildへ進めない。既Git readerの10秒とRoot採用の有限停止枠の中へ束縛し、追加reader/探索/再試行なし。最後のPG状態・両reader EOF・元stdin/readers実closeは別観測を保持する。失敗stdoutをsource結果として再利用しない。実Git hang/descendant/PG残存が起きたという主張ではなく、公開codeの到達可能なguard不足。Rootへの早期通知済み。

## 直接固定確認

[正本phase](../phases/P5c-ui-job-libsql-build-candidate.md) はcanonical regular600/nonlink/nlink1/UID、NOFOLLOW前後identity/fullstable 13460B/SHA256 `2322cb7879ae6f7b90b3e82e6ae04096e4a6e86d2613a766b761993c31b64bf3`。

| 公開helper | bytes | SHA256 |
| --- | ---: | --- |
| p5c-ui-job-libsql-build.py | 21738 | 9964056ebce51fbf0fb15d1d1601fd50487cbb25382053aebbeb638498c685d3 |
| p5c-ui-job-libsql-build-driver.mjs | 9182 | fab719add4dc74f1f9a53121a61b9033b93a6562cd47375a989aefb8125b7617 |
| p5c-ui-job-libsql-build-manifest.json | 117081 | be5f62d1617cf269d6bfb0f384d70fbe7b9b038f9b5ba8c9f823ab9e2b57ba5d |

3helperすべてcanonical regular600/nonlink/nlink1/UID、NOFOLLOW前後identity・fullSHAを直接一致確認し、Python AST解析PASS（評価なし）。strict duplicate-key拒否の独立JSON読取、zlib出力≤2MiB/EOF/unused/unconsumedなしでpayload1557908B/SHA256 `1e51ff03174bb666494331fc83c53f2217df3e991fba26d61d170c8681494e22` を直接検算した。source records327/1920009Bのsorted compact SHA `4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206`、relative path/100644/blob/sha/unique集合、4entry membershipが一致。Git commitはimmutable79ef126固定であり、mutableHEAD/working sourceは参照しない。327本文のGit reader実照合は担当公開報告の借用であり、Verifierはreaderを起動していない。

manifest-listed public dependency707/13984808Bは既知exact canonical集合だけNOFOLLOW stablefullreadし、mode/UID/nlink/size/SHAを直接一致確認した。alias10のcanonical対応も一致。unknown storewalk/探索/import/execute0。新SOURCE links6は原package exportsを保持する列挙として固定され、selfcoreは新SOURCE、その他は承認public packageへ向く。anchors24は歴史的metadataに留め、そのbody読み取り又はnative addon許可へ昇格しない。driver/runnerのmanifest依存SHAと候補literalも一致する。

## 静的PASS部分と限界

default CLIの実在argvは`[]`と`["--run"]`のみ。`[]`はbinding/dependency/alias/Node/Git metadataとimmutable source readerを行うが、materialize/新root absence probe/Node buildへ進まず、executed false/rootProbed false/sourceCreated false/database falseを返す設計。従ってdefaultを「工具processも0」と呼ばない。別Root public precheck→default→ONE --runが予定順であり、現在はいずれも未実行。B-GIT-PG1補正前はこの順の実行採用へ進めない。

--runのmaterializeは新SOURCE/BUILD/TMPの3exact literalを先にlexists falseとし、exclusive mkdir0700・umask077、327sourceをwx600/fsync/元FD actualclose・inode-bound postread/hash/Gitblobへ結び、6exact linksを作る。既存root再利用や旧Bcopy分岐はない。容量guardはsource32MiB/output16MiB/TMP8MiB/合算root192MiB/entries4096、knownlinksとregular600/dir700/UID/nlinkの有限検査。unknown source bodyや全repositoryの型合格は主張しない。metafile入力のpost-build canonical membershipをnative filesystem pre-read permission proofに変えない。

browse4は原async esbuild.build1回の構成のみ（searchSupervisor/searchQuery/publicQuery/noteProjection、bundle/node/esm/node22/.mjs、外部libSQL/css-tree）。esbuild module/function/export/cache/Promise、stock Socket constructor、同ChildProcess objectを置換しない。public esbuild main.jsの固定本文も必要箇所を直接確認し、stdio pipe/pipe/inheritと元stopのdestroy/destroy/killを照合した。resolve/loadは正常nextを使い、knowndeps以外/非JS-JSON addonと対象network/DNS/TLS/listen/UDP portsをdeny、persistent heldへ結ぶ。これは固定build graphの限定契約で、任意moduleに対する一般sandboxの実証ではない。

constructor publication→normalized spawn tracing→実spawnの区分は [Node24.15一次source](https://raw.githubusercontent.com/nodejs/node/v24.15.0/lib/internal/child_process.js) で独立確認した。early same object/error/exit/close observerを実spawn前に登録し、PID/stdIOは実spawn後に観測する。publicationをpermissionにしない。one service/元binary/args/cwd/non-detachedを照合し、private native handleは触れない。service PIDはtrusted control内でNode PGへのgetpgid照合だけに使い、safe summary前に除去する。

Root明示採用のpost-build原stdin.end一回は、ONE build解決/追加work0の後だけ元this/emptyargsで行う。実service exit0/no signal/close、stdout end+close、stdin finish+close、stream errorなしの後だけ原esbuild.stopへ進み、stop解決を閉鎖証拠の代用にしない。[esbuild0.27.7 service一次source](https://raw.githubusercontent.com/evanw/esbuild/v0.27.7/cmd/esbuild/service.go) のstdin EOFと出力待機から、このgraceful branchの成立方向を静的確認した。実service起動/終了は未観測。inherited service stderrはNULLであり、外Node stderr EOF/FDと区分する。timeout/defaultSIGTERM/未知終了をこのbranchの成功にしない。

Node側monitorはPopen直後のknown PID/PGを保持し、setup例外及びleader退出後のPG alive/unknownを別に有限回収する。正常条件はNode actualexit0、knownPG absent、両rawPIPE EOF/controlEOF、4独立実FD close、force/faultなし、残buffer0、strict header→service→built→closed4frame。正常gates後だけ4exact outputをstablehashし、wx600/fsync/実FDclose/inode postreadの≤4096B safe output manifestを作る。manifestはbuild metadataであり、DB audit/nativeproof/ACK/application閉鎖にはならない。Node metadataと実execPath/version/Darwin arm64 gateはsource固定だが未実行。

固定数はmaterial148001+32768control+4096summary=184865B≤256KiB、frame16/8192上限（Root全体64/32KiB内）、各512B、body60/tail30、rawdiscard/log2MiB。Python1/Node1/async esbuild service1に、別pre-build Git reader1/10秒を区分する。Worker/addon/DB/browser/業務fork/networkは許可scope0であり欠測から0を発明しない。正常未知を補完せず、failed/unknown時は全新rootsをheld/nonopとし、再読/retry/cleanupしない。

## 未実施と返却

原donor/baseplan89689/2bdaa及びsyntax-only Node check成功は担当報告を借用。wholeproduct checksは変更0のため追加再演なし。source/build/default/native実行、libSQL addon許可、migration、account/session/upload/job fixture、SQL/API/counters、job Worker/native ownershipと全UIは未実施・未採用を維持する。UI Node -6 causeはUNKNOWNのまま。新SOURCE/build-a0632bfd/toolTMPの存在探索/生成0、旧B/全private/成功失敗roots/mainworking/S5/P5d操作0。

修正範囲はB-GIT-PG1のrunner-only有限回収と依存hash/reportのみを提案する。他静的PASS部分を再設計せず、修正固定後の比例レビューをRootへ返す。source/helper/Manager正本/goal/spec編集0、wx600 reviewのみ保存、ALL read STOP。
