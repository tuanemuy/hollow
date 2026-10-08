# normal PUBLIC runtime closure step34

Root採用のentities8.0.0 ESM encode/escape二JSだけを静的に読んだ。各64KiB/unique131072B内、実8012B。canonical regular644/selfUID501/nlink1、O_NOFOLLOW/fstatと前後lstatのdevice/inode/bytes/mode/mtime一致、全bytes SHA256と実FDcloseを確認した。未採用targetのmetadata/bodyは読んでいない。実行/import/Node/default/build/DB/native/通信/rootprobe/create/env/source/helper/Manager変更0、全旧generatedSOURCE/build/results/TMP/cache/key/proof/private恒久非操作。

基点はRoot採用step33 entities8 root index3604B/SHA256 `442e6496aca70e865e6e9f295a71794e1889d247031e77ea1c58c415d172485b` のESMimportであり、本roundでは再読していない。decode側の既formal根拠は借用、不変更。

## 直接読取と正式辺

| Exact PUBLIC JS | Bytes | SHA256 | Mode |
| --- | ---: | --- | --- |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/encode.js` | 3272 | `40a788f341a5e60b3a88c24987565a05cd96fb6d5be6e81820a45c6b6deb1a63` | 644 |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/escape.js` | 4740 | `c898ee1bfdaa487bdc4157b318f13dd67e8697fd82a22eefd270ddb7440561ee` | 644 |

encode.js全文の正式トップレベルimportは `getCodePoint, XML_BITSET_VALUE from "./escape.js"` と `htmlTrie from "./generated/encode-html.js"` の二つ。前者は本round直接読取済。後者の字句targetは次のexactJS一つとして提案する。ESMimport文脈を維持し、CJS親require条件を伝播させない。

escape.js全文にimport/export-from/require/dynamicimportはない。exportはgetCodePoint/XML_BITSET_VALUE/encodeXML/escape/escapeUTF8/escapeAttribute/escapeText。encode.jsのexportはencodeHTML/encodeNonAsciiHTML。Map/Uint32ArrayやString.codePointAt分岐は公開JS本文上の構築/分岐であり、実行していない。sourceMappingURLの.mapコメントとJSDoc URLをruntimeimportに数えず、新readを提案しない。barepackage/alias辺0、未確定のfallback/一般resolver/walkを追加しない。

## 次の最小READ提案

`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/encode-html.js` 一JS、各65536B/unique65536B/round2MiBの既静的読取枠内で、同canonical/regular644/selfUID/nlink1/stablefullSHA/FDclose境界を先に確認する。サイズが枠を超えるなら本文前にSTOPしexactcap補正をRootへ提案する。metadata/body/imports/exportsは未読であり、依存なしや閉包成立を推測しない。Root採用まではこのtargetへstat/read/hashしない。

Root固定union359（JS313/1402701B、JSON46/516221B、total1918922B、compact71125B/SHA256 `6b335530b53b06f51a968e445d066e8607b9a7d077fa77257f235a273967acd7`）とRoot申告「本2target未formalrows」だけを借用した増分は2JS/8012B。統合すれば361（JS315/1410713B、JSON46/516221B、total1926934B）となるが、unionを再構成して同一性確認した結果ではない。Root次union固定が必要。runtimeJS256/JSON24/whole2MiB/material256KiBを静的read結果だけで増やさない。constructor/plugin/TLA/filesystem/API actual、通常fixture全runtime閉包/予算は別採用で未成立。

## Exact static evidence

以下は本roundの有限直接metadataと正式import/exports、次proposalだけを記録する。private値/ログ/rawproofは含まない。

```json
{
  "scope": {
    "files": 2,
    "perFileCap": 65536,
    "uniqueCap": 131072,
    "actualReadBytes": 8012,
    "codeExecuted": false
  },
  "rows": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/encode.js",
      "bytes": 3272,
      "sha256": "40a788f341a5e60b3a88c24987565a05cd96fb6d5be6e81820a45c6b6deb1a63",
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "canonical": true,
      "FDClosed": true,
      "dev": 16777233,
      "ino": 103511024,
      "mtimeNs": 1779596641376516600
    },
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/escape.js",
      "bytes": 4740,
      "sha256": "c898ee1bfdaa487bdc4157b318f13dd67e8697fd82a22eefd270ddb7440561ee",
      "mode": 420,
      "uid": 501,
      "nlink": 1,
      "canonical": true,
      "FDClosed": true,
      "dev": 16777233,
      "ino": 103511025,
      "mtimeNs": 1779596641376636400
    }
  ],
  "edges": [
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/encode.js",
      "syntax": "import",
      "specifier": "./escape.js",
      "context": "Node ESM import",
      "bindings": [
        "getCodePoint",
        "XML_BITSET_VALUE"
      ],
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/escape.js",
      "status": "direct this round"
    },
    {
      "importer": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/encode.js",
      "syntax": "import",
      "specifier": "./generated/encode-html.js",
      "context": "Node ESM import",
      "bindings": [
        "htmlTrie"
      ],
      "target": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/encode-html.js",
      "status": "proposed only, metadata/body unread"
    }
  ],
  "exports": {
    "encode": [
      "encodeHTML",
      "encodeNonAsciiHTML"
    ],
    "escape": [
      "getCodePoint",
      "XML_BITSET_VALUE",
      "encodeXML",
      "escape",
      "escapeUTF8",
      "escapeAttribute",
      "escapeText"
    ]
  },
  "nextRelativeTargets": [
    {
      "path": "/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/entities@8.0.0/node_modules/entities/dist/generated/encode-html.js",
      "context": "Node ESM import",
      "perFileCap": 65536,
      "uniqueCap": 65536,
      "scope": "proposed only"
    }
  ],
  "nextAliasReadlink": [],
  "nextPackageJSON": [],
  "runtimeClosureComplete": false
}
```

本roundの全reader/writerは報告固定後STOP。SOURCE100 OR候補/他C0C1P5dS5/工具/実行には触れていない。
