# P2c-1 独立検証準備

## 状態・入力

作成日: 2026-09-06 JST。開始 12:30:43、文書照合 12:35:24、最終自己照合 12:38:32。これは検証 matrix の準備であり、全ケース未実行。本体の合否、候補 hash の一致、実装の成立を示す資料ではない。

正本は `spec/scenario/editing.md` ED-01/07/08/11、`spec/scenario/import.md` IM-05、`.goal-implement/plan.md` P2c-1-A〜F、`design.md` P2c-1 節、`phases/P2c-1-contract.md` 全文。`spec/pages/index.md` P11/P12 は操作導線の補助に限り、採用契約にない表示方式・将来権限を追加しない。`spec/usecases/` と `spec/testcases/` は存在しない。

`spec-manual-test` の手順・観測可能な期待結果・異常系照合と、`markdown-style` を使用。出力先は Manager 指定の本報告だけとし、手順書生成先の追加や補助 agent、Issue 起票は行わない。

## 6 ID の観測 matrix

「一時 DB」は、正式候補受領後に作る隔離 DB と実 UoW/handler を指す。純粋関数だけの成功を HTTP・ブラウザ成功に置き換えない。実 UI ケースにも必要な保存結果の読み取り照合を併用する。

| 台帳 ID | 主要観測 | 一時 DB・境界試験で十分な枝 | 実 UI が必要な枝 | ケース |
| --- | --- | --- | --- | --- |
| P2c-1-A | 全保存経路の同じ版規則、現在を含む最新 20 版、失敗原子性 | 20/21 境界、同値・metadata 除外、独立した版番号、全 commit 経路と rollback | 手動・自動保存、タイトル・スタイル変更、復元後の履歴表示 | A1〜A3 |
| P2c-1-B | 履歴 pin、最後の pin 解除時刻、GC と物理容量 | 7 日境界、複数 pin、GC の両競合順、削除失敗、二重計上なし | 7 日超相当の履歴から画像を含む復元が表示可能 | B1〜B3、D1 |
| P2c-1-C | 版選択は非保存、現在権限と正確な revision pin による履歴読取 | GET/HEAD/Range/416 の認可順、wrong note/revision、prune 後拒否 | 選択切替・プレビュー、現在 URL 拒否と履歴画像表示の対 | C1〜C3 |
| P2c-1-D | 選択 snapshot の復元、新規現在版化、現在の運用設定を保持 | 同値・変換中拒否、旧 job の遅い commit、data 安全境界、取得物の再利用 | 旧 CSS・画像・タイトル・スタイルの復元、取消・失敗・再読込 | D1〜D3 |
| P2c-1-E | 同一利用者後勝ち、別 actor の競合、退避・同 ID 継続 | prune 後も残る human watermark、system/不明 base、確認 version の失効 | 実 2 tab、dirty/通信/失効、V5 両モード・media-only | E1〜E3 |
| P2c-1-F | baseline 移行の保全と実行環境の成立 | clone migration、既存 version と revisionNo、正当な pin のみ移行 | 再起動後再表示、keyboard/mobile、pending・error 表示 | F1〜F2 |

## 最小入力と証拠の分離

- 個人所有ノート N と別所有者のノート M、小さい正常 SVG asset X を使う。本人 A の操作と、個人ノートへの権限を持たない B の拒否を分ける。複数編集者の actor policy は一時 DB/純粋 policy で作り、個人ノートに B の書込権限があると偽装して本体合格にしない。
- CSS は同じ source URL に対して旧「青」と新「赤」の二つの内容と、正常なコメントのみの空 stylesheet を使う。正式検証時の一時 fetcher/companion で内容を固定し、外部サイトの変更や production の private 接続許可に依存させない。
- asset X の原本・安全化後 bytes/hash、復元前後の canonical、revisionNo/capturedNoteVersion、各 pin、job generation/lease、unreferencedAt を対で記録する。機密・認証値・ストレージ鍵は報告しない。
- 既存の小さい独立 CC0 SVG と V5 harness は後述の参照元から再利用候補を選ぶ。今回、ファイルの収集・コピー・hash 再計算・fixture 実行はしていない。悪性 data 入力は隔離境界試験に留め、アプリ UI への危険な本文注入を前提にしない。

## A: 共通保存と 20 版

| ケース | 操作・条件 | 期待する観測 |
| --- | --- | --- |
| A1 | baseline/新規 revision 1 から意味のある変更を 19 回、さらに 1 回行う。間に同値保存・進捗・失敗理由のみの更新を入れる | 20 版時は 1〜20、次は 2〜21 を保持し現在 21 を含む。prune は最古だけ。除外操作で版は増えない。版番号は再利用しない |
| A2 | manual/autosave/タイトル、表示 style の値変更、import、reference、restore を各 1 回通す。worker が HTML と初期 style を同時確定する対も作る | sanitization・解決後の `{title, html, displayStyle}` の変更だけが各 1 版。同時確定は 1 版。空タイトルの正規化や同じ完了保存は不要な版を作らない。detail/編集の現存するタイトル変更入口を漏らさない |
| A2m | 同じ style 値で automatic/pending→user/complete、同値の初期判定終端、HTML 同値で初期自動判定による default→original を比較 | 前二者は版なし、最後は SYSTEM 版 1。手動の値変更は A2 の human 版と区別する。競合用 note.version の必要な更新を「版なし」と混同しない。同値通常保存は不要な job cancel/reschedule を起こさない |
| A3 | 現在権限/版/lease 検査失敗、検査 I/O 待ち中の更新、UoW 中の注入失敗を各適切な境界で起こす | canonical・版追加/prune・pin・unreferencedAt・関連 job/outbox に部分 commit なし。失敗した復元先が current にならない。実 DB の transaction 根拠を得る |

新規 note.version 0 と revisionNo 1、旧 note.version 37 の baseline revisionNo 1/capturedNoteVersion 37 を明示的に対にする。正の asset scope は revisionNo、0 は current であり、note.version+1 で代用しない。

## B: pin・保持期間・GC

| ケース | 操作・条件 | 期待する観測 |
| --- | --- | --- |
| B1 | X を現在本文から除去するが旧版に残す。fake clock で 7 日を超え、履歴を復元する。その後 current と最後の履歴 pin をともに除く | 履歴 pin 中は GC 対象外で復元可能。最後の pin 解除時から 7 日を起算し、以前の unreferencedAt を復活させない。境界直前・ちょうど期限の判定を採用条件どおり照合する |
| B2 | restore が pin を取る順と GC が deleting を確定する順を分ける。storage 削除失敗も注入する | restore 先行なら GC は削除しない。deleting 先行なら復元は部分保存せず失敗し、利用者入力を保持。削除失敗では row/物理 quota を解放しない。新たな draft upload 期限を復活させない |
| B3 | 同じ X を 20 版が参照し、古い版を順次 prune。X が既に unreferenced の状態で対応 note の同値保存も行う | 20 pin でも物理 bytes は 1 個分。最後の pin まで保持。無関係な同値保存で削除猶予を延長しない。current 200 件/100 MiB と履歴・物理容量の集計を混同しない |

7 日超のために実時間待機や大容量本体試験は不要。一時 DB の時計と実 storage の小物で十分な枝を確認し、復元結果の画像表示は D1 にまとめる。

## C: 履歴表示と読取認可

| ケース | 操作・条件 | 期待する観測 |
| --- | --- | --- |
| C1 | 履歴一覧で旧版→別版を素早く選択し、一方の表示応答を自 tab だけ遅延。閉じる/取消後に再読込 | 選択だけでは本文・版・job を保存しない。現在版表示と日時/原因/actor を区別。遅い旧応答が選択中の表示を上書きしない。完成 srcdoc の初回本文が表示される |
| C2 | X が current にはなく旧 revision にのみ存在する状態で current URL と history URL を要求。本人、匿名、別 owner、別 note、pin のない revision、0/不正 revision を対にする | current URL は拒否、本人の正しい履歴 scope だけ読める。GET/HEAD と正当な Range は認可後に成功。無権限＋不正 Range は先に拒否され、416 で資産の存在を漏らさない。正当に読める資産の不正 Range は 416 |
| C3 | 選択済み版を別操作で prune し再要求。history URL を current 保存へ混入する入力、外部経由 metadata、metadata 欠落も狭く確認 | prune 後の次の HTTP は拒否。既に描いた pixel の即時消去は要求しない。履歴 URL は表示専用で canonical へ保存しない。現在認可・正確な pin・ready を通過する必要がある。metadata 欠落は内部表示を維持し外部読取を止める |

Range の全構文再証明や未変更 sandbox/SVG の全試験は行わない。履歴 route の認可順・scope・表示切替という新しい境界を対象にする。HTTP handler 試験と本体画像表示は別の根拠として記録する。

## D: snapshot 復元

| ケース | 操作・条件 | 期待する観測 |
| --- | --- | --- |
| D1 | 同じ CSS source URL の青い旧版と赤い現在版を作り、旧版を確認→復元→再読込。タイトル・style・X も異ならせる | 選んだ旧 CSS bytes、タイトル、displayStyle、画像が新しい現在版として戻る。現在の赤 CSS に置換しない。受理済み snapshot に不要な再取得をしない。元の履歴は不変。正常な空 CSS は再取得 loop しない |
| D2 | 現在の on/off、bundle/sourcePath、元ファイル、失敗台帳が旧版と違う状態で復元。reference の遅い結果、conversion 実行中、旧初期判定 pending を対にする | 運用設定・元ファイル・恒久台帳を旧状態へ巻き戻さない。復元 style は user/complete。旧 pending/job を復活させない。conversion 中は説明付き拒否。reference の旧 version/generation/lease commit は拒否し、現設定で正当に必要な仕事だけ再 schedule |
| D3 | current と同値の旧版、確認中に prune された版、deleting asset、失敗後 retry。正常な 32 KiB 以下 data と境界超過・破損/SVG 危険要素を隔離検査 | 同値は「現在と同じ内容」で復元不可、版を増やさない。失敗は現在本文を変更せず理由と retry/取消を示す。小 data も履歴所属だけでは安全とみなさず既存内容検査を通す。表示安全化は immutable snapshot を書換えず、復元時の安全化差分は通知する。大 data は内部 asset/pin の既存規則に従う |

同じ URL で異なる CSS の対は IM-05 の「取得時点」を直接確認する。旧 C の base 属性付き空 CSS 不良状態を履歴導入が自動修復するとは扱わず、既存の明示的除去→再追加の移行制限を維持する。全 computed style/pixel 完全一致は追加しない。

## E: 競合・未保存・復元導線

| ケース | 操作・条件 | 期待する観測 |
| --- | --- | --- |
| E1 | 同じ本人の実 2 tab で本文/タイトルを交互に変更。一方は dirty のまま他方を保存。履歴を開く際の保存/破棄/取消も選ぶ | 同一人の後勝ちと通知が成立し、dirty 入力を無言で消さない。履歴プレビューは編集入力と別状態。破棄は直前保存内容へ、取消は編集中内容へ戻る。設定だけの変更は最新本文を潰さない |
| E2 | 一時 policy/UoW で A→B→A、さらに 20 版超の system 更新で B の版を prune。古い base の A、B 後を確認済みの A、未知 baseline 前 base、確認後の再更新を比較 | B の版が消えても別人更新の競合を検出。system と起動者を新しい human mutation と数えない。確認済み範囲は通常続行、未知 base は再読込/再確認。上書き確認は current version に束縛され、追加更新後は再確認。実際に権限のない別人の command は actor 判定より別に拒否 |
| E3 | 元 V5 の作成応答受領→読取待ち→trusted 追加入力→解放を HTML/WYSIWYG で再演。二回目保存の通信失敗、再読込復元、media-only、権限失効を狭く加える | 同じ created note ID へ最新入力を保存。作成版と意味のある追記版だけが残り、重複 note/不要版なし。失敗時は new/stable 退避・復元 mode と移行先が一致し、同じ asset を復元。成功後の両 key cleanup。失効時は理由と内容ダウンロード導線を保ち、拒否を成功表示しない |

E2 は将来 WS の実認可完了を示さない。E3 は作成応答受領済み競合を対象とし、初回 POST の commit 後応答全喪失に対する exactly-once や storage 利用不可での再起動復元を追加条件にしない。未入力の新規離脱で note/版を作らない正常対も E3 に含める。

## F: baseline と実行時の確認

| ケース | 操作・条件 | 期待する観測 |
| --- | --- | --- |
| F1 | 正式候補の backup を clone し移行前後を比較。version 37、default/legacy、進行中 initial pending、current asset あり/なし、無効な current 関係を小さく含める | 本文/title/note.version/updatedAt/表示 source・初期状態/元ファイル/job/assets を保持。baseline revision 1 に正確な snapshot と capturedNoteVersion、legacy/unknown actor。正当な current ref だけ正の pin へ移す。任意 HTML marker から所有関係を捏造せず、不整合は clone で報告し本体移行を止める |
| F2 | 固定候補の開始終了 fingerprint、関連 checks/build/start 根拠を照合。必要な production 再起動後に履歴・復元済み note を再表示し、狭い mobile/keyboard 操作 | baseline/current/history asset が再表示され、保存と復元の pending/error が読める。履歴選択・取消・確認へ keyboard で到達し、狭い画面で本文や操作を失わない。画像は検証者自身が見て記録。既存成功借用と独立実行を明確に分ける |

本体移行・再起動は候補受領後の専有環境でのみ行う。今の Implementer 所有環境は調査しない。migration baseline 時刻と旧 note.updatedAt の意味を区別し、「当時の人間の編集」と虚偽表示しない。

## 異常系照合と除外

| 観点 | 担当ケース・扱い |
| --- | --- |
| 入力・境界 | A1/A2、C2、D3。20/21、同値、revisionNo、32 KiB。全 codec 再証明は対象外 |
| 権限 | A3/C2/E2/E3。現在権限と正確な pin。WS/public/export の新規認可は後続 |
| 空状態 | A1/D3/E3/F1。baseline、同値・空 CSS、無入力離脱 |
| 同時更新 | A3/B2/C1/D2/E1/E2/E3。system と人間、lease と版番号を分ける |
| 削除 | B1/B2/C3/D3。prune と current 除去、GC/deleting、削除失敗 |
| 中断・失敗 | A3/D3/E3/F2。rollback、通信、再読込復元、失効、実行時再表示 |
| 特殊本文 | D1/D3。旧 CSS snapshot と既存 data/SVG 安全境界だけ。全 cascade は対象外 |
| UI pending・復旧 | C1/D2/D3/E1/E3/F2。選択は非保存、取消・完了・復元導線 |

## 既存根拠の再利用範囲

- `reviews/P1-save-race.md`: V5 の両モード trusted 入力、同 ID 継続、作成済み復元、media-only/同 asset 退避。旧 harness は変更せず、新候補で共通保存に接続した部分だけ派生検証する。保存 helper unit を React 全体の証明にしない。
- `reviews/P2b-references.md` の 10:31 以降: current 200 件、CSS snapshot 再利用、正常空 CSS、V4 最終 bytes/quota/削除失敗、metadata の既存境界。P2c-1 では歴史 pin・復元 manifest・scope という新しい影響を再確認し、旧全負荷は反復しない。
- `reviews/P2b-style.md`: 初期自動判定と手動優先、同値 metadata の扱い、最新本文保持、original/default の表示、migration 保全。P2c-1 の版除外・復元 user/complete・pending 非復活へ結び付ける。

以上は採用済み過去候補の根拠であり、変更中の P2c-1 が合格したとは扱わない。現在のコード・test・DB・browser・依存・環境の読み取り/実行は行っていない。外部閲覧・送信、fixture 生成もない。

## 判断と引継ぎ

入力契約に新たな判断待ちの矛盾は見つからなかった。特に「版を増やさないが note.version は必要なら更新」「履歴 pin で保持・読取可能でも current URL は拒否」「履歴内の旧 pending は運用状態として復活させない」は正常対と拒否対を作れる。

文書だけを自己照合し、A〜F と上記異常系の対応を確認した。追加作業は本報告の作成のみ。本体の所有は引き続き Implementer にあり、ブラウザ・listener・test session・wrapper を開始していない。正式候補を受領するまで全操作を停止する。
