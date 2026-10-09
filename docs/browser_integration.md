# 非音声の外部連携・取り込みのブラウザ検証

`pnpm test:browser:integration`は実製品のNode HTTP/RSCを起動し、Google認証・メール・OpenRouter・Google Drive・参照配布元を専用ローカルfixtureへ差し替えます。OpenRouterの生成には製品の`NodeLlmGenerator`、入力準備・所有・実行・ワーカーを使い、HTTP送信先だけを所有するloopback listenerに限定します。音声と実サービスへの接続・配送・課金は検証しません。

## 起動

新しいチェックアウトと、存在しないruntime directoryを使います。DB・原本・鍵・参照ファイル・送信観測は指定したpersistent directoryに保存します。`TMPDIR`もOS一時領域ではない短いpersistent pathにします。

```bash
verification_parent="$HOME/.local/share/hollow/verification/p06-$(date +%s)"
source_checkout="$verification_parent/checkout"
short_tmp="$HOME/.local/hwt/p06-$(date +%s)"
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
run pnpm install --frozen-lockfile
run pnpm typecheck
run pnpm lint:fix
run pnpm format
run pnpm lint
run pnpm format:check
run pnpm build
run pnpm test:browser:integration --root "$verification_parent/runtime" --port 4326
```

Nodeは22.22.3、Unicodeは16.0です。稼働中のチェックアウトを再ビルドしません。終了はこの起動コマンドへSIGINTを送り、listener・worker・接続の終了を待ちます。

## ローカル操作

`runtime/fixture.json`にorigin、編集用アカウント、workspace、生成ファイル、連携待ちノートと保持確認用ノートを出力します。共通パスワードは`local-editing-password-123`です。

| アカウント | 初期状態 |
| --- | --- |
| `owner@editing.fixture.invalid` | 個人に連携待ち画像、編集可能WSとページング確認用51WS、Drive連携済み |
| `editor@editing.fixture.invalid` | 編集fixtureのeditor、別WSのowner、Drive再連携が必要 |
| `viewer@editing.fixture.invalid` | 編集fixtureのviewer、個人には連携待ちなし、Drive未連携 |

1. 取り込み画面で保存先を選び、ファイル選択後にも切り替える。viewerのWSが候補に出ず、選択済みファイルが保持され、受付したノートが選択した保存先に現れることを確認する
2. 取り込み画面からOpenRouter設定へ移動して連携する。ローカル同意画面で`success`を選ぶと、現在の利用者の連携が製品callbackを通じて成立する。元の取り込み画面への導線、初回の連携待ち件数とノート導線、ゼロ件と再連携では案内を出さないことを確認する
3. 文章・画像モデルをv2へ保存し、`integration-files/text.txt`と`editing-files/media.png`を実際に取り込む。本文と履歴を確認する。`integration-local/requests.jsonl`で実ワーカーから届いた用途・modelと`deny/false/true`のprivacy条件を観測する。本文・credential・追加指示はこの観測ファイルへ記録しない
4. `fixture/retired`を選び、次の文章取り込みで型付き失敗・原本保持・モデル設定への導線を確認する
5. `integration-files/slow.txt`を取り込み、処理中に再連携の取消と成功、解除を操作する。成功した再連携または解除だけが旧処理を取り消す。`closures.jsonl`の`completed:false`は所有するHTTP接続が応答完了前に閉じた観測であり、実providerでの料金取消を意味しない
6. アカウントメニューの外部連携で未連携・連携済み・再連携必要、日時と最終利用、設定・履歴への導線を確認する。OpenRouterの既知本人情報は`creator_user_id`として表示する
7. 使用状況で個人と全編集WS、viewer除外、active note件数、ゴミ箱を含む容量とUTC月のAI使用量を確認する。51WSは3人の所有者が通常の作成上限内で作成し、既存UoWでownerの利用者をeditorとして参加させる。80%超と上限の2WSは有効な未送信の受付予約だけで容量を使用し、DB/objectsの直書きや容量上限の変更はしない。満杯WSで新しい小ファイルの受付拒否を確認する
8. `integration-files/references.html`と`references.md`を取り込む。専用reference originの`/image.png`・`/video.mp4`・`/style.css`と404画像を記述した合成原本である。参照一覧で永続件数・状態・理由・URL、保存後の本文・CSSを確認する。editor/viewerで同じノートの参照一覧を確認する

同意画面の`reject`はコード交換拒否、`invalid`は候補の鍵拒否、`catalog-unavailable`は既定候補へのfallback、`expire-soon`は20秒後の連携期限切れを再現します。再取得は製品UIの操作です。fixtureの状態は新しい起動ごとに作り直します。

## 自動検証

```bash
run pnpm test
```

通常suiteはunit・全5形式groupを含むNode integration・Cloudflare integrationを実行します。取消/期限切れcallback、再連携成功前の旧状態保持、帰還先の現在権限、モデル設定と保存本文の独立性、未開始/stream中の失権、参照履歴のviewer読取・除名後拒否はrepository/HTTP integrationで検証します。実adapterのloopback契約は既存OpenRouter HTTP・LLM generator・executionのsuiteに含みます。

## 明示的な実adapter契約

`pnpm test:contract:openrouter:live --metadata --key-file /absolute/dedicated/key.txt`は製品`NodeOpenRouterProvider`の鍵metadataとモデルcatalogを実接続で確認する専用コマンドです。承認済みの専用資格情報を所有者の700 directory/600 regular fileへ用意してから明示的に実行します。秘密値・生provider responseを出力せず、期限・本人識別情報の有無・モデル件数だけを出力します。交換・生成・料金・認識品質は検証しません。通常suiteやbrowser harnessはこのコマンドを起動しません。

P06の実接続契約は未実行です。ローカル代替の合格は、実サービス到達・実providerモデル提供・メール配送・実費用取消の証明にはなりません。IN-01/IN-02の音声条件は後続フェーズに残ります。
