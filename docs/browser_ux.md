# 非音声の統合・体験確認

`pnpm test:browser:ux` は製品HTTP/RSCとnative workersを、新規DB・objects・鍵・合成アカウントで起動します。個人とワークスペース、整理・共有・処理履歴・退会のfixtureを組み合わせ、通信先を所有loopbackに限定します。音声・実外部サービス・配送・課金は対象外です。

```sh
env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop
mkdir -m 700 -p "$HOME/.local/hwt/ux-new"
export TMPDIR="$HOME/.local/hwt/ux-new"
export TMP="$TMPDIR" TEMP="$TMPDIR"
pnpm install --frozen-lockfile
node -p 'process.version + " Unicode " + process.versions.unicode'
pnpm exec node -v
pnpm typecheck && pnpm lint:fix && pnpm format
pnpm lint && pnpm format:check && pnpm build
pnpm test:browser:ux --root "$HOME/.local/share/hollow/ux-new" --port 4341 \
  --pdf-python /absolute/path/to/python3 \
  --pdf-chrome /absolute/path/to/chrome-headless-shell \
  --pdf-body-font /absolute/path/to/body-font.otf \
  --pdf-code-font /absolute/path/to/code-font.otf
```

checkout、runtime root、短いpersistent TMPDIRは毎回新規にします。Node22.22.3/Unicode16.0とpnpm実行Nodeを確認し、稼働checkoutを再buildしません。PDF配備の条件は [書き出し](browser_export.md)、native資格情報と退会の構成は [退会](browser_retirement.md) に従います。

`fixture.json` に編集ノート、整理の状態別ノート、公開・限定URL、ワークスペース、生成ファイルを記録します。合成アカウントは `owner@editing.fixture.invalid` / `editor@editing.fixture.invalid` / `viewer@editing.fixture.invalid`、共通パスワードは `local-editing-password-123` です。整理fixtureは共有fixtureのプロフィールを保持します。`editing-files/ux-long-refs.html` は長い参照URLと隔離本文内の表・preを含む再現用ファイルです。

| 要件 | 確認する操作と結果 |
|---|---|
| 現在位置 | 保存先から個人/WSを選び、一覧・詳細・編集・upload・タグ・ゴミ箱へ移動する。所属名と編集/閲覧権限、戻るURLを確認する。アカウント設定とWS設定を区別する。 |
| 状態 | 保存済み・変換中・要連携・失敗・取消を一覧と詳細で確認する。非公開/限定公開/公開、パスワード有無、閲覧範囲の説明を確認する。 |
| キーボード | Tab/Shift+TabとEnter/Spaceでメニュー、保存先、一覧、編集、共有、タグ、書出し、履歴へ到達する。検索は表示ボタンと⌘K/Ctrl+K、ダイアログは取消/Escapeから戻る。 |
| 視覚導線 | 一覧の新規/upload/検索/絞込/並替/選択、詳細の編集/履歴/共有/移動/削除/原本/参照/再生成/書出し、アカウントの設定/連携/容量/退会、WSのメンバー/公開/削除に表示された入口を使う。 |
| 読む画面 | 本文を隔離iframeで読み、見出し・表・長文を確認する。編集や共有・書出しの操作が本文から分離されていることを認証・公開・限定画面で確認する。 |
| モバイル | 375pxと320pxで一覧3layout、詳細/編集3mode、upload、履歴、設定、タグ、ゴミ箱、公開検索/profile/WS/public/限定/password画面を操作する。メニュー・ダイアログ・長いURLを展開後、ページ全体のscrollWidthがviewportを超えないことを確認する。本文iframe内の表やpreの横スクロールはページ全体のはみ出しと区別する。 |
| 日本語 | 入口・操作・確認・状態・エラー・空画面・見つからない画面の日本語を確認する。利用者本文、ファイル名、モデル名、標準形式名は内容として区別する。 |

未連携からの取り込み・初回本文生成と公開希望、native処理の取消・退会は [処理履歴](browser_jobs.md) / [外部連携](browser_integration.md) / [退会](browser_retirement.md) の同じ公開操作を使います。完了済み機能の正常・異常根拠は対応するrepository integrationと各フェーズの独立報告に関連付けます。

停止は自己actual server PIDへSIGTERM/SIGINTを送り、native drain/harness exit0と全自己worker/provider/reference/listener/browserの終了を待ちます。外部資格情報や秘密envは使いません。

ブラウザは専用session、明示した空のconfig、固定したChromeを使います。agent-browser 0.38.2の `skills get core --full` に記載の `--allowed-domains` はworkerへbootstrap wrapperを挿入するため、製品CSPと組み合わせると編集workerが起動できません。CSPを変えず、次の拒否proxyを別端末で起動します。このproxyはHTTP/CONNECTを403にし、DNS・外部接続・転送を行いません。Chrome既定のloopback bypassで製品とworkerだけへ接続できます。

```sh
pnpm --filter @repo/web exec tsx scripts/ux-browser-proxy.node.ts --port 4350
printf '{}' > "$TMPDIR/ux-browser-config.json"
env -i HOME="$HOME" PATH="$PATH" LANG=ja_JP.UTF-8 TMPDIR="$TMPDIR" \
  agent-browser --session hollow-ux-new --config "$TMPDIR/ux-browser-config.json" \
  --executable-path /absolute/path/to/chrome-headless-shell \
  --args '--proxy-server=http://127.0.0.1:4350' open http://127.0.0.1:4341/signin
```

以後のCLI操作にも同じsession/config/executable/proxy引数を付け、UAで実バージョンを確認します。既知fixtureのloopback URLだけを操作します。確認後はそのsessionを `close` してから、proxyが出力した自己PIDへSIGTERMを送り、終了とport閉鎖を確認します。
