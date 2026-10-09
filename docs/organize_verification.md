# 整理のローカル検証

新規checkoutの固定Nix shellを使う。既存の.envはコピーせず、HOME/PATH/LANGだけを継承する。DB・objects・鍵・原本・ローカルDriveの保存先は新しいpersistent rootに置く。

```sh
env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop --command sh
export TMPDIR="$HOME/.local/hwt/or-$$"
mkdir -m 700 -p "$TMPDIR" "$HOME/.local/share/hollow/verification"
export TMP="$TMPDIR" TEMP="$TMPDIR"
node -p 'process.version + " / Unicode " + process.versions.unicode'
pnpm install --frozen-lockfile
pnpm build
export HOLLOW_ORGANIZE_ROOT="$HOME/.local/share/hollow/verification/organize-$(date +%s)-$$"
pnpm test:browser:organize --root "$HOLLOW_ORGANIZE_ROOT" --port 4404
```

起動rootは未存在であること。ビルド後にruntimeを起動し、そのcheckoutは稼働中に再ビルドしない。合成owner/editor/viewerのアカウント、ワークスペース、56件の一覧用ノート、月境界のノート、長い本文、同名タグ、HTML/Markdown原本と変換状態は`fixture.json`に記録される。アカウントは`owner@editing.fixture.invalid`、`editor@editing.fixture.invalid`、`viewer@editing.fixture.invalid`、共通パスワードは`local-editing-password-123`。

`organize.states.processing`のノートは既存applicationのジョブclaimを使って処理中に保つ。起動前のseedから90秒後に実際の原本を変換するため、サインイン後すぐに開き、実行段階と既存pollによる本文への自動切替を確認する。`failed`は安全なローカル失敗理由を持ち、製品の再試行から実際のHTML原本を変換できる。`needs_ai`は実際の画像原本を保持し、外部LLMへの送信は行わない。

製品のUIからタイル/リスト/カレンダー、月・タイムゾーン、6方向の並び順、検索パレット、タグの付与・除去・リネーム・統合・削除、複数選択と一括操作、詳細・目次・原本ダウンロード、保存先移動を操作する。表示済み選択と検索条件全体の固定選択を区別し、viewerでは変更操作が出ないことも確認する。

作成月は年月を最後まで入力して「適用」で絞り込む。入力途中ではURLを変えず、URL・scope・他の条件が変わると入力を現在の条件へ揃える。ZIPはこの起動口が専用rootに標準設定ファイルを生成し、HTML/Markdownの実成果物を作る。PDF rendererや実サービスは接続しない。

一括公開は合成ownerのhandleを使ったloopback内の公開ページで確認する。Driveは既存trusted DIへ専用rootに閉じたMap providerを注入し、製品のNodeDriveExecutionとNodeDriveBackupSourceで実原本の読取・hash照合・chunk送信・終了待ちを行う。生成ファイルはroot内の`local-drive`に保存する。実Google Driveへの認証・配送・公開は未検証であり、この起動口は実サービスを接続しない。

ブラウザは`agent-browser`の専用sessionを使い、終了時に自分のsessionだけを閉じる。起動processへSIGTERMを送り、runtimeとローカル参照fixture、所有する処理の終了を待つ。再検証は新rootで行う。通常suiteは`pnpm test`で実行する。
