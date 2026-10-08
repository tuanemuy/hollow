# P2c-3-G 局所修正の独立再確認

## 結論

2026-09-06 / Asia/Tokyo。19:57:06 JST開始、20:04:24 JST終了hash確認。元C3-GV1の最新本文回収不良とC3-GV2の見出し変更時属性消失は解消した。G06/G08とG10の修正対象経路は合格。G11はtoolbar拒否後のbackup再作成という軽い残差C3-GV1-R1を検出したため、ack/cleanupの全経路合格とはしない。残差の先行gateでの修正要否・本体接続条件への分離はManager判断へ返す。

R1は元GV1のような最新本文欠落ではない。モデル/HTML/ack/undoは正しく保持される。方式の主要障害は解消しており、ProseMirror・明示converter・opaqueを用いる方針そのものが不成立とは判断しない。旧不合格の根拠と資材を保持する。

`phases/P2c-3-gate-revision.md` 全文、旧独立レビュー、prep G06/G08/G10/G11、採用design/契約を基準にした。独立レビュー・実操作の証拠分類とmarkdown-styleを適用。spec/spec-implement、goal API、製品/候補修正、依存導入、Issue、追加agentは行わない。自己一時環境だけを使用し、他session/global cleanupなし。

## 固定識別と実行範囲

| 対象 | 開始19:57:28 / 終了20:04:24 JST |
| --- | --- |
| 新候補 | `/tmp/hollow-wys-revision.tZxEzJ`、43files、`2a445ca8223317b876175999824e7623c26c76aaa4ae6c120f2ccff187ea7830` 一致 |
| 旧gate | `/tmp/hollow-wys-gate.QDkT7R`、34files、`5e7f8ca7462e4f60f3ee39613293b0058c9b2ab2d194719264d029fd625fe89c` 一致 |
| 旧独立資材 | `/tmp/hollow-c3-verify.GKg3WX`、16files、`5bb58c87d1a5af50f05f109c744e44ced77f3b5c2cec97ba8681bf27b68cbaed` 一致 |
| main | 559files、`12963eec15b2d807866bfe8f7aae7da6a49a6457a1ecf7ff650480f5df83cfd1`、HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、lock `ab5726f19ce660ffdc599821edbb1f115cb114fae8987dcfbab33d8d9190e68f` 一致 |

各tempはnode_modulesを除く全regular files、相対pathsort+NUL+bytes+NUL。mainは従来のdedup/sorted tracked+untracked実files、`.goal-implement/`除外。hash CLIだけNode24.19.0。test/helper/serverはNode22.22.3、strictは既存tsgo/noEmit。

独立で新transaction4純粋testsを再実行し4/4成功、199.696ms。strict9TSもexit0。追加独立pure2件は成功、370.530ms。新規の小append transactionを含む候補HTMLが採用される正常対と、既存code/paragraph混在の別origin・codeOrigin保持を確認した。独立tempのmodule type未宣言warningは資材構成の注意であり製品障害ではない。

```sh
# cwd: /tmp/hollow-wys-revision.tZxEzJ
node --experimental-strip-types --test --test-reporter=spec transaction.test.ts
/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.bin/tsgo -p tsconfig.json
node server.mjs
# cwd: /tmp/hollow-c3-recheck.15q6OZ
node --experimental-strip-types --test independent-transaction.test.ts
```

旧30pureのconverter/backup tests、converter実装、backup実装、prepare-worker、temp lockをbyte一致で独立確認し、前回30/30独立成功を維持した。今回は無変更30件を再実行していない。最終34件全成功・bundle成功は実装報告の借用根拠。固定bundleを実起動し、再build/format/installはしない。server.tsはstrict9の対象外で、既存bundleのNode起動と実応答を別の根拠にした。

host差分、transaction実装/4tests全文、server差分、各helperを確認した。旧serverとの差はtemp rootのimport.meta.dirname化だけ。受理前検査はapplyTransactionによるappend込み候補→完全serialize→成功時だけview/HTML/カウンター更新。例外時のDOM整合は未受理の旧stateを再表示し、受理後rollbackではない。paste成功noticeが拒否理由を消さないこともコード/実操作で確認した。

## 元GV1の独立再演

独立 `original-replay.cjs` は元の小p→170,000個の`<`→40,000個追記の操作を維持し、旧不良観測を正しい拒否期待へ変えた新資材。元helperは変更していない。model/DOM/raw/HTML/download/backup/ack/undo/redo/変更回数/step累積を専用page内で比較し、大きな本文をtool出力へ繰り返し送らない。

| 実時刻 JST | 独立結果 |
| --- | --- |
| 20:01:31.928 | 170,000文字の正常paste。model/DOM170,000、HTML680,007bytes、raw/download/backup完全一致、undo1、変更1、uncaught0 |
| 20:01:31.965 | 40,000追記はtransaction全拒否。比較対象全て直前一致、undo1/変更1のまま、明示800KiB拒否notice、uncaught0。一部切詰めではない |
| 20:01:32.773 | trusted「最新z」を正常受理。model/DOM170,003、HTML680,010 UTF-16長 / 680,014 UTF-8bytes、全回収経路一致。拒否と新入力を区別するnotice。600ms間隔で別history groupを確定しundo→redoも成功 |
| 20:01:33.479 | DOM Textを先に40,000文字増やして合成InputEvent/MutationObserverへ送る。model/DOMと全回収/履歴/カウンターが直前一致へ戻り、拒否notice、uncaught0。実OS IMEではない |
| 20:01:33.759 | 合成composition開始→trusted「日」→合成終了。model/DOM170,004、HTML680,011 UTF-16長 / 680,017 UTF-8bytes、回収一致、例外0 |
| 20:01:34.222 | 実装者由来 `gv1-ack.cjs` の模擬ack済みsourceに超過paste。HTML/ack一致、backup null/undo0を維持。本文編集回数0からの対 |

append超過とsidecar欠落を含む4pure拒否対も成功した。追加独立pureでは小appendが候補に含まれる正常対を確認している。拒否だけが常に成功する実装ではない。

### C3-GV1-R1: toolbar拒否後だけ保存済みbackupを再作成する

20:02:20.061 JST、独立 `toolbar-ack.cjs`。G11の指定条件「ack済み拒否でbackupを捏造しない」の狭い共有経路を確認した。

1. `<p>`内に`&lt;`204,798個を持つ819,199bytesの正常HTMLを準備する。
2. trusted `x` を追加して819,200bytesへ進め、模擬save ackを完了する。変更1/undo1、backupはnull。
3. trusted「見出し」を選ぶ。p→h2は2bytes増えるため、候補は正しく全拒否される。
4. modelはparagraphのまま、HTML/ack/undo1/変更1も同じだが、backupだけnullから保存済みHTMLと同じ値へ再作成される。noticeは「直前の本文・退避・undoを保持」と案内する。

原因は共通command handler末尾の無条件 `update()` と、`docChanges > 0` によるbackup書込み。検査がrejectでもcommand wrapperはupdateし、累積変更回数を未保存判定に使う。この動きは、直接pasteからの拒否を通るgv1-ack対には現れない。

実測はlocalStorageキーの再作成まで。gateの本体reload復元UIは未接続であり、余分な復元ダイアログを実際に見たとはしない。最新入力の欠落・ack内容の変更・モデル受理はないため、元GV1とseverityを分ける。未反映操作でack済みbackup状態を変えないことが期待。採用する修正範囲・本体接続条件への分離はManagerへ判断を返した。

## 元GV2と正常対

20:01:35.680 JST、新tempへ複製した `gv2-revision.cjs` で元の通常pのtrusted見出し変更を再演した。保存HTMLは次のとおりで、3属性が保持されloss0は正当。

```html
<h2 class="tone" style="color:blue" data-k="keep">通常段落</h2>
<aside data-keep="yes">未知内容</aside>
```

親のtone/style/data-k流入0、実safe previewはrgb(0,0,255)。undoで元raw完全一致。コード→段落→list→解除、複数pのA/redとB/blueを別originで保持し、先頭属性を他blockへ流用しない。追加独立pureでは既存`pre/code`のclass/data-codeと隣paragraphの別属性を同時code化しても混線しないことを確認した。

per-node transform callbackによるorigin継承は、元GV2を保持によって解消している。動的損失分類全体が実装されたのではない。全属性の任意tag互換、任意操作後の全markup差分類は本体の残条件であり、明示編集/opaque削除を損失に数えて回避していない。

## 狭い共有回帰と適用根拠

| 独立実時刻 JST / 群 | 結果 |
| --- | --- |
| 20:02:31.747 / normal | 同hostの31変更、通常schema/table/mark/list/code/link/alt、opaque3個・stylesheet/属性保持。親CSS空/属性0、frame1/sandbox単独、PNG91/MP4 ready4 |
| 20:02:34.435 / opaque | 境界初回選択、明示削除undo/redo、sup/aside表示、取消raw完全復帰。Worker2作成2解放 |
| 20:02:37.553 / controls | 合成composition取消/Escape・終了後通常入力、既知mixedplain一回undo、HTML-only/file/drop拒否、一時遅いack/失敗後最新退避。390px/scroll390、親CSS空/PNG91 |
| 20:02:38.439 / small-inputs | 実CR/CRLF/preLF/emojiを含むcodeのtrusted入力、未編集隣保持、実改行の既知合成clipboard LF化/escape、一回undo、block境界選択→削除→undo |

旧のprepare Worker実deadline/世代、攻撃fixtureの実sanitizer隔離、選択preview逆順、両style、span対は前回独立成功と実装者の修正候補回帰を保持。今回の受理順変更に対して上記同host編集・取消・raw・媒体を再確認し、無変更の全8群をもう一度そっくり実行したとはしない。現在認可/C1/DB/codec/全容量試験は対象外で未再実行。

| 対象 | 判定 |
| --- | --- |
| G06 / GV2 | 元不良解消・合格。属性保持で解決、一般的な動的loss分類完成ではない |
| G08 / GV1 | 元の最新本文欠落は解消・合格。拒否された入力は未反映と明示、受理後入力は完全回収 |
| G10 / GV1 | 受理前の完全HTML/append/sidecar検査とDOM整合は合格。同期処理・履歴量の未測定限界は維持 |
| G11 / GV1 | 元不良は解消。paste拒否のack/backup維持は合格。toolbar拒否のR1は限定不合格で判断待ち |
| 他のG群 | 前回の代表合格を保持し、変更影響の正常4群を独立再実行。新規table作成/実OS入力等の未確認は維持 |

## 未接続・未測定・操作上の注意

同期serializeとPM transactionのUI占有/外部取消、packのdoc/保存部分木JSON重複、history depth100のgroup/overflow20、step JSON累積8MiBによるundo拒否の可能性は今回解消していない。負荷実測の成功へ読み替えない。本体へ同じ8MiB門やMap/test facadeを無検証copyしない。新journal/IndexedDB/全async方式・OS hardheap保証は今回の追加要件にしていない。

新規table作成UI、警告全入口/抑止reset、C1 UoW/20版/prelossy/actor/pin、現在媒体認可/Range/codec/quota、C2 settle/V5、本体reload復元は未接続。模擬timer ackや固定媒体200は本体成功ではない。実IME/nativepaste/OSdropは未確認を維持し、合成compositionとtrusted日本語を別根拠にする。OS設定/入力サービス/未知clipboard/他browserは操作していない。

最初のbrowser open後、検査開始前に専用sessionがabout:blankへ戻っており、元再演とack helperがgate未定義で入力前に停止した。既存execを回収し、同sessionを一度開き直してURLとgate準備完了を確認してから成功runを実行した。失敗時に本体データやgate入力を変更したとはしない。context復帰のOS/process原因は調査せず、他processを列挙/終了していない。

## 画像・資材・正式引継ぎ

自己 `heading-preview.png` と `mobile.png` をVerifier自身で表示して確認した。前者は青い見出しと隣の未知内容、後者は390pxのcode/media・opaque labelと折返す操作列・iframe本文を確認した。描画URLと保存URLの分離はコード/DOMの別証拠。OS入力や写真外の動画再生を画像確認と称しない。

新独立資材 `/tmp/hollow-c3-recheck.15q6OZ` は13files、20:04:24.219 JSTの相対pathsort+NUL+bytes+NUL aggregate **`b4a0d5406e8d1a01cb5906df6121dda21efa3ebe760da017711f048cf1f5f60c`**。`manifest.mjs` で一覧を再現する。元の旧16資材、候補43files、旧gate34filesは不変。

- 元操作の修正期待 `original-replay.cjs`: `59cc8640c477d31828847c9cc622263f704948cf54bd643decd9f21b4bb75ecf`
- R1 `toolbar-ack.cjs`: `99217ee12165f7ef31a7297a06bef2a519d7ac65372a88dbec11927e91664826`
- 独立pure `independent-transaction.test.ts`: `e313086102296436039769f67f69ef70468f7b14969086cd4ec4a8e528f51187`

候補helperの複製はbrowser sessionと写真保存先だけ自己tempへ変更し、元出力を上書きしない。元GV1の新期待helperと追加小対は独立作成した。cleanupは自己専用sessionだけ。

自己browser `hollow-c3-independent-recheck` はclose成功を回収済み。一時listener PID96720/session88450は20:03:46 JSTまでにSIGTERM→exit0。browser closeのexec回収を含め20:04:24 JSTまでに全自己helper/exec終了。error listener等はfinallyまたは専用page終了で解放し、残るlistener/hookなし。

main/temp/HEAD/lock終了照合後は本書作成だけ。production **session68259/PID62968/Node22.22.3/http://localhost:3000**、DB `/tmp/hollow-p2b.dAfzgS/app.db`、storage `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox` と全backupは無操作。429notes/45assets/589revisions/pending0は受領値で再集計していない。本体停止・疎通・build・API・DB操作なし。正式報告後は全操作を停止してManagerへ環境所有を返す。
