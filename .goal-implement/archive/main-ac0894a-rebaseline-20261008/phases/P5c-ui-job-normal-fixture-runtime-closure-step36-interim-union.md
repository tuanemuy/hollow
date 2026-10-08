# Normal fixture runtime interim union through step36

{
  "time": "2026-10-06T14:22:29.580832+00:00",
  "inputReportLabels": [
    "14-plan",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36"
  ],
  "addedByReport": {
    "14-plan": 221,
    "19": 5,
    "20": 5,
    "21": 18,
    "22": 17,
    "23": 10,
    "24": 33,
    "25": 16,
    "26": 8,
    "27": 11,
    "28": 4,
    "29": 2,
    "30": 1,
    "31": 2,
    "32": 2,
    "33": 3,
    "34": 2,
    "36": 1,
    "35-formal-table-borrow": 1,
    "16-borrowed": 1
  },
  "distinctRegular": 363,
  "classes": {
    "JS": {
      "files": 317,
      "bytes": 1427732
    },
    "JSON": {
      "files": 46,
      "bytes": 516221
    }
  },
  "wholeBytes": 1943953,
  "compactManifestBytes": 71909,
  "compactManifestSha256": "594996be069df3a0d85edf5e15ebede2548bd9593fee3a4a71f259bc8d839676",
  "fullClosure": false,
  "newRuntimePermission": false,
  "nativeAddonNotIncluded": true,
  "build708UnionNotYetComputed": true,
  "materialUnionNotYetComputed": true,
  "sourceMetadataReobserved": false,
  "privateOperations": 0
}

全入力PUBLIC報告だけcanonicalregular0600/selfUID/nlink1/fullstableSHAでdirectread。既formal rowsのpath/bytes/SHAを去重し、重複は全値一致。packageJS/source実物再read0、全runtime/private/rootprobe/create0。native package metadata1は既step16正式761B/fullSHAを借用、addon本体は別class除外。初回自前解析はstep14のBorrowed report欄をstep prefixだけと仮定し、initial-entries/initial-plan rowsを取り落としてcountassert停止。正式table221/1209890Bのschemaを確認しこの解析だけ補正。期待file内容は補正0。

既221filesと追加正式rowsの集計だけ、未閉包edge/constructor/options/TLAが残りload許可ではない。既runtimeJS256/JSON24/2MiB変更0。超過countは全閉包・去重後candidate予算の別提案対象。build708/source327/aliases/freshoutputs/material256Kの全union未完成、compactmanifest値を全materialへ転用0。
