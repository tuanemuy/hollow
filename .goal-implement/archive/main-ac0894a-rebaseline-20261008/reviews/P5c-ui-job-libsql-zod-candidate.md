# UI RESOLVE-ZOD1 candidate 独立比例 review

固定日時: 2026-10-06T09:55:37.123861+00:00

判定: **限定 STATIC PASS**。Root 採用 scope の web zod link1 / fresh bindings / 従属 SHA / link件数だけを直接確認した。起動 blocker の追加発見なし。実 build、サービス閉鎖、UI、製品機能の合格ではなく、Root が次の有限実行を別採用するための tooling gate である。

## 固定対象

| PUBLIC file | bytes | SHA256 |
| --- | ---: | --- |
| helpers/p5c-ui-job-libsql-build.py | 26495 | 09903e6c8cfddebcb21c901cd060fd241734e13329b167c5db4668da4ab27876 |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 10061 | 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac |
| helpers/p5c-ui-job-libsql-build-manifest.json | 117101 | cb0276b8f71d882593eb18746483498e88953ae8a916bd0f537c3c54e322c05e |
| phases/P5c-ui-job-libsql-zod-candidate.md | 8375 | ba1cdfeb45b89b21eb81b3574a6725bb7691fbe4d676b4d351d223547ece914b |

上記4ファイルは canonical / regular / nonlink / mode0600 / selfUID / nlink1 / NOFOLLOW / stable lstat-open-fstat前後-close後path identity / size / 全文 SHA を直接確認した。初回と報告固定直前の確認で同値。候補 phase は全文読取した。新/旧生成 SOURCE・BUILD・TMP には触れていない。

採用元は [公開解決計画](../phases/P5c-ui-job-libsql-public-resolution-plan.md) 9664 B / SHA `442a0a69bef4b9445702f5bae0079fe934a9b54a820718ac28f93f04035c0471`。そこで直接確認した immutable main79 の既知6 Git blobs、正式 package exports、esbuild 正式 package resolver / importer祖先の根拠を継承し、今回 Git reader・PUBLIC dependency/source body の全再走査を行わない。

## 直接 delta と full inverse

decoded payload は 1,558,040 B / SHA `03dc8ca9f19cb0ea81c975e09f93c56de6b426754b60bc6065fccde969f1f800`。宣言size/SHA、zlib EOF / unused_data=0 / unconsumed_tail=0 を直接確認した。

追加 `apps/web/node_modules/zod` の target は `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/zod@4.4.3/node_modules/zod`。既 `packages/core/node_modules/zod` と exact同値で、既 dependency707 の PUBLIC canonical packageを使う。web runtime importer の ancestor package location にリンクを置くため、採用元 RESOLVE-ZOD1 の declared closure 不足へ直接対応する。新 install・package・dependency body・任意 alias・resolver fallback は追加しない。

source candidate `79ef126edd5d3440cde20dbe8fd372e7235010c5` / sourceManifest `4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206`、source327 / 1,920,009 B、dependency707 / 13,984,808 B、aliases10、runtime edges788、reachable66、declaration2532、entries4 の維持を payload と全逆変換から確認した。source body の新実読み取り・新実 filesystem の成立確認ではない。

直接 memory inverse:

- packed の web zod1項目を削除し、sourceRoot / root / core link target の3 bindingsを旧 startup2へ戻した。sorted compact decoded JSON / 元 level9 zlib / base64 / 元 envelope key-order / compact newline で再構築し、旧 **117105 B / SHA d2b84a5a01c5ac2ea756bab5df138222fd25db892432d1ccd2cf0d6a2a631fa8** へ全文一致。
- runner MANIFEST_SHA / sourceRoot / root / `len(linkTargets)==7` の4 literalを旧値 / `==6` へ戻した。旧 **26503 B / SHA 9b55aa9ffc7bca02e8aa447be3706c17573a7e4274639d1a6cedf4a0c9ed74d2** へ全文一致。
- driver **10061 B / SHA 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac** は旧承認全文のまま。

従って追加 link / fresh bindings / 従属 SHA / link件数以外の変更はない。旧 bytes を memoryで再現した操作であり、旧実領域の読取・再利用ではない。

## 束縛・容量・正常条件

新予約文字列:

- SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-ui-job-source-79ef126e-zod3-20261006`
- BUILD `/Users/hikaru/.local/share/hollow-validation/goal-implement-ui-job-build-zod3-20261006-e762bb91`
- toolTMP は元 `BUILD + "-toolTMP"`。

runner と packed root/sourceRoot、web @repo/core target がこの同じ予約へ一致する。未probeの memory-only reservationであり不存在/安全実体/排他生成済を主張しない。実際の既 absence/exclusive-create gateは元のまま必要である。

既 manifest-driven source materialize / expected_links / entry cap は runner full inverseで維持され、追加1linkも通常計数に含む。lenlinks7は exact候補件数であり任意 symlink 許可ではない。source327・source32MiB / output16MiB / TMP8MiB / log2MiB / root192MiB / body60s + sharedtail30s / 200ms / Python1 Node1 original esbuild service1 を維持する。

直接 material 計算: packed117101 + driver10061 + runner26495 + control32768 + outputmetadata4096 = **190521 B < 262144 B**。decoded payload 1558040 B < 2MiB。capの増大・新資源役割は0。

original async build / options / external3 / entry4 / receiver・args・result・Promise / original native service constructor / poststart observer / postbuild stdin.end / original stop / enum/strictdecoder/persistentheld / knownPID-PG有限停止 / 正常 actualexit/stdioEOF-FD/NodePG/outerEOF-FD gate は全文不変。driverへ alias / NodePaths / plugins / NODE_PATH / addon / network / DB port の追加は0。publicationを prepermission証拠へ、閉鎖signal要求を actualPGabsenceへ、EOFをFDcloseへ読み替えない。

Python AST parse は直接静的確認（evaluation/import/cache生成0）。担当の同driver pinned Node `--check` / syntax0は借用し、今回は実 CLIを再実行しない。製品変更0につき whole checks は追加していない。

## 次の sequence と未観測

Root の別採用で、**direct PUBLIC source/dependency precheck → existing runner default preflight（全結果 inspect、executed:false/newRoot:0）→ ONE finite build** の順へ進める。default / `--run` の元 CLI、引数、root排他・容量・正常条件を新たに変えない。今回の STATIC PASS 自体は実行許可ではない。

失敗 startup2 の actual cause / throwing import / callsite は UNKNOWN。declared不足の補正を失敗原因の遡及確定へしない。新 source materialization / stock resolver実解決 / esbuild actual normalexit / service個別 stdio / four outputs / build正常閉鎖は未観測。renderer / UI / privateproof / ACK / admission の成功を合成しない。

今回 Gitreader/Nodeimport/CLI/default/preflight/sourcecreate/build/rootprobe/DB/環境操作0、未知 PUBLIC walk / install0、mainworking/S5/P5d/B/全private生成領域の read-stat-hash-copy-import-reopen-cleanup0。製品/helper/Manager編集0。本reviewだけ wx0600で固定し、全対象読取STOP。
