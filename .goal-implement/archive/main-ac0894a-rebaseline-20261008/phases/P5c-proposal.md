# P5c候補：Drive連携・原本バックアップ

## 結論と境界

次は **Drive連携・保存先確定・独立解除の縦接続** を推奨する。続いて原本バックアップ、Drive原本からの再生成へ接続する。音声の別方式に関する回答を必要としない。音声は現方式でprivacy条件が未成立の必須残件であり、Driveを進めても除外・達成扱いにしない。

本書はManager判断用の静的案。goal-implementを全文確認し、公開source・brief/design・原要件/シナリオを読取、新規の本書だけ編集した。製品/管理4正本/既報告/lock/dist/DB/proof/環境/外部は非操作、Node/test/build/browser/API実行0。Verifierが環境を単独所有する。spec/spec-implement/goal操作0、正式開始・依存追加・scope変更・DDL採用を含まない。

## 原文と現在との差

根拠は [requirements](../../spec/requirements.md)、[IN](../../spec/scenario/integration.md)、[IM](../../spec/scenario/import.md)、[JB](../../spec/scenario/jobs.md)、[AC](../../spec/scenario/account.md)、[OR](../../spec/scenario/organize.md)、briefの利用者決定、design「Google Driveの連携境界」。

| 原文 | 必要な結果 | 現sourceの接続点と不足 |
| --- | --- | --- |
| IN-04/08/09、AC-03/06 | 本人のDrive増分認可・状態・独立解除 | `application/account/google.ts`はlogin/link/reauthとsession確立を扱う。`adapters/node/auth/googleOidc.ts`はopenid/email/profile・online認可。Driveのoffline資格・専用purposeへ転用しない |
| IN-05 | 保存先の確認、autoBackup設定、過去原本へ遡及しない | `HollowContainer`/`HollowUnitOfWorkContext`にDrive services/repositoryなし。folder設定・外部確認・永続作成operationが必要 |
| IN-06、IM-01手順8、OR-09、OR-11 | 実行者のDriveへ単件/一括/自動backup、結果・理由・リンク | `notes.$noteId.index.tsx`はDrive未提供表示。`domain/batch/entity.ts`の操作unionはtag/trash/move/sharingのみ。`domain/job/entity.ts`は変換job専用。既履歴の見た目だけでbackup実装済みとはできない |
| IN-07、IM-06、JB-01〜03 | 記録した本人のDriveから取得、現在認可、本文置換/undo/取消 | `application/llm/request.ts`はHollowのOriginalをsourceにする。`adapters/node/llm/sourceReader.ts`はObjectStorageのowned read/bytes/hash照合。Drive provenanceを単なるkey差替えで隠さず追加契約が必要 |
| AC-09、IN-09、JB-03 | 解除/退会/権限喪失時停止、Drive上の既存物は残る | 退会本体の完成を本案に含めない。Driveの外部owner/資格/backup記録の寿命を退会・WS残存noteの回収と整合させる必要がある |

`EditorBackupRecovery`/`editorSave`のbackupはブラウザ内の編集復旧であり、Drive原本backupではない。既原本のHollow永続保持もDrive backup成功の代用ではない。既Google認証・公開/LLM方式の再設計は不要。

## 最小phase境界

名称・固定条件は未採用候補。提供前の公式確認を各実装の入口にまとめ、APIごとの独立gateを増やさない。

1. **P5c-1：本人連携と保存先** — IN-04/08/09とIN-05の保存先まで。専用OAuth、長期秘密保管、接続状態、Picker候補のserver検証、既定専用folderの冪等作成、再選択、解除を設定UIまで通す。backup未提供の間にautoBackupを有効化できるだけの空機能は出さない。設定不足/キャンセル/失効を含むローカル契約検証を先行する。
2. **P5c-2：原本backup** — IN-05のautoBackup、IN-06、IM-01、OR-09/11、JBを接続。小さな単件を先に通し、同じ転送契約で自動・一括/部分失敗を仕上げる。autoはupload本人、手動は操作本人のDriveへ保存し、変換の成否と独立する。過去原本の自動遡及0。ここで関連解除・trash・除名/降格・WS削除の実停止も完成させる。
3. **P5c-3：Drive再生成** — IN-07/IM-06。記録所有者の資格と現在note権限の両方で取得し、原本同一性を検証して既変換/commit/undoへ接続。失敗・取消では旧本文を保持。音声の非提供は維持し、他形式のDrive取得成立を音声変換成立にしない。

AC-09本体は横断削除の後続境界。P5c-1/2から退会失効・転送drain・残存WS記録の扱いをportで確定するが、未実装退会UIを完成扱いにしない。逆に退会本体完成待ちでDrive設定の契約検証を止めない。別案の「連携から再生成/退会まで一括」は認証・転送・本文commitの原因切分けが広すぎるため推奨しない。

## 守る共有契約と未決リスク

### GoogleログインとDrive認可

現在Hollow本人を開始時/戻り時に照合し、Drive認可が新Hollow sessionやGoogleログインIdentityを作らない。SSOのsubはアカウント選択の助言にだけ使い、別Google accountでのDrive連携を許す。実際の選択画面省略はGoogle側の現仕様確認が必要で保証しない。検証済subと付与scopeを正本とし、email/Picker表示をidentityにしない。

既採用どおり専用attempt/purpose/keyring、browser/session世代・expected epoch・期限・一回限りCASを持つ。code交換の応答不明は自動再交換しない。refresh token不足の初回/再連携は明示再同意、通常refreshでの省略は同sub/epoch/versionの旧値保持と分ける。旧有効連携は新候補成立前に破棄しない。同sub再連携で旧jobをどこまで取消すかは未採用で、実装前にManagerへ返す。別subへ旧folder/backupを付け替えない。

Drive解除とGoogleログイン解除は独立。combined grant全revokeをDrive単独解除に流用しない。Hollow資格破棄とprovider側で全tokenが失効したことを同一表示にしない。Pickerを使う場合の短命access tokenだけのbrowser例外、memory/no-store/URL・log非保存、既発行tokenの残存リスクは採用designの境界を守る。

### 保存先の型別判定と外部副作用

serverは同subでfolder metadata/非trash/書込能力を確認して設定版へCAS。候補IDは任意URL fetch/shortcut追跡の許可ではない。概念上は `usable | deletion-confirmed | permission-denied | unavailable-ambiguous | provider-unavailable` を区別する（具体union/codeは未採用）。

**利用者決定済み：削除と権限喪失を区別できなければ、確認＋再選択/新規作成へ案内し、無断自動代替0。** 404や一覧欠落だけで削除確定にしない。削除が確認できた場合のIN-05自動再作成は維持するが、何を削除の十分な証拠とするかは公式仕様確認後に固定する。権限拒否は削除と表示しない。新規作成への明示同意と旧ファイル再送の同意を混同しない。

folder作成は永続operation＋事前file IDが採用designの前提。同ID照会/競合のmetadata検証で収束し、ACK不明のたびに同名folderを増やさない。この経路の現API成立条件を次の一次確認で検証し、成立しなければ別案をManagerへ返す。GETは状態照会のみ、folder作成や再選択採用を副作用として行わない。

### backup・現在権限・再生成

保存候補はDrive connection/attempt/settings、folder operation、backup operationと存続note用backup record。具体表数/DDLは次実装案で確定し、既0037等の変更許可を流用しない。既変換job/LLM dispatchへ無理に詰めず、共有UoW・DI・履歴projectionへの追加を先に型で申告する。

backupはactor、credential owner/sub/epoch、note/原本ID・bytes/hash、folder設定版を受理時に固定。送信直前・転送中・完了採用時にも現在権限/原本/世代を確認し、note移動/削除・降格・解除との競合を閉じる。同期外部I/OをUoW内で行わない。原本read pinとHTTP ownerは実closeまで保持し、timeout/取消/期限だけでunknownを解放しない。

actor+commandの永続receiptと同原本/同利用者の稼働抑止が必要。既backupを別actor/subの成功へ流用しない。「既backupなら再送しない」の記録と実行中/応答不明を区別する。resumable転送の応答不明は受信済み位置の照会で確定し、送信済みbyte数からoffsetを推定しない。照会不能ならunknown/再接続案内とし、無条件新upload0。外部だけ成立した可能性を隠さず、取消をDriveファイル削除完了と表示しない。

JBの本人90日履歴と、存続noteのIN-07に必要なbackup記録は別寿命。履歴pruneで再生成元を消さない。WSの別editorが操作する場合も記録本人のcredentialをserver内部で使い、他人のtoken/不要な連携情報を渡さない。記録本人の解除/退会は本人には再連携、他メンバーには自分への再backupを案内する。参照記録を新subへ移し替えない。

IN-07は現在parentsと記録folder、受信全bytes/hashを照合し、移動・欠落・改変では停止。Hollow原本への無言fallback0。取得用一時物/永続原本のどちらへ収容するか、有限bytes/deadline/所有pinとsource unionは未採用の設計事項。既50MiB LLM reader上限を音声200MB等へそのまま適用したことにしない。`commitNote`の現在認可/版/lock/旧本文保存/undoを維持し、Drive取得だけでLLM枠を消費したり、取得失敗を本文成功にしない。

## 固定受入候補と比例範囲

以下は既IN/IM/JB/ACの具体化候補で、新条件の採用ではない。P5c-1正式委譲時はA〜CとFの当該範囲に絞り、D/Eを完成条件へ混ぜない。

| 候補 | 観測できる完成条件 | 主な根拠 |
| --- | --- | --- |
| A | Google loginは不変、本人Drive連携・取消・再同意・遅いcallback拒否、連携先を正しく示す | IN-04/08、AC-03/06 |
| B | folderをserver検証、無権限/不明を区分、明示再選択/作成、ACK不明で重複作成0 | IN-05、利用者決定、採用design |
| C | Drive単独解除、auto OFF、資格/候補失効、実owner終了、Google login/既Drive物不変 | IN-09、JB-03 |
| D | 手動/自動/一括の本人backup・重複抑止・混在内訳・失敗再試行、取り込みと独立、90日後も再生成記録を保持 | IN-05/06、IM-01、OR-09/11、JB |
| E | 記録本人のDriveからのみ検証取得、現在権限/parents/hash違反停止、本文/版/undo/タグ/公開維持 | IN-07、IM-06 |
| F | 有限HTTP/streamと実close・現在認可競合・秘密非出力・同bundle UI/配備、契約/実接続の根拠分離 | design、CLAUDE、体験/非機能要件 |

最初の新path候補はdomain/applicationの`integration/drive`、nodeの専用Drive OAuth/HTTP/secret/config、libsql新repository/正式migration、presentation bridgeと設定route/component。既共有差は`hollowTypes.ts`/`hollowUnitOfWork.ts`/DI/通常server・runner・pruneに限定して申告する。後段で`acceptUpload.ts`/batch/履歴/詳細/現在権限取消/purge pin、さらにLLM source/request/worker/commit境界へ届く。既認証のAC-03/06、取り込みIM-01、OR-09/JB、IN-07のIM-06・版/容量・権限条件は**実差が届いた時だけ**旧受入の再確認をManagerが判断する。広い旧IDの一括reopenや、無関係Google/LLM全再演は提案しない。

## 次の入口で確かめる外部前提

今回は外部資料/APIを取得していない。現在のGoogle/Drive仕様として推測・断定しない。次正式段階の冒頭で、公式一次資料に限り、drive.file＋Pickerのfolder共有/書込能力、offline/増分認可・refresh/revokeのcombined grant範囲、事前IDとfolder作成/競合、resumable upload照会/再開/失効、parents/trash/削除と非可視の区別、共有Drive等の対象範囲、API/Picker設定・公開審査/テスト利用者制限を確認する。新scope/依存や対象範囲の拡張が必要なら実装前にManagerへ返す。

契約検証は新隔離DB/自己鍵/ローカルHTTP/fake Driveで認可・folder・転送/ACK不明・現在権限・解除を通す候補。最初は新account1/WS0、外部0、folder metadataだけでP5c-1を検証し、実行集合/容量/保全は別申告する。実アダプターの有限HTTP対と代替portのUIを混同しない。

実接続は別承認のOAuth/Picker設定・試験Google account・明示共有folder/作成対象・送受信bytes/許可操作/残存物保持方針を必要とする。資格値探索・Drive検索/読取/書込を今行わない。契約合格だけで実Google consent/Picker動作/大容量転送/実外部権限差まで成功としない。全体はDrive実接続待ちと音声方式未成立を別に残す。

本書のEOF再読後、文書を含む全read/write/runを停止してManagerへ返す。次phaseの正式開始は未許可。

## 追記：P5c-1のGoogle公式一次資料確認

2026-09-29 08:06:37〜08:07:41 JSTの公開Web取得に基づく限定調査。上の「外部資料未取得」は初稿時点の記録で、この節だけを今回の更新とする。Google/Drive account・実API・資格情報・connector・browserへの接続0、外部write/費用0。deep-researchは全文読了したが、指定外の補助・調査フォルダを作る方式は適用せず、単独・本書末尾のみという許可を優先した。資料上の成立を実接続成功としない。

### 1. 既存folder選択とserver確認

**公式確認**：`drive.file`は作成物と利用者がPicker等で共有したfileへの狭い権限で、非機密scopeに分類される。全Drive列挙のscopeを追加する必要の根拠は得ていない。[Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)

Pickerはfolderの表示と選択をそれぞれ設定できる。これとper-file認可を組み合わせる既存folder選択案は資料上整合する。ただしfolder選択で既存の全子孫まで自動認可されるとは解釈しない。[setIncludeFolders](https://developers.google.com/workspace/drive/picker/reference/picker.docsview.setincludefolders)、[setSelectFolderEnabled](https://developers.google.com/workspace/drive/picker/reference/picker.docsview.setselectfolderenabled)

`files.get`はdrive.fileを受け付ける。Fileの`capabilities.canAddChildren`は現在の利用者がそのfolderへ子を追加できるかを示す。[files.get](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get)、[File resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)

**適用案（推論）**：serverが現在connection/subで選択IDを取得し、明示fieldsのid/name/mimeType/trashed/capabilities.canAddChildren等だけを境界検証して設定版CAS。Picker callbackのname/URLやclientの可否申告は信頼しない。保存時のmetadata検査はその後の書込成功や容量を保証しない。folderへの実書込を伴う「疎通」を勝手に追加せず、P5c-2の実backup時も再確認する。共有Drive・shortcut・resource-key付きfolderの対応範囲は未固定で、明示非対応か限定対応かをManagerへ返す。実Pickerで既存folderを選び同一subのserver tokenで検証できることは実接続待ち。

### 2. offline・増分認可・独立解除

**公式確認**：background利用にはoffline認可が必要。refresh tokenは毎回の認可応答で得られるとは限らず、付与scopeの確認と必要時の再同意が必要。増分認可はprojectの既付与scopeを合成し得る。revokeは当該projectの全clientにまたがるscope/tokenへ影響する。[Web-server OAuth：offline・incremental・revocation](https://developers.google.com/identity/protocols/oauth2/web-server)

**設計への帰結**：初回refresh不足を成功にせずIN-04の明示再同意へ。通常refreshで新refresh省略なら同sub/epoch/versionの旧値を保持し、401/遅いrefreshは同versionへだけ作用させる。HollowのDrive解除はローカル資格破棄・epoch失効・owner停止であり、Google全revokeではない。別client IDだけで同projectの権限が完全分離されると仮定しない。これは既採用境界を支持し、Googleログインのscope/sessionを変更する理由ではない。設定画面はprovider側grantや既発行access tokenまで即失効したと表示しない。

### 3. 事前IDとfolder作成

**公式確認**：`files.generateIds`はdrive.fileで利用可能。事前IDによる作成成功後の再試行は409で重複を避け、Google Workspace形式の例外としてfolderが対応する。[generateIds](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/generateIds)、[Pre-generated IDs](https://developers.google.com/workspace/drive/api/guides/manage-uploads#use_a_pre-generated_id_to_upload_files)

folder自体はfolder MIMEを指定するmetadata作成であり、通常のfile配置はparentsで指定する。[Create folders](https://developers.google.com/workspace/drive/api/guides/folder)

**適用案（推論）**：command→永続operation→取得IDの保存→同IDだけでcreate、という順序にする。ID取得応答不明ではfolder createをまだ送らない。create応答不明後はそのIDを照会し、同sub・期待MIME・operationに結びつけたmetadataを確認して採用、409だけで成功にしない。新IDを無限発行して代替folderを作らない。再送は同一operation/同一ID/現在epoch/有限期限に限定し、code交換の非再送とは別契約。実HTTP/409/同ID照会は未実行。

### 4. 削除を確定できる範囲

**公式確認**：404は非存在と読取不可の両方を表す。403も理由別であり、一律「権限喪失」や「削除」にはできない。[Drive errors](https://developers.google.com/workspace/drive/api/guides/handle-errors#404_errors)

Fileの`trashed`は自身または親がゴミ箱入りした状態、`explicitlyTrashed`は自身の直接trashを区別する。永久削除の証明ではない。[File resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) 変更履歴の`removed`も削除とアクセス喪失を含み、曖昧さを解消しない。[Change resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes)

**実装前判断**：初稿の概念unionの`deletion-confirmed`を404やremovedから生成しない。最小観測型は`usable | trashed(explicit/inherited) | access-denied | unavailable-ambiguous | transient-failure`。trashをIN-05「削除確認」に含めて自動再作成するかは製品解釈が未固定で、Manager判断が必要。今回、第三者による永久削除を安全に確定する一般経路は確認できていない。現許可内の観測では所在不明→利用者確認/再選択・明示新規作成を基本とし、IN-05自動再作成を実装済み・不要とはしない。判定のためscopeや全Drive探索を広げない。

### 5. Pickerのbrowser例外・設定

**公式確認**：Web Pickerは`setOAuthToken`でaccess tokenを受け取る方式で、desktop/mobile用のOAuth redirect方式とは別。後者をWebのtoken非露出策として混用しない。[Picker overview](https://developers.google.com/workspace/drive/picker/guides/overview)

公式Web例はDrive/Picker APIの有効化、OAuth web client/origin、同projectのApp ID、API key制限を挙げる。tokenにより対象Google accountを選ぶ。例のscopeはdrive.metadata.readonly、fields=*や生ログを含むため、そのまま製品へ移植しない。[Web Picker setup](https://developers.google.com/workspace/drive/picker/guides/web-picker-sample)

**適用案（推論）**：serverの明示POSTで本人/browser/epochに束縛したPicker起動を許し、short-lived access tokenだけをno-store応答→memory→Pickerへ渡す。refresh/client secretはserverのみ。返却scopeを調べ、combined tokenが持つ権限をdrive.file専用と偽らない。Hollow側期限や画面closeはprovider token無効化ではない。CSP・XSS・第三者script・frame・referrer/API key restrictionsは実接続前に照合し、未確認のdownscopeで解決したことにしない。folder選択画面にupload viewを足さない。

drive.fileが非機密でも審査不要とは断定しない。公開状態/branding/対象利用者/承認済scope・組織制約は未確認。Picker/npm新依存を今採用せず、固定script利用と型定義の必要範囲を実装申告で示す。現在プロジェクトの設定・OAuth同意画面・実tokenは一切取得していない。

### 同sub再連携の扱い

原文IN-04は再同意/不足scope/別account連携を定めるが、「同sub再連携成功時に旧transferを取消す」とは定めていない。IN-09の解除取消、JB-03の外的取消、採用designのepoch/遅い結果拒否から、**旧転送の停止確認＋新候補検証成功時にだけ旧epoch取消/新採用** は保守的な実装案としてManagerが採用可能。ただしOpenRouterの利用者決定をDriveへ継承済みとは扱わない。

推奨確認UIは、現在の旧転送を取消す影響を表示し、本人が続行した操作だけに束縛する。新候補失敗/取消ではHollowの旧設定を維持するが、Google側が旧tokenの有効性を保持することまでは保証しない。採用Txでepochを更新し旧転送の新chunkを止め、旧owner実close不明は保持して旧原本pin/slotを解放しない。新資格で旧jobを自動再開しない。これは通常refreshの更新とは別で、refreshのたびにjobを取消さない。

選択肢として「稼働転送が終わるまで再連携を拒否」も小さいが復旧を妨げ得るため推奨しない。原要件で自動採用できないためManagerの明示設計採用を求める。継続/取消という利用者の結果を変える無確認自動取消やprovider grant全revokeが必要になる場合は、別途利用者確認が必要。P5c-1時点はbackup未実装なので、実転送0の境界と将来の取消portを区分できる。

### P5c-1の最小port・保存案（未採用）

既Google auth/OAuth completion型をDriveへ混ぜず、次を新`domain/integration/drive*`、`application/integration/drive/*`、node adapter・libsql repositoryへ置く候補。UoW内は記録/CASだけ、HTTPは外で実行し戻りTxで現在条件を再確認する。

| 境界 | 最小契約 |
| --- | --- |
| DriveAuthorization/SecretProtector | authorization/exchange/refresh、検証済sub/grantedScopes/期限とserver専用opaque credential。exchangeはknown-rejectedとunknownを区別し二重交換0 |
| DriveFolderPort | `inspect(id)`の上記有限union、`reserveId()`、`create(expectedId, metadata)`→created/conflict/rejected/unknown。任意URL/汎用API命令を受けない |
| PickerLaunch | 本人/browser/epoch付き起動POSTと短命token envelope。返却folder IDの確定POSTは再度server inspect。client選択を権限証明にしない |
| Repositories | connectionのepoch/version CAS、attemptのclaimExchange/complete一回性、folder operationのactor+command receipt/ID不変/採用CAS。純GETでrefresh/create/wakeしない |
| OwnedExecution | HTTP abortとactual close/unknownを別に返す。解除/再連携時に旧epoch新操作拒否、実closeまで保有、将来backup cancel/drainを接続 |

最小保存は **新3表候補**：`drive_connections`（status/sub/暗号資格/epoch/version/lastUsed/現在folder＋設定版、P5c-1 autoBackup=false）、`drive_attempts`（purpose/browser/actor/state hash/verifier envelope/expected epoch/期限/交換claim/候補/結果）、`drive_folder_operations`（select/createの閉じた種別、actor+command、expected epoch/settingsVersion、候補/事前ID、owner、状態/結果）。connectionを削除してepochが巻戻らない。secret/候補は終端scrub、receipt/unknownは安全な保持方針を別に定める。Picker起動receiptが永続必要ならfolder operationへ閉じた種別として含め、無関係汎用job基盤を作らない。履歴・backup永続記録の表はP5c-2、具体DDL/列数/期限/並列枠は未採用で正式申告する。

### P5c-1固定6条件候補

| 候補 | 範囲と直接検証 |
| --- | --- |
| A 本人認可 | IN-04/08・AC-03/06。actor/browser/epoch/一回性、scope不足/refresh不足/取消/遅いcallback、Google login不変更 |
| B 保存先 | IN-05。Picker候補server確認、folder/trash/権限/所在不明の区分、明示再選択/作成、未確定を成功表示0 |
| C 外部冪等 | design。事前ID永続→同ID作成/409照合、応答不明/再起動で重複0、GET副作用0、期限/上限/実ownerclose |
| D 独立解除 | IN-09/JB-03。Hollow credential破棄・epoch失効、Google loginと既Drive物不変更。再連携方式はManager採用後に固定、backup実転送は後段 |
| E 秘密/UI | IN-08/体験要件。Picker token例外の限定、refresh非露出、有限日本語状態/keyboard/mobile/current actor/ACK、autoBackup未提供の誤有効化0 |
| F 配備/根拠 | CLAUDE/design。新保存の正常/失敗atomic、型/checks/比例unit/DB/HTTP/同bundle、未構成安全停止。実Google/Picker成功は別欄で未検証 |

後段依存だけ補足：resumableの照会は空PUTで受信Rangeを確認し、session404はsession失効であってfolder削除ではない。新sessionへ切替える場合も同じ論理operation/事前file IDと現在条件で重複を防ぐ設計が必要。[Resumable status](https://developers.google.com/workspace/drive/api/guides/manage-uploads#resume-upload) IN-07は通常binary原本の取得でありGoogle Docs変換/export機能を追加しない。P5c-1でtransferや再生成を試験したことにはしない。

返却判断：既採用のdrive.file/独立解除/事前ID/所在不明時確認は資料と整合。未採用の主要点はtrash→削除確定の製品解釈、同sub再連携取消契約、実Picker/combined tokenの露出・設定確認、共有Drive等の初期対象範囲。資料は審査承認・実folder書込・token寿命・実権限喪失を証明しない。音声方式未成立を維持。追記と既本文をEOF再読後、全read/write/runを再停止する。
