# P5d 退会の正式実装案

本書は Manager 採用前の提案。入力は [再開案](P5d-resume-plan.md)、[採用済み方向](../contracts/account-delete.md)、brief/plan の R11/AC-09、R07/R08/R12。指定された候補 `c2a3d45f` を前提に公開 source を静的照合した。製品、共有契約、全体管理文書は変更していない。新 migration、検証資源の生成・実行も未着手。

P5d は「本人が退会を受理され、即時に認証・利用権を失い、個人データと連携資格が永続回収され、存続 WS と移動済みノートは残る」を一つの実装フェーズとする。内部の実装順は保存境界→原子的受理→全入口 fence→有限回収→UI。入口が部分接続の候補を一般提供しない。既 244/S3 の無関係な受入を再演しない。

## 保存型と共有契約の提案

認証用 `Account` は active-only の現 verified/unverified 型を維持する。保存正本と人物表示は別型にする。

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

`AccountRepository.findById/findByEmail` は deleted を `null` として認証 projection に渡さない。保存 mapper は state と nullable column を境界で検証し、active 行だけ `Account` へ構築する。人物状態の `identity(id)` を同 port に追加する候補とする。`DisplayNameRepository.author` は明示 deleted のみ「退会した利用者」、missing は unknown、active の名前未設定は unset。存続 WS の author ID は保持し、旧 profile/handle URL は付けない。

新 `AccountDeletionRepository` を UoW に追加する。`accept({id,accountId,expectedAuthVersion,now})` は本人 active CAS と最後 owner 検査を原子的に実行し、`claim/step/ownsPersonalNote/linkPurge/debt/finish` は intent・lease・version・対象 locator に束縛する。cleanup は session/`requireAccount` を使わず、退会 intent の専用権限で行う。汎用管理者権限や uploader/creator 一致の削除権限を追加しない。

```ts
type AccountDeletionStage =
  | "cancel"
  | "personal-notes"
  | "drafts-and-artifacts"
  | "source-bindings"
  | "drive-history"
  | "credentials"
  | "verify";
type AccountDeletionTables = {
  cancel: "conversion-jobs" | "reference-jobs" | "llm" | "pdf" | "zip";
  "personal-notes": "notes";
  "drafts-and-artifacts": "uploads" | "icons" | "exports";
  "source-bindings": "source-attempts" | "source-bindings";
  "drive-history": "controls" | "jobs" | "transfers" | "heads" | "targets" | "records";
  credentials: "auth" | "google" | "openrouter" | "drive" | "profile";
  verify: "residuals";
};
type AccountDeletionCursor = {
  [S in AccountDeletionStage]: Readonly<{
    stage: S;
    table: AccountDeletionTables[S];
    afterId: string | null;
  }>;
}[AccountDeletionStage];
type AccountDeletionIntent = Readonly<{
  id: string;
  accountId: string;
  fenceAuthVersion: number;
  acceptedAt: Date;
  version: number;
  cursor: AccountDeletionCursor;
  nextAttemptAt: Date;
}> & (
  | Readonly<{ state: "queued" | "waiting-owner" | "succeeded";
      leaseToken: null; leaseUntil: null }>
  | Readonly<{ state: "running"; leaseToken: string; leaseUntil: Date }>
);
```

`table` は段階ごとの有限 logical selector であり、cursor に任意 SQL/table 名を渡せない。失敗は `lastFailureCode` と retry 時刻へ保存し、資格/body/email を記録しない。debt は `(intentId,kind,ownerId)` unique、必要な binding/consumer/runtime/token/generation locator と閉鎖状態だけを持つ。unknown を期限で終了扱いにしない。waiting-owner でも他 table/page の回収を継続でき、受付結果は常に accepted。succeeded は秘密・回収対象・debt の残存 EXISTS がすべて false の場合だけ。

`PurgeIntent` に `{cause:"account-deletion", accountId:null, accountDeletionId:string, deletedAccountId:string, workspaceId:null}` の専用枝を追加する。manual/expired/workspace-deletion を偽装しない。`beginAccountNotePurge` は intent の人物 ID と現在 personal owner の一致を同 Tx 再確認する。既 purge がある場合は正本の lifecycle/purgeId と現在対象を確認して link し、既 cause を上書きしない。purge Initiator は system。旧 author/charge/provenance FK を account anchor へ残す。

存続ノートのバックアップ読取には `RetainedBackupRecord = {kind:"usable",record:DriveBackupRecord} | {kind:"recorder-deleted",id,targetId,noteId,originalId,accountId,deletionId,createdAt,bytes,sha256}` を追加する。通常 usable 型の subject を nullable 化して全 caller に渡さない。deleted 枝は「バックアップなし」ではなく、退会した記録者のため取得不能という有限な結果。fileId、folder 名、subject、email、resource key、webViewLink は shell に保持しない。target shell は既 ID・note/original/account・元 outcome・deletionId のみ。confirmed 成功来歴は shell 内の元 outcome として保持する。

## 新 migration と guard

候補は単一の `0044_account_deletion.sql`。0043 以前の SQL/snapshot を編集せず、新 snapshot と journal entry のみ追加する。新合成 DB に正式 public migration を適用して成立を確認するまで製品を起動しない。

| 保存先 | DDL と不可逆条件 |
| --- | --- |
| accounts | `state active/deleted`、nullable email/created_at、deletion_id を追加して再構築。active は email/created_at 非 null・deletion_id null、deleted は email/password/created_at/verified_at null・deletion_id 非 null。auth_version は両枝で正の安全整数。active の Google-only/password-null は許容。ID/FK を維持、email UNIQUE は null により再登録を妨げない |
| account_deletions | id PK、account_id UNIQUE、fence_auth_version、state/stage/cursor/version、accepted_at/next_attempt_at、lease pair。accounts と intent の同一人物対応は deferred composite FK 又は同等の同 Tx guard で保証。通常 INSERT は active に対する一度だけの受理。deleted→active、ID/deletion_id 付替え、account anchor DELETE を拒否 |
| account_deletion_debts / account_deletion_purges | intent＋exact owner locator の unique と intent/account 対応。purge link は現 personal owner 確認後のみ、完了は物理回収の確定後のみ。debt の勝手な消去・別人物付替えを拒否 |
| note_purges | account_deletion_id/deleted_account_id と専用 cause CHECK を追加。workspace-deletion の既規則は維持。account cause は intent/account と対象現在 owner/lifecycle の整合を要求 |
| Drive target/record | `retention usable/recorder-deleted` と deletion_id/storage_redaction_version を追加。usable は既 CHECK/不変保証を維持、shell は subject/folder/file_id/envelopes/web_view_link/marker 等の資格・外部 locator がすべて null。既業務version=1等と縮小versionを分ける。唯一の usable→shell 遷移は deleted 人物の matching intent と全依存閉鎖/ACK条件のみ |
| Drive job/control | 退会専用 retention 枝。closure 後のみ subject/data/admission_identity 内の credential/folder/name/locator を除去し、terminal outcome・既 ID・必要な世代/終了証拠を保持。通常 replace の immutable subject/admission を緩めない |
| Drive transfer/source binding | consumer 終了、receipt closed0、binding source attempts の callerEnded/acknowledged、transfer readPinned/refreshPending/object_writes 解放を確認した後に正規 DELETE。FK のため残す binding は専用 redacted 枝で subject/取得 input を除く。redacted→usable/claim/read を拒否 |

SQLite 再構築は現在の全 FK/index/trigger を列挙して維持する。0032 の DROP accounts 手順をそのまま流用しない。認証の `auth_password_last_method`/`auth_google_last_method` は active の通常操作で保持し、matching deletion intent の active→deleted 縮小と deleted 人物の identity DELETE だけ例外を設ける。既 `auth_version_monotonic` は維持。session、Google identity/challenge/attempt、OR/Drive資格の新保存・再採用を active 条件で guard する。

最後 owner は `active WS × owner membership × active accounts` を正本にする。accounts active→deleted trigger は本人が最後の active owner となる active WS があれば拒否。membership の owner 降格/削除/変更も同じ正本で owner ゼロを拒否し、新 membership は active account のみ。既 WS deletion が fence 済みなら owner 数拒否の対象外。二人 owner の同時退会は SQLite の同 Tx 書込/CAS により一方のみ成功する。JS で事前 count を読むだけで済ませない。

fence guard は新 admission/owner claim/credential reveal・採用/ノート owner 移動・公開化に作用する。履歴に `account_id=deleted` が残ることだけを理由に、他 member の存続 WS 編集や旧 owner の正規終了/ACKまで拒否する trigger は置かない。cleanup の terminal/closed/receipt release 例外は intent＋元tuple不変に限定する。

## 原子的受理と全入口 fence

受理 UoW は `requireAccount`→canonical email 一致→最後 owner 検査→intent INSERT→authVersion+1/deleted CAS→session/認証資格/profile/membership 失効→取消・回収 cursor の保存を行う。email 確認値/digest は保存せず、退会確認 UI の入力と現在 account email の一度の比較で使う。認証を失った後の再読込は旧cookie拒否であり、退会者向け新 status endpoint/token を追加しない。commit 応答喪失でも fence は復活しない。

全資格の新利用は受理直後に止める。受理 Tx 内の集合 UPDATE は state fence と locator intent 作成に限定し、巨大な secret JSON/全履歴の JS 列挙はしない。既 owner への abort/wake は `afterCommit` の同期通知だけ。通知 throw を accepted の rollback にしない。caller が持つ credential/object bytes は既実所有の閉鎖証明まで debt。受理後の新 refresh、外部再試行、結果採用は禁止し、正規 close/ACK は許す。

| 入口群 | 接続点と必須 fence |
| --- | --- |
| 認証/設定 | active-only account mapper、requireAccount/captureAuthentication、session 発行、Google login/link/reauth/proof、verify/reset/methods、OR/Drive callback。既 attempt の actor/target/result account と authVersion を採用前に再確認。旧 attempt をメール再取得の新 account へ付替えない |
| current scope | `scopeRole/canScope` の actor active、personal owner active、WS active membership。workspaces role/list/members/ownerCount が active accounts をjoin。personal current owner の create/move/bind/publish を同 Tx 再確認 |
| 匿名取得 | sharing.scope/public profile/discovery/public note/resource current guard。個人 public/link/媒体/原本は deleted owner 即404。grant、PDF/ZIP artifact/delivery、export も source/current scope を取得直前に再確認。WS/移動済み note は現 owner により保持 |
| 新仕事/結果採用 | imports/reference/batch、machine regeneration、LLM/PDF preview、PDF/ZIP computation/delivery、export、media/icon upload の受付・claim・finish/current CAS。actor active を adapter の直接 claim と正式 SQL guard にも入れる。期限・cancel 世代は owner close 証拠の代わりにしない |
| Drive | connection/control/picker/refresh/backup admission/current/automatic、regeneration source の executor と credentialOwner 両方 active。記録者退会時は executor が他人でも source 読取不可。read API は shell を recorder-unavailable として返す |
| 送信/公開反映 | workspace invitation/delivery/mail、profile/icon、search/public projection。退会した issuer/actor から新送信・遅採用をしない。accepted WS deletion は actor session に依存せず継続。旧 authored provenance は人物表示だけ縮小 |
| cleanup | 専用 intent/lease/current personal scope/exact generation、object delete token、元 owner/proof ACK。上の actor fence を bypass する通常入口は作らない。anonymous delivery の actor NULL は current scope fence で判定 |

入口の網羅性は各 public usecase/直接 repository claim の呼出位置を台帳へ列挙し、「requireAccountだけで覆う」「canScopeだけで覆う」「adapter direct fenceも必要」「cleanup例外」のいずれかへ帰属させて独立Verifierが確認する。検索 cache や旧 snapshot の一致だけで公開取得を許可しない。

## Drive 資格の全コピー縮小と有限回収

通常 usable の subject tuple/AAD、0039 target/record/transfer、0040 admission、0041 head の不変保証を維持する。provider-binding/secret sidecar の全 account 基盤は導入しない。

| コピー | 受理後/閉鎖後の処置 |
| --- | --- |
| drive_connections credential/folder | 通常読取・reveal は active fenceで拒否。未閉鎖 owner の照合に必要な最小世代/bindingだけ隔離。closure後 unlinked＋credential/folder/lastUsed null、autoBackup false。再link不可 |
| drive_authorization_attempts data/candidate/verifier/confirmedFolderIds | pending/candidate は正式失敗へ、active/unknown exchangeは exact終了待ち。closure後 candidate のsubject/emailを含め全envelope null、遅callback採用0 |
| drive_control_operations subject/data/credentialUse | terminal とowner closure/ACK後に専用縮小。resourceKey/targetKey/targetName/subject全コピー除去。普通のimmutable replaceは維持 |
| drive_backup_target_heads/targets | 同tupleの全job/transfer/source依存閉鎖後にhead除去→target shell。歴史target・confirmedも対象。元 ID/outcome を保持し新target付替え不可 |
| drive_backup_jobs admission_identity | queued正式取消、owned閉鎖待ち。terminal後専用縮小又は正規prune。folder/resourceKey/subject/storage snapshotが残らない |
| drive_backup_transfers identity/sessionEnvelope | owner none/closedかつreadPinned0/refreshPending0/object_writes0/必要ACK後に正規削除。sessionEnvelopeだけnullにしてidentityコピーを残さない |
| drive_backup_records | 存続 WS/移動済み noteではshell保持。subject/folder/resourceKeyEnvelope/webViewLink/fileIdを除去、record ID・sha/bytes成功来歴は保持。個人 noteの最終purgeは既FK順序で回収 |
| regeneration_source_bindings/attempts/consumer | recorder/executor失効→全 consumer取消。`sourceHeldSql` の active/unknown 又は closedでもcallerEnded/acknowledged不成立はheld。receipt closed0、attempt閉鎖/ACK後に削除又は取得不能binding枝へ |
| OpenRouter/Google/認証補助 | OR credential/candidate/verifier/providerUserId、Google identity/claims/verifier/challenge email/subject、email verification、profile/bio/name/icon metadataを失効・縮小。関係する実owner debtを閉鎖前に失わない。共有auth browserの他account文脈を無差別削除しない |

回収 runner は一 wake に claim1、候補25行、自己所有のabort/wake通知1まで。table段階＋keyset cursorを保存し、blocked rowはdebtへ移して残りへ進む。再起動/commit応答喪失では保存 cursor＋exact rowを再読して同値確認、同じ縮小・purge link はidempotent。最終verifyは各 table の全世代未縮小/secret-bearing/held の EXISTS と未完purgeを確認し、cursor一周だけで成功にしない。

personal noteは現在 `owner_account_id=deletedAccountId AND owner_workspace_id IS NULL` のactive/trash/purgingを対象にする。先にWS/他人へ移動commit済みなら保持、先にpersonalへ移動commit済みなら回収。受理後の移動は拒否。原本、asset、reference、companion、容量 charge、pinは既current owner/refcount/collection規則に従う。creator/uploaderが退会者でも存続WSのnote・原本・共有asset・WS iconを削除しない。未bind本人draft/profileicon/exportは専用ownerと共有参照を再確認して回収する。

## 提案する exact 製品変更 path

以下はこのフェーズ候補の許可集合。現在は未許可・未編集。列挙外の変更が必要なら理由と依存をManagerへ戻す。既他runtimeへの一括改変や既migrationの書換えは含まない。`packages/core/src/` を C、`C/adapters/libsql/` を L、`apps/web/app/` を W と表記する。各行の全名前は exact file。

| 群 | exact path |
| --- | --- |
| 新正式型/回収 | C/domain/account/deletion.ts、C/domain/account/ports/accountDeletionRepository.ts、C/application/account/deletion.ts、C/application/account/deletionWorker.ts、L/accountDeletionSchema.ts、L/repositories/accountDeletionRepository.ts |
| 共有port/配線 | C/domain/account/ports/accountRepository.ts、C/domain/integration/driveBackupRepository.ts、C/application/regeneration/ports.ts、C/domain/purge/entity.ts、C/application/execution/hollowUnitOfWork.ts、C/application/di/hollowTypes.ts、C/application/di/serverNode.ts、L/hollowUnitOfWork.ts、L/schema.ts |
| 保存/移行 | L/hollowSchema.ts、L/purgeSchema.ts、L/driveSchema.ts、L/driveBackupSchema.ts、L/regenerationSchema.ts、L/migrations/0044_account_deletion.sql、L/migrations/meta/0044_snapshot.json、L/migrations/meta/_journal.json |
| 認証人物/WS正本 | L/repositories/accountRepository.ts、L/repositories/authenticationRepository.ts、L/repositories/accountChallengeRepository.ts、L/repositories/displayNameRepository.ts、L/repositories/publicProfileRepository.ts、L/repositories/profileIconRepository.ts、L/repositories/workspaceRepository.ts、C/application/account/context.ts、C/application/account/session.ts、C/application/account/google.ts、C/application/account/proof.ts、C/application/account/methods.ts、C/application/workspace/access.ts、C/application/workspace/membership.ts、C/application/workspace/invitations.ts、C/application/workspace/delivery.ts |
| 公開/current取得 | L/repositories/sharingRepository.ts、L/repositories/publicNoteRepository.ts、L/publicDiscoverySnapshot.ts、L/repositories/assetRepository.ts、L/repositories/exportRepository.ts、L/repositories/pdfHelpers.ts、L/repositories/pdfAnonymousHelpers.ts、L/repositories/zipHelpers.ts、L/repositories/zipPdfHelpers.ts、C/application/publication/profile.ts、C/application/publication/reading.ts、C/application/asset/access.ts、C/application/export/source.ts、C/application/export/stream.ts |
| 通常仕事/遅採用 | L/repositories/importRepository.ts、L/repositories/referenceRepository.ts、L/repositories/batchRepository.ts、L/repositories/llmRepository.ts、L/repositories/regenerationRepository.ts、L/repositories/pdfRequestRepository.ts、L/repositories/pdfComputationRepository.ts、L/repositories/pdfDeliveryRepository.ts、L/repositories/pdfAnonymousRequestRepository.ts、L/repositories/pdfAnonymousDeliveryRepository.ts、L/repositories/zipRequestRepository.ts、L/repositories/zipWorkRepository.ts、L/repositories/zipDeliveryRepository.ts、C/application/import/processJob.ts、C/application/move/usecases.ts、C/application/llm/current.ts、C/application/regeneration/source.ts |
| Drive閉鎖/縮小/読取 | L/repositories/driveRepository.ts、L/repositories/driveBackupRepository.ts、L/repositories/openRouterRepository.ts、C/application/integration/drive/current.ts、C/application/integration/drive/credentials.ts、C/application/integration/drive/backup/admission.ts、C/application/integration/drive/backup/read.ts、C/application/integration/drive/backup/recovery.ts、C/application/integration/drive/backup/cancellation.ts、C/application/integration/openRouter/connection.ts |
| purge/runner/UI | C/application/note/purge.ts、L/repositories/purgeRepository.ts、W/worker/node/runner.ts、W/presentation/accountDeletionInput.ts、W/presentation/accountDeletionServerFn.ts、W/components/hollow/AccountDeletion.tsx、W/routes/settings.profile.tsx |
| 新有限検証 | L/__tests__/accountDeletionFixtures.ts、L/__tests__/accountDeletionSchema.integration.test.ts、L/__tests__/accountDeletion.integration.test.ts、L/__tests__/accountDeletionCredentials.integration.test.ts、W/presentation/accountDeletionInput.test.ts、W/components/hollow/AccountDeletion.test.tsx、W/worker/node/__tests__/accountDeletionHttp.integration.test.ts |

共通SQL helperで入口を覆える場合は許可集合中でも変更不要。型安全のためnullable emailを読むjoin/projectionに影響が出た場合、active filterだけで型が非nullになると仮定せず境界でnarrowする。UIの既ProfileEditorを侵襲せずsettings.profile最下部へ削除説明、canonical email入力、useActionState/pending/error、最後owner案内、成功時cookie失効/signoutを配置する。新UI build/browserの実行条件は現P5c工具採用とは別にManagerが確定する。

## 主要criteriaと有限検証提案

新fixtureだけをpublic API/正式migrationから作る。旧 DB/data/private validator/secret/root/helper/results/cache をread/hash/import/reuseしない。実接続、外部 file delete/trash/move/revoke、メール/LLM送信、課金、音声は0。以下上限は将来実行の採用候補であり、今回の実行許可ではない。

新0700 absolute root1、合成logical DB最大3（各32MiB・sidecar込、合計64MiB）、root192MiB、objects総8MiB/1file1MiB、material256KiB、log/result8MiB。account6/WS2/note12、cursor対象51履歴、同時owner1・fakeprotocolのみ、Worker0・child0を基本とする。実source Workerの影響が必要になった場合だけ最大2/同時1を別採用し、S3再演で代用しない。1case40秒、各suite180秒、run最大12分、bail1、失敗DB再使用0。実行担当1、before/after資源guard、stop/FK/checkpoint/client closureの確定を要求し、失敗物unlink0/root保持。UIは同候補commit/bundleの新工具条件が採用されてから有限browserケースを追加する。

| ID/根拠 | 主要観測可能条件 |
| --- | --- |
|| email不一致/最後active ownerはintent/fence0。本人一致はaccepted・deleted anchor・authVersion+1・旧cookie拒否。password/Google-only両形、再登録email/handleは新accountIDで旧author/recordへ接続0 |
| D02 R07/R11 | 二人owner同時退会/降格との両順序でactive WS owner0成功0。WS削除fence済みの回収は継続。残memberはWS note/title/body/original/storage/charge ID不変で操作可 |
| D03 R11/R12 | 受理直後personal public/link/media/original/grant/artifactは404、旧session/遅callback/newclaim/result adoptは0。before/after move各順序で現在ownerだけが回収対象。missing人物をdeleted表示0、handle再取得者へ旧author URL接続0 |
| D04 R08/R11 | shellでrecord/target/成功sha bytesは保持、取得はrecorder-unavailable。active actor任意redaction、別intent、subject/locator付替え、redacted復活、通常confirmed変更は拒否 |
| D05 R08/R11 | active/unknown owner、closed caller未終了、ACK未確定、readPinned/refreshPending/object_writes/input receipt50の各debt中は資格・object premature回収0、新利用0。取消通知throw/commit応答欠落でもaccount復活0。exact closure/ACK後だけ縮小 |
| D06 R11/R12 | 51件を25行pageで全コピー縮小、cursor途中停止→新runで再開、途中debtは他row進行を妨げない。最終EXISTSでsecret/subject全copies0、未完purge/debt0後だけsucceeded。検証はsynthetic sentinelの存在countだけを報告 |
| D07 R11/R12 | accounts/FK/正負CHECK/unique/不可逆trigger、保存mapper、direct repository bypass guard、ordinary active authentication/WS/Driveの影響範囲を新finitecaseで確認。whole typecheck/lint/format、影響test、独立Verifierの入口台帳照合を揃える |
| D08 R11/R12 | 日本語説明/email入力/pending/error/最後owner案内、keyboard/mobile、成功cookie失効と再読込拒否。現UI build工具条件未確定なら未検証として残しP5d全体受入へ飛ばさない |

## 主な依存とrisk

採用が必要なのは新port/StoredAccount/retained shell、専用purge cause、0044と限定guard例外、exact path、将来検証上限。S3のreceipt/sourceHeld/callerEnded/ACK契約を維持し、active/unknownの通常取消・終了証拠を再発明しない。Drive active ownerが閉鎖不能ならintentはwaiting-ownerとして残り、受付完了と回収完了を混同しない。

最大riskはaccounts再構築時のFK/trigger喪失、Drive JSONに残る秘密コピー、actor fenceをcreator削除へ誤適用すること、adapter直接claimと匿名取得の漏れ。migrationの新合成正負表、全copies台帳、current owner両順序、入口coverageの独立照合を受入根拠にする。全future機能の再設計や外部資格の実削除は本提案の依存ではない。

今回の成果は本書だけ。製品/DDL/test編集、新DB/runtime/Worker/子/browser/build、外部接続/削除/revoke/送信、音声、旧資材操作、goal操作、agent起動は0。採用・実装・検証は未実行。提出後は全writerを停止する。
