# P5c-2 Retarget 独立静的レビュー

最新判定: `4b3995711c94957454cfbaf6863b6e9695abfb4a` の静的安全契約とV1補正、独立pure54・移行1・同一新DBのapp7群・補助6小群は成立。B/C/D/F/G/Hのhead到達差はManager受入済み。別許可UI1〜3は主要backup UIへ未到達。UI3は現在本人/epoch/scope/原本確認後の工具document条件で停止し、app実processは終了したが正常drain未成立。限定forensic保全/audit1回で原本・FK・所有行の安全を確認した。A/I未完と全失敗を保持して反復を止め、全操作停止・環境返却。末尾に具体欠測と最新26公開helper exact表を記載。

## 判定と範囲

2026-10-01。固定候補 `9c77f047b6ffbc678190efb4c0dfeb8e698d3a9e`、親 `8cb478b8639816751f40ab62ac2ea255e2057ad0`、変更25 pathを照合した。開始時と本文作成前のHEADは一致し、tracked worktreeはcleanだった。私は具体案文書の作成担当だが製品実装には参加していない。

head/never-sent/receipt/current/pin/閉鎖の静的契約に、受入を止める安全性矛盾は検出しなかった。一方、初回未受付を旧結果不明と説明する表示欠陥V1は、P5c-2-I/IN-06の理由導線を受け入れる前に補正が必要。静的レビューだけでRT-I1/I2/B/H/JやA〜J全体を合格にしない。実行と同bundle UIは未検証。

許可された公開source/diff/管理文書のread-only確認と本書作成だけを行った。test/import/build/install/DB/browser/network、新root、旧private/proof/結果/cache/鍵の操作は0。製品/管理正本の編集0、goal新作成0、spec/spec-implement呼出0。主の109pure・移行・7app群別DB・native1・build成功通知は仮情報であり、本書の直接合格根拠に算入しない。主UI環境にはアクセスしていない。

## V1: 正常な初回未受付へ「前回の結果不明」を表示する

根拠は次の到達可能な一本の経路である。

1. `apps/web/app/components/hollow/DriveBackupPanel.tsx:127`付近のpreview条件は、構成済/連携済/原本あり、processing/recordsなし、commandなし、receiptなしを許す。これは正常な初回backup前でも成立する。
2. `packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts:609`付近はhead/targetなしを一律 `blocked: invalid-evidence` とする。正常なtuple全0と、不正なhead欠測を区別しない。
3. `packages/core/src/application/integration/drive/backup/retarget.ts:151`付近はこの理由を `resolve-old-result` に投影する。
4. Panelの `retargetReason` は「前回の送信結果を確定できないため、新しい保存先には受け付けません。前回の結果を確認してください。」を表示し、同時に通常の「原本をDriveにバックアップ」ボタンは有効になる。

前回受付のない原本に前回結果確認を求める誤案内であり、データ破損や未送信判定の許可拡張ではない。P5c-2-I/IN-06の状態・理由表示へ結び付く補正で、追加機能や追加業務gateは要求しない。

最小補正は、既 `original(tuple)` のexact lookupで「headなし、かつ同tuple target全0」の正常未受付を欠測証拠から分け、preview/Panelではretarget説明を出さないこと。同repository:551–580はheadがある場合にtarget存在とtuple一致を検査し、headなしの場合も旧targetを1件検索して存在すればinvalid、全0だけnullを返す。この既契約を `inspectRetarget` の証拠読取前に使い、nullだけ `unavailable: not-started` としてPanel理由非表示にする主の提案は欠測を隠さない。新port/DDLは不要。headなしで歴史targetあり、head先target欠測、既allocated/unknownは従来どおり拒否する。正常未受付をnever-sentの切替可能証拠に昇格させず、初回は既 `insertInitial` の経路を維持する。

合格条件は、通常初回DTO→Panelで旧結果不明文言/新folder受付ボタンがなく初回操作が残ること、真正の旧結果不明では同文言と新ID拒否が残ること、head欠測を新規作成で修復しないこと。application/repository分類対とPanel対を各1本の既テストへ追加すればよい。修正後は新candidate/bundleを固定し、旧buildへ遡及しない。主のUI着手・継続可否はManagerが判断する。

## 静的に成立する契約

| 対象 | 確認した実装と境界 |
| --- | --- |
| 型・責務 | domain `driveBackup.ts:258`以降のhead schema/never-sent union、repositoryのtyped closedOwnersはSQL/Node proofを内向きportへ漏らさない。runtime判定はapplication、SQL全行証拠はadapterに分離。transportはstrict UUID/safe positive/digestで現在actorはserver取得 |
| head/移行 | 0041は1表、tuple PK、target unique、deferred複合FK、旧tuple index置換。全stateをbackfillし0039/0040を編集しない。headの初回v1/履歴存在拒否、更新version+1/未使用ID/全旧証拠、purging限定deleteでABAを防ぐ |
| 受付/CAS | `retarget.ts:274`以降は同commandの固定intent digest照会が先。新commandだけ現在認可/source/epoch/settings/folder/head/target/digestを再照合し、head→target→request/job/transfer→admissionSequenceを一つのUoWへ保存。旧全行UPDATEなし、新job attempt1、旧bulk親に付け替えない |
| 全履歴証拠 | repository `retargetUnsafe:167`と0041 head update guardはtuple全target、関連job/transfer、recordをEXISTSで調べる。旧fileId/非unallocated/非terminal/UNKNOWN/CONFLICT/複数・legacy欠測/identity不一致/pin/refresh/session/offset/length/statusを拒否。jobId null transferも残り、先頭100を陰性証拠にしない |
| active write | object_writesは `active=1` のみが拒否条件。正常endWrite後の履歴行の存在自体を不安全とせず、閉鎖済folder failureを永久拒否しない |
| 限定closed | owner closedはfailedかつTRASHED/UNAVAILABLEだけ。runner:375–435はsource prepare→folder検査→failure→fileId割当保存の順で、その後だけsession開始。allocated bytes0をnever-sentへ落とさない |
| 実caller/ACK | retarget:69の全page exact owner照合＋accepting/unacknowledged/predecessors、同maintenance coordinate内のUoWを確認。Execution:124–135/214–230は未ACK・前任を拒否しcaller finallyをsettleへ直列化する。ACK後untrackedを単独証拠にせず永続closedと併用。GETはACK/修復なし |
| 有限走査 | 100+1取得/BINARY keyset、100page/10000locator、次cursor不正/残りあり拒否。2000msとclock逆行をチェックし受付末尾にも検査。SQL内部の強制中断保証ではない。owner終了/HTTP/source openをTx内で待たない |
| current到達 | manualとcaptureはinsertInitial、snapshot insert/currentはisCurrent、bulk digestはhead版、旧retryはbackupRetryEvidenceのcurrentを通る。runner backupCurrentとtarget/transfer/record新guard、objectOperationRepository:27付近のpin開始SQLへ到達。旧待機のtargetを新headへ書き換えない |
| 歴史/寿命 | `read.ts`のrecord/receiptは歴史参照、現在retryだけhead経由。prune:481はhead/target/transferを消さずjobId/retryOfを解放。purge:753は全noteを検査しjob redaction→head→records/transfers/targets。headだけに絞る取消/impact変更なし |
| UI/境界 | preview GETとconfirm POSTを分け、DTO64KiB。確認文に原本/新folder/新受付/旧結果保持を明示。offer/view/current ticket、generation、React pending、1flight+queued read、current noteへ引き渡すlatestRead、ACK不明時GETだけを維持。V1以外の静的なlate actor違反は検出せず |

head更新後の歴史target UPDATE全面拒否は、新受付時に全旧targetがunallocated/fileId null・全transfer terminal none/closedである契約と整合する。進行中targetを歴史化して閉鎖保存を詰まらせる正常経路はない。transferの旧terminal jobId解放は0041 guardでも許可される。これを未検証の異常DB修復保証に拡張しない。

0 job/0 transfer枝は、存続targetのfileId不変、recordなし、正規pruneがtransferを消さないという採用根拠に依存する。正常な未admission snapshotとlegacy必要transfer欠測は区別される。任意に消した履歴や壊れたDBから「未送信」を復元する機能ではない。

旧S1/S2の不変更provider/source/Range/同IDsession、S3の500固定/二段枠/auto変換独立は既受入の範囲を維持する。headが到達した箇所の実行根拠は旧受入から自動継承しない。実Google、Picker/新folder作成、P5c-1残UI、音声、actualfreshを本段で完了にしない。

## 公開テストの読解と未検証

新app testは7群を定義し、待機取消→切替→成功/旧全値/旧receipt、trashとmissing closed、active/fileId/session、古いfolder/別actor/digest/後続confirm、130履歴、capture/bulk/旧snapshot、90日jobId null/Tx rollbackを直接assertする。fixturesは実NodeDriveExecutionを使うが通常provider/sourceは自己fixtureであり、それだけで実HTTP/FD/socket終端を証明しない。afterEachは全世代purgeを通るが、cleanup成功を独立した「保護中purge拒否」観測と同一視しない。

migration testは0040 baseline→全4 target stateのhead backfill/旧全列・schema・ledger比較、copy/trigger/final-FKのrollback3、deferred commit失敗を定義する。public testの存在は実行合格の証拠ではない。snapshot metadataのFK表現は即時/deferredを表せないため、0041 SQLとcommit直接対を正本にする。

純粋対は閉鎖page後runtime変化・pending caller・10001拒否・10000完走・不正cursor・2000ms/clock逆行、transportとPanelのconfirm/ACK/late actorを含む。現在の7app群だけでは、双方のTx順序、旧claim/pin拒否、正規0job/0transferとlegacy欠測の対照、保護中全世代purge拒否を全て直接観測したとは読めない。主正式報告で直接対があれば借用範囲を明記し、重複を避ける。

## 独立実行の最小案（未許可・未作成）

候補修正/固定と主の全runtime終了・資源返却後に別途許可を求める。主のruntimeと同時に独立runtimeを起動しない。正式報告読解前に、主通知の成功を前提として群を省略しない。

1. 修正到達のpure分類/owner-page/input/serverFn/Panel対を1workerで直接実行。旧109全体の機械的反復はしない。
2. 0041正式migrationの成功1/rollback3/deferred commitを新synthetic baselineから直接確認。旧全state/FK/guard比較を保持する。
3. retarget app7群を通常順の一つの新DBで直接確認する案を第一候補とする。主が群別DBにした理由を正式報告で照合し、既知fixture寿命干渉が残るなら通常順成功を主張せず、必要なDB数を事前再申告する。失敗DBを消して反復しない。
4. 未被覆だけを小さいpublic独立harnessで補う。旧claim/pin対headの双方順序、設定/relink/認可/source stale confirm、同command旧receipt/別command CAS、枠満杯rollback、正常0履歴とlegacy欠測、非current terminal prune/全世代purge保護を同一app DBの別fixtureへ有限に置く。製品テストを無断変更しない。
5. 主正式native証拠が限定folder failureの実source/socket/caller終了→DB closed→ACK、未ACK拒否を直接観測していれば明示借用する。なければ独立nativeを追加する前にpath・要求・資源を別申告する。DB closed値の捏造だけでRT-I2を合格にしない。
6. 固定済同bundleの独立代表UI1本: 新F1旧待機取消→既検証F2、通常パネルで取消確認→再確認→新command1回→純GET receipt/current→新成功link/reload、旧失敗/取消保持、390px/Tab、外部forward0。別noteの正常初回ではV1の誤文言0も観測する。Picker/実Google成功と混同しない。

資源案は新排他0700 root320MiB、logical DB9/136MiB（baseline16、success16、rollback3×16、application24、UI16、opaque8、audit8）。原本8MiB、helper/log8、NodeTMP8、ChromeTMP128、material256KiB、新AES等鍵合計128B、合計288.25MiB。主案を独立枠へ流用せず新規承認を要する。app actor3/WS1/原本最大24/履歴130、UI actor1/note2/各1KiB。追加harnessがfixture数へ収まらなければ実行前に再提案する。

1worker/1writer、UI app1+自己fixture1+proxy1/Chrome1/context1/page1/boot1。既buildを指紋照合し独立build0。nativeを含まないため自己providerはUI最大24要求/8MiB逐次1、Hollow600/32MiB、背景deny100/1MiB、外部0。独立nativeが必要なら論理DB・要求を追加申告する。pure/app局所各60秒、UI準備60/操作180/close30秒の初期枠。操作前にendpoint/gate/要求表を固定し、余枠を追加boot/retry権限としない。

停止はbrowser通常close→app quiesce/drain→DB close→既知全自己終端→exclusive opaque→audit copy。active/opaque再open0、auditだけFK/ledger/head/旧全値/new receipt/record/owner/pin/writeを照合する。UI DB16からopaque8の適合は事前実量確認を要し、超過を削除や切捨てで合わせない。旧private/主結果/cache/鍵を再利用しない。公開helperが必要ならexact source/hash/全文と新candidate APIを別承認で照合する。

## 引継ぎ

静的安全契約は受入可能な構造、理由表示V1は具体補正必須、実行は未検証。修正を自分では行わずManagerへ通知し、ManagerはV1を採用した。主からManager経由でUIboot/Chrome/UI DB/material未開始・全子終了の通知を受けたが、自分ではruntimeを検査していない。既original契約を使う4path最小案は上記のとおり整合する。新candidate固定、独立実行の範囲/資源承認を待つ。本書EOFと最終HEAD/tracked不変を確認後、全操作を停止する。

## V1追補: 4b39957の4path限定再確認

2026-10-01。完全HEAD `4b3995711c94957454cfbaf6863b6e9695abfb4a`、親 `9c77f047b6ffbc678190efb4c0dfeb8e698d3a9e`、tracked cleanを確認した。差分は `backup/retarget.ts` / `retarget.test.ts` と `DriveBackupPanel.tsx` / `DriveBackupPanel.test.tsx` の4pathだけ。既repository、DDL、current/owner/receipt、旧不変更条件は上記9c77f04静的レビューを借用する。主は唯一のruntime所有者であり、そのUI環境へアクセスしていない。

`retarget.ts` は認可・原本・連携・folderの既検査後に、同UoW/期限read wrapperで既 `original(original.id, actorId, subject)` を呼び、厳密 `previous === null` だけを `unavailable: not-started` とする。既originalの正常tuple全0だけnull、historyありのhead欠測/target不整合は例外という契約を変えない。例外をcatchしてnot-startedへ変換する経路はなく、既targetありは従来の全履歴inspectへ進む。新port/DDL/修復書込みはない。

`DriveBackupPanel.tsx` はnot-startedだけ理由文字列を空にする。既 `{retargetMessage && ...}` により誤理由は表示されず、availableではないため新保存先ボタンも出ない。通常初回ボタンと初回request経路は変更されていない。resolve-old-resultの文言・未知結果判定・新ID拒否は不変更。confirm側もready以外を拒否するため、正常nullを新target切替の許可にはしていない。同command旧receiptを先に解決する順序も不変更。

新pureテストの読解では、正常nullのpreviewとconfirm拒否/書込み0、repository拒否のpreview/confirm伝播、既allocated/unknownの説明とconfirm拒否をassertする。欠測2ケースはrepositoryの例外をstubするapplication境界対であり、実DB欠測を生成した証拠ではない。Panel対は初回で誤文言0・retargetボタン0・通常初回request1、未知では説明維持をassertする。これらは公開sourceの読解であり、実行合格として数えない。

判定はV1静的解消、追加の補正必須事項0。head/CAS/未送信証拠を弱めず採用した最小案へ一致する。主type/lint/format/比例40/build2/postbuildtypeの成功通知は独立実行ではなく、正式報告待ち。全体の実行受入・I/RT-I1/I2の完成判定は保留する。

本追補での製品編集、test/import/build/install/DB/browser/network、新root/private/proof/結果/cache/鍵操作は0。最終HEAD/tracked固定と追補EOFを確認し、全read/writeを停止してManagerへ返却する。

## 独立実行追補: 4b39957

2026-10-01T02:48:00Z〜2026-10-01T02:58:56Z。主の全runtime終了・製品/helper/報告停止後、Managerの正式委譲により唯一のruntime所有者として実施した。正式主報告 `phases/P5c-2-retarget.md` 全142行21335B、SHA256 `cdc8ea281e3260d7c281053ef3d9e16d666c7df98ad5bd6400308e5315c7b3ad` を照合・全文読解した。主のpure116、移行、app7群別DB、native6要求、build2/posttypeは主の根拠であり、独立実行へ付け替えない。主UIのNORMAL_SIGNIN成功は不変更signinの借用候補で、後続APP_COMMAND停止をretarget UI成功にしない。

独立rootは `/Users/hikaru/.local/share/hollow/verification/p5c2-retarget-independent-20261001-SCdqQG`、0700。主の公開24sourceはexact metadata/regular/full SHAと全文EOFを照合した必要分だけを新rootへ適応した。主のprivate/material/DB/cache/resultsは読取・hash・import・runすべて0。製品/管理正本編集0、独立build/install/native実行0、実外部接続0。公開native.test.mtsは読解だけであり、限定folder failureの実source/caller/ACKの根拠は主報告を明示借用する。

| ID・直接観測 | 実行と結果 | 根拠区分 |
| --- | --- | --- |
| I/V1、RT-I1/I2、入力・ownerページ・Panel | `node <root>/run.cjs pure-01 unit`。retarget / driveBackupInput / driveBackupServerFn / DriveBackupPanel の4ファイル、54/54、skip0、error0、exit0、両pipe end/close | 独立直接。正常null分類、unknown拒否、確認/ACK/late actor、100page/10000locator/2000msを含む。02:48:00Z |
| RT-I1/B/J、0041 | `run.cjs migration-01 integration <driveBackupMigration.integration.test.ts>`。1/1、正常移行・旧4state/backfill・rollback3・deferred commit拒否、5 logical DB、exit0/両pipe終端 | 独立直接。02:48:19Z |
| RT-I1/I2/B/H/J、current到達 | `run.cjs application-01 integration <driveBackupRetarget.integration.test.ts>`。7/7を一つの新application.sqliteで通常順に成功、exit0/両pipe終端 | 独立直接。主の5+2別DB根拠へ遡及しない。02:48:48Z |
| 旧claim/pin・CAS・0履歴・全世代purge | `run.cjs gap-01 gap <root>/gap.test.mts`。1 test内6小群成功、child exit0。下記wrapper終端記録の欠測を分離 | 製品assertは独立直接、wrapper全成功ではない。02:51:51Z |
| RT-I2の実FD/caller/ACK | 主nativeのF1 trash前割当0、未終端拒否、実close/ACK後のF2新受付、転送含む6要求と旧全行保持 | 公開source読解＋主正式報告借用。独立native0 |
| RT-I1/I、代表同bundle UI | 正規2原本準備・変換成功後、signin送信前で器具停止。初回V1表示、取消確認、再確認1回、新受付/record/link/reload/390px/Tabは未到達 | 独立未完。主UIも未完で代替しない |

補助6小群は既app DBへ3原本だけ追加し、総作成24原本・3actor/1WS・最大歴史130を超えない。①allocator先の証拠を拒否、②folder変更後の古いconfirm拒否→fresh受付→同command旧receipt/別command stale拒否、③retarget先では旧allocation/claim/current/pin拒否、④legacy failed jobでidentity/transfer欠測を拒否、⑤正規未admission snapshot取消→90日prune後0job/0transferの存続targetをnever-sentとして新folder受付可能、⑥歴史transferのactive object writeが全世代purgeを拒否し、endWrite後だけ通常purge成功を観測した。④はprune前の拒否であり、legacy jobがprune後も残ったという観測ではない。provider allocate/start/source openは0、FK違反0。実時間で同時writerを競走させた証明ではなく、同Tx直列化の両順序とCASを有限に直接観測したもの。

### 補助wrapperの欠測

`gap-01.json` は上書きせず `pass:false` を保持した。child exit0、stdout/stderr end=true、stdout close=true、stderr close=falseの時点で旧wrapperがsummaryを確定し、wrapperはexit1。testのassert failureとは区別する。過去stderr closeを遡及trueにせず、旧child PIDは保存されていないため後のPID不在も捏造しない。テストfinallyのexecution/client closeを読解し、直接DBclose観測と両endを根拠に分離した。DB再実行0。

Manager許可後、自己 `run.cjs` だけをchild closeと各stdout/stderr end/closeの全Promise終端後にsummary確定する形へ補正した。DB/HTTP0の `terminal-check.cjs` は120イベント順序対＋実自己child1のclose/end、既知PID36628不在を成功。新label `terminal-check-01.json` に保存。補助test source SHA256 `72c574ef18f4d3404794b236073af3f8ea6432c32e34a9efa23cfda415dd44be`、補正run `9bc695d8c2b6e0766e8c9899f29947616e100fe7a2268af0bb3a2e17981fc149`、terminal対 `9b6647b828250770feed8449ba36afef74440619bd0b8f610a65971b6baa281d`。

### 唯一の独立UIと停止保全

boot前に `ui-plan.md` の操作/有限gate/要求表を固定。自己工具contract119/119、setup82/82、endpoint57/57、syntax19/19（最終再照合も19/19）と全先行終端を確認した。正式migration42本、既bundleのまま、新自己account1、note2、原本2各1024Bを正規signup/verify/import transportで作成し、変換成功・自己owner・原本GET一致・worker終了・signoutを確認した。

`supervise.cjs ui` の唯一bootは `NORMAL_SETUP_UPLOADS` の1 checkpoint後、step SIGNINで `BUTTON_SCOPE`。UI actions0、UI POST kinds空、signin0、retarget0、provider要求0。Hollow55要求/689778B、背景deny14/2847B、外部forward0。失敗はBUTTON_SCOPEと、その後budgetが停止状態を検出したSAFETY_PAUSED。後者を別製品欠陥として数えない。

通常stopでChrome exit0/signalなし/FD1〜4close、browser/context終了、app exit0/両pipe終端、proxy/provider閉鎖、observer pending0を確認。UI supervisorはscenario不成立でexit1、child/PID・両pipe終端成立。追加boot/POST0。`preserve` は既知自己終了後の排他active→opaque→auditの3実体、各2088960Bをmemory byte compareし成功。active/opaqueをdriverで再openしない。`audit` は1回だけ実行し、preservationPassed=true / scenarioPassed=false。ledger42/table110/backup tables6/FK0、account1 verified1、session0、note2/original2/conversion succeeded2、backup job/request/transfer/record0、held/pin/active write0。audit client close、active/opaque不変を確認。audit wrapper exit1は未完シナリオを正しく返したもの。

実資源はlogical DB9、audit時DB合計19885600B、原本3211B、material232B、新鍵合計128B、helper2124786B、NodeTMP/ChromeTMP残量0。DB/原本/失敗結果は削除0、保全を保持。supervisor各end記録の既知PIDはすべて不在、全out/err end/closeを再確認した。最後のseal child PID49742も不在・exit0・全終端。未知PID/広域scan/手動kill0。

| 前後不変の公開指紋 | count / bytes | SHA256 |
| --- | --- | --- |
| source | 1292 / 18220734 | `7d7d8cd78e3003288ac7335741b85fab843a9ad993981beeed7cd8906086d04a` |
| dist | 9116 / 223796694 | `4f1bc6cf7df2198c4628fbdfd898b42f4707f0cd054594b1c22606f841ed40c6` |
| tools | 179 / 18550212 | `dc520408fcfe3e1951e46ca6a2a03d31d24b554ee21abe1249c094356fad3cc5` |
| fixed | 91 / 7675683 | `8bc76f2114f685497bb0185b16eb75b75d4adb9542d77b1a052bfce808b91832` |
| entry | 5 / 4103446 | `11f388bad8615266f285a358a8b0140b4f7a4344b7a180df73d63117ff2b9fda` |

### BUTTON_SCOPEの分解と記録の限界

対象の公開自己helper `ui-s3.cjs:32`、27123B、SHA256 `b68d791d648579b2a24951c4796ae687801da1b8f9351252fe8986b9bead8db2`。compoundは独自名照合count=1、開始時framecounter=現在、開始時URL=現在の3項。原因の項別値は保存されていない。counter増と同document/URL/本人は一般に両立し、counterをauthVersion/browserEpochの代わりにしない。今回counterが原因とも断定できない。

| authority / 補助値 | 現在残る有限記録 | 欠測と意味 |
| --- | --- | --- |
| 自己origin/期待path | NAV_ARRIVAL checks1 passed、自己origin以外forward禁止、SIGNIN stage | BUTTON_SCOPE瞬間のorigin/path/query/hash一致bool、開始/終了URL同値は欠測。実foreign/path矛盾は引き続き停止条件 |
| 現在form | SIGNIN_FORM checks1 passed、入力2個count/enabled条件を通過した到達順 | scope瞬間のform count・connected・同formは欠測。古いformの操作を防ぐための条件 |
| 一意visible/enabledのaccessible button | BUTTON_READY checks1 passed | 次の独自aria-label/textContent集計はaccessible nameと別算法。独自countと各predicateは未保存。文言/DOM変化のどちらも確定不可 |
| document continuity | 失敗後診断stable=true | document/timeOrigin自体を測っていない。診断stableは診断中framecounter同値だけで、失敗時のdocument同一を証明しない |
| framecounter | 最終generation2 | 開始値/delta/同値boolが欠測。framenavigated件数であり認証authorityではない |
| 認証本人 | expected identityは準備から一致、signinMatched=false、authMatched=false、epochPinned=false、receiptCurrent=false | 未signinなのでACTIVITY本人証拠なしが正しい。これを準備DBのownerだけで代替しない |
| 補助DOM | 失敗後buttons3/alerts0/regions0 | 原因を示す値ではない。raw DOM/URL/body/secretは出力していない |

次の器具案は、操作直前に同じrole locatorでcount/visible/enabled、現在form count/connected/所属、自己origin/期待path/query/hash、document継続・timeOrigin同値、post許可未消費、現在ACTIVITY本人/authVersion/browserEpoch/scope/原本所有をそれぞれ有限bool/countとして保存する。stage/codeとframecounter deltaは診断だけ。異なる名算法で二重にtargetを選ばず、exact accessible nameの同じlocatorを使う。documentや実path/本人矛盾は停止し、単なるframecounter同値を本人証明へ昇格しない。継続判定を変えるなら先にManagerの採用とDB/HTTP0の有限predicate対が必要。現在器具を無言修正して再試行しない。

P5c-2の必須gateは誤本人/別scope/別原本/旧confirm/重複mutation/外部送信を防ぐためのもの。tags/listboard/shellcounterの表示や同一document内の補助navigation回数はbackup UIの追加完成条件にしない。DOM可視一意性は実利用者の対象操作を選ぶために必要だが、名称照合の二重算法やcounter単独は業務認可の根拠ではない。

### 静的代替比較: 通常signin transportを前提作成へ限定する案

推奨は新fresh BrowserContextの自己originページ内で、正式bootstrap→signIn serverFn transportを各1回送信する前提作成。`Auth.tsx:45`以降の通常UIと同じ順序。`hollowAuth.ts` のsignInFnはcredentialsSchema入力検証→hollowContext(true)のOrigin完全一致→authenticationRequestのhttpOnly browser cookie→application signInのaccount/authVersion/password照合とbrowser context CAS→storeSessionの正規Set-Cookieへ到達する。したがってアプリusecase直呼び、session DB直書き、cookie注入、旧jar移植は不要。主4b39957のNORMAL_SIGNINは不変更signin UIの借用、今回の直接範囲はbackup UIと正規認証transportに限定する。

具体案は新pageを自己 `/signin` へ到達させ、origin/path/query/hash/documentを確認してから、page内の通常 `fetch` で既protocolのbounded serialized `{data}`、content-type `application/json`、x-tsr-serverFnヘッダ、credentials same-origin、redirect errorを使う。bootstrapはbrowser cookieを正規応答で新規発行し、次のsignInもブラウザがcookieを送り正規session応答を同context cookie storeへ保存する。Origin/Cookieヘッダを器具で偽造せずブラウザの通常送信に委ねる。APIRequestContextやNode直HTTPは既page route/proxy/observerを通らないため選ばない。

既自己proxy/routeRequestのscope・入力照合・1回wire ticket・要求/応答64KiB・外部deny・有限期限を通し、POSTはbootstrap1/signIn1だけ。retry0、credential/cookie/response bodyをdiskや出力へ残さずmemory内でbounded decodeし、observerのSIGNIN本人照合完了後だけnavigateする。新しいチェックポイントはSIGNIN_TRANSPORTとしてNORMAL_SIGNINのUI成功と区別。次にACTIVITYの現在account/authVersion/browserEpoch・current scope・両原本ownerを必須としてからsetup/backup UIへ進む。transport応答の成功だけでactor gateを立てず、旧世代ACTIVITYは使わない。

通常signinボタン器具の最小補正案は、上の個別predicate記録と単一accessible locator/実document scopeへの整理である。こちらならsignin UIも直接検証できるが、今回の主要変更ではない器具の因果を次bootで調べる負担が残る。transport案は不変更signin UIを借用して主対象へ進めるため小さい。ただしbutton helperはbackup UIでも共用されるため、transport案だけで後続BUTTON_SCOPEの再発が消えるとは主張しない。いずれも同じ有限診断とauthority整理をbackup操作に適用する必要がある。実foreign/path/本人/old-confirm矛盾を緩める案ではない。

未実行の必要資源案は新0700 UI専用root192MiB、logical DB3/32MiB（active16/opaque8/audit8）、ChromeTMP128、helper8、NodeTMP8、原本8、material256KiB、新鍵128B。actor1/note2/原本2各1KiB、app1/provider1/proxy1/Chrome1/context1/page1/boot1、build0、provider24要求8MiB逐次1/Hollow600要求32MiB/背景100要求1MiB、外部0、準備60/操作180/通常close30/外側270秒。既独立rootの9DBと唯一bootを使い切ったため、新DB/root/bootの明示承認が必要。失敗DBのresetや残余枠転用ではない。移行/app/pure本体の成功を機械的に繰り返さず、新器具predicate/transport対をDB/HTTP0で先に確認し、既bundle指紋一致のUIだけを補う。

### 返却

A〜Jの不変更条件はS1/S2/S3受入から借用、head到達のRT-I1/I2/B/H/Jは上記静的・直接app/pure/migration・明示native借用を根拠とする。新製品欠陥は検出していないが、I/IN05/IN06の主要UI結果は未検証でありdoneへ進めない。失敗原因は器具のcompoundに局在するまでで、個別原因は未確定。追加実行権限を求める静的案を返し、製品固定と失敗保全を維持する。本文作成後のHEAD/tracked・本書EOFだけを確認して全read/write/runを停止し、唯一runtime所有をManagerへ返却する。


## UI2開始: 公開helper固定表

Manager許可により新root `/Users/hikaru/.local/share/hollow/verification/p5c2-retarget-independent-ui2-20261001-58wCca` を0700で作成。下表はSCdqQGの主allowlist24と同名の必要21公開sourceだけ。作成または全文EOF読了済み。旧場所run/import/private追跡0、旧root全列挙0。同一性再照合後だけ新rootへ適応する。製品は4b39957固定、UI2は未実行。

| basename | bytes | SHA256 |
| --- | --- | --- |
| ui-common.cjs | 9752 | `dbd97965e6fe7e306a5d2b537d301204e31eb11efd24c9e7cef2effc5c09b810` |
| ui-boot.mts | 14954 | `47430e30846df7b923e5512433d1f39218aa2f6dc2c78ab39d609a40136a054e` |
| ui-s3.cjs | 27123 | `b68d791d648579b2a24951c4796ae687801da1b8f9351252fe8986b9bead8db2` |
| ids.cjs | 2007 | `4c974de7e15042da73bd77bbc3d80f42a625833b22db7a663e2e8c7590a9f5cd` |
| protocol.cjs | 3279 | `388c4e9b76810f857cc6997fccd4fce07282f0ea8e5d54365dcd47d57279b554` |
| request-input.cjs | 3503 | `d0d6e9d40d8e172ac9486d2445e7ec45737115b33a8a91bba6ecc1a8ea7622d9` |
| ui-observer.cjs | 5090 | `9ae9485e55c6134dcac2b480054bad142a1ecc6f3325d94d69628fa3416dbd93` |
| prepare.cjs | 8182 | `85bd2da2f5308a4242ecc77c871086347e9bce8a93794816431590a5828ee884` |
| setup-contract.cjs | 7323 | `c3e7446b49bc71fd9f8203ddbece6bc224900e89a64fae521ce3a973c4e07854` |
| identity-gate.cjs | 6509 | `30d2febdccb3ef9d9d065cabda01f65890270fdf52c3795fa0aa55ac2a16e7a2` |
| ui-provider.cjs | 21120 | `e41fa02b7adcdfee7179da52c0feb336f3cbba51571ac6a70c178cae8e6874cf` |
| supervise.cjs | 11668 | `7126d4630e2ea68c12c7fb11175af836e5c456ce712da22e238db8852873a727` |
| preserve.cjs | 2044 | `62de7b2d57d2b6a5b9a3a52d9db0926cd79f9074e21bfe3ef4d26ee56cda9aa9` |
| worker-observe.cjs | 1559 | `e22b785d32388080a1a79dea1bcaf590ab0021bae6ffbe4a55e13e81b2f4e430` |
| ui-audit2.cjs | 7178 | `689c15f7133993c8f35477a83a3e8a27711da41e2a26f9d2fe9af0782ca62c74` |
| handoff-diagnostic.cjs | 11318 | `e7e8abccb573e082baeb84e32fd0b59e152a86fc3a5d5722d18b574d6838106b` |
| serializer.cjs | 12108 | `ae1b9426803f5384d41bddc1b21e44e5c3e5c9672cbbf6a1251838723a1a9f6c` |
| ui-checks.cjs | 2013 | `952ac1c70666db2a645a2a8a2a9e13eb6f6f412788307ed5ef9e54cdcd072000` |
| syntax.cjs | 1056 | `77c1c9295e493563283bc851cf41a87979f9a275c9c706e1dfbc4fbbf1e99980` |
| preflight.cjs | 293 | `b227d1d1110bb0c6310c7ddd305f18178d834f2950f34d3c18b15efcda1b87ae` |
| contract-checks.cjs | 704 | `10b2042c032f698f4397c1313b485e3b553aff295fe6c7648a0f7a74d8cb8f3e` |

## UI2結果とID別判定

2026-10-01T03:16:38Z UI終了、03:17:06Z preserve、03:17:17Z audit、03:17:33Z seal終了。新root58wCcaへ上記21sourceをregular/non-symlink/fullSHA一致確認後に適応し、旧場所run/import/private読取・旧DBopenは0。Manager承認はroot224MiB/3DB32MiB、helper8/NodeTMP8/Chrome128MiB、原本512KiB/material256KiB/鍵128B、account1/note2/original2各1KiB、app/provider/proxy/Chrome/context/page/boot各1、Hollow600要求32MiB/背景100要求1MiB/provider24要求8MiB逐次1、追加build/native0。系列上限12DB168MiB/root544MiB・app2/Chrome2の中で実施した。

事前直接対は新transport/文書・本人predicate55/55、既contract119/119、endpoint57/57、setup82/82。syntax初回は20/21で新helper内の変数宣言重複を検出し、製品に触れず名称だけを補正した。失敗は保持、後続syntax-finalとsyntax-readyはいずれも21/21。初回診断の単体node --checkで非秘密の位置/短stackをtool出力した有限出力規約の逸脱が1回あり、Managerへ直ちに報告した。原stackの再読/複製0、credential/body/privateの出力0。その後は有限supervisorへ戻した。全事前child/pipe終端・既知PID不在と、前後同じ5公開指紋を確認。正式migration/init後、許可された唯一bootへ進んだ。

共有buttonは同じaccessible role locatorだけで一意・visible・enabled・connectedを検査し、region count、自己origin/path/query/hash、URL同値、timeOrigin同値をbool/countで記録した。framecounter差は診断のみ。request permitも実documentと現在ACTIVITYの本人を使用し、signInだけは本人認証前の明示credential照合を用いた。SIGNINのREQUEST_PERMIT actorMatched=trueはこの認証前例外であり、ACTIVITY確認済みという意味ではない。実認証後のACTIVITY pin・scope・原本owner gateは緩めていない。

### UI2の直接結果

正規2原本準備と変換成功、自己owner・原本GET一致・signoutを終えた後、新fresh BrowserContextで自己/signinに到達。明示bootstrapとsignInは各1呼出、各status200、redirect=false、origin/path/query/URL/document一致、入力一致、bounded DTO検証成功。response bytesは191/277。signInの本人ID/emailは新準備accountと一致し、observer SIGNIN_EXPECTED_PERSONはchecks2で成功した。cookieの注入/セッション直書き/旧jar転用0。正規session1/browser-bound1がauditで確認された。

ただし次の `SIGNIN_ONCE` はSIGNIN総1 AND BOOTSTRAP総1のcompoundであり、後者だけfalseだった。このassertionを失敗のまま保持し、backupへ継続しなかった。ACTIVITY初回pin前、fixture setup前、V1初回表示/確認取消/新command/結果link/reload/390pxすべて未到達。backup/provider要求0、UI action/dialog0、外部forward0。

| 回数・authority | 実測 | 限界 |
| --- | --- | --- |
| 明示fetch呼出 | bootstrap1/signIn1、両200/DTO shape成功 | 新helperの単一コード経路。認証UIクリック成功ではない |
| routeRequest許可POST | BOOTSTRAP2 / SIGNIN1 | 各requestのwire ticket発行点。本文/資格は出力しない |
| browser requestFinished | BOOTSTRAP2 / SIGNIN1 | route側と一致。observer重複集計で件数が倍になった形ではない |
| observer | SIGNIN accepted1、foreign0/failed0/stale0/pending0 | BOOTSTRAPはobserved集合外なので0件と読まない。proxyのendpoint別実wire件数は保存されていない |
| compound | SIGNIN===1 true / BOOTSTRAP===1 false | どちらの失敗かは今回保存値から判定可能 |
| 認証gate | signInMatched/identityMatched/authMatched=true、epochPinned/epochMatched/receiptCurrent=false | ACTIVITY未到達なのでpinなしが正しい。認証応答だけでcurrent actorを代用しない |

公開 `Auth.tsx:184` のGoogleEntryは `GoogleEntry.tsx:23–33` のmount effectでbootstrapAuthenticationFnを自発送信する。明示fetch1に加えて通常appから1要求が生じた説明は現sourceと整合する。ただし各要求のinitiator/body-shapeをこの実行では記録していないため、余剰1件を特定のeffectへ実測で帰属させない。前UI1のBUTTON_SCOPE個別原因も引き続き未確定。認証成功をbootstrap件数条件の遡及合格へ変更しない。

Hollow58要求/693904B、背景deny16/3250B、provider0。UI1+UI2の観測要求合計はHollow113、背景30、provider0（異なるroot、上限の余りを再試行許可としない）。通常close40秒枠内でChrome exit0/signalなし/FD1〜4close、app exit0/両pipe終端、proxy/provider閉鎖。UI supervisor exit1だが全終端/既知PID不在成立。追加POST/boot0。

排他preserveはactive/opaque/audit各2088960B、同一memory byte compare成立、削除0。auditは1回だけ、preservationPassed=true / scenarioPassed=false。ledger42/table110/backup tables6/FK0、account1 verified1、session1 bound1、note2/original2/conversion succeeded2、backup job/request/transfer/record0、held/pin/write0、originalPreserved/recordsMatch=true。audit client close、active/opaque不変。audit時DB6299648B、最終seal時6266880B（audit側WAL/SHM終端による実量差）、原本3211B/material232B/helper1707609B、NodeTMP/ChromeTMP残量0。UI/preserve/audit/seal各既知childは不在、全out/err end/close成立。source/dist/tools/fixed/entryの5指紋は前節表と完全一致。

最終公開自己helperはui-s3.cjs 30503B SHA256 `80f946172c74e24c9bdcc2987a812d22510dafba4eecfdaca569b66487b15bb5`、transport-scope.cjs 1229B `e4b3f1d4a381e94c7feea0081b49fb514c8a85f8416586f6633c0fc55302fa10`、transport-checks.cjs 3576B `fbf0c3f41462283a00dfef311ba803cda67167f82fb7ffe7f5855d36f0f7d071`、ui-plan.md 2371B `584056ec6bf6218b1d9b73764f88240f1d7c332b86261afc1f03e025532ccdcb`。元許可21source表は変更せず、適応後のものと区別する。

### B/C/D/F/G/Hのhead到達差

ManagerへID別に以下を返し、B/C/D/F/G/Hはdoneへ戻す受入通知を受けた。新test/新gateの追加ではなく既存根拠の対応付けである。

| ID | 受入可能な差分の根拠 |
| --- | --- |
| B | head/current、同command旧receipt、別command CAS、90日record非再送。直接54/移行/app7/補助6＋旧不変更根拠 |
| C | allocated/session/ACK不明の新ID拒否、限定F1→F2。直接app/pure＋主native明示借用、Range/転送はS2不変更根拠 |
| D | 旧pin/current拒否、全世代purge保護。直接app/補助＋実close/caller/ACKの主native借用 |
| F | auto capture初回head/current。直接app/移行、auto表示/変換独立はS3 UI3不変更借用 |
| G | bulk digest/current、旧snapshotの無言付替え拒否。直接app、500固定/元親retry/選択UIはS3不変更借用 |
| H | 90日prune、旧全行/receipt/record保持、現在認可/DTO。直接app/補助/pure、history/ticker/toastはS3不変更UI借用 |

A新folder成功link/再訪とI主要確認UIは今回未到達のため未完。E/Jその他フェーズの完成へ根拠を拡張しない。

### 未実行の最小継続案

厳密な「bootstrap総数1」をbackup業務gateにしない。既許可の自己origin・正規route・empty/正規serialized undefinedだけ・既有限bootstrap上限/総要求上限内の通常app bootstrapは、明示fetch件数と分けて計数する。今回の厳密assert失敗は保存したまま、次の器具では既知追加観察のnonblocking assertionに限定して続行可能とする。明示signInは1、承認済みbackup mutationも確認後1に固定し、余分なsignin/backupをbootstrapと同列に許可しない。

明示fetchにmemory内のexpected body/endpoint ticketを置き、routeRequestの各受付時にexplicitMatched bool / bodyShape / methodKind / current-document bool / ordinalを保存する。proxyで消費したticketごとのendpoint kindとfinite ordinal/countを記録すれば、browser要求/実forward/observer応答を区別できる。raw URL/body/credential/digestは出力せず、同形の通常app要求と明示fetchを区別できない場合はorigin未確定として扱う。通常appという推測を安全条件の免除に使わない。

継続可能なのは補助setup総件数・補助framecounterなど、正常な現在本人/原本/単一commandの成立と独立な追加観察だけ。必ず停止する条件はactual foreign origin/path、認証/入力/レスポンスshape矛盾、本人/authVersion/browserEpoch矛盾、ACTIVITY/current scope/原本所有未成立、実document差、許可外mutation・重複signin/backup、外部forward、資源/要求上限・未終端所有である。現在認可がないことをnonblockingにせず、新gateも増やさない。

この案の採用・新root/DB/bootは未許可。UI2資源を再open/resetして継続しない。製品固定と旧/新失敗保全を維持し、本文と最終HEAD/trackedを確認後、全read/write/run停止・runtime所有返却する。


## UI3開始: 公開helper固定表

UI2停止保全後にManagerから別途許可された新root `/Users/hikaru/.local/share/hollow/verification/p5c2-retarget-independent-ui3-20261001-ZqAsl9` を作成。下表は58wCcaの既許可21公開basenameのみ、自身作成/全文読了済み。旧実行/private/DBの読取0。同一性再照合後に新rootへ適応し、UI2結果を変更しない。

| basename | bytes | SHA256 |
| --- | --- | --- |
| ui-common.cjs | 9751 | `6d7645eacfd3e93eeca8c9e0b536823400808306e16af299370e8807b9eb088f` |
| ui-boot.mts | 14955 | `a6e12468034c5c95a17c161d74b1a79b8523012b127c27b4e76edd0f0a3d9e7d` |
| ui-s3.cjs | 30503 | `80f946172c74e24c9bdcc2987a812d22510dafba4eecfdaca569b66487b15bb5` |
| ids.cjs | 2008 | `2e978e78d9aface735d75e417657e6c00d080a637d7d81aeda8b3d73c9781f69` |
| protocol.cjs | 3280 | `8c7f501fc8c416b5911751542ab4279b82cdb22e86f2b80ebb36c1152bf5eab9` |
| request-input.cjs | 3504 | `8f83ef6a8014325afac480f5353d96efd61db5f2b3400fc0642976783555314e` |
| ui-observer.cjs | 5091 | `1fa2f2bb75602b61e1b6bdbb102d91e665e2e1fa91382b3a9c7796422060c4fb` |
| prepare.cjs | 8183 | `d43d71dea877c1db757aa250a6c6937249cc5de4695742f560cc38ca0491470e` |
| setup-contract.cjs | 7324 | `b7859d0be37de07cde1fae5738a201e506d811aa6c7c55a0de3293150fafc631` |
| identity-gate.cjs | 6510 | `f1e96f97e06729f03d3758ddef23360ad3cd0e289a7f16399628d369f201c9cf` |
| ui-provider.cjs | 21121 | `5d21d742da70d4ee85231d8a93bee769975f344bedae53f42c5d4cc5a07f4d4c` |
| supervise.cjs | 12004 | `b8303c3a4ed4532302236e618121a58b256e60d505da6ffa07b129406438c53c` |
| preserve.cjs | 2045 | `cf115492e28a8a4538b848d5db7cf1bab398c5d2c7f906420a56a5f49665b547` |
| worker-observe.cjs | 1560 | `6f5b821b8b6a541843beeb3b176ab0083bcccf4c36d4cfc68605393a59c01855` |
| ui-audit2.cjs | 7179 | `421eb14df1c5688c750368e9759c1140a0b27676b92aa34cfd86ddaf82da1f28` |
| handoff-diagnostic.cjs | 11319 | `954d9e3377cbbb958d055b449d535f61bba5688552aba1f0af5c7d205f828c60` |
| serializer.cjs | 12109 | `9da11ad39bff1a7c97853716cc5bbab3ad308880c4b07c92e201f2fd7f35adcf` |
| ui-checks.cjs | 2014 | `191ab86557b8cd98f6953be07fd2a46110b261ee269b9242b6001e4aa001e779` |
| syntax.cjs | 1102 | `94b61d5c416412251ade0527f61847b3001999a83315e541b34976a5ca873456` |
| preflight.cjs | 294 | `d7cd8e9585d4e80f441bf75344cd7474d718ff8f48862f146fc4f7a72b7b6ede` |
| contract-checks.cjs | 705 | `e0f924fd74379e1cd2e1dceba2e44914da60e8912f2092aa6ab8a130621fca4b` |

### UI3追加公開source

Managerが個別承認した58wCca直下の下記2ファイルだけを追加。metadata・regular/non-symlink・bytes/fullSHA一致確認済み、自身作成時の全文EOF読了と同一であり重複全文読取は省略する。旧runtime/private操作0。合計23公開helperを新rootへ適応する。

| basename | bytes | SHA256 |
| --- | --- | --- |
| transport-scope.cjs | 1229 | `e4b3f1d4a381e94c7feea0081b49fb514c8a85f8416586f6633c0fc55302fa10` |
| transport-checks.cjs | 3576 | `fbf0c3f41462283a00dfef311ba803cda67167f82fb7ffe7f5855d36f0f7d071` |


## UI3終端: A/I未到達、限定forensic保全

2026-10-01T03:29:55Z UI終了、03:32:47Z限定preserve、03:32:54Z audit、03:32:58Z seal終了。製品4b39957不変更。新rootZqAsl9、3DB32MiB、root224MiBほか前節の承認内で唯一bootを実施した。系列上限15DB200MiB/root768MiB/app3/Chrome3を増やさない。旧UI1/2 private/DB/結果再open0、主旧場所run/import0。新composed79/79、syntax21/21（最終も21/21）、endpoint57/57、setup82/82、5指紋一致、全8先行supervisor終端・既知PID不在を確認してから起動した。

2bootstrap+1signin+本人の正例と、duplicate signin/foreign/authVersion/browserEpoch/current scope/原本所有矛盾の負例を、実UIが使う `TS.authAllowed/backupAllowed/dialogAllowed` へ通した。bootstrap総1とprovider予定5だけは失敗値を保存するnonblocking追加観察へ分離。正常結果1file/1024B、確認取消POST0、現在本人・原本・command・旧行不変・通信上限を弱めていない。残compoundの一周ではtags/listboard/shellの表示件数をgateへ加えていない。

### 到達したものと欠測

正規2原本準備・変換完了・owner・GET一致・signoutの後、fresh contextで明示bootstrap1/signIn1を送信し両200/DTO・本人照合成功。BOOTSTRAP総2を失敗assertionとして保存したまま、SIGNIN_TRANSPORT checkpointへ進んだ。accepted/forwarded finite記録はどちらも、ordinal1 BOOTSTRAP explicitMatched=true/bodyShape=json、ordinal2 SIGNIN explicitMatched=true/json、ordinal3 BOOTSTRAP explicitMatched=false/emptyの3件。明示ticketとwire ticketの消費を照合でき、SIGNIN重複はない。余剰bootstrapは今回明示fetchではないところまで直接判定できる。GoogleEntry effect由来という個別initiatorは採取しておらず、公開sourceとの静的整合に留める。

/notesへ進み、CURRENT1/ACTIVITY1が現在世代で受理された。最終identityGateはsignInMatched/identityMatched/authMatched/epochPinned/epochMatched/receiptCurrentが全true、actorGeneration5/ordinal110。SETUP_CURRENT_ACTORは18checksで成立。BACKUP_AUTHORITY保存値は明示bootstrap1/signIn1、実SIGNIN1、bootstrap2、personMatched=true、foreign0、poisoned=false、actorReady=true、scopeMatched=true、originalsOwned=true、documentMatched=false。この最後の器具条件でfixture setup前に停止した。V1初回パネル、retarget確認取消/新受付/GET/link/reload/390pxは全て未到達、provider0、backup mutation0。

`documentMatched` は名称より広く、`TS.documentAllowed(scopeEvidence(notesDocument, currentDocument))` のANDである。具体的には両origin=self、前後pathname一致、両search/hash空、前後href一致、finite positive timeOrigin一致の5条件。今回BACKUP_AUTHORITY保存はこのAND結果だけで、個別predicate/timeOrigin値・同値bool・query形状は欠測。signin段階では5条件全trueを記録したが、notes段階へ流用できない。現在の自己origin/pathはscopeMatched=trueの `pathNow()==='/notes'` に含まれるものの、前後条件全体の真偽を再構成できない。どの条件がfalseだったかを推測で補わない。

公開 `routes/notes.index.tsx` はbrowseRouteSchemaをvalidateSearchに使用し、`presentation/browseInput.ts` はquery/tagsの既定値と正常なzone/sort/layout等を許す。したがってraw search空という条件は業務認可そのものではない。go直後の文書を、hydrationと現在ACTIVITY待ちを挟んで同じhref/timeOriginに固定することも、現在本人/原本の成立とは別の器具条件を含む。今回はquery正規化だった、document navigationだった、auth違反だった、という特定はいずれも未証明。foreign0/current本人・epoch・scope成立を無視して製品不具合へ昇格しない。一方で未保存の条件をtrueへ戻してUI成功にもしない。

次段の器具に引き継ぐ具体制約: route schemaが許すquery/tags/zone/sort/layout等について、raw URLのsearch空を認可条件に追加しない。自己origin/対象pathと現在DTOの本人・authVersion/browserEpoch・workspace/personal scope・対象原本所有を、それぞれ元操作に必要な条件として検査する。検索条件の許否は公開route schemaの意味に従い、表示既定値のURL正規化や補助framecounterだけで本人不一致にしない。文書継続性が必要なmutationでは現在のactor/scope確定後に操作ticketを採り、その操作の前後の各predicateを個別boolで保存する。goto直後からhydration/現在認可待ち全体に古い文書ticketを固定しない。実foreign/path/本人/epoch/scope矛盾を緩和する指示ではなく、今回欠測5内訳を推測するものでもない。

Hollow130要求/1558544B、背景deny21/4249B、provider0/外部forward0。独立UI1〜3の観測Hollow計243、背景51、provider0。RSC観測はrequested1/headers0/finished0/failed0/active1のまま終了しており、これは観測器の終端値であってOS上の未終了processを意味しない。

### 異常終了と限定保全

UI supervisorはexit1・全pipe end/close・既知PID不在。Chromeはexit0/signalなし/FD1〜4close、process/group不在、proxy/provider closed。自己app PID55133は不在で `ui-app-end.json` はexit1/signalなし/exit+close+out/err end/close=true/error=false。ただし `ui-runtime-end.json` と `ui-listener-end.json` は未作成、appStopped=false。APP_COMMAND/APP_STOPの有限codeを保持する。公開ui-bootの通常stopにはshutdownとsocket/worker整合条件があるが、今回そのどこで失敗したかのIPC詳細は保存されていない。raw app出力は読まず、lineCounterのout659B/other19・err0を確認しただけ。通常drain成功、DB正常close、listenerの通常終了を推測しない。processはすでに終了済みのため追加通常停止は行えなかった。

Managerへこの事実を返し、別途承認されたforensic-preserve/forensic-auditだけを各1回実施した。通常helper/元結果を改変せず、現在3DB枠のactive→opaque→auditへ排他コピー。app/Chrome/group/UI supervisorの既知PID不在と全pipe終端、proxy/provider閉鎖を要求し、normalDrained=false・runtime/listener-end欠測を必須の区分として残した。active/opaque driver open0、auditだけforeign_keys ON/query_only ONで開いた。正常shutdownの合格へ振り替えない。

限定保全は3実体各2088960B、memory byte compare一致、forensic=true/normalDrained=false/missingRuntime=true/missingListener=true。audit1回はpreservationPassed=true/scenarioPassed=false、ledger42/table110/backupTables6/FK0、account1 verified1/session1 bound1、note2/original2/conversion succeeded2、backup job/request/transfer/record0、held/pin/write0、originalPreserved/recordsMatch=true。audit client closed、active/opaque不変。audit時DB6299648B、最終seal時6266880B、原本3211B/material232B/helper1723103B、NodeTMP/ChromeTMP残量0。各forensic child/pipeは終端、既知PID不在。追加boot/POST/DB0、失敗結果・原本・DB削除0。

最終5公開指紋は上記表と完全一致、HEAD4b3995711c94957454cfbaf6863b6e9695abfb4a/tracked cleanを本書作成後も確認する。A/I主要UIは未完のまま反復を止める。B/C/D/F/G/H受入を覆す製品欠陥は検出していない。Manager方針の既Drive残3群へ環境を返し、Retargetの追加runtimeを開始しない。

### 最新公開helper exact集合

下表は新rootZqAsl9直下の公開source/操作表だけ、26ファイル計184210B。全regular/non-symlink/fullSHAを照合した。資格・DB・結果・cacheは含まない。通常保全sourceと限定forensic sourceを区別し、未来の利用はManagerの範囲承認に従う。

| basename | bytes | SHA256 |
| --- | --- | --- |
| ui-common.cjs | 9752 | `35be6bb7c22372df79d6384e90a927b3bc94c1167e1c80b01a0dcbbe2c0fa0f4` |
| ui-boot.mts | 14956 | `dddd24ee6767f26a0bdab3f06a295194816b0645d46a6a39bccdcec8d8dea7f7` |
| ui-s3.cjs | 32707 | `43c5e53f44c50e0c55ddd33ad31911b33d37b81715d93ad3b2c4d303d78bb4fe` |
| ids.cjs | 2009 | `37e0103a496b7a63715cd733c67dac7cb030d6ced28ad79b1ec20aae02392359` |
| protocol.cjs | 3281 | `c2597ed091971d353a8aa1e0d71a7ba6fe9a6bb039cc1ec9676a91371c22b01e` |
| request-input.cjs | 3505 | `683ca89f6a10c0bebbf43a862dfc3b1b5e2d2ceb61c9309632483e66924d999f` |
| ui-observer.cjs | 5092 | `40b53630de0d325e6610ade2580a939ec7e951ee916358d79c497a68eb4ef6bc` |
| prepare.cjs | 8184 | `9c086c03272b5bc8bcf941d74942a8009559668595d66d48b91dce0f99a781e9` |
| setup-contract.cjs | 7325 | `f4937641844f8e61825a01c89b17817298f9b5704136b2438fb79165c03a1e3a` |
| identity-gate.cjs | 6511 | `73fe7a97a0aaaf4846112c45603c044d1fb31cbf758692b2984c0190a10c7eaa` |
| ui-provider.cjs | 21122 | `257f08eb0b1a5d7e29487f6c97d15771343813af548784611a866496a5b4e307` |
| supervise.cjs | 12209 | `57e0eab0561351ce6b426a387e152044e31c75f8456bdfeaf676740eea5210af` |
| preserve.cjs | 2046 | `c1fbc89ad96c3f3e036ad1cce236f99b18cdade622faf6c500fa53f23a8b23da` |
| worker-observe.cjs | 1561 | `f7ba7c87efd7fce5d9b031990e982ee6ae35e641c863611fed66175f6828cc15` |
| ui-audit2.cjs | 7180 | `125be50b756e57baaae69529c940833d2ca9c735d28bf7b247428842b50d96d5` |
| handoff-diagnostic.cjs | 11320 | `6ef348d3446e4ae4d903a6ba3365e4eadbe4250f7860a8df0aa4806141ac5fa9` |
| serializer.cjs | 12110 | `88ba485c42fe2a9e22f1417c683483bc1b51b423c601f4650e07190bd970d490` |
| ui-checks.cjs | 2015 | `ab4f65f12ed9832c3773cd54c79fb6df7189f551e24db3eb0ea0b456ae7094db` |
| syntax.cjs | 1103 | `d3f9e88731af1d6873c54b5ff813afe9898fd32f5e58c8b265df278f4c2b988c` |
| preflight.cjs | 295 | `f582ce0435de65f03b1fb5120fccfa202579f8aed736a86909f698f16e64726f` |
| contract-checks.cjs | 706 | `3434a10c51471285b81e9f0e2da168e7ca5f856a2fab014fe2b9a9baeb7c7b20` |
| transport-scope.cjs | 1767 | `3480abba9a4dd0643d6c6f2bacdb40c505b00e3df78b95a5efaddb1c04ff45a6` |
| transport-checks.cjs | 4988 | `021ee3ac1a72b9b6af076eeaf3882b7fd7c5d34ce9fc78b9997bb1ccb7634946` |
| ui-plan.md | 2245 | `1cd6469039838b343e3381ac4fa983107c99accdc68a22b4e4c35c6aac4a71e2` |
| forensic-preserve.cjs | 2495 | `0d1a793bcf3d6601923b69c6eee1c4986fd6957f3ab30ba80333beff376b20f2` |
| forensic-audit.cjs | 7726 | `2d91031b4569c3767dc40bc071f88ec06d781f8e3feb8e4b4737bee8f2cda214` |

EOF
