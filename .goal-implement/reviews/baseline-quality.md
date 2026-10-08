# main の品質検証

対象 commit: `ac0894acb78be85f8b10c3c7450fbb00a8c40561`。

最終結果の確認実時刻は `2026-10-07T16:51:53+00:00`。各コマンドの開始・終了の絶対時刻は採取していない。Vitest の `Start at` は時刻のみでタイムゾーンを含まないため ISO8601 へ推測補完していない。所要秒は実行スクリプトで採取した。

2026-10-08（利用者の Asia/Tokyo の日付）に commit の `git archive` を新規 checkout へ展開し、公開コードから検証した。実装の変更・修正は行っていない。秘密 `.env`、旧 DB・objects・D01・旧実行環境は使用していない。外部依存はローカルの契約検証のみで、実サービスへ接続していない。

## 項目の判定

| ID | 動作 | 合否 | 今回のコマンドと結果 |
| --- | --- | --- | --- |
| QA-BUILD | 動く | pass | `pnpm build` exit 0（22.6秒）。新規 DB migration exit 0。生成したアプリを Node 22.22.3 / Unicode 16.0 の `pnpm start` で起動。`http://127.0.0.1:43189/` を Python `urllib.request` で取得して HTTP 200、Hollow と HTML 本文を観測。確認後の SIGTERM による wrapper exit -15 は手動停止 |
| QA-TYPECHECK | 動く | pass | 標準 postinstall と同じ `pnpm --filter @repo/web cf:types` exit 0 の後、`pnpm typecheck` exit 0（7.0秒）。root・core・web・Pulumi・AWS 成功 |
| QA-LINT | 動く | pass | `pnpm lint` exit 0（5.6秒、1186 files、346 warnings / 78 infos）。`pnpm format:check` exit 0（4.3秒、1200 files）。修正なし |
| QA-TEST | 部分的に動く | fail | 適合 runtime の `pnpm test` は unit で exit 1。171 files: 6 failed / 165 passed。2476 tests: 37 failed / 2436 passed / 3 skipped、unhandled 2。`pnpm test:integration` も exit 1（131.4秒）：105 files: 36 failed / 68 passed / 1 skipped、1290 tests: 324 failed / 813 passed / 153 skipped、unhandled 1。`pnpm test:integration:cf` は 10 files / 70 tests 全 pass、exit 0 |

## 設定不足と実行環境の切り分け

- `pnpm install --offline --frozen-lockfile --ignore-scripts` は exit 0（5秒）。最初の typecheck は worker 型の未生成により exit 2。公開 package の postinstall にある `wrangler types` を `pnpm --filter @repo/web cf:types` で実行し、再検証した最終 typecheck は exit 0。
- 最初の `pnpm test` は Node 24.15.0 で 40 failures。Drive S3 の専用 root / synthetic 鍵が不足し、process-owner test は Node 22 を要求した。設定を補った Node 22.23.3 は Unicode 17.0 でタグ正規化の要求 16.0 に合わず 36 failures。公開 `flake.nix` の Node 22 とタグ正規化の 16.0 に合う Node 22.22.3 を選び、全新規 unit root で最終結果を取った。
- 適合 runtime でも sourcePreparer 27 件、imagePreparer 3 件、pdfPagesRenderer 2 件、runtimeOwnership 3 件が失敗した。runtimeOwnership では `version: 2 / leased-text-v1` を期待し、実際は `version: 3 / leased-local-v2`。backupSource と ZIP names は各 1 件 timeout。失敗の原因を製品の動作不良と断定せず、QA-TEST の未完了条件として残す。
- unit failure により `pnpm test` の後続 integration は実行されない。`pnpm test:integration` を別途実行した。最初の Node 22.23.3 の結果は 105 files: 36 failed / 68 passed / 1 skipped、1290 tests: 326 failed / 811 passed / 153 skipped、unhandled 1、exit 1（181.4秒）。Unicode 不一致のほか、`accounts` 6 列に 5 values の fixture、migration 数 32 期待 / 44 実際、固定 fixture root の多重実行が失敗していた。Node 22.22.3 と全新規 integration root の最終 1 回も exit 1（131.4秒）：105 files: 36 failed / 68 passed / 1 skipped、1290 tests: 324 failed / 813 passed / 153 skipped、unhandled 1。Unicode 由来の 2 件は解消した。`accounts` fixture、migration count、固定 root の並行実行、`S3_FIXTURE_FACTORY_WIRING`、`DRIVE_BACKUP_FIXTURE_PORT` 等は残った。

## 残る検証範囲

QA-TEST は fail のため done にできない。実行した Node integration には 153 skipped があり、`HOLLOW_S4_GROUP=app` のみを選択したため、ほかの local-format native group は実行していない。資格情報の不足と実サービス未接続は別の検証段階として残す。今回の unit / Node integration の不合格には、公開テストの fixture・期待値の不整合と環境依存が含まれる。失敗数をシナリオの製品不動の数へ置き換えない。修正は行わず、この結果を残りのフェーズ検討に渡す。

## 検証環境とログ

新規 checkout と生成物・ログは `.goal-implement/reviews/` の外に置いた。

- root: `/private/var/folders/l_/pptqtzd976329fq6qp57cgh40000gn/T/hollow-baseline-quality-20261008-nwv5v150`
- checkout: root の `checkout/`。秘密 `.env` は含まない。
- logs: root の `logs/` に `build.log`、`typecheck.log`、`lint.log`、`format.log`、`test.log`、`integration.log`、`cf.log`、`start-final.log` とコマンドの exit / 所要秒を含む JSON。
- runtime: root の `runtime/` に今回の DB・objects・mailbox・テストごとの新規 root。
- Drive S3 unit が要求する prefix の新規 root: `/Users/hikaru/.local/share/hollow/verification/p5c1-s3-baseline-quality-final-20261008-` で始まる今回作成したディレクトリ。synthetic 鍵のみ。

PATH / HOME / TMPDIR / PNPM_HOME 以外の継承環境変数を落とし、DB・storage・mailbox を今回の新規パスへ明示した。正常起動と最終 unit / CF の runtime は `/nix/store/k1yy2d1h7pvpac7m14vmaw23j529fpza-nodejs-22.22.3/bin/node`（`node -p` で v22.22.3 / Unicode 16.0 を確認）。Google / OpenRouter / Drive の本番設定を渡していない。
