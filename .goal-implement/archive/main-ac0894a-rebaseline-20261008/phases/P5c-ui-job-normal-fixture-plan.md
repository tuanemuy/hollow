# 通常 DB / import job fixture：次の一フェーズ案

現在判断：新しい一つの outer operation 内で browse4 を build し、元 esbuild service の閉鎖を確認した後、同操作が所有する新 SOURCE / output だけで通常 account / upload / import を実行する。build-only の完了後に成果を再開する構成は採らない。今回は SOURCE-only 計画であり、helper 作成・SOURCE 作成・root probe・default / CLI・Node import・DB・Worker・browser・network は実行していない。

## 基点と変更範囲

- SOURCE は immutable main `79ef126edd5d3440cde20dbe8fd372e7235010c5` の既 selected327 / manifest `4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206`。既 PUBLIC bindings plan を基点とし、製品変更・main / S5 / P5d 編集は不要。
- JSBI4 の正常 build は既独立 review `P5c-ui-job-libsql-jsbi4-actual.md` 5175B / `b7a5300a955928a5cd6213fe1d8848dd670ee7cf74fb268ba76b14b38b5424e5` の限定根拠。完成671ce834 SOURCE / build / TMP / output は恒久 NONOP。本計画では一切参照・再用していない。
- 提案する新 PUBLIC helper は `.goal-implement/helpers/p5c-ui-job-normal-fixture.py`、同 `.mjs`、同 `.json` の3path。既 build runner / driver / packed は無変更。新 helper writer は Root の別採用まで開始しない。
- 新 SOURCE / BUILD 名は実装採用時に memory-only literal を一組予約し、packed / runner / driver に exact binding を固定する。現時点で名前・port の探査や root の存在確認は行わない。

## 同一操作の順序

1. 独立 PUBLIC precheck が full SOURCE / selected manifest / dependency rows / pinned Node / helper hash / config / 4 entry を確認する。既 default がある場合だけ、その仕様で非実行 preflight を別確認する。native addon の静的一致を native load / ABI 成功とは扱わない。
2. outer が新 SOURCE / BUILD / TMP を排他700で作成し、source regular600・未知 link / special 拒否で展開。既4 entriesを元 build-search のオプションで一回だけ build する。
3. 元 build Promise の結果を保持し、元 service の stdin end / 実 exit / stdout・stderr EOF / FD close / known PID 終了を確認する。この段階は operation の最終 seal ではない。正常時だけ同 Node が新 output と新 SOURCE を fixture に使う。
4. 新空 app DB の正式 migration → original createLibsqlClient → serializeLocalClient → getDatabase → LibsqlHollowUnitOfWorkProvider / createHollowContainer。正常 signup → memory mailbox から正式 token 取得 → verifyEmail → signOut → signIn。DB verified flag / session / token を直接挿入しない。
5. ASCII1024 の UI1.txt / UI2.txt を、各 beginUpload → acceptUpload(元 ReadableStream) → sealUpload で受け付ける。useAi=false、reference=false。upload2 の前に job1 の完了を待たない。元 createImportRunner の concurrency2 / interval2000 / lease90000 / heartbeat30000 は変更しない。
6. 既知2 job の正常完了と原本 / note / browse / revision を通常 UoW で確認し、元 runner.stop を await。execution / Worker / storage ownership が確定閉鎖した後にだけ正常 DB checkpoint / close へ進む。
7. Node の正常終了と全自己 PG 不在、両 PIPE 実 EOF / FD close、最終 strict walk、両 WAL / journal 不在を outer が確認した後だけ新 opaque → audit copy、immutable readonly query_only / FK / integrity / SOURCE-derived counts、監査 client の実 close。outer 最終 strict と全終了後に操作を seal する。その時点から新 SOURCE / BUILD / TMP / output / DB 全て NONOP。

## 元 artifact と loader 境界

build は `apps/web/scripts/build-search.node.mjs` の browse block と同じ4 entry：`apps/web/app/worker/node/{searchSupervisor,searchQuery,publicQuery,noteProjection}.ts`。bundle=true / platform=node / format=esm / target=node22 / outExtension .js→.mjs / external=[@libsql/client,libsql,css-tree]。JSBI4 の dependency708 / 14,014,031B を基点とする。mainFields、external、元 esbuild this / args / return / Promise / service 終了意味を変更しない。

TEXT の新 worker bundle は不要。元 `packages/core/src/adapters/node/import/documentExtractor.ts` が `import.meta.resolve(@repo/core/package.json)` から新 SOURCE の `packages/core/src/adapters/node/import/parserWorker.mjs` を起動する。extractor 10244B / `2a3ca8d16a9e67ea9c3f262712c93b8fdc0544638d51ee26043a25155767053f`、parser 26374B / `911632fb456c27d5c0ef77cd1ea3eb3b5cb8bfa6be034e291ad7e3944f725bf2`。ASCII / .txt は classify 458–468 の TEXT 分岐、extract の元 paragraphHtml / notices=[] / complete 分岐を使う。Office / PDF / image / audio の dynamic import は到達させず、縮小した偽 parser を作らない。

empty / body projection は元 `IsolatedNoteProjection` と同操作の `noteProjection.mjs`。adapter 4209B / `45ab05b2e24bd1c1d1f60fee03eb6e804ae032f892eddfdf7390d0a13f70e832`、entry727B / `e8274edf2d9ca94a18ce219e256cbf96f65a0bd6275167389a1b066865f62b38`。`withParserAdmission` を parser と共有し、admission active2 / waiting8。共有 admission の release と stdout / stderr FD の終了は別条件で、残 FD handle 数を active2 に換算しない。

新 driver は元 Node の同期 registerHooks / transform-types を使う提案。next-first、selected SOURCE manifest 内の既知 relative extensionless .ts だけ補完、compiled .mjs は同操作の4 outputのみ。全 load は canonical membership / hash / regular mode / UID の固定集合で限定。bare dependency は declared rows の元解決、libsql CJS native load は既 exact parent → addon 一つだけ。CJS一般化、fallback、任意 .node、別 source / cache / generated output、ネットワーク、tsx service は許可しない。実 transitive import / native ABI は未実証の起動 gate として残す。

借用する native addon の PUBLIC 静的 row は @libsql/darwin-arm64@0.5.29/index.node、7837712B / `3fd9e58190311b5ee027c3e5452a6a410b31a5d610fd55853d797bb3c9f5db0c` / 755 / UID501 / nlink1。LIBSQL_JS_DEV は未設定、file DB only。今回は読込をしていない。

## 正常 fixture と SOURCE-derived 期待

base は元 createHollowContainer、importing は元 CoordinatedObjectStorage / IsolatedDocumentExtractor / detectFormat / IsolatedMediaValidator、browsing は元 IsolatedNoteProjection / NodeSearchExecution。importing.wake は元 runner.wake に接続。元 server.node 全 boot は OpenRouter / Drive / export 等を起動するため実行しない。この限定 composition は通常 import ports の検証で、通常 server / UI 全機能の証拠にはしない。search.execute / public discovery / reference runner / LLM は呼ばない。

入力 seed は UI1.txt / UI2.txt、各1024 ASCII bytes：`UI_ORIGINAL_1` 又は `UI_ORIGINAL_2` と1011 spaces。hash は順に `d6290f45573fa1355d2a53be8dbb93777d68824789ad57d9fba81645dcc25383` / `314f8e2afe5e78f3f9a430fc9859a0bb6b805effd35d0276b863ed074564f3c8`。内容 / filename / expected body は固定する。ID・token・session・時刻は元 generator / clock / hasher を使い、通常 DTO から内部 ledger へ保存するだけで公表しない。deterministic seed を能力 / 認証 / native proof の偽造に使わない。

正常期待は accounts1 verified、batches2、reservations2 accepted、originals2 ready/text/complete/各1024/hash一致、conversion jobs2 succeeded、notes2（title UI1.txt/UI2.txt・元段落 body・display initialization 完了）、revision heads2 currentNo2 / revisions4、browse current2、原本 object2 / bytes2048。SOURCE 根拠：acceptUpload 218–297 が新 note / initial revision / original / queued job、processJob 144–206 が editNote / original.ready / job.succeeded / commitNote、commitNote 134–137,207–232 が body changed の次 revision と同 projection 保存。reference settings2 disabled と sealed bundles2 は元 acceptUpload / sealUpload の正常結果。LLM admissions / quota / dispatch / Drive / machine / acquired references は0。migration journal44 / source45files / 878 formal history+statement slots は既 bindings plan 由来。auth の token/session DB行数と outbox / owner行の最終数は helper候補で元repositoryから先に固定し、実行後の SQL から expected を作らない。

2 job の重なりは元 extractor 呼出 begin/end の passive counter と、通常 UoW で取得する当該2 job の running 同時状態を別記録する。両者の有無は直接 receipt とし、succeeded2 から overlap を補完しない。進行 barrier / sleep延長 / worker message hold / retry で overlap を作らない。自然正常実行で直接 overlap が取れなければ当該対を欠測として停止・報告する。globalExecuting≤2 の共有 memory 証拠はなく主張しない。

## 原 handle と閉鎖

元 Worker を exact2 artifact URL の construct 境界で一時観測する案。副作用前 cap check → Reflect.construct 元 constructor / args / newTarget → 元 actual handle を早期登録して返す。private brand、workerData、transferList、resourceLimits、result / terminate Promise identity は維持し、finally 同 wrapper を復元する。message の元 data は出力しない。observer は errorMonitor、採用不能なら stream error observed=NULL。イベント・exit・閉鎖を合成しない。

正常 total は detect2 / empty projection2 / extract2 / body projection2 = Worker8、保守的 simultaneous original handles上限8。元共有 admission は2だが、adapter完了後の pipe閉鎖未了を除外して cap を縮めない。TEXT parser は元 result後 terminate Promise と actual exit0又は対応するterminate1、両 reader EOF+close、timeout/abort/force0を別 receipt。projection は元 actual exit0 / result resolve、両 stream EOF+closeを独立確認（adapter の exit resolve だけでは FD close 不明）。Worker PID を threadId から発明しない。

build child1 と business Worker8 は順次役割が異なる。business OS child0、search child0、browser0、socketserver0、mail送信0。Node CLI1 / Python outer1 / esbuild child1 の原 PID・自己 PG・実 exit と PIPE終端は owner ledgerで別記。native driver 内 thread/connection/FD 個数は公開観測不能分をNULLのまま保持。normal client.closed は logical stateであり、native FD物理閉鎖とは別。

正常 checkpoint は `PRAGMA main.wal_checkpoint(TRUNCATE)` を一回だけ、strict columns busy/log/checkpointed・one row3・number safeinteger000を要求する案。busy / -1 / unknown / error は held、再試行なし、finally 原 client.close。これは quiescence強化であり原 close・全 PG終端・WAL/journal不在の代替ではない。失敗 fixture では checkpoint しない。readonly audit は original IDs を DTOから固定した集合と正式 FK/JOIN に束縛し、SQLから新 expected / capability / proofを生成しない。

## 有限予算・停止・残 gate

一 operation root192MiB：SOURCE32 / output16 / DB app32+opaque8+audit8（logical3、max4/sum80）/ originals8 / TMP8 / cache16 / records8KiB / rawboundedpipe2MiB / material256KiB。PUBLIC packed 本体が materialに複製される場合は computed exact bytesを候補で提示し、256KiB超過ならRootへ先提案する。依存 declared708 は PUBLIC readonly bindingで、全store walk / copy / install はしない。entries8192、Worker8、business child0、buildservice1、原 UoW512 / client method4096 / batch items4096、既知job poll最大60 / sweep65 / heartbeat8。method呼出の元receiver / args / Promiseを保持する境界だけで計数し、native内部呼出数には換算しない。

時間案：build60秒、fixture120秒（normalstop30内）、copy/audit/最終 SOURCE確認60秒の work合計240秒、共有closure tail30秒、outer270秒。guard200ms、既自己 PID/PGだけTERM10→KILL10→PIPEclose10を共有tail内。operationがunknown/非0/force/guard超過ならsticky held、後続fixture / copy / audit0、追加root / retry / cleanup0。final strict walkは全registered owner終端・実PIPEEOF-FDclose後、両sidecar0を必要とする。live TMP例外の有無は候補でexact source契約に結び付けRootへ先提示し、一般ENOENT許可はしない。

次の最小phaseは上記3 PUBLIC helper候補の作成と静的syntax/type/precheck設計のみ。SOURCE-derived auth/owner/outbox exact counts、material computed bytes、loader原URL対応、native addon原loadの限定policy、全closure producer を固定し、独立レビューPASS後にRootが新literal / 実一巡を別採用する。ケース成功、normaltool閉鎖、DB auditはそれぞれ別 gate。IN07 Drive UI、browser current document、通常 server boot、S5 / P5d 完成へ昇格しない。

全PUBLIC source読取はこの案の固定で終了。製品 / helper / 管理文書 writer、runtime、全private操作は停止したまま。
