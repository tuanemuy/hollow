# P2 技術成立調査

## 調査範囲

2026-09-06 の P1 独立検証中に行った読み取り専用調査。参照は [IM-01〜05](../../spec/scenario/import.md)、[JB-01〜03](../../spec/scenario/jobs.md)、[採用設計](../design.md)、[計画](../plan.md)。P1コード、依存、DB、起動環境、ブラウザーは変更していない。

以下は採用候補と接続契約であり、parserのインストールや実ファイル変換による成立検証は未実施。

## 実行環境

Nodeは22.22.3。`pdftotext`、`pdfinfo`、`pdftoppm`はPoppler25.10.0として利用できる。ffmpeg、zip、unzip、Python3も存在する。LibreOffice、soffice、pandoc、tesseractはPATHにない。

Pythonのdocx、openpyxl、pptx、reportlab、pypdf、Pillowは未導入。Nodeのfast-xml-parserとsharpは間接依存として存在するが、coreからの利用には直接依存の宣言が必要。リポジトリにPDF/DOCX/XLSX/PPTXの既存fixtureはない。`flake.nix`はNode/pnpm等のみで、Popplerをプロジェクト依存として宣言していない。

## parser の採用案

| 入力 | 採用候補 | 接続方式と範囲 |
| --- | --- | --- |
| HTML | P1のsanitize-html | HTML全文を保持してサニタイズ。外部参照は除去前に台帳化し、取り込み結果と区別する |
| Markdown | marked18.0.11 | MarkdownからHTMLへ変換し、同じHTMLサニタイズ境界を通す。Node20以上対応 |
| plaintext | Node TextDecoder | BOMに応じたUTF-8/UTF-16、既定UTF-8を厳密decodeし、HTML escape後に段落化する。不明な文字コードを黙って置換しない |
| DOCX | mammoth1.12.2 | buffer入力の`extractRawText`で段落を取り出してHTML escape。外部ファイルアクセスを有効化しない |
| XLSX | exceljs4.4.0 | workbookをbufferから読み、sheet/row/cell順で表を作る。formulaは保存済みresultを読み、評価しない。rich textを文字列へ投影してescape |
| PPTX | yauzl3.4.0 + fast-xml-parser5.11.1 | Office Open XMLのrelationshipとslide順を読み、各slide内の段落・テキスト・表を抽出する。正規表現でZIP/XMLを解釈しない |
| PDF | pdfjs-dist6.3.289 | 公式Node例と同じlegacy/build/pdf.mjsを使い、各pageのgetTextContentから本文を得る。入力はURLでなくUint8Array |

[Marked](https://marked.js.org/)はサニタイズを行わないため、出力をP1のHTML境界へ必ず通す。[Mammoth](https://github.com/mwilliamson/mammoth.js)はDOCXのraw text抽出を提供し、外部ファイルアクセスの危険性を明示している。[ExcelJS](https://github.com/exceljs/exceljs/blob/master/README.md)はXLSX読取とsheet/row/cell API、formulaの保存resultを提供する。

PPTXは[Microsoftのslide text抽出](https://learn.microsoft.com/en-us/office/open-xml/presentation/how-to-get-all-the-text-in-a-slide-in-a-presentation)を基準にする。`presentation.xml`のslide IDと`.rels`のtargetを辿り、ファイル名の辞書順をslide順に使わない。外部relationshipは取得しない。図表の数値・埋込オブジェクト・speaker notesの抽出範囲は、代表fixtureの結果をManagerへ示して確定する。

PDFは[公式Node例](https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs)と[API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html)に基づき、page cleanupとloading task destroyを行う。font/CMap等が必要ならpackage内の静的資源を指定し、任意ネットワークを使わせない。破損・暗号化エラーと「正常に読めたがtextがない」を分ける。

npm公式registryの2026-09-06時点のmetadataでは、[pdfjs-dist6.3.289](https://registry.npmjs.org/pdfjs-dist/6.3.289)はNode22.13以上、[mammoth1.12.2](https://registry.npmjs.org/mammoth/1.12.2)はNode12以上、[exceljs4.4.0](https://registry.npmjs.org/exceljs/4.4.0)はNode8.3以上、[marked18.0.11](https://registry.npmjs.org/marked/18.0.11)はNode20以上。現在のNode22.22.3は満たす。pdfjs-dist採用時はrootの宣言下限22.12を22.13へ合わせる必要がある。

Popplerは実PDFのテキスト抽出結果・ページ数を照合する独立の検証手段に使える。productionの必須実行依存にする場合はflake/配布手順への追加が必要なので、第一候補はpdfjs-distとする。

### Office の拡張子

原文はWord/Excel/PowerPointと記載し、旧バイナリ形式とOOXMLの範囲を列挙していない。初期接続は`.docx/.xlsx/.pptx`を対象とする案。`.doc/.xls/.ppt`も必須と解釈する場合は、この案だけでOffice完了とは扱えない。

`.xls`を含めるなら[SheetJS公式配布](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)の0.20.3 tarballが候補。公式はnpm registryよりCDN配布を案内している。`.doc/.ppt`は現候補では扱えず、LibreOfficeなどの別adapterと実行依存が必要になる。対応範囲をUIへ正確に表示し、未対応形式を成功に置き換えない。

## 実形式 fixture の用意

- DOCX/XLSX/PPTXは小さなOOXML packageをテストのZIP writerで作る。`[Content_Types].xml`、relationship、document/workbook/presentationと実partを含め、拡張子だけを付けたXMLにはしない。
- 各Office候補のwriter、または独立した文書アプリで生成した正常fixtureも1件ずつ用意する。自作最小fixtureだけをparser成立の根拠にしない。LibreOffice等の追加導入は別作業。
- PDFは小さなxref/trailerを持つテキストPDFと、画像XObjectだけのscan相当PDFを生成する。Popplerでページ数とtext有無を照合する。日本語font/ToUnicodeを含むPDFも追加し、英字だけで日本語対応を判定しない。
- 破損ZIP、必須part欠落、暗号化、拡張子/MIME偽装、ZIP bomb、HTML800KB超、同名file2件、正常＋異常の混在を用意する。
- 画像/音声はPNG/JPEGと短いWAV等の有効な内容を生成する。拡張子の偽装を検出できるfixtureも置く。
- fixtureは生成方法と出所を記録し、実ファイル→upload→永続原本→worker→noteのブラウザ操作まで検証する。第三者ファイルを採用する場合は再配布条件を確認する。

## 入力境界と原本

単一の巨大multipart requestで100件500MBを同時buffer化しない。batch作成後、fileごとのupload endpointを通し、byte上限をstreamで検査する。元のfilenameは表示metadataとし、filesystemの保存keyには使わない。

objectはprivate stagingへ保存し、確定object key、bytes、判定MIME、note、jobをUoWで登録する。DB未登録のstagingは回収する。登録済みの原本はnoteの完全削除まで残す。quotaは個人5GB/workspace20GB、原本・media・reference・trashを数える。予約と確定をtransactionで処理し、並行uploadによる上限超過を防ぐ。

file-type等のsignature検出とOOXMLの必須part検証を組み合わせ、ZIPそのものとOffice containerを分ける。plain text/Markdown/HTMLは同じtextに分類されうるため、内容と入力hintの判定規則を明示する。一般ZIPは展開せず未対応と記録する。

ZIP読み取りは[yauzl](https://github.com/thejoshwolfe/yauzl)のlazyEntries、entry size検査、filename検査を使う。展開先への書き出しを避け、必要XMLだけを読む。宣言sizeだけでなく実際に読んだbyte総数、entry数、XML深度、処理時間も制限する。XMLのDOCTYPE/外部entityは受け付けない。

CPU負荷のあるparserはweb requestのevent loopから分離する。Node worker threadまたはchild processで実行し、deadline到達時に停止できるようにする。圧縮50MBは展開50MBを意味しないため、入力上限だけでmemory保護とは扱わない。

## durable job の契約

Manager採用: Job表を実行の正とし、outbox consumerはwake-upだけを行う。起動時と周期sweepがqueued/lease-expiredを拾う。

既存`apps/web/app/worker/node/runner.ts`はhandler前に`markProcessed`する。この記録後にcrashしたeventは再配送でskipされるため、変換本体の実行保証に依存させない。

### 保存と起動

1. upload完了のUoWでnoteを`processing`、原本参照、jobを`queued`として保存し、`JobQueued` eventを同じtransactionへ追加する。
2. Hollow UoWに`collectEvents`を追加し、既存outbox形式へ同じtransaction内でflushする。domain/applicationからoutboxを直接操作しない。
3. commit後にrelayをkickする。wake-upが失われても周期sweepがjobを発見する。
4. workerはDB上の条件付きUPDATEでjobをclaimし、leaseOwner、leaseToken、leaseUntil、attemptを記録する。parser実行中はDB transactionを開きっぱなしにしない。
5. 結果commit時にleaseToken、job状態、noteの存在と編集権限、原本/生成対象version、キャンセル状態を再確認する。

### crash・二worker

| 故障点 | 必要な結果 |
| --- | --- |
| 原本staging後・DB commit前 | 未登録stagingだけ回収。note/jobは存在しない |
| note/job/outbox commit後・kick前 | 起動時/周期sweepがqueuedを拾う |
| processedEvents記録後・consumer前 | DB queuedが残るのでsweepが拾う |
| job claim後・parser開始前/中 | lease失効後に再claimし、attemptを1増やす。上限/deadline超過ならtimeout failure |
| parser完了後・結果commit前 | 元の本文を維持。再claim側が再実行する |
| 結果commit後・worker応答前 | job terminalと結果が同時に残り、再claim/二重反映しない |
| worker Aのlease失効後にBがclaim、後からAが終了 | Aの古いleaseTokenで結果commitを拒否する |
| 二workerが同じqueuedをclaim | 条件付きUPDATE/RETURNINGで1件だけ取得。外部副作用はjob/attemptのidempotency keyで制御 |

heartbeatとlease延長も現在のleaseToken一致を条件にする。service再起動で全jobを無条件queuedへ戻さない。処理中の正当なworkerと競合するため。

### 状態・再試行・キャンセル

Jobは`queued/running/succeeded/failed/cancelled`のunionとし、failureだけが利用者向け理由を持つ。再試行は元jobを書き換えず、`retryOf`つきの新jobを作る。多重retryをtransactionの制約で抑止する。batchの親とfileごとの子を永続化し、成功・失敗・取消の内訳を子から集計する。

通常batchキャンセルは未開始の子をcancelし、開始済みの子は完了させる。再生成キャンセルと権限失効・noteのtrash移動等は、終了時のcommit guardで結果適用を拒否し、旧本文を維持する。取消の種類は内部契約で区別し、画面のcancelledをfailureへ畳まない。

再生成開始時に元本文/versionを保持し、実行中の編集を拒否する。結果commitにはjob/lease一致と開始時のnote version一致を要求する。取消操作が先にcommitした場合、workerは本文を置換できない。worker完了が先なら取消はterminalとして拒否する。この競合を実DBの同時操作で検証する。

履歴は実行者だけが読める。90日履歴pruneは原本や恒久reference台帳を削除しない。生成物の期限はjob履歴期限と別に管理する。

## 要AI連携の保存

PDFを正常解析してtextがない場合、画像、音声は原本とmetadataを保存する。連携なしではnoteを`needs_integration`、本文なしで確定する。利用者が明示的に「LLMを使わない」を選んだ場合は`failed`とし、LLM有効での取り込み直しを案内する。

`needs_integration`は変換失敗やcancelledとは別のnote状態とする。公開希望はjob入力に保持し、変換成功までnoteはprivate。成功commit時にhandle/slugと権限を再検証し、満たさなければprivateのまま理由を履歴へ残す。OpenRouterの実接続とAI生成はP5の条件として保持する。

## 外部参照の初期接続

参照ごとの`pending/imported/failed/skipped`と元URL・保存先・失敗分類をnoteに属する恒久台帳へ残す。job履歴が90日で消えても、誰が読んでも取り込み結果を確認できる。

fetchはpublic HTTP(S)だけ、DNS解決結果を検証し、接続先を固定する。redirectごとに再検査し、cookie/認証headerを転送しない。localhost/private/link-local/metadata endpoint、IPv4-mapped IPv6等を拒否する。取得byte合計100MB・200件・deadlineをstreamで制限する。

CSSは取得後にASTで`@import`と全面被覆に使う配置指定を除去してinline化する。CSS内の画像/font URLは原文どおり取得対象に加えない。CSS取得失敗では外部linkを残さず、その他resource取得失敗では元URLを残す。P1のiframeは全外部通信遮断なので、P2では原文の表示要件に合わせCSPと認可付きasset配信を再設計する必要がある。

## 次の成立検証

最初にDOCX/XLSX/PPTX/テキストPDF/scan相当PDFの実形式を各1件変換し、Node production buildでparser/worker/CMap等が解決できることを確かめる。次に単一HTML/Markdown uploadをUIからnote/job/objectまで接続する。最後にbatch部分失敗・再試行・取消・crash回復・二workerのclaim/commit guardを実DBで検証する。
