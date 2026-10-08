# TEXT-STOP1 fixed delta independent preflight

2026-10-06T06:24:24.800065+00:00。**限定static PASS**。runner-only補正でTEXT-STOP1を解消した。Root別ONE bounded-family実行判断へ返す。実閉鎖・旧UI abort原因・UI正常完了／native private proofの受入は今回未成立。

公開phase27242B/61e58c54、runner101102B/0b01819b、同driver92014B/8b03f66aをcanonical/regular600/nonlink/nlink1・NOFOLLOW全文SHA・前後devino/size/mtime/ctime安定で直接確認。select import／known ownership・send branch／execute cleanup・receipt差をメモリ逆適用した96395B全文はb7803995に直接一致し、phase今回prefix除去後22401B全文はf4485b2dに直接一致した。Python AST/compileのみ直接PASS、helper評価／defaultpreflight0。

Popen(start_new_session=True)直後に元returned PIDと同known PGを登録し、PIPE nonblocking／selector準備より先に保持する。準備・監視例外はfinite MONITOR_HELDへ入り、finallyで同process.waitとnegative known kill0三値を別に取得する。leader poll終了はPG不在へ読み替えず、PGalive/unknownには元known PGだけTERM/KILL可能。ESRCHを実観測したownershipはabsent tombstoneを保持し、それ以後の同番号へのsignalを行わない。EPERM/otherはunknown、syscall成功はactual exitとは別fieldのまま。

cleanupは既stop_started（なければfinally入口）を使用し、deadline=min(overallStart+240, tailStart+30)。TERM→10秒後KILL→残PIPE drainのshared30を新たに延長しない。selector準備失敗でも元2PIPEをselectで有限drainし、EOFはzero-length actual read後だけtrue、未観測はnull。original wait return／leaderExited、PGabsence、各EOF、各actual pipe.close、control actualclose、signal attempted/outcome/forcedを独立に記録する。閉鎖／wait／stopの例外や未知はheldとし、finally closeをEOFへ代用しない。異常停止の実発生・旧rootに残processがあったとの推論は0。

正常predicateは元case2／Worker12保存・Node0／knownPGabsent／2EOF＋FDclose／controlFDclose／force0を保持し、元wait実returnも明示する。driver全文不変更のため、source-bound single pending window、native-publication start後という限界、closure-based live2 permit、actualWorker exit＋両endcloseだけのpermit返却、terminatePromise/streamError/admissionRelease未観測、private proof/UI合成0は前limited PASS範囲を継承する。新scenario／source criterionは追加しない。

packed261232B/3138d5f8・source25/deps1094/packages27/aliases41/projection1・mainb6/同source1457/currentB anchors、既UI/parser helpers不変更は前review＋固定担当報告を継承し、再scanしない。materialは222300B≤256KiBへ収まり、49frames×512B/control25088≤32KiB/summary4096・case40/body180/preflight30/outer240/200ms/root192MiB/TMP8MiB/log2MiBを維持する。bounded-family-passでもterminationSettlement/admissionRelease/streamErrorはnull、normalCompleteTerminationReceipt/nativeProofAccepted/uiAccepted/dbAuditはfalseのまま。

次はstandalone public metadata/fullhash precheck→`.goal-implement/helpers/p5c-ui-text-boundary-runner.py` のargv空default preflight→Root別ONE `--run`判断。fresh f71a408d/派生toolTMPはメモリliteralのみ。今回実driver/Node/Worker/defaultpreflight/rootprobe/生成/DB/browser/network0、全private旧新成功失敗root stat/read/hash/import/copy0、source/helper/Manager編集0。当reviewのみ固定し全対象readを停止した。

---

# TEXT-BOUNDARY1 independent candidate preflight

2026-10-06T06:15:27.591280+00:00。**限定static FAIL（TEXT-STOP1）**。候補helper2のWorker観測／有限bindingは下記範囲で成立するが、known Nodeの異常停止回収が不足する。Root別ONE actualの前にrunner-only最小補正が必要。実発生・旧UI abort原因は未観測であり、UI正常完了／native proof受入にはしない。

## TEXT-STOP1: actual spawn以後の全出口でknown Nodeを回収する

runner `execute():205–207` はoriginal Popenの後にset_blocking／selector登録を行う。ここや監視中の未処理OSError等で例外退出すると、finallyはrawPIPE/control FDを閉じるだけで、spawn済みknown Nodeへの有限TERM/KILL・actualwait・PGabsence確認をしない。mainはPREFLIGHT_OR_TOOL_HELDを返せるが、子Nodeが残る可能性を解消していない。FD close要求はprocess/Worker実終了の代用にならない。

`send_owned():177–182` はleader poll終了ならnegative PGへのsignalを省略する。loopもleader exit後のPG状態を最終判定で読むだけなので、PGalive/unknownを正常にしない点は保つ一方、known PGaliveの有限回収がない。必要最小はPopen直後から元known PID/PGを保持し、準備・監視例外を含む全出口を共有期限内のactualwait／negative kill0三値／known PG TERM10→KILL10→PIPE10・両EOF/actual FD closeへ収束させること。unknown/EPERMや閉鎖欠測はheldを維持し、signal syscall成功をactual終了へ代用しない。対象は自分のknown PID/PGのみで、探索や新portは不要。driver/source/mainの変更は要求しない。

## 直接確認と固定binding

公開phase22401B/f4485b2d、runner96395B/b7803995、driver92014B/8b03f66aをcanonical/regular600/nonlink/nlink1・NOFOLLOW全文SHA・前後devino/size/mtime/ctime安定で直接確認した。Python AST/compileのみ直接PASS、Node --checkは担当固定報告を借用。driver/runnerの同packed bindingをデータとして展開し、261232B/3138d5f8（上限262144）・source25/110307B、deps1094/5657429B・packages27・links41、projection1/849919Bを直接照合した。packedはhelperコードへimport/evalしていない。

current main HEAD b6e567b2/tree fa7f4fb7がbindingと一致し、listed source25全文がmain公開sourceに直接一致する。runtimeはmain ref/headと全1457 sourceを検査するため、main変更には依存する。readonly currentB source1457/hash f1d7・build c686・output58e3/releasefc2aの成立は既受入と担当報告を借用し、今回B/source/dist実物を再読していない。runtime/dependency alias・package type・relative missing .ts fallbackは固定packed集合へ限定し、unknown .node/dlopen/非同期Module.registerを拒否する。

PUBLIC既UIrunner b8641bf5、parser loader e663cd15/runner4cd4473c、UI bootbf12/providerbcb1/browser006e/purecd78/stop157fの同全文SHAを直接確認。phaseの今回prefixを除いた15536B全文はac2e34baに直接一致した。新helper2は新規なので旧bodyの逆適用は存在せず、既helperの変更はない。

## Worker観測とclaimsの限界

stock Worker/module export identityを保持し、source import前にoriginal diagnostics_channel worker_threadsをsubscribeする。各invokeはclosure-based permitを先に予約し、single pending creation windowだけからpublic原handleを登録する。manifest-bound sourceは各detect/extract/projectにnew Worker1個で、importsのWorker生成は0。native publicationはstart後なので、これはpre-start permission gateやbirth以前の実閉鎖証拠ではない。予期しない／欠けたoriginal handleはheldとし、fake event/handle/brand0。

登録数12/live2は未closedのownership countであり、native JS同時実行の証明ではない。permitはactual Worker exit＋stdout/stderr両実end・close後にだけ返す。caller結果とは別にclosedを待ち、creation不能／結果拒否／未知資源時のpermitを推測解放しない。case2はdetect4/extract4/projectEmpty2/projectBody2のfamily保存を要求する。入力は各1024Bの正規UI text、original sanitizer/projectionを通すが、DB/auth/upload/job-runnerを実行・模倣しない。

terminate wrapper/call追加0、terminationObserved=false/terminationSettlement=null、stream error新handler0/streamErrorObserved=null、production admissionReleaseObserved=nullを維持する。parserのsource成功結果はそのsource自身の終了条件を使うが、driverのexit観測をterminate Promise/private proofへ昇格しない。projectionの既source caller/stdio gap・元UI Node-6原因は独立のまま未解決。bounded-family-passはnormalCompleteTerminationReceipt/nativeProofAccepted/uiAccepted/dbAuditの全部falseと明記され、wholeUI U0–7や本番timingを合格にしない。

## CLI・有限caps・次判断

runner `main():266–271` にdefault preflight（argv空）とONE `--run`が実在する。両者とも先にpublic source/helper bindingを確認するが、今回は呼んでいない。修正後の順はstandalone public metadata/hash precheck→canonical Pythonで同runner default preflight→Root別ONE `--run`判断。Nodecanonical24.15 actual execPath/versionはsource import前のgateで、今回は実値未観測。

material217593B≤256KiB、packed261232B≤262144、frame各512B／49frames／25088B≤32KiB・summary4096Bを直接確認。raw stdout/stderrは有限2MiBでdiscard countのみ、stderrは固定3prefixのmatcher状態だけで、rawmessage/path/body/SQL/ID/proofを出力しない。source32MiB/artifact208MiB、root192MiB/TMP8MiB・Node1/Python1/business fork-child-DB-browser-network0、case40/body180/preflight30/outer240・200ms監視を保つ。正常はcase2＋registered/closed12＋family保存＋Node0/PGabsent/2rawPIPEEOF・actual FDclose/control actualclose/force0を要求し、観測欠測は正常補完しない。

実driver/helper import/defaultpreflight/Worker/runtime/test/DB/browser/network/newroot probe/生成0、全private旧新成功失敗root stat/read/hash/import/copy0、source/helper/Manager編集0。当reviewのみwx600で固定し全対象readを停止した。


## TEXT-STARTUP2 — 独立candidate比例preflight

**限定PASS（actual/default preflightは未実行）**。確認日時 2026-10-06T06:55:39.021038+00:00。Root採用3差、fresh literalと従属hashだけを独立照合した。前段9,885 B / SHA256 `fe42e56ec3d19adb28e1bedc226c9a821eb9f51497ed844f2be20ff65ff674d4` は全文prefix保持。本追補固定後、全対象read STOP。

| 公開候補 | bytes | SHA256 |
| --- | --- | --- |
| `helpers/p5c-ui-text-boundary.mjs` | 94,136 | `d4213966681f2f30ff2cf556e06e99b6b5ea7bf283900da8fef73e6ce8a13e86` |
| `helpers/p5c-ui-text-boundary-runner.py` | 105,852 | `d4f797da4284eaccec2002f36b22fcf28e90baf129685716c56db11d4c02916a` |
| `phases/P5c-ui-text-startup-proposal.md` | 44,532 | `55a31b136cd7d3994cdc24e694c581c263119c68ca93006c4680d40fdac4e642` |

全候補のregular600/nonlink/nlink1/UID/canonical、NOFOLLOW全文読取前後のdev/ino/size/mtime/ctime/fullSHAを直接確認し、固定直前も再確認した。公開proposalの全7driver/8runner hunksを**メモリ内だけ**で逆適用し、driver92,014 B / `8b03f66a8dbad567f9a91064f0f416d98bb727427bc834e333b4dd2f7e738ce6` とrunner101,102 B / `0b01819b3e55d203a7f4dcd8678791154ccc91b9b7661fe328c9bec6a3fc266d` の全文hash一致を直接得た。proposal末尾12,790 B / `20597d02e51c4cb210cd70b35649071058e2f0236d5f88dbe01efe05f3be01d2` 保持も直接確認。Python AST/compileは実行せず直接PASS、Node syntax-only PASSは主報告を借用した。

### 変更3点の判定

1. **realpathSync exact alias — PASS。** 両helperのpacked binding全文は同値、展開261,232 B / hash3138d5f8を直接確認。固定source25/deps1094/artifact1のcanonical files1120、既dirs252、verified aliases41から同じ規則でMapを独立再構成し、exact1,363 entries / sorted compact SHA256 `687c52aa504f82fc048610bbd52cf3dd448687e73f66f02da07922f87248c637` 一致を得た。runtimeはMap.hasによる完全一致で、子孫prefix一般許可ではない。通常fs.realpathSyncに限り、非DB suffix／exact mapped pathで捕捉元関数を同this/同args/optionsで1回呼び、元throwを保持、元string結果がexact canonical target同値の場合だけ返す。違う結果/typeは既persistent held＋SCOPE。`.native` は以前のcanonical-only branch、他read/stat/access/openも以前のread setのまま。write/watch/enumeration、native addon、network/DNS/child/async loader/self-signalの許可追加0。
2. **既faultへの有限context — PASS。** startupPhaseはhelper制御位置、family/reason/scopeは既guardの有限label。readでは既normalized pathとfrozen Mapだけを参照し、mutation/blocked portはargsを読まずscope:null。任意getter/error/message/path/SQL/ID/proof取得なし。runnerはevent/code/contextとcontext4keysをexact検査、各固定enum又はnullだけ、最大4件。unknown key/valueを拒否する。holdは先にstate.held=true、frame失敗もheld、denialは以前どおりSCOPEをthrowし、finished/normal gateの `!held` / faults0を変えていない。診断をcause証明・native proof・正常closeへ昇格しない。
3. **固定b6 archive source guard — PASS。** PUBLIC/.git/HEAD・refs/main・現在main1457 working source loopを、固定b6のarchive manifest-listed set guardへ置換する採用差。candidate/tree/source keyset/blob-mode/SHA/count、build前後sourceSHA、embedded outputs SHA、7key release相互SHAを保持する。列挙archive1457のstable600/nonlink/nlink1/fullSHA＋memory Gitblob検査を全loopし、唯一AGENTS→CLAUDE内部linkとGit755 provision.sh actual600の例外を正確に扱う。source32MiBと30秒deadlineを維持。未知physical entry不在を証明するwalkはなく、返却receiptもsourceSet:'manifest-listed'／mainSourceRead:false／mainHeadRead:falseとしてその限界を明記する。

### 限定archive metadataの直接照合

Root採用CURRENT B c18a6f02の**public metadata3fileだけ**をNOFOLLOW stable600全文hashで照合した。source/dist本文・ログ/TMP/key/proof/DB・unknown entriesは読んでいない。

- source-manifest 322,233 B / `f1d7f33945f0977de5b1615639b8f96e6b15ded2207600d90ccd97adf78255b0`。列挙1457・20,986,203 B、logical100644×1455/100755×1/120000×1、keyset5c7a48ffとmode/blob-set1b8d0f28を直接再構成した。
- build-manifest 82,459 B / `c68604ccfb684efacc33603287e2bfca2192e1ce0f308f30630db285cf384d54`。candidate `b6e567b24e24c78e26bb1bbb147bdf0fc6588bd3` / tree `fa7f4fb746268b7d6ada09ff3264e73800634310`、root/cwd/dist、source-before/after/counts一致。embedded output492・23,202,712 B / canonical65,210 B / `58e3f66aa09d4a3a3503037133b67a41d87505d06c8defd4b037a118bc90283f` をメモリで確認した。492実distfile読取0。
- release421 B / `fc2a38fab7b652a2a09102aade8fb981f058c1501612382d83075bab7aa71818`。正式7keys、b6 candidate、上記3SHA edgesとsource/artifact countsが一致。

候補defaultpreflightのarchive1457／登録public deps全loop自体は実行0で、全physical source set／実import成立の新観測はない。toolのPUBLIC cwd/helper/node_modules anchorsは以前のtool/public依存のidentityで、現在main product sourceを読むbindingではない。main HEAD79efへのrebindやmain freeze要求は不要。新mainへの統合受入と、この固定b6 fixture scopeを混同しない。

### 不変更と次gate

完全逆差分の一致に加え、outer Popen supervisor ASTは追加safe-summary context1fieldを除いて前TEXT-STOP1と同値。早期known PID/PG所有、leaderexitとPGabsence別、TERM10/KILL10/PIPE10 sharedtail30/overall240、actualwait/PG/2EOF(actual又はnull)/FDclose/forceの独立性を保持する。Worker observer／creation permit／実exit/end-close／source invokeは変更hunksの対象外。Worker12/live2、source creationの単一unregistered window、native publicationはAPI開始後でpermission先行証明にならない、terminate wrapper0・terminationPromise/新streamError/admissionRelease観測nullを以前の制約として維持する。

最長fault167 Bは固定enumから直接再計算した。全frame最大181 B／final safe max1768 Bは主静的計算借用。49frames×512=25,088 B、control32KiB、summary4096、material229,172 B≤256KiB、source32/artifact208/root192/TMP8/log2/case40/body180/outer240は不変更。新memory literal92c5d8e1と派生tool-tmpは候補内一致、存在probe/create0。

次はRootの別採用で、候補固定・独立source/helper precheck→公開runnerのdefault argv[] preflight→両PASS時だけ同runner `--run` ONEの順。CLI main()がpreflightを先に呼び、argv[]ならreceiptだけ返し、--run時だけexecuteへ進むことを直接確認した。このレビューではそのどちらも起動していない。

旧f71その他全privateへの操作0、actual cause/siteはUNK2026-10-06T06:55:39.021038+00:00Nのまま。新root probe/create、runtime/import/DB/browser/Worker起動、source/helper/backend/Manager文書変更、goal/spec/spec-implement/追加agent0。限定static PASSをnormal UI・R03寿命全条件・native proof/ACKへ転用しない。旧失敗原因の遡及確定0。全対象read停止、ONE actualはRoot判断へ返す。


## TEXT-STARTUP2 ONE actual — 公開safe receiptの独立局所assessment

**局所PASS（bounded fixture familyのみ）**。確認日時 2026-10-06T07:03:17.325716+00:00。公開startup report49,749 B / SHA256 `53d7b1d3e69ca9b3c50d679960b1e8bbe9e2c034cea07d48670fa6bb7b43b336` をregular600/nonlink/nlink1/canonical/UID・NOFOLLOW stable全文hashで確認し、旧44,532 B / `55a31b136cd7d3994cdc24e694c581c263119c68ca93006c4680d40fdac4e642` prefix完全保持を直接確認した。driver94,136/d4213966とrunner105,852/d4f797daも直接stable fullSHA一致、前candidate preflightの受入対象と同値。本review旧17,153 B / 63bab83f prefixを保持した。

### 借用actualと直接静的照合

standalone public helper/source1457/Gitblob/deps precheck PASS→argv[] defaultpreflight PASS（root/runtime/main read0）→canonical Python --run ONE exit0の実行結果は主報告を借用する。Verifierの実行／defaultpreflight／B source/dist追加読取／main HEAD・source読取は0。成功92c5d8e1/toolTMPを含む全private rootのstat/read/hash/DB/control/log/proof操作は0。

| 項目 | 公開safe actual（借用） | 固定helperへの独立対応 |
| --- | --- | --- |
| family/case | parser pair4＋mixed pair8の2cases passed、registered12/closed12、maxLive2、DETECT4/EXTRACT4/PROJECT_EMPTY2/PROJECT_BODY2 | 正常finishedはstarts＝registered＝closedの固定4/4/2/2、同case順/4+8を要求。旧未知register/API windowの補完なし。 |
| Worker lifetime | zero exit4/one exit8/unknown0、caller-return-before-closure0 | 各recordは元Workerのactual exitとstdout/stderr各end＋closeが揃ってからclosedとtool permit releaseへ進む。fixed sourceのrecord/event拘束と一致。 |
| diagnostic/cap | faults/contexts/fatalPrefixes空、fault null、40frames/3545 B、raw183 B discarded | header1＋api-start12＋registered12＋closed12＋case2＋finished1＝40。既49frame/25,088 B/512 B cap内。raw本文やdiscarded出力を復元していない。 |
| outer native closure | Node0、actualwait・knownPGabsence true、raw2PIPEのactual EOF/FDclose true、regular controlFDclose true、force false、signal4slot全not-attempted | normalはcode0/actualwait/PGabsence/両EOF/両FDclose/finished/fault0/force0に独立control-closeを要求。leaderexitだけ／finallyだけでabsence・EOF・closeを補完しない。 |

公開JSONの有限fields/countsを直接照合し、borrowed actualと固定normal predicateの不整合は確認しなかった。case passed・正常finishedを個別raw Worker/stream/promiseの監督receiptへ増幅しない。旧TEXT-STOP1の有限早期回収、alias exact-map／archive-only source guard／context持続heldのcandidate静的PASSを継承する。

### 証拠の限界と残条件

- Workerのpublic Readable end/closeは個別OS FDの直接証明ではない。外Node raw PIPE EOF/FDcloseとWorker stream終端を別に扱う。
- native constructor publicationはAPI/native開始後のobserverで、pre-creation permissionの証明ではない。maxLive2とtool permit releaseはこの保守的driverの観測で、production admission releaseやそのタイミングではない。
- parser exit1八件は、固定sourceの元Parser terminate caller semanticsと正常gated結果の対応を借用する。個別terminate Promiseは捕捉しておらず、terminationSettlement null／terminationObserved falseを保持する。新stream error handler観測・admissionReleaseObservedもnull。通常resource error／timeout／cancelの全対をこのONEへ補完しない。
- regular controlはPIPEではないためcontrolEofObserved null。DBaudit false、uiAccepted false、nativeProofAccepted false、normalCompleteTerminationReceipt falseを保持する。normal fixtureだけでprivate proof／ACK・R03全寿命条件・製品UI全体を合格にしない。
- 固定3fatal prefixがこのlive drainで検出されなかった事実に限る。raw183 Bやprefix空から、旧UI Node-6原因の除外、f71 guard/siteの原因確定、全fatal条件不在を導かない。旧cause/siteはUNK2026-10-06T07:03:17.325716+00:00Nのまま、失敗root再操作0。

結論: Rootが採用した固定b6 archiveのtext/parser/projection局所familyの正常ONE根拠として受入可能。新main79ef／S5／Drive通常UI等の完成根拠は別scope。再実行や追加probeは不要で、次の製品判断へ返す。source/helper/Manager文書編集、runtime/root probe/create、goal/spec/spec-implement/追加agent0。本reportの固定hash後、全対象read STOP。
