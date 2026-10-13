# 音声の取り込みと再生成

`pnpm test:browser:audio`は新しいDB・objects・鍵・合成アカウントで製品HTTP/RSCと実FFmpeg/native workerを起動します。STTと本文構造化の送信先は所有loopback providerです。Driveも既存のローカルOAuth・Picker・バックアップ・実取得fixtureへ接続します。合成文字起こしの結果は、実サービスの日本語認識品質の評価には使えません。

## 起動

毎回新しいcheckout・runtime root・短いpersistent TMPDIRを用意します。Node22.22.3/Unicode16.0・pnpmの実行Node・FFmpeg/ffprobe8.0.1を確認します。工具設定は所有者だけが読める通常ファイルに置き、親ディレクトリを700、ファイルを600にします。

```sh
env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop
mkdir -m 700 -p "$HOME/.local/hwt/audio-new"
export TMPDIR="$HOME/.local/hwt/audio-new"
export TMP="$TMPDIR" TEMP="$TMPDIR"
pnpm install --frozen-lockfile
node -p 'process.version + " Unicode " + process.versions.unicode'
pnpm exec node -v
ffmpeg -version
ffprobe -version
mkdir -m 700 "$HOME/.local/share/hollow/audio-tools-new"
python3 -I -S -c 'import json,os,shutil,sys; fd=os.open(sys.argv[1],os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600); os.write(fd,json.dumps({"version":1,"ffmpegPath":shutil.which("ffmpeg"),"ffprobePath":shutil.which("ffprobe"),"pythonPath":shutil.which("python3")}).encode()); os.close(fd)' \
  "$HOME/.local/share/hollow/audio-tools-new/tools.json"
pnpm typecheck && pnpm lint:fix && pnpm format
pnpm lint && pnpm format:check && pnpm build
pnpm test:browser:audio --root "$HOME/.local/share/hollow/audio-runtime-new" --port 4341 \
  --audio-tools "$HOME/.local/share/hollow/audio-tools-new/tools.json"
```

製品のNode配備では同じ設定ファイルを`HOLLOW_AUDIO_TOOLS_FILE`に指定します。指定がない配備は音声を要連携の状態で保持し、音声の生成受付を拒否します。非音声の変換は独立しています。稼働中のcheckoutを再buildしません。

固定Chrome144・空config・各CLI共通の拒否proxy引数は[体験確認のブラウザ起動](browser_ux.md)に従います。実Google/OpenRouterなどのURLを操作せず、既知fixtureのloopbackだけを使います。

## 操作と観測

`fixture.json`と`editing-files/`に合成ノート・保存先・WAV/MP3/M4A/Ogg/FLACを用意します。合成アカウントは`owner@editing.fixture.invalid`、共通パスワードは`local-editing-password-123`です。

| 条件 | 操作と結果 |
|---|---|
| 未連携・LLM不使用 | 音声を取り込み、要連携と明示的なLLM不使用の失敗を区別する。原本を保持し、連携後に同じノートから初回生成する |
| モデル | OpenRouter設定と再生成で音声文字起こし用モデル・本文構造化用モデルを選ぶ。保存後の処理で選択した各モデルを使う |
| 分割 | `audio-chunks.wav`を取り込み、2区間の文字起こしから本文構造化へ進む。1ファイルの論理使用回数は1回 |
| 失敗と再試行 | `audio-retry.wav`を取り込む。provider originの`/jobs-fixture`で一時拒否の原因を解消し、履歴から同じ設定・親処理で再試行する |
| 取消と解除 | `audio-slow.wav`の文字起こし中に取消・連携解除を行う。実終了を待ち、旧本文と原本を保持する。送信結果不明の試行を自動再送しない |
| 再生成 | 既本文のモデルと追加指示を選び、置換を確認して実行する。タグ・共有URLを保持し、完了後に旧本文へ戻せる |
| 共有希望 | 未連携で希望した公開・限定公開は認定された初回本文の完成時に適用する。手動変更した共有設定を上書きしない |
| Drive・WS | 専用Driveの保存先を設定して自動バックアップを有効にし、WSへ音声を取り込む。保存した原本を実取得して再生成し、別editorの初回生成は本人の履歴で確認する |
| 限定読者 | LLM不使用の音声から初回生成を完了し、元の限定URLを匿名の専用browserで開いて本文を確認する |
| 月間上限 | 音声は次の月間枠を待つ。機械取り込みによる音声の解決案内を表示しない |
| モバイル | 375px・320pxでモデル選択、確認、進捗、エラー、履歴を操作し、ページ全体の横はみ出しがない |

`integration-local/requests.jsonl`は用途別モデル・区間のサイズ・privacy wire・時刻だけを記録します。STTは`data_collection=deny/zdr=true`、本文構造化は`data_collection=deny/allow_fallbacks=false/require_parameters=true`です。STTのfallback禁止は保証しません。

DriveのOAuth interceptionとPicker SDK代替は[Driveブラウザ手順](browser_drive.md)の専用scriptを使います。browser自体は上記の固定Chrome144・空config・拒否proxyを維持し、allowed-domainsは指定しません。正確なGoogle OAuth URLは送信前にowned consentへ置換し、その他の外部要求を送信しません。

## 処理上限と停止

原本は200MiBまで、全区間を16kHz PCM16 WAVへ変換します。区間は120秒・8MiB以下、最大512区間、全PCMは2GiB以下です。上限超過・破損・複数トラック・未対応codecは明示的に失敗し、無言の切り詰めや部分本文の成功に置き換えません。

工具とRSS監視プロセスを同時に予約し、既存native上限2を共有します。DarwinではCPU・時間・ファイル制限とlibproc RSS監視512MiBを使います。RSS監視は瞬間的なpeakの保証ではありません。監視の準備・初回測定が失敗した場合は工具を開始しません。両子プロセスの終了とpipe閉鎖が確認できるまで予約を解放しません。

終了時は専用browserを閉じ、自己actual server PIDへSIGTERMを送り、native drainとharness exit0を待ちます。自己proxy・provider・worker・全listenerの終了を確認します。終了未確認やexit1/130/143は正常停止の証拠にしません。
