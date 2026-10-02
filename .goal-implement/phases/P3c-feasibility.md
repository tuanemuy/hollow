# P3c 検索方式の隔離成立調査

2026-09-10T22:40:22+09:00 開始。P3c-A の方式採否資料であり、製品実装・製品合格・新しい受入条件ではない。入力は [OR-01〜05/10](../../spec/scenario/organize.md)、[採用済み共有契約](../design.md)、[共有案とタグ補足](P3c-shared-contract.md)。検索意味とタグ同値は採用済み、以下の索引方式・実行資源・Unicode 版・数値は提案である。

## 結論

- 配置済み Node 22.22.3 / `@libsql/client` 0.18.0 / SQLite 3.45.1 で、標準 FTS5 ASCII tokenizer＋encoded 1/2-gram＋SQL 正確照合は成立した。native tokenizer・追加依存・全 note の JS 配列化は不要だった。
- 1,100 件の候補の先頭 1,000 件が誤候補でも、SQL 正確照合後に後続の真一致 100 件から 51 件を取得できた。日本語 2 文字・英数字 prefix・混合 AND・現在 scope/lifecycle/policy の絞り込みを隔離 fixture で確認した。
- 候補起点を固定しない JOIN は、統計情報なしで note 側から走査した。FTS 起点の `CROSS JOIN` は統計情報に依存せず候補から PK lookup へ進んだ。通常 JOIN も `ANALYZE` 後には同じ計画を選んだ。正式案では検索 query に限って候補起点を明示する。
- local driver の同 process timer は、長い SQL 実行中に動かなかった。専用子 process を別の親から終了し、`close` を待つ隔離方式は成立した。public API での query 単体 interrupt は確認できていない。
- 800 KiB 上限直前の HTML 819,198 bytes を 1 件扱えた。索引作成約 217 ms、検索 2.46〜22.73 ms、置換時の前処理＋DB 更新約 707 ms。小さな synthetic corpus の代表値であり、最大負荷の時間・容量上限ではない。

推奨は「候補専用 FTS5＋正確照合・現在認可を同じ SQL snapshot＋検索専用の終了可能な子 process」。実装・正式配置・UI・既存 DB 接続は未実行である。

## 隔離範囲と再現資材

`mktemp -d /tmp/hollow-p3c-feasibility.XXXXXX` が作成した `/tmp/hollow-p3c-feasibility.3a4kgq` だけで fixture / script / DB を作成した。script は `apply_patch` で作成し、DB は script が自身の固定パスへ生成した。配置済み package の public `createClient` を使用した。driver source / 型定義は読み取りだけで、private API は呼んでいない。

| script | 実行内容 |
| --- | --- |
| [probe.mjs](/tmp/hollow-p3c-feasibility.3a4kgq/probe.mjs) | 4 corpus の構築・更新・query、意味と現在行条件の assert |
| [plan.mjs](/tmp/hollow-p3c-feasibility.3a4kgq/plan.mjs) | FTS 起点 CROSS JOIN の plan / bytecode / 5 回の時間 |
| [stats-plan.mjs](/tmp/hollow-p3c-feasibility.3a4kgq/stats-plan.mjs) | 独立 DB の ANALYZE 後の通常 JOIN 比較 |
| [transaction.mjs](/tmp/hollow-p3c-feasibility.3a4kgq/transaction.mjs) | membership / scope と、note・projection・FTS の rollback / delete |
| [deadline-parent.mjs](/tmp/hollow-p3c-feasibility.3a4kgq/deadline-parent.mjs) / [deadline-child.mjs](/tmp/hollow-p3c-feasibility.3a4kgq/deadline-child.mjs) | 短い SQL の対照、長い SQL 2 回の子 process 終了と再 open |
| [max-input.mjs](/tmp/hollow-p3c-feasibility.3a4kgq/max-input.mjs) | 819,198 bytes の単体 HTML による成立確認 |

実行コマンドは各 `node /tmp/hollow-p3c-feasibility.3a4kgq/<script>.mjs`。`probe.mjs` は自己子 process に 20 秒、`max-input.mjs` は 10 秒の親 watchdog を付け、どちらも自然終了した。deadline 試験は script 自身が子を管理した。CPU-heavy 実行は同時 1 本で、Verifier と実行前に調整した。

script は新規 DB 作成用である。同名 DB を上書きして再実行せず、新しい `mktemp -d` へ script と固定パスを移して再現する。資材は保持している。出力値は本書に記録し、外部ログサービスへ送っていない。

main DB・旧 backup・製品 source・lock/config・build・node_modules・storage/mailbox・browser・既存 process・全体管理文書・goal API は変更していない。秘密値、環境変数一覧、既存 process の argv は取得していない。子には空の環境を渡した。SIGKILL の対象はこの調査で生成した synthetic 専用子だけで、production 86341 や他 process には一切操作していない。

## 1. 測定した runtime と API

| 項目 | 観測 |
| --- | --- |
| Node | `v22.22.3` |
| 配置済み client package version | `0.18.0` |
| 接続先の `sqlite_version()` | `3.45.1` |
| `process.versions.unicode` | `16.0` |
| ICU / timezone data | `76.1` / `2024b` |
| native Temporal | `typeof Temporal === 'undefined'` |
| Intl | `supportedValuesOf` が存在、明示 `Asia/Tokyo` の DateTimeFormat が成立 |

client はリポジトリに配置済みの実体を使用した。この実体の package version が同じであることを、未確認の別配布物・他 runtime の同一動作へ一般化しない。再インストール・package 更新・hash / Git 操作はしていない。

[配置済み public Client 型](../../node_modules/.pnpm/@libsql+core@0.18.0/node_modules/@libsql/core/lib-esm/api.d.ts)の `execute` は SQL / args を受け、AbortSignal / interrupt を公開していない。`Config.timeout` は local lock の busy timeout と定義され、計算時間の deadline ではない。`close()` の一般契約は操作中断を含むが、local 実装では timer が呼べるかを別に確認する必要がある。

[配置済み local 実装](../../packages/core/node_modules/@libsql/client/lib-cjs/sqlite3.js)は `executeStmt` 内で同期 `prepare` / `all` を呼ぶ。この観察と後述の timer starvation が一致する。試験は `createRequire` の public package 解決による CJS entry を動的 import した。private pool / native handle を取り出す中断は採用しない。

## 2. 候補索引と SQL 正確照合

試験の FTS 定義は `fts5(tokens, content='', detail=none, tokenize='ascii')`。一つの候補 field に scope token、英数字語、非 ASCII の 1/2-gram を投入した。scope は fixture の `s1`、英数字は `a`＋正規化語、gram は `j1` / `j2`＋各 code point の固定 6 桁 hex で衝突しない namespace に分けた。note 内の候補 token は重複を除いた。

query は typed term から引用済み FTS token の AND を作り、英数字だけ末尾 `*` を付ける。gram は完全 token 一致。追加の prefix index は今回作成していない。SQL と MATCH には bind parameter を使い、raw query を演算子にしない。

FTS5 の prefix、ASCII tokenizer、contentless、detail 制約は[公式 FTS5 文書](https://www.sqlite.org/fts5.html)に基づく。detail を省くため FTS の位置・phrase・highlight には依存せず、正規化本文と別の表示 projection を正本にする。今回の contentless 更新は旧 token を渡す delete command と新 token の insert を同 transaction に置いた。正式実装では旧 projection / normalization version から正確に旧 token を復元できる必要がある。

SQL の骨格は次のとおり。実製品 schema の決定ではない。

```sql
SELECT n.id, n.updated
FROM search
CROSS JOIN notes n ON n.id = search.rowid
CROSS JOIN projection p ON p.id = n.id
WHERE search MATCH :compiledMatch
  AND n.scope = :scope
  AND n.active = 1
  AND n.public = 1
  AND (instr(p.title, :japanese) > 0 OR instr(p.body, :japanese) > 0)
  AND (instr(p.tw, :prefix) > 0 OR instr(p.bw, :prefix) > 0)
ORDER BY n.updated DESC, n.id DESC
LIMIT 51;
```

`n.public = 1` は隔離 fixture で current eligibility を確認する条件であり、P3c の個人 / WS 検索へ公開限定を加える提案ではない。正式 SQL はアプリ scope と公開検索面で異なる現在認可条件を組み立てる。membership の `EXISTS` は別の隔離 transaction script で現在行を照合した。

`tw` / `bw` は ASCII 語を空白で区切った正規化 projection。prefix の引数を `' cloud'` にして語中 `flare` を認めない。日本語は title / body それぞれの `instr` で連続一致を確認する。gram の共通候補だけで一致とはしない。FTS 候補と現在行を絞り込んだ後に order / keyset / LIMIT を置く契約を維持する。今回実行した sort は updated / ID と単体 ID で、全 sort・cursor は未実装である。

### 意味と LIMIT の観測

| ケース | 実結果 |
| --- | --- |
| `cloud` / Cloudflare | 一致 |
| `flare` / Cloudflare | 不一致。独立語 flare だけ一致 |
| `東京` / 東京都 | 一致 |
| `東` | SQL 呼出前に非実行の assert |
| `東京 cloud`、`東京Cloud` | title の東京と body の Cloudflare の AND で一致 |
| `東 京` | 分割された両 1 文字を保持して一致 |
| `cloud-flare` / Cloudflare のみ | 不一致 |
| 全角 Cloudflare | NFKC projection により一致 |
| `東京駅` / `東京 京駅` | gram 候補には入るが SQL 正確照合で除外 |
| 標準 trigram の `東京` / 東京都 | 0 件。2 文字要件を単独では満たさない |

多候補 corpus は ID 1〜1000 が `東京 京駅 Cloudflare`、ID 1001〜1100 が `東京駅 Cloudflare`。更新順も誤候補が先になるように作った。FTS の候補 count は 1100、SQL exact count は 100、`LIMIT 51` の先頭 ID は 1001、返却は 51 件だった。誤候補を含む先頭 N 件で打ち切る処理はない。

SQLite bytecode は `VFilter` の後、addr 22/25/28/31 の `instr`、addr 39/41 の上位件数維持、addr 45 の `VNext`、addr 49 の結果出力となった。正確照合前の候補数 LIMIT ではない。

scope が `s2`、inactive、現在 public=false の note は古い `s1` 候補があっても除外できた。membership active=false も除外した。意図的な unique constraint 失敗で note HTML / version・projection・FTS を同時に rollback し、旧東京が一致することを確認した。同 Tx の完全削除後は候補も消えた。

transaction script の初回は、fixture の期待 error code を `SQLITE_CONSTRAINT_PRIMARYKEY` とした assert が失敗した。実 code は `SQLITE_CONSTRAINT`。期待値を修正し別の独立 DB で全 assert が完了した。製品の不具合ではない。失敗時の DB も一時領域内に保持した。

### query plan の選択

統計情報なしの通常 JOIN は `scope_order` で notes を起点にし、projection PK、FTS の rowid＋MATCH 照合へ進んだ。結果は正しいが、scope 全体を走査する計画を選び得る。

FTS 起点の CROSS JOIN は全 4 corpus と上限直前例で次の計画だった。

```text
SCAN search VIRTUAL TABLE INDEX 0:M1
SEARCH n USING INTEGER PRIMARY KEY (rowid=?)
SEARCH p USING INTEGER PRIMARY KEY (rowid=?)
USE TEMP B-TREE FOR ORDER BY
```

ここで FTS の `SCAN ... M1` は MATCH 制約付きの候補走査であり、HTML 全行 scan ではない。`ANALYZE` 後の通常 JOIN も normal / manyCandidates でこの計画になった。

推奨は検索 query で FTS を左端にした CROSS JOIN を adapter 内に限定する。SQLite は CROSS JOIN の順序を入れ替えないため、統計の有無で note-first へ退化しない。通常の非検索一覧 query まで固定しない。SQLite は手動順序制御を通常不要と説明しているため、ここでは採用済み「候補を先に絞る」資源契約を明示する用途に絞る。[SQLite JOIN 制御](https://www.sqlite.org/optoverview.html#manual_control_of_query_plans_using_cross_join)

## 3. 小さな corpus の時間と容量

時刻は 2026-09-10T22:43〜22:49+09:00。単一端末、同時 CPU-heavy 1 本、各 corpus 構築 1 回、同一 query 5 回。cache を消した cold benchmark、統計的 percentile、同時ユーザー負荷ではない。OS / SQLite の cache が残る。数値を端末全体や本番 SLO へ一般化しない。

| corpus | 件数 / 本文構成 | 入力 bytes | encoded token bytes | FTS 追加前 DB | FTS 追加後 DB | allocated 増分 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| normal | 200 件、日本語・英語短文を各 5 回 | 84,090 | 96,890 | 135,168 | 180,224 | 45,056 |
| longJapanese | 8 件、各 20,000 CJK 文字＋検索語 | 480,232 | 2,451,844 | 507,904 | 2,437,120 | 1,929,216 |
| repeated | 8 件、東京都の反復各 180,000 文字＋英語 | 4,320,152 | 976 | 4,341,760 | 4,358,144 | 16,384 |
| manyCandidates | 1,100 件、誤候補 1,000＋真一致 100 | 32,600 | 114,400 | 114,688 | 172,032 | 57,344 |

入力 bytes は title＋本文 UTF-8。最初の 4 corpus の基準 DB は簡略 notes と正規化 projection を持ち、製品の HTML・履歴・資源をすべて複製したものではない。増分は FTS optimize と WAL checkpoint 後の DB file size 差であり、FTS の論理 payload だけや WAL の最大増分ではない。FTS optimize 時間は索引作成時間に含めていない。

| corpus | 全件 projection ms | 全件 FTS 作成 ms | 1 件更新 projection ms | 1 件 DB 更新 ms | FTS 起点 query 5 回 ms |
| --- | ---: | ---: | ---: | ---: | --- |
| normal | 20.40 | 7.66 | 0.11 | 1.09 | 0.81 / 0.23 / 0.23 / 0.23 / 0.23 |
| longJapanese | 140.79 | 57.00 | 14.99 | 14.72 | 2.99 / 0.52 / 0.48 / 0.46 / 0.58 |
| repeated | 1,454.62 | 2.11 | 133.12 | 3.35 | 6.69 / 1.20 / 0.67 / 0.66 / 0.66 |
| manyCandidates | 4.20 | 18.57 | 0.04 | 1.26 | 1.15 / 0.50 / 0.70 / 0.46 / 0.46 |

元の note-first query は manyCandidates で 6.36〜6.63 ms。ANALYZE 後の通常 JOIN は 0.45〜0.61 ms。差はこの小さい fixture での観測であり、全 query に CROSS JOIN が速いという比較ではない。

longJapanese の CJK は固定 seed / 2,000 文字 alphabet の疑似乱数で、自然言語の頻度分布ではない。FTS allocated 増分は入力の約 4.0 倍だった。反復は同 token を除くと小さくなるが、全文字を読む projection は消えない。token を逐次 Set へ投入して dedup し、大きな中間配列の生成を抑える実装を推奨する。

### 800 KiB 上限直前の単体例

`<p>`＋疑似 CJK＋`東京 Cloudflare`＋`</p>` の HTML は 819,198 bytes。上限 819,200 bytes の 2 bytes 手前で、本文 273,071 code point。HTML parser は使わず、生成時に既知の text を projection 入力にしたため、HTML parse / sanitize / highlight offset の時間は含まない。

| 項目 | 観測 |
| --- | ---: |
| distinct token / encoded bytes | 168,135 / 2,510,003 |
| HTML＋projection を持つ基準 DB | 1,654,784 bytes |
| FTS 追加後 DB / allocated 増分 | 2,732,032 / 1,077,248 bytes |
| projection / FTS 作成 | 239.38 / 216.75 ms |
| 置換 projection / HTML・projection・FTS 同 Tx 更新 | 372.31 / 334.34 ms |
| query 5 回 | 13.73 / 6.04 / 7.61 / 22.73 / 2.46 ms |

東京→大阪の同 Tx 置換後、旧東京 query は 0 件になった。自己子 process は watchdog 前に exit 0 で終了した。最初の 4 corpus と同じ token 意味だが、上限例は逐次 Set で生成し、全 token の中間配列を作らない。更新時間も HTML 書込を含むため、前表から単純に文字数比例で予測しない。

上限に近い一件を処理できる根拠にはなるが、最大 distinct gram 数・最悪候補集合・最大メモリ・多数同時保存の保証ではない。メモリ / FD / disk peak の全件監査は実施していない。derived index を利用者 object quota に加える新規則は提案しない。

## 4. deadline と実行資源

### 実測

子は自身の `deadline.db` を準備し、`PRAGMA query_only=ON` 後、recursive CTE の `sum` を実行した。query 呼出前に 100 ms timer を設定し、その callback は `client.close()` を呼ぶ構造にした。親は SQL 呼出通知から 500 ms で子へ SIGKILL を送り、`close` まで待った。

| ケース | query / 子の観測 | 親の観測 |
| --- | --- | --- |
| 対照 100,000 行 | SQL 13.57 ms、CPU user 13.36 ms、sum 5,000,050,000 | 正常終了、起動〜close 115.28 ms |
| 長時間 100,000,000 行・1 回目 | 100 ms timer 未発火、SQL 完了通知なし | 呼出〜close 504.02 ms、kill〜close 2.48 ms、SIGKILL |
| 同 2 回目 | 同上 | 呼出〜close 504.10 ms、kill〜close 2.04 ms、SIGKILL |

親 timer は実行できたが、SQL を動かす子の timer は実行できなかった。`Promise.race` や同 event loop の `setTimeout(client.close)` だけを deadline とする案は不成立である。

子終了後の同じ synthetic DB は再 open でき、sentinel は `untouched`、`PRAGMA quick_check` は `ok`。SIGKILL は read query の実行資源を終了するもので、実行中 transaction の成功を報告する操作ではない。今回の試験を書込 worker の強制終了へ一般化しない。

Node の `kill()` の成功は終了完了ではない。`close` は process の終了と stdio の閉鎖後に発火する。本試験は `killed` や送信成功だけで枠を返さず、`close` を根拠にした。shell を介さず直接 fork し、孫 process を生成しない。[Node 22.22.3 child_process](https://nodejs.org/download/release/v22.22.3/docs/api/child_process.html)

### 正式実装へ提案する境界

application 内側に `SearchExecutionPort` 相当の資源実行契約を置き、入力を検証済み actor reference・scope・typed terms・tag IDs・UTC 区間・sort/cursor・request identity に限定する。子へ任意 SQL、利用者指定 DB パス、認可済み boolean、HTML 全件、秘密環境一覧を渡さない。Node の子 process 管理は adapter に閉じ、domain に process / timer を持ち込まない。

親は現在の認証を確認し、dispatch 前にも期限・request identity を確認する。子は固定の読取 usecase だけを持ち、現在 account/scope/membership または public eligibility、正確照合、metadata / snippet 取得を一つの read transaction / SQL snapshot で完結させる。親で認可した note ID を子が無条件に読む方式にはしない。snapshot 後の将来の権限変更まで固定する保証ではなく、各検索 request の SQL 読取時点で現在 policy を判断する。

子から返すのは同じ snapshot から作った有限 DTO と条件 identity。親で別途 title / 本文を読み足すなら、その再取得にも現在認可と content identity を要求する。期限切れ・旧 request generation の結果は破棄する。件数・tag/calendar も同じ認可集合を使い、cache や cursor を権限証明にしない。

「read-only 専用」は固定読取 usecase / SELECT のみという権限境界にする。今回の `query_only` は試験 connection の設定であり、製品の全 pool 接続や OS level の read-only 設定が検証済みとはしない。正式 wiring では public API で扱える接続の全経路を揃え、既存 write UoW の FD 対策を解除しない。認可と検索のために親側の transaction を子の応答待ちで長く保持しない。

deadline は受付から queue 待機・起動・接続・認可・SQL・DTO・終了処理までを管理する。queue 中に期限を使い切った要求は起動しない。SQL 開始時に timer を新しい全時間へリセットしない。親 supervisor は SQL や大きな projection を同期実行せず、deadline timer が動ける資源として残す。

試験の 500 ms は SQL 呼出から kill 開始までの値で、総 deadline の測定ではない。終了には別に約 2 ms を要した。正式案は総予算内に終了待ちの余裕を持たせ、kill 開始時刻と close 完了時刻を分けて記録する。OS scheduling を含む厳密な real-time 完了は保証しない。終了確認が遅れても、古い処理を残したまま新しい枠を返さない。

初期 resource 案は検索の同時実行 1 子、有限 queue、終了確認後に次を dispatch とする。1 は測定範囲に合わせた安全な出発点で、製品の性能要件・永久上限ではない。queue 上限値や user 単位の公平性、常駐子を再利用するか毎回起動するかは未決。子が終了しない / 起動しない場合はその枠を隔離し、retry のために無制限に子を増やさない。

3 秒 deadline は候補のまま残す。今回の小 corpus と単体上限例はその候補を直ちに否定しないが、queue・起動・HTML projection・複合 tag/calendar・本番競合を含めた根拠はない。query 200 文字 / 16 term、debounce 250 ms、日 3 件も未採用のままである。

## 5. Unicode 版と日付 adapter の案

タグ同値は採用済みの `NFD(CF(NFD(W(name))))` を変えない。現 runtime と揃える最小版候補は Unicode 16.0.0。幅 mapping と C/F mapping を同版の [UnicodeData.txt](https://www.unicode.org/Public/16.0.0/ucd/UnicodeData.txt) / [CaseFolding.txt](https://www.unicode.org/Public/16.0.0/ucd/CaseFolding.txt) から固定 data として生成し、Node の canonical normalizer と版を合わせる。17.0 の表と16.0 runtime を無言で混ぜない。

生成済み mapping を adapter に保持し、純粋 normalizer port と version を内側の契約にする。起動時に runtime の版を確認する方式なら、domain に ambient `process.versions` を入れず wiring で判定する。全 Unicode normalization を新規実装する必要はない。今回は mapping 生成・取り込み・版変更 migration は未実行。scope＋key 一意、表示名保持、50 code point / 50 tag は変更しない。

日付は Node の ICU 76.1 / tzdata 2024b を識別できたが、native Temporal は存在しなかった。Intl の instant→civil parts は使えるが、それだけで civil day→最初の有効 instant の逆変換を実装済みとはしない。[Node Intl](https://nodejs.org/download/release/v22.22.3/docs/api/intl.html)、[ECMA-402 DateTimeFormat](https://tc39.es/ecma402/#sec-intl.datetimeformat.prototype.formattoparts)

新依存を許す場合の具体候補は `@js-temporal/polyfill` 0.5.1 を adapter 内だけに置く方式。[公式の版付き package 定義](https://raw.githubusercontent.com/js-temporal/temporal-polyfill/v0.5.1/package.json)を確認した。`PlainDate.toZonedDateTime({timeZone})` は通常 midnight、存在しない midnight ではその日の最初の有効時刻を扱う。翌 civil day / month の境界を独立に求め、存在しない day の空区間は採用契約に合わせて検査する。[Temporal PlainDate](https://tc39.es/proposal-temporal/docs/plaindate.html#toZonedDateTime)

polyfill 採用・追加依存は Manager 判断であり、インストールしていない。polyfill の版固定だけで host timezone data の版固定とはしない。Node / ICU / tzdata も runtime identity に含め、更新時に日付条件 / cursor の意味を確認する。代案の既存 Intl だけによる有界な逆変換 adapter は、gap / overlap / skipped day の実装と検証が残る。今回はどちらの date adapter も実装・実行していない。

## 採否へ残す項目

- FTS 候補、SQL exact-before-LIMIT、候補起点 plan、子 process 終了の狭い成立根拠は揃った。製品 schema・port 名・child lifecycle の採用は Manager に返す。
- 現 HTML の parser projection / offset mapping、全 mutation の UoW 接続、bounded backfill / version 競合、全 sort / cursor、tag/calendar と複合した query、UI timeout/retry は未実装・未検証。
- 同時認証変更、子起動失敗、queue saturation、親 supervisor 停止、実 DB lock contention、他 runtime、最大 memory / WAL / FD、cold / 負荷試験は今回の範囲外。query 数値・並列数・deadline の正式値は確定していない。
- contentless FTS の論理削除は物理媒体からの即時消去の測定ではない。索引の寿命・保全は原 note の lifecycle と接続し、独自の保持期限や課金規則を追加しない。

`goal-implement` の成立調査として、`doc-style` / `markdown-style` で観測・提案・未実行を分けた。`spec` / `spec-implement` と補助 agent は使っていない。指定した報告以外の repository file は変更していない。

2026-09-10T22:54:51+09:00 に報告を提出する。生成した子はすべて終了済み。一時資材を保持し、文書を含む全作業を停止する。

## 補足: HTTP main からも deadline 監視を隔離する

2026-09-10T22:57:24+09:00。文書と公式 public API に基づく配置提案。追加の実行・計測はしていない。

HTTP main は既存 libSQL 書込みを同期実行する。検索だけを子へ移しても、その親 timer を HTTP main に置くと、別 save の同期 SQL / busy 待ちが検索 deadline の通知と kill を遅らせ得る。前節の「supervisor は SQL を同期実行しない」は、監視を HTTP main の別関数に置くだけでは満たせない。これは既存構造と timer starvation の実測からの推論で、同時 save＋検索の実製品測定ではない。

### 推奨する最小配置

親 HTTP process の終了時にも監視役を残せるよう、専用 supervisor process を推奨する。

```text
HTTP main process                 同期の既存 write SQL を維持
  └─ IPC: SearchExecutionPort
      └─ search supervisor process  queue・総 deadline・子の終了確認だけ
          └─ read child process     現在認可・検索 SQL・有限 DTO
```

supervisor は DB / HTML parser / 重い projection を import・実行せず、有限 IPC message と timer と ChildProcess lifecycle だけを扱う。read child の生成・kill・close 待ちを supervisor 自身が所有する。HTTP main からの「今 kill して」という callback に期限処理を依存させない。Node の `fork` は IPC 付きの別 process を作り、非同期 child API を提供する。[Node 22.22.3 child_process](https://nodejs.org/download/release/v22.22.3/docs/api/child_process.html)

同じ HTTP process 内の専用 supervisor Worker も、main の同期 SQL から timer を分離する候補になる。ただし HTTP process 自体が終了すると Worker も残れないため、read child の親喪失対策を別に要する。この補足では「Worker を追加するだけで親異常終了も解決」とせず、監視役を別 process にする案を第一候補にする。新 library は不要だが、この構成の実装と終了挙動は未検証である。[Node Worker の実行境界](https://nodejs.org/download/release/v22.22.3/docs/api/worker_threads.html)

受付時の期限 identity を IPC へ渡し、supervisor の受領時に残り予算を判定する。HTTP main の送信待ち、supervisor queue、read child 起動・SQL・結果処理・終了待ちを新しい全時間へリセットしない。process 間で別起点の `performance.now()` をそのまま比較せず、共有可能な期限表現と経過時間の扱いを adapter 契約で決める。期限を過ぎて受領した要求は起動しない。未処理の IPC message を無界の隠れ queue にしない。

HTTP main 自体が止まっている間の HTTP 応答配送は、この配置でも即時にはならない。独立して成立させるのは検索 DB の実計算停止と検索資源の上限であり、main の全面的な応答性改善や既存 write SQL の移設を今回の要件へ追加しない。

### 親終了時の収束と枠の所有

- 通常 shutdown は HTTP main が新規受付を止め、supervisor へ shutdown を送る。supervisor は queue を破棄し、実行中の自己 read child を終了させ、`close` を確認してから shutdown 完了を返して終了する。HTTP main は完了を待つ。
- HTTP main の異常終了 / IPC 切断は、DB 計算をしない supervisor 側で `process` の `disconnect` を受け、新規受付停止・queue 破棄・自己 read child の終了・`close` 待ちへ進む案にする。起動直後も接続状態を確認し、親のない新規 query を起動しない。切断後は HTTP 応答を捏造せず、資源回収だけを行う。[Node process disconnect](https://nodejs.org/download/release/v22.22.3/docs/api/process.html#event-disconnect)
- slot の正本は supervisor に置く。timeout 通知、IPC 切断、`kill()` 成功では slot を空けず、read child の `close` 完了まで保持する。親が retry / 再接続しても古い slot と終了待ちを忘れて並列数を増やさない。supervisor の起動を要求ごとに無制限増殖させない。
- supervisor 自体の強制終了・全 process の同時障害まで、IPC callback だけで回収できるとはしない。実配置の process-group / service-manager による子孫終了、または read child 側の独立した自律期限が、その障害範囲を扱う候補となる。どちらも今回は未実装・未検証で、選定を Manager に返す。単純に supervisor を再起動して旧 read child は消えたと仮定しない。

前節の認可 snapshot、typed input、有限 DTO、期限切れ結果破棄、終了確認前の枠保持を維持する。本補足は総 deadline の監視位置を具体化するもので、P3c の新受入条件・新数値ではない。製品・DB・browser・process・一時試験資材は操作していない。変更は本書末尾だけであり、追記提出後は文書を含む全操作を停止する。
