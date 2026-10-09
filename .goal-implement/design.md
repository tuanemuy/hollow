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
