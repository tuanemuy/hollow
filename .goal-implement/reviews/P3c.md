# P3c 独立検証

2026-09-11 09:29〜10:32 JSTに固定候補を検証した。P3c-A/Gは既知の通常読取障害が未解決で受入保留、残30項目は今回の変更枝に限定して合格とする。原障害の実装原因は未確定であり、再起動による回復を恒久修正とは扱わない。旧環境の37objects未復元はD01に残り、freshでの合格・保全と別である。

Manager判断が必要なのはA/Gのruntime未解決だけである。後述の誤URL `q=` による再発候補は撤回した。新しい機能・性能条件は加えていない。製品、依存、生成物、全体管理文書を変更せず、spec/spec-implement・goal API・外部サービスを使用していない。

## 対象と根拠の区分

- 正本: brief/design/plan、OR-01〜05/10/11と対応ED/IM/WS、CLAUDE。goal-implement/manager-loopに従い、実装と独立した検証を行った。
- 正式候補: [P3c実装報告](../phases/P3c.md)と84path manifestを全文照合。途中根拠と最終候補、規約のRSC streamingとclient mutation所有を区別した。
- `I` は自らのコードレビュー・実行・実UI。`B` は実装者または旧受入の適用可能な根拠。`U` は今回未確認。UI操作のsuccessフラグだけでなく、期待するDOM・保存・現在索引・画像を確認した。
- 独立資材は `/Users/hikaru/.local/share/hollow/verification/p3c-verifier-nQj0W1`。directory0700、regularfile0600、symlinkなし。DB/sidecar・session準備helper・manifest自身を除く71資材の集約は `34af6144c2a198e13c3d44ce4c0b26b03ea774c612fb1bceb656769d3747e07b`。sorted相対path + NUL + bytes + NUL。各hashは同rootの `manifest.json`。

### 固定識別

開始09:32:41.649と終了10:27:55.165 JSTで以下が一致。終了の製品unstaged/cached差分はいずれも0。Node22.22.3で本体・独立Node試験を実行した。

| 対象 | 識別子 |
| --- | --- |
| HEAD | `01b55c9294eb2bf77d41c06f5db7a67fb0d5dcd6` |
| source758 | `d5b6c18b205c05652e24bdfe31e24aefaa56a551ead03b26c2b4f59f9ac9a5aa` |
| pnpm-lock | `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` |
| server.node.js | `5ec816082846da47e69c3205dbe0df64ad2caaabe5d33f587ee89ac311d40d7e` |
| browse/searchSupervisor.mjs | `3e0a5058b4ef0479a34dbe5e130a5bd073ec922b8c86c75f5195111aeb1117df` |
| browse/searchQuery.mjs | `f2d66b8887ee1273d5396362adc6befd89a37998d1bc7f8bf76ee6d47050c275` |
| browse/noteProjection.mjs | `55a3ab762a09b7b22abaf091dd1f8f1a3334942a1eb549929cd2714778694133` |

sourceはdedup/sorted `git ls-files -co --exclude-standard -z`の実在regularfile。AGENTS symlink参照先を含み、`.goal-implement/`とignored生成物を除く。秘密ファイル・DB・keyをhashしていない。実装者55資材は開始途中09:56と終了10:30:37に全bytes/SHA/集約一致、集約 `c1f96d1081253438a2d422a9cde7ef201da95424f3fe478bf7f22bfc12e6e38d`。

## 項目別判定

「保留」は合格不可であり、元障害の原因特定・必要な局所修正と再確認を残す。未変更責務の全量再証明はしていない。

| ID | 判定 | 独立根拠・適用範囲・借用/未確認 |
| --- | --- | --- |
| P3c-A | 受入保留 | I: exact-before-LIMIT、現在scope/read Tx、同UoW projection、14DB対、追加6対、期限・abort・closeを確認。通常本体readの未解決事象R1あり。B: 632件移行/索引量・query plan。U: R1の終了分類/原因/再起動なしの復帰条件 |
| P3c-B | 合格 | I: 個人/WS、list/tile、初期50→62一意、title昇順・関連度、URL再訪、0件/空、追加失敗50保持→retry62、安全text/PNG。B: 6sort全ID照合・同値cursor。任意CSSの画像化は保証しない |
| P3c-C | 合格 | I: 混合東京＋cloud、語頭verifier/continuum、語中flare0、mark、安全抜粋、候補ArrowDown/Enter、条件適用、Ctrl+K/Escape/focus、旧成功/失敗/旧scope拒否。B: 合成composition、短語/無term。U: 実IME・Mac Meta専用実操作 |
| P3c-D | 合格 | I: STRASSE→Straße19、幅TAGとのAND10、実relation、foreign tagの名を出さず0＋解除、scope拒否。I/B: 頻度/同値cursor・版固定normalizer。P3dの作成/付与UIは未接続のまま |
| P3c-E | 合格 | I: Tokyo2024-03=5/NY=6、日初期3＋追加、390、月移動、URLzone優先。I: civilDate等105単体内。B: 初回zone異常/storage失敗と回復・6sortの復帰。native月入力fillの未到達はfixture限界 |
| P3c-F | 合格 | I: 自作HTML取込→本文/元名/形式/366B/原本hash、現title/日時/creator/private/backup事実、2322文字の長文/見出し移動、style保持、更新/復元。B: needs_ai事実表示。Drive/共有/export/移動を成功扱いしない |
| P3c-G | 受入保留 | I: 84pathの内向き依存/typed境界、RSC/Suspense/client所有、390/keyboard、実owner/outsider、固定build・保全・停止。B: 最終checks/670unit/256Node・移行clone。R1により通常runtimeの受入根拠が未完。D01は別未解決 |
| P1-B | 合格・変更枝のみ | I: 新HTML保存→stable/検索、save失敗最新backup→retry、画像only無題stable、親trash rollback。B: 不変V5/PM/無入力離脱/backup形式 |
| P1-C | 合格・変更枝のみ | I: detail/HTML preview、private iframe1、全文/TOC、48×32画像、上限投影単独対。B: sanitizer/CSP/全悪性HTML既受入 |
| P1-E | 合格・変更枝のみ | I: header/scope/icon20×20、1280/390、palette、標準RSCと通常TERM/restart。B: 最終checks/build。新search runtime未解決はA/Gへ限定し、既存shell修正の再発とはしない |
| P2a-B | 合格・変更枝のみ | I: 実HTML366B受付→原本→完了→本文/索引、原本同hash。B: 無変更MD/text/Office/PDF/media抽出・再起動保持 |
| P2a-E | 合格・変更枝のみ | I: conversion結果前projection/最終UoW確認、実HTMLjob成功。B: 全Nodeのjob/通知/期限/取消既存対、既存ticker物理責務 |
| P2a-F | 合格・変更枝のみ | I: projectionのsource/version guard、同Tx不一致/rollback。B: 全Node旧worker/lease/claim回帰。physical put/cleanup方式は無変更 |
| P2b-A | 合格・変更枝のみ | I: current PNG48×32/reload、actual document/refによるTOC、元ID非書換。B: SVG/video/Range/current-history認可の不変経路 |
| P2b-C | 合格・変更枝のみ | I: reference結果のprepared sourceと最終現権限/lease確認・同Tx index。B: 最終backend reference回帰。safeFetch/SSRF/同梱/CSS取得方式は不変 |
| P2b-D | 合格・変更枝のみ | I: original色rgb(49,90,120)、restore/reloadでも保持、control-only時index version追従のDB対。B: 初回判定/手動優先の旧契約 |
| P2c-1-A | 合格・変更枝のみ | I: prepared-source guard、同UoW rollback、save/no-op/style/restoreDB対、実restore新revision4。B: 20件/prune/pin数の既受入 |
| P2c-1-D | 合格・変更枝のみ | I: 選択版2preview取消→再選択→確認restore→current4/iframe1/reload、marker検索1→0。B: 復元認可/媒体pin異常対 |
| P2c-1-E | 合格・変更枝のみ | I: 非同期projection前後のcurrent actor/base条件、実save失敗/同ID最新退避→retry。B: 準備中失効/actor等Node、V5/4keyの不変方式 |
| P2c-1-F | 合格・変更枝のみ | I: fresh旧note/版/pin全列保全、現在projection同版、固定source/worker。B: 0018/19旧clone移行。D01復元成功とは扱わない |
| P2d-1-A | 合格・変更枝のみ | I: 親trash取消1、失敗rollback1、実trash0→undo同ID1、対象revision1のまま・versionだけ2/投影2。B: 期限/世代・対象job取消方式 |
| P2d-1-D | 合格・変更枝のみ | I: 親一覧から操作/通知/再read/invalidate、scope/追加read世代、390。B: 不変trash専用loader・V1有限read/receipt |
| P2d-2-C | 合格・変更枝のみ | I: browseDB削除時projection/FTS cascadeと同Txを確認。B: purge fence/physical回収/90日snapshotの既受入。fresh本体でphysical purgeを再試行していない |
| P2d-2-E | 合格・変更枝のみ | I: 新backup/旧業務行・objects・charge保全、最終source照合。B: clone/全Node/規定checks。旧環境の不足はD01 |
| P2d-2-FD | 合格・変更枝のみ | I: search取消→close→slot/stop、exit7後同executor正常、通常TERM→ESRCH。B: draining/exit0既知session確認、FD300/pool不変。R1はclose合流の原因未確認でFDリークとは断定しない |
| P3a-A | 合格・変更枝のみ | I: personal/WS chooser、現名/current icon/検索trigger/再訪。B: 作成slug/100字name入力・重複/代替候補の不変責務 |
| P3a-B | 合格・変更枝のみ | I: current scope、50page/追加、検索/旧応答/非member回復。I/B: 6sortと同時刻keyset。runtime R1の未確認はA/Gに残す |
| P3a-C | 合格・変更枝のみ | I: 新親一覧→新規HTML/媒体only/HTMLimport/undo、WS6とscope導線。B: WS保存先型/3mode/既存upload離脱guard |
| P3a-D | 合格・変更枝のみ | I: 別実signin outsiderのWS query/calendar/detailが名前/本文/cardsを返さず個人0へ回復、実DB現在権限。B: 実editor→viewer→除名の今回候補側fault。新role UI試験で代替したとはしない |
| P3a-F | 合格・変更枝のみ | I: creator/原本/現在usage、header、旧データ保全。I/B: unavailable/unknown型のDB対。scopeCapacityは同SQL抽出、5scope課算の変化が自己543Bのみ |
| P3b-2-A | 合格・変更枝のみ | I: freshWS icon自然32×32・20×20box、390/1280で現scope表示。B: 不変100CP/portrait修正・icon安全化/認可/競合 |
| P3b-2-D | 合格・変更枝のみ | I: 同bundle mobile画像自身確認、overflow0、keyboard/scope。B: icon worker/claim/quota・旧境界全方式 |

## I: 独立実行

### コードと既存試験

`browseReadSnapshot.ts`、`searchExecution.ts`、supervisor/query/projection worker、projection・query/tag/civilDate、保存/commit/import/reference/history、DI/boot/stop、ScopedNotesBoard/Palette/TagFilter/BrowseContext/NoteContentと境界schemaをレビューした。

- 同read transactionで現在session/verified account/scope/memberを確定し、active note・exact照合後にorder/keyset/LIMIT。未完成projectionはSEARCH_PREPARING。tag/月条件も同集合。FTSだけを認可や正確一致の代用にしていない。
- 書込は完全HTML投影をUoW外で準備し、最終source/title/version/現在権限と既存actor/lease条件を再確認。note/版/pin/現在参照/projectionは同Tx。control-onlyは再投影せず同内容のversionを追従する。
- query childは別client/read Tx/query_only、有限DTO。親queue16/active1、受付から3秒、cancel後もcloseまでslot保持、stopもclose待ち。projectionは既存admissionと3秒/800KiB境界、終了を待って解放。domain/applicationへNode APIを持ち込んでいない。
- 本体rootのmanagement glob除外1行は規定unit探索の責務。製品test/Node suiteを除外していない。

| 実行 | 日時JST・結果 |
| --- | --- |
| `pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/browse.integration.test.ts packages/core/src/adapters/node/__tests__/searchExecution.integration.test.ts --maxWorkers 1 --no-file-parallelism` | 09:33:36開始、13.18秒。18中17成功/投影上限1失敗。次行と分離 |
| 同runtime suiteの `--testNamePattern 'validates full HTML'` 単独 | 09:35:31開始、test1.68秒/全体2.67秒、1成功3skip。同製品3秒/同入力・制限不変更 |
| projection/civilDate/tagNormalizer/browseInput/model/requestState/TextPreview/BrowseErrorの8file | 09:36:43、105成功、1.93秒。最終670全量を独立実行したとはしない |
| `independent.ts`、隔離実DB | r3の6群成功。混合検索/除外text、NFKC原字highlight、SQL記号入力、commit/index rollback、missing準備中、trash復元の現集合 |
| 固定bundleの直接child | 別process・baseline派生cloneでpersonal61/1190ms、WS6/493ms、別空DB341ms。mainと同じDB接続条件を実証したものではない |
| `abnormal-runtime.ts` | 独立query child exit7後、同executor次正常成功。約112/262ms。異常終了後slot回復の代表対で、R1原因の特定ではない |

投影上限の初回失敗はPROJECTION_TIMEOUT、実3.091秒でありVitest既定5秒ではない。既存2suite直列/worker1で、browser補助待ちと重なったが負荷原因を確定していない。単独再実行は819200Bの完全投影、819201B拒否、pre-abortと次正常を成功。最初の失敗を消さず、全端末時間保証や期限拡張の根拠にしない。

### 実UIの主要観測

通常Chrome HTTP User-Agentを明示した専用sessionで確認した。navigator値だけでなくdocument requestのUAを照合。認証は承認済みprivate helperのfill後、通常submit。helper全文/資格情報/cookieは読取出力していない。最初の不正session名によるhelper exit2は引渡し条件不足であり、製品signin失敗ではない。

1. 一覧のpersonal62、初期50→scroll62一意、WS6。title昇順、tile、安全なtext/現在PNG。追加通信故障は50保持とalert、retry62。空outsider/条件0件の理由・解除あり。
2. `東京 cloud`混合、`verifier continuum`一意、`flare`語中0。markは元文字を保持。取得済旧query成功/失敗を保留し次0件→旧解放でも上書きなし。旧personal応答→WS6/query空/dialog0も維持。
3. 実tag STRASSE/Straße19と幅TAG AND10。foreign tagは利用不可chip/0件で外部名を出さず解除62。別actorのownerWS query/calendarと自己private detailを拒否、個人0へ回復。
4. Tokyo2024-03は5、NYは6。日初期3/他2展開、月変更、390横overflow0。calendar-mobile.pngを自分で確認した。
5. 新HTML noteを保存。実HTML366B取り込みは原本hash `8d165e17c3f34c97f6d44b5f2720ded20e10ebc6e6ff8debe757dcfe98512278`、HTTP200/366B一致、1成功/0失敗。現creator/private/元名/形式/原本保存/Drive未提供を表示。
6. HTML診断通信失敗では解析retryまで保存禁止。次にsave POSTだけ一度拒否し、最新marker/未保存表示/stable key退避を保持。retryで同ID保存・退避cleanup、検索marker1→候補ArrowDown/Enterでdetail。
7. 版2preview取消でcurrent marker保持。再選択→確認→復元で新current版4/iframe1/見出し2/markerなし。reload後色rgb(49,90,120)、正規queryのmarker0。DBはnote/projection version3同値、revision4件。
8. 親trash確認取消1、POST通信失敗rollback1、実trash0→通知undoで同ID1。対象revision1のまま、note/projection version2。物理削除なし。
9. 合成48×32青PNG177Bを新規白紙WYSへ選択。無入力titleで無題が自動保存、stable note/currentassetへ移行。完了/reloadも同asset、iframe1、画像48×32。media-only-mobile.pngを自分で見て正常表示を確認した。
10. 既存長文noteは編集せず2322文字の全文。390で見出しクリックによりiframe scroll7224、第二章と最後の本文を表示、overflow0。Ctrl+K→日本語入力→Escapeでdialog0、元の第二章TOCへfocus復帰。reading-mobile.pngを自分で確認。hiddenと名付けた見出しは既存sanitizerがhidden属性を除去した結果で、非表示成功とはしない。

`tile-desktop.png`、`calendar-mobile.png`、`search-runtime-failure.png`、`media-only-mobile.png`、`reading-mobile.png`、`workspace-mobile.png`は自らviewした。current-image-mobile.pngはheader/filterまでの画像で、below-foldの実画像の視認根拠とはしていない。媒体のdecode寸法は別DOM根拠。最終WS画像は自然32×32/box20×20と現scopeがheader内、390overflow0。

## R1: 正規readの初回未解決障害

対象P3c-A/G。09:43〜09:56の受領production68891では、正常Chrome UA・正当ownerで個人/既知WSの一覧が汎用読取error、通常retryでも回復しなかった。同条件paletteも候補を返せない。一方、認証/新規HTML保存/詳細/previewは正常だった。期待は現在認可された小さい通常集合の一覧/検索を利用できること。実際は通常再試行で利用へ戻れず、同bundleの通常restart後に回復した。

- main RSCはHTTP200/redacted error。kind/codeの直接取得はできず、単なるbot Flight欠落とも同一視できない。
- Manager調整による実装者の既知session50638一回pollはSystemError5件、`server.node.js:5807:27 →5912:70`。rawログは非出力。終了直前追加2件も同様。各digestと1対1対応・実要求回数は未確定。
- `5912`はclose callbackで `code===0 && now()<=deadline` が偽の場合の合流。少なくともこのstackはcloseに到達した根拠であり、**close未達・永久slot占有を実証したものではない**。exit非0/null、親deadline超過、両方を現ログから分離できない。driver原因をerror集約で隠すため、SQLITE文字列なしはSQL待ち除外にならない。
- 別process/cloneの直接child正常はmain環境での正常を代替しない。準備中索引の実DB専用errorも別である。
- 承認後09:56、自己browserを閉じて既知68891のcwd/freshDBを確認し通常TERM、ESRCHを独立確認。旧sessionのdraining=true/exit0はManager・実装者側pollの借用であり、Verifier自身の旧session取得はUnknownだった。
- 再buildなし、同Node22/dist/data/key path・列挙された同設定で新87071/session34443を起動。09:58から通常一覧62と後続の主要UIが成立。これを恒久fixとはしない。

[read-only原因案](../phases/P3c-runtime-recurrence-plan.md)68行を全文照合した。親子のtimeOrigin換算差、SQL/close待ち、Worker/IPC異常、親callback/queueの予算消費はいずれも仮説で未確定。tx.close例外時client.close未到達という条件付きコード観察も元障害の原因とは証明していない。

次の確認は元のA/G runtime契約に限定する。非秘密の要求対応/queue・fork・message・close elapsed、code/signal、子の固定終了分類などで不成功を分離し、必要な局所修正後、通常read・期限/取消→close→次正常・drainを確認する。全量UI/codec/FD再試験、無期限soak、3秒延長を新しい受入条件にしない。実装者へ返却後にManagerが委譲する。

### 撤回した再発候補・fixture失敗

10:20のrestore後helperは誤って `q=Revisionmarkerunique` を開いた。厳密URL schemaの正規名は`query`。誤URLはroute汎用error、retryでも同じ。10:20:59通常notes63、10:21:16正規query0/alert0が再起動なしで成功。10:21:50誤q再演は新runtime errorログを出していない。R1再発と通知した判断を訂正・撤回し、元JSONを保持した。最初の既知session新pollで得た5902のtyped error変換stackも、R1の5912 close分岐とは異なり、q要求との1対1対応は未確定。

その他の独立fixture修正は製品修正ではない。éの原文字期待、trash fixtureの必須列不足、初回module解決、chooser ready前、月nativefill未反映、`安全`検索が自己追加noteにも一致、HTML診断POSTと保存POSTの取り違え、SQLite空結果JSON parse、read-only WAL backupのコピー/immutable指定、集計列・worker相対pathの誤りを区別した。失敗資材は残し、最後のpreservation/worker-identityを正本とした。HTML変更時のCM自動fillは重複段落を含む入力となったが、期待した全文置換の試験とはせず、marker保存/復元による差分と実DB一致を判定した。未変更CMの新不具合とは断定しない。

## B/U: 根拠の適用と未確認

最終670unit/規定checks/buildは実装者根拠。backend256Nodeと後続関連18は最終backendへ適用可能とコード差分/正式報告で照合した。独立では上記105unit/18対象/追加対だけを実行し、全256・670を再実行したとはしない。先行codec/SSRF/PM/20版/pin/physical claim/FD300/icon backendの不変枝は既受入を保持する。

HeadlessChrome UAのisbot/allReady経路でlate Flightが欠落する既知追加観察は未解消。採用された通常Chrome HTTP条件でのUI成功と分ける。実OS IME/nativepaste/OSdrop、Mac専用Meta入力、実外部mail/Drive/LLM、P3dタグ作成/移動・P3e一括・P4共有/exportは未実行/未接続。未完成索引は隔離DB SEARCH_PREPARINGと表示単体・本体汎用error時に完成0を出さない組合せであり、fresh索引欠落専用文言の実UIを実施していない。受入外の全platform/全computedCSS保証を追加していない。

## 保全・終了・引渡し

fresh rootは `/Users/hikaru/.local/share/hollow/verification/p3c-20260911-dyHGjx`。旧recovery/旧tmp/旧DB/旧storage/旧資格情報を操作・再hashしていない。正式keyはpath参照だけで値/値hash未取得。新online start.dbとend.db/final.dbをprivate証跡rootへ保持し、比較はコピーで行った。

10:27:21の独立SQLは`sqlite_%`を除いた52表（`__drizzle_migrations`、FTS仮想/内部表を含む）を対象に旧全行EXCEPTを比較した。旧業務行と認証・note/原本/版/pin/projectionの差0。新note作成・復元に伴いFTS shadowのdata/idx segmentのみ旧行差13/10がある。物理segment再構成を業務正本破壊とは扱わず、旧68projection/docsize全行同値、独立検索/復元の意味結果と分けて記録する。10:30:37の最終read終了前後は全52表差0。

| 集合 | 開始 → 終了 | 変化の根拠 |
| --- | --- | --- |
| notes / assets / originals | 68/1/2 → 71/2/3 | 新規HTML note、HTMLimport、画像onlyの自己3noteだけ |
| revisions / projections | 73/68 →79/71 | 自己1＋import4＋媒体1版、現在投影は全71 |
| tags / relations / job snapshots | 8/133/0 →同値 | P3d操作なし |
| 物理objects | 4/2116B →6/2659B | 旧4全bytes/SHA一致、366B原本＋177B画像。物理削除0 |
| 5scope charge | 個人1600→2143B、ownerWS516B、他3=0 | 自己追加543Bだけ、全既存object保持 |
| active notes / trashed notes | 71 / 0 | 自己softtrashはundo済み |
| active writer / 終了済writer行 | 0 / 9 | active=0をnote数と混同しない |
| conversion/reference active・display pending | 0 / 0 / 0 | conversion3件は全succeeded、全71display初期化complete |
| FK / integrity | 0 / ok | final copied backup |

自己対象ID: HTML `01a08df1-e37f-75e8-b332-6cd8b2bfa405`、import `01a08e02-d607-7447-879a-ea919947514c`、media `01a08e10-51cb-7738-b7fd-b38fe3a16a91`。新asset `01a08e10-470c-779e-a087-2b3f13f2a92d`。全て保持し、既存68note/旧objectsを削除・編集テストへ使用していない。通常signinのsession追加2も旧行変更なし。

own owner browserは10:28:42.551〜10:30:37.008の間にclose成功、outsiderと誤名の自己sessionはそれ以前にclose済み。全fetch wrapper/route hookを解除、自己listenerなし、非production exec/helper/testは全終了。新subagentなし。globalcleanupを行っていない。

production **PID87071 / session34443**、Node22.22.3、cwd apps/web、127.0.0.1:3000を維持。10:30:37で既知PID生存/HTTP200。fresh DB `file:<fresh>/app.db`、objects/mailbox/private key pathは変わらない。再起動は必要がなければ行わず、次担当へ通常停止手順ごと渡す。secretを含む環境dump・ログ/HARは作っていない。

2026-09-11T10:36:50+09:00の実時計確認後、本書の最終追記をもって文書・git/hashを含め全自己操作を停止した。A/Gの限定原因調査/修正と再検証の別委譲を待つ。D01は未解決のままである。
