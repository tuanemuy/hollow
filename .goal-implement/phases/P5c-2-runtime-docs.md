# P5c-2-J Node Drive 運用文書補正

2026-10-01。入力は [E/J 残条件整理の最小文書補正](../reviews/P5c-2-ej-gap.md)。基点 `4b3995711c94957454cfbaf6863b6e9695abfb4a`。補正コミットは `fd4a2476a60a3ad4db3da2ac92235b0334e7e895`（`docs: align Node Drive operations with backup contracts`）。コミット対象は `docs/runtime_node.md` の Drive 節だけ、8 行追加・4 行削除。本報告は管理文書としてコミット外に置く。

## 結果

- 通常移行の対象を 0038 connection・0039 backup・0040 queue・0041 target heads に揃え、停止時の DB/sidecar・原本・履歴/所有記録・必要な暗号鍵の保全を明記した。
- 手動・有効化時の自動・確認付き一括バックアップを説明し、自動は初期 OFF で設定から有効化できるとした。対象は取り込み原本だけで、編集 Markdown は含まない。
- 未送信の永続証拠と旧所有処理の閉鎖・ACK がある場合だけ、確認済み新保存先への新受付を許す。割当前の folder 検査失敗も含め、旧結果を保持し、外部結果不明を別保存先への変更で回避しない。
- 通常 refresh 非取消、明示再連携は影響確認後の成功時だけ旧 backup 取消、失敗時旧連携/転送保持、同一 Google account 再連携も同条件とした。
- 保存先利用不可は永久削除を含め確認後の再選択/新規作成、missing は削除と断定せず、trash は復元案内も行う。自動置換・既存 Drive 物の delete/move は行わない。
- ローカル契約/隔離 DB 検証と、実 Google・既存 `actualfresh` DB 移行・Drive 再生成の未検証を区別した。新保存先 backup の browser 一連操作も未検証のまま残した。

## 静的根拠と確認

現行の `migrations/0038_drive_connection.sql`、`0039_drive_backup.sql`、`0040_drive_backup_queue.sql`、`0041_drive_backup_target_heads.sql` の名前を照合した。公開コードは `backup/automatic.ts`、`backup/bulk.ts`、`backup/retarget.ts`、`backup/runner.ts`、`drive/connection.ts`、`DriveSettings.tsx` を確認した。採用判断は [E/J 整理](../reviews/P5c-2-ej-gap.md)、検証境界は [Retarget 主報告](P5c-2-retarget.md) と [独立報告の最新判定](../reviews/P5c-2-retarget.md) に従う。既試験の件数を再計上せず、文書補正を A/I や E/J 全体の完了根拠にしない。

差分を静的に確認し、Drive 節以外に変更がないこと、設定 schema・秘密ファイル/鍵の制約・OAuth/Picker/CSP・同 bundle shutdown と停止順序が不変であることを確認した。`git diff --check -- docs/runtime_node.md` とコミット後の `git show --format= --check HEAD` は成功。Markdown は既存と同じ見出し・空行・段落形式を維持した。

型/lint/format/test/build/import、DB/runtime/browser/HTTP、秘密/旧 private 操作は 0。文書専用 commit では hooks を無効化し、検証プログラムを起動していない。開始時と終了時の tracked worktree は clean、既存の未追跡 `.goal-implement/` は保持した。本報告以外の管理文書は未変更。`spec` / `spec-implement` は未使用。

文書補正と静的確認を完了し、全 read/write/run を停止する。
