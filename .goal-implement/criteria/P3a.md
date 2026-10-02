# P3a: ワークスペース作成とscope基盤

項目状態の正本: [plan.md](../plan.md#p3a-ワークスペース作成とscope基盤)。以下は固定IDごとの完了条件と検証根拠。

## P3a-A

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3a-A | R07 / WS-01/02、design入力境界 | 名前/説明/slugで非公開WS作成、自分owner、現在scope常時表示、URL/reload/再訪で復元する。空名・slug予約/不正/重複競合と代替候補・現存creator WS20件、通信失敗の入力保持を検証する。招待導線はP3b未完 |

## P3a-B

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3a-B | R05/R07 / OR-01、WS-02 | 個人/参加WSのmetadata一覧を更新順keysetで続き読込できる。scope/同時刻cursor境界、非member/削除scopeの回復、旧応答拒否、空/skeleton/errorを確認する。全文検索/タグ/月/三表示/任意sortは後続 |

## P3a-C

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3a-C | R02/R03 / ED-01〜08、IM-01〜05のscope接続 | WSで白紙/媒体のみnoteと原本/同梱importを作り、同ID保存・再訪・三mode・原本/履歴媒体・参照on/off・本人job結果を利用できる。受付後のscope切替で投入先が変わらず、個人の既存動作を保つ |

## P3a-D

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3a-D | R07/R02/R04 / WS-05/06の現在policy、OR-11、C1/design | owner/editor/viewer/非memberを実UoWで区別し、全read/save/媒体/原本とworkerの現在認可を守る。他actor確認/再更新、失効後結果拒否、最新入力回収、本人job/作者限定stagingを確認する。実UI招待/role操作による失効はP3bに残す （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## P3a-E

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3a-E | R03/R04/R10 / IM共通容量、ED-09/10、JB-01〜03、AC-10部分、designQ3 | 個人5GiB/WS20GiBの使用量/予約・上限を別計数し、原本/asset/参照/同梱/猶予/回収待ちを欠落・二重計上しない。scope trash/undo/restore/単一purge/期限/emptyが同じ保持/回収契約へ接続し、失敗中はchargeを保つ。system期限回収を人物として偽装せず、利用者jobは本人限定。GiB/80%超/最終更新時刻と保存先を示す （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## P3a-F

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3a-F | R12 / CLAUDE.md規約、design移行保全 | online backup/clone移行で旧全列・版/pin/object/個人容量を保全する。creator記録不明を捏造せずunknownとして保持する。型/レイヤー/port/境界、pending/error/keyboard/390px、規定checks/tests/build、同bundle起動と明示commitを揃え独立検証へ渡す |

## 検証報告への参照

- [d55b3fc独立受入](../reviews/P5b-3a1.md)
