# P5c-3-S2 / F1 独立再検証

2026-10-01。固定候補 `2a03fe592f8a11b25caefdc838fef9e0bb8ab9c6`、F1基点 `d0af7c24e945958a9f944a33d79b33d4ba418179`、S2基点 `8902b48bca04ade91696e851bb3b5df707348665`。独立Verifierによる静的レビューと限定直接実行。製品/test/管理正本変更0。Manager採用のF2で停止返却し、S2 A–E全体は未受入。独立59対成功、closure先頭1対失敗、別診断は準備失敗。DB/nativeは未着手。

## 1. 基準と静的照合

AGENTS/CLAUDE、brief/design/plan の S2-A–E、採用S2計画/M1・M2、F1 fix-planを使用した。goal-implementの独立Verifierとして実装者の成功通知と独立根拠を分離した。spec/spec-implement/goal APIは使用していない。

主fix報告は97行/11,714B SHA256 `8f44d19e1d534224706c945b218d1ae7c86142e6fcf3488c0c124a16769f63e8`、採用fix-planは97行/12,499B SHA256 `02d95d6b6ecace77b72a73163c76dc308e12db6581421745957279c01445da59`を全文EOFまで確認。旧S2報告の137対を今回候補の独立実行数へ加算しない。

F1差分は6pathだけ。application/regeneration/services.ts・memory.ts、adapters/node/regeneration/memory.ts、同input.test.ts、application/regeneration/memory.test.ts、libsql/__tests__/regenerationInputAdmission.integration.test.ts。0043/既DDL/通常worker/DI/UIは不変更。4操作 reserveBegin/bindBegin/commitBegin/holdBegin はDB前の同consumer排他を作り、未bindだけ返却、bound以降はunknownとして保持する。reserveは同期に二重予約と全2枠を検査し、bindはconsumer/runtime/token/generation一致、commitは同期にlocal entryへ引継ぎ、UoW失敗時holdは原例外を保つ。finish/proof消費経路は不変更。静的に追加の製品不整合は検出していない。

旧F1は「旧finishのDB確定応答不明→未消費proofあり→次beginがDB世代を先に進める→旧proof再照合不能」。現在の純対はreserveをUoW前に置くことでこの交差を拒否し、制御対では旧finishの同値再照合後だけ次世代を許す。並行begin、CAS false、保存済/未保存のcommit不明、偽handle/二重bind/未知保持/枠返却も確認した。ただし新DB上の正規repository3対は今回未実行であり、F1全体解消受入は保留する。新unknown-beginの回復操作は提供されず、bound保持を回復済みとしない。S3残である。

S2不変更部分は前レビューのsourceHeld全入口（active/unknown/closed未caller又は未ACK）、共有data/control枠、sourceACK確定前証拠保持、各wire直前current、consumed限定stage保存、S1 Drive→redacted限定と旧値保持の照合を借用。F1差分に伴うDB前admissionの影響は今回純59へ含めた。未接続の通常runner/DI/UI/本文採用/Google/PDF-machine/RSSを受入へ追加しない。

## 2. F2: 現候補のclosure根拠が成立していない

主にS2-E、S2-Dのclosure根拠未確定。`packages/core/src/adapters/node/llm/sourcePreparer.test.ts:650` の `mockImplementationOnce(() => worker as unknown as Worker)` は現在candidateに存在する。製品 `sourcePreparer.ts:206` は `new Worker`、同:216のconstructor catchは `LLM_SOURCE_INVALID`/not-sent/closedを返す。現在の直接closure-01は同test:690の「failureがまだ呼ばれていない」assertで失敗した。messageだけでは成功しない点の最初の前提で止まり、残10対の成立は得られていない。

主S2正式報告:56は「textpure-01/02でframe690→constructibleでないarrowをfunctionへ修正→textpure-03で11/11」と記載するが、現在candidateの上記sourceと対応しない。S2基点→candidateの公開git差にもarrowがあり、F1の6pathにはこのtestを含まない。過去の成功を現在の11対成功へ読み替えない。

主旧tests.mjsと今回tests.mjsはVitestのconfig:false、forks、worker1、fileParallelism:false、cache:false、tsconfigPaths、bail1、同closure testNamePatternが一致。主10秒→今回純2秒、群期限/有限診断の差はあるが、今回約0.56秒の先行failureの説明にはならない。Biome公開schemaのuseArrowFunctionはfunction expressionをarrowへ変える規則で、repoはrecommended:true・lint:fixがbiome check --write。後続lintが復帰させた可能性はあるが、実行時差分の証拠がないため因果未確定。

Root追加許可の診断1対は独立root内 `prep-smoke.test.mjs` にarrow onceのconstruct/実prepare分類とconstructible制御を定義した。実Workerへ到達しないmockを使用。しかしdiagnostic-01はTEST_PREP_FAILEDでテスト準備段階に停止し、case有限値を得ていない。個別準備原因・arrowの当該実行時例外種別は未確定。この診断を原因確定/製品不具合/成功対として数えない。再実行0。

必要最小修正は主担当によるconstructible mockの固定と、最終規定checks後の同candidateでclosure11を再確認すること。製品終了処理の欠陥とは断定しない。判定条件やworker終了要件を弱めず、closure群自体を独立helperで成功へ置換しない。

## 3. ID別判定

| ID | 今回の根拠・判定 | 残り |
| --- | --- | --- |
| S2-A | F1静的整合、純memory16等直接成功。新証拠保持/世代の純反例は解消方向を確認。全体受入保留 | 正式0043移行1（success/rollback3）、旧app7、F1app3の独立DB確認 |
| S2-B | 共有sourceHeld/ACK経路不変更の静的照合、backupExecution20/source17直接成功。全体受入保留 | 正規DB/nativeで相互枠/ACK・未知保持を直接確認 |
| S2-C | 各wire current/取得検証不変更の静的照合、source17直接成功。全体受入保留 | 新candidateのnative13/24自己HTTP、返却0と実終了 |
| S2-D | Node input6＋application memory16直接成功、F1純交差は解消方向。F2でclosure根拠未確定 | constructible fixtureと最終checks後closure11、DB/native・実textworker4 |
| S2-E | F2により不合格/差戻し。製品不変更、候補前後指紋・資源実終了は成功 | 主最小修正と固定候補の必要比例再確認。checks成功とclosure現在成功を同一候補へ結ぶ |

## 4. 独立実行と借用

予定direct94＝pure59＋closure11＋migration1＋旧app7＋F1app3＋native13。実行順は純→closure→F1app→migration→旧app→nativeを採用。F1app afterAllのroot DB16MiB条件を守るため、他DB前とした。実際はclosureで停止し、すべてのDB/nativeは0。

| label | 結果 | 直接範囲 |
| --- | --- | --- |
| pure-01 | 59/59、fail/skip/error/suiteError0、ctx.close true | node/regeneration/input.test.ts 6、application/regeneration/memory.test.ts 16、source.test.ts 17、node/drive/backupExecution.test.ts 20 |
| closure-01 | 対象11の先頭1失敗、残10未完。全列60/他49明示除外、errors/suiteErrors0、ctx.close true | sourcePreparer.test.ts のLLM text input closureのみ。frame690 AssertionError、stage0/closed=falseはDB終了証明ではない |
| diagnostic-01 | TEST_PREP_FAILED、成功対0、個別原因未確定 | Root追加のDB/HTTP/実workerなし1case。再試行0 |

未変更借用予定56はdomain47＋adapters/node/drive/sourceProvider.test.ts 9。F1はdomain/sourceProviderを変えず、取得のwire/close契約を変えないため借用可能範囲とした。主fixの純22と今回59は重複し、加算しない。主規定type04/lint03/format02は主実行の借用であり独立再実行0。主DB3/旧app7/移行1/native13は報告根拠として読んだが、今回の未着手を独立成功へ振り替えない。主closure11はF2により現在候補の根拠として保留。

旧S2のtype06終端欠測、app01個別原因未確定、app02明示DBclose欠測、afterAll報告転送時false、native保守wire計数と実測の差を補完しない。S1は不変更範囲だけ借用、今回再実行0。

## 5. 資源・実終了・保全

新排他root `/Users/hikaru/.local/share/hollow/verification/p5c3-s2-fix-independent-20261001-R3w80V`、mode0700。採用上限224MiB/8logicalDB160MiB/helper-log8MiB/TMP8MiB/local4MiB/material256KiB。実績はDB0/HTTP0/実textworker0/原本0/鍵0/native0/外部0。最終metadata実量3,490,104B・regular20、link/special0、TMP/local0。before/afterの容量walker標本であり、全I/O時点のhard上限実証ではない。失敗結果を保存し上書き/削除/再利用0。

| label | 専用PID=PGID | 終了 | elapsed ms |
| --- | --- | --- | --- |
| seal-01 | 10635 | exit0 | 17484 |
| pure-01 | 53105 | exit0 | 1110 |
| closure-01 | 53219 | exit1 | 558 |
| diagnostic-01 | 55513 | exit1 | 542 |
| seal-02 | 56235 | exit0 | 16949 |

全5群はdedicated/actualExit/childClose/stdoutEnd/stderrEnd/groupGone=true、deadline/interrupted/SIGINT/SIGTERM/exitSignal=false、supervisorコマンド実終了。DBがないためdriver closeを成功と称さない。ctx.closeと実子/pipe/groupを区分した。未知PID/広域ps/kill0。通常runtime/ブラウザなし、保全copy/auditは範囲外で0。

## 6. 公開指紋・候補固定

開始/終了HEAD同一、tracked clean。前後sealのsource/dist同値、F1基点からexact6path。sealは公開sourceだけをhashし、DBhash/秘密hash0。build0、旧bundleはS2/F1未搭載でUI根拠にしない。

| 集合 | count / bytes | SHA256 |
| --- | --- | --- |
| candidate source | 1448 / 20,794,805 | a2d5bae3e039919255dea9a66eba7225d4d0842356adf46eb4b228d6a7db5bf1 |
| F1基点source | 1447 / 20,768,071 | 40ea6b08205bbbc6948279808c963e0f37bbc1242da85d8210a023abd8c0b238 |
| 旧DDL/journal不変 | 89 / 8,299,749 | a80ba3c298df718e94ce274df3595d5c74ec9d657bc0750f0a133bba12c76ef8 |
| lock不変 | 1 / 328,991 | 037740a80c95f580b0287c63a072862a0ba646a79133a0d30f048dc1b2bc5131 |
| dist不変 | 9116 / 223,796,694 | 4f1bc6cf7df2198c4628fbdfd898b42f4707f0cd054594b1c22606f841ed40c6 |
| server.node.js | 1 / 3,732,860 | e159ac0c3aadc6206cc0ca8f60af06a75b4154ae163652ff010e88a534edb519 |
| nodeShutdown.mjs | 1 / 757 | 2de9a259cd47304c93dfe7a8086d9642e9def0ed55a5bd2401d99ffd69cd940c |

## 7. 公開helper exact表

入力は主fixroot c88DXw の正式allowlist5本だけをregular/non-symlink/bytes/fullSHA一致→自身全文EOF後に新rootへapply_patch適応した。入力SHAはrun-v2 `356d85f7d9006c5200c31098ac79ae8c21ee5c00f5230a15f01c0af838e47857`、tests `bf04974dc8fe87f7e547a7f10db0b8411e3198f408b44199157992d0e0aae9f6`、inspect `c973ac2d69056adad8305eb2dfa0fc7a9212baf0f4106d52a5b7bd67a79474be`、seal `892f4eee9b107e2de6495ad2d335c4bc0445de623c958b87456e78173ebc9659`、smoke `128fe5f6bcb23a63760c6a5e38a84412a21a3723191be87892a53a6c48c81a56`。旧場所run/import/DB/results/private追跡0。

変更は上限区分/local bucket、native群600秒、sealの6path/前後candidate一致へ限定。smokeは末尾改行差のみ、未実行。旧main5YFWqT tests.mjs 4555B/SHA `061157d3e598af2e00ae5c6ac95747c2222a10ecd34a5ecafd9d47fe282f763d` は許可済み公開同一性と全文EOFを確認し、設定比較のread-onlyだけに用いた。以下は現root直下の公開sourceのみ。失敗診断helperは成功済工具と扱わず、再利用には別判断を要する。

| basename | bytes | SHA256 |
| --- | --- | --- |
| run-v2.cjs | 7704 | 595a487a0a390ddaee0469eee13322fb65c5d66c0f0ec94c3c42276cee37a48d |
| tests.mjs | 4887 | 22a52105521af30b55028c3148524906e6cc1da48730b5f54f0c365d0ddc3bba |
| inspect.cjs | 4620 | c973ac2d69056adad8305eb2dfa0fc7a9212baf0f4106d52a5b7bd67a79474be |
| seal.cjs | 3975 | 6473c437756170f93dedba862e223af5b177872e076dba17b193e144c46da64d |
| smoke.test.mjs | 156 | 3b34529e28d10385c5ef047eaa6453005d5b8ca31576b582186f13aa034dec9b |
| prep-smoke.test.mjs | 3067 | 13af0b85482ee98e3c8d7e59d6d106a271355bff475f580ff5fbacb53d13cd54 |

以上を固定し、追加run/DB/native/製品変更なしで全操作停止・所有返却する。F2を解決する主修正と再固定後の独立最小残検証はManagerの別委譲を待つ。
