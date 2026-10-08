# S5 native D1-stage candidate 独立レビュー

判定: **FAIL（診断 DFA 一分岐の補正待ち）**。実行 gate のみのレビューであり、S5-D の機能受入は行わない。全対象の読取を本報告固定後 STOP。runtime / import / default / preflight / root probe / actual / DB / native / build は 0。全旧 private および検証 root は stat / read / hash / copy / import / reuse / cleanup 0。製品・helper・Manager 正本編集 0。

確認時刻: 2026-10-06T10:48:41.668495+00:00。候補 SOURCE `721bc7ad2741b673db9b2ab22023b7071e283212`、親 `c13759984c18b4f01825da93d4a9962844372aef`。HEAD・outside 差分・whole checks の実施結果は主報告の借用。以下の本文・manifest・逆置換・有限ファイル同一性は独立直接確認。

## 固定入力

| PUBLIC 入力 | bytes | SHA-256 |
| --- | ---: | --- |
| phases/P5c-3-s5-native-d1-stage-candidate.md | 8748 | e6b6c497de6b08034eface9437aa23df58d53b94a9431ea13c853a83e3f87d56 |
| helpers/p5c-s5-test-runner.py | 291003 | 231765441732c8174a3f1bf398274010d654536a8c2014760e06e580035debc3 |
| helpers/p5c-s5-test-config.mts | 392163 | ff65dbd9db8a21d42685fa251fab500bffe7b9e9ec90830bf20a9d580329ca06 |

各入力は own UID、regular 0600、nonlink、nlink1、canonical、NOFOLLOW open / fstat 前後 / path lstat の identity・mtime・ctime・size 一致と全 SHA を確認した。Python AST / memory compile は独立 PASS（評価・import・pycache 作成 0）。TypeScript・owner program の既 syntax/type checks は主報告借用、runtime import 成功ではない。

## 各項目

| 項目 | 判定 | 直接根拠 |
| --- | --- | --- |
| SOURCE と program 差分 | PASS | native test 20313B / c7fa880d5757135fa657792d058715c236edb54865a83205e87d545b2a8e08df。stage 宣言・代入・catch marker だけを逆置換し親 19932B / 74e1199efd2dd1c81eb3dd9e508d901e890b06f9448f11934a9d92383b9fc400 と全文一致。ownerProgram は 5416B / 11a6a78695fd71af0f1db029410024017e806e2d1739318a73b9e3949b5d0e9b。program 引数自体は変更、argv 個数・順序・flags・DTO・stdio は親から維持。 |
| helper 逆置換 | PASS | config の stage enum/type/fields/DFA、native row、D1 root を戻すと 390161B / 6b1f414dbc694fc0f5f669f20d89c268ec198e942a5d06316d6e1a04f86524fb。runner の schema/enum、SOURCE_FILES/SIZES の唯一 row、candidate/configSHA、D1 root を戻すと 290461B / db87311aa7caa58d7d802d6a9427c27ad5b1b5aed50024e7701280fb05dff753。旧 suffix は Root/作者 memory 回答 `p5c-s5-d1-9d230b41` を使用し、旧 root を探索せず再現。 |
| SOURCE1470 / CF | PASS | manifest 列挙の 1470 regular、21,274,202B のみを有限読取し、全 SHA・Git blob・UID・nlink・600/唯一700・canonical・stable FD を確認。別 AGENTS は唯一 `CLAUDE.md` 内部 link を確認。pair compact SHA e0acba6ac74f47e8191e06f28a818e35aa86398cae136893dd3b631461408988、shape SHA 42f06ec06fb95756718434ca5fa508338da8e22f9ace71b161c2195081a8adb2、config manifest SHA 495a4e1739ff439417ea7bf3dc3e0fc41b09b3762b4f82d0200ded289829ec91。CF は SOURCE 内 986B / 1803d60aa0818e5a3a7630807466ffaae8fdeb0fd85b7fa59431638fc5a479fa を同 stable 条件で確認。未知 entry walk / CF 生成 0。 |
| PUBLIC108 不変更 | PASS | config/runner の 108 links は同一表、各 canonical target の link と登録 108 package metadata（679698B）の stable fullhash を確認。config 全文逆置換で links/packageMetadata 行も親から無変更。compact links SHA は fbe1e9fd3f763835fc0c2eef9eb25552a505c01e3ed11c2b472026e27e0acdec。旧 dc5905f9… の exact serialization は今回特定していないが、actual 表・依存追加の差ではないことは全文逆置換で確定。旧 hash への書換 0。 |
| enum・projection・上限 | PASS | stage は 11 fixed enum、marker 最大33B。runner は exact owner keys、nullable enum、count int0..2、nonNULL は count1 のみ、count2 は NULL を要求。native ledger の既8192Bと node-binding の独立512Bは維持。保守 record1189B の主計算は借用、診断追加は当該既8192B内、既32KiB control/frames/resource上限の変更無しを逆置換で確認。 |
| partial prefix の曖昧性排除 | **FAIL: DS1** | 下記因果列。 |
| original finally / normal gates / private proof | PASS（静的） | stage は原処理群の直前、正常 checkpoint 後だけ CLIENT_CLOSE を設定。原 client.close finally / ready predicate / input proof / CAS / consume ACK を親逆置換で保持。stage/count は owner.normal・native.normal を成功化しない。reporter/file pass、same actual handles・PID/PG・actual exit/stdio EOF-close、restoration、Node bindings、normal strict/sidecar/copy/query-only audit の既 gate を維持。 |

## DS1: partial prefix の非改行 mismatch が valid stage を残す

固定 config 198–220行の机上状態遷移を確認した。まず `S5_D1_STAGE:FIRST_CLAIM\n` を受けると stageEntered=FIRST_CLAIM / count1。続けて `S5_D1_STAX...\n` を受けると、prefix の途中まで一致した後、206行の非改行 mismatch は invalidateStage() を呼ばず discardLine に入る。改行後も以前の FIRST_CLAIM / count1 が残る。採用契約「partial marker は NULL」と矛盾し、失敗箇所を一意に示すように見える診断を返し得る。

対照として complete prefix 後の未知 enum、partial prefix 後の改行、partial prefix の EOF/close、重複 valid marker は NULL。count は 0..2 に飽和し、正常判定には転用されない。actual で当該分岐が発生した証拠は無く、旧失敗原因は UNKNOWN のまま。

補正には既定 `S5_D1_OWNER_FAILURE\n` との共通 prefix を区別する必要がある。Root 採用の次 scope は、この第二 exact fixed pattern を bounded DFA で全文認識して無視し、その他の partial prefix / complete-prefix 未知 enum / duplicates を persistent markerFault + NULL へ落とす最小補正。通常の無関係 stderr 行は discard、raw buffer / message / error property 読取 / 新 admission / 新 frame を追加しない。単純に prefixIndex!==0 の全 mismatch を無条件 invalidation すると元 OWNER_FAILURE 行まで NULL 化するため、その案だけでは不十分。

## 未検証・返却条件

Native D1 required1 / formal skip9、owner business1 + known-PID metadata ps1、Worker0、closed0 / unclosed50MiB、record3、第二 CAS rollback / reply-loss / exact saved read→consume ACK は元 source の準備された対を維持しただけで、今回 actual 未実施。stage は最後の entered group であり、その predicate pass、exact throw、cleanup 開始/完了、正常閉鎖、proof 発行、permission を示さない。parse failure / abrupt exit / catch 外例外は stage 欠測。

fresh `p5c-s5-native-d1-stage2-67a198c4` は memory binding のみで、probe/作成/起動 0。他 family root と全 private は非操作。DS1 修正候補の独立 delta 再確認後に Root が sole precheck→既 preflight→ONE を別採用する必要がある。全 goal/S5 は未完。追加 runtime は本レビューで許可しない。

本ファイル固定・全 SHA 記録後、ALL read STOP。
