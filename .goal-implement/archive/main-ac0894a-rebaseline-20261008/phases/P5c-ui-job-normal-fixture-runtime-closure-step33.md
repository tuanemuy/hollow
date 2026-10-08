# Normal fixture runtime closure step33

2026-10-06T14:12:45.840904+00:00

PUBLIC static限定確認。指定JS3件11921Bをcanonical/regular644/selfUID/nlink1/fullstableSHA/実FDcloseで固定した。binary-search/quick-sortはruntime literal module辺0。quick-sortのnew Functionは元local SortTemplateからの関数生成であり、module/FS/native辺の解決を追加しない。実行/evalしていない。

entities8 root indexはdecode/encode/escapeの3相対JSをそれぞれimport/reexportする。decodeは既formal branch借用、encode/escapeは本step本文0である。未知package/exports探索をせず、正確なliteral targetsだけを記録した。

```json
{
  "step": 33,
  "directRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/binary-search.js",
      "bytes": 4249,
      "sha256": "c7f4a47a125af0bd860443dfd71d2f412d1a97dcb53ab7038189d63b91dc32bd",
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
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/quick-sort.js",
      "bytes": 4068,
      "sha256": "72ed4911cdc72232cac53cac995e28e865cd4302186173bba74ff6436c089915",
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
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/index.js",
      "bytes": 3604,
      "sha256": "442e6496aca70e865e6e9f295a71794e1889d247031e77ea1c58c415d172485b",
      "context": "ESM import",
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
    "directJS": 3,
    "directBodyBytes": 11921,
    "bodyCapBytes": 196608,
    "literalEdges": 6,
    "uniqueLiteralChildTargets": 3,
    "bareAliases": 0,
    "packageReads": 0
  },
  "literalEdges": [
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/index.js",
      "syntax": "import",
      "specifier": "./decode.js",
      "context": "ESM import",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "status": "borrowed-formal-decode-branch"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/index.js",
      "syntax": "import",
      "specifier": "./encode.js",
      "context": "ESM import",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/encode.js",
      "status": "not-read-this-step; existing-union membership not independently checked"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/index.js",
      "syntax": "import",
      "specifier": "./escape.js",
      "context": "ESM import",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/escape.js",
      "status": "not-read-this-step; existing-union membership not independently checked"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/index.js",
      "syntax": "export-from",
      "specifier": "./decode.js",
      "context": "ESM import",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "status": "borrowed-formal-decode-branch"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/index.js",
      "syntax": "export-from",
      "specifier": "./encode.js",
      "context": "ESM import",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/encode.js",
      "status": "not-read-this-step; existing-union membership not independently checked"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/index.js",
      "syntax": "export-from",
      "specifier": "./escape.js",
      "context": "ESM import",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/escape.js",
      "status": "not-read-this-step; existing-union membership not independently checked"
    }
  ],
  "leafEdges": {
    "binary-search.js": 0,
    "quick-sort.js": 0
  },
  "nonModuleDynamicCode": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/quick-sort.js",
      "syntax": "SortTemplate.toString -> new Function(return template) -> comparator-local sort closure",
      "classification": "local generated function, no module specifier/filesystem/package resolution",
      "evaluated": false,
      "runtimeSuccessClaim": false
    }
  ],
  "borrowedBranches": [
    {
      "branch": "source-map-js root",
      "records": "step14 six lib rows + step31 main + step32 consumer/source-node + this step binary-search/quick-sort",
      "scope": "These examined literal CJS require branches have no further unread module targets identified; no all-runtime-closure claim"
    },
    {
      "branch": "entities8 ./decode",
      "records": "previous formal decode graph and metadata, no reread",
      "scope": "Exact root imports/reexports decode; encode/escape branch membership/closure requires Root formal inventory decision"
    }
  ],
  "remainingContextInventory": [
    {
      "branch": "entities8 root ESM index",
      "state": "exact literal encode.js and escape.js children identified; body read0 this step; no arbitrary exports scan"
    },
    {
      "branch": "source-map-js root CJS",
      "state": "known formal literal children bound or borrowed; local dynamicFunction is not module edge"
    },
    {
      "branch": "other previous formal runtime contexts",
      "state": "No broad inventory/read or complete closure inference"
    }
  ],
  "nextNormalScopeAuthored": false,
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
    "packageRead": 0,
    "aliasRead": 0
  },
  "allStop": true
}
```

全runtimeunionの完全閉包、bytes去重、material最終必要量はRoot正本の判断に残す。runtime JS256/JSON24/whole2MiB/material256KiBは変更0。次normal scopeの候補作成・追加読取は行わず、OWNER新projection deltaの独立レビュー待ちでidleへ返す。

全read/writer/runtime STOP。旧生成SOURCE/build/private恒久NOOPS。native成功/ABI/正常import/予算成立の主張0。
