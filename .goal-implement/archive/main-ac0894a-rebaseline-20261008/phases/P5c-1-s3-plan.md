# P5c-1 S3 実 adapter 接続案

## 結論・判断が必要な差

2026-09-29 の静的提案。対象は既固定 A〜F のうち認可・保存先 HTTP・秘密保管・実所有であり、新受入条件ではない。製品実装・試験・実 Google 接続は行っていない。主は S2 と実行環境を所有し、本補助は本書だけを作成した。

既採用の専用 `adapters/node/drive/` に閉じ、既 auth / OpenRouter / LLM の HTTP・pool・秘密・runtime ownership を変更しない。現 S2 port の `abort(owner)`、`failure.credentialRejection`、Picker の local ticket / provider access 期限分離をそのまま接続する。

実装前の未決は次の 3 点に絞る。

1. **終了不明の後に得た実 close 証拠を DB へ反映し、ACK する内向き経路。** 現 port だけでは一度 reject した `closed` の回復通知がない。下記 3 案を比較し、必要な shared 差を採用してから実装する。期限による owner 解放はどの案にもない。
2. **専用 config / keyring の exact JSON と envelope byte 境界。** 設定場所と秘密分離は採用済み。鍵 ID / key 数 / callback 設定表現は今回勝手に確定しない。暗号化後の envelope も既 64KiB 保存上限へ収める。
3. **新 Drive runtime の boot / stop 接続 path と限定検査集合。** S3 は adapter の直接契約を先に確認し、`server.node.ts` への配備・UI・本体移行は既段階の別申告に従う。

最新 brief の利用者決定は反映する。trash は自動再作成せず復元・再選択・新規作成の確認、曖昧 404 も無断代替しない。明示再連携の成功時に旧 backup を取消す接続は P5c-2 の責務であり、S3 に backup を追加しない。通常 refresh は再連携ではない。音声保留にも干渉しない。

## 既 source との差と編集候補

以下は採用後の exact path 候補で、本書による編集許可ではない。

| 新 core path（`packages/core/src/adapters/node/drive/`） | S3 の責務 |
| --- | --- |
| `http.ts` | 閉じた endpoint / method / query、native HTTPS、有限受領、request / response / socket 所有登録、有限安全 error |
| `authorization.ts` | OAuth URL、code交換、署名・nonce・scope検査、通常refresh。SDKはURL生成/公開署名検証だけ |
| `provider.ts` | generateIds / folder metadata / metadata-only create の厳密 projection。外部 enum → `DriveFolderObservation` |
| `execution.ts` | exact runtimeGeneration + owner token の registry、abort、deadline、result / closed、unknown保持、通常stop |
| `runtimeOwnership.ts` | Drive専用領域のruntime identity/排他と前任終了証拠。LLM owner記録を共用しない |
| `secretProtector.ts` | Drive専用鍵ring・AES-GCM・purpose/AAD・有限envelope。秘密の表示/ログ/例外cause 0 |
| `config.ts` | HOLLOW_DRIVE_CONFIG_FILE、APP_URL由来callback、Picker公開設定、秘密ファイル検証、未構成projection |
| `runner.ts` | S2 `maintainDrive` / `runDriveQueue` の有限wake・cursor・caller Promise追跡・drain。DB判定をadapterへ移さない |

対応する新 `*.test.ts` は局所契約だけ。共有 helper 抽出は不要とする。参照する既 source は `auth/{googleHttp,googleOidc,config,secretProtector}.ts`、`openrouter/{http,execution,secretProtector,runner}.ts`、`llm/{execution,runtimeOwnership,runner}.ts`、`pdf/anonymousTicketSigner.ts`。実資材・鍵・旧証跡は参照しない。

内向き正本は `application/integration/drive/{ports,runner,connection,credentials,folders,current}.ts` と `domain/integration/drive.ts`。実配備入口は現 `apps/web/app/server.node.ts` の factory / shutdown。テンプレートの汎用 `worker/node/runner.ts` を Drive 専用 pool の正本にしない。

## HTTP 固定境界

HTTPS 443、`agent:false`、redirect 0、自動 retry 0、`Accept-Encoding: identity`。未対応圧縮を拒否し、URLをprovider responseや任意configから取得しない。trusted request factory のみ自己loopbackへ置換可能とする。以下の auth URL は利用者へ返す URL 生成であり、server-side fetch ではない。

| 用途 | 固定 endpoint と最小要求 |
| --- | --- |
| 認可URL | `https://accounts.google.com/o/oauth2/v2/auth`。openid / email / drive.file、offline / incremental、state / nonce / S256、同意・別account選択を入力に従い表現 |
| exchange / refresh | `POST https://oauth2.googleapis.com/token`。form body、固定client/callback、grant_type別の有限入力 |
| 証明書 | `GET https://www.googleapis.com/oauth2/v1/certs`。既署名検証公開APIと整合するX509形式。discoveryやtoken内URLを追わない |
| 事前ID | `GET https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&type=files&fields=ids`。厳密に1ID、切捨てなし |
| folder取得 | `GET https://www.googleapis.com/drive/v3/files/{encodedId}`、`supportsAllDrives=true`、後述fields固定、alt=mediaなし |
| folder作成 | `POST https://www.googleapis.com/drive/v3/files?fields=id`、metadata-only。保存済事前ID、固定専用folder名、folder MIME、`parents:['root']`、固定appProperties keyのopaque marker。新ID生成・upload endpoint・delete/trash/revokeなし |

get fields候補は `id,name,mimeType,trashed,explicitlyTrashed,driveId,parents,capabilities(canAddChildren),resourceKey,shortcutDetails(targetId,targetMimeType,targetResourceKey),appProperties`。markerのproperty key・専用folder名は実装時に固定し、利用者入力でendpoint/body構造を変えない。provider生オブジェクト全体を内側へ返さず、必要fieldだけを検証投影する。

folder ID / resource key は既1024 UTF-8 bytesと禁止delimiterを検査し、keyは必要時 `X-Goog-Drive-Resource-Keys: fileId/resourceKey` にだけ渡す。queryやlogへ出さない。usableは正確な要求ID・folder MIME・非trash・`canAddChildren===true`、表示名/共有Drive ID/parentsの有限shapeを要求する。欠落booleanをfalse/成功へ補完しない。shortcutはtarget参照を返すだけで自動再帰しない。createの2xx/409は採用証拠ではなく、S2が後続metadataでid/marker/parent/currentを照合する。

上記REST形とresource-key headerは2026-09-29に公式 [get](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get)、[create](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create)、[generateIds](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/generateIds)、[File fields](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)、[resource keys](https://developers.google.com/workspace/drive/api/guides/resource-keys) を再確認した。実drive.file可視性・共有Drive policy・作成成功を証明したものではない。

## 認可・資格失効・安全error

`DriveTokenSet` は内向きの限定secret DTOで、access / refresh / ID tokenをpresentationへ渡す契約ではない。token HTTP 64KiB、cert 256KiB、request 16KiB、HTTP 10秒、operation 30秒＋close観測猶予5秒の既定を使用する。JWT/code等の個別上限は既Google adapterの16KiB / 4KiBを候補として明示固定し、無制限にしない。期限は注入Clockで有限safeなexpires_in→Dateへ変換、固定1時間を捏造しない。

署名は既 `OAuth2Client.verifySignedJwtWithCertsAsync` の公開APIを使い、Drive専用の alg/kid/iss/aud/azp/iat/exp/sub/nonce を追加検査する。nonceは保存hashへ照合。emailは任意で、欠落を未認証とせずsubの代替にも使わない。at_hashがある場合はaccess tokenへの結合を照合。必要grantsは実scopeから確認し、scope不明を許可済み扱いしない。[Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect) と [Web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server) を2026-09-29確認。

初回/明示再連携のrefresh欠落は `DRIVE_REFRESH_REQUIRED`、旧refresh転用なし。通常refreshの省略だけはS2 `refreshOwnedCredential` が同owner/sub/epoch/使用版で旧refreshを保持する。HTTP adapter側で旧credentialを探索しない。証明書は有限completed cacheだけを共用する最小案。既Googleのactive refresh Promiseを別ownerのsignal/所有へそのまま共有するとabort/close境界が曖昧になるため、cross-owner in-flight共有は行わない。cache寿命/鍵数/unknown kid再取得上限は既検証済構造を参考に実装時に固定し、expired cacheへfallbackしない。

PickerだけはS2の明示POSTからcontroller memoryへaccess tokenを渡す既採用例外を維持する。`pickerExpiresAt` はlocal ticketの5分以内、`accessExpiresAt` はprovider実値であり、local TTLや画面closeでGoogle tokenが失効したとはしない。通常GETで再配布0、refresh token露出0。combined scopeをdrive.fileへdownscopeしたとは称さない。実CSPとPicker設定はS4/実接続待ちである。

| 観測 | adapterの有限分類 | credentialRejection |
| --- | --- | --- |
| Drive resource 401 | provider拒否としてExecutionへ。使用版に束縛したS2のneeds-relink判定対象 | access-token |
| refresh endpoint の正当なOAuth `invalid_grant` | refresh資格拒否。再交換/自動refresh反復なし | refresh-token |
| code exchange `invalid_grant` | 今回認可試行の拒否。旧connection資格の失効証拠ではない | null |
| 403 permission / metadata書込不可 | access-denied。rate系reasonとは分ける | null |
| 404 | unavailable-ambiguous。永久削除と断定しない | null |
| 429 / 403 rate系、5xx、network | transient rate / provider / network。自動再試行なし | null |
| 2xx不正JSON/shape、未知OAuth error、redirect、超過、取消 | safe有限失敗。未知値をcredential失効へ昇格しない | null |

401と404の意味は公式 [Drive errors](https://developers.google.com/workspace/drive/api/guides/handle-errors)、grant種別によるinvalid_grantの差は上記Web-server OAuthで確認。error_description/message/header/raw causeは破棄する。provider→Executionは adapter-local branded Error（有限code/delivery/credentialRejectionだけ）で足りる候補。共有型を増やす前に、S2内の正当なBusinessRuleErrorも有限Drive codeとして保持できることを確認する。native Errorや単なる同名objectは信用しない。

`delivery:'not-sent'` はpre-abort/入力拒否などrequest未作成を証明できる場合だけ。request factory呼出以降の不明はunknown、status応答/実closeは送信取消証拠ではない。有限error bodyも上限内で処理し、raw bodyをError/DTOへ入れない。

## result・実close・unknown・通常stop

HTTP adapterはrequest発生前にowner scopeへ登録し、request/socket/responseの生成時点でclose listenerを設置する。`end` / `finish` / `destroy()` 呼出 / abort発火は実closeの代用ではない。bodyのlogical結果と三所有の実close Promiseを分離する。超過chunkを追加保持せず破棄し、正常/非2xx/parse失敗/途中切断/取消の全枝で既知所有をdestroy・実close待ちする。

`Execution.run(owner)` はaccountIdを受け取らない。account1・global2の正本は既S2 DB claim、adapterはruntimeGeneration+tokenで二重開始を防ぎ、global2を補助する。既LLM job IDやHTTP pathからaccountを推測しない。signal→owner scopeのadapter内部登録をAuthorization/Providerと共有すればport増設なしで各requestを束縛できる。未登録signalでproviderを直接呼ぶ経路は構成不備として送信前に拒否する候補。

現 `application/integration/drive/runner.ts` の `owned` は `result` と `closed` の双方をawaitし、closed rejectをDB unknownへ保存する。`maintainDrive` は別runtimeのactiveをunknownへするだけで、unknown→closedのproof照会はない。

| 案 | 実close後の収束 | 現契約との差・評価 |
| --- | --- | --- |
| A: closedは実closeまでpending、有限unknown通知を別にする | unknown通知で保存後も元callerを追跡し、後のclosedで同owner CAS。DB反映失敗時も証拠を保持 | 現portに通知なし。resultだけを先にfailureへしても現ownedはclosed待ちのため有限unknown保存にならない。handle通知追加/ownedの二段保存/DB ACK保持が必要。時間だけでclosedをrejectしない表現として明瞭 |
| B: reject後もadapterに実終了証拠を保持、proof照会/ACK | exact ownerの実close証拠→DB CASでunknownをclosed化→commit後ACKでregistry回収 | 現result/closed消費形を維持しやすい。新内向きproof/ack入口とmaintain接続が必要。rejectは実終了未証明の通知であり資源解放ではない |
| C: 前任runtime実終了の証拠で再起動時だけ回収 | 同専用領域・保存runtime identity・record再一致・実前任終了を検証→対象DBのみfence/close→ACK | 現Driveには回復入口なし。LLMの別namespace記録を流用不可。同processで後からcloseしても回復しないので、late-closeの通常収束をこれだけで代替しない |

**推奨は B の最小proof/ACKを正式採用してから実装し、Cをrestart時の同じ証拠経路へ接続する案。** exact signatureは未採用。`proof(owner)` は登録された同generation/tokenの `held / closed / unknown` だけ、非登録をclosedとしない。`ack(owner)` はclosed証拠にだけ冪等、DB commit後に呼ぶ。DB失敗・ACK応答不明では証拠を残し、同ownerで再照合する。DB側は保存済terminal/failure/cancelを保ち、late business valueを再採用しない。port/repositoryに必要な追加が判明したら主がManagerへ返す。Aを選ぶ場合もunknown通知とACKの所有者を省略しない。

どの案も5秒経過・lease・Mapからの消失をclose成功としない。採用が決まるまでは現S2のunknown保持を維持し、「回復まで実装済み」としない。resource unknownのままstop成功/DB close/通常exit0へ進めない。

専用runtime identityは既LLMのprivate record・排他lock・前任照合を構造参考にするが、Drive namespace/keyringから独立した領域を使う。PID数値だけでなく記録runtime identity/同領域再一致が必要。EPERM・live PID・lock競合・record差・未ACKは未証明。未知PID探索、強制kill、heartbeat期限による回収はしない。

通常stopは受付/wake停止→exact owner abort→HTTP全実closeとcallerのDB反映Promise drain→proof ACK確認→専用runner終了の順。DBはその後。`server.node.ts` の既shutdownへ接続する際、先に長いcallerをawaitしてabortに届かない順序を避ける。通常stopの失敗をlogだけで飲み込んで成功終了しない。詳細な実boot/stopは主のS5申告対象。

## config / keyring / AAD

専用configは16KiB strict JSON、0600 regular/no-symlink・0700同uid親。open/fstatとpathのinode/device照合、有限read後のsize/time/permission再確認、全handle closeを使う。既 `auth/config.ts` は参考であり、旧SSO config/鍵を探索しない。callbackは固定APP_URLから `/auth/drive/callback` を構成する候補で、任意URL設定との二重正本を避ける。PickerのappId/API key/originはclient/project整合を別確認する。

専用keyringはactive kidで暗号化、envelopeのkidで旧鍵復号する案。AES-256-GCMの32B key / 12B IV / 16B tag構造を参考とし、canonical base64url、version/kid/部品数/byte上界/UTF-8を検査する。未知kid・改変・AAD差はsafe失敗、平文fallbackなし。旧kidを使う保存値がある間の鍵除去を勝手に成功化しない。keyring exact JSON/最大鍵数/起動時未構成と不正設定の区別は主が実装前に確定する。

AADはversion付き固定配列の候補。現 `DriveSecretBinding` の全fieldを使う。

- verifier / candidate / folder-confirmation: namespace, purpose, accountId, attemptId, browserHash, browserEpoch。
- credential: namespace, purpose, accountId, subject, epoch, credentialVersion。
- resource-key: namespace, purpose, accountId, subject, epoch, fileId。

account/subject/epoch/資格版/purpose違いを許容しない。candidateはJSONを含むため旧PKCE専用文字集合を流用しない。原文UTF-8値と暗号化後ASCII envelopeの上限を別々に検査し、64KiB平文をbase64化して既64KiB保存型へ押し込まない。config/rawpath/key/plaintext/hash/ciphertext/causeをログ・例外・assert差分に出さない。

## 有限ローカル検査案と停止条件

以下は実行許可ではない。既候補HTTP24形以内、各通常64KiB以下・cert負対256KiB+1、累積wire16MiB、逐次実HTTP1、script/log/cache8MiBを事前予約し、実装後にexact集合と回数を再申告する。production固定URLをtrusted factoryで自己動的loopbackへ向けるだけで、Google接続0。DBや画像/原本は不要。

| 形の割当候補 | 最小観測 | 固定条件 |
| --- | --- | --- |
| 1–6 認可 | URL scope/S256/選択、正常署名/emailなし、nonce/aud/期限不一致、scope/refresh不足、refresh省略/rotation、grant別invalid_grantとresource401 | A/D |
| 7–12 folder | 個人/共有usable、resource-key/shortcut、trash、403/404/rate、生成1ID、create2xx/409を採用成功と混同しない | B/C |
| 13–18 HTTP | chunked exact/over、誤JSON/圧縮/redirect、途中切断、deadline/preabort、body終了後close gate、遅close/閉鎖未証明 | C/D/F |
| 19–20 registry | exactowner abort/二重開始、unknown中stop/後の実close→DB相当ACK。資源を持たないtypedfakeは実socket終了と区別 | C/D/F |
| 21–24 秘密・構成 | 自己鍵roundtrip/旧kid、purpose/AAD/改変、16KiB/0600/0700/symlink、未構成・不正config | A/E/F |

これは形の予算配分で、複数境界を実際にどう有限生成するかはS3実装時に確定する。新鍵は自己合成だけ、失敗した実socket/handleをtimeout成功へ変えず、自己server/全request/response/socketを終了回収する。未証明時は後続を止める。容量超過時に証跡を消して予算へ合わせない。実GoogleのCSP/Picker/combined scope/審査・組織policy・長期refreshはこの試験で成立としない。

## S2への静的観察・旧条件・返却

読取時の `folders.ts requireUsable` はtransientを `DRIVE_FOLDER_INVALID` へ畳んでいた。固定B/Cとの整合を主へ通知し、主はrate→DRIVE_RATE_LIMIT、provider/network→DRIVE_UNAVAILABLE、create送信後のmetadata一時不可→reconcilingをS2で訂正予定と回答した。本補助による修正/実証は0、主の最終結果を参照する。

S3の直接対象はP5c-1 A/B/C/D/FとEの設定・Picker秘密期限境界。旧Googleログイン・OpenRouter・LLMの型/保存/adapterを不変更にできれば全面再openは不要。将来server shutdown接続が旧runtime終了へ届く分は、そのpathだけ比例確認する。S2 auth prune追加の8対は主のS2根拠に属し、本書のS3成功には数えない。

Manager / 主への引渡し：endpoint・安全分類・配置候補は既契約内。採否が必要なのはunknown→実close収束方式、keyring/envelope exact形、S3限定集合とS5接続境界。rawprovider値を内層へ拡張するport変更や新汎用helperは不要と考えるが、実装前に不足を申告する。

本書EOFまで静的再読後に返却する。製品/既報告/管理正本の変更0、Node/test/format/build/DB/runtime/browser/実API/新root/旧proof/commit操作0。公開公式docs読取だけ実施。自己資源生成0・未回収exec0。返却後は文書を含め全read/write/run停止。
