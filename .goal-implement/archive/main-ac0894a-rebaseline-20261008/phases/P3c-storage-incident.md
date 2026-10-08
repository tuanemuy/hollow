# P3c 開始後の storage 不存在差異

## 状態

2026-09-11 00:46〜00:47 JST の追加保全照合で、開始時に実在した 457 object のうち 407 object・28,225,506 bytes が指定 storage root で不存在と判明した。残る 50 object・1,150,842 bytes は開始 manifest の bytes / SHA-256 と完全一致する。内容変更物は 0。削除主体・方法・正確な発生時刻は未確定であり、正常 GC と断定していない。

Manager の指示で旧 production を通常停止した。本体 migration・build・再起動、storage を使う試験、復元・再生成・容量調整を保留する。P3c の機能合格とは別の保全障害である。P3c の製品変更は未配布、DB は旧 0017 までである。

## 時刻と証跡

作業資料は `/tmp/hollow-search.GCbXvL`。秘密値・認証ソース・object 本文は出力していない。

| 実時刻 JST | 観測 |
| --- | --- |
| 9/10 23:32:04.906 | `pre-containment.db/json`。旧 457 object を実読取し bytes / SHA-256 を固定 |
| 9/10 23:35:39.905 | `baseline.db/json`。許可した自己資格情報封じ込め後、同 457 object を再読取。これが今回の最後の全実在確認 |
| 9/11 00:00 | 現 storage directory の mtime。削除時刻・実行主体の証明ではない |
| 00:21:39.489 | clone migration / backfill の報告。旧 DB 全列比較は実施したが、この時点で物理 object を再読取した根拠ではない |
| 00:46〜00:47 | `post-backfill.mjs` の旧 object 照合で最初の ENOENT。first key は `01a072b5-7760-70af-aaaa-dd940bac4cc2`。最初の session 除外列名誤りは helper の失敗であり不存在根拠と別 |
| 00:47:38.386 | `storage-observation.db/json`。新 online backup、全旧 43 表全旧列 EXCEPT 差 0、集合差 407、残 50 同値 |
| 00:48 前後 | 既知 PID 1053 の cwd `apps/web`、同 `app.db` open、storage の所有 lock.pid 1053 を確認。通常 TERM → session 26078 exit 0、`received SIGTERM, draining`、PID ESRCH。未知 process は操作していない |
| 00:49:37.491 / 00:51:16.408 | 停止後 `storage-stopped.db` と `storage-provenance.json`。現在参照・残存実体 inventory・scope 影響を集計 |
| 00:51:59.722 | `storage-recovery-inventory.json`。既知の残存実体と製品 fixture だけから SHA / bytes 完全一致元を照合。復元は未実施 |

開始 manifest は storage root の非 hidden 直下 regular file を key ごとに実読取し、bytes と SHA-256 を記録したもの。配列順は key の localeCompare。今回の比較はその全 key 集合を同じ root に照合し、存在する各 file の全 bytes を再読取した。新残存 inventory には key / bytes / SHA / mtime / birthtime を保持する。DB backup と binary inventory は別の資料である。

## DB と利用への影響

DB は 632 notes / 69 assets / 999 revisions / 123 snapshots、nonactive 11、active writer 0、未完了 purge 0、FK 0。封じ込め後 baseline の 43 表全旧列は差 0。原本文・title・日時・保持版・pin・容量/provenance・削除 claim は変更されていない。不存在 key に対応する `object_deletes` は 0 行である。

| DB provenance | 不存在行数 | bytes | 現在の関係 |
| --- | ---: | ---: | --- |
| originals | 347 | 18,468,185 | 全て active note の原本 |
| assets | 51 | 9,754,397 | 全て ready。51 全てに current pin と保持版 pin がある |
| companion_sources | 9 | 2,924 | bundle の記録が残る |
| reference_objects | 14 | 1,194,735 | 上記 asset 等との重複 provenance。物理合計へ加算しない |
| workspace_icons | 0 | 0 | current icon 2 件は残存 |

全 407 key に上記 DB provenance がある。原本と asset の note 関係を重複排除すると、個人 7 scope の current note 372、保持 note/revision 95 組に関わる。詳細の scope ID / key 集合は `storage-provenance.json` に保持する。これは creator と容量 owner を同一視した集計ではなく、notes の現在 owner_account_id / owner_workspace_id を使った参照影響である。40 scope の課算定義・旧行は変わっていないため、物理欠落を課算解放として扱わない。

不存在原本の最新 createdAt は 9/6 22:09:21.416、asset は 9/6 22:08:26.073。残る原本の最古は 9/10 09:34:33.222、asset は 9/10 09:29:08.359。古い file 群と日付境界の相関があるが、OS の一時領域回収はまだ仮説であり、mtime や DB createdAt だけで主体を証明しない。

## 自己実行と root の限定照合

旧 production は 9/10 23:07:58 の受入起動から上記通常停止まで、旧 accepted bundle で稼働した。P3c の monitor / query Worker / backfill / schema は本体へ適用していない。23:35 の新 baseline 以後、main DB を書き換える P3c 操作は実施していない。

P3c の `connect.ts` は自己 baseline の clone だけを migration / backfill し、`scale.ts` は新 synthetic DB、`runtime-product.ts` と先行 runtime probe も自己 DB に接続する。いずれも main storage をコンストラクタへ渡さず、物理 storage を削除しない。main root の固定文字列を product test と自己 source へ限定検索した結果、該当は `baseline.mjs` / `post-baseline.mjs` と今回の read-only inventory helpers だけだった。

Node integration の ObjectStorage は各 suite の mkdtemp root / subdirectory に限定される。`createTestContainer` は自己 file DB とその WAL/SHM だけを close 時に除去する。親 shell に HOLLOW_STORAGE_DIR の設定はなく、DATABASE_URL も main と一致しないことを値非出力で確認した。runtime test の recursive remove は自身の `hollow-search-runtime-test-*` root だけである。これは既知自己実行の配置確認であり、未知 process の不在を主張するものではない。

最後の自己 Node suite session 59979 は 00:46:06 開始、107.22 秒、256 tests / 21 files 成功・exit 0 で終了済み。main の不存在検出後に新試験を起動していない。UI 補助は 00:47:49 に 45 pure/static・対象型/Biome と専有 source を返却して全停止し、本体環境を操作していない。browser は今回まだ起動していない。

## 回復可能性と未確認

`baseline.db`、`pre-containment.db`、`clone-old.db`、`clone.db`、`storage-observation.db`、`storage-stopped.db` は実在する DB backup / clone。原本・asset binary を同梱した backup ではない。これらを古い DB へ戻しても物理内容は復元されない。

残存 50 object と `packages/core/src/adapters/node/import/__tests__/fixtures` の既知画像・文書 fixture 18 file、計 68 実体だけを SHA-256 / bytes で照合した。不存在 407 中 332 object・27,307,061 bytes に完全一致元が見つかった。残り 75 object・918,445 bytes はこの限定範囲で一致元を確認できていない。`storage-recovery-inventory.json` に key と一致元 path を保存した。これは復元済みの意味ではなく、一致 bytes の存在根拠である。全旧 temp の無差別探索や秘密 file の読取は行っていない。

原因確定、残りの回復可能性、恒久 root の選択、復元手順は Manager 判断待ち。物理複製・再生成・課算調整・旧 DB 適用・再起動は実施していない。旧 tool 出力や旧固定証跡を消去したとも主張しない。

### 00:55:53 の追加照合

Manager が許可した公開 fixture 全形式と archive 内実 bytes の範囲へ広げた。公開 audio/video/Office を含む fixture 38 file と残存 50 object から、346 / 407 object・28,104,798 bytes に完全一致元を確認した。初回の画像・文書だけの 332 件とは対象が異なる。

残る 61 件 / 120,708 bytes の内訳は、HTML 原本 20 / 6,220 bytes、Markdown 原本 6 / 871 bytes、text 原本 3 / 237 bytes、audio 原本 6 / 68,044 bytes、image 原本 5 / 35,291 bytes、SVG asset 12 / 5,878 bytes、companion 8 / 2,319 bytes、PNG asset 1 / 1,848 bytes。

既存公開 Office archive 13 本を新自己 temp で読み、正常 9 本の entry を照合した。破損/暗号 fixture 4 本は読取不成立として分離し、成功に数えない。初回の entry 名 `[Content_Types].xml` は unzip の pattern として解釈されたため、fixture 側で metacharacter を escape した。原失敗 JSON と修正後 `storage-candidates-v2.json` を保持する。archive に追加一致はなかった。

DB の既存 note / 保持 revision の HTML そのものを UTF-8 bytes として照合し、1 原本 / 202 bytes に完全一致した。意味同等の再生成・sanitize・HTML 修復はしていない。合計 347 / 407 object の一致元があり、残りは 60 object / 120,506 bytes。候補 bytes の新 file は `recovery-candidates-v2/001.bin`、mode0600、自己 temp 内だけ。main storage には書き込んでいない。

## 承認済み非一時領域への保全

00:59:32.898、Manager 承認後、`/Users/hikaru/.local/share/hollow/recovery/p3c-20260911-WbVD77` を新規排他作成した。親と実 root は current uid / 非 symlink / 0700、file は 0600。source は移動・削除・上書きせず、停止後整合 DB、現在 50 object、確定 347 候補、baseline / provenance / mapping の非秘密 metadata をコピーした。DB integrity は ok、コピー前後 SHA 一致。object は旧 manifest の bytes / SHA を全件照合し、source の再照合も一致した。正式鍵と test credential file はコピーも hash もしていない。

これは復旧候補の保全先であり、main 配置・起動先へ切り替えていない。初回 `evidence/mapping.json` は 397 object / 29,255,842 bytes、未一致 60。欠落 key の空 file は作っていない。後続は未作成 key への排他的追加だけで、既存 mapping の履歴を保持する。

## 残 60 件への限定照合

01:08:54.573 までの増分は 23 object / 107,284 bytes。全て旧 manifest の bytes と SHA-256 の両方が一致したものだけを永続保全へ追加した。

| 実時刻 JST | 限定入力・方法 | 新一致 |
| --- | --- | ---: |
| 00:58:41.021 | 製品公開 test source 93 file の静的 string literal / 固定文字列連結 6,925 個を、実行せず AST で抽出。literal 値を tool/report へ出していない | 7 object / 728 bytes |
| 01:00:42.876 | 成熟 writer による 1 秒 mono PCM silence、既存 mediaValidator test と同じ compact M4A の固定変換 | 3 object / 67,879 bytes |
| 01:01:41.226 | 公開 SVG 固定入力 4 個を既存 isolated processor へ通した候補。4 worker 成功・終了 | 6 object / 3,120 bytes |
| 01:03:07.621 | 公開 generated-image PDF 内の画像を抽出。記録済み pdftoppm scale-to 1000 の実測 pHYs 3579 に置換し CRC を再計算 | 2 object / 35,210 bytes |
| 01:04:46.704 / 01:06:40.746 | 既存 DB 本文の text / style と有限 Markdown 逆投影・改行候補。text 原本 3、保存 style の CSS 2 に一致 | 5 object / 347 bytes |

pdftoppm で現在の generated-ja.pdf から新しく描画した PNG は 19,948 bytes で旧 17,605 bytes に一致せず、復元可能に数えていない。PDF 内から抽出した旧 raster は 17,605 bytes だが pHYs が 2834 だった。旧の記録コマンドから得た 3579 へ metadata だけ変更した候補が、IDAT を含む全 file の旧 SHA と一致した。視覚的類似だけの判断ではない。

Markdown 逆投影は一般的な可逆変換を保証するものではない。全候補のうち旧 SHA と完全一致した上記の text 3 件だけを採用し、Markdown 原本には新一致がない。保存済み data URI の追加照合は候補 0 / 新一致 0。削除された script・CSS・markup を類似内容で補っていない。

01:03:51.287 の `evidence/mapping-02.json` は 18 件追加、415 object / 29,362,779 bytes。01:08:54.573 の最終 `evidence/mapping-03.json` はさらに 5 件追加、**420 object / 29,363,126 bytes**。内訳は残存 50 と完全一致候補 370。旧 457 object に対する未一致は **37 object / 13,222 bytes**。全追加 source の bytes / SHA とコピー後の一致を確認した。main root は無変更である。

| 限定照合で未一致の provenance | 件数 | bytes |
| --- | ---: | ---: |
| HTML 原本 | 19 | 6,018 |
| Markdown 原本 | 6 | 871 |
| companion CSS | 5 | 1,727 |
| SVG asset | 6 | 2,758 |
| PNG asset | 1 | 1,848 |

生成候補・正確な source / key の mapping は `literal-candidates.json`、`generated-candidates.json`、`svg-pdf-candidates.json`、`png-density-candidates.json`、`stored-text-candidates-v2.json` と、永続 root の `evidence/mapping-03.json` に記録した。各元 mapping / 失敗候補は保持し、未一致を回復不能とは断定しない。

## 対象の自己 fixture 由来

01:08:22.315、影響 7 personal scope の account ID / createdAt と、P0〜P2 の既存作成報告を非秘密 metadata だけで照合した。7 account は全て `example.test` の synthetic domain、作成は 9/6 JST の既知試験期間内。4 scope では既存 phase / review に account の記録があり、うち 2 scope の周辺文言は明示的な自己試験である。残 3 scope は今回の限定報告照合で account 記録を確認できなかった。

これだけで current note 372 件の全てが本 thread の自己 fixture と立証したとは扱わない。詳細は `scope-fixture-provenance.json`。email 一覧・資格情報値は出力していない。合成 domain だけを旧データの削除・権限変更・代替保存の根拠にしない。

## この区切りの停止

P3c の全製品変更・main DB / storage / browser / build / restart は引き続き停止。追加候補の生成は自己 temp のみ、known worker / subprocess は全て回収済み。全操作を停止して Manager へ戻す。残 37 件の探索拡張・main 復元・起動先の変更は別承認を待つ。
