# P2d-3 独立検証準備

2026-09-10T14:09:52+09:00。文書だけの準備。P2d-3-A〜Fは全て未検証であり、製品の合格根拠ではない。現時点でManagerの追加判断が必要な明確な矛盾はない。

[planのP2d-3-A〜F](../plan.md)、[採用designの集合と親子回収](../design.md)、[接続案と補足全文](../phases/P2d-3-contract.md)、[ED-10](../../spec/scenario/editing.md)、[JB-01〜03](../../spec/scenario/jobs.md)を照合した。goal-implement/manager-loopの出所制約に従い、以下は原要件と既に採用されたriskの観測である。新しい受入条件の提案はない。

## 正本の読み分け

- 接続案初稿の「自動再claimごとに新しい子job」は不採用。採用designと後半補足に従い、明示retryだけ新job、自動回復は最新job内の内部attemptとする。
- 親generationは未開始admission・操作所有へ適用する。無関係なAのretryで、既fenceのBの完了を捨てる条件ではない。
- 個人scopeだけが今回の対象。empty全件に500件上限はない。50/51はED-10の非同期境界であり、50以下の物理回収前成功を許す条件でもない。
- 90日の利用者履歴と不可逆回収intent/容量/writer provenanceは別。期限切れ履歴を保持するための本文複製も、履歴pruneを理由とする未回収の放棄も正解にしない。

## 最小観測群

全群の状態は「未実行」。固定候補の正式委譲後、実装報告の根拠を借用できる枝と独立実行する枝を選別する。表のDBは隔離DB・注入clock/adapterを指し、本体へ大量noteや故障状態を投入する計画ではない。

| 群・対象ID | 最小入力・操作対 | 合格に必要な観測 | 最低限の手段 |
| --- | --- | --- | --- |
| T1 集合・A/F | 0/1/50/51/501。501は同時刻のnoteも含める。確認前後で新trash、既存targetのrestore→再trashを加える | 0は破壊jobなし。1以上は固定totalと一意targetが一致し、51/501は非同期親から全件へ到達。後発trash・別世代を対象に混ぜず、取消された旧targetをfailureと数えない。snapshot本文/object複製なし、全体500上限なし | DBで件数/全cursor列挙/世代比較。実UIは空と小件数確認＋51以上の永続親/再訪の代表対。501と追加metadata規模の測定はFへ |
| T2 確認受付・A/E | 同snapshot二重確認、受付前通信failureとcommit後response喪失、確認取消、別人snapshot。固定後に単一purgeが先に成功した対と、成功証明のない不存在の対 | 同snapshotは同親へ合流、取消はnote/purge不変。本人/現在scopeをserverで照合。既存成功は同note・同trash世代の確定結果でのみ再利用し、不存在/page不在/応答の有無だけで成功にしない | DBで冪等・本人・不存在分岐。実UIで確認件数/不可逆説明、取消、受付不明→再訪の回復 |
| T3 開始と取消・B/E | 未開始のままcancel→子開始、子fence→cancelの両順。未作成targetと既作成queued子を含む。一部storage失敗、別子正常、古いlease/操作世代を解放 | cancel後は新fence0、未開始はcancelledでfailureなし。既fenceは戻さず回収継続。待機時に「取消受付済み・開始済み回収中」を区別し、既削除分を復元済みとしない。一部失敗が他子を止めない。子開始時の現在本人policy/同世代、旧lease拒否を保持 | DBの順序制御で十分な競合枝。実UIでcancel確認・取消待ち・完了/失敗/取消内訳の代表対 |
| T4 明示retry・C/D | 失敗Aと開始済みB。A単独retryとまとめretryの競合、A新job作成後にB成功、旧A応答を遅れて解放。成功/取消子retry拒否 | 明示retryは同target/設定の新ID、同親target多重要求は一つ。分母は固定total、最新attemptだけを集計。親は再実行中へ戻り再cancel可能。B成功を親generation差で捨てず、旧Aが新Aの状態を上書きしない。過去A終端結果を保持 | DB＋純粋集計/所有境界。実UIで失敗子のみretry・親再実行中・古い結果と現在結果の区別 |
| T5 P/Q共有・B/C/D | PとQが同note世代のintentを共有し、Pだけ明示retry。単一要求・期限purgeとの合流も小対で確認。Q未開始/取消済みの対を置く | physical intent/claimは一つ。Pだけに明示新job、Qへ利用者操作を捏造しない。bind済み最新targetは同intentの実状態へ収束し、未開始/取消済みtargetへ結果を誤配信しない。異なる親は別の論理操作、同親の子や単独欄で重複計上しない | DBでP/Q関係・claim・latest結果、通知欠落後の有限reconcile/read。UIは親1＋子内訳と単独欄/tickerの重複なし |
| T6 自動回復・C/F | 失敗が継続するclock/adapter反復→後で回復。queued writer待ちとlease更新、明示retry一回を正常対にする。親cancel後の既fenceも含む | 自動再claimでjob/隠し履歴行が反復増加せず、最新job内の回数/時刻/安全な理由/stateが更新される。writer待ち・lease更新を故障attemptに数えない。明示retryだけ新job、旧明示結果不変。新しい試行回数上限による回収放棄なし | 隔離DBで固定target/最新job/intentと関連履歴行数の前後差。全259,200回の待機や本体長期試験は不要。コードと代表反復の保証範囲を分ける |
| T7 90日・D | 期限直前/一致/超過、古い親＋期限内新retry、共有P/Qの片方prune、最後の表示参照prune後も未回収。回復後終端を正常対にする | 元createdAtで旧結果が期限判定され、新retryが親や全過去chainを延命しない。期限内retryは必要最小headerで関連を表示。未回収intent/容量/provenanceは残り、最後の履歴参照消失後も回収が進む。成功結果確定後に履歴のためだけにobject/容量を残さない | 注入clockと隔離DB。本人/別人のread、prune前後の関係・容量・実小object回収。UIは古い親の最小関連表示を必要に応じ代表確認 |
| T8 有限read/UI・D/E | 両routeで親summary/子cursor、空・多頁・未完了が新完了多数より古い状態。旧read success/failure/ABA、受付ID不明、通知欠落。親/単独purgeと既存conversion/referenceを混在 | V1のscope分離/有限page/summary/receiptを後退させない。page長を全体件数にしない。未完了を取得・再訪でき、現在の要求世代だけが採用される。確定前を成功/未受付と推測しない。tickerは実行中0で消え、重複toastなし。conversion/reference snapshotの本人/件数は不変 | 実UIが必須。390px・keyboard、本人tabだけの通信保留/喪失を使用。表示ID50/未確認receipt10の既存境界は変更時だけ純粋/transport対を再確認 |
| T9 接続・保全・F | 候補識別、追加schemaを旧backupのcloneへ適用、集合501＋追加metadata規模、代表子開始/取消/回収/再訪、自己対象の終了 | 旧列・版/pin・object保全。型/内向き依存/clock/UoWと共通begin/claimの接続、有限後続page/I/Oを確認。集合SQL自体の件数比例コストを測定しO(1)や全端末SLOと称さない。規定checks/tests/buildの固定候補への適用が追える | 正式候補のmanifestと検証報告、clone、独立focused test、本体代表UI、開始終了保全。測定値を固定閾値へ勝手に変えない |

## 実行順と必要fixture

1. 正式候補の委譲時に対象ID・製品差分/固定値・環境所有・既存証拠の適用を確認する。今回の準備でhashや環境の現状確認はしない。
2. T1/T2を隔離DBで先に確認する。2本人、同時刻を指定できるclock、0/1/50/51/501のmetadata集合と、別世代の小さい対があればよい。501個の本物媒体は不要。
3. T3〜T6を小さい2〜3targetとP/Qで確認する。1つの実小object、停止/失敗/遅延を制御できるadapter、同intentの手動/自動回復を使い、集合・子job・physical claim・回収結果を別々に記録する。回収件数を子件数へ流用しない。
4. T7のclock/履歴・未回収保持を確認し、T8の実UIへ進む。実UIは新しい自己noteだけに限定し、確認取消/小正常/部分失敗→retry/取消待ち/再訪/応答不明を組み合わせる。元V1の大きい結果fixtureをそのまま破壊対象へ使わない。
5. T9の最終固定/旧保全/自己資材識別・自身画像確認・全自己操作停止を揃えてA〜Fの合否を報告する。借用成功、独立DB、本体実操作、制御用故障/合成metadataを区別する。

## 差戻し判断と境界

差戻しに直結するのは、上記原ID/採用riskに対応する誤破壊・対象欠落・回収済みの虚偽表示・本人再訪不能・別人結果漏れ・必要な回収関係の早期消去・無期限自動履歴増加等である。単にsummaryの更新に時間差がある場合は、正本への収束と計算中表示を照合し、時間差そのものを新しい不合格条件にしない。

共有P/Qへの全件同時UPDATE、特定page実装、全cleanup/codec/FDの無変更全量再実行、一定時間の全件完了、全browser/OSを新条件にしない。変更した共通begin/prune/runnerの影響が旧条件へ達する場合だけ、その元条件を示して狭く再openする。共通writer/容量を実際に変更した場合は旧根拠を無条件で流用しない。

P3のWS/OR-09全選択・移動/タグ、P4の公開/共有リンク、P5のDrive実バックアップ・退会は後続に残る。今回の確認文にDrive backup保持を示すことと、Drive上の実ファイルを検証することは別。ゴミ箱emptyをWSやOR全体の合格へ拡張しない。

## 停止状態

この作業は文書読取と本ファイルの新規編集だけ。製品source、DB、browser、process、依存、test、build、hash、git、固定tempを調査・操作していない。実装案・テストhelper・fixtureは作成していない。全観測は未実行。環境所有はImplementerのまま、文書提出後は操作を止め、P2d-3正式候補の委譲を待つ。
