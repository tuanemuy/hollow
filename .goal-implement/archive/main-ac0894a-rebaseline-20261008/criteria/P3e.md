# P3e: 選択と一括整理

項目状態の正本: [plan.md](../plan.md#p3e-選択と一括整理)。以下は固定IDごとの完了条件と検証根拠。

## P3e-A

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3e-A | R05/R12 / OR-09、design選択snapshot・CLAUDE.md有限read | 表示済み一意IDと絞り込み結果全体を別操作にし、選択は最大500の固定ID/順序とする。全体readは同snapshotの現在認可・active・正確検索・tag/月/zone条件後にIDだけ501件まで確認し、超過は分割案内、先頭500を全体と呼ばない。calendar全体は月でday/cursorを除く。既存共有read実行枠と通常50件を保ち、準備中/timeout/旧応答を空集合成功にしない。0/500/501と正確条件・現在失効を検証する |

## P3e-B

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3e-B | R05/R02 / OR-09、design選択文脈・CLAUDE.md親所有 | boardが選択mode/件数/下部操作barとpending/errorを所有し、tile/list/calendarで操作できる。適用filter/scope/zone変更で解除、sort/layout/page/day展開だけなら保持、palette未適用入力や外部の新一致を混ぜない。全体から一部解除はsubset、reload/一覧離脱で未送信選択を復元しない。旧success/catch/finallyとABAを拒否する。viewerは選択と後続downloadの境界だけを示し、権限外mutationを表示せずserverも拒否する。390/keyboard/既存optimisticとの共存を確認する（[P4e独立根拠](../reviews/P4e.md)）（P4f-1の選択bar・履歴/ticker・独立通知dismiss接続による影響部分を再確認。[実装報告](../phases/P4f-1.md)） （[修正版独立受入](../reviews/P4f-1.md)） |

## P3e-C

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3e-C | R05/R10 / OR-09/JB-02、design有限確認・同内容受理 | 最大50件ずつ現在の対象外N/実行Mと操作影響を確認し、固定IDを検索で置換しない。不可視対象のtitle/新所属を漏らさず、全件対象外は開始しない。同bundleの確認状態がページ間で違えば再確認する。acceptは現在認可と表示集合を照合し、actor/request/正規化設定/順序/確認値が同内容の再送だけ同親へ収束、異内容は拒否する。有限payload/受理SQL量を確認し、500件を無断で縮めず、mutation全件を一つの長いTxへ入れない （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## P3e-D

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3e-D | R05/R02/R10 / OR-09/JB-03、design単一core・tag identity | tag/trash/moveのapplication coreを同UoWで共用し、現在権限・既存不変条件と変更/結果原子性を守る。tagはdeltaだけ、50上限/同値/同名競合で本文版/日時を変えない。明示createはintentと一度だけresolved IDを分け、最初の成功と同Tx確定、失敗時新tagもrollback、外部delete/merge後やretryで別IDへ補わない。trashは通常ゴミ箱移動とし、新処理の無断取消や完全削除に置換せず、現在version/取消確認を守る （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## P3e-E

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3e-E | R05/R04 / OR-09/OR-12、design Q2/Q3・receipt鎖 | 一括移動は両側の現在edit・閲覧者増減/タグ対応・本文/版/原本保持・所有世代fenceを維持する。初回合計は固定順の仮想holding理由遷移で共有bundleを一回課算し、全成功想定と実結果を分ける。自己成功の同Tx receiptだけで後続の2holding/増減額を導出し、note自身/resource/tag/member/contentは元expected厳密比較、各子現在quotaを検査する。bundleあり成功だけsequenceを進め、最大500edgeのcoverage/連続prefixとbaseを照合する。A成功/失敗、外部C同数ABA、別parent、0B/bundleなし、欠落/prune/rollbackで最新値fallbackを拒否する |

## P3e-F

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3e-F | R10/R05 / JB-01〜03、design永続実行・CLAUDE.md UoW/outbox | 親1件/固定target/attemptを永続受理し、画面離脱・worker再起動・kick欠落後も処理を継続する。同parent1running/固定順、有限claim/leaseと旧token拒否、子変更/成功result/receiptの同Txを守る。commit後ack喪失・再配送で二重変更せず、不明は永続結果確認へ戻す。通常失敗は兄弟継続・成功保持、cancelledは理由なし、failedは安全な理由を持つ。現在actor/policyを再検査し、session/cookieをjobへ保存しない。運用値と正常drain/中断回復を実環境で確かめる（[P4e独立根拠](../reviews/P4e.md)） |

## P3e-G

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3e-G | R10/R05/R07 / JB-01〜03/OR-09、design再試行・取消・履歴 | 本人だけの親一覧/子有限page・独立summary/watch・ticker/完了失敗通知・90日表示を提供し、受理を全件完了と表示しない。失敗した最新子だけ同対象/固定設定の新preview/baseでretryし、重複・成功/取消済み・削除/失効対象を拒否する。retry後の親集計/再取消と最新結果を保つ。通常親取消はwaitingだけを止めrunning結果を残す。membership edit-lossとnote trash/purgingの外部取消は同Txで旧attemptを終端化し、自己trash attemptは除外、再参加で復活しない。90日旧詳細と未終端依存receipt/資源provenanceの寿命を分離する（[P4e独立根拠](../reviews/P4e.md)） |

## P3e-H

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3e-H | R12 / CLAUDE.md、design移行保全・既存影響risk | 新schema/portは内向き型/境界validation/純粋coreを維持し、旧migrationを変更しない。新backup/cloneで旧全列/版/pin/objects/課算を保全する。実編集した先行条件だけ再検証し、規定checks/unit/関連Node/build・同bundle正常/部分失敗/取消/retry/再訪UI・明示commit・最終source/環境/保全を揃える。自己削除/復元可否、借用/未検証/外部未接続と全操作停止を正式報告し、独立検証へ渡す（[P4e独立根拠](../reviews/P4e.md)） |

## 検証報告への参照

- [P4e独立根拠](../reviews/P4e.md)
- [修正版独立受入](../reviews/P4f-1.md)
- [d55b3fc独立受入](../reviews/P5b-3a1.md)
