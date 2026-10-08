# Normal fixture runtime closure step31

2026-10-06T14:09:37.330253+00:00

PUBLIC static限定確認。JS2件は2197B、alias2件はreadlink-onlyでtargetをfollowしていない。foreign-names.jsは正式runtime literal辺0。source-map.jsはCJS require3本を持ち、generatorは既正式rowを借用、consumer/source-nodeは未読である。

```json
{
  "step": 31,
  "directRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer/dist/foreign-names.js",
      "bytes": 1792,
      "sha256": "0dd864533becc828ad35ff1dff5d29aae3420e51c916ad013796932b843393a0",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "canonical": true,
      "regular": true,
      "noFollow": true,
      "fullStable": true,
      "actualFDClosed": true,
      "context": "ESM import"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/source-map.js",
      "bytes": 405,
      "sha256": "dc098456c2d9ab90a4c0a17cca9be16665b9813df20906553a98b0088a157be7",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "canonical": true,
      "regular": true,
      "noFollow": true,
      "fullStable": true,
      "actualFDClosed": true,
      "context": "CJS require"
    }
  ],
  "aliases": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/domelementtype",
      "lexicalTarget": "../../domelementtype@3.0.0/node_modules/domelementtype",
      "lexicallyNormalizedTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype",
      "mode": "0755",
      "uid": 501,
      "nlink": 1,
      "fullStableLstat": true,
      "readlinkOnly": true,
      "targetFollow": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/entities",
      "lexicalTarget": "../../entities@8.0.0/node_modules/entities",
      "lexicallyNormalizedTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities",
      "mode": "0755",
      "uid": 501,
      "nlink": 1,
      "fullStableLstat": true,
      "readlinkOnly": true,
      "targetFollow": false
    }
  ],
  "literalEdges": [
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/source-map.js",
      "specifier": "./lib/source-map-generator",
      "syntax": "require",
      "context": "CJS",
      "resolution": "formal CJS relative .js branch only",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-generator.js",
      "status": "borrowed-step14"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/source-map.js",
      "specifier": "./lib/source-map-consumer",
      "syntax": "require",
      "context": "CJS",
      "resolution": "formal CJS relative .js branch only",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-consumer.js",
      "status": "unread"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/source-map.js",
      "specifier": "./lib/source-node",
      "syntax": "require",
      "context": "CJS",
      "resolution": "formal CJS relative .js branch only",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-node.js",
      "status": "unread"
    }
  ],
  "leafLiteralEdgeCounts": {
    "foreign-names.js": 0,
    "source-map.js": 3
  },
  "nextRelativeTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-consumer.js",
      "context": "CJS require",
      "cap": 65536,
      "bodyRead": false,
      "metadataRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-node.js",
      "context": "CJS require",
      "cap": 65536,
      "bodyRead": false,
      "metadataRead": false
    }
  ],
  "nextPackageMetadataProposal": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/package.json",
      "cap": 32768,
      "reason": "Root ESM export selection needed: ./decode graph is insufficient for bare entities encodeXML/escapeAttribute/escapeText. Prefer reuse of existing fixed formal metadata exports if Root supplies it; no guessed root JS filename.",
      "directReadThisStep": false
    }
  ],
  "borrowed": [
    {
      "source": "step14-plan",
      "rows": "six source-map-js lib JS including generator; no physical reread",
      "context": "Root main now directly reads generator plus unread consumer/source-node; generator binding borrowed, remaining root transitive graph not complete"
    },
    {
      "source": "step25+step26",
      "rows": "domelementtype3 metadata and dist/index.js",
      "context": "alias exact lexical target matches existing version3; no physical target follow/read"
    },
    {
      "source": "step26+step27+step28+step29",
      "rows": "entities8 ./decode and descendants",
      "context": "This subpath graph does not establish bare entities root encoding export graph"
    }
  ],
  "counts": {
    "directJS": 2,
    "directBodyBytes": 2197,
    "bodyCapSum": 131072,
    "aliasReadlink": 2,
    "aliasLexicalBytes": 96,
    "newRelativeUnread": 2,
    "bareRootSelectionUnresolved": 1
  },
  "remainingContextInventory": [
    {
      "branch": "dom-serializer3 foreign names",
      "status": "leaf static closed"
    },
    {
      "branch": "dom-serializer3 domelementtype",
      "status": "exact alias target matches borrowed formal metadata/entry; no new target read"
    },
    {
      "branch": "dom-serializer3 entities",
      "status": "exact alias target entities8 established; root import selection still requires formal metadata/root graph"
    },
    {
      "branch": "PostCSS source-map-js root",
      "status": "source-map.js bound; generator borrowed; consumer and source-node unread; descendants not known until next formal body read"
    },
    {
      "branch": "other formal prior dependency contexts",
      "status": "No complete inventory/native/runtime success inferred"
    }
  ],
  "runtimeCaps": {
    "JS": 256,
    "JSON": 24,
    "wholeBytes": 2097152,
    "materialBytes": 262144,
    "changed": false,
    "fullClosure": false
  },
  "operations": {
    "sourceChanges": 0,
    "helperChanges": 0,
    "dependencyWrites": 0,
    "envChanges": 0,
    "runtime": 0,
    "import": 0,
    "native": 0,
    "DB": 0,
    "rootProbe": 0,
    "rootCreate": 0,
    "privateRead": 0
  },
  "allStop": true
}
```

次の本文scopeは source-map-js/lib/source-map-consumer.js と lib/source-node.js 各64KiB。これは既mainのliteral requireから導出したCJS .js分岐であり、未知extensionless/JSON/native fallbackを許可しない。entitiesのbare rootは./decodeと異なるexport群を要求するため、既正式package metadataのroot exportsを借用可能な固定record提示、又は同exactpackage.json 32KiB限定読取を先に提案する。root entry名は推測せず、未採用本文/metadataは先読みしない。

全閉包数/去重union/全予算成立は未確定。runtime JS256/JSON24/whole2MiB/material256KiBは変更0。sourceMappingURLはruntime辺に含めず、static確認をnative成功/原proof/FD閉鎖へ転用しない。全read/writer/runtime STOP。旧生成SOURCE/build/root/private非操作。
