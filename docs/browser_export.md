# 書き出しのローカル確認

`pnpm test:browser:export` は新規DB・objects・鍵と合成アカウントを使い、製品のHTTP/RSCとZIP workerを起動する。Googleや外部サービスへ接続しない。旧データや保全資料の配備は使わない。

新規checkoutの固定Nix環境で、秘密環境変数や `.env` をコピーせず実行する。

```sh
env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop
mkdir -m 700 -p "$HOME/.local/hwt/export-new"
export TMPDIR="$HOME/.local/hwt/export-new"
export TMP="$TMPDIR" TEMP="$TMPDIR"
pnpm install --frozen-lockfile
pnpm build
pnpm test:browser:export --root "$HOME/.local/share/hollow/export-new" --port 4328
```

`--root` は未作成の絶対パスを指定する。設定と生成物はこのrootだけに保存する。

起動後の `fixture.json` にノートIDと公開・限定URLを記録する。サインインは `owner@editing.fixture.invalid`、`editor@editing.fixture.invalid`、`viewer@editing.fixture.invalid`、共通パスワード `local-editing-password-123`。共有パスワードは `local-share-password`。ノート詳細の書き出しからHTML・Markdownのダウンロードと印刷、一覧の複数選択からZIP、処理履歴から再ダウンロード・取消を操作できる。公開・限定・パスワード通過後の画面も匿名でHTML・Markdownを取得し、印刷用の表示を開ける。印刷はブラウザーの印刷で行い、サーバーはPDFを生成しない。

実行中のcheckoutを再buildしない。自分が起動したserverへSIGTERMまたはSIGINTを送り、worker・ローカル参照サーバーのnative終了を待つ。実Google、実配送、実外部providerの契約はこの起動口で検証しない。
