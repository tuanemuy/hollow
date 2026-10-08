# P2a 独立レビュー

## 判定と対象

P2a-A/B/E/F と P1-D は部分受け入れ可能。P2a-C/D は P2-V1、P2a-D は追加で P2-V2 により差戻し。修正後は両問題と影響範囲を再検証する。P2 全体や AI 実接続の完了を意味しない。

- Verifier: `/root/verifier`。実装担当から独立し、補助エージェントは使用していない。
- 実施: 2026-09-06 03:27:32〜03:42:51 JST（Asia/Tokyo）。ブラウザ・環境操作は03:40まで、以降は報告記録のみ。
- 対象 commit: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。
- fingerprint: `2e732dcd2c988afcb19e6f6dbecd2d162e98f82dde41c0ac63f5c30a6c544e76`、441 files。開始時と 03:39:45 に一致。算出は実装報告どおり、`git ls-files -co --exclude-standard -z` の重複除去・ソート後、`.goal-implement/` を除外し、path+NUL+bytes+NUL の SHA-256。
- 入力: `brief.md`、`design.md`、`plan.md`、`phases/P2a.md`、`spec/scenario/import.md` とジョブの元要件。spec / spec-implement スキルは不使用。goal の変更なし。
- 本体コード・依存・管理台帳の変更なし。書き込みは本レビュー、独立 fixture、ブラウザ経由の検証データのみ。

## ID 別結果

| ID | 判定 | 独立した根拠 / 残る制限 |
| --- | --- | --- |
| P2a-A | 合格 | production で実 DOCX/XLSX/PPTX/日本語文字 PDF・画像/混在 PDF を受理。DOCX 日本語段落・表のセル123、XLSX cached式246・rich text・merge、第三者 PPTX 日本語/Gothic文字・語間空白を本文で確認。破損/暗号 DOCX は別理由の失敗。実 parser 31 tests を独立再実行。S1〜S3 は下記。 |
| P2a-B | 合格 | 単体 HTML は原本保存・変換中の詳細へ SPA 遷移後、自動で本文出現。単体 Markdown は実 File の drop event、text は選択から変換し、日本語・太字/list・改行/XML予約文字を確認。原本 download の hash 一致、再読込・process 再起動後の DOCX/既存手書き本文と原本保持を確認。同一ファイルの選び直しには D の V2 が影響する。 |
| P2a-C | 不合格 | 正常画像 PDF/PNG/WAV は要AI連携、画像 PDF の AI不使用は非公開の失敗で理由/履歴/原本を表示。混在 PDF は取得 page の本文と未取得 page:2 notice を保持。しかし明白な破損 GIF/FLAC も要AI連携で成功扱いになる（V1）。 |
| P2a-D | 不合格 | 14ファイル混在で正常12・破損/暗号2失敗、正常本文を保持。同名 PDF20件を別 note として完了。容量/stream/予約/内容判定の独立実DB・parserテスト成功。ただし media 内容判定の V1 と選択除去後の V2 が残る。100件/500MiB等の全境界は既存成功テストとコードを再利用し、実100件負荷は繰り返していない。 |
| P2a-E | 合格 | Aの履歴・子内訳・理由・ticker・完了/失敗toastを実表示。Bは履歴空。失敗2件一括retryは新jobを作成し、元が壊れたままなので再度失敗、正常分は維持。実UI取消確認後20件中2完了/18未開始取消。二重retry・queued取消/running完了・手編集後上書き拒否は独立実DBテスト成功。V1の誤った成功表示はC/Dの同一原因として差戻す。 |
| P2a-F | 合格 | 独立実DBテストで wake無し起動回収、DB再接続+新runner、2接続atomic claim、lease失効後の旧worker heartbeat/commit拒否、新job/版/所有者guard、二重反映拒否を確認。実productionの再起動と原本/本文保持も確認。強制電源断やnative disk-error復旧は未検証。 |
| P1-D | 合格（再受け入れ可能） | 共有Client queueのコード・3 tests、Hollow15/outbox/UoW統合回帰を独立実行。Aの旧P1ノートを編集保存し再起動後も再表示。BからAのdetail/editを拒否。既存の認証/退避/隔離等のP1合格根拠は保持する。 |

## 差戻し

### P2-V1: 明白な破損画像・音声を「要AI連携」で成功扱いする

優先度: 受け入れ前修正。P2a-C/D、IM-01/IM-02。

独立作成した `/tmp/hollow-p2-verify.Cr6J0l/broken.gif` は ASCII `GIF89a12345678901234567890` + 改行の25bytes、`broken.flac` は ASCII `fLaC12345678901234567890123456789012345678901234567890` + 改行の53bytes。正常メディアを欠損させた曖昧なfixtureではなく、画像フレーム/音声payloadを含まない固定データである。

1. Aのアップロード画面で2ファイルを他の正常/破損Officeと一緒に選び、AI不使用は選ばず開始する。
2. 履歴は2件を完了、詳細は「個人 / 非公開 / 要AI連携」「本文の生成にはAI連携が必要です」と表示する。破損理由や失敗retryではない。
3. 実DBでも両方が `originals.state=needs_ai, coverage=no_text, conversion_jobs.state=succeeded`。

原本 note は GIF `01a072d4-e140-711e-9151-2d5a05f36ff8`、FLAC `01a072d4-e193-71dd-8e5d-244cd1803728`。独立 decoder の `ffmpeg -v error -i broken.gif -frames:v 1 -f null -` は exit69 / decode invalid、`ffprobe -v error broken.flac` は exit1 / Invalid data。GIFのffprobeによるheader認識だけは成功するため、これをdecode成功・失敗の根拠にしていない。

原因は `parserWorker.mjs:390` 以降の限定header判定と `application/import/processJob.ts:132` 付近の image/audio 早期 `no_text` 分岐。GIFはmagic/最低長/寸法、FLACはmagic/42bytes以上だけで判定し、job側は原本を読まずAI_REQUIREDを返す。PNG/JPEG/WebP/WAV/Ogg/MP3/M4Aも同様に限定headerの経路を持つ。この全形式で独立破損fixtureを実行したわけではないが、修正影響範囲はGIF/FLACだけに限定できない。

期待は `spec/scenario/import.md` の「破損して読み取れないファイルは、変換失敗として記録し、原因と再試行の導線を示す」。正常だが本文抽出にAIを要するファイルと、明白に構造/データが欠けるファイルを区別し、原本を保持して後者を理由付き失敗へ送る。全メディアの完全再生保証を新要件にするものではない。少なくとも受理した形式の必須構造・payload・切断等を bounded な検査で否定できること、画像/音声の通常系・明白な破損・AI不使用の区別を回帰させることが必要。Office/PDFの現在の合格抽出に直接の不具合は見つけていない。

### P2-V2: 除去した同じファイルを選び直せない

優先度: 受け入れ前修正。P2a-D の選択UI、Bの選択開始にも影響。

`/notes/import` で `verify.txt` 選択→「verify.txt を選択から除く」→同じ `verify.txt` を再選択すると、native input 表示は `verify.txt` のまま、選択リストは空、開始ボタンは disabled になる。キーボードの Enter による除去で発見し、button clickと再選択でも独立再現した。新しくページを開けば同ファイルの単体取り込みは正常完了する。

`ImportUpload.tsx:228` の除去は React `setFiles` / `setProgress` のみで、file input の値をリセットしない。同じfileを選び直した場合のchangeが発生せず、native入力とReact状態が不一致になる。期待は除去後に同じfileを選び直して一覧と開始可能状態が復元すること。選択・除去・同一/別ファイル再選択とdropに回帰を限定できる。

## 独立実行と既存根拠の区別

03:28:42 JST に以下を独立実行し、全80 tests成功。

```bash
pnpm exec vitest run packages/core/src/adapters/libsql/serializedClient.test.ts packages/core/src/adapters/node/import/__tests__/documentExtractor.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/imports.integration.test.ts packages/core/src/adapters/libsql/__tests__/hollow.integration.test.ts packages/core/src/adapters/libsql/__tests__/outboxRepository.integration.test.ts packages/core/src/adapters/libsql/__tests__/unitOfWork.integration.test.ts
```

- 前者2files/34tests、7.36秒。実parser31件とresourcequeue3件であり、既存結果JSONだけの検査ではない。
- 後者4files/46tests、6.16秒。原本hash・受理/outbox atomicity・容量/stream不一致・private認可・履歴・retry/cancel・reservation期限・cleanup削除後ack前の再試行・lease/worker復旧・版/所有者guard・Hollow認証/保存・outbox/rollbackを含む。
- 実装報告の最終unit137、Node60、typecheck/lint/format/build成功は既存根拠として適用。全件・buildの無根拠な再実行はしていない。
- 実装者の100PDF+別tab保存+20並列一覧、修正後ログのbusy0は実装者のproduction負荷根拠。Verifierが同じ100PDF負荷を独立実行したとは扱わない。独立側では20同名PDF、混在14件、操作/履歴pollとworkerを並行し、共有Client tests、認可/保存/再起動を追加した。

## 安全境界と設計判断

- S1: productionの第三者PPTX本文に `Bold italic underline superscript subscript`、`Here is a text box`、日本語/Gothic文字を確認。元spikeの単語連結は解消。空白run/改行/slide順、chart cache/SmartArt/notes/unsupported notice、Excel merge/formulaの独立parser testsも成功。
- S2: 全ZIP entryの実展開量・CRC、全XMLのDTD/UTF16/depth検証から各ライブラリへ進むコードを確認。unused partも検査するテスト、一般ZIP拒否、外部参照のrequest不発、deadline終了/event-loop応答、admission解放を独立実行。任意network拒否はsupported parserのNode API境界であり、OSネットワーク隔離とは同一視しない。
- S3: 本体 `sources.json` の配布済みfixture6件+license/NOTICE4件、計10件のbytes/SHA-256が一致。Noto font本体は未配布でOFLと元hashを保持。旧spikeの全11URL実照合と原文XML/Poppler照合は [spike独立レビュー](P2a-A-spike.md) の根拠を再利用。mutable downloaderは本体にない。
- parserの30秒deadline、old generation256MiB/young32MiB、最大worker2・待機8、input/ZIP/XML/HTML上限をコードで確認。V8 heapはArrayBuffer/native allocation等を含む総RSS上限ではなく、実装報告も区別している。OS hardRSS試験を今回の追加必須条件にはしていない。mediaのheader不足は資源制限の一般論ではなく、上記の観測済み破損判定違反として扱う。
- `serializeLocalClient` はstandalone/batch/migrate/interactive transactionの寿命を同一resource queueで直列化。開始失敗/finally/rollback/closeで解放し、failed commitだけでは所有を離さない。callback再実行なし。実DBの混在RETURNING/transaction、commit fault injection後rollback解放、古いcloseへの耐性を確認。HTTP/RSC/workerが同一Clientを共有するwiringと整合。
- native DEFERRABLE FK failed-commit探索のdriver残留lockは実装者の限界報告。現migration/schemaにはDEFERRABLEなし、fault injection testをnative disk-error回復の証明に拡張しない。今の必須条件に未要求の電源断/ディスク満杯試験を追加しない。将来DEFERRABLE採用・driver変更・OS障害回復契約を拡張する場合は再検証が必要。
- 原本storageのprivate権限、生成key、stream上限/期限、stage cleanup、atomic publish、owner認可付きdownloadを確認。AのDOCX downloadは再起動前後ともSHA-256 `a4c7d47a77e007ddd0b6106edebc208e6476ad86876108df0526e232e671c8d4`。B同URLは404、匿名は401、BのA note詳細/編集は拒否。本文iframeのsandbox空属性/CSP、保存sanitizer経路は維持されている。危険なHTMLを新たにアプリUIへ注入していない。

## ブラウザ・画像確認

Chromium / agent-browser の独立A/Bセッションで実施。実画面と保存結果を照合した。viewportはdesktop1280幅とmobile390×844。Tabで「本文へ移動」から選択欄へ移動し、SpaceでAI不使用checkbox切替、Enterで選択除去が動作。V2はこの通常操作で発見した。全OS native file picker/フォルダdragの実操作、全画面の完全a11y監査は未実行。dropは選択済み実FileのDataTransferイベントであり、native folder dragとは区別する。

以下の画像はVerifier自身が `view_image` で確認した。Managerへ画像判定を委譲していない。

- `/tmp/hollow-p2-verify.Cr6J0l/html.png`: 単体HTMLの見出しと本文がdesktopで描画、toastと編集導線を確認。
- `mixed.png`: mixed PDFのpage1文字本文を描画。page2 notice自体はスクリーン下方のDOM表示を別途確認。
- `mobile-upload.png`: 390pxでファイル/容量/暫定方式/AI不使用の説明が折り返し、横切れなし。開始ボタンは下方へスクロール可能。
- `mobile-docx.png`: 日本語/英語段落・表セルがmobileで表示、固定編集導線と本文が干渉しない。
- `broken-gif.png`: 非公開/要AI連携、AIで本文生成できる旨の誤った案内を視認。理由/原本ブロックと導線は表示されるが、V1により意味が誤っている。

## 環境引き継ぎと未検証

- productionを03:36台に旧PID99648へSIGTERM後、同じDB/storage/envで再起動。現在 `http://localhost:3000`、session `82582`、listener PID `9584`。停止せず維持する。
- DB `/tmp/hollow-p2.sj33Bk/app.db`、原本 `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox`。旧P1DBは操作していない。再起動envは `phases/P2a.md` と同一。
- 再起動後の収集ログ1337文字に `SQLITE_BUSY`/`failed`/`threw` は0。これは短い独立再起動区間のログで、実装者の過去ログ全体を再収集した値ではない。
- Aの既存P1 note `01a0726a-f2a7-772f-8ac9-bab7a9eee193` の本文を検証用「P2a独立再起動確認」に更新した。A/B認証情報は既存引継ぎのまま。tokenは記載しない。
- 独立fixture/画像/downloadは `/tmp/hollow-p2-verify.Cr6J0l` に保持。単体HTML note `01a072d4-789e-722e-8da7-10c4ef675bc9`、DOCX `01a072d4-dbb3-710c-a736-dc7baeb23535`、MD `01a072dd-3754-7418-82c2-e5e200972300`、TXT `01a072dd-b793-72d7-8ad3-43b25dc5b27d`。取消batch `01a072dd-6c88-71cd-b831-27023c3f8d16` は2jobs成功/18upload未開始取消。queued job取消/running継続は別の独立integration根拠。
- 取消の初期試行は操作到達時には全件完了、次の試行はボタン名誤指定で未操作。最終は新しい20件を一連操作し上記の取消結果を確認した。失敗したツール試行をアプリ成功根拠にはしていない。
- 専用 `hollow-p2-va` / `hollow-p2-vb` をclose。終了直後に残ったsession表示は後続確認で `No active sessions`、daemon PIDも消失。cleanup skillに従い他セッションへ干渉せず、コード/ブラウザ/環境操作を停止して引き継ぐ。
- 未検証: Node22.13ちょうど/他runtime、全OS/全decoder再生可能性、native folder drag、OS hardRSS/ディスク満杯/電源断、全workspace依存auditの独立再実行。P2bの外部参照・メディア/ゴミ箱/残editor、workspace・公開・実AI/メール等は今回の部分条件外であり、本レビューでは合格にも不合格にもしていない。

Manager判断: V1/V2をImplementerへ差戻し、他の合格根拠を保持する。修正後はmedia正常/明白破損/AI不使用の状態・原本/理由/retry・worker資源境界、および除去後同一file再選択/別file/dropへ絞って独立再検証する。共有DBやparser全体へ変更が及ぶ場合だけ対応する合格項目を再オープンする。

## Revision 独立再検証（2026-09-06 04:13〜04:24 JST）

結論: P2-V1 / V2 は解消。P2a-A/C/D/F は部分受け入れ可能。B/E/P1 の既存合格根拠を保持する。新しい差戻しはない。実 AI 接続・全 codec 復号の合格を意味しない。

- 対象 HEAD は `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。461 files / fingerprint `8b20b45bdee8aeae4a0f2641df4018f99c6c8433c3be2bd817796e889209b10c` は開始時と04:22:46に同じ算出方法で一致。
- `phases/P2a.md` 再提出、原文 IM-01〜04、plan の正本 ID、既存レビューを照合。FileList 修正は P2a-D の選択 UI であり、報告末尾の E 表記を台帳の意味変更として扱わない。
- 実ロードで Sharp **0.35.4** / libvips **8.18.6** を確認。以下の再実行はこの最終依存に対する結果。更新前の成功は流用しない。
- コード・依存・環境設定・管理台帳を変更していない。追加の独立テスト/派生 fixture/画像/download は `/tmp/hollow-p2-rv.EB4M66` のみ。実 UI が A の検証 note/job を追加した。実装担当・補助へ検証を委譲していない。

### ID 別再判定

| ID | 判定 | 今回の根拠と既存適用 |
| --- | --- | --- |
| P2a-A | 合格 | document31 を最終コードで独立再実行。共有 admission の独立混在テスト成功。production の媒体/破損/実 DOCX 混在で DOCX は ready / succeeded。元の S1〜S3、実 Office/PDF 日本語描画・原文照合を保持。 |
| P2a-C | 合格 | 元の独立 broken GIF/FLAC を新規アップロードし、両方 failed / failed と破損理由。正常 PNG/WAV は needs_ai / succeeded、AI不使用の別 PNG/WAV は failed / failed と設定変更案内。非公開・空本文・原本を維持。画像 PDF/混在 PDF は変更なしで元の独立根拠を適用。 |
| P2a-D | 合格 | 6件 mixed batch は破損2・正常だが未対応stz2 1を失敗、正常画像/音声/実DOCXの3件を成功。選択→除去→同一file再選択、複数→一部除去→別file、実File DataTransfer dropのnative/list/start一致。mobileのEnter除去・再選択も成功。容量/同名別note/予約認可は元の独立根拠と今回imports16を適用。 |
| P2a-F | 合格 | 新media streamのtimeout・過負荷拒否・後続document完了・一時原本回収を独立試験。imports16のclaim/lease/commit/復旧・retry/outbox回帰成功。今回production再起動は繰り返さず、旧独立再起動と最終build後のImplementer再起動根拠を適用。 |
| P2a-B/E/P1 | 既存合格維持 | 原本/private/本文隔離/UoWコードは不変。今回broken GIFとstz2のHTTP download一致、UI retry→再失敗・履歴、mobile導線を追加確認。二利用者・全P1シナリオ・100PDF負荷は再実行しない。 |

### 独立実行と並列 timeout

04:14:11〜04:14:47、次の2コマンドを別プロセスで同時実行した。

```bash
pnpm exec vitest run packages/core/src/adapters/node/import/__tests__/documentExtractor.test.ts packages/core/src/adapters/node/import/__tests__/mediaValidator.test.ts apps/web/app/components/hollow/importSelection.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/imports.integration.test.ts
```

- 前者は77件中76成功。media40 / selection6 は全成功。documentの `rejects excess XML depth, ZIP entries, declared expansion and corrupt CRC` が Vitest の `Test timed out in 5000ms` で失敗した。後者は16件すべて成功、35.59秒。
- 04:18:26、documentファイルだけを単独実行し31件すべて成功（全体5.73秒、tests5.22秒）。失敗した1件は複数worker操作を順にawaitする境界テストであり、観測した例外はテストrunnerの5秒期限。製品の `IMPORT_TIMEOUT`（30秒）、枠未解放、DB lockの失敗は観測していない。別Vitestプロセスを同時に走らせた負荷の影響は推定であり、単独成功で並列失敗を抹消しない。
- Implementer最終unit177 / Node61 / checks / build成功は同じfingerprintの既存根拠として適用する。ただし、今回の「2つの独立suiteプロセスを同時に走らせても全テストが5秒以内」という保証には使わない。新たな製品不具合を示す根拠はないが、CIで同じ並列構成を採用するならrunner期限・負荷を再評価する。
- 04:19:58、repoを変更せず `/tmp/hollow-p2-rv.EB4M66/mixed.test.ts` と専用設定で追加2件を実行、全成功（757ms）。実 MediaValidator 2件を未完streamで占有→実 DocumentExtractor 8件をqueue→11件目mediaを資源上限拒否→先行2件は150msの注入期限でtimeout→文書8件の固有本文一致→次の正常PNG成功。3本の入力cancelと、通常OS tempdirの `hollow-media-*` 集合が実行前後同一であることをassertした。production DBや本体testを改変していない。
- 追加2件目は正常AAC M4Aのstszを同サイズのstz2+freeへ変換してfixtureを生成し、未対応理由をassert。`ffmpeg -v error -i compact.m4a -f null -` がexit0で全音声をdecodeした。既存validate結果JSONの再読込ではない。

### V1 / V2 の画面・DB根拠

04:21:12の独立6件batchで、破損GIF note `01a07304-89be-760b-b7cd-7ff50b5ac5a7`、破損FLAC `01a07304-8a3d-74ad-b32f-4b2e862ff946` は原本/jobともfailed。正常PNG `01a07304-8bbd-7644-998c-7c3ef98fccc9` とWAV `01a07304-8caf-74a3-ac81-5d50b2ee77e0` はneeds_ai/succeeded。DOCX `01a07304-8df4-779a-b3ba-b0bd98cddfaa` はready/succeeded。旧誤判定レコードを自動書換えしたとは扱わず、新規処理の解消を確認した。

broken GIF 詳細で非公開・変換失敗・安全な日本語破損理由・履歴導線を確認。履歴の個別retry後、元jobとretry_of付き新jobの両方が同じ理由でfailed。download SHA-256 は元独立fixtureと一致: `0554627307e83b92fbb34a82dd6e5aa8c92fabcf7f7942628b86d45d13fb4db0`。

正常stz2 note `01a07304-8b1e-72f9-8201-a0f3c1b0fc36` は破損でなく「この音声の構造は検査に対応していません。通常のM4A・MP3・WAVなどに保存し直してください」と表示。HTTP原本downloadのSHA-256は派生fixtureと一致: `9e1ef7db2a2afc257c2f26154c4bdd6172e998833ff1ed959fc89c9f6c4e5a34`。M4A拡張子の暫定判定は最終成功の約束ではなく、受理後の未対応理由が提示される。Manager了承の限定対応と整合し、全M4Aを破損扱いするUIではない。

04:22:25のAI不使用PNG `01a07305-a945-765c-8471-d60b6bfac1ca` / WAV `01a07305-a9a8-761c-99c3-c4e9de45a2dc` は両方failed。「LLMなしでは取り込めません。LLMを使う設定で取り込み直してください」と画面/DBで一致。正常PNGの要AI画面とは区別できる。

V2はverify.txtの選択→除去でnativeが空/開始disabled→同じfile再選択でlist/開始が復元。2件から1件除去するとnativeも残り1件、別HTMLへの変更・dropも一致。mobile390×844でEnterによるPNG除去、同じ2件の再選択、SpaceでAI不使用checkbox切替を確認した。CDP uploadと実Fileを使用したDOM dropであり、各OS native picker/フォルダdragそのものの操作保証ではない。

### 安全境界・合法形式・限界

- 原本streamを検査するapplication port接続、media50/200MiBの安全整数/実bytes一致、private `mkdtemp`・wx0600、stage+workerの30秒deadline、終了をawaitしてからrmするfinally、未消費body cancelを確認。200MiBちょうどのWAV streaming/超過cancel/切断は最終media40の独立実行に含む。
- Sharpの実pixel decode、全animation、40M pixels/1000frames/decoded160MB、終端/RIFF検査を確認。FLAC metadata/frame CRC8/CRC16/sample数、Ogg CRC/sequence/continuation/EOS、MP3 ID3/APE/VBR/frame長、WAV padding、M4A box/sample/chunk→mdat境界からmetadata検査へ進む。正常9形式、Opus、animated GIF/WebP、合法MP3末尾padding/WAV odd chunk、第三者interlaced PNGが成功し、切断/header-only/CRC改変/不正stz2 sample boundsが拒否された。合法形式の過剰拒否は今回の正常コーパスでは見つからない。
- 第三者PNGとlicenseはローカルhashだけでなく、MEDIA.mdのlibpng v1.6.50公式raw URLを独立再取得し双方一致（PNG `b7a468…6148`、license `16d9da…49a`）。合成fixtureはFFmpeg writer由来であり、単なるmagic手書きだけを正常根拠にしていない。
- 音声はbounded構造検査で、AAC/MPEG等全payloadの意味的復号、全合法metadata/rare frame構成、全MP4機能を保証しない。stz2/fragmented MP4/free-format MPEGは限定未対応。CRCがないcodecの壊れ方すべてを検出したという主張はしない。これを全codec復号の新規必須条件へ拡張しない。
- Node net/tls/http/https/dns/fetch境界の無効化をworkerコードで確認。OS全通信隔離ではなく、Sharp native allocationもV8 heap上限外。総RSS hard limitの保証ではない。入力/出力/worker/admission上限と併用し、OS/container設定は運用条件として残る。
- admissionは同一module内の2実行/8待機を文書・媒体で共有し、待機時間自体は30秒期限に含まない。媒体は終了await後に枠解放。文書は既存どおりterminate要求後に結果を返すため、「終了処理中も含めOSに存在するworker threadが常に厳密2以下」という証明にはしない。今回の混在試験では後続実行/解放に不具合なし。
- 通常成功/失敗/timeoutのtemp回収を確認したが、process強制終了時のtemp残存回収・ディスク満杯・OS hardRSS・電源断は未検証。DB/UoW/claim実装にこのrevisionの変更はなく、既存native failed-commitの限界評価は維持する。

### 画像確認と引き継ぎ

Verifier自身が `view_image` で `broken-fixed.png`、`compact.png`、`mobile-selection.png`、`mobile-ai-off.png` を開いて確認した。破損/未対応の理由、原本導線、mobileの選択情報と操作ボタン・折返しが表示される。desktop初期位置で固定reading barがdownloadのクリック地点を覆ったが、通常の下方scroll後はリンクが露出してdownload成功。到達不能とは判定しない。

初期専用sessionの `--restore` がabout:blankへ戻ったため閉じ、新専用 `hollow-p2-rv2` を復元なしで使用した。相対path/古いrefを用いた一度のupload試行は混在アップロード根拠から除外し、絶対pathと最新snapshotで6件を再選択してから開始した。途中のHTML1件追加は保持する。browser操作の失敗を製品合格の証拠に使っていない。

04:23台に自分の専用browserだけをclose。`focus-debug` は未操作。production session6016 / PID30665、`http://localhost:3000` は停止・再起動せず維持し、最終signin HTTP200。DB/storage/mailboxは引継ぎどおり。画像・独立テスト・downloadは上記tempdirに保持。以後コード/環境/browser操作を停止する。

Manager判断案: A/C/D/Fを再受け入れし、B/E/P1を保持する。並列runner5秒timeoutと限定codec/OS境界を上記の条件付き根拠として残し、P2b以降・実AI接続へ合格範囲を広げない。
