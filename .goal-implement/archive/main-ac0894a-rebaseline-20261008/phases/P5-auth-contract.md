# P5 Google 認証・ログイン方法の接続案

2026-09-20、限定 read-only 準備。正式 P5 開始・設計採用・外部接続成功ではない。製品・依存・DB・runtime/browser・test/build/git・設定・鍵・既存証跡を操作せず、この報告だけを作成した。goal-implement / manager-loop、AC 原文、既報 `reviews/P5-feasibility.md` 全文、brief の利用者 AC-03 決定、design の認証/招待/P5 節、現在 source と公式一次資料を確認した。既報の Drive/LLM 調査は繰り返さず、実装案に含めない。

## 結論と採用境界

Google の第三者メールが一致する既存アカウントへの初回紐付けは、既存パスワードまたは新しい目的別メール challenge が成功するまで Identity/session を作らない。これは利用者の決定済み事項。過去の Hollow verified flag、Google の email_verified、一般 AC-02 確認の成功だけを今回の Google 連携 proof にしない。

現在の認証は Account.passwordHash 必須、メール確認、30 日固定 session、単一 session の signout まで。Google Identity/OAuth attempt、reset、ログイン方法管理、他 session 一括失効の port はまだない。最小候補は既存 Account/UoW/session/PasswordHasher/TokenGenerator/Mailer に、Google sub identity、目的・browser・現在認証版に束縛した試行、認証専用 CAS 更新を足す形。汎用認証 framework への置換は不要。

以降の型・schema・route・運用値は未採用案。特に「Google 再認可」を fresh OAuth の同一 sub 確認とするか、Google 側の直近再認証時刻まで要求するかは分離する。AC-06 の再認可を勝手に毎回の Google password 入力保証へ変えない。

## 根拠と現在の不足

| 現在 source | 再利用できる内容 / 必要差分 |
| --- | --- |
| `domain/account/entity.ts` | email は trim/lowercase、最大254、password は既存12〜128文字規則。Account は passwordHash:string 必須で Google-only を表現できない。verified/unverified union は維持し、credential set を password-only / Google-only / both の union として扱う候補 |
| `domain/account/ports/accountRepository.ts`、`adapters/libsql/repositories/accountRepository.ts` | email/ID read、verification/session/throttle read/write。`save(account)` は email/passwordHash/verifiedAt の全体 upsert、版比較なし。認証方法変更を古い Account の save に載せず、現在版を条件にした専用 write と `markVerified` を追加する必要がある |
| `application/account/signUp.ts` / `verifyEmail.ts` | 通常確認24h、再送60秒、同browserだけ session、別browserは verified 更新のみ。招待同メールの新規 signup だけ確認省略。現在 Mailer.send は Tx 後。Google 用 challenge を `deleteVerifications(accountId)` に混ぜて通常確認を消さない |
| `application/account/signIn.ts` / `session.ts` | 共通誤資格情報、段階待機/lock、verified 必須、session hash+account+固定30日期限。Google-only の password ログインも共通拒否にする。proof 用 password 検証は session を作る signIn の直呼びではなく専用操作にする |
| `adapters/libsql/hollowSchema.ts` | accounts.password_hash NOT NULL、email UNIQUE。sessions は token_hash/account_id/expires_at と account index。Identity/attempt/challenge の保存先と、認証方法版・他session削除操作が不足 |
| `application/execution/hollowUnitOfWork.ts`、libSQL UoW | account と invitation を同 Tx に置ける。Google HTTP や mail 送信を Tx 内に入れず、外部結果の採用前に現在状態を再照合する |
| `presentation/hollowServer.ts` / `hollowAuth.ts` | HttpOnly、SameSite=Lax、HTTPS時Secure、no-store、通常 mutation は同 origin。Google callback は外部 redirect なので通常 POST の origin 検査を全体緩和せず、専用 state/browser/nonce 検証入口を設ける |
| `routes/signin.tsx` / `signup.tsx`、`components/hollow/Auth.tsx` | 現在はメール/password UI。Google 続行、追加 proof、login methods、reset は未接続。既存 note 戻り先 allowlist、React pending、通常確認 UI を保持する |
| `application/workspace/invitations.ts` / `invitationCookies.ts` | browser-bound continuation と invitation ID/generation selector、24hかつ招待期限以下、現在 issuer owner/active WS を確認。OAuth の戻り先に raw invitation token を載せず、この原対象を保持する |
| `packages/core/package.json` / `pnpm-lock.yaml` | google-auth-library は既存依存、lock 9.15.1。現在 source の利用は GCP runtime 用 GoogleAuth であり、Hollow Google login 接続済みではない |

対象原文は AC-01〜06/08。AC-03 の第三者既存メールについては `brief.md` 利用者決定と `design.md` P5 節が原文の自動紐付けを上書きする。AC-02 の目的・別browser動作、AC-04 固定30日、AC-05 reset 1h、AC-06 最終方法禁止とpassword変更時の他session失効、AC-08 現在session維持の他端末signoutは変えない。AC-07 profile の値を Google profile で自動上書きしない。AC-09 は対象外。

## Google claims と照合順

Google 公式は Gmail、または `email_verified=true` かつ `hd` がある Workspace のメールを authoritative とする。非Gmail・hdなしは Google 登録時に確認済みでも第三者メールの現在所有者が変わり得る。email は既存候補の検索にだけ使い、恒久 identity は issuer/sub とする。[Google ID token の検証](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)

Hollow 側では検証済み token の email_verified が boolean true でない場合は原文どおり拒否する。Gmail はメールの正確な domain `gmail.com` として判定し、文字列部分一致を使わない。Workspace は署名済み hd claim を見る。request の hd/login_hint、メール末尾の会社 domain だけを authority にしない。Hollow の既存 accountEmail 正規化を使い、Gmail dot/plus の独自 alias 統合を加えない。

| Google callback での現在状態 | 結果候補 |
| --- | --- |
| 検証済み sub が既存 Identity に連携済み | email 候補より先に linked account を引く。現在 account verified、link 世代/認証方法版が有効なら通常再ログイン。Google email が変わっていても別 email account へ付け替えず、Hollow email も自動変更しない |
| 未連携 sub、同一 email の既存 verified account、Google authoritative | 原文 AC-03 の自動紐付け経路。現在 account/競合 Identity を Tx で再確認し、Identity+session を同 Tx。別の Google method が既にある場合は黙って置換しない |
| 未連携 sub、同一 email の既存 verified account、第三者メール | 今回専用の追加 proof 待ち。既存 password または新しい mail challenge のどちらか。proof 完了までリンク/session なし |
| 未連携 sub、同一 email の既存 unverified account | authoritative/第三者とも自動紐付けしない。先に通常 AC-02 を案内。password 正解だけで verified にしない。通常確認後も Google link は別の明示手続きで現在状態を再確認する |
| 未連携 sub、同一 email account なし、Google email verified | AC-03 の新規 Google-only 作成候補。account+Identity+session を同 Tx。利用者決定は既存 account への初回 link を対象としており、第三者メールの全新規登録へ追加 challenge を勝手に拡大しない |
| Google email unverified / token 不正 / browser・期限不一致 | link/account/session を作らず安全な再開案内。raw provider error/token を表示しない |

この表は callback の最初の read だけで確定しない。外部交換後、proof 後、commit 直前に再評価する。新規候補を見た後に同 email の password signup が競合したなら、今は「既存 account」の分岐へ移り、第三者メールなら追加 proof が必要。UNIQUE 違反を捕まえて無条件に既存 account へ signIn する実装は不可。

## 最小 domain / port / schema 候補

### 保存と更新

候補 A は既存 accounts の password_hash を nullable にし auth_version を追加、`google_identities` を別 table とする。Identity は account_id、canonical issuer、case-sensitive sub、createdAt、link generation。`UNIQUE(issuer,sub)` は必須。現在の「パスワード / Google」各方法一つという UI を使うなら account_id UNIQUE も候補だが、複数 Google accounts 対応へ勝手に拡張しない。Google email/name/picture を Identity の同一性にしない。

既存 passwordHash は全行そのまま保持し、架空 password や空文字の「Google専用hash」を作らない。NOT NULL 変更で accounts rebuild が必要なら、既存 FK/trigger/ID/日時/verified/profile/note/WS 関係を新 migration と clone で保持できるかが正式実装の確認点。旧 migration は編集しない。本準備で移行は実行していない。

認証方法の union は repo から現在 password と Google Identity を読んで構築し、方法0を永続化する command を許さない。最後の方法の競合防止は下記 auth_version CAS と同 Tx を正本にする。cross-table CHECK が自動でこの制約を守るとは主張しない。代案は専用 auth_methods 一行に passwordHash/googleSub/version と「どちらか必須」CHECK を置く方式だが、既存 account credential を移す範囲が広いため第一候補ではない。

| 新規または拡張 port | 最小の責務 |
| --- | --- |
| `GoogleOidc` application port | 固定 client/redirect 設定による認可 URL、S256 material、有限 code 交換と検証済み claims。入力 mode は login/link/reauth。HTTPやJWTはNode adapter、Clock/ID は既存 port。成功 DTO に access/refresh/id token を出さない |
| `AccountAuthenticationRepository` または accounts の専用 methods | methods snapshot/authVersion、sub検索、現在版CAS、Google追加/解除、password追加/変更/解除、verified専用更新。全体 Account.save で stale password/verifiedAt を復元しない |
| `GoogleAuthAttemptRepository` | stateHash 一意、browserHash、mode、元 actor/session snapshot、対象 account/authVersion、nonceHash、PKCE verifier保護、期限、一回性と状態遷移CAS、検証済み issuer/sub/email/authority、元戻り先。外部交換の claim と採用を分ける |
| `AccountChallengeRepository` | purpose を `google-link` / `password-reset` で区別。hash、target account、元 attempt/issuer/sub/browser、期待authVersion、固定期限、消費/再送世代。通常 email_verifications とは混ぜない |
| accounts の session 操作 | `deleteSessionsExcept(accountId,currentHash)` と reset 用全session削除。AC-08 他端末解除、AC-06 password変更で同 Tx に使う。現在sessionの expiresAt は延長しない |

具体的な新保存先候補は `google_auth_attempts` と `account_auth_challenges`。attempt 状態は `pending → exchanging → verified → proof-required / completed`、または `reauth-ready / failed / cancelled / expired` を用途に応じた union にする。`exchanging` の旧 claim と終端への遅い結果を revision/CAS で拒否する。challenge も purpose 別 union とし、`google-link` にだけ元 Google attempt/sub/browser を必須にする。`password-reset` は account/credential版/token/1h期限/消費を束縛するが、AC-05 にない「申請時と同browser必須」を追加しない。各 table の有限 prune と index は期限・state・対象accountを基準にする候補で、DDL は未作成。

scope/mode と対象は server が固定し、client の target accountId/email を認可にしない。新しい Google SSO が未設定の runtime では未接続を安全に表示し、fake adapter だけを本番成功にしない。既存 token/hash/password/mail port を再利用するが、PKCE verifier の保管は認可コード交換まで復元可能である必要があるため hash だけでは不足。専用 purpose/binding 付き保護または短命 server-only secret 保管を選び、招待・共有の既存鍵を用途流用する判断はこの報告では行わない。

### 原 actor/browser の server fence

link/reauth は開始時の current account と session hash、authVersion を記録し、採用時に同じ現在 session/account を再確認する。anonymous login も開始後に別 account へ signIn した callback で cookie を上書きしない。client の actorEpoch だけでは HTTP Set-Cookie の遅着を防げない。

signed-out→A→signed-out の ABA も拒否する候補は、server 管理の auth-browser 世代を attempt に固定し、login/logout/account切替で進める方式。新 OAuth session に同じ browser世代を束縛し、古い世代の session は認可 read でも拒否すれば、遅い Set-Cookie が後から到着しても認証は復活しない。単に現在 cookie が null かを比較する案ではこの ABA は検出できない。

この追加は既存 P1-A の session/signout 入口にも影響する。永続 browser-context 行と session の nullable binding を追加する案、または同等の server-side pending attempt/発行session失効を実現する案の選択は未採用。browser fingerprint/IP を本人の証明にせず、ランダム HttpOnly cookie と server 記録を使う。一般 session を無断 sliding expiry に変えない。

## OAuth code flow と ACK 不明

推奨入口形は同 origin POST の begin、専用 callback、tokenless pending/proof 画面、明示 POST の complete。具体 route 名は未確定。SSO scope は `openid email` が技術上の最小。AC-03 の「基本プロフィールのスコープ」を文字通り提供する場合は `profile` を追加する候補で、いずれも Drive scope/offline refresh は要求しない。profile scope を取得しても公開名/icon を勝手に登録・上書きしない。

1. begin は mode と validated return union を固定し、ランダム state/nonce/S256 verifier、browser/現在認証境界、固定期限を保存。state に任意 return URL や email を平文埋込しない。
2. Google が返した state/browser/未消費/期限を先に確認し、attempt を CAS で `exchanging` にする。複数 callback が同 code を同時交換しない。交換は Tx 外、固定 Google endpoints、有限応答/timeout、秘密非ログで行う。
3. 署名/JWKS、issuer、audience/authorized party、nonce、exp/iat、email型、sub を検証してから、safe claims を attempt へ保存する。JWT decode だけの claims は採用しない。
4. Tx で current account/Identity/authVersion/browser/戻り先条件を再確認し、上の照合表へ分岐する。必要な proof 前は `proof-required` のみ。即時完了可能なら Identity/account/session/attempt終端を同 Tx にする。
5. callback は秘密 query を残さず安全な内部画面へ redirect。no-store/no-referrer、code/state/id token の一般アクセスログ・error全文非出力。SSO callback のために既存 mutation origin 検査を無効化しない。

mode ごとの完了結果も分ける。`login` だけが新しい IssuedSession を返し、`link` は現在 session を維持して methods view、`reauth` は限定された一回限り proof を返す。reauth callback 自体では password を追加せず、proof を用いた明示 password 確定で消費する。

issuer は Google 公式が許容する `https://accounts.google.com` / `accounts.google.com` の完全一致だけを検証し、内部 Identity の issuer 表現へ正規化する。任意 issuer、token内 jku/x5u の任意URLへ鍵取得しない。固定された Google metadata/JWKS に対し許可alg・kid・署名を検証する。claims の exp と issuedAt を attempt に保存し、proof 採用期限も `min(元attempt期限, ID token exp)` を越えない案。JWT失効をchallenge成功で延長しない。

交換が timeout/応答喪失なら Google が code を消費したか不明である。未検証 claims で完了しないし、同 code を自動再交換して成功を作らない。明示「Google でやり直す」で新 attempt、旧 attempt は再採用不可にする。Google が成功して local durable claims 保存前に落ちた場合も同じ。`verified/proof-required/completed` が保存済みなら、元 browser と元 attempt の明示状態確認でそこから進む。通常の read を勝手な mutation retry にしない。

completed の ACK/cookie 喪失では、session は現在 hash しか保存していないため raw token を再表示できない。同じ callback を再送して新 session を無条件発行する代替を作らず、現在cookieが有効なら完了表示、届いていなければ明示再ログインを第一候補とする。Identity の二重挿入はしない。既完了を状態確認で検出できても、その receipt 自体を bearer login credential にしない。

Google の server flow/state/nonce、sub の安定性と issuer/aud/expiry/JWKS は公式仕様に記載される。[Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect)。追加の aud配列/azp/nonce 検査は OIDC validation と照合し、単一 Web client ならその client を唯一の audience とし、azp があれば同 client を要求する厳格案。[OIDC Core ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

Node adapter は既存 lock の google-auth-library `OAuth2Client.generateAuthUrl`、`generateCodeVerifierAsync`、`getToken({code,codeVerifier,redirect_uri})`、`verifyIdToken` を利用候補にできる。S256 と codeVerifier 入力は固定版公式 source にある。ただし library だけで Hollow の nonce/azp/browser/一回性まで検証済みとしない。code exchange の library 内 retry 設定も明示制御し、破棄した attempt の遅い結果を採用しない。[公式 v9.15.1 source](https://github.com/googleapis/google-auth-library-nodejs/blob/v9.15.1/src/auth/oauth2client.ts)。PKCE を confidential Web client でも用いる方向は OAuth security BCP に整合する。[RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1)

## 追加 proof と別 browser

### 既存パスワード

pending attempt の対象 account と期待authVersionを読んで password 検証し、同 Tx または Tx 外検証後の再照合で現在 hash/version・verified・Identity競合を確認する。正しい password でも、対象 account の削除/未確認化/credential変更/attempt失効があれば採用しない。失敗は共通エラーと有限 rate、入力 password は保存しない。既存 `signIn` は session 発行を伴うため proof に流用しない。

### 新しい確認メール

challenge は元 Google attempt、verified Google sub、固定 target account/current email、元browserHash、期待authVersionに束縛する。メールは「この Google アカウントを既存 Hollow に連携する」目的と、自分で開始した場合だけ続ける説明を持ち、普通のメール確認と区別する。確認 token の hash だけを保存し、再送は当該 purpose/attempt の旧世代を失効させる。AC-02 用の確認を削除しない。

Mailer 送信は既存同様 Tx 外だが、challenge 保存成功と配送成功を同一視しない。送信失敗/ACK不明を自動で別 challenge の大量再発行へ変換せず、固定親期限内の明示再送とその世代失効を扱う。Google link 成立と実メール配信成功の記録も分離する。

最小安全 UX の推奨候補は、メールリンクを元 browser で開き、対象を確認した明示 POST で proof+link+session を同 Tx 完了する形。GET だけではメール scanner により消費させない。別 browser で開いた場合は Google link/session/proof-ready を一切成立させず、「開始したブラウザーでこのメールリンクを開く」導線を示す。リンクを元 browser へコピーして開いた後の明示確認を完了操作とする。

別 browser を便利に扱う追加案として、メール由来の一回限り secret を元 pending 画面へ利用者が明示貼付する方式は可能。ただし単なる「メールを確認しました」ボタンや、別browserが立てた確認済みflagを元browserが polling して完成する方式は採らない。メールを開いた本人の proof が、元の Google 試行を開始した別人へ自動的に渡ってしまうためである。browserを変更して継続したい場合は、そのbrowserで新しいGoogle試行を明示開始する。

AC-02 の通常メール確認は今のまま別browserでも account verified 更新が成立し、sessionは出ない。これは Google link challenge の別browser拒否と目的が違う。既存 unverified account は先に AC-02 を完了し、同browserで通常 password session が発行されたなら通常認証の結果として扱う。その session を「元Google linkも完了した」と表示しない。元 attempt と current actor が変わった場合は login attempt を無理に継続せず、ログイン方法設定で明示 link を開始する案が安全。

proof 完了時には account verified/存在、現在 email、authVersion、sub の現在所有、元 attempt状態/期限、browser/actor context を同 Tx 再確認し、challenge consume と Identity/session/attempt終端を原子的に行う。同 sub が別 account へ連携されたら拒否。同 account へ競合連携済みでも別試行の成功を今回の proof 成功に偽装せず、現在状態を説明して明示再ログインへ戻す。

## AC-06 / AC-05 / AC-08 の接続

| 操作 | 契約候補 |
| --- | --- |
| Google 追加 | current verified session の account/authVersion と browser を開始時固定。検証済み sub が他 account に連携済みなら拒否。同一 account の同一 sub は現在状態の確認、別 sub への無言置換なし。ログイン入口の email 自動検索とは分離し、signed-in target へ明示 link する。Google email と Hollow email の一致は AC-06 に明記がないため、追加必須条件にしない |
| Google 解除 | 現在 methods/version を再取得し確認。password が残ることを同 Tx で確認して unlink+authVersion CAS。Google provider 全project revoke は行わず local Identity だけを解除。Drive は別連携のまま。既存 Hollow sessions 全失効は原文にないため自動追加しない |
| password 追加 | Google-only の current session と既存 linked sub を固定した `reauth` attempt。新しい Google 認可結果の同一 sub を確認し、一回限り proof を対象session/account/authVersionへ束縛。新password二回一致・既存強度規則を検査し、proof消費+password追加を同 Tx。OAuthの古い通常login成功を無期限再認証proofにしない |
| password 変更 | 現在 password 検証、期待authVersion/hash再照合、新hash保存、他全session削除を同 Tx。current session の hash/期限を維持。遅いhash計算後の方法解除/別password変更を上書きしない |
| password 解除 | Google method が現在残ることを同 Tx で確認し解除。古い UI の「二方法あり」を認可にしない |
| 同時に二方法を解除 | 両操作が同authVersionを条件に CAS。先行一方だけ成功、後行は現在方法が一つとなり拒否。方法0のcommitを許さない。countをTx外で確認して二つともdeleteする方式は不可 |
| AC-05 reset | 独立purposeの1h一回限り token。未知emailは同応答/送信なし、Google-onlyは設定から追加の案内メール。token発行時のcredential版を束縛し、既にpassword解除/再追加済みを古いresetで上書きしない。consume+password更新+旧session全削除を同 Tx。その後の新password signinは明示操作 |
| AC-08 他端末signout | 現在 verified session を再確認し、同accountの他sessionだけ削除。現在30日固定expiryを保持。通常signoutは期限切れでも成功扱い、dirty確認を保つ |

未確認 account や方法0の中間状態を認証可能にしない。方法変更の authVersion は pending OAuth/proof の失効 fence に使うが、すべての方法変更で全sessionを失効させる仕様にはしない。password変更/resetの明示session失効と、Google unlink後の現在session保持を区別する。

Google の `prompt=consent` は再同意、`select_account` は選択であり、毎回のpassword入力保証ではない。現在 Google 文書には auth_time claim の明示要求と設定が記載される一方、通常の parameter 表には `prompt=login`/`max_age` を列挙していない。AC-06 は「Google再認可」と書くため、第一候補は nonce付き新規 code flow と同一 sub の確認。直近のGoogle本人認証時刻まで必須にするなら auth_time の設定/対応と条件を別途正式判断し、今回未実接続のまま成功保証しない。[Google の prompt / claims](https://developers.google.com/identity/openid-connect/openid-connect#authenticationuriparameters)

## 招待・戻り先・現在 UI

OAuth attempt の return は `notes` / 検証済み note destination / `invitation:{continuationId,id,generation}` / login-method settings の限定 union 候補。任意外部URLへ広げない。元 invitation selector と browser-bound continuation を開始時に固定し、callback時の最新cookieだけから別招待へ付け替えない。

復帰時は `invitationFromContinuation` 相当で元 selector、browser、期限、現在招待/issuer/WSを照合。A開始→B招待を開く→旧Acallback の場合、Bへの自動帰還/参加はしない。元対象に戻れなければ「元招待が使えない」を説明し、必要なら原メールから再開。Google認証成功自体と招待失効は区別できるが、membership作成は必ず既存の明示 join POST。招待tokenで既存accountのGoogle link proofを省略しない。新規signupの同メール確認省略だけという採用境界を維持する。

新UIは「Googleで続ける」、キャンセル、state/期限/通信失敗からの明示再開、proof password/mailの選択、メール待ち/別browser案内、login methodsの現在値/最終方法理由を実 callback へ接続する。Google結果のpending中も既存 dirty を黙って保存/破棄しない。actor+epoch+route+mount+operationで旧success/catch/finally/focusを拒否し、refreshで現在状態が同じだっただけで元操作成功を推定しない。React pending とoperation所有busyを分け、確認ダイアログ/keyboard/390pxは正式UI検証に残す。

## 未採用の運用値と外部確認

| 項目 | 提案値 / 根拠と未決 |
| --- | --- |
| OAuth attempt | 開始から10分固定候補。Google codeの寿命とは別。callback/GETで延長しない。proof待ちも含め短すぎるUXなら正式判断で調整 |
| link mail challenge | 最大10分かつ親attempt期限以下、再送60秒候補。AC-02の24hとは別purposeの候補値。再送で親期限を延ばさず、期限後は新Google試行 |
| reauth proof | Google callback成功から5分かつ元attempt上限以下候補、一回だけ。sessionの30日とは独立 |
| code exchange / JWKS | 一操作10秒、response上限・並行/待機の有限化はadapterで設計。具体bytes/枠は現時点未採用。JWKSは公式cache指示、unknown kidの有限refresh、失敗時は閉じる |
| password/mail濫用 | 現signin待機/lockを壊さず、link proof/reset/送信にpurpose別keyと共有宛先送信抑制を検討。新attemptを作れば無制限に送信・password照合できる構造にしない。新たな数値quotaは未決 |
| prune | 終端/期限切れattempt/challengeの有限page。PKCE/claims/秘密を不要後に保持しない。具体保持期間や90日job履歴は流用しない |

既存の決定値は通常確認24h/再送60秒、reset1h、session30日固定だけ。上記10分/5分等は原文要件ではなく、Manager採用前の提案である。

Google SSO 実接続には Web OAuth client ID/secret、正確な authorized redirect URI、同意画面/テスト利用者/公開状態が必要。値や既存設定の有無は探索していない。実メール配送も既存 Mailer のlocal確認とは区別する。実OAuth、外部メール、利用者Googleアカウント、provider grant revokeをこの準備で実行していない。

契約検証で準備できるのは claims偽造/issuer・aud・azp・nonce・expiry拒否、既存verified/unverified/authoritative/第三者/new/linkedの各分岐、sub/email二重競合、proof別目的/別browser/期限/一回性、last-method同時解除、password変更とsession、招待A/B、code exchange ACK不明・遅い結果・actor ABA。実 adapter の必要設定がある時だけ実Googleでcode/PKCE・取消・nonce・同sub再認可を通し、実メール同/別browserを確認する条件付き手順を残す。fake成功は実接続成功でも、要件全完了でもない。

## 影響と返却事項

直接変更候補は account domain/repository、account usecases、認証用UoW/DI、Google adapter、厳格transport/cookie/認証UI、新migration。受入済みでは P1-A/D/E の認証・認可・UI、P3b-1-B の招待認証復帰と selector保持が関連する。session/current actor入口を変更した場合だけ、その入口を使う現在共有/設定等の旧応答境界を影響確認する。全製品の再監査や Drive/LLM/AC-09 実装へ広げない。

Manager判断点は credential保存形とbrowser世代fence、proof mailの元browser復帰UX、OAuth/reauth/challenge期限、scope profileの原文適用、再認可の保証水準。既存unverifiedを自動linkしないこと、第三者既存verifiedへ追加proofを必須とすること、stable sub、一回性/現在条件、最終method禁止、Drive独立は未決に戻さない。

本報告は source と公開一次資料の成立案であり、typecheck/DB移行/HTTP/browser/OAuth/mail/負荷を未実行。正式委譲と採用後に必要な実装・契約検証・条件付き実接続へ分けて進められるが、ここでは開始していない。
