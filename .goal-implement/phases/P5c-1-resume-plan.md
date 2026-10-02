# P5c-1 残3群の再開差分案

2026-10-01。静的提案のみ。候補 `4b3995711c94957454cfbaf6863b6e9695abfb4a` を前提に、進行中のRetarget UI/環境には触れない。実装・helper生成/import・test/build・DB/HTTP/browser・旧proof/private読取・新root作成は0。書込は本書だけ。spec/spec-implement/管理正本変更0。実行開始はManagerの別委譲を要する。

基本手順/安全境界は [S5b3計画](P5c-1-s5b3-plan.md) §§2–4,6 と [S5b3独立レビュー](../reviews/P5c-1-s5b3.md)「次段の最小案」を参照し、重複転記しない。旧2boot計画の未構成Uは受入済みなので再演しない。今回の差分は次の単一configured boot、最新認証/streaming/Drive portへの工具適応、観測失敗の扱いである。

## 1. 根拠と残件

| 元条件/残群 | 既成功を維持する範囲 | 再開時の直接根拠 |
| --- | --- | --- |
| A/D/E: folder付きfailed→同sub success relink | S5b3 C2/C4のsetup callback/current/linked、U解除即時表示/reload | 旧folderがある状態の失敗callback/receipt→旧epoch/資格版/settings/folder保持。同sub成功→新epoch/新資格版/folder null/OFF、現在GET/DOM |
| C/E: 同ID作成ACK不明 | C4 normal selectionの受理→ACK drop→再POST0→GET ready→明示confirmは別成功 | 事前ID1、create send1の結果不明、明示inspectで同ID404、send不増、明示resend同ID/marker send2、metadata/parent一致→明示confirm→settings保存 |
| E: pagehide→Back/BFCache | C2/C3のpagehide persisted=false/dispose、C4 dispose3は断片のみ。Page/Picker局所寿命対は借用 | 実pagehide/dispose→通常full navigation→Back。実pageshow.persisted=trueの場合だけBFCache合格、旧callback/自動issue/selectionなし、現在GET後の明示再開始 |

[S5b3主報告](P5c-1-s5b3.md) C4は失敗relinkの認可document到達後snapshotで停止、exchangeはsetup分だけ。same-ID作成とBackは未到達。[S5b4独立報告](../reviews/P5c-1-s5b4.md) は初回setup callback前で停止、認可documentへ移る途中に旧app用snapshotと混在した直接反例。3群とも未検証のままであり、S5b4のexit0は通常停止だけを意味する。C4の原例外欠測をS5b4反例で遡及確定しない。

6 IDとの対応は次のとおり。既受入は[S5b3独立レビュー](../reviews/P5c-1-s5b3.md)の部分根拠を指し、ID全体の完了や現候補での再実行を意味しない。

| ID | 維持する既受入根拠 | 今回残3群との対応 |
| --- | --- | --- |
| P5c-1-A | 合成認可callback/completed receipt/現在GET、本人session束縛 | 群1のfolder付き失敗保持と同sub成功新epoch |
| P5c-1-B | trash/missing固有案内・無断作成0、normal選択ACK回復/確認/保存、先行shortcut | 群2の現在sub/metadata/parent再確認。setup normal選択は既合格の再受入に数えない |
| P5c-1-C | selection ACK不明から再POSTなしの純GET回復、既局所の永続ID/閉鎖条件 | 群2のcreate ACK不明→同ID照会404→明示同ID再送→確認を直接補う |
| P5c-1-D | Uの解除completed→現在GET→同document未連携表示→reload/OFF保持 | 群1の失敗時旧保持/成功時置換。実backup cancel UIは本段範囲外でP5c-2の接続条件と別管理 |
| P5c-1-E | Settings/Picker再読の実UI、既dirty/current/ABA・nonce/390px/keyboard | 群1/2の現在結果表示、群3の実pagehide→Back/BFCacheと秘密寿命 |
| P5c-1-F | 既規定checks/局所・同bundle・正常終了/opaque→audit、未構成production U | 残3群を現候補で観測する構成/指紋/停止保全を新しく揃える。実Google適合は代替契約から推論しない |

note/original/backup0の本段では実backup cancel UIを検証しない。範囲外という区分は全体要件からの除外ではなく、P5c-2の取消/影響確認に関する既受入・未完の管理を変更しない。

## 2. 現候補への依存

- SSR限定patchはper-fragment streamingを維持し、Retarget基点以降も同版。過去一覧残留を新候補へ持ち込まない一方、今回のDrive成功をSSR受入から推論しない。notes/tags再回帰を新gateに加えず、通常入口として通る分だけ観測する。
- `connection.ts:448–568` のcandidate採用はclosed/current/確認集合を検査してから旧backup取消、epoch/資格版/settings版を進め、folder null・OFFへ同Tx保存する。失敗認可はこの採用に到達しないことを旧値一致で確かめる。同sub成功でも旧folderの無条件保持を期待しない。
- `folders.ts:330–420,477–527,605–665` は現在資格/実owner閉鎖後にcontinuationをclaimし、sends1→明示resend2、同ID/marker/単一parent検査とconfirmを行う。plain receipt GETと、外部metadataへ問い合わせる明示inspect POSTを混同しない。404だけで永久削除と断定しない。
- `DrivePickerPage.tsx:51–164` はpagehide/離脱でgeneration進行＋dispose、persisted復帰でclear→純GET。`readOnce` はcurrentUserとsettings actorを両方検査する。既testの合成persisted=trueは実BFCache根拠ではない。
- 現 `DriveExecution` はbackup laneと `changeRevision` / `waitForChange` を含む。旧S5b3 bridgeの「他12method委譲」をそのまま使わず、採用時に現port全methodへ照合する。built/source error class混在が残るcompositionならexact現built classの限定bridgeを使い、未知/transportを同値passthroughする。旧asset名/exportを流用しない。
- Retargetのhead変更はfolder-controlの作成IDを変更しない。本段はnote/original/backup0なので、実backup取消の成功には数えない。P5c-2で受け入れた取消/原本pinの直接根拠は別IDのまま維持する。

## 3. 一回の代表UI

1. 新空0041 DB/account1で通常signup・自己mail確認・signout後、Retarget UI3の正式same-origin signin transportを再利用する。正規認証endpoint/入力/同origin条件を守り、signin結果だけで本人確定とせず、遷移後のfresh ACTIVITY actor/authVersion/browserEpochと現在personal scopeを確認する。button操作/文書観測はUI3の最新補助を採用候補とし、旧selectorや操作直後の自動広域snapshotへ戻さない。UI3の未完結果を成功根拠にはせず、exact helper表は同試行の終了報告後に選定する。shellメニューの有無/補助counterを認可gateにしない。専用Picker文書は通常shellのACTIVITY常在を要求せず、現在user/settings actor/receipt/文書束縛で判定する。
2. 正規初回link成功→normal Picker選択1→明示GET/confirm→folderありをsetupとして作る。旧資格/DB値の抽出や直接SQLの成功状態注入で省略しない。保存先/同sub/epoch/credentialVersion/settingsVersion/connectedAt/autoをmemoryにmarkし、表示とrepository投影の一致boolだけを保持する。実token/ciphertextのhash/出力はしない。
3. failed relink→callback failed/current receipt→現在settings/通常DOM旧値保持。続くsuccess relink→completed/current GET→新epoch/folder未設定/OFF。両方の影響確認は正規UIから行い、失敗時の旧保持をfolderなしへ縮小しない。
4. 現在連携から通常folder作成1。providerはgenerate1→create1受信後応答切断（実close）→正規inspect404→明示同IDresend2→同IDusable→confirm時同ID/marker/parent再検査、という閉じた列。GETだけで再送なしと、inspect POSTがmetadata GETだけを起こすことを別counterで確認。旧normal-selection用ACK proxy moduleは不要。
5. 作成完了後に明示Picker開始→未選択のまま通常Settings full navigation→Back1。合成SDKは正規scriptとして実pagehide/pageshowを有限記録し、dispose後の予定late callbackは通常SDK callback経路だけで試す（page.evaluateで関数/SDK注入なし）。Backが新文書なら通常Backとして記録し、欠測pageshowをfalseと捏造しない。persisted=trueが実測できた場合だけBFCacheとし、復帰後GET/旧issue・selection不増を確認。現在UIが要求する旧control取消を明示1回まで、再開始は本人button1回のみ。

認可の操作とsnapshotを分ける。begin click後は期待provider origin/path/一意可視anchorへの到達を待ち、app body/headingを読まない。callback後にapp現在DTO/DOMへ戻す。各readの前後でURL/文書generationが違えば観測を捨て、mutationは再送せず有限readだけ再観測する。非必須begin body欠測をcallback/receipt条件へ昇格させない。単なるHTTP200/finishedやnetworkidleをReact/current完了にしない。

観測停止時も純GETの正規「結果を確認」は現在actor/文書/locator・一意enabledの条件で許可し、業務結果取得済みをGETの前提にしない。純GET完了とクリック受付を別計数。新mutationの解除は別の明示判断で、同POST再clickを含めない。deadline/状態不明/予算超過は停止・保全し、追加bootしない。

## 4. 局所/nativeとの分離

既65局所/型/build、S5b3 bridge67、same-ID/第三send拒否/親変更拒否の既application対、Picker寿命/foreign actor対は不変更範囲だけ借用。今回必要なのは現helperのDTO/endpoint・認可遷移中read破棄・POST許可・resume/GET・provider順序・現bridge delegationの準備純対（1worker/最大96有限assert/60秒）。未知の不足が見つかった場合だけ元条件へ紐付け追加案を返す。全旧対再演、新native専用DB/追加native HTTP trialは提案しない。

createの実adapter→自己HTTP/socket終端は同UI内で直接取り、fake return値だけでACK不明を作らない。期限/nonce/current/delegateの純成功は実Chrome動作と分離する。BFCacheが一回で成立しなければ未検証を残し、flagを拡張して成立を強制しない。許可候補は既方向採用済み `ignoreDefaultArgs: ['--disable-back-forward-cache']` だけ、他default/CSPは維持する。

## 5. 最小資源提案（未採用）

| 対象 | 予約/根拠 |
| --- | --- |
| 隔離 | 新prefix `p5c1-resume-20261001-XXXXXX` 排他0700、root192MiB。旧root/profile/key/cache/結果非操作 |
| DB | logical3、総32MiB＝active16＋停止opaque8＋audit8。新空正式0041初期化1、DBwriter1。旧0038 DBを移行しない |
| 対象 | account1、note/WS/original/assets/LLM/backup0、自己mail memory1、新鍵128B/material256KiB、RSA2048 memory1 |
| runtime | app1/provider1/proxy1/Chrome1/context1/page1、boot/control probe各1、pure child逐次1。通常build/install0、dist固定別256MiB |
| 容量 | helper/log8MiB、NodeTMP8MiB、ChromeTMP128MiB。DB等合計176.25MiB、残15.75MiBは再試行枠でない |
| Drive操作 | attempt3、Picker issue最大3（setup/退出前/復帰後明示）、selection1、normal confirm1、create logical1/ID1/sends2、inspect1/create confirm1、cancel最大2（現在controlへの明示のみ）、control総12 |
| provider | HTTP最大24/6MiB/逐次1。token exchange3＋cert最大3＋通常folder検査2＋generate1＋create2＋created inspect3＝14、現資格必要時refresh最大3で17。残7は許可操作の既定metadata/検証差だけ、無根拠retry不可。送信前にexact endpoint列を確定 |
| Hollow | 1500要求/48MiB。20 full documents×約45asset＝900＋通常setup/RPC150＋有限GET200＋導線差250。重複requestを二重枠にせずfixture応答bytesも含む |
| 外部/背景 | 外部forward/CONNECT/WebSocket/実SDK/課金0。背景deny150要求/1MiB、起動前exact自己origin proxy。合成Google認可/SDKは送信前fulfill、redirect先route非適用はproxyで拒否 |
| 期限 | prep60秒、UI180秒、個別read2–5秒/期待条件最大20秒、純GET最大10回/条件・全200回、通常stop40秒。controller結果とelapsedを有限保存 |

providerのtoken/RSA/subjectを1boot内で保持し、途中停止後に旧資格を取り出して次fixtureへ移さない。停止はChrome通常close→app quiesce/drain/DBclose→既知child/pipe/socket/caller終端→排他opaque→auditだけquery_only。Chrome標準fallback/signalledは不合格、未知PID/広域scan/手動kill0。失敗DB/結果は保存、active/opaque非接続。auditはledger42/FK0/account1/notes等0/attempt≤3/control≤12/owner0、終端linked/作成folder/OFFと有限比較。実ledger/表数は現0041の公開schemaへ照合し旧39/103を流用しない。

## 6. 公開helper候補（今回読取/照合0）

採用後だけmetadata/regular/non-symlink/全SHA→全文EOF→新root適応する。以下は公開報告に記載されたexact候補であり、旧root全列挙/参照privateの追跡を許可しない。全harnessの盲目的再演はしない。

旧prefix `/Users/hikaru/.local/share/hollow/verification/p5c1-s5b3-20260930-nZZe1Y/`、根拠はS5b3主報告末尾。

| basename | bytes | SHA256 / 用途 |
| --- | ---: | --- |
| provider-c4.cjs | 20417 | `8ef98dfb28df2ba94fe400cf7309afa1ddaee2f7b39b628bee874e83097f850e` / 認可・same-ID有限fixtureの適応候補 |
| b2-c4.mts | 5166 | `2c7b1218f8bb8d48e0babcd7a2d8eb919c3f2cb3929ea9b29c61c8c33e3c5678` / built bootと実adapter接続の参考 |
| harness-u.cjs | 34406 | `891fe0f6e1380fbbb031e38bb4491658dcd7c1139f76fae210534c1083f14517` / SDK/認可fulfill・有限DOMの候補。自動広域snapshotは採用しない |
| error-bridge.mts | 2035 | `5fe91e5189e25be47d191213061555c02af56b7d698a92f98133f89f33d4b0cb` / 現classと全portへ再照合 |
| bridge-pure.mts | 4423 | `0f0d311e15b300e75248de1e5ec837b9469a3fa7198a692a4da62e9970db6a61` / bridge適応の純比較 |

新しい有限runner/proxy/認証/serializer/停止保全は [Retarget主報告](P5c-2-retarget.md) 末尾24source表のうち、prefix `/Users/hikaru/.local/share/hollow/verification/p5c2-retarget-20261001-e7g0RV/` のexact `ui-common.cjs`、`supervise.cjs`、`identity-gate.cjs`、`request-input.cjs`、`protocol.cjs`、`serializer.cjs`、`preserve.cjs` を候補とする。各bytes/full SHAは同表を正本参照し重複しない。Retarget用setup/UI/監査assertをそのまま実行せず、今回account1/note0/Drive controlに合わせた新sourceへ適応する。表外依存があれば先にexact申告する。

ただしsignin・fresh actor/epoch/scope・button/document観測の採用元は、Retarget UI3終了報告の最新exact helper表で上記候補を更新してから確定する。現時点ではUI3のpath/bytes/hashを推測せず、旧版を先に読取・適応しない。UI3の未完結果と再利用可能な工具の契約を分け、最新helperの選定自体をP5c-1の成功根拠にしない。

公開Playwrightは別採用候補 `/Users/hikaru/.local/share/hollow/verification/p5c1-browser-tooling-20260930-RaaaPD/tooling` の179file/18,550,212B、canonical行SHA `dc520408fcfe3e1951e46ca6a2a03d31d24b554ee21abe1249c094356fad3cc5`。旧profile/cacheは対象外。SDKの実Google適合/grantは未検証のまま、合成SDK callbackの成功を一般化しない。

## 7. 判断待ちと終端

要件の追加や利用者への再質問は不要。判断待ちは上記1boot/新資源・exact public helper読取/適応の実行採用だけ。製品変更の必要性は現在認めておらず、発見時は元条件/最小diffを別提案する。S5b3/S5b4の失敗を消さず、今回の観測不成立も成功へ変えない。Retargetの独立UI停止/返却と候補固定を確認してから、別委譲で唯一runtime ownerを定める。

本書を全文EOF確認後、文書を含む全read/write/runを停止する。

EOF
