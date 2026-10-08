# P5c-2 S2 新retry UI — 最小独立計画

## 状態と範囲

2026-10-01。静的接続案を確定、実行許可・器具実装ではない。対象は `7eb36e9e92c530f344dd25323c435a91e1a145e3` の不変更製品本体とdist。V1の修正中test2pathは読んでいない。active manifestから正式endpoint・DTO・client selector、旧UI5公開helper17file、同containerのread-control、provider9要求を照合した。新root/helper・app/test/build/DB/HTTP/browser/鍵は0、runtime所有なし。参照先private/results/DB/材料/cacheは読取/hash/import/実行0、本書以外編集0。V1候補固定・独立局所再確認と別途資源採用の後にだけ実行へ進める。

入力は採用design、S2最終案124行/21,974B・SHA256 `862794b37a27d21017748fe7504d30c5d104deee159b6e0566f1d73c3defc066`、S1独立正式報告UI5、今回の[限定レビュー](P5c-2-s2.md)。旧UI5の正常前提・signin・安全gate/結果assertion分離は維持するが、成功のみ履歴predicate、全dialog拒否、dedup目的2回目開始をそのまま再利用しない。以下の静的追補が初稿の未固定記述・任意AAD barrier案に優先する。

返却直前にRootからV1候補 `c660ced51319175a8c506be1cce5cd7a743d85ad`、test2pathのみ変更・主52/52・製品本体/dist/DDLlock不変の通知を受領した。本段ではその修正test/報告を独立再確認しておらず、V1独立52・新UI実行は次の別委譲である。

目的は「有限失敗を現在GETで確認し、本人が同じfileへのretryを確認して実行すると、旧失敗を残して新jobが成功し、結果を再訪できる」こと。固定Cの明示retry、Bの同ID、Dの実所有/旧結果保全、Jの同bundle/停止保全に対応する。S1正常backup/dedup/390px/Tab全組合せの再演を目的としない。A原本なし、並行command、90日/prune、再起動、同sub新epoch/key差、全Range/失効/409、取消競合はS2局所・独立静的レビュー等の別根拠とする。通常upload UIのUI2未確定、P5c-1残UI、S3、actualfresh、音声保留は解決扱いにしない。

## 1bootの候補シナリオ

採用B2の「intentを失った旧failedは、incomplete回答が旧確定receivedと等しい場合だけ継続」を、最小1KiBで通す案を第一候補とする。具体的なHTTP status/bodyとendpoint列は、S2候補停止・固定後に実adapterの公開契約へ照合して決める。未完成コードがこの列を実装していると仮定しない。

| 段階 | 正規操作／fixtureの有限動作 | 観測する結果 |
| --- | --- | --- |
| PREP | 同candidateの正式transportでbootstrap→signup→自己mail確認→begin→upload POST→seal→有限list→original GET/hash→signOut | 自己account1/note1/原本1KiB ready・所有・hash・通常変換・準備worker実終了。LLM/参照OFF。memory jarのみ、browserへ移植0 |
| SIGNIN/SETUP | fresh browserで通常signin1回。primary form束縛。自己noteの正規backup regionを確認後、正式container/UoW経由で同candidateの契約資格/folderを設定 | verified本人・現在note・原本・ownerなし。連携fixture設定はOAuth/Picker成功とは数えない |
| INITIAL | 初回backup開始POST1回。providerはfolder確認、ID割当1、session開始1を正常応答。最初のchunk要求だけ有限quota失敗、遠隔受信bytesは0のまま | 正式job/transferがfailed・保存received0・sessionあり。source/socket/callerの実終了→DB closed/proof ACK完了を確認。旧terminalのmemory snapshotをこの時点で固定 |
| RETRY_READY | 正規「結果確認」GET1回。現在本人noteのretry可否・prior transfer/版と旧失敗理由を取得。観測した一意のretry controlから正規確認を開く | 確認前にretry POST0。現在GETのactor/note/対象/版と確認対象一致。表示名は実装固定後に照合し、現在は文字列を決め打ちしない |
| RETRY | 明示確認1回、retry POST1回・新command。fixtureは同IDの完成照会を未完成として扱い、保存sessionへの空PUTに正当なreceived0を返す。次chunkを成功させ、同ID完成metadataを返す | 旧received0と回答0一致を根拠に継続。追加ID0、新session0、同file/marker/folder/sub、旧terminal不変、新request/job/transfer1件、成功record1件 |
| RESULT/REVISIT | 正規結果GET1回、成功/linkと旧失敗の分離を確認。noteをreload1回して結果GET1回、最後に本人historyへ1回遷移 | 新成功と旧失敗が別jobとして存続、retry関連一致、record/link保持。reload/historyから追加backup POST0。Drive link自体を外部へ開かない |

quotaが実adapter契約上session保持を伴わない、受信位置0の根拠を正式行から確認できない、またはretry UIがその失敗を提供対象にしない場合、このシナリオを実行しない。固定後の静的照合で差をManagerへ返す。勝手にUNKNOWNへ置換したり、raw SQLでfailed/session/receivedを作ったり、別エラーや追加操作をruntime中に試して成功列を探したりしない。

初回quota失敗は意図したfixture結果であって検証器具全体の失敗ではない。既知初回ownerの正常終了待ちは既deadline内のread-only観測とし、その間retryを送信しない。終了不明のまま期限到達、未知actor/scope・予定外要求・原本/対象差・上限超過では停止保全する。quota時に送信bodyがあっても「転送bytes0」とは記録せず、attempted chunk bytesとfixture accepted bytesを別に数える。予定はchunk要求2回（各1KiB）、初回accepted0、retry accepted1KiB。ID割当/session開始はそれぞれ合計1、旧IDに対するqueryとmetadataを区別する。

## 証拠と安全gate

UI5の安全gate／assertion分離を維持する。安全gateは現在本人/認可/note/scope、原本ready/hash/所有、正規対象region/formの一意性、旧ownerの実終了と現在ownerなし、prior transfer/版の一致、自己通信・予定mutation・資源上限。retry可否やprior対象が不明なら送信しない。confirmationから送信までの現在性は製品の正規Txで再検査されることを固定後のレビューで確認する。

結果assertionはUI表示、GETクリック因果/POST不増、履歴/reload表示などをpass/fail/unknownで保存する。GET6predicate（POST_UNCHANGED/SEQUENCE_ADVANCED/REQUEST_ADVANCED/RESPONSE_GENERATION_MATCH/PAGE_GENERATION_MATCH/COMMAND_MATCHED）は前後・完了/deadline・停止時に有限保存。actor/note/認可などの安全根拠を別に満たせる限り、表示や因果assertion不足だけで独立read-only観測を捨てない。安全不明をassertion不足へ格下げしない。

各論理stageの確認click1回、fill各1/signin1、初回開始1/retry確認1、同POST再送0。観測不足は既deadline内のbounded read-only再観測のみ。main-frame event counterをdocument置換/React commitとみなさず、route label/generation、receipt ordinal、相対monotonic時刻、実memory-loop回数を固定labelで保存する。primary/resend formを区別し、document全体の曖昧なtext一致を使わない。未知selectorへ広げる前に固定source/bundleへ照合する。

POSTはbootstrap/signin/renderNote/read用途/initial-backup/retry-backupを実endpointと入力schemaでmemory識別して別計数する。renderNoteはUI5同様、自己note/draftなし/有限・外部参照なしの読取だけ許容。未知mutationは拒否して停止する。tickerを無断停止しない。backgroundの寄与・GET由来のmutationは根拠がなければunknownのまま保持する。

旧job/transfer snapshotは実closed・proof ACK後に正式containerの既read経路/UoWからmemory取得し、retry後と停止auditで有限bool/countだけ照合する。旧phase/failure/received/session envelope/version/terminalAt/identityが不変、新job.retryOfが旧job、新transferが同target、targetのfile ID/marker/folderEpoch/locatorが不変であることを見る。IDs/token/URL/envelopeの原文・そのhashをreportへ出さず、OLD/RETRY等の固定labelに対応付ける。

session AADの直接観測が必要なら、retryの次chunkにだけ最大3秒の自己provider barrierを置く案を採る。正規query→新rowへの証拠付きCAS→次chunkという固定実装順が確認できた場合に限り、同containerのread-only controlで旧/new rowの正規bindingを用いて復号し、同sessionであることをmemory比較する。旧binding/newbindingを交差利用しない。秘密は返さずboolのみ、取得後または期限で必ずresponse/closeへ進める。barrierはHTTP/全体deadlineと要求同時1の内側で、製品hook/DB直書き/別processからlive DB接続を追加しない。

上記観測経路が公開composition内に存在しなければ、実装を変更して観測口を作らない。HTTPで同sessionを使った根拠と局所AAD対の借用を分け、UIのAAD直接証明は未確認としてManagerへ返す。旧terminal不変を測るread経路自体がない場合も、起動前に不足を示す。停止auditだけでは「途中一度も変更されなかった」を証明しないため、実行前静的・局所対と組み合わせる。

## 提案予算と終了契約

以下は独立UI用の新規追加枠案であり、S2実装担当のbackend root/DB/HTTP枠を共有・流用しない。候補確定後に担当全停止を受領し、Verifierが唯一runtime ownerとなる。既23 DB（S1独立16＋主S2実数6＋独立application1）を保持し、主V1予定1を加えるなら24、独立再確認の新DB1なら25、更に本UI active/opaque/audit3なら **28 logical DB**。未作成を作成済み件数に数えない。全体合算容量の採否はManagerが記録済みbaselineから判断し、旧private内容へ戻らない。

| 資源 | 新独立UI案の上限／根拠 |
| --- | --- |
| root | 新排他0700 root1、prefix `/Users/hikaru/.local/share/hollow/verification/p5c2-s2-independent-retry-ui-20261001-XXXXXX`、label `retry-ui-01`、新単独190MiB。今は作成しない |
| DB | active/opaque/auditの3DB、各10MiB・計30MiB（WAL/SHM込み）。新空正式migration1回。唯一writerはapp、別prep DB接続0。失敗物上書き/削除/再実行0 |
| 材料 | 自己account1/note1/原本1KiB/folder1、原本枠4MiB。material256KiB/新鍵128B/RSA0。mailbox本人確認材料は新fixtureだけ、外部mail0 |
| app/browser | app boot1/Chrome1/context1/page1、fresh TMP/profile。NodeTMP8MiB/browser128MiB/helper+有限log3MiB、special0・承認済dist参照のみ。install/build0 |
| 時間 | 正式前提60秒・49要求/4MiB、UI120秒、通常close30秒。全段最大210秒＋停止copy/audit各有限30秒。失敗/超過で停止保全、追加bootなし |
| Hollow | 前提込み600要求/32MiB。UI5実績312/約3.48MBを参考にしつつ、実候補の要求列で起動前確認。全endpoint別count/bytes、追加retryで無制限pollしない |
| provider | 同時1・12要求/1MiBを上限案とし、業務許可列は後述のexact9要求だけ。旧UI5の12枠から増やさず、残3枠を未知要求や再試行へ転用しない |
| background | 拒否100要求/1MiB、forward0。自己origin-only proxy、外部CONNECT/redirect/SDK拒否、WS/SWは既fixture境界を維持。OS全DNS遮断を主張しない |

失敗直前とfinallyに同じ有限schemaで段階/原因code/部分assertion/終端記録を保存する。raw stack/error/body/cookie/秘密を外側runnerで抑止し、JSONを無条件透過しない。Chrome公開ChildProcessのexit/signal/fd1–4、appのquiesce/drain/DB close・exit・両pipe end/close、outer exit・両pipe終端、既知自己PID、proxy/provider accepted socketとlistener closeを独立確認する。BrowserServer標準fallbackは許可範囲を別採用し、発動したらgraceful成功に数えない。未知PID/広域scan/manualkill0。

writerの実終了後だけactive→opaque→auditを排他copy、auditだけquery-only openしてclose。期待はold failed1/new succeeded1、request/job/transfer各2、target1/record1、same file ID、原本ready/hash維持、held/pin/object_writes0、FK0。failed旧行不変、新retry関連、active/opaque不変を有限投影で保存する。未達なら期待を書換えず部分結果として残す。DB/材料を再試行に流用しない。

候補commit/source/dist/entry/migration/lockを固定前後で照合し、UI5と同一hashだとは仮定しない。公開tooling179file/package2file、Seroval package/CJSの実行前再照合を維持する。今回ZmaBe9の公開17sourceはexact metadata/fullhash一致と全文EOF読解を完了し、新root適応は未着手。旧場所でimport/実行・private参照追跡0。未変更能力対の反復を避け、変えるprovider/retry観測/外側投影だけ、別許可後に新rootでpure/syntaxを先行確認する。

## 起動前に確定する事項と返却

必要な順序は、V1修正候補・正式報告受領と全編集停止→独立局所再確認と製品/dist不変更照合→この静的接続案・helper allowlist・資源合算をManager採用→新root/器具準備・変更部能力確認→唯一1boot。静的接続の方法は下記で閉じたが、この実行許可列は完了していない。

本案はquota→正当received0→同session retryという最小候補であり、全回復網羅・新epoch再連携UI・session失効再生成のUI成功を主張しない。新retryが成功してもS1の旧失敗や未確定原因を消さず、S2のbackend/局所/借用/UI証拠を分離する。候補仕様が異なれば起動前に案の差分を返し、実行中に製品や期待を変更しない。

全文EOF確認後、文書を含む全read/writeを停止してManagerへ返却する。製品レビュー/実行の開始許可を本計画作成から推定しない。

## 固定候補の静的接続追補

### active bundleとendpoint

`apps/web/dist/server/server.node.js:90377` の動的entryは `assets/server-BFztmyyB.js`。その `getServerFnById` は `assets/request-response-DCAAHjeh.js:9` から `rsc/index.js` をimportし、同manifestはcurrent/history/requestを `rsc/assets/driveBackupServerFn-CEahUZt4.js` へ一意に対応付ける。旧同名chunkがdist内に残っていても選ばない。resolverはclientReferencedとexport名を照合する。handler `server-BFztmyyB.js:9758` 以降は method一致、GET payload / POST JSONの同版Seroval復号、`x-tsr-serverFn`、正規middlewareを通す。純JSON `{data}` の直送やapplication関数への短絡はしない。

下表のIDは公開manifestの静的識別子であり、runtime URL/query/bodyをログへ出す指示ではない。helper内ではfull IDを照合し、保存はlabel/count/method/有限schema結果だけにする。

| label / 正式関数 | method | manifest ID |
| --- | --- | --- |
| CURRENT / driveBackupFn | GET | `252da473c119935892275bb1f3511e66ac763741c2a537a706e61b65a3bf0696` |
| HISTORY / driveBackupHistoryFn | GET | `a55e345a85bd9b6dc3caec547c27379c8cdbb9809e5119cd93d8baaf4b355f75` |
| BACKUP / requestDriveBackupFn | POST | `e3f575ffbfad75b510ba5aad1ecd4448b4d3a9ac9f94c6b7bfc5a58d1c02bbb2` |
| BOOTSTRAP / bootstrapAuthenticationFn | POST | `2407eeb2b06ed941e18166097583785ebe1f5b106abd1f52704b87a79cc513ad` |
| SIGNUP / signUpFn | POST | `84e914cc997a07c220aef0479d6d8620e020dc9d1b036270bfcb285a5903247a` |
| VERIFY / verifyEmailFn | POST | `bf068914565ee8b42e348c001c283e1c8d7994b541bee626a11be80c2f3c8d8b` |
| SIGNIN / signInFn | POST | `dacbf19d37d568a39b4aaadc5c7e065ac92e058eb0c83b11c127a3c90c0a3a87` |
| SIGNOUT / signOutFn | POST | `a423b797fd2799d9f786ffcf5a95d646b5efd6501fcfab4a4c37c2dba8dd7c7a` |
| BEGIN / beginUploadFn | POST | `3a6ec441edf5d81a00e48c10a5e2f083696801ebbaf620d30b2ac55c3284b3e5` |
| SEAL / sealUploadFn | POST | `5bc0d9e6e20547ae2c1ad7d8aeee7d04f9779b5e356df33359d9028f726a1902` |
| LIST / listImportsFn | GET | `1494a4cb85090f22a0e0b32ac208621a01f1f9f3ab52e8ce710601e5bfacb1f6` |
| RENDER / renderNoteFn | POST | `48a0a427f595aa73faa49607023eb355888fd705ad1f73c7252fd88b760bccd1` |

authはactive `hollowAuth-C0cUyP2l.js`、importsは `hollowImports-CfE2p68x.js`、renderは `hollowMedia-DDo50EoH.js` に対応し、上記12関数のmethodとclientReferenced一意性を静的照合した。UPLOADはserverFnではなく既正式 `/api/hollow/uploads/{newUploadId}` のPOST、ORIGINALは `/api/hollow/originals/{newOriginalId}` のGET。いずれも新本人memory jar・Origin・正規認証を使い、ID/URLを保存しない。UI5の49要求上限・bounded list40・前提signOut後の通常browser signinを維持する。

| 固定公開artifact | bytes / SHA256 |
| --- | --- |
| server/server.node.js | 3,700,208 / `39fe5d4df24a535c0827b66f5b162759a90a4577d2d4e923cde02e2c2ad0d4ce` |
| server/assets/server-BFztmyyB.js | 526,663 / `6b21b2adbac8d64760497aa009a32ee39b395cdc96873012b6c056a080df4bbe` |
| server/assets/request-response-DCAAHjeh.js | 32,571 / `ad55685f70d3a018423fb730318380011761edd8bb15cd2563424f855db33275` |
| server/rsc/index.js | 35,610 / `8e79b0690d2923189a94827ba38eafb79a4d56b9425dad8fd64496f497ef01f6` |
| server/rsc/assets/driveBackupServerFn-CEahUZt4.js | 4,330 / `162afd06a309dc7889d7df680a304a6108726978b05972e060756a9dd918cf90` |
| client/assets/DriveBackupPanel-DXP4QdTT.js | 7,538 / `09549ecb3bff4cd608cea0ebdf0cd93a5327238246fee97b81821737db9e6866` |

いずれもregular/non-symlink。client chunkはRSC assets manifestの参照と全文を確認し、現sourceのrequest/confirm/selectorと一致した。本段で変更中testを含むsource全体aggregateは取り直していない。最終V1でtest変更後のsource指紋が変わることと、上記製品bundle不変を分けて照合する。

### 入力・DTOと観測器具の変更

`driveBackupInput.ts` とactive serverFn chunkのCURRENTはstrict `{noteId, commandId?}`。BACKUPはstrict共通 `{noteId,commandId,expectedEpoch,expectedSettingsVersion}` に、initialはkind省略またはinitial、retryは必須 `kind:retry, priorTransferId, priorVersion`。全IDはUUID、epoch/版は正safe integer。browser route guardは同endpointでもINITIAL/RETRYを復号schemaで分け、予定stage・現在note・epoch/settings・prior locator/版・未使用newcommandに一致するときだけ各1回通す。旧helperのBACKUP permit数だけでは足りない。RENDERは既自己note/draftなし/4KiB/外部参照なしの読取POSTだけを別計数し、未知mutationを許可しない。

CURRENTのactor.accountId/authVersion/browserEpoch、noteId、configured/linked/folderName/hasOriginal、processing、receipt、recordsに加え、retryの `{transferId,version,cancelled}` をmemoryで保持する。quota後はcancelled=false、processing0、records0、旧closed snapshotのtransfer/版とretry一致を安全gateにする。取得開始時と完了時の現在scopeを照合し、main-frame世代をdocument置換とみなさない。GET6predicateは従来どおり結果assertionとして全labelを保存し、安全gateへ循環させない。

履歴DTOはjob id/requestId/noteId/state/attempt/bytes/failureを返すが、retryOfとsessionは返さない。`ui-observe.cjs` の「すべてsucceeded」判定を、既知OLDとRETRYの2jobのみ、OLD failed/DRIVE_BACKUP_QUOTA/attempt1、RETRY succeeded/attempt2、同note・本人というexact集合に替える。旧IDをruntime出力しない。任意failedを容認する変更ではない。retryOf・同target・旧session envelope不変は次項の同container read-controlで別確認する。

### read-control・所有・AADの証明範囲

旧 `ui-boot.mts` は正式 `boot({driveFactory})` のcallbackから同じ `base.unitOfWorkProvider` と `service.execution` を保持し、既statusが本人/原本/held/runtimeClearをreadしている。新fixture設定は従来と同じ正規repo/UoWのadopt/folderでありOAuth成功にしない。追加するのはこの自己IPC上のread-only観測だけで、製品hook/独立DB接続/第二writer/SQL直書きは増やさない。

OLD captureは初回provider4要求終了後、正規CURRENTのpriorと一致するjobを `driveBackupJobs.find`、`driveBackupTransfers.forJob` exact1、targetをfindして読む。本人note/original/subject/target、failed quota、owner.closed、received0、sessionあり、pin/refreshなしを確認し、さらに `hasPendingCallers()===false`、`unacknowledged(3).length===0`、control/backup held0を同stageで確認する。DB closedだけをproof ACK完了とみなさない。有限read-only待機で満たせなければretry送信を停止する。

OLD job/transfer全フィールドとimmutable target locatorを新appのmemoryに固定し、RETRY完了時の再読で秘密を含む値もmemory内だけ比較してboolean化する。targetのstate/version/updatedAtがconfirmedへ進む正常変化は旧行不変条件に含めず、target id/fileId/marker/folder/folderEpoch/source locatorの不変を比較する。新job.retryOf=OLD、newcommand/request/job/transfer、同target/record1を確認する。UI DTOのprior、新受付receipt、read-controlのjob/transferをmemoryで結び、任意IDを読み出すIPCは作らない。出力はOLD_UNCHANGED/TARGET_LOCATOR_SAME/RETRY_OF_MATCH/NEW_JOB/OWNERS_CLEAR等の固定bool/countのみ。

最小UI案ではAAD直接観測の3秒barrierは採用しない。queryReceived前に旧bindingでreveal、新rowへprotectしてからchunkへ進むsource（runner:449〜490、recoveryのsessionBinding）と独立純/局所AAD対を借用し、HTTPでは初回Location・旧session query・retry chunkが同一session pathname/queryであることをfixture memoryで照合する。新row ciphertextのAAD直接復号をUIで証明したとは扱わない。旧row envelope不変はread-controlで確認できるため、これを理由に製品観測hookを要求しない。

停止auditはOLD failed1/RETRY succeeded1、request/job/transfer各2、target/record各1、retryOf/同target/同file一致、owner/pin/refresh/object_writes0、原本ready/hash、FK0を有限query-onlyで確認する。途中不変はruntime memory比較＋局所根拠、停止後保存状態はauditと区分する。失敗時に未作成RETRY行を期待するSQLで成功へ補完しない。

### 正規selector・confirm・段階

SIGNINはheading「おかえりなさい」、一意「サインイン」submitを含むprimary formの `#email` / `#password`、label/typeを照合し、`#resend-email` の別formと混同しない。fill各1/submit1、正常 `/notes` 分岐、自己noteへ正規遷移する。Auth.tsx/signin routeと既UI5導線のまま。

NOTEでは一意region「原本のDriveバックアップ」内だけで「バックアップ結果を確認」「原本をDriveにバックアップ」「同じファイルで再試行」「Driveの原本を開く」を観測し、visible/enabled/件数を固定label保存する。INITIAL→FAILED_CLOSED→RETRY_READY→RETRY→SUCCESS→RELOAD→HISTORYの各stageを分け、正規結果確認click各stage1、開始1/retry1だけ。S1のdedup追加開始やmobile/Tab再演は削除する。

RETRY_READYのCURRENT priorと閉鎖snapshot、region/controlの一意enabled、同scopeを揃えた後だけconfirm許可を1個armする。正規clickが開くdialogはtype=confirm、active client/sourceにある完全一致文「前回の結果を同じファイルで確認してから再試行しますか？別ファイルは作成しません。取消済みの場合も、新しい明示操作として受け付けます。」、stage/scope/未消費permitに一致した1回だけacceptする。その他dialogは従来どおりdismiss/停止。確認前POST0、accept後retry1・新commandを観測する。window.confirmの差替え/evaluateによる受付・cancel confirmの許可はしない。

quota文言「Google Driveの空き容量を確認してください。」はreceiptのあるCURRENTではNOTEに表示できるが、command解消後の自動GETでreceiptがnullになることは正常である。NOTEで一時文言を捕捉できないだけなら表示assertionをunknownとし、既知quota/現在prior/実owner安全gateの代用にはしない。最後の `/notes/jobs` のregion「原本バックアップの履歴」はOLD quota文言と新「成功」、2件各1024 bytes、90日説明を安定して確認する場所である。text全体の「失敗」という語だけを判定に使わない。失敗理由を見たとする根拠はDTOと履歴DOMで分ける。

### providerのexact9要求

| 順 | 固定label / method | 応答と状態 |
| --- | --- | --- |
| 1 | FOLDER_INITIAL / GET | 正常folder、canAddChildren、trash=false |
| 2 | ALLOCATE / GET | 新file ID1、以後追加ID許可0 |
| 3 | SESSION_START / POST | 同ID/parent/marker/bytes1024をmemory照合、200 + 正規Location、body空 |
| 4 | CHUNK_QUOTA / PUT | bytes 0-1023/1024・body1024一致を確認、403 `error.errors:[{reason:storageQuotaExceeded}]`、accepted0 |
| 5 | FOLDER_RETRY / GET | 1と同folder、別folder無断代替0 |
| 6 | SAME_FILE_PENDING / GET | 同file inspect404、未完成だけで新IDを作らない |
| 7 | SESSION_QUERY / PUT | 3と同session、Content-Range `bytes */1024`、Content-Length0、body0。308・Range headerなし・body空で正当にreceived0 |
| 8 | CHUNK_RETRY / PUT | 3と同session、bytes0-1023/1024・body1024一致、accepted1024、200完成metadata |
| 9 | SAME_FILE_COMPLETE / GET | 同ID/marker/parent/size1024/sha256/trash=false一致 |

旧providerのphase0〜4をこの9段だけへ置換し、HTTP statusをsend引数に加え、queryとchunkを同URLでもcontent-range/bodyで区別する。未知順序/headers/body/同時要求/追加start/追加allocateは拒否して停止、provider自身のretry0。quotaは完全body受信後にaccepted0を維持する明示応答であり、attempted bytes2,048とaccepted1,024を分離する。native request/response/socket closeを既wireカウンタで確認する。9の後のCURRENT/history/reloadでprovider追加要求0。計数上限12・wire1MiB、body・response・headerを有限化し残枠を別シナリオへ転用しない。

### 公開helperの再利用と差分一覧

ZmaBe9直下の以下17fileは、[UI5正式表](P5c-2-s1.md#ui5-公開artifactと返却)のexact bytes/full SHA256と全件一致、regular/non-symlink、全文EOF読了。参照先privateへ追跡0・旧場所import/実行0。将来新rootへapply_patch適応する候補であり、現在helper編集0。

| exact basename | bytes | 新rootで必要な最小差分 |
| --- | --- | --- |
| serializer.cjs | 12108 | 純データbounded decodeを維持、product DTO predicateを混ぜない |
| ui-observe.cjs | 6775 | retry locator/版・2command種別・OLD/RETRY履歴exact集合・有限boolを追加 |
| ui-common.cjs | 8885 | 最終候補のsource/dist固定値・新root予算/合算を採用値へ。旧UI5のcanonical行方式をS2 canonical JSONと混同しない |
| ui-boot.mts | 11293 | 同container read-only OLD capture / retry結果比較、既status/正規setup/worker終了を維持 |
| ui-audit2.cjs | 5751 | failed1/succeeded1/2requests・2transfers/retryOf/locator有限比較へ変更 |
| supervise.cjs | 5246 | 新label・retry有限code/count/bool projection、raw JSON無条件透過0 |
| preserve.cjs | 1910 | 新root/採用予算のみ。writer終了→排他opaque/auditを維持 |
| preflight.cjs | 740 | retry変更predicateの能力対を追加、未変更worker能力は反復不要 |
| ui-provider.cjs | 14728 | 上記9段、quota/query、attempted/accepted、追加ID/session0 |
| ui-harness.cjs | 32779 | normal成功/dedup/モバイル列を最小retry列へ。正規confirm1・input種別permit・prior安全gate・失敗前/finally記録 |
| protocol.cjs | 3279 | Seroval1.5.4純データAPIと同版decodeを維持。新payloadは既限界内 |
| worker-observe.cjs | 1559 | 不変更、準備workerのexit/両pipeと既terminate事実を分離 |
| worker-smoke.cjs | 96 | 不変更・再実行しない |
| capability.cjs | 1891 | worker smoke込み旧一括実行はしない。必要な変更部のpureだけ別entryに絞る |
| prepare.cjs | 7603 | 同active endpoint照合済み、成立済み正式transport前提を維持 |
| syntax.cjs | 1423 | 新helper構文の有限結果・両pipe終了のみ |
| get-predicate.cjs | 1303 | 6predicate/FAIL・UNKNOWN保持を維持 |

新工具/依存install・大規模runner追加は不要。共通監督/serializer/prepare/worker/保全を再利用し、9段providerとretry観測の変更分だけ能力対を作る。Playwright公開179file/package2とSeroval2fileは今回は再import・能力実行していない。既指紋を実行直前に再照合する条件を維持する。

### 条件付き合算と終了

新UI単独案はroot190MiB、DB3×10MiB、helper/log3MiB、NodeTMP8MiB/browser128MiB/原本4MiB/material256KiB・新鍵128B、app1/Chrome1/context1/page1、前提60秒+UI120秒+close30秒。旧新合算は既23→主V1予定24→独立再確認予定25→UI予定28の各作成段階を区分し、旧rootの記録済容量に今後2DB/新UI30MiB等を足す。元UI5の旧予約32MiB/64MiBやhelper10MiB/12MiBを新集合へ無言転用せず、Managerが最終baselineで新上限を採用するまで新rootを作らない。

UIで失敗した場合の追加boot/異常POST再送0、初回quotaだけは予定契約結果であり器具全体失敗へ短絡しない。owner/認可/原本/予定要求の安全不明は停止、表示/GET因果assertion不足は部分結果を保存し安全な独立readを続けられる境界を維持する。writer実終端、各pipe/socket/listener、Chrome fallback区分、前後指紋、停止copy/auditを省略しない。

本追補は接続方法と必要な器具差分を確定した静的案であり、能力対・UIの成功報告ではない。変更中test2path非読取、全runtime/DB/HTTP/browser/鍵0のまま、全文EOF確認後に全read/write停止して返却する。
