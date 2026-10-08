# 受入S4のmain統合完成候補

固定日時: 2026-10-06T06:31:26+00:00。状態: 統合候補固定、独立integration review待ち。

- candidate `79ef126edd5d3440cde20dbe8fd372e7235010c5` / tree `8e7d976977a094e360a9d97e48e7dd3588337077`
- parent `b6e567b24e24c78e26bb1bbb147bdf0fc6588bd3` / tree `fa7f4fb746268b7d6ada09ff3264e73800634310`
- accepted S4 `4cba22b7a62121b32bf72964cd62c15a9774c26f`、common `c2a3d45f1097533c6344346aca303dc1d2aef368`
- exact target22 / accepted22末尾Gitblob全一致 / outside22 tree差0 / Parser2 SHA保持 / trackedclean
- whole main typecheck→lint:fix→format、順序どおり各実exit0。lint既存346warning/78info・unsafe suggested276、No fixes applied。format1200files、No fixes applied。test/runtime/build/browser/DB/新validationroot/probe0。
- 本reportのみ新wx600。全main/source/git/publicreader/writer停止しRootへ所有権を返す。S5製品着手0。

## 採用基点と適用

RootがTEXTmini候補の全reader/writer/runtime停止後にmain専任writerを解放した。TEXTminiのケース0/原因unknown/normalUI0とfailedroot非操作は維持した。統合proposal29736B/SHAe404b65981180f68f176b345c1bf04bc84c5d770daea7a3c6415a8aabf289f6fの受入表だけを採用。最初にmain HEAD/cleantracked、22targets commonblob、Parser2 SHA/bytes、proposal全文SHA、AGENTS内部linkを別publicprecheckで確認し全PASS。新S4file3のexact公開target不存在も衝突防止として確認した（validationrootのprobeではない）。

受入末尾netdelta22だけを`git restore --source accepted --worktree -- exact22`で適用した。途中commitや旧helper/生成型/依存link/検証rootをコピーせず、acceptedsourceのGitblobを正規main filemodeへ復元。全check後にexact22をstageし、hooks無効の統合commit1を作成。22files +5268/-212。accepted22blob/mode再照合、親一致、outside22差0、Parser2保持、trackedcleanをcommit後も確認した。

main tracked treeは1460entries=1459regular+唯一AGENTS.md→CLAUDE.md内部link。全tracked regularのGit100644→actual644、Git100755→actual755を照合し、未知trackedlink/special0。隔離S4 treeの600/700をmainへ持ち込んでいない。package/lock/DDL/server.node.tsを含むoutside22はGit tree上で完全不変。untracked/privateを探索・コピーしていない。

## 規定checks

cwdmain、各単発環境 `pnpm_config_verify_deps_before_run=''`、公開CLI argv `pnpm --config.verify-deps-before-run=false <script>`。main/global設定変更0、自動install/download入口を無効化し依存変更0。PATH/env全一覧は出していない。

| check | 実結果 | 変更 |
| --- | --- | --- |
| typecheck | exit0。root tsgo→4workspace packages/core/apps/web/infraAWS/CF完了 | source型修正0、新CF生成0。現main既公開生成型で成功 |
| lint:fix | exit0、1200files、346warning/78info、No fixes applied | safe/unsafe修正0、既診断を今回統合不備へ補完0 |
| format | exit0、1200files、No fixes applied | outside22 format差0 |

規定checkの各結果をinspectした。既受入S4 unchanged suites/Parser runtimeは再演していない。正常実装・寿命・DB根拠は受入済みS4 A–Fを借用し、この候補はsource結合/whole型/規約/末尾blob同一性を新直接根拠にする。新main compiledB/UI/実運用への成功はまだ主張しない。

## exact22 manifest

列挙順はGit差分順、manifestレコードは `[path,Gitmode,Gitblob,bytes,SHA256]` のcompact JSON。SHA256 `f19cd59f33402b451769f710f6fb01d4f8a2cdc32404bfc53a28ff2f6d27e3df`。全22mode=Git100644/actual644。

| path | bytes | accepted/integrated Git blob | content SHA256 |
| --- | --- | --- | --- |
| `packages/core/src/adapters/libsql/__tests__/llmInputStage.integration.test.ts` | 49710 | `b994ab269e79cad825df37047dcca6618f2785c7` | `55694d1affb6174aee6ebe8569f0b70a9d4d1552a38d546289b2680c218c9727` |
| `packages/core/src/adapters/libsql/__tests__/llmLocalFormats.integration.test.ts` | 60421 | `876adab85daa23b47e4f6c89bae4eea55bc36336` | `874800a10b8f5b35a452f6c7247aeade20cab814c2b777882f39c496493c3b32` |
| `packages/core/src/adapters/libsql/__tests__/llmLocalFormatsNative.integration.test.ts` | 50648 | `d0dd44d4736ea07cbaf0e849c2cdc9748d908dc8` | `2474b6975a7bc5a8c0a2a4354239dffdbb16476c107cbd8542542d49d83c9ae2` |
| `packages/core/src/adapters/libsql/repositories/llmRepository.ts` | 39043 | `839a60bbf395604abad78dcf03e90c1f31df56b7` | `13335b88bc15effd4a19e22790e103e966a33f5c7849cb1f29eac5606fd75b62` |
| `packages/core/src/adapters/libsql/repositories/pdfPreviewRepository.ts` | 20018 | `86b5406303e97696089f26cc90793507744d4bb5` | `c48cbd89d820fbc1fcaf412345095362359f46f4a9765833015d4b8b69f83fc5` |
| `packages/core/src/adapters/node/llm/config.ts` | 3118 | `21006854794c22e0a94b8e371acda825ce7850e1` | `71e2b8d6d7973b3fc7f252b98a2b0957ea54b312baafddcbf5d3737fe2dda255` |
| `packages/core/src/adapters/node/llm/imagePreparer.ts` | 10621 | `e5e045418a6de15576871c6529aa2adc5bed082b` | `013a96b26353a9579ecb7e3cc07b3675a5bf7194296a402f11fa93ce5b0ffe9b` |
| `packages/core/src/adapters/node/llm/pdfClassifier.ts` | 1908 | `aa8b8f08db791b75ec424d46b86a52a98dc8937a` | `86d950ff87d3a41fba7fe6c67ef5bca7d57824aca46c99f8713957f4a33f15a5` |
| `packages/core/src/adapters/node/llm/pdfPagesPreparer.ts` | 11914 | `b8e3ff65995ecdc7a5d6d74a1d08d91a73f836ab` | `adc9fb54dbb3f1ee09e9c52a9f8cbc1741b856083f6a2897c3cadcdca0de12ec` |
| `packages/core/src/adapters/node/llm/runtimeOwnership.ts` | 18581 | `c2feeca992fe6501baf3c7265698418818428034` | `c8c9e40763fe4742e981b5a52811257a45e582c67404ce4e2166713972ef495f` |
| `packages/core/src/adapters/node/regeneration/input.ts` | 27320 | `57704db4166b917e9518ff0a7bd0a2f2775a719b` | `4c17625f85f756446f1a722b94c50d17d7d334efa0494ca1419df900253e5210` |
| `packages/core/src/adapters/node/regeneration/memory.ts` | 14291 | `840322f07c78ed3be07306d7e83248d5a0756111` | `27a6318f97a0ea4d703b5dd34e37df761e7727e8ae0c63adfa624c1c2025ae9e` |
| `packages/core/src/application/llm/current.ts` | 4253 | `702d637a55bacd161702ec5b3c2fd273b8011b83` | `7f31a9c440bb07e1cddc00c0dc574144334fa7e50dfaa91c3a19d1332d0c550b` |
| `packages/core/src/application/llm/inputStage.ts` | 3675 | `9aefbe55232cabc9ed70d0c438b6900cb5c13623` | `58ed11dec749e0cf5616d1bcbb1bbfe141ee0797dbf3f06195d54da94ede75f2` |
| `packages/core/src/application/llm/pdfClassificationPorts.ts` | 944 | `42351d7892ef64f9562448cd3b6fa33c15ec72ba` | `44b55d3c404a9a28c9e71cabdb9af0fc7dc9a158de8f6dd72044b70e215e8143` |
| `packages/core/src/application/llm/pdfPreview.ts` | 22894 | `562233e4d2509c0dba8d738771b9e5a7ebf8260a` | `31f665724c2a4d712b93dd05ace2e91855ac05c897defd891e88f1d36e8205f6` |
| `packages/core/src/application/llm/ports.ts` | 10214 | `143e893bf5853afbb4b4c6bc8d2e690d7bf29b05` | `48dc60e09ff1001c9af41e04e94b9a51392bc69b1c28702d5acea598f656529e` |
| `packages/core/src/application/llm/services.ts` | 1218 | `888c774e8aae06fce42a6ba3f1348e4e828de13e` | `75a4324f195ab2b17410a9a6efd92063a9382266781cfe9b09c16abd621047c0` |
| `packages/core/src/application/llm/worker.ts` | 32250 | `8bda8245b7045d02bcf2241df2c8106d1f59f4b9` | `ea27b21bcc081d0d256b9dbbe3f0f714cc2a2272fb39b9bb28af8e06642b247d` |
| `packages/core/src/application/regeneration/localFormats.test.ts` | 15484 | `b2433fe1aae8c757dd1c46e2e73b5ebbc4c09248` | `bfb47f9cd438e45c1937c65e254b1ba5977d9238962eaa554546d7b34d497424` |
| `packages/core/src/application/regeneration/services.ts` | 6634 | `cfc0abed366e0e78e320f91631efd7bed35cc0ad` | `85f69a8759e2e524f6bde100632b1afb74d5bb0862c39162a1319bbc38a45139` |
| `packages/core/src/domain/llm/pdfPreview.ts` | 8721 | `273321d06dac01ba9184022d5aad8ffcf694a3ba` | `d356c2144d536c3edeb665c7b403b31ba0ed3fbab9d041c2a8f0c71fcb0f3ab7` |

## 維持したParser2

| path | bytes | content SHA256 |
| --- | --- | --- |
| `packages/core/src/adapters/node/import/documentExtractor.ts` | 10244 | `2a3ca8d16a9e67ea9c3f262712c93b8fdc0544638d51ee26043a25155767053f` |
| `packages/core/src/adapters/node/import/__tests__/documentExtractor.test.ts` | 22526 | `51774d8b6db91cb5b5b9cfd4ebf0ba7a8ffbd7cd7210722a37e032a853283b2e` |

両方のSHA/bytesは最初とwholechecks後に直接照合。outside22 tree差0により統合commit後も親のGitblobを保持する。

## 引渡しと未完

Root所有の管理文書/criteria/goal APIは変更0。S4 accepted A–Fを継承し、新S5採用条件はここで実装しない。UI currentB/旧B、全accepted/failed private validation roots、D01/actualfresh/音声/実外部へのread/stat/hash/import/copy/reuse/接続0。新browser/DB/Worker/Native/test/build/runtime起動0（規定静的check用toolの実完了は別）。

独立Verifierへcandidate親/22acceptedblob/outside22/Parser2/main正規mode/型・規約check結果を渡す。新compiledcandidate/buildやUI同bundleは別採用/検証が必要。本report固定後は全main/source/git/read/write停止。追加agent/spec/spec-implement/newgoal0。
