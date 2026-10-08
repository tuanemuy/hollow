# P5c UI normal fixture — PUBLIC runtime closure step8

入力step7: 26,168B/SHA256 f24909890c5c1c398f0885b50890c0b845d6e6fd0fc3a96683da23f415d4a783。Root採用の必須15JSだけを単一passで全文読取。全15がcanonical regular/nonlink/selfUID501/nlink1、実mode0644。依存本文去重合計48598B、unique上限15×65,536=983,040B、round本文上限2MiB以内。入力公開報告の読取は依存本文と別計数。新targetの本文/metadata/readlinkは未読取。static edge閉包の次範囲を提案するだけで、runtime/normalfixture/全closure完成の証拠ではない。

## 読取契約

exact登録pathだけをlstat/canonical→O_RDONLY|O_NOFOLLOW→fstat、65,536B cap内の全文読取/hash→fstat/pathlstatでdev/ino/size/mtimeNs/ctimeNs/mode/UID/nlink同値、元FDをfinally close。読取で変動し得るatimeは同一性signatureから除外。全本文を静的に確認し、formal import/require/exportを抽出。未知walk/glob/prefixfallback/ambient ancestor/native/JSON fallback/extensionless実resolve0。dependency再読取0。CSS utils names/string/urlはRootのstep2既読判定を借用して新読取0、去重合計へ今回加算しない。

## exact prefix

prefixと下表相対文字列の単純連結が唯一のexact絶対path。prefixから探索しない。

| Prefix | Absolute prefix |
| --- | --- |
| H: | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/ |
| S: | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/ |
| W: | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+isomorphic-ws@0.1.5/node_modules/@libsql/isomorphic-ws/ |

## 実metadata

| Exact path | Bytes | Actual mode | SHA256 |
| --- | ---: | --- | --- |
| H:lib-esm/byte_queue.js | 1430 | 0644 | 856a6f6edd67721ed2303458d55ae3fc850f8f8e1cc66b000aacda333202d988 |
| H:lib-esm/cursor.js | 24 | 0644 | 81285f12c4f0c4061ce6ecbb7736c3e5a2e7a99d10532e7b58a6105904974ab3 |
| H:lib-esm/encoding/json/decode.js | 1596 | 0644 | 20921a8fbdcc955ee2c3b447395284db0b7b878ceae98716a9edfda39fa51133 |
| H:lib-esm/encoding/json/encode.js | 1761 | 0644 | 97a7fb427edddb001a40f7955418d68baf716d8effde070f392c16306bd9806f |
| H:lib-esm/encoding/protobuf/decode.js | 4065 | 0644 | aacd44a7c4318ac79a683ad742ac1b9ea5605aa885b436e9d27aa7df7850ba5a |
| H:lib-esm/encoding/protobuf/encode.js | 2682 | 0644 | 799f98e0154330bbc47dca4e7f70d210132b7e744952cf8fdb76d73b8cf9d041 |
| H:lib-esm/shared/json_decode.js | 3716 | 0644 | cb31f73f548553dec284c31681305ae57aa778cceb45312d16cfef72fa460e50 |
| H:lib-esm/shared/json_encode.js | 2020 | 0644 | 486da2678a78c9db0349e8bb0bc16966df719383fe449f3dfa38c8c3ff2d645b |
| H:lib-esm/shared/protobuf_decode.js | 3547 | 0644 | 4c1c79cd2776e3372c56ebeee061af6d537aab5387e08f7beda8e2c8800c1bb7 |
| H:lib-esm/shared/protobuf_encode.js | 2050 | 0644 | 1ce435ea31d5d07b937831e11fd7d8a0558f764a953363a8c6da44ffcde7b789 |
| S:lib/base64-vlq.js | 4714 | 0644 | f3407e528f54ec0787bd0a71eeac0c99fffd98445916fcbe116dc69ca3be928b |
| S:lib/util.js | 15403 | 0644 | 0629f3ae2f3049cda3a2e87ea651dcf0cc71108f4681795ab989a8ac1573fc03 |
| S:lib/array-set.js | 3197 | 0644 | 163bb3055aaea7140167740036a83161fd912c344b14f992754b80f21477d754 |
| S:lib/mapping-list.js | 2339 | 0644 | 35ddb82861f11a70ab84cb47d620fcb28d7f884bb444644e06bde815b836ef9e |
| W:node.mjs | 54 | 0644 | 7c802f1fdd118e3e65bfb99ebc3b7c4b5b3c6a15146d517bd75405cbda9bb6b9 |

## formal辺

| Source | Formal literal | 分類 |
| --- | --- | --- |
| H:lib-esm/encoding/json/decode.js | ../../errors.js | 既step7辺のH:lib-esm/errors.jsへ戻る、本文新読取0 |
| H:lib-esm/encoding/protobuf/decode.js | ../../errors.js | 同既辺 |
| H:lib-esm/encoding/protobuf/decode.js | ./util.js | 新exact候補H:lib-esm/encoding/protobuf/util.js |
| H:lib-esm/encoding/protobuf/encode.js | ./util.js | 同新候補、去重1 |
| H:lib-esm/shared/json_decode.js | js-base64 | bareimport、step7 B:base64.mjs本文を既読として借用。alias実resolveの新証明0 |
| H:lib-esm/shared/json_decode.js | ../errors.js | 既H:lib-esm/errors.js |
| H:lib-esm/shared/json_decode.js | ../encoding/json/decode.js | 今回既読、追加読取0 |
| H:lib-esm/shared/json_encode.js | js-base64 | 同bareimport、追加採用targetを推測しない |
| H:lib-esm/shared/json_encode.js | ../util.js | step7 H:lib-esm/util.js既読 |
| H:lib-esm/shared/protobuf_encode.js | ../util.js | 同既読 |
| S:lib/base64-vlq.js | require('./base64') | 新CJS exact.js字句候補S:lib/base64.js |
| S:lib/array-set.js | require('./util') | 今回S:lib/util.js既読、.js候補だけ。CJS実resolveは未実行 |
| S:lib/mapping-list.js | require('./util') | 同既読 |
| W:node.mjs | ws | 新bareimport、sibling aliasの有限readlink次採用が必要 |

ByteQueue/Cursor、JSON ObjectWriter、protobuf reader/writer、shared/protobuf_decode、S:lib/util.jsには追加formal module edgeを抽出しない。S:util.jsのURL/path正規化は文字列計算、JSON.parseは呼出時の文字列parserでありnative/module load辺ではない。ByteQueue等のbuffer/memory挙動はSOURCE分岐としてのみ確認、runtime/memory上限の成立は未検証。今回対象からdynamic import・eval・native addon load・child spawn・DNS/HTTP/WebSocket実呼出は実行していない。W:node.mjsのWebSocket import/reexportは本番通信を許可するものではない。

## export集合（静的）

| Source | 公開export |
| --- | --- |
| H:byte_queue.js / cursor.js | ByteQueue / Cursor |
| H:encoding/json/decode.js | string, stringOpt, number, boolean, array, object, arrayObjectsMap, readJsonObject |
| H:encoding/json/encode.js | ObjectWriter, writeJsonObject |
| H:encoding/protobuf/decode.js | FieldReader, readProtobufMessage |
| H:encoding/protobuf/encode.js | MessageWriter, writeProtobufMessage |
| H:shared/json_decode.js | Error, StmtResult, BatchResult, CursorEntry, DescribeResult, Value |
| H:shared/json_encode.js | Stmt, Batch |
| H:shared/protobuf_decode.js | Error, StmtResult, BatchResult, CursorEntry, DescribeResult |
| H:shared/protobuf_encode.js | Stmt, Batch |
| S:base64-vlq.js | exports.encode, exports.decode |
| S:util.js | getArg, urlParse, urlGenerate, normalize, join, isAbsolute, relative, toSetString, fromSetString, compareByOriginalPositions, compareByOriginalPositionsNoSource, compareByGeneratedPositionsDeflated, compareByGeneratedPositionsDeflatedNoLine, compareByGeneratedPositionsInflated, parseSourceMapInput, computeSourceURL |
| S:array-set.js / mapping-list.js | exports.ArraySet / exports.MappingList |
| W:node.mjs | WebSocket |

上表はproperty export文字列であり型/loader/import成功や実到達保証ではない。任意export valueを実行していない。

## 次のexact bounded scope案（未採用・未読取）

| Exact target | 根拠 | 上限 |
| --- | --- | ---: |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/util.js | protobuf/decode.js、encode.jsの明示./util.js | JS65,536B |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/base64.js | base64-vlq.jsのrequire('./base64')から既採用CJS .js候補だけ | JS65,536B |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+isomorphic-ws@0.1.5/node_modules/ws | node.mjs bare wsのpackage sibling alias字句候補 | readlink文字列4,096B、lstat前後identity/canonical target有限metadata案 |

JS2 unique上限131,072B、alias文字列4,096B、合算135,168B、round上限2MiB。存在/mode/hash/targetは未確認。ws aliasが不存在/regular/異常なら探索せず不足を返す。symlink targetが正式公開canonical package rootと束縛できた後にだけ、別採用でそのexact package.jsonを32,768B以内で読む案を提出する。今回JSON本文/未知ws root metadata先読み0。package exportsからESM/CJS entryが判定できるまでws/index.js等を推測読取しない。

source-mapのbase64.jsはexplicit .js分岐候補だけで、拡張子無し原path/JSON/index/native fallbackを一般許可しない。H:errors.js、util.js等の過去既読への戻りは今回必要newreadにしない。js-base64 barealiasの過去完全束縛はstep7の既B候補を借用する限界であり、新実resolveを成功と補完しない。CSS utils3既読はRoot判断借用、本文0。

旧wholeJS32/whole2MiBは未成立のまま。各step本文去重合算・metadata/material/native resources/runtime closureの全体予算改訂はRootの別採用が必要。今回15安定読取をnormalfixture/Node native ABI/SQLiteFD/TLS/WebSocket/DB/normalproof成功へ転用しない。新fixturehelper3作成0。

## STOP / 禁止範囲

この新phaseだけwx0600/O_EXCL/O_NOFOLLOW/fsync/actualclose/自己全文hash固定。C0/P5d/S5 SOURCE/helpers/main/Manager変更・読取0。全旧generatedSOURCE/build/results/TMP/cache/key/proof/private（成功失敗を含む）永久NOOPS、stat/read/hash/import/copy/reopen/replay/cleanup0。runtime/import/eval/ABI/addonreadload/DNS/HTTP/WebSocket/child/default/DB/build/rootprobe/create0。次targets先読み0。全dependency/source/helper/report reader/writer STOP。

UTC: 2026-10-06T11:50:21.930141+00:00
