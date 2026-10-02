# P2c-2 本体の独立検証準備

## 対象と状態

2026-09-06 15:32:37 JST に文書確認開始。対象は plan P2c-2-A〜F、元 ED-02/03/05/01/07/08/06/11、採用 design C2 節、`phases/P2c-2-contract.md`。根拠資料は `reviews/P2c-2-gate.md` の修正版再確認、`reviews/P2c-1.md`、`reviews/P1-save-race.md`。画面名・操作の補助として pages P-11/P-12 を参照する。

これは検証計画であり、全項目は本体について未実行・未判定。変更中 source、依存、DB、tests/build、browser、production、clipboard、OS設定には触れていない。実装側の所有を維持し、本書だけを作成する。spec-manual-test の正常/異常観点と markdown-style を利用し、出力先は本書に限定する。

正本は原シナリオと現在の採用design/plan。旧契約文書の「候補」「未採用」「未実行」は作成時点の記録であり、G受入後の採用判断と分ける。ページ案のShadow DOM表記は現在採用されたiframe方式を覆す指示と解釈しない。C3・WS・public/exportの未実装をC2の不合格へ混ぜない。

## 根拠の持ち越しと優先順位

G受入は、固定一時gateでのsource由来対応・親入力・隔離の代表成立。C1共通保存、実保存応答とのsession整合、HTML診断、mode、退避は未接続だった。したがって検証の中心は次の順序とする。

1. 実save応答後も空Text/undo/最新入力を保持できること。
2. G4のraw source・診断・安全preview・保存許可の世代一致。
3. G5のdirty確認・継続保存・mode既定・失敗stay/復元。
4. worker/履歴/style/権限・媒体とのC1交差。
5. VG-01〜03と通常table等の本体移植回帰、資源/配布/保全。

Gのpure8・7browser harness、C1独立46件と実UI、V5独立22件と実raceは過去候補の証拠。正式候補の差分に対して適用範囲を判断し、無変更の全codec/全safe-fetch/全容量試験を反復しない。過去のtest数を新候補の独立実行数へ足さない。

## 検証時の前提と最小入力

正式候補の固定hash・所有移譲・実装報告を受領してから、自己専用noteと別tempを準備する。本書の作成中はfixtureも生成しない。実装中sourceへテストを書き込まない。

| 入力群 | 小さい固定入力・状態 | 使う目的 |
| --- | --- | --- |
| Text対応 | Gの通常table/リンク/同名data-*、反復foster/clone、UTF16/entityから必要な部分だけ | 本体A/B移植、正本とrender差の分離 |
| 改行/空 | `<p>alpha\r\nbeta</p>` を2つ、`<pre>\r\nline1\r\nline2</pre><p>outside\r\nkeep</p>` | 未編集source保持、表示offset、空session/再選択、undo |
| 診断 | 正常省略tag/暗黙tbody、既知の壊れたnest、先頭に日本語/emoji/CRLFを置いた同入力 | highlightと診断位置・補正preview・source保持 |
| 安全化 | 非秘密の専用markerだけを使うscript/event/javascript URL、既知CSS制限、正当な同名data-* | 除去notice、親漏れ/正本marker混入拒否。外部送信を伴うpayloadは使わない |
| 媒体/参照 | 既存ライセンス固定PNG/SVG/flower MP4のうち小さい代表、C1で成立した同URL別CSS snapshot | current/history認可、mode/save後のasset保持、worker構造変更 |
| 資源 | 800×1024 bytesの直前/一致/超過、採用されたnode/depth/undo制限の境界 | 大量fixtureを集めずadapter生成。日本語のbyte/文字数差を含む |

fixture原文/hashと試験出所は正式報告へ残す。未信頼HTMLを親DOMへ直接注入して試験を成立させない。外部参照の遅延は隔離adapterまたは自己tabの応答保留で行い、productionにprivate-fetch例外や恒久故障を足さない。

## A〜F 観測matrix

各行は別の検証目的。UI列の必須をDBだけの成功で置換しない。逆にactor/認可/資源境界は安全な隔離DB・adapterで十分な枝を本体故障注入へ広げない。

| ID / 試験 | 正常対と具体的操作 | 拒否・回復対 | 最低証拠 / 層 |
| --- | --- | --- | --- |
| A-1 / P2c-2-A 正本保持 | 自作noteを詳細→visualで開き、table内/リンク内の1Textを変更して本体save→詳細→reload | data-*を編集由来と誤認しない。script/style、描画用URL/markerを正本へコピーしない | UI必須。保存前後canonicalの要素/namespace/属性/親子順比較、変わったTextが1つ、DB保存HTML、iframe隔離条件 |
| A-2 / P2c-2-A 改行・HTML5移植 | CRLF/preを無編集save、次に改行後pointerで1文字挿入。foster/clone/UTF16の狭い正常対 | 投影の型/属性/namespace/Text/順序不一致・非一意選択は理由付き停止、raw保持。無編集でLF化しない | 正常は実UI＋DB。故意の不一致はadapter/自己tabで可。対象Text以外不変、正しいsource ID、body全serializeへのfallbackなし |
| B-1 / P2c-2-B 空Textの実応答 | 既知Textを全消去→本体autosave完了→hostを閉じる→アプリが提供する同session再選択→再入力→save | 保存応答後のAST再parseで空IDを失わない。空sessionを新規visual不可と混同しない | UI必須。created/既存note ID、選択ID、host導線、実POST成功、保存済み/DB、再入力後同Text位置。reload/mode往復後の空ID永続化は要求しない |
| B-2 / P2c-2-B undo/入力 | Text変更→autosave応答後undo/redo→保存、plain+HTML pasteを選択範囲へ一回、LFはTextとして保存 | 跨Text削除/要素drag/書式/media挿入/HTML-only/file+plainを理由付き拒否。visualのmedia toolbarなし | UI必須。1paste/1compositionのundo単位、Text/属性構造、escaped保存、保存されたundoだけが意味ある版。native/syntheticは下節で区別 |
| B-3 / P2c-2-B composition/空状態 | VG-01の制御列に本体autosave/mode要求を加え、終了後trusted通常入力が続く | composition中Escape/切替/保存でhost/対象/generationを失わない。遅いendを別対象へ適用しない。空本文、媒体のみ、script/styleのみ、hiddenのみは新規visual選択不可 | 実UI＋合成制御。入力eventのtrusted/type/time、host同一性、mode、保存有無。OS IMEは別必須観測枠で未確認を明記 |
| C-1 / P2c-2-C highlight/位置 | HTMLで正常sourceのtoken色分けと入力・選択・undoを見て、壊れたnestへ変更。日本語/emoji/CRLF前置きで警告の位置へ移動し対応箇所を確認 | 正常省略tag/暗黙tbodyを一律構文エラーにしない。診断/補正によってraw inputを無断上書きしない | UI必須。raw値、診断code/message/位置、cursor/該当範囲、補正後の安全iframe。adapter位置単位（UTF16等）とUI表示単位の整合 |
| C-2 / P2c-2-C 保存前処理/notice | 壊れた構文→その世代の警告と補正preview→安全化save。別のscript/event/URL/CSS入力で除去内容を確認 | 診断/preview未完の世代を先行autosaveしない。不正構文を永久保存不可にしない。次の通常autosaveで除去noticeを無言消去しない | UI必須＋最小transport時系列。raw/診断/preview/POSTに同generation、DBはaccepted canonical、構文補正・除去・CSS理由を別に示す |
| C-3 / P2c-2-C 古い応答/失敗 | source A解析/preview応答を自己tabで保留→Bを入力→B完了→A解放 | Aの警告/preview/保存許可がBへ混入しない。timeoutは「正常」でなく失敗案内、raw/退避保持。再試行で現在世代だけ成功 | UI必須＋adapter取消。入力値hash、generation、待機/解除順、最新表示/保存値。保留wrapperは観測用条件として記録 |
| C-4 / P2c-2-C 800KiB | 正常な日本語入りsourceの保存byte境界、上限以内の小入力へ修正して再試行 | 超過paste/sourceは切詰めず保存/解析拒否、分割案内・raw/退避を保持。CodeMirror max-lengthによる黙ったdrop不可 | 正確なbyteはadapter/transportで十分。実UIで超過案内と全文保持/復帰を1対。200文字title境界はE-1で分担 |
| D-1 / P2c-2-D dirty切替 | visual→HTML、HTML→visual、HTML→WYSの小さな構造を失わない入力で、dirty→保存確認→保存成功→新mode | 取消は旧mode/入力/退避/端末既定不変。WYS警告の取消で勝手に切り替わらない。clean切替だけでnote/版/job増加0 | UI必須＋DB差。確認/POST/新modeの順序、server canonicalで初期化、保存失敗後stay。C3の高度な損失変換をここで要求しない |
| D-2 / P2c-2-D 継続入力/V5 | mode切替または完了のsave応答後invalidate待ち中に本文・titleをtrusted追記→解放。さらに次save中に短い追記を1対 | 古い応答で消えない。同ID最新版まで保存後に切替。次POST/読取失敗では旧mode/latest退避、retry同ID。短い移行lock前後に取りこぼしなし | UI必須。POST応答/GET保留/入力/解除の時刻、最終note ID/title/html/mode、DB版数、保存表示、new/stable両key。初回応答全喪失のexactly-onceは追加しない |
| D-3 / P2c-2-D 既定/復元/新規 | 既存でvisualを選択→別noteを既定で開く。同userの別tabと別user/storageを分け、backup/route/default優先順位を確認 | 不正mode/storage拒否は案内付きfallback。noTextでvisual不可でも選んだ既定を勝手に書き換えない。新規初回はURL/端末既定によらずWYS | UI必須＋純粋reader。新規無入力離脱でnote増加0。新規HTMLのV5対は新規WYSを確認後UIから切替え、旧harnessのURL強制modeを無条件再利用しない |
| D-4 / P2c-2-D upload/中断 | 小媒体upload中にmode切替/離脱要求→完了後の保持、または明示中断 | 未完assetを落としてvisualへ進まない。失敗は除去/retry案内、取消stay。composition中もmodeを変えない | UI必須。upload状態/asset ID、mode、確認、完了・失敗後HTML。全codecの再試験は不要 |
| E-1 / P2c-2-E 保存/版/title/style | 各modeから同じC1保存、title変更（空→無題・200文字）を確認。意味ある本文/title/style変更だけ版に現れる | 同値HTML・clean mode変更・previewだけで版/jobを増やさない。title201文字は境界拒否/制限。別tabの最新styleを古いeditor保存で巻き戻さない | 代表実UI＋隔離DB。current/head/版原因・数、title/html/style値。現在含20・prune/rollbackは共有保存の変更に応じたfocused回帰 |
| E-2 / P2c-2-E 構造再初期化 | clean状態でreference workerがCSS/asset参照を確定したらaccepted構造で再投影。自己saveで構造同じなら空ID/undoを維持 | dirty入力中のworker/sanitizer構造差は通知・確認/再初期化と最新入力退避を両立。古いsource IDで新構造へ誤適用しない。自動mergeは要求しない | UI必須＋adapter/DB。前後canonical/構造/generation/version、dirty最新値、通知/選択後結果。遅いworkerの旧version/lease/generation commit拒否は隔離DBで十分 |
| E-3 / P2c-2-E 履歴/競合 | visual dirtyから履歴へsave/discard/cancel、immutable版preview取消→restore→新session。2tab本人の更新通知と後勝ち | preview選択だけで古い本文をautosaveしない。restore後に旧AST/undoで別版を壊さない。他actor確認→現在再更新なら再確認。prune済baseを無言上書きしない | UI必須は履歴遷移/反復/dirty保持/iframe1。actor/prune/exact確認は隔離DBで可。旧同URL別CSS snapshotをcurrent-only reuseで差替えない |
| E-4 / P2c-2-E 退避/失効/media | visual save失敗→reload→最新title/html/visual modeの復元とdownload。旧modeなし/old new-only backup互換。媒体入りsourceを同assetで復元 | 認可失効はsave拒否、理由と最新内容download。別user/不正ID/mode/期限等を信頼しない。current除去assetはcurrent拒否、保持版はhistory scopeでのみ表示 | UI必須は復元導線・実download内容・media表示。認可失効/GET/HEAD/Range/416先行認可は隔離handler/DBを優先。WS除名の本体完成とはしない |
| F-1 / P2c-2-F 解析/undo資源 | 最終採用されたnode/depth/診断deadline/undo操作数・bytesの直前/一致/超過、取消後に次の小入力が処理できる | timeout/中断/古い世代を成功扱いしない。UIやUoWを長時間占有せず枠解放、raw/最新退避を失わない。undo上限は古い操作だけを落とし案内 | adapter/worker試験とコード確認が主。UIはtimeout→小入力復帰1対。候補1秒/2秒/100操作等を確定済み原要件へ昇格しない |
| F-2 / P2c-2-F 配布/境界/保全 | 最終source/hashに対応したchecks/build/startと必要focused試験、実browser save/reload/失敗回復/keyboard/mobile、旧データ保全 | gateのany/固定asset権限/一時Map/saveを本体へ持ち込まない。依存未宣言やserver/client bundle混線、子script許可追加を拒否 | 最終候補のコード/port/input境界レビュー。parse5/HTMLeditor直接依存・lock/runtime整合、旧行/原本/pin/版保全、自己hook全解除・所有返却 |

## 状態交差の最低証拠

### 実保存応答と空Text

B-1では gateの「一時メモリsave」を使わない。実サーバー応答で空Textがserialized HTMLから消えても、固定構造が同じ自己session内はそのIDへ戻れることを観測する。hostを開き続けた再入力だけでは不十分で、閉じた後の実UI導線を使う。undo/redoの結果も再保存し、detail/reloadで意味ある本文が保持されることを確認する。reload/mode切替をまたぐ空Text identityは採用契約の対象外。

### 構造変更とdirty

E-2はclean再初期化とdirty保護を対にする。workerが先に確定した後のclient保存と、clientが先に保存してworkerが古くなった順序を隔離DBで確認し、UIでは代表のdirty通知/再初期化を1経路通す。許容結果は、現在構造へ正しく再照合するか、理由と最新入力を保持して明示的な再読込/復元へ導くこと。旧Text IDで誤更新すること、入力を退避せず消すこと、旧workerが新しい本文を上書きすることは不合格。未要求の自動mergeを必須にしない。

### HTML sourceの世代

C-1〜3では raw input、診断結果、補正preview、保存されたcanonicalの4つを別に採取する。文字列の見た目が同じだけでは世代一致の証明にならない。長さ/識別markerとgeneration、入力/応答時刻を使う。診断位置は日本語・emoji・CRLFで実際の該当箇所へ対応することを確認し、行列の1起点/0起点など実API契約の違いをfixture誤りと混同しない。

### 退避とmode

D-3/E-4の旧backup互換・不正mode/ID・利用者分離・storage失敗は純粋reader/adapterで枝を網羅し、UIではvisual復元と旧modeなしの代表を通す。作業復元modeは端末既定より優先し、成功前のmode要求で既定を更新しない。空Textを消した後のvisual backupがreloadで編集可能Textなしになった場合は、理由付きHTML fallbackと本文/退避保持を評価し、空IDの永続化を新条件へ増やさない。

downloadは実際に取得したファイルのformat/title/html/modeと最新内容を確認する。失効は隔離DB/handlerで、download UIは通信失敗で確認した場合、その2つを「実失効UI確認済み」と合成しない。実失効UIが必要になった場合も、正式委譲後の自己専用noteと完全復帰条件に限定する。

## 実入力の三層を分ける

| 層 | 予定する観測 | 合格へ読み替えないもの |
| --- | --- | --- |
| trusted通常入力 | pointerでText選択→日本語/emojiのinsertText、入力focus、keyboard undo/通常キー、mobile viewport | OS IME変換・実mobile OS |
| 合成制御 | VG-01時系列、取消、古い終了、mixed/plain/HTML-only/file ClipboardEvent、DataTransfer drop | native clipboard/OS drag/drop・実候補窓 |
| OS/browser実操作 | 正式検証時に通常利用可能な環境で、IME確定/取消・一変換undo、既知fixtureのnative paste、OS file dropを別欄へ記録 | 合成成功による穴埋め、未知clipboardの読出し/貼付、OS設定や入力サービスの追加 |

実IME/nativepaste/OSdropは現在未確認の具体的な入力要件であり、単なる「全platformを試していない」という一般限界へ埋めない。手段がなければ試行条件と未確認のままManager判断へ返す。本書では手段調査やclipboard/OS操作を行わない。全HTML5/bidi/全computed CSS/全browser/全codecは追加必須条件ではない。

## 異常観点と対象外

| 観点 | 対応 | 範囲の限定 |
| --- | --- | --- |
| 入力/特殊文字/境界 | A-2、B-2/3、C-1/4、D-3、E-1、F-1 | 本文はbyte、titleは既存200文字契約。全Unicode表示の証明はしない |
| 認証/権限 | E-3/4、F-2 | personal段階の現認可。将来WS role/公開/共有の完成を求めない |
| 空/初期状態 | B-1/3、D-3/4 | 既存空sessionと新規visual不可、新規未入力noteなしを分離 |
| 重複/競合/遅い結果 | C-3、D-2、E-2/3 | 同ID/C1 actor・世代・lease。初回commit応答全喪失のexactly-onceは追加しない |
| 参照変更/履歴 | E-2/3/4 | current/history分離と既存pin契約。全GC/容量の負荷再実行は変更影響がある場合だけ |
| 中断/取消/離脱 | B-3、C-3、D-1/2/4、E-3/4 | 入力保持と回復まで確認。localStorage全面不可時のreload復元は保証しない |
| UI状態/回復 | C-2/3/4、D-1〜4、E-4、F-2 | 実UIでの操作/状態/画像を自分で確認し、helperの期待誤りと分ける |
| 後続機能 | 対象外 | C3 opaque block/損失変換全体、P2dごみ箱、WS/public/export/AI等。既存WYS警告とC1接点は対象 |

確認した文書間で、新たなManager判断を要する契約矛盾は検出していない。候補の資源値、空IDのsession限定、C1同owner後勝ちと別actor確認は採用契約どおりに分けている。未接続機能の取り落としを合格扱いにせず、一般的限界を新しい必須機能へ広げない。

## 正式検証時の報告と引継ぎ

最終候補を固定してから開始/終了hash、実時計、IDごとのpass/fail/unverified、自己報告の借用・独立再実行・独立追加・実UIを区別する。失敗は再現入力/時系列/期待/実際/対象コード/DB影響、退避の残存を示す。画像はVerifier自身で見る。旧データ/backupは保全対象とし、自己試験dataを既存noteと混ぜない。

変更中sourceを本書のためにレビューしていないため、最終sourceに対する試験数や合否は未確定。現在のproduction PID/DB件数/hashを読み直して確認したという主張もしない。自分のserver/browser/listenerは開始しておらず、環境所有は一貫してImplementerにある。文書完成後は全操作を停止し、正式候補を待つ。
