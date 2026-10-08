# CA67 UOW1024 candidate — 独立比例 preflight PASS

2026-10-06。対象 controlled P5d SOURCE `55ef3b226babeb6269654c66dbe0198eae35d366`、exact parent `e55b08cbb691835736c8e14392ee025b1eaba99a`。今回上限2literalとPUBLIC runner bindingsの変更には参加していない。Verifierはparent DRAIN-CODE1 diagnosticの作者であるため、parent意味の独立性を自分の作者確認から新主張せず、Root既独立review採用を借用し、今回deltaのみ独立照合した。

**今回deltaのSOURCE/tooling gateはPASS。** Rootの別PUBLIC precheck→既default全文inspection→ONE有限actual採用判断に進める。今回actual/default/preflight/rootprobe/test/DB/nativeは0。cap変更によってCA67機能成功、native proof、wholeP5d A–Hは完成にしない。

## 個別判定

| 項目 | 判定 | 直接根拠／借用範囲 |
| --- | --- | --- |
| SOURCE exact2 literal | PASS direct | fixture `if (++unitOfWorkCalls > 768)`→1024とtest `toBeLessThanOrEqual(768)`→1024だけ。各newliteral一箇所。逆適用でparent全文byte同値 |
| 有限counter境界 | PASS direct | 原++/比較/failedflag/firststicky uow-bound/同Error throw/元originalRun(fn) returnを維持。count1024まで元delegate、1025で原拒否。counter reset/observer success化/normalgate変更0 |
| SOURCE-derived予算 | PASS（Root算出借用＋算術direct） | normal837 / conservative905 / cap1024。upperに119、normalに187の余裕。旧complete計数の不足136を修正した公開callgraphが採用根拠。actual769等を新expectedとして使用しない。各method/statement12288は別counterで不変更 |
| 新runner bindings | PASS direct | ROOT basename1、loader filename1、MANIFEST_SHA1、report filename1、sectionheading2だけ。全逆適用でparent runner25619/721216…全文一致 |
| loader/nativeguard/正常閉鎖gate | PASS direct equality | newloader全byteはparent DRAIN loaderと同値。stockfork/cacheFsfalse/receiverargs/元Promise/IPC/stdio/PG三値/EOFと独立FDflags/normal audit前提を変更しない。parent guard意味は既Root reviewを借用 |
| source98とout-of-scope | PASS direct | named98全stable SHA/mode/Gitblob、pair/shape exact。同HEAD/parentのGitdiff exact2のみ、other96とextra9のHEAD blob不変更。extra9の今回working mode/SHAは作者報告借用で新再read0 |
| 依存/CF/wholechecks | PASS reported / 借用 | PUBLIC108/83/CF/shims前後同値、typecheck→lint:fix→format各exit0とdiffcheck0は最終候補作者の固定報告。Verifierが再check/依存walkした事実へ補完0 |
| fresh literal・資源・期待 | PASS direct inverse | c49be037はmemory-only、未probe。DB1/root192MiB/client12288/case40/body180/outer240/200ms/normalaudit expectedcounts/40frame512等はbinding外全byte同値。旧root読取を条件にしない |

正常837はsetup account/browser2+initialconnection1+storage recoverWrites1+68×(confirmation1+begin2+complete6+closedRow1)680+capacity/pending4+maintenance6+drain142+finalconnection1。905は単一catch second-settle最大68を加えた保守上限で、異常branchを正常結果に含めない。実counter/UoW/SQL数・ACK/receipt・timingは未観測である。count上限変更はfinite拒否を維持し、native/businessguardを緩めない。

repoの元await-result observerとnativeACK/client/Tx/UoWの原handle・Promise identityを混同しない。今回originalRun(fn)をそのままreturnするwrapperは透明で、cap2literal以外のobserver/afterCommit/短絡/APIはparentと全byte一致。旧diagnostic firststicky enum8+NULLのnormal拒否意味も不変更。

## 固定file・独立検査

PUBLIC phase `P5d-drive-capacity-uow-candidate.md`:32036 B / SHA256 `8ec8337c6c48a786d217bc62c408d75aa6ddc6cf628ea86ccf7215bcade60570`。

- newrunner:25589 B / `780b3e4b058adf52001374ca1dccddeea1135408c853499bf1a85b82ed7b355a`。
- newloader:24711 B / `9af650917c662a7d9c053972a85de49ca6bff61b7fb2eedbac38160f86adc21a`。

3fileのcanonical/regular600/nonlink/selfUID/nlink1・NOFOLLOW FD/path dev/inode/mode/UID/nlink/size/mtime/ctime前後同値・全文SHAを直接確認。新PythonはAST/compileのみ独立実施し、helper import/eval/pycache/CLI実行0。loader構文check成功は作者借用、今回全byte同値を直接確認した。

SOURCE fixture19552 B / `80320af03ed963e4e5fa693fdfcc8b3e09b7e4e74c3ce1a9b6c1f0a193c88256` / blob `4b8352a4a7bb766319c73131f3a4df72986fa5eb`、test8165 B / `6dd839dd6591edccfd5e53f33f8e11a8dafc92cc91008bd3a421d8a939d5c2dd` / blob `e39856061c35347f67961706d8e3406b46b6add2`。new1024を元768へ一箇所逆適用してparent Git bodyと全文一致。

source98/1912325 B のtable全rowをdirectfullread。pairはsorted path+' '+SHA+'newline'の `efd211b21f761a6a42ee0c4fe06a26724d6e26593b13fa417bb99276fce028d6`。shapeはsorted[path,bytes,SHA,actualModeString,HEADblob]compactJSONの `d1b75d84d7c8926a2017490bd39d5236c78ae5cbdd0799e2d73b11702b2f01a0`。別serializationのhashを同じ文字列に揃えない。

採用PUBLIC budgetplan14126 B / `c53b500df209fc1dcbd171e0726fabd4a5a78ef8cf20363ac6348c0a760387b6`の全文stable/hashと計数算術を直接確認した。補足9sourceの全callgraph再計数はRoot採用根拠借用であり、今回元budgetの作者検証を独立actualcounterにしない。PUBLIC108/83/CFの固定報告と正式例外drizzle package一つ192KiB・他82各32KiBは既採用scopeとして扱い、今回新例外を作らない。

## 局所限界・次の入口・停止

Root directPUBLIC candidate/hash/source98/必要補足依存/固定metadata precheck→新runner既default全stdoutのpreflight:true/executed:false/database0/newRoot0をinspect→別ONE --execute、の既順序案を保持する。Rootが新literalのfresh条件をその採用scope内で確認するまで、Verifierはexistenceprobeも行わない。旧DRAIN actualのuow-bound以外の位置/最終count/ページはUNKNOWNのまま、今回上限変更から過去全原因を同定しない。

準備CA67件数/25,25,17,1/ACK68/prune68/version69を不変にした候補であり、genuine normalreceipt保存/read/consume/endWrite、nativeHTTPpositive、実capacity/正常audit、legacy/unknown/allcopies/browserは今回未検証。unknown/non0/forced/guardfailならheld/audit0/旧root再操作0の原gateを保つ。

全旧success/failure/generated/private root/TMP/key/DB/proof/results/log/cacheは恒久NOOPS。新rootもmemory-only/stat-read-hash-create0。source/product/helper/Manager変更0、default/preflight/runtime/import/test/DB/native/rootprobe0。この新reviewだけwx600固定しALL reader STOP。
