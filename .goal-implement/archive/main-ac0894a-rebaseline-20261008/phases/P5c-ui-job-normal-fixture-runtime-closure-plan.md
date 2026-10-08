# 通常fixtureの公開runtime依存：次の有限読取計画

記録日時: 2026-10-06T10:58:59.519498+00:00

公開entry3件の直接読取を完了。次の候補読取はJS16件（各65,536B以内、合計上限1,048,576B）と `@libsql/core` alias readlink1件（文字列4,096B以内）。まだ読取許可を受けていない次targetsの本文・metadataは未読取。完全closureの件数・bytesは未確定であり、従来の32files/2MiB以内とは判断しない。新helper3件の作成・実行は完全closureの採用後。

## 直接確認した公開entry

各fileでcanonical一致、regular、UID501（自身）、nlink1、0644、個別cap内を確認。O_NOFOLLOWで全文を読み、前後lstat/fstatのdev/ino/mode/uid/nlink/size/mtime/ctime同値を確認してFDを閉じた。import/evalは行っていない。

| 正規公開path | bytes / cap | SHA256 |
| --- | --- | --- |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/lib/index.js` | 771 / 65,536 | `8e8e4179971e7edc1e3fd04c14ec7efe84ecf51deb12d5d052ecc59cdc89b5dc` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client/lib-esm/node.js` | 806 / 65,536 | `37a8115c013d5f5e5ada112059a6abb42dcc24b207e54240c57ced13fffb96e0` |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql/package.json` | 2,614 / 32,768 | `2c5b92e04a5c0f41139bfd678e67fc1569d7ba5fd9d35ac285901d122fa3522f` |

直接全文合計4,191B。前段のpackage2/alias確認は `P5c-ui-job-normal-fixture-runtime-entries.md`（5,395B、SHA256 `cb8787f5cea2131edf20b285ab6cfbbfd547ff060d529255a74e2d6620b0815b`）に固定済み。

## 次のexact JS読取案

以下は公式static import/export文字列又は正式package exportsから字句解決した候補。各fileでcanonical/regular/selfUID/nlink/fullstablehashを検査し、未知target、escape、symlink file、容量超過は停止する。directory walk/globで補完しない。

CSS基点（以下12件の共通absolute prefix）:
`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/lib/`

| 基点からのexact relative path | entryの根拠 |
| --- | --- |
| `syntax/index.js` | default syntax import |
| `version.js` | export * |
| `syntax/create.js` | createSyntax export |
| `utils/List.js` | List export |
| `lexer/Lexer.js` | Lexer export |
| `tokenizer/index.js` | tokenTypes/tokenNames/TokenStream/OffsetToLocation export |
| `definition-syntax/index.js` | namespace export |
| `utils/clone.js` | clone export |
| `utils/names.js` | export * |
| `utils/ident.js` | namespace export |
| `utils/string.js` | namespace export |
| `utils/url.js` | namespace export |

各65,536B、12件合計cap786,432B。既読のindex.js自身はこの12件に含めない。root entryのstatic re-exportは評価対象なので、未使用exportを理由に除外しない。これらから先のrelative JS/JSON/bare importsはまだ不明であり、次の読取結果に基づいてexact範囲を再提案する。mdn-data/source-map-jsのpackage宣言だけでは本文読取を開始しない。

libSQL client基点:
`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client/lib-esm/`

| exact relative path | 根拠 |
| --- | --- |
| `sqlite3.js` | _createSqlite3Client static import |
| `ws.js` | _createWsClient static import |
| `http.js` | _createHttpClient static import |

各65,536B、3件合計cap196,608B。将来fixtureのconfigはfile schemeに固定するが、node.jsのstatic importsはws/http modulesも評価する。JS読取の必要性と通信実行は分ける。HTTP/WebSocket branch実行・外部通信は今回も将来fixture案も許可しない。

libsql package exports `.` のdefaultは `./index.js`。type未指定のCJS entryとして次の1件だけ提案する:
`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql/index.js`（65,536B以内）。`./promise` は別exportであり現在不要。auth.js/sqlite-error.js等のfiles欄はrequire到達の証明にならないので、index.jsの正式require文字列を確認する前に読まない。

## Bare importsのalias-first gate

client node.jsは `@libsql/core/config` をimportし、`@libsql/core/api` をre-exportする。次は既clientの正式sibling alias1件だけをreadlinkする案:
`/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/core`

readlink文字列cap4,096B。字句導出したtargetのpackage.jsonはこの段階ではstat/readしない。targetが固定できたら、そのexact package.json（32,768B以内）をRootへ別提案し、正式exportsのconfig/api選択に基づくJSだけを追加する。store directory探索・推測したcanonical target・別package fallbackは使わない。

libsql packageのdeclared dependenciesは @neon-rs/load とdetect-libc、darwin-arm64 optional dependencyは0.5.29。ただし現在はpackage宣言確認のみで、実index.jsのrequire到達は未確認。loader/helper alias及びnative addonの新metadata/body読取は未許可。以前の公開native addon7837712B/SHA3fd9…の行は静的借用情報に留まり、今回dlopen/ABI/physical closureの証拠ではない。他platform addonの読取・探索は不要。

## 次の判断と停止

次の候補はJS16件/最大1MiBとalias1件のみ。結果により必要なrelative imports/require/JSON/bare aliasesのexact targetsと個別capを返す。全closureが2MiB・32filesに収まるか、追加classやpackageが要るかは未確定。新SOURCE327・fresh output4・public dependency JS/native・helper materialを別の型として固定し、unknown importsを一般resolver許可へ広げない。

本phaseは公開3件のsource-only確認と計画1pathの作成のみ。helper/source/管理文書の編集、Node import/eval、CLI/default/build/fixture/DB/native/browser/network、rootprobe/create、旧成功・失敗SOURCE/build/TMP/results/proof等の操作は0。DFA candidateとS5 source/helperは無変更のままSTOP。提案の全文hash固定後、全読取・writerを停止してRootの次scope判断へ返す。
