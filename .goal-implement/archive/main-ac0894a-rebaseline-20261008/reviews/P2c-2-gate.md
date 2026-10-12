# P2c-2-G 独立方式レビュー

## 結論

P2c-2-G は局所修正後の再確認待ち。htmlparser2 正本＋parse5 の HTML5 投影＋親 trusted textarea という方式全体を否定する結果ではないが、現在の固定 gate をそのまま全面採用しない。

| 対象 | 判定 | 独立根拠と残条件 |
| --- | --- | --- |
| G1 Text 対応 | 不合格・局所修正待ち | 通常 table、反復、foster 合流、DOM 順逆の formatting 再構築、UTF-16/entity は成立。正常 CRLF と pre 先頭 LF で全体停止する VG-03 が残る |
| G2 親 trusted 入力 | 不合格・局所修正待ち | Text のみ更新、空→保存応答→同 ID 再入力、undo/redo、折返し/mobile、構造操作拒否は成立。composition 中 Escape の VG-01、HTML clipboard 全面拒否の VG-02 が残る。実 IME/native paste/OS file drop は未確認 |
| G3 隔離 | 代表 gate 合格 | 実 sanitizer/render/frameDocument、allow-same-origin 単独、子 script なし、親漏れ0、実 DOM の型/namespace/属性/Text/順序不一致で停止。全攻撃・全 browser の証明ではない |
| ED-02/03/05、G4/G5、本体接続 | 未検証 | 本体 C2 は未着手。C1 保存・履歴・認可・rollback・退避・mode・HTML highlight/診断を、この一時 gate の成功へ含めない |

Manager は 14:50 の追加報告に対し、VG-03 を正常入力の互換性不足として本体前の修正条件にし、G1 全面採用を保留した。VG-01/02 も修正を開始させず固定対象での報告を優先する指示を受領した。実装、仕様変更、Issue 起票は行っていない。

## 対象と実行環境

2026-09-06 JST。独立 clock 採録は 14:44:37、14:46:53、14:48:24、14:50:16、14:52:12、14:52:41。14:52:12 に browser/listener を終了し、14:52:41 に終了 hash と既知 PID の状態を確認。その後は本報告の作成・読取のみ。

入力は ED-02/03/05 原文、design C2 候補節、plan P2c-2-G、`phases/P2c-2-contract.md` と `phases/P2c-2-gate.md` 全文。固定 temp の `server.ts`、`client.js`、`index.html`、`exercise.cjs`、`matrix.cjs`、`reject.cjs`、`paste.cjs`、実 `htmlSanitizer.ts` と `editorMedia.ts` を確認した。

- 実行 server/test: Node 22.22.3、既存 pnpm/tsx。CLI orchestration と hash は Node 24.19.0 も使用し、本体 Node22 の実行保証と分けた。
- Chrome: `HeadlessChrome/152.0.0.0`、Macintosh user agent、agent-browser 0.36.0。自分 session は `hollow-c2-independent --restore`。desktop 1100×900、mobile viewport 390×844。
- 固定 gate: `/tmp/hollow-visual-gate.I6mUfi`。自分の派生・検査・画像: `/tmp/hollow-visual-independent.YYkdll`。生成は専用 mktemp と apply_patch。元 temp は変更しない。
- 最初の listener: 固定 server、127.0.0.1:56385、PID 86370 / session 83199。終了を回収してから、fixture だけ追加した派生 server を 127.0.0.1:56677、PID 88745 / session 38706 で起動した。同時 server は作らなかった。
- parse5 7.3.0 は既存 store の readonly import。install、lock 更新、main build/migration/test、DB 接続・集計はしない。

manual-test の実操作/報告手順、pr-review の契約と振る舞いの照合観点、markdown-style を使用した。Manager の限定委譲を優先し、追加 agent、PR checkout、修正、Issue、全 process 探索、global cleanup はしない。cleanup は自分 session と既知 listener のみに限定した。

## 独立実行と既存根拠

既存成功をそのまま独立成功へ移していない。次の3 harnessを全文読んだ上で、session 名を自分のものへ変更した派生コピーで実 Chrome に対して再実行し、すべて exit 0。`matrix.cjs` は画像の出力先だけも派生 temp へ変更した。元 assertion と gate source は不変。

```sh
pnpm --filter @repo/web exec tsx --tsconfig tsconfig.json /tmp/hollow-visual-gate.I6mUfi/server.ts
agent-browser --session hollow-c2-independent --restore open http://localhost:56385
pnpm exec node /tmp/hollow-visual-independent.YYkdll/exercise.cjs
pnpm exec node /tmp/hollow-visual-independent.YYkdll/matrix.cjs
pnpm exec node /tmp/hollow-visual-independent.YYkdll/reject.cjs
```

| 独立再実行 | 観測 |
| --- | --- |
| `exercise.cjs` | table の t6 を空にして保存応答に `emptyIds:[t6]`、同 ID へ再入力。undo は「再入」、redo は「再入力」。strong t2、inert link 内 t4、h1 t0、折返し p t7 は各1 Textだけ変化。canonicalShape/DOMShape true、trusted input7、composition0 |
| `matrix.cjs` 通常/HTML5 | 両 style ready、PNG load。foster ABC の B=t1だけβへ変更。合流 AAA の各位置が t0/t1/t3、中央を空→同 ID 再入力。adoption/pdiv は sanitizer が先に補正した canonical に対する成功。clone は canonical t0→t1 と DOM t1→t0 の違いを保持して outside=t1だけ変更 |
| `matrix.cjs` 入力/隔離 | `<b>plain</b>` と LF は escaped Text、Control+B 拒否。合成 composition 中 save/load/finish の3操作拒否、generation/overlay/focus保持。合成 HTML paste/file drop 拒否。親 sentinel unchanged、親色黒/子色green、子 script/frame/object/form/base/refresh/a 0、listener の `/leak` 0 |
| `matrix.cjs` mobile | 390×844 original で t7 を pointer 選択し trusted入力、DOMShape true。選択位置に4行の textarea、PNG・動画表示を画像で直接確認 |
| `reject.cjs` | trusted cross-Text drag選択→Delete と画像dragで値/構造不変、拒否案内あり。test-only 投影要素名不一致は ready=false / `安全停止: element mismatch` |

`matrix.cjs` の動画正常性 assertion は PNG と同程度の decoder 確認ではない。今回、自分が画像上で動画 fixture の描画を見たことと、Implementer の readyState4/960×540報告を区別する。codec、Range/seek、current/history認可は C1 までの既存受入根拠を保持するだけで、gate asset endpoint から再証明しない。

追加独立 harness は `independent.cjs` を CLI 補助にして `input.cjs`、`native-meta.cjs`、`unicode.cjs`、`guards.cjs`。終了 code0 は「観測完了」であり、意図的に記録した VG-01/02/03 を安全合格件数へ含めない。

`guards.cjs` は response の expected projection だけを自分 tab で改変し、型・namespace・属性・Text 値・子順序の5不一致を独立に作った。それぞれ node type / element / attribute / text / text mismatch、全て ready=false、overlay hidden=true。型一致だけで編集を許可しない正常な拒否根拠。最後の reload で wrapper を破棄した。

## Findings

### VG-01: composition 中 Escape で host と active を失い、終了時に例外

G2 / ED-02。固定 `client.js:35`、`:36`、`:39`。本体接続前に修正が必要な局所制御欠陥。親 textarea 方式そのものの不成立とはしない。

再現は `input.cjs`。通常 fixture の t6 を実 pointer で選択して親 textarea を focus。合成 `compositionstart` → 値「仮入力」 → 合成 `insertCompositionText` を送る。この2イベントは `isTrusted=false`。その状態で CLI から trusted Escape key を送ると `hidden=true`、active は未定義（内部は null）、rejections は空のまま。続く合成 `compositionend` で `Uncaught TypeError: Cannot read properties of null (reading 'id')` を error listener が観測した。値「仮入力」と DOM 構造はその時点で残っており、情報の完全消失とは報告しない。

期待は、composition 中に Escape を入力終了として扱って同一 host/対象 ID を破棄しないこと。OS の composition cancel/commit が完了した時点の Text と undo 単位を、元の対象 ID に安全に確定すること。現コードでは load/finish/undo は composing を検査するが、Escape 分岐だけは無条件に hide/active=null を行う。

正常対は再実行 matrix の save/load/finish の3操作拒否、generation/overlay/focus保持と compositionend 完了。追加再現は実 OS IME のイベント順・変換候補・再変換の証明ではない。ただし gate 自身が保持している composing 状態を bypass する経路であり、合成であることを理由に制御不足を合格にしない。

### VG-02: HTML clipboard の plain text まで全面拒否する

G2 / C2接続契約「HTML clipboard は markup を実行せず plain text として扱う」。固定 `client.js:40`。ED-02 の構造保持は満たす一方、採用入力契約に合致しない。

独立 `guards.cjs` で、既知の `text/html=<b>known fixture HTML</b>` と `text/plain=known fixture HTML` の両方を持つ合成 ClipboardEvent を、pointer選択済み t6 へ送った。`defaultPrevented=true`、`isTrusted=false`、値は「表のセル二」のまま、入力イベント0、案内は「HTML貼付は構造を追加できません。plain textを使用してください」。他Text/構造も不変。

期待は plain text 部分だけを選択 Text の入力として扱い、markup の要素・属性を一切生成しないこと。HTML が含まれるというだけで plain text まで拒否しない。入力契約を全面拒否へ変える判断はしていない。これは handler の閉じた分岐と合成イベントによる根拠であり、native clipboard の成功/失敗ではない。

### VG-03: 正常 CRLF と pre 先頭 LF を対応できず全文停止

G1 / ED-02。固定 `server.ts:50`〜`:66`。source 範囲内の canonical Text 値と HTML5 投影値の完全一致だけを要求するため、正規化された表示文字列を対応できない。安全停止は合格だが、正常本文を編集できるという機能要件は未達。本体前の小さい互換性修正が必要。

派生 `server.ts` は fixtures に次の3入力を追加しただけで、prepare/投影/client/serializer/HTTPアルゴリズムは一文字も変更していない。JavaScript の `\r\n`/`\n` は実入力で CRLF/LF になる。

```js
crlf: '<p>alpha\r\nbeta</p><p>alpha\r\nbeta</p>'
prelf: '<pre>\nline1\nline2</pre><p>outside</p>'
unicode: '😀<table>&#x1F600;<tr><td>&#x1F600;&nbsp;&amp;漢</td></tr>😀</table>😀'
```

| 入力 | 期待 | 実 Chrome / server projection |
| --- | --- | --- |
| crlf | 通常段落を表示し、source 由来を保って選択 Text だけ編集できる | canonical は CRLF を保持。parse5 errors=[]、ready=false。unresolved projected Text 2件、unmapped t0/t1。全文停止 |
| prelf | 正常な pre の表示を維持し、選択 Text の source 対応を保つ | canonical は先頭LFを保持。parse5 errors=[]、ready=false。unresolved projected Text / unmapped t0。無関係な outside も含め全文停止 |
| unicode 正常対 | surrogate・数値entity・NBSPを別sourceと混同しない | ready=true、3 DOM Text / 5 canonical Text。合流 😀😀😀 の UTF-16 offset 2〜4 を実 pointer で選択すると t1。trusted insertText で「漢🚀」へ変更し、他4 Text、table構造、NBSP/ampersand/漢を保持。保存 HTML も対応位置だけ変化 |

修正範囲は、HTML5 の CRLF/CR 正規化と pre 先頭改行の表示差を、source 区間・Text ID・表示 offset の明示対応として扱う小さい正常化 gate。正本の無断 normalize、文字列だけの別位置探索、全DOM serialize保存への fallback は解決策にしない。対応が一意でない入力を停止する既存安全策は維持する。全HTML5・bidi・pixel保証への拡張は要求しない。

## 対応方式のコード評価

`prepare` は実 sanitize 後の canonical AST と実 render AST を pair する。Text値と子数/順序を照合し、a→span 以外の要素差を拒否する。renderではmedia URLやリンク属性が正当に変わるため、canonical/renderの全属性同一を要求してはいない。canonical側 AST とその属性は保存用に分離され、利用者の data-* を対応 ID や認可へ用いない。

Text span は render文字列の start/end を持ち、parse5位置区間に包含される未使用 span だけを候補にする。狭い投影区間から割り当て、広いfoster区間では既割当 ID を除く。残候補の source 順・結合値が一致した場合だけ採用する。文書の別位置を同じ文字列で探索したり、canonical ordinalをDOM順に読み替えたりしていない。未割当や重なる未解決投影Textは issuesになり、初回DOM照合後でも編集listenerを付ける前に停止する。代表の A/A/A、clone、emoji はこの制約下で成立したが、全てのHTML5区間重なりに対する形式的証明ではない。

client は完成 srcdoc を mount してから nodeType、localName、namespace、属性集合/値、Text値、全child順序を再帰比較する。doctypeは明示的に除外し、本文Textの由来を偽造する属性を読まない。クリックは当該DOM Textの各source segmentの Range矩形に一意に入る場合だけ選択する。編集後は既知 entry の `.data` のみ更新し、要素/属性/treeを構造比較する。iframe側をcontenteditableにせず、子scriptも入れない。

空TextはセッションMap/ASTに残る。serializeしたHTMLからIDを作り直さないため、保存応答後に同ID再入力とundoが可能だった。これは一時memoryの正常対であり、C1accepted canonicalの差分、応答中追加入力、永続保存/reload、mode/失敗退避との整合は未接続。空Textからhostを閉じた後の再選択導線も本体側残条件。

一時 server の Map、JSON input、順次 patch適用、save応答は production の型付き/原子的保存境界ではない。gateのJS/any、runtime input validationの未整備を本体契約へ持ち込まない。C1共通save・認可・版・rollback・asset検査を別保存で代替してよいという根拠はない。資源deadline/node/depth/undo量の製品境界、診断worker、source generation入れ替え、late-save/late-load抑止は G4/G5 に残す。

## 実 IME・clipboard・drop の限界

実 IME は未実行。日本語 CLI type/fill の trusted insertText はあるが、OS compositionではない。合成 compositionの正常 guardとVG-01も別根拠として残す。親textareaが既存ブラウザ入力hostを使う設計上の見込みはあるが、変換確定/取消・候補窓・再変換・一変換一undo・mobile IMEは本体接続時の実入力条件に残る。実IME未確認を合成で埋めない。

native paste は短い限定試行で未成立。`navigator.clipboard.writeText` は NotAllowedError / Write permission denied だった。次に、自分で明示した既知文字列 `C2 known clipboard\n日本語 <b>text</b>` だけを copy handler に設定し、`execCommand('copy')=true` と copy event `isTrusted=true` を確認してから Control+V と別試行の Meta+V を送った。どちらも paste event未観測、Text/input event変化なし。これを native貼付成功にも貼付の製品不具合にも数えない。copyのイベント成功は、OS clipboardの内容を読んで検証した事実ではない。

未知の既存 clipboard は読み出し・記録・貼付しない。既知値以外をコピーしていない。OS設定/入力サービス変更、permission例外、別browser操作はしない。既知 copy のための既存 clipboard 上書きは元値の復元を行っていない（元値を読んでいない）。OS file dropは未実行。既知 File/DataTransfer の合成drop拒否と実画像要素drag拒否を分ける。

一度だけ補助 inline eval の改行escape誤りで SyntaxError が出た。ブラウザ対象は変更されておらず、自分の `input.cjs` に既知文字列を JSON stringify して試行し直した。製品修正や gate source 修正ではない。起動遅延による重複 Node/browser 起動はなかった。

## 画像の直接確認

自分が取得した `mobile-wrap.png` と `unicode.png` を view_image で直接確認した。前者は390幅original、黄色背景のtrusted textareaが折返し日本語の位置に重なり、左右がviewport内に収まる。PNGと動画fixtureがiframe内に描画され、親UIは上部に残る。後者は中央foster segmentを「漢🚀」へ編集したoverlayと、残るemoji/tableセルが見える。画面位置の見え方は確認したが、全CSS装飾・pixel完全一致の合格ではない。画像の目視をManagerに委譲していない。

## ハッシュ

本体開始/終了一致。sorted/dedup tracked+untracked実files、`.goal-implement/` 除外、path + NUL + bytes + NUL の従来定義。

- HEAD: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`
- 541 files: `94087dc2221773740b8816f4ba2a30c34267dd0b4d5ae9fb2013f1755a1f527d`
- lock: `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`

固定 gate と実 import 対象は以下の全件を開始/終了で照合し、正式報告の値と一致。

| 固定ファイル | SHA256 |
| --- | --- |
| server.ts | 95db72ad89a70bbcf96ea83ae3537a29c654fb2c0a1001fa7d3f224a5df01e15 |
| client.js | 23b6edbb3843c2f7bc7f0ce2b846ec50759bf11a875ac95faa27546bb9c6a48d |
| index.html | c5b63dd9b317b64da0b091bbf1a055a510713a7591b0689026a50f647792ee82 |
| exercise.cjs | e5e51ff74b243b34d5a38bbf14fa6350c6b57622bd16b489cc037a95a8b9875f |
| matrix.cjs | 0d2fe6e6aa283dc8653d65e33543f4c88299a2c7304a1e600b09e40ec4f00adb |
| reject.cjs | adbffc060cc9b34c38c612b20c1ad8b1f2f02237c655bf38745a945303e9abcf |
| paste.cjs | c0f23685cfc960871ef8abed1d0901ae96b2b66c1a24c5d47111d6633c1dc78c |
| table-edit.png | 2306eee90bf88dbcb74b893703d6eafdd25026deea9fe2c510a1a573a288105a |
| mobile-wrap.png | 523704d4a583f433a33c4c75d9d68c7b2c8a6e65317e7d5d195a754486224cee |
| 実 htmlSanitizer.ts | 6d506742469cbba5550093fbaebdf3f398e9f910038d49064d18e577e08c600d |
| 実 editorMedia.ts | e85758cde6a6cae8398328ba3934666f94dcc8f2daf408ab4ef2ebb03c28c5a2 |
| parse5 7.3.0 package.json | 8196284780fe95c3245a40e3c17b45fc85ef709f1211775987d037e5e873fe95 |

派生 temp の終了 hash。`paste.cjs` は sessionだけ変更した保管コピーで未実行。実clipboard試行は `input.cjs` と `native-meta.cjs` を使用。

| 派生ファイル | SHA256 |
| --- | --- |
| server.ts（fixtures3追加のみ） | f5296a71392ee25883004aae72716135930a3f34418fe504d747cb4b658c6b43 |
| exercise.cjs | 79fe020e66a91d20a89a5150e0358a8db224d0280a8273931bdf91bcedde61d5 |
| matrix.cjs | b8be3ca3ea52e1f5b5329d8af757d73f7adf94d7e33ba84ba51e55ad083ef3b5 |
| reject.cjs | b4d70077a7284ebaacfc04a53fb96993cc2a6db8a4e86e8faa2f79f2f589edae |
| paste.cjs | 9ea9565c3548c91c004be8013152af472d99425df1eb176852b3c50f466e20f8 |
| independent.cjs | 94ebbbedfae63b9e04fd6073bae69156e24c60775cd1ea509538af28df520e82 |
| input.cjs | d8e26c76ca68faf7362ee4392f0938b0088ec21fee6b3542ee3d00583b667f04 |
| native-meta.cjs | ac595d8f394a4ec42fbae8c95d281cd0f6f34af92ec5780575bda614ed406ad5 |
| unicode.cjs | 2718ce87ee7fca26a6aa38392f5d811027ef00cef1f7b0ff7baa60f43d006fa1 |
| guards.cjs | 412d4580c919dfbe1e216fa80337e4ad5217c64fb085c65527e46f19b003a1a5 |
| mobile-wrap.png | 523704d4a583f433a33c4c75d9d68c7b2c8a6e65317e7d5d195a754486224cee |
| unicode.png | b32e06976db68485107a64d6cbc4a1e2c7ee8f7178cc6b159a373e97fa411fda |

## 環境返却

14:52:12、自己browser `hollow-c2-independent` を closeして `Browser closed` を受領。両 listener は各 SIGTERM→対応 session exit0で回収、14:52:41 に既知PID86370/88745の不存在を確認した。全自己helper/execは完了。自分tabのwrapper/error/copy listenerはreload/closeで消え、listener・route・HAR等は残していない。

本体 production session3249 / PID74924 / Node22.22.3、localhost3000は稼働維持。終了時に既知PIDの存在だけ確認し、HTTP/DBや実ノートは操作していない。395notes/36assets/442revisions/pending0 はC1終了時の受領値であり、今回再集計した値ではない。

全旧backup、C1検証data、原本を保持。main source/lock/schema/管理直下/goal変更、外部送信、commit/deploy、データ削除、OS変更、別作業focus-debug/他browser/全process探索なし。報告完了をもって全操作を停止し、方式判断と局所修正の担当へ返却する。

## VG-01〜03 修正版の独立再確認

2026-09-06 15:18:35〜15:23:37 JST（実 clock）。上記の旧不合格根拠を保持し、本節を修正版の判定とする。正式 `phases/P2c-2-gate.md` 全文と追記された修正候補を読み、修正 source と元条件を照合した。新固定対象は `/tmp/hollow-visual-revision.r3t0PN`。元 gate・旧独立 temp・本体は変更していない。

### 判定

VG-01/02/03 は今回の代表正常/拒否対で解消。G1/G2/G3 の代表方式 gate は合格とし、局所障害が解消した方式を本体接続へ進めることを推奨する。実 IME/native paste/OS file drop の未確認、G4/G5・C1本体未接続は変わらない。ED-02/03/05 全体の完成や、全HTML5/全browser/全入力対応の合格にはしない。

| 項目 | 再判定 | 独立に観測した根拠 |
| --- | --- | --- |
| VG-01 / G2 | 解消 | 元の合成 start/input→trusted Escape→合成 end で同 host・t6・generation保持、例外0。Escape/save/load/finish の4拒否。別対象での遅いend/input、新compositionより古いtimestampのendを無視。composition一回を一undo/redo |
| VG-02 / G2 | 解消 | 元mixed ClipboardEventはplain textをt6の選択範囲へ一度挿入。markupをescaped保存し、他Text/要素/属性・親sentinel不変。HTML-onlyとfile+plainは拒否。一pasteを一undo/redo |
| VG-03 / G1 | 解消 | CRLF反復、CR、pre先頭LF、pre先頭CRLFがready=true/errors0/issues0。無編集saveはcanonical完全一致。選択Textだけ編集、他TextのCRLF/CR保持。改行後pointerとtrusted Zの位置、空pre→保存応答→同ID再入力が成立 |
| G3 / 共有正常対 | 合格維持 | 型/namespace/属性/Text/順序の5不一致はready=false/overlay hidden。最終timestamp修正を含む固定clientで通常table、反復foster、clone、inertlink、default/original、悪性fixture、mobileを再実行。親漏れ0 |

新規不具合はない。旧findingの「拒否できるが正常入力として使えない」を、安全性成功だけで解消扱いにしていない。CRLF/preについて実際の編集・保存まで進め、取消や無変更inputで正本が勝手にLF化されない対も追加した。

### コード確認

`projection.mjs` の `projectValue` は source を変更せず、表示LFと各UTF-16表示境界に対応するsource境界を返す。CRLFは2source unit→1表示LF、CRは1unit→LF。pre先頭の既知prefixだけを表示から外し、sourceとprefixが一致しなければ拒否する。serverは元sourceの値とprefixを保持し、投影比較にはdisplay値を使う。source区間包含・既割当除外・実DOM全照合は維持しており、別位置の同一文字列検索へ戻っていない。

clientのtextareaとRangeは表示offsetを使い、変更がある選択Textだけを `sourceFromInput` でLFベースへ戻す。未編集Textと表示不変inputは元source値を保持し、pre非表示prefixは元のLF/CRLFを保持する。これは編集したText内までbyte完全保持する新契約ではない。undoには変更前source値を記録する。

compositionは対象ID/generation/host/開始source/timestampを保持し、Escapeもcomposingを検査する。終了は現対象との一致とtimestampを確認し、event.dataを別対象への入力に使わない。取消で表示が開始値に戻った場合は開始sourceを復帰し、途中の一時正規化を保存しない。この制御確認は実OS IMEのイベント順序を証明したものではない。

pasteは既定動作を止めてplain textだけを選択範囲へ挿入し、DOM parse・親innerHTML化をしない。HTML-only/file拒否は残す。既存の一時Map/patch保存がproductionの認可・原子性・版を代替しない点は旧レビューどおり。今回も本体保存/DB/依存には接続していない。

### 実行の区別と観測

Node22.22.3の固定serverを127.0.0.1:58934、PID98118 / session17457で起動。ブラウザは自分の `hollow-c2-recheck --restore`、Chrome152、agent-browser0.36.0。別mktemp `/tmp/hollow-visual-recheck.kqwuDJ` に helperをapply_patchで派生した。固定helperのsessionと画像出力先だけを自分用へ変更し、製品修正はしていない。

```sh
pnpm --filter @repo/web exec tsx --tsconfig tsconfig.json /tmp/hollow-visual-revision.r3t0PN/server.ts
pnpm exec node --test /tmp/hollow-visual-revision.r3t0PN/projection.test.mjs
pnpm exec node /tmp/hollow-visual-recheck.kqwuDJ/revision.cjs
pnpm exec node /tmp/hollow-visual-recheck.kqwuDJ/offsets.cjs
pnpm exec node /tmp/hollow-visual-recheck.kqwuDJ/noop-cancel.cjs
pnpm exec node /tmp/hollow-visual-recheck.kqwuDJ/unicode.cjs
pnpm exec node /tmp/hollow-visual-recheck.kqwuDJ/guards.cjs
pnpm exec node /tmp/hollow-visual-recheck.kqwuDJ/after-composition.cjs
pnpm exec node /tmp/hollow-visual-recheck.kqwuDJ/matrix.cjs
```

固定pure試験8/8と上記7 browser harnessは全てexit0。pure8とrevision/offset/matrixはImplementer作成の試験を独立再実行した根拠。unicode/guardsは前回独立資材と同一コード。新規に自分で追加した試験は `noop-cancel.cjs` と `after-composition.cjs`。単なる自己報告の転載、または全件を今回新規作成した試験とは扱わない。

- `revision`: CRLF/CR/preLF/preCRLFの無変更保存、各Textだけの編集/undo/redo。元VG-01の再現が errors=[]、4拒否、lateDifferentTextPreserved/olderEndIgnored/cancelPreserved=true。mixed pasteの出力は `表&lt;img src=x onerror=bad&gt;\n漢🚀ル二`、他Text不変。pre空のsourceは `\r\n`、再入力後 `<pre>\r\n再入力</pre><p>outside\r\nkeep</p>`。
- `offsets`: 表示cursor7でCRLF二段落目のsource境界8、CRの7、preLFの8、preCRLFの10を確認。trusted Zはそれぞれ `alpha\nbZeta`、`alpha\nbZeta`、`\nline1\nlZine2`、`\r\nline1\nlZine2`。該当Text以外の変更0、DOMShape true。
- `noop-cancel`（独立追加）: CRLFとpreCRLFで、表示値を変えない合成input後saveが元canonical完全一致。trusted Z→合成composition一時値→開始表示へ戻してcancel→undoで、cancelが不要なundoを追加せず元sourceへ戻る。元CRLFそのものからのcomposition取消→saveでもcanonical完全一致。
- `after-composition`（独立追加）: t6を合成compositionで「完了」へ確定後、同host/generationのままtrusted Xを入力して「完了X」。最初のundoは「完了」、次のundoは元t6。合成composition3イベントと通常trusted insertTextを別々に記録した。
- `unicode`: 元CRLF/preLFがreadyへ回復。foster合流emoji中央t1だけ「漢🚀」、他4Text/NBSP/ampersand/漢/tableを維持。
- `guards`: 5不一致全拒否。元のmixed clipboard再演は `idsUnchanged=false`、t6だけ `known fixture HTML表のセル二`、rejections=[]。このログだけで正しさを推定せず、revisionの選択範囲・一回挿入assertと合わせた。
- `matrix`: 最終timestamp guard後の同固定clientで正常/HTML5/隔離/mobile成功。親sentinel unchanged、親黒/子green、scripts/frames/links0、listenerの`/leak`0。合成composition中の3操作拒否、同generation/overlay/focus保持も維持した。

Implementerのmatrix成功は最後のtimestamp guard前だったが、今回の独立matrixは固定15file候補の最終clientに対して実行した。一方、自己報告のexercise/rejectは今回再実行せず、旧独立成功と修正版自己成功を未変更経路の根拠として保持する。C1のunit/DB全件、codec/認可/Rangeの広い回帰は行っていない。

自分で生成した `pre-reentry.png` と `mobile-wrap.png` を直接画像確認した。390幅のpre入力hostに「再入力」、outside保持が見える。originalの折返しText/textarea、PNG、動画の表示も確認した。全pixel/全媒体方式の再証明ではない。実IME/nativepaste/OSdropの未確認を合成で補っておらず、今回はOS clipboardへの新しい操作自体を行っていない。

### 開始終了hashと返却

15:18:35の読取開始後に開始hashを確認し、15:23:37の終了hashまで不変。本体541files/HEAD/lockは旧レビューと同値。

- main541: `94087dc2221773740b8816f4ba2a30c34267dd0b4d5ae9fb2013f1755a1f527d`
- HEAD: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`
- lock: `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`
- 修正版15files（sorted basename+NUL+bytes+NUL）: `75f2f9bbb1028ccc498e3d119d963ef9ceb4420beff051e83582a17d462209f5`
- 固定server.ts: `f1366ef43f1a32ca2a20d953796f0b9463c5c1260ea43931c01cca6bebd6119f`
- 固定client.js: `815073504960dc7096d6217055d7acaecd5390e97b5ede62aed65c5045978b87`
- 固定projection.mjs: `530bd616aa5a5a06a43001df39f68d62ece56d0f1a10b84919c14d16fbf891bf`

開始時は修正版全15fileの個別hashを正式報告と照合。元gate9fileと旧独立12fileも旧レビュー個別hashに全件一致。終了時の同定義aggregateは元gate `c518a33f5fa0258bb6e930432307b182048009259f641a45207b9ab92be57fe4`、旧独立 `2aa41f24ce97377fcf7d0cc5fe0c02c23bc65ecc395fe2b78a62eebd226c1f41` で開始と一致した。

新派生temp10filesの終了aggregateは `db0c674854ffcd60b8d2913c086683c59ca17a847bec533cbf3675cc541fa02b`。

| 新規/派生検査 | SHA256 |
| --- | --- |
| independent.cjs | bbfa6b925c0f4c3ec794a7ddc7b4b1b2b6275e9f5da36ba55bbf8179324c140b |
| revision.cjs | 2a090351f6eff5fbbc4bb98777d22966530643be864cb04c7ea521ceae02069c |
| offsets.cjs | 62031ec5876c46fda15a1728edea456ea1c12a8ce0d9dace09ccaff96edde832 |
| unicode.cjs | 2718ce87ee7fca26a6aa38392f5d811027ef00cef1f7b0ff7baa60f43d006fa1 |
| guards.cjs | 412d4580c919dfbe1e216fa80337e4ad5217c64fb085c65527e46f19b003a1a5 |
| matrix.cjs | a2d58d8019485be6592cd108dd3ee0900629a998150bc95905eb18df713dbd70 |
| noop-cancel.cjs | 2514f2e913e7bb67a041e118a07e72c54c181f9eca96d64da948b188aa2ef528 |
| after-composition.cjs | 139ad39ee1d7d59812364690d9fc694453976268b522de7213753db5403314ae |
| pre-reentry.png | b70426ab5112931b5d8207e893f7bbbc7b68f6871980297451f59983221388ac |
| mobile-wrap.png | 523704d4a583f433a33c4c75d9d68c7b2c8a6e65317e7d5d195a754486224cee |

15:23:17 JST、自己 `hollow-c2-recheck` browser close成功、唯一の自己listener PID98118/session17457をSIGTERM→exit0で回収。15:23:37に同PID不存在とproduction既知PID74924存在を確認。全自己helper/execは完了し、tab wrapper/listenerはreload/closeで終了。以後は報告追記・読戻しのみ。

production session3249/PID74924/Node22 localhost3000は無操作で維持。DB/storage/mailbox/全backup/原本は開いて変更していない。395notes/36assets/442revisions/pending0はC1受領値で今回の集計ではない。main code/依存/設定/schema/管理直下/goal/Issue変更なし。全process情報取得・別browser/focus-debug/OS・外部送信・commit/deploy・削除なし。全操作を停止し、一時gate/browser所有をManagerへ返却する。
