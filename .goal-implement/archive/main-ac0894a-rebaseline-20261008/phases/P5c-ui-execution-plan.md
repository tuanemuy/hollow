# Drive 残 UI の実行計画案

## 現在の提出：新C archive build / static 成果完了

2026-10-05T20:32:41.608496+00:00。C=`c2a3d45f1097533c6344346aca303dc1d2aef368`、新B=`/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-348847e5-ea53-4aed-8940-995bc59826e8`。正本 `B/material/release-manifest.json` =3,701B/SHA256 `93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0`。build manifest=`d5b65fa0f990f38a8a0c0b493a6b65e7b8eda8c7e6e4636660509bcbf86f2db1`、artifact manifest=`8fe6c835d3aa9d2f81b346758ba13f441dad602cdf3d5732498becc7316afa72`。独立成果照合へ提出する。

archive PID13954 actualexit0/0.622秒、Vite13955 0/4.695秒、search13956 0/0.465秒、static AST14026 0/2.261秒。各known自己PID/PG absent、redirect FD closed、PIPE構造的不使用（EOF成功へ読み替え0）、stop不要。通常direct Vite→success search一巡、install/download入口0。新1457blob/20,978,281Bは前後C同一、492outputs/23,200,855Bは最終hash同一。97 exact dependencylinks SHA256 `96f2f8da6b8055ef3bd52ec9ec58f9fbfcd6f353f51022539af218e06afc353f`＋trackedAGENTS唯一例外、@repo/coreはこの新sourceへ解決。dirs700/files600直接最終確認。gzip4,723,219B、peak root55,515,311B、release込みfinal55,522,484B（source26,388,825/dist23,200,855/log49,388/TMP5,883,416B）、全採用上限内。

新Bの **named NodeDriveBackupSource** はD/server/server.node.jsの同名localclass、entry SHA256 `5ecc231d17b11d31b9de23a50199fe141366dcf3120174f709b952cd592d0573`。BusinessRuleErrorは同entryがD/server/assets/query-G26IDSH8.jsの **a** をimport、class=BusinessRuleError、chunk SHA256 `bb2b1bf41a2bea332c16627bd8d77e9c1f89204966e5dff09adc6ddd0fd5656b`。名前/hashは新Bから直接採取し、fae1流用0。BackupSource/FileObjectStorage/ObjectReadCloseUnprovenError/private readCloseUnproven Symbol/guard と backup lifetime error/CoordinatedObjectStorage guard は同main定義graph。BackupSource.closedはsource.closedそのまま、closed.reject時register release0のshapeをAST class/function参照と原本sourceで確認。private寿命class export追加0。

AST482modules/3329literal edges（relative2820/bare44）、relative欠落/escape/@repo-core-source/.ts残留/必須bare欠落0。optional caught bufferutil/proxy-agent/utf-8-validate未解決は継承しPDF実行0。両RSCmanifest SHA256 `3578217914f8efab1f843c0fdfd55b0929304cd9e113214687f0cf83693deb03`、各69clientreference/bootstrap1/unique89(JS82/CSS7)全存在・missing0。entry.bootあり、static servingはentry相対../client→このD/client、cwd=Wのrequired16aux全存在。同bundleをUIへ再用する静的gateは成立したが、boot/HTTP/UI成功とは称さない。

全product/test/docs/publicgenerator/source/dist/builddata writer停止、全check/build/static process終了・実行session残0、所有権をManagerへ返す。UIroot/5helper/DB/runtime/browser/profile/外部追加操作0、旧B/root/helper非操作、audiohold維持。UI工具/profile正式採用はManagerの別準備であり、このtaskで変更/調査0。5helper作成は独立artifact照合後の明示followupへ留保する。以下の過去「preflight待ち/未build/旧C/B」の節は履歴で、現在結論は本節と新release正本。

## 現在の提出：新C archive generator preflight 待ち

2026-10-05T20:25:39.296433+00:00。製品C=`c2a3d45f1097533c6344346aca303dc1d2aef368` は停止/変更0。新公開工具 `.goal-implement/helpers/p5c-ui-build-generator.py` =14,610B、SHA256 `f7fc4c63ebcfc468c547b8cfa06320f4ef779df7a33ec4d72f9401dc802e9056`、regular600/nonlink。既採用公開base全文読取と13,811B/SHA845db9b682fefeb57a8cb4a81ea6cdd60c12ae90bcb9f28e68cfe5a2618d152c/mode600を直接確認、旧private工具/B読取0。

差は5箇所だけ：C、fresh root prefix `goal-implement-p5c-ui-build-modechecked-20261006-`、inner標準library re追加、生成entryの正規namedexportリストからNodeDriveBackupSource一つを確認する有限検査、named export local binding/entry SHAをbuild manifestへ記録。差の逆適用はbase全bytes/hash同一、outer/inner compile成功（実行prepare0、pycache0）。この字句検査は後続AST module/class/import/private Symbol同graph照合の代用ではない。未知export構文・namedexport欠落は正規build失敗としてrootを保持し自動再build0。

資源・生成writeAPI/0700/0600・97宣言link/@repo/core新copy/唯一trackedAGENTS例外・gzip8/source32/dist208/log8/TMP8/root256MiB・archive60/extract60/64KiB増分/200ms全tree cadence・direct Node Vite→成功時search・全600/自己PG TERM10 KILL10/PIPE不使用の既採用契約は差0。全writer停止。新B/root/CLI/DB/Worker/runtime/browser/profile生成・起動0。独立helper preflight/Manager採用後にだけprepareで新absoluteB/C/97link manifestを固定通知し、一巡実行する。UI工具/profile gateはこのarchive buildから独立して未決保持。

## 現在の提出：同bundle named export 準備完了

2026-10-05T20:19:48.025641+00:00。新C=`c2a3d45f1097533c6344346aca303dc1d2aef368`（親863097f）。製品差は `apps/web/app/server.node.ts` の `export { NodeDriveBackupSource } from "@repo/core/adapters/node/drive/backupSource";` 一行と空行だけ。既class実装/logic/ports/DDL/他exports変更0。規定 `pnpm typecheck` → `pnpm lint:fix` → `pnpm format` は全actual exit0。lintは既存346 warnings/59 infos、unsafe fixes未適用、lint/formatとも変更0。diff-check成功、commitは製品1pathのみ。

全product/test/docs writer停止、補助0、checks全process終了済み。newB/helper/root/browser/DB/外部操作0、現fae1/旧全B/private非操作、音声保留を維持。新Cの同bundle namedexport/chunk/privateSymbol同一性は **新build未実行** のため未検証。独立deltaレビュー後、別新B/新manifestでexport名・hashを再固定する。現fae1のaliasを新Bへ流用しない。

UI工具/profile gateは未決のまま保持する：計画のPlaywright exact public installed package/sourceは未確認で、repo storeにplaywright*なしというVerifier報告を採用。launchServer案を実在/採用済みと扱わない。Root確認済みpublic puppeteer-core25.11.0 canonical packageは `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/puppeteer-core@25.11.0_yauzl@3.4.0/node_modules/puppeteer-core/package.json`。その公開Browser.process/CDP/locator API、Chrome profile内SingletonLock/Socket/Cookie等の有限nativecontrol例外・target/ownPID/mode/no-follow/終了残欠測はこの準備taskでは調査0。工具・profile正式補正版の採用前はbrowser起動blockを維持する。

以下は先行静的計画（2026-10-05T20:00:51+00:00）の根拠と未採用実行案。製品1exportの提案部分だけ今回採用/実装済みであり、旧C/B bindingは将来新buildへの固定値ではない。

2026-10-05T20:00:51.861173+00:00。Manager 採用前の静的計画。今回の変更は本書だけ。helper/root/DB/runtime/browser/外部生成・実行0、製品/source/dist変更0、旧helper/root/B/PID探索0。入力は [再開案](P5c-ui-resume-plan.md) と [独立レビュー UI-P1](../reviews/P5c-ui-plan.md)。S3 A–E受入、checks/移行/局所backendは借用し、残UIだけを一巡する。

## 判断と起動 gate

BusinessRuleError の公開 alias は確認できた。execution の work 捕捉前と provider の application 捕捉前の二方向は、下記の限定 facade で成立可能。一方、source BackupSource が built storage の private closure error を識別できない重大な起動 block がある。現C/Bのまま通常終了だけを仮定して進めない。helper実装・実行は、Managerがこのblockの処置と資源補正を採用し、独立preflightが合格してからとする。

最小製品提案は `apps/web/app/server.node.ts` 一pathから `NodeDriveBackupSource` を同bundleの named export として公開すること。helper は built storage と built BackupSource を接続し、実source execution.register callbackを渡す。storage→source→backup runnerのObjectReadCloseUnprovenError/private Symbolが同一となり、寿命errorを変換せず保持できる。この案には新C・新archive build・export/hashの再固定が必要であり、現在の実行許可に含めない。新C/Bでexport名・chunk名・class参照・全hashを新manifestから再固定し、現fae1のaliasを将来成果へ流用しない。既受入機能の再設計や新error契約を求めない。

class統一を優先して調べたが、現bundleのNodeDriveExecution/BackupProvider/BackupSourceの公開exportは0。全built factoryの再用も `loadDriveConfig` が自己HTTP callbackを拒否するため現在案へそのまま接続できない。private namespace探索・constructor probe・prototype変更・名前/構造だけでの寿命error認識は行わない。採用するbuilt BackupSourceのclosed拒否時にsource execution.registerのreleaseが走らず、register/caller/closed/proof/ACKが実保留のままになることを公開source graphと既source unit/native寿命根拠で照合する。Unprovenは変換対象外の同objectを通す純対を必須とし、private brand/proof/close/ACKをfixture成功値へ偽造しない。追加native寿命fault再演・classexport・FS monkeypatchをこの計画の自動要求にしない。

## 固定候補と公開 binding

C=`863097f628f3bd5c7ffcc4b43ed0e590ed0cfc4b`。
B=`/Users/hikaru/.local/share/hollow-validation/goal-implement-s3-build-modechecked-20261006-fae1de7c-4c33-4fba-957d-6cc367e1082e`。
S=B/source、W=S/apps/web、D=W/dist。旧Bは全非操作。S3の1457blob/97links/lock同候補・AST482module/RSC69reference・必須JS82/CSS7存在・相対client/Worker/Nodeentry成立を借用し、重複全scan/build0。

| 現公開成果 | exact export/binding | SHA256 |
| --- | --- | --- |
| D/server/server.node.js | named `boot`、`S`=getContainer。先頭で次chunkの `a` をBusinessRuleErrorとしてimport | a90bd5c845ef2b5ad9bf9310dbe958ce08682bae02e768c38c5df54062e54dac |
| D/server/assets/query-G26IDSH8.js | `a`=BusinessRuleError、`o`=RehydrationError。aはCodedErrorを継承 | bb2b1bf41a2bea332c16627bd8d77e9c1f89204966e5dff09adc6ddd0fd5656b |
| D/server/assets/errorResponse-CDDbq5iI.js | 上記classがimportする `s`=CodedError | e430ae6123173b5abaf239dac7e6fe019391a298c36de621d0b929b63c6c3ee1 |
| D/server/nodeShutdown.mjs | named `createNodeShutdown` | 2de9a259cd47304c93dfe7a8086d9642e9def0ed55a5bd2401d99ffd69cd940c |
| B/material/release-manifest.json | frozen source/dist、runtime未起動の正本 | 7ad07fccdc3d60e211d1ffdcf4f34557ab34a070b1e2e7834462ab0d8d9e90b1 |

blob照合基点はB/material/source-manifest.json（SHA256 `1e899fa32a3afaec81e53036624cea49c95313daebc185de463f0e961142b603`）。現source binding: execution.ts=`81f744751be47b029bfe260bcb932ecdc5a6a911`、backupProvider.ts=`692a3308c41dad3c41e8a26913c2b58219035996`、domain/error.ts=`9795fe18aee9c24fc9f18bfb90ec0f8a7190d241`、backup/runner.ts=`3e5589e358df93a7026e976335dd3220e40d7b03`、drive/runner.ts=`142c806192705039339a885f5c323e39f6ff386b`、server.node.ts=`3ee2fdaeb0e511199b8b927798a77f823d8ea22d`。必要sourceはこのSのexact TS pathだけをimportし、@repo/core解決もS/packages/core。元workspace/旧bundle/旧launcher候補探索へfallback0。新export採用時はこの表を新候補へ更新してから実行する。

## 新5helperとcomposition

採用後に次の5pathだけ新規作成し、独立read-onlyレビューへ渡す。旧helper read/hash/import/copy0。新公開helperはwx/600、dir700、各hashと依存/起動argvを固定する。新UI rootは別途一回exclusive/0700で生成し、ここでは名前を予約せず実生成前absoluteを通知する。

| exact新path | 責務・現在の公開API |
| --- | --- |
| .goal-implement/helpers/p5c-ui/boot.mts | exact D/server/server.node.js のboot、nodeShutdownのcreateNodeShutdown、正規libSQL migrate→close→boot一回。boot依存driveFactoryの型に従い、S/adapters/node/drive/{runtimeOwnership,execution,http,authorization,provider,backupProvider,secretProtector}.tsの公開class/functionを組む。BackupSourceは上記起動block解決が必須。memory Mailerを注入。port境界だけerror facadeを置く |
| .goal-implement/helpers/p5c-ui/provider.mts | NodeDriveHttpのDriveRequestFactoryに自己loopback native ClientRequestを返す。元URL/method/query/headers/bodyを検査し正規adapterの検証を通す。RSA1/資格/keyは新memoryだけ。fixture stageの有限state、native request/socket close ledger、memory mailbox、SDK document fixtureを所有 |
| .goal-implement/helpers/p5c-ui/browser.mts | pinned公開PlaywrightのlaunchServer→connect→context/page各1。新originの正規認証/2uploadsと以下6stageの実UI。document ticket/locator/dialog/count、pagehide/pageshow.persisted一周を記録。app current GETとprovider document観測を混在させない |
| .goal-implement/helpers/p5c-ui/contract-pure.mts | 下記UI-P1純対、document変化破棄/ACK後GET/一回mutation/confirm取消の正負対。FS/DB/Worker/socket0のmemory harness。boot/providerが使用する同じbridge/判定をimport |
| .goal-implement/helpers/p5c-ui/stop-audit.mts | 容量/mode/期限200ms guard、既知自己PID/PG・native Worker/FD/pipe/実終了ledger。正常close後だけactive→wx opaque→wx auditコピー、opaque未open・audit一回read-only query-onlyでFK/integrity/対象台帳照合 |

cwd=W。新envはDATABASE_URL=file:新root/active.db、APP_URL=自己origin、HOLLOW_STORAGE_DIR=新root/objects、TMPDIR=新root/node-tmp、PORT/HOSTNAMEと明示必要キーだけ。旧.env/read0。Drive configはhelper内の新値、LLM/OpenRouter/Google認証/ZIP/PDF実接続config0。正規migrationはS/packages/core/src/adapters/libsql/migrationsの同C全部を新空DBへ一回適用しclose、起動後job/target/record/ownerのSQL直書き0。bootの通常DI/runner/UoW/route/DB所有権を維持する。

### UI-P1 限定境界と純対

built constructorは上表a、source constructorはS/packages/core/src/domain/error.tsのBusinessRuleError。変換候補は `instanceof exactClass` かつ `Object.getPrototypeOf(error)===exactClass.prototype`、prototypeの正規toSerialized関数同一、code/messageはown data値、name=BusinessRuleError、retryable=false、serializer結果がexact kind=business/code/message/retryable=falseで一致し余剰fieldなし、対象schema code成功のものだけ。plain object、subclass、prototype/serializer改変、未知codeは同じobjectをthrow。toSerializedがthrowした場合も元errorを変更せず再throw。WeakMapの双方向対応により同errorの再投影/往復は元instanceへ戻し、same-error比較を保持する。cause/private lifetime brandやpayloadをコピーしない。

| 方向・適用箇所 | 限定対象 | 保持するもの |
| --- | --- | --- |
| built→source | facade.execution.run(target,work)が渡すworkのsync throw/async rejectを、source run内のPromise.then分類より前で捕捉。driveFailureSchemaのcodeのみ | work正常値・signal・handle/result/closed・target/receipt/proofをそのまま返す。result rejectionで後から修正しない |
| source→built | backup.provider.allocateFileId/startResumable/queryReceived/uploadChunk/inspectFileの拒否、backup.source.open/handle.prepare/readRangeのBusiness拒否（source構成が許可された場合だけ）をbuilt backup runnerのcatchより前で捕捉。driveBackupFailureSchema codeのみ | buffer/offset/status/file/成功outcomeを変更0。source.closeとclosedは無変換 |
| source→built | protector.protect/revealの同期拒否、execution.coordinate/withCaller/closure/acknowledge/confirmSourceAcknowledged/acknowledgePredecessor/stopの自前Business拒否。DRIVE_UNAVAILABLEのみ | available/caller/accepting/unacknowledged/predecessors/register/abort/revisionは単純bind。callbackを一般包囲せず、成功proof/ACK/boolean、closedの拒否を変換0 |

authorization/folders/httpのnative DriveTransportError、Error/DOMException/abort/DB provider errorは非変換。ObjectReadCloseUnprovenErrorはmain内部class+private Symbol、DriveBackupOwnershipUnprovenErrorも内部brand、ObjectOwnershipUnprovenErrorもexport0でありBusiness classではない。これらはordinary failure/成功へ変換0。特にsource BackupSourceの内部guard差はfacade外から直せないため上記起動blockを維持する。全method汎用catchは作らない。

起動前純対は最大24条件・一worker（test process）・30秒、DB/nativeWorker/FS/socket0。対は同じ実bridgeへ直接結び付ける: (a) 各方向の同期throwとasyncreject、(b) built→sourceがwork捕捉前にDRIVE_FOLDER_TRASHEDを分類できるmemory classifier、(c) source provider DRIVE_BACKUP_QUOTA/FOLDER_TRASHEDがbuilt instanceof+schemaへ達する、(d) code/serializer/prototype/kind/retryable改変とplain/unknown各非変換、(e) native transportのinstance/delivery/credentialRejection同一、(f) unproven closure error・closed rejectionのobject同一、(g) 同error往復identity、(h) success object/buffer/result/closed Promise/ACK/proofのidentity/value非変換。source→builtしたbackup codeがwork内でfailure値へ正規処理された場合、execution bridgeがその成功値を書き換えない。pureは実owner/socket終了の代用にしない。

## endpoint と一巡 stage

アプリは自己originのみ。generated serverFn IDは新Dの正規client/manifestから実UIが使うIDに束縛し、旧IDの直呼び0。通常serverFn=driveServerFnのbegin/create/continue/cancel/settings/receipt、driveBackupServerFnのrequest/previewRetarget/retarget/current/history、hollowAuthのbootstrap/signUp/verifyEmail/signOut/signIn。HTTPはPOST /api/integrations/drive/{picker,selection}、GET /auth/drive/callback、Picker /integrations/drive/picker、GET /auth/drive-result、POST /api/hollow/uploads/{currentUUID}。現在DTO actor/authVersion/browserEpoch/scope/note/originalが成立してから一意visible/enabled accessible locatorを一section内で選ぶ。

| provider許可入口（元URLを検査し実外部forward0） | method/用途 |
| --- | --- |
| accounts.google.com/o/oauth2/v2/auth | browser GET fixture同意document。予定唯一anchorへ移動し、app snapshot awaitなし。state/code/nonceはmemoryのみ、通常callbackへ戻す |
| oauth2.googleapis.com/token、www.googleapis.com/oauth2/v1/certs | POST token、GET cert。新RSA/JWT/PKCE/nonce/同subの正規NodeAuthorization検証。failed relinkはtoken/provider失敗を正規adapterへ返す |
| www.googleapis.com/drive/v3/files/generateIds | GET count=1/space=drive/type=files/fields=ids。folderID1+成功backupfileID1、総2 |
| www.googleapis.com/drive/v3/files/{id} | GET supportsAllDrives/fieldsを正規http constantsと照合。F1/F2/fileのmetadata・trash/404/hold、親/marker/hash/byte値検証 |
| www.googleapis.com/drive/v3/files?fields=id | folder POST。同一F2 ID2回、初回未作成response drop→次回だけ作成 |
| www.googleapis.com/upload/drive/v3/files | resumable POST1→exact session PUT。sessionはvalidDriveBackupSession条件、chunk PUT1/1KiB、status queryは上限3。普通のNative ClientRequest/socketのabort/closeを実観測 |
| apis.google.com、docs.google.com | 指定SDK script/frameのfixture応答のみ。既CSPを変更0、許可外host/path停止、fixtureからapp selection transport/controllerを通す |

| stage/期限 | 操作と直接根拠 |
| --- | --- |
| U0–U2 setup3分 | 新account1をsignUp1→memory verification mail1→verifyEmail1→signOut1→signIn1、明示bootstrap1（通常mount別count≤12）。cookie/DB注入0。text1KiBを通常2uploads、各begin/upload/seal1、DTO original/本文完成。initial Drive auth success1→Picker F1確認保存。N1初回not-startedに旧unknown/retarget0。N1 backup1でF1trash→failed/closed/ACK、復元案内。fixture外部復元済み切替→Picker再選択、confirm取消POST0→save。N1 retry1はF1metadata404・削除断定0/new allocation0 |
| U3 relink2分 | N2 backup1をF1metadata前hold。holdは20秒以内、failed/success relink各8秒以内として正規backup HTTP30秒/close5秒より前に取消へ到達する（運用deadline変更0、超過は当該根拠未成立で停止）。failed relink1→failed receipt/currentでfolder/epoch/settings/旧target/job/transfer不変。same-sub success relink1→epoch/version増・foldernull/OFF・旧backup取消。holdの実abort/socket/source/caller close→closed/ACK。fixture成功値で解放0 |
| U4 create2分 | F2事前ID1→POST1response unknown/未作成→owner実close。GETでPOST不増加、明示inspect404、resendconfirm取消POST0、同IDPOST2→metadata/親確認→本人confirm保存。別ID0 |
| U5 retarget2分 | N1旧closed/unallocated failureをF2preview、取消POST0→新command1→成功record/link→reload。旧target/job/results保持、新head/version/currentF2/record1。成功DOM差込み0 |
| U6 lifecycle1分 | Picker開始→通常document navigation/pagehide/dispose→Back一周。autoissue/selection0。persisted=true時のみmemory旧SDK callback解放→POST0。reload Backは旧realm消失/newGETと同document旧callback未検証。browser disposeをservercancelと同一視せず正規cancel1→currentGET→明示restart1 |
| U7 stop/audit2分 | 下記順で全実終了、wxcopy/audit一回。途中のstage不足も欠測として残す |

各mutation直前main-frame document ticket(origin/path/actor/authVersion/browserEpoch/scope/対象bool)とcurrent DTOを照合する。非同期document差では混在snapshotだけ捨て有限readで再照合、mutationの再送0。confirm cancel POST0、approve exactcommand1。ACK不明後GETだけ。秘密query/body/header/mail/password/cookie/key/error全文を出力/保存0、callsite/有限bool/count分類だけ記録する。

BFCacheは新profile/default flagsのうち `ignoreDefaultArgs=['--disable-back-forward-cache']` だけ変更、一周のみ。persisted未成立は同document遅着callback対を未検証とし、normal取消/停止へ進むという条件付き案をManagerに採用してもらう。合成pagehide/pageshow・追加往復で埋めない。他UI結果の成功とこの欠測は別項目で報告する。

## 有限資源・実終了

全12分(stage計720秒)・単一app/provider/proxy/Chrome/context/page・boot1・writer1。pure30秒はroot/DB起動前。UI新root256MiB: logicalDB3/48MiB(active/opaque/audit各16)、objects1MiB、helper/log12MiB、material256KiB、NodeTMP8MiB、ChromeTMP128MiB、新AES32Bを含む対称鍵総128B/RSA1 memory。各dir700/file600/wx/nosymlink、Chromeの新profileも一周所有する。通常生成native fileはumask0077で作成しmodeを200ms guardで検査、既存ファイルchmodで帳尻を合わせない。Bの宣言97dependency linksはread-only外部sourceで、UIroot symlink例外0。容量超過は即停止/保全し削除縮小再利用0。

mutation上限: Drive auth3、Picker issue4、selectionPOST2、folder selection/creationconfirm3、foldergenerate1/createPOST2同ID、backup requests4、成功filegenerate1/uploadstart1/chunkPUT1、controlcancel1。autoON/unlink/追加relink/再boot0。通常auth setupは上記各1を追加、uploads2各1。Hollow1800req/48MiB、provider80req/12MiB・同時2(held backup+認可/control)、背景deny150/1MiB。余剰予算は追加mutation許可ではない。原本2×1KiB・成功backup1KiB1file。

resume案のchild枠へ次の必要補正を提案する。2uploadsは各detect1/extract1/initial projection1/completed projection1でnative Worker計8、同時2以内。normal browseはsearchSupervisor forkとそのsearchQuery Workerを使うため、browse query≤16/fork≤16/各Worker1・同時fork1を別枠にする（予定document/再照合/reloadで必要な範囲、数を満たすための操作0）。webWorker≤2。LLM/Drive再生成/PDF/ZIP/音声Worker0。boot.helperは起動前に公開node Worker/forkの限定観測を登録し、exact新Dの許可pathだけ、元args/戻り値/stdio/terminationを維持して自己生成handleを収集する案とする。監視実装の型/正負対とpath一覧を独立preflightで固定し、観測不能を終了成功へ補完しない。

Chromeは公開launchServer.process()の自己handle、browser.newContext/page各1、新temporary user-data-dirをChromeTMP下へ固定しmodeを確認。Chromium子はCDP SystemInfo.getProcessInfoでこの新browser自身のPIDだけ取得し最大16、profile/renderer/utility/GPUを区分。既知PIDのPPID/PGだけ限定確認し広域process/env一覧0。browser tool child1/probe1、Chrome親1+子16、app child1、search子16（逐次）を有限枠とする。各stage前に新endpoint/id/contextとcountを固定、上限手前の未知生成は停止。Firefox/別Chrome/context/page/追加profile0。

停止はbrowser page/context→browser.close/BrowserServer.close→自己Chrome親/登録子exit、app正規quiesceとlistenerclose→shutdown(DB/runner/ownership stop)、provider/proxy server/socketclose→helper実exitの順。createNodeShutdownの正規drain失敗を成功に書き換えない。native Worker exit/各stdout-stderr end-close、search fork exit/close/IPCdisconnect（stdioはignoreのためPIPE不使用）、app/driver両pipeEOFとFDclose、Chrome transport/server FDcloseを各別ledgerへ記録。Promise resolvedやTERM要求と実exitを区別し、終了未観測は欠測として保持する。

watchdogは200ms・外720秒。正常停止120秒枠内、期限時は新工具が保持する自己knownPID/PGだけTERM10秒→KILL10秒→pipe10秒、Manager/他PGへsignal0、探索0。kill終了も正常drain/DBclose根拠へ読み替えず、未証明時copy/audit0。全writer/Worker/socket/DBclose確定後だけactive→新wxopaque(unopened)→新wxaudit、一回audit read-only/query_onlyでFK/integrityと正規driveSchema/driveBackupSchema由来の列を照合する。対象account1/note2、attempt3、F1/F2、target/head/job/transfer/record1、owner active/unknown0・readPinned0・write pin/owner解放を限定確認。旧targetの途中baselineはcurrentDTO/正規読取でmemory比較、履歴plaintextをdump0。copy後active/opaque再open0、auditclose実証・copyFDcloseを記録。失敗rootは全保全/再利用0、追加runはManagerへ返す。

このdocではbinding静的確認だけ成功。bridge/helper型・純対、native pipe/PID/count/mode、実UI/BFCache/DBauditは未実行。通常configured factory/実Google/実SDK/actualfresh/D01・audio保留も未検証を維持する。起動block処置・補正資源・BFCache欠測継続条件のManager採用後、5helper実装→独立preflight→新root/実行manifest固定を別委譲する。現在のsource/dist/全writer停止を維持する。
