# MAIN-FIELDS-JSBI1 UI build 工具候補

2026-10-06T10:06:45.890699+00:00。最小PUBLIC差を固定、ALL read/writer STOP。実 INPUT_SCOPE の拒否対象/原因はUNKNOWNを維持する。生成source/build/toolTMP・default/preflight/Node import/CLI actual/DB/network/root probe/createは0。製品/main/S5/P5d/Manager正本変更0。

## 固定PUBLIC3

| helper | bytes | SHA256 |
| --- | ---: | --- |
| .goal-implement/helpers/p5c-ui-job-libsql-build.py | 26497 | 088b558ff2b4f0bf611b4b649561ebb28f8b766cff7638c8fbe49b30974d00e6 |
| .goal-implement/helpers/p5c-ui-job-libsql-build-driver.mjs | 10061 | 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac |
| .goal-implement/helpers/p5c-ui-job-libsql-build-manifest.json | 117169 | 4ad86e83ac189da016ba255f901aeb55ed05a0078c2d49a8b3ffe77f4e7a3927 |

変更前にrunner26495/09903e6c、driver10061/6f4b6aa0、packed117101/cb0276b8の指定fullSHAを照合。変更後もcanonical/regular600/selfUID/nlink1/NOFOLLOW、dev/inode/mode/UID/nlink/size/mtime/ctimeのopen前・fstat前後・close後path同値と全文SHAを確認した。driverは全文byte不変。

入力review `reviews/P5c-ui-job-libsql-zod3-actual.md` 8617 B / `d4a6b033c955c6fac848e435b56aa62c721880e59d1188df462ec89a7f62df1a` 全文を読み、静的Node-main conditional input不足とactual cause unknownを区別した。

## 追加1rowと不変集合

追加exact PUBLIC target:
`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/jsbi@4.3.2/node_modules/jsbi/dist/jsbi-cjs.js`

29223 B、SHA256 `b952fc88337eae5d90b397da4251e207d816056ea4c574df576f17e68626dd94`、canonical/regular0644/mode420/UID501=self/nlink1、NOFOLLOW stable全文と実FDcloseを直接確認。未知walk/他dependency内容再読はしていない。

packed dependenciesにこのschema同一rowだけをcanonical順で追加した。既jsbi.mjs/jsbi.d.ts/package.json rowsを保持。これはstock Node-target mainFieldsのCJS conditional targetであり、既ESM edgeをCJSへ書換えていない。deps707→708、dependencyBytes13984808→14014031をrunner bindingとexisting default安全projection双方へ固定。未知input/general fallback/virtual input許可を追加していない。

source327/sourceBytes1920009/sourceManifest `4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206`、candidate `79ef126edd5d3440cde20dbe8fd372e7235010c5`、aliases10/linkTargets7/edges788/reachable66/declaration2532、anchors/entries4/closurePending falseはpackedの旧値と直接比較して同値。新sourceRootに従属するselfcore targetのみ移動。

## 新memory予約

- SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-ui-job-source-79ef126e-jsbi4-20261006`
- BUILD `/Users/hikaru/.local/share/hollow-validation/goal-implement-ui-job-build-jsbi4-20261006-671ce834`
- toolTMPは同BUILD literal + `-toolTMP`（新固定derivation）。

packed sourceRoot/rootと `apps/web/node_modules/@repo/core` target、runnerの対応sourceRoot/root binding、MANIFEST_SHAだけを従属更新。実rootの非存在確認すら未実施。全zod3/e762、startup2/94f、original/a063、S5成功失敗、他全旧privateは恒久NONOP（stat/read/hash/copy/import/reopen/replay/cleanup0）。

## 全逆適用・静的checks

packed逆変換は追加row1除去→dependencyBytes旧値→sourceRoot/root/selfcore旧literalへ戻す。旧payload object全体と同値をassertし、元のJSON compact/sort-key payload、zlib level9、envelope key順/compact/newlineで再encodeした全packed bytesが旧117101/cb0276b8 fullSHAと完全一致。

runner逆変換はMANIFEST_SHA→root2literal→depscount/bytes2箇所を元へ戻す（exact replacement5、各1件assert）。旧26495/09903e6c fullbytesと一致。driverは無変更そのものなので旧全文と同値。既build options/external/4entries/this/args/returns/Promise/stockservice/postbuild stdinend/close/supervision/known input checksのbodyは不変。mainFields設定も不変。

Python AST/compileをsource文字列のみで確認（helper import/実行/pycache0）。driver無変更につき構文根拠を継承し、NodeCLIを追加実行していない。新payload decodeは2MiB+1の有限decoderでEOF true/unused_data空/unconsumed_tail空、payload length/hash exactを確認。

- payload1558286 B / SHA `26da3fd037952186edc84700ebcceba809333856bbc75bfa762b6684049e213a`。
- material算式：packed117169+driver10061+runner26497+32768+4096 = **190591 B**、256KiB上限内。
- payload2MiB、rawlog2MiB、source32/output16/TMP8/root192MiB、body60+tail30、元PG/PIPE/FD/control closure/capacity/held正常判定はすべて据置。

## 引渡し

生成/execute/preflight/defaultは未実行、actual cause unknown、UI機能/build/native正常閉鎖の新受入0。独立delta review後Managerがsole PUBLIC precheck→existing default→ONEを別採用する。root予約を実行許可と混同しない。本report wx600/fsync/実FDclose/自己stable全文SHA後、PUBLIC3/report読取とwriterを停止して返却する。
