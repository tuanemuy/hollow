# P5c-1 S5a 独立確認

## 現在の判定

2026-09-30 13:00 JST。候補 `96f5c33705f10fe14e7115c9c0ffa975b9047734` は **固定A〜FのS5a局所範囲で合格**。新22＋比例25＝47対とworkspace型検査を独立で直接実行し、失敗/未処理error0。コード読解と対応する範囲に新たな不合格はない。P1-EはTS boot/stop接続、P5a-Cはfence/dispatchの局所だけを判定する。

P5c-1 A〜F全体は未完。本体boot/build/dist、実ブラウザ/390px/keyboard/CSP/Picker SDK、actualfresh0038、実Googleは未検証。特にproductionの `start:node:prod` が使うmjs launcherへの停止順序反映は後段残件であり、今回のTS局所合格をproduction launcher成立としない。

専有I: `/Users/hikaru/.local/share/hollow/verification/p5c1-s5a-independent-20260930-eby7ZJ`（0700）。主停止・所有返却後に作成。旧rootの許可4public helperはmetadata→全文read→排他copyし、実行は新Iだけ。製品・管理正本・旧proof変更0。最終37files/28,827B、DB0、自己known17PID全ESRCH、全runner/前任childのpipe終了、HTTP11要求・自己server/client socket0、未回収exec0。

## 条件別判定

| ID | S5a局所判定 | 直接根拠と限界 |
| --- | --- | --- |
| P5c-1-A | 合格 | R2の自己native受信とcallback current/browser拒否、transport12、serverの既fence後dispatch順。認可applicationはfake、実Google/SSO成功ではない。 |
| P5c-1-B | 合格 | factory6の固定endpoint/同generation構成、実NodeDriveHttpを自己loopbackへ束縛したmetadata1要求。旧server再検査/Picker保存契約は不変更借用。実Drive/Picker/CSP未実施。 |
| P5c-1-C | 合格 | 受信登録・停止race、前任実終了→同DB閉鎖保存/ACK、unknown時DBclose拒否→後の明示drain、既取消/純GETとclosure10。R6の遅いworkはfakeで、OS未閉鎖socket故障を実証したものではない。create/409等の新実HTTP0。 |
| P5c-1-D | 合格 | D1〜D8＋旧解除対。local解除はconfig/protector可用性非依存、現在actor/command/epoch/settings/CAS、queue例外/live1、unknown owner保持/後のfake close、同command receipt/terminal非復活。SSO session保持・provider仕事0。実画面とP5c-2 backup取消は未完。 |
| P5c-1-E | 合格 | 解除buttonだけ未構成fieldset外へ分離しbusy/current/確認/ACK純GETを保持する2component対。専用受信のOrigin/有限shape/秘密headerはtransport12/R2。構造イベントであり実DOM/layout/SDK成功ではない。 |
| P5c-1-F | 合格 | 13pathの内向き依存、factory/root/local保存の直接47、型、指紋・終了・有限資源。lint/formatは現候補の主成功借用。DDL受入移行/build/fresh/本体配備は今回0。 |
| P1-E | 合格（TS source boot/stopの局所） | createDriveRuntime/NodeShutdownの直接対とserver/listen TSの静的配線。production mjs launcherへの同期、本体boot/正常配備は後段未完。 |
| P5a-C | 合格（fence/dispatch局所） | 最初のawait前Drive登録→旧fence→旧Google→旧OpenRouter→Driveの順を読解、R8は自己native HTTP＋旧handler fake共存。実SSO/OIDC再検証ではない。P5a-G等の不変更受入を再openしない。 |

## コードと実行根拠

採用design 931〜937行、S5-planの9/30 exact追補全文、固定plan A〜F/旧影響、CLAUDEの型・内向き依存・UoW規約に照合した。主正式報告も全文読了。製品差は報告の13pathだけ。

### 受信・停止・所有

`apps/web/app/driveRuntime.node.ts` のhandleは専用3pathだけを最初のawait前にMapへ登録する。controllerをRequest.signalへ接続し、finallyでhandler終了を記録する。server.node.tsではこのhandle内で旧resource guardとauthentication fenceをawaitするため、await中にquiesceしても未登録の専用仕事を残さない。dispatchはaccepting/signalを再照合する。一般requestへの新強制取消はない。

quiesceは受付拒否/timer解除/abortを同期で行い、S3 runner.stopと受信taskのsettlementを監督する。失敗時はstoppedを立てず、drainingだけ解放して同じ停止世代の明示再確認を許す。新受付やclaimを再開しない。R4/R5/R7、R6でこの範囲を直接確認した。

`driveHttp.node.ts` はbody readerのcancelとread終端を待ち、cancel未解決をhandler終了としない。`nodeShutdown.ts` はquiesceとlistener.closeを並行開始して両方をallSettledで監督し、両成功後だけshutdownへ進む。R4では受信handler保留中のDBclose0とlistener drain開始、R5ではpartial bodyのapplication未到達・有限拒否と別のnative socket終了、R6ではunknownのDBclose0と後の閉鎖保存/ACK→明示drainを確認した。

body cancel、Response生成、handler終端、outbound close、caller DB ACK、listener/socket closeは異なる根拠である。R4はoutbound/application gate代替、R6は実DBとdeferred workであり、実providerの通信故障へ拡大しない。前任R3だけは専用child1の通常IPC終了/exit0/pipe EOF-close/ESRCH→後任取得→DB owner closed/failed→ACKを実証する。

`server.node.ts` は初期maintainをawaitした後にrunnerを接続し、旧shutdown相対順序はquiesceの後に維持する。factoryはclock/tokens以外の内向き資源を受け取らずDBをimportしない。未構成ではconfig/FS/owner取得0。構築失敗後はexecution stopと永続owner記録保持を分離する。実本体boot失敗の全資源精算をfake root試験だけで保証しない。

### local-only解除

`control.ts:171`以降の専用admissionはdriveActor、actor+command digest、跨表衝突、epoch/settingsを検証し、linked/needs-relinkの保存済subjectを使う。protect/reveal/availableを呼ばない。同commandはsameDriveActor/digestを照合し、terminalはreceiptだけ返す。

第2Txでも現在actor/subject/epoch/settings、cancelGeneration/期限/queuedを再照合する。旧attempt/controlの取消intent、connectionのcredential/folder null化とepoch/version進行、disconnect completedを同Txへ保存し、旧owner値は保持する。commit後に実executionがあるときだけexact abortを通知する。service不在をHTTP閉鎖/枠解放として偽装しない。D1〜D6は実DB、D4の外部closeはfake。D7/D8はcomponent構造イベントで、未構成/needs-relink解除導線とbusy/確認取消/ACK純GETを確認した。

## 直接実行の内訳

新Iのrunnerはtype/unit/dbだけに制限し、lint/format書込みと旧factory/root replay環境変数を削除した。labelは全て正規初回 `*-01`。cache:false、新I内cacheDir、TMPDIR/gen1/db、worker1/bail1。元rootの鍵/config/runtime/results/cache/DBは読取・コピー・実行0。

| 終端JST（自己結果mtime） | group | pass | 証跡 |
| --- | --- | ---: | --- |
| 12:57:21 | settings | 2 | settings-01.json |
| 12:57:31 | transport | 12 | transport-01.json |
| 12:57:41 | factory | 6 | factory-01.json |
| 12:58:01 | root非DB | 5 | root-01.json |
| 12:58:27 | application | 9 | application-01.json |
| 12:58:36 | root DB | 3 | rootdb-01.json |
| 12:58:48 | closure | 10 | closure-01.json |
| 12:59:13 | workspace typecheck | exit0/診断0 | type-01.json |

47は新22＋比例25、重複なし。全groupは実test名集合完全一致/失敗0/未処理error0/moduleFailed0。Settings旧6/app旧45は選択外で成功数に足さない。型を対数へ加算しない。全8runでchild exit/close、両pipe EOF/close/readableEnded、ESRCH、DB directory空を確認。初回から成功し再試行0。

F2実行前にnative requestの最終URLとoptionsのprotocol/hostname/portが自己actualaddressへ束縛され、任意socketPath/host/auth/createConnectionを拒否するsourceを照合。直接結果はrequests=received=1、nativeMatch/valueUsable/proofClosed/serverClosed/stopped=true、両socket0。旧443試行を再現していない。

rootの累積要求10/response close10、全listenerClosed/serverSocket0/clientSocket0/pending0。R2のsecure/issued/repeated/selected/callback/foreign=true・exchange1。R5 cancelledWithoutApplication/finiteResponse=true。factoryと合計11要求、5listener lifecycle。保守予約11×128KiB＝1,441,792B≤2MiB（上限12要求）。記録の部分header/body値11,943Bを全wire実測としない。

## 借用・未実施・履歴

S3 adapter/execution/runner、domain/repository/UoW/ports、S4fix Result、Shell/Historyと旧認証本体、migration全体/lockは不変更。S3 wire26/authprune8、S4 pure17/persistence20と今回選択外app45、旧移行3の対応範囲を借用する。closure10とtransport12は今回直接であり借用数へ重複合算しない。旧ほぼ空synthetic移行をactualfresh保持へ読み替えない。

主最終型/lint/format成功のうち型だけ独立再実行し、lint/formatは同commit適用として借用。主の初期type2未記録PID/outcome、旧F2の443接続成立不明、外cache29,375Bは履歴限界のまま。独立が旧資材やprocessを探索して補ったものではない。今回新Iの成功で旧逸脱・未確認を消さない。

ManagerからS5b静的調査として `start:node:prod` のmjs launcherは旧close→shutdown順のままとの共有を受領した。これは今回TS試験の実production適用を制限する具体的残件で、独立の新boot実行結果ではない。S5bでの最小同期・build/配備確認を待つ。今回scopeを増やして修正していない。

独立準備では未存在の公開source path1件をrg対象へ含め、file-not-foundを観測した。製品実行未到達の読取準備差であり、秘密/本文/rawerror/stackは出力していない。公開資料の表示切れは必要節を分割再読した。候補testは有限safe reporterだけで、raw assertion diffを保存/出力しない。

## 識別・容量・終了

start 12:57:13.946、final 13:00:04.814（JST）。13個別bytes/hash配列とSQL配列は開始終了同一、現在bytesは全HEAD blob一致、製品dirty0、所有外apps/packages/migration/lock差0。JS既定sortしたrepo相対pathごと `SHA256 + two spaces + path + LF` の連結SHA256。

- commit: `96f5c33705f10fe14e7115c9c0ffa975b9047734`
- 13path: `f9616e709b5371c921c0d9326db8d012be78d9d1f7cb08f4dcf9b4df58e75fbf`
- 基点: `a85ccdd84bd1a690e68e752e8d38cf904d11aebf`
- 0038 SQL: `d305836ed40bd36d9febf05aaab9c8b1552dbf7b80b23c097110adc428670112`
- snapshot: `653718f0094ce5651e6f6897669c8290446a7af0d2913e6eb3ea3f5fb84944fb`
- journal: `83885ffaf002e254a1f983ec61714e587b06c10dcbad4061a284875484b2e5a8`
- lockは上記基点から不変更（受入値613e2f8c…425e498）。

最終Iは37files/28,827B＝material1,207B＋other27,620B、DB/WAL/SHM0、失敗DB0。32MiB/active16MiB/max2・256KiB/8MiB内。fixtureは逐次active1、終了時FK照合/client.close後、通常成功時だけ自己exact DB集合を正規finally回収。予算確保のための証拠削除0。自己AES2本64B・config/runtime記録を保護保持。runtime実3directory/成功acquire4（configured1/partial1/predecessor2）で、許可4directory/acquire5以内。collision再試行rootを作っていない。

8runner＋8test/type child＋専用前任1＝known17PID全ESRCH。前任pipeはR3直接assert、8runner childの全pipeは自己結果で確認。自己HTTP/socket/caller/in-flight0、DB0、未回収exec0。未知PID/port、旧3000、fresh/D01/旧backup/実外部/Browser/build/native converter操作0。保護材料は残すがlive所有資源はない。

報告EOF全文を確認後、文書を含む全read/write/runを停止しManagerへ環境所有を返却する。A〜F全体完成やS5b実装へ独断で進めない。
