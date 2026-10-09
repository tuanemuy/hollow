# Node の単件 PDF

PDF は保存済みのノートを非同期に生成する任意構成です。未保存の編集を送信・保存しません。HTML/Markdown の即時書き出しとは別の処理枠を使います。内部アプリの本人要求と、公開・共有入口の browser-bound 要求を分離します。PDF を含む ZIP は、PDF と ZIP の両方が構成された環境で利用できます。

## 参照配備

現在の参照検証対象は macOS arm64、Node 22.22.3、Python 3.14.3、Chrome for Testing の chrome-headless-shell 153.0.8010.36、puppeteer-core 25.11.0 です。将来の本番 OS、Linux の資源強制、任意 OS の動作を保証する構成ではありません。

Python は Node に同梱されません。絶対パスを明示し、`fcntl.flock`、`os.waitid`、`P_PID`、`WEXITED`、`WNOHANG`、`WNOWAIT` を提供する配備が必要です。監督は直接子を未 reap のまま保持し、固定 engine/Chrome の同 process group が閉じるまで所有を維持します。別 session へ逃げる敵対子孫を OS で封じ込める保証ではありません。

1. 通常停止・HTTP drain・子孫と storage reader/writer の実終了後に DB と全 sidecar、objects を保全します。新 migration を適用し、`pnpm install --frozen-lockfile` と `pnpm build` を停止中に行います。稼働中の `dist` を置き換えません。
2. [公式 Chrome for Testing](https://github.com/GoogleChromeLabs/chrome-for-testing) の指定版・プラットフォームの chrome-headless-shell を専用ディレクトリへ配備します。実行ファイルだけでなく同梱 resources、ライブラリ、LICENSE.headless_shell 等を保持し、ユーザーの Chrome/profile を使いません。参照実行ファイルは 169187200 bytes、SHA-256 `ad3cf5ce958e43a6e3457d6f4d9df0a0c1483fc24ffb36a30530e88d726a82f8` です。別版への更新は新しい変換 profile と再検証を伴います。
3. Noto CJK の固定 commit `523d033d6cb47f4a80c58a35753646f5c3608a78` から `Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf` と `Sans/Mono/NotoSansMonoCJKjp-Regular.otf` を配備します。本文用は 16467736 bytes / `68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5`、code 用は 16424156 bytes / `4d01725be822d144cf9a56ade981e6fb920cd7a610b8fc24cc601a920beea5b9` です。OS font へ依存する日本語/code fallback を避けますが、全 Unicode の字形を保証しません。
4. 下記 JSON を専用の非 symlink ファイルへ保存し、`HOLLOW_PDF_CONFIG` にその絶対パスを設定します。設定は実行 UID 所有、group/world 書込み不可、16 KiB 以下です。秘密・cookie・本文を入れません。配備 binary/font の管理者書込み以外も許さない運用にしてください。
5. `apps/web` を作業ディレクトリとして通常の Node launcher を起動します。`build-search.node.mjs` は `dist/server/pdf` に engine、隔離 document worker、Python 監督を配置します。起動は旧所有確認、固定ファイル bytes/SHA 検査、runtime 設定、共通 storage 回復の順です。構成変更は正常停止後に行います。

固定 font のライセンスは [SIL Open Font License 1.1](https://github.com/notofonts/noto-cjk/blob/523d033d6cb47f4a80c58a35753646f5c3608a78/LICENSE) です。font 配布時にはライセンスを同梱してください。Python は [PSF のライセンス文書](https://docs.python.org/3/license.html)を、Chrome は取得した bundle のライセンス/第三者通知を保持します。Chrome 配布物の条件を CfT 管理リポジトリの Apache ライセンスだけで置き換えません。

## 設定

パスは設置先に置き換えます。以下は参照検証の調整可能な技術値で、ノートの業務上限や合法最大入力の成功保証ではありません。

```json
{
  "version": 1,
  "python": "/absolute/runtime/python3",
  "chrome": {
    "path": "/absolute/pdf/chrome/chrome-headless-shell",
    "bytes": 169187200,
    "sha256": "ad3cf5ce958e43a6e3457d6f4d9df0a0c1483fc24ffb36a30530e88d726a82f8"
  },
  "fonts": {
    "body": {
      "path": "/absolute/pdf/fonts/NotoSansCJKjp-Regular.otf",
      "bytes": 16467736,
      "sha256": "68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5"
    },
    "code": {
      "path": "/absolute/pdf/fonts/NotoSansMonoCJKjp-Regular.otf",
      "bytes": 16424156,
      "sha256": "4d01725be822d144cf9a56ade981e6fb920cd7a610b8fc24cc601a920beea5b9"
    }
  },
  "capacity": {
    "diskBytes": 4294967296,
    "outputBytes": 268435456,
    "nativeTempBytes": 134217728,
    "finalCopyBytes": 268435456,
    "totalMs": 120000,
    "renderMs": 30000,
    "termGraceMs": 3000,
    "leaseMs": 60000,
    "cleanupDelayMs": 5000
  }
}
```

`HOLLOW_EXPORT_DISK_BYTES` の既定 2 GiB と PDF の 4 GiB は別予約 partition です。合計 6 GiB に加えて DB、元媒体、運用余裕を物理 volume へ用意します。予約は OS の disk/RAM hard limit ではありません。pack/font/入力媒体、生成出力/native temp、完成 copy を各所有者へ一度ずつ課算し、所有者の個人/WS upload quota へは課算しません。完成実体は実 bytes、回収失敗は負債として残ります。

生成は一つ、別 note の待機 queue はありません。同内容の同 note は生成を共有し、要求と取消は本人ごとです。配信は全体二つ・同 request 一つ、channel は四 reader・slot ごと四回・64 KiB chunk です。初期設定は小代表資料での検証値であり、800 KiB 本文や多数の合法媒体すべての成功実測ではありません。native 専用領域は 100 ms 間隔で検査し、検査間に超過し得ます。超過は停止・実量負債・実回収待ちとなり、その間新 PDF を受け付けません。native RAM/CPU、全 filesystem/network の OS 強制境界は未実証です。

## 公開・共有入口の署名設定

公開・共有入口からの PDF には `HOLLOW_PDF_CONFIG` に加え、専用 keyring 設定ファイルを指す `HOLLOW_PDF_TICKET_KEYRING` が必要です。本人の認証鍵や共有リンクの保護鍵を流用しません。構成を省略・拒否した場合はこの入口の PDF だけが未構成となり、本人 PDF と HTML/Markdown は維持します。既存 renderer 所有不明時の共通 boot 拒否とは別です。

```json
{
  "activeKeyId": "current",
  "keys": [
    { "id": "previous", "path": "previous.key" },
    { "id": "current", "path": "current.key" }
  ]
}
```

各 key は暗号学的乱数の raw 32 bytes を別ファイルに保存します。値を JSON、ログ、URL、検証用 fingerprint に含めません。設定と key は同実行 UID 所有の regular file、mode 0600、直接親は 0700、symlink 不可です。相対 key path は設定ファイルのディレクトリを基準に解決します。設定は 16 KiB 以下、key は最大16個、ID は1〜32文字の ASCII 英数字・`_`・`-` で重複不可です。これらは設定入力の有限境界で、ノートの制限ではありません。

構成の変更は正常停止後に行います。新規受付は active key で署名し、旧 key を保持している間は元の発行時刻・期限の ticket を検証できます。旧 key の除去はその key の ticket を直ちに利用不可にします。通常の rotation は有効な旧 ticket が残らない期間を確保してから旧 key を取り除きます。設定エラーには key 値や raw path を出しません。

公開・共有入口は signin 状態にかかわらず既存 `/s` browser nonce に束縛され、本人90日履歴・通知へ追加されません。元の public identity/access epoch 又は link generation/password grant が認可根拠です。元リンク失効を別 public・signin・新しい unlock で救済しません。SH04 の link 再発行は元 public identity の ticket を失効させません。

形式選択の明示 POST は一回303で ticket 画面へ進みます。同じ form の再送は同要求を返し、通信結果不明なら元入口で明示的にやり直します。自動再POSTや専用 command lookup はありません。初回並行 cookie 発行で古くなった form は受付せず、入口の再表示を案内します。

ticket は受付から固定10分です。status は no-store/no-referrer/noindex、生成中だけ有限の2秒 Refresh を使用します。最初に配信枠を確保した自動又は手動の取得が永続 marker を一度だけ消費し、以後は手動取得となります。枠不足や transaction rollback で marker を消費しません。配信は本人と合計2件・同要求1件を共有し、期限は prepare+120秒、ticket、artifact、元 password grant の最小値です。再取得でいずれの元期限も延長しません。

単なる ticket 期限切れは、署名・browser・保存要求・元の現在認可がなお有効な場合だけ元入口へのやり直しを表示します。失権と期限切れが同時なら共通 not-found、prune 後も not-found です。期限を無視して取得を許可しません。匿名需要が消えても有効な本人・別匿名需要の生成は続き、最後の需要が消えたときだけ停止・実回収へ進みます。

## 安全な素材と公開

保存済み current snapshot の検証済み媒体と固定 font を逐次読み、bytes/SHA を一致させて 0400 sealed pack にします。全媒体/font の base64 文字列を作りません。renderer は登録済み opaque slot だけを専用 local channel から取得します。app cookie、元 URL の再取得、任意 file、別 slot/generation、資格 header なしの取得を拒否します。利用者の安全な通常リンクや文章は保持します。動画は poster と静的な説明に置き換わります。

Chrome 自身の sandbox を使い、`--no-sandbox` は認めません。アプリケーションの allowlist/CSP/request interception と OS の完全隔離は別の境界です。private PDF が生成されても、全 async close と監督の実子孫終了、storage copy の bytes/SHA、現在認可・内容・需要の publish transaction が揃うまで取得可能にしません。

## 寿命・停止・回復

PDF は公開 transaction の `publishedAt` から固定 24 時間、本人履歴は受付 `createdAt` から固定 90 日です。画面離脱・通常 logout で生成は取り消しません。降格/離脱等は関連する旧未終端要求を取り消し、再参加で復活させません。新取得は毎回現在本人 session と現在 read/content を照合します。再取得で実体期限を延長せず、容量確保のため期限前の完成 PDF を早期削除しません。

本人の delivery は prepare 起点 120 秒と artifact 期限の早い方までです。匿名用 ticket の 10 分とは別責務です。取得途中の期限でも abort しますが、実 reader close と storage owner 終了前に枠を解放しません。artifact が有効なら明示再取得で新 delivery を作れます。新 delivery は artifact の元の 24 時間期限を延長しません。

取得不能、サービス容量の一時占有、設定不足、生成期限超過は異なる理由です。恒常的に reservation が設定を超える場合は管理者の設定調整が必要で、単なる再試行案内にはしません。PDF 生成失敗が HTML/Markdown の利用権限を奪うことはありません。

`HOLLOW_STORAGE_DIR/.pdf-runtime` は service 専有です。新 storage で未構成なら PDF だけを無効にしますが、旧領域があるのに設定/Python/所有記録を確認できない場合は共通 storage の回復も開始せず boot を拒否します。lock/ledger を手で消したり、未知 PID を kill して通過させたりしません。旧 group 不在を正式 check で確認し、証拠を保った上で同じ配備設定から再起動します。

正常停止は HTTP 受付停止・drain、PDF runner/生成/配信の取消と実 close、他 worker/storage の停止、DB close の順です。lease 期限や論理 terminal だけで reader/writer 終了と扱いません。旧監督の終了が不明なまま新生成や共通 `recoverWrites` を開始しません。process が実終了してから保全・再 build・更新を行ってください。
