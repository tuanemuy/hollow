# CA67 UOW1024 fixed candidate

2026-10-06T12:22:29+00:00。候補完成、actual/default/explicitpreflight/test/sourceimport/DB/key/native/rootprobe/create 0。Root採用計数837/upper905を根拠にCA67-only UoW上限1024へ変更した。全旧actual roots/TMPは永久NOOPS。候補の型・構文成功は機能受入や実counter/closureの証拠ではない。全source/git/helper reader/writer STOP。

SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006`、C `55ef3b226babeb6269654c66dbe0198eae35d366`、parent `e55b08cbb691835736c8e14392ee025b1eaba99a`。Git差exact2path/2insertions/2deletions、tracked working/index clean、outside2差0。SOURCE98合計1912325B、他96 bytes/SHA/mode/HEADblob不変。product/ports/DDL/LD01/DA01/main/S5/UI/Manager変更0。元DRAIN-CODE1 PUBLIC helpers/reportは固定不変更。

## 採用された2 literal と逆差分

| Path | Exact old → new | Line | Bytes | SHA256 | HEAD blob |
| --- | --- | ---: | ---: | --- | --- |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionDriveCapacityFixtures.ts` | `if (++unitOfWorkCalls > 768) {` → `if (++unitOfWorkCalls > 1024) {` | 306 | 19552 | `80320af03ed963e4e5fa693fdfcc8b3e09b7e4e74c3ce1a9b6c1f0a193c88256` | `4b8352a4a7bb766319c73131f3a4df72986fa5eb` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionDriveCapacity.integration.test.ts` | `toBeLessThanOrEqual(768)` → `toBeLessThanOrEqual(1024)` | 219 | 8165 | `6dd839dd6591edccfd5e53f33f8e11a8dafc92cc91008bd3a421d8a939d5c2dd` | `e39856061c35347f67961706d8e3406b46b6add2` |

両working sourceはactual600/regular/nlink1/selfUID/canonical、Git100644。各置換件数1。fixture1024→768全文逆適用はparent19551B/SHA967ae00d8011b113ee75910f30ced8020dc577337ea30245a0273aedebabeb48、test1024→768はparent8164B/SHAb0f48dc87d074a9f3ee50e244d75a0c8f59cf0594ee873b2d40a62685927bac3へbytes一致。元throw/短絡評価/this/args/return/Promise/result/privateproof/ACK/タイムアウト/全assert意味は不変。repo元await-result維持の限界を保ち、samePromiseの新主張0。

SOURCE98はO_NOFOLLOW fullstable dev/ino/mode/size/mtimeNs/ctimeNs/UID/nlink、canonical/regular/selfUID/nlink1を確認。actual modesはmanifestごとの600/644を維持し一般的なchmod0。AGENTS.md→CLAUDE.md sole internal trackedlinkの字句/canonical/前後identity一致。pair `efd211b21f761a6a42ee0c4fe06a26724d6e26593b13fa417bb99276fce028d6`（sorted path+' '+SHA+'\\n'）、shape `d1b75d84d7c8926a2017490bd39d5236c78ae5cbdd0799e2d73b11702b2f01a0`（sorted [path,bytes,SHA,actualModeString,HEADblob] compactJSON）。元pair596af1dd4ea11581035e84baa5a0a06985aff73dd85c948013198cc5ce55d0d4/shapee9cc3a7baca0fec0bbd847b460b57842ed552c936a9693bff4de83fe3c40ae8bから唯一2row更新。

## SOURCE-derived 予算

採用計画 `P5d-drive-capacity-uow-budget-plan.md` 14126B/SHA`c53b500df209fc1dcbd171e0726fabd4a5a78ef8cf20363ac6348c0a760387b6`。元actualの最終counter/page/総体原因はUNKNOWNのまま、769など実停止境界をexpectedへコピーしない。

normal837 = setup account/browser2 + initialconnection1 + storage recoverWrites1 + 68×(confirmation1 + begin2 + complete6 + closedRow1)680 + capacity/pending4 + maintenance2×3=6 + drain142 + finalconnection1。元701はcompleteを4と数え、正常exchange内 adoptDriveCandidate のread-only UoWと最終phase readの2×68=136を欠落していた。drainは元計数済みで25/25/17/1pageの51+51+36+4=142。

保守upper905 = normal837 + runner settleOwnedResult の単一catch内second-settle最大68。正常経路837の期待へ異常枝を加えない。cap1024−upper905=headroom119（normal比187）。原run wrapperが一度増分しoriginal.run(fn)を同receiverで返す。DBtxやmemory-only afterCommitはUoW.run新呼出に数えない。stop/FK/checkpoint/直接SQL observerはclient単位でUoW0。原client-method/statement各12288不変；旧coarse9730+欠落read-only UoW cost method≤544=10274、statement≤408=10138で各cap内。実methods/statements/UoWは未観測。

begin68/ACK68、pages25/25/17/1、prune68/connectionversion69、browserRecent5/10minとlogical13×600001ms、history/ACKmax68/registry67は不変。源private first-sticky enum8+NULLのguardはuow-boundの上限だけ1024になり意味を一般化しない。client guard12288/製品guards512/他family4096は不変更。

## 予算補足9path（SOURCE98とは別）

既Root採用の静的補足のみ、計56867B。今回Cでもbytes/SHA/mode/HEADblob同値を確認。追加実装・SOURCE107扱い0。`application/integration/drive/services.ts` exact Git不存在は既結果で、fallback探索0。

| Supplemental path | Bytes | SHA256 | Actual mode | HEAD blob |
| --- | ---: | --- | --- | --- |
| `packages/core/src/application/integration/drive/connection.ts` | 17913 | `dab47422012091b38b34e1f2cf8a6b8437857415933c9bc1558834b974e0bb9a` | 0o600 | `0a750abd90e33d0a544cb074b763b2b1936a2e74` |
| `packages/core/src/application/account/context.ts` | 4135 | `b3c957cbd478d2d6b64e5442449dc683174aeadd42b1ac4d3811ca7fd4c2ede4` | 0o600 | `f736dbe816ffaac1a04569adc51c2521699e7186` |
| `packages/core/src/application/account/session.ts` | 2714 | `da6abc18ed13ba468aa617735c99d554377dc83ad41cac34affcc34f5a3b3118` | 0o600 | `7687e4d15cdc84c83b2f60ad69933eef8721795f` |
| `packages/core/src/application/integration/drive/current.ts` | 4725 | `36cf60994500b9d8e944a6fb5a0ccc2f76301b213bfd7b1dc59f978aeac35c70` | 0o600 | `ff9648c7d60e6a437863bd8a6ae8f9bbead404b9` |
| `packages/core/src/application/integration/drive/control.ts` | 12022 | `c63df7661712ff2ca696a3b69c2070054c2c144cadd8949b828f35d897739525` | 0o600 | `71fe6c26a01317bcfb2a48425af410671bca9aeb` |
| `packages/core/src/application/integration/drive/backup/cancellation.ts` | 1277 | `29ba9c3fe766061b93885416c14f1e37c9403937397154127b0e52fe120f23ac` | 0o600 | `1c0570f032c9fbae693360ddf6acd3e1d8e9bdee` |
| `packages/core/src/adapters/node/coordinatedObjectStorage.ts` | 9473 | `549c01041320a5450a586a6293c17c3a11403b375524f2099ca94895a8f43d92` | 0o600 | `4586e523bc86b148a243bb1e6f246a94ce0c7eda` |
| `packages/core/src/adapters/node/drive/factory.ts` | 3003 | `6f7ef37efe43c8fa62ebab67d3841162ad28c763deff4898e94a58f896854405` | 0o600 | `fda22f505f9fa558f4b53efea3a2dade8488e640` |
| `packages/core/src/application/di/serverHollow.ts` | 1605 | `f22807b3d988dd46d7d1b992786a9eec5d99a24853be08baa4a34998abd8765a` | 0o600 | `b0ee178f51d3f95688bde1be9cae354d71d5a303` |

## 新PUBLIC helpersと全文inverse

| Path | Bytes | SHA256 | Mode |
| --- | ---: | --- | --- |
| `.goal-implement/helpers/p5d-drive-capacity-uow-runner.py` | 25589 | `780b3e4b058adf52001374ca1dccddeea1135408c853499bf1a85b82ed7b355a` | 0o600 |
| `.goal-implement/helpers/p5d-drive-capacity-uow-loader.mjs` | 24711 | `9af650917c662a7d9c053972a85de49ca6bff61b7fb2eedbac38160f86adc21a` | 0o600 |

新2fileはO_CREAT|O_EXCL600で作成・fsync・FDclose、regular/nonlink/nlink1/selfUID/canonical/fullstable。loader全文は元DRAIN loader24711B/SHA9af650917c662a7d9c053972a85de49ca6bff61b7fb2eedbac38160f86adc21aと完全同値。import.meta.urlからの自己path以外operational内容変更0。

runner許可置換の件数: ROOT basename1、loader filename1、MANIFEST_SHA1、report filename1、manifest heading2。LOADER_SHAはloader bytes同値のため元SHA保持。これらを逆適用すると元DRAIN runner25619B/SHA72121698913a9c6b319cbab834b65b5448dc12e4b2ae1875d19d814b97e9f5f9へ全文bytes一致。元counterはSOURCEfixtureだけなのでhelper cap/decoder/normalgate変更0。旧helper/old-root字句は比較文字列だけ、private操作0。

新memory-only ROOT `/Users/hikaru/.local/share/hollow-validation/p5d-drive-capacity-uow-20261006-c49be037` と派生 `-tool-tmp`。未probe/未作成。既default CLI/--executeの内容は元runnerから保持、いずれも未実行。Root独立reviewと別actual採用前はfreshabsenceの検査を含め実行0。

## PUBLIC dependencies / CF / checks

正式 `P5d-public-tooling.md` 20118B/SHA110a38bda27aea09bf0cef4c532419fe8cec989e1290e3ef7774dc97f88c221dの108 exactcanonicalaliases、distinct83package.jsonを前後照合。不一致/変更0。sorted[path,target] compactJSON SHA1382fe198736894738df75469144b6046c637f5d24ef232364d4f788a861dcdc；83packages合計422152B/108重複679698B。packages[bytes,SHA,mode] keyedtarget compactJSON(sort_keys)前後digest49570610886dee62f1a8d1a04fe45eff43be5824ced05287039f80228a04d174。aliases(rel,target,link,mode,inode)前後digest e2f015b0e104b92810b724a83366b00f44a54f755cf4a63cff3e72f4471a564f。旧5e9019...別serializationを同一と主張しない。

初回工具の独自32KiB package read上限により正式 `packages/core/node_modules/drizzle-orm/package.json` 177277B metadata時点でbody前停止。そのexact PUBLICtargetは下記alias tableのcanonical正本だけを使う。Root採用後この1rowのみ192KiB/他82各32KiB、actual0644/selfUID501/nlink1/regular/NOFOLLOW/fullstable177277B/SHA9fd30ce718965c19178ac6936462b77017f1fffe56865124d0cfe55850de09ffを確認。source-cap例外はprivate/rootcap拡張でない。drizzle exact canonicaltarget: `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/drizzle-orm@0.45.2_@cloudflare+workers-types@4.20260511.1_@libsql+client@0.18.0_@opentelemetry+api@1.9.0/node_modules/drizzle-orm/package.json`。

ownCF `apps/web/worker-configuration.d.ts`986B/SHA1803d60aa0818e5a3a7630807466ffaae8fdeb0fd85b7fa59431638fc5a479fa/stable600不変、再生成0。PUBLIC shim regular0755 tsgo1335B/74f44472cb3a5159bcdb6173a6ae872127c181cdf5804f6d04ac3194684eabfa、biome1165B/c7314a491b4b6e9dbe7589a6041e728537c1b2adecbba8d3f612837b9b20caf7、tsc1119B/4c04fc850d5270f2d1a531362c566a853e74061d81f1474606bc391892f4fa67前後同値。未知npm/cache/store/generateddir/globalconfig/env/PID探索0。

whole SOURCE cwdでPUBLICmain node_modules/.binを既PATHへprepend、単発env `pnpm_config_verify_deps_before_run=false` とCLI `pnpm --config.verify-deps-before-run=false` の typecheck→lint:fix→format 各exit0。stdout/stderrはdiscardしraw出力保存0。diff --check0。自動install/downloadは明示禁止設定を使った事実で、内部全副作用未観測をexit0だけから不存在へ補完しない。PUBLIC108/83/CF/shims前後全同値が確認範囲。

Python AST/compile成功（helperimport/eval/pycache0）、canonicalNode24.18 --check newloader exit0（sourceimport/business0）。既正規Stockfork/cacheFsfalse/receiverargsPromise/IPC/stdio捕捉・kill順序・PGtri-state・2EOFと独立FD4flags/normalclose/audit前提を全文inverseで維持。新proof/nativeevent/ACK生成0。

## 有限actual提案と未検証

CA67 solecase/casehook40s/body180/outer240/200ms/TERM10KILL10PIPE10。工具Python1→NodeCLI1→stockfork1、businessChild/Worker/HTTP/DNS/socket0。root192MiB/DB1side32MiB合64MiB/TMP8/log2/original8/material256KiB。schema512/40frames=20480B、元最大diagnostic479B/failurefixture126B/outer111B保持。key32+config16384+owner16384+storage256+control20480=53536B<=262144、PUBLIChelpers/reportはprivate materialへコピー0。

fixture original normalstop/checkpoint/clientclose、actual stockfork/Node/Python正常/knownPGabsence/2EOFと独立FD正常receiptをrequireし、missing/unknown/non0/force/guardfailure heldならaudit0/no auto retry。同DBreadonlyquery_only/FK/integrity/expectedaccount1/session1/browser1/unlinkedepoch0version69/no control or ACK/deletion/familyrowsを既assert/auditのまま維持。checkpointawait/afterAll bool/aggregatepipeclosedを物理DB/owner/個別FD閉鎖へ置換しない。正常genureceipt read/save/consume/ACK/endWrite順は未実測、nativeHTTPpositive0、wholeP5d A–H完成への昇格0。

旧493/a79を含む全actual roots/TMP/key/DB/proof/results/logs/cache/generatedsource永久NOOPS、stat/read/hash/import/copy/reopen/reuse/retry/cleanup0。今回新ROOTもmemory予約のみ。Root独立候補review→別PUBLICprecheck→既default fullresult inspection→ONEactualの別明示採用が必要。全source/git/helper/public reader/writer STOP。

## CA67 UOW1024 current source98 manifest

このheadingは一度。current C `55ef3b226babeb6269654c66dbe0198eae35d366`、parent `e55b08cbb691835736c8e14392ee025b1eaba99a`。98 rowsのみ、他96全文同値。

| Source path | Bytes | SHA256 | Actual mode | HEAD blob |
| --- | ---: | --- | --- | --- |
| `apps/web/app/components/hollow/AccountDeletion.test.tsx` | 6275 | `fa1e89fccfd1de45da5246b1ec43b1f043d784bada3c52eb525aa50d42bd8cc1` | 0o644 | `57a18a7e831c57ac6a5d157d08f5b5323e26343b` |
| `apps/web/app/components/hollow/AccountDeletion.tsx` | 6791 | `cc851eb54a632f6094bc9f3b055eb1304c479e0a3a51a358244f91914af74b6c` | 0o644 | `c4fd0fca3be0e6ad6ed2a9dbe4eec1577a367164` |
| `apps/web/app/presentation/accountDeletionInput.test.ts` | 3072 | `30d1d8c8eaf2586aeb8b470a5f1da03800bddc3f8038191b6c04fc8cdef04d7d` | 0o644 | `c6db010b64705ef41bb73e5a65986212e1cc4354` |
| `apps/web/app/presentation/accountDeletionInput.ts` | 507 | `0a5075d2da9a7cc4e5b533168e8ce240aea936e38bc9613affbe2ad77458dc0d` | 0o644 | `3ed9975511f8f96c6c4a4c47726b23d9cd0e3897` |
| `apps/web/app/presentation/accountDeletionServerFn.ts` | 796 | `3da967ff5914f274d8a6f194634c8ceae1be04bd23448202cadbcb18d055e35e` | 0o644 | `916438293107a13d20b611bc35054fd024dab60a` |
| `apps/web/app/routes/settings.profile.tsx` | 5782 | `55a193e4dcf6391cd9744dd7e868a4a47622f849d14cbfc667008bc656effb6c` | 0o600 | `e9f7b6cf33c877d519a5a93a4e841158b84c5bb9` |
| `apps/web/app/server.node.ts` | 28742 | `6ad03065decfcdf2b906901766a7328654a37378dc51597336cfc64af6112b85` | 0o600 | `d60476ef651f469e54d8bc6ea632e4d001e7ff7c` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletion.integration.test.ts` | 8483 | `5a79dd087f225769841015ae47d0f0acf0ab18bbff763c0640f3fc63d65f334c` | 0o600 | `21dbc9df1eed6e7ed87fcecb01eed1c73553342e` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionCredentials.integration.test.ts` | 5187 | `c4bf84d1b87b2c9f2fe1708219e33beca4360676d4d3e80b6f29ceb291d5e66e` | 0o600 | `7518f9d13c8142a7aab75cd11a8fe3270d61a491` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionDriveAcknowledgment.integration.test.ts` | 12615 | `558232bfcf5291960577cf40135280be099bf8b5a2508e4f265711e687086d5f` | 0o600 | `e53796576435e2832b453a55255f93ad0f42a587` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionDriveAcknowledgmentFixtures.ts` | 18928 | `9b0782236496d90feb931a94db12e6aa28ebc85d78aed27d7f8ceb50dd3e2826` | 0o600 | `0213266dc48bb4c96718393e444635ad4f5f35be` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionDriveCapacity.integration.test.ts` | 8165 | `6dd839dd6591edccfd5e53f33f8e11a8dafc92cc91008bd3a421d8a939d5c2dd` | 0o600 | `e39856061c35347f67961706d8e3406b46b6add2` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionDriveCapacityFixtures.ts` | 19552 | `80320af03ed963e4e5fa693fdfcc8b3e09b7e4e74c3ce1a9b6c1f0a193c88256` | 0o600 | `4b8352a4a7bb766319c73131f3a4df72986fa5eb` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionFixtures.ts` | 6886 | `5876ca9e38a788c471e59f7ea3d5a023140952f788bb410535a80553760d299a` | 0o600 | `249f15751a29bb76f8b6537e918763605b5bd377` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionLiteralDebt.integration.test.ts` | 12505 | `e0690ee7097b2e86fa15c455f04f7ee3dd17dc3ee9d13af05aef34db29447e50` | 0o600 | `503d5ab3b13c89bf3ffe852d5017236ffcb6f965` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionLiteralDebtFixtures.ts` | 18417 | `50133913a3dc8c7faf4059ee3c1ff4963bfc3b7b65ac8de2f743b0693d3861fb` | 0o600 | `bc1f87539de403089ab196984619ee6cb03eb7ca` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebt.integration.test.ts` | 15000 | `a257f2af17bf946444413f6f9e29eabe67f22bbd9ee7afaa3ef7da4966ecc8a5` | 0o600 | `eeaecedf5130d317a5482a4d1e4af42450b9e8a1` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebtFixtures.ts` | 14909 | `d01de5db451c85a92780ce752561f95db13a7f954afc5953d68207ebd7864ba1` | 0o600 | `4b19adbcc5c9308ff2f5ae342a1b3d4859ad00c8` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentials.integration.test.ts` | 13381 | `96188340531e37caddc9eb5ed83e8d162b4543dd66038fedbc6a2abfcfa85f37` | 0o600 | `07e1ba4aaec46355a12cce2e3053fa1c462cd827` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentialsFixtures.ts` | 13851 | `eca0093406477b44aad990fd8f73d5e949d7d1f44106636e31eb4516eb6f2874` | 0o600 | `70bcfa9caa87383610f1ed6e04e0299d4063f45f` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeHttp.integration.test.ts` | 8299 | `210022aeb600ad9c7b7ca3b1d0150af14365dfdf2a33731c2f33e2a61e87f0da` | 0o600 | `1cbc3d742fba91d0665e3fe0c247841cfa6f72cf` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeHttpFixtures.ts` | 14547 | `0c444eb8950ebbb24785fb82bb94f4750d739a5218a20062cfceb5dc84f369a5` | 0o600 | `97e5bcff240f8dc0388006e58334c7418ca34233` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionPaging.integration.test.ts` | 13738 | `301b0968baa56ea1d63cc0888f4bba3f008df3f6df4003f2d3d2f01394e67c66` | 0o600 | `16521d823e3d9ef91c9adcea12cbe1180bc93420` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionSchema.integration.test.ts` | 3120 | `55f93dfbe053823593df1c0e23a3cbf432a78ba89ff346c71e89c65b906766b6` | 0o600 | `3e29c1e2cfc998eae11603f4854b139a4b35bec5` |
| `packages/core/src/adapters/libsql/accountDeletionSchema.ts` | 8494 | `bc7da68fd7647053d93a42b753ac5e485d699cf4545831c84b34df9cca853451` | 0o644 | `5c3096e7b347a694bdf0778751dc0ad94e3d1ea3` |
| `packages/core/src/adapters/libsql/client.ts` | 2372 | `0fa9c5f6b9e81a0b5c0733f7cf908833bac74c08461eef9d42cdde6bb49a0b75` | 0o600 | `06b731cc164bae45a321146efac0cfa459952355` |
| `packages/core/src/adapters/libsql/driveBackupSchema.ts` | 14707 | `f57f9940a5ed8c6f93bf97dd2da312947be73f5ad96c7646b8ac6e5dc768b36f` | 0o600 | `8e025bc55ec95834d8bf537c7626335f3d4d6fa6` |
| `packages/core/src/adapters/libsql/hollowSchema.ts` | 11598 | `cd704a1f2ebcb567a5cd4af15b69935d8cbd4ec75246d99350e601df7c7643f4` | 0o600 | `4039549615953b2201a51f29b82c77fa616578f0` |
| `packages/core/src/adapters/libsql/hollowUnitOfWork.ts` | 12224 | `b6434a068b8cbcb8780592390e9bdab5697bb0ed1e938ec220976982eac5036e` | 0o600 | `693b975bdddf433159be29b6f1532c8a0aa99d83` |
| `packages/core/src/adapters/libsql/migrations/0044_account_deletion.sql` | 366498 | `c74adb1b00cabbb81440a3fc9128d661fcd81696ad0ced1b52754ac158430df7` | 0o600 | `030da8ed5357345b1d663ba617cb4b9e2203a2d8` |
| `packages/core/src/adapters/libsql/migrations/meta/0044_snapshot.json` | 481396 | `77460304b5f310a4e6befed6fbdc0f59e19a36de5e9fd4156c5ad28e778d01b3` | 0o600 | `be4419e441228d7cfddfc89308ca635575cf4db2` |
| `packages/core/src/adapters/libsql/migrations/meta/_journal.json` | 6651 | `1d97708f2cc7ab3fe9060115883863cf1f708e2f8b28a803fc8ffad787465ffe` | 0o600 | `77cc1e718bcf89d67169fde8a100344af4236ddd` |
| `packages/core/src/adapters/libsql/publicDiscoverySnapshot.ts` | 21131 | `965e2084e69a8655c830c12e567af4966fd5a8b779d6bd04aca41f9e273a2849` | 0o600 | `40c4bc27fca11b5a62886df7a063e5098f203b00` |
| `packages/core/src/adapters/libsql/purgeSchema.ts` | 4453 | `958c282df9162c3070778105afa3b4f20a7fdc89e256c5bfeefbefde38c6b80f` | 0o600 | `373f57df0b3ea28b34f6978935b293deacbccbf7` |
| `packages/core/src/adapters/libsql/regenerationSchema.ts` | 11980 | `56b373b0a7a76542eeb6df1ba448d5d4568555fadbf9f14aa3339346ec52d5f7` | 0o600 | `ec87dcd4f625aa8b57decb5477b9e719e0ca902d` |
| `packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts` | 65709 | `23a03b0d1414cd2d83e9c5d48beae198a573f71a2d6efb186b98929cdf255f49` | 0o644 | `efda92da653eb57e525372c1f448aa1d637e6c2a` |
| `packages/core/src/adapters/libsql/repositories/accountRepository.ts` | 7363 | `00fbdf4e1250f2d1fa6e0684631488cad64757396f6fb3142bb2958f03d62de3` | 0o600 | `a48028fe2a0ae1d5204133d671866ea4bfa2832c` |
| `packages/core/src/adapters/libsql/repositories/authenticationRepository.ts` | 4573 | `621c99454ff9679645b48d3136d5388fc9ca1fecdf53bdcdfcbe99c2bf51388d` | 0o600 | `c99950397a945f8cfd6610d264b884ee73d6bf22` |
| `packages/core/src/adapters/libsql/repositories/batchRepository.ts` | 15856 | `baae8440e0402ee6503010b4d51725c6d6e7a9c98e3a843b4c02d50c92fbb535` | 0o600 | `a9a330fa763fa4e7588344b2fe1d9576fe01142d` |
| `packages/core/src/adapters/libsql/repositories/displayNameRepository.ts` | 2432 | `ee8846b6b7e3b5a3219a67022dbd654018e7dd3a6dc361749031086ab192eba3` | 0o600 | `f4874fe81a7fdc017f545cbb5d20483245383106` |
| `packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts` | 41690 | `f636f47a644dafcef83dfa1acb54ca29632802d098f9a8e12e2e49ad9f5fa274` | 0o600 | `ddbbe76e47f23b1e42d98d2286f7830c1b9f1c83` |
| `packages/core/src/adapters/libsql/repositories/driveRepository.ts` | 39274 | `89c4ca9fbab28adc7290610036668931ccb3587d8b42705d1f62215774be7572` | 0o600 | `617f19d975bdd4cdbc7c238ba4693168ae4b72f9` |
| `packages/core/src/adapters/libsql/repositories/exportRepository.ts` | 10021 | `c78de2f182afa4237a0e2a2832df0053d12df348bbc6e9fb0aa86df556de0d42` | 0o600 | `a3ccec58d2f22d7587e06b8c38e58f21652fab7c` |
| `packages/core/src/adapters/libsql/repositories/googleAuthAttemptRepository.ts` | 7865 | `49aed45b56c377187e6d998b52d45b7ec6f0b2214b80c9593e1855d9e46c7234` | 0o600 | `06612d85f77322380f7f63a1ca4ae1999b3fbe26` |
| `packages/core/src/adapters/libsql/repositories/invitationRepository.ts` | 7975 | `3e5ebfff626adc66c6b9d4ea418e49e3ef846271957f974658cee95604809317` | 0o600 | `29bfdb9c883489a6b9c8ee1e907a050573afd31f` |
| `packages/core/src/adapters/libsql/repositories/jobRepository.ts` | 5427 | `e839ccf2ae90053ad68207e20d2c7e9d8070040d68cb87238d4195c5afb84c85` | 0o600 | `6b5366709b6e0a5fb6fa410dac3a0e794bd2cbfa` |
| `packages/core/src/adapters/libsql/repositories/llmRepository.ts` | 39213 | `3fac8cab0f7e7482457a0c6f8ef627fb38bfe82ea56e8f67bb676334b38fa499` | 0o600 | `6971e2b5ec1b60d174a4ebe2977133d4039e1787` |
| `packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts` | 18187 | `02a91a28b69855bd4288b870b17b1f234c8756e2138800a749b873e894c83969` | 0o600 | `ec3d84225d7054321336630028bf2086550d8a1a` |
| `packages/core/src/adapters/libsql/repositories/openRouterRepository.ts` | 11304 | `abe57355c1f675da94bb0f6b071e5dae687456558b496b3c4103bf51552fbcb3` | 0o600 | `c506d25254f7ac72993d5495b6b471e278541f21` |
| `packages/core/src/adapters/libsql/repositories/pdfAnonymousHelpers.ts` | 6154 | `b365d7cbfc9fa7d44dbe893656a61b5e4fd864ca31adb557dda72f2880d3f347` | 0o600 | `cec891eb77c1528a5263daa65f630bb8cdd1ee6d` |
| `packages/core/src/adapters/libsql/repositories/pdfHelpers.ts` | 5924 | `8318526e98c61ad2e6f35fdf39d5af19a323de1af740245e611a14b61d12bcf4` | 0o600 | `02e58b6f169f5f3241ce2066eb1bb0c9e99e3d32` |
| `packages/core/src/adapters/libsql/repositories/publicNoteRepository.ts` | 1914 | `daec53385e7cea3072abec8919b69e121fd85849c086a3bb025dcc2a4fb25cf2` | 0o600 | `710914619879f15f0b4859fdcdee35ffe313aae5` |
| `packages/core/src/adapters/libsql/repositories/publicProfileRepository.ts` | 2597 | `f4347860f47a5cdbc98b69189177d5454b856ff643052991daaa9da0bb12de8c` | 0o600 | `34ffa56cc90fb763377bcc3d10934c4f882cf883` |
| `packages/core/src/adapters/libsql/repositories/purgeRepository.ts` | 39949 | `025cede11e220a34f266dfb86fb9ea1f3bd6a9dfa9a5be02ed5796a743096fcb` | 0o600 | `e73ed7a281cc26e1474bf8292517de59f88e2a32` |
| `packages/core/src/adapters/libsql/repositories/referenceRepository.ts` | 12544 | `4e22e4b6fe8df1b7300f5c8a5af60d4db749e75682e62bdcaa993e23bbea6ea1` | 0o600 | `e7e9bbad787978a62550e218027c6731e350b96c` |
| `packages/core/src/adapters/libsql/repositories/regenerationRepository.ts` | 13920 | `75faacac2b2046f1b75cf360d348c6243545bb6c3f5859340874b0520e6de565` | 0o600 | `e4cf76c043b1b7a703d2cad894dfc924a929c037` |
| `packages/core/src/adapters/libsql/repositories/sharingRepository.ts` | 7900 | `09f920e7f9569d75abb2b015721187bf9e18497b009fc5f3529e4797f08495c9` | 0o600 | `f27198041415931a575051197429821f70478d49` |
| `packages/core/src/adapters/libsql/repositories/workspaceRepository.ts` | 8087 | `9849b60c65631911b731bf28af9b82c925f86c9176905a24e3a430cdf240e6e4` | 0o600 | `46ee8151c8b94f3e39cfb2357654ab711487b7da` |
| `packages/core/src/adapters/libsql/repositories/zipDeliveryRepository.ts` | 4347 | `3bdad157afb583e38a7e58a6f33b9e8979439f03df5ecbab36928cc58c0c2b7d` | 0o600 | `2df737665f6c41a54d1d24f5c30b92a6eb55b5a8` |
| `packages/core/src/adapters/libsql/repositories/zipHelpers.ts` | 14096 | `68c26cd212c2de85070efeb431e1deed992106af0a4c77c96e5e4c58290cb134` | 0o600 | `edca73f088ebd2704da2b08d3a5f90aaab88c2f6` |
| `packages/core/src/adapters/libsql/repositories/zipWorkRepository.ts` | 16051 | `e4fd34fc71bd481edc27e075b57b0ea789ca2bdff427ce9536be6c837af89850` | 0o600 | `ab21d9f86eed1502a09120b7e2514cfca090e042` |
| `packages/core/src/adapters/libsql/schema.ts` | 919 | `9a94c65f2fa63719e120a3863abf68ba746a3e16564e226cb191cbc6d2f98f14` | 0o600 | `5723950991b86914574f12ec1de695ad4ed2917e` |
| `packages/core/src/adapters/node/__tests__/coordinatedObjectStorage.test.ts` | 15123 | `871b2a0a3714ed005d3bc77a98ee85d962f2a68b1ceaf2e10e74f158b37e3951` | 0o600 | `55fe03b1a06bc49dcbeff0b4b8df4800a232d3a8` |
| `packages/core/src/adapters/node/auth/config.ts` | 3235 | `4b6cace2b6f45dd9e13c0e3c31fc60409853d68e1ed6ec0b5fd639ee67083490` | 0o600 | `f581fac095e2983e1bc50e2cad20730d092f024d` |
| `packages/core/src/adapters/node/auth/credentialLocalTlsDial.ts` | 10249 | `e8a97c5a8e4310b5a2c13b57858041450ac522a0f303ca5ee1f760d4994425e0` | 0o600 | `34107f92a7548c6ebe03ce5d8a760f7f9b4151a9` |
| `packages/core/src/adapters/node/auth/credentialRuntimeOwnership.ts` | 19325 | `e07cd78565fe7e7b94480fc1253495d3360f24cc3b11c5027f6ad1a83dfb9dcc` | 0o644 | `fe649292cb21bd2f267538b7eb5b094ffec3e2f7` |
| `packages/core/src/adapters/node/auth/googleHttp.ts` | 4822 | `a89479a2729bfd49d4a866239d35e38bd56bae37ba2c94e43b48d1bfb4266d14` | 0o600 | `974c02f0c208e02f27be9ebcf0f4b30036cc8beb` |
| `packages/core/src/adapters/node/auth/googleOidc.ts` | 8997 | `7d2a3427afeb06ee304821b8979443a90d97b47c16249533a0b982852ad186a7` | 0o600 | `d4a9020f5fe82b0ba0d1a87ccc1beff4d23a790e` |
| `packages/core/src/adapters/node/authenticationExecution.ts` | 4807 | `a4cf2349d298d315ee609dcb4ca2d9ef5f4862ee194220912629309921bcdb7b` | 0o600 | `0bb67381dd27ed78264dae5cc29679f3a07db49d` |
| `packages/core/src/adapters/node/drive/execution.ts` | 17151 | `de88261f15b303732f095e85f626cc722d8b88486c52b628ee72cdd0ef958d09` | 0o600 | `1dd5248d0e7e9dfa0ab520c629ae4230dc219c71` |
| `packages/core/src/adapters/node/drive/runtimeOwnership.ts` | 8286 | `f9d04799b5da89f5306abbe2459f20eec188be81fad187dd6b5889295a1890c5` | 0o600 | `38c6874f302b9b76d9c78adfa80f7d468710557a` |
| `packages/core/src/adapters/node/openrouter/config.ts` | 3172 | `b14711a4086526e309ccf2ed04bc4aa27cc38972d5a25636818397923ab0860a` | 0o600 | `f1a90dced58abae878c62e9349d8025120ca48dd` |
| `packages/core/src/adapters/node/openrouter/execution.ts` | 3711 | `4f6977a3ab2dbd0c861f39c24a1ad4242758f6706baf0a3572de58fec138706f` | 0o600 | `c09c43dc7c4cbd9ec9726a3ee4eccc5b128265bf` |
| `packages/core/src/adapters/node/openrouter/http.ts` | 6692 | `8de96984dc935315ce7b6ebcf00bbf36bf5cc69266e299449262dbbbac97d1b3` | 0o600 | `f4bf87b213decefea98e00028f4d27cc9814fd69` |
| `packages/core/src/adapters/node/openrouter/provider.ts` | 13688 | `1656363bdb117c2aaba51694f67c369bc7a3843e3f2cc167e6f1cd7f221c13d5` | 0o600 | `3051117b5b2f9378419151105f7ad2f77617bf39` |
| `packages/core/src/adapters/node/purgeRunner.ts` | 1202 | `ee5ddf0c958d93343cf343aa3e2e9c35ea6e5d3541be6fc198c56e0b23634a22` | 0o600 | `28c7d45364ebdaae974e178b58d192022b382909` |
| `packages/core/src/adapters/node/zip/ownedStorage.test.ts` | 20521 | `a08866400fff123555fbbc5505978328b44f0cd5901541fdb2761598b706364f` | 0o600 | `c7e135b75a5b628f26681d6ccbf7ffcbe9d4e12d` |
| `packages/core/src/application/account/deletion.ts` | 1542 | `da08ec61121843b2e1734609ece2050aa6c4544b20c81db648af40e55345c021` | 0o644 | `59f4dddb04e6fbd248fa76ca23755cf72b62712b` |
| `packages/core/src/application/account/deletionWorker.ts` | 8150 | `efe1164dbe04e57368955b9b6387c7cca121ae6b11f53774436934766f6cacfb` | 0o644 | `be75a84975b9c2b9cc9cff23b1a0e05c5f803e49` |
| `packages/core/src/application/account/google.ts` | 14366 | `da9cf5609e0a6ef79f4e6631668c99c879ec13574225c95ef85b5243fd174ca3` | 0o600 | `5e550d01a39528c0d7ca809247fa4de2d6455d0c` |
| `packages/core/src/application/account/ports.ts` | 3641 | `a2cab0e0551497dac82a0225013dc6dfb052e53b43081148f27c622158f3c3cf` | 0o600 | `b9ac73515a8044b95e1f389b23b509921b8f280b` |
| `packages/core/src/application/execution/hollowUnitOfWork.ts` | 7354 | `df283ea3e7e50d76f982dbd6848494234502a220b7d16fc4ff1b0abf64a0854f` | 0o600 | `7af495740b9b981ad8004e671b4c56e921a57d3b` |
| `packages/core/src/application/integration/drive/ports.ts` | 6949 | `c6e47c5541c4bd8b9299efa1cf482b5e8484fd9957431fc8d8e4f7225dd8d97f` | 0o600 | `000fa76a69db688d02a8cffd9937986a10f65801` |
| `packages/core/src/application/integration/drive/runner.ts` | 25186 | `d8aca1e28924ec29f5f626bce2f5501c9c4c47489f15652b49747dc47f1f93bf` | 0o600 | `8087de5e4d14b29619f26d61d25ec0e6062fc0da` |
| `packages/core/src/application/integration/openRouter/connection.ts` | 20313 | `3d9ad014cc51d204b190bfa809d08ada1dc266c73d5ed66fbedd3c34fd5a5afe` | 0o600 | `354770a24b8922d6679e58accc3feb255911bb27` |
| `packages/core/src/application/integration/openRouter/ports.ts` | 3421 | `2e09844e0a28e194133ef20aa9269b1f077a9ed3de8ba022bf46a463aa8702b6` | 0o600 | `94f5a28e9e39958ba38d7afeafb596ce4cd363ca` |
| `packages/core/src/application/note/purge.ts` | 14979 | `9cb3636376fd575fb6b6ecf95215fe561675a2e6ecce8a694d509ccae99992f0` | 0o600 | `c78798c76265401f82fb14f30b7917a348ce7b2a` |
| `packages/core/src/application/regeneration/current.ts` | 7956 | `edf3d64c07ecbb6aefb910f4d60d32568972369dff151f4340f7d926012eb443` | 0o600 | `784f87d1afadd48da0f0ff9a6bf5df7da3dd920c` |
| `packages/core/src/application/regeneration/ports.ts` | 1654 | `28f9cb42110e538307f2dc3b0ff3b146c33c3edf78878699836bbe438f03768d` | 0o600 | `74f9e17562d68ba8dca3f3930abaae5ac1502493` |
| `packages/core/src/application/regeneration/read.ts` | 5318 | `a2179df7f048ef0ee9a43b97c0b8a892aa5297252b6a1ba1e50fcb5ebded06f3` | 0o600 | `d60be1873a8ab20358b64e6192adf378b7f1840f` |
| `packages/core/src/application/regeneration/source.ts` | 11589 | `b8b5d5a9ea85036788fe96480d73496a9e64c02d251bc67ac2a96f16c7a883fb` | 0o600 | `223d8a0f07c2c13cb8e4f967e70d6a2f8088c3a3` |
| `packages/core/src/application/workspace/access.ts` | 2693 | `b95a3b77babd2754496d0e72cfeaa107f92a3019453e825809806f99331b4c64` | 0o600 | `eb68fbfd527097b2aa2eb46df5694d6cbefc985c` |
| `packages/core/src/application/workspace/delivery.ts` | 7389 | `78f644005ebfd35573c2fb10d9a904326c066e6b0f152820b94d53f903863fee` | 0o600 | `dc0a133cdedb58d67f2baf5bec11483c2963c6f2` |
| `packages/core/src/domain/account/deletion.ts` | 4492 | `49bdd4e4c17e66b660a22cb12aac40d62967295509b79ba20599bfa3efdd977c` | 0o644 | `2b2a7565f4ebe38ae9ce7be7c1920e06eed48cc0` |
| `packages/core/src/domain/account/ports/accountDeletionRepository.ts` | 2987 | `dfc03e777c476c667edec875dcf82bcc4c9728398415e213e12cb0e03761b411` | 0o644 | `047fc0e4bb502d4f1c9b7496c6cb2d5edff173c0` |
| `packages/core/src/domain/account/ports/accountRepository.ts` | 985 | `18fb8a4498ceedcf0d04985f782d0cc4d921305935c96589f6037283131fc6fd` | 0o600 | `578b4d85652af4c8b91054393a631f47f625b551` |
| `packages/core/src/domain/integration/driveBackupRepository.ts` | 5396 | `399f1b91efb0b1ccf72ac154d8cfef5cb5af0217920fb384c2d66f60943b4fcf` | 0o600 | `1e6fa5f24025268ce46bf0f7f7d82f68cdf3a877` |
| `packages/core/src/domain/purge/entity.ts` | 2641 | `62b20045c30c37ef230f1c6fe84a78b8202ed5a1b52e1f5250bb965e27a9c91d` | 0o600 | `cb7334b0eaaf397c84535ed04069fb8a006ff3e6` |
