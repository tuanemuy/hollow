# 通常fixture runtime closure step29: entities子1＋dom-serializer metadata1

固定日時: 2026-10-06T14:03:01.075126+00:00

Root採用step28 10900B/SHAbd5d92ddb1d161d807b384c7ef2afa6894edde3d4a1e4e94d2d7d4f378b84e4bの次exactscope。直接entities8 internal/decode-shared.js≤65536とdom-serializer3.1.1 package.json≤32768だけ本文を読んだ。unique2/本文2331B、上限98304B。canonical/regular/nonlink0644/selfUID/nlink1/O_NOFOLLOW、dev/ino/mode/UID/nlink/size/mtime/ctime前後一致・fullSHA・actualFDclose。未知targetmetadata/read/fallback/walk0。

PUBLIC旧buildmanifest117169B/SHA4ad86e83ac189da016ba255f901aeb55ed05a0078c2d49a8b3ffe77f4e7a3927とPUBLICstep14-plan66620B/SHA88e5cbcc62d30037a859e0ad7d0330a37ba6a091c2256a0c5fdbcce363a9bf07だけを同stable条件（PUBLIC0600）で全文直接読んでmemory decode/正式row確認。embedded旧ROOT/SOURCEpathを操作0。source-map-jsの物理package/bodyを一切再読しない。

```json
{
  "directRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/internal/decode-shared.js",
      "bytes": 617,
      "sha256": "51a2120afeae660916954be58f323c718b0415b78e9719c0b0279f49f3cc0d96",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "context": "import",
      "literalEdges": [],
      "stable": true,
      "fdClosed": true
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer/package.json",
      "bytes": 1714,
      "sha256": "82dcf82f2014284b51039db7009f53c7f2182fe48a6fb14e8da122b11fa7f9ee",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "context": "import",
      "name": "dom-serializer",
      "version": "3.1.1",
      "type": "module",
      "main": "./dist/index.js",
      "exports": {
        ".": {
          "types": "./dist/index.d.ts",
          "default": "./dist/index.js"
        }
      },
      "dependencies": {
        "domelementtype": "^3.0.0",
        "domhandler": "^6.0.0",
        "entities": "^8.0.0"
      },
      "stable": true,
      "fdClosed": true
    }
  ],
  "nextEntryTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer/dist/index.js",
      "context": "import",
      "sourcePackageJSON": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer/package.json",
      "selection": "exports . default runtime, types excluded",
      "cap": 65536,
      "bodyRead": false
    }
  ],
  "nextRelativeTargets": [],
  "nextBareTargets": [],
  "metadataDependenciesNotEdges": {
    "domelementtype": "^3.0.0",
    "domhandler": "^6.0.0",
    "entities": "^8.0.0"
  },
  "sourceMapFormalBorrowedRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/array-set.js",
      "bytes": 3197,
      "sha256": "163bb3055aaea7140167740036a83161fd912c344b14f992754b80f21477d754",
      "mode": "0644",
      "borrowedFrom": "step14-plan",
      "actualBodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/base64-vlq.js",
      "bytes": 4714,
      "sha256": "f3407e528f54ec0787bd0a71eeac0c99fffd98445916fcbe116dc69ca3be928b",
      "mode": "0644",
      "borrowedFrom": "step14-plan",
      "actualBodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/base64.js",
      "bytes": 1540,
      "sha256": "651bf433cf05e9ec8cee0b94639483236a605d48279e83d3d5c5de81c21d6599",
      "mode": "0644",
      "borrowedFrom": "step14-plan",
      "actualBodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/mapping-list.js",
      "bytes": 2339,
      "sha256": "35ddb82861f11a70ab84cb47d620fcb28d7f884bb444644e06bde815b836ef9e",
      "mode": "0644",
      "borrowedFrom": "step14-plan",
      "actualBodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/source-map-generator.js",
      "bytes": 14933,
      "sha256": "645482e8d23fd49cd025a0ad07c2e2beb173995138370d6a73e596e18e889bd8",
      "mode": "0644",
      "borrowedFrom": "step14-plan",
      "actualBodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/util.js",
      "bytes": 15403,
      "sha256": "0629f3ae2f3049cda3a2e87ea651dcf0cc71108f4681795ab989a8ac1573fc03",
      "mode": "0644",
      "borrowedFrom": "step14-plan",
      "actualBodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/package.json",
      "bytes": 2548,
      "sha256": "58f8e94a461a5e461e0cb2bb2be681cbd89b9181989fd26fceb858e67711469a",
      "mode": "0644",
      "borrowedFrom": "step14-plan",
      "actualBodyRead": false
    }
  ],
  "sourceMapBuildManifestRows": {
    "dependencies": 0,
    "anchors": 0,
    "aliases": 0
  },
  "sourceMapMainField": null,
  "sourceMapRootSelectedEntry": null,
  "runtime": false,
  "wholeClosureComplete": false
}
```

## 正式次entryとcontext残差

entities decode-sharedはatob/Uint16Arrayの元pure関数とexportだけでliteralimport/require0。sourceMappingURLをruntime辺にしない。実評価・全module無依存/native不在証明へ転用0。このbranchの既read chainは借用し、最後1readから全閉包を宣言しない。

dom-serializer3 root type:module、exports[.].default=./dist/index.jsをimport contextで選択し、typesをruntimeへ含めない。上表exactdist/index.js各64KiBを次有限scope提案、本文先読み0。metadata dependencies3の文字列を実literaledges扱いせず、entrybodyの正式importsが確定してから siblingalias readlink-onlyを提案する。domhandler6/domelementtype3 metadataはstep25・selectedbodyはstep26の正式借用、今回は実物/報告再読0。rootCJSrequireをその内部ESMimportへ伝播しない。

SOURCE_MAP branchは既CSSがsource-map-jsのsubpath/lib/source-map-generatorとrelative chainsを評価する正式6JS＋packageJSONのrowをstep14から借用できる。一方、PostCSSのroot require('source-map-js')はroot main-selected entryを必要とする。旧buildmanifestはsource-map-js dependencies/anchors/aliasesすべて0。step14-tableにroot package.jsonのbytes/SHAはあるがmain/exports field本文がなく、根root-selected JSも表にない。この有限入力からmain名を推測しない。

したがって次proposalはexact `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/package.json` の正式main/exports fieldを確認する限定本文read≤32768（EXPECTED2548B/SHA58f8e94a461a5e461e0cb2bb2be681cbd89b9181989fd26fceb858e67711469a）。本roundではbody0。既Root-held正式metadata本文が他reportで固定されていれば、そのexactreport/dataを借用して実物再読不要。main名確定後にroot entry/未読relative子のexactscopeを提案し、既CSSsubpathの6readからPostCSS root closureを補完しない。index/extension/JSON/nativeの推測fallback0。

## 予算・非操作

SOURCE327/runtime union/PUBLICbuild708/sameoperationoutput4/nativeaddon1/alias/helpermaterialは別classを維持。JS256/JSON24/whole2MiB/material256KiBの旧runtimecapは不変更で、今のSTATIC interim326のcountを実行許可へ転用0。Root-owned全formalrowsのcanonical去重と残るcontext edgesが閉じた後にexactunion/capを再提案する。source-map-rootとdomser3 entryの残差を埋めず完全閉包とはしない。

本NEWphaseだけwx0600/O_EXCL/O_NOFOLLOW/fsync/actualFDclose/fullSHA固定。SOURCE/product/main/C0/C1/S5/P5d/OWNER/helper3/Manager/env/既報告変更0。runtime/import/native/dlopen/ABI/DB/build/default/preflight/Vitest/test/HTTP/DNS/WebSocket/child/rootprobe/create0。全旧generatedSOURCE/build/TMP/outputs/results/cache/key/proof/private恒久NOOPS。全reader/writer/runtime STOP。spec/spec-implement/追加agent0。
