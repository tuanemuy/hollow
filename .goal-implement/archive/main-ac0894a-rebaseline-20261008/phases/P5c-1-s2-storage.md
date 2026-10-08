# P5c-1 S2 保存差の具体案

## 対象と停止境界

2026-09-29。基点はS1fix候補 `d812e1c69a6353d56e0eb7d9a8dc5fddf3724dcd`。`design.md` のS2共有補足、公開Drive domain/schema/repository/current/portsを静的に照合した。本書だけを作成し、製品・既報告・管理正本は不変更。DB/test/新root/旧proof/外部操作0、環境ownerはVerifier。spec/spec-implement・goal APIは使用しない。

S1 V1/V2のterminal再claim拒否、create新intentの厳密+1はそのまま維持する。本書は両件の追加修正ではなく、採用済みS2契約の保存表現候補。S2usecase実装や新API調査は行わない。

## 0038か0039か

0038の未本体適用候補を訂正する案を推奨する。Managerが保持するactualfresh基点はledger38であり、0038適用済みのDBはS1/独立の使い捨て検証集合のみ。これらは保持・非接続のまま、最新0038を新syntheticへ適用する。旧証跡へ再移行や手動補正を行わない。

新3表のCREATEとそのCHECK/trigger、0038_snapshotだけを更新する。既0037以前・旧snapshot・旧table定義・journal旧entryを変更しない。journalの0038識別は保持し、migratorが使用するSQL hashは新候補の値になる。新表追加数は3のまま、ledger39。0039は現状不要。

実装直前に、通常環境へ0038が適用済みだったことが判明した場合はこの案を停止する。そのDBを未適用扱いにせず、0039と既3表データ変換/rollbackの別案が必要。現在はfresh読取でこの前提を再検証する権限も必要もなく、Manager提供基点を参照する。

## 物理fieldの差

| table | field / TS名 | 保存形と初期値 |
| --- | --- | --- |
| drive_connections | 既admission_sequence / admissionSequence | 列変更0。新folder-select/create受付だけ+1。その他admissionはrowVersion+1/sequence据置き |
| drive_authorization_attempts | 新intent_digest / intentDigest | TEXT NOT NULL。version付き正規入力のSHA256 lowercase hex64文字。全生存期間immutable |
| 同 | 新confirmed_folder_ids_envelope / confirmedFolderIdsEnvelope | TEXT nullable。非terminalで非空・最大65536 UTF-8 bytes、terminalでNULL。交換phaseでも保持 |
| drive_control_operations | 新intent_digest / intentDigest | TEXT NOT NULL。attemptと同じ形式・immutable |
| 同 | 新credential_use / credentialUse | TEXT JSON NOT NULL。初期 `{kind:'none'}`。後述閉じたunion、最大1024 UTF-8 bytes |

合計4物理列追加、connection列追加0、新table追加0。intentDigestは共通recordBase/recordColumnsへ置くが、credentialUseと確認envelopeは専用tableに置く。暗号化token・原入力をdigest欄に保存しない。新fieldに既S1 DB向けの捏造DEFAULTや空digestを用意しない。

### intentDigestとcommand

Node既tokenGenerator.hashはSHA256 hexであることを公開sourceで確認済み。applicationは既portを使い、domainはhex64形式を検証する。正規化はobjectの列挙順に依存させず、version1の固定配列を用いる。

- 共通先頭: `['drive-intent',1,accountId,kind]`。accountIdは現在認証された本人から得る。
- authorization: 初回入力のexpectedEpoch/settingsVersion、confirm sequence、sort/dedupした確認IDs、consent/chooseAccount、固定returnTo。loginHintが利用者選択であればそれも正規化入力へ含める。
- folder-select: expectedEpoch/settingsVersion、pickerId、fileId、resourceKey又はnull。
- folder-create: expectedEpoch/settingsVersion、固定My Drive root・固定作成設定。生成後のfileId/markerは初回入力ではなく既immutable creationIdentityに束縛する。
- picker/refresh/disconnect: expectedEpoch/settingsVersionと各kindの明示入力。通常refreshの結果credentialVersionを初回入力へ差し込まない。

resourceKeyを含む正規化文字列はmemory内だけ。digestをUI/logへ出さず、raw keyやenvelopeの乱数差を比較に使わない。同command再試行では「今回の現在値」を無言で再正規化して旧入力を変えず、初回の明示入力を比較する。別kind/別payloadは拒否し、同payloadなら元receiptを返す。現在本人/失効照合はdigest一致と独立に行う。

現状はattempt/controlに別々の `(account_id,command_id)` uniqueがある。kind跨ぎの再利用を拒否するため、insert前に両表を照合し、同account admission CASと同Txでinsertする。DB境界も必要なため、両新表に相互NOT EXISTSのBEFORE INSERT guardを各1追加する案（新2trigger）。既5triggerは保持し計7。旧tableは触らない。UoWを外れた直接insertでも同account/commandの二重保存を拒否する。

Managerが採用した相互INSERT guardの具体定義案は次の2本。これに加えて各表内の既uniqueを維持する。UPDATEでは既immutable command/accountを守るため、別表へ衝突する値への変更もできない。

```sql
CREATE TRIGGER drive_attempt_command_insert_guard
BEFORE INSERT ON drive_authorization_attempts
WHEN EXISTS (
  SELECT 1 FROM drive_control_operations
  WHERE account_id = NEW.account_id AND command_id = NEW.command_id
)
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;

CREATE TRIGGER drive_control_command_insert_guard
BEFORE INSERT ON drive_control_operations
WHEN EXISTS (
  SELECT 1 FROM drive_authorization_attempts
  WHERE account_id = NEW.account_id AND command_id = NEW.command_id
)
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
```

両table作成後に定義し、FK assertion/transaction全rollback対象に含める。raw SQLには初回kind不一致を成功receiptへ変える分岐を設けない。継続POSTの採用境界は末尾を参照。初回operationのintentDigestを後段確認入力へ上書きしない。

## 確認集合とsequence

新purpose `folder-confirmation` をDriveSecretBindingのattempt/browser binding枝へ追加する。封印payloadは次の閉じた構造。purpose/AADによりverifier/candidateとの取り違えを防ぐ。

```ts
type ConfirmedFolders = Readonly<{
  version: 1;
  expectedEpoch: number;
  sequence: number;
  ids: readonly string[];
}>;
```

idsはUUID、JS既定sort、重複0。account queue10＋terminal held account1から導かれる最大11件とし、現在集合取得は12件目を異常検出する。新しい利用制限を追加する値ではなく、既admission/owner契約の上界を検査する。大小文字等を勝手に変換しない。payloadのepoch/sequenceはattemptの既expectedEpoch/confirmedAdmissionSequenceと完全一致。

現在集合は当人のfolder-select/createで、nonterminal又はheld(active/unknown)のID。terminal heldも含み、同IDの進捗は集合変化にしない。採用条件は `current.sequence === confirmed.sequence && currentIDs.every(id => confirmedIDs.has(id))`。終了による減少だけなら再確認不要。新受付→終了で集合が元へ戻ってもsequence増分でABAを拒否する。自身の認可begin・refresh・Picker待機はsequenceを進めない。

envelopeはpending→exchanging→candidate中不変。認可期限切れ/取消/成功のterminal化でNULLへ落とし、復活を禁止する。既state/nonceHash、confirm sequence、intentDigestはreceipt/historyで保持する。暗号文が消えたterminalから採用を再開しない。

CHECKは非terminal非NULL/terminal NULL、bytes上限とshapeだけを保証する。暗号文の内部IDs/epoch/sequenceはprotector境界の復号検証と採用Tx直前のdomain/currentで保証し、SQLが暗号内容を検証したとは表現しない。

全受付のrowVersion CASは維持する。connection repositoryの変更理由を `admission` と `folder-admission` に分け、前者はsequence不変、後者は厳密+1。それ以外の理由ではsequence変更禁止。folder操作insertとsequence更新を同Txに閉じる。

## CredentialUse・自己refresh CAS

受付時expectedCredentialVersionは監査値として不変。実際にtokenを使用するcontrolだけに次のunionを追加する。

```ts
type CredentialUse =
  | Readonly<{kind:'none'}>
  | Readonly<{
      kind:'bound'; runtimeGeneration:string; ownerToken:string;
      version:number;
    }>
  | Readonly<{
      kind:'self-refreshed'; runtimeGeneration:string; ownerToken:string;
      fromVersion:number; version:number;
    }>;
```

version/fromVersionはsafe positive integer。self-refreshedはversion=fromVersion+1。同ownerで1回の通常refreshを表す。新claimは現在credentialVersionをboundへ固定し、closedからの次stepでは新owner token/runtimeGenerationへ束縛する。owner active/unknown/closedの間、credentialUseのowner identityは保存ownerと一致させる。

- queued及びdisconnectはnone。provider所有を開始した非disconnectのrunning/allocating/verifying-targetはbound又はself-refreshed必須。reconcilingもprovider照会claim後は同様。
- closed prepared/ready/awaiting-selection/completedは最後の使用証明を保持する。failedは未送信none又は最後の使用証明を保持する。unknownをnoneへ消して枠を解放しない。
- 一般replaceはcredentialUse変更不可。claim専用CASだけがnone又はclosedの旧証明から新boundへ進める。S1 terminal claim禁止を維持する。
- 自己refresh専用CASだけが同owner bound→self-refreshedを許す。expected record version、owner(activeのみ)、cancel0、期限/current、旧使用版、connection version/epoch/sub/credentialVersionを照合する。
- 同Tx内でconnection資格版+1/新封印credential保存とcontrol使用証明+1/record version+1を行う。片方がCAS不成立ならthrowしてUoW全rollback。falseを正常returnして片更新をcommitしない。
- このCAS成功後だけ新tokenを後続requestへ使う。old result/old401はowner identityと使用版が一致しない限りconnectionへ反映しない。unknown中のrefresh採用、新ownerへの自己refresh証明の付替えは禁止。

具体portはcontrol repositoryの `refreshCredential(input)` とし、上記両行のCASを同じHollowTransaction内で行う。汎用expectedVersion更新APIを追加しない。一般connection `replace(...,'refresh')` だけでS2が資格更新する経路は使わない。自己refreshの専用pathを主経路とするため、既S1のrefresh保存対は専用経路へ移し、旧意味のepoch不変/版増分は維持する。

SQL guardもcredentialUseの一般変更を制限する。boundへの変更は合法な新owner claimのみ。自己refresh変更は同owner/非terminal/旧bound/厳密+1、かつ更新済connectionのaccount/epoch/sub/credentialVersionと一致する場合だけ。同Txのconnection更新はrepositoryが先行し、後続guard失敗で全rollbackする。CHECK単独やSQLだけでアプリケーションの外部token使用順を証明したとはしない。

refresh controlのcompleted `resultCredentialVersion` は旧受付expected+1から、`credentialUse.kind==='self-refreshed'` のversionと同値へ変更する。受付後に他の合法refreshが済んだ場合も、実owner使用版からの+1を正本とする。attemptは旧access tokenを使用しないためcredentialUse列を持たず、通常refreshによる資格版増分だけでcallbackを失効させない。

初回・明示再連携のexchange応答に必要refresh tokenがない場合は `DRIVE_REFRESH_REQUIRED`。同subでも旧tokenを新candidateへ移さず、旧有効接続を維持して明示再同意へ戻す。省略時に既refresh tokenを保持できるのは、同owner/sub/epoch/使用版の通常refresh応答だけ。S2先行案の曖昧な記述より本採用境界を優先する。

## phase・CHECK・immutable・mapper

folder-selectにだけ `verifying-target` を加える。payloadは `{kind,phase,sourceId,targetId,targetKeyEnvelope,confirmedReadyVersion}`。readyVersionは直前ready row.version、正整数。ready→verifying-targetは新owner/使用版claimだけ、source/target/keyはreadyと完全一致。利用者確認対象の単段targetをproviderへ照会し、さらに別shortcutを返されても自動追跡しない。成功completed/失敗failedだけへ収束させ、再readyによる無限再確認loopは追加しない。

folder-createのready→reconcilingは同fileId/marker/sends/observedParentのmetadata照会claimとして許す。reconciling→reconciling新ownerもsends不変。running新intentはS1fixの厳密+1を保つ。readyを再照会へ動かすことと明示sameID追加送信を同じCASにしない。

`driveSchema.ts` と0038で以下を揃える。

- intent_digest: NOT NULL、length64、小文字hex以外0。UPDATE guardで不変。
- credential_use: json_valid、bytes<=1024、kind別必須/不要field、数値safe範囲、owner identityとの同値、phase/kindとの同時合法性。mapperはstrict unionで余分fieldも拒否。
- attempt確認envelope: 上記非terminal/terminal関係。UPDATE guardは同一cipherかterminalへのNULLだけ。
- control kind/phase、phase/owner、folder-select resultにverifying-target追加。確認版/targetを初回claimで固定し、同phase更新/terminal移行で差替え不可。
- 完了refresh resultの使用版一致、旧受付版不変。V1終端復活禁止とV2新intent+1を削除・弱化しない。

mapperはencoded/decodedRecordでintentDigestを共通に扱い、attempt確認envelopeとcontrol credentialUseは各decode/insert/updateで明示する。旧行互換を装うundefined→none/空digest補完はしない。未来の正式upgradeが必要になったら0039側の責務にする。

## currentと有限repo取得

認可currentはactor/session/browser/authVersion/epoch/settings、期限/cancel/phaseを照合。claim/adoptでは確認集合を別に照合する。通常refreshだけのcredentialVersion変化は認可current不一致にしない。

control claimは現在epoch/sub/settingsと現在本人条件を再照合し、現在credentialをboundへ固定する。claim戻り値に保存済使用証明を返し、外側で読んだ旧tokenを無照合で使わない。HTTP結果currentは同record/owner/cancelGenerationとcredentialUse版→現在connectionの一致を追加する。自己refresh前の結果をrefresh後の版へ自動付替えしない。closed ready/prepared/Picker待機の読取・確認は過去使用版と現在版の差だけで失効させず、epoch/sub/settings/本人条件を正本とし、次のHTTP claimで新使用版を固定する。pure GETは読取投影だけ、current不成立を保存/refresh/取消へ変換しない。

global portは前案のclaimable cursor<=100、held<=3、closed candidate採用待ち<=100を追加する。cursorはcreatedAt/kind/idの全順序。unknownはclaimableから除くがheld枠に残す。期限/terminal回収はattempt+control合算100。既authBrowserのpruneへ新2表browser参照だけ追加する。24h context scrubまでpin、旧Google/OpenRouter/session/合計100を維持する。

## 継続commandの採用境界

初回intentDigestだけでは、後から判明するshortcut target/readyVersionを初回commandの入力に含められない。初回commandを書き換えるのは不可。

Managerは、継続確認をoperation ID＋expected版/phase＋保存済target又はsendsの専用CASに束縛し、ACK照会は元operation receiptを純GETで返す最小案を採用した。初回commandのpayload同一性と、継続CASの一回性は別契約とする。stale CASはstale又は現在receiptを明示して返し、異payloadを同一と認定した再受理成功へ読み替えない。新ownerの実行intent/実close証明は別に保持する。

継続POST専用の新command台帳、targetConfirmation/retryConfirmation欄は追加しない。初回command/intentDigestを不変に保つ。既初回intentDigestで継続payloadまで検証できたと偽らない。

## exact編集候補・証拠の適用差

保存部分の既pathは以下に限定する。

1. `packages/core/src/domain/integration/drive.ts`
2. `packages/core/src/domain/integration/driveRepository.ts`
3. `packages/core/src/domain/integration/drive.test.ts`
4. `packages/core/src/application/integration/drive/ports.ts`
5. `packages/core/src/application/integration/drive/current.ts`
6. `packages/core/src/adapters/libsql/driveSchema.ts`
7. `packages/core/src/adapters/libsql/repositories/driveRepository.ts`
8. `packages/core/src/adapters/libsql/migrations/0038_drive_connection.sql`
9. `packages/core/src/adapters/libsql/migrations/meta/0038_snapshot.json`
10. `packages/core/src/adapters/libsql/__tests__/driveFixtures.ts`
11. `packages/core/src/adapters/libsql/__tests__/drivePersistence.integration.test.ts`
12. `packages/core/src/adapters/libsql/repositories/authBrowserRepository.ts`
13. `packages/core/src/adapters/libsql/__tests__/authenticationPrune.integration.test.ts`

S2usecase段階では同application/drive下へ `connection.ts/credentials.ts/folders.ts/control.ts/read.ts/runner.ts`、直接DB対に `adapters/libsql/__tests__/driveApplication.integration.test.ts` を追加する候補。今回その中身は実装しない。UoW/DIは既3repo/optional DriveServicesで足り、旧認証/LLM、provider実HTTP、UI/build/runtime構成は触らない。必要になった別pathは編集前に申告する。

旧S1/S1fixのDBとSQL結果は当時の指紋にだけ適用する。S2では新field/phase/CASを加えるためpure/保存/正常移行/rollbackを最新候補へ直接再検証する。V1/V2負対・正close・metadata据置きは最新13へ包含する。独立S1fix受入をS2新契約の独立受入へ流用しない。旧P5a-C/GはauthBrowser pin/pruneだけ、P5b-1-Aは加算共存/旧保持だけが直接影響する。

## 実行前予算案

新root候補は `p5c1-s2-20260929-XXXXXX` 0700排他。今回は作成しない。保存3 synthetic＋逐次active1、DB/WAL/SHM64MiB、active16MiB、material256KiB、script/log/cache8MiB。旧rootのDB/secret/結果はコピーしない。再利用helperを選ぶ場合は後続委譲でexact名/bytesを再申告する。

- pure: 既10を含む最大24 case。digest/集合subset/使用版/phaseの正負。
- persistence: 既13を含む最大32 case。新列hydrate/strict否定、command両表衝突、subset/ABA、自己refresh両CAS rollback/旧401、verifying-target所有、browser pinは別群。
- S2application: 最大28 case（前案5群）。fake protector/authorization/folder/executionであり実API/OS closeでない。
- 既auth prune比例: 最大8 case。同100件/pin追加だけ。
- synthetic: normal/SQLfault/FKfaultの保存3。assert数は新schemaで実測し旧782/783を予定pass数として流用しない。

上記は合計最大92 case＋移行3 caseの事前上限案。複数assertや再runを合算しない。型成功→規定lint/format→worker1/bail1、TMPDIR直下exact db/cache無効。各前actual＋active reserveを確認し、失敗DB保持後は後続停止して保存数/容量を再申告する。HTTP/native/browser/実API/fullunit/build/fresh/旧保全はこの予算に含まない。

本書全文EOF確認後、文書を含む全read/write/runを停止して返却する。0038修正/新field/phase/port/実行集合の採用とS2着手はManagerの別委譲待ち。
