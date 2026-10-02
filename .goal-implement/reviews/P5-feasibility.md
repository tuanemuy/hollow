# P5 外部連携の独立成立調査

## 結論と確認範囲

OpenRouter PKCE、画像/PDF/音声の処理、Google SSO、Driveの通常フォルダへの原本バックアップと取得に公式APIの成立経路がある。ただし、実アカウントでの接続・変換・失効・復元はすべて未検証。次の判断をP5設計前に分離する。

- Googleの第三者メールを、`email_verified`だけで既存Hollowアカウントへ自動紐付けする原文には安全上の判断が必要。
- Driveのみ解除する要求はprovider全scope revokeではなく、Drive用保存tokenの破棄とローカル権限失効を第一候補にする。
- `appDataFolder`は要件のバックアップ先に使わない。通常Driveの専用folder＋`drive.file`＋利用者による選択共有が適する。
- 受理上限50/200MBと、モデル/provider/requestの上限は別。画像PDFの網羅性、音声変換/分割、課金を伴う実行回数の数え方を確定する。

担当 `/root/verifier`。2026-09-06 03:55:56〜04:01:54 JST（Asia/Tokyo）に要件と公式公開資料を読み取り。リンクは当日の確認先であり、検索エンジンのcrawl日を仕様の施行日とは扱わない。入力は `spec/scenario/integration.md` 全文、`import.md` IM-06、`account.md` AC-03/06のGoogle部分。spec/spec-implement不使用。実認可・同意・モデル実行・外部ファイル送信・課金・秘密値探索・設定/コード/依存/env/browser変更は行っていない。本報告だけを書き込む。

## OpenRouter: 認可、確認、解除

公式PKCE手順は `https://openrouter.ai/auth` へ `callback_url`、`code_challenge`、`code_challenge_method=S256` を渡し、戻ったcodeを `POST /api/v1/auth/keys` の `code / code_verifier / code_challenge_method` で交換する。返るのは利用者管理のAPI keyであり、Google型のaccess/refresh token組ではない。localhost callbackも公式に記載される。[PKCE guide](https://openrouter.ai/docs/guides/overview/auth/oauth)

IN-01を満たすには、Hollowのログイン利用者・ブラウザ・一回限り認可試行・戻り先を結び、S256と期限/再利用拒否を行う。公式guideには任意`state`の往復契約が明記されないため、通常OAuthのstate echoを推測で依存しない。callbackに含める試行識別等が実際に保持されるかを実接続gateで確認する。PKCEだけで利用者の取り違えやopen redirectが防げるとはしない。

注意: guideの交換例はBearerなしだが、生成API referenceはBearer必須の表示がある。公開資料内の不一致として残す。未連携利用者に既存key入力を求める回避策へ変えず、実PKCE交換で確認する。[交換API reference](https://openrouter.ai/docs/api/api-reference/o-auth/exchange-auth-code-for-api-key)

疎通確認には通常keyで `GET /api/v1/key` があり、key metadataと401を返す。これを連携確認に用いればモデル生成を疎通確認として発注する必要はない。ただしmetadata取得成功は残高・全モデル利用可能性・実変換成功の証明ではない。[current key](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key)

keyの作成/削除等 `/api/v1/keys` 管理APIには別のManagement keyが必要である。PKCEで得た通常keyによる自己revokeの公開契約は今回確認できなかった。IN-03の要求は保存鍵の破棄なので、ローカルkey破棄＋連携epoch更新＋実行job取消/結果commit拒否を第一候補にできる。provider上のkey失効まで済んだと表示しない。Management keyを利用者へ要求する範囲拡張は不要。[Management keys](https://openrouter.ai/docs/guides/overview/auth/management-api-keys)

再連携は新key疎通成功後に旧参照を置換し、失敗時の状態を明示する。実行中のHTTPを中断してもprovider側の計算・課金が取り消されたとは保証しない。解除後の遅い結果をnoteへ反映しない契約と、外部取消/課金の限界を分ける。無効key検出時は要再連携とし、残高/レート制限を同じ「失効」に丸めない。

## 入力APIと能力境界

| 用途 | 確認した契約 | Hollow側の成立条件 |
| --- | --- | --- |
| 文書構造化 | `/api/v1/chat/completions` のtext入力 | 原文の機械抽出を再利用。モデルのcontext/output上限に合わせる。失敗時は現在本文を維持。 |
| 画像 | chat contentの`image_url`、public URLまたは画像data URL。PNG/JPEG/WebP/GIFを記載 | 非公開原本をpublic URLへ公開しない。選択モデルのimage入力対応、画像寸法/フレーム/個数/bytes制限を確認。SVGの直接対応を推測しない。 |
| PDF | chat contentの`file`、URLまたはPDF data URL。native file対応モデル、またはfile-parserで解析して渡す | 画像PDFをtext-only抽出へ無言に落とさない。native方式/明示OCR/ページ画像入力のどれを選ぶかを確定。 |
| 音声chat | `input_audio`にraw base64とformat。音声URL入力は非対応 | 音声解析対応modelを使う場合の経路。拡張子とformat名だけの付け替えは変換にならない。 |
| 専用文字起こし | `/api/v1/audio/transcriptions`。JSON `model,input_audio:{data,format}` またはmultipart `file,model`。返り値はtext等 | IN-02の音声認識用モデルはSTT能力で選別。必要なら文字起こし後に文書構造化を行う。 |

入力形式の一次資料: [multimodal overview](https://openrouter.ai/docs/guides/overview/multimodal/overview)、[image input](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding)、[audio chat](https://openrouter.ai/docs/guides/overview/multimodal/audio)。

PDFはnative非対応モデルでもparser経由で処理できるが、それを「どのモデルでも画像PDFの全内容を同等に読める」と解釈しない。公式はMistral OCRから転送する画像を1PDF/1request最大8枚、画像非対応モデルには画像を渡さないと説明する。画像のある資料を完全取得したように扱わない必要がある。parser/OCRは追加の処理主体・費用になり得るため、engineを無指定defaultに任せるかは判断事項。汎用PDF/imageの一律最大bytesは今回のguideで確定できなかった。別のFiles APIの上限をchat入力の上限へ流用しない。[PDF guide](https://openrouter.ai/docs/guides/overview/multimodal/pdfs)

STTは `/models?output_modalities=transcription` で候補取得できる。multipartは25MB上限、JSON経路はより大きい入力を扱う説明があるが、providerの処理timeoutは60秒で長音声の分割が案内される。対応codec/containerもprovider別。Hollowの音声200MB上限を全モデル1request対応の保証にはできない。[STT guide](https://openrouter.ai/docs/guides/overview/multimodal/stt)

必要になる変換は選択providerが受けられないcodec/containerの実transcode、必要なsample rate/channel調整、長音声の分割であり、全入力の無条件WAV化ではない。WAV化でbytesが膨張する場合がある。base64も元bytesの約4/3になるため、入力全体の複数コピー・変換出力・分割境界・順序結合・一部失敗をboundedに扱う。これらはAPI資料から導く実装上の成立条件であり、今回変換器を選定・導入・実行していない。

IN-02はモデル名固定だけでなく、`architecture.input_modalities`、context、廃止情報等を確認する。STTとchatのcatalog/query差を吸収し、取得失敗時の既定モデルも既知の用途能力を持つものに限る。既定model ID/日本語品質/現在価格は未選定。資料の例示モデルを無検証で製品既定にはしない。[Models API説明](https://openrouter.ai/docs/guides/overview/models)

## Google SSO・増分認可・独立解除

SSOは `openid email`（必要ならprofile）で開始し、Drive scopeを混ぜない。ID tokenの署名/issuer/audience/expiry、認可試行のstate/nonceを検証し、Google identityの主キーにはemailでなく`sub`を使う。認可先等はOIDC Discoveryから取得できる。[Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect)

Driveは機能を選んだ時に `drive.file` を追加し、offline accessと`include_granted_scopes=true`を使う。SSOと同じアカウントにはlogin_hint、別アカウントには選択導線を用意するが、最終的な同意画面はGoogle側の状態にも依存する。必要scopeが実際に付与されたかを確認し、refresh tokenがない場合の明示再同意を扱う。通常refresh responseでrefresh tokenが省略された場合に既存の有効tokenを消す実装は避ける。[Web server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)

同資料はrevokeが同projectに許可した全scope・全clientのaccess/refresh tokenを無効化すると記載する。従ってIN-09の「Driveのみ解除・サインインに影響なし」、AC-06の「GoogleIdentity解除後もDrive保持」の第一候補は、対象のHollow内credential/identityだけ破棄し、Drive解除では自動backup off・job取消・epoch失効を行うこと。provider grant撤回まで実行したとは表示しない。client IDを同project内で分けるだけでrevokeが独立するとは仮定しない。既存Hollow sessionとprovider tokenを混同しない。

Googleの部分同意では不足scopeのAPIを呼ばず、その機能を無効化する。External/TestingのDrive用refresh tokenは原則7日で失効し得るため、開発で一度接続できただけでは無人backup運用成立にならない。公開状態/利用者制限/verificationは採用scopeと運用形態に応じて確認する。[OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies)、[refresh token expiration](https://developers.google.com/identity/protocols/oauth2)

### AC-03の第三者メール自動リンクは要判断

現原文は「既存Hollowのメール確認済み＋Googleメール確認済み」で自動紐付ける。Google公式は、Gmailまたは`email_verified=true`かつ`hd`ありの場合をGoogleがemail所有の権威を持つ条件とし、非Gmail/hdなしでは`email_verified=true`でも、Google登録後に第三者メールの所有者が変わり得るため追加challengeを推奨している。[Google ID token検証: email authority](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)

最小の安全案は、非authoritativeメールと既存Hollowアカウントが一致した時だけ自動リンクを保留し、既存Hollow認証手段による再認証、または現在のメール宛ての新しい一回限り確認を経て紐付けること。過去のHollow確認済みflagだけでは今回の所有確認にならない。既存Google `sub`で既に紐付く通常再ログインとは別経路である。これは原文を安全側へ変える判断になり得るため、Verifierが採用・実装せず、Managerの判断/必要ならユーザー確認へ返す。

## Driveのバックアップ先とAPI

`appDataFolder`はアプリ専用・Drive UIから見えない領域で、共有/通常領域への移動にも制約がある。IN-05のフォルダ選択、IN-06のDriveファイルリンク、解除後も利用者のDriveに原本を残す体験の代替にしない。`drive` spaceの通常専用folderを作る方式が原文に合う。[appDataFolder](https://developers.google.com/workspace/drive/api/guides/appdata?hl=en)

`drive.file`はアプリ作成fileと、利用者がPicker等でアプリへ選択共有したfileに限定した非sensitive scope。任意既存folderを列挙するために全Drive scopeを無言で追加しない。既存folder選択はPicker＋明示共有を第一候補とし、folderへ子を追加できることを確認する。[Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)、[Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker?hl=en)

| 要件 | API契約と必要な記録 |
| --- | --- |
| 専用folder/選択先 | folder MIMEで`files.create`、`parents`で保存先を指定。folder IDを保持し、同名文字列をidentityにしない。metadataのtrashed/capabilities.canAddChildrenを確認する。 |
| 原本backup | Drive blobとして`files.create` upload。元形式をGoogle Docsへ変換しない。5MB超や通信中断を考慮しresumable uploadを使用可能。 |
| 二重作成抑止 | `files.generateIds`でIDを先に確保し記録してcreateへ渡す方式がある。成功後の同ID retryは409となり二重fileを作らない。Hollowのjob冪等性/実行中抑止とは別に扱う。 |
| 復元元取得 | 記録したDrive file IDへ`files.get?alt=media`でblob取得。Google Workspace documentのexportと混同しない。bounded streamと元hash照合を行う。 |
| 表示と整合 | backup owner（Hollow user＋Google sub）、fileId、folderId、元hash/bytes、webViewLink等を保持。利用者ごとのbackup記録をworkspace共通の単一flagにしない。 |

根拠: [folder](https://developers.google.com/workspace/drive/api/guides/folder)、[uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads)、[pre-generated IDs](https://developers.google.com/workspace/drive/api/guides/create-file)、[downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads)、[files fields](https://developers.google.com/workspace/drive/api/reference/rest/v3/files?hl=en)。

IN-07の「移動されていたら中止」は追加注意点。Driveは移動でparentsを変更でき、fileIdによる取得は移動しただけでは必ず失敗しない。原文を厳密に維持するなら、記録folderと現在parentsの不一致を検査して中止する契約が要る。取得可能なら復元する方へ変える場合はManager判断とし、APIが自動的に404を返す前提にはしない。

folder不在時の再作成と、権限拒否時の勝手な別folder作成を区別する。IN-06の既backup成功扱いも、Drive側で削除済みなのに永続成功flagだけでskipするかは判断が必要。IN-07では実metadata/取得結果に基づき理由を表示する。別workspace利用者からの再生成はbackup記録ownerのDrive tokenを使う原文なので、note権限に加え、そのcredentialの現在の有効性/解除epochを確認する。tokenそのものを他利用者へ渡さない。

## 必要設定と未検証gate

以下は設定項目の意味であり、現repoに存在するenv名を調査した一覧ではない。値は探索・出力していない。

| 連携 | 必要な設定/準備 |
| --- | --- |
| OpenRouter | callback URL/許可戻り先、S256試行の一回限り保管、利用者keyの暗号化保管用鍵、用途別の既定model ID、provider/input制限・月間実行枠。利用者keyはPKCEで得るので手動API-key入力や運営Management keyは前提にしない。 |
| Google SSO | Google Cloud project、Web OAuth client ID/client secret、正確なauthorized redirect URI、同意画面/テスト利用者/公開状態、要求scope。 |
| Drive | Drive API有効化、incremental `drive.file`/offline、refresh token暗号化保管、連携先subとfolder ID。Picker採用ならPicker API有効化、制限付きdeveloper API key、Cloud project number/appId、ブラウザorigin。 |
| 共通 | credential暗号化key rotation、callback/logの秘密非露出、連携epochとjob結果guard、timeout/retry方針、実接続時の利用者同意と費用許可。 |

P5の実接続gateは、取消/再利用/期限/state不一致、実key疎通と失効、必要scope/別Google account/refresh、原本のDrive hash往復、既存backup再試行、移動/削除/権限失効、連携解除後の遅いjob結果拒否、画像PDFと各代表音声の実モデル変換まで含む。今回はいずれも未実行。モデル品質・料金・200MB全入力の処理時間、provider保持方針の採用、実Google verificationも未確定。

ローカルではport契約・暗号化保管・callback検証・fake adapterによるjob/取消/旧本文保持を進められる。資格情報未設定は実接続部分の未完条件であり、ローカル作業全体を止める理由にはしない。P2a修正環境の所有者・状態を変更せず、独立した要件成立調査として終了する。
