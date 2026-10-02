# P3c 根拠の適用範囲と残リスク

2026-09-10T23:06:34+09:00時点の独立文書準備。P3c-A〜G、採用design、`P3c-feasibility.md`253行（監視補足を含む）、`P3c-ui-plan.md`120行、OR原文、CLAUDE規約を照合した。P3c製品のコードレビュー・動作検証は全て未実行であり、合格判定ではない。

goal-implement/manager-loop、markdown-style/doc-styleを適用する。spec/spec-implement、補助、goal APIは使用していない。今回の書込みは本書だけ。製品・DB/storage/browser/process・build/test/lock/依存・既存temp・全体管理文書は調査・操作していない。環境所有はImplementerのままである。

## 正本と先行根拠

[plan P3c-A〜G](../plan.md)と[採用design](../design.md#p3cの検索日付タグ共有契約)が受入条件の正本。[成立調査](../phases/P3c-feasibility.md)と[UI接続案](../phases/P3c-ui-plan.md)の「未採用」は各報告時点の記述であり、後続designが採用した方式・数値を未決へ戻さない。全文の複製や追加の方式gateは設けない。

| 先行根拠 | 適用できる範囲 | 製品へ一般化できない範囲 |
| --- | --- | --- |
| FTS5 ASCII＋encoded1/2-gram、1100候補中の後半真一致100件 | 標準trigram単独では満たせない2文字検索と、exact-before-LIMITの候補方式。FTS起点CROSS JOINの隔離query plan | 実schemaの全sort/cursor、tag/月との複合、全member policy、HTML parser/offset、安全なsnippet、全保存経路 |
| synthetic同Tx置換/rollback/delete | note/projection/tokenを同時に変える代表境界 | C1共通commit、変換/reference/restore、版競合backfillの実配線。outboxだけで正確性を代替しない |
| HTML819198Bの単体例 | 上限直前入力のencoded projection・更新・queryが一度成立。索引量の代表観測 | 既知textを入力しているためHTML parse/sanitize/offset時間を含まない。約707msの置換値は最大負荷・heap/WAL/FD・同時保存SLOではない |
| 同process timer未発火、独立親からread child kill→close約504ms | 同event-loop timerだけでは実SQLを停止できないこと、自己read childの終了確認方式 | HTTP mainから独立したsupervisor配置、総3秒、queue/IPC/startup/DTO、supervisor自身の異常終了。kill送信をslot解放と同一視しない |
| runtime/Unicode/ICU識別 | 調査時Node22.22.3/client0.18.0/SQLite3.45.1、Unicode16、ICU76.1/tzdata2024bの識別 | mapping生成と版整合の本体実装、polyfillの実配線、civil境界の逆変換。polyfill固定だけでhost tzdata固定とはしない |
| UI文書の既存再利用点 | RSC/client owner、現在scope、iframe隔離を維持する接続方針 | 実browserのpalette/旧応答拒否/scroll/見出し移動は未実行。完成した本体UIの根拠ではない |

調査の`public=1`は隔離fixtureのeligibility対であり、個人/WSアプリ検索へ公開限定を追加する条件ではない。派生索引の物理容量観測は利用者object quotaへ課金する根拠でもない。

## A〜Gの残る接続境界

| 対象・出所 | 正式候補で必要な最小の観測差 |
| --- | --- |
| P3c-A / OR-03、design索引・移行risk | 同じ現在HTML/titleの小さい更新・変換/参照/復元とrollbackで、古い語が消え新しい語が一致すること。backfill中の新保存と再開で旧projectionを採用せず、未完成検索を完成と表示しないこと。誤候補が先行してもexact後のpageを欠落させない代表対を実schemaへ接続する |
| P3c-B / OR-01/02/10 | 同じscopeのtile/listを、先頭text→画像と画像→textの小入力で確認する。任意のcurrent画像を「本文先頭」としない。50件の続き、同値ID順、追加失敗→既取得分保持→同cursor再試行、条件0件→解除を通す。全HTML/全pageのclient取得を成功根拠にしない |
| P3c-C / OR-03、design検索意味・世代 | `東京`/`東`、`cloud`/`flare`、混合AND、本文未生成titleのみを正常/非実行/不一致に分ける。parser/entity/inline連結と正規化長の変わる文字で、検索一致と安全mark位置の一致を確認する。scope/query変更後の旧成功・旧失敗が新候補へ混ざらず、paletteからdetail/一覧条件へ進めることは実UIで確認する |
| P3c-D / OR-04、OR-06同名基盤 | 実tag正本/関係から頻度と複数ANDを読む。使用0件・不明/他scopeの選択IDは0件と解除で、全件へ広がらない。幅/fullCF同値と、タグではNFKC互換全体を畳まない非同値対を版固定で確認する。tag作成・rename/merge/deleteの通常UIはP3dへ残す |
| P3c-E / OR-02/05/10 | 同じcreatedAtをIANA zoneごとの半開区間へ分け、月境界/DST gap・overlap/skipped dayの代表対で日件数と展開集合を一致させる。URL zone優先・初期準備失敗回復、calendar中sort無効/通常sort保持、月解除/scope切替を確認する。日初期3/追加50は採用値であり全月HTML取得を認める値ではない |
| P3c-F / OR-11、ED-11隔離 | 長文全文・原本metadata・creator unknownの事実表示を確認する。現在iframeの反復見出し/重複idを別対象として移動し、style変更・再取得後の旧参照を不採用にする。labelのtext取得とElement移動は実DOMで確認する。正本id/HTML・sandbox/CSPを変更しない |
| P3c-G / CLAUDE、OR現在文脈 | 現在個人/WS/非member・失効を候補だけでなくsnippet/count/tag/calendarへ共通適用する。URLとcursorを権限証明にしない。通常一覧の非await RSC/Suspense、親所有optimistic trash/rollback/invalidate、validated外部入力、390px/keyboardを変更した入口だけ確認する。旧全列/版/pin/object/chargeは新online backup基準で保全する |

型・SQL・隔離DBで十分な枝と、palette/初期preference/見出し/表示世代の実UI枝を分離する。全PM/codec/FD/20版の旧成功を、接続差分のないまま反復しない。live keysetは複数requestをまたぐ固定snapshotではないため、P3eの全選択集合保証をP3cへ追加しない。

## supervisorの未証明部分

出所はOR-03の期限と、designの実計算停止・有限資源risk。採用済みのread child1/queue16/FIFO/受付から3秒を、次の区別で正式接続案と固定候補へ照合する。

- queue満杯、起動前期限切れ、SQL中期限切れは別状態。待機後に新たな全3秒を与えず、期限切れ/旧世代結果を表示しない。本文保存の同期SQL中も監視の計算停止が独立することと、HTTP応答が即時配送されることを混同しない。
- 正常終了、timeout、IPC切断のいずれも、結果通知/kill成功だけでslotを返さない。実child close前に新childを増やさず、正常終了後は次の要求へ回復できることを対にする。
- HTTP mainの異常終了とsupervisor自身の異常終了は別障害。後者の自己既知childの収束・旧slotの扱い・再起動可否は未証明。旧childが消えたと仮定した再起動や、同process内のdisconnect callbackだけでは長い同期SQLを止めた根拠にならない。
- 具体的な資源回収方法の選定と実装は担当へ残す。任意process探索/一括killや新OS方式を受入条件へ追加しない。採用された方法を自己資源だけで確認し、終了未確認時は枠保持/新規拒否と、回収確認後の回復を分ける。

これは追加stress gateではなく、採用した監視配置の未接続部分である。先行のread-only SQL終了試験をwrite worker強制終了や全障害の耐性へ流用しない。

## P3c-Fと後続依存

OR-11のバックアップ状態にはまだDriveの永続正本がない。P3cは「Hollow原本保存」と「外部バックアップ機能/状態は未提供」を区別する部分受入である。原本行だけからDrive完了・失敗・未連携を推定せず、local editor退避も外部backup状態と混ぜない。実状態・実操作・接続検証はP5に残り、P3c-Fの合格でOR-11全体のbackup要件を消さない。

同様にP3c-Fの現在private表示はP4の公開/共有成功ではない。タグの書込・移動はP3d、一括500/全選択集合はP3e、公開検索の期間updatedAtはP4、LLM連携/再生成・DriveはP5。今回のcalendar/月createdAtとは別契約を維持する。未提供操作を成功buttonで装わないことはP3cの観測対象だが、後続の実装完了は要求しない。

## 判断と停止

指定文書間に新たな原文矛盾は確認していない。新しい方式や拒否条件の採用提案はない。supervisor異常終了の具体策は採用designに既に残る実装前判断、P5backupは既定の後続依存として維持する。準備報告のみを提出し、全操作を停止する。
