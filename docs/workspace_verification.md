# ワークスペースのローカル検証

新規checkoutの固定Nix shellで、`pnpm install --frozen-lockfile` と `pnpm build` を実行する。環境変数は必要なHOME/PATH/LANGだけを継承し、既存の.envを読み込まない。検証rootと短いTMPDIRは所有するpersistent領域に新規作成する。build後にruntimeを起動し、実行中は同checkoutを再buildしない。

```sh
env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop --command sh
export TMPDIR="$HOME/.local/hwt/ws-$$"
mkdir -m 700 -p "$TMPDIR" "$HOME/.local/share/hollow/verification"
export TMP="$TMPDIR" TEMP="$TMPDIR"
node -p 'process.version + " / Unicode " + process.versions.unicode'
pnpm install --frozen-lockfile
pnpm build
export HOLLOW_WORKSPACE_ROOT="$HOME/.local/share/hollow/verification/workspace-$(date +%s)-$$"
pnpm test:browser:workspace --root "$HOLLOW_WORKSPACE_ROOT" --port 4397
```

rootは起動時に未存在であることが必要。新規DB・object store・鍵・mailboxを使い、`fixture.json` に専用originと合成owner/editor/viewerのアカウント、ワークスペース・ノートのIDを保存する。owner/editor/viewer の共通パスワードは `local-editing-password-123`。`invitee@fixture.invalid` 宛ての保留中招待を受信箱から開き、同メールの新規登録と確認省略・辞退を操作できる。起動口は既存アカウント/編集harnessを使う。Google同意は専用loopback代替、アカウント通知と招待メールは専用STARTTLS SMTP fixtureへ実adapterで送る。メールは `http://127.0.0.1:4397/__fixture/mailbox` で確認できる。実サービスへの配送は行わない。

通常の製品UIから、作成・識別名重複候補・scope切替、owner/editor/viewerのメンバー設定、招待の参加/辞退/再送/取消、脱退前の個人移動、アイコンと公開ページの公開/撤回/スラッグ変更、名前入力による削除を確認する。匿名browserでは公開ノートのみ・タグ/検索・メンバー非表示を確認し、失権後の通常URLは個人への案内を確認する。秘密tokenは製品が継続selectorへ置き換える既存境界を使う。

ブラウザ操作には `agent-browser` を使い、専用sessionだけを閉じる。終了時はこのharnessの起動processへSIGTERMを送り、runtimeのdrainがSMTPとreference fixtureを閉じるのを待つ。再検証は新しいrootで行う。全suiteは通常 `pnpm test`、実SMTPの専用手順は `docs/invitation_smtp_contract.md` を参照する。
