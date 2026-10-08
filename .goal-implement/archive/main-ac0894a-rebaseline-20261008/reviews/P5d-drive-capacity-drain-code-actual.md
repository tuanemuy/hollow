# CA67 DRAIN-CODE1 ONE actual — limited independent classification

判定: FAIL / held 維持。Root固定safe receiptから first-sticky sourceFault=uow-bound / checkpoint=drain67 を借用する。公開producerとの対応は既診断delta直接reviewから確認し、元 ++unitOfWorkCalls>768 拒否枝への到達を支持する。実最終count、失敗したpage、各保存・読戻し・ACKの実進行、失敗の原因全体は確定しない。予算の再計算は旧CA67本体作者として別planへ分離する。新candidateや正常gate修正・実行は未採用。

固定日時: 2026-10-06T11:58:00+00:00

## 入力・根拠の区分

直接 fullstable 読取: .goal-implement/phases/P5d-drive-capacity-drain-code-actual.md、3,938 B / SHA256 b558c47846ed0d7e2a960e4301fde0f90cb2b15621642399d75390d6401b1c97。canonical regular0600/selfUID/nlink1、O_NOFOLLOW、前後 dev/ino/mode/UID/nlink/size/mtime/ctime 同値、元readFD actual close。raw結果/private/stdoutbufferを取り直していない。

Root実施 PUBLIC precheck SOURCE98・HEADe55b08cbb691835736c8e14392ee025b1eaba99a/parentabdac900e012d4e93550ed905f8ecee3b300ac8a・public108/CF/pinnedNodeGit PASS、既default exit0全文 {preflight:true,executed:false,database:0,newRoot:0}、ONE --execute の観測は Root報告を借用。私による再実行・default/rootprobeは0。

公開producer/decoderの直接静的reviewは .goal-implement/reviews/P5d-drive-capacity-drain-code-candidate.md 10,379 B / SHA256 acd77c845b424d4f1374c2c65697d1a16a56bda003f2e26c88bb98b6e75040d5。今回この根拠を借用し、旧CA67本体の独立静的受入は前Verifier9e5a1f85の根拠を借用する。私は旧CA67本体作者であり、その本体を独立再受入しない。

## safe receipt の分類

| 借用した実値 | 結論と限界 |
| --- | --- |
| soleCA67 failed / checkpoint drain67 / sourceFault uow-bound | fixture:305–309 の ++unitOfWorkCalls>768 guard記録を支持。first-sticky8enumのうちこの拒否枝が記録された。最終実countを769等へ補完せず、新予算expectedへ実数コピーしない |
| Error / nativeCode none / statementIndex NULL | 元throwの分類。message/stack/SQL/innerpredicate未取得、driver/root/native原因の断定0 |
| Node1 / Python1 / elapsed2781ms | normal実行0。失敗から全必要所要時間・TTL原因を推定しない |
| no TERM/no KILL / ownPGabsent / leaderabsent | Root outerの自己knownPG/leader観測を借用。正常fixture/全owner/nativeproofや個別forkFDの代用ではない |
| outer stdoutEOFtrue/stderrEOFtrue/pipeHandlesClosedtrue | 異常回収側の実終了根拠。normalPipeCloseReceipt NULL を四正常flag成功で補完しない |
| beforeAll/afterAll Started/Ended true | 公式hook観測。normal fixture-closed/全owner.closed/checkpoint検査・DBphysicalcloseの証拠ではない |
| summaryokfalse/completed[]/forks1/forksActualClosedtrue/Worker0/deniedfalse | tool側有限summaryを借用。個別fork exitcode/signal/IPC/streamFDは出力されず、正常closureへ追加推論0 |
| audits NULL / heldtrue | readonly/query_only/FK/integrity/sourcecounts audit未到達。copy/reopen/auditして不足を回復しない |

drain67はtest:182で入った進行labelであり、三page25/25/17と末尾pendingreadを含む。sourceFaultは fixture private変数の最初の記録である。どのpage/whichsave/whichread/どのUoW呼出が上限を跨いだか、このlabelとenumだけから識別しない。後続resumption68/1drain/matchedpruneの実成功は未証明。

## 次判断と STOP

元 nominal701/cap768 の設計は、今回正常全経路に対してguard拒否を生じさせた。実countを期待へ写さず、SOURCE callgraphから正常begin68/ACK68/pages25,25,17,1/prune68/version69・maintenance/current認可・assert/stopの各runを再計数し、保守upper/headroomを別planで提案する。product/ports/guard/業務assert修正をこの工具拒否から導かない。

新a79ce408及びderivedTMP、全旧成功/失敗privateは永久NOOPS: stat/read/hash/import/copy/reopen/replay/cleanup0。rawmessage/SQL/ID/key/proof/body/results/cacheログ0。今回newreview一pathを排他0600作成し、自身fullstable全文SHA/FD閉鎖を固定。分類reviewのreader/writerはここでSTOP。次budget作業はPUBLIC SOURCEの別計数のみで、runtime/default/probe/helper/source editsは0。spec/spec-implement/Manager/main/S5/UI変更0。
