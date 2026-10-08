# 通常fixture runtime closure step22: uuid5＋metadata12

固定日時: 2026-10-06T13:18:18.671799+00:00

step21 31223B/SHA8ad0702c66d491c981456d6a53d5ca15f9ffddfbbd434b87c70e7f88900697dfを直接fullstable確認。正式relative-unread5とalias lexicalTargets unique11だけから採用読取scopeを導出。domhandler root package metadataはstep19を借用して再読0。他10metadata＋明記lib/esm metadata2を直接read。SOURCE/runtime/import/native/DB/rootprobe/create/new3helpers/private操作0。

各JS65536/metadata32768、今回unique上限5×65536＋12×32768=720896B、round本文≤2MiB。実本文去重合計19352B。各canonical/regular/nonlink/0644/selfUID/nlink1/NOFOLLOW、dev/ino/mode/uid/nlink/size/mtime/ctime前後一致、全文SHA、actualFDclose。旧/新root探索・未知walk・glob・推測fallback0。

## 直接JS5

```json
[
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/md5.js",
    "bytes": 305,
    "sha256": "9e143aad0b68e277fa3552a6f783052320bcd5d61d1d8c45fc64aac10113279c",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM uuid root type:module (step19 borrowed)",
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "node:crypto"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/regex.js",
    "bytes": 171,
    "sha256": "774bc4bc767a58458dfdd252430d96b71b3d380ac241b50df6cb757aaa1b4783",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM uuid root type:module (step19 borrowed)",
    "literalEdges": []
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/rng.js",
    "bytes": 110,
    "sha256": "69d169609cd3f16d85b120b1d88e247216a59c7c5a27b321290c0604627db5c3",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM uuid root type:module (step19 borrowed)",
    "literalEdges": []
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/sha1.js",
    "bytes": 308,
    "sha256": "445563946f94669cb7efb10fbfa6d24b825d466ee99faad3e58d939f3ee46c5e",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM uuid root type:module (step19 borrowed)",
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "node:crypto"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v35.js",
    "bytes": 1503,
    "sha256": "ce090c2ea41db958cff64383cdcd09de21b577d33a57fa281cad1dde2c87b02d",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM uuid root type:module (step19 borrowed)",
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./parse.js"
      },
      {
        "kind": "static-esm",
        "specifier": "./stringify.js"
      }
    ]
  }
]
```

## 直接package metadata12

name/type/main/exports/dependenciesは正式JSONのdataで、runtime実選択・load成功の証明ではない。CJS/ESMはtype/exports条件を次entryproposalのimportcontextに保持し、requireで到達するhtmlparser2-12をsource直importのhtmlparser2-10と混同しない。

```json
[
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/deepmerge@4.3.1/node_modules/deepmerge/package.json",
    "bytes": 1152,
    "sha256": "f56978e7a6da1a3c6edee41abb54f98584a2fa2680458c48db820ae772fef0c9",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": "deepmerge",
    "version": "4.3.1",
    "type": null,
    "main": "dist/cjs.js",
    "exports": null,
    "dependencies": null,
    "optionalDependencies": null
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/dom-serializer/lib/esm/package.json",
    "bytes": 18,
    "sha256": "1239d4d885dcad42201a27ed9324f8f0f760b78700d8db9ced39a511cffe7eae",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": null,
    "version": null,
    "type": "module",
    "main": null,
    "exports": null,
    "dependencies": null,
    "optionalDependencies": null,
    "entrySelection": "no exports/main; default index.js not adopted in this round"
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/package.json",
    "bytes": 1543,
    "sha256": "4ddf28a1e60ae7ec15f62cda0d72eb06bcae05b3819942d971c841b7cc0b6930",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": "domelementtype",
    "version": "2.3.0",
    "type": null,
    "main": "lib/index.js",
    "exports": {
      "require": "./lib/index.js",
      "import": "./lib/esm/index.js"
    },
    "dependencies": null,
    "optionalDependencies": null
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/lib/esm/package.json",
    "bytes": 18,
    "sha256": "1239d4d885dcad42201a27ed9324f8f0f760b78700d8db9ced39a511cffe7eae",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": null,
    "version": null,
    "type": "module",
    "main": null,
    "exports": null,
    "dependencies": null,
    "optionalDependencies": null,
    "entrySelection": "no exports/main; default index.js not adopted in this round"
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/package.json",
    "bytes": 2560,
    "sha256": "9a04689cc67f52e9f7323e0dd4d18c8cbe68744c3373ad524d133ddf12bf99ab",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": "domutils",
    "version": "3.2.2",
    "type": null,
    "main": "lib/index.js",
    "exports": {
      "require": "./lib/index.js",
      "import": "./lib/esm/index.js"
    },
    "dependencies": {
      "dom-serializer": "^2.0.0",
      "domelementtype": "^2.3.0",
      "domhandler": "^5.0.3"
    },
    "optionalDependencies": null
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/package.json",
    "bytes": 2883,
    "sha256": "c92f657f679669a91bc32cd98f0b4812b3f4a9c6f3b3af3022a70cb25b7efc7c",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": "entities",
    "version": "4.5.0",
    "type": null,
    "main": "lib/index.js",
    "exports": {
      ".": {
        "require": "./lib/index.js",
        "import": "./lib/esm/index.js"
      },
      "./lib/decode.js": {
        "require": "./lib/decode.js",
        "import": "./lib/esm/decode.js"
      },
      "./lib/escape.js": {
        "require": "./lib/escape.js",
        "import": "./lib/esm/escape.js"
      }
    },
    "dependencies": null,
    "optionalDependencies": null
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/escape-string-regexp@4.0.0/node_modules/escape-string-regexp/package.json",
    "bytes": 686,
    "sha256": "63763f28aefa6c49e6e6599e44b7c9aa5afd6518ae04bcfa534ff3759ad428e8",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": "escape-string-regexp",
    "version": "4.0.0",
    "type": null,
    "main": null,
    "exports": null,
    "dependencies": null,
    "optionalDependencies": null,
    "entrySelection": "no exports/main; default index.js not adopted in this round"
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/package.json",
    "bytes": 2377,
    "sha256": "2056f738ff8f63a73ebf931b7d220b2d1b93b0884454f94447cb4c3f54a603b1",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": "htmlparser2",
    "version": "12.0.0",
    "type": "module",
    "main": "./dist/index.js",
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "./WebWritableStream": {
        "types": "./dist/WebWritableStream.d.ts",
        "default": "./dist/WebWritableStream.js"
      },
      "./WritableStream": {
        "types": "./dist/WritableStream.d.ts",
        "default": "./dist/WritableStream.js"
      }
    },
    "dependencies": {
      "domelementtype": "^3.0.0",
      "domhandler": "^6.0.0",
      "domutils": "^4.0.2",
      "entities": "^8.0.0"
    },
    "optionalDependencies": null
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/package.json",
    "bytes": 1622,
    "sha256": "0fe1587ff3b255249a880f58ab02fa29ecb384438adac241724ae28c1434a9ff",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": "is-plain-object",
    "version": "5.1.0",
    "type": null,
    "main": "dist/is-plain-object.js",
    "exports": {
      ".": {
        "import": "./dist/is-plain-object.mjs",
        "require": "./dist/is-plain-object.js",
        "types": "./is-plain-object.d.ts"
      },
      "./package.json": "./package.json"
    },
    "dependencies": null,
    "optionalDependencies": null
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/launder@1.7.1/node_modules/launder/package.json",
    "bytes": 946,
    "sha256": "b111ad703bae61d8cef17863c38f4618e813b24284a874d0b81db1b5cfbdf601",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": "launder",
    "version": "1.7.1",
    "type": null,
    "main": "index.js",
    "exports": null,
    "dependencies": {
      "dayjs": "^1.11.7"
    },
    "optionalDependencies": null
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/parse-srcset@1.0.2/node_modules/parse-srcset/package.json",
    "bytes": 653,
    "sha256": "85de89bdbb2225109c9af147844db04d0c089e16ecc0e0d7280aa5fddfba42e5",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": "parse-srcset",
    "version": "1.0.2",
    "type": null,
    "main": "src/parse-srcset.js",
    "exports": null,
    "dependencies": null,
    "optionalDependencies": null
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "bytes": 2497,
    "sha256": "30c9e1dc5f7dcdef9bced8f965ea53de47fe32ac9ae922634317977ee1856cb0",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "name": "postcss",
    "version": "8.5.14",
    "type": null,
    "main": "./lib/postcss.js",
    "exports": {
      ".": {
        "import": "./lib/postcss.mjs",
        "require": "./lib/postcss.js"
      },
      "./lib/at-rule": "./lib/at-rule.js",
      "./lib/comment": "./lib/comment.js",
      "./lib/container": "./lib/container.js",
      "./lib/css-syntax-error": "./lib/css-syntax-error.js",
      "./lib/declaration": "./lib/declaration.js",
      "./lib/fromJSON": "./lib/fromJSON.js",
      "./lib/input": "./lib/input.js",
      "./lib/lazy-result": "./lib/lazy-result.js",
      "./lib/no-work-result": "./lib/no-work-result.js",
      "./lib/list": "./lib/list.js",
      "./lib/map-generator": "./lib/map-generator.js",
      "./lib/node": "./lib/node.js",
      "./lib/parse": "./lib/parse.js",
      "./lib/parser": "./lib/parser.js",
      "./lib/postcss": "./lib/postcss.js",
      "./lib/previous-map": "./lib/previous-map.js",
      "./lib/processor": "./lib/processor.js",
      "./lib/result": "./lib/result.js",
      "./lib/root": "./lib/root.js",
      "./lib/rule": "./lib/rule.js",
      "./lib/stringifier": "./lib/stringifier.js",
      "./lib/stringify": "./lib/stringify.js",
      "./lib/symbols": "./lib/symbols.js",
      "./lib/terminal-highlight": "./lib/terminal-highlight.js",
      "./lib/tokenize": "./lib/tokenize.js",
      "./lib/warn-once": "./lib/warn-once.js",
      "./lib/warning": "./lib/warning.js",
      "./package.json": "./package.json"
    },
    "dependencies": {
      "nanoid": "^3.3.11",
      "picocolors": "^1.1.1",
      "source-map-js": "^1.2.1"
    },
    "optionalDependencies": null
  }
]
```

## 既metadata借用

```json
{
  "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/package.json",
  "bytes": 2241,
  "sha256": "cbb42a446eef285863e04158c7f269e0e7b8e868c1042d6845e996d760f7376c",
  "name": "domhandler",
  "version": "5.0.3",
  "type": null,
  "main": "lib/index.js",
  "exports": {
    "require": "./lib/index.js",
    "import": "./lib/esm/index.js"
  },
  "dependencies": {
    "domelementtype": "^2.3.0"
  },
  "directRead": false,
  "borrowed": "step19"
}
```

## 正式literal nextedgesとentry候補（未読）

```json
[
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/md5.js",
    "kind": "static-esm",
    "specifier": "node:crypto",
    "target": "node:crypto",
    "class": "builtin-no-body"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/sha1.js",
    "kind": "static-esm",
    "specifier": "node:crypto",
    "target": "node:crypto",
    "class": "builtin-no-body"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v35.js",
    "kind": "static-esm",
    "specifier": "./parse.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/parse.js",
    "class": "relative-known"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v35.js",
    "kind": "static-esm",
    "specifier": "./stringify.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/stringify.js",
    "class": "relative-known"
  }
]
```

```json
[
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/deepmerge@4.3.1/node_modules/deepmerge/package.json",
    "branch": [
      "main"
    ],
    "literal": "dist/cjs.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/deepmerge@4.3.1/node_modules/deepmerge/dist/cjs.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/package.json",
    "branch": [
      "require"
    ],
    "literal": "./lib/index.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/lib/index.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/package.json",
    "branch": [
      "import"
    ],
    "literal": "./lib/esm/index.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/lib/esm/index.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/package.json",
    "branch": [
      "require"
    ],
    "literal": "./lib/index.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/index.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/package.json",
    "branch": [
      "import"
    ],
    "literal": "./lib/esm/index.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/index.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/package.json",
    "branch": [
      ".",
      "require"
    ],
    "literal": "./lib/index.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/index.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/package.json",
    "branch": [
      ".",
      "import"
    ],
    "literal": "./lib/esm/index.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/index.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/package.json",
    "branch": [
      "./lib/decode.js",
      "require"
    ],
    "literal": "./lib/decode.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/decode.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/package.json",
    "branch": [
      "./lib/decode.js",
      "import"
    ],
    "literal": "./lib/esm/decode.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/decode.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/package.json",
    "branch": [
      "./lib/escape.js",
      "require"
    ],
    "literal": "./lib/escape.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/escape.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/package.json",
    "branch": [
      "./lib/escape.js",
      "import"
    ],
    "literal": "./lib/esm/escape.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/escape.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/package.json",
    "branch": [
      ".",
      "types"
    ],
    "literal": "./dist/index.d.ts",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/index.d.ts",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/package.json",
    "branch": [
      ".",
      "default"
    ],
    "literal": "./dist/index.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/index.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/package.json",
    "branch": [
      "./WebWritableStream",
      "types"
    ],
    "literal": "./dist/WebWritableStream.d.ts",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/WebWritableStream.d.ts",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/package.json",
    "branch": [
      "./WebWritableStream",
      "default"
    ],
    "literal": "./dist/WebWritableStream.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/WebWritableStream.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/package.json",
    "branch": [
      "./WritableStream",
      "types"
    ],
    "literal": "./dist/WritableStream.d.ts",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/WritableStream.d.ts",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/package.json",
    "branch": [
      "./WritableStream",
      "default"
    ],
    "literal": "./dist/WritableStream.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/WritableStream.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/package.json",
    "branch": [
      ".",
      "import"
    ],
    "literal": "./dist/is-plain-object.mjs",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/dist/is-plain-object.mjs",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/package.json",
    "branch": [
      ".",
      "require"
    ],
    "literal": "./dist/is-plain-object.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/dist/is-plain-object.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/package.json",
    "branch": [
      ".",
      "types"
    ],
    "literal": "./is-plain-object.d.ts",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/is-plain-object.d.ts",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/package.json",
    "branch": [
      "./package.json"
    ],
    "literal": "./package.json",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/package.json",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/launder@1.7.1/node_modules/launder/package.json",
    "branch": [
      "main"
    ],
    "literal": "index.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/launder@1.7.1/node_modules/launder/index.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/parse-srcset@1.0.2/node_modules/parse-srcset/package.json",
    "branch": [
      "main"
    ],
    "literal": "src/parse-srcset.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/parse-srcset@1.0.2/node_modules/parse-srcset/src/parse-srcset.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      ".",
      "import"
    ],
    "literal": "./lib/postcss.mjs",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/postcss.mjs",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      ".",
      "require"
    ],
    "literal": "./lib/postcss.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/postcss.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/at-rule"
    ],
    "literal": "./lib/at-rule.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/at-rule.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/comment"
    ],
    "literal": "./lib/comment.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/comment.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/container"
    ],
    "literal": "./lib/container.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/container.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/css-syntax-error"
    ],
    "literal": "./lib/css-syntax-error.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/css-syntax-error.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/declaration"
    ],
    "literal": "./lib/declaration.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/declaration.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/fromJSON"
    ],
    "literal": "./lib/fromJSON.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/fromJSON.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/input"
    ],
    "literal": "./lib/input.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/input.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/lazy-result"
    ],
    "literal": "./lib/lazy-result.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/lazy-result.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/no-work-result"
    ],
    "literal": "./lib/no-work-result.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/no-work-result.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/list"
    ],
    "literal": "./lib/list.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/list.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/map-generator"
    ],
    "literal": "./lib/map-generator.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/map-generator.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/node"
    ],
    "literal": "./lib/node.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/node.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/parse"
    ],
    "literal": "./lib/parse.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parse.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/parser"
    ],
    "literal": "./lib/parser.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/parser.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/postcss"
    ],
    "literal": "./lib/postcss.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/postcss.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/previous-map"
    ],
    "literal": "./lib/previous-map.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/previous-map.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/processor"
    ],
    "literal": "./lib/processor.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/processor.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/result"
    ],
    "literal": "./lib/result.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/result.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/root"
    ],
    "literal": "./lib/root.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/root.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/rule"
    ],
    "literal": "./lib/rule.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/rule.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/stringifier"
    ],
    "literal": "./lib/stringifier.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringifier.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/stringify"
    ],
    "literal": "./lib/stringify.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/stringify.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/symbols"
    ],
    "literal": "./lib/symbols.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/symbols.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/terminal-highlight"
    ],
    "literal": "./lib/terminal-highlight.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/terminal-highlight.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/tokenize"
    ],
    "literal": "./lib/tokenize.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/tokenize.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/warn-once"
    ],
    "literal": "./lib/warn-once.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warn-once.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./lib/warning"
    ],
    "literal": "./lib/warning.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/warning.js",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "branch": [
      "./package.json"
    ],
    "literal": "./package.json",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "read": false,
    "selection": "formal condition candidate; types/browser/non-Node not selected automatically"
  }
]
```

次readは上表のNode/CJS/ESM実contextに応じた正式entryだけを別採用する。types/browser/default-alternative/wildcard targetを自動展開しない。相対extensionless mainの`.js`補完が必要ならexact候補を別提案する。metadata entry文字列から派生したpath本文/metadataは全未読。package dependencies文字列は次bare siblingalias有限readlink-only候補を導出する根拠であり、targetの一般runtime許可ではない。

## capとSTOP

既runtime222はJS204/JSON18。新5package root metadata5＋step20 entry5＋step21 JS18＋今回JS5＋新root metadata10＋nestedmetadata2の去重前追加はJS28/JSON17、候補JS232/JSON35。この計数は既runtimeとの最終canonical去重未了。既JSON24を超える静的必要scopeを示すもので、実行capを変更しない。whole2MiBと新3helper material256KiBは閉包完了後のexactunion/最終実bytesでRootへ提案する。PUBLIC build708は別class、runtime/read採用とNative ABI/load能力は別。

新報告のみwx0600/O_EXCL/O_NOFOLLOW/fsync/actualFDclose固定。元SOURCE327/newhelpers/main/C0/S5/P5d/Manager変更0。全reader/writer/runtime STOP。次entry/default/preflight/runtime/native/DB/rootprobe/createは別採用まで0。spec/spec-implement禁止、全旧generated/actual/private恒久NOOPS。

## 必要importcontext限定の次entry提案

上記53条件文字列全体を次readへ採用しない。sanitize7 require、dom-serializer2 import、domhandler1 import、htmlparser2-10の3 importに沿ったroot runtime条件だけを選んだ表は以下。alreadyReadはstep20借用/再読不要。types/browser/subpath/wildcardは不選択。escape-string-regexpはmain/exportsが欠けるため正式Node CJS root index.js候補を別提案する（存在探査0）。

```json
[
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/package.json",
    "importContext": "import",
    "packageType": null,
    "entryLiteral": "./lib/esm/index.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/lib/esm/index.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": false,
    "selection": "formal root exports/main runtime branch"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/package.json",
    "importContext": "import",
    "packageType": null,
    "entryLiteral": "./lib/esm/index.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities/lib/esm/index.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": false,
    "selection": "formal root exports/main runtime branch"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/package.json",
    "importContext": "import",
    "packageType": null,
    "entryLiteral": "./lib/esm/index.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/lib/esm/index.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": true,
    "selection": "formal root exports/main runtime branch"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/package.json",
    "importContext": "import",
    "packageType": null,
    "entryLiteral": "./lib/esm/index.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils/lib/esm/index.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": false,
    "selection": "formal root exports/main runtime branch"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/deepmerge@4.3.1/node_modules/deepmerge/package.json",
    "importContext": "require",
    "packageType": null,
    "entryLiteral": "dist/cjs.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/deepmerge@4.3.1/node_modules/deepmerge/dist/cjs.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": false,
    "selection": "formal root exports/main runtime branch"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/escape-string-regexp@4.0.0/node_modules/escape-string-regexp/package.json",
    "importContext": "require",
    "packageType": null,
    "entryLiteral": "index.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/escape-string-regexp@4.0.0/node_modules/escape-string-regexp/index.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": false,
    "selection": "Node CJS root index.js candidate (main/exports absent); unprobed and not yet adopted"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/package.json",
    "importContext": "require",
    "packageType": "module",
    "entryLiteral": "./dist/index.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2/dist/index.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": false,
    "selection": "formal root exports/main runtime branch"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/package.json",
    "importContext": "require",
    "packageType": null,
    "entryLiteral": "./dist/is-plain-object.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object/dist/is-plain-object.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": false,
    "selection": "formal root exports/main runtime branch"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/launder@1.7.1/node_modules/launder/package.json",
    "importContext": "require",
    "packageType": null,
    "entryLiteral": "index.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/launder@1.7.1/node_modules/launder/index.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": false,
    "selection": "formal root exports/main runtime branch"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/parse-srcset@1.0.2/node_modules/parse-srcset/package.json",
    "importContext": "require",
    "packageType": null,
    "entryLiteral": "src/parse-srcset.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/parse-srcset@1.0.2/node_modules/parse-srcset/src/parse-srcset.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": false,
    "selection": "formal root exports/main runtime branch"
  },
  {
    "package": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/package.json",
    "importContext": "require",
    "packageType": null,
    "entryLiteral": "./lib/postcss.js",
    "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/postcss.js",
    "bodyRead": false,
    "nextCap": 65536,
    "alreadyRead": false,
    "selection": "formal root exports/main runtime branch"
  }
]
```

htmlparser2-12のpackageType=moduleをCJS sanitize-htmlがrequireするので、Node24の原require(ESM)同期枝の合法性は次entry本文でTLA等を照合し、実load可能とは先取りしない。dom-serializer/domhandlerのlib/esm package type=moduleは今回直接metadataで確定。静的data選択のみ、runtime/元thisargsPromise/native0。最終固定後ALLSTOP。
