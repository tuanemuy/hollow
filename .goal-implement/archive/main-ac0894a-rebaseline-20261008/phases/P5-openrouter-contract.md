# P5 OpenRouter 連携の読取契約案

作成日: 2026-09-20 JST。正式 P5 開始前の限定資料。以下の新しい port・schema・数値・モデル候補・再連携方針は未採用で、Manager が判断する。製品実装・実 OAuth・認証付き API・モデル実行・課金・テストは行っていない。

## 結論と判断点

既存の session、UoW、conversion job の lease／現在 note 権限検査を再利用できる。ただし OpenRouter credential、認可 attempt、連携世代、モデル設定、月間回数 ledger は未接続である。最小候補は「本人が PKCE で連携し、生成を伴わない鍵情報取得に成功してから連携済みとする。用途別モデルを保存し、解除時に旧世代のジョブを失効させる」縦スライス。Google ログインや Drive の資格情報とは共有しない。

残る判断は、callback の試行相関方式の実成立、コード交換の公式資料差、再連携時の旧ジョブ扱い、用途別既定モデル、月間枠の単位・数値・月境界・失敗計数である。今回、新しい受入 ID／gate は作らない。

## 原文と現在 source の接続

参照: `spec/scenario/integration.md` IN-01/02/03/08、`spec/scenario/import.md` IM-01/06 と共通制約、`spec/scenario/account.md` AC-09 の当月回数表示だけ、`.goal-implement/brief.md` 外部依存、`design.md`「P5 の成立条件」「Google認証の接続契約」、`reviews/P5-feasibility.md` 全文。AC-09 の他機能、Google SSO 実装、Drive、生成全工程は対象外。

| 根拠 | 現状／再利用 | 最小不足 |
| --- | --- | --- |
| IN-01 初回・再連携・即疎通 | `application/account/session.ts` の `requireAccount` は有効 session と現在 verified account を読む | 専用 attempt と連携 repository、callback、候補鍵の疎通確認、初回成功の記録。OpenRouter の認可で Hollow にログインさせない |
| IN-02 用途別設定 | 現 `HollowContainer` に LLM／catalog port はない | text/image/audio の設定と capability DTO、OCC 保存、既定候補と一覧障害表示 |
| IN-03 解除・実行中取消 | `domain/job/entity.ts` は `useAi`、lease、noteVersion を保持 | 使用 credentialEpoch／モデル snapshot、本人・旧世代で queued/running を列挙／取消する専用 port。`cancelQueued(batchId)` だけでは不足 |
| IM-01 連携前受理 | `application/import/processJob.ts` は機械抽出し、画像・音声／文字なしを `needs_ai` 又は `LLM_DISABLED` に分ける | `useAi=true` を「既に LLM 実行可能」と解釈しない。未連携でも upload／原本保存を保つ |
| IM-06 再生成 | `commitImportResult` は activeJobId、lease、現在 account、note lifecycle、現在 edit 権限、noteVersion を同 Tx で照合。`commitNote` が履歴・投影を連携 | 再生成は現在の retry/reimport の別名にはできない。`controlJobs.ts` は ready／編集済み原本の上書きを拒否するため、明示上書き確認・owner 条件・旧本文保持を伴う後続 usecase が必要 |
| IN-08 状態・履歴 | UoW の `accounts/imports/jobs/notes/revisions` と既存本人履歴 | unlinked/connected/needs_relink DTO、分かる範囲の provider identity、linkedAt／lastUsedAt。鍵情報をメールアドレスに見立てない |
| 秘密保護 | `adapters/node/shareSecrets.ts` に AES-256-GCM、kid、AAD、鍵世代共存、fail-closed の実装形がある | 実装形だけ参照。note 用 port／AAD／鍵を OpenRouter に流用せず、別 purpose・別 keyring の protector が必要 |

`application/execution/hollowUnitOfWork.ts` に integration repository を加え、`application/di/hollowTypes.ts` に外部 I/O port を追加する形が最小。Node／HTTP 型を domain/application 内側へ持ち込む必要はない。既存 auth の browserHash 検査は参考になるが、`verifyEmail` の別 browser メール確認成功を OpenRouter 連携 proof として再利用しない。

## 公式一次資料の確認結果

確認日: 2026-09-20 JST。公開文書と公開モデルページだけを閲覧した。旧 API reference URL の一部は 404／取得失敗だったため、[現在の公式 index](https://openrouter.ai/docs/llms.txt) が示す新 URL へ移って確認した。

| 項目 | 確認できた契約 | 確認できないこと／注意 |
| --- | --- | --- |
| PKCE | `/auth` の callback_url、S256 challenge、callback の code、`POST /api/v1/auth/keys` の key 返却。コードは一回限り、期限 10 分と説明される | `state` の echo はパラメータ表にない。callback 内 query／動的 path の保持を実証していない。access/refresh token の組ではない。[公式 guide](https://openrouter.ai/docs/guides/overview/auth/oauth) |
| code 交換 | 現 reference にも Bearer 必須表示があり、guide の交換例は Content-Type のみ。response は key と nullable user_id | 両者の差は未解消。管理鍵が必要と断定せず、利用者への手入力鍵要求にも変えない。交換 idempotency／応答喪失から同じ鍵を再取得する保証も見つからない。[現 reference](https://openrouter.ai/docs/api/api-reference/oauth/exchange-authorization-code-for-api-key) |
| 疎通 | `GET /api/v1/key` はその鍵の情報を返す。creator_user_id、期限、利用量等の項目がある | 200 は全モデルの利用・残高・将来の生成成功を保証しない。label は鍵断片を含み得るのでそのまま表示しない。email の取得保証はない。[鍵情報](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key) |
| provider 側削除 | 鍵管理 API は management key を要求する | PKCE で得た通常 key による自己 revoke は今回確認できない。Hollow の解除を provider 全権限撤回と表示しない。[管理 API](https://openrouter.ai/docs/guides/overview/auth/management-api-keys) |
| catalog | input/output modalities、context、価格、expiration_date 等。output は既定 text、transcription 指定可。offset/limit による取得も文書化 | catalog の能力だけでは codec、全 provider 制限、利用者残高までは分からない。現 reference の Bearer 表示と guide の公開取得例も区別する。[models reference](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties) |
| 音声 chat | chat completions の input_audio は raw base64 と format。音声 URL 直接指定ではない | audio 入力能力と専用 STT は同じ API 契約ではない。[audio guide](https://openrouter.ai/docs/guides/overview/multimodal/audio) |
| 専用 STT | `/api/v1/audio/transcriptions`、catalog の output_modalities=transcription。multipart は 25 MB、JSON base64 経路もある。provider 処理 timeout は 60 秒と説明 | 大きな JSON の無制限保証ではない。routing の order/only/ignore は STT では適用されないと明記。chat の provider 絞込みをそのまま安全保証に使わない。[STT guide](https://openrouter.ai/docs/guides/overview/multimodal/stt) |

Hollow の音声 200 MB／他形式 50 MB 受理を provider への一発送信能力と同一視しない。音声分割・実 codec 変換・結合、画像/PDF の欠落防止は既採用の後続境界であり、今回それらの pipeline を設計済みとはしない。

## 認可から連携成立までの候補

1. 本人の明示 POST で開始する。現在 session、verified account、CSRF、browser 世代を確認し、ランダムな attempt と verifier を作る。`accountId + initiating session/browser generation + expected connection epoch + 固定 return kind` を束縛する。Google 用 state／nonce／proof を流用しない。
2. S256 を必須にし、verifier は server 側秘密保管に置く。provider の任意 state echo を仮定せず、Hollow の callback 内に高エントロピー attempt 相関値を含め、同 browser cookie と照合する方式を第一候補にする。ただし callback query/path の往復保持は実接続時に確認する未成立事項。相関できない callback を「最新 attempt」に割り当てない。
3. callback は開始した現在本人・browser 世代・期限・未使用 attempt を再照合。別 browser／別 actor／logout→同 actor の ABA は拒否する。callback URL/code は通常ログや referrer へ出さず、no-store の固定 callback で受けて query を除いた画面へ移す。安全な明示 POST で継続させる場合も、元 code/attempt 以外へ付け替えない。
4. Tx で attempt を `pending → exchanging` に CAS してから外部 code 交換を一度だけ dispatch する。DB transaction 内で外部 HTTP を待たない。期限切れや重複 callback を再交換へ回さない。
5. 正常 response の鍵を境界検証し、同じ attempt に紐付く暗号化 candidate として保存して `checking` にする。その後 `GET /api/v1/key` の metadata だけで直ちに確認する。モデル生成を疎通確認に使わない。
6. 成功後、現在本人/session/browser、attempt、account、expected epoch を再確認し、候補鍵の昇格・connection epoch 更新・初回 linkedAt／設定初期化・attempt consumed を同 Tx で確定する。初回成功だけ `everLinkedAt` を立て、現在読める `needs_ai` の件数と一覧を出す。0 件では表示せず、自動変換しない。解除後の復帰でも初回表示を再発火しない。
7. upload 起点なら固定 continuation へ戻す。保存済みの本人／upload context に束縛し、戻り時に現在権限を読む。連携しただけで旧 upload／再生成 command を自動再送しない。

ローカル attempt は開始から 10 分固定を候補とする（provider がコード発行から示す 10 分とは起点が異なる）。poll／再読込で延長しない。HTTP timeout、response byte 上限、同時実行数、attempt 保持期間は正式実装で有限値を固定する未決で、今回勝手な業務制限を加えない。

### 応答喪失・再連携・解除

| race／失敗 | 候補となる挙動 |
| --- | --- |
| code 交換後の timeout／process crash | `exchange_unknown` を保持。自動再交換しない。candidate が durable に存在すれば metadata GET の再確認だけ可能。鍵を受け取ったか不明なら明示的な新しい認可へ案内し、旧 attempt を封じる。provider に孤立鍵ができていないとは保証しない |
| metadata 401／明確な期限切れ | candidate は昇格しない。既存接続の key/epoch に対する既知 invalid だけを needs_relink にする。旧 key の遅い 401 が新接続を失効させない |
| metadata network／429／5xx | 一時的な確認不能。再連携必須や連携成功に変換しない。candidate の同一 GET 再確認は可、code 再交換は不可。残高不足と認証失効も混同しない |
| 同時 reconnect／unlink | current epoch と attempt CAS に勝ったものだけ昇格。解除後の遅い callback は credential を復活させない。client actor epoch に加え server の session/browser fence が必要 |
| reconnect の新鍵が未確認／失敗 | 旧接続を先に破棄しない。UI は「既存連携あり・再連携未完了」と区別する。新鍵確認成功後に置換し、旧 ciphertext を破棄 |
| reconnect 中の旧 job | IN-01 は旧 job 取消を明記しない。第一候補は置換確認に旧世代 job 取消を明示し、成功時に取消＋late result 拒否。別案は旧鍵を実行完了まで保持するが、世代別秘密寿命・解除対象が増える。どちらも未採用。旧 job を無説明で新鍵／別 OpenRouter account に付け替えない |
| unlink | 確認後、epoch を増やし credential/candidate を破棄、旧 attempt を失効、本人の旧世代 queued/running LLM job を取消。mechanical job、他人の連携、完成ノート、Google/Drive は維持。取消の durable fence を先に成立させ、後処理で transport abort と実 close を待つ。外部で既に実行された課金まで取消できたと表示しない |

## 最小 port／保存形の提案

既存 account row を汎用 OAuth blob に変える必要はない。以下は概念名であり、DDL／共有契約を採用したものではない。

| 追加境界 | 最小形・不変条件 |
| --- | --- |
| `OpenRouterConnectionRepository`（UoW 内） | accountId 一意、state、epoch、version、encryptedKey、keyExpiresAt、providerUserId nullable、linkedAt、everLinkedAt、lastUsedAt nullable。state と秘密有無を CHECK／型で対応させる。解除しても非秘密の epoch／初回記録は保持し ABA／初回再発を防ぐ |
| `OpenRouterAttemptRepository`（UoW 内） | attemptId、accountId、browser/session binding hash、expectedEpoch、verifierEnvelope、state、expiresAt、candidateEnvelope、returnKind、createdAt/consumedAt。claim／candidate 保存／finalize を CAS。完了 DTO は receipt であり credential ではない |
| `OpenRouterAuthorization`（application port） | 認可 URL 作成、code+verifier の交換、candidate key の metadata 確認。結果は成功／既知拒否／到達不明を区分。provider raw error/body/Authorization/code をログ・serialized error へ漏らさない |
| `IntegrationSecretProtector` | purpose、accountId、credential epoch 又は attemptId を AAD に束縛。専用 keyring の kid/rotation。key 欠損・異 binding は閉じ、平文保存へ fallback しない。暗号鍵 rotation と利用者連携 epoch を別にし、再暗号化だけで job を取消しない |
| `LlmModelCatalog`／model settings repo | kind は text/image/audio、model ID と endpoint kind、能力、取得時刻／既定集合 version、設定 version。provider 固有の JSON は adapter で検証して純 DTO へ。未知能力を true としない |
| `LlmJobBinding` と世代取消 port | jobId、accountId、credentialEpoch、モデル/settings snapshot、operation 種別、元内容識別。job の受付・外部 dispatch 直前・結果 commit で現在 account/権限/世代を再確認。外部 I/O 中の race をゼロとは主張せず、その後の新 dispatch と反映を拒否 |
| `MonthlyLlmUsageRepository` | accountId＋固定 monthKey、limit snapshot、reserved/consumed、logical attempt 又は dispatch の一意 key。並列予約を同 Tx で制限。単なる `count jobs` では ACK 不明／分割／手動 retry を正確に表せない |

provider の user_id は表示補助に限定し Hollow の認証 identity／メール一致判定に使わない。メール等が得られなければ IN-08 のとおり連携日時のみで成立する。lastUsedAt は情報取得と生成を混同しないよう、第一候補では「最後の変換要求時刻」を記録・表示し、provider 側全利用の最終時刻とは呼ばない。

現 `processJob.ts` は catch で error を logger に渡すため、LLM adapter が bearer/body を内包する provider error をそのまま上げないことが特に重要。モデル生成結果も既存 sanitize／revision／commit 境界を通し、再生成 failure では旧本文・tags・共有／public identity を維持する。これらの生成接続は将来作業であり、今回未実装。

## モデル一覧・既定値・fallback

| 用途 | 選択可能とする能力候補 | 実行経路の区分 |
| --- | --- | --- |
| text 構造化 | text input ＋ text output | chat、HTML 構造化結果を Hollow 側で安全検査 |
| image 解析 | image input ＋ text output | chat の画像入力。image output 専用生成モデルは候補にしない |
| audio 文字起こし | 専用 STT は transcription output、又は audio input ＋ text output が確認できる chat model | endpoint kind を保存し、同じ ID 文字列だけで API を決めない |

一覧は current catalog の能力で絞り、provider 利用可否／codec 制限は別条件として後で検査する。有限ページ・有限 response の adapter を用い、途中取得失敗を完全一覧と表示しない。取得不能時は IN-02 に従って採用済み既定集合だけを選択肢にし、再試行案内を出す。既存保存モデルは「現在設定」として保持し、一覧障害だけで既定値へ書き換えない。実行時の提供終了はモデルエラー＋設定導線とし、黙って別モデルへ fallback しない。

候補として、確認日の公式ページは `google/gemini-2.5-flash` に text/image 入力・text 出力を記載し、`openai/whisper-large-v3` に音声→文字を記載する。前者を text/image 共用、後者を専用 STT の既定候補にできる。ただしこれは採用推薦の材料で、品質・実データ互換・将来提供・利用者環境を検証した選定ではない。両ページに有料価格があり、無料保証はしない。動的 `latest` alias や free router を勝手に既定へ置かない。[Gemini 公式ページ](https://openrouter.ai/google/gemini-2.5-flash)、[Whisper 公式ページ](https://openrouter.ai/openai/whisper-large-v3)

初回のみ既定を設定し、以後の設定変更は新しい変換へ適用する候補。reconnect 時に利用者が保存したモデルを維持するかは原文の「既定設定」との詳細確認点で、少なくとも既存 note の自動再生成は行わない。期限が未記載のモデルを永続提供と解釈しない。既定集合の更新は設定の無断置換と分ける。

## 月間回数の未決と最小候補

原文は「月あたり LLM 実行回数に上限」「超過は変換 job の失敗」「機械変換は消費しない」「次月又は可能な形式の機械変換を案内」までを指定する。具体上限、month timezone、API 呼出／file／再生成単位、失敗の課算、月跨ぎは未指定。OpenRouter の金額 usage／free daily requests を Hollow の月間回数に転用しない。

| 比較 | 利点と不足 |
| --- | --- |
| 第一候補: 1 file の明示 LLM 変換／再生成 attempt を 1 回 | upload/job の利用者単位に合い、内部音声分割で回数が変わらない。最初の外部 dispatch 前に予約、dispatch 開始で消費。dispatch 前に停止できた予約だけ戻す。明示 retry は新 attempt、自動同一 attempt の再配送は重複計数しない。API 回数／費用は別の内部記録が必要 |
| 別案: 外部モデル request ごと 1 回 | API 実行との対応は単純だが、分割数・内部 retry により利用者が事前に消費量を予測しにくい。音声 1 file の途中で枠を使い切る扱いが追加判断になる |

第一候補でも、外部 ACK 不明や応答後失敗を消費扱いとするのは未採用判断。成功だけ計数する方式は繰返し失敗で実費が無制限になり得る。月は service 固定 UTC 暦月を可逆な初期候補とし、UI にリセット時刻を明示する。利用者 timezone とする別案は月の再設定／重複枠対策が必要。上限値を根拠なく 100 等に固定しない。

予約・消費は credential epoch でなく Hollow account に属し、reconnect／unlink で今月枠をリセットしない。key metadata／catalog／PKCE はモデル生成ではなく、機械抽出と同様この回数に含めない候補。既存 job 履歴の寿命と ledger の月境界／保持は別問題で、今回既存履歴方式を変更しない。

## 正式 slice の候補と外部実接続の残り

最初の実装候補は IN-01/02/03/08 の設定と秘密・世代基盤まで。代替 adapter で取消、重複 callback、旧 actor、code ACK 不明、metadata failure、catalog fallback、旧世代 late result を検査できる。次に IM-01/06 の実変換と月間 ledger を接続する。fake が通っても provider の callback／交換・実変換が成功したとは扱わない。

実接続には、運用 origin と callback 到達先、専用秘密保管 keyring と権限、認可に使う利用者 OpenRouter account／明示同意、候補モデルの現 catalog、送信可能な検証データ、生成を行う場合の費用承認が必要。資料上 client secret を要求する流れとは確認できないため、存在しない登録設定を必須と決めない。先に生成を伴わない認可・metadata 契約を条件付きで確認し、生成承認と分ける。code 交換の認証要否／callback 相関は資料差が残るため、その条件付き確認前に「接続済み」と表示する実装を完了扱いにしない。

今回の操作は必要 source／要件／公式文書の読取とこの報告の作成のみ。製品、PDF planner、環境、管理正本は変更していない。完成した機能はなく、実接続・test/build は未実施。
