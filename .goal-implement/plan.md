# Hollow main 再確認と実装再開計画

元の依頼: 2026-10-08 の再確認指示、2026-10-09 の修正つき承認と resume.md からの継続指示。作業場所: `.goal-implement/`。対象コミット: `ac0894acb78be85f8b10c3c7450fbb00a8c40561`。

main の再確認は完了し、以下のフェーズ計画は利用者の修正つきで承認済み。Hollow 全体の完成は、brief の対象範囲にあるノートの取り込み・編集・整理・共有・書き出し・非同期処理・アカウント・連携・ワークスペースの利用者体験と統合検証が揃うこと。resume.md からの継続指示により P00 から実装を再開する。

## 現在地

現在: P02 第一候補の独立検証 / done 16/94 / review 1 / 更新 2026-10-09T14:13:36.600854+09:00
障害: 音声/D01/外部実接続は条件待ち。
次: ED09受入済み。候補bec816a（code9671f3d）のED11を独立Verifierがbrowser確認中。残9IDは継続待ち。
受入: P00/P01完了、ED09合格。P02候補は独立全3962件pass/skip0・型/静的/build成功。

## 台帳の規則

シナリオ原文の ID は79個。各IDにつき1項目、体験・非機能・品質14項目とD01を加え94項目。工程の分割で項目を増やさない。条件は原文の正常系・異常系全体（briefにある利用者決定を優先）。下の完了条件は利用者から観測できる結果の要約であり、原文の条件を省略しない。

Verifier は対象コミットに対して実行したリポジトリのテスト・ブラウザ操作だけを根拠に報告する。コミットIDを付け、archiveは手がかりだけに使う。シナリオの done 条件は、主要な正常系のブラウザ確認と異常系のリポジトリ自動テスト（integration/e2e）の成功の両方。UX はブラウザで確認する。全条件の合格と根拠が揃った項目はその時点で受け入れ、フェーズ末の一括受け入れを待たない。異常系のブラウザ未検証だけを差し戻し理由にしない。台帳の残条件にある「browser未検証」は baseline の観測範囲であり、今後はこの検証分担に従って不足を補う。部分的に動く項目はin_progress、動かない項目はpending、未検証は明記し成功/失敗へ読み替えない。D01・音声等の利用者待ちはblockedとして残す。

外部依存はbriefの契約検証段階。実アダプターの資格情報がある場合だけ実行する契約テストも確認する。契約合格と実接続成功は分ける。

停滞の目安は15分。差し戻しは同一項目3周まで、分割は1段まで、フェーズ数が初期計画の2倍を超えたら利用者へ確認する。

## 要件との対応

旧 R01–R12 は集約表示として残し、受け入れ項目は増やさない。集約の合格は対応する全項目の合格時だけ。旧 acceptance の数値や archive の根拠を引き継がない。

| 集約 | 対応する固定項目 |
| --- | --- |
| R01 認証 | AC-01–06、AC-08 |
| R02 作成・編集 | ED-01–05、ED-07–08、ED-11 |
| R03 取り込み | IM-01–05 |
| R04 メディア・削除 | ED-06、ED-09–10 |
| R05 整理 | OR-01–12 |
| R06 共有・発見 | SH-01–08、DS-01–06 |
| R07 ワークスペース | WS-01–10 |
| R08 外部連携・再生成 | IN-01–09、IM-06（契約/実接続を区別） |
| R09 書き出し | EX-01–04 |
| R10 処理履歴 | JB-01–03 |
| R11 プロフィール・退会・使用量 | AC-07、AC-09–10 |
| R12 体験・品質・統合 | UX-*、NFR-*、QA-* と全シナリオ。D01 は保全の別項目 |

## baseline の集計

部分的は不具合だけでなく未検証条件も含む。未着手は新台帳で未受入/未着手の状態であり、既存実装の不存在を意味しない。IN-06/IN-07/D01は未検証として明記し、動かないと推測しない。

| 原文 | done | 部分的 | 未着手 |
| --- | ---: | ---: | ---: |
| account.md | 0 | 9 | 1 |
| integration.md | 0 | 7 | 2 |
| import.md | 0 | 6 | 0 |
| editing.md | 0 | 11 | 0 |
| organize.md | 0 | 12 | 0 |
| sharing.md | 2 | 6 | 0 |
| workspace.md | 0 | 10 | 0 |
| discovery.md | 0 | 6 | 0 |
| export.md | 0 | 4 | 0 |
| jobs.md | 0 | 3 | 0 |
| requirements.md | 5 | 9 | 0 |
| D01 | 0 | 0 | 1 |
| 合計 | 7 | 83 | 4 |

## 承認済みフェーズ計画

承認済みの初期計画は P00–P13 の14フェーズ。各行の対象は全て未完の固定IDで、各フェーズは少なくとも1項目をdoneにできる範囲。分け直しは1段まで、28フェーズを超えたら利用者へ確認。同一IDの差し戻しは3周まで。既存コードが条件を満たす部分は検証の不足を埋め、必要な不具合だけ修正する。各候補をコミットしてからVerifierへ渡す。全体管理ファイルはManagerだけが更新する。

音声に依存しない取り込み条件はP06/P09等の作業と並行して同じIM-IDへ記録し、音声未完のままIM-01/02/03/06をdoneにしない。P11は音声再開指示待ち、P12はD01の承認/回復元待ち。利用者待ちの間は依存しないフェーズへ進む。P13 は音声以外の UX と主要シナリオの統合検証で、P11 を依存先にしない。音声の固定項目は未完のまま残してよいが、音声/D01/実接続待ちがある間は Hollow 全体の完成にはしない。

| フェーズ | 目的・変更範囲 | doneにする対象ID | 依存 | 完了条件 |
| --- | --- | --- | --- | --- |
| P00 | テストスイートを緑にする | QA-TEST | — | 現在のスキーマと契約に合わせて unit/Node integration の失敗を直し、Node のバージョンを flake.nix に固定する。fixture/migration期待数/固定ディレクトリ衝突を解消し、テストが示す製品不具合は製品を直す。テスト削除・skipで緑にせず、pnpm test と規定の型/静的チェックが成功し QA-TEST を done にする。 |
| P01 | 登録・認証・認証手段の追加解除 | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-08 | P00 | 主要な正常操作をブラウザで確認し、認証異常系はリポジトリの integration/e2e で検証する。Google/メールの代替・条件付き実アダプター契約を揃え、AC-08の着地先を要件に合わせる。 全スイートが緑のままであること。 |
| P02 | ノート作成・三編集モード・メディア・ゴミ箱 | ED-01, ED-02, ED-03, ED-04, ED-05, ED-06, ED-07, ED-08, ED-09, ED-10, ED-11 | P01 | 保存・破棄・競合・失権、三編集モード、媒体、スタイル、復元と完全削除を利用者経路で受け入れる。 全スイートが緑のままであること。 |
| P03 | ワークスペースとロール | WS-01, WS-02, WS-03, WS-04, WS-05, WS-06, WS-07, WS-08, WS-09, WS-10 | P01, P02 | 複数利用者で招待・参加・ロール・除名・脱退・公開・削除を検証し、脱退前の移動導線を接続する。 全スイートが緑のままであること。 |
| P04 | 一覧・検索・タグ・一括操作・所属先移動 | OR-01, OR-02, OR-03, OR-04, OR-05, OR-06, OR-07, OR-08, OR-09, OR-10, OR-11, OR-12 | P02, P03 | browse/tagのfixtureを現schemaに揃え、全表示形式と絞り込み・タグ管理・一括・移動の正常/異常を受け入れる。 全スイートが緑のままであること。 |
| P05 | プロフィール・共有・公開検索 | AC-07, SH-01, SH-02, SH-03, SH-05, SH-07, SH-08, DS-01, DS-02, DS-03, DS-04, DS-05, DS-06 | P02, P03, P04 | 公開範囲の誤説明を修正し、handle変更後のURL維持、公開/限定/非公開と検索・SEOの全条件を受け入れる。 全スイートが緑のままであること。 |
| P06 | OpenRouter・使用量・取り込み先と参照 | IN-01, IN-02, IN-03, IN-08, AC-10, IM-04, IM-05 | P01, P02, P03 | 代替providerで認可・モデル保存/適用・解除・失効と使用量を検証する。取り込み先の権限/途中失権、ローカル参照fixtureで取得/差替/SSRF・上限を受け入れる。 全スイートが緑のままであること。 |
| P07 | Drive連携・保存先・バックアップ・再生成 | IN-04, IN-05, IN-06, IN-07, IN-09 | P01, P02, P03, P06 | 旧branchのコミット候補を必要範囲で取り込み、Web要求経路を接続する。現schemaの契約環境で保存先確認・バックアップ・本文採用/巻戻し・解除を受け入れる。 全スイートが緑のままであること。 |
| P08 | 個別・閲覧者・一括書き出し | EX-01, EX-02, EX-03, EX-04 | P02, P03, P05 | HTML/Markdown/PDF/ZIPを構成済みローカル環境で生成/取得し、部分失敗・取消・期限・権限変更を受け入れる。 全スイートが緑のままであること。 |
| P09 | 処理履歴・再試行・取消・画面を閉じた後の継続 | JB-01, JB-02, JB-03, NFR-ASYNC | P06, P07, P08 | 各job種別の親子結果・再試行・取消・履歴保持を確認し、画面を閉じる前後と再起動後の進捗/結果を観測する。 全スイートが緑のままであること。 |
| P10 | 退会と関連データ | AC-09 | P03, P07, P09 | 退会branchを現在mainと統合し（P01の0044とのmigration番号衝突を解消）、最後owner拒否・即時失効・非同期回収・存続WS/移動済ノート保持を受け入れる。 全スイートが緑のままであること。 |
| P11 | 音声と取り込み/再構造化の全形式 | IM-01, IM-02, IM-03, IM-06 | P06, P07, P09 | 音声再開指示後にprivacy条件を満たす方式を接続する。非音声の不足も同じ固定IDで埋め、単体/複数・全形式・公開保留・再生成/復元を受け入れる。 全スイートが緑のままであること。 |
| P12 | D01の保全残件 | D01 | P00（作業はD01の承認/回復元待ち） | 利用者の承認と回復元がある場合にのみ、未復元37objectsの復元または扱い決定を完了する。旧環境の非操作制約を勝手に解除しない。 全スイートが緑のままであること。 |
| P13 | 体験要件・品質・統合検証 | UX-LOCATION, UX-STATE, UX-KEYBOARD, UX-VISUAL, UX-READING, UX-MOBILE, NFR-JAPANESE | P01, P02, P03, P04, P05, P06, P07, P08, P09, P10 | 音声以外の日本語・キーボード・視覚導線・読書・モバイル・公開状態と主要シナリオを統合検証する。音声の項目は未完のまま保持する。 全スイートが緑のままであること。 |


## 完了台帳

| ID | 原文 | 観測できる完了条件 | 検証 | 依存ID | フェーズ | 状態 / 動作 | 根拠・不足条件 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | [account.md](../spec/scenario/account.md) | 受信したメールのリンクを、確認を要求したのと同じブラウザーで開くと、メールアドレスが確認済みになりサインイン状態でノート一覧に着地する。ノートが 1 件もないため、最初のファイルをアップロードするよう促す案内が表示される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | — | P01 | done / 動く | [P01独立報告](reviews/P01.md)。候補49d5a54（code db096a4）、独立正常browser/異常integration＋SMTP FIFO/Unicode修復合格。全3936件pass/skip0・型/静的/build成功。Google/メール実接続は未検証（契約段階受入）。 |
| AC-02 | [account.md](../spec/scenario/account.md) | 確認メールのリンクを開く。確認を要求したのと同じブラウザーで開いた場合は、確認が完了しサインイン状態でノート一覧に遷移する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-01 | P01 | done / 動く | [P01独立報告](reviews/P01.md)。候補49d5a54（code db096a4）、独立正常browser/異常integration＋SMTP FIFO/Unicode修復合格。全3936件pass/skip0・型/静的/build成功。Google/メール実接続は未検証（契約段階受入）。 |
| AC-03 | [account.md](../spec/scenario/account.md) | サービスに戻り、初回であればアカウントが作成され、2 回目以降は既存アカウントにサインインする。ノート一覧に着地する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P01 | done / 動く | [P01独立報告](reviews/P01.md)。候補49d5a54（code db096a4）、独立正常browser/異常integration＋SMTP FIFO/Unicode修復合格。全3936件pass/skip0・型/静的/build成功。Google/メール実接続は未検証（契約段階受入）。 |
| AC-04 | [account.md](../spec/scenario/account.md) | サインイン画面でメールアドレスとパスワードを入力する。認証に成功し、直前に開こうとしていた画面（なければノート一覧）に遷移する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-01 | P01 | done / 動く | [P01独立報告](reviews/P01.md)。候補 dc714a9（code4102048）、独立browserでpassword signinと保護URL復帰、異常を含む全3926件pass/skip0。新PasswordFieldsの欠陥の影響なし。 |
| AC-05 | [account.md](../spec/scenario/account.md) | メールのリンクを開き、新しいパスワードを 2 回入力して確定する。完了後、他のすべてのセッションが無効化され、新しいパスワードでサインインする。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P01 | done / 動く | [P01独立報告](reviews/P01.md)。候補49d5a54（code db096a4）、独立正常browser/異常integration＋SMTP FIFO/Unicode修復合格。全3936件pass/skip0・型/静的/build成功。Google/メール実接続は未検証（契約段階受入）。 |
| AC-06 | [account.md](../spec/scenario/account.md) | パスワードが設定済みの場合は「変更」を選び、現在のパスワードと新しいパスワードを入力して更新する。不要な方法は「解除」を選び、確認ダイアログを経て削除する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P01 | done / 動く | [P01独立報告](reviews/P01.md)。候補49d5a54（code db096a4）、独立正常browser/異常integration＋SMTP FIFO/Unicode修復合格。全3936件pass/skip0・型/静的/build成功。Google/メール実接続は未検証（契約段階受入）。 |
| AC-07 | [account.md](../spec/scenario/account.md) | 表示名、アイコン画像、自己紹介、公開ハンドル（公開ページの URL に使う一意の文字列）を編集する。保存すると、公開ページとタイムラインの表示に反映される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: icon browser・重複候補/予約語即時検知・public表示反映・URL維持の統合未確認。 |
| AC-08 | [account.md](../spec/scenario/account.md) | 上部バーのアカウントメニューから「サインアウト」を選ぶ。セッションが破棄され、トップページに遷移する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P01 | done / 動く | [P01独立報告](reviews/P01.md)。候補 dc714a9（code4102048）、browserでトップ着地/他session失効と現在維持/未保存confirm取消と確定、期限切れ/失効integration合格。修復2件の影響なし。 |
| AC-09 | [account.md](../spec/scenario/account.md) | 確認のため自分のメールアドレスを入力する。実行すると即座にサインアウトされ、アカウントと関連データが削除される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P10 | pending / 動かない | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: mainでは退会を実行する製品操作を確認できない。削除本体/関連データ/最後owner/公開URL失効を未検証。退会branch統合後に受け入れる。 |
| AC-10 | [account.md](../spec/scenario/account.md) | owner または editor として参加しているワークスペースについても、ワークスペースごとの使用量と上限が表示される。当月の LLM 実行回数と上限が表示される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P06 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 設定の使用量画面、個人/参加WS全使用量・ノート数・80%/100%警告/削除導線を未確認。 |
| IN-01 | [integration.md](../spec/scenario/integration.md) | 連携を待って本文の生成が止まっていたノートがあれば、その件数が示され、一覧へ移動できる。以降、画像・音声・テキストのない PDF のアップロードで LLM による構造化が使えるようになる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P06 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 音声AIは保留。待機件数/初回限定案内、uploadreturn、鍵無効/キャンセルUIと条件付き実adapter契約testが未確認。 |
| IN-02 | [integration.md](../spec/scenario/integration.md) | 用途ごとにモデルを選ぶ。保存すると、以降の変換に反映される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04, IN-01 | P06 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 保存後の実変換反映・提供終了error・再試行browser未検証。音声保留。 |
| IN-03 | [integration.md](../spec/scenario/integration.md) | 解除後にできなくなること（LLM を要する変換・再生成）の説明を読んで確定する。保存されていた鍵が破棄され、未連携の表示に戻る。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04, IN-01 | P06 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 生成済本文残存/進行job取消・解除後再連携誘導browser未確認、実adapter契約testなし。 |
| IN-04 | [integration.md](../spec/scenario/integration.md) | サービスに戻り、連携済みと表示される。バックアップ先フォルダの設定（IN-05）へ進む導線が表示される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P07 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 構成済代替adapterのbrowser正常認可・folder設定/保存先喪失確認/解除を未検証。実サービス接続は禁止。 |
| IN-05 | [integration.md](../spec/scenario/integration.md) | 「アップロード時に元ファイルを自動バックアップする」のオン / オフを切り替える。保存する。正常系全体と異常系は原文の当該シナリオに従う。保存先不明時は確認後に再選択/新規作成し、無断で再作成しない（briefの利用者決定を優先）。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04, IN-04 | P07 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 構成済代替adapterのbrowser正常認可・folder設定/保存先喪失確認/解除を未検証。実サービス接続は禁止。 |
| IN-06 | [integration.md](../spec/scenario/integration.md) | バックアップジョブが登録され、進捗が表示される。完了すると、ノートに「バックアップ済み」の表示と Drive 上のファイルへのリンクが付く。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04, IN-04, IM-01 | P07 | pending / 未検証 | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 手動/自動バックアップの端から端browser、バックアップ完了fileリンク、再試行/取消未検証。guardは設定不備と実装失敗を区別。 |
| IN-07 | [integration.md](../spec/scenario/integration.md) | 元ファイルが Drive から取得され、変換ジョブが実行される。完了後、新しい本文でノートが更新される。タグ・公開設定・共有リンクは維持される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04, IN-06 | P07 | pending / 未検証 | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: mainのDrive再生成を起動する製品経路・本文更新/設定維持未検証。branch差分の独立受け入れが必要。 |
| IN-08 | [integration.md](../spec/scenario/integration.md) | 連携ごとの設定（モデル、バックアップ先）への導線が表示される。連携に関わる処理の結果は処理履歴（JB-01）で確認する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P06 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 一画面で各状態/最終利用/期限・失効表示、履歴結果のbrowser未検証。実adapter条件付き契約test不足。 |
| IN-09 | [integration.md](../spec/scenario/integration.md) | 解除後もバックアップ済みのファイルは Drive に残ること、再生成（IN-07）ができなくなることの説明を読んで確定する。トークンが破棄され、未連携の表示に戻る。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04, IN-04 | P07 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 構成済代替adapterのbrowser正常認可・folder設定/保存先喪失確認/解除を未検証。実サービス接続は禁止。 |
| IM-01 | [import.md](../spec/scenario/import.md) | 変換が完了すると本文が現れ、一覧の表示も更新される。非公開以外の公開ステータスを指定していた場合は、この時点で適用される（変換が完了するまでノートは非公開のまま）。自動バックアップ（IN-05）が有効な場合、変換の成否とは独立してバックアップジョブが登録される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P11 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 公開設定保留適用/公開開始前検出/通信再開・容量上限/全形式/自動backup全体はbrowser未検証。音声AI保留。 |
| IM-02 | [import.md](../spec/scenario/import.md) | アップロードを開始すると、ファイルごとに個別の進捗が表示される。完了後、成功件数と失敗件数の内訳が表示され、失敗分は理由つきで一覧される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P11 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 公開設定保留適用/公開開始前検出/通信再開・容量上限/全形式/自動backup全体はbrowser未検証。音声AI保留。 |
| IM-03 | [import.md](../spec/scenario/import.md) | 完了すると通知が表示され、ノート一覧に反映される。処理履歴（JB-01）から過去の取り込み結果を確認できる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P11 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 公開設定保留適用/公開開始前検出/通信再開・容量上限/全形式/自動backup全体はbrowser未検証。音声AI保留。 |
| IM-04 | [import.md](../spec/scenario/import.md) | 既定値は、直前に表示していたタイムラインの文脈（個人 / ワークスペース）に一致する。選択した先にノートが作成される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P06 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: browserの取り込み先selector（現在scopeを切替える導線のみ）/viewer非表示・除名途中失敗未確認。 |
| IM-05 | [import.md](../spec/scenario/import.md) | スタイルシートは、取得できた内容をノートの本文に直接埋め込む。読み込み元への参照は残らないため、後から配布元が消えても中身が変わっても、取り込んだ時点の見た目がそのまま保たれる。ノート詳細に、取り込んだリソースの件数と一覧を表示する。この表示は**そのノートを読める人なら誰でも見られ、いつまでも残る** — 取り込みを実行したのが自分でなくても、ワークスペースの他のメンバーが取り込んだものでも見られる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04 | P06 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: ブラウザ参照取得・同梱資源差替・外部CSS保持/除去理由・上限/SSRF全面の観測は未完。実サービス接続禁止なのでポート契約段階で検証。 |
| IM-06 | [import.md](../spec/scenario/import.md) | 完了後、新しい本文に更新される。タグ・公開設定・共有リンクは維持される。直前の本文に「元に戻す」で戻せる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（契約検証） | AC-04, IM-01, IN-01 | P11 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 生成器代替adapterで製品本文再生成/復元/失敗を未検証。未構成と実装不在を区別する。音声保留。 |
| ED-01 | [editing.md](../spec/scenario/editing.md) | 入力すると自動保存され、非公開のノートとして作成される。「完了」を選ぶとノート詳細に遷移する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04 | P02 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 通信退避、空下書き非作成、複数tab通知の異常系が未検証。 |
| ED-02 | [editing.md](../spec/scenario/editing.md) | 文字を書き換えると、対応するテキストノードのみが更新される。保存すると、元の構造・装飾を保ったまま本文が更新される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P02 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 構造変更拒否、空ノード、script/style非対象、他者競合のbrowser未検証。直接heading中央clickは一意境界選択不可の案内、一覧経由成功。 |
| ED-03 | [editing.md](../spec/scenario/editing.md) | 編集すると、隣（または切り替え）でプレビューが更新される。保存すると、サニタイズを経て本文が更新される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P02 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 800KB拒否、外部CSS参照取り込み、壊れた構文警告の全異常系未検証。 |
| ED-04 | [editing.md](../spec/scenario/editing.md) | 警告を了解して進むと、リッチテキストとして編集できる。保存すると、エディタの表現に沿って正規化された HTML で本文が更新される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P02 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: HTML由来警告、警告再表示、版復元、重い表の案内のbrowser観測未検証。 |
| ED-05 | [editing.md](../spec/scenario/editing.md) | 未保存の変更がある場合は、保存してから切り替える旨の確認が出る。切り替えると、同じ本文が新しいモードで開かれる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P02 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 利用者端末既定の再訪/別ブラウザ、新規WYSIWYG固定/空visual拒否まで未検証。 |
| ED-06 | [editing.md](../spec/scenario/editing.md) | 完了すると、保存先の URL を参照する要素が挿入される。画像は代替テキストを入力できる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P02 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 全対応形式/20MB200MB/離脱/失敗placeholder/一定期間回収のbrowser全異常系未検証。 |
| ED-07 | [editing.md](../spec/scenario/editing.md) | ノート詳細または編集画面でタイトルを選んで書き換える。入力を終えると自動保存され、一覧・タイムライン・共有ページの表示に反映される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P02 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 空タイトル/200文字/重複/一覧共有反映の全条件未検証。 |
| ED-08 | [editing.md](../spec/scenario/editing.md) | 明示的に「保存」を選ぶこともできる。「破棄」を選ぶと、最後に保存した状態に戻る。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P02 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 通信再試行/権限喪失ダウンロード/競合解決/20版復元を未検証。 |
| ED-09 | [editing.md](../spec/scenario/editing.md) | 確認のうえ実行すると、ノートはゴミ箱に移り、一覧から消える。削除直後は画面上の「元に戻す」で取り消せる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P02 | done / 動く | [P02第一候補の独立報告](reviews/P02-first.md)。候補bec816a（code9671f3d）、所有者の削除確認→一覧除去→Undo復元とviewer操作非表示をbrowser確認。処理取消・権限・intent race・公開/共有URL失効/復元integration合格、全3962件pass/skip0・型/静的/build成功。 |
| ED-10 | [editing.md](../spec/scenario/editing.md) | 個別に「完全に削除」を選ぶと、確認のうえ復元できなくなる。「ゴミ箱を空にする」ですべてを完全削除できる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P02 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 完全削除の実操作、媒体/版回収、期限自動削除、WS削除、50超非同期、viewer拒否未検証。 |
| ED-11 | [editing.md](../spec/scenario/editing.md) | 切り替えると、その場で表示が変わる。設定はノートごとに保持され、共有ページ・公開ページ・HTML の書き出しにも反映される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P02 | review / 正常browser・異常integration成功候補 | [P02実装報告](phases/P02.md)。候補bec816a（code9671f3d）、独立検証待ち。残9編集IDは未完。全3962件pass/skip0。 |
| OR-01 | [organize.md](../spec/scenario/organize.md) | 各ノートはサムネイル（本文の先頭部分から生成）、タイトル、更新日時、タグ、公開ステータスとともに表示される。スクロールすると続きが読み込まれる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: scroll pagination、processing/needs_ai、filter0件、loading skeletonが未検証。browse14testsはaccounts fixture列数不一致で失敗。 |
| OR-02 | [organize.md](../spec/scenario/organize.md) | カレンダー: 月表示で、作成日ごとにノートを配置する。選んだ形式は次回以降も引き継がれる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 多数日otherN展開/別browser同URL完全復元未検証。browsefixture14失敗。 |
| OR-03 | [organize.md](../spec/scenario/organize.md) | 各結果に、一致箇所の抜粋がハイライトつきで表示される。候補を選ぶとそのノートが開き、検索語を条件として一覧に持ち帰るとチップ列に積まれてタグ・月の絞り込みと組み合わせられる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 1文字/flare不一致（flareは検索中まで観測し結果確定前変更）/timeout/processing/URL持帰り/filters0提案全異常未検証。browsefixture14失敗。 |
| OR-04 | [organize.md](../spec/scenario/organize.md) | 複数選んだ場合は、すべてを持つノート（AND）に絞り込まれる。選択したタグはチップとして表示され、個別に解除できる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: AND複数選択/解除/タグ全外し0件/多数検索未検証。tag/browse fixture失敗。 |
| OR-05 | [organize.md](../spec/scenario/organize.md) | その月に作成されたノートに絞り込まれる。選択は解除できる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: ユーザーtimezone境界/0件月/解除の全挙動未検証。 |
| OR-06 | [organize.md](../spec/scenario/organize.md) | 選ぶと即座にタグが付き、一覧の表示に反映される。付いているタグはその場で外せる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 楽観rollback/同タグduplicate/50上限/正規化/他者viewer/他文脈非共有を未検証。tag fixture失敗。 |
| OR-07 | [organize.md](../spec/scenario/organize.md) | OR-06 と同じ入力・候補・新規作成の操作でタグを付ける。付いたタグを選ぶと、そのタグで絞り込んだ一覧へ移動できる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 権限/楽観rollback/50上限/正規化duplicate/タグlink遷移未検証。tags14testsはaccounts fixture列数不一致で失敗。 |
| OR-08 | [organize.md](../spec/scenario/organize.md) | タグを削除すると、すべてのノートから外れる（ノートは消えない）。既存のタグと同じ名前に変更した場合は統合するかを確認し、統合すると両方のノートが片方のタグにまとめられる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 空白拒否/同名merge確認/削除影響件数/unused複数整理/viewer非表示未検証。tags14 fixture失敗。 |
| OR-09 | [organize.md](../spec/scenario/organize.md) | 操作を選ぶと、必要に応じて確認ダイアログを経て実行される。完了後、成功件数と失敗件数の内訳が表示される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: tag/public/move/delete/Driveの一括実動、部分失敗理由、viewer/500上限/条件変更選択解除未検証。 |
| OR-10 | [organize.md](../spec/scenario/organize.md) | 選択が即座に一覧へ反映される。選択は URL に反映され、次回以降も引き継がれる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 複数日本語titleの安定順、全sort6方向/検索関連度既定未検証。 |
| OR-11 | [organize.md](../spec/scenario/organize.md) | 編集権限があれば、編集・共有・タグ付け・移動・ダウンロード・削除の操作が表示される。元ファイルがある場合は、その名前・形式・サイズと、バックアップの状態が表示される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: processing/needs_ai/failed/失権/不存在/長文見出しなど全異常系未検証。 |
| OR-12 | [organize.md](../spec/scenario/organize.md) | 移動先を選ぶと、移動後に誰が閲覧できるようになるか / できなくなるかが具体的に示される。確定すると即座に移動する。公開ページと共有リンクの URL は変わらない（アプリ内でのノートの URL は、新しい所属先の文脈のものに変わる）。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P04 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: viewer候補除外/同名tag付替/権限喪失/processing拒否等未検証。 |
| SH-01 | [sharing.md](../spec/scenario/sharing.md) | 公開を選ぶと、公開タイムラインと検索の対象になる旨の確認が出る。変更は即座に反映される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: public/nonpublic切替、WS公開slugs/processing/viewer browser未検証。 |
| SH-02 | [sharing.md](../spec/scenario/sharing.md) | 共有リンクが表示され、「コピー」でクリップボードにコピーできる。コピーされたことがその場で示される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: clipboardコピー成功通知/権限denied fallbackのbrowser結果未観測、public linkとprivateへの戻し未検証。 |
| SH-03 | [sharing.md](../spec/scenario/sharing.md) | 以降、共有リンクを開いた閲覧者にはパスワードの入力が求められる。設定済みのパスワードは変更・解除できる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 変更後grant失効/解除確認/public切替解除をbrowser未検証。 |
| SH-04 | [sharing.md](../spec/scenario/sharing.md) | 既存のリンクが使えなくなる旨の確認を経て実行する。新しいリンクが発行され、古いリンクは無効になる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | baseline | done / 動く | [今回のVerifier根拠](reviews/baseline-content.md) |
| SH-05 | [sharing.md](../spec/scenario/sharing.md) | タイトル、著者の表示名、更新日時、タグが表示される。ダウンロードのボタンからノートを保存できる（EX-04）。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: owner edit導線、取れない外部resourceの本文継続、private/deleted/common error browser未検証。 |
| SH-06 | [sharing.md](../spec/scenario/sharing.md) | 正しいパスワードを入力すると本文が表示される。通過した状態は一定期間（24 時間）その端末で保持され、再入力を求められない。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | baseline | done / 動く | [今回のVerifier根拠](reviews/baseline-content.md) |
| SH-07 | [sharing.md](../spec/scenario/sharing.md) | 著者の公開ページ、ノートに付いたタグ、（ワークスペース所有なら）ワークスペースの公開ページへのリンクが表示される。ダウンロードのボタンからノートを保存できる。正常系全体と異常系は原文の当該シナリオに従う。公開handle変更後もnote URLと限定tokenを維持する（briefの利用者決定を優先）。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: creatorhandle変更のURL保持（brief優先）/完全削除等のbrowser未検証、PDFは配備なし。 |
| SH-08 | [sharing.md](../spec/scenario/sharing.md) | バッジを選ぶと、現在の設定で誰が閲覧できるかが具体的に説明される（例: 「ワークスペース『設計』のメンバー 5 名とリンクを知っている人」）。パスワード保護の有無、共有リンクの有無もあわせて示される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: public閲覧人のdetail誤説明修正。具体WS人数/viewer/一覧badgeクリック未検証。 |
| WS-01 | [workspace.md](../spec/scenario/workspace.md) | 作成すると、自分が owner として参加した状態のワークスペースができる。作成直後のワークスペースに切り替わり、メンバー招待への導線が表示される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04 | P03 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: slug重複の入力中検出と代替候補提示をbrowser未確認。20件上限/名前空/予約語はbackend test範囲、UI全異常未検証。 |
| WS-02 | [workspace.md](../spec/scenario/workspace.md) | 選ぶと、その文脈のノート一覧に切り替わる。選択は URL に反映され、次回の訪問時にも引き継がれる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, WS-01 | P03 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: scope切替menuからの選択/次訪問維持/絞り込み解除・除名/削除済scopeの誘導をbrowser未検証。 |
| WS-03 | [workspace.md](../spec/scenario/workspace.md) | 招待リンクを含むメールが送られ、保留中の招待として一覧に表示される。招待リンクをコピーして自分で共有することもできる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, WS-01 | P03 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: owner招待確認・既存/重複/期限切れ再送/取消/上限・copy結果のbrowser全条件は未検証。 |
| WS-04 | [workspace.md](../spec/scenario/workspace.md) | サインインしていない場合はサインイン / サインアップを求められ、完了後に招待の確認へ戻る。「参加する」を選ぶとメンバーになり、そのワークスペースの一覧へ遷移する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, WS-01 | P03 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 招待期限切れ/取消/使用済・異email確認/辞退/削除済WSのbrowser表示は未検証。 |
| WS-05 | [workspace.md](../spec/scenario/workspace.md) | ロールのセレクターから別のロールを選ぶと即座に反映される。「除名」を選ぶと、確認のうえメンバーから外れる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, WS-01 | P03 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 別memberのrole変更/除名実行・対象ノート残存/編集中保存拒否をbrowser未検証。 |
| WS-06 | [workspace.md](../spec/scenario/workspace.md) | 脱退後はノートにアクセスできなくなる旨を確認する。実行すると、個人の文脈へ遷移する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, WS-01 | P03 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 脱退前移動導線は画面に「まだ利用できません」と表示し原文要求未充足。作成note残存・再招待のbrowser未検証。 |
| WS-07 | [workspace.md](../spec/scenario/workspace.md) | 名前、説明、アイコン、公開ページのスラッグを編集する。保存すると、スコープトークン・タイムライン・公開ページの表示に反映される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, WS-01 | P03 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: アイコン/slug変更旧URL失効/重複候補・非owner readonly全条件のbrowser未検証。 |
| WS-08 | [workspace.md](../spec/scenario/workspace.md) | 公開に切り替えると、公開ページの URL が表示され、コピーできる。非公開に戻すと、公開ページは見られなくなる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, WS-01 | P03 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 非公開への復帰・個別公開noteURL維持/slug未設定拒否・index削除遅延案内のbrowser未検証。 |
| WS-09 | [workspace.md](../spec/scenario/workspace.md) | タグでの絞り込みと検索ができる。ノートを選ぶとノートの公開ページ（SH-07）へ遷移する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, WS-01 | P03 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 公開noteの順序・タグ/検索絞り込み・note開く、非公開/不存在の同一応答とiconのbrowser未検証。 |
| WS-10 | [workspace.md](../spec/scenario/workspace.md) | 確認のためワークスペース名を入力する。実行すると、メンバー全員がアクセスできなくなり、個人の文脈へ遷移する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, WS-01 | P03 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 公開/限定noteURL全部の削除後応答・複数member同時無効・進行job取消をbrowser未検証。backendのみの対象条件も残る。 |
| DS-01 | [discovery.md](../spec/scenario/discovery.md) | 外部から見えるとおりの自分の公開ページが表示される（公開ノートのみ、新しい順）。「これは外部に公開されている表示です」というバナーと、設定への導線が表示される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, SH-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: handle未設定誘導/0件にWS所有除外説明が原文どおり含まれるか未検証。 |
| DS-02 | [discovery.md](../spec/scenario/discovery.md) | ワークスペース設定の「公開」から公開ページへの導線を選ぶ。WS-09 と同じ内容が表示され、外部向けの表示であるバナーが出る。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, SH-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 非公開WS公開URL否認/メンバーでの全path未検証。 |
| DS-03 | [discovery.md](../spec/scenario/discovery.md) | 選んだ文脈の一覧に切り替わる。公開タイムラインへは、個人ならアカウントメニューの「自分の公開ページ」から、ワークスペースならスコープトークンのメニューから移る。作業用の一覧へは同じ経路で戻る。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, SH-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: layout/sort継続、tag/month文脈独立、失権→個人復帰未検証。 |
| DS-04 | [discovery.md](../spec/scenario/discovery.md) | タグでの絞り込みと、そのページ内の検索ができる。ノートを選ぶと SH-07 の表示へ遷移する。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, SH-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 匿名表示/icon/不存在deleted/旧handle404/検索絞込のfullbrowser未検証。discoveryfixture失敗。 |
| DS-05 | [discovery.md](../spec/scenario/discovery.md) | 各結果にタイトル、抜粋、著者、更新日時、タグが表示される。タグと期間で絞り込める。タグは所属先をまたいで名前で一致させる。期間は**更新日時**（結果に表示される日時と同じ軸）で絞り込む。個人のノート一覧の月絞り込み（OR-05）が作成日時を軸にするのとは基準が異なる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, SH-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: crossaccount/crossWS多対象/期間updatedtimezone/短語/英語語頭/rate等未検証。discoveryfixture13失敗。 |
| DS-06 | [discovery.md](../spec/scenario/discovery.md) | 検索エンジンの結果からノートの URL を開く。ノートの本文が表示される（SH-07）。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, SH-01 | P05 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 完全削除404/非public内部設定noindexのfull検証不足、discoveryfixture失敗。 |
| EX-01 | [export.md](../spec/scenario/export.md) | HTML と Markdown は即座に生成されてダウンロードが始まる。PDF は生成に時間がかかるため、進捗を表示したうえで完了後にダウンロードが始まる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P08 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: PDF配備実生成/失敗/24h再DL、HTMLmedia埋込とMarkdown特殊要素のbrowser未検証。未設定を実装欠如とは扱わない。 |
| EX-02 | [export.md](../spec/scenario/export.md) | ZIP を生成するジョブが登録され、進捗が表示される。完了すると通知が表示され、ダウンロードできる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P08 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: browser実集合は1件。複数・duplicate名/500/1GB/除外/部分失敗/途中削除/全選択/PDF未検証。 |
| EX-03 | [export.md](../spec/scenario/export.md) | 完了すると通知が表示され、履歴からダウンロードできる。生成物は一定期間（7 日）保持され、その間は何度でもダウンロードできる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P08 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: browser失敗→再実行/キャンセル/期限超過/進行中新要求拒否未検証。 |
| EX-04 | [export.md](../spec/scenario/export.md) | 形式（HTML / Markdown / PDF）を選ぶ。EX-01 と同じ手順でダウンロードされる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P08 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: PDF未設定のため匿名ticket/進捗/再試行/共有generation待ち未検証。 |
| JB-01 | [jobs.md](../spec/scenario/jobs.md) | 親ジョブを開くと、子ジョブごとの結果を確認できる。ジョブが完了・失敗するとトーストで通知され、ティッカーの件数から外れる。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P09 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: browserで失敗子再試行/parent再開/取消結果、全job種別の履歴/保持期間/取消を未検証。 |
| JB-02 | [jobs.md](../spec/scenario/jobs.md) | 親ジョブの画面からは、失敗した子ジョブだけをまとめて再試行できる。失敗した子だけを再試行すると、いったん完了 / 失敗として終わっていた親ジョブは再び実行中に戻り、進捗が計算し直される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P09 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: browserで失敗子再試行/parent再開/取消結果、全job種別の履歴/保持期間/取消を未検証。 |
| JB-03 | [jobs.md](../spec/scenario/jobs.md) | 待機中の子ジョブは取り消され、既に実行中のものは完了を待って結果を残す。状態が「キャンセル済み」になり、内訳（完了 / 取り消し）が表示される。正常系全体と異常系は原文の当該シナリオに従う。 | ブラウザ正常系＋integration/e2e異常系（ローカル） | AC-04, ED-01 | P09 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: browserで失敗子再試行/parent再開/取消結果、全job種別の履歴/保持期間/取消を未検証。 |
| UX-LOCATION | [requirements.md](../spec/requirements.md) | 現在の個人/ワークスペースを常に判別できる | ブラウザ/契約検証 | — | P13 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 全主要操作・全画面の完了条件は未検証。 |
| UX-STATE | [requirements.md](../spec/requirements.md) | 変換状態と公開範囲を一覧と詳細の両方で判別できる | ブラウザ/契約検証 | — | P13 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: SH08誤説明解消とprocessing/needs_ai/failed/cancelled状態全画面確認。 |
| UX-KEYBOARD | [requirements.md](../spec/requirements.md) | キーボードとポインティングデバイスの双方から主要操作に到達できる | ブラウザ/契約検証 | — | P13 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 全主要操作・全画面の完了条件は未検証。 |
| UX-VISUAL | [requirements.md](../spec/requirements.md) | コマンドパレット以外にもすべての機能への視覚的な導線がある | ブラウザ/契約検証 | — | P13 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 全主要操作・全画面の完了条件は未検証。 |
| UX-READING | [requirements.md](../spec/requirements.md) | 読む画面は本文を主役にし、操作が本文から分離されている | ブラウザ/契約検証 | — | P13 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 全主要操作・全画面の完了条件は未検証。 |
| UX-MOBILE | [requirements.md](../spec/requirements.md) | モバイル幅でページ全体の横方向のはみ出しがない | ブラウザ/契約検証 | — | P13 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: calendar/table長文/全dialog展開や未接続機能画面を含む全条件未検証。初期navigation直後の測定も含むため全画面合格とはしない。 |
| NFR-PRIVACY | [requirements.md](../spec/requirements.md) | 公開取り下げや無効な共有リンクの応答から過去の存在・現在の状態を推測できない | ブラウザ/契約検証 | — | baseline | done / 動く | [今回のVerifier根拠](reviews/baseline-content.md) |
| NFR-HTML | [requirements.md](../spec/requirements.md) | アップロード/生成HTMLのCSSやscriptがアプリUIへ影響しない境界で表示される | ブラウザ/契約検証 | — | baseline | done / 動く | [今回のVerifier根拠](reviews/baseline-content.md) |
| NFR-ASYNC | [requirements.md](../spec/requirements.md) | 画面を閉じても長時間処理が継続し、進捗と結果を追跡できる | ブラウザ/契約検証 | — | P09 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: browserを閉じる操作の前後で長時間処理の進行を比較していない。PDF/ZIP/backup等のbrowser観測も未検証。 |
| NFR-JAPANESE | [requirements.md](../spec/requirements.md) | 利用者向けUIが日本語で提供される | ブラウザ/契約検証 | — | P13 | in_progress / 部分的に動く | [今回のVerifier根拠](reviews/baseline-content.md)。不足: 全主要操作・全画面の完了条件は未検証。 |
| QA-BUILD | [requirements.md](../CLAUDE.md) | mainで pnpm build が終了コード0となり生成アプリをローカル起動できる | コマンド | — | baseline | done / 動く | [今回のVerifier根拠](reviews/baseline-quality.md) |
| QA-TYPECHECK | [requirements.md](../CLAUDE.md) | mainで pnpm typecheck が終了コード0となる | コマンド | — | baseline | done / 動く | [今回のVerifier根拠](reviews/baseline-quality.md) |
| QA-LINT | [requirements.md](../CLAUDE.md) | mainで pnpm lint と pnpm format:check が終了コード0となる | コマンド | — | baseline | done / 動く | [今回のVerifier根拠](reviews/baseline-quality.md) |
| QA-TEST | [requirements.md](../CLAUDE.md) | mainで pnpm test が終了コード0となる | コマンド | — | P00 | done / 動く | [P00独立報告](reviews/P00.md)。候補 c63e600（code be7d41f）、通常 pnpm test 3847件成功/skip0、Node22.22.3固定、型/静的チェック/build/新規アプリ起動成功。 |
| D01 | [D01](brief.md) | 未復元の旧objects 37件（引き継ぎ値13,222 B）の保全が維持され、利用者が承認した復元または扱いの決定が完了する | 保全・利用者判断 | — | P12 | blocked / 未検証 | [今回のVerifier根拠](reviews/baseline-flows.md)。不足: 保全維持/37未復元objectsの復元又は扱い承認待ち。今回読取/照合しない。 |

## 外部実接続の再検証

契約合格と実接続成功は区別する。実接続は今回のフェーズの完了を増やす目的で別項目/細分フェーズにしない。利用者が検証段階を実接続へ変更した場合は同じIDの条件と状態を更新する。

| 依存・対象ID | 必要設定/承認 | 実接続手順 |
| --- | --- | --- |
| Google / AC-03・06 | OAuth clientとredirect URI、テスト利用者、本人確認方法・実認証の承認 | 登録/既存紐付け/追加本人確認/cancel/失効/解除を確認。秘密値は報告しない |
| メール / AC-01・02・05・WS-03・04 | 本番mailer設定、承認済み宛先・送信承認 | 確認/再設定/招待の到達・期限・再送・使用済み応答を確認 |
| OpenRouter / IN-01–03・08、IM-01–03・06 | PKCE/redirect、テスト利用者、privacy条件・モデル/使用量・費用承認 | 認可/モデル選択→実変換→取消/失効/解除/再連携を確認。論理30回上限と外部費用を区別 |
| Drive / IN-04–09 | OAuth/Picker設定、明示共有folder、同意scopeと実操作の承認 | 連携/保存先確認→原本backup→再生成/巻戻し→取消/解除。旧Google物は無断変更しない |

## 停止と再開

実装再開指示を受け、P00 から進める。status の terminal は null。音声は保留、D01 の復元/扱い決定と実サービス接続は別途条件待ち。これらに依存しないフェーズは継続する。必須の未完が残る間は全体完了にしない。

引き継ぎ: [resume.md](resume.md)（利用者指定でコミット対象外）。旧記録: [archive-index](archive-index.md)。worktree: [棚卸し](worktrees.md)。削除確認: [cleanup.md](cleanup.md)。再確認の根拠: [content](reviews/baseline-content.md)、[flows](reviews/baseline-flows.md)、[quality](reviews/baseline-quality.md)。
