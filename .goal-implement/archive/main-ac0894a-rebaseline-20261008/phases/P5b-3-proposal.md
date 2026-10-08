# P5b-3 全ページ PDF・音声の提供前案

## 結論と観測範囲

次の一 phase は製品接続ではなく、全ページ PDF の有限描画・coverage と音声 STT の privacy/有限入力を確定する提供前 gate を推奨する。仮称 P5b-3a0。成立後は「全ページ PDF の縦接続 → 音声の STT・構造化縦接続」に分ける。音声 endpoint の未確認条件で PDF の提供まで止めず、音声を完成扱いにもせず、別判定を返す。

2026-09-28 の静的提案。P5b-2b2 は主担当の同 bundle UI/保全中で、独立受入前。本書は次工程の開始・製品変更・新 migration・fixture・外部送信の許可ではない。製品/管理正本/既報告は不変更、Node/test/build/DB/runtime/browser/fixture/旧 proof/秘密の操作は 0。参照した外部情報は公開一次文書の読取だけで、認証・API生成・利用者データ送信・課金・install は 0。

PDF skill と REFERENCE を全文確認した。deep-research skill の子 agent 分担・別 research 出力は今回の禁止/単一成果物に合わないため実施せず、本人の限定静的照合にした。技能の一般的な工具例を新製品依存の採用根拠にはしない。

## 必須原文と現在の未実装

正本は [IM 形式表/原本保持/IM-06](../../spec/scenario/import.md)、[IN-01〜03](../../spec/scenario/integration.md)、[JB](../../spec/scenario/jobs.md)、[design P5b-2〜2b2](../design.md#p5b-2の本文生成と月間枠)。

- テキスト層のない PDF はページ画像から LLM、音声は STT → LLM 構造化が必須。未連携時の原本/metadata 保持、AI 不使用時の失敗、連携後の原本再生成を失わない。混在/順序不明 PDF は採用 design で P5b-3 の必須残件になっている。
- 原本は note の存続中保持し、失敗/取消で旧本文を失わない。IM-06 の現在権限、本文限定 commit/undo、タグ/公開/共有 identity は既契約を再用する。
- 音声 200MB、その他 50MB の upload と、外部 1 request の有限量は別。受付可能原本の全範囲を扱えなければ明示失敗であり、先頭ページ/先頭時間だけを成功にしない。
- IN-02 は本文構造化/画像解析/STT の用途別設定。JB の本人履歴 90 日、同対象/同設定の明示 retry、取消と失敗の区分を維持する。内部 chunk を利用者の別ファイルや月間別回数にしない。

現在の [source/dispatch 型](../../packages/core/src/domain/llm/entity.ts) は recipe 1/text、recipe 2/文書、recipe 3/image の閉じた枝。[ports](../../packages/core/src/application/llm/ports.ts) は text-blocks/single-raster、chat-text/chat-image のみ。single-raster は全画素・frame 1・ordinal 0 を意味する。audio を架空 HTML、全 PDF を image/recipe 3 として通す互換性はない。

[documentPdf](../../packages/core/src/adapters/node/llm/documentPdf.mjs) は全頁を検査するが、混在描画/annotation/回転/不明配置を拒否する strict 文字 PDF であり、描画 adapter ではない。[既 mediaWorker](../../packages/core/src/adapters/node/import/mediaWorker.mjs) は音声 container と metadata を検査するが、STT 用の全 PCM decode/時間分割ではない。[catalog](../../packages/core/src/adapters/node/openrouter/provider.ts) は audio→transcription を一覧用途へ分類するだけで、生成 profile は chat 2 種に限る。完全集合が取れたことは STT endpoint/保持方針/時間上限の保証ではない。

[2b0 報告](P5b-2b0.md) の strict PDF・単画像 codec/所有と、[2b2 案](P5b-2b2-proposal.md)の差を参照した。旧 proof は読取/再実行していない。既 gate は全ページ視覚認識・STT・認証付き OpenRouter・品質/費用の証明ではない。日本語 PDF の抽出と実描画を分けた旧判定も保持する。

## 公開一次資料で確定した差

確認日は 2026-09-28。外部資料は変更され得るため正式 gate で対象仕様を再固定する。

### PDF と画像

OpenRouter の PDF 入力は chat の file content と native/外部 parser の選択を持つ。OCR parser は PDF 内画像の下流転送を最大 8 個に制限するため、これを全ページ視覚 coverage の根拠にしない。native file 対応モデルへの直接送信も、全頁の認識品質や有限資源の保証とは別である。[公式 PDF inputs](https://openrouter.ai/docs/guides/overview/multimodal/pdfs)

推奨はローカルで全 page manifest を確定し、全頁を明示 raster として扱う経路。対案は native PDF 直接入力だが、モデル別全頁仕様・容量・privacy・回復 identity の別根拠が要り、既定 parser への自動 fallback は認めない。次 gate では対案を並行実装しない。

### 音声 endpoint と privacy

公式 STT は `https://openrouter.ai/api/v1/audio/transcriptions`、モデル検索は `output_modalities=transcription`。JSON の base64 音声又は multipart を受ける。multipart は 25MB、upstream の 60 秒は処理時間であり音声の 60 秒上限ではない。形式/構造化 timestamps の対応は provider ごとに異なる。`provider.options` はあるが routing の order/only/ignore は適用されない。[公式 STT](https://openrouter.ai/docs/guides/overview/multimodal/stt)

| 条件 | chat の既採用根拠 | STT で確認できた範囲 / 未知 |
| --- | --- | --- |
| data_collection=deny | Chat Completions の provider 選択制御 | STT での適用を確認できない。無視されない根拠が必要 |
| allow_fallbacks=false | chat の backup provider 制御 | STT の同 field の適用は未確認。order/only/ignore 非適用とは別問題 |
| require_parameters=true | chat で必要 parameter の対応を要求 | STT の適用は未確認。model の modality 表示だけで代用不可 |
| model/provider 選択 | chat の現在 profile と明示モデル | transcription model は選べるが provider routing 制約が異なる。無言の他モデル/経路変更不可 |

chat 向け文書を STT へ一般化しない。[公式 provider routing](https://openrouter.ai/docs/guides/routing/provider-selection) は対象を Chat Completions としている。今回試した別 API reference URL は取得成立しなかったため追加根拠に数えない。STT の各 privacy 条件は「非対応確定」ではなく「適用未確認」。一次仕様で成立しなければ音声の実送信/提供を止め、Manager へ方式判断を返す。利用者の一般的な連携同意を、既採用 privacy の緩和許可と扱わない。

chat の `input_audio` も存在するが、STT 専用モデル/結果との同一性はない。これへ黙って代替しない。[公式 audio chat](https://openrouter.ai/docs/guides/overview/multimodal/audio)

## 全ページ PDF の最小候補

### 全頁を準備してから発注する

新しい `pdf-pages` 相当の prepared 枝を候補にする。元 PDF identity、recipe/prompt、renderer/policy、総頁数、連続 ordinal、page box/rotation、描画寸法、各 raster byte hash、順序と必要 notice を固定 manifest に束縛する。親が全頁数/順序/byte を照合する。原本 PDF は不変、全文字抽出や認識精度を保証する coverage へ偽装しない。

初期案は全頁を同じ visual 経路で順に扱い、文字頁だけ recipe 2、画像頁だけ recipe 3 の途中混合は避ける。既 strict 文字 PDF の成功経路は不変更。新 visual mode は受理時の別 source contract として固定し、旧 recipe 2 の保存済み応答が失敗した後に勝手に切り替えない。新要求の mode 選択を、事前分類による固定か明示確認にするかは受付型の小判断として残す。

白紙を省く場合にも証明された blank と page ordinal を manifest に残す必要がある。最初の gate は白紙も raster 化して coverage を単純化し、白く見える画像を文字なしと推測して削除しない。可視注釈/フォーム/rotation/crop box/optional layer の表示 policy を固定する。PDF JavaScript、添付、remote font/resource、hidden content を任意実行しない。非可視の別 layer/添付まで解釈したと表示しない。

PDF は連続座標の描画なので、単画像の「元全画素・縮小 0」と同じ coverage ではない。解像度、巨大 page、全 raster byte、総 pixel、1 request の page 数/JSON、response 集計量、全頁準備時間を gate で測る。4096/16Mpx/8MiB/12MiB、文字 PDF 200 頁、text 16 segment を新 PDF の根拠なく転用しない。候補値に収まらない原本を無言縮小/切抜き/頁省略しない。

全頁 metadata/描画成立を発注前に確認し、raster の運搬は逐次にする。全頁 PNG/base64 を同時配列で保持しない。最小案は準備で各頁 hash を確定し送信時に同 policy で再描画/一致検査する方式。再描画費用が成立しなければ有限 owned spool 案を Manager へ返す。新永続 spool を無条件の前提にしない。

dispatch は page 又は明示 page group 単位で ordinal と範囲を固定し、全応答を頁順に有限集約して一度だけ commit する。ページを跨ぐ表/文脈は model 品質の課題であり、単頁応答結合を文書の完全理解と称さない。まず単頁 dispatch の coverage/所有成立を調べ、必要 group/context の判断を品質側へ分ける。空/不完全/欠落応答では旧本文を保持し、前半だけを公開しない。

## 音声の最小候補

### STT と構造化を別の型・段階にする

`audio original → owned decode/有限区間 manifest → STT 全区間 response → 本文構造化 → 既 sanitizer/commit` を候補とする。設定の STT model と本文 model を受付時に固定し、同じ本人 credential epoch/current 権限へ束縛する。STT を `LlmResponse.finish=stop` の HTML として保存せず、transcript と chat response の判別型を持つ。追加指示を STT API の未保証 prompt に流し込まず、本文構造化に適用する。

source recipe と処理段階の識別が要る。recipe 2 は文書 text coverage、recipe 3 は単 frame なので流用不可。新 recipe/prompt 番号・stage 値・DDL は正式担当の提案に戻し、今は採用しない。二つの model と STT profile が現在の conversion/modelId 一つでは足りない点は確定している。

既 media validator の検査は維持し、必要な full decode/正規化/区間化を別 adapter にする。複数 channel/track、codec delay/padding、sample rate 変換を勝手に第一 channel/track へ縮退しない。既依存だけで全受入形式の有限 decode が成立するとは未確認。新 native decoder の採用・配備は次 gate の判断であり、本案で依存を決めない。

### 時間 coverage と分割

音声 manifest は原本 identity、実 decode で確認した sample rate/channel policy/総 sample 数、連続区間 `[start,end)`、変換 policy、各送信 byte hash を持つ案。時間の丸めだけで隙間/重複を隠さず、全区間の union が全時間を覆うことと、文字起こしが正しいことを区分する。

先行 gate は重複なしの sample 境界分割で、境界上の発話/末尾/無音を含む小資料を照合する。切れ目の認識損失が問題なら overlap と採用区間/timestamps を別案として判断する。曖昧な文字列 dedup で正当反復を削除しない。timestamps が必須の方式を採るなら、それを返せる現在 STT model に用途を限定し、未対応を成功にしない。必要能力が不明な音声を先頭 chunk だけで終了しない。

原本 upload bytes、全 decode PCM bytes/時間、chunk bytes/時間/数、wire bytes、transcript 全量、構造化 segment/output、CPU/同時枠/全工程期限は別の予算。200MB から任意の録音時間を推定しない。8MiB PNG/12MiB image JSON や 30 秒 source deadline を音声の根拠にせず、既全体枠を維持できる有限値を先に確認する。上限変更が必要なら採用前に返す。

### 論理 1 回と非再送

STT と後段 chat が複数 HTTP でも一つの conversion/quota reservation。最初の durable 外部 intent で論理 1 回を消費し、その後の失敗や本文未完成を返却理由にしない。各 stage/ordinal に唯一 intent/owner/入力 hash/response を保存し、未知 STT の自動再送をしない。取消/失権/epoch 更新は次 STT と次 chat の両方を止める。

最小回復案は従来同様に、必要な全 stage 応答が保存済みなら後処理だけを再開する。STT 全応答のみ保存され後段未発注の crash を、自動で新 chat を発注してよいとは今回提案しない。その継続を将来必要とするなら、旧「保存済み全応答の後処理だけ」からの明示変更として Manager 判断へ。意図不明/一部応答は unknown/安全失敗と原本・旧本文保持、明示 retry は新 job/新論理 1 回にする。

## 共有契約・保存・所有への直接差

| 変更候補 | 現在の制約と最小検討点 | 直接影響候補 |
| --- | --- | --- |
| domain/entity・application/ports | pdf-pages/audio/stage/profile の合法 union、新 identity/manifest。旧 1/2/3 の意味不変 | 2a-B/C/F、2b1-A/D/F、2b2-A/C/F |
| libsql schema/repository | conversion format/recipe/prompt CHECK、dispatch ordinal は現状 0〜15・PK job+ordinal、response は chat 型。PDF count と STT stage の組合せをそのまま格納できない | 2b1-A、2b2-A、2a-C/H |
| request/read/import/model 設定 | PDF mode と画像用途、audio の STT＋本文用途、非提供/原本保持/明示 retry | 2b1-G/H、2b2-G、P2a-B/E/F、P5b-1 モデル部分 |
| preparer/generator/worker | 全頁/全時間、有限逐次処理、新 native 資材、固定 STT HTTP、stage intent | 2b1-I/J、2b2-B/C/D/H、2a-B/C/H |
| current/quota/commit/control | 契約は再用。新 caller から現在権限/取消/1回/undo、保存全応答一致の比例対 | 2a-D/E/F、2b1-D/E/F、2b2-E/F、P2c-1-A |
| UI/JB | 頁/区間入力 coverage と品質限界、STT→構造化の進捗、旧本文保持/usage/同 command GET | 2b1-H、2b2-G、JB/IM-06 |

[llmSchema](../../packages/core/src/adapters/libsql/llmSchema.ts)、[worker](../../packages/core/src/application/llm/worker.ts)、[request](../../packages/core/src/application/llm/request.ts)、[acceptUpload](../../packages/core/src/application/import/acceptUpload.ts) の静的照合による差。具体 migration は必要と見込むが、旧一表 CHECK 再構築の許可を他表/dispatchへ自動拡張しない。旧全値/FK/index/trigger/ledger、NULL recipe1、旧 active/unknown/期限/回復を保持する正式案を別途示す。PNG/音声/base64を履歴へ保存する必要はなく、必要な finite transcript/response は既 budget/90日/回収と結び付ける。

owned source、renderer/decoder child、pipe、HTTP request/response/socket、必要 spool は実終端まで保持する。message/abort/期限/remote応答だけで閉鎖にせず、終了不明は既 exact owner と回復 record に残す。STT timeout は provider の処理/課金取消の証明ではない。raw original/transcript/token/cause を log/DTO/assert diff へ出さない。新共有 storage 所有の変更が必要な場合だけ P2d の該当回収条件を追加評価し、無変更の全基盤を全面再試験しない。

現在 P5b-2b2 の in_progress を受入済みに読み替えない。次開始時点の独立受入/凍結 source を基準に、上表から実変更が届いた旧条件だけを Manager が再評価する。

## 次の一 phase の固定条件案

仮称 P5b-3a0、製品非変更の提供前 gate。開始は 2b2 独立受入と環境返却後、Manager の別許可。A〜E は候補であり現 phase の追加受入条件ではない。

| 案 | 独立判定できる成果 |
| --- | --- |
| A 全頁準備 | 合成の文字/画像/混在/順序不明/回転/白紙を全頁 manifest と比較。末尾不正/未対応/予算超過は全体失敗。描画 visual と抽出を別確認し、先頭頁成功なし |
| B 有限運搬/所有 | 逐次 raster、再描画 hash 一致、有限 metadata/binary/backpressure、実自己 child/pipe/FD 終端。中断/遅close/unknownは保持。新 PDF 値の根拠と native peak 未測定を分離 |
| C STT 適合判断 | 固定 endpoint/現在 model 能力/format・時間bytes・privacy 3条件を項目別に根拠化。適用不明は不成立として残す。認証付き外部 probeなしで実品質を合格扱いしない |
| D 音声全区間 | 小自己音声の全 sample coverage、末尾/境界/反復/無音/複数channel、decode拒否、有限 chunk と mock transcript 集約。欠落/重複検出、外部0/全所有終了 |
| E 保存/接続判断 | 新 source/stage/recipe/prompt/ordinal と旧保存不変の最小案、intent前後/部分応答/全応答の純粋状態表、論理1回。次 PDF 縦接続の変更path/値/実UI案を確定、音声が未成立なら理由を独立に残す |

fixture 候補は新公開 synthetic PDF 4 本（各 2〜3 頁、全頁の識別可能な期待）、小音声 4 本（各 10 秒以内、発話境界/反復は権利のある別途承認済み素材又は自前録音、純波形は sample coverage 専用）。破損/末尾欠落/超過はメモリ変異と pure exact/+1 を優先し、最大負荷と称さない。作成前に exact 数/bytes/派生全量/工具/時間と自己 root を Manager へ申告し、今は生成しない。音声の権利ある発話が用意できなければ fake transcript は結合契約だけを確認し、認識品質は未検証に残す。

gate には製品 UI を追加しない。次の PDF 縦 phase の実 UI 最小案は新 account1/WS0/混在2頁 PDF note1、import→JB→全頁由来本文→再読→IM-06/undo と原本保持。異常は別小 note1、既 strict 文字 PDF/単画像の無変更代表を追加候補とする。音声縦 phase は別の自己音声 note1 で STT→構造化/同1回/取消・旧本文を確認する。いずれも exact 資産/実環境・保全許可は別、fake generator の UI 成功を実 STT/画像認識成功としない。

目安は次 gate の公開仕様/型案 1〜2時間、PDF 小描画/所有 3〜5時間、音声 decode/区間/owned HTTP mock 3〜5時間、整理 1時間、計 8〜13時間＋独立判定別。新 decoder/通常配備が必要なら見積りを更新する。privacy の一次根拠が得られない時間は無制限調査せず、音声 blocker として返す。後続製品縦接続の正式見積りは gate 後とし、現時点では PDF と音声を一括完成日で約束しない。

## 採否が必要な点と安全な既定

1. Manager: 製品非変更 gate → PDF 縦接続 → 音声縦接続の分割を採るか。元 IM/IN の必須範囲は減らさない。
2. Manager: PDF は全頁 local raster/別 recipe を第一候補にするか。有限解像度/全量/時間・native資材・新modeの受付と保存は gate の結果で決める。単画像上限や旧16ordinalを先に固定しない。
3. Manager: STT の deny/no-fallback/require_parameters が成立しなければ音声非提供のまま方式を再検討する。catalogだけで合格、chat audio へ無言変更、privacy緩和はしない。
4. Manager: 新 stage 保存が必要な場合も自動外部送信を伴う回復を広げない最小案でよいか。旧全応答後処理のみを既定とし、STT済みから新 chat 発注する復帰は別採用事項。
5. 利用者: 将来の認証付き非機密試料の実接続/品質/費用確認は対象・回数・費用上限・停止条件の明示許可が本当に必要。現調査や連携済みを許可にしない。技術的 recipe番号/DDL/分割値の判断を利用者へ丸投げしない。

今回の提案は all-page/all-time の入力 coverage を守るもので、OCR/STT誤認識ゼロ・全文意味完全・料金上限・OS隔離/硬RSSを保証しない。品質の限界を理由に原文の未対応を削除せず、検証可能な契約段階と実接続待ちを分ける。

## 返却

新規作成は本書のみ。製品/既報告/管理正本/旧 proof/秘密は変更せず、実行資源生成 0。全文再読後に所有を返却し、全 read/write/run を停止する。未回収 exec 0。正式実装又は独立受入の根拠ではない。
