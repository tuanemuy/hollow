# P5c-2 Browse SSR stream 修正案

## 採用待ちの範囲

基点は `574ef4704de74e39392e1d273e2f7e2169d2d88c`。本書は公開製品・installed package・pnpm CLI の静的読解による提案で、製品/依存/lock編集、install、純実行、build、DB/HTTP/browser は0。管理正本は変更しない。spec/spec-implement は使用しない。

目的は R05/OR01/02/09 と P5c-2 G/H の一覧入口を阻害し得る SSR producer の欠落を修正すること。`P5c-2-browse-stream-repro.md` の実関数 B は反例、A/C は対照。UI6 と同じ順序だったとは未証明で、patch の純成功を一覧・bulk の実UI成功へ読み替えない。per-fragment streaming、未awaitのnotes loader、Deferred、認可/現在性guard、URL/defaults、診断stageを維持する。

## 1. 最小修正の責務と順序

対象は `@tanstack/router-core@1.169.2` の2 source。以下の行は現在のinstalled src相対参照。

1. `src/ssr/transformStreamWithRouter.ts:118–216` の独立passthrough fastpathを削除し、同期完了・初期HTMLなしも既general scannerへ統合する。serializationAlreadyFinishedはgeneralの初期状態として残す。キューが空かどうかを公開APIへ追加してfastpathを延命しない。
2. 同:358以降の `onInjectedHtml` はserializationAlreadyFinishedにかかわらず必ず購読する。`onSerializationFinished` の購読は未完了の場合だけでよい。初期takeBufferedHtmlと購読の間にawaitを追加しない。同期完了は既初期boolで、後続完了は既eventで扱う。
3. `src/ssr/ssr-server.ts:488–497` の `setRenderFinished` で、既renderFinishedListenersの通知・clear後に `scriptBuffer.liftBarrier(); scriptBuffer.flush();` を順番に実行する。barrierを無条件に早期開放しない。通常途中のmicrotask batching、onDoneの既sync flush、nonce/serializer/pluginは変更しない。既予約microtaskは後に空queueを見て何も送らず、cleanup後は既guardで拒否される。
4. generalの正常EOFで `isAppRendering=false` を `setRenderFinished()` の帰還後へ移す。renderFinishedListener内でonDone/eventが同期発火してもtryFinishはまだapp renderingとして待つ。その間の注入はpendingRouterHtmlへ蓄積し、帰還後に一度だけtryFinishする。例外経路はsuccess finishを呼ばずsafeError/cleanupへ収束させ、同じ再入closeを許さない。
5. 同:416以降は最初の完全な `</body>` からtailを保持する。bodyがなければ最初の完全な `</html>` を境界とする。両方が同chunkにあることを要求しない。既leftoverで分割tagを結合し、tail開始後は追記のみとする。これで別chunkの `</body>` / `</html>` の間や後ろへ解決scriptを出さない。一般HTML parser化、HTML書換え、大小文字仕様拡張は行わない。

正常完了の不変順序は「app内の初回bootstrap script → 後続settlement script → e() → 保持した閉じtag → 出力close → cleanup一回」。settlement/eが初回scriptに既に含まれる同期ケースは同じ順序の短縮形。同期drainはrender完了境界だけで、barrier検出時に未出力のapp bootstrapを追い越すflushは追加しない。

fastpath削除だけでは既完了時の購読欠落とEOF前の非同期flushが残る。sync flushだけではpassthroughに注入口がなく、閉じtag前の順序も守れない。上記はこの2つと同じ終了境界の再入・tag分割を一体として閉じる最小案。公開関数signature、Router/ServerSsrの型、exports、default timeout、serialization errorの分類は変更しない。

upstreamのconsumer cancelは現状SSR cleanupを呼ぶが、pendingなapp readerを必ずcancelする契約ではない。このpatchで未知producerを強制終了する機構は足さない。純cancel対は所有する合成producerを明示終了し、出力cancel/SSR cleanupとsource実終了を別観測する。通常実アプリの停止は従来のrenderer/HTTP終了観測を維持する。

## 2. 配布形式・パッチ管理

現在 `pnpm-workspace.yaml` / `package.json` / `pnpm-lock.yaml` にpatchedDependenciesなし。packageManagerはpnpm11.1.2。router-core exportsのimportはdist/esm、requireはdist/cjsへ向くため、srcだけの修正は不可。

リポジトリ変更予定のexact pathは次の5つ。route/application/domain/DDL変更0。

- `patches/@tanstack__router-core@1.169.2.patch`
- `pnpm-workspace.yaml`：version exactのpatchedDependencies一件。
- `pnpm-lock.yaml`：patch hashと当該依存参照の正規更新だけ。
- `apps/web/app/presentation/routerSsrStream.test.ts`：実installed公開SSR関数の回帰suite。
- `scripts/build-router-core-patch.mjs`：2 TS sourceから配布4file/mapを再生成し整合確認する公開・非秘密の有限生成器。通常app起動からは呼ばない。

patch内部は次の10fileだけ。

- `src/ssr/ssr-server.ts`, `src/ssr/transformStreamWithRouter.ts`
- `dist/esm/ssr/ssr-server.js`, `dist/esm/ssr/transformStreamWithRouter.js` と各 `.map`
- `dist/cjs/ssr/ssr-server.cjs`, `dist/cjs/ssr/transformStreamWithRouter.cjs` と各 `.map`

既.d.ts/.d.cts/package exports/tsrScript生成物は不変。現在packageは約3,448KiB。全framework更新や別versionへ解決するoverrideは導入しない。

生成は既installed esbuild0.27.7のtransform（bundle:false）を使用し、2 TSをESM/CJSへ変換する。出力のrelative specifierだけを各 `.js` / `.cjs` と既 `tsrScript` 配布moduleへ正規化し、元公開import一覧とのexact一致を検査する。CJSの既tsrScriptは `exports.default` で `__esModule` がないため、一般的なdefault-import interopを無検査で再生成しない。当該bootstrap参照を既挙動の `require('./tsrScript.cjs').default` に一致させる限定正規化と、実CJS bootstrap/script成立対を必須とする。exportsの集合/型は既配布と同じ。

specifier正規化のmapは既公開magic-string0.30.21で生成し、既公開@jridgewell/remapping2.3.5でesbuild mapへ合成する。sourcesContentは修正済TSと一致、source pathはpackage相対、生成器のprivate絶対pathなし。4runtime fileのsourceMappingURLと4mapのfile/sources/mapping範囲を検査し、削除したfastpathを指す旧mapを残さない。これら既工具の使用は生成器内だけ、製品依存追加0。配布file全体のformat差は予想されるため、semantic変更が上記5点だけである比較と生成の再現性を提出する。生成方式が既export/interopを保持できなければ別方式へ無断移行せず返す。

pnpm接続は `patchedDependencies: { '@tanstack/router-core@1.169.2': 'patches/@tanstack__router-core@1.169.2.patch' }`。現在CLI公開実装 `.../pnpm-11.1.2/libexec/pnpm/dist/pnpm.mjs:215170–215255,215390–215440` はpatch-commit内でinstallを呼び、store一時領域も使う。そのためpatch-commitを単なるdiff生成として無言実行しない。新rootへ公開original packageを専用copyし、apply_patch編集・限定生成後に公開git no-index diffから10file patchを作る案を優先する。

採用後の導入は明示された別工程：既公開pnpm storeのpackageだけを対象に、offline・ignore-scripts・no-frozen-lockfileでpatch/lockを解決し、続いて同lockのfrozen/offline整合を確認する。package version/integrity/依存追加変更0、当該patch参照に由来するlock波及だけを許す。公開store不足ならnetwork fallbackせず停止する。node_modulesのunpatched既cacheを私的proofと混同しないが、公開package store読取/通常package install自体の許可は本案採用時に必要。既node_modulesを手編集して根拠にしない。

## 3. 追加局所根拠

実installed public attachRouterServerSsrUtils / transformStreamWithRouterを使う。模倣ScriptBufferのみの対にはしない。ESMの20論理対＋CJSのA/B/C3対＝23対を予定し、実装時の登録一覧を固定する。元反例を消さず、patched Bが修正結果であることを明示する。

| 群 | 対数 | 観測 |
| --- | --- | --- |
| A/B/C | 3 | 同期 / barrier前settle / transform後settle。値とeが各一回、bootstrap先行、正常closed/cleanup |
| initial HTML | 2 | B＋事前injectHtmlあり、C＋あり。take済みHTMLと後続scriptを欠落/二重化しない |
| tag/chunk | 3 | body/htmlが別chunk、body tag自体を分割、html-only tail。settlement/eがtailより前、通常本文bytes維持 |
| barrier/chunk | 2 | barrier識別子を分割、barrier直後を分割。初回bootstrapより先に後続scriptを注入しない |
| nonce | 1 | 合成nonceで初回/注入全scriptが既nonceと一致、raw値を記録しない |
| reentrant/late | 3 | renderFinished listener内settle、EOF後settle、複数Promise逐次settle。最後のsettlement→e→close、cleanup後遅着注入0 |
| error | 3 | app reader error、Promise rejectionの既serializer経路、unsupported valueのonError。成功値を捏造せず既分類を維持、後者e()を新規捏造0、cleanup一回 |
| cancel/deadline | 3 | 消費者cancel＋所有source終了、未settle serialization deadline、render未完了 lifetime deadline。正常成功と異常終了を区別しtimer/subscription/reader終端を観測 |
| CJS exports | 3 | require版A/B/Cの同値、bootstrap default interop/終了順序 |

各64KiB stream・合算2MiB、case2s/全60s。console/raw script/body/error/stackは捕捉してfinite code/count/boolだけ。source reader lock解放、出力reader close/cancel/error、SSR cleanup、タイマ解放、child exitと両pipeは別項目。意図的error/deadlineは期待分類を合格とし、通常対のtimeoutを成功にしない。タグsplitの既挙動が不足した場合もassertionを緩めない。

型/Lint/formatは規定順 `pnpm typecheck → pnpm lint:fix → pnpm format → 23対 → pnpm build → postbuild typecheck`。新patchがtest runner/実buildの双方へ適用済みであるexact import指紋を比較する。全S3 203対や既DB移行の不変更範囲は借用し全再演しない。既BrowseSkeleton/requestState等のroute純対はガード不変の静的照合で不足する変更がない限り再実行不要。

## 4. 影響と実UIの判定

共通SSR transformに届くため、一覧だけでなくtags/todoのRSC loaderと全SSRの同期DTO routeが影響範囲。`routes/-hollow.tsx`, `-tags.tsx`, `todo/-action.tsx` の未await Promiseは維持する。純A/B/Cが共通データ順序の比例根拠、同bundle browserはnotes入口と正常DTO note詳細・別RSC tagsを最小代表とする。todo fixture追加や全アプリ巡回を要求しない。

次のbrowserは独立担当へ新候補を渡した後に別採用する。今回提案では新root・通常signup/mail確認・note2（新自己1KiB原本1＋plain1）をsetupし、実外部0。Drive資格/Picker/OAuth/backup開始をsetupへ混ぜない。原本なし除外を含む小bulkの実送信などS3残受入はこの回帰に追加しない。

1. 正常note詳細のSSR/hydration表示、既seed以外mutation0を対照にする。
2. raw `/notes` とcanonical `/notes` 各1 documentを正式goto。doctype HTTP完了、self JS完了、route-suspense/location-mismatch/board/selection/usage count、現在本人sameScope、$_TSR streamEnded/initialized/hydrated/globalgoneをbool時系列として区分。mutationとread-renderはendpoint別、HTTP200をReact完了にしない。
3. 両notesでboard/selection入口がhydration後も維持され、正式current receipt後も消えないことを確認。有限15s、stable同document2観測。最大15sの待機をstreaming廃止で達成しない。SSR初期board後の遷移中locator消失は単独失敗にせず有限再観測する。
4. `/tags` の別RSC fragment1回、notesへclient navigation1回を確認。notesのwindow error/CSP violationは既有限分類、rawconsole/本文/URLquery値保存0。CSPを緩和しない。
5. 欠落再発はstage/stream完了/自己module終端を同時に保存して停止。boot追加/無根拠reload/新instrumentを自動追加しない。UI6の具体順序が未証明だった限界は維持し、修正後正常は新候補の根拠とする。

## 5. 資源・保全・見積り

実装/純検証は新0700 root32MiB：public package original+edit各4MiB予約（合計8）、helper/生成patch/map/log8MiB、NodeTMP4MiB、残12MiB。純worker1、DB/key/original/HTTP/Chrome0、既公開工具のみ・外部network0。通常checks/buildは順次実行、Node subprocess/pipeの既知所有を記録。通常dist別256MiB、build追加1（S3系列計4）。pnpmの通常node_modules/store差は当該公開patch適用の別領域として前後metadataと差分を記録し、私的検証root容量に隠さない。package導入の予期しない広域再解決/不足取得は停止して返す。

独立UI案は別0700 root256MiB：logicalDB3/32MiB（active16、opaque8、audit8、正式0040新空初期化1）、ChromeTMP128、NodeTMP8、helper/log8、original1MiB、material256KiB、新invitation/share/AES計128B。boot/Chrome/context/page各1、account1/WS1/note2/original1、Drive/provider0、LLM0、実mail0（新自己mailbox memoryだけ）。Hollow1000要求/48MiB、背景deny150/1MiB、自己originのみproxy forward。read/write serverFn分類とdocument navigation最大8を起動前表で固定。1navigation約47JSとsetupを含む見積りであり再試行枠にはしない。

自然Chrome終了→app drain/DBclose→既知自己PID/pipe/socket終端→active logical snapshotを排他opaque→更にaudit。active/opaque再open0、auditだけquery_onlyでschema/ledger/FK/account/note/original/owner有限値、close。失敗root/失敗結果保持、秘密hash0、旧proof/private/DB/keys/results/cache非操作。標準fallbackが動いた場合は自然終了に加算しない。現候補574ef47のsource/dist/entry/DDLlock、installed originalと新patched import、patch/map/lockの前後指紋を保存する。

見込みは実装・配布整合・23対・checks/buildで2–4時間、独立UI準備/1boot/保全で1–2時間。限定依存patchとpnpm適用の採用後に開始する。未採用なら現製品は凍結を維持する。案のEOF確認後、全read/write/runを停止してRootへ返却する。
