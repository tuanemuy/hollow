# P5b-2b 提案 — Office・文字 PDF・単画像の LLM 入力

## 現在の結論

2026-09-28T08:21:15+09:00 時点の静的調査を基にした設計提案。製品実装・probe・テスト・build・runtime・browser・fixture 作成は未実行。対象コードは受入 commit `3650ec61c45c4ad4ab0cf62b96c8dba08e70a34c` の構造を参照する。現在の製品を不合格とする監査ではなく、2b を提供する前の不足を特定した。

- 文書は既抽出 HTML をそのまま LLM へ接続できない。構造/全対象文字の網羅性と、所有する解析実行の実終了を追加確認する。
- 単画像は既 `chat-text` profile と `html: string` 入力では表せない。画像用途の profile と型付き raster 入力を分離する。実画像認識品質は代替 provider では証明できない。
- 永続層の既 CHECK は原本を text/html/markdown に限定する。新形式を text と偽って保存せず、下記の移行選択を Manager が採用してから着手する。「旧表再構築なし」を無断で解除しない。
- Office の文字網羅と媒体未解釈、PDF の混在頁、単画像の全 frame を別判定にする。判定不能/内容欠落を LLM で補ったことにしない。
- 推奨順序は、提供前 probe → 文書縦接続 → 単画像縦接続。形式 gate が成立しないものを残したまま P5b-2b 全体完了とはしない。

開始基点は Manager 指定の `/Users/hikaru/.local/share/hollow/verification/p5b2a-v1-independent-20260928-o9qLzY/final`（08:02:39.153）、comparison .270、seal 08:02:40.239。今回この保護領域を読取/実行/変更していない。旧 S/I/P へ戻さない。全体管理正本、製品、依存、既証跡に変更なし。本提案だけが書込対象である。

## 1. 要件との対応と提供 matrix

原文は `spec/scenario/import.md` の形式表/IM-01〜04/06、`jobs.md` JB-01〜03、`integration.md` IN-01〜03/08、`account.md` AC-10。`requirements.md`、brief、design「P5b-2の本文生成と月間枠」、P5b-2-proposal §7 と4点追補を前提にする。所有者は現在の personal owner 又は WS owner/editor。viewer、過去 uploader、公開閲覧根拠を生成権限へ置き換えない。

| 入力/操作 | 2b 提供案 | 維持する非 LLM 動作 |
| --- | --- | --- |
| DOCX/XLSX/PPTX | 連携＋AI指定の取り込み、原本からの IM-06。抽出 gate 後 text 用途で構造化 | 非連携/AI不使用は既機械抽出。旧 DOC/XLS/PPT は未対応 |
| 文字 PDF | 全頁分類と文字網羅 gate 後、取り込み/IM-06を text 用途へ | 既機械抽出と部分抽出 notice を維持 |
| 静止 JPEG/PNG/WebP/GIF 候補 | 単一 raster として検証後、image 用途で取り込み/IM-06 | 未連携は原本＋要連携。AI不使用は失敗/AI使用の再取り込み案内 |
| 複数 frame/複数画像容器、画像又は混在 PDF | 2b では未提供。先頭だけ使わず理由を表示 | 原本保持。既機械経路の結果を LLM 全文成功へ昇格しない |
| text/HTML/MD | 受入済み2a不変更 | 通常HTML/MD取り込みは常時機械・0回 |
| 音声、Drive原本 | P5b-3/Driveへ残す | 未提供説明を維持 |

原文の「文字 PDF」は一文字でも抽出できれば画像頁を捨ててよいという意味ではない。一方、全ての text+image PDF を拒否する狭い gate は原文の全対象対応を完成させるものでもない。混在/視覚依存を P5b-3 へ残す方針と、どこまでを2bの文字PDFと認めるかは §3 の明示採用を要する。

月上限は予約可能性を判定するが、超過は変換失敗 job として記録する。機械可能な Office/文字 PDF だけ機械での取り込み直しを案内し、画像は翌月案内。保存容量による upload 開始拒否とは別。予約月固定、論理1回、全segment未送信証明時だけ返却、消費だけの厳密80%超警告は2a受入どおりで変更しない。

## 2. 既存実装を読んで分かった差

依存固定値は core/package.json の mammoth 1.12.2、ExcelJS 4.4.0、fast-xml-parser 5.11.1、yauzl 3.4.0、pdfjs-dist 6.3.289、sharp 0.35.4。今回 install/upgrade は提案しない。公開最新文書と固定版の一致は probe で確定する。

| 読取箇所 | 現在の事実 | 2b で不足するもの |
| --- | --- | --- |
| `adapters/node/import/parserWorker.mjs` DOCX | mammoth.extractRawText、header/footer/footnote/endnote/commentの追記、媒体等のnotice | raw textは表/見出しの意味を落とす。文字箱・変更履歴・field/altChunk等を含む全対象と重複なしの対応 |
| 同 XLSX | 全worksheet、非空row、セル値/保存済数式結果、結合子cellをskip、図表等notice | sparse行列/結合の座標、非表示sheet/row、数式と値、書式付き数値、comments/drawing文字をどう表すかの明示。セルskipを構造網羅としない |
| 同 PPTX | presentationのslide順、段落、notes/chart/diagramの一部を収集。layout/master/themeをskip | table/group/textboxの境界、継承された可視文字、未参照/未知part。XML内の文字を連結しただけで描画順一致とはしない |
| 同 PDF | 全頁getTextContent、文字0頁notice、文字のある頁だけHTML化 | 同一頁の画像/図、OCR層と下絵、form/annotation/optional content、文字順不明を判別していない。coverage completeは視覚網羅の証明ではない |
| `import/documentExtractor.ts` | signalなし、message時に `void worker.terminate()` 後Promise settle、admission枠解放 | LLM owned契約に必要なabort伝播と実exit待ち。既機械の合格をそのまま実close証拠へ借用不可 |
| `import/mediaWorker.mjs` / `mediaValidator.ts` | sharpで全frame decode検査、40Mpixel/1000frame/160MB、validatorはterminateをawait | 元画像の検査と、単frame/向き/色/送信rasterの生成は別。metadataのみで完全decodeとしない |
| `application/llm/ports.ts`, `node/llm/generator.ts` | preparedはHTML segment、profileはchat-text、送信は文字messages | 画像binaryと画像能力/予算を違法状態のない型へ拡張 |
| `llm/request.ts`, `read.ts`, `import/acceptUpload.ts` | 受付はtext/html/md、importのLLM分岐はtextだけ、一覧はchat-text | 形式別用途と提供範囲、画像用model初期値、job/notice投影 |
| `libsql/llmSchema.ts`, migrations/0034 | source_format CHECK 3値、prompt_version=1、dispatch/reservationがconversionを参照 | 型だけの形式追加ではINSERT不可能。immutable triggerと回復を含めた保存契約の拡張が必要 |

上記は静的事実で、旧機械経路の新不具合再現ではない。2a accepted source Worker/result/owned read の実終了と、旧 parser wrapper の終了契約を混同しない。

## 3. 文書の全文/頁/媒体 coverage gate 案

共通で「全package/pageを走査した」「採用対象文字を全て表した」「視覚内容を解釈した」を分離する。`complete | partial | no_text` の既値だけで提供を決めず、新 preparation 内に `textComplete`、単位数/順序、未解釈媒体数、有限 reason を持つ。通知は検証器が決定し、LLMが書き換えた文をnoticeの正本にしない。

### Office

- package全entryの実展開/CRC/パス/重複/暗号化/DTD・entity/関係先を既方式で検査し、content typeとrelationshipで対象を列挙する。外部part/OLE/マクロを実行せず、未知の文字bearing partを黙って無視しない。
- DOCXは本文段落順、見出し/list/table/結合、各text box、参照される脚注/文末注を構造化。header/footer/commentは出所label付きの付属sectionとして一度ずつ扱う案。既rawTextの無警告を全文保証としない。mammothのHTML変換候補とOOXMLの文字inventoryを照合し、能動参照と画像data URIは出力前に抑止する。変更履歴/field/altChunk等は意味を決められなければ明示拒否。
- XLSXはworkbook順に全sheet（hidden/veryHiddenもlabel付き）を扱い、元cell座標と空白range/結合rangeを保持。row/cell上限は座標maxだけでなく走査数/出力量で制限。保存済formula結果と式を区分し、再計算しない。保存結果欠落は発注前失敗・元アプリで再計算案内。number formatを無言で壊さず、再現できない表示形式は限定notice又は拒否をprobeで決める。chart/外部link/embedded objectは文字網羅へ混ぜない。
- PPTXはpresentationの関係順に全slide（hiddenをlabel）、各group/textbox/tableの構造、speaker notesを扱う。layout/master由来の可視文字は重複を排して含めるか、その資料を未対応とする。chart/SmartArtの数値だけを図の意味の完全抽出としない。要素を横断した読み順の推論は保証しない。
- **採用を求める部分抽出方針**: 文字集合/構造が網羅でき、未解釈対象が画像等の非textだけと証明できるOfficeは、固定「文字部分のみ・媒体未解釈」noticeを残して構造化可能にする。元IM形式表が「抽出結果の構造化」であり、画像の意味理解を要していないため。文字欠落/未知part/壊れた関係/不明coverageは拒否。既partialを一律許可しない。これを認めない場合はpartial全部を提供対象外とし、日常の画像入りOfficeも未完範囲になることを明記する。
- 巨大tableは64KiBを超えたら当面失敗。勝手に行単位分割して見出し/結合の意味を変えない。表分割拡張が必要なら別の共有判断へ戻す。

### PDF

- 全numPagesについて、text itemsだけでなくoperator list、annotation/form、optional content等の指標を検査するstrict経路を新設する。`stopAtErrors:true` を候補とし、壊れた頁から取れた一部文字を完全扱いしない。CMap/font/WASMは固定local、script/action/attachment/remote取得をしない。
- 各頁を `text-covered` / `proven-blank` / `needs-visual` / `indeterminate` に分類し、頁番号を維持する。空文字＝blankとはしない。paint image/inline image/mask、非text内容、formの不明要素、抽出できない文字を検出すればvisual/不明。1頁でも該当したら2bの全文LLMへ送らず、画像/混在PDF未提供と案内する。白紙は全体検査で内容なしを証明できる場合だけ許可。
- 同じ頁の「文字＋スキャン画像」もtext-coveredにしない。OCR層があるだけでは下絵との一致を証明できない。単純な罫線/背景等を許可するoperator allowlistはprobeで固定し、複雑path/図の意味を自動判定できたと称さない。
- textCoveredの判定は視覚再現・多段組読み順の万能証明ではない。tagged構造/幾何順序と日本語縦横/表の代表をprobeし、順序が不明なものは拒否する。無条件な「1文字以上の頁なら提供」は不採用案。
- **原文との差/要判断**: このgateは文字だけを構造化する範囲を保つ一方、logo入り文字PDFもvisualへ倒す可能性がある。安全なfalse negativeを許容する初期提供として採用するか、全体をP5b-3まで待つかをManagerが決める。混在頁を除外した部分生成の新確認UIは原文にないため本提案では増設しない。

暗号化Office/PDFはpassword解除案内で失敗、入力欄/解読/パスワード探索なし。パスワード入力なしで開ける制限付きPDFも文書検査で区別し、暗号化/抽出制限を無視しない。LLM準備失敗は原本/旧本文を残し、送信前の予約は既全体証明に従って返却する。

## 4. 単画像の gate とモデル

採用候補は既受付の静止JPEG/PNG/WebP/GIF。入力signature・コンテナ全体・実decode・単frame一致を検査する。GIF/WebPのpage数に加えPNGのanimation chunkを検査し、デコーダが先頭しか見ない形式を静止と誤認しない。APNG/animated GIF/WebP、MPO等の複数像、不明codecは先頭を使わず未提供。SVG/TIFF/HEIF/AVIFを既原本対応と誤称せず、2bでは新拡張子を増やさない。

推奨初期案は**縮小なし、切抜きなし、単frame、向き補正、sRGBへの明示変換、metadata除去、PNG再符号化**。旧案の2048px縮小を黙って採用しない。文字の小さい原本を縮小して完全入力と称するリスクを避ける。大きい画像は資源失敗で、利用者による分割/小さい原本の明示再要求へ。透明部分は白背景合成を候補とし、透明黒文字/淡色文字のprobeとUI説明を必要とする。不可逆な色/alpha処理は原本を変更せず入力派生物だけへ適用する。

画像requestは固定chat/completionsのtext先行＋`image_url`のdata URI（自分で符号化したPNGのみ）。公開URL、storage URL、任意data URI、file upload API、OCR pluginを受け取らない。原本/payload/EXIF/base64/hashをlogやUIへ出さない。生成HTMLに元画像を自動asset化して埋めず、本文だけを採用する。既note-owned placeholderの復元契約はHTML/MD側へ維持する。

`LlmModelProfiles.inspect(modelId, kind, signal)` と `kind: chat-text | chat-image` の判別型を提案。imageではimage入力＋text出力＋chat endpoint＋max_tokens対応を確認。既catalog DTOを変えず、同じ完全集合から用途別profileを保存する。defaultは公式頁で画像入力/文字出力を確認した同IDのversion付き別profile、customは15分live必須。最後の正常一覧でimage非対応/廃止ならfallback復活禁止。設定保存成功と実生成能力を同一視しない。

画像token見積りをbase64文字数/UTF-8 byteから捏造しない。モデル固有画像budget規則が確認できたものは出典/版付きpolicyで事前照合し、未知customはimage modalityだけで無限budgetを許可しない。OpenRouterのcatalogだけでは画像token上限/各providerのdetail変換が揃わない場合があり、固定小入力＋context余裕の技術基準を採用するか、profile未確認として提供を止めるかはprobe前の判断点。Google直接APIの画像token式をOpenRouterの任意modelへ一般化しない。実context拒否は安全なjob失敗であり自動model切替なし。

## 5. 内向きport・永続化の提案

### 型/責務

- `LlmSourceFormat`にdocx/xlsx/pptx/pdf/imageを追加し、原本の実format/bytes/identityを保持。準備出力を `text-blocks` と `single-raster` の判別unionへ。前者は既segment/順序/coverage、後者は単一ordinal・PNG bytes・width/height・原寸・recipeVersionを持つ。`html`にbase64やJSONを詰めない。
- `LlmGenerateInput`もprofile kindとinput kindが対応するunionへ。generatorがHTTP固有content配列へ変換し、domain/applicationはOpenRouter JSONを持たない。結果は既HTML responseのまま。
- 新文書準備adapterと画像準備adapterを既preparerのdispatcherへ接続する。機械用DocumentExtractor portをLLM都合で全面拡張しない。共有pure ZIP/XML検査を抽出するなら既機械出力不変の回帰を先に固定する。
- immutableなpreparation recipe versionを保存し、V1 text/HTML/MDと新文書/画像を分ける。prepared identityはrecipe、全文/全segment順序、coverage分類、媒体map又はraster MIME/寸法/bytesを束縛する。指示/model/epochは既immutable job契約。再準備のhash差は再発注せず失敗、保存済全responseだけ後処理という既回復を維持する。
- noticeは有限code＋数/頁/partの安全位置をapplication DTOへ投影。未知raw parser/provider errorを渡さず、encrypted/coverage/visual-required/resource/modelを利用者に区別する。元ファイル名以外の秘密pathをerrorへ載せない。

### CHECK拡張の必要性と3案（未採用）

既0034の `llm_conversion_values` がformatを3値、`llm_conversion_limits` がprompt_versionを1に固定している。参照triggerはconversion名へ直接JOINし、dispatch/quota reservationもFK参照する。2bの原本をtextとして保存するadapter上の偽装、writable_schema、既migration編集、既job削除は選択肢にしない。SQLite公式の一般的なconstraint変更手順はtable再作成を含むため、単なるADD COLUMNでCHECKを拡張できるという前提を置かない。[SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html)

| 案 | 旧履歴/active/responseへの扱い | 複雑性と損失リスク |
| --- | --- | --- |
| A: 加算別表へ2bだけ保存 | 旧3表は不変更、新conversion/dispatch/reservationを別群。bucket/fenceを共用 | union repository、両群を横断するactive-note/command一意性・再連携件数・quota返却・owner回復・purge/90日が必要。二正本の見落とし危険。単純な補助1表では既CHECK/FKを解決できない |
| B: 新canonical表群へ全jobを安全移行、旧群は読取保全 | 行/owner/intent/response/参照を同Txcopyし、新側のみ書込へ切替 | 既PK/FK/trigger参照先更新と旧payload二重保持・回収責務、deploy切替/rollbackに新generationが必要。activeをclosedへ変えず移す。最も多くの履歴/停止/回復責務へ影響し、2bだけには過大 |
| C: `llm_conversions`だけ対象限定再構築 | 全旧列値/PK/owner/期限/responseBudgetを完全保持しCHECKを拡張、recipe nullable追加は旧NULL=V1。dispatch/reservation/bucketは現行のまま | 一回のDDLリスクはあるが正本/claim/回復は一つ。関連FK・全trigger/indexを同Txで正確に戻す必要。『旧表再構築なし』の例外をManagerが明示採用することが必須 |

**推奨はCを条件付き採用**。形式を正しく保持してIM-01/06へ接続する必要変更で、見た目の整理ではない。例外を認めない場合はAを再詳細化し、費用/危険を含めて別採用を待つ。今回いずれも実装しない。

Cの提供前gate: 正常/途中SQL失敗/末尾FK失敗clone。空のfresh LLM5表だけでなく、自己synthetic DBへ全phase・active/unknown/closed、intent/response、消費/予約、undo参照、同commandを作り、全旧列値/一意制約/trigger/FK/ledgerと回復意味を比較する。移行は専用停止接続、FK設定/rename順序は固定libSQLの公開migrate経路で成立を証明し、driver-open禁止backupの更なるcopyのみ。旧PIDやunknownを移行時に一括終了扱いしない。live別ownerがある状態で移行を実行しない。停止の証明が不足すれば適用を止める。正常cloneの後だけ最新baselineの通常移行を別許可で行う。

## 6. 資源・実終了・秘密の境界案

既2aのglobal2/account1、queued100、job30分/source30秒/dispatch90秒、停止監督60秒、response2MiB/content64KiB/max_tokens8192、全response予算2MiB/job・256MiB/global、64KiB×16、最終本文800KiB、prune100/60秒を維持する。新形式の原本受付50MiBとは別。超過は理由付き失敗で原本/旧本文維持、head切詰めやsilent機械fallbackなし。

| 2b追加の技術候補（未採用・未実測） | 初期上限/理由 |
| --- | --- |
| OOXML | 既防御値128MiB実展開/16MiB XML/4096entry/depth128を上限として再使用。全走査で超過前停止、さらにLLM出力64KiB×16で制限 |
| 文書単位 | PDF/slide最大200、sheet最大100、走査cell最大200,000を候補。各全文を走査してから送信し、上限到達の部分を送らない |
| 単画像 | 向き補正後の長辺4096px・16Mpixel・1frame、縮小0、PNG派生物8MiB、JSON全体12MiB。原本50MiB/既40Mpixel受付と混同しない |
| 一時保持 | 新派生物はjob中メモリのみ、原本/DBへbase64保存0。global2によりraster最大16MiB、request文字列/原本buffer/decoderメモリは別に測定し、単純な16MiB総RSS保証にしない |
| 実行隔離 | 原本readのFD実close＋解析Worker又は専用childの実終了＋入出力pipe close後だけ所有解放。タイマーabortだけでclosedにしない |

既documentExtractor wrapperはLLMに直結しない。純JS文書では既sourceWorkerのexit待ち方式を再用し、native codecの終了所有がWorkerだけで証明できない場合は**固定自己child processのcloseを待つ方式**を優先候補とする。childはallowlist env/固定entry/有限IPC又はpipe、rawstdout/stderr非保持、任意path/URL/コマンド入力なし。256MiB V8 heap等はRSS/ネイティブ全体硬保証ではない。child未生成が確定した失敗はnot-sent/closed、生成有無不明やTERM後非終了はtyped ownership unknownで枠/pin保持と区別し、未知PID kill/時間切れ解放なし。採用を要する新process lifecycleであり、現段階では未作成。

全文preparationと用途profile照合はdurable intent前、generatorの防御的payload検査はHTTP送信前に行う。現workerはintent確定後にgeneratorを呼ぶため、後者のnot-sentをintent前実行と誤称しない。intent後でも未送信が証明された場合の返却は、既「全segment未送信＋全owner終了」に従う。生成HTTPのrequest/response/socket実close、送信後unknown、再連携成功のみ旧epoch取消、現在actor/note/source/role/epoch/取消/期限の同Tx commitは不変更。native sharpの内部threadまでWorker exitで保証できるかはprobe対象で、未測定なのにclosed=trueを返さない。

生成HTMLは既resultProcessor→sanitizer→commitNote。新URL/CSS取得0、画像入力を送ったからといって生成任意参照を許可しない。Office埋込媒体を新assetとして保存する機能は今回追加せず、noticeと元ファイル保持で境界を示す。raw外部error、本文、指示、raster/base64、credential、秘密hashをlogしない。

## 7. 公開一次資料で確認した範囲

確認日2026-09-28。下記は資料調査であり固定版probe/実provider/品質/費用の成功ではない。

- mammothのraw extractionは書式を落とす。HTML変換は見出し等を持つがsanitizationをせず、外部fileを有効にすべきでない。従って既raw outputを構造保存の証拠へ拡張しない。[mammoth README](https://github.com/mwilliamson/mammoth.js/blob/master/README.md)
- ExcelJSは数式を計算せず、保存結果が必要。式/結合/hidden情報を明示して検査する。[ExcelJS v4.4.0](https://github.com/exceljs/exceljs/blob/v4.4.0/README.md)
- OOXMLは本文だけでなくpart/relationship構造を持ち、PPTXにslide/layout/master/notesがある。主XMLの単純再帰だけを全表示内容としない。[WordprocessingML](https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document)、[PresentationML](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document)
- PDF.jsのstopAtErrors既定falseは回復可能データの取得を試みる。text extractionとoperator list/renderは別API。混在/部分判定を本文文字の有無だけで済ませない。[PDF.js API source](https://mozilla.github.io/pdf.js/api/draft/api.js.html)
- sharp metadataはheader読取で完全decodeではない。pages/frameとEXIF向きを別に扱う。画像process gateはmetadataだけで成立しない。[sharp metadata](https://sharp.pixelplumbing.com/api-input/)、[constructor](https://sharp.pixelplumbing.com/api-constructor/)、[orientation](https://sharp.pixelplumbing.com/api-operation/)
- PNG仕様にAPNG animation controlがあり、静止fallbackの存在を単frame証明にしない。[PNG第3版](https://www.w3.org/TR/png-3/)
- OpenRouterはchat/completionsのmultipart画像入力、private画像のbase64、PNG/JPEG/WebP/GIFを説明する。画像数/制限はmodel/provider別。Hollowは単PNG・固定data URIに絞る案。[Image inputs](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding)
- 既定Gemini3.5 Flash Liteの公式頁に画像入力/text出力、context1,048,576/output65,536、input $0.30/M・output $2.50/Mがある。これは画像の日本語認識や実router適合を保証しない。[公式model頁](https://openrouter.ai/google/gemini-3.5-flash-lite)
- Googleの画像token計数/解像度設定にはモデル別差がある。OpenRouter経由の任意modelに同じ計数式を転用しない。[画像理解](https://ai.google.dev/gemini-api/docs/image-understanding)、[media resolution](https://ai.google.dev/gemini-api/docs/media-resolution)

概算は `input_tokens×単価 + output_tokens×単価` と画像固有課金であり、1file1回は金額上限でない。実費用承認0、外部接続0。provider fallback=false/data_collection=deny/require_parameters=trueを維持し、対応providerがなければ失敗。privacy設定を緩めず、zero retentionや課金取消保証へ拡大しない。

## 8. 実装前の最小 probe と依存順

1. **網羅性/終了 probe（最初の提供gate）**: 専用source runnerで日本語DOCXのtable/notes/header/textbox、XLSX複数sheet/結合/式/hidden、PPTX順序/group/table/notes/master、PDF全頁/白紙/文字＋画像同頁/画像頁/破損/暗号化を既知marker inventoryと照合。成功だけでなく部分/未対応分類を確認。必要skillを全文読了してから実Office/PDF資産を扱う。今回実資産は開いていない。
2. **単画像 probe**: 四codec各静止1、EXIF回転/透明/CMYK/日本語細字、各animation、APNG/複数像/破損・寸法/出力byte境界。全decode→変換→再decode寸法/向き/余分metadata0。実認識品質は未検証とする。縮小なしでも色変換の見え方は人が確認する。
3. **所有 probe**: 正常、abort前/途中、timeout、child/Worker error、出力上限、終了未証明でPromise/FD/pipe/枠/pinの解放順を別観測。実終了が成立しなければ該当形式は提供しない。
4. **保存 probe**: §5で採用された案を固定libSQL cloneに適用し、正常/2故障rollback、全旧列/index/trigger/FK/ledger、active/unknown/responseの意味を確認。新形式をtext偽装しない負対を含む。
5. **native generator/DB縦接続**: local loopbackで実raster request shape/全body上限/secret非出力/native3close、異なる用途profile拒否、image1要求1回、文書複数segment1回、後segment失敗の返却0。現在fence/response保存/再起動後処理/旧本文保持/undo/noticeを実DBへ。
6. **同bundle UI**: 各3Office＋文字PDF＋単画像の通常upload/IM-06を最小fixtureで接続、文書と画像のモデル候補差、上限/暗号化/混在理由、通知・履歴・再読、取消と旧本文、未構成機械継続、390keyboard。ACK/dirty/actor-routeは共通不変更を借用し、今回の新用途切替/notice差だけ実再検証する。

先行probeの結果でparser不足を無理に本実装へ埋め込まず、未対応部分と残見込みをManagerへ返す。依存追加/LibreOfficeや外部OCR/wholepage raster化が必要なら別提案。成功した単純sampleだけで任意Office/PDF対応を宣言しない。

## 9. 受入案（Manager固定前の案）

| 案 | 元要件/リスク | 観測可能な結果 |
| --- | --- | --- |
| A 保存/互換 | IM-01/06、CLAUDE、旧保全 | 新実format/recipeを保持し、旧全job/owner/dispatch/quota/undoの値と回復意味不変。移行3対と最新baseline比較 |
| B Office | IM形式表/01/03/06、coverage | 3形式の全対象文字/構造と単位順をLLMへ渡す。媒体未解釈と欠落を区分、暗号化/不明/上限は発注前失敗、旧機械不変 |
| C 文字PDF | IM形式表/01/03/06、混在誤認 | 全頁を分類し、同頁画像/画像頁/不明/空白を取り違えない。gate内正常が全文構造化、gate外の原本/旧本文と理由保持 |
| D 単画像/profile | IM/IN-02、資源/frames | 型付き単rasterとimage modelだけを送信、全frame判定・向き/色/上限、wrong-kind拒否。複数frame先頭成功0 |
| E job/quota/現在権限 | JB/AC10/IN-03、2a契約 | 論理1回/全segment未送信返却、消費基準警告、実closeまでowner保持、current fence・取消・再連携・unknown非再送を新入力でも維持 |
| F commit/表示 | IM-06/JB-02、本文正本 | 失敗/取消旧本文、成功/undo/版/FTS/既asset pin、title/tag/public保持。safe生成HTML/新fetch0、有限noticeの表示 |
| G UI matrix | IM/JB/IN/AC、React19 | 同bundleの各形式/用途モデル/機械分岐/未提供/再読一致、pending/error/390/keyboard。実provider品質とは区分 |
| H 有限資源/保全 | design/CLAUDE/brief | checks/影響回帰/build、実close/停止、最新旧保全、自己通常回収、固定指紋と全停止、条件付き実接続手順 |

これらは追加受入済み条件ではない。特にpartial方針、PDF対象境界、画像値/終了方式、migration例外が未決のまま実装開始しない。

## 10. 旧受入への直接影響候補

現在の実変更は提案1fileだけなので、製品条件のreopenは不要。以下は採用後の実編集開始時に通知する範囲。

- `llmSchema/repository/new migration`：P5b-2a-A/C/D/E/F/H（保存・一意性・intent・参照/回復へ触れる部分）。A/B案なら両群のhookへ広がるため同範囲を縮小したとは主張できない。
- `llm ports/sourcePreparer/generator/worker/request/current/read`：P5b-2a-B/C/E/F/G/H。quota/control式は変更せずDは新入力1回/返却の接続だけを比例回帰。V1の0/25・24/1・24/0・25/0は不変更借用又は同対象短対。
- `acceptUpload/import routing/UI`：P2a-B/C/D/E/Fの新形式受付/子job/機械共存、P5b-2a-G。既全機械行列は共有parser抽出を編集した場合だけP2a-Aにも実影響。
- `openrouter/provider/defaultProfile`と用途選択：P5b-1-C/G、P5b-2a-B/G。PKCE/credential保存/browser/sessionを編集しない限りP5b-1-A/B/DやP5aを一律reopenしない。
- `server.node/build worker配備/新child停止`：P1-EとP5b-2a-H。共通storageの実編集が必要ならP2d-2-B、本文commit呼出意味を変えるならP2c-1-Aへ限定通知。既purge/GC/認証を変更しない計画。
- 共通membership/trash/再連携の既hookは新形式でも同じjob正本を使うC案なら不変更根拠を借用。A/B案でunion化を選ぶ場合、P3a-D/P3b-1-C/D/P2d-2-A/C等の全対象漏れリスクが増える。

## 11. fixture、手順、見込み

提案上限は新private account2/WS1/member2/note6/原本合計10MiB。最初はaccount1/WS0/note1のDOCX原本128KiB以内だけを作成申告する案。その後、同一accountでXLSX/PPTX/文字PDF/画像の計5note、6件目を暗号化又は混在の失敗代表に使う。拒否codec/多frame/各巨大境界は自己test tempの技術fixtureにし、通常DBへ追加noteを無制限に作らない。WS/2accountは新用途の権限接続の必要が生じた時だけ増分申告。全fixtureは承認後のみ。

技術probeは合成/公開ライセンスfixture最大24個・合計20MiB、decode上限超過は小さな宣言/展開fixtureで確認する候補。既private DB/keys/mail/credential/browserstateは流用しない。実Office/PDFの作成/読取時にはdocx/xlsx/pptx/pdfの該当skillを全文読み、repo制約と衝突する操作はManagerへ返す。公開既fixtureの再利用でも実行前に出所と対象を明示する。

新proof作成/停止保全/移行/回収は最新独立baselineからだけ。単一未完了exec、build中製品凍結、自己3100/3101以外非操作。削除前にexact note ID・原本/objects bytes・停止backup/copy監査を通知して利用者案内を待つ。account/鍵/DB/mail/backupは保護保持。今回これらの環境操作は0。

見込みはgate/移行案Cが成立する場合、probeと固定境界4〜6時間、文書縦接続7〜10時間、単画像/profile/有限HTTP4〜6時間、統合UI/保全/候補固定4〜6時間の**計19〜28時間＋独立検証別**。旧案の2b6〜10時間は、CHECK拡張・厳密coverage・native所有の追加依存が見えていない概算なので更新する。A/B移行又はPDF読み順/Office未知partが大きく残る場合はこの見込みを延ばし、未提供を成功へ言い換えない。

内部委譲単位を分けるなら「2b-probe」「2b文書」「2b単画像」の順。これは全体scope縮小ではなく依存順であり、単画像又はOfficeの一部だけで元P5b-2b全体を完了しない。現在helperなし、実装開始許可なし。

## Manager 判断待ち

1. 保存はC（LLM conversion表だけの限定再構築）を例外採用するか。旧表再構築禁止を維持する場合はAの二群設計を再提案する。
2. Officeは文字網羅が証明された場合の非text媒体notice付き構造化を許すか。PDFはstrict全頁gate外をP5b-3未提供とする初期境界を採用するか。
3. 画像の静止四codec、縮小0/4096px/16Mpixel/PNG8MiB/request12MiB、白背景alpha処理、native終了を証明するchild候補をprobe初期値とするか。
4. 画像profileのtoken予算がcatalogだけで決まらない場合の停止条件。任意customを推測で対応済みにせず、probeで確認できたpolicyだけの提供範囲を明示する。

公開資料調査/静的読取だけを根拠にしており、今回の成功テストは0、実OpenRouter/費用0、製品変更0、保護領域操作0。採用回答前に製品へ着手しない。

調査途中の旧推定path/globは不存在で読取できず、`rg --files`で実在するlibsql直下schema/repositories/migrationsへ訂正した。これは静的探索の失敗で、製品テスト失敗・環境異常ではない。全shell読取は即終端回収、runtime/browser/自己fixture/子process未起動、未回収exec0。全文確認後、本提案1fileの所有を返却し、文書を含め全read/write/runを停止する。
