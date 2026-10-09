# 招待メールのSMTP契約確認

Nodeの招待配送は既存の `InvitationMailer.send(id, mail, signal)` を使う。`NodeSmtpInvitationMailer` は各送信に専用の `NodeSmtpMailer` を作り、有限deadlineとnative socket closeを管理する。AbortSignalはその送信だけを停止する。SMTP設定はruntimeで一度読み、アカウントメールと招待メールへ渡す。

SMTPの設定形式とファイル権限は [account_verification.md](./account_verification.md#smtpの実runtime設定) を参照する。TLSは証明書を検証するimplicit TLS、または必須STARTTLSを使う。招待用の保護鍵はSMTP passwordと別に管理する。

## ローカル契約テスト

通常suiteは専用loopback SMTPと合成CA・認証情報を使う。SMTP・招待リンクの実サービスへ接続しない。setupが供給する永続TMPDIRにfixtureを作る。

```sh
pnpm exec vitest run packages/core/src/adapters/node/mail/smtpInvitationMailer.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts --project node packages/core/src/adapters/libsql/__tests__/smtpInvitation.integration.test.ts
```

送信テストは日本語の件名・本文、role、期限、リンク、TLS、SMTP拒否、ACK不明、deadline、abort、並行送信の分離とnative closeを検証する。application integrationは実DBで再試行時刻、原文とtokenの保持、6回の試行上限、明示再送による次generationを検証する。

SMTPアダプターは自動再送しない。同じdelivery IDもSMTPサーバーによる重複排除を保証しない。applicationは失敗後に1分、5分、15分、1時間、4時間の間隔で再試行し、初回から24時間または6回で停止する。DATAのACKが失われた場合、受信済みのメールが再試行で重複することがある。内部再試行は招待rateを再課金せず、明示再送は新しいgenerationとして課金する。

## 専用profileの準備

実配送には専用SMTP認証情報と承認済み宛先を使う。次のprofileを、所有者のdirectory700・file600・非symlinkで保存する。SMTP configとpassword fileも同じ権限を使う。profileの上限は16KiB。

```json
{
  "version": 1,
  "mode": "invitation",
  "smtpConfigFile": "/absolute/private/smtp.json",
  "approvedRecipient": "approved-recipient@example.test",
  "deliveryId": "dedicated-invitation-1",
  "workspaceName": "配送確認用ワークスペース",
  "role": "editor",
  "expiresAt": "2026-10-23T05:00:00.000Z",
  "approvedInvitationUrl": "https://approved-hollow.example.test/invitations?token=approved-copied-token"
}
```

宛先、workspace名、role、期限、コピーした現在の招待URLを照合する。期限は未来の実際の値に置き換える。このscriptはアカウント、workspace、招待、DBを作成・更新しない。招待を用意する場合は通常のowner画面を使う。招待URLとSMTP passwordはログやリポジトリへ保存しない。

## 明示した実配送

設定確認はネットワークへ接続しない。

```sh
pnpm --filter @repo/web exec tsx scripts/invitation-contract.live.node.ts --profile /absolute/private/invitation-contract.json --check
```

接続・宛先・本文の配送承認を得た後、次のコマンドで一通だけ送る。宛先引数がprofileと一致しなければ送信しない。

```sh
pnpm --filter @repo/web exec tsx scripts/invitation-contract.live.node.ts --profile /absolute/private/invitation-contract.json --recipient approved-recipient@example.test --send
```

成功はSMTPの受理とnative close完了を示す。受信箱への到達、迷惑メール判定、件名・role・期限・リンクの一致を受信側で確認する。通常の招待URLを使った場合は参加画面で宛先を確認し、参加後のroleも確認する。このscriptは配送状態をDBへ記録しないため、通常workerによる送信と同じ招待を使うと重複配送になりうる。通常配送とは別の承認済み確認として扱う。

拒否・timeout・ACK不明は失敗となり、自動再送しない。ACK不明時は受信側を確認し、再実行の承認を得る。ローカルsuiteの合格を、実配送・受信・参加の確認として扱わない。
