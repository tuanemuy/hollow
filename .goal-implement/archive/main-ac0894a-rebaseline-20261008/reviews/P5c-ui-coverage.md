# Drive残UIの受入根拠対応表

2026-10-05T21:28:53Z。C=`c2a3d45f1097533c6344346aca303dc1d2aef368`、新3488Bのrelease SHA256=`93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0`。**U0–U7の実UIは未実行**。helper F1–F6補正・固定候補の独立delta preflightを起動gateに残す。本書は受入準備であり、criteriaの新規合格判定ではない。

[P5c-1 A–F](../criteria/P5c-1.md)、[P5c-2 A/E/I/J](../criteria/P5c-2.md)、[採用実行計画U0–U7](../phases/P5c-ui-execution-plan.md)と公開レビューの最新要約だけを対応づけた。下表の「既受入」は今回の借用範囲であり、旧担当の直接結果・主報告借用を区別した各レビューの限界も継承する。旧原証跡の再読や現在bundleでの再実行を意味しない。

| 固定条件 | 既受入から借用する範囲 | U0–U7で直接埋める予定の残差 | 引き続き残す境界 |
| --- | --- | --- | --- |
| P5c-1-A 本人認可 | S2修正の本人/browser/世代/epoch・遅着/不明拒否、S5a/S5b-1のcurrent actor局所対。S5b-2/3の合成初回認可は部分UI根拠 | U0–2の通常新本人認証・初回Drive認可、U3の保存先を持つ失敗relink→同sub成功relink。current/receiptと旧設定保持・epoch増を確認 | 実Google SSO/別account/grant・必要scope/refreshの実サービス境界、Googleログインの実外部継続。合成provider認可をその代行にしない |
| P5c-1-B 保存先 | S5b-2のshortcut/再起動表示、S5b-3のtrash/missing案内・正常selection ACK不明後の純GET/明示確認 | U0–2のtrash復元案内→Picker再選択、確認取消POST0、metadata404の削除断定0。U4の作成metadata/親確認 | 実Picker SDK・Google書込能力検査、権限/一時障害の全実UI枝は今回小系列だけで完了にしない |
| P5c-1-C 同ID作成 | S1/S2修正とS5aの永続operation/ID・unknown/close局所根拠。既selection ACK成功はfolder作成成功とは別 | U4の事前ID1、最初のPOST応答不明/実close、GET副作用0、inspect404、再送確認取消0、同IDの2回目POST→metadata確認→保存 | 新process再起動・409・全rate/期限枝をU4で直接実行した扱いにしない。実外部folder作成は未検証 |
| P5c-1-D 独立解除/再連携 | S5b-3 Uの未構成unlink後同document更新・reload・資格/folderなし/OFF、S1/S2取消guard | U3の失敗relinkで旧接続/処理継続、成功だけ旧backup取消と実close/ACK。U6はPicker controlの正規取消/再開 | 今回unlink追加0。既unlinkを再開しない。Google login保持/combined revoke0の既局所根拠と実外部未検証を分ける |
| P5c-1-E UI/秘密/寿命 | S5b-2主観測のSSR/hydration nonce・限定CSP・390px/Tab・dirty/pendingを独立報告の借用範囲で保持。S5b-1/2-fixのcurrent actor/ABA/dirty/ACK局所対、S5b-3のmutation後現在GET/表示更新・未構成表示 | U0–5の同bundle正常DOM/現在GET、U6の実navigation/pagehide/Back・自動issue/selection0、正規cancel→currentGET→明示restart | BFCacheはpersisted=trueの実旧SDK callbackが成立した場合だけ直接証拠。reload Backでは旧realm callback未検証を保持。新390px/keyboard/nonce全再演は予定しない。実SDK/token全境界は未検証 |
| P5c-1-F 型/品質/停止 | S1/S2/S5aと表示修正の型・rollback/局所対、S5b-3の通常未構成productionと注入同bundleの部分UI/停止保全。[新3488Bの独立静的binding](P5c-ui-plan.md)は成立、checks/build出口/closureは主直接記録の借用 | U0–6の同C/B契約providerでの実HTTP/UI、U7の今回自己資源全終了→opaque/audit一回・既知ID/列・FK/integrity/所有状態 | 静的bundle成立は今回boot/UI成功ではない。configured通常factory・実Google同意/Picker/書込/審査・actualfresh0038保持移行は未検証 |
| P5c-2-A 本人backup/current | S1/S2のWS editor/viewer/他actor/原本なし・未開始取消。S3統合UI2のpersonal手動保存/link/revisitは受入済み。retarget head差のA UIは未完 | U0–2の通常2upload/原本ready、U5のF2へ明示新受付→成功record/link/reload、current head/versionと旧結果保持 | WS/他actorの既局所根拠を今回personal UIの直接結果にしない。realGoogle保存成功は未検証 |
| P5c-2-E 取消hook/旧継続 | S2/S3の通常refresh/subscriberと同Tx取消8hook・rollback/unknown/実所有の既受入・主局所借用。configured再連携UIは残件 | U3のlive held backup下で失敗relink不変/継続、同sub成功で取消、実socket/source/caller close→ACK。旧target/job/transferを正規読取のmemory baselineと比較 | 降格/除名/脱退/trash/移動/WS削除/解除の全matrix再演ではない。fixture成功値で閉鎖を代行しない |
| P5c-2-I 理由/回復 | S3 UIのquota→同IDretry成功、既理由表示。retarget V1の初回not-started分類・安全契約は局所受入、retarget A/I実UIは未完 | U0–2の初回に旧unknown説明0、trash/曖昧404の正規BackupPanel案内、U4の同IDfolder作成、U5の確認付き新保存先受付（取消POST0・旧履歴保持） | 権限/quota/rateの全実UI枝を新系列だけで完了にしない。無断代替/外部delete0を維持 |
| P5c-2-J DDL/品質/保全 | 0039/0040・retarget0041等の既限定DDL/rollback/局所根拠。S3 backend A–Dの直接P/app/native/auditと新Cへの不変更継承、新B静的Eは各正式レビューの範囲 | U7の新空正式DB、全自己実close/checkpoint後の一回copy、query_only/readOnly audit・正式列/既知DTO-ID JOIN・原本/履歴/owner/pin保持。通常終端と強制停止を分ける | 新空0043の成功はactualfresh保持移行の成功ではない。失敗root/過去pipe・監査欠測を補完しない。運用/全runtimeの完成判定は別 |

## 借用と残差の扱い

主要参照は [S5b-2部分UI](P5c-1-s5b2.md)、[表示修正](P5c-1-s5b2-fix.md)、[S5b-3部分受入](P5c-1-s5b3.md)、[S5b-4残件](P5c-1-s5b4.md)、[P5c-2 S3の最新統合UI2/固定F受入](P5c-2-s3.md)、[retarget最新判定](P5c-2-retarget.md)、[現S3正式根拠](P5c-3-s3.md)。過去差戻しV1は後の局所修正/部分UIを参照し、旧失敗を新成功に振り替えない。

U0–2=通常準備/初回/理由、U3=再連携とlive取消、U4=同ID作成回復、U5=新保存先受付/current、U6=document寿命、U7=停止/保全。新root256MiB・全12分・固定mutation/Worker/通信counts内の一系列であり、残budgetは追加case許可ではない。autoON/unlink/追加relink/再boot0。P5c-2 B/C/D/F/G/Hの既受入を好みで再開しない。未構成/390px/keyboard/nonceの借用を理由に、今回U0–7を実行済みとはしない。

実Google/SDK/外部書込・メール/LLM等は非接続、音声の個別保留を維持。U6がreload Backだった場合のBFCache欠測、途中stage不足、正常close不足は各未検証として残し、全要件acceptへ拡張しない。

本準備は公開criteria/phase最新要約/reviewのみ読取。本書以外の編集0、修正中helper・製品source読取0、旧failed/private/root/DB/artifact/proof実物操作0、新root/runtime/browser/build/test/probe0。本書保存後、全read/writeを停止し候補固定delta委譲待ち。
