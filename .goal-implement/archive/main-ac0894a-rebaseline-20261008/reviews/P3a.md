# P3a 独立検証

P3a-A/F は P3a-V1（390px の所属先メニューの負方向クリップ）で不合格。P3a-B/C/D/E と共有36項目は、今回変更した scope・現在認可・容量・移行・UI接続の範囲で合格。全42項目のうち40合格・2不合格。Manager は V1 を A/F の差戻し対象として受領した。製品修正はしていない。

検証期間は 2026-09-10T17:17:36+09:00〜2026-09-10T17:52:21.623+09:00。実行は Node22.22.3、固定 production bundle、独立の実DB/実storageと本体Chromeを使用。独立試験44件成功と UI の V1 不合格を分離する。後続の招待/role UI・移動・検索/整理・WS削除・公開/Driveは未接続のままであり、P3aの合格にも不合格にも加えていない。

## 固定対象と根拠の扱い

正本は plan.md P3a-A〜F、採用design P3a/Q1/Q2/Q3、元WS/OR/ED/IM/JB、[独立準備](P3a-prep.md)。[実装報告](../phases/P3a.md)は全文を読み、99製品pathの責務変更と最終・途中の根拠を区別した。goal-implement/manager-loop、manual-testとブラウザ終了規約を適用した。全process調査・global cleanup・Issue起票は委譲制約により行わず、自分のセッションだけを終了した。報告の構造には markdown-style/doc-style を使用し、必要な失敗・時系列・限界は削除していない。spec/spec-implement、goal API、製品/管理直下ファイル変更は行っていない。

| 識別 | 開始・終了照合値 |
| --- | --- |
| HEAD | `b093802e4037282855c133d0fe68a3147de70e0c` |
| source | 654path、`a30746e485e16936e81ed51704e9db417f2c73a35eb2c19986d0c474574c1d29` |
| lock | `7789972514666bf5fbc61f775887a43b0c71678cd854f9758459cf9aa385b3bf` |
| server bundle | `c20494989908edcdef81a1be1f3168f8d07ac8ce4fe09f9e4f4bee13f6851d24` |
| 元自己資材 | `/tmp/hollow-workspace.CgEtgi`、44file、`bbd36137db69e2f9878df78a6e2923b6e16674246de5513c64733af084b6f3a4` |
| 独立資材 | `/tmp/hollow-p3a-verify.UvTYeF`。43非DB fileの一覧は同dir `evidence-manifest.json`、aggregate `6696822aeb1ba2589e1e043323bdda4e57b8fd878d8c6a22ed9ec34d2c7c5bed` |

sourceは dedup/sortした git tracked＋untrackedの実在fileから `.goal-implement/` を除外し、`path + NUL + bytes + NUL`。statで AGENTS symlink参照先も含む従来方式。17:18:34.184、17:34:09.445、17:46:35.395の独立照合が同値。元資材は17:25:29.320と17:48:11.074に全44個のbytes/個別SHAとaggregate一致。固定SQLiteは直接driverで開かず、明示コピーを作ってから使用した。旧P2d資材・backupは変更しない。

### 独立実行と借用

以下は root cwd、既存依存、Node22.22.3。schema生成を伴うroot integration、build/format/migration本体は実行していない。

| 実時刻（+09:00） | コマンド・根拠 | 結果 |
| --- | --- | --- |
| 17:18:35開始 | `pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/workspace.integration.test.ts --maxWorkers 1` | 既存11件を独立再実行、11成功、4.41秒 |
| 17:24:18開始 | `pnpm exec vitest run apps/web/app/presentation/workspaceInput.test.ts apps/web/app/components/hollow/editorSave.test.ts --maxWorkers 1` | 28成功、779ms |
| 17:28:21開始 | `pnpm exec vitest run --config .goal-implement/reviews/p3a-vitest.config.ts --maxWorkers 1` | 独立追加5件成功、2.76秒 |
| 17:33:00.954 | 独立 `migration.mts`、固定移行元のコピー→別clone、公的Drizzle migrator | 旧35table全旧列差0、creator unknown513、旧新個人容量29,370,757B一致、FK0 |

追加5件は [独立test](p3a-independent.integration.test.ts) と [専用config](p3a-vitest.config.ts)。①匿名slug拒否/60照会後61拒否/60秒後回復、②参加51件はcreator20枠でなく50+1一意・新規creator作成可、③CSS背景のDNS検査I/O中にeditor失効しcommit拒否、④empty確認後fence前失効でpurgeなし・restore拒否、⑤既存noteへ偽workspace入力を付けてもowner/creator/一覧scope不変を実UoWで確認した。

既存11件の独立再実行は、slug/creator20競合、同時刻51cursor、4role、他actor確認後再更新、原本uploaderと現在roleの分離、本人job/reimport、遅いconversion/reference失効、draft非公開/別scope atomic拒否、current/history認可、trash/restore/system期限、20GiB予約競合、跨scope companion最後の物理削除、未bind/未採用154Bの保持を含む。外部取得はtest fetch portであり実公開ネットワーク検査ではない。

最終515unit/190Node/規定checks/buildは実装者の借用根拠。最終source/同bundleとの一致と、backend・移行・scope全経路の適用を照合した。途中並列失敗・旧bundle import不足・fixture誤りを最終成功へ読み替えない。今回全515/190を反復せず、無変更codec/SSRF/20版数/PM/FD/物理claimは既存独立合格を保持した。実装前source自己再hash未実行という実装報告の限界を、今回の開始・終了独立hashと混同しない。

## P3a-V1：390pxで所属先選択肢が画面外へ欠ける

対象は P3a-A（WS-01/02、現在scope/切替）と P3a-F（採用390px/keyboard）。発見は17:42台の画像自身確認、座標と正常対は **2026-09-10T17:46:34.330+09:00** に記録した。見た目の好みではなく、「個人」のラベルが画面外で判読不能になり通常選択を損なう。

再現は自己WS `01a08a69-ff6e-7308-bccd-d639616afce3` の `/notes?workspaceId=...` を390×844で開き、headerの `Independent P3a 日本😀` summaryを開く。現在scopeは通常の名前で、極端な長さ入力は使っていない。

| 要素 | x / 幅 / 右端（px） | 実際 |
| --- | --- | --- |
| メニュー | -74.765625 / 358 / 283.234375 | 左約75pxが画面外 |
| 個人ボタン | -57.765625 / 64 / 6.234375 | 約6pxのみ見え、文字は画面外 |
| WS作成リンク | -57.765625 / 127.53125 / 69.765625 | ラベル前半が欠ける |

期待は各選択肢のラベルと通常選択領域がviewport内にあり、現在scopeから個人/別WS/作成へ進めること。実際は他WS名の前半や「先頭へ」も欠ける。`document.documentElement.scrollWidth===390` のassertだけでは負方向overflowを検出できず、先の `mobile.cjs` の成功出力はこのメニュー表示の合格根拠から除外した。プログラムでfocusした後のtrusted Spaceによる選択は可能であり、認可/API/全keyboard操作不能とは主張しない。通常タップ位置・ラベルの可視性の不足を判定した。

原因箇所は `apps/web/app/components/hollow/workspace.css:9` のabsolute/right:0と、358pxのメニューを幅158.84pxのsummary側へ右寄せする組合せ。mobileのswitcher max-width11remに対して左側境界を確保していない。製品CSSは変更しない。

1280×900正常対ではメニュー x577.234375/幅448、個人ボタン x594.234375/幅64。全ラベルが表示され、個人への選択・URL復帰が成功した。自身で [mobile画像](/tmp/hollow-p3a-verify.UvTYeF/mobile-clip.png) と [desktop画像](/tmp/hollow-p3a-verify.UvTYeF/desktop-scope.png) を開いて確認した。独立再現 `mobile-clip.cjs` を固定保存した。修正条件はこの既存操作の可視・選択成立であり、別デザイン方式や全画面再設計は要求しない。

## 本体の独立操作

既存accountを使うが、変更対象は今回作った3WS/自己noteだけ。role UIは未実装なので、自己WS membershipだけの一時故障とfinally全列復帰を、通常owner実UIから区別した。trusted keyboard/入力と、tab限定fetch/XHR保留・confirm stub・DOM focusを分ける。認証値やCookieは記録しない。

| 時刻（2026-09-10、+09:00）/資材 | 独立観測 |
| --- | --- |
| 17:24:49.764 `creation.cjs` | 自己WS名/日本語/emoji/説明/slugで作成。重複slugに代替3候補、候補採用。作成POSTだけ失敗させ値保持→解除retry成功。存在しないscopeから個人へ回復。 |
| 17:27:07.999〜17:38:54.921 `recovery*.cjs` | 自己noteをowner→viewer→nonmemberへ一時変更。保存拒否中DB本文/version不変。current/reload/nonmember画面で最新title/html/modeの4key JSONを回収。owner全列復帰後、明示退避復元とWYS確認を通り同noteへ最新本文保存。 |
| 17:28:58.397 `scope-race.cjs` | WSのGET応答1件を保留→trusted操作/戻るで個人→旧応答解放。URL/容量/本文の個人scopeを維持。 |
| 17:29:37.298、17:30:21.997 `history.cjs`/`http-media.cjs` | media-onlyの同assetを履歴1で実描画。current/historyのGET200/HEAD200/Range206/不正Range416。viewerも成功、nonmemberでは全て404（416より認可先行）。自己membershipはfinally復帰。 |
| 17:31台 `import-start.cjs` | HTML＋別CSS＋PNGの役割を指定して同梱import、1note/同WS・2acquired。iframeの日本語本文、blue rgb(17,61,177)、自然幅32pxの内部PNGを実確認。 |
| 17:32:00.549 / 17:32:59.027 / 17:33:33.416 `captured-upload.cjs` | 元WSで受付後、XHR送信だけ保留。trusted Spaceで個人選択・confirm1回を観測。承認→遅い成功/失敗でも個人に残り、投入先は元WS。確認取消では離脱せず正常完了で同WS詳細。後の新uploadも成功。旧pointer実不具合を再現したとは扱わない。 |
| 17:33:57.845 `lifecycle.cjs` | 自己59B原本download→trash404→restore200→再trash→purge取消/実行。受付表示と物理完了は分離し、DB1/1完了・原本行/実object不存在を別確認。 |
| 17:35:31.648 `empty.cjs` | 自己別WSの新39B原本2件のみtrash。固定2件確認の取消/実行。受付表示を成功とせず、2purge各1/1と物理2件不存在を別確認。旧trash11は不変。 |
| 17:36:10.879 `style-reference.cjs` | 同媒体をoriginal/defaultで描画・reload。bundleのoff→on→reloadは同asset/既取得2/CSSを保持。 |
| 17:38:15.026 `new-backup.cjs`/`backup-resume.cjs`/`modes.cjs`/`visual-finish.cjs` | WS新規保存通信失敗→個人newにWS退避を出さず空noteも作らない→同WS再訪/退避復元→stable。HTML追記→visual Text編集→保存/reloadで同ID/同WS・最新日本語本文・両key0・iframe1。 |
| 17:39台 `final-ui.cjs` | media note履歴1を選択/復元、タイトル「無題」version4・同asset/iframe1、reload保持。 |
| 17:41:06.559/17:41:37.072 `list-seed.mts`/`pages.cjs` | 専用WS3に同clock51noteを型付きcreate/commitで準備。実UI50+1・51一意・2頁reload・先頭へ戻る。51件全てをtrusted UIで作ったという根拠ではない。 |
| 17:41:51.217〜17:46:34.330 `mobile*.cjs` | 390pxのbundle詳細は日本語/画像正常、1280pxも正常。scopeメニューはV1不合格。画像は自分で開いて確認。 |

主要自己noteはmedia `01a08a6b-c574-7278-8c2e-1cbc8b9e9e94`、失効復元 `01a08a6d-797d-7348-b495-e66b84ec23fd`、bundle `01a08a71-25ad-725e-b34a-bca76a662a90`、三mode/退避 `01a08a74-eab5-76a8-ac55-dc81490d7f3a`。media asset `01a08a6b-bd35-7117-844a-2de574a5db98`、bundle asset `01a08a71-3682-72fa-9e5b-5895024269b8` は保持する。

### 検査自身の誤りと限界

不存在unit config、追加testのalias/port不足、DTOにないownerを比較した初稿、CSS検査を呼ばない画像fixtureは検査側の誤り。専用config/fixtureを直して実repository値とCSS経路を再実行した。製品修正ではない。51metadata初稿のcause値を `manual` へ修正した対象は今回の自己51行だけで、旧行は触れていない。

CLIの座標/可視要素選択・旧ボタン文言・WYS確認待ち不足・personal44件への50件誤期待で停止したhelperがある。後続の明示再訪・正しい自己fixtureで独立観測した結果を上表に記載し、初稿のtimeoutを製品failureにも成功にも数えない。CMの操作は全文置換でなく追記だったため全文置換成功とはしない。browser session restore漏れによる一時about:blank/signinも製品の認証不具合とはしていない。

実装者の空内容browser errors2件は原因不明の借用限界として保持する。今回console全0・全OS IME/nativepaste/drop・全browser・動画全codec・実外部SSRF再検証を主張しない。旧代表合格と今回のscope接続確認を適用する。画像・HTTP正常はrole UI操作の証明ではない。

## 項目別判定

### P3a 6条件

| ID | 判定 | 根拠と適用範囲 |
| --- | --- | --- |
| P3a-A | 不合格 | 作成/入力/20/競合/候補/失敗復帰は独立DB/UI合格。390px切替のV1のみ不足。 |
| P3a-B | 合格 | 同時刻keyset/50+1/認可/cursorをDB、実UI51/reload/back、旧GET応答の不採用、存在しないscopeの回復。chooser自身のV1はA/Fへ分離。 |
| P3a-C | 合格 | WS media-only/同梱/原本/三mode/履歴復元/off-on/新規退避、受付scopeと遅い完了/失敗/取消の本体対。 |
| P3a-D | 合格 | 多role実UoW、I/O後再認可、actor確認、本人job/reimport、draft拒否、本体current/historyHTTPと失効4key回収。招待/role UIは後続。 |
| P3a-E | 合格 | 個人/各WS容量、正当予約競合、companion/未採用の保持、scope期限/empty失効のDB対、本体trash/restore/3原本137B実削除。Q2移動実行は後続。 |
| P3a-F | 不合格 | clone移行/旧保全/port・境界/規定根拠/同bundle/keyboardは成立。390pxのV1不足。 |

### 共有36条件

各合格は今回変更した責務に限る。無変更方式の過去合格は保持し、後続機能の完成宣言へ広げない。

| ID | 判定 | 今回の根拠 |
| --- | --- | --- |
| P1-B | 合格 | WS新規/同ID/media-only、通信失敗/退避scope/復元/三mode最新保存。V5方式は不変。 |
| P1-C | 合格 | scope現在render、iframe1/allow-same-origin、HTML/visual/detail・CSS/PNG描画。無変更sanitizer/隔離旧根拠保持。 |
| P1-D | 合格 | 現在role・永続化・失効先行HTTP・clone/旧全列保全。 |
| P1-E | 合格 | 同Node22/bundle/lock、RSC非await維持、最終checks/build借用＋focused実行。 |
| P2a-B | 合格 | scoped import/conversion/reimportと遅い失効、実同梱import。codec不変。 |
| P2a-D | 合格 | 正当な20GiB予約競合/拒否・cancel charge、個人5GiB旧集計不変。 |
| P2a-E | 合格 | job本人限定・別actor reimport新batch・旧retry/cancel非開放、実jobs/取消/失敗。 |
| P2a-F | 合格 | scope worker現在actor・終端/実storage、旧成功と最終Node適用。 |
| P2b-A | 合格 | current/history媒体のGET/HEAD/Range/416認可先行、現在viewer/非member対。 |
| P2b-B | 合格 | creator-private draft/別scope atomic拒否、media-only stable、upload受付scope保持。 |
| P2b-C | 合格 | reference現在actor/失効不採用・scope charge、同梱CSS/PNGとoff-on再利用。安全取得方式は不変。 |
| P2b-D | 合格 | current roleでstyle変更、original/default/初回importとreload描画。 |
| P2c-1-A | 合格 | commit現在role/actor、失敗正本不変、WS三mode保存/復元。20件規則不変。 |
| P2c-1-B | 合格 | 保持assetのscope容量だけ再確認。pin/GC時刻規則は不変の既存合格。 |
| P2c-1-C | 合格 | current/history正確なscope認可の実HTTP、DBcurrent参照除去/history保持。 |
| P2c-1-D | 合格 | WS履歴1 preview/restore→同asset/新version/reload。 |
| P2c-1-E | 合格 | actor再確認DB、失効後latest回収/同ID復元、本体失敗中DB不変。 |
| P2c-2-D | 合格 | WS三mode/新規scope、既存mode所有/世代の不変根拠と本体狭い回帰。 |
| P2c-2-E | 合格 | scoped backupで個人new混入なし/WS復元/最新4key/両keycleanup。 |
| P2c-3-D | 合格 | WYS現在policy/明示確認を通るWS保存、origin規則は不変の旧根拠。 |
| P2c-3-E | 合格 | WYS最新退避・失効復帰、別scopeへ再基準化しないことをコードと本体確認。 |
| P2d-1-A | 合格 | current scope trash、本文/版/updatedAt保持のDB対と本体実行。 |
| P2d-1-B | 合格 | scope restore/期限・失効拒否、同note原本再表示。 |
| P2d-1-C | 合格 | active先行の原本/media/read、現在role、trash原本404。 |
| P2d-1-D | 合格 | scoped trash一覧・復元/削除確認、旧有限read契約は不変で最終Node借用。 |
| P2d-2-A | 合格 | purge受付現在role・既intent再認可、system人物nullを実DB確認。 |
| P2d-2-B | 合格 | scope chargeは実削除完了まで保持、最後companion失敗→成功。物理claim/FD不変。 |
| P2d-2-C | 合格 | scopeと人物/履歴read、本人限定、旧snapshot保全。 |
| P2d-2-D | 合格 | 本体purge取消/実行/結果再表示、旧V1有限ページ/receiptを最終Nodeと不変実装で適用。 |
| P2d-2-E | 合格 | scoped system期限のtyped initiator、UI容量・回収待ち・自然cleanup。 |
| P2d-3-A | 合格 | empty固定scope、確認後fence前失効・本人認可DB、2件本体確認/取消。 |
| P2d-3-B | 合格 | scope admission/対象関係、既fence共有規則不変・最終全Node借用。 |
| P2d-3-C | 合格 | scope retry/current actorのコード・最終Node、無変更intent/cancel方式根拠維持。 |
| P2d-3-D | 合格 | owner job read/ticker/scoped UI、実empty受付とDB完了を分離。 |
| P2d-3-E | 合格 | scope schema/system actor、snapshot保全、90日関係/物理保持方式不変。 |
| P2d-3-F | 合格 | 固定2件本体/旧全列/同bundle/型・最終Node、既存50/51/501方式は無変更根拠。 |

## 保全・容量・自己データ

開始online backupは `/tmp/hollow-p3a-verify.UvTYeF/baseline.db`。受領573notes/66assets/921revisions/snapshot120/nonactive11を保全対象とし、実inventoryは **37table・447objects**（原本/ready asset/companion）。実装者開始513/35table/439objectsと混同しない。旧513、取消11原本385B、実装者P3a新規保持分を含む。

17:18:34.184と17:34:09.445は全37tableの全旧列EXCEPT差0、447/447objectsのbytes/SHA一致。17:46:35.395はupload_reservationsの1行だけが変化、他36table差0、447/447一致、629notes/68assets/987revisions/nonactive11、FK0。別のexact比較で変化は下記1行の `storage_cleaned:0→1` だけ、他全列差0を確認した。integrity_checkはok。

| 受領済み予約 | 開始 | 17:46終了検査 | 判定 |
| --- | --- | --- | --- |
| `01a08a3f-dc77-75fa-bffd-a924e75c7bca` | cancelled/52B、cleaned0 | cancelled/52B、cleaned1 | 17:42:16.148以後の通常sweepによる期待変化。手動改変なし。 |
| `01a08a48-8b68-7064-82a7-59d3fc442e1f` | failed/52B、cleaned0 | failed/52B、cleaned0 | cleanup条件17:51:45.223前。残存は異常でなく、自然解放待ちだけのgateは増やさない。 |

開始cloneの全15個人scope/旧3WS容量を実portで照合。終了online copy `end-capacity.db` と同portでは個人15scope全て不変、旧WS1のみ2378→2326B（上記52B自然解放）、旧WS2/3は0。今回WS1は2201B、WS2/3は0（17:47:39.283実行、17:47:18 snapshot）。移行前14個人の旧新容量29,370,757B一致は独立cloneの別根拠。巨大本体quotaを改変していない。

自己不可逆操作は新3noteの原本 **59＋39＋39＝137B** のみ。59B対象 `01a08a72-da53-709b-a076-e99d9a0a39ff` と39B対象 `01a08a75-2ae5-755c-96de-c403efa51e78` / `01a08a75-2b59-71ce-aba6-4a52df7a47c6`。DB purge各1/1とobject不存在を確認。これらはアプリのrestore対象ではなくなり、元fixture/backupは保持する。旧objectを削除していない。

今回の未送信失敗予約 `01a08a73-6000-70e3-bc6f-97826d864456` は59B・物理なし、受付WS1 chargeを保持。expiresAt 18:33:32.159、通常5分後cleanup待ちで手動解放しない。これを旧2予約の例外へ混ぜない。今回の新WS3と51metadata・正常自己note/assetは残す。旧membership/認証・既存noteの変更なし。

## 未確認と引継ぎ

P3aの必須不足はV1に限定する。後続WS招待/role UI/除名脱退実UI・移動・検索/整理・WS削除・公開/P4/P5は未確認/未接続で、今回追加条件にしない。Q1/Q2/Q3の採用規則を別案で差し戻さない。全OS入力/全ブラウザ/全codec/大容量本体/remote接続の保証はしない。

2026-09-10T17:47:18.803+09:00、自分の `hollow-c2-verify` に残る当該hookを確認し、network route解除・browser close成功。各故障helperのfinally復帰後、追加browserを作っていない。自己listenerなし、全既知helper/test/execは完了回収。cleanupスキルのglobal終了は他session保護の指示に従い使わない。

production **session71966/PID34171/Node22.22.3** は停止・再build・再migrationしていない。17:48台HTTP200、既知PIDへのkill0成功。DB/storage/mailboxは受領パスを維持。旧PID93756/2383/5548へ操作していない。以後は報告の終了補足だけを書き、製品/DB/browser/検証操作を停止してManagerへ環境を返す。V1の修正と次フェーズは担当への別委譲を待つ。

### 終了照合（2026-09-10T17:52:21.623+09:00）

最終654source/HEAD/lock/bundleは冒頭の全値と一致。exact行比較で、許可された上記2予約それぞれの `storage_cleaned:0→1` だけと確認し、他全列は差0。第2予約も17:51:45.223以後の通常sweepで自然解放された。旧104Bの解放は期待変化で、手動操作・期限変更・不正な保全免除ではない。先の17:47容量2326Bはその時点のsnapshot実測として残し、終了時capacity portを再測定した値へ読み替えない。

現629notes/68assets/987revisions/snapshot123/nonactive11。display pending/conversion active/reference active/active writer/incomplete purgeは各0、FK0。最後のpreserve helperのexit1は汎用「旧列差あり」判定によるもので、上記exact自然2行を別SQLで限定確認した。未回収execはなし、最後session28584も終了結果を回収した。17:47以後browser再開なし。全自己検証操作を停止し、通常productionだけ稼働のまま環境を返す。

管理下追加testの最終SHAは `p3a-independent.integration.test.ts`: `37363d760383e321fdf1371f43093505327ae1e7d44fb4eb9212b91f33d18d5a`、config: `1ebf5f5af6a30e31a96792c9d85299624aedcbd61295fdd88363cbf8171e1a8b`。独立temp43file/元44fileの固定以後は変更していない。終了SQLの初稿で誤ったdisplay/object_writes列名を問い合わせた読取失敗は、正しいschemaで修正して上記実測を得た検査側の誤りである。
