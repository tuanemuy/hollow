# Issue #2: PDF のダウンロードをクライアントでの印刷に置き換える

## 目的

ノートの PDF をサーバーで生成する仕組みをやめ、ノート本文を載せた印刷用の表示とブラウザーの `print()` で、利用者が自分のブラウザーで印刷・PDF 保存できるようにする。Cloudflare 移行（#1）で Chrome・Python・ディスクを要するサーバー側 PDF 生成を持ち込まないための前提。Node ランタイムのまま実装する。

## 決定

### 本文の扱い（#1 の未決事項）

sandbox の iframe に入れた本文は印刷に使わない。印刷用の表示は、本文ドキュメント自体を最上位のページとして配信する。

- 根拠（実測、Chromium の印刷レイアウト = `agent-browser pdf`）: 親ページに高さを広げた iframe を置いて印刷すると、iframe が 1 ページ目から押し出されて 1 ページ目が空白になり、ページ境界で本文の行が上下に切断された。同じ本文を最上位のドキュメントとして印刷すると、空白ページも行の切断も無く全段落が出た
- 印刷用の表示は、閲覧画面の iframe と同じサニタイズ済みの本文ドキュメント（同じ表示スタイル・同じ内部メディアと外部参照の許可範囲）に、印刷操作のツールバーを足したもの。`<title>` はノートのタイトルにする（ブラウザーの「PDF に保存」の既定ファイル名になる）
- ツールバー（印刷する・ノートに戻る・PDF 保存の一言）は印刷時に出さない。本文の CSS が届かないよう Shadow DOM に入れる
- ページを開くと、画像（遅延読み込みを含む）とフォントを待って `print()` を 1 回呼ぶ。読み込めない・応答しない画像があっても最大 15 秒で呼ぶ。待つ間「印刷する」は押せず「画像を読み込んでいます…」と出す。待ち終われば「印刷する」で何度でも呼べる
- 画面では本文を閲覧画面と同じ本文幅（`layout.css` の `--content-max`）に置く。紙の幅はブラウザーの印刷設定に任せる

### 入口と URL

| 入口 | 印刷用の表示 | 導線 |
| --- | --- | --- |
| P-11 ノート詳細 | `/notes/{noteId}/print`（セッション Cookie、閲覧権限） | 書き出し欄のダウンロードの隣の「印刷する」 |
| P-44 公開ページ | `/p/{publicId}/1/print` | リンク列のダウンロードの隣の「印刷する」 |
| P-45 共有リンク | `/s/{token}/print`（既存の `Path=/s` のブラウザー Cookie とパスワード通過をそのまま使う） | 書き出し欄のダウンロードの隣の「印刷する」 |

- 導線の名前はどの入口も「印刷する」で、同じタブで開く（印刷用の表示の「ノートに戻る」で入口へ戻る）
- 編集（P-12）には導線を出さない。同じタブで印刷用の表示へ移ると編集中の入力を失うため
- P-11 の書き出し欄のボタンと「印刷する」は、アプリの他の操作と同じ `hollow-button` の見た目にそろえる

- 閲覧の可否は各入口の閲覧画面と同じ読み取り（`getNote` + `renderNote` / `readPublicNote` / `readSharedNote`）で判定する。応答も各入口と同じ：P-44 は「このページは利用できません」（非公開・削除・存在しない ID は 404、公開のままゴミ箱は 410）、P-45 は「このリンクは利用できません」、パスワード未通過は共有リンク画面（パスワード要求）へ 303。P-11 は未サインイン・権限なし・存在しない・ゴミ箱のどれもノート詳細へ 303 で戻し、ノート詳細の既存の表示（サインイン・見つかりません）に任せる。本文が空なら、どの入口も入口の画面へ 303 で戻す
- P-11 の URL は所属先の文脈（`workspaceId`）を持たないので、移動後の正規化（OR-12）は要らない
- 印刷用の表示はノートの閲覧と同じ扱いで、ダウンロードのレート制限（EX-04）は適用しない。公開ノートの印刷用の表示は `noindex` でサイトマップにも載せない
- P-11 の外部参照は、アプリ内のリンクから開いた（`Sec-Fetch-Site: same-origin`）か利用者が URL を直接開いた（`none`）最上位の遷移でだけ直接表示する。他サイトが始めた遷移では閲覧画面と同じく止める

### 閲覧画面を直接印刷したとき

P-11 / P-44 / P-45 をそのまま印刷（Ctrl+P）すると本文の iframe が上記のとおり崩れる。閲覧画面の印刷では、印刷用の表示へ誘導する一文だけを出し、画面の UI と崩れた本文は印刷しない。

### セキュリティ

- 印刷用の表示の CSP は本文ドキュメントと同じ（`default-src 'none'`、`object-src` / `frame-src` / `connect-src` / `form-action` / `base-uri` は `'none'`、`img-src` / `media-src` / `font-src` は許可済みの出所だけ）に、`frame-ancestors 'none'` と `sandbox allow-same-origin allow-scripts allow-modals` を足す。`script-src` は印刷操作のインラインスクリプト 1 本のハッシュだけ
- `allow-same-origin` は本人・共有リンクの画像取得に Cookie が要るため、`allow-modals` は `print()` のため。本文のスクリプト・イベントハンドラー・`javascript:` URL はハッシュ以外を拒む CSP で実行されない
- 印刷操作のスクリプトは、本文の要素の `id` で上書きできる `window` の継承メンバー（DOM clobbering）に頼らない
- `Referrer-Policy: no-referrer`、`X-Content-Type-Options: nosniff`、`X-Robots-Tag: noindex, nofollow`、`Cache-Control: private, no-store`
- 印刷用の表示の組み立て（`notePrint.ts`）は `node:` に依存しない。HTTP の振り分けは既存の各入口のハンドラーに足す

### 既存データ（ユーザー判断）

Node の libSQL DB は作り直す前提で、既存の PDF データは移行しない。新しいマイグレーションは PDF のスキーマを消すだけで、行も実ファイルも回収しない。PDF 形式の ZIP 依頼の行が残っている DB ではマイグレーションが失敗してよい（`docs/runtime_node.md` に DB の作り直しを書く）。経緯は `adr.md`。

## 受け入れ基準

| # | 基準 | 観測方法 |
| --- | --- | --- |
| AC1 | ノート詳細（P-11）の書き出し欄のダウンロードの隣に「印刷する」があり、選ぶと同じタブで印刷用の表示が開いてブラウザーの印刷が呼ばれる。所有者・ワークスペースのメンバー（viewer を含む）が使える。編集（P-12）には出さない | 自動テスト＋browser |
| AC2 | 公開ページ（P-44）と共有リンク画面（P-45、パスワードあり・なし）のダウンロードの隣に「印刷する」があり、サインインしていない閲覧者も印刷用の表示を開いて印刷できる | 自動テスト＋browser |
| AC3 | 印刷用の表示を印刷すると本文が欠けずに出る：全段落・内部画像・遅延読み込みの画像が出て、ページ境界で行が切れず、空白ページが無い。ツールバーは印刷されない。`<title>` はノートのタイトル | browser（`agent-browser pdf` の出力をテキスト抽出とページ画像で確認） |
| AC4 | 印刷用の表示を開くと画像の読み込み後に `print()` が 1 回呼ばれ、「印刷する」を押すたびに再び呼ばれる。待つ間「印刷する」は押せず読み込み中と出る。読み込めない画像があっても（最長 15 秒で）`print()` は呼ばれる | 自動テスト＋browser（`print` の呼び出し回数を記録） |
| AC5 | 印刷用の表示は閲覧できる者だけが開ける。P-11：未サインイン・権限なし・存在しない・ゴミ箱はノート詳細へ 303（ノート詳細がサインインや「見つかりません」を出す）。P-44：非公開化・存在しない ID は 404、公開のままゴミ箱は 410。P-45：無効・再発行済みは 404、パスワード未通過は共有リンク画面へ 303。いずれも本文を出さない | 自動テスト＋browser |
| AC6 | 本文が空（処理中・要 LLM 連携）のノートは、各入口に印刷の導線を出さない。印刷用の表示を直接開くと入口の画面へ 303 で戻す | 自動テスト＋browser |
| AC7 | 印刷用の表示で本文のスクリプトは実行されない：CSP の `script-src` はハッシュ 1 本だけで、ハッシュはツールバーのスクリプトと一致する。CSP・応答ヘッダーは「セキュリティ」のとおり | 自動テスト |
| AC8 | 閲覧画面（P-11 / P-44 / P-45）をそのまま印刷すると、画面の「印刷する」から印刷用の表示を開くよう促す一文だけが出る | browser（`agent-browser pdf`） |
| AC9 | 一括ダウンロード（EX-02 / EX-03）の形式は HTML / Markdown だけで、PDF を選べない。サーバーも `format: "pdf"` の ZIP 要求を検証エラーで拒む | 自動テスト＋browser |
| AC10 | サーバー側の PDF 生成に関わるコード・依存・設定が残っていない。次の検索がリポジトリ（`.goal-implement/` と `.thread/` を除く）で 0 件：`puppeteer`、`chrome-headless`、`HOLLOW_PDF_CONFIG`、`HOLLOW_PDF_TICKET`、`supervisor.py`、`NotoSans`、`pdf_requests`、`pdf_artifacts`、`pdf_computations`、`pdf_deliveries`、`pdf_anonymous`、`zip_pdf`、`pdfRequests`、`pdfAnonymous`、`components/pdf`、`/api/pdf-requests`、`PdfHistory`、`NotePdfAction`、`"pdf-artifact"`、`"zip-source"`、`docs/pdf_node.md`、`--pdf-` （マイグレーションの履歴＝SQL・スナップショット・journal とその移行テスト `pdfExportRemovalMigration.integration.test.ts`、PDF とは別用途の 2 か所＝`docs/browser_ux.md` の agent-browser の実行ファイル指定と、取り込みテストの fixture 素材 `sources.json` の Noto フォントは除く）。`pnpm-lock.yaml` に `puppeteer-core` と `@puppeteer/browsers` が無い | コマンド出力 |
| AC11 | 新しいマイグレーションが PDF 生成のテーブル・索引・トリガー、ZIP テーブルの PDF 用の列と CHECK の `'pdf'` を消し、共有トリガー 3 本（`machine_regeneration_delete` ほか）を PDF の条件なしで作り直す。適用後の DB でノート・ZIP（HTML / Markdown）・削除・処理履歴の既存テストが通る | 結合テスト |
| AC12 | 残す側（PDF の取り込み、LLM 用の PDF ページ化、元ファイルからの再生成、HTML / Markdown の書き出し、ZIP）の既存テストが通る | 自動テスト |
| AC13 | spec が改訂後の挙動を述べている：EX-01 / EX-04 の PDF をクライアントでの印刷に変え、進捗表示・署名チケット・相乗り・24 時間保持の記述を削除。EX-02 / EX-03 は HTML / Markdown の ZIP だけ。`spec/scenario/{export,jobs,sharing,editing,index}.md`、`spec/pages/index.md`（P-11 / P-15 / P-44 / P-45 と印刷用の表示）、`spec/design/index.md`（スコープ外の「印刷用スタイル」）と `spec/design/pages/*.html` の PDF 生成の記述、`spec/idea.md` | 差分 |
| AC14 | docs が改訂後を述べている：`docs/pdf_node.md` を削除し、`docs/runtime_node.md`・`docs/browser_*.md` から PDF 生成の手順・フラグを外す | 差分 |

## スコープ

### 含む

- 印刷用の表示（本人・公開・共有リンクの 3 入口）、各画面の導線、閲覧画面の印刷時の誘導
- サーバー側 PDF 生成一式の削除（コード・テスト・依存・スクリプト・設定・docs）と、PDF のスキーマを消すマイグレーション
- ZIP の PDF 形式の削除。ZIP の保護容量の下限から PDF 用の予約（未構成時 4 GiB）を外す（下限は 6 GiB と単件書き出しの予約のうち大きい方）
- `hasBody`（本文が空でないこと）をドメインに置き、core と画面の判定をそこへ寄せる
- spec（scenario / pages / design / idea）と docs の更新

### 含まない

- PDF の取り込み（pdfjs による解析、LLM 用のページ画像化、元ファイルからの再生成）。残す
- Cloudflare 移行そのもの、要件のスコープ外記述（デプロイ構成・技術アーキテクチャ）の改訂（#1 の段階 1）
- HTML / Markdown の書き出し・ZIP の挙動の変更（PDF を外す以外）
- 印刷のレイアウト調整（用紙サイズ・余白・ヘッダー/フッター）。ブラウザーの既定に任せる
- 既存 DB の PDF の行・実ファイルの回収（ユーザー判断）
- `.goal-implement/`（別スキルの過去の作業ログ）
- P-45 の spec が通過証を Cookie に置かないと書く一方、実装はブラウザー Cookie を使う食い違い（この変更の前からある。#10 に追記）
- ダウンロードと「印刷する」をデザインどおり下端操作バーへ置くこと（ダウンロードの置き場所が以前からデザインと違う。#22）

## 観測の環境とビューポート

- ブラウザーは Chromium（`agent-browser`）。印刷結果は `agent-browser pdf`（Chromium の印刷レイアウト、A4 縦）で見る。印刷ダイアログ自体は headless では出ないので、`print()` の呼び出しは呼び出し回数の記録で見る
- ビューポート：`spec/design/` の `sm`（640px）の前後としてモバイル 375px とデスクトップ 1280px
