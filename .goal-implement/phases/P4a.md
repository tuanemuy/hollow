# P4a: 限定共有と表示名

## 状態

2026-09-19T21:52:56.218+09:00 の最終保全に固定した完成候補。P4a-A〜H と実変更した先行22枝を主担当検証済みとして独立検証へ提出する。受入判定は Manager/Verifier に残す。採用 design の限定共有契約を正本とし、public/handle/SH-07/AC-03/表示名以外 AC-07・download/EX は後続のまま。全体管理は Manager。下記の時系列にある未実行/残作業は各時点の記録で、現在の結果は本節と最終固定節を正とする。

製品のみの commit は `4b668c3707fd893cf85dde7c268a706f1f7bfd33`（73 files）。source 892 files `8ea20d74524e9c6a832d1a2d2adbb4ac66142ef7456a8a6518f61b3654cf2595`、lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`、bundle `633545ce9943e862361206137dc92584c853c331c2d209aeacc0e53ba2aa858a`。同bundle実UIは20:55以降〜21:39、最終製品差は隔離test2filesだけ。製品worktreeはclean、未追跡は管理資料 `.goal-implement/` のみ。goal/API・管理台帳は操作していない。

判断待ちは独立受入のみ。既知の対象製品不具合は残っていない。並行負荷下の既存検索テスト2件の失敗を後述し、単独成功で失敗記録を消さない。全体R06/AC-07完了や外部接続成功は主張しない。

開始対象は `05104add96bdec027e949ed2fd1efb444aa44f0b`、source 857 files `dea32757964d1225f7a4e348037be48c609e5e46b28e47305d77f6a8d7cf6d1a`、bundle `738a9275a141e9d0a27fe6622aa068fe25933627bfc5f59f25b7e8e2615039f9`。開始 fingerprint は前独立最終と一致した。新 proofroot は `/Users/hikaru/.local/share/hollow/verification/p4a-share-20260919-WO4qVl`（0700）。`start/` は 19:51:41 JST の停止下コピー。旧 103 active notes / 12 objects 3107 B を保全し、既存を破壊対象に使わない。

## 項目別の完成候補

| ID | 主担当結果・実装 | 検証根拠 |
| --- | --- | --- |
| P4a-A | 合格候補。専用正本/必須row、現在editor・owner/lifecycle/本文/共有/所属版を同UoW照合、通常writerは共有を保存しない | `sharing.integration.test.ts`19件内のsave保持/rollback/cascade/OCC/権限ABA、最終Node388、migrationの旧103private0、実viewer readonly |
| P4a-B | 合格候補。32B token hash+専用AEAD、別取得/copy/private非表示/明示再発行/有限rotation | 実keyring unit/隔離sharing、21:22〜27欠損→同鍵回復→secondへの明示rotationで同URL/grant保持、21:33 clipboard拒否fallback/通常native成功 |
| P4a-C | 合格候補。private保護準備原子性、password非再表示、固定24h grant/epoch失効、永続固定rate/有限work/prune | sharing19の境界/rollback/並行60予約/8失敗/reopen/prune100、work unit2+8/3秒/stop、HTTP9の503、実native gate/private再限定/password変更 |
| P4a-D | 合格候補。匿名saved HTML snapshotと採用前再認可、current media二段認可、汎用404/情報隔離 | HTTP9のbrowser/bot/HEAD/Range/history/416/失効cancel/marker、sharing描画race、同bundle匿名HTML・画像2px・script除去・390/native送信 |
| P4a-E | 合格候補。metadata badge/現在member数/設定panel、ACK不明GET・明示新操作、dirty非破壊、actor/note/操作世代 | 最終unit777、実POST1/GET1とclose/reopen/新明示保存、dirty保持、A/B/A旧success/finally・A/B旧failure・note A/B旧GET、390/keyboard/focus/viewer |
| P4a-F | 合格候補。表示名だけの本人設定/OCC/安全return、実creator named/unset/deleted/unknown | sharingの表示名境界/OCC/4分類、実設定→元共有panel復帰、ACK入力保持/明示新保存、別actorに旧名なし、最後に本人を未設定へ戻した |
| P4a-G | 合格候補。move共有確認版/独立link説明/設定保持、trash復元、purge/WS fence | sharing19+batch26のmoveABA/link/grant/creator・legacy本人receipt、HTTP verify/render/media失効、実history参照除去→404→復元200、事前保全後自己WS2の回収 |
| P4a-H | 合格候補。新0025のみ、型/port/clock境界と規定checks、最終commit/比較/停止 | migration clone/本体59表472列70trigger保全、最終型/lint/format/unit777/Node388/build/db差0、最終12objects3107B/12scope・FTS論理比較、後述固定/引継ぎ |

新 4 tables は `account_display_names`、`note_sharing`、`share_grants`、`share_password_rates`。`note_sharing_initialize` は全 note INSERT に同 Tx で private row を作り、直接の row 削除は `note_sharing_required` で拒否する。note 削除時の cascade と rollback を隔離実対で確認済み。通常 note.save は共有列を書かない。共有 row 欠落を private へ置換せず DataIntegrityError とする。

## 検証根拠

- 2026-09-19T20:02:32+09:00: `clone.mts` は start DB/sidecar の新 driver copy に 0025 を適用。旧 ledger を除く 59 tables / 472 columns（FTS 等の物理表含む）の全値・列と旧 70 trigger 本文が一致。FK 違反 0、103 notes に 103 private 初期 row。fresh 本体は未移行、runtime/browser 未起動。旧 migration は不変更。
- 上記 clone の試行では root の tsx 不在、拡張子 CJS 判定、WITHOUT ROWID の順序指定、SQL literal の引用を修正した。失敗は driver 側の準備/照会であり、全旧保全成功の根拠は最後の成功 run のみ。各 clone を保持し、sole 保全 DB は driver-open していない。
- 2026-09-19T20:01 台: `pnpm typecheck` 成功。初回は新 repo の setWhere 型/未使用 import と既存 fake UoW の新 property 欠落を検出し修正。全体 lint/unit/Node/build/UI は未実行。
- 補助 `/root/p3f_prepare` の借用根拠: Node keyring/work 専有 4 files、新 unit 26 tests 成功、2026-09-19T19:59:17+09:00 全操作停止。新ランダム鍵の隔離 fixture のみ。既存招待鍵・runtime・DB 無操作。主担当の統合/503 transport/DI/stop は未検証で、補助単体成功を P4a 完成へ拡張しない。

## 先行影響

実変更に基づく Manager 採否待ち: P1-B/D（note repository 読取/型と新 note 必須行）、P2a-B/C（全 writer の新 note 初期化と変換候補 read）、P2c-1-D（復元が扱う Note 型と共有正本保持）、P3c-F（NoteView visibility）、P2d-2-C/E（新関連行 cascade と migration 保全）、P3f-H（新 migration/旧 trigger 保全）。既存 fake object-storage UoW は property 追加のみで writer 処理に変更なし。runtime/HTTP/UI/move はまだ実編集しておらず、対応枝を先取りして再 open しない。

## 次の一手

sharing/profile usecase と隔離統合対を接続し、匿名 snapshot と current media の二段認可へ進む。初期候補 ETA は開始から 4〜6 時間（23:50〜翌01:50 JST）の見込みで、実 UI 残から更新する。鍵値/token/password と旧秘密の出力・証拠保存は禁止。外部接続は行っていない。

## 20:15 の進捗

2026-09-19T20:11:04+09:00 開始の新隔離 Node 12 tests が成功（2.39秒）。共有変更で旧 note/revisions 不変、通常 save 保持/古い確認拒否、本文なし/未認証拒否、固定24h/読取非延長/trash復元、privateと再限定/再発行/password保持、8CP/1024B、鍵欠損下のhash認可/private化/有限rotation、表示名OCCと実creator4分類、初期trigger rollback/直接削除拒否/cascade、65並行予約中60だけ受理/固定window/成功refundなし、8並行失敗後の固定block、verify中epoch失効を確認した。先行の fixture `saveNote` 戻り値と canonical tmp path の修正前失敗は製品成功に含めない。

主担当は `application/sharing/{settings,reading}.ts`、本人表示名 command、専用transport、匿名HTTPのserver HTML/gate/current媒体二段認可を追加した。`parseSharedAssetUrl` の明示pathだけ frame/guard へ許可し、一般 `/s` 許可は追加しない。runtimeの専用keyring/2+8計算枠/有限pruner（60秒・各100行）とstopを接続したが、本体未起動、HTTP/実UIは未検証。新sharing middlewareはglobal既存を変更せず、system/unknownのloggerへkind/codeだけを渡し、raw cause/params/pathを渡さない。busyはredact前503、他kindは既存分類を保持する。20:14台の型成功はtransport追加前の状態で、最新再検査中。

実変更の追加先行影響案は P1-E（runtime設定/HTTP）、P2b-A/D（frameの明示共有asset source許可/同style描画）、P2d-2-FD（新passwordWork/prunerのstop→DBclose順）。P3f-B は新匿名入口の現在owner fenceを実接続した責務として追加確認する。移動/既存root/detail/list/settings はまだ主担当未編集。

Manager承認で補助を `components/sharing/**` 新client UI/pure testsに限定して再開した。UIは固定typed props、actor id+epoch/note/dialog世代、readonly、ACKunknown明示GET、秘密link別取得、表示名入力保持/確認GETを担当。補助のruntime/DB/browser/既存file操作は禁止し、主担当が統合と実UIを担当する。

## 20:29 の進捗

2026-09-19T20:24:46+09:00開始の匿名HTTP隔離8 tests成功（1.76秒）。実 libSQL と自己3B FileObjectStorage を使い、暗号 protector だけ同値fake（先の12対は実keyring）。browser/bot同server HTML、gateのmetadata非表示、Cookie/303、Origin/サイズ/重複field拒否、GET/HEAD/Range、認可前416情報なし、historyのみ拒否、stat後/stream後失効とcancel、503/秘密markerがerror HTML/loggerへ出ないboolean、explicit media guardを確認した。各自己fixture DB/3Bはteardownで削除、freshの破壊はまだ0。

共有panel/表示名の補助は2026-09-19T20:21:07+09:00に7filesを返却し全停止。借用根拠は新pure8/専有診断0/専有Biome成功のみ。主担当がroot actor epoch provider、詳細と既存editorの共有入口、profile route/安全return、一覧の現在共有metadata、単一/一括move確認版と独立link閲覧の説明へ統合した。既存editorのdirty/BeforeUnloadは保持し、共有は保存済み本文にだけ作用する。実UIは未実行。

初回 `pnpm build` 成功（20:22開始）。その後のHTTP availability guard・鍵保守CLI等の差はこのbundleの成功対象外。2026-09-19T20:27台 `pnpm typecheck` 成功、`pnpm lint:fix` と `pnpm format` 成功（既存を含む42warning/37info、errors0）。新記法/依存漏れで先行lint runは14 errorsだったが修正済み。2026-09-19T20:28:30+09:00 unit776/75files成功（16.53秒）、20:28:35 Node379/28files成功（38.94秒）、db:generate差0。新20対だけでなく、Note型/初期triggerとmove/browse DTOの先行影響範囲をこのsourceで確認した。後続の互換修正後は必要対を再固定する。

先行追加実影響: P3d-2-A/B/F と P3e-C/E（MoveExpected sharing版/visibility/passwordflag、旧attempt adapter読み替え、MoveImpact説明）、P3c-B/G（50件同snapshot metadata/wire/三表示badge）、P2c-1-E（既存editorへ保存せず共有panelを併設、同version再取得でdirtyを消さない）、P3e-B（root actor providerの隣接配置と旧応答境界）。P3f-BはManager判断によりdone保持、新匿名ownerfenceはP4a-D/Gで検証する。

Manager採用の旧prior限定legacy digest互換はこれから追加する。既存DB行と元digestを不変にし、通常digest不一致時だけ厳密private0/passwordなし入力のsharing fieldを除いた旧digestを比較し、既存本人receipt返却だけへ限定する。新親やretryへ流用しない。初回private中のpassword準備は、tokenを同Tx発行しprivate維持する改善案をManager判断待ち。どちらも現runの合格へ未検証分を拡張しない。

fresh未移行/本体未起動。次は互換/失効残対→新key準備とpremigrate保全→本体移行/同bundle UI。候補ETAは実UI前のため初期23:50〜翌01:50 JSTからまだ短縮しない。

## 20:42 の環境更新と追加対

初回privateのpassword準備はManager採用済み。未発行時だけtoken保護/hashを同Tx確定しprivate/URL非表示を維持、後の限定化は同token/passwordを使う。鍵/hash/OCC失敗は部分発行せず、初期rowや表示名変更ではtokenを発行しない。新原文必須ではなく採用UX仮定として実装した。

旧batchのprior本人照会は通常digestを先に照合し、不一致時だけstrict private/version0/hasPassword=falseの全move確認からsharingだけを除いた旧正規形を比較する。同prior receiptを返すだけで新受理/retryには流用しない。旧immutable header更新を試みた隔離fixtureはtriggerに拒否されたため、fixtureの初回repository acceptで旧保存形式を生成する方式に改めた。製品triggerは変更していない。旧raw内部入力/正規化入力の同receipt、現共有変更後もno-new-attempt、対象順/操作/title/version/password/visibility差の拒否、旧attemptの成功/失敗履歴維持を確認。新transportは欠落/null/部分共有確認を拒否する。

2026-09-19T20:40:57+09:00 unit限定14成功（203ms）、20:40:58 Node関連3files/50成功（9.38秒）。内訳はsharing16/batch26/HTTP8。追加sharingはprivate準備の鍵/hash rollback、move ABAとlink/grant/creator保持・共有変更後の旧move確認拒否・WS削除受理直後の匿名失効（noteの回収前）、outsideTx描画中更新の最大1retryと失効404。固定の型検査も成功。テストversion字段の取り違えを修正後のrunであり、新実UIを代替しない。

新lint診断の増分は共有fixture非null assertion6、HTTPfixture文字列結合info3だった。fixture型の必須性を表してassertionを除き、文字列を補間へ変更。2026-09-19T20:41:43.110+09:00全lint診断は旧基準36warning/34infoへ復帰、errors0。『全て既存』とは扱わず増分を解消した。

2026-09-19T20:40:47.506+09:00 ports3000/3001・DBhandles0を照合後、`premigrate/`保全。新専用`fresh/private/sharing/p4a-first.key`を製品CLIで20:40:48.617作成（値/hash/原文は非出力、旧招待鍵不変更）。20:40:49.496通常migrator成功、ledger26。20:41:42.322のdriver copy比較は旧59表472列の全値/70trigger本文一致、FK0、旧103noteにprivate0共有103。sole保全DBはdriver-openしていない。

再build成功後20:41:58.718の`before-ui/`保全でsource892 `242c2ce79875a8eb15902cc26e6f7469d8bb9203ce3147b28938ebb29684e506`、bundle `8a6f3fecdba8bc7e4a4dc3dc992e60ddca65884f22d71fd368be0772b9c4077b`、lock不変、12objects3107B。20:41:58.766新PID5977（wrapper session38602）起動、20:41:58.973listen。主担当だけが所有、自己browser `p3c-fresh-p4a-owner` でsignin到達。秘密URLの出力は専用wrapperでredactし、rawlog/HAR/secret画面証跡は保存しない。manual-test一般cleanup/外部Issue/委譲規則より今回の単独所有と秘密保護を優先する。先の親通知『20:41』は概算であり、確定実時刻はこのtool記録を正とする。

## 実native password送信の修正

20:44〜20:48に実UIで自己WS「P4a Sharing Self」とnote `01a0b97c-6975-7336-b157-18677e9680e1` を新作成。HTML保存時script除去、新private中password確認→確定でリンク非表示/発行済み無効、限定化確認→確定、著者「表示名未設定」を観測。パスワードはbrowser内でランダム生成してmemoryだけで渡し、原文をargv/証拠へ保存しない。自己sessionだけcookie clearした匿名別tabのgateは本文/title metadataなし。初回auth wrapperのlaunch UA指定は既知helperとの不整合でblankを生み、HTTP `set headers` 方式に揃えて解消（helper秘密source読取なし）。編集中networkidle待ちは既存pollでtimeoutし、実要素待ちに変更した。両者とも製品成功の根拠に含めない。

実native POSTは403となり、Origin nullを安全booleanで検出した。no-referrerを保ったnative formに対するOrigin完全一致だけの検査が原因。Manager採用に従い、unlock POSTだけOriginの文字列null + Sec-Fetch-Site same-origin / Mode navigate / Dest documentの全厳密一致を追加許可した。通常Origin一致を保持し、欠落/他origin/metadata欠落・不正・same-site/cross-site/noneを許可しない。他mutationへ広げていない。一次仕様は [Fetch Origin algorithm](https://fetch.spec.whatwg.org/#append-a-request-origin-header) と [W3C Fetch Metadata](https://www.w3.org/TR/fetch-metadata/)。

2026-09-19T20:52:13.752+09:00 PID5977正常drain、20:52:13.758 exit0。ports/DBhandles0後、旧同bundleへproof専用metadata観測を付けPID12110を起動。20:52:49.448の実native POSTでoriginNull/siteSameOrigin/modeNavigate/destDocumentの全boolean trueとbefore403を確認した。raw header/URL/body/cookieは保存・出力なし。20:53:26.571正常drain、20:53:26.579 exit0、両server systemErrors0。20:53:26開始のHTTP新9 tests成功（2.02秒）と型成功。手製header11拒否変種/許可303と実browser beforeの根拠は区分する。20:53:47.655 `before-unlock-fix/`保全は旧12objects3107B、source892 `df7a015cfab607aca2eb71affd5a8b16d99adfcdb73730fdec15f68726dfbed6`、bundleは修正前のため次再buildで同bundle afterを確認する。

## 21:01 実UIの成立範囲

20:54:47.851 `before-native-after/` はsource892 `df7a015cfab607aca2eb71affd5a8b16d99adfcdb73730fdec15f68726dfbed6`、bundle `633545ce9943e862361206137dc92584c853c331c2d209aeacc0e53ba2aa858a`、lock不変、旧12objects3107B。PID13516/session24230が20:54:48.143listen、環境は引続き主担当のみ。20:55:03.465同じ実native POSTで4boolean全true、afterは303→200の本文表示を確認。匿名は編集リンクなし、script実行なし、frame sandbox allow-same-originだけ、著者未設定、server本文が保存済みのみ。reloadはgateに戻らず、390pxではbody390/frame内包、script要素0/no-referrerを確認した。

20:55〜20:58 UIで本人表示名を設定→「ノートの共有設定へ戻る」で元note/dialogを復元、著者名が共有画面へ反映。owner本人で再読取すると編集リンクあり、サインインcookieを自己sessionだけclearした匿名では編集リンクなし。非公開変更確認でEscapeは確認だけ取消/共有headingへfocus復帰。実private化後、既存grantありの旧URLは404/metadataなし。再限定は同URLのままgateへ戻り旧grantを失効、新しいpassword通過で閲覧が戻る。

新自己PNG 76Bを生成し同noteへ実UI upload/保存（asset `01a0b987-bdd1-7402-b143-cd55856b33ab`）。限定frame内のcurrent画像URLへrewriteされ、cookie clear後の匿名password通過でもnaturalWidth2/complete true。旧12objectsは対象外、新原本0/自己asset1の追加であり、まだ削除していない。

20:59〜21:01 実server POST responseの受理後だけ人工TypeErrorへ変換するACK喪失を、profileとsharingそれぞれ実測。profileはPOST1でunknown・入力保持、明示GET1後に現在の新表示名を示しても元保存成功を主張せずunknown維持。sharing private化もPOST1でunknown/編集disable、明示GET1後はprivate/link非表示でも元成功とはせずunknown維持、自動POST再送0。editorの背景poll GETは最初の累積GET66と分離し、照会クリック直前にGETだけresetした短い区間がGET1。両fetch hookは復旧し保留なし。実応答断注入と製品の不明状態処理を区分する。

残はactor ABA/現在viewer権限・dirty保持と旧応答、current/history媒体と復元、自己共有WS削除直後/物理回収、鍵欠損/同鍵再開、最終checks/全旧保全/固定。新不具合はnative Origin以外未検出。実UI進捗から候補ETAを22:30〜23:30 JSTへ更新する（未検証項目の合格や期限保証ではない）。

## 21:16 の回復・履歴・actor 実対

同source/bundleで、sharingのunknown→明示GET→閉じる→開き直す→新しい明示変更を確認した。profileは再度実POST応答だけを人工喪失させ、POST1/GET1時点はunknownを維持しつつ保存buttonが有効。利用者が異なる表示名を入力して明示保存するとPOST累計2、新操作成功のみでunknownを解消した。成功後のrouter invalidateに伴うGETは別途3件で、初回照会GET1と混同しない。

21:08〜21:13、自己noteの未保存タイトルに対する最初のPOSTを保留し、共有panelのbusy=false、private変更成功、未保存タイトル保持を確認。保留解除時の試験hookが参照するwindow関数を先に消したため人工TypeErrorとなったが、製品の明示再試行で正常保存され、新タイトルが共有画面にも反映された。これは製品保存失敗ではなくdriver故障注入として分離する。先のCodeMirror fillは置換でなく挿入となり不正HTMLを作ったため、自己draftだけ破棄して保存済み本文の保持を確認。以後はclick→Meta+A→typeで全文を正確に入力し、保存済みへの収束を確認した。browser idle終了によるmemory tab消失も製品不具合ではなく、秘密を復元/ログ出力せず新しいpassword変更操作で検証を継続した。

自己本文から画像参照を外して保存すると、共有HTMLは新本文/画像0、同じ共有asset URLを実navigationすると404/汎用文/画像0。版4を実履歴UIの確認→復元で保存すると、同URLのassetは200/naturalWidth2、共有本文も同token/既存grantのままgateなし200/画像2pxへ戻った。匿名ページのfetchはCSP connect制約で拒否されるため、その試行をHTTP404の根拠にせず、navigation responseStatusを根拠とした。

21:14〜21:16、profile本人Aの実GET応答を保留して、同SPAでsignout→別人B signin→profileへ遷移。BではAの表示名なし/本人未設定/busy=false。さらにB signout→A signin→profileで新GETも保留し、旧A successを解放しても新A busy=true、旧取得noticeなし、現在入力保持。新GETを解放した時だけ現在の設定取得noticeへ収束した。A/B/Aの同actorID復帰を含む旧success/finally拒否の実対であり、認証は既知helperのfillだけを用いた。全fetch hook/保留を解除済み。

製品差なし、PID13516/session24230同bundle継続。残は旧failure actor対/現在viewer、自己WS削除の事前保全と実回収、鍵運用、最終checks/全旧比較/固定。候補ETA22:30〜23:30 JSTを維持する。

## 21:31 の権限・鍵運用・自己回収

21:18:22.328、Manager了承の新自己WSだけへoutsiderのviewer所属1行をfixture追加。既存15membership全列不変、通常triggerでmembershipRevision+1。招待フロー成功の根拠ではない。21:20の本人A profile GET旧failure注入では、Bへ実signin後の新GET保留中に旧failureを解放してもB busy=true/alertなし/A名なし。新GETだけ収束。viewerで自己noteへ実訪問し、共有panelの操作buttonは閉じるだけ、password/raw URL入力なし、編集リンクなしを確認。全hook/保留解除。

21:22:14.888 PID13516正常drain/exit0、ports/DBhandles0、21:22:15.564 `before-key-operations/`に13objects3183B（旧12/3107B + 自己PNG76B）を保全。新missing key IDのみを環境設定に指定し、既存keyファイルは変更せずPID28840で同bundle起動。既存grantの本文/画像200、リンク再表示/再発行はsafe business errorでraw URLなし、private変更は成功。既発行のpassword変更/再限定後、同URLのgateは再入力を要求し、native unlock→本文/画像200でhash認可が保護鍵と独立していることを実確認。UIの初回操作待ちは成功根拠に含めず、再読込後の実error/変更を根拠とする。

21:25:33.258 PID28840正常drain/exit0、同first keyのPID30896起動で既存grantと同URLの再表示が回復。21:26:09.930正常drain/exit0後、製品CLIで新second keyを追加し、明示有限rotationを1回実行。21:26:12.832結果はrewritten1/next null、104共有行のenvelope以外全列一致、全grant一致。旧first keyを保持し、両keyは32B/0600のstatだけ確認（値/hash非出力）。PID31258でfirst+second/active second起動、同リンク/既存grant/本文画像200を確認。GET暗黙rotationではない。

21:27:26.752 PID31258正常drain/exit0、ports/DBhandles0、21:27:27.290 `before-workspace-delete/`に最新DB/13objects3183Bと新所属2行を保全。PID32082起動後21:28:31に実owner UIで自己WS名を入力し削除を受理、個人へ遷移。自己note/asset両URLは404/metadataなし。履歴は受理21:28:31、回収完了21:28:33、1/1 noteを区別して表示した。直接URL確認時の回収前後の微小順序は断定せず、admission前失効は先の隔離対を根拠とする。

不可逆対象は今回だけのWS1/note1/所属2/asset1 76B、原本0。通常アプリundo不可、削除前保全と両keyは保持、復元実行はしていない。本人表示名のテスト値は最後に実UIで空欄保存し、現在未設定/入力空を確認。21:30:22.831 PID32082正常drain、21:30:22.836 exit0/systemErrors0。自己browserをclose、ports/DBhandles0。21:30:23.337 `before-finalchecks/`は旧12objects3107Bに戻り、source/bundle/lock不変。

21:30開始の規定typecheck/lint:fix/formatは成功し、36warning/34info/errors0、修正0。21:30:34開始unit777/75files成功（18.73秒）。Node全体/db generate/最後のbuildと全旧比較を継続中。実UIの大枝を完了したため候補ETAは22:00〜22:30 JSTへ更新する（比較で不一致なら再見積り）。

## 21:44 の限定残対と最終保全比較

21:30:40 Node全体385/28files成功（40.60秒）、db:generate差0。21:31開始のbuild成功、bundleは前の実UIと同一`633545ce9943e862361206137dc92584c853c331c2d209aeacc0e53ba2aa858a`。

固定条件の未実測部分だけを、新自己WS `01a0b9a8-4949-744f-9ece-2c82ddcdce79`（P4a Final Clipboard）、note A `01a0b9a8-e646-7123-a0db-9ada2183f3c9` / B `01a0b9aa-261e-736e-9665-48d001e926a2`で確認。原本/asset/追加objectは0。21:33 PID35252/session54903で同bundle起動。390pxでclipboard NotAllowedErrorを人工注入すると代替説明/URL全選択/入力focus/横幅390が成立。通常native clipboardへの引数が表示URLと一致し、writeText成功と成功noticeをbooleanだけで確認。readTextはbrowser権限拒否のため内容読取成功とはせず、専用cleanup操作でnative writeText空文字成功を確認し、hookを復旧した。初回早過ぎる観測/未発火は成功に含めず、最後のcalled/same/success全trueを根拠とする。Escapeでdialogが閉じ、起点の共有設定buttonへfocus復帰。

note Aの実設定GETを保留→同SPA backで一覧→note B→Bの新GETも保留し、旧A成功を解放。B busy=true、A title/URLなし、新B解放後だけB/private未発行へ収束。actor対とは別のnote/context/unmount対で、全hook/保留を解除した。

21:37:23.049 PID35252正常drain/exit0、ports/DBhandles0、21:37:23.519 `before-final-ui-delete/`に自己WS1/note2/member1/物理資源0を含めて保全。PID39290/session52761で再開し、21:39:39実UI削除受理、21:39:41回収2/2完了。新WS/2note/1memberのみ不可逆回収、通常undo不可/事前コピーあり/復元未実行。21:40:06.985正常drain、21:40:06.991 exit0/systemErrors0。自己browserclose、ports/DBhandles0。21:40:07.378 `before-final-comparison/`は旧12objects3107B/sourceとbundle不変。

21:41:21.437 driver copy比較（`final-compare-qy8jyG/comparison.json`）: 旧59物理表472列のshape一致、旧70trigger本文一致、57表の旧row全列を保持。`note_search_data`と`note_search_idx`は自己noteの追加/削除に伴うFTS物理segment変化があり、各7旧rowがbyte同一ではない。旧本文103/論理note_search/projection/版111/head95等は保持。21:44:31.350、before/afterのdriver copyだけでFTS integrity-check成功、fts5vocabの1058語とdoc/cntが全一致。物理segment不変と論理検索不変を混同しない。migration直後の59表全値一致は20:41の別根拠。

最終容量は旧12scope全一致（personal3件=2320/0/0、active workspace9件=516/0/0/0/75/0/113/83/0 B）、旧12objectsの全key/bytes/hash一致。deleted workspaceはこの12scopeに含めない。countsは103全active notes/31tags/9originals/2assets/111revisions/95heads、9activeWS/15members、batch19/48/51。新deletedWS計8（開始6+今回2）、全workspace intent/全purge終端、active writer0、FK0、capacity integrity0。共有は旧103全private0/未発行、grant/rate0。秘密hashやrow内容は出力せず、比較結果だけ保存した。最初の帳票ではworkspaceの0を1個多く記したため訂正。proof scriptのpersonal識別子も型どおりに正し、21:47:40.538の新driver `final-compare-Qtyxd7/comparison.json`で同じ12件/値/全旧保全を確認した。最終容量根拠はこちらを正とする。

採用条件の根拠を補う最後の隔離回帰として、実file-backed接続close/reopen後も8回browser block/全体60予約と固定期限を保持、prune1回100件まで/live行保持、現viewer mutation拒否とeditor→viewer→editorの旧確認拒否を追加。旧legacy priorの異actor入力もSCOPE_NOT_FOUNDで拒否し本人同receiptだけを維持。21:44:02開始sharing19/batch26計45成功（8.17秒）。製品ロジック差は0、この差は2既存testfileだけ。最終型/Node全体を再固定してからcommitする。

## 最終検査と並行失敗の分離

全時刻は2026-09-19 JST。対象は上記完成候補commitの製品byteで、最後の2test追加後に実行した。

| 実行時刻 | 検査 | 結果 |
| --- | --- | --- |
| 21:45:38 | `pnpm typecheck` → `pnpm lint:fix` → `pnpm format` | 成功、修正0、36warning/34info/errors0。新増分は解消済み |
| 21:45:50 | `pnpm test:unit` | 75files/777成功、23.52秒 |
| 21:45:39 | `pnpm test:integration:node`、unit/build等と並行 | 388中386成功/既存検索2失敗、43.52秒。下記を参照 |
| 21:46:49 | 同じsourceの `searchExecution.integration.test.ts` 単独 | 12成功、14.94秒 |
| 21:48:06 | `pnpm test:integration:node` 全体を単独 | 28files/388成功、35.16秒。db generate差0 |
| 21:45台 | `pnpm build` | 成功、実UIと同bundle `633545ce…858a` |
| commit直前 | `git diff --check` / staged diff check | 成功。73製品fileだけcommit、管理資料は含めない |

並行runの失敗は既存 `packages/core/src/adapters/node/__tests__/searchExecution.integration.test.ts` の「shares the same finite executor between tag management and ordinary note reads」（約3032ms、`EXTERNAL_API_ERROR`）と「validates full HTML and preserves exact input at the 800KiB boundary」（約3086ms、`PROJECTION_TIMEOUT`）。前者は `searchExecution.ts:221` の正常exitとdeadline照合、後者は `isolatedProjection.ts:65` の既存3000ms abort期限に到達した。今回これら実行器の製品source/閾値は変更していない。unit/build/型等と並列に負荷を掛けた事実と期限直近の時間、同byte単独12/全体388成功から資源競合を有力原因と判断するが、負荷以外の可能性を完全証明したとはしない。skip/timeout延長/閾値緩和は行わず、失敗と成功を両方残す。21:30の385成功は追加3対前の別run。

## 実変更した先行22枝の提出結果

以下は再受入のための主担当合格候補で、旧受入全量の盲目的再反復ではない。Managerが採用したID以外は再openしていない。

| ID | 変更責務/主なfile | 影響範囲の根拠 |
| --- | --- | --- |
| P1-B / P1-D / P2a-B / P2a-C | `domain/note/entity.ts`、`noteRepository.ts`、`hollowUnitOfWork.ts`、0025の全writer初期row | 最終unit777/Node388、初期化rollback/必須row/cascade、通常save保持、既存本文/版/holding保全 |
| P1-E | `server.node.ts`、`hollowTypes.ts`、共有HTTP/middleware/keyring/workのDI | 型/HTTP9、503/秘密marker、実missing/restart/rotation、正常TERM/drain/exit0 |
| P2b-A / P2b-D | `resourceRequestGuard.node.ts`、`editorMedia.ts`、`sharingHttp.node.ts` | 明示shared assetだけの許可、HTTP HEAD/Range/current認可、実frame画像/隔離/履歴のみ拒否 |
| P2c-1-D / P2c-1-E | Note読取型/共有metadata、`NoteEditor.tsx`/`NoteSharingAction.tsx` | 共有変更で本文版不変、実dirty保持と保存retry、実history復元後同URL/grant媒体回復 |
| P3c-B / P3c-F / P3c-G | `browseReadSnapshot.ts`、browse ports/wire、NoteView、`NoteList.tsx` | 50件同snapshot metadata、型/pure/Node全体、現在badge/共有入口/owner member表示 |
| P2d-2-C / P2d-2-E / P2d-2-FD | 新関連row FK/cascade、0025、`sharePruner.ts`/`sharePasswordWork.ts` とstop | 初期clone/最終比較、prune100境界、queue停止とrunning収束、自己76B物理回収・drain後DBclose |
| P3d-2-A / P3d-2-B / P3d-2-F | `move/ports.ts`、`noteMoveRepository.ts`、`moveInput.ts`、`MoveImpact.tsx` | sharing19/batch26、確認版/所属ABA拒否、token/grant/実著者保持、独立link説明 |
| P3e-B | `SharingActorProvider.tsx` と `__root.tsx` への隣接統合 | 同bundle actor A/B/A旧success/finally、旧failure、新note busy保持。既存batch UI実装自体は不変更 |
| P3e-C / P3e-E | `batch/usecases.ts`、`batchRepository.ts`、必須move input | 新transport欠落拒否、旧内部decodeだけprivate0正規化、本人prior限定旧digest比較/no-new-attempt、異actor/他field拒否、元DB/digest不変 |
| P3f-H | 新migration/関連row、匿名current所有fenceの統合保全 | 旧59表472列/70triggerの移行保全、既存103/9WS/15member不変、自己WS2のみ保全後回収、全未終端0 |

P3f-Bは既存入口を変更していないため再openしなかった。新匿名入口の失効はP4a-D/Gで検証する。

## 最終保全と破壊量

`final/manifest.json` は2026-09-19T21:52:56.218+09:00の停止下固定。直前にports3000/3001・DBhandles0を再照合し、fresh `app.db` と `before-final-comparison/app.db` は `cmp -s` exit0で完全一致した。最終DBをdriver-openしていない。最終objects12/3107B、source/lock/bundle/commitは冒頭記載どおり。

保全比較の正本は proofroot 配下 `final-compare-Qtyxd7/comparison.json`（21:47:40.538）。同driver copyの `fts.json`（21:48:07.528）はintegrity-checkと1058語/doc/cnt一致、`fts-postings.json`（21:48:53.435）は8253のterm/doc/column/offset一致。FTS物理2表のsegment変化と旧57表全列保持を区分し、旧59表の物理全byte不変とは主張しない。新migration直後は別根拠で59表全値一致。旧12scopeはpersonal3＋activeWS9、deletedWSは含まない。

今回のfresh不可逆回収は新自己WS合計2、note合計3、member合計3、asset1の76B、原本0。既存103notes/9activeWS/15members/12objects3107Bは破壊対象外。通常アプリundo不可。`before-workspace-delete/` と `before-final-ui-delete/` に削除直前のDB/objectsコピーを保持し、暗号鍵は専用元pathで両方保持、復元実行はしていない。start時deletedWS6から最終8、全削除intent/全purge終端、writer0。表示名試験値は本人の実UI操作で未設定へ戻した。

## 独立検証への安全な引継ぎ

製品・環境の操作担当は次の正式委譲を受けたVerifierだけとする。Implementer/補助は製品編集・DB/runtime/browser/test/build/gitと文書操作を停止して返す。最後のruntimeはPID39290/session52761、2026-09-19T21:40:06.991+09:00 exit0/systemErrors0。自己browser `p3c-fresh-p4a-owner` / `p3c-fresh-p4a-final` はclose済み。保留fetch/hookなし。final保全までports/DBhandles0。

proofrootは `/Users/hikaru/.local/share/hollow/verification/p4a-share-20260919-WO4qVl`。`start/`・各before保全・`final/`・既存比較driverは変更しない。再検査は新private driver copyを作る。freshは `/Users/hikaru/.local/share/hollow/verification/p3c-20260911-dyHGjx`、ledger26。新migration適用済み、旧migration再適用やlock手削除は禁止。

安全な実行専用launcherは proofroot の `server.mjs`。raw stdout/stderrを保存/転送せず、listen/drain/exit/systemError件数だけ出す。通常再開は次の1コマンド（起動前にports/DBhandlesを限定照合）。

```sh
/nix/store/4gl9pclv6ygwmgpg1gijza978bqbmpga-nodejs-22.22.3/bin/node /Users/hikaru/.local/share/hollow/verification/p4a-share-20260919-WO4qVl/server.mjs rotated
```

現在key設定は `HOLLOW_SHARE_KEY_DIR=<fresh>/private/sharing`、`HOLLOW_SHARE_ACTIVE_KEY_ID=p4a-second`、`HOLLOW_SHARE_KEY_IDS=p4a-first,p4a-second`。両 `.key` は32B/0600、親dir0700。値/秘密hash/readは禁止、旧first keyを削除しない。招待keyは `<fresh>/private/invitation.key` のpathだけ利用し変更しない。launcherのnormalはfirstのみ、missingは新不在IDだけの試験用なので通常引継ぎには使わない。既存環境を起動する際はDB `file:<fresh>/app.db`、objects/、mailbox/、APP_URL `http://localhost:3000`、HOSTNAME127.0.0.1/PORT3000/local mail/productionをlauncherが限定設定する。元argv/env全出力は禁止。

停止は当該launcher/記録済みchildだけへ通常TERMを送り、drain→exit0→ports/DBhandles0後にbuild/コピーする。live distの上書きは禁止。鍵CLIの再create/旧key置換や、本レポートのmigration/fixture/deleteを既存対象に再実行しない。

再利用可能な非秘密検証は、repo rootで `pnpm typecheck`、`pnpm test:unit`、`pnpm test:integration:node`、`pnpm build`。Node全体はunit/buildと同時実行せず、deadlineの採用値を変えない。関連範囲だけなら `pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/sharing.integration.test.ts packages/core/src/adapters/libsql/__tests__/batch.integration.test.ts apps/web/app/worker/node/__tests__/sharingHttp.integration.test.ts`。隔離fixturesを使いfreshには接続しない。Lint/formatは独立検証時には非write検査を使い、製品修正は差し戻す。

実UIは新専用WS/noteを作り、保存済みHTML→privateのままpassword準備→限定→匿名gate→native送信→current本文/画像→private失効、本人profile復帰、390/copy/取消の順で必要対だけ再現可能。passwordはbrowser memoryで生成/入力し原文をargv・証拠に保存しない。新資源を削除するなら専用保全後だけ。既存基準データは破壊不可。秘密を含むURL/cookie/raw network/HAR/screenshotを出さず、真偽・件数・HTTP statusだけを証拠にする。

既知auth helperは `<fresh>/helpers/auth.cjs <session> fill owner|editor|outsider` の実行だけ（全文read禁止）。Node22の上記実path、session `^p3c-fresh-[a-z0-9-]+$`、`AGENT_BROWSER_DEFAULT_TIMEOUT=20000` / `AGENT_BROWSER_IDLE_TIMEOUT_MS=120000` をhelperにも設定。通常Chrome HTTP UAを明示し、navigatorだけで代替しない。proofroot `browser.cjs` は自己 `p3c-fresh-p4a-*` sessionのheader設定と秘密URLredactを行う実行専用wrapper。global cleanupは禁止、自己sessionのみcloseする。

補助由来はkey/workの26unitとUIの8pure/専有型診断を借用したことを明記した。最終777unit/388Node・規定checks/build・fresh移行/保全/同bundle実UIは主担当が再実行した。独立検証は未実行で、これからVerifierへ渡す。Cloudflare等別runtime・実外部サービス/送信・本番運用・未提供public/fullprofile/exportは本sliceの成功範囲ではない。外部Issue/API送信/課金/push/PR/deployは一切行っていない。
