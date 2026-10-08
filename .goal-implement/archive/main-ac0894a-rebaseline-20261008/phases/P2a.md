# P2a 実装・検証報告

## 完了候補

- 実装者: `/root/implementer`。補助 `/root/implementer/p1_ui` は parser と限定 UI を担当し、書き込みを停止済み。
- 記録日時: 2026-09-06T03:24:07+09:00（Asia/Tokyo）。P2a-A〜F の完了候補。独立受け入れは Manager / Verifier が行う。
- commit: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a` / `main`。新しい commit は作成していない。P1 を含む変更を保持。
- 対象 fingerprint: `2e732dcd2c988afcb19e6f6dbecd2d162e98f82dde41c0ac63f5c30a6c544e76`、441 files。2026-09-06T03:19:30+09:00 に取得し、03:24:07+09:00 に再一致を確認。
- 算出: `git ls-files -co --exclude-standard -z` の重複を除きソートし、各 `path + NUL + bytes + NUL` を SHA-256。`.goal-implement/` は除外。未コミットの tracked 変更 21 files と未追跡 124 files を含む。ignored の build・DB・mailbox・一時 fixture は含まない。
- Node v22.22.3 / pnpm 11.1.2。宣言下限は Node 22.13.0。

## 要件別の根拠

| 部分条件 | 実装と確認 |
| --- | --- |
| P2a-A / IM-01 | Marked、Mammoth、ExcelJS、yauzl + fast-xml-parser、PDF.js を Node worker に接続。parser 31 tests。日本語 DOCX/XLSX/PPTX/PDF、Apache POI 由来の独立 writer 形式、Mozilla PDF.js fixture、画像/混在/空白/暗号化 PDF、破損 Office を検証。production 8 件混在取込で Office 3 種・日本語文字 PDF の本文を確認。 |
| P2a-B / IM-01、04 | 個人・非公開の選択/drop、容量予約、private streaming 原本、note/job/outbox の同一 UoW 受理、worker、詳細の自動更新を接続。production の単体 HTML が SPA 遷移だけで描画。script/onerror が除去され、sandbox は空属性のまま。MD/TXT も実ファイルから保存。原本 DOCX の download SHA-256 は入力と一致。DB の安全コピーへの移行と複数回の Node 再起動後も結果・原本・P1 データを保持。 |
| P2a-C / IM-01、03 | production で画像 PDF、正常 PNG、FFmpeg 生成 WAV を `needs_ai` とし原本を保持。AI 不使用の画像 PDF は failed と理由を表示。混在 PDF は page 1 の本文を残し page 2 の未取得 notice を表示。破損・暗号化 DOCX は別の失敗理由。notice は原本に属し、90 日の job 削除で消えない。 |
| P2a-D / IM-02 | 100 件/500 MiB、50 MiB/音声 200 MiB、個人 5 GiB を境界で確認。実 DB の容量 reservation と stream 超過・中断・期限切れを検証。一般 ZIP、内容偽装、CRC、XML/展開制限を parser tests で検証。同名 PDF 100 件を別 note として受理・完了。正常/破損/暗号化の混在でも正常分を保持。選択除去、暫定方式、AI 件数警告、フォルダ再帰と未対応件数、全体/個別進捗を実装。 |
| P2a-E / JB-01〜03 | 本人だけの履歴・子内訳・開始/所要時間・ticker・完了/失敗 toast・個別/失敗分一括 retry・確認付き cancel。production の一括 retry と toast を確認。native confirm で「原本と note は残る、開始済みは続行」を確認し、100 件の途中取消が完了 1 / 取消 99 になった。実 DB では queued 取消と running 完了、二重 retry の抑止、手編集後 retry の上書き拒否を確認。 |
| P2a-F / 非同期・復旧 | 永続 job を正本とし、起動/周期 sweep が queued と lease 失効を回収。別 client 接続 2 本による同一 file DB の atomic claim、旧 lease の完了/heartbeat 拒否、新 active job/版/権限 guard、結果二重反映防止、再接続した DB + 新 worker による wake 無し復旧を実 DB で確認。原本・note・job・outbox の transaction 整合性を確認。 |

## 実装境界

- `domain/import` と `domain/job` に batch、reservation、original、判別可能な job 状態と repository port を追加。原本形式も union 型とした。
- `application/import` は受理、履歴、取消/retry、job 実行、条件付き結果反映を分離。ObjectStorage / DocumentExtractor は port。単一 JSON 状態や巨大 service は使用していない。
- libSQL の `import_batches`、`upload_reservations`、`originals`、`conversion_jobs`、`extraction_notices` を追加。P1 migration の後に `0001_polite_speedball.sql` と `0002_safe_wonder_man.sql` を生成。
- 原本は filename ではなく生成 key で保存。directory 0700、file 0600、stream サイズ/5 分期限、hash、atomic link、認可付き attachment download。未受理 object と `.part` の回収は DB の cleanup 状態で再実行できる。予約 1 時間 + stream の猶予後に削除を ack し、削除失敗・ack 前 crash で対象を失わない。
- job は 2 同時実行、90 秒 lease / 30 秒 heartbeat、2 秒 sweep。4 回目の claim または 30 分経過で timeout。通常 cancel は queued のみ、running の結果は残す。retry は新 job で、元 job の noteVersion と現在の本文を照合する。
- parser は request event loop から分離。30 秒 deadline、V8 old generation 256 MiB、最大 2 worker / 待機 8 件、50 MiB 入力、ZIP 4096 entry / 実展開 128 MiB、XML 16 MiB / depth 128、HTML 出力 800 KiB。全 ZIP entry の実展開と全関連 XML を検証し、DTD・外部接続を拒否する。
- PPTX の空白のみ run、書式分割語、改行、段落、chart cache、SmartArt、notes と unsupported part notice を回帰検証。Excel の merge 従属 cell は重複させず、式は実行しない。cached 値なしは式と未計算 notice を残す。
- 原本と job の履歴を分け、部分抽出/失敗/AI 不使用の理由を原本側にも保持。P1 の手書き note は原本なしのまま正常に扱う。
- UI は React 19 transition/pending と既存 route pending を使用。フォルダ探索は最大 depth 32 / 10000 entry、reader が空になるまで読み、100 files / 500 MiB に達したら中断。再帰と境界の utility 6 tests を追加。

## production で見つかった DB 競合と修正

2026-09-06T03:02+09:00、100 PDF upload と別 tab の保存/一覧を重ねたところ、結果自体は成功したが outbox / processed_events / import sweep に `SQLITE_BUSY: cannot commit transaction - SQL statements in progress` が発生した。Hollow 固有 UoW queue だけでは同一 local Client の他の SQL を覆っていなかった。

`adapters/libsql/serializedClient.ts` を local file protocol の作成境界に置き、standalone SQL、batch、migration、interactive transaction の全寿命を同じ resource queue で制御した。Hollow 固有 queue は削除。commit が失敗した場合は rollback/close まで所有を保ち、業務 callback を再実行しない。remote protocol は変更していない。boot は同じ Hollow / Client を HTTP、ALS 経由の server functions/RSC、worker に渡す。outbox kick は受理/retry の commit 後で、consumer は job sweep を起こすだけ。

修正後の production 検証:

- 2026-09-06T03:10+09:00、同名 PDF 100 件を再度投入。変換中に別 tab の HTML を保存し、認証付き `/notes` を 20 並列取得。全 200、105〜1192 ms。処理中 `running=1` を観測し、最終 100 件成功、手書き note の version 6 と本文保存を確認。
- 修正後 session 64396 の収集ログ 48,078 文字で `SQLITE_BUSY` / `failed` / `threw` は 0。
- 最終起動 session 6689 の収集ログ 33,803 文字も同 0。2026-09-06T03:17:19+09:00、outbox の未処理/未失敗は 0。
- resource queue の 60 混在 SQL、rollback、古い transaction.close、commit fault injection の 3 tests が成功。実 DB の再接続/2 client claim を含め Node integration 全 60 件成功。

P1 の認可・session・HTML 隔離の業務ルールは変更していない。保存が通る DB client 境界を共有変更したため、P1-D の旧独立検証だけではこの境界をカバーしない。既存 Hollow 15 integration と outbox/consumer/rollback を含む Node 全体を再実行し、ブラウザで既存 note の再起動後表示・並行保存を確認した。Verifier には P1-D の認可/永続化回帰と新しい resource queue の確認を依頼する。

## コマンド結果

| 実時刻（JST） | コマンド / 結果 |
| --- | --- |
| 02:49〜02:50 | unit 127 件、Node integration 59 件、typecheck/lint/format 成功。 |
| 02:58〜02:59 | UI 補完後 unit 133 件、Node integration 59 件、規定 check/build 成功。 |
| 03:07〜03:09 | local Client 境界変更、parser admission 追加後、typecheck → lint:fix → format → build → unit → migration 生成込み Node integration 成功。 |
| 03:12 | 最終 runtime wiring の `pnpm typecheck && pnpm lint:fix && pnpm format && pnpm build` 成功。 |
| 03:18:44 | DB 再接続復旧 test 追加後 `pnpm typecheck && pnpm lint:fix && pnpm format && pnpm test:integration:node` 成功。8 files / 60 tests。schema 差分なし。 |
| 03:20:07 | 最終 unit を JSON reporter でも確認し 137 passed / 0 failed。 |
| 03:19:30 | `git diff --check` 成功。 |

lint は既存 runtime などの unsafe 提案 23 infos を残すがエラー 0、終了 0。無関係な unsafe 自動修正は行っていない。

途中の失敗と扱い:

- 新規 lint 指摘、import test の error 期待値誤記、cleanup 猶予追加後の期待時刻を修正し再実行済み。
- native `:memory:` で transaction が別 connection になる test fixture は file DB に変更。queue の commit 失敗保持は fault injection で検証した。
- 採用していない `DEFERRABLE` FK を使う追加探索では native failed commit 後に driver の残留 lock を観測した。現在の schema は DEFERRABLE FK を持たない。ディスク障害など実 OS 起因の commit 失敗からの driver 回復は合格根拠に含めない。
- 初回 production の busy ログは上記修正前の失敗根拠として保持する。成功件数だけで合格にはしていない。
- agent-browser の最初の URL 待機が固まり、専用 daemon/session だけを終了・再作成した。アプリ HTTP は正常だった。後続は snapshot で状態を確認して実行した。

## 依存・fixture・資料

- 採用 API と実形式根拠は [P2a-A spike](P2a-A.md) と [独立 spike 検証](../reviews/P2a-A-spike.md)。本体 fixture は `packages/core/src/adapters/node/import/__tests__/fixtures/`、出所/hash は `sources.json`、ライセンスと NOTICE は隣の `licenses/`。
- Apache POI revision `3e24e7d6f4151b993232ee67faae650ade533712`、Mozilla PDF.js revision `716aff9d50c08b4bec3e350540a3f05aea89dedc` を固定。日本語 writer fixture と POI の別出所 XLSX を保持。Noto の元 hash と OFL を保持し、mutable main を再取得して manifest を上書きする spike script は本体に含めていない。フォント本体は再配布せず生成 PDF に使用。
- parser の実形式/ライセンス集合は spike から持ち込み、writer package は production 依存に追加していない。
- フォルダ reader の反復契約は [MDN readEntries](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryReader/readEntries) を確認。Client/Transaction 契約はインストール済み `@libsql/core` の公式型定義と `@libsql/client` / Drizzle の実装を確認。
- `pnpm audit --prod` は非ゼロ。全 workspace では low 5 / moderate 33 / high 20 / critical 0。parser 追加経路に該当するものは ExcelJS → uuid 8.3.2 の [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) だけ。対象は buf 指定の v3/v5/v6、ExcelJS の参照は `cf-rule-ext-xform.js` の引数なし v4 で、この機械読み込みから該当経路へ到達しない。互換性のない major override を追加していない。既存の他 runtime/tool 指摘の横断更新は今回行っていない。

## 引き継ぎ

現在の production は `http://localhost:3000`、session `6689`、listener PID `99648`。停止せず残す。

```bash
DATABASE_URL=file:/tmp/hollow-p2.sj33Bk/app.db \
APP_URL=http://localhost:3000 \
HOLLOW_MAIL_MODE=local \
HOLLOW_MAILBOX_DIR=/tmp/hollow-p1-S1piZT/mailbox \
HOLLOW_STORAGE_DIR=/tmp/hollow-p2.sj33Bk/originals \
HOSTNAME=127.0.0.1 PORT=3000 pnpm start
```

- 元の P1 DB `/tmp/hollow-p1-S1piZT/app.db` を `.backup` で `/tmp/hollow-p2.sj33Bk/app.db` へコピーしてから移行した。元 DB は移行・削除していない。A/B データは両方に保持。mailbox は同じ私有 path。
- 再初期化は既存 DB を消さず、必要なら新規 file URL で `pnpm db:migrate:node`。通常の起動/制限/配布要件は `docs/runtime_node.md`。
- 検証ユーザー `fix-p1@example.test` と既存 P1 のユーザーを保持。認証情報は P1 の引き継ぎに従うか、新規登録して local mailbox を確認する。
- DOCX note `01a072b5-77fc-700c-a56e-9cf952e6204e` は日本語本文と原本 download の代表。download hash `a4c7d47a77e007ddd0b6106edebc208e6476ad86876108df0526e232e671c8d4`。
- `/tmp/hollow-p2.sj33Bk/` に single.html/.md/.txt、silence.wav、download-ja.docx、mobile-selection.png、mobile-markdown.png。HTML に意図的な script/onerror が含まれ、表示時は除去される。画像は固定 spike の `fixtures/scan.png` を使用。
- ブラウザ実行のうち file drop は選択済み実 File を DataTransfer の drop event として dispatch した。native OS フォルダ drag は未実行で、再帰/分割 readEntries は utility tests の根拠。
- 2026-09-06T03:20+09:00 に専用 browser をすべて close。`agent-browser session list` は `No active sessions`。補助を含むコード/browser 書き込みを停止して Manager へ返却する。

## 残範囲と検証限界

P2b の IM-05 恒久外部参照台帳・取得/CSS、メディア/ゴミ箱/残 editor、P3 workspace、P4 公開/共有、P5 AI 実接続は未対象。画像・音声の形式判定は bounded header であり、全 media decoder による再生可能性検証ではない。Node 22.13 ちょうどでの実行、他 runtime、実クラウド、実メール/AI、OS 強制 RSS 制限下の OOM/ディスク満杯・電源断は未実行。

worker の V8 heap 上限はプロセス全体の RSS 上限ではない。配布時は `packages/core` と parser worker/依存を含め、OS/container の総メモリー制限と private storage のバックアップを設定する。これらを AI 実接続や P2 全体の完了とは扱わない。

## P2-V1 / P2-V2 再提出（2026-09-06 04:10 JST）

P2a-C/D の差戻しを修正した完了候補。独立再検証は未実施。前節の「画像・音声は bounded header 判定」という制限は、以下の原本検査に置き換わる。過去の成功判定済みレコードを一括変更せず、既存 A/B データを保持した。

### 修正と保証する境界

- P2-V1: `processJob` の画像・音声早期分岐は原本を読んでいなかった。application の `MediaValidator` port を介して、原本 stream の検査が成功してから `needs_ai` / AI 不使用の失敗を決める。共有 application にバイナリ解析を置いていない。
- `IsolatedMediaValidator` は private な一時原本を streaming 保存し、別 worker で検査する。画像50 MiB / 音声200 MiB、実 byte 数一致、staging と検査を合わせた30秒、V8 heap 256 MiB、ネットワーク無効化を維持する。document 50 MiB buffer へ音声を通さない。document/media 共通の2 active / 8 queued admission。通常終了・失敗・timeout は worker 終了後に一時原本を除去する。
- PNG/JPEG/GIF/WebP は Sharp の実 pixel decode と必須終端/RIFF 境界を確認し、animated frame も decode する。40M pixels / 1,000 frames / decoded output160 MB 上限。FLAC は STREAMINFO と全 metadata 境界、frame header CRC8 / payload CRC16 / sample count、Ogg は page CRC / sequence / continuation / EOS、MP3 は ID3/APE・VBR/padding と frame 長、WAV は RIFF/fmt/data/chunk padding、M4A は box/sample/chunk と mdat 内の payload 境界を確認する。音声は加えて music-metadata の codec/rate/channels/duration を検証する。
- 音声検査は圧縮 codec の完全再生ではない。AAC/MPEG の全 payload bit の意味的復号や全 MP4 機能を保証しない。FFmpeg は成熟 writer の fixture 生成専用で、production に host FFmpeg 依存を追加していない。
- 通常 AAC M4A を `stz2` compact sample table に変換した実 fixture では music-metadata 11.13.0 が `sampleSizeTable.length` の TypeError となる。table/payload 境界検査後に `IMPORT_MEDIA_UNSUPPORTED` とし、正常を破損や成功に偽装しない。sample size を壊した派生は `IMPORT_CORRUPT`。fragmented MP4 / free-format MPEG audio も未対応理由とする。この境界は Manager 了承済み。原本保持は共通 failed-job 契約を通るが、stz2 個別の HTTP download は未検証。
- 破損と未対応、資源上限、時間制限は安全な日本語理由を恒久 notice / failed job に残し、原本保持と再試行を維持する。supported extension の明白な破損も failed original として保存する。一般 ZIP / 真の未対応形式の拒否契約は変更していない。
- P2-V2: `ImportUpload` の native FileList と React 選択状態を追加/除去/drop/validation失敗時に同期する。空なら input.value を clear、残りがあれば DataTransfer から FileList を設定する。既存 pending/optimistic UI を維持する。

### 採用依存・実 fixture

Sharp 0.35.4 / libvips8.18.6 を Node22.22.3 で実ロードした。宣言 engine は `>=20.9.0` で Node22.13 下限と互換。初期0.34.5には今回の GIF decoder から到達する [GHSA-f88m-g3jw-g9cj](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) があったため修正版へ更新した。[constructor の decode/limit 契約](https://sharp.pixelplumbing.com/api-constructor/)と [0.35.4 package](https://raw.githubusercontent.com/lovell/sharp/v0.35.4/package.json)を確認。音声 metadata は Node>=18 / MIT の [music-metadata](https://github.com/Borewit/music-metadata) を採用し、metadata だけでは切断を取り逃すため bounded envelope/CRC 検査を併用した。形式一次資料は [FLAC RFC9639](https://www.rfc-editor.org/rfc/rfc9639.html)、[Ogg RFC3533](https://www.rfc-editor.org/rfc/rfc3533.html)、[RIFF](https://learn.microsoft.com/en-us/windows/win32/xaudio2/resource-interchange-file-format--riff-)。

`fixtures/MEDIA.md` に生成・出所・license・固定 hash を保持。FFmpeg8.0 の日本語 metadata/VBR MP3、AAC M4A、Vorbis/Opus、PCM WAV、FLAC、PNG/JPEG/GIF/WebP と animation を使用する。合成内容は CC0。第三者 libpng v1.6.50 の interlaced `pngtest.png` と license を未変更で保持する。単なる手製 magic fixture だけを正常根拠にしていない。合法な MP3 trailing padding / WAV odd chunk padding も成功する。

最終 `pnpm audit --prod` の既存集計は low5 / moderate33 / high20 / critical0。追加 direct sharp/music-metadata 経路の指摘は残らない。他 runtime の無関係な監査項目は拡張していない。

### 検証結果

| 対象・実時刻 JST | 結果 |
| --- | --- |
| 03:52〜03:58 修正途中 | media22→38、document31、unit175、Node61 が成功。Sharp 更新前の結果であり最終依存の証拠にはしない。途中 TS/format 指摘を修正。 |
| 03:59〜04:00 Sharp0.35.4 | media38、imports16、typecheck/lint/format/build 成功。production GIF と実画像9形式の処理に接続。 |
| 04:07:02 `pnpm test:unit` | 16 files / 177 tests 成功。media40（9形式正常/切断/header-only、独立破損GIF/FLAC、CRC変更、animation、第三者PNG、VBR/Opus/padding、stz2区別、timeout解放、exact200MiB WAV streaming、超過入力cancel）、document31、selection6 を含む。 |
| 04:07:11 `pnpm test:integration:node` | migration生成は14 tables/no changes。8 files / 61 tests 成功。imports16 の9形式×正常AI/正常AI不使用/切断27結果、原本 byte 一致、破損retry、既存 durable claim/lease/guard/outbox/認可を含む。 |
| 04:07〜04:08 `pnpm typecheck && pnpm lint:fix && pnpm format && pnpm build` | 全成功。lint の既存 info23件は残る。`git diff --check` 成功。 |
| 03:57 旧production V2 | 選択→除去→同一fileで native だけ選択済み、React list空/start無効を実再現。 |
| 04:00 新production V1/V2 | 独立 broken.gif/flac + 正常9形式の11件 batch は成功9（要AI9）/失敗2。選択→除去→同一file、複数→一部除去、別file、実File DataTransfer dropで native/list/start 一致。 |
| 04:06〜04:07 原本とretry | broken.gif 詳細は破損理由・非公開・原本download。download SHA256 `0554627307e83b92fbb34a82dd6e5aa8c92fabcf7f7942628b86d45d13fb4db0` が独立fixtureと一致。UI retry後も同じ破損理由で failed。 |
| 04:08:45 最終build再起動後 | 正常PNG/WAVを「LLMを使わず」で取り込み、両方failed・LLMなしでは不可の理由。再起動前の正常9/破損2/retry履歴も保持。最新serverログに SQLITE_BUSY / module error なし。 |

誤った Vitest project filter と web-only script 名は起動エラーになり、正しい上表の root commands で実行し直した。stz2 正常成功を期待した最初の test は library TypeError によって失敗し、未対応契約へ修正した。production 稼働中の dist 更新により旧processで一度 `ERR_MODULE_NOT_FOUND` が出たため、最終 build 後は再起動して確認した。最終環境では再現せず、既知破損入力の `Import conversion failed` は期待される failed-job ログとして区別する。

### 既受入範囲への影響

- P2a-C / IM03-04: media 原本検査と破損/要AI/AI不使用の分岐を再提出。P2a-D / JB01-03: media失敗理由・原本・retry の根拠を追加。claim/UoW/lease/commit guard は変更していない。
- P2a-A/F: shared parser admission を共通化したため document queue/deadline の回帰対象。document31とNode61が成功。document parser / XML / PDF / bounds 自体は変更していない。
- P2a-B: supported corrupted media の private原本保存経路を追加。予約/所有者/上限/streaming storage の契約は保持し実DB回帰成功。
- P2a-E: FileList同期のみ。desktopで差戻し再現と解消確認。今回 mobile native OS picker/OS folder drag は再実行していない。
- P1-D: 認可・DB UoW・resource queue・outbox のコードは本revisionで変更なし。Node統合61が通過。P1全ブラウザシナリオ/100件負荷は再実行していない。

### 最終対象と環境引継ぎ

2026-09-06 04:10 JST、branch `main` / HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。commit は作成していない。既存・今回の全未コミット/未追跡を含む461 files、fingerprint `8b20b45bdee8aeae4a0f2641df4018f99c6c8433c3be2bd817796e889209b10c`。算出方法は本報告冒頭と同じ git tracked+untracked の path+NUL+bytes+NUL、管理文書 `.goal-implement/` を除く。

主要個別 SHA256: `mediaWorker.mjs` = `ea23ef85bb7ebad564cdd85daedefcc0b68de21eb9dd328f4e2e05f192f4e68f`、`mediaValidator.ts` = `1d5ecd31756adc43753fde8b3e5176b22c9edd45a675c334c463a0a0efa7ec89`、`ImportUpload.tsx` = `0b58940be0e65d20bd52ed49c3e602964fdc6d718edd86efa9dc0f2a84da76a2`、lock = `6251b1202bbac68bde5ccdddafa873c73b2e330859ef7688b5aed94a0022efbd`。

現在の `http://localhost:3000` は production session `6016` / PID `30665`。前記起動コマンドと同じ DB `/tmp/hollow-p2.sj33Bk/app.db`、storage `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox` を保持する。migration は不要。broken GIF note `01a072f1-2340-73c3-8221-ec986164e0b1`、正常AI不使用 PNG note `01a072f9-23e9-700f-a479-341d3ec8fc2c`、WAV note `01a072f9-245b-7177-82b4-2eeeac6279df`。独立fixtureは `/tmp/hollow-p2-verify.Cr6J0l`、今回 download は `/tmp/hollow-media-revision.2EnZhj/broken.gif`。

専用 `hollow-p2-revision` browser の close 成功を確認し以後操作しない。session list の session名は残る。別作業 `focus-debug` は Manager 指示に従い触らず保持する。補助 `p1_ui` もコード停止済み。production は起動維持し、全コード/browser操作を停止して Manager へ返す。

未検証は Node22.13ちょうど、全codecの完全復号、stz2個別HTTP原本download、OS強制RSS制限/電源断/ディスク満杯。Sharp native allocation はV8上限外でありOS/container制限が必要。crash時の private temporary directory 残存は運用cleanup対象。P2b以降・実AI連携の未対象範囲は変わらない。
