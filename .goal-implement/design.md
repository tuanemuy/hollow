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
