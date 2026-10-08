# main 再確認の設計前提

検証対象は main `ac0894acb78be85f8b10c3c7450fbb00a8c40561`。今回は新しい実装設計を採用せず、コミット済みの製品と要件の対応を確認する。

要件は [requirements](../spec/requirements.md) と [scenario](../spec/scenario/index.md)、画面の設計前提は [spec/design](../spec/design/index.md)、レイヤーと依存方向は [CLAUDE.md](../CLAUDE.md) に従う。

外部依存の検証段階と保全の制約は [brief.md](brief.md) に置く。各 Verifier は秘密設定のない新しい main checkout と自分専用のローカル DB・objects・mailbox・鍵を使う。ブラウザ担当は2名以下とし、各環境の操作担当を1名に固定する。これは旧環境を変更しないための検証環境の準備であり、追加のプロダクト完了条件ではない。

worktree のコミットは現在 main の受け入れに含めない。フェーズ計画は利用者の修正つきで承認済み。最新の「開始しないで」に従い、実装と共有契約の変更は次の再開指示まで行わない。P00 は現在のスキーマ・契約に自動テストを合わせ、製品不具合が示された場合は製品を修正する。異常系はリポジトリの integration/e2e、主要正常系と UX はブラウザで検証する。
