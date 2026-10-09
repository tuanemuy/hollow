# アカウント認証のローカル検証

Node 22.22.3 / Unicode 16.0 は `nix develop` で固定される。通常の `pnpm test` はローカル契約fixtureを自給し、Google・SMTPへの実接続を行わない。

## Browser 正常系

新規checkoutで `pnpm install --frozen-lockfile`、`pnpm build` を実行する。次のコマンドは、未作成の永続ディレクトリへDB・object store・鍵・受信箱を作り、loopbackへ起動する。既存データや `.env` は使わず、起動時にprovider関連の継承環境を取り除く。macOSのUnix socket制限のため、TMPDIRには短い永続パスを指定する。

```sh
mkdir -m 700 -p "$HOME/.local/hwt/account-01"
nix develop --command sh -c '
  export TMPDIR="$HOME/.local/hwt/account-01"
  pnpm test:browser:account --root "$HOME/.local/share/hollow/verification/account-01" --port 4317
'
```

`http://127.0.0.1:4317` が製品画面、`/__fixture/mailbox` が確認メール・再設定メールのローカル受信箱となる。Googleボタンは、本人情報と同意を指定できる `__fixture/google` の代替画面へ進む。入力には専用fixtureアドレスを使う。

`--smtp-local` を追加すると、実 `NodeSmtpMailer` がloopback SMTPへSTARTTLS・専用CA・認証で送信し、その受信メールが同じローカル受信箱に表示される。外部配送は行わない。

`--invitation-local` は専用の合成owner・workspace・招待だけを準備する。受信箱の招待リンクから `invitee@fixture.invalid` を登録すると、確認メール待ちを経ずに認証済みの招待確認へ戻る。「参加する」を押してworkspaceへ加入する。招待対象本人は起動時に作成しない。

確認する操作:

- サインアップ、規約同意、メール確認、同じbrowserのサインイン、別browserでの確認。
- Googleの初回・再訪サインイン、キャンセル、管理対象アドレスの既存アカウントへの追加。
- 管理対象外アドレスの既存アカウントへの追加は、既にメール確認済みでもパスワードまたは新しい確認メールで本人確認する。追加確認前にはログインも連携も成立しない。
- パスワードサインイン、保護されたノートへの復帰、再設定申請・確定・旧セッション失効。
- ログイン方法の一覧、Googleの追加・解除、同じGoogle subjectで再認証してパスワードを追加、パスワード変更・解除、他端末のサインアウト。
- Googleログインを解除してもGoogle Drive連携が維持される説明、最後のログイン方法の解除抑止。
- 未保存ノートのサインアウト確認、取消、受諾、トップへの着地。

停止は起動したターミナルでCtrl-Cを使う。生成rootとTMPDIRはその検証だけが所有する。再検証には別の新規rootを指定する。

## SMTPの実runtime設定

Mailerの注入が優先される。注入がなければ `HOLLOW_MAIL_MODE=smtp` と `HOLLOW_SMTP_CONFIG` によってSMTPを選択する。`local` は `HOLLOW_MAILBOX_DIR` に保存する。

SMTP設定とpassword fileは絶対パスとし、所有者だけが読めるファイル600、その直属directory700を使う。symlinkを使わない。password fileは改行なしのUTF-8文字列とする。

```json
{
  "version": 1,
  "host": "smtp.example.test",
  "port": 465,
  "tls": "implicit",
  "serverName": "smtp.example.test",
  "from": "hollow@example.test",
  "auth": {
    "user": "dedicated-user",
    "passwordFile": "/absolute/private/smtp-password"
  }
}
```

`tls` は `implicit` または `starttls`。STARTTLSは必須で、証明書検証を省略しない。送信ごとに一つのconnectionを所有し、既定30秒のdeadlineとnative socket closeを管理する。拒否・timeout・DATA送信後のACK不明は失敗となり、自動再送しない。秘密値やprovider応答を公開エラーへ含めない。

専用設定を用意したruntimeでは、環境へ次の値を注入して通常の `pnpm start` を実行する。

```sh
HOLLOW_MAIL_MODE=smtp
HOLLOW_SMTP_CONFIG=/absolute/private/smtp.json
```

## 明示した実adapter契約

実接続は通常suiteから分離される。Googleの専用client・承認済みtest identity、SMTPの専用認証情報・承認済み宛先を準備し、接続と配送の承認を得てから実行する。次のコマンドはローカル代替の合格根拠には含まれない。

SMTP専用profile（600、直属directory700）:

```json
{
  "version": 1,
  "mode": "mail",
  "smtpConfigFile": "/absolute/private/smtp.json",
  "approvedRecipient": "approved-recipient@example.test"
}
```

```sh
pnpm test:contract:auth:live --profile /absolute/private/mail-contract.json --recipient approved-recipient@example.test --send
```

送信先がprofileと一致した一通だけを送る。成功はSMTPの受理を示す。宛先への到達・迷惑メール判定は受信側で別途確認する。

Google専用profile:

```json
{
  "version": 1,
  "mode": "google",
  "googleConfigFile": "/absolute/private/google.json",
  "appUrl": "http://127.0.0.1:4318/",
  "expectedEmail": "approved-identity@example.test",
  "expectedSubject": "approved-google-subject"
}
```

`google.json` はruntime共通の `{ "clientId", "clientSecret", "pkceKeyFile" }`。PKCE鍵は32bytes、600、直属directory700。Google clientに専用callback `http://127.0.0.1:4318/auth/google/callback` を登録する。製品runtimeと同じportで同時起動しない。

```sh
pnpm test:contract:auth:live --profile /absolute/private/google-contract.json --exchange
```

表示URLを承認済みidentityで開く。5分以内に一度だけcallbackを受理し、既存の実adapterで署名・issuer・audience・nonce・期限・email verificationを検証して、profileのemail/subjectと照合する。製品アカウントやsessionは作らない。失敗したcodeを再送しない。
