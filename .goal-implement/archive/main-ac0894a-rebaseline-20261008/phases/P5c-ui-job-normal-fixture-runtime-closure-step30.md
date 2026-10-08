# Normal fixture runtime closure step30

2026-10-06T14:07:51.551741+00:00

PUBLIC static限定確認。dom-serializer3 entryは7202B、source-map-js packageは2548Bで既正式SHAに一致した。新参照先の本文・aliasは未読。source-map-jsの正式mainは `./source-map.js`、exports/typeは不存在で、PostCSSのroot requireはこのCJS entryを次の対象とする。CSSの既generator subpathとは別のcontextである。

Metadata再読は既tableにmain/exportsが無かったための限定確認で、同2548B/SHAを直接再照合した。全本文9750B、O_NOFOLLOW/fullstable metadata/fullSHA/FD実closeを確認した。

```json
{
  "step": 30,
  "scope": "PUBLIC static only",
  "directRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer/dist/index.js",
      "bytes": 7202,
      "sha256": "af12c0d016a9f062bffe17e6879274c3bda24c967da8deb4b88cc8fc9a9f7811",
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
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/package.json",
      "bytes": 2548,
      "sha256": "58f8e94a461a5e461e0cb2bb2be681cbd89b9181989fd26fceb858e67711469a",
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
    "directJS": 1,
    "directJSON": 1,
    "uniqueBodyBytes": 9750,
    "roundBodyBytes": 9750,
    "bodyCaps": 98304,
    "aliasReads": 0
  },
  "literalEdges": [
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer/dist/index.js",
      "syntax": "import",
      "context": "ESM",
      "specifier": "domelementtype",
      "classification": "bare-alias-unread"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer/dist/index.js",
      "syntax": "import",
      "context": "ESM",
      "specifier": "entities",
      "classification": "bare-alias-unread"
    },
    {
      "parent": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer/dist/index.js",
      "syntax": "import",
      "context": "ESM",
      "specifier": "./foreign-names.js",
      "classification": "relative-unread"
    }
  ],
  "sourceMapMetadata": {
    "name": "source-map-js",
    "version": "1.2.1",
    "type": null,
    "main": "./source-map.js",
    "exports": null,
    "runtimeDependencies": null,
    "typings": "source-map.d.ts",
    "rootIncomingContext": "PostCSS CJS require",
    "selectedRuntimeContext": "CJS require; package has no type=module",
    "selectionReason": "No exports field; exact main string",
    "mainBodyRead": false
  },
  "nextRelativeTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer/dist/foreign-names.js",
      "context": "ESM import",
      "cap": 65536,
      "bodyRead": false,
      "metadataRead": false
    }
  ],
  "nextSelectedEntryTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/source-map.js",
      "context": "CJS require",
      "cap": 65536,
      "bodyRead": false,
      "metadataRead": false
    }
  ],
  "nextAliasReadlink": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/domelementtype",
      "specifier": "domelementtype",
      "context": "ESM import",
      "cap": 4096,
      "follow": false,
      "read": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/entities",
      "specifier": "entities",
      "context": "ESM import",
      "cap": 4096,
      "follow": false,
      "read": false
    }
  ],
  "borrowedRecords": [
    {
      "report": "P5c-ui-job-normal-fixture-runtime-closure-step25.md",
      "role": "domhandler6/domelementtype3 package metadata; no physical reread"
    },
    {
      "report": "P5c-ui-job-normal-fixture-runtime-closure-step26.md",
      "role": "domhandler6/domelementtype3 selected dist/index.js; no physical reread"
    },
    {
      "report": "P5c-ui-job-normal-fixture-runtime-closure-step14-plan.md",
      "role": "source-map-js six lib JS exact rows retained; their CSS generator subpath context does not establish root-main closure"
    }
  ],
  "remainingContextInventory": [
    {
      "branch": "entities8 decode imported graph",
      "state": "through step29 borrowed; this step adds no reads"
    },
    {
      "branch": "dom-serializer3 ESM render",
      "state": "relative foreign-names.js unread; two package-specific aliases unread; entities root-entry branch not proven by decode subpath"
    },
    {
      "branch": "source-map-js CSS generator subpath",
      "state": "six prior lib rows borrowed; no reread"
    },
    {
      "branch": "source-map-js PostCSS root require",
      "state": "main now directly identified; root source-map.js unread; its children unknown until formal body read"
    },
    {
      "branch": "other prior formal context edges",
      "state": "No inventory completeness claim; fixed records retained, no new walk"
    }
  ],
  "runtimeCaps": {
    "JS": 256,
    "JSON": 24,
    "wholeBytes": 2097152,
    "materialBytes": 262144,
    "changed": false,
    "fullClosure": false,
    "nativeLoadProof": false
  },
  "operations": {
    "dependencyWrites": 0,
    "sourceChanges": 0,
    "helperChanges": 0,
    "runtime": 0,
    "import": 0,
    "native": 0,
    "DB": 0,
    "network": 0,
    "envChanges": 0,
    "rootProbe": 0,
    "rootCreate": 0,
    "privateRead": 0
  },
  "allReadersWritersRuntimeStopped": true
}
```

次の必要scopeは foreign-names.js と source-map.js の各64KiB本文、dom-serializer3 packageの `node_modules/domelementtype` と `node_modules/entities` 各4096B readlink-only。alias targetの本文/metadataは先読みせず、既rowsとexact一致する場合のみ借用する。sourceMappingURLコメント、typings、files、devDependenciesはruntime辺へ追加しない。

既349件/1839883Bのinterim unionはRoot formalreport借用であり、本stepからfinal union全数は計算していない。新domserentryのunion差分判定とpackage metadata重複除去はRoot正本で行う。runtime JS256/JSON24/whole2MiB/material256KiBは変更せず、完全閉包・native成功・全予算成立の証拠へ転用しない。

全読取・書込・runtime STOP。SOURCE/helper/私有保全root/生成build/source/output非操作。
