# main baseline — account / integration / import / workspace / jobs

対象コミット: `ac0894acb78be85f8b10c3c7450fbb00a8c40561`。独立Verifier B が今回実行した結果。管理ファイルと実装コードは変更していない。

40項目: works/pass 0、partial/fail 36、fails/fail 1、unverified 3。合否のfailには根拠不足も含む。部分的な成功をシナリオ原文全体の受け入れに読み替えない。未検証は実装不在と区別する。D01承認待ち・音声保留。

原文の正常系と異常系全体、briefの利用者決定を基準にした。38シナリオIDとNFR-ASYNC/D01を扱う。archiveは読んでいない。実サービスへ接続せず、旧DB/objects/D01を操作していない。

## 今回の環境と範囲

`uname -sm` → `Darwin arm64`。適合Nodeは `/nix/store/k1yy2d1h7pvpac7m14vmaw23j529fpza-nodejs-22.22.3/bin/node` → `v22.22.3` / Unicode16.0。新しい checkout は `~/.local/state/hollow/baseline-flows-20261008`。git archiveで上記コミットを取得し、秘密.envなし、offline install済み。新DB/objects/mailbox/鍵だけを使用した。

Node24初回環境(runtime/)は保持。Node24の検索worker失敗は適合22環境では再現せず、シナリオ不合格理由にはしない。Node22.23.3はUnicode17.0でboot時の固定16.0規約に合わず起動失敗。適合22のruntime22/bは保持。最終browser環境はruntime22b。Google/OpenRouterのみ `boot(dependencies)` にローカル代替providerを注入し、認可callbackも127.0.0.1内で完結する。LLM生成器、Drive、PDF/ZIPは今回browser環境に構成していない。無設定のdisabledを実装不在と判断していない。

検証中に本体を修正しない。不足testを独自追加して合格にしない。全server停止、専用browser session `hollow-baseline-flows` の `agent-browser close` はexit0。環境・ログ・browser用代替scriptはレビュー配下に置かず新rootへ保持している。

## コマンドと結果

以下はfresh checkout rootで実行。適合実行は `PATH=/nix/store/k1yy2d1h7pvpac7m14vmaw23j529fpza-nodejs-22.22.3/bin:$PATH`、`TMPDIR=<新root/runtime22の用途別tmp>`。テストfixture自体が要求する専用rootも新設した。

- 準備: `pnpm install --offline --frozen-lockfile --ignore-scripts` → exit0。初回 `pnpm --config.verifyDepsBeforeRun=false build` → exit0。`DATABASE_URL=file:<新root>/runtime22b/app.db apps/web/node_modules/.bin/tsx apps/web/scripts/migrate.node.ts` → exit0、applying migrations/done。
- T1 (2026-10-08T01:45:22+09:00): `pnpm exec vitest run --maxWorkers=2 --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/{hollow,authenticationMethods,googleAuthentication,profileIcons,workspace,workspaceIcons,invitations,invitationLimits,imports,openRouterApplication,references}.integration.test.ts` → exit1、10 files pass / 1 fail、174 tests pass / 1 fail。唯一failはreferences「excludes an unverified owner's pending notes before the bounded limit and settles after re-verification」、account saveでSQLITE_CONSTRAINT_UNIQUE。ログ `<新root>/runtime22/core-contract.log`。失敗testが触れた再確認経路は未合格。
- T2 (01:46:38): `pnpm exec vitest run packages/core/src/domain/account packages/core/src/domain/integration packages/core/src/adapters/node/auth packages/core/src/adapters/node/openrouter apps/web/app/components/hollow/{OpenRouterSettings,DriveSettings,DriveHistory,LlmUsage,DriveResult,DrivePickerPage}.test.tsx apps/web/app/components/auth` → exit0、14 files / 262 tests pass。`runtime22/target-unit.log`。
- T3 (01:47:37): `TMPDIR=<新root>/runtime22/drive-single DRIVE_TEST_ROOT=<同>/db pnpm exec vitest run --maxWorkers=1 --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/driveApplication.integration.test.ts` → exit1、19 pass / 35 fail。最初の実際の失敗は「S5a D3: full local queue permits only one live disconnect」、disconnectDriveでDRIVE_CONTEXT_CHANGED。次の34件は失敗fixture保持によるDRIVE_FIXTURE_GUARDの連鎖、35件の独立実装バグとは扱わない。`runtime22/drive-single.log`。
- T4 (Node24初回01:40:53): 新 `HOLLOW_DRIVE_BACKUP_TEST_ROOT` を設定した `vitest --config vitest.config.integration.node.ts` のDrive backup/application群はsetup拒否。backup fixtureがmigration末尾0041を固定し、main0043と合わない。backend正常を受け入れる根拠にならない。`runtime/drive-contract.log`。適合22でDrive解除の最初の失敗はT3で再確認した。
- T5 (01:48:17): `pnpm exec vitest run --maxWorkers=1 --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/llmFlow.integration.test.ts` → exit0、12 tests pass。`runtime22/llm-flow.log`。
- T6 (01:47:56): `pnpm exec vitest run --maxWorkers=1 --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/workspaceDeletion.integration.test.ts` → exit0、27 tests pass。`runtime22/workspace-deletion.log`。
- T7 (01:52:23): `pnpm exec vitest run packages/core/src/adapters/node/import/__tests__/{documentExtractor,mediaValidator}.test.ts` → exit0、2 files / 73 tests pass。`runtime22/import-adapters.log`。
- T8 (01:53:20): `pnpm exec vitest run --maxWorkers=2 --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/{publication,publicReading}.integration.test.ts` → exit0、2 files / 15 tests pass。`runtime22/public-contract.log`。

Google/OpenRouter/Drive/メール実adapterの「資格情報があるときだけ実行する実サービス契約test」の完了根拠は揃っていない。ポートの代替providerとmock HTTP単体の成功を実サービス契約成功へ読み替えない。実接続設定/許可待ちは別条件として維持する。

## ブラウザ操作と観測

全て専用sessionで `agent-browser --session hollow-baseline-flows <command>`、最初の起動に `--allowed-domains 127.0.0.1`。2026-10-08T01:46〜01:58+09:00。メールリンクは新mailbox内からのみ取得し、報告へ秘密tokenを残さない。

- B1: `open /signup` → email/passwordを`fill`、利用規約`check`、送信`click`。新mailboxの確認linkを`open`、確認button`click` → 同browser session成立、/notesの0件・新規/ファイル取り込み案内。
- B2: `open /signin`、Googleで続ける`click` →代替providerのlocal callback、Google認証結果の続ける`click` →認証済みページ。
- B3/B11: `open /settings/login-methods` →password設定済み/Google未連携、最後の方法解除disabled。現pwd・新pwd2回を`fill`して変更`click` →「他のセッションを終了、このsession期限不変」。
- B4: `open /settings/profile` →表示名/handle/紹介を`fill`、保存`click` →保存しました、入力値と公開page導線。この初回はNode24。適合22のプロフィールbrowser追加は行っていない（T1/T8は適合22）。
- B5: `open /settings/openrouter`、連携`click` →local correlation/code callback →「OpenRouterを連携しました」。設定に用途別select。解除`click` →進行AI取消/完成済noteと他連携保持confirm、`dialog accept`。音声は画面に未提供と明記。
- B6: `open /settings/drive` →未構成案内、未連携・保存先未設定・自動OFF、保存先を無断で作り直さない説明、操作disabled。構成済Drive成功を観測した意味ではない。
- B7: `open /notes/import`、`upload input[type=file] normal.html normal.md`、開始`click` →進捗→/notes/jobsの完了2/失敗0/取消0、子file開始/所要時間とtoast。normal.html link`click` →iframeに「検証本文」「HTMLの取り込み結果」、原本downloadlink、再生成form（LLM未構成disabled）、参照安全化記録。
- B8: `open /workspaces/new`、name/説明/slug`fill`、作成`click` →owner本人・招待form。一般`click`、name/説明保存 →header/public説明に反映。publiccheck/save/confirm →URL表示、/w/verifier22-team公開0件/検索form/外部向けbanner・memberなし。editor招待`fill/click`→新mailbox招待link。cookieclear後inviteを`open`→signup同email→メール確認を省略した参加confirm→参加`click`→editor設定。member一覧readonly、本人脱退confirm`accept`→個人一覧、ownerとして再signinするとeditorはmember一覧から外れている。owner最後1人は脱退disabled。一般delete確認→誤nameでdisabled→正nameで削除`click`→個人URL、旧publicpage「このページは利用できません」。
- B9: accountmenu summary`click`→signout`click` →/signin着地。email/password signin`fill/click`→個人一覧。サインアウト先は原文のtop pageと違う。
- B10: `open /reset-password`、email`fill`、申請`click` →条件付き送信案内。新mailbox resetlink`open`、新password2回`fill/click` →旧session全終了・新passwordでsignin案内（自動signinはしない）。
- B12: accountmenuを開く →プロフィール/ログイン方法/連携/公開/ゴミ箱/履歴/端末編集/signout、退会/使用量の専用導線なし。`open /settings` →404。

## 項目別結果


### account.md

| ID | 動作 / 合否 | 今回の根拠 | 残る条件 |
| --- | --- | --- | --- |
| AC-01 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B1: signup→ローカルmailbox確認→同browser確認→ノート0件/初回アップロード案内。 | 短時間大量signupのUI案内と招待経由signupはB8で確認したが他のUI異常系を未確認。正常成功だけを全体passにしない。 |
| AC-02 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B1: 同browser確認後session成立、hollow integrationは別browser確認・期限・tamper・再送間隔・used競合をpass。 | 一時障害の再試行UI、使用済み/期限切れ/無効/別browser各表示のbrowser未検証。 |
| AC-03 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B2: Google代替provider callback→Google認証結果→続けるでログイン成功。Google integration9test pass。 | 既存第三者emailへの追加本人確認・cancel・state不一致のbrowser未検証。実adapter資格情報条件付き実接続契約testを確認できない。 |
| AC-04 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B1登録session、T1 hollow test は期限30日/既存不明共通delay lockoutをpass。 B9(適合22): signout後email/password signin→個人ノート一覧に成功。 | 保護URLreturn、lockout/待機の区別・Googleonly/未確認の再送表示はbrowser未検証。 |
| AC-05 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 authenticationMethods14test pass（reset once・全旧session無効・1h境界・Googleonly案内）。 B10(適合22): resetメール申請→新mailboxリンク→新pwd2回→全旧session終了とsignin案内。 | 強度/不一致/未登録/失効tokenUI、発行レート制限の全条件を未検証。 |
| AC-06 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B3: login-methodsでpassword設定済み/Google未連携、最後の方法解除disabled、パスワード変更form。 B11(適合22): 現pwd+新pwd2回→「変更し他session終了、現session期限不変」。 | Google追加/再認可・解除・別session終了のbrowser結果と全異常UI未確認。Googleの実adapter資格情報条件付き契約testは確認できない。 |
| AC-07 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B4: profile表示名/handle/紹介入力→保存成功、保存済値・公開ページ導線を観測。profileIcons tests pass。 | icon browser・重複候補/予約語即時検知・public表示反映・URL維持の統合未確認。 |
| AC-08 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 T1 hollowとauthenticationMethods: signout/othersession終了/固定期限維持pass。 B9(適合22): accountmenu→signoutでsession終了、URLは /signin。 | 原文基本フローのトップページ着地と不一致（実際 /signin）。未保存編集確認と期限切れ/othersessionのbrowser未検証。 |
| AC-09 | fails / fail | B12(適合22): accountmenuはprofile/login-methods/連携/公開/ゴミ箱/履歴/端末編集/signoutのみ。 /settings を開くと404。 | mainでは退会を実行する製品操作を確認できない。削除本体/関連データ/最後owner/公開URL失効を未検証。退会branch統合後に受け入れる。 |
| AC-10 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B: /notes/importに個人5GiB使用量/最終更新、jobsに月間AI使用量。 B7(適合22): AI 0使用/0予約/月30、残30、確認時刻・次UTC枠をjobsに表示。 | 設定の使用量画面、個人/参加WS全使用量・ノート数・80%/100%警告/削除導線を未確認。 |

### integration.md

| ID | 動作 / 合否 | 今回の根拠 | 残る条件 |
| --- | --- | --- | --- |
| IN-01 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B5: OpenRouter代替authorization/credential検査で連携結果成功。 | 音声AIは保留。待機件数/初回限定案内、uploadreturn、鍵無効/キャンセルUIと条件付き実adapter契約testが未確認。 |
| IN-02 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B5: 文章/PDF・画像・音声別select表示。OpenRouter tests は用途検証/OCC/catalog障害/default維持pass。 | 保存後の実変換反映・提供終了error・再試行browser未検証。音声保留。 |
| IN-03 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B5: 解除時「進行中AI取消・完成済ノートと他連携保持」confirmを表示、accept。 | 生成済本文残存/進行job取消・解除後再連携誘導browser未確認、実adapter契約testなし。 |
| IN-04 | partial / fail | T3: 適合Node22 DriveApplication 19pass、local unlink caseがDRIVE_CONTEXT_CHANGEDでfail、その後34caseはfixture guard cascade。B6: 未構成Drive画面に未連携/未設定/OFFと非自動再作成説明。 | 構成済代替adapterのbrowser正常認可・folder設定/保存先喪失確認/解除を未検証。実サービス接続は禁止。 |
| IN-05 | partial / fail | T3: 適合Node22 DriveApplication 19pass、local unlink caseがDRIVE_CONTEXT_CHANGEDでfail、その後34caseはfixture guard cascade。B6: 未構成Drive画面に未連携/未設定/OFFと非自動再作成説明。 | 構成済代替adapterのbrowser正常認可・folder設定/保存先喪失確認/解除を未検証。実サービス接続は禁止。 |
| IN-09 | partial / fail | T3: 適合Node22 DriveApplication 19pass、local unlink caseがDRIVE_CONTEXT_CHANGEDでfail、その後34caseはfixture guard cascade。B6: 未構成Drive画面に未連携/未設定/OFFと非自動再作成説明。 | 構成済代替adapterのbrowser正常認可・folder設定/保存先喪失確認/解除を未検証。実サービス接続は禁止。 |
| IN-06 | unverified / unverified | T4: backup fixtureは末尾migration0041固定。main0043のためsetup guard不合格。B6: backup設定未構成。 | 手動/自動バックアップの端から端browser、バックアップ完了fileリンク、再試行/取消未検証。guardは設定不備と実装失敗を区別。 |
| IN-07 | unverified / unverified | B6: Driveの設定とnote UIに再生成の成功を確認できない。 | mainのDrive再生成を起動する製品経路・本文更新/設定維持未検証。branch差分の独立受け入れが必要。 |
| IN-08 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B5/B6: OpenRouter/Drive別設定・jobsのDrive原本バックアップ履歴導線。 | 一画面で各状態/最終利用/期限・失効表示、履歴結果のbrowser未検証。実adapter条件付き契約test不足。 |

### import.md

| ID | 動作 / 合否 | 今回の根拠 | 残る条件 |
| --- | --- | --- | --- |
| IM-01 | partial / fail | T1 imports18tests pass、T7 実parser/media73tests pass。B7(適合22): HTML/Markdown2file選択→受付→jobs完了2/失敗0/取消0→normal.html詳細のiframe「検証本文/HTMLの取り込み結果」、元fileリンク・140bytes情報を表示。 | 公開設定保留適用/公開開始前検出/通信再開・容量上限/全形式/自動backup全体はbrowser未検証。音声AI保留。 |
| IM-02 | partial / fail | T1 imports18tests pass、T7 実parser/media73tests pass。B7(適合22): HTML/Markdown2file選択→受付→jobs完了2/失敗0/取消0→normal.html詳細のiframe「検証本文/HTMLの取り込み結果」、元fileリンク・140bytes情報を表示。 | 公開設定保留適用/公開開始前検出/通信再開・容量上限/全形式/自動backup全体はbrowser未検証。音声AI保留。 |
| IM-03 | partial / fail | T1 imports18tests pass、T7 実parser/media73tests pass。B7(適合22): HTML/Markdown2file選択→受付→jobs完了2/失敗0/取消0→normal.html詳細のiframe「検証本文/HTMLの取り込み結果」、元fileリンク・140bytes情報を表示。 | 公開設定保留適用/公開開始前検出/通信再開・容量上限/全形式/自動backup全体はbrowser未検証。音声AI保留。 |
| IM-04 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 T1 workspace tests: scope容量・capture・viewer認可・取消と原本維持pass。B7: personal保存先と容量を表示。 | browserの取り込み先selector（現在scopeを切替える導線のみ）/viewer非表示・除名途中失敗未確認。 |
| IM-05 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 references34pass/1fail:未確認owner pending noteの再確認caseでUNIQUE violation。 | ブラウザ参照取得・同梱資源差替・外部CSS保持/除去理由・上限/SSRF全面の観測は未完。実サービス接続禁止なのでポート契約段階で検証。 |
| IM-06 | partial / fail | T5:適合22 llmFlow12test pass（取消/失敗本文維持・quota・durable recovery）。B5はOpenRouter契約連携。 B7(適合22): 原本再生成formとOpenRouter設定導線は表示、LLM未構成のため再生成disabled。 | 生成器代替adapterで製品本文再生成/復元/失敗を未検証。未構成と実装不在を区別する。音声保留。 |

### workspace.md

| ID | 動作 / 合否 | 今回の根拠 | 残る条件 |
| --- | --- | --- | --- |
| WS-01 | partial / fail | T1 workspace11tests pass。B8(適合22): name/説明/slug入力→非公開WS作成→owner本人・招待formの設定画面。 | slug重複の入力中検出と代替候補提示をbrowser未確認。20件上限/名前空/予約語はbackend test範囲、UI全異常未検証。 |
| WS-02 | partial / fail | T1 scope/role/data isolation tests pass。B8(適合22): 作成後scope名=チーム、editor参加後workspace設定、脱退後個人一覧URLに遷移。 | scope切替menuからの選択/次訪問維持/絞り込み解除・除名/削除済scopeの誘導をbrowser未検証。 |
| WS-03 | partial / fail | T1 invitations23testsとinvitationLimits7tests pass。B8(適合22): editor招待受付→ローカルmailboxで招待リンク発行、guest新登録/参加成功。 | owner招待確認・既存/重複/期限切れ再送/取消/上限・copy結果のbrowser全条件は未検証。 |
| WS-04 | partial / fail | T1 invitation正常/異常・異email確認・同email確認省略/使用済/辞退のtests pass。B8(適合22): mailbox招待→signup同email→確認mailなしで参加確認→参加→editor一覧表示。 | 招待期限切れ/取消/使用済・異email確認/辞退/削除済WSのbrowser表示は未検証。 |
| WS-05 | partial / fail | T1 roles/lastowner/selfrole/race tests pass。B8(適合22): owner自分はrole変更不可、最後owner降格/除名不可。editorログインではメンバー一覧読み取り専用、role変更/除名操作なし。 | 別memberのrole変更/除名実行・対象ノート残存/編集中保存拒否をbrowser未検証。 |
| WS-06 | partial / fail | T1 membership/lastowner/leave tests pass。B8(適合22): owner唯一は脱退disabled、editor本人は脱退confirm→個人一覧URL、WSにはownerだけ残る。 | 脱退前移動導線は画面に「まだ利用できません」と表示し原文要求未充足。作成note残存・再招待のbrowser未検証。 |
| WS-07 | partial / fail | T1 workspace/Icons正常異常tests pass。B8(適合22):一般設定name/説明編集保存→header「変更後22チーム」、publicpageに変更後説明反映。 | アイコン/slug変更旧URL失効/重複候補・非owner readonly全条件のbrowser未検証。 |
| WS-08 | partial / fail | T8 publication/publicReading15tests pass。B8(適合22):公開checkbox→影響説明dialog→confirm→publicURL表示→publicpage空状態、外部向けbanner。 | 非公開への復帰・個別公開noteURL維持/slug未設定拒否・index削除遅延案内のbrowser未検証。 |
| WS-09 | partial / fail | T8 publication/publicReading15tests pass。B8(適合22): /w/verifier22-team にname/説明/公開0件/検索form/外部向けbanner。member一覧なし。削除後同URL「このページは利用できません」。 | 公開noteの順序・タグ/検索絞り込み・note開く、非公開/不存在の同一応答とiconのbrowser未検証。 |
| WS-10 | partial / fail | T6 workspaceDeletion27tests pass。B8(適合22):一般設定delete確認→違うnameではdisabled→正しいnameでdelete→個人URL→旧publicpage取得不可。 | 公開/限定noteURL全部の削除後応答・複数member同時無効・進行job取消をbrowser未検証。backendのみの対象条件も残る。 |

### jobs.md

| ID | 動作 / 合否 | 今回の根拠 | 残る条件 |
| --- | --- | --- | --- |
| JB-01 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B7:jobsにparentと子file/状態・90日履歴説明。T1 imports は取消/所有者認可/再試行/DB再open回復pass。 B7(適合22):親「処理終了・完了2/失敗0/取消0」、子fileごと完了/開始/所要時間、画面toastで結果導線。 | browserで失敗子再試行/parent再開/取消結果、全job種別の履歴/保持期間/取消を未検証。 |
| JB-02 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B7:jobsにparentと子file/状態・90日履歴説明。T1 imports は取消/所有者認可/再試行/DB再open回復pass。 B7(適合22):親「処理終了・完了2/失敗0/取消0」、子fileごと完了/開始/所要時間、画面toastで結果導線。 | browserで失敗子再試行/parent再開/取消結果、全job種別の履歴/保持期間/取消を未検証。 |
| JB-03 | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 B7:jobsにparentと子file/状態・90日履歴説明。T1 imports は取消/所有者認可/再試行/DB再open回復pass。 B7(適合22):親「処理終了・完了2/失敗0/取消0」、子fileごと完了/開始/所要時間、画面toastで結果導線。 | browserで失敗子再試行/parent再開/取消結果、全job種別の履歴/保持期間/取消を未検証。 |

### 非機能

| ID | 動作 / 合否 | 今回の根拠 | 残る条件 |
| --- | --- | --- | --- |
| NFR-ASYNC | partial / fail | T1: 適合Node22.22.3の対象integration11file/175testは174pass、referencesのみ1fail。T2: 対象unit14file/262test pass。 T1 importsは画面wake無しstartup/periodic sweepとDBclose/reopenから処理続行pass。 | browserを閉じる操作の前後で長時間処理の進行を比較していない。PDF/ZIP/backup等のbrowser観測も未検証。 |

### 保全

| ID | 動作 / 合否 | 今回の根拠 | 残る条件 |
| --- | --- | --- | --- |
| D01 | unverified / unverified | 旧DB/objects/D01は非操作。 | 保全維持/37未復元objectsの復元又は扱い承認待ち。今回読取/照合しない。 |

## Managerへの判断事項

- 完全合格の報告は0件。基本成功＋未検証edgeが多いためpartialをdoneへ自動変換しない。
- AC08: signout先、WS06:脱退前移動未提供の文言が原文と不一致。
- IM05: 未確認owner再確認fixtureでUNIQUE違反。IN09: bounded local unlink caseでcontext conflict。失敗fixtureによる連鎖を別バグとして数えない。
- AC09/IN07はmainで端から端の成功経路を確認できない。別branchの成果は今回未統合。
- D01非操作/承認待ち。音声はbriefに従って未完の必須項目のまま。
- 実adapter条件付き契約test不足と、LLM/Drive/PDF/ZIP browser環境未構成は未検証として残し、実装不在へ読み替えない。
