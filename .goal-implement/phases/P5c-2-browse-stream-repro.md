# P5c-2 SSR stream 純再現

## 結果

2026-10-01 07:32 JST。固定候補 `574ef4704de74e39392e1d273e2f7e2169d2d88c` の製品変更0。installed TanStack実関数の純3対を初回実行し、serializer完了後の未注入scriptがstream fast pathのcleanupで失われる順序を直接再現した。通常対照A/Cは解決値と終了標識を出力し、競合順序Bだけ両方を欠落させた。3対の実行/観測は成功であり、Bのライブラリ挙動は不具合の反例である。

UI6は同症状と整合するが、実React SSRの当該要求が順序Bを通ったことは未証明。アプリの原因修正・一覧/G/H受入成功ではない。製品/依存/lock/ビルドへの適用は未実施。

## 実順序と根拠

参照packageは `@tanstack/router-core@1.169.2` と `@tanstack/react-router@1.169.2`。以下は各packageの公開src相対path。

1. `ssr/ssr-server.ts:451–475` はdehydrated loaderDataをcrossSerializeStreamへ渡し、後続Promise解決scriptと`$_TSR.e()`をScriptBufferへenqueueする。
2. `Scripts`相当の公開`takeBufferedScripts()`で初回bootstrapを取り出した後にPromiseがresolveすると、barrier未開放では`ScriptBuffer.flush`（同:120–122）が注入しない。serializer finishedでも未注入queueは残る。
3. `ssr/transformStreamWithRouter.ts:112–120` はserializationAlreadyFinishedとinjected HTMLが空であることだけでfast pathへ入る。未注入queueは検査しない。
4. 同:191–193はappStream終端で`setRenderFinished()`→close→cleanupを同期実行する。`ssr-server.ts:488–497,101–109`のbarrier開放はmicrotask注入を予約するが、同:529およびScriptBuffer:154–158のcleanupが先にqueueを破棄する。
5. active bundle `apps/web/dist/server/assets/server-BXBOVfWy.js:9199–9202,9257–9259` も同じfast path/終了順序。`server.node.js:90795` から同chunkを参照する。

同期DTOのノート詳細loader（`apps/web/app/routes/notes.$noteId.index.tsx:34`）には未解決RSC notesがなく、UI6の通常note対照と整合する。一覧はSSRでpredecoded RSCを描画できても、browser側へ解決scriptが届いたことを意味しない。

## 純3対

実`createRouter/createRootRoute/createMemoryHistory`、実`attachRouterServerSsrUtils`、実`transformStreamWithRouter`を使用。manifestなし、root loaderの合成値/Promiseのみ。ScriptBufferやserializerの模倣0。React SSRそのものを起動せず、公開takeBufferedScriptsを呼ぶ時点と合成HTMLのappStreamを制御した。

| 対 | 順序 | transform前serialization finished | 初回の値/e | 最終の値/e | 注入event | 経過 |
| --- | --- | --- | --- | --- | --- | --- |
| A | 同期DTO→dehydrate完了→初回Scripts→transform | true | true/true | true/true | 0 | 18ms |
| B | 未解決Promise→初回Scripts→resolve/onDone→transform | true | false/false | false/false | 0 | 1ms |
| C | 未解決Promise→初回Scripts→transform開始→resolve/onDone | false | false/false | true/true | 1 | 2ms |

Bでもserialization完了event1・出力reader closed・source close・source reader lock解放・SSR cleanupが成立した。エラー/timeout/異常切断による欠落ではない。B出力627Bは入力627Bのまま、C出力766Bは入力627Bへ後続scriptが加わる。全対でdeadline発動0、case timer clear、全console分類count0。HTML/生成script/値はmemory内の有無判定だけで保存出力0。

## 終了・資源

新root `/Users/hikaru/.local/share/hollow/verification/p5c2-browse-stream-repro-20261001-T9qS4f` は排他directory0700/non-symlink。最終15,457B、helper計9,786B、NodeTMP0。合成文字列の計測は初回/入力/出力を含め5,323B、各stream64KiB・合算256KiB以内。root16MiB/helper256KiB/log64KiB/TMP2MiB以内。

Node子1、3対逐次。子自然exit0、signalなし、stdout1,372B/stderr0B、両pipe end、既知子PIDのsignal0照会はESRCH。wrapperもexit0。全3対のreader.closed/lock解放/SSR cleanup/case timer clearは別々に取得。参照timerが残る60秒待ちやforce終了なし。DB/鍵/原本/appboot/HTTP/Chrome/外部/install/build0。失敗/再実行0。旧proof/private/helper/DB/key/results/cacheの参照0。

## 固定指紋

before/afterの公開配列集約とentry/import行はすべて同一。canonicalはpath昇順`{path,bytes,sha256}`配列のJSON SHA256。

- source＋lock: apps/packagesのtracked sourceにpnpm-lockを加え1282file/17,391,127B、SHA256 `2eb7d969ade594dfb7823e2b8c754fff594c1a3bf85f88124014d57178a47266`。前probeのsourceだけ1281件とは集合が異なる。
- dist: 8659file/216,010,119B、`17cfdb397c539566470e4d4416a79ff153ae25b1a0eed4d0b20652e53bafdde8`。
- `apps/web/dist/server/server.node.js`: 3,723,330B、`8d82b08d97810002ce52a8cc9fd01e63bdd1ccb33a5cc8e50208e117b9a812d4`。
- `apps/web/dist/server/assets/server-BXBOVfWy.js`: 526,663B、`1663ad18a2dfe6047ddef3ddac04c23add67a7d7828ac13ddf1477077027c65d`。

正確import先はrepoをprefixとした次の2つ。両package版は1.169.2。

- `node_modules/.pnpm/@tanstack+react-router@1.169.2_react-dom@19.2.6_react@19.2.6__react@19.2.6/node_modules/@tanstack/react-router/dist/esm/index.js`: 4006B、`76b230357482d6b1b8217162ba477de030716bceb6d3105fa84256704b90a07e`。
- `node_modules/.pnpm/@tanstack+router-core@1.169.2/node_modules/@tanstack/router-core/dist/esm/ssr/server.js`: 575B、`86593dab1b1090324d26df6dfd867a52c964c2cf2ac1cafa115b74b9fd77ae2b`。
- 後者と同directoryの`ssr-server.js`: 13,237B、`92baab948a1724c16650d2f5ebec63683aa484cd89824b5842d072fc59b47e79`。
- 同`transformStreamWithRouter.js`: 10,261B、`9717b8cb396bb295acf2058a3d0744c11b515092c5662efe05fd4b813cee2b42`。

## 修正比較・引継ぎ

第一候補はper-fragment streamingを維持する限定依存patch。未送信queueを空と保証する前にfast pathへ入らず、後続scriptをdrainしてからclose/cleanupする責務はframeworkのSSR stream adapterにある。単にfast pathを消すだけでは、general側のserializationAlreadyFinished時の購読省略も考慮が必要。同期/late/error/abort/nonce/order/closeを比例確認し、全framework更新へ広げない。具体diff/patch接続はRoot採用前に実装しない。

代案は一覧だけ既`browseNotesFn`をawaitしたtyped loader→直接Board seedへ変更すること。既trash/WSsettingsと同系統だが、fragment streamingからroute-level pendingへの例外採用が必要で、依存の根本欠陥は残る。今回の実反例でproducer側に具体原因が得られたため、notes promise observerだけの追加buildは優先しない。

新公開helper allowlist（上記root内、実秘密/資格埋込なし）:

| basename | bytes | SHA256 |
| --- | --- | --- |
| run.cjs | 4971 | `1cc8c7e17a3dcefe9b7e3635780fe05e7b582e3ccb9b838222e985094dd9aa28` |
| repro.mjs | 4815 | `59426e729384985736c3aba4cd2ba1d434e05745a3705a48669d891b81dd3717` |

外側wrapperはraw stdout/stderr非表示、子JSONの許可key/型/有限enum/count/boolだけを保存出力する。cache無効・新TMP。公開seal/finite結果だけを新rootへ保存、元成果物上書き0。候補製品は無変更でgit statusは.goal-implement未追跡のみ。報告EOF確認後、全read/write/run停止・Rootへ所有返却。
