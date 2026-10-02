# P2a-A parser spike

## 対象と結論

報告時刻: 2026-09-06T02:18:02+09:00。Node22での独立したparser成立検証。web production接続、upload、永続原本、job、P2本体の実装・受け入れではない。

一時領域: `/tmp/hollow-parser-spike.bTIgjC`。コード・package・lockfile・node_modules・fixture・抽出結果はすべてこの領域だけに置いた。リポジトリへの書込みは本報告だけ。本番プロセス、DB、mailbox、ブラウザーには触れていない。

機械抽出の採用候補は成立した。Mammoth、ExcelJS、ZIP/XMLによるPPTX、PDF.jsは、第三者の実Office/PDFと別ライブラリ生成の日本語ファイルから文字を得られる。ただしspikeの文字抽出成功は内容の網羅を保証しない。merged cell、未評価formula、関連part、混在PDFを検出して結果の完全性を別に記録する契約が必要になる。

## 環境・再現

- 実行: Node `v22.22.3`、macOS。PDF.js6.3.289のNode下限22.13を満たす。プロジェクトの22.12下限は採用時に変更が必要。
- parser: mammoth1.12.2 / exceljs4.4.0 / yauzl3.4.0 / fast-xml-parser5.11.1 / pdfjs-dist6.3.289。
- 暗号Officeの分類追加: cfb1.2.2。OLE内部streamを読むために使用し、復号はしない。
- fixture生成だけ: docx9.6.0 / pptxgenjs4.0.1 / pdfkit0.17.2。これらをproduction依存へ追加する必要はない。
- 独立照合: PATHのPoppler25.10.0 `pdftotext` / `pdftoppm`。production必須依存としては未採用。
- 依存導入は一時領域で `npm install --ignore-scripts --no-audit --no-fund`、追加分類用に `npm install cfb@1.2.2 --ignore-scripts --no-audit --no-fund`。

実行順は一時領域をcwdにする。

```sh
node download.mjs
node generate.mjs
pdftoppm -f 1 -singlefile -scale-to 1000 -png fixtures/generated-ja.pdf fixtures/scan
node generate.mjs
node extract.mjs
node --test validate.mjs
/usr/bin/time -l node extract.mjs
```

`download.mjs`は第三者fixtureとlicenseを取得し、URL/bytes/SHA-256を`sources.json`へ保存する。`generate.mjs`は成熟したwriterのAPIでOOXML/PDFを作り、そこから切断・part欠落・slide順序変更・DOCTYPE入りの変異fixtureを生成する。拡張子だけ変えたXMLを正常Officeの根拠にはしていない。

`extract.mjs`は21の実ファイルと、暗号PDFの正しいpassword指定を含む22ケースを実行し、全文・メタデータ・分類・所要時間を`results.json`に保存する。`validate.mjs`の19assertionは02:13 JSTに全成功。最終抽出実行もexit0、1.13秒、最大RSS223,821,824 bytes。小規模fixtureでの値であり、50MB入力の負荷上限の根拠にはしない。

## fixture 出所・再配布

| fixture | 出所と固定revision | 結果 |
| --- | --- | --- |
| poi-SampleDoc.docx | [Apache POI SampleDoc](https://github.com/apache/poi/blob/3e24e7d6f4151b993232ee67faae650ade533712/test-data/document/SampleDoc.docx) | 本文144文字 |
| poi-SampleSS.xlsx | [Apache POI SampleSS](https://github.com/apache/poi/blob/3e24e7d6f4151b993232ee67faae650ade533712/test-data/spreadsheet/SampleSS.xlsx) | 3sheet、203文字 |
| poi-SampleShow.pptx | [Apache POI SampleShow](https://github.com/apache/poi/blob/3e24e7d6f4151b993232ee67faae650ade533712/test-data/slideshow/SampleShow.pptx) | 2slide、221文字 |
| poi-japanese.pptx | [Apache POI with_japanese](https://github.com/apache/poi/blob/3e24e7d6f4151b993232ee67faae650ade533712/test-data/slideshow/with_japanese.pptx) | 1slide、573文字、日本語を確認 |
| poi-encrypted.docx | [Apache POI password-protected DOCX](https://github.com/apache/poi/blob/3e24e7d6f4151b993232ee67faae650ade533712/test-data/document/bug53475-password-is-pass.docx) | ZIP破損ではなく暗号Officeと分類 |
| pdfjs-basicapi.pdf | [Mozilla PDF.js basicapi](https://github.com/mozilla/pdf.js/blob/716aff9d50c08b4bec3e350540a3f05aea89dedc/test/pdfs/basicapi.pdf) | 3page、267文字 |
| generated-ja各形式 | 上記writerで本spikeが生成 | 日本語、XML予約文字、表セル、数式cached値、rich text、slide順、複数pageを確認 |
| generated-image.pdf | 自作日本語PDFをPopplerでPNG化しPDFKitに埋込 | 有効な1page画像PDF、文字0・画像operatorあり |
| generated-blank / mixed.pdf | PDFKitで空page、文字page＋画像pageを生成 | 空白/画像/混在をpage単位で区別 |

Apache POIの共通配布条件は[Apache-2.0＋同梱subcomponent条件](https://raw.githubusercontent.com/apache/poi/3e24e7d6f4151b993232ee67faae650ade533712/legal/LICENSE)。`fixtures/poi-LICENSE`と`poi-NOTICE`を取得して保持した。再配布時にはlicense・著作権・NOTICEを保持し、改変を明示する。個別fixtureの権利表示が追加で存在する場合はそれも維持する。本spikeではfixtureをrepoへ再配布していない。

PDF.jsの[Apache-2.0 license](https://github.com/mozilla/pdf.js/blob/716aff9d50c08b4bec3e350540a3f05aea89dedc/LICENSE)も`fixtures/pdfjs-LICENSE`へ保持した。日本語fontは[Noto CJK](https://github.com/notofonts/noto-cjk)のNotoSansCJKjp-Regular.otfを使用し、同梱SIL OFLを`fixtures/noto-LICENSE`へ保持した。fontの単体販売禁止・license保持等の条件があり、生成文書の再配布とは分けて扱う。OS付属fontは使用していない。font取得URLはmain参照なので、再取得時は`sources.json`のSHA-256で同一性を検査する。

## 実抽出・失敗の区別

| ケース | 観測 | 本体への示唆 |
| --- | --- | --- |
| 日本語DOCX | 62文字。段落・表セルの文字を保持 | raw textをHTML escapeする。表layout再現は要求しない |
| 日本語XLSX | 73文字。cached formula246、rich text保持 | formulaを実行しない。merge重複は投影側で修正する |
| 日本語PPTX | 2slide、46文字。表セルも抽出 | presentation.xmlのID→relationshipで順序決定。逆順fixtureが実際に逆順になるassertion成功 |
| 日本語PDF | 2page、50文字。予約文字と日本語を保持 | whitespace除去後、独立Poppler抽出と全文一致 |
| 画像PDF | 有効PDF・画像operatorあり・text0 | 「破損」ではなくAI必須候補 |
| 空白PDF | 有効PDF・画像なし・text0 | 画像PDFと同一とは限らない。空白として理由を表示する候補 |
| 混在PDF | 1頁textあり、2頁textなし/画像あり | 文書全体にtextありというだけで完全抽出扱いしない |
| 切断DOCX/XLSX/PPTX | ZIP中央ディレクトリ不正 | 破損として失敗。空本文成功にしない |
| 切断PDF | InvalidPDFException | 破損として失敗 |
| password PDF | PasswordException。正しいpasswordでは文字抽出成功 | UIで解除済みファイルの再uploadを案内。spikeの復号は判定確認のみ |
| 暗号DOCX | OLE CFBのEncryptionInfo＋EncryptedPackage streamあり | 通常ZIP parserのエラーを破損に誤分類しない |
| 必須part欠落DOCX | MISSING_PART | 未対応/破損の理由を区別する |
| DOCTYPE入りPPTX | UNSAFE_XML | entity展開前に拒否。危険内容を無視した成功にしない |

## 採用APIと限界

[Mammoth](https://github.com/mwilliamson/mammoth.js)のextractRawTextは段落ベースの抽出で、出力サニタイズは行わない。buffer入力、外部ファイルアクセス無効、HTML escapeを前提とする。画像内文字、header/footer、脚注等の網羅性は本spikeだけでは未確認。ZIP relationship/part台帳から、本文以外に文字を持つpartがあることを検出し、実装か警告なしには完全抽出を宣言しない。

[ExcelJS](https://github.com/exceljs/exceljs)はcached formula resultを返し、計算engineではない。merged cellはmaster値が従属cellにも現れ、本spikeでは「結合セル」が2回出た。本体はmaster cellだけを出力し、必要ならcolspan/rowspanを持つ素朴な表へ投影する。未計算formulaは空文字にせず「計算結果なし」と式の文字列を保持する。数値・boolean・error・date・hyperlink・rich textの型別投影を実装し、chart・drawing・外部linkを見つけたら下記coverage台帳へ記録する。

PPTXは[Microsoftのslide text抽出](https://learn.microsoft.com/en-us/office/open-xml/presentation/how-to-get-all-the-text-in-a-slide-in-a-presentation)と同じくDrawingML段落を読む。本spikeはslide本体のtext/表だけ。chartのタイトル・系列名・cached数値、SmartArt data、speaker notes、embedded workbook等は参照partを辿っていない。これらは機械抽出できるものがあるため、一律「AI必須」で代替しない。本体ではrelationshipを列挙し、chartのcache、notesの本文placeholder、SmartArt dataの文字を追加抽出する。重複するlayout/masterの定型文字とslide番号は分離する。未対応partが残れば場所・種類を警告し、元ファイル確認への導線を出す。

[PDF.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html)はUint8Array入力、legacy/build、package内CMap/font/wasm、eval無効で実行した。page cleanupとloading task destroyを行う。page単位textとimage operatorを記録したが、image operatorは「OCRが必要な文字を含む画像」の証明ではない。図だけのpage、vector化文字、不正font mapping、隠しOCR層、複雑な読順は未検証。render/OCRで初めて内容を確定できる場合がある。

[yauzl](https://github.com/thejoshwolfe/yauzl)のlazyEntriesと実サイズ検査を使用し、一時展開ファイルを作らずXMLだけ読む。32MB展開総量/2000entries/4MB XMLというspike用limitを設定した。本番の50MB許可と同値ではない。XML深度、ZIP bomb、CRC異常、deadline kill、50MB負荷、Linux配布時のoptional native依存は未検証。CPU/memoryを制限できるworker processで実行し、これらの試験をP2本体の受け入れに加える。

## partial extraction の契約案

parser結果は本文とは別に`coverage`と`notices`を持つ。jobの実行成功と「全内容を取り込めた」は別の事実にする。

- `coverage`: `complete / partial / no_text`。part/page/cell単位に`extracted / empty / unsupported / needs_ai / unreadable`と理由を記録する。
- `notices`: `code`、元part/page位置、利用者向け説明、次の操作、欠落可能性を保持する。元ファイルに属する恒久台帳とし、90日job履歴の削除で失わない。
- parser自体の破損・暗号化・資源上限・未対応containerはfailure。本文の一部が得られても完全successにはしない。
- 機械抽出可能な未対応partは`unsupported`。実装を追加するか、本文を「一部のみ」と表示し、明示的に欠落と元ファイル確認を示す。単純なLLM構造化だけでは未取得partを補えない。
- OCR等が本質的に必要なpageは`needs_ai`。未連携なら原文どおり本文空の「要LLM連携」を維持する案を推奨する。抽出できた文字はprivateな中間成果物に保持し、partial本文を通常の完成ノートとして公開しない。明示的AI不使用は原文どおり失敗とし、設定を変えた再取込を案内する。
- mixed PDFは`partial`の内部結果を得ても、一部pageに`needs_ai`があれば上記AI必要経路へ進める案。元の要件はmixedを列挙していないため、最終UI扱いはManager判断とする。
- 真に空白のPDFは「文字・画像を検出できませんでした」を別理由にする案。画像operatorの有無だけで確定せず、vector contentも確認する。判定不明なno_textを空白成功にしない。
- AI補完はpage画像/対象partを実際に入力した場合だけ未取得内容を補完できる。機械抽出文字を整形しただけの場合、partial noticeを消さない。検証不能ならcompleteへ昇格しない。

`complete`は対応scope内の全part/pageを処理し、未対応・未読箇所がない場合だけ使う。純粋なlayout差はnoticeにしても内容欠落とは分ける。この契約は提案であり本体に未実装。

## 依存リスク

02:12 JSTの`npm audit --json`はmoderate2/high2。highはfixture writerのpptxgenjs→image-sizeであり、production parser依存ではない。moderateはexceljs→uuidのv3/v5/v6 buffer境界指摘。ローカルExcelJSでのuuid参照はconditional-format writerのv4だったが、監査を無視した安全宣言はしない。採用時に依存overrideの互換検証または代替を判断し、writerをruntimeへ混入させない。audit auto-fixの古いmajorへの降格は実施していない。

旧`.doc/.xls/.ppt`の抽出、実encrypted XLSX/PPTXの独立サンプル、複雑なchart/SmartArt/notes/header/footer、巨大ファイル、network遮断の実験は未実行。暗号OfficeはDOCX実ファイルの共通OLEコンテナ識別が成立した範囲である。

## 対象hash・保持状態

- repo commit: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。本作業ではcommitなし。
- P1コードfingerprintは開始・終了とも`1c1fa705516aac96bc17769e40ac61bdbf016bf9a1e1d9812a3089406937fba0`、376files。従来の未commit/未追跡を含む算法で、`.goal-implement/`とignored成果物を除外する。
- 一時成果物fingerprint: `db79c84d5030752aa8849d72213bc5a0878736d355978806cd31224777db81b1`。node_modulesを除く35filesをrelative path順に並べ、`path + NUL + bytes + NUL`のSHA-256。
- `extract.mjs`: `cdac0b3f556babc6f9f6d0a7023ec565da50be3e301111ed37d8fbf9fa8dd5fc`
- `validate.mjs`: `eb68e4913ca2b6bfa74c307b2716b0c83d92820dc3826202f9582ffb2ef5ae2e`
- fixtureごとのhashは`sources.json`と`results.json`に保持。生成PDFは作成時刻を含むため再生成でbyte hashは変わり得る。

一時成果物は削除せず保持し、作業を停止する。次はManagerの採用判断とP2本体の委譲を待つ。
