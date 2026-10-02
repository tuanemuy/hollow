# P5c-3 S2 最小着手案：保存済み取得元から入力段階の安全終了まで

2026-10-01。S1 全4条件の独立受入済み候補 `8902b48bca04ade91696e851bb3b5df707348665` を基点とする静的提案。本書は実装・DDL・資源の実行許可ではない。first-slice-plan §3–5、独立 first-slice-plan §3/§5、S1 の未接続境界を引き継ぐ。IN-07/IM-06 の全体完成、実 Google、本文採用、UI 完成とは区別する。

S1 F1/F2 は修正・独立受入済み。Drive だけの安全 terminal redaction、consumed preview の raw result/receipt/job/owner 保持を維持する。S1 根拠は一意51（不変更純40＋直接11＝正式移行1・小DB10、移行内3rollbackは別対へ加算しない）。本案は `reviews/P5c-3-s2-plan.md`（84行/14327B、SHA256 `f5591e6403eec6906c38736ef8ca41d5c2e8106e9ce4159db5914aec577db0d0`）の M1/M2 と Root の方向採用を反映する。

## 1. 次のまとまりは一つ

既 binding/attempt と正規 consumer 行を使い、現在認可→入力予約→自己 HTTP 経由の実取得→実 close/caller-end/ACK→実 text 準備 adapter→入力だけ解放、を新しい隔離 DB の integration から直接つなぐ。通常 runner/受付 UI/DI からは呼ばせない。DB なし kernel を別の恒久フェーズとして積み上げない。純対はこの接続の先行検査に限る。

consumer は既 LLM conversion の text/HTML/Markdown preparationVersion1 を代表とする。正規 local request/claim で作った current consumer と、同じ保存契約で明示作成する Drive binding/consumer を使う。Drive 側の fixture 受付は将来の製品 request/UI の成功根拠ではない。machine/PDF の receipt 型・保存 guard は同じ入力 lease 契約へ追従するが、実 machine parser/PDF classifier は本段では起動しない。

直接終了条件は「consumer owner が active のまま、入力 bytes とその worker clone の管理上の寿命が終了し、source memory が 50 MiB→0 になる」。owner を便宜上 closed にしたり、Drive attempt の ACK を input 終了の代用にしたりしない。本文/dispatch/quota を進めず、独立した入力段階までを閉じる。

## 2. 現コードから必要な限定差

- `migrations/0042_regeneration_source.sql:218/260/302` は memory 減少を consumer owner.closed AND attempts 安全終了に限定する。この S1 保守条件は正しかったが、active dispatch 前に input を返すには別の永続 stage 証拠が必要。
- `application/llm/worker.ts:192–245` は pending PDF の分類後に再読して準備する。同 consumer の連続 read を別々の 50 MiB 予約にすると自己待ちを作る。`llm/pdfPreview.ts:397–451` は分類後 ready＋owner.closed を保存するが、実入力 lease は未接続。
- `adapters/node/llm/sourceReader.ts` は全量 hash と owned read.close/closed を待つが、返却 bytes の寿命を所有しない。`sourcePreparer.ts:222–296` は message と exit を分ける一方、stdout/stderr end は成功判定と別に確定していない。本段で text 分岐の終了証拠を補強する。
- `DriveExecutionTarget` は authorization/control/backup のみ。`NodeDriveExecution.withCaller` は backup だけを data1 とする。既 `reconcileDriveClosures` は3種類だけを処理するため、新 attempt を control に偽装せず、source 種別を追加して全分岐を閉じる。

## 3. 採用が必要な永続契約：0043 一案

新表は増やさず、3 consumer 表へ nullable JSON `source_input_receipt` を各1列追加する案を選ぶ。migration 名は採用時に `0043_regeneration_input_stage.sql` を予約する。0042/旧 ledger/旧定義は編集しない。ALTER 後の旧行は NULL、旧全列/version 不変、既 source_memory が非0の移行前行は旧の閉鎖条件で回収し、新 stage 証拠を捏造しない。停止下で正式 migration、末尾 FK assertion、故障3位置の原子 rollback を確認する。

receipt は `generation`、exact consumer kind/id と consumer runtime/token、`state: active|unknown|closed`、閉鎖時だけ `proofId` を持つ閉じた型。consumer input owner と Drive execution owner は別 namespace とし、token の文字列一致で交換しない。generation は正の安全整数、上限で新予約を拒否し、巻戻し/overflowを許さない。id/time は既 port から得る。proof は公開 DTO に出さない。

| 保存状態 | 許す操作と次状態 | 拒否する操作 |
| --- | --- | --- |
| receipt NULL / memory0 | 現在認可・owner と合算100MiBを確認し、同Txで generation1 active / memory50 を予約 | 非0への receipt 後付け、別source/bindingへの交換 |
| receipt NULL / memory50（legacy） | 旧 consumerclosed AND 全attempt安全終了で NULL / 0 へ整理 | 新read、新generationの捏造、stageproofによる旧所有終了推定 |
| active / memory50 | 同owner/generationの逐次read、未証明時 unknown / 50、exact input proof＋attemptsafeに基づく closed / 0 の同Tx/CAS | consumerclosedだけの解放、proofId先付け、owner/generation差替え |
| unknown / memory50 | 同runtimeが保持するexact実終了proofを確認できた場合だけ closed / 0。同consumer owner自体がunknownなら保留 | timeout/JSONproofId/consumerclosedだけの解放、再起動によるproof復元推定、新read |
| closed / memory0 | exact全値が既確定なら読取による同値確認。新readは現在ownerで generation+1 active / 50 を別CAS予約 | 旧proof再使用、同generation再開、receipt NULLへ戻す操作、旧ownerの遅着解放 |

新receiptの解放は exact stageproof AND attemptsafe を必須とし、consumerclosed の旧分岐を OR で併用しない。旧分岐は receipt NULL / memory50 だけ。active consumer を便宜上 closed に書換えない。closed receipt と memory0 は同一更新で確定し、片側だけの保存を拒否する。新予約/新readは失権/fence後0、既資源の安全releaseはexact所有証拠に限って可能とする。

service registry の opaque proof は DB CAS 確定まで未消費で保持する。CAS失敗/結果不明では新readや解放成功返却を行わず、exact consumer/owner/generation/proofId と closed/0 の全値を純読取で再照合する。同値確定だけproofを消費し、別版/別世代は拒否する。新HTTP/workerは起動しない。再起動後にJSON proofIdだけで実終了を推定しない。旧runtimeの非0予約は正式所有回復の証拠がない限り保持する。

stageの入力終了とconsumer業務完了は独立。binding redaction/prune/delete は S1 の Drive限定、consumerterminal/ownerclosed/memory0/attemptsafeを維持し、receiptの世代・proofを保持する。consumed preview は raw result/receipt/job/owner を変えない。input.closedだけでbinding解除や一般consumed編集を許さない。

既 `llm_conversions_source_{insert,update,delete}`、`llm_pdf_previews_source_{insert,update,delete}`、`machine_regenerations_source_{insert,update,delete}` の9 triggerを0043内で定義し直す。差は stage shape/遷移と memory 解放の限定条件のみ。identity/ready/body/recipe/quota の旧 trigger は解除しない。stage 記録は既 version CAS に統合し、二重の更新正本を作らない。新共通型の必須化による既 fixture の機械追従は別途 exact 通知、既期待値の縮小なし。

SQL が物理 worker 終了を証明するわけではない。application の release は bool 入力でなく service registry に存在する未消費 proof を要求し、adapter が実終了を観測して初めて発行する。JSON を書けることと実 proof の根拠を別々に試験する。S1 の source identity/unknown/redaction の既負例は維持する。

## 4. buffer と consumer の所有境界

service は exact consumer/runtime/token/generation に一つの input lease を持つ。read の返値 `{bytes, lease}` は一般 UI/usecase へ渡さず、source service と所有付き text preparation adapter の内部だけで使う。port は `beginInput`、`read`、`prepareText`、`finishInput` の閉じた操作にし、任意 callback が bytes を保持して `closed:true` を返す API は設けない。

Drive の bytes は native close 後も生存する。worker に渡す clone1本、親 input1本を lease に関連付け、text 結果 message の到着だけでは解放しない。正常結果検証＋実 worker exit＋stdout/stderr end＋入力を参照する adapter closure/registry の解除を満たして input proof を作る。既 preparer が成功結果後に worker.terminate を行う既設計は変更せず、その終了方法を自然 exit と区別して記録する。成功前の abort/timeout terminate は業務失敗の安全終了であって成功ではない。GC 時刻/文字列の物理消去/RSS即時減少は保証しない。

同 consumer の逐次 read は一つの active input generation/50 MiB を再利用する。前 read の consumer adapter 終了と親参照解除まで次 read を拒否し、予約枠を取り直さない。新 attempt ordinal は各 Drive read ごとに増えるが source binding は変えない。最終 finishInput でのみ50→0。二重 read、自己待ち、遅着結果の再採用を負例にする。

本段の実 stage 証拠は text preparer まで。PDF ready は現 code の「分類終了→ready/ownerclosed」と整合する保存対だけとし、5分 receipt 中に memory を持たない実 classifier 接続は次段。preview→conversion は別 consumer/新 lease、新 binding、buffer 移管0。同様に local pending PDF の分類→準備/pagesの連続 read は本段の逐次 API 対を借用できるが、実 PDF 成功とは言わない。

既 local 本番の `LlmServices.source`、worker、preview、DI は本段で置換しない。新 source service の local 分岐は既 owned storage reader を使って隔離 integration で確認する。既 local Office/PDF/画像の heap/timeout/提供可否は不変。月間30、job30分、prepare30秒、dispatch90秒、stop60秒、quota/返金/unknown delivery は変更しない。

## 5. 実取得・閉鎖・ACK・共有 data lane

取得は既 record/binding の exact snapshot、記録本人の現在同sub/epoch資格、実行者の現在編集権限を照合する。current folder/head や記録者の WS 所属を追加条件にしない。read-only 候補 API は本段でも副作用0。refresh が必要なら既 subscriber 契約を再利用し、data owner を持たず待ち、通知後 current/credential を再確認して claimする。

順序は (a)memory reserve、(b)maintenance→withCaller claim Tx、(c)run内metadata-before/download/hash/metadata-afterとnative実close、(d)閉鎖proof/結果をDB保存、(e)withCaller返却でcaller-end、(f)外側maintenanceでexact row/proof照合→source execution ACK→DB acknowledged CAS確定、(g)再current→bufferをinput adapterへ、に固定する。callback/UoW中にcaller終了・ACK・HTTP・consumer終了を待たない。

source専用のACK保持状態は `nativeClosed → callerEnded → executionAcked/dbPending → dbConfirmed`。execution ACKで直ちにentry/proofを削除せず、exact target/runtime/token/閉鎖証拠をDB acknowledgedのCAS確認まで保持する。CAS結果不明ならbuffer返却0、DB同値再照合だけを許し新外部要求0。DBがexact同値acknowledgedであると確定してから専用confirmで証拠を破棄する。backup/controlの既ACK消去契約を無条件に変更しない。これはnative転送の終了証拠であり、返却後bufferのinput-stage proofとは別物。

source target を新union枝として追加し、Node laneはbackup+sourceの合計data1、control2/全体3を維持。永続claimはcredential owner accountのdata1/control1/合算2を使う（executorではない）。`sourceHeld = owner.active OR owner.unknown OR (owner.closed AND (callerEnded != true OR acknowledged != true))` を唯一の保持定義とする。欠測/不正形は空集合へ縮退しない。never-owned queuedは含めない。

この同じ定義をsource claim、backup相互SQL guard、control/全体/account集計、held scan、reconcile、predecessor-emptyへ適用する。closed→caller/DB ACK間もSQL上heldであり、execution maintenanceだけへ保護を委ねない。scanはexpected data1に対する最大2件のsentinel照合とし、上限超過/切詰めをemptyと扱わない。backup既heldとsourceHeldを合算し双方向に拒否する。source0件の旧挙動は不変。

0043には新 `regeneration_attempt_claim_guard` と相互拒否用 `drive_backup_source_lane_guard` を追加する。旧 `drive_backup_transfer_claim_guard` は保持する。sourceHeldの条件を両SQLと各repositoryの同Tx集計で一致させる。先任runtimeの未caller/未ACKを残して通常claimを開かない。registryが失われた場合は正式predecessor proof interfaceの証拠がなければ保持/拒否する。実前任子は起動せず、当該interfaceの保守保持・不正証拠拒否対だけを行うため、実再起動回復成功とは報告しない。

metadata64KiB/header16KiB、exact length/hash≤50MiB、HTTP30秒/close5秒、redirect/export/自動retry0。取得後のfinal-checkは別attempt metadata1回と同じ終了列まで直接試験するが、本文CAS/commitは次段。未知/失権/移動/trashは失敗、local fallback/別ID/別record付替え0。Google適合はローカル契約と区分する。

## 6. exact 変更予定

以下の brace は列挙 basename だけ。採用前の製品編集は禁止。新 source service は明示引数で構成し、HollowContainer/bootへの提供は行わない。

| prefix | 予定 path |
| --- | --- |
| `packages/core/src/domain/` | `regeneration/{source,entity}.ts`、`llm/{entity,pdfPreview}.ts`：stage型だけ |
| `packages/core/src/application/` | 新 `regeneration/{services,source,memory}.ts`、既 `regeneration/{ports,current}.ts`、既 `integration/drive/{ports,runner}.ts`：source target/closure、現在性。既 `llm/ports.ts` は所有付きtext準備の追加型のみ |
| `packages/core/src/adapters/libsql/` | `regenerationSchema.ts`、`llmSchema.ts`、`repositories/{regenerationRepository,llmRepository,pdfPreviewRepository,driveRepository,driveBackupRepository}.ts`、新 `migrations/0043_regeneration_input_stage.sql`、新 `migrations/meta/0043_snapshot.json`、`migrations/meta/_journal.json` |
| `packages/core/src/adapters/node/` | 新 `drive/sourceProvider.ts`、新 `regeneration/{input,memory}.ts`、既 `drive/{http,execution}.ts`、既 `llm/sourcePreparer.ts`。既 `llm/sourceReader.ts` / `llm/sourceWorker.mjs` の挙動は再利用し無変更 |
| test | 新 `packages/core/src/application/regeneration/{source,memory}.test.ts`、新 `packages/core/src/adapters/node/drive/sourceProvider.test.ts`、新 `packages/core/src/adapters/node/regeneration/input.test.ts`、新 `packages/core/src/adapters/libsql/__tests__/regenerationInput{Migration,Application,Native}.integration.test.ts`、新同 `regenerationInputFixtures.ts` |
| 既比例test | `packages/core/src/domain/regeneration/{source,entity}.test.ts`、`packages/core/src/adapters/node/drive/{backupExecution,http}.test.ts`、`packages/core/src/adapters/node/llm/sourcePreparer.test.ts`。S1 fixtureの必須型追従exact群は採用前又は実装前にまとめて通知 |

追加する共有契約はstage永続receipt/未消費opaque proof、source providerとinput lease、Drive source target/双方向data枠/source専用ACK確認、source attempt exactclaim/held scan。これらは上表の既予定path内へ置く。新汎用schedulerや汎用resource frameworkを作らない。0043の3列/9source trigger差/2claim guard以外のtrigger・列・port差が必要なら編集前に返す。S1受入済みのDrive限定redactionとconsumed保存制約は不変。

## 7. 比例検証・新資源案

実装採用時の見込み6–10時間。先行gateは型/0043移行とstage guard、次にsource実I/O→既text worker→同DB releaseまで。純kernel成功だけでは本段完了としない。規定typecheck→lint:fix→format→影響局所、build/UIは本段0。S1の一意51（純40/直接11）は不変更範囲だけ借用し、変更到達の負例を再確認する。

- 移行：停止0042baseline1→成功clone1、故障3clone（列後/guard置換後/末尾FK）、旧全列/旧guardの非変更部/ledger保持、NULL legacyとactive stageの違い。0042を編集しない。
- 小DB：3consumer合算100MiB、§3の全保存状態/namespace/世代/NULL後付け拒否、CAS不明と同値再照合、旧証拠/別owner/別世代/ACK単独拒否、active consumerの正規input proofで解放、unknown保持、stageclosedでもredaction/purge拒否、同consumer逐次read、localとDriveのidentity拒否。sourceHeldのactive/unknown/closed未caller/closed未ACK/closed安全済みをSQL・集計・scan・reconcile・predecessor-emptyに共通fixtureで通し、data/control/account相互拒否と限界2件を確認する。
- native：自己HTTP exact取得成功、metadata前拒否、hash不一致、metadata後変化、abort/close未証明、caller pending/ACK未保存でbuffer不採用、final-check。通常request/socket/FDcloseと実worker exit/両pipe、input proof、DB CASを別観測する。
- text workerは既preparationVersion1のHTML/Markdown/text成功と取消を上限4起動で確認。messageだけではreleaseしない対は制御可能な所有fakeの純対に分離する。実PDF/実machine/新worker runner/UIは未確認。

新root1個0700、192MiB案。logicalDB7/合算144MiB：baseline16＋success16＋rollback3×16＋application32＋native32。helper/log8、NodeTMP8、自己local原本4、材料256KiB（自己AES2本64B以内）、合算164.25MiB、残27.75MiB。前段root再使用/旧private/results/DB/key/cache非操作。baseline/app/nativeは正式新空初期化、cloneは停止自己baselineのみ。失敗DB保持・同DB再実行0、追加DBは再採用。

HTTP fixture1・loopback逐次1、最大24要求/2MiB、接続先はURL/options両方自己exact address・外部0。wireは以下だけ。MはGET `/drive/v3/files/{fixtureId}?fields={固定metadata field集合}`、DはGET同path `?alt=media`。fixtureId/field列は各自己fixtureのmemory内exact値へ固定し、unknown method/path/queryは拒否する。認可headerはmemory内の有効synthetic資格だけ。refresh/token wireは0、refresh待機・通知後再照合は既subscriberの純port対として区分する。

| native対 | 送信順・最大要求 | 観測と再送禁止 |
| --- | --- | --- |
| N1 成功＋final-check | M→D→M→M、4 | 同ID/版/hash、3番目後close/caller/DB ACK、text worker1へ、最後のMは本文採用なしの別attempt |
| N2 同consumer逐次read | M→D→M→M→D→M、6 | 同binding/generation、前read所有終了後だけ次ordinal。再予約0/overlap0 |
| N3 metadata前拒否 | M、1 | 不一致でD0 |
| N4 hash不一致 | M→D、2 | hash不一致後M0/返却0 |
| N5 metadata後変化 | M→D→M、3 | 後metadata不一致で返却0 |
| N6 abort | M→D、2 | D中に自己abort、実socket終端、返却0 |
| N7 close未証明 | M→D、2 | owned close証拠を有限制御し不成立中は保持/返却0。故障注入と実socket終了を別観測 |
| N8 ACK CAS不明・同値確認 | M→D→M、3 | native/caller終了後DB ACK確認を保留、buffer0/held1。exact DB同値確認後だけ返却、HTTP追加0 |
| N9 現在資格失効 | M、1 | M後のcurrent失効でD0/新claim0 |

計24要求。各対が前段で止まった未使用要求や余枠を再試行へ転用しない。Dの実bodyは各1KiB中心、metadataを含む全wire2MiB以内。50MiB境界は数値/過大header拒否までで全量転送成功とはしない。

実text worker4起動は W1=N1のDrive text成功、W2=自己local HTML成功、W3=自己local Markdown成功、W4=自己local取消へ固定（同時1）。N2は所有付き制御adapterで逐次read/参照解除の契約を直接確認し、2回の実parser終了を偽装しない。実parserを使うDrive縦切りはW1、他formatはlocal入力の同lease/実exit経路を確かめる。message先行/exit未着/片pipe未終端/遅着は純所有fake対であり、実worker起動数へ混ぜない。W4は既preparationVersion1が同期的にWorker生成/abort登録を終えてPromiseを返した直後に自己signalをabortする。新ready messageをworkerへ足さず、実exit/両pipeを別に確認し、結果messageだけを成功/終了証拠としない。

| 実行群 | finite phase / case範囲 | 数字期限（case / 群 / 外側） |
| --- | --- | --- |
| 純port・状態対 | P01 receipt遷移、P02 proof/CAS、P03 held全経路、P04 subscriber、P05 worker所有順 | 各2秒 / 60秒 / 90秒 |
| 正式移行1対 | M10 baseline/seed、M20 success/ledger旧tuple、M30 guard/FK、M41–43各rollback、M90 close | 対120秒 / 120秒 / 180秒 |
| application DB | A10 legacy、A20 reserve/世代、A30 release/CAS、A40 redaction、A50 lane/scan、A60 predecessor保守、A90 close | 各10秒 / 120秒 / 180秒 |
| native DB | N1–N9、各current/claim/M/D/close/caller/ACK/confirmを固定stageで記録、N90 close | 各120秒 / 600秒 / 660秒 |
| local worker W2–W4 | reserve/read/prepare/result/exit/pipes/proof/CAS/close | 各45秒 / 135秒 / 180秒 |

W1はN1内に含める。各HTTPは既30秒、native closeは既5秒、worker準備は既30秒。正常終了時は各所有資源close5秒、DB close10秒、子exit/両pipe終端10秒を別々に有限確認する。失敗時は既stop60秒内に自己abort/通常closeを試み、未証明を成功へ変換せず保全して返す。外側deadlineはSQLプリエンプションや未知PID強制終了の保証ではない。有限phaseとfixtureClosed/childExit/pipeEndは別fieldとし、finallyで元失敗stageを上書きしない。case数/成功/skipと内部assert数は別記する。

testworker1/DBwriter1、native fixture supervisor1、text worker通算4/同時1、appboot/Chrome/Google/OpenRouter/mail/課金0。実前任後任Node子0。managed inputは最大50MiB×2の論理予約だがfixture実bytesは1KiB中心、native全応答2MiB以内。576MiB非PDF全体予算の実証やprocessRSS上限とはしない。各case finite deadline、cache無効、外側finite schema、secret/body/rawstack0。通常終了とtimeout/terminate/unknownを区別、実自己resource終了後にDBclose・子/両pipe終端。DBは保存し、opaque/auditは本段追加しない。

## 8. 本段後も残る完成条件

1. 実LLM worker/previewへlease接続し、同consumer PDF逐次readとready時解放を直接確認。Office/PDF/画像予算を別採用し、既提供経路を止めない。
2. machine owned parser/common body lock、全取消/影響確認/pin/prune/purgeへの接続。M4の全入口が完了するまでDrive再生成の正規受付を公開しない。
3. final-check後の現在認可/本文版/activeJobId/fence CAS、旧本文保持/undo、通常OpenRouter quota/dispatch、取得元選択と現在receipt GETのUI。同bundle build/代表UIは別資源で採用。

現在は本書の静的補正だけ。S1候補/product/test/helperは不変更、評価/import/test/DB/HTTP/native/worker/build/旧private操作0。公開source/報告読取だけにread-only shellを使用した。Rootの最終採否点はM1のsource専用ACK確認と全sourceHeld統一、M2のNULL限定legacy/未消費stageproof CAS、§6exact群・§7具体要求/worker割当/期限。既7DB144MiB/root192MiB、HTTP24/2MiB、worker4を増やさない。実装開始はRootの次委譲待ち。本書EOF確認後、文書を含む全read/writeを停止する。

EOF
