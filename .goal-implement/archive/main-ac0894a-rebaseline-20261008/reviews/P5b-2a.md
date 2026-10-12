# P5b-2a 独立検証

## 現在の状況

2026-09-28T08:02:40+09:00の最終照合までで、V1修正版 `3650ec61c45c4ad4ab0cf62b96c8dba08e70a34c` の **P5b-2a-D/Gは両方合格**。受入済み他24は2path差分の非影響を確認し維持、現在26条件すべて合格判断である。独立4警告境界・実DB34対・UI局所17対が成功。新runtime/browser/恒久fixture0、実UIは旧候補の不変更範囲を借用し、今回新bundleで再操作したとはしない。旧不合格の詳細は下に保持する。

最新独立proof J=`/Users/hikaru/.local/share/hollow/verification/p5b2a-v1-independent-20260928-o9qLzY`（0700）。基点S=`/Users/hikaru/.local/share/hollow/verification/p5b2a-v1-20260928-YxHtDu/final`。J/start08:01:28.857→J/final08:02:39.153、全99表922列/197trigger/ledger35/FK0・全16files3891B/manifestはSと一致。08:02:40.239の最終source/apps-packages/Node entry/dist/lock/HEAD全一致、製品dirty0。全exec終端回収済み、監督closed・3100/3101/fresh handles0。修正再検証の根拠と限界は末尾を参照。Managerの受入判断へ返却する。

## 初回候補の判定（履歴）

固定26条件は **24合格・2不合格（P5b-2a-D/G、同一V1）**。V1以外の具体的不成立は確認していない。実外部生成・品質・費用は未検証で、今回の受入へ拡張しない。主1607unit/影響Node196＋訂正後move26/checks/buildは明示借用、独立は58Node・150unit・実usecase4警告境界（2不成立）・同bundle契約UIである。

新proof I=`/Users/hikaru/.local/share/hollow/verification/p5b2a-independent-20260928-FMyh7H`（0700）。自己2note/原本2objects491Bは停止保全・Manager承認後に通常回収し、account1/linked1/消費6/安全snapshot8/鍵・mail・DB・backupを保持した。07:38:49正常全停止、07:39:15 fresh最終保全は開始時の全99表922列・197trigger・ledger35/FK0・全16files3891Bと一致。07:41:34最終製品指紋も全一致、製品dirty0。製品修正0、管理正本編集0。正式返却まで文書確認のみ、実行環境は停止を維持する。

## V1: 消費80%超警告が予約を含む（D/G 不合格）

採用designと固定Dは消費だけで厳密80%超、予約は別表示。`application/llm/control.ts` の実usecaseは `reserved + consumed > limit * 0.8`、`LlmUsage.tsx` はそのwarningをそのまま表示する。07:26:20.546の I/quota-warning.json は実llmUsage＋合成ports（DB/UIではない）で月30の4境界を独立確認した。消費0/予約25と消費24/予約1が警告true（期待false）、消費24/予約0はfalse、消費25/予約0はtrue。残数5/5/6/5は正しく、消費/予約破損ではなく警告判定の誤り。既存 `llmControl.integration.test.ts` の「including reservations」期待値も採用契約と不一致。Gは表示伝搬のコード確認であり、25並行予約を実UIで実施した根拠ではない。Managerは固定D/Gの不成立を採用、製品修正は全停止返却後に委譲する。

## 独立実行と根拠区分

- 07:22:23 Node6files58対（persistence/flow/control/identity/recovery/sourceMedia）成功: I/node.json。
- 07:22:47 unit7files150対（generator/sourcePreparer/resultProcessor/runtimeOwnership/execution/LlmNoteAction/LlmUsage）成功: I/unit.json。上記V1を見逃していた既存期待値は成功数と分離する。
- 新alpha1を通常登録/確認しlocal代替providerへ連携。新text原本187Bの通常取り込みが実生成1で完了。再生成1回は実200のnative endを1回遮断し、直後は通信alert/操作disabled/同受付照会を表示、provider世代2・実close2。後の通常再訪で本文「契約生成2」を確認した。通信alertの同mount自動消去は再訪と混同せず、現時点未判定。

上の「同mount未判定」は独立実UIの限界である。固定候補へは主06:36:33〜06:38:40の同bundle対（実200 end遮断、同画面reload前receipt収束/alerts0、上限job保存・追加生成0）を明示借用する。独立LlmNoteAction11対＋LlmUsage6対の合計17と、reloadのcurrent ticket/同command/errorCommand比較をコードで確認した。手動同receiptボタンの成功や再訪を同mount成功とはしない。通知中の「LlmNoteAction17」は誤表記で、正しくは11＋6。150unit総数に変化はない。

| 独立群 | 内訳と実体 | 限界 |
| --- | --- | --- |
| Node58 | persistence8、flow12、control22、identity5、recovery3、sourceMedia8。実libSQL/UoW/CAS・storage/Workerを使う既存試験を現在sourceで再実行 | generator/profile/一部所有portは合成。controlの誤った警告期待値はV1として別判定 |
| unit150 | sourcePreparer49、generator35、result28、runtimeOwnership10、execution11、NoteAction11、Usage6 | generatorは自己local HTTPと狭いclose注入、UI17はhook/router代替で実browserではない |
| quota4境界 | 実llmUsageと合成ports、消費0+予約25/24+1を誤警告、24+0/25+0正常 | UI大量並行予約・DB残数の破損を主張しない |
| 契約UI | 現bundle/trusted constructor→自己local provider。原本storage→実Worker→native HTTP→実close→UoW→表示/undo/回収 | 実OpenRouter/TLS/モデル品質ではない。戻す本文は代替providerが原文を返す小fixture |

recovery3は実child4本のowner record・自発exit/ESRCHをparentの正規DB保存と同UUIDで結ぶ。child自身のHTTP/DB crashや電源断ではない。媒体8は実SourceWorker/ResultProcessor/sanitizer/commitと既取得metadataを使い、原本HTML/MDの相対src反復を復元する。8B合成媒体の画像decode・取得工程・全版GCを証明しない。これらの補助報告と現在testを読み、独立再実行の実体を限定した。

## 同bundle実UIの結果

原本はI内の新review.txt187Bとreview.html304Bだけ。account alpha1、WS/member/追加asset0。運用fixture月6は製品既定30の変更ではない。追加生成の承認上限は6需要＋上限拒否1で、実provider受付6を超えていない。元helper/DB/key/mail/browser状態を流用せず、公開copyのnamespace・socket・ACK対象だけ自己専有へ適合した。

1. 通常text AI取り込みは全文の日本語2段落を保持し「契約生成1」、消費1。原本187Bを保存した。
2. 明示再生成は実200応答喪失を1回だけ注入。直後の通信alert/同受付再読導線と後の再訪本文「契約生成2」を別記録。provider追加1だけ、同command二重消費なし。実dialog全文を確認したundo後は本文世代1、消費2/予約0のまま。
3. 通常HTMLはLLM不使用チェックoffでも機械変換し、見出し・表・code・末尾を表示、provider受付は2のまま。明示確認後だけ世代3となり、同構造全文を表示。原本304B保持。
4. 4番目は有限provider gate中の通常取消。旧世代3本文を閲覧でき、編集linkなし/移動disabled。実取消dialog全文→accept、取消済み・旧本文保持、消費4/予約0、providerclose4/socketclose4。応答前abortのためresponse counterは3で、存在しない4番目responseをcloseしたとはしない。
5. 5番目はlocal provider応答切断。旧本文世代3、LLM_DELIVERY_UNKNOWN/自動再送なし、消費5/予約0。native request/socket5・response3を確認。これはlocal所有closedとremote送信結果unknownの区別で、所有不明を強制解消した試験ではない。
6. 履歴の通常「再試行」だけで新需要を作り、世代6に成功。再試行buttonはnative confirmを出さない既存導線で、dialogなしをaccept成功とは記録しない。
7. 7要求目はLLM_MONTHLY_LIMITの失敗job、本文世代6保持/消費6/予約0/残0/翌月表示・機械代替案内、provider受付6のまま。拒否も永続jobとして記録される点と「操作受付」表示を、生成成功と区別した。

各snapshot/statusはIの `html-*` / `cancel-*` / `unknown-*` / `retry-*` / `cap-*` / `undo-*` / `ack-*` JSON。証跡はredacted出力だけ。ACKは本人note・POST actionを厳密照合し、clone16KiB/500ms/30秒、一度のnative end遮断。handler200と受付receiptは別の根拠で、raw body/cookie/token/秘密URLのfile保存0。通常buttonを1000ms scheduleしたforeground終了後だけ次dialog操作を行い、API直POST・dialog偽装なし。

今回独立でMD browser/390px/dirty全分岐/再連携確認watermark UIを反復していない。現在bundleの主HTML/MD・390/keyboard/dirty/候補再確認UIと、独立source49/media8/control22/identity5/UI17・静的差分を対応付けて借用する。主metadata失敗と30秒gate releaseの厳密前後が未観測という限界も保持し、失敗時旧継続の因果は独立control22のheld対へ限定する。

2026-09-28T07:22:01+09:00の候補照合: commit46366db、source1246/apps-packages1119/bundle/dist7508/lockは主固定値と全一致、製品dirty0（管理未追跡のみ）。I/start07:21:59.875は全16files3891B/manifest `37c50886118e046e2ed4b3fa0e4014ab07614f01260c7ebb2f039eeff5aaf07a`。P/finalを更なるcopyとして比較し、99表922列/197trigger全旧値・構造差0、ledger35/FK0。freshの再起動/移行/認証0、監督closed・3100/3101/fresh handles0。

許可されたpublic10helperを新proofへ排他copyし、開始baseline・namespace・専用control socket・ACK対象を自己専用へ適合した。旧DB/credential/key/mail/browserstateはcopy0、旧helper実行/元proof書込0。独立契約UIは新alpha1/小text・HTML計note2各4KiB以下、WS/member0に限定した。fixture月上限6を明示採用し、既定製品30の境界は独立DB対で確認した。媒体回収前に停止下backup/exact量をManagerへ通知し、承認後に回収した。

goal-implement/Manager Loopの固定条件・独立判定・不合格差戻しに従った。原文IM/JB/AC-10/IN、brief/design、固定plan、主最終26索引/安全境界と直接変更82pathを照合した。spec/spec-implementは呼び出していない。未変更部分の全面再実行や新条件の追加はしていない。

## コードレビュー

- domainのowner/dispatch/outcome/reservation union、application ports/UoW、libSQL5表/CAS/unique note-owner/immutable triggerを照合。0034は5表追加＋attempt nullable1列、旧表再構築なし。末尾FK assertionと正常migrateのFK ON/close経路を確認。主clone-v2正常/途中SQL/末尾FK rollback3対を現在DDLへ借用する（独立再実行ではない）。独立persistence8/現在全旧値比較/新空fixture正常migrationが別根拠。
- `request/current/worker/control/read` を通読。要求は本人・現在edit・noteVersion/原本identity/epoch、同commandは同digestのみ。生成直前/応答保存/本文commitを現在条件で再照合し、current取得後のmedia対応も再確認する。旧本文に代わるcommitは既commitNote経由、投影はTx外で準備し採用前に再fenceする。undoは同生成版に限定、現在title/displayを使う。型付き失敗/DB制約翻訳の区別は独立flowに対応。
- repo intentはquota consumeと同Tx、16segmentの初回だけ加算。全segment prepared/not-sent＋terminal＋owner終了後だけ返却。unknown/lease/history期限でpinを落とさない。全durable responseだけ後処理回復、intent-onlyは再発注なし。runtime metadataはESRCH・同領域の記録再一致・未ACK predecessor保持、PID再利用/EPERMを終了と扱わない。外部料金の終了証明ではない。
- SourceReaderはexpected bytes/SHA・所有readのactual close、SourcePreparerはbounded input/media/実Worker exitまで待つ。SourceWorkerはUnicode文字境界、順序付き64KiB×16、不可分table/code、未知markerを拒否する。生成HTTPは固定endpoint/no retry/no redirect/fallback、現在profile/parameter/input/output有限値、非stop/refusal/tool/空/不正UTF8を拒否しrequest/response/socket close後だけ返す。ResultProcessorは未知/欠落/過剰marker・新media/src/styleを拒否/除去し、既sanitizer後の正本へ渡す。
- cancellation hookはtrash/purge/role失効/再連携成功と同UoW。admission sequenceは新要求単調増加、新鍵採用前にも再照合し、失敗時旧鍵/旧需要保持。snapshot archiveは実writer/予約/response budget終了後だけ、累積bucket消費は消さない。CoordinatedStorageの変更は専用brand＋exact job owner一致時だけ保留し、旧ZIP境界を変えない。
- UIはnote/actor key、mount/actor epoch/navigation revision/hrefの共有guard、samehref onResolvedで新ticketを採る。receiptは本人command＋同noteをサーバーで照合し、通信errorも同commandだけ消す。旧操作/別errorを消さず、POST追加なし。主同mount証拠と独立11hook対の限界を維持した。usageのticket/coalesced readは確認したがwarning値がV1。
- bootはsourceWorker配備、正常OpenRouter profiles/未構成、LLM recovery→runner、停止時LLM実終了→storage/DBcloseへ接続。自己通常start/TERM0、主fresh通常boot/password smokeを区分。`docs/llm_node.md` は実接続未検証・承認/費用上限・停止/保全・未提供形式を明記する。

## 固定26条件の独立判定

「借用」は主/補助または旧受入の証拠であり、自分の再実行数に含めない。各合格は今回の実変更範囲に限る。

| 条件 | 判定 | 独立根拠・借用の対応 |
| --- | --- | --- |
| P5b-2a-A | 合格 | DDL/5表・3repo/port/UoW読解、独立persistence8・新空fixture移行・99/922全値比較。主現DDL clone-v2正常/SQL/FK rollback3対とfresh通常0034を借用 |
| P5b-2a-B | 合格 | source49/generator35/result28/media8独立、Worker/reader/resultコード・実text/HTML全文。profile46/sourceReader6とMD同bundleUIは主借用。実画像decode/品質未測定 |
| P5b-2a-C | 合格 | flow12/persistence8/recovery3・ownership10/execution11独立、durable/claim/recoveryコード。実child/parentDBの限定を維持、UI unknown非再送/実close。child HTTP crash E2E未実施 |
| P5b-2a-D | 不合格 | V1。独立実llmUsage4境界の2不成立。quota原子性/30・16segment/月跨ぎ/返却はpersistence8/control22、UI月6/上限拒否は成立するが警告条件を満たさない |
| P5b-2a-E | 合格 | control22/identity5のviewer/ABA/同Tx rollback/再連携成功失敗/解除/logout、コードのwatermark/current/取消。実UI running取消/close。主同bundle再確認UIを借用、metadata/gate前後の未観測を保持 |
| P5b-2a-F | 合格 | flow12/control22/identity5/media8・commit/undoコード、実旧本文閲覧/編集移動禁止/取消unknown非置換/undo。title-style-tag-public identity/20版はDB対、全旧履歴UIは不変更保持 |
| P5b-2a-G | 不合格 | V1のwarning伝搬。その他の実text/HTML/undo/cancel/unknown/retry/capは独立UI、MD/390/dirty/同mount ACK収束は主同bundle＋独立UI17/コード。手動receipt成功や実品質へ拡張しない |
| P5b-2a-H | 合格 | native35/Worker49/ownership10/execution11/Node58・正常自己起動停止・保全/回収/固定一致。主規定checks/build/条件付き手順を借用。全OS/電源断/実remote課金終了は未測定 |
| P5b-1-A | 合格 | nullable admission列/保存/trigger差分、現在DDLと旧99/922不変。主clone-v2/旧openrouterSchema・auth/session不変更を借用 |
| P5b-1-B | 合格 | begin/promote/retryのactor/browser/epoch/sequence差分＋control22。主candidate確認UI、旧PKCE/交換1/認証相関の受入を保持。実provider未検証 |
| P5b-1-C | 合格 | 現在profile/capability/cache/fallbackコード、UI明示customとdefault使用。主profile46・旧native-reset3用途保存/新preview同bundleを借用 |
| P5b-1-D | 合格 | 独立control22の新鍵成功だけ旧epoch取消・失敗保持、水準再確認と同Txコード。主再連携UIを限定借用、provider revoke/料金取消としない |
| P5b-1-F | 合格 | 件数confirm/sequence/candidate再確認差分と独立control22/UI17。主同bundle確認/dirty390/未構成継続、旧3用途保存修正は不変更保持 |
| P5b-1-G | 合格 | profile/cache差分とgenerator35の別generation HTTP/close独立。主profile46、既controlHTTP/鍵purposeの不変更根拠を借用。実外部0 |
| P5b-1-H | 合格 | P/final→I/start→I/finalの全値/objects一致、自己回収/秘密保持/4指紋等一致/正常停止。主全checksを現在test/docs含むsourceへ適用 |
| P2a-B | 合格 | acceptUploadのtext＋AI＋linked限定、独立text AI/通常HTML機械。主MD機械と未構成text/password同bundle、旧parser不変更を借用 |
| P2a-E | 合格 | 独立履歴unknown→明示retry/上限job/ticker・control22のqueued区分、readImports投影差分。主影響imports/history対と旧90日履歴UIを借用 |
| P2a-F | 合格 | 独立recovery3の機械claim除外/90秒後非claim、flow12 ACK/復旧・専用ownerコード。旧機械lease算法不変更保持 |
| P2c-1-A | 合格 | 独立identity5の20版/同値/guard・flow/media/実undo。既commitNoteへの接続を確認、旧manual/style/restore/GC全行列は不変更保持 |
| P2d-2-A | 合格 | 独立control22/current fence・通常自己2note個別trash/purge。取消hook同Tx、元purge guard不変更保持。別note/領域一括削除0 |
| P2d-2-B | 合格 | exact専用brand/storage pin差分、独立flow/control/media/source実終了。主owned31（reader6/旧ZIP22/owner3）を借用、旧ZIP contract不変更 |
| P2d-2-C | 合格 | 正規自己回収でmaterial/LLM明細0、snapshot8と消費6保持、独立control22の正規sweep。hasWriters/安全archiveコード、元日時/90日維持 |
| P3a-D | 合格 | 独立identity5/control22の現在scope/別actor非干渉、current source/version認可コード。主訂正後move26だけを借用（初回setup失敗は業務根拠除外） |
| P3b-1-C | 合格 | 独立identity5の正規role/除名・cancelScopeActor後throw同Tx rollback・他actor/scope保持。一般membershipの旧非変更認可を保持 |
| P3b-1-D | 合格 | 独立identity5の除名→正規招待再参加ABA、旧held応答拒否/新job成功。control降格復帰と区別、全既UI再演なし |
| P1-E | 合格 | 現bundle trusted DI/実Worker/native HTTP/通常自己stop、server/config/build配線読解。主fresh通常boot/owner signin/read/signoutと未構成password/text機械を借用。fresh独立起動認証0 |

## 回収・最終保全・固定対象

自己対象はnote `01a0e4fa-7ebc-769c-a4db-7118cc2dfbc9` / `01a0e4ff-8857-7317-9714-4bb065333269`。回収前は原本2objects491B、assets/WS/member0、8版、quota6/0、全LLM terminal/response budget0、active upload/conversion/object owner0/FK0。I/contract-before-delete-v1（07:36:06.740、12files4,687,581B）と更なるcopy監査をManagerへ提示し、利用者通知・承認後だけ個別trash→対象別完全削除を実行した。実dialog全文・checkbox確認あり。UI取消/復元不可、backup保持・backup復元未実施。

I/contract-final（07:38:49.863、10files5,296,850B）は回収後停止copy。更なるcopy監査07:38:49.964でnotes/originals/assets/revisions/mediarefs/LLM/dispatch/reservation/conversionすべて0、objects0files0B、purge2 succeeded、job_result_snapshots8、quota consumed6/reserved0、account1linked1・FK0を確認。DB物理サイズ増加はページ/履歴を含み、root削除やvacuumで縮小していない。秘密を含む新自己領域は不読のまま保護保持する。

通常browserclose→runtime41527へ自己monitorによるTERM1→07:38:49.319 child-close/exit0。monitor41526/runtime41527とも不存在、3100/3101 listener0・contract handles0。最初のruntime37123も07:35:55.197 exit0、monitor37122不存在。unknown3000/他process/広域comm・argv・envは非操作。check-stoppedは一度 `.json` をlabelへ誤付与して入口guard exit1（操作なし）、正規labelへ訂正し07:39:15.050監督closed=true/exit0。これは製品失敗でなく準備差。

freshは追加起動/認証/移行0。I/final07:39:15.679とfinal-comparison07:39:15.802: 全99表922列/197trigger旧値・構造差0、ledger35/FK0。開始P/finalから既LLM5表を含むため、主移行前94/863/188との包含差である。FTS/容量を含む旧物理表全値も同一、旧11account62legacy103notes111revisions32tags9original2asset15member/20scope・論理FTS8253を変更していない。全16files3891B、通常12objects3107B＋内部4files784B、manifest `37c50886118e046e2ed4b3fa0e4014ab07614f01260c7ebb2f039eeff5aaf07a` は開始と一致。backup本体/freshをdriver-openせず、監査は更なるcopyのみclient close済み。

07:41:34.793の I/final-candidate-seal.json（secret path guardを全対象より前に実施、opaque/鍵/private対象0）:

| 対象 | 前後一致値 |
| --- | --- |
| commit | `46366dbbdb9372f9f22644e6194183214712f7ec` |
| source1246 | `f0db459573fd08898586a35c8d737264d6aa6caf98b90ea1ed624334456ddb14` |
| apps/packages1119 | `6ea1b0c4aa0a3133a321b4c2942c00583ff052b8f8a3651594277b1c58f2f888` |
| bundle | `fd90576d565a2d026aa097a52c7843dffb3c304565eb2fce1ca902a79247a16c` |
| dist7508 | `c246c4314a5092660c75afeff782a8cccfc0a7d5df4ba81bfd6a0e8f4d911aa5` |
| lock | `613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498` |

製品dirty0、管理 `.goal-implement/` だけ未追跡。main1607unit/型lintformat/build・影響Node196＋訂正move26は借用し、一度の全Node222成功とはしない。独立実行とは別集合で重複を合算しない。最大50MiB/全媒体・全モデル/全OS/電源断/実外部TLS・課金/日本語品質/後続Office-PDF-image-audio/Driveは成功範囲外。全体goalは未完了、V1修正と独立再検証をManagerへ返す。

## 正式返却

2026-09-28T07:48:28+09:00（tool clock実測）に最終判定を固定した。全文確認と本節の確認をもって、報告を含む全read/write/runを停止し、検証環境の所有をManagerへ返却する。未回収exec0、自己runtime/browser/監督所有資源0。07:38:49の正常停止後に新runtime・fixture・生成を追加していない。24合格・D/G不合格の区分、主借用・独立実行・未測定の範囲を保持する。

## V1 修正候補の独立再検証

2026-09-28T08:01:28+09:00開始。goal-implement/manager-loop全文、主報告のV1固定/返却節、plan D/Gとdesignの消費基準を照合した。製品差分は `control.ts` のwarning1行と `llmControl.integration.test.ts` の期待訂正・4境界追加のみ。認可/UoW/予約/消費/remaining/clock/reset/DTO/UI/依存の製品差分はない。製品修正・管理正本変更0。

### 独立結果と適用範囲

| 条件 | 最新判定 | 根拠 |
| --- | --- | --- |
| P5b-2a-D | 合格 | 独立実llmUsage4境界すべて成功。実DB control26＋persistence8で消費だけの厳密80%超、残数、DTO全field、UTC reset、確認clock、保存bucket全列不変を確認。V1以外の旧quota/同command/予約返却の成立根拠を維持 |
| P5b-2a-G | 合格 | 正しいwarningを返す現在usecaseと現在RSC依存経路、非変更LlmUsageの `usage.warning` 条件表示をコードで対応付けた。独立UI17は非同期guard/receiptの局所対、実画面のwarningを17対が直接描画検証したとはしない。旧同bundle契約UIはUI不変更部分へ明示借用 |
| 他24 | 合格維持 | A/B/C/E/F/H、P5b-1 A/B/C/D/F/G/H、P2a B/E/F、P2c-1-A、P2d-2 A/B/C、P3a-D、P3b-1 C/D、P1-E。共有DTO形/保存/送信/owner/認可/UIは不変更、警告boolean以外への影響なし。旧独立58Node/150unit/実UIと主根拠は維持し今回の再実行数へ合算しない |

J/quota-warning.json（08:02:04.120）は旧独立検査の非秘密logicを新copyで実行し、実llmUsage＋合成認証/quota portsを使用した。月30の消費/予約0/25・24/1・24/0・25/0に対しwarning=false/false/false/true、残数5/5/6/5。大量並行予約やUI25件の実証ではない。J/node.jsonは08:02:04.367開始、control26が08:02:10.417終了・persistence8が08:02:06.405終了、全34成功。新4対は実libSQL/正規usecaseを使い、合成bucketを投入したうえでDTO全体と読取前後の全列一致を検査する。J/ui.jsonは08:02:10.624開始→08:02:10.821まで、NoteAction11＋Usage6全17成功。各自己DB/実Executionは既afterEachの正常close・回収を含み、単一foreground exec34585をexit0まで回収してから次操作へ進んだ。

コマンドは既知Node22.22.3 `/nix/store/m73kcssdrviw0jabgrvqb87k4sd7h8qv-nodejs-slim-22.22.3/bin/node` から、J/quota-warning.cjs、root `node_modules/vitest/vitest.mjs run --config vitest.config.integration.node.ts` に対象control/persistence2file、同vitest通常configにNoteAction/Usage2fileを指定し、JSON出力をJへ限定した。migration生成/build/installは行わない。

現在配布物は `dist/server/rsc/index.js` → `assets/llmServerFn-DRc99jn-.js` のllmUsageFn → `assets/control-BIhG3wrx.js` の `warning: consumed > limit * .8`。Node entryのhash不変だけを根拠にしない。初回readではassets階層を省いた2pathが存在せず、indexの実相対importから正規pathを読んで確認した。これは読取準備差であり製品不成立ではない。残存旧chunkを根拠にしない。Usage6はstateをnullにしたhook代替のcurrent-readテストであり、warning DOMそのものをassertする試験ではない点も確認した。

主の全型/lint/format/build11691・整形後35406成功は借用。旧1607全unit/196＋26Node/旧独立58Node150unitは不変更部分への根拠適用であり、新しい全量実行ではない。新browser/runtime/UI契約fixtureは0。実外部・費用・品質・最大入力/全OSの未検証限界に変更なし。

### 新基点の保全・最終固定・停止

公開preserve/audit/seal/check-stopped4本だけをSから新Jへ排他copy、audit baselineをS/finalへ変更。旧Iは非秘密quota検査logicだけcopyし実行0・書込0、保護contract/credential/key/mail/browserstateはcopyも再利用も0。Jのmode0700を確認。停止checkは08:01:28.269と08:02:38.565ともclosed=true/exit0。preserve前後3100/3101 listener0/fresh全配下handles0で、未知3000は非操作。

J/start08:01:28.857＋start-comparison08:01:28.989はS/final基点、J/final08:02:39.153＋final-comparison08:02:39.270はJ/start基点。更なるaudit copyだけdriver-open/clientcloseし、両比較とも99表922列の旧全値/構造差0、197trigger不変、ledger35/旧ledger欠落0/FK0。全16files3891B（通常12objects3107B/内部4files784B）、manifest `37c50886118e046e2ed4b3fa0e4014ab07614f01260c7ebb2f039eeff5aaf07a` がSから不変。fresh起動/認証/移行0、material追加/削除0、既自己保護領域の復元0。

J/candidate-seal08:01:29.664とfinal-candidate-seal08:02:40.239はすべて一致:

| 対象 | 値 |
| --- | --- |
| commit | `3650ec61c45c4ad4ab0cf62b96c8dba08e70a34c` |
| source1246 | `49ed62b1ab785932d80439ece3465822d32998f9b6561563cb40c4933a1b9568` |
| apps/packages1119 | `53329b45cb0bb5c293ddc8cad26bb558ce35bb575f94f5a77edb8df357f9bfe9` |
| Node entry | `fd90576d565a2d026aa097a52c7843dffb3c304565eb2fce1ca902a79247a16c` |
| dist7512 | `ac00cac8e587e9e3465ae412ea5deb8857573392e7e40d1525651ac5d52d342e` |
| lock | `613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498` |

製品dirty0、管理未追跡だけ。全foreground execはexit0回収、runtime/browser追加0、残自己所有資源0。本文全体・本追記の確認を終えてから報告を含む全read/write/runを停止し、D/G合格・他24維持として環境所有をManagerへ返却する。全体goalの完了を意味しない。
