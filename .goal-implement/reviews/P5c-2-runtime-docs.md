# P5c-2-J Node Drive 文書差分の独立確認

2026-10-01。文書差分のみ受入可。必須補正はない。J 全体、E、Retarget A/I、実接続、actualfresh 移行の完了判定ではない。

## 固定候補と範囲

- candidate: `fd4a2476a60a3ad4db3da2ac92235b0334e7e895`
- parent: `4b3995711c94957454cfbaf6863b6e9695abfb4a`
- commit 差分: `docs/runtime_node.md` だけ、8 行追加・4 行削除。Drive 節以外の差分なし。
- 開始・終了の HEAD は candidate、tracked worktree は clean。主の [補正報告](../phases/P5c-2-runtime-docs.md) を全文読了し、commit 差分、[E/J 最小案](P5c-2-ej-gap.md)、現 source と既正式報告へ照合した。

goal-implement の独立 Verifier として静的確認だけを行った。製品編集、型/lint/format/test/build/import、DB/runtime/browser/HTTP、旧 private/秘密/結果の読取は 0。本書以外の管理文書は変更していない。`git diff --check` は対象 commit 間の文書差分だけに実施し成功した。

## 項目別判定

| 確認項目 | 判定・根拠 |
| --- | --- |
| 限定 DDL と保全 | 0038–0041 の名前を公開 migration ファイルと照合。停止後の DB/sidecar、原本、履歴/所有記録、必要な鍵の保全を明記し、隔離 DB 契約検証を actualfresh 移行成功へ転用していない。新 DDL・移行実行を指示する許可ではない |
| 現機能の説明 | 手動・有効時 auto・確認付き bulk、auto 初期 OFF、取り込み原本だけという記述は既受入と整合。旧文書の auto unavailable を除去しただけで、全条件の UI/実 Google 成功を主張していない |
| 新保存先への受付 | 未開始・永続証拠・旧実所有の close/ACK・明示確認・旧結果保持・不明結果の同 ID 回復を記述。`RetargetPersistenceEvidence` の never-sent/unallocated と `retarget.ts` の現在認可・証拠・caller/ACK 検査に整合する。これは運用要約であり、file ID 割当済み、session/ACK 不明、owner unknown、既 record 等を新 ID に移せるという許可ではない。既厳密 guard は不変更 |
| 保存先利用不可 | 永久削除を含め確認→再選択/新規作成、missing だけでは削除断定なし、trash は復元案内も、自動置換/既外部物 delete/move なし。利用者決定と一致 |
| 再連携・refresh | 明示影響確認、新成功時だけ旧取消、同 Google account も対象、失敗時旧保持、通常 refresh 非取消、旧転送を新資格へ無言付替えしないことを明記。親候補から不変更の application/UI と E/J 既静的根拠に整合。未完の configured 再連携 UI を完了扱いにしていない |
| 設定・秘密・scope・CSP | config/keyring schema、16 KiB/0600/0700/鍵数と長さ、専用鍵、callback、OAuth/Picker の project/origin 条件、限定 CSP、no-store/no-referrer、token 期限と文書寿命の説明は差分なし。scope 拡大・wildcard/unsafe-eval・秘密値の追加なし |
| 同 bundle/停止 | 直前の Graceful shutdown 節と直後の Shutdown sequence は不変更。新段落も abort と実 close を区別し既停止順序へ参照する。UI3 forensic を正常 drain 成功へ振り替える表現なし |
| 未検証・実接続手順 | actualfresh、live Google、Drive 再生成、新保存先 browser 一連操作を明示して未検証のまま保持。実 backup の current result/link、同 ID 不明回復、安全停止を将来の明示許可対象として追加し、synthetic 成功を実接続成功としない。実 account/API/課金には別途承認が必要 |

追加確認した公開 source は [retarget](../../packages/core/src/application/integration/drive/backup/retarget.ts) と [永続証拠型](../../packages/core/src/domain/integration/driveBackup.ts:272)。その他の不変更機能・checks・検証境界は [E/J 整理](P5c-2-ej-gap.md)、[Retarget 主報告](../phases/P5c-2-retarget.md)、[独立報告](P5c-2-retarget.md) の既根拠を利用し、今回の独立実行として再計上しない。

## 返却

J の運用文書補正差分は受入候補。文書だけを理由とする追加 build/test/DB/browser は不要。E の既残 UI、A/I の未到達、J の全体残条件、実接続/actualfresh は従来どおり残す。本書の全文と固定状態を確認後、文書を含む全 read/write/run を停止する。
