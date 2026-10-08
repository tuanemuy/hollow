# 通常fixture runtime closure step25: exact JS12・alias6・package metadata4

Root採用 step24 81573B/SHA256 3f1e812b6b7aa74c21fc7dd6693a7dea270b663a1ef07174e8c868fdb48f5c8c の nextRelativeTargets12 / nextAliasReadlink6 / nextPackageJSON5 に限定した。domhandler5のpackage本文は新read0、Root採用step19 4184B/4675a13682cad906b9218a2ceb45889b8e4a05c1b73b29cf0abbd66dd5d2e83d の2241B/cbb42a446eef285863e04158c7f269e0e7b8e868c1042d6845e996d760f7376c rowを借用。両PUBLIC phase自身はstable全文直接読取。

直接本文 JS12/119930B、JSON4/8359B、合計128289B。各JS≤65536、JSON≤32768、round≤2097152。cap超過/未読0。全exact本文をcanonical regular/nonlink0644/UID501/nlink1、O_NOFOLLOW、path/FD前後devino/mode/UID/nlink/bytes/mtime/ctime完全一致・fullSHA・actualFDcloseで確認。nanosecond整数そのものは再表現せず完全一致boolを記録する。alias6はUID501/nlink1のsymlink前後lstat一致/readlink rawbytes≤4096、target stat/realpath/bodyは0。表のtargetはnormpathによる字句導出だけ。

## 正式edgeと条件

新12JSのliteral依存edge20はrelative13、bare3、builtin4。正式require/importのstatementを本文で確認しており、regex抽出だけを完全AST/全実行閉包とは扱わない。entities4.5の4ファイルは生成data/codepointのexportであり、今回抽出範囲のliteral依存edge0。sourceMappingURLコメントはruntimeimportにしない。entities4.5 ESMの条件とhtmlparser2@12 ESMの内部import条件を維持し、sanitize側CJSのrequireを子のESMへ伝播しない。

PostCSS新8JSはCJS require。relative13のうちmap-generator/warn-onceは今回read rowへhash束縛し、input/at-rule/comment/declaration/root/rule/parse/result/stringifyはstep24の既固定rowへ借用できる。tokenize.jsは今回許可12内にもstep24 rows内にもないため、Rootの過去unionでexactrowを去重確認できなければ、CJS './tokenize' から .js一候補を次採用へ提案する。未知extension/index/package fallbackを探索しない。既root/packageexportsで到達済みJSの再読を要求せず、union既hashがあればborrowへ切替できる。

bareはpicocolors、source-map-js（2statement）。前step24のdomutils/htmlparser2/PostCSS formal edge由来alias6も今回readlink-onlyで確認した。domutils3.2内部ESM→dom-serializer/domelementtypeはimport、htmlparser2@12→entities/decodeはimport、PostCSS→picocolors/nanoid/non-secure/source-map-jsはrequire。この条件はimporterの正式syntaxに由来する。

## metadata4と次entry

domelementtype3.0.0/domhandler6.0.1/domutils4.0.2はtype=module、exports['.']のtypesとdefaultのうち通常runtimeはdefault './dist/index.js'。Node requireから入った親の条件を内部importへ流用しない。dayjs1.11.23はexports無し/type無し/main 'dayjs.min.js'で、launderのrequire辺からそのexactentryを提案する。4entry body/metadataはまだ0、constructor/TLA/native等を未確認のまま正常ロード済みにしない。借用domhandler5のimportentryは './lib/esm/index.js'でありversion6/distへ代用しない。

alias6字句targetは dom-serializer2.0.0/domelementtype2.3.0/entities8.0.0/picocolors1.1.1/nanoid3.3.12/source-map-js1.2.1。新package metadataはRoot採用前本文/metadata0。dom-serializer2はstep19既hashからborrow可能、その他も過去Root unionにあれば新read不要。今回entities4.5のdataをentities8.0/decodeのexports/本文へ流用しない。package dependencies宣言のみから追加aliasを探索しない。新4entryの正式edgeを未読のまま予想してnextAliasを増やさない。

## FS/constructor/asyncの未確定

previous-map.jsはconstructorがopts.map===falseで早期returnし、loadMapにはprev関数呼出・sourceMappingURL/opts.fromからloadFileへの分岐がある。loadFileはexistsSync/readFileSyncを呼び得る。したがってmapopts/input束縛無しで「FS0」を主張しない。今回実FSを呼び出していない。map-generatorのannotation関数、stringifierのbuilder/node.type、NoWorkResultのcss.toString/getter/then/env warningも引数とAPIに由来する実行可能枝で、literal closureだけでは不在を証明できない。どのbranchが通常fixtureで実行するか、TLA/requireESM wholegraph合法性・load/native/API閉鎖は未確定。

## 次有限scope提案とbudget

正式次候補は4JSentry＋条件付きtokenize.js各65536（最大327680B）、alias由来metadata6各32768（最大196608B、dom-serializerは既row borrow、他もunion去重優先）。合計候補上限524288B≤round2MiB。各targetは表に列挙し、今回はmetadata/body未操作。new alias readlink追加0。packageJSON採用後のexports/subpath導出は別scopeであり、unknownversion/pathwalkを行わない。

今回read許可とwhole runtime JS256/JSON24/wholebody2MiB/material256KiBは別。全step union/累積materialは再構成していないため、128289Bを累積wholebytesへ置換しない。Rootがunionを固定するまで全closure成立/新helper3/runtime許可は未確定。元budgetを勝手に増やしていない。

## Exact static evidence

以下JSONは採用PUBLIC source/meta/hashと正式edge・次提案だけ。source本文や任意runtime出力を保存しない。borrowedPackageJSONは旧package実物再読0を明示する。

{
  "rows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/decode-data-html.js",
      "bytes": 47724,
      "sha256": "d7d493875740395ad71eaee1457a4e0d53feb5d82eaae98a8640e57754fcb2ac",
      "dev": 16777233,
      "ino": 103434677,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [],
      "syntaxContext": "import"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/decode-data-xml.js",
      "bytes": 279,
      "sha256": "c016ab8ce42a686bfe2267c25120ac3440a4db292cc91399ffa91831e995adbe",
      "dev": 16777233,
      "ino": 103434684,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [],
      "syntaxContext": "import"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode_codepoint.js",
      "bytes": 2112,
      "sha256": "9da79851b2a0213ba13ba8a393a730f9f9779d111baf6d6f6f335a8fb091537e",
      "dev": 16777233,
      "ino": 103434674,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [],
      "syntaxContext": "import"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/encode-html.js",
      "bytes": 27039,
      "sha256": "45150e9a9796346d068dafeee1be8a26eb338456b662da5f3a4dd906816e3112",
      "dev": 16777233,
      "ino": 103434697,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [],
      "syntaxContext": "import"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/symbols.js",
      "bytes": 91,
      "sha256": "eb8ab8b9648d400ec3e8e37e75dc159734b97ba21137f12da11b4afc2547a1b4",
      "dev": 16777233,
      "ino": 103421274,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [],
      "syntaxContext": "require"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/terminal-highlight.js",
      "bytes": 1399,
      "sha256": "27f1eb6cc633f3947e053c96f16b1754bcffcda2742ecc9a1e11cc2a75d70d9b",
      "dev": 16777233,
      "ino": 103421278,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [
        {
          "line": 3,
          "specifier": "picocolors",
          "context": "require",
          "statement": "let pico = require('picocolors')"
        },
        {
          "line": 5,
          "specifier": "./tokenize",
          "context": "require",
          "statement": "let tokenizer = require('./tokenize')"
        }
      ],
      "syntaxContext": "require"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/previous-map.js",
      "bytes": 4508,
      "sha256": "a4ab645c175790e5461aa2218852f9cdcdb88cc3ec1062eb452086ce00f9cf1c",
      "dev": 16777233,
      "ino": 103421249,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [
        {
          "line": 3,
          "specifier": "fs",
          "context": "require",
          "statement": "let { existsSync, readFileSync } = require('fs')"
        },
        {
          "line": 4,
          "specifier": "path",
          "context": "require",
          "statement": "let { dirname, join } = require('path')"
        },
        {
          "line": 5,
          "specifier": "source-map-js",
          "context": "require",
          "statement": "let { SourceMapConsumer, SourceMapGenerator } = require('source-map-js')"
        }
      ],
      "syntaxContext": "require"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/map-generator.js",
      "bytes": 10031,
      "sha256": "feccbc87472d5d1cc660c2bfd4958cbe5442173f03cbfa518808725f684a313c",
      "dev": 16777233,
      "ino": 103421195,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [
        {
          "line": 3,
          "specifier": "path",
          "context": "require",
          "statement": "let { dirname, relative, resolve, sep } = require('path')"
        },
        {
          "line": 4,
          "specifier": "source-map-js",
          "context": "require",
          "statement": "let { SourceMapConsumer, SourceMapGenerator } = require('source-map-js')"
        },
        {
          "line": 5,
          "specifier": "url",
          "context": "require",
          "statement": "let { pathToFileURL } = require('url')"
        },
        {
          "line": 7,
          "specifier": "./input",
          "context": "require",
          "statement": "let Input = require('./input')"
        }
      ],
      "syntaxContext": "require"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warn-once.js",
      "bytes": 256,
      "sha256": "5683ff69eeb8e77373a4bd0e0b9da611c7575ee434ba3c458c0552ab4806464a",
      "dev": 16777233,
      "ino": 103421288,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [],
      "syntaxContext": "require"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringifier.js",
      "bytes": 9026,
      "sha256": "d068c9038a6f7f4b24b9a4252f6c71bde3e84dc8378707ee12d950395d9e074b",
      "dev": 16777233,
      "ino": 103421267,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [],
      "syntaxContext": "require"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser.js",
      "bytes": 14846,
      "sha256": "d4f628a47b16f894d525461d6fc6a6834d45db31c519107b5155319707670d32",
      "dev": 16777233,
      "ino": 103421241,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [
        {
          "line": 3,
          "specifier": "./at-rule",
          "context": "require",
          "statement": "let AtRule = require('./at-rule')"
        },
        {
          "line": 4,
          "specifier": "./comment",
          "context": "require",
          "statement": "let Comment = require('./comment')"
        },
        {
          "line": 5,
          "specifier": "./declaration",
          "context": "require",
          "statement": "let Declaration = require('./declaration')"
        },
        {
          "line": 6,
          "specifier": "./root",
          "context": "require",
          "statement": "let Root = require('./root')"
        },
        {
          "line": 7,
          "specifier": "./rule",
          "context": "require",
          "statement": "let Rule = require('./rule')"
        },
        {
          "line": 8,
          "specifier": "./tokenize",
          "context": "require",
          "statement": "let tokenizer = require('./tokenize')"
        }
      ],
      "syntaxContext": "require"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/no-work-result.js",
      "bytes": 2619,
      "sha256": "11e06a9b30ab844b877f489ad7870e2a319507aed4554a58a757b7dfd7699505",
      "dev": 16777233,
      "ino": 103421210,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "edges": [
        {
          "line": 3,
          "specifier": "./map-generator",
          "context": "require",
          "statement": "let MapGenerator = require('./map-generator')"
        },
        {
          "line": 4,
          "specifier": "./parse",
          "context": "require",
          "statement": "let parse = require('./parse')"
        },
        {
          "line": 5,
          "specifier": "./result",
          "context": "require",
          "statement": "let Result = require('./result')"
        },
        {
          "line": 6,
          "specifier": "./stringify",
          "context": "require",
          "statement": "let stringify = require('./stringify')"
        },
        {
          "line": 7,
          "specifier": "./warn-once",
          "context": "require",
          "statement": "let warnOnce = require('./warn-once')"
        }
      ],
      "syntaxContext": "require"
    }
  ],
  "aliases": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/dom-serializer",
      "targetLiteral": "../../dom-serializer@2.0.0/node_modules/dom-serializer",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/dom-serializer",
      "uid": 501,
      "nlink": 1,
      "dev": 16777233,
      "ino": 103422425,
      "mode": 493,
      "stable": true,
      "targetFollow": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domelementtype",
      "targetLiteral": "../../domelementtype@2.3.0/node_modules/domelementtype",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype",
      "uid": 501,
      "nlink": 1,
      "dev": 16777233,
      "ino": 103422427,
      "mode": 493,
      "stable": true,
      "targetFollow": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/entities",
      "targetLiteral": "../../entities@8.0.0/node_modules/entities",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities",
      "uid": 501,
      "nlink": 1,
      "dev": 16777233,
      "ino": 103510966,
      "mode": 493,
      "stable": true,
      "targetFollow": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/picocolors",
      "targetLiteral": "../../picocolors@1.1.1/node_modules/picocolors",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/picocolors@1.1.1/node_modules/picocolors",
      "uid": 501,
      "nlink": 1,
      "dev": 16777233,
      "ino": 103420115,
      "mode": 493,
      "stable": true,
      "targetFollow": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/nanoid",
      "targetLiteral": "../../nanoid@3.3.12/node_modules/nanoid",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/nanoid@3.3.12/node_modules/nanoid",
      "uid": 501,
      "nlink": 1,
      "dev": 16777233,
      "ino": 103420114,
      "mode": 493,
      "stable": true,
      "targetFollow": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/source-map-js",
      "targetLiteral": "../../source-map-js@1.2.1/node_modules/source-map-js",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js",
      "uid": 501,
      "nlink": 1,
      "dev": 16777233,
      "ino": 103420116,
      "mode": 493,
      "stable": true,
      "targetFollow": false
    }
  ],
  "metadataRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype/package.json",
      "bytes": 1559,
      "sha256": "6aef69cf18e284cbda52541d945e839b99163f537f4d53c0764bb2d1be2b179e",
      "dev": 16777233,
      "ino": 103511084,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "context": "import",
      "package": {
        "name": "domelementtype",
        "version": "3.0.0",
        "type": "module",
        "main": "dist/index.js",
        "module": null,
        "exports": {
          ".": {
            "types": "./dist/index.d.ts",
            "default": "./dist/index.js"
          }
        },
        "dependencies": null,
        "optionalDependencies": null,
        "imports": null
      }
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/package.json",
      "bytes": 1906,
      "sha256": "2132f2aabc2f6628cb99040c66a2a4378e30a1df05130e7c706eea7576c38ffe",
      "dev": 16777233,
      "ino": 103511230,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "context": "import",
      "package": {
        "name": "domhandler",
        "version": "6.0.1",
        "type": "module",
        "main": "dist/index.js",
        "module": null,
        "exports": {
          ".": {
            "types": "./dist/index.d.ts",
            "default": "./dist/index.js"
          }
        },
        "dependencies": {
          "domelementtype": "^3.0.0"
        },
        "optionalDependencies": null,
        "imports": null
      }
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/package.json",
      "bytes": 1920,
      "sha256": "574c1892db5635787664a6da36fb37081496d8dbba6d32e21413805fcae20899",
      "dev": 16777233,
      "ino": 103511339,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "context": "import",
      "package": {
        "name": "domutils",
        "version": "4.0.2",
        "type": "module",
        "main": "./dist/index.js",
        "module": null,
        "exports": {
          ".": {
            "types": "./dist/index.d.ts",
            "default": "./dist/index.js"
          }
        },
        "dependencies": {
          "dom-serializer": "^3.0.0",
          "domelementtype": "^3.0.0",
          "domhandler": "^6.0.0"
        },
        "optionalDependencies": null,
        "imports": null
      }
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dayjs@1.11.23/node_modules/dayjs/package.json",
      "bytes": 2974,
      "sha256": "680d74784223a074188617adc534fa5460171176d9904501241bbea087c3963b",
      "dev": 16777233,
      "ino": 103511839,
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "actualFDClosed": true,
      "context": "require",
      "package": {
        "name": "dayjs",
        "version": "1.11.23",
        "type": null,
        "main": "dayjs.min.js",
        "module": null,
        "exports": null,
        "dependencies": null,
        "optionalDependencies": null,
        "imports": null
      }
    }
  ],
  "relativeEdges": [
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/terminal-highlight.js",
      "line": 5,
      "specifier": "./tokenize",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/tokenize",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/tokenize.js",
      "status": "PRIOR_UNION_HASH_REQUIRED_OR_NEXT_EXACT_JS_PROPOSAL"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/map-generator.js",
      "line": 7,
      "specifier": "./input",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input.js",
      "status": "STEP24_ROW_HASH_BORROW"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser.js",
      "line": 3,
      "specifier": "./at-rule",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/at-rule",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/at-rule.js",
      "status": "STEP24_ROW_HASH_BORROW"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser.js",
      "line": 4,
      "specifier": "./comment",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/comment",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/comment.js",
      "status": "STEP24_ROW_HASH_BORROW"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser.js",
      "line": 5,
      "specifier": "./declaration",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/declaration",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/declaration.js",
      "status": "STEP24_ROW_HASH_BORROW"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser.js",
      "line": 6,
      "specifier": "./root",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root.js",
      "status": "STEP24_ROW_HASH_BORROW"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser.js",
      "line": 7,
      "specifier": "./rule",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/rule",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/rule.js",
      "status": "STEP24_ROW_HASH_BORROW"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser.js",
      "line": 8,
      "specifier": "./tokenize",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/tokenize",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/tokenize.js",
      "status": "PRIOR_UNION_HASH_REQUIRED_OR_NEXT_EXACT_JS_PROPOSAL"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/no-work-result.js",
      "line": 3,
      "specifier": "./map-generator",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/map-generator",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/map-generator.js",
      "status": "CURRENT_ROUND_HASH_BOUND"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/no-work-result.js",
      "line": 4,
      "specifier": "./parse",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parse",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parse.js",
      "status": "STEP24_ROW_HASH_BORROW"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/no-work-result.js",
      "line": 5,
      "specifier": "./result",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/result",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/result.js",
      "status": "STEP24_ROW_HASH_BORROW"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/no-work-result.js",
      "line": 6,
      "specifier": "./stringify",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringify",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringify.js",
      "status": "STEP24_ROW_HASH_BORROW"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/no-work-result.js",
      "line": 7,
      "specifier": "./warn-once",
      "context": "require",
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warn-once",
      "proposedJSCandidate": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warn-once.js",
      "status": "CURRENT_ROUND_HASH_BOUND"
    }
  ],
  "nextRelativeTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/tokenize.js",
      "context": "require",
      "cap": 65536,
      "status": "CONDITIONAL_ON_ROOT_PRIOR_UNION_DEDUP"
    }
  ],
  "nextPackageJSON": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/dom-serializer/package.json",
      "context": "import",
      "subpath": ".",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/dom-serializer",
      "status": "STEP19_BORROW_2019_098603e7",
      "cap": 32768
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/package.json",
      "context": "import",
      "subpath": ".",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domelementtype",
      "status": "NEXT_EXACT_METADATA_PROPOSAL_OR_PRIOR_UNION_DEDUP",
      "cap": 32768
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/package.json",
      "context": "import",
      "subpath": "./decode",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/entities",
      "status": "NEXT_EXACT_METADATA_PROPOSAL_OR_PRIOR_UNION_DEDUP",
      "cap": 32768
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/picocolors@1.1.1/node_modules/picocolors/package.json",
      "context": "require",
      "subpath": ".",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/picocolors",
      "status": "NEXT_EXACT_METADATA_PROPOSAL_OR_PRIOR_UNION_DEDUP",
      "cap": 32768
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/nanoid@3.3.12/node_modules/nanoid/package.json",
      "context": "require",
      "subpath": "./non-secure",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/nanoid",
      "status": "NEXT_EXACT_METADATA_PROPOSAL_OR_PRIOR_UNION_DEDUP",
      "cap": 32768
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/package.json",
      "context": "require",
      "subpath": ".",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/source-map-js",
      "status": "NEXT_EXACT_METADATA_PROPOSAL_OR_PRIOR_UNION_DEDUP",
      "cap": 32768
    }
  ],
  "nextEntryTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype/dist/index.js",
      "context": "import",
      "sourcePackageJSON": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype/package.json",
      "condition": "exports_dot_default_types_not_runtime",
      "type": "module",
      "status": "NEXT_EXACT_ENTRY_BODY_PROPOSAL",
      "cap": 65536
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/index.js",
      "context": "import",
      "sourcePackageJSON": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/package.json",
      "condition": "exports_dot_default_types_not_runtime",
      "type": "module",
      "status": "NEXT_EXACT_ENTRY_BODY_PROPOSAL",
      "cap": 65536
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "context": "import",
      "sourcePackageJSON": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/package.json",
      "condition": "exports_dot_default_types_not_runtime",
      "type": "module",
      "status": "NEXT_EXACT_ENTRY_BODY_PROPOSAL",
      "cap": 65536
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dayjs@1.11.23/node_modules/dayjs/dayjs.min.js",
      "context": "require",
      "sourcePackageJSON": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dayjs@1.11.23/node_modules/dayjs/package.json",
      "condition": "exports_absent_main",
      "type": null,
      "status": "NEXT_EXACT_ENTRY_BODY_PROPOSAL",
      "cap": 65536
    }
  ],
  "nextAliasReadlink": [],
  "borrowedPackageJSON": {
    "sourceReport": "P5c-ui-job-normal-fixture-runtime-closure-step19.md",
    "reportBytes": 4184,
    "reportSha256": "4675a13682cad906b9218a2ceb45889b8e4a05c1b73b29cf0abbd66dd5d2e83d",
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/package.json",
    "bytes": 2241,
    "sha256": "cbb42a446eef285863e04158c7f269e0e7b8e868c1042d6845e996d760f7376c",
    "context": "import",
    "entry": "./lib/esm/index.js",
    "packageBodyReread": false
  },
  "counts": {
    "directJS": 12,
    "directJSBytes": 119930,
    "directJSON": 4,
    "directJSONBytes": 8359,
    "directBodyTotal": 128289,
    "aliasesReadlinkOnly": 6,
    "literalEdges": 20,
    "relativeEdges": 13,
    "bareEdges": 3,
    "builtinEdges": 4,
    "nextRelativeCandidates": 1,
    "nextEntryCandidates": 4,
    "nextPackageJSONCandidates": 6,
    "nextMetadataBorrowedStep19": 1
  },
  "runtime": false,
  "globalUnionComplete": false
}

## STOP

新phaseのみwx0600/O_EXCL/O_NOFOLLOW/fsync/実FDclose/postread fullstable固定。SOURCE/product/main/C0/C1/S5/P5d/helper3/Manager/既phase編集0。runtime/native/DB/import/default/CLI fixture/build/通信/rootprobe/create及び全旧generated/private/source/build/results/TMP/cache/key/proof操作0。全reader/writer STOP、session0。次scope/union/工具実装はRoot別採用。
