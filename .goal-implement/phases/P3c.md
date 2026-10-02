# P3c 一覧・検索・読書

P3c-A〜Gと実変更に対応する先行25枝の自己検証完了候補。commit `01b55c9294eb2bf77d41c06f5db7a67fb0d5dcd6`。独立受入・全体完了ではない。旧37objects/13,222B未復元のD01は未解決のまま分離する。

## 候補結果

根拠の区分は、主担当の実UI/実DB、補助の限定pure検査、既存の無変更枝の借用、未実行である。以下の日時はJST。途中の失敗は後続の成功と別に保持する。

| ID | 自己候補の根拠 | 適用範囲・留意点 |
| --- | --- | --- |
| P3c-A | 製品browse実DB14件、search/projection runtime4件、保存/復元/失効/backfill競合、同Tx現在認可・exact-before-LIMIT。native停止/queue/closeは本書後半の実測。632件clone backfillで旧正本不変 | 索引量/query planの方式選定値は[P3c-feasibility](P3c-feasibility.md)を借用し、製品全parserの時間は本書の単発値と分ける。未完成索引の実DB拒否と表示単体を組合せ、本体欠落UIを実施したとはしない |
| P3c-B | 個人/WSのtile/list、初期50→追加7と後続50→追加10、6sort全50IDのSQL順一致、同値ID順、URL hardopen/reload/back/forward、空/条件0、追加失敗保持→retry | raw HTML/CSSを親へ渡さない。現在認可PNG preview32×32を実表示。小data/SVG等は安全な媒体表示で、任意CSSのraster再現ではない |
| P3c-C | 東京＋cloud、title/body mark、tag/月保持、候補ArrowDown/Enter、Ctrl+K・trigger・chip、短語/0件、Escape/composition、旧query成功/失敗・旧scope成功拒否、通信失敗→retry | 実OS IMEは未確認。native検索期限の計算停止とbrowser通信faultを混同しない。Mac専用Meta+Kは実操作未実行で同handler/純粋根拠 |
| P3c-D | 実tags/note_tags、STRASSE/Straße・幅TAG・AND10、頻度順/同値cursor51、unknown/foreign0＋解除。通常fresh hardopenとSPAの双方を確認 | tag作成/付与は自己DB fixture。P3d UI未実装。foreign最初のredacted read失敗1件は原因未確定で保持 |
| P3c-E | NY March6対Tokyo5、DST/存在しない日pure、月0件、日初期3＋続きを50/5件、sort無効/復帰、URL zone優先、storage保存失敗・zone検出失敗回復、390px日別表示 | OS地域設定は変更していない。zone異常は自己browser Intl返値の合成faultで、終了時解除 |
| P3c-F | 現title/tag/creator/日時/private、原本390B HTML/605B PNGとneeds_ai、手書き元ファイルなし/Drive未提供、長文全文とprivate iframe heading refs、style保存、実HTML取込・本文更新・版復元→索引 | 画像は自身で確認。正本IDは書換えない。P4共有/export・P5Drive/LLMやP3d moveを成功扱いしない |
| P3c-G | 規定checks、最終670unit、全256Node＋最新関連18、production build/worker entries、通常再起動・同bundle UI、fresh/clone保全、明示84path commit、全自己操作停止 | 通常Chrome HTTP UAで標準非await RSC/Suspenseを維持。HeadlessChrome bot経路は未解消追加観察として独立側へ渡す。D01は未解決 |

## 実変更した先行25枝の対応

受入済み条件全体を再実装した表ではない。各IDの変更枝だけが今回の候補であり、列挙した無変更部分の根拠は旧受入を借用する。

| ID | 主な変更path/責務 | 今回の根拠と借用境界 |
| --- | --- | --- |
| P1-B | `application/note/saveNote.ts`・`commitNote.ts`、親一覧 | fresh WYS新規・画像だけstable・HTML保存/検索反映、親trash rollback。PM/バックアップ形式/無入力離脱の不変枝は旧根拠 |
| P1-C | `NoteContent.tsx`・詳細route | HTML保存/隔離preview、private見出し移動、800KiB製品projection試験。sanitizer/CSP方式は旧根拠 |
| P1-E | `Shell.tsx`・browse UI・`server.node.ts` | current scope/icon・390/1280・単一palette・RSC/loader、通常restart/drain、規定checks。認証UI方式は不変 |
| P2a-B | `import/acceptUpload.ts`・`processJob.ts` | fresh実HTML/PNG受付→原本→完了/needs_ai→詳細→検索。既存3抽出codecの全方式は無変更借用 |
| P2a-E | `import/processJob.ts` の結果確定前projection | 全Nodeのimport/job既存対、fresh実HTML結果。ticker/取消の既存物理契約は不変 |
| P2a-F | 同上の非同期準備後lease再照合 | 全Nodeの旧worker/claim対＋projection不一致/準備失敗。物理write所有は不変 |
| P2b-A | `NoteContent.tsx` の見出し補助 | actualiframe/document参照・元ID不変・PNG current画像、mobile Space。SVG/video/Range/認可の不変経路は借用 |
| P2b-C | `reference/processJob.ts` のcommit前projection | 全Node reference既存対、同Tx本文/index確定。safe-fetch/codec/同梱保持の規則は不変 |
| P2b-D | `commitNote.ts` のcontrol-only追従 | 実HTML原装飾→default保存・詳細reload、DB no-op/styleで再projectionなし。初回style判定方式は不変 |
| P2c-1-A | `commitNote.ts` のprepared source guard/同Tx派生書込 | 実DB save/noop/style/restore/不一致/例外、fresh版復元→正本/index一致。20件/pin規則は不変 |
| P2c-1-D | `note/history.ts` | trusted版3preview→確認→復元、marker検索1→0。全Node revision異常対。復元時media保持の不変規則は借用 |
| P2c-1-E | `saveNote.ts` の非同期準備前後 | 既存base/actor/ack guardを維持、実DB準備中失効と全revisions回帰。元V5/C3 host/4key方式自体は無変更 |
| P2c-1-F | migrations0018/19・共有保存・checks | clone旧43表/40charge差0・420一致/37既知、fresh再起動前後51表同値。旧D01は別管理 |
| P2d-1-A | `ScopedNotesBoard.tsx` の親trash | trusted確認取消・POST失敗rollback・実trash→undo、version以外の対象正本/revision/pin不変。期限/世代DB方式は不変 |
| P2d-1-D | 同親owner/ScopeUsageとUI | list移動後invalidate・追加read世代・currentrole、mobile/retry、同bundle。trash専用routeのloader bridgeは不変 |
| P2d-2-C | `browseSchema.ts`・0019 delete trigger | 実DB note削除とprojection/FTS cascade同Tx。purge受付/fence/物理回収・snapshot90日の不変枝は借用 |
| P2d-2-E | 0018/19と最終検証 | clone/freshの保全・全Node・型/build。今回はfresh物理purge試験を追加せず既存方式を変更しない |
| P2d-2-FD | `server.node.ts` shutdown前段 | search新規停止→active child close→backfill停止→既存writer drain→DB close。実runtime取消/stop/次正常＋fresh通常TERM exit0。FD300/driver/poolは不変借用 |
| P3a-A | `Shell.tsx` の現在scope+検索trigger | freshWS名/currenticon20×20、chooser/個人・WS切替と再訪。WS作成入力/slug/name/icon backendは不変 |
| P3a-B | `browseReadSnapshot.ts`・`ScopedNotesBoard.tsx` | scope/同時刻cursor・50page・6sort・旧応答・nonmember回復。現在policy同snapshot |
| P3a-C | 新親一覧のnew/import/undo導線 | fresh個人新規/媒体only/HTML原本とWS一覧リンク、6自己WS note。既存upload離脱guard/三mode方式は不変借用 |
| P3a-D | search/metadataの現在scope read | 実DB全role/creator可視属性、実editor→viewer→除名後古い一覧/candidate非表示。role変更UIはP3bの借用、自己fixture usecaseによる操作 |
| P3a-F | metadata/creatorとmigration/UI | creator label/unavailable/unknown型を混同しない実DB対、clone旧列・課算同値、最終checks。scopeCapacityは同SQL抽出のみで算式不変 |
| P3b-2-A | `Shell.tsx` のiconを含むheader表示 | freshcurrenticon20×20・1280/390可視。旧100字portrait CSSと画像安全化/競合の不変枝はP3b2-V1受入借用 |
| P3b-2-D | 同header/最終build | 同bundle screenshot・keyboard・overflow0。icon worker/claim/quota規則は変更せず旧根拠を保持 |

## 最終実UI・規定検査・保全

09:05以後、foreign tagは通常Chrome headerを明示した新規hardopenで0件＋利用不可chip、解除で60件、通常一覧から同URLへのSPAでも0件を確認した。最初のread失敗を製品修正で解消したとはしていない。設定保存が失敗してもURLのtileを保持する対、無効Intl zone→現在Tokyo保持→再検出回復も自己hookを解除して完了した。

09:01受付の新HTMLは390B、原本名`reading-import.html`、HTML/原本保存済み/Drive未提供を表示し、元装飾のiframe背景rgb(238,244,255)と親背景不変を確認。default styleを実保存後、HTMLにuniquemarkerを追記して保存→検索1件/mark→版3をtrusted確認復元→検索0件となった。09:12:03の`evidence/reading-check.json`はnote version4/projection version4、HTML/索引ともmarkerなし。6sortの初期50IDはすべてDBの対応order＋ID descと一致する。URL変更直後に旧DOMを採った最初のsort比較3件は、ready前を採取したfixtureであり、select値＋aria-busy=false後の結果を正式根拠にした。

390pxの長文TOCはsummaryと第二項へfocus→Spaceでiframe scrollY7224、第二章が可視、heading ID3つは空のまま、overflow0。`toc-mobile-final.png`を自身で画像確認した。元入力のhidden属性は既存sanitizerで除去されていたので、「隠れた見出し」という文字の項目を非表示成功とはしない。元ファイルなし/Drive未提供の同bundle表示も確認した。

別browserの新outsiderは個人0件の「まだ、白紙です。」を表示。ownerWSのquery＋calendar直URLは内容/名前/cardsを出さず汎用の読取失敗と個人への回復を表示し、通常リンクで個人0件へ戻った。RSCでredactedされた例外を専用notFound文言の成功とはしない。

未完索引は`browse.integration.test.ts`の実DB欠落→SEARCH_PREPARING、古いsource backfill拒否→現source復旧1件と、`BrowseError.test.ts`の準備中文言/0件非表示を根拠とする。fresh本体で索引を欠落させる実UI対は未実行。通常RSCのredacted errorは汎用再試行表示であり、専用準備文言を実画面で確認したとはしない。

09:14:18開始8.35秒の最新関連Nodeはbrowse14＋runtime4＝18成功。07:53の全256Nodeから後の製品変更はEscape/詳細fact表示とunit探索設定だけで、backend256の根拠を適用できる。09:18:35からの最終`pnpm typecheck && pnpm lint:fix && pnpm format && pnpm test:unit && pnpm build`は09:19:56以前にexit0。670unitの最終標準command成功を確認。今回の最後のtool出力はbuild中心に切られたため、この再実行のunit単独durationは未取得。08:48の23.22秒値を最後のdurationへ流用しない。既存warning/infoをunsafe fixで消していない。

production47534はcwd/freshDB照合、自己browserclose、通常TERM、draining/exit0/不存在を取得してからbuildした。新PID68891/session50638は09:19:56にHTTP200。通常restart後のhardopen/reload、title昇順とback/forward、WS6、currenticon20×20、calendar sort disabled、390px単一palette6候補/6mark/overflow0、Escape閉鎖を同bundleで確認した。`candidate-desktop.png`と`candidate-palette-mobile.png`を自身で画像確認した。Ctrl+K起動時のfocus復帰先は起動前要素、click triggerからのEscapeは元triggerへの復帰を別対で確認した。

最終fresh保全は09:18:08.817のonline `evidence/final-before.db`と、09:21:25.254の`final-after.db`。再起動/読取smoke前後の51表全列差0、実object4件/2,116B全bytes/SHA一致、5scope charge一致。内訳は個人1600B、ownerWS516B、他3scope0B。storage上の`.hollow-writer-owner`57BはPIDを含む運用lockであり、object課算/不変比較から除外した。全storageファイル5/2173Bと実object4/2116Bを混同しない。

現fresh DBは68notes/1asset/2originals/73revisions/0job snapshots/8tags/133relations/68projections、nonactive0・active writer0・conversion0・reference0・display pending0、FK0/integrityok。object_writes6は終了済み行数であってactive数ではない。新自己WS icon1/516Bを含む。今回のfresh物理削除は0、画像noteのsofttrash/undoは元状態へ復帰済み。新fresh全体が自己検証専用であり、旧環境の対象は操作していない。

旧632noteの移行保全は別cloneであり、freshの68件と混同しない。旧43表/40scope charge差0、420完全一致コピーと既知37不足の根拠は本書のclone節にある。旧main/DB/storage/mailbox/recovery/keyは再開後凍結し、新たな探索/復元/課算調整をしていない。旧tempの今回再hashは実施せず、受領manifest/事故報告を保持する。

## 固定候補と引継ぎ

- commit `01b55c9294eb2bf77d41c06f5db7a67fb0d5dcd6`。明示[84製品path](P3c-product-paths.txt)だけstageしcached集合一致後通常commit。管理/旧spec/DB/key/credential/tempを含まずpush/PR/公開なし。
- source 758files `d5b6c18b205c05652e24bdfe31e24aefaa56a551ead03b26c2b4f59f9ac9a5aa`。tracked＋untrackedから管理資料除外、statSyncによるAGENTS参照先込み、sorted path NUL bytes NUL。09:21:57のcommit前と09:23:25後で一致。製品diff/cachedとも空、hookによる製品変更なし。
- lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`。追加は固定`@js-temporal/polyfill@0.5.1`＋`jsbi@4.3.2`。libSQL/PM/画像codec依存は不変。Unicode16.0.0の生成入力/出所/SHAとUnicode-3.0 LICENSEを製品へ含めた。
- bundle `apps/web/dist/server/server.node.js`: `5ec816082846da47e69c3205dbe0df64ad2caaabe5d33f587ee89ac311d40d7e`。
- worker `searchSupervisor.mjs`: `3e0a5058b4ef0479a34dbe5e130a5bd073ec922b8c86c75f5195111aeb1117df`、`searchQuery.mjs`: `f2d66b8887ee1273d5396362adc6befd89a37998d1bc7f8bf76ee6d47050c275`、`noteProjection.mjs`: `55a3ab762a09b7b22abaf091dd1f8f1a3334942a1eb549929cd2714778694133`。
- fresh evidence `evidence/manifest.json`: 09:23:25.383、55files aggregate `c1f96d1081253438a2d422a9cde7ef201da95424f3fe478bf7f22bfc12e6e38d`。sorted relative path NUL bytes NUL、private/mailbox/DB/sidecar/auth helper/manifest自身は除外。全候補artifact file0600。失敗helperも保持するが認証helper全文は出力しない。
- production **session50638/PID68891**、Node22.22.3、cwd`apps/web`、127.0.0.1:3000、APP_URL`http://localhost:3000`。DB`file:/Users/hikaru/.local/share/hollow/verification/p3c-20260911-dyHGjx/app.db`、storage同root`objects`、local mailbox同root`mailbox`。
- `HOLLOW_INVITATION_KEY_FILE`は同root`private/invitation.key`、32B/currentuid/nosymlink/file0600。private directory0700。値/値hashは取得・出力しない。自己credential/sessionは同root`private/`、通常signin補助は`helpers/auth.cjs`が内部読取する。旧秘密値/旧helper認証の再利用なし。
- 最終使用browser `p3c-fresh-owner` / `p3c-fresh-outsider`はclose成功、先のeditorもclose済み。新helper各exec終了、一時hookは解除またはcontextclose、probe/inner wrapper/ssr:falseは製品にない。補助normalizer/UI/read-only各担当は既に全返却停止。productionだけ引継ぎ用に維持する。

独立ブラウザーは新しい専用sessionで`/signin`を開く。helperの許可session名は `^p3c-fresh-[a-z0-9-]+$`、roleは `owner` / `editor` / `outsider` だけで、範囲外は無出力exit2となる。例は `<Node22絶対path> <fresh-root>/helpers/auth.cjs p3c-fresh-verify-owner fill owner`。指定sessionの通常signin画面がhydrate済み・入力enabledの状態で使用し、固定出力 `credentials-filled` を確認して通常「サインイン」を操作する。editorのownerWS membershipは自己失効試験により現在存在しない。helper全文/資格情報/cookieを出力しない。通常Chrome HTTP UAの設定は`helpers/final-smoke.cjs`の非秘密headerと同じにする。生存productionの設定を変える必要はない。証拠DBを追加調査するときはコピーを作り、frozen recovery/旧mainへdriver接続しない。

2026-09-11 09:40:32 JSTの説明訂正：上記session名制限を追記した。`p3c-verify-owner` は許可条件に合わず、元の引渡し説明は不足していた。先のexit0は連結shell後続commandの結果でありauth成功ではないとの独立側訂正を受領した。文書のみを修正し、製品/helper/環境は無変更。元候補識別子と09:26時点の全自己操作停止の事実を保持する。

09:23:25以後は報告文書だけを編集した。最終clock確認は2026-09-11T09:26:51+09:00。この報告編集を最後に、文書を含む全自己操作を停止し、独立Verifierへ環境所有を返す。P3d/P3e/P4/P5は次の正式委譲まで実装しない。D01、bot-UA追加観察、foreign初回read不明、実OS IME/Meta専用入力・外部サービス未実行を、機能の成功で消さない。

以下は開始からの途中証跡であり、最終結果と対象sourceの適用は上記を正本とする。

## 新隔離環境での再開（2026-09-11 07:42 JST）

利用者承認により旧環境と復旧候補を凍結したまま再開した。旧37objects/13,222B未復元はD01として未解決であり、fresh検証やclone成功で復元済みとしない。

Verifierの限定再開照合は07:47:42.844、HEAD `47a030446152fe8de91ef8059072d4c3830f91d6`、758source `76a2480b32ac17f5ea1984f3759db1a640ff93d08a42eb3922dea6a9c0ad2071`、lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`。32既存変更＋51新規pathは主担当/返却済UI/normalizer所有と一致した。停止直前の未commit source hashは未取得なので、停止前bytes一致の証明ではない。

07:48:54.447に新しい `/Users/hikaru/.local/share/hollow/verification/p3c-20260911-dyHGjx` を排他作成した。現在uid・非symlink・dir0700/file0600、fresh `app.db`、`objects/`、`mailbox/`、`evidence/`、`private/` を分離。新招待keyは `private/invitation.key`、別32Bで値/hashは出力していない。新credentialは専用private fileへ保存し、旧資格情報は再利用しない。旧DB/storage/recovery/keyへのdriver接続・変更・再起動はしていない。

新DBは通常migratorで0019まで成功。port3000が空であることを確認し、07:53頃に同buildを `HOSTNAME=127.0.0.1` / `APP_URL=http://localhost:3000` で起動した。production session34890/PID13132、cwd `apps/web`、Node22.22.3。環境継承を限定し新DB/objects/mailbox/key pathだけを設定する。

fresh実UIは新ownerの通常signup→local確認→WYS新規保存→一覧→paletteの「東京 cloud」混合検索→ArrowDown/Enter詳細を確認した。後続の新自己fixtureはnormal save経路で個人/WS本文を作り、独立actorと明示tag/relationを用意した（64notes/8tags、P3dの作成UIではない）。seed初回は固定エラー境界で途中停止し、原因未確定のため成功と数えず、既に作成済みの自己IDを確認して不足分だけ別helperで完了した。

08:08時点で完全条件の `/notes?query=&tags=%5B%5D&zone=Asia%2FTokyo&layout=list&sort=title-asc` のhardopen/reloadは25秒を超えてSkeletonに残った。同じ認可cookieのHTTP200 responseには50件のSSR本文があり、実search childの直readも694.8msで成功。Reactの読取診断ではBoardは未mount、外側loaderData.notesがpendingだった。未完全URLからPreparation→client navigationとtrusted selectによるtitle-ascは57件表示へ進むため、単なるDB失敗/URL identity不一致とは分ける。`evidence/list-hardopen-before.png` を自身で画像確認した。

局所試行としてrenderNotesのasync rootを同期Suspenseで囲った。固定ライブラリのawaitLazyElementsがSuspenseで待機再帰を止める根拠による。規定checks/build成功後、既知13132のcwd/newDBを照合し通常TERM→draining/exit0、新session11336/PID31761で起動した。しかしouterからinnerへ症状が移り、本文が空のままで未解消。SSR50件本文とinitial script3本だけの観測を保持し、SSR後続Flightの根本原因を証明したとは扱わない。旧応答guardの削除・RSC promiseのawait化・依存更新はしていない。

08:20:49の実clock時点で分岐を限定した。自己候補routerの一時透過probeはdehydrate後のscript/html長さとRSC/end有無だけを数え、console errorは固定分類に置換した。既定HeadlessChrome UAは固定isbot5.1.40でbot=true、通常Chrome UAはfalse。同認可/同URL/同DB/同bundleでUA headerだけを通常Chromeへ変えると57件total・50件初期カードが表示され、late script28,576Bを含む4回のscript→html injectionとendが到着した。HeadlessChrome側はfinishedだけでinjection0/error0、HTTPにendなし。defaultStreamHandlerのbot allReady待機とtransformの完了済みfast pathへ局所化したが、bot経路を修正完了とはしない。

Manager承認により通常Chrome UAを以後の自己browser条件とする。ssr:false案は不採用、inner wrapperとrouter probeは除去し標準非await RSCを維持した。probe用console preloadも通常起動から除外した。probe buildを生存server停止より先に始めた一試行では旧serverが一時的なdist/rsc/index.js不存在を記録したため、この運用順の失敗を元hardopen不具合と混同しない。以後は既知PIDの通常停止・exitを確認してからbuild/startする。probe server37777の通常TERM/draining後、自己browserを閉じて残接続が終了しexit0を回収した。旧環境には触れていない。

再開時の全体型で新monitor callbackのboolean戻り値とWeb生成ambient ProcessEnv型が不整合だった。callbackをvoidにし、IPC-only childの空envをNodeJS.ProcessEnv境界で明示した（WebのAPP_URLをchildへ渡さない）。lintの新宣言分割/parameter局所変数/TOC内部keyを修正後、規定typecheck→lint:fix→format成功。既存warning/infoは成功と分け、無関係unsafe fixはしていない。unitは07:51:31から26.40秒、670/62files成功。Nodeは07:53:21から110.03秒、256/21files成功。production buildはsearch/projection worker entry込みで成功。

別の `migration-clone/` へ凍結済整合DBと420完全一致objects/29,363,126Bだけをexclusiveコピーした。fresh機能DBと別物で、37不足は明示したまま。07:58:13.741の `evidence/clone-check.json` は0018/19前後とbackfill後で旧43表全旧列差0・40scope charge差0・FK0。632note/32batchを109.38秒で投影し、元note/版/pin/課算を変更していない。source recoveryにはdriverを接続していない。

9/11 00:47 の旧 storage 不存在検出後、本体移行 / build / UI 検証を中断した。詳細は [保全障害](P3c-storage-incident.md)。旧 production は通常停止済み。機能面では修正後の直列 Node 256 tests / 21 files が 00:46:06 開始・107.22 秒で成功し、UI 補助は 45 pure/static / 対象型 / Biome 成功で返却済み。全体規定 checks と同 bundle UI、candidate commit は未完了であり、保全障害を機能の成功へ読み替えない。

## fresh 実 UI の追加根拠（継続中）

08:33:14までの通常Chrome HTTP UA条件では、標準RSCの完全URL hardopen/reload、title昇降順、back/forwardが成立した。57は一覧totalまたはsentinel後のunique ID数であり、初期pageは50 unique、次page7、合計57で重複0。sentinelの自動追加により手動buttonの位置が変わった試行は、手動click成功に数えない。

タグは現在の実relationからSTRASSE→Straße19件、tag→ＴＡＧ29件、Spaceで両方を選択しAND10件。タグ作成はfixture SQLでありP3dの管理UIではない。日本語＋英数字「東京 cloud」のpalette候補10件、title/body mark、一覧適用後もタグ2件保持、関連度、すべて解除後の通常title-asc復帰を実操作した。Escapeはinput[type=search]のnative clearに先取りされ閉じない事象を確認し、composition以外のEscapeをinputでpreventDefault/stopPropagationしてcloseする局所修正を追加した。修正後の実操作は後続へ記録する。

カレンダー2026-09の50件は日11の初期3＋残47を展開し50件。2024-03 America/New_Yorkは6件（日10に5、日31に1）、実タイムゾーン変更Asia/Tokyoで5件。390pxの日別縦一覧、overflow0、日10の追加2を展開して5件を確認した。native monthのArrowDownは年fieldを2026→2025へ変更し0件となった。月を8月へ変える期待を置いたhelperはfixture誤りで、元のtimeoutを成功に数えない。

長い本文の新自己noteは通常save経路から作成した。本文見出しbuttonのpointerでiframeのscrollY4229へ移動し第二章が可視、heading IDはすべて空のまま。390pxで固定reading-barに覆われた最初のpointer試行は未到達として保持し、1280pxと通常scroll後の操作を成功根拠にした。sanitizerがhidden属性を除去したcanonicalには3見出しが実在するため、元入力のhiddenを維持したとの主張はしない。

新PNG原本は実ImportUploadから受付→自動detail遷移、needs_aiと原本保存の事実を確認。別の新規WYSでは実PNG upload→画像だけのstable保存、後からtitle保存、現在asset32×32の詳細iframe表示、query previewのtile画像表示が成立した。thumbnailは現在認可されたnote asset URLだけで、`evidence/thumbnail.png`を自身で確認した。手書きnoteの原本なし/Drive未提供も共通表示へ修正中。新機能Driveの成功ではない。

08:42:51時点で新production38846/session56976をcwd/freshDB照合後、自己browserclose→通常TERM→draining/exit0で停止した。Escapeと共通backup事実表示を含む規定checks/unit/buildを開始。旧環境へ触れていない。途中header再設定前のhardopenで再びSkeletonを観測し、通常Chrome HTTP UAを再設定したreloadで1件tileが成立したため、header設定の維持も自己browser条件に含める。未修正bot分岐の解消とはしない。

### fresh の現在認可・遅い read・失敗復旧

08:46:35の実clock報告時点の最終UI bundleはproduction91861/PID47534。非空入力のtrusted Escapeでdialog0/元triggerfocus、合成composition中Escapeではdialog1/文字保持、composition終了後のtrusted Escapeで閉じた。Control+Kも単一dialog/combobox focus。小文字キー表記のCLI試行は未到達と分け、OSの実IME入力は未確認。

新editorが通常signinしてWS6件/削除6を表示した。通常membership usecaseでviewerへ変更後、古い一覧のdeleteは現在intent readが拒否し実行disabled、取消→reloadは6件/閲覧のみ/削除0。viewerから除名後、古い一覧のpalette readは現在scope拒否となり、本文・候補を表示せず再試行/個人への導線へ移った。新自己actor/WSだけを操作し、旧環境/旧membershipは無操作。

`helpers/read-race.cjs` は自己pageのbrowseNotesFn responseだけを取得後holdし、通常の新queryを先に完了させた。旧成功/旧failureを解放してもzzzznomatchの0件・alert0を保持。scope対は旧personal read hold→Escape→現在chooserからWSへ移動→旧成功解放後もWS6件/query空/dialog0。chooser候補の非同期待機が足りなかったbatchは未到達として保持し、現在buttonがreadyになった後のtrusted選択で境界を確認した。hookは各成功末尾または次の自己navigationで解除し、製品へ追加していない。

`helpers/read-fault.cjs` は自己ブラウザーの当該readだけに通信失敗を注入。paletteは候補0の再試行案内→trusted再試行で50候補/alert0。追加pageは50件を保持して失敗案内→再試行で60unique/alert0。実native計算の3秒停止は製品runtime試験、ここはUI通信異常の対であり両者を混同しない。

`helpers/trash-ui.cjs` は新自己画像noteだけを対象とした。確認取消で1件保持、trash POST前の自己通信失敗でoptimistic rollback1件、hook除去後の実trashで条件0件、直後undoで1件へ復帰。`reading-state-before/after.json`は当該noteの差がversionだけ、revision/pin全列同値・HTML SHA同値。soft trash/restoreであり物理削除は行っていない。

foreign選択tagのUI試行では一度redacted system read失敗と再試行未完了を観測した。新freshへの製品snapshotは0件/wire正常、同条件の製品childは226.99ms/0件。通常Chrome HTTP header再設定後のreloadで0件＋「利用できないタグ」＋解除導線が成立。最初の失敗をforeign名漏洩や成功へ置き換えず、原因未確定のread失敗として保持する。

### 標準 unit 探索の管理資料分離

08:43:04開始の `pnpm test:unit` は製品62files/670tests成功だが、過去独立資料 `.goal-implement/reviews/P2c-1-extra.test.ts` / `P2d-1-independent.test.ts` のpackage解決で2suite失敗し全体exit1。資料は製品manifest外の独立検証資材であり、削除/編集していない。`pnpm exec vitest run --exclude '.goal-implement/**'` は08:43:36開始18.69秒で同じ製品62/670成功。これは標準command成功とは分ける。

Manager採用後、git差分なしだったroot `vitest.config.ts` の既存excludeに `.goal-implement/**` 1行だけ追加した。製品test/integrationの除外は増やしていない。規定typecheck→lint:fix→format後、標準 `pnpm test:unit` は08:48:17開始23.22秒で62files/670tests成功・exit0。既存27warnings/34infosは不変。直前production buildはEscapeとbackup共通表示を含む、設定1行だけはtest探索の変更でruntime bundleには影響しない。

## 開始と資格情報の封じ込め

2026-09-10 23:31 JST開始。受入HEAD `47a030446152fe8de91ef8059072d4c3830f91d6`、707 source `e4745b28f902a0442cb000727d7f85df202cdee3d562d8222aba973c64d7971a`、lock `7789972514666bf5fbc61f775887a43b0c71678cd854f9758459cf9aa385b3bf`、bundle `3d48f4d38caf9f21a98e4bb60a9ca48f9d9cc991206959a52c40879fdbd6bee1`を照合した。productionは受領PID1053/session26078、Node22.22.3、cwd/DB同一。

正式事故報告の既知2自己accountだけについて、ID・email・自己WS所属・作成日時を照合した。23:32:04.906の `/tmp/hollow-search.GCbXvL/pre-containment.db` を取得後、Managerの許可に従い23:33:57.782に対象限定transactionでpassword_hash2行と対象sessionsだけ変更した。旧session4件を失効し、旧資格情報は通常signInで両方拒否、新資格情報は同じaccount IDで成功。確認用sessionも削除し対象sessionは0。値・hash・構成式・認証コード全文は出力していない。

新乱数値の保管先は `/Users/hikaru/.local/share/hollow/test-credentials/p3c-containment-20260910.json`。専用directory0700/file0600・現在owner・非symlink・排他作成。正式招待keyは変更していない。既存tool出力を削除したとは主張せず、旧helper/証跡/backupは保持する。指定2account以外への資格情報共有は不明であり探索していない。この安全処理はP3c機能合格と別である。

23:35:39.905に封じ込め後の新baseline `/tmp/hollow-search.GCbXvL/baseline.db` とJSONを取得。23:35:41.066の比較で旧43表全列の差は許可したpassword_hash2件・対象session4件だけ。他account・relations・旧auth throttleは不変。457objects/29,376,348Bの全inventoryを保持。632notes/69assets/999revisions/123snapshots/nonactive11を基準とする。

## 読取実行の先行成立確認

新synthetic DBと自己childだけを使う。製品のwrite UoW、FD方式、現DBには接続していない。

- Node22.22.3/native libSQL0.18.0のWorker内public `transaction('read')` は通常読取・closeが成立したが、mode単独ではINSERTを拒否しなかった。finally rollbackでsentinelは維持。この失敗をreadonly成功に数えない。
- Manager採用後、同じ専用Transactionに `tx.execute('PRAGMA query_only=ON')` を発行し、同connectionのINSERT拒否と固定SELECTを確認した。専用client/transactionはfinally close、通常write側と共有しない。filesystem全書込不能の保証ではない。
- 長いnative SQL中、監視child mainのtimerから自己SIGKILL、親ChildProcess close、次の正常読取が成立した。HTTP役mainの同期処理とは独立した停止を検証する。
- 明示 `child.disconnect()` の自己fixtureでは子のdisconnect→SIGKILL/exit/ESRCHは成立したが親closeが発火しなかった。30秒fixture watchdogの失敗資料を保持。Node内部修理やexitへの読み替えは行わない。製品は生存親からdisconnectせず、取消/停止は所有ChildProcess.kill→closeとする。close未知ならslotを保持し新規実行を拒否する。
- 実自己親process終了の対でparent12978 close、child12979の不存在を56msで観測。元親が死亡しているため元親のChildProcess closeは観測できない。孫processは作らず、query Workerは同child内にある。

最終runtime集計・本体接続・全条件の結果は後続で追記する。原失敗fixture、旧固定資材、旧backupは保持する。

## 途中接続根拠（2026-09-11 00:36 JST）

主担当はcore/query/runtime/詳細を所有し、UI補助p4_contractは専用一覧/palette/routes/stylesだけを所有する。補助のnormalizer8pathは00:02:12返却済み、54pure/型/Biome/固定生成物再生成一致を借用した。Node側起動wiringでUnicode16版を照合し、表示名validationをpure normalizerへ戻していない。現在UI補助の対象へ全体formatは実行していない。

0018/0019は派生projection、実tag/relation、contentless FTS5と同期triggerを追加する。保存/初回import/変換完了/reference本文更新/履歴復元はUoW外で完全sourceを投影し、最終同UoWでsource文字列/意味版と現在認可・既存保存/lease条件を照合して本文と索引を同時に確定する。no-op/style/control-onlyは本文再投影せず、本文/title同値のnotes.version変更だけprojection versionを同Txで追従する。全pin/20版数/物理claim/FD方式は変更しない。scopeCapacityQueryは既存算式そのものを共通SQLへ抽出し、read transactionから同じ算式を実行する。

00:21:39.489 `/tmp/hollow-search.GCbXvL/connect.json` は、新baselineを複製したcloneで0018/0019を適用した結果。旧43表の全旧列差0、40scope charge差0、FK0。632noteを20件keysetの32batchで73.7秒で投影しmissing0。backfillは読み出したsource/versionが最終UoWでも同じ場合のみ採用する。旧原文/作者/日時/版/pinを検索都合で正規化していない。旧mainはこの時点では未移行。

同cloneの製品query child/Workerは50項目/19,581B/494.7msで成功。全解析とworker終了を含むprojection単発値は、小本文24B85ms、819,200B1665ms/DTO4,096,344B、3000段落48KB128ms、NFKC展開600KB1277ms/DTO9,322,644B。これらは単発自己測定であり、全入力/端末のSLOやheap保証ではない。本文の最大byte境界とDTO増幅を別に報告する。

00:32:19.111 `/tmp/hollow-search.GCbXvL/runtime-product.json` は製品NodeSearchExecution/監視entryを使った自己対。通常50項目3回205〜262ms、native長SQL＋有限待機/18件目拒否は2906msで全未成功へ収束。取消→stop105ms、stop後の新要求拒否、次の正常209ms。queryの私的session参照をargv/logへ出さず、専用childのclose後だけslot/結果を確定する。長SQLのquery Workerだけは自己fixtureであり、製品APIへ任意SQLを追加していない。

追加実DB14対はexact前LIMIT、同時刻/関連度の更新日時tie、展開した合法titleのkeyset、タグAND/頻度tie/不明/現scope、DST月初期3＋続き、session失効、trash、派生削除、save/no-op/style/restore、projection不一致、準備中失効、backfill旧source拒否、Unicode元文字highlightを確認した。通常queryの500ms程度の起動/終了と、意図的な長SQLの停止を合算しない。

途中の失敗は別記する。clone helperの同URLtransaction中client呼出が未解決のままprocess終了した試行、scopeCapacityという誤ったfixture port名、creator_account_idという誤ったfixture列名、Node22にはあるがtsconfig libにないtoReversedの型誤りを修正した。既存C1の直接commit自己fixtureはprojectionを渡さず新guardに拒否されたためUoW外準備を追加、rollback試験は意図したinjected地点への到達も確認する。800KiB超の早期throwのPromise assertionを整合した。旧mode/正本guardを緩和して期待に合わせていない。完了した自己execとruntime.stopを確認し旧本体へ残処理を持ち込んでいない。
