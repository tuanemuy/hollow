# P5b-3a0-E pure 状態契約の静的補助

## 適用範囲

2026-09-29。固定 [E](../plan.md#p5b-3a0-全ページpdf音声の提供前gate)、[採用 design](../design.md#p5b-3a0-全ページpdf音声の提供前gate)、brief の音声未成立、[再開案の01:34節](P5b-3a0.md#0134-再開申告実行許可待ち)、[元提案](P5b-3-proposal.md)、[STT静的報告](P5b-3a0-stt-contract.md)に対する補助案。製品基点 f6ecdc515445bd8ae7b34dccd9c1cbdf73118699 は主/Manager の通知と管理文書から借用し、本補助で git/hash/実環境照合をしていない。

新規作成は本書のみ。主の新 prototype/runtime/資料/旧 proof を読取・実行・編集せず、現在の公開製品コードだけを静的照合した。Node/test/type/build/DB/browser/外部調査は 0。以下は主の型付き pure probe の設計材料であり、製品実装・DB原子性・DDL・独立受入を証明しない。新しい条件や製品値は採用していない。

## 先に固定する判定軸

1. `normal-execution` と `recovery` を入力で分離する。通常稼働中の未発注次 stage と、旧 owner 終了後の新発注は別。回復分岐の外部送信出力は常に 0。
2. 所有は `live / unproven / closed-proven` を分ける。pure の `closed-proven` は caller が渡す前提であり、boolean を作ること自体が OS/FD/HTTP 終了証明ではない。
3. 現在認可・固定原本/版・epoch・取消・期限を合わせた current 判定と、再準備の成功/identity一致を別にする。
4. response 完了は「既存 rows が全部 response」ではなく「固定 required 集合との双方向完全一致」。件数一致だけ、空集合の every、重複 ordinal、別 job/stage の応答で満たさない。
5. 計数は dispatch 単位の直近エラーでなく job 全体から判定する。最初の durable intent で同じ予約を 1 回だけ消費し、返却可否は全 dispatch と全所有を照合する。

これらを別々の loose boolean にして不可能な組合せを正常に扱わない。pure probe では validated plan/state の判別 union と、そこへ至る拒否検査を分ける。

## Source / prepared / required 集合

| 枝 | 不変又は新候補の意味 | required 集合 |
| --- | --- | --- |
| 旧 text/html/markdown | NULL保存又は明示recipe1、prompt1、text-blocks。旧hash/wire不変 | 既 prepared-segment ordinal |
| 旧 DOCX/XLSX/PPTX/strict PDF | recipe2/prompt1、全文字unit/page coverage、text-blocks。V2正常出力不変 | 既 prepared-segment ordinal |
| 旧単画像 | image/recipe3/prompt2、single-raster、frame1/fullPixels、ordinal0 | prepared-raster 0だけ |
| 新全頁 PDF 候補 | source.formatはpdfのまま別 preparation contract/recipe。pdf-pagesと別input identity、描画policy/renderer/全page manifest | 初期候補は各頁1dispatch。ページ群にするなら群の頁範囲も全頁と完全一致 |
| 新音声候補 | audioの別contract、STT modelと本文modelを受理時固定。audio-chunk/transcript と text-block/chatを別型にする | transcribeの全区間＋structureの全segment。STT完了時に後段集合を固定するまで全requiredは未完成 |

PDF manifest は元identity、recipe/prompt、総頁数、連続 page ordinal、page box/rotation、policy、寸法、raster bytes/hash、順序を束縛する。最終頁まで準備成功後に seal し、送信前の逐次再描画も各hashを照合する。白紙も初期 gate では含め、画像recipe3のordinal0/fullPixelsへ偽装しない。

recipe番号を今確定せず、新枝は probe 内だけの識別子にする。PDF32頁/144dpi等は主の有限 gate 候補であって製品採用値ではない。pure の数値判定は明示された gate policy を引数とし、既text16segmentや画像4096/16M/8MiB/12MiBの上限を書き換えない。

音声 plan の候補 union は次の三状態で足りる。

- `transcribing`: 原本/全sample manifest、STT required集合、固定2model。structure集合はまだ存在せず、complete判定不可。
- `structuring`: 全STT応答のidentity/順序に束縛した transcript 集合hashと、後段 required集合を一度だけ追加固定。以後その件数/入力hashを縮小変更しない。
- `responses-complete`: 両集合と全responseの一致が成立。これだけを conversion の response-ready/finalizing と組み合わせる。

STTだけ全応答の時点に `structure: []` を置いて「全requiredを満たした」としてはならない。後段不要という業務成功枝を今追加しない。空transcriptは無音の証明ではなく、全区間empty時の失敗表示は正式判断に残す。保存応答を未信頼plain textとして扱い、HTML/finish-stopへcastしない。

## 現コードの境界と最小変更集合

| 実path/責務 | 現在の制約 | 候補差 |
| --- | --- | --- |
| [domain/llm/entity.ts](../../packages/core/src/domain/llm/entity.ts) | sourceは旧8形式、recipe1/2/3。modelId一つ。prepared-raster ordinal0。LlmResponseはcontent＋finish:stop | PDFの別contract/pages identity。音声は2model/stage/別response。旧union枝とhash不変 |
| [application/llm/ports.ts](../../packages/core/src/application/llm/ports.ts) | text-blocks/single-raster、chat-text/chat-image | PDF pagesと有限逐次供給の責務。音声専用準備/STT profile/response。STT privacy未成立なので製品送信port接続はしない |
| [application/llm/request.ts](../../packages/core/src/application/llm/request.ts) | pdfは常に文書recipe2へ固定、audio未提供 | 新PDF modeを受理時に固定する別contract。旧失敗jobを新recipeへ付替えない。音声は後続 |
| [libsql/llmSchema.ts](../../packages/core/src/adapters/libsql/llmSchema.ts) | sourceBytes 1〜52,428,800、format/recipe/prompt CHECK、deadline+30分、responseBudget0/2MiB。dispatch PK(job,ordinal)、ordinal0..15、非空content<=65,536B | PDFの別合法組合せと必要ordinal範囲。音声はformat別原本上限、stage一意性/応答shape/2model/plan。具体DDL/値は未採用 |
| [llmRepository.ts](../../packages/core/src/adapters/libsql/repositories/llmRepository.ts) conversion/dispatch | recipeからinputkindを復元。image以外はprepared-segment。非空contentだけhydrateしfinish:stopを付与。listはordinal順 | PDF identityを明示復元。音声はstageを含むkey/orderとresponse判別、空textとchat非空を分離 |
| [0034](../../packages/core/src/adapters/libsql/migrations/0034_normal_thunderbolts.sql) dispatch identity trigger | job/id/ordinal/input hash/owner固定。prepared→intent、intent→response/unknown/not-sent、response→scrubbedだけ | 新stage/key/inputtypeも不変条件に含める候補。既rowの意味を変更しない |
| [0036](../../packages/core/src/adapters/libsql/migrations/0036_llm_image_preparation.sql) conversion/intent/pin/release trigger | recipe/model/原本等immutable、active/unknownの付替え禁止。intentは現在owner/epoch/phase/quota/予算を照合。回収/返却は終端所有条件付き | 新branch/2model/plan transitionを同じguardへ接続する候補。stage追加で現在fenceを迂回しない |
| [worker.ts](../../packages/core/src/application/llm/worker.ts) inputs/generation/process/recoverLlm | 全segment列挙、一model、最後のresponseでresponse-ready。回復時に件数/kind/ordinal/hash一致、全応答後処理だけ | 新PDFの全page集合照合。音声は全STT後に後段seal、全stage完了後だけresponse-ready |
| [current.ts](../../packages/core/src/application/llm/current.ts) | 現actor/note/lifecycle/version/original/owner/epoch/取消/期限を各工程で再照合 | predicate意味は再用。新stage境界と最終commitにも必要 |

最初のPDF縦接続はPDF差だけでよく、未成立音声のtable/実adapterまで先行実装しない。音声将来案は同conversion/quota内のstage拡張を推奨し、新STT job/予約の二重正本を作らない。PKをstage込みへ変える案も含め、保存の一意性/旧row互換は正式担当の新DDL提案で決める。0036の一表再構築許可をdispatchや他表へ自動拡張しない。

新stageのplan/hash/モデルをimmutable化し、legacy rowは生成stageとして旧値のまま解釈できることが必要。旧NULL recipe1/旧2/旧3をbackfillで改変しない。旧制約を32頁に合わせて一律緩める案ではない。budget/deadlineが成立しなければ明示差案へ戻し、本文や原本を切り詰めない。

## 状態表: 回復は常に外部送信0

以下は「旧owner終了証明後の回復」又は「現在実行の失敗確定」の判断材料。閉鎖未証明行が先に優先される。`postprocess` は commit許可そのものではなく、現在条件を最終Txで再確認する有限後処理への適格性だけ。

| 状態 | 応答採用/後処理 | 旧本文・版 | 計数/返却 |
| --- | --- | --- | --- |
| intent前、required計画のみ/全prepared | 後処理なし、回復から新発注なし | 保持 | reservedを返せるのは終端・全未送信・全実close・送信権限失効が成立した後だけ。消費0 |
| durable intent済み、全dispatchが正当not-sent又はprepared | 新発注なし、失敗/取消 | 保持 | intent時の消費1を返却可能。ただし全job未送信の証明と上記終端条件が必要 |
| intent済み、応答なし/通信・DB ACK不明 | 自動再送0、unknown又は安全終端 | 保持 | 消費1維持。unknownを返却根拠にしない |
| PDF一部応答又はSTT一部応答 | 残りの自動発注0、部分本文採用0 | 保持 | 消費1維持。最後のnot-sentだけで返却不可 |
| STTだけ全応答、後段未seal/未発注 | 全stage完了ではない。新chat自動発注0 | 保持 | 消費1維持 |
| 全required plan固定、全stage応答完全一致、current有効、再準備一致 | postprocess適格。sanitize/最終current照合/既commitだけ | 成功時だけ本文を一度採用。それまでは保持 | 同じ消費1。二重consume/新予約なし |
| 全応答でもcurrent失効/取消/期限超過 | postprocess不適格、遅い結果非採用 | 保持 | 先行送信ありなら消費1維持。送信前失効は全未送信条件で返却可能 |
| 全応答だが再準備成功後hash/kind/ordinal/範囲不一致 | SOURCE_CHANGED等の適切な安全失敗、自動再送0 | 保持 | 消費1維持 |
| 再準備自体がCORRUPT/未対応等で失敗 | 実際の有限codeを保持。hash比較に到達したと偽らない | 保持 | 既応答ありなら消費1維持。発注前なら全未送信条件で返却可能 |
| owner/FD/child/pipe/HTTP実closeが不明 | 応答があっても所有保持、後処理/正常解放を許可しない | 未採用本文を採用しない | 予約又は消費と必要pin/予算を保持。時間超過だけで返却0 |
| 既にcommit済みterminal succeeded/closed、受付ACKだけ不明 | 同receiptを返す。新発注/再commitなし | 保存済み成功本文を維持。旧本文へ自動巻戻ししない | 消費1維持 |

current失効は `currentLlmSource` の直近error.deliveryがnot-sentでも、job全体の未送信を意味しない。`LibsqlLlmQuotaRepository.releaseUnsent` は全dispatchに response/unknown/intent/scrubbed がないことと、terminal/owner非active・非unknownを検査する。返却時はreserved又はconsumedを一度だけ減らすため、二回目の返却要求は非作用にする。

正常稼働中の STT全応答→構造化初回intent は将来の通常処理候補だが、回復処理が同状態を新ownerで進めることは禁止する。これを `mode` の区別なしの「次stage」関数で共用しない。現在のprivacy条件では通常音声送信も許可しない。

## 主の pure probe へ渡す正負候補

以下は代表セット案であり、新製品受入条件の追加や実施件数ではない。値は小synthetic、出力はenum/boolean/countに限定できる。

| 群 | 正例 | 対となる負例 |
| --- | --- | --- |
| legacy型 | 旧text1/doc2/image3の入力kind/ordinalを保持 | image3 ordinal1、pdf-pagesをdoc2/image3へ偽装を拒否 |
| PDF全頁 | 総頁3・ordinal0,1,2をseal、全responseで適格 | 最終頁欠落、重複0,0,2、範囲重複、別manifest同件数は拒否 |
| 再描画 | 全page hashが一致、順序も固定 | 一頁差分/順序交換/recipe・policy差分は不適格、再送0 |
| stage衝突 | transcribe0とstructure0を別keyで識別 | stageなしordinalだけの重複排除で一方を消す実装を拒否 |
| STTのみ | transcribing全responseでも全required未完成 | structureを空配列にしてevery成功、phaseだけ偽response-readyにした入力を拒否 |
| 音声完全集合 | seal済STT2＋structure1が同2model/入力hashで一致 | 別model/別job/response型違い・余剰応答・欠落を拒否 |
| 空transcript | transcriptとしてemptyを区別して表現可能 | emptyを無音証明/全本文成功/chat finish-stopに変換しない |
| 計数 | 全prepared/正当not-sent＋実close＋terminalだけ返却適格 | 先行response1＋後段not-sent、unknown1、close不明を返却不可 |
| current | 全応答/current/再準備一致でpostprocess適格 | actor失権、note版、原本、epoch、取消、期限の各単独差で不適格 |
| 所有優先 | 真の終了前提ありで閉鎖後判定へ | 全応答だがunprovenなら枠/pin保持、timeoutをclosedへ変換不可 |
| 失敗分類 | hash差はidentity不一致として扱う | prepare CORRUPTをSOURCE_CHANGEDへ偽装しない、再送0 |
| ACK/冪等 | terminal成功receipt再照会で再commit0/消費1 | ACK不明で新job/新発注/旧本文巻戻しをしない |

正負を同一成功関数だけに通す自己充足テストにせず、required集合の検証失敗と、合法状態からのeffect判定を別assertにする。空集合のevery、length一致だけ、最後のエラーだけを見る実装は反例として有用。invalid snapshot をnormal failureとして勝手に修復せず、pure入力拒否と業務結果を分ける。

probe の `externalSends:0` は関数が選ぶeffectの値であり、本番通信/課金やDB rollbackの実証ではない。`closed-proven` fixtureは物理closeを証明せず、Bの実所有根拠と組み合わせる。migration/CAS/旧全値やstageの原子sealは将来DB対が必要であり、本書から合格にしない。

## 未決と返却

PDF32頁等はgate候補のまま。新recipe/prompt番号、PDF grouping、正式DDL/PK、audio profile/response空値方針、全量予算はManager判断へ残す。音声は既Cのdata_collection/allow_fallbacks非適用・require_parameters未確認により現方式未成立。追加公開調査・privacy緩和・別方式採用なし。

主へは、全job未送信の集約判定、全required双方向一致、STTのみをcompleteにしない、CORRUPTとhash不一致の区分を先に共有した。本文は全read/write/run停止前にEOFまで再読する。専有は本書のみ、製品/管理正本/既report/prototype/旧proof変更0、実行環境操作0、自己資源生成0、未回収exec0で所有を返却する。
