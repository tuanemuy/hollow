# main 再確認の設計前提

検証対象は main `ac0894acb78be85f8b10c3c7450fbb00a8c40561`。このコミットを製品基準とし、承認済みフェーズ計画に従って不足条件を実装・検証する。

要件は [requirements](../spec/requirements.md) と [scenario](../spec/scenario/index.md)、画面の設計前提は [spec/design](../spec/design/index.md)、レイヤーと依存方向は [CLAUDE.md](../CLAUDE.md) に従う。

外部依存の検証段階と保全の制約は [brief.md](brief.md) に置く。各 Verifier は秘密設定のない新しい main checkout と自分専用のローカル DB・objects・mailbox・鍵を使う。ブラウザ担当は2名以下とし、各環境の操作担当を1名に固定する。これは旧環境を変更しないための検証環境の準備であり、追加のプロダクト完了条件ではない。

worktree のコミットは現在 main の受け入れに含めない。フェーズ計画は利用者の修正つきで承認済み。resume.md からの継続指示により P00 を開始する。共有契約・レイヤー境界・ポートの変更は Implementer の影響報告を受けて Manager が決定する。P00 は現在のスキーマ・契約に自動テストを合わせ、製品不具合が示された場合は製品を修正する。異常系はリポジトリの integration/e2e、主要正常系と UX はブラウザで検証する。

## P00 の検証基盤

通常の pnpm test が test file ごとの新規ローカル fixture（合成鍵・DB・objects）を生成する。歴史的な環境変数の手動準備への依存と並行実行時の root 衝突を避けるため、test-only setup に所有を集約する。実サービス接続を通常 suite から有効化しない。

ローカル形式の既存 app/app-c/native/native-d/native-e グループを Vitest projects で実行対象にする。外部実接続 skip は別枠で報告し、ローカル必須検証の省略と区別する。Node 22.22.3 / Unicode 16.0 を厳密固定し、pnpm 自体の起動 Node も揃える。公開ポートと製品のレイヤー境界は維持する。

書き出し integration は専用 fixture root に製品と同じ Node22/ESM 条件で実 worker を生成して実行する。新規 checkout の pnpm test と個別 suite が既存 dist に依存しないようにするため、テスト側の beforeAll で必要 bundle を用意する。worker の振る舞いと既存 assertion は維持する。

Node integration のファイル並列数は2とする。多数の fixture seed と native subprocess の並行負荷が実検索の3秒 budget を消費したため、検証機の競合を抑える。全テストと成功 assertion、製品 deadline は維持する。

## P01 の認証とローカル検証

既存の trusted boot(dependencies) の authenticationFactory / mailer 注入口を使い、公開ローカル browser harness を用意する。新規 DB・鍵・mailbox と loopback の同意画面で Google/メールの正常系を確認する。実 adapter には承認済み設定がある場合だけ明示実行できる契約テストを置き、通常 suite は実接続を有効にしない。

AC-08 のサインアウトはトップへ着地する。AC-06 は Google ログイン方法の解除後も Drive 連携が独立して残る旨を表示する。AC-01/05/06 の強度・確認一致は transport 境界の検証と同じ制約に基づく項目内エラーと送信抑止を補う。

AC-03 の同意キャンセルは既存 AuthFailure に AUTH_CANCELLED を追加して型と永続契約に残す。access_denied の判定は既存 state 照合・消費・安全な redirect の境界内で行い、サインインへ戻してキャンセルを表示する。state 不一致・期限切れと区別するため DTO と repository schema の literal を揃える。既存0032 migration は変更せず、新規0044で shape triggers を更新し総数は45となる。P10退会branchの0044とは統合時に番号衝突を解消する。ポートの形状は維持する。

認証エラーの公開表示は対象コードに対応した日本語の案内と次の操作を返す。PASSWORD_MISMATCH、RESET_INVALID、AUTH_LAST_METHOD を一般的な権限エラーに畳まず、再申請・認証方法の維持などを示す。SIGNIN_LOCKED は待機とパスワード再設定の双方を提示し、共通ログインエラーによるアカウント存在の非漏出を維持する。

実配送 adapter は標準 SMTP の NodeSmtpMailer を adapters/node/mail/ に置き、既存 Mailer.send を実装する。1送信1connection、有限 deadline、native close、自動再送なしとし、provider error は既存 ExternalApiError へ変換する。公開 Mailer ポートは変更せず concrete adapter の lifecycle で shutdown を待つ。trusted boot の注入を優先し、HOLLOW_MAIL_MODE=smtp と専用 JSON/password file の明示設定で runtime に接続する。local mode は外部設定を読まない。設定境界の file 検証は既存 Node の秘密設定パターンを再利用する。

Nodemailer の公式 SMTPConnection/MailComposer を最小構成で使い exact dependency を固定する。loopback SMTP fixture と専用 CA/合成認証により TLS、日本語 subject/body/link、拒否、ACK不明、deadline、close を契約検証する。実配送専用 command は専用設定・承認済み宛先・送信の明示指定を必要とし、通常 test/build/postinstall から呼ばない。今回の実サービス送信は未実行。SMTP 受理と受信者到達の根拠は分ける。

SMTP秘密設定の reader は O_RDONLY/O_NOFOLLOW/O_NONBLOCK で取得し、通常file以外も待機せず既存 fstat/metadata により拒否する。所有・permission・サイズ・symlink・close・秘密buffer消去を維持する。既存auth/Drive readerは今回の変更範囲外。

## P02 の編集とローカル参照検証

既存の三編集 mode、自動保存、offline 退避、競合、20版、media、trash/purge、style を維持し、未検証条件を埋める。要件差分は ED-01 の作成先 selector、ED-11 の非editor向け操作、ED-09 の公開/共有URL警告を最小修復する。

作成先は IM-04 と同じ個人＋owner/editor workspace、timeline既定で、最初の永続受付前に選ぶ。新規 Editor が選択 state と未保存 title/html を保持し、scope別 draft を作る。scopeに拘束された pending/uploaded media を黙って別scopeへ流用せず、変更確認と自分のupload取消/除去を明示する。保存済み note は OR-12 の移動へ案内する。既存 listWorkspacesFn/SaveNoteInput の契約を使う。ED-11 の非editorは現在設定と由来の説明だけを表示する。ED-09 の共通削除 dialog は公開ページ/共有リンクからも閲覧できなくなる旨を示し、共有DTOを増やさない。

ED-03/IM-05 の参照検証は trusted NodeServerDependencies.referenceFetcher?: SafeReferenceFetcher をコードDIへ追加する。既存ポート inspect/inspectMany/fetch を local adapter が実装し、専用loopback originと既知fixture pathだけ許可する。他URLは通信前に拒否し、maxBytes/signal/有限deadline/native stream closeを維持する。production NodeSafeReferenceFetcher は default として保持し、private/任意port拒否を緩和しない。transport/環境へ allowPrivate を追加しない。専用CSS/image/videoを既存jobで取得・保存・差替え、shutdownで所有fixtureを閉じる。P06や実外部接続をP02の前提にしない。

PasswordFields は domain/transport の既存 UTF16 長さ契約に一致させる。HTML pattern は文字種だけを判定し、長さは native min/max と domain/customValidity に揃える。入力時の強度・確認不一致エラーと送信抑止を維持する。

ED-07 の title 入力は既存 domain/transport の200 Unicode codepoint契約に揃える。native maxlengthはUTF16単位のため上限400とし、入力時に200codepointへ制限する。200非BMP文字の保存と201文字抑止、既存自動保存・空の無題・重複許容を確認し、domain/transportは変えない。

## P03 のワークスペースと招待配送

WS-03/04 の招待は既存 InvitationMailer ポートと application の配送claim・generation・再試行を維持する。Node の SMTP mode で招待にも実adapterを接続するため、NodeSmtpInvitationMailer が NodeSmtpMailer を送信単位で所有する。AbortSignal はその送信の sender だけを停止し、native close の完了を待つ。adapter は自動再送せず、受付応答不明と失敗を既存契約へ変換する。

runtime は SMTP 設定を一度読み、アカウント通知と招待の両adapterへ渡す。local mode は既存配送を維持する。trusted NodeServerDependencies.invitationMailer?: InvitationMailer をコードDIへ追加し、loopback SMTP fixture で招待の正常系を確認する。公開ポート・schema・HTTP入力を変更せず、実送信は明示承認のある専用契約commandだけで行う。

メンバー一覧の表示名は既存 MemberView.displayName へ UoW 内の displayNames repository から投影し、既存の bounded page を維持する。脱退前の個人移動は既存の一覧・詳細・NoteMoveAction へ案内し、owner/editor の移動権限と viewer の読み取り権限を変えない。唯一の owner には別メンバーへの owner 付与または削除を案内する。

公開中の slug 変更は既存 publication.pagePublic と変更前の値で判定し、旧URL失効の確認を保存前に表示する。取消時は編集入力を保持する。公開や移動が未提供であるとの古い説明は現在の機能に合わせる。共有Input/DTOとschemaは維持する。

WS-02 の選択は URL を正本とし、選択後URLへの次回訪問で同じ文脈を復元する。個人の明示URLを別文脈へ書き換える新たな last-scope 保存は追加しない。切替時の検索語・タグ・月の解除、無所属状態、失権/削除URLから個人への案内を確認する。

WS-02のbrowse失敗はNotesFragmentのRSC表示境界で既存serializeError/redactForClientへ通し、plain serialized errorをBrowseErrorへ渡す。stream内で起きた認可拒否がReactの一般エラーへ隠され、時間切れ等と誤案内されることを防ぐ。既存の認可/検索準備/一時失敗の日本語と個人への導線を使い、unknownのsanitized応答と公開情報の非漏出を維持する。domain/applicationのcatch、共有DTO/port/schemaは追加しない。

## P04 の整理とノート閲覧

一覧・検索・タグ・一括操作・移動は既存の実装とP00で修復済みのfixtureを使い、原文OR-01–12の正常browserと異常テストの不足を埋める。タグ管理は既存フィルター領域の入口を維持し、設計の帰属に合わせscope tokenにも既存scope付き /tags Linkを編集可能な利用者へ接続する。

公開の一括変更は新規ローカルownerのhandleと既存sharing DIを使う。Drive一括backupは既存trusted driveFactoryへlocal DriveServicesを注入し、NodeDriveExecution/製品のNodeDriveBackupSourceを再利用する。専用rootの合成providerと実原本の読取・hash・chunkを使い、signal/期限/native closeを維持する。P05/P07の実サービス検証を依存先に増やさず、通常のapplication/usecaseでfixtureを用意する。

OR-11の古い連携未提供の断定は既存OpenRouter/Drive panelの現在状態へ合わせる。本文読込は本文形状のskeletonを使う。processingの完了は既存detailの2秒poll/invalidateへ任せ、新たなpollを増やさない。

getNoteの認可済み応答へconversion投影を追加する。Original.activeJobIdの現在jobを同じUoWで読み、機械変換とLLMを既存型に基づく判別可能なunionで区別する。実stateによる段階を表示し、架空のpercentageを出さない。機械failureは既存original.notices、LLM failureは既存の公開typed codeと日本語表示を使い、秘密・provider body・stackを渡さない。getNote応答だけの拡張とし、共通NoteView/save/draft DTO、schema、repository portを増やさない。

機械変換のcanRetryは現在edit権限に加え、実行actor、failed、activeJobId、原本状態、revision/version、importing構成の既存受付条件へ一致させる。純粋な判定を既存restartImportと共有し、実行時の再認可を維持する。LLMへ機械再試行を表示せず、既存LlmNoteAction・処理履歴と原本再生成の導線を使う。別actorのjobには実行者の再試行が必要な旨を説明し、failedを別reimportへすり替えない。公開応答で機械再試行とLLMの不整合な組合せを型で防ぐ。

getNoteのconversionはnull、機械、LLMのunionにし、機械だけにcanRetry/retryBlockedを持たせて両者の整合を型で保証する。LLMは既存phase/outcome/typed LlmFailureだけを投影する。restartImportは構成不在の場合、新しいjob・Original・eventを書き込む前に既存importContext契約で拒否する。既存の再認可とidempotent受付を維持し、構成不在の拒否でDBを変更しないことをintegrationで確認する。

## P05 のプロフィールと共有説明

AC-07のハンドル入力は既存checkHandleFn/HandleAvailabilityを短いdebounceで使い、有効な正規化入力の重複と代替候補を入力中に表示する。利用者と入力の世代を照合して古い応答を破棄する。確認は予約ではなく、saveProfileの重複・OCC・現在利用者の再確認を維持する。

SH-08の詳細説明は既存sharingAudienceと同じpublic/link/privateの3分岐に揃える。一覧badgeは既存detail URLのsharing=1導線でNoteSharingAction/SharingPanelを開く。note全体のLinkとnested linkを作らず、viewerは読み取り専用にする。人数は認可済getSharing.scopeのmemberCountだけを使い、公開HTMLへ内部の人数を出さない。共有DTO/port/schemaは追加しない。

ハンドル変更時のURLはbriefの利用者決定を適用する。旧プロフィールURLだけが失効し、公開note URLと限定tokenは移動やcreator脱退後も維持する。SH-07の旧note URL失効よりこの決定を優先する。現在の実装を正常browserと既存公開読取/共有契約で確認する。

SH-02のパネル初期読込は既存getSharingの成功後、同じactor/epoch/operation ticket内で、canEditかつ非privateかつhasLinkの場合だけgetShareLink(expected)を読んでURLを表示する。getShareLinkは既存secretの復号と読取だけで、生成・永続更新はない。各await後にticketを確認し、失権/版変更はURLを消して明示再読取へ誘導する。private/viewerはtokenを取得しない。未知mutation結果の説明をread成功で消さず、mutation成功と後続read失敗を区別し、自動mutation再送を増やさない。

SH-01にはWS自体が非公開でも個別noteが公開される説明を加える。SH-08は詳細badgeも既存共有パネルへ接続する。DS-05には作業用の一覧検索への既存/notes導線を示し、複数account/WSの同名tag・順位・日本語部分/ASCII語頭・匿名/サインインのpublic-onlyを既存公開検索契約で確認する。

DS-03の往復は、アプリの個人/WS入口から公開ページへ移り、既存owner/member bannerで同じscopeの作業一覧へ戻る経路を使う。これはspec/design §3.1–3.2のアプリ/公開シェル分離に整合する「同じ経路」の採用解釈である。公開ページへアプリメニューや新viewerSession契約を加えず、実browserで両scopeの往復・layout/sort保持・filter解除を確認する。DS-06はlocal公開URLの直接閲覧と既存HTTP/sitemap/robots契約で確認し、実検索エンジンへの公開を前提にしない。
