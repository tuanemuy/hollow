# P5c-2 原本バックアップ計画の独立静的レビュー

2026-09-30。判定は **採用前補足2件**。5加算表・限定connection再構築・同ID照会先行の方向自体は妥当だが、shared refreshの待機所有と先頭sliceの安全hook順序を確定してから共有契約/DDL実装へ進む。製品実装の欠陥報告ではない。

## 固定した対象

レビュー対象は [P5c-2-plan](../phases/P5c-2-plan.md) の初稿1〜163行を全文読了したもの。2026-09-30 11:58:40 UTCの照合時にregular、28,674 B、163行、SHA256 `5a908c2d93c51930786822348e1880a63725069d94348789acbeaeceeff95537`。同時刻の全文と先頭163行のhashが一致した。後続のpath/budget・指摘対応追補は本判定に含めない。

公開製品HEADは `87d0defbcf9e0689c4c062cad39aa28821eff184` と照合した。brief全文、designのP5成立条件/Drive連携境界、原文IN-05/06/09・IM-01・OR-09/11・JB全文、関連公開source/0038定義を読んだ。実行中S5b-4のhelper/runtime/proofには触れていない。DB/鍵/private/新helper/API実操作/テスト/import/製品編集は0。公式公開文書はreadのみ。

## B1: shared refreshの待機側を実ownerから分離しないと再連携枠を再び塞ぐ

対象は計画95〜103行。control global2/account1とbackup global1/account1の分離だけでは、同資格single-flightの待機を介した占有は解消しない。計画はbackupがcontrolの保存結果を待つ場合を述べるが、逆方向、待機中の取消、unknown refresh時の待機側終端をまだ固定していない。

具体的に、backupがrefresh実要求を所有して応答/実終了不明となり、同accountのcontrolが同じrefresh結果待ちのPromiseを実行owner内で保持すると、そのcontrolも有限結果だけ返ってwork終端不明になる。現 [NodeDriveExecution](../../packages/core/src/adapters/node/drive/execution.ts) の184〜193行は `workEnded` と実資源0が揃わなければclosedにせず、240〜248行のdeadlineはabortと有限failureだけ、実work終端は277行付近のfinallyを待つ。単に要求30秒を設けても、待機Promiseがsignalから独立していればcontrol unknownが残る。

現 [held計数](../../packages/core/src/adapters/libsql/repositories/driveRepository.ts) の48〜83行はauthorization/controlのactive/unknownをaccount枠へ含める。[adoptDriveCandidate](../../packages/core/src/application/integration/drive/connection.ts) の441行とconnection repositoryの224〜227行は、そのheldが0でないと採用しない。したがって「backup unknownは新認可成功を妨げない」（計画97・101・123行）を、backupをheld集計から外すだけでは守れない。

採用前に、refreshの唯一の実ownerと待機subscriberを分ける。待機側は自分のsignal/deadlineで有限終了し、他者のunknown HTTP/callerを引き受けない。まだnative資源を所有していないcontrolの待機が、新認可枠/採用条件を無期限に占有しない契約を明記する。一方、実refresh ownerのpin/枠を待機取消で解放してはならない。

保存結果を共有した後の資格版も同じ契約で定める。現 [refreshOwnedCredential](../../packages/core/src/application/integration/drive/credentials.ts) の85〜181行は実refreshしたcontrol自身の版を同Tx更新し、[driveRecordCurrent](../../packages/core/src/application/integration/drive/current.ts) の119〜127行は実使用版と現在資格版を比較する。新tokenを待機者へ返すだけで旧bound版を残したり、他ownerの成功をself-refreshedと偽装したりせず、実HTTP前の現在版への正当な束縛を示す必要がある。既control CHECK/triggerの変更が必要なら、計画67行の「意図したauto設定の差だけ」と整合する限定差を申告する。実現方式や追加表を本レビューで指定するものではない。

Managerは本点を採用前必須とし、実owner/subscriber分離の具体契約を主へ依頼済み。これは新gateではなく、既採用のunknown保持と再連携成功時取消を両立させるための補足である。

## B2: 最初の単件UI提供前に全外部取消・purge保護を接続する順序が必要

計画127行は通常UIで単件backupを提供するslice1に、解除取消・duplicate・ACK不明を含める。一方、128行は再連携・trash/失権/移動/purgeをslice2へ「接続」として置いている。この順序でslice1を独立提供すると、既に操作可能なtrash/WS権限変更/移動/完全削除/再連携が新backupを認識しない期間が生じる。計画121行の同Tx fenceをpump/current guardで代替しない方針とも一致しない。

現 [trash](../../packages/core/src/application/note/trash.ts) の98〜116行は処理確認と取消集合を既job等に列挙し、[purge hasWriters](../../packages/core/src/adapters/libsql/repositories/purgeRepository.ts) の317〜349行はowner kindとjob集合を列挙する。新owner kindを型へ足すだけではこの保護へ入らない。同repositoryの484行以降はその保護を通った後に参照を外し、526行で原本行を削除する。新backup pinを認識しないままUI提供してはいけない。

原文 [JB-03](../../spec/scenario/jobs.md#jb-03-処理をキャンセルする) の外部取消、[IN-09](../../spec/scenario/integration.md#in-09-google-drive-の連携を解除する)、briefの再連携成功時取消は、fileサイズやchunk数によらない。WS owner→editor降格も、現 [membership](../../packages/core/src/application/workspace/membership.ts) の134〜139行にある既conversionの編集権限喪失条件だけでは覆えず、計画121行の全rank降格方針を維持する必要がある。

採用補足は、slice1の製品受付/UIを有効にする前に、同Tx取消/影響確認集合、exact owner abortとunknown保持、source pinを認識するpurge・削除順、relink成功/失敗境界を共有基盤として先行させること。slice2へ残すのは複数chunk等の追加機能・比例検証であり、安全hook初接続ではない。代わりにslice1を非提供の閉じた契約検証に限るなら、その境界を明記する。200MiB負荷試験や全UI再演を先頭へ追加する要求ではない。

Managerもslice1安全hook先行を採用条件とした。

## 採用を妨げる矛盾を検出しなかった部分

### 保存・移行

5表は本人表示の寿命、dedup target、物理transfer所有、存続noteのrecordを分離している。90日pruneでrecord/unknownを消さず、再試行で旧親期限を延ばさない方向は [JB-01/02](../../spec/scenario/jobs.md) と既designに整合する。新jobのretryOf/request参照を90日後にどう切り離すか、target/transferの循環参照とnote purge順の具体FKは未定だが、5表では成立不能という根拠はない。正式DDLの段階で既計画の寿命不変条件を表現すればよく、新たな正本を要求しない。

[0038](../../packages/core/src/adapters/libsql/migrations/0038_drive_connection.sql) のdrive_connectionsはaccount PKとaccountsへのRESTRICT、auto_backup=0 CHECKを持つ。connection更新guardとcontrol更新guardの参照を保持する限定再構築が必要という認識は正しい。全旧列/NULL/資格JSONを同値保持し、関連triggerを再作成し、同TxのFK assertion/ledger rollbackを確認する計画は妥当。実DDL・移行実行は未作成なので成功とは判定しない。object_writes.kindに固定CHECKがないことも公開schemaと一致する。

計画69行の「adopt/disconnectだけauto OFF」は、同じ段落のauto-settingでの明示OFFを排除しないよう、「auto-setting以外で強制OFFにするのはadopt/disconnect」と読む必要がある。これはIN-05の利用者ON/OFFと計画109行を揃える表現上の注意であり、独立blockingを追加しない。

### 同ID・folder変更・外部不明

事前IDを保存し、ACK不明後に同IDを照会、409だけで成功にせずmetadataを照合する方針はGoogleの [upload公式契約](https://developers.google.com/workspace/drive/api/guides/manage-uploads#use_a_pre-generated_id_to_upload_files) と整合する。resumableは受信Rangeを正本にし、256KiB倍数と最終chunk例外を守る。同資料の [中断再開](https://developers.google.com/workspace/drive/api/guides/manage-uploads#resume_an_interrupted_upload) にあるsession404と、通常metadata404を分ける設計も妥当。公式資料の確認を実Google送信成功とは扱わない。

folder変更後unknownは、旧同ID照会を先行し、確認不能なら別ID自動作成なし・明示案内というRootの可逆的安全仮定に賛成する。既recordのfolderを書換えず、別actor/subの成功を借用しない。未証明の旧外部fileを削除して解決する操作は追加しない。永久削除確定時の自動folder再作成は元要件の未完として保持され、今回の採用で達成扱いにならない。

### 原文との対応

IN-05のupload本人Drive/非遡及、IN-06の原本なし対象外/既backup再送0/理由付き失敗、IM-01の変換と独立したauto受付、OR-09の最大500とviewer除外/混在結果、OR-11の状態表示、JBの本人限定・親子・失敗子再試行・手動取消開始済み完了待ち・90日が計画へ対応している。新しい原文漏れは上記B2の接続順を除き検出していない。DB commit不成立のimport全体rollbackは「backup外部失敗で変換を失敗にする」動作とは別で、虚偽のbackup job受付を保存しない方針として扱う。

計画78行の「読取失敗時に外部bytes送信0」は送信前の全長/hash検査失敗の保証に限定する。同handleの後続range読取でもI/O失敗は起こり得るため、chunk送信後の失敗まで送信0と報告してはならない。後続失敗は現在のintent/既受信offset/close不明を保持して残送信を止める。これは既所有・不明保持契約の適用上の注意である。

## 終了と限界

本レビューは初稿に対する静的判断であり、修正追補・実装・DDL・移行・実adapter・UIの受入ではない。control2+backup1を含む予算は提案値で、OS硬保証ではない。S5b-4の稼働中製品を変更・実行していない。本報告だけを編集し、全文EOF確認後は全read/write/runを停止してRootへ返却する。

## 追補再確認: B1/B2は設計上解消

2026-09-30 12:05:29 UTCに再確認。対象planはregular、45,736 B、SHA256 `f0cefa3546f32caed2c7a6f99a71c676093a9b029a01683319f8ec4928801ee5`。今回の読取対象は88〜110行の所有・refresh契約、127〜138行の先頭slice順序、165〜193行のrandom source契約に限定した。初稿の指摘を履歴として残し、現案に対するB1/B2の採用前補足要求は解消とする。初稿の肯定範囲と未検証範囲は維持する。

終了前に最終版regular、45,773 B、SHA256 `e89e96a0b40f66c48991e460eb6364bd47f400975425b277612704e476db3377` を再照合し、同じ3範囲を再読して変更なしと確認した。この最終版にも以下の限定判定を適用する。Rootから変更はpath表のcomponents/driveからcomponents/hollowへの訂正、主は全停止返却済みとの通知を受領した。path表そのものの追加監査はしていない。

### B1: 解消

101〜105行は物理refresh ownerとsubscriberを分離した。初回controlはclaim/withCaller前のqueued・owner:noneで待ち、他者のclosed Promiseへworkを連結しない。取消・scope変更・30秒でsubscriberだけ有限終端するため、他者refreshのunknownをcontrolのunknownとして引き受けない。実refresh ownerのbackup枠・pinはそのまま保持する。待機取消がrefresh再送や他者abortを許すわけでもない。

一度実終了したcontrolは、実closeとDB proof ACKの後だけ待機でき、owner:closedと元phaseを維持する。owner:noneへの巻戻しは不要であり、既held計数のactive/unknownにclosedは含まれないため、closed-phase subscriber自体は再連携枠を塞がない。103行の「queued再判定」は105行の明示条件で制限され、prepared等の業務phaseを副作用前へ戻す許可ではない。自身の実closeが不明なcontrolはclosed subscriberになれず、自身のunknownを保持する。この場合の占有は借用したrefresh待機によるものではなく、本来保持すべき実所有である。

subscriber結果を資格の受渡しでなく通知とし、現在actor/session・epoch/sub・settings/folder・credentialVersion・取消・期限を再検査してからclaimする。既closed ownerからのclaim時に現在版へboundすることと、他者成功をself-refreshedにしないことを分けている。専用kind=refreshが他者更新後に有限結果＋現在GETへ収束し、completed偽装や不要な再refreshを行わない条件も明記された。これは待機だけのためにactive ownerを再取得し続ける必要がない契約として整合する。

短いcoordinate区間で予約判定とclaimを直列化し、network待機を持ち込まず、旧runtimeの永続owner/intentも無視しない。新候補のcode交換は旧資格refreshとは別目的のcontrol枠で可能とする既方針を維持している。以上により、問題としていた「unknown backup refresh → subscriber controlのunknown化 → relink不可能」の循環は設計上解消している。subscriber held0/有限終端と実owner unknown保持を別観測する直接対、既CHECK/triggerに収まらない場合の実装前返却も計画に含まれる。これらの実装成功を先取りする判定ではない。

### B2: 解消

133〜134行は、解除・再連携成功・trash・失権・移動・purge・WS削除の全同Tx fence/abort/pin保護を、単件backupの実UI提供前に接続して直接対を持つ順序へ変更した。通常refreshの継続安全性も先送りしない。slice2は複数chunk・非整列受信・追加回復/境界検証であり、安全hookの初接続ではないと明記された。初稿の提供順の矛盾は解消している。全UI再演や200MiB負荷試験を先頭sliceへ追加する要求はない。

### random source: 限定契約は整合

169〜192行のoptional `openOwnedRandomRead` は、既owned streamのEOF自動closeや既利用者を変更しない。Node backup構成でcapability欠落は明示構成失敗、plain stream/openし直し/全量bufferへのfallbackなし。単一FDの64KiB以下・同時1 readAt、closing先行、進行read終了後のFD close、close失敗時の未証明保持が区分されている。

全量identity/hash検査に加え、送信range最大1MiBに関係する最大2個のcanonical 1MiB block全体を再hashする。その読み取りbytesから独立bufferへcopyし、全block一致後にのみ返すため、確認後に別readした未確認bytesを送る隙間を作らない。同FDだけをimmutable保証とせず、hash耐衝突性/管理外OS攻撃との限界も明記している。当該range不一致はそのrange送信0に限り、既送信rangeの事実は保持する。初稿の読取失敗時bytes0に関する注意にも対応している。

ownerはsource準備からDB ACK・実closeまでを包み、recoverWritesとは独立してactive/unknown transferをclaimDelete/hasWritersが拒否する。実終了不明時のpin保持をrandom read追加で弱めていない。この契約の静的受入に追加の表・新しい検証gateは要求しない。

今回も製品/source再監査・実行/import・テスト・HTTP・DB・鍵操作は0。S5b-4や製品凍結の状態を変更せず、実装/移行/runtime/UI合格を意味しない。本報告以外の書込は0。追記の全文EOF確認後、全操作を停止してRootへ返却する。

EOF
