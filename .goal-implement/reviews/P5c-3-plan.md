# P5c-3 Drive 原本再生成案の独立静的レビュー

2026-10-01。対象案は [P5c-3-plan](../phases/P5c-3-plan.md) 全 164 行・24,666 B、EOF まで読了。現 candidate は `fd4a2476a60a3ad4db3da2ac92235b0334e7e895`、実装基点は親 `4b3995711c94957454cfbaf6863b6e9695abfb4a`。goal-implement の独立 Verifier として、[IN-07](../../spec/scenario/integration.md:126)、[IM-06](../../spec/scenario/import.md:149)、brief/design、現公開 source、既 E/J・Retarget 報告へ静的照合した。

判定は「共有契約の方向を採用可、実装委譲前に下記 M1–M5 の具体化が必要」。案は S1 時点の計画であり、現在も未実装の取得/再生成を提供済みと扱わない。P5c-2 の欠陥差戻しではなく、P5c-3 が追加する責務の接続差である。新機能・音声調査・既 LLM quota/recipe/本文 undo の再設計は要求しない。

## 採用可能な共有契約

- 現在 personal owner / WS owner・editor の編集権限と、immutable record の記録本人の Drive 資格を分ける。LLM は再生成実行者本人の既資格・月間枠を使う。記録者の WS 脱退のみを永久失効理由にしない。
- IN-07 は選択した Drive 原本の実 bytes を使用し、取得失敗時のローカル fallback は 0。IM-06 の local/Drive 選択と、HTML/Markdown の通常機械変換を混同しない。
- record/sub/file/元 parents/全 bytes・hash を照合し、別 sub、移動、trash、取得不明・内容不一致なら本文を採用しない。metadata と DB commit の間に分散 Tx 保証がないことを明示する。
- 受理前の確認、PDF preview と本体の別所有、生成中の編集 lock、失敗/取消の旧本文保持、成功後の本文限定 undo は既契約へ接続する。quota/recipe/prompt/版保持期間は変更しない。
- source origin を耐久保存し、旧 local 行の互換と新 Drive 行の欠落拒否を分ける。LLM worker/preview が現在直接読む `original.storageKey` を無条件に使い続ける構成は不可。
- backup data 枠を取得と共有する方向は採用可能。control と LLM 枠を混ぜず、実 close/DB 保存/caller 終端/ACK と unknown 保持を維持する。

## 現実装で成立している部分と古い前提の補正

| 論点 | 現 source の事実 | 計画への反映 |
| --- | --- | --- |
| record identity | `DriveBackupRecord` は version=1、target/note/original/account/sub/file/folder/bytes/hash を持つ。0039 update guard は更新を拒否し、record→target/note/original は RESTRICT | immutable locator/fingerprint の土台は既成立。record に更新版や同一内容の列を重ねて追加する必要はない |
| resource-key の寿命 | `backup/runner.ts:680` 以降は record 作成時に folder/file key をそれぞれ専用 purpose、account/sub/recordId/fileId で保護。`DriveSecretBinding` のこの枝に epoch はない | 計画の「旧 epoch を復号来歴に使ってもよい」は現 record には不要。専用 record key binding をそのまま利用し、target の folderEpoch や現在 connection folder の AAD で復号しない |
| current head | 0041 は tuple ごとに current target head を追加。retarget は全履歴に record があれば拒否し、旧 target/terminal は不変。head は初回/backup retry/admission/current のための参照 | 再生成は利用者が選んだ record ID を正本にする。`targets.original()` で最新 head に差し替えず、head 更新/90 日 job prune を理由に別 record を選ばない。record の target との構造整合は検査するが、backup の current folder/epoch guard を再生成へ流用しない |
| 記録本人退会後 | record/target の account_id は account FK cascade を持たない。record 本体は解除や job prune で消えず、note purge 時に回収する。現在 Account の状態は unverified/verified だけで、退会本体は未実装 | 存続 note の record から account 欠測/利用不能を有限に判定する方向は保てるが、「退会経路確認済み」とはしない。新しい退会 tombstone 表や record 列をこの案だけで要求しない |
| 退会の他参照 | backup request と connection は account に RESTRICT を持つ。record に cascade がないだけでは account 削除の手順全体は成立しない | 後続退会側で新 source binding の失効/実終了と既参照の整理順を接続する。今回 account delete や FK 緩和を前倒ししない |

根拠：[record 型](../../packages/core/src/domain/integration/driveBackup.ts:378)、[record DDL/guard](../../packages/core/src/adapters/libsql/migrations/0039_drive_backup.sql:218)、[head DDL](../../packages/core/src/adapters/libsql/migrations/0041_drive_backup_target_heads.sql)、[record 暗号 binding](../../packages/core/src/application/integration/drive/ports.ts:9)、[record 作成](../../packages/core/src/application/integration/drive/backup/runner.ts:680)、[account 型](../../packages/core/src/domain/account/entity.ts:15)。旧実行結果/DB/鍵は読んでいない。

## 実装前に具体化する最小差

### M1：record 候補 port と現在認可

現 [RecordRepository.forNote](../../packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts:1063) は note＋account で絞る本人 backup 読取用で、最大 100 件・keyset/cursor なし。IN-07 の別メンバーの記録選択へそのまま使えない。これは現在 P5c-2 の不具合ではない。

最小案は再生成用の現在編集認可済み一覧を追加し、note 内の全記録者を対象とする安定 keyset・有限 page/DTO bytes と exact record lookup を定義すること。既本人 backup/history port を他人の job 読取へ広げない。候補は locator、本人か否か、有限 availability/reason だけを基本にし、account/sub/email/resource-key を client の資格選択入力にしない。101 件目等を黙って候補外にする実装を避けるが、UI で 100 件を超える実データを作る試験は不要。

受付/claim/再取得/本文採用で、現在実行者の編集権限・note lifecycle/ownershipGeneration、exact record/note/original/fingerprint、記録本人の存続・同 sub の現在接続、受理 epoch を照合する。現在 backup folder/settingsVersion や記録者自身の現在 note 編集権限を継続条件として加えない。新明示要求は同 sub の新 epoch を使えるが、旧要求を再連携成功後に移管しない。

### M2：source-origin と機械結果の最小耐久モデル

[LLM current](../../packages/core/src/application/llm/current.ts:32) は Original identity/activeJobId と現在 LLM 資格を検査し、[worker](../../packages/core/src/application/llm/worker.ts:192)、[PDF preview](../../packages/core/src/application/llm/pdfPreview.ts:398) は local storageKey を直接読む。差分は reader の一時差替えだけでは足りない。

次の具体型/保存表を一案に固定してから実装を委譲する。

| 最小責務 | 固定する内容 |
| --- | --- |
| SourceAccess | `local-original` / `drive-record` の閉じた union。Drive は record ID/内容 fingerprint、credential owner/sub、受理 Drive epoch、note/original/所属世代を server で固定。current の credentialVersion は実使用 CAS と分離し、通常 refresh を epoch 失効としない |
| 耐久 source binding | conversion/preview/機械要求のどれが所有するかを識別し、discriminator＋明示参照を保存。新 Drive 行は binding 必須、欠測→local fallback 禁止。旧 local 行だけを限定 backfill。record key/secret の複製はしない |
| regeneration source attempt | exact logical request と source binding に属する read phase/version/cancelGeneration、none/active/unknown/closed の owner、runtime/token、実使用資格版、閉鎖/ACK・保持量を合法な union/CHECK にする。preview と conversion は別 owner。再取得は旧 owner の終端後の新 owner とし、同 command の既 receipt を新 intent に読み替えない |
| 機械 branch | 専用の要求/receipt/terminal result/undo 参照と、既 Original.activeJobId/本文 lock に接続する方法を固定。架空の llm_conversion や既 import 失敗更新の流用で代用しない。機械 quota=0、本文 commit/undo の意味は既契約のまま |

上表は必要な責務であり、4 新表を要求していない。binding と read owner の同一行化等は可能だが、LLM recipe/quota の再設計へ広げない。新表数、既 conversion/preview への追加 discriminator/FK、機械結果の置き場所、migration 番号、旧列/NULL/guard 保持・rollback は未確定であり、DDL 採用前に exact 差を提出する。原本の storageKey 書換え、新 Original、永続 spool/cache は本案どおり不要。

### M3：共有 data 枠と閉鎖回復を全入口で同じ契約にする

現 [NodeDriveExecution.withCaller](../../packages/core/src/adapters/node/drive/execution.ts:163) は合算 3、`kind === backup` の 1 とそれ以外の 2 で分類する。新 kind を union に足すだけでは download が control 側へ誤計上される。[backup claim](../../packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts:913) は backup transfer だけを数え、[閉鎖照合](../../packages/core/src/application/integration/drive/runner.ts:375) も authorization/control/backup だけを復元する。

最小案は既 execution/coordination に `regeneration-source` の閉じた target を加え、lane 判定を明示すること。backup＋source の data global1/credential-owner account1、control global2/account1、合算3/同 account2を維持する。新 pool は作らない。DB claim/held/refreshing、runtime entry/resource 数、deadline、proof/caller/ACK、前任終了、maintenance/reconcile、stop の全 switch/scan をこの同じ分類へ接続する。unknown は双方の枠へ残す。

source read の資格 owner は記録者、LLM quota/owner は実行者。現在 refresh の参照先は control/backup に限定されているため、新 source の refreshPending も同一資格版の排他へ含める。subscriber は claim 前又は閉鎖 ACK 後だけ有限待機し、owner の通信枠を借りない。

最終本文採用前の metadata 再検査も実 read owner/枠/閉鎖証明が必要であり、生成中に最初の Drive owner を保持し続ける構成にしない。閉鎖後に DB current/CAS を検査して本文を採用する順を state 表へ書く。外部観測と DB commit の間の競合を消せると保証しない。

50 MiB verified buffer は現 reader 上限の流用候補で、data global1 だけでは生成中の buffer/分類 child/LLM copy の総量を制限しない。次の実装案では既 LLM 同時枠と機械枝/preview の保持数を使った合算 bytes・copy・解放時点を示す。新しい業務上限の採用ではなく、既案が要求した有限資源の具体化である。

### M4：取消影響集合と別実行者への失効

現 [backup cancellation](../../packages/core/src/application/integration/drive/backup/cancellation.ts) と [connection confirmation](../../packages/core/src/application/integration/drive/connection.ts:60) は backup job/transfer を対象とする。新 source binding は現在の backup cancel を呼ぶだけでは失効しない。

最小案は source binding に対し「記録資格 owner＋受理 epoch」と「実行者＋現在 note/scope」の両方から同 Tx fence できる port を設けること。成功 relink/disconnect、実行者失権/trash/purge/WS 削除/ownership 変更、LLM 枝だけの OpenRouter 失効へ接続し、commit 後 exact owner abort/wake を通知する。Drive folder の通常設定変更は既 record の source を失効させない。記録者だけの WS 脱退も別 actor の再生成を恒久拒否しない。

再連携確認 DTO/digest/採用時の再照合集合へ、他人の本文や job ID を漏らさない件数/種別として新 source 影響を加える。source 受付による確認後集合変更を検知できる revision/集合 digest の更新順まで固定する。失敗候補は旧 source を維持し、成功 Tx だけ旧 epoch を失効させる。退会側の呼出接続は後続本体の未完として明記し、退会したと偽装する UI/fixture を製品へ足さない。

### M5：record/全世代 purge と履歴 prune の順序

[PurgeRepository.hasWriters](../../packages/core/src/adapters/libsql/repositories/purgeRepository.ts:318) は既 backup/LLM/preview 等を検査するが新 source owner を知らない。[targets.purgeNote](../../packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts:753) は全世代を対象に head→record→transfer→target を回収する。新 FK だけ加えると、保護不足又は terminal 履歴で永久 purge 拒否が起き得る。

最小契約は、新 source の active/unknown/未 ACK、生成側の非 terminal/実所有を purge 判定へ含め、note purge intent の同 Tx 取消→全関連所有の終端→新 source 参照の安全な削除/履歴 redaction→既全世代回収の順にすること。request/history の 90 日と owner 安全行の寿命を分け、unknown を履歴期限で消さず、旧 terminal 履歴も永久 record pin にしない。preview 期限も同じ分離を守る。

source binding の record FK は有効期間に exact record を保護するために使うが、terminal 履歴の note purge 時 redaction/参照解除を明示する。record は note が存続する限り job prune 後も候補に残す。record に旧 job を逆参照させて循環保持にしない。現在 head だけの回収へ戻さず、旧 target/history/record を含む全世代を扱う。

## 比例検証と借用の境界

実装採用後の新規直接対は差分に絞る。既 P5c-2 全転送、既 LLM recipe/quota/undo の成功済み全組合せを再演しない。

1. 純/mapper：local legacy と Drive binding 欠測拒否、別 actor/同 sub/新 epoch、候補 keyset、owner/lane、失効 DTO の非秘密・有限 shape。
2. 隔離 DB：binding/receipt/同 command と競合 CAS、別実行者の成功 relink/解除 fence と rollback、head/record 非差替え、90 日と unknown、全世代 purge、旧行 backfill と SQL/FK rollback。
3. 自己 HTTP/実 adapter：固定 blob 入力の全 bytes/hash と metadata 前後差、途中切断/close 不明/caller ACK、backup と source の共有枠・control 非占有。source が閉じても生成 worker の未終端を成功扱いしない。
4. 小同 bundle UI：別メンバーの record を明示選択、旧本文警告、pending/失敗保持、成功本文/undo/再訪。local source を成功入力にできない対で Drive bytes 由来を確認。PDF は既 preview 契約へ入る差だけ比例確認し、音声を含めない。

これらは実行許可ではない。新 root/DB/helper/HTTP/原本/buffer/worker/browser/停止保全の exact 数値は別計画で採用する。P5c-2 A/I 未完や旧工具失敗を P5c-3 の成功・新欠陥へ振り替えない。

## 外部仕様と最終返却

案の Google `files.get alt=media`、canDownload、parents、checksum、resource-key/shared Drive の記述は、案に記載された過去資料調査の前提として扱った。本担当は外部資料を再確認しておらず、実 Google 権限・blob 取得・metadata 一貫性・SDK・LLM 品質/費用の成立は未確認。現 JSON 用 `NodeDriveHttp.read` の上限を binary 用へ緩めず、専用内向き download port/adapter を分ける方向は妥当。外部 API、scope、課金の追加許可はない。

方向採用に利用者への同じ仕様質問は不要。Manager が M1–M5 の具体型/保存/lane/取消集合/寿命案を採用した後に、実装 exact path・DDL・比例検証資源を別途固定する。本報告のみを作成し、製品/管理正本変更、test/build/import、DB/runtime/HTTP/browser、旧 private/鍵/結果の読取は 0。終了時 candidate/tracked 状態を照合後、文書を含む全操作を停止する。
