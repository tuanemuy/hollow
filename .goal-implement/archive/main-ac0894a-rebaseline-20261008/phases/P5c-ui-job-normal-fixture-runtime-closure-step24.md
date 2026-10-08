# 通常fixture runtime closure step24: exact JS30・alias5・ESM metadata3

Root 採用 step23 の relativeProposals30unique を限定読取した。明示 .js は literalTarget、extensionless CJS は追加採用された .js 一候補だけであり、Node fallback 探索を行っていない。bareAliasProposals5 は readlink-only、target stat/body/realpath/canonical probe は0。追加採用 package metadata3 は exact lib/esm/package.json だけ。

実 SOURCE fullread は JS30/174683B、JSON3/54B、合計174737B。全JS≤65536、全JSON≤32768、round≤2097152で cap 超過による未読0。各 canonical/nonlink/regular mode0644/UID501/nlink1、O_NOFOLLOW fullread、pathとFDのdev/ino/mode/UID/nlink/bytes/mtime/ctime前後一致、fullSHA、actualFDcloseを確認。下表 metadataは整数のdev/ino/mode/UID/nlink/sizeとexact等値boolを記録し、nanosecond時刻は浮動小数へ丸めた値を記載せず、Python整数で行った前後完全一致の結果だけを残す。aliasはUID501/nlink1/symlink、rawbytes≤4096、lstat/readlink/lstat安定。link以外のtargetは全未操作。

## resolver条件の訂正

step23 importContext はentryへ入った親側contextである。htmlparser2@12 の package root type=moduleはstep22根拠を借用し、今回Parser.js/Tokenizer.jsの正式構文はimport。sanitize側requireを内部edgeへ伝播しない。同package内relativeはimport、Tokenizer→entities/decodeもimport。step23のhtmlparser2 entry bare3（domelementtype/domhandler/domutils）は同じ規則からimport条件へ訂正した。

domelementtype2.3/entities4.5/domutils3.2の今回 exact lib/esm/package.json は3とも {"type":"module"}。root type:nullでも最寄りの明示esm package境界を保持する。PostCSS libの正式 requireはrequire条件のまま。source syntaxから各edgeの条件を派生し、parent contextやpackage名だけで流用しない。

static literal import/reexport/requireを抽出し、本文の該当正式statementを確認した。regexだけを完全部分AST/評価閉包として扱わない。relative54・bare11・builtin path/url2。same-round既読relativeはhash固定rowへ束縛できるが、全runtime closureの完成とは異なる。既source/modulesのキャッシュ、constructor実体、TLA、require(ESM) wholegraph合法性を実行で調べていない。

## alias5 の字句結果

domutils3.2→domhandler5.0.3、htmlparser2@12→domelementtype3.0.0/domhandler6.0.1/domutils4.0.2、launder→dayjs1.11.23へnormpathだけで到達。特に旧domelementtype2.3/domhandler5/domutils3.2のentry検証を新htmlparser2のversion3/6/4へ流用しない。target存在/canonical/regular/hash/exportsは未観測。各target package.jsonは次Root exactread提案のみ。domhandler5 package metadataが過去採用済ならRoot既hashを去重借用可能だが、このstep24ではbody再読も同値確認もしていない。

## 次finite scope と未閉包

relative未読12unique: entities generated decode-html/decode-xml/encode-html と decode_codepoint の4、PostCSS symbols/terminal-highlight/previous-map/map-generator/warn-once/stringifier/parser/no-work-result の8。各 exactpathはJSONのnextRelativeTargetsに列挙。.js postfixは採用済条件を保持し、他extension/index/packagefallbackを提案しない。追加target metadata/bodyはまだ0。

bare新alias6unique: domutilsのdom-serializer/domelementtype、htmlparser2のentities（正式subpath /decode、import条件）、PostCSSのpicocolors/nanoid（/non-secure）/source-map-js。各 readlink-only 次提案。alias targetを推測versionで探さず、正式exports/subpathはtarget metadata採用後の別段階。既same-rounddomutils→domhandler aliasは再読不要としてedgeに対応させる。

追加未読packageJSON5はalias5のlexicalTarget/package.jsonから導出したものだけ。new3fixturehelpers/source/build generation/load/native許可を意味しない。nativeAddon/architecture/ABI/普通libsql nativeロードscopeへ新許可は加えない。

Parser.js:195は options.Tokenizer ?? Tokenizer のconstructor選択、PostCSS node.js:9はclone時 obj.constructor、lazy-result/processorはplugin等を呼べる正式APIを含む。literaledgeの閉包だけでは引数から呼ぶconstructor/plugin/input optionsを束縛したことにならない。今回fixtureの実inputsを評価してこれらが不在/未実行とは主張しない。lazy-resultのawaitはメソッド内を確認したが、未読全依存を含むTLA無し/requireESM合法性は未確定。PostCSS NODE_ENV分岐は元SOURCEであり、今回env/flags変更0。previous-map/map-generator未読なのでfilesystem不要を推定しない。

whole runtime JS256/JSON24/wholebody2097152/material256KiBは不変更。今回はexact roundのcount/bytesのみ確認し、過去全stepのunionを再構成していない。174737Bを累積wholebodyとして置換せず、cumulative JS/JSON/material capと全bare/subpath/constructor/async-load依存は未確定条件を残す。Rootが去重unionを採用するまでは完全閉包や新load permissionに昇格しない。

## Exact static evidence

以下JSONは読み取ったsource/hash/metaと正式edge／次候補だけ。source本文や任意runtime出力を保存していない。リンク文字列は採用済public scopeのみ。dev/inoはPUBLIC file metadataであってnativehandle/proofではない。

{
  "sourceReport": {
    "path": ".goal-implement/phases/P5c-ui-job-normal-fixture-runtime-closure-step23.md",
    "bytes": 17225,
    "sha256": "39e4e2c4fcb024770e984a321b3c32c16499d600b7d51c820884a60bf74d365a",
    "stable": true
  },
  "priorStep22Borrow": {
    "bytes": 47558,
    "sha256": "f467235b83993720af17748560a0f29069345518995fc200f120c23408f28ca2",
    "reread": false
  },
  "rows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode.js",
      "status": "read",
      "bytes": 19810,
      "sha256": "cf3b65f4843c7dde17e938492454a95c6c24cff25cb6e9355ba915f37de1ca1f",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103434694,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 19810,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "import",
          "specifier": "./generated/decode-data-html.js",
          "context": "import",
          "line": 1
        },
        {
          "syntax": "import",
          "specifier": "./generated/decode-data-xml.js",
          "context": "import",
          "line": 2
        },
        {
          "syntax": "import",
          "specifier": "./decode_codepoint.js",
          "context": "import",
          "line": 3
        },
        {
          "syntax": "export",
          "specifier": "./decode_codepoint.js",
          "context": "import",
          "line": 6
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/encode.js",
      "status": "read",
      "bytes": 2569,
      "sha256": "c79e3ffa191a5fba999eaafc975d9888a073f38562ee036dd55a856b01510823",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103434706,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 2569,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "import",
          "specifier": "./generated/encode-html.js",
          "context": "import",
          "line": 1
        },
        {
          "syntax": "import",
          "specifier": "./escape.js",
          "context": "import",
          "line": 2
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/escape.js",
      "status": "read",
      "bytes": 3965,
      "sha256": "cff4eb409e374c49311df5868a8957e9216955ec5207be1951deee2a54c8abf0",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103434711,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 3965,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": []
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/feeds.js",
      "status": "read",
      "bytes": 5981,
      "sha256": "2ecf2b79c06dbaae1773f7bdb07fbb0941bd9c23fcf46c9ecc173d5b65d001c1",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103433936,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 5981,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "import",
          "specifier": "./stringify.js",
          "context": "import",
          "line": 1
        },
        {
          "syntax": "import",
          "specifier": "./legacy.js",
          "context": "import",
          "line": 2
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/helpers.js",
      "status": "read",
      "bytes": 4981,
      "sha256": "20d83b6e9376b599b89c63f96ab9fadae6c29e46f0575b2b26ca239283593762",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103433944,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 4981,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "import",
          "specifier": "domhandler",
          "context": "import",
          "line": 1
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/legacy.js",
      "status": "read",
      "bytes": 5209,
      "sha256": "b02fe32740e3da1ae8628f1121e596b9cc5daac3d495a6dcf8bfef6939c4b84b",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103433959,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 5209,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "import",
          "specifier": "domhandler",
          "context": "import",
          "line": 1
        },
        {
          "syntax": "import",
          "specifier": "./querying.js",
          "context": "import",
          "line": 2
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/manipulation.js",
      "status": "read",
      "bytes": 3376,
      "sha256": "f5754e91f5f33f5798c0f28bcb2631d01b6ebe36157c743b8c1e529859e8ef08",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103433968,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 3376,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": []
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/querying.js",
      "status": "read",
      "bytes": 5124,
      "sha256": "641c0844f7aff8ecbda8b150d5469ea3439ab85ec6ab0f6139eafabfd2c6ae45",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103433976,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 5124,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "import",
          "specifier": "domhandler",
          "context": "import",
          "line": 1
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/stringify.js",
      "status": "read",
      "bytes": 2562,
      "sha256": "773aa58839e56a9edf9c9af62e7a206782c72b8370e14ba39faa190e5065c6ac",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103433983,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 2562,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "import",
          "specifier": "domhandler",
          "context": "import",
          "line": 1
        },
        {
          "syntax": "import",
          "specifier": "dom-serializer",
          "context": "import",
          "line": 2
        },
        {
          "syntax": "import",
          "specifier": "domelementtype",
          "context": "import",
          "line": 3
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/traversal.js",
      "status": "read",
      "bytes": 3092,
      "sha256": "210852290d70c715e9164a1ec94cc09a6dc926740e91d08205841f47f4546691",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103433991,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 3092,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "import",
          "specifier": "domhandler",
          "context": "import",
          "line": 1
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/Parser.js",
      "status": "read",
      "bytes": 21036,
      "sha256": "b7bfa388ba057b2c41c899fb6375144b3ef86ce0967c047d7fe6bd37c1c4a45b",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103511283,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 21036,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "import",
          "specifier": "./Tokenizer.js",
          "context": "import",
          "line": 2
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/Tokenizer.js",
      "status": "read",
      "bytes": 40603,
      "sha256": "a72bbfa5eafa92fdbfb5c3d7e73f7e327ea5a05843f0b2e2821504d433821749",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103511285,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 40603,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "import",
          "specifier": "entities/decode",
          "context": "import",
          "line": 1
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/at-rule.js",
      "status": "read",
      "bytes": 471,
      "sha256": "33b932bda8f304e9838a70232673326b6c0fd5fa030df35071bf36c127042a0b",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421136,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 471,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./container",
          "context": "require",
          "line": 3
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/comment.js",
      "status": "read",
      "bytes": 203,
      "sha256": "674385438f42526f2c05c19dfb66fcc521f5cf180ccc85b3215ad5c07ac21a40",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421138,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 203,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./node",
          "context": "require",
          "line": 3
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "status": "read",
      "bytes": 10647,
      "sha256": "0f8aaa013a910e142be706c3d6f54a3ce04751a08df3f17ed3a61bb91f863c39",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421141,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 10647,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./comment",
          "context": "require",
          "line": 3
        },
        {
          "syntax": "require",
          "specifier": "./declaration",
          "context": "require",
          "line": 4
        },
        {
          "syntax": "require",
          "specifier": "./node",
          "context": "require",
          "line": 5
        },
        {
          "syntax": "require",
          "specifier": "./symbols",
          "context": "require",
          "line": 6
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/css-syntax-error.js",
      "status": "read",
      "bytes": 3402,
      "sha256": "904b4bb371539a6303e4e211f0a8991fde7bc94d8674253d627389ff291d0ec1",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421143,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 3402,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "picocolors",
          "context": "require",
          "line": 3
        },
        {
          "syntax": "require",
          "specifier": "./terminal-highlight",
          "context": "require",
          "line": 5
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/declaration.js",
      "status": "read",
      "bytes": 495,
      "sha256": "2ccb78406c7a45aab26fc463a0fe5e3e855caf3ab1ba283616ae867046aa3b54",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421157,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 495,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./node",
          "context": "require",
          "line": 3
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/document.js",
      "status": "read",
      "bytes": 654,
      "sha256": "f66f02fde48389fe1a361a8f71da7ee0236a49c94cf22378e70ba6a2e9f4fab1",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421164,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 654,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./container",
          "context": "require",
          "line": 3
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/fromJSON.js",
      "status": "read",
      "bytes": 1506,
      "sha256": "5087cfda6c555ac560cfec7f6c5904c07835da403e398e6b03f078f8107c129f",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421177,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 1506,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./at-rule",
          "context": "require",
          "line": 3
        },
        {
          "syntax": "require",
          "specifier": "./comment",
          "context": "require",
          "line": 4
        },
        {
          "syntax": "require",
          "specifier": "./declaration",
          "context": "require",
          "line": 5
        },
        {
          "syntax": "require",
          "specifier": "./input",
          "context": "require",
          "line": 6
        },
        {
          "syntax": "require",
          "specifier": "./previous-map",
          "context": "require",
          "line": 7
        },
        {
          "syntax": "require",
          "specifier": "./root",
          "context": "require",
          "line": 8
        },
        {
          "syntax": "require",
          "specifier": "./rule",
          "context": "require",
          "line": 9
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input.js",
      "status": "read",
      "bytes": 6798,
      "sha256": "38ed1e1f808377ace0762860b08dbcb3a5ea87c4d8281a380bd5e0cce0789d44",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421183,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 6798,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "nanoid/non-secure",
          "context": "require",
          "line": 3
        },
        {
          "syntax": "require",
          "specifier": "path",
          "context": "require",
          "line": 4
        },
        {
          "syntax": "require",
          "specifier": "source-map-js",
          "context": "require",
          "line": 5
        },
        {
          "syntax": "require",
          "specifier": "url",
          "context": "require",
          "line": 6
        },
        {
          "syntax": "require",
          "specifier": "./css-syntax-error",
          "context": "require",
          "line": 8
        },
        {
          "syntax": "require",
          "specifier": "./previous-map",
          "context": "require",
          "line": 9
        },
        {
          "syntax": "require",
          "specifier": "./terminal-highlight",
          "context": "require",
          "line": 10
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "status": "read",
      "bytes": 13869,
      "sha256": "16c1305def71004a5feff77b5b4c38f2e9c2148b29460df65c078d12889227dd",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421188,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 13869,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./container",
          "context": "require",
          "line": 3
        },
        {
          "syntax": "require",
          "specifier": "./document",
          "context": "require",
          "line": 4
        },
        {
          "syntax": "require",
          "specifier": "./map-generator",
          "context": "require",
          "line": 5
        },
        {
          "syntax": "require",
          "specifier": "./parse",
          "context": "require",
          "line": 6
        },
        {
          "syntax": "require",
          "specifier": "./result",
          "context": "require",
          "line": 7
        },
        {
          "syntax": "require",
          "specifier": "./root",
          "context": "require",
          "line": 8
        },
        {
          "syntax": "require",
          "specifier": "./stringify",
          "context": "require",
          "line": 9
        },
        {
          "syntax": "require",
          "specifier": "./symbols",
          "context": "require",
          "line": 10
        },
        {
          "syntax": "require",
          "specifier": "./warn-once",
          "context": "require",
          "line": 11
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/list.js",
      "status": "read",
      "bytes": 1227,
      "sha256": "6df35bac40d4c449ae8e9078776e5c17c529337830a01472761902a546032f52",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421190,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 1227,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": []
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node.js",
      "status": "read",
      "bytes": 10719,
      "sha256": "a4cfc9d293a44d9d2a7966731532d39f65f3ef4ea232032b250fe272730eb098",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421213,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 10719,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./css-syntax-error",
          "context": "require",
          "line": 3
        },
        {
          "syntax": "require",
          "specifier": "./stringifier",
          "context": "require",
          "line": 4
        },
        {
          "syntax": "require",
          "specifier": "./stringify",
          "context": "require",
          "line": 5
        },
        {
          "syntax": "require",
          "specifier": "./symbols",
          "context": "require",
          "line": 6
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parse.js",
      "status": "read",
      "bytes": 1147,
      "sha256": "7662c5ad1fd5f97a7c1615f0e5e7bc268e762916bcf6fb7bf9dda45537493764",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421218,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 1147,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./container",
          "context": "require",
          "line": 3
        },
        {
          "syntax": "require",
          "specifier": "./input",
          "context": "require",
          "line": 4
        },
        {
          "syntax": "require",
          "specifier": "./parser",
          "context": "require",
          "line": 5
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/processor.js",
      "status": "read",
      "bytes": 1739,
      "sha256": "033d881de301032bc0aad6ccdf5512aa404ce45826183136e78623e26e4b3434",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421252,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 1739,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./document",
          "context": "require",
          "line": 3
        },
        {
          "syntax": "require",
          "specifier": "./lazy-result",
          "context": "require",
          "line": 4
        },
        {
          "syntax": "require",
          "specifier": "./no-work-result",
          "context": "require",
          "line": 5
        },
        {
          "syntax": "require",
          "specifier": "./root",
          "context": "require",
          "line": 6
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/result.js",
      "status": "read",
      "bytes": 738,
      "sha256": "b4239438538d41187fc9a572c83bb89b09524301764ebd4f46c71fe31edd04dd",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421255,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 738,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./warning",
          "context": "require",
          "line": 3
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root.js",
      "status": "read",
      "bytes": 1239,
      "sha256": "66bf461dbd984702272d737e8dc86a254b0481ae7934162f4ce0b32d9a19ec76",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421259,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 1239,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./container",
          "context": "require",
          "line": 3
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/rule.js",
      "status": "read",
      "bytes": 569,
      "sha256": "216ca23a33b1a0145c7925daa442a34e33a9ea41c6f3bb58fca7c4fb355e0166",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421263,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 569,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./container",
          "context": "require",
          "line": 3
        },
        {
          "syntax": "require",
          "specifier": "./list",
          "context": "require",
          "line": 4
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringify.js",
      "status": "read",
      "bytes": 213,
      "sha256": "99229cdda200513f88f7fee46004d5c39c1492a73451509e66164d26dff34abc",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421271,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 213,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": [
        {
          "syntax": "require",
          "specifier": "./stringifier",
          "context": "require",
          "line": 3
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warning.js",
      "status": "read",
      "bytes": 739,
      "sha256": "a969d1ec8a5025c028278ee037cc21c5c7b8129e80269ea3bd8d831a957474fa",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "metadata": {
        "dev": 16777233,
        "ino": 103421291,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 739,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      },
      "literalEdges": []
    }
  ],
  "metadataRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/lib/esm/package.json",
      "status": "read",
      "bytes": 18,
      "sha256": "1239d4d885dcad42201a27ed9324f8f0f760b78700d8db9ced39a511cffe7eae",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "json": {
        "type": "module"
      },
      "metadata": {
        "dev": 16777233,
        "ino": 103433829,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 18,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      }
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/package.json",
      "status": "read",
      "bytes": 18,
      "sha256": "1239d4d885dcad42201a27ed9324f8f0f760b78700d8db9ced39a511cffe7eae",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "json": {
        "type": "module"
      },
      "metadata": {
        "dev": 16777233,
        "ino": 103434719,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 18,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      }
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/package.json",
      "status": "read",
      "bytes": 18,
      "sha256": "1239d4d885dcad42201a27ed9324f8f0f760b78700d8db9ced39a511cffe7eae",
      "mode": "0o644",
      "canonical": true,
      "fdClosed": true,
      "json": {
        "type": "module"
      },
      "metadata": {
        "dev": 16777233,
        "ino": 103433999,
        "fileMode": 33188,
        "uid": 501,
        "nlink": 1,
        "size": 18,
        "pathAndFDStatsEqual": true,
        "mtimeCtimeEqual": true
      }
    }
  ],
  "aliases": [
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/index.js",
      "specifier": "domhandler",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domhandler",
      "context": "import",
      "rawTarget": "../../domhandler@5.0.3/node_modules/domhandler",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler",
      "follow": false,
      "metadata": {
        "dev": 16777233,
        "ino": 103422428,
        "fileMode": 41453,
        "uid": 501,
        "nlink": 1,
        "size": 46,
        "lstatBeforeAfterEqual": true,
        "mtimeCtimeEqual": true
      },
      "targetStatReadCanonical": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/index.js",
      "specifier": "domelementtype",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/domelementtype",
      "context": "import",
      "rawTarget": "../../domelementtype@3.0.0/node_modules/domelementtype",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype",
      "follow": false,
      "metadata": {
        "dev": 16777233,
        "ino": 103510967,
        "fileMode": 41453,
        "uid": 501,
        "nlink": 1,
        "size": 54,
        "lstatBeforeAfterEqual": true,
        "mtimeCtimeEqual": true
      },
      "targetStatReadCanonical": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/index.js",
      "specifier": "domhandler",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/domhandler",
      "context": "import",
      "rawTarget": "../../domhandler@6.0.1/node_modules/domhandler",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler",
      "follow": false,
      "metadata": {
        "dev": 16777233,
        "ino": 103510969,
        "fileMode": 41453,
        "uid": 501,
        "nlink": 1,
        "size": 46,
        "lstatBeforeAfterEqual": true,
        "mtimeCtimeEqual": true
      },
      "targetStatReadCanonical": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/index.js",
      "specifier": "domutils",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/domutils",
      "context": "import",
      "rawTarget": "../../domutils@4.0.2/node_modules/domutils",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils",
      "follow": false,
      "metadata": {
        "dev": 16777233,
        "ino": 103510968,
        "fileMode": 41453,
        "uid": 501,
        "nlink": 1,
        "size": 42,
        "lstatBeforeAfterEqual": true,
        "mtimeCtimeEqual": true
      },
      "targetStatReadCanonical": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/launder@1.7.1/node_modules/launder/index.js",
      "specifier": "dayjs",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/launder@1.7.1/node_modules/dayjs",
      "context": "require",
      "rawTarget": "../../dayjs@1.11.23/node_modules/dayjs",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dayjs@1.11.23/node_modules/dayjs",
      "follow": false,
      "metadata": {
        "dev": 16777233,
        "ino": 103510977,
        "fileMode": 41453,
        "uid": 501,
        "nlink": 1,
        "size": 38,
        "lstatBeforeAfterEqual": true,
        "mtimeCtimeEqual": true
      },
      "targetStatReadCanonical": false
    }
  ],
  "relativeEdges": [
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode.js",
      "syntax": "import",
      "specifier": "./generated/decode-data-html.js",
      "context": "import",
      "line": 1,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/decode-data-html.js",
      "extensionless": false,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/decode-data-html.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode.js",
      "syntax": "import",
      "specifier": "./generated/decode-data-xml.js",
      "context": "import",
      "line": 2,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/decode-data-xml.js",
      "extensionless": false,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/decode-data-xml.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode.js",
      "syntax": "import",
      "specifier": "./decode_codepoint.js",
      "context": "import",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode_codepoint.js",
      "extensionless": false,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode_codepoint.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode.js",
      "syntax": "export",
      "specifier": "./decode_codepoint.js",
      "context": "import",
      "line": 6,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode_codepoint.js",
      "extensionless": false,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode_codepoint.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/encode.js",
      "syntax": "import",
      "specifier": "./generated/encode-html.js",
      "context": "import",
      "line": 1,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/encode-html.js",
      "extensionless": false,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/encode-html.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/encode.js",
      "syntax": "import",
      "specifier": "./escape.js",
      "context": "import",
      "line": 2,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/escape.js",
      "extensionless": false,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/escape.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/feeds.js",
      "syntax": "import",
      "specifier": "./stringify.js",
      "context": "import",
      "line": 1,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/stringify.js",
      "extensionless": false,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/stringify.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/feeds.js",
      "syntax": "import",
      "specifier": "./legacy.js",
      "context": "import",
      "line": 2,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/legacy.js",
      "extensionless": false,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/legacy.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/legacy.js",
      "syntax": "import",
      "specifier": "./querying.js",
      "context": "import",
      "line": 2,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/querying.js",
      "extensionless": false,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/querying.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/Parser.js",
      "syntax": "import",
      "specifier": "./Tokenizer.js",
      "context": "import",
      "line": 2,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/Tokenizer.js",
      "extensionless": false,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/Tokenizer.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/at-rule.js",
      "syntax": "require",
      "specifier": "./container",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/comment.js",
      "syntax": "require",
      "specifier": "./node",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "syntax": "require",
      "specifier": "./comment",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/comment",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/comment.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "syntax": "require",
      "specifier": "./declaration",
      "context": "require",
      "line": 4,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/declaration",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/declaration.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "syntax": "require",
      "specifier": "./node",
      "context": "require",
      "line": 5,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "syntax": "require",
      "specifier": "./symbols",
      "context": "require",
      "line": 6,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/symbols",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/symbols.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/css-syntax-error.js",
      "syntax": "require",
      "specifier": "./terminal-highlight",
      "context": "require",
      "line": 5,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/terminal-highlight",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/terminal-highlight.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/declaration.js",
      "syntax": "require",
      "specifier": "./node",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/document.js",
      "syntax": "require",
      "specifier": "./container",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/fromJSON.js",
      "syntax": "require",
      "specifier": "./at-rule",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/at-rule",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/at-rule.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/fromJSON.js",
      "syntax": "require",
      "specifier": "./comment",
      "context": "require",
      "line": 4,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/comment",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/comment.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/fromJSON.js",
      "syntax": "require",
      "specifier": "./declaration",
      "context": "require",
      "line": 5,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/declaration",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/declaration.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/fromJSON.js",
      "syntax": "require",
      "specifier": "./input",
      "context": "require",
      "line": 6,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/fromJSON.js",
      "syntax": "require",
      "specifier": "./previous-map",
      "context": "require",
      "line": 7,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/previous-map",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/previous-map.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/fromJSON.js",
      "syntax": "require",
      "specifier": "./root",
      "context": "require",
      "line": 8,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/fromJSON.js",
      "syntax": "require",
      "specifier": "./rule",
      "context": "require",
      "line": 9,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/rule",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/rule.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input.js",
      "syntax": "require",
      "specifier": "./css-syntax-error",
      "context": "require",
      "line": 8,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/css-syntax-error",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/css-syntax-error.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input.js",
      "syntax": "require",
      "specifier": "./previous-map",
      "context": "require",
      "line": 9,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/previous-map",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/previous-map.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input.js",
      "syntax": "require",
      "specifier": "./terminal-highlight",
      "context": "require",
      "line": 10,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/terminal-highlight",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/terminal-highlight.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "syntax": "require",
      "specifier": "./container",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "syntax": "require",
      "specifier": "./document",
      "context": "require",
      "line": 4,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/document",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/document.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "syntax": "require",
      "specifier": "./map-generator",
      "context": "require",
      "line": 5,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/map-generator",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/map-generator.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "syntax": "require",
      "specifier": "./parse",
      "context": "require",
      "line": 6,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parse",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parse.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "syntax": "require",
      "specifier": "./result",
      "context": "require",
      "line": 7,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/result",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/result.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "syntax": "require",
      "specifier": "./root",
      "context": "require",
      "line": 8,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "syntax": "require",
      "specifier": "./stringify",
      "context": "require",
      "line": 9,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringify",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringify.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "syntax": "require",
      "specifier": "./symbols",
      "context": "require",
      "line": 10,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/symbols",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/symbols.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "syntax": "require",
      "specifier": "./warn-once",
      "context": "require",
      "line": 11,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warn-once",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warn-once.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node.js",
      "syntax": "require",
      "specifier": "./css-syntax-error",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/css-syntax-error",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/css-syntax-error.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node.js",
      "syntax": "require",
      "specifier": "./stringifier",
      "context": "require",
      "line": 4,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringifier",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringifier.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node.js",
      "syntax": "require",
      "specifier": "./stringify",
      "context": "require",
      "line": 5,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringify",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringify.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node.js",
      "syntax": "require",
      "specifier": "./symbols",
      "context": "require",
      "line": 6,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/symbols",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/symbols.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parse.js",
      "syntax": "require",
      "specifier": "./container",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parse.js",
      "syntax": "require",
      "specifier": "./input",
      "context": "require",
      "line": 4,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parse.js",
      "syntax": "require",
      "specifier": "./parser",
      "context": "require",
      "line": 5,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/processor.js",
      "syntax": "require",
      "specifier": "./document",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/document",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/document.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/processor.js",
      "syntax": "require",
      "specifier": "./lazy-result",
      "context": "require",
      "line": 4,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/processor.js",
      "syntax": "require",
      "specifier": "./no-work-result",
      "context": "require",
      "line": 5,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/no-work-result",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/no-work-result.js",
      "alreadyReadThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/processor.js",
      "syntax": "require",
      "specifier": "./root",
      "context": "require",
      "line": 6,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/result.js",
      "syntax": "require",
      "specifier": "./warning",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warning",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warning.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root.js",
      "syntax": "require",
      "specifier": "./container",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/rule.js",
      "syntax": "require",
      "specifier": "./container",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/rule.js",
      "syntax": "require",
      "specifier": "./list",
      "context": "require",
      "line": 4,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/list",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/list.js",
      "alreadyReadThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringify.js",
      "syntax": "require",
      "specifier": "./stringifier",
      "context": "require",
      "line": 3,
      "literalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringifier",
      "extensionless": true,
      "candidateExact": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringifier.js",
      "alreadyReadThisRound": false
    }
  ],
  "bareEdges": [
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/helpers.js",
      "syntax": "import",
      "specifier": "domhandler",
      "context": "import",
      "line": 1,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domhandler",
      "subpath": "",
      "alreadyReadlinkThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/legacy.js",
      "syntax": "import",
      "specifier": "domhandler",
      "context": "import",
      "line": 1,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domhandler",
      "subpath": "",
      "alreadyReadlinkThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/querying.js",
      "syntax": "import",
      "specifier": "domhandler",
      "context": "import",
      "line": 1,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domhandler",
      "subpath": "",
      "alreadyReadlinkThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/stringify.js",
      "syntax": "import",
      "specifier": "domhandler",
      "context": "import",
      "line": 1,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domhandler",
      "subpath": "",
      "alreadyReadlinkThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/stringify.js",
      "syntax": "import",
      "specifier": "dom-serializer",
      "context": "import",
      "line": 2,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/dom-serializer",
      "subpath": "",
      "alreadyReadlinkThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/stringify.js",
      "syntax": "import",
      "specifier": "domelementtype",
      "context": "import",
      "line": 3,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domelementtype",
      "subpath": "",
      "alreadyReadlinkThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/traversal.js",
      "syntax": "import",
      "specifier": "domhandler",
      "context": "import",
      "line": 1,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domhandler",
      "subpath": "",
      "alreadyReadlinkThisRound": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/Tokenizer.js",
      "syntax": "import",
      "specifier": "entities/decode",
      "context": "import",
      "line": 1,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/entities",
      "subpath": "/decode",
      "alreadyReadlinkThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/css-syntax-error.js",
      "syntax": "require",
      "specifier": "picocolors",
      "context": "require",
      "line": 3,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/picocolors",
      "subpath": "",
      "alreadyReadlinkThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input.js",
      "syntax": "require",
      "specifier": "nanoid/non-secure",
      "context": "require",
      "line": 3,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/nanoid",
      "subpath": "/non-secure",
      "alreadyReadlinkThisRound": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input.js",
      "syntax": "require",
      "specifier": "source-map-js",
      "context": "require",
      "line": 5,
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/source-map-js",
      "subpath": "",
      "alreadyReadlinkThisRound": false
    }
  ],
  "nextRelativeTargets": [
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/decode-data-html.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/decode-data-xml.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode_codepoint.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/generated/encode-html.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/symbols.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/terminal-highlight.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/previous-map.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/map-generator.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warn-once.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringifier.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser.js",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/no-work-result.js"
  ],
  "nextAliasReadlink": [
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/dom-serializer",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domelementtype",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/entities",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/picocolors",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/nanoid",
    "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/source-map-js"
  ],
  "nextPackageJSON": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/package.json",
      "context": "import",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domhandler",
      "status": "TARGET_UNREAD"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype/package.json",
      "context": "import",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/domelementtype",
      "status": "TARGET_UNREAD"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/package.json",
      "context": "import",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/domhandler",
      "status": "TARGET_UNREAD"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/package.json",
      "context": "import",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/domutils",
      "status": "TARGET_UNREAD"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dayjs@1.11.23/node_modules/dayjs/package.json",
      "context": "require",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/launder@1.7.1/node_modules/dayjs",
      "status": "TARGET_UNREAD"
    }
  ],
  "counts": {
    "JS": 30,
    "JSbytes": 174683,
    "JSON": 3,
    "JSONbytes": 54,
    "roundSourceBytes": 174737,
    "readlinkOnly": 5,
    "relativeLiteralEdges": 54,
    "bareLiteralEdges": 11,
    "builtinLiteralEdges": 2,
    "nextRelativeUnique": 12,
    "nextAliasUnique": 6,
    "nextPackageJSON": 5
  },
  "runtime": false,
  "extraTargetRead": false,
  "globalUnionComplete": false
}

## STOP

helper/product/main/C0/C1/S5/P5d/既phase不変更。C1author/source writerはこのstep24から別phaseになるまでSTOP。全旧generated SOURCE/build/records/results/TMP/cache/log/DB/key/proof/成功失敗private rootsはstat/read/hash/import/copy/replay/reopen/cleanup全恒久NOOPS。runtime/default/Node import/CLI/build/service/DB/native/network/browser/root probe/create/newhelpers0。追加target読取はRoot次採用前0。新報告wx0600/fsync/actualFDclose/fullstableSHA固定後ALL SOURCE/helper/runtime/reader/writer STOP。
