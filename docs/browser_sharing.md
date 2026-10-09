# プロフィール・共有・公開検索のローカル確認

`pnpm test:browser:sharing` は、実製品の Node HTTP/RSC を新規ローカルデータで起動する。外部の認証・メール・Drive・LLMへ接続しない。プロフィール、共有設定、公開HTML、公開検索は製品のユースケースとハンドラーを使う。

別の新規checkoutで、Node 22.22.3 を固定した Nix shell から実行する。既存の秘密環境変数や `.env` をコピーしない。`TMPDIR` は短いパスの新規永続ディレクトリを指定する。DB・objects・鍵・生成画像・受信箱は `--root` の新規永続ディレクトリに置く。

```sh
env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop
mkdir -m 700 -p "$HOME/.local/hwt/sharing-new"
export TMPDIR="$HOME/.local/hwt/sharing-new"
export TMP="$TMPDIR" TEMP="$TMPDIR"
pnpm install --frozen-lockfile
pnpm build
pnpm test:browser:sharing --root "$HOME/.local/share/hollow/sharing-new" --port 4326
```

`--root` は未作成の絶対パスでなければ起動を拒否する。実行中のcheckoutを再buildしない。終了は起動したプロセスへの SIGTERM または Ctrl-C で行い、HTTP・ローカル参照サーバー・workerの終了を待つ。

`fixture.json` は合成データのIDとローカルURLを記録する。サインインは `owner@editing.fixture.invalid`、`editor@editing.fixture.invalid`、`viewer@editing.fixture.invalid`、共通パスワード `local-editing-password-123`。owner/editor/viewer は編集fixtureワークスペースでそれぞれの権限を持つ。共有パスワードは `local-share-password`。実資格情報を入力しない。

`/settings/profile` で表示名・自己紹介・handle重複候補・アイコンを確認できる。アップロード用 PNG/JPEG/WebP は root 内 `editing-files` に生成する。個人公開ページは `/@sharing-owner`、別著者は `/@sharing-other`、0件は `/@sharing-empty`。公開WSは `/w/sharing-public-ws`、0件WSは `/w/sharing-empty-ws`。非公開WSの個別公開ノートはノートURLから閲覧でき、WSページや非公開説明は公開しない。

ノート詳細と一覧の公開状態バッジから共有パネルを開く。限定・公開ノートでは編集権限のある利用者に共有リンクが初期表示される。閲覧専用利用者には設定操作・限定トークンを出さない。公開URL `/p/…` では全利用者に編集操作を出さず、限定URL `/s/…` では認可済みeditorにだけ編集導線を出す。

`/discover` は複数の所有者・WSに同名の「共通」タグを持つ公開ノートを検索する。日本語「東京」、ASCII前方一致「cloud」、途中一致「flare」、1文字、0件、更新日の開始を含み終了を含まない境界、タグを確認できる。個人・ワークスペースの作業一覧で三表示形式と通常の並び順を選び、公開ページとの往復で端末設定が保たれ、検索条件は持ち越さないことを確認する。公開側はカード表示を使う。非公開・限定タイトルには `SECRET-` を付け、公開結果への混入を確認できる。公開検索から作業用検索への導線も確認する。

本文に含む loopback の `missing.png` 参照は製品の安全なHTML処理で除外される。ブラウザでは、安全のための表示抑止があっても本文を読めることを確認する。取得失敗後も匿名共有本文を読めることは `references.integration.test.ts` の missing.png ケースで確認する。取得失敗を合成adapterで発生させ、failed ledger と `readSharedNote` の本文保持を直接assertする。

クリップボードの直接読取ができない環境では、コピー結果表示と選択可能なreadonly URLを確認し、実URLの閲覧と対応付ける。検索エンジンへの公開や実サービスへの配送は行わない。
