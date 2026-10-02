# P5b-2b1 V2 文字PDFの寛容回復拒否案

## 確認済み欠陥

2026-09-29 00:17:31 JST、P5b-3a0の自己tail-fault.pdf（1115B、3頁/末尾Flate stream不正）を現製品preparePdfへreadonlyで1回入力し、accepted=true/totalPages3/lastPageBlank=true/blocksCount2を観測した。sourceは受入c98a0e2のまま、全child/pipe実close。原文/hash/rawerrorは出力0。証拠は [現gate報告の到達点と停止節](P5b-3a0.md) と新Pのlegacy-pdf-compare.json。

原因はPDFjsがstream decodeの不正を警告後に空内容へ回復できる一方、現preparePdfはverbosity0で警告を捨て、空text/空描画をproven-blankとすること。stopAtErrors=trueだけではこの反例を拒否しない。全PDF一般の完全性問題へ拡張した指摘ではなく、現1反例で固定Cの「破損を全文発注前拒否」が不成立。

P5b-3a0のprototypeはverbosity1で警告を有限countへ捕捉し、全頁/cleanup/child終端までの警告を全体拒否して同反例を解消した。これは製品修正の代替根拠ではない。旧正例の視覚/正常受入を崩さないかは製品回帰で別確認する。

## 最小修正

第一案の製品変更は `packages/core/src/adapters/node/llm/documentPdf.mjs` だけ。PDFjsのwarning有効化と有限警告観測をpreparePdfの一回の処理へ閉じ、全頁準備・page cleanup・task.destroyが終わって警告0の場合だけresultを返す。警告があれば既 `LLM_DOCUMENT_CORRUPT` で全体拒否し、先頭頁のblocksを返さない。新failure code/DTO/portは追加しない。

固定PDFjsのwarn経路はconsole出力なので、raw引数を保存・転送しない有限カウンタを用いる。現在preparePdfの製品callerは専用documentWorkerのみで、1Worker1要求の隔離内に限定される。既console関数は開始時に保存し、task.destroyを含むfinallyの後に必ず復帰する。アプリmainのconsoleや共有prototypeへ変更を加えない。PDF module直接の並列利用を新たに許す設計へしない。

もし警告観測を専用Worker境界で持つ必要が判明した場合は、documentWorker.mjsの追加変更と成功message時点/実exitの影響をManagerへ返してから編集する。少なくともmessage成功だけで実Worker終了を証明しない現親の所有契約は変更しない。rawstderrをログへ出す新診断も追加しない。

任意warning拒否は保守的なfalse negativeを持つ。正常入力がfont/資材警告を出した時は、その警告を無視して通さず固定local cmaps/standard_fonts/wasmと既PDFjs依存資材を確認する。新font取得、system font無制限利用、外部fetch、toolinstallは未採用。正常fixtureにも警告があれば有限stage/countで報告し、必要資材と拒否範囲を切り分ける。全warning文字列を分類する脆い文言allowlistは作らない。

## 版・保存済み結果

recipe2/prompt1、manifest/hash算法、textBlocks、旧V1/image3、DDL/台帳、profile/生成wire/枠はすべて不変更。正常PDFで生成されるblocks/coverage/noticeは旧byte同値・hash同値を比較する。新しいrenderer/抽出algorithmへ変える修正ではなく、不正入力を拒否する境界補正。

すでに完成したnote/原本/履歴への自動再変換・書換え・migrationは行わない。旧saved all-responseがこの不正PDF由来の場合、再準備で既CORRUPTとして拒否されることを想定する。hash不一致を捏造してSOURCE_CHANGEDへ置換せず、現在workerが返す既有限codeを確認する。再送0、旧本文/版/送信済み消費保持、owned資源実closeを要求する。不影響の正常recipe2 all-responseは従来どおり後処理だけ成功し、V1/image回復は変更なし根拠を借用する。

## 比例回帰と直接影響

| 対象 | 最小の確認 |
| --- | --- |
| 旧P5b-2b1-C | 1115B同反例を実Workerで修正前受理/修正後CORRUPT。正常text＋blank、末尾破損、既visual/order/暗号/頁上限・layout/operator代表を維持 |
| 旧2b1-A/D/F・2a-B/C/F/HのPDF部分 | 正常prepared byte/hash不変、現recipe2 mapper/型不変更を静的確認。新DB対は不正旧all-response非再送/旧本文・版・消費保持＋正常PDF回復の2代表に限定。全旧行列の再実行は不要 |
| 旧2b1-I/J・P1-Eの資材/checks部分 | documentWorker/親の正常・失敗実exit/pipeclose、sourceと最終dist双方のlocal PDF資材解決、最終build/指紋/全停止。未構成auth全面再演不要 |
| 旧2b1-H・2a-Gの失敗投影 | 同bundle本人UIで不正PDF原本保持/有限理由/JB・計数0/再読を最小代表。UIコード/受付/現在権限hook不変更を借用 |

reopen ID/数はManagerが確定する。変更が上記候補へ実際に届く範囲だけ扱い、音声・画像・Office等の受入を全面取消しない。

予定編集はdocumentPdf.mjs、既documentWorker.test.ts、必要なllmDocument.integration.test.tsとfixture helperだけ。テストは既Worker/PDF純粋対＋parent11/source49の直接接続、文書DB既25のうちPDF/current回復代表と新2対を候補にし、現fileの実件数を開始時に照合して重複合算しない。規定typecheck→lint:fix→format、wholeunit、影響Node、凍結buildを精算する。全体generator/quota/authはコード不変更で既受入借用。

正常の必要public資材は現gateのtext-vector-blank.pdf（1116B）中の文字/白紙はvector頁を含むため、そのまま文字PDF正常全体には使わない。既unitのtext＋blankを主正常とし、日本語2頁は既公開LO由来pptx-normal.pdf（12419B）のexact出所/内部byte対応を別許可で限定copyする案。旧proof実行0、新LO/render0、旧visualの不変適用と新製品prepare成功を分ける。公開asset利用未許可の現時点ではcopyしない。

## 最小実UI・所有案（未許可）

新0700修正proof、DB保全込64MiB/scriptlog8MiB/material128KiB、自己synthetic逐次DB1/storage1を第一案とする。開始基点は最新qiCEdU/final23:50:46のまま。fresh起動/認証/再移行0、必要な停止保全と公開helperだけ別exact申告する。旧gatePの材料/証跡は保持し書換えない。

同bundleUIは新account1/WS0/不正PDFnote1・原本1115B・生成0が最小。通常local契約連携→AI upload→prepare失敗/JB/原本保持/usage0・予約0/再読。失敗が発注前であるnative counterを別観測。正常PDFはWorker/source/distの限定検査で補い、正常UI再生成/ACK/undoの反復は不要と考える。Managerが正常UIを要求する場合だけ2note/正常12419B/生成最大1へ増分提案する。通常回収は停止backup/ exact量/利用者通知後の別許可。

見込みは実修正・局所対20〜40分、DB/規定checks/build30〜50分、最小UI/保全/候補固定30〜60分、計約90〜150分＋独立。現時点は提案だけで製品/test/build/DB/runtime/新材料0。gateの旧不合格/現在成功/製品不合格を別記したまま、Managerの固定条件と正式実行許可を待つ。
