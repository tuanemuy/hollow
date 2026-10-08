## 第五11case PASSの独立根拠照合・A–H対応

2026-10-06T01:16:44.470334+00:00。11case/正常監査の主実行報告と公開assertion/helper predicateは整合。実行根拠は借用、自己runtime/DB検証0。公開phase86315B/SHA `d76cf8602f647c982acc05e8b69fc665820a950d5cb3d1541ea6d9e2b8b15af4`、runner813ff5c8/loader75c3407b全文固定を直接確認。source476dd475/manifest7b0647c3を継承し、schema/app/credentialの11testとfixture.close・normal audit条件を直接読んだ。成功ROOT/TMPにも追加read/stat/hash0、旧failed4全非操作。

借用結果: schema2/app6/credential3 exact全pass、3file/afterAll close、knownfork3 actualexit/EOF/close、Node0/ownPG ESRCH/2PIPEEOF-FD/force0、normal同DB3 readonly query_only/FK/integrity/45migrations/79以上guards/anchorFence/readonlyclose PASS。source上afterAllはfixture.closeをawaitし、passwordHasher stop/FK/integrity/checkpoint後finally同期client.closeへ進む。helperはfilepass/全casepass/no unhandled/no violation→active.close→fork実終了/EOF→Node0+両EOF+PGabsentの後だけ監査する。これは正常fixture閉鎖の契約由来の根拠であり、専用nativeDBhandle closeイベントや資格HTTP閉鎖proofを新たに観測したとは扱わない。

| 固定ID | 今回成立した限定根拠（実行は借用） | 完成条件の残差・判定 |
| --- | --- | --- |
| A | A01 email不一致intent0・旧session有効、A02 password退会/通知throw後accepted・旧session無効/deleted対missing、A03同email別ID/旧作者保持、G02 authVersion2/不可逆anchor、E02 Google-only退会 | 基本受理枝はPASS。cookie transport拒否・全型境界等を含むID全条件の独立実証は未完 |
| B | B01最後owner退会拒否intent0、A02二ownerから一owner/WS本文と作者保持、B02残owner直接降格拒否 | 逐次正負はPASS。二owner退会/降格の競合、WS削除fence、移動済noteの原本/charge/成功来歴は未完 |
| C | currentUser旧session拒否、再登録後作者付替え0 | public/link/media/original/grant/artifact404、遅callback/directclaim/finaladopt全入口とmove両順は未完。UI/HTTPの404をcurrentUser結果で代用0 |
| D | source静的shell/recorder-unavailable契約を保持 | 今回target/record/binding/success-history fixture0。matching shell縮小/sha bytes/一覧単件・通常usable・誤intent拒否の動作は未完 |
| E | E01 defaultexecution/fakeHTTP/fakeowner nativeproof拒否、E02 legacyコピー保持/直接削除拒否、E03 originラベル偽装/active guard拒否、A02通知throwでもfence維持 | 負例部分PASS。genuine native claim→actualHTTP+wholecallbackclose→保存/ACK、active/unknown/input/pin/write debt、commitlost/closed未ACK/全copiesの正例は未完 |
| F | F01 email verification51行を差分≤25page/有限64turnで0へ、personal本文回収/WS本文保持/intent succeeded/debts0 | 単純51行page経路PASS。cursor再起動/応答不明/複数debt進行/全世代秘密の非空closure回収/最終EXISTS全対は未完。実object0のpurges.finish手動駆動なので媒体/object-deletes実回収証拠ではない |
| G | fresh正式0000–0044移行、G01誤fence intent拒否、G02復活/anchor削除/session追加拒否、FK/integrity/trigger数とaudit anchor、規定checks借用 | fresh基本guard PASS。既保存行のsix-copy移行、全CHECK/index/unique/mapper/directrepository・active auth/Drive正常影響/全入口コピー対は未完。空表移行を既データ保持へ転用0 |
| H | bounded tool正常終了/fixture close後readonly監査 | 同候補日本語UI/keyboard/mobile/pending/error/owner案内/cookie失効再読込は未実行。ID全体未完 |

A–Hのどの全IDにも今回だけで全条件が揃わないため、全ID完了PASSを付けない。11case合格と各限定枝は保持し、既done suiteの全面再演を要求しない。native use table0というauditは正例proof/閉鎖が試験されていない境界であり、native成功として読まない。

次local sliceの最小前提: 現E01–03はlegacy/fake負例だけ、native acquire/claim/active資源/callback終了未実装fixture。genuine acquireCredentialRuntimeのsame-newDB/fileidentity/namespace/privateownerと元native request identity・元transport/provider graphを使う必要がある。現在helperはDB3以外mkdir/socket/spawnをdenyし、NodeGoogleHttpはGoogle正式URL固定なので、同helperをそのまま再runしてwholeHTTP正例は取得できない。別採用scopeで有限newownership資源・actual request/response/socketとwhole callbackの閉鎖を実観測できるlocal経路を先に具体化する。fake factory/手製owner/register release・abort/PROMISE/SQLlabelをnativeproofに代用0。HTTP閉包をまだ取得しないlocal no-IO正例なら、その限界を明示し全HTTP受入から除く。

copy/unknownpurge sliceはcurrent11testにtarget/record/binding/attempt/receipt/object writer/readpin/refresh/PDF/ZIPの非空対がない。matching account intent/currentpersonal owner/exact已保存closure/ACK/inputclosed0を正常APIで用意できる前提を先に固定し、genuine proof取得前に文字列receipt/terminal推測で正例を作らない。存続WS/moved履歴の秘密なしshell、personal unknown outcome不改変の正規DELETE/FK順、closed未ACK/別intentはheld、正常67receipt drainの非退会容量はそれぞれ未検証を保持する。今回は次sliceの依存確認のみで実装/新case実行0、外部/音声0、報告固定後P5d読取停止。

## 476dd475 six-copy補正の独立source差分レビュー

2026-10-06T01:09:59.622371+00:00。六copy限定static PASS。公開commit476dd475b405573715589ea5b1e2f3c61b609d5f/親c2a3d45fを直接確認。0044 SQL358844B/600regular/nlink1 SHA `cedcab4dd315dab2f25ce5d691ebbf7b13a01f6a9a842dce5246329825605e33`、報告84rowsからmanifest `7b0647c36d2a454996278dd6bda6153d5e89b16c371243ee6ce817d90b684d9b`を直接再合成一致。全83source内容の再review/hash再scan0、規定workspacechecks/83不変は主固定報告借用。

drive_backup_records/targets/jobsとregeneration_source_bindingsの新retention/deletion_id/redaction_versionをusable/NULL/0、accounts新state/deletion_idをactive/NULL、note_purges新2列をNULLへ初期化する。0043/0044公開snapshotで各copyが全旧列14/13/19/16/6/18を元順のまま保持し、新宣言順と一致することを直接確認。literalの通常意味は既saved-state CHECKに整合し、旧行をretiredへ推測変換しない。

新literalだけを元identifierへmemory逆適用し、SQL旧hash14639cddを得る。そのhashを84manifestへ戻すと既受入前候補manifest5c4eb649へ一致。六SELECT以外のoldcolumns/順/79guards/その他DDL・DELETE例外等が変わらない根拠であり、新規移行成功は証明しない。commitのmigrations差分は0044/0044snapshot/journalだけ、旧0000–0043差分0。旧snapshot/journalの今回補正差分0はmanifest同値により継承。DB/SQLite実行0、failed4root全非操作。

今回初因の実statementIndexは欠測。新列参照の静的欠陥は解消したが、fresh/既存行移行・FK/trigger/native正例/legacycutover/全copies・P5d A–H完成をPASSへ補完しない。helper診断の限定preflightはP5d-test-runnerレビューへ記録。報告固定後source read停止。

# P5d 固定source独立レビュー

判定: 限定source preflightはpass、P5d-A–Hの機能受入は未成立。新たな重大実装欠陥は今回直接確認した範囲では特定していない。製品・実行工具への書込、DB/test/native/browser/runtime、新root、旧failed/private資材の操作は0。共有実行環境への操作を停止する。

## 固定根拠

基点c2a3d45f1097533c6344346aca303dc1d2aef368、P5d隔離treeの84exact pathsをphaseのSHA表へ直接照合し差0、sorted path/SHA manifest `5c4eb649d7b7b56f8aa4dd0fae40a9c730a72994525e0873a417b4553f188cb9` を自己再計算した。phase本文37273B/SHA `d87fedfd3dba4241b5c0ffa597a34be4503fd18c0d7b45314a7fa5ebf99cb533` の製品報告を使用。後続helper報告追補は製品候補と分ける。全workspace型・lint・format成功は担当報告の借用で、こちらの実行ではない。

## 個別範囲

| 条件 | 直接source照合 | 機能判断・限界 |
| --- | --- | --- |
| A | canonical email→同Tx cancel/accept、deleted anchor/authVersion CAS/session削除、active-only mapperとdeleted/missing identity、afterCommit通知例外の隔離 | source上整合。wrong email/通知throw/再登録/旧cookieの実証0 |
| B | repository acceptと0044 retirement/membershipのactive最後owner guard、workspaceRepository active role/count、現在personal ownerに限定したpurge | source上整合。同時退会/降格/move両順・WS削除fence・保存来歴のDB実証0 |
| C | publicNote/sharing/currentpersonal owner、job/LLM/source directclaim actor/currentnote/credentialowner/usable guards、Google/OR wholecallback内のcurrent actor/browser/version採用、retained source read/current | 読んだ公開入口は整合。全callsite/directbypass網羅・anonymous/artifact全入口の直接実証は未成立 |
| D | stored record discriminant→locatorより先にrecorder-unavailable、一覧/単件ID/sha/bytes維持、usable枝の正規型維持、Drive閉鎖receipt依存 | source上整合。同bundle/browser・全shellコピーのDB監査0 |
| E | genuine HTTPS factory capability/private WeakMap＋configured runtime acquire、claim前beginUse、whole callback終了とrequest/Incoming/socket実close後のみopaque closure、保存/同値read/ACK後private consume、commit不明proof保持 | source上整合。native正例/actual閉鎖/closed未ACK前任/ACKlost/取消交差の直接実証0。legacy no-use/origin missingはheldで未完成 |
| F | cursor25/debt/final EXISTS、currentpersonal intent束縛、unknown privacy purge最小補正、all-account Drive maintenance25 drainとnormal pruneのprivate receipt guard、67枠/未claim確定不存在のみ解放 | source上整合。51履歴停止再開・全世代copy/原本media回収・67正常容量race・commit不明再照合未実証 |
| G | 84path集合、0044/snapshot/journal新規、旧migration変更0、追加guard・正式型check借用 | 移行/FK/trigger正負DB・mapper全枝・全入口全copy監査未成立。legacy cutover未完成をfreshへ転用しない |
| H | 日本語email確認/pending/unknownロック/currentactor ticket・lastowner文言/44px、transport POST入力境界 | 実browser/keyboard/390px/旧cookie/reload・正常停止監査未成立 |

## 前回unknown個人purge不足の補正

`purgeRepository.privacyPurge/privacyInput/hasWriters/archiveJobs` と0044の `machine_regeneration_delete` / `machine_regenerations_source_delete` / `llm_conversions_source_delete` を直接確認。matching intent↔purge↔trash operation、deleted authVersion anchor、現在personal owner、running exact lease、terminal unknown+ownerclosed、同consumer/runtime/token/generationのclosed input receipt/memory0でのみunknown blockerを除外する。phase/response/quota/source attempt callerEnded/ACK、readpin/refresh/object writes/PDF/ZIP各既blockerは残る。unknown source_origin/outcomeの更新を省きconsumer→attempt→binding依存順に直接DELETEするため、前回の3DELETEのみでは詰まる具体不足はsource上解消した。WS/moved/ordinary unknownや他intentの推測解放を認める枝ではない。DB上の正負成立は未検証であり、JSON receipt自体を新しいopaque閉鎖能力とは扱わない。

legacy whole Node cutover capability不足・origin missing/unproven・unresolved Google global debtは安全なheld境界であり、永久保持をE/F/G完成と扱わない。報告のaccounts createdAt保持という記述はsourceのdeleted化でcreatedAt NULLとなる点と差がある（ID/deletionId/authVersion anchorは保持）。固定A–Hの必須ID anchorへ直ちに影響する欠陥とは判定せず、報告整合の追加観察に分ける。

確認時刻: 2026-10-05T23:57:00.165709+00:00。独立Verifier。
