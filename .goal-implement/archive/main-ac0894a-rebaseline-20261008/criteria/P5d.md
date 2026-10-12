# P5d: 退会の固定完成条件

出所はR11/AC-09、R07/R08/R12、[共有契約](../contracts/account-delete.md)と[正式案](../phases/P5d-formal-plan.md)。[独立計画レビュー](../reviews/P5d-formal-plan.md)のP5d-P1補正を含める。状態の正本はplan.md。

| ID | 完成条件 |
| --- | --- |
| P5d-A | 本人email一致で不可逆退会を原子的に受理し、deleted ID anchor/authVersion fence・旧cookie拒否。email不一致/最後active ownerはintent/fence0。password/Google-only両形と再登録の別ID、人物deleted/missingの区分を守る |
| P5d-B | active WS最後ownerをDB同Tx正本で保護し、二owner退会/降格の競合でowner0成功0。WS削除fence済み回収は継続。存続WS/移動済みノートの現owner・原本・charge・成功来歴を保持 |
| P5d-C | 受理直後の個人公開/link/media/original/grant/artifactは404。旧session/遅callback/直接claim/結果採用を拒否。全入口台帳とmove両順序で現在personal ownerだけを回収し、旧著者をhandle再取得者へ接続0 |
| P5d-D | matching deletion intent/実依存閉鎖後だけtarget/recordを秘密なしshellへ縮小。ID/sha/bytes成功来歴を保持し、再生成一覧/単件は秘密locator検査より先にrecorder-unavailableを返す。通常usable不変保証、別intent/復活/付替え拒否を守る |
| P5d-E | active/unknown・callerEnded/ACK未確定・readPinned/refreshPending/object_writes/input receiptのdebt中は早期資格/object回収0、新利用0。通知throw/commit応答喪失でもfenceは復活せず、exact閉鎖/ACK後だけ全コピー縮小 |
| P5d-F | durable intentの25行pageで51履歴を回収し、cursor停止/再開・応答不明exact再照合を確認。複数debt保持中も他rowを進め、全世代secret/subject/未完purge/debtの最終EXISTSが0後だけsucceeded |
| P5d-G | 新0044とsnapshot/journalのみで既migrationを保持し、FK/index/trigger・正負CHECK/unique・不可逆guard/mapper/直接repository fenceを検証。通常active auth/WS/Driveの影響範囲、規定checks、独立入口/全コピー台帳照合を揃える |
| P5d-H | 同候補日本語UIで説明/email入力/pending/error/最後owner案内、keyboard/mobile、成功cookie失効と再読込拒否。有限停止・正常DBclose後監査、起動/再実行手順を揃え、外部実接続は区分する |

新合成root192MiB/logicalDB最大3・各32MiB/合計64MiB、object8MiB、account6/WS2/note12/履歴51、page25、基本Worker/child0、case40秒/suite180秒/run12分・bail1を採用候補とする。実行担当とexact manifest・停止条件は実装委譲時に固定する。
