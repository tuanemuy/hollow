# Hollow 実装計画

## 現在地

- 更新: 2026-10-02T02:02:27+09:00
- 作業場所: `/Users/hikaru/github.com/tuanemuy/hollow/.goal-implement`
- 依頼範囲: [brief.md](brief.md)。要件全体の完成と独立した統合検証を目標とする。
- 製品実装・動作検証は休止中で、製品担当は停止済み。明示再開後に開始する。管理文書の整理は休止を解除しない。
- 受入基点: `a013479e748fb755baf21af8f3765c888458e884`。P5c-3-S1全4項目、S2全5項目を受入済み。
- 台帳: **244 / 269 done**、review 1、in_progress 22、pending 1、blocked 1。全体要件 R01–R12 の受入は 0 / 12。後続の未採番作業を含まないため、244/269を製品の完成率として使わない。
- 次の一手: P5c-3-S3 の案へ M1–M4 の補正を反映し、共有契約・受入ID・変更path・検証資源を確定する。S3製品実装は未開始。

## 残作業と依存関係

後続作業は以下の範囲に固定する。未採番の行も要件の残作業であり、台帳の269項目には含まれない。委譲時に固定IDを採番し、観測できる条件と依存を確定して台帳へ追加する。検証ケース数や報告ファイル数を作業項目数に加算しない。

| 作業範囲 | 出所 | 残る完成条件 | 依存・再開条件 |
| --- | --- | --- | --- |
| Drive本人連携・保存先・解除 | R01/R08/R12、IN-04/05/08/09 | P5c-1 A–Fの残UI/通常接続・移行/統合根拠を揃える | S1–S5bの局所受入を維持し、残3群を後続候補で確認 |
| 原本バックアップ | R08/R10/R12、IN-05/06/09 | P5c-2 A/E/I/Jの残UI・relink・同bundle根拠を揃える | B/C/D/F/G/Hの受入を維持。保存先変更の利用者決定を適用 |
| 通常local textの入力段階接続（S3、未採番） | R08/IM-06、IN-07、R12 | 通常受付→claim→取得/準備→入力終了→dispatch→本文CASを接続し、不明commit・取消・前任回復を検証 | S2受入済み。S3案のM1–M4補正・共有契約/実行範囲確定が先 |
| 再生成の残入力・Drive製品接続（未採番） | R03/R08/R10、IM-06、IN-07 | local PDF/Office/画像等の残入力寿命接続、機械/共通本文処理、Drive正規受付/候補/UI/本文採用/巻戻しと必要なfenceを完成させる | S1/S2隔離成功を通常機能成功へ転用しない。詳細依存はS3後の委譲で確定。音声は保留 |
| 退会（P5d、未採番） | R11/AC-09、R07/R08/R12 | 最後のowner拒否・即時認可失効・資格縮小・個人データ回収・存続WS/移動済みデータ保持を接続 | accounts縮小deleted/active-only読取の方向を採用。秘密縮小方式・型/DDL/移行は未決 |
| 機能横断の残検証と統合検証（P6） | P1-E/P2a-E、R01–R12 | 全要件の根拠を照合し、主要シナリオを日本語/keyboard/mobileで確認。規定checks・起動/再実行手順と既知の必須不具合解消を揃える | 実装可能な必須範囲の接続後。影響のない既受入を再演しない |
| 音声入力（保留、未採番） | R03/IM-01、R08/IM-06 | privacy条件を満たす方式と製品接続・検証 | 利用者の音声再開指示が必要。別方式調査も保留。未完の必須要件として保持 |
| 旧データ保全残件 | D01/R12 | 未復元37objectsの扱いを確定 | 回復元又は利用者の明示判断が必要。旧資材を非操作で保持 |
| 外部実接続検証 | R01/R08ほか、[外部依存](brief.md#外部依存の検証段階) | Google/メール/OpenRouter/Driveの実サービスで確認 | 設定・検証アカウント・送信/操作/費用の承認が必要 |

## 終了条件

| 到達点 | 判定 |
| --- | --- |
| 実装可能な範囲の完了 | 残機能の契約検証とP6を終え、保留/外部条件待ちだけを具体的に列挙できる状態。全体完成とは区別して報告する |
| 完了（実接続待ち） | 必須の未完が外部実接続だけの場合に限る。音声の保留・D01・製品未接続が残る間はこの判定を使わない。設定と再実行手順を残し、goalはcompleteにしない |
| 全体完了 | R01–R12と全必須項目の合格・根拠が揃い、保留/未接続/未検証がない。Managerが受入後にgoalとterminalを完了へ更新する |

## 新しいセッションからの再開

1. goal-implementスキルとmanager-loop、[brief](brief.md)、本計画と[status](status.json)を読む。[design](design.md)は担当範囲のリンク先だけを読む。archiveと全phases/reviewsの一括読込は行わない。
2. [S2最終独立報告](reviews/P5c-3-s2-f2.md)の要約で受入対象と限界を確認する。基点との差分が完了条件へ影響する場合だけ、Verifierへ適用範囲の確認を委譲する。
3. [S3接続案](phases/P5c-3-s3-plan.md)と[独立レビュー](reviews/P5c-3-s3-plan.md)を照合する。M1–M4は、正規前任capabilityの由来、初回no-claimと不明intent再CAS falseの区分、取消/期限/失権のnever-read終端、比例ケースと予約DBの対応である。案冒頭の「S2正式報告待ち」は旧時点の記述として扱う。
4. Managerが補正案を採用し、S3の受入ID・依存・path・有限資源/期限を固定する。54/60ケースと6–10時間の記載は提案値であり、新しい実行許可ではない。Implementerへ委譲し、候補固定/全writer停止後に独立Verifierへ渡す。
5. 既担当を操作できなければ、引き継ぎの停止記録を確認して新担当を起動する。旧root/DB/key/results/cache/proofや旧PIDを再利用・探索しない。[検証環境の再開](brief.md#検証環境の再開)を適用する。

## 障害と再開

- goal APIは利用者指示でpaused。APIにresume操作がなければ、明示継続後は本台帳で作業を管理する。新goal作成やcomplete/blockedへの置換で休止を解除しない。
- status.jsonのterminalはnull。休止と、代替手段のないblockedは別に判定する。
- 外部実接続と音声・D01の判断は未許可/未解決。依存しない作業を進め、代替のない停止は残項目と再開条件を報告する。

## フェーズ

P0調査→P1認証/編集→P2取り込み/編集/ゴミ箱→P3ワークスペース/整理→P4共有/公開/書き出し→P5外部連携/認証残件/退会→P6独立統合検証。現在はP5の未完を保持した休止状態。

## 管理文書の更新

- 項目状態の正本は本計画、status.jsonはその機械可読な写し。[criteria](criteria/requirements.md)には固定完了条件と根拠への参照を置き、項目状態を複製しない。
- 現在地・残条件・最新根拠は該当箇所を上書きする。解決した障害・古い予算・時系列・長いhash/資源一覧を入口へ追記しない。
- 報告はphases/reviewsの先頭に現在の結果・判断点・根拠を置く。実行ログや失敗履歴は担当報告へ保持し、Managerは判断に必要な詳細だけを読む。
- doneの変更には元の完了条件へ影響する差分/失敗の根拠が必要。追加観察・好み・不変の検証を差戻し理由にしない。
- 15分を停滞確認の出発点とする。新しい完了・障害・判断依頼又は停滞期限で確認し、定期報告のためだけに再試験しない。
- 利用者の必須要件・保留項目を進捗率や停止判定のために削らない。spec/spec-implementは呼び出さない。

## 項目台帳

全269の固定IDを以下に記載する。複数IDを一行にまとめた行では、列挙した各IDに同じ状態を適用する。完了条件の本文と根拠はリンク先を参照する。

## P5c-3-S2: 実取得と入力段階の安全終了

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-3-S2-A, P5c-3-S2-B, P5c-3-S2-C, P5c-3-S2-D, P5c-3-S2-E | done | [固定条件・検証根拠](criteria/P5c-3-S2.md)。不変更範囲の受入を維持 |

## P5c-3-S1: 再生成の保存型と候補読取

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-3-S1-A, P5c-3-S1-B, P5c-3-S1-C, P5c-3-S1-D | done | [固定条件・検証根拠](criteria/P5c-3-S1.md)。不変更範囲の受入を維持 |

## P5c-2: 原本バックアップ

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-2-B, P5c-2-C, P5c-2-D, P5c-2-F, P5c-2-G, P5c-2-H | done | [固定条件・検証根拠](criteria/P5c-2.md)。不変更範囲の受入を維持 |
| P5c-2-A | review | [固定条件](criteria/P5c-2.md#p5c-2-a)。Retarget後のhead到達差を同bundle UIで確認する。既バックアップの不変更根拠を維持する。 |
| P5c-2-E | in_progress | [固定条件](criteria/P5c-2.md#p5c-2-e)。relink UIが未完。旧バックアップの取消/実終了等の中核は既根拠の適用範囲を利用する。 |
| P5c-2-I | in_progress | [固定条件](criteria/P5c-2.md#p5c-2-i)。保存先利用不能の理由・確認付き再選択/新規作成・復元案内の主要UI。 |
| P5c-2-J | in_progress | [固定条件](criteria/P5c-2.md#p5c-2-j)。A/Iと同bundle等の統合根拠が未完。DDL/checks/build・運用文書は既根拠の適用範囲を利用する。 |

## P5c-1: Drive本人連携・保存先・独立解除

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-1-A | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-a)。認可callback・本人/browser/世代束縛の残UI・通常接続検証。局所受入済み範囲を再演しない。 |
| P5c-1-B | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-b)。保存先選択・確認・現在設定版の残UI検証。 |
| P5c-1-C | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-c)。同IDフォルダ作成と応答不明/再起動の残接続検証。 |
| P5c-1-D | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-d)。Googleログインから独立した解除・再連携と旧backup取消の残接続検証。 |
| P5c-1-E | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-e)。configured状態・Picker・current actor・dirty/ACK等の残UI。S5bの残3群を後続候補で確認する。 |
| P5c-1-F | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-f)。同bundle UI・actualfresh 0038・停止保全・実接続手順の残検証。 |

## P5b-3a1: 全ページPDFの製品接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-3a1-A, P5b-3a1-B, P5b-3a1-C, P5b-3a1-D, P5b-3a1-E, P5b-3a1-F, P5b-3a1-G, P5b-3a1-H | done | [固定条件・検証根拠](criteria/P5b-3a1.md)。不変更範囲の受入を維持 |

## P5b-2b1 V2: 文字PDFの寛容回復拒否

固定条件は対応する項目節と[採用設計](design.md)を参照する。

## P5b-3a0: 全ページPDF・音声の提供前gate

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-3a0-A, P5b-3a0-B, P5b-3a0-C, P5b-3a0-D, P5b-3a0-E | done | [固定条件・検証根拠](criteria/P5b-3a0.md)。不変更範囲の受入を維持 |

## P5b-2b2: 静止単画像の製品縦接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-2b2-A, P5b-2b2-B, P5b-2b2-C, P5b-2b2-D, P5b-2b2-E, P5b-2b2-F, P5b-2b2-G, P5b-2b2-H | done | [固定条件・検証根拠](criteria/P5b-2b2.md)。不変更範囲の受入を維持 |

## P5b-2b1: Office・限定文字PDFの製品縦接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-2b1-A, P5b-2b1-B, P5b-2b1-C, P5b-2b1-D, P5b-2b1-E, P5b-2b1-F, P5b-2b1-G, P5b-2b1-H, P5b-2b1-I, P5b-2b1-J | done | [固定条件・検証根拠](criteria/P5b-2b1.md)。不変更範囲の受入を維持 |

## P5b-2b0: Office・文字PDF・単画像の提供前技術gate

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-2b0-A, P5b-2b0-B, P5b-2b0-C, P5b-2b0-D, P5b-2b0-E, P5b-2b0-F | done | [固定条件・検証根拠](criteria/P5b-2b0.md)。不変更範囲の受入を維持 |

## P5b-2a: テキスト本文生成・再生成・月間枠

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-2a-A, P5b-2a-B, P5b-2a-C, P5b-2a-D, P5b-2a-E, P5b-2a-F, P5b-2a-G, P5b-2a-H | done | [固定条件・検証根拠](criteria/P5b-2a.md)。不変更範囲の受入を維持 |

## P5a: Google認証・ログイン方法管理

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5a-A, P5a-B, P5a-C, P5a-D, P5a-E, P5a-F, P5a-G, P5a-H | done | [固定条件・検証根拠](criteria/P5a.md)。不変更範囲の受入を維持 |

## P5b-1: OpenRouterの認可・モデル設定

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-1-A, P5b-1-B, P5b-1-C, P5b-1-D, P5b-1-E, P5b-1-F, P5b-1-G, P5b-1-H | done | [固定条件・検証根拠](criteria/P5b-1.md)。不変更範囲の受入を維持 |

## P4f-2: PDF一括ZIPの製品接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4f-2-A, P4f-2-B, P4f-2-C, P4f-2-D, P4f-2-E, P4f-2-F, P4f-2-G, P4f-2-H | done | [固定条件・検証根拠](criteria/P4f-2.md)。不変更範囲の受入を維持 |

## P4f-1: HTML/Markdown ZIPの製品縦接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4f-1-A, P4f-1-B, P4f-1-C, P4f-1-D, P4f-1-E, P4f-1-F, P4f-1-G, P4f-1-H | done | [固定条件・検証根拠](criteria/P4f-1.md)。不変更範囲の受入を維持 |

## P4f-0: ZIP writerの成立確認

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4f-0-A | done | [固定条件・検証根拠](criteria/P4f-0.md)。不変更範囲の受入を維持 |

## P4e: 一括公開範囲変更

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4e-A, P4e-B, P4e-C, P4e-D, P4e-E, P4e-F, P4e-G | done | [固定条件・検証根拠](criteria/P4e.md)。不変更範囲の受入を維持 |

## P4d-3: 公開・共有ページの匿名PDF

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4d-3-A, P4d-3-B, P4d-3-C, P4d-3-D, P4d-3-E, P4d-3-F, P4d-3-G | done | [固定条件・検証根拠](criteria/P4d-3.md)。不変更範囲の受入を維持 |

## P4d-2: 本人単件PDFの縦接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4d-2-A, P4d-2-B, P4d-2-C, P4d-2-D, P4d-2-E, P4d-2-F, P4d-2-G, P4d-2-H | done | [固定条件・検証根拠](criteria/P4d-2.md)。不変更範囲の受入を維持 |

## P4d-1: PDF素材供給と監督配備

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4d-1-A | done | [固定条件・検証根拠](criteria/P4d-1.md)。不変更範囲の受入を維持 |

## P4d-0: 単件PDFの成立確認

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4d-0-A | done | [固定条件・検証根拠](criteria/P4d-0.md)。不変更範囲の受入を維持 |

## 完了条件

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| R01 | in_progress | [固定条件](criteria/requirements.md#r01)。全体の根拠照合と統合受入が残る。 |
| R02 | in_progress | [固定条件](criteria/requirements.md#r02)。全体の根拠照合と統合受入が残る。 |
| R03 | in_progress | [固定条件](criteria/requirements.md#r03)。全体の根拠照合と統合受入が残る。 |
| R04 | in_progress | [固定条件](criteria/requirements.md#r04)。全体の根拠照合と統合受入が残る。 |
| R05 | in_progress | [固定条件](criteria/requirements.md#r05)。全体の根拠照合と統合受入が残る。 |
| R06 | in_progress | [固定条件](criteria/requirements.md#r06)。全体の根拠照合と統合受入が残る。 |
| R07 | in_progress | [固定条件](criteria/requirements.md#r07)。全体の根拠照合と統合受入が残る。 |
| R08 | in_progress | [固定条件](criteria/requirements.md#r08)。全体の根拠照合と統合受入が残る。 |
| R09 | in_progress | [固定条件](criteria/requirements.md#r09)。全体の根拠照合と統合受入が残る。 |
| R10 | in_progress | [固定条件](criteria/requirements.md#r10)。全体の根拠照合と統合受入が残る。 |
| R11 | in_progress | [固定条件](criteria/requirements.md#r11)。全体の根拠照合と統合受入が残る。 |
| R12 | pending | [固定条件](criteria/requirements.md#r12)。全機能の独立統合検証と残不具合の修正が未着手。 |

## 既存データの保全残件

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| D01 | blocked | [固定条件](criteria/preservation.md#d01)。未復元37objects/13,222Bの回復元又は利用者が明示した扱いが必要。保全対象へ操作しない。 |

## P1 の実装・検証項目

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P1-A, P1-B, P1-C, P1-D | done | [固定条件・検証根拠](criteria/P1.md)。不変更範囲の受入を維持 |
| P1-E | in_progress | [固定条件](criteria/P1.md#p1-e)。Drive設定導線への変更後のシェル・pending・モバイル・起動手順の残検証。既存の不変更根拠を維持する。 |

## P2 の分割

取り込み・メディア・編集の固定条件は以下のP2a–P2c、削除はP2dを参照する。

### P2a: ファイル取り込みと永続ジョブ

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2a-A, P2a-B, P2a-C, P2a-D, P2a-F | done | [固定条件・検証根拠](criteria/P2a.md)。不変更範囲の受入を維持 |
| P2a-E | in_progress | [固定条件](criteria/P2a.md#p2a-e)。Drive履歴併設後の履歴・ticker・再試行・取消の残検証。既存jobの不変更根拠を維持する。 |

### P2b: 参照・メディア・表示style

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2b-A, P2b-B, P2b-C, P2b-D | done | [固定条件・検証根拠](criteria/P2b.md)。不変更範囲の受入を維持 |

### P2c / P2d: 残編集とゴミ箱

固定条件は対応する項目節と[採用設計](design.md)を参照する。

### P2c-1: 共通保存・20版・復元

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2c-1-A, P2c-1-B, P2c-1-C, P2c-1-D, P2c-1-E, P2c-1-F | done | [固定条件・検証根拠](criteria/P2c-1.md)。不変更範囲の受入を維持 |

### P2c-2-G: Text-only方式の先行確認

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2c-2-G | done | [固定条件・検証根拠](criteria/P2c-2-G.md)。不変更範囲の受入を維持 |

### P2c-2: ビジュアル・HTML・モード遷移

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2c-2-A, P2c-2-B, P2c-2-C, P2c-2-D, P2c-2-E, P2c-2-F | done | [固定条件・検証根拠](criteria/P2c-2.md)。不変更範囲の受入を維持 |

### P2c-3-G: WYSIWYG方式の先行確認

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2c-3-G | done | [固定条件・検証根拠](criteria/P2c-3-G.md)。不変更範囲の受入を維持 |

### P2c-3: WYSIWYG・警告・変換前復元

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2c-3-A, P2c-3-B, P2c-3-C, P2c-3-D, P2c-3-E, P2c-3-F | done | [固定条件・検証根拠](criteria/P2c-3.md)。不変更範囲の受入を維持 |

## P2d の実装順

検証根拠: [独立観測準備](reviews/P2d-prep.md)。

### P2d-1: 個人ゴミ箱と現在認可

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2d-1-A, P2d-1-B, P2d-1-C, P2d-1-D | done | [固定条件・検証根拠](criteria/P2d-1.md)。不変更範囲の受入を維持 |

### P2d-2: 単一完全削除と期限回収

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2d-2-A, P2d-2-B, P2d-2-C, P2d-2-D, P2d-2-E, P2d-2-FD | done | [固定条件・検証根拠](criteria/P2d-2.md)。不変更範囲の受入を維持 |

### P2d-3: ゴミ箱を空にする

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2d-3-A, P2d-3-B, P2d-3-C, P2d-3-D, P2d-3-E, P2d-3-F | done | [固定条件・検証根拠](criteria/P2d-3.md)。不変更範囲の受入を維持 |

## P3a: ワークスペース作成とscope基盤

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3a-A, P3a-B, P3a-C, P3a-D, P3a-E, P3a-F | done | [固定条件・検証根拠](criteria/P3a.md)。不変更範囲の受入を維持 |

## P3b-1: 招待・参加・メンバー・一般設定

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3b-1-A, P3b-1-B, P3b-1-C, P3b-1-D, P3b-1-E, P3b-1-F | done | [固定条件・検証根拠](criteria/P3b-1.md)。不変更範囲の受入を維持 |

## P3b-2: ワークスペースのアイコン

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3b-2-A, P3b-2-B, P3b-2-C, P3b-2-D | done | [固定条件・検証根拠](criteria/P3b-2.md)。不変更範囲の受入を維持 |

## P3c: 一覧・全文検索・タグ読取・カレンダー

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3c-A, P3c-B, P3c-C, P3c-D, P3c-E, P3c-F, P3c-G | done | [固定条件・検証根拠](criteria/P3c.md)。不変更範囲の受入を維持 |

## P3d-1: タグ付与・管理

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3d-1-A, P3d-1-B, P3d-1-C, P3d-1-D, P3d-1-E, P3d-1-F | done | [固定条件・検証根拠](criteria/P3d-1.md)。不変更範囲の受入を維持 |

## P3d-2: 単一ノートの所属先移動

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3d-2-A, P3d-2-B, P3d-2-C, P3d-2-D, P3d-2-E, P3d-2-F, P3d-2-G | done | [固定条件・検証根拠](criteria/P3d-2.md)。不変更範囲の受入を維持 |

## P3e: 選択と一括整理

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3e-A, P3e-B, P3e-C, P3e-D, P3e-E, P3e-F, P3e-G, P3e-H | done | [固定条件・検証根拠](criteria/P3e.md)。不変更範囲の受入を維持 |

## P3f: ワークスペース削除

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3f-A, P3f-B, P3f-C, P3f-D, P3f-E, P3f-F, P3f-G, P3f-H | done | [固定条件・検証根拠](criteria/P3f.md)。不変更範囲の受入を維持 |

## P4a: 限定共有・表示名

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4a-A, P4a-B, P4a-C, P4a-D, P4a-E, P4a-F, P4a-G, P4a-H | done | [固定条件・検証根拠](criteria/P4a.md)。不変更範囲の受入を維持 |

## P4b: HTML/Markdown単件書き出し

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4b-A, P4b-B, P4b-C, P4b-D, P4b-E, P4b-F, P4b-G | done | [固定条件・検証根拠](criteria/P4b.md)。不変更範囲の受入を維持 |

## P4c: 公開・発見とプロフィール

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4c-A, P4c-B, P4c-C, P4c-D, P4c-E, P4c-F, P4c-G, P4c-H, P4c-I, P4c-J, P4c-K | done | [固定条件・検証根拠](criteria/P4c.md)。不変更範囲の受入を維持 |

## 判断記録

過去の判断と整理前の全文は[保全スナップショット](archive/20261002-before-cleanup/README.md)へ保持する。通常の再開では読まない。現在の判断は本計画・brief・designの該当箇所を上書きする。
