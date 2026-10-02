# P5 Google Drive 連携の限定契約準備

最終記録時刻: 2026-09-20T08:05:26.000+09:00（clock実測）。資料・source読取と本報告以外の変更は行っていない。test/build/DB/runtime/browser/OAuth/認証API/外部送信は未実行。

## 結論と範囲

通常Drive領域・`drive.file`・利用者別backup binding・Googleログインとは独立したローカル解除という採用済み方針を維持できるAPI経路がある。現在の製品にDrive接続・backup正本はなく、API資料の存在を接続成功とは扱わない。最初の縦slice候補は「本人設定 → Drive認可 → 連携先確認 → 専用/選択folder設定 → 状態確認 → 独立解除」。backup転送・再生成はこのsliceの完成と混同しない。

判断が必要な主要点は、IN-05の削除folder自動再作成と曖昧な404の整合、Pickerへの短命access token提供、再連携時の旧job処理とsub切替確認である。以下の新port名・schema形・数値・分割案は未採用。正式P5開始、新受入gate、業務条件の追加ではない。

原文は `spec/scenario/integration.md`（IN-04〜08に加え解除のIN-09）、`import.md`、`account.md`、`spec/requirements.md`、既報告 `reviews/P5-feasibility.md` を全文確認。Manager指定の `design.md`「P5 の成立条件」節はGoogle認証/OpenRouter下位節を含め全文確認した。goal-implement / manager-loopを全文確認し、spec/spec-implementは使用していない。

## 公式公開資料で確認した境界

確認日: 2026-09-20 JST。公開docsのみ。実OAuth・認証API・ファイル送信・秘密設定読取は未実行。

| 境界 | 公式資料から分かること / 分からないこと |
| --- | --- |
| 増分認可 | `include_granted_scopes=true`、`access_type=offline`、state往復、login_hint、prompt=consent/select_account、実付与scopeの確認を提供。login_hintは画面省略の絶対保証ではない。combined grantのrevokeはproject内の全scope・clientへ及ぶので、Driveだけのローカル解除と同一視しない。[Web server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server) |
| 連携先identity | `sub`は安定したGoogle本人識別子、emailは変更可能。Drive認可にOIDCを合わせて検証済みsubを得る案は、GoogleログインIdentityの追加ではない。署名・issuer/aud/azp/nonce/期限は採用済み認証境界を再利用する。[OIDC](https://developers.google.com/identity/openid-connect/openid-connect) |
| 最小Drive範囲 | `drive.file`はアプリ作成または利用者が選択共有したfile向けの非sensitive scope。全Drive列挙のためにdrive/drive.readonlyを増やさない。refresh tokenは長期保護が必要。[Scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) |
| Picker | Web版は`setOAuthToken`へaccess tokenを渡す。tokenで表示するGoogle accountが決まる。client IDとapp IDは同じprojectが必要。folder選択は`setSelectFolderEnabled(true)`で提供される。[Web Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker-sample)、[Folder selection](https://developers.google.com/workspace/drive/picker/reference/picker.docsview.setselectfolderenabled) |
| folder/file検査 | folder MIME、trashed、parents、capabilities.canAddChildren/canDownloadを取得できる。SHA256は存在する場合に限られ、Google Docs/shortcutの原本hash代替ではない。capabilityは現在userの操作可否であり、将来の書込成功保証ではない。[Files resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) |
| 移動と不存在 | fileIdを保持したままparentsを変更できる。404は不存在だけでなく読取権限なしも含む。403にもquota/rate等があり、全てを失効へ丸めない。[Folder/move](https://developers.google.com/workspace/drive/api/guides/folder)、[Errors](https://developers.google.com/workspace/drive/api/guides/handle-errors) |
| upload回復 | resumable uploadは受信済みRangeを照会して再開する。chunkは末尾以外256×1024 bytesの倍数。session URIには期限があり、元fileの保存期限やjob履歴期限ではない。事前生成file IDでcreateを再試行し、既存成功時の409を照合できる。[Uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads)、[Pre-generated IDs](https://developers.google.com/workspace/drive/api/guides/create-file) |
| 原本取得 | blobは`files.get`の`alt=media`、事前にcanDownload確認。Google Workspace形式のexportへ自動変換しない。公開download URLや利用者入力URLをserver fetchへ転用しない。[Downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads) |
| 運用寿命 | External/Testingでは基本profileだけの例外を除きrefresh tokenが7日で失効する。Driveを含む接続の無人運用を、一度の成功で保証しない。[OAuth token expiration](https://developers.google.com/identity/protocols/oauth2) |

資料のサンプル中の広いscope・console出力・全量bufferを、そのままHollowの実装契約にはしない。

## 最初の設定slice候補

1. 現在のverified Hollow本人sessionで開始する。設定GETは未連携/連携済み/要再連携、分かる場合だけGoogle email等、連携日時・最終利用日時・folder・autoBackupを投影する。未設定環境を成功表示しない。
2. `drive-connect`専用attemptを保存してからGoogleへ遷移する。本人account/session/browser世代、expected connection epoch、固定callback・戻り先、state hash、nonce、S256 verifier、開始時刻・固定期限・一回性を束縛する。Drive認可でHollow sessionやGoogleLogin Identityを作らない。
3. Google SSOと同じaccountを使う通常導線は検証済みsubをlogin_hintにする。「別のGoogle account」は明示選択導線。候補scopeはopenid/email＋drive.file、offlineと増分認可。profile取得は表示の必要性に応じて正式決定し、現在Hollow公開profileを上書きしない。
4. callbackは同browser/current actor/attemptを確認して一回限りCASで交換開始。外部交換中にDB Txを保持しない。検証済みsub・付与scope・offline資格情報を得て候補を暗号化保存し、現在本人/epochを再照合して接続へ昇格する。メール不取得なら日時表示へ落とすが、sub不明のまま接続しない。
5. 専用folderを既定候補とし、既存folderはPickerの明示選択。保存時にserverが現在資格情報でmetadataを取得し、folder MIME・非trash・canAddChildrenを確認して設定versionへCASする。権限不足では保存しない。metadata確認は書込権限の疎通であり、quota・後日の権限変更まで保証するdummy upload成功ではない。
6. autoBackupを有効にする操作は、アップロード本人のDriveに保存すること、WS所有noteでも同じこと、既存原本へ遡及しないことを明示する。初期ON/OFF値は原文に固定がないため未決。folder未確定を有効な保存先として扱わない。初sliceがbackup enqueueを含まない場合、動作しないON切替を完成品として提供せず、未接続理由を示してIN-05の当該部分を後続へ残す。
7. 解除はDrive tokenを破棄し、autoBackupをOFF、attempt/candidateと旧世代jobを失効させる。GoogleログインとHollow sessionは維持する。「Google側の全アクセス権を撤回済み」「Driveファイルを削除済み」と表示しない。

設定入力・Pickerキャンセル・OAuth取消は元の設定を保持する。React islandではactor/epoch/attempt/operationで旧success/catch/finallyを拒否し、入力保持と明示再照会を使う。未知ACKを「未連携だから新しい交換を自動送信」へ変換しない。設定往復で元のuploadやbackupを勝手に再送しない。

### refresh・交換不明・再連携

| 場面 | 提案する扱い |
| --- | --- |
| 初回code responseにrefresh tokenなし | IN-04どおり連携成立にせず、明示prompt=consentで新しい試行へ。自動無限再同意はしない。 |
| 通常refresh成功でrefresh token省略 | 同じconnection/sub/credential versionの既存refresh tokenを保持する。空値で上書きしない。新tokenが返った場合だけCASで置換する。 |
| 再連携のcode responseでrefreshなし | IN-04の文言を維持する第一候補は新しいrefresh取得まで昇格しないこと。旧有効接続を破棄せず再同意を案内。同subの旧refreshを利用して再連携完了とする緩和は未採用。 |
| code交換ACK不明 | 一回codeの再交換・未検証claims採用はしない。暗号化candidateが保存済みなら状態照会を再開可能にし、token受領自体が不明なら明示新認可へ。provider grantが存在しないとは保証しない。 |
| refresh ACK不明 | 旧credential/epochを保持し、新token受領済みと推測しない。通常refreshはcode交換と別操作。再試行可能性はGoogleエラー/利用clientの再試行を正式時に固定し、invalid_grantは現在の同世代だけ要再連携へ。 |
| 同sub再連携 | 候補成功後だけ世代を進めて資格情報を置換。旧folderを再検証する。旧実行jobを取消すか旧資格情報で実closeまで完了させるかは未決で、新tokenへの無言付替えは禁止。 |
| 別sub再連携 | 明示account変更確認を第一候補とする。旧backup recordとfolderを新subに結び直さない。新accountのfolderを選び直し、既存backupは元subの記録として残す。SSO subと異なるだけでは拒否しない。 |
| 遅いrefresh/401/callback | 現epoch/credential version/attemptが一致する場合だけ採用。解除後や新接続後の旧応答で接続復活・新接続失効を起こさない。 |

OAuth attempt期限は採用済みGoogle認証の10分固定を共用する候補であり、Driveへの正式適用は未採用。provider code/access/refreshの実期限をこの10分で置換しない。refresh排他はconnection単位の有限lease/CASを候補とし、旧lease喪失後の結果を保存しない。

## Pickerとfolderの信頼境界

Picker callbackのfile ID・name・URL・MIME・account表示は入力であり権限証明ではない。serverが開始時のaccount/connection epoch/settings versionと現在sessionを照合し、**保存中の同sub credential**で`files.get`する。正本metadataからfolder名を投影する。shortcutをfolderとして黙って辿らず、取得不能・別種・trash・canAddChildren=falseは拒否する。ownedByMe=trueを独自の必須条件にしない。共有folder/shared driveをどこまで提示するか、resourceKeyが必要な選択への対応は正式詳細設計で決め、未対応時は黙った別folder保存にしない。

Web Picker採用では短命access tokenをブラウザーへ渡す必要がある。これはrefresh token/長期秘密をDTOへ出さない契約とは別の、明示的な例外候補である。現在本人・browser・epoch・短命picker sessionに限定してno-store responseで取得し、メモリーのみでPickerへ渡す。localStorage・URL・履歴・ログ・telemetry・test snapshotへ置かず、callback終了/actor変更で参照を捨てる。CSP/XSS対策と第三者scriptの境界を確認する。実access tokenのprovider期限をHollow内TTLで短縮できるとは主張しない。解除でserverの利用を止めても、既発行browser tokenはprovider期限まで使われ得る。combined scopeのtokenを渡す場合の露出範囲、限定tokenの発行可否は実接続時の確認事項で、未確認のdownscope APIを捏造しない。

既定専用folder作成は、先に生成したDrive IDとoperationを永続化してからcreateする候補。ACK不明で同名folderを毎回増やさず、同IDの照会/409後metadataで照合する。同名文字列はidentityではない。利用者がfolder設定を変更しても、既存backupの記録folderIdは書き換えない。

### IN-05 削除時再作成と404

| 観測 | 確定できること | 原文に対する案 |
| --- | --- | --- |
| folder metadata取得成功・trashed=true | 現在trashにあること | 削除にtrashを含めるか明記した上で、次backup時に新しい通常専用folderを作成し履歴へ記録する候補。元folderを勝手にuntrashしない。 |
| metadata成功・canAddChildren=false / 明確な権限拒否 | 現在そのfolderへ追加不可 | 保存/backup失敗と設定再選択を案内。別folderへ勝手に退避して成功にしない。 |
| metadata404 | 不存在または読取権限なし | 「削除を確認した」と表示しない。自動再作成すると権限喪失時の無断代替にもなるため、現在のAPIだけでは原文の削除限定判定を完結できない。 |

第一候補は確定した状態のみ自動回復し、404では「folderが見つからないかアクセスできない」と明示して再選択/専用folder再作成の確認へ進めること。ただし、完全削除の場合も無確認自動再作成するIN-05をこの候補だけでは満たさない。代案は404を「利用不可」として自動再作成まで含める業務解釈だが、権限拒否時の無断代替を含むためManager判断が必要。権限拡張や全Drive走査で404を証明できると仮定せず、原文条件を削除しない。

## 現sourceの再利用と不足

| 現source | 再利用点 | そのままでは足りない点 |
| --- | --- | --- |
| `application/account/session.ts`、`domain/account/ports/accountRepository.ts` | verified本人・期限内sessionの取得 | OAuth attempt/Google identity/Drive credential/epochのportは未提供。Driveをpassword Account.saveへ混ぜない。 |
| `application/di/hollowTypes.ts`、`execution/hollowUnitOfWork.ts` | inwardなportとUoW注入、clock/id、同Tx境界 | Drive/backupのDIとrepositoryがない。既存Google/OpenRouterも製品接続済みではない。 |
| `domain/import/entity.ts`、`ImportRepository` | OriginalのnoteId/name/bytes/storageKey/SHA256/format。実受理上限は50/200×1024² bytes、100件/500×1024² bytes | backup先・利用者別状態・Google subは未保持。Hollow受理上限をDrive APIの一request上限に読み替えない。 |
| `application/import/acceptUpload.ts` | 原本格納・hash確定・note作成・job enqueueを同Txで確定する入口 | 現在は変換jobのみ。autoBackupはこの原本受理点へ独立enqueueを足す候補で、変換成功を待たず、失敗しても既存取り込みを失敗へ戻さない。 |
| `domain/job/entity.ts` / `JobRepository`、`import/processJob.ts` | claim/heartbeat/lease-token終端、実行前と結果Txの現在account/note/edit認可・version再照合 | ConversionJobは変換専用。Drive資格情報世代/転送実close/backup所有者はない。type castでbackupへ流用しない。 |
| `import/controlJobs.ts` | retry親子、現在認可、旧版での上書き拒否 | 現reimportはcancelled元job等に限定し、ready/編集済み原本の上書きを拒否する。IN-07/IM-06の明示再生成と同じ操作ではない。 |
| `note/commitNote.ts` | 旧本文版・asset pin・サニタイズ後のcurrent commit、projection更新 | Drive再取得・編集中禁止・再生成attemptのcurrent fenceを追加して呼ぶ必要がある。タグ/共有設定/公開identityを変えず、失敗で本文を部分更新しない。 |
| `ports/objectStorage.ts`、`domain/purge/entity.ts` | stream、putBounded、bytes/SHA256、write-owner/回収待ちの枠組み | stream APIは明示closed promiseを持たず、現WriteOwnerにDriveなし。外部HTTP終了/原本read-holdは別契約が必要。export source portはdata URI用で原本転送へそのまま使えない。 |
| `domain/batch/entity.ts`、`application/batch/ports.ts` | 固定1〜500選択、request receipt、親子進捗の考え方 | 現operation unionはtag/trash/moveのみ。backupへ新kind/子結果/現在権限を設計する必要がある。edit/sameMoveScopeを機械的に流用しない。 |
| `import/readImports.ts`、libSQL `importRepository.pruneHistory` | createdAtから90日の本人履歴、未終端/未回収/active writeは物理pruneしない | backup正本は履歴90日で消せない。note存続中の再生成元記録とjob表示寿命を分離する。 |

必要最小範囲のapplication/domain・hollowSchema/UoWでDrive/backup正本は確認できなかった。source調査であってDBの実状態確認ではない。

## 最小port/schema候補

外側のHTTP/client/暗号実装をdomainへ持ち込まない。以下は形の提案で、共有契約変更は行っていない。

- `DriveConnectionRepository`: 本人の状態取得、expected epoch/version付き候補昇格、現在credential失効、folder設定CAS、autoBackup OFF、限定job取消intent。`connections(accountId,googleSub,epoch,credentialVersion,state,folderId,settingsVersion,autoBackup,connectedAt,lastUsedAt)`を候補とする。
- `DriveAuthorizationAttemptRepository`: purpose=drive-connect、元account/session/browser世代・expected epoch・state/nonce・暗号化verifier/candidate・期限・一回限りstatus・安全receipt。callbackの重複を新code交換へ変換しない。
- `DriveCredentialProtector`: 専用keyring/purpose/AADにaccount/connection/sub/epoch/secret-kindを束縛。招待TokenBindingやnote共有鍵の流用はしない。key rotationと連携世代を別にし、復号不能は閉じる。
- `GoogleDriveAuthorization`: authorization URL生成、code交換、OIDC本人検証、refresh。raw資格情報はadapter/application内部専用とし設定DTOに出さない。client自動retryによるcode再送の有無も固定する。
- `DriveFolderPort`: preallocate/create/inspect。serverへ任意URLでなく検証済みIDを渡す。Picker選択は別の短命本人sessionで扱う。
- `DriveBackupRepository`: `(backupActorId,googleSub,noteId,originalId,originalSha256)`に対する正本と固定fileId/folderId/bytes/format/metadata検証結果。epochは実行authorityであり、同sub再連携で既存file identityを別物にしない。別subは別記録。
- `DriveTransferPort`: sourceまたはdownload stream、AbortSignal、転送bytes/hash、resumable状態照会、`closed`完了を返す。転送登録・取消・再起動時不明closeの回収を専用lease/ledgerで追う。成功DB記録とclose完了を分ける。
- backup jobはinitiatorとcredentialOwnerを分離し、note/original/hash/Google sub/folder/connection epoch、requestId、retryOf、state、lease、cancel intentを持つ。DB一意制約で多重受付を防ぐ。IN-06の「同じnote多重抑止」の全利用者共通か利用者別かは最小正式判断に残し、他人のjob詳細を露出しない。

原本backup記録には履歴とは別の寿命を与える。退会時のWS残存noteではcredential ownerの退会/利用不可を示す最小bindingと、他人の個人メール/秘密の削除を両立する。正確なFK・tombstone形はAC-09実装と合わせてManagerが固定する。

## backup・再生成への後続接続

### 転送と二重作成

手動backupは現在noteの原本read権限・active lifecycle・本人Drive接続を受付/claim/外部送信前/結果Txで再確認する候補。IN-06はサインイン利用者、現原本取得はviewerを含むreadなので、既存batch mutationのedit条件を無断適用しない。再生成は本文変更なので現在edit権限と明示警告が必要。権限の正式対応は原文ロールとの照合を主担当へ残す。

事前fileIdと元hashをjobへ固定し、原本をGoogle Docs化せずblobとして転送する。sourceの実bytes/hashを照合し、成功/409では同sub・同file・同folder・期待原本をmetadata/必要なhash検証で確認する。409だけで成功にしない。resumable ACK不明は受信済みRangeを正本にし、送ったbytes数からoffsetを推測しない。session URIは秘密として保護し、固定Google origin/許可pathを検査、任意redirectへBearerを転送しない。

既backupのsuccess recordがある場合は二重uploadしない。ただし現在fileが消失/改変/移動した場合にも無条件成功とするかは原文未決。第一候補は再検査して理由表示し、明示再backupへ誘導すること。自動で新fileを作って原本保持済みを偽装しない。

### Drive原本からの再生成

1. 現在note編集権限・現在原本/版と明示上書き同意を固定し、選択backupの記録owner/sub/file/folder/hashを読む。WSの実行者とcredential ownerを同一人物と仮定しない。最初に見つかった他人のbackupへ自動fallbackしない。
2. 記録ownerが存続し、現在のDrive接続が同subで有効か確認する。解除/退会/別subでは拒否。本人には再連携、他memberには本人Driveへ再backupの導線を出す。tokenを実行者へ渡さない。
3. metadataで非trash・blob・canDownload・記録folderと現在parents一致を検査する。親不一致は移動として中止し、同IDで取得できても成功にしない。404は削除と断定せず「見つからないかアクセスできない」。一時エラー・rate・容量・権限失効を分ける。
4. `alt=media`をbounded streamで取得し、記録bytes/hashを自前で確認する。provider SHA256省略時も照合を省略しない。開始後の改変/移動に備え取得後metadataも再照合する案とし、外部metadataとHollow Txの完全な分散原子性が得られるとは主張しない。
5. 再生成専用attemptで旧本文の版と編集禁止を確保し、現在actor権限/credential epoch/original/leaseを結果Txでも照合。HTML安全化・既存revision/commitNote経路を使い、本文の一括反映だけを許す。失敗時は旧本文を維持し、タグ・公開設定・token/public identityを変更しない。必要なLLMは別OpenRouterの現在接続と月間枠へ委譲する。

IN-07を選んだ後のDrive失敗を、ローカル原本からの成功へ無言に置き換えない。IM-06で元fileを選ぶ経路とDrive backupを選ぶ経路はsource種別として分ける。Hollow内の所有移動も現在権限を再評価するが、固定選択を永久許可にせず、既存mutation workerのsameMoveScopeを無条件流用しない。

## 解除・退会・実close

解除Txでcredential epochを進め、全旧attempt/candidateを封じ、autoBackupをOFFにし、該当credentialを使うqueued/running transferへcancel intentを保存する。新しい原本読取/HTTP/refresh/chunk予約を拒否し、in-flightのsource/response/sinkをabortして実closeを待つ。旧jobが後から成功してもbackup正本や本文へ反映しない。byte転送の中断をGoogle上の作成取消・削除成功とは表示しない。外部側だけfileが成立した可能性を安全な不明状態として残し、元fileId/subの照合なしで新uploadしない。

現在のObjectStorage streamやAbortSignalだけでclose済みとは扱えない。原本pin/read-hold・転送slot・一時diskは実close後に解放する。process再起動でclose不明なら回復対象に残し、job履歴pruneに物理負債を巻き込まない。Drive利用終了と、依存しない変換job/他人の連携/完成noteの維持を分ける。

AC-06のGoogleLogin解除はDrive rowへ触れず、IN-09のDrive解除はGoogleLogin rowへ触れない。AC-09ではHollowのsession/連携/該当jobを失効させるが、Drive file/folderのdelete/trash APIを呼ばない。WS削除も関連backup実行だけを取消し、個人Google接続や既存Drive fileを削除しない。

## 有限処理候補と未提供条件

技術値の未採用候補は、metadata応答上限256KiB、転送chunk 4MiB（256KiBの倍数）、host転送同時2、個別HTTP操作30秒である。chunk/metadata/workerの有限化のための案で、Hollowの50/200MiB受理上限や利用者quotaを縮める業務制限ではない。大きな原本はstream/backpressureで扱い、provider quota・通信状態に応じた再開を別にする。job全体の絶対期限・retry backoff・自動再試行上限は未決で、既存変換の30分やexportの期限を根拠なく借用しない。

実接続に必要な最小準備は、Google Cloud projectとWeb OAuth client/正確なcallback URI、同意画面の対象利用者・公開状態・許可scope、Drive API、Picker採用時のPicker API/API key制限/project number/appId/browser origin、専用秘密暗号化keyring、callbackとtoken非記録設定である。これは設定の意味の一覧であり、repoに特定env/keyfileが存在すると確認したものではない。

利用者の明示同意と指定テストGoogle account/保存先、送受信してよい非秘密原本、作成されるfolder/fileの扱いについて承認を得た後に、条件付きで実OAuth・部分同意・refresh・別account・Picker server検査・hash往復・移動/権限喪失・解除中転送を確認する。今回その外部権限は取得していない。契約fakeの成立と実Google接続は分け、Google審査/組織policy/実転送の成功をdocsだけから確定しない。

この案は原文・採用契約と現在sourceの接続準備のみ。新機能の完成・正式slice開始・受入条件追加を宣言しない。
