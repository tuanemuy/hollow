# UI browse4 RESOLVE-ZOD1 fixed candidate

判定: Root 採用の PUBLIC helper-only 最小修正を固定した。独立 review 待ち。default preflight / sourcecreate / build / import / 実行は0。startup2 の実失敗原因および D1 actual 原因は UNKNOWN のまま。製品機能・UI・native closure を受入しない。

## 固定根拠と許可差

固定 proposal `phases/P5c-ui-job-libsql-public-resolution-plan.md` 9,664 B / SHA256 `442a0a69bef4b9445702f5bae0079fe934a9b54a820718ac28f93f04035c0471` を全文 stable read した。変更前 PUBLIC runner/driver/packed も canonical / regular / nonlink / mode0600 / selfUID / nlink1 / NOFOLLOW / lstat-open-fstat前後-close後path identity / 全文 SHA で直接照合した。旧生成 SOURCE/BUILD/TMP を読んだ根拠にはしていない。

旧 fixed3:

| PUBLIC file | bytes | SHA256 |
| --- | ---: | --- |
| helpers/p5c-ui-job-libsql-build.py | 26503 | 9b55aa9ffc7bca02e8aa447be3706c17573a7e4274639d1a6cedf4a0c9ed74d2 |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 10061 | 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac |
| helpers/p5c-ui-job-libsql-build-manifest.json | 117105 | d2b84a5a01c5ac2ea756bab5df138222fd25db892432d1ccd2cf0d6a2a631fa8 |

packed payload の `linkTargets` に `apps/web/node_modules/zod` → `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/zod@4.4.3/node_modules/zod` を1件だけ追加。target は既 dependencies707 の registered canonical package family で、core の既 zod link target と同値。新 install/body/package/version を追加していない。web importer の正規 ancestor node_modules の不足を補正したもので、実失敗の throwing import/callsite を確定していない。

runner の `len(m["linkTargets"]) == 6` を `== 7` に変更。aliases10 の条件は同じ。既 manifest-driven materialize / expected_links / strict capacity guard の実装は全文維持した。リンク件数は正確に7、未知 symlink は許可しない。capacity の総entry上限4096は維持し、既 counter が追加link1を計数する。web/node_modules は元 @repo/core link 用に既作成されるため、新 directory creation branch は加えていない。

packed の sourceRoot、@repo/core link target、root と runner の sourceRoot/root literal を、Root が採用した下記新 memory-only reservation に変更。派生 toolTMP は元 `root + "-toolTMP"` のまま。packed payload size/SHA と圧縮 envelope SHA を実bytesから更新し、runner MANIFEST_SHA だけ従属更新した。

- SOURCE: `/Users/hikaru/github.com/tuanemuy/hollow-ui-job-source-79ef126e-zod3-20261006`
- BUILD: `/Users/hikaru/.local/share/hollow-validation/goal-implement-ui-job-build-zod3-20261006-e762bb91`
- TMP: BUILD に `-toolTMP` を付けたもの。

これら予約領域について absence/stat/realpath/probe/create/read は0。記録したパス文字列は予約だけであり、領域の現状態を主張しない。

## 新 fixed3 / static bounds

| PUBLIC file | bytes | SHA256 |
| --- | ---: | --- |
| helpers/p5c-ui-job-libsql-build.py | 26495 | 09903e6c8cfddebcb21c901cd060fd241734e13329b167c5db4668da4ab27876 |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 10061 | 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac |
| helpers/p5c-ui-job-libsql-build-manifest.json | 117101 | cb0276b8f71d882593eb18746483498e88953ae8a916bd0f537c3c54e322c05e |

Decoded payload: 1,558,040 B / SHA256 `03dc8ca9f19cb0ea81c975e09f93c56de6b426754b60bc6065fccde969f1f800`。旧 payload 1,557,935 B / `4d8897419e971a24158e850d11d01e6289f09cc5953c1c21acad2122848c38ca` から +105 B。新 payload は2MiB上限内。JSON canonical sort_keys/compact と zlib level9 / base64 / compact envelope newline を用い、元 envelope を同じ codec で全文再現できることを確認してから候補生成した。終端/eof・unused_data/unconsumed_tail・宣言payload size/fullSHA の静的一致も確認した。

Material 算式は元 binding gate と同じ: packed117101 + driver10061 + runner26495 + control32768 + outputmetadata4096 = **190,521 B**。256KiB上限262144に対して残71,623 B。旧実算式190533から -12 B。phase報告本文はこの runtime material 算式に含まれない。source32MiB / output16MiB / TMP8MiB / log2MiB / root192MiB、body60s + sharedtail30s / guard200ms、Python1 Node1 original esbuild service1 を変更していない。

## decoded 不変条件と full inverse

immutable source candidate `79ef126edd5d3440cde20dbe8fd372e7235010c5`、source327 / 1,920,009 B、sourceManifest `4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206` を payloadから直接照合した。source list の canonical JSON fullSHA は元値と一致。dependencies707 / 13,984,808 B、anchors24、aliases10、runtime edges788、reachable source66、declaration edges2532、entries4、links[]、node binding、closurePending=false など、許可3bindingとlinkTargets追加以外の decoded fields は元と完全同値。

これは packed の fixed record 比較であり、Git source327 body / public dependency707 body を今回再読した証拠ではない。元 PUBLIC proposal と採用済manifestから既根拠を借用する。Gitreader/subprocess/GitHEAD/currentmain/source fullwalk は0。

直接 memory inverse を実行した:

1. 新 linkTargets の web/zod1を削除し、sourceRoot・core target・root を旧 literalsへ戻す。decoded object が旧 object 全体と equal。canonical JSON＋同codecの再圧縮 envelope bytes が旧117105B全体と equal、SHA `d2b84a5a01c5ac2ea756bab5df138222fd25db892432d1ccd2cf0d6a2a631fa8`。
2. runner 新MANIFEST_SHA/sourceRoot/root を旧値へ、lenlinks7を6へ戻す。旧 runner26503Bの全文と direct bytes equal、SHA `9b55aa9ffc7bca02e8aa447be3706c17573a7e4274639d1a6cedf4a0c9ed74d2`。追加変更なし。
3. driver は編集0。新旧10061Bが direct bytes equal、SHA `6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac`。旧予約literalは driver に存在せず、driver は binding.sourceRoot/root を読む既コードのまま。

この inverse は旧 helper 公開bytesへの逆変換であり、旧実 SOURCE/BUILD/TMP を開く操作ではない。

## API / gates / syntax

driver の四entry、original async esbuild API/options/external、this/args/return/Promise/stock constructor/exports/handle identity、afterstart observer、postbuild sameoriginal stdin.end制御、original stop、stderr inherit=NULL、各child/Node PG/exit/EOF/actual FDclose gate、firststicky21 / lastphase12 / strict held protocol を全文維持した。NodePaths/plugins/resolver fallback/NODE_PATH/新 loader/native addon/network/DB/service work を加えていない。

runner source_objects Git finite known leader/PG/PIPE recovery、source/program binding、capacity、normal gate、strict decoder、force/unknown held semantics は lenlinks/root/SHA以外全bytes不変。D1 source/helpers/review の停止状態と UNKNOWN原因を保持する。

確認: Python AST parse＋memory compile PASS（helper実行0/cache生成0）。Pinned Node24.15 の `--check` で既driver構文 exit0（module imports/body evaluation0）。新helper3は write fsync / actual FDclose後に全文再読し、regular0600 / UID / nlink1 / canonical / nonlink / stable dev-inode・size・mtime・ctime / SHAを再照合した。Whole product typecheck/lint/format は product source変更0のため今回不要で、実行0。

## 次 gate と停止

候補は独立比例 reviewへ返す。Rootが別採用するまで direct dependency/source precheck、existing default preflight、source materialization、Node/helper import、build、新root probe/create、native/service runtime は0。既defaultを今実行しない。将来 Root の direct PUBLIC precheck → existing default preflight全結果inspect → ONE build の順序を維持する。

全 old generated SOURCE / BUILD / TMP / old B / old private成功失敗root は permanent NONOP、stat/read/hash/copy/import/replay/cleanup0。main/product/sourceS5/P5d/Manager plan/status、固定proposal本文、D1source/helpersに変更0。今回の writer scope は PUBLIC runner/packed各許可差と本新phaseだけ。driverは全文不変。報告固定・全文hash確認後、全 reader/writer/runtime STOP。
