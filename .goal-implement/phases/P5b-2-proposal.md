# P5b-2 実装前提案

## 状態・対象

2026-09-28。Manager の読取専用委譲に基づく提案であり、採用・実装開始・検証合格ではない。基準は P5b-1 候補 `870f84a47179687ae395ec2f8ed8d8313a7b1216`、brief/design/plan、P5b-proposal、IM/JB/AC-10/IN 原文。P5b-1 の独立検証環境には入っていない。製品・test・依存・DB・runtime・browser・鍵・既存 proof の変更/起動なし。今回の書込は本書だけ。

結論は、既存 conversion job と本文保存を再利用し、外部 dispatch の永続状態・quota・実行所有を別に追加する案。90 秒 lease の再配送を外部発注の再試行へ直結させない。P5b-2 内を保存/発注、媒体/本文、UI/回収の順に実装するが、本文生成・IM-06・JB・AC-10 が揃うまでフェーズ完成にしない。

以下の数値・追加 port/DDL・出力参照ポリシーは、既採用と明記するもの以外は Manager の採用待ち。実 Google/OpenRouter/生成課金、実ファイルの新 probe は未実施。

## 1. 原文・既採用の不変条件

| 元要件 | このフェーズの観測可能な範囲 |
| --- | --- |
| IM 共通・IM-01/03/04 | 取り込み時の HTML/Markdown は常時既存機械処理。これは IM-06 の明示 LLM 再生成を禁止する規則ではない。text/OOXML/文字 PDF は連携＋AI 指定で LLM、非連携/AI 不使用は既存機械処理。単画像は連携時生成。月枠超過は変換 job の失敗として履歴に残す。機械可能形式だけ非 LLM の再取込、必須形式は翌月を案内。保存容量の upload 拒否とは区別 |
| IM-02・JB-01/02 | 元の parent/child、成功分保持、本人 90 日履歴、ticker、失敗理由、同じ設定での明示 retry、新 job、二重受付防止。内部分割を独立した利用者向け job/課金回数にしない |
| JB-03 | 通常一括取消は queued のみ取消、開始済みは完了待ち。再生成取消・強制取消とは別のポリシー |
| IM-06 | 現在 personal owner / WS owner-editor が原本から再生成。モデル・任意追加指示・置換警告・実行中の編集禁止・失敗/取消時旧本文保持・成功後 undo。タグ/公開設定/共有 identity を保持。Drive 原本取得は別 phase |
| AC-10 | account の月間消費/上限/予約中・更新時刻・次 reset を表示。警告は 80% **超**。月初期 30、運用設定可。保存容量と別枠 |
| IN-01/02/03/08 | 用途別モデル/endpoint、現在接続 epoch、要再連携、最終利用を接続。再連携成功時だけ確認済み旧需要を取消。失敗時旧接続保持。接続成功と変換成功は区別 |

採用済み quota は UTC 暦月、1 file 論理変換/再生成 1 回、内部分割非加算。durable intent 後の failure/unknown は計数し、証明できた未送信だけ返却。月跨ぎ・再配送・再連携で reset せず、新しい明示 retry は新しい 1 回。上限変更は新予約に適用し既受理を保持する。

ここで「未送信」は logical job 全体の全 segment について一度も送信されていないことを証明できる意味。前 segment が発注済みなら、後 segment の request 作成前失敗を根拠に既消費 1 を返却しない。いずれかに送信可能な active dispatcher/未解決 intent/送信不明が残る場合も返却しない。

画像 PDF 全 page・音声/STT・Drive・退会本体は P5b-2 の成功範囲外。未提供媒体を「連携済みなら変換できる」と表示しない。既機械形式/既保存データの全面再構成もしない。

## 2. 静的に確認した現コードと接続箇所

- `application/import/processJob.ts`: source/現在権限/note version/activeJob/lease を確認して機械抽出し、最後に同 UoW で本文・原本・job を採用する。画像/音声は検査後 no_text。現状は LLM 発注なし。catch の raw cause を新 provider error の通路として使わない。
- `adapters/node/importRunner.ts` / libSQL `jobRepository.ts`: 2 秒 pump、90 秒 lease、並列 2、expired-running 再 claim。機械処理には有効だが、外部送信済みかを区別しない。LLM 対象を機械 claim から除き、同 DB の専用 runner で処理する必要がある。
- `application/import/controlJobs.ts`: 通常取消は queued だけ。retry は新 job と retryOf、同時再試行を拒否。ready 原本の再生成には使えないので、既 guard を緩めず独立した再生成受付を追加する。
- `application/note/commitNote.ts`: 同 Tx の OCC、20 版、asset pin、FTS、ZIP 失効を再利用できる。成功の最終一か所とする。`saveNote.ts` / `setDisplayStyle.ts` / `history.ts` は original.processing で編集/復元を拒否している。
- `domain/note/revision.ts`: cause に regeneration はない。専用 cause の型追加と表示を提案。SQL cause は text であり旧 note_revisions を再構築する必要はない。undo は既履歴復元を用いるが、「本文のみ戻す」際にその後の title/style を巻き戻さない専用 current-version guard が必要。
- `application/ports/objectStorage.ts` と `coordinatedObjectStorage.ts`: owned read の close Promise、conversion-job owner、終了未証明保持、既知旧 PID の不存在を必要とする起動排他がある。ネットワーク/worker の終了証明を取得した後まで既 owner を包む。storage の回復成功だけから別 HTTP owner の終了を推測しない。
- `documentExtractor.ts`: 出力制限/隔離 worker は存在するが、現在の finish は `void worker.terminate()` 後に Promise を解決する。新 LLM 入力工程の実終了保証へそのまま流用できない。既 parser 全体の改修とは切り離し、新 owned extraction 経路が terminate/exit を待つ小さい接続案とする。
- P5b-1 の control HTTP 4 枠/10 秒/固定 3 API、鍵保護、モデル設定、browser fence は保持する。生成用の大きな request/response を control API の上限緩和で通さない。

これらは静的観測。既 P5b-1 の独立判定を変更する指摘ではない。媒体生成の成立や OS の硬いメモリ保証を示すものでもない。

## 3. 内向き型・port の提案

| 所有層 / port | 役割・境界 |
| --- | --- |
| domain `LlmConversion`, `LlmDispatch`, `QuotaReservation` | operation import/regenerate、immutable source identity、account/credential epoch、モデル/指示 snapshot、固定期限、取消世代。dispatch outcome と resource ownership は直積で区別 |
| UoW `llmConversions` | command receipt/同時 1 note、短 claim/CAS、現在需要 watermark、取消 fence、最終採用。queued/preparing/awaiting_response/response_ready/finalizing と safe outcome を投影 |
| UoW `llmDispatches` | segment の input identity・intent・安全に検証した応答内容・finish/usage metadata・実 owner ID。送信意図を一度だけ遷移させる |
| UoW `llmQuota` | UTC bucket、reserve/consume/release、現在 limit、account admission sequence。同 logical job の二重加算拒否 |
| application `LlmSourcePreparer` | 原本を owned read し、完全な有限 segments または明示 failure を返す。画像は単一 raster、text は構造/順番付き。元 source identity と生成用 payload identity を別型で返す |
| application `LlmGenerator` | 固定 chat endpoint に immutable input を一度だけ送る。provider-native error を漏らさず safe code / delivery certainty / validated response を返す。所有未証明は専用 typed error |
| application `LlmExecution` | 新規 admission 停止、実 HTTP/worker/read close、runtime generation、有限 abort。lease と独立した所有。未終了を期限で解放しない |
| application `LlmReadModel` | 本人履歴、現在 note read による導線、quota/予約/updatedAt/reset、生成提供 format。秘密・指示本文・provider raw response を DTO に載せない |

型は `NoIntent` / `IntentRecorded` / `ResponseStored` / `DeliveryUnknown` を区別する。`closed` は実ローカル資源終了証明であって、外部 provider の完了/課金取消証明ではない。`failed` または `cancel_requested` と owner 未終了の組合せを表現可能にする。

## 4. 加算 migration 案

次 migration 番号は着手時に現在 ledger と照合する。現候補の次なら 0034。旧 account/auth/接続 3 表/既 conversion job は再構築せず、次の 5 表を加算する案。

1. `llm_conversions`: jobId PK/FK、actor、note/original、operation、commandId と request fingerprint、retryOf、expected noteVersion/revision、元原本状態、source hash/bytes、credentialEpoch、model/endpoint/promptVersion/追加指示、固定 created/deadline、phase/outcome、cancelGeneration、admissionSequence、runtimeOwner/ownershipState、responseBudget。actor+command unique、active note unique 部分 index。
2. `llm_dispatches`: conversionId+ordinal PK、input fingerprint、state、intentAt、dispatch UUID、ownerGeneration、safe finish/usage/provider request ID、bounded response content。secret header/key/raw error/full provider JSON は保存しない。intent/input/model は書換禁止。部分の数と bytes は CHECK と repository の両方で制限。
3. `llm_quota_buckets`: accountId+UTC month PK、reserved/consumed 非負、version。上限は固定済 reservation を取り消さず、新規 reserve 時に現在 policy と照合。
4. `llm_quota_reservations`: logical jobId unique、固定 bucket、reserved/consumed/released、firstIntentAt/解放根拠。消費済みを単なる失敗や期限で released にできない CHECK/guard。release は全 dispatch の未送信証明と全 dispatcher の送信権限失効/実終了を同 Tx の predicate で要求し、一つの segment の結果だけでは決めない。
5. `llm_account_fences`: accountId PK、単調 admissionSequence。再連携/解除確認後の新 active demand を検出。接続 epoch 自体は既 connection 正本を使い二重正本にしない。

候補応答は object spool を新設せず、dispatch 表に最大 64 KiB/segment の検証済み content を保存する案。最大 16 segments、job の一時 response budget 2 MiB、全 account 合計 256 MiB を UoW で予約する。DB bytes と note の利用者保存容量は別の運用保護枠。メモリ/DB 領域上限の成立は probe が必要。全文入力 snapshot を重複保存せず、原本＋不変変換 profile/segment 境界から再現し digest を照合する。

active/unknown owner と response の参照がある間、既 job 90 日 prune/purge の cascade で行を消さない。履歴の表示期限と回収負債の寿命は別。終了後は response を早期 scrub。失敗 job の追加指示/model snapshot は同設定 retry に必要なので本人履歴の90日内だけ私有保持し、本文や generic DTO/log へ出さない。90 日には本人履歴 metadata と同時回収する。quota bucket は当月または未解決 reservation がある月を保持し、過去確定 bucket の保持期間は 90 日案。消した過去 bucket を遅い job が再作成して枠を復活させない。

clone 正常/途中失敗/FK 違反の rollback、全旧列/trigger/認証/objects/FTS/使用量一致を本体移行前に実証。backup 原本は driver-open せず更なる copy で監査する。

## 5. 受付・発注・応答・本文の Tx

1. 通常 import は元 job 作成時の同 Tx で使用経路/接続epoch/modelを確定し、LLM binding を作る。後から非同期分類が必要ならその間は claim 不可の明示受付状態に置き、機械 worker と同時に拾わせない。再生成は原本/current edit/非編集中・非処理中/model/指示を検査し、旧本文を保持したまま job/binding、original.processing、同 note fence を同 Tx で作る。取り込み時の HTML/MD 機械経路は binding を持たないが、HTML/MD 原本からの明示 LLM 再生成は regenerate binding を持つ。
2. command UUID は actor に束縛。ACK 不明は同 command の本人 receipt 照会/明示再送だけ。body/指示/モデルが異なる同 UUID は拒否。受理の重複から新 quota を作らない。
3. quota reserve は LLM job の受理 Tx で行い UTC bucket を固定する案。超過なら job を safe `LLM_MONTHLY_LIMIT` で failed 記録し、原本/旧本文を保持、reservation を増やさない。キュー中に月を跨いでも旧 bucket を使う。締切は job 受理から 30 分固定案。
4. owned source preparation と model capability 照合を UoW 外で行う。全 segment の初回発注前の抽出/入力上限/未構成/未提供媒体失敗では、送信 owner の終了と job 全体の未送信を確認して reserved を返却する。後段再準備失敗は既発注 segment の有無を再照合する。現在 actor 権限/active source/noteVersion/credential epoch/取消/期限を短 UoW で再確認する。
5. 次 segment の `prepared → intent` と最初の quota `reserved → consumed` を同 Tx。commit 確認後だけ送信する。commit ACK 不明なら固定 dispatch UUID と dispatcher generation で状態を照会し、当該唯一 owner の送信権限も確認できるまで送信しない。結果を確定できなければ job の消費/予約と ownership を保持する。別 dispatcher が lease を取得しただけで intent を再送・未送信扱いにはしない。
6. Native HTTP は一度だけ dispatch。十分な response を受け、shape/finish/content を有限検証し、request/response/socket の実 close を待つ。その後 response を dispatch UUID/current owner CAS で永続化する。lease は本文採用権限であり、既 owner の安全な response 保存の同一性とは分離する。
7. 保存前 crash/DB ACK 不明で保存確認不能なら unknown。durable response があれば送信せず後処理だけ再開できる。provider request ID は照会成功を仮定する根拠にしない。adapter が request 作成前失敗を証明できても、その証明は当該 segment のみに効く。quota 返却には全 segment 未送信かつ全 dispatcher の終了/送信権限失効が必要。単なる DNS/timeout/socket error の文言から推測返却しない。
8. 全 segments が完全終了し、全 owned read/worker/HTTP が閉じた後、純粋 HTML 組立・安全化・projection を作る。最終 UoW で current edit、note lifecycle/version/source、connection epoch、期限/取消世代、全 response/owner を再検査。`commitNote`＋job success＋original ready＋binding outcome＋応答 scrub を原子的に行う。quota consumed は既消費のまま。

送信時点から failure/unknown の内部自動再発注はしない。429/5xx でも外部費用の未発生と混同しない。保存済み response の sanitize/OCC 処理再開は同 logical job 内で非加算。segment 途中失敗では一部本文を commit せず、未送信 segment は停止する。

## 6. 現在認可・再連携・取消・回復

受付は現在 session/browser fence を通し、actor/account/authVersion と edit 認可を確認する。accepted job は画面離脱/通常 logout だけで取消さず、各工程と commit で現在 account の有効性・note/WS/role を再評価する案。公開 fallback や元 original.accountId を現在 owner とみなす経路は作らない。

変換/再生成中の move は既採用どおり拒否。完了後に move しても quota は実行 actor の固定 bucket。WS viewer は閲覧のみで生成/再生成不可。現在 owner/editor でも他人の OpenRouter 鍵を使わない。タグ・公開設定・共有 identity は本文置換で変更しない。

再連携/解除 preview は現在旧 epoch の active 件数と admission watermark を返す。確定 Tx は、確認後に増えた active demand があれば再確認を要求する。candidate metadata の昇格＋新 epoch 採用＋旧需要 cancel fence は同 Tx。取消対象の新 key への付替えなし。現 provider 検証が失敗すれば旧接続/旧需要は維持。既終了 job まで取消と表示しない。

| 操作 | 採用する取消意味 |
| --- | --- |
| 通常 import 親の取消 | queued 子だけ取消/未送信予約返却、開始済みは完了待ち。UI は件数を分ける |
| IM-06 再生成の本人取消 | running も新 commit を fence、abort 要求、実 close 後 cancelled、旧本文維持。logical job 全 segment の未送信を証明できる例外以外、intent 後の枠返却なし |
| 解除・再連携成功・trash・WS失効等 | 当該需要を即論理 fence、進行 I/O に abort、local owner が終了するまで回収保持。provider 課金取消とは表示しない |
| unknown/終了未証明 | 結果不明/終了確認待ちを表示。見かけの timeout で failed/cancelled 完了や予約返却にしない |

JB-02 retry はモデル/追加指示/profile/source の元 snapshot を保った新 job。旧 credential epoch が現在も有効なら元設定で明示 retry する。epoch 変更時は旧 job/dispatch/鍵を付け替えず、「現在の連携で新しく変換する」確認へ進む案。確認フォームは元モデルと追加指示を初期値として保持し、現在 default へ戻さない。元モデルが現在の用途/profileに適合すれば同設定の新 job を作り、終了/非適合/未確認なら理由を示して明示モデル変更または再確認を要求する。変更した場合は「同じ設定の retry」と偽らない。

確定時に新 command/new job、新 credential epoch、新しい 1 回の quota を取得し、retryOf/provenance で旧 job との関係を残す。旧 job の取消/unknown/消費を改変せず、旧結果を新 job の結果に移植しない。旧鍵を retry のために保持する案は不採用。これにより「同モデル/追加指示の新 job」と「旧 job を新 key へ自動付替え」を区別し、JB-02 の同設定意図を保つ。具体的な確認 UX は Manager 採用待ち。

停止は LLM admission → abort active → 実 close/owner 終了 → DB/storage 終了の順。機械/PDF/ZIP pump と相互待ちさせない。60 秒の監督期限で終了しない場合は ownership unknown として枠・source pin・budget を保持し、正常 drain としない。

Node の専用 runtime generation/排他記録を追加する案。HTTP は同 Node process 内・子の外部送信 process なし。正規 boot は旧 generation のローカル process 終了を証明できた場合だけ local owner を回復し、intent-only は delivery unknown にする。PID 生存/権限不明/lock 不明なら自動解放しない。共通 DB の他生存 runtime を一括 recover しない。物理 process 終了を証明しても provider remote operation の終了/未課金は証明しない。

## 7. 媒体・生成 HTML・有限資源案

### P5b-2a / 2b の利用者向け提供範囲

Manager の分割方向に合わせ、2a を text 縦接続＋quota/JB/IM-06、2b を Office/文字PDF/単画像の追加とする案。接続済みでも未提供媒体を生成可能と表示せず、2a 完了を元 P5b-2 全体完成とはしない。

| 原本 / 操作 | P5b-2a | P5b-2b |
| --- | --- | --- |
| HTML/Markdown の取り込み | 従来どおり常時機械。LLM回数0 | 不変更 |
| text の取り込み | 連携＋AI 指定で LLM、非連携/AI不使用は従来機械 | 不変更 |
| text/HTML/Markdown 原本を持つ note の明示 IM-06 | text用途モデルでLLM再生成。モデル/追加指示/置換警告・旧本文保持・取消・undo・履歴・quotaを縦接続 | 不変更 |
| OOXML/文字PDF の取り込み・明示再生成 | LLM経路は未提供と表示。従来機械取り込みを維持するが、LLMを選んだ要求を無言で機械へ落とさない | 既述の抽出/coverage gate成立後にLLM提供 |
| 単画像 | LLM生成未提供を明示、既存の原本保持/要AI等と提供状態を区別 | 画像用途のgate成立後に提供 |
| 全page画像PDF/音声/Drive原本 | 未提供 | 未提供、P5b-3/Driveへ |

HTML/MD 由来 note の IM-06 は禁止しない。2a の `LlmSourcePreparer` に、現在本文ではなく保存済み原本の owned read→既 parser/sanitizerによるHTML構造化→script/危険URL/能動的資源を除いた有限textブロック化を持つ。外部画像/CSSを再fetchせず、表/見出し/code/本文順を保ち、未対応の非text構造は coverage/警告で明示する。準備結果は `text-blocks` 型、元 source identity は `html`/`md` を保持し、生成モデル用途を原本拡張子に固定しない。画像意味の理解まで成功と主張しない。

### 提供前の成立 gate

2a は text/HTML/MD の owned read と既抽出経路の terminate/exit、全文ブロック網羅、有限入力、response上限＋request/response/socket実close、intent/quota/本文同Txを先に成立させる。単に既 parser があることを実closeの根拠にしない。2b は別に OOXML/文字PDF全対象内容/混合page判定、画像変換・劣化/全frame方針を実資材で確認する。媒体gate不成立の形式は提供せず、成立済み2aの体験とは区別する。

50 MiB は既原本受付の上限、800 KiB は既保存本文の上限、64 KiB×16 等は新 LLM 工程の技術案であり互いの代替ではない。受付済み原本が LLM 工程上限を超える場合は safe resource failure を job に残し、再生成では旧本文を保持する。head切詰め/黙った機械fallback/800KiBまで必ず生成できる保証はしない。

text/OOXML/文字 PDF は既抽出器の構造 HTML を安全なブロック入力へ変換し、順序・見出し・表・code を保つ。抽出結果の coverage が partial の場合、その警告を LLM で消して完全と表示しない。全文を head だけに切る、文字 PDF と判定して画像 page を黙って無視する方式は不可。混合/画像 page を検出したら P5b-3 未提供を明示する方式の成立 probe が必要。

単画像は現検査済み原本を bounded raster にする専用 port。静止 JPEG/PNG 等から開始する案だが、対応拡張子は原文との照合・実 codec probe 後に決める。animated/WebP/SVG 等を先頭 frame に黙って縮退しない。50 MiB 受付/既 40M pixel 検査を即 LLM payload の許容量とはしない。画像の小文字判読・劣化は契約 fake で証明できない。

| 項目 | 技術採用候補（未実測） |
| --- | --- |
| 並列 | generation 全体 2、同 account 1、DB queued 最大 account 100。機械 2・control HTTP 4・PDF/ZIP枠と別 |
| 固定期限 | job 30 分、source prepare 30 秒、1 dispatch 90 秒、abort/stop の監督 60 秒。clock port、有限 poll 2 秒、Tx 内待機なし |
| 入力分割 | text UTF-8 64 KiB/segment、16 segments 以下。block 単位、巨大単一 table/code は明示資源失敗。全ブロック網羅記録を持つ |
| 画像 | 長辺 2048 px・変換後 4 MiB 以内を候補とし品質 probe。元寸法/縮小の表示。request JSON 最大 8 MiB |
| 応答 | HTTP body 最大 2 MiB、content 64 KiB/segment、max_tokens 8192、最終 note 既 800 KiB。圧縮は未対応なら拒否。全 close 後だけ枠返却 |
| 個別指示 | UTF-8 8 KiB、UI/transport/保存型で同制限。モデルや raw provider parameter の任意注入には使わない |
| 回収 | 2 秒 pump/60 秒 prune、1 Tx 最大100、DB response 合計256MiB保護。未知 ownerは参照付き保持 |

モデル context 長と UTF-8 bytes を同一視しない。現在 catalog の用途情報だけでは生成 token budget の証明に不足するため、現在 model の context/output上限/必要parameter を確認する generation profile port を追加する。静的既定は version 付き既知 profile、任意 custom は live profile を確認できなければ intent 前に失敗。文脈超過時に自動的に model を変更しない。

生成は tool 呼出なし、URL fetch instruction なし、単一 HTML fragment 出力に限定。finish_reason=length、tool call/refusal、空/不正 content は成功にしない。prompt injection は指示と原文の分離だけで安全と保証せず、生成結果を未信頼として既 sanitizer/projection を通す。

生成 HTML の `src`/CSS `url()`/新規参照は自動取得しない案。既原本由来の既知 note-owned media placeholder だけ明示 allowlist で戻し、新 URL を reference worker へ渡さない。通常リンクも既 sanitizer の URL 規則を適用する。HTML/MD の既 IM-05 参照収集は不変更。この生成分岐のポリシーは意味があるため Manager 採用を要する。

## 8. 実 adapter・公開資料・費用の境界

- [Chat Completions API](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion) の固定 `/api/v1/chat/completions` を使う案。Bearer は採用済み専用 credential をメモリで復号。redirect/retry0、固定 host/path、独立 native HTTP、request/response/socket close 待ち。通常 DI に fake/env 切替を置かない。
- [Streaming / cancellation](https://openrouter.ai/docs/api_reference/streaming) は非 streaming と未対応 provider の取消で外部処理/課金が続き得ると説明し、Google を streaming 取消未対応に挙げる。初版は非 streaming の有限応答で設計する案。ローカル close だけを保証し、provider 課金取消は保証しない。SSE を後で採る場合も HTTP200 後 error/不完全終端を別扱いにする。
- [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection) は provider fallback と data_collection 制御を持つ。無言の model fallback は禁止、provider fallback も false 案。`data_collection=deny` を推奨するが、提供範囲と privacy 表示への影響があるので Manager 採用待ち。これをゼロ保持保証と表示しない。
- [既定モデル公式頁](https://openrouter.ai/google/gemini-3.5-flash-lite-20260721) は現確認時、context 1,048,576 / max completion65,536、表示単価 input $0.30/M・output $2.50/M。価格/route は変動し、実品質未検証。例として input16k/output8k は約 $0.0248、16分割なら約 $0.3968（画像等の別条件を含まない概算）。月30回は金額上限ではない。実費の hard cap を装わず、受付時に分割/概算条件と provider 側残高管理を案内する。

今回確認した公開資料から、Hollow の UUID による provider の exactly-once/同一応答再取得契約は確立していない。契約確立前は自動再送/外部照会復旧を実装しない。P5b-1 の correlation 往復/Bearerなし code交換という実接続未確認条件も残る。

raw provider error/cause/headers/token/prompt/output は logger に載せない。内部は safe enum、job/dispatch UUID、bytes/count/duration/close bool に限定。HTTP errors 401/明示鍵失効と schema不正/timeout/429/5xx は分離し、後者で旧接続を needs_relink にしない。HTML内の本文/リンクを error として返さない。

## 9. UI・undo・使用量

再生成 dialog は現在 note/version/actor に束縛し、用途モデル・追加指示・本文置換/料金説明を表示。dirty editor は保存完了または明示破棄なしに受付しない。受付後はサーバーと UI の両方で編集を拒否し、旧本文は読める状態で進捗を併記する。失敗/取消では旧本文・版・タグ・公開が不変。

成功は本文だけを現在版に保存する。生成 actor は実際の明示要求者、cause は regenerate、元版番号を記録。直後 undo は現在 version がその生成結果に一致する場合に元本文を新 revision として復元し、現在 title/style/tag/公開を保持する案。後続編集があれば一発 undo を拒否し履歴からの明示復元へ。既20版規則と同値版非増加を維持する。

job 履歴には生成/再生成、safe phase、現在認可での note link、取消受付と終了待ち、結果不明、同設定 retry 不可理由を出す。本人以外に指示/応答/credential情報を公開しない。route/actor epoch、pending operation、completion ticket を分離し、遅い受付/応答で新しい入力や選択を消さない。

AC-10 は `consumed` と `reserved` を別表示、残予約可能数は max(0, limit-consumed-reserved)。80%超の警告は consumed 基準、予約中は別の見込み警告とする案。reset は UTC month end を利用者 TZ で表示、どちらの時刻か注記。usage 読取と job 結果の更新時刻を示す。保存容量の満杯と LLM 月枠満杯を別文言にする。

## 10. 成立 probe・検証・受入案

実装着手後、次の順で成立を確認し、失敗時は共有契約へ戻す。今回実施は0。

1. 隔離 worker の owned extraction/terminate 実終了、画像変換の寸法/bytes/破損/全frame方針。日本語 text/OOXML表code/文字PDF混合page/小画像の全内容を確認。PDF実資材を扱う前に該当skillを読む。
2. native loopback で正常/遅body/上限/中途切断/abort/接続失敗、request・response・socket終了を別観測。intent直前/直後/応答保存直前・直後crash、DB ACK不明、90秒lease超過の二workerで送信件数が増えない。
3. 実DB UoWで quota29→並行2要求、30→failedjob、同command、16segments1回、全segment未送信証明返却、前segment発注済み＋後segment request作成前失敗の返却0、active/unknown・intent ACK不明保持、月跨ぎ/limit低下/再配送、新retryの新1回を確認。
4. 再連携preview後の新需要、昇格失敗旧継続、昇格成功旧fence/実close待ち、新key付替え0、unlink/role降格/trash/move/通常logoutを区別。
5. IM06旧本文/版/assetpin/FTS/タグ/公開/共有identity、running編集拒否、OCC/undo/後続編集、HTML/MD取り込みは機械だが明示再生成はtext用途LLM、生成HTMLの外部参照送信0、partial出力非採用。epoch変更時に元モデル/指示を初期値保持し、同設定の新jobまたは明示変更、旧job/key付替え0も確認。
6. 最終同bundle・trusted constructor代替providerで通常import→job→本文、再生成→undo、quota表示/超過、通常取消/再生成取消/unknown明示新要求、actor/route/ACK/390pxkeyboard。fakeの品質/実課金成功とは表示しない。
7. clone移行・規定checks/build・最新unit/影響Node、既存機械代表、fresh旧比較/必要smoke、自己通常回収/最終保全/commitと指紋/全停止、独立へ。

観測可能な完成条件の案は8群: A保存型/移行、B媒体入力と用途モデル、C一度dispatch/応答保存/unknown、Dquotaと使用量、E現在権限/再連携/取消実close、F原子的本文/再生成/undo、G同bundleUI/機械継続、H有限資源/回復/保全/候補固定。固定条件化は Manager 所有であり本書では追加しない。

実接続は別許可後だけ、専用 OpenRouter account/key・費用上限/モデル/入力の合意が前提。最小 text1 と単画像1、token/bytes/finish/品質・実請求を確認する案。実接続未実施の場合、その範囲を条件付き未検証として独立へ渡す。契約代替で画面成功しても実生成品質と同一視しない。

## 11. 影響候補・fixture・見込み

今回は製品実編集0なので旧条件の reopen は要求しない。以下は実装時に実path/理由が確定した場合だけ Manager へ通知する候補。

| 旧条件 | 予定される直接影響 |
| --- | --- |
| P2a-B/C/E/F | LLM分岐、job状態/retry/取消、claim/lease再配送。Aのcodec既成立全行列は不変なら借用 |
| P1-C、P2c-1-A/D/E | generated HTML安全化、commitNote/版、regen undo、編集中拒否/OCC。既editor全操作を全面再演しない |
| P2d-2-B/C/E | active owner/response参照とtrash/purge/prune。old媒体削除経路の実変更部分だけ |
| P3a-E、P3f-D/H | current role/WS失効・move拒否/旧容量保全の接続箇所のみ |
| P5b-1-C/D/E/F/H | credential epoch/需要確認、model generation profile、待ちnote案内/UI、保全 |
| P1-E、P5a-G/H | runtime admission/drain/prune/旧認証保全。Google control自体は無変更なら借用 |
| P4f-1/P4f-2 | commitNote既存ZIP失効hookの借用が原則。実PDF/ZIP責務を変更した場合だけ具体IDを再提案 |

最小専用 fixture 案は新空DB/鍵、account2、WS1/member2、note6以下、原本合計10MiB以下（text/OOXML/文字PDF/単画像＋既HTML/MD代表）。自作・公開利用可の日本語小集合、ページ/table/codeを全件確認。形式を増やすため上限外を無断追加しない。旧11accounts/既認証fixture/旧proofは不変更。通常削除前にexact対象と停止backupをManagerへ通知。退会未提供のaccount/DB/鍵/mailは保護保持、領域全削除しない。

実装見込みは18〜28時間＋独立別。分割案は2aが12〜18h（基盤とtext/HTML/MD原本のIM06、UI/保全）、2bが6〜10h（Office/文字PDF/単画像gateと提供差分）。媒体probe不成立時は再見積り。以前の12〜20h案との差は、実close・durable response・再連携需要確認・undo/current副作用まで接続する責務を具体化した分。2aだけで元P5b-2完了とはしない。

## 12. 採用が必要な判断

1. 5加算表、DB内bounded response保存/2MiB perjob・256MiB global、専用runtime ownerと既conversion ownerの結合方式。
2. 30分/90秒/2並列・分割/画像/prompt/outputなど有限値。これらは原要件の確定値ではなく成立probe前の技術案。
3. 新epochでは元モデル/追加指示を保持した明示新変換確認を挟み、新jobとして受理するUX。非適合/終了モデルは明示変更必須、current defaultへの無言置換なし。旧key維持は不採用、旧jobへの付替え禁止。
4. generated HTMLの新規外部資源取得禁止、既知mediaだけ復元、provider fallback無効/data_collection denyのprivacy方針。
5. 本文だけのregen undo、80%警告はconsumed基準＋reserved別案内、quota reserve時に固定するUTC月。

未実証の主要点は抽出coverage/混合PDF判定、画像変換品質、model profileと実token計数、実providerの課金/取消/ACK不明、native終了/回復の故障境界。これらを採用済み・合格と呼ばない。P5b-1独立結果と次phase正式委譲を待ち、製品は変更しない。

2026-09-28T02:52:48+09:00 の時計確認後に最終整合を確認。本書全文を静的再読し、retry用指示snapshotの保持とresponse早期scrubを分離した。テスト/型/build/実接続は実行0、自己DB/runtime/browser/鍵生成0、未回収exec0。読取途中の存在しないport名・zsh未一致globは終了済みで、対象を列挙して正しい公開sourceへ辿り直した。秘密/旧proof読取なし。本書以外の変更0、報告返却後は読取/書込を含め全操作停止。

Managerの4点照合依頼による追補では、本書内のquota全segment意味、新epochの元設定保持、HTML/MD原本IM06、2a/2b提供matrixと成立gateだけを明確化した。公開価格概算は実品質や費用承認ではない。安全方向のprivacy/参照禁止/undo/月固定も正式条件の採用を代行しない。製品/テスト/環境操作0を維持し、更新確認後は再び全操作停止する。
