# P5c-1 S4 静的接続案

## 状態と境界

2026-09-29。S3候補 `b12560a95170ef4eee6893431f1484d94a5a721c` の独立確認中に開始した、次段の採否資料。最終化時にManagerからS3限定受入・Verifier全停止と環境返却の通知を受領した。本作業の権限は引き続き公開sourceの読取と本書だけの編集であり、S4実装・試験・S5配備の許可を意味しない。

基点は brief/design のDrive採用節、plan固定P5c-1-A〜F、`P5c-1.md`、`P5c-proposal.md`、現Drive application/ports、既OpenRouter UI/server function、認証callback、Node root。goal-implement skillを使用し、spec/spec-implement・goal API・管理正本は非操作。

音声は未完保留。P5c-1は本人Drive認可・保存先・独立解除までで、バックアップ転送・Drive再生成・退会完了を含まない。自動バックアップはOFF固定。trashは自動再作成せずGoogle側での復元手順・再選択・新規作成を案内する。明示再連携の影響確認と新連携成功時だけ旧バックアップを取消す方針は採用済みだが、実転送の取消接続はP5c-2。通常access refreshを再連携と扱わない。

## 現コードとの差と最小推奨

|対象|現状|S4で提案する差|
|---|---|---|
|連携日時|credential.connectedAt保存済み、settings未返却|nullable ISO DTOへ投影。「連携日時」と表示。列追加なし|
|最終利用|connection.lastUsedAt、repositoryのtouch CASあり。Drive applicationの現代入はnullのみ|下節の成功利用定義を採用後に記録・投影。架空値/GET更新なし|
|SSOアカウント初期提案|authorization portにloginHintあり、beginはnull固定|同じHollow本人の既Google identityの検証済subjectをサーバーで参照。chooseAccount時はhintなし。client入力からsubjectを採用しない|
|receipt再読|本人同DriveActorのcommand検索のみ|commandまたはoperation IDの排他的lookupを追加し、ID検索にも同じ本人/context/current検査。callback後と再読に使用|
|再読時の継続操作|settingsに本人live locatorなし|現在本人contextのlive操作だけ、有限locatorを読取投影。他session/browserの進捗・IDは非開示|
|履歴|controlsだけの90日/100件history|認可attemptも専用履歴に含める最小read portを提案。合計100件、安定順、秘密/contextなし。旧ImportJobs DTOへ混入しない|
|Picker発行|beginPickerと内部runDriveControlが分離。runnerはPickerを自動実行しない|request-aware専用POST facadeで本人/current確認→一回claim→秘密DTO返却。任意IDの内部runを直接公開しない|
|runtime注入|DriveServicesにruntimeGenerationなし|サーバー専用のreadonly runtimeGenerationを内向きservicesへ注入する小差を提案。adapter castやclient指定は禁止|
|Picker公開設定|Node configにはappId/apiKey、通常read DTOにはない|専用launch応答に必要な公開設定のみ明示投影。keyring/OAuth client secret/refresh token等は返さない|

これらはS4接続で必要になる差であり、S3 adapter成功/不合格へ読み替えない。新テーブル・DDL・scope・依存パッケージは提案しない。履歴port・services注入・日時記録は共有差なので、Manager採用前に実装しない。

## 最終利用日時の意味

推奨する「最終利用」は、現在のDrive資格で保存先のmetadataを確認、またはfolder作成結果を検証し、その有限結果を現在条件と実close確認の下で保存できた日時。UIラベルは「最終利用」、補足は「保存先の確認・作成」。連携日時と最終確認日時を別に表示する。

|操作/結果|connectedAt|lastUsedAt|
|---|---|---|
|初回/明示再連携の新資格採用成功|新採用日時|新epochではnull|
|認可失敗・refresh token不足・取消|旧値保持|旧値保持|
|通常refresh成功/失敗|保持|更新しない|
|Picker ticket/access token発行|保持|更新しない|
|metadata成功→readyまたは現在の保存先としてcommit|保持|成功結果保存時に更新。ready後の本人確認未実施とは区分|
|同ID作成/409後のmetadata成功|保持|現在条件で結果保存した時に更新。409だけでは更新しない|
|pre-generated ID確保のみ、404/拒否/一時障害、取消/unknown/late/current不一致|保持|更新しない|
|settings/receipt/history GET、画面表示|保持|更新しない|
|後続バックアップ|P5c-2で定義|将来の成功利用候補。今回記録しない|

touchは結果保存と同Txで、同connection epoch/sub/credential use/currentを照合する。connection version CASを使い、`max(既lastUsedAt, 今回確定時刻)`で後退させない。旧epochの遅延応答で新資格の日時を更新しない。folder保存がlastUsedAtをnullへ戻す現代入は、この定義採用時に保持/更新へ変更する。clock値とupdatedAtの合法性も既guardへ従い、日時のために結果採用/current guardを弱めない。ready保存後に本人が選択を取消した場合、先に成立したmetadata確認の利用日時は消さない。取消後の遅い結果を新たに記録することとは区別する。

既OpenRouterは同じ「最終使用」/未使用の表示形を持つが、今回の限定読取では非null更新元を確認していない。意味を推測してDriveへ転用せず、OpenRouterの修正・全体監査には広げない。IN-08が指定しない利用イベントの細部は上記をManager判断事項として返す。

## 日本語画面と操作

設定導線に「Google Drive」を追加し、専用 `/settings/drive` を用意する。Googleログイン設定は別のまま。現状態、連携アカウント（emailがなければ「連携済みGoogleアカウント」）、連携日時、最終利用、保存先名/最終確認日時、自動バックアップOFFを表示する。subject/生IDをアカウント名の代用にしない。

|状態|表示と操作|
|---|---|
|未構成|「この環境ではGoogle Drive連携を利用できません」。保存済み状態は事実として別表示。操作可能性を推測せず無効化。既ノート/Googleログインは通常利用可|
|未連携|「Google Driveと連携」。既Googleログインがある場合はそのアカウントを初期提案し「別のGoogleアカウントを使う」を選べる|
|連携済み/保存先未設定|「新しい保存先を作成」「既存の保存先を選択」。作成は明示操作時だけ。画面表示で自動作成しない|
|連携済み/保存先あり|名称と確認日時。「保存先を変更」。前回確認と現在の到達可能性を同一視しない|
|再連携が必要|「Google Driveへの再連携が必要です」。旧保存先/日時は最終保存情報として保持、利用可能と断言しない|
|処理中/結果不明|処理・結果照会を区別。純GET「結果を確認」。不明だけで再POST/別folder作成しない。owner unknownを期限で消さない|

### 認可・再連携・解除

begin前に現在の取消対象folder操作集合を取得し、既sequence/current IDs⊆confirmed IDsの契約で影響確認する。減少は再確認不要、新受付/ABAは再確認。再連携失敗やOAuth画面取消だけで旧資格・保存先を破棄しない。新candidate採用待ちで旧owner終了を待つ場合は「前の処理の終了を確認中」とし、成功表示を先行しない。

callbackは専用Node handlerから既applicationへ渡し、code/stateはログ・React props・結果URLに残さない。結果URLは認可operationの有限IDだけ。callbackはOAuthの明示消費入口であり、通常のpure GET receiptと混同しない。選択accountがSSOと違ってもHollow identity/sessionを交換しない。

「連携を解除」は明示確認後のlocal fence。Googleログイン、Drive上のファイル、Google側のまとめられた認可を削除しないことを短く説明する。旧ownerは実closeまで保持する。現段階で存在しないバックアップ転送を「取消済み」と表示しない。

### 保存先・trash・所在不明

Pickerの選択結果は候補にすぎない。serverでfolder/shortcut先/trashed/canAddChildren/resource-key/shared Driveを検証し、ready結果の対象へ明示確認後、再検証して保存する。shortcutは選択元と実保存先の違いを表示する。表示用名称がreceiptに不足する場合は、確認DTOへserver検証済み名称の有限投影を追加する案を先に採用する。clientの名前/親/権限を正本にしない。

trash確定は「保存先がゴミ箱にあります。Google Driveで復元してから選び直すか、別の保存先を選択・作成してください」。復元そのものはGoogle側で行う。最小案では復元後にPickerで同じfolderを再選択し、通常のserver検証と確認を通す。現在のfolderを専用再検証する新control kindや、GETからの再検証は追加しない。

404/removed/所在不明は「保存先が見つからないか、アクセスできません」。削除確定・自動代替・無断再作成はしない。権限不足/一時不可/回数制限/不正metadataは既有限codeで分け、前の保存先情報を黙って空にしない。

表示変換はDrive専用の閉じた対応にする。`DRIVE_FOLDER_TRASHED`は復元/再選択案内、`DRIVE_FOLDER_DENIED`は権限確認、`DRIVE_FOLDER_UNAVAILABLE`は所在・アクセス不明、`DRIVE_FOLDER_INVALID`は保存先として利用不可、`DRIVE_RATE_LIMIT`は時間を置いた明示再操作、`DRIVE_UNAVAILABLE`は一時利用不可。`DRIVE_SCOPE_REQUIRED`/`DRIVE_REFRESH_REQUIRED`は必要な再同意、`DRIVE_CONTEXT_CHANGED`/`DRIVE_CONNECTION_CHANGED`は現在状態の再読、`DRIVE_EXCHANGE_UNKNOWN`/`DRIVE_REFRESH_UNKNOWN`/`DRIVE_CREATE_UNKNOWN`は結果不明として扱う。provider本文・raw例外を表示せず、コードだけで自動再POSTを決めない。一般error middlewareを広く変更せず、bridgeから既有限アプリケーションエラーを返す。

create結果不明は同operation・同file IDを保持する。「結果を照会」は明示inspect POSTで、receipt GETとは別。404後も同ID追加送信可の状態を保持する。`canResend && current && closed && sends===1`のserver投影を満たす場合だけ「同じ保存先IDで作成をもう一度試す」を明示確認し、最大2送信。別ID再発行/自動再送なし。409/conflictまたはinspectで初めて観測した親は自動採用せず、readyのserver確定対象へ本人確認する。stale/current不一致は現在receiptへ戻し、成功に偽装しない。

## Transport/DTOとPicker

新 `driveInput.ts` は初回command UUID・expectedEpoch/settingsVersion・既confirmation（sequence/current IDs）の公開形・consent/chooseAccountを閉じたschemaで検証する。暗号envelopeは返却/入力しない。operation継続は既ID＋expectedVersion＋phaseとactionの判別unionで、confirmのtarget、resendのsendsを必要な枝だけ許可する。cancelはkind/id/version。Picker選択はpickerId/ticket/fileId/resourceKeyだけ、既UTF-8上限を維持する。JSON全体も有限化し未知field/過大配列を受付けない。

settings/receipt/historyは `Cache-Control: no-store` のGET。actorとsession/browser epochを毎回serverで再照合する。settingsに現在actorのUI世代とlive locatorを追加し、clientがauth/contextを入力しない。receipt locator候補は以下で、raw rowを返さない。

```ts
type DriveReceiptLookup =
  | { by: 'command'; kind: 'authorization' | 'control'; commandId: string }
  | { by: 'id'; kind: 'authorization' | 'control'; id: string };
```

履歴は公開kind/phase/createdAt/terminalAt/failureだけ。本人accountの履歴でも別browserの行から操作可能なlocator/currentを漏らさない。認可historyを追加する場合、attempt/controlを90日以内から各bounded取得し、安定した時刻+ID順で合計100へ絞る。旧job数やLLM使用量と合算しない。

Pickerは通常settings/SSR/loader/receiptへtokenを返さない専用POSTを置く。origin、session、同DriveActor、current operation、one-time claimを検査するapplication facadeが必要。既内部 `runDriveControl` を任意IDで直接呼ぶbridgeは不可。responseはaccessToken/ticket/accessExpiresAt/pickerExpiresAtと公開appId/apiKey・追加scope有無の有限注意だけを明示返却する。URL/query/storage/history/ログに保存しない。API keyはブラウザ用公開制限keyでありOAuth secretと区別する。

Picker ticketの5分とGoogle access token実期限は別物。「5分でGoogle tokenが失効する」と表示しない。画面close時は参照を破棄するがGoogleでの失効保証ではない。combined grantのtokenが既認可権限を含む可能性を説明し、専用downscopeと称さない。

launch応答喪失時は同command GETだけで受付/待機状態を確認する。tokenをGET再返却、同claim再実行、勝手な新Picker開始はしない。本人が旧Picker取消→新しい選択操作を明示する回復導線を持つ。SDKロード失敗・期限・画面離脱ではtoken参照を破棄し、必要な取消は明示POSTで行う。離脱だけでserver owner closedとしない。

SDK入口は既公式参照の固定 `https://apis.google.com/js/api.js` に限定する候補。任意script URL/HTML注入/動的provider URLは禁止。trusted scriptロード失敗、Picker未利用可能、CSP拒否は有限エラーで止める。必要なscript/frame/connect originの正確な集合は現資料で未確定なのでS5の公式照合/配備判断事項。wildcardや全体CSP解除で通さない。contract UIのfake Picker成功を実Google SDK/CSP/審査成功にしない。

## Reactの所有・ACK・操作性

既 `useAuthenticationOperation` は呼出しごとにrevisionが変わるため、pollとmutationを無関係に並列発行しない。画面ownerが単一mutation flightを持ち、pollはmutation中停止し、結果はactor/route/generationの一致時だけ適用する。古いfinallyが新pending/errorを消さない。React `useTransition` / `useActionState` にpendingを接続する。

非秘密の本人選択（既定作成/選択、別account選択等）はdirtyを守り、GET再読で上書きしない。秘密token/ticketはReact表示値に混ぜず専用Picker controllerのmemoryのみ。route離脱/logoutで破棄し、late responseを無視する。保存前選択/確認の前後を明示し、単なるPicker表示で設定変更済みにしない。

未知ACKは「結果を確認できません。結果を照会してください」とし、同command/operationのGETへ接続。pollは候補として2秒間隔・最大30回、その後手動GETにする。自動再POSTなし。再読は本人live locatorから復帰し、必要ならvalidateSearch済みの非秘密operation IDを使う。認可code/state/tokenをrouteへ渡さない。locator自身も他actorへ表示しない。

各ボタンはaction固有の日本語名、pending時の二重送信防止、inline有限理由、role=statusの状態通知を持つ。確認は対象と影響を含み、通常Tab順で取消へ戻れる。390pxで横スクロールなし、長い保存先名/emailを折り返す。共通CSS変更は実差が必要な場合だけ別申告し、他画面を広く変更しない。

## 実編集候補とS4/S5境界

|段階|具体path候補|責務/注意|
|---|---|---|
|S4|`apps/web/app/presentation/driveInput.ts`, `driveServerFn.ts`, `driveHttp.node.ts`|有限transport、純GET/POST分離、専用callback handler。handler単体はfake接続で確認、まだserver登録しない|
|S4|`apps/web/app/components/hollow/DriveSettings.tsx`, `DriveResult.tsx`, `DriveHistory.tsx`, `DrivePicker.ts`|UI、専用memory Picker controller。直接testは同名testを各pathへ限定|
|S4|`apps/web/app/routes/settings.drive.tsx`, `auth.drive-result.tsx`|currentUser/validateSearch/actor key。既callbackルートに混ぜない|
|S4|`apps/web/app/components/hollow/Shell.tsx`, `apps/web/app/routes/notes.jobs.tsx`|設定導線と独立Drive履歴だけ。既import/export/job data不変更|
|S4共有補足候補|`packages/core/src/application/integration/drive/{read,connection,folders,ports}.ts`、新 `picker.ts`|日時/locator/表示DTO、loginHint、現在結果のlastUse、専用POST facadeとruntime generation injection|
|S4共有補足候補|`packages/core/src/domain/integration/driveRepository.ts`, `packages/core/src/adapters/libsql/repositories/driveRepository.ts`|attempt historyのread port/SQLだけ。新DDLなし。履歴非採用なら変更不要|
|S4直接test|既Drive application test＋上記presentation/component test|下記有限集合。S3 wire/closureの全再実行はしない|
|S5|`apps/web/app/server.node.ts`|Drive config/protector/provider/execution/root runner生成、callback dispatch、generation注入、boot/wake/stop登録、CSP等のresponse境界|
|S5必要時のみ|`packages/core/src/application/di/hollowTypes.ts` / `serverNode.ts`|既containerで足りるか確認。DriveServicesの追加fieldだけで済むならDI別変更なし|
|S5|Node配備docs、必要build/route生成出力・直結test|未構成起動、配備生成物、0038の保全/clone/正式適用、同bundle UI。個別許可前に実施しない|

S4でserver function/routeが書けても、Drive factory/runtime/callback/Picker policyをS5で実接続するまでは利用可能とは報告しない。S3 executionのregistry/coordinatorはadapter内のまま。root停止はaccepting停止→abort→caller/HTTP/保存/proof ACK drain→DB closeの既契約に従い、UI導線のために所有証明を簡略化しない。

旧条件への影響はactual差で再判断する。認証callback/context参照に直接届く場合のみP5a-C/G、加算repo/UoWへ実差が届く場合のみP5b-1-A、Node未構成/配備のP1-E、notes.jobsの履歴共存の既P2a-E等を候補とする。現時点で旧条件を一括reopenしない。Google SSO/token交換本体、LLM/原本/import/usage/既migrationは変更対象でない。

## 有限検証案と予算（未許可・未実行）

S4静的/component案は24群以内：状態/未構成4、認可/再連携/解除4、保存先/shortcut/trash/404/create/409/resend6、Picker memory/期限/SDK失敗4、ACK/actor/dirty/pending/390/keyboard6。Transport pure12以内：閉じたshape/bytes/current/秘密DTO/GET純読取/callback有限化。application DBは16以内：日時正負/epoch・late4、本人receipt/live/history4、loginHint2、専用Picker launch/current/喪失後非再発行6。計52以内を初期上限候補とし、包含/旧借用と分ける。

提案rootは将来の新0700 `p5c1-s4-YYYYMMDD-XXXXXX` 1個。DBは成功逐次active1＋失敗保存1の最大2、総32MiB/active16MiB、material256KiB/other8MiB。HTTP/Google/native/notes0。既S3 wire・S2保存migrationは不変更部分を借用する。型→lint:fix→format、限定testsを行い、buildはS5統合範囲の承認後。失敗DBは保持・後続停止、削除で予算を戻さない。

後段の同bundle契約UI候補は別root、account1/linked1/WS0/note0/original0/asset0/LLM生成0。新contract DB1＋停止opaque1＋更なるaudit1の最大3、DB総64MiB/active16MiB/各copy8MiB、材料256KiB/other8MiB。既private/keys/DBコピー0。新合成鍵はHollow用32B×2とDrive AES32B×2（合計128B）を上限候補、OIDC RSA2048 pair1はmemoryのみ。実runtime/serverは自己各1、固定候補3100/3101は当日のexact不在確認と別許可が必要。

操作上限候補は認可begin3（refresh不足失敗1/初回成功1/明示再連携成功1）、Picker2、folder-select2、create1（同ID sends最大2）、localunlink1。fake providerは最大32要求/累積wire8MiB、逐次HTTP1、合成folder最大2。ACK喪失は新begin1の既枠内に一回だけ、再arm/自動再POST0。metadata inspect/confirm/refresh等も32要求に含め、具体scriptを許可前に積算する。UI route再読/onoff/390/Tabは生成なし。実Google/Picker外部scriptをcontractに読み込まないため、Google画面・実同意・実CSP/審査・実shared Driveの成功根拠にはならない。

新folder原本/ノートを作らないためノート回収なし。account/key/mail/input/backupは保持する。通常停止後、PID/全pipe/socket/ports/handles/exec0→停止opaque→更なるauditでDrive有限状態とnote0を確認する案。fresh保全/0038 clone/正式適用の集合と容量はこの案に含めず、S5で別途申告する。

## 採否事項・外部限界・引渡し

Manager判断は、(1)上記lastUsedAt定義、(2)runtimeGeneration注入とrequest-aware Picker facade、(3)本人ID/live locator・認可historyの最小read port、(4)確認画面に必要なserver検証済み名称DTO、(5)S4/S5の実接続境界と各有限予算。いずれも本書で実装したものではない。

公式前提は既 `P5c-proposal.md` の2026-09-29確認記録を参照する：[Picker overview](https://developers.google.com/workspace/drive/picker/guides/overview)、[Web sample](https://developers.google.com/workspace/drive/picker/guides/web-picker-sample)、[OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server)、[folder](https://developers.google.com/workspace/drive/api/guides/folder)。本作業では新web照会/実APIをしておらず、資料の記述を実成功へ読み替えない。正確なCSP許可集合・Cloud projectのPicker/API key制限・OAuth審査/combined grant・共有Drive/リンク共有resource-keyの実利用は未検証で、権限拡張や全Drive探索で埋めない。

本書以外の変更0。製品/test/helper/root/DB/HTTP/runtime/browser/build/旧proof/外部実行0。EOF全文確認後、公開source読取を含む全文書/read/write/runを停止してManagerへ返却する。S4/S5開始は別委譲を待つ。

## 実装前exact追補

前節までの5提案はManagerが方向採用した。本節はその型・接続範囲を固定するための追加案で、依然として製品編集/試験は未許可。Pickerの説明はtoken受領後でなく、専用POSTを呼ぶ**前**の「説明を確認して保存先を選ぶ」明示操作に置く。説明は必要な選択にだけ付随させ、後から返る追加scope情報で事前選択を代用しない。

### 1. settings / locator / receipt

以下のISO/UUID/整数/stringには既境界の有限検査を適用する。application DTOにdomain entity・hash・owner token・envelopeを混ぜない。

```ts
type DriveViewActor = Readonly<{
  accountId: string; authVersion: number; browserEpoch: number;
}>;
type DriveLocator = Readonly<{
  kind: 'authorization' | 'control'; id: string; commandId: string;
}>;
type DriveSettingsView = Readonly<{
  actor: DriveViewActor;
  configured: boolean;
  state: 'unlinked' | 'linked' | 'needs-relink';
  epoch: number; settingsVersion: number; autoBackup: false;
  account: null | Readonly<{ email: string | null; connectedAt: string }>;
  lastUsedAt: string | null;
  folder: null | Readonly<{
    id: string; name: string; driveId: string | null; checkedAt: string;
  }>;
  confirmation: Readonly<{
    version: 1; expectedEpoch: number; sequence: number; ids: readonly string[];
  }>;
  live: readonly DriveLocator[];
}>;
type DriveTargetView = Readonly<{
  sourceId: string; targetId: string; targetName: string | null;
}>;
type DriveCreateConfirmationView = Readonly<{
  fileId: string; parentId: string; targetName: string | null;
}>;
```

accountはlinked/needs-relinkの保存済みcredentialのみから作る。email不明はnullのまま、連携日時を表示する。架空account名/email・subjectによる見かけ上の補完はしない。actorは現在本人の公開世代整数であり、sessionHash/browserHash/tokenを返さない。clientへ返した世代を認可の正本にせず、全server入口で現在actorを再読する。

liveは既 `liveForAccount` の各103件以内を取得し、`sameDriveActor` 完全一致を確認したものだけをkind+IDの安定順で返す。最大206 locator。返却前の他browser件数・ID・進捗・「他の処理あり」フラグを追加しない。このbounded再発見集合は全件証明ではなく、表示されないことを取消/消失/再受付可の根拠にしない。既command/ID lookupはこの集合と独立し、保存された本人locatorを直接再照合できる。global一覧や現在の他browser操作をUIへ公開する新portは不要。

receiptは既 `driveReceipt` の有限fieldを維持し、target/creation.confirmationを上記の名称付き型へ変更する。lookupは前節のID/command排他union。必ず現在accountを条件にし、row contextと同DriveActorでなければnull。他browserの操作は存在確認も返さない。ownerはstateだけ。current=false/期限切れでも履歴的な結果を現在成功としない。

名称の追加はDTOだけでは成立しない。現dataには名称がなく、pure GETで再取得もできないため、Manager方向採用のnullable `targetName` を既control data JSONへ保持する。`domain/integration/drive.ts` のfolder-select ready/verifying-target、およびfolder-createのcreationIdentityを持つ枝にUTF-8 1〜4096B又はnullを追加する。内部schemaは旧欠落を許すoptional nullableとし、decoderは欠落を保存形のまま保持する。DTOだけ `targetName ?? null` に投影し、新業務遷移の書込はfieldを明示する。未知field拒否のstrict検査は維持する。旧terminal dataのowner閉鎖でfield補完/backfillを起こさず、既terminal JSON不変guardを守る。

現SQLのdata CHECKはjson_valid/全体64KiB/phase整合と既fieldの値域を検査し、JSON keyの完全列挙ではない。新fieldを追加しても旧CHECKを緩める必要はなく、新列/DDL/0038編集は不要という案。新名称の値域はdomain/mapper境界で検査し、全体64KiB超過も拒否する。`adapters/libsql/repositories/driveRepository.ts` のdecodeControl/replaceで旧欠落互換を揃え、ready→verifying-targetでは元target/source/keyに加え確認対象の名称も保持する。旧欠落はその遷移でも欠落を保持でき、名前だけの無断SETで確認versionをすり抜けない。

`folders.ts` は真にusable metadataから得たfolder.nameだけを保存する。shortcut観測だけならtargetName=null。「名称未確認」とtargetの区別を表示し、clientのPicker名をserver検証済み名としない。後続の確認POSTが既契約どおりtarget metadataを再検証する。create初期/preparedはnull、metadata成功後にだけ名前を設定する。旧行/nullは合法であり、名前の欠落を理由にactor/epoch/設定版/targetの確認を省略しない。

正確な追加影響pathは `packages/core/src/domain/integration/drive.ts`、同 `drive.test.ts`、`packages/core/src/adapters/libsql/repositories/driveRepository.ts`、`packages/core/src/adapters/libsql/__tests__/drivePersistence.integration.test.ts`、`driveFixtures.ts`（型補完だけ）、`driveApplication.integration.test.ts`、既application `folders.ts` / `read.ts`。列追加が必要と判明したら、この案で実装を続けず別提案する。

### 2. account履歴はbrowserを跨いで保持

追加portは `DriveAttemptRepository.history(accountId: string, since: Date, limit: number): Promise<readonly DriveAttempt[]>`。limitは1〜100、sinceはapplication clockから90日前。account一致＋createdAt>=since、phase/epoch/context有無による除外なし。既control historyもfolder-select/folder-create/disconnectという既kind filterを維持し、refresh/Pickerの内部処理を新たに履歴表示しない。

両repoは `createdAt DESC, id DESC`、各100件まで。applicationは二集合最大200件を同じ順序でmergeし、同時刻・同IDの場合のkind順を固定して先頭100を返す。現在のcontrol ASC順からの変更は明示する。新旧browser/旧epoch/terminal scrub後の自分の履歴を消さない。認可履歴は連携の成功/失敗を示し、秘密dataを返さない。

履歴DTOは `kind: 'authorization'|'folder-select'|'folder-create'|'disconnect'`、id、phase、createdAt、terminalAt、failure。idは本人account履歴の識別用であって他browserの操作権ではない。操作可能なlocator/currentはこのhistoryから生成せず、同actor receipt照会が成立した場合だけ個別操作へ進む。live locatorの非開示契約と、本人account履歴の保持を分ける。旧history100と新history100を別々に表示して200件へ拡張しない。

### 3. Pickerの内外境界

内向きservices追加候補は `runtimeGeneration: string` と `picker: Readonly<{appId: string; apiKey: string}>`。これはserver-onlyで、Node configから厳格検証済みの値だけをS5 rootが注入する。generationは既execution/rootと同一、client引数にしない。公開appIdは数字1〜32B、API keyは現configのASCII1〜256Bを維持する。OAuth clientSecret・keyring・callbackUrl・runtime recordは公開設定に含めない。

新application `picker.ts` の署名候補:

```ts
launchDrivePicker(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: DriveInitialInput,
): Promise<
  | { kind: 'issued'; receipt: DriveReceiptView; picker: {
      accessToken: string; ticket: string;
      pickerExpiresAt: string; accessExpiresAt: string;
      appId: string; apiKey: string;
    } }
  | { kind: 'receipt'; receipt: DriveReceiptView }
>;
```

`DriveReceiptView` は上記有限projectionの型alias。facadeはbeginPickerの同command/current/同actor検査を経て、**新規acceptedのqueued行だけ**を既内部runDriveControlへ渡す。既存commandへの再POSTはreceiptだけとし、token再発行/run再実行しない。claim/currentは既S3 coordinateとwithCallerの経路を維持。新規受付後のclaim競合もreceiptへ収束し、勝手に別commandを発行しない。originの生HTTP検査はpresentation、session/browserからのactor照合はapplicationで二重に責務を混ぜない。

専用endpoint候補は同origin `POST /api/integrations/drive/picker`。`driveHttp.node.ts` にhandlerを作り、S4では未登録のままfake単体確認。JSON request最大4KiB、初回command/epoch/settingsVersionだけ、closed schema。responseはJSON stringify後のUTF-8実bytes最大64KiB、`Cache-Control: no-store, private` / `Pragma: no-cache` / `Referrer-Policy: no-referrer` / `X-Content-Type-Options: nosniff`、CORS許可なし。bodyを一般server functionのserializer/middleware/loggerに渡さず、明示したfieldだけを専用Responseへ出す。有限エラーにも元cause/message/bodyを付けない。

実token長やJSON escapingでresponse上限を超えればtokenを返さず有限失敗にする。既受付やownerを成功前状態へ巻戻さず、同command GETでreceiptを確認し、本人取消/期限の既経路へ進む。64KiBはprovider tokenが必ず入る保証ではない。通常DTO（settings/receipt/history）はUTF-8 JSON128KiB以内の有限投影を初期上限候補とし、過大時に中途JSONや秘密fieldを返さない。

`DrivePicker.ts` は専用fetch応答をboundedに読み、controller closure内だけでaccess token/ticketを保持する。Reactへはphase/expiry/有限failureと非秘密receiptだけ通知し、response全体をuseActionState戻り値・SSR props・loader cache・consoleへ渡さない。Picker選択POSTのticket/resourceKeyもcontrollerから送る。通常Reactフォームの成功戻り値へ秘密を引き回さない。選択POST payload最大16KiB、各ID/key1024Bで固定。取消/route/logout/expiryでは参照を消すが、Google失効や実closeの証明にはしない。

事前説明は「選択のためGoogleのアクセストークンをこのブラウザに一時的に渡します。以前許可した権限を含む場合があります。画面を閉じてもGoogle側で直ちに失効するとは限りません」。ticket有効5分/実access期限は受領後の状態説明で別々に示す。scope名の全量や過大文字列を新DTOへ返さず、事前のcombined grant説明を常に維持する。

### 4. lastUseの正規CAS

追加処理は `folders.ts` の既owned result保存callback内へ限定する。usableのselected→ready、created/conflict後のusable→ready/complete、確認済みtarget→completeにだけ適用する。shortcutだけ・ID allocatedだけ・reconcile/404・refresh/Picker・failed/cancel/unknownには適用しない。

同Tx内でexact current rowと `driveRecordCurrent(..., true)` が成立したconnectionを取得し、sub/epoch/credentialUse/設定版を再照合する。`lastUsedAt=max(oldLastUsedAt, now)` とし、既 `driveConnections.replace(next, connection.version, 'touch')` を使う。touchがCAS不成立なら結果保存もrollbackし、V4のexact owner閉鎖保存経路へ返す。DB/commit不明をclosed成功としない。

採用時はtouch→saveFolder→control ready/complete保存の同Tx。saveFolderはtouch後のconnectionを再読してversion CASし、lastUsedAtを保持する（現null代入を削除）。外側の既閉鎖証明/現在条件/保護失敗処理を保ち、日時保存だけ先にcommitしない。settingsVersionをlastUseだけで進めず、既folder採用時だけ進める。新epoch採用は既null初期化を維持する。必要最小製品差は `folders.ts` と `read.ts`、正規touchのrepo/DDLは既存のままを第一案とする。

### 5. callbackとS4/S5・回帰集合

S4 `driveHttp.node.ts` は固定callback path＋上記Picker POSTを扱うhandler factoryをexportするだけ。callback pathは検証済みconfigの単一正本から注入し、別の文字列設定を増やさない。method/query/body上限、state/code重複拒否、有限結果redirect、cookie/origin責務をfakeの現在本人contextで確認する。S4で `server.node.ts` のdispatchには登録しない。

S5はserver rootでconfig/DriveServices/runtimeGeneration/root runnerを一回構成し、callback/Picker handlerを既handler列へ明示登録する。Drive未構成でも他機能が起動し、専用入口は有限未構成応答。wake/tick/通常stopを登録し、accepting停止・abort・全caller/proof/DB確定ACK drain後にDBを閉じる。S4のhandler単体成功をcallback配備やPicker利用可能としない。

52は新局所対の初期上限であり、旧回帰を含む総数ではない。内訳はcomponent24＋transport12＋新application12＋名称互換pure2＋persistence2。前節のapplication16枠のうち4を名称互換へ振り替え、旧欠落terminalのowner閉鎖でJSON非改変、ready名称保持、旧欠落/過大/未知fieldを含める。既application36、pure15、persistence18はこの共有差に直接届くため追加の比例再照合候補（新局所と合わせ最大121、包含を別記）。S3 wire26/authprune8/closure10/移行3は変更不影響を借用し、全反復を既定にしない。withCaller/close等へ実差が届けば、その時だけ旧closure対を別申告する。

componentの390/keyboardは構造・イベント・属性の確認に限り、実レイアウト/非遮蔽/ブラウザTab成功と称さない。S4は新root/DB32MiB・active16MiB・最大2（失敗1含む）/材料256KiB/other8MiB、HTTP/native/browser/build/fresh0の方向。S5の32HTTP・鍵・account・保全案は未許可のまま。既回帰も同逐次active1/失敗保持停止に従い、件数増を保存DB増/無限retryの許可にしない。

追補は公開sourceの静的照合だけ。製品/test/fixture/DDL/helper/環境変更・実行0。本書の追補を含めEOFまで確認後、全文書/read/write/runを停止して返却する。
