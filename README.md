# Hollow

さまざまな形式のファイルを HTML に変換し、保存・編集・整理・共有するサービス。

メール登録・確認・サインインと、個人用の白紙ノート作成・HTML 編集・保存を Node ランタイムで利用できる。要件の入口は [spec/index.md](./spec/index.md)、実装の進捗は [.goal-implement/plan.md](./.goal-implement/plan.md) にある。

## ローカル起動

Node.js 22.12 以上と pnpm 11.1.2 を使う。リポジトリのルートから実行する。

```sh
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm db:generate:node
pnpm db:migrate:node
pnpm dev
```

`http://localhost:3000` を開く。`.env` は既存ファイルを上書きせず、必要な値だけ設定する。Node の dev / production entry は `apps/web/.env` を読み込む。`APP_URL` はブラウザで開く origin と一致させる。

確認メールは `apps/web/data/mailbox/` の JSON ファイルに保存される。ファイルの `text` にあるリンクを登録したブラウザーで開き、「メールアドレスを確認」を押す。メールは外部へ送信されない。別ブラウザーで確認した場合は、確認後にパスワードでサインインする。

原本・メディアの取り込み、Google / OpenRouter / Drive、共有・ワークスペース、パスワード再設定は後続フェーズで実装する。現在のローカルメール確認は実メール配送の検証には含まない。

## ビルドと検証

```sh
pnpm typecheck
pnpm lint:fix
pnpm format
pnpm test:unit
pnpm test:integration:node
pnpm build
pnpm start
```

`pnpm start` はビルド済みアプリを起動する。DB は `apps/web/data/app.db` に永続化される。同じ DB に接続する Node アプリは一プロセスだけ起動する。

詳しい設定・メール確認・データ管理は [Hollow のローカル実行](docs/hollow_local.md) を参照する。
