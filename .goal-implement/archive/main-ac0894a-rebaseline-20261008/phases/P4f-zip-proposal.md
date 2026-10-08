# ZIP 未決事項の具体案

2026-09-20 11:59 JST。後続提案の読取準備であり、正式 P4f の開始・設計採用・独立レビュー・動作検証ではない。現在の正式 P4d-3 と製品所有を変更しない。

## 結論と判断点

成功ファイルの保持は「全子を一律 90 日」ではなく、再試行に必要な成功結果だけに限定する。完成 ZIP の 7 日と、まだ ZIP が存在しない組立失敗の再試行期限は別に扱う。前者の期限切れは既採用の明示新要求、後者は JB-02 の有効な再試行を 7 日経過だけで拒否しない。

第一候補は専用 child spool と参照付き hold。成功 spool の bytes/hash/identity を保存し、再試行では現在認可・同内容を確認して再利用する。完成全成功なら公開・実 close 後に子 spool を解放できる。一部失敗や組立未完成だけに再試行用保持を残す。保持負担が配備可能かは未実証で、容量不足を理由に約束済みの保持を早期終了しない。

主な採否は以下の四点である。いずれも今回未採用。

1. 未完成失敗の成功 spool を、操作できる失敗履歴に対応した期限まで保持する案。
2. 純粋な assembly 失敗は JB-02 基本フローの新親として再試行し、成功実体を再利用する案。失敗子だけの retry は従来どおり同親を再開する。
3. 全件除外は ZIP を作らず件数を表示し、実失敗子の retry と元操作のやり直しを分ける案。
4. ZIP writer は local lock にある Archiver 5.3.2 が stream 候補。ただし推移依存のまま内部 path を製品 import せず、正式段階で direct 宣言・型・版の採否が必要。今回依存は変更しない。

## 原文と固定する契約

`goal-implement/SKILL.md` と `references/manager-loop.md`、`brief.md`、`phases/P4f-zip-contract.md`、`spec/scenario/export.md`、`spec/scenario/jobs.md` を全文確認した。`design.md` は P4 接続判断、単件/本人/匿名 PDF の関係節と「一括ZIPの接続判断」を確認した。既報告の未採用表記は、その後の限定採用を上書きする根拠には使わない。

| 根拠 | 今回変えない意味 |
| --- | --- |
| EX-02、採用 ZIP 節 | 固定選択 500 以下。1GB は 1,000,000,000 bytes、生成済み entry と失敗 manifest の圧縮前合計。超過は親全体の分割案内で、部分成功へのすり替え不可。 |
| EX-02 | 空本文は除外して件数表示。生成中の削除は除外し兄弟継続。一部生成失敗は成功 ZIP と失敗一覧。同名は連番。 |
| EX-03 | 本人の一括 1 件、scope/format 横断、別親の待機列なし。完成公開から 7 日の反復取得。取消時は中間物破棄。 |
| JB-01/02、採用寿命 | 本人履歴は createdAt +90 日。失敗子だけ retry は同親を再開し、新子 attempt に新時刻、元親時刻は不変。assembly/closing 中は一件も retry しない。 |
| P4-Q2 | 公開前は含有集合を単調に減らして未公開 ZIP を再組立できる。公開後の一部失効/内容不一致は旧 ZIP 全体を拒否し、現在集合の明示新要求へ。 |
| PDF 共用 | 同 note/identity/profile の計算を共用。需要と保持を分離。PDF 24 時間の単件取得期限を hold で延長せず、完成 ZIP 7 日も元 PDF 期限で短縮しない。 |
| 現在認可 | viewer を含む現在 read。元 scope は永久権限でも同内容 move 拒否条件でもない。失効対象の現在 title/URL を一覧に補完しない。 |

## 成功 spool の最小保持

保持するのは出力済みの portable file と最小 manifest metadata であり、元本文・媒体 pack・Chrome workspace を retry 用に長期保存しない。physical key の bytes は参照数にかかわらず一度だけ容量計上し、回収待ちも計上する。

| 親の状態 | 保持案 | 終了・再試行 |
| --- | --- | --- |
| 生成/assembly/stopping 中 | 成功子の入力実体、進行中 reader、未公開出力を当該 generation が所有。公開前の単調除外では除外済み子の不要実体を解放候補にする。 | lease 切れだけで close とみなさない。未公開 ZIP を捨てても、残る子の再組立に必要な spool は維持する。 |
| ZIP が一度も完成していない失敗 | 実際に成功した子だけを、再試行可能な失敗履歴を支える間保持。最初の候補期限は親 createdAt +90 日。新 failed attempt の履歴が親期限を跨ぐ場合は、その最新 failed attempt の履歴期限まで必要な成功参照を残す。 | 7 日起点は存在しない。表示可能な失敗操作に対して成功実体の自主的早期消去を理由に retry を拒否しない。期限は失敗履歴の寿命に連動し、閲覧や poll では延長しない。 |
| 全成功 ZIP が期限内 | artifact 自体を publishedAt +7 日保持。子 spool は publish と全 reader/writer の close 後に解放。 | 完了済みなので失敗子 retry はない。新操作は元選択から明示実行する。 |
| 一部失敗 ZIP が期限内 | failed-child retry に必要な成功子の実体を、少なくとも現 ZIP の期限まで保持。現在 artifact と子 spool の二重保存が初期案。 | retry 受付前に同内容・現在 read・保持実体を確認。受付済み retry の間は旧 ZIP の期限を跨いでも必要な hold を維持。新 artifact は新 publishedAt +7 日、旧 artifact の期限は延長しない。 |
| 完成 ZIP が期限切れ、retry 未受付 | 既採用どおり旧 ZIP の再取得不可、現在集合の明示新要求。期限内に約束した retry 用の不要 spool を解放する。 | 旧 completed/partial artifact を裏で組み立て直して期限を復活させない。「期限切れ」と新作成を表示する。never-published 失敗にはこの規則を流用しない。 |
| 期限内 retry の受付後、新 assembly が失敗 | その retry に必要な成功実体を、最新 failed attempt 又は未完成再試行の履歴対応へ引き継ぐ。以前の artifact が期限切れでも、受付済み操作の失敗を単に expired artifact と同一視しない。 | 旧親 createdAt/旧 artifact publishedAt は維持する。新 attempt と新 assembly の失敗・保持根拠を別記録にする。 |
| 明示取消/関連する外部取消 | 新 claim/publish を fence。実行中の有限収束を待ち、当該 ZIP の中間物・retry 保持を解放する。 | 共用 PDF の他の正当な demand と hold は保持。実 close 未確認や物理削除失敗は負債として残す。 |

未完成の保持上界は、関係する「親又は最新失敗 attempt の表示可能期間」と進行中/実 close の必要性から導く案であり、元要件が 90 日の bytes 保管を直接要求しているとは述べない。新 retry が実際に受理された場合だけ新 attempt に必要な保持を引き継ぐ。永久 tombstone、常時更新する滑動 TTL、本文入り 90 日履歴は追加しない。

retry した子が成功した直後に assembly だけ失敗する場合もあるため、必要な保持は failed 子の存在だけで切らない。その新 retry attempt と未完成 assembly の対応を残し、新子履歴から必要な最小親 shell・組立再試行へ到達できる形を候補とする。旧親の title/詳細の 90 日期限は延長しない。この期限跨ぎ DTO と保持参照の exact shape は正式担当の判断点である。

容量削減の次候補は、部分成功 ZIP 内の成功 entry を検証付きで読む方式である。既存 direct dependency `yauzl@3.4.0` は lazyEntries、entry read stream、実サイズ検証を持つが、現在 ObjectStorage との owned random-access 接続・CRC/hash・reader close は未接続。この方式なら部分成功の子 spool 二重保持を避けられる一方、archive 内部読取・全 entry 名/size/identity 対応の検証が増える。初期実装の必須 gate にせず、最初は必要な子 spool に限定する方を推奨する。

### PDF hold の接続

ZIP 子が同内容の有効 PDF に合流した時点で、その子 attempt に束縛した内部 hold を同 Tx 取得する。期限内に取得した hold の下で bytes/hash を検証し、ZIP 専用成功 spool へ copy した後、source reader の実 close を待って PDF hold を解放する案が最小である。これにより retry 期間中ずっと単件 PDF artifact を保持する必要がなくなる。copy は再レンダリングではない。

copy 中に PDF の公開取得期限を跨いでも、既に正当取得済みの内部 hold と現在 ZIP 認可で処理を完了させる。期限切れ PDF へ新 hold を付けて単件 cache を延命する経路は作らない。ZIP 子がまだ実体を得ていない場合は共用計算需要として待ち、異なる note の PDF を一括並列で新規起動しない。ZIP の oversize/取消は当該需要のみ外す。

現 `PdfArtifactRepository.cached()` は expiresAt を厳格検査し、`claimCleanup()` は delivery と active object owner を見るが、汎用 assembly/retry hold port はない。正式 P4d-3 の共通 demand・配信refが固定した後、その正本へ `zip-child` 需要と `zip-source` read owner/hold を追加提案する。本人又は匿名 request を偽装し、不要な本人単件履歴を 500 件作る接続はしない。

## 再試行と全件除外の具体 UX

| 状態 | 操作と結果の案 |
| --- | --- |
| 最新 failed 子がある、assembly/closing 外 | 「失敗した N 件を再試行」。同親を再開、新 child attempt。固定 target/options、現在権限と現在内容の明示確認、成功子は同一 bytes 再利用。新一致 note の追加や成功子の自動再生成はしない。 |
| 純粋 assembly 失敗、failed 子なし | 「ZIP の組立を再試行」。JB-02 基本フローどおり新親・新 command・retryOf を作り、元固定集合/options と成功実体を現在再確認して引き継ぐ。失敗子を捏造しない。新親の作成は利用者の明示操作。 |
| assembly 失敗かつ failed 子あり | failed-child retry は同親再開。組立だけ再試行する場合は新親として元の成功実体と失敗結果を引き継ぐ。二つの範囲を区別し、旧成功を再生成する処理を「失敗子だけ」と呼ばない。 |
| assembly/closing 中 | すべての retry を原子的に拒否し、完了待ちを表示。要求を一部だけ登録しない。 |
| 成功子が changed/失効/実体不明 | 成功のまま新版へすり替えない。認可を先に確認し、必要なら現在取得可能集合の新要求を案内。予告していない自主的 spool 削除をこの経路の正常条件にはしない。 |
| preview 時点で全件空本文等 | 件数・理由を示し「取得可能なファイルがありません」。ZIP job を登録しない候補。500 上限は除外前選択数で守る。 |
| 開始後に全件除外、生成 file 0 | 空 ZIP/manifest だけをダウンロード成功にしない。親は `failed/no-exportable-entries` の定型結果候補、取得ボタンなし、除外内訳と元操作への導線。 |
| 全件生成失敗、file 0 | 親失敗と実 failed 子を表示し、failed-child retry は提供する。失敗一覧だけの ZIP を成功成果物とは扱わない。 |
| 明示又は外部取消によって file 0 | 親/子の取消は JB-03 の独立状態を保持し、no-exportable failure へ書き換えない。 |

全件除外の親 state と文言は原文未指定の可逆的な表現判断であり、利用者の権限や retry 範囲を変更しない。通知も「ZIP 未作成／取得可能なファイルなし」とし、単にダウンロード成功とは表示しない。失効 note の現在 title を取得せず、元 ordinal と定型理由・件数を使う。

## 最小の永続責務と port 案

表名と signature は正式担当へ残す。責務を増やすための汎用 workflow framework は導入しない。

| 責務 | 必須の最小情報・原子操作 |
| --- | --- |
| ZIP 親/receipt | accountId+command 一意、固定順 target IDs/options digest、createdAt/historyExpiresAt、generation、state/cancel fence。account 一件の accept/reopen と assembly claim を同 Tx 排他。 |
| target attempt | parent/ordinal/note、attempt、latest、現在 snapshot identity/profile、succeeded/failed/excluded/cancelled、定型理由、成功 spool ref。固定集合と最新 failed だけの retry を保証。 |
| 成功 spool と hold | key/bytes/hash/format/profile/identity、ready/cleanup/removed、必要な親/attempt の参照、保持根拠と期限、active reader owner。prune は参照・実 close・delete receipt を確認。 |
| assembly generation | sealed entry 集合/名前/manifest digest、assembler token/lease、generation、output reservation/key、bytes/hash。単調除外は次 generation、結果を同 Tx で親/current 認可へ照合。 |
| ZIP artifact と entry 対応 | 保存完了+公開日時、expiresAt=publishedAt+7日、全含有 note/identity と元 ordinal、実 bytes/hash。公開後は immutable。全 entry current 認可・内容一致でのみ取得。 |
| delivery | 現在本人 session、artifact、短期 expiry、claim/runtime/generation、ready/sending/closing/closed。実 reader/withOwner 終了後だけ解放、artifact の反復取得と独立。 |
| writer | safe flat 名、期待 bytes/hash、所有済み lazy opener、有限出力 sink と AbortSignal を受ける。Node stream/依存 API は adapter 内。成功は source/output の実 close 後にだけ返す。 |

hold は単なる期限列だけでは足りず、誰が何のために保持するかを参照できる必要がある。全件数/全対象 metadata は最大 500 の有限集合として扱えるが、全本文・全 file を JS 配列へ展開しない。現 ObjectStorage の stream/withOwner/putBounded/removeClaimed と registered owner の概念を再利用し、新しい独立 storage root や recover 系統は作らない。

保持終了は、最新 artifact の有効期間、retry に必要な成功参照、進行中 assembler/delivery、actual close のすべてを確認する。親履歴の prune と physical debt の削除を同じ cascade にしない。pure cleanup だけなら本人 active 枠は解放できるが、容量会計は残る。初期 global ZIP 枠/予算は PDF/HTMLMD の既存枠を二重使用しないよう正式担当が配備容量へ合わせて提案し、今回任意数値を追加しない。

## flat 名と失敗 manifest

初期案は NFC 表示名、既存 `exportDocument/filename.ts` 相当の control/format/path/予約文字・末尾 dot/space・Windows 予約名除去、空 stem の noteId fallback を再利用し、`.html`/`.md`/`.pdf` と連番 suffix の長さを先に確保する。ZIP entry は単一の通常 file のみ、絶対/drive/UNC/path separator、`.`/`..`、symlink/directory entry は拒否する。

比較 key は既存 Unicode mapping の width mapping → NFD → full case fold → NFD を候補とする。タグ業務 port には依存せず、固定版の純粋 mapping を使う。表示名は勝手に小文字化しない。予約名検査と衝突検査には同じ key を適用する。すべての OS/解凍ソフト独自の同値規則まで保証したとは言わない。

固定 ordinal 順に候補名を生成し、全元候補名と manifest 名を先に予約する。重複時は ` (2)` 以降を付け、予約済み及び採用済み key と再照合する。元から `a (2)` がある時に suffix がそれを奪わない。切詰め後にも再検査する。sealed 名は組立世代内で不変にする。

manifest は `hollow-export-report.txt` の UTF-8 plain text を第一候補とする。失敗/除外がある時だけ、元 ordinal・結果 code・定型日本語理由を固定順で記載。現在 title、note URL、共有 token、storage key、内部 path、例外全文を入れない。manifest の名前も同じ予約表に入れ、その実 UTF-8 bytes を採用済み 1GB 合計へ含める。全件除外では manifest だけの ZIP を publish しない。

## 外部取得なしで確認できた writer 候補

今回は `pnpm-lock.yaml`、core/web の package.json と既に存在する local package source だけを読んだ。インストール、dynamic import、writer 起動、実 ZIP 生成、外部 web/API は行っていない。

| 候補 | local 根拠と評価 |
| --- | --- |
| Archiver 5.3.2 | lock に存在、ExcelJS 経由の推移依存。`lib/core.js` の append は stream 対応。finalize Promise は内部 module の end を待つだけで sink close ではない。abort は best effort で残 source を drain しない。逐次 owned source と全 close を外側で管理する adapter の第一候補。 |
| JSZip 3.10.1 | lock の推移依存、`generateNodeStream` と `streamFiles:true` は候補。ただし `generateAsync` は accumulate、streamFiles=false は entry body を contentBuffer に蓄積する。全体 buffer API は不可。source destruction/close の追加責務があり、Archiver より小さい接続とまでは確認していない。 |
| ExcelJS 4.4.0 の内部 ZipWriter | direct dependency 内にはあるが非公開内部 util。現 `lib/utils/zip-stream.js` は JSZip.generateAsync の完成 buffer を StreamBuf に渡す。generic ZIP 製品 API として流用しない。 |
| CFB 1.2.2 | core direct dependency の ZIP write は全 content/out 配列と同期圧縮を使う。読んだ `write_zip` は filename を 7bit 化するため、日本語名と有限 stream 要件に不適合。 |
| Node 標準だけの独自 STORE ZIP | 外部依存なしという選択肢はあるが、自前 header/CRC/central directory/UTF-8/終了処理の保守と相互運用確認が増える。既存の完成 writer があるとは扱わず、今回の第一候補にしない。 |

したがって「既存 lock に利用可能な実装はある」が「現在の宣言だけで正式な直接製品依存として成立」は別である。正式担当が Archiver の direct 宣言と型を認める場合でも、新しい最新版や未取得ライブラリを前提にせず固定版を検討する。`.pnpm` path の直接 import、ExcelJS の内部 require 解決への依存はしない。依存宣言を一切増やせない恒久条件なら、writer 選択は未解決として返す。

writer は source を一つずつ遅延 open し、期待 bytes/hash を検証して実 close 後に次へ進む。warning/欠落を成功として流さない。abort では archive の停止に加えて全 owned source/sink を閉じ、出力の完了/hash と実 close を待つ。部分出力は非公開 cleanup。finalize、abort、Promise timeout だけを実終了証拠としない。圧縮後実 bytes と header 分の技術予約は別検査し、最終 ZIP に二重の 1GB 業務制限を作らない。

## 確認事項と最小受入案

利用者への新質問が直ちに必要な採否はない。flat 名、manifest、独立責務、組立 retry の記録形、writer 版は可逆的な実装判断として Manager が選べる。保持方式も必要な disk を安全に予約できるなら運用判断として進められる。

ただし容量負担を理由に「履歴に残る正常な failed-child retry を短期で打ち切る」「成功子を自動再生成して failed-child retry と呼ぶ」「期限前に完成物を消す」へ変える場合は既存利用者体験を変える。まず bytes 再利用/必要 spool 限定/技術容量の比較を行い、それでも必要なら差分を明示した利用者判断候補とする。90 日全 spool 保存を要求が直接指定したものとして押し付けない。

正式実装時の最小確認案は、EX-02 の partial+manifest/重複名/全件除外/1GB 境界、EX-03 の本人一件・7日反復/取消 close、JB-02 の子 retry/assembly 排他/未完成組立失敗の7日後再実行、Q2 の current read/content/move/公開前単調除外/公開後全体拒否である。保持終了と PDF hold はこれらを成立させる安全確認であり、新しい独立 gate は作成しない。

潜在影響は P4d の共通 demand/artifact cleanup、P2d/P3f の current-note purge/owner、P3e の固定選択 UI、JB 履歴/ticker、P4b の planner/stream 再利用に限定する。現在 P4d-3 の本人/匿名二種は編集せず、固定後に ZIP 種別を追加提案する。匿名 ticket/cookie/rate、本人90日、既存 renderer/serializer、Google/Drive/公開 identity は変更理由にしない。

本報告以外の書込はない。動作・資源成立・移行・実 ZIP は未検証であり、完了機能として報告しない。
