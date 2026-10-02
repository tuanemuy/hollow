# P5c-2 Browse SSR stream 修正候補の独立検証

## 現在の判定

続報：[S3統合UI2の正式報告](P5c-2-s3.md)でタグ正規personal DOM/直接本人GET、正式Linkから一覧への同document遷移とstable board、A再訪/G/H代表経路が成立した。補助frame counter assertion FAILは保持し、同document/同URL/本人GETの肯定と分離する。中核SSRの下記3pass受入を維持し、今回の資源・26公開helper・項目別結果の正本はS3報告とする。旧UI3の失敗/欠測を遡及変更しない。

UI3時点の履歴（2026-10-01）：候補 `8cb478b8639816751f40ab62ac2ea255e2057ad0` の独立静的・生成22整合・純23対は限定受入済み。同bundle UI3で同期note・raw /notesの正規prepare→board・明示canonical一覧のstable2/現在本人/scopeが3項目とも成立した。tagsはmanager/見出し/空状態まで到達したが、正式personal名「個人のスペース」を器具が「個人」と完全一致比較して停止。この時点のタグ現在本人/clientLink未確認、G/H未実行を履歴として保持する。製品変更なし、全既知資源終了/audit/前後指紋一致済み。

主正式報告 `.goal-implement/phases/P5c-2-browse-stream-fix.md` の105行/12,769B、SHA256 `98466ad43a1d55b75e7c015a58dcb68a1e5c7eca85b6b059c73789f71236ba66` を対象とする。主23対/配布22整合/checks/buildは借用とし、本段の独立成功へ加算しない。

## 初期準備 stage-01 の停止

新root `/Users/hikaru/.local/share/hollow/verification/p5c2-browse-stream-independent-20261001-Ynyyix` はmktemp排他作成、0700/non-symlinkを有限metadataで確認。許可された主公開helper5sourceをexact bytes/SHA256照合→全文EOF読解し、そのうちrun/tests/reporter/integrityの4sourceを新rootへ適応した。旧場所import/実行・旧private追跡0。

stage-01は `BOUNDARY_FAILED` で終了した。主run器具のcopy元だった公開unpatched packageのexact pathが現在MISSING、patched exact packageは存在する。新rootのoriginal/edit/tmp directoryは全て0700・0 entries。packageコピー・生成器実行・純23・DB・鍵・app/HTTP/Chromeは0。raw例外/stack出力0。この失敗を製品SSRの失敗と数えない。

最小再開案をManagerへ提出した。現在patched packageを新labelの公開candidate copyと再生成先copyに分け、計8MiB内で4runtime/4mapを再生成照合する。旧unpatched import/export集合はrepo patchの削除側と正式主整合根拠を区分借用し、不存在packageの探索/再installをしない。旧空directoryと失敗履歴を保持し、追加root/DB0。初期準備失敗後のため、許可前に同label上書き・反復を行わない。

## 承認済み stage-02 と generation-01

Manager採用後、同rootの新candidate-original/regenerateへpatched公開packageをcopyした。旧original/edit空directoryは保持。source1287/SHA256 `54ea42479a90c5c6d720c9ebb39f1ab23eaeed95b1e0301049937c3844935a67` とdist9029/221,712,575B/`45b2e02ac950379a3971b1a59922cce27b780618185940e35f99aaeb005fb0d7` が主候補と一致。seal器具の旧ddl簡略集合は87file保全証明に使用しない。

generation-01は生成器がGENERATED（4runtime/4map、139,609B、reproducible=true）を返したが、監督preloaderの終端条件でexit1となった。外側Nodeはsignalなし、stdout82B/stderr0B、両pipe end/close、既知親PID消滅を観測した。実esbuild子1の終了記録はclosed=false/exit未取得/signal未観測/stdoutEnd=false/stdoutClose=true/gone=false、stderr個別pipeなし。生成成功と全資源終了を混同しない。

器具はprocess exit時に集計し、esbuild.stop後のchild close/EOFを待たない構造だった。子PIDはspawn時memoryだけに保持し、保存時に除外したため、記録からexact PIDを復元できない。現時点で実子終了は未証明。今から広域scan/未知PID操作で補完せず、追加生成・23対・bootを停止した。

再生成を反復せず、新生成物のread-only比較だけを実施した。candidate-original/regenerate/installedの8runtime/mapが完全一致、4mapのfile/sources/sourcesContentも修正TSに一致。これは独立配布一致の根拠であり、元unpatched export/import集合の再検証やchild終了証明ではない。新rootは6,455,287B/767file（容量metadataだけ）、DB/鍵/app/HTTP/Chrome0。

Managerへ、現在uidとexact esbuild executableだけの例外的OS存在確認案を提出した。argv/env/PID一覧を出さずcountだけに投影し、不在が確認できても失われたEOF/closeを遡及証明しない。現時点でこの診断は未採用・未実行。既失敗物を保持し、runtimeの追加実行は停止中。

## 一回限定の現在プロセス診断と返却

その後Managerがread-only診断1回を採用した。公開exact `@esbuild/darwin-arm64@0.27.7/bin/esbuild` はregular/non-symlink・canonical realpath一致。有限wrapperから `/bin/ps -U 自uid -ww -o comm=` だけを実行し、5秒/1MiB内で完全取得・exit0。argv/env/PID列を要求せず、raw一覧を保存/表示していない。

exact canonical一致0、canonical以外でbasenameがesbuildの曖昧候補5。現在不存在の判定条件を満たさない。5件のどれかを今回の子・旧残留と断定せず、所有同定・signal・kill・追加scanは行っていない。過去のesbuild child close/stdout EOF/signalと現在の当該子不存在は、いずれも未証明として保持する。

生成器自体の正常結果、8配布物一致、外側Nodeの実終了は肯定範囲として残す。元unpatched export/import集合は公開patch削除側と主22整合根拠の借用であり、独立再生成一致とは別。今回の障害は監督器具の終端観測不備で、製品SSRの再発を示すものではない。

独立23・app/Chrome・DB3・鍵128Bは未使用。新root/失敗記録/生成物は保全し、系列DB27/app7/Chrome6/Hollow2039/背景195/provider25から今回UI分は増えていない。全量after指紋、87file DDL独立照合、同bundle入口UIと停止auditは未実施である。追加の器具修正・生成・純対・bootはManagerの次判断まで開始しない。報告EOF確認後、全read/write/runを停止して所有を返却する。ただし不明な子の実終了まで完了したとは主張しない。

## 限定path診断・generation-02・独立23

前節は当時の停止履歴。Managerが追加採用した限定診断1回で、同real UIDの `ps -U uid -ww -o pid=,comm=` をmemory取得し、basename esbuildだけにmacOS公開 `proc_pidpath` を適用した。候補上限16・ps5秒/1MiB・path4096B×16・全10秒。結果exact0/他binary5/unavailable0/完全取得true、外側exit0・両pipe end/close。PID/path一覧、args/env/cwd/FD/メモリ、他binaryのstat/realpath、未知PID操作は0。非原子的snapshotなので観測間のexec/生成/終了は完全には排除できず、当該exact binaryを現在検出しない限定根拠である。過去子close/EOFの復元ではない。OS照会は前節と本節の採用された計2回だけ。

Managerが新label generation-02を採用。candidate-originalを不変のまま、同regenerateの純生成結果8fileを更新した。generation-01結果は上書きしていない。observerはspawn直後にexact PIDを私的有限記録へ保存、listenerを先行登録し、標準stop後beforeExitから最大5秒awaitした。子1は実close、knownPID不在、stdin close/destroyed、stdout close/destroyed。stdout EOF=false、stderr inherit=N/A、exit数値null/SIGTERM。公開esbuild stopのdestroy/killによる終端であり、EOF受信・自然exit0を捏造していない。外側Nodeはexit0/signalなし、両pipe end/close、knownPID不在。

integrity-02は22/22。candidate-original/regenerate/installedの8runtime/map一致とmap内容を独立確認した。元unpatched export/import集合の根拠は公開patch削除側＋主の整合借用であり、現在patched同士の独立一致と混同しない。

pure-01は同候補の通常Vitest経路で独立23/23、skip0/unhandled0。子fork1は標準ctx.closeでsignal終了、実close/両pipe end+close/knownPID不在を確認。外側Nodeはexit0、両pipe end+close、knownPID不在。主23を加算して46対とはしない。DB/app/HTTP/Chromeは0。

UI公開helper20件147,791Bのmetadata/fullSHA一致→全文EOFを確認し新rootへ適応。補助metadataコマンドのshell quote失敗1件と、適応用JavaScriptのtext名shadowによる有限補助失敗1件は器具履歴として保持。いずれも秘密なし、app/DB/key/Chrome前。公開source読取の存在しない推定path3件も製品失敗とは数えず、以後はsourceから判明したexact pathへ限定した。

起動前source1287/17,706,102B、dist9029/221,712,575B、migration/schema87/6,916,648B、Playwright工具179/18,550,212Bは上記主指紋と一致。toolsは既行形式、その他はsha256キーJSON配列。新器具syntax18、endpoint照合51、BOOTSTRAP正負33、browse48＋setup69、新1原本guard11が成功。Drive provider/資格/backup0のまま、以下の唯一UIへ進んだ。

## 同bundle UI の今回結果と器具gate不整合

本UIは1boot/Chrome1/context1/page1、正式0040新空DBを使用した。正式transport前提11要求/14,554Bは全HTTP200・decode成功。signup/verify→1原本のbegin/upload/seal→list2回→plain save→original GET/hash→signOutが成立し、原本ready/本人所有/準備worker終了を確認した。1KiB原本1・plain1、LLM/参照OFF。前提sessionのbrowser移植、raw SQLによるaccount/note/job捏造、Drive資格/provider/実外部0。

fresh browserの通常SIGNINは成立。その後、plain noteへdocument gotoし、器具独自の `current('CURRENT').value.id===expected && current('NOTE_READ').value.id===plain` が107回のread-only観測で成立せず、`SYNC_NOTE_DTO` で通常停止した。reclick/POST再送/追加boot0。期待条件を成功へ置換していない。

| 観測 | 直接根拠と限界 |
| --- | --- |
| CURRENT | gen2/ordinal48の本人decodeはSTALE、gen4/ordinal64はHTTP200だがresponse.body段階OTHER。gen5の現在receiptなし。body失敗をdecode/製品errorとは呼ばない |
| NOTE_READ | acceptedとrequestfinished記録0。requested/failed専用計数は未計装なので「要求自体がなかった」まで直接証明していない |
| ACTIVITY | gen5のaccepted5、ordinal134/144/156/166/176、HTTP200/DECODE。本人accountId照合あり。今回器具はauthVersion/browserEpochの固定比較をしておらず、次契約の合格へ遡及しない |
| 同期note DOM | 停止時buttons17/alerts0/regions4/stable。article/title/ready/plain原本なしの専用確認はDTO gateの後に置かれており未到達。表示成功は未確認 |
| 文書/JS | SIGNIN文書9,990B、NOTE文書16,042Bはいずれもheaders/finished/firstchunk/end/close各1、CSP enforcing/report-onlyなし。NOTEのself modules requested62/headers56/finished56/failed0/active6、proxy first/end/close62。HTTPとReact完了は別 |
| console/TSR | console既知serialization/hydration/module各0、OTHER588/76,869B。raw内容非保存なので原因不明。notes browse snapshotへ未到達のためpublicTSRの時系列とCSP violation値も欠測 |
| RSC | signin後一覧向けBROWSE_RENDER requested1/headers0/finished0/failed0/active1。停止時未完の有限計数で、stream producer再発や全子残留の証明ではない |
| POST | BOOTSTRAP2/SIGNIN1/read-only RENDER1。他業務POST0、Drive0 |

静的に `apps/web/app/routes/notes.$noteId.index.tsx:35–42` はloaderでgetNoteFnを呼びcomponentがuseLoaderDataを使う。installed patched `src/ssr/ssr-client.ts:19–28,141–170` はdehydrated matchのloaderDataをhydrateMatchへ復元する。document gotoにbrowser NOTE_READ HTTPが必須という契約はない。currentUserFnのUserViewも{id,email}だけであり、別のACTIVITYのauthVersion/browserEpochを内包すると仮定できない。

したがってHTTP endpoint固定を同期noteの必要条件へ加えた器具gateは過剰。これを製品note/SSR不具合とは判定しない。ただし実note表示・notes raw/canonical・tags・clientnavの成功も取得していないので、修正候補の実UI受入は未完。UI6のproducer順序仮説を本runの実原因と確定していない。R05/OR01/02/09/10の入口、P5c-2 A再訪/G/Hは本UIから新規合格にしない。旧B/C/D/F・203対/DB根拠は業務差なしとして借用のまま。

## 終端・保全・固定指紋

Chromeはexit0/signalなし、実close/fd1–4close、自己group不在と自己control port再bind-closeを確認。appはquiesce/drain→exit0/両pipe end+close。自己HTTP listener accepted179/closed179/socket0。worker5のexit5（自然3/nonzero2）/error0、全pipe end+close。terminate由来nonzeroを自然成功へ数えない。proxy socket/upstream0、observer pending0、provider/native要求0。記録済み自己PID20/20について現在不在を確認した。generation-01の失われた子PID/close/EOFはこの20件へ含めず、全OS子孫の網羅証明とはしない。

writer終了後、active→排他opaque→auditへcopy。各2,060,288B、auditだけquery_only1回open/close、active/opaque再open0・不変。ledger41/tables109/backupTables5/FK0、verified account1/bound session1/note2/original1/conversion success1。backup request/job/transfer/record0、held/pin/object_writes0。1原本1024B/hash一致。auditのscenarioPassed=trueはこの前提DB不変条件の成立を指し、UIのSYNC_NOTE_DTO失敗とは別である。

前後source1287/17,706,102B `54ea42479a90c5c6d720c9ebb39f1ab23eaeed95b1e0301049937c3844935a67`、dist9029/221,712,575B `45b2e02ac950379a3971b1a59922cce27b780618185940e35f99aaeb005fb0d7`、migration/schema87/6,916,648B `3a6871ca621ec9e3f3c9e6ece7cef02e12222fb9fe660297ec82509e45e42e2a`、tools179/18,550,212B `dc520408fcfe3e1951e46ca6a2a03d31d24b554ee21abe1249c094356fad3cc5` は一致。entry/activechunk/Serovalも同固定値。Chrome regular367,696B・Info.plist154.0.8037.59を起動前確認。

容量測定はpackage4,978,374B/DB6,180,864B/原本2,187B/material232B/helper-log1,641,405B/NodeTMP0/ChromeTMP0、合計12,803,062B（最終metadata小記録作成直前、13MiB未満予約）。旧root私的内容を再計数していない。S3列挙系列は30logicalDB/64,812,096B、app8/Chrome7、Hollow2229/21,979,406B、背景223/45,092B。provider旧25/24,229Bは不変。既採用root544MiB/DB96MiB等の範囲内。実Google/mail/OpenRouter/SDK/課金0。

器具補助の公開path推定ミスと不存在Node executableへの誤った空コマンド1件も保持する。後者はprocess生成前のshell exit127、DB/app/HTTP影響0。raw shell/JS固定診断が漏れた境界不備を成功へ読み替えず、以後の補助にも有限投影・exact path照合を徹底する。失敗物の削除/上書き、失敗DB再実行0。

## 次の最小案（追加bootは未許可）

Managerはgate補正方針まで採用済み。候補/製品は不変更、独立23/生成22/旧203を再演せず、新UI root1回だけを別採用後に実施する。

| 根拠 | 次の契約 |
| --- | --- |
| 期待本人 | 正規SIGNIN DTO{id,email}と新同container read-only statusのaccountId/authVersion。setupの実本人と一致し、値はmemoryのみ |
| ACTIVITY認証 | 正式driveActor→captureAuthentication経路の同世代DTO。最初の有効receiptでbrowserEpochをmemory pin、以後accountId/authVersion/browserEpochを完全一致。世代移動を理由にre-pinしない |
| 現scope | ACTIVITY自体にworkspace scopeはない。現在自己note ID/URL、個人保存先DOM、実所有statusを独立に照合し、200/accepted件数をscope根拠にしない |
| 同期note表示 | 正規article/title/ready/原本なしDOMを同document stable2/15秒以内で直接assert。CURRENT body失敗・NOTE_READ不在だけでは拒否しない。NOTE_READは取得できた場合の任意補助assertion |
| 診断と進行 | foreign/stale/epoch・authVersion・scope/route不一致は安全停止。表示/補助HTTP assertion不足は未確認のまま保持。本人/所有が確定していれば独立read-only一覧/tagsへ進め、未知を成功化しない |
| 純gate対 | SSRでNOTE_READなし＋CURRENT取得失敗でも有効ACTIVITYとDOMならpass。foreign actor、古generation、authVersion差、epoch差、欠落pin、別scope/別note route、DOM未安定はfail。新工具の正負だけDBなし先行、hydration成功の代替にしない |
| 画面操作 | 同正式1原本＋plain前提→fresh通常signin→同期note→raw/canonical各1→tags1→正式一覧Link clientnav1。各段個別boolとpublicTSR/streamを失敗前にも保存。原POST再送/新mutation0 |

新root候補 `p5c2-browse-stream-independent-ui2-20261001-XXXXXX` 排他0700/224MiB、DB3/32MiB（active16/opaque8/audit8）、helper-log6MiB/NodeTMP8/Chrome128/原本512KiB/material128KiB/新鍵128B、packagecopy0。account1/WS上限1/note2/original1、app1/Chrome1/context1/page1、provider0。準備60秒49要求4MiBを共通Hollow750要求48MiBへ算入、UI180秒/通常停止40秒/copy-audit各30秒、背景100/512KiB/document8。必要量を超えた未使用枠は再試行許可にしない。

累計提案は33DBで実旧30DB64,812,096B＋新32MiB＝98,366,528B（96MiB以内）、app9/Chrome8、Hollow上限2979/72MiB、背景323/1.25MiB、provider旧25不変。旧27root保守288MiB＋今回root13MiB予約＋新224MiB＝525MiBで既系列544MiB内。helper旧24＋今回2＋新6＝32MiB、原本旧18MiB＋今回4KiB予約＋新512KiBで19MiB内、material旧0.5MiB＋今回1KiB予約＋新128KiBで0.75MiB内。旧内容再読/hash/openなし、今回3DBも次runで再利用しない。新boot開始前にRootの別採用を要する。

## 新公開helper allowlist

新root `/Users/hikaru/.local/share/hollow/verification/p5c2-browse-stream-independent-20261001-Ynyyix` の次20exact regular/non-symlink source、計127,020B。公開sourceの全文読解/生成内容確認済み。再利用時は別採用＋metadata/fullSHA→全文→新root適応のみ、旧場所import/実行や参照するprivate/result/DB/material/key/cacheの追跡許可ではない。現在の過剰gateを持つui-s3/ui-observer/ui-boot等は上記案で補正してから新純対へ進む。

| basename | bytes | SHA256 |
| --- | --- | --- |
| ids.cjs | 1847 | `e23a73412aeb72e5e0224e5db4b1d9800dae938d91950d663cbffb350e0ae91a` |
| preflight.cjs | 287 | `bcd36bac8098918da6443e3d7b34ba1c11ed30e0a15c50fe327ac9d968ce954d` |
| prepare.cjs | 8304 | `a9c9dfdbed4bbc796a4931fa41833f6cb9229b080b822afdcd6c3a9e2252e75d` |
| preserve.cjs | 1961 | `c1faa3f67df5cd7e1573d2298c4631a65b451fb24f25a73b5f573ae190905929` |
| protocol.cjs | 3279 | `388c4e9b76810f857cc6997fccd4fce07282f0ea8e5d54365dcd47d57279b554` |
| serializer.cjs | 12108 | `ae1b9426803f5384d41bddc1b21e44e5c3e5c9672cbbf6a1251838723a1a9f6c` |
| setup-contract.cjs | 4401 | `654ff4a27f137529878aedf3cb1b5207da3c6e6c242dca159386255dee2906b1` |
| supervise.cjs | 10079 | `0d8442310e2ce1e3fdf82bf4a2d92670c2cbeabcdeba62c3bf5052e65d14f8c2` |
| syntax.cjs | 1042 | `dc3d2864cd45844ff841887312571412edefaac96cd14c168e02483663f846ac` |
| ui-audit2.cjs | 7128 | `f7fcdc23283b9b5eb11d5bdfc36a76061656872b583eeff18f2a0387df303cae` |
| ui-boot.mts | 5487 | `9b753712db08f56f4e7da032a3f90c88ca5953c924ff9fb6db6388080731b006` |
| ui-checks.cjs | 1746 | `390a28f3ca0e7bbe9afd9adc3ad79f67b3ce3c47820461c5021e804b529fd58a` |
| ui-common.cjs | 10138 | `0d632e4dddf67937797631c0dab05758ae1afd03b533d7c98328f63e0e781388` |
| ui-guards-check.cjs | 1513 | `5e5c2fbdde228c06f65cb3ac74e4f1973b55437f7dc5d54e7e6e0d251019d259` |
| ui-observer.cjs | 4669 | `53137f7701e6d077d8d8424943513f2dc2b048b2f15459c913bbdea7ae91fac8` |
| ui-s3.cjs | 26557 | `02bf04cc0fc7521804f9cc500a136cf81d4d1ee32180b19758d82772ee205e02` |
| worker-observe.cjs | 1559 | `e22b785d32388080a1a79dea1bcaf590ab0021bae6ffbe4a55e13e81b2f4e430` |
| request-input.cjs | 3503 | `d0d6e9d40d8e172ac9486d2445e7ec45737115b33a8a91bba6ecc1a8ea7622d9` |
| browse-diagnostic.cjs | 10095 | `95531908e508186a2772a01b52fa8dbd08ca1c3ff47be3f4b5ba5cb46bdd363a` |
| handoff-diagnostic.cjs | 11317 | `659860ccd6998e22469b448db4d9124c723a17c1110164ed0694889ca9ae7a72` |

本報告EOF/metadata確認後、全read/write/runを停止してManagerへ所有を返却する。今回の実UIは未完、SSR固定候補の独立局所23・生成22だけを限定受入として提案する。追加boot/DB/実外部接続は行わない。

## UI2：直接同期note確認・scope組立の過剰条件

新root `/Users/hikaru/.local/share/hollow/verification/p5c2-browse-stream-independent-ui2-20261001-sT8BI8`、排他0700。前節20公開sourceのmetadata/bytes/fullSHA一致・全文EOFを確認し適応した。製品/install/build/再生成/23対再演0。新identity正負29対、外側秘密非投影、構文19、同候補endpoint51が成功。投影追加後の新labelでも同29対を確認したが、製品対数へ加算しない。実装済みscope組立を純対が覆っていなかった限界を下記に残す。

正式transport前提12要求/16,586B（list3、他各1）は全200/decode成功、原本1KiB ready/hash/本人所有/準備worker終了、signOutが成立。fresh通常SIGNINはHTTP200/DECODE/accepted1。追加cookie移植・Drive/LLM/外部0。

| 固定観測 | 直接根拠 |
| --- | --- |
| 本人 | 新statusの本人/authVersionと正規SIGNIN DTO一致。同世代ACTIVITY10件で初回epoch pin→以後不変、foreign0。raw actor/epoch非保存・非出力 |
| 同期note | generation5/document ordinal2、46,487〜75,396msの複数snapshotで自己route/URL、article1/heading1/title、ready、個人/編集可能、原本なし、stableがtrue。前提statusも2note/原本1/実本人所有/backup owner0 |
| 過剰条件 | summary exact selectorの存在boolだけfalse。器具が `scopeMatched=queryMatched&&scopeSwitchPersonal` とし、表示側とsafeRead双方へ共用したためNOTE_DIRECT114回/READ_AUTHORITY116回の複合判定はfalse。SYNC_NOTE_DISPLAY assertion失敗とREAD_AUTHORITY停止を保持 |
| 補助HTTP | CURRENTはgen2 stale1＋gen4 HTTP200のresponse.body段階OTHER1、gen5 CURRENTなし。NOTE_READ補助receiptなし。これらを今回本人/同期noteの必須条件にしていない |
| 配信診断 | SIGNIN/NOTE文書はfinished/end/close、CSP enforcing/reportOnlyなし。NOTE publicTSRはseen/streamEndedからmissingAfterSeenへ。CSP violation4分類0。HTTP/e完了をReact promise解決とはしない |
| 未到達 | raw/canonical notes、tags、正式Link clientnav。signin後のBROWSE_RENDER requested1/active1だけで、一覧回帰成功/再発を断定しない |

必要な「自己noteURL＋実所有前提＋個人noteDOM＋現在本人」は成立している。欠落summaryを製品scope不一致とはしない。公開 `Shell.tsx` はemail propがある場合だけWorkspaceSwitcherを描画し、`WorkspaceScope.tsx` はscope/name由来labelを使う。summaryが必ず一つ存在することは同期noteの要件ではない。実runでその表示が欠けた具体原因や個数内訳は未計装であり、email不在と断定しない。表示専用条件だけを失敗assertionへ落としてもsafeReadが同じ過剰条件を持ったため、承認済み独立read-only継続は実際には機能しなかった。実行中gate変更/再POST/追加bootは行っていない。

UI2終了時Hollow254/1,859,264B、背景31/6,276B、provider0。POSTはBOOTSTRAP2/SIGNIN1/read-only RENDER1。console既知serialization/hydration/module0、OTHER1179/154,290Bは有限分類だけで原因不明。NOTE moduleはrequested62/finished52/active10、proxy end61であり、停止時通信計数と全所有資源終了を分ける。

Chrome exit0/signalなし/fd1–4close/自己group不在/control再bind-close、app正常drain/両pipe end+close、HTTP accepted242/closed242/socket0。worker5 exit（自然3/nonzero2）/error0、全両pipe end+close。proxy/upstream0、observer pending0、記録済み自己PID16/16不在。outerはassertion理由exit1だが両pipe end+closeを確認。stop末尾SAFETY_PAUSEDは既READ_AUTHORITY errorをbudget guardが再検出した工具codeで、追加業務failureではない。

writer終了後のみactive→exclusiveopaque→audit、各2,060,288B/計6,180,864B。auditだけquery_only1回open/close、active/opaque不変。ledger41/FK0/account1/verified1/session1/bound1/note2/original1/conversion success1、backup各行0/held0/pin0/object_writes0、原本hash一致。scenarioPassedはこのDB前提の意味でUIの全面成功ではない。source/dist/87DDL/179工具/entry/Serovalは前節指紋と前後同値。今回rootは約6.1MiB（DB6,180,864B・原本2,187B・material232B・helper/log約0.21MiB、Node/ChromeTMP0）、7MiB予約内。

系列累計は33logicalDB/70,992,960B、app9/Chrome8、Hollow2483/23,838,670B、背景254/51,368B、provider25/24,229B不変。旧private再読/hash/open0。公開sourceの推定path不存在を複数回出した補助診断と、無変更patch不一致1件は器具不備として保持する。秘密なし・製品/runtimeへの追加作用なしだが、以後公開pathもrgで解決してから読取とする。

## UI3へ返す最小補正案（未実行）

scope合成とsafeReadを同じ純関数に寄せ、noteは実status所有＋自己route/許可search＋articleの個人DOMを使いsummaryを任意観測へ変更する。今回保存された秘密を含まないtrue入力群＋summary=falseを正例とし、summary true/false両方で同じ必要条件を満たすこと、foreign/authVersion/epoch/stale/自己route/個人DOM不一致を拒否することを先行対で確認する。抽象的scopeMatched=trueだけを試すのではなく、snapshot入力→scope合成→表示判定とsafeRead双方を同じ対で通す。

未到達一覧では個人URL/searchと正規ScopeUsageNoticeの「保存先：個人/編集可能」、tagsでは個人URL/searchとTagManagerの個人eyebrowを表示scope根拠として扱う。いずれもshell summary一律必須を持ち越さない。notes準備/skeletonなど表示根拠がまだない場合は成功へ置換せず、現在本人・既確定自己所有・正規個人target/searchに限定した次の独立read-only navigationの権限と、現在fragment表示のassertionを分離する。具体source対応はManagerが依頼した第二静的読解と照合してから採用し、sourceにないselectorを必須化しない。未知actor/epoch/foreign route/矛盾するscopeは停止。既NOTE_READ任意・CURRENT失敗非必須・公開TSR/stream境界は維持し、任意改良や製品変更を加えない。

次回は新0700 `p5c2-browse-stream-independent-ui3-20261001-XXXXXX` の同枠1回を提案する。root224MiB、3DB32MiB（新0040active16/opaque8/audit8）、helper6/NodeTMP8/Chrome128MiB、原本512KiB/material128KiB/新鍵128B。account1/WS上限1/note2/original1、app1/Chrome1/context1/page1/provider0。prep60秒49要求4MiB込みHollow750/48MiB、UI180秒/close40/copy-audit30秒、背景100/512KiB/document8。新純scope対だけで、製品23/生成22/旧203は再演しない。

同じ上限を追加するには系列DBを112MiBへ（36logical、実旧70,992,960＋新32MiB＝104,547,392B）、Hollow3233要求へ（+254）、背景354要求へ（+31）の採用が必要。bytesはHollow72MiB/背景1.25MiB内、app10/Chrome9/provider旧25不変。旧27root288＋Ynyyix13＋今回7＋新224＝532MiBで544MiB内。helperは旧24＋Ynyyix1.75＋今回0.25＋新6＝32MiB内（既知実量からの予約、旧内容再計数なし）。原本19MiB/material0.75MiB内。追加root/boot/DBはまだ作成・実行しない。

### UI2公開helper差分

現在root sT8BI8 の再利用候補は21source/計135,325B。次表7件はYnyyixから変更/新規であり全文作成確認済み。残14件は同名でYnyyix上表とbytes/fullSHA完全同一を確認済み：browse-diagnostic、handoff-diagnostic、ids、preflight、prepare、preserve、protocol、request-input、serializer、setup-contract、ui-audit2、ui-checks、ui-guards-check、worker-observe（拡張子は上表どおり）。新rootの再利用許可はManagerが別途採用する。metadata/final-finite補助は再利用候補へ加えず、private/resultsへの追跡・旧場所実行0。

| basename | bytes | SHA256 |
| --- | --- | --- |
| identity-gate.cjs | 4339 | `8718545e9ab4bc4c373d76f4aeb64a2071bfd54c641fc67f0a201ad9b7c4b879` |
| supervise.cjs | 10814 | `c680bc8aa14945ba6f9a5c32f31cfd296ad2c78e6183208dd84a4bb759c5085e` |
| syntax.cjs | 1062 | `c99df23d99dc36bf06d23275fe8f4a2aefa9f01818b954ce01bc80926148f8c0` |
| ui-boot.mts | 5528 | `c3f5323df664b77d50f7977aae78ae59bc38a6f76da81a0d496ebb0e50a015f8` |
| ui-common.cjs | 10129 | `b9097924c83049f8a3e752ebbf06349cbd61874451a2cd750a2d528a2e18189d` |
| ui-observer.cjs | 5030 | `1346d7e9e288372783145409bff99dfe10d6fe2b0a1fb7db073994e2e043ce64` |
| ui-s3.cjs | 29375 | `5497007c2e1d26eb0771de1a43a969ff1462e9a8f129877217bcc2633340833a` |

全read/write/runを停止し、所有をManagerへ返す。同期noteの直接肯定範囲と未到達一覧/tags/clientnavを区別し、今回器具過剰gateを製品修正理由にしない。

## UI3：同期note・raw/canonical一覧の直接成功

新root `/Users/hikaru/.local/share/hollow/verification/p5c2-browse-stream-independent-ui3-20261001-JqOfZx`、排他0700。許可21公開sourceはmetadata/bytes/fullSHA完全一致、既EOF読了根拠を継承した。scope合成→表示/独立read-only gateの同一入力44対、投影、browse47＋setup69、構文19、manifest51成功。製品23/生成22/203再演0、製品変更0。正式前提11要求/14,554B、原本1KiB/本人所有/ready/hash/準備worker終端/signOut、fresh通常signinが成立した。

| UI3項目 | 直接根拠と限定判定 |
| --- | --- |
| 同期note | NOTE_DIRECT 9観測、35,145ms stable2成功。自己route/個人・編集可能DOM/title/ready/原本なし、現在本人/authVersion/epoch pin、実所有statusが一致。summaryなし・NOTE_READなしでも成立。SYNC_NOTE_DISPLAY pass |
| raw /notes | 35,871msはPARTIAL/queryKeyMask48、prepare1/board0。正規client normalize後CANONICAL/mask55、37,400ms generation8/本人receipt ordinal218でboard1/selection1/usage1、個人/編集可能、開始button1 visible/enabled、skeleton/route-suspense/location-mismatch0。12観測内のstable2、RAW_BROWSE_ENTRY pass |
| 明示canonical | 38,757msはnew document/board1、39,377ms generation10/本人receipt ordinal284で同じ正規board/scope/controlsがstable2。4観測、CANONICAL_BROWSE_ENTRY pass。以前のcanonical失敗を遡及成功化しない |
| tags | 40,681ms manager1/heading/empty true、自己personal URL true。eyebrow完全一致false、current receipt=false（直前notes generation10の履歴でありtags generation11へ書換えなし）。SCOPE_CONTRADICTIONという器具codeで即停止。タグ成功/foreign actorのいずれも断定しない |
| clientLink/G/H | 未操作・未実行。上の3passをtag/clientnavやbulk/history全体成功へ拡張しない |

raw/canonicalの同document安定はtimeOriginをmemory比較し2回連続で判定、framenavigatedだけをReact commitとは扱わない。rawはdocument ordinal4、canonicalは6。両文書のheaders/finished/firstchunk/end/close各1、23,300/22,018B、CSP/reportOnlyなし。publicTSRは両方buffer4/streamEnded→initialized→missingAfterSeenの有限履歴、CSP violation4分類0。HTTP/eをReact promise settled証明にはせず、boardの実表示を別に確認した。BROWSE_RENDER全体はrequested2/headers2/finished1/failed1/active0、proxy end2。失敗1の原因/特定navigationとの因果は未計装のまま保持し、一覧表示合格と全通信無失敗を混同しない。console既知serialization/hydration/module0、OTHER36/4,345B。

タグの期待不一致は公開sourceで確定した。`browseReadSnapshot.ts:186` のpersonal名は「個人のスペース」、同:209–215→`tagReadSnapshot.ts` のscope.name→`TagManager.tsx:282` の単一dynamic textへ渡る。器具の `textContent==='個人'` は正常値にもfalseとなる。主の前概念要約を完全一致へ強めた工具の不整合であり、秘密raw DOMの事後読取はしていない。実runの生文字列/空白は未保存なので実値そのものを復元したとはしない。

また `tags.tsx` はcurrentUserFnのbeforeLoad＋Shell＋TagsFragmentで、`notes.tsx` のDriveBackupActivityProvider配下ではない。tagsで新ACTIVITYを必須にすると別の過剰待機になる。今回のcurrent未着をactor矛盾と同一視せず、過去pinと現在ページ本人確認を次案で分ける。追加boot/API/POST/DB再接続0。公開path推定1件とshell glob不成立1件は秘密なしの補助ミスとして保持、製品failureではない。

## UI3終端・量と次の統合案

Chrome exit0/signalなし/fd1–4close、自己group不在/control再bind。app quiesce/drain正常、HTTP accepted327/closed327/socket0、worker5 exit（自然3/nonzero2）/error0/全両pipe end+close。proxy/upstream0、observer pending0、記録済み自己PID15/15不在。outerは工具停止exit1だが両pipe終端済み。writer終了後のみ排他copy→audit query_only1回close、3DB各2,060,288B。ledger41/FK0/verified1/bound session1/note2/original1/conversion1/backup行0/owner-pin-write0/原本hash一致、active/opaque不変。source/dist/87DDL/179工具/entry/Serovalは前節指紋と前後一致。

今回Hollow338/4,174,393B（prep込み）、背景39/7,871B、provider0。POST BOOTSTRAP2/SIGNIN1/read-only RENDER1。rootは約6.3MiB、7MiB予約、helper-log0.5MiB予約、DB6,180,864B/原本2,187B/material232B、Node/ChromeTMP0。系列36logicalDB/77,173,824B、app10/Chrome9、Hollow2821/28,013,063B、背景293/59,239B、provider旧25/24,229B不変。旧private内容再読/hash/open0。

次は新候補を作らず、今回の中核3passを借用し、tags/clientLinkと既S3 A再訪/G/Hを一つの新bootへ統合する案。Fは再演しない。タグは正式名「個人のスペース」をsourceどおり比較し、現在本人には同browserの既 `currentUserFn` 正式GET1回だけを検証前提として提案する。active manifestのCURRENTは `currentUserFn_createServerFn_handler`（`rsc/assets/hollowAuth-TtKqbWg7.js`）に一致。GETは同自己origin・新memory session・同世代/期待本人、64KiB/5秒以内・1回のみ・共通Hollow計数、body/URL/cookie非出力。browserの通常same-origin fetch→既proxy/既transport/既observerで行い、独自認可や外部APIは追加しない。実施方式/器具は別採用後に静的照合・純対で固定する。取得失敗/unknownなら停止し、UI機能成功には数えない。notesのACTIVITY epoch pinは履歴として不変、tags GETのidだけでepoch同値を証明したとはしない。通常samebrowser認証継続・新status authVersion不変・現在認証GET・正規page DOMをそれぞれ区別する。

| 統合操作（採用前） | 範囲/期待 |
| --- | --- |
| 前提 | 新account1、原本5×1024B＋plain1＝note6、正式signup/verify/begin/upload/seal/save/signOut、LLM/参照OFF。fresh通常signin。タグGET本人/正規DOM→正式Linkから一覧stable後に限り次へ |
| 保存済み前提 | fixture folderを通常契約導線で採用しmanualseed1/current成功。業務DB捏造0 |
| 混在4 | saved/plain/good/quotaの固定preview/confirm1→quota既知failed→元親failed-only retry1。同条件/旧終端保持 |
| 別2取消 | UUID昇順を実自己IDsからprovider要求0時に固定、started chunk hold中に正規cancel1→未開始送信0/started結果保持。hold25秒/adapter30秒、強制所有消去0 |
| H/A再訪 | history/link/ticker/toast、reload・再訪、390px/Tab。500件は主実DB/符号化借用、browserへ500の追加mutationなし |
| provider/終端 | 予定24＝前提5＋good5＋quota初回4＋retry5＋cancel-started5。folder5/allocate4/start4/chunk5/inspect5/query1、attempted5120B/accepted4096B、成功upload4。job7＝success5/failed1/cancel1、request4/transfer6/record4。実Google成功ではない |

新root案 `p5c2-s3-independent-integrated-20261001-XXXXXX` 排他0700/224MiB、3DB32MiB(active16/opaque8/audit8)、helper6/NodeTMP8/Chrome128MiB、原本512KiB/material128KiB/新鍵128B、app1/Chrome1/context1/page1、account1/WS上限1/note6/original5。prep60秒/49要求4MiB、UI600秒/正常close40/copy-audit各30。Hollowは前提＋本人GETを含む1000要求/40MiB、背景150/512KiB、provider予定24/cap32/8MiB/逐次1、document上限16を提案（各業務再訪を含む、上限までの追加操作許可ではない）。原POST再送/追加boot0、失敗物保全、停止writer→opaque→audit1回。

系列提案は39DB、77,173,824＋32MiB＝110,728,256Bで採用済112MiB内、app11/Chrome10。Hollow上限3821要求（既3233から+588）/72MiB内（実旧28,013,063＋40MiB＝69,956,103B）、背景443要求（既354から+89）/1.25MiB内。provider最大57要求/16MiB内（旧25＋new32、予定終端49）。保守root旧27分288＋Ynyyix13＋sT8BI8 7＋今回7＋new224＝539MiBで544内。helperは24＋1.75＋0.25＋0.5＋6＝32.5MiBなので33MiBへ+1だけ提案。原本19MiB/material0.75MiB内。未使用余白を再実行権限にしない。

### 次段公開source候補

現在JqOfZxの21sourceは計138,162B。次4件だけsT8BI8から変更、残17は前表の同名bytes/fullSHAと同一。tag期待とtags本人前提はまだ未補正。いずれも旧場所import/実行・参照private追跡なし、新root適応は別採用後。

| basename | bytes | SHA256 |
| --- | --- | --- |
| browse-diagnostic.cjs | 10050 | `06d02a55ccca538362efac3c9c08be52945649d54464c8d08407e46c5b8f4ea2` |
| identity-gate.cjs | 6509 | `30d2febdccb3ef9d9d065cabda01f65890270fdf52c3795fa0aa55ac2a16e7a2` |
| supervise.cjs | 10940 | `6cef1eaf010d9637d542dc1d1deb02af6701e33fc11d2f3267e0300c6d0ee64a` |
| ui-s3.cjs | 29961 | `b278559669f78bdb804f6d8516be6d36fd5402fe7dd62bd083fc32b9fb0d1fc5` |

既G/Hを組み合わせるため、正式S3 report UI6表の次11 exact公開sourceを追加読取/適応候補とする。rootは `/Users/hikaru/.local/share/hollow/verification/p5c2-s3-independent-ui6-20261001-hUYb3H`。今回は報告表だけ参照し、これらhelper本体/旧privateは読んでいない。採用後metadata/fullSHA→必要全文確認→新root適応、同名競合は最新UI3のscope/認証/終端を残して旧業務操作だけ統合する。旧probe候補指紋/旧built classへの固定値を盲目的に流用しない。現在entryは `query-G26IDSH8.js` のexport a＝BusinessRuleErrorをimportする公開根拠を確認済み、quota strict bridgeは同candidate metadata/依存再照合後に接続する。

| basename | bytes | SHA256 |
| --- | --- | --- |
| ui-provider.cjs | 21148 | `64c67a3a8a1af079f3838f084760dd7913772e7b560c956091c751d05adddeb0` |
| quota-bridge.cjs | 1011 | `bcd138ffe3429ba3cb29b315a5e856244a6df5b6719f341e3d7499658e21ac65` |
| bridge-loader.mts | 1089 | `908cb6bfe69594ceb753ca85399a9ccbbbd17b4e1d28b71d6424d665812afd4e` |
| bridge-checks.mts | 2632 | `f217717b00646d360ebb2bece0cf1cf5ad638e166ba041b561d19bc9f9635423` |
| ui-boot.mts | 12756 | `505e572ba3375f2e689564fbb7f32c349f6233c43cfa403c931bc34892e78bdb` |
| ui-s3.cjs | 41279 | `9b3a6948c0254a1a09e1d08855c39e61b4fca76320923dacc8b0d2216158b9e3` |
| prepare.cjs | 8156 | `d2be76f716d6b1c586527f974a6891c06db38fccd90255a34209d99abf38e09a` |
| ui-audit2.cjs | 7166 | `f24da7f62370517bfa39ed11e04e98b17b50644085808188271c85cbb2c63fdf` |
| ui-observer.cjs | 4304 | `a7a043c2b4d550115c5218e8979151d1d8776fa5408099cc7c89d9b8d86592fc` |
| ui-guards-check.cjs | 1237 | `d2d40a16d1ffa180b6e6f5cd38acd8c8e0f6bb1e8331205762334c2dc01afae7` |
| ui-common.cjs | 9936 | `c348ced6ff0061ed84d179e91f8fd60b5958fea861144eed4ab51b02d7a7d514` |

器具純対はタグ正式文字列/本人GETの正常・foreign/stale/unknown、scope/独立read-only継続、統合操作permit/holdの到達差だけに限定。未変更strict bridge/終了能力/製品203・S2の局所/native根拠は借用し、型が違うsource classをbuiltへ無制限に昇格しない。追加source/新APIが必要なら実行前にManagerへ返す。統合案は未実行・未採用の資源増分を含む。

EOF確認後、全read/write/run停止・所有をManagerへ返却する。中核3passの限定受入とtags/clientLink/G/H残を分離する。
