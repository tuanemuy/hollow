# P5a Google認証・ログイン方法管理 詳細提案

## 現在事実と採用依頼

2026-09-27、P4f-2独立受入後の提案専用作業。製品・依存変更0、DB/runtime/browser未起動、鍵・既存proof未読取。読取対象は要件/採用設計/旧認証調査/現在製品と公開一次資料、この文書だけを書き込んだ。gitは受入commit `ec6a64669419e4407c3935be9c70825bda059ec8` の製品clean、未追跡`.goal-implement/`を保持。goal/spec/spec-implement不使用。固定P5a-A〜Hの8条件を変更しない。

引継ぎbaselineはManager通知の`/Users/hikaru/.local/share/hollow/verification/p4f2-independent-20260927-jlNBt1/final`（21:18:20.497）と同直下final-comparison/details-v2/inventory/deltas/independent-seal。ledger32/87表780列171trigger、session62、旧11accounts/103notes/通常12objects3107B/FTS8253/20scope、全15files3809B/manifest `95141ec6059bf8f9d58ed8cd27df98131e458d76394c5fdf5576aec2a29213f3` を次の停止下開始比較元とする。今回はまだ再読/再監査しておらず、旧P/Jへ基点を戻さない。

以下の共有port/DDL/技術値・契約UIの隔離方法をManagerへ採用依頼する。まだ実装・検証成功ではない。第三者メールの既存accountへは追加proof前のlink/session禁止、既存unverifiedは通常確認先行、Google-only新規を既存第三者linkと混同しない採用判断を維持する。

1. accounts nullable password＋authVersion、session nullable browser binding、0032と4新表/4認証repo。汎用Account.saveはinsert-onlyへ狭め、verified更新/credential更新を別CASにする。
2. browser contextの単調epochとsession発行世代をDBで束縛。認証を進めるPOSTはbootstrap済みbrowser cookieを要求し、遅いsession cookieが届いても旧epochを認可しない。既存sessionの値/30日期限を移行時に変更しない。
3. Google port・専用PKCE protector・固定endpoint/有限HTTP、目的別challengeと有限rate/prune。既存google-auth-library 9.15.1を使い新依存を増やさない第一案。
4. 同bundle契約UIは自己専用空DB/objects/mail/新独立鍵へ完全隔離し、server constructorの型付きDIでGoogle portだけ代替する。本番env/routeにfake切替は作らず、freshの11accountsへ認証方法の検証変更を行わない。

## 現sourceの照合

| 実path | 現在の事実と必要な局所変更 |
| --- | --- |
| `domain/account/entity.ts` / `ports/accountRepository.ts` | Account.passwordHash:string必須、Sessionはhash/account/expiryだけ。Google-only、authVersion、現在methods、browser発行世代がない |
| `adapters/libsql/repositories/accountRepository.ts` | saveはemail/passwordHash/verifiedAt全upsert。古いAccountの再saveがcredentialを復活させ得るため認証変更へ流用できない。現在saveの製品呼出はsignupとverifyEmail |
| `application/account/signIn.ts` / `session.ts` | hash検証はUoW内、待機/8回lock、固定30日。requireAccount/currentUserはfindSessionを信頼。Google-onlyも同じ誤資格情報を維持。新hash/proofはTx外計算→短Tx現在hash/authVersion再照合へ |
| `application/account/verifyEmail.ts` | 現Account全saveでverified化し、同verification browserだけsession。verified専用更新へ替え、別browserではverified更新だけというAC-02契約を保持 |
| `presentation/hollowAuth.ts` | password signInがsession発行後に別Txで旧sessionをsignOutしSetCookie。競合する認証transitionを同Txへまとめる。UI callbackのguardだけでは遅いSetCookieを止められない |
| `presentation/hollowServer.ts` | HttpOnly/Lax/HTTPS Secure、no-store、通常POSTのOrigin完全一致。OAuth callbackだけ専用state/browser入口とし全POST originを緩めない |
| `hollowSchema.ts` / `migrate.node.ts` | accounts5列でpassword_hash NOT NULL。migrator前にforeign_keys=ON。rebuild時のFK無効化をSQL内PRAGMAだけで成立したと仮定しない |
| `application/di/hollowTypes.ts` / `server.node.ts` | auth専用runtime未接続、既存mailer/hash/token/UoWを再利用できる。PDF/ZIP既受入のworker/配備は変更不要 |
| `application/workspace/invitations.ts` / `invitationCookies.ts` | 原continuation/selector/世代/browserを再利用。OAuth復帰時の最新招待cookieだけを読むとA→B取り違えになるため開始時の原selectorを固定 |
| core package/lock | google-auth-library公開依存、lock9.15.1、gaxios6.7.1。library型にOAuth2ClientOptions.transporterOptions/公開verifySignedJwtWithCertsAsyncがある。内部import/castで入口を隠さない |

## 保存と内向き型・port

### 0032 auth保存

`accounts.password_hash`をnullable、`auth_version INTEGER NOT NULL DEFAULT 1`追加。既存5列の値（hashを含む）をそのままコピーし、email唯一・ID/日時・確認状態を保持。新Google-onlyへ空/架空passwordを作らない。Accountの認証methodsはpassword-only/Google-only/bothのunionにし、public UserViewは引き続きid/emailだけ。methods DTOも存在boolのみでsub/hash/鍵を出さない。

| 新保存先/追加列 | 主な列/一意/FK/index |
| --- | --- |
| `google_identities` | account_id PK/FK(accounts RESTRICT)、canonical issuer、case-sensitive sub、linked_at、version。UNIQUE(issuer,sub)、一account一Google |
| `auth_browser_contexts` | browser_hash PK、epoch安全整数、retain_until、updated_at。epochはlogin/logout/actor切替でCAS増加。index(retain_until,browser_hash) |
| `google_auth_attempts` | id PK、state_hash UNIQUE、mode、browser_hash/epoch、元session_hash/account/authVersion（modeでnull制約）、return固定JSON、nonce_hash、verifier_envelope、fixed expires_at、state/version、exchange claim、safe verified claims、token_exp/iat、reauth proof hash/期限、結果account ID。FK/browser、対象account。index(state,expires_at,id)、index(browser_hash,epoch)、index(account_id,state) |
| `account_auth_challenges` | token_hash PK、purpose google-link/reset、account_id/authVersion/email、attempt_id/sub/browser binding（linkのみ）、generation/created_at/expires_at/consumed_at。FK account/attempt、同purpose対象の世代一意、index(purpose,account_id,expires_at)、index(expires_at,token_hash) |
| `sessions`追加 | browser_hash/epoch nullableを対で追加、index(browser_hash,epoch)。既存62sessionはnullのlegacy行のまま、hash/account/expires_at不変更 |

reauth proofはattemptのreauth-ready状態にhash/期限を持たせ別表を増やさない。id/state/return/nonceは入力をbounded validateし、nullable列の組合せはstate/mode CHECKとdecode unionで拒否する。pending/exchangingはverifierを必要とし、交換結果を保存した時点/失敗/期限切れでenvelopeをnull化、terminal時に不要claimsもscrubする。exchangingのプロセス中断は同code再交換せずfailed/明示新試行へ。

方法0を防ぐ正本は専用methods repoのCASと同Tx。passwordをnullへする更新はGoogle存在、Google削除はpassword存在を現在DBで再検査し、DB triggerでも保護する。Google-only新規は専用createGoogleでaccount＋Identityを同Tx挿入し、方法0の途中rowをcommit/外部公開しない。cross-table CHECKだけで全不変を表現できるとは主張しない。既存Account.saveはinsert-only（既存ID conflictで更新しない）に変更し、verifyEmailはmarkVerifiedの限定更新へ。profile/公開名等の別repoは変更しない。

内向きrepoは `AccountAuthenticationRepository`（methods/sub照会・current hash/authVersion CAS・verify専用更新・session削除）、`AuthBrowserRepository`（ensure/capture/transition/CAS）、`GoogleAuthAttemptRepository`（開始/交換claim/claims採用/一回完了/現在view/prune）、`AccountChallengeRepository`（発行/現在世代/一回consume/prune）。既存AccountRepositoryのfindSessionはbrowser binding付き行なら現epochとのJOINを通ったものだけを返す。legacy null bindingは移行だけで失効させない。一般認可usecaseへbrowser cookie引数を大量追加せず、sessionの永続fenceを共通readで確認する。

### rebuildの安全な適用

accountsを新nullable表へ通常のcreate/copy/drop/renameで再構築し、旧全列値/全referencing FK/171triggerとindexをcloneで照合する。旧migration編集・writable_schemaは禁止。通常migratorがtransaction内PRAGMAを無視する危険があるため、0032適用前だけ移行runnerが専用connection/停止環境でFK OFFをtransaction外に設定し、migration Tx内の最後に全foreign_key_checkが0であることをCHECK guardでassertする案。rename時のschema参照検査/legacy_alter_tableの必要性もcloneで検証し、finally FK ON・再checkを必須とする。全migrationを無条件FK OFFへ変えない。実libSQLで安全に成立しない場合はfresh適用せず具体差をManagerへ返す。

既存87表780列のbefore/after比較はnullable変更の構造差とauth_version/新表追加だけを許容し、全旧hash/sessionexpiry/値は非出力の内部比較で一致確認する。秘密のhash自体を証跡へ再hash/列出力しない。FK/trigger/objects/FTS/20scopeを独立に保持する。

## browser/server fenceとcookie遅着

新ランダムHttpOnly `hollow_auth_browser` cookieは認証開始前のbootstrapで確立する。bootstrap応答だけではsession/Identityを発行せず、次の同origin POSTでbrowser cookieが返ったことを確認して認証操作を開始する。未確立の同POST内でcookie作成とログインを同時完了しない。login/link/reauth attemptはbrowser hash/epochと開始時actor/sessionを固定する。

password signin、同browser AC-02/invitation signupによるsession発行、Google login完了、通常signout/actor切替を同じbrowser transition portへ接続する。session発行＋旧session削除＋epoch増加＋attempt完了は同Tx。新sessionへそのepochを保存する。匿名→A→匿名でもepochが変わるので古いcallback/claims採用を拒否する。古い200/SetCookieが後で到着しても、そのtokenのsession epochが現browser行と違えばrequireAccount/currentUserを通れず認証復活しない。cookie喪失や遅い削除で表示がsigned-outになる可能性は安全な再ログインへ案内し、成功cookieを再発行するreceiptは作らない。

新browser cookieは通常login/logoutで値を回転/削除せず世代をserverだけで進める。初期bootstrapの並行応答・cookie未確立・cookie削除の境界も局所HTTP対へ含める。browser cookieなし/不一致の状態で旧attemptを別contextへ移植しない。古いlegacy sessionで初めて認証方法操作をする場合も現在tokenを検証してbrowserを確立し、次POSTでそのsessionへ束縛する。既存sessionを移行時一括書換えしない。

authVersionはpending OAuth/proof/resetのcredential変化検出用であり、全方法変更で全sessionを自動失効させる用途にはしない。password変更は現在token/expiryを維持して他session削除、resetは全旧session削除後に明示signin、他端末signoutは現在token以外削除。解除だけでDrive/provider grantや全sessionを消さない。

## OAuth・追加proof・reset

`GoogleOidc`はbegin material/認可URLとcode交換検証済claimsだけを返す。raw access/refresh/id tokenをapplication結果/DTOへ返さずNode adapter内で破棄、PKCEは専用`AuthenticationSecretProtector`がattempt ID/mode/browser epochをAADとしてAES-256-GCM保護する。既存招待/共有/Drive鍵は流用しない。Google設定がない場合はoptional providerなしを投影、password/reset/method状態readを維持する。

callbackはstate/browser/期限を先に確認→短TxでpendingをexchangingへCAS→Tx外code交換＋鍵検証→短Txで現在actor/authVersion/epoch/ID token期限/競合を再照合する。code/nonce/secretをlogger原因chainへ渡さずsafe enumへ変換。OAuth callbackからno-store/no-referrerのtokenless結果画面へ303。GET queryで来るcode/stateは一般ログへ記録せず即redirect、履歴置換のUI補助を使うがprovider/browserの履歴仕様まで無保存を絶対保証しない。アプリはraw queryを永続化せず、ID tokenはURLへ載せない。

分岐はlinked issuer/sub優先→未連携の現在email候補。linked email変更でaccount付替え/公開profile上書きなし。verified既存authoritativeだけ自動link、既存第三者はpassword又はgoogle-link mail必須、unverifiedは通常AC-02へ、未知verified emailはGoogle-only新規。Tx競合で後発password signupがあれば既存分岐へ再評価し、UNIQUE失敗から無条件loginしない。

google-link mailは元attempt/sub/account/email/authVersion/browserへ束縛、token hashだけ保存。GETは説明だけで消費/readyを付けない。元browserの明示POSTだけでconsume＋link＋session＋terminal同Tx、別browserは元browserへリンクを開く案内のみ。再送はpurpose/attempt世代を進め旧tokenを無効化、親10分を延長しない。普通AC-02の24h/別browser確認成立とは別経路。メール配送はTx外で、ACK不明は勝手に別challengeを発行しない。

password proofは既存signInを呼ばない。対象現在hashをTx外でverifyし、完了Txで同じauthVersion/hash/verified/epoch/attempt/subを再確認。Google-only password追加は新nonce code flowの同じlinked subだけをreauth proofへし、明示password確定でconsumeする。prompt=consent/select_accountをGoogle password再入力保証とは扱わない。

resetは1hの別purpose。未知emailも同じ画面応答、Google-onlyへ設定から追加の案内メールだけを送る。新password強度/二回一致、発行時authVersion/hash現在性→consume/password変更/全session削除を同Tx。resetに申請元browser必須を追加しない。mail secret URLは新画面でも一般telemetry/logに保存せず、リンクのGET非消費・POST確定を採る。

ACK不明のcodeを自動再交換しない。durable verified/proof-required/completedの既存状態だけ同browserで照会可。completed receiptはlogin credentialではなく、cookie有効なら現在ログインを示し、届かなければ明示再ログイン。API transport自動retryとprovider token refreshを無効にし、refresh token保存/offline scopeを追加しない。

## 有限値・実adapter案（この文書で採用依頼）

既採用のattempt10分/link mail親以下10分・再送60秒/reauth親以下5分、通常確認24h/60秒/reset1h/session30日を維持する。

| 項目 | 提案値・理由 |
| --- | --- |
| token交換＋鍵照合 | 合計10秒deadline、AbortSignal、redirect拒否、各HTTP retry0、Google固定endpointのみ |
| HTTP bytes | callback/code4KiB・ID token16KiB・token response64KiB・JWKS/証明書256KiB/32keys、UTF8 bounded parse。過大は安全な失敗 |
| HTTP実行枠 | 全体4、queue0。busyは明示やり直し。既PDF/ZIP/HTMLMD枠を借りない |
| password計算枠 | 認証用hash/verify全体2、queue0。専用execution portで既signup/signin/proof/resetを同じ有限枠へ接続し、Txを握って待機しない。既存強度/hash方式は不変更 |
| JWKS cache | 公式Cache-Controlを上限6hで利用、有効期限超過cache不可。unknown kidは一操作1回refresh・同時refresh共有、request失敗をtoken有効へ変換しない |
| browser/OAuth開始rate | browser単位5attempt/10分、同browser非terminal3以下。新attemptでproof照合制限をリセットしない |
| password proof | account単位で既signin相当の段階待機/8回15分lock。purpose別keyだが対象account固定、入力password非保存 |
| mail/reset | 共通宛先60秒抑制を既`mail:`と共有、目的別状態を混ぜない。reset/link申請画面は送信可否/未知accountを共通完了へ畳む |
| prune | 1tick最大100 rows/60秒、terminal secret即scrub、attempt/challengeは固定期限後に削除（有効refのあるものは保持）。browser行は現bound session/attemptがないかつretain_until経過後だけ削除 |

browser retain_untilは発行済みsession固定expiryとattempt期限の最大まで保持する参照寿命で、利用中sessionの30日を延長するものではない。auth runtime停止は新交換/計算受付を止め、開始済みHTTPをabortして実promise終端を待つ。通常password認証をGoogle設定不足でboot拒否しない。暗号鍵不足の未交換attemptは安全な利用不可/明示新開始へし、期限後scrubは復号を必要としない。復号不可を未検証claims成功へ変換しない。

google-auth-library9.15.1の公開OAuth2Client（既存lock）と公開optionsを使う。固定token/certificate endpointへのtransportにtimeout/maxContentLength/retry/redirect制限を掛け、実型とbody消費をcontract testで確認する。library verifyに加えalg/kid/issuer完全一致/aud単一client/azp存在時一致/nonce/exp/iat/sub/email_verifiedと型を自前boundaryで確認。nonce/azpをlibraryだけで済ませない。検証に追加HTTP実装が必要なら新依存を無断追加せず、既存公開型で実装できる範囲を再提案する。

今回確認した一次資料は[GoogleのID token検証](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)（sub、email authority）、[Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect)（認可/claims）、[固定v9.15.1 source](https://github.com/googleapis/google-auth-library-nodejs/blob/v9.15.1/src/auth/oauth2client.ts)（PKCE/code交換/公開verify）。これは公開仕様の読取であり、実認可/実API認証/外部メールは0。GSIのcredential POST例とserver authorization-code callbackを混同せず、この実装は固定redirect URIのcode flowを使う。

## UIと招待

signin/signupに構成依存Google入口、tokenless OAuth結果/proof画面、reset申請/確定、settings/login-methodsの追加・変更・解除/最終方法理由、他端末signoutを追加する。React19 transition/action pendingとoperation busy、actor/route/mount/current contextで旧成功/失敗/finally/focusを拒否。方法解除は現在snapshotを確認し通常dialog、同時操作はserver CASで最後の方法を守る。Google未構成を成功ボタンにせず、password入口・既存確認導線を維持する。

return unionはnotes/許可note URL/settings-login-methods/元invitation continuation selectorだけ。招待A開始→Bを開く→AcallbackでBへ付替えず、元Aの現在期限/issuer/WS/browserを再照合。OAuthはmembershipを作らず既存明示joinを維持。招待を既存第三者Google link proofへ流用しない。未保存editorは既存離脱確認を保ち、OAuth開始で自動save/discardしない。

## ローカル契約UIと秘密保護の提案

fresh既存11accountsには方法追加/解除/resetを一切行わない。freshでは採用後の停止下保全/0032正常移行/旧全列比較/未構成password既存signin smokeだけとする。Google契約UIは新0700proof内の専用空DB（同最新migration）・専用objects/local mailbox・自己新鍵・合成アカウントで行う。`*.invalid`宛て、全Mail portは専用local保存だけ、外部HTTP禁止。最大6自己accounts（password verified/unverified、Google-only、競合sub、招待owner/recipient）、WS1/小note2以内を初期上限にし、増分が必要なら先に通知する。資格情報は専用helperが生成・保護・fillし、tool出力に値/秘密URL/sub/token/hashを出さない。

同bundleのNode起動構築を型付きconstructor dependency factoryへ最小抽出し、通常bootは固定実adapterを構成する。契約launcherだけが同constructorへGoogleOidc/localMailerを注入する。fake providerは製品bundle/本番env/routeに登録せずproof又はtest側だけに置き、ブラウザは実製品begin/callback/proof/method routesを操作する。contract launcherのfake認可画面はloopback専用、外部送信不可能なport、画面に代替検証と表示。callback state/nonce/code/PKCEはこのfakeのメモリだけに持ち、通常cookie/HTTP/DB/CAS/secret protectorは実品を使う。これは実Google成功ではない。

このconstructorはtrusted server-side組立用の型付き引数であり、request body/query/env値から任意providerやendpointを選ぶ仕組みを追加しない。通常製品launcherは引数を与えず固定Google adapterを使い、製品OIDC側のissuer/JWKS/token endpoint/署名検査を無効化するflagを持たない。local harnessがGoogle portを代替したUI証拠と、固定Google adapterへ人工HTTP/自己署名tokenを与えるcrypto契約証拠を明確に分ける。

実adapterは別の自己署名token/公開鍵＋fake bounded HTTPで、実署名検証/claims拒否/code ACK不明/retry0を検査する。test鍵はメモリ又は新自己0600fileのみ、旧鍵を使わず内容/hashを出力しない。ブラウザport代替と実adapter crypto契約を別根拠にする。Google実設定がある場合だけ走る条件付き手順を残すが今回は起動しない。

専用空DBの全行は自己fixtureなので、cleanup時はexact accounts/WS/note/method/attempt/mail/key/object量をManagerへ通知し停止下backupを作る。通常UIで可能なnote/WS/method回収を行い、AC-09未提供accountや鍵/専用DBは勝手に製品用delete routeを作らず保護された検証fixtureとして保持する第一案。全fixture root自体を最終的に廃棄する場合はManagerの別明示許可で正確rootだけを対象にし、fresh・旧proofを消さない。既存11account削除/認証変更は0。

## 工程・影響・見込み

1. 採用後、現在停止/監督closed確認、新private proof排他保全。最新I/finalを基点にさらにcopy比較。schema/内向き型/CAS/browser fenceと0032 cloneを先行。
2. OAuth/proof/reset/methodusecases＋署名/有限HTTP/crypto/現在競合を隔離DBで確認。ABA/遅いSetCookieはsession readまで実HTTPで検査。
3. UI/招待/未構成と同bundle隔離契約UI。390/keyboard・別browser mail・ACK不明・最終方法同時解除・他session失効を小集合で確認。
4. 規定checks/関連既認証・招待・認可回帰、fresh停止直前backup→0032移行/旧比較。自己安全回収/保全、候補commit/source/bundle/dist/lock、全停止で独立へ返す。

実装見込みは **10〜16時間＋独立別**。最大リスクはaccounts rebuildのFK/trigger保持、browser bootstrap/late SetCookieのserver fence、元browser mail/招待復帰と同bundle隔離DI。15分毎に具体成功/失敗/未実行を報告する。

実編集前なので旧条件はまだ再open不要。予定影響はP1-A（認証/session）、P1-D（共通認可）、P1-E（runtime/UI）、P3b-1-B（招待復帰）、旧migration保全条件群。共有requireAccount/findSession変更により実影響がある現在actor境界だけ、編集pathと直接根拠を添えてManagerへ再open依頼する。PDF/ZIPrenderer/初回unknownは無関係で改修しない。OpenRouter/Drive/使用量/退会本体は開始しない。

実Google接続にはWeb OAuth client ID/secret、正確なauthorized redirect URI、同意画面/承認済みtest userと実メール設定/送信先同意が必要。値を探索しない。実code/PKCE/取消・同sub再認可・実配送の未検証は、local契約合格と別に残す。

この提案作成中のruntime/browser/DB/test/build/install起動0、自己execは全終端回収。Manager採用までは製品編集・環境操作を待機する。
