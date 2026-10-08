# Hollow 実装の依頼範囲

## 元の要求

Hollow要件全体を既存テンプレートから設計・実装・独立検証する。品質目標は extremely well。元の指示は2026-09-06の `$goal-implement` と利用者の継続指示である。

要件の正本は [requirements](../spec/requirements.md)、背景は [idea](../spec/idea.md)、操作と異常系は [シナリオ](../spec/scenario/index.md)。[画面案とトークン](../spec/design/index.md)を参照する。

## 完成時の利用者体験

個人とチームがファイルをHTMLノートへ変換し、保存・編集・整理・共有できる。登録・メール確認・認証、三編集モード、タグ/検索、個人/ワークスペースの移動、三公開状態、書き出し、ジョブ履歴、OpenRouter/Drive個人連携、ロール制御を含む。

HTMLを正データとし、元ファイルも保持する。保存結果は再読込後も残り、長時間処理は画面を閉じても継続する。公開を取り下げた情報は公開URLと検索から取得できない。全体完成は必須機能と独立統合検証・必要な実接続検証を満たしたときに判定する。

## 制約と対象外

- CLAUDE.mdのTypeScript、Hexagonal/DDD、ポート、境界検証、React 19の応答性を守る。
- 日本語UI。白基調・無彩色・中央一列の画面案を採用する。
- 既存のユーザー変更と保全資料を保持する。
- 課金/プラン/決済、多言語UI、本番公開/クラウドデプロイは対象外。
- spec/spec-implementスキルは使用しない。
- Managerが全体goalと管理文書を所有し、Implementerが実装、独立Verifierが検証する。

## 採用する仮定

実行基盤はmacOS arm64上のNode参照配備。OfficeはDOCX/XLSX/PPTXを対応形式とし、旧DOC/XLS/PPTを無言で変換成功にしない。

原文が未指定の容量・URL・検索・タグ・書き出し・認証・媒体の動作と運用値は [assumptions.md](assumptions.md)、共有契約は [design.md](design.md) に置く。利用者決定と採用仮定を区別する。運用値は利用者指定の要件上限やOSの硬保証へ読み替えない。担当範囲の仮定だけを読む。

## 検証環境の再開

開発は旧環境を保全した新しい永続・隔離rootで進める。DB・objects・mailbox・鍵・自己資格情報を分離する。永続データと唯一の保全資料をOS回収対象の一時領域へ置かない。短命な自己testの専用tempは別に扱う。

旧DBと420完全一致objectsの保全資料を保持し、未復元37objects/13,222BはD01へ残す。破棄・代替・復元完了の承認はない。freshの機能検証と保全済み旧DBからの移行clone比較を区別する。

2026-10-06の継続指示により製品実装・動作検証を再開する。以前の担当は停止済みで、新Implementerと独立Verifierが担当する。受入基点は `a013479e748fb755baf21af8f3765c888458e884`。[S2最終独立報告](reviews/P5c-3-s2-f2.md)を根拠にし、新candidateと関係する部分だけ確認する。既distはS1/S2未搭載であり、通常接続や同bundle UIの根拠には使わない。

保全対象の旧private DB/key/results/cache/proofと検証rootは読取・hash・import・再利用しない。actualfresh・D01も非操作で保持する。新検証は別0700 rootと有限資源/期限を事前固定する。失敗DB/結果を保持し再利用・上書きしない。公開helperはexact regular/non-symlink/bytes/SHAの確認・自身の全文読了・別rootへの限定適応だけで再用する。

旧processの探索・未知PIDへのsignal・広域argv/env/comm列挙を行わない。既知自己対象だけを限定確認する。秘密値を報告へ記載せず、漏えいが疑われる対象外資格情報を再読・保存・hash・利用しない。

根拠の前後同値・writer/child/pipe/FD等の実終了・DB確定を別に確認する。timeoutやterminate要求を終了成功とみなさず、欠測を補完しない。旧失敗や限界の詳細は担当phases/reviewsに保持する。実接続・外部操作・課金・公開は未許可。

## 外部依存の検証段階

| 依存 | 先行する検証 | 実接続待ち |
| --- | --- | --- |
| Google認証 | 代替アダプターのログイン/紐付け/失効契約 | OAuth設定とテスト利用者による実認証 |
| メール | ローカルmailboxの確認/再設定/招待契約 | 送信サービス設定と承認済み宛先での到達確認 |
| OpenRouter | 認可/モデル選択/変換/取消契約 | PKCE設定・利用者連携・費用承認を得た実変換 |
| Google Drive | 認可/backup/再生成/解除契約 | OAuth/Picker設定と明示共有folderでの実操作 |

設定の回答がない依存は契約検証で進め、実アダプターには資格情報がある場合だけ実行する契約テストを置く。必要設定と実接続手順を残す。契約合格を実接続成功へ読み替えず、実接続条件が未検証のままgoalを完了にしない。

音声は利用者指示で保留する。採用privacy条件のdata_collection=denyとallow_fallbacks=falseがOpenRouter専用STTでは非適用で、require_parametersの適用も未確認である。別方式の調査・設計・製品接続は音声の再開指示まで行わない。音声を完成・実接続待ちだけ・対象外にはせず、未完の必須要件として保持する。[根拠](phases/P5b-3a0-stt-contract.md)

## 利用者が確定した仕様

### 保存先の変更確認

Drive保存先が利用できない場合は、永久削除を含め必ず確認後に再選択/新規作成を案内する。ゴミ箱内と確認できた場合は復元も案内する。404/changes.removedを永久削除の証拠にせず、所在不明・権限喪失・ゴミ箱内を観測できた範囲で区別する。追加scope・自動作成・自動復元を行わない。IN-05の自動再作成よりこの利用者決定を優先する。[技術根拠](phases/P5c-folder-deletion-proof.md)

未完又は成立不明の旧backupは同じfile IDを確認する。確認できない旧backupを新保存先の別IDへ自動再送せず、成功済み記録を付け替えない。Google上のfileを無断で移動/削除しない。

### 確定済みの回答

- 公開handle変更時もnote URLと限定tokenを維持し、プロフィールURLだけを変更する。creator脱退や他人/WSへの移動でも同じとする。SH-07の旧note URL失効よりこの決定を優先する。旧handle再利用は採用仮定に従う。
- Google初回ログインが既存accountと同一メールでGmail/Google Workspace管理外の場合、既存password又は新しい確認メールで追加本人確認する。過去の確認済み状態で省略せず、成功前にIdentity紐付け/サインインを完了しない。[根拠](reviews/P5-feasibility.md)
- LLMの初期月間上限はaccountあたり30回。1fileの論理変換/再生成を1回とし、内部分割は非加算、運用設定で変更可能とする。採用仮定はUTC暦月、intent後の失敗/応答不明も計数、証明できた未送信だけ返却。外部request数/費用上限とは別である。
- OpenRouter再連携では影響確認を表示し、新連携の成功時に旧変換を取消す。失敗前に旧鍵を破棄せず、新鍵へ自動付替えしない。実行済み外部費用の取消は保証しない。
- Driveの明示再連携でも影響確認と新成功後の旧backup取消を行う。通常refreshは対象外。取消要求と実通信終了を区別し、実closeまで旧所有を保持する。Googleログインと独立して解除し、既存Drive物を変更しない。
