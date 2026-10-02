# P5c-3 S1 migration-03：限定静的診断

2026-10-01。判定は「ledger比較器具に確定した不整合があり、Manager採用の最小補正が必要。migration-03の個別実失敗位置は欠測であり、0042の動的合否は未確定」。DB probe・失敗DB再開・test再実行は行っていない。DDL全体やS1-A/B/C/Dを受け入れた報告ではない。

主の全製品/test/helper書込・実行停止をManagerから受領後、指定公開sourceと報告だけを読んだ。基点HEADは `fd4a2476a60a3ad4db3da2ac92235b0334e7e895`、S1は未commit候補。goal-implementの独立Verifierとして診断し、製品・管理正本の変更、source/test/helper編集、import/build/test/DB/runtime/HTTP/browser、旧private/actualfresh/D01操作は0。今回の編集は本報告だけ。

## 対象同一性と根拠区分

| 公開対象（packages/core/src/adapters/libsql 相対） | bytes | SHA256 |
| --- | ---: | --- |
| migrations/0042_regeneration_source.sql | 35562 | 18197f3c171c5ad1116852a078d03e4c870ec9b5e3c5ce28c71115f810a71904 |
| __tests__/regenerationMigration.integration.test.ts | 6855 | 70f8d7b351c99683f8b5c739c288ec5abea9465783b40ef7b11ddf08e6ca42a9 |
| __tests__/regenerationFixtures.ts | 10597 | 634323c3e79243b2a4681b13ae61e0fbb3cbc172146c3e9c06d6819f566eefa2 |

上記をbytes/fullSHA照合し全文読了。[主報告](../phases/P5c-3-s1.md)、公開0037・journal、installed `drizzle-orm@0.45.2` の `libsql/migrator.js` と `migrator.js` の必要箇所を直接読んだ。installed依存は読取のみでimportしていない。

Manager伝達の実行事実は、migration-01/02のfixture失敗、migration-03のseed/FK通過、成功cloneでmigrate await終了後のASSERTION、finallyによるstage2への上書き、fixtureClosed=trueと既知child/両pipe終了。これは主からの借用で、独立DB観測ではない。主報告本文の「baseline-v3未実行」は古い時点の記述であり、今回の最新実行到達はManagerの停止通知に基づく。失敗DB・既結果の再読で補完していない。

## 確定した比較器具の不整合

[test](../../packages/core/src/adapters/libsql/__tests__/regenerationMigration.integration.test.ts:118) の成功比較は、旧tableの全列を列順でORDER BYし、ledgerだけ `values.slice(0,-1)` を旧全値と比較する。ledgerの列はid/hash/created_atである。ここには「新しい移行行がその並びの末尾に来る」という実装上保証されない前提がある。

installed Drizzleの公開sourceは、ledgerを `id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric` で作り、INSERT対象をhash/created_atの2列だけにする。SQLiteのINTEGER PRIMARY KEY rowid aliasを指定するDDLではない。したがって通常のid NULL列ではORDER BYの次キーがhashとなり、journal時刻順・移行順にならない。Drizzle自身の最新移行取得はcreated_at DESCであり、testの全列順とは異なる。

公開SQLから計算した0042 hashは上表の `18197f…`、旧0003は `faf47b20d6d1e4582a0bcc81b5f16a02db4177bfbdd7c1dbe43963492c1e1c07`。ほか旧0001/0025も0042より大きい。fixtureの成功clone用folderはSQL本文をそのままコピーし、fault=nullではhashを変えない。installed `readMigrationFiles` はその本文全体のSHA256をledger hashに使う。従ってid NULLの通常経路なら新0042は末尾ではなく、sliceは旧行を除外して新行を比較集合へ残す。正しく移行されたDBでもこのassertionは失敗する。

これはsourceだけで確定できるテストの欠陥である。一方、保存されたphaseが上書きされているため「migration-03が必ずこのassertionで失敗した」という個別実因果は確定しない。対象DBの実id値や全行同値を読み取ったという主張もしない。

## 最小補正（Manager採用済み、未実装）

1. 新ledger行を、公開0042 SQLから算出した期待hashとjournal idx42の `when=1790985600000` の組でexact1件として検査する。
2. 総数が旧総数+1であることを維持し、その新行1件だけを除いた旧全列tuple（idのNULLも含む）を既snapshotと同じ安定順で完全比較する。件数だけ、hash集合だけ、最新1件だけの弱い比較に変えない。
3. 期待行が0件/複数件、旧行の欠損・重複・変更、別の余分行があれば不合格を維持する。新行を位置・最大hash・暗黙idで推測しない。
4. `regenerationStage` の詳細phaseと、DB/childのclosedを別に保持する。finallyで現在stageを一般値2へ戻さず、失敗直前の有限phaseを保存する。比較群にはledger/旧table値/FK/旧schema/明示local/旧guard/FK末尾の固定enum又は有限番号を置く。table内容・row・stack・秘密を出力しない。

これは既受入条件の観測器具を正す差であり、新条件追加ではない。既migration-03結果のstage2/ASSERTIONを遡及書換えしない。修正・新cloneでの実行はManagerが主へ別途委譲する。本Verifierは修正していない。

## DDL側について直接確認できた範囲

0042の追加列/backfill周辺と全SQLを読んだ。新列だけのUPDATEより前に、許可されたexact3（llm_conversion_identity、llm_pdf_preview_identity、llm_pdf_preview_ready）をDROPし、backfill後に再作成している。公開0037と0042からexact3のCREATE文を抽出したread-only diffは差0だった。移行本文末尾には `pragma_foreign_key_check` を使うCHECK assertionとその除去がある。fixtureのfaultはDROP後/backfill後/FK assertion後へ注入する。

成功比較は旧tableの旧列だけをSELECTし、新source列は別にlocal-original/binding NULL/memory0を検査する。FK比較も新source_binding_idの追加だけを除外して旧FKを比較する。これらの目的は正しく、今回のledger位置仮定を除く理由にはしない。旧triggerの恒久緩和や0042 SQLの変更を、現在のASSERTIONだけから提案しない。

ただし、exact3の公開定義一致はDBに保存されたschemaの一致とは別であり、ALTER/相互deferred FK/即時trigger/backfillの動的成立・旧全値保全・3故障rollbackは未検証のまま。rollbackループは今回未到達なので合格へ借用しない。source-memory/redaction/候補認可の全実装レビューも本診断の対象外である。

## probeと終了

最小修正の判断に追加DB probeは不要とManagerが判断したため、probeの作成/実行/DB接続は0。失敗DBは主の保全状態を維持する。個別因果を今すぐ確定するために新DBや再bootを要求しない。

本報告の固定後、全静的read/writeを終了してManagerへ返却する。以後、候補識別と別依頼があるまで停止待機。製品・DDL受入や全体goal完了の判定は行わない。

EOF
