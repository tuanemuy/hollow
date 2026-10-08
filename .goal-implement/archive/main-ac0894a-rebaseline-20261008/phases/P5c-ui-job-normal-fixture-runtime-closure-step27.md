# 通常fixture runtime closure step27: JS11＋alias1

固定日時: 2026-10-06T13:58:16.313282+00:00

Root採用step26 19061B/SHAcc46420e9bf433b2fef4bc718abfe8ad85fd38d3b13b7d02ddd6dc3c7f936b8eを直接全文fullstable確認。正式next entry3とrelative8の採用exact11JSのみ、各65536B/合算720896B。直接実本文66498B、singlepass unique11。PUBLIC canonical/regular/nonlink0644/selfUID/nlink1/NOFOLLOW、dev/ino/mode/uid/nlink/size/mtime/ctime前後安定・fullSHA・actualFDclose。alias1はreadlinkのみ各4096/前後lstat安定/symlinkselfUIDnlink1、targetは字句normalizationだけ、follow/body/metadata0。

新JSの正式literal import/export/requireを内部のcontextで記録。incoming requireをESM内部importへ伝播しない。generated entities decoderやUMD/CJSの動的実評価0、字句edge0はruntime全依存なしという証明ではない。次body/aliasmetadataの読み先はedge文字列の字句exactpathのみ、unknown walk/glob/推測fallback0。knownRowはこの11とstep26direct5だけのexact membershipで、広域全unionの既読判定ではない。

```json
{
  "directJSRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "bytes": 22923,
      "sha256": "5e3e1c938416abcb354ff4d7808f0a010d27d0e4170195c6f95f2e6895cb081a",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "./decode-codepoint.js"
        },
        {
          "context": "import",
          "specifier": "./generated/decode-data-html.js"
        },
        {
          "context": "import",
          "specifier": "./generated/decode-data-xml.js"
        },
        {
          "context": "import",
          "specifier": "./internal/bin-trie-flags.js"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/picocolors@1.1.1/node_modules/picocolors/picocolors.js",
      "bytes": 2663,
      "sha256": "213bb870fcaad4def0215fe34fbb0f529836cc4d2462e02f14f1a49d09781625",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "require",
      "literalEdges": []
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/nanoid@3.3.12/node_modules/nanoid/non-secure/index.cjs",
      "bytes": 1114,
      "sha256": "edd044dcdf7f937621c0b6e324377b3693cc30faf7a22d769d533d5f69c54698",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "require",
      "literalEdges": []
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/node.js",
      "bytes": 9626,
      "sha256": "f76455c2b1263761d98766c84ffdba453bdd9971488dc18be9cb0a029fa5d911",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "domelementtype"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/feeds.js",
      "bytes": 5811,
      "sha256": "4cd462bcb05f17fd357ce488e2e3bfbef84acfa46d8f912c9d69f9807e638c9b",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "./legacy.js"
        },
        {
          "context": "import",
          "specifier": "./stringify.js"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/helpers.js",
      "bytes": 5024,
      "sha256": "790376cb7907c671fd8c2b7a5f3910fd06d439161aa06ead576cacb14961bf0d",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "domhandler"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/legacy.js",
      "bytes": 5320,
      "sha256": "4d07c21630f2eace1cc4d72b3e6cfbbf1ed369e7698d0d5475297b090bb55a38",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "domhandler"
        },
        {
          "context": "import",
          "specifier": "./querying.js"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/manipulation.js",
      "bytes": 3676,
      "sha256": "94999d5ec2ae8836baa55411e952db9214e44b31bfec1101644f8fdc0e393667",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": []
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/querying.js",
      "bytes": 4703,
      "sha256": "953e2744d9e67d5a8150aeb921670ac2df94c819e0e23b8084cd1b566dcd3c9a",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "domhandler"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/stringify.js",
      "bytes": 2562,
      "sha256": "356fd2711c3e4b585e7e2ef513d75969193e0c51dafee10036ef0f0530f7ddb4",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "dom-serializer"
        },
        {
          "context": "import",
          "specifier": "domelementtype"
        },
        {
          "context": "import",
          "specifier": "domhandler"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/traversal.js",
      "bytes": 3076,
      "sha256": "49f79025756a8cb73eaed53e0921a860c7f47ebaf6c5808274b32791d0e003a8",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "domhandler"
        }
      ]
    }
  ],
  "directAliasReadlink": {
    "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domelementtype",
    "literal": "../../domelementtype@3.0.0/node_modules/domelementtype",
    "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype",
    "context": "import",
    "uid": 501,
    "nlink": 1,
    "stable": true,
    "targetMetadataRead": false,
    "targetBodyRead": false
  },
  "literalEdges": [
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "context": "import",
      "specifier": "./decode-codepoint.js",
      "kind": "relative",
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode-codepoint.js",
      "knownRow": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "context": "import",
      "specifier": "./generated/decode-data-html.js",
      "kind": "relative",
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/decode-data-html.js",
      "knownRow": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "context": "import",
      "specifier": "./generated/decode-data-xml.js",
      "kind": "relative",
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/decode-data-xml.js",
      "knownRow": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "context": "import",
      "specifier": "./internal/bin-trie-flags.js",
      "kind": "relative",
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/internal/bin-trie-flags.js",
      "knownRow": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/node.js",
      "context": "import",
      "specifier": "domelementtype",
      "kind": "bare",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domelementtype",
      "subpath": "."
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/feeds.js",
      "context": "import",
      "specifier": "./legacy.js",
      "kind": "relative",
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/legacy.js",
      "knownRow": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/feeds.js",
      "context": "import",
      "specifier": "./stringify.js",
      "kind": "relative",
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/stringify.js",
      "knownRow": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/helpers.js",
      "context": "import",
      "specifier": "domhandler",
      "kind": "bare",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "subpath": "."
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/legacy.js",
      "context": "import",
      "specifier": "domhandler",
      "kind": "bare",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "subpath": "."
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/legacy.js",
      "context": "import",
      "specifier": "./querying.js",
      "kind": "relative",
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/querying.js",
      "knownRow": true
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/querying.js",
      "context": "import",
      "specifier": "domhandler",
      "kind": "bare",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "subpath": "."
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/stringify.js",
      "context": "import",
      "specifier": "dom-serializer",
      "kind": "bare",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/dom-serializer",
      "subpath": "."
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/stringify.js",
      "context": "import",
      "specifier": "domelementtype",
      "kind": "bare",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domelementtype",
      "subpath": "."
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/stringify.js",
      "context": "import",
      "specifier": "domhandler",
      "kind": "bare",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "subpath": "."
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/traversal.js",
      "context": "import",
      "specifier": "domhandler",
      "kind": "bare",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "subpath": "."
    }
  ],
  "nextRelativeTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode-codepoint.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "cap": 65536,
      "bodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/decode-data-html.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "cap": 65536,
      "bodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/decode-data-xml.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "cap": 65536,
      "bodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/internal/bin-trie-flags.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "cap": 65536,
      "bodyRead": false
    }
  ],
  "nextAliasReadlink": [
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domelementtype",
      "context": "import",
      "subpath": ".",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/node.js",
      "cap": 4096,
      "readlink": true,
      "targetBodyRead": false,
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype",
      "status": "this round readlink-only, no target follow"
    },
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "context": "import",
      "subpath": ".",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/helpers.js",
      "cap": 4096,
      "readlink": false,
      "targetBodyRead": false
    },
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "context": "import",
      "subpath": ".",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/legacy.js",
      "cap": 4096,
      "readlink": false,
      "targetBodyRead": false
    },
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "context": "import",
      "subpath": ".",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/querying.js",
      "cap": 4096,
      "readlink": false,
      "targetBodyRead": false
    },
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/dom-serializer",
      "context": "import",
      "subpath": ".",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/stringify.js",
      "cap": 4096,
      "readlink": false,
      "targetBodyRead": false
    },
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domelementtype",
      "context": "import",
      "subpath": ".",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/stringify.js",
      "cap": 4096,
      "readlink": false,
      "targetBodyRead": false
    },
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "context": "import",
      "subpath": ".",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/stringify.js",
      "cap": 4096,
      "readlink": false,
      "targetBodyRead": false
    },
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "context": "import",
      "subpath": ".",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/traversal.js",
      "cap": 4096,
      "readlink": false,
      "targetBodyRead": false
    }
  ],
  "nextPackageJSON": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype/package.json",
      "context": "import",
      "subpath": ".",
      "cap": 32768,
      "bodyRead": false,
      "status": "compare prior formal exact package row first; borrow if identical, otherwise separate exact metadata proposal"
    }
  ],
  "counts": {
    "directJS": 11,
    "directJSBytes": 66498,
    "directAlias": 1,
    "literalEdges": 15,
    "nextRelativeUnique": 4,
    "nextUnreadAliasUnique": 3
  },
  "runtime": false,
  "wholeClosureComplete": false
}
```

## 次採用前の有限proposal

nextRelativeTargetsの去重exact{len(uniqueRel)}件は今scope外/未読。各65536Bを提案するが、Root-owned interim unionとcanonical完全同一rowなら再読せずborrowする。nextAliasReadlinkのunread unique{len(unreadAlias)}件はexact siblingalias readlink-only各4096B提案、targetfollow/body/metadata0。今回のdomelementtype lexicalTarget/package.jsonは既正式step25等に同rowがあれば固定SHAを借用し実物再読しない。新target本文をalias許可から一般runtime許可へ変換しない。

entities8 decode entry/picocolors root/nanoid non-secure requireはstep26 metadata選択由来であり、他exports/subpath/default/browser/typeを展開しない。domutils4の内部importとdomhandler6のdomelementtype importも別世代の旧3/5等に混ぜない。relative/body/aliasによる正規入口byteの固定であり、ABI/load/正常認証/Native Worker/DB物理closure証拠0。

## union/capsとSTOP

Root interim326（JS284/1202876B＋JSON42/509109B=1711985B、manifest64704B）はSTATIC限定の借用値。今回11を機械的に足して完全閉包や新runtimecountを宣言しない。最終完全有限canonical unionをRootが去重した後に必要JS/JSON/whole/material予算を別提案する。既runtimeJS256/JSON24/whole2MiB/material256KiB不変更、静的read採用を実行cap成立へ格上げ0。

本NEWphaseのみwx0600/O_EXCL/O_NOFOLLOW/fsync/actualFDclose/fullSHA固定。SOURCE/product/main/C0/C1/S5/P5d/OWNER/new3helpers/Manager/既phase変更0。Node import/default/preflight/test/native/dlopen/ABI/DB/HTTP/DNS/Websocket/child/build/fixture/rootprobe/create/env mutation0、全旧generatedSOURCE/build/output/TMP/results/key/proof/cache/private恒久NOOPS。全reader/writer/runtime STOP。追加scope/actualはRoot別採用まで0。spec/spec-implement/新agent0。
