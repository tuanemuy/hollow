# worktree 棚卸し

対象 main は `ac0894acb78be85f8b10c3c7450fbb00a8c40561`。2026-10-08 に `git worktree list --porcelain` で得た `goal-implement/*` の 5 本を調査した。マージ・削除・checkout・実装変更・旧環境の起動は行っていない。

「コミット候補に渡せる」は対象を commit ID で固定できる意味であり、シナリオの完了を受け入れた意味ではない。この棚卸しでは branch 上のテスト・ブラウザ検証を実行していない。

| branch / worktree | HEAD | main との差分の要点 | 効く項目 | 完了候補としての状態 |
| --- | --- | --- | --- | --- |
| `goal-implement/p5c-drive-llm-c1-20261006` / `hollow-p5c-drive-machine-721bc7ad-20261006` | `8edbbac7c342353adf9949b8c5e6ccc2ba2aee34` | 50 実装・テストファイル、+6,033 / -243。機械再生成、Drive の HTML / Markdown を使う機械・LLM 再生成、本文の保持・取消・回復処理。machine branch の 4 コミットを含み、その後に Drive 関連 4 コミットを追加 | 主に IN-07。関連する IM-06、JB-01–03、ED-08 | clean、未追跡なし。バックエンドのコミット候補として識別可能。IN-07 全体の完了候補には不足：Drive 再生成の要求関数を `apps/web` から呼ぶ参照がない。現在 main へ統合した状態の検証も未実施 |
| `goal-implement/p5c-formats-c2a3d45f-20261006` / `hollow-p5c-formats-c2a3d45f-20261006` | `4cba22b7a62121b32bf72964cd62c15a9774c26f` | 分岐点以降の 22 ファイル +5,268 / -212 は main の `79ef126edd5d3440cde20dbe8fd372e7235010c5` に同内容統合済み。main と branch の実装差分は parser 修正を branch が持たない 2 ファイル +37 / -271 だけ | IM-01、IM-03、IM-06、JB-01–03 のローカル画像・PDF 等の LLM 入力処理 | clean、未追跡なし。新しい完了候補として持ち込む差分はない。統合済み部分は今回の main 検証の対象 |
| `goal-implement/p5c-3-s5-machine-20261006` / `hollow-p5c-machine-79ef126-20261006` | `721bc7ad2741b673db9b2ab22023b7071e283212` | 30 実装・テストファイル、+3,465 / -47。機械再生成の要求・実行・回復・取消・再試行・復元と処理履歴表示。上の Drive branch の祖先 | IN-07 と、関連する JB-01–03、ED-08。ローカル元ファイルの機械再生成は spec の独立シナリオを増やさない | clean、未追跡なし。バックエンドのコミット候補として識別可能。これ単独では Drive の再生成要求がなく IN-07 全体は完了しない。Drive branch と重複するため別々に統合する対象ではない |
| `goal-implement/p5d-c2a3d45f-20261006` / `hollow-p5d-c2a3d45f-20261006` | `516af3ba5e64f0ba1a7e3c9da697ca21d2b576f7` | 分岐点以降 100 ファイル、+30,464 / -348。退会 UI / server function、即時認可停止、唯一 owner の拒否、DB migration 0044、個人資源・資格情報・進行中ジョブの非同期回収。現在 main との実装差分は 123 ファイル +30,713 / -5,887：main に入った formats / parser 修正を branch が持たないことも含む | AC-09。退会後の SH-05–07 / DS-01、DS-04–06 / WS-05–06 などのアクセス・表示への影響も再検証対象 | clean、未追跡なし。AC-09 のコミット候補として渡せる。ただし現在 main の formats / parser と統合した状態の検証は未実施で、受け入れ済みではない |
| `goal-implement/parser-exit-c2a3d45f-20261006` / `hollow-parser-exit-c2a3d45f-20261006` | `c81862bd33e693dbf1cfb53c17c5da78248d0158` | 分岐点以降 2 ファイル +271 / -37 は main の `b6e567b` に同内容統合済み。main と branch の実装差分は formats の統合を branch が持たない 22 ファイル +212 / -5,268 だけ | IM-01–03 の parser 失敗・取消・制限、JB-03 | clean、未追跡なし。新しい完了候補として持ち込む差分はない。統合済み部分は今回の main 検証の対象 |

## コマンドと結果

- `git worktree list --porcelain` → main と表の 5 本。HEAD は表の値。
- 各 worktree で `git status --porcelain=v1 --untracked-files=all` → 全 5 本で出力なし、exit 0。ignored の private データを読んだり候補に含めたりしていない。
- 各 worktree で `git diff --check main...HEAD` → 全 5 本で出力なし、exit 0。これは空白エラーの確認で、動作検証ではない。
- `git rev-list --left-right --count main...HEAD` → Drive `1 8`、formats `3 10`、machine `1 4`、退会 `3 24`、parser `3 2`。すべて main と分岐しており fast-forward の候補ではない。
- `git merge-base main HEAD` → Drive / machine は `79ef126edd5d3440cde20dbe8fd372e7235010c5`、残り 3 本は `c2a3d45f1097533c6344346aca303dc1d2aef368`。
- `git log --oneline c2a3d45f..main` → `b6e567b fix(parser): release admission after actual worker closure`、`79ef126 feat(llm): integrate accepted local-format input lifecycle`、`ac0894a chore: checkpoint paused goal implementation progress`。
- `git diff --stat main goal-implement/p5c-formats-c2a3d45f-20261006 -- apps packages infra` → parser の 2 ファイルだけ。formats の変更 22 ファイルに現在 main との差分はない。
- `git diff main goal-implement/parser-exit-c2a3d45f-20261006 -- packages/core/src/adapters/node/import/documentExtractor.ts packages/core/src/adapters/node/import/__tests__/documentExtractor.test.ts` → 出力なし、exit 0。
- `git log --oneline goal-implement/p5c-3-s5-machine-20261006..goal-implement/p5c-drive-llm-c1-20261006` → `204482e`、`5214cf9`、`176ea15`、`8edbbac` の 4 コミット。
- `git grep -n -E 'requestDriveMachineRegeneration|requestDriveLlmRegeneration|requestMachineRegeneration' goal-implement/p5c-drive-llm-c1-20261006 -- apps/web packages/core/src/application` → application の定義と機械再試行内参照だけ。`apps/web` に参照なし。

## fresh ローカル環境の起動方法の調査

`docs/hollow_local.md`、`apps/web/package.json`、`apps/web/app/server.node.ts`、`apps/web/scripts/migrate.node.ts`、`apps/web/vite.config.node.ts` を `cat` / `sed` / `rg` で読んだ結果：

- `boot()` は cwd に `.env` があれば読む。秘密 `.env` を持たない fresh checkout の `apps/web` を cwd にする必要がある。
- `DATABASE_URL=file:<新規絶対パス>/app.db`、`APP_URL=http://127.0.0.1:<専用port>`、`HOLLOW_STORAGE_DIR=<新規絶対パス>/objects`、`HOLLOW_MAIL_MODE=local`、`HOLLOW_MAILBOX_DIR=<新規絶対パス>/mailbox` を設定する。migration は既存の SQL に対して `pnpm exec tsx scripts/migrate.node.ts` を直接実行できる。
- `pnpm dev` は `predev:node` で検索・export・PDF・LLM の worker を build する。隔離環境で `pnpm --filter @repo/web dev:node -- --host 127.0.0.1 --port <専用port>` を使う場合、script に対する引数の反映を起動出力で確認する。Vite の既定 port は 3000、host は全 interface。
- `HOLLOW_GOOGLE_CONFIG`、`HOLLOW_OPENROUTER_CONFIG`、`HOLLOW_DRIVE_CONFIG_FILE` が未設定なら実接続は有効にならない。外部依存の契約ブラウザ環境には `boot(dependencies)` の `mailer` / `authenticationFactory` / `openRouterFactory` / `llmFactory` / `driveFactory` の差替口がある。差替えた経路は契約検証として記録する。
- 招待と共有リンクの正常系は新規ローカル鍵が必要。招待は `HOLLOW_INVITATION_KEY_FILE`（32 byte、file 0600、parent 0700）、共有は `HOLLOW_SHARE_KEY_DIR` / `HOLLOW_SHARE_ACTIVE_KEY_ID` / `HOLLOW_SHARE_KEY_IDS`。PDF / ZIP は別のローカル設定が必要で、無設定のブラウザ結果を正常系の完了根拠にしてはいけない。
- メール確認・再設定・招待は今回作成した local mailbox だけを開く。ブラウザの操作と観測結果に加え、契約テストの実行コマンド・結果を残す。

この担当は起動・browser 操作・外部接続を行っていない。archive は参照していない。
