# P2c-3-G WYS モデル方式 gate

## 結果と対象

2026-09-06 19:22:44 JST に一時コードと検証を固定した。ProseMirror の明示 schema、canonical converter、opaque inline/block、trusted 親 host の代表経路は成立した。30件の純粋試験、strict 型検査、最終 bundle の8ブラウザ観測群が成功した。これは方式の自己検証候補であり、独立合格・依存採用・C3 本体完了ではない。

ED-04/05/08、ED-01/06の共有編集条件と `P2c-3-contract.md` の保存復旧補足を対象とした。全体計画や本体コードは変更していない。doc-style / markdown-style に従い、実行結果と未接続を分けて記録した。

一時資材は `/tmp/hollow-wys-gate.QDkT7R`。補助担当は converter / fixture / backup codec の6ファイルだけを編集し、19:03頃に停止した。環境・ブラウザは Implementer だけが操作した。

## 実装した最小モデル

`converter.ts` は `prepare / serialize / pack / unpack` と schema を持つ。通常段落、見出し、引用、リスト、code、link mark、画像・動画 atom、通常表と結合セルを編集可能にした。未知 inline/block は内部採番した sidecar に元部分木を保持する。利用者の `data-*` を内部IDとして解釈しない。

無編集、titleのみ、selection、取消では `doc.eq(plan.doc)` により元 canonical bytes をそのまま返す。実本文変更時だけ、明示 serializer が schema と保存属性・部分木を再合成する。未変更部分木は元 source を使う。stylesheet も位置を持つ opaque block として保持する。DOM の `innerHTML` を保存正本に使わない。

親 editable DOM は trusted schema の tag、固定 label、span 数値だけを使う。任意 source の class/style/data属性、HTML、URLを親へ渡さない。link は inert な span、media と opaque は固定 label とした。実URL・属性・元部分木は保存用モデルだけに残る。新規linkの設定と解除、画像alt変更は明示操作で行う。

opaque 隣接の Backspace / Delete は最初に対象 node を選択する。選択済み対象の明示削除・undo/redoは許可する。通常typingで未知要素を平坦化しない。caption/colgroup等の未対応表は当該table、namespaceは該当部分木だけをopaqueにし、隣の通常段落・表は編集可能に保った。これらを製品の恒久非対応とは決定していない。

## 実安全化・表示と test-only 境界

一時 server は本体 `NodeHtmlSanitizer` と `frameDocument` を読み取り専用で bundle した。完成 srcdoc を単一 iframe に mount し、sandbox は `allow-same-origin` 単独のまま。script/object/frame/connect/form/base の既存閉鎖と inert link を使った。親の CSP も固定2媒体の正確なpathに限定した。

安全opaqueの具体例は `<sup data-opaque="user">未知上付き</sup>` と `<aside data-block="keep"><p>未知ブロック <em>内部保持</em></p></aside>`。周囲typing、選択preview、明示削除→undo後に内容・属性・順序を保持した。aside の実sanitizer後は removed / renderRemoved とも0で、斜体を含む本文を自身の画像確認でも読めた。

converter単独の SVG namespace 原文保持は安全化成功ではない。悪性fixtureの inline SVG / script / event属性 / javascript URL は実sanitizerが除去した。実frameの危険要素0、親へのsource属性・CSS・URL流入0、自己 `/unexpected` への要求0を観測した。既存sanitizerが除去するinline SVGまでWYSが保存表示できると主張しない。

PNG / MP4 は固定test-only endpointのGET200を使う。PNG naturalWidth91、MP4 readyState4を両styleで確認した。本体 current/history asset 認可、Range、grant、upload、codec検査、quotaは接続しておらず、この成功に含めない。DB・本体APIは使っていない。

## 最終実行根拠

Node **22.22.3**、agent-browser **0.36.0**、macOS上の **HeadlessChrome 152.0.0.0** を使用した。viewportは1280×800と390×844。独立した `hollow-c3-gate` sessionだけを使用した。

最終ソースのformat、strict 7 TS files、30 tests、bundleを直列実行し、全てexit0だった。server.tsはesbuildによるbundle/実起動の対象で、7ファイルのstrict対象には含まない。

```sh
# cwd: /tmp/hollow-wys-gate.QDkT7R
/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.bin/biome format --write host.ts server.ts prepare-worker.ts build.mjs tsconfig.json package.json
/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.bin/tsgo -p tsconfig.json
node --experimental-strip-types --test --test-reporter=spec converter.test.ts backup.test.ts
node build.mjs
```

30 tests は全件成功、最終run 167.664ms。normal/merged table、日本語CRLF、unknown、namespace、不正nest、危険入力の無変更bytes、opaque周囲typing/削除undo、row/column追加、属性保持、sidecar欠落拒否、資源超過拒否、pack、loss分類、退避codecを含む。gate資材だけを対象とし、本体unit/Nodeintegration/buildは実行していない。

最終 browser 用 bundle を読み直して、次の8群を **19:20:37〜19:20:54 JST** に連続実行した。

| 群 / 再現資材 | 最終観測 |
| --- | --- |
| normal.cjs | trusted日本語/emoji、見出し・リスト・code・link作成変更解除・画像alt・セル文字・行列追加削除。同モデルのopaque3個とclass/data/stylesheetを保持。本文変更31回。親CSS空・任意属性0、frame1、PNG91、MP4 ready4。 |
| opaque.cjs | 境界キーで選択のみ→明示削除→undo/redo。周囲入力と取消で元source復帰。2 workers作成/2解放。 |
| controls.cjs | 合成composition中の通常入力/取消拒否/Escape、終了後trusted日本語。既知 mixed HTML+plain はplainのみ一度挿入、markup非生成、一回undo。HTML-only/file/drop説明付き拒否。遅い一時save ack/失敗でも最新本文とbackup保持。390pxでscrollWidth390。 |
| resources.cjs | A→B逆順、取消、遅い旧失敗、入力による準備失効、2秒deadline、800KiB+1拒否と次の小入力復帰。意図的2500ms待ちに対する実deadline **2004.8ms**、11作成/11解放、最新入力・backup一致。 |
| safety.cjs | 親流入0、frame危険要素0、実sanitizer除去理由、正常隣表は編集可能、未知/複雑表は局所opaque、unexpected request0。 |
| raw.cjs | CRLF/entity/quote/preの無編集・title・取消はbytes一致。他段落編集後も未編集p/preのraw保持。空から日本語→一時ack→追記でhost generation維持。 |
| preview.cjs | 選択supの旧success/failureを保留→aside新preview→旧応答解放でも最新frame/notice維持。frame1。default margin24px/original8px、両styleの媒体表示。生成inert markerを保存HTMLへ混入しない。 |
| table-span.cjs | 実hostでrowspan2/colspan2、セル分割→undoで元source一致、セルtyping後もspan整合。 |

クリック・キー・通常typingはブラウザのtrusted操作を使った。link/alt/opaque/spanの一部選択位置はtest facadeで設定し、その後のtoolbar/typingをtrusted操作した。全選択をpointerのみで行ったとは主張しない。clipboardは既知の合成ClipboardEventだけで、OS clipboardは読まない。合成compositionイベントは `isTrusted:false` と記録した。実OS IME、native paste、OS file dropは未確認である。

画像 `desktop.png`、`mobile-top.png`、`mobile.png`、`opaque-preview.png` を19:21〜19:22 JSTに自身で確認した。toolbarの折返し、通常表、固定media/opaque label、390pxでの入力領域、実aside previewを確認した。製品の完成UIではなく方式hostの写真である。

## 資源・世代・損失

prepareは専用Workerへ送り、各要求に所有IDを付けた。置換・取消・timeoutでそのWorkerをterminateする。新入力は古い準備結果の採用を止め、最新モデルと退避を保持する。previewも最新世代だけがsrcdoc/noticeを変更する。古い要求のfailureで新hostを戻さない。

入力800KiB、DOM10000、深さ128の既存境界を維持した。切り詰めない。2秒prepare実deadlineは上記で確認した。serializerの2秒協調チェック、件数/深さ/UTF-8 bytes制限は存在するが、serializerとPM transactionは本gateでは同期処理である。本体接続ではUI占有・取消・admissionの境界を改めて検証する。

1000セル領域・編集nest16超は局所opaqueとして保持する候補であり、製品拒否条件の採用ではない。loss/notice表示は各100件までで総数を別保持する。構造編集に伴う要素間空白、list先頭段落補足、非整数start等を損失候補とし、opaque保持は欠落と区別する。validなol start=0/負整数を勝手に1へ変えない正常対も成功した。全HTML5 nesting・CSS cascade・pixel同値・実編集後の全bytes同一性は保証しない。

単発Node標本は通常191bytes prepare2.680ms、unknown362bytes0.214ms、1000cells/10024bytes11.476ms、text800KiB6.438ms。無変更serializeは順に0.159/0.008/1.720/0.329ms。これは別の純粋測定であり、上記の意図的Worker遅延と混同しない。低速端末やp95の保証ではない。

undoはPM history depth100と累積step JSON 8MiB拒否を一時hostへ置いた。削除/入力/undoの代表は成功したが、100操作/8MiBの全負荷を測っていない。PM history grouping/depthの挙動を含むため、正確な100イベント物理上限や8MiB heap上限の証明ではない。本体運用値は未採用のまま返す。

## 退避・originの成立と未接続

typed codecは最新title/html/modeと任意WYS contextを同JSONに保持する。contextはversion1、`wys-transformed`、未確認revision hintまたはnew-without-baseline。既に変換済みのbackupに現在版を元版として付け替えない。不正hintはhintだけ無効にし最新本文を捨てない。旧modeなし/new-only互換、ID移行後もnew origin維持、4key download（format/title/html/mode）を純粋試験で確認した。

一時hostのackはtimerで提出snapshotを返すだけであり、保存応答後の追加入力でhostをremountせず最新backupを残した。失敗後も最新HTMLとorigin contextを保持した。ブラウザlocalStorageは専用localhost origin内のtest keyであり、利用者namespace、本体reload復元、C2 settle/V5、現在認可、C1共通commitの成功ではない。

20版の保持集合とorigin残存判定は純粋codec境界だけを確認した。serverの同note保持revision再照合、prelossy作成/競合、20版pruneとpin、権限喪失時の復元拒否、警告全入口・抑止・設定reset、元に戻すUIは本体接続gateに残る。任意origin hintを真正性/認可に使わない。originが失われても最新HTML/download/明示HTML回復を残す既存契約は変更しない。

## 依存・再現・出所

一時packageへexact版を固定し、`npm install --ignore-scripts --no-audit --no-fund` で19 packagesを導入した。本体lock/node_modulesへ導入していない。再現手順はtemp README。package-lock integrityを保持している。

| package | exact version |
| --- | --- |
| prosemirror-model / state / view | 1.25.4 / 1.4.4 / 1.41.7 |
| prosemirror-transform / commands / keymap | 1.10.5 / 1.7.1 / 1.2.3 |
| prosemirror-history / schema-list / tables | 1.5.0 / 1.5.1 / 1.8.5 |
| htmlparser2 / dom-serializer | 10.0.0 / 2.0.0 |

全直接packageのpackage.jsonでMIT、import/require exports、engines未宣言を確認した。未宣言をNode互換保証とは扱わず、Node22での実import/tests/buildを根拠とした。view/tablesはCSS exportも持つ。SSRにhostをimportせずclient/workerを別entryにした。TanStack SSR/client splitの本体buildは未実施。

schemaの根拠は[model 1.25.4 source](https://raw.githubusercontent.com/ProseMirror/prosemirror-model/1.25.4/src/schema.ts)、span/table roleは[tables 1.8.5 source](https://raw.githubusercontent.com/ProseMirror/prosemirror-tables/v1.8.5/src/schema.ts)と[公式tables README](https://github.com/ProseMirror/prosemirror-tables)。公式guideは403で本文を取得できず、読了根拠に含めなかった。ライブラリ名だけをもって方式成立とはしていない。

bundleはhost338172bytes/gzip111094、prepare-worker237414/gzip82761、server679547/gzip175144。hostとworkerは一部依存を重複する一時構成であり、製品初期bundle予算の合格ではない。既存esbuild0.27.7/css-tree3.2.1を読み取り専用で使用した。

第三者fixtureは本体の既存固定ファイルを読み取り、再取得・改変していない。libpng v1.6.50の[PNG fixture](https://raw.githubusercontent.com/pnggroup/libpng/v1.6.50/pngtest.png)はPNG Reference Library license（既存 `../licenses/libpng-LICENSE` 保持）、MDN [flower.mp4](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4)はCC0-labelled fixture。出所は既存fixtures/MEDIA.mdに記録されている。

- PNG SHA256: `b7a468324556bf6924058acb0fb477320355da0d864728e614be83ffa6966148`
- MP4 SHA256: `0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451`

試験開始前の一時bundleでcreateRequire重複/css-tree動的JSON解決の起動失敗、初期親CSPによる媒体非表示を観測し、一時entry/external化と正確なasset path指定を修正した。最終代表試験では解消した。helperのJavaScript引用/top-level await誤りと、repo側Biome ignoreによるtemp format拒否は実行準備の失敗として修正し、最終runと混同していない。本体の不具合・回帰として計上しない。

## 固定識別・引継ぎ

一時資材の全regular files（node_modulesを除く。source/tests/fixtures/lock/build出力/写真/READMEを含む）を、相対path順に `path + NUL + bytes + NUL` でSHA256化した。再現は `node fingerprint.mjs`。

- 19:22:43.819 JST、34 files aggregate: `5e7f8ca7462e4f60f3ee39613293b0058c9b2ab2d194719264d029fd625fe89c`
- converter.ts: `b24e5ec4bfdeff4453e5152f555fbfbfccafb0d51fd9255def7c08df0290fa55`
- host.ts: `b537505bcfa633f6ac5fd86e188bafa37aca7f655273a85e5488b196d3e38521`
- host.js: `ffa1e362ce7144b7bd841c76ca43531f48364425b5656c7a7e561049d3fc4fd2`
- temp package-lock: `3c3dc4b0355eac7dac8163a332e32e85f7b8535f5aa3e650e188065f44ec945a`

本体開始18:46:13.706 JSTと終了19:22:44.026 JSTのfingerprintは一致した。tracked/untrackedを含む559 files、SHA `12963eec15b2d807866bfe8f7aae7da6a49a6457a1ecf7ff650480f5df83cfd1`。HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、本体lock `ab5726f19ce660ffdc599821edbb1f115cb114fae8987dcfbab33d8d9190e68f`。既存statusのtracked23/untracked94 entriesを保持し、変更をcommitしていない。`.goal-implement`はこの本体hash対象外である。

19:22 JSTに自己browser `hollow-c3-gate` をcloseし、一時listener PID77924/session51079をSIGTERM→exit0で回収した。旧自己listener PID77474も既にexit0。全browser hook/timerは専用page終了で解放し、全自己test/helper/補助は停止した。一時資材は削除せず固定して残した。

本体production session68259/PID62968/Node22.22.3は停止・再起動・操作していない。DB/storage/mailbox/全backup/旧fixtureは変更していない。429notes/45assets/589revisions/pending0は受領値であり、本gateで再集計した値ではない。DB照合や本体API疎通を実行したとは主張しない。

推奨はこの候補を独立gate確認へ渡し、採用後に型付き本体port、実保存/20版/警告/復旧を接続すること。Map/PM JSON/test facade/固定asset endpoint/裸timer保存を無検証で本体へcopyしない。C3本体実装は開始せず、Manager判断を待つ。
