# S5 native D1 stage DS1 minimal DFA correction

**Static tooling PASS**。DS1（partial prefix の非改行 mismatch が旧 valid stage を残す）を解消した限定 delta。S5-D/機能/実行成功の受入ではない。2026-10-06T10:58:05.073010+00:00 に固定。全対象 reader/writer STOP、runtime/import/default/preflight/rootprobe/actual/DB/native/build0、全新旧 private/root は stat/read/hash/copy/import/reopen/reuse/cleanup0。source/helper/Manager正本編集0。

## 固定対象と直接照合

| 入力 | bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-3-s5-native-d1-stage-dfa-candidate.md | 5190 | 71a7a07559415ff6e8897b033cd1ca31bc50c90f685c89caea00035b09908492 |
| helpers/p5c-s5-test-config.mts | 392626 | 4a6e1d619d08e0fd045142f686e9e38be6a21c0199ef2fe1075cfbe5c01cda8d |
| helpers/p5c-s5-test-runner.py | 291003 | 625d735653e766dc0188be4d96410bfdac331c31c4aae5a102ef80a8a750e8e9 |

各入力の fullread/fullSHA・ownUID・canonical・regular0600/nonlink/nlink1・NOFOLLOW FD/path前後の dev/ino/size/mode/mtime/ctime 一致を直接確認。Python AST/compile-in-memoryは直接PASS、対象評価/import/pycache0。TypeScript syntax/type0および20vectors/925chunking評価の実施は主報告借用。Verifierは Node/純parserを実行せず、下記の固定分岐を机上確認した。

configの198–225行の parser blockだけを直前の旧blockへ1回戻すと、392163B / ff65dbd9db8a21d42685fa251fab500bffe7b9e9ec90830bf20a9d580329ca06 に全bytes一致。runnerのCONFIG_SHA定数1件を戻すと、291003B / 231765441732c8174a3f1bf398274010d654536a8c2014760e06e580035debc3 に全bytes一致。旧 helper/private/root を読むことなく、前回直接読取の旧blockを有限memory逆置換した。new CONFIG_SHAとnew config全文SHAは同値。

## DS1 と机上確認

| 入力/固定分岐 | stage / count | 判定 |
| --- | --- | --- |
| valid FIRST_CLAIM marker → exact既定OWNER_FAILURE newline | FIRST_CLAIM / 1 | PASS。第二pattern候補が全文改行まで一致した場合だけ resetPrefix、markerFault/count/stageを変更しない |
| valid → partial `S5_D1_STAX...` → newline | NULL / 1 | PASS。nextPrefix0かつprefixIndex非0でpersistent invalidateし、その行はdiscard |
| valid → OWNER_FAILUREの部分一致 → EOF/close | NULL / 1 | PASS。finishStageがprefixIndex非0を検出。第二patternの全体一致前はignoreしない |
| complete stage-prefix → 未知enum | NULL / 0（前valid有りなら1） | PASS。enum bitmask0をpersistent faultへ落とす |
| partial prefix → newline / EOF | NULL / existing count | PASS。mismatch又はfinishStageで同一invalidate。end後closeを二度呼んでもstage復活無し |
| valid → duplicate valid / third valid | NULL / 2飽和 | PASS。完了marker数は飽和、count2でpersistent fault。以降validでも復活無し |
| prefixIndex0の無関係stderr行 → valid → exactOWNER_FAILURE | valid enum / 1 | PASS。第一byteから両fixedpatternに不一致なら元discard。任意rawlineを保持しない |
| partial/unknown fault → 後続valid | NULL / 完了count | PASS。resetPrefixはparser index/maskだけを戻し、markerFaultを戻さない |

stagePrefixとownerFailureの候補maskは2bit、enum maskは既11bit。既pattern同士の共有prefix後の非改行mismatchもpersistent NULLとなる。第二exactpattern `S5_D1_OWNER_FAILURE\n` は元sourceが出す既定行であり、任意failure文言や任意stderrへの例外ではない。sourcecatch/marker順/原stderr consumer/65536制限/Buffer内容/handle/stdioは変更0。新FD/reader/control frame0、raw suffix/message/error props/path/SQL/ID/body/proofを保存・出力しない。

## 継承範囲と限界

SOURCE721bc7ad、test20313B/c7fa880d・ownerProgram5416B/11a6a786、SOURCE1470・PUBLIC108・CF、他family/rootと private ownership/proof/CAS/ACK/body/finally/READY は config全文逆置換で差0。前回独立レビュー7285B/7f17f0fee5cc64f364b6f48ff7862137614c701080dd576dbfc18f6b212809da の直接 source/public stable確認を継承し、今回1470/108の再走査はしない。旧dc5905f9とのserialization種類未特定の限界も維持（表そのものは親configから不変更）。

診断stage/count schema・owner.normal/native.normal・Reporter/file pass・actual same-handle/PID/PG/exit/EOF-close・original native proof/CAS/ACK・strictnormal→sidecar0→copy→query-only audit gateは直前の全文のまま。stageEnteredはlast entered groupであり、predicate pass/実throw/cleanup完了/permission/能力/閉鎖/ACKではない。正常proofへの昇格0。parse/abrupt/catch外例外やmarkermissingは欠測のまま。

native ledger8192B（保守最大1189Bの計算は主借用）、別node binding512B、control32768、publicreadonlyconfig1MiB/privatecopy0/material256KiB/root192/DB80/body430+closure50outer480/guard200ms/TMP128+128を不変更。D1required1/formalskip9、business owner1+ps1、Worker0、lease2等は準備対のままactual未実証。fresh p5c-s5-native-d1-stage2-67a198c4はmemory bindingのみ、probe/create0。過去actual原因UNKNOWNを訂正しない。

本PASSは次のRoot solePUBLICprecheck→既preflight→別ONE判断へ返す工具gateだけ。全goal/S5未完。追加実行は本レビューから許可しない。wx600/fsync/actual writer close・postread同identity/fullSHAを確認して **ALL read STOP**。
