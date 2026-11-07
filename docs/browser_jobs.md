# 処理と非音声取り込みのローカル確認

`pnpm test:browser:jobs` は新しいDB・objects・鍵で実製品HTTP/RSC、取り込み・再生成・参照・Drive・ZIPのworkerを起動します。既存のaccount/editing/sharing/integration/export fixtureを再利用し、認証・メール・OpenRouter・Drive・参照配布元を専用の合成ローカルadapterに差し替えます。実サービスへの通信・配送・課金、音声は対象外です。

```sh
env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop
mkdir -m 700 -p "$HOME/.local/hwt/jobs-new"
export TMPDIR="$HOME/.local/hwt/jobs-new"
export TMP="$TMPDIR" TEMP="$TMPDIR"
pnpm install --frozen-lockfile
pnpm build
pnpm test:browser:jobs --root "$HOME/.local/share/hollow/jobs-new" --port 4329
```

チェックアウトとruntime root、短いpersistent TMPDIRは毎回新規にします。`--root` は未作成の絶対パスです。稼働中のcheckoutを再buildしません。Node22.22.3/Unicode16.0とpnpmの実行Nodeを確認します。

`fixture.json` に合成アカウント・ノート・workspace・公開URL・ファイルの所在を記録します。owner/editor/viewerのメールは `owner@editing.fixture.invalid` / `editor@editing.fixture.invalid` / `viewer@editing.fixture.invalid`、共通passwordは `local-editing-password-123`。OpenRouterの連携は設定からローカル同意画面へ進みます。生成の送信先だけをowned loopbackへ置換し、製品generator/source/native worker/privacy/所有・閉鎖を使います。

1. `/notes/import` の保存先、変換成功後の公開状態、AI使用、参照取得を選び、HTML/Markdown/text/Word/Excel/PowerPoint/文字PDF/画像PDF/画像の合成ファイルをアップロードします。公開には個人handleまたはworkspace slugが必要です。変換成功まで非公開のまま、失敗・取消・要AI連携は原本を保持します。
2. `jobs-fast.txt` と `jobs-retry-a.txt` / `jobs-retry-b.txt` をAI ONで同時に選びます。合成providerはretry用だけ一時的に拒否します。`/__fixture/jobs` の通常フォームで原因を解消してから、処理履歴の「失敗分を再試行」を使います。失敗分の再試行は元の親と保存済みモデル・追加指示・希望公開状態を保ちます。これはfixture middleware専用の操作で、製品のHTTP/API/DI設定には追加しません。
3. `jobs-slow-a.txt` / `jobs-slow-b.txt` / `jobs-slow-c.txt` は合成providerが30秒だけ遅延します。ticker・履歴の待機/実行中、離脱・再訪、確認取消、完了通知を確認します。providerの有限delayは製品deadlineの緩和ではありません。
4. `/notes/jobs` の横断履歴は全種別を開始日時の新しい順に50件ずつ表示し、「次の50件」で続きへ進みます。行の導線から既存の種別別操作領域へ進み、親・子・状態・失敗理由・開始/所要時間・再試行/取り込み直しを確認します。別アカウントには実行者の履歴を表示しません。ZIPは [書き出し](browser_export.md) の操作で生成でき、保持期限と再実行を履歴に表示します。
5. 未連携で画像を限定または公開希望で取り込み、本文なしの元ノートを開きます。連携後、そのノートの再生成でモデル・追加指示を選び、本文置換を確認します。初回本文の完了時だけ、取り込み時の希望公開状態を適用します。手動で変更した共有設定を優先し、公開の前提が失われた場合は本文を非公開で保存して案内します。AIなしで原本を保持した失敗ノートでも同じ初回生成を確認できます。処理中の編集lock、完了後の元に戻す、title/tags/共有identity保持を確認します。既存本文の再生成は現在の共有設定を維持します。画像PDFは既存preview→確認済みready proof→LLM変換を使います。

生成wireは専用rootの `integration-local/requests.jsonl`、native connection closeは `closures.jsonl` に記録します。モデル/画像か文章か/privacy/合成markerの有無のみで、keyやraw provider responseを出力しません。HTML/CSS参照は既存owned fixtureで取得します。取得不可の記録と本文保持を確認でき、外部通信を追加しません。

終了は自分のactual server PIDへSIGINT/SIGTERMを送り、native hook/drainのexit0、worker・参照・provider・browserの終了を待ちます。結果再訪は同じ新規専用rootを使う再起動だけに限定し、既存秘密envや実provider資格情報を設定しません。アカウント退会による取消はP10、IM全体の音声条件は保留です。

正常終了後の結果再訪は、同じ専用rootの `app.db`、objects、鍵、ZIP設定と同じ `APP_URL` を明示し、`pnpm --filter @repo/web exec tsx scripts/listen.node.ts` で製品launcherを起動します。必要設定名は [Node runtime](runtime_node.md) と [ZIP](zip-dependencies.md) の既存設定契約を使います。fixtureのproviderを再起動しなくても、確定済み履歴と未期限切れ生成物を読み取れます。実providerの資格情報を追加しません。
