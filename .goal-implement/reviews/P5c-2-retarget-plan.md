# P5c-2 Retarget 具体案の独立レビュー

## 判定

2026-10-01。具体案を設計段階で受入可と提案する。採用を妨げる blocking な矛盾は検出しなかった。未送信の単件新受付だけに限定し、既割当・実所有不明・旧結果不明・成功記録を新 folder へ付け替えない境界を保持している。0041 の実 SQL、実装、移行/競合/実 caller 終端、UI の成功を承認したものではない。

対象は `.goal-implement/phases/P5c-2-retarget-plan.md` 全253行/31,556B、SHA256 `3f1fe2da0ad13ba7e64909cf2be15f47b2e8b86bdd3344618eaf845385f27407`。全文 EOF と指紋を確認した。brief/design/plan の I、IN-05/06、既不足報告と公開コードへ照合した。

別担当が SSR patch の5 path を実装中であり、製品全体を固定版とは主張しない。本段で読んだ retarget 関連 domain/application、libSQL repository/0039/0040、Node Execution、DriveBackupPanel は基点 `574ef4704de74e39392e1d273e2f7e2169d2d88c` からの path 限定 diff に変更なし。別担当の patch/生成物へ書込・実行はしていない。

本段は公開資料/source の静的読取と本書作成のみ。製品/管理正本編集、runtime/test/import/build/install、DB/HTTP/network、旧 proof/private/results/cache/鍵/原本の操作は0。利用者への再質問や bulk retarget の追加は不要。

## 固定条件との対応

brief の保存先変更決定（88–90、111、117行）と design の retarget 方針は、確認付きで新保存先を採用することと、旧外部結果不明なら同ID確認を先行することを併せて要求する。IN-05 原文の自動再作成は利用者決定で上書き済み。IN-06 の原本 backup/既保存の再送0/多重実行抑止/理由と再試行導線を維持する。

計画の RT-I1/I2 は「旧 folder の復旧」ではなく「外部 file 作成前と証明された原本の新 folder への新 manual 受付」を直接対象にしている。旧 bulk 親 retry の意味や成功記録、別 sub、再生成の資格を変更していない。I の未完を閉じる方向に合い、S3 残 A/G/H や P5c-1/音声/実 Google の完了へ拡張していない。

## 重点照合

### 1. Head、deferred FK、CAS と移行

現 `driveBackupRepository.ts:513–527` の original lookup と0039の `drive_backup_target_original` は全 tuple を一意にする。target の folder/epoch/marker と、一度保存した fileId は update guard（0039:260付近）で不変。headへ現在先だけを分離する案は、旧値を変えず新 target を許す目的に整合する。

head tuple PK、target_id unique、target の `(id, original_id, account_id, subject)` 参照用 index、deferred 複合 FK の組合せは、head先行→新targetの同Tx保存を表現できる構成である。ON DELETE RESTRICT を deferredだから無効と考えず、purgeで先にheadを削除する順序も明記されている。新target insertのhead一致guardを同時導入するため、旧uniqueを外すだけの並行live期間を作らない。

初回headは既tuple targetなし/version1、切替はhead版と旧target版CAS・新ID未使用・全旧証拠一致、通常head delete/reinsert禁止という条件はABAと旧targetの再利用を防ぐ。新副作用のcurrent guardと、旧ownerの閉鎖/履歴redactionを分離しており、非currentになったことだけで終了処理を拒否しない。

backfillはunallocatedだけでなくallocated/unknown/confirmedを全件対象にする。これは旧unknownを消して新しい初回受付に見せないために必要で、計画は満たしている。一つの正式migration Tx、双方向対応/FK/旧全値比較、旧index置換後も含むrollback3位置を維持する。deferred違反はcommitまで含めて直接確認し、SQL末尾のFK検査だけでcommitの成立を代用しない。

### 2. 全履歴の never-sent と prune ゼロ枝

計画3.1は現在headだけでなく同original/account/subの全target/job/transferを対象にし、recordあり・fileIdあり・非terminal・active/unknown・session/offset/length/status/pin/refresh残を拒否する。既 `forTarget()` は100件上限（repository:624付近）なので、これを陰性証明へ再利用しない指定は重要である。EXISTS/NOT EXISTSと完全なkeyset走査の使い分けに矛盾はない。

既prune（repository:441–501）はterminal jobを削除し、transferのjobIdと後続jobのretryOfを解放するが、target/transferを削除しない。したがって90日後もjobId null transferを検査する案は既寿命に合う。job/transferが共に0の枝も、全target unallocated/fileId null・recordなし・正常guard下の履歴という条件を外していない。現legacy jobが残っているのに必要transferが欠測する場合は拒否する。ゼロ件を単独の「未送信」証拠にしてよいとは読まない。

新snapshotの未admission jobはtransferなしで正規に存在する（`admission.ts:144–181`）。legacy欠測と一律に同じものとして拒否せず区別する案は妥当。旧snapshotを現在情報で捏造せず、新受付だけが現在の同original identity/認可を固定する。

### 3. Folder failure、実close、ACK と前任

実runner `backup/runner.ts:375–435` はsource prepare→folder inspect/current確認→folder failure→fileId割当/永続化の順である。TRASHED/UNAVAILABLEの限定枝と、全履歴のfileId nullを併せれば、通常のfile作成前という静的根拠がある。割当済みbytes0/session nullを同じ枝へ拡張していない。

実転送は `withCaller`、source ownership、`execution.run`、resultとclosed、settle、caller finally、proof ACKを別々に通る（同:830–945）。DBのclosed保存だけで受付可にしない設計は必要。Node Executionの `accepting()` は未ACKproof/previousProof/前任残を拒否し、`withCaller` の finally はcoordinate settle内でcaller終了を記録する（`execution.ts:124–135,214–230`）。ACK後にentryが削除されればcallerはuntrackedになるため、「必ずendedでなければ拒否」に強めると正常履歴を永久拒否する。

計画は永続closed＋accepting/未ACK0/前任0＋該当exact caller非pendingをmaintenance区間で併用する。これは現在の所有契約と接続可能である。caller untracked単独、closure unproven単独を終端証明にはしない。通常maintenanceを同じcoordinate内で再呼出ししない点も既AsyncLocalStorageの再入拒否に合う。GETでACK/修復を進めない。

### 4. Receipt と current の到達範囲

現manual intent digestはclientが送ったexpected値を使い、bulkも確認時digestを固定する（`request.ts:84–118`、`bulk.ts:186–222`）。計画の「同command receiptを先に解決し、現在folder/headから旧digestを再構成しない」はこの不変を維持する方向。既失権/削除の安全projectionを飛ばして旧locatorを返す許可にはしない。

旧retry/redoのlocatorは新headへ読み替えず、current target一致を追加する。初回manualとcapture経由のauto/bulkをinsertInitialへ統一し、queued snapshotを後から付け替えない。admission/claim/currentだけでなく `objectOperationRepository.ts:24–31` のbackup pin開始SQLへcurrentを到達させる計画を確認した。現在このSQLはtransfer/原本/資格/認可を確認しており、head条件は新しい排他を最後まで通すために必要な差である。

旧record/history/receiptはfind(id)/forNoteの歴史参照、現在受付先だけはhead lookupという分離は正しい。全scope取消/impactは既 `cancellation.ts` の全live集合を保持し、headだけに絞らない。purgeも全世代の実owner/pin/refreshを確認してhead→record/transfer/targetへ回収する。旧unknownを新headの裏へ隠す逃げ道は計画にない。

### 5. 競合と確認UI

head CAS→target→request/job/transfer→admissionSequenceの同Txと、旧claim/割当・設定/relink・scope/source変更の両順序は、RT-B/Eの既競合条件に対応する。headのdeferred FKが保証するのは参照先targetの存在までで、request/jobが揃う前にcommitしないことはapplication/UoWと直接rollback対の責務として区分されている。

GET previewは副作用0、新commandのPOSTだけ全証拠を同Tx再確認し、旧結果不明で別commandを生成しない。現在actor/note/epoch/head/target/settings/digestの束縛、React pending、二重flight拒否、GET receiptとcurrent headの別表示は現Panelの安全契約を保つ。成功GETを新受付成功と誤読しない点も妥当。新folder設定そのものと当該原本を送る確認を分け、一括retargetや無断abortで証拠を作る追加はない。

## Non-blocking な実装時の具体化

1. 計画3.2のexact owner locatorのkeyset取得は必要な操作だが、3節の列挙portには具体signatureがまだない。既target repository内のtyped page契約を実装時に明示し、永続locator（transfer ID/owner generation/token）だけをapplicationへ渡してExecutionと照合する。Node proof/SQL/callbackをdomainへ持ち込まず、100件で打切った結果を安全としない。新repository/DI/表を増やす理由にはしない。
2. 「所定の操作期限内」は具体値/期限の供給元とページ境界での中断を実装時に固定する。maintenance lock/UoWを保持したままcaller終了・HTTP・source openを待たない。期限超過は全Tx未受付で戻す。これは新業務gateではなく、既計画のbounded走査と短いTxの実装条件。
3. 旧行不変の観測は新受付Tx前後と通常prune/purgeを分ける。90日後のjobId/retryOf解放やredactionまで永遠に禁止するようにtestを作らない。新targetの可変state/versionとimmutable locatorも比較対象を分ける。

上記は採用案内部で具体化できるため、現段のblockingには数えない。既portや予約pathでは実現できない差が判明したときだけ、計画どおりManagerへ返す。

## 比例検証・資源

計画の直接対はheadが到達するmanual/auto/bulk/admission/claim/current/pin/全世代prune/purgeへ絞られている。不変更provider/source/同IDsession・既500固定/auto独立の借用と、new headが変える受付/所有証拠を区分できる。共通fixture変更が既対に届く場合だけ通常順を確認する方針も、過去のfixture干渉を分割成功で隠さない条件に合う。

folder failure closedはapplication分類だけでなく実Execution/caller/source＋自己HTTPのnative代表、未ACK拒否はnative/application、前任終了そのものは不変更S2根拠の借用とnew head拒否のapplication対を分ける。新前任process全再演を本レビューから追加しない。UIはnever-owned旧取消→F2確認→新receipt/link/reloadの代表1本であり、Picker/Google成功やclosed-before-create UI全経路の証明にはしない。

資源の算術は整合している。baseline1＋成功clone1＋rollback3＋application1＋native1＋UI1＋opaque1＋audit1＝logical10。16＋16＋48＋24＋16＋16＋8＋8＝DB152MiB。DB152＋原本8＋helper8＋NodeTMP8＋Chrome128＋material0.25＝304.25MiB、root320の残り15.75MiB。native8＋UI24＝provider上限32。失敗clone/rootを削除して再試行枠にしない。独立Verifierや旧S3全系列の容量許可をこの320MiBへ含めたとは主張しない。

実fixture量・query plan・各60秒での130履歴検査・browser操作表/応答bytes・active16からopaque8へのcopy適合は未測定。上限に達する前に停止/再提案する運用が必要で、既SQLやUIがこの数値以内で必ず成功するとの判定ではない。新DB/boot/要求の追加許可を予備容量から推論しない。

## 引継ぎ

blocking 0、上記non-blocking具体化3点。0041/head案と単件確認付き新受付の方向は受入可。SSR patch終了後、Managerが新candidate/予約path/資源/担当を再固定してから実装する。I/RT-I1/I2の実装・移行・実終了・UI合格は未完のまま。本書EOF確認後、全read/write/runを停止して返却する。
