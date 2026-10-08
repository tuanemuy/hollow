# UI browse4 startup diagnostics: fixed PUBLIC candidate

Status: candidate preparation complete; actual/default/build/sourcecreate/rootprobe0. 原cause UNKNOWN、原service actualclosure欠測を保持する。Root採用 LIMITED static plan review9865/SHA60d3145b3310748203e28f6608dcff0feedbaa9463ad5c3a32a81238263555f7に従い、公開既3helperのfinite held診断＋fresh bindingだけを変更した。元startup proposal14888/SHA08b2695526eda1b9595d72e513339a39ebd72d8e661cd1c6efe560b50935d707、actualphase4183/e4633285bd51725e1827ef52e3d343478927ff34f1058fb1d752f68e9aeffe13、全既受入文書は不変更。

## Fixed candidate

| PUBLIC helper | bytes | full SHA256 |
| --- | --- | --- |
| p5c-ui-job-libsql-build.py | 26503 | 9b55aa9ffc7bca02e8aa447be3706c17573a7e4274639d1a6cedf4a0c9ed74d2 |
| p5c-ui-job-libsql-build-driver.mjs | 10061 | 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac |
| p5c-ui-job-libsql-build-manifest.json | 117105 | d2b84a5a01c5ac2ea756bab5df138222fd25db892432d1ccd2cf0d6a2a631fa8 |

変更前3本をexact known full bytes/hash、regular600/nonlink/nlink1/selfUID/canonical/NOFOLLOW、lstat/open/fstat前後/path後安定で確認した。同既inodeへ候補を有限write/fsync/actualFDclose、postread全文一致・同dev/ino・metadata安定/fullSHAを確認した。候補独立reviewまで全writer/read/runtime STOP。新fileはこのphaseだけown wx600で作成する。

## 診断の条件対応

driverのstateにphase SETUPとreason NULLを追加した。held(reason=NULL)は原held=trueを維持し、最初のnon-NULL fixed reasonだけを保持する。後のcatch UNKNOWN/deadline/stream eventで元first reasonを上書きしない。held自体は原まま永続しnormalへ変換しない。unknown error objectのname/code/message/stack/cause/propertiesを読まない。

| 原拒否判断/位置 | fixed reason |
| --- | --- |
| 原frame count/bytes limit、同write短書込/例外再throw | FRAME_LIMIT / FRAME_WRITE |
| original tracing child1、same child/binary/args/cwd/detachedの元compound predicate | SPAWN_BINDING |
| 二つ目child、元child error event | EXTRA_CHILD / CHILD_ERROR |
| spawn後same child/stderr NULL/stdin/stdout/PIDの元compound predicate | SERVICE_REGISTRATION |
| 元owned stdin/stdout error event | STDIN_ERROR / STDOUT_ERROR |
| 元Worker publication、remote socket既比較 | WORKER_OBSERVED / REMOTE_SOCKET |
| 元resolve exact file-set判断、元load file-extension判断 | RESOLVE_SCOPE / LOAD_SCOPE |
| 元network/DNS/TLS/UDP/dlopen deny function | PORT_DENIED |
| 既60秒timer | DEADLINE |
| 原build返却後 held/count/child/errors/warnings compound拒否 | BUILD_HELD 又は BUILD_RESULT |
| 既computed canonical input membership、expected output exactset不一致 | INPUT_SCOPE / OUTPUT_SET |
| 原closure loopのheld、元exit/signal/streamerror/endcalls判断 | CLOSURE_HELD / CLOSURE_RESULT |
| 原try catchで既理由無しの元例外 | UNKNOWN |

理由21のwhitelistは上表だけ。native child/error/Worker listenerは元eventを観測し固定labelを保持するだけで、event args/errorを読まない。新observer/channel/native APIを追加しない。compound predicateは元文字列のまま、短絡順序・property-read範囲・元this/args/function/throwを保った。reason設定は同拒否bodyだけで、診断のために未到達operandを評価しない。元write errorは同errorを再throwする。

phase12は SETUP、IMPORT_PENDING、IMPORT_RETURNED、BUILD_PENDING、BUILD_RETURNED、INPUT_CHECK、OUTPUT_CHECK、BUILT_FRAME、STDIN_END、SERVICE_CLOSE、ORIGINAL_STOP、CLOSED_FRAME。driver自身のstatement境界に代入するだけで追加frameはない。import/build/stopの原call/await/Promiseを包み替えない。esbuild build options/result/constructor/module exports/cache、source327とcompiled/native境界は変更していない。

phaseは最後のdriver statement境界、reasonは最初の既拒否labelであり、同じ瞬間のnative原因という意味ではない。BUILD_PENDING＋UNKNOWNでも原build awaitからの例外境界だけを示し、native resolver/ABI/input/body/service protocol causeを特定しない。原publicationは開始後observerでありpermissionやbefore-spawn証明ではない。

原 held frameだけを strict `{event,kind,phase,reason}` に変更した。kindはUNKNOWNのみ、phaseは12enum又はNULL、reasonは21enum又はNULL。runner decodeはexact keys/type/enumを要求する。boolean/object/未知string/unknownkeyを許可しない。正常header/service/built/closed schemaとexact正常順序、held受領時のfault永続、outer normalgateは不変更。元driver catchのheld通知失敗もheld状態/exitCode1を保ち、欠測は正常へ補完しない。

missing inner frameを新schemaで捏造しない。safe final framesはstrictdecodeした元frameだけ。rawfilename/argv/env/error/message/stack/SQL/body/private IDs/proof/native handleを追加していない。outercapacity/decoder/IO faultは既UNKNOWN投影であり、inner reasonから原因を推定しない。

## Fresh literal bindingだけの更新

SOURCE memory literal:
`/Users/hikaru/github.com/tuanemuy/hollow-ui-job-source-79ef126e-startup2-20261006`

BUILD memory literal:
`/Users/hikaru/.local/share/hollow-validation/goal-implement-ui-job-build-startup2-20261006-94f1c6ab`

派生toolTMPは既 `root + "-toolTMP"` のまま。存在probe/create/source materializationは0。oldgenerated SOURCE/a0632bfd/toolTMPは永久非操作であり、逆差分中の旧literalはmemory上のinert textとしてだけ扱った。

packed旧canonical payload1557908BのSOURCE literal2箇所（sourceRootとknown @repo/core linkTarget）とBUILD literal1箇所（root）だけを置換した。新payload1557935B/SHA4d8897419e971a24158e850d11d01e6289f09cc5953c1c21acad2122848c38ca、strict max2097152B内。payload JSON sorted compact形式、zlib level9、元envelope insertion-order compact＋newline形式を保持。runnerのformal fixed SOURCE/BUILD literalとMANIFEST_SHA/DRIVER_SHAだけを従属更新した。driverにroot定数追加はない。

固定candidate79ef126edd5d3440cde20dbe8fd372e7235010c5、sourceManifest4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206、source327/1920009B、deps707/13984808B、aliases10/links6、reachableSource66/import edges788/declaration edges2532は不変更。source recordsのcanonical JSON全文SHAをmemory再検算した。source/body/dependency filesystemを再読していない。

全payload keyはsourceRoot/root/linkTargets以外がold decoded objectと完全同値、source327/dependencies707の各record byte値も同値。linkTargetsの差は上記known SOURCE-root suffixの一箇所だけ。packageAliasesは公共固定値のままで、prefix/public未知path grantは追加していない。

4entries searchSupervisor/searchQuery/publicQuery/noteProjection、input exact327+707 membership、output exact4.mjs、Node24.15 canonical、esbuild0.27.7 canonicalbinary、stock async build/service child1と元allocated stdin/stdout・stderr inherit/NULLは固定である。database/Worker/nativeaddon/network scopeを増やさない。

## 全文 inverse

| Candidateからmemoryで行ったinverse | direct exact old bytes/SHA |
| --- | --- |
| driver診断state/reason/phase/既held通知追加を逆置換 | 9182 / fab719add4dc74f1f9a53121a61b9033b93a6562cd47375a989aefb8125b7617 |
| payload SOURCE2/BUILD1をoldliteralへ逆置換、同zlib9/envelope再形成 | 117081 / be5f62d1617cf269d6bfb0f384d70fbe7b9b038f9b5ba8c9f823ab9e2b57ba5d |
| runner strictheld decode差＋literal2＋依存SHA2を逆置換 | 25775 / ec269455b0af834c037c7ef76672cf5497316044c89f87d25615da6332d9c1ab |

3 inverseは元full-read bytesへのdirect byte equalityを全write前のmemoryでassertし、SHAも原固定値を記録した。old root/fileを開いてinverseを確認したのではない。その他code、source_objects GitPG補正、materialize/capacity/monitor/ownsignal/normal output manifestの実装は元全文inverseで不変更と確認した。既report/plan/review/P5d/S5/mainは編集していない。

## 静的検証とbounds

- Python `ast.parse`→`compile(AST,...,"exec")` PASS。helperをexec/importせず、pycache0。
- pinned canonical Node24.15 `--check p5c-ui-job-libsql-build-driver.mjs` exit0。syntaxのみでsource/dependency import、driver評価、child/build/rootcreate0。
- runner ASTからstrictheld tupleのphase12/reason21を抽出してknown enum countを確認した。static JSON serializationで全12×21＋NULL組合せのheld最大92B。fieldの名前・enumは固定ASCII。
- 既frames16/各512B、最大全体8192B、既control32KiB内。追加frame0、既normal frameは不変更。原decoder count guard/normalgateを弱めていない。
- material新算式117105+10061+26503+32768+4096=190533B、元188902Bから+1631B、上限262144B内。余裕71611B。packedは新+24B、driver+879B、runner+728B。
- whole source checks/typecheck/lint/format/testは0。source/product変更0で今回採用は工具の比例syntax/AST/boundsのみ。依存install/build/generationは0。

body60/sharedtail30/root192/source32/output16/TMP8/log2/material256K/guard200ms/child1/Worker-addon-DB-network0を保持する。原async build完了後のsameChild.stdin.end一回→actualexit/close/stdout end-close/allocatedstdin finish-close→原esbuild.stopというRoot既採用post-build closure差も不変更。原stopPromiseやstdio destroyだけでclosureを作らない。native service stderrNULL/inheritedとouterNode stderrのEOF/FDcloseは別証跡である。

outerknownNode PID/PGだけのfinite TERM/KILL、leaderactualexitとは別のknownPGabsent、2PIPE EOF/controlEOF/4actualFDclose/forceflagsを元gateで扱う。missing/unknown/non0/force/denyはheldのまま、正常outputmanifest/public artifact受入を診断stageで代用しない。

## 非操作と返却

今回writeは既公開helper3＋NEW phase1だけ。generated SOURCE/BUILD-a063/toolTMPおよび全旧success/failed private rootへのstat/read/hash/copy/import/replay/rerun/cleanup0。currentmain/working/S5/P5d/B/private/log/key/DB/proof/source/body/dependency access0。Gitreader/defaultpreflight/Nodeversionprobe/build/sourcecreate/native/servicechild/browser/network/audio/D01/external0。fresh memoryliteralも未probe/未createである。

candidate regular600/nonlink/nlink1/canonical/fullstableSHAと新phasewx600/fsync/actualFDclose/postreadSHAを固定して、全reader/writer/runtime STOP。独立候補preflightをRootへ返し、actualはRootの別明示採用まで0。cause UNKNOWN、正常UI/job/libSQL/nativeproof/P5d/fullacceptance0を維持する。goal/spec/spec-implement/Manager正本/追加agent操作0。
