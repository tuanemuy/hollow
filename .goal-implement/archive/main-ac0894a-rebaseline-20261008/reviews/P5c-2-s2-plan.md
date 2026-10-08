# P5c-2 S2 静的案 独立レビュー

## 判定

2026-10-01。対象候補 `b5198816268e06afdd4220aa09b283245ae881d5`、対象案 [P5c-2-s2-plan](../phases/P5c-2-s2-plan.md) は111行/17,370B、SHA256 `031d3fddbb6c806e111291bfd90068fe2bc3901ab98028c1e3d15858a56b58f9`。案を全文EOFまで読み、採用design/原計画/固定A限定・B/C/D/Jと現公開sourceを照合した。Implementer停止中の独立静的レビュー。実装・test/build/import・DB・HTTP/browser・鍵・helper・旧proof/results/cacheの操作0。

意図保持と非terminal回復の方向、既終了証明によるACK前再所有拒否は限定肯定。採用前に閉じるべき契約不足が2点ある。いずれも新機能要求ではなく、案が提供する明示retryを既B/C/D/J条件へ整合させるためのもの。現S1/V1・代表UIの受入を撤回する製品反例ではない。

## B1: 新epochの同一保存先鍵と既target拘束が同時成立する保存形が未確定

対象案L54–58は、新手動transferのcurrent identityを確認し、旧targetを不変にし、resource-keyを各AADで比較するとする。しかし「既insert guardと両立しなければ実装時に返す」では、現在公開sourceから既に分かる衝突を未決のまま残す。

- `adapters/libsql/migrations/0039_drive_backup.sql:305–315` は新transferのidentity.folderと既target.folderのID/driveId/**resourceKeyEnvelope文字列**一致を要求する。target.folder/folderEpochは同263行の更新guardで不変。
- `application/integration/drive/backup/runner.ts:73–107` のcurrentは新資格epochを要求し、`domain/integration/driveBackup.ts:322–330` の `backupFolderMatches` で現在connection.folderとidentity.folderのenvelope文字列一致を要求する。
- `adapters/node/drive/secretProtector.ts:62–72,126–139` のresource-key AADはaccount/sub/**epoch**/fileIdを含み、毎回乱数IVを使う。同じ平文keyでも新epochのenvelopeは旧targetと同値にならない。session AADにはさらにtransferIdがあり、旧ciphertextの無条件移植もできない。

従って新identity.folderへ現在connectionの新envelopeを入れればSQLが拒否し、旧targetのenvelopeを入れれば現currentが拒否する。非null keyで顕在化するが、null/null正常だけの対では見えない。根拠は固定Bの同actor/sub記録・target境界、Cの同ID回復、Dの現在認可/再連携fence、Jの既DDL不変条件。

### 推奨する最小修正契約（DDLなし）

新transferのaccount/sub/epoch/settings/credentialVersionは現在資格へ束縛する。一方、identity.folderは**immutable target locatorのsnapshot**として旧target.folderを保持し、SQLのtarget一致を維持する。旧targetのfolderEpochを新credential epochへ書き換えない。

受付と各再開/currentのapplication境界でtargetを取得し、identityがそのtargetに一致することを確認する。そのうえで現在connection.folderのID/driveIdと、旧target key（target.folderEpochのAAD）／現在connection key（connection.epochのAAD）をそれぞれ正規protectorで復号してserver memory内で比較する。null/nullのみ同値、null/non-null・平文不一致・復号不能は不一致／確認不能。ciphertext等値を平文等値の根拠にせず、旧envelopeを新epoch AADで復号しない。pure domainへprotector/I/Oを持ち込まない。

この意味分離に合わせ、runnerのcurrentから現ciphertext比較を使い続けないことを案に明記する。source/原本/所有先/cancelGeneration/現在資格版/期限の既検査は残す。通常旧transferは再連携で取消済みのまま、新手動操作だけが現資格で同targetを使う。target/成功recordの旧locator・recordのepoch非依存AADは不変。これなら新列/DDL/portは不要という第一案と整合する。

旧session再利用は同account/sub/target/fileId/原本と旧owner実終了を確認した別処理として、旧rowのaccount/sub/epoch/transferId/fileIdでrevealし、新rowの同項目でprotectする。folder key比較とsession rebindを混同しない。旧terminal/session ciphertextを更新しない。新queued挿入は既guardどおりreceived0/session nullで、claim後の証拠付きCASとして受信位置と新envelopeを保存する。resume/retryの途中停止でも旧証跡へ一意に戻れる関連付けを既retryOf等で維持し、単に「最新の別row」を選ばない。

代案は新identity.folderに現在envelopeを置き、targetとの暗号文同値guardを意味比較済みの別証跡へ変更すること。ただしSQLiteはprotectorの平文比較を代行できないので、envelope比較を削るだけでは証拠にならない。必要なguard/証跡設計を別途確定し、新追加migrationと既値/rollback比例対が必要になる。旧0039の書換えやtarget locator変更で回避しない。今回の最小案としては上記DDLなしを優先する。

最小追加対は同sub新epoch・非null同一平文/異ciphertextの許可、別平文/null差/旧key復号不能の拒否、旧transfer取消不変、current再検査、旧/新session AAD取り違え拒否。Root採用後の実装・検証対象であり、このレビューでは実行していない。

## B2: 旧terminal sessionへ引き継げるRange上限を定義する

対象案L36–40は非terminal uploadingのoffset/length保持と旧reconcilingの保守化を明記するが、L54–56の**旧failed terminal→新transfer**には同じ証拠欠落境界が明記されていない。「確認したoffsetだけ反映」は、何を上限に回答を受理するかが未確定。

現 `backup/runner.ts:43–71` の `backupPhase` はoffset/lengthを除去し、同690行以降は失敗をfailedへ変える。`adapters/libsql/repositories/driveBackupRepository.ts:111–126` はuploading以外のoffset/lengthをNULL化する。domain failed unionにも両fieldはなく、0039 update guardのterminal不変条件により後から旧行へ書き戻せない。sessionと確定receivedは残るが、旧UNKNOWN失敗が最後に送った可能性のある終端位置は残らない。これを非terminal uploadingの範囲と同等に扱えない。固定Cのoffset推測0、Bの同ID重複0に直接関係する。

### 推奨する最小修正契約

| 引継ぎ元の永続証拠 | incomplete Rangeの採用範囲 | その他 |
| --- | --- | --- |
| 非terminal uploadingでoffset/lengthが有効 | 旧received以上、offset+length以下。既整合制約offset=receivedを維持 | 回答位置をCAS保存してから検証済みsource rangeだけ送る |
| 新意味のreconciling、または旧reconciling/failedでsent upper boundなし | **旧確定receivedと等しい位置だけ**。下回り/超過を推測採用しない | 超過は同ID完成metadata一致による採用かUNKNOWN・追加chunk0へ。旧S1失敗も同扱い |
| session/Locationが保存されず有効URIがない | Range照会・推定offsetなし | 同ID完成照会だけ。404 metadataだけでsession失効を証明した扱いにせず、自動start再送0 |

有効な旧sessionの正規空PUTが200/201または同IDmetadataで完成を示す場合は、file ID/marker/parent/size/非trash/返却checksumを照合して初めて完成とする。末尾Rangeだけを完成へ昇格しない。新transfer.received=0や原本全長を、失われた旧送信上限の証拠へ使わない。

旧sessionの明確な失効を得た場合は、同IDmetadataを先に確認し、現在認可・同folder/sub・原本一致・旧実owner終了・明示retryの範囲内で新session1回へ進む。旧結果は不変、新開始の結果も不明なら同ID照会へ戻し自動再作成を反復しない。409/未知・権限不明をsession失効と同一視しない。この保守境界なら新terminal-intent列を追加せず現案へ追補できる。

最小追加対は旧failedの保存receivedより大きいincomplete回答で送信0/同ID完成照会、同received回答での継続、下回り・不正Range・末尾Range拒否、metadata完成成功を別対にする。非terminal保存intentの上限対で旧failedの欠落を代用しない。

## 限定肯定と既契約の維持

- **DB closed→proof ACK間**: `application/integration/drive/runner.ts:374–477` はmaintenance coordinate内でexact proof検査→UoW保存→acknowledgeを行う。`adapters/node/drive/execution.ts:125–130,136–206` はclaimも同coordinate列へ入れ、withCaller内部でacceptingを再検査する。unacknowledged proof/previousProof/predecessorがある間accepting=false。recoverable scanでclosedが見えてもDB claim直呼出しを許さず、既withCallerを通すなら隙間で新所有しない。新DB列を要求する根拠はない。
- ACK失敗時は同proofが残り、`settleBackupClosure` のsame exact owner/closed早期returnを通ってACKだけ再処理できる。commit ACK不明でもDB再読と同owner照合なしにACKしない。processが途中終了した場合は正規runtimeOwnershipの実前任終了確認とpredecessor整理が先で、memory Map消失を許可根拠にしない。これは静的成立見通しで、案にある故障対の実行を代行しない。
- **元phase保持**: 非terminal closedのままuploading/session/received/deadline/statusAttemptsを保持し、再claimでcheckingへ一律巻き戻さない方向を肯定。旧terminal復活なし。reclaim入口に親手動取消を足さず、外部cancelGeneration/epoch/sub/原本/所有先/期限は拒否する区分は採用designと一致。
- **pin/purge**: local proofはcaller endedとresource実close確認、predecessor proofは正規実終了に限る。DB closedで旧pin解放後、新claim Txでpinを取り直してからsource open/full hash。0039の非terminal live/delete guardも維持し、purge済original/targetを復活させない。原本不一致後の既送信を0へ書換えない。
- **starting/Location ACK未知**: 実phase名はinitiating。保存sessionなしなら同IDmetadataのみ、自動start再送なしというL48/52を肯定。409/404の結果は完成/欠落/不整合/権限不明へ分ける。旧ID照会と新folderへの送信を混同しない。
- **B/A限定/J**: 並行別command・90日prune後record再利用・原本なし副作用0を不足対として追加する方向を肯定。新DDLを既定にせず変更claimと既triggerを比例確認し、旧移行全cloneを不要に再演しない。通常S1 UI成功を新retry UI成功へ代用せず、後者の独立1boot計画を別扱いにする。

以上のB1/B2を案へ明記して再提示すれば、既肯定範囲を維持したまま採否可能。新scope・新業務機能・新強制gateの追加は提案しない。レビュー文書以外の編集0。変更本文をEOFまで確認後、全read/writeを停止してManagerへ返却する。
