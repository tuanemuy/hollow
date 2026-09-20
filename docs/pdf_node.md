# Node の本人 PDF

PDF は保存済みのノートを非同期に生成する任意構成です。未保存の編集を送信・保存しません。HTML/Markdown の即時書き出しとは別の処理枠を使います。匿名 PDF と ZIP はこの接続の対象外です。

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

## 安全な素材と公開

保存済み current snapshot の検証済み媒体と固定 font を逐次読み、bytes/SHA を一致させて 0400 sealed pack にします。全媒体/font の base64 文字列を作りません。renderer は登録済み opaque slot だけを専用 local channel から取得します。app cookie、元 URL の再取得、任意 file、別 slot/generation、資格 header なしの取得を拒否します。利用者の安全な通常リンクや文章は保持します。動画は poster と静的な説明に置き換わります。

Chrome 自身の sandbox を使い、`--no-sandbox` は認めません。アプリケーションの allowlist/CSP/request interception と OS の完全隔離は別の境界です。private PDF が生成されても、全 async close と監督の実子孫終了、storage copy の bytes/SHA、現在認可・内容・需要の publish transaction が揃うまで取得可能にしません。

## 寿命・停止・回復

PDF は公開 transaction の `publishedAt` から固定 24 時間、本人履歴は受付 `createdAt` から固定 90 日です。画面離脱・通常 logout で生成は取り消しません。降格/離脱等は関連する旧未終端要求を取り消し、再参加で復活させません。新取得は毎回現在本人 session と現在 read/content を照合します。再取得で実体期限を延長せず、容量確保のため期限前の完成 PDF を早期削除しません。

本人の delivery は prepare 起点 120 秒と artifact 期限の早い方までです。匿名用 ticket の 10 分とは別責務です。取得途中の期限でも abort しますが、実 reader close と storage owner 終了前に枠を解放しません。artifact が有効なら明示再取得で新 delivery を作れます。新 delivery は artifact の元の 24 時間期限を延長しません。

取得不能、サービス容量の一時占有、設定不足、生成期限超過は異なる理由です。恒常的に reservation が設定を超える場合は管理者の設定調整が必要で、単なる再試行案内にはしません。PDF 生成失敗が HTML/Markdown の利用権限を奪うことはありません。

`HOLLOW_STORAGE_DIR/.pdf-runtime` は service 専有です。新 storage で未構成なら PDF だけを無効にしますが、旧領域があるのに設定/Python/所有記録を確認できない場合は共通 storage の回復も開始せず boot を拒否します。lock/ledger を手で消したり、未知 PID を kill して通過させたりしません。旧 group 不在を正式 check で確認し、証拠を保った上で同じ配備設定から再起動します。

正常停止は HTTP 受付停止・drain、PDF runner/生成/配信の取消と実 close、他 worker/storage の停止、DB close の順です。lease 期限や論理 terminal だけで reader/writer 終了と扱いません。旧監督の終了が不明なまま新生成や共通 `recoverWrites` を開始しません。process が実終了してから保全・再 build・更新を行ってください。
