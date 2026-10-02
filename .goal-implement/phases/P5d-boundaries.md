# P5d 退会の共有境界

2026-09-30。AC-09の詳細実装計画ではなく、P5c-2のbackup record・取消・afterCommitが将来の退会を妨げないための静的接続案。製品/DDL/helper/runtime/DB/private proof/鍵/実API/費用の操作は0。音声の調査・設計は行わない。本書だけを編集する。

## 根拠と固定の限界

入力は[brief](../brief.md)、[design](../design.md)のP3所有/容量、P3f削除、P4cプロフィール、P5c-2共有境界、原文[AC-09](../../spec/scenario/account.md#ac-09-アカウントを削除する)、[WS-05/06/10](../../spec/scenario/workspace.md)、[IN-07/09](../../spec/scenario/integration.md)。関連公開sourceのaccount/session/認証、note所有・作成者表示、sharing current scope、workspace membership/deletion、backup schema/repository/cancel、UoW afterCommitを読んだ。

主/補助は製品編集中で、公開作業ツリーのfreezeを依頼していない。以下は観測時の接続事実であり、S1の完成版レビューや実行結果ではない。2026-09-30 12:24:24 UTCの照合値はbrief `1f5dc42509248238fc3fdede2b054a472423abe5420ced736be46e434f2726d2`、design `8fa83627413fa11f3c9572fd9caf9e81e09466c9255a021740ab1bc049f74cb6`。進行中sourceはdriveBackupSchema.ts（9,254 B）`d4f00c385ff7a1071f6fabf458c04b4e75e65d30fbccb415b60b0dbdccd060d7`、libsql/hollowUnitOfWork.ts（11,216 B）`facb02b4fc8ba705b154f983d0e3b0fdd6d0cd20c9b8cac562ca60e70c89d938`、backup/cancellation.ts `563a7f50006c91f91db31001e6a28d816e0b570377571ea63d4795ef9a3412de`。これは読取後の点照合であり、読取途中の変更を排除する固定証明ではない。

## 原文から確定する境界

退会は現在サインインしている本人が、現在のメールアドレス一致を確認して実行する。唯一ownerのactive WSが一つでもあれば受理しない。他者をownerにするかWS削除へ案内し、自動で譲渡先を選ばない。確認画面だけでなく不可逆受理の同Txで再検査する。

AC-09の「アップロードしたファイルを削除」は、同じ原文のWSノート保持と既採用の所有scope契約とともに読む。uploader/creator/accountId一致だけで原本・素材を一括削除してはならない。

| 対象 | 退会後 |
| --- | --- |
| 受理時の現在個人所有note（trash含む） | 不可逆にアクセス失効し、公開/限定URLは404。本文・原本・版・tag関係・素材等は正規purgeへ |
| WS所有noteとその原本/素材/版/共有companion | 保持。退会者がcreator/uploaderでも消さず、現在WSの所有・容量を維持 |
| 他人/他WSへ移動済みnote | 現在所有先へ保持。元creator/uploader一致を削除理由にしない |
| 作成者表示 | 既知退会者は「退会した利用者」。unknown、表示名未設定、単なるWS脱退と区別 |
| 個人session/認証/プロフィール/連携 | 新しいアクセス・発行・callback採用を直ちに拒否。秘密と公開profileを削除/失効 |
| Drive上の既存file/folder | delete/trash/revokeで回収しない。外部成立不明も残存の可能性を示す |
| 存続noteの退会者backup record | 取得不能の来歴として保持し、他メンバーへ自分のDriveへの再backupを案内 |

本人の通常WS脱退は退会と別である。WSを去っただけならaccount/Drive資格は有効で、IN-07に独自のrecord失効を足さない。退会ではaccount自体が利用不能となるため、同subへ接続し直して旧人物へ復活する経路はない。新規accountを旧creator/recordのaccount IDへ付け替えない。

## 不可逆な失効と物理回収を分ける

受理境界は「唯一owner再検査・本人確認・account不可逆fence・session/資格失効・取消intent・cleanup intent」を同Txで確定する。成功後は即座にサインアウトし、個人の公開/限定取得を拒否する。実通信やFDの終了を待ってから認可を失効させる方式は採らない。処理中jobは同Txで新しい作業/結果採用を止め、commit後にexact ownerへ取消通知する。

ここでの即時はサービスの正本による失効である。すでに相手へ届いたbytes、Google/OpenRouter側の実処理や発生済み費用、ブラウザのメモリを撤回した保証ではない。実close不明はunknownとして追跡し、物理削除/容量解放だけを待たせる。AC-09の受理を「全diskの消去完了」と表示しない。既P3fの失効と回収の分離をaccountにも適用する安全側の案であり、復元猶予や退会取消機能は加えない。

唯一ownerの判定はmembership変更と同じtransaction整合性に置く。二人のownerが同時に退会してownerゼロとなる順序を許さない。退会fence済みaccountをactive ownerとして数え続けたり、遅い招待承認でそのaccountをmemberへ戻したりしない。active WSの退会者membershipは失効させる一方、WS本体や他memberの権利は保つ。WS削除が先に受理済みの場合の回収は停止しない。

個人noteを全件同期JS列挙することを前提にせず、account/scopeの不可逆fenceで全入口を拒否し、永続intentから有限cursorで回収する候補が妥当。退会受理とnote移動は現在所有・同じfenceをTxで直列化し、先に他scopeへ移ったものは残し、先に個人へ入ったものは対象にする。受理後の新規作成・移入/移出・bind/publishを拒否する。

## 現在のaccount/認可に必要な将来差

[Account](../../packages/core/src/domain/account/entity.ts)はverified/unverifiedのみで、[AccountRepository](../../packages/core/src/domain/account/ports/accountRepository.ts)に退会受理/縮小契約はない。[libSQL mapper](../../packages/core/src/adapters/libsql/repositories/accountRepository.ts)はpassword又はGoogle identityがない行をAUTH_METHOD_MISSINGとし、email必須の現schemaへ資格だけnullにした行を入れても正当なtombstoneにならない。

退会fenceは認証用account projectionから除外する必要がある。sessionを全削除するだけでなく、password reset/メール確認/Google login-link-reauth/OpenRouter/Driveの未完attempt・candidate・遅着callback・新session発行を止める。既authVersion/browser世代の用途を維持し、消えたaccountを古い認可成功からupsert再生成しない。認証方法を一つずつ通常解除する方式では最後の認証方法禁止と衝突するため、退会専用の原子的失効契約とする。

特に[sharingRepository.scope](../../packages/core/src/adapters/libsql/repositories/sharingRepository.ts)は、personal ownerについてaccounts行が存在するだけでscope有効としている。FK維持のためaccounts行を残すなら、単にsession/資格を消しても個人public/linkが404にならない。現在scope読取・検索/一覧・媒体/原本・public/link・export/artifact/delivery・worker新規取得/結果採用の入口へ同じaccount失効を接続する必要がある。現在WS所有noteは、creatorの退会でscope失効させない。

[displayNames.author](../../packages/core/src/adapters/libsql/repositories/displayNameRepository.ts)はaccount行不在をdeletedと扱い、行が残るとnamed/unsetへ投影する。縮小行方式では退会状態を明示的に投影する差が必要。[getNote](../../packages/core/src/application/note/getNote.ts)のunavailableも、WS脱退・表示不可と退会を区別できないため、そのまま退会表示へ読み替えない。公開著者リンク・旧icon・profileを失効させ、旧handle再取得者へ著者を付け替えない。

## FKと最小tombstone

現[hollowSchema](../../packages/core/src/adapters/libsql/hollowSchema.ts)ではOriginal/asset/import batch/conversion job等がaccountsを参照し、personal noteのowner FKにはcascadeもある。auth/Drive/profile icon等にもRESTRICTがある。WSへ残す原本のaccountIdはuploaderであって現在の所有権ではないため、これらを消してaccount DELETEを通す方法は不可。cascadeでnote rowだけ消すと正規purge/unknown/pin/実removeの境界も飛ばす。

最小共有契約は、不変の人物IDを保持する「利用不能な人物/回収anchor」と、ログイン可能なaccountを区別できることである。必要な情報はopaque ID、不可逆退会状態、削除intent/世代、未解決owner/claim/charge/再開位置への参照。本文・プロフィール・email・password・Google identity・access/refresh token・期限外job詳細を、anchor保持の理由にしない。

第一候補は既account IDを保つ縮小deleted枝と認証projection除外。active/deletedの型とDB制約を分け、架空メールや偽のpasswordを埋めて現型へ適合させない。別identity anchor表へ参照を移す方式との比較、nullable列/関連FK/trigger/mapperの正式移行範囲はP5d詳細化で決める。今のP5c-2移行へaccount再構築を混入させない。存続WSのprovenance参照がある間はopaque anchorを保てるが、各cleanup debtは実終了/削除確認後に縮小する。

物理回収はnote単位の既purge/共有参照計数/容量chargeを使う。共有companionは最後の正当なscope関係が消えるまで残し、個人scopeの論理chargeと物理disk解放を分ける。未bind draft/upload、profile icon、本人export/一時物は本人に属する回収対象だが、旧uploader一致によってWSへbind済み素材を含めない。回収処理は退会者sessionではなく永続削除intentに束縛した専用内部権限で続行する。

## backup recordと取消の適合

読取時の[backup schema](../../packages/core/src/adapters/libsql/driveBackupSchema.ts)ではrecordのaccountIdは非FKのopaque文字列で、note/original/targetはRESTRICT、record.versionは1、target単位uniqueである。account削除cascadeで存続recordを失わない方向に整合する。recordに資格envelopeを複製しない既方針も維持できる。

将来の最小読取は、現在note編集権限を確かめた後、record locator→記録actorの状態を解決し、退会なら有限な利用不能へ収束すること。recordを削除して「backupなし」へ変えたり、新account/別subの資格を使ったりしない。毎recordに退会booleanを複製する必要はなく、不可逆anchorの現在状態から投影してよい。人物unknownと退会済みを区別する。

論理record locator/対象identityの不変性は、永久に不要な秘密を保持する要件ではない。通常の連携解除では同sub再連携があり得るため既record resource-keyの寿命をcredential epochから分ける。不可逆退会では資格を再利用できず、旧実ownerの終了後に不要な秘密envelopeを回収できる契約が必要。recordの利用不能shellと秘密保管を分離するか、退会用縮小遷移を設けるかはP5dで詳細化する。現version=1のrecordを現場判断で書換えず、保存型/immutable保証の変更はRootへ提案する。外部fileを削除してsecret回収の代用にしない。

読取時の[DriveBackupScope](../../packages/core/src/domain/integration/driveBackupRepository.ts)はaccount（epoch省略可）を持ち、[cancelDriveBackups](../../packages/core/src/application/integration/drive/backup/cancellation.ts)は同Txでcancelを保存している。退会では現在epochだけでなく、そのactorの全世代のactive/unknownを閉鎖追跡できることが必要。既terminal業務結果でもunknown/pinが残るものを期限で飛ばさない。将来のP5c-3は記録ownerの退会で、別実行者の当該Drive再生成も失効する。この依存元accountとjob actorの二軸を混同しない。

現S1のaccount scopeは今の最大件数に束縛した実装中の経路であり、将来auto/bulk/退会の任意履歴数を全件取消できる証明にはしない。P5dはaccount admission fenceを先に置き、必要なら有限cursorで全対象へ取消/回収を進める。新規受付が停止しないまま有限先頭集合だけ取消して削除完了にしない。

## afterCommitは通知口、終了証明ではない

採用designと読取時[Hollow UoW](../../packages/core/src/adapters/libsql/hollowUnitOfWork.ts)は、Txごとの同期通知をcommit確定後に実行し、callback失敗を成功済commitのrollback扱いにしない。abort/wakeの補助として退会に再用でき、account fence/取消intentと物理I/Oの順序を分ける点で適合する。

退会受理をafterCommit callbackが動くことに依存させない。rollbackでは失効/通知とも行わず、commit ACK不明では自動再送/外部副作用を行わず現在の永続状態へ収束させる。commit後のcrash、callback throw、service未構成でも、永続fenceが新作業と結果採用を拒否し、runnerの再発見からexact ownerへ再通知できる必要がある。memoryの通知失敗counterだけを再開正本にしない。

callbackへnetwork送信・DB更新・実close待ち・account物理DELETEを追加しない。通知は終了証明でなく、HTTP/source/Worker/callerの実close→DB proof ACK→pin/予算/charge回収を別に観測する。閉鎖不明ならログイン不能のまま最小intentを保持する。退会したからunknownを一括closedへ変更したり、全runtimeの古いownerを回収したりしない。

退会のサインアウト応答が欠落しても、旧sessionは復活しない。サインアウト後に本人履歴を読む権限はなく、旧cookie/commandだけで削除済みaccount詳細を公開するstatus APIは本案に追加しない。元操作の現在性と安全な一般案内で扱い、通信ACKと退会Tx成立を混同しない。

## 不足と今のP5c-2への帰結

| 不足 | 将来必要な境界 | 今の扱い |
| --- | --- | --- |
| accountに不可逆退会状態/専用受理がない | active/deleted分離、唯一owner同Tx検査、全session/attempt/credential失効 | P5dの共有型/移行で確定。S1へ追加しない |
| personal current scopeがaccount存在だけを見る | retained anchorを認可に使わない共通fence | 個人URL404の必須接続。WS scopeは維持 |
| private/public作成者表示の退会区別が不足 | current退会状態→「退会した利用者」、authorUrlなし | 既unknown/unavailableを一律deletedへ変更しない |
| account DELETEとWS原本/assetのFKが衝突 | provenance anchorと認証accountの分離、正規purge | FK/CASCADEで回避しない。正式移行は後段 |
| 永久退会時record秘密の寿命が未具体化 | immutable locatorを保つ利用不能shell/秘密回収 | 現record3条件を維持し、P5dで縮小方式を提案 |
| afterCommit単体では通知到達/実closeを証明しない | 永続fenceと再発見、unknown/drain/proof独立 | 既採用用途に整合。通知口を広げない |

現段階でbackup record・account scope取消・afterCommitが退会を構造的に不能にする証拠はない。record3条件の維持を前提にS1を止める新gateは求めない。上表はAC-09本体の未実装条件であり、進行中S1の不合格判定ではない。将来実装へ命令するのはRootのみとし、主へ直接変更指示を出していない。

## 未決の扱いと検証境界

原文を変える利用者質問は今は不要。唯一owner拒否、WSデータ保持、退会表示、個人URL404、Drive外部物保持は明確である。即時fence/後続物理回収、opaque anchor、メール/handle/Google identityから新accountへ旧人物を再接続しないことは、その条件を両立させる技術案。独自の退会猶予・再登録禁止期間・永久handle予約・WS自動譲渡を追加しない。既designの退会後handle解放はaccount/profile削除へ接続し、旧著者リンクとは分離する。

後続は代表的な「WSに残る退会者原本＋backup record」「個人公開URLの即時404」「二人ownerの同時退会」「cancel保存後通知失敗/実close不明」の境界を、正式型/DDL案と比例検証へつなぐ。実行数やDB/fixture予算、移行、退会UIそのものは今回定めない。全コード再監査、実行、実データ削除、Google権限変更を行っていない。

本書を全文EOF確認後、全read/write/runを停止してRootへ返却する。

EOF
