# P5d 再開の詳細化案

結果は計画候補。Manager が共有契約と範囲を採用するまで製品実装へ進まない。AC-09、[既採用方向](../contracts/account-delete.md)、[現行接続案](P5d-current-plan.md)、[境界](P5d-boundaries.md)を入力とする。2026-10-06 の公開 tracked source を静的照合した。読取時 HEAD は `a2434806594007a6ca8cd1609c910451bfba7066`。S3 の作業ツリーは進行中であり、固定候補の証明ではない。適用前に S3 の受入 commit との差を確認する。

## Manager の採否点

1. 既採用の accounts 縮小枝を下記の保存型へ具体化する。認証 Account は active-only、人物表示は別 projection。既 ID/FK を残し、email/password/createdAt を偽値で埋めない。
2. Drive は **限定 redacted 遷移**を第一候補とする。退会 actor の current head は閉鎖後に除去し、既 target/record ID を持つ取得不能 shell を保持する。全 account への provider-binding ID 基盤や秘密 sidecar の一括導入は今回不要。通常 active の subject tuple/AAD/不変保証は維持する。
3. 退会受理と回収を分け、`active fence → 既 owner の実閉鎖と ACK → 全世代の有限 keyset 縮小`を最初の縦 slice とする。unknown を期限で closed にしない。新移行の実行方式・資源は別途採用し、旧データを材料にしない。

## accounts の正式型・DDL 候補

ドメインの認証用 `Account` は現行の verified/unverified と AuthenticationMethods を維持する。保存境界にだけ次の判別枝を設ける。

```ts
type StoredAccount =
  | Readonly<{ kind: "active"; account: Account }>
  | Readonly<{
      kind: "deleted";
      id: string;
      authVersion: number;
      deletionId: string;
    }>;
type AccountIdentityState =
  | Readonly<{ kind: "active"; id: string; authVersion: number }>
  | Readonly<{ kind: "deleted"; id: string; deletionId: string }>
  | Readonly<{ kind: "missing" }>;
```

`accounts` に `state` と `deletion_id` を追加し、email/created_at を nullable に再定義する。CHECK は active 時に email/created_at 非 null・deletion_id null、deleted 時に email/password_hash/created_at/verified_at null・deletion_id 非 null、両枝で auth_version を正の安全整数とする。既 active の email unique はそのまま使える（null は再登録を妨げない）。Google-only active の password null は正常であり、accounts 単独 CHECK に password 非 null を要求しない。

専用 `account_deletions` は account_id unique、opaque intent ID、fence authVersion、phase/cursor/version、再試行時刻と必要な owner debt 参照を持つ。本文/email/profile は持たない。accounts の `(deletion_id,id)` と intent の `(id,account_id)` の同一人物対応を deferred FK 等で保証する。受理 UoW で intent 作成と active→deleted/version+1 CAS を行い、deleted→active/ID変更/任意削除を拒否する trigger を新移行へ置く。account anchor の物理削除は本 slice に含めない。

現 0032 の accounts 再構築をコピー実行せず、現在の全 FK・trigger を保つ新移行として検証する。新しい合成 DB で 0043 までの基底→候補移行、row/FK 対応、unique、rollback、active/deleted 正負 CHECK を確かめる。既 migration/metadata は書き換えない。移行番号と runner の FK/Tx 条件は実装前に正式確定する。

`findById/findByEmail/findByGoogle` と session lookup は active-only。deleted row を `toAccount` へ渡さず、型境界で active 必須列を確認する。`issueSession` の古い Account snapshot からの insert を防ぐため `saveSession` に期待 authVersion を渡し、active とその世代を同じ Tx の保存条件にする。`markVerified/setPassword/linkGoogle/unlinkGoogle`、attempt/callback 採用、profile/displayName 保存にも active 条件を置く。関連 table の直接 insert/update guard が deleted anchor を認証主体に戻せないことも必要である。

## 共通 fence と受理境界

共通 port は人物状態の読取と専用退会 CAS。純 domain に SQL/registry を入れない。application の actor/current scope/cleanup authority は用途を分け、adapter の直接 claim/保存条件にも同じ state 正本を接続する。

| 用途 | 必要条件と主な差 |
| --- | --- |
| actor | requireAccount/captureAuthentication、session発行、認証/連携callback、import/編集/backup/export/再生成の新受付・claim・結果採用が active と現在世代を要求 |
| current scope | `scopeRole/canScope` は actor active を確認。personal は owner active、WS は WS active と active membership。`sharingRepository.scope` の accounts 存在だけの条件を active に変更。匿名 public/link、媒体、原本、grant、artifact/delivery の current判定まで接続 |
| 人物表示 | `displayNameRepository.author` と private/public projection が明示 deleted を「退会した利用者」へ。missing/unknown/unset/WS脱退/非可視を一律 deleted にしない。旧 profile/icon/author URL は取得不能、handle 再取得者へ旧著者を接続しない |
| cleanup | session不要の intent/current owner/対象世代/locator に束縛した専用権限。uploader/creator/accountId 一致による横断 DELETE は禁止 |

受理 UoW は現在本人と canonical email 一致を再確認し、active WS に本人が唯一の **active account owner** であるものがないことを EXISTS で検査する。membership 変更/WS削除/二人ownerの同時退会と同じ正本で競合させる。session/認証challenge/Google identity、公開profile/handle、membership を失効し、全世代取消と回収 intent を同時保存する。大きい note/job 集合を JS 全件列挙しない。

note 移動は退会 fence と同じ Tx 境界で current owner を再確認する。先に WS/他人へ移った note は保持し、先に本人 personal に入った note は回収対象。受理後の移入/移出/create/bind/publish を拒否する。commit 後に exact owner へ abort/wake を通知するが、通知失敗・response欠落を受理 rollback/復活にしない。共有 browser 正本を無差別削除せず、当該認証の再採用を防ぐ。

## Drive 全コピーと閉鎖後の必要性

下表は読了した `driveSchema.ts`、`driveBackupSchema.ts`、domain drive/driveBackup、`regenerationSchema.ts`、現 repository/0039–0043 からの保存コピー一覧。メモリ/外部応答の保存を新たに追加する理由にはしない。

| コピー | 生 subject / 秘密 | 閉鎖前の必要条件・閉鎖後の処置 |
| --- | --- | --- |
| drive_connections | credential.subject/email/envelope、folder.resourceKeyEnvelope/name | 新利用は受理で禁止。旧 owner が binding/世代を照合する最小 debt が必要なら閉鎖まで隔離保持。終了後 credential/folder を通常 unlinked 形へ縮小、再連携は禁止 |
| drive_authorization_attempts | data.verifierEnvelope/candidateEnvelope、confirmedFolderIdsEnvelope | 受理で callback採用禁止。pending/candidate は正式 failed 遷移で秘密を除く。exchanging active/unknown は exact owner の閉鎖証拠を保持して失敗終端へ。candidate 内の生subject/emailも消える |
| drive_control_operations | subject、data.resourceKeyEnvelope/targetKeyEnvelope、選択/生成targetName | active/unknown owner と credentialUse のbinding/versionを区別。閉鎖後は正式 terminal失敗data又は専用縮小枝/正規pruneで秘密と生subjectを除去。通常replaceの不変subject制約を流用しない |
| drive_backup_targets | subject、folder 全snapshot中の resourceKeyEnvelope/name | 歴史targetも対象。closed/never-ownedの全参照を確認後、headを除去し既target IDのredacted shellへ。confirmedは業務成功来歴として保持するが、新取得可能なtargetとして読まない |
| drive_backup_target_heads | subject（秘密envelopeなし） | active の `(original,account,subject)` current tuple。不可逆退会後の new admissionには不要。専用 intent と全依存閉鎖を条件に head を除去し、raw subject を残すための新opaque基盤は作らない |
| drive_backup_jobs.admission_identity | subject、folder.resourceKeyEnvelope/name、storageKey等 | queued取消→terminal、依存transfer閉鎖を待つ。期限が来ただけでは削除しない。専用deletion縮小で admission identity を除くか正規prune。存続noteのrecordId/outcomeは別shellで保持 |
| drive_backup_transfers | identity.subject/folder.resourceKeyEnvelope、session_envelope | terminalだけで十分ではない。owner none/closed、readPinned/refreshPendingなし、active object_writesなし、必要proof ACK後に正規削除又は専用redacted receiptへ。session-envelopeだけnullにして identity コピーを残さない |
| drive_backup_records | subject、folder.resourceKeyEnvelope、resource_key_envelope、webViewLink（queryにkeyを含む可能性） | 存続WS/移動済みnoteではrecord行を「なし」にしない。既record/target/note/original/account ID・必要な成功来歴をshellへ保持し、subject/folder/envelopes/webViewLinkを取得可能枝から除去 |
| regeneration_source_bindings | subject、credentialOwnerId/executorId/recordId | recorder退会は executorが他人でも現在sourceを失効。全source attempts/consumer終了・callerEnded/acknowledged・receipt解放までbinding照合を維持し、後に正規remove又はredacted bindingへ。S3のfinal差を適用前に確認 |

生 subject は暗号 token/key ではないが provider 本人識別子であり、opaque account anchor の必須情報ではない。現在必要なのは active head tuple、同Drive本人照合、secret protectorのAAD、transfer identity、source-binding/fingerprint照合である。不可逆退会・全owner閉鎖後はいずれも新通信/新受付の用途を失い、既target/record IDで有限な取得不能来歴を表せる。unresolved閉鎖debtへ残すのは当該bindingの検証に必要な最小subject/世代だけで、anchor存続を永久保持理由にしない。Google login identityの削除だけでは上表を回収できない。

## 保存方式の比較と最小追加型

| 方式 | 全コピー・guard差 | 判断 |
| --- | --- | --- |
| 限定 redacted | active保存形式とAADを維持し、deleted actorのみtarget/recordの取得不能枝を追加。headの専用除去、job/transfer/control/source-bindingの閉鎖後縮小を追加。0039 target/record/transfer、0040 admission identity、0041 historical/head guardへ限定例外が必要 | 今回の第一候補。通常全accountのmapper/secret locatorを置換しない。例外が旧bodyの一般更新権限にならない証明が受入条件 |
| secret sidecar | snapshot中のpayloadをsecret参照へ移し、各purpose/AAD/複製意味に対応するsidecarとread resolver/guardを追加。旧column/JSONにenvelopeを残せない。subjectをsidecarへ移すならhead/target/source-binding等の通常キーも置換が必要 | 秘密DELETEと来歴不変を分離しやすいが、退会以外の通常保存経路へ広い移行が及ぶ。今回の最小差ではない。sidecar追加だけでは回収成立しない |

追加する shell は `DriveBackupRecord` の生 subject を nullable化して全callerへ渡すものではなく、専用 `RetainedBackupRecord = usable | recorder-deleted` の読取型とする。deleted枝の最小候補は `{id,targetId,noteId,originalId,accountId,deletionId,createdAt,kind:"recorder-deleted"}`。必要な成功fingerprint（bytes/sha256）と外部fileIdの保持範囲は「存続noteで来歴の同一性を示す」用途でのみ採用し、通常取得入力として使わない。folder名/key/email/subject/webViewLinkはshellに入れない。target shellも既id/元note-original/account/業務outcome/deletionIdのみを基本とし、新しいfile/folderへの付替えを禁じる。

新DDLは activeの旧CHECKとredactedのnull制約を分ける。record v1の不変内容を普通のreplaceで書換えず、storage redaction世代/専用遷移を別に設ける。旧不変locatorは維持し、payloadの唯一の削除遷移だけを intent→deleted人物→全依存closure の条件で許す。redacted→usable、残存head、他actor/recordへdeletionId付替え、部分envelope残留を拒否する。現 repository `find` が旧schema parseへ渡す前に枝分けし、退会状態を先に判定して `source-invalid` ではなく有限な recorder-unavailable を返す。

縮小条件は actor単位の全履歴数を仮定しない。fenceを最初に確定し、table段階とkeyset `(id)` 等を永続cursorへ記録して25行ずつ候補を選ぶ。各候補でclosureを同Tx再確認し、止まるdebtは別locatorで保持し他の候補へ進む。最後はcursor通過だけでなく全世代の未縮小/未閉鎖残存EXISTSを再確認する。後から受理前ownerの終了結果が届いても未縮小copyを再発見できる。unknownはcompletedへ飛ばさずwaiting-ownerのdebtとして残す。

## 実装可能な段階と exact 依存

| 段階 | 観測できる候補完成条件 | 依存 |
| --- | --- | --- |
| D1: fence + 閉鎖 + record shell の最初の縦slice | 本人email確認→退会受理→旧cookie拒否/個人public-link404。WS note/原本/recordのIDと他memberアクセスを保持し退会者表示へ。閉鎖不明中は取得不能だがdebt保持、自己契約ownerの閉鎖ACK後に全Driveコピー/subjectが除去されshellが残る | Managerの本保存型/範囲採用、新accounts/Drive保存型移行の成立確認。S3受入commitのinput receipt/sourceHeldSql/callerEnded/ACK契約。現P3f正規purge・afterCommitの通知限定契約。Drive実接続/UIの完成は不要 |
| D2: 個人データ有限回収 | personal current scope/trash/未bind本人draft/export/icon/tagを正規回収。共有companion/charge/pinの規則を維持。移動済み/WSデータ保持 | D1。`PurgeIntent`/purgeSchema/入口へ account-deletion causeとintent参照を正式追加。workspace-deletion/manualを偽装しない |
| D3: 退会UIと統合検証 | 設定最下部の説明・メール入力・pending/error・唯一owner案内・即時signout。処理中jobあり/ACK欠落/再読込でも復活なし | D1/D2、全admission/結果採用/公開取得へのfence接続一覧の独立照合。contract合格を外部delete/revoke実行許可へ読み替えない |

D1も公開入口の部分fenceを完成として露出しない。製品UIの一般提供は必要接続が揃ったD3。S3中のsourceHeldSqlはclosedでもcallerEnded又はacknowledged不成立ならheldであり、`ownerState=closed`だけの縮小条件にしない。D1の前に source bindings/attempts/consumer の専用終了手段とFK順序を現受入candidateへ照合する。

## 最初の有限検証案

未実行。実サービス/音声/送信/課金は0。Managerが事前採用する上限案は logical DB3個・合計64MiB、objects8MiB、Worker2個/同時1、1run最大12分。期限到来後は自己所有exact process/FDの終了とDB確定を確認し、失敗rootは保持、再利用せず報告する。新buildが必要なUI検証はD3へ分け、ここでbuild許可を推定しない。

1. 合成active password/Google-only accountと存続WS原本/FKを候補移行へ通し、ID/所有/charge不変。deleted正形と不正null/復活/late資格・session挿入、email/handle新account再利用を有限表で検証。
2. email不一致/唯一ownerは受理0。二人owner同時退会・owner降格との二順序はownerゼロ成功0。WS削除受理済みの回収は継続。
3. 自分のpersonal公開/限定/媒体アクセスは受理直後404、旧session/遅callback/新claim/結果採用は拒否。他人/WSへ移動済みnoteと原本/record locator、他memberアクセスは保持、退会者表示とauthor URL失効を確認。
4. 自己代替Drive owner active→unknown、cancel通知throw、response欠落の局所対でログイン復活0・debt誤閉鎖0・pin/secret premature回収0。自然閉鎖・proof ACK後だけ縮小可能。source owner closed/caller未終了又はACK未確定もheldを維持。
5. 51件（cursor25行を3page）の全世代target/record/job/transfer/controlコピーに合成sentinelを配置し、途中停止→新runの再発見で全回収。秘密文字列を報告せずcount/枝/存在だけ確認。歴史target/confirmed recordの通常update、別actor intent、active actor redaction、縮小後再取得/復活を拒否。
6. Driver/実行器は自己代替のみ。外部fileのdelete/trash/move/revoke呼出数0、退会者recordはbackupなしへ変わらず有限な取得不能、新account同subで旧record取得0。有限ケース終了後に typecheck/lint/format を担当変更範囲と既全repo規約に沿って実行し、独立Verifierが対象commitとの差を確認。

各ケースの成功/失敗/未実行を区別し、合成DBの移行成功を旧保全データ移行完了へ読み替えない。今回変更は本書のみ。製品/DDL/test/DB/runtime/build/外部操作、全体管理文書/goal API、補助agent起動は0。
