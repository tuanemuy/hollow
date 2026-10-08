# P3f 実装報告

## 現在の結果

2026-09-19T19:20:01+09:00、P3f-A〜H の Implementer 完了候補。Manager 受入・独立検証はこれから。

- 製品 commit `05104add96bdec027e949ed2fd1efb444aa44f0b`。41 files、管理文書は stage/commit していない。製品 worktree clean。
- 最終規定 checks 成功、unit 72 files / 742、Node 26 files / 359（P3f 27 対を含む）、db generate 差0、build成功。19:07以降の実UI bundleと最終再buildが同一。
- fresh 新規4WSのみ削除し、実回収3notes・新原本75B。既存103active notes/31tags/9originals/2assets/12objects3107B、旧12scope charge、旧全列、70trigger本文を保持。FTS内部2表の物理行更新は区分した。
- 19:17:06 正常drain/exit0。自己browser close、ports3000/3001・fresh DB handles・active writers・未終端WS回収/purgeは0。最終保全 `final/` と比較JSONを保持。
- 判断依頼なし。下記項目表と最終引継ぎから独立検証へ。運用値は lease60秒、2秒周期、wake最大20step、step50note ID。leaseは物理I/O強制期限ではない。
- UI補助は6files/7pure作成のみで18:14:17に停止。Implementerが統合・修正し、最終pure8と実UIを検証した。

## 対象・保全

- 開始 HEAD `2ee4826b6422a9f5ae38aa0e2c637e0c3b9276a8`。
- 2026-09-19T17:58:02.236+09:00、停止した fresh を専用 `p3f-delete-20260919-mhDZym/start` に DB online backup + 12 objects / 3107 B 保全。source 837 files `a3099ee518ddbd0a6b329d45edc0090814b3a0cf296387bcf0472aaa35c526ac`、lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`、既存 bundle `4891ac67e8142ced8b8c748c809cc1f2e650540144fd8940ab3d3924596c5a78`。
- 既存103notes/31tags/12objects、既存 scopes/charges/19parents/48targets/51attempts は破壊対象にしない。18:32 に新0023+0024を fresh へ適用、runtime/browser検証開始済み。
- 根拠 root: `/Users/hikaru/.local/share/hollow/verification/p3f-delete-20260919-mhDZym`。独立 P3e 保全は不変。

## 変更の要点

- Workspace 正常型を active-only、DB profile を nullable + active必須/deleted縮小 CHECK、通常 repository は deleted を返さない。slug は保持。
- 新3表は durable intent、note/purge 対応、本人 request receipt。受付時に全member失効、通常jobと該当未終端batchだけ取消、未bind入稿停止、icon pointer/招待秘密/continuationを失効。
- intent に currentNote 所有を結び付けた内部 purge 原因。先行purge finish は同Txで workspace target を upsertし、cursor 前の完了を取りこぼさない。
- object writer の begin/register/publish 共通 predicate と reference object採用へ currentWS active確認。boundはcurrent note、unboundだけadmission scope。GC はactive media writerを除く。
- 非bind資源候補・member/tag/emptydraft cleanupは有限。common storageKey claim の実削除確認後だけcleanupを確定する。全資源枝の最終根拠は項目表と27対のNode試験に記載。
- POST は `{workspaceId,requestId,confirmation}`、確認名は現在値exact。GET は本人request ID照会。nullは未受理の証拠ではなく不明を保持。本人履歴は受理から90日/50keyset、intent寿命とは別。
- `delayed` は intent.lastFailure 非nullという正本だけから導く。時刻推測で失敗確定しない。
- root が actor別 pending を持つ。sessionStorageとstorage不能時memory Mapには `{actorId,workspaceId,requestId}` のみ、strict UUID検査、name/確認文/結果本文は保存しない。確定したrequestだけ消去。unknownの自動POST/新ID再送なし。旧actor応答は現在UI/routeを変えない。異なるWSの不明要求を同時保持するため配列とし、actor切替時に別actorの配列へ置換しない。独自TTL/新業務上限は加えない。

## 実行根拠

| 実時刻 JST | 対象/操作 | 結果・範囲 |
| --- | --- | --- |
| 2026-09-19T18:07:20.252+09:00 | `migration-clone.mjs` → 新copy `migration-soPN1Q` | 0023成功。15主要表の旧全列、70 trigger名保持、FK check 0、integrity ok、active必須/deleted縮小/revision guard拒否3。全旧表・trigger本文保全まで証明したとはしない |
| 2026-09-19T18:17:04+09:00 | 新workspaceDeletion Node 初回7 | テストfixtureの戻り値shape/cleanup API/91日session期限の誤りで失敗。製品不具合と混同しない。fixture修正後再実行 |
| 2026-09-19T18:17:47+09:00 | `pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/workspaceDeletion.integration.test.ts` | 7/7成功。owner/exact/dedupe、他actorreceipt拒否、全memberread/create失効、個人保持/slug予約、0件、active/trash回収、admission前finish、lease再claim/旧token、receipt91日失効後回収。91日試験のsession延長は隔離fixtureの人工準備 |
| 2026-09-19T18:18:33+09:00 | 同config既存 `purge.integration.test.ts workspace.integration.test.ts` | 26/26成功、6.25秒。最終候補byteの全回帰ではない |
| 2026-09-19T18:22:05+09:00 まで | `pnpm typecheck` | root/core/web/infra成功。最終固定前 |

## 実装中の追加根拠

### 18:29〜18:43 追加根拠

- 18:29:42 新 Node 12/12。追加5件は501件有限admission、未bind媒体3Bのactive writer中課金維持/late write拒否/終了後実削除、人工remove故障と30秒再試行、bound draftの移動先優先、共有companion3Bの他WS保持/最後の所有者回収。隔離fixtureの人工準備と実storage削除でありfreshの物理削除ではない。
- 18:31:00.353 移行新clone `migration-tbkUgZ` に0023+24を適用。全旧56表447列の双方向EXCEPT・件数差0、70trigger本文（空白/大小文字正規化）一致、FK0/integrity ok、guard拒否3・deleted縮小成功。旧0022以前は無変更。
- 18:31 typecheck/lint:fix/format成功（既存36warning/34infoは残存）、unit72files741件・Node26files344件・build成功。これは後述actor補強前のsource857 `95e46080ceb8d215708f37aba91d14ee89a629bf6b94b8008557bcaf34d03ee4` / bundle `79f327dff25a94ee9b92c60e1c886fd124ab593cd174e481f746b398ccaae0fd`。
- 18:32:45.665 premigrate停止保全12objects3107B。18:32:45.834本体migration台帳23→25、FK0、既存103notes/9activeWS/15members保持、deletion0を確認。18:32:45.903安全wrapperからPID53177/session70113を起動、18:32:46.116 listening。
- 18:40〜18:43 同bundle実UIで新WS `01a0b90a-0a59-768d-8de2-e5a2b56f8c03`（P3f UI deletion 1840）だけを作成。390幅の削除説明、初期focus閉じる、不一致名末尾spaceでsubmit disabled、Escape取消・focus元復帰・横overflowなし。outsiderが同新WS設定へアクセスすると表示不可/個人へ戻るのみ（削除権限なし）。
- 新note `01a0b90a-f770-76db-88f3-2d31d0a1ae8a`、新75B HTML原本note `01a0b90b-5e8e-73d9-a050-1eb0af086b17`、新tag P3f-delete-onlyを通常UIで作成。LLMなし、HTMLに外部参照なし。既存対象へ操作なし。
- Manager採用の局所補強: 本人履歴DTOのserver actorId bind/initial・追加page照合、root unknownのpathname依存非表示を除去。18:42:58 pure7/Node12成功、型/lint/format成功。actor別履歴正本の隔離assert追加。実UIは次bundleで検証予定。
- 18:43:11.090 PID53177へTERM、18:43:11.096正常drain/exit0/systemErrors0。ports/DBhandles0確認後のみ再build開始。
- 18:43:19.310 `before-delete-ui` に新対象含むDB+13objects3182B保全。旧12objects3107Bとの差分は新原本75B。source857 `14c5de60be7cfa5805833453cf1f26fe9ddedad79f96d1868162c53c8d356477`。この保全時bundleは補強前、sourceと同一build済みとは扱わない。新対象もまだ物理削除していない。

### 18:44〜19:00 追加根拠

- 18:44:07.960 新PID58923/session46213、18:44:08.197 listening。bundle `95b830491d9181cf9ee219076f928bfb83b4d89bb7dcbdc6020c1bb7683b7bbd`（actorDTO/root unknown補強後）。以降テストsourceだけ追加中、live dist上書きなし。
- 18:45:02 新専用WSの通常UI削除受理。個人 `/notes?query=&tags=[]` へ遷移、0/2受付中と物理完了を区別。18:45:04 DBでsucceeded、本人UI明示更新で2/2完了。jobs再訪reloadでも本人履歴。新2note/新tag/原本key `01a0b90b-5e0b-74eb-83a2-9aa5c7d49ed5` 75Bだけ削除、旧103notesと旧12objects全hash保持。アプリundo不可。`before-delete-ui` のDB/objectsコピーは保持し、復元操作は実施していない。
- 最小3IDをsessionStorageへ人工復元し、deleted設定404でもroot不明照会表示→同request IDで既受理receipt取得、そのpending解除。存在しない人工request IDのlookup nullは不明/同ID保持。人工storage状態は実応答断試験と別。試験後人工pendingだけ消去。
- 18:50〜18:52 実receipt GET応答をブラウザ内でhold（認証内容非読取）、確認中disabled→SPA signout→outsider signin→old success release。別actorのrouteは/notesを保持、receiptと旧WS名0、本人履歴は空。hook復旧。これはA→B、ABAは別途。
- 18:54:33.118 新zero-note専用WS `01a0b916-c629-77de-b0a7-54810ff55fef` を `before-delete-ack` へ保全（既存12objects3107B、他新資源0）。18:55:08 実POST受理後のresponseだけ人工TypeErrorへ変換し、同時に削除pendingのsessionStorage.setItemだけ故障注入。POST1、不明のまま設定画面に留まり、新要求なし、保存不能/再読込回避警告、390overflowなし。同request GETだけで0/0完了を確認後個人遷移、POST総数1、root unknown0。fetch/storage hooksを復旧。アプリundo不可、保全あり。
- 18:47:38 13Node、18:50:29 15Node、18:54:01 18Node、18:56:41 型+21Node、18:57:55 23Node成功。追加対はimport/reference/icon active writer中の課金/cleanup拒否・late write/採用拒否/終了後実remove、batch成功移出子保持と未終端2子取消/旧token拒否、招待秘密/continuation/未送信停止、history/edit/restore/admissionとsnapshot検索/calendar/tag/selectionの即時fence、削除先行move両方向、Tx fault rollback、boot wakeなしexpired leaseとrequester session失効後の再開、本人50keyset51件。
- 途中失敗はtest fixtureのicon settingsVersion仮定、move引数shape、拒否code（NOTE/ORIGINAL/SCOPEの区別）、promise配列先行起動を修正したもの。製品不具合とは扱わない。501全回収試験の初回60wakeでは60/501で処理中のまま（既存note purgeは1claim/wake）、502有限wakeへ拡大して最終検証中。admission完了を回収完了にしていない実対でもある。

### 19:00〜19:20 最終根拠

- 2026-09-19T19:00:45+09:00 専用24Node成功。501件は50ID admissionを越えて501/501物理回収完了、既存note purgeの1claim/wakeを変えず502有限wakeで確認。実待機ではなくfixture時計を2秒ずつ進めた試験。conversion late success/failure/採用拒否、元原本download拒否、writer終了まで課金/物理保持、終了後removeを含む。
- 19:01:20.108、第三自己WS `01a0b91c-457c-7744-9cca-da194c2e74fa` と新手書きnote `01a0b91c-c246-75e8-8b6d-d139ff64b1c4` を `before-delete-unsaved` に保全。原本/新objectsなし。二つ目の自己browserで編集を開き未保存HTMLを保持し、別画面から19:02:29.885に通常削除受理、19:02:33.158回収完了。旧editorで次analysisがnot-found→保存停止、保存前/未保存文を保持。実ダウンロード `unsaved-self-backup.json` 187Bを取得しJSON妥当・双方の文が含まれることをboolean確認。19:03に二つ目browserをclose。アプリundo不可、保全copyあり、復元は未実行。
- 19:03〜19:04 実GET holdでB→A→B。帰還した新BのGETをbusyにした後、旧Bのfailureを人工releaseしても新busyはtrueのまま・旧error0。新GET responseだけで解除。旧catch/finallyのABA拒否を実証した。fetch hook復旧。
- storage故障時のroot memoryがactor切替で失われる不足を局所修正。actor別Mapは最小3IDだけ、current actor照合を必須とし、該当requestだけ消去。純粋回帰を1件追加（計8）。Manager採用済、port/backend/schema変更なし。
- 19:06:48.392 PID58923 TERM、.399正常exit0/systemErrors0、ports/DB handles0を確認して再build。19:06型/lint:fix/format成功、pure8成功。19:07:05 unit742/18.63秒、19:07:07 Node356/41.38秒、build成功、db generate差0。これは最後の3Node追加前のrun。
- 19:07:22.698 PID72921/session53567起動、19:07:23.381 listening。19:07:54.236 第四自己zeroWS `01a0b922-ffdb-70af-940c-423e12b16bae` を `before-delete-memory` に保全。source857 `997277742f16affc7e82c35421d53059ed08fc84ab41d9cad4e687c05cfd0bb9`、bundleは最終同値。
- 19:08:31.645 第四WS実削除POST受理、.651回収0/0成功。受理responseだけ人工TypeError、storage.setItemの削除prefixだけ人工QuotaExceeded。A→B→Aを通常SPA signout/signinで実行し、別actorでunknown0/警告なし、帰還actorで同ID unknown1/保存不能警告。削除POST1と認証POST4を分離し、合計5以外のPOSTなし。request `72db0d2c-44d4-4ee8-ad93-9672a37944d0` のGETだけで完了receiptへ復旧しpending0。新ID/自動POSTなし。19:10 hooksを全復旧。新物理資源0、アプリundo不可、保全あり。
- 19:15〜19:17 残小対3つを追加: 現name変更後の旧確認拒否、実ready assetのcurrent/draft/history全URLが削除受理直後拒否し3B現物/chargeは保持、受理前move-inが回収集合に入り依頼者account消失後も回収成功。最後のfixtureではintent型にDTOだけのcompletedNotesを期待した誤りを修正。製品変更なし。
- 19:16:47開始 unit72files742成功/11.10秒。19:16:59開始 Node26files359成功/34.98秒（専用P3f27、従来332）。`pnpm typecheck && pnpm lint:fix && pnpm format`成功、既存36warning/34info・unsafe提案45は無変更。`pnpm test:integration:node`内db generate差0。`git diff --check`成功。
- 19:17:06.366 PID72921 TERM/drain、.378 exit0/systemErrors0。ports3000/3001・fresh DB handles0を確認後 `pnpm build` 成功。最終server.node.js SHAは19:07実UIと同一。製品変更がなくtestのみ追加なので当該bundle実UIを適用し、破壊UIを反復しない。
- 19:18自己browser `p3c-fresh-batch-ws-delete-owner` close成功。別自己sessionは19:03close済み。全体browser cleanupはしていない。
- 19:19:09.904 final DB/objects保全。19:19:15.888旧56表447列比較、19:19:16.556 capacity実repository query比較、19:20:01.033 70trigger本文比較を含む再確認が成功。比較JSONを新規名で保存。既存JSON再出力のEEXISTは保全上書き防止であり製品不具合ではない。

## 完了条件ごとの結果

各行はImplementer自身の合格判定であり、独立Verifierの判定を兼ねない。Node根拠は `packages/core/src/adapters/libsql/__tests__/workspaceDeletion.integration.test.ts` 27対、UI根拠は上記実操作時刻。

| ID | 判定 | 変更と直接根拠 |
| --- | --- | --- |
| P3f-A | 合格候補 | owner/current stored name exactを受付同Txで確認。非member/editor、末尾space、rename後旧名拒否。same actor/request/content再送は同receipt、異内容拒否、別actor null。UI不可逆説明/移動案内/取消/不一致。実ACK喪失でも同IDのGETだけ、null不明保持 |
| P3f-B | 合格候補 | active-only Workspace・requireScope/requireNoteとsnapshot current認可。member read/create、history/edit/trash restore、検索/calendar/tag/selection、current/draft/history asset、original、upload/import admission、move両方向が受理後拒否。旧物理資源は即削除せずwriter fenceと回収へ。削除WSを空/個人として表示しない |
| P3f-C | 合格候補 | 独立durable intent、50ID cursor admission/lease60s、typed内部purge。同Tx finishで先行purge完了を取り込む。0/active/trash/501全回収、旧token拒否/二重claim抑止/expiry再claim、wake未配送boot、途中lease後再boot、rollback注入を実行。admission完了≠物理完了 |
| P3f-D | 合格候補 | current note owner優先、未bindだけadmission。移出済note/draftはdestinationでwriter継続可、移入済は削除対象、削除先行なら移動双方拒否。media/import/reference/icon/conversionのlate write/commit/final adoption拒否。active writer中のGC/finally cleanup拒否→writer終了後remove・課金解放。remove故障→delay/backoff30秒→再開。共有companionは他scope保持/最後のholderだけremove |
| P3f-E | 合格候補 | 全actor通常job・対象未終端batchを受付同Tx取消。先に成功し移出済の子と履歴を保持、残running/queued2子を取消、旧attempt拒否。icon pointerと招待secret/envelope/snapshot/continuation失効、未送信deliver false。tag/member等有限cleanup、旧job履歴寿命不変更 |
| P3f-F | 合格候補 | sameWS deleted縮小/slug予約、active必須CHECK、receipt actor限定90日、intent独立寿命。91日後receipt失効と回収継続・expired同request拒否、本人51件50keyset、依頼者session/account消失後回収。既存creator quotaからdeletedを除外しnote容量は実removeまで保持 |
| P3f-G | 合格候補 | settings最下段説明付き確認→受理時だけ個人遷移/旧scope-query-tags解除→本人receipt。0/2受付中と2/2完了を区別。jobs再訪/reload、deleted設定404でもunknown照会、390横overflowなし/初期閉じるfocus/Escape戻り。実GET held A→B旧successとB→A→B旧failure/finally拒否。storage故障A→B→A同ID保持/削除POST1、未保存JSON187B実DL |
| P3f-H | 合格候補 | inward型/専用port/UoW/clock、新0023+24だけ。全旧56表447列migrationclone双方向差0/70trigger本文/FK0、final旧行保存/objects全SHA/12scope charge保持。規定checks742unit359Node/build、実UI同bundle、product-onlycommit/source固定、新対象の破壊量/回復可否を分離、正常停止・返却 |

## 先行枝への実影響と回帰

ManagerがreopenしたIDだけを対象に記録する。状態更新はManagerが行う。

- P3a-A/B/F、P3b-1-D/E: active-only型/DB縮小/通常repositoryと設定UI、current policyの即時失効。workspace/invitation/move/削除27対と移行clone、型、設定実UIで確認。
- P2b-B/C、P3a-C/D、P3d-2-E: import/reference/mediaの現在所有・writer/採用fence。関連既存Nodeと新全writer対/実3B削除/共有companion対で確認。
- P2d-2-A/B/C/D/E: typed purge原因、finish同Tx、worker接続、有限資源、旧token/actual remove。既存purge系Node、501/boot/lease/故障/先行finishの新対で確認。
- P2a-D、P3a-E: writer中の課金・現在scope所有。新対の終了前後とfinal全12scope比較で確認。
- P3e-B/G、P2a-E: root actor境界/通知領域とjobs一覧への統合。既存batch系Node/pure、samebundle receiptとjobs共存、held応答/ABA/unknown実UIで確認。P3e-C preview/acceptやF token方式自体は変更していない。

## 最終固定・保全

- commit: `05104add96bdec027e949ed2fd1efb444aa44f0b`（base `2ee4826b6422a9f5ae38aa0e2c637e0c3b9276a8`）。管理文書は未追跡のまま、製品差分0。
- source: 857 files / `dea32757964d1225f7a4e348037be48c609e5e46b28e47305d77f6a8d7cf6d1a`。git tracked+untrackedの製品fileを相対path順に `path\0bytes\0` SHA256、`.goal-implement/` を除外。
- lock: `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`。
- built server artifact: `738a9275a141e9d0a27fe6622aa068fe25933627bfc5f59f25b7e8e2615039f9`。19:07〜19:10実UIと19:17最終buildのSHA一致。
- `p3f-delete-20260919-mhDZym/final/manifest.json`、`final/app.db`、`final/objects/`。12objects3107Bはstartと全key/bytes/SHA一致。root0700/backup0600。過去独立保全は不変。
- `final-comparison-with-triggers.json`: 全旧56表447列のold-row EXCEPTで既存行欠損0。ただしFTS内部 `note_search_data` 11行/`note_search_idx`9行は新規作成削除に伴う物理構造更新。論理 `note_search`/既存note/projection/revision/tag等は欠損0。70trigger本文一致、FK0、integrity ok。移行時は別cloneで全旧表双方向差0まで確認済み。
- 最終103notes全active、31tags、9originals、2assets、activeWS9/member15、19batch parents/48targets/51attempts。batch attemptsはsucceeded43/failed6/cancelled2、queued/running0（19:23:21追加照合）。追加deletedWS4・回収intent4は全succeeded、note purge未終端0、active writer0。
- `capacity-comparison.json`: 旧3personal+9WSの12scope全同値。personal 2320/0/0B、WS 516/0/0/0/75/0/113/83/0B（JSONはID対応）。新deleted4scope0B、容量provenance不整合0。
- 破壊した自己新対象は4WS metadata、3notes、新tag1、原本75Bだけ。第1WSはbefore-delete-ui、第2はbefore-delete-ack、第3はbefore-delete-unsaved、第4はbefore-delete-memoryに削除前DB/objects保全。通常アプリundo不可。copyからの復元は未実行であり、復元成功とは主張しない。個別187B未保存JSONは別保全。

## 借用・未検証の区分と返却

- P3e独立検証は開始時保護基準として借用した。今回byteの成功は今回checks/unit/Node/buildと自分の実UIに限る。UI補助は製品作成だけで、補助による検証成功は借用していない。
- 18:44 bundleでの受付/完了/390/初期focus/未保存DL/held応答/ABAは当該componentとoperation guardが最終製品で不変の範囲に適用。後に変更したroot actor別memoryは19:07最終同bundleで実A→B→Aと削除POST1/同IDGETを改めて検証した。
- 人工faultはブラウザの受理後response TypeError、該当storage prefix失敗、held GET、隔離DB trigger、remove失敗、clock/lease準備。実ネットワーク遮断や現実のディスク故障そのものは実行していない。機能の故障時契約検証として記録する。
- LLM/OAuth/外部mail/Google Drive/公開/exportはこのフェーズの実接続対象外・後続契約。既送信メールの撤回、外部成果物削除は主張しない。Cloudflare/AWS/GCP実環境の検証・課金・デプロイなし。新上限や独自TTLなし。
- freshはledger25で0023+24適用済み。再開時はports3000/3001とDB handlesを再照合し、既知Node22.22.3のsafe server wrapperを使用する。0022再適用・writer lock手削除・旧環境/秘密探索は禁止。keyは既知pathのままで値/ハッシュを扱わない。
- 自己2browserはclose済み、fetch/storage hook復旧、保留responseなし。PID72921/session53567は正常exit0、19:20:01時点でpid不在、19:23:21にports3000/3001空/DB handles0と製品HEAD差分0を再照合。補助も停止済み。この最終報告保存をもって製品・DB・runtime・browser・文書操作を停止しManagerへ返却する。
