# S5-AUDIT-TABLE1: formal conversion_jobs query — fixed TOOL candidate

候補固定。STATIC schema/table不一致の最小修正だけ。**actual/default/preflight/rootprobe/sourceimport/native/DB/runtime0。APP/S5 family正常合格ではない。** current SOURCE e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42、whole1469+1470 sourceguardは凍結のまま。新候補を独立reviewへ返して全reader/writer/runtime STOP。

PUBLIC入力 review [P5c-3-s5-app-actual.md](../reviews/P5c-3-s5-app-actual.md) 7897B/SHA b7cfb0a33f80a9bc176c1148a6c6dcca24ccf5f7686ad9b24a3ad07c3e2aca39をstable全文読取した。既reviewのformal schema/public repository/migration照合を明示借用し、productsource再読0。実oldAPPa184のdriver error/SQL到達/件数/readonlyaudit/copy/actualauditcloseはUNKNOWN・未受領のままである。この静的修正をactual初因の確定とはしない。

## Fixed current public helpers

| Helper | Bytes | SHA256 | Mode |
| --- | ---: | --- | --- |
| helpers/p5c-s5-test-runner.py | 289795 | 7fa7fe9818524fcbc58aa1becc1038a193a1a999b127e44ffc98c3f13b29516c | 600 |
| helpers/p5c-s5-test-config.mts | 389705 | eaa3eb9cf1547dbcc8334e25b78563d06ff2886cf8ecfb79acc029dad3f1acb2 | 600 |

元runner289777B/c257bf79051768fec3707e6c2251769a110c78cef781a981e7c767ae75d4a75e、元config389698B/8802fd05112faa4a23f235eb6dc5a4299c27da4d4ae1e65da82ec5af3e81e6d9をcanonical regular600/selfUID/nonlink/nlink1/NOFOLLOW全文安定確認して最小編集した。元・currentはopen前/fd前後/path後のdev/ino/mode/uid/nlink/size/mtime/ctimeを照合。変更2helpersだけ、extra source/config/helper paths追加0。

## Exact minimal delta

runnerのaudit queries、診断label jobsだけの元SQL:
`SELECT count(*) FROM jobs`
を
`SELECT count(*) FROM conversion_jobs`
へ変更（occurrence1）。

正式schemaはconversionJobs = sqliteTable("conversion_jobs", ...)、repositoryはconversionJobs as jobsというTypeScript局所alias、正式0001 migrationはCREATE TABLE conversion_jobs。これは公開固定reviewが読んだ元sourceの根拠であり、実DBを調べて期待を作っていない。SQLの値・native error.message/stack・private結果は未取得。

診断label jobs、expected n*2、n=7 APP/n=2 Native-D1は完全据置。APP expected14、Native/D1 expected4、notes/originals/operations/revisions/success-failure-cancelled/closedinput-memory/pins/LLM関連counts、FK/integrity/queryonly/immutable接続/コピー/監督normalguardは変更0。expected件数はsource-derived候補値でactualauditの観測値ではない。

Root採用のmemory-only APP予約suffix:
`p5c-s5-app-a184c90e` → `p5c-s5-app-audit2-a61873de`
をrunner FAMILIES.app とconfig roots.appの各唯一literalに適応した。新APP ROOTは/Users/hikaru/.local/share/hollow-validation/p5c-s5-app-audit2-a61873de、派生TMPは元family/root規則のまま。どちらもprobe/stat/存在確認/create0。旧APPa184はDB/opaque/audit/results/cache/TMP全て永久NONOP。

config唯一APP literal適応でnewSHA eaa3eb9cf1547dbcc8334e25b78563d06ff2886cf8ecfb79acc029dad3f1acb2を得たため、runner CONFIG_SHAの元唯一64hexだけをその値へ更新した。configにqueryやauditを追加していない。pure/native/native-d1の全FAMILIES tuplesとAPP tupleの他4要素はPython AST literal読取で元と同値を確認。helperのmodule/bodyを評価/importしていない。

## Whole-byte inverse

current configの新APP literalを元literalへ逆適応 → **389698B/SHA8802fd05112faa4a23f235eb6dc5a4299c27da4d4ae1e65da82ec5af3e81e6d9**、元全文bytesと直接一致。

current runnerのnewCONFIG_SHA→元SHA、新APP literal→元literal、newquery→元queryを逆適応 → **289777B/SHA c257bf79051768fec3707e6c2251769a110c78cef781a981e7c767ae75d4a75e**、元全文bytesと直接一致。

runner bytes増分18、config増分7。runner差分はquery1/root1/configSHA1、config差分はroot1だけ。全文inverseによりsourceguard/sourceFiles/dependency bindings/1470manifest/1469tracked graph/CF/Node execPath-version/native ledger/stockfork/Reporter/frames/normalaudit gate/Python supervisor/PG/PIPE/FD/finite caps/tail/expectedcounts全て差分外同値。新schema/migration/productsharedport/DBrow/case/assertproofを書換しない。既source・依存全走査のPASSや前actual受入を本工具修正のactualPASSに代用しない。

## Syntax and proportional type boundary

- Python AST parseとcompile(source, filename, exec)はPASS。helper import/evaluation/cache生成0。
- pinned public Node24.18の--check config.mtsはexit0。構文のみ、imports/defineConfig/Reporter/sourceguard/body実行0。
- 変更TypeScriptはroots.app string literal1だけ。同じstring/as const構造を維持し、型宣言/API/type shapeの変更0。productwholechecksやVitest実行を追加していない。config型の新実行証拠を捏造せず、変更外は既固定候補の根拠を借用する。

PUBLIC source/helperだけを読んだ。実working source/main/UI/P5d/S5product/native/migrationsを読取・変更・importしない。工具manifest内の固定公開source名/hash表は元helper全文の一部として読取したが、列挙された実source/depsを再開/再読していない。

## Supervision and future execution boundary

元normalcase/afterAll/actualstockforkexit-close/readable EOF-close/normal requested SIGTERM/pid absence/channel release/native ledger復元/Nodeactual0/PGabsent/PIPE EOF/FDclose/force0/sidecar条件を全て保持。これらの成立後だけ元copy_db二段→samefixed readonlyauditを呼ぶnormalguardは一文字も変更しない。工具修正自体からservice/Worker/native owner/Input proof/FDclose又はaudit成功を作らない。

旧APP7 assertionsの局所PASSは独立reviewがRoot stdoutから借用した範囲だけ。familyheld/auditNULL/Python1、strictClosedGuardfalse/resourceNULLを現候補の正常閉鎖へ昇格しない。今回failurecauseはnativeSQL/readonly状態未読取のためUNKNOWN。PURE341/6074及び全旧success/failed/privateのcause・結果も再探索しない。

既root/DB/opaque/audit/results/cache/TMPへのstat/read/hash/copy/import/rerun/cleanup0。newrootprobe/create/default/preflight/actual/source import0。network/Worker/business runtime/browser0。time/resource/proof/cases/capsの増加0。

このNEW phase一pathのみwx600でfsync/close/stable fullSHA固定。Rootによる独立reviewと別explicitoneactual採用まで起動しない。Manager正本/goal/spec/spec-implement/subagents/source/helper追加0。全reader/writer/runtime STOP。
