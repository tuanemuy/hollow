# P2d2-V1 独立再確認

2026-09-10 13:53:55〜14:05 JST（Asia/Tokyo）。対象5条件は合格。元V1の本人未完了が完了100件に隠れる欠陥は、固定最終bundleの両routeと手動回復まで独立に解消を確認した。新たな必須不具合はない。P2d-3や全仕様の完成判定ではない。

goal-implement/manager-loopに従う独立Verifierの報告。元要件ED-10/JB-01〜03、採用design/plan、[修正計画](../phases/P2d-2-revision-plan.md)、[正式候補](../phases/P2d-2-revision.md)、[元独立報告](P2d-2.md)を照合した。製品修正・追加要件・Issue起票・goal変更なし。Markdownの構造はmarkdown-styleに従った。

## 固定対象

開始13:54:53.401、終了14:01:56.460 JSTに独立計測し、すべて一致。

- commit: `05b60782756270fea788b442a86a0b9552f2d608`
- 619 paths SHA256: `e4c3c52fd3e956e1a69b2b53679390adebb01acb2bfdae95f231493db8baccb8`
- lock: `7789972514666bf5fbc61f775887a43b0c71678cd854f9758459cf9aa385b3bf`
- server bundle: `34f9a0db77bfa7b413f141db9bfc6629050517eee31a8c49d5c45c7edd45e32d`
- runtime: Node22.22.3。製品差分なし、再build/format/migration/依存操作なし。

計測はsorted/dedup `git ls-files -co --exclude-standard -z`、`.goal-implement/`除外、`path + NUL + bytes + NUL`。従来の`statSync().isFile()`でAGENTS.mdのsymlink参照先bytesを含む。自身の従来方式との不一致はない。symlinkを除く618件の初稿値は採用しない。

## 項目別判定

| 条件 | 判定 | 今回の独立根拠・適用範囲 |
| --- | --- | --- |
| P2d-2-D | 合格 | 元failed1＋新success100の両route再訪、本人手動retry・実回収。分離scope/keyset/90日/有限本人照会、summary起点poll、応答喪失、旧応答拒否を下記で確認 |
| P2d-1-D | 合格 | `/trash` hard openと再訪、現在trash世代を再取得した未受付回復、受付済み結果確認、親pending/invalidate、390px・trusted Space。既存restore/期限/認可の不変根拠は元報告を維持 |
| P2d-2-E | 合格 | 変更read/UIの型付き境界・有限I/O、独立25件、最終bundle実UI、旧17table/428objects保全。schema/物理write不変のため前段clone移行・claim/容量/FD等の合格を保持 |
| P1-E | 合格（限定影響） | 固定source/bundle一致、最終productionで両routeが操作可能。新transport schemaは既存分離module、旧scopeを遅い応答が覆わない。最終checks/buildは借用し、独立再buildとはしない |
| P2a-E | 合格（限定影響） | 新本人3ファイル取込成功、共通tickerはpage50件とは別にsummary100を表示、0で消去。旧import/reference/子履歴契約と取消/retry writeは不変。媒体解析全方式は再実行していない |

P2d-2-A/B/C/FDと他の共有条件は今回再openの原因がない。物理worker/claim/quota/FD/deps/migration/editor/20版の旧合格を保持する。read修正から全方式の再証明へ範囲を広げていない。

## 独立コード確認

14製品pathの差分を照合した。`purge.ts`はread DTO/投影、repositoryはread method、portは有限read契約、frontendはhistory/ticker/state/transportの変更。purge/retry/sweepのwrite条件、schema、launcher、依存には差分がない。

- repositoryのscopeは本人を必須とし、未完了は90日で切らず、完了だけcreatedAtの90日条件を適用する。`createdAt,id`両方の降順keysetと51件読取により50件pageを置換する。summaryはDB集約で、全件配列をJavaScriptへロードしない。
- 同じ認証済みUoW内でpage/summary/watch/receiptを投影する。watchは最大50、受付照会はnoteId＋正確なtrashOperation最大10。別人/別世代/期限外完了を返さない。transportはstrict schemaでscope/cursor日時/UUID/上限を検証し、任意account/limitを拒否する。
- scope/cursor切替時にgenerationを失効し、effectのsuccess/catch/finallyはgenerationとidentityを確認する。page配列不在だけでは受付成功や未受付にしない。実purge結果か、現在の同trash世代の再取得を用いて解除する。
- summary未完了または未確認receiptがある間だけ履歴pollを継続。ticker件数はsummary、現在表示分は最大50である。50watch/10receiptは処理総数の上限ではない。

## 独立自動実行

Node22.22.3。製品生成やschema変更を伴わないコマンドを使用した。今回25件成功、失敗0。旧失敗assertは変更せず保持した。

```sh
pnpm test:unit apps/web/app/components/hollow/PurgeHistoryState.test.ts apps/web/app/components/hollow/PurgeState.test.tsx apps/web/app/presentation/purgeInput.test.ts --maxWorkers 1
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/purge.integration.test.ts --maxWorkers 1 -t 'pages|90|older|100|cursor|unfinished'
pnpm exec vitest run --config .goal-implement/reviews/purge-read-vitest.config.ts --maxWorkers 1
```

- 13:55:07: unit21件/3files成功（553ms）。要求世代/identity、観測dedup、summary/未確認poll、異なるtrash世代、50/51 watch、10/11 receipt、不正cursor/余剰入力を含む。
- 13:55:08: 製品read DB3件成功（2.57s）。物理12件は選択外としてskip。本人failed1＋success100の再試行、同時刻の未完了101と完了101を各50/50/1・重複欠落0、90日境界/91日前未完了/完了除外、別人/未知ID/別世代を確認した。
- 13:57:21: 独立派生1件成功（2.21s）。旧V1と同じ実note→trash→purge→失敗＋後続success100を使い、新read APIへadapterだけを変更。未完了1・summary失敗1、完了50、他人のwatch/receipt空、明示retry→sweep→summary0とexact receipt終端を確認した。元の`later-*` IDは隔離DBのread fixtureであり、UUID transportの通過を主張するものではない。

新独立testは[回帰test](purge-read-independent.integration.test.ts)と[実行config](purge-read-vitest.config.ts)。元[失敗test](purge-independent.integration.test.ts)を上書きしていない。

## 最終bundleでの本体実操作

専用Chrome `hollow-c2-verify`、自身のテストaccount・新規3noteだけを使用した。pointer/Space/file inputは実ブラウザ操作。通信故障と遅延は本人tabだけのfetch wrapper、synthetic結果行はread fixtureとして分離する。すべてfinallyで復帰した。

### 元V1と手動回復

13:56:47に新しい`read-manual.txt`/`read-auto.txt`/`read-response.txt`を取込み、3件成功を確認した。初回は派生helperのfixture pathを誤り、空選択の拒否と待機timeoutになった。自分のpath指定を修正し、製品は変更していない。

`manual.cjs`で45Bの新自己原本だけを退避して同keyへ空directoryを置き、実unlink失敗を発生させた。その後、同本人へ新しいsucceeded read-result100行を追加した。これらは100件の実回収を表す証拠ではない。

- 13:57:23.565 `/trash`、13:57:23.880 `/notes/jobs`: いずれも未完了1件と`read-manual.txt`の失敗理由・retryが表示された。
- finallyで45Bを元keyへ戻し、retryにfocusしてtrusted Space。
- 13:57:24.598: 完了案内、実DB succeeded、原本不存在を確認。完了scopeは50/50/6件（旧5＋今回実1＋synthetic100）。

期待した本人再訪→古い未完了取得→手動回復が、修正前の同read/UIだけでなく固定最終bundleで成立した。物理回収が元から停止していたという主張ではない。

### 正常・異常対

| 時刻 JST | 実操作・観測 |
| --- | --- |
| 13:59:53.709〜14:00:29.448 | `auto.cjs`: 新43B原本の実失敗→finally復帰。完了50件pageを選択していてもsummary未完了1でpollし、既存自動retryで実回収。選択scope保持、summary0、DB成功/原本不存在 |
| 14:00:41.158 | `response.cjs`: POST呼出前に本人tabで一度失敗。現在の同世代trashを再取得し、DB intent0、項目と再操作を回復。page不在だけを未受付の証拠にしない |
| 14:00:41.421〜.647 | POST実応答bodyを読んでから喪失。clientはpurge IDを受け取らないがnote＋operation照会で確認し、未確認停止を解除。DB succeeded/47B原本不存在/復元項目0、jobs再訪でも完了表示 |
| 14:00:52.746〜54.201 | `race.cjs`: 完了readの旧success→未完了、旧failure→未完了、完了A→未完了→完了B→A解放。現在scope/pageを保持し、旧errorが現表示へ流入しない |
| 14:01:18.259〜23.211 | `ticker.cjs`: 今回新規synthetic100だけを未来nextAttemptのqueuedへ一時変更。物理claim対象外でsummary/ticker100、未完了page50/50を確認。finallyで元state/nextAttemptへ戻し、summary0/ticker消去 |
| 14:01:37.655 | `idle.cjs`: 未完了0の完了pageで6,200ms観測。該当scope GETは初回1回のみ、履歴poll停止。ImportTicker固有の定期更新とは別証拠 |

表示中ID50/要求世代10の境界と不正入力はunit/実DBで確認した。10件の実受付応答を同時喪失させる本体大量試験は行っていない。

## 画像・借用・未検証

自分の`v1-failed-mobile.png`、`history-final-mobile.png`、`history-final-desktop.png`を画像ツールで実見した。390pxで失敗理由、容量保持の案内、retry、現在件数が読める。完了画面の実1/1、未完了0、1280pxでの二つの実完了とsynthetic0/0の区別を確認。最終scrollWidth1280、browser errorsは空。

Implementerの最終489unit/48suite、関連Node15、checks/build/startは固定候補の借用根拠。自分は21unit＋製品read3＋独立1を再実行した。全Node159は前段の不変backendについて借用し、今回の全再実行とはしない。今回の終了/FD/全storage/codec/SSRF/20版/認証方式の新しい実証は追加していない。remote libSQL実接続、OS IME/native clipboard/OSdrop/全browser保証も未検証のまま。このread/UI修正の受入条件へ混入しない。

## 保全・資材・返却

開始online backup: `/tmp/hollow-purge-read-verify.IN63oG/baseline.db`。13:55:28.546および14:01:32.741に、受領旧17table全列EXCEPT差0、428objectsのbytes/SHA256が428/428一致した。15tableに`note_purges/job_result_snapshots`を加え、旧完了synthetic行も保全対象に含めた。旧survivor76Bを含む旧502notes/64assetsを変更していない。

最終実測502notes/64assets/825revisions/snapshot15、nonactive0/incompletepurge0/activewriter0、conversion/reference queued-running0、FK違反0、integrity ok。display pending0は受領値で、今回の誤った集計列によるSQLは失敗したため最終再集計の証拠にはしない。既存display行の全列保全は上記EXCEPTで確認している。

削除したものは今回作った3noteと45＋43＋47＝135Bの原本だけ。実回収後はアプリから復元不可。独立入力fixtureはtempに保持した。新しいsynthetic100は本人read-result行として残り、原本/asset/quotaを持たない。既存受領行や他の本人データは削除していない。

- 新独立temp `/tmp/hollow-purge-read-verify.IN63oG`: DB/WAL/SHM除外17files、相対path sort+NUL+bytes+NUL aggregate `ed3708ada81632acd516ad057fc5d678c6bb4ac031745781ac73a834de62afc6`。`evidence.mjs`で個別hashも再取得できる。
- 新独立test SHA `9816686272e7df09dea9bb781ce3ec2c0c5309032aaec79acff5db1df05aebbc`、config SHA `aed1336b874a1af2bcdca633a99c85e0996990d2eb95e9a63a1a092799832dc5`。
- 元失敗test SHA `ff0f4739f7fe7bf0a71edbdcc387b9247ab92f11f0f780c5eb5b6a52e2606450` は開始終了不変。
- 旧独立21資材 aggregate `d97df6b211a62016ee8c7e55a21470b671be04d7074f41bc025bb855c3c29ada`、旧自己30資材 `1873b92c143ab6005f7548d558809788923b6ee9b55fc38435a2dad9e2511828`、今回自己21資材 `91a9e622289867084f26fe023582b414521793b2c63a56b7244c4af0564662f1` を終了時一致確認。元helper/画像/log/失敗資料を上書きしていない。

14:02:05 JSTに自分のfetch wrapper参照なしを確認し、専用browserをcloseした。独立listenerなし、全helper/test execはexit0で回収済み（初回fixture path失敗execはexit1で回収）。未回収session、hook、故障directory、保留応答なし。productionは変更/再起動せず **session14453 / PID83059** を維持、14:02 HTTP200。全検証操作を終了し、報告書込み後に環境所有をManagerへ返す。
