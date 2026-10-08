# P5c-3 非 PDF 最初の縦切り：実装開始案

2026-10-01。基点は文書 HEAD `fd4a2476a60a3ad4db3da2ac92235b0334e7e895`、製品/bundle 基点 `4b3995711c94957454cfbaf6863b6e9695abfb4a`。入力は `P5c-3-contract.md`、`P5c-3-contract-check.md`、独立 `reviews/P5c-3-plan.md` M1–M5、design の P5c-3 共有方針。本書は採用待ちの一案であり、製品・SQL・helper 作成や実行を許可するものではない。

## 1. 完成像と非対象

IN-07/IM-06 の最初の縦切りは、現在編集可能なノートで取得元を明示し、HTML/Markdown の local/Drive 原本から機械再生成、text/HTML/Markdown の local/Drive 原本から既 text LLM 再生成を行う。成功は本文だけを採用し、既 revision が残る間だけ本文 undo。失敗/取消は旧本文を保持する。Drive 失敗時 local fallback、別 record/別 sub/現在 head への付替え、原本の差替え、外部 cleanup は 0。

Drive source は immutable record の一覧/exact 選択、記録本人の同 sub 資格、実行者の現在編集権限を分離する。記録者の WS 脱退だけで利用不能にしない。LLM は実行者本人の OpenRouter・既 recipe・月間 30 回を使用し、machine は OpenRouter/quota と無関係。read-only 候補/状態取得で refresh/download/新 owner を開始しない。

Office/PDF/画像の Drive 取得・再生成とその増分予算、音声方式、退会本体は未完の次段。既 local Office/PDF/画像の提供を止めたり、形式を text と偽装したりしない。本段の共有列/lease/取消に届く既 local 経路は比例確認するが、その実処理の全資源上限を非 PDF 予算で証明したとはしない。

## 2. 保存：追加のみの 0042 を第一案に固定

新表は contract の `regeneration_source_bindings`、`regeneration_source_attempts`、`machine_regenerations` の 3 表。既 `llm_conversions` / `llm_pdf_previews` へ `source_origin`、`source_binding_id`、`source_memory_bytes` の各 3 列だけを加える。旧 record/head/target、Original、conversion_jobs の列・FK を再構築しない。

既 2 表の rebuild も最初の案では行わない。`source_origin` は追加時 nullable/no-default の TEXT とし、migration 内で既全行を local-original に明示 backfill、その後 INSERT/UPDATE trigger で新 NULL/未知値を拒否する。新 mapper は NULL 補完なし。SQL の nullable 宣言をアプリの optional source と解釈しない。`source_binding_id` は nullable の通常 FK、`source_memory_bytes` は NOT NULL/既定 0 と 0 又は 50 MiB の制約。既行の既列・CHECK/trigger/index は変更せず、新制約は加算する。これは新 origin を省略した INSERT を暗黙 local にする DEFAULT 案ではない。

### 正規受付と commit 完全性

- consumer ごとに `(consumer PK, source_binding_id)` の UNIQUE index を追加する。binding の nullable `llmJobId/previewId/machineRequestId` はちょうど一つだけ非 NULL。
- binding 側は各 `(consumerId, binding.id)` → 対応 consumer `(PK, source_binding_id)` の composite FK を `DEFERRABLE INITIALLY DEFERRED / NO ACTION` とする。consumer 側の binding ID FK は通常即時 FK。consumer INSERT の即時 trigger は binding の kind/consumer ID/record identity がその行と一致することを検査する。
- 受理 Tx は現在認可・Original/本文版・connection/sub/epoch を検査→binding を INSERT→対応 consumer を INSERT→Original lock/既 quota・旧版等を保存→commit。deferred 側だけが最初の一時不一致を許す。片側 INSERT だけ、local consumer を指す binding、別 consumer の ID を使う行は commit できない。
- binding の identity/consumer は UPDATE 不可。consumer の origin/binding は通常 UPDATE 不可。Drive discriminator の後付け、local→Drive、別 binding への付替えは拒否する。source-memory の増減と cancel/version CAS は閉じた別遷移。
- source-memory の 0→50 MiB は exact consumer owner/runtime/token・現在性と全 3 consumer 表の合算を同 Tx/SQL guard で確認する。50→0 は実終了を保存済みの正規 release のみ。単なる deadline/terminal 表示で解放しない。

### 安全 redaction の唯一の例外

terminal・実 consumer owner 終端・source-memory 0・全 source attempts の実 close/caller-end/ACK 済みを同 Tx で検査した場合だけ、consumer を `redacted/binding NULL` に更新可能とする。続けて attempt→binding を削除する。binding の deferred composite FK は、その consumer の binding NULL 化後に binding を残したまま commit する操作を拒否する。逆順の binding 削除は consumer の通常 FK により拒否する。新 INSERT の redacted は拒否する。

通常 90 日 prune はこの解除後に receipt を削除し、存続 note の immutable record を残す。note purge は全 owner/memory の停止確認後、同じ解除を行って既全世代 head/record/transfer/target と note/original/revision を回収する。unknown/未 ACK は 90 日を越えても保持する。consumer の物理削除で FK を迂回しない。

正式 migration は既 Node migrator の transaction/ledger 経路を使用し、最後に FK assertion を置く。適用失敗は新表・列・index・trigger・ledger を原子的に rollback、旧全列/guard を保持する。0038–0041 を編集しない。適用後 downmigration は作らない。composite deferred FK と ALTER ADD REFERENCES が正式 migrator で成立しない場合は、rebuild や FK OFF に無言移行せず、その一点を Root に返す。

## 3. 取得 API と終了順

application の `RegenerationSourceReader.read(consumer, access, identity, signal)` を、local/Drive の閉じた union とする。戻り値は `{ bytes, lease }`。lease は caller が勝手に closed を自己申告する型ではなく、exact consumer/runtime/token に束縛した service 所有 handle。provider-native error/raw response は内向きへ渡さない。

Drive read の具体順は次に固定する。

1. memory reservation を consumer owner に取得。shared refresh の必要があれば subscriber として待ち、通知後に actor/epoch/credential を再照合する。待機 subscriber は data owner/slot を持たない。
2. maintenance/current→`withCaller(target, claim, settle)`。claim Tx は backup と共通 data global 1 / credential-owner account 1、control global 2/account 1、合算 3/account 2 を検査し、immutable attempt を claim。Tx 内で native I/O/caller/close 待機をしない。
3. settle callback 内で `execution.run` により metadata-before→owned download→全 bytes/hash→metadata-after を実行。現在 sub/file/元 parent/trash/size/hash/形式を確認する。native request/response/socket の実 close を待ち、closed proof を保存して callback を返す。成功 buffer はまだ source reader の外へ出さない。
4. `withCaller` の finally で caller ended。外側で exact proof と DB closed 行を照合し、既 maintenance 契約による ACK を完了する。ACK 前の別 claim は拒否。ACK 不明なら buffer を採用せず unknown/所有を保持する。
5. 新しい consumer current を確認し、初めて buffer+lease を返す。Drive owner はここで解放済みでも、memory/source binding/pin は準備終了まで残る。callback 内で caller-end を待たず、ACK 条件にも buffer 破棄を入れない。
6. 本文採用前は別 final-check attempt で metadata 1 回→実 close→DB proof→caller-end→ACK→現在認可/本文版/Original activeJobId/fence CAS→本文 commit。metadata と DB の分散 Tx 保証は主張しない。

1 acquire は metadata 2 + download 1、final-check は metadata 1。各 metadata 64 KiB/header16 KiB、download ≤原本の exact bytes≤50 MiB、HTTP30秒/close5秒、redirect/export/abuse confirmation/自動 retry 0。元 read の失敗で別原本へ切り替えない。通常 refresh は同 sub/epoch の credentialVersion だけ CAS 更新し、consumer を取消さない。

## 4. Memory lease と machine の所有

reservation は consumer あたり一つ、0 又は 50 MiB、global100 MiB/max2。local read も同じ service を通る。lease 内で複数 input buffer を同時に保持する API は提供せず、一つの read→準備→参照破棄/worker終端を完了してから次 read を行う。同 consumer の逐次 read は同じ予約を再用し、二つ目の予約を要求しない。input stage 終了後は 0 に戻す。

既 LLM は受付時の quota reserve を維持し、枠待ちを再受付/追加消費にしない。既 job30分・prepare30秒・dispatch90秒・stop60秒、unknown delivery と返金条件は不変更。枠待ちは元 deadline 内、通知後と期限到達時に DB current を再確認する。model/recipe/quota の変更ではなく shared preparation の admission として接続する。

既 local pending PDF の分類→準備や pages 再読も同 consumer lease の逐次単位に接続する。ready preview は classifier/入力参照/worker が終了した時点で memory0、5分の receipt 使用期限中は保持しない。preview→conversion は別 consumer/lease、新 source binding であり buffer を移管しない。Drive PDF の提供は次段までしない。

machine は専用 owned Node adapter で既 `parserWorker.mjs` の HTML/Markdown 分岐を再利用する。既 `IsolatedDocumentExtractor` は message 時に resolve し `worker.terminate()` を await しないため、その返値を close 証明に流用しない。新 adapter が worker の message と exit/stdout/stderr 終端を別に記録し、成功は正常結果と全終端が揃ってから返す。timeout/cancel の terminate 完了は失敗の安全終了であり成功ではない。parse gate は既 `withParserAdmission` と共有し、machine global1・準備 consumer max2 を重ね、別の無制限 pool を増設しない。

machine services の構成は OpenRouter/Drive の configured 判定から独立させる。local machine はそれらが未構成でも既原本と owned parser が利用可能なら提供し、Drive 分岐だけが Drive 資格/構成を要求する。machine の runtime/owner は専用 receipt と対応し、LLM の資格・quota がないことを理由に未構成扱いしない。

## 5. 出力と非 PDF 合算予算

既 `parserWorker.mjs:332` と note entity の上限は UTF-8 HTML 800×1024 bytes。HTML/Markdown 分岐の extraction notices は空。machine の返却 schema はこの二形式に限定し、HTML800 KiB・coverage enum・notices空を検査する。既 sanitizer/asset-reference 解決・projection を再用し、最終 HTML も800 KiB。切詰めて成功にはせず超過は失敗、旧本文保持。実取得済み同 note の asset map だけを再利用し、remote URL fetch は追加しない。

管理対象の非 PDF 予算は、親 input50 MiB×2 + worker transferred clone50 MiB×2 + worker V8(128+16+4) MiB×2 + output/scratch64 MiB + HTTP scratch2 MiB = 562 MiB、予約576 MiBとする。machine worker の V8 設定は新 adapter だけ128/16/4、既 import/PDF worker設定を変更しない。inputをworkerへ渡すcloneは1本、余分な全量Buffer.from/コピーを追加しない。

64 MiB は機械の wire/output保持・sanitize/projection受渡し用32 MiBと、同時 text LLM の prepared/受渡し用32 MiBを予約する。機械payloadは最大800 KiB HTML、親/workerの文字列2 byte表現・IPCコピー、sanitize前後/本文projectionを同時に保持する箇所を列挙してこの枠へ計上する。LLM preparedは既64 KiB×16segments、provider response2 MiB/既256 MiB永続response budgetを別枠で維持する。V8内の一時オブジェクトと親プロセス既heapまで64 MiBの厳密RSS上限と称さない。入力とprepared結果を閉じ込めるclosureを残さず、stage終端で参照を解放する。

この576 MiBは新非PDF source/preparationのmanaged予約であり、既 local Office/PDF/画像native変換が同居する全process RSS上限ではない。それらの child/native/画像/base64コピーの増分は次段で固定する。既形式へ128 MiB設定を流用して予算を見せかけ上合わせない。

## 6. Body-operation と全安全入口の対応

新 `application/regeneration/bodyOperation.ts` は Original.activeJobId を import/LLM/machine の閉じた union に解決する。0件と複数整合違反を区分し、kind不明をimport扱いしない。machine受付は note/Original世代CAS＋全 live/unknown set の common guard。UI前に下表を接続する。

| 既 exact path（`packages/core/src/` 相対） | 接続内容 |
| --- | --- |
| `application/note/saveNote.ts`, `application/note/history.ts` | processingを共通所有へ照合、編集/restoreによる生成中本文の上書き拒否、既履歴期限維持 |
| `application/note/setDisplayStyle.ts` | machine ID を import job として再投入しない。既importのstyle動作は維持、machineの本文採用は現在version/fenceで拒否しstyleを巻き戻さない |
| `application/note/commitNote.ts`, `application/import/processJob.ts` | 共通の現在所有/本文CASを経た呼出だけを採用。revisionは既LLM生成と同じsystem actor/jobIdとcause importを再用するが、machine receiptをconversion_jobsへ偽装しない |
| `application/import/controlJobs.ts`, `application/import/readImports.ts`, `application/llm/{request,current,control,read,worker}.ts` | 対応kindにcancel/retry/currentを分岐、機械receipt表示、前値復帰はexact activeJobId/世代一致時だけ |
| `application/note/{trash,purge,emptyTrash}.ts`, `application/move/usecases.ts`, `application/workspace/{membership,deletion,usecases}.ts` | executor失権/ownership/trash/purge/WS削除の同Tx binding+consumer+attempt fence、afterCommit exact abort+wake、他actorはcount/fingerprintだけ |
| `application/integration/drive/{connection,read}.ts` | 記録本人解除/同sub成功relinkは旧epoch source取消、失敗relinkは保持。impact集合+admissionSequence。通常refresh/folder変更だけでは取消さない |
| `application/integration/openRouter/connection.ts` | executorのLLM/preview取消へsourceを従属させる。machine/他人資格を巻込まない |
| `adapters/libsql/repositories/{jobRepository,llmRepository,pdfPreviewRepository,objectOperationRepository,workspaceRepository,workspaceDeletionRepository,noteMoveRepository,purgeRepository}.ts` | claim/body lock・object pin・安全fence・全所有終端・参照解除をSQL/Tx側でも共通集合へ接続 |

GET候補一覧は全記録者を含む keyset25/16 KiB、次pageとexactrecordを別port。閲覧者へ秘密や他人のjob詳細は返さない。machine undo は既revisionを取得して本文だけを現在版CASで戻す。title/style/tags/public identity/Original bytesのundoはしない。

## 7. 最小変更予定 path

表の brace 列挙は明示した basename だけの exact 集合であり wildcard 許可ではない。下記と§6以外が必要なら編集前にRootへ返す。既schema/guardの差は上記追加範囲に限定し、他runtimeを実配備しない。

| prefix | 既存変更 / 新規 |
| --- | --- |
| `packages/core/src/domain/` | 既 `llm/{entity,repositories,pdfPreview}.ts`, `integration/{drive,driveRepository,driveBackupRepository}.ts`。新 `regeneration/{entity,source}.ts` |
| `packages/core/src/application/` | 新 `regeneration/{ports,services,bodyOperation,read,request,source,memory,current,control,worker,cleanup}.ts`。既 `execution/hollowUnitOfWork.ts`, `di/hollowTypes.ts`, `llm/{ports,services,pdfPreview}.ts`, `integration/drive/{ports,credentials,runner}.ts`, `integration/drive/backup/{ports,runner}.ts` と§6入口 |
| `packages/core/src/adapters/libsql/` | 新 `regenerationSchema.ts`, `repositories/regenerationRepository.ts`, `migrations/0042_regeneration_source.sql`, `migrations/meta/0042_snapshot.json`。既 `llmSchema.ts`, `schema.ts`, `hollowUnitOfWork.ts`, `migrations/meta/_journal.json`, `repositories/{driveRepository,driveBackupRepository,importRepository}.ts` と§6 repositories |
| `packages/core/src/adapters/node/` | 新 `drive/sourceProvider.ts`, `regeneration/{machine,runner}.ts`。既 `drive/{execution,runtimeOwnership,factory,http,runner}.ts`, `llm/{sourceReader,execution,runtimeOwnership,config,runner}.ts`。既parserWorkerの内容は再用し変更予定なし |
| `apps/web/app/` | 既 `server.node.ts`, `driveRuntime.node.ts`, `presentation/{llmInput,llmServerFn,driveInput,driveServerFn,moveInput}.ts`, `components/hollow/{LlmNoteAction,DriveSettings,NoteTrashDialog}.tsx`, `routes/notes.$noteId.index.tsx`, `routes/__root.tsx`。新 `presentation/{regenerationInput,regenerationServerFn}.ts`, `components/hollow/RegenerationSourcePanel.tsx` |
| `docs/` | 既 `runtime_node.md`：3表/source取得・所有/unknown停止・実接続未検証のみ |

UIはsource選択/理由→確認→pending/取消→現在receipt GET→本文/undoの最小導線。LLMの既model/instructionは既islandへ選択sourceを渡し、machineは専用actionでquota0。React transition、mutation後invalidate/current再読、actor/route/receipt束縛とdirty離脱を保持する。Settings/Pickerなど別routeで自然発生しないACTIVITYを共通必須gateにしない。

比例test予定の新規 exact は `packages/core/src/domain/regeneration/{entity,source}.test.ts`、`packages/core/src/application/regeneration/{bodyOperation,source,memory,worker}.test.ts`、`packages/core/src/adapters/node/drive/sourceProvider.test.ts`、`packages/core/src/adapters/node/regeneration/machine.test.ts`、`packages/core/src/adapters/libsql/__tests__/regeneration{Migration,Application,Closure}.integration.test.ts`、同 `regenerationFixtures.ts`、`apps/web/app/presentation/regenerationInput.test.ts`、`apps/web/app/components/hollow/RegenerationSourcePanel.test.tsx`。既 `drive/{backupExecution,factory,http}.test.ts`、`llm/{sourceReader,execution,runtimeOwnership}.test.ts`、web `DriveSettings.test.tsx/LlmNoteAction.test.tsx`、libsql `llmControl.integration.test.ts/llmPdfApplication.integration.test.ts/driveApplication.integration.test.ts` は変更到達ケースだけ比例利用。既fake UoWの型追従はexact追加を通知してから行い、fixtureを狭めて既期待を消さない。

## 8. 比例検証と新資源案（未許可）

最初にmigration/型の成立を確認し、その後application→native所有→同bundle UIへ進む。`typecheck → lint:fix → format → 局所 → build1 → posttype`、旧0038–0041/lock固定、source/entry/dist指紋と候補commitを保存。無変更のS1–S3/SSR/Retarget成功全再演はしない。

| 条件 | 直接の追加根拠 |
| --- | --- |
| M1/IN-07 | owner≠executor、owner脱退後editor可、候補26件のpage境界、record/sub/parent/hash/移動/trash拒否、取得失敗local fallback0 |
| M2/移行 | 旧全値/guard/ledger保存、正常両方向受付、片側/別consumer commit拒否、安全redaction成功/不完全解除commit拒否、legacy local backfill/新NULL拒否 |
| M3 | data1/control2/合算3、refreshsubscriber0slot、closed保存→caller-end→ACK、ACK前claim拒否、read/buffer lease順、逐次read自己待ちなし、preview ready解放、abort/timeout/late/close不明/前任終了 |
| M4 | credentialowner成功relink/解除、executor失権/OR解除、note lifecycle/ownership、同Tx fenceとexact通知、候補失敗保持、通常refresh非取消、確認後新受理で再確認 |
| M5/common lock | machine/import/LLM競合、本文version race/旧値復帰、unknown/memory中purge拒否、全終端後全世代purge、90日prune、terminal historyと存続record分離 |
| 縦切り | machine HTML/Markdown成功/失敗/取消/本文undo、text LLM同じreceipt/source→契約generator→本文、quota1/30と既deadline維持、machine quota0、UI current/reload |

新root1個0700・上限512 MiB。logical DB10/合算176 MiB：0041基準16、成功clone16、rollback clone3×16、application32、native32、UI16、opaque8、audit8。移行失敗点は列/backfill後・双方向schema後・guard/ledger直前の3か所。失敗DBは保存し再実行しない。成功fixtureも通常prune/purgeで有限cleanup、ケース順・最大時刻を共有し次caseを汚染しない。正式新空初期化はbaseline/app/native/UIの4回、cloneは停止後の基準から作成する。

合算予約はDB176 +原本32 +helper/log8 +NodeTMP8 +ChromeTMP128 +材料0.25 =352.25 MiB、余裕159.75 MiB。新keyはAES32B×2と既自己auth用32B×2の計128B以下。旧proof/private/key/DB/cache/resultsは読取/hash/import/実行0。公開helper再利用は別exact許可後だけ。distはroot外256 MiB、通常build1。compile/tsx cache無効、testworker1・DBwriter1。最大actor3/WS2/note-original32、移行fixture以外の本文/原本は各1 KiB中心、50 MiB境界は逐次memory生成のnative1対でdiskへ保存しない。

自己HTTP fixtureは合計64要求/64 MiB、逐次1：native上限40（成功acquire/finalcheck4、metadata/bytes/close異常、取消/期限、資格更新）、UI上限24。送信前に exact scenario→要求数を確定し、余りを再試行枠にしない。前任/後任確認Node子は通算3/同時2・writer1、parser workerは通算12/同時2、各deadline2秒の合成対と実parse30秒/close5秒を区分。実外部Google/OpenRouter/mail/SDK・課金0。

主UIはboot1/Chrome1/context1/page1、Hollow1200要求64 MiB・背景deny150要求1 MiB。自己actor1/note2（HTMLとMarkdown）、通常auth/uploadを前提とし、自己UoWで検証済record/credentialを作る場合はOAuth/backup成功と区分する。Drive機械成功→本文/undo/reload、別原本の取得失敗で旧本文保持、text LLMは自己契約generatorのみを同bundleで確認する。初回UIで全異常を反復せず、M1–M5の競合はapplication/native根拠と分離。実行前に正式endpoint表と現在本人取得を固定し、非必須表示・別routeのticker発生を開始gateにしない。

通常停止はbrowser→app quiesce→source/consumer drain→既知worker/caller/FD/socket実終端→DBclose→プロセス/両pipe終了。失敗/terminateと正常exitを区分し、停止後active→opaque→auditを排他copy、opaque非接続・auditだけquery_only。現存unknownが実終了未証明なら保全したまま返し、削除や推測で全終了扱いにしない。独立Verifier用の新root/再検証枠はRootが候補後に別途定める。

## 9. 採用時の境界と見込み

Root判断点は、追加のみ0042/composite deferred FKと即時guard、共有memory leaseの既local到達、上記exact path・資源。既default import/PDFのheapを縮める変更、downmigration、4表目、別runtime、provider成功の偽装は含まない。実装見込みは共有保存・安全hookを含め12–20時間＋同bundle UI/独立確認。最初の検証到達点はmigration/型の成立で、未知DDL差があればそこで返す。

本段は公開sourceの静的読取と本書作成だけ。製品/DDL/helper/test/build/DB/HTTP/browser/旧private操作0、spec/spec-implement0、管理正本変更0。全文EOF確認後に全read/write/runを停止してRootへ返却する。

EOF
