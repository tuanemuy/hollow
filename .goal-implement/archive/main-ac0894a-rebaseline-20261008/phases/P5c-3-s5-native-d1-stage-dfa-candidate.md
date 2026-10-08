# S5 native D1：DS1 最小DFA補正候補

判定：独立review7285B/7f17f0fe のDS1へ、既configのfixedpattern DFAだけを補正。SOURCE `721bc7ad2741b673db9b2ab22023b7071e283212`、nativeTest・元proof/CAS/READY/normal gates・全family/capsは無変更。runnerはCONFIG_SHA唯一literal従属更新のみ。実actual原因UNKNOWN。元candidate8748B/e6b6c497は固定のまま。

| exact PUBLIC helper | bytes | SHA-256 |
| --- | ---: | --- |
| .goal-implement/helpers/p5c-s5-test-config.mts | 392626 | 4a6e1d619d08e0fd045142f686e9e38be6a21c0199ef2fe1075cfbe5c01cda8d |
| .goal-implement/helpers/p5c-s5-test-runner.py | 291003 | 625d735653e766dc0188be4d96410bfdac331c31c4aae5a102ef80a8a750e8e9 |

全文stable NOFOLLOW / ownUID / regular600 / nonlink / nlink1 / canonicalを確認。new CONFIG_SHAは新config全文SHAと一致。

## exact deltaと意味

元stage prefix `S5_D1_STAGE:` に、元catchが既に書く第二exactpattern `S5_D1_OWNER_FAILURE\n` を追加。固定candidate bitmask2bitとprefix indexで双方を判別し、第二patternは改行まで全文一致した場合だけignoreする。共有prefix途中の未知nonnewline mismatchもpersistent markerFault + stageNULLへ落とす。prefixIndex0の無関係stderr行は元discardを維持する。

completeprefix後は既11enum candidate maskでのみ認識。未知enum/partial newline/EOF-close/unknownpartialprefix/duplicateはpersistentNULL。新markerの完了countは0..2飽和、count2はNULL。正しい元failurelineはstage/countを変えないが、元failurelineの部分一致・EOFはUNKNOWNのまま。raw buffer / retained suffix / arbitrary strings / error props / message / SQL / ID / path / proof0、stream/consumer/limit65536/this/args/元handles/result0変更、新FD/reader/frame0。

stageは直近main progressであり、実throw地点/cleanupclose/能力/permission/ACK/normal closure証明ではない。診断fieldsはstageEntered(nullable11enum)/stageMarkerCount(0..2)のまま、schema/owner.normal/native.normal/held/CAS/readonlyaudit/genuineproofを変更しない。新function resetPrefixでparser有限stateだけを戻し、persistent markerFaultは戻さない。

## 有限SOURCE-derived DFA評価

既configから固定pattern/prelude・scan callback本文・finishStageだけを抽出し、型注記を除いたdata-only parser関数として有限入力を評価した。実helper/module/Vitest/sourceをimportせず、イベント/handle/brand/nativeproof/DB/ownerを生成しない。元callback演算・分岐本文をそのまま使用。既公開Nodeのisolated純parser評価であり、application/runtimeの実行や閉鎖証拠ではない。

| 固定入力対 | 期待 stage/count | 結果 |
| --- | --- | --- |
| valid FIRST_CLAIM + exact元OWNER_FAILURE | FIRST_CLAIM / 1 | PASS |
| valid + partial prefix `S5_D1_STAX...` newline | NULL / 1 | PASS |
| complete prefix + UNKNOWN enum | NULL / 0 | PASS |
| duplicate valid marker | NULL / 2 | PASS |
| valid + partial prefix EOF / newline | NULL / 1 | PASS |
| valid + partial OWNER_FAILURE EOF | NULL / 1 | PASS |
| ordinary stderr + valid + exact OWNER_FAILURE | FIRST_CLAIM / 1 | PASS |
| 3 valid markers | NULL / 2飽和 | PASS |
| 11各enum + exact元OWNER_FAILURE | 各enum / 1 | 全PASS |

20固定vectors、whole chunk / byte-by-byte / 全1split位置の925評価で同じstage/count、end→close相当のfinish2回も同値。新testcase追加やnative event合成ではない。pastactualの欠測を回復しない。

## inverse / checks / limits

config新DFA blockを直前旧DFA blockへ1回逆置換し、392163B / `ff65dbd9db8a21d42685fa251fab500bffe7b9e9ec90830bf20a9d580329ca06` 全文一致。その他manifest1470/source唯一row/program/hash/root/108links/CF/Reporter/全family/current app-C登録/normal条件は旧全文のまま。

runnerのCONFIG_SHA新→旧1回だけで291003B / `231765441732c8174a3f1bf398274010d654536a8c2014760e06e580035debc3` 全文一致。C/ROOT/source pair/shape/native owner schemaは差0。

Python AST/compile-in-memory0(no cache)、pinned24.18 config `--experimental-transform-types --check` 0、isolated public tsgo noEmit/nodenext/skipLibCheck/types node0。SOURCE/wholechecksは変更無しで既PASS借用し再演0。純parser評価925のexit0はDFAだけの根拠。

native ledger既8192B、保守最大1189B、別node binding512B、outer control32768、SOURCE readonlyconfig1MiB/privatecopy0/material256KiB、root192/DB80/430+50outer480/guard200ms/TMP128inner+128outerを変更しない。new fixedpatterns/indexはcallback内部の有限memoryだけ。required native-D1 one / formal skips9 / businessowner1 / ps1 / nativeWorker0 / lease2は元準備対のまま。

freshsuffix `p5c-s5-native-d1-stage2-67a198c4` はmemory-only binding維持、probe/create/default/preflight/actual0。旧全部private/root/DB/proof/source/outputは永久NONOP。新normalfixture補正planは12913B/2c42db31でwriter/readSTOP、UIhelper/main/S5product/P5d/Manager文書は編集0。

本報告固定で全helper/SOURCE/git/report READ/WRITE STOP。独立deltaPASS後にRoot soleprecheck→既preflight→ONEを別採用するまで実行不可。
