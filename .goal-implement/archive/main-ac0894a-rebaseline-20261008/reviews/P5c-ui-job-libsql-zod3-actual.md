# UI browse4 zod3 actual 独立限定 review

固定日時: 2026-10-06T10:02:06.126151+00:00

判定: **actual FAIL / held**（Root 安全報告借用）。PUBLIC 静的照合で **MAIN-FIELDS-JSBI1: declared conditional input不足1件**を確認した。実 INPUT_SCOPE の拒否対象・原因は UNKNOWN。補正案はまだ候補作成・実行を許可せず、製品機能 / UI / native正常閉鎖の受入0。

## 固定対象と borrowed / direct

Root safe phase `phases/P5c-ui-job-libsql-zod3-actual.md` 3120 B / SHA `ce6822a25d21121d7f6be098954c268bc77104daea4ab7f11bab3738fba38285` を stable全文読取した。

固定 PUBLIC helper:

- runner26495 / `09903e6c8cfddebcb21c901cd060fd241734e13329b167c5db4668da4ab27876`
- driver10061 / `6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac`
- packed117101 / `cb0276b8f71d882593eb18746483498e88953ae8a916bd0f537c3c54e322c05e`

上記4ファイルは canonical / regular600 / selfUID / nonlink / nlink1 / NOFOLLOW / dev-inode-size-mtime-ctime等の読取前後と close後path一致 / 全文SHAを直接確認した。既 RESOLVE-ZOD1 独立 STATIC PASS（6834 / 7b0b81ce…）の不変scopeを継承。source327 / deps707全内容の再walkや生成領域実体を今回確認していない。

Root direct PUBLIC3/packed/meta → existing default の source327/deps707 fullhash → 追加 PUBLIC deps707 stablehash/aliases10 → SOLE --run の実行は借用。前reviewの precheck順は既 PUBLIC helper/packed/pinnedmeta → existing defaultによる source/deps検査 → ONEであり、別 source/Gitreader事前実行を追加必須にした趣旨ではない。

## safe actual の意味

Root safe全文:

```json
{"schemaVersion":1,"executed":true,"normal":false,"held":true,"nodeExit":-15,"knownPGAbsent":true,"pipeEOF":[true,true],"controlEOF":true,"fdClosed":[true,true,true,true],"force":true,"signals":{"TERM":"sent-success","KILL":"not-attempted"},"rawDiscardBytes":[0,0],"frames":[{"event":"header","schemaVersion":1,"entries":4,"nativeWorkers":0,"database":false},{"event":"service","registered":true,"count":1,"stderr":null,"observation":"after-start","actualOwnedPGMatch":true},{"event":"held","kind":"UNKNOWN","phase":"INPUT_CHECK","reason":"INPUT_SCOPE"}],"databaseAudit":false}
{"schemaVersion":1,"normal":false,"held":true,"kind":"UNKNOWN","databaseAudit":false}
```

Python1 / elapsed0.298040292sは借用。Nodeは監督TERM -15で force=true。PG absent / 2PIPE EOF / controlEOF / 独立4FDcloseは outer物理停止の安全根拠であり、esbuild service個別正常閉鎖ではない。stderrNULLは inherit形の未観測、rawDiscard[0,0]を個別service EOFへ転用しない。

driver line112–130の直接静的契約では `await esbuild.build` が戻り `state.buildDone=true` となった後、errors/warnings等の既gateを通って INPUT_CHECKへ進む。metafile.inputs の各keyを元 `path.resolve` / `original.realpath` へ通し、source327絶対path + dependencies707 canonical集合にない場合だけ INPUT_SCOPEを発行する。従って今回 safe frameはこの membership拒否を示す。ただしどのpath/何番目/何件か、virtual inputの有無、四output完全性、build正常終了・service正常閉鎖は未観測。元buildPromiseが戻ったことを全build正常gate通過へ補完しない。以前 startup2 BUILD_PENDING/UNKNOWNの原因を遡及確定しない。

## MAIN-FIELDS-JSBI1: PUBLIC 確定した declared差

既登録 jsbi package.json 1626 B / SHA `756c2c1b6e80e9e8488fe7ad66403a8307b115a0dc141966e69adf41eb39efc6` を NOFOLLOW stable全文確認した。正式 literalは `main:dist/jsbi-cjs.js`、`module:dist/jsbi.mjs`、exports無し。現driverは `platform:node` / mainFields未指定である。

esbuild 0.27.7 の defaultMainFields は Nodeで main→module、loadAsMainFieldはこの順の実在entryを採る。module-primaryの自動fallback枝は最初にmoduleが選ばれた場合の枝であり、Node既定main-firstを置換しない。[esbuild 0.27.7正式resolver（defaultMainFields, loadAsMainField）](https://raw.githubusercontent.com/evanw/esbuild/v0.27.7/internal/resolver/resolver.go)。公開APIも Node既定main,moduleを記載する。[esbuild main fields](https://esbuild.github.io/api/#main-fields)。

現 packedの jsbi runtime edgeは temporal/index.esm.js → jsbi → `dist/jsbi.mjs`。dependencies707の jsbi recordsは mjs / d.ts / package.json の3項目であり、CJS mainは0。Node/ESM解析で作った declared closure と stock Node-target bundler の mainFields 条件が一致しない。

Root追加採用の **exact PUBLIC1path** を実行せず直接読取した:

`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/jsbi@4.3.2/node_modules/jsbi/dist/jsbi-cjs.js`

- 29223 B / SHA `b952fc88337eae5d90b397da4251e207d816056ea4c574df576f17e68626dd94`
- canonical / regular0644 / UIDself501 / nlink1 / NOFOLLOW / stable全identity / 1MiB内。
- 全文に `require` / `import` / `eval` / `Function(` token0、末尾 `module.exports=JSBI`。追加 runtime import0。sourceMappingURL commentはruntime importではなく、map実物の存在/読取を確認した根拠にしない。

従って正式 stock mainが実在するのに declared knownInputsから除外されている **静的 input集合不足**を確認できる。これを今回の actual拒否path確定には使わない。実 metafile / output / raw stderr / generated source / private actualrowsは一切読んでいない。

同じ既知7 package.jsonの有限照合では、zod / parse5 / drizzle / temporal / entities は exportsのimport/default対象が現runtime tableのESM targetと対応し、esbuild自身のmain lib/main.jsは既登録。今回確認した範囲で jsbi以外のmain-vs-module declared差は発見なし。全 dependencyの実解決、仮想inputの不存在、unknown ambient inputの不存在を証明した判定ではない。

## 最小 PUBLIC-only 補正提案（未実装）

- dependency recordsへ上記 **jsbi-cjs exact1row** を追加。canonical / mode420 / UID501 / nlink1 / bytes29223 / 上記fullSHAを固定。既 jsbi.mjs rowとNode-derived edgeは維持し、stock mainFields由来の additional conditional inputとして区別する。未知path / packagefamily / directory / virtualinput一般の許可は0。
- deps707→**708**、dependencyBytes13984808→**14014031** を source-derived固定。runner line90の exactcount/bytes と defaultの固定 projection line538を同じ値へ更新し、packed payload/envelopeSHA・runnerの従属SHA・必要materialsizeを新bytesから再計算する。無登録入力を正常化するguard変更や実観測値から期待を生成する方法は使わない。
- 元 source327 / sourceManifest4b397 / candidate79 / aliases10 / linkTargets7 / four entry / buildAPI・options・Promise / nativeidentity / supervision / knownPG・EOF-FD正常gateを維持する。mainFieldsをmodule優先へ変えて入力検査を通す方針はこの最小scopeに含めない。
- deps body追加29223Bは公開既存fileのみで新install/new package/new native resourceは0。root192MiB / source32 / output16 / TMP8 / log2 / material256KiB / payload2MiB / body60+tail30を維持。旧material190521は旧実算式であり、補正後の正確なpacked/helperbytesを候補固定前に再計算する。
- **新 SOURCE / BUILD / toolTMP の未使用予約**が必要。失敗zod3/e762bb91、startup2/94f1、original/a063、全旧privateを再利用しない。既Rootのみがscope採用し、担当が固定新PUBLIC候補とfullinverse・hash・capacityを提示→独立deltaPASS→Root別 precheck/default/ONE の順である。

決定的declared差が得られたため、情報増分のない blind retryやraw metafile診断を要求しない。補正後にも INPUT_SCOPEが残る場合は、次の別採用scopeとして exact candidate membershipの有限分類（source / registereddep / formal-main-known-but-unregistered / virtual-known-shape / otherなど）を検討できるが、未知path/IDやerrorpropsを表示せず今回追加実装しない。

## 停止と限界

今回は PUBLIC安全phase / 既helper3 / 既知7packageJSON / 正式upstream / Root採用exactjsbi-CJS1のみ。全生成e762 SOURCE/BUILD/TMP・成功失敗含全旧privateは永久NONOP、stat/read/hash/copy/import/reopen/cleanup0。Node/import/default/preflight/actual/Gitreader/rootprobe/sourcecreate/DB/network/browser/mainworking/S5/P5d操作0。製品/helper/Manager編集0。この新reviewをwx0600固定し、全読取STOP。
