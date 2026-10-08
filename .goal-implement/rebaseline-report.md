# Hollow main の再確認結果

対象は main `ac0894acb78be85f8b10c3c7450fbb00a8c40561`。旧記録を退避し、シナリオ79項目＋体験・非機能・品質14項目＋D01の計94項目で台帳を作り直した。実装・マージ・worktree削除・実サービス接続は行っていない。ブラウザ並列は最大2、各新環境の操作担当は1名。全自己サーバーとブラウザを停止し、新検証環境とログは保持した。

正本は [plan.md](plan.md)、機械可読な写しは [status.json](status.json)。再確認は終了し、2026-10-09 に修正つきフェーズ計画と Q1–Q6 の回答を受け取った。最新の「開始しないで」に従い、実装は未開始。承認済み計画は plan.md に置く。Hollow 全体は未完成。

## 項目の状態


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


未着手4項目の内訳は AC-09（mainに退会主操作なし）、IN-06/IN-07（端から端のDrive契約環境・製品経路未検証）、D01（非操作・復元/扱い決定待ち）。未検証3項目を「動かない」と推測していない。シナリオはdone2/79、体験等はdone5/14。旧R01–R12の集約は0/12のまま。各集約の全条件が揃っていないためであり、mainの正常系が全て動かないという意味ではない。

doneはSH-04、SH-06、NFR-PRIVACY、NFR-HTML、QA-BUILD、QA-TYPECHECK、QA-LINT。原文の正常系・異常系と今回の根拠が揃った項目だけを受け入れた。旧done255の受け入れは引き継いでいない。

## main で観測した結果

登録・メール確認・サインイン、Google/OpenRouterのローカル代替認可、三編集モードの入力と保存、HTML/Markdown取り込み、タグ/一覧、ワークスペース作成・招待参加・設定・公開・脱退、ノート移動、共有リンク再発行、パスワード閲覧、公開ページ、ゴミ箱復元、HTML/ZIP生成取得などの正常操作を観測した。各シナリオで未確認の異常系は台帳の残条件に記載した。

- SH-08/UX-STATE: 公開ノートに「自分だけが閲覧できます」、WS移動後に「現在のワークスペース権限に従って閲覧できます」と誤説明。
- AC-08: サインアウト後は/signinへ着地し、原文のトップページへの着地と不一致。
- WS-06: 脱退前のノート移動案内に「まだ利用できません」と表示。
- AC-09: mainに退会の主操作導線を確認できない。退会branchはmainの受け入れに含めていない。
- Drive解除契約: 最初のunlinkがDRIVE_CONTEXT_CHANGED、後続34件はfixture guardの連鎖。別々の35製品バグとは数えない。
- references契約: 未確認ownerのpending note再確認でSQLITE_CONSTRAINT_UNIQUE。

適合するDarwin arm64/Node22.22.3（Unicode16.0）で検証した。Node24のlibsql worker失敗とブラウザallowlistによるWYSIWYG準備失敗は適合環境で解消し、機能不在の根拠にしない。Node22.23.3はUnicode17.0で起動時の要求と合わなかった。配備手順の再実行時は検証済みruntimeを明示する。

| コマンド/確認 | 最終結果 |
| --- | --- |
| pnpm build + 生成アプリ起動 | exit0、ローカルGET / HTTP200 |
| pnpm typecheck | 標準postinstall相当のcf:types後、exit0 |
| pnpm lint / pnpm format:check | 両方exit0、書換えなし |
| pnpm test | unitでexit1、2436成功/37失敗/3skip、unhandled2 |
| pnpm test:integration | Nodeでexit1、813成功/324失敗/153skip、unhandled1 |
| pnpm test:integration:cf | exit0、70/70成功 |

fixtureのaccounts列数・migration期待数・共有root衝突、mockと実装の契約不一致等が残る。テスト失敗の全件を利用者操作の不具合へ読み替えない。QA-TESTは未完。個別対象テストの成績は全suiteと重複するため足し合わせない。

根拠: [content](reviews/baseline-content.md)、[flows](reviews/baseline-flows.md)、[quality](reviews/baseline-quality.md)。今回はarchiveの根拠を受け入れに使っていない。

## 承認済み計画

現在の正本は [plan.md](plan.md)。P00「テストスイートを緑にする」を先頭に置き、QA-TEST を P00 で受け入れる。その後は全フェーズで全スイートが緑のままであることを条件にする。テストの削除・skip で失敗を隠さず、製品不具合を示すテストは製品を修正する。Node のバージョン固定は P00 の作業として残す。

異常系はリポジトリの integration/e2e、主要正常系と UX はブラウザで検証する。条件が揃った項目をその時点で受け入れる。P13 は音声以外の UX と主要シナリオの統合検証とし、P11 を依存先にしない。音声に関わる項目は未完のまま保持する。

次の再開指示が来るまで P00 の調査・実装・テスト実行は開始しない。

## worktree 5本

コミット候補として識別可能なことと、シナリオ全体の完了候補であることを分ける。今回branch上の動作検証はしていない。

| branch / worktree | HEAD | main との差分の要点 | 効く項目 | 完了候補としての状態 |
| --- | --- | --- | --- | --- |
| `goal-implement/p5c-drive-llm-c1-20261006` / `hollow-p5c-drive-machine-721bc7ad-20261006` | `8edbbac7c342353adf9949b8c5e6ccc2ba2aee34` | 50 実装・テストファイル、+6,033 / -243。機械再生成、Drive の HTML / Markdown を使う機械・LLM 再生成、本文の保持・取消・回復処理。machine branch の 4 コミットを含み、その後に Drive 関連 4 コミットを追加 | 主に IN-07。関連する IM-06、JB-01–03、ED-08 | clean、未追跡なし。バックエンドのコミット候補として識別可能。IN-07 全体の完了候補には不足：Drive 再生成の要求関数を `apps/web` から呼ぶ参照がない。現在 main へ統合した状態の検証も未実施 |
| `goal-implement/p5c-formats-c2a3d45f-20261006` / `hollow-p5c-formats-c2a3d45f-20261006` | `4cba22b7a62121b32bf72964cd62c15a9774c26f` | 分岐点以降の 22 ファイル +5,268 / -212 は main の `79ef126edd5d3440cde20dbe8fd372e7235010c5` に同内容統合済み。main と branch の実装差分は parser 修正を branch が持たない 2 ファイル +37 / -271 だけ | IM-01、IM-03、IM-06、JB-01–03 のローカル画像・PDF 等の LLM 入力処理 | clean、未追跡なし。新しい完了候補として持ち込む差分はない。統合済み部分は今回の main 検証の対象 |
| `goal-implement/p5c-3-s5-machine-20261006` / `hollow-p5c-machine-79ef126-20261006` | `721bc7ad2741b673db9b2ab22023b7071e283212` | 30 実装・テストファイル、+3,465 / -47。機械再生成の要求・実行・回復・取消・再試行・復元と処理履歴表示。上の Drive branch の祖先 | IN-07 と、関連する JB-01–03、ED-08。ローカル元ファイルの機械再生成は spec の独立シナリオを増やさない | clean、未追跡なし。バックエンドのコミット候補として識別可能。これ単独では Drive の再生成要求がなく IN-07 全体は完了しない。Drive branch と重複するため別々に統合する対象ではない |
| `goal-implement/p5d-c2a3d45f-20261006` / `hollow-p5d-c2a3d45f-20261006` | `516af3ba5e64f0ba1a7e3c9da697ca21d2b576f7` | 分岐点以降 100 ファイル、+30,464 / -348。退会 UI / server function、即時認可停止、唯一 owner の拒否、DB migration 0044、個人資源・資格情報・進行中ジョブの非同期回収。現在 main との実装差分は 123 ファイル +30,713 / -5,887：main に入った formats / parser 修正を branch が持たないことも含む | AC-09。退会後の SH-05–07 / DS-01、DS-04–06 / WS-05–06 などのアクセス・表示への影響も再検証対象 | clean、未追跡なし。AC-09 のコミット候補として渡せる。ただし現在 main の formats / parser と統合した状態の検証は未実施で、受け入れ済みではない |
| `goal-implement/parser-exit-c2a3d45f-20261006` / `hollow-parser-exit-c2a3d45f-20261006` | `c81862bd33e693dbf1cfb53c17c5da78248d0158` | 分岐点以降 2 ファイル +271 / -37 は main の `b6e567b` に同内容統合済み。main と branch の実装差分は formats の統合を branch が持たない 22 ファイル +212 / -5,268 だけ | IM-01–03 の parser 失敗・取消・制限、JB-03 | clean、未追跡なし。新しい完了候補として持ち込む差分はない。統合済み部分は今回の main 検証の対象 |


詳細な比較コマンドと結果: [worktrees.md](worktrees.md)。5本ともclean/未追跡なし。マージ/削除していない。

## 旧reviews内の一時ディレクトリ

`du -sk` の割当量（KiB）。退避先は `archive/main-ac0894a-rebaseline-20261008/`。全て保持している。

| ディレクトリ | KiB |
| --- | ---: |
| `.goal-implement/archive/main-ac0894a-rebaseline-20261008/reviews/p3b-1-independent.QtYhXV` | 13964 |
| `.goal-implement/archive/main-ac0894a-rebaseline-20261008/reviews/p3b-2-independent.qGd0HC` | 59068 |
| `.goal-implement/archive/main-ac0894a-rebaseline-20261008/reviews/p3b-2-v1-independent.ZLdUG3` | 54252 |

合計127284 KiB（約124.3 MiB）。[退避記録](archive-index.md)。phases/reviews/criteria/plan/status/design/assumptionsの旧記録は消していない。整理前briefも保存した。

## 確定した回答と引き継ぎ

Q1–Q6 は [brief.md](brief.md) に反映済み。旧データは変更・削除せず D01 の作業でだけ読む。永続データと保全資料は OS の一時領域に置かない。検証環境は毎回まっさらにし、失敗した環境は報告に記録後に削除できる。止めるのは自分が起動したプロセスだけ。画面案と OpenRouter の privacy 条件は利用者決定として維持する。

一時ディレクトリ3個は D01 の旧データを含まないことを確認できた場合だけ削除する。削除前調査で旧 DB の backup が見つかったため保全し、検証環境本体をコミットに含めない。確認結果は [cleanup.md](cleanup.md)。引き継ぎは [resume.md](resume.md) に置き、利用者指定でコミットしない。
