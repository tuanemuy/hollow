# Drive連携・バックアップ・再生成のブラウザ検証

`pnpm test:browser:drive`は製品のNode HTTP/RSCとワーカーを、新規ローカルOAuth・Picker・Drive・OpenRouter・参照配布元で起動します。実Google/OpenRouterへの接続、実費用、音声は対象外です。

## 起動

新しいチェックアウトと未使用のpersistent directoryを指定します。稼働中のチェックアウトは再ビルドしません。

```bash
verification_parent="$HOME/.local/share/hollow/verification/p07-$(date +%s)"
source_checkout="$verification_parent/checkout"
short_tmp="$HOME/.local/hwt/p7-$(date +%s)"
mkdir -p "$verification_parent" "$short_tmp"
git clone --local /Users/hikaru/github.com/tuanemuy/hollow "$source_checkout"
cd "$source_checkout"
run() {
  env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 \
    nix develop "$source_checkout" --command \
    env TMPDIR="$short_tmp" TMP="$short_tmp" TEMP="$short_tmp" \
    CI=true WRANGLER_SEND_METRICS=false "$@"
}
run node -p 'JSON.stringify({node:process.version,unicode:process.versions.unicode})'
run pnpm node -p process.version
run pnpm install --frozen-lockfile
run pnpm typecheck
run pnpm lint:fix
run pnpm format
run pnpm lint
run pnpm format:check
run pnpm build
run pnpm test:browser:drive --root "$verification_parent/runtime" --port 4327
```

Nodeは22.22.3、Unicodeは16.0です。DB・原本・鍵・配布元・送信観測を指定rootに保存します。終了は起動した製品Node serverのPIDを確認してSIGINTを送り、listener・ワーカー・所有するnative処理の終了と起動コマンドのexit 0を待ちます。wrapperの中断やポート閉鎖だけを正常停止とは扱いません。

## ローカル操作

`runtime/fixture.json`に編集用owner/editor/viewer、WS、既存原本と生成ファイルの場所を出力します。共通パスワードは`local-editing-password-123`です。`/signin`から通常の認証を使います。

1. Drive設定から連携を開始し、ローカル同意画面でdrive.file・refresh tokenと連携先を選ぶ。取消・不足scope・refresh token無しは設定画面の拒否案内を確認する。Googleサインイン方法とDrive連携は別に操作する。
2. 保存先を明示選択または新規作成し、自動バックアップを保存する。既存原本へ遡及しない案内、WS原本はアップロード本人のDriveを使う案内を確認する。
3. 原本ありノートで手動バックアップし、進捗・完了・合成ファイルリンクを確認する。リンク先は所有するfixtureのファイルで、Googleへ遷移しない。再操作で同じ原本が二重アップロードされないことを確認する。
4. `editing-files`の合成HTML/Markdown/text/image/office/PDFを実際に取り込む。バックアップ後、詳細の「Driveの元ファイルから再生成」で記録を選択し、機械変換またはAI変換を開始する。AIはローカルOpenRouter連携が必要で、PDFはDriveに拘束した用途確認を先に完了する。本文置換の確認、処理中編集lock、新本文・直前版・元に戻すを確認する。
5. 別の編集可能メンバーで同じ記録を選び、記録した本人のDriveと実行者のOpenRouterを使うことを確認する。記録した本人の解除後は本人の再連携または自分のDriveへの再保存を案内する。
6. 合成ファイルリンクのfixture操作で取得元を移動または404にし、再生成の型付き失敗と元本文の保持を確認する。未送信が証明された失敗だけ月間予約を返却し、送信済みや結果不明なら利用回数を保持する。fixture操作は製品APIへ追加されていない。
7. Drive解除の影響確認を取消・確定し、自動バックアップoff・未連携表示・生成済み本文とfixtureファイルの保持を確認する。

`local-drive/source-requests.jsonl`は製品`NodeRegenerationSourceProvider`が所有loopback HTTPへ行うmetadata/data/final-checkを記録します。取得にはバックアップの実bytes/hashと製品`NodeDriveExecution`、生成には製品の入力準備・native extractor・workerを使います。OpenRouterの用途/model/privacy条件は`integration-local/requests.jsonl`で確認できます。秘密値や本文は観測ログへ記録しません。

## PickerのSDK代替

所有するbrowser sessionで`agent-browser get cdp-url`のloopback endpointを取得し、OAuth interceptionを先に起動します。

```bash
run pnpm --filter @repo/web exec tsx scripts/driveOAuthBrowserFixture.node.ts \
  --cdp ws://127.0.0.1:PORT/devtools/browser/OWNED_ID --origin http://127.0.0.1:4327
```

interceptionは正確なGoogle OAuth origin/pathを送信前に所有HTMLへ置換し、固定loopbackの`/__fixture/drive/consent?grant=...`だけへ移動します。その他のGoogle認可URLは拒否します。ブラウザのdomain allowlistを使う場合、loopbackとaccounts.google.comだけを許可し、このinterceptionを先に用意します。実Googleリクエストは送信しません。さらにGoogle SDK/API originsを止めます。

```bash
agent-browser --session p07 network route 'https://apis.google.com/**' --abort
agent-browser --session p07 network route 'https://*.googleapis.com/**' --abort
```

製品の「保存先を選択」から専用文書へ移動した後、`apps/web/scripts/drivePickerFixture.js`を`agent-browser eval --stdin`へ渡し、「Pickerを開く」を操作します。代替SDKは既存gapi/google.pickerのcallbackへ既知folderを返すだけで、nonce・ticket・現actor・保存時再検証は製品のままです。製品CSP・HTTP入力・設定へ検証用の許可を追加しません。SDKの実Google到達は未検証です。

## 自動・実接続契約

`run pnpm test`はunit・全5形式groupを含むNode integration・Cloudflare integrationを実行します。Drive sourceのbinding・hash・各epoch・proof・現在権限、PDF証跡の両方向流用拒否と原本保持を検証します。

`pnpm test:contract:drive:live --metadata --access-token-file /absolute/dedicated/access-token.txt --folder-id <explicit-folder>`は製品`NodeDriveFolderProvider`/HTTP/executionで専用フォルダのmetadataを読み取る明示実接続コマンドです。承認済みdrive.file access tokenを所有者の700 directory/600 regular fileへ用意して実行します。出力は観測のkindと未実行操作のみで、token・folder名・provider生responseは出しません。生成・作成・backup・再生成は行いません。通常suiteとbrowser harnessから起動しません。P07ではこの実接続コマンドを実行しません。
