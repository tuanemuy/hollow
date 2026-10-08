# 通常fixture runtime closure step28: entities子4＋domutils alias3

固定日時: 2026-10-06T14:00:22.842043+00:00

step27 20699B/SHAc63d419700d40e0e2a8ca02c8a08cdc816fc09918265178a736280743d7e256aをfullstable直接確認。nextRelativeUnique=4/unreadAliases=3を本NEW報告に値として固定し、旧報告は編集0。採用entities8 exactJS4のみeach65536B/total262144B、直接実本文34869B。canonicalregular/nonlink0644/selfUID/nlink1/NOFOLLOW、dev/ino/mode/uid/nlink/size/mtime/ctime前後一致/fullSHA/actualFDclose。domutils4 siblingalias exact3はreadlink-only各4096B/前後lstat一致/selfUIDnlink1、target字句normalizationだけ。target follow/body/metadata0。

```json
{
  "directJSRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode-codepoint.js",
      "bytes": 1160,
      "sha256": "f09dbc23d35abbf96718dfdd04def3c1d3444495541d050c69a12706ee76dbb1",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": []
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/decode-data-html.js",
      "bytes": 32453,
      "sha256": "a845d1bb8e661abad2642088c646031523dc58b6e8bd0453308b0d71c01c8b8f",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "../internal/decode-shared.js"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/decode-data-xml.js",
      "bytes": 314,
      "sha256": "e11599611184b79a44d80cf0c135f4eeaf09e0ccac8845da54333177336a20ed",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "../internal/decode-shared.js"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/internal/bin-trie-flags.js",
      "bytes": 942,
      "sha256": "4f2d90d78b57cc2549cda4c53c7b5a1ca6176fcf746da1bd4ad4e6e9608ea89d",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": []
    }
  ],
  "literalEdges": [
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/decode-data-html.js",
      "context": "import",
      "specifier": "../internal/decode-shared.js",
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/internal/decode-shared.js",
      "knownRow": false
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/decode-data-xml.js",
      "context": "import",
      "specifier": "../internal/decode-shared.js",
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/internal/decode-shared.js",
      "knownRow": false
    }
  ],
  "directAliasReadlinkRows": [
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "literal": "../../domhandler@6.0.1/node_modules/domhandler",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler",
      "context": "import",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "targetFollow": false,
      "targetMetadataRead": false,
      "targetBodyRead": false
    },
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/dom-serializer",
      "literal": "../../dom-serializer@3.1.1/node_modules/dom-serializer",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer",
      "context": "import",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "targetFollow": false,
      "targetMetadataRead": false,
      "targetBodyRead": false
    },
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domelementtype",
      "literal": "../../domelementtype@3.0.0/node_modules/domelementtype",
      "lexicalTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype",
      "context": "import",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "targetFollow": false,
      "targetMetadataRead": false,
      "targetBodyRead": false
    }
  ],
  "borrowedDomhandlerDomelementtype": {
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
  "nextPackageJSON": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/package.json",
      "context": "import",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domhandler",
      "aliasLiteral": "../../domhandler@6.0.1/node_modules/domhandler",
      "cap": 32768,
      "bodyRead": false,
      "status": "borrow formal identical row if previously fixed, otherwise separate metadata proposal"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@3.1.1/node_modules/dom-serializer/package.json",
      "context": "import",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/dom-serializer",
      "aliasLiteral": "../../dom-serializer@3.1.1/node_modules/dom-serializer",
      "cap": 32768,
      "bodyRead": false,
      "status": "borrow formal identical row if previously fixed, otherwise separate metadata proposal"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype/package.json",
      "context": "import",
      "sourceAlias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domelementtype",
      "aliasLiteral": "../../domelementtype@3.0.0/node_modules/domelementtype",
      "cap": 32768,
      "bodyRead": false,
      "status": "borrow formal identical row if previously fixed, otherwise separate metadata proposal"
    }
  ],
  "counts": {
    "directJS": 4,
    "directJSBytes": 34869,
    "directAliasReadlink": 3,
    "nextRelativeUniqueBeforeThisRound": 4,
    "unreadAliasesBeforeThisRound": 3,
    "remainingLiteralRelative": 1
  },
  "runtime": false,
  "wholeClosureComplete": false
}
```

## context別の有限残差 inventory

| branch/context | 固定済み | 残差/次proposal |
| --- | --- | --- |
| entities8 ./decode ESM | step26metadata→step27decode→本step子4 | 上記literalEdgesのknownRowを確認。0未読子でも他exports/全module/実load閉包とはしない |
| domutils4 ESM | step26index→step27relative7 | 本alias3 literalTarget/packageJSONを既formalrowsへ一致照合し、未読metadataだけ各32KiB提案。dom-serializerの世代は文字列から確定しbody未読 |
| domhandler6 ESM | step26index→step27node、domhandler6→domelementtype readlink | domelementtype3 package metadataは正式step25、dist/index.jsは正式step26を借用。今回実物再読0 |
| picocolors CJS root / nanoid CJS non-secure | step26metadata→step27選択entry | literal0edgeを動的absenceやnative不在proofへしない |
| sanitize-html CJS→htmlparser2-12 ESM内部 | 元step20entry/以降metadata・formaledges | 親requireを子bareimportへ伝播0。全imports・TLA等実load成功は未確認 |
| PostCSS CJS source-map-js root | step25nextPackageJSONのsource-map-js1.2.1 metadataはstep14plan既formalrow borrowed | package entry名を推測しない。正式main-selected entryおよびrelative子がprior unionのexactbodyrowと一致するか照合が必要。元source-map-js metadata2548B/SHA58f8e94a461a5e461e0cb2bb2be681cbd89b9181989fd26fceb858e67711469aはRoot借用、実物再読0。entry未確定ならmetadata/reportのformalmainからexactproposalを先に求め、runtime/default0 |
| uuid14 ESM / dom-serializer2 ESM / domhandler5 ESM / htmlparser2-10 ESM | 正式step19以降のrowsをRoot-owned unionで借用 | exports-selected context＋nestedtype metadata＋各barealias/relative同一性照合を全unionで完了するまで完全閉包を宣言しない |
| libSQL/hrana/websocket/css-tree元runtime222 | 既正式reports/declarededges/aliases borrowed | main/native loader ordinarybranchとWorker denyは工具候補の別Gate。静的閉包はABI/dlopen/正常DB proofではない |

上記inventoryは正式既knownbranchesを有限に区分したもの。各rowの未確定事項は結果やprivateinspectionで埋めない。新target metadataは上表nextPackageJSON exact3のうちformal identical借用できないものだけ次有限scope。新relative子があればliteralEdgesのexacttargetsのみを再提案し、未知walk/glob/別世代fallback0。新aliasliteralをtarget本文やruntimeadmissionへ変換しない。

## capsとSTOP

Root interim326（JS284/1202876B＋JSON42/509109B=1711985B、manifest64704B）はSTATIC限定。stageごとの追加件数を機械的に足して最終去重countを作らない。現在runtimeJS256/JSON24/whole2MiB/material256KiBは不変更。SOURCE327/PUBLIC runtime union/PUBLIC build708/same-operationoutput4/nativeaddon1/alias・helpermaterialの完全finiteunionとbudget再提案は未完。最後4readだけから閉包完了/実行可能/通常job成功を主張しない。

本NEWphaseのみwx0600/O_EXCL/O_NOFOLLOW/fsync/実FDclose/fullSHA固定。旧phase/source/product/main/C0/C1/S5/P5d/OWNER/helper3/Manager/env編集0、runtime/import/native/dlopen/ABI/DB/build/default/preflight/test/HTTP/DNS/Websocket/child/rootprobe/create0、全oldactual/generatedprivateSOURCE/build/TMP/results/cache/key/proof恒久NOOPS。全reader/writer/runtime STOP。spec/spec-implement/新agent0。
