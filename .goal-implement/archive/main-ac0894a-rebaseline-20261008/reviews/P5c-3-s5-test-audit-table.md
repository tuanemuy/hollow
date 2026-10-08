# S5-AUDIT-TABLE1 independent minimal TOOL review

Result: LIMITED static TOOL PASS。唯一のSQL table名補正、新APP memory literalと従属CONFIG_SHAだけの候補差を支持する。製品/S5全体、APP family正常audit、Native/D1 actual、UI完成の受入ではない。actual driver causeはUNKNOWNを保持し、旧APPa184/PURE341/6074/DA5b8/全旧privateは永久非操作。VerifierはS5補正を実装しておらず、自身UI候補のwriter/read STOPを保持して独立に確認した。

## Direct fixed PUBLIC inputs

| File | bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-3-s5-test-audit-table.md | 6654 | 93084a7b1daa5a4d61658bf4fd5298afac5bd326ed02cb4aa6716e6301c2f322 |
| helpers/p5c-s5-test-runner.py | 289795 | 7fa7fe9818524fcbc58aa1becc1038a193a1a999b127e44ffc98c3f13b29516c |
| helpers/p5c-s5-test-config.mts | 389705 | eaa3eb9cf1547dbcc8334e25b78563d06ff2886cf8ecfb79acc029dad3f1acb2 |
| reviews/P5c-3-s5-app-actual.md | 7897 | b7cfb0a33f80a9bc176c1148a6c6dcca24ccf5f7686ad9b24a3ad07c3e2aca39 |

上記exact PUBLIC4の全文をregular600/nonlink/nlink1/selfUID/canonical/NOFOLLOWで直接読取し、lstat/open/fstat前後/path後のdev/ino/mode/UID/nlink/size/mtime/ctime一致とfullSHAを確認した。unique bodiesは694051B。helper中のembedded manifest/hash表は公開helper本文として読んだが、source1470/dependencies/CF/Node実物へ再走査・stat/importしていない。working main/P5d/S5source/UIcandidate/B/旧privateも読んでいない。

## Permitted delta and independent inverse

current runnerの唯一 `SELECT count(*) FROM conversion_jobs` を元 `SELECT count(*) FROM jobs` へ、新APP suffixを元suffixへ、newCONFIG_SHAを元SHAへmemory逆置換した。旧rootはinert stringとしてだけ扱い、pathを開いていない。

| Inverse | bytes | fullSHA |
| --- | ---: | --- |
| runner SQL1＋APP literal1＋CONFIG_SHA1のinverse | 289777 | c257bf79051768fec3707e6c2251769a110c78cef781a981e7c767ae75d4a75e |
| config APP literal1のinverse | 389698 | 8802fd05112faa4a23f235eb6dc5a4299c27da4d4ae1e65da82ec5af3e81e6d9 |

各new文字列のoccurrence1を直接確認してinverse全文のsize/SHAを固定旧基準へ照合した。Verifierは変更前原bytesを別fileから再取得していないため、旧fullSHAへの独立照合と表記する。Implementerの変更前bytesとのdirect inverse確認はcandidate reportの借用事実である。current runner+18B/config+7Bに一致し、許可差以外の全bytesはこのfullinverseで固定旧基準へ戻る。

runner FAMILIESはAST literalだけを抽出してcurrent/inverseを比較した。pure/native/native-d1全tupleは同値、APP tuple5要素のroot以外4要素は同値。SOURCE e25ab100a2eae6e8c95bc8d6ec14c4d1fa000e42、1470manifest d1b9a0b801f758742051495c7c5f9daa9645a778aee57279340f9fad4a7ec29e、1469tracked guard/CF、pinnedNode、source/dependency/native/D1bindingsも許可差外である。全source検証PASSを今回新たに主張しない。

新APP memory literalは `/Users/hikaru/.local/share/hollow-validation/p5c-s5-app-audit2-a61873de`。runner/configで各一箇所だけ、派生TMP規則は不変更。存在確認/probe/createは0。旧a184 DB/sidecars/opaque/audit/results/cache/TMPをstat/read/hash/copy/import/cleanup/rerunしていない。

## Formal SQL mapping and expected counts

正式tableの一次source照合は既独立APP reviewを明示借用した。同reviewはe25 sourceのhollowSchema.ts:122–123のconversionJobs=sqliteTable conversion_jobs、jobRepository.ts:5のconversionJobs as jobsというTypeScript局所alias、migration0001のconversion_jobs作成を照合している。jobsは物理table名ではない。この補正はsourceに根拠がある。今回その製品sourceを再読せず、実DB/元SQL error/bodyを調べて期待を作っていない。

candidate runner:638のnはAPP7、その他native/native-d1は2、646の診断label jobs/expected n*2は据置。したがってAPP expected14、Native/D1 expected4のままである。APP source-derived14の種別（seed7＋原machine request7、重複requestは追加なし）は既独立APP sourceレビューを借用する。Native/D1 4は工具の固定期待でありactual観測値ではない。

元accounts/workspaces/notes/originals/operations/revisions/success-failure-cancelled/activePins/LLM関連、owner/source-memory/input receipt等のcount/guard SQLはinverseで不変更。inputReceiptの正式物理名source_input_receiptも変更していない。SELECT対象の一table名修正だけで診断label/jobs expectation/case意味を変えない。共有contract/製品schema/migration/ports/native class/proof/DB rowsを変更していない。

既APP7 source assertions局所PASSはRoot実行の公開投影を既reviewが借用した範囲である。readonly audit driver error、auditNULL、Python1/familyheld/strictClosedGuardfalse/resourceNULLを今回正常へ補完しない。actual到達SQL/件数/readonly接続/copy/actualauditcloseと具体causeはUNKNOWN又は未受領のまま。

## Normal gates and syntax scope

runner audit:621–658の原sidecar閉鎖条件、copy_db二段とcopySHA一致、mode=ro/immutable、query_only/FK/integrity、各exactexpected、finally connection.close/actualClosedの条件は不変更。outer正常gate:866–877は元Pythonexit0/ownPGabsent/expectedNodePGabsent/両EOF/実FDclose/forceなし/strict root guard/innerheldfalse/faultNULLを保つ。afterAll/actualstockforkexit-close/readableEOF-close/publicIPC release/normalrequestedSIGTERM/nativeledger復元/Nodeactual0/PGabsent/PIPEEOF-FD/sidecars/capacity/timeoutsの全codeもfullinverse差外である。

この工具補正から原native/input proof/owner/FDclose/サービス正常終了を作らない。原normal条件の成立後にだけcopy→readonly auditへ進める順序を維持する。診断・inner sourceassertion・原client.closedのpropertyを独立native FD proof又はfamily normal acceptanceへ変換しない。

独立Python AST parse/compile(AST,filename,exec) PASS。helper評価/import/cache0。config差はexisting roots.appのstring literal1で、同string/as const/type structureのまま。config構文Node --check exit0はImplementer candidate reportを借用し、今回Node実行/import/defineConfig/Reporter/sourceguard/body/typecheck/default/runtimeは0。source/product変更無しなのでwholecheckを実行していない。新型/APIや追加resource要求は見つからなかった。

現在の独立結果はtool candidateの比例整合性だけで、source全走査・DB実SQL成功・audit結果・native/D1実条件やS5 A–Fを受け入れない。別Rootscope採用と独立実行結果レビューまでactualを許可しない。

## Nonoperation and STOP

writeはNEW reviews/P5c-3-s5-test-audit-table.md一pathだけ、own wx600/fsync/actualFDclose/postread stable600/nlink1/canonical/fullSHAで固定する。runner/config/phase/review/製品/UIcandidate/Manager正本は変更0。

全APPa184/PURE341/6074/DA5b8/旧success-failure/private root、DB/key/log/result/cache/TMP/opaque/auditへのstat/read/hash/copy/import/rerun/cleanup0。source1470walk/depswalk、default/preflight/test/sourceimport/native/DB/Worker/rootprobe/create/runtime0。main/P5d/S5/UI helperの追加write0。全reader/writer/runtime STOPでRootへ返す。spec/spec-implement/goal/追加agent操作0。
