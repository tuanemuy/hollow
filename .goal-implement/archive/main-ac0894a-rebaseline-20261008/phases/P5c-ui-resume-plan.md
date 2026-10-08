# Drive 残 UI の再開引継ぎ案

2026-10-06。静的提案のみ。製品/test/build/DB/runtime/browser/外部操作0、旧helper/旧root/旧PID探索0、goal/全体管理文書変更0、補助agent起動0。入力は [brief](../brief.md)、[plan](../plan.md)、[Drive UI契約](../contracts/drive-ui.md)、固定[P5c-1 A–F](../criteria/P5c-1.md)・[P5c-2 A/E/I/J](../criteria/P5c-2.md)、[S5b-3](../reviews/P5c-1-s5b3.md)・[S5b-4](../reviews/P5c-1-s5b4.md)、[Retarget最新要約](../reviews/P5c-2-retarget.md)。公開source読取時HEADは `a2434806594007a6ca8cd1609c910451bfba7066`、S3の作業ツリーは進行中。候補固定・全writer/共有実行環境返却後に適用差を確認する。

## 結論と区分

指定の残UIには現在component→serverFn/HTTP→application接続がある。今回の静的範囲で「新製品機能を追加しなければ到達しない」項目は確認しなかった。主要不足は同bundle browser根拠と、既失敗を再現しない新しい有限観測工具である。通常configured factory/実Google適合は別の未検証項目として維持する。

| 残項目 | 現在の接続 | 区分/この tranche の受入範囲 |
| --- | --- | --- |
| folder付き失敗/成功relink（P5c-1 A/D/E、P5c-2 E） | DriveSettingsの影響確認→beginDriveFn→connection。candidate採用時だけcancelDriveBackups、epoch/資格版増分・folder=null/OFFを同UoWへ保存 | 実装接続済み、UI未検証。失敗receipt後の旧folder/epoch/settings/backup継続、成功後の旧backup取消・実close/ACKを確認 |
| same-ID folder作成（P5c-1 C/E） | createDriveFolderFn、foldersの永続事前ID/sends、DriveReceiptPanelのinspect/resend/confirm | 実装接続済み、UI未検証。selection ACK対は代用不可。初回unknown→純GET/明示inspect→同ID明示再送→metadata/親ID確認→保存 |
| pagehide→Back/文書寿命（P5c-1 E） | DrivePickerPage clear/dispose・pagehide・pageshow.persisted→GET、DrivePickerController generation・secret消去・current callback | 実装接続済み、実browser未検証。合成eventテストは実BFCacheの代用不可 |
| retarget→成功link/reload（P5c-2 A/I/J） | DriveBackupPanel preview GETと確認POST、current actor/head/version/digest、旧result保持、getDriveBackupのrecord→link | 実装接続済み、同bundle UI未検証。V1正常初回not-started補正/局所対は既受入維持。成功linkをfixture DOMへ直接挿入しない |
| 保存先復元/変更確認（P5c-1 B、P5c-2 I） | DriveBackupPanel/DriveResultのtrashと曖昧不明別文言、Settingsの復元後再選択案内、Picker結果の本人confirm、新folder作成confirm | 案内/導線は接続済み。Hollowに外部restore APIはなく、仕様も自動復元を要求しない。trash復元案内と明示再選択、404を削除と断定しないことをUI確認 |
| checks/移行/同bundle（両F/J） | 0038–0043/現Node bootとshutdown、既局所受入 | 部分根拠を保持。本 trancheで全migration/全suiteを反復せず、通常app/同bundle/停止保全の不足だけ補う。actualfresh/実接続は残る |

## 工具の最小変更方向

旧S5b-4は、認可click後のapp snapshot await中にprovider documentへ移り混在した直接反例。旧retarget UIはBUTTON_SCOPE、bootstrap総件数、notes documentの補助search/href/timeOrigin集合などで主要操作前に停止した。原欠測の個別原因を推測で埋め戻さない。

新helperを公開sourceから新規作成する。旧helperはread/hash/import/copy/runしない。操作は「現在DTO本人/scope成立→その操作document ticketを取得→一意accessible locator→確認→一回mutation→指定receipt/current GET」の順にする。

- 認可開始は app snapshotを自動実行せず、予定 `https://accounts.google.com/o/oauth2/v2/auth` にcommitしたdocumentと唯一のfixture同意anchorへ直接待機する。ここでapp label/body/historyを読まない。callback後はappのcurrent DTO/receiptを再取得。秘密URL/code/state/nonceは保存しない。
- アプリmutation直前にmain frame/current documentのtokenを採り、origin/path/actor/authVersion/browserEpoch/scope/対象note-originalの各boolを保存する。許可route schemaによるquery既定値正規化やタグ/list件数を新業務gateにしない。非同期観測中のdocument差は混在snapshotを破棄し、限度内のreadだけで現在documentへ再照合。mutationを再送しない。
- signinは未変更UI根拠を借用し、新originの正規bootstrap→signIn transportを明示各1回、session/cookieのDB直書き/注入0。通常app mountのbootstrapは別initiator/countとして有限に計数し、総数1という追加assertを置かない。signin/backup/認可の重複mutationは引き続き停止条件。
- confirm取消時POST0、承認時exact input/command一回。ACK不明後はGETのみ。単一section内の可視・有効・一意buttonを一種類のaccessible locatorで選ぶ。失敗時は名前やraw bodyでなくcallsite/個別predicate/有限分類を保存。
- browserは新profile。`ignoreDefaultArgs: ['--disable-back-forward-cache']`だけを使い、CSP/他flag/denyを変えない。実pagehide/pageshow.persistedと通常再loadのBackを分け、一周でBFCache未成立なら未検証を残す。

## exact source と新helper案

製品編集を前提にしない。以下は候補の依存と静的read/新helperの対象であり、path追加や実行はManagerが採用してから行う。

| 新helper候補（全て新規、`.goal-implement/helpers/p5c-ui/` 配下） | 使用する現公開source/目的 |
| --- | --- |
| `boot.mts` | `apps/web/app/server.node.ts` の boot(dependencies.driveFactory)、`apps/web/scripts/nodeShutdown.ts`、`packages/core/src/adapters/node/drive/{runtimeOwnership,execution,secretProtector,http,authorization,provider,backupProvider,backupSource}.ts`。built bootが通常DI/DB/worker/routeを所有し、代替はDrive portの輸送先だけ |
| `provider.mts` | NodeDriveHttpの限定DriveRequestFactory注入→自己loopbackへのnative ClientRequest。allowed original host/path/method/headers/bodyを検査し、元adapterのBearer/PKCE/一回grant/metadata/同ID/offset検証を通す。自己生成RSA/AES/資格だけを使う。request/socket/source/owner/caller/DB ACKを成功値で代行しない |
| `browser.mts` | `DriveSettings.tsx`、`DriveResult.tsx`、`DrivePickerPage.tsx`、`DrivePicker.ts`、`DriveBackupPanel.tsx`、`useAuthenticationOperation.ts`、presentation `{driveServerFn,driveHttp.node,driveBackupServerFn,driveDocument.node,hollowAuth,browseInput}.ts`。新finite document observer、self-origin proxy、期待dialog、same-bundle browser操作 |
| `contract-pure.mts` | document変化・provider/app観測分離・locator/current・mutation一回・ACK読取のみ・有限error投影の正負対。実行前にAPI/純対のexact範囲を固定。成功値への変換を作らない |
| `stop-audit.mts` | 正規browser close→app quiesce/drain→DB close→自己子/pipe/FD終了。新active→exclusive opaque→auditをcopyしauditだけ一回open、FK/ledger/全旧target/job/transfer/record/owner/pin/writeを限定照合 |

builtとsource adapterのBusinessRuleErrorが別classになるcomposition差は起動前の必須照合。可能なら同candidate builtの既exportから組む。exportがない場合、source `execution.run` の rejectionだけで許可failure code/kind/retryable/serializerを検証してbuilt側error identityへ橋渡しする最小案を提出する。built classのexports/chunkは固定後にexact確認し、旧error-bridge helperや古いchunk名を借用しない。factory/bridgeのcomposition差は実Google factory成功と称さない。追加製品exportが必要なら別提案で止める。

SDKはdocumentの許可script/frame入口を新自己fixtureで代替し、server発行の短命token/ticket→実controller→selection HTTPを通す。token/refresh/鍵/生exceptionはdisk/出力0、許可Google hostへのbrowser通信も自己fixture応答だけで実外部forward0。許可外host/path/methodは停止。

## 一つの小tranche

単一configured app/browser/context/page/providerで新account1、個人note2・各text1KiBを通常認証/取り込みtransportから作る。job/target/record/ownerをDBへ直接作らず、現在本人・原本・本文完成をDTOで確認する。WS/LLM/音声/Drive再生成は0。setupは残件成功の代用にしない。

1. 初回認可success→通常PickerでF1を選択→確認保存。N1正常初回panelで旧結果不明文言/retarget button0、通常初回buttonありを確認。
2. N1をF1へbackupし、providerがtrash metadataを返して実source/socket/caller閉鎖→failed/ACKまで進める。復元案内を確認。fixtureの明示状態変更で「Google側で復元済み」を表し、利用者のPicker再選択/取消confirm POST0→承認saveを通す（外部復元を実行した根拠にはしない）。次の同file retryはF1 metadata404を返し、削除断定0・再選択/作成案内・新file allocation0を確認。
3. N2のF1 backupをfolder metadata前の自己HTTP gateでholdする。folder付接続のfailed relinkをcallback/failed receiptまで通し、現在GETのepoch/settings/folder/旧job・転送保持を確認。続く同sub成功relinkでepoch更新・folder未設定/OFF、旧backup cancel intent/abort、native socket/source/caller終了→closed/ACKを確認。holdをfixture成功値へ書き換えず実abortで閉じる。
4. 新folder F2を通常作成。事前ID1、初回POSTは「未作成だがresponse不明」の自己契約でdrop、owner実close/unknown表示→純GETでPOST非増加→明示inspect404→resend確認取消POST0→同ID明示POST2→metadata/親ID再確認→confirm保存。別ID作成0。
5. N1のclosed folder-failure旧targetはfileId未割当、全旧結果を保持したままF2へのpreviewを出す。retarget dialog取消POST0→新command1回→receipt/current→成功record/link→reload。旧failed/取消target/job不変、new head/version、1record/link、現在F2を停止auditで照合。allocated/unknownをnever-sentに捏造しない。
6. 最後にPicker開始→通常document navigationで退出→pagehide/dispose→通常Back。純GETのみで自動issue/selection0。実BFCache復帰した場合だけ旧SDK callbackをmemory内の保持参照から解放し、旧token/ticket/遅着選択でPOST0を確認。再loadの場合は旧realm消失と新documentのGETを記録し、同document旧callback対は未検証。既awaiting-selectionはbrowser disposeだけでserver取消済みとは扱わず、現在receipt又は設定の正規取消UIで明示cancel1→現在GETを通してから明示再開始1回。合成pagehide/pageshowで穴を埋めない。

この対はP5c-2 Eのrelink差だけを補う。降格/除名/脱退/trash/移動/WS削除全対、通常refresh、90日/500件等の不変更受入を反復しない。既外部scope/審査・実SDK・実Google・actualfresh/D01には触れず未完を維持する。

## S3 新distを再利用する条件

静的確認でNode entryはboot(dependencies)とshutdownを持ち、Node vite configは通常server entryを指定する。一方S3計画は別outDir/new dist256MiBを予定しており、現在の旧distをread/import/hashせず、生成済みかどうかも本調査では確認していない。

S3受入後の新distについて、正規build結果・source/entry/worker/client chunk/DDL/lock manifest、build開始終了のcandidate同一性、search assetの出力先、boot exports・public asset serving base/launcher candidate resolutionを静的照合する。`listen.node.ts` は既定候補pathを存在で選ぶため、別outDirを指定しただけで新bundleが選ばれるとは限らない。新helperはexact新entryのbootを明示importして同rootのclient assetを配信する案とし、古いlauncherの候補探索へ任せない。

新distを無変更で使える場合は追加build0。S3で作られたことだけをDrive同bundle成功証明にせず、操作前後にexact新source/distの一致を確認する。entry/client asset対応が成立しなければ、新build/exact outDir案をManagerへ別提案し、このtrancheは未起動で止める。

## 新規有限資源・停止条件案

数値は未採用の提案。旧未使用枠を引き継がず、S3正式実行/Verifierと共有runtime操作担当を同時にしない。static担当は必要時点で停止可能。新0700永続root総256MiB、logicalDB3/48MiB（active16/opaque16/audit16）、objects1MiB、helper/log12MiB、material256KiB、新鍵128B以内/RSA1、NodeTMP8MiB、ChromeTMP128MiB。active計測超過をcopy切捨て/削除で合わせない。app/provider/proxy各1、Chrome/context/page各1、boot1、writer1、browser tool child1、probe1。single tranche最大12分（setup3/relink2/create2/retarget2/lifecycle1/stop-audit2分）、各対の再boot/追加attempt0。

予定mutation上限: 認可attempt3、Picker issue4（F1初回/復元後再選択/lifecycle/Back後明示）、selection POST2、folder generate1/createPOST2同ID、folder selection/creationconfirm3、control cancel1（退出したPickerの明示取消）、backup request4（N1初回/retry404/N2hold/N1retarget）、backup取消はrelink-inducedのみ、autoON0/明示unlink0。GET/history/current/receiptは各対の期限内で有限にし、総Hollow1800要求/48MiB、provider80要求/12MiB・同時2（held backup+認可/control各1）、背景deny150/1MiB。providerのupload/chunkは1KiBの成功1fileだけ、外部0。予算は余剰mutationの許可ではない。

各対前に現在actor/scope/command、provider stage/endpoint表、native held/closedを確認し、工具純対は別途30秒・最大24対/worker1案。callsiteに対応する未成立predicate、外部/未許可mutation、資源超過、writer未終了は即停止。単一BFCache未到達は欠測を保存し後続へ進める条件をManagerが先に決め、成功へ変換しない。

停止は正常Chrome/context/page close、app quiesce/drain、listener/DB/子/pipe/FDの実終端、自己exact PIDのみ限定確認→opaque/audit。timeout/terminate要求を終了成功へ読み替えない。失敗root/結果は保持し再利用0、active/opaque再open0、audit一回だけ。正常drain不成立ならcopy/auditを独断実施せず、失敗・未終端を報告して停止手段をManagerへ返す。最終報告は項目別合否、直接/借用/未検証、同bundle manifest、自己実終了を分ける。

必要な利用者質問はない。保存先変更の明示確認、trashのみ復元案内、404曖昧扱い、失敗relink旧保持/成功後取消、旧backupの無断付替え0は既確定仕様を使う。本書は実行許可・追加コード/test編集の採用ではない。
