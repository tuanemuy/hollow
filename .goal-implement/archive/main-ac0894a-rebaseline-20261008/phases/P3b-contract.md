# P3b 招待・参加・メンバー・一般設定の接続案

2026-09-10T17:19:50+09:00の実時計を確認したread-only提案。P3aは独立検証中。本書は実装・試験・方式採用・P3a独立合格を示さない。書込は本書だけ、製品/DB/browser/helper/build/test/hash/git/固定temp/外部サービスは無操作。

## 対象と判断の要約

[WS-01/03〜07](../../spec/scenario/workspace.md)、[AC-01/02/07](../../spec/scenario/account.md)、WS-05/06とC1の失効、[brief](../brief.md)、[design](../design.md)、[P3接続案と補足全文](P3-contract.md)、[P3独立準備全文](../reviews/P3-prep.md)を照合した。現在P3aの型/UoW・認証・route・worker・画像検査のsourceだけを読んだ。

P3bの到達点は、ownerが招待を送り、受信者がlocal mailboxから認証/明示参加し、複数人のroleと退出を実操作でき、一般設定を変更できること。WS作成直後の招待導線もここで接続する。Q1のmembership由来失効とpublic/linkの独立性、Q2/Q3のscope容量は再決議しない。WS公開/全削除、note移動、OR整理、P4/P5実接続は後続。

Manager判断を求めるのは、下記3群の未指定条件だけ。

1. 招待の再送はtoken世代を更新して旧linkを失効、そこから14日。招待者がowner権限を失った未使用招待は停止し、残ownerの明示再送で再発行する安全側を推奨。発行者に依存しないWSの委任として存続させる代替も原文上可能なので、自動取消を無断で要件扱いしない。
2. 招待rateは1回10宛先・WS rolling24h100・actor rolling1h20の「受理した新送信/明示再送」を同UoWで数える案を推奨。内部再配信は数え直さず、送信失敗後も受理枠は返さない。同一宛先への明示再送は追加60秒間隔を候補とする。
3. アイコンは入口5×1024² bytes、PNG/JPEG/WebPのみ、専用安全化派生物をWS scopeへ実bytes課算する案を推奨。private専用配信で開始し、招待token保持者にはそのWSのアイコンだけを限定表示可能とする。匿名public配信はP4側で別認可。交換中の旧物/新予約/cleanupも実回収まで課算する。

この3群以外は既存契約の詳細化として以下を推奨する。実装時に新しい不足が分かれば、原文/影響を添えて返す。

## 現在の再利用点と追加差分

| 現source | 再利用する契約 | P3bで追加する最小差分 |
| --- | --- | --- |
| domain/workspace/entity、WorkspaceRepository、workspaceSchema | active/deleted、creator、owner/editor/viewer、name/description/slug VO、membership PK、現在role join | owner専用application guard、member metadata keyset、joinedAt、設定version、update/conditional membership操作 |
| application/account/signUp・verifyEmail・session | password検査/外部hash、verified/unverified union、同browser確認、30日session、token hash/clock | 招待由来の新規signup限定分岐、typed auth return context。既存accountをtokenだけでsession発行しない |
| application/ports/mailer・LocalMailbox | UoW外メールI/O、private mailbox出力 | 招待専用durable deliveryとoutbox wake、再配信idempotency key。現在send(Mail)だけでは配信済み応答喪失を一意判定できない |
| routes/signin・signup・verify-email、navigation.safeNoteDestination | local noteへの限定returnと認証cookie | note/invitationを判別する限定return union。signup/verifyにも招待確認への復帰。任意URL redirectへ緩めない |
| P3a current policyと各save/history/media/original・job guard | 毎回現在role、exact ref/pin、actor本人job、未保存draft private | 実membership変更から失効を発火。元actorのqueued/running結果をhard失効し、再招待によるABAで旧試行が復活しない |
| C1/C2/C3のcommon save/backup | 他actor exact-current確認、latest title/html/mode/hint、4key download | 実別account UIで確認。新editor/独自backupを作らない |
| Node inlineMediaProcessor/mediaWorker | bounded stream/admission/worker、sharp内容検査 | icon専用portのdecode→静止画像再encode。note媒体URL、source HTML、private draftをavatarへ流用しない |

現在accountはemail/password/status/日時のみでdisplayNameを持たず、membershipはroleだけでjoinedAtを持たない。member DTOはdisplayName未設定を明示し、emailを代替表示にする。P5プロフィール完成とはしない。joinedAtは新参加時clock、旧creator ownerはWS.createdAtで由来を証明できる場合だけ移行し、既存のその他membershipはunknown/nullを正直に表示する。移行日を参加日と偽装しない。

## 招待とdeliveryの状態・型

招待権限、メール配信、認証復帰を別の状態にする。

- Invitation: id/workspaceId/正規化宛先/role/発行者/generation/tokenHash/issuedAt/expiresAt。状態はpending、accepted（account/time）、declined、cancelled。期限切れはpending＋server now>=expiresAtで判定でき、cron到達に依存しない。世代旧linkはinvalid。
- InvitationDelivery: invitationId/generation、送信idempotency key、pending/sending/sent/failed、lease/attempt/nextRetryAt、最小failure code。メール失敗を招待取消・未受付と同一視しない。
- AuthContinuation: ブラウザーに束縛した短期opaque IDと、server側の招待id/generation/期限/限定token proof。clientのredirect/メール/roleを権限証拠にしない。
- InvitationRepository: issueOrResend、inspectByTokenHash、consume、cancel/decline、pageForOwner、countAdmissionWindow。WorkspaceRepositoryとAccountRepositoryを同Hollow UoWへ載せる。
- Member DTOは現在memberならread可。招待宛先・配信失敗・copy tokenはowner専用。member一覧とpending/expired招待一覧を独立keyset各50にし、古い未完了を新しい完了100件の陰へ隠さない。

1回の入力は正規化emailで重複を除き、10上限とrole/owner付与確認をtransport＋VOで検査する。既memberは招待しないという対象別結果、既pendingは再送。実送信を生む対象数でrateを同UoW確保し、枠不足時は要求全体を非破壊拒否する候補とする。複数ownerの同宛先同時要求でもactive招待1行/世代1つに収束し、同request IDの再送信は二重受付しない。

owner role招待は重い権限の説明と確認をUIへ出す。serverも明示確認flagと現在ownerを確認するが、flag自体を認可証拠にはしない。再送時の付与role変更も新たな確認を必要とする。

### tokenとメールの保持

認可検索はtokenHashだけで行い、一般event payload/log/errorに生tokenを入れない。再訪後の「リンクをコピー」とdurable再送にはtokenを再構成できる秘密が必要であり、hashだけで両方できるとは主張しない。

最小案は、招待専用の暗号化secret envelopeをprivate DBに保存し、内側のTokenProtector portをNodeアダプターで実装すること。outboxにはdelivery ID/generationだけを載せる。暗号鍵はコード/DBと分離した永続設定とし、local環境にも専用保護keyが必要。設定なしで平文へfallbackせず、再起動時の復号/再送を正式検証する。既存tokenGeneratorはhash/乱数として再利用し、保護portを追加する。今回の文書準備ではkey生成・env操作をしていない。

copyは現在owner専用commandとしてactive tokenを返し、no-store、UI明示操作のみ。招待確認route/認証復帰はno-store/no-referrerとし、URL tokenをログ・analytics・外部画像へ漏らさない。メール正文はtokenを含む意図した配送物だが、outbox管理画面/一般snapshotには複製しない。使用/取消/期限終了後、copy不可にしsecret envelopeを不要になり次第消す。小さいterminal metadataだけを残す保持期間は既存90日jobをそのまま流用せず、詳細実装で必要量を限定する。

再送は同inviteの新generationと新token/14日、旧未送信deliveryをsupersededにする。旧workerは送信直前・commit時に世代を再確認する。取消と実メールI/Oが競合した場合、既に配送中のメールは取り消せないがtokenは必ず無効。配信直後crashでは外部メールが重複し得るので、exactly-once到達は保証しない。

local mailではdelivery IDに対して同じpayloadなら同一の専用ファイルを再利用するidempotent送信portを追加する候補。従来authのrandomUUIDメールは別の既存契約として残せる。外部provider idempotencyは後続設定/実接続まで未確認。送信失敗はowner画面で再試行/コピー可能、outbox DLQだけを唯一の回復元にせずDB deliveryが正本、boot+sweep+wakeで再開する。新eventはencode→outbox→decode/dispatch/wakeの登録対を含める。

## 参加と認証復帰

### 共通の参加

GETはWS名/説明/招待role/招待者の限定DTOを返すだけで、tokenを消費しない。メールscannerやreloadで参加しない。参加/辞退は明示POST、same-origin transportを通す。signup直後も参加確認へ戻り、「参加する」で初めてmembershipを作る。

参加UoWはtoken hash/generation、pending、server14日期限、WS active、現在accountを再検証し、membership作成とtoken消費を一括確定する。別accountが競合消費したら一人だけ成功。同accountの成功応答喪失はaccepted accountと現在membershipで「参加済み」へ回復し、一般の使用済みlinkに他人のmember情報を出さない。既memberはroleを招待値へ上書きせず、参加済み案内＋WSへ。既memberによる明示参加はlinkを消費し、旧tokenを再譲渡できない案を推奨する。

別emailでsignin中なら招待宛先と現在accountが異なることを明示し、別accountで参加する確認後に同じconsumeを呼ぶ。email一致限定を追加しない。memberのメールが登録済みかどうかを未認証招待入力の応答から一般公開しない。

「参加しない」はtoken保持者の確認付きdeclineとし、そのlinkを終端化する。無効/期限切れ/取消/使用済み/WS削除を利用可能な根拠の範囲で説明し、招待者への連絡を案内する。削除WSのprivate本文やmember一覧は出さない。

### 同メール新規signupだけの確認省略

招待用signup commandはpassword hashをUoW外で行い、同UoW内で新account不存在・有効な招待の宛先一致・規約同意を確認する。新accountをverifiedとして作成し、通常issueSessionで現在要求browserへsession発行、招待確認へ戻す。新規作成時の宛先到達性の代用であり、招待を持つ者に既存accountのpassword省略ログインを許す能力ではない。

- 既存verified/unverified accountにはこの分岐を適用しない。既存の同じ一般応答/登録済み案内と、password signinまたは通常確認/再送を保持する。
- 異なるsignup emailは通常AC-01/02のverification。確認未完はsessionなし。成功後に同browserなら招待確認へ戻り、別browserなら通常signin案内＋招待linkを開き直す。
- signup中にinviteが取消/期限切れ/再送されたら確認省略を成立させない。新accountを半端なverified状態で保存しない。通常signupへやり直す案内と入力保持。
- 新account作成済み応答だけ喪失した場合、同tokenで再度自動session発行しない。本人が設定したpasswordでsigninする回復を残す。
- server continuationはtoken期限/generationを再確認する。一般return URLを無制限に許可せず、note destinationか招待確認IDのunionでtransport検査。失効した古いcontinuationが別の最新招待/画面選択を上書きしない。

これはAC-03のGoogle email自動link未決や外部OAuthを解決したことにはならない。確認・招待メールの実送信は行わず、local mailboxの契約検証と複数本人browserだけをP3bの先行根拠とする。

## 役割変更・除名・脱退

現在owner/target membership/owner数を同UoWで読み、役割変更・除名は自分以外、脱退は自分専用commandに分ける。最後ownerを0へ減らす変更は拒否する。二人ownerの相互降格/除名/同時脱退でもtransactionで一方の確定後を読み、次を拒否する。UI disabledだけで守らない。無効理由は「自分のroleは変更できない」「最後のowner」を分ける。

role変更はleaf optimistic/select、除名/参加/脱退は親list/scope所有のoptimistic/pending/error＋invalidate。失敗rollback、旧要求success/failure/ finallyで新scopeや新選択を戻さない。member画面のowner以外は読取専用。脱退は確認→個人へ、再参加は新招待が必要。未実装の移動/WS全削除は案内だけで成功操作を出さない。

membership変更はWS note.creator、原本uploader、job.actor、本文/title/display/版/pin/容量を変更しない。creator unknownと退会済みも混同しない。WS name/slugの変更でnote.updatedAtや本文revisionを増やさない。

### 失効・再招待ABAと非同期job

read/save/current/history/draft/original/previewはP3aの現在policyを使い続ける。tokenから得たmember権限をcookieへ永久cacheしない。editor→viewerはeditだけ、除名/脱退はmembership read/editを失効する。Q1の独立public/linkは変更しない。

role失効時に同actor/scopeのqueued/running conversion/referenceを同UoWの型付きportでhard終端化する最小案を優先する。これにより除名→即再招待でroleが戻っても、昔のleaseの結果を採用しない。対象以外の兄弟job/他actorを巻き込まない。未開始empty admission等は既存current-policyで停止し、既fence purgeは物理回収を継続する。通常取消の実行中完了待ちへ読み替えない。object writeの終了/cleanup/chargeは既存所有契約のまま。

大量対象をJS全配列へしない。indexed DB更新または永続revocation cursor/世代guardのどちらが小さいか、正式実装で現在repoに接続して測る。同transaction終端化が有界にできない場合はmembership epochをjob capture/commitへ接続する案を返し、再招待ABAを現在roleだけで合格にしない。これは新job actorの再取込まで永久拒否する仕組みではない。

実UIはA/B owner、C editor、D viewerを実招待で参加させる。CとBの同note編集→他actor exact確認→さらに更新で再確認、C除名/降格/脱退後の次保存拒否→最新HTML/mode/hint/download、Bが同note/原本/保持媒体を引き続き利用できる対を取る。C1/C2/C3の保存host/20版/pinを作り直さず、失効時のnew-stable/未保存退避を既存入口へ接続する。

## 一般設定とアイコン

name/description/slugはP3aのVO/重複候補を再利用。workspace設定versionを追加し、現在owner＋期待versionで設定全体を保存する。古い一般設定formが新しいicon/slugを無言で上書きしない。非ownerは読取のみ。scope token/設定/一覧はinvalidateで再表示し、slugは現在値だけ解決する将来portを残す。公開状態が未実装の間は公開URL失効の実成功を主張しない。P4で公開中のslug警告と旧URL拒否を接続する。

IconOwnerはworkspace/accountの型付きunionを候補とするが、P3bで実利用するのはworkspaceだけ。profile更新APIを先行実装しない。専用IconUpload/StoredIcon行に所有scope、request actor、実bytes/hash/key、状態、期限、cleanupを持たせる。元PNG等をnote originalとして永久保持せず、安全化した派生物を正本にする。

1. ownerが専用upload予約を取得。入口形式PNG/JPEG/WebP、5 MiB（採用待ち）・実bytesを検査。client MIME/拡張子だけで通さない。
2. UoW外の専用workerでdecode/reencodeし、metadata除去・orientation補正。既存sharp/isolated admissionを再利用候補とし、最大512px内へ縮小、静止WebPへ出力する案。animated WebPは先頭frameとして明示し、勝手に原アニメ保持成功としない。既存40Mpixel等を緩めず、icon用途の処理deadline/出力bytes上限は正常fixtureで測って確定する。
3. 最終accepted bytes＋旧icon＋他予約を同scope quotaで再評価し、storage I/O外→同generation/current ownerを再確認→設定icon pointerとready行を同UoW確定。旧iconは即座に参照対象から外すが、実remove/不存在確認までcleanup charge保持。
4. 失敗/取消/権限喪失は旧iconを表示し、未採用新objectは既存shared claim/write ownershipの専用object kindで回収。交換二重要求や遅い旧uploadが最新iconへ戻らない。URLだけ保存する外部iconや、note asset IDを任意借用するAPIは作らない。

iconはprivate object storageの別provenance。member向けendpointは現在WS read、招待preview向けは当該有効token＋当該WSのcurrent iconだけ。nosniff/no-store、信頼済みimage MIME。後のpublic avatarは別用途認可であり、現在draft/current/history mediaの例外にしない。note本文iframeのCSPをiconのために広げない。

容量の代替はprofile/WS metadata用の別固定枠へ課算する方式だが、原文に枠がなく新しい会計が増える。既存WS20GiBへicon実体/予約/cleanupを計上する案が最小で、元uploaderの個人容量や退会へ結び付けない。quota不足時は旧設定維持と不要容量の整理案内。最後のWS削除/退会は後続の同object ownershipへ接続するportだけを残す。

## schema・実装順・見込み

追加候補はworkspace設定version/icon参照、membership joinedAt、invitation、invitation delivery/secret envelope、rate admission、auth continuation、icon upload/object metadata。tableを増やす場合も本人/WS FKと終端secret破棄を分け、古いP3a note/creator/35table・後続追加データを更新しない。account displayNameは未設定projectionで足りるならschemaを増やさない。cryptoはNode組込みのadapter、画像は既存依存を第一候補とし、新しいpackage導入を前提にしない。

| 縦スライス | 到達点 | 候補時間 |
| --- | --- | --- |
| 招待発行・状態・配送 | ownerUI→durable招待→local mail/copy、再送/取消/期限/rate/通知欠落 | 45〜60分 |
| 認証復帰・参加 | 新規同メール確認省略、異メール通常確認/明示参加、既存signin、二重consume/応答喪失 | 45〜60分 |
| member管理・失効 | 最後owner/自己role/除名/脱退、実multi-actor保存・最新回収とjob ABA | 40〜60分 |
| 一般設定・icon | VO/競合更新、bounded安全化、専用配信/交換/回収/quota | 40〜60分 |
| 保全・最終統合 | clone移行、最終tests/checks/build、実UI/390px/keyboard、明示commit/停止 | 40〜60分 |

初回候補は正式委譲後 **3.5〜5時間**、独立検証別。以前の90〜120分は招待/role UI追加だけの粗い見積りであり、今回はauth continuation・durable配送・一般設定iconを含むため置き換える。招待→参加→失効を先に端から端へ通し、一般設定iconは独立した次の小sliceとして進める。一つの外部メール送信・P4公開・P5プロフィール完成を待ってP3b全体を止めない。

### 狭い再open候補

- P1-A/D/E: 招待signup例外・認証復帰/session、migration、mail delivery/outbox/DI・route。
- P3a-A/B/D/F: 作成後招待、設定表示、現在member/actorと移行。P3a-C/Eはicon課算窓口またはjob失効に実変更がある境界だけ。
- P1-B、C1-A/C/D/E、C2-D/E、C3-D/E: 実multi-actor exact確認、role失効latest回収とmode/backup。C1-Bは認可接続の対だけでpin数/GC再設計なし。
- P2a-B/E/F、P2b-A/B/C/D: 対象actor jobのhard失効/再招待ABA、原本/current/history/draft read、初回display回収。codec/safe-fetch方式は不変。
- P2dのread/未開始admission: member失効後の管理UI/current policyを実変更した箇所だけ。既fence purge/claim/FDは借用、icon object kindが共通claimへ追加される場合のみその型/cleanup/quotaを再確認する。

## 正式実装で示す合否対

- Invite: 14日直前/一致、改ざん/再送旧世代/取消/decline/使用済、既member、別メール確認取消/参加、二人同時consume。request応答喪失→同ID回復、配送失敗と未受付を区別。
- Rate: 10/11、WS100/101、actor20/21、同宛先重複/既member非送信、内部再配信で枠増殖なし、同時要求の超過なし。数値はManager採用後。
- Auth: 未signin→signin→招待復帰、新規同メール即verified/sessionだが未参加、異メールは未確認sessionなし、既存account自動login不可、別browser確認の非自動login、古いcontinuation不採用。
- Members: 最後owner二者競合、自role不可、owner以外readonly/server拒否、退出/再招待、creator/WS note/原本/媒体/容量不変。旧仕事が失効→再参加で復活しない。
- UI: 実A/B/C/Dアカウントで招待からroleを作り、他actor保存確認と失効downloadを測る。DB role fixtureだけのP3a根拠と区別。取消/失敗rollback/再訪、keyboard/390px、現在scopeと新しい選択の世代を維持。
- Icon: 正常3形式・5MiB境界・内容偽装/破損/巨大decode/metadata、最終bytes/競合/失効、交換失敗旧表示/削除失敗charge/回復、他WS/private media借用拒否。巨大本体fixtureや一般外部URL取得なし。

全項目は未実行。read-only案に明確な原文矛盾は見つからず、冒頭3群は未指定条件の採用判断である。外部メール/Google/公開avatar実接続は後続のまま。goal-implement/manager-loopとdoc-style/markdown-styleに沿い、採用済み条件と候補・未確認を分離して本書だけを作成した。正式委譲まで全操作停止を維持する。

2026-09-10T17:23:31+09:00、文書候補を完了。新しいfixture/補助/実行は作っていない。P3a固定候補・Verifier環境へ介入せず、文書もここで書込停止する。

## 補足: P3b-1の実装単位と有限な運用境界

2026-09-10T17:26:50+09:00の実時計確認に基づくread-only補足。Managerが初稿の3判断群とTokenProtectorを採用した。以下の実装順・追加運用値はまだ候補。製品・DB・鍵・環境は操作していない。

### 採用された条件と分割

- 再送は同inviteの新generation/token＋そこから14日。旧link/旧deliveryは無効。発行者がownerでなくなった未使用招待も無効化し、owner復帰・再参加だけでは復活しない。残ownerの明示再送で新世代を発行し、「発行者の権限変更により再発行が必要」と表示する。
- rateは10宛先/request、WS rolling24h100、actor rolling1h20。受理した新送信/明示再送を数え、同宛先明示再送は60秒。内部retry再課算なし、送信失敗でも枠返却なし、同request同内容は二重受付なし、枠不足は全体非破壊拒否。正規化重複/既member非送信を別集計。
- アイコンは5MiB入口、PNG/JPEG/WebP、安全化512px以内静止WebP、動画像は先頭frameと明示。WSの実体/予約/cleanup charge、member/有効招待tokenだけの用途限定配信。出力bytes/worker deadlineは実装時測定で提案。
- P3b-1は招待/配送/認証復帰/参加/role/除名/脱退＋name/description/slug。P3b-2はアイコンの別候補・独立検証。WS-07はアイコンとP4公開中slug警告が終わるまで全体未完。
- displayName未設定はemail代替、旧joinedAtは裏付けのある由来だけ・他はunknown。既memberのconsumeはrole上書きなし。確認省略は新signupだけで、既存accountの自動loginへ広げない。

### P3b-1の観測可能な完成候補

以下のB1番号は提案内の区分であり、Managerの受入IDを新設しない。

| 区分 | 利用者が達成すること | 最低限の正反対と根拠 |
| --- | --- | --- |
| B1-招待 | WS作成直後と設定member画面からownerが招待し、保留・配信失敗・期限切れ・失効を区別し、copy/取消/再送できる | role3種/owner確認、10/11・rate競合、同request同内容1回・異内容拒否、既member非送信、旧token無効。DB＋実local mailbox/UI |
| B1-参加 | 未signinから認証を終えて同じ招待確認へ戻り、明示参加後WS一覧へ。別emailも確認後参加できる | 同メール新規verified/sessionだが未参加、別メール通常確認、既存自動login拒否、二重consume/応答喪失、取消/14日/使用済/WS削除。複数実accountと隔離clock |
| B1-メンバー | ownerが他memberのrole/除名、本人が脱退。読み取り専用member画面、参加日/名前未設定も正しく表示 | 自role/最後owner同時変更拒否、退出後個人、再参加は新invite。creator/note/原本/版/容量不変。実UIと同Tx競合 |
| B1-失効 | 編集中に権限を失っても最新本文を回収でき、残memberは同じWS noteを利用できる | C1他actor確認後再進行、次save拒否/4key＋hint、current/history/draft/原本拒否、旧job失効→再招待でも旧lease不採用・新job正常。実multi-actor＋遅延port |
| B1-一般 | 現ownerがname/description/slugを変更し、scope token/一覧/設定へ反映される | 重複/予約語/不正/取消/失敗rollback、非owner直接command拒否、同時変更の期待version、現在note本文/updatedAt/20版不変。アイコン操作は出さない |
| B1-配送/保全 | 再起動・通知欠落・故障後も受付済み招待が取得でき、配信完了と失敗が正しく残る | envelope復号/鍵欠落、outbox登録、同delivery local重複なし、旧世代送信不採用、有限retry、clone旧行保全・最終checks/build/UI/明示commit |

P3b-1で受信メールの外部到達を合格にしない。local mailboxへ実配送し、本人A/B/C/Dの専用browserで認証/参加からroleを作る予定。P3aのrole DB fixtureだけを実招待の証拠へ読み替えない。招待一般画面からmember email一覧を未認証へ返さない。

### 鍵の設定・保管・再起動

TokenProtectorはapplication port、Node adapterが鍵resource一つを所有する。HollowContainerへ目的限定のinvitation depsを追加し、通常tokens/hash・通常password auth・ObjectStorageとは分離する。

ローカル正式実装時は、専用永続key fileの**パスだけ**を `HOLLOW_INVITATION_KEY_FILE` 相当へ設定する候補。repo/静的配信/storage object key空間/mailboxと別の本人専用directoryを使い、directory0700/file0600、排他的新規作成で既存keyを上書きしない。乱数生成・書込は専用Node準備処理内で完結し、鍵bytesをstdout/argv/log/報告/fixture/commitへ出さない。通常env全列挙はしない。具体pathは正式環境で確定・引継ぎ、同DB/envelopeを使う再起動でも同fileを読む。

crypto方式は実装時にNode公式一次資料で確認した認証付き暗号を使う。envelopeはformat/key ID/nonce/ciphertext/tagを型付きで保持し、invitation ID＋generation＋用途を認証対象に束縛する。異invite/異世代へのciphertext借用を拒否。アルゴリズムやnonce長を現文書で検証済みとしない。

鍵未設定・読取不可・形式不正ならsecretの生成/copy/配送/招待由来signupをtyped unavailableでfail-closedにし、平文・固定key・起動ごとの一時keyへfallbackしない。必要なmutationはDB変更前に準備可否を確認する。旧招待の取消と通常member/通常signinは秘密復号なしで安全に行えるため、その経路まで無根拠に停止させない。workerは未設定を「送信済み」や「宛先失敗」にせず構成待ちとして案内する。設定復帰後の同delivery処理を確認する。

本番はsecret file/secret managerからの明示注入を前提とし、自動key生成を起動処理へ入れない。ローカル生成が本番key保管/バックアップ/rotationの合格ではない。DBバックアップだけでは復号を復旧できないため、keyは別の秘密保管が必要。P3b-1では同key再起動と誤key拒否を確認し、key rotation UI/KMSを先行実装しない。keyを喪失した場合は既存envelopeを平文復旧せず、現在ownerが新鍵設定後に新世代で再発行する回復を残す。旧tokenを偶然再有効化しない。

### 追加の有限値候補

| 対象 | 候補 | 理由/期限後の扱い |
| --- | --- | --- |
| AuthContinuation | 発行から24時間またはinvite期限の早い方、非sliding、browser-bound | 通常AC-02の24時間確認を途中で30分切れにしない。期限後もaccount/sessionを消さず、元linkを再度開いて新continuationへ。既存token失効/世代は毎回別検査 |
| 明示request idempotency receipt | 24時間、actor＋request ID＋正規化payload digest | 二重click/応答喪失を同受付へ回復。異内容同IDは拒否。期限後は新requestで一覧/現状態から操作し、無期限request台帳を作らない |
| 内部メールretry | 1delivery最大6回、初回から24時間以内。初回/1分/5分/15分/60分/240分の相対予定 | 無期限の送信増殖を避ける。期限・取消・世代変更なら送信せず終端。上限後はfailedとしてownerへ明示再送を案内。新明示再送は新世代・採用rateへ課算 |
| delivery I/O | 1回30秒/leaseはそれより長い有限値、実adapter測定で確定 | I/OはUoW外。timeout後の外部送信済み可能性を失敗/未確認として区別し、再送exactly-onceを主張しない |
| terminal invite/delivery metadata | 各世代の終端時点から90日を上限候補。成功時刻/role/宛先/発行者/理由codeだけ | 本文やtokenを90日残す理由にしない。pendingは14日でexpire終端、古いexpired行の90日後は新規招待として回復可。再送で過去世代のTTLを延長しない |
| rate admission行 | rolling窓最大24時間＋短いcleanup余裕 | invite履歴pruneから独立し、履歴を消して枠を回復させない。同rate窓内の削除/取消でもcount維持 |

内部retryの自動予算終了は招待token自体の14日期限終了とは別。配信失敗後もownerがlinkをcopyでき、受信済み/コピー済みの有効linkは利用できる。rate/再送60秒と、内部送信時刻/attemptを混同しない。構成待ちではmail I/O attemptを消費せず、運用案内と設定変更後の再開を必要とするが、request受付を無限にためる機能にはしない。

secret envelopeは「暗号化したtoken一つ」をinvite現世代が所有し、mail正文をdeliveryごとに重複保存しない。sentでも14日間のcopyが必要なので現世代envelopeは保持する。accepted/declined/cancelled/owner-loss無効化/resend supersessionでは同Txで削除または参照不可にする。期限切れは全読取で拒否し、sweepで有限batch（既存page50程度を起点）削除、expired一覧にtokenは不要。

claim済みworkerが復号したtokenのメモリや既に外へ出たメールはDB削除で取り戻せない。そのためtokenHash/generation/terminal状態の検査を認可の正本にし、古い配信の取消を保証したことにしない。既に消費した古いtokenの理由表示に必要なhash/最小stateと秘密envelopeを分ける。90日後は理由別ではなくinvalidにまとめてもmembershipや参加済みaccountは保持する。

### job再招待ABAの最小実装選択

まず既存Hollow同transactionで、権限を失うactor＋WSに属するqueued/running conversion/referenceをindexed条件でterminal cancelledへ更新し、旧leaseを採用不能にする案を採る。対象noteのcreatorやWS owner全体を条件にせず、実job actorと現在note scopeを使う。owner→editorはnote edit権限を維持するのでnote jobを取消しないが、発行者ownerを必要とする未使用招待は失効する。

同Txのinvite無効化は世代を進めた終端状態とし、role復帰だけでpendingへ戻さない。役割変更commandの再実行/同値更新で無関係な新jobを取消さない。新招待から再参加後の新jobは新たな現在policyで正常受付する。

本物DBの件数/時間と現在repoのterminal化副作用（original activeJob、初回display、reference object cleanup）を確認してから固定する。bounded処理へ分割する必要が出たら、membership epochを同Txで先に進めて各jobのcapture/commitへ照合し、後続掃引で表示状態を収束する代替をManagerへ報告する。epochなしの遅い取消だけで、再参加ABAの空白を残さない。物理writer drain/cleanup/既fence purgeの安全条件は変更しない。

### 見込みと先行影響の絞込み

P3b-1の初回固定候補は正式委譲から **3〜4時間**、独立検証別。招待/delivery/key設定45〜60分、auth復帰/参加45〜60分、role/一般設定/失効45〜60分、全体保全/実multi-actor/最終checks45〜60分を目安にする。P3b-2 iconは追加 **1〜1.5時間**を候補とし、b-1未受入中には着手しない。

b-1ではP1-A/D/E、P3a-A/B/D/F、currentpolicy/role失効が触るP1-B/C1/C2/C3・import/referenceの前節境界を再確認候補にする。既存scope容量集計・原本/媒体codec・physical claimを変えない限り、b-2 iconの容量/cleanup再openをb-1へ前倒ししない。一般name/slug更新はnote本文/版/pinを増やさず、role更新は人物creatorと保持scopeを動かさない。

既存AC-02確認メールの直接sendを全面durable化することはb-1の必要条件ではない。新招待deliveryだけにoutbox/finite retryを追加し、通常認証の回帰と招待例外を分ける。WS-07/P4の未完、実外部メール待ちを報告へ明記する。

本補足は既存sourceのread-only再確認と文書追記だけ。鍵生成、schema適用、fixture/test/browser/helper/環境/git/hashは未操作。追加運用値の採用と正式実装委譲を待ち、文書も停止する。
