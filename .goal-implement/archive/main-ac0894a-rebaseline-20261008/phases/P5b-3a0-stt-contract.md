# P5b-3a0 C/E STT 契約の静的補助

## 結論

現行 OpenRouter STT 専用 endpoint は、採用済みのリクエスト単位 `data_collection=deny` と `allow_fallbacks=false` を適用しないと公式文書に明記されている。`require_parameters=true` の適用は未確認。このため現方式の音声製品接続・実送信は未成立であり、開始しない。A/B の PDF と D のローカル全 sample coverage は独立して継続できる。

E の最小案は、同一 conversion/予約の内部に STT と本文構造化を区別し、二つの固定モデル、stage 別 ordinal/入力 identity/応答型、stage の期待集合を保持すること。旧「全応答保存後の後処理だけ回復」を維持し、STT 済みから未発注 chat を自動発注する回復は追加しない。具体 recipe 番号・DDL・上限は未採用であり、製品を変更していない。

確認期間は 2026-09-28〜29 JST。最終日付確認は 2026-09-29 00:00 JST。主が環境を単独所有し、本補助は独立 Verifier ではない。[固定 C/E](../plan.md#p5b-3a0-全ページpdf音声の提供前gate)、[採用契約](../design.md#p5b-3a0-全ページpdf音声の提供前gate)を全文確認した。

## C: 現在の一次仕様

### 専用 endpoint と有限入力

`POST https://openrouter.ai/api/v1/audio/transcriptions` は、model と音声を受けて transcript/usage を返す専用経路。JSON は raw base64 と format、multipart は file を使う。multipart 上限は 25MB。JSON の大きな入力にも言及があるが、汎用の安全な最大 bytes/時間は確定できない。約 60 秒の upstream timeout は処理時間であり録音時間ではない。wav/mp3/flac/m4a/ogg/webm/aac は共通例で、全 provider の全形式保証ではない。`verbose_json`/timestamps の可否も provider/model ごとに異なる。[STT 公式ガイド](https://openrouter.ai/docs/guides/overview/multimodal/stt)

製品側では原本 200MB、decode 全量/全時間、送信 chunk、wire 全量、応答/全 transcript を別々に有限化する必要がある。25MB を MiB と同一視しない。既 source 30 秒/image8MiB/request12MiB を音声へ転用しない。適合 endpoint が分かるまで具体 chunk 時間・codec・応答上限を確定しない。

### Model 用途能力

モデル API は `output_modalities=transcription` で絞り込める。既定は text、`all` は全 modality を含む仕様。[Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)

現 [openrouter/http.ts](../../packages/core/src/adapters/node/openrouter/http.ts) は `output_modalities=all` を明示し、[provider.ts](../../packages/core/src/adapters/node/openrouter/provider.ts) は audio 入力/transcription 出力を `stt-transcription` と分類する。従って「既定 catalog だから STT が必ず欠落する」という指摘は現コードには当たらない。一方、生成用 profile は chat-text/chat-image のみであり、catalog 成功を専用 STT profile/保持方針の成功と扱えない。

モデル別 endpoint 文書には supported parameters 等の属性があるが、STT の三条件を適用する保証にはならない。[Endpoint API](https://openrouter.ai/docs/api/api-reference/endpoints/list-all-endpoints-for-a-model)

### Privacy 三条件を個別判定

| 条件 | 今回の判定 | 一次根拠と限界 |
| --- | --- | --- |
| `data_collection=deny` | 専用 STT では公式記載上非適用 | 公式 tutorial の routing 節が field 名を挙げて非適用と明示し、リクエスト単位の data policy 強制は使えないと説明 |
| `allow_fallbacks=false` | 専用 STT では公式記載上非適用 | 同節が field 名を挙げて非適用と明示。単に order/only がないことからの推測ではない |
| `require_parameters=true` | 適用未確認 | 専用 STT ガイド/公式 tutorial に、この field の適用を確定できる記述を確認できない。検索不発を非対応の証明にしない |

新しい決定根拠は OpenRouter 自身の 2026-07-22 公開記事 [Transcription on OpenRouter](https://openrouter.ai/blog/tutorials/transcription-on-openrouter/#how-does-provider-routing-work-for-transcription)。今回直接再取得した本文の routing 節と冒頭要約を照合した。前の [P5b-3 提案](P5b-3-proposal.md)で三項目とも未確認としていた時点から、上の二項目だけ根拠が進んだ。旧報告は書き換えていない。実サービスへ field を送信して無視を再現した証明ではない。

STT ガイドの order/only/ignore 非適用という説明は、この tutorial の追加列挙と矛盾しない。chat 向け provider object の仕様を STT に拡張しない。固定 C の調査としては「制御不足を特定できた」成果であり、「音声提供可」の判定ではない。

### 同等強度の公式経路は確認できない

[公式 ZDR 説明](https://openrouter.ai/docs/guides/features/zdr)は account/model group/guardrail/request 単位の制御を説明する。ただし今回確認した文書だけでは専用 STT に三条件を同時に保証する既存方式を特定できない。一般的な ZDR 設定を no-fallback/require-parameters の代用にしない。account 設定・guardrail・BYOK の調査や変更、鍵の追加、別 provider/local STT の実装・採用は行っていない。

[OpenRouter 自体のデータ収集説明](https://openrouter.ai/docs/guides/privacy/data-collection)と、経由先 provider のデータ方針は別。OpenRouter 自体の非保持説明を provider 制約の代用にしない。chat audio への無言代替、privacy 条件の削除、利用者の連携同意による一括緩和は提案しない。

専用ガイド・公式 tutorial・model/endpoint reference・公式 privacy/ZDR を一巡し、field 名の限定検索で追加の適用根拠が得られなかった時点で打ち切った。認証 API/生成/課金/サポート問い合わせは 0。今後の再開条件は、同等強度を明記する一次仕様の更新、又は別方式に関する Manager の独立した設計判断。現 endpoint への有料試送信はこの制約の解消手段にしない。

## E: 現コードで再用できるものと保存差

静的照合対象は [entity](../../packages/core/src/domain/llm/entity.ts)、[ports](../../packages/core/src/application/llm/ports.ts)、[worker](../../packages/core/src/application/llm/worker.ts)、[schema](../../packages/core/src/adapters/libsql/llmSchema.ts)、[repository](../../packages/core/src/adapters/libsql/repositories/llmRepository.ts)、[0036](../../packages/core/src/adapters/libsql/migrations/0036_llm_image_preparation.sql)。DB を開いていない。

| 現在の正本 | 音声で必要になる差 |
| --- | --- |
| source は旧形式/文書/image、recipe1/2/3、prompt1/2 | audio を閉じた新 source contract にする。recipe2/3へ偽装しない。元音声 codec は準備 manifest の別属性 |
| conversion は modelId 一つ、identity trigger は不変 | STT model と構造化 model を同じ受理時点で固定し、片方だけ最新設定へ差し替えない |
| sourceBytes は 1〜52,428,800、deadline は受付+30分、responseBudget は0又は2MiB | 音声 upload の原要件と整合する format 別 source 上限が必要。deadline/budget は変更が必要かを gate で判断し、先に広げない |
| dispatch PK は job+ordinal、ordinal0〜15、入力kindは conversion recipe から復元 | STT区間と構造化segmentを区別する stage/local ordinal と入力kindが必要。stage間の同ordinalを衝突させず、全件順序を明示 |
| response content は非空〜64KiB、mapper が `finish:stop` を付与 | transcript と chat HTML は別型。空の STT text/optional timestamps と「無音が証明された」を混同しない。旧 chat の非空条件は不変 |
| worker は全 prepared segment を一回ずつ発注し、最後の response と同Txで response-ready | STT 最終応答だけでは response-ready にしない。構造化も全応答保存してから同状態へ |
| intent は現在owner/epoch/予約/取消をguardし、job単位 consume | STT/構造化の両方に適用。最初の外部intentだけ論理1回、後段失敗でも消費を戻さない |

### 最小の型候補

新しい番号を今決めず、必要な意味だけを固定する案。

- `AudioSourceContract`: original/audio、新 preparation 版、固定 STT model、固定本文 model、構造化 prompt 版。旧 contract の NULL/V1/V2/V3 の意味を変えない。
- `AudioManifest`: source identity、decode policy、sample rate/channel policy/総sample、区間ごとの ordinal/start/end/bytes/hash。全時間 coverage は transcript の正確性と別。
- `AudioStagePlan`: `transcribing` では STT の期待集合と manifest hash を保持。全 STT 保存後の `structuring` は transcript 集合 hash と構造化入力の期待集合を追加して固定。最後は `responses-complete`。これらは conversion の既 phase/owner と整合する内部 plan であり、並行した第二 job 正本ではない。
- `StageDispatch`: `transcribe` の入力は audio-chunk、出力は transcript。`structure` の入力は transcript由来text-block、出力は現 chat response。共通 id/唯一 owner/intent/state は再用。状態文字列だけで response を cast しない。
- `SttProfile`: transcription endpoint/音声用途、対応format/必要出力能力/鮮度と根拠を持つ独立 profile。chat の contextTokens/max_tokens を STT に義務付けず、未知の能力を fabricated default で満たさない。privacy 不成立の現在は送信可能な profile を作らない。

STT の文字列は未信頼 plain text として escaping/構造化へ渡す。認識なしの empty text を受理する保存形は候補だが、それで該当区間を確実な無音と断言しない。全区間 empty の場合は「抽出文字なし」の明示失敗を第一候補にし、空本文成功を作らない。後段の入力/hash は保存した全 transcript と区間順から決定的に構成し、再 STT で作り直さない。

### 保存候補と migration の境界

推奨は既 conversion/dispatch を正本のまま拡張する案であり、新 STT job/quota 表を二重に作らない。conversion に二つ目の model と audio plan の必要情報、dispatch に stage と stage内 ordinal/response判別を保存する。現 PK の単一 ordinal は stageを含む一意性へ変更する案を第一候補とし、既 UUID lookup/owner CAS は維持する。旧 row は生成 stage として hydrate でき、旧カラム値・hash・ordinal を変えない互換を必要条件にする。

DDL の具体列/PK/index/JSONか正規列かはまだ未採用。plan の期待件数/範囲は後から縮められず、未保存・未完了の集合を all-response にしない条件付き更新が要る。STT集合は初回intent前、構造化集合は初回chat intent前に固定する。plan と dispatch の全件一致を最後の応答Txで確かめて response-ready にする。

conversion の CHECK だけでなく dispatch CHECK/PK/mapper と関連 trigger に差が届く。0036で許可された一表再構築の例外をこの変更へ流用しない。正式移行案は旧全値/PK/FK/index/trigger/ledger、active/unknown/期限、旧NULL recipe1/CASと失敗rollbackを保つ範囲で別承認へ戻す。今回は SQL/DB 検査を行っていない。

原本/PCM/base64を dispatch に格納せず再準備 manifest で束縛する。必要な transcript/chat 応答は有限予算と既履歴・scrub/purgeへ接続する。異なる stage の合計を既2MiBで満たせるか未測定。無言切詰めを避けるため、正規response型の上限と全量予約が確定するまで音声DDLの値を選ばない。

## 回復の状態表

現 `recoverLlm` は、終了証明された predecessor の job だけを対象に、dispatch が全 response かつ conversion が response-ready/finalizing の場合だけ後処理可能へ戻す。その後の通常処理で再準備 identity/件数/current条件を再照合する。row.every(response) だけで回復できる実装ではない。

音声でも response-ready は「全 STT＋全構造化応答が保存済み」のみとする。STT 完了を同 phase に投影すると既回復が未実施の構造化を完成と誤認するため禁止する。

| durable 状態 | 真の旧 owner 終了確認後の処置候補 | 外部送信/計数 |
| --- | --- | --- |
| intent前、preparedのみ | 安全失敗又は取消。全未送信と全実closeの証明がある時だけ予約返却 | 自動送信0・消費0 |
| STT intent、応答なし/ACK不明 | delivery unknown、原本/旧本文保持 | 自動STT0・消費1保持 |
| STT一部応答 | 残りを自動発注しない。安全な非再送終端 | 消費1保持 |
| STT全応答、構造化未発注 | 新chatを自動発注しない。旧採用範囲外の再開を作らない | 消費1保持 |
| 構造化intent又は一部応答 | 同様に非再送。保存済STTも再発注根拠にしない | 消費1保持 |
| 全stage応答＋complete plan＋response-ready/finalizing | 全manifest/hash・件数・現在権限/epoch/原本/版/取消/期限一致時だけsanitize/commit後処理 | 外部0・同1回 |
| owner終了未証明 | DB owner/pin/枠/予算保持。期限だけでclosedにしない | 再送0・早期返却0 |

部分応答時の失敗codeを段階別に分けるかは正式設計へ残す。現実装は一部 response も possible として `LLM_DELIVERY_UNKNOWN` に寄せる。新codeを増やすために旧履歴を変更しない。明示 retry は新 job/新1回で、同設定・現在権限を再確認する。

STT後の正常稼働中に構造化を初回発注することと、終了したownerの回復時に新発注することは別。前者は同jobの通常処理、後者は採用外。未発注stageを lease や別workerへ譲って自動発注させない。

## 主担当へ返す判断と停止

1. C: deny/no-fallback は公式文書で非適用、require_parameters は未確認。現在のまま音声実提供/実発注を止める。A/B/Dのローカル根拠とPDF継続を阻害しない。
2. E: 同conversion・2model・stage/局所ordinal・別response・閉じたplanを候補とする。全stage応答以外の回復送信なし。具体DDL/値は別判断、製品未実装。
3. Dとの接続: 主の純波形4本はsample/channel/区間境界の根拠だけ。実発話、STT品質、200MB最大負荷、native decoder全形式、外部privacy適用を証明しない。

deep-research skillを本人が全文読んだが、今回の子agent禁止/単一成果物制約により分担・別research directoryは使わず本人の静的調査に限定した。調査は公式根拠と必要な現コード照合で打ち切り、代替方式/価格比較へ拡大していない。

新規作成は本書だけ。Node/test/build/DB/runtime/browser/fixture/install/秘密/旧proof操作0、認証/API生成/課金/サポート送信0。存在しない参照候補2件のreadは失敗したが、rgで正規migration/sourceを確認し、実行へ進んでいない。全execは終端回収済み。EOF再読後、全read/write/run停止・所有返却、未回収exec0・自己資源生成0。
