# P4 書き出し成立準備

2026-09-19。EX-01〜04全文、design の P4-Q2/P4a、P4-shared-contract の export、P4-prep T9〜12、現 source/lock と公式一次資料を読取照合した準備報告。製品・依存・環境は変更せず、生成・test・build は未実行。以下の追加 port・数値・起点は採用前の提案であり、成立実証・実装開始承認ではない。

## 結論

最初は既存のアプリ内閲覧と P4a 限定入口から、保存済み current 本文の HTML/MD 単件取得を通す縦スライスが独立して成立し得る。次に同じ snapshot から PDF と短期 ticket、最後に本人所有の ZIP job を接続する。これは実装順候補であり、HTML/MD だけで EX 全体完了とはしない。public 入口は未提供のまま残す。SH-07、公開 route、初回 handle、profile 他項目、Google/Drive は決定・接続しない。

既存依存だけで HTML→PDF 実生成が接続済みとはいえない。`pdfjs-dist 6.3.289` は PDF 入力の読取・表示側で、HTML→PDF 出力器の代用ではない。[PDF.js 公式概要](https://mozilla.github.io/pdf.js/getting_started/)

ZIP writer は lock に存在する。`exceljs 4.4.0` 経由の `archiver 5.3.2`、exceljs/mammoth 経由の `jszip 3.10.1` は推移依存であり、直接依存・書き出し adapter はない。Archiver の当該版は ZIP に stream を append して出力できるため候補になるが、直接依存の宣言・版採用・型・adapter・異常収束の実装が必要。既存 importer の内部 API に依存しない。[Archiver 5.3.2 README](https://raw.githubusercontent.com/archiverjs/node-archiver/5.3.2/README.md)

## 現実装との接続

| 対象 | 再利用できる事実 | そのままでは不足する点 |
| --- | --- | --- |
| 現在閲覧 | `application/sharing/reading.ts` は同 UoW で token/grant、active note、現在 owner scope を確認し、Tx 外描画後にも再 snapshot する | private な helper を export 用の認可/snapshot port に切り出すか同契約を実装する必要。共有表示 DTO や token 入り媒体 URL を生成入力にしない |
| 内容 identity | 本文・表示設定・title、current reference/ready asset を正本から読む経路がある | 現 read stamp は noteVersion/scope/shareVersion 等を含み、正確な媒体 bytes の identity ではない。移動だけで cache miss となる stamp を流用しない。出力に効く全入力・媒体 digest/metadata・変換 profile で独立した identity を作る |
| current 媒体 | asset の ready/current-ref と参照取得 entry の検証、`ObjectStorage.stream/stat/read/putBounded` がある | 保存済み原本・履歴・draft は対象外。生成途中の媒体削除/置換に対する固定 snapshot と有限 hold が未提供。storage key だけで内容同一としない |
| HTML-safe | `NodeHtmlSanitizer.sanitize` と HTML/CSS AST 処理、`render` の allow-list がある | `render` は閲覧 iframe 用に anchor を span と別 links 配列へ変換する。その HTML を単純保存するとリンクが消える。download 専用の安全な document serialization と link policy が必要 |
| HTML/MD | HTML parser/serializer、sanitize-html、CSS policy は直接依存。`marked` の既存使用は MD 入力の HTML 化 | HTML→MD exporter はない。既存 AST に対する機械変換＋非対応 subtree の安全な HTML fallback が最小候補。escape、表、画像、styleMode、取得済み CSS を実成果物で確認する |
| 選択 500 | batch の ID 検証と browse `kind: selection` による server 側の全絞込選択、有限 child、lease/generation がある | 現 `BatchOperation` は tag/trash/move 専用で、worker は編集認可。viewer download に転用せず閲覧認可の export job を定義する。500 件の本文全量を JS 配列へ載せない |
| durable job | request 同内容識別、本人履歴、親子 attempt、claim/heartbeat、late-result fence、取消/明示 retry の既存パターンがある | conversion job は原本/import 所属必須。PDF single-flight、別要求者の ticket/job、ZIP 組立、artifact を表現しない。別 repository/DTO が必要 |
| cleanup | purge の intent/lease/物理負債、object write の begin/register/canPublish、claimDelete/finishDelete を使う設計がある | `WriteOwner` / `PurgeObjectOwner` に export はない。export owner/hold/cleanup debt の追加なしには保護されない。既存 note purge の cancel 対象にも export がない |

読取根拠は `application/{sharing/reading.ts,batch/{ports,usecases,worker}.ts,note/purge.ts,ports/{objectStorage,htmlSanitizer,referenceProcessor}.ts}`、`domain/{job,batch,purge,reference}/entity.ts`、`adapters/node/{htmlSanitizer.ts,reference/safeFetcher.ts,import/documentExtractor.ts}`、`adapters/libsql/repositories/{objectOperationRepository,purgeRepository}.ts`、`packages/core/package.json`、`pnpm-lock.yaml`。

P3f 接続では、新しい入口すべてで note の現在 owner を同 Tx で確認する。deleted WS に現在属する note は受理・snapshot・poll・取得・書込登録・publish・late finish の各入口で失効する。元 WS から移出済みなら、元 WS ID だけで止めない。既存 object writer の ownership generation fence を新 export owner に適用する場合も、移動前 worker の結果を無条件 publish せず、現在内容・現在認可を再照合して安全に再接続する。内容が同じ既存 artifact の再利用とは別問題である。

## 最小縦スライス候補と共有 port

依存は `現在認可 → 固定 snapshot/媒体 manifest → HTML/MD → PDF artifact/ticket → ZIP job/組立`。cleanup と現在内容再照合は artifact 導入と同時に必要で、最後に付け足さない。

1. HTML/MD 単件: アプリ内の閲覧権限と限定 token/grant の双方を typed authority として受ける。現在保存済み本文だけを固定し、dirty editor を保存・送信しない。空本文を拒否し、安全な title filename/空なら note ID、画像/style 埋込、不能な外部参照の元 URL、MD の非対応 HTML 保持を実ファイルで成立させる。応答採用前に現在認可/内容を照合する。HTML/MD の即時取得を仮 job の成功画面に置き換えない。
2. PDF: 同 snapshot と変換 profile から実 renderer を呼び、note 単位の実生成一件を DB で排他する。要求者と実生成を別行にして計算だけ合流。匿名は元の限定根拠に束縛した署名 ticket と画面内進捗のみ、本人履歴には入れない。生成中の異内容要求は自動で最新版を予約せず、旧処理終端後に明示新要求へ戻す。public ticket の入口は未接続。
3. ZIP: 本人だけの request/親/子 attempt/組立世代を導入し、現在の閲覧認可で選択を固定する。HTML/MD と PDF の同じ producer を使い、子単位処理→有限 temporary artifact→順次 ZIP append とする。成功分＋安全な失敗一覧、重名連番、空本文除外件数、離脱後継続、取消、失敗子 retry を通す。組立中 retry は全拒否、完成/cancel 後のやり直しは新要求。匿名一括は設けない。

採用前の最小契約案:

- `ExportSnapshotReader`: `account` と `link` の根拠を区別し、current note、表示設定、正確な媒体 manifest、内容 fingerprint、再照合用 fence を返す。raw token/password を通常 DTO/job/ログに持ち込まない。将来 public を追加可能でも現在許可する分岐にはしない。
- `ExportDocumentWriter`: 固定 snapshot → HTML/MD stream と安全な filename。`PdfRenderer`: 同じ安全 document/固定媒体 → PDF stream、deadline/abort、renderer profile。`ZipWriter`: filename＋有限 stream の逐次入力 → ZIP stream。adapter 固有例外は安全な失敗分類へ変換する。
- `ExportRepository`: artifact、PDF 実生成、本人 request/job、匿名 ticket 根拠、ZIP child/attempt を分離。artifact は content identity/storage key/bytes/hash/publishedAt/expiresAt、job は actor/request digest/世代/終端時刻、ticket は note/元入口世代/grant epoch/期限を持つ。ticket key の管理は別途既存署名 primitive と照合し、共有 token 暗号鍵を黙って共用しない。
- `ExportOwnership/Cleanup`: 書込所有、snapshot hold、組立用 hold、期限切れ/取消/失効の物理削除負債。lease/generation と現在 note を publish/finish と同 Tx で検証する。取消後の遅い renderer 出力は公開せず回収する。削除失敗を完了・容量解放済みとしない。

現在内容不一致の旧 private PDF を、現在の限定/public 認可だけで渡さない。poll/download のたびに元 ticket 根拠を検証し、別の現在 public 根拠へ付け替えない。本人 ZIP の完成後に含有 note 一件でも失効/内容不一致なら旧 ZIP 全体を拒否し、現在取得できる対象からの明示新要求にする。認可を失った対象の現在 title/body を説明用に再取得しない。これらは採用済み Q2 の適用であり再決議しない。

## PDF/ZIP adapter の候補と未実証境界

PDF の最小候補は Node adapter 内の Puppeteer＋固定 Chrome。確認時の公式 API 文書は 25.11.0 で、`Page.createPDFStream(options)` は `ReadableStream<Uint8Array>` を返す。既定は print CSS で、screen を使う場合は明示設定が必要。[createPDFStream](https://pptr.dev/api/puppeteer.page.createpdfstream)

PDF options は既定 timeout 30,000 ms、`waitForFonts: true`、letter、背景印刷なし。`timeout: 0` は無期限であり採らない。ページサイズ・余白・screen/print・背景・同梱 font・renderer 版は出力 profile として明示し、cache identity に含める。初期提案は表示の styleMode を尊重した screen CSS、背景あり、A4、固定 font、日付/URL header なし。ただし再現性・改頁品質は未検証で採用前。[PDFOptions](https://pptr.dev/api/puppeteer.pdfoptions)

Puppeteer は対応 Chrome を取得する方式を提供する一方、バイナリの配置・OS 依存・sandbox は npm API だけでは完結しない。`puppeteer-core`＋明示バイナリも候補だが設定ファイル/環境変数の扱いが異なる。現在環境に存在すると推測せず、採用時に版・配布・font・実起動を検証する。[Configuration](https://pptr.dev/guides/configuration) 公式 Docker 例には sandbox/権限・子 process 回収の条件がある。その例の権限拡張を現在環境へ無条件適用せず、安全な配備方法を別途確認する。[Docker](https://pptr.dev/guides/docker)

安全境界の提案:

- ユーザーのブラウザー・profile・cookie を使わず、隔離 process/context に無権限の安全 document と固定媒体だけを渡す。利用者 JavaScript、form/iframe、任意 file path、任意 HTTP ナビゲーションを許可しない。
- 原則 renderer 自身はネットワーク遮断。request interception で許可 manifest の bytes だけ応答し、その他は中止する。公式 API には browser cache から完了する例外もあるため、共有 cache を使わず、service worker/別 target も含めた外向き通信拒否を process/OS 境界で検証する。interception だけを SSRF 完全対策の実証としない。[setRequestInterception](https://pptr.dev/api/puppeteer.page.setrequestinterception)
- 追加の外部取得が必要なら renderer ではなく既存 `SafeReferenceFetcher` を境界にする。同 adapter は HTTP(S)/port/credential 検査、全 DNS 回答検査・接続 IP 固定、redirect ごとの再検査、最大5 redirect、30秒 deadline、実受信 byte 上限、圧縮応答拒否を持つ。取得内容を snapshot に固定し、個別・合計 byte/件数/全体期限を明示する。現在 HTML の内部/history URL を外部 URL fallback にして認可を迂回しない。
- HTML の埋込不能な正当な外部参照は原 URL を残す。PDF はその URL をブラウザーに追跡させず、取得済み素材と明示した欠落説明で完結する。外部サイトの後日の変更を cache 内容一致の代理にしない。未取得参照を export が常に自動取得する仕様は追加しない。
- PDF deadline と output byte 制限、document/CSS/font/image の解析量、process RAM/CPU、child process kill と stream cancel を有限にする。既存 importer の worker timeout/heap limit は設計パターンとして利用できるが、Chromium の native process RAM を制限する証拠にはならない。具体的な配備上限は代表 fixture の実測と採用が必要。
- ZIP は stream で逐次組立し、500 open stream/全内容 buffer を先行確保しない。Archiver の abort は best effort で入力 source を drain しないため、adapter が個々の source/出力を閉じ、temporary object の回収を別途確定する。glob/directory や利用者指定 filesystem path を渡さず、検証済み entry 名を使う。[Archiver 5.3.2 core](https://raw.githubusercontent.com/archiverjs/node-archiver/5.3.2/lib/core.js)

## 数値・起点の採用前提案

| 論点 | 初期提案 | 判断が必要な点 |
| --- | --- | --- |
| 500 件 | 重複を除いた要求対象 note ID の上限500、501で分割案内。全絞込も server selection で同じ検査 | 空本文除外を理由に任意件数の全件走査・受理へ広げない |
| 1 GB | decimal の 1,000,000,000 B。選択形式で生成した各 file の非圧縮 byte 合計を対象サイズとし、受付時の判明分＋生成中の実 byte で検査する案 | 原文は byte 単位と計数対象を未指定。1 GiB、入力本文/媒体量、圧縮 ZIP 量とのどれを意味するか正式採用が必要。manifest/ZIP overhead の物理 output cap は別に有限化し、同じ1 GBと黙って混同しない |
| 境界超過 | 全件を読み切ってから判定せず、上限超過が判明した時点で停止・分割案内。上限と同値は許可する。生成途中にサイズ超過が判明したら通常の部分失敗 ZIP 成功に偽装しない | PDF は事前の正確な出力 byte 予測ができると仮定しない。事前判定可能な量と実測量を分けて UI に説明する |
| PDF 24 h | artifact が完全保存され同 Tx で公開可能になった `publishedAt + 86,400,000 ms`。`now >= expiresAt` で取得不可 | 受付/生成開始からは数えない。再取得・ticket 再発行で延長しない。期限前に掃除しない |
| ZIP 7 d | 組立が完全保存され公開可能になった時点＋604,800,000 ms | ZIP 内の PDF bytes は ZIP の7日保持に含む。組立前の内部 hold は単件 PDF の24時間取得権限を延長しない |
| job 90 d | 本人 job の当該終端時点＋7,776,000,000 ms。未終端は履歴 prune 対象外 | 既存履歴は createdAt/updatedAt の混在があるため無条件流用しない。失敗子 retry で再開した job は新終端時刻へ、単なる閲覧/download では更新しない。物理負債は履歴 prune と別寿命 |
| 匿名 ticket | 発行から固定15分を初期候補。poll では延長しない。切れたら元画面の明示操作から再発行し、内容一致かつ24 h内なら PDF 再利用 | 15分は未採用。P4a password grant の固定24 hとは別。ticket 期限内でも現在 token/grant/内容/owner が失効すれば拒否 |
| ZIP 一件 | account ID 単位で全 scope を通じて一件、受付から子実行/組立/取消収束まで durable slot を保持し、競合要求は待機列なしで拒否 | 初期案では実行 lease が終端化してから slot 解放。非稼働の物理回収負債だけで本人を永久ブロックせず、負債の回収枠は別管理。同 request の再照会は新受付に数えない |
| PDF 一件 | note ID 単位の実生成一件。本人/匿名/ZIP 子の計算は合流可能でも要求者の現在認可は別 | requester 一人の取消で他の有効要求を巻き込まない。全 request が失効/取消なら worker を止める。artifact の内容一致なしに合流結果を配らない |

匿名 download rate の値は未採用のまま。P4a password 検証の60回/15分等を別目的の download 制限へ流用しない。renderer 同時数・待機方式・hard deadline・最大出力・RAM/CPU も、有限な実装が必要という契約と具体値の採用を分ける。上記1 GBを新しい単件制限へ拡張しない。

## 受入に必要な実条件

P4-prep T9〜12 を重複して新基準化せず、次の未実証接続を実装後に満たす必要がある。

- T9: 保存済み HTML/MD/PDF の内容、styleMode/取得済み CSS・画像、非対応 HTML、filename/重名、空本文、生成失敗理由/明示 retry。PDF の実 bytes を読めることまで確認し、拡張子や仮成功 UI で代替しない。
- T10: 元限定 ticket の改変/期限/対象違いと private化・trash・token再発行・password変更・WS削除を poll/取得に対で適用。内容不変移動の再利用、内容変更と旧 private artifact の漏洩拒否、同 note single-flight、匿名履歴非表示。public 分岐は未提供として残す。
- T11: 500/501と採用した1 GBの前後、全絞込の実 server selection、部分失敗/削除除外、空本文件数、同時一件/no queue、離脱後再訪、PDF24 h/ZIP7 d/job90 d を別 clock で確認。完成 ZIP の一部失効は全体拒否。
- T12: 組立中 retry 拒否、取消後 late finish/旧通知の fence、actor 交代で旧 promise が UI を更新しないこと、再起動/lease 回復、出力 write/delete 競合と cleanup 失敗後の回収。current note 移出済みを元 WS 削除で誤停止しないこと。
- renderer の通信遮断、巨大/悪性 CSS・画像・font、無応答・kill・一時領域回収は実配備で確認する。今回の公式 API 読取はその代わりにならない。外部 PDF サービスへの送信・課金接続は提案にも含めない。

本報告だけを保存して作業を停止する。P4a 製品と環境の所有は主担当のまま。

## 追補: job 履歴90日の起点

2026-09-19T22:07:20+09:00 時点の source 読取補足。前掲「job の当該終端時点＋90日」は未採用案であり、export だけに採る必然はない。P3f-F の「削除本人 receipt は受理から90日、既存 job は元作成から90日」と整合する、以下の作成起点案を推奨する。JB-01 原文は90日の起点を指定していない。既存方式の変更・P4a 条件追加は提案しない。

以下の source は `packages/core/src/` 基準。`since/before = now - 90日`。表示、履歴詳細の縮約、物理行の削除は別であり、「未終端なら全種類の90日超履歴が必ず UI に出る」とは現 source からいえない。

| 種類・根拠 | 実際の起点・再試行時の時刻 | 未終端・依存資源の扱い |
| --- | --- | --- |
| conversion/import: `adapters/libsql/repositories/importRepository.ts:34,201`、`application/import/controlJobs.ts:135` | 一覧は親 batch `createdAt > since`。prune は親 `createdAt < before`。明示 retry は新 job ID/`retryOf` と新 `createdAt` を作り、同 actor の親 batch 日時は変更しない。別 actor の取り込み直しでは新 batch と日時を作る | prune は queued/running job、awaiting/uploading、未回収 upload、purging note、active writer があれば親を残す。一覧条件にはこの保留例外がない。親が prune 対象になると所属 conversion rows を削除するため、全 conversion 子が各自の新日時から独立90日を保証されるとは記述しない |
| reference: `adapters/libsql/repositories/referenceRepository.ts:144,384`、`application/reference/schedule.ts:185` | 一覧は job `createdAt > since`、prune は job `createdAt < before`。明示 retry の新 job は新 ID/`retryOf`/新日時、元 row の作成日時は維持 | prune は succeeded/failed/cancelled に限定。reserved/written object、active writer、purging note があれば保持。queued/running の物理保持と、一覧の90日 filter は別 |
| 一括 tag/trash/move: `adapters/libsql/repositories/batchRepository.ts:256,320,348`、`application/batch/usecases.ts:62,140,285,594` | 親 `createdAt` は固定。retry は generation と `updatedAt` を進め、新 child attempt を新 `createdAt` で追加。一覧/prune は親作成時刻と最新 child の作成時刻、child title/retry可否は当該 attempt 作成時刻。**詳細の `ownedBatch` と watch は集約 `updatedAt` を使う**ため、全入口が作成起点で統一済みとはしない | queued/running 最新子は古い親の一覧/保持理由になる。failed は未完了一覧分類だが年齢保留は無条件ではない。90日旧 title を空にし、旧非最新 terminal attempt と不要になった親を有限 prune。move receipt は親に queued/running がある間保持し、なければ receipt 作成時刻と連続 sequence prefix で有限 prune |
| ゴミ箱を空にする: `adapters/libsql/repositories/emptyTrashRepository.ts:199,271,355`、`application/note/emptyTrash.ts:24` | 親 `createdAt` は固定、retry で generation/`updatedAt` を更新して新 attempt のみ新日時。親/子の一覧・detail は親作成日時または最新子作成日時等で判定。90日旧親は `historical`、旧 title を省略 | waiting/queued/running または未成功 purge があれば古い親/子も必要分を保持。古い terminal 子で purge 不在/成功なら target を最小 closed state に縮約し、最終的に親を prune。新 retry が古い成功兄弟の title/detail の寿命を延長しない |
| 単独 purge と削除前 job snapshot: `adapters/libsql/repositories/purgeRepository.ts:130,510,587,608` | purge 完了一覧と prune は intent `createdAt`。同 intent retry は state/nextAttemptAt の変更で元作成日時不変。snapshot 移送は元 conversion/reference job の ID/`createdAt`/`updatedAt` を保存し、表示・prune は元 `createdAt` | purge の未成功 intent は年齢で消さず、成功でも未収束 empty-trash 対応があれば保持。snapshot の90日削除と物理回収は別。active writer、未完了 delete、未成功 purge に必要な対応を同じ90日判定だけで消さない |
| WS 削除 receipt: `adapters/libsql/repositories/workspaceDeletionRepository.ts:72,109,437`、`workspaceDeletionSchema.ts` | 本人 receipt 読取は固定 `acceptedAt >= since`、prune は `acceptedAt < before`。intent の `updatedAt/completedAt` で延長しない | receipt prune は回収完了を条件にしない。別の intent/対象対応行を削除せず、回収継続と本人向け90日表示を分離する |

推奨する小さな export 案は、本人 request/job の `createdAt` を受理時に一度固定し、履歴期限をその時点＋90日とすること。失敗子 retry は既存 batch と同様に元親日時を保持し、新 attempt の作成日時だけを新設する。古い親の必要最小 summary を、新しい child 履歴・進行中実行・artifact 取得対応・物理回収負債の参照が残る間だけ保持する。これによって親再開の表示を可能にしても、元の子や旧 title の90日を延長しない。未終端/負債の内部保持を、期限外履歴詳細の再公開理由にしない。

比較すると、終端＋90日案は長時間処理後も完全な結果詳細を90日表示できるが、開始からの実質保存期間と retry による延長が増え、既存採用方針と別の説明・例外契約が必要になる。作成＋90日案は遅い完了直後に元履歴詳細が期限外になり得るが、既存の親/子/最小 shell・内部負債の分離で処理追跡は維持できる。新 export だけ完全履歴を長くする原文上の要求はないため、後者を推奨する。

未決は root の採用判断、および新 export の90日ちょうどの包含境界（既存 source は `>`/`>=` が混在）、期限外親の最小表示と新 retry 子への到達方法。ここで既存入口の差を修正・再受入条件化しない。PDF24h/ZIP7d の `publishedAt` 起点は artifact 自体の保持・再取得契約であり、job 履歴の起点とは独立する。UI の「期限切れ」は artifact の `expiresAt` によって判断し、job 作成90日を PDF/ZIP の有効期限に代用しない。遅い生成で job 履歴が先に期限外になっても、必要最小の本人/元ticket対応を artifact 期限まで保つ案は、旧 title/全履歴の延長とは区別して詳細化する。

追補以外の変更・追加テスト・実生成はなし。全文確認後、全操作を停止する。
