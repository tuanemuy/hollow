# 通常fixture runtime closure step21: relative18＋bare alias13

固定日時: 2026-10-06T13:15:22.286445+00:00

採用step18 2148B/ee3a9cf403dc970aa445d929dac81ae26bbef3690da4da6ed5506651de1241a6、step19 4184B/4675a13682cad906b9218a2ceb45889b8e4a05c1b73b29cf0abbd66dd5d2e83d、step20 2700B/2817de4a7e634c046502bec6a3b3bc4fb2bca7f06d16e5e8e8c7a94d697b0ffcを直接fullstable確認。step20 literalEdgesからだけrelative18とbare siblingaliases13を導出。source/runtime/import/native/DB/rootprobe/create/helper作成0。旧private全恒久NOOPS。

## 直接read集合

relative18 each65536B、unique上限1179648B、round本文上限2MiB。今回JS本文実69021B（18unique/singlepass）、step20 PUBLIC報告再読2700Bは別PUBLIC control読取。JSはcanonical/regular/nonlink/0644/selfUID/nlink1/NOFOLLOW/前後fstat安定/fullSHA/actualFDclose。ESM/CJSは正式entry選択と字句import/requireのcontextでありNode実loadの証明ではない。ESM子package type metadataは下の追加提案へ区分。

```json
[
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/dom-serializer/lib/esm/foreignNames.js",
    "bytes": 2047,
    "sha256": "e91bdcbf83ec8b575d8f2513467b6fb7943116528a7ca5a5f1ed459f8051b263",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/dom-serializer/lib/esm/index.js",
      "specifier": "./foreignNames.js",
      "context": "ESM"
    },
    "literalEdges": []
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/lib/esm/node.js",
    "bytes": 9213,
    "sha256": "eca04c3ebb27045c5188dd7a857b2ac2da345f8a679d49a1f9636b5e69d21e79",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/lib/esm/index.js",
      "specifier": "./node.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "domelementtype"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/htmlparser2/dist/esm/Parser.js",
    "bytes": 16720,
    "sha256": "c841a56757105a0c819cbc2acddfe8cefd0ac9eb2606ee622fa019329ddf7cd4",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/htmlparser2/dist/esm/index.js",
      "specifier": "./Parser.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./Tokenizer.js"
      },
      {
        "kind": "static-esm",
        "specifier": "entities/decode"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/htmlparser2/dist/esm/Tokenizer.js",
    "bytes": 30303,
    "sha256": "55e263392cd9f4c9299166bd3fe2ce4ec7c673b9c28c0ba957b52354144273de",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/htmlparser2/dist/esm/index.js",
      "specifier": "./Tokenizer.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "entities/decode"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/max.js",
    "bytes": 55,
    "sha256": "8f81a7b2a5f8704ea1b4e8f83d36659856fdf3d122b2bd16fe1b5c47c97b6ffa",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./max.js",
      "context": "ESM"
    },
    "literalEdges": []
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/nil.js",
    "bytes": 55,
    "sha256": "a6f8ac293df0b75af2946e5190d8f00336b826bb1340b96d669a09beb8885ff8",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./nil.js",
      "context": "ESM"
    },
    "literalEdges": []
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/parse.js",
    "bytes": 612,
    "sha256": "a383f50a691c05533a40bbb4a87f718daa050abbc96debc9715efdc74d8538b4",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./parse.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./validate.js"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/stringify.js",
    "bytes": 1093,
    "sha256": "bb592b599f2b00be6ca9fb2ac2fb7350abf3a6e6e274201cf6865c8c15e52b6a",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./stringify.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./validate.js"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v1.js",
    "bytes": 2683,
    "sha256": "a3cd1c783a64f6e010af00593ac8e7e28c127a5e63266da4809b5687f1a081aa",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./v1.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./rng.js"
      },
      {
        "kind": "static-esm",
        "specifier": "./stringify.js"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v1ToV6.js",
    "bytes": 842,
    "sha256": "f0a2d19ee0d4398607808fcfc3eebeb1ea7af08a0c17d71d42fc612f97241a3f",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./v1ToV6.js",
      "context": "ESM"
    },
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
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v3.js",
    "bytes": 259,
    "sha256": "3b65ad31501886af057e13aeec03afedc54f1f85cc8d332b0eb89800b11fbce4",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./v3.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./md5.js"
      },
      {
        "kind": "static-esm",
        "specifier": "./v35.js"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v4.js",
    "bytes": 926,
    "sha256": "eb4b917bb2bfcb3e723fedf3c5d0256b83578a9285e85ebf4c60caa953aa3d39",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./v4.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./rng.js"
      },
      {
        "kind": "static-esm",
        "specifier": "./stringify.js"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v5.js",
    "bytes": 262,
    "sha256": "daaf09616ea3b145ccd6a1dfea190b65d546267a9916c5741e026d4290c61ae9",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./v5.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./sha1.js"
      },
      {
        "kind": "static-esm",
        "specifier": "./v35.js"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v6.js",
    "bytes": 630,
    "sha256": "32f4c875353e043cb8d790f2d63d46e7b23d592fa3d5d09ace6afcff1dd44e03",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./v6.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./stringify.js"
      },
      {
        "kind": "static-esm",
        "specifier": "./v1.js"
      },
      {
        "kind": "static-esm",
        "specifier": "./v1ToV6.js"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v6ToV1.js",
    "bytes": 842,
    "sha256": "78475a282beaea6e8c45e5f2586134929be2e21728f159fb8559df06d7288475",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./v6ToV1.js",
      "context": "ESM"
    },
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
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v7.js",
    "bytes": 2129,
    "sha256": "38208cc85d447b13d7fc9e75377d4f82e17ad982334786396623c57c1406a257",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./v7.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./rng.js"
      },
      {
        "kind": "static-esm",
        "specifier": "./stringify.js"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/validate.js",
    "bytes": 142,
    "sha256": "78ba6a91a3c2d219e3a6980d7704c0998e8152cabcaece0f5a04989025d0e60c",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./validate.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./regex.js"
      }
    ]
  },
  {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/version.js",
    "bytes": 208,
    "sha256": "5a43d6eb8496806fd5e152f92edda603dbb1f77108045edcf034f22c9e320ce8",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "fdClosed": true,
    "context": "ESM",
    "origin": {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/index.js",
      "specifier": "./version.js",
      "context": "ESM"
    },
    "literalEdges": [
      {
        "kind": "static-esm",
        "specifier": "./validate.js"
      }
    ]
  }
]
```

## bare alias13 readlink-only

各4096B/前後lstat安定/symlink/selfUID/nlink1。親packageの上位node_modules sibling exact13だけ。targetは字句正規化のみ、follow/canonicalresolve/target metadata/body0。bare resolver一般許可ではない。sanitize-html7/dom-serializer2/domhandler1/htmlparser2-10の3というcontextを保持する。htmlparser2はsanitize-html側の別世代を同一packageとして混ぜない。

```json
[
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/domelementtype",
    "literal": "../../domelementtype@2.3.0/node_modules/domelementtype",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype",
    "context": "ESM",
    "specifier": "domelementtype",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/entities",
    "literal": "../../entities@4.5.0/node_modules/entities",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@4.5.0/node_modules/entities",
    "context": "ESM",
    "specifier": "entities",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domelementtype",
    "literal": "../../domelementtype@2.3.0/node_modules/domelementtype",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype",
    "context": "ESM",
    "specifier": "domelementtype",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/domelementtype",
    "literal": "../../domelementtype@2.3.0/node_modules/domelementtype",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype",
    "context": "ESM",
    "specifier": "domelementtype",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/domhandler",
    "literal": "../../domhandler@5.0.3/node_modules/domhandler",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler",
    "context": "ESM",
    "specifier": "domhandler",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/domutils",
    "literal": "../../domutils@3.2.2/node_modules/domutils",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@3.2.2/node_modules/domutils",
    "context": "ESM",
    "specifier": "domutils",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/sanitize-html@2.17.7/node_modules/deepmerge",
    "literal": "../../deepmerge@4.3.1/node_modules/deepmerge",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/deepmerge@4.3.1/node_modules/deepmerge",
    "context": "CJS",
    "specifier": "deepmerge",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/sanitize-html@2.17.7/node_modules/escape-string-regexp",
    "literal": "../../escape-string-regexp@4.0.0/node_modules/escape-string-regexp",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/escape-string-regexp@4.0.0/node_modules/escape-string-regexp",
    "context": "CJS",
    "specifier": "escape-string-regexp",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/sanitize-html@2.17.7/node_modules/htmlparser2",
    "literal": "../../htmlparser2@12.0.0/node_modules/htmlparser2",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@12.0.0/node_modules/htmlparser2",
    "context": "CJS",
    "specifier": "htmlparser2",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/sanitize-html@2.17.7/node_modules/is-plain-object",
    "literal": "../../is-plain-object@5.1.0/node_modules/is-plain-object",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/is-plain-object@5.1.0/node_modules/is-plain-object",
    "context": "CJS",
    "specifier": "is-plain-object",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/sanitize-html@2.17.7/node_modules/launder",
    "literal": "../../launder@1.7.1/node_modules/launder",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/launder@1.7.1/node_modules/launder",
    "context": "CJS",
    "specifier": "launder",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/sanitize-html@2.17.7/node_modules/parse-srcset",
    "literal": "../../parse-srcset@1.0.2/node_modules/parse-srcset",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/parse-srcset@1.0.2/node_modules/parse-srcset",
    "context": "CJS",
    "specifier": "parse-srcset",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/sanitize-html@2.17.7/node_modules/postcss",
    "literal": "../../postcss@8.5.14/node_modules/postcss",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss",
    "context": "CJS",
    "specifier": "postcss",
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  }
]
```

## 正式次edges・読取未採用集合

下表は本roundの字句static import/export/requireだけ。dynamic-literalがあれば別区分であり許可追加にしない。既読targetは借用/再読不要、unread target metadata/body0。node:crypto builtinはimport/eval/native実行0。

```json
[
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/lib/esm/node.js",
    "kind": "static-esm",
    "specifier": "domelementtype",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domelementtype",
    "classification": "bare-alias-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/htmlparser2/dist/esm/Parser.js",
    "kind": "static-esm",
    "specifier": "./Tokenizer.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/htmlparser2/dist/esm/Tokenizer.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/htmlparser2/dist/esm/Parser.js",
    "kind": "static-esm",
    "specifier": "entities/decode",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/entities/decode",
    "classification": "bare-alias-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/htmlparser2/dist/esm/Tokenizer.js",
    "kind": "static-esm",
    "specifier": "entities/decode",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/entities/decode",
    "classification": "bare-alias-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/parse.js",
    "kind": "static-esm",
    "specifier": "./validate.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/validate.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/stringify.js",
    "kind": "static-esm",
    "specifier": "./validate.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/validate.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v1.js",
    "kind": "static-esm",
    "specifier": "./rng.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/rng.js",
    "classification": "relative-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v1.js",
    "kind": "static-esm",
    "specifier": "./stringify.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/stringify.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v1ToV6.js",
    "kind": "static-esm",
    "specifier": "./parse.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/parse.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v1ToV6.js",
    "kind": "static-esm",
    "specifier": "./stringify.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/stringify.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v3.js",
    "kind": "static-esm",
    "specifier": "./md5.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/md5.js",
    "classification": "relative-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v3.js",
    "kind": "static-esm",
    "specifier": "./v35.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v35.js",
    "classification": "relative-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v4.js",
    "kind": "static-esm",
    "specifier": "./rng.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/rng.js",
    "classification": "relative-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v4.js",
    "kind": "static-esm",
    "specifier": "./stringify.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/stringify.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v5.js",
    "kind": "static-esm",
    "specifier": "./sha1.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/sha1.js",
    "classification": "relative-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v5.js",
    "kind": "static-esm",
    "specifier": "./v35.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v35.js",
    "classification": "relative-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v6.js",
    "kind": "static-esm",
    "specifier": "./stringify.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/stringify.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v6.js",
    "kind": "static-esm",
    "specifier": "./v1.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v1.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v6.js",
    "kind": "static-esm",
    "specifier": "./v1ToV6.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v1ToV6.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v6ToV1.js",
    "kind": "static-esm",
    "specifier": "./parse.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/parse.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v6ToV1.js",
    "kind": "static-esm",
    "specifier": "./stringify.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/stringify.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v7.js",
    "kind": "static-esm",
    "specifier": "./rng.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/rng.js",
    "classification": "relative-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/v7.js",
    "kind": "static-esm",
    "specifier": "./stringify.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/stringify.js",
    "classification": "relative-already-read"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/validate.js",
    "kind": "static-esm",
    "specifier": "./regex.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/regex.js",
    "classification": "relative-unread"
  },
  {
    "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/version.js",
    "kind": "static-esm",
    "specifier": "./validate.js",
    "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid/dist-node/validate.js",
    "classification": "relative-already-read"
  }
]
```

次scope提案はこのrelative-unread去重target exactJS各65536Bと、alias13 lexicalTargets/package.json exact去重各32768Bのみ。package main/exportsに基づく更なるJSはmetadata採用後に再提案する。bare-alias-unreadが追加される場合もそのexact alias readlink-onlyを別採用。target不存在/個別cap超過は本文前停止、fallback探査0。

ESM type確認の追加metadata exact2: /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/dom-serializer/lib/esm/package.json と /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler/lib/esm/package.json、各32768Bを提案する。現root package.jsonのtype:nullとimport exports選択だけから子JSの実ESMloadを証明しない。uuid/root type:module、htmlparser2-10/root type:moduleは既step19借用。各package条件が未閉包のためNode load成功は未主張。

## 予算・停止

既runtime222/JS204 JSON18/1210651Bに、step19 metadata5＋step20 entry5＋本round18JSを追加すると去重前候補はJS227/JSON23。次alias13metadataが必要ならJSON24を超えるため、正式metadata/body閉包の確定後にunion去重・新candidatecapをRootへ提案する。現JS256/JSON24/whole2MiBを変更しておらず成立を先取りしない。PUBLIC build708は別class、同canonical去重が必要。各round有限read許可を全runtime/load/native能力へ転用0。

本NEWphaseだけwx0600/O_EXCL/O_NOFOLLOW/fsync/actualFDcloseで固定。次targets読取・new3helpers作成・既SOURCE/main/S5/P5d/C0/C1/helper/Manager編集0。全reader/writer/runtime STOP。spec/spec-implement0。
