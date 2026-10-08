# Normal fixture runtime closure step32

2026-10-06T14:11:14.522437+00:00

PUBLIC static限定確認。source-map-jsのCJS子JS2件55388Bを全stablehash/FDcloseで固定した。literal require7本のうちutil/array-set/base64-vlq/source-map-generatorは既正式rowsを借用し、binary-search/quick-sortの2件は未読。新しいtargetの本文/metadataは先読みしていない。

entities8 root importは固定step26を全文stable読取してdirectMetadataRowsの正式exports[.].defaultから `./dist/index.js` に確定した。package実物の再読0。./decode/./escape等ほかのexportsをscopeへ一般追加せず、dom-serializer3 bare importに必要なroot branchだけを次提案とする。型d.tsはruntime辺に含めない。

```json
{
  "step": 32,
  "directRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-consumer.js",
      "bytes": 41580,
      "sha256": "78f7a8f6d20f51a99a9cbd8d552321b1a72de9b9fb9c39dbeb27dc84eb2eade5",
      "context": "CJS require",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "canonical": true,
      "regular": true,
      "noFollow": true,
      "fullStable": true,
      "actualFDClosed": true
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-node.js",
      "bytes": 13808,
      "sha256": "b45db8183550ca1e6259976f6ceee89f6764360c56cf206701bd2f7471144e31",
      "context": "CJS require",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "canonical": true,
      "regular": true,
      "noFollow": true,
      "fullStable": true,
      "actualFDClosed": true
    }
  ],
  "counts": {
    "directJS": 2,
    "directDependencyBodyBytes": 55388,
    "directDependencyCapBytes": 131072,
    "fixedReportReadBytes": 19061,
    "packageDirectRead": 0,
    "newJSUnreadProposal": 3
  },
  "literalEdges": [
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-consumer.js",
      "syntax": "require",
      "specifier": "./util",
      "context": "CJS require",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/util.js",
      "status": "borrowed-step14",
      "resolution": "formal relative CJS .js only"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-consumer.js",
      "syntax": "require",
      "specifier": "./binary-search",
      "context": "CJS require",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/binary-search.js",
      "status": "unread",
      "resolution": "formal relative CJS .js only"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-consumer.js",
      "syntax": "require",
      "specifier": "./array-set",
      "context": "CJS require",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/array-set.js",
      "status": "borrowed-step14",
      "resolution": "formal relative CJS .js only"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-consumer.js",
      "syntax": "require",
      "specifier": "./base64-vlq",
      "context": "CJS require",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/base64-vlq.js",
      "status": "borrowed-step14",
      "resolution": "formal relative CJS .js only"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-consumer.js",
      "syntax": "require",
      "specifier": "./quick-sort",
      "context": "CJS require",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/quick-sort.js",
      "status": "unread",
      "resolution": "formal relative CJS .js only"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-node.js",
      "syntax": "require",
      "specifier": "./source-map-generator",
      "context": "CJS require",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-generator.js",
      "status": "borrowed-step14",
      "resolution": "formal relative CJS .js only"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-node.js",
      "syntax": "require",
      "specifier": "./util",
      "context": "CJS require",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/util.js",
      "status": "borrowed-step14",
      "resolution": "formal relative CJS .js only"
    }
  ],
  "dynamicImportFound": false,
  "entitiesBorrowedRootMetadata": {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/package.json",
    "bytes": 2563,
    "sha256": "86e28ac6361377a9c0a82dc7ce849b16bfcc6b13d862c563bbf9b3fe9267773a",
    "mode": "0644",
    "uid": 501,
    "nlink": 1,
    "name": "entities",
    "version": "8.0.0",
    "type": "module",
    "main": "./dist/index.js",
    "selectedExports": {
      ".": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    },
    "requiredIncomingContext": "dom-serializer3 ESM import entities",
    "selectedRuntimeContext": "ESM import",
    "selectedRuntimeLiteral": "./dist/index.js",
    "physicalPackageReread": false,
    "recordBorrowedFrom": "step26 directMetadataRows"
  },
  "fixedReportRead": {
    "path": "/Users/hikaru/github.com/tuanemuy/hollow/.goal-implement/phases/P5c-ui-job-normal-fixture-runtime-closure-step26.md",
    "bytes": 19061,
    "sha256": "cc46420e9bf433b2fef4bc718abfe8ad85fd38d3b13b7d02ddd6dc3c7f936b8e",
    "mode": "0600",
    "fullStable": true,
    "actualFDClosed": true
  },
  "nextTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/binary-search.js",
      "context": "CJS require",
      "cap": 65536,
      "bodyRead": false,
      "metadataRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/quick-sort.js",
      "context": "CJS require",
      "cap": 65536,
      "bodyRead": false,
      "metadataRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/index.js",
      "context": "ESM import",
      "cap": 65536,
      "bodyRead": false,
      "metadataRead": false,
      "selection": "formal exports[.].default from borrowed package metadata"
    }
  ],
  "remainingContextInventory": [
    {
      "branch": "source-map-js PostCSS root require",
      "status": "main, consumer, source-node directly bound; util/array-set/base64-vlq/generator borrowed; binary-search/quick-sort unread, their children unknown"
    },
    {
      "branch": "entities8 domser3 root ESM",
      "status": "formal root selection now known from fixed metadata; dist/index.js unread; ./decode closure cannot cover root encode/escape exports"
    },
    {
      "branch": "domser3 foreign names+domelementtype",
      "status": "previous formal rows and exact aliases borrowed; no reread"
    },
    {
      "branch": "other prior formal dependencies",
      "status": "No completeness claim or extra scan"
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
    "privateRead": 0,
    "runtime": 0,
    "import": 0,
    "native": 0,
    "DB": 0,
    "network": 0,
    "envChanges": 0,
    "rootProbe": 0,
    "rootCreate": 0,
    "packageReread": 0
  },
  "allStop": true
}
```

次scopeは source-map-js/lib/{binary-search,quick-sort}.js と entities8/dist/index.js 各64KiBの計3件。incoming CJS contextをentitiesのESM内部へ伝播せず、各元正式syntaxとpackage typeに従う。未知extensionless/JSON/nativefallback・未固定のほかのentry探索0。全閉包/去重union/必要material最終値は未確定、caps変更0。

全read/writer/runtime STOP。OWNER新projection独立レビューへ切替可能な状態。旧SOURCE/build/results/私有root非操作、native成功/実行予算成立の主張0。
