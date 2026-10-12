# P5c-1 残3群の独立検証

2026-10-01。限定検証終了・残3群未完。candidate `fd4a2476a60a3ad4db3da2ac92235b0334e7e895`（docs 専用、code/bundle `4b3995711c94957454cfbaf6863b6e9695abfb4a`）。唯一 runtime owner は本 Verifier、全自己 runtime 終了後に Manager へ返却。

## 起動前の固定

[採用計画](../phases/P5c-1-resume-plan.md)と[主準備報告](../phases/P5c-1-resume.md)を全文 EOF まで読了。主報告 91 行・12,923 B、SHA256 `1b9d6ccec65515e359354678fd5cb69cb589c1f47431c981b355b8150833d606` 一致。参照元 S5b3 §§2–4,6 と独立次段案、plan A–F/P5c-2-E へ照合した。

root `/Users/hikaru/.local/share/hollow/verification/p5c1-resume-20261001-xr3SIH` は 0700/nosymlink。主報告末尾 21 公開 helper は全て regular/nosymlink/bytes/fullSHA 一致。実行に必要な 17 file を自身全文読了し、追加工具 wrapper `composed-run.cjs` も全文読了。主 pure 専用 3 file は使用しない。旧 private/DB/key/cache/results、stale inventory は読んでいない。

主の 89＋7＝96 確認は借用、再演 0。現 route/DTO・15 execution port・正規 transport、限定 error bridge、proxy/外部拒否、3群操作、有限 output と停止保全を静的確認した。computer-use skill は読了したが個人 desktop 操作は使わず、明示許可された自己 Playwright/fresh profile に限定する。

### 工具の限定補正

`ui-resume.cjs` の framenavigated 回数が current DTO の必須世代にも使われていた。Manager 許可により、回数は観察だけとし、取得時/採用時の same-origin と `performance.timeOrigin` で実 document を束縛した。capture 中に遷移した観測は捨て、同 document の counter 増加だけでは本人不一致としない。操作 ticket は現在 DTO 確定後に採り、path/query/hash/full URL・一意可視 enabled button を照合する。検索条件が空であることは要求しない。

`transport-scope.cjs` の実 composed 関数へ追加の純 8 組を通した。同 document/counter 増と有効 query を許可、置換 document/foreign/別 actor/authVersion/epoch/欠測 capture と不正 button を拒否した。CJS 一式 17 構文成功。主 96 とは別の直接根拠で、UI の成功ではない。子 exit0、signalなし、両 pipe end/close、PID 不在、deadline/overflow 0、stdout60 B/stderr0。DB/HTTP/browser0。新結果 label `independent-document-end.json`、旧成功結果の上書き/削除0。

### 前指紋と操作列

公開 5 指紋を独立計算し、Retarget 正式値へ完全一致。source 1292/18,220,734 B、dist 9116/223,796,694 B、tools 179/18,550,212 B、fixed 91/7,675,683 B、entry 5/4,103,446 B。値は [Retarget 独立報告](P5c-2-retarget.md:126) と同じ。主限定 class/entry 照合を全 seal 成功へ読み替えていない。

唯一試行の列は init→新空正式0041 migrate→run→正常停止条件成立後だけ opaque/audit 各1→seal。run は通常自己 account/auth→初回 link/normal folder setup→folder付き failed relink 旧保持→同sub成功新epoch/folderなし/OFF→create unknown/純GET/inspect404/明示同ID resend/confirm→実pagehide/fullnav/Back/現在GET/明示再issue取消。BFCache は実 pageshow.persisted=true だけを合格とする。note/WS/original/backup/LLM0 なので実 backup cancel UI を偽装しない。

資源は root192 MiB、logical3 DB32 MiB（16/8/8）、helper8/NodeTMP8/Chrome128 MiB、material256 KiB/新鍵128 B/RSA2048 memory1/account1。app/provider/proxy/Chrome/context/page/boot/probe各1。attempt3/control≤12/issue≤3/selection1/create ID1/sends2/inspect1/confirm各1/cancel≤2。provider24/6 MiB逐次1、Hollow1500/48 MiB、background deny150/1 MiB、外部0。prep60/UI180/stop40/外側285秒。予備の追加boot/POSTretry転用0。正常drain不成立なら保全guardを緩めずManagerへ返す。

## 唯一 UI1 の直接結果

init 成功（新鍵128 B）、新空0041 migrate 成功。migration 子は exit/close0、signal/error/deadline/overflowなし、両pipe end/close、PID不在。唯一 boot は `NORMAL_ACCOUNT_SETUP`（4426 ms）までで停止した。state step は `PREPARE`、保存エラー分類は `OTHER,CAPACITY`。signin/Drive UIは未到達。scenarioPassed/allThreePassed=false。診断の buttons3/alerts0/regions0/stable=true は成功代用としない。

Hollow47要求（準備4＋app listener43）/入力27,903 B/出力647,377 B、背景拒否13要求/2637 B、外部0。準備の bootstrap/signup/verify/signout 各1・200、signedOut=true。browser serverFn POST/GET各0、Drive provider要求/exchange/auth/create各0、RSA pair1。正常accountの前提作成は通ったが、正規signinや対象業務の成功を意味しない。generation2とtimeOriginは保存されているが、未到達のactor/epoch/scope判定を補完しない。

### 容量分類停止と限定修正

後続の metadata-only 診断で旧 `C.measure` は `CAPACITY_ORIGINAL` を返した。元UIの原例外は保存されていないため、元の有限分類をこの後続codeで上書きしない。新root `ui/storage` の全regularは2件139 Bのみで、公開固定path `.hollow-writer-owner` 57 B と `.llm-runtime/owner.json` 82 B。ほかfile/byte/link/special各0、子directory1。内容読取0。

公開根拠は `coordinatedObjectStorage.ts:51–68` のstorage起動所有記録と `llm/config.ts:42–44` / `llm/runtimeOwnership.ts:115` のLLM起動所有記録。`server.node.ts:269–275` は共通storage directoryを渡す。`FileObjectStorage.file` の原本keyは先頭dotを許さず、これらは利用者原本ではない。旧工具はstorage配下全てをoriginal0へ分類していた。

Manager承認後、`ui-common.cjs` のこのexact2 pathが regular/nosymlink の場合だけ既予約helper8 MiBへ分類した。非regularは拒否、それ以外のstorageはoriginal0、未知link/special拒否と総予算は維持。追加純3組は実 `measure` をmetadata-only仮想FSへ通し、exact2正例、未知storage拒否、exactpathのlink/special/directory拒否を確認。変更2 CJS構文成功、子exit/close0、両pipe end/close・PID不在、stdout65 B/stderr0、deadlineなし。新結果 `independent-capacity-end.json`。既主96/独立8再演0、DB/HTTP0、予算増0、追加boot/POST0。元UI1失敗は不変更で保持した。

## 終端・保全・同bundle

通常停止の直接証拠は app PID68569 の exit/close0・signal/errorなし・両pipe end/close（stdout15 B/stderr0）、`ui-runtime-end` drained=true、現在PIDのESRCH。Chrome exit0/groupAbsent=true・全4pipe終了・browserClosed=true、probe1のcontrolClosed=true。proxy/provider closed、proxy/upstream/provider socket0、provider active0/failures空。listener accepted43/closed43/socket0。外側UI wrapperはscenario失敗によるexit1を保持し、exit/close・両pipe end/close・PID不在、deadline/overflowなし。資源終了の成功とUI業務成功を混同しない。

全known writer実終了後に通常opaque→auditを各1回だけ実施した。active/opaqueをdriver openせず、auditのみquery_only。preserve passed=true、audit preservationPassed=true/closed=true/activeOpaqueUnchanged=true。audit全体passed=false（UI未到達による `AUDIT_PARTIAL`）、wrapper exit1、両pipe end/close・PID不在。全3基体各2,084,864 B、元active/opaque不変更。監査ledger42/FK0、account1/verified1、notes/originals/WS/jobs/records/transfers/attempts/completedAttempts/failedAttempts/controls/held/live/pins/writes/created/linkedCreated各0。

監査直後DB計6,287,360 B（監査sidecarを含む）、最終metadata計はDB6,254,592 B/helper1,681,090 B/material230 B、original/package/NodeTMP/ChromeTMP/special各0、既知dist link1。予約3DB/32 MiBおよびroot192 MiB内。新鍵128 Bはmaterialに含む。自己原本内容・秘密・DB hash・raw body/stack出力0、既失敗結果の削除/上書き0。

後sealは前の公開5指紋と完全一致。source `7d7d8cd78e3003288ac7335741b85fab843a9ad993981beeed7cd8906086d04a`、dist `4f1bc6cf7df2198c4628fbdfd898b42f4707f0cd054594b1c22606f841ed40c6`、tools `dc520408fcfe3e1951e46ca6a2a03d31d24b554ee21abe1249c094356fad3cc5`、fixed `8bc76f2114f685497bb0185b16eb75b75d4adb9542d77b1a052bfce808b91832`、entry `11f388bad8615266f285a358a8b0140b4f7a4344b7a180df73d63117ff2b9fda`。製品/DDL/dist/lock不変更。実接続/actualfresh/実Google適合は未検証。

## ID別限定判定

| ID | 借用と今回直接根拠 | 未完 |
| --- | --- | --- |
| P5c-1-A | 既callback/receipt/current GET/本人束縛は採用計画の既根拠を借用。今回は前提accountだけ | folder付きfailed relink旧保持、同sub成功新epoch |
| P5c-1-B | 既trash/missing案内・無断作成0・normal選択ACK回復/確認/保存を借用 | 群2の現在sub/metadata/parent再確認 |
| P5c-1-C | 既selection純GET回復・局所永続ID/閉鎖対を借用 | create unknown→同ID GET404→明示同ID再送→確認 |
| P5c-1-D | 既解除completed/current GET/未連携/reload/OFFを借用 | relink失敗旧保持/成功置換。note0なので実backup cancel UIは未検証のまま |
| P5c-1-E | 既settings/picker/dirty/current/ABA/nonce/390px/keyboardを借用。独立document純8は工具根拠だけ | 群1/2表示、実pagehide/fullnav/Back。pageshow.persisted欠測でBFCache未検証 |
| P5c-1-F | 新空0041/同bundle/正常drain/opaque-auditを直接追加。主96純は借用、独立8＋分類3は直接 | 残3群の現候補UI結果。F全体doneへ読み替えない |
| P5c-2-E | 既core fence/abort/unknown等は既報告の借用範囲を保持 | folder付き再連携の失敗/成功UI。今回の工具容量停止を新製品欠陥・E追加条件へ拡張しない |

次手はManagerが別途許可する場合だけ、下記最新helper必要分を新rootへ適応した1試行。現rootの再boot/再POST/追加DBは行わない。既96/8/3成功の再演・新汎用gateは不要。失敗DB/結果は現rootに保持。

## 最新公開 helper exact24

同root直下、全24 regular/nosymlink、計146,176 B。表は最終修正版で、stale `public-helper-inventory.json` ではない。主21は当初metadata/bytes/fullSHA照合し、実行に必要な17を自身全文EOF読了、composed-runも読了。追加3は自身作成全文、変更3（transport-scope/ui-resume/ui-common）も自身読解済。bridge-pure/composed-pure/prepare-runは未実行で全文読解の借用対象外。後続再利用は必要分の同一性照合とManagerの範囲許可に従う。private/material/DB/results/cacheは表に含めない。

| basename | bytes | SHA256 |
| --- | ---: | --- |
| bridge-pure.mts | 4560 | 6d1a6b5538f204186219c11055b53afce8fea519eccd0239b24e18853b5806e7 |
| composed-pure.mts | 5383 | e06e0957c86c794e7ba94e8bbe937d236c4e7f1fb4f1cd06ce55480b23727231 |
| composed-run.cjs | 3777 | f1b7520a184ecac697062e97690730adc440ed9b74c9032af9fbf71c18fd43c8 |
| diagnostic.cjs | 1079 | c2bfde56946572839ee644245cc0c4402db3959c6a78e37b06a533d52e3ee53a |
| error-bridge.mts | 2335 | 78e1ddf60795b602d64f7dabe6684ad6746965723160756b22a1c58f00e2f682 |
| identity.cjs | 1779 | 795bee3ea4ac862233a147b65bcb0bad2a179db4e48696294bfeeead0fade7c0 |
| ids.cjs | 2490 | aa46ea94ff3861851044bc059e94676292fe94e4e3d458f58b146405885c0e02 |
| independent-capacity-pure.cjs | 2037 | 95968b10d480fa6e679e3dc3688cc757fd55ec32ba0283be5af5e6ef9fec1d63 |
| independent-document-pure.cjs | 2458 | 0b09a66bd12ae6f88f1a26d4b409720347086664085cd96d0c2b353bccd56505 |
| independent-document-run.cjs | 2768 | 6a079316969800cc1b2ebb00321b33a57d9504497c6aea1227cd0456f2307eaa |
| prepare-run.cjs | 4378 | 8c4d70e706dd4ba03406a691b58670c8149e310ece1e614292f4a326c9616e91 |
| prepare.cjs | 5685 | 24d7fd7dfbb8dd371205cb0adc912d293cc68d7553192a27e20f8e7433838ea3 |
| preserve.cjs | 2044 | 62de7b2d57d2b6a5b9a3a52d9db0926cd79f9074e21bfe3ef4d26ee56cda9aa9 |
| protocol.cjs | 3279 | 388c4e9b76810f857cc6997fccd4fce07282f0ea8e5d54365dcd47d57279b554 |
| provider.cjs | 20383 | 934bf8acd12a78e12c0f4e159f2a59a37ed1df55a4e90b0811c06cfd04938ea4 |
| run-ui.cjs | 5294 | a415c974ecb4540634a394893cb9fb4a1e607ec9f9b5c1a7ac645fd4ba490055 |
| sdk.cjs | 2260 | 31798de0685f3228b523b8b1e0556462a03829581a34bf502c9be781ec142498 |
| serializer.cjs | 12108 | ae1b9426803f5384d41bddc1b21e44e5c3e5c9672cbbf6a1251838723a1a9f6c |
| transport-scope.cjs | 2072 | 35afb36adb2587c9fc558d11887e7a0f0149f61df50c3f0098c23688aba6cdfb |
| ui-audit.cjs | 5357 | 9596543e4365769a1c41ce94cf8c3e27cdc032c685a3bcafa43081b00a3c7bad |
| ui-boot.mts | 9887 | 345903855c9702d9603fb373cc5e1e6298a49b1f1e72a1b56930efe05f73e786 |
| ui-common.cjs | 8133 | 40a8d4a1d2435a60ad069b6bffe5b916de57e22fdccee48d6c8cd59e42a94b0a |
| ui-resume.cjs | 35071 | 29dac02a960ce3d8f7cc492220881fcb5e84ab9c4ab841617f66a4b18b847547 |
| worker-observe.cjs | 1559 | e22b785d32388080a1a79dea1bcaf590ab0021bae6ffbe4a55e13e81b2f4e430 |

## UI2 独立差分（新root・1 boot）

Manager別許可により `/Users/hikaru/.local/share/hollow/verification/p5c1-resume-ui2-20261001-n7yO50` を新排他0700で作成。上表exact24のうち下記17 file/120,815 Bのみを旧公開sourceのregular/nosymlink/bytes/fullSHA照合後apply_patchで同一内容適応した。自身全文既読の同一sourceで再読不要、全root参照は `__dirname` のため内容変更0。新rootの17 fileは上表と同じbytes/SHAで、旧private/DB/key/results/cache読取・旧場所実行0。

`run-ui.cjs`, `ui-resume.cjs`, `ui-common.cjs`, `ui-audit.cjs`, `ui-boot.mts`, `error-bridge.mts`, `prepare.cjs`, `preserve.cjs`, `provider.cjs`, `serializer.cjs`, `sdk.cjs`, `protocol.cjs`, `identity.cjs`, `transport-scope.cjs`, `ids.cjs`, `diagnostic.cjs`, `worker-observe.cjs`。

新rootは同じ192 MiB/3 DB32 MiB、helper8/NodeTMP8/Chrome128 MiB/material256 KiB/新鍵128 B、RSA memory1、account1/note・WS・原本等0。新Hollow1500要求48 MiB/背景150要求1 MiB/provider24要求6 MiBの上限を保持。系列予約はroot384 MiB/6 DB64 MiB/app2Chrome2、HollowはUI1実47＋UI2上限1500＝1547要求（3047の誤記はManager訂正済）/96 MiB、背景163要求2 MiB/provider24要求6 MiB。残枠転用0。

新構文14成功、init成功、前5指紋は上記正式値に一致。新空0041 migrate成功（child exit/close0・全pipe・PID不在、stdout55 B、signal/error/overflow/deadlineなし）。既主96/独立8/分類3再演0、新native/build0。唯一bootの操作列・認証/endpoint/version/明示確認の制約と285秒枠は不変更。

### 到達と未到達

直接checkpointは `NORMAL_ACCOUNT_SETUP` 15,483 ms、`SIGNIN_TRANSPORT` 23,190 ms。明示bootstrapとsigninの正規same-origin fetchはstatus200・responseMatched=true、origin/path/query/URL/document/input一致。SIGNIN observerもsame-document、`SIGNIN_CURRENT` passed=true。観測SIGNIN1、BOOTSTRAP3（追加正常bootstrapは観察だけで業務gateにしない）。Settings到着後のGET SETTINGS1はDTO_DOCUMENTのcaptured/origin/timeOrigin/matched各true。

続く `FRESH_ACTIVITY` が165回の条件読取後passed=falseとなり停止した。これはserverFn GET165回ではなく有限待機内の判定回数。ACTIVITY観測0、readCount1。state step PREPARE、errorsはFRESH_ACTIVITYだけ。read-only診断buttons5/alerts0/regions1/stable=true。scenarioPassed/allThreePassed=false、relink/同ID create/pagehide・Backの3群は全て未到達。今回のactor/epoch判定compound個別boolは保存されていないので捏造しない。

Hollow114要求（準備4＋listener110）/入力77,699 B/出力1,310,102 B、背景25要求/5072 B、外部0。provider要求/exchange/auth/create全0、対象業務POST0、RSA1。UI1＋UI2の実累計はHollow161要求/入力105,602 B/出力1,957,479 B、背景38要求/7709 B、provider0。許可内で、後続未実施分をretryへ転用していない。

### 最小静的切分けと次手案

`routes/settings.drive.tsx:8–12` の正規beforeLoadはcurrentUserFn、`DriveSettings.tsx:74` のreadOnceはdriveSettingsFn。ACTIVITYを発行するDriveBackupActivityProviderは `routes/notes.tsx:22–25` の配下で、Settings画面では発行されない。新helper `ui-resume.cjs:47` はSettingsへ移動したあと `current('ACTIVITY')` を必須としていた。notes由来の観測条件をSettingsへ流用した工具不整合であり、製品の認可違反/Drive機能欠陥とは判定しない。

SettingsのGETは `driveServerFn.ts:25–33` → `getDriveSettings` → `readDriveActor`。後者は現在session期限・browser hash/epoch・verified accountを検証し、Settings DTOはactorのaccountId/authVersion/browserEpochを返す。既helper observerはSETTINGSもsame-document照合後 `acceptDocumentReceipt(auth, ...)` に渡し、`identity.accept` はexpected account/authVersionとbrowserEpochのpin/不一致拒否を行う。既 `authority()` はauth.readyと現在Settings actorの一致を要求する。

必要最小案はsignin終端のACTIVITY限定待機を現在SETTINGS本人＋auth.readyへ置き換え、同待機で有限のcurrentDocument/actor/authVersion/epochPinned/epochMatched/receiptCurrentを記録して既authorityへ進むこと。Settings正規GETをそのまま使い、追加read/POSTやnotes遷移は不要。foreign/置換document/別actor/authVersion/epochの拒否と操作ticketを維持し、新業務gateは追加しない。この案は静的返却のみで、UI2終了時helper変更・追加boot/POST0。今回Settings受信を未実行業務の成功根拠へ振替しない。

### UI2 終端と保全

app PID88411はexit/close0・signal/errorなし・両pipe end/close（stdout15 B/stderr0）、runtime drained=true。Chrome exit0/browserClosed/groupAbsent・全4pipe=true、controlClosed=true。proxy/provider closed、各sockets/active0、provider failures空。listener accepted110/closed110/socket0。外wrapperはscenario未達でexit1、exit/close・全pipe・PID不在、deadline/overflowなし。容量は全時点原本0でUI1分類失敗は再発していない。

許可された通常opaque→auditを各1回、active/opaque driver open0、audit query_only。preserve passed=true。audit preservationPassed=true/closed=true/activeOpaqueUnchanged=true、全体passed=falseのAUDIT_PARTIALを保持。ledger42/FK0、account1/verified1、notes/originals/WS/jobs/records/transfers/attempts/completedAttempts/failedAttempts/controls/held/live/pins/writes/created/linkedCreated各0。3基体各2,084,864 B。監査直後DB合計6,287,360 B、最終metadataでは6,254,592 B/helper1,648,615 B/material230 B、原本/package/NodeTMP/ChromeTMP/special0、既知distlink1。

後sealも5指紋完全一致、候補・製品・DDL・bundle不変更。UI2を追加しても上記ID別の3群残件は未完のまま。直接signin/Settings取得・正常drain・保全・同bundleだけを追加根拠とする。UI1とUI2の失敗結果・DBを別rootに保持。全自己runtime終了、報告固定後read/write/runを停止してManagerへ所有返却。

### UI2現在公開 exact17

新root `p5c1-resume-ui2-20261001-n7yO50` 直下の17 regular/nosymlink、計120,815 B。UI2終了後に再照合し、旧表の同名fileと全bytes/SHA一致。ACTIVITY待機修正は未適用、次rootでの別許可対象。private/results/DB/materialを含まない。

| basename | bytes | SHA256 |
| --- | ---: | --- |
| diagnostic.cjs | 1079 | c2bfde56946572839ee644245cc0c4402db3959c6a78e37b06a533d52e3ee53a |
| error-bridge.mts | 2335 | 78e1ddf60795b602d64f7dabe6684ad6746965723160756b22a1c58f00e2f682 |
| identity.cjs | 1779 | 795bee3ea4ac862233a147b65bcb0bad2a179db4e48696294bfeeead0fade7c0 |
| ids.cjs | 2490 | aa46ea94ff3861851044bc059e94676292fe94e4e3d458f58b146405885c0e02 |
| prepare.cjs | 5685 | 24d7fd7dfbb8dd371205cb0adc912d293cc68d7553192a27e20f8e7433838ea3 |
| preserve.cjs | 2044 | 62de7b2d57d2b6a5b9a3a52d9db0926cd79f9074e21bfe3ef4d26ee56cda9aa9 |
| protocol.cjs | 3279 | 388c4e9b76810f857cc6997fccd4fce07282f0ea8e5d54365dcd47d57279b554 |
| provider.cjs | 20383 | 934bf8acd12a78e12c0f4e159f2a59a37ed1df55a4e90b0811c06cfd04938ea4 |
| run-ui.cjs | 5294 | a415c974ecb4540634a394893cb9fb4a1e607ec9f9b5c1a7ac645fd4ba490055 |
| sdk.cjs | 2260 | 31798de0685f3228b523b8b1e0556462a03829581a34bf502c9be781ec142498 |
| serializer.cjs | 12108 | ae1b9426803f5384d41bddc1b21e44e5c3e5c9672cbbf6a1251838723a1a9f6c |
| transport-scope.cjs | 2072 | 35afb36adb2587c9fc558d11887e7a0f0149f61df50c3f0098c23688aba6cdfb |
| ui-audit.cjs | 5357 | 9596543e4365769a1c41ce94cf8c3e27cdc032c685a3bcafa43081b00a3c7bad |
| ui-boot.mts | 9887 | 345903855c9702d9603fb373cc5e1e6298a49b1f1e72a1b56930efe05f73e786 |
| ui-common.cjs | 8133 | 40a8d4a1d2435a60ad069b6bffe5b916de57e22fdccee48d6c8cd59e42a94b0a |
| ui-resume.cjs | 35071 | 29dac02a960ce3d8f7cc492220881fcb5e84ab9c4ab841617f66a4b18b847547 |
| worker-observe.cjs | 1559 | e22b785d32388080a1a79dea1bcaf590ab0021bae6ffbe4a55e13e81b2f4e430 |

## UI3 最終差分・系列打切り

新排他0700 rootは `/Users/hikaru/.local/share/hollow/verification/p5c1-resume-ui3-20261001-HtHwUC`。UI2末尾exact17の必要全17 fileをmetadata/nosymlink/bytes/fullSHA照合後、新rootへapply_patchで適応。自身全文既読の同一sourceの再読は省略、旧private/DB/key/cache/results読取・旧場所実行0。変更は `ui-resume.cjs` のsignin末尾だけで、ACTIVITY待機を現在SETTINGS actor＋auth.readyへ置換し、finallyで7 predicate boolを記録した。observer/identity/authorityと実document/epoch拒否は不変更、新read/endpoint/POST/業務gate0。既96/8/3再演0、新pure/native/build0、構文14成功。

許可資源は同じ192 MiB/3 DB32 MiB、helper8/NodeTMP8/Chrome128 MiB/material256 KiB/新鍵128 B/RSA memory1/account1/note等0、app/provider/proxy/Chrome/context/page/boot/probe各1。新Hollow1500要求48 MiB/背景150要求1 MiB/provider24要求6 MiB逐次1、外部0。attempt3/control12等とprep60/UI180/stop40/外側285秒を維持。系列はroot576 MiB/9 DB96 MiB/app3Chrome3、Hollow許可1661要求144 MiB（既161＋1500）、背景188要求3 MiB、provider24要求6 MiB。余枠をretryに転用していない。

### 直接到達

init/新空0041成功、前5指紋一致。migrationはexit/close0・両pipe end/close/PID不在、stdout55 B、signal/error/deadline/overflowなし。唯一bootのcheckpointはNORMAL_ACCOUNT_SETUP 15,643 ms、SIGNIN_TRANSPORT 21,301 ms。正規signinのstatus200/responseMatchedとsame-origin/document/inputは成立し、SIGNIN1・BOOTSTRAP3・SETTINGS GET1を観測した。

FRESH_SETTINGS_ACTORは6回の待機判定でpassed=true。保存されたdocumentMatched/actorMatched/authVersionMatched/epochPinned/epochMatched/receiptCurrent/readyは全true。CURRENT_ACTOR 3回、BUTTON_READY、BUTTON_SCOPEのorigin/path/query/URL/document/regionCount1/targetCount1/visible/enabled/connectedも成立。明示確認済みのDRIVE_BEGINを1回送信し、REQUEST_PERMITのscope/input/actorは全true。

その後、DRIVE_BEGINはDTO_OBSERVATION_UNAVAILABLE（mandatory=false）、AUTH_DOCUMENTは124回の待機判定でpassed=false。step SETUP、errorsはAUTH_DOCUMENTだけ。自己認可fixtureのauthorizations1、exchange/certificate/refresh/Drive file要求0。read-only診断buttons0/alerts0/regions0/stable=false、最終documentGeneration0。これらから欠測のURL/document/認可画面失敗原因を推測しない。追加原因調査・再boot/POSTを行わない。

Hollow100要求（準備4＋listener96）/入力68,692 B/出力1,304,325 B、背景26要求/5265 B、外部forward0。provider HTTP要求0（自己routeの認可fixture1とは別集計）、RSA1。finishedのEXTERNAL1という分類は外部通信成功を意味しない。UI1–3の実累計はHollow261要求/入力174,294 B/出力3,261,804 B、背景64要求/12,974 B、provider HTTP0、自己認可fixture1・DRIVE_BEGIN1。全て許可内。

### 通常終端・保全と残件

app PID1336はexit/close0・signal/errorなし・両pipe end/close（stdout15 B/stderr0）、runtime drained=true。Chrome exit0/browserClosed/groupAbsent・全4pipe=true、controlClosed=true。proxy/provider closed、sockets/active0、provider failures空。listener accepted96/closed96/socket0。外wrapperはscenario未達によるexit1、exit/close・両pipe end/close・PID不在、deadline/overflowなし。

通常opaque→audit各1を実施。active/opaque driver open0、audit query_only。preserve passed=true、audit preservationPassed=true/closed=true/activeOpaqueUnchanged=true。audit全体passed=false（AUDIT_PARTIAL）は維持。ledger42/FK0、account1/verified1、attempts1/live1、completedAttempts/failedAttempts/controls/held/pins/writes/created/linkedCreated各0、note/WS/original/jobs/record/transfer各0。未完のauthorization attempt1は保存した業務履歴で、active/unknown owner0・全実runtime終端とは区別する。3基体各2,084,864 B、監査直後DB合計6,287,360 B、最終metadataはDB6,254,592 B/helper1,649,949 B/material230 B、original/package/NodeTMP/ChromeTMP/special0、既知distlink1。

後sealは公開5指紋完全一致。監査とsealの各外側sessionの終了確認後、両結果を確定した。製品fd4a2476/code4b39957・DDL/dist/lockは不変更。元UI1/UI2/UI3の失敗とDBは各rootに保持し、未観測boolや原因を補完していない。最終判定はscenarioPassed/allThreePassed=false。folder付きfailed relink旧保持→同sub成功置換、same-ID作成ACK不明回復、実pagehide/Back/BFCacheの3群は全て未到達で、上記A–F/P5c-2-Eの必須残件は未完。正常signin/現在Settings本人確認/明示開始1/正常終了・保全・同bundleだけを直接追加根拠とする。BFCache欠測をfalseや成功にしない。

Manager決定どおり、この系列はUI3で打ち切る。追加runtime/新root/POST許可なし。最終文書・公開source表固定後、全read/write/runを停止してManagerへruntime所有を返却する。

### UI3最終公開 exact17

新root `p5c1-resume-ui3-20261001-HtHwUC` 直下17 regular/nosymlink、計121,244 B。UI2からの差はui-resume.cjsの上記1待機/有限記録だけ。残16は同一bytes/SHA。自身作成・既読同一内容で、private/material/DB/results/cacheは含まない。後続利用には別途範囲許可が必要。

| basename | bytes | SHA256 |
| --- | ---: | --- |
| diagnostic.cjs | 1079 | c2bfde56946572839ee644245cc0c4402db3959c6a78e37b06a533d52e3ee53a |
| error-bridge.mts | 2335 | 78e1ddf60795b602d64f7dabe6684ad6746965723160756b22a1c58f00e2f682 |
| identity.cjs | 1779 | 795bee3ea4ac862233a147b65bcb0bad2a179db4e48696294bfeeead0fade7c0 |
| ids.cjs | 2490 | aa46ea94ff3861851044bc059e94676292fe94e4e3d458f58b146405885c0e02 |
| prepare.cjs | 5685 | 24d7fd7dfbb8dd371205cb0adc912d293cc68d7553192a27e20f8e7433838ea3 |
| preserve.cjs | 2044 | 62de7b2d57d2b6a5b9a3a52d9db0926cd79f9074e21bfe3ef4d26ee56cda9aa9 |
| protocol.cjs | 3279 | 388c4e9b76810f857cc6997fccd4fce07282f0ea8e5d54365dcd47d57279b554 |
| provider.cjs | 20383 | 934bf8acd12a78e12c0f4e159f2a59a37ed1df55a4e90b0811c06cfd04938ea4 |
| run-ui.cjs | 5294 | a415c974ecb4540634a394893cb9fb4a1e607ec9f9b5c1a7ac645fd4ba490055 |
| sdk.cjs | 2260 | 31798de0685f3228b523b8b1e0556462a03829581a34bf502c9be781ec142498 |
| serializer.cjs | 12108 | ae1b9426803f5384d41bddc1b21e44e5c3e5c9672cbbf6a1251838723a1a9f6c |
| transport-scope.cjs | 2072 | 35afb36adb2587c9fc558d11887e7a0f0149f61df50c3f0098c23688aba6cdfb |
| ui-audit.cjs | 5357 | 9596543e4365769a1c41ce94cf8c3e27cdc032c685a3bcafa43081b00a3c7bad |
| ui-boot.mts | 9887 | 345903855c9702d9603fb373cc5e1e6298a49b1f1e72a1b56930efe05f73e786 |
| ui-common.cjs | 8133 | 40a8d4a1d2435a60ad069b6bffe5b916de57e22fdccee48d6c8cd59e42a94b0a |
| ui-resume.cjs | 35500 | fe9444bc256efbe9fb73aa8ae7262589584edddce31bf17d48c8324845ff6475 |
| worker-observe.cjs | 1559 | e22b785d32388080a1a79dea1bcaf590ab0021bae6ffbe4a55e13e81b2f4e430 |
