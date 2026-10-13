# P11 音声設計の独立した読み

対象はIN-01/02、IM-01/02/03/06の音声条件。原文、`brief.md`、`design.md`の音声部分の作成に参加していない読み手による1回の設計読みである。委譲された設計候補は`ecd2fa0`。フェーズ計画とManager/Implementerの自己評価・完了報告は読んでいない。

原文から具体経路を追い、既存の型・入力・モデル選択・表示を比較対象として読んだ。製品の変更、DB操作、環境起動、テスト、build、install、実サービス接続は行っていない。UIのdesktop/375/320幅は未観測。

## briefの条件不足

### B1: 音声の月間上限超過時は、機械取り込みを案内しない

- 対象ID: IM-01/03。音声再生成で同じ上限を扱うIM-06にも届く
- 元引用: `spec/scenario/import.md:26`は「機械的な変換で取り込めない形式（テキスト層のない PDF・画像・音声）では、翌月まで待つ案内のみとする」。同ファイル`:100`は原因別表示に加え、「機械的な変換で取り込めない形式では翌月まで待つ案内のみ」を要求する
- brief箇所: `.goal-implement/brief.md:54–58`の音声条件はendpoint、privacy、用途別モデル、分割、保存・回復、検証方式を記載する。同ファイル`:72`は論理1回の計数を記載するが、上限を超えた音声の利用者向け案内を固定していない
- design箇所: `.goal-implement/design.md:275`は「同job初回intentで論理1回消費し内部分割と後段非加算」を記載するが、音声では翌月待ちだけを表示する分岐を記載していない
- 具体経路: 月間30回を消費した利用者が31回目として音声を取り込む。上限超過による失敗後、音声は機械取り込みで解消できないため、案内は翌月待ちだけになる
- 比較する既存表示: `apps/web/app/components/hollow/ImportJobs.tsx:349–355`は`job.failure === "LLM_MONTHLY_LIMIT"`だけで分岐し、全形式へ「text・DOCX・XLSX・PPTX・対応PDFは LLM を使わず明示的に取り込むこともできます。AI 必須形式は次の月間枠をお待ちください。」を併記する。P11で音声をこの表示へ接続すると、原文が音声について除いた案内が残る。非音声の受入済み表示を変更する要求ではなく、音声側の条件をbriefへ残す指摘である

## 条件5への反例

規定の形を満たす反例は特定しなかった。

## 条件6への反例

規定の形を満たす反例は特定しなかった。新しい音声UIの画面・幅を実測した結果ではない。

## 5/6外の追加観察

### O1: 音声二段化ではモデルselectorの用途ラベルを具体化する必要がある

- 対象ID: IN-02、IM-06
- 元引用: `spec/scenario/integration.md:35–40`は用途別選択、`spec/scenario/import.md:15`は音声認識とLLM構造化の二段、`:157`は使用モデルと任意追加指示の入力を要求する
- design箇所: `.goal-implement/design.md:273`は「音声は既本文modelIdと認識modelの2selectors」とする
- 比較対象: `apps/web/app/components/hollow/OpenRouterSettings.tsx:284–290`には用途を示す「文章・PDF用モデル」「画像用モデル」「音声文字起こし用モデル」がある。既存再生成の`apps/web/app/components/hollow/LlmNoteAction.tsx:551–568`のラベルは単一の「モデル」である
- 未確定点: 新selectorを併置する際の実際のラベルと順序は設計に記載されていない。「モデル」をそのまま残すと、本文構造化用であることが説明文なしには分からない。設計に二つの用途が書かれているため、ラベルもその用途へ変わる可能性を排除できず、条件6の反例には数えない

### O2: optionalなtransport値を内部の音声／非音声unionへ変える地点が未指定

- 対象ID: IM-06
- design箇所: `.goal-implement/design.md:273`は「再生成transportのoptional sttModelId（1..255）はaudio必須/non-audio拒否をusecase/VOで整合させる」とする。`:255–257`は音声recipeとplanの判別を定める
- 比較対象: `packages/core/src/domain/integration/openRouter.ts:71–82`は`chat-text`と`stt-transcription`の選択を別のkindで型化する。`packages/core/src/domain/llm/entity.ts:49–70`は形式とpreparation/prompt versionをunionの各枝へ拘束する。既存再生成入力`packages/core/src/application/llm/request.ts:266–276`は非音声用の入力である
- 未確定点: 外部optional値を既存入力へ足すこと自体は、原本形式を認可済みDBから決める境界で必要になりうる。VO構築後も任意値のまま`admitLlm`以降へ流すのか、audioでは必須・非audioでは`never`の内部入力へ変えるのかは設計に記載されていない。後者をdesignが禁止している根拠はなく、条件5の反例には数えない

### O3: 既存の音声未提供案内が届くUIを設計の変更範囲へ含める必要がある

- 対象ID: IN-01、IM-01/02
- 元引用: `spec/scenario/integration.md:14–16`は連携後の音声認識モデル設定と音声構造化、`spec/scenario/import.md:82`は未連携時と明示noAI時で異なる開始前件数警告を要求する
- design箇所: `.goal-implement/design.md:271–275`は進捗projection、再生成selectors、音声の縦接続を記載するが、アップロードと連携説明の置き換えは列挙していない
- 比較対象: `apps/web/app/components/hollow/ImportUpload.tsx:308–313`は音声のAI変換未提供と案内し、同ファイル`:367`および`apps/web/app/components/hollow/OpenRouterSettings.tsx:172`にも音声未提供の説明がある
- 未確定点: 実装者が元シナリオに従って説明も更新できるため、設計がこれらを保持すると断定できない。新音声の画面が存在するという実測を作らず、変更が届く先の観察として残す

## 読んだ根拠

- `spec/requirements.md`、`spec/scenario/import.md`、`spec/scenario/integration.md`、`spec/scenario/jobs.md`
- `.goal-implement/brief.md`、`.goal-implement/design.md`、`CLAUDE.md`、委譲に含まれるAGENTS指示
- `spec/design/index.md`と本文に引用した既存の型・入力・UI
- `goal-implement/SKILL.md`の独立した読みと完了の定義、`_shared/references/review-lenses.md`

条件5/6の成立・合格は認定しない。音声の実装候補、動作、UI幅についての検証結果は含まない。
