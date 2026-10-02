# P3f: ワークスペース削除

項目状態の正本: [plan.md](../plan.md#p3f-ワークスペース削除)。以下は固定IDごとの完了条件と検証根拠。

## P3f-A

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3f-A | R07/R10 / WS-10/JB、design現在確認/receipt | 現在ownerと保存名の完全一致を同UoWで照合し、不一致/確認中改名/非ownerを拒否する。削除対象・取消不可・事前移動を説明する。同内容requestは同じ本人receiptへ収束し、異内容/別人を拒否する。応答不明は本人の明示結果照会へ戻し、任意WS IDから内部情報を列挙できない |

## P3f-B

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3f-B | R07/R02/R04/R05 / WS-10、design全入口fence | 削除commit後、全memberの現在read/write/新規作成/bind/移入出/tag/検索/selection/原本/現在と過去版媒体/招待/iconを拒否する。scope不在を空集合成功や無条件personal結果へ置換しない。全入口の同Tx/snapshot照合を示し、旧snapshot応答や配布済bytesの限界と区別する。deleted行を通常Workspace DTOとして配らない |

## P3f-C

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3f-C | R07/R10 / WS-10/JB、design有限admission/永続回収 | 全current所有noteをactive/trashed/既purgingを含め有限admissionし、500capや全本文JS配列を加えない。削除intentと現在所有に束縛した内部purgeで既intentを共有し、admission前purge完了も同Tx一意対応で取りこぼさない。kick欠落/再起動/lease/二claim/rollbackで継続し、admission済み数やpage不在を回収完了にしない。0件/500超を検証する |

## P3f-D

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3f-D | R07/R04/R05 / WS-10/OR-12、design現在所有/物理負債 | 先に移出したnoteと資源は保持し、先に移入したnoteは対象、削除後の移入出は拒否する。bound資源は現在note所有、未bindだけはdraft/import admission所有を使う。writer begin/register/publish/最終採用が失効を守り、遅いwrite/第二put/回収失敗でもwriter終了と実remove前にchargeを消さない。他scopeのcompanion保持と最後のcleanup所有を守り、無関係personal資源を回収しない （P4f-1実変更: 共通storage/owner/claimDeleteの影響部分を[報告](../phases/P4f-1.md)に従って再確認） （[P4f-1独立受入](../reviews/P4f-1.md)） （[P4f-2独立受入](../reviews/P4f-2.md)） |

## P3f-E

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3f-E | R07/R10 / WS-10/JB-03、design現在子取消/招待icon | 全actorの現在対象の通常jobと未終端batch子を同Txで取消し、遅いtoken/結果を拒否する。成功済み移動/receipt/無関係兄弟は保持、不可逆purge/cleanup/削除workerは継続する。icon pointerと招待token/envelope/continuation/未送信配送を失効させ、使用0tag/member等を有限回収する。送信済メール撤回や個人Google解除/Drive外部削除を行ったと表示しない |

## P3f-F

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3f-F | R07/R10 / WS-10/JB、design最小deleted/履歴寿命 | 同WS IDのdeleted縮小行とslug予約を保持し、通常profile・member・招待秘密・期限外本文を回収権限に使わない。削除本人receiptは受理から90日、既存jobは元作成から90日を保持し、未回収intent/必要対応と分離する。receipt prune/本人失効後も回収を継続でき、期限外requestを再実行しない。回収完了・残共有資源・作成枠と物理負債を区別する |

## P3f-G

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3f-G | R07/R02/R10/R12 / WS-10、CLAUDE.md mutation/旧応答 | 設定最下部の確認からpending付き受理・個人文脈への遷移・本人結果確認が動き、受理を物理完了と表示しない。他memberは次の取得/操作で拒否と個人への導線を得る。scope/filter/選択・actor旧success/catch/finally・未保存退避を保ち、取消済通常jobと回収失敗を分ける。390幅/keyboard/通知/離脱再訪を同bundleで確認する |

## P3f-H

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3f-H | R12 / CLAUDE.md、design移行/保全risk | 内向き型/port/clock/id/UoWと新migrationだけで実装する。cloneでactive行制約/deleted縮小/FK/triggerと旧全列/版/pin/holding/0022receipt/objects/chargeを保全する。実変更枝だけ影響再検証し、規定checks/unit/関連Node/build・同bundleUI・commit/source・最終保全と全停止を揃える。新自己破壊対象/回復可否、借用/未検証/外部未接続を明記する （P4f-1実変更: Unicode共通化又は0030追加の影響範囲を[報告](../phases/P4f-1.md)に従って再確認） （[P5a独立受入](../reviews/P5a.md)） |

## 検証報告への参照

- [P4f-1独立受入](../reviews/P4f-1.md)
- [P4f-2独立受入](../reviews/P4f-2.md)
- [P5a独立受入](../reviews/P5a.md)
