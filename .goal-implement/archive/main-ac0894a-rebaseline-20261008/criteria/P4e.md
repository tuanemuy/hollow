# P4e: 一括公開範囲変更

項目状態の正本: [plan.md](../plan.md#p4e-一括公開範囲変更)。以下は固定IDごとの完了条件と検証根拠。

## P4e-A

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P4e-A | R05/R10/R12 / OR-09・JB・CLAUDE.md・design型/互換 | sharingの判別型/strict境界と旧tag/trash/move JSON・digest・旧move補完を維持する。固定source/500上限・501検知/50件preview・対象外の情報非開示を確認する |

## P4e-B

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P4e-B | R09/R12 / SH-01〜04・design単件共通core/原子性 | 同Tx visibility coreが現在認可/OCC・token/grant/public identity/epochを守る。単件の同値再適用を維持し、共有mutationと子finishのrollback・再配送非再実行を確認する |

## P4e-C

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P4e-C | R05/R09 / OR-09・SH-01/03・design確認 | 解除同意を子の確認版へ束縛し、公開前提不足は全体未受理。同visibilityは条件確認後だけ変更不要で非更新。空本文public/linkは理由付き子失敗、privateは許可し正当兄弟を継続する |

## P4e-D

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P4e-D | R05/R10 / JB-02/03・OR-09・design現在確認/再試行 | 本文/共有/member/移動ABA・source変化・失権/WS削除を現在判定。通常waiting取消/running結果保持、最新failedだけの新確認/新同意retry、旧attempt非復活を確認する |

## P4e-E

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P4e-E | R05/R10/R12 / OR-09・JB・CLAUDE.md React・design UI | owner/editor導線とviewer非表示、現在→目標説明、保存された変更済み/不要・失敗理由・本人履歴/通知を実UI確認。390幅/keyboard/現在actor-context-focus、ACK同ID同payloadの明示再送と非自動送信を守る |

## P4e-F

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P4e-F | R09/R12 / SH-01/02/04/06・EX-04・design共有結果 | batchのlink/private/public結果が既存reader/公開一覧・検索/ダウンロード現在認可へ反映される。token/canonical維持、元grant/export/ticket失効、SH-04再発行を兼ねないことを確認する |

## P4e-G

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P4e-G | R12 / CLAUDE.md・brief保全・design統合 | 規定checks/関連隔離/同bundle主要実UIと旧JSON/共有/identity/データ保持を確認。自己対象だけの停止下直前保全/通常回収、候補commit/source/bundle/lock固定と全停止で独立へ渡す |

## 検証報告への参照

- [P4e独立正式報告](../reviews/P4e.md)
