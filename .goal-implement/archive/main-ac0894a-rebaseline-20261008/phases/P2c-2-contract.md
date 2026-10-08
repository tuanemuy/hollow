# P2c-2 編集接続契約案

2026-09-06 13:46:42 JST以後のread-only整理。C1候補541 files / `94087dc2221773740b8816f4ba2a30c34267dd0b4d5ae9fb2013f1755a1f527d` を固定対象とする。本書だけを書き、source・依存・DB・環境・browser・fixture・test/buildを変更・実行しない。次フェーズの実装完了や独立合格を示す資料ではない。

入力はED-02/03/05、採用design、[先行提案](P2b-D-P2c-proposal.md)、C1の現保存・render・退避コード。C3のWYSIWYG schema/opaque block/lossy変換は詳細化しない。現在を含む20版、同owner後勝ち、他actorのexact確認、空Textのsession内保持、byte完全一致を要求しない契約は変えない。

## C1から変える接点

| 現在 | C2で必要な差分 |
| --- | --- |
| `EditorMode`、編集route search、backup readerはHTML/WYSの2値 | visualを追加し、mode遷移と端末既定を共通化。新規routeは常にWYS。旧modeなしbackupを維持 |
| mode buttonは直接setMode。WYSへの簡単な確認だけがある | dirty保存確認→既存save安定化→server canonicalで新modeを初期化。失敗・取消は旧mode/dirty/退避を保持 |
| HTMLはtextarea＋`NoteContent` preview | highlight、位置付き構文診断、補正previewと既存除去noticeを別に示す。raw sourceを診断結果で勝手に書き換えない |
| `htmlDocument.parseHtml`はhtmlparser2、domhandler、dom-serializer | session ASTのText値更新には使える。HTML5の実DOMとの同一木は保証しない。対応付け専用の投影・検証を加える |
| `NodeHtmlSanitizer.render`はa→inert span、href/media/CSS URLを変換 | canonicalのText identityとrender cloneのText由来を同時に追跡する。描画HTMLの全Text順をcanonicalへ直結しない |
| `NoteContent`は完成srcdocだけmountし、source/keyで旧応答を捨てる | readonly/historyは維持。visual専用islandで同じ安全render契約とText対応を使い、通常typingでiframe全体を再mountしない |
| `settleEditorSave`はinvalidate後に最新入力を再比較 | mode切替も同じ安定化に接続。V5の同ID保存、短い遷移ロック、最新入力の集約を再実装しない |
| `saveNote`→`commitNote`が版/pin/jobを整合 | Text編集結果もこの入口へ渡す。モード変更やpreview選択だけでは版・jobを作らない |

## 1. Text-only visual

### 正本と描画対応

sessionの正本は、サーバーが受理したcanonical HTMLを解析したASTとText値である。要素名・namespace・親子順序・属性集合/値は固定し、Text値だけを変更する。class/style/data-*、安定asset URL、原リンクhrefを固定側に含める。元属性と編集用情報を混ぜない。Text更新後のserializeではescapeし、入力された `<img>` を要素にしない。

モデルは三つを分ける。

1. canonical AST: 保存対象。session内Text IDと空文字を保持する。
2. render projection: canonicalを複製して既存安全render変換を適用した木。元Text IDへの由来をsidecarで保持する。trusted既定CSSやscript/styleのTextは対応表に入れない。
3. browser DOM: 完成srcdocの実木。HTML5補正後の期待木と照合してから、既知Textだけを親側WeakMapへ登録する。

clientのID、data属性、markerは認可根拠ではない。sidecarは同じrender応答・source generationに限定する。既存の `data-hollow-link` のような表示markerをcanonicalへコピーしない。利用者が同名data-*を持っていても上書き・削除せず、内部の対応はout-of-bandで持つ。

現在のhtmlparser2は厳密なHTML仕様準拠を目的とせず、公式READMEも厳密準拠にはparse5を案内している。htmlparser2のAST部分更新が可能であることと、browser DOMへ正しく対応できることは別の事実である。[htmlparser2公式](https://github.com/fb55/htmlparser2)

候補は既存htmlparser2正本を維持し、parse5をHTML5投影・構文診断に限って使う方式。parse5の `sourceCodeLocationInfo` と `onParseError` を利用し、render serializerが発行するTextのsource範囲/由来と照合する。暗黙要素にはlocationがないため、存在するものと捏造せず投影上の補助nodeと扱う。既定のscripting flagを放置せず、実sandboxのscript無効条件に揃える。[parse5公式API](https://parse5.js.org/interfaces/parse5.ParserOptions.html)

parse5はlock内に7.3.0、htmlparser2 tree adapterは7.1.0が既にあるが、core/webの直接依存ではない。採用時には直接依存・bundle配置・Node22互換を確認する。今回それらをimport/実行したとは扱わない。全sanitizer/参照parserをparse5へ置換する案ではない。

暗黙tbodyは投影にだけ現れ、保存ASTへ挿入しない。foster parentingではTextの移動・連結が起こり、単純な親pathやordinalでは元Textを特定できない。WHATWGは表内の複数Textが表の前の一つへ連結される例も規定する。この場合は対応segmentが一意でなければvisualを開始しない。[HTML Standard: tree construction](https://html.spec.whatwg.org/multipage/parsing.html#creating-and-inserting-nodes)

最初のgateは一対一Text対応と暗黙tbodyの正常対を必須とする。複数元Textが一つのDOM Textへ合流するケースやadoption agencyによる複製は、推測で1件へ寄せない。範囲対応まで小さく証明できなければ、その文書のvisualを理由付きで停止しHTMLへ誘導する。HTMLを補正保存してから再度visualを選べる。これは不正nest文書への運用上の制限であり、ED02の全入力に対する完了を無条件に主張しない。

### 入力方式の第一候補

親のtrusted textareaを選択Textの位置に重ねる小さい入力hostを第一候補とする。iframe本文全体や未知要素をcontenteditableにせず、利用者が選んだ既知Textだけを親codeから `.data` で置換する。hostはtrusted plain textで、未信頼HTML/CSSを外側DOMへ流さない。位置はRange矩形から取り、外側へ複製する装飾は許可したfont/line-height等の値だけに限る。外側の任意CSS規則をコピーしない。

この方式は通常のtextareaのIME入力を使える一方、折返したText/リンク内文字/mobileの操作感を実証する必要がある。対応nodeを選択する操作と入力欄のfocusが分離しすぎる場合は採用しない。browser内の任意Text編集機能を完全再実装する案ではない。

- 通常入力/削除/plaintext pasteは選択Textの値変更。改行はText内のLFで、段落やbrは作らない。元CSSによってLFが表示上折り畳まれることを案内する。
- 複数Textにまたがる置換、要素drag/drop、画像/動画file drop、書式操作は拒否し理由を示す。media挿入toolbarもvisualでは出さない。HTML clipboardはmarkupを実行せずplain textとして扱う。
- composition中は同じinput hostを維持する。途中のiframe再mount・mode遷移・autosaveを止め、compositionendでText patchを確定する。未保存退避には入力中の最新値を残せるが、DOM構造は取り込まない。
- Undo/redoはsessionのText patchと選択位置を対象にする。composition一回を一単位にまとめる。履歴版のrestoreとは別物とし、autosave後もsession内のundoは可能。undoが保存されればC1の意味ある版になる。
- 全消去後のText IDはsession ASTに残す。空の入力hostから再入力/undoできる。再解析・serializer roundtripで空Textを捨てない。新しいmodeへ移って戻る/reload後の空Text IDは保証しない。
- `beforeinput` を使う場合もIME中の取消不能を前提にする。MutationObserverの事後rollbackだけを構造保護にしない。trusted hostから受け付ける値とText patchの閉じた型が境界となる。[Input Events Level 2（Working Draft）](https://www.w3.org/TR/input-events-2/)

ASTでは編集不能なscript/style、trusted既定CSS、非Textのalt/title/CSS疑似要素contentは対象外。新規visual選択時は実際に選択可能なTextが0なら無効にする。空になった既存sessionの同Textを再入力可能にすることと、空本文へ新たにvisualを開けないことを分ける。hidden/display:noneだけのTextは実描画gateで除外し、常時textContentの有無だけで判定しない。

### 保存と検証の境界

通常saveNoteへ渡す前に、固定ASTと更新ASTの要素/属性/treeが同じでText値だけ異なることを純粋検査する。保存transportにvisual専用payloadを追加する場合は `{baseHtml, baseVersion, textPatches}` を入力検査・adapterのbounded解析へ通し、既知Text・期待旧値・サイズを確認してHTMLを構築する。別の保存/版/UoWは作らない。

baseHtmlやText IDを「server署名済み」または権限と扱わない。HTMLを書ける現在利用者が投稿する本文inputであり、現在note認可・C1のbase/actor確認・asset検証はsaveNoteが行う。対応不成立でfull DOM innerHTML保存へ黙ってfallbackしない。保持版がpruneされた長期editorでも、追加の隠しpin/21版を作らず、C1の不明base確認とlocalbackupを利用する。

自分のautosave応答後もsession ASTを毎回作り直さない。accepted canonicalの固定部分が一致する場合はText IDとundoを維持する。参照workerや安全化で固定部分が変わった場合は旧対応を破棄して再初期化する。入力中の新Textを古い応答で消さず、C1の最新入力比較・失敗stayへ接続する。他人の変更の自動mergeは追加しない。

## 2. HTML highlight・診断・補正preview

HTMLソースは既存 `draft.html` のraw inputを正本とする。highlightは表示だけ、構文診断は非権限情報、保存時の正本は既存server canonicalである。lexer/parserのtoken HTMLをdangerouslySetInnerHTMLへ流さず、editor自身の文字描画を使う。

候補はCodeMirror 6のHTML language support。既存依存にCodeMirrorはない。公式にHTML language packageとDOM view packageがあることを確認した段階で、固定version/追加bundle量/Node22/build互換は未検証。採用時に必要な小構成だけを固定し、C3のWYS editorをこれで代替しない。[HTML language](https://github.com/codemirror/lang-html)、[DOM view](https://github.com/codemirror/view)

parse5の診断は「HTML5の構文補正」の警告であり、全HTML/CSS妥当性検証ではない。壊れた閉じtag/不正nest等にsource位置と理由を示す。正常な省略tagや暗黙tbodyを全てエラーと断定しない。highlightと構文エラーの根拠を分ける。

previewは現在の `renderNoteFn` を通した安全本文を表示する。そのHTMLをbrowserが補正した結果が利用者の実表示であり、parse5の未安全化出力を直接srcdocへ渡さない。diagnostic responseとpreview responseを同じsource generationに結び、遅い応答を捨てる。構文補正の案内、sanitize除去一覧、CSS制限noticeは別見出しで示す。既存の保存後除去noticeを次のautosaveで無言消失させない。

不正構文を理由に保存を永久禁止しない。診断完了と補正previewが出る前にその世代を自動保存せず、警告を出して既存の安全化保存へ進める。syntax補正自体に新しい必須確認ボタンを追加するかは実装時の小さいUI判断に留める。診断timeoutは「構文正常」ではなく「診断を完了できません」。raw input/退避を維持し、分割か再試行を案内する。

### 資源境界案

- 保存800×1024 bytesは既存境界を維持。800KiBを超えた貼付内容を黙って切り詰めない。編集・退避は残し、保存/解析を拒否して分割を促す。
- visual投影はnode1万・深さ128を上限にし、超過時は選択不可。既存 `parseHtml` はparse後にoverBudgetを立てるので、これを解析前のCPU停止保証とは呼ばない。
- HTML診断/投影は専用workerまたは既存の隔離に沿うadapterで行い、世代更新時に古い作業を取消す。初期候補は診断1秒、投影2秒、診断100件で表示打切り。deadlineを越えたsourceを成功扱いしない。これらは原要件でなく運用値、gateで反応性を確認する。
- undoはText差分100操作/合計8MiBを初期候補とし、古い操作を落として範囲を表示する。現在値/localbackupは落とさない。C1の20版とは別の揮発UI上限である。
- 既存CSS512KiB/AST10万/照合200万、参照200件/100MiBを緩めない。CSS解析やDNSを毎key strokeでUoWへ持ち込まない。

## 3. mode遷移とC1

`editing → confirmSave → saving → preparingMode → editing` の短い状態をNoteEditorの共通所有に追加する。複数mode requestは一つに絞り、保存/入力の所有者を増やさない。

- clean: 対応可能性を確認して新modeを初期化。mode変更だけでnote/version/版/jobを変更しない。
- dirty: 「保存して切り替える / 取消」。保存成功だけで切替可。破棄は既存の明示破棄操作へ分け、mode buttonで無言破棄しない。
- 保存中の追加入力: `settleEditorSave` のinvalidate後比較を使い、同IDの最新値まで保存してから遷移する。準備中の短いロックのみ、通常の保存中入力は維持する。
- 保存/診断/認可/競合失敗: 旧modeとraw本文・title・退避を維持。current versionへの一回確認後にさらに更新されれば再確認。対象modeの端末既定もまだ更新しない。
- upload未完了: 現在の待機/除去/retry案内を維持し、visualへの切替でassetを落とさない。composition中も移行しない。
- 成功: 保存応答のcanonicalを新modeへ渡す。古いclient styleで最新D値を上書きしない。参照jobが後で本文を変更した場合も既存通知とversion guardを使う。
- WYSへの進入は現在の警告を維持し、C3用の確認hookを残す。opaque/schema/prelossyの完成をC2のmode確認で代用しない。

端末設定は `hollow:editor-mode:<userId>` の検証済み3値を候補とする。既存編集の優先順位は「復元中backup mode → 明示route mode → 利用者の端末既定 → HTML」。不正値/storage拒否はHTMLと案内へfallbackする。選んだvisualに対象Textがなければ理由付きHTMLへ移り、利用者が選んだ端末既定を勝手にHTMLへ上書きしない。新規初回は端末/route指定によらずWYS。ただし新規失敗のbackup復元は元modeを尊重する。

backupのmodeは作業復元、端末既定modeは次に既存編集を開く選好として区別する。旧modeなしbackup・旧new-only退避を読めるままvisual値を追加する。IDは認可根拠にしない。保存成功後のnew/stable両keyと移行情報cleanup、失敗時の同note復元、mode付きJSON downloadをC1のまま回帰する。

「破棄」は最後の成功canonicalへ戻す。visualではAST/対応/undoをその基準へ戻し、HTMLではraw inputを戻す。履歴preview/restoreへ進むときはC1のsave/discard/cancelを使う。restore後のserver canonicalから新しいsessionを作り、選択しただけの過去本文をautosaveしない。

## 4. 次フェーズ冒頭gate

今回の実行は禁止されているため、全ケース未実行。次の委譲後、少数fixtureでprojection gateを先に行い、本体へ広く接続する前に結果を返す。

| Gate | 正常対 | 拒否/停止対と観測 |
| --- | --- | --- |
| G1 AST⇄DOM | nested inline、同じ文字を複数箇所、entity/NBSP/日本語、a→span、通常tableの暗黙tbody | foster parentingでText合流、misnested b/iの複製、壊れたp/div。誤ったTextへ対応する場合は全体停止。一意に証明できない文書はvisual不可としHTMLを保持 |
| G2 Text操作 | 置換/全消去/再入力/undo/redo、空白のみText、折返しText、IME確定/取消、mobile focus | cross-node削除/drag/file drop/HTML paste/書式操作で要素属性の変化0。IME中にiframeが再mountする、消したTextへ戻れない、属性を失う場合は方式を採用しない |
| G3 隔離 | 実sanitizer、完成srcdoc、default/original、内部media/current認可、inert link | 同名data-*偽造、script/style、event/URL、未知対応。外側DOMへの未信頼style挿入、iframe script実行、表示URLを正本へ混入したら停止 |
| G4 source/診断 | 正常省略tag、壊れたnestの位置警告と実補正preview、sanitize除去一覧 | 日本語含む800KiB境界、深さ/件数/timeout、古い解析応答。切詰め/無診断成功/新入力の上書きは不合格 |
| G5 mode/save | clean/dirty切替、両modeの保存中追加入力、server canonical、端末既定と新規WYS、backup visual値 | 通信失敗/権限喪失/競合、upload中、noText、storage禁止。stay/退避、版数不変か意味ある変更だけ、V5同ID/両keyを確認 |

G1/G2は本番と同じsandbox条件の実Chromeを最低限にし、IMEは合成composition eventだけで実機IME成功としない。実入力手段がない場合はその点を未検証としてManagerへ返す。各構造比較はcanonical ASTの要素/属性/順序、投影DOMの要素/属性/順序を分け、HTML byte比較だけにしない。新しい全OS/browser保証は置かない。

## 判断点

1. 正本parserは維持し、parse5を投影/診断へ限定追加する案を第一候補とする。一意対応できない不正nestは理由付きHTML誘導。gateが通常tableまで拒否する、または別Text更新を防げない場合は本体実装を止め、parser統一による正本構造変更を勝手に採用しない。
2. visual入力は親trusted textarea overlay、HTML highlightはCodeMirrorの小構成を第一候補とする。前者は実IME/選択/折返しのgate、後者は固定依存/build/資源確認後に採用する。操作感がED02の直接編集に届かない場合は、本文contenteditable全許可へ緩めずManagerへ返す。

どちらも可逆的な実装方式の提案。原要件の構造/属性保持を緩和する案ではない。不正nestのvisual利用不可は追加の運用制限となるため、成功範囲と拒否範囲を採用判断へ明示する。C1共通保存・保持数・pin・権限・worker条件の変更判断は不要である。

## 作業状態

本書以外への書込み、依存追加、fixture作成、Node/browser/helper起動、test/build、DB操作はない。公開一次資料へ既存利用者dataを送信していない。C1検証への介入はせず、実装委譲を待つ。

2026-09-06 13:51:12 JST、clockで報告時刻を確認。read-only source参照と文書作成を終了し、書込みを停止する。固定hashは引継ぎ値であり、今回新たなfingerprint実行による再検証はしていない。
