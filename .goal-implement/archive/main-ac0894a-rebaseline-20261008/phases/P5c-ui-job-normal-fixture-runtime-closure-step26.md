# 通常fixture runtime closure step26: exactJS5＋metadata3

固定日時: 2026-10-06T13:46:32.859879+00:00

Root採用step25 34098B/SHA83108ae36f25d896c71399645d807499cdc6bc19dd1df6452095700dec847502を直接fullstable read。nextEntryTargets exact4＋tokenize.js exact1だけ本文読取した。tokenizeは326 interim union未登録をRootが別exactscope採用したもの。nextPackageJSON6から新3だけ直接読取し、既3はRoot固定SHAを借用/実物再読0。

direct5JS each65536＋3JSON each32768/unique cap425984B/round2097152B、実本文合計26531B。canonical/regular/nonlink0644/selfUID/nlink1/O_NOFOLLOW/path-FD前後devino/mode/uid/nlink/size/mtime/ctime安定・fullSHA・actualFDcloseを確認した。本文cap超過0、未知walk/fallback/他targetmetadata0。

entryがparentからrequireされたことと、ESM内部のimportを分ける。literal import/export/require statementはその本文contextを記録し、親CJSrequireをESM子のbareimportsへ伝播しない。dayjs UMDのmodule.exports/define/global枝は実評価せず、静的bare literalがなければ0edgeとして記録する。これは動的全閉包/実load/native成果の証明ではない。

```json
{
  "directJSRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@3.0.0/node_modules/domelementtype/dist/index.js",
      "bytes": 2222,
      "sha256": "db54e30134f36dfd2841da8f7cd57cac532139434a729c05f95834e4226e9802",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": []
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/index.js",
      "bytes": 4800,
      "sha256": "b0673f30b5e9b947a3d87137f65e4b0f07a1ee1585551f35983863bb36c3c057",
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
        },
        {
          "context": "import",
          "specifier": "./node.js"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "bytes": 250,
      "sha256": "8833c2c735d646f1e60989bad8a9fb7fcfc482bafd0333a44b19763b112bc8fa",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "import",
      "literalEdges": [
        {
          "context": "import",
          "specifier": "./feeds.js"
        },
        {
          "context": "import",
          "specifier": "./helpers.js"
        },
        {
          "context": "import",
          "specifier": "./legacy.js"
        },
        {
          "context": "import",
          "specifier": "./manipulation.js"
        },
        {
          "context": "import",
          "specifier": "./querying.js"
        },
        {
          "context": "import",
          "specifier": "./stringify.js"
        },
        {
          "context": "import",
          "specifier": "./traversal.js"
        }
      ]
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dayjs@1.11.23/node_modules/dayjs/dayjs.min.js",
      "bytes": 7161,
      "sha256": "0198dd0b1f760cded169c7e7ff7eaf56bc36c4c22c7c9b7c683e59437ed8700e",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "require",
      "literalEdges": []
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/postcss@8.5.14/node_modules/postcss/lib/tokenize.js",
      "bytes": 6700,
      "sha256": "ddfcaaa01f5eac9e4e8652044df1401ce6cc70295fd3f9fbb214ca66fb2bec72",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "entryContext": "require",
      "literalEdges": []
    }
  ],
  "directMetadataRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/package.json",
      "bytes": 2563,
      "sha256": "86e28ac6361377a9c0a82dc7ce849b16bfcc6b13d862c563bbf9b3fe9267773a",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "name": "entities",
      "version": "8.0.0",
      "type": "module",
      "main": "./dist/index.js",
      "exports": {
        ".": {
          "types": "./dist/index.d.ts",
          "default": "./dist/index.js"
        },
        "./decode": {
          "types": "./dist/decode.d.ts",
          "default": "./dist/decode.js"
        },
        "./escape": {
          "types": "./dist/escape.d.ts",
          "default": "./dist/escape.js"
        }
      },
      "dependencies": null,
      "optionalDependencies": null,
      "context": "import",
      "subpath": "./decode"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/picocolors@1.1.1/node_modules/picocolors/package.json",
      "bytes": 552,
      "sha256": "ef2ac226c4811d312e12c64214c453878653e834482125ae475f27cea60de737",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "name": "picocolors",
      "version": "1.1.1",
      "type": null,
      "main": "./picocolors.js",
      "exports": null,
      "dependencies": null,
      "optionalDependencies": null,
      "context": "require",
      "subpath": "."
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/nanoid@3.3.12/node_modules/nanoid/package.json",
      "bytes": 2283,
      "sha256": "acf8636be83005357cd6bc8e77dec99fba9b8d3f7047ba310f49ff067315f4da",
      "mode": "0644",
      "uid": 501,
      "nlink": 1,
      "stable": true,
      "fdClosed": true,
      "name": "nanoid",
      "version": "3.3.12",
      "type": "module",
      "main": "index.cjs",
      "exports": {
        ".": {
          "react-native": "./index.browser.js",
          "browser": "./index.browser.js",
          "require": {
            "types": "./index.d.cts",
            "default": "./index.cjs"
          },
          "import": {
            "types": "./index.d.ts",
            "default": "./index.js"
          },
          "default": "./index.js"
        },
        "./package.json": "./package.json",
        "./async/package.json": "./async/package.json",
        "./async": {
          "browser": "./async/index.browser.js",
          "require": {
            "types": "./index.d.cts",
            "default": "./async/index.cjs"
          },
          "import": {
            "types": "./index.d.ts",
            "default": "./async/index.js"
          },
          "default": "./async/index.js"
        },
        "./non-secure/package.json": "./non-secure/package.json",
        "./non-secure": {
          "require": {
            "types": "./index.d.cts",
            "default": "./non-secure/index.cjs"
          },
          "import": {
            "types": "./index.d.ts",
            "default": "./non-secure/index.js"
          },
          "default": "./non-secure/index.js"
        },
        "./url-alphabet/package.json": "./url-alphabet/package.json",
        "./url-alphabet": {
          "require": {
            "types": "./index.d.cts",
            "default": "./url-alphabet/index.cjs"
          },
          "import": {
            "types": "./index.d.ts",
            "default": "./url-alphabet/index.js"
          },
          "default": "./url-alphabet/index.js"
        }
      },
      "dependencies": null,
      "optionalDependencies": null,
      "context": "require",
      "subpath": "./non-secure"
    }
  ],
  "borrowedMetadataRows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/dom-serializer/package.json",
      "bytes": 2019,
      "sha256": "098603e7fee62c07fb392e31dae4dc151a3e03c72555ce1f9182011fbf898501",
      "from": "step19",
      "bodyReread": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domelementtype@2.3.0/node_modules/domelementtype/package.json",
      "bytes": 1543,
      "sha256": "4ddf28a1e60ae7ec15f62cda0d72eb06bcae05b3819942d971c841b7cc0b6930",
      "from": "step22",
      "bodyReread": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/package.json",
      "bytes": 2548,
      "sha256": "58f8e94a461a5e461e0cb2bb2be681cbd89b9181989fd26fceb858e67711469a",
      "from": "step14-plan",
      "bodyReread": false
    }
  ],
  "literalEdges": [
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/index.js",
      "context": "import",
      "specifier": "domelementtype",
      "kind": "bare",
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domelementtype",
      "subpath": "."
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/index.js",
      "context": "import",
      "specifier": "./node.js",
      "kind": "relative",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/node.js"
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "context": "import",
      "specifier": "./feeds.js",
      "kind": "relative",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/feeds.js"
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "context": "import",
      "specifier": "./helpers.js",
      "kind": "relative",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/helpers.js"
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "context": "import",
      "specifier": "./legacy.js",
      "kind": "relative",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/legacy.js"
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "context": "import",
      "specifier": "./manipulation.js",
      "kind": "relative",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/manipulation.js"
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "context": "import",
      "specifier": "./querying.js",
      "kind": "relative",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/querying.js"
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "context": "import",
      "specifier": "./stringify.js",
      "kind": "relative",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/stringify.js"
    },
    {
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "context": "import",
      "specifier": "./traversal.js",
      "kind": "relative",
      "exactTarget": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/traversal.js"
    }
  ],
  "nextEntryTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/decode.js",
      "context": "import",
      "sourcePackageJSON": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/package.json",
      "subpath": "./decode",
      "entryLiteral": "./dist/decode.js",
      "type": "module",
      "cap": 65536,
      "bodyRead": false,
      "selection": "formal selected exports/main, no type/browser/wildcard expansion"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/picocolors@1.1.1/node_modules/picocolors/picocolors.js",
      "context": "require",
      "sourcePackageJSON": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/picocolors@1.1.1/node_modules/picocolors/package.json",
      "subpath": ".",
      "entryLiteral": "./picocolors.js",
      "type": null,
      "cap": 65536,
      "bodyRead": false,
      "selection": "formal selected exports/main, no type/browser/wildcard expansion"
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/nanoid@3.3.12/node_modules/nanoid/non-secure/index.cjs",
      "context": "require",
      "sourcePackageJSON": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/nanoid@3.3.12/node_modules/nanoid/package.json",
      "subpath": "./non-secure",
      "entryLiteral": "./non-secure/index.cjs",
      "type": "module",
      "cap": 65536,
      "bodyRead": false,
      "selection": "formal selected exports/main, no type/browser/wildcard expansion"
    }
  ],
  "nextRelativeTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/node.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/index.js",
      "cap": 65536,
      "bodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/feeds.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "cap": 65536,
      "bodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/helpers.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "cap": 65536,
      "bodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/legacy.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "cap": 65536,
      "bodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/manipulation.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "cap": 65536,
      "bodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/querying.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "cap": 65536,
      "bodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/stringify.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "cap": 65536,
      "bodyRead": false
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/traversal.js",
      "context": "import",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domutils@4.0.2/node_modules/domutils/dist/index.js",
      "cap": 65536,
      "bodyRead": false
    }
  ],
  "nextAliasReadlink": [
    {
      "alias": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domelementtype",
      "context": "import",
      "subpath": ".",
      "from": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@6.0.1/node_modules/domhandler/dist/index.js",
      "cap": 4096,
      "readlink": false,
      "targetMetadataRead": false
    }
  ],
  "counts": {
    "directJS": 5,
    "directJSBytes": 21133,
    "directJSON": 3,
    "directJSONBytes": 5398,
    "directBodyTotal": 26531,
    "relativeEdges": 8,
    "bareEdges": 1
  },
  "runtime": false,
  "wholeClosureComplete": false
}
```

## 次有限scope提案

new metadataのentities8 ./decode import、nanoid3 ./non-secure require、picocolors root requireは上表nextEntryTargets exact3だけ各65536Bの次body提案。本文先読み0。新JSのrelative targetsは上表をexisting interim unionに照合してcanonical去重/既読を借用し、未読exactだけを次採用する。nextAliasesは文字列由来のsibling alias readlink-only各4096Bの別提案、targetfollow/body/metadata0。必要metadataが出れば正式exports/mainを先に読む。subpath/generalresolver/nativefallback/wildcard許可を作らない。

借用metadata3の正式import entryは既Root-owned reportsから再用し、他者とのfullunionで重複確認する。既元SOURCE/factory/preload/helpers3は未作成/変更0、native addon/read/load/ABI/DNS/HTTP/WebSocket/child/Vitest/import/default/DB/build/rootprobe/create0。全旧generatedSOURCE/build/output/TMP/results/private恒久NOOPS。

## union予算とSTOP

Root interim326はJS284/1202876B＋JSON42/509109B=1711985B、manifest64704B。記録25-interim-union1874B/SHA c4e1d3fbdd5b17b7b63a469670e5a7e8445eaf5f03b522eb19108869af156695の値はRoot通知借用、ここで実manifestを再読しない。新JS5/JSON3を機械的に326へ足して重複の成功値を作らない。JS256/JSON24/whole2MiB/material256KiBの旧runtimecapsは今も不変更で、閉包後にexactclass union去重と新budgetをRootへ再提案する。静的readの採用はruntime/load/native/resource予算成立へ転用しない。

本NEWphaseのみwx0600/O_EXCL/O_NOFOLLOW/fsync/実FDclose/fullhash固定。SOURCE327/main/C0/C1/S5/P5d/OWNER/helper/Manager変更0。全reader/writer/runtime STOP、nextread/工具実装/actualは別Root採用まで0。spec/spec-implement/新agent0。
