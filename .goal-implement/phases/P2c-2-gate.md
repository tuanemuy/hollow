# P2c-2-G: Text-only visual 方式 gate

## 結果と対象

実施: 2026-09-06 14:14:21–14:38:29 JST。Implementer 自己検証。C1 独立レビュー `reviews/P2c-1.md`、ED-02/03/05、design C2 候補節、`phases/P2c-2-contract.md` を引き継いだ。

htmlparser2 正本を保持し、parse5 の HTML5 投影を実 Chrome DOM と照合した上で、親の trusted textarea から既知 Text だけを更新する方式は、今回の代表入力で成立した。通常 table を拒否せず、foster 合流・反復文字・HTML5 formatting element 再構築も、出典区間を保持する限定 segment 対応で変更対象を区別できた。

G1 と G3 の代表 gate は成立。G2 は直接入力、空 Text、undo/redo、折返し、モバイル幅、構造操作拒否が成立したが、実 IME と native paste、OS からの実 file drop は未確認。これらを合成イベントの成功で置き換えない。G1–G3 の全面合格、ED-02 の全入力対応、C2 本体完成を宣言しない。G4/G5、HTML highlight、診断、mode 遷移、C1 保存への製品接続は未実装。

本体 source/lock/schema/DB は変更していない。一時資材は `/tmp/hollow-visual-gate.I6mUfi`。本体変更の代わりに、この報告だけを追加した。

## 再利用と test-only 境界

実ファイルを tsx から直接 import した。

- `packages/core/src/adapters/node/htmlSanitizer.ts`: `NodeHtmlSanitizer.sanitize/render`。危険要素・属性除去、許可 asset URL、a→inert span の実処理。
- `apps/web/app/components/hollow/editorMedia.ts`: `frameDocument`。完成 srcdoc、両表示 style、実 CSP の生成。
- 既存 htmlparser2 10.0.0 / dom-serializer 2.0.0 を readonly 利用。
- parse5 7.3.0 を既存 pnpm store から readonly 利用。製品依存追加、install、lock 更新なし。

server.ts の generation/AST registry、source sidecar、HTML5 投影、patch 保存応答、client.js の overlay はすべて test-only。`/save` は一時メモリ AST を更新し、実 sanitizer を通した HTML を返すだけで、C1 共通 commit、20版、認可、退避、DB 永続化を実証しない。

画像・動画は既存成熟 fixture `libpng-pngtest.png` / `mdn-flower.mp4` を参照した。出所・利用条件は既存 fixture manifest のまま、複製・再配布していない。一時 HTTP の asset endpoint は固定 fixture を返すだけで、許可 asset 集合も test-only。原本 attachment、current/history/draft 認可、Range 認可の本体合格には数えない。実 CSP と sandbox 下の表示可否のみを観測した。

外側 DOM に未信頼 HTML/CSS を入れていない。iframe は `sandbox="allow-same-origin"` 単独、script 許可なし。子に editor script や bridge を入れず、contenteditable も使わない。親は選択した Text の `.data` のみを更新する。textarea の配置には Range 矩形と計算済み font 属性だけを使用する。

## G1: 出典対応

1. 実 sanitize 後の canonical HTML を htmlparser2 AST として保持する。これは raw HTML の byte 同一性ではない。
2. 実 render の AST を canonical AST と対応付ける。a→span 以外の要素変化、Text 値・子数の不一致は停止する。style/script の Text は編集対象にしない。
3. render 文字列の source offset と generation 内の Text ID を sidecar に保持する。本文への data-* や comment marker 追加は行わない。利用者の同名 data-* を認可・由来証明に使用しない。
4. 完成 srcdoc を parse5 `sourceCodeLocationInfo: true, scriptingEnabled: false` で投影する。狭い source 区間を先に対応付け、広い foster 合流区間では既割当の区間を除く。区間内の残 Text が順序・値とも一致する場合だけ segment を対応付ける。文字列一致だけで別区間を探索・推定しない。
5. source の未割当、由来区間と重なる未解決の投影 Text は停止する。実 Chrome DOM の node type、要素名、namespace、属性集合、Text 値、全 child 順序を投影と比較する。不一致では編集を有効にしない。
6. 合流 Text のクリックは各 source segment の Range 矩形に一意に含まれる場合だけ選択する。caret offset の境界値だけで前後を推定しない。重なり・不可視・境界の一意性がない場合は案内して停止する。

| 代表入力 | 実 Chrome 結果 |
| --- | --- |
| table 内の暗黙 tbody | canonical は table/tr、DOM は table/tbody/tr。8 Text 全対応。td だけ変更、両者それぞれの要素・属性構造不変 |
| 同じ文字列3箇所、strong、entity/NBSP、日本語、a→span | strong、リンク内、heading、折返し p の4対象を trusted pointer で選び、各1 Textだけ変更。他 Text変更0。data-hollow-text/data-hollow-link/data-id/class を保持 |
| `A<table>B<tr><td>cell</td></tr>C</table>D` | DOM の ABC を canonical A/B/C の3 segment と対応。Bだけβへ変更、cell/A/C/D不変、canonical の table 構造不変 |
| `A<table>A<tr><td>A&nbsp;&amp;</td></tr>A</table>A` | 合流 AAA の左右と中央を t0/t1/t3 と一意選択。中央を空→保存応答→再入力。cell の NBSP/ampersand、他の A を保持 |
| 不正な b/i 閉じ、p/div | 実 sanitizer が先に補正した canonical を投影して一致。raw の不正構造をそのまま保持した根拠とはしない |
| `<table><b><tr><td>clone cell</td></tr>outside</b></table>after` | canonical の b は1つ、DOM は再構築された b が2つ。Text順も canonical t0→t1 と DOM t1→t0 が異なる。outside の t1 だけ入力し、両構造不変。ordinal 対応へ戻さない |
| test-only で投影要素名を不一致にする | `安全停止: element mismatch`、ready=false。別 Text への更新を実行しない |

初回の単純 location 包含では foster 区間に cell まで含めて対応できず安全停止した。その後の小さい segment 案で解消した。さらに初回の `offset <= boundary` 判定では B のクリックが A を選ぶ gate バグを検出した。変更入力前の assertion で停止し、Range 一意判定へ修正した。最終側の B と A/A/A の正常対は修正後の結果である。

## G2: 入力と表示

実ブラウザは HeadlessChrome/152.0.0.0、agent-browser 0.36.0、Macintosh user agent。desktop 1100px と viewport 390×844 を使用した。390px は実スマートフォン/OS IME の証明ではない。

- Text の表示位置を trusted pointer でクリックし、親 textarea に直接入力。table、リンク内、折返しで成立した。
- 全消去→test-only 保存応答→同じ ID への再入力が成立。元の AST Text オブジェクトと sidecar を保持し、空文字を serialize した結果から ID を再構築しない。
- undo/redo は Text 値だけを戻し、構造・属性を保持した。今回の入力は文字単位の履歴で、IME の実 undo 単位は未確認。
- `<b>plain</b>` と LF を Text として入力・保存すると `&lt;b&gt;plain&lt;/b&gt;` と LF を保持し、要素を生成しなかった。
- trusted Control+B は書式操作を拒否。trusted mouse の跨 Text 選択→Delete、画像要素 drag も案内し、Text/構造変更0。
- default/original とも実 frameDocument で一致。PNG load 成功。MP4 は readyState=4、videoWidth=960、videoHeight=540。今回は codec/Range/seek の再受入を行っていない。
- `table-edit.png` と最終 `mobile-wrap.png` を Implementer が直接画像確認した。390px original の textarea は x=28/right=328、4行折返しの選択場所に表示され、PNG・動画も見える。画像は同 temp 内に保持した。

### IME / paste / drop の区別

CLI の日本語入力には trusted `insertText` が記録されたが、compositionstart/end は発生しなかった。使用可能な通常 CLI 入力から実 OS IME composition を成立させた根拠はない。OS 入力設定変更、追加サービス、他ブラウザ操作はしていない。

合成 compositionstart→insertCompositionText→compositionend は isTrusted=false と記録した。最終 fixture は明示 focus 後、composition 中の保存・再mount・入力終了を拒否し、generation、overlay、focus を保持した。実ユーザーがボタンへ focus を移す際の OS IME 確定/cancel、実再変換、変換候補窓、実 undo は未検証。初回の合成 fixture は focus 前提を用意していなかったため focusRetained=false、その後明示 focus した fixture と区別する。

native plain paste は既知の fixture 文字列を用意して試みたが、Control+V が30秒 CLI timeout となり、回収後の専用 browser は about:blank だった。因果を製品バグや paste 成功へ読み替えない。後の限定 Meta+C 試行では、既知文字列を設定する trusted copy event が観測できず、paste を実行せず停止した。既存 clipboard の読み出し・記録はしていない。

HTML paste と file drop の guard は既知 fixture の合成 ClipboardEvent/DataTransfer/File で拒否を確認した。native paste の成功、OS file drag/drop の実操作とは数えない。LF は通常 Text 入力/保存の根拠に限る。

## G3: 隔離

script/event/javascript URL、iframe/object/form/meta refresh/base、未許可 image URL を含む attack fixture を実 sanitizer/render/frameDocument へ渡した。完成 srcdoc の mount 後、script/frame/object/form/base/meta refresh/a 要素は0、親 sentinel は unchanged。子 body の green は適用され、親 body は黒のまま。自分 listener の `/leak` request は最終0件だった。

親 sidecar は source HTML の data-* を参照権限として扱わない。保存は generation と既知 id/before 値に限定した Text patch で、render DOM の innerHTML 全保存に fallback しない。script/style Text を編集候補に含めない。

これは実安全化/iframe生成を再利用した代表隔離 gate であり、C1 の本体認可/UI/transport を接続した再検証ではない。将来 C2 接続でも current media、metadata、inert link、保存 notice の既存境界を維持する必要がある。

## 採用判断材料と残条件

1. 第一候補の parser 二層方式と trusted overlay を、本体接続へ進む方式候補として推奨する。parse5 の product dependency 採用は Manager 判断。今回の区間法は一般 HTML5 全入力証明ではない。source位置の分割/重なり、CRLF正規化、複雑な bidi/縦書き/変形/重なり、不可視 Text は未網羅。一意性を証明できない箇所は誤対応せず停止し、その拒否範囲を C2 本体試験で測定する。永久的 ED02 非対応をここで採用しない。
2. 実 IME、native paste、OS file drop は別の入力根拠が必要。合成 guard と今回の日本語 trusted input をそれぞれ保持する。これを理由に textarea の外で未信頼 DOM を contenteditable にする案は採らない。
3. 保存応答後の空 ID 保持はセッション内 AST を再生成しない一時保存で成立した。本体 C1 応答で別 canonical が返る場合の source generation 再照合、dirty/mode/history/rollback/localbackup は G4/G5。空 Text の全 reload 越し identity、新しい byte-identical 保証、無期限 undo、全 browser 保証は追加しない。空 Text から overlay を閉じた後の再選択 UI も本体で具体化が必要。

## 再現、時刻、固定対象

一時 listener: Node v22.22.3、tsx は既存依存。最終起動コマンド:

```sh
pnpm --filter @repo/web exec tsx --tsconfig tsconfig.json /tmp/hollow-visual-gate.I6mUfi/server.ts
agent-browser --session hollow-c2-gate --restore open http://localhost:PRINTED_PORT
node /tmp/hollow-visual-gate.I6mUfi/exercise.cjs
node /tmp/hollow-visual-gate.I6mUfi/reject.cjs
node /tmp/hollow-visual-gate.I6mUfi/matrix.cjs
```

server は127.0.0.1 の空き port を表示する。固定の private fetch 例外や production policy 変更はない。exercise/reject/matrix は既存の専用 browser URL を利用する。matrix の NATIVE_PASTE は既定off。paste.cjs は trusted な既知 fixture copy が確認できない場合に停止する未成立試験であり、成功試験に含めない。

- 14:14:51 開始 fingerprint 一致。
- 14:25:36 までに通常編集/空/undo、14:29:37 に進捗報告。
- 14:33:04 までに mobile/構造拒否と投影不一致の遅延後停止を観測。初回100ms assertionはiframe完了前だった。ready初期化と待機fixtureを修正し、reject.cjs 最終exit0。
- 14:35:09 までに clone Text の入れ替わりと正しい編集を確認。matrix のログ取得 await 構文誤りは helper の失敗として修正した。
- 14:38:07 までに最終 matrix exit0、合成 composition の3操作拒否/明示focus保持、mobile、leak0を確認。exercise は最終 source の location/Range に対してexit0。最後の composition guard 追加は通常 exercise 経路を変えていない。
- 14:38:29 専用 browser close、最後の listener PID83116/session70038 を SIGTERM→exit0 で回収。旧一時listener PID78763/80568/82289 も各再起動前に回収済み。短期 helper/exec は完了し、補助agentなし。

本体 build/typecheck/unit/Node integration、DB migration/書込、production restart は今回の範囲外で未実行。C1合格を再実行したとはしない。

### ハッシュ

開始と14:38:07の終了側 fingerprint はともに以下。tracked と untracked の実ファイルを含み、`.goal-implement/` 管理報告は従来方式どおり除外。

- HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、main。
- 541files SHA256 `94087dc2221773740b8816f4ba2a30c34267dd0b4d5ae9fb2013f1755a1f527d`。
- lock SHA256 `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`。
- 終了側 git status 集計: modified23、untracked92（管理報告等を含む）。既存変更を保持し、commitなし。

| ファイル | SHA256 |
| --- | --- |
| temp/server.ts | 95db72ad89a70bbcf96ea83ae3537a29c654fb2c0a1001fa7d3f224a5df01e15 |
| temp/client.js | 23b6edbb3843c2f7bc7f0ce2b846ec50759bf11a875ac95faa27546bb9c6a48d |
| temp/index.html | c5b63dd9b317b64da0b091bbf1a055a510713a7591b0689026a50f647792ee82 |
| temp/exercise.cjs | e5e51ff74b243b34d5a38bbf14fa6350c6b57622bd16b489cc037a95a8b9875f |
| temp/matrix.cjs | 0d2fe6e6aa283dc8653d65e33543f4c88299a2c7304a1e600b09e40ec4f00adb |
| temp/reject.cjs | adbffc060cc9b34c38c612b20c1ad8b1f2f02237c655bf38745a945303e9abcf |
| temp/paste.cjs | c0f23685cfc960871ef8abed1d0901ae96b2b66c1a24c5d47111d6633c1dc78c |
| temp/table-edit.png | 2306eee90bf88dbcb74b893703d6eafdd25026deea9fe2c510a1a573a288105a |
| temp/mobile-wrap.png | 523704d4a583f433a33c4c75d9d68c7b2c8a6e65317e7d5d195a754486224cee |
| 実 htmlSanitizer.ts | 6d506742469cbba5550093fbaebdf3f398e9f910038d49064d18e577e08c600d |
| 実 editorMedia.ts | e85758cde6a6cae8398328ba3934666f94dcc8f2daf408ab4ef2ebb03c28c5a2 |
| parse5 7.3.0 package.json | 8196284780fe95c3245a40e3c17b45fc85ef709f1211775987d037e5e873fe95 |

## 一次資料

- [htmlparser2](https://github.com/fb55/htmlparser2): HTML仕様準拠が必要な場合の parse5 との役割差。
- [parse5 ParserOptions](https://parse5.js.org/interfaces/parse5.ParserOptions.html): sourceCodeLocationInfo、暗黙生成要素の位置情報欠落、onParseError、scriptingEnabled。
- [parse5 v7.3.0 package](https://github.com/inikulin/parse5/blob/v7.3.0/packages/parse5/package.json): 固定 version と MIT。既存 store の package.json と実 Node22 load を確認。
- [WHATWG HTML parsing](https://html.spec.whatwg.org/multipage/parsing.html#creating-and-inserting-nodes): foster parenting と Text 合流。DOM順を正本Textのordinalと同一視しない根拠。
- [Input Events Level 2](https://www.w3.org/TR/input-events-2/): composition と beforeinput の区別。仕様上の記述を実 IME 動作確認の代用にしない。

## 環境引継ぎ

production session3249/PID74924、Node22.22.3、localhost3000 は変更せず維持。14:38:07の既知 PID 存在確認は成功。DB `/tmp/hollow-p2b.dAfzgS/app.db`、storage `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox` は開いて変更していない。395notes/36assets/442revisions/pending0 は受領時の独立検証値で、今回再集計した値ではない。

全旧 backup、原本、C1 独立追加dataを保持。OS/他process/focus-debug/他browserへ干渉なし。自分の browser/listener/helper は終了。ここで全操作を停止し、Manager の方式採用・独立 gate 判断を待つ。

## VG-01〜03 修正候補

実施: 2026-09-06 14:59:22–15:13:08 JST。`reviews/P2c-2-gate.md` 全文を読み、G1/G2の局所差戻しを修正した。前節の自己検証と独立 finding を残し、この節を修正版の根拠とする。独立再確認は未実施。本体 C2 の実装・受入には含めない。

修正版は `/tmp/hollow-visual-revision.r3t0PN`。元 gate と独立資材をコピーし、変更は修正版にだけ apply_patch で行った。manual-test の操作・証跡記録を使用し、報告は doc-style/markdown-style で整理した。限定委譲を優先し、追加agent、Issue、全process探索、一括cleanupは行わない。

### 変更面

| ファイル | 元 gate からの変更 |
| --- | --- |
| `client.js` | composition の対象ID/generation/host/開始時値/開始timestampを保持。Escape guard、遅い終了guard、plain text paste、source値と表示値の分離 |
| `projection.mjs` | CRLF/CR→表示LF、既知pre先頭改行の非表示prefix、UTF-16表示境界→source境界の純粋関数 |
| `server.ts` | 投影値・prefix・offsetsをsidecarへ追加。preの既知prefix分だけsource表示開始位置を調整。独立CRLF/pre/Unicode fixtureとCR/preCRLF正常対を追加。一時配信pathを修正版へ変更 |
| `index.html` | trusted clientをmoduleとして読み、同じ純粋投影関数を親UIから利用 |
| 既存helperコピー | 自分session/画像保存先だけ変更。`unicode.cjs` と `guards.cjs` は独立資材とbyte同一 |
| 追加helper | `revision.cjs`、`offsets.cjs`、`projection.test.mjs` |

実 sanitizer/frameDocument、htmlparser2、parse5、dom-serializerは同じ固定依存をreadonly利用した。追加install、製品依存・lock・schema変更なし。

### VG-01: composition の入力先維持

composition中は、同じtextareaと対象ID/generationを維持する。Escapeもsave/load/finishと同じく拒否し、overlay/activeを破棄しない。終了処理は保存した対象が現在と一致する場合だけ実行する。activeなしの終了、終了済み対象への遅い終了・composition input、新しいcomposition開始より古いtimestampの終了は採用しない。

終了値は同じhostの最終valueから決め、終了event.dataを別Textへの入力値にしない。最終表示値が開始前と同じなら開始前source値を戻す。取消でCRLFを不要にLFへ変えない。実変更がある一回のcompositionだけを一つのundoとして記録する。

修正版の実Chromeで、合成start/input→trusted Escape→合成endは例外0。Escape/save/load/finishの4操作は拒否し、元対象t6とgenerationを保持した。終了後undo/redoは一回のcomposition単位で成立。別Textへ切替後の古いend/inputでも変更0。新しいcomposition中に、以前作成した古い終了eventを遅延dispatchしても新しいhostを閉じず、新しい最終値だけを確定した。取消対はhostを開始値へ戻してend(data空)を送り、元値を保持した。

これは合成compositionとtrusted keyの制御試験である。実OS IMEの変換確定/取消、候補窓、再変換、mobile IMEの成功とはしない。

### VG-02: clipboard の plain text だけを受理

pasteは既定動作を止め、clipboardに `text/plain` があればその値だけをtextareaの選択範囲へ一度挿入する。`text/html` の有無では拒否しない。HTMLを親DOMでparse/renderしてTextを取り出す処理はない。fileを含む場合、またはplain textのないHTML-onlyは理由付き拒否。CRLF/CRは入力値内でLFへ揃える。

既知のHTML+plainを持つ合成ClipboardEventで、選択中t6の一部だけに `<img src=x onerror=bad>`、LF、日本語/emojiを挿入した。他Text/構造/属性は不変。保存HTMLは `&lt;img …&gt;` となり、親色は黒、sentinelはunchanged。HTML-onlyとfile+plainは変更0。貼付一回のundo/redoも成立した。独立 `guards.cjs` の同じmixed clipboard再演でも、旧版の `idsUnchanged:true` ではなくplain textを含む正しいt6変更を観測した。

今回native pasteを再試行していない。未知OS clipboardの読み出し・記録・貼付もない。合成ClipboardEventのhandler契約とnative入力を分ける。

### VG-03: source と表示の改行差

canonical ASTのText値は初期化時に変更しない。source区間/IDに、表示用のCRLF/CR正規化とUTF-16境界写像を付ける。preの最初のTextが既知の先頭改行を持つ場合、そのsource prefixを保存し、表示区間から一回だけ外す。prefixとsourceが一致しない場合は推測しない。

クリックとtextareaは表示offsetを使う。保存は選択したText全体だけを置換し、編集された表示値をLFベースのsourceへ戻す。preの既知非表示prefixは元のLFまたはCRLFのまま先頭に保持する。未編集Textは元source値を保つ。表示値が変わらないinputはsource正規化の理由にしない。undoは元source値まで戻す。

| 入力/操作 | 修正版の実測 |
| --- | --- |
| 独立CRLF反復 | parse error0、ready=true。無変更保存HTMLはcanonicalと同一。t0編集後も別段落t1のCRLFは不変 |
| CR段落 | 表示はLF、未編集の別TextのCRは保持。編集対象だけLFで保存 |
| 独立pre先頭LF | 表示は `line1\nline2`。保存は非表示先頭LF＋編集値、outside不変 |
| pre先頭CRLF | 表示先頭の2source unitsを非表示にする。編集後も先頭CRLF/別TextのCRLFを保持 |
| 改行後のpointer＋trusted Z key | CRLFの表示cursor7→source8、preLFのcursor7→source8、preCRLFのcursor7→source10。該当Textの該当表示位置だけへZを挿入 |
| pre全消去→保存応答→再入力 | 非表示prefix `\r\n` と同IDを保持し、`<pre>\r\n再入力</pre>`。outsideのsourceは不変 |
| 独立UTF16/entity/NBSP/foster | emoji中央t1だけ「漢🚀」へ変更。他4Text、NBSP/ampersand/漢、table構造を保持 |

HTML5全正規化や別位置の同文字列探索へ広げていない。source内の未解決対応・実DOM不一致は停止する。今回の投影値は表示準備だけに使い、DOM全serialize保存やcanonical parser置換はしない。

### 実行根拠

server/test/CLIはNode22.22.3。Chrome152、agent-browser0.36.0、専用session `hollow-c2-revision --restore`。script生成時の起動遅延や重複server起動はない。

```sh
pnpm --filter @repo/web exec tsx --tsconfig tsconfig.json /tmp/hollow-visual-revision.r3t0PN/server.ts
agent-browser --session hollow-c2-revision --restore open http://localhost:PRINTED_PORT
node --test /tmp/hollow-visual-revision.r3t0PN/projection.test.mjs
node /tmp/hollow-visual-revision.r3t0PN/revision.cjs
node /tmp/hollow-visual-revision.r3t0PN/offsets.cjs
node /tmp/hollow-visual-revision.r3t0PN/unicode.cjs
node /tmp/hollow-visual-revision.r3t0PN/guards.cjs
node /tmp/hollow-visual-revision.r3t0PN/matrix.cjs
node /tmp/hollow-visual-revision.r3t0PN/exercise.cjs
node /tmp/hollow-visual-revision.r3t0PN/reject.cjs
```

| 実行 | 結果/対象 |
| --- | --- |
| `projection.test.mjs` | 8/8成功。CRLF/CR、pre LF/CRLF、UTF16/NBSP、編集値、空prefix、未知prefix拒否 |
| `revision.cjs` | 最終exit0。VG-01〜03、元source保持、取消/遅延、貼付正常/拒否、pre空/再入力 |
| `offsets.cjs` | 4組成功。CRLF反復の二つ目、CR、preLF、preCRLFの改行後クリック/キー入力 |
| 独立 `unicode.cjs` コピー | exit0。CRLF/preがreadyへ回復、emoji中央編集を維持 |
| 独立 `guards.cjs` コピー | exit0。型/namespace/属性/Text/順序の5不一致は全てready=false/overlay hidden。mixed clipboardは修正後の受理を観測 |
| `matrix.cjs` | exit0。通常table、default/original、foster反復/clone、合成composition guard、390px。旧攻撃fixtureも同じ代表結果、leak0 |
| `exercise.cjs` / `reject.cjs` | 最終exit0。空Text保存応答/再入力、undo/redo、4対象のみ入力、trusted跨Text選択/画像drag拒否、投影不一致停止 |

15:03〜15:06にVG-03とUnicodeを確認。15:05の最初の回帰は「CLI fill一回＝undo一回」というhelper期待で失敗した。fillはclearを含む複数inputを送るため、既存のText単位undoをたどって元sourceへ戻る期待に修正した。compositionとpasteの一操作一undoは別に明示検証している。表示不変inputでsourceを正規化しない接続も追加し、最終回帰に含めた。

15:08〜15:11にoffset、5拒否、timestampを含む最終VG-01、VG-02/pre再入力が成功。15:11:51までに最終exercise/rejectを回収した。pure8件は最終projection sourceで再実行成功。元のmatrixは最後のtimestamp guard追加前に成功し、その追加後はrevisionで古い終了eventを再検証した。

`pre-reentry.png` と `mobile-wrap.png` は自身で画像確認した。390pxのpre再入力host、outsideの保持、originalの折返しtextarea/PNG/動画を確認した。媒体認可・codec・Range、全sandbox攻撃の新たな全面検証には数えない。mainのbuild/checks/test/DBは範囲外で未実行。

### 固定対象と終了

15:13:08 JST、元gate9ファイルと独立資材12ファイルを正式レビューのSHA256一覧へ照合し、全件一致。本体開始15:00:21と終了15:13:08も同一。

- HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、main。
- 541files `94087dc2221773740b8816f4ba2a30c34267dd0b4d5ae9fb2013f1755a1f527d`。
- lock `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`。
- git status集計modified23/untracked92。既存変更を保持、commitなし。
- 修正版temp15ファイルのsorted basename＋NUL＋bytes＋NUL集計: `75f2f9bbb1028ccc498e3d119d963ef9ceb4420beff051e83582a17d462209f5`。

| 修正版ファイル | SHA256 |
| --- | --- |
| server.ts | f1366ef43f1a32ca2a20d953796f0b9463c5c1260ea43931c01cca6bebd6119f |
| client.js | 815073504960dc7096d6217055d7acaecd5390e97b5ede62aed65c5045978b87 |
| projection.mjs | 530bd616aa5a5a06a43001df39f68d62ece56d0f1a10b84919c14d16fbf891bf |
| projection.test.mjs | b70c829ecf80b6215006d667139690e32bda87749e97d0ddbe6f7f08873127d1 |
| index.html | 691e84caa6c6f24179bf97459003d73db70443a68a7f535e32632974670ac69d |
| revision.cjs | 39ee1a3301f50b366a0e2a60a2342c3abed4ce5541545a23a2f9dfb0f3a5cf13 |
| offsets.cjs | 62031ec5876c46fda15a1728edea456ea1c12a8ce0d9dace09ccaff96edde832 |
| independent.cjs | d465a754413c4c9dd245dbb0694a4e83b217bf0eb3e0d0f65f4239be5ea37dbc |
| unicode.cjs | 2718ce87ee7fca26a6aa38392f5d811027ef00cef1f7b0ff7baa60f43d006fa1 |
| guards.cjs | 412d4580c919dfbe1e216fa80337e4ad5217c64fb085c65527e46f19b003a1a5 |
| exercise.cjs | 199d473a2376d908c31671012329edf69109994a6870ccf316a8f391918af066 |
| matrix.cjs | f42944e1aa49cd48509675f5e30e55f40d2b64d0966589348b7225d6cbbae25c |
| reject.cjs | abd1c0404229d089727de4dee006bb86baab81acc1815253acb65970285095c0 |
| pre-reentry.png | b70426ab5112931b5d8207e893f7bbbc7b68f6871980297451f59983221388ac |
| mobile-wrap.png | 523704d4a583f433a33c4c75d9d68c7b2c8a6e65317e7d5d195a754486224cee |

自分browserはclose成功。唯一の一時listener localhost57789/PID93513/session53697はSIGTERM→exit0、全helper/exec完了。元tempと独立tempは不変で保持した。production session3249/PID74924は存在確認のみ成功し、再起動・HTTP/DB操作はしていない。DB/storage/mailbox/全backup、395notes/36assets/442revisionsの受領対象を変更していない。実IME/nativepaste/OS file dropとG4/G5は未検証のまま。ここで全コード・browser・helper操作を停止し、独立再確認へ返却する。
