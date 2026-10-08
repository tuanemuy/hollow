# 通常fixture 公開runtime closure step3

固定日時: 2026-10-06T11:21:03.078054+00:00

採用済みJS32（CSS28/client2/libsql2）＋JSON2＋alias5の有限読取を完了。次の候補は**CSS15JS＋core4JS＋alias由来package.json4**だけ。next targetsの本文・metadataは未読取。全closure/32files/aggregate2MiB成立、native loading、通常fixture正常実行はまだ確認していない。

採用step2: 10,843B / SHA256 `5b724dd7eff6a11183300932b75966b5b2a55250d970d722bf5e0de7f7041d8b`。既entry/package/source selectionは同PUBLIC固定報告を借用し、旧generated SOURCE/build/TMP/output/validation/private根へ触れていない。CA67候補とS5/helpers/sourceは固定STOPのまま。

## Direct files

短縮prefixは次のabsolute pathにだけ展開する。

- CSS: `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/`
- CLIENT: `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client/`
- LIBSQL: `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql/`

全34件はregular0644/selfUID501/nlink1/canonical一致、O_NOFOLLOW全文読取の前後lstat/fstat dev/ino/size/mode/uid/nlink/mtime/ctime同値。JS各65,536B/JSON各32,768B以内。unique本文173,824B、同34件の固定再照合を含む2pass347,648B＋match.js comment境界限定確認19,514B＝round累積367,162B≤2MiB。alias各readlink≤4,096B、前後metadata同値/selfUID symlink。targetコード実行/import/evalは0。

| Direct exact path | bytes | SHA256 |
| --- | ---: | --- |
| CLIENT/lib-esm/hrana.js | 13629 | `936c60bfd4676e5f00452af31371445efa67e46417c1f09b1822933a6560827a` |
| CLIENT/lib-esm/sql_cache.js | 3116 | `0a13314ebcb40a94a76698fbbc929ea38d1da24a4e84be031c44684e940a4787` |
| CSS/lib/convertor/create.js | 756 | `5362ff474f863e16995f1f920a78a86252316bba425def986d01fd521b821a21` |
| CSS/lib/definition-syntax/SyntaxError.js | 408 | `a8b72a0d0a092d87e2d71b35d9bdb074800dfa4973daf378f5d791ff996c31a9` |
| CSS/lib/definition-syntax/generate.js | 3420 | `8219bdc7bbdcd9a35dd022d0f0b6aebb8b6927574a0a66f6f9ff2dc98c6548d7` |
| CSS/lib/definition-syntax/parse.js | 14975 | `1314a5458f65204a04c20dafeb0a6e8e24d7fe37bb9e0da5133c6d59ab72ae63` |
| CSS/lib/definition-syntax/walk.js | 1269 | `342d693c25a42c74ac3f66090043fcf5646b1a90438207c389dab6e8028879fc` |
| CSS/lib/generator/create.js | 2947 | `2e4112898f61442bfa9aebc808e6e5e1dd28b267955fffdef5a87f32ca248ec0` |
| CSS/lib/lexer/error.js | 3335 | `cbb0e395106f5c3d4da276bdc27d8199da3eb95cbc8e65d1583ba2c9bacafd5b` |
| CSS/lib/lexer/generic-const.js | 155 | `72896ada1af386326bbc053bc1302c51739c928e90f7e57d2024b9cee72c5e2b` |
| CSS/lib/lexer/generic.js | 20718 | `d3e66172510a6057879885aaf4ffd77944e598f9262aab369216de7bfd222daf` |
| CSS/lib/lexer/match-graph.js | 15311 | `862b1e04494b93d337cde872c680731a242b8b8a715655ba65887049edbea6c6` |
| CSS/lib/lexer/match.js | 19514 | `d1aa43eee2383b47e63ce180ea285d197d452e6402e609637bb3846378f0cea1` |
| CSS/lib/lexer/prepare-tokens.js | 1093 | `e25ecabc4a78c35903e603a25f094fa074b763060c6842aae55d049a2f999675` |
| CSS/lib/lexer/search.js | 1582 | `7805cd906f66272b98321307c6fe5d1efd0a8f177a5e89b25463b405eeb4783e` |
| CSS/lib/lexer/structure.js | 5253 | `11fe95b505a401e752636ddf6eaae75ac51963feefe44100e1c769ab575ca4df` |
| CSS/lib/lexer/trace.js | 1638 | `616c3897a9fe65f595ccbbebe130e3d71525edf98a1441ecc9042d012c27fa3b` |
| CSS/lib/lexer/units.js | 1540 | `25f99b405f14194f8e1a4d3432a8d1d3f59e814dd93bc703db2d6332d397b1f1` |
| CSS/lib/parser/create.js | 12649 | `b884e64b00eb8b63d398fe395a29f6b40a43a29220364864717cbba9dd670334` |
| CSS/lib/syntax/config/lexer.js | 237 | `9070d8711d1c8fd2540299f272b8c307b48d060b55a77746be8c1ce99779bb7a` |
| CSS/lib/syntax/config/mix.js | 3661 | `60e42b08af1a9fc72864f4fb04dbc49b53a122c715a089e0f1dacba2da3c2a5d` |
| CSS/lib/syntax/config/parser.js | 1155 | `81f0e01cffe0f898df7d0732cb181bdecc4d89ac8ff85b3519e57b8ae39d5c0f` |
| CSS/lib/syntax/config/walker.js | 72 | `130ec32c1207d4578698afa275666729fde45b49cb9a99de22de70a7c6bac619` |
| CSS/lib/tokenizer/OffsetToLocation.js | 2458 | `1246bdff87c6a08ac9f9505e2758898fee39e3bf1480ef6bfbf05eb65c6f59b6` |
| CSS/lib/tokenizer/TokenStream.js | 11352 | `9d1b0b5e157a984b2700b75a2a44b63dae4ab426186f4d94d3aff2436967d0ec` |
| CSS/lib/tokenizer/char-code-definitions.js | 6526 | `f184aa02202424f4b33110f3fb5f6228626eeb0cbbb9e15bcc0e33522ad28790` |
| CSS/lib/tokenizer/names.js | 517 | `e033bb7b9a6fc4a6c4541f0e69cce456841bfbf689be4520710fa9018941f98f` |
| CSS/lib/tokenizer/types.js | 1486 | `44e51dcd9d13abf655a7bcd5d9655bdaf386ec751a910d4aca9452544e8bfb81` |
| CSS/lib/tokenizer/utils.js | 7820 | `2c0087a12707b22eae4bc44dd338a8682838663872b2240387c5979ae76d44bb` |
| CSS/lib/walker/create.js | 7490 | `aa632d55bec88636a4a2f964e7dfb075993c1e0589eeebffa0b0327351af0f84` |
| CSS/package.json | 3909 | `bd734f2de92e7a254bd05970fa83b30f8be9ed73e33577065a1529e59843cfd4` |
| LIBSQL/auth.js | 447 | `9a624b43d1a57ad474f9c0d860b1432ba24a531af2064763dbcef69869f935c4` |
| LIBSQL/sqlite-error.js | 848 | `e21593dbd9f2b8222b0a110f587836fbfd940f3805f8f792651ed0111997b588` |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+core@0.18.0/node_modules/@libsql/core/package.json | 2538 | `da65aa270b71f26982db2364939a9f019bf3d90a8466098106ac156cc1fb4b6b` |

## 正式辺からの次CSS15JS

| 次exact target | direct formal importの根拠 | 個別cap bytes |
| --- | --- | ---: |
| CSS/lib/utils/create-custom-error.js | CSS/lib/definition-syntax/SyntaxError.js:1、lexer/error.js:1 | 65,536 |
| CSS/lib/definition-syntax/scanner.js | CSS/lib/definition-syntax/parse.js:1 | 65,536 |
| CSS/lib/generator/sourceMap.js | CSS/lib/generator/create.js:2 | 65,536 |
| CSS/lib/generator/token-before.js | CSS/lib/generator/create.js:3 | 65,536 |
| CSS/lib/lexer/generic-an-plus-b.js | CSS/lib/lexer/generic.js:2 | 65,536 |
| CSS/lib/lexer/generic-urange.js | CSS/lib/lexer/generic.js:3 | 65,536 |
| CSS/lib/parser/SyntaxError.js | CSS/lib/parser/create.js:2 | 65,536 |
| CSS/lib/parser/sequence.js | CSS/lib/parser/create.js:23 | 65,536 |
| CSS/lib/data.js | CSS/lib/syntax/config/lexer.js:2 | 65,536 |
| CSS/lib/syntax/node/index.js | CSS/lib/syntax/config/lexer.js:3、walker.js:1 | 65,536 |
| CSS/lib/syntax/scope/index.js | CSS/lib/syntax/config/parser.js:1 | 65,536 |
| CSS/lib/syntax/atrule/index.js | CSS/lib/syntax/config/parser.js:2 | 65,536 |
| CSS/lib/syntax/pseudo/index.js | CSS/lib/syntax/config/parser.js:3 | 65,536 |
| CSS/lib/syntax/node/index-parse.js | CSS/lib/syntax/config/parser.js:4 | 65,536 |
| CSS/lib/tokenizer/adopt-buffer.js | CSS/lib/tokenizer/OffsetToLocation.js:1、TokenStream.js:1 | 65,536 |

これらはrelative import文字列から字句解決した候補だけ。canonical/existence/hashは未確認。全CSS static re-exportを評価依存として残し、unused扱いで省略しない。`CSS/lib/lexer/match.js:211 require('util')` はline201–217の `//` debug comment内であり、実require辺ではないと同採用本文から直接確認した。Node builtin target探索を追加しない。lexer/error.js→definition-syntax/generate.js、convertor/create.js→utils/List.js等は既読辺であり、次集合へ重複追加しない。

## core正式exports

今回のcanonical regular package.jsonからname `@libsql/core`、version0.18.0、type module、api/config/util/uriのimport側exportsを確定。CLIENT/hrana.jsは@libsql/hrana-client、@libsql/core/api、@libsql/core/utilをstatic import。先行node/sqlite3/ws/httpの採用辺api/config/util/uriと合わせて次4JSを提案する。require側lib-cjs・types側d.tsへ一般fallbackしない。

| 次exact target | exports根拠 | 個別cap bytes |
| --- | --- | ---: |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+core@0.18.0/node_modules/@libsql/core/lib-esm/api.js` | 正式exports `./api` import | 65,536 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+core@0.18.0/node_modules/@libsql/core/lib-esm/config.js` | 正式exports `./config` import | 65,536 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+core@0.18.0/node_modules/@libsql/core/lib-esm/util.js` | 正式exports `./util` import | 65,536 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+core@0.18.0/node_modules/@libsql/core/lib-esm/uri.js` | 正式exports `./uri` import | 65,536 |

CLIENT/sql_cache.jsとLIBSQL/auth.js/sqlite-error.jsから新static import/export/require辺はない。libsqlのnative loader呼出・dynamic targetの未確定境界はstep2のまま保持し、auth/sqlite-errorの本文確認をnative closureにしない。

## Direct sibling aliasesと次package metadata

| Direct exact alias | readlink文字列 | lexical target（本文/metadata未読取） |
| --- | --- | --- |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/libsql` | `../../libsql@0.5.29/node_modules/libsql` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/hrana-client` | `../../../@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/promise-limit` | `../../promise-limit@2.7.0/node_modules/promise-limit` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/promise-limit@2.7.0/node_modules/promise-limit` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/@neon-rs/load` | `../../../@neon-rs+load@0.0.4/node_modules/@neon-rs/load` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@neon-rs+load@0.0.4/node_modules/@neon-rs/load` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/detect-libc` | `../../detect-libc@2.0.2/node_modules/detect-libc` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/detect-libc@2.0.2/node_modules/detect-libc` |

client→libsqlの字句targetは既採用LIBSQL prefixと一致。未知target realpath/statへ進んだ証拠とは区別する。他4aliasは正式import/requireから導出されたため、次は以下package.json4件だけを提案する。各32,768B、canonical/regular/selfUID/nlink/fullstablehash確認後に正式exports/main/typeを選択し、次JSを別採用へ返す。現時点でfile名を推測して本文を読まない。

| 次exact package.json | 個別cap bytes |
| --- | ---: |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/package.json` | 32,768 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/promise-limit@2.7.0/node_modules/promise-limit/package.json` | 32,768 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@neon-rs+load@0.0.4/node_modules/@neon-rs/load/package.json` | 32,768 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/detect-libc@2.0.2/node_modules/detect-libc/package.json` | 32,768 |

hranaはfile clientでもnode.js/ws/http/hrana.jsのstatic評価経路に含まれる。package静的閉鎖の必要性とHTTP/WebSocketの実呼出は別で、network/socket/HTTP正例の許可0を維持する。@neon-rs/load/detect-libcのpackage宣言・exportsが未読のため、native対象/ABI/dlopen/FD/knownclosureはまだ不明。@libsql/darwin-arm64 addonの新metadata/body読取0、他platform/未知store探索0。

## Boundsと次判断

次候補19JS×65,536B＋4JSON×32,768B＝**個別cap合算1,376,256B**、次round本文≤2MiBを提案。これは次一roundの有限上限であり、whole closure2MiBの証明ではない。先行50JS候補＋次19で69distinct JS候補となり、さらにsyntax node/JSON/bareの正式辺は未確認。確定した全文集合・bytesと未読集合を分け、Rootが次scopeを採用してからだけ読む。newhelper3件の作成は完全closure固定後。

PUBLIC package JS/JSON/native、new selectedSOURCE327、同operation内fresh outputs4、private materialは別型。sourceRootやmainのwalk/Git全走査、package contents探索/glob、native addon read/load、Node eval/import/default/preflight/runtime/DB/browser/network/rootprobe/create、旧完成/失敗SOURCE/build/TMP/results/key/proof/cache等のstat/read/hash/copy/reopen/reuse/cleanupは0。product/helpers/source/Manager正本の変更0。本newphase一pathだけwx600固定し、全文SHA提出後ALL read/writer STOP。
