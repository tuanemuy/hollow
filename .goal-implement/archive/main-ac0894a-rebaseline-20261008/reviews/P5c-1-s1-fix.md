# P5c-1 S1 V1/V2 独立再確認

## 結論

候補 `d812e1c69a6353d56e0eb7d9a8dc5fddf3724dcd` の **C/F・S1修正範囲は合格**。終端controlの新owner取得と、create新intentのsends据置きは独立実DBで拒否された。正常close・metadata照会・明示2回目の送信を保持する。新しい不合格/追加gateはない。

P5c-1 A〜F全体の完成判定ではない。旧不合格は [初回独立報告](P5c-1-s1.md) に保持し、今回の成功で上書きしない。S2共有補足/実装は対象外。goal-implement/manager-loopを全文再読し、製品/管理正本/旧報告/spec・spec-implement/goal操作0で実施した。

直接: DB13、独立再現1（V1/V2と正常経路）、最新0038正常/SQL故障/FK故障3対。主の型/lint/formatと変更なしpure10は適用確認のうえ借用し、今回の独立実行数に含めない。

## 対象・指紋

独立I: `/Users/hikaru/.local/share/hollow/verification/p5c1-s1-fix-independent-20260929-iag3u0`（排他0700）。主Rの公開4点だけをmetadata成功→全文静的読取→排他copy→自己path適合の順で扱った。

| 公開logic | コピー元bytes |
| --- | ---: |
| synthetic.test.mjs | 6387 |
| synthetic.config.ts | 516 |
| reporter.cjs | 1117 |
| test-run.cjs | 3366 |

全通常file/no-symlink/bytes一致。旧R/初回独立rootでの実行・書込0、旧DB/sidecar/private/result/manifest/cacheは読取・copy0。I内root/include/reporter/出力を適合し、独立反例の新test/config、有限projection、指紋/容量helperだけを新作した。

| 識別 | 開始 `2026-09-29T09:44:49.196+09:00` / 終了 `2026-09-29T09:46:37.039+09:00` |
| --- | --- |
| HEAD | `d812e1c69a6353d56e0eb7d9a8dc5fddf3724dcd`、前後一致 |
| 公開18path aggregate | `27f424c0e771a5bf418751b83d2a03945ae42bd2f37a1e786e64d5d20ed5cf68`、前後/主候補一致 |
| 正式0038 SHA256 | `01a299663df579de8f72ee0e059464cf921296cd2f833416c434f131d0294dae`、前後/主候補一致 |
| 個別内容 | 18path全bytesを当該commitへ直接照合し一致、製品dirty0 |
| 修正範囲 | 初回f50d88aからrepository/0038/既persistence testの3pathのみ。他15path不変 |

集約はsecret-path guard後の公開18pathに限定し、JS既定pathsort→`lowercase SHA256 + two spaces + relativepath + LF`の連結SHA256。旧方式不明aggregateとの同値を推定しない。I `seal-start.json` / `seal-final.json` に個別pathとbytesを保持。

## 修正の独立読解

V1: `packages/core/src/adapters/libsql/repositories/driveRepository.ts` のcontrol `claim` は `terminal(old.data.phase)` を先にfalse拒否する。`0038_drive_connection.sql` のattempt/control両update guardは、旧terminalかつowner none/closedからactive/unknownへの変更を拒否する。既active→unknown→closedの同owner収束は拒否条件に入らない。したがってreceiptの終端性を守りつつ、終端時に残る実所有の閉鎖を妨げない。

V2: repositoryのfolder-create境界（約775行以降）は新running claimに `after.sends === before.sends + 1` を要求する。SQLもphase/owner identity変更による新running intent、旧owner none/closed、新owner active、厳密+1を照合し、metadata状態での増分を拒否する。reconciling同payloadでmetadata ownerを取り直す際はsends据置きが残る。旧fileId/marker/観測済parent固定、sends最大2、取消/current/枠の照合は変更しない。

型/port/UoW/DI/旧schema/0037以前/snapshot/journalに差分はない。0038は未適用actualfreshを本検証で移行したものではなく、専用合成DBへ最新正式SQLを適用した。

## 直接実行

全runはIの `test-run.cjs` を既知Node22.22.3で実行。`NODE_DISABLE_COMPILE_CACHE=1` / `TSX_DISABLE_CACHE=1`、専用TMPDIR直下db、worker1/bail1、未回収exec1以内。rawerror/assert diffは出さずfinite bool/count/codeだけを採取。

| 対 | 結果と根拠 |
| --- | --- |
| DB13（既11＋主新2） | 13/13成功。terminal control/attemptのrepository・直接SQL拒否、active→unknown→closed、metadata ownership据置き、新running2、3回目相当拒否を含む。主の実行数と合算しない |
| 新独立反例再現1 | `I/independent.test.ts`。旧V1を同順序で構成し `terminalClaim=false / terminalClosed=true / terminalHeld=0`。旧V2のsends1据置きは例外拒否し、元version/closed/reconciling不変。`metadataClaim=true / secondClaim=true / thirdRejected=true / held=0 / clientClosed=true` |
| normal | 782/782、ledger39、旧101表→104表（台帳込み）、追加3表/5trigger/9index、FK0 |
| SQLfault | 783/783、ledger38/101表/追加0/FK0、全rollback |
| FKfault | 783/783、ledger38/101表/追加0/FK0、全rollback |

独立反例は公開製品fixture/portから新作し、初回の失敗DBや旧test-resultを入力にしない。V1では旧と同じfailed+closed/期限内/cancel0から新ownerを要求、V2ではreconciling+closed/sends1からrunning1を要求した。正常metadata close後のrunning2成功まで確認し、拒否だけの過剰修正ではないことを確認した。

移行logicを全文読み、正式0038正常実行と、同SQL末尾の無効SQL注入/正式FK assertion直前の自己orphan注入を分離した。全旧sqlite_schema/全table行/table_info（PK）/foreign_key_list/台帳を比較。旧合成account4/browser1以外はほぼ空であり、actualfreshの実旧全データ保持を実証したとはしない。全3clientはfinally closeを確認、保存DBは保持する。

## 条件ごとの判定・借用

| ID/範囲 | 今回判断 |
| --- | --- |
| P5c-1-C S1 V1/V2 | 合格。終端非復活、有限send intent、metadata/正常closeを直接確認。外部HTTP/実Google/実重複folderの証明ではない |
| P5c-1-F S1修正部分 | 合格。3pathコード/指紋、最新DDL正常/故障rollback/旧保持、有限実行と終了を直接確認。主の型/lint/format成功は借用 |
| P5c-1-A/B/D S1局所 | 初回独立の保存型/current/CAS/candidate/unknown/解除例外根拠を、他15path不変と最新DB13で維持。認可/metadata/実解除全体は未実装・未検証 |
| P5c-1-E | 型の旧確認を維持、UI未検証。新UI合格とはしない |
| P5b-1-A 再開影響 | UoW/加算共存の局所合格維持。UoW/旧LLM/auth不変更＋最新0038合成旧保持/rollbackの直接根拠。実fresh移行/旧実データの新検証ではない |

変更なしpure10とS1初回の内向き型/portレビューは借用。全unit/型再実行/lint/format/build/HTTP/native/browser/app/fresh/外部API/旧資格情報の操作0。fake ownerによる保存試験と、実外部request/socketのclose証明を混同しない。S2の版追跡/列挙/admission補足は未実装として本判定に混ぜない。

## 資源・終了

`I/final-state.json` の実測 `2026-09-29T09:46:43.949+09:00`:

- 保存3DB＋sidecar2、5,671,792B。active16MiB予約を加えて64MiB内、最大4DB枠を超過しない。
- script/log/cache28,540B（final-state書込直前）、material0。8MiB/256KiB上限内。
- 専用temp/db0、runner残存0。全3runはchild close/ESRCH、全DB finally close。I限定lsof PID集合0、未回収exec0。
- 正常fixtureのexact自己temp finally cleanupだけ実施。失敗0、証拠を削除して容量を確保する操作0。3DB/全結果/入力logicは保護保持。

今回metadata順序逸脱/準備失敗なし。初回報告の失敗履歴/方式不明/準備差はそのまま保持する。最新版EOF確認後、文書を含む全read/write/runを停止しManagerへ所有を返却する。whole A〜Fの受入やS2開始を独断で宣言しない。
