# P2c-3-G 独立観測準備

## 範囲と証拠の扱い

2026-09-06 / Asia/Tokyo。18:48 JSTに文書確認。対象は台帳P2c-3-G、ED-04/05/08/01/06、design C3と `phases/P2c-3-contract.md` 全文（保存失敗/reload補足を含む）。これは観測matrixであり、製品・gateの実行結果や合格判定ではない。Markdownの構造整理にmarkdown-styleを使用した。

本体559files、DB、依存、productionはImplementer所有のまま。予定temp `/tmp/hollow-wys-gate.QDkT7R` の中身も読まず、source/temp/helper/test/build/hash/DB/browser/ネットワーク/環境操作は行っていない。ProseMirrorの依存版、方式、追加運用値は未採用。本書以外への書込みなし。

後の正式検証では、固定候補・依存出所/license/exports・Node22の実行根拠を受領してから再現する。以下の「最低証拠」は収集予定であり、現在は全て未実行。純粋converterの成功だけでは実hostの操作成功にせず、一時保存成功・固定origin・固定mediaは現在認可/C1保存成功へ読み替えない。

## 先行gateの最小観測matrix

各行は独立の台帳IDではなく、P2c-3-G内の観測群。基本編集とopaque保持を別のデモだけで証明せず、同じ文書・converter・serializer・hostで対にする。

| 群 / 元条件 | 正常対・操作 | 拒否対・方式修正が必要な観測 | 最低証拠 |
| --- | --- | --- | --- |
| G01 基本schema / ED-04 | 一つの小文書に見出し、引用、段落、番号開始値付きリスト、mark、改行を置く。見出し/リスト変更、mark付与解除、通常typing、undo/redoを行い再合成・安全再表示する | 未編集の隣接内容が欠落、見出し等の基本操作が常にopaque/HTML誘導になる、モデルだけ変わりhost・出力が追従しない | converter前後の内容/構造比較＋trusted toolbar/keyboard＋保存入力HTML。ライブラリJSONだけを成功根拠にしない |
| G02 通常表 / ED-04 | 通常表とrowspan/colspanを持つ小表。セル文字編集、行列追加削除とundo。表の前後に編集可能な段落と未知inlineを併置する | 初期化だけでセル内容・span・順序を消す、通常表を一律opaque化。非対応な小部分のため隣の正常表/文書全体まで閉じる | 初期化前後のセル内容・span、編集後のHTML、実host操作。複雑表の全操作・全CSS同値は要求しない |
| G03 未知inline/block / ED-04 | 安全な未知inlineとblock、class/data属性を持つ部分木の前後へ入力。境界のBackspace/Delete、明示選択→削除→undo/redoを確認する | 未選択の未知内容を平坦化/黙って削除、inlineを無言block化、削除undoで別fragmentや属性欠落。明示削除を拒否して保持するだけでも編集成立とはしない | 元部分木と再合成部分木の属性・Text・順序比較、selectionと編集時系列、同host画面。境界操作で選択止めと明示削除を区別 |
| G04 最小opaque / ED-04 | 安全なSVG/namespace、非対応nestの局所部分と、その隣の通常段落/表を置く。必要な最小の有効祖先だけを保持対象にして、隣を編集する | 不明fragment/世代違いsidecarを別内容で補完、利用者の同名data属性を予約ID扱い、生HTMLをtrusted親へfallback。曖昧停止は安全合格だが通常入力の恒久非対応と同義にしない | fragmentと配置種別の対応、拒否理由/範囲、隣の実編集。table整合のため当該table全体が必要な場合は理由を記録 |
| G05 コード・リンク・媒体 / ED-04/06 | コード内の`<`/`&`/改行を編集。リンク作成変更解除、画像alt変更、image/videoの前後typingとundo。opaque内媒体も未削除なら保存入力へ残す | codeがHTMLとして実行/再解釈、編集中リンクで意図せず遷移、表示専用URL/inert変換が正本へ混入、未信頼外部mediaを親が直読 | 保存URLと描画URLを別採取、再合成HTMLとsafe preview、trusted操作。一時asset成功はupload/形式/容量/現在認可の証明ではない |
| G06 raw保持・損失 / ED-04/05/08 | CRLF、引用符、entity、属性順を含む元HTMLで準備/了解だけ、focus/selection、titleのみ、取消を行う。本文が未編集なら元rawを保持。本文編集後は保持opaqueと実損失を区別する | 初回mount/title変更だけでserializer出力へ置換、opaque保持を消失と表示、実属性/構造消失を「損失0」と表示、解析失敗を損失なし扱い | rawの文字列完全一致と保存入力呼出し、損失項目の位置/理由。安全化除去・schema損失・保持されるが直接編集不可の三分類。全computed/pixel同値は対象外 |
| G07 trusted host・隔離 / ED-04/06 | 通常内容＋未知CSS/安全SVGを同hostで編集し、選択対象だけの詳細previewを切り替える。opaque数が増えても同時previewは最大1。親の専用marker/レイアウトを確認する | 未知class/style/イベント/URLを親DOMへコピー、子script許可、生HTML復帰、previewの旧fragment誤表示。未信頼CSSの見た目を親で再現することを基本編集の条件にしない | 親DOM属性/stylesheet/marker、frame数とsandbox、再安全化した完成srcdoc、保存HTMLとの比較。攻撃用markerは秘密に触れない。実画像はVerifier自身で確認する |
| G08 入力・保存応答 / ED-01/04/08 | trusted日本語、emoji/UTF16、CRLF・preの先頭改行を小さい対で確認。空→入力→一時保存応答→再入力、応答待ち追記、undo/redoで最新集合を保持する | 改行/UTF16の誤対応、空へ戻した後入力不能、保存ackで新しい入力/undo消失、schema再構成で古い入力へ戻る | trustedとsyntheticを分けたevent順、host同一性、serializerの最新版、保存要求/応答時系列。模擬保存はV5同ID/本体履歴数の証明ではない |
| G09 composition・貼付 / ED-04/05 | 合成start/input→切替/取消要求→endの最小制御対、終了後通常入力。既知HTML＋plainのClipboardEventはplainだけ挿入し、一回undoで戻す | composition中にhost破棄/誤終了対象採用、遅いeventで別入力変更、plain文字列をHTMLとしてparse、fileを本文HTMLへ直挿入 | 同host/active状態、例外0、入力/undo結果。合成guard、trusted日本語、実OS IMEを別欄にする。fileは既存media経路への受渡契約まで |
| G10 資源・世代 / ED-04/08 | 提案した境界直下の小正常対と超過/取消対。遅いA→新B、unmount、失敗後小入力再試行。多opaqueはpreview resourceを使い回す | 超過時切詰め/部分成功、loss件数上限で残りを消失扱いせず隠す、古い結果採用、Worker/host/listener累積、UIへ長時間同期解析 | 正式候補が選んだ値/根拠、code上のbounded処理と実取消/再試行、resource解放。一時案の2秒/100件/1000セル等を既定の必須数値にしない |
| G11 退避codec・本文回収 / ED-08 | 最新の変換済HTMLにopaqueを再合成しoptional originと同JSONへ保持。metadata無し/旧mode無し/new-onlyを読む。不正metadataでも有効な本文を回収。新規originはID付与後もnew-without-baselineのまま | fragment IDだけ保存しreloadで内容消失、originを最新本文と取り違える、不正hintだけで本文破棄、HTML回復で元版が復活したと表示、downloadへorigin/秘密を追加 | 純粋codec roundtrip/拒否対、実hostの失敗後raw/HTML回復、4key download。固定hintは未確認でありserver認可済availableを証明しない |

## 本体接続に残す条件

| 本体条件 | 次の接続gateで必要な対 | 今回だけでは不足する理由 |
| --- | --- | --- |
| 全入口と警告 / ED-04/05 | 明示/端末既定/route/backupの共通準備、新規空免除、dirty settle後の最新canonical、取消/失敗stay、抑止/reset・利用者分離・storage拒否 | 一時hostの了解/取消は本体route・設定・保存要求所有を通さない |
| prelossy・20版 / ED-04/08 | 初回変換保存直後にもoriginが残る対と20pruneで外れる拒否、同note/current認可、actor確認後再更新、rollback/pin/由来表示無効 | 純粋な保持集合判定は補助にできるが、実C1 UoW/並行保存・21版なしの証明ではない |
| 保存失敗/reload / ED-01/05/08 | 変換編集→失敗→追記→reload→同note最新本文＋元origin、new/stable両key、保存済応答と最新入力の分離、不正/別note/prune/失効hintでもraw/download、明示HTML回復 | gateの固定originを再承認しない。変換済みbackupを現在版由来へ付け替えず、確認不能で元版保証付き保存を成功にしない |
| 共通保存・C2要求所有 / ED-01/05/08 | 無入力note0、titleのみ本文不変、両mode V5、dirty切替中追加、古い要求取消後も正当なsave accept、構造変更時再準備と最新入力保持 | 仮保存/一時IDでは本体同ID・履歴・worker・最新canonicalの交差を証明できない。C2受入を無条件に再利用せず移植変更だけ再open |
| 媒体・復元 / ED-06/08 | draft→stable/同asset/失敗再試行、opaque削除と履歴復元、current/history GET・HEAD・Range認可、CSS snapshot/両style、現在設定維持 | 固定媒体表示/URL識別は認可・pin・容量・実uploadの成功ではない。無変更全codec/GC方式を再証明する要求は追加しない |
| 配布と移行 | 採用依存の本体lock・Node22/SSR/client/Worker build→start、任意metadata追加時の旧本文/版/asset保全 | 一時bundleの動作を本体配布成功へ読み替えない |

## 判定の線引き

先行方式の修正必須は、通常基本操作の内容欠落、unknownの無言平坦化、rawの非編集時変更、親への未信頼HTML/CSS混入、最新入力や退避本文の消失、資源超過時の切詰め。安全な拒否でも通常表や通常inline入力が恒久的に成立しなければ、その範囲の採用は保留する。

保全比較は二段にする。未編集・titleのみ・取消は元raw完全保持。本文編集後は明示したserializer同値差と実損失を分類し、保持opaqueの内容・属性・順序を比較する。全原文bytes保持を編集後の全schemaへ追加要求せず、逆に見た目が同じだけで欠落なしとも判定しない。

契約に直ちに矛盾する追加指摘はない。特に「可能な限り保持」は全本文opaque化の免罪符ではなく、未知属性を親DOMへ移植する要件でもない。正常な隣接編集と最小部分保持の対で判断する。

実OS IME候補確定/取消、nativepaste、OSfiledropは既存未確認を維持する。今回の準備では操作・手段探索を行わず、正式gateでも合成試験を実OS成功として数えない。局所制御欠陥があれば方式修正条件、OS実操作の未確認は本体統合時の入力確認残条件として別記する。全platform/全HTML5/bidi/全codec保証は追加しない。

本体・gateは全て未実行。正式固定候補の独立検証は次の委譲で開始する。本書完成後は全操作を停止し、環境所有はImplementerに維持する。
