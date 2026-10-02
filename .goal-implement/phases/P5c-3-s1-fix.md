# P5c-3 S1 F1/F2 修正

完了候補 `8902b48bca04ade91696e851bb3b5df707348665`（2026-10-01T15:47:47+09:00）。基点 `87055fb7f3d97ffc2d73ef364090a61c46047546`。独立 reviews/P5c-3-s1.md 全108行を確認し、F1/F2を修正した。主直接11対（migration1＋同DB application10）が成功、純不変更40を明示借用し候補の一意根拠は51。S1-A/Cは修正合格候補、Bの既受入を保持、Dは修正後checks/固定済み。独立再受入は未実施。S2案は未採用・非着手。

新root `/Users/hikaru/.local/share/hollow/verification/p5c3-s1-fix-20261001-TQdy1D` は排他0700。予約192MiB、6logicalDB112MiB（baseline16/success16/rollback3×16/app32）、helperlog8/NodeTMP8。原本file/鍵/HTTP/native/Chrome/build0。失敗DB/resultsの再利用/上書き/削除なし。旧private/DB/results/cache/actualfresh/D01は非操作。

## 変更範囲

- `packages/core/src/adapters/libsql/migrations/0042_regeneration_source.sql`：3 source_update例外のOLD originだけdrive-recordへ限定。旧0037、versionCAS、memory/consumer/attempt guardは不変更。
- `packages/core/src/adapters/libsql/repositories/pdfPreviewRepository.ts`：既replaceにconsumed→consumedのDrive source解除だけを追加。他typed列同値、current/value memory0、正規version+1。SQL SETはsource2列/version/updatedAtだけ、raw resultJson/consumed job/receipt/ownerを保存。新port/domainなし。
- `packages/core/src/adapters/libsql/__tests__/regenerationApplication.integration.test.ts`：既対内へterminal local3consumer直接SQL拒否とmachine正規replace拒否。新consumed Drive対を同DB通常順で追加。既fixture不変更。B read/current/sourceは変更0。

## 実行前 fixture 前提

新F1は既成功対のlocal terminal/closed/memory0を使い、queued拒否で代用しない。SQL/正規replace拒否後の全行同値を確認する。新F2はnote35/Original1/record1を増やし、最終期待をOriginal15→16/record32→33へ明示更新する。

F2は正規binding→queued preview同Tx、running/active/memory50→ready/closed（current note/epochと期限一致）、同recordに別LLM bindingとfixed pdfProof/ownershipGeneration1を持つconversionをINSERTし、既consumeを同Txで呼ぶ。旧consumeのexact result/source/actor/note/epoch条件を一致させる。consumed/memory50からsource解除拒否、closedによる正規SQL memory解放後に版を再取得する。試験中source attemptはqueued→active→unknown→closed(caller-end/未ACK)→ACKという既型の順序。各未完で拒否、最終attempt→binding削除をsource解除と同Txで行う。source解除だけでcommitする負例もdeferred FKで拒否し、旧行全値を保存する。

負例はstale版、job/owner/result/requestDigest/cancelGeneration変更、value memory非0/current memory非0、別binding、consumed→unknown、source attempt unknown/未ACK。成功は4列以外raw全値同値とFK0。SQL入力は自己syntheticだけ、raw rowを出力しない。stage701–705とF1 601/602で有限失敗位置を分離する。

## 検査履歴

新reporter smoke1成功（DB0、子自然exit/両pipe end）。type01は追加負例配列のliteral widening 1診断TS2345、as constで型を保存して修正。type02成功、lint01成功。ただしtype02終端確認前にlint01を起動したため、この並行組を規定順の根拠とせずtype03→lint02→format01を改めて実行し成功した。全旧labelを保持する。

metadata初回のBSD stat書式がGNU statに不適合だった準備失敗1件を保持。正しいstat -cでregular/nosymlink/bytesを確認し、raw stack出力なし。旧公開helperは独立report exact4（run/reporter/config/seal）のbytes/fullSHA一致と全文EOFを確認し、新rootへapply_patch適応した。旧場所実行/import0、旧参照先private追跡0。

## 修正後の直接結果と借用

| label | 結果 | 適用範囲 |
| --- | --- | --- |
| type03→lint02→format01 | 全成功、子自然exit0/両pipe end | 規定順。既warningは非変更、所有外整形差0 |
| migration01 | 1/1、phase600/fixtureClosed=true、skip0 | 新0041baseline→新0042success、旧全値/旧index-FK-trigger/ledger exact追加1、明示local2+2、旧guard拒否、FK0。内部3rollbackは別対に増算しない |
| application01 | 10/10、同一新0042DB/通常順、skip/pending/unhandled0 | 既9群＋新consumed1群、既群内F1負例。F1 stage601/602、F2 stage705まで到達 |
| seal01 / git diff check | 成功 | 基点blobとのsource/固定DDL/lock、旧dist/entry/shutdown一致。変更3path/削除0 |

F1は3consumerの合法terminal local/ownerclosed/memory0に対し直接SQLのredacted更新を拒否、machine正規replaceでも拒否し、保存値不変。合法Driveのmachine/LLM/PDF cancelled解除は既群再実行で維持した。source交換/別binding/早期redaction/直接DELETE・未知owner/未ACK/memory所有の旧負例も同appで成功した。

F2はconsumed/memory50拒否、stale版false、job/owner/result/requestDigest/cancelGeneration/value memory/別binding拒否、consumed一般遷移拒否、unknown attempt/closed未ACK拒否、sourceだけ解除する片側commit拒否を直接確認。ACK後の正規replace→attempt削除→binding削除は同Txで成功。全row比較でsource2列/version/updatedAt以外不変、consumed state/job/owner/raw resultJsonも保持、FK0。結果内容をログへ投影していない。旧0037trigger緩和なし。

Bの候補ページ/認可は不変更で旧受入を保持。今回は単一app通常順を保つため既Bの2群も再実行したが、Bを再設計/reopenしたものではない。純domain28/DBなしport12はsource不変更・基点独立40成功を借用、今回実行したとはしない。新51と基点50、移行内部3rollback、工具smokeを重複加算しない。旧LLM/PDF suite全件実行の主張なし。

## 終端・保全・制限

migration/applicationと最終checks/sealの子は自然exit0、初回type01は自然exit2。全既知子のstdout/stderr end、wrapper close到達を確認。migrationは全接続finally close、appは単一共有DBをafterAllで一度close。reporter先頭7caseのclosed=falseは送出時snapshot、末尾3caseはclosed=true。10件の個別DBclose成功とはしない。afterAll後末尾観測＋unhandled0＋worker自然終了/両pipeで共有DBの終了根拠とする。追加再openなし。

seal01末尾容量はDB19,091,960B/TMP0/other2,543,447B、293 regular/特殊0。logical6（baseline/success/rollback3/application）で予約内、全DB/結果を保持し削除0。容量は開始/終了walkerによる観測で、全I/Oのhard事前制限ではない。旧root/actualfresh/D01は非操作。HTTP/socket/native/input buffer/鍵/原本file/workerサービス/Chrome/boot/buildは作成0。opaque/auditは予約外のため追加0。

## 公開指紋

sourceは既scopeのrepo相対ASCII順 `{path,bytes,sha256}` 配列。固定DDLは基点migrationsの旧journalと今回変更0042SQLを除く85file（0042snapshotを含む）、全同値。journalもsource差3path以外として不変更。旧84fileだけの集合hashとは別の集合である。

| 対象 | count / bytes | SHA256 |
| --- | --- | --- |
| 基点source | 1284 / 18,166,978 | 7f4eab281445292248abfd41b53f0edaf19f3bec727d07b92e995fea4cdc4ccc |
| 修正source | 1284 / 18,179,358 | b2122353cc38d57c6a861dc30ba060a9145b7750ea3b498ee184cd026b418e6e |
| application test | 1 / 48,736 | 77818028ad8d54ca953ae8f80e7db7169bf613d19eb257fe9670a94bf0f4d266 |
| 0042 SQL | 1 / 35,571 | 26a033d7f028b64985c9b3aba03b5093de301face173e7cf5e2d58690fe26cae |
| pdfPreviewRepository | 1 / 16,851 | 9b9bdcbe200e194867a25528859a3a93dd069684773b76fee2876d72959727ad |
| 固定DDL基点/修正一致 | 85 / 7,780,637 | 8ef38da718d6e40363d3f2056f2b4fe3fadf32eb011d954ea47aa402d44e9700 |
| lock不変 | 1 / 328,991 | 037740a80c95f580b0287c63a072862a0ba646a79133a0d30f048dc1b2bc5131 |
| dist不変（dist相対ASCII） | 9116 / 223,796,694 | 4f1bc6cf7df2198c4628fbdfd898b42f4707f0cd054594b1c22606f841ed40c6 |
| server.node.js不変 | 1 / 3,732,860 | e159ac0c3aadc6206cc0ca8f60af06a75b4154ae163652ff010e88a534edb519 |
| nodeShutdown.mjs不変 | 1 / 757 | 2de9a259cd47304c93dfe7a8086d9642e9def0ed55a5bd2401d99ffd69cd940c |

既sealの4canonical投影をそのまま保存し、上表は旧報告と同じdist相対ASCIIだけを用いた。build0なので旧distにS1/今回修正は未搭載、同bundle UI成功とは称さない。修正0042のmigration根拠は今回11対の直接結果であり旧SQL成功を流用しない。

## 新rootの公開helper allowlist

prefix `/Users/hikaru/.local/share/hollow/verification/p5c3-s1-fix-20261001-TQdy1D/`。下記regular/nosymlinkだけ。旧独立exact4全文から、新root/path/基点/固定DDL集合/不要label特例除去と末尾改行だけを適応した。smokeは新小source。結果/DB/privateをallowlistに含めない。再利用はRootの別委譲後、別新rootへ適応し旧場所実行0。

| basename | bytes | SHA256 |
| --- | ---: | --- |
| run.cjs | 5284 | d67f432b56f414a191b9d835dd3353ad5c518224003702d7858c9c592a29c2ea |
| reporter.cjs | 1593 | 418dff0906475c7f5c0b6915e3dcf0d363bb9f9fb279f74ed685bd7e7dc2dbd6 |
| config.mjs | 502 | f7938314f6b46b576e43ab214a58fea3b38b4c7f96e9e3e23b8e0d5737caba21 |
| seal.cjs | 4569 | f21b6b037cdf5d70ec12f64304fb86d8489d4bf64ee6424f956344ba4bc36ad3 |
| smoke.test.mjs | 159 | 08af7fcc477e5302bc1a3f057e2749297961ed104d9adfd6e9f57f565c9841d3 |

candidateは3製品/test pathだけをcommit、管理/proofは除外。tracked clean、`.goal-implement/`だけ未追跡。補助を起動していない。本報告EOF確認後は文書を含む全read/write/runを停止し、全製品writer/自己環境所有をRootへ返却する。

EOF
