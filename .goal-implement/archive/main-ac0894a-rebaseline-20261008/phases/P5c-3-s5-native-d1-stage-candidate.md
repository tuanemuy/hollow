# S5 native D1：owner progress stage 候補

2026-10-06T10:38:51+00:00 固定。SOURCE commit `721bc7ad2741b673db9b2ab22023b7071e283212`、親 `c13759984c18b4f01825da93d4a9962844372aef`。変更は既nativeTest inline ownerProgramの段階記録、既configの元stderr passive DFA、既runnerの診断schema/binding、Root採用memory-only D1 literalのみ。whole typecheck→lint:fix→format 全0。実 test / default / preflight / Node source import / native / DB / root probe / create は0。過去actual原因UNKNOWNを維持し、今回もD1成功・proof・ACK・閉鎖成功を宣言しない。

## exact metadata

| 対象 | bytes | SHA-256 |
| --- | ---: | --- |
| packages/core/src/adapters/node/regeneration/__tests__/machineRegenerationNative.integration.test.ts | 20313 | c7fa880d5757135fa657792d058715c236edb54865a83205e87d545b2a8e08df |
| .goal-implement/helpers/p5c-s5-test-runner.py | 291003 | 231765441732c8174a3f1bf398274010d654536a8c2014760e06e580035debc3 |
| .goal-implement/helpers/p5c-s5-test-config.mts | 392163 | ff65dbd9db8a21d42685fa251fab500bffe7b9e9ec90830bf20a9d580329ca06 |

SOURCEは `/Users/hikaru/github.com/tuanemuy/hollow-p5c-machine-79ef126-20261006`。唯一source差は表のnativeTest、Gitblob `f95c957628bcc28871f89f88e419295533589be4`。親blob `6a915ba8808bb5e9e807740bb092c34751879e9c` / 19932B / `74e1199efd2dd1c81eb3dd9e508d901e890b06f9448f11934a9d92383b9fc400`。outside差0、tracked clean。1470 SOURCE全stable regular/UID/nlink/canonical/hash/bytes照合PASS、1469regularのGit644→600/唯一Git755→700、AGENTS soleinternal trackedlink維持。

- SOURCE_FILES pair JSON SHA `e0acba6ac74f47e8191e06f28a818e35aa86398cae136893dd3b631461408988`。
- [path,Gitmode,bytes,SHA] shape SHA `42f06ec06fb95756718434ca5fa508338da8e22f9ace71b161c2195081a8adb2`。
- config full manifest JSON SHA `495a4e1739ff439417ea7bf3dc3e0fc41b09b3762b4f82d0200ded289829ec91`、1470entries / 21274202B。
- PUBLIC108links / package metadata108 原fixedbinding PASS。links compactJSON SHA `fbe1e9fd3f763835fc0c2eef9eb25552a505c01e3ed11c2b472026e27e0acdec`。extra dependency / install / download0。
- CF declaration原986B / `1803d60aa0818e5a3a7630807466ffaae8fdeb0fd85b7fa59431638fc5a479fa`維持、再生成0。

## SOURCE 診断の意味

`ownStage` は直近main progress stage。enumは ARGUMENTS / SOURCE_IMPORTS / CLIENT_OPEN / PRAGMAS_CONTAINER / REGENERATION_FACTORY / FIRST_CLAIM / FIRST_FINISH / SECOND_CLAIM / STOP_CHECKS / CLIENT_CLOSE / READY の11個。

宣言は元async IIFEより前、ARGUMENTSから始め、元各statement groupの前で更新。FIRST_CLAIM/SECOND_CLAIMは元options.jobs.entriesのindexで選び、元claim/current/receipt/lease操作は変えない。FIRST_FINISHは元genuine finish/finishInput/consumedの前。CLIENT_CLOSEは正常checkpoint通過直後、元finallyの直前でのみmarkし、早い失敗に伴うcleanup finallyでstageを上書きしない。従ってstageは実throw地点でもcleanup close entered/completed証拠でもない。

元catchはerror引数/propsを読まず、`S5_D1_STAGE:<registered enum>\n` を元stderrへ一回、その後元 `S5_D1_OWNER_FAILURE\n` とexitCode1を維持。stdout READY、元READY predicate、original this/args/options/handle/Promise、同genuine proof、閉鎖assert、CAS rollback / reply-loss / ACK順序、case/body/time全て不変更。eval programのbytesは381B増えた事実をsource hashへ反映した。argv個数5・順序・flags・DTO/位置/stdioは不変更だが、program arg全文は変更したためargv全bytes同値とは主張しない。parse failure / abrupt exit / catch外例外は段階欠測のまま。

元nativeTestの新stage行とcatchの新marker呼出だけを逆適用し、親test全文へ完全一致した。native HTML/Markdown2とD1元test/fixture/proof/assert/finallyを含むそれ以外の全本文は親と同値。新case0。

## 既 stderr passive DFA

元known child.stderrへdata/end/close observerを追加するのみ。元count-limit65536 / consumer / resume / stdio / argv / streamを変更せず、newFD / reader / frame0。原Bufferを変更しない。

保持stateは固定prefix index、enum候補bitmask（11bit）、整数stage index、discardLine / markerFaultのbool。既11constant enum以外の文字列、rawline/suffix/任意error/DTO/SQL/path/ID/body/proofを保持・出力しない。行頭からexactprefixとenum/newlineが一致した完了markerだけを認識。任意他stderr行・元OWNER_FAILURE行はdiscardし、その本文を保存しない。completeprefix後の未知enum、partial marker、重複markerはstageNULL。部分prefix/enumがstream end又はcloseに残ればNULLへ落とす。marker countは0..2へ飽和、2は重複の診断UNKNOWNであり再実行許可ではない。

新owner fieldsは `stageEntered: nullable exact11enum` と `stageMarkerCount: integer0..2`。stage非NULLはcount1の場合だけ、NULL/count1はpartial/invalidによる欠測を許す。count2は必ずNULL。runner exactkeys/type/enum/countの厳格decodeも同じ。既owner.normal/native.normal/held/strict/audit gateはこの診断に依存しない。

## record / cap

既config ledger()とrunner native receipt readerは **8192B**。旧review案の512Bはnative ledgerの誤記であり訂正しただけ、cap拡張0。node execPath/version binding receiptの512Bは独立に維持した。

native recordの保守最大：2worker row（各actualExit/terminateResolved255、全boolの長いfalse、index1）、owner全部の長いfalse/nullablefalse/exit255/signalsSIGTERM、version1/group native-d1、stageREGENERATION_FACTORY/count2をcompactJSONにした静的字数1189B。実valid schemaではstage/count2を同時に許さず、この組合せも文字数上界に含めた保守値。旧同shape1130Bとの差59B、1189<8192。既outer control32768B/rawNodePIPE2MiB、record cap、frame個数は不変更。元node-owner早期frameに新fieldはなく、native diagnosticを既final safeledgerに載せるのみ。追加stderr marker最大33B、元stdout/READY bytes不変更。

## family / roots / limits

native-d1 は required1 / 正式skip9 / total10、owner business1 + exact-known-PID metadata ps1 / unused originallease2 / scoped nativeWorker0。旧closed0/unclosed50MiB / private record3 / prematureACK拒否 / 第二CASfalse rollback / commit-response-loss / exactread→consume ACK対は不変更、actual未実証のまま。

新D1 suffix `p5c-s5-native-d1-stage2-67a198c4` はRoot採用memory予約。runner FAMILIESとconfig rootsのnative-d1各1 literalだけを変更。pure / app / native / app-c suffixは全て不変更かつ旧成功/held全root永久NONOP。newrootも未probe・未作成、実行不可。

root192MiB / logicalDB3最大4合算80MiB（native32 / opaque8 / audit8）/ originals8 / TMP8 / cache16 / records8MiB / entries8192 / body430+sharedclosure50=outer480 / group180 / case40 / guard200ms / TMP inner128+outer128 / 原normalcheckpointとstrictallPG-EOF-FD→bothsidecar0→normalcopyauditは既契約同値。未観測stage/nativecap/physicalcloseをnormalへ補完しない。本文追加codec0、app-C登録/期待counts/元全family body不変更。

## checks と全文 inverse

SOURCE変更後required順 whole typecheck0→lint:fix0→format0。raw出力discard。Python AST/compile-in-memory0(no pycache)、ownerProgram `Node --input-type=module --check` 0、config pinned24.18 `--experimental-transform-types --check` 0、isolated public tsgo `--ignoreConfig --noEmit --target esnext --module nodenext --moduleResolution nodenext --skipLibCheck --types node` 0。source import / Vitest / default / preflight / runtimeは0。

config inverseは stage enum/type/fieldsとDFA observer block除去、D1 literal復元、nativeTest manifest1rowのblob/bytes/SHA復元だけ。390161B / `6b1f414dbc694fc0f5f669f20d89c268ec198e942a5d06316d6e1a04f86524fb` の元全文へ一致。

runner inverseは stage enum/schema1追加除去、D1 literal復元、SOURCE_FILES/SIZES唯一nativeTest row / CANDIDATE親 / CONFIG_SHA親を復元だけ。290461B / `db87311aa7caa58d7d802d6a9427c27ad5b1b5aed50024e7701280fb05dff753` 元全文へ一致。new CONFIG_SHAは新config fullSHAと一致。helper/current source exact files regular600/nlink1/ownUID/nonlink/canonical/open前後stable全SHAを確認。

候補固定で全SOURCE/git/helper/report read/write STOP。通常DB/job proposalおよびUI helpersはwriterSTOP維持。main/P5d/Manager文書/全product/ports/DDL編集0。全旧actual/private rootsはstat/read/hash/import/copy/reopen/replay/cleanup0。実actual原因UNKNOWN、次oneactualは独立candidatePASS→Root soleprecheck→既preflight→別ONE採用後のみ。
