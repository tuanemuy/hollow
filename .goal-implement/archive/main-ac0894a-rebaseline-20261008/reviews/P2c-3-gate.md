# P2c-3-G 独立方式検証

## 結論

2026-09-06 / Asia/Tokyo。19:27:29 JST開始、19:36:40 JST終了hash確認。P2c-3-Gは局所修正待ちで不合格。通常schema編集とopaque保持を同じhostで成立させる代表経路、親DOM隔離、準備Worker取消は確認できたが、C3-GV1の最新本文回収不良とC3-GV2の付随属性損失の分類不足を直すまで方式を全面採用しない。ProseMirror方式全体が不可能という結論ではない。

元ED-04/05/08/01/06、design C3、`phases/P2c-3-contract.md` 全文と保存失敗/reload補足、`phases/P2c-3-gate.md` 全文、独立 `P2c-3-gate-prep.md` の11群を照合した。独立レビュー・manual-testの実操作/証拠分類とmarkdown-styleを適用。spec/spec-implement、goal API、Issue、製品/候補修正、追加agentは使用しない。cleanupは他作業を保護し、自分のsessionとlistenerだけを対象にした。

## 固定対象と実行

| 対象 | 開始・終了の独立照合 |
| --- | --- |
| main | 19:28:01.252 / 19:36:40.163 JST。559files、`12963eec15b2d807866bfe8f7aae7da6a49a6457a1ecf7ff650480f5df83cfd1`、HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、lock `ab5726f19ce660ffdc599821edbb1f115cb114fae8987dcfbab33d8d9190e68f` 全一致 |
| 固定gate | `/tmp/hollow-wys-gate.QDkT7R`。19:28:01.033 / 19:36:39.530 JST。node_modules以外の全regular34files、`5e7f8ca7462e4f60f3ee39613293b0058c9b2ab2d194719264d029fd625fe89c` 全一致 |
| 主要gate files | converter `b24e5ec4bfdeff4453e5152f555fbfbfccafb0d51fd9255def7c08df0290fa55`、host.ts `b537505bcfa633f6ac5fd86e188bafa37aca7f655273a85e5488b196d3e38521`、host.js `ffa1e362ce7144b7bd841c76ca43531f48364425b5656c7a7e561049d3fc4fd2`、temp lock `3c3dc4b0355eac7dac8163a332e32e85f7b8535f5aa3e650e188065f44ec945a` |

mainはdedup/sorted git tracked+untracked実files、`.goal-implement/`除外のpath+NUL+bytes+NUL。gateは相対path順の同形式。hash CLIだけNode24.19.0。純粋tests、追加tests、browser helpers、一時serverはNode22.22.3。tsgoは既存のnative実行体でnoEmit。

固定gateの30純粋testsを独立再実行し30/30成功、164.374ms。strict対象7TS filesも独立exit0。server.tsはこのstrict対象ではない。固定bundleをそのまま起動し、再build/format/installは行わない。bundle作成成功自体は実装者根拠を借用し、hash一致の配布物を実際に使用した。

```sh
# cwd: /tmp/hollow-wys-gate.QDkT7R
node --experimental-strip-types --test --test-reporter=spec converter.test.ts backup.test.ts
/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.bin/tsgo -p tsconfig.json
node server.mjs
```

一時serverはPID85435/session78168、`http://127.0.0.1:54324`。自己browserは `hollow-c3-independent --restore`。元helperを新temp `/tmp/hollow-c3-verify.GKg3WX` へ複製し、browser.cjsのsessionとcontrols.cjsの画像保存先だけ差し替えた。元写真への書込みは実行前に除外し、元34files不変を確認した。

実行中の主なコード確認はconverter全文、host全文、backup全文、prepare-worker、server、tests、各browser helper、README/tsconfig。依存はtempの直接11packagesのpackage.jsonを読み、exact版一致、MIT、import/require exports、engines未宣言を独立確認した。未宣言を互換保証とはせずNode22の実行根拠と分ける。製品lock/node_modulesへ導入しない。

## 必須修正

### C3-GV1: 上限超過した編集をモデルへ反映後、回収HTMLが古いままになる

対象G08/G10/G11、ED-01/04/08。19:32:39.244〜19:32:39.661 JSTに実hostで確認。資材 `edit-limit.cjs`。本体ではなく固定gateへの既知合成plain ClipboardEventとtrusted追加入力である。

1. 小さな通常pを開く。既知plain文字列 `<` を170,000文字挿入する。HTMLは680,007bytes、モデル/表示/backup/downloadが一致する。
2. 続けて40,000文字挿入する。モデルは210,000文字へ更新済みだが、serializerの800KiBチェックが例外になる。正しく再合成すれば840,007bytesになる入力であり、切詰めて保存してよいとは要求しない。
3. raw HTML、download、backupはすべて680,007bytesの旧本文。noticeは前の「plain text のみを挿入しました。」のままで、上限の案内なし。`Uncaught Error: 再合成HTMLは800KiB超です。切り詰めません。` を採取した。
4. trusted入力「最新z」でモデルは210,003文字へ進み、末尾は最新zを含むが、回収3経路は旧本文のまま。例外が増加する。
5. undoすると170,000文字へ戻れる。最新モデルが直ちに永久消失したとは表現しない。ただし、受理表示された超過入力と後続入力を提供中のHTML/download/backupから回収できない。

原因はhostの `dispatchTransaction` が `view.updateState` 後に `update()` を呼び、`latest = serialize(...)` の失敗境界を持たないこと。表示モデルだけ進み、raw/退避更新と理由表示に到達しない。converter単独の超過throw成功を、hostの安全な拒否成功として扱えない。

期待は、反映前の拒否と理由表示で直前のモデル/本文を維持するか、超過した最新入力を明示的に回収できる状態を保持すること。最新の入力を古いHTMLで代替したままにしない。具体方式はImplementerへ返す。これは低速端末・heap等の未測定性能ではなく、既存上限を跨ぐ正常入力経路の保持不良である。

### C3-GV2: 見出し変更に付随する属性消失が損失分類に現れない

対象G06、ED-04。19:34:11.344 JST、独立 `heading-loss.cjs` の実trusted「見出し」で確認。前段の独立pureでも同じ出力を観測した。

```html
<!-- 変換前 -->
<p class="tone" style="color:blue" data-k="keep">通常段落</p>
<aside data-keep="yes">未知内容</aside>
<!-- 見出し操作後 -->
<h2>通常段落</h2>
<aside data-keep="yes">未知内容</aside>
```

class/style/data-kの3属性が消え、planはlossCount0、losses空のまま。noticeもtrusted hostの固定説明で、付随損失を示さない。asideは保持され、undoで元raw完全一致へ戻る。

利用者が指定したp→h2というtag変更自体は不具合ではない。付随する属性・装飾の消失を、契約の「対応nodeの属性を消す必要があるときは損失項目」「安全canonicalと再合成結果の差分」で区別できていない。toolbarのsetBlockTypeはoriginを引き継がず、serializerは元属性を得られない。一方lossはprepare時の一部構造候補だけで、操作後の付随差を再分類しない。

期待は、保持可能な付随属性を保持するか、消失を正確に分類し案内すること。全属性・全CSSの恒久保持やcomputed同値は要求しない。明示opaque削除や本文変更そのものを一律に「変換損失」と計上しても解決にならない。

## 独立成功と11群の判定

実装者の8群helperを新sessionで独立再実行し全成功。元assertが検証する範囲をコードで確認した。正常操作にはtrusted pointer/keyboard/typingを使用するが、link/alt/opaque/tableの一部選択はtest facadeで設定する。全選択をpointerだけで行ったとはしない。composition/ClipboardEvent/dropは合成である。

| JST / helper | 独立観測 |
| --- | --- |
| 19:29:30.940 / normal | 同一モデルで見出し/リスト/mark/コード/リンク変更解除/alt/セル入力/行列追加削除。31本文変更、opaque3個と元属性保持。親source属性0、親CSS空、frame1/sandbox単独、PNG91/MP4 ready4 |
| 19:30:08.189 / opaque | 境界初回キーは選択だけ、明示削除→undo/redo、sup/aside preview、周囲typing後の保持、取消で元raw。Worker2作成2解放 |
| 19:31:04.651 / controls | 合成composition中の取消/Escapeでhost保持、終了後trusted日本語。mixedplain一回undo、HTML-only/file/drop拒否、一時ack/失敗後の最新退避。390px/scroll390/PNG91 |
| 19:31:48.596 / resources | A→B、取消、旧failure、入力による失効、800KiB+1 prepare拒否と小入力復帰。実Worker deadline2008.2ms、11作成11解放。これはGV1の編集後serializeとは別の成功 |
| 19:32:11.792 / safety | 親marker0、CSS流入0、frame危険要素0、未知複雑表は局所opaqueで隣正常table編集可。実sanitizerのscript/SVG/event/危険URL除去、未許可媒体拒否、`/unexpected`要求0 |
| 19:32:14.206 / raw | CRLF/entity/quote/preの無編集・title・取消raw完全一致、他段落編集時の未編集部分原文保持、空→日本語→一時ack→再入力でgeneration不変 |
| 19:32:18.203 / preview | sup旧success/failure→aside新preview→旧解放でも新frame/notice保持。frame1、default margin24/original8、PNG91/MP4 ready4、生成inert markerを保存へ混入しない |
| 19:32:19.667 / table-span | 実hostのrowspan2/colspan2、split→undo元raw、セルtyping後のspan・再表示保持 |

追加独立pureは3正常対と1観測対。反復opaqueとnested markをpack/unpack後に周囲編集、CR/CRLF/preLF・UTF16未編集隣保持、複数tbody属性のセル編集を成功確認した。4番目はGV2を観測するtestであり、test runnerが4成功でも安全成功4件とは数えない。tempのmodule type未宣言警告は独立資材の構成によるもので製品障害ではない。

19:35:20.604 JSTの追加 `small-inputs.cjs` は、CR/CRLF/preLF/emojiを含むcodeの実typingと未編集隣保持、実際のCRLF/CR文字を持つ既知合成mixed clipboardのLF化とescaped markup・一回undo、block境界初回選択→二回目削除→undoを成功確認した。既存controlsのclipboard文字列ではescape表記が実改行と異なるため、この小対を別に加えた。OS clipboardには触れない。

| prep群 | 判定 | 適用範囲 |
| --- | --- | --- |
| G01 基本schema | 代表合格 | 同hostの通常編集と保持。新規表作成UIはgateになくC3本体必須として残す。全schema基本UI完成ではない |
| G02 表 | 代表合格 | 通常/結合セル、行列操作、複数section保持。caption等局所opaqueの範囲は製品恒久非対応にしない |
| G03 未知inline/block | 合格 | 周囲typing、初回境界選択、明示削除undo/redo、順序・属性保持 |
| G04 最小opaque | 代表合格 | namespace/不適合表の局所保持と隣の編集。全HTML5対応保証なし |
| G05 code/link/media | 代表合格 | escaped code、inert親link、alt、固定媒体と保存URL分離。本体upload/認可未接続 |
| G06 raw/損失 | 不合格 | raw無変更/title/取消は合格。GV2の付随損失分類が不足 |
| G07 隔離 | 代表合格 | 親流入0、単一完成frame、危険要素除去と要求0。inlineSVGのconverter原文保持を実sanitizer受理へ読み替えない |
| G08 入力/ack | 不合格 | 通常日本語/UTF16/CRLF/空/一時ackは合格。GV1の超過入力保持は不合格 |
| G09 composition/paste | 合成制御代表合格 | 合成guardとtrusted通常入力の範囲。実OS3種は未確認 |
| G10 resource | 不合格 | prepare実terminate/世代は合格。GV1の反映順が不合格。未測定同期処理/heapは別の本体残条件 |
| G11 codec/回収 | 不合格 | 旧backup/optionalorigin純粋codecと通常失敗保持は合格。GV1で最新回収が崩れる |

## 方式の限界と本体接続条件

明示converterは許可schemaのtoDOMだけを親へ出し、source class/style/data/URL・保存opaqueはsidecarへ分離する。serializerで元部分木を再合成し、表示は実sanitizer/render/frameへ送る境界は妥当。危険rawのbytes保持テストは保存許可を意味しない。実入力は安全canonicalから準備し、保存でも従来どおり再安全化する必要がある。

pack/unpackのPM JSON/Mapやtest facadeは本体portではない。unpackはdoc.checkを行うが、Worker入力/応答・sidecar全項目のtransport検査や信頼由来まで証明しない。session fragment IDやfixed originを認可・真正性に使わない。本体へ無検証copyできないという実装報告の限界は正しい。

prepareの2秒は専用Workerを実terminateする。一方serializerとPM transactionは同期で、協調時間チェックはUIを外から取消する保証ではない。packはdocと各保存部分木のJSONを重複して運ぶため、深い木の転送/保持量を単純なsource bytesと同一視しない。本体のUI占有・admission・取消・転送量は測定/設計条件として残す。新しいOS hardheap保証を追加しない。

history depth100はgrouped eventであり正確な100操作物理上限ではない。累積step JSON8MiBはinverse/maps/append transaction/sidecar/heap量を数えず、undo transaction自体も拒否対象になり得る。上限到達の全負荷は今回実測しておらず、これを別の実不具合件数に数えない。ただし本体にそのまま移植せず、回復操作と保持量の契約を確定する必要がある。loss100件＋総数や1000cell/depth16の候補値も採用済みとはしない。

依存のexact版とNode22代表は独立確認済みだが、SSR/client split・本体lock/build/start・初期bundle予算は後続。本体保存/現在認可/C1 UoW/20版/prelossy/actor/履歴pin/GC/警告全入口・抑止reset/C2 settle/V5/reload復元も未接続。PNG/MP4の固定GET200/寸法/readinessはcurrent/history/HEAD/Range/codec/upload/quotaの合格ではない。

optional origin codecは不正hintだけを落とし本文を保持、new-without-baselineをID付与で置換せず、4key downloadを維持する純粋根拠まで。実server同note/保持版再照合、保存直後origin残存、prune/失効時のHTML回復、new/stable両keyの実復元は本体接続gateへ残す。模擬ackはtimerであり本体の保存成功ではない。

実IME候補確定/取消、nativepaste、OSfiledropは未確認を維持。合成composition/trusted日本語/file/drop fixtureをその証明にしない。OS設定・入力サービス・未知clipboard・他browserは操作していない。

## 画像・資材・環境引継ぎ

Verifier自身で自己 `mobile.png` と `desktop.png` を表示して確認した。mobileは390pxでcode/固定media・opaque label、折返す操作列、iframe本文が収まる。desktopはundo後の通常pとopaque label、隔離previewの青い本文と未知内容を確認した。完成製品UIではない。PNG幅/MP4 readiness等はDOMの別証拠であり、写真に写っていない媒体再生を画像確認と称しない。

自己16資材は `/tmp/hollow-c3-verify.GKg3WX` に保持。19:36:39.056 JST、相対pathsort+NUL+bytes+NUL aggregate **`5bb58c87d1a5af50f05f109c744e44ced77f3b5c2cec97ba8681bf27b68cbaed`**。一覧は同dirの `manifest.mjs` で再現できる。

- GV1 `edit-limit.cjs`: `5833fc9d698f2fafacf53f6ed2b1359bb4077a55b541a8e3f1af8119cc36585c`
- GV2 `heading-loss.cjs`: `679fdc6c526c55aa3a5864ad5f893a577dd4960fcf7accd3cc915ee5d08e12e8`
- 追加pure `independent.test.ts`: `2709afeee1a59e41ab0e921b7528a9a9c8eb9734f54df5937805977311e2ebb1`
- 追加通常入力 `small-inputs.cjs`: `0be20319cdcca7da6ad62cec21fac9c1006aff6e5462c945a94fdd60046e423b`

19:36:07 JSTまでに自己browser `hollow-c3-independent` をclose、自己listener PID85435/session78168をSIGTERM→exit0で回収。全自己helper/exec終了、fetch/Worker/error listenerはfinallyまたは専用page終了で解放した。新しい未回収session、残存listener、他browserへのcleanupなし。元候補/写真/lock/build/旧資材は全て不変で残す。

本体production **session68259/PID62968/Node22.22.3/http://localhost:3000** は停止・再起動・疎通・操作していない。429notes/45assets/589revisions/pending0は受領値であり、gateで再集計した数ではない。main/temp終了hash確認後は本書作成だけを行い、正式報告後は全操作を停止して環境所有をManagerへ返す。
