# P5b OpenRouter・LLM変換の実装前提案

## 状態と結論

2026-09-28、担当 `/root/implementer_resume`。P5aの独立検証と並行した静的読取・公式公開資料調査だけの提案である。製品、依存、test、DB、runtime、browser、鍵、proofは変更・起動していない。書込み先は本書だけ。以下の新しい型、DDL、port、技術値、段階分割はManager未採用であり、要件合格や実接続成功を意味しない。月間30回と再連携時の旧変換取消は、本書作成中に届いた利用者決定として区別する。

一括実装より、認可・設定、本文生成、重い媒体処理の3縦スライスを推奨する。直近はP5b-1相当の認可・設定を具体化し、生成をまだ提供しない事実をUIへ明示する。各名称は計画案で、正式phase IDはManagerが決める。利用者は月間初期上限30回（1fileの論理変換/再生成1回、内部分割非加算、運用設定可）と、確認を表示して新連携成功時に旧変換を取消す方式を選択した。失敗/unknown計数と月境界は未採用である。

基準はP5a候補 `6e3401108ead1880e5c0c57aa666e826993321ea` の現在コード。P5aの正式受入、最終baseline、環境所有返却を待ってから次の製品編集を開始する。本書のためにHEAD、DB、旧proof、秘密を追加照合していない。

## 入力と静的な現在事実

入力は `spec/requirements.md`、`spec/scenario/integration.md` IN-01〜03/08、`import.md` の形式別方針とIM-01〜06、`account.md` AC-10、`jobs.md` JB-01〜03、`.goal-implement/brief.md`、`design.md` のOpenRouter/Google接続契約、`phases/P5-openrouter-contract.md`、`reviews/P5-feasibility.md`。CLAUDE.mdの型・境界・UoW・React 19の責務を維持する。

| 現在のコード | 確認した責務と不足 |
| --- | --- |
| `application/import/processJob.ts` | 機械抽出、画像/音声の妥当性検査、本文なしのneeds_ai又はLLM_DISABLEDまで。LLM呼出はない。commitはlease/current note版/activeJobId/現在edit/verifiedを同Txで照合する。外側catchはraw causeをloggerへ渡しており、新provider例外をそのまま通せない |
| `application/import/controlJobs.ts` | 失敗retry/取消後reimportであり、ready原本や編集済本文の上書きを拒否する。IM-06の明示再生成へそのまま流用しない |
| `domain/job/entity.ts` | `useAi`はあるがcredential epoch、モデル設定snapshot、論理LLM試行、dispatch intent、月間計数はない |
| `adapters/node/importRunner.ts` | 既定2秒pump・全体2・90秒lease・heartbeat。lease再claimは外部発注の非冪等性を解決しない。既存30分/内部試行制約を新LLMの無条件再送へ使わない |
| `application/di/hollowTypes.ts` / `execution/hollowUnitOfWork.ts` | Google認証、import等のportはあるがOpenRouter連携/catalog/LLM quotaは未接続 |
| `application/account/context.ts` / `presentation/authenticationHttp.node.ts` | browser hash/epoch、actor/account/session/authVersionの捕捉・再照合、legacy bind、共通Request fenceがある。OpenRouterはこれを本人確認として使い、新Hollow sessionを発行しない |
| `adapters/node/auth/googleHttp.ts` | 固定Google宛先、bounded消費、request/response/socketの実close待ちを持つ。OpenRouterの任意URL受入口に改造せず、別provider adapterで同じ所有原則を適用する |
| `application/import/readImports.ts` / `components/hollow/ImportUpload.tsx` | 既存履歴・scope容量と未連携案内がある。月間LLMの使用量はなく、未連携固定文言は構成/連携/生成提供範囲に分ける必要がある |
| `adapters/node/import/mediaWorker.mjs` / `package.json` | media検査とpdfjs-dist/mediabunny/sharp等は存在するが、今回の静的読取で全音声codecのNode decode/encodeやPDF全page画像出力が成立したとは確認していない。FFmpeg導入済みとは仮定しない |

HTML/Markdownは常に機械変換、未連携時Office/text/文字PDFは機械抽出、画像/音声/文字なしPDFはneeds_ai、明示AI不使用の必須形式は失敗、原本保持の旧契約を維持する。元ファイルがある編集済noteへのIM-06は別受付として、旧本文を失敗で消さず、既存revision/undo・タグ・公開/共有identityを保持する。

## 公開一次資料の再確認

以下は2026-09-28の公開資料読取であり、実API交換・生成・請求の観測ではない。crawl日時を仕様施行日とみなさない。

| 論点 | 現資料と採る境界 |
| --- | --- |
| PKCE | `/auth`、S256、`callback_url`、`/api/v1/auth/keys`で利用者keyを得る手順とlocalhost対応がある。任意state echoやcallback相関値保持を成立済みにしない。[公式guide](https://openrouter.ai/docs/guides/overview/auth/oauth) |
| 交換認証 | guideはBearerなし、生成referenceはBearer付き・Management keyに言及する例があり不一致が残る。既存key入力や管理key要求で回避せず、条件付き実PKCEで判断する。[交換reference](https://openrouter.ai/docs/api/api-reference/oauth/exchange-authorization-code-for-api-key) |
| key確認 | `/api/v1/key`にはexpiry、creator、利用情報等があるがemail保証はない。labelにkey断片を含む例があるためDTO/logへ渡さない。metadata成功を生成成功・残高保証としない。[current key](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key) |
| catalog | input/output modalities、context/output上限、価格、expiration_date、ページ情報を境界検証する。未知能力を推測して選択可能にしない。[models](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties) |
| 画像/PDF | 非公開媒体は公開URL化せずbounded dataで送る。PDF parserの画像転送には最大8枚という制約があり、原文の全page画像処理の代替とはしない。[画像](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding)、[PDF](https://openrouter.ai/docs/guides/overview/multimodal/pdfs) |
| STT | transcription endpointとaudio chatは別能力。専用STTはJSON又はmultipart、multipart25MB、provider処理60秒、長音声分割の案内がある。STTのprovider order/only/ignoreは適用されないのでchatのroutingを流用しない。[STT](https://openrouter.ai/docs/guides/overview/multimodal/stt) |

### 既定モデルの候補更新

価格は下表の表示価格であり、為替、実provider、音声/画像別課金、reasoning出力、税・購入条件を含む総請求額ではない。現在の日本語品質・忠実性は未検証。終了近傍の旧候補を固定のまま採用しない。

| 用途/候補 | 公開能力・価格 | 提案 |
| --- | --- | --- |
| 旧 `google/gemini-2.5-flash` | 入力$0.30/出力$2.50 per 1M tokens。provider一覧には2026-10-20終了表示。[公式一覧](https://openrouter.ai/google/)、[価格](https://openrouter.ai/google/gemini-2.5-flash/performance) | 新規既定の第一候補から外す。保存済選択があれば勝手に別IDへ変えない |
| `google/gemini-3.5-flash-lite` | text/image等入力→text、入力$0.30/出力$2.50 per 1M、image入力$0.30/Mの表示。[公式モデル](https://openrouter.ai/google/gemini-3.5-flash-lite-20260721) | text/imageの低費用な第一試験候補。採用前に固定IDと現catalog能力・日本語小集合で品質を確認 |
| `google/gemini-3.5-flash` | multimodal、入力$1.50/出力$9.00 per 1Mの表示。[公式モデル](https://openrouter.ai/google/gemini-3.5-flash) | 品質比較用の代案。安価候補の無言fallbackにしない |
| `openai/whisper-large-v3` | audio→transcription、$0.000008/秒の表示。[公式モデル](https://openrouter.ai/openai/whisper-large-v3) | STT第一試験候補。60秒入力なら表示単価の単純積は$0.00048だが、structuring分や実請求条件は別 |

モデルIDと用途別既定集合はManagerの技術採用が必要。利用者の費用承認と実接続品質gateは別であり、本書で発注しない。catalog障害時は採用した既定集合だけを選択候補として示し、保存済設定は「取得未確認」と表示して保持する。廃止を知っているIDを障害fallbackで再有効化しない。

## 縦スライスと完成体験

| 段階案 | 観測できる完成体験 | 意図的に残す範囲 | 見込み |
| --- | --- | --- | --- |
| P5b-1 認可・設定 | IN-01/02/03/08の連携状態、モデル保存、再連携、解除。初回needs_ai件数/一覧、戻り先、実adapter契約＋隔離UI | 生成は未提供と明示。画像/音声が「利用可能」になったとは表示しない。IM-06実行やquota成功を主張しない | 10〜16時間＋独立別 |
| P5b-2 本文生成 | 月間枠の計数詳細決定後、Office/text/文字PDFの構造化・単画像、IM-06の警告/実行/失敗保持/undo、JB履歴/取消、AC-10月間表示 | 文字なしPDF全page・音声分割は未提供。既存機械経路/needs_ai保持 | 12〜20時間＋独立別 |
| P5b-3 媒体完結 | 文字なしPDF全page・音声の実変換/分割/STT/順序結合から同じ本文commit。IM形式表の残りを接続 | 実接続は承認待ちとして別残。最大200MB/全OSの性能を小fixtureで保証しない | 10〜18時間＋媒体gate・独立別 |

分割は要件削減ではない。P5b-1の接続完了は「OpenRouter資格情報の接続確認」であって「LLM変換全体完成」ではない。機能projectionを `connectionState` と `availableConversions` に分け、前者だけで後者をtrueにしない。IN-01全体とIM-06/AC-10は最後まで未完項目としてManagerに残す。

## 直近P5b-1の具体契約案

### 内向き型・port・保存

OpenRouterをGoogle認証型へ継ぎ足さず、`domain/integration/openrouter` と `application/integration/openrouter` に置く案。`HollowContainer.openRouter?` は構成の有無だけで、利用者接続の正本はDBとする。providerのnative例外は外へ出さない。

| port/表案 | 責務/主要値 |
| --- | --- |
| `OpenRouterConnectionRepository` / `openrouter_connections` | account PK、単調epoch/CAS version、unlinked/linked/needs_relinkのunion、暗号化credential参照、key expiry、linkedAt/everLinkedAt/lastUsedAt、最小provider ID。unlinkedはcredentialなし。epoch/everLinkedAtは解除で消さない |
| `OpenRouterAttemptRepository` / `openrouter_auth_attempts` | attempt ID、相関token hash、account/session hash/authVersion、browser hash/epoch、expected connection epoch、固定continuation、開始/10分deadline、CAS version。pendingはprotected verifier、exchangingはdispatch所有対応、checkingはprotected candidate、terminalは秘密null。状態別CHECKと型unionを揃える |
| `OpenRouterModelSettingsRepository` / `openrouter_model_settings` | account PK、version、text/image/STTのtyped choice、defaultsVersion、更新日時。endpoint kindとmodel IDを別に保持。再連携で任意設定を初期化しない |
| `OpenRouterAuthorization` | `authorize`、一回`exchange`、非生成`inspectCredential`。戻りはbounded検証済のopaque credential/必要metadataだけ。network/unknown/providerRejectedをsafe codeで区分 |
| `IntegrationSecretProtector` | 専用purpose/keyring/kid。verifier/candidate/connectionを別AADにし、account/attempt又はcredential epochへ束縛。candidate昇格時は接続AADで再暗号化してから同Tx採用。共有/Google/Drive鍵を流用しない |
| `OpenRouterCatalog` / `OpenRouterControlExecution` | 有限catalog取得と能力projection、制御HTTPの所有/abort/drain。秘密なしcatalog cacheはadapter内、DB設定の正本にはしない |

最初のmigrationは次番号0033候補の加算3表＋必要index/triggerを基本とする。accountsやsessionを再構築しない。新attemptからauth browserへの参照を正規に追加し、`authBrowsers.prune`も生存OpenRouter attemptを保持するpredicateへ変更する必要がある。FKだけでpruneを例外停止させず、合計limit100を維持する。DDL細部はManager採用後に固定し、P5aの正式最終baselineからclone正常/rollback/全旧列/FK/trigger/FTS/objects比較を先行する。

key rotationはcredential epoch変更ではなく暗号の再包絡とし、旧kidで復号不能なら秘密を推測/破棄せず要運用復旧を安全表示する。未設定時は新認可を拒否するが、期限scrub/本人によるローカル解除は復号不要で動かす。秘密なしterminal receipt案は24時間、10分を過ぎた未完attemptは認可に使わず秘密scrub、参照0だけ有限pruneとする。24時間は技術提案で未採用。期限と実HTTP終了を混同しない。

### 認可の短いTx境界

1. 同origin POSTでP5a browser bootstrap返送を確認し、`captureAuthentication`＋verified本人を取得する。expected connection version/epoch、固定戻り先、元upload文脈、開始10分期限を保存。認可は同じbrowser/actor/session/authVersionの現在値に束縛する。Google identityや新Hollow sessionは作らない。
2. S256 verifierを暗号化。独立256-bit相関値を固定callbackの許可queryに含める案（例示値は保存/出力しない）。callback相関の往復が実providerで保持されなければ拒否してgateへ戻す。state echo、最新attempt検索、元browserだけを根拠にした照合への緩和は禁止。
3. callbackでquery長/重複/型、元browser/actor/epoch/期限を確認し、pending→exchangingを短UoWのCASで一度だけ確定。Tx外でcode交換。code自身はDB/logへ保存しない。URLをserver/access logへ記録せず、safe result IDへ303・no-store/no-referrerで遷移する。
4. key受領後、candidate暗号化→現在試行を再照合してcheckingを同Tx保存。保存済candidateだけmetadata GETの明示再確認を認める。受領後保存前の中断は外部孤立keyの可能性があり、旧codeを自動再交換しない。
5. metadata確認後、現在actor/session/authVersion/browser、expected epoch、attempt期限を再確認し、credential昇格/epoch更新/初回defaults/everLinkedAt/receiptを同Tx確定。初回needs_ai件数は現在read可能集合だけ、0なら通知なし。再連携は初回通知なし。settingsの同時更新は別version照合で保持する。
6. 401等の確定invalidは対象credential epochだけneeds_relinkへ。timeout/429/5xx/未知schemaをinvalidkeyに読み替えない。再連携失敗は旧有効connectionを残す。callback遅延やDB失敗でも新session/認証復活はない。

相関tokenは秘密URLであり、snapshot、汎用CLI出力、ログ、hash一覧へ露出させない。callback URLのaccess logがアプリ外に存在する配備では、そのredaction設定も実接続前提となる。任意return URLは受けず、固定settings又は現在認可済upload continuationへ戻す。戻っただけでupload/生成を再送しない。

exchangeの応答不明は結果未確認、明示新認可へ案内。元exchangingをbootで一括失敗/再送しない。P5aと同じくstorage単位排他だけから同DB別process不存在を仮定しない。10分期限で採用を封じ秘密を回収できても、未知I/Oの終了証拠にはならない。late candidate保存/metadata成功は旧epoch/CASで不採用。

### 解除と再連携

解除は確認画面のconnection epoch/versionへ束縛し、同Txで旧鍵/candidate/verifierを破棄、epochを進め、旧attemptを封じる。LLM接続後は本人旧世代のqueued/running需要へ永続cancel fenceを置く。物理I/OはTx外abort→実closeを待ち、閉じなければ所有を残す。機械変換・別利用者・完成note・Googleログインは保持。provider全revokeや既発生料金取消と表示しない。

再連携は利用者決定に従い、新key検証成功時に確認済旧epoch需要だけ取消して切り替える。確認後に増えた旧jobを無断取消しないようactive demand fingerprint又は同等の再確認を同Txで行う案。確認が古ければ、期限内の検証済candidateを保持して新しい集合を明示確認し、code再交換はしない。昇格と旧epochの永続fenceを同Tx確定し、個々のjob状態更新/実abortは有限掃引でも、fence以降の新dispatch/late採用を即拒否する。新鍵へ旧jobを無言付替えしない。新接続採用が失敗した場合は旧鍵を保持し取消を実行しない。秘密のDB破棄と既にメモリへ取得した旧HTTP所有の終端は別であり、実closeまで停止追跡する。

### 有限HTTP・構成・秘密

制御HTTPはGoogle poolと独立。新依存を増やさずnative HTTPSの別adapter案で、固定 `openrouter.ai:443` のauth/keys、key、modelsだけ許可。paginationのnext URLを直接followせず、固定endpointの検証済cursorへ変換する。redirect0/retry0、identity encoding以外は安全拒否、request/response/socket実closeを開始時から所有してfinallyに待つ。error本文やheaders/causeをlogへ渡さずsafe enum/status classのみ返す。

未採用の初期値案: 制御HTTP全体4/queue0、交換＋metadata合計10秒（後の明示metadata再確認は元attempt期限内で1操作10秒）、code4KiB、交換/metadata応答各64KiB、catalog1page2MiB・最大20page/5,000候補・合計8MiB・1操作10秒、cache15分。上限/途中ページ失敗は「完全な一覧」とせず既定集合＋再試行へ。fallback時も保存モデルを改変しない。OAuth開始browser5回/10分・非terminal3、prune60秒/最大100を候補とする。実library/native消費段階と実loopback closeで確認し、Promise rejectを通信終了としない。

構成は専用明示ファイルと32B専用keyring、strict JSON/16KiB/0600/親0700/O_NOFOLLOW、固定APP_URL callbackを候補とする。path/値は非表示。Google設定の探索・流用はしない。通常constructorは実adapter固定、trusted test constructorだけprovider/transportを注入でき、本番env/HTTPへfake切替は作らない。新設定は認可と変換capabilityを分け、変換未構成でも接続設定を保存できるが生成可能とは表示しない。

## P5b-2/3へ必須の接続設計（まだ詳細採用しない）

### job、dispatch、quotaの正本

`llm_job_bindings`を既存conversion jobへ1:1追加する案。account、credential epoch、operation(import/regenerate)、model/settings/prompt version、原本identity、note content/version、追加指示、固定期限を受理時に保存する。raw credentialをjobへ複製しない。機械jobはbindingなし、移行で旧useAi=true jobを新LLMへ自動変換しない。

`llm_dispatches`はjob＋segment ordinal＋dispatch generationをuniqueとし、prepared→dispatching→responseSaved又はoutcomeUnknown/rejected/closedを型で分ける案。発注前の短Txで現在job/連携/権限/原本/取消/期限、quota tokenを照合してdispatch intentをdurableにする。Tx外HTTP前に停止したと証明できる時だけ未送信へ収束する。DB intentとネットワーク送信を厳密な一回の原子操作にはできないため、intent確定後crashは「送っていないはず」と再送しない。

90秒lease再配送時、preparedなら安全な前処理を再開できるがdispatching/unknownなら同segmentを自動再発注しない。保存済応答だけ後処理を再開し、providerに確実な結果照会契約がなければunknownを明示新要求へ分ける。費用0やprovider未実行とは表示しない。old lease/dispatch generationのlate結果は最終採用できない。同論理jobの内部claim増加は枠を二重計上せず、利用者の明示retryは新job/新quota intent。JB-02の同じモデル/指示を保持し、失効credentialだけは現在接続を確認して新世代へ明示的に束縛する。

`LlmExecution`はHTTP/媒体worker/所有readerとscratchをまとめ、unknown close時はDB所有/予約を保持してstop失敗へ。新発注受付停止→abort→実終端→writer/DB停止。leaseや期限でscratch/key参照を先行回収しない。既存importRunnerの2枠をLLM待機で全占有しない有限選択/別LLM admissionが必要。現機械workerの再配送契約は変えず、LLM bindingのある枝だけdispatch照合を追加する。

月間ledgerの一意keyはaccount＋月bucketとし、policyVersionは計数を分裂させない監査属性にする。予約と消費、unique論理job tokenを別表で保持する案。利用者へ示すcountとproviderリクエスト数/金額は別。最初の予約時の月bucketを固定し、新月になっても旧bucketの予約/unknownを移し替えず、鍵交換/解除でcountを初期化しない。AC-10の80%超警告・上限・更新時刻・次回resetを表示し、保存容量不足とLLM回数不足の案内を混ぜない。

利用者決定はaccount初期上限30回、1fileの明示変換/再生成1回、内部分割非加算、運用設定による上限変更である。以下の詳細は未採用案: 予約は実行可能な最初のLLM dispatch前、消費はdurable dispatch intent確定時とする。発注前中止を証明できた分だけ予約返却、dispatch後failure/unknownは消費保持。これはDB/HTTP非原子性により実未送信でもcountが残り得る保守的案なので、利用者表示とManager判断が必要。成功だけ計数する案は再試行やunknownで外部負荷を制御できない。月境界はUTC暦月を第一案としUIにJST等でreset時刻を表示するが、UTC/利用者timezoneも未採用。運用上限変更は新規予約時の現在policyを使い、既消費countや既受理予約を削らない。値を下げて使用済みが超過しても過去jobを取消さず新規受付だけ止める案とする。

### IM-06、OCC、現在認可

新 `regenerateNote` は元ファイル又は後続Drive backupの取得可能性、現在edit/verified/connection/model/quota、本文置換への確認versionを同Txで照合する。追加指示は不信データであり秘密やツール権限ではない。既存retryのready拒否を削るのではなく明示regenerate種別を追加し、受理中はサーバーの本文更新入口もlockする。tags/style等を一律lockするかは既存本文version契約に沿って最小化する。

各I/O前と最終同Txでnote lifecycle/現在scope権限/原本identity/activeJobId/lease/連携epoch/取消generationを確認。通常logoutだけで受理済長時間jobを止める設計にはせず、interactive設定/認可は現在session必須、backgroundは現在account/権限/需要正本を使う。削除・除名・降格・解除はbinding需要を取消す。再生成cancelは旧本文保持、通常batch import取消の「queuedのみ取消・runningは完了」と区別する。

モデル応答はbounded unknown→検証→既存sanitize→現在OCC commit。tool calling/URL fetch/画像生成/外部code実行を有効にしない。既存 `MAX_HTML_BYTES=800*1024` を守り、cutoff/finish_reason length/segment欠落を成功にしない。現note/revision/pin/FTS/公開URL/タグ/共有と旧本文を原子的に保ち、失敗は本文不変。LLMが生成した任意URLを `scheduleReferences` へ無条件渡すと新外部通信を起こすため、LLM branchは参照収集を抑止又は入力由来の検証済参照だけに限定する共有判断が必要。これは既存HTML/MDのIM-05を停止する提案ではない。

### 媒体処理

text/Office/文字PDFは既存抽出を使い、モデルcontext/output内の順序付きsegmentへ分割する。無限要約や黙った切捨ては行わない。生成HTMLを組み合わせる場合も全segment一覧/coverageを照合し、note上限超過は明示失敗。全文を保つこととモデルの抽出精度保証は別に検証する。

単画像は検証済実画像からbounded変換し、SVGやアニメーションの扱いを明示する。文字なしPDFは原文どおり全pageを画像化してordinal固定し、1page欠落でも完全成功にしない。既存pdfjs依存はpage画像出力の成立保証ではないため、canvas/native描画依存と全page資源gateが必要。OpenRouterの暗黙file-parserへ丸投げして最大8画像を全page処理として受け入れない。

音声の内向き型は `stt-transcription` と `chat-audio` を分離する。直近STT実装は専用transcriptionのみを提供し、audio input対応だけのchat modelは音声認識selectorに混ぜない。原本200MBと1request25MBは別。decode→実codec変換/分割→manifest（ordinal、time範囲、sample数、実bytes、出力codec）→順序STT→結合→text構造化。container名の書換えは変換としない。後続の技術候補は明示配備のFFmpeg/ffprobe等だが、現在導入/採用しない。mediabunnyだけでNode全codecが動くと仮定しない。

分割境界の語欠落/二重化を黙って除去せず、連続sample境界又は明示overlapと決定的結合を検証する。失敗segmentは全体本文を未更新に保ち、成功断片を完全noteとして出さない。ファイルduration/pixel/page数・scratch予約・segmentbytes/数・処理時間は媒体gateで測定してから有限値を再提案する。既存50/200MB受理を無言で小さくせず、資源超過は履歴へ理由と分割案内を残す。全体30分の既制約との接続は固定し、pumpや再開で期限を延長しない。

## 予定影響と保全

本提案で製品実変更は0。次はreopen候補であり、今は旧合格を戻さない。

| 時期 | 予定path/責務 | 旧条件候補と狭い理由 |
| --- | --- | --- |
| 認可/settings | 新integration domain/application/repos/schema/0033、Hollow UoW/DI、Node boot/drain、settings/callback、authBrowser prune | P1-D/E、P5a-C/G/Hのbrowser保持・共通入口・secret I/O・起動/保全部分。Google claims/proof全行列は不変借用 |
| 生成 | import processJob/runner/controlJobs/acceptUpload、LLM dispatch/quota、Note操作/履歴/ticker/使用量 | P2a-B/C/E/F、P1-C/D、本文OCC/undoのP2c系、現在取消/物理ownerのP2d/P3f該当部。実path確定後にManagerがIDを限定 |
| 媒体 | 専用planner/worker/scratch、source owner/purge、有限変換port | P2a-A/D、P2d-2-B/C/E/FD、P3f-D/Hの実変更分だけ。PDF export rendererの初回unknown未確定へ無根拠な修正を加えない |

加算移行・nullable bindingで旧全jobを機械経路へ保持する。旧11accountの認証/credential変更0、旧原本/本文/FTS/予約/ownerは移行で変えない。最新P5a独立最終baselineから新専有proof、停止下排他backup、更なるcopy監査、clone正常/途中失敗/FK違反を先行。旧proof・sole backup自身をdriver-openしない。新LLM履歴90日と未回収owner/dispatch/quota最小記録を分け、参照中の秘密/資源をhistory pruneで消さない。

## 観測可能な受入案と検証計画

以下は新しい固定条件番号ではなく、Managerへ提示する観測集合。実装後の独立判定であり今回未実施。

| 元要件 | 直接観測する結果 |
| --- | --- |
| IN-01/08 | 未連携→元browser PKCE→非生成metadata確認→接続表示。bad/expired/別actor/ABA/二callbackを拒否、初回だけ現在needs_ai件数、0通知なし、元uploadへ安全帰還/自動POST0 |
| IN-02 | 用途別能力・endpoint kindを保存、未来jobだけ新設定、catalog失敗は既定集合と再試行、保存済値保持、廃止/不適合を無言fallbackしない |
| IN-03 | 確認済epochだけ解除、新規dispatch/late callback/resultを拒否、当人旧LLMだけ取消、機械/他人/完成note/Googleを保持。取消受付と実closeを別観測 |
| IM-01〜04 | 原文形式表、AI不使用、未連携needs_ai、mixed batch/権限/容量/上限を保つ。LLM未提供sliceで生成成功表示なし |
| IM-06/JB-02/03 | 警告→モデル/指示snapshot→実行中本文lock→成功本文/undo、失敗・取消は旧本文保持。retry多重抑止、同設定、新credentialへの明示binding |
| AC-10 | 正確な月bucket/予約/消費/限度/80%警告/reset/更新時刻。二worker最後1枠競合、月跨ぎ、解除再連携・同job再配送で加算重複0 |
| JB-01/安全 | durable intent後crash/ACK喪失は自動外部発注0、unknown可視、明示新要求別計数、late結果不採用、本人履歴90日・機密なしsafe error |
| 保全/資源 | request/response/socket、worker、reader/writer、scratchの実close。unknown保持/停止失敗、回復の所有証明、全旧列/objects/FTS保持と自己対象のみ通常回収 |

検証はpure型/分類→自己DB/UoW/CAS/clock→native自己loopbackのbounded HTTP/close→同bundle隔離UI→条件付き実providerを分ける。DBのdispatch CAS成功をprovider一回実行の証明としない。loopbackは動的port、外部HTTP0、全socket/servercloseを確かめる。requestFactory/providerの差替えはtrusted constructorだけ。実adapterのURL/秘密/header/limit契約と、provider代替UIの成功を別証拠にする。

初期fixture上限案は新専有DB/鍵でaccount2（異actor）、WS1/member2、小note6（text/Office、画像、文字PDF、文字なしPDF、音声、手編集の代表を再利用）、原本合計10MiB以下、画像PDF3page、合成音声30秒以下、同時native request2以下。上限/分割数/200MB相当はsynthetic stream/metadata/小閾値注入で確認し、200MB実音声や本番性能の証明へ拡大しない。生成stageごとexact対象数/物理量を停止下保全で確定し、Manager通知/利用者案内後に通常回収。account/鍵/DBを未提供退会の代わりに丸ごと削除しない。

契約UIはP5aの元browser/別tab/別actor、390px/keyboard、pending/error/ACK不明、離脱再訪、通常非hold操作を再利用する。callback/proof制御は専用保護helper内で秘密URL/code/keyを処理し、snapshotへ出すのは安全な結果だけ。UIで「ローカル契約provider」を明示し、通常製品へfake表示やfake認可入口を加えない。

実OpenRouterは、利用者の明示連携・送信する自己fixture・金額上限/最大要求数・callback設定・終了/解除手順の承認後だけ。初回はPKCE相関/交換認証/metadataを生成と分離し、次に採用modelの日本語text・画像・STT小集合を限定発注する。秘密保管の正当性、入力の第三者送信とprovider保存方針の説明、現価格再確認を要する。provider保持をHollow側削除で撤回したと表示しない。現在は全て未接続・費用0。

## 採用前に残す判断

1. 利用者決定済み: account月間初期上限30回・1file論理1回・内部分割非加算・運用設定可、再連携では確認後に新接続採用成功と旧変換取消を接続する。実発注/課金の承認ではない。
2. Manager判断: 3縦sliceの切り方、直近の接続済/生成未提供の表示とIN-01未完管理、3表/port、authBrowser参照追加、finite値、receipt/cache寿命。
3. 計数詳細: 採用済みの1file1論理試行を前提に、UTC月、dispatch intent時消費、unknown/失敗保持、predispatchだけ返却、運用上限変更時の既予約保持を判断する。利用者の費用とHollow回数を混同しない説明。
4. 既定model: Gemini 3.5 Flash Lite＋Whisper候補の技術採否。価格の近さは品質保証ではなく、実日本語小集合は承認待ち。
5. 外部gate: callback相関保持、Bearerなしcode交換の現実成立、利用者key metadata、現model実利用/料金。資料不一致をfake契約で解決済みにしない。
6. 後続詳細: 本文lockと再生成undo、LLM生成URLの参照収集境界、媒体変換器/配備/数値、dispatch所有回復の実終了証明。未知のI/Oを期限だけで回収しない。

2026-09-28T00:14:23+09:00のclock確認時点で本書全文を再読し、利用者決定とquota一意keyの追記を照合した。自己操作による本書以外の書込み0、製品変更、test/build/DB/runtime/browser起動、実OpenRouter認可・生成、資格情報探索は0。静的read用execは全終端回収済み、未回収exec0・自己runtime/resource生成0。この停止記録を最後の書込みとして、全読取/書込み/実行を停止しManagerへ返却する。P5a独立環境の所有はVerifierのままである。
