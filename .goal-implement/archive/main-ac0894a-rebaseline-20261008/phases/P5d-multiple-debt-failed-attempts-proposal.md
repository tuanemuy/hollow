# EF01 failed-attempts 保存分類の最小修正提案

## 提案

現候補 C20b61af2014a50838d7127895c30a04efd85545a の EF01 は、callerへ返る交換不明エラーと、保存されたattemptのprovider拒否分類を別々に検証する。修正候補は既test1pathのfailed-attempts群だけである。製品・fixture・SQL・ports・診断frame・原error同一rethrow・元releasefinally・loader・正常/audit guards・case/caps/timersは変更しない。今回は提案固定だけで、source/helper修正・実行・新root probeは0。

対象: `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebt.integration.test.ts` の checkpoint = "failed-attempts" 直後、`for (const value of [a, b])` の単一expectation式。

```ts
for (const value of [a, b])
  expect(await attempt(value.id)).toMatchObject({
    state: "failed",
    failure: "OPENROUTER_PROVIDER_REJECTED",
  });
```

現在の `failure: "OPENROUTER_EXCHANGE_UNKNOWN"` literal一箇所だけを変更する。式は一箇所、正常実行時の評価はA/Bの2件。state failedの期待・find読取・ループ順序・元same attempt IDは同じ。caller A/BとCの `.rejects.toMatchObject({code:"OPENROUTER_EXCHANGE_UNKNOWN"})` は正規application契約どおりのため全3箇所を維持する。これらはsource上の固定コードであり、私有row/code値を取得して期待へ転写する案ではない。

## PUBLIC根拠

1. 同testの `complete(value)` は正規 `completeOpenRouter(f.container, actor.request, correlation(...), "")` を呼ぶ。空codeは内部resources0 countercaseの明示入力であり、HTTP transportの通常missing-code callback受入を意味しない。
2. `packages/core/src/adapters/node/openrouter/provider.ts` の `NodeOpenRouterProvider.exchange` は `!input.code` で `rejected()` を投げる。`rejected()` は `new OpenRouterProviderError("OPENROUTER_PROVIDER_REJECTED")`。HTTP read前の条件である。
3. 同providerの `operation` はsignalが未abortでprovider errorなら `new OpenRouterProviderError(error.code)` として同codeを保持する。timer・abortの他枝は存在し、その実測状態を今回推測しない。現fixtureはこのnative factoryのservicesを使い、provider exchangeをfakeへ差し替えない。
4. `packages/core/src/application/integration/openRouter/connection.ts` の `exchange` catchは `isOpenRouterProviderError(error) && error.code === "OPENROUTER_PROVIDER_REJECTED"` を判定し、成立時は `failExchange(...,"OPENROUTER_PROVIDER_REJECTED")`、他枝ではEXCHANGE_UNKNOWNを保存する。その後callerへは一律 `ConflictError("OPENROUTER_EXCHANGE_UNKNOWN", ...)` を投げる。caller codeとdurable attempt failureの一致は契約ではない。
5. 同applicationの `failExchange` は元same ID、state exchanging、captured version一致のときだけ正規replaceでstate failed・指定failure・version+1を保存する。
6. `packages/core/src/adapters/libsql/repositories/openRouterRepository.ts` の encodeはfailed value.failureを保存し、mapperのfailed枝はrow.failureを変更せず返す。failureNULLはinvalidとして拒否する。`packages/core/src/domain/integration/openRouter.ts` のOpenRouterFailureは両分類を別の合法literalとして定義する。
7. `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebtFixtures.ts` のfacadeは元 `openRouterAttempts.replace.call(...)` がtrueかつstate failedのsame sourceを記録し、元original.runがresolveした後に対応gate.waitをawaitする。ready()はそのwait到達を知らせる。したがってready待機後のattempt assertionは、元Txのresponse前を覗く案ではない。gateはfailure分類を書き換えない。
8. fixtureのclockは2026-10-06固定、attempt期間はdomainの10分、論理clock2001進行は後段retry専用。今回の保存分類期待をfakeclock変更・期限延長で解決する案は不要。正常5秒gate/10秒native/40秒case/body180/outer240は保持する。

PUBLIC再読では、この明示空codeの正常provider拒否をdurable EXCHANGE_UNKNOWNとして期待する点に契約不一致がある。最小修正はtestの分類literalのみで、製品の保存/例外ロジックを同じ分類へ均す案ではない。

## 実観測と未知

直前のONE EF01-DIAG1は checkpoint failed-attempts entered、AssertionError/nativeCode none/index nullを受領した。checkpointはA/B二回評価の前であり、AとBのどちらのassert、state・membership・failureのどの値、根本原因は未観測。今回のPUBLIC推論をactual cause確定として扱わない。保存failureの実値・私有row・raw exception・proof/keys/resultsは読んでいない。

元診断phase `.goal-implement/phases/P5d-multiple-debt-diagnostic-proposal.md` は40157B／SHA256 ce941f72df88cef0936f10c8afdbee7652f26a15b36639612567de8f3b58927bのまま変更0。d84be0c1を含む全success/failed private root/TMPは永久非操作。正常fixture close receipt・native closed/ACK/第三row進行/最終cursor/DB auditは未成立のまま。

この契約不一致は一箇所の静的fixを提案できるため、現時点で24 checkpoint増加・群内predicate/raw row投影・公式case mapperの拡張は提案しない。次のRoot別採用があればtest1pathのみ修正し、whole own typecheck/lint:fix/format、other91同値、commit/source92manifest、従属helper source binding・freshmemory literalだけを固定し、独立レビューへ渡す。追加actualは別採用まで0。

## 範囲と資源

既fixture入力account1/browser1/attempt3/use3、元same callbacks2のgateとthird caller、no adopted origin、resources0、HTTP/DNS/Worker/businesschild0を保持。新account・attempt・use・DB・key・listener・network・proofを追加しない。tool fork1、DB1各32MiB/sum64MiB/root192MiB、TMP8MiB/output2MiB/material256KiB、64 wakes・clock2001、200ms guard、body180/outer240 shared tail30は同じ。Durable use obligations2とliteral debts2を同一と数えず、resources0をnative HTTP positiveにしない。unknown/ACKfalse/legacy/Google/65/67/allcopies/UI/P5d全体はこのfix・将来単一caseで補完しない。

提案固定後は全reader/writer/runtime停止。元source92/test/fixture/helper/main/過去受入reportは変更0。

## EF01-SAVED-CLASS1 fixed candidate — runtime未実行

Root採用により提案のfailure literal一箇所だけを変更した。A/B保存期待2件はPROVIDER_REJECTED、caller拒否EXCHANGE_UNKNOWN全3箇所、state/assert順序/24 checkpoint/原error同一throw/原releasefinally/await/timers/UoW/privateproofは保持。actual根本原因・群内assert実値はUNKNOWNのまま。business normal PASS0、P5d全体未完。

- own isolated tree HEAD `4f12bc09a3737d3d5a5a1bde433632300240cb25`、親 `20b61af2014a50838d7127895c30a04efd85545a`。commitは既test1path、1 insertion/1 deletionだけ。mainは別authorized scopeであり変更しない。
- test14999B／SHA256 `0fb10e76768d357a051a09470595272d5903bf03504c8166ada194262fe47ce3`。literal inverseで親14998B／80623444427013800d834fbf8c54b564ad1ade1fda35a5b3ff0b28d92de9cb5e全文同値。
- other91は親HEADblob/fullbytes同値。全source92はcurrentHEADblobに一致、tracked status clean。fixture14909B／d01de5db451c85a92780ce752561f95db13a7f954afc5953d68207ebd7864ba1不変。
- own root whole `pnpm typecheck`→`pnpm lint:fix`→`pnpm format` を各結果確認し全exit0。型root/core/web/AWS/CF成功、lint既347 warnings/61 infos・unsafe260 skip・fix0、format1221files fix0。新source以外のtracked変更0。public108 deps/selfcore、単発PATH publicbin prepend + pnpm_config_verify_deps_before_run='' + CLI false、install/network/main/globalconfig0。
- runner 25020B／SHA256 `d7517299b1e96ea9e8d03427efe8b36cd6c8f60f41ff6284723c89de5a504cb1`。ROOT/manifest/REPORT参照文字列の3箇所だけ適応。inverse3bindingで前runner25015B／3b398932dee7d90ce91adf3c4975397fe3a17ef0c49f95505a1705bcae17bee3全文同値。Python AST/compile（未実行・pycache0）PASS。
- loader22845B／19177532a2dad558e00ce92a3d939ed873b68e93ef66e1cd911cc177cce32ba8全文不変、既samebytes Node--check成功を継承。guard・24 keys・strict ONE frame・diagnostic永久normal/auditdeny・resource/case/closure/proof protocol不変。
- fresh memory-only予約 `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-multi-20261006-6e54b7a2` と派生 `-tool-tmp`。absence probe/default preflight/create/runtime/DB/key/config/test/native0。旧success/failed privateとTMPは全非操作。
- REPORT参照を本NEWproposalへ変更する必要差はRootへ事前通知し採用済み。その他BREF_REPORT等の依存定数なし。元診断phase40157B／ce941f72df88cef0936f10c8afdbee7652f26a15b36639612567de8f3b58927b全文不変。

current source92manifest SHA256 `355c56f0eced2c07ea2ce08333664e838f9cb1710b9c20b0ea3c10f6d8a735c6`。以下はcurrent候補の唯一の92表であり、前proposal6416B／02f68994948e736d9e7ab59f0d0759658cf6039fca64a64876d886fe50d43b11 prefixは全文保持した。source/helpers/reportを固定し、全reader/writer/runtimeを停止して独立レビューへ渡す。actualは別採用まで0。

| Public source path | Bytes | SHA256 |
| --- | --- | --- |
| `apps/web/app/components/hollow/AccountDeletion.test.tsx` | 6275 | `fa1e89fccfd1de45da5246b1ec43b1f043d784bada3c52eb525aa50d42bd8cc1` |
| `apps/web/app/components/hollow/AccountDeletion.tsx` | 6791 | `cc851eb54a632f6094bc9f3b055eb1304c479e0a3a51a358244f91914af74b6c` |
| `apps/web/app/presentation/accountDeletionInput.test.ts` | 3072 | `30d1d8c8eaf2586aeb8b470a5f1da03800bddc3f8038191b6c04fc8cdef04d7d` |
| `apps/web/app/presentation/accountDeletionInput.ts` | 507 | `0a5075d2da9a7cc4e5b533168e8ce240aea936e38bc9613affbe2ad77458dc0d` |
| `apps/web/app/presentation/accountDeletionServerFn.ts` | 796 | `3da967ff5914f274d8a6f194634c8ceae1be04bd23448202cadbcb18d055e35e` |
| `apps/web/app/routes/settings.profile.tsx` | 5782 | `55a193e4dcf6391cd9744dd7e868a4a47622f849d14cbfc667008bc656effb6c` |
| `apps/web/app/server.node.ts` | 28742 | `6ad03065decfcdf2b906901766a7328654a37378dc51597336cfc64af6112b85` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletion.integration.test.ts` | 8483 | `5a79dd087f225769841015ae47d0f0acf0ab18bbff763c0640f3fc63d65f334c` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionCredentials.integration.test.ts` | 5187 | `c4bf84d1b87b2c9f2fe1708219e33beca4360676d4d3e80b6f29ceb291d5e66e` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionFixtures.ts` | 6886 | `5876ca9e38a788c471e59f7ea3d5a023140952f788bb410535a80553760d299a` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebt.integration.test.ts` | 14999 | `0fb10e76768d357a051a09470595272d5903bf03504c8166ada194262fe47ce3` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebtFixtures.ts` | 14909 | `d01de5db451c85a92780ce752561f95db13a7f954afc5953d68207ebd7864ba1` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentials.integration.test.ts` | 13381 | `96188340531e37caddc9eb5ed83e8d162b4543dd66038fedbc6a2abfcfa85f37` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentialsFixtures.ts` | 13851 | `eca0093406477b44aad990fd8f73d5e949d7d1f44106636e31eb4516eb6f2874` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeHttp.integration.test.ts` | 8299 | `210022aeb600ad9c7b7ca3b1d0150af14365dfdf2a33731c2f33e2a61e87f0da` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeHttpFixtures.ts` | 14547 | `0c444eb8950ebbb24785fb82bb94f4750d739a5218a20062cfceb5dc84f369a5` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionPaging.integration.test.ts` | 13738 | `301b0968baa56ea1d63cc0888f4bba3f008df3f6df4003f2d3d2f01394e67c66` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionSchema.integration.test.ts` | 3120 | `55f93dfbe053823593df1c0e23a3cbf432a78ba89ff346c71e89c65b906766b6` |
| `packages/core/src/adapters/libsql/accountDeletionSchema.ts` | 8494 | `bc7da68fd7647053d93a42b753ac5e485d699cf4545831c84b34df9cca853451` |
| `packages/core/src/adapters/libsql/client.ts` | 2372 | `0fa9c5f6b9e81a0b5c0733f7cf908833bac74c08461eef9d42cdde6bb49a0b75` |
| `packages/core/src/adapters/libsql/driveBackupSchema.ts` | 14707 | `f57f9940a5ed8c6f93bf97dd2da312947be73f5ad96c7646b8ac6e5dc768b36f` |
| `packages/core/src/adapters/libsql/hollowSchema.ts` | 11598 | `cd704a1f2ebcb567a5cd4af15b69935d8cbd4ec75246d99350e601df7c7643f4` |
| `packages/core/src/adapters/libsql/hollowUnitOfWork.ts` | 12224 | `b6434a068b8cbcb8780592390e9bdab5697bb0ed1e938ec220976982eac5036e` |
| `packages/core/src/adapters/libsql/migrations/0044_account_deletion.sql` | 366498 | `c74adb1b00cabbb81440a3fc9128d661fcd81696ad0ced1b52754ac158430df7` |
| `packages/core/src/adapters/libsql/migrations/meta/0044_snapshot.json` | 481396 | `77460304b5f310a4e6befed6fbdc0f59e19a36de5e9fd4156c5ad28e778d01b3` |
| `packages/core/src/adapters/libsql/migrations/meta/_journal.json` | 6651 | `1d97708f2cc7ab3fe9060115883863cf1f708e2f8b28a803fc8ffad787465ffe` |
| `packages/core/src/adapters/libsql/publicDiscoverySnapshot.ts` | 21131 | `965e2084e69a8655c830c12e567af4966fd5a8b779d6bd04aca41f9e273a2849` |
| `packages/core/src/adapters/libsql/purgeSchema.ts` | 4453 | `958c282df9162c3070778105afa3b4f20a7fdc89e256c5bfeefbefde38c6b80f` |
| `packages/core/src/adapters/libsql/regenerationSchema.ts` | 11980 | `56b373b0a7a76542eeb6df1ba448d5d4568555fadbf9f14aa3339346ec52d5f7` |
| `packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts` | 65709 | `23a03b0d1414cd2d83e9c5d48beae198a573f71a2d6efb186b98929cdf255f49` |
| `packages/core/src/adapters/libsql/repositories/accountRepository.ts` | 7363 | `00fbdf4e1250f2d1fa6e0684631488cad64757396f6fb3142bb2958f03d62de3` |
| `packages/core/src/adapters/libsql/repositories/authenticationRepository.ts` | 4573 | `621c99454ff9679645b48d3136d5388fc9ca1fecdf53bdcdfcbe99c2bf51388d` |
| `packages/core/src/adapters/libsql/repositories/batchRepository.ts` | 15856 | `baae8440e0402ee6503010b4d51725c6d6e7a9c98e3a843b4c02d50c92fbb535` |
| `packages/core/src/adapters/libsql/repositories/displayNameRepository.ts` | 2432 | `ee8846b6b7e3b5a3219a67022dbd654018e7dd3a6dc361749031086ab192eba3` |
| `packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts` | 41690 | `f636f47a644dafcef83dfa1acb54ca29632802d098f9a8e12e2e49ad9f5fa274` |
| `packages/core/src/adapters/libsql/repositories/driveRepository.ts` | 39274 | `89c4ca9fbab28adc7290610036668931ccb3587d8b42705d1f62215774be7572` |
| `packages/core/src/adapters/libsql/repositories/exportRepository.ts` | 10021 | `c78de2f182afa4237a0e2a2832df0053d12df348bbc6e9fb0aa86df556de0d42` |
| `packages/core/src/adapters/libsql/repositories/googleAuthAttemptRepository.ts` | 7865 | `49aed45b56c377187e6d998b52d45b7ec6f0b2214b80c9593e1855d9e46c7234` |
| `packages/core/src/adapters/libsql/repositories/invitationRepository.ts` | 7975 | `3e5ebfff626adc66c6b9d4ea418e49e3ef846271957f974658cee95604809317` |
| `packages/core/src/adapters/libsql/repositories/jobRepository.ts` | 5427 | `e839ccf2ae90053ad68207e20d2c7e9d8070040d68cb87238d4195c5afb84c85` |
| `packages/core/src/adapters/libsql/repositories/llmRepository.ts` | 39213 | `3fac8cab0f7e7482457a0c6f8ef627fb38bfe82ea56e8f67bb676334b38fa499` |
| `packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts` | 18187 | `02a91a28b69855bd4288b870b17b1f234c8756e2138800a749b873e894c83969` |
| `packages/core/src/adapters/libsql/repositories/openRouterRepository.ts` | 11304 | `abe57355c1f675da94bb0f6b071e5dae687456558b496b3c4103bf51552fbcb3` |
| `packages/core/src/adapters/libsql/repositories/pdfAnonymousHelpers.ts` | 6154 | `b365d7cbfc9fa7d44dbe893656a61b5e4fd864ca31adb557dda72f2880d3f347` |
| `packages/core/src/adapters/libsql/repositories/pdfHelpers.ts` | 5924 | `8318526e98c61ad2e6f35fdf39d5af19a323de1af740245e611a14b61d12bcf4` |
| `packages/core/src/adapters/libsql/repositories/publicNoteRepository.ts` | 1914 | `daec53385e7cea3072abec8919b69e121fd85849c086a3bb025dcc2a4fb25cf2` |
| `packages/core/src/adapters/libsql/repositories/publicProfileRepository.ts` | 2597 | `f4347860f47a5cdbc98b69189177d5454b856ff643052991daaa9da0bb12de8c` |
| `packages/core/src/adapters/libsql/repositories/purgeRepository.ts` | 39949 | `025cede11e220a34f266dfb86fb9ea1f3bd6a9dfa9a5be02ed5796a743096fcb` |
| `packages/core/src/adapters/libsql/repositories/referenceRepository.ts` | 12544 | `4e22e4b6fe8df1b7300f5c8a5af60d4db749e75682e62bdcaa993e23bbea6ea1` |
| `packages/core/src/adapters/libsql/repositories/regenerationRepository.ts` | 13920 | `75faacac2b2046f1b75cf360d348c6243545bb6c3f5859340874b0520e6de565` |
| `packages/core/src/adapters/libsql/repositories/sharingRepository.ts` | 7900 | `09f920e7f9569d75abb2b015721187bf9e18497b009fc5f3529e4797f08495c9` |
| `packages/core/src/adapters/libsql/repositories/workspaceRepository.ts` | 8087 | `9849b60c65631911b731bf28af9b82c925f86c9176905a24e3a430cdf240e6e4` |
| `packages/core/src/adapters/libsql/repositories/zipDeliveryRepository.ts` | 4347 | `3bdad157afb583e38a7e58a6f33b9e8979439f03df5ecbab36928cc58c0c2b7d` |
| `packages/core/src/adapters/libsql/repositories/zipHelpers.ts` | 14096 | `68c26cd212c2de85070efeb431e1deed992106af0a4c77c96e5e4c58290cb134` |
| `packages/core/src/adapters/libsql/repositories/zipWorkRepository.ts` | 16051 | `e4fd34fc71bd481edc27e075b57b0ea789ca2bdff427ce9536be6c837af89850` |
| `packages/core/src/adapters/libsql/schema.ts` | 919 | `9a94c65f2fa63719e120a3863abf68ba746a3e16564e226cb191cbc6d2f98f14` |
| `packages/core/src/adapters/node/__tests__/coordinatedObjectStorage.test.ts` | 15123 | `871b2a0a3714ed005d3bc77a98ee85d962f2a68b1ceaf2e10e74f158b37e3951` |
| `packages/core/src/adapters/node/auth/config.ts` | 3235 | `4b6cace2b6f45dd9e13c0e3c31fc60409853d68e1ed6ec0b5fd639ee67083490` |
| `packages/core/src/adapters/node/auth/credentialLocalTlsDial.ts` | 10249 | `e8a97c5a8e4310b5a2c13b57858041450ac522a0f303ca5ee1f760d4994425e0` |
| `packages/core/src/adapters/node/auth/credentialRuntimeOwnership.ts` | 19325 | `e07cd78565fe7e7b94480fc1253495d3360f24cc3b11c5027f6ad1a83dfb9dcc` |
| `packages/core/src/adapters/node/auth/googleHttp.ts` | 4822 | `a89479a2729bfd49d4a866239d35e38bd56bae37ba2c94e43b48d1bfb4266d14` |
| `packages/core/src/adapters/node/auth/googleOidc.ts` | 8997 | `7d2a3427afeb06ee304821b8979443a90d97b47c16249533a0b982852ad186a7` |
| `packages/core/src/adapters/node/authenticationExecution.ts` | 4807 | `a4cf2349d298d315ee609dcb4ca2d9ef5f4862ee194220912629309921bcdb7b` |
| `packages/core/src/adapters/node/drive/execution.ts` | 17151 | `de88261f15b303732f095e85f626cc722d8b88486c52b628ee72cdd0ef958d09` |
| `packages/core/src/adapters/node/drive/runtimeOwnership.ts` | 8286 | `f9d04799b5da89f5306abbe2459f20eec188be81fad187dd6b5889295a1890c5` |
| `packages/core/src/adapters/node/openrouter/config.ts` | 3172 | `b14711a4086526e309ccf2ed04bc4aa27cc38972d5a25636818397923ab0860a` |
| `packages/core/src/adapters/node/openrouter/execution.ts` | 3711 | `4f6977a3ab2dbd0c861f39c24a1ad4242758f6706baf0a3572de58fec138706f` |
| `packages/core/src/adapters/node/openrouter/http.ts` | 6692 | `8de96984dc935315ce7b6ebcf00bbf36bf5cc69266e299449262dbbbac97d1b3` |
| `packages/core/src/adapters/node/openrouter/provider.ts` | 13688 | `1656363bdb117c2aaba51694f67c369bc7a3843e3f2cc167e6f1cd7f221c13d5` |
| `packages/core/src/adapters/node/purgeRunner.ts` | 1202 | `ee5ddf0c958d93343cf343aa3e2e9c35ea6e5d3541be6fc198c56e0b23634a22` |
| `packages/core/src/adapters/node/zip/ownedStorage.test.ts` | 20521 | `a08866400fff123555fbbc5505978328b44f0cd5901541fdb2761598b706364f` |
| `packages/core/src/application/account/deletion.ts` | 1542 | `da08ec61121843b2e1734609ece2050aa6c4544b20c81db648af40e55345c021` |
| `packages/core/src/application/account/deletionWorker.ts` | 8150 | `efe1164dbe04e57368955b9b6387c7cca121ae6b11f53774436934766f6cacfb` |
| `packages/core/src/application/account/google.ts` | 14366 | `da9cf5609e0a6ef79f4e6631668c99c879ec13574225c95ef85b5243fd174ca3` |
| `packages/core/src/application/account/ports.ts` | 3641 | `a2cab0e0551497dac82a0225013dc6dfb052e53b43081148f27c622158f3c3cf` |
| `packages/core/src/application/execution/hollowUnitOfWork.ts` | 7354 | `df283ea3e7e50d76f982dbd6848494234502a220b7d16fc4ff1b0abf64a0854f` |
| `packages/core/src/application/integration/drive/ports.ts` | 6949 | `c6e47c5541c4bd8b9299efa1cf482b5e8484fd9957431fc8d8e4f7225dd8d97f` |
| `packages/core/src/application/integration/drive/runner.ts` | 25186 | `d8aca1e28924ec29f5f626bce2f5501c9c4c47489f15652b49747dc47f1f93bf` |
| `packages/core/src/application/integration/openRouter/connection.ts` | 20313 | `3d9ad014cc51d204b190bfa809d08ada1dc266c73d5ed66fbedd3c34fd5a5afe` |
| `packages/core/src/application/integration/openRouter/ports.ts` | 3421 | `2e09844e0a28e194133ef20aa9269b1f077a9ed3de8ba022bf46a463aa8702b6` |
| `packages/core/src/application/note/purge.ts` | 14979 | `9cb3636376fd575fb6b6ecf95215fe561675a2e6ecce8a694d509ccae99992f0` |
| `packages/core/src/application/regeneration/current.ts` | 7956 | `edf3d64c07ecbb6aefb910f4d60d32568972369dff151f4340f7d926012eb443` |
| `packages/core/src/application/regeneration/ports.ts` | 1654 | `28f9cb42110e538307f2dc3b0ff3b146c33c3edf78878699836bbe438f03768d` |
| `packages/core/src/application/regeneration/read.ts` | 5318 | `a2179df7f048ef0ee9a43b97c0b8a892aa5297252b6a1ba1e50fcb5ebded06f3` |
| `packages/core/src/application/regeneration/source.ts` | 11589 | `b8b5d5a9ea85036788fe96480d73496a9e64c02d251bc67ac2a96f16c7a883fb` |
| `packages/core/src/application/workspace/access.ts` | 2693 | `b95a3b77babd2754496d0e72cfeaa107f92a3019453e825809806f99331b4c64` |
| `packages/core/src/application/workspace/delivery.ts` | 7389 | `78f644005ebfd35573c2fb10d9a904326c066e6b0f152820b94d53f903863fee` |
| `packages/core/src/domain/account/deletion.ts` | 4492 | `49bdd4e4c17e66b660a22cb12aac40d62967295509b79ba20599bfa3efdd977c` |
| `packages/core/src/domain/account/ports/accountDeletionRepository.ts` | 2987 | `dfc03e777c476c667edec875dcf82bcc4c9728398415e213e12cb0e03761b411` |
| `packages/core/src/domain/account/ports/accountRepository.ts` | 985 | `18fb8a4498ceedcf0d04985f782d0cc4d921305935c96589f6037283131fc6fd` |
| `packages/core/src/domain/integration/driveBackupRepository.ts` | 5396 | `399f1b91efb0b1ccf72ac154d8cfef5cb5af0217920fb384c2d66f60943b4fcf` |
| `packages/core/src/domain/purge/entity.ts` | 2641 | `62b20045c30c37ef230f1c6fe84a78b8202ed5a1b52e1f5250bb965e27a9c91d` |

## SAVED-CLASS2 fixed candidate — runtime未実行

Root差戻し採用によりattempt-membership群の単一failure literalだけをPROVIDER_REJECTEDへ変更した。元sameA/Bはcaller gateで保持されたまま、ページ回収後にも同保存分類を確認する。前failed-attempts群のPROVIDER_REJECTED、caller A/B/CのEXCHANGE_UNKNOWN全3、state/assert/24checkpoint/原error同一rethrow/releasefinally/元await/timer/gate/proof/UoWは不変。差分合計は20b6から保存failure2literalだけ。実actual群内assert/保存値/根本原因はUNKNOWN、businessnormalPASS0／wholeP5d未完。

- current own HEAD `548a8fefe53444ff6ee032fb9e22be7d7f9efbf2`／親 `4f12bc09a3737d3d5a5a1bde433632300240cb25`。commitは既test1pathの1 insertion/1 deletionだけ。test15000B SHA256 `a257f2af17bf946444413f6f9e29eabe67f22bbd9ee7afaa3ef7da4966ecc8a5`。第二literal inverseで親14999B／0fb10e76768d357a051a09470595272d5903bf03504c8166ada194262fe47ce3全文同値。
- other91 fullbytes/親HEADblob同値、currentsource92全HEADblob同値、tracked status clean。fixture/製品/DDL/ports/他tests変更0。main別authorizedscope非操作。
- own root whole typecheck→lint:fix→format各結果確認、全exit0。型root/core/web/AWS/CF成功、lint347 warnings/61 infos・unsafe260skip/fix0、format1221files/fix0。他source新差分0。公開108deps/selfcore/単発PATH+pnpmverifyfalse方式保持、install/network/global/mainconfig0。
- runner 25203B SHA256 `c6befa104406bb1583d6738fe90f485594b1132a7d7b1dca5f03688fe3273d1d`。manifest定数と厳密latest section選択2行のみ追加。元ROOT6e54b7a2/派生TMP/REPORTは未実行候補のまま、LOADER_SHA22845/19177532全文不変、その他caps/protocol/diagnostic永久normal拒否/正常閉鎖・PG/EOF/FD/audit guards不変。
- runner新manifest定数inverseとsection選択2行除去で前25020B／d7517299b1e96ea9e8d03427efe8b36cd6c8f60f41ff6284723c89de5a504cb1全文同値。PythonAST/compile PASS（コード実行/pycache0）。loaderは全文同bytes・既Nodecheck成功を継承。
- 固定review16636B／6f2d419bb18cef41fc8af5b190c978e50941112a7d87f33546c3fba2496e2311をPUBLIC固定READ済み。報告prefix22762B／395dfe98524c5ebefdd657a01e7a4e1493c510b344f7091fe93939fdece965e9全文保持。旧表は履歴でcurrent照合へ混入しない。最新section選択必要差はRootへ事前通知し採用済み。
- defaultpreflight/absenceprobe/rootcreate/DB/runtime/key/config/test/native0。全旧success/failedprivate/TMP永久非操作。旧診断phase40157/ce941不変。全reader/writer/runtime停止し独立限定deltaへ返す。

## EF01-SAVED-CLASS2 current source92 manifest

現在のsource92 SHA256 `cb5ef0912a6f7d91a76bd462bac25eb2a15dbb059fffbdddc3ee7999c577e2e7`。runnerは上記一意見出しの出現1回を確認し、その後だけをparseする。本sectionの92表/uniquepath/currentfullhash/HEADblobを固定。前候補表はprefix内の履歴であり最新bindingに採用しない。

| Public source path | Bytes | SHA256 |
| --- | --- | --- |
| `apps/web/app/components/hollow/AccountDeletion.test.tsx` | 6275 | `fa1e89fccfd1de45da5246b1ec43b1f043d784bada3c52eb525aa50d42bd8cc1` |
| `apps/web/app/components/hollow/AccountDeletion.tsx` | 6791 | `cc851eb54a632f6094bc9f3b055eb1304c479e0a3a51a358244f91914af74b6c` |
| `apps/web/app/presentation/accountDeletionInput.test.ts` | 3072 | `30d1d8c8eaf2586aeb8b470a5f1da03800bddc3f8038191b6c04fc8cdef04d7d` |
| `apps/web/app/presentation/accountDeletionInput.ts` | 507 | `0a5075d2da9a7cc4e5b533168e8ce240aea936e38bc9613affbe2ad77458dc0d` |
| `apps/web/app/presentation/accountDeletionServerFn.ts` | 796 | `3da967ff5914f274d8a6f194634c8ceae1be04bd23448202cadbcb18d055e35e` |
| `apps/web/app/routes/settings.profile.tsx` | 5782 | `55a193e4dcf6391cd9744dd7e868a4a47622f849d14cbfc667008bc656effb6c` |
| `apps/web/app/server.node.ts` | 28742 | `6ad03065decfcdf2b906901766a7328654a37378dc51597336cfc64af6112b85` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletion.integration.test.ts` | 8483 | `5a79dd087f225769841015ae47d0f0acf0ab18bbff763c0640f3fc63d65f334c` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionCredentials.integration.test.ts` | 5187 | `c4bf84d1b87b2c9f2fe1708219e33beca4360676d4d3e80b6f29ceb291d5e66e` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionFixtures.ts` | 6886 | `5876ca9e38a788c471e59f7ea3d5a023140952f788bb410535a80553760d299a` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebt.integration.test.ts` | 15000 | `a257f2af17bf946444413f6f9e29eabe67f22bbd9ee7afaa3ef7da4966ecc8a5` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebtFixtures.ts` | 14909 | `d01de5db451c85a92780ce752561f95db13a7f954afc5953d68207ebd7864ba1` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentials.integration.test.ts` | 13381 | `96188340531e37caddc9eb5ed83e8d162b4543dd66038fedbc6a2abfcfa85f37` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentialsFixtures.ts` | 13851 | `eca0093406477b44aad990fd8f73d5e949d7d1f44106636e31eb4516eb6f2874` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeHttp.integration.test.ts` | 8299 | `210022aeb600ad9c7b7ca3b1d0150af14365dfdf2a33731c2f33e2a61e87f0da` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeHttpFixtures.ts` | 14547 | `0c444eb8950ebbb24785fb82bb94f4750d739a5218a20062cfceb5dc84f369a5` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionPaging.integration.test.ts` | 13738 | `301b0968baa56ea1d63cc0888f4bba3f008df3f6df4003f2d3d2f01394e67c66` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionSchema.integration.test.ts` | 3120 | `55f93dfbe053823593df1c0e23a3cbf432a78ba89ff346c71e89c65b906766b6` |
| `packages/core/src/adapters/libsql/accountDeletionSchema.ts` | 8494 | `bc7da68fd7647053d93a42b753ac5e485d699cf4545831c84b34df9cca853451` |
| `packages/core/src/adapters/libsql/client.ts` | 2372 | `0fa9c5f6b9e81a0b5c0733f7cf908833bac74c08461eef9d42cdde6bb49a0b75` |
| `packages/core/src/adapters/libsql/driveBackupSchema.ts` | 14707 | `f57f9940a5ed8c6f93bf97dd2da312947be73f5ad96c7646b8ac6e5dc768b36f` |
| `packages/core/src/adapters/libsql/hollowSchema.ts` | 11598 | `cd704a1f2ebcb567a5cd4af15b69935d8cbd4ec75246d99350e601df7c7643f4` |
| `packages/core/src/adapters/libsql/hollowUnitOfWork.ts` | 12224 | `b6434a068b8cbcb8780592390e9bdab5697bb0ed1e938ec220976982eac5036e` |
| `packages/core/src/adapters/libsql/migrations/0044_account_deletion.sql` | 366498 | `c74adb1b00cabbb81440a3fc9128d661fcd81696ad0ced1b52754ac158430df7` |
| `packages/core/src/adapters/libsql/migrations/meta/0044_snapshot.json` | 481396 | `77460304b5f310a4e6befed6fbdc0f59e19a36de5e9fd4156c5ad28e778d01b3` |
| `packages/core/src/adapters/libsql/migrations/meta/_journal.json` | 6651 | `1d97708f2cc7ab3fe9060115883863cf1f708e2f8b28a803fc8ffad787465ffe` |
| `packages/core/src/adapters/libsql/publicDiscoverySnapshot.ts` | 21131 | `965e2084e69a8655c830c12e567af4966fd5a8b779d6bd04aca41f9e273a2849` |
| `packages/core/src/adapters/libsql/purgeSchema.ts` | 4453 | `958c282df9162c3070778105afa3b4f20a7fdc89e256c5bfeefbefde38c6b80f` |
| `packages/core/src/adapters/libsql/regenerationSchema.ts` | 11980 | `56b373b0a7a76542eeb6df1ba448d5d4568555fadbf9f14aa3339346ec52d5f7` |
| `packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts` | 65709 | `23a03b0d1414cd2d83e9c5d48beae198a573f71a2d6efb186b98929cdf255f49` |
| `packages/core/src/adapters/libsql/repositories/accountRepository.ts` | 7363 | `00fbdf4e1250f2d1fa6e0684631488cad64757396f6fb3142bb2958f03d62de3` |
| `packages/core/src/adapters/libsql/repositories/authenticationRepository.ts` | 4573 | `621c99454ff9679645b48d3136d5388fc9ca1fecdf53bdcdfcbe99c2bf51388d` |
| `packages/core/src/adapters/libsql/repositories/batchRepository.ts` | 15856 | `baae8440e0402ee6503010b4d51725c6d6e7a9c98e3a843b4c02d50c92fbb535` |
| `packages/core/src/adapters/libsql/repositories/displayNameRepository.ts` | 2432 | `ee8846b6b7e3b5a3219a67022dbd654018e7dd3a6dc361749031086ab192eba3` |
| `packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts` | 41690 | `f636f47a644dafcef83dfa1acb54ca29632802d098f9a8e12e2e49ad9f5fa274` |
| `packages/core/src/adapters/libsql/repositories/driveRepository.ts` | 39274 | `89c4ca9fbab28adc7290610036668931ccb3587d8b42705d1f62215774be7572` |
| `packages/core/src/adapters/libsql/repositories/exportRepository.ts` | 10021 | `c78de2f182afa4237a0e2a2832df0053d12df348bbc6e9fb0aa86df556de0d42` |
| `packages/core/src/adapters/libsql/repositories/googleAuthAttemptRepository.ts` | 7865 | `49aed45b56c377187e6d998b52d45b7ec6f0b2214b80c9593e1855d9e46c7234` |
| `packages/core/src/adapters/libsql/repositories/invitationRepository.ts` | 7975 | `3e5ebfff626adc66c6b9d4ea418e49e3ef846271957f974658cee95604809317` |
| `packages/core/src/adapters/libsql/repositories/jobRepository.ts` | 5427 | `e839ccf2ae90053ad68207e20d2c7e9d8070040d68cb87238d4195c5afb84c85` |
| `packages/core/src/adapters/libsql/repositories/llmRepository.ts` | 39213 | `3fac8cab0f7e7482457a0c6f8ef627fb38bfe82ea56e8f67bb676334b38fa499` |
| `packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts` | 18187 | `02a91a28b69855bd4288b870b17b1f234c8756e2138800a749b873e894c83969` |
| `packages/core/src/adapters/libsql/repositories/openRouterRepository.ts` | 11304 | `abe57355c1f675da94bb0f6b071e5dae687456558b496b3c4103bf51552fbcb3` |
| `packages/core/src/adapters/libsql/repositories/pdfAnonymousHelpers.ts` | 6154 | `b365d7cbfc9fa7d44dbe893656a61b5e4fd864ca31adb557dda72f2880d3f347` |
| `packages/core/src/adapters/libsql/repositories/pdfHelpers.ts` | 5924 | `8318526e98c61ad2e6f35fdf39d5af19a323de1af740245e611a14b61d12bcf4` |
| `packages/core/src/adapters/libsql/repositories/publicNoteRepository.ts` | 1914 | `daec53385e7cea3072abec8919b69e121fd85849c086a3bb025dcc2a4fb25cf2` |
| `packages/core/src/adapters/libsql/repositories/publicProfileRepository.ts` | 2597 | `f4347860f47a5cdbc98b69189177d5454b856ff643052991daaa9da0bb12de8c` |
| `packages/core/src/adapters/libsql/repositories/purgeRepository.ts` | 39949 | `025cede11e220a34f266dfb86fb9ea1f3bd6a9dfa9a5be02ed5796a743096fcb` |
| `packages/core/src/adapters/libsql/repositories/referenceRepository.ts` | 12544 | `4e22e4b6fe8df1b7300f5c8a5af60d4db749e75682e62bdcaa993e23bbea6ea1` |
| `packages/core/src/adapters/libsql/repositories/regenerationRepository.ts` | 13920 | `75faacac2b2046f1b75cf360d348c6243545bb6c3f5859340874b0520e6de565` |
| `packages/core/src/adapters/libsql/repositories/sharingRepository.ts` | 7900 | `09f920e7f9569d75abb2b015721187bf9e18497b009fc5f3529e4797f08495c9` |
| `packages/core/src/adapters/libsql/repositories/workspaceRepository.ts` | 8087 | `9849b60c65631911b731bf28af9b82c925f86c9176905a24e3a430cdf240e6e4` |
| `packages/core/src/adapters/libsql/repositories/zipDeliveryRepository.ts` | 4347 | `3bdad157afb583e38a7e58a6f33b9e8979439f03df5ecbab36928cc58c0c2b7d` |
| `packages/core/src/adapters/libsql/repositories/zipHelpers.ts` | 14096 | `68c26cd212c2de85070efeb431e1deed992106af0a4c77c96e5e4c58290cb134` |
| `packages/core/src/adapters/libsql/repositories/zipWorkRepository.ts` | 16051 | `e4fd34fc71bd481edc27e075b57b0ea789ca2bdff427ce9536be6c837af89850` |
| `packages/core/src/adapters/libsql/schema.ts` | 919 | `9a94c65f2fa63719e120a3863abf68ba746a3e16564e226cb191cbc6d2f98f14` |
| `packages/core/src/adapters/node/__tests__/coordinatedObjectStorage.test.ts` | 15123 | `871b2a0a3714ed005d3bc77a98ee85d962f2a68b1ceaf2e10e74f158b37e3951` |
| `packages/core/src/adapters/node/auth/config.ts` | 3235 | `4b6cace2b6f45dd9e13c0e3c31fc60409853d68e1ed6ec0b5fd639ee67083490` |
| `packages/core/src/adapters/node/auth/credentialLocalTlsDial.ts` | 10249 | `e8a97c5a8e4310b5a2c13b57858041450ac522a0f303ca5ee1f760d4994425e0` |
| `packages/core/src/adapters/node/auth/credentialRuntimeOwnership.ts` | 19325 | `e07cd78565fe7e7b94480fc1253495d3360f24cc3b11c5027f6ad1a83dfb9dcc` |
| `packages/core/src/adapters/node/auth/googleHttp.ts` | 4822 | `a89479a2729bfd49d4a866239d35e38bd56bae37ba2c94e43b48d1bfb4266d14` |
| `packages/core/src/adapters/node/auth/googleOidc.ts` | 8997 | `7d2a3427afeb06ee304821b8979443a90d97b47c16249533a0b982852ad186a7` |
| `packages/core/src/adapters/node/authenticationExecution.ts` | 4807 | `a4cf2349d298d315ee609dcb4ca2d9ef5f4862ee194220912629309921bcdb7b` |
| `packages/core/src/adapters/node/drive/execution.ts` | 17151 | `de88261f15b303732f095e85f626cc722d8b88486c52b628ee72cdd0ef958d09` |
| `packages/core/src/adapters/node/drive/runtimeOwnership.ts` | 8286 | `f9d04799b5da89f5306abbe2459f20eec188be81fad187dd6b5889295a1890c5` |
| `packages/core/src/adapters/node/openrouter/config.ts` | 3172 | `b14711a4086526e309ccf2ed04bc4aa27cc38972d5a25636818397923ab0860a` |
| `packages/core/src/adapters/node/openrouter/execution.ts` | 3711 | `4f6977a3ab2dbd0c861f39c24a1ad4242758f6706baf0a3572de58fec138706f` |
| `packages/core/src/adapters/node/openrouter/http.ts` | 6692 | `8de96984dc935315ce7b6ebcf00bbf36bf5cc69266e299449262dbbbac97d1b3` |
| `packages/core/src/adapters/node/openrouter/provider.ts` | 13688 | `1656363bdb117c2aaba51694f67c369bc7a3843e3f2cc167e6f1cd7f221c13d5` |
| `packages/core/src/adapters/node/purgeRunner.ts` | 1202 | `ee5ddf0c958d93343cf343aa3e2e9c35ea6e5d3541be6fc198c56e0b23634a22` |
| `packages/core/src/adapters/node/zip/ownedStorage.test.ts` | 20521 | `a08866400fff123555fbbc5505978328b44f0cd5901541fdb2761598b706364f` |
| `packages/core/src/application/account/deletion.ts` | 1542 | `da08ec61121843b2e1734609ece2050aa6c4544b20c81db648af40e55345c021` |
| `packages/core/src/application/account/deletionWorker.ts` | 8150 | `efe1164dbe04e57368955b9b6387c7cca121ae6b11f53774436934766f6cacfb` |
| `packages/core/src/application/account/google.ts` | 14366 | `da9cf5609e0a6ef79f4e6631668c99c879ec13574225c95ef85b5243fd174ca3` |
| `packages/core/src/application/account/ports.ts` | 3641 | `a2cab0e0551497dac82a0225013dc6dfb052e53b43081148f27c622158f3c3cf` |
| `packages/core/src/application/execution/hollowUnitOfWork.ts` | 7354 | `df283ea3e7e50d76f982dbd6848494234502a220b7d16fc4ff1b0abf64a0854f` |
| `packages/core/src/application/integration/drive/ports.ts` | 6949 | `c6e47c5541c4bd8b9299efa1cf482b5e8484fd9957431fc8d8e4f7225dd8d97f` |
| `packages/core/src/application/integration/drive/runner.ts` | 25186 | `d8aca1e28924ec29f5f626bce2f5501c9c4c47489f15652b49747dc47f1f93bf` |
| `packages/core/src/application/integration/openRouter/connection.ts` | 20313 | `3d9ad014cc51d204b190bfa809d08ada1dc266c73d5ed66fbedd3c34fd5a5afe` |
| `packages/core/src/application/integration/openRouter/ports.ts` | 3421 | `2e09844e0a28e194133ef20aa9269b1f077a9ed3de8ba022bf46a463aa8702b6` |
| `packages/core/src/application/note/purge.ts` | 14979 | `9cb3636376fd575fb6b6ecf95215fe561675a2e6ecce8a694d509ccae99992f0` |
| `packages/core/src/application/regeneration/current.ts` | 7956 | `edf3d64c07ecbb6aefb910f4d60d32568972369dff151f4340f7d926012eb443` |
| `packages/core/src/application/regeneration/ports.ts` | 1654 | `28f9cb42110e538307f2dc3b0ff3b146c33c3edf78878699836bbe438f03768d` |
| `packages/core/src/application/regeneration/read.ts` | 5318 | `a2179df7f048ef0ee9a43b97c0b8a892aa5297252b6a1ba1e50fcb5ebded06f3` |
| `packages/core/src/application/regeneration/source.ts` | 11589 | `b8b5d5a9ea85036788fe96480d73496a9e64c02d251bc67ac2a96f16c7a883fb` |
| `packages/core/src/application/workspace/access.ts` | 2693 | `b95a3b77babd2754496d0e72cfeaa107f92a3019453e825809806f99331b4c64` |
| `packages/core/src/application/workspace/delivery.ts` | 7389 | `78f644005ebfd35573c2fb10d9a904326c066e6b0f152820b94d53f903863fee` |
| `packages/core/src/domain/account/deletion.ts` | 4492 | `49bdd4e4c17e66b660a22cb12aac40d62967295509b79ba20599bfa3efdd977c` |
| `packages/core/src/domain/account/ports/accountDeletionRepository.ts` | 2987 | `dfc03e777c476c667edec875dcf82bcc4c9728398415e213e12cb0e03761b411` |
| `packages/core/src/domain/account/ports/accountRepository.ts` | 985 | `18fb8a4498ceedcf0d04985f782d0cc4d921305935c96589f6037283131fc6fd` |
| `packages/core/src/domain/integration/driveBackupRepository.ts` | 5396 | `399f1b91efb0b1ccf72ac154d8cfef5cb5af0217920fb384c2d66f60943b4fcf` |
| `packages/core/src/domain/purge/entity.ts` | 2641 | `62b20045c30c37ef230f1c6fe84a78b8202ed5a1b52e1f5250bb965e27a9c91d` |

## EF01-SAVED-CLASS2 ONE actual safe receipt — 局所正常

Root別ONE採用に従い、固定C548a8fefe53444ff6ee032fb9e22be7d7f9efbf2／source92 cb5ef0912a6f7d91a76bd462bac25eb2a15dbb059fffbdddc3ee7999c577e2e7、runner25203/c6befa104406bb1583d6738fe90f485594b1132a7d7b1dca5f03688fe3273d1d、loader22845/19177532a2dad558e00ce92a3d939ed873b68e93ef66e1cd911cc177cce32ba8の独立PUBLIC source/headblob/latest92/helper/metadata/guard binding checks全PASSを確認した。その後既default runnerを別実行しexit0/preflighttrue/executedfalse/database0/newRoot0を確認し、採用済みfresh6e54b7a2と派生toolTMPで既 --execute を一度だけ実行した。source/helper/main変更0、自動再試行0、raw private出力・旧private操作0。

実行前39191B／7315061807bc075d972e0d0411b112683d7635545fa0775f870c73245ff39ed0の全文prefixをそのまま保持した。報告の過去候補・失敗結果は履歴であり、以下の局所実観測と区分する。最新current92 table bindingは同じである。

### 独立safe観測

- actualExit0／oktrue／failure null／normalExittrue／elapsedMs2009／outputBytes613。外Python toolもexit0。
- stage native-credentials、EF01 passed。filePassedtrue／afterAllCompletedtrue／forksClosedtrue、summary completed native-credentials、selected case1 passed。case-failure・failure・diagnostic frame0。
- fixture-closed frameはexecutionStoppedtrue／clientClosedtrue。passwordHasher.stopは固定fixtureのstop sourceに含まれ、独立のpassword専用eventを取得していない。hook終了だけからこの閉鎖を推定しない。
- fork1／sameOwnedPGtrue／forksActualClosedtrue／workerCount0／deniedfalse。追加businesschild/HTTP/DNS/nativeWorkerは固定guardとresources0ケースの範囲で0。
- forcedTermfalse／forcedKillfalse。supervisorPGObservedtrue／helperOwnPGObservedtrue／ownPGState absent／leaderState absent／pollMs200。
- stdoutEOFtrue／stderrEOFtrue／pipeHandlesClosedtrue。normalPipeCloseReceiptのstdoutCloseReturned、stderrCloseReturned、stdoutClosed、stderrClosedは独立全4flagstrue。EOFとFD close完了を同一証拠にしない。
- 正常gate後のみ、同fresh DB1へのreadonly auditでforeignKeystrue／integritytrue／anchorFencetrue／readonlyClosedtrue。追加DB0。heldfalse。

### 業務assertから借用する局所範囲

同candidate EF01のpassed assertionは、正規native resources0 whole callersA/Bのactive/callerEndedfalse/ACKfalseを保ち、Cのgenuine closure/save/read/ACKconsume後の個別attempt/use回収、未閉鎖A/Bのtarget/保存履歴維持、実final verify非空→waiting-owner/succeeded0、元callback二つのrelease→same private proof identity/正規保存読戻ACK消費、論理clock2001後の同intent正常verify/succeededとresidual0を要求する。正常保存failure二箇所とcaller拒否三箇所は別の正規分類として確認された。これらは固定sourceのpassed assertion根拠であり、safe summaryが各row・proof・page値を別々に独立emitしたと記述しない。私有row/ID/proof/鍵/body/SQL/error.message/stackは取得・出力しない。

Durable credential-use obligations2をliteral account_deletion_debts2へ読み替えない。入力no-adopted-origin/never-linked/未seed family0を、既存秘密の全copy閉鎖へ代用しない。resources0はnative HTTP positiveではない。unknown/ACKfalse/legacycutover/multiepoch/Google/65・67/allcopies/WS移動/UI/wholeP5d A–Hは別の未成立条件であり、本case1成功やtargeted readonly auditで補完しない。以前のfailed-attempts AssertionErrorのactual群内値・根本原因を今回の成功で遡って確定しない。

### 停止

ONE runtimeは実終了済み。新success6e54b7a2とtoolTMPを含め全success/failed privateは今後read/stat/hash/copy/import/reopen/retry0。固定source/helper/旧40157診断phase/main/過去受入report変更0。safe receipt固定後、全reader/writer/runtime停止してRoot独立借用レビューへ渡す。
