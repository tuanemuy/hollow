# P5c-3 S1 F1/F2 独立再検証

2026-10-01T15:53:46+09:00。固定候補 `8902b48bca04ade91696e851bb3b5df707348665`、親 `87055fb7f3d97ffc2d73ef364090a61c46047546`。F1/F2 は解消、S1-A/C は合格。B は不変更受入を保持、D は今回の checks/候補固定/保全の限定範囲で合格。独立直接11対と基点独立純40の借用で一意51対の根拠がある。S2・全P5c-3の完成、UI/実接続成功へ拡張しない。

主報告 [P5c-3-s1-fix](../phases/P5c-3-s1-fix.md) 81行9,928B SHA256 `6a1a060fd1deec3ce038e373c5e566b2c28b5de9eeec7cb896eede4b28938959` を全文確認。基準は [plan S1-A〜D](../plan.md)、IN-07/IM-06、採用保存契約と [前独立報告](P5c-3-s1.md) のF1/F2。goal-implement の独立Verifierとして製品/管理正本を編集せず、修正者とruntime所有を分離した。spec/spec-implement/goal共有APIは不使用。

## 項目別判定

| ID | 判定 | 根拠 |
| --- | --- | --- |
| S1-A | 合格 | SQL3のOLDをDrive限定、terminal local3直接SQLとmachine正規replace拒否、合法Drive継続。正式新0042の成功・旧全値/guard/FK/ledger保持と内部3rollbackを直接再確認。consumed安全解除も同Tx/FKで成立 |
| S1-B | 不変更合格を保持 | read/current/domain/port変更0。基点独立M1根拠を保持。同一app通常順の一部として既B2群も直接成功したが、再設計/reopenではない |
| S1-C | 合格 | consumed専用Drive→redacted保存口が旧typed全値/raw結果を維持して成立。local互換と非local claim/current/read拒否は同appで維持。recipe/quota/本文undo変更0 |
| S1-D | 限定合格 | 新隔離6DB・11直接対、前後seal一致、3path/trackclean、全自己実行終了/保全。規定type03→lint02→format01は主の同候補正式報告を明示借用。独立再実行とはしない |

## 修正コードの独立確認

変更は `packages/core/src/adapters/libsql/` 配下の `migrations/0042_regeneration_source.sql`、`repositories/pdfPreviewRepository.ts`、`__tests__/regenerationApplication.integration.test.ts` のexact3path。新port/domain/別migrationなし。旧0037guard・journal・0042snapshotは不変更。

F1: SQL216/258/300の例外を `OLD.source_origin='drive-record'` に限定した。他のterminal/consumer owner/memory0/全attempt安全/version条件は維持。local→Drive/別binding/早期redaction/直接DELETEは引き続き拒否される。appの合法terminal local3consumerで直接SQL拒否と保存値不変、machine正規replace拒否を独立実行した。queued拒否の代用ではない。合法Drive machine/LLM/PDF cancelled解除も既群で成功した。

F2: `pdfPreviewRepository.ts:239` 以降の既replaceはversion+1を検査→同UoWのcurrent読取/期待版照合→consumed専用分岐。current/valueともconsumed、current Drive/value redacted-null、current/value memory0、付加resultなしを必須にする。encodeした旧/新typed列をsource2/version/updatedAt以外同値比較し、SQL SETはその4列だけ。decodeでtyped値に含まれないraw resultJsonもSETしないため保存される。current owner closedは既decode/consumed型とSQLの終端条件で維持し、jobId/owner/stateの変更を許す一般更新へ広げていない。別stateからconsumedにする既consumeの責務も不変更。

独立F2対は正規binding→preview queued/running/ready→LLM binding/receipt＋既consumeの同Txを通る。current memory50の解放要求を拒否し、既SQLでclosedによるmemory0保存後に再読。stale version false、job/owner/result/requestDigest/cancelGeneration/value memory/別binding/consumed→unknownを拒否。source-only解除の片側commitをdeferred FKで拒否し全旧row同値。attempt unknown、closed未ACKを拒否し、caller-end/ACK成立後のreplace→attempt削除→binding削除だけ同Tx成功。成功後のraw rowは4列以外完全同値、FK0、attempt/binding欠測、redactedからDriveへの復帰拒否を確認した。合成DB列であり実caller終了の証拠ではない。

既consumed raw結果を失う全列SET、旧triggerの緩和、処理再実行、新fallbackはない。追加の製品欠陥/一般化条件は見つからなかった。変更のない型・M1・旧local writer到達については前独立レビューを借用し、広域再監査はしていない。

## 独立実行と借用

新排他0700 root `/Users/hikaru/.local/share/hollow/verification/p5c3-s1-fix-independent-20261001-Fss9xX`。既知Node `/nix/store/4gl9pclv6ygwmgpg1gijza978bqbmpga-nodejs-22.22.3/bin/node`、login:false、逐次worker/writer1。実行は `node <newroot>/run.cjs <label> node node_modules/vitest/vitest.mjs run --config <newroot>/config.mjs <exact test>`。

| label / test（packages/core/src/adapters/libsql/__tests__/相対） | 直接結果 | 終端 |
| --- | --- | --- |
| migration-fix-independent / regenerationMigration.integration.test.ts | 1/1、phase600、fixtureClosed=true。正式0041baseline→修正0042success、DROP後/backfill後/FK段階の3rollback | exit0、exitObserved/stdoutEnd/stderrEnd=true |
| application-fix-independent / regenerationApplication.integration.test.ts | 単一新0042DB、通常順10/10。F1 stage601/602、F2 stage705、Original16/record33、ledger43/FK0 | exit0、exitObserved/stdoutEnd/stderrEnd=true |

両群skip/pending/unhandled0。移行内部3rollbackは別件加算せず、直接11対。基点のdomain28＋DBなしport12はsource不変更・前独立40成功を借用し今回再演0。合計一意51の適用根拠であり、主11や基点50と重複加算しない。既suite全再演や追加smoke/gap probeは0。

正式移行は旧全tableの旧column tuple/旧index/trigger/FK、旧ledger全tuple＋新hash/journal.when exact1/総数+1、明示local2+2、旧identity/ready guard拒否とFK0を確認した。3故障でschema/data/ledger/trigger原子rollback。修正前SQLの成功を修正後へ流用せず、新SQLで直接通した。

主type03→lint02→format01は固定source同値の報告根拠を借用。主のtype01失敗、type02とlint01の順序不備は同報告に保持されており、成功へ書換えない。独立側はhelper構文4本、diff check、前後seal、11対だけ。製品/build編集0。

## 実終了と保全

test子2/各wrapperは自然exit0、stdout/stderr end、child close callback到達を観測。migrationは全接続finally close。appは共有DBをafterAllで一度closeし、先頭7case closed=false/末尾3trueを送出時snapshotとして保持した。10件別DBのclose成功ではない。afterAll末尾観測・unhandled0・worker自然終了/両pipeが共有DB終了根拠。各pipe個別close boolやdriver独立ACKを捏造せず、再openなし。前後sealの同期git子各4とseal本体も終了済み。

予約root192MiB/6logicalDB112MiB（baseline16/success16/rollback3×16/app32）、helper8/TMP8。末尾metadataはDB19,091,960B、TMP0、other2,543,212B、regular285/special0、logical6。個別main/WAL/SHM合算はbaseline/drop/backfill各2,084,864B、success2,879,696B、fk2,686,056B、app7,271,616B。全予約内。walkerは開始/末尾観測でありhard事前制限とはしない。

全DB/results（故障注入rollback cloneを含む）を保持、失敗対0、再利用/上書き/削除/追加DB0。原本file/鍵/HTTP/native/Chrome/build/外部接続0。opaque/auditは予約外なので追加0。広域PID scan/killなし。

## 前後候補指紋

前後HEAD完全ID一致、trackedclean、diff --check0。前後seal JSON全体一致、変更3/削除0。sourceはrepo相対ASCII順 `{path,bytes,sha256}` 配列。固定DDL85は親migrationsの旧journalと変更0042SQLを除き0042snapshotを含む。旧84集合とは分離する。lock/dist/entry/shutdownは基点独立の値に一致。

| 集合 | count / bytes | SHA256 |
| --- | --- | --- |
| candidate source | 1284 / 18,179,358 | b2122353cc38d57c6a861dc30ba060a9145b7750ea3b498ee184cd026b418e6e |
| 固定DDL85 | 85 / 7,780,637 | 8ef38da718d6e40363d3f2056f2b4fe3fadf32eb011d954ea47aa402d44e9700 |
| 0042SQL | 1 / 35,571 | 26a033d7f028b64985c9b3aba03b5093de301face173e7cf5e2d58690fe26cae |
| pdfPreviewRepository | 1 / 16,851 | 9b9bdcbe200e194867a25528859a3a93dd069684773b76fee2876d72959727ad |
| application test | 1 / 48,736 | 77818028ad8d54ca953ae8f80e7db7169bf613d19eb257fe9670a94bf0f4d266 |
| lock | 1 / 328,991 | 037740a80c95f580b0287c63a072862a0ba646a79133a0d30f048dc1b2bc5131 |
| dist相対ASCII | 9116 / 223,796,694 | 4f1bc6cf7df2198c4628fbdfd898b42f4707f0cd054594b1c22606f841ed40c6 |
| server.node.js | 1 / 3,732,860 | e159ac0c3aadc6206cc0ca8f60af06a75b4154ae163652ff010e88a534edb519 |
| nodeShutdown.mjs | 1 / 757 | 2de9a259cd47304c93dfe7a8086d9642e9def0ed55a5bd2401d99ffd69cd940c |

## 公開helper exact表

自身前独立報告末尾Uzwhheのexact4だけmetadata regular/non-symlink/bytes/fullSHA一致を確認。自身全文既読同一sourceとしてEOF読解根拠を保持し、新rootへapply_patch適応した。差はconfigのroot、sealの親基点/固定DDL除外、末尾改行のみ。既wrapperの112MiB容量/既知Node、before/after別結果、reporter snapshot条件は維持。旧場所でrun/importしない。smoke参照はincludeに残るがファイル未作成・今回explicit2test指定で実行0。

以下は新Fss9xX root直下の公開sourceのみ。DB/resultsを再利用許可へ含めない。

| basename | bytes | SHA256 |
| --- | ---: | --- |
| run.cjs | 5375 | e72d25cdcb4b806372f6e660e2401f93c296b47933fad2ee839f0eafe0c1dd49 |
| reporter.cjs | 1593 | 418dff0906475c7f5c0b6915e3dcf0d363bb9f9fb279f74ed685bd7e7dc2dbd6 |
| config.mjs | 526 | 5148dcbd5ad06e602d6adc4a02d5e9483af605def636f661633477cd3dd6f38d |
| seal.cjs | 4569 | f21b6b037cdf5d70ec12f64304fb86d8489d4bf64ee6424f956344ba4bc36ad3 |

## 未検証と返却

実stage lease/native caller/shared lane/memory service/worker/全purge/UI/実GoogleはS2以降の未実装/未検証。今回のS1合格に追加しない。bundleは旧4b39957のままでS1や修正を搭載しておらず、同bundle UI根拠なし。既Drive UI工具失敗は別報告の未完を維持する。

新欠陥なし。F1/F2の旧不合格報告は保持し、今回の修正確認として分離。報告EOF確認後、文書を含む全read/write/runを停止してManagerへ唯一runtime所有を返却する。S2へ自動移行しない。

EOF
