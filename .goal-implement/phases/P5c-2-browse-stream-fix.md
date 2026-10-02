# P5c-2 Browse SSR stream 修正候補

## 結果と未検証

2026-10-01 08:06 JST。候補commit `8cb478b8639816751f40ab62ac2ea255e2057ad0`。基点 `574ef4704de74e39392e1d273e2f7e2169d2d88c` からexact 5path。実installed Routerの23対、配布整合22項目、規定type/lint/format、通常build2回とpostbuild typeが成功した。最終patchは同 `@tanstack/router-core@1.169.2` に限定し、per-fragment streamingを維持する。

R05/OR01/02/09/10・CLAUDE fragment streamingのproducer欠落に対する局所修正候補。UI6の実際の順序Bは未証明のまま、新候補の実browser/一覧入口/A/G/Hは未検証。修正前の症状やS3未完を消さず、旧候補のB/C/D/F・203対/DB根拠は変更のない業務範囲として借用する。アプリ起動、DB、鍵、原本、HTTP、Chrome、Google/mail/OpenRouter/SDK、課金は0。独立Verifierへの引継ぎ待ちで、phase/UIの受入済みとは報告しない。

## 実装

- `patches/@tanstack__router-core@1.169.2.patch`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `scripts/build-router-core-patch.mjs`
- `apps/web/app/presentation/routerSsrStream.test.ts`

patch内の変更は `src/ssr/ssr-server.ts` / `src/ssr/transformStreamWithRouter.ts`、対応するdist/esmの2 JS・2map、dist/cjsの2 CJS・2map、計10file。公開signature/型/entry exports/package versionは不変。domain/application/route/認可/query/Board guard/DDL/nonce生成/serializer正常・異常分類の変更0。

独立passthrough fastpathをgeneralへ統合し、serializationが開始時点で完了済みでもonInjectedHtmlを購読する。render EOFでbarrierを開き同期flushし、帰還後にisAppRendering=falseとして最終closeを判定する。render listener内の完了イベントによる再入closeを防ぐ。最初の完全なbody閉じtag（なければhtml閉じtag）以後をtailとして保持し、settlement/eをその前へ送る。microtaskがcleanup後に届いても追加注入しない。error/cancel/deadlineを正常成功へ変えない。

生成器は既esbuild0.27.7、magic-string0.30.21、@jridgewell/remapping2.3.5を使い、再生成4file/mapが同一になることを実確認。relative importsとCJS bootstrapの既default参照を保持し、元配布が公開していないdehydrateMatchは生成時だけexport集合から除外する。TSの既宣言は変更しない。mapのsourcesContentは修正TSと同一、相対source/file参照、旧map残置0。CJSの生成形式はesbuild標準wrapperへ変わるが、元のnamed export集合/依存import先/実SSR bootstrapを比較している。

pnpm11.1.2のoffline・ignore-scripts・no-frozen-lockfileで正式導入後、frozen/offline整合を確認した。version/integrity/新依存の変更0、lock37行差はexact patch hashと同依存参照の伝播だけ。patch-commitの暗黙installは使用せず、新rootの公開original/editから限定diffを生成した。元node_modulesの手編集0、network fallback0。

## 直接検証

23論理対＝ESM20＋CJS A/B/C3。S09/S10内のno-barrier/空入力を含め合成streamは25。未初期化の空入力は有限終端だけを確かめ、正常hydrationとはしない。ScriptBufferやserializerの模倣ではなく実attachRouterServerSsrUtils/transformStreamWithRouterを使う。

| 対 | 根拠 |
| --- | --- |
| S01–03、S21–23 | 同期、initial Scripts後にsettleしてからtransform、transform後settle。bootstrap/値/e各一回と順序、ESM/CJS同値 |
| S04–05 | initial injected HTMLと残queueの共存、開始時完了/未完了の両方で欠落・重複0 |
| S06–10 | body/html別chunk、body tag分割＋UTF-8分割、html-only、barrier分割/直後、no-barrier、空入力 |
| S11 | 実takeBufferedScripts返値のnonce属性と全出力script属性の一致 |
| S12–14 | render listenerによるPromise resolve、EOF後resolve、複数Promise。eは最後のsettlement後、閉じtag前 |
| S15–17 | app reader error、通常Promise rejectionのserialize、serializer自体のerrorを区別。後者にeを捏造しない |
| S18–20 | consumer cancel、serialization deadline、lifetime deadline。late settle注入0、失敗を正常closeと区別 |

全対で出力reader終端、source close/errorの発行とsource reader lock解放、SSR cleanup一回、SSR timer clear、cleanup後追加注入0を直接確認。S12のPromise.resolveはnative microtaskであり「serializer onDoneがlistener内で同期再入した実再現」とは主張しない。その防止はisAppRenderingを帰還まで維持するコードの静的根拠と区分する。consumer cancel時のsource自動cancelはupstreamの既契約に追加せず、自己合成sourceの明示closeとlock解放を別観測した。

23対を4labelで実施したが、一意成功は23、加算92とはしない。初回23成功→終端assert補強23→export補正23→初回nonce直接assert/worker観測23。最終tests-04はpassed23/failed0/skipped0/unhandled0、1module、stdout51B/stderr0。各対2秒、総driver約0.55秒、各stream64KiB・合算2MiBのassert内。意図的30ms deadline2対は期待異常として成功し、通常対のtimeout成功化0。

配布整合integrity-06の22項目は検証器具の根拠で、機能の対数へ加算しない。ESM/CJSそれぞれ元配布のnamed export集合とimport先集合、4map内容/相対path、stageとinstalledの8runtime/map＋2TS一致を確認した。旧反例A/B/Cは前報告の借用で、旧private/helper実行0。

## Checks・失敗履歴

- type-01/02は新testのoptional bootstrapとoverloaded getReader型の4診断で失敗。型を明示しtype-03以降成功。type-02は最初の有限projectionがfile位置を失っていたため位置特定用に再実行した。同じ失敗を成功へ加算しない。
- lint-01/02/03/04はexit0。既存warning分類useTemplate/noNonNullAssertionを有限取得し、無関係な修正は混入していない。format全label成功。
- patch-01はgit no-indexの絶対prefix正規化不整合で書込前拒否、修正後patch-02成功。元failed label保持。
- build-01/posttype-01は成功したが、生成物の元export比較でdehydrateMatchの余分な内部exportを検出。Root採用後、生成器を補正しpatch/lock再適用した。初回buildを最終候補へ流用していない。旧patch内容を新root内へ保全。
- integrity-01/02は上記export差。integrity-03/04は器具のstage変数shadowによる例外がmap段階に見えたもの。integrity-05はside-effect importを拾わない比較式の不足。公開コードで特定し器具だけ修正、integrity-06成功。map/製品不具合として扱わず、失敗記録は保持。raw error/stack出力0。
- 最終製品系列はtype-05→lint-03→format-03→tests-03（23成功）→build-02→posttype-02成功。追加buildはRoot承認済み、今回2回/S3系列計5、dist256MiB内。
- build後の変更はtestのnonce一行assertだけ。type-06→lint-04→format-04→tests-04（23成功）を再確認した。patch/製品/生成器/lockはbuild-02時と同一で追加build不要。diff-check成功、候補commit後は製品差0。

## 固定指紋

canonicalはpath昇順 `{path,bytes,sha256}` 配列をJSON化してSHA256。source集合はapps/packages＋lock/workspace/package.json＋新scripts/patchesで、前報告のapps/packages限定集合とは異なる。

| 集合/対象 | 件数/bytes | SHA256 |
| --- | --- | --- |
| 基点source | 1284file | `c43b5b8b7231aea6e55fe3353d90afc4e558276d3e9a66879ea918bdd65cdd6b` |
| 候補source | 1287file / 17,706,102B | `54ea42479a90c5c6d720c9ebb39f1ab23eaeed95b1e0301049937c3844935a67` |
| 候補apps/packages | 1282file / 17,077,461B | `a376cd17c41f2b99ffaed200c7439d30d78c5945d93c0447edaeab7c1afdbd8d` |
| migration/schema（前後同一） | 87file / 6,916,648B | `3a6871ca621ec9e3f3c9e6ece7cef02e12222fb9fe660297ec82509e45e42e2a` |
| 基点dist | 8659file / 216,010,119B | `17cfdb397c539566470e4d4416a79ff153ae25b1a0eed4d0b20652e53bafdde8` |
| 候補dist | 9029file / 221,712,575B | `45b2e02ac950379a3971b1a59922cce27b780618185940e35f99aaeb005fb0d7` |
| server.node.js | 3,723,330B | `bf9534f2f3c2264a1ae18306c079945899e7bfabbfbce26c5514ccd1e3b2c7b4` |
| active assets/server-BOS-T4HE.js | 524,252B | `83e752cd75acf8a05dd6c9e2372ddfac24c04ae3dd1a6c2c08de56807d162398` |
| patch | 289,715B | `90b4b574aa10230b303f645cc7bcac0926cbddabe4a916e1b2197bb89a16f360` |
| pnpm-lock.yaml | 328,991B | `037740a80c95f580b0287c63a072862a0ba646a79133a0d30f048dc1b2bc5131` |
| pnpm-workspace.yaml | 566B | `3b2ba0b764b94e2a7bd1a049194eea153407ac079ff27fc567395c61e1968d92` |

before/finalで変更集合は上記exact5のみ、既存削除0。build-one（追加build前）とfinalのsource差はnonce testだけ。DDLの保全根拠はattestationの87file集合であり、初期sealの簡略ddlフィルタ（drizzle/＋lock）を全migration証明には使わない。distには既buildの未参照assetも残るため、全量指紋と実entryのactive importを別管理し、勝手な清掃はしていない。active chunkの9087/9280/9343付近へsync flush/常時購読/render EOFの修正が到達することを静的確認。

installed package exact rootはrepo配下 `node_modules/.pnpm/@tanstack+router-core@1.169.2_patch_hash=90b4b574aa10230b303f645cc7bcac0926cbddabe4a916e1b2197bb89a16f360/node_modules/@tanstack/router-core`。

| 同root内path | bytes | SHA256 |
| --- | --- | --- |
| dist/esm/ssr/ssr-server.js | 14179 | `ecd202451dc0300b5636a49f889943585d53e7b1c0570352ee1808806a2a48f7` |
| dist/esm/ssr/ssr-server.js.map | 28089 | `5dc18067746cd99755a814476ed994c981a1798c4a8d5cd4f954472c252c3cbd` |
| dist/cjs/ssr/ssr-server.cjs | 16108 | `82f61e368a964332e34cfb15f6911c18f94dac4828c5ac819fde1de318c1ed42` |
| dist/cjs/ssr/ssr-server.cjs.map | 28094 | `8ea61d82bc97c5d287507642750402b1278131610a81c625fafc1b3298a71e6c` |
| dist/esm/ssr/transformStreamWithRouter.js | 8765 | `95607bd2a44cfab93d31146e2d0bbc2522ecf088f1e5867e18a95c65757d073a` |
| dist/esm/ssr/transformStreamWithRouter.js.map | 17227 | `725667ed263b174fc809c0f9de5052f0df51cf74cc77a33f3dfb23cbefe83aa3` |
| dist/cjs/ssr/transformStreamWithRouter.cjs | 9879 | `ba4b5a47f6e84b6a4dfdba3aa7e0644b0589a6819f33b4016df03a04e04fe2b7` |
| dist/cjs/ssr/transformStreamWithRouter.cjs.map | 17268 | `1e8245d04894d884562bd48f6d6f30e8a0edbc58a618d9f632a54570f13c2c09` |

## 資源・終端・再利用

新root `/Users/hikaru/.local/share/hollow/verification/p5c2-browse-stream-fix-20261001-djGzp1` はmktemp排他0700/nonsymlink。commit直後11,066,819B、public original/edit4,982,380B、TMP0、他約5.81MiBでroot32/package8/helper8/TMP4MiB以内。既純root T9qS4fは公開repro.mjs（4815B/既SHA一致）のmetadata→全文EOFだけ参照し、旧実行/私的結果/鍵/DB/cache参照0。

全wrapper childは自然exit、stdout/stderrの両endと既知PID消滅を各labelで記録。最終Vitest内部fork1はctx.close標準停止でsignal終了（exit数値nullを-1へ有限化、signal=true）し、自然終了とは扱わない。実close・stdout/stderr end・PID消滅はそれぞれtrue。テストはその前に23完了、worker終端とdriver自然exit0は区別する。手動kill/未知PID照会/広域scan0、通常アプリ/HTTP/server/socket/DB writerは起動していない。esbuild生成器はstop、Vitestはctx.close/工具stopで終了。生の例外・script・本文・秘密の保存出力0。

新rootの公開helper allowlist。いずれも実資格埋込なし。Verifierが再利用する場合もRoot許可、metadata/fullhash→全文EOF→別root適応、元場所実行0。reporterの結果先・runnerのroot/cwd/固定対象は新隔離rootへ明示適応する。private結果の追跡許可ではない。

| basename | bytes | SHA256 |
| --- | --- | --- |
| run.cjs | 5412 | `17291937141028927d23ab334de89cc88d843ac03ebf5e9ed81d238b96bb4976` |
| tests.mjs | 2114 | `a98d3ec7a6518c75d477d0b245b9f3cab7443813caa3c02b9ebd21647c176d60` |
| reporter.mjs | 1195 | `7ffc276a7ede0fa6396072834c0703930dbf288741ee8176282338af56eef1ce` |
| integrity.cjs | 3229 | `f6056d6f41e123bc280015a9b7815b12cd5a0a3a7464fb473591bfd50fcc4e57` |
| patch.cjs | 1550 | `175baaff6a030d6d48d45bdb3cd451696bc908d10c5da93342b063a7fc878a0d` |
| attest.cjs | 3768 | `e1f5124d9ea0af3f986773d3454ccef9c099158fa99e9dad477db671660851a2` |

候補commit後のgit statusは `.goal-implement/` 未追跡だけ。報告EOF確認後、製品/dist/依存/proof/文書を含む全read/write/runを停止してRootへ所有返却する。新UIは未採用・未実行、独立レビューの指示まで変更しない。
