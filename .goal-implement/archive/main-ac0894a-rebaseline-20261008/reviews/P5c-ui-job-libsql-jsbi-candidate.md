# MAIN-FIELDS-JSBI1 candidate 独立比例 review

固定日時: 2026-10-06T10:09:16.081794+00:00

判定: **限定 STATIC PASS**。Root採用の公開 conditional input1row / exact count・bytes / 従属SHA / fresh bindingsだけを確認した。追加起動blockerの発見なし。実行許可はRoot別採用であり、actual build / native正常閉鎖 / renderer / UI / 製品機能の合格0。以前の実 INPUT_SCOPE 拒否target・原因は UNKNOWNを維持する。

## 固定対象

| PUBLIC file | bytes | SHA256 |
| --- | ---: | --- |
| helpers/p5c-ui-job-libsql-build.py | 26497 | 088b558ff2b4f0bf611b4b649561ebb28f8b766cff7638c8fbe49b30974d00e6 |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 10061 | 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac |
| helpers/p5c-ui-job-libsql-build-manifest.json | 117169 | 4ad86e83ac189da016ba255f901aeb55ed05a0078c2d49a8b3ffe77f4e7a3927 |
| phases/P5c-ui-job-libsql-jsbi-candidate.md | 5051 | 5403856610993bb64badc27671ed3f22bf2fe1b067dea1521e47af2f8860ab07 |

4ファイルは canonical / regular0600 / selfUID / nonlink / nlink1 / NOFOLLOW / stable dev-inode-size-mode-UID-nlink-mtime-ctime のopen前・fstat前後・close後path同値 / 全文SHAを直接確認した。初回と報告固定直前で同値。candidate phaseは全文読取。

採用元 [zod3 actual独立レビュー](P5c-ui-job-libsql-zod3-actual.md) 8617 B / SHA `d4a6b033c955c6fac848e435b56aa62c721880e59d1188df462ec89a7f62df1a` の正式jsbi mainFields・公開exports・stock resolver根拠を継承する。今回 source327/dependencies707の全再walk・Gitreader・actual/private領域確認は0。

## 直接差分・inverse

追加rowは exact PUBLIC:

`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/jsbi@4.3.2/node_modules/jsbi/dist/jsbi-cjs.js`

schemaは canonical / bytes29223 / SHA `b952fc88337eae5d90b397da4251e207d816056ea4c574df576f17e68626dd94` / mode420（0644）/ UID501=self / nlink1。packedに1回だけ存在する。実PUBLIC1fileを canonical / regular / NOFOLLOW / stable全文読取で再照合し、正確に一致した。元jsbi.mjs・d.ts・package.jsonを保持する。

正式 package mainのCJS conditional targetを追加するもので、実INPUT_SCOPE拒否pathの証拠ではない。既 ES runtime edgeをCJSへ置換せず、追加conditional inputとして区別する。前reviewで確認したruntime追加import0の静的根拠を借用する。

直接 memory inverse:

- packed追加row1除去、dependencyBytes13984808へ、sourceRoot/root/selfcore targetを旧zod3予約へ戻す。元 sorted compact payload / level9 zlib / envelope順compact newlineで再encodeし、旧 **117101 B / cb0276b8f71d882593eb18746483498e88953ae8a916bd0f537c3c54e322c05e** へ全文一致。
- runnerの MANIFEST_SHA / sourceRoot / root / exact dependencies count・bytes / default安全projectionの5箇所を旧値へ戻す。各replacement1回をassertし、旧 **26495 B / 09903e6c8cfddebcb21c901cd060fd241734e13329b167c5db4668da4ab27876** へ全文一致。
- driverは **10061 B / 6f4b6aa0…** の承認済全文と不変。

この全inverseにより、採用差以外の code / decoded records / options / normalgate変更0を確認した。旧helper bytesのmemory再現であり、旧実SOURCE/BUILD/TMPの読取・再利用ではない。

## binding・cap・normalgate

decoded payload **1558286 B / 26da3fd037952186edc84700ebcceba809333856bbc75bfa762b6684049e213a** の宣言size/SHA、strict zlib EOF true / unused_data0 / unconsumed_tail0を直接確認。

- candidate79ef126 / source327 / 1920009 B / sourceManifest `4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206` を維持。
- deps708 / **14014031 B = 13984808 + 29223**。runner line90のcount/bytesとline538のdefault projectionが一致。
- aliases10 / linkTargets7 / edges788 / reachable66 / declaration2532 / entries4は維持。
- SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-ui-job-source-79ef126e-jsbi4-20261006`
- BUILD `/Users/hikaru/.local/share/hollow-validation/goal-implement-ui-job-build-jsbi4-20261006-671ce834`
- toolTMPはBUILD + `-toolTMP`。packedとrunner束縛・selfcore linkが一致。これは未probeのmemory予約だけで、実不存在/実排他作成を主張しない。

直接material算式: **117169 + 10061 + 26497 + 32768 + 4096 = 190591 B < 262144 B**。payload1558286 < 2MiB。source32 / output16 / TMP8 / log2 / root192MiB、body60+sharedtail30 / guard200ms、Python1 Node1 original esbuild service1は不変。追加fileは既PUBLICpackage1個で新install・packageversion・資源役割0。

元platformnode/mainFields未指定、buildAPI/options/external3/entry4、receiver/args/result/Promise、constructor-native handleidentity、poststart observer、postbuild originalstdin.end、originalstop、exact knownInputs membership、outputset、supervision/knownPG/actualexit/stdioEOF-FD/outerEOF-controlFD正常gate、diagnostic enums / persistentheldを全文維持する。未知input/path/family/virtualinput一般の許可・fallback・mainFields優先変更・nativeproof/ACK合成は0。

Python AST parseは直接静的確認。担当のmemorycompile0、および既driver構文根拠は借用。同driver再NodeCLIなし、sourceimport/evaluation/cache生成なし。

## 次gate・停止

Rootが別採用する **own PUBLIC helper/packed/pinnedmetadata precheck → existing default全結果inspect（source327/deps708 fullstable、executed:false/newRoot:0）→ ONE finite build** のための限定tooling gateは成立する。別Gitreader/fullsource再演を追加必須にしない。実source materialization/stock条件解決/service閉鎖/四outputsはまだ未観測。

Verifierは実CLI/default/preflight/rootprobe/create/Gitreader/Nodeimport/build/browser/DB/環境操作0。新jsbi4/671ce834と全旧generated SOURCE/BUILD/TMP・全private成功失敗rootのstat/read/hash/import/copy/reopen/replay/cleanup0。source/product/helper/Manager/main/S5/P5d変更0。新reviewだけwx0600で固定、全読取STOP。STATIC PASSから機能合格・旧actualcause確定へ昇格しない。
