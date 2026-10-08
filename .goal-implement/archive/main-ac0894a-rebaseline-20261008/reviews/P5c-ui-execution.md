# UI runnerの独立起動preflight

## 第二一巡の安全結果・公開cause照合

2026-10-05T23:03:25Z。**第二一巡はunproven、P5c1/2の残UI受入は成立しない。失敗throwサイトは独立静的に確定したが、対象の実path/領域は欠測で原因をChromeへ断定しない。** [正本安全結果](../phases/P5c-ui-execution.md)44,191B/SHA256 `6eb768538791dd72e37a424cf69de50b01f1fa53b018a1d9111190604a1b3c08`、regular600/nlink1を直接確認。結果はImplementer実観測の報告借用であり、自分によるroot/DB/process再検証ではない。

| 対象 | 根拠と判定 |
| --- | --- |
| 同Node純対 | 借用aggregate purePassed=true/count21。各対名結果は未公表。正式UI criteriaの代用0 |
| 実UI | 借用uiRootCreated=true/uiCompleted=false、stage ui-work/CAUGHT/UI_UNKNOWN_DATABASE、finishedSeen=true/innerFinishedSuccess=false。各U0–U7直接結果欠測 |
| 外側終了 | 借用Node exit1、両自己PG absent、stdout/stderr各EOF/FD close=true、control regularFD close=true、force=false/deadline null、18frames/321 output bytes |
| 内側終了/監査 | inner正常closure/private proof/ACK/audit/BFCacheの直接結果欠測。外PG/PIPE/FD終了を転用0 |
| P5c1 A/B/C/D/E/F | 今回残UIの直接成功は全て欠測。既受入の借用範囲は[coverage](P5c-ui-coverage.md)のまま保持、再open/全合格への補完0 |
| P5c2 A/E/I/J | 同bundle新接続/BFCache等の直接成功欠測。既C/B静的・以前の受入範囲だけ借用、pure21による受入0 |

### 静的に確定したthrowサイト

fixed stop-audit41,212B/SHA3cb4b5b5の`performGuard`（188行）は、全rootのregular fileについて、root直下`active/opaque/audit.db`とそのwal/shm/journalだけをlogical DBへ数える。それ以外の`.db/.sqlite/.sqlite3`と各sidecar suffixは一律`fail('UI_UNKNOWN_DATABASE')`となる。公開5helperの同literal throwはこの1箇所だけであり、runnerのsafe markerは完全一致を保持する。これはhelper filesystem guardの分類で、製品SQL/schema/driverのエラー翻訳codeではない。

そのwalkは先にUID・regular・nlink1・modeを検査し、current Chrome profile内では既採用600/644を認めてChrome bytesへ加算する。しかしその後のDB suffix拒否はprofileEntryを考慮しない。従って所有済profile内の許可regular fileでもsuffixにより同faultになる経路は静的に確定する。**今回faultがそのprofile経路を通ったという実観測はない。** 実相対path/領域/生成元は公表されず、アプリ側未知DB・Chrome native data・他root領域のどれかは未区別である。ファイル名を推測して例外を追加しない。

呼出列はrunUi→createBrowserHarnessのChrome所有確定guard、executeUi内waitのguard、completeUi末尾guard等が同performGuardを使う。全体をlauncherのui-work await/catchが包むため、同safe stageから特定の画面やU-stage到達を逆算できない。通常エラーを正常へ翻訳する箇所はない。

正常DB配線の有限source確認では、bootは`DATABASE_URL=file:<root>/active.db`を明示し、server.nodeはreadNodeServerEnv→createLibsqlClient(url)→applyPragmas/getDatabaseへ渡す。search/publicDiscoveryも同URLをcanonical化して使う。driver/schema内容を読み直して追加アプリDBの原因を示す根拠は得ていない。成果C/B不変更のbindingは既受入借用、全bundle再scan0。helper分類faultだけから製品DB/schema修正を要求しない。

### 最小の次提案（未採用・未実行）

必要なら公開helperのsuffix判定を副作用なしの有限classifierへ抽出し、root exact3 DB/sidecar、current owned Chrome profile regular、その他領域の未知DBを区分する意味ある単体対を提案できる。Chrome側を許す設計では、既known profile boundary・UID・regular/no-follow・mode/nlink・128MiB/全256MiB/entry capへの計上を維持し、app logicalDB3/48MiB監査へ混ぜない。未知DB一般や広いcache例外にはしない。

実原因を分ける必要がある場合も、failure領域の固定enum（root/application、owned Chrome profile、Chrome TMP、objects、node-tmp、other）と数値countだけを新candidateのsafe faultへ添える案に留める。実filename/URL/SQL/stack/body/credentialsを出さず、未知領域はunknownのまま拒否する。これらは提案だけで、追加test/新root/第三一巡許可ではない。旧失敗結果を読む必要はなく、既F1–F6が不変更なら全再演も要求しない。

自己操作は公開source/reportの読取と本レビュー保存のみ。ui67/tool67・ui0d/tool0dその他失敗rootの再読/hash/接続0、実process/PID探索/DB/probe/runtime/test/外部/音声/製品・管理正本・goal/spec・S4/P5d writer中tree操作0。保存後全自己read/report writerを停止する。

## 新root literal binding — 静的pass

2026-10-05T22:57:02Z。**新予約名だけのdeltaは独立静的pass、実行の採用はManager判断。** runner35,508B/SHA256 `9a379bddf668be3fcb982b7137111c1e4d2f69386adb45de2386f2410bd32706`、boot38,376B/SHA256 `2c639d6b94fae4ca5b99b34cf61ac61fd7ac2885b48b77fcbd7228b1adbc87f4`、launcher10,283B/SHA256 `c8c05c58699a36c13f0a5607983a15afbf1c1be3b4d40e3d3bd95d84cc3f446a`を直接固定確認。runner/bootのregular600/nonlink/nlink1も成立。[提出](../phases/P5c-ui-execution.md)41,626B/SHA256 `01f17a25635a7b295540d9654250cd43f8e53504eef50491ebb4b70d40f92725`。

UI名`ui-67e9b2ca`2箇所・tool名`ui-tool-67e9b2ca`1箇所・boot従属SHA1箇所を逆置換したrunner全文hashは既受入f44353baに一致する。bootのexact比較名1箇所だけの逆置換は497ed39d、launcher逆置換は8804a630に一致。既4helper全文hashはprovider937fbbee/browsera4b2192d/pureecd265c6/stop3cb4b5b5と不変。旧private/root/helper実物を読む比較ではない。

Python/launcher/bootのroot名が一致し、bootのsame-process private pure gate→knownbase/canonical parent/非存在/exclusive700、outerのnew tool wx/no-follow600、NodeTMP合算8MiB/全UI256MiB、pure30/UI720/tail30、固定origin/argv/env・R1/R2・safe summary・private proof/ACK・正常条件は不変。一般root選択やregexへの緩和はない。C/B/static checksは不変更範囲の借用。新予約UI/toolの生成/非存在確認/portprobeは0、前失敗root非操作、原因未特定/過去欠測の補完0。本追補後UI review操作を止め、並行で委譲済のSlice A計画照合へ戻る。

## 安全summary/protocol delta — 静的pass

2026-10-05T22:51:31Z。**公開runnerのsummary最小deltaは独立静的pass。再実行許可ではなく、Manager判断へ返す。** 前一巡は借用通知上unproven/actual Node exit1であり、原因未特定、pure21各結果/U0–U7/inner audit/両PIPE詳細欠測を保持する。失敗UI/tool root・結果・process・DBには触れていない。

直接固定確認: runner35,508B/SHA256 `f44353ba66b451e9b862882bac368ccc28d3fd62f847e0036cdca8169df96a51`、内包launcher10,283B/SHA256 `8804a630e94d6298785bd226b023b262cbf0d3e8e0063cc43387c5e31eadf48b`。[現提出](../phases/P5c-ui-execution.md)39,381B/SHA256 `3271cc6f050e3f9ace1b4395693d81ca581603c5773138f56b57f4869f166e5b`。regular600/nonlink/nlink1と全文hash/AST literalを確認した。5helperのhashはboot497ed39d/provider937fbbee/browsera4b2192d/pureecd265c6/stop3cb4b5b5と不変。C c2a3d45f・3488B・既R1/R2/whole-helper受入は不変更範囲の借用、追加artifact/source全scan0。

Outerは受理pureCount/純対gate、done/finished、outer phase/deadline、actual Node exit、PG absent/alive/unproven/unobserved、2PIPE各EOF/FD close、control regularFD close、force、有限output/control countとownership/recoveryをpublic projectionへ残す。最後のstream.closeはFD closeだけを更新しEOFを作らない。Node非0/finished欠測は有限分類し、先行faultを上書きしない。normalには従来のdone/finished/pure/両所有channel/Node0/両PG不在/PIPE実EOF-close/error0/force0/control closeが必要で、unproven・private proof/ACKを成功へ変える新枝はない。nativeSyncHooks/loaderThreads/transformServicesは固定構成値であり、新しい実測成功の根拠ではない。

Node側は11stage・5fault enumを固定し、233個のunique markerはfixed5helper/launcherの公開exact literalに由来することを直接照合した。own message descriptorの固定完全一致又はown code descriptorのnative15enumだけをmarkerへ写し、未知/accessorはUNKNOWNに留める。値/stack/SQL/credential/生stderr本文をpublic summaryへ転記しない。fault16/stage32、control64frame/各512B/32KiB、合算output12MiB、summary8KiBは有限のまま。markerは失敗識別でありcase PASSや寿命proofではない。

restore/recovery/hooks/final frame/FD closeは個別FINALIZATION、IIFE rejectはsafe分類後rethrow、uncaughtExceptionMonitorはsafe分類だけで既定異常終了を維持する。FD/control不能では観測が失われ得るが、外側非0/finished欠測へ留める。本文を取得して未知causeを埋めない。root/argv/env/cap/child/TERM-KILL-tail/同Node private gateは変更0。固定root名は前失敗と同じため、現runnerのexclusive-root guardは再利用を拒否する。この合格から新root割当や再実行を推論しない。

Python/launcher static check actual0はprimary記録借用。自分はstdlib AST/hashと公開codeの静的照合のみ。実root/pure/UI/runtime/probe/DB/外部/音声/旧資材/製品/管理正本/goal/spec操作0。review保存後、自己read/report writerを停止する。

## R1/R2以前の履歴

## R1/R2固定delta — 静的pass

2026-10-05T22:38:38Z。**R1/R2補正を独立静的passとし、Managerの有限一巡実行判断へ返す。新root/pure21/実UIは未実行。** 未観測・失敗・所有欠測を正常終了へ補完する枝は確認されず、今回2点と残root/argv/env/cap/closure bindingに具体的な起動重大不足はない。以下の旧差戻し記録は前候補の履歴として保持する。

固定runnerは26,115B/SHA256 `2bc5ec4a1e14285b48e0297647e468c2e79bb48d9ccb86d3b7a5cc8a80b93dff`、内包launcherは8,660B/SHA256 `06f96a10f5eaf8a3bd045b876b5efb21b141b85d405b4044610b339004f40093`。[現提出](../phases/P5c-ui-execution.md)は29,097B/SHA256 `8a88010d0dde346f7c44604d3427cbb167b63cba4eddc5aea7f9fc673515abeb`。runner/提出のregular・nonlink・nlink1・600、全文hashとlauncher literalを直接確認した。固定5helperの全文hashはboot497ed39d/provider937fbbee/browsera4b2192d/pureecd265c6/stop3cb4b5b5と同一。C `c2a3d45f1097533c6344346aca303dc1d2aef368`・3488B・release93d264の不変更と既whole-helper受入を借用し、成果全再scanは0。

**R1 pass。** 同mainの同期`registerHooks`＋`stripTypeScriptTypes(mode: transform)`だけへ接続し、tsx/esbuild import・service・loader threadを除いた。新Bの公開source-manifestは322,232B/SHA256 `de7c79fa0c283d1881912c9d7d8a4465edc98b488d5b5d755609e44bc8ec7552`、1,457entryの有限mappingを直接確認した。loadはその729 core `.ts`とexact5helper `.mts`にcanonical path/URL・mode・bytes・hashを束縛する。resolveは通常Nodeを先に試し、ERR_MODULE_NOT_FOUND時の既知source親・relative no-extensionだけを既知`.ts`へ補う。bare/compiled JSは通常Nodeへ渡し、未知TS/TSX/CTS/CommonJS/query/escapeは拒否する。sourceの仮想copy/queryを作らず、class identityと通常Worker/fork import引数を変更しない。native APIの根拠は下記公式API確認を継承し、実import/pureの互換成功は未検証である。

**R2 pass。** actual spawn直後にChrome child・5stdioを保持し、self-run32hex tagのexact stderr mirrorを先に、held regular FD frameを後に送る。両経路のPID=PG同一、Chrome1、exact重複だけを許容し、raw stderrや別tagを所有証拠へ転用しない。書込失敗では自己ChromePGへKILLを要求し、5FDを閉じ、referenced 200ms recoveryでactual child exit/close・5FD close・PG ESRCHを10秒待つ。同じchildをinner observerへ返し、recovery未成立は失敗のまま保持する。outerは既知Chrome TERM/KILLを0/10秒、Node TERM/KILLを10/20秒、tail30秒に分け、自己回収前の即NodeTERMを除いた。正常は両所有channel・Node exit0・両PG不在・2PIPE EOF/close・control FD close・inner closureを別々に要求する。UIでChrome所有が欠けたforceを全終了成功へ補完せず、ownership metadataからprivate閉鎖/ACK proofを生成しない。

固定root `ui-0d73d1ac` とscratch `ui-tool-0d73d1ac` は生成0。canonical親/非存在/exclusive700、regular no-follow600、scratch＋NodeTMP8MiB/全UI256MiBの200ms guard、pinned Node24.15 direct argv・cwd新B/source/apps/web・最小PATH/LANG/TMPDIR envが維持される。pure21/30秒成功後だけrootを作り、UI720秒内normal stop120秒とtail30秒を適用する。Python/launcher static checksのactual0はprimary報告借用、自分はread-only全文/hash/AST literal照合だけを行った。

実root・pure・UI・Chrome・DB/audit・実終了は全て未検証で、動的合格やU0–U7受入にはしない。旧private/root/helper/D01・P5d別tree・外部・音声・製品/管理/goal・spec操作は0。本レビュー保存後、自己read/report操作を停止する。

## 前候補の差戻し記録

2026-10-05T22:20:59Z。**現tsx候補はR1のloader-realm sync子上限とR2の未通知Chrome異常回収を差戻し。pure/新root/実UI実行0。** R2はManagerが既F2/起動案の異常停止条件への影響として採用した。Node24 native transform＋同期registerHooksの限定代案は条件付き採用可能で、修正版固定後に影響deltaを確認する。全候補/loaderの全面再設計や無関係suite再演は要求しない。

[固定提出](../phases/P5c-ui-execution.md)=18,393B/SHA256 `a0865c90a7c7114b3b6a4d8f7aead50a10de7b573c790cd19514c3c2810daef5`。runner=21,100B/SHA256 `142f2d6d67ac2e58d91c6530d475dc81f04e1bc2b08898c8b86d72b0d6decff5`、boot=38,376B/SHA256 `497ed39d7a191c3236437404c24adfa052119f0cfc94b8f7f1135b62efbd06d3`、各regular/nonlink/nlink1/600を直接確認。既provider937fbbee/browsera4b2192d/pureecd265c6/stop3cb4b5b5は全文hash同一。C c2/new3488B/release93d264不変更は管理報告を借用し、artifact全再scan0。

## 静的成立部分

bootの差はpure成功gateを保ち、予約absolute `ui-0d73d1ac` のcanonical親・非存在・排他700を確認するroot入口。既4helper/bridge/F1–F6/DTO監査の受入範囲を維持する。

runnerは新scratch `ui-tool-0d73d1ac` を排他700、controlをwx/no-follow600のheld regular FDへ固定する。dynamic loader登録await→同Node prepareContracts21/max24・30秒→pure成功後だけ新root→completeUiと接続する。scratch＋NodeTMP8MiB/全UI256MiBを200msで監督、UI720秒にnormal stop120秒を含め、tail30秒を別に置く。通常Worker/forkに--import/--loaderを渡さない。

Chromeは生成前exact executable/profile/proxy/bypass/CDPpipe5/detachedを検査し、元actual child/PIDPGだけを同期control frameへ記録して同handleをinner observerへ返す。controlは64frames/512B/32KiB、outer pread200ms、秘密本文0。これはprivate closure/ACK proofではなく自己停止の所有metadataである。outerはNode actualexitとNode/既知Chrome PG不在、stdout/stderr実EOF/FDclose、control regularFD close、inner normal/actualClosed/auditClosedを分離し、force/partial/unprovenをnormalへ補完しない。PIPE raw本文は保存/表示せずbytecountだけ。これらの静的接続は妥当で、実終了成功ではない。

Python/launcherJS/exact5helper strict型のactual0はprimary記録借用。自分のcompile/type/pure/runtime操作は0。

## R1: mainのsync cap0がloader realmへ届かない

公開tsx4.21 `dist/esm/index.mjs` のloadはcommonjsの`.js`がESM構文を持つ枝で`transformSync`を呼ぶ。同公開`index-7AaEi15b.mjs`はesbuildのtransformSyncへ接続し、実public依存esbuild0.27.7の`runServiceSync`は、ESBUILD_WORKER_THREADS=0のときexecFileSyncでservice子を作る。

runnerはmainのcp.execFileSyncだけを子生成前に拒否する。一方module.registerで動くtsx hookは別realmであり、そのcp/esbuildをmain observerは変更しない。したがってloader側のこの枝はsync-child cap0の副作用前guardを通らず、main count0のまま子を作れる。type:module/.mts/compiledESMという正常期待は全transitive commonjs枝の不達証明ではない。async realm singleton≤2/loader thread≤1の計上とPG閉鎖を、このsync不観測の成功へ転用しない。

最小対応は、tsxを維持するなら実loader realmにも同sync生成前拒否を接続するか、下記native限定案でtsx/esbuild経路自体を除くこと。追加子枠/新probe/一般resolver基盤は不要。

## Node24 native限定案の比較

Node24.15の`registerHooks`はmoduleを読む同thread/realmの同期hookで、`stripTypeScriptTypes`はmode:`transform`で型除去とenum/namespace等の変換を行える。runtime登録hookは--import等でpreloadしない限り子Workerへ自動継承しない。[Node24.15公式API](https://raw.githubusercontent.com/nodejs/node/v24.15.0/doc/api/module.md)

この案ならtransformのためのtsx/esbuild serviceと追加loader threadを0にする方向として成立可能。次の条件は今回固定sourceを読むための限定loader契約であり、一般package/tsconfig互換の追加ではない。

- loadは新B/source manifest内のcanonical`.ts`と固定5helper`.mts`だけをhash束縛してnative transformする。compiledB `.js/.mjs`、bare dependency、createRequire先は通常Nodeへ渡す。未知TS/TSX/escapeを黙示fallbackで通さない。
- resolveはmanifest内の同source親からのrelative extensionlessだけを既知`.ts`へ解決する。package exports/公開dependency一般の解決を置換せず、架空tsconfig/paths/JSX変換を追加しない。
- canonical module URLを維持し、同source classを別query/仮想copyで二重生成しない。built JSのclassは変更しないためsource/B BusinessRuleErrorの既exact bridgeを維持できるという静的推論。native transformがsourceのruntime import引数や成功/失敗値を替えないことは修正candidateで確認する。
- hook登録後にbootをdynamic importし、Nodeバージョンを既pinned24.15へ固定する。--eval/runtime登録のままWorker/forkのargsを変更しない。未対応syntax/解決不足はpure前の有限失敗として保存し、tsxへ自動再実行0。

この代案は未実装/未実行。CLI/native probe・新deps探査・source編集はせず、固定runner deltaを待つ。今のtsx候補をpassにした扱いにはしない。

## R2: framewrite失敗で未通知Chromeの自己KILL前にNode ownerを失う

Chrome control frame write失敗時、現launcherはselfChromePGへ即TERMし10秒後のunref KILLtimerを置く。他方outerはcontrol error時force_at0でNodePGへ即TERMできる。ChromeがTERM後も残りframe未記録なら、Node ownerがKILLtimer前に終了して別ChromePGをouterへ渡せない。inner observerへ同handleを返すことだけでは、Nodeが先に終端した後の回収主体にならない。既F2のactualspawn以後例外でearly ownerを失わないこと、outer Nodehangの別ChromePG回収に直接影響する。

最小補正は、frame未記録/途中失敗でもそのactual detached childを既有限停止へ確実に引き渡し、self cleanup又は外側ownership handoffが完了する前にNode ownerを失う競合を閉じること。TERM/KILL要求とactual PGabsenceは別観測として記録し、不在未証明を正常closeや全終了へ補完しない。regularcontrolと既Node/ChromePG枠・各期限を維持し、未知PID探索/別probe/新fault群を要求しない。制御例外経路の修正candidateで静的deltaを確認する。

## 未検証

実root/pure21/ChromePIDPG/両PIPE/FD/DB close/audit/U0–U7/BFCacheは未検証。旧private/root/helper/D01/DB/秘密資材・P5d別treeの操作0、外部/音声0、製品/管理正本/goal編集0、spec/spec-implement0。本書だけ保存し全read/reportを停止、修正版のManager採用/固定通知待ち。
