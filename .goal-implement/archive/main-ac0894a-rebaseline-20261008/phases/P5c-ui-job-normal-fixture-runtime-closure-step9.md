# P5c UI normal fixture — PUBLIC runtime closure step9

入力step8: 9459B / SHA256374b47fab98dedfe32b17e5bfffd56726892d166fcdf7816e46ab7b4edc4d3fb、regular0600/nlink1/canonical/selfUID、O_NOFOLLOW全文hash/前後identityを直接確認。Root採用2JSとalias1のみを読取。2JSの本文去重1712B（172+1540）<=unique131072B、alias文字列31B<=4096B、今回依存読取1743B。全JS canonical regular/nonlink/selfUID501/nlink1/actual0644、各65536B以内。次targetの本文/metadataは未読取。

## 直接metadata / formal辺

| Exact absolute path | Bytes | Actual mode | SHA256 | Formal exports/edges |
| --- | ---: | --- | --- | --- |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/util.js | 172 | 0644 | f8c168677209b70fecd7b7f1630878d85cf3eac3280b78dcac365f5d2651fa0a | export constants VARINT/FIXED_64/LENGTH_DELIMITED/GROUP_START/GROUP_END/FIXED_32、追加module edge無し |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/base64.js | 1540 | 0644 | 651bf433cf05e9ec8cee0b94639483236a605d48279e83d3d5c5de81c21d6599 | exports.encode/decode、追加module edge無し |

lstat/canonical→O_RDONLY|O_NOFOLLOW→fstat→単一全文read/SHA→fstat/pathlstat。dev/ino/size/mtimeNs/ctimeNs/mode/UID/nlink前後同値、FDはfinally close。atimeは読取変動のためsignature外。native/import/require/eval実行0、CJS.js確認をextensionless/JSON/nativefallback一般許可へ転用0。base64文字列表はcode本文であり新依存/外部I/Oではない。

## ws sibling alias（文字列だけ）

exact alias `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+isomorphic-ws@0.1.5/node_modules/ws`。

lstat結果symlink/selfUID501/nlink1/actual0755、dev16777233/ino103421545。os.readlink結果 `../../ws@8.20.1/node_modules/ws`、UTF-8 31B。readlink前後のdev/ino/size/mtimeNs/ctimeNs/mode/UID/nlink同値。alias自身はcanonical regular要件の対象ではなく、明示readlink採用のsymlink。targetのrealpath/resolve/stat/本文読取は0。実package/version/exports成立をこの字句名から証明しない。

文字列だけをalias親へPOSIX相対連結・lexical正規化すると、candidate package rootは `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws`。これはactualcanonical/existence証明ではない。unknownancestor walk/glob/fallback無し。

## 次のbounded exact scope案

| Exact candidate | 根拠 | 上限 |
| --- | --- | ---: |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/package.json | W:node.mjsのbareimport ws→今回stable siblingalias文字列から得た唯一package root | JSON32768B、round2MiB |

Rootが別採用した後だけ、target canonical/regular/selfUID/nlink1/actualmode/stable全文hashで上記一fileを読む。異常/不在は停止し代替探査しない。formal name/version/type/main/exportsと選択条件から次entryのexact文字列を提案する。index.js/wrapper.mjs/browser/nativeaddon等の本文・metadata先読み0。今の成果は2JS追加辺無し＋ws alias文字列の閉包進展のみ。

旧wholeJS32/whole2MiB未成立、全closure去重表・runtime/material/native budgetは別Root採用。実fixture/build/DB/WebSocket/正常closure/nativeproof/ABI成立を補完しない。新helper3作成0。

## STOP

この新phaseのみwx0600/O_EXCL/O_NOFOLLOW/fsync/actualclose/自己stable全文hash固定。dependency2JSを一回ずつ読取、alias一回readlink、target body/metadata0。C0/S5/P5dSOURCE/helpers/main/Manager読取変更0。全旧generatedSOURCE/build/results/TMP/cache/key/proof/privateは永久NOOPS: stat/read/hash/import/copy/reopen/replay/cleanup0。runtime/default/import/ABI/addonreadload/HTTP/DNS/WebSocket/child/DB/build/rootprobe/create0。全dependency/source/helper/report reader/writer STOP。

UTC: 2026-10-06T11:52:19.805400+00:00
