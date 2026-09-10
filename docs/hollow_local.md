# Hollow のローカル実行

## 環境変数

`apps/web/.env` に設定する。

| 名前 | 値・用途 |
| --- | --- |
| `DATABASE_URL` | `file:./data/app.db`。web パッケージを基準とする SQLite ファイル |
| `APP_URL` | `http://localhost:3000`。確認リンクと書き込みの Origin 照合に使う |
| `HOLLOW_MAIL_MODE` | `local` でローカル mailbox を明示的に有効化する |
| `HOLLOW_MAILBOX_DIR` | `data/mailbox`。公開ディレクトリ外のメール保存先 |
| `PORT` | production server のポート。既定は `3000` |
| `HOSTNAME` | production server の bind address。既定は `0.0.0.0` |

メールモードが未設定の場合、メール送信は失敗する。本番メールアダプターの設定と実配送の検証は未完了。

## DB 初期化と再実行

```sh
pnpm db:generate:node
pnpm db:migrate:node
pnpm dev
```

migration は再実行できる。Node 用 schema は `packages/core/src/adapters/libsql/schema.ts`。テンプレートの共通表に `hollowSchema.ts` の認証・ノート表を追加する。生成 SQL は `packages/core/src/adapters/libsql/migrations/` に保存する。

`pnpm build && pnpm start` で production build を実行する。dev と production を同じ DB に同時接続しない。再起動してもアカウント、セッション、ノートは保持される。

## メール確認

1. `/signup` でメールアドレスと、英字・数字または記号を含む12〜128文字のパスワードを入力する。
2. 利用規約を確認して同意し、登録する。
3. `apps/web/data/mailbox/` に作成された JSON の `to` を確認し、`text` のリンクを開く。
4. 確認画面のボタンを押す。同じブラウザーではサインインし、別ブラウザーではサインインの導線を表示する。

確認リンクは24時間有効で、1回だけ使用できる。再送には60秒の間隔を設け、再送後の古いリンクは無効になる。登録済みアドレスにも画面では同じ送信案内を表示する。ローカル mailbox は OS 上のファイルとしてのみ公開し、HTTP から取得する経路を持たない。

DB に保存するパスワードは scrypt hash、セッション・確認リンク・確認ブラウザーの token は SHA-256 hash。セッション cookie は HttpOnly / SameSite=Lax、HTTPS origin では Secure を付ける。有効期限は発行から30日で延長しない。認証失敗はアドレスごとに段階的な待機を設け、8回目の連続失敗で15分の lockout にする。

mailbox ファイルには確認リンクが含まれる。共有しない。メールや DB を削除するとローカル検証データは失われる。

## ノートと編集

一覧の「新規作成」で WYSIWYG エディタが開く。無入力で離れてもノートを作らない。タイトルまたは本文を入力すると自動保存し、明示保存もできる。既存ノートは HTML エディタで編集できる。

本文は800 KB、タイトルは200文字まで。HTML はサーバーでサニタイズし、除去した要素・属性・危険な URL を保存結果に表示する。iframe の sandbox と CSP が本文の script とアプリへの CSS 干渉を防ぐ。P1 の表示では外部リソースの通信を遮断する。

保存失敗時は未保存を表示し、ブラウザーに退避する。次回の編集時に復元または破棄を選べる。同じ利用者の複数タブでは後の保存が優先され、別タブに更新を通知する。他の利用者のノートには一覧・詳細・編集のいずれからもアクセスできない。

## 検証

`pnpm test:integration:node` は migration の生成を含む。実 SQLite で登録・確認・期限・再送・lockout・二利用者の認可・サニタイズ・サイズ上限・transaction rollback・DB再接続後の永続化を検証する。

使用 API の根拠は [TanStack の認証 primitives](https://tanstack.com/start/latest/docs/framework/react/guide/authentication-server-primitives)、[Node crypto](https://nodejs.org/api/crypto.html)、[sanitize-html](https://github.com/apostrophecms/apostrophe/tree/main/packages/sanitize-html)。
