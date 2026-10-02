# P2a-A parser spike 独立検証

## 判定

機械抽出方式の成立根拠として受け入れ可能。固定された22ケースの実抽出と19件の検査を独立再実行でき、出所・ファイル形式・抽出結果を照合した。PPTXの語間空白が欠落する問題を追加確認したため、本体へそのままコピーして完全抽出を宣言する根拠にはしない。

これはP2a-Aのproduction接続・upload・job・原本保管・資源境界・機能全体の完了判定ではない。

- Verifier: `/root/verifier`。
- 実施日時: 2026-09-06 02:25〜02:30 JST（Asia/Tokyo）。
- 固定対象: `/tmp/hollow-parser-spike.bTIgjC`。
- 対象hash: `db79c84d5030752aa8849d72213bc5a0878736d355978806cd31224777db81b1`。node_modulesを除く35files、relative path順、path+NUL+bytes+NUL。開始・終了とも一致。
- 再実行領域: `/tmp/hollow-parser-verify.71L6Ei`。fixturesとextract/validateをコピーし、固定対象のnode_modulesを読み取り用symlinkで参照。依存導入・更新・generate/downloadの実行はしていない。
- 本体repoのコード、production、DB、mailbox、ブラウザは検証・操作していない。repoへの書込みは本レビューだけ。

## 確認結果

| 対象 | 判定 | 根拠 |
| --- | --- | --- |
| 固定成果の同一性 | 合格 | 35file fingerprint一致。sources.jsonの11件すべてでfixture/license/fontのbytes・SHA-256が一致。 |
| 公開元との一致 | 合格 | sources.jsonに記載された11 URLをread-onlyで再取得し、全件のbytes・SHA-256が一致。Apache POI/PDF.jsのcommit固定URL、Notoのmain URLを実照合した。 |
| 実ファイル形式 | 合格 | `file`によるOOXML/PDF/CFB/font識別。第三者4 Officeと生成3 Officeを`unzip -t`で全entry検証し正常。Content_TypesにはWord/Spreadsheet/Presentationの正規main content typeが存在する。暗号DOCXはCFB暗号container、正常PDFは実pageを持つ。拡張子だけ変更したXMLを正常系の根拠にしていない。 |
| 実抽出22ケース | 合格（spike範囲） | Node v22.22.3で別領域の`node extract.mjs`を実行。新しいresults.jsonが生成され、旧22結果と所要milliseconds以外の全field（本文・状態・hash・bytes・pageKinds・エラー・個数等）が一致。 |
| 既存検査19件 | 合格 | 実抽出後の新results.jsonに`node --test validate.mjs`を実行し19/19成功、約144ms。この検査だけの成功を実抽出の再実行とは扱っていない。 |
| 原文との照合 | 条件付き合格 | 下記の独立XML/Poppler照合で本文を確認。PPTXに語間空白欠落がある。 |
| licenseの保持・出所整合 | 合格（記録範囲） | POI LICENSE/NOTICE、PDF.js LICENSE、Noto SIL OFLが取得元bytesと一致。parserの実導入package version/license表記も報告と整合。個別fixtureの全権利を法的に確定した検証ではない。 |

## 原文を使った独立照合

`unzip -p`とsystemの`xmllint`でOffice原文XMLを取り出して確認した。spikeのparserだけを正解oracleにはしていない。

- POI DOCX: document.xmlの文字列にあるpage1/page2、フォント説明、青色の説明が抽出結果に存在。
- POI XLSX: sharedStrings.xmlのsheet内容とセル文言が結果に存在。生成XLSXのsheet1.xmlにはB2の式`B1*2`とcached値246、A5:B5のmergeがあり、結果の246と結合セル重複を説明できる。
- POI PPTX: slide1/slide2のXML本文を読み、タイトル・副題・箇条書き文言が結果に存在。
- 第三者日本語PPTX: 原文slide1.xmlの日本語文とGothic文字・表・引用を結果で確認。ただし書式run間の空白は失われる（下記）。
- 生成日本語Office: generate.mjsのwriter入力と結果を比較し、日本語段落・XML予約文字・表のセル・数値が反映される。XLSX生成には抽出と同じExcelJSを使っているため、日本語XLSXは異なるwriterでの相互運用試験ではない。第三者POI XLSXが別出所の正常系を補っている。
- PDF: 日本語生成PDFは独立Poppler抽出との空白正規化後の全文一致を再検査。第三者basicapi.pdfも`pdftotext`で3pageの章・節・page表示を独立確認した。footerの細かな読順とlayout再現は評価対象外。

画像のみ・空白・混在PDFはgeneratorの描画操作と再抽出pageKindsを照合した。混在PDFは2page目が画像で、実結果にそのpageの文字がないことを確認。image operatorがOCR対象文字の存在証明になるとは判定しない。

## 本体に反映する追加指摘

### S1: PPTXのrun境界で語間空白が消える

優先度: 本体の抽出受け入れ前に修正。

固定fixture `poi-japanese.pptx` の原文slide1.xmlでは、書式の違う文字列の間に独立した空白`a:t`がある。system XML抽出では「Bold」「空白」「italic」「空白」「underline」等を確認した。spike結果は `Bolditalicunderlinesuperscriptsubscript` となり、単語が連結される。

extract.mjsのorderParserはtrimValuesを指定していない。実導入fast-xml-parserのOptionsBuilder.jsでは既定がtrueで、paragraphsは各a:tを空区切りで連結する。空白runが削られる原因と整合する。layout差だけではなく語境界の欠落なので、通常の内容保持条件に含める。

Managerへの判断提案: PPTX抽出時にXML textの必要な空白を保持し、先頭末尾空白・書式run間空白・`a:br`等の区切りを含むfixtureを本体の受け入れへ追加する。現在の19検査は日本語の一部文字列や先頭順を確認しているが、この語間欠落は検出しない。

### S2: preflightは全parserの安全境界として未完成

spikeは全ZIP entryの宣言サイズを加算し、読み取るXMLの実サイズを検査する。ただしMammoth/ExcelJSはその後元bufferを独自に読み直す。`xml()`のDOCTYPE/entity拒否もDOCXではdocument.xml、XLSXではworkbook.xml、PPTXではpresentation/rels/slideだけに適用される。全related part・メディア・別decoderの実展開量がこのguardで覆われたとはいえない。

Managerのdesign.mdにある、worker/child processのdeadline、実展開量・XML深度・任意ネットワーク制限を本体で検証する判断は妥当。spikeのUNSAFE_XML成功1件をもってOOXML全体のXXE拒否・ZIP bomb耐性・network遮断成立と扱わない。

### S3: 再取得の固定性と検査の強さ

Notoのmain参照は今回全bytesが一致したが、download.mjsは既存sources.jsonのhashを照合する処理を持たず、新しいmanifestで上書きする。将来の再取得を固定できるコードではない。本体へfixtureを持つ場合はcommit pinまたは既存hashの強制照合を追加する。

既存validateは第三者Office/PDFの4件についてstatus=textを主に検査しており、全文の意味的網羅を保証しない。今回の独立XML照合を補助根拠とし、本体では関連part台帳と語境界・欠落理由を対象にした期待値を持たせる。

## 未検証とManager判断

採用ライブラリで代表的な実DOCX/XLSX/PPTX/PDFから文字を得られるという技術判断は支持する。報告のmerged cell重複、cached値なしformula、関連part、混在PDF、暗号/破損の区別に関する限界は実コード・結果と整合している。

design.mdが採用した「混在PDFの取得文字を表示し、未取得pageを明示する」方針は、スパイク報告の「全文を要連携へ送る」提案とは異なるManagerの製品判断である。spikeはどちらのUIも実装・検証していない。本文とcoverage/恒久noticeを分離する判断は今回の部分抽出結果に合う。

以下は本体側の未完条件として保持する。

- S1の語間区切り、merged cell/未評価formula/型別cell投影、chart・SmartArt・speaker notes・header/footer等の関連part。
- 50MB入力、ZIP/CRC/深度/CPU/memory上限、deadline終了、任意network遮断、Linux配布とoptional native依存。spikeのRSS値を本番上限に流用しない。
- vector文字、壊れたfont mapping、隠しOCR層、読順、画像pageに文字があるかの確定。
- 暗号XLSX/PPTXの別サンプルと旧Office。実証した暗号OfficeはDOCXの共通CFB識別まで。
- dependency auditの再実行・修正互換性、個別fixtureの追加権利表示調査、将来の再配布条件確認。今回の固定35filesには生audit JSONがないため、severity内訳は元報告の記録を利用し、独立検証済みとは扱わない。
- production接続、HTML escape/sanitize、原本認可、永続job、異常時の一貫性、ブラウザ体験。

固定成果は変更なし。再実行領域とresultsを削除せず保持した。ブラウザ・本体サービス・DB・依存へ変更はない。
