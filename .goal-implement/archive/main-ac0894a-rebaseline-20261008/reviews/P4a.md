# P4a 独立検証

## 対象と現在状態

独立 Verifier resume_verifier が担当する。製品実装には参加していない。P4a-A〜H と plan.md の変更先行22枝、合計30項目を対象とし、無変更の受入済み条件は保持する。採用正本は brief.md・design.md P4a・plan.md、原文 SH/AC-07表示名/OR-12/WS-10/JB と CLAUDE.md。goal-implement の Manager Loop と独立レビュー、秘密を出力しない実ブラウザ検証に従う。管理文書と goal は Manager 所有、製品修正はしていない。

最終判定: 対象30項目は合格。対象製品の差し戻し事項、不合格、条件全体の未検証は0。下記の独立根拠と明示した借用根拠を合わせた判定であり、全条件を実ブラウザだけで全面再証明した意味ではない。本文の進捗節は当時の状態で、最終状態は末尾の保全・返却節を正とする。時刻は clock tool の UTC と、ホストが出す ISO timestamp を区分する。途中連絡の「22:12」は概算であり確定イベント時刻として採用しない。

## 開始固定と保全

ホスト記録 2026-09-19T13:06:31.869Z に次を照合した。

- commit: `4b668c3707fd893cf85dde7c268a706f1f7bfd33`
- source: 892 files / `8ea20d74524e9c6a832d1a2d2adbb4ac66142ef7456a8a6518f61b3654cf2595`
- lock: `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`
- bundle: `633545ce9943e862361206137dc92584c853c331c2d209aeacc0e53ba2aa858a`
- Node: 22.22.3。製品 worktree clean、未追跡は管理記録のみ。

起動前の ports3000/3001・fresh DB/sidecar handles は0、旧PID39290は不在。専用0700 rootは `/Users/hikaru/.local/share/hollow/verification/p4a-independent-20260919-Ve4T3G`。`start/` に停止下 DB+存在sidecar とobjects12/3107Bを保全した（ホスト13:07:24.502Z）。保存DBをdriver直接openせず、新しいdriver copyだけを用いる。

既知rotated launcherでPID51586/session31876が起動し、listenを確認（ホスト13:07:44.617Z）。配信bundleは固定候補のまま、live buildなし。自己browserは `p3c-fresh-p4a-independent` のみ。新自己WS1を作成し、旧103notes/12objectsは変更対象外。

## 独立で実施済み

- source読解: 共有正本/確認UoW、token/grant/password epoch、外部描画後再照合、媒体stat/stream後認可、native null-Origin限定条件、rate/計算待機、keyring/明示rotation、display name provenance/OCC、actor世代/ACK不明、本人prior限定legacy batch digest、migration/trigger/通常writerの差分。
- Node 4 files /66 tests 合格: sharing19、sharingHttp9、batch26、searchExecution12。検索は既存deadlineを変更せず合格。batchファイル全体に既存39MB caseが1回含まれたが、新decoder成立の根拠とはせず追加反復しない。
- pure 4 files /40 tests 合格: sharePasswordWork/shareSecrets/sharing model/moveInput。
- 主担当最終比較JSON/FTS論理比較を読取。これは借用根拠であり独立比較の代替とはしない。

## 初期時点の残検証と借用範囲

新clone移行/旧列・trigger整合を実行中。同bundleで新専用noteのprivate保護→限定→匿名native gate→失効、profile、390/keyboard等を確認し、必要量だけ保全下で回収する予定。終了時の旧データ・容量・objects比較、候補再固定、正常drain/exit/ports/DBhandles0は未実施。

主担当777unit/388Node/型lintformat/build、key欠損/rotationの実環境、複雑actor/ACK遅延UI等は候補指紋に適用範囲を照合して借用判断する。並行試験時の既存search2deadline失敗は消去しない。同byte単独12/388合格は別の事実であり、資源競合が原因という説明は推定にとどめる。public/handle/SH07未決、EX、他profile、外部連携は後続で本判定の追加gateにしない。

## 22:18〜22:19台の中間記録

初期実行から再発行確認までの中間根拠を記録する。途中のclock tool記録は2026-09-19 13:18:13 UTC、後続確認は13:19台で、全件を同時刻の観測とは扱わない。

- `clone.ts` / `clone.json`: 主担当start保全の新DB/sidecarコピーでledger25→26。61物理表477列の旧行全列をEXCEPT照合し欠落0、旧70trigger本文差0、FK0、103note/103private0。主担当59表472列との差は `__drizzle_migrations` 3列と `sqlite_sequence` 2列。ledgerの新1行は許容する追記であり、DB全byte一致や新旧完全双方向同値とは主張しない。sqlite_sequence旧行も照合対象。objects/容量は主保全の借用と最終独立比較を分離する。
- 非write `pnpm typecheck` / `pnpm lint` / `pnpm format:check` 成功。lint36warning/34info、errors0、修正なし。buildは固定bundleの主担当成功を借用する。
- 新自己WS `01a0b9c8-a0c4-778b-9b66-21cabf46ce6a`、新自己note `01a0b9ca-a7b5-77ef-9fa8-f109ea04a84d`、objects追加0B。通常WYSIWYGから保存済み本文を作った。
- 初期privateでbrowser内生成passwordを設定し、private/URLhidden/設定済み/入力clearを確認。限定確認をEscapeで取り消すとmain headingへfocus、再確認後だけ限定化。390pxで横overflowなし、member1名と独立password audience。コピーを人工拒否すると選択可能readonly link全体へfocus/selection。
- 自己browser cookiesだけをclearし匿名別tabへ移動。gateは200だがtitle/著者/本文なし。実native form送信後200、保存済みtitle/body、著者未設定、編集リンクなし、sandbox allow-same-origin、本文script0、no-referrer/noindexを確認。header文字列の生観測やnative303自体は独立で採取せず、HTTP隔離9と主担当native metadata根拠に分離する。
- 本人profileで実POST応答だけを人工欠落: POST1/GET0でunknown、成功表示なし、空白込み入力を保持。明示GET1で現在のtrim済み名を取得してもunknownを維持し自動再送なし。新しい明示保存POST2でのみsuccess/unknown解除。共有panelへ戻って表示名反映、限定/password状態保持。
- 初回人工hookはfetchのthis束縛を誤り送信0で失敗した。修正後のPOST1/GET1だけをACK根拠とする。shellの未quote `?` と整数tab指定の準備失敗も製品不具合/成功証明に数えない。
- private化後は既存grantでも404/bodyなし。再限定は同token/password維持だが旧grantはgateへ戻る。再入力後に再発行し、新URLとpassword維持を確認した。

本人display nameの試験は既存profile rowへの明示UI mutationである。最後に未設定へ戻してもversionの増加は残るため、旧row全列不変の対象へ混同しない。新WS/note以外の既存ノート・objectsは変更していない。

## 最終の条件別判定

根拠の区分: C=独立source読解、T=独立再実行（既存testを含む）、U=独立同bundle実UI、D=独立新driver copy/保全比較、B=主担当・補助の固定候補に適用できる借用証跡、P=無変更部分の先行受入。Bは独立で操作済みとは記載しない。

| 条件ID | 判定 | 根拠と適用範囲 |
| --- | --- | --- |
| P4a-A | 合格 | C: settingsSnapshot/checked/required row・通常writer非上書き。T: sharing19の初期化/原子rollback/通常save・OCC/role ABA/move ABA・本文/revision不変。U:新private保存→準備→限定。D:103旧private0保持。viewer実UIはB。 |
| P4a-B | 合格 | C: indexed hash/専用AAD付きAEAD・取得分離・private非表示・50件明示rotation。T:実keyring/欠損/改変/rotation。U:copy拒否選択fallback、private/relimit同token、再発行で旧404/password保持。実環境key欠損→回復/明示rotationとnative clipboard成功はB。既存鍵は不変更。 |
| P4a-C | 合格 | T:private準備rollback、8CP/1024B/exact、固定24h境界/非延長、trash/restore、65並行60予約・固定8失敗block/reopen/prune100、2+8/3秒/stop/503。U:初回private準備、secret非再表示、匿名gate/native成功、private後旧grant失効/再限定再入力、新token再入力。 |
| P4a-D | 合格 | C:一snapshot認可→Tx外描画→stamp採用照合、current ready ref・stat/stream後の再認可。T:HTTP9のbot/HEAD/Range/416前認可/history/別note/旧token/stream取消/汎用404/秘密marker。U:匿名saved title/body/unset author/編集なし、script0/sandbox、390、noindex/referrer、private/旧token/削除WS404。画像2pxの同bundle実表示はB、独立媒体は隔離3B。 |
| P4a-E | 合格 | C:actor id+epoch/note/dialog世代と存続parent・valid付きsuccess/catch/finally、dirty editor併設のみ。T:pure8/moveInput6。U:member1/audience、pending確定前後、Escape取消/focus、390/copyfallback、profile復帰後の共有状態。複雑actor A/B/A/旧catch/newbusy・dirty・共有ACK不明の実UIはB、独立ACKはP4a-F。 |
| P4a-F | 合格 | C:本人session/verified・display name別row/OCC・creator4分類・検証済note return。T:境界/未設定/改行拒否/OCC/named-unset-deleted-unknown・note確認版不変。U:本人名→trim保存、応答欠落POST1/明示GET1でもunknown/入力保持→明示POST2成功、元共有panelへ復帰、最後に未設定の永続保存。 |
| P4a-G | 合格 | C:sharing入りmove expected/独立link説明・非上書き、current scopeでread/unlock/media fence。T:move往復古確認拒否/同link-grant-creator、本人legacy receipt、trash/restore、render/verify/media失効。U:再発行済現行tokenは新WS削除後404。先移出や大きな旧purge機構の無変更部はP＋B、媒体小実体raceはT。 |
| P4a-H | 合格 | C:domain/application内向きport・clock/id/UoW、boundary schemas、新0025と2trigger。T:66 Node/40 pure・型/nonwrite lint/format。D:旧移行全列/70trigger、旧object/charge/版/receipt・FTS論理保持。U:同bundle主要経路。B:全777unit/388Node/build/db差0。最終固定/正常全停止は下記。 |
| P1-B | 合格 | C:NoteEditorの共有入口追加は既存保存経路を変更しない。U:新WS WYSIWYG title/body保存→共有→再読込saved本文。T:初期sharing/通常writer保持。dirty/通知の細分はB＋P。 |
| P1-D | 合格 | C:現在requireAccount/requireNoteとsharing別認可。T:unauthorized/viewer/role ABA/匿名gate。U:cookie消去した匿名ではprivate情報なし・編集なし。再起動後の同token/grant本文と旧非公開二利用者の全経路はB/P。 |
| P1-E | 合格 | U:日本語panel/profile/390/keyboard/focus/pending。T:型lintformat・passwordWork stop。D:Node22正常TERM/drain/exit/handles0。B:buildと既存シェル全体。 |
| P2a-B | 合格 | C:note INSERT triggerとrepository read差、import writerは変更なし。T:新row/rollback/通常save、B:全Node388のimport対。D:旧9原本/12objects不変。import実UI全面反復はP/B。 |
| P2a-C | 合格 | C:未本文share拒否・conversion readに必須row、機械抽出/AI判別処理は不変更。T:本文なし発行拒否。B:全Node388の変換群、D:旧job/原本保持。 |
| P2b-A | 合格 | C:共有assetの厳密pathだけguard/frameに追加。T:HTTP current GET/HEAD/Range/history/別note/失効/416と3B storage。U:sandbox saved本文。B:同bundle画像2pxと旧private媒体の全Node、P:無変更処理。 |
| P2b-D | 合格 | C:sharing rendererが保存済display.styleをframeDocumentへ渡す。T:共有saved SSR、B:同bundle画像/style/history復元と全Node。旧style writer不変更。 |
| P2c-1-D | 合格 | C:復元writerはsharing rowを書かない、note readだけ現在visibility参照。T:normal writer/sharing不変、B:同bundle参照除去404→版復元画像200/同tokenと全Node。D:旧111rev/95heads保持。 |
| P2c-1-E | 合格 | C:NoteEditor共有併設でdirty/save/lifecycle guardを変更しない。T:旧actor pure guards、B:同bundledirty保持/actor旧応答と全unit。P:既存保存・通知mechanism。 |
| P3c-B | 合格 | C:50件page内snapshotでsharing metadataだけをprojection/wireへ接続、token等なし。T:searchExecution12/DTO型、B:全unit/Nodeと同bundle一覧badge。D:FTS8253postings同値。 |
| P3c-F | 合格 | C:detail現在visibility・password/link boolean・本人actorと共有入口、既存creatorDisplayと外部ShareAuthorは分離。U:新詳細→共有/profile return・saved匿名本文。B/P:長文見出し/原本表示の無変更部。 |
| P3c-G | 合格 | C:boundary・actor/現在認可と既存streamingの保持。T:search12/checks。U:390/focus/匿名fence。D:既存全column比較、FTS論理/object/charge、固定/停止。B:全検索/三表示UI。 |
| P2d-2-C | 合格 | C:新関連FK cascade/required triggerは親note削除を妨げない。T:直接sharing削除拒否/親cascade。U/D:自己note1実purge後sharing/grant/rate0、旧原本/asset/revision/holding/本人batch保持。P/B:既存receipt/companion機構。 |
| P2d-2-E | 合格 | D:新clone/旧列trigger/objects/容量保持。T:関連対/checks。U:390/keyboard・自己だけ保全後回収。B:全unit/Node/build。破壊量と復元未実行を分離。 |
| P2d-2-FD | 合格 | C:new passwordWork/pruner stop→既存DBclose。T:queue拒否/active drain/idempotent stop。U/D:2回正常TERM/exit0とports/handles0。client/native依存は不変更、旧300反復はP/Bで追加反復なし。 |
| P3d-2-A | 合格 | C:MoveImpactがmembership由来の増減と独立linkを区別、共有版追加。T:move確認stale/roleABAとbatch/transport。B:同bundle影響確認、P:既存有限paging。 |
| P3d-2-B | 合格 | C:専用moveはsharingを書かずexpectedにversion/visibility/passwordを追加。T:往復ABA拒否・同token/grant/creator・旧batch互換。D:旧holding/容量/本文版/原本保持。 |
| P3d-2-F | 合格 | C:共有状態と独立linkの説明、既存move parent/guard不変更。T:必須input/pure・batch。B:同bundlemove確認/dirty/390、P:既存認可後query正規化。 |
| P3e-B | 合格 | C:SharingActorProviderは既存selectionの外側へ隣接、selection logic不変更。T:共有actor ABA/旧token ownership pure、B:実A/B/A等と全unit。P:既存board選択機構。 |
| P3e-C | 合格 | C:本人byRequest prior存在時のみlegacy digest限定比較、新受理に流用なし。T:batch26/transport欠落拒否、同prior/他actor/異内容/順序/新sharing版拒否/no-new-parent。旧DB/digest不変更。 |
| P3e-E | 合格 | C:adapterの旧field欠落だけprivate0補完・新部分field非補完、move共有確認。T:legacy旧attempt成功/失敗・no-new-attempt、その他batch receipt対。D:旧19/48/51とreceipt行保持。 |
| P3f-H | 合格 | C:新migration/匿名所有fenceの接続。D:clone旧trigger/制約/holding/receipt・旧9WS/15members保持、自己1WSだけ削除完了。T/B:既存削除機構への影響、全check/固定/停止。無変更P3f-B等は再openしない。 |

## 最終保全、差分の説明と復旧範囲

clock tool 2026-09-19 13:24:41 UTC、runtimeの最終drainは13:24:41.123Z、exit0は13:24:41.128Z。最初のPID51586/session31876も13:20:10.923Zに正常exit0、再開したPID62296/session65378もsystemErrors0。専用browser sessionはclose済み、global cleanupなし。最後の再起動も同rotated設定/同bundleだけを使用し、鍵作成/再rotation/既存鍵の読取・hash・削除はしていない。

`before-delete/` は13:20:33.151Zの停止下保全、`final/` は13:25:05.126Zの停止下保全。DB/sidecarとobjectsをコピーし、それぞれdriver copyを新規作成して `comparison-before-delete.json` / `comparison-final.json` を生成した。freshやsole保全DBへdriver直結なし。final comparisonは13:25:08.022Z、FTS/例外列比較 `fts-final.json` は13:25:24.860Z。

- 旧103active notes、31tags、9originals、2assets、111revisions、95heads、9active WS/15members、batch19/48/51、旧関連rowと旧triggerを保持。旧103sharingはprivate/version0/link_generation0、grant/rateは0。FK違反0、integrity_check=ok、writer/未終端purge/未終端WS削除0。
- objectsは12/3107B、相対path/bytes/内容hashのmanifest全一致。payloadだけを照合し鍵・credential・lockは対象外。旧12scope容量は2320/0/0/516/0/0/0/75/0/113/83/0で全一致。capacity provenance違反0。
- 既存profile1行は本人の試験操作でversion6→12、最後のdisplay_nameはnull。値を戻しても版は戻さない。空文字fill/Meta操作の初回はReact入力のclear成立を確認できず同名を保存した。native value setter+input eventで空入力→明示保存→現在未設定/空欄→最終DB nullを確認した。この準備差を「最初のclear成功」や製品欠陥とは扱わない。
- 既存outbox2行のprocessed_atがnullから完了日時へ変わり、processed_events2行が追加された。event payload等の残り12列に旧差0。既存結果データを上書きした差ではなく、再起動した通常workerによる処理済み遷移として区分する。
- sqlite_sequenceは自己note projection採番で131→132、extraction_noticesは1のまま。FTSの内部segmentは自己追加/削除で変化し、物理byte不変とはしない。新driver copyの両FTS integrity-check成功、8,253件のterm/doc/column/offsetが双方向差0。
- 新自己WS1/note1/member1を実UIで保全後に回収。original/asset/objectの新規破壊0/0/0B。noteのsharing/grant/rate/自身のrevision/headも回収、削除intentはtotal1/completed1/succeeded、削除WSはstart8→final9。通常アプリundo不可。削除前DB/objects保全あり、保全からの復元は実行していない。旧対象と主担当が回収済みの対象を再利用していない。
- 実UIは削除確認で不可逆説明/未一致disabled→自己名一致で実行→personalへ遷移。削除前に再発行した現行tokenも404/bodyなし。配信済みbytesは回収できないという採用限界は残る。

## 借用、未実施、返却

777unit/388Node全体、build/db生成差0、同bundleの画像2px・dirty・三表示・viewer readonly・複雑actor/note遅延・共有ACK・運用key欠損/回復/rotation・native clipboard成功は主担当正本の借用。独立では関連66Node/40pure、型lintformat、clone/最終保全比較、主要UI、profile ACK故障対を実行した。HTTP隔離protector fakeと、別sharing/keyringでの実AEADを混同しない。実browser native送信200は独立、303/4 metadata booleanは主担当と隔離HTTP根拠。全30合格はこの組合せで判断した。

並行負荷下search2件3032/3086msの既存deadline失敗は残存する観察事項。独立search12を含む66件はunit/build非並行で成功し、閾値緩和・skipなし。主担当単独388成功と合わせ、固定候補の機能欠陥を示す再現は得られなかった。高並行CI下の余裕まで保証しない。39MB既存caseはファイル単位実行に1回含まれたが、decoder成功の新証明や追加受入条件へ拡張しない。

どれも今回固定30条件への未検証追加gateではない。条件追加の提案・新しい先行受入の再open提案は0。外部API/送信/課金/Issue/PR/push/deployは行っていない。

13:24:21.870Zにcommit/source892/lock/bundleを再照合し冒頭4値と一致、製品worktree不変更。clock tool 13:28:40 UTCの最終読取確認でもports3000/3001・fresh DB/sidecar handles0、自己PID2つ不在、製品clean。本報告を全文通読し、借用範囲の過大表現を修正した。全製品・DB・runtime・browser・test/build・検証文書操作を終了して環境所有をManagerへ返す。次の担当はports/DBhandles0と同候補を再確認し、既知rotated launcherだけで再開できる。0025再適用、lock手削除、live dist上書き、旧保全へのdriver-openは不要で禁止のまま。
