# P5b-2b1 最終差案 — Office・限定文字PDFの製品縦接続

## 採用を求める差

2026-09-28、受入commit `3650ec61c45c4ad4ab0cf62b96c8dba08e70a34c` の静的読取だけによる提案。製品編集・migration作成・tests/build・DB/runtime/browser・新fixture・外部送信は0。本書以外は非変更。最新J/final08:02基点を維持し、その保護領域には触れていない。

採用済み2b0は再説明せず、[6gate結果](../reviews/P5b-2b0.md)、[PDF V1受入](../reviews/P5b-2b0-v1.md)、[旧提案](P5b-2b-proposal.md)を参照する。今回提供するのはDOCX/XLSX/PPTXとstrict gateを通る文字PDF。単画像は次phase、画像/混在/順序不明PDFと音声はP5b-3の必須残件。2b全体・全文媒体対応の完了とはしない。

Manager判断は、(a)下記の一正本C案を製品migration0035だけへ例外許可、(b)文書recipe2/prompt1と旧NULL互換、(c)有限notice/失敗の既保存投影、(d)10条件案と最小fixture。採用・固定委譲前に実装を開始しない。

## 1. 型・版・責務の確定案

domainは原本identityと不変の版組合せ、applicationは準備/生成port・coverage/notice/用途DTO、Node adapterはXML/PDF/HTML化・hash/HTTP、libSQLはNULL保存形とCAS、presentationは固定日本語説明を担当する。HTTP JSONやPDF.js型を内向きへ漏らさない。

```ts
type LegacyFormat = 'text' | 'html' | 'markdown';
type DocumentFormat = 'docx' | 'xlsx' | 'pptx' | 'pdf';
type Source<F> = { kind:'original'; originalId:string; sha256:string; bytes:number; format:F };
type SourceContract =
  | { source:Source<LegacyFormat>; preparationVersion:1; promptVersion:1 }
  | { source:Source<DocumentFormat>; preparationVersion:2; promptVersion:1 };
// LlmConversion = 既共通フィールド & SourceContract。format/recipeを独立unionにしない。
type PreparedText =
  | { kind:'text-blocks'; preparationVersion:1; segments:readonly LegacySegment[];
      blocks:number; notices:readonly LegacyNotice[]; media:readonly ExpectedMedia[] }
  | { kind:'text-blocks'; preparationVersion:2; identity:DocumentPreparationIdentity;
      coverage:DocumentCoverage; segments:readonly DocumentSegment[];
      blocks:number; notices:readonly DocumentNotice[]; media:readonly [] };
type DocumentPreparationIdentity = { kind:'prepared-document'; preparationVersion:2; sha256:string };
type DocumentSegment = { identity:LlmInputIdentity; html:string; firstBlock:number; blockCount:number };
type GenerateText = ExistingGenerateCommon & {
  kind:'chat-text'; promptVersion:1; model:TextModelProfile;
  input:{ kind:'text-block'; html:string; ordinal:number; segments:number }
};
```

ここでLegacySegment/ExpectedMedia/ExistingGenerateCommon/TextModelProfileは既型の責務を表す省略名であり、実装時に既型を再利用する。新設するDocumentCoverageは `{kind:'office-text',format:'docx'|'xlsx'|'pptx',textComplete:true,units:readonly UnitCoverage[],uninterpretedMedia:number}` 又は `{kind:'pdf-text',pages:readonly {ordinal:number,class:'text-covered'|'proven-blank',firstBlock:number,blockCount:number}[]}`。UnitCoverageは `{ordinal:number,kind:'body'|'header'|'footer'|'footnote'|'endnote'|'comment'|'sheet'|'slide'|'speaker-notes',firstBlock:number,blockCount:number}`。原本側の全列挙inventoryと相互照合した結果だけを構築し、空白頁/hidden単位も除外しない。本文の自由文字を位置識別子に使わない。

prepare入力もSourceContractとbytesを束縛し、media mapは旧HTML/MD側だけ許す。DocumentSegmentの形は旧segmentと同じだがhash算法はrecipeで区別する。文書は既settings.text/model.kind='chat-text'を使い、既profile.inspectのsignature・catalog/fallback・15分live/custom・既定profileを変更しない。GenerateTextの包みをadapterで旧messagesへ解く。結果LlmResponse、resultProcessor/sanitizer/本文commitは共通。

**画像へ温存する形（今回コード/DDLに追加しない）**: 将来のPrepared unionは上のtext-blocksと `{kind:'single-raster',preparationVersion:3,identity:{kind:'prepared-raster',sha256:string},png:{mime:'image/png',bytes:Uint8Array,width:number,height:number},sourceDimensions:{width:number,height:number},budget:'resource-only'}`。Generate unionの画像枝は `{kind:'chat-image',model:ImageModelProfile,input:SingleRaster,...}` とし、ImageModelProfileはimage入力/text出力/chat/max_tokens・出典/版/鮮度・resource-onlyを必須にする。recipe3の番号/詳細は次phaseで固定し、今は予約だけ。未実装raster枝、throw-only adapter、画像を通すCHECK、常にfalseの能力を製品へ置かない。

### preparationとpromptを独立させる

| 保存/要求 | 読取・実行 | 書込 |
| --- | --- | --- |
| 旧3形式 / preparation=NULL / prompt1 | effective recipe1。旧Worker出力・SHA256(html)・既media/segment順をそのまま使う | 既rowのNULLを保持。更新時にNULL→1へbackfillしない |
| 旧3形式 / preparation=1 / prompt1 | NULLと同じrecipe1 | 新規2b1受付の旧形式は明示1。旧rowへの版変更ではない |
| 文書4形式 / preparation=2 / prompt1 | 新文書Worker/決定的構造化/hash2 | 新規受付だけ明示2 |
| その他（文書NULL/1、旧形式2、未知版、prompt≠1） | mapper・受付で拒否、送信0 | DB CHECKも拒否 |

現在repository.replaceはencode全列をSETする。正式版ではinsert用encodeにpreparationVersionを含め、replace用SETからこの不変列だけを除く。WHEREへ `coalesce(preparation_version,1)=expected effective version` を足し、既version CAS・既全immutable guardを維持する。新source組合せもmapperで検査。recipeを変更したvalueで旧rowを上書き/黙って無視して成功にはせずCAS不成立にする。NULL由来というDB固有flagをapplication/domainへ露出させない。

prompt1を維持できる根拠は現 `node/llm/generator.ts` のsystem文字列が「全source・元順序・見出し/table/codeを保ちHTMLのみ返す」という形式非依存指示で、user payloadもsegment/segments/instruction/sourceHtmlだけだからである。文書構造は検証済みsourceHtmlのデータとして渡し、system文言、JSON key/ordinal規則、privacy/fallback/endpoint/max_tokens/context照合を変えない。同値入力に対するrequest body byte一致の契約対を置く。文書だけの新system指示やnotice遵守指示を足すならprompt2が必要であり、無言でprompt1へ混ぜずManagerへ戻す。

recipe2は文書抽出規則・PDF left-column-v1/operator policy・構造serialization・単位順・notice意味・分割/hash算法の版。`manifest = JSON.stringify(['hollow.prepare',2,format,sourceSha256,orderedCoverage,orderedNotices,segments.map([ordinal,firstBlock,blockCount,html])])` を固定順でUTF-8 SHA256。各dispatch input hashは `SHA256(JSON.stringify(['hollow.segment',2,manifestHash,ordinal,firstBlock,blockCount,html]))`。循環hashなし、全体notice/網羅性/segmentの変更も既応答再利用を拒否する。protocol境界で親が再計算する。raw hash/本文をlogしない。V1はこの新算法へ変換しない。保存済旧全responseの後処理はV1を再準備し既hash照合、intent-onlyは従来どおり非再発注。

## 2. 正式0035 C案と移行前gate

新番号案は `0035_llm_document_preparation.sql`、journal idx35（旧0〜34/35行を保持し36行へ）と新snapshot1件。既0034以下・既snapshot/ledger hashの改変0。対象はllm_conversionsだけ、全旧33列を明示INSERT SELECTし値/NULL/日時/owner/予算/応答参照をそのまま保持、nullable preparation_version1列追加。元表名を正本のままにし二重repository/format偽装を作らない。

CHECKの追加は `(source_format IN ('text','html','markdown') AND (preparation_version IS NULL OR preparation_version=1)) OR (source_format IN ('docx','xlsx','pptx','pdf') AND preparation_version IS NOT NULL AND preparation_version=2)`、既prompt_version=1制約を維持する。SQL NULL三値による文書NULL通過をIS NOT NULLで閉じる。image/未知版は不可。immutableには `NEW.preparation_version IS NOT OLD.preparation_version` を加える。明示1→NULLも禁止。

同Txで復元する影響5triggerはconversion_identity/conversion_pin/dispatch_intent/dispatch_pin/reservation_release、4indexはconversion_command/active_note/admission/phase（実名prefix llm_を維持）。identityへの版不変追加以外、条件本文/一意性/関連FK・他triggerは不変更。固定libSQL migrateの専用接続・Tx外FK OFF→Tx内copy/drop/rename/復元→末尾FK assertion→ledger→commit→FK ONを使う。台帳だけ別commit、writable_schema、所有一括closed、稼働中適用は禁止。

製品の正式SQLで新syntheticを作り、正常/旧DROP後SQL故障/末尾FK違反の3対を取り直す。旧33列全値・他全表値/PK/FK/5trigger/4index/ledger、失敗時schemaまで全rollback、FK再有効を比較。旧NULL/明示1のrepository hydration/CASとraw列保持、新4形式recipe2 hydrate/CAS、組合せ負対、unknown/予算pin・intent-only再送0・旧全response後処理commit・本文undo/quota不変を実usecaseへ接続する。2b0の44/20は方法の成立根拠であり正式SQL/新mapper成功の代用ではない。最新Jからの停止backup→更なるaudit copy→clone3対→全旧比較後、通常fresh適用は別Manager許可を待つ。電源断/全OS耐久を主張しない。

## 3. 新文書Workerと表示への接続

`NodeLlmSourcePreparer`をrecipe dispatcherにし、V1の既sourceWorkerと親検証/hashは不変更分岐として維持。V2専用documentPreparer/Workerとpure office/pdf modulesを新設し、2b0の採用規則を型付き境界/所有へ移植する。既import/parserWorker・DocumentExtractorを直結/変更しない。新Workerのmessage後に終了したと見なさず、成功/異常/abort/deadlineで実exit＋stdout/stderr終了まで待ち、owned source FD closeと合わせて返す。未終了は厳格な既ownership unknown→pin/global/account枠保持。普通のtimeoutをclosed証明にしない。

全文package/全頁を先に検査し、safe HTML blocksへ変換する。DOCXは文書/附属単位・見出し/list/table、XLSXは全sheet順・座標/結合/保存formula結果、PPTXはslide順/group/table/notes。未知文字bearing part/壊れたrelationship/継承文字を取りこぼす構造は拒否。PDFは全頁strict gate、1頁でもneeds-visual/indeterminateなら文書全体を拒否し、残頁だけ送らない。全白紙は生成すべき文字なしの明示失敗・送信0。table/pre/codeは不可分、単体64KiB超を拒否。安全化後のfirstBlock/blockCount/ordinalが連続で全網羅することを親で照合する。

原本50MiB、XML実展開128MiB/XML単体16MiB/4096entry/depth128、PDF/slide200・sheet100・cell200000、source30秒/heap256MiB、64KiB×16、本文800KiBを別々に維持する。heapはRSS硬保証でない。固定local CMap/font/WASMのみ、network/remote template/外部URL/OLE/macro実行0。package全走査の資源上限は超過前失敗。payload最大負荷や任意OOXML全面適合へ拡張しない。

成功noticeは `OFFICE_MEDIA_UNINTERPRETED` / `OFFICE_HIDDEN_CONTENT_INCLUDED` の有限code＋件数/単位ordinal（最大200件、位置は数値/列挙だけ）にする。固定messageはapplicationで既imports.replaceNoticesへ保存、LLM応答をnotice正本にしない。OfficeのtextComplete=trueでも非text未解釈があればOriginal.coverage='partial'、文字/構造と非text全て対象内ならcomplete。成功jobとpartial noticeを失敗/unknownへ混同しない。PDF strict成功はcomplete。旧V1のcomplete投影/notice文字列は保持。現workerの成功時coverage='complete'固定だけをV2で分岐する。

失敗は既LlmFailureへ有限 `LLM_DOCUMENT_ENCRYPTED` / `LLM_DOCUMENT_CORRUPT` / `LLM_DOCUMENT_UNSUPPORTED` / `LLM_DOCUMENT_NO_TEXT` / `LLM_PDF_VISUAL_REQUIRED` / `LLM_PDF_ORDER_UNPROVEN` を追加し、resource/modelは既code。厳格brand/code guardとJB/ノートの固定表示へ接続する。raw parser error/part path/XML本文/鍵をDTOへ出さない。失敗で旧本文/版/原本を保ち、全segment未送信＋実closeの既証明がある場合だけ予約返却する。

受付は有効連携＋AI指定のtext/文書4形式をLLMへ。受付時から非連携/未構成・AI不使用は従来機械（PDFの文字なし等は旧方式どおり）。通常HTML/MDは常時機械0回。LLM受理後のgate失敗を無言で機械成功へ置換しない。read/UIの提供表示は `legacy-text | office-text-gated | pdf-text-gated | not-provided | no-original` を区別し、形式が候補であることと中身のgate通過を混同しない。Officeは媒体未解釈、PDFは単列限定/中央見出し・字下げ・logo等でも拒否し得る説明を受付前/IM06へ出す。保存後に内容が再生成されるまで対応済み表示を捏造しない。

## 4. 実編集時の再open候補と比例検査

以下は予定であり、今のdoneを戻さない。実際に編集したpathと条件だけManagerへ通知する。

| 予定ファイル群 | 直接影響の旧条件 / 比例根拠 |
| --- | --- |
| domain/llm/entity・application/llm/ports/request/worker/read、libsql/llmSchema・repositories/llmRepository・0035/meta | P5b-2a-A/B/C/F/H。版互換/移行3対・旧新hydrate/CAS・保存応答回復/本文undo。quota算法は不変更だが同呼出のDは返却/消費代表で照合 |
| node/llm/sourcePreparer＋新documentPreparer/Worker/office/pdf modules、generatorのtyped unwrap | P5b-2a-B/C/H。全文/有限資源/実exit、旧source hashgolden・prompt1 wire同値・response/body不採用。native HTTP自身は変更しない |
| application/import/acceptUpload、LLM read/notice投影、ImportUpload/LlmNoteAction/失敗message表示 | P2a-B/E/F、P5b-2a-D/G、P2c-1-Aの新文書caller。通常機械/本人JB・同command/ACK/pending/dirty、失敗旧本文・新成功/undo/同値代表 |
| node/llm/config・server.nodeの固定documentWorker path・build-search.node.mjs、運用doc | P1-E/P5b-2a-H。同bundle Worker/local PDF資材配備、通常/未構成boot・実drain/旧保全 |

currentLlmSource/connection再連携/role/CoordinatedStorage/purgeの本体は変更しない予定。新callerから現在role喪失/epoch取消/unknown pin・terminal purgeの代表を新E/Hで検証するが、旧P3a/P3b/P2d全条件を予定だけで再openしない。P5b-1設定/catalog/controlHTTPは文書が既chat-text用途なので変更予定なし。変更が必要になったときだけ具体箇所で追加判断。共通commitNote/保持版GCを無理由に再設計しない。

## 5. 固定受入候補（10項目）

| 仮ID | 出典 | 観測する完了条件 |
| --- | --- | --- |
| A 保存版互換 | R03/IM01、R08/IM06、R12/CLAUDE | 0035一正本/全旧33値・FK/trigger/index/ledger保持、正常/SQL/FKfault原子性、NULL保持CAS・新doc NULL/V1等拒否 |
| B Office全文準備 | R03/IM01〜03、design coverage | 3形式の全対象文字/構造/単位順、非text有限notice、未知/暗号化/破損/table64KiB超拒否。部分を全文成功としない |
| C PDF限定準備 | R03/IM01〜03、2b0-B | 全頁text/blankのみ提供、V1反例全文保持拒否、mixed/image/未知operator・順序/暗号化/破損拒否、限定範囲とP5b-3残件表示 |
| D 分割/モデル/計数 | R08/IN02、R11/AC10、R10/JB | 既chat-text/current profile、prompt1 wire不変、全文segment順/hash2、論理1回・未送信返却/送信後非返却・80%消費基準を新文書経路で確認 |
| E 現在権限/取消 | R08/IM06/IN03、R10/JB03 | personal/WSowner-editor本人要求、viewer拒否、失権/再連携/解除late非採用、通常batch取消とIM06取消差、実closeまでowner保持 |
| F 本文/undo/回復 | R02/本文、R08/IM06、R10/JB02 | 失敗/取消は旧本文/版維持、成功同Tx/FTS/既pin・tag/public identity保持、本文限定undo/後続編集拒否。旧V1全response回復、新V2全response再準備一致、不一致非再送/intent-onlyunknown |
| G 受付/未提供matrix | R03/IM01〜05、R08/IN01/08 | AI文書受付、非連携/AIoff既機械・HTMLMD常時機械、原本/未提供保持、gate失敗理由・機械可能形式のみ明示再取り込み案内 |
| H 同bundle体験 | R03/R08/R10/R11/R12 | 下表4形式正常/IM06undo/理由/usage即時再読一致、pending/ACK自動POST0/current actor-route/390px keyboardを代表確認 |
| I 有限所有/配備 | R12/CLAUDE、design owner | inputFD/新Worker/pipe実close、abort/timeout/未終了unknown保持、固定local資材/通常DI、global2/account1・停止/回復契約不変 |
| J 固定/保全/返却 | R12/brief | 規定型→lint:fix→format・unit/影響Node/build、最終同bundle/指紋、最新J停止保全/許可後通常移行・旧全比較、自己通常回収と全停止。実外部/品質/課金未検証を区分 |

## 6. 有限UI・fixture・工程

同bundleはtrusted constructor/自己loopback native HTTPだけを代替とし、文書Worker/DB/commit/UIは実経路。fixture全上限account2/WS1/member2/note6/原本10MiBを維持する。最小開始は新alpha1・WS/member0・正常DOCX note1/原本1<=64KiB。新P/新DB/新鍵だけを使用し、作成直前のexact集合/bytesを申告する。現段階はまだ作らない。

| 増分込み最大6noteの用途 | 同bundle観測（同資料の再生成はnote追加なし） |
| --- | --- |
| 正常DOCX/XLSX/PPTX/PDF各1＝4 | 各AI import→本人JB→本文/notice→reload、1file1回。既noteのDOCXでIM06/指示/model/置換確認→undo、XLSXでWS現在権限・取消代表 |
| mixed又は二列PDF1 | gate未対応理由・原本保持・送信0・予約返却。暗号化/破損/未知Office/table超過など他理由は実Worker/DB＋表示unitで補い、実UIをしたと称さない |
| 機械Markdown1 | 通常機械0回・本文保持。Office/PDF AIoff・HTML常時機械は無変更parser既受入＋今回acceptUpload統合対、全形式をUIで重複再演しない |

後からbeta1/WS1/member2へ増やし、上の既noteを正規移動して現在role代表に使う案。追加原本は各128KiB以下を目標（総1MiB未満）、正確bytesは作成前確定。month既定30を維持し、上限/並行/quota境界は新自己testDBの固定clockで検査する。quota値をUI都合で勝手に変更しない。ACKは1既知対象commandだけのproof-only1回遮断、正常handler/receipt確認とclient喪失を分離。新fixture回収は停止backup・exact ID/原本/版/objects bytesを通知し、Manager利用者案内後の通常trash→永久削除のみ。account/DB/key/mail/backupは保持、領域削除しない。

工程見込みは12〜18時間＋独立別：型/保存0035・移行3対と互換3〜4h、新文書Worker/網羅/実close3〜5h、受付/notice/本文回復/同bundle3〜4h、最終回帰/保全/回収/固定3〜5h。2b0の成果を再発明せず、初回製品型/組込み境界の不一致があれば15分単位で根拠と見込みを更新する。

補助は最大1人。主が共有型/SQL/repository/worker orchestration/全環境を所有し、型固定後だけ新 `node/llm/documentWorker.mjs` と専用pure office/pdf modules・そのunit・専有報告を分離委譲する候補。既parser/共有port/管理正本/DB/runtimeは補助非編集・非操作。Node実行枠は主と直列、全formatter/build前に書込停止/返却を確認。最終Verifierを実装に使わない。

本案は静的読取の最終差分で、gate合格を製品完成へ広げない。適用skillはgoal-implement、実Office/PDF資産を扱う実装段階でdocx/pptx/pdfとREFERENCEを再確認する。今回は資産読取/作成/表示/依存取得0。公開source/報告の静的読取と本書1fileの作成だけで、製品・管理正本・旧proof変更0、自己runtime/Worker/DB作成0、全execはexit0で終端回収した。最終全文確認を終えてから、本提案を含む全read/write/run停止・所有返却をManagerへ通知する。次の製品着手は採用・固定受入委譲後に限る。
