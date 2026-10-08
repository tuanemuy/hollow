# UI browse4 startup diagnostics — independent candidate preflight

判定: LIMITED STATIC PASS。新 held 診断4項目・fresh literal binding に起動blockerは見つからなかった。今回の工具採用gateに限る。actual/default/Git reader/source materialization/Node import/build/native/service/root probe/create は全0。原 actual cause は UNKNOWN、原service正常閉鎖は未観測。report固定後 ALL read STOP。新実行は Root の別採用に委ねる。

## 公開固定入力

| PUBLIC path (.goal-implement/ 以下) | bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-ui-job-libsql-build-startup-candidate.md | 10842 | a1527f6baee3baabeaef9fe7972118708bb9350b7dbc97d96b982613a1e71832 |
| phases/P5c-ui-job-libsql-build-startup-plan.md | 14888 | 08b2695526eda1b9595d72e513339a39ebd72d8e661cd1c6efe560b50935d707 |
| reviews/P5c-ui-job-libsql-build-startup-plan.md | 9865 | 60d3145b3310748203e28f6608dcff0feedbaa9463ad5c3a32a81238263555f7 |
| helpers/p5c-ui-job-libsql-build.py | 26503 | 9b55aa9ffc7bca02e8aa447be3706c17573a7e4274639d1a6cedf4a0c9ed74d2 |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 10061 | 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac |
| helpers/p5c-ui-job-libsql-build-manifest.json | 117105 | d2b84a5a01c5ac2ea756bab5df138222fd25db892432d1ccd2cf0d6a2a631fa8 |

上記6本を canonical regular600/nonlink/nlink1/selfUID、NOFOLLOW read、path/FD 前後 dev/ino/mode/UID/nlink/size/mtime/ctime 安定、全文 bytes/SHA と実 reader FD close で直接確認した。packed/source327/deps707 の metadata は memory JSON としてのみ参照した。source/dependency 本文・public binary・current main/working HEAD・旧生成SOURCE/B を再読していない。初回表示はtool出力上限により一部truncateしたため、同PUBLIC runner decode部分のみ再表示した。

以前の独立 source327/deps707・aliases10・esbuild/Node一次source・constructor/publication・stockAPI/資源のレビューを借用する。初期工具レビューの Git PG 異常回収不足は修正後 runner ec269 の固定計画レビューを基点とし、今回の全文inverseでその基盤を保持したことを直接確認した。707再走査やnative起動をこのreviewで再証明しない。

## 独立全文 inverse

メモリ上だけで採用差を逆適用し、旧 helper の full bytes/SHA に直接一致した。旧ファイル/rootを読んで比較していない。

| inverse | bytes | old full SHA256 |
| --- | ---: | --- |
| driver: phase/reason state・定数held理由・callback固定wrapper・既held通知差を除去 | 9182 | fab719add4dc74f1f9a53121a61b9033b93a6562cd47375a989aefb8125b7617 |
| runner: strictheld decoder差＋SOURCE/BUILD literal各1＋依存SHA2を除去 | 25775 | ec269455b0af834c037c7ef76672cf5497316044c89f87d25615da6332d9c1ab |
| packed: payload SOURCE2/BUILD1逆置換＋zlib9/envelope元表現 | 117081 | be5f62d1617cf269d6bfb0f384d70fbe7b9b038f9b5ba8c9f823ab9e2b57ba5d |

driver inverse は元throw-onlyだった build/result、output比較、closure held/result の4箇所を原形へ戻すことも含む。他の元 held/throw は保持。元短絡predicateの operand順序・追加未知property-readなしを確認した。runner全逆一致から source_objects/PG回収/materialize/capacity/monitor/normalpostprocess の変更0も確認した。

## 診断契約

`held(reason=null)` は原 persistent held true を保ち、最初の非NULL reasonだけを保存する。後続 UNKNOWN/DEADLINE/stream error/BUILD_HELD/CLOSURE_HELD は先のreasonを上書きしない。新reasonは固定siteの21 ASCII enumのみ。child error/Worker publicationのwrapperは元event引数を無視し、任意 error.name/code/message/stack/cause/constructor/arguments を読まない。元emit write例外は同original error再throw、FRAME_WRITEはsticky heldへ結ぶ。

phase12は自身のstatement境界だけ。IMPORT/BUILD returnは元await解決の後、INPUT/OUTPUTは元検査直前、BUILT/CLOSEDはemit試行境界、STDIN_END/SERVICE_CLOSE/ORIGINAL_STOPは原処理の位置である。phase到達はその操作成功、native原因、permission、service closed 又は元Promise解決の証明へ変換しない。原 API/receiver/arguments/results/Promises/cache/constructor/module exports を診断で置き換えていない。post-build 元stdin.end一回と原stopの順序も全文inverseで不変。

driver:123 の build compound条件は元 short-circuit のまま。既state.held分岐で result.errors/warnings の未到達operandを診断用に読む枝はない。resolve/loadは元 nextと既比較結果を使い、追加realpath/read/ancestor/accessor探索やscope拡大なし。setupの元catch外例外は診断frame未受領/NULLのまま残り、SETUP成功や後続reasonを捏造しない。

held通知は exact `{event,kind,phase,reason}`、kind UNKNOWN、phase12又はNULL、reason21又はNULL。runner:407–411 は exact keys と string/enum/NULLを要求する。unknown key/type/value を正常へ落とさない。catch通知自体が失敗しても persistent held と exitCode1 が残り、outerの残buffer/EOF/exit/frameorder normalgateから成功へ補完されない。診断は新frame0、原heldのみ。outerIO/capacity/decode/forcefaultにinner reasonを合成しない。

driverの元samechild/1service/binary/args/cwd/non-detached、originalbuild/options/input membership/output exactset、native deny、stream/child終端条件は不変更。stdout end-close/stdin finish-close/child exit0-no signal-close後だけ原stopへ進む。stderr NULL/inheritedとouterNode stderr EOF/FDを区分する。constructor publication/tracingは観測開始後でありbefore-spawn permissionとは主張しない。

runner正常gateは nofault/noforce、actualNode0、knownPG absent、raw2PIPE/control EOF、独立4FD close、emptyremainder、exact header→service→built→closed のまま。normal時だけ outputs4 stable hashes/bytes/cap/wx manifestへ進む。診断phase/reasonはnative closure/proof/ACK/DB/job/UIの代用品ではない。

## 新bindingと有限bounds

memory-only SOURCE `hollow-ui-job-source-79ef126e-startup2-20261006`、BUILD `goal-implement-ui-job-build-startup2-20261006-94f1c6ab`、toolTMPはBUILDから既式で派生。runtime/materialize前の存在確認は今回0。fixed candidate79ef126/sourceManifest4b397保持。packedの strict duplicate-key JSON・base64/zlib bounded2MiB・EOF/unused/unconsumed0を独立確認した。新payload1557935B/SHA `4d8897419e971a24158e850d11d01e6289f09cc5953c1c21acad2122848c38ca`。source records327/1920009Bの sorted compact SHA は4b397、deps707/13984808B/aliases10/links6/reachable66/edges788/declaration2532 は全文inverseにより不変。knownlinkTarget自己sourceのみliteral変更、旧SOURCEへのoperational import/copy/reuse枝を追加していない。

runner ASTから decoder enum12/21を直接抽出し、NULLを含む全組合せの compact JSON＋newline 最大92Bを検算した。各512B/16frames/8192B/control32KiB、追加frame0。material117105+10061+26503+32768+4096=190533B ≤262144B。Python AST parse→compile-in-memory PASS、helper評価/exec/import/pycache0。Node --check のexit0は担当公開報告を借用し、VerifierはNodeを起動していない。

body60/sharedtail30/guard200ms、source32MiB/output16MiB/TMP8MiB/log2MiB/root合算192MiB/material256KiB、Python1/Node1/asyncservice1＋別pre-buildGit1、Worker/addon/DB/network0 の基盤を変更していない。実可能性/実時間/child closure/nativepermissionの新観測はない。

## 次の採用順と非操作

Rootが別採用する場合の既CLI順は PUBLIC standalone fixedfile/precheck → pinned canonical Python `helpers/p5c-ui-job-libsql-build.py` argv[]（default preflight）→ sole argv["--run"]。defaultは binding/dependency/alias/Node/Git metadata と immutable Git object readerを実際に使う設計であり、工具process0とは言わない。一方 defaultは新root probe/materialize/Node buildをせず executed false/rootProbed false/sourceCreated false を返す。今回いずれも実行していない。本PASSだけで新実行や旧失敗原因の確定を承認しない。

旧生成SOURCE/BUILD-a063/toolTMP、S5 app184/pure341/6074 と全旧success/failed validation/private、B/log/key/proof/DB/results/cache は stat/read/hash/copy/import/reuse/replay/cleanup0。新SOURCE/BUILDも probe/create0。main/P5d/S5/source1470walk/UI/browser/外部/audio/D01/goal/spec/spec-implement/追加agent操作0。writeはこのNEW wx600 reviewのみ。全reader FD閉鎖済み、report固定後 ALL read STOP。

記録時刻: 2026-10-06T09:11:35.973737+00:00
