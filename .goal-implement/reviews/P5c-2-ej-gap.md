# P5c-2 E / J 残条件の静的整理

2026-10-01。対象は `4b3995711c94957454cfbaf6863b6e9695abfb4a`。開始・終了照合で HEAD 一致、tracked 差分なし。goal-implement の独立 Verifier として公開 source・管理文書・正式報告だけを照合した。製品変更、test/build/import、DB/runtime/HTTP/browser、旧 private/proof/結果の読取は行っていない。本書以外の管理文書は変更しない。

## 結論

E の同 Tx fence、成功再連携だけの旧 backup 取消、通常 refresh、実所有・subscriber の中核には、今回新しい製品欠陥を確認していない。S1/S2/S3 と Retarget の既根拠を利用できる。未完は既計画の folder 付き失敗/成功再連携の利用者導線との結合確認であり、8 hook 全ての UI 再演や新しい一般化要件は不要。

J の限定 DDL・規定 checks・比例回帰・build は既根拠を利用できる。最小の補正は Node 運用文書の段階記述を現契約へ合わせること。Retarget A/I の同 bundle 代表 UI は未完のまま残す。UI3 の forensic 保全は正常 drain 成功ではないが、工具不達・終了欠測を新たな製品欠陥や E 条件へ転用しない。

本書は受入判断の材料であり、E/J 全体の done 化、追加実行、実 Google、actualfresh 移行を許可しない。

## E：項目別の既根拠と最小の次手

基準は [plan の E](../plan.md:44)、[brief の利用者決定](../brief.md:111)、[採用境界](../design.md:949)。実接続待ちはローカル契約検証と分ける。

| 元条件 | 現コードと利用可能な正式根拠 | 残条件・最小の次手 |
| --- | --- | --- |
| 失敗再連携は旧資格・旧 backup を維持。同 sub 成功も旧取消 | `connection.ts` の `adoptDriveCandidate` は candidate/現在 context/確認集合/owner/期限を照合した後、旧 epoch の `cancelDriveBackups` と新資格・epoch 更新を同 Tx で行う。subject 一致による取消省略はない。Application 対の失敗/成功、S3 の pending 対を借用。fixture の旧 subject と `verifyCandidate` は同 actor の `backup-subject` であり、成功対は同 sub を含む | 製品修正不要。P5c-1 既残群の folder 付き失敗→旧状態維持、成功→旧取消の UI と接続する。新資格への旧転送の無言付替えがないことは既 DB/型根拠を使い、全転送再実行はしない |
| 明示再連携の影響確認 | `DriveSettings.tsx:358` 以降は新連携成功時のみ旧置換、保存先処理と backup 件数、失敗時保持を確認し、取消なら `beginDriveFn` を呼ばない。確認値を送信する。`backupImpactIds` は待機 job と orphan transfer を含む。server は採用時も現在確認集合を照合する | 確認 UI→通常認可/callback→現在 GET の結合が既残群。確認取消で開始 mutation なし、失敗時旧保持、成功後旧取消と再訪をその小系列で確認すればよい。A/I retarget 確認とは別条件 |
| 通常 refresh は取消対象外、遅い旧 refresh が新連携を上書きしない | `backup/runner.ts:229` 以降は同 epoch の credentialVersion 更新で、現在 row/owner/connection/CAS を再検査する。`credentials.ts:85` 以降も同 epoch の自己 refresh 証明を保存する。通常 refresh に `cancelDriveBackups` 呼出はない。Application の refresh owner 保持→subscriber abort→成功 relink→遅い旧応答破棄、S1/S2 の不変更対を借用 | 新 refresh UI や同成功対の再実行を追加しない。実 Google refresh-token/scope 挙動は従来の実接続待ち |
| 解除・権限降格/除名/脱退・trash/purge・移動・WS 削除が同 Tx で fence | 共通 `cancellation.ts` は transfer と admission 前 pending job を取消し、commit 後だけ exact owner の abort/wake を通知する。`control.ts:298`、`membership.ts:148`、`trash.ts:109`、`purge.ts:66`、`move/usecases.ts:179`、`workspace/deletion.ts:57` に接続。membership は role rank の低下全てと離脱を扱う。S1 admitted 8 hook と S3 pending 8 hook の実 usecase/rollback 対を借用 | 新欠陥なし。既成功を再演しない。各 hook の browser UI を追加条件にしない。Retarget の head を導入しても cancellation/impact は current head のみへ絞っておらず、旧世代保護は Retarget 直接対を利用可能 |
| 実 abort と unknown/pin 保持、purge 先行なし | abort 通知は終了証明ではない。S1/S2 の closure/native/実 owner 対、S3 の開始済み手動取消後の外部 fence と pin/unknown 対を借用。Retarget の直接 app/補助対および明示借用した主 native は current head 到達差・FD/caller/ACK 保護を補う | 中核は既根拠で受入可能。全 hook ごとに実 socket 障害を直積で増やさない。UI3 app 非正常終了から backup owner の不具合を推定しない |
| subscriber が有限終端し relink を妨げない | S1/S2 の execution 対は subscriber 100、30 秒、revision、AbortSignal、stop、listener 除去と owner 非取消を確認。Application の held refresh 対は subscriber abort 後も source/refresh pin を保持し、成功 relink の fence 後に実 close で解放する。node adapter の可変所有を application へ移していない | 不変更部分を借用し追加実装・再実行なし。実通信 owner と待機 subscriber の枠・終了を混同しない |

公開コードの確認先：

- [取消/影響集合](../../packages/core/src/application/integration/drive/backup/cancellation.ts)、[再連携採用](../../packages/core/src/application/integration/drive/connection.ts:423)、[通常 refresh](../../packages/core/src/application/integration/drive/credentials.ts:85)、[backup refresh](../../packages/core/src/application/integration/drive/backup/runner.ts:229)。
- [再連携確認 UI](../../apps/web/app/components/hollow/DriveSettings.tsx:358)、[admitted hook/relink 対](../../packages/core/src/adapters/libsql/__tests__/driveBackupApplication.integration.test.ts:1180)、[同 sub fixture](../../packages/core/src/adapters/libsql/__tests__/driveBackupFixtures.ts:602)、[pending/外部 fence 対](../../packages/core/src/adapters/libsql/__tests__/driveBackupBulk.integration.test.ts:725)、[closure 対](../../packages/core/src/adapters/libsql/__tests__/driveBackupClosure.integration.test.ts)、[subscriber 対](../../packages/core/src/adapters/node/drive/backupExecution.test.ts)。公開 test source の読取は今回の実行成功を意味しない。

E の借用元は [S1 主報告](../phases/P5c-2-s1.md)、[S1 独立](P5c-2-s1.md)、[S2 独立](P5c-2-s2.md)、[S3 独立の E](P5c-2-s3.md:20)。S3 41 app 対は主の実行として扱う。Retarget の独立 54 pure・移行・app 7 群同一新 DB・補助 6 小群は [独立報告](P5c-2-retarget.md) に従い、主 native は明示借用とする。これらの件数を重複加算した新総数は作らない。

## J：項目別の既根拠と最小の次手

| 元条件 | 利用可能な根拠 | 残条件・最小の次手 |
| --- | --- | --- |
| 0039 の 5 表/connection 限定差、旧全列・NULL・資格・index/trigger/FK/ledger | S1 の限定静的照合、旧データ/rollback 行列の主報告、独立新空 DB の正式 40 migration/109 table/FK 0。独立と借用を区分した S1/S2 正式報告を利用 | 同じ旧成功行列の再実行不要。actualfresh の未適用は別に残し、新隔離 DB 成功を実運用 DB 移行成功へ置き換えない |
| 0040/0041 限定追加、SQL 中断/再作成/末尾 FK 失敗 rollback | S3 の限定 0040 静的/主 migration と rollback 3、正式 UI ledger 41/FK 0。Retarget は head/backfill/deferred FK/旧 guard 保持を独立 migration 1＋rollback 3/deferred commit と app 7 群で確認済み | 新 DDL 不要。active write guard 修正前の成功を修正後へ遡及せず、Retarget 正式報告の区分を維持する |
| 内向き port/型、規定 checks/比例回帰/build | S1/S2/S3 の不変更受入に、Retarget 静的レビューと直接比例対を追加。現 candidate の主正式報告は V1 `type-09/lint-08/format-05`、40 pure、追加 `build-02/postbuild-type-02` 成功、一意 pure 116。独立 build は 0、主実行の明示借用 | 既成功の type/lint/format/build や全 test を単に再実行しない。後続製品変更があればその到達差に比例する checks を実施する通常規約だけを維持 |
| 同 bundle/指紋 | 主 build の固定 candidate と独立前後 5 指紋一致。S3 の旧成功は不変更 UI だけに利用。Retarget の新 A/I 代表 UI は未到達 | A/I は未完。次に許可された A/I 代表 UI で同 bundle を確認し、J のためだけの別 boot を増やさない。E の既残 UI とも混同しない |
| 停止保全 | S1/S2/S3 の正常停止、現 candidate の主・独立 UI1/UI2 停止保全を各正式報告の範囲で利用。UI3 は exit1、実 process/pipe 終端後の限定 opaque→query_only audit による forensic 保全で、`normalDrained=false` と runtime/listener-end 欠測を維持 | UI3 を正常 shutdown 合格にしない。未観測項目を追加調査で埋めない。後続の許可済み runtime は通常停止/実終端→排他保全の既規約に従う。今回だけから製品停止修正を要求しない |
| 実接続手順 | `docs/runtime_node.md:230` は同 bundle shutdown module、drain と listener closure の両立を説明。236–244 は秘密設定、callback、Picker/CSP、明示同意と実 Google 検証待ちを説明 | 下記の限定文書補正が必要。実 Google 成功・actualfresh 移行は未検証のまま、別途環境/同意/資源許可を要する |

### 必要な最小文書補正

[Node 運用文書](../../docs/runtime_node.md:234) は 0038 段階のまま「backup transfer 未検証」、[242 行](../../docs/runtime_node.md:242) は「Automatic backup is OFF and unavailable in this stage」と記載する。後者は current の auto 実装/受入と一致せず、0039–0041 と原本 backup の運用範囲が説明されていない。J の「実接続手順」に結び付く補正で、新機能要求ではない。

最小案はこの節だけを、0038–0041 を含む通常移行、手動/auto/bulk と未開始時の確認付き保存先変更の現在のローカル契約、既原本/履歴/secret key と DB sidecar の停止保全へ更新すること。既存の設定 schema、scope、秘密保管、同 bundle shutdown、CSP は変えない。「ローカル契約検証済み」と「実 Google/実運用 DB では未検証」を分け、auto の初期 OFF と機能 unavailable を混同しない。通常 refresh は旧転送取消の対象外、明示再連携は影響確認後の成功だけ旧取消、保存先は永久削除を含め確認→再選択/新規作成、trash は復元案内も、外部物 delete/move なしを短く明記する。

この補正は未実施。採用後の検証は文書と現コード/正式報告の静的照合で足り、文書だけの変更を理由に新 DB/build/browser を要求しない。実接続前の手順は既存 OAuth/Picker/組織 policy/書込確認を維持し、実 backup の明示対象・成功 GET/link・同 ID の不明結果回復・安全停止を確認対象に記す。実接続の実施許可を本書から導かない。

## 進める順序と保留境界

1. Manager は E の中核契約と J の DDL/checks/指紋の既根拠を部分受入に利用できる。E/J 全体完了とは区別する。
2. 既 P5c-1 残群の folder 付き失敗/成功再連携 UI で E の利用者導線を補う。通常 refresh と 8 hook の既成功を再演せず、既許可の範囲を超える backup fixture 等が必要なら着手前に差分だけ申告する。
3. Node 運用文書の最小補正は別途編集許可後に行う。A/I 代表 UI はそれ自体の未完として残し、J 専用の反復 boot を加えない。
4. brief の実接続条件は全体完了条件として残る。現在は外部 0 の契約段階であり、実 Google/SDK/課金、actualfresh 0038 以降の移行をこの整理の次手として自動実行しない。

今回の操作は公開静的読取と本書作成だけ。旧 Retarget 工具失敗の原因を再調査・推測せず、未保存 predicate/終了証拠を補完しない。完了通知後は文書を含め全 read/write/run を停止する。
