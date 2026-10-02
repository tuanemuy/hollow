# P5b-2b1 document Worker 実装補助

## 結果と範囲

追加の pure 比例根拠は 2026-09-28 17:05:12 JST 開始の限定 unit で 97/97、5.59 秒、exit 0。内訳は既存 31 対＋layout 46 対＋operator 20 対。追加時の所有は `documentWorker.test.ts` と本報告だけで、製品 mjs は変更していない。後述の初回 31 対と合算しない。

2026-09-28 16:57:23 JST 開始の限定 unit は 31/31、1 file、5.13 秒、exit 0。直前の専有 8 path Biome は exit 0。未回収 exec は 0。自己 Worker は exit、stdout/stderr の end または close をすべて観測し、timer を解除した。fixture はメモリ内 synthetic のみで、保存原本・自己 tmp・DB・外部接続は使用していない。

本報告は P5b-2b1 の実装側補助であり、独立受入ではない。固定 B/C/D の Worker inventory・構造化・有限拒否・identity を対象とする。親 documentPreparer の abort/deadline/OOM/unknown 所有、DB、原本の現在認可、生成 API、本文 commit、build 配備、実 UI は主担当の別検査範囲。

## 変更 path

すべて `packages/core/src/adapters/node/llm/` 配下。

- `documentWorker.mjs`: recipe 2 / prompt 1 / docs 4 の境界検証、原本 bytes/hash 照合、有限応答、ネットワーク API 拒否、ログ非転送、postMessage 後の parentPort.close。
- `documentOffice.mjs`: OOXML 全 entry のサイズ・CRC・XML・relationship inventory、DOCX/PPTX/XLSX の明示対応構造、coverage/notices。
- `documentPdf.mjs`: 固定ローカル pdfjs 資材、全ページ operator/layout 判定、text-covered/proven-blank、page/task cleanup。
- `documentPdfLayout.mjs` / `documentPdfOperators.mjs`: 採用済み left-column-v1 の限定幾何・描画分類。
- `documentBlocks.mjs`: code point 境界での paragraph 分割、不可分 table/list、64 KiB × 最大 16 segment、manifest/segment identity。
- `documentIdentity.mjs`: 固定順 manifest と segment hash の純粋関数。
- `documentWorker.test.ts`: 実 Worker とメモリ内合成 Office/PDF による 31 対。

共有 port、既 parser/sourceWorker、親 documentPreparer、型宣言、schema、DI、runtime、依存、管理正本、旧 probe は変更していない。製品 8 path は最終検査後に書込停止した。

## 実装契約

入力は recipe 2 の docx/xlsx/pptx/pdf。原本上限 50 MiB と、既本文の 800 KiB 上限を混同しない。ZIP は全 entry 4096、実展開合計 128 MiB、XML 16 MiB、XML 深さ 128、PDF/slide 200、sheet 100、cell 200000 の既採用境界を保つ。上限超過や未知構造を先頭部分だけの成功にしない。

DOCX は本文、header/footer、footnote/endnote/comment を deterministic な unit 順で処理し、見出し・段落・基本リスト・表の文字順を照合する。PPTX は presentation の関係順、group 内の文字、表、各 slide の notes、非表示 slide を扱う。XLSX は sheet 順・座標・結合 anchor・式と既存 cached result・表示形式・非表示 sheet/row/column を扱う。式の欠落結果を再計算で補わない。疎な行に対する getRows 全配列は作らず、既存 row/cell の走査で hidden を収集する。

Office の許可範囲外 part、外部 relationship、未収容文字、複雑な構造は有限 unsupported とする。DOCX の tracked change/field/altChunk/textbox、複雑な numbering/nested table/vMerge、PPTX の継承 master/layout text、XLSX の図表・drawing 等を成功扱いしない。すべての Office 表現の再現を主張しない。収容した画像等も意味を解釈せず notice にし、画像理解成功とはしない。

PDF は全ページを走査し、採用済み operator と狭い single-column geometry で文字順を証明できる範囲だけを受ける。visual/indeterminate が 1 ページでもあれば全文拒否し、全 blank も NO_TEXT。描画を認めた例外は採用済み white-page background/full-page clip の pure 判定だけ。画像 OCR、複数列推定、PDF 全機能の成功保証はない。

Worker は message 後 parentPort を閉じて自然終了する。単独テストは message だけで成功確定せず、実 exit と両 pipe 終端後に reply を採用する。テストの 10 秒安全 timer は自己 Worker 回収用で、製品 30 秒 deadline の代用ではない。実 exit 不明を closed にする実装はこの Worker に追加していない。

## Identity と配備

`documentManifestHash(source, coverage, notices, segments)` は採用配列 `hollow.prepare / 2 / format / source.sha256 / coverage / notices / segment tuples` を使用する。coverage と notice の object key は明示順に再構築する。schema parse による key 挿入順差を同一視し、unit/page/segment の意味上の順は変更しない。coverage 値・notice count の変更は別 hash。segment hash は `hollow.segment / 2 / manifest / ordinal / firstBlock / blockCount / html`。

PDF module は `createRequire(import.meta.url).resolve('pdfjs-dist/legacy/build/pdf.mjs')` で既存 package を解決し、その package root の `cmaps/`、`standard_fonts/`、`wasm/` をローカル指定する。dynamic import は解決済み file URL のみ。useWorkerFetch/eval/system font は無効化する。

同 bundle 配備では `pdfjs-dist` を external dependency として残し、legacy/build の module/worker と上記同版資材が解決可能である必要がある。Office の依存は既存 `exceljs`、`fast-xml-parser`、`yauzl`。bundle 側の external 指定・依存配置・親 workerPath は主担当所有で、本補助は build を実行していない。source 位置での実 Worker 解決成功を配備済み bundle 成功と読み替えない。

## 検査

| 対象 | 実観測 |
| --- | --- |
| DOCX 本文/見出し/表/付属 unit | HTML 順序と coverage/hash が一致 |
| 基本番号リスト/escape/hidden/media | 構造を保持し notice を返す |
| 日本語 code point 分割 | 元文字列全体一致、segment 上限内 |
| 巨大 table / 16 segment 超過 | RESOURCE_LIMIT、部分成功なし |
| ZIP CRC/暗号 flag、XML/DTD/depth/relationship/未知 part | 有限 code で拒否 |
| 未収容本文/予約 marker/空/CFB/原本 identity 差 | 有限 code で拒否 |
| XLSX 順/座標/merge/formula cache/format/hidden | 保持、cache 欠落は unsupported |
| PPTX 順/group/table/notes/hidden | 全 unit 順を保持 |
| PDF 文字+blank | 全ページ分類・HTML・coverage/hash が一致 |
| PDF 全 blank/visual 混在/複数 anchor/不可視 text/corrupt/201 page | 有限 code、先行部分だけの成功なし |
| manifest key 順差と値差 | 同値 key 順差は同 hash、coverage/notice 値差は別 hash |

実行 command は専有 8 path の `pnpm exec biome check --write` と `pnpm exec vitest run packages/core/src/adapters/node/llm/documentWorker.test.ts --fileParallelism=false` のみ。

- 初回 Biome は 12 指摘で exit 1。複数変数宣言、control-character regex、template 等を専有内で局所修正し、次回 exit 0。
- 16:51:41 JST: 26/26、4.80 秒、session 27231、exit 0。
- 16:55:46 JST: 追加 5 対込み 30/31、session 54358、exit 1。暗号負 fixture が flag だけ変更し、STORE の暗号 prefix 12 B と compressed size が不整合だった。yauzl が entry 通知前に CORRUPT として安全拒否した。
- fixture だけを 12 B prefix とサイズが整合する形へ訂正。復号可能な暗号 PDF/Office の実証ではなく、暗号 ZIP header の拒否対。製品の guard は変更していない。
- 16:57:23 JST: 最終 31/31、5.13 秒、session 61156、exit 0。直前の専有 Biome も exit 0。重複実行を合算して成功件数を増やさない。

全体 TypeScript、bundle/build、production Worker の資材解決、親 cancel/deadline/OOM/実終了不明、最大メモリ・全 50/128 MiB 境界、全 Office/PDF 表現、実 DB・生成 API・UI は未実行。実 Worker と parser は使用したが、合成入力から OS 全資源上限や実文書全般の保証を導かない。

## 返却

製品 8 path と本報告を全文確認し、専有所有を主担当へ返却する。自己 Worker/pipe/timer 0、自己 tmp/DB/外部接続 0、未回収 exec 0。既存 process・fresh・旧 proof・秘密・利用者保存物に操作なし。報告確認後は全文書を含め全操作を停止する。

## PDF pure 比例根拠の追加

主担当から再委譲された `documentWorker.test.ts` と本報告だけを変更した。旧公開 S の `pdf-layout-test.cjs` と `pdf-operators-test.cjs` を全文 read-only 参照し、入力と期待を維持した Vitest 対を製品 `documentPdfLayout.mjs` / `documentPdfOperators.mjs` の直接 import へ接続した。S は `/Users/hikaru/.local/share/hollow/verification/p5b2b0-v1-20260928-NEz2Xy`。旧 script・結果ファイルの実行、書込、再生成はしていない。

layout 46 対は単一左列、見出しのサイズ差、同一文字列の分割、CJK 1 em space、空白の幅と連続性、gap/anchor/advance の exact と直超え、row/column 順、重なり、縦/RTL/回転、不正 metrics、ページ外、入力不変を確認する。operator 20 対は全面白背景/全面 clip の限定例外と、色・後塗り・部分白・曲線・斜め polygon・stroke・graphics state・optional content・transform/save/restore・未閉鎖 clip・画像・非有限 path を確認する。許容 policy 値を広げず、同値分割と保守的拒否の範囲をそのまま検査した。

2026-09-28 17:05:12 JST: `pnpm exec vitest run packages/core/src/adapters/node/llm/documentWorker.test.ts --fileParallelism=false` は 97/97、5.59 秒、session 41179、exit 0。直前の同 test 1 path Biome は exit 0。追加 66 対は pure 呼出で新 Worker を作らず、再実行された既存 31 対の自己 Worker は exit/両 pipe 終端/timer 回収済み。未回収 exec、自己資源は 0。

型宣言 2 path は主担当所有として追加を依頼した。本補助は型宣言も全体型検査も変更・実行していない。pure opcode/geometry を組み立てた根拠であり、実 LO 日本語 PDF の抽出・描画、未知 PDF の全文順、親の取消/終了、bundle 資材配置を証明しない。それらは主担当の実ファイル・親・配備検査へ分離する。

追加後 test source と報告を全文確認し、再委譲の 2 path を返却する。製品 mjs 不変更、全書込・全文書を含む全操作停止、Node 枠返却、未回収 exec 0。
