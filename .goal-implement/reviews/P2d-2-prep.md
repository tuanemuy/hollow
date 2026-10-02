# P2d-2 独立検証準備

2026-09-10 12:10 JST（UTC+09:00）。文書だけの準備で、以下はすべて未実行。製品候補の合否・固定値・環境状態を確認したものではない。

## 正本と範囲

[ED-10](../../spec/scenario/editing.md)、[JB-01/02](../../spec/scenario/jobs.md)、[採用design P2d](../design.md#p2d-ゴミ箱と完全削除)、[P2d-2契約全文](../phases/P2d-2-contract.md)、[既存準備 PD-T4/T5/T6/T9](P2d-prep.md)を照合した。P-14/P-15は画面名・操作の補助資料で、未採用の500件chunkや「50件以下なら即完了」を受入条件にしない。

今回の準備は単一完全削除・期限回収と、それによって既存取り込み履歴に生じる影響に限定する。共通claim、write ownership、process-owner lock、最小JobResultSnapshotは採用済みriskの検証であり、新方式gateではない。原要件から必要な結果と、その実現のため採用された競合防御を分けて記録する。

## 正式候補受領後の短い実行順

1. 正式な変更範囲・固定候補・環境所有を受領する。旧データを保全し、本人Aの新noteと別人B、隔離DBのclock/故障adapterを用意する。現在変更中のsourceや資材を先に検証しない。
2. 単一完全削除の確認取消→受付→完了を実UIで通し、fence/認可/物理削除/容量の各時点を分ける。続けて受付前失敗と受付後応答喪失を対にする。
3. 隔離DBと小さい実objectで同key容量・共有companion・遅いwriter/cleanupの対を実行する。正常な終了経路を先に確認してから保留・失敗を注入する。
4. partial purgeした既存import batchの本人履歴と90日、期限/restore競合を確認する。最後に変更した移行・共有条件だけ再確認し、独立/借用/未確認を正式報告へ分ける。

## 最小fixture

- Aのnote Nにcurrent媒体、履歴だけの媒体、現在は未参照の同note由来媒体、原本、bound uploadを持たせる。小さい既存固定媒体を再利用し、20版の全編集操作や全codecを再試験しない。
- 同bundleの2 note N/Mとcompanion、同名だが別keyの兄弟原本。Mのactive/trashed、参照off/failedを隔離fixtureで切り替える。受理予約と利用attemptが残る対も同じ小集合で作る。
- import batchに「purge対象の終端子」「生存する終端子」「生存する実行中子」を各1件置く。削除後はsnapshot子と生存子が混在する。empty削除の親子jobを新設するfixtureではない。
- 1 objectのremove失敗、put終了前/次のput前/publish前の保留、古い完了token、旧owner生存不明、期限・90日境界を制御可能にする。production大量生成・OS時刻変更・他process操作は使わない。

## 最小観測matrix

PD2番号は準備用の観測IDで、正式plan IDやテスト成功件数ではない。各対は正式検証時に独立assertへ分ける。

| 観測 / 原条件と採用risk | 正常・異常対と合否の最低証拠 | 実行面 |
| --- | --- | --- |
| PD2-1 / ED-10 確認・不可逆性、採用fence | ゴミ箱の「完全に削除」を取消すと不変。本人が確認実行すると同intentへ一度だけ移り、復元/旧undo/新保存/新upload/原本・current/history/bound-draft読取は不可。別人・匿名・古いtrash世代は開始不可。DBには対象全pin/原本/媒体を漏らさない回収根拠が残り、本文版は増えない。 | 実UIの確認・取消・reload・keyboardと、実DB/HTTPの認可。認可拒否とbytes消去完了を別assert。 |
| PD2-2 / ED-10 全関連削除、採用同key容量所有 | current/全保持版/未参照由来asset・原本・bound source/safeを回収し、同keyをupload/assetやreference-object/assetが指す対でも二重解放しない。remove失敗中は未回収bytes/予約を保持し、retry成功後だけ一度解放。sourceだけ消えてsafeが残る間は予約を解放しない。無関係draft/同名別key/兄弟原本は不変。 | 隔離実DB＋小さい実storage正常対、remove失敗adapter。fence直後/実削除前/後のobject・所有行・quotaを対応付ける。DB行消去だけを物理成功に数えない。 |
| PD2-3 / ED-10 共有companion保持、採用bundle fence | NだけpurgeしてMがactive/trashed/off/failedならcompanionを保持。最後の関係がなくてもunsealed/受理予約あり/利用attempt未終了は回収完了不可。sealed・予約0・利用終了後に回収。deleting後の新関連付け/遅い受理を拒否し、既存orphan cleanupとの競合でも同claimが有効。 | 隔離DBの関係・世代と実object存在/hash。共有物理objectの残存を消去済みと案内しない。現個人モデルにない別note pinを合成した場合は整合性異常の拒否対と明記し、新共有機能を要求しない。 |
| PD2-4 / ED-10 完全削除、採用write ownership/共通claim | 生存attempt保留→purge→新attempt拒否→旧attempt終了→再確認回収。最初の不存在、job取消、lease切れ、最初のput終了のいずれもwriter全体の終了と誤認しない。第二put/安全化後再put/publish/旧upsert/finallyがfence後にobject・written状態・容量を復活させない。通常GC/import cleanup/reference finally・runner/purgeの競合を代表対で通し、全入口の接続はコードで照合する。 | 制御adapterの開始/終了/claim/token/容量の時系列と、実FileObjectStorageの小正常・競合対。DB UoW内でstream終了を待たないこともコード確認。旧結果commit拒否だけではこの対を合格にしない。 |
| PD2-5 / 同上、採用process-owner lock | 同rootの既知ownerが生存中なら別ownerが書込/回収を開始できず、同processの別DIは共通所有を使う。正常drain後と確認済み旧owner終了後の回復は成立する。PID再利用/生存不明は期限だけで奪取・完了せず、理由と再開条件を示す。lock取得成功だけで永続旧attempt/stagingの回収を省略しない。 | 正式候補の契約・小さい自己隔離root/既知自己ownerによる根拠。生存不明はport/adapterの拒否対でもよい。他process停止・強制lock除去や同storage多process運用保証を追加しない。 |
| PD2-6 / JB-01/02、採用JobResultSnapshot | batchの1 noteだけpurge後、本人の履歴に同ID・元日時・結果のsnapshot子と生存子が各1回ずつ現れる。子総数/終端内訳/実行中件数はこの和と一致し、生存jobは継続する。削除済み子はnote本文リンク・変換retry/取り込み直し不可、生存failed子は従来どおりretry可能。cancelledにfailure理由を付けず、別人/匿名にはsnapshotも非表示。 | 本体UIで一つの混在batchと再訪、実DB/DTOで重複・件数・本人認可。snapshot移送と実行行除去の原子性/FK、本文・CSS・binary・raw参照台帳を複製しないことを確認。purge cleanupの再開と変換の新job retryを分ける。 |
| PD2-7 / ED-10 30日、JB-01 90日、採用sweep | purgeAfter直前restore可、一致/以後はrestore不可で期限purgeへ。restoreとpurgeの競合は片方だけ成立。通知なしboot/周期sweepで進み、失敗先頭が後続を止めない。snapshotは元の履歴日時から90日を過ぎると対象となり、purge時に期限を延長しない。snapshot/親batchの履歴掃除が未回収intent・writer・容量所有を消さない。 | clock＋隔離DB/worker。30日実待機・OS時計変更不要。90日の直前/一致/超過を区別し、原文「過ぎたもの」の境界を正本とする。固定100件/並行2など未確定運用値は要求しない。 |
| PD2-8 / ED-10 不可逆説明、JB-01再訪、採用受付後不明状態 | 受付前の通信失敗なら操作未成立と回復を表示。serverがfenceをcommitした後に応答だけ失った対では、trashへ復元したかのような表示・「元に戻す」・削除完了を出さず、同intentの状態を引き直す。remove失敗時は理由/未完了を表示し、再開・再訪・実完了で整合する。 | 自己tabだけの応答制御＋本体DB受付確認を対にする。状態取得も失敗した間は「未確認/再取得可能」を区別し、成功を推定しない。390px/keyboardはこの操作線の小正常対だけ。 |

## 観点の漏れと判定方針

| 観点 | 対応 |
| --- | --- |
| 入力・認証・権限 | PD2-1/6。note/operation/intentの対応と本人認可。clientの任意key/HTML内URLを回収根拠にしない。新規文字入力上限は追加しない。 |
| 0件・境界・重複 | PD2-1/2/6/7。不存在、同key、同intent、混在子集合、30日/90日。emptyの50/51/500超はP2d-3へ。 |
| 中断・競合・削除波及 | PD2-2〜5/7/8。受付前後、writer全期間、旧token、共有物、restore競合。 |
| UI・特殊入力 | PD2-6/8。既存小fixtureの日本語/emoji表示名、空/進捗/失敗/再訪。本文編集や全Unicode/clipboardは無変更なら再検査しない。 |

採用契約内の明確な矛盾や、新しい利用者判断が必要な条件は今回見つからなかった。次の三点は矛盾ではなく、独立結果を取り違えないための区分である。

- process-owner lockの拒否は安全性の成功対であり、生存不明状態から自動回復する可用性の成功ではない。正常drain/確認済み旧owner終了の回復対を別に必要とする。
- 生存兄弟が保持するcompanionと、対象noteだけの未回収objectを区別する。前者の保持は正当であり、後者を残した「完全削除完了」は成功にしない。
- partial import batchのsnapshot子＋生存子を正しく表示することは、既存JB-01履歴の保全である。P2d-3のempty専用親子処理を先行完成させる要求ではない。

新たな必須条件の提案はない。正式候補で追加の懸念が出た場合は、ED-10/JB-01/02または採用riskとの対応を示し、実不具合と未測定/追加観察を分けてManagerへ判断を返す。

## 停止と後続範囲

P2d-3のempty親子・失敗子再試行集約、P3の実WS、P4の公開/共有、P5のDrive/退会は未着手範囲のまま。Drive上のbackupが残る原要件は保持し、P2d-2に外部backup削除権限を追加しない。通常20版prune・全codec・SSRF・C3編集を変更なしに全量再証明しない。

markdown-styleとspec-manual-testを用い、正常/異常対・観測先・対象外理由を整理した。今回の限定指示を優先し、本書だけを作成した。製品source、DB/storage、browser/process、tests/build/hash/git、固定tempには無操作。fixture/helperも未作成で、実装・試験作成へ参加していない。全操作を停止し、正式候補の委譲を待つ。
