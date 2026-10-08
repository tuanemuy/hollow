# P5c-3 Drive原本からの再生成：静的接続案

2026-09-30。Manager採否用の設計案。IN-07とIM-06のDrive入力を、現在編集権限・記録本人のDrive資格・既変換/版/undoへ接続する。製品実装・DDL・新helper・DB・鍵・実API・費用は0。音声の調査/設計/実装は保留のまま行わない。P5c-2 S1の実装者がruntimeの唯一のownerであり、本案の採用はその書込範囲や実行権限を広げない。

## 根拠と読取範囲

- [brief](../brief.md)、[design](../design.md)のDrive連携境界、P5b-2の本文生成/月間枠、P5b-3a1のPDF preview/確定契約。
- [P5c-2最終案](P5c-2-plan.md)全文、[IN-07](../../spec/scenario/integration.md#in-07-バックアップした元ファイルからノートを再生成する)、[IM-06](../../spec/scenario/import.md#im-06-llm-による構造化をやり直す)、形式別変換方針、[JB](../../spec/scenario/jobs.md)全文。
- 公開sourceのLLM request/current/pdfPreview/worker/control、機械importのprocessJob、Original、現在note認可、Node sourceReader/Drive HTTPの接続に必要な箇所。

P5c-2案は45,773 B、SHA256 `e89e96a0b40f66c48991e460eb6364bd47f400975425b277612704e476db3377`。2026-09-30 12:11:24 UTCの読取照合でbriefは `1f5dc42509248238fc3fdede2b054a472423abe5420ced736be46e434f2726d2`、designは `8501dc8a02e0e8020aa874f1f8966efeafc59ebf52ec4df40dd5afba89f8e3ab`。公開HEADは `87d0defbcf9e0689c4c062cad39aa28821eff184`。P5c-2担当の書込は止めていないため、作業ツリー全体をこのcommitへ固定した証拠ではない。進行中のDrive/取消/purge sourceは参考読取に限り、P5c-2の実装完了・未変更・検証合格とは扱わない。

## 固定する利用者結果

現在の個人所有者又はWS owner/editorが操作する。creatorや元所有者に固定せず、viewerへ広げない。実行者とバックアップ記録者は別人でよい。Driveは記録者の同sub接続、OpenRouterと月間枠は再生成実行者本人のものを使う。他人のOpenRouter鍵やquotaを借りない。

操作は二つを区別する。

| 操作 | 入力と変換 | 本文への結果 |
| --- | --- | --- |
| IN-07「元ファイルから再生成」 | 明示選択したDrive recordから実取得。形式別の機械/LLM方針へ接続 | 確認した旧本文を版として保持し、成功時だけ置換 |
| IM-06「LLMで作り直す」 | 原本又は明示選択したDrive record。本人のモデル/追加指示でLLM | 同じ置換/失敗保持/undo。Drive選択時はローカルfallbackなし |

HTML/Markdownの通常再変換をLLM必須へ変えない。text/Office/文字PDFは既形式別方針、画像/全頁画像PDFは既LLM提供条件を守る。LLM方式として確定した要求を失敗後に機械方式へ自動変更しない。音声は未提供/保留を表示して開始しない。取得原本のbytes backupが可能でも音声再生成の再開とはしない。

再生成中は旧本文を閲覧可能なまま編集不可とする。成功時にタグ・現在公開設定・共有リンク/公開URL・title/styleを巻き戻さない。失敗/取消では旧本文を維持し、部分出力や取得途中の内容を保存しない。画面離脱/通常logoutだけで受理済jobを取り消さない。

## P5c-2で今保持するrecord契約

Rootへ先行共有した範囲は次の3点だけ。source-originや再生成workerをP5c-2 S1へ混ぜない。

1. confirm済recordを不変locatorと内容fingerprintで選べること。note/original/credentialOwner/sub/file/folder/bytes/hashを後のbackupへ無言差替えしない。完全immutableなら更新version列は必須でない。
2. 解除でrecordを消さず、退会後も存続noteから「記録本人が利用不能」と判定できる有限状態を保持すること。account削除cascadeで再生成元の存在まで消さない。opaqueな来歴又はtombstoneでよく、退会者の資格/emailを残す要件ではない。
3. recordのfolder/file resource-keyを資格epochと別の寿命で復元できること。旧epochは暗号bindingの来歴として使っても、旧credentialを保存/復活しない。同subへの新連携後は現在資格を使って同recordを再検査できる。

形式/nameは存続Originalとのjoinで固定できればrecordへ重複列を要求しない。recordはjob90日pruneで消えず、note purgeで必要所有の終了後に回収する既P5c-2方針を維持する。source-originの保存方式や機械再生成用の状態はP5c-3の別設計差である。

## 現在認可と取得元の選択

serverはclientのaccountId/sub/fileId/任意URLから資格を選ばない。入力は本人session、note ID、現在本文版、record locator、command、変換方式/モデル確認だけ。serverで順に現在note編集権限→recordのnote/original一致→記録actorの存続→linked/有効な同subのDrive connectionを照合する。record locatorだけで任意Drive fileを読めるAPIにしない。

記録actorがWSを脱退/除名されたこと自体を、存続recordの永久失効理由にしない。現在編集者の認可と記録actorの同sub接続で判断する。再生成を開始したactor自身の失権は別の取消条件。移動済noteも新しい現在scopeで受理し、進行中のownershipGeneration変更は旧要求を失効させる。

候補は現在noteのconfirm済recordだけを有限ページで返す。既定候補を画面に示しても、利用者の確定後はexact recordへ束縛する。別actor/subの候補へ自動巡回して成功させない。DTOはlocator・必要最小限の可否/理由・本人か否かを基本とし、他人のjob/Driveメール/sub/秘密/resource-keyを返さない。

| 状況 | 結果と案内 |
| --- | --- |
| 記録本人の未連携/needs-relink | 本人は同じGoogleアカウントへの再連携を案内。他メンバーは自分のDriveへの再backup後の明示再生成を案内 |
| 記録本人の退会 | 有限な利用不能。現在編集者へ自分のDriveへの再backupを案内。退会者の資格を回復しない |
| 記録subと現在接続subが異なる | 同じfile IDが読めても拒否。別subの資格へrecordを付替えない |
| 同subで再連携済み | 旧epochは来歴。新しい明示要求が現在資格で元recordを検査できる。旧進行要求を新epochへ移管しない |
| 現在backup設定folderが変更済み/未設定 | それだけで既recordを失効させない。再生成はrecordが指す元folder/parentsを検査し、新設定先へ変更しない |
| 自分へ再backupするローカル原本も取得不能 | 再backup成功を約束せず、原本を用意した明示再取り込み等へ案内。Drive再生成をlocal成功へすり替えない |

## Driveの実取得と全bytes照合

公開公式文書を2026-09-30に読取。blobは`files.get?alt=media`で取得し、`capabilities.canDownload`を確認する。Workspace形式のexportは別APIであり、P5c-2が保存した原本binaryの代用にしない。[downloadガイド](https://developers.google.com/workspace/drive/api/guides/manage-downloads)

`files.get`の固定endpoint、共有Drive対応、resource-keyの既境界を維持する。`acknowledgeAbuse`を自動有効化しない。scopeを広げたり、webViewLink/webContentLinkを任意fetch先にしたりしない。[files.get](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get)

Fileのparents・size・非trash・canDownloadを検査する。sha256Checksumは欠落し得るため、metadataだけで全bytes検証を省略しない。provider versionは変更観測の補助であり、記録時から不変を必須とすると単なるrenameまで永久拒否するため、record identityの代わりにはしない。[File resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)

最小の取得順は次のとおり。

1. current DB条件と取消generationを照合し、記録ownerの現在資格版へ束縛して専用read ownerをclaim。refreshはP5c-2の実owner/subscriber分離を再用し、期限付き待機のためにcontrol枠を占有しない。
2. 同fileのmetadataを取得。file ID/非shortcut binary/非trash/parentsがrecordの元folderと一致、driveId・size整合、canDownloadを確認する。resource-keyが必要なら正しいfile IDとの組を使い、raw値を出さない。404は削除断定ではなく取得不能として中止し、403やtrash/moved/changedと有限に区別する。
3. 固定APIから全binaryをowned read。期待bytesを超えた時点で停止し、EOF時の実bytesとSHA256をrecord及び現在Originalへ照合する。Content-Lengthや遠隔checksumの一致だけでは合格にしない。取得途中のbytesをclassifier/LLMへ流さない。
4. 実request/response/socket/callerの終了を確認。取得後metadataを再照合し、途中の移動/trash/変更を検出したら破棄する。検証した同じ独立bufferだけを次工程へ渡す。
5. 本文採用直前にも現在DB条件と元fileのparents/利用可能性を再確認する。外部I/OはUoW外、戻った観測はexact read owner/record/epoch/cancel世代へ束縛し、Tx内で現在値を再比較する。

metadata照会とHollow DB commitをGoogleとの分散transactionにはできない。最終外部観測後の競合を完全遮断した保証はしない。観測できた移動/改変は採用しないこと、生成に使う全bytesは固定原本hashに一致することを保証範囲とする。外部変更を無視するTTL cacheや任意revisionの読出しを追加しない。

Nodeの既`NodeDriveHttp.read`はJSON/folder向けの有限契約であり、そのJSON上限を全binaryへ緩めない。download専用port/adapterを分け、任意requestを内向きへ出さない。metadata失敗、bytes不一致、transport failure、実終了不明を判別unionへ翻訳し、raw body/path/token/stackを表示しない。downloadの途中再開/自動再試行は初期案に含めず、失敗は有限結果と明示再試行へ収束させる。

## source-originを既変換へ接続する

現[request](../../packages/core/src/application/llm/request.ts)はOriginalからcontent identityを作り、[current](../../packages/core/src/application/llm/current.ts)はOriginalとactiveJobIdを照合する。[worker](../../packages/core/src/application/llm/worker.ts)と[PDF preview](../../packages/core/src/application/llm/pdfPreview.ts)は`source.original.storageKey`を[NodeLlmSourceReader](../../packages/core/src/adapters/node/llm/sourceReader.ts)へ直接渡す。このままDrive取得確認だけを足して既requestを呼ぶと、実生成の入力はローカル原本となりIN-07を満たさない。

内容identity（original ID/format/bytes/hash）と取得元を分離する。新しい内向き`SourceAccess`候補は`local-original`と`drive-record`の閉じたunion。Drive枝はexact record locator/fingerprint、credentialOwner、subject、受理Drive epoch、note ownershipGeneration、取消世代へ束縛する。原本format/recipe/prompt/準備manifestの意味は変更しない。`storageKey`へ擬似Drive URLを詰めず、globalなreader差替えや新Originalへの置換を行わない。

source-originは受理/preview時に耐久保存し、確認・worker・応答保存後の回復・retry・現在GETで同じ正本を参照する。Drive枝のbinding欠落を「旧local」と補完してはならない。旧rowだけを明示互換localとして扱い、新Drive rowにはbinding必須のCHECK/FK/mapperを設ける。単純な任意sidecar欠落→localの推論は不可。具体的にはconversion/previewへの取得元discriminatorと再生成source bindingの明示参照が候補であり、型と保存移行をP5c-3実装前にRootへ提出する。P5c-2の5表以外へ黙って追加しない。

初期案は一回のsource読取につき非音声原本上限50MiBの検証済buffer一つとし、既LLM readerの上限を維持する。新しい永続spool/cache、元Original.storageKeyの書換え、previewのbyteを期限後も保存する機構は作らない。複数の再準備readが必要なら同じDrive枝を解決し直し、各回の全bytes/hash/現在条件を守る。既local readerの安全な閉鎖は不変更。

### PDF preview

Driveを選んだPDFは、begin時にsource-origin/record/原本identityを固定して、実取得・全hashの後に既classifierへ渡す。previewから確定まで実LLM発注0・quota消費0・本文lockなし。既5分期限、actor/note一件、現在編集権限/本文版/所属世代/OpenRouter epoch/原本identityの条件にDrive bindingを加える。GETで取得や分類を開始しない。

用途はstrict-text又は全頁pagesの既閉じた結果。壊れたPDFを画像化で救済せず、model用途/manifest/hashをclientから受理しない。利用者の用途/モデル選択と本文置換確認後、preview consume・conversion・quota予約・旧版保存を同Txで行う。Drive previewとlocal previewを同一receiptへ付替えない。

生成workerはDriveから再取得して全bytes/hashを検査し、既previewのsource/policy/preparation proofと照合する。preview後のDrive変更や失効を検出したら旧本文を維持し、新しい明示previewへ案内する。previewの実ownerをconversionへ移管せず、閉鎖済previewから固定内容契約だけを渡して新ownerをclaimする。

### LLMと機械再生成

LLMは実行者の有効OpenRouter epoch・選択モデル/用途を使い、既quotaを受理時に一回だけ予約、最初のdurable dispatch intentで論理1回を消費する。Drive GET/refresh/PDF分類/内部分割は回数を増やさない。Drive失敗等で全未送信・実終了・送信権限失効が証明できた場合だけ予約を返却する。unknownをtimeoutだけで返却せず、発注済みなら旧本文保持の失敗でも消費1を維持する。

機械方式は[DocumentExtractor](../../packages/core/src/application/ports/documentExtractor.ts)とsanitizerを再用するが、現[processJob](../../packages/core/src/application/import/processJob.ts)のimport状態更新・失敗表示・参照取得スケジュールを再生成として無条件流用しない。Drive全検証後のbytesを明示入力し、旧本文/coverage/版の退避と失敗復帰、成功本文commit/undoを再生成共通契約へ接続する。機械方式のquotaは0。新source bindingと非LLMの再生成receipt/結果をどこへ保存するかは同じP5c-3型/DDL案で固定し、架空のllm_conversionで代用しない。

原本由来の既note-owned素材は現在権限・対応mapを確認して使えるが、再生成を口実に新しい任意外部URLを取得しない。既importのIM-05受付を変更せず、再生成で必要な参照挙動は既取得済素材の再利用から接続する。通常HTML/MD機械処理とLLMによる明示作り直しを混同しない。

## 本文lock・版・undo・ジョブ寿命

受理Txで現在本文版/現在権限/非trash/active jobなし/原本identityを検査し、既`ensureRevisionHead`で置換前の版を確保して再生成lockを置く。preview段階には置かない。LLMは既Original.state=processingとactiveJobId、conversion active判定を再用できるが、機械枝やDrive download準備中にも同じlockが効く明示連結が必要。note編集/save/history restore/move等の全既入口が同じ判定を使うことを比例確認する。

成功は既`commitNote`へつなぎ、本文・新revision・FTS・素材pin・本文更新による既失効hookを同Txにする。公開identityと共有token、タグ、現在title/styleを保つ。失敗/取消は旧本文/既版を維持し、原本状態/coverageを復帰させる。運搬/LLMの遅い成功が取消又は新note版に勝たない。

undoは既`undoLlmBody`の条件を共通化して利用する。成功結果の本文版が現在版と一致し、現在編集権限と旧revisionが有効な場合だけ、旧本文を新revisionとして戻す。title/style/tag/公開設定は巻き戻さない。後続編集後は履歴復元へ案内する。Drive再取得や再発注をundoの前提にしない。元revisionの保持期限をjob90日やrecord寿命へ勝手に延ばさない。

job/receiptは実行者本人だけに表示し、他人のbackup jobと混ぜない。履歴90日、再試行は新job、同command照会で期限延長なし、成功/取消は元操作からやり直す。新retryも現在編集権限・同record・現在接続・本文版を再照合し、旧epochの要求を新資格へ付替えない。取得元/モデル/本文が変わった場合は新しい確認へ進む。backup recordは履歴が消えても存続noteに残り、新しい再生成を開始できる。

## 取消・所有・枠の分離

Drive source実HTTP、source bytes/分類Worker、LLM dispatch、本文commitを別の所有として扱う。Drive read targetはauthorization/control/backupを偽装せず、`regeneration-source`等の閉じた種別をP5c-3で追加する候補。読み取り失敗・実close不明は専用の厳格なerror/owner証明で保つ。全資源の実close前にpin/予算を解放しない。

最小枠案はP5c-2のdata用global1/account1をbackupとsource取得で共有し、control global2/account1を維持すること。account軸はDrive資格ownerであり、実行者のLLM global2/account1とは別。独立した新download poolを無断追加しない。未知backupがdata枠を保持する場合、再生成の待機は有限に失敗できるが旧所有を借用/解除しない。新認可/解除はcontrolから可能なまま。これはManager採否が必要な共有変更であり、S1へ先取り実装しない。

取得後はDrive native close/DB ACKを終えてから分類/LLMへ進み、Drive HTTP枠を生成中ずっと占有しない。LLM workerからsourceを待つ場合もsignal/期限で自身の待機を終端でき、資格refreshの実ownerへ待機Promiseを永久連結しない。実HTTPを開始したsource ownerのunknownは別に保持する。同一socketを二つの実HTTP枠へ二重計上しない一方、依存するLLM workerの未終端をDrive終了だけで成功にしない。

| 事象 | 必要な取消/継続 |
| --- | --- |
| 本人の再生成キャンセル | 進行中でも本文不採用。新read/dispatchをfenceし、exact実ownerへabort。通常一括backupの開始済み完了待ちと分ける |
| 記録ownerのDrive解除/退会 | 当該Drive bindingの取得/preview/生成を同Txで失効。実行者が別人でも本文採用不可。本人一覧へ他人のjob内容は開示しない |
| 記録ownerのDrive再連携 | 失敗候補なら旧要求維持。成功で旧epoch bindingを失効し旧所有へ通知。新epochへ無言移管しない。影響確認には安全な件数/種別を含める |
| 通常access token refresh | epoch/subが同じなら継続。実使用credentialVersionのCASと遅い旧401拒否を維持 |
| 実行者OpenRouter解除/成功relink | 当該LLM再生成とそのDrive入力工程を取消。機械方式をOpenRouter依存にしない。Drive backupそのものは止めない |
| 実行者失権/降格/脱退、note trash、WS削除、ownership変更 | JBの外部取消fence。現在認可だけのpump検出に委ねず同Tx hookへ接続 |
| 記録者だけのWS脱退 | 存続recordの自動失効は追加しない。実行者が今も編集可能で記録者同sub接続が有効なら新要求可 |

新要求を受けるために未知の旧backup/LLM ownerを終端扱いにしない。cancelledの表示とunknownの実所有を分け、purgeはsource binding/LLM/previewのactive・unknownを全て照合する。履歴90日pruneやpreview期限で実所有を消さない。旧runtimeは既正規の前任終了証明後だけ回復し、保存済LLM全応答はsource/current/recipe一致時の後処理だけ再開、intent-onlyを再発注しない。

## 段階と採用前に具体化する差

1. source-originの型/保存・record現在照会・有限owned download・本文lock/取消hookを先行確定する。既local変換とP5c-2の接続を壊さない比例対を持つ。
2. 小さな非PDF原本でDrive実取得→機械又は既LLM→本文commit/undo→本人履歴まで縦接続する。別人recordとcurrent actorを最低一対で区別する。
3. PDF previewと再取得/用途proof、既Office/画像/全頁PDFの比例対、失効/履歴/prune/purgeの境界を接続する。音声は含めない。

初期の有限値は既50MiB reader、LLM job30分・dispatch90秒、preview5分/分類120秒を維持する。Drive取得は一要求30秒/close猶予5秒・retry0を候補とし、whole-body memoryとparser copyを合算した実予算を実装委譲前に提出する。metadata64KiB/header16KiBを候補とする。これらはOS硬保証ではなく、実fixture/DB/HTTP/browser数、保存移行、停止保全は別exact予算/許可を待つ。

主な変更候補は、再生成source domain/repository、LLM request/current/worker/pdfPreview/control/readと機械再生成application、Drive download provider/HTTP/Execution/refresh、同Tx取消/purge、transport/UIである。既LLM recipe/prompt/quota/commitを作り直すフェーズではない。新表数・既表加算/限定再構築の必要範囲・旧row互換・FK/trigger/rollbackを実装前に固定し、P5c-2の正式移行番号と競合させない。本案だけでDDL変更許可を得た扱いにしない。

## 完成条件候補と限界

| 条件 | 観測する結果/根拠 |
| --- | --- |
| R1 現在編集者と記録本人の分離 | 他メンバーの記録が使え、viewer/他note/別subは拒否。WS脱退のみでrecordを永久失効しない。IN-07/design |
| R2 実Drive入力 | local storageを成功値で読めない対でも、代替Driveの全bytesだけで生成。Drive失敗時のlocal fallback0。IN-07 |
| R3 外部同一性 | parents移動/trash/404/size/hash/途中切断/close不明で本文不採用。metadataだけの合格0。design/公式取得契約 |
| R4 preview/発注 | Drive bytesでPDF用途確定、preview中発注0、confirm後の変更検出。既recipe/モデル用途/全頁proofを維持。IM-06/既PDF設計 |
| R5 本文/undo | 編集lock、失敗/取消の旧本文保持、成功版と本文限定undo、タグ/公開/共有identity維持。IN-07/IM-06/JB |
| R6 quota/所有 | 実行者30回・論理1file1回、未送信証明だけ返却、Drive/LLMの実closeとunknown保持、control非占有。brief/design |
| R7 記録寿命/案内 | job90日後もrecordから開始、解除/退会の本人と他人の案内を分離、purgeは実所有終了後。IN-07/JB/P5c-2 |
| R8 正規UI | 現在actor/command/receipt純GET、再POST0、pending/結果/再訪、別sourceを無言再選択しない。既presentation契約 |

純/DB/自己HTTP/同bundle UIを根拠別に報告し、代替provider成功を実Google権限・実取得・実LLM品質/課金成功へ読み替えない。実接続は利用者承認済account/file/bytes/費用/残存物条件の別許可待ち。P5c-2の未完をfixture setupだけで達成済みにしない。

## 未決の分類

原文/利用者決定を変える質問は現時点で不要。取得元を明示して失敗時に止めること、現在編集者と記録者資格を分けること、同sub/parents/hashの照合、失敗時旧本文保持は既入力から決まる。改変されたDrive原本を新原本として採用する機能、別subへrecordを移す機能、音声再開は本案に含めない。

Managerの設計採否はsource-originの永続化差、機械再生成receipt/本文lock共通化、data枠共有、Drive成功relink/解除と別実行者の再生成取消の確認投影。いずれも既要件を満たす技術接続案であり、利用者へ同じ仕様を聞き直す事項ではない。具体保存/型案が既受入の寿命や取消を変更すると判明した場合だけ、その差を原文とともにRootへ返す。

本書以外の書込0。全文EOF確認後、全read/write/runを停止してRootへ返却する。

EOF
