# P5b-2b0-D 限定再構築 probe

## 結果

2026-09-28 08:36:00 JST、Node 22.22.3 / 既存 libSQL client の自己隔離 DB で、正常移行・途中 SQL 故障・末尾 FK 故障の 3 シナリオ、44 検査が初回成功した。実行は exit 0、未回収 exec 0。製品変更・製品テスト実行・本体 DB 接続はない。

この結果は P5b-2b0-D の C 案の技術資料である。正式 migration、共有 port、recipe の最終設計は未採用であり、独立受入ではない。

追加 run02 は 08:42:40 JST、既存 repository / UoW / usecase の 20 検査が初回成功した。以下の初回 44 検査とは別の根拠であり、追加範囲は末尾に記す。

## 所有範囲と参照

- 専用 root: `/Users/hikaru/.local/share/hollow/verification/p5b2b0-probe-20260928-TwAYeL/migration/`。排他作成した 0700 領域。
- run01 の公開 prototype: [probe.mjs](/Users/hikaru/.local/share/hollow/verification/p5b2b0-probe-20260928-TwAYeL/migration/probe.mjs)。追加 run02 の script は末尾に記す。
- 生成 SQL: [candidate.sql](/Users/hikaru/.local/share/hollow/verification/p5b2b0-probe-20260928-TwAYeL/migration/run01/candidate.sql)。公開 schema のみを含む。
- 集計: [results.json](/Users/hikaru/.local/share/hollow/verification/p5b2b0-probe-20260928-TwAYeL/migration/run01/results.json)。boolean / 件数 / 時刻のみ。SQL エラー本文・保存行・本文は出力していない。
- `run01/{normal,sql-fault,fk-fault}.db` は本 probe が新規作成した合成 DB。実データのコピーではない。
- 読取根拠: `packages/core/src/adapters/libsql/migrations/0034_normal_thunderbolts.sql`、`llmSchema.ts`、LLM repository、`application/llm/current.ts`、固定 libSQL client の公開 `migrate` API と実装、既存 Drizzle migrator。

accepted `3650ec6` の製品・依存・既存テスト・管理正本・保全物・旧 proof は変更していない。外部通信、credential/helper/秘密の読取は 0。

## prototype の差分

変更対象は `llm_conversions` だけである。

- `source_format` の CHECK を旧 `text/html/markdown` から `docx/xlsx/pptx/pdf/image` を含む集合へ拡張する。
- nullable `preparation_version INTEGER` を追加し、値は NULL / 1 / 2 に限定する。旧行は NULL のまま保持し、旧 NULL を V1 と解釈する候補である。
- `preparation_version` を既存 immutable trigger に追加する。`prompt_version=1` は変更しない。
- 旧 33 列を明示した INSERT SELECT でコピーする。影響する 5 trigger と 4 index を同じ transaction 内で復元する。他テーブルを再構築しない。

公開 `Client.migrate` の専用接続・FK 一時無効・transaction・失敗時 rollback・FK 再有効化を使った。末尾に `pragma_foreign_key_check` の結果を CHECK 付き一時 guard 表へ流し、違反があれば commit 前に失敗させる。移行台帳への追加も同 transaction の最後に置く。単独 `foreign_key_check` を読むだけで成功扱いにする方式ではない。

## 合成 seed と保持検査

各 DB に現有 migration 一式を適用し、SQL 制約に適合する 10 件を保存した。queued / preparing / dispatching / response-ready / finalizing / terminal、active / unknown / closed、成功・失敗・取消・配送不明を含む。quota の reserved / consumed / released、dispatch の prepared / intent / response / scrubbed / not-sent / unknown、本文 undo の revision 参照を持たせた。

これは schema 用の合成行であり、各状態を worker の全遷移から生成した fixture ではない。`conversion_jobs` は queued の合成行で、LLM 行の存在による機械変換 claim 除外を調べた。実 renderer・provider・worker を起動していない。

| シナリオ | 故障点 | 観測 |
| --- | --- | --- |
| 正常 | なし | 旧 33 列全値、他全テーブル、旧台帳行、全 PK / FK、既存 index / trigger を保持。新台帳 1 行のみ追加。旧 recipe は全 NULL |
| 途中 SQL | 旧表 DROP 後・新表 RENAME 前の存在しない合成表参照 | 指定 statement index で拒否。全 schema・全行・台帳・列・index・FK metadata が開始前と一致 |
| 末尾 FK | 存在しない合成 account を参照する session を transaction 内に追加 | 最後の FK assertion の指定 statement index で拒否。全 schema・全行・台帳が開始前と一致 |

全シナリオで FK 再有効化と `foreign_key_check` 0 件を確認した。owner / runtime / token / budget、保存済応答の数と状態、undo revision 参照、機械 claim 除外の SQL projection は前後一致した。unknown owner と 2 MiB の予約は unknown のまま保持した。

正常後の負対では、旧 source format の更新、unknown→idle、active budget 縮小、active 行削除、実 close 前に相当する reservation release、旧 recipe 更新、recipe=3 を拒否した。新 5 format は original と同じ format で保存し、text への偽装を行っていない。

## 限界と正式実装への境界

- run01 の回復・undo・quota の根拠は保存値と関連 SQL projection の一致である。実 `recoverLlm` と旧形式 repository は run02 で補完した。undo usecase、新 format の型付き hydration は未実行。
- 旧 source format の改変拒否は immutable trigger の実測である。新規 INSERT の original/source 不一致を新 DDL が防ぐ証拠ではない。現 application の一致検査は読取根拠に留まる。
- 新 format と recipe=2 の組合せを保存したが、新 format の NULL recipe を拒否する規則は追加していない。nullable 列の解釈・正式な受付条件は製品実装時の共有契約に残る。
- 全 PK / FK / index / trigger の保持は schema 比較、旧値は全行比較で確認した。全 trigger の業務分岐を実行した証拠ではない。
- run01 は public `Client.migrate` の単独直列実行である。製品の接続直列化 wrapper は run02 で使用したが、並行 reader、起動中 runtime、実本体 migration、電源断・OS 全耐久は両 run とも未検査。
- C 案の正式導入時は、移行台帳への登録、旧 reader の互換、NULL=V1 の解釈、新 format の型・受付を主担当が接続する。本 probe の成功だけで本体への適用を許可しない。

## 実行・回収

run01 の実行 command は固定 Node 実体から専用 `probe.mjs run01` の 1 回。所要 0.67 秒、exit 0。再実行・失敗履歴はない。

各 DB は `finally` の `db.close()` を経て終了した。各シナリオ後の上限検査はすべて成功し、script 最終集計の DB / WAL / SHM は 9,057,360 B、結果 JSON 書込直前の script / SQL 等は 27,379 B だった。process 終了後の native stat では WAL / SHM は存在せず、DB 3 個合計 5,312,512 B、script / SQL / result 合計 31,140 B。64 MiB / 8 MiB 上限内である。

自己 DB は閉じた合成証拠として専用 root に残す。外部 request 0、自己 child / worker / server 0、未回収 exec 0。Node 枠は主担当へ返却済み。script / SQL / 報告を全文確認し、この専有領域を含め全操作を停止して所有を返却する。

## run02: 既存 read / write / 回復の直接接続

### 実行と保存境界

2026-09-28 08:42:40 JST、[repository-probe.mjs](/Users/hikaru/.local/share/hollow/verification/p5b2b0-probe-20260928-TwAYeL/migration/repository-probe.mjs) の初回実行が 20/20、exit 0、0.85 秒で終了した。[run02/results.json](/Users/hikaru/.local/share/hollow/verification/p5b2b0-probe-20260928-TwAYeL/migration/run02/results.json) が boolean 集計である。

旧 schema へ全 rollback 済みの自己 `run01/sql-fault.db` を、新規 0700 の `run02/repository.db` へコピーした。旧 run01 は不変更。新 copy 上だけで同じ C 案を適用し、既存コードを変更せず import した。

固定 Node の `--experimental-transform-types` と専用 script 内の extension 解決 hook で既存 TS を読み込む。新 dependency・コンパイル出力・共有 loader はない。型検査の代替ではなく、実 adapter 呼出の限定観測である。

### 実際に呼んだ経路

- `createLibsqlClient` の既存 local 直列化 wrapper、`getDatabase`、`LibsqlHollowUnitOfWorkProvider`。
- `llmConversions.find/command/activeForNote/replace`、`llmDispatches.list`、`llmQuota.reservation/usage`、`revisions.find`。
- 既存 application の `cancelQueuedLlm` と `recoverLlm`。後者から実 repository の owner / dispatch / quota / original / job 更新へ接続した。

新 format を旧型へ cast していない。対象は旧 text / html / markdown の 10 状態である。NULL recipe は現旧 reader が扱わない追加列として残り、旧 `promptVersion: 1`、Date、source、owner、outcome、関連応答・quota・revision の hydration が前後同じことを確認した。NULL=V1 の正式 mapper を実装・採用した証拠ではない。

### 観測

| 対象 | 実結果 |
| --- | --- |
| 旧 read | 10 状態すべての hydration と command / active / dispatch / quota / revision の読取が移行前後一致 |
| 旧 write | 既存 `replace` の CAS 成功・roundtrip 一致。旧 expectedVersion の再更新は false。別 unknown 行は不変 |
| queued 取消 | 実 `cancelQueuedLlm` が terminal cancelled へ更新し、reserved reservation / bucket を解放 |
| intent-only 回復 | 実 `recoverLlm` が dispatch unknown、terminal delivery-unknown、owner closed、budget 0 へ更新。consumed は減らず、再送しない |
| 全応答保存済み回復 | 実 `recoverLlm` が response-ready / closed / pending へ更新。保存済応答と後処理用 budget を保持 |
| 回復対象の分離 | predecessor に含めない unknown owner は閉じず、全関連値不変。指定 2 predecessor だけ ACK |
| 冪等性 | 同じ predecessor をもう一度渡しても DB の読取結果に追加変化なし |
| 最終状態 | 旧 recipe は全 NULL、FK 有効・違反 0 件 |

所有終了を示す `ownership.predecessors/acknowledge/assertReady` は合成 port である。指定 predecessor の終了証明を入力したときの既存 usecase 分岐だけを検査した。実 PID / native close / crash 回復証明は対象外。未提供 generator 等へアクセスすると失敗する service proxy を使い、外部再送・renderer 呼出を認めていない。

undo は実 revision repository の読取一致までであり、`undoLlmBody` / 本文 commit は未実行。response-ready 後の生成済応答の再処理・commit、旧形式以外の hydration、型検査、全 worker 行列も未実行である。

### 回収と返却

run02 の client は `finally` で close、module hook も解除した。process 終端回収後の native stat で run02 DB 1,773,568 B、WAL / SHM なし。全 migration 領域の DB 合計 7,086,080 B、script / SQL / result 合計 43,537 B で、64 MiB / 8 MiB 以下。閉じた自己合成 DB は根拠として残す。

自己 child / Worker / server 0、外部通信 0、未回収 exec 0。主へ Node 枠を返却し、script と報告の全文確認後に専有領域の所有を返却、文書を含む全操作を停止した。
