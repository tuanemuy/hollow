# 書き出しのローカル確認

`pnpm test:browser:export` は新規DB・objects・鍵と合成アカウントを使い、製品のHTTP/RSC、PDF worker・supervisor、ZIP workerを起動する。Googleや外部サービスへ接続しない。PDFには、通常のインストールまたはキャッシュにある Chrome headless shell の実行ファイル、その配布ディレクトリ、Python、本文とコード用のフォントが必要。旧データや保全資料の配備は使わない。

新規checkoutの固定Nix環境で、秘密環境変数や `.env` をコピーせず実行する。

```sh
env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop
mkdir -m 700 -p "$HOME/.local/hwt/export-new"
export TMPDIR="$HOME/.local/hwt/export-new"
export TMP="$TMPDIR" TEMP="$TMPDIR"
pnpm install --frozen-lockfile
pnpm build
pnpm test:browser:export --root "$HOME/.local/share/hollow/export-new" --port 4328 \
  --pdf-python /absolute/path/to/python3 \
  --pdf-chrome /absolute/path/to/chrome-headless-shell \
  --pdf-body-font /absolute/path/to/body-font.otf \
  --pdf-code-font /absolute/path/to/code-font.otf
```

`--root` は未作成の絶対パスを指定する。Chromeの配布ディレクトリとフォントをこのrootへコピーし、現在のbytes/SHA-256を製品設定へ渡す。製品の設定・固定profile・通信制限・所有確認は変更しない。匿名PDF専用のランダム鍵を新規生成し、認証・共有鍵と分ける。設定と鍵はprivate file、生成物もこのrootだけに保存する。Pythonは `fcntl.flock` と `os.waitid` の必要なフラグを実装した配備を指定する。対応環境と容量設定の詳細は [PDFのNode配備](pdf_node.md) を参照。

起動後の `fixture.json` にノートIDと公開・限定URLを記録する。サインインは `owner@editing.fixture.invalid`、`editor@editing.fixture.invalid`、`viewer@editing.fixture.invalid`、共通パスワード `local-editing-password-123`。共有パスワードは `local-share-password`。ノート詳細のダウンロードからHTML・Markdown・PDF、一覧の複数選択からZIP、処理履歴から再ダウンロード・取消を操作できる。公開・限定・パスワード通過後の画面も匿名で三形式を取得でき、匿名PDFは画面内の署名付きチケットで完結する。

実行中のcheckoutを再buildしない。自分が起動したserverへSIGTERMまたはSIGINTを送り、worker・supervisor・ローカル参照サーバーのnative終了を待つ。実Google、実配送、実外部providerの契約はこの起動口で検証しない。
