# P4b 独立検証

担当: resume_verifier（P4b実装には不参加）。対象は P4b-A〜G と P1-E / P2b-D / P2c-1-E / P2d-2-B,C,E,FD / P3c-F / P3f-D,H / P4a-D の18条件。変更外の受入は保持する。独立判定は全18条件合格、修正要求なし。Managerによる正式受入は別判断とする。

## 2026-09-20 00:27 JST 初期記録

- goal-implement / manager-loop、brief、P4b design、固定plan、EX-01/04、P4b主担当報告を照合した。Manager所有文書・製品は変更しない。
- HEAD `6539a61e4852dd08cf52a85c451c5d4aed867bc8`、source920 `72f6a7d05485315e5c6d86e45aa75008b39251af878adc7fc6352d296bd73083`、bundle `88376b6014a32e0907f575f859fdf6642d0177a15359356c6631f6a8013ee278`、lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` が開始時一致。製品clean。
- 私有証跡root: `/Users/hikaru/.local/share/hollow/verification/p4b-independent-20260920-TecyjE`。停止・ports/DB handles空・既知旧runtime不在を確認後、00:23:49.442に開始DB/sidecars/objectsを保全した。12objects / 3107B。秘密資料は読まない。
- 00:24:02.703同bundle起動。PID86020 / exec session54433、検証環境は本Verifierが単独所有中。自己browser `p3c-fresh-p4b-review`、新専用WSを実UI作成済み。
- 独立再実行: export Node2files29件成功、writer/plan/source/lifetime unit4files38件成功。誤ったunit config名で一度起動失敗後、正しい既存vitest.config.tsで再実行した。製品テスト失敗ではない。
- 独立clone: 主担当startの新コピーのみdriver-open、ledger26→27、65物理表502列の旧行欠落0、72trigger本文差0、FK0、103notes、export/rate0。主担当63表497列との差はledger3列とsqlite_sequence2列。ledger追加行は許容追記であり、双方向DB同値とは主張しない。最初rootでtsxを実行し依存解決不可となった後、web package経由で成功した。
- source読解: snapshot/current認可、採用/GET再照合、HTTP/native metadata、actor guard、writer/stream/lifetime、cleanup/purge/current owner境界を確認中。現時点欠陥なし。実UI・出力ファイル・最終回収と保全は未完。
- 主担当815unit/417Node/checks/build/旧シナリオは借用証拠として分離する。最大媒体/2GiB実消費/native RAM/OOM/全Markdown閲覧器は未測定。最終報告で項目ごとの根拠を確定する。

## 00:36 JST 独立実動作

- 新専用WS `01a0ba46-1187-7519-9578-bb44fcb3f93f`、note `01a0ba47-4851-75b0-87e1-6ad31b031ebe`、owner membership1、SVG asset1（検査後117B）を実UI作成。既存の103note・profile・memberは変更しない。
- HTML modeで日本語、通常相対anchor、strong/code、id付きh1、fallback表、inline style、実upload SVGを保存。既定styleで出力。app HTML1338B / MD919B、限定 HTML1338B / MD919Bの実downloadを専用rootへ保存し、app/限定はそれぞれbyte一致。UTF-8文字、通常anchor `/s/user-written-text`、default CSS、safe HTML fallback、117B SVG、内部asset URLなしを確認した。MDのid付きh1は構文escapeではなくsafe HTMLで文字が保持される。Markdown全閲覧器のrender保証ではない。
- 編集中titleだけ `DIRTY_UNSAVED_TITLE` とし、autosave1本をブラウザー内で人工保持して未送信のままHTML/MDをnative取得。旧保存title/bodyを出力し、dirty titleを維持、export POST2/native2。保持saveは解放せず、検証後の明示ページ移動で自己dirtyだけ破棄した。実運用でautosaveが自然停止した証拠とはしない。
- Cookie消去後の限定画面はscript0/form1/編集リンクなし、390pxで横overflowなし、SVG decode3×2。native HTML/MD取得、TabでMDにfocus・center hit、Enterもnative POST成立。server preloadの00:32:57.003記録はOrigin literal null / Fetch-Site same-origin / Mode navigate / Dest documentが全true。秘密URLはmemoryのみで出力しない。
- 同bundle browser HTTP: owner POST200、operationへのcredentials omit GET404（title/bytesなし）、HEAD405、Range416後もowner GET200。attachment/UTF-8 filename/MIME/no-store/no-referrer/nosniff/Content-Length一致を独立確認。
- 人工ACK喪失: 実POST200を取得後にfetchだけthrowし、POST1/native0/unknown表示。明示復帰だけではPOST増加なし。次の明示MDでPOST2/native1、`after-unknown.md`取得。中止対は送信前人工待機request1→abort1、idle復帰・旧catch非反映、次TabでHTML button可視focus、現在note route保持。actor ABA/旧note responseの詳細対は主報告借用＋独立source guard読解で判断する。
- `independent.ts` / `independent.json` は新private隔離DB/objectsだけの独自4対。00:31:52.115開始の対で同actorの有効別session拒否→元session取得成功、WS削除がactive export readerの実closeまでnote/op/spoolを保持→cancel後回収、symlink拒否、open後同byte長画像改変のsha不一致拒否を成功。fixture account/sessionとfake clockを使い、fresh既存データは触らない。
- 関連旧境界のcoordinated storage/editorMedia/resource guard unit3files25件も成功。独立再実行合計はNode29 + unit63（38+25）、独自隔離4対。全unit815/全Node417とchecks/buildは主担当借用のまま区分する。

## 00:40 JST 保全・回収・停止

- 00:36:58.194、最初のruntime PID86020 / session54433はTERM→drain→exit0 / systemErrors0。ports3000/3001とfresh DB/sidecars handles空を確認した。00:37:25.479 `before-delete/` を保全、13objects / 3224B。開始旧12に自己asset117Bだけが追加されていた。旧12scope chargeは全一致、export op/rate/reserved/writer0、旧profile行不変。
- 削除対象は自己WS1 / note1 / member1 / revisions2 / ready asset1・117B / originals0。assetはdraft由来でsource_note_idではなくnote_asset_referencesで現在所有を確認した。最初source_note_idだけの数量queryが0となったため、正しい現在参照を使い直して1/117Bを確定してから削除した。
- 同bundleを00:37:35.348にPID93336 / session31464で再起動。名前の確認入力を伴う通常UIで自己WS削除を確定し、個人一覧へ遷移した。主担当自己対象/既存WSは削除試験へ再利用していない。freshへの直接SQL mutationは行っていない。
- 自己ブラウザー `p3c-fresh-p4b-file` / `p3c-fresh-p4b-review` を各close（global cleanupなし）。後者はidle再起動を1回観測したが、認証復元と自己WS名を再確認して削除した。消失contextを未実行の成功証拠にはしていない。
- PID93336は00:39:33.645 TERM→drain→exit0 / systemErrors0。00:39:34.007 `final/` 保全、12objects / 3107B。main DB/sidecarsの整合コピーと有限payloadのみを保全し、秘密/lockをコピー・hash・表示しない。開始/削除前/最終の唯一保全DBへdriver直結なし、比較は追加copyだけ。
- `comparison-final.json`（00:39:48.786）: 自己WSはdeleted・note0、自己note/sharingなし、active103notes / 9WS、member15、31tags、9originals、2assets、111revisions、95heads、batch19/48/51。旧row全列の欠落は次表の物理差だけ。旧trigger本文差0、FK0 / integrity ok、全12scope charge同一かつprovenance違反0、export op/rate/reserved0、active writer0、unfinished purge/deletion0、unfinished object delete0。workspace deletion11件すべてsucceeded、activeWS9 / deleted11。
- `fts-final.json`（00:40:02.992）: FTS integrity双方成功、term/doc/column/offset8253件の両方向差0。開始のold103notesに対する本文論理検索内容は不変。

| 比較対象 | 最終差の扱い |
| --- | --- |
| 旧note/版/head/pin相当参照/holding/receipt/tags/原本/媒体/共有/profile/認証/旧WS・member | 旧行全列欠落0。profile unset/version12も不変。新session2は今回の通常signinによる追加で、旧sessionは削除していない。 |
| objects / scope charge | 旧12objects3107Bは全key・byte長・payload SHA一致。容量2320/0/0/516/0/0/0/75/0/113/83/0を維持。self117Bのみ物理回収。 |
| FTS物理表 | note_search_data旧1行差、segment追加。上記論理postings両方向一致を根拠とし、DB全byte同一とはしない。 |
| sqlite_sequence | note_projections137→139、extraction_notices1不変。自己noteの版更新による意図差。ledger27は不変。 |
| outbox | 旧36行は全列保持（processed_at変化も0）。新自己PurgeQueued1行は未処理・失敗なし・attempt0で残る。通常workerの次回対象であり、削除本体は全terminal/物理回収済み。全outbox処理済みとはしない。payloadは追加調査しない。 |
| 物理台帳/削除履歴 | 新自己のterminal intent/receipt/purge/object write/delete履歴は追加保持。旧行は不変。自己WSの縮小deleted rowも保持し、通常undo不可。 |

自己作成117B媒体とnote内容・2revision・memberを実削除した。通常UIでundo/復元はできない。削除前DB/objectsコピーを保持するが、保全からの復元は実施しておらず、復元成功を保証しない。

## 項目別独立判定

根拠記号: C=本Verifierの現source読解、T=既存candidate testの独立再実行、Q=本Verifier独自隔離4対、U=本Verifierの同bundle実UI/HTTP/file、D=本Verifierの新copy移行・保全比較、B=主担当の同固定候補報告を借用。Tは本Verifierが新作したtestではない。Bを独立実行と混同しない。

| 固定ID | 判定 | 根拠・適用範囲 |
| --- | --- | --- |
| P4b-A | 合格 | C snapshot/usecasesのcurrent account/session・元link/browser・grant epoch・短UoW・採用/GET内容identity再照合。T empty/late changed/trash/viewer失効/同内容移動→旧WS削除/限定epoch。Q 有効な同actor別sessionを独立拒否し元session成功。U dirty保存正本出力と無Cookie404。原本/history/draftへの昇格経路なし。 |
| P4b-B | 合格 | C plan/inspectの構造/CSS安全化・小inline検査・inspect-only有限集合。T HTML安全化/inline SVG/外部201→200・上限notice・外部許可変化・禁止body fetch。U 実HTML1338B、保存style/anchor/SVG117B、アプリ内部asset URLなし。file://を別自己sessionで開きtitle/text/table/default font/script0/3×2画像decodeも確認。外部実サービスには接続しない。 |
| P4b-C | 合格 | C AST escape・safe HTML fallback・衝突回避・65535B逐次base64。T entity/URL/marker/definition衝突・深いfallback・300001B source。U MD919Bのstrong/code/通常anchor/table/id付きh1/117B SVG定義・注意書き、HTML/MDともapp/限定でbyte一致。任意MD閲覧器の対応は保証しない。 |
| P4b-D | 合格 | C durable operation/generation/expiry/reservation・service枠・bounded write/source/lifetime・currentowner/purge。T ready/sending2slot/実remove前debt保持/旧claim/恒常disk不足/late write/missing/sha/remove fault/boot/cancel/30s・120s fake。Q WS削除がreader実closeまで保持→回収、symlink/途中同byte改変拒否。U 正常drain2回と自己117B回収、D debt0/旧charge不変。B 120秒実経過対。巨大消費・native全RAM・故意OOMは未測定。 |
| P4b-E | 合格 | C 同session/元token-browser-epoch binding、GET only、厳密native null Origin例外、現在認可後file、filename/header/rate表。T 並行8→6・全体30・固定非延長・再発行非reset・接続再開/prune100・crossorigin403・429/RetryAfter。Q 同actor別session拒否。U 無Cookie404/titlebytesなし、HEAD405/Range416後GET200、全attachment/MIME/cache/security header、native metadata4値全true。B 実匿名6→7拒否/Back。 |
| P4b-F | 合格 | C current actor epoch/note/path/serial/mount guardとReact transition。U 詳細/編集/限定の即時形式選択→native実file、dirty保持、人工ACK200喪失→unknown/非自動再送→明示復帰→新MD、人工pending取消/旧catch抑制、390/Tab/Enter/hit/focus/current route、匿名script0。B actor A→B→A旧successと別note旧failure、dirty GET404/期限/abort。人工遅延を自然障害と扱わず、download要求を保存完了と呼ばない。 |
| P4b-G | 合格 | C inward ports/Clock/ID/UoW、新0026/DI/worker/cleanup/runtime stop。D clone26→27旧65表502列/72trigger/103note保持、最終旧保全・FTS/charge一致。T 29Node+63unit、Q4、U同bundle。B815unit/417Node/checks/build/db差0を固定値と照合。製品変更なし、他runtime/最大規模は未測定、最終停止は下記。 |
| P1-E | 合格 | 変更影響は新HTTP dispatch/CLI worker packaging/ExportAction shell。C current resource guard先行と原pending/skeleton境界、T resource guard、U通常Chrome/390/native/focus/unknown/cancel。B全checks/build、認証基盤の旧受入は変更外として保持。 |
| P2b-D | 合格 | C editorMediaの既定CSSを同内容の共通pure定数へ移動しpreview/exportで共有、原style選択契約不変。T editorMedia/plan default-original・危険CSS、U既定styleのframe/実HTML/MD一致。旧style保存/切替の全UIは再反復せず先行受入＋B。 |
| P2c-1-E | 合格 | C edit routeに独立ExportActionを併置しeditor save/resetを呼ばない、旧editor本人/他人通知機構は非変更。U dirty titleと保存正本の分離・人工autosave未送信・native別contextで入力保持。B dirty404/期限/abort/actor旧応答、変更外の同owner2tab等は保持。 |
| P2d-2-B | 合格 | C 共通object owner/claim/実remove確認をexportに追加、既存write owner分岐を保存。T 追加25件中のcoordinated storage関連対とexport debt/旧claim/active reader/故障回収、Q 実readerclose/同byte改変。D writer/debt/未完delete0、旧charge不変。 |
| P2d-2-C | 合格 | C purge resource集合に現在noteのexport keyを追加しactive ownerが終了するまで待機、実delete証明後に該当opのみ除去。T purge中reader保持、Q WS経由同対。U/D 自己note/2revision/asset117B回収、旧原本/全版/heads/holding等保持。旧companion全行列の大試験は非反復。 |
| P2d-2-E | 合格 | C/D 新0026 cloneと旧保全、T/Q小故障、U native/browser/390、B型lintformat全suite/build。新自己のみ117B実回収、保全あり・通常undo不可・復元未実行を明記。 |
| P2d-2-FD | 合格 | 変更影響はserver shutdownでexport lifetime actual close待ち→runner stop→recover/sweepの追加。C順序、T lifetime/実reader、Q WS close、U2回正常TERM/drain/exit/handles0。DB client実装/依存/lockは不変、受入済300回混合FD対は借用し反復しない。native FD全量再測定とはしない。 |
| P3c-F | 合格 | C detailにExportActionを追加し保存本文fragment/隔離frame/creator等のprojectionは非変更。T editorMedia、U同detail保存本文/画像と新HTMLMD導線、保存完了偽表示なし。既存検索/長文/目次全経路の受入は保持。PDFZIP/公開等の仮成功なし。 |
| P3f-D | 合格 | C current note ownership/lifecycleによるexport owner登録・採用・送信、workspace deletionはnote purge経由。T 同内容先移出→旧WS削除でもspool取得、Q 現WS削除でreadercloseまで保持。D無関係旧12scope/12objects不変、U自己のみ実削除。 |
| P3f-H | 合格 | C新portとmigration、D旧全列/72trigger/FK/版/holding/receipt/charge/objects保持。T関連境界、B全checks/build、U自己WS回収と正常全停止。無変更先行枝の受入を増減しない。 |
| P4a-D | 合格 | C sharingHttp既存current snapshotは保持しnative formとbrowser cookieだけ追加、exportは元link/grantに束縛し別根拠へ昇格なし。T grant失効/無browser/strictmetadata/HTML隔離、U匿名current本文/画像/script0・same file・metadata・認証なし404。旧共有再発行/通常password unlock全UIはB/先行受入を借用。 |

## 借用・未検証・追加観察

- 主担当の最終815unit/417Node/型/lint/format/build/db生成差0は同固定source/bundle/lockに適用する。主報告の途中fixture失敗やbuildとの末尾重なりを成功根拠にせず、修正後・build終了後の単独417件を採用した。本Verifierは全suite/buildを反復していない。既存検索deadline失敗の別フェーズ根拠もP4b固有成功へ流用しない。
- 128MiBはWorker old-generation設定であり、native全RAM/OOM/最大800KiB×最大媒体/実2GiB消費/全Markdown閲覧器/外部後日変更/他runtime/SLOを実測していない。新しい業務上限を独断で追加しない。P4c以降PDF/ZIP/public/handle/Googleは範囲外。
- 匿名password epoch・viewer membership変更・rate世代変更・有限時刻/故障は隔離fixture根拠。実運用password/招待/再発行の通常UIを新たに証明したとはしない。自己匿名UIはpasswordなしの限定共有で独立確認した。
- freshの単独storage runtime・production bundle・local mailbox・既存share keysをpathだけで使用。秘密helperは実行専用、秘密鍵/credential/cookie/token/HAR/raw logの閲覧・hash・証跡化なし。外部API/メール/課金/公開/Issue/PR/push/deployなし。
- 検出した製品不具合0、追加受入gate提案0。途中ツールconfig/tsx package/asset count query/selectorの誤りは上記に分離し、製品失敗・成功証明へ混ぜない。

## 最終固定・環境返却

00:43:19.155 JSTに次を再照合し、開始候補と一致した。製品worktree clean、未追跡は管理用 `.goal-implement/` のみ、`git diff --check` 成功。実行中dist書換/build/migration再適用/lock手削除は行っていない。

- HEAD: `6539a61e4852dd08cf52a85c451c5d4aed867bc8`
- source920: `72f6a7d05485315e5c6d86e45aa75008b39251af878adc7fc6352d296bd73083`
- server bundle: `88376b6014a32e0907f575f859fdf6642d0177a15359356c6631f6a8013ee278`
- lock: `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`
- 追加の現artifact識別: `dist/server/export/document.mjs` は `bd8675cc76af1dc743b47e1cbe6aa33f9aec3b1c21f457fde8c4ccade273a861`。これは本Verifier終了時の測定値であり、主担当が事前固定した独立hashとは称さない。現workerを使う独立29Node/実fileの成功証拠に対応する。

00:43:58 JST再確認時、ports3000/3001空、fresh DB/sidecars handles0、自己runtime PID86020/93336不在。両runtimeは前記正常exit0、全自己テスト/helper実行は終了、自己browser2sessionはclose済み。最終保全は `p4b-independent-20260920-TecyjE/final/`、比較正本は `comparison-final.json` と `fts-final.json`。環境・製品・DB・runtime・browser・test/buildおよび本報告の操作をここで停止し、Managerへ単独環境所有を返す。

結論: 固定18項目合格、不合格0・固定条件の判定保留0。借用/未測定の範囲は上記を保持する。自己WS1/note1/member1/asset117B・2revisionを回収済み。削除前の保全コピーあり、通常undo不可、保全復元は未実施。新自己PurgeQueued1のoutbox未処理は削除本体完了と別に残る。
