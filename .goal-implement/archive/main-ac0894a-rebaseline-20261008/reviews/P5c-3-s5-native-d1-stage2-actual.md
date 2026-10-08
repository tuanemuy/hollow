# S5 native D1 stage2 actual: independent classification

**FAIL / held、原因 UNKNOWN**。D1 genuine predecessor 回復・第二CAS rollback・commit応答喪失→saved exact再読→consume ACK の正例は今回未成立。全S5-D/全goal未完。2026-10-06T11:05:34.383435+00:00 固定。Root ONE receipt は借用、公開 source topology/改行bytes は直接確認。Verifier actual/default/preflight/import/runtime/rootprobe/DB/native0、source/helper/Manager編集0、全private旧成功/失敗と新67a198c4は stat/read/hash/copy/import/reopen/reuse/replay/cleanup0。

## 入力

| 固定PUBLIC/SOURCE | bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-3-s5-native-d1-stage2-actual.md | 7804 | be511b89b658638ee62c49a97670d7d9ea37ea5b56c9b24ed5ca332a7ab8c70a |
| SOURCE721bc7ad native test | 20313 | c7fa880d5757135fa657792d058715c236edb54865a83205e87d545b2a8e08df |
| 上記sourceから抽出したownerProgram | 5416 | 11a6a78695fd71af0f1db029410024017e806e2d1739318a73b9e3949b5d0e9b |

phase/source は own UID/regular600/nonlink/nlink1/canonical/NOFOLLOW open・fstat前後・pathlstatのdev/ino/size/mode/mtime/ctime一致を伴うfullread/fullSHAを直接確認。programはString.rawの固定literalをmemory抽出しただけでeval/import/syntax再実行0。helper625d7356/config4a6e1d61の同一性・source1470/PUBLIC108/CF/Node事前確認・preflightPASSはRoot phase借用と直前[DS1静的PASS](P5c-3-s5-native-d1-stage-dfa-candidate.md)を継承。1470/dependency/helper全走査を再演せず、別C0/main/P5d/UI sourceには触れていない。

## Root借用actual safe範囲

一required case failed / nine正式skip、Reporter ready/result各1・sameIdentity true、hookStarts3/hookEnds1、errorsはAssertionError unknown1/Error unknown2、runReason interrupted。JSON passed0/failed1/pending9。afterAllはunobserved、inner/outer strictClosedGuard false、auditNULL、Node/Python1/heldtrue。

native owner attempts/handles1、pidKnown/birthMetadata/samePG true、自然originalExit1/signalNULL、originalChild close/stdinClose/両readerEOF-close/knownPIDabsent true、forcefalse。metadata ps1はactualexit0・EOF/FDclose・PIDabsence、forcedfalse。parent Worker0、native restoredtrue/observerFaultfalse。これらは**既知ownerとpsが終端した負例 receipt**で、owner.normal/native.normal false。正常before-ready/candidate/current/claim/finish/input closure/sameproof/ACKの成功ではない。parent object callback/fixture原clientclose・individualnativeFDの完了も補完しない。

stockfork ledgerはnormaltrue: 原stop requestedSIGTERM / exitNULL / signalSIGTERM / actualexit-close / PIDabsence / stdout-stderr EOF-close / disconnected+channelReleased。stdinFinishfalse、IPC EOF/FDNULLは欠測。outer Python/Node両PGabsence・両PIPEEOFと実FDclose・force0は独立停止根拠。aggregate testForkPID/PipeEOFはunobservedのまま、正常 business/auditに転用しない。

stageEnteredNULL / stageMarkerCount0 の意味は「complete valid stage marker を0件認識した」だけ。rawstderrが空、catch未到達、特定stageでthrow、特定ライブラリの実原因、DS1の再発のいずれも断定できない。既925 parser評価はfixednewline inputsの机上/純parser根拠であり、今回actual streamがそのinputだった証明ではない。

## source stage / catch topology

| 位置 | catchとの関係・示せる範囲 |
| --- | --- |
| 52–56行、Node CLI/eval module compile/link、4つのnode builtin静的import | async IIFE/catch作成より前。CLI flags/JS parse/module link/builtinimport failureならsourceのstagecatchは動かない。現fixed builtin paths/名前はsource上正規で、旧Node syntaxcheckPASSは借用。今回その経路で失敗した証拠は無い |
| 57行 let ownStage=ARGUMENTS と58行 async IIFE invocation | 初期stage代入とwrapper構築の前後が診断対象の境界。module起動前の失敗と、wrapper後の失敗をcount0だけでは区別できない |
| 59–70行 JSON.parse(process.argv[1]) / registerHooks | async callback内なので同期throwもrejected Promiseとなり末尾catch対象。引数shape/parse/hook登録の失敗は本来ARGUMENTS marker対象だが、今回それを観測していない |
| 71–78行 entry URL＋6 dynamic source imports / transitive resolver | SOURCE_IMPORTS代入後のawaitでcatch対象。動的sourceやtransitiveTSのruntime import未証明は保持するが、「source import failureだからcount0」は導けない。catch/writeが正常ならstage markerを出す構造 |
| 79–128行 client open / pragmas/container / factory / 2 claims / firstfinish / stop/FK/integrity/checkpoint / clientfinally/closed確認 | すべてwrappercatch対象。clientclose finally自身のthrowも同じcatchへ伝播。CLIENT_CLOSEは正常checkpoint後だけ代入し、earlyfailurefinallyではそのstageに更新しない。stageは最後entered groupでありcleanup entered/completedではない |
| 129–132行 READY / stdoutwrite / stdinresume / awaitstdin-end | catch対象。ただしafterREADYの失敗ならstageREADYが最後で、READYというenumだけで正常exit/closed-proofを証明しない |
| 133行 catch callback内の2 stderr writes / exitCode=1 | catch自体がthrowすれば同catchで再捕捉されない。元writeのthrow/async stream failure/flush未成立、partial/malformed/unterminated priorlineによるmatcher投影欠測は公開構造上の未区分候補。rawやerrorpropsを読まず、今回発生とは主張しない |

対照としてrequiredcaseはREADY待ちを先にassertし、後続の原stdin.end→actual child exit0/EOF-close→ownership acquire→2row/proof/rollback/unknown回復へ進む（test254–299以降）。今回casefailed/ready receipt無しを、その後の任意assert到達やproof生成成功へ読み替えない。3 reporter errorsの各実地点/primary-secondary因果は有限classだけでは未特定。

## 改行escapeの二段直接確認

String.raw template内のREADY、STAGE、OWNER_FAILURE各JS文字列は、ASCII backslash(0x5c) **1個** + n(0x6e)を持つ。source→String.rawでこの1escapeを保持し、eval programのJS string literal評価では通常newline U+000Aとなる。parent READY期待も通常TS stringliteralの1escape。二重backslashを入れてliteral backslash+nを出す過剰escapeは、c7fa880d/11a6a786 fixed bytesには存在しない。

従ってsource上の改行契約は整合。これは原writeが実際に成功/flushされた証拠ではなく、今回matcher0の原因を説明したことにもならない。静的構文checkだけでtransitive importを成功化しない。

## 次の最小情報増分案（未採用、actual0）

今回読み取ったsourceから決定的な起動欠陥/期待違いは確定しない。新rootで同じ1bit結果を再演する案は出さない。必要ならまず**helper-only、既DFA内部stateの診断projection**を別scopeで固定する:

- exact PUBLIC helpers/p5c-s5-test-config.mts の既owner DFAに、stagePrefixComplete / ownerFailureComplete / markerFault の3bounded booleanを保持・既finalledgerへprojection（既分岐で得た情報だけ、新raw/read/getter/errorproperty/namespace/reader/FD0）。SOURCE721/nativeTest/program/元stderr/API/privateproofは変更0。
- helpers/p5c-s5-test-runner.pyはそのexactkeys/type・safeprojectionとCONFIG_SHAだけを従属更新。flagsは診断のみ、owner.normal/native.normal/held/strict/copyaudit/成功判定へ使用0。ledger8192/control32768の計算を再固定、cap増加0。

情報増分はcount0でも「stage-prefixを認識したがinvalid」「既定failurelineを全文認識」「両方未認識」を区別すること。既定failureline認識があってもwholecallback/閉鎖/ACK成功ではなく、両方未認識もCLI failure確定ではない。SOURCE testにbootstrap markerを追加する/静的importをdynamicへ変える案は、このhelper-only増分を超えるため自動採用しない。Node fatalprefix生message探索やcatch/error handling変更も採用しない。

各改変は新PUBLIC候補・全文inverse/型/finite schemaの独立reviewとRoot採用を要する。本報告は改変・root予約・preflight・再実行を許可しない。旧9d230b41/今回67a198c4を含む全検証rootは永久NOOPSのまま。全S5-Dと全goal未完を保持。

wx600/fsync/actual writer close/postreadstablefullSHAを記録し、**ALL read STOP**。
