# P2d2-V1 修正候補

2026-09-10T13:49:06+09:00。対象は P2d-2-D / P2d-1-D と、限定影響 P2d-2-E / P1-E / P2a-E の5条件。自己検証では元V1の再訪・手動回復不足を解消した。独立再確認は未実施。Managerの追加判断事項はない。P2d-3は未着手。

- commit: `05b60782756270fea788b442a86a0b9552f2d608`
- 対象619 path SHA256: `e4c3c52fd3e956e1a69b2b53679390adebb01acb2bfdae95f231493db8baccb8`
- lock: `7789972514666bf5fbc61f775887a43b0c71678cd854f9758459cf9aa385b3bf`（開始時と同じ）
- 最終server bundle: `34f9a0db77bfa7b413f141db9bfc6629050517eee31a8c49d5c45c7edd45e32d`
- 新一時資材: `/tmp/hollow-purge-revision.0Ptyw9`、21資材 SHA256 `91a9e622289867084f26fe023582b414521793b2c63a56b7244c4af0564662f1`。個別hashは [manifest](P2d-2-revision-temp-manifest.json)。DB/WAL/SHMは資材hashから除外する。

## 原因と修正範囲

旧実装は未完了と直近90日完了を混ぜ、作成日降順100件だけを返した。独立報告 [P2d-2](../reviews/P2d-2.md) の本人failed1件＋新しいsucceeded100件では、古い未完了が両routeから隠れ、IDを再取得できず手動retryできなかった。物理sweep・容量保持の停止とは別のread/UI欠陥である。元の独立失敗testと旧自己30/独立21資材は変更していない。

採用済みread portを次の範囲で接続した。

- 未完了と90日完了を独立scopeとし、`createdAt,id`降順keysetで50件ずつ置換。次頁の判定に51件だけ読む。未完了は経過90日でも隠さず、完了の90日起点は既存createdAtを維持する。
- 同じ本人認可・UoWでsummary（未完了/queued-running/failed/代表1件）を取得する。ページ配列長を全体件数や完了の根拠にしない。DB集約であり全行をJavaScriptへ読み込まない。
- 表示済みID最大50件と、受付結果不明のnoteId＋trashOperation最大10件を有限照会する。別人・別世代・90日外完了は返さない。cursor/date/UUID/scope/上限はtransportで検証し、任意accountやlimitを許可しない。
- page/scope切替直前に要求generationを失効し、遅いsuccess/catch/finallyを無効化。scopeとcursorの一致も照合する。取得失敗時は前頁である旨と未確認理由を表示する。
- summary未完了または未確認受付がある間は5秒poll。全て確定後は履歴pollを止める。tickerのactive件数/代表もsummaryを使う。既存import/referenceの状態契約は変えていない。
- 受付IDを失ってもnote＋正確なtrash世代から照会する。page不在を成功や未受付にしない。未受付の回復には同世代の現在trash読取、受付済みには実purge結果を使う。10件未確認中は追加受付を待つ案内を出す。

物理worker、claim、storage、quota、GC、FD対策、依存、migration、editor、20版、認証方式は変更していない。`purge.ts`はread DTO/投影だけ、repositoryはread methodだけの変更。既存retry/purge/sweepのwrite条件を変更していない。

## ID別自己根拠

| 対象 | 結果と根拠 |
| --- | --- |
| P2d-2-D | 元V1形の実failed1＋新success100で両routeからfailedへ到達、trusted Spaceで手動回収。完了頁選択中のauto、応答喪失、summary/poll、keysetと有限本人照会を確認 |
| P2d-1-D | `/trash`の既存typed loader bridge/親optimistic・invalidateを維持。現在世代の再取得だけで操作を解放し、受付済みを復元可能としない。390px・keyboard・再訪を確認 |
| P2d-2-E | 最終規定checks・unit489・関連実DB15・build/start・旧全列/428objects保全。書込境界は旧Node159の不変部分を適用 |
| P1-E（限定） | 最終同sourceのbuild/startと両route実UI。server-fn transportのschemaは既存分離moduleに置き、起動停止/FD/他routeの方式は不変 |
| P2a-E（限定） | 共通tickerのsummary件数100を50件pageと分離し、0への更新を確認。本人importの新3件は成功、purge後も元batch結果を保持。conversion/codec/原本処理は不変 |

## 実DB・純粋試験

Node22.22.3、pnpm11.1.2。最終関連Nodeは `2026-09-10T13:46:10+09:00` 開始、15件/1suite成功（6.46秒）。既存物理purge12対にread3対を追加した。

1. 本人実save→trash→purge→claim/deferでfailed、後続success100。未完了1を取得し、completedは50件とcursor。別人は空、明示retry＋実sweepが成功しwatch/受付照会へ終端を返す。
2. 同時刻の未完了101・完了101を各50/50/1で全件取得し、重複/欠落なし、ID tie-breakとsummary101を確認。
3. 91日前未完了を保持、91日前完了を除外、90日境界完了を含む。watch重複、別人、別trash世代、未知IDを分離。

純粋UI/transport21件は `2026-09-10T13:37:14+09:00` 成功。scope/generation、観測結果dedup、summary/未確認poll、同note別世代を解放しない対、50/51 watch・10/11受付・不正cursor/余剰入力を含む。

初稿Node追加3件はfixtureがDTOに存在しないownerを参照して失敗した。domain読取から本人ownerを取得するfixtureへ修正し、13:34:08に15件成功。旧12件は初稿でも成功。製品の誤結果を期待値だけで成功へ変えていない。

旧全Node159は [前段報告](P2d-2.md) の最終実行および独立レビューの合格根拠を、変更のないstorage/claim/codec/FD/snapshot等に適用する。今回はread実装を含む15件を直接再実行し、全159再実行とは記載しない。

## 実本体UI

専用Chrome `hollow-purge-main`、本人テストaccountのみ。pointer/keyboard/File inputはtrusted操作、通信故障/遅延はそのtabだけのfetch wrapper、read-result metadataは新自己fixtureと区別した。各wrapperはfinally復帰。

### 元V1・手動回復

`manual.cjs`、13:38:05.408 `/trash`・13:38:05.497 `/notes/jobs`。今回File inputから作った `revision-manual.txt` の72B原本だけを一時退避し、同keyにdirectoryを置いて実unlink失敗を起こした。failed1件の後に、同自己accountへ今回新規のread-result fixtureとしてsucceeded100行をINSERTした。旧purge/job行は変更していない。

両routeは「未完了1件」「回収に失敗・再試行待ち」と当該1件のretryを表示。finallyで元72Bを同keyへ戻し、trusted focus→Spaceで手動retry。13:38:06.183に実intent成功、原本不存在、完了案内を確認。completedは50/50/7件（旧6＋今回実1＋synthetic100）。synthetic100は実100回収や物理削除成功の根拠ではない。

この対は13:36の第一修正bundleで実行した。その後の製品差はfresh-trash同世代照合とその試験であり、PurgeHistory/read/retry実装は同一。最終bundleでは以下の両route/同read機構・受付照会・50件頁/旧応答を再確認した。

### 最終bundleの正常・故障対

- 13:43:00.116〜13:43:35.514、`auto.cjs`: 新自己 `revision-auto.txt` 82Bの同じ故障→finally復帰。completed50件表示中もsummary未完了1でpollし、既存30秒retryで実回収。選択scopeを維持しsummary0、同原本不存在と実DB成功を別に照合した。
- 13:43:59.568、`response.cjs`: 新自己 `revision-response.txt` のPOSTを呼ぶ前に一回失敗。元note＋trash世代の現在trashを再取得し、intent0をDB確認、項目と再操作を回復。page不在だけを未受付根拠にはしていない。
- 13:43:59.885、同POSTは実処理responseを読み終えてから一回喪失。clientはpurgeIDを受け取れないがnote＋operation照会が実結果を返し、未確認停止が解消。復元項目なし、DB成功、69B原本不存在。13:44:00.108にjobs再訪の完了履歴でも確認した。
- 13:44:32.845〜13:44:34.450、`race.cjs`: 完了readの旧success保留→未完了、旧failure保留→未完了、完了A→未完了→完了B→A解放を実UIで確認。最新scope/page、最新errorを旧結果が変更しない。保留は本人tabだけで、serverの取得処理自体の遅延ではない。
- 13:45:17.944、`ticker.cjs`: 上記新規synthetic100行だけを一時future queued（翌日nextAttempt、物理claim対象外）としてsummary/ticker100と未完了50/50頁を確認。finallyで100行の元state/nextAttemptへ戻し、13:45:23.002にsummary0/ticker消去。既存行の変更、実100件の回収試験とは区別する。
- 13:46:17.327、`idle.cjs`: summary0のcompleted頁を取得後6,200ms観測し、該当scopeのGETは初回1回だけ。未完了なしでPurgeHistory pollが停止した。既存ImportTickerの定期更新と混同しない。

画像 `v1-failed-mobile.png` / `history-final-mobile.png` / `history-final-desktop.png` を自身で確認した。390pxの失敗理由/手動retry/現在件数と、1280pxの実完了1/1が読み取れ、scrollWidthは各390/1280。最終browser errorsは空。OS IME/native clipboard/他browser/全プラットフォームは今回対象外・未検証。

## 規定checksと配布内容

```sh
pnpm typecheck && pnpm lint:fix && pnpm format
pnpm exec vitest run --exclude '.goal-implement/**' --maxWorkers=1
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/purge.integration.test.ts --maxWorkers=1
pnpm build
```

型/lint/formatは13:34の成功後、最終同世代照合変更後の13:38〜13:39にも成功。Biome22warning/29info、error0、unsafe fixなし。管理suiteだけを除外し製品unitを除外していない。最終unitは13:42:58開始、489件/48suite成功（28.18秒）。Node15は13:46:10開始成功。同時buildによる旧5秒制限への負荷を避け直列実行した。

旧production80663を通常TERMし不存在を確認した。元session30991はUnknownでexitcodeを取得できず、exit0と推測していない。第一修正production82293/session19940は通常TERM/exit0。最終build46040はexit0後、同sourceをproduction14453/PID83059で起動し、上記最終UIを実施した。依存/lock/migrationは変えていない。

## 保全・自己削除対象

開始online backupは `/tmp/hollow-purge-revision.0Ptyw9/baseline.db`。schema変更なし、migration追加なし。旧backup/元自己・独立tempを保持した。

13:34:56.471と最終13:46:12.918に、受領旧15tableの全列EXCEPT差0、旧428objectsのbytes/SHA256が428/428一致。`notes/assets/note_revisions/note_asset_references/note_revision_heads/originals/reference_entries/reference_settings/companion_sources/media_drafts/conversion_jobs/reference_jobs/import_batches/upload_reservations/reference_objects` が対象。旧note_purgesとjob_result_snapshotsも13:47の全列差0を確認した。旧survivor `01a08987-1e1c-7618-b282-d35b00e19869` の76B原本も428個に含む。

最終502notes/64assets/825revisions、nonactive0/incomplete0、snapshot12、FK0/integrity ok。13:49にactivewriter0、display pending0、conversion/reference queued-running0。初回集計SQLのobject_writes.state誤記は失敗し、正しいactive列で再確認した。

実削除は今回作った3noteと原本のみ、72＋82＋69＝223B。3件の元IDは `01a0899b-02e6-71aa-a244-6553d871481f` / `01a0899b-03a8-721d-8e76-330a7b5719aa` / `01a0899b-0478-71ca-9060-37d88cdf4351`。3objectの実不存在・元容量行消去を確認し、復元不可。428旧objectや旧502noteを削除していない。新synthetic100は自己read-result fixtureとして残るが、本文/CSS/binary/容量行を持たない。

## 固定と環境返却

14製品pathのみを [明示manifest](P2d-2-revision-product-paths.txt) とcached集合照合し通常commitした。11変更/3追加、管理資料・既存要件・ignored環境値なし、push/PRなし。commit前後でsource/lock/bundle/temp hash一致、hookによる製品差なし。製品差分0、残未追跡は管理 `.goal-implement/` のみ。

sourcehashはtracked＋未追跡のpath順 `path + NUL + file bytes + NUL`、管理/ignoredを除外する。既存AGENTS.md symlinkの参照先bytesも含む従来方式。これに合わせ開始commitの内容をread-only再構成し616/d2a368…一致を確認した。symlinkを除いた初稿618/ce8c33…は計測方式差なので最終対象に用いない。

最終production **session14453 / PID83059**、Node22.22.3、`apps/web` cwd、localhost3000は13:49 HTTP200。同DB `/tmp/hollow-p2b.dAfzgS/app.db` / storage `/tmp/hollow-p2.sj33Bk/originals` / mailbox `/tmp/hollow-p1-S1piZT/mailbox`。再起動は既知PIDだけTERMしdrain後、次の既存設定を使う。

```sh
DATABASE_URL=file:/tmp/hollow-p2b.dAfzgS/app.db APP_URL=http://localhost:3000 HOLLOW_MAIL_MODE=local HOLLOW_MAILBOX_DIR=/tmp/hollow-p1-S1piZT/mailbox HOLLOW_STORAGE_DIR=/tmp/hollow-p2.sj33Bk/originals HOSTNAME=127.0.0.1 PORT=3000 pnpm start
```

自分のbrowserは13:48前にclose成功、全hookはfinally復帰済み。全単発helper/test/buildは終了、独立listenerなし。補助p1_uiは指定UI3file/8純粋試験の完了後停止し、最終統合は主担当が行った。新productionだけ維持し、製品・browser・DB・helper操作を停止して独立再確認へ返す。
