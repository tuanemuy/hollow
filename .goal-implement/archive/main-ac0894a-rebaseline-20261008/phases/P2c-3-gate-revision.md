# P2c-3-G 局所修正候補

## 結果

2026-09-06 / Asia/Tokyo。19:42:11 JSTに正式レビュー全文を確認し、19:53:05 JSTに候補・旧資材・本体の固定照合を終えた。GV1/GV2は新しい一時候補で修正し、34純粋試験、strict 9 TS files、最終bundleでの元再現と関連11群が成功した。独立再確認前の自己検証候補であり、方式採用・C3本体完了ではない。

修正場所は `/tmp/hollow-wys-revision.tZxEzJ`。旧 `/tmp/hollow-wys-gate.QDkT7R` と独立 `/tmp/hollow-c3-verify.GKg3WX` を固定保持した。補助は使わず、自己browser/listenerだけを操作した。本体source/deps/schema/DB/API/productionには触れていない。

## GV1: 候補stateと完全HTMLの受理前検査

新 `transaction.ts:prepareTransaction` は `state.applyTransaction` の候補stateと全appended transactionを得て、本文変更があれば同じ明示converterで完全HTMLを再合成する。schema/DOM/深さ/800KiB/opaque sidecarの検査に成功するまで、hostのstate、latest/raw、backup、undo、変更カウンターを進めない。

hostは候補の例外を入力境界で受け、理由を表示する。DOM-first入力で表示が先行した場合も、未受理の現在stateを `view.updateState(view.state)` で再描画する。新stateを一度受理した後のrollbackではない。既知の超過transaction全体を反映せず、直前の一致状態を維持する方式を採った。40000文字の一部だけを切り詰めて挿入しない。

成功時は検査済みHTMLを `update(html)` へ渡し、state受理後に同じserializeを再実行しない。貼り付けhandlerの成功noticeは拒否理由を上書きしない。拒否後の正常本文入力では「拒否した操作は未反映、今回の入力は反映」と操作を区別する案内へ更新する。模擬ackの所有や保存処理は変更していない。

純粋追加対は次の4件。既存30件は無変更で再実行した。

- 800KiB超の候補拒否、元doc/history不変、小入力とundo正常。
- rootだけでなくappended transactionの巨大出力も受理前拒否。
- opaque sidecar欠落時に部分HTMLを発行しない。
- 複数blockのorigin保持、heading/paragraph/code/list変更、undo原文復帰。

### 元GV1の最終実host結果

`gv1-revision.cjs` は独立元操作を基に、期待を「旧値の観測」から「完全拒否と復帰」へ変えた。19:50:33.824 JST、最終bundleで成功した。

| 操作 | model / DOM | HTML / download / backup | 他の観測 |
| --- | --- | --- | --- |
| 既知plain `<` 170000文字 | 170000 / 170000 | 全て680007bytes、内容一致 | undo1、uncaught0 |
| 40000文字追記 | 170000 / 170000のまま | 全て直前680007bytesのまま | 明示800KiB拒否、undo1、uncaught0 |
| trusted `最新z` | 170003 / 170003 | 3回収経路とrawが最新内容に一致 | 正常反映notice、undo/redo可能 |
| DOMを先に40000文字増やす合成input | 170003 / 170003へ一致 | 最新zを含む直前値に一致 | 拒否理由、uncaught0 |
| 合成composition開始→trusted `日`→終了 | 170004 / 170004 | 全回収経路が最新内容に一致 | 正常反映、uncaught0 |

ASCIIだけの680007はUTF-8 bytesと文字列長が一致する。日本語追記後のhelper出力680010/680011はUTF-16文字列長であり、bytesとは表示していない。

DOM-first対はTextノード変更と合成InputEvent/MutationObserverによる経路確認であり、実OS IMEの拒否保証ではない。通常trusted入力は別に確認した。実IME/nativepaste/OSdropの未確認は維持する。

`gv1-ack.cjs` は19:52:36.078 JST成功。模擬saveを完了させた680007bytesの本文へ超過pasteを試み、HTML/ack/backup(null)/undo0がすべて直前と同じことを確認した。模擬ackを本体保存成功と読み替えない。

## GV2: ブロック種別変更の付随属性保持

PM commandの `setBlockType` に一つのattrsを渡す旧toolbar経路を、型付き `preserveBlockType` へ置き換えた。適用可否は既存commandで確認し、transformのper-node attrs callbackで各nodeのoriginを引き継ぐ。heading levelは明示操作の値を使い、code_blockのcodeOriginも当該nodeから引き継ぐ。

保存用class/style/data等はそのoriginのsidecarから既存serializerが取得する。親DOMへコピーしない。複数blockを選んでも先頭blockの属性を全blockへ流用しない。list wrap/liftは既存PM commandのままで、内側paragraphのorigin保持を確認した。converter/schema/安全化の実装は変更していない。

19:50:35.948 JST、`gv2-revision.cjs` が元再現と正常対に成功した。

```html
<h2 class="tone" style="color:blue" data-k="keep">通常段落</h2>
<aside data-keep="yes">未知内容</aside>
```

見出しへのtag変更は利用者の明示操作である。付随する3属性は失われていないため、この対のlossCount0は正当となった。すべての明示文字変更やopaque削除を損失に数えて回避していない。実sanitizer/frame previewの見出し色は `rgb(0, 0, 255)`、親のtone/style/data-k属性は0だった。`heading-preview.png` を自身で表示し、青い見出しと隣の未知内容を確認した。

コード→段落→箇条書き→リスト解除でも対象のclass/style/data-kが保存HTMLに残った。複数paragraphのA/redとB/blueはそれぞれ別originで保持され、undoで元rawに完全復帰した。任意属性の全tag互換、任意markup変更後の全損失分類まで完成したとは主張しない。

## 最終試験と再現

Node **22.22.3**、既存agent-browser **0.36.0**、Chrome **152.0.0.0**、自己session `hollow-c3-revision --restore`。一時serverは127.0.0.1:56484、PID92266/session93048。依存の追加・更新はなく、旧exact11packagesとlockを新tempへコピーした。

```sh
# cwd: /tmp/hollow-wys-revision.tZxEzJ
/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.bin/biome format --write host.ts transaction.ts transaction.test.ts tsconfig.json
/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.bin/tsgo -p tsconfig.json
node --experimental-strip-types --test --test-reporter=spec converter.test.ts backup.test.ts transaction.test.ts
node build.mjs
node server.mjs
```

最終34件は全成功、889.372ms。strict対象は既存7ファイルとtransaction実装/試験の9ファイル。server.tsはstrict対象外で、esbuildとNode実起動の成功を別根拠とする。本体のtypecheck/test/buildは実行していない。

最終source/bundleのブラウザ再現は19:50:33〜19:50:59 JSTに連続成功した。GV1/GV2の2群、既存normal/opaque/controls/resources/safety/raw/preview/table-spanの8群、独立由来small-inputsの1群を含む。模擬ack保持の追加1群は19:52:36 JSTに同bundleで実施した。

- 既存8群: 同モデル通常編集、opaque3個と属性/stylesheet保持、明示削除undo、mixedplain/合成composition/一時save、Worker逆順/失敗/取消、実sanitizer隔離、raw CRLF保持、両style/媒体、span整合を再確認。
- Worker実deadlineは2005.1ms、11作成/11解放。serializer/PM処理の性能保証とは分ける。
- small-inputs: 実CR/CRLF/preLF/emojiのcode入力、未編集隣raw、既知mixedclipboardのLF化/escape、一回undo、block境界選択→削除→undo。
- 390pxではscrollWidth390、PNG naturalWidth91。両styleでframe1/sandbox単独、MP4 readyState4。`mobile.png` を自身で再確認した。
- 親CSS/任意属性0、危険frame要素0、unexpected request0。converterだけのinlineSVG保持と実sanitizer除去の区別は維持した。

一部selectionはgate facadeで設定し、その後toolbar/typingをtrusted操作した。合成clipboardは既知文字列だけを使い、未知OS clipboardは読んでいない。

### 試験途中の失敗の扱い

初回GV1 helperは、正常な小追記が500ms以内のPM history groupへ結合されたのに別undo eventを期待して失敗した。操作間に600msを置いて独立groupを確定し、undo/redoを再確認した。製品側history groupingを変更していない。

模擬ack helperの初回はCLIのtop-level await構文、次は巨大HTML2本を結果へ返した際の子process stdout ENOBUFSで失敗した。比較を同じ専用page内で行い、外へは一致boolean/長さだけを返すよう試験資材を修正した。専用sessionを一度openして最終対を成功させた。これらをGV1製品失敗や性能合格へ読み替えない。未回収execはない。

旧独立 `edit-limit.cjs` / `heading-loss.cjs` は参照用に新tempへコピーしたが、旧の観測assertを修正成功には数えない。修正期待は `gv1-revision.cjs` / `gv2-revision.cjs` に分離した。新コピーの写真出力先だけは自己tempへ変え、元独立資材は不変のまま保持した。

## 変更範囲と残条件

意味のある変更はhostの受理順・拒否notice・toolbar接続と新transaction helper。build/serverのrootは新tempの `import.meta.dirname` へ変更し、browser session/写真pathを専用候補へ分離した。追加pure/ブラウザ資材、README、bundle、写真を含む。converter.ts、backup codec、準備Worker、依存lockは旧候補と同一である。

同期serializer/PM transactionのUI占有、packの部分木重複、history depth/group/overflow20、累積step JSON8MiBがundoも拒否し得る未測定契約は今回解消していない。8MiB門を新heap保証として採用していない。新pending journal/IndexedDB/全面async保存をこの修正に持ち込まなかった。

新規table作成UI、警告全入口/抑止/reset、実C1共通保存・20版・prelossy・actor・pin、現在媒体認可/Range/codec/quota、C2 settle/V5、本体reload復元は未接続のまま。本体C3開始・依存採用は独立再確認とManager判断後に行う。

## 固定hash・停止・環境

19:53:04.893 JST、新tempのnode_modules以外の全regular **43 files**（source/tests/lock/bundle/写真/READMEを含む）を相対path順 `path + NUL + bytes + NUL` でSHA256化した。再現は `node fingerprint.mjs`。

- 新aggregate: `2a445ca8223317b876175999824e7623c26c76aaa4ae6c120f2ccff187ea7830`
- host.ts: `022ac012868dddff4bfb3aaaa44c2504ccab7fd2be64e356d3685a84637420ea`
- host.js: `eaf8d989bba349add375efbf6e89987c82a39140d92e84254d4f462e235de3bd`
- transaction.ts: `e45c8b2eab300200a7558c13a1fbbe9985ab18a4b842f4d94a67d4ff1dce4e55`
- transaction.test.ts: `4cc1905f49bbad69e9b44755517c53282d0e22f094f077fd3f0f8c14db657b3d`
- gv1-revision.cjs: `c1ddc6d229177c165398d8be1cc4c15a0e5eec5d320be9adebde929570a64a4f`
- gv1-ack.cjs: `e62f38d2eca3d9f02e3100b2518a7b6dbf8a11a6a7ab3f0aa560ba8ded9853cb`
- gv2-revision.cjs: `95fe21797faa4701eb52466f2fffd71880f5d2d3f82f07cf700d628bec134719`
- temp lock: `3c3dc4b0355eac7dac8163a332e32e85f7b8535f5aa3e650e188065f44ec945a`

host bundle339253bytes/gzip111428。serializer/controllerを別製品として採用した値ではなく、一時bundleの識別用である。写真のうちmobile/heading-previewは本revisionの実測、他のコピー済写真は旧gateの資材である。

同時刻に次を再照合し、全て受領hashと一致した。

| 固定対象 | 件数 / SHA256 |
| --- | --- |
| 旧gate | 34 / `5e7f8ca7462e4f60f3ee39613293b0058c9b2ab2d194719264d029fd625fe89c` |
| 独立元資材 | 16 / `5bb58c87d1a5af50f05f109c744e44ced77f3b5c2cec97ba8681bf27b68cbaed` |
| main tracked+untracked実files | 559 / `12963eec15b2d807866bfe8f7aae7da6a49a6457a1ecf7ff650480f5df83cfd1` |

main HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、lock `ab5726f19ce660ffdc599821edbb1f115cb114fae8987dcfbab33d8d9190e68f`。tracked23/untracked94 status entriesは既存状態を保持。`.goal-implement`は本体hashから除外する既存方式であり、本書だけを追加した。commitは行っていない。

19:53 JSTに自己browser `hollow-c3-revision` をcloseし、一時listener PID92266/session93048をSIGTERM→exit0で回収した。全自己test/helper/hooks/execは終了し、補助は使用していない。新旧資材は削除せず固定保持する。以後コード/browser操作を停止して独立再確認へ返す。

本体production session68259/PID62968/Node22.22.3、DB `/tmp/hollow-p2b.dAfzgS/app.db`、storage `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox` と全backupは無操作。429notes/45assets/589revisions/pending0は受領値であり、本revisionで再集計していない。
