# P5b-2b2 単画像の製品縦接続案

## 結論と境界

静止 JPEG/PNG/WebP/GIF の単画像を、原本保持→完全 decode/正規化→画像用途 profile→単一画像 dispatch→既本文 commit/undo→本人履歴まで接続する案を推奨する。文書 recipe 2 を拡張解釈せず、画像専用 recipe 3 と画像 prompt の別版を判別 union で追加する。保存は次の正式 migration による `llm_conversions` 一表の CHECK 拡張を提案する。いずれも本書時点では未採用・未実装。

2026-09-28 の静的観測。P5b-2b1 は主担当が build 19329 を凍結して実 UI 確認中であり、本案は同フェーズの独立受入・環境返却を依存とする。新フェーズ開始、移行、fixture 作成、外部送信の許可ではない。製品、既報告、管理正本は変更せず、本書だけを作成した。Node/test/build/runtime/browser/DB/旧 proof の実行・秘密読取・外部アクセスは 0。

全ページ画像/混在/順序不明 PDF、音声、複数 frame/複数像容器、Drive 原本取得は対象外。これらを単画像への変換で迂回せず、P5b-3 等の必須残件を保持する。単画像提供後も元 IM/IN 全媒体対応の完成とはしない。

## 正本と採用済み根拠

- [IM](../../spec/scenario/import.md): 形式表、原本保持、IM-01〜04 の単一/複数受付・現在 scope・結果、IM-06 の原本再生成・本文限定 undo。画像は機械抽出できる形式として案内しない。
- [IN](../../spec/scenario/integration.md): IN-01/02/03/08 の画像用途モデル、連携/解除、現在状態。連携成功と生成能力/品質を混同しない。
- [JB](../../spec/scenario/jobs.md): 本人履歴、失敗した同対象/同設定の明示再試行、queued の取消と再生成 running 取消の差、90 日履歴。
- [design の gate/文書接続](../design.md#p5b-2b-の提供前gate)、[P5b-2b 提案](P5b-2b-proposal.md)、[P5b-2b1 接続案](P5b-2b1-proposal.md)。古い画像予算推測より、採用済み resource-only 方針を優先する。
- [P5b-2b0 の C/E 実装報告](P5b-2b0.md#有限値の根拠区分)、[独立 C/E 判定](../reviews/P5b-2b0.md#ce-codecprofile所有)。旧 proof の実物・秘密・DBは本調査で読まない。

既受入 C は、静止 4 codec の完全 decode、向き補正、CMYK→sRGB、白背景 alpha 合成、metadata 除去、PNG 再 decode、小 codec の成功/拒否と 4096/+1 長辺を確認している。APNG、animated GIF/WebP、合成 MPF marker、破損を拒否した。正規 MPO 全般の解析、色忠実度、認識品質の証明ではない。

E は自己 native child の作業開始後取消、IPC/pipe/FD/実終了、未終了時の所有保持と image profile 26 対を確認した。16Mpx 完走、8MiB PNG 最大 encode、12MiB JSON 最大実転送は未実施。これらの exact/+1 の pure 判定を最大負荷成功に読み替えない。採用済み gate を全面反復せず、製品へ移す責務の直接差だけを再検証する。

## 現コードとの差

| 接続点 | 現在の観測 | 単画像で必要な差 |
| --- | --- | --- |
| `domain/llm/entity.ts` | 旧 3 形式 recipe 1 /文書 4 形式 recipe 2、prompt 1 | image/recipe 3/画像 prompt 別版の閉じた枝 |
| `application/llm/ports.ts` | prepared は text-blocks、profile/generate は chat-text | single-raster/chat-image と用途対応を型で固定 |
| `application/llm/request.ts` / `read.ts` | 新規 recipe 選択・supported は旧形式/文書、モデル初期値は text、一覧も chat-text | image 受付・画像用途の初期値/一覧/再試行設定・有限 availability |
| `application/import/acceptUpload.ts` | image 自体は形式判別済み、LLM 分岐は text/文書・settings.text | AI+有効連携の image を LLM へ、settings.image を選ぶ |
| `application/llm/worker.ts` | prepared.segments を走査、全応答再準備一致、chat-text 固定 | 準備枝から明示的な一画像 dispatch を作り、同じ intent/所有/回復へ |
| `node/llm/sourcePreparer.ts` | V1 Worker と V2 documentPreparer | 新 image preparer/固定 native child の版 dispatcher |
| `node/openrouter/provider.ts` | catalog は chat-image 表示能力あり、生成 profile cache/inspect は text のみ | 同じ完全集合から画像専用 profile。text profile の流用なし |
| `node/llm/generator.ts` | prompt 1 は sourceHtml JSON/文字 messages。固定 native HTTP 所有 | 画像 prompt の multipart text＋自前 PNG data URI、全 JSON の有限化 |
| `libsql/llmSchema.ts` / `0035_llm_document_preparation.sql` / `repositories/llmRepository.ts` | image 非許可、文書は明示 2、prompt=1、recipe immutable/CAS | 次 migration で画像組合せだけ追加、型付き hydrate/CAS |
| `LlmNoteAction` / `llmDocumentMessage` / upload/job 投影 | 画像未提供、文書の固定理由、actor-route と ACK guard | 単画像の提供/拒否・正規化/認識限界、画像モデル、同 command GET の既契約 |

新規 adapter 名は `imagePreparer.ts` / `imageChild.mjs` 等の候補であり path/API は正式担当が確定する。既機械 `import/mediaWorker.mjs` は全媒体の検査であって、画像正規化・画像生成入力の代用ではない。元 parser/媒体 validator の改修は最小案に含めない。

## 型・保存・回復の最小案

### Recipe と prompt

推奨は `image + preparationVersion:3 + promptVersion:2`。数字 3/2 は具体候補で、採用は Manager に返す。recipe 2 は全文字 unit/page coverage と HTML segment を意味し、single-raster を同じ版へ混ぜると同版再準備・hash/回復条件が変わる。独立した union 枝の方が既 V1/V2 不変を検査しやすい。

画像 user content は既 prompt 1 の `sourceHtml` 文字 JSON と byte 同値にできない。現在の system 文言も「文書の一 segment」であり、画像の視認不能部分を創作させない指示とは別契約になる。画像だけ別 prompt 版へ固定し、旧 1 の system/wire/再試行を変更しない。単に media を追加した同 prompt 1 と称する案は推奨しない。

`single-raster` は正規化済 PNG の bytes、width/height、単 frame、検証済み元 codec、recipe/normalization policy、prepared identity を持つ。`chat-image` は対応する image profile と一 raster だけを受け、URL/任意 data URI/HTML に base64 を埋めた入力は型・境界で拒否する。文書にない架空 block/HTML を生成して既 loop へ渡さない。

画像 prepared manifest は固定順で原本 identity、recipe、正規化 policy、元/正規化後寸法、frame=1、PNG bytes/hash を束縛する案。親が受領 byte と metadata を照合して再計算する。dispatch は ordinal 0 の一対象とし、入力 identity の意味を画像枝へ対応させる。既永続 sha/ordinal で足りるなら別 image dispatch 表を作らないが、mapper が conversion の format/recipe から正しく復元できることを検査する。`prepared-segment` の名だけで HTML と誤認させない。

### 保存

現在の CHECK は image を拒否するため、mapper の変更だけでは実装できない。次の新 migration で `llm_conversions` 一表を再構築し、旧全列値/PK/FK/trigger/index/ledger/owner/期限をそのまま保持して次の合法組合せだけを許す案とする。

- 旧 text/html/markdown: NULL または明示 recipe 1、prompt 1。不必要な backfill なし。
- docx/xlsx/pptx/pdf: 明示 recipe 2、prompt 1。
- image: 明示 recipe 3、画像 prompt 別版。NULL/1/2、旧形式 3、文書 3、未知版は拒否。

nullable CHECK は明示 IS NOT NULL を使用し、immutable guard と replace/CAS は recipe/prompt を変更しない。既 0035/0034 を編集しない。列追加・新表は現時点では不要と見込む。正常/途中 SQL/末尾 FK 失敗、旧 NULL/V1/V2 の hydrate/CAS と all-response 回復を新正式 SQL で限定再検証する。DDL の採用・通常環境適用は別許可。旧 active/unknown を終了へ変えない。

PNG/base64 を DB や job 履歴へ保存せず、固定原本から再準備する。全応答保存済みだけ後処理再開し、正規化結果/hash が一致しなければ安全失敗、intent-only/応答不明は再送しない。codec 配備変更で PNG byte が変わる場合も既応答へ無言で付け替えず、この一致検査で止める。

## 正規化・profile・HTTP・所有

gate 済み範囲を製品初期値として採用する提案は、静止 4 codec、全容器/CRC/animation/MPF 検査＋全 decode、EXIF auto orientation→sRGB→白 alpha 合成→metadata 除去→PNG→再 decode。縮小・切抜きは 0、原本は不変。SVG/TIFF/HEIF/AVIF 等の新形式を追加しない。原本 50MiB/既受付の pixel 検査と、生成用の 4096px 長辺/16,000,000px/PNG 8MiB/全 JSON 12MiB は別境界として説明する。これらの数値は gate 根拠付き製品採用案であり、本書では確定しない。

profile は image 入力/text 出力/chat/max_tokens、現在完全 catalog/期限/必要 parameter を照合し、live custom 15 分又は版・期限付き adopted image default を区分する。最後の完全一覧の明示非対応/廃止を fallback で復活させない。既 default と同じ model ID でも text profile を転用しない。正確な既定 image profile の公開根拠と期限は正式実装時に primary で再確認する。本調査は外部アクセス 0 で、過去資料を新たな提供継続保証にしない。

resource-only とし imageTokens=null/contextGuaranteed=false を維持する。system/追加指示/包装の text 予算と output を事前照合し、画像 token を base64 bytes や Google 直接 API の式から捏造しない。provider context 拒否は送信後の安全失敗・消費維持・原本/旧本文保持。能力未知は確認不能であって恒久的非対応とは表示しない。

HTTP は既固定 chat endpoint/非 stream/redirect 0/retry 0、privacy の allow_fallbacks=false/data_collection=deny/require_parameters=true を維持し、自前 PNG だけの data URI を multipart content にする。text 先行、画像 1 個、任意公開 URL/file/OCR plugin は 0。全 JSON byte 上限を組立段階と native send 前に検査する。応答 2MiB/content 64KiB/output 8192、stop 以外/refusal/tool/空/不正応答拒否は既契約。原本・PNG・base64・鍵・raw cause を log/DTO/assert diff に出さない。

native sharp は固定専用自己 child と実 close を待つ案を推奨する。V2 文書 Worker も実 exit/pipe を待つが、それを native codec 全体の終了証明へ無条件に流用しない。固定 entry/allowlist env/外部接続 0、input FD/child/IPC/pipe を最初から所有し、message/abort/30秒 deadline は停止・終了の証明にせず exit/close/pipe 終端前に枠/pin を返さない。生成 global 2/account 1、job 30 分、dispatch 90 秒、停止監督 60 秒は変えない。native heap/RSS の硬保証を足さない。

8MiB raster を旧 prototype の 2MiB metadata IPC に詰めない。最小候補は有限 metadata と専用 binary pipe を分離し、input は最大原本 bytes、output は PNG 8MiB 以下を backpressure 付きで転送、受領 byte/宣言 size/hash/EOF を照合する。IPC 解決だけで child/pipes 完了としない。binary の運搬 shape は正式担当の狭い成立確認で確定する。新永続 spool/workflow/storage root は前提にしない。メモリに原本/raster/base64/JSON/native 展開が併存するため、global 2×PNG 上限を総 RSS と表示しない。

## 本文・coverage・UI

準備 coverage は「単 frame の全画素を縮小/切抜きなしで正規化し一画像として入力」の意味に限定する。Office の textComplete や PDF text-covered を偽造しない。生成後に Original.coverage を既 complete へ投影する場合も、入力の全範囲を扱った意味だけで、全文字認識/内容の正しさを保証しない旨を表示する案。色/向き/白背景変換と認識誤りの可能性を短く説明し、原本確認を可能にする。新永続 coverage enum は現段階で必須としない。

生成結果は既 resultProcessor→sanitizer→commitNote。画像原本の新 asset 化/HTML への自動挿入、生成 src/CSS の外部取得は追加しない。V1 の正当 placeholder 復元を変更しない。新画像枝に未知 marker/媒体 URL を許す例外を作らない。成功同 Tx の版/FTS/既 pin、現在 title/style/tag/public/shared identity、本文限定 undo/後続編集拒否は再利用する。

受付表示は AI+有効連携なら単画像生成へ。未連携/未構成は原本を保持した既 needs_ai/非提供説明、AI off は LLM 必須形式の失敗と「AI 使用の取り込み直し/IM-06」へ。画像の quota 超過に機械変換を勧めず翌月案内。animation/複数像/巨大/破損・能力確認不能・provider エラー・所有未確認を有限理由で区分する。拒否を静止先頭や機械成功に置換しない。

モデル初期値は `settings.image`、明示 retry は元の画像モデル/指示。現在 actor/scope/原本/版/epoch/取消を採用時にも照合する。queued 一括取消と running IM-06 取消を維持し、後者は旧本文不変・実 close まで所有維持。使用量は論理 1 ファイル 1 回で、全未送信＋全所有終了だけ返却。receipt GET/未確認 command/自動 POST 0 と再読/390px/keyboard の既 UI 契約は変更しない。

## 固定条件案

正式開始時に Manager が確定する案であり、追加受入条件の既成事実ではない。

| 案 | 独立判定可能な条件 | 出所・直接差 |
| --- | --- | --- |
| A 保存/型 | 旧 V1/V2 全値/CAS/回復不変、画像合法組合せだけ hydrate、正常/SQL故障/FK故障 rollback | 2b1-A、recipe 意味、新 CHECK |
| B 画像準備 | 全 decode/向き/色/alpha/metadata/再decode、4 codec、animation/複数像/破損/上限拒否、原本不変 | IM-01/06、受入2b0-C |
| C profile/wire | image用途/鮮度/default否定、resource-only、単PNG multipart/有限全JSON、text wire不変、privacy/current model維持 | IN-02、2b0-E、2a-B/H |
| D 所有 | source FD/固定child/binary/IPC/pipe/HTTPの実終端、遅close/未終了unknownで枠/pin保持、停止/回復非再送 | 2b0-E、2a-C/H |
| E quota/現在認可 | 画像論理1回、intent前失敗返却/送信後非返却、並行枠、失権/解除/epoch/取消・遅応答拒否 | IM/JB/AC-10、2a-D/E |
| F 採用/回復 | sanitize/本文限定commit/undo、旧本文保持、prepared hash一致all-response再開、intent-only非再送 | IM-06、2a-F、P2c-1-A |
| G 受付/表示 | 同bundle単画像import→本人JB→本文、IM-06/undo、未連携/AIoff/拒否原本保持、画像モデル/usage/ACK/390/keyboard | IM-01〜04/06、IN/JB、P2a-B/E/F |
| H 保全/配備 | 固定child/native依存の通常配備・未構成/機械継続、規定checks/影響回帰、停止保全/正式移行/旧比較/全終了 | P1-E、2a-H、2b1-J |

旧条件の reopen は実変更に比例させる。2a-A/B/C/D/E/F/G/H、P2a-B/E/F、P2c-1-A、P1-E が直接影響候補。provider 画像 profile/list の共有変更があれば P5b-1 のモデル/状態部分のみ追加する。既認証/OAuth/PKCE、Drive、PDF/ZIP、全 membership、既機械 parser、GC/storage 全基盤を無変更で全面再実行しない。共有 storage owner を実変更する必要が出た場合だけその直接条件を再評価する。

## 有限 fixture と見込み

正式実装前に exact 集合を申告する案。技術 fixture は新自己 synthetic/自己 tmp のみ、既受入の公開期待を参考にし旧 proof を再実行/上書きしない。

- codec は静止 4＋向き/alpha/CMYK の小合成を重ね、animation/APNG/MPF/破損/4096±を代表化する。16M/PNG8MiB/JSON12MiB は exact/+1 の pure byte/admission と小実 encode・binary転送・再decodeを分離。最大負荷を新一律 gate にしない。
- 実自己 child の正常/発生前取消/作業開始後取消/期限/短・過大 binary/遅 close/終了不明、自己 loopback の画像 wire/通信失敗/全close を有限代表化。終端不明の故障を timeout 成功に変えず、自己 release で真に終端してから回収する。
- 自己DBは旧V1/V2＋新画像の migration/CAS/intent/quota/全応答回復/非再送と current fence/undo の新caller代表。既全面行列を複製しない。
- 実UI開始案は新 account 1、WS 0、静止PNG note 1/原本64KiB以下。同noteで IM-06/undo/reload を確認し、拒否 animation note 1 と既機械 text/MD 1 を追加候補にする。最大 account2/WS1/member2/note6/原本10MiB を超えない案。WS/別actor の追加は必要時に事前申告し、他 codec は unit/DB 根拠を実UI成功と混同しない。通常回収・移行・保全は別許可。

目安は型/保存/有限child 3〜4時間、profile/wire/worker 3〜4時間、DB/正常配備/同bundleUI/保全 2〜4時間、計 8〜12時間＋独立検証別。新 binary 終了証明又は通常 native 配備が不成立なら追加見込みを再提示し、所有証明を弱めて短縮しない。

実 OpenRouter への認証付き画像送信・費用・日本語認識品質は未許可/未検証。契約 fake/loopback は wire と現在条件/失敗処理だけを検証する。外部品質段階は別承認で、自前の非機密 1 画像/1 明示発注から対象・費用上限・停止条件を確定し、実課金取消やゼロ保持を保証しない。月30回を金額上限と表示しない。

## Manager の決定事項

1. 2b1 独立受入後の単画像縦スライスと上記 A〜H 案、最小 fixture/見込みを正式化するか。
2. 画像 recipe 3/別 prompt 2、次 migration の conversion 一表限定 CHECK 再構築を認めるか。旧 NULL/V1/V2 は不変。
3. gate 根拠の静止4codec/縮小0/白背景/4096px/16Mpx/PNG8MiB/JSON12MiBを製品初期値に採用し、resource-only profile と認識品質未保証を表示するか。
4. 固定 native child＋有限 binary/metadata 分離と全実closeを採用し、coverage を全画素入力の意味で既Originalへ投影するか。具体 transport shape/hash field順/有限codeは正式担当の型案で確定する。

新規ライブラリ、画像 token 推測、画像を文書recipe2へ偽装する案、全 PDF/音声の前倒しは提案しない。実外部送信の承認は本提案採否から分離する。

## 停止

根拠は非秘密 source/管理文書/報告の静的読取のみ。全文確認後、本書の所有を返却して全操作を停止する。新実行・資源生成・旧 proof 操作なし、未回収 exec 0。
