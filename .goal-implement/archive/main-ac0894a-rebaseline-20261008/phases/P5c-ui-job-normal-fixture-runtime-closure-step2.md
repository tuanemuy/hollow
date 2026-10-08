# 通常fixture 公開runtime closure step2

判定: 採用済み16JSとcore aliasの有限読取はPASS。closure完了、32files/2MiB成立、native loading・通常fixture実行は未成立。次の読取はManagerの採用待ちであり、下記未読targetにはmetadata/body読取を行っていない。

基点: [runtime-closure-plan](P5c-ui-job-normal-fixture-runtime-closure-plan.md) 6340B / SHA256 `5371d50a0fb3174a523dad8541785ec12762426d3e28ca34c501bfed79c4bb81`。先行entry3のmetadata/hash/exportsは同固定PUBLIC報告を借用。今回の直接対象は同計画の16JS＋alias1だけ。製品・helper・Manager正本の編集0、runtime/import/eval/default/preflight/DB/native/rootprobe/create0、全generated/validation/private rootsのstat/read/hash/copy/reopen/cleanup0。

## 直接読取

16JSは各64KiB、合計1MiB以内でNOFOLLOW fullreadし、前後lstat/fstatのdev/ino/size/mode/UID/nlink/mtime/ctime一致とcanonical一致を確認。全regular0644/UID501/nlink1。unique本文124389B。多行import確認のため同16JSを再照合し、直接読取本文合計248778Bで元1MiB枠内。targetコードの実行・Node importは0。

以下の短縮pathは厳密に次のabsolute prefixへ展開する。prefix探索や一般resolverは行わない。

- CSS: `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/`
- CLIENT: `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client/`
- LIBSQL: `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql/`

| 読取済みpath | bytes | SHA256 |
| --- | ---: | --- |
| CSS/lib/syntax/index.js | 275 | a419605b5daf916d5afc872603d1d63e843baa42317d5d7378fc97358dc45712 |
| CSS/lib/version.js | 145 | a47f7641c7856c1683dca31f7d94e92b7f7110104c63fbd6245b24126f1c658f |
| CSS/lib/syntax/create.js | 1604 | 6b17b6b6f894e565124a378788928db01661067059c1a34a0daf929d53019dae |
| CSS/lib/utils/List.js | 12795 | 877cc7541338d107e5b9cebe265107fbe02f60d2c6b68944b2fa4a334e9158c8 |
| CSS/lib/lexer/Lexer.js | 16885 | 818e6d0d35dbfa8d1f4c9a34634c7f1d73dbcef9fc97ec25e599b55ee68e71af |
| CSS/lib/tokenizer/index.js | 20670 | 51d063532994e1e1f7c0c24ac1a8ef0f213e5b97fdc5b17c1aaedfdcde4016df |
| CSS/lib/definition-syntax/index.js | 160 | 7d8f396bc462f16e1a941d452c08c211edd43576f8520019da4271f16ba44e7f |
| CSS/lib/utils/clone.js | 467 | ebee335a4abd5dd5d591b7c960b5782ced9bfad372c0b42efb9e9104ea899f6c |
| CSS/lib/utils/names.js | 2940 | 53e7d8b7a84f5d437be9b18b33b4d28412d83dab3de53659cdc624c54a4b56b9 |
| CSS/lib/utils/ident.js | 3401 | 6e0e3d9ad14c2491d6f5f6d5caed0aca99becdb72f6eb3e80245c2dc1f4a9bf4 |
| CSS/lib/utils/string.js | 3172 | 249c99944c31160a71df74c76c71fe3327939e84243f24d1b9f46d9abf6ea5c4 |
| CSS/lib/utils/url.js | 3227 | c08cb33b48ba773ca988f8dab00c6ce0c7ae17621d8624e204a16b4510531df2 |
| CLIENT/lib-esm/sqlite3.js | 23847 | 453ca868a8f8e9d87362e97ef1d2aabf2039b6afd82b92409c4fee5a5b5a98a0 |
| CLIENT/lib-esm/ws.js | 14385 | 2b80f26df966ede6895431c3a38ff3311f23da48dc5c5a4428ca5306cd3c1bab |
| CLIENT/lib-esm/http.js | 8659 | 6dfb9c6e44f5d6d5ffbfeb00ba9d10700d916f950b4e5ac9e749991f783dc9eb |
| LIBSQL/index.js | 11757 | cc6f0fb815d302185ba69d4f749b423dfe304add1c58d6ff687842f8c1e39152 |

core aliasの直接readlinkは `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/core`、UID501/symlink/前後metadata同値、文字列 `../../../@libsql+core@0.18.0/node_modules/@libsql/core`。lexical targetは `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+core@0.18.0/node_modules/@libsql/core`。targetへのrealpath/stat/body読取0。alias readlinkの採用上限4096B内。

## 次のrelative exact target案

JS候補32（CSS28、CLIENT2、LIBSQL2）＋JSON2。JS各65536B、JSON各32768B、次round本文累積2097152Bで停止する案。これは新読取枠の提案であり、whole closure2MiB保証ではない。canonical/selfUID/regular/nlink1/既public mode0644/stableNOFOLLOW fullhashを各targetで採用後に確認し、例外は停止。存在・bytes・hash・依存辺は未確認。

| 次exact target | formal edge根拠 |
| --- | --- |
| CLIENT/lib-esm/hrana.js | CLIENT/lib-esm/ws.js:4 `./hrana.js`; CLIENT/lib-esm/http.js:4 `./hrana.js` |
| CLIENT/lib-esm/sql_cache.js | CLIENT/lib-esm/ws.js:5 `./sql_cache.js`; CLIENT/lib-esm/http.js:5 `./sql_cache.js` |
| CSS/lib/convertor/create.js | CSS/lib/syntax/create.js:4 `../convertor/create.js` |
| CSS/lib/definition-syntax/SyntaxError.js | CSS/lib/definition-syntax/index.js:1 `./SyntaxError.js` |
| CSS/lib/definition-syntax/generate.js | CSS/lib/definition-syntax/index.js:2 `./generate.js` |
| CSS/lib/definition-syntax/parse.js | CSS/lib/definition-syntax/index.js:3 `./parse.js` |
| CSS/lib/definition-syntax/walk.js | CSS/lib/definition-syntax/index.js:4 `./walk.js` |
| CSS/lib/generator/create.js | CSS/lib/syntax/create.js:3 `../generator/create.js` |
| CSS/lib/lexer/error.js | CSS/lib/lexer/Lexer.js:1 `./error.js` |
| CSS/lib/lexer/generic-const.js | CSS/lib/lexer/Lexer.js:3 `./generic-const.js` |
| CSS/lib/lexer/generic.js | CSS/lib/lexer/Lexer.js:4 `./generic.js` |
| CSS/lib/lexer/match-graph.js | CSS/lib/lexer/Lexer.js:8 `./match-graph.js` |
| CSS/lib/lexer/match.js | CSS/lib/lexer/Lexer.js:9 `./match.js` |
| CSS/lib/lexer/prepare-tokens.js | CSS/lib/lexer/Lexer.js:7 `./prepare-tokens.js` |
| CSS/lib/lexer/search.js | CSS/lib/lexer/Lexer.js:11 `./search.js` |
| CSS/lib/lexer/structure.js | CSS/lib/lexer/Lexer.js:12 `./structure.js` |
| CSS/lib/lexer/trace.js | CSS/lib/lexer/Lexer.js:10 `./trace.js` |
| CSS/lib/lexer/units.js | CSS/lib/lexer/Lexer.js:5 `./units.js` |
| CSS/lib/parser/create.js | CSS/lib/syntax/create.js:2 `../parser/create.js` |
| CSS/lib/syntax/config/lexer.js | CSS/lib/syntax/index.js:2 `./config/lexer.js` |
| CSS/lib/syntax/config/mix.js | CSS/lib/syntax/create.js:7 `./config/mix.js` |
| CSS/lib/syntax/config/parser.js | CSS/lib/syntax/index.js:3 `./config/parser.js` |
| CSS/lib/syntax/config/walker.js | CSS/lib/syntax/index.js:4 `./config/walker.js` |
| CSS/lib/tokenizer/OffsetToLocation.js | CSS/lib/tokenizer/index.js:512 `./OffsetToLocation.js` |
| CSS/lib/tokenizer/TokenStream.js | CSS/lib/tokenizer/index.js:513 `./TokenStream.js` |
| CSS/lib/tokenizer/char-code-definitions.js | CSS/lib/tokenizer/index.js:2 `./char-code-definitions.js`; CSS/lib/tokenizer/index.js:510 `./char-code-definitions.js` |
| CSS/lib/tokenizer/names.js | CSS/lib/tokenizer/index.js:509 `./names.js` |
| CSS/lib/tokenizer/types.js | CSS/lib/tokenizer/index.js:1 `./types.js`; CSS/lib/tokenizer/index.js:507 `./types.js`; CSS/lib/tokenizer/index.js:508 `./types.js` |
| CSS/lib/tokenizer/utils.js | CSS/lib/tokenizer/index.js:15 `./utils.js`; CSS/lib/tokenizer/index.js:511 `./utils.js` |
| CSS/lib/walker/create.js | CSS/lib/syntax/create.js:5 `../walker/create.js` |
| CSS/package.json | CSS/lib/version.js:5 `../package.json` |
| LIBSQL/auth.js | LIBSQL/index.js:54 `require("./auth")`＋先行PUBLIC package.jsonのfiles literal `auth.js`。stock CJS extension候補、実解決未確認 |
| LIBSQL/sqlite-error.js | LIBSQL/index.js:55 `require("./sqlite-error")`＋同files literal。stock CJS extension候補、実解決未確認 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+core@0.18.0/node_modules/@libsql/core/package.json | core aliasの直接readlink lexical target＋node.js/今回3JSの `@libsql/core/api,config,util,uri`。正式exportsの本文確認後だけ次JSを提案 |

CSS static reexportsも評価依存として残す。未使用という理由で辺を落とさない。CSS今回12JS＋先行lib/index.js＋新28JSだけでdistinct41JS候補となり、whole32files枠に収まらない。今回16JS＋先行entryJS2＋新relativeJS32は計50JS候補で、JSON・bare依存・nativeまで含む全体はさらに未確定。未読ファイルの存在や実解決を確認済みにしない。

## 次のbare alias metadata案

各exact sibling aliasのみlstat/readlink（各4096B、計20480B）を先行採用し、target本文やtargetmetadataはさらに正式package.json案を返した後に採用する。既存ancestor探索・fallback・glob・storewalk0。siblingが存在しない場合は停止して不足を返す。

| exact alias path | 元辺 |
| --- | --- |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/libsql | CLIENT/lib-esm/sqlite3.js:1 `libsql`。採用済みLIBSQL/index.jsとはbinding確認を分ける |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/hrana-client | CLIENT/lib-esm/ws.js:1、http.js:1 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/promise-limit | CLIENT/lib-esm/ws.js:8、http.js:8 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/@neon-rs/load | LIBSQL/index.js:3 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/detect-libc | LIBSQL/index.js:4 |

`module`（CSS/version.js:1）と`node:buffer`（CLIENT/sqlite3.js:2）はstock builtin辺として区別し、package target探索を増やさない。core package.jsonからapi/config/util/uriの正式exportsを導出するまでJS target名を推測しない。hrana/http/wsのstatic評価依存とネットワーク実呼出の許可は別であり、外部通信・socket許可0を維持する。

## libsql native境界

LIBSQL/index.js:6–26のrequireNativeは `LIBSQL_JS_DEV` 分岐で`load(__dirname)`、通常分岐で`currentTarget()`と`familySync()`による限定補正後`require(\`@libsql/\${target}\`)`を使う。line52でtop-levelに実呼出するため、単なる後続database-open branchではない。現targetの確定、native addon loading、ABI、FD閉鎖・close proofは未観測。@neon-rs/loadとdetect-libcの正式code/package bindingから有限に導出するまで@libsql/darwin-arm64その他platform targetを追加readしない。既public native metadataの借用はruntime/native closure proofではない。

この段階では未知エントリwalk、native addon/body/read/dlopen、Node eval/import、helper作成、通常fixture実行を行わない。次read枠が採用されても、新正式辺が出た時点でさらにexact targetsを提案し、無制限のrecursive closureへ広げない。closure32/2MiB案は現在の正式辺数に応じたManager補正が必要。本文実測の累積2MiB適否は未確定である。

記録後ALL read STOP。機能受入、native receipt、proof/ACK、UI/DB正常終了、旧失敗原因の確定は0。

UTC: 2026-10-06T11:10:29.432185+00:00
