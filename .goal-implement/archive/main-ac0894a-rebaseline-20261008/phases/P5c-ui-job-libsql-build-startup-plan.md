# UI job browse4 build startup: PUBLIC-only classification and next diagnostic proposal

現行 build は FAIL/held。actual cause は UNKNOWN のまま保持する。公開固定 driver/runner/packed と原 esbuild JavaScript の読取では、原 async build の既知 options、service child1 の期待形、manifest input/output membership に必ず失敗する静的定数矛盾は確定できなかった。source66 閉包や実生成物の成功を再検証したとは主張しない。次の最小案は既 held frame に finite first-reason と last-phase を足して、元拒否条件を変えずに次の前向き観測を区分することである。今回はこの新PUBLIC文書だけを作成し、helper変更・新root予約・actualは0。

## 固定入力

| PUBLIC input | bytes | SHA256 |
| --- | --- | --- |
| helpers/p5c-ui-job-libsql-build.py | 25775 | ec269455b0af834c037c7ef76672cf5497316044c89f87d25615da6332d9c1ab |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 9182 | fab719add4dc74f1f9a53121a61b9033b93a6562cd47375a989aefb8125b7617 |
| helpers/p5c-ui-job-libsql-build-manifest.json | 117081 | be5f62d1617cf269d6bfb0f384d70fbe7b9b038f9b5ba8c9f823ab9e2b57ba5d |
| phases/P5c-ui-job-libsql-build-actual.md | 4183 | e4633285bd51725e1827ef52e3d343478927ff34f1058fb1d752f68e9aeffe13 |
| reviews/P5c-ui-job-libsql-build-actual.md | 7432 | fface59114032d4551bf4090c305ed36911acd1c110659fb96d4b064527d8873 |
| installed esbuild/lib/main.js | 97214 | bce772de103e1cbb118f1b7313916caa81f0e85461b3b6e3531607e7ed75ec85 |
| installed esbuild/package.json | 1463 | 9ce21c976ffbbb95001f460e9e8af7c6d719f748eb70441e617a14dd0b68a5b8 |

helper/doc は stable全文 regular600/nonlink/nlink1/selfUID/canonical/NOFOLLOW を確認した。原 installed esbuild@0.27.7 の既登録 exact二本は元 mode644/UID501/nlink1/canonical と fstat/path前後安定、full SHAを確認してsource textだけ読んだ。コードimport/eval、Node実行、Gitreader subprocessは0。packed全文SHAと envelope payload length/SHAを検算し、memory decodeで固定 source327/1920009B、reachable66、dependencies707/13984808B、aliases10/links6、entries4を参照した。707やsource327 bodyの再読、unknown package/store walkは行っていない。PUBLIC packedの初回表示はtool output上限でtruncateされたため、同公開fileだけ再読して表示範囲をdriver/必要metadataへ絞った。private bodyの取得・保存ではない。

固定source candidate79ef126edd5d3440cde20dbe8fd372e7235010c5/sourceManifest4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206、declared source66閉包・source327 Git blob/fullSHAの元受入は先の固定preflight報告を借用する。現working/main HEAD/source、immutableGit bodyを再取得していない。全source不存在検証やbuild成功へ置換しない。

既 exact platform binary binding は darwin-arm64/esbuild 10385234B/mode755/UID501/nlink1/SHA b82c6243eb58d520d0bc55cddcf6993dd0f5572f3ab8dc2ba6d77058be043e62。今回そのbinaryをread/import/executeしていない。固定canonical Node24.15もmetadata probe/実行していない。

## 受領できたactualの境界

Root actualと独立SAFE reviewの借用証跡は header → service(after-start registered1/actualOwnedPGMatch true/stderr NULL) → held UNKNOWN。built/closed/outputmanifest未受入。Node exit-15、supervisor TERM sent-success、knownPG absent true、outer PIPE EOF2/controlEOF/actualFDclose4、force trueを別に保持する。原serviceの個別exit/close/stdout end-close/stdin finish-close/original stopはNULL/未受領である。

906Bは破棄済みrawstderrの件数だけであり、新取得・再読・復元は0。件数や約0.299sのtool timingからsource error/ABI/原service causeを推定しない。Node-15はouter forceの観測で、以前UI Node-6との共通原因を示さない。

driver:44 のheaderはruntime gateとPUBLIC dependency verify後、67 のserviceはstockchild spawn後の登録である。51のstart observerは先にheldを立てうるがservice frameはそのflagを確認しない。したがってservice受領からspawn binding全predicate成功を補完できない。129のbuiltは原build return/heldとcount/result/input/output確認の後だけ、142のclosedは実stream/child closureと原stop後だけである。catch:143–150は全例外を同UNKNOWNへ投影する。観測順から拒否siteを特定できない。

## 原esbuildとの照合

原 main.js:2166 のasync buildは ensureServiceIsRunning().build(options)。2265–2323は元binaryのstock child_process.spawnを一回開始し、stdioはpipe/pipe/inherit、cwdはimport時のprocess.cwd、非detached既定である。driverのcwd固定と同じexpected pathになり、stderr NULLは元inheritに整合する。tracingのpublication順・normalized optionsとdriver比較のactual一致はservice receiptだけでは観測できず、現在は静的可能性として残る。unknownchild/prepermissionにobserverを読み替えない。

原 sync API枝だけが startWorkerThreadService を呼ぶ。今回driverはasync build一回、context/rebuild/plugins/transform/sync APIを呼ばないため、worker_threadsのrequireがあることだけでWorker起動を推定しない。stockconstructor/moduleexports/cache/原Promise identityを変える必要はない。原loadで別unexpected import、non-file resolve/load、worker/net/nativeaddon呼出があれば元guardはheldのまま。

main.js:671–813はentryPoints/outdir/absWorkingDir/bundle/platform/format/target/outExtension/external/metafileを正式optionsとして扱う。fixed valuesの型はそのvalidatorに一致する。原package enginesはNode>=18、pinned24.15は範囲内。target=node22は生成targetであり実Node24.15 gateとの矛盾ではない。入力SQL/nativeaddonを実行するbundleではなく、external libsql/client/libsql/css-tree は未bundleのまま。これはjob/DB/native addon正常性の証明ではない。

原build response:1191–1210はerrorsがあれば元Promiseをrejectし、warningsはresultに残し、response.metafileがあればparseする。driverはwarning一つでも正常拒否する。native resolver/TS解析/未収録import/tsconfig探索等に起因する原build rejectはありうるが、906Bからそのいずれかを決められない。閉包66の既metadataは原resolverのactual選択やwarnings0を保証しない。

driver input checkは原metafile相対inputをabsWorkingDirにresolveしてoriginal realpathを一度取り、known source327 absolute paths又はexact canonical dependency707の集合に照合する。fixed source filesはown nonlink600、公共dependencyはcanonical、元esbuild preserveSymlinks既定falseなので、集合の表現に現時点で必然的矛盾は見つからない。原serviceが別conditional exports/source/packagefileを選んだ場合の未知membershipは維持する。未知inputをprefixで許可しない。

output checkはabsWorkingDir相対keysをresolveし、basename4entry/outdir/outExtension mjsのexact4expectedと比較する。bundleはsplitting/sourcemap/assetsを追加設定しておらず、4entry→4.mjsというexpectedに静的整合性がある。ただし実metafile未受領なのでoutputs4やfilemode/bytes/hashを証明しない。sourceRootのgeneratedfileやoutput existenceを確かめていない。

原 stop:2246–2249 はstdio destroy/child.killを含む元stopServiceを呼ぶだけで、返却Promise自体はclosure receiptではない。Root採用post-build controlは原build完了後にsameChild.stdin.end一回→actualexit/close/stdout end-close/stdin finish-close→原stop。これは元default stopと同じtimingとは主張しない。今回builtが未受領なので、この終了操作の実行・正常exit0を補完しない。

## 到達しうる拒否枝と観測不足

| 固定codeの枝 | UNKNOWN/heldへ至る条件 | 今回観測で残す区分 |
| --- | --- | --- |
| driver:10–43 preheader | envelope parse/inflate/SHA、runtime/control、dependency identity/hash/readの例外 | header受領前の元setup領域。全原module/source成功は主張しない。 |
| driver:47–52 start observer | count、same child、binary、args形/3values、cwd、detachedのいずれか不一致 | startはafterstart observer。先行heldもservice発行を妨げない。actual predicateは未観測。 |
| driver:53–69 child registration | extra child/error、stderr/stdin/stdout/PID条件、frame write | sameknownPG登録は受領した。extra/error/stream実closeは別証跡。 |
| driver:70–102 policy | Worker publication、remote socket、resolve file exactset、load extension、connect/listen/DNS/TLS/UDP/dlopen | 元default拒否。存在しないnative proof、任意port grantへ変更しない。 |
| driver:103–108 import/setup | module binding欠測、import reject、timer setup | header/serviceだけで全module import許可predicateを証明しない。 |
| driver:109–119 original build | source/config/module解決・解析・service protocol/errorのreject、又はreturn後held/count/child/errors/warnings拒否 | build pendingとbuild returned未区分。原errors/warnings本文は取得不要。 |
| driver:120–128 membership | metafile field例外、original realpath失敗、unknown canonical input、expected outputs不一致 | exact scope/outset維持。actual input/output未受領。 |
| driver:129/142 emit | frame bound/short write/write exception | frame成功欠測をstage成功へ補完しない。 |
| driver:130–140 close | stdin end呼出例外、child/stream error、exit/signal/count/actualend-close不足、元stop reject | originalservice closureとouterforced closureを分ける。 |
| driver:108 deadline/catch | 60s expiry held、その他元例外、catch held frame自体の失敗 | 原exception detailsを読む代わりにstatic phaseだけ残す。 |
| runner monitor/capacity | own entry/mode/UID/count/bytes/domain cap、buffer/strictdecode/frameorder/ownPG、raw cap、read/selector等例外 | outer faultはinner guardreasonとは別。knownPID/PG cleanupだけ許可。 |
| runner body/tail/normal gate | BODY60/sharedtail30、Node non0/PG unknown/force、EOF/FD/control/buffer/exactframe不足 | outer正常gateを変えない。 |
| runner normal postprocess | final capacity/output stable/hash/size、manifest wx/inode/FD/hash等の拒否 | 今回normal branch未受入。outputmanifestがないことをfile不存在へ変換しない。 |
| runner preflight/materialize | binding/Git object/依存/alias/runtime、fresh exclusive/root/file/link作成の例外 | 起動前失敗もgenericUNKNOWN。今回default PASSはRoot証跡借用、再実行0。 |

これは固定codeのsource-derived reachable classesであり、actual siteの集合消去を完全に行う証明ではない。policy/APIを緩和して成功へ進める提案はない。

## 最小前向きdiagnostic候補

Rootが別採用する場合のscopeは既driver＋runner strictdecode/driverSHA従属＋新分離候補phaseだけ。既packed/source/deps/4buildoptions/原async API/stockexports/constructor/cache/result/Promise identity/caps/closure条件はそのまま。fresh source/build/TMP literalの予約・actualはその時点で別scopeへ提出し、現held rootを再利用しない。

既 `held` frameだけを exact schema `{event,kind,phase,reason}` へ限定する。kindはUNKNOWNのまま。framesを追加せず、原decisionで得たfirstReasonを一度保持し、last phaseはdriver自身の固定statement境界で設定する。欠測はNULL、未知例外はreason UNKNOWN。catchはerror.message/name/code/stack/cause/args/result bodyを調べない。元throw/heldを原まま保ち、observer callbackから新例外を追加しない。

phase有限12: `SETUP`, `IMPORT_PENDING`, `IMPORT_RETURNED`, `BUILD_PENDING`, `BUILD_RETURNED`, `INPUT_CHECK`, `OUTPUT_CHECK`, `BUILT_FRAME`, `STDIN_END`, `SERVICE_CLOSE`, `ORIGINAL_STOP`, `CLOSED_FRAME`。

reason有限21: `UNKNOWN`, `SPAWN_BINDING`, `EXTRA_CHILD`, `CHILD_ERROR`, `SERVICE_REGISTRATION`, `STDIN_ERROR`, `STDOUT_ERROR`, `WORKER_OBSERVED`, `REMOTE_SOCKET`, `RESOLVE_SCOPE`, `LOAD_SCOPE`, `PORT_DENIED`, `DEADLINE`, `BUILD_HELD`, `BUILD_RESULT`, `INPUT_SCOPE`, `OUTPUT_SET`, `CLOSURE_HELD`, `CLOSURE_RESULT`, `FRAME_LIMIT`, `FRAME_WRITE`。resolve/load拒否は既next結果の既computed比較のみ、portは元denyの定数siteのみ、spawn/streamは既所有handleと既comparisonのみを使用する。新realpath/stat/read/accessor/unknownchild探索/argv出力を足さない。

BUILD_PENDING＋UNKNOWNは原build await中に例外が伝播したstatement境界の診断に留める。内部native原因・SQL・入力file内容・APIcountを推定しない。BUILD_RETURNED/INPUT_CHECK/OUTPUT_CHECK等を受領した場合も正常built/closed証跡と区別する。first observer reasonが早く設定されても正常controlframeを出したことにしない。reason/schema未知値、frame短書込・emit失敗は永続heldのまま。

既normal header/service/built/closedのschema/順序は変更しない。inner heldが未受領ならouter finalはlast受理eventのみでphase/reason NULLを維持する。将来outer例外診断が必要なら容量/decoder/IOの既decision定数siteだけを別提案し、今回inner first-reasonへ外側causeを混ぜない。

上記全phase×reasonのASCII JSON＋newline静的最大は92B、各512B未満。16frames×512=8192Bで既control32KiB reserve内、追加frame0。現material算式117081+9182+25775+32768+4096=188902B、上限262144B・余裕73242B。候補actual bytesはhelper更新後に全固定SHAとmaterial算式を再算出し、無制限の診断列やraw errorを持ち込まない。

body60/sharedtail30、root192/source32/output16/TMP8/log2/material256K/guard200ms/child1/Worker-addon-DB-network0、原allocatedstdin/stdout実finish/end-close・stderr NULL/inheritとouter2EOF4FD、knownNodePGのみTERM/KILL/actualwait/PGabsenceの条件を変えない。normal outputmanifestの実4files hash/bytesと正常閉鎖を診断情報で代用しない。

## 操作境界と返却

生成済み hollow-ui-job-source-79ef126e-20261006、BUILD-a0632bfd、派生toolTMPは全永久NONOP。全旧成功/失敗/root/log/key/proof/DBにもstat/read/hash/copy/import/rerun/cleanup0。現working main/S5/P5d/製品/exports/UIhelpersも非操作。default CLI、Gitreader、Nodeimport、build、runtime、probe、新root予約/生成は0。原private stderr906Bの新取得・復元0。

新PUBLIC phase一pathだけown wx600/fsync/actualFDclose/postread stable fullSHAで固定し、全reader/writer/runtime STOP。原因UNKNOWN、元service closureNULL、通常job/libSQL/native/DB/UI受入0のままRootへ返す。
