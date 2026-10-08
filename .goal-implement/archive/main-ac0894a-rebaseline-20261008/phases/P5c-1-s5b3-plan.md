# P5c-1 S5b-3 残条件の同bundle UI計画

2026-09-30。静的計画のみ。製品・dist・既proofの変更/実行0、新root/鍵/DB/helper/browser/HTTPの生成・起動0。本書だけを編集した。V1修正 `87d0defbcf9e0689c4c062cad39aa28821eff184` は独立受入済みで、現source/entry/dist/DDLlockを固定候補とする。Managerがこの実行範囲を正式委譲するまで開始しない。

入力は[前独立レビュー](../reviews/P5c-1-s5b2.md)、[V1修正報告](P5c-1-s5b2-fix.md)、[ACK案](P5c-1-s5b-ack-plan.md)、[ACK工具結果](P5c-1-s5b-ack-toy.md)、固定A〜F/P1-E/P2a-E。過去失敗を消さず、未完条件を満たしやすい別条件へ変更しない。

## 1. 2bootの固定配置

新0700排他root `p5c1-s5b3-20260930-XXXXXX` を採用後に作る。cwdは新root、repo `.env` 読取0。公開固定distへの唯一の永続linkを別管理し、capacity walkerは非追従。新空DBへ正式0038まで1回初期化。account1・notes/WS/assets/originals/LLM/実backup0。

|boot|入口と操作|終端|
|---|---|---|
|C 構成あり1回|同built named boot＋公開実Drive adaptersの自己request factory。通常signup→新rootの自己確認メール→初回linkはsetup。残る保存先/ACK/作成/再連携/文書寿命を実UIで行う|browser正規close→app quiesce/drain/DBclose→全自己終端→opaque→audit|
|U 未構成1回|同builtを正規production mjsで起動。新空profileで同accountへ通常signin。linked/folder再表示→local unlinkの即時表示→reload永続確認。通常notes/jobsへの到達を比例確認|同じ停止保全。解除後のconfigured再試行はしない|

初回refresh不足/shortcut正常/既nonceの全枝等は再演しない。setupを新しい受入成功件数に足さない。Cのproviderは1プロセス/RSA1でsetupから最後のrelinkまで連続して保持する。途中停止でtokenを失った場合、旧token抽出・任意accept・追加bootを行わず、その時点の失敗を保持して返す。

## 2. 起動前に閉じる準備

一度のC bootを準備確認に消費しないため、以下はbrowser/DB/HTTPなしで確認してから起動する。これは新しい製品gateではなく、既条件を正しく観測するためのhelper準備である。

- runnerは終了Promiseを副作用前に確定。標準inputをTTYで保持し、EOF/同期再入/重複stopは一度に集約する既対を借用。適用差があれば同新rootのNode mockで確認し、既DBやbrowserでsmokeしない。
- serializer観測は固定buildの公開ServerFn識別と現TanStack response protocolに合わせる。settings/currentUser/receipt/unlink/continueの通常応答をmemoryでbounded decodeし、ID等の一致bool/有限phaseへ投影する。生JSON DTOを前提にしない。JSON/必要なframed構造は許可した純データだけを扱い、eval・任意関数復元・raw body出力をしない。正常DTO・error・過大・不正・異actor/commandの純fixtureで判定を確認する。対応protocolを確定できなければ起動前に戻す。
- nonce observerは既parse5/meta[property]/script.nonceの受入済み対を借用し、旧meta[name]へ戻さない。read-only DOM projectionはlabel/code/count/enabled、現在routeの有限分類、folder一致bool、receipt領域の有限phase/failureだけ。入力値/アカウントメール/ID/URLquery/nonceを出さない。
- providerは新シナリオ専用の厳密列で組む。認可 `success(setup) → failed-relink → success`。folderはtrash→missing→normalと必要なconfirm、createは事前ID1→send1 ACK不明→同ID GET404→明示send2→同IDusable→confirm。旧fixtureのsourceIndexやcounterを先に進めて成功に見せない。
- 新SDK fixtureは通常scriptとしてだけ提供し、可視Picker操作とfinite lifecycle通知だけを持つ。page.evaluateでSDK注入、CSP緩和、synthetic pagehide/pageshow、旧profile/CDP/storageStateを使わない。

## 3. ACK moduleの統合

公開artifactをmetadata/hash→全文EOFまで読んだ。import/copy/実行0。

`/Users/hikaru/.local/share/hollow/verification/p5c1-s5b-ack-toy-20260930-C0NvJq/ack-fault.cjs`

regular/nosymlink、9,183 B、SHA256 `09b3e42e848681b52aff6b382aa65e171ca64be05a57d5f4e3cc8e6a7cc9a722`。toy HTTP4/backend3・純4対の成功は工具根拠として借用し、再演しない。実Chrome/Hollow/本人/ACK後GETは別に観測する。

採用後に新rootへ排他copy/adaptする。元C0NvJq artifactは変更しない。`createAckFault({origin,pathname,current,accept})` を既outer proxyのtarget分岐に接続し、ordinary forwardは維持する。`handle() === false` は未処理なので、先にexact自己origin/method/path/query/userinfo/fragmentを検査し、fault中の異形selection POSTをordinary forwardへ落とさない。CONNECT全面拒否、外部forward0、route.fetch/APIRequestContext/bypass0。

### 本人・request束縛

現在通常GETのactor.accountId/authVersion/browserEpoch、現在の専用document/main frame、今回のdocument generationをmemoryで観測する。今回発行したPickerの応答 `value.receipt.id` と、可視normal選択から実際に出たselection command/fileIdを照合する。最初のexact POSTだけをbindし、同一requestをroute.continueで1回流す。Cookie/Origin/Content-Typeとbody byte列は実requestからそのまま取得し、header/bodyを上書きしない。moduleのcurrentは通常読取とpage lifecycleの現在factsを返し、UUID形式だけで本人確認を代替しない。

専用文書はno-referrerなのでRefererが欠落し得る。Manager採用の閉じたadaptは、Refererだけ「両方absentなら一致、片側absentなら拒否、文字列同士はexact一致」とする。空文字と欠落を同一化せず、headerを捏造しない。Cookie/Origin/Content-Typeは必須を維持し実POSTでも確認する。新copyの純predicateでabsent/empty/valueの各比較を追加する。旧toyの合格は旧moduleの結果として保持する。

### 受理とdrop

selectionは `driveHttp.node.ts` と `folders.ts:admissionReceipt` の正規JSONで、Picker応答とは形が異なる。predicateは少なくともHTTP200、`ok===true`、`value.accepted===true`、`value.row.kind==='folder-select'`、同command、新しいUUID row.id、current true、受付phase queuedをmemoryで検査する。`value.receipt` を探す誤りを避ける。返却rowは受付の根拠で、folder完了ではない。

moduleはresponse end+complete、request/response/socket closeと受理predicateが揃うまでbrowserへheader/bodyを一切送らず、一度だけdownstreamをdestroyする。outerはtaskをdrain対象へ登録し、module失敗を有限codeで記録する。bind/forward試行/接続/受理/終端/drop/downstream終端は別counter。二つ目の対象POSTは409拒否し、duplicate>0なら自動再送条件は不合格。旧route.fetchの呼出1を実forwardへ読み替えない。

byte枠は通常proxy accepted wire＋fixture fulfillに、fault upstreamの未送信response body/headerを加えて保守的に監視する。moduleはresponse/header bytesを返すので別記し、request二重枠を作らない。取得できないnative overheadは1fault128KiB予約へ含め、exact wireと上界予約を混同しない。module native終了未証明なら追加操作せず停止する。

## 4. 残操作と判定

全操作は現在DOMのrole/nameが一意・visible/enabledで、現在actor/route/receiptが一致する場合だけ実施する。native確認も既知本文の有限分類で一度だけ承認する。networkidleはload待機の補助に限り、mutation完了判定には使わない。

|操作|有限成功根拠|失敗/未検証の扱い|
|---|---|---|
|trash selection1|新receipt GETが同command/id、phase failed/failure DRIVE_FOLDER_TRASHED。Drive処理結果region内の固有案内、confirmなし。次の受付前にowner none/closed|常設説明に「ゴミ箱」があるだけでは不可|
|missing selection1|同receipt GETがDRIVE_FOLDER_UNAVAILABLE、処理結果regionに削除と断定しない案内、confirmなし、自動作成/POST0|文字列部分一致やprovider404だけでは不可|
|normal selection1＋ACK遮断|上記bind/受理/native終端/dropが全成立。browser側unknown表示。可視「結果を確認」から同command純GET、同rowのready、selection POST増分0|status200/route呼出/unknown表示だけでは不可。再click/rePOSTで補わない|
|normal confirm1|本人の明示確認、continue受付、現在GETでcompleted＋settings.folderがnormal、UIの保存先一致とbusy解除|reloadでしか変わらなければ即時再読条件は不合格|
|create logical1|生成ID1/send1のみ→ACK不明の有限receipt。明示「作成結果を照会」→同ID404でcanResend。再送確認→同ID/同marker send2だけ→ready/親確認→明示confirm。現在GET/DOMでcreated folder、autoBackup OFF|新ID生成/自動再送/送信数不一致は不合格。create処理結果不明とselection ACKを区別|
|folder付きfailed relink1|認可影響確認後の失敗receipt、現在GETでlinkedと旧folder/epoch/連携日時等の有限一致、通常UI表示も保持|folderなしで代用しない。旧資格の平文抽出で比較しない|
|同sub成功relink1|native確認→正常callback receipt→現在settings/receipt GET・UI。既固定仕様に従う新epoch/設定保持、autoBackup OFF。旧操作は実owner終端|HTTPcallback到達だけで成功としない。実backup取消はbackup0で未検証のまま|
|pagehide→Back|可視Picker開始→設定への通常full navigation。SDKの通常scriptが実pagehide/persistedを有限通知し、dispose/旧選択からselection POST0。Back後はcurrent GET・開始前issue増分0、必要なら現receiptを明示取消|ブラウザが破棄した文書のJS参照の物理消去は主張しない。local寿命対と直接browser根拠を分ける|
|実BFCache|Backの実pageshow.persisted=trueの場合だけBFCache復帰、旧controller再開/自動issue/selection0を確認|persisted=falseなら通常Backだけ合格、BFCacheは未検証。再起動/繰返しで成立を強制しない|
|U 未構成unlink1|実POSTのbounded正常返却 `{id,phase:'completed'}` と現在GET完了を別々に取得。reload前にunlinked/folder未設定/解除buttonなし/pending解除、同command追加POST0。その後reloadでも保持|旧表示が続けば新mutationを止め、現在GET/有限DOMだけ診断。reloadの成功で即時表示欠陥を隠さない|

lookupボタンが2個ある場合は現在の「Drive処理結果」regionに限定して一意性を確認し、最初の同名buttonを推測クリックしない。receipt readのexpected ID/commandと応答の値はmemoryだけで比較する。serverFn response error/malformed/current falseを成功DTOへ変換しない。

各期待値は既開始request/responseを監視し、30秒までの有限待機で判定する。読み取りpollは操作単位で最大10回/2秒、全体GET追加240件以内。観測不一致で即閉鎖せず新mutationだけを止め、同一文書のfinite response/DOMを確認できるようにする。範囲外/秘密/予算/実所有不明なら安全停止。成功までの無根拠再click・同POST再送・追加bootなし。

## 5. 提案する有限予約

独立の2boot案を維持し、trash/missing各1を追加する方針はManager採用済み。以下の数値一式は実行委譲時に固定する。boot枠を準備失敗の繰返しで増やすことを前提にしない。

|対象|予約|
|---|---|
|boot/browser/control probe|各2、同時tree/context/page各1、新空profileのみ|
|DB|active1＋C/U各opaque/audit1＝logical5、総64MiB、active16/各copy8MiB。main/WAL/SHMのlogical集合。新正式初期化1回|
|account/material|account1、notes等0、invitation/share/AES2の128B、RSA2048 memory1。材料256KiB/helper log8MiB/browserTMP128MiB|
|Drive UI|attempt3（setup成功/失敗relink/成功relink）、Picker開始最大5、selection3（trash/missing/normal）、confirm2（normal/create）、logical create1/sends2、明示cancel最大3、control総24|
|provider|最大32要求/10MiB、同時1。code交換3＋cert最大3＋refresh最大4＋folder selection/confirm/relink検査最大12＋generate1＋create sends2＋create inspect/confirm最大5＝30、残2は同既定操作の差分照合余裕で自動retry枠ではない|
|Hollow/browser|提案1800要求/64MiB。最大24 full documents×約45 assets＝1080、通常RPC/setup等180、有限GET240、同導線の費用差300。計1800。旧1500案から300増の静的予約を先に申告|
|背景拒否|250要求/2MiB。S5b-2の実値を踏まえ2fresh browser分を予約。外部forward/CONNECT許可0|
|listener|Hollow1＋proxy1、Cのみprovider1、BrowserServer control1。生成したexact addressと捕捉PID/groupだけを監督|

24 documentsにはsignup/verify/notes/設定、認可document/callback結果/設定×3、専用入出・Back、U signin/notes/設定/reload/jobsを含める。同専用文書で次selectionへ進むのは前control終端を通常GETで確認し、可視開始が有効な場合だけ。asset節約のために必要なfull navigationや結果確認を省かない。planned document上界を超える導線が静的に判明したら起動前に再見積もりし、実行中の追加bootで補わない。

pagehide寿命用はselectionを追加しない残Picker枠を使う。旧SDK callbackの遅着は通常合成SDKのイベント/有限遅延で扱い、page.evaluateからcontroller関数を呼ばない。実BFCache不成立時は追加launchを予約しない。trash/missing失敗receiptの終端、normal/create確認、relink前のlive owner終端を順に確認し、未使用cancel/provider枠を掃除の自動retryに転用しない。

## 6. 保存・停止・引継ぎ

各bootはbrowser正規close→app quiesce/drain/DBclose→既知child/pipe/group/control listener/proxy/provider全終端の順。標準BrowserServer fallbackが発動した試行はgraceful不合格。未知PID操作/広域process/port走査/手動kill0。通常close失敗時もactual終端を別確認できる場合だけ停止snapshotを取る。

active/opaqueをdriverで再openせず、active main/WAL/SHMを前後metadata照合してopaqueへ排他copy、さらにauditへcopyしauditだけ開く。ledger39/103表/FK0/owner0、account1、attempt/control上限、notes/WS/assets/LLM/GoogleIdentity0、C linked/folder有、U unlinked/credential・folderなしを有限確認する。copy不足や追加失敗は既5DBを越えて作らず返す。旧actualfresh/backup/資格/結果のread/copy/移行0。

開始/停止時に同public source/apps/entry/shutdown/dist/DDLlock指紋、自己全PID/pipe/socket、実要求/bytes、資源残量を報告する。toyや旧成功の借用、今回直接、未検証を分離する。2bootで実BFCacheが成立しない等の未証明はそのまま残し、phase全体成功へ混ぜない。新根拠報告は独立Verifierへ渡す。

本書以外の書込0。ACK moduleのmetadata/hash/fullread、公開製品response契約と公開serializer sourceの静的読取だけを行った。新helperのcopy/import/実行0、provider/browser/HTTP/DB/鍵生成0。EOF確認後、文書を含む全read/write/runを停止してManagerへ所有返却する。

EOF
