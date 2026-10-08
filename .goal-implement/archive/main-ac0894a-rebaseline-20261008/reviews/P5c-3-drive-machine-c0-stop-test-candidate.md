# C0-F2 logical4 tooling independent review

2026-10-06。**LIMITED FAIL — LOGICAL-DIAG1**。この候補で actual を採用しない。新工具deltaの独立レビューであり、レビュアーは元C0 product/test作者だが、この runner/config候補を実装していない。C0-F2論理SOURCE意味は既独立SOURCE review9481B/SHA60414df31cb06afc46f67b3e64e934e138e1310df8d3c8f1b45af0f33a74b16d の受入を借用し、同SOURCEを自分で独立受入したとはしない。

PUBLIC固定全文/staticdata/AST/diffだけ。default/preflight/Vitest/test/Nodeimport/DB/Worker/native/browser/HTTP/validationrootprobe/create/Git実行0。SOURCE全walk/1474SOURCE再読0。main/S5/P5d/UI/helpers/product/Manager edits0。全旧actual/generatedsource/build/TMP/DB/key/proof/results/cache/private領域は恒久NOOPS。spec/spec-implement/追加agent0。

## 固定入力

| PUBLIC known file | Bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-3-drive-machine-c0-stop-test-candidate.md | 17221 | 09e2ef6a727cc3d8e3c5b90caaaa408420b584337ad4336b066e0eb3e2236d96 |
| helpers/p5c-machine-stop-runner.py | 281230 | 3ce0fdfe9ec4974f40b3c40f7688da7129d85f2b1dc2f4037338cb668d8483d9 |
| helpers/p5c-machine-stop-config.mts | 380456 | f2a843ed240aee1c628c39537e8db4a9ceafd94a5ebe4afe4147775e9973b8d9 |
| baseline helpers/p5c-s5-test-runner.py | 291003 | 625d735653e766dc0188be4d96410bfdac331c31c4aae5a102ef80a8a750e8e9 |
| baseline helpers/p5c-s5-test-config.mts | 392626 | 4a6e1d619d08e0fd045142f686e9e38be6a21c0199ef2fe1075cfbe5c01cda8d |
| accepted source phase P5c-3-drive-machine-c0-recovery-stop.md | 161455 | abe0f9066cd632a0d1b2fcacff046bf7bdb14f9df3bd9bdcc60e454d642ef27b |

各直接readはregular600/nonlink/UID501/nlink1/canonical/O_NOFOLLOW/fullSHA、dev/ino/mode/uid/nlink/size/mtime/ctimeのpath-FD-path一致、actualFDcloseを確認した。固定phaseのsource manifestをmemory内だけdecodeし、SOURCE実物/targetpackage/actualrootへアクセスしない。読み取り用解析scriptのlist-vs-dict/list-vs-tuple/typedconst抽出調整は自前schema読解の補正であり、候補defectに数えない。

## 不合格 LOGICAL-DIAG1 — import削除後の sqlite3.Error 参照

新runnerはbaseline `import sqlite3` を削除した。一方、byte同値で借用した `safe_diagnostic` に以下が残る。

```python
# new runner:50–60
def safe_diagnostic(error=None):
    code = None
    if isinstance(error, Boundary):
        ...
    elif isinstance(error, OSError):
        ...
    elif isinstance(error, sqlite3.Error):
        code = "audit-driver-error"
    elif error is not None:
        code = "unknown-fault"
    return {**DIAGNOSTIC, "faultEnum": code}
```

直接ASTはsqlite3.Attributeを **56:Error の1参照**だけ検出し、sqlite3 import/代入はない。normal error=NoneではBoundary/OSError両判定がfalseとなるので、次isinstanceの引数sqlite3.Errorを評価して未定義名NameErrorになる。型/構文compileだけではこの実行時name解決を検証しない。実行で再現しておらず、原Python name lookupと静的経路による決定的工具defect。

reachable normal sites:
- run_group:558 `result["diagnostic"]=safe_diagnostic()`。Node/case/fork結果が正常でも、returnresult前にNameError。
- main:591正常elseのsafe_diagnostic()（上記が通る修正後もこの参照は残る）。
- supervise:782終端safe_diagnostic()。最終safe JSON出力:785前にNameError。
- unknown non-Boundary/non-OSErrorをsafe_diagnosticへ渡す場合も同じ。現top boundary捕捉はBoundary/OSErrorだけで、NameErrorを有限safefaultへ自動写像しない。

**正常 --preflight logical は別**: main:574–575で固定preflight JSONを直接printしてreturnし、safe_diagnostic(None)を呼ばない。したがってdefault/事前検査に成功しても、この欠陥を除外できない。preflightをこのレビューでは実行していない。

最小補正はDB0 familyで不要になった `elif isinstance(error, sqlite3.Error)` / audit-driver-error assignment の二行枝を削除すること。SQLite importを復活させてDB依存を再導入する必要はない。必要なら未使用audit-driver-errorのfiniteenum整理は別deltaとして明示し、正常schema/他fault意味を変えない。広いcatch/normal成功合成/closure弱化を補正に混ぜない。Root採用後作者が修正し、runnerfullSHAとreport従属を再固定、独立比例再reviewが必要。このreviewはhelper修正をしていない。

## 直接確認した bindings と全逆差分

baseline全文readからdifflib opcodesで非変更chunkのbyte同値とchangedchunk全体を確認し、逆差分をmemoryで構築した。

- runner changed26hunks。全inverse291003B/SHA625d735653e766dc0188be4d96410bfdac331c31c4aae5a102ef80a8a750e8e9、baseline全文同値。
- config changed10hunks。全inverse392626B/SHA4a6e1d619d08e0fd045142f686e9e38be6a21c0199ef2fe1075cfbe5c01cda8d、baseline全文同値。
- exactsource C176ea15b572c610e97f99a021ea94e2ba60637c7。accepted phase zlib/base64→compact manifest282183B/SHA004ff039931dcddc3f4c0936b5e3f002f5c028aba47f25bd2f11fb6454f41ea0。1475rowsの内1474regular/21303283B＋knownAGENTS1をdecode。
- configmanifestのpath/mode/blob/bytes/fullSHA1474全rowはこのacceptedmanifestと同値。runnerSOURCE_FILES/SIZES1474全rowとsole100755 `infra/shared-server/provision.sh` も一致。型上のGit100644/755→formalactual600/700とAGENTS→CLAUDE例外を維持。SOURCE実walk不存在/現HEADclean/実metadataを今回再主張しない。
- SOURCE literal1＋PUBLIC_LINKS workspace2＋PUBLIC_PACKAGE_METADATA ownpackage2の **5self bindings** のみC0rootへ変更。各table108 rows、各old-new差2。他106table rows全文同値。configとrunner両tablesも同値。
- PUBLIClinks compactSHA451a2dddee9be601793bbd17dfa573f037c5a43aae47494d1305a251559dfe0b。metadata108rows/83unique、unique422152B/repeated679698B。publictargetsを今回stat/read/hashしない。
- CONFIG_SHAは新config fullSHAと一致。Node24.18/Vitest/CF986/1803d60...など固定bindingsは原table/guardのまま、Node24.15を誤代入していない。
- root `/Users/hikaru/.local/share/hollow-validation/p5c-machine-stop-20261006-f82c613a` と派生tmp/cacheはMEMORY ONLY。不存在/状態をprobeしない。

## exact4 case / Reporter / stock fork

単一logical familyとfull selected path `packages/core/src/adapters/node/regeneration/runner.test.ts`。他basename runner.test.tsや旧S5familyを選択するfallbackはない。

1. stop before the initial microtask permits only recovery and caches its promise
2. drains an already-issued sweep and recovers late pending work while the original stop waits
3. retains a recovery error after later logical completion instead of accepting normal stop
4. preserves the original execution stop rejection

source意味/四caseはacceptedSOURCE review借用。今回source/test実物を再読・実行しない。JSONfullName配列exactorder、4cases passed/skip0、requiredNames4/skippedNames0、各formalTestCase ready/resultの参照同一性、moduleId==same SOURCE/fullselectedpathを工具本文から確認した。

- config `const observerState=`～forkState前 **3644B/SHA5413428a5511eb468d6795c0014272d2ad057f1109915f79d332f361edfcf550** はbaselineとbyte同値。officialready/result同TestCase・一回result、同module、run-end passed、errors[]、同hookStarts/Endsを保持。
- `const forkState =`～setup前 **5845B/SHA17f8f7c0f0be3a882ad0e79c1d6af9834dc5ea79f35bb19f6c9d67f0f5e40f10** はbaseline同byte。originalreceiver/args/env/currentexecArgv参照、originalfork返却handle、super.start()/stop()の原委譲を維持。temporaryforkProxyは原stock constructionだけ、cacheFs=false、stockforkprotocolを変えない。
- forkclosureはactualexit/close、ownPID ESRCH、両readable end/close、stdinclose、actualdisconnect＋!connected/channelreleased、noKILLを必要にする。normalSIGTERMはoriginalstop要求とactualsignalで分ける。IPC EOF/FDはNULL。stdinFinishは観測欄でnormal必須にせず、原閉鎖契約のまま。
- poolnameだけmachine-stop-observed-forksへ変更しbuilt-in pool短絡を避ける。maxWorkers1/maxConcurrency1/cachefalse/watchfalse/fileParallelismfalse、setupselffile、本体前＋afterAll sourceGuardが維持。

Python read_regular/source_guard/group_state/owned_signal/diagnostic_json/diagnostic_reporter/fork_ledger_receipt/resource_diagnostic/safe_diagnostic/validate_diagnostic等14関数本文はbaseline同byte。**同byteでもimport環境変更でsafe_diagnosticの意味は壊れる**ので、この比較だけでPASSを出さない。

## DB0 / no business load adaptation

DBcopy/audit関数とsqliteimportを削除。main.auditはNoneのまま。通常のDBcheckpoint/copy/audit/SQL実行をsolelogical familyへ持ち込まない。DB0はnormalrootguardにallDBbytes0/Originals0として要求し、以前DBfamilyの成功を借用しない。

setupではoriginalWorker/ordinaryspawnを捕捉し、Proxyはconstruct/applyの前にfiniteattemptcount増加→ledger persist→固定Error拒否。originalconstruct/spawnは実呼出しない。afterAllでoriginalmodule identityがProxyのままか確認して元identity復元/syncBuiltinESMExports、worker/spawnattempts0＋restoredだけbusinessnormal。static ledger decoderもstrictkeys/version/bool/countを確認する。unexpected試行はcaseがErrorをcatchしてもafterAll countからnormalにならない。nativepositive/proof/人工events/旧ownerledgerを作らない。

run_group:531–551の正常gateはexactselectedmodule/4fullnames/正式JSON4pass0skip0fail＋ReportersameIdentity/errors[]/hook対応＋Nodebindings2 differentPID includingactualCLI＋originalforknormal＋businessnormal。内outeractualexit0/knownPGabsent/両PIPEactualEOF/actualFDclose/force0/strictcapacityが揃うまで正常held解除しない。DBaudit削除はこの純論理fixtureのDB0契約への適応であり、APP/native/D1 normalgatesを同工具へ弱化して流用していない。

no-business ledgerがWorker/spawn0を記録しても、genuine input proof、operation.done、Drivefullshutdown、ACK、native resource closureの証明ではない。selectedSOURCEのmock scheduling/rejection論理に限る。nativeaddon等未知module全体のabsenceをこのcountだけから作らない。

## 予算と正常/失敗境界

- familybody30、outerstartをouterprecheck前に取り、outerbody30＋sharedtail30でouter60。case/hook/teardown10、guard200ms、newtimer/timeout成功化0。長いprechecks/閉鎖が予算を使えばheldであり延長しない。
- root192MiB、tmp+cache combined8MiB、records/material256KiB、8192entries、DB0/original0/businessWorker0/businesschild0/network0。toolCLI1/fork1、knowninnerPython1/outerdriverは別役割。
- config PUBLICread-only380456Bは1MiBreadcap内でprivatecopy0。runner281230Bもprivate materialへcopyしない。
- conservative record bound **2×512＋Reporter8192＋fork8192＋business8192＋summary32768＝58368B** <256KiB、直接算出。manifest-controlledSOURCE21303283Bはreadonly source input。rawPIPE最大2MiBはmemory-only diagnostic入力の別budgetで、rawerrorを保存/出力する許可ではない。
- outerNode/knownPG/inner2PIPE2actualFDcloseとouterPython2PIPE2actualFDcloseを別判定。originalforkstdin/両readable/IPCpublicclosureも別。force/noEXIT/PGunknown/EOF欠測/stream閉鎖欠測を正常化しない。
- earlyknownownerframe、samePID/PGのみ、unknownPID探索/scans0。继承baseline adversecleanupの細部をこのtoolingdeltaで新しく完全検証したとはしない。normalgateの各actualreceiptは保持され、未知held分類は変更なし。
- solelyproposal memoryrootは未probe。futurefailureはpermanentheld/noautomaticretry/no再read。4passからsameproof/fullstop/native/C1/S5/全UIdoneへ昇格0。

## 検査の限界と次工程

直接Python AST parse/compile(cache0/noexec) PASS。これが未定義sqlite3を検出しないことも明記する。作者報告のNode--check/isolatedstrictTS最終exit0はborrowedであり、今回Node/tsc/configloaderを起動していない。元SOURCEwhole3成功も既SOURCE段階borrowedで、native/test actualではない。

今回の不合格は新tooling import removalと残留診断枝の組合せによる **決定的静的コード欠陥**。actualcause/runtimefailureを推測したものではない。最小runner診断枝補正後、fullinverseとsyntax/sourcebindingを固定し独立再reviewできる。他scopeのSOURCE/Reporter/fork/guard/case/closure/capsを変更する理由にはしない。PASS修正後もRoot separatepublicprecheck→existing--preflight logical→ONE--supervise logicalを別採用するまでは起動0。

このNEWreviewだけwx600/O_EXCL/O_NOFOLLOW/fsync/actualFDclose/fullstableSHA固定。ALL reader/writer/runtime STOP。SOURCE/helpers/product/Manager/main/S5/P5d変更0。旧private全恒久NOOPS。
