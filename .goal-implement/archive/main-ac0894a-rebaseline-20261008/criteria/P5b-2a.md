# P5b-2a: テキスト本文生成・再生成・月間枠

項目状態の正本: [plan.md](../plan.md#p5b-2a-テキスト本文生成再生成月間枠)。以下は固定IDごとの完了条件と検証根拠。

## P5b-2a-A

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5b-2a-A | R02/R08/R10/R12 / IM/JB・CLAUDE.md・design保存/所有 | 既job/本文commitを再用しconversion/dispatch/quota bucket/reservation/account admission fenceの5加算表と内向きportを型/UoWで接続。epoch単一正本・旧表再構築なし。通常/途中SQL失敗/末尾FK失敗cloneで旧全列/trigger/FK/ledger/objects保持、正常freshへ接続する （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## P5b-2a-B

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5b-2a-B | R02/R08/R12 / IM-01/05/06・design入力/出力 | text/HTML/MD原本をowned read/worker実終了で有限準備、全文順序/見出し/table/code網羅と分割境界を確認。現在model profile/用途/必要parameterを検査し、超過/未適合は明示失敗、無言切詰め/モデル変更/機械fallbackなし。未信頼生成HTMLをsanitizerへ通し新src/CSS取得0・既知note-owned mediaだけ復元、refusal/length/tool/空/部分出力は非採用 （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## P5b-2a-C

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5b-2a-C | R02/R08/R10/R12 / IM/JB・designintent/unknown | durable intent/dispatch UUID/唯一owner確定後に1送信、有限検証/実close後に同owner応答保存。intent前後/応答保存前後crash・DB ACK不明・90秒lease超過/再配送で送信が増えない。保存済応答だけ後処理再開、intent-only/終了不明の自動再発注/早期解放なし。local終了とremote課金終了を分ける （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## P5b-2a-D

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5b-2a-D | R01/R02/R08/R10 / AC-10・IM/JB・利用者30・designquota | account月30を運用設定可能にしUTC受理月予約/初intent消費を同Tx確定。29から並行2・30超過失敗job・16segment1回・同command・月跨ぎ/limit変更・retry新1回を実DB検証。全segment未送信かつ全owner終了証明だけ返却、先行送信済み後続失敗は返却0。原本/旧本文保持、消費/予約/残数/更新時刻/TZ reset/80%超警告と機械可能形式の代替を表示 （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## P5b-2a-E

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5b-2a-E | R02/R05/R08/R10 / IM-06・JB-03・IN・利用者再連携・design現在権限 | 現在personal owner/WS owner-editorが本人鍵で要求、viewer拒否/public fallbackなし。logout継続とrole失効/trash/解除取消を区分。再連携preview件数/admission watermark再確認、新採用と旧epoch dispatch/late-result fenceを同Tx確定、失敗時旧継続・新鍵自動付替え0。通常batch queued取消と再生成running取消を分け、実abort/closeまで所有保持 （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## P5b-2a-F

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5b-2a-F | R02/R03/R05/R10 / IM-06・JB-02・design本文/undo | 再生成中は旧本文閲覧/進捗とserver/UI編集・移動禁止、失敗/取消は旧本文/版不変。成功は現在source/version/権限/epoch/取消を同Tx照合し既commitNoteの版/FTS/asset pin/失効hook接続、title/tag/public/shared identity維持。直後undoは同生成版だけ本文を新revisionへ戻し現在title/style等保持、後続編集は履歴復元。新epoch retryは元モデル/指示を初期値とする明示新job、非適合の無言default復帰なし （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## P5b-2a-G

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5b-2a-G | R01/R02/R03/R08/R10/R12 / IM/JB/AC-10/IN・CLAUDE.md React | 同bundle契約実UIでtext import→job→本文、HTML/MD原本再生成→undo/履歴、quota/上限、取消/unknown/明示retryを接続。pending/error/actor-route-確認世代/ACK喪失/390px/keyboardと既機械継続を確認。未提供媒体/実品質未検証を明示し、離脱後追跡と内部分割非加算を守る （[957603f表示V1独立受入](../reviews/P5b-3a1-v1.md)、処理/保存等は[d55b3fc独立受入](../reviews/P5b-3a1.md)の不変更範囲を維持） |

## P5b-2a-H

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5b-2a-H | R12/R02/R08/R10 / CLAUDE.md・brief保全・design有限値 | 採用並列/期限/bytes/segment/response予算、別generation HTTP、startup owner回復/停止/prune/purgeを実close小対で検証。unknownは60秒監督で解放せず90日履歴と負債を分離。規定checks/影響回帰/build・条件付き実接続手順・旧全保全/自己通常回収/commit-source-bundle-lock/正常全停止を揃え、実外部/課金/秘密探索や全OS保証へ拡大しない （[d55b3fc独立受入](../reviews/P5b-3a1.md)、今回の直接差と明示借用の範囲） |

## 検証報告への参照

- [d55b3fc独立受入](../reviews/P5b-3a1.md)
- [957603f表示V1独立受入](../reviews/P5b-3a1-v1.md)
