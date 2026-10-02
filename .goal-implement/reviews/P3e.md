# P3e 独立レビュー

## 判定

2026-09-19 17:22〜17:46（+09:00）に完成候補を独立検証した。P3e-A〜H と既オープン先行18枝の変更範囲、計26項目を合格と判定する。受け入れを妨げる不具合は検出していない。追加の受け入れ条件・先行枝の追加再オープンは提案しない。全体の受け入れと台帳更新は Manager の判断とする。

実装担当の最終報告だけを合格根拠にはしていない。同一候補を独立照合し、関連 Node 101件、UI pure 27件、追加独立7対、旧 schema コピーの移行、通常ブラウザの一括操作・actor 切替・通知共存・非本人拒否、終了保全を確認した。借用・未検証は後述する。

goal-implement / manager-loop に従い、brief・design・plan の P3e、原文 OR-09 / OR-12 / JB-01〜03、変更に関係する先行枝、CLAUDE.md と照合した。manual-test のブラウザ手順を使用し、Manager の限定環境・単独所有・Issue禁止・自己 session のみ終了という制約を優先した。spec / spec-implement は呼び出していない。製品コード・管理台帳・goal API は変更していない。

## 固定候補と環境

開始時と終了時17:46:50に次の識別が一致した。製品 worktree は clean、`git diff --check` 成功。未追跡は管理用 `.goal-implement/` のみ。

| 対象 | 独立照合結果 |
| --- | --- |
| commit | `2ee4826b6422a9f5ae38aa0e2c637e0c3b9276a8` |
| source | 837 files / `a3099ee518ddbd0a6b329d45edc0090814b3a0cf296387bcf0472aaa35c526ac` |
| lock | `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` |
| server bundle | `4891ac67e8142ced8b8c748c809cc1f2e650540144fd8940ab3d3924596c5a78` |
| searchSupervisor | `c64c52954e3c50b8c22a2d24de708025bc58ed205568e38ea24383286b05116d` |
| searchQuery | `fa56e315877d3bcb83730178ac9505f049bf6e72c1ef000494f8345cb025c955` |
| noteProjection | `55a3ab762a09b7b22abaf091dd1f8f1a3334942a1eb549929cd2714778694133` |
| runtime | Node v22.22.3、127.0.0.1:3000、APP_URL `http://localhost:3000` |
| fresh | `/Users/hikaru/.local/share/hollow/verification/p3c-20260911-dyHGjx` の `app.db` / `objects` / `mailbox` / `private/invitation.key` path |
| 新証跡 root | `/Users/hikaru/.local/share/hollow/verification/p3e-independent-20260919-1bMp6p` |

source は sorted/dedup `git ls-files -co --exclude-standard -z` の実 file から `.goal-implement/` を除き、path NUL bytes NUL を集約した。AGENTS symlink は候補と同じ参照先 bytes を使う。bundle と native workers は `apps/web/dist/server/` 配下の固定成果物であり、独立検証中に build し直していない。

起動前に3000/3001 listener と fresh DB handle が空であることを確認し、17:23:46.532に `start/` を排他コピーした。既存の限定起動 `p3e-finish-20260919-udnRoV/server.mjs` で PID74463 / session67322 を起動し、cwd と実 DB path を照合した。17:23:46.801に listen を確認した。0022の本体再適用、lockの手削除、旧PID1053の起動はしていない。

## 独立したコード照合

batch domain / ports / usecases / worker / processing / event decoder / libSQL repository / schema / UoW と runner 接続、selection read、transport validation、UI provider / model / picker / confirmation / history / activity / ImportJobs を確認した。共用 tag・trash・move command、holding導出、membership edit-loss、purge の batch取消差分も照合した。

- 入力は transport の strict schema で50件preview・500件accept・50件watch等を制限し、actor は session から決める。application / domain は内向き依存を保つ。
- 全体選択は共有 read 実行枠で現在認可・active・正確条件を適用した後の501 sentinelで判定する。通常一覧50件、calendarの月条件、day/cursor除外を保持する。
- accept は同 actor/request の固定順序・設定・確認値を同内容として照合する。新受理では現在policyと対象を再確認し、固定target/attempt/outboxを同UoWで保存する。不可視対象のtitleを返さない。
- tag identity は intent と resolved ID を分離し、最初の成功・関係・binding・結果を同Txで確定する。外部削除後に別IDを補わない。trash/move は既存単一coreを共用する。
- move の変更条件を現値に緩めず、自己成功の同Tx receiptだけで必要なholding差分を導出する。coverage、連続prefix、base、最大500edge、現在quotaを検査する。
- worker は同parent一つのrunning、60秒lease、最大20子の有限処理、旧token拒否を持つ。各子で現在verified actorと両scopeのpolicyを再確認する。jobへsession/cookieを保存しない。
- 履歴は依頼本人・有限親子page・最新attempt集計を使う。90日期限のtitle/detailと未終端依存receiptの寿命を分離し、waiting取消とrunning結果を混同しない。
- actor epoch/request tokenで旧success/catch/finallyの状態反映を制限する。通知はkind別stateと独立dismiss、通常flowに配置し、過去failed親を新しい終端通知として登録しない。

変更のない既存検索時計・FD・codec・PM・20版、旧物理回収・empty-trash retry方式は全面再レビューしていない。既受け入れ根拠と今回差分の適用範囲を分離する。

## 独立した自動試験

| 実行 | 結果・対象 |
| --- | --- |
| 17:23:15開始、22.91秒 | `vitest.config.integration.node.ts --fileParallelism=false`、batch / batchSelection / tags / move / trash / purge / workspace の7 files、101/101成功 |
| 17:24:07開始、1.61秒 | batch model / activity / ImportJobs の3 files、27/27成功 |
| 17:29:11.879完了 | 新コピー `independent.db` に対する独立7対、すべて成功、FK0 |
| 17:30:14.513完了 | premigrateの新コピーへ実0022 migrationを適用。旧52 tablesの旧列双方向差0、FK0、履歴22→23 |
| 17:43台開始 | `pnpm typecheck` / `pnpm lint` / `pnpm format:check`、すべてexit0。修正コマンドは実行せず製品変更0 |

lint は既存36 warnings / 34 infosを残して成功した。警告ゼロとは扱わない。

Node101件には次を含む。

- 500固定・重複受理・501拒否・正確照合前のfalse candidate・tag AND/current scope・未完成indexと失効認証の区別。
- tag50上限・51個目の作成rollback・同resolved ID・failed子だけretry・外部tag削除後の非再作成。
- shared holdingの一度だけの課算、先行成功/失敗、外部同数ABA、別parent、0B bundle、必要receipt欠落、GiB metadata/ちょうどquota/後続超過、note資源の厳密比較。
- waiting取消とclaim済み結果、lease失効/旧token、commit後ack喪失、event decoder/通常runner stop後のqueued継続、現在処理fingerprint、membership edit-loss/再参加非復活。
- 90日超の依存receipt保持・terminal prefix prune・期限切れfailed retry拒否。旧trash/purge/move/tag/WSの変更範囲に関する回帰。

独立7対は既存試験の再実行とは別に記述した。

1. preview50許可/51拒否、重複ID拒否、watch51拒否、外部actorId拒否、selectionへのday入力拒否。
2. viewerのpreviewと偽造acceptを拒否し、親行を増やさない。
3. 同request同内容は同結果、順序変更と操作変更は `BATCH_CHANGED`。
4. 子50件＋cursor後1件、別actorのdetailは `BATCH_NOT_FOUND`、watch/listは空。
5. 受理時sessionを削除しても現在verified actorの子は成功する。
6. claim後にactorのverified状態を失わせるとcancelledになり、tag関係を変えない。
7. succeeded結果のfinishをfalseにするUoW fault注入で、新tag・関係・binding・note変更が全rollbackし、失敗結果だけ別Txで残る。

追加7対・migration・終了比較のdriverは新しい作業コピーだけに接続した。保存された唯一の保全DBや fresh原本へ検証driverを直接接続していない。7対の架空account/WS/52notes、fault注入は隔離DBだけの準備で、通常認証・通常UI・本体障害の証明ではない。

### 500件の量とtransportの限界

独立Node測定はtag500のJSON75,605B/accept137.846ms、move500のJSON450,648B/preview485.288ms/accept240.914ms、500×50tag mappingのJSON34,025,148B/installed codec wire39,328,873Bを通した。後者はencode736.959ms/decode146.263ms、preview901.028ms、accept1,003.301ms、隔離HTTP1,589.618ms、child215.409ms、観測heap delta53,872,880Bだった。

これはinstalled codecと隔離HTTPの成功であり、通常server-function巨大応答のdecoder成功とは区別する。前回39,335,373Bの通常受理はHTTP200/DB500/同親重複まで、試験decoderはTypeErrorだった。今回同じ巨大POSTを本体で反復していない。小さい通常UI受理は以下で独立成功した。実20GiBファイル転送、heap peak上限、SLOは保証しない。

## 独立した実ブラウザ

自己 session `p3c-fresh-batch-independent` だけを使用した。全HTTPでChrome140 User-Agentを明示、timeout20秒/idle120秒。auth helperは既知pathの `fill owner|editor|outsider` 呼び出しだけを使い、本文・秘密値・cookieは取得していない。

| 操作・根拠 | 独立結果 |
| --- | --- |
| 通常新規作成 | WYSIWYGから新2notesのtitle/本文を保存。検索 `Batchverify` で2件だけを対象にした |
| 固定選択と三表示 | 結果全体2件→tile/list、sort変更で同じ2件保持。calendarへの初回月追加は解除。同じ月条件のlist→calendarでは2件保持。reloadでは未送信選択を復元しない |
| 17:34:59の一括tag | 2件を50件以内のpreviewで確認して受理。2成功・0失敗、同じ固定tag ID、本人子履歴、完了通知と結果導線を確認。fresh再訪で旧failed通知0 |
| actor応答遅延 | 新2noteへの通常accept POSTを送った後、応答だけfetch hookで保留。正常owner signout→editor signin後、複数選択enabledで1件選択可能。旧成功を返しても新選択1件保持、旧receipt/dialog/alert0、route維持。editorの既存noteは選択だけで変更していない |
| 所属移動 | 通常UIで新 `Batchverify-Workspace` を作成。新2notesの個人→専用WSの影響を確認。閲覧者増減0/0、未一致tagは各1個外れることと0B合計を表示。2成功、移動先2件、本文表示保持 |
| 390px | move dialogの実画像を目視。横overflow0、内容はスクロール可能。開始buttonをscroll into viewしてhit=true、通常clickで受理 |
| 一括trashと復元 | 専用WSの新2notesだけをtrash preview→受理。初期focusだけscriptで置き、Spaceで開始。通常ゴミ箱に2件表示、各通常復元buttonで2件ともactiveへ復帰。完全削除なし |
| 正常import | 新113B HTMLを実ファイル入力で選び、参照off / LLM不使用を確認して通常upload。新1note/原本1件が成功。外部参照を含めていない |
| 2通知＋receipt | 同じSPA内で新WS3notesのtag受理3成功。import通知・batch通知・receiptが共存。390×844で横overflow0、全6リンク/ボタンのhit=true。画像を目視 |
| 通知keyboard | batch結果linkへ初期focusをscriptで設定しTab→Spaceでbatchだけdismiss、import保持。続けて通常clickでimportだけdismissしreceipt保持。receipt linkから本人の3子成功・固定IDへ遷移 |
| 非本人拒否 | 正常outsider signin後に新parent IDを指定して履歴を開くとnot found、対象名/receiptなし。専用WS一覧は取得拒否/selectionなし。新note詳細もnot foundでtitle/本文漏洩0 |

actor用fetch hookは旧応答を返して元fetchへ復元した。ブラウザを17:44台にcloseして一時変数も終了した。正常認証・本物の通常serverFn/workerを使ったUIと、通信だけの保留・初期focus設定を区別する。

テスト操作上の失敗は製品不具合と分けた。初回networkidle待ちは既に正常editorへ遷移後にtimeoutし、通常snapshot/saveが成功した。画面外や固定bar下のbuttonはscroll into viewで到達した。誤ったselect値/未対応find-select形式は正しいref/valueへ訂正した。選択readが未完了のままlayoutを替えた初回操作は旧応答を採用しなかったため、完了後の保持を別途確認した。

## 項目別判定

先行18枝は、今回再オープンされた差分と既受け入れの適用を判定したもので、元項目全体を新たに全面実行したという意味ではない。

| ID | 判定 | 主な独立根拠と適用 |
| --- | --- | --- |
| P3e-A | 合格 | selection3対、501/500/正確条件/current認可、strict境界、実固定選択 |
| P3e-B | 合格 | model pure、実actor遅延/三表示/sort/月変更/reload/390/keyboard。viewer UIは最終自己記録、拒否は独立7対 |
| P3e-C | 合格 | Node固定500・量測定、同内容/異内容独立対、50＋1、非漏洩、実通常accept。巨大通常decoder限界は別記 |
| P3e-D | 合格 | 共用core照合、tags/trash回帰、51rollbackと独立finish fault、実tag/trash/restore |
| P3e-E | 合格 | receipt/holding/quota/ABA/失敗/期限/0Bの実DB、既存move回帰、実新2note move |
| P3e-F | 合格 | claim/lease/旧token/ack/UoW/runner stop対、独立現在actor/session対、実本体worker/正常drain。kickなしproduction bootは限定借用 |
| P3e-G | 合格 | 50＋1/本人限定、90日/取消/retry/外部取消のNode、実本人結果/通知/outsider。部分失敗・取消・retryの最終UIは限定借用 |
| P3e-H | 合格 | 固定始終一致、内向き型/境界、独立規定checks・135対、clone0022、旧保全/課算/全停止。全734/332/buildは最終自己根拠 |
| P1-E | 合格 | 実actor切替、390 dialog/通知/keyboard、型・lint・format、既存shellの限定影響 |
| P2a-E | 合格 | 通常113B import、通知2種/独立dismiss/本人結果。既存import worker方式不変 |
| P2d-1-A | 合格 | trash回帰、実新2noteのbatch trash→通常restore、旧100全列保持 |
| P2d-2-A | 合格 | purge回帰/外部batch取消の同Tx、旧purge受理方式は既受け入れを保持 |
| P2d-2-C | 合格 | purge実DB回帰/同Tx外部取消、既存物理回収方式不変・旧objects保持 |
| P2d-3-D | 合格 | 既存summary計上部分のsource照合、通知/履歴共存、旧行保持。empty-trash全試験は最終332内を借用 |
| P2d-3-E | 合格 | 履歴UI共存、受理≠完了、390/keyboard/通知error所有。既存不可逆確認・retry方式不変 |
| P3b-1-C | 合格 | workspace/batch回帰のowner demotion/edit-loss/再参加、現在actor独立対 |
| P3c-A | 合格 | shared executorへのselection接続、正確照合後501 sentinel、selection3対・native指紋 |
| P3c-B | 合格 | list/tileの固定集合とsort変更、通常50件ownershipのsource確認、既存browse根拠保持 |
| P3c-E | 合格 | 月条件追加解除/同月calendar保持、day入力境界、selection query照合。日展開UIは前回限定借用 |
| P3c-G | 合格 | current scope/認可、実outsider一覧・note非漏洩、390/型/有限read/保全 |
| P3d-1-A | 合格 | tags回帰、viewer拒否、51rollback、同名固定ID、実2/3note tag |
| P3d-1-B | 合格 | 親board/selectionとleaf mutation排他、実tag/三表示/actor/390、pure所有guard |
| P3d-1-E | 合格 | 共用tag deltaの本文独立、tag/rollback実DB、旧note/版全列保持 |
| P3d-2-B | 合格 | 共用move command/厳密expected、実2note移動/本文表示、move回帰 |
| P3d-2-C | 合格 | current quota/resource/GiB境界/ちょうど上限対、全旧scope課算保持 |
| P3d-2-D | 合格 | receipt coverage/holding ABA/共有一度課算/失敗/0B/別parent/prune対 |

## 借用・未検証

- 最終同候補の全unit734/734（17:12:27開始）、Node332/332（17:12:37開始）、17:04台buildは `phases/P3e.md` から借用した。同source/artifactを独立固定し、変更riskに対する101/27/7とchecksを別に成功させた。過去の途中727/729や前回未固定bundleを最終成功へ代用していない。
- 最終自己UIのquery/zone ABA旧failure、palette未適用draft、viewer選択のみ、waiting取消/running残存、failed子だけ新attempt retryを借用する。独立では共通guard/pure、実actor旧success、viewer preview/accept拒否、Node取消/retry/90日を確認した。actor切替中の旧catchと新actor同時別mutationを本体で別々には再実行していない。
- productionのexpired-running1＋queued1をkickなしbootで回復した16:46〜47の記録は人工準備を伴う自己証拠として借用する。独立では通常runner stop/claim失効/旧token対と本体通常worker・正常drainを確認し、人工準備を通常UI受理と称さない。
- 前回calendarの日展開・追加pageで固定集合を保持するUIを借用する。独立の月/layout保持、model、day除外境界で適用を確認した。DSTや旧browse機構全体の再証明はしていない。
- 巨大通常serverFnのdecoder、実20GiB転送、heap peak/SLO、実IME/OS drag、外部LLM・メール・Drive・公開/downloadは今回独立成功と扱わない。R1 loadingの原因解消やD01旧37objectsの復旧は証明していない。

## 保全・自己追加データ・停止

新rootと配下directoryは0700、DB/コピーpayloadは0600。`start/` は17:23:46.532、`final/` は正常停止後17:44:26.581の排他コピー。既存 `p3e-batch-QvYtHy/{start,premigrate}`、`p3e-finish-20260919-udnRoV/{start,final,compare}` と既存comparisonファイルは不変。比較は新rootの `compare/` にもう一度コピーして実行した。

17:46:21.486の `comparison.json` は旧58 tablesの全旧列/旧行を比較した。業務表の変更・欠落は0。FTS内部 `note_search_data` の2行と `sqlite_sequence` の1行だけが新規追加に伴い変わり、業務正本の変更と混同しない。

| 保護対象 | 開始 | 終了 | 独立確認 |
| --- | ---: | ---: | --- |
| notes | 100 | 103 | 旧100全列保持、最終全103 active |
| tags | 29 | 31 | 旧29と旧関係保持 |
| originals / assets | 8 / 2 | 9 / 2 | 旧全行保持 |
| revisions / heads | 107 / 92 | 111 / 95 | 旧全行保持 |
| workspaces / members | 8 / 14 | 9 / 15 | 旧全行保持 |
| batch parents / targets / attempts | 14 / 37 / 40 | 19 / 48 / 51 | 旧全行保持、新5親11子が全成功 |
| objects | 11 / 2,994B | 12 / 3,107B | 旧11の相対path・bytes・SHA256全一致 |

旧scopeは以前の9だけでなく開始DB内の全11を同じ正規capacity queryで比較した。personal `2320/0/0`、workspace `516/0/0/0/75/0/83/0` は前後一致、新WSだけ113B。capacity integrity違反0、SQLite integrity `ok`、FK0、未終端batch0。

今回の自己追加は通常UI2notes、正常import1note/113B原本、新WS1/member1、tag2、batch5親11子（tag7・move2・trash2成功）。新2notesへのtrashは通常復元を完了した。最終は次の3件をactiveで保持する。

- `01a0b8c5-f1bd-707f-9451-035486ef3365` — `Batchverify-One`、version3 / ownershipGeneration2。
- `01a0b8c8-9db2-754c-ac77-ed3453cdcf40` — `Batchverify-Two`、version3 / ownershipGeneration2。
- `01a0b8d4-41bd-775a-8f7e-f3ea6b3fd29f` — `Batchverify-import.html`、version1 / ownershipGeneration1。

所属は専用WS `01a0b8d2-2d67-722b-9b9b-99324eac9477`。freshでの物理削除/完全削除0。自己note/原本/タグ/保全を残しており、通常の編集・ゴミ箱/復元を引き続き利用できる。既存integration suite内の隔離fixture cleanupをfreshの削除と混同しない。

補助観測の失敗は修正して再実行した。独立helperの最初のbundle設定はmodule解決/ESM/Unicode data pathで準備前に失敗し、external package＋core aliasで成功した。終了比較の初回は列名 `workspace_id` を誤指定し、schemaの `owner_workspace_id` と実表名へ訂正して同じ新作業コピーで成功した。製品修正はない。

17:44:26.402に、PID74463のcwd・listener・fresh DB接続を照合して通常TERMを送り、draining→17:44:26.408 exit0 / systemErrors0を確認した。session67322終了、自己browser close、試験/helper/checksはすべて完了。17:46:50の再照合で3000 listenerとfresh DB open handleなし。旧11316/24029の終了理由は前回同様未証明であり、今回の正常終了と混同しない。

秘密鍵・credential・認証helper本文・cookie・env・全argv・raw runtimeログは取得/出力していない。旧tmp環境/recovery/D01/旧signin証跡は無操作。外部Issue/API/送信/課金/本番変更なし。再開は同freshと同Node、既存安全起動helperを使い、次所有者がport/DB handle/candidateを確認してから行う。0022再適用とlock手削除は不要である。

17:51台に本報告180行を全文通読した。秘密取得の禁止対象を「認証helper本文」と明確化した最終文面を確認後、報告編集を含む全自己操作を停止し、停止中の環境と保全をManagerへ返却する。
