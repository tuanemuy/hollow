# P2d 独立受入準備

2026-09-10 09:48 JST（Asia/Tokyo）。文書のみの準備で、製品の合格判定ではない。全ケース未実行。Implementerが環境を所有し、C3-V1を修正中。本体source、tests/build/hash、DB/storage、browser、process、既存C3検証には触れていない。

## 正本と対象

[ED-09/10](../../spec/scenario/editing.md)、[JB-01〜03](../../spec/scenario/jobs.md)、[採用design P2d](../design.md)、[P2d契約全文](../phases/P2d-contract.md)を照合した。ページ案のP-14/P-15は操作名・状態の補助に使い、未採用の方式を必須条件にしない。planのP2d個別IDは未確定のため、下記PD-T番号は観測群の仮IDである。

markdown-styleとspec-manual-testのシナリオ/異常観点整理を使い、今回の限定指示を優先して本書だけを作成した。usecases/testcasesディレクトリは存在しないため、架空のエラー契約を補わない。

受入の軸は個人ゴミ箱の縦スライス。現在認可、20版・pin、共有companion、実削除後quota、遅いwrite、本人親子jobは既存採用riskの接続であり、新機能ではない。50件超は「ゴミ箱を空にする」の非同期境界、500はOR-09選択上限であってゴミ箱全体の上限ではない。

## 候補受領後の準備と実行順

1. 正式候補の変更範囲と最終固定値を受領し、当該候補の開始照合・online backupを行う。C3修正を含む先行受入を基準にし、準備時点のhashを流用しない。
2. 新しい自己account A/Bと自己noteだけで実UIを行う。旧データを削除試験に流用しない。期限・失敗storage・遅いwrite・大量件数は別DB/型付きadapterで再現し、production破壊的故障注入を避ける。
3. PD-T1〜T3の単一note lifecycle/認可/保存保護、T4〜T6の実回収/共有/遅いI/O、T7〜T9の親子job/期限を順に確認する。最後にT10の移行保全・UI・規約を照合する。
4. 合否を元IDごとに集約する。UI成功、実DB/実storage成功、adapter注入、借用する旧根拠、未確認を分ける。原文上の不具合は固定のまま差戻し、方式の好みや後続機能は追加観察へ置く。

### 最小データ

- A所有の通常note N1、B所有N2。N1に現在版を含む20版、現在だけ/履歴だけの別media、保持されたWYS origin、元ファイル、参照CSS snapshotを持たせる。小さい既存固定PNG/動画を使い、全codecを再証明しない。
- 同一bundleの別note N3/N4と共有companion。active/trashed、off/failedの保持関係を切り替えられる隔離fixture。同名/同hashだが別storageKeyの原本も1対だけ用意し、所有を名前で推定しないことを観測する。
- 隔離DBで0/1/50/51/501対象、処理中/待機中の兄弟job、削除失敗object、遅いwrite attemptを少数用意する。501件は小noteで足り、大容量mediaを501個生成しない。
- clock portでpurgeAfter直前/一致/直後と90日境界を固定する。OS時刻を変更せず、経過待ちを試験方法にしない。

## 観測matrix

各行を複数の独立assertへ分けて実行する。正常・拒否・障害を一つの成功件数へまとめない。

| 仮ID / 原条件・risk | 優先する正常対と手順 | 拒否・障害・境界と合否基準 | 必要な最小証拠 |
| --- | --- | --- | --- |
| PD-T1 / ED-09/10、lifecycle | Aの一覧/詳細から削除確認を取消→不変。実行→通常一覧から消える→同toast undoで戻る。再削除→ゴミ箱で削除日時降順・残日数・復元→同note本文/title/style/関係が戻る | 他人/未認証は操作非表示か到達拒否、直接commandも拒否。二重送信は重複遷移なし。削除→復元→再削除後、最初のtrashOperationIdのundoは新世代を戻さない。通信失敗のoptimistic rollbackと再試行 | 実UIで確認/取消/undo/reload・B拒否。実DBでnote.version進行、html/title/display/updatedAt・20版・全pin/原本不変。trash専用認可とactive必須の区別をコードで追う |
| PD-T2 / ED-09/10、current/history/draft/原本認可 | active時にdetail/edit/preview/history/WYS origin、原本、current asset、履歴pin assetが正当scopeで成功。trash後すべて通常アクセス不可。restore後は元の正当なscopeだけ成功 | 本人でもtrashを履歴pinや旧draft URLで読めない。GET/HEAD/Range0–1/過大Rangeの対で、拒否が416やbytes提供より先。別note/別版/匿名はrestore後も拒否。unbound draftは無関係のnote削除で失効させない | 少数の実HTTPとhandler/実DBで全入口を対応付ける。pinの存在と読取権限を別assert。新旧draft/current/historyの取り違えがないコード根拠 |
| PD-T3 / ED-08/09、JB-03、遅い保存 | Aの二tabで一方に未保存本文/mode/origin hintを保持し、他方から削除。autosave拒否でも最新HTML・title・mode・hint/downloadを保つ。restore後に明示reload/再準備して保存 | 削除確認後に新jobが開始したら、処理取消了承なしで黙って削除しない。queued/running自動取消、trash→restore後も旧lease/世代結果は本文/版/台帳へ不採用。兄弟noteのjobは継続。bind済upload確定は拒否してcleanup、無関係draftは継続 | 実UIで一つのdirty失効/回収対、両modeの共通保存は先行C3/V5根拠を狭く適用。実DB/注入workerで成功・失敗の遅い応答、display初回終端・user値保持。C3の既存全正常を繰り返さない |
| PD-T4 / ED-10、20版・実削除quota | ゴミ箱から完全削除の確認取消→保管継続。実行→不可逆purging fence→currentと全保持版pin解除→本文/全revision/head/原本/mediaの回収完了。通常未参照7日GCを追加待機しない | storage.remove失敗は復元可能へ戻さず理由/処理中を表示し、bytes/予約を保持。不存在だけを冪等成功。再試行後実削除確認と同intent/leaseの確定で容量を一度だけ解放。90日job掃除が未回収intent/容量を消さない | 実DB＋小さな本物objectのstorage、失敗注入の対。fence直後・実削除前・削除後のDB状態/object/集計を採取。任意HTML URL/client keyを回収対象にしない型付きprovenanceをコード確認 |
| PD-T5 / ED-10、共有原本/companion | N3/N4のbundleで一方だけpurge→残るactive/trashed/off/failed関係とcompanion bytesを保持。最後の関連note purge後、sealed/受理予約0/利用収束なら回収 | 同batch兄弟upload中/未受理本文ありを「関連note0」だけで回収しない。deleting bundleへ新しい受理/関連付け不可。二回収workerの同object claim競合で重複解放なし。別storageKeyの同名/同hash原本を巻き込まない | 関係/pin/quotaの実DBと小objectのhash・存在。通常note単位原本と本当に共有されるobjectを区別。将来の共有object機能を新規実装せず、現companionの実接続を必須にする |
| PD-T6 / ED-10、有限I/Oと回収intent | 旧attemptのwriteを保留→purge受付→新規write admission拒否→旧writeを終える→再削除/intent完了で漏れなし。途中crash/lease奪取後のboot/sweepも同じ保存状態へ収束 | 先にremoveで不存在を確認しても、遅いwrite終了前にintent/予約を消さない。旧finish拒否だけで合格にしない。期限内の収束/失効を使い、無期限待ち・固定sleepを保証としない。認可失効後も確定済みintent cleanupは継続、未開始の破壊遷移は現在権限必要 | 実DBと制御可能なstorage adapterの時系列、必要な1正常対は本物storage。IO開始/終了、claim/lease、object存在、予約解放時刻を分離。全process障害実験やOS操作は不要 |
| PD-T7 / ED-10、JB-01、50/51/500超 | 空状態0、単一1、50件、51件を区別。51以上は永続親1＋対象ごと子で受付/処理履歴。501件でも全対象が登録・処理され、bounded列挙で打切りなし | 50以下の残物理回収を成功文言にしない。確認後追加されたtrashは対象外。確認後restore/再削除された子を旧世代で消さない。対象全HTML/objectを一UoWへロードしない。500chunkを要件へ固定しない | 実DBで50/51/501件の対象集合・親子数・世代を比較。実UIは51以上の受付/一覧残存/親内訳/再訪の一対、50以下の「まだ回収中」表示を別対にする |
| PD-T8 / JB-01〜03、本人結果履歴 | 親子の待機/実行/成功/失敗を表示し、一部失敗でも他子継続。本人のticker件数/終端toast/子内訳を確認。failed子だけ新job retryし親がrunningへ戻り再取消可能 | 通常取消は未開始cancelled、fence済子のcleanup完了待ち、成功分は戻さない。cancelledにfailure理由を付けない。完了/cancelledはretryでなく元操作へ。多重retry・別人job閲覧/取消を拒否。対象削除済みの変換retry拒否とpurgeの残cleanup再開を分ける | 実UIで親/子/部分成功/取消/再試行/別人拒否。実DBで旧job不変と新attempt、件数は永続子状態由来。削除後snapshotに最小title/結果だけ残り、本文/binary/元noteリンクなし |
| PD-T9 / ED-10/JB-01、clock/lease | purgeAfter直前restore可、一致/直後不可。「完全削除待ち」表示とsessionなし期限掃引。保持履歴90日超をpruneし説明する | restoreと期限purge同時競合は片方だけ成立。起動sweep/通知欠落/旧lease finish/失敗先頭で後続飢餓なし。履歴pruneと未回収intentを独立させる。採用前の100対象/並行2を固定受入値にしない | fake clock＋実DBの境界と二claim、cursor/nextAttemptAtの正常・失敗対。実UIは日数/期限待ち表示を確認するだけで30日待機しない |
| PD-T10 / ED-09/10/JB、規約・移行 | clone migrationで旧note全active、旧本文/title/style/version/日時/20版/pin/原本完全一致。単一削除〜復元〜完全削除をdesktop/390px/keyboardで完結 | parent所有のoptimistic membershipとpending/invalidate、行unmount後もerrorを失わない。確認取消/通信エラーから回復。typed lifecycle/UoW/内向き依存/clock port、storage I/OはUoW外。旧データの保全は新自己試験差分と別計上 | 独立clone差分/開始終了hash、変更に応じたfocused tests、最終checks/build借用範囲、自己画像確認、環境handoff。実装者全suiteを理由なく全量再実行しない |

## 異常観点の対応

| 観点 | 対応 |
| --- | --- |
| 入力/権限境界 | PD-T1/T2/T7/T8。ID/operation/target世代はtransportと現在認可を別確認。一般本文入力フォームの新上限は追加しない |
| 0件・最大/期限境界 | PD-T7/T9。0/1/50/51/501、purgeAfter直前/一致/直後、90日超 |
| 重複・競合・不存在 | PD-T1/T4/T5/T6/T7/T8/T9。古いundo、二重retry、lease、restore競合、冪等remove |
| 削除の波及と操作中断 | PD-T2/T3/T5/T6/T8。認可/履歴/原本/兄弟/遅いwrite、取消と不可逆fence |
| UI失敗回復・空状態 | PD-T1/T3/T7/T8/T10。rollback、最新退避、一覧再訪、ticker0、二重送信、keyboard/mobile |
| 特殊文字 | PD-T1/T8/T10の自己titleに日本語/emojiを使い、一覧と削除後snapshotの表示を確認。全HTML/Unicode/codecの新試験には広げない |

## 文書間の差と判断

現採用designと原シナリオの間に、個人P2d開始を阻む明確な矛盾は見つけていない。追加の利用者判断は要求しない。

- P2d-contract冒頭/末尾には未採用・採用待ちの古い表現が残るが、designとplanの2026-09-10採用記録を優先する。本書では期限閉鎖、purgeへの追加7日不要、50以下も回収中を採用済みとして扱う。
- ページ案P-14の「500件ごとのjob」「50以下で完了」は、元ED-10が要求する方式そのものではない。採用designに従い、501件全対象・永続親子・bounded列挙・実削除完了の正確な表示を試験し、固定500chunkや応答内完了を合否に加えない。
- trash/restoreはversionを進めるが本文版を増やさない。保持WYS originの記録versionと現在headを同一視すると、正当な復元後編集を過剰拒否する。この正常対をT1/T3に残す。C1 actor/current権限検査は省略しない。

## 後続へ残す境界

- P3/P4: 実WS owner/editor/viewer、公開/限定URL停止と復元、タグ/共有リンク、WS削除/退会。今回は型付き現在policyとlifecycle接続を確認し、架空の共有行や公開機能を実装済みとしない。
- P5: Drive backupが残ること、実連携解除/再生成・外部jobの取消。P2dの回収portが外部backup削除権限を持たないことまでを確認し、実Drive接続や削除は行わない。
- OR-09の選択UI/一括移動・タグ・公開変更、PDF/ZIP固有保持期限と組立取消は後続。共通親子portに必要なstate/本人認可をP2dで確認するが、全job種類の完成とは扱わない。
- C3の既存合格は保持し、V1修正の独立再確認は別委譲へ返す。P2dではlifecycle変更で失効した編集の退避・復元だけを再open候補とする。

## 終了

正常/異常/境界の対応、UI必須と実DB/adapterで足りる範囲、後続対象を文書レビューした。未対応欄なし。ただし正式候補を見てからcommand/DTO/実装採用値を対応付ける準備matrixであり、試験件数や合格数はまだ存在しない。

製品・固定temp・DB・browser・依存・tests/build/hash・processに無操作。新fixture/helperも作成していない。本書のみ書き込み、全操作を停止してC3修正候補の委譲を待つ。
