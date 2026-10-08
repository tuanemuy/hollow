# P5c-2 browse SSR stream 修正方針の独立レビュー

## 判定

2026-10-01。`@tanstack/router-core@1.169.2` に限定した pnpm patch を第一候補として条件付き推奨する。per-fragment streaming を維持し、未注入の serializer queue を受け取る前に正常 close/cleanup しない修正である。まだ patch の実装・採用完了・製品原因解消を判定していない。

fast path の単純削除、または `setRenderFinished()` の同期 flush だけでは不十分。既完了時にも注入を受け取る consumer と、閉じタグより前の排出順序を併せて成立させる必要がある。任意の待機時間追加や guard 緩和は解決案に含めない。

独立作業は公開 source/current dist/仕様/正式報告の静的読解だけ。製品・test・依存・lock・dist の変更、import・純対・runtime・DB・HTTP・browser・install・build、旧 private/material/result の読取は0。本書だけを編集した。

## 固定対象と根拠の区分

- 候補は `574ef4704de74e39392e1d273e2f7e2169d2d88c`。主の純再現報告 `.goal-implement/phases/P5c-2-browse-stream-repro.md` を全文確認した。68行/7,388B、SHA256 `01b1e7bad8215b1ac5d6c14fb00d29b5c3a1d586c238c501670cde1fe42f455a`。主は固定・全操作停止を返却済み。
- 主が実行した A 同期成功/B 完了先行で欠落/C transform 先行で成功の3対は借用根拠。実 `attachRouterServerSsrUtils` と `transformStreamWithRouter` の反例であり、ScriptBuffer の mock ではない。独立再実行はしていない。
- 独立静的根拠は installed router-core 1.169.2 の `src/ssr/ssr-server.ts`、`src/ssr/transformStreamWithRouter.ts`、公開 ESM/CJS と package exports、および react-router 1.169.2 の `src/Scripts.tsx`。下記の分岐と producer/consumer 関係を確認した。
- active entry `apps/web/dist/server/server.node.js:90795` の import 先は `assets/server-BXBOVfWy.js`。同 chunk の `9199–9202` と `9380` 付近にも fast path と既完了時の購読省略がある。類似する別 asset の存在だけを active 経路の根拠にしていない。
- 同 entry の公開指紋は3,723,330B/`8d82b08d97810002ce52a8cc9fd01e63bdd1ccb33a5cc8e50208e117b9a812d4`、active chunk は526,663B/`1663ad18a2dfe6047ddef3ddac04c23add67a7d7828ac13ddf1477077027c65d`（正式報告の借用）。本段で製品集合の再 hash は実施していない。
- UI6 の HTTP 文書終了、`$_TSR` の残存と `streamEnded` 欠落、route-suspense 継続は B と整合する。しかし実 React SSR が B の順序を通ったことは未証明。純対の確定不具合と、実 UI の原因仮説を分離する。

## 終了順序の欠落

`ssr-server.ts` の ScriptBuffer は enqueue と HTML 注入を分離している。barrier 未開放では `flush()` が何もせず、`liftBarrier()` は残 queue の注入を microtask に予約する。`cleanup()` は queue と router 参照を破棄する。したがって serializationFinished は「全 script が consumer へ渡された」の同義ではない。

`Scripts.tsx:87` の `takeBufferedScripts()` は、その時点までの bootstrap を初回 script として取得する。後から Promise が解決すると、`ssr-server.ts:451–475` の onSerialize/onDone が後続解決 script と `$_TSR.e()` を queue に残せる。nonce と初回 bootstrap の既存経路を維持したまま、この後続分を届ける必要がある。

`transformStreamWithRouter.ts:112–120` は serializationAlreadyFinished と initialBufferedHtml だけで fast path を選ぶ。後者は「既に HTML 化されたもの」であり、未注入 queue の陰性証明にならない。fast path の EOF は `setRenderFinished()` → close → cleanup を同期実行し、barrier が予約した microtask より cleanup が先行する（同 `191–193`、producer `488–497`）。

general 経路でも onInjectedHtml の購読は `if (!serializationAlreadyFinished)` 内である。fast path を除くだけでは、transform 開始前に完了した queue の受け手がない。initialBufferedHtml が存在して general に入った場合も、別の残 queue がないとは保証されない。

逆に producer の `setRenderFinished()` に flush だけを追加しても fast path は通知を消費せず、元 HTML の閉じタグを既に転送済みである。EOF 後に script を付け足す方法は、注入を HTML 内の正しい順序へ戻す修正にならない。

## 最小 patch が満たす条件

正常系の責務は「初回 bootstrap → 後続 settlement script → e → HTML 閉じタグ → stream close → cleanup」である。初回取得時に既に含まれた部分は再送しない。serialization の完了だけで残 queue を捨てない。

具体的に検討可能な小さい構成は次の3点を同時に行うもの。

1. 未注入 queue を否定できない passthrough fast path を general へ統合する。fast path を残すなら producer 側の実際の排出済み条件が必要で、現2条件だけを維持しない。
2. onInjectedHtml は transform 開始時の serialization 完了状態にかかわらず購読する。onSerializationFinished の待機が不要な場合と、注入の受取りが不要な場合を混同しない。
3. app の render 完了時に barrier を開き、残 queue を同期的・明示的に drain してから consumer の最終 flush/close を判定する。例えば producer の setRenderFinished に liftBarrier 後の flush を置く場合、consumer が先に購読済みで、閉じタグをまだ保持していることが必要。

この2機能ファイル内の案は実装可能性のある候補であり、具体 diff の無条件承認ではない。event callback の再入、既予約 microtask、onDone 側 flush と重なっても takeAll/cleanup が二重注入・二重 close を起こさないことを確認する。新しい任意 sleep や poll は正しさの条件にしない。

nonce の生成・escape・`injectScript()`・初回 Scripts の tag 生成は既存経路を使う。barrier を無条件に早く開けて初回 bootstrap より解決 script を先行させたり、nonce なし script/eval へ迂回したりしない。e は既存の正常 onDone の責務のままとし、serialization error を成功へ変えるために捏造しない。

app read error、serializer error、consumer cancel、lifetime/serialization timeout は正常 close と区別する。cleanedUp 後の microtask/late settle は追加出力しない。既存 listener/timer の解除と source reader lock の終端を保ち、今回変更で cleanup を遅延無期限化しない。上流の既存 cancel 実装全体を本件と無関係に再設計することは求めない。

## 適用範囲と代案

依存 patch は notes 専用ではなく、この router-core SSR transform を利用する全経路へ届く。同期経路の fast path 統合には処理量・buffering の差もあり、notes だけの変更と報告しない。一方、ドメイン・Drive・DB・認可・URL query/state・Board guard・layout/ARIA を変える必要はない。

pnpm workspace は現時点で patchedDependencies 未設定。採用するなら exact 1.169.2 の patch artifact と pnpm の正式設定/lock へ固定する。公開 exports は ESM と CJS の両方を持つため、TS src だけの編集で実行物を直したとしない。少なくとも実際に bundle が取り込む ESM を対象とし、CJS との同値維持または未適用範囲を明示する。手作業で生成 dist を直したり、再現できない node_modules 変更だけを残したりしない。依存の一括更新は本案に含めない。

代案の notes-only typed loader bridge は、既存 `routes/trash.tsx` の typed DTO → client seed と同系統にできる。しかし notes の Promise を await して Board へ直接 seed するなら、CLAUDE の URL に結び付く per-fragment streaming 規約から route-level pending への明示例外となる。Skeleton の責務や navigation の待機感が変わり、単なる内部実装の置換ではない。

この代案でも現在 actor/scope の認可、strict browse 入力、prepare、cursor、zone/layout/sort、selection の維持/解除条件を保つ必要がある。notes の経路回避であり、依存の実反例や他の deferred 経路は直らない。限定 patch を安全に適用できない場合、または Manager が UX 例外を選ぶ場合の第二候補とする。

## 元条件と必要な比例検証

本件は R05 に対応する一覧到達、OR-01 の初期一覧/読込 skeleton/エラーと再試行、OR-02 の layout/URL 復元、OR-09 の現在 scope 下の選択入口、OR-10 の sort/URL 即時反映へ影響する。stream producer の欠落を修正しても、これらの UI 条件や未実施 G/H が自動で合格になるわけではない。完成条件を増やすのではなく、既存 UI の入口と streaming 規約を回復する。

採用後に必要な最小検証群を次に示す。今回は実施していない。具体的な install/build/runtime/DB/boot 資源は別途 Manager の採用対象とする。

- 実 installed API の A/B/C を同じ順序で比較し、B の旧反例保持と修正後の解決値/e の一度だけの出力、正常 close/cleanup を示す。主の既成功対照を mock へ置き換えない。
- general の「開始時既完了＋初期 injected HTML あり＋残 queue あり」を含める。barrier/閉じタグ/UTF-8 の chunk 分割と複数 settlement は小さな対で、順序・欠落・重複を確認する。barrier が見つからない/空 app でも有限に終わり、初期 bootstrap がない異常入力を成功と捏造しない。
- nonce 維持、通常の Promise rejection と serializer 自体の error、app read error、cancel/late settle の代表対を区別する。raw HTML/秘密を出さず、marker/order/count/bool と reader/listener/timer/cleanup の有限終端を測る。全組合せの新総当たりは要求しない。
- exact patch 適用先・設定/lock・新 bundle への到達を照合し、通常の type/lint/format/build を行う。依存共有範囲の同期1経路と deferred1経路を比例確認し、無変更の製品203対や Drive 全系列の機械的再演は必須にしない。
- 同候補 bundle の正式認証/本人 scope で raw `/notes`、必要時の既 canonical 診断を区別し、skeleton→board が client 受渡し後も安定することを確認する。文書 HTTP 完了や e の観測だけを React promise/画面成功にしない。既 UI5/6 不達を消さず、成立時だけ既残 A/G/H の操作表へ進む。

## 引継ぎ

Root へは「exact-version patch 方針を条件付き推奨」「fast path 削除単独/同期 flush 単独は受入不可」「UI6 の同一順序は未証明」を返す。追加の製品 probe、URL 正規化変更、認可/Board guard 緩和は必要案に含めない。本書の EOF 確認後、全 read/write/run を停止して返却する。

## exact 修正計画の最終静的照合

2026-10-01。主の `.goal-implement/phases/P5c-2-browse-stream-fix-plan.md` を全文確認した。固定版93行/14,587B、SHA256 `51af821456e528c84fb8918c41c16b5e6c2760c9c2d84eff1762bac2cadc8b84`。主停止中の文書と installed 公開実装だけを照合し、新実行・import・製品変更は0。

追加の採用阻害事項なし。UTF-8 分割を既 tag/chunk 対へ含める予定補正を条件として、この計画の実装着手を受入可とする。具体 patch の正しさ、23対成功、新 bundle/実 UI 成功の受入ではない。

- 常時 onInjectedHtml 購読と setRenderFinished の barrier→sync flush は、前レビューの producer/consumer 両側の条件を満たす構成。
- EOF の `isAppRendering=false` を setRenderFinished 帰還後へ移す計画は、renderFinished listener 内の onDone/event による早すぎる tryFinish を防ぐ。異常枝は成功 finish へ再入させず safeError/cleanup とする旨も明記されている。実装時は正常枝だけを直して旧 catch の再入可能性を残していないか確認する。
- 最初の完全な body 終了 tag、なければ html 終了 tag から tail を保持する変更は、別 chunk の閉じタグより後ろへ settlement/e を流さないための同一責務内の修正。一般 HTML parser や新 URL/状態処理への拡張ではない。分割 UTF-8 も通常本文 bytes 維持の既条件として同じ3対のいずれかへ含め、対数増加を必須にしない。
- 5 repo path、src2＋ESM/CJS/map の patch10 file は配布の再現性と両公開 exports への適用を含む明示範囲。生成器の import/export 同値、CJS bootstrap default interop、map の修正済 source 対応が成立しない場合は停止する計画であり、任意の別生成方式へ拡張しない。
- offline/ignore-scripts の正式 pnpm 接続、当該 patch 参照だけの lock 波及、version/integrity/依存追加変更0、予想外の再解決や store 不足で停止する境界は適切。今回の静的受入を network 取得や別 version 導入の許可に読み替えない。
- ESM20＋CJS3の23対は正常・残 queue・順序・nonce・再入・error・cancel/deadline を比例的に覆う。source cancel の元からある限界、UI6 の正確な順序未証明、純成功と一覧/G/H 成功の分離を保持している。新 scope を要する追加修正はこの受入に含めない。

この追補の EOF 確認後、全 read/write/run を停止して Root へ返却する。
