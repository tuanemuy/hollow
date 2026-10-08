# 通常fixture：PUBLIC runtime entry 読取scope

判定：採用済みpackage.json2件とclient sibling libsql alias readlink1件だけを直接確認。正式exports由来の次entry集合を返す。JS / libsql target package / native addonは未読取、runtime/import/default/build/DB/Worker/rootprobe/create0。DFA helperとSOURCEは全STOP維持。

## 直接確認

| exact PUBLIC package.json | bytes | SHA256 |
| --- | ---: | --- |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/package.json | 3909 | bd734f2de92e7a254bd05970fa83b30f8be9ed73e33577065a1529e59843cfd4 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client/package.json | 3615 | 6f28e8e2aed00e442f436657888623245b2edd90c8856f01559133041e93d679 |

両fileはcanonical/regular0644/UID501/nlink1/NOFOLLOW、lstat/open-fstat/全文読取/fstat/path再確認のdev/inode/mode/uid/nlink/bytes/mtime/ctime一致。各32768B上限内、本文はpackage正式metadataだけ。未知walk/他package metadata0。

- css-tree name/version はcss-tree/3.2.1、type=module。root exportのimportは `./lib/index.js`、requireは `./cjs/index.cjs`。Node ESMからの原bare importは前者。dependenciesはmdn-data2.27.1とsource-map-js^1.2.1。これらtargetの本文/metadataは今回未読取。
- @libsql/client name/version は@libsql/client/0.18.0、type=module。root import条件node/default/denoは `./lib-esm/node.js`、workerd/edge-light/netlify/browserはweb.js。原Nodeで独自conditionを足さずnode branchに束縛する。root requireは `./lib-cjs/node.js`。sqlite3 subpath importは `./lib-esm/sqlite3.js` だが原node entryのrelative import有無は本文未読取なので先取りしない。
- client dependenciesは@libsql/core^0.18.0、@libsql/hrana-client^0.10.0、js-base64^3.7.5、libsql^0.5.28、promise-limit^2.7.0。package declarationはJS実行閉包やnetwork到達成功の証拠ではない。

唯一採用alias `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/libsql` のreadlinkは `../../libsql@0.5.29/node_modules/libsql`。lexical target候補は `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql`。このtargetのstat/regular/UID/nlink/canonical確認・package.json/body/hash・native loadは0。readlink由来の文字列だけでcanonical target確認済みとは扱わない。

## 次の最小追加読取案

| 正式entry / metadata | 個別上限 | 根拠 |
| --- | ---: | --- |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/lib/index.js | 65536B | root ESM正式export |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client/lib-esm/node.js | 65536B | root ESM node正式export |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/libsql@0.5.29/node_modules/libsql/package.json | 32768B | 元clientの宣言依存と唯一alias readlink |

次採用はこの3file（合計163840B以内）だけを提案。regular/selfUID/nlink1/NOFOLLOW/canonical/stable全文hashを固定し、exports/importsをdata-onlyで選別する。現時点で読取0。Node import/require/module解決の実行はしない。上限/metadata不一致はheld、別target探索0。

CSS indexのrelative exports/imports、client node entryのrelative imports、libsql package exportsから、次のexactJS/JSON/canonical target候補を先に列挙してRootへ返す。32file×65536B/2MiBの旧案は初回閉包の仮上限であり、CSS全closureが足りると判定していない。必要file数/bytesが超える場合は原import edgeと有限集計に基づく不足を提示してから追加scope採用を求める。glob/store walk/任意prefix/general resolver fallbackで増やさない。mdn-data/source-map-js/hranaなどのalias/bodyもimportsが示した次scopeへ分け、未採用targetを先読しない。

CJS indexはlibsql正式exports読取後にのみ必要pathを固定する。旧静的addon7837712B/3fd9… rowは借用であり、現在のnative binaryのstat/hash/body/ABI/dlopen成功へ補完しない。nativeaddon1は今回metadata/body0、Root別採用が必要。

## 将来候補への束縛

build708 closureと新runtime closureを別集合・別bytes/hashへ。ownSOURCE327/Githash600、同operationoutput4/build実hash600、PUBLIC正式deps元mode/canonical、exactpreload helperを別classに保つ。SOURCE bare css-tree/@libsql/client、new noteProjectionからのcss-treeは元Node exportsとexactparentの有限aliasで成立させる。libsqlは元client sibling aliasから正規解決できるので、root libsql aliasを無条件に追加しない。aliasの増加・新PUBLIC file数/bytesは候補でRoot採用範囲へ明示し、現在708やselected327に黙って含めない。

正常fixture plan-correction12913B/2c42db31、source/main79、new3helper未作成、D1 SOURCE/helper・UI/main/S5/P5d/Manager文書は変更0。全旧generated SOURCE/build/output/TMP/DB/key/proof/resultsは永久NONOP。読取は採用PUBLIC package2 + alias1を超えず、新root literal予約/probe/作成0。

本新fileをwx600/fullstablehash固定後、ALLreader/writerSTOP。次JS/metadata読みはRoot別採用後のみ。
