# P4a: 限定共有・表示名

項目状態の正本: [plan.md](../plan.md#p4a-限定共有表示名)。以下は固定IDごとの完了条件と検証根拠。

## P4a-A

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4a-A | R06/R02 / SH-01/08、design共有正本・CLAUDE.md UoW | 共有正本を一元化し、既存/新規noteはprivateを既定とする。通常保存・変換・復元・移動でvisibility/token/passwordを上書きせず、共有変更で本文版/updatedAt/20版/pinを進めない。現在editorだけがprivate/限定を変更でき、viewerはreadonly。現在session/owner/lifecycle/本文条件/共有と所有確認版を同UoWで確認し、権限再取得・移動往復・古い確認を成功にしない（[P4e独立根拠](../reviews/P4e.md)） |

## P4a-B

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4a-B | R06 / SH-02/04、design秘密保持・key運用 | 限定リンクを取得/copyでき、拒否時は選択可能textを出す。privateではURL非表示、再限定は同token、明示再発行は確認後に旧token永久失効/password保持。private中の既発行再発行も状態をprivateに保つ。32B推測困難tokenをhashと専用envelopeで保持し、通常DTO/log/jobに漏らさない。同key再起動・欠損からの回復・明示有限rotationでURL/grant不変を確認し、既存招待keyや保全keyを変更/廃棄しない（[P4e独立根拠](../reviews/P4e.md)） |

## P4a-C

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4a-C | R06 / SH-03/06、designgrant/rate/資源 | 初回privateのまま保護を準備でき、token/passwordを原子的に確定してURLを隠す。任意passwordの8code points/1024B境界、完全一致、非再表示、変更/解除確認を提供する。匿名通過は本人browserとnote/token/epochに束縛し成功から固定24h、読取で延長しない。private化/変更/解除/再発行で旧grantを拒否、再限定は再入力、trash復元は期限内同grantを維持する。gateにtitle/著者/本文断片を出さず共通誤入力、採用rateの並行/再起動/固定期限、計算枠/503回復・有限pruneを検証する（[P4e独立根拠](../reviews/P4e.md)） |

## P4a-D

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4a-D | R06/R04 / SH-05/06、design匿名current認可・HTML隔離 | `/s/{token}`で保存済みtitle/著者/更新日時/tag/本文/styleを匿名閲覧できる。現在token/grant/lifecycle/ownerを同snapshotで照合し、描画後の採用前にも認可/sourceを確認する。無効/旧token/private/trash/purging/削除/現WS削除は共通404。current ref/ready媒体だけをGET/HEAD/Range前に再認可し、原本/history/draft/他noteや416経由の漏洩を防ぐ。script/CSS隔離、外部失敗でも本文維持、noindex/no-store/no-referrerと通常browser/botのgate/HTTPを確認する |

## P4a-E

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4a-E | R06/R12 / SH-01/02/04/05/08、CLAUDE.md UI・design旧応答 | 詳細/一覧badgeから現在の閲覧範囲・保護有無・リンク有無を説明し、member数はmember本人だけに出す。共有panelの変更/取消/copy/競合/ACK不明の回復とpendingが動き、未知の結果を成功扱いせず自動再発行/再送しない。匿名は現在editorだけ編集導線を得る。保存済み本文が共有対象と示し、未保存内容を暗黙保存/破棄しない。actor ABA/note切替/閉じ直し/旧success-catch-finallyを拒否し、390/keyboard/focus/reloadを同bundleで確認する |

## P4a-F

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4a-F | R11/R06 / AC-07表示名、SH-05、designcreator provenance | 本人が表示名だけを設定・保存し、共有panelへ検証済みnote IDで戻れる。trim後0〜50code points/制御文字改行拒否/未設定、profile OCC/pending/入力保持/失効を確認する。匿名著者はnamed/unset/deleted/unknownを正しく区別し、email/owner/uploaderで補わない。他人の名前は編集不可、未設定を限定化の禁止にしない。表示名変更はtoken/本文版/更新日時を変えず、設定復帰時に古い共有操作を自動実行しない |

## P4a-G

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4a-G | R06/R05/R07/R04 / SH-08/OR-12/WS-10/ED-09/10、design独立閲覧根拠 | 単一/一括移動で共有設定とtokenを保持し、確認には共有状態とmembership由来の閲覧増減を含める。旧memberでも有効linkの独立根拠は使え、編集には昇格しない。trash/restoreは同設定を保ちpurgeは新関連行を回収する。WS削除はadmission前から匿名read/unlock/mediaを拒否し、先移出を巻き込まない。Tx外描画/verify/media中の失効・移動・source変更を小実体で検証し、配信済bytesの限界と区別する |

## P4a-H

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4a-H | R12 / CLAUDE.md、design移行・資源・保全risk | 内向き型/port/clock/id/境界validationと新migrationだけで実装する。cloneで旧全列/trigger/版/pin/holding/receipt/objects/chargeを保全し、新共有row一意と通常writer保持を確認する。実変更した先行条件だけ再検証し、規定checks/unit/関連Node/build・同bundle実UI・commit/source・最終保全/正常停止を揃える。秘密を証拠へ保存せず、自己破壊量/回復可否、借用/未検証/後続機能を明記する （P4f-1実変更: Unicode共通化又は0030追加の影響範囲を[報告](../phases/P4f-1.md)に従って再確認） （[P5a独立受入](../reviews/P5a.md)） |

## 検証報告への参照

- [P4e独立根拠](../reviews/P4e.md)
- [P5a独立受入](../reviews/P5a.md)
