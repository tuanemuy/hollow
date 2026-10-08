# P5c UI normal fixture — PUBLIC runtime closure step7

固定時刻: 2026-10-06T11:44:58+00:00
結論: 採用 A/B1/B2/C の 73 個の PUBLIC JS/JSON を単一 pass で安定全文読取した。全 73 個が canonical regular / self UID 501 / nlink 1 / actual mode 0644。実去重本文は 530,332 B。依存 closure 全体、loader 実到達、native ABI、runtime 資源成立は未確定。次 target の本文・metadata は未読取。実装・helper・製品・管理文書の変更、import/eval、runtime、DB、native、network、旧 private 操作は 0。本報告だけ新規排他 0600 作成し、固定後 ALL read/writer STOP。

入力正本:
- step6: .goal-implement/phases/P5c-ui-job-normal-fixture-runtime-closure-step6.md — 16,256 B / SHA256 b713c6fcf5f7e0a57630eaadc52ea353eea549896e5f2e75a2c194acb3931f2d。
- CSS node49 の既 formal reexport 集合: step4 — 24,953 B / SHA256 35ec190c8dc2abfec27a339b38e9fadc7fcc3bfc8213d5970eb4fa982c8092c7。
- 上記 PUBLIC 報告本文の有限読取 41,209 B は依存本文と別計数。A round に保守的に加算しても 101,350 B <= 2,097,152 B。

## 採用 scope と実読取

各依存は lstat/canonical、O_NOFOLLOW open、regular/selfUID/nlink、個別 cap、全文 hash、fstat/lstat の dev/ino/mode/uid/nlink/size/mtime/ctime 前後同値を確認し、元 FD を finally close。unknown target/walk/glob/fallback は使わない。actual mode を記録し、一律 0644 制約を追加していない。今回は結果として全ファイル 0644。依存本文の再読取は 0。B1/B2 は exact49 の lexical sort first32/rest17。

| Group | 個数 | 個別上限 | group cap B | 実本文 B | round 上限 B |
| --- | ---: | --- | ---: | ---: | ---: |
| A | 21 | JS20×65,536 + JSON1×32,768 | 1,343,488 | 60,141 | 2,097,152 |
| B1 | 32 | JS×65,536 | 2,097,152 | 48,796 | 2,097,152 |
| B2 | 17 | JS×65,536 | 1,114,112 | 21,296 | 2,097,152 |
| C | 3 | JSON3×524,288 | 1,572,864 | 400,099 | 2,097,152 |

group cap 合算の正確な算術は 1,343,488 + 2,097,152 + 1,114,112 + 1,572,864 = **6,127,616 B**。実本文合計 60,141 + 48,796 + 21,296 + 400,099 = **530,332 B**。73 path はすべて異なるため、本 step の去重値と round 実読取合計は同じ。過去 step を含む全 closure の去重合計には転用しない。旧 whole JS32 / whole2MiB は既に不足、runtime/material 予算改訂は別採用が必要。

## exact path 表記

以下の prefix と相対 path の単純連結が exact absolute path。prefix 自体から探索しない。

| Prefix | exact absolute prefix |
| --- | --- |
| H: | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/ |
| S: | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/ |
| B: | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/js-base64@3.7.8/node_modules/js-base64/ |
| W: | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+isomorphic-ws@0.1.5/node_modules/@libsql/isomorphic-ws/ |
| C: | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/ |
| M: | /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/mdn-data@2.27.1/node_modules/mdn-data/ |

## A — 実 metadata

| Exact path | bytes | actual mode | SHA256 |
| --- | ---: | --- | --- |
| H:lib-esm/encoding/index.js | 224 | 0644 | 92dcbe5bbc3f04d34e9cb70ff4a225ecb7ed4fbcf77187ff57c30daf0e70a8b8 |
| H:lib-esm/id_alloc.js | 1806 | 0644 | f0318575ce9c79d6504d3a4cba87bf3a147b8939fa759b1fa567413adfff9978 |
| H:lib-esm/result.js | 1889 | 0644 | a75679d9d79d7a59243e13ee199bb5364397611320c34000311ed52307358d5f |
| H:lib-esm/util.js | 130 | 0644 | 4b0676257700040bd968f1908e841083d0954aca4ca4fe2e69dd298a63fe1c1c |
| H:lib-esm/ws/json_encode.js | 2365 | 0644 | 215f2e9aef9770287f3dabb4bde7c392ec5b6185f4146d900e113eade655f857 |
| H:lib-esm/ws/protobuf_encode.js | 3057 | 0644 | 04204edfa085dea5696d9f2e09e76e6f2885a4afcaf6b833d7f2e527266bd6ed |
| H:lib-esm/ws/json_decode.js | 2558 | 0644 | de4cfca9a38639db24dd0104c73affaffaaca1b8a53c90274f02d055c5053c10 |
| H:lib-esm/ws/protobuf_decode.js | 2512 | 0644 | fbc580bfd2f310a47820688ee9ce6d2fc9e1525368676105438653021c5a0d54 |
| H:lib-esm/value.js | 2716 | 0644 | 14d3e142ef12eb73771a20ef8b6f66090718512f504aa7d649f76aa1d3aa5555 |
| H:lib-esm/describe.js | 232 | 0644 | 73377e6ea322fdf56cc77f9ed8a3a44148d6cf9071bff595fde32f7e755e9329 |
| H:lib-esm/queue.js | 687 | 0644 | 29f685c121decc85df128c8d9446a223f94049c7af543cbab630382c7d21aaa8 |
| H:lib-esm/queue_microtask.js | 364 | 0644 | 87880265e3e0c951720d24c062b3a7c72ec54cb92f131a55d1789f9381e85e7b |
| H:lib-esm/http/cursor.js | 5054 | 0644 | 8295e27760b7e55a11de458fd7ec33c5341777e7dfe0883e3860d5fbf08cdba9 |
| H:lib-esm/http/json_encode.js | 1558 | 0644 | 6494424661f08b3cf0dea61a8b11dc4b51108b6eff86c8355882c6cb4aa440c8 |
| H:lib-esm/http/protobuf_encode.js | 2050 | 0644 | 396f191d49815babb9effd2e506ee7a8b7d8dca567565c5a375a6b39d5f23eb9 |
| H:lib-esm/http/json_decode.js | 2092 | 0644 | 5f536d9baee5e8ce8e5d33c3af49502dd25d94454b7a84a5172e3df21db31727 |
| H:lib-esm/http/protobuf_decode.js | 1872 | 0644 | 5a32ef2105f2ae1e3215f6b730388001f64ce1234b9a1f8c8ca1614bc7b020ba |
| H:lib-esm/ws/cursor.js | 2491 | 0644 | 619c89a56dd07e36dff3890ce569d3044333f835fe9e5d19526f019222ae83c5 |
| S:lib/source-map-generator.js | 14933 | 0644 | 645482e8d23fd49cd025a0ad07c2e2beb173995138370d6a73e596e18e889bd8 |
| B:base64.mjs | 10472 | 0644 | d5159202389f3fca95d3f5f6a5c3066a9ba282f2127765d2bfcde5dbbfac5cd9 |
| W:package.json | 1079 | 0644 | 0fcfe73e854a10d24c665450986ec04edbc2b496271871eba07464528e7386d0 |

## B1 — 実 metadata

| Exact path | bytes | actual mode | SHA256 |
| --- | ---: | --- | --- |
| C:lib/syntax/node/AnPlusB.js | 7840 | 0644 | 174df1187617e79ef0186dbd009e76f6c7e5206f0ff2c242b44800fe4167b869 |
| C:lib/syntax/node/Atrule.js | 2400 | 0644 | 09dfb8efc2b6cc26a221b3157d251be4c6ef11aa00f799a7cd095c132ccab339 |
| C:lib/syntax/node/AtrulePrelude.js | 1037 | 0644 | b4506828af3a5a4d98e3495d49e1ed2f3263a3a46f378d7596d3702d841bd2d4 |
| C:lib/syntax/node/AttributeSelector.js | 3566 | 0644 | 233e66919c3507150e603a0d56d3098d5682717afe392feb6f4487bb434c4119 |
| C:lib/syntax/node/Block.js | 2246 | 0644 | 81923650a615fcd8cc3086b853f536e6a325489f4bc0c6bd369a66d6c1e0c734 |
| C:lib/syntax/node/Brackets.js | 685 | 0644 | d1a39842542877540e6dfe6bca99b50490e8a2bbc79ffbf67fe29eb76f51d7fe |
| C:lib/syntax/node/CDC.js | 352 | 0644 | 4c24e5a51a454fcdf4be577c57bac647fae9fc292c73fd5757735b740650094e |
| C:lib/syntax/node/CDO.js | 354 | 0644 | e2f5820901326cec91a473bc1ae002d49e07048a356d187d0f29ad1585a9e1e3 |
| C:lib/syntax/node/ClassSelector.js | 514 | 0644 | a06bc9dd02ea4812cfd4471ff25a057767616fa28a71408c8aabe1fddb4c2f4c |
| C:lib/syntax/node/Combinator.js | 1336 | 0644 | eb4b00e70635c7383c035d6d5992f75ac9f39152d509222b7f312ef4d4d6b5ec |
| C:lib/syntax/node/Comment.js | 750 | 0644 | c0ef6a16f29de78890b47857c93a31a25e21a46d5b675243ab4726d764e0f38b |
| C:lib/syntax/node/Condition.js | 2933 | 0644 | c87b0e76b8f72bb43bba26b827522654a22ac720ddaacc7f1b1a111ba768bcca |
| C:lib/syntax/node/Declaration.js | 4396 | 0644 | e374b4da8b379775addbbb94d84267b099b3dd174ad27e6ae045c1a5c569db69 |
| C:lib/syntax/node/DeclarationList.js | 1413 | 0644 | 07bfa453f9e72e605b000f94c6477dd4ce3e0621a2649f74aa2b6f8599bfa932 |
| C:lib/syntax/node/Dimension.js | 540 | 0644 | 74762aaefbed62f292d1750e441694c7c6d85d576fdb746b7882adb705f4d26c |
| C:lib/syntax/node/Feature.js | 2312 | 0644 | 2962fc95aa8b884ed5638b761865a318dc4eace4bb210665bbe9b6c87ebd6e51 |
| C:lib/syntax/node/FeatureFunction.js | 1514 | 0644 | 668cc9678dcb8a684efea81a029f359b0eeadac3ad959d347b209f3593550a15 |
| C:lib/syntax/node/FeatureRange.js | 3305 | 0644 | 948cdbcd4d42bc94acb526a2c991a219a4778d6abd66a198a0099dab2635860e |
| C:lib/syntax/node/Function.js | 974 | 0644 | 83b4204cff6071c9788ac04b5c5e6b8a911f57b83e756d5972a12055ae263d29 |
| C:lib/syntax/node/GeneralEnclosed.js | 1496 | 0644 | 4486d2374636933a911593afb034888fbe3539644cd198cf6e39f714ffbca4a8 |
| C:lib/syntax/node/Hash.js | 469 | 0644 | 056aa0c9b6c65c09284f036b78e5134294f4055679c56b3f98402657d23d7cf2 |
| C:lib/syntax/node/IdSelector.js | 747 | 0644 | 86d4d75c9ed074da8060b1e31a5e5118fca068c25828cd69e9a6f4dab1bb9ab8 |
| C:lib/syntax/node/Identifier.js | 376 | 0644 | d14b969e25957bfc72fb02cff0f643e290eed04f658a54f7f64cbbdd261a58f2 |
| C:lib/syntax/node/Layer.js | 582 | 0644 | 125a2511cde6ccec92cac679b280cb198e9848671e9a7a5d2bfd0b3d8252a1fa |
| C:lib/syntax/node/LayerList.js | 663 | 0644 | 15bffd602747af6ee56a92ecedb8e6677615212a2f798941b26c89c81708953a |
| C:lib/syntax/node/MediaQuery.js | 2483 | 0644 | c6784fe7c64e7cbb5d21ff74a9d8904d5c849cddf134a6c67cd78205597e1165 |
| C:lib/syntax/node/MediaQueryList.js | 628 | 0644 | 2bcb4702cafa34221a1b03d3fddb9376ca9f79a68d508b0ce1be0feabbe125e7 |
| C:lib/syntax/node/NestingSelector.js | 440 | 0644 | 2d7576f97341fc196fcc7c7950f10f8d812ce542725eb65fdc8d20c6307d39d2 |
| C:lib/syntax/node/Nth.js | 943 | 0644 | a4b0a04f8f6de7349fc4e393f667c62b1cf55a5c27c9df2a3c44d83993631a74 |
| C:lib/syntax/node/Number.js | 399 | 0644 | 182dd5f9e3db12f5ca71c30def5f788e23751d20787a1c74ec36e0096689227b |
| C:lib/syntax/node/Operator.js | 410 | 0644 | 20ede258409eaef827a6d9accd769a1fbfe3a1e2391d09e9ea57243e015d56b6 |
| C:lib/syntax/node/Parentheses.js | 693 | 0644 | 4a1a93aa8f161d62cf6f287714ab7a7c0be9c7db0da058f4352ba21e50099af7 |

## B2 — 実 metadata

| Exact path | bytes | actual mode | SHA256 |
| --- | ---: | --- | --- |
| C:lib/syntax/node/Percentage.js | 406 | 0644 | f286f1708b7cf35ca02de184b0ebd96508ac1a4dcdffeb3b472e11183eb7f7d4 |
| C:lib/syntax/node/PseudoClassSelector.js | 1564 | 0644 | 6c10d2b009dd8b97bcd52631682b3baedf212a54f23e487a0946b28b8c7aebe0 |
| C:lib/syntax/node/PseudoElementSelector.js | 1617 | 0644 | cebd838d4e6f0d516382fed5d0b4c6e4e55490a465e293002e5d471ca4c781f3 |
| C:lib/syntax/node/Ratio.js | 1994 | 0644 | b6af081d1a0c6ac1775cf21825d998dfd8b59867ceca57dff338774fb299e81b |
| C:lib/syntax/node/Raw.js | 1048 | 0644 | 8ae4e8cb9dd860d8684899f34f923d2ca309de2cf75d4d4f62a4bb45e2d99346 |
| C:lib/syntax/node/Rule.js | 1112 | 0644 | 32072072fd78b3016e0a54f242feb350125366ae5f9f2d2a2640d5c4ae1c8cd8 |
| C:lib/syntax/node/Scope.js | 1504 | 0644 | 060220580f8c52e3cd9d397d24ca1d7aba72d7a9ea986072a12975bc5783913f |
| C:lib/syntax/node/Selector.js | 667 | 0644 | 8e648d3363b3137f7f27e92b9fccc753729ce0a8bad7c3b7417f6f5fce247fc1 |
| C:lib/syntax/node/SelectorList.js | 676 | 0644 | 674f3f2bfda443a44a673d4092cc83fe6b4cde36f4351f2b7c76cd2bd64c526e |
| C:lib/syntax/node/String.js | 471 | 0644 | d9505e97bee2866f96fef0af2ad2aa6bbf1c8b72c03f5f2e52a881a6e533055f |
| C:lib/syntax/node/StyleSheet.js | 1926 | 0644 | 086ee5ab40beaed694c257b18f951a08478865060a08d67e93f607662456f71f |
| C:lib/syntax/node/SupportsDeclaration.js | 694 | 0644 | 55abee1f999074c97da8fceb4146d16677005e8de4cd5f3947858b4d792eb49b |
| C:lib/syntax/node/TypeSelector.js | 1090 | 0644 | ff416f7a83c6dd06e4d6c4436475075a0d903be049a9e9c6c096614bab7ef5ed |
| C:lib/syntax/node/UnicodeRange.js | 4359 | 0644 | 5082f5ef86771478388ed14d2e187e2bf1d3e277876b10199e34c3249bb6bffd |
| C:lib/syntax/node/Url.js | 1248 | 0644 | b3e6edc61f39556bbfc9576a8368f42f6c88baa0b79cc1b0e8d2c3a67d820113 |
| C:lib/syntax/node/Value.js | 377 | 0644 | bb1d1a21555903d949fabeaebdbc76e822dce3b1cdf7251a2c5c9977ba21b644 |
| C:lib/syntax/node/WhiteSpace.js | 543 | 0644 | b1648391876a49698683a96141c1b3c6f37cf175fee7b7315cf64a7958d8b16c |

## C — 実 metadata

| Exact path | bytes | actual mode | SHA256 |
| --- | ---: | --- | --- |
| M:css/at-rules.json | 19141 | 0644 | 6bb3e2c49df8ea151d3b13ba4c6250fb7e526ca4503200513901f7e448629dfa |
| M:css/properties.json | 340615 | 0644 | effd504133401cd99f3721d7bf14fe58af55ad6924748459bab7de483cf30274 |
| M:css/syntaxes.json | 40343 | 0644 | e6e4fd4bba906f29923549b00a78522736c50e12742ab5c6ffe7347700f698e0 |

## formal edges / data / branch 分類

- H:lib-esm/encoding/index.js:1–4 の static reexports が JSON/protobuf encode/decode 4 target を要求する。ws/http encoder/decoder の static imports が shared encode/decode 4 target、http/cursor.js:1–2 と ws/cursor.js:2 が byte_queue.js / cursor.js を要求する。相対 JS target は lexical normalization のみで列挙。read/current metadata、actual resolve は未実施。
- H:lib-esm/describe.js は追加 module edge を抽出しない。queue_microtask.js は global queueMicrotask と Promise ponyfill の SOURCE 分岐。追加 module/child/network edge は抽出しないが実 import 成功ではない。
- S:lib/source-map-generator.js:8–11 は require('./base64-vlq'), require('./util'), require('./array-set'), require('./mapping-list')。既採用 CJS .js 分岐の exact候補4を提案し、実 CJS resolve/存在確認とは区別する。extensionless/JSON/native fallback を一般許可しない。
- B:base64.mjs は builtin Buffer / TextEncoder / TextDecoder を選ぶ SOURCE 分岐。追加 static module edge はない。builtin availability/初期化は未実行。
- W:package.json の name/version は @libsql/isomorphic-ws / 0.1.5。exports['.'].import.node='./node.mjs'、require.node='./node.cjs'、import の bun/deno/workerd/default は './web.mjs'。今回の Node ESM 正式候補は node.mjs のみ。main='node.cjs' を fallback として読まない。ws/@types/ws 宣言だけから新 alias target を探索しない。
- CSS node49 は今回全て全文読取した。formal imports は tokenizer/index.js、Declaration.js:1→utils/names.js、String.js:2/Url.js:2→utils/string.js、Url.js:1→utils/url.js。selector/node source 自体に新 bare dependency / native loader edge は抽出しない。tokenizer は既 step4 選択辺へ戻る。utils3 は本 round 未読取であり、過去 accepted manifest の去重状態を本 step で再確認していない。重複 read を必須にせず Manager の既正本で照合してから次 scope を決める。
- M:css/at-rules.json / properties.json / syntaxes.json は JSON object（top-level key 数 19 / 651 / 378）。JSON parse だけで module execution しない。JSON 内容を新 import/target/実 business result として解釈しない。
- 今回採用 SOURCE 内の正式 static import/export/require strings は下表に固定。native dirname/index.node/detect-libc OS-report/exec は既未実行枝のまま。native addon/read/load/ABI、DNS/HTTP/WebSocket、child、runtime/default/test/build/DB/rootprobe/create は 0。

## 次の bounded exact target 提案（未読取・採用待ち）

必須候補15 JS: H10 + S CJS .js4 + W Node ESM1。各65,536 B、unique cap 983,040 B、round本文2MiB。現候補の存在/canonical/metadata/hashは未確認。S4 は字句 .js 候補であり branch 成立後のみ読取。CSS utils3 は prior accepted metadata 去重が必要な条件付き集合で、新規必要なら別3×65,536=196,608 B。両集合を読む場合でも18×65,536=1,179,648 B、round2MiB。新辺 target は今回先読みしない。各辺の親は既読で、存在しない target を推測 replacement しない。

| exact absolute target | SOURCE 根拠 | 個別 cap |
| --- | --- | ---: |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/byte_queue.js | H:lib-esm/http/cursor.js:1 → ../byte_queue.js | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/cursor.js | H:lib-esm/http/cursor.js:2 → ../cursor.js; H:lib-esm/ws/cursor.js:2 → ../cursor.js | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/encoding/json/decode.js | H:lib-esm/encoding/index.js:1 → ./json/decode.js; H:lib-esm/ws/json_decode.js:2 → ../encoding/json/decode.js; H:lib-esm/http/cursor.js:3 → ../encoding/json/decode.js; H:lib-esm/http/json_decode.js:2 → ../encoding/json/decode.js | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/encoding/json/encode.js | H:lib-esm/encoding/index.js:2 → ./json/encode.js | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/decode.js | H:lib-esm/encoding/index.js:3 → ./protobuf/decode.js; H:lib-esm/http/cursor.js:4 → ../encoding/protobuf/decode.js | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/encode.js | H:lib-esm/encoding/index.js:4 → ./protobuf/encode.js | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/shared/json_decode.js | H:lib-esm/ws/json_decode.js:3 → ../shared/json_decode.js; H:lib-esm/http/cursor.js:9 → ../shared/json_decode.js; H:lib-esm/http/json_decode.js:3 → ../shared/json_decode.js | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/shared/json_encode.js | H:lib-esm/ws/json_encode.js:1 → ../shared/json_encode.js; H:lib-esm/http/json_encode.js:1 → ../shared/json_encode.js | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_decode.js | H:lib-esm/ws/protobuf_decode.js:1 → ../shared/protobuf_decode.js; H:lib-esm/http/cursor.js:10 → ../shared/protobuf_decode.js; H:lib-esm/http/protobuf_decode.js:1 → ../shared/protobuf_decode.js | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+hrana-client@0.10.0/node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_encode.js | H:lib-esm/ws/protobuf_encode.js:1 → ../shared/protobuf_encode.js; H:lib-esm/http/protobuf_encode.js:1 → ../shared/protobuf_encode.js | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/base64-vlq.js | S:lib/source-map-generator.js:8; require .js 候補 | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/util.js | S:lib/source-map-generator.js:9; require .js 候補 | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/array-set.js | S:lib/source-map-generator.js:10; require .js 候補 | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js/lib/mapping-list.js | S:lib/source-map-generator.js:11; require .js 候補 | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+isomorphic-ws@0.1.5/node_modules/@libsql/isomorphic-ws/node.mjs | W:package.json exports['.'].import.node | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/lib/utils/names.js | CSS node の明示 relative import; prior 去重要確認 | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/lib/utils/string.js | CSS node の明示 relative import; prior 去重要確認 | 65,536 |
| /Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree/lib/utils/url.js | CSS node の明示 relative import; prior 去重要確認 | 65,536 |

## 今回抽出した exact formal edge 表

| source | line | literal specifier |
| --- | ---: | --- |
| H:lib-esm/encoding/index.js | 1 | ./json/decode.js |
| H:lib-esm/encoding/index.js | 2 | ./json/encode.js |
| H:lib-esm/encoding/index.js | 3 | ./protobuf/decode.js |
| H:lib-esm/encoding/index.js | 4 | ./protobuf/encode.js |
| H:lib-esm/id_alloc.js | 1 | ./errors.js |
| H:lib-esm/result.js | 1 | ./errors.js |
| H:lib-esm/result.js | 2 | ./value.js |
| H:lib-esm/util.js | 1 | ./errors.js |
| H:lib-esm/ws/json_encode.js | 1 | ../shared/json_encode.js |
| H:lib-esm/ws/json_encode.js | 2 | ../util.js |
| H:lib-esm/ws/protobuf_encode.js | 1 | ../shared/protobuf_encode.js |
| H:lib-esm/ws/protobuf_encode.js | 2 | ../util.js |
| H:lib-esm/ws/json_decode.js | 1 | ../errors.js |
| H:lib-esm/ws/json_decode.js | 2 | ../encoding/json/decode.js |
| H:lib-esm/ws/json_decode.js | 3 | ../shared/json_decode.js |
| H:lib-esm/ws/protobuf_decode.js | 1 | ../shared/protobuf_decode.js |
| H:lib-esm/value.js | 1 | ./errors.js |
| H:lib-esm/value.js | 2 | ./util.js |
| H:lib-esm/http/cursor.js | 1 | ../byte_queue.js |
| H:lib-esm/http/cursor.js | 2 | ../cursor.js |
| H:lib-esm/http/cursor.js | 3 | ../encoding/json/decode.js |
| H:lib-esm/http/cursor.js | 4 | ../encoding/protobuf/decode.js |
| H:lib-esm/http/cursor.js | 5 | ../errors.js |
| H:lib-esm/http/cursor.js | 6 | ../util.js |
| H:lib-esm/http/cursor.js | 7 | ./json_decode.js |
| H:lib-esm/http/cursor.js | 8 | ./protobuf_decode.js |
| H:lib-esm/http/cursor.js | 9 | ../shared/json_decode.js |
| H:lib-esm/http/cursor.js | 10 | ../shared/protobuf_decode.js |
| H:lib-esm/http/json_encode.js | 1 | ../shared/json_encode.js |
| H:lib-esm/http/json_encode.js | 2 | ../util.js |
| H:lib-esm/http/protobuf_encode.js | 1 | ../shared/protobuf_encode.js |
| H:lib-esm/http/protobuf_encode.js | 2 | ../util.js |
| H:lib-esm/http/json_decode.js | 1 | ../errors.js |
| H:lib-esm/http/json_decode.js | 2 | ../encoding/json/decode.js |
| H:lib-esm/http/json_decode.js | 3 | ../shared/json_decode.js |
| H:lib-esm/http/protobuf_decode.js | 1 | ../shared/protobuf_decode.js |
| H:lib-esm/ws/cursor.js | 1 | ../errors.js |
| H:lib-esm/ws/cursor.js | 2 | ../cursor.js |
| H:lib-esm/ws/cursor.js | 3 | ../queue.js |
| S:lib/source-map-generator.js | 8 | ./base64-vlq |
| S:lib/source-map-generator.js | 9 | ./util |
| S:lib/source-map-generator.js | 10 | ./array-set |
| S:lib/source-map-generator.js | 11 | ./mapping-list |
| C:lib/syntax/node/AnPlusB.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Atrule.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/AtrulePrelude.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/AttributeSelector.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Block.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Brackets.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/CDC.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/CDO.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/ClassSelector.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Combinator.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Comment.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Condition.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Declaration.js | 1 | ../../utils/names.js |
| C:lib/syntax/node/Declaration.js | 2 | ../../tokenizer/index.js |
| C:lib/syntax/node/DeclarationList.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Dimension.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Feature.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/FeatureFunction.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/FeatureRange.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Function.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/GeneralEnclosed.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Hash.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/IdSelector.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Identifier.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Layer.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/LayerList.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/MediaQuery.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/MediaQueryList.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/NestingSelector.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Nth.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Number.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Parentheses.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Percentage.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/PseudoClassSelector.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/PseudoElementSelector.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Ratio.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Raw.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Rule.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Scope.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/SelectorList.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/String.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/String.js | 2 | ../../utils/string.js |
| C:lib/syntax/node/StyleSheet.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/SupportsDeclaration.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/TypeSelector.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/UnicodeRange.js | 1 | ../../tokenizer/index.js |
| C:lib/syntax/node/Url.js | 1 | ../../utils/url.js |
| C:lib/syntax/node/Url.js | 2 | ../../utils/string.js |
| C:lib/syntax/node/Url.js | 3 | ../../tokenizer/index.js |
| C:lib/syntax/node/WhiteSpace.js | 1 | ../../tokenizer/index.js |

## 停止 / 未検証

報告の新規排他 0600 作成・自身全文 hash 固定以外 writer 0。採用 PUBLIC 73 path と入力報告だけを有限 read、unknown walk/glob/read0。次 targets は body/metadata0。current C0/S5/P5d SOURCE/helpers、全旧生成 SOURCE/build/TMP/results/cache/DB/key/proof、成功/failed private roots は全非操作。fixture helper3 作成0、runtime資材生成0。依存閉包の完了・正常fixture/normalproof/closure・外部通信や native ABI 成立は未検証。固定後 ALL dependency/source/helper/report read/writer STOP。Root の next exactscope 採用まで継続読取しない。
