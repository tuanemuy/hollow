# P3c 検索・日付・タグ読取の共有契約案

2026-09-10T21:32:11+09:00。P3c / P3d / P4 の接続に必要な読み取り専用設計提案。製品の合否・性能測定・実装開始を示さない。推奨案と未指定値はすべて Manager の採用前であり、新しい受入 gate を確定しない。

## 要約

- 検索は「英数字の語頭一致」と「日本語などの連続部分一致」を共通の typed query にする。混合 query は全条件の AND、各条件は title または本文のどちらに一致してもよい案を推奨する。
- HTML 正本から検索用の本文テキストを作り、現在 note・scope・lifecycle と同一トランザクションで索引へ反映する。検索は索引で候補を絞り、SQL で現在認可と正確な一致を確認してから keyset / LIMIT を適用する。
- 月と calendar は IANA timezone による作成日時の半開区間を共有する。URL に month / timezone を明記して再訪を再現する。P4 の公開検索期間は更新日時の別条件とする。
- title の比較 key と note ID による決定的な順序を使う。ページを JavaScript で並べ替えず、calendar では通常 sort を保持したまま無効にする。
- タグは scope 別の ID と正規化名を分ける。P3c は OR-04 の表示・検索・AND filter・空状態に必要な読取まで、書込 UI と同名付替えを含む移動は P3d に残す。

## 原文と採用済みの制約

[requirements](../../spec/requirements.md)、[OR 全文](../../spec/scenario/organize.md)、[DS 全文](../../spec/scenario/discovery.md)、[SH の公開範囲と検索条件](../../spec/scenario/sharing.md)、[brief](../brief.md)、[design](../design.md)、[plan](../plan.md)を照合した。[P4-prep](../reviews/P4-prep.md)と [P4 共有案](P4-shared-contract.md)は全文を参照し、採用範囲は現在の design を正本とする。

| 出典 | 変更しない条件 |
| --- | --- |
| OR-01/03、WS-02 | 現在の個人 / WS に閉じた一覧・検索。公開だからといって別 scope のアプリ一覧へ混ぜない |
| OR-03、DS-05 | 1 文字では検索を実行せず、2 文字以上から検索する。日本語は部分一致。`cloud` は `Cloudflare` に一致し、`flare` は一致しない |
| OR-03 | コマンドパレット、上部のトリガー、絞り込みチップから検索する。常設の独立検索箱を追加しない。候補には一致抜粋と highlight、失敗には再試行を出す |
| OR-02/05 | calendar は作成日ごと、月 filter も作成日時。利用者 timezone の月境界を使い、表示月と filter を連動する |
| OR-10、DS-03 | 更新日時 / 作成日時 / title の昇降順。検索開始時の既定は関連度。scope 切替で表示形式と並び順を保ち、検索語・タグ・月を引き継がない |
| OR-04/06〜08 | タグは scope 別。複数タグは AND。trim、全半角・大小文字の同一視、名前 50 文字・1 note 50 個。未使用タグ管理と rename / merge は P3d |
| OR-12、採用 P3-Q2 | 移動先の同名タグへ付替え、ないタグは外す。同 UoW で所有・タグ・容量を変更する。作成 / 更新日時・本文版・creator・公開 identity は移動で変えない |
| DS-01/04/05、SH-01 | 公開一覧は現在所有先、公開横断検索は active な公開 note だけ。非公開 WS 所有でも note 自体が公開なら横断検索対象。公開検索の期間は更新日時 |
| 採用 P3a、CLAUDE.md | metadata keyset は 1 page 最大 50 件。通常 `/notes` は非 await の RSC fragment＋Suspense、client owner、現在認可、入力境界 validation を維持する |
| 採用 P4 | 公開取り下げ後は本文だけでなく検索候補・抜粋・件数・タグ情報からも取得させない。公開 identity と所有・作者を混同しない |

SH-07 の creator handle 世代と AC-03 の Google 判断は今回の対象外で、再決議しない。

## 現コードの前提（読み取りのみ）

- [listScopedNotes](../../packages/core/src/application/workspace/usecases.ts) は同 UoW で `requireAccount` → `requireScope` → `listScoped` を実行し、51 件の metadata から 50 件と続き cursor を返す。cursor は現在 scope と更新日時 / ID に束縛する。
- [NoteRepository](../../packages/core/src/domain/note/ports/noteRepository.ts) の `listScoped` は metadata 専用。[libSQL 実装](../../packages/core/src/adapters/libsql/repositories/noteRepository.ts) は現在所有列・active lifecycle・更新日時 / ID の降順を SQL で扱う。旧 `listPersonal` は全本文を返す別経路であり、検索の土台にはしない。
- [notes schema](../../packages/core/src/adapters/libsql/hollowSchema.ts) は所有 account / workspace を分離し、title / HTML / display / version / UTC timestamp_ms を持つ。この読取対象には検索 projection や tag 表の定義はない。公開状態は現在の [domain Note](../../packages/core/src/domain/note/entity.ts) では private に限定される。P4 の公開条件を今動いていると扱わない。
- [commitNote](../../packages/core/src/application/note/commitNote.ts) は共通保存、復元、版・参照の接続点である。[trash](../../packages/core/src/application/note/trash.ts) は別の `notes.save` 経路を使う。検索 projection の更新を editor 保存一か所だけに追加しても lifecycle 更新を覆えない。
- [HtmlSanitizer port](../../packages/core/src/application/ports/htmlSanitizer.ts) は `html` と `text` を返す。[Node 実装](../../packages/core/src/adapters/node/htmlSanitizer.ts) は現在、sanitize した HTML から一部の非本文タグを除いて text を作る。検索専用の一致・offset・可視性契約まで成立済みとは扱わない。
- [notes route](../../apps/web/app/routes/notes.index.tsx)、[NotesFragment](../../apps/web/app/components/hollow/NotesFragment.tsx)、[ScopedNotesBoard](../../apps/web/app/components/hollow/ScopedNotesBoard.tsx)、[workspaceInput](../../apps/web/app/presentation/workspaceInput.ts) は scope / cursor の loader identity を持つ。新しい query / sort / month / tag 条件はこの identity を拡張する。無関係な settings route の例外を `/notes` へ横展開しない。

コードの存在と接続を確認しただけで、現在の不具合を検証した記録ではない。実行中の P3b-2 icon の source・環境には触れていない。

## 1. 検索語とテキストの契約案

### query の最小意味

検索 UI の入力文字列と、意味を正規化した検索条件を分ける。query は SQL / FTS の生構文として受け取らず、presentation で形と有限長を検証し、内側の純粋関数で typed term 列にする。`OR`、引用符、`*`、`%`、`_` を利用者が入力しても、SQL / FTS 演算子にはしない。高度検索構文を追加する要件はない。

推奨する可逆な初期解釈は次のとおり。

- 前後の空白を除いた入力が 1 Unicode code point の場合は非実行とする。正規化で 1 文字が複数文字へ展開しても、この下限を迂回しない。未入力は通常一覧、1 文字は「2 文字以上で検索」の別状態にする。
- 検索比較には NFKC と locale 非依存の小文字化を使う。ひらがな / カタカナ、異体字、濁点の有無、同義語の同一視は追加しない。tag と共有する正規化の影響は後述する。
- 正規化後の連続した ASCII 英数字は 1 語とする。大文字から小文字への境目は分割しない。`Cloudflare` は一つの語であり、camel case 分割で `flare` を一致させない。
- 日本語など非分かち書きの連続文字列は、その連続部分文字列を探す。空白・句読点は条件の区切りとする。日本語と ASCII 英数字の境目も条件を分ける。
- 全 term は AND、各 term は title または本文に一致すればよい。query の全体を完全 phrase にすることや、複数 term を OR にすることは初期案にしない。
- 全体は 2 文字以上でも分割後の term が 1 文字になる場合がある。その term を黙って削除しない。記号だけで term がない入力は、検索可能な語がないことを示し、全件検索へ化けさせない。

| query / 対象 | 提案する結果 |
| --- | --- |
| `cloud` / `Cloudflare` | 一致 |
| `flare` / `Cloudflare` | 不一致 |
| `東京` / `東京都の設計` | 一致 |
| `東` | 検索非実行 |
| `東京 cloud` / title に東京、本文に Cloudflare | 一致 |
| `東京Cloud` / 東京と Cloudflare が離れている | 2 条件の AND として一致。隣接 phrase ではない |
| `東 京` | 2 個の 1 文字条件を両方要求。どちらかを無視しない |
| `cloud-flare` | `cloud` と `flare` の 2 条件。Cloudflare だけでは後者を満たさない |

混合 query の隣接性・AND と句読点の意味は原文未指定であり、上表を仕様の仮定として採用するか Manager が決める。単語辞書・形態素解析・かな読み検索を必須にしない。

### 本文 projection と highlight

検索の正本は保存済みの現在 HTML から作る本文テキストであり、原本、履歴、未保存 draft、HTML 属性、URL、CSS ソースを全文検索しない。script / style / head / template / comment の内容は除外する。ブロック区切り・改行・table cell の境界に separator を入れ、隣接 inline text は連結する。entity は HTML parser の解釈で復号し、正規表現で全タグを削る方式にしない。

「可視テキスト」は初期案では本文の構造上のテキストとする。`hidden` や明示的な非表示属性・inline style の取り扱いは一つの純粋な projection 規則へ固定する。任意 stylesheet、media query、端末幅まで評価した pixel 上の可視性は保証しない。検索のたびに browser や外部 stylesheet を実行・取得しない。この限界を隠して「レンダリングと完全一致」と主張しない。外部 CSS の変更で検索結果を非同期に変える設計にも広げない。

projection は表示用 text と比較用 normalized text を分け、正規化後の一致範囲を元の表示用 text の範囲へ戻せるようにする。NFKC や大小文字変換は文字数を変え得るため、normalized offset を元文字列へそのまま使わない。結合文字、全半角、inline tag 跨ぎの対は詳細実装で対応を確認する。

highlight は text と範囲、または text / matched の segment 列を DTO で返し、React の text node と `<mark>` で表示する。HTML 本文や FTS highlight 文字列を `dangerouslySetInnerHTML` へ直接渡さない。title 一致と本文一致を区別し、一致しない本文先頭を一致抜粋として示さない。抜粋幅は有限の表示値を後で採用する。

### 関連度と title 順

初期関連度は title 完全一致、全 term が title に一致、title と本文に分散、本文のみ、の決定的な段階を推奨する。各段階の同順位は更新日時降順＋ID降順とする。これは原文未指定のランキングの一案であり、最適な検索品質を測定済みとはしない。

全 private corpus の document frequency を公開検索の順位へ流用しない。非公開文書が増減すると公開結果の score / 順序が変わる方式は、公開対象だけを検索する境界を説明しにくい。上記の note 内局所 score なら、別 scope の文書数へ依存しない。後に別 ranking を選ぶ場合も corpus の閲覧境界と cursor の順位比較を揃える。

title 順は NFKC・小文字化した永続比較 key の binary 順＋note ID を推奨する。原文は日本語を含む安定順を要求し、読み仮名による五十音順までは要求しない。同じ比較 key の異表記を ID で必ず決着する。ページごとの `localeCompare` や `Intl.Collator` による JS sort は全体順を作れないため使わない。五十音 / 自然数順を求める場合は、別の比較 key と全行の再索引が必要な仕様変更として扱う。

## 2. 索引・現在認可・更新境界

### 第一候補と代案

SQLite の標準 FTS5 trigram は、3 Unicode 文字未満の全文検索語に一致しない。したがって「trigram を入れれば日本語 2 文字の検索が成立する」とは扱わない。[SQLite FTS5 trigram](https://www.sqlite.org/fts5.html#the_trigram_tokenizer)

第一候補は、アプリ側で前処理した英数字語と非分かち書きの 1 / 2-gram を、区別可能な ASCII token として FTS5 に投入する方式である。標準 tokenizer へ正規化済み token を渡し、native custom tokenizer を追加しない。英数字だけを prefix query、gram は完全 token query とする。query は typed term から安全に組み立てる。FTS5 は prefix query と prefix index を持つが、現在の libSQL runtime で利用できる設定は正式実装時の確認事項である。[SQLite FTS5 prefix](https://www.sqlite.org/fts5.html#fts5_prefix_queries)

1-gram は単体の 1 文字 query を許すためではなく、`東 京` のような 2 文字以上の query 内にある短い term を落とさないために使う。2 文字以上の日本語 term は 2-gram の共通候補を求め、その後で normalized text の連続一致を正確に確認する。例えば同じ gram を別の場所に持つだけの note を一致としない。

scope token を索引候補へ含めても、それを認可にしない。通常の note / scope / membership の現在行を SQL で照合する。P4 で public 用の候補を追加する場合も、現在の public eligibility を別に照合する。FTS に private text を持つ内部 DB と、外部に返す公開結果を混同しない。

代案は通常表の `(scope, term kind, term, note ID)` postings と binary prefix range、note ID から置換できる索引である。FTS5 の利用条件が成立しない場合の候補だが、gram ごとの行数が大きくなる。全文 `LIKE '%語%'` や全件 JS 配列を無言の fallback にしない。SQLite の通常 LIKE 最適化は先頭 wildcard などに制約があり、Unicode の大小文字同一視もアプリ規則とは別である。[SQLite LIKE 最適化](https://www.sqlite.org/optoverview.html#the_like_optimization)

### query の処理順

1. 現在の要求者と検索面を認可する。個人 scope は session 本人から導出し、利用者指定 account ID を信用しない。
2. scope / 公開条件、query、tag、日付の候補条件を索引付き SQL で結合する。
3. title / 本文の正確な連続一致と現在の note / lifecycle / scope / policy を SQL で確認する。
4. 正確に一致した集合へ score・order・keyset を適用し、最後に `LIMIT 51` を置く。
5. 最大 50 件の metadata と有限抜粋だけを DTO にする。件数・facet・calendar の集計も同じ認可済み集合を使う。

候補だけを先頭 N 件に切ってから JS で正確照合しない。その方法では後ろの真の一致が消え、0 件や nextCursor を誤る。応答サイズの上限と DB が処理する候補数は別であり、LIMIT だけを実行時間の保証にしない。

正確照合用の正規化 text は DB 内に保持し、ブラウザへ全本文を返さない。SQL から返すのは表示に必要な抜粋または有限範囲である。private 応答を利用者間の共有 cache へ置かず、公開 cache を用いる場合も現在 eligibility と content identity を再確認する。現在読めない結果の title / count を「権限不足候補」として返さない。

### 同一トランザクションの更新

| 変更 | 同じ UoW で揃える内容 |
| --- | --- |
| 新規・通常保存・変換成功・再生成・履歴復元 | 現在 HTML / title と search text / title key / token projection を同じ確定内容へ更新 |
| 表示設定・参照資源変更 | 検索 text を変える projection 規則に影響する場合だけ再計算。metadata / updatedAt の query は現在 note と一致 |
| trash / purging / 完全削除 | active 検索 eligibility を即座に外す。完全削除で projection / postings も削除。復元は現在の保持 HTML から戻す |
| 所有移動 | 現在 scope、タグの付替え、scope 索引を一括変更。本文 text / title 比較 key は内容不変なら再生成不要。日時や creator を書き換えない |
| publish / private / link への変更（P4） | 公開 eligibility を現在状態へ同 Tx 反映。旧 public 候補・抜粋・count を公開応答から除く |
| member 失効 / WS 削除 | membership の現在照合 / WS lifecycle により全関連検索を拒否。全 note を後から更新し終わるまで旧権限を認めない |
| tag rename / merge / delete（P3d） | tag 正本・関係・読取用集計を同じ確定状態へ。本文 HTML へ tag 名を埋めて再保存しない |

projection を outbox の遅延更新だけに任せない。outbox は修復や再構築の通知には使えても、公開取り下げ・移動・保存直後の正確性を依存させない。projection の解析は純粋な入力処理として transaction 外で準備できるが、commit 時は対象 version と投影元 identity を確認して古い解析結果を適用しない。

更新対象は application の port と UoW 契約に置き、SQLite / FTS 操作は adapter 内に閉じる。`commitNote` と直接 lifecycle 保存の全経路をつなぐ方法は正式担当が決める。既存 HTML 正本や 20 版契約を検索の都合で書き換えない。

旧データの backfill は bounded keyset と版照合で行う案を推奨する。全 HTML をメモリへ一括読込せず、構築中に空索引を完成検索として公開しない。同期切替や検索だけの準備中表示など、完全性を保つ移行方法を正式設計で決める。失敗した batch は索引側の transaction を戻し、成功済み位置から再開できるようにする。元 note の HTML・title・日時・版を索引生成のために更新せず、失敗を元 note の削除や再作成で回避しない。旧 table の全旧列と既存物を保持する。

### 資源の未測定リスク

1 / 2-gram は全ての長さの substring を列挙せず、入力長に比例する個数で作る。同じ note / field 内の同一候補 token は必要に応じて重複を抑えられる。ただし ASCII encoding、位置情報、転置索引は容量を膨らませ、最大 800 KiB の HTML 一件から大きな projection が生じ得る。線形だから十分速いとは主張しない。

正式実装の開始時に、実 runtime の FTS5 対応と 2 文字・混合語・誤候補除外の狭い成立確認を、索引方式決定の依存として置くことを提案する。通常文、長い日本語、反復語、候補が多い短語の索引サイズ・更新時間・query plan も方式選定の根拠とする。現時点では一つも実行しておらず、確認群を正式 gate に採用するのは Manager である。測定前に候補件数を黙って切り詰めたり、日本語を 3 文字以上へ変更したりしない。索引の derived DB bytes を既存 object quota へ無断で加算する新しい課金・容量規則も決めない。

OR-03 の timeout は UI の timer だけでは成立しない。adapter が実際の DB 処理を有界に止めるか、専用の実行資源へ隔離して確実に収束させる方式が必要である。単なる `Promise.race` の敗者を走らせ続ける方式を処理中断と呼ばない。現在の public driver API で可能な取消 / deadline は未確認で、private driver API や既存 FD 対策の解除を前提にしない。

## 3. timezone・calendar・URL・cursor

### 一つの条件モデル

query state は scope、表示形式、入力 query、tag IDs、month、timezone、通常 sort、cursor を区別する。表示形式と sort は preference、query / tag / month は scope filter とする。URL を正本とし、保存した preference は URL に値がない初回だけ補う。

`month` は利用者の civil `YYYY-MM`、`timezone` は検証済みの IANA 名を持つ案を推奨する。UTC offset 一個では夏時間を含む過去 / 未来の月を再現できない。サーバー側の default timezone は利用者 timezone ではない。Intl は明示的な timezone を受け取り、未指定なら実行環境の zone を使うため、曖昧な省略を永続 query の意味にしない。[ECMA-402 DateTimeFormat](https://tc39.es/ecma402/#sec-initializedatetimeformat)

初回は URL の有効な timezone、なければ browser が検出した named zone を使い、月・calendar を確定する前に URL へ反映する案を推奨する。SSR で browser zone が未判明なら、この日付部分を準備中にし、サーバー UTC で一度完成表示して後から日付を動かさない。検出不能の場合は UTC を明記し、zone を選べる回復導線を出す。利用者プロフィールへ timezone 設定を追加する P5 要件には広げない。

URL に zone がある場合は共有 / 再訪でもその zone を保持し、「この端末の timezone に変更」を明示操作とする。端末が変わるたびに同じ URL の月集合を無言で変えない。この共有時の解釈は原文未指定の仮定として Manager が採用する。

### UTC 区間への変換

application の日付境界 port は civil month / day と zone を受け、UTC の半開区間 `[start, end)` を返す。domain の絞り込み条件は確定した instant として扱い、SQL は `created_at >= start AND created_at < end` にする。月を 30 日、日を常に 24 時間、境界を一律 9 時間差として求めない。

夏時間で存在しない・重なる midnight は、その civil date が始まる最初の有効 instant を境界にする案を推奨する。存在しない civil day は空区間となる。終了境界は次の civil day / month の境界を独立して解決する。変換 adapter の実装方式と実 runtime の zone data 対応は未検証であり、Node 22 で未確認の API が使えると仮定しない。

calendar は対象月内の日付ごとの境界と、同じ query / tag filter を使う。各日の count と初期数件を SQL で取得し、「他 N 件」はその日の独立した createdAt / ID cursor で続きを取得する。月の全 note を JS 配列へ集めない。月内の日数分の indexed query または同等の SQL 集計で実現できるが、SQL 回数と実測は詳細設計へ残す。

### 操作ごとの整合

| 操作 | 条件の変化 |
| --- | --- |
| list / tile → calendar、month なし | 利用者 zone の現在月を clock port から決め URL に入れる |
| month 指定済みで calendar へ | 同じ month / zone を表示。別の calendarMonth を作らない |
| calendar の前月 / 次月 | month filter と URL を同時更新し、day 展開と続き cursor を解除 |
| calendar → list / tile | 同じ month filter を保ち、通常 sort を再度有効にする |
| calendar 中に月 filter を解除 | 全月 calendar は提供せず、list に切り替えて month を解除する案を推奨。表示月と filter が食い違う状態を作らない |
| query / tag / month / zone / sort を変更 | note cursor と stale request identity を更新し、旧結果を採用しない |
| scope 切替 | view / 通常 sort / zone を保ち、query / tag / month / cursor / day 展開を解除。calendar の場合だけ新 scope の現在月を新たに設定する |
| query を新しく適用 | 既定は関連度。検索中に利用者が選んだ別 sort は保つ |
| query を解除 | 検索前の通常 sort へ戻す。relevance だけが URL に残る場合は非検索の既定更新日時降順へ解決する |

calendar の日内順は作成日時降順＋ID降順の固定を推奨する。OR-10 の sort selector は無効だが、前に選んだ通常 sort は失わない。scope 切替時の「filter reset」と「calendar には表示月が必要」を、旧月を引き継がず新しい現在月を設定することで分ける。

月 selector は月の連続範囲を有限 page で出し、0 件の月も 0 件と示す方式が原文に適合する。全 note の最古から今までの月を一括生成しない。P4 の公開検索期間は別フィールドの `updatedAt` 区間にし、P3 の `createdAt` 月条件を再利用して取り違えない。

### 安定 order / cursor の条件

cursor は version、検索面、正規化 scope、query semantics version / terms、整列した tag IDs、month / zone、sort、最後の比較 tuple を束縛する。display-only な list / tile 切替は同じ集合を共有できるが、calendar の day cursor は別種とする。改変や条件不一致は最初から開く回復案内へ接続し、cursor を認可の証明にしない。

更新日時 / 作成日時は `(timestamp, ID)`、title は `(title comparison key, ID)`、relevance は `(score tuple, updatedAt, ID)` を SQL の順序と cursor の比較で一致させる。全同値にも ID を置く。昇降順で不等号と ID の方向を揃える。

検索中の保存・削除・移動がある live list の keyset は、複数 request にまたがる全件 snapshot を保証しない。各 request は現在認可された一貫した page を返し、既知の変更後は invalidate して先頭から再取得する。読込済み ID の二重表示を抑える。query / scope の遅い旧成功・失敗が新画面を上書きしないよう request generation を全条件へ拡張する。無変更集合の安定順と、並行更新中の完全な snapshot を同じ保証にしない。

全選択は P3e の別の集合固定契約であり、「現在画面に読み込んだ page の全件」を検索結果全体とみなさない。P3c でその snapshot 機能まで実装しない。

## 4. タグ identity と P3d への依存

### 正規化案

Tag は immutable ID、owner scope、表示名、normalized name を持つ。`(scope, normalized name)` の一意性を DB の最終判定にし、note-tag 関係も重複不可にする。表示名は前後 trim 後の入力を保ち、名前の比較だけを正規化する。

最小案は `NFKC → locale 非依存の小文字化 → NFKC` で normalized name を作る。ECMAScript は NFKC を指定した normalize を定義するが、どの正規化を業務上同一とするかまでは決めない。[ECMAScript String.normalize](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.normalize)

この案は全角英数字・半角カナのほか、互換文字も折り畳む。例えば丸数字と通常数字も衝突し得る。原文の「全半角」より広い同一視であり、比較 key の仮定として明記する。検索索引は再構築できるが、P3d で利用者が統合した tag を正規化変更だけで元の二つへ自動復元できるとはしない。内部空白は保持し、空白の連続を一個へ縮めたり、かな・濁点・アクセントを同一視したりしない。大文字小文字の比較は ECMAScript の標準小文字化であり、すべての言語の case-fold 同値（例えば `ß` と `ss`）を追加保証しない。

50 文字は trim 後の表示名を Unicode code point で数える案を推奨する。UTF-16 code unit や UTF-8 bytes へ無言で置換しない。比較 key の正規化による展開と表示名の入力上限は分ける。1 note 50 個は一意 tag ID の個数であり、重複追加や同名衝突で枠を消費しない。境界 validation の input bytes 上限は別に設けるが、本書では値を確定しない。

### 読取の契約

- OR-04 のタグ欄は現在 scope の active な可視 note の使用件数で並べる。頻度は note 件数であり、本文中の出現数・版数ではない。同数は normalized name＋ID で決定する。
- query / month の filter によってタグ候補集合を細らせる faceted search は原文必須ではない。初期案は現在 scope 全体の使用頻度を表示し、選択 tag の AND だけを note 検索へ適用する。
- tag 一覧の検索と続き読込も scope 認可後に SQL で行い、全 tag を client 配列へ読み込まない。使用 0 件は OR-04 では隠し、P3d の管理画面は 0 件も扱う別 query とする。
- URL の選択は tag 名でなく scope 内 tag ID を使う。rename で filter を失わず、表示名を現在の値へ更新できる。
- 削除済み / 不明 / 別 scope の tag ID は、その tag の存在を明かさず「利用できない条件」として 0 件と解除導線を出す案を推奨する。条件を黙って捨てて結果を広げない。
- selected tag IDs は重複を除き順序を正規化する。SQL はすべての ID の存在を要求し、`EXISTS` 群または該当 distinct 件数による AND とする。1 個の OR に縮小しない。
- P4 の公開 page の tag count はその page の現在公開 note のみ。DS-05 の横断 tag は normalized name で scope を跨いで一致させる。アプリの tag ID と公開検索の tag-name 条件を別型にする。

### 書込と移動へ渡す条件

rename は tag ID を保持する。同じ normalized name へ rename するときは OR-08 の統合確認が必要であり、他 tag を無言で上書きしない。merge / delete 後の旧 URL ID を自動 alias にする要件はないため、初期案は不明条件として 0 件と解除導線へ接続する。

OR-12 の「同名」はこの normalized name で比較する。移動 transaction の確定時に移動先 scope の既存 tag を lookup し、あれば移動先 ID へ付替え、なければ関係を外す。新しい tag を自動作成しない。元の tag ID を別 scope へ持ち運ばず、source / destination の頻度を同じ確定状態へ揃える。

P3c は Tag value / query input / reader / relation の読み方を先行して定め、OR-04 の表示・filter と空状態を実装できる。通常 UI でタグを作成する導線、OR-06/07/08 の mutation、実 note move は P3d の残条件とする。read port を空配列固定の仮実装にせず、将来の書込が同じ schema / identity / normalization を使用する依存を正式委譲で渡す。P3c 単独の読取確認に隔離 fixture を使う場合も、P3d の end-to-end 完成とは区別する。

## 未指定値と採用判断

以下は初期候補であり、現在の基準値や実測済み値ではない。

| 項目 | 候補 / 根拠 | 採用前に分ける点 |
| --- | --- | --- |
| query 上限 | 200 code point、最大 16 term。短い検索入力と有限 SQL 条件数を両立する初期値 | 長文貼付を拒否する UI の説明、正規化展開、SQL parameter 数との照合が必要。無言 truncate はしない |
| debounce | 250 ms。連続入力中の要求を抑える UI 初期値 | 原文は時間を指定しない。既存 slug の 300 ms を検索要件として転用しない |
| 検索 deadline | 3 秒を候補に実行方式と通常文 / 多候補で評価 | UI timeout と DB 処理停止を分ける。driver に未確認の取消能力を仮定しない |
| calendar 日内初期数 | 3 件＋他 N 件。月表示を読みやすくし残件を失わない初期値 | 390px の実表示と keyboard 展開は正式 UI 検証。3 件を原文の固定上限にしない |
| note page | 既採用の 50 件を継続 | 件数の上限だけで DB 計算量を有界と主張しない |
| tag page / 抜粋長 / SQL worker 資源 | 正式設計へ残す | 追加の安全値を本書から gate にしない |

最小案として、混合 query の AND・NFKC / 小文字化・決定的 title key・URL timezone・live keyset・tag ID filter をまとめて提案する。query / 比較索引は再構築でき、表示名と HTML 正本を保持する。tag の同一視は後続の明示統合へ影響する点も含めて採否を決める。索引方式と deadline の実現性は正式実装の read-only / 隔離確認で根拠を得てから固定する。

利用者に改めて尋ねるほど結果を大きく変える要求は現時点でない。五十音順・言語別の厳密 case-fold・端末に追従して共有 URL の月を変える仕様を選ぶ場合だけ、上記初期案との違いを Manager が判断する。SH-07 と AC-03 の既存質問はそのまま残す。

## 後続への受渡しと未実行範囲

P3c へ渡すのは OR-01〜05/10 の query / projection / index / calendar / order と、OR-04 の tag 読取である。P3d は OR-06〜08/12 の書込・移動を同じ契約に接続する。P4 は公開 eligibility と公開 tag-name / updatedAt 期間を加え、別の検索意味を発明しない。P3e の全選択 snapshot、P4 の公開 route、P5 のプロフィールは先行実装しない。

goal-implement / manager-loop に従う設計調査として、doc-style / markdown-style で出典・仮定・未決を分けた。spec / spec-implement は使っていない。製品 code・DB・browser・process・build・test・fixture・port prototype・依存・goal API・全体管理文書は変更していない。読み取りに加えた外部操作は上記の公式資料の閲覧だけである。

本書以外の file は作成していない。索引構築、query plan、速度、保全、UI、認可の実行時観測はすべて未実行。製品の合格 / 不合格を判定していない。2026-09-10T21:38:22+09:00 に提出し、文書を含む全作業を停止する。

## 補足: タグの幅同一視と Unicode case folding

2026-09-10T21:41:52+09:00。OR-06 のタグ同名判定だけを具体化する未採用提案。本補足の推奨は、前節のタグ用 `NFKC → toLowerCase → NFKC` 案を置き換える。検索 query / title の再構築可能な projection と、tag ID の統合・OR-12 の付替えを決める同名 key は別契約にする。

### 小文字化と大小文字の同一視は別

ECMAScript の `toLowerCase` は Unicode Default Case Conversion に従う小文字化であり、caseless matching そのものではない。context-sensitive な変換も含む。[ECMAScript toLowerCase](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.tolowercase)

単純な小文字化では小文字の `σ` と語末形 `ς` が異なるまま残り、`ß` と `SS` も同じ結果にならない。Unicode の full case folding は `Σ` / `σ` / `ς` を `σ` へ、`ß` / `ẞ` / `SS` を `ss` へ揃える。OR-06 の大小文字同一視を、ASCII と通常の小文字化だけで満たしたとはしない。[Unicode 17.0 CaseFolding.txt](https://www.unicode.org/Public/17.0.0/ucd/CaseFolding.txt)

full folding は `C` と `F` mapping を使う。1 code point に限定する simple folding や、言語固有の Turkic `T` mapping は採用しない。必要な canonical normalization も行う。Unicode の canonical caseless matching は、fold の前後に NFD を使って canonical equivalent な表記を揃える。[Unicode 17.0 §3.13.3 / §3.13.5](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-3/)

### 比較する二案

| 契約 | A: 幅変換＋canonical full folding（推奨） | B: NFKC 系の互換正規化＋full folding |
| --- | --- | --- |
| 幅の変換 | UnicodeData の decomposition type が `<wide>` / `<narrow>` の mapping だけを適用 | 幅を含むすべての compatibility decomposition を適用 |
| 大小文字 | locale 非依存の Unicode Default Full Case Folding | 同左 |
| canonical な表記差 | NFD を fold の前後に適用して揃える | canonical と compatibility の両方を揃える |
| 原文からの追加同一視 | canonical equivalent と標準 full folding が定めるもの | さらに丸囲み、上付き、単位記号などの compatibility equivalent |
| 実装依存 | 幅 mapping、full fold mapping、canonical normalizer | full fold mapping、compatibility normalizer。合成順序を明示する |

幅変換は文字の表示幅を推測する処理ではない。`East_Asian_Width` の Wide / Ambiguous という分類から変換先を発明せず、UnicodeData の `<wide>` / `<narrow>` mapping を使う。`<circle>`、`<super>`、`<square>` などは別の decomposition type であり、A はそれらを幅の違いとして折り畳まない。[UAX #44 Decomposition Type](https://www.unicode.org/reports/tr44/#Character_Decomposition_Mappings)

以下は公式の mapping / normalization 規則を組み合わせた設計上の期待であり、製品で実行した結果ではない。

| 名前の対 | A | B | 区別の意味 |
| --- | --- | --- | --- |
| `ＡＢＣ` / `abc` | 同名 | 同名 | 幅＋case |
| `ｶﾞ` / `ガ` | 同名 | 同名 | 半角カナ・濁点の幅 mapping＋canonical 表記 |
| `Σ` / `σ` / `ς` | 同名 | 同名 | full fold。単純 lower だけでは不足 |
| `Straße` / `STRASSE` | 同名 | 同名 | full fold の複数 code point mapping |
| `é` / `e`＋結合 acute | 同名 | 同名 | canonical equivalent。`é` / `e` は別名のまま |
| `①` / `1` | 別名 | 同名 | 丸囲みは幅ではない |
| `²` / `2` | 別名 | 同名 | 上付きは幅ではない |
| `㎒` / `MHz` | 別名 | 同名 | 単位記号の compatibility decomposition |
| `カ` / `か` | 別名 | 別名 | かな読みの同一視は追加しない |

A も「あらゆる互換形を区別する」方式ではない。例えば full folding 自体が `ﬀ` を `ff` にし、canonical normalization は `K` と `K` を揃える。これらは幅変換を広げた効果ではなく、採用する Unicode caseless / canonical の意味に含まれる。A と B の差は、丸数字などを含む compatibility normalization 全体を追加するかである。[Case folding mapping](https://www.unicode.org/Public/17.0.0/ucd/CaseFolding.txt)、[Unicode Normalization Forms](https://www.unicode.org/reports/tr15/)

### 正規化の合成と追加しない処理

A は、trim 後の表示名へ幅 mapping `W` を適用し、`NFD(CF(NFD(W(name))))` を比較 key の意味とする案である。`CF` は default full fold。key の保存表現を NFC にするか NFD にするかは実装選択だが、比較の同値関係を変えない。

B の採用には、単に `NFKC().toLowerCase()` と書くのではなく、compatibility caseless matching の合成を定義する必要がある。Unicode D146 は `NFKD(CF(NFKD(CF(NFD(name)))))` を定め、互換分解によって現れた文字へ再度 fold を適用する。一方、名前の似た `NFKC_Casefold` は Default_Ignorable_Code_Point の除去も含むため、同じ処理として無言で置き換えない。不可視文字の除去を今回の要件へ追加しない。[Unicode D146 / identifier caseless matching](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-3/)

両案とも locale 固有の case tailoring、ひらがな / カタカナ変換、アクセント除去、異体字・見た目の類似文字の統合、内部空白の圧縮は加えない。canonical normalization は結合記号を消す処理ではない。

### 版固定と配置の提案

タグには A を推奨する。幅と大小文字という OR-06 の条件を満たしつつ、丸数字や単位記号まで同名にする拡張を避ける。B は新規 tag の重複拒否・明示 merge・移動先の同名付替えを増やすため、採用する場合は原文未指定の拡張として Manager が明記する。

`TagNameKey` の意味と normalization version は domain の共有契約に置く。外部依存を必要とする場合は、同じ入力と同じ版から同じ key を返す同期・純粋な `TagNameNormalizer` port を内側に置き、固定 mapping / normalizer の adapter を注入する。application が tag の作成・rename・同名 lookup・OR-12・P4 tag-name 検索に同じ契約を使う。DB collation、利用者 locale、browser の ICU へ同名判定を委ねない。

一次資料の参照版は Unicode 17.0.0 である。製品へ採用する Unicode 版は、canonical normalizer を含む実行環境との整合を正式担当が確認して固定する。CaseFolding.txt と UnicodeData.txt を異なる版から混ぜず、`latest` URL の内容を起動時に取得しない。UCD の公開済み版は固定の archive を持つ。[UAX #44 版の安定性](https://www.unicode.org/reports/tr44/#Stability_of_Releases)

ECMAScript 標準 API だけに幅限定 mapping や full case-fold method があるとは仮定しない。必要な版の data を静的に取り込む方式か、版の明確な実装を使う方式かは正式実装で決める。この補足で新 library、全 Unicode 実装、mapping file、prototype を作成しない。

scope＋同名 key の一意性、trim 後の表示名保持、表示名 50 code point、1 note 50 tag ID は維持する。fold による key の展開を理由に入力文字数の意味を変えない。比較版を変更する場合は既存表示名から衝突を調べ、異なる tag ID を自動 merge しない。具体 schema / migration / test gate は本補足では確定しない。

本補足は公式資料と文書の読み取りだけに基づく。製品・環境・実測は未実行。変更は本書末尾だけであり、追記提出後は文書を含む全操作を停止する。
