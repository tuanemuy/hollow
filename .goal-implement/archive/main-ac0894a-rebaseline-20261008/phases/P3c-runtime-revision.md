# P3c-R1 検索 runtime 修正

## 現在の結果

P3c-A/Gの修正候補を返却する。process別wall換算の構造欠陥を有限注入で再現し、Manager採用の同host monotonic deadlineへ修正した。最終checks、673unit、関連24Node、build、本体の通常read/再試行/再起動、旧行/実体/課算保全が成功。独立受入は未実施。

元09:43〜09:56の正規read失敗で実際に時計差が発生したかは未確定。restartだけで修正済みとせず、再現した構造欠陥の修正と原事故の因果を分ける。10:20の誤った `q=` URLは撤回事実として保持し、runtime再発へ数えない。

goal-implement/manager-loop、doc-style/markdown-styleを適用する。全体goal/管理資料はManager所有で変更しない。spec/spec-implementは使用しない。

## 開始識別と保全

2026-09-11T10:40:38.474+09:00。HEAD `01b55c9294eb2bf77d41c06f5db7a67fb0d5dcd6`、source758 `d5b6c18b205c05652e24bdfe31e24aefaa56a551ead03b26c2b4f59f9ac9a5aa`、lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`、bundle `5ec816082846da47e69c3205dbe0df64ad2caaabe5d33f587ee89ac311d40d7e` が受領値と一致。開始製品差分/cachedは0。

known PID87071のcwdはapps/web、open DBはfresh rootのapp.db。新資材rootは `/Users/hikaru/.local/share/hollow/verification/p3c-r1-7cAogv`。start/app.dbはonline backup、objectsは排他コピー。notes71/assets2/originals3/revisions79を照合した。

payloadは6objects/2659B。初回manifestの7files/2716Bは `.hollow-writer-owner` 57Bを含む。owner lockはpayload/課算/不変objectの集計から除外する。コピー元・key・資格情報は変更せず、key/資格情報の値・hashは取得していない。

## 有限診断

adapter専用optional observerとmonitorの別kind診断を追加。parentはprocess内要求連番、queue/fork/message/close elapsed、残予算、code/signalだけ。monitorは有限stageと残予算だけを送る。progressはfinal resultとして扱わず、observer異常は資源所有を変えない。query/session/user/note/HTML/SQL/path/env/argv/driver全文を記録しない。application port/DI/UI/SQL/schemaは不変。

`diagnose.mjs` は新資材rootだけにbundleを作成し、live distを変更しない。synthetic Workerの有限tags DTOを使い、旧時計式のchildだけtimeOriginを±60秒ずらす。OS時計/sleepは操作しない。

2026-09-11T10:42:39.722+09:00、Node22.22.3/Darwinで次を確認した。詳細は同rootのdiagnosis.json。

| 対 | 結果 |
| --- | --- |
| 通常旧時計式 | 78.0ms、result/Worker exit/close0、成功 |
| child +60秒 | 子残-57045.6ms、deadline→SIGKILL→48.1ms close。親残2951.9msでも不成功 |
| child -60秒 | 子残62957.2ms、invalid-budget→SIGKILL→44.0ms close。親残2956.0msでも不成功 |
| 同host直接child5回 | raw hrtimeが全て親fork前〜receiveの区間内。通常のepoch換算差は0.006〜0.008ms |

これは旧式の未保証なprocess別wall換算に対する構造欠陥の注入再現である。原R1で同じ時計差が発生した証明ではない。単なる長寿命、OS時計補正、sleepを原事故の原因と断定しない。

固定実装の公式根拠とAPI保証の限界は [時計調査](P3c-runtime-recurrence-plan.md#公式一次資料による時計候補の補足) を参照する。同host/sameboot/sameNode直接childのraw hrtime deadlineは、上記の限定実測後にManagerが採用した。

## 修正範囲と受入項目

実行前提は同host・同boot・同Node・同OS clock namespaceの直接所有childである。portableな全OS共通epochやsuspend中の厳密な停止時刻を公開APIの保証として説明しない。新OS対応、自動fallback、起動時platform probe、依存更新は加えていない。

| ID | 自己結果 | 根拠と適用範囲 |
| --- | --- | --- |
| P3c-A | 修正候補 | 親とmonitorの絶対deadlineをhrtime bigintで統一。受付時一度だけ3秒を発行し、queue/startup/SQL/DTO/IPC/closeまで同値。期限比較と100ms開始余裕はbigintのまま、Number化はtimer遅延と診断残msだけ。最大20桁decimalを境界で検証。旧±60秒注入の両方で成功し、期限/native終了/close/次正常・readonly/current authを関連24対で確認 |
| P3c-G | 修正候補 | application port/DI/UI/SQL/認可/schema/migration/依存は不変。Node adapter専用型付きdiagnosticだけを追加し、未知stageを成功結果にしない。規定checks/673unit/24Node/build、同bundle本体個人/WS/空結果/通常retryとdrain/restart、旧52表/6実体/5scope課算保全、明示7path commitを確認 |

変更pathはcommitの7件だけである。

- `packages/core/src/adapters/node/browse/searchDeadline.ts`: 同host時計・deadline発行・decimal検証・開始余裕。
- `packages/core/src/adapters/node/browse/searchExecution.ts`: bigint deadlineと親診断。active1/queue16、cancel後closeまでslot保持、stopの待機順は保持。
- `packages/core/src/adapters/node/browse/searchDiagnostic.ts`: 固定stage/有限数値だけの別kindとobserver型。恒久ログpath/UIを新設しない。
- `apps/web/app/worker/node/searchSupervisor.ts`: 同期限の解釈、monitor/Worker終了の分類。DB/SQLはmain threadへ移さず、100msの終了余裕と自己SIGKILLを保持。
- `packages/core/src/adapters/node/__tests__/searchDeadline.test.ts`: bigint精度・境界・不正progressの3単体。
- `packages/core/src/adapters/node/__tests__/searchExecution.integration.test.ts`、同 `fixtures/searchOutcomeWorker.mjs`: 新6対と既存4対を接続。

searchQuery、read snapshot/tx close、業務clock、検索意味/normalizer/projection、通常write UoW、保存/履歴/20版/codec/physical claim/FD方式は無変更。条件付きのtx.close例外時client.close未到達という既存source観察は、元事故の原因と証明されておらず今回変更していない。P2d-2-FDの全体再openは行わず、search自身のclose/drainをA/Gで狭く確認する。既に受入済み30変更枝は不変部分へ既存根拠を適用する。

## 修正後の限定試験

2026-09-11T10:44:36.533+09:00、同じ自己childのtimeOrigin±60秒注入を保持したまま、hrtime方式でnormal206.7ms/+60秒279.4ms/-60秒266.6msが全てclose0で成功した。`diagnosis-hrtime.json` を参照する。5親子hrtime対も全て親側の区間内だった。時刻値の差を消すためのOS時計変更は行っていない。

初回関連suiteは10:45:48開始、8/10成功。queueの「必ず1fork」というfixture期待は、個別受付の時刻差により残100ms超の2要求目を正当に開始できるため不適切だった。現在は各fork時の残予算が100ms超/3秒以下、期限消費した待機要求の未fork、同executor次正常を検査する。製品のqueue上限や期限を緩めていない。もう1件は無変更800KiB投影のPROJECTION_TIMEOUT、実3.142秒。同じ入力/製品3秒制限で後続関連suiteは成功し、初回失敗を保持する。

| 最終command | 実日時JST・結果 |
| --- | --- |
| `pnpm typecheck && pnpm lint:fix && pnpm format` | 10:48:58〜10:49:04、exit0。既存27warnings/34infos。前回は自己fixtureの複数変数宣言1errorで停止し、その宣言だけ修正 |
| `pnpm test:unit` | 10:49:04〜10:49:17、63files/673tests、exit0 |
| `pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/node/__tests__/searchExecution.integration.test.ts packages/core/src/adapters/libsql/__tests__/browse.integration.test.ts --maxWorkers 1 --no-file-parallelism` | 10:49:17〜10:49:34、24/24成功。新runtime6＋既存runtime4＋browse14。直前10:48:20〜37にも24成功 |
| `pnpm build` | 10:49:34〜10:49:43、exit0。既存同名CSS出力warningは別記し、今回のruntime修正原因としない |

最終sourceは上記全command後に製品変更していない。670旧unitを借用して673と表示したものではなく、673は標準command全量を実行した。旧256Node全量は不変部分の借用であり、今回全262を実行したとはしない。

新runtime6対は、±offset、Worker exit7/throw/不正replyから同executor次正常、result送信後もnative SQLが残る場合の期限SIGKILL/close不採用、queue待ち込み/expired不fork、liveとqueuedの取消後close前の次fork拒否、専用query_onlyによるINSERT拒否。read/auth/current scope/SQLの既存14対と、既存runtimeの通常・期限・stop・投影境界を合わせた。結果messageだけで成功にせず、native workとWorkerを含むprocess終了/closeを待つ。

試験DBは既存createTestContainerの自己専用DBと限定Workerだけ。main storageを参照せず、自己tempの通常試験cleanup以外の実体削除はない。browserのtransport失敗とnative runtime不成功は別の対である。

## 本体・通常停止と再起動

manual-testとagent-browser参照を使用した。今回の単独所有/全体cleanup禁止を優先し、補助を起動せず、自己session `p3c-fresh-r1-owner --restore` だけを使用した。通常Chrome HTTP User-Agentを明示。既存private auth helperへ正しい許可session名を渡し、値を読まず通常signinした。key/資格情報の値・hash・helper全文・cookie/env一覧を出力していない。

旧87071はcwd/freshDB再照合後TERM、ESRCHを確認。34443のdraining/exit0/error0はVerifier一回pollの借用。build前に終了し、live distを上書きしていない。修正後初回productionはsession86248/PID6379。

- 個人64件/初期50件、通常query空、title昇順hardopen、混合 `東京 cloud` のpalette候補50件とalert0。
- paletteのread通信だけをabortしalert1/候補0/再試行表示。解除後Tabで再試行へ移動しSpace、alert0/候補0の正当な空結果へ回復。再起動なし。DB/runtimeの物理停止をこの対で証明したとはしない。
- 現WS6件、reload、空query/該当なしquery、390px、back。最初のWS観測はstreaming中の「ワークスペース（確認中）」であり成功根拠にしない。後続ready/reloadで6件を確認した。
- `empty-query.json` のcards1は汎用 `main h2` の空状態見出しを数えた値で、note1件ではない。h1「ノート0件」とalert0が結果。個人64/global71/初期page50を混同しない。
- 新6379をcwd/DB再照合してTERM。10:55:09前にdraining/exit0/SystemError0・ESRCH。新runtime自身の通常drainを確認した。
- 再buildなしで同bundleをsession67941/PID12333へ再起動。10:56:43の個人64/初期50、10:57:38のWS6/alert0、同restore sessionで再訪成功。自己browserはclose済み。2枚の画像を保存し、判定はDOM/操作結果で行った。

UI初動で停止中サーバーへopenしたERR_CONNECTION_REFUSEDは自己readiness順序の失敗。HTTP200確認後の通常open/signinを正常根拠とした。最初のpointer triggerではdialogが未表示で、Ctrl+Kの通常keyboardでは表示・検索に成功した。未変更UIの原因や新不具合をこの一回から断定せず、全UI改修へ広げていない。

## 最終保全と識別

start→endの52表比較で旧行の削除/変更0。追加は通常signinのsessions1行だけ。notes71/assets2/originals3/revisions79、71projection、8tags/133relationsは保持。end→同bundle再起動/再訪後finalは52表全行差0。FK0/integrity ok。原本/本文/版/pin/creator/role/設定へ変更していない。

6payload objects/2659Bは全bytes/SHA一致、追加・削除0。5scopeを同じ製品scopeCapacityQueryでstart/endの専用copyから計算し、全差0、実bytesは個人2143/ownerWS516/他3scope0。owner lockはprocess別metadataとして課算/実体不変集合から除外する。

保全helperの空SQLite結果JSON parseと、診断再実行の排他結果file衝突は自己helper失敗として保持。出力名/空配列扱いを訂正した。元診断JSONは上書きせず残る。自己診断用生成bundleは修正後再生成されており、旧source識別は開始commit/sourceと旧診断JSONを参照する。

| 対象 | 最終識別 |
| --- | --- |
| commit | `c5bcfc920d018c45353066b42dd3f63dfbe3d010` |
| source762 | `6746668eb04802ea472a9047397756dfead7e5daf7e941b1da1ee516c222587f` |
| pnpm-lock | `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` |
| server.node.js | `cb8827bdc2fe39c1054558650cd4950155d577146198184bc817e5ea7f5316af` |
| searchSupervisor.mjs | `c64c52954e3c50b8c22a2d24de708025bc58ed205568e38ea24383286b05116d` |
| searchQuery.mjs（不変） | `f2d66b8887ee1273d5396362adc6befd89a37998d1bc7f8bf76ee6d47050c275` |
| noteProjection.mjs（不変） | `55a3ab762a09b7b22abaf091dd1f8f1a3334942a1eb549929cd2714778694133` |

10:58:24.647のcommit後source/lock/bundleはcommit前と同一。7pathだけを明示stageし、cached manifest確認後に通常commit。hookによる製品変更なし、製品unstaged/cached差分0、未追跡は管理 `.goal-implement/` のみ。push/PR/公開なし。

自己資材rootの非DB56files aggregateは `189c1fc10ea5b9e63a052d16e1a06d80e4b9ea2abd4f4f152194940c4a55eaf8`。相対pathをlocaleCompare(en)順、path NUL bytes NULで集約。DB/sidecar、manifest.json、owner lockを除外し、各fileのbytes/SHAはrootのmanifest.json。新DB/clone/evidenceを保持し、旧固定資材は無操作。自己rootはcurrent uid・nonsymlink、dir0700/file0600を確認した。

## 環境返却と未確認

現productionは **session67941/PID12333、Node22.22.3、127.0.0.1:3000、cwd apps/web**。DB `file:/Users/hikaru/.local/share/hollow/verification/p3c-20260911-dyHGjx/app.db`。同fresh rootのobjects/mailbox、local mail、同private/invitation.key path設定を保持。APP_URLは `http://localhost:3000`、NODE_ENVはproduction。key値/値hashを取得していない。

元R1でclock補正が実際に発生した因果、全OS/異clock namespace・suspendの厳密停止時刻は未確認。3秒は採用された総予算判定であり、OS scheduling停止中の即時HTTP応答を保証しない。

自己browser/hooksは解除・close済み。専用test/command/helperは全終了、補助なし。productionだけを上記状態で引き渡す。本書の全文確認と最終時計記録後、製品・DB/browser/helper・git/hash・報告を含む全自己操作を停止し、独立再確認を待つ。
2026-09-11T11:01:56+09:00 の実時計確認と本書全文確認後、この追記をもって文書を含む全自己操作を停止した。
