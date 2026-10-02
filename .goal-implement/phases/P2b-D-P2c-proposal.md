# P2b-D・P2c の接続提案

2026-09-06 09:06 JST。read-only source 調査による提案。機能実装、test、build、DB操作、環境操作、browser操作は未実施。P2b-C候補の独立合格を示す資料ではない。

入力は `spec/scenario/editing.md` ED01–08/11 と `.goal-implement/design.md`。対象は現在Cとの接続判断に限る。P2d、workspace、public、export の実装は含めない。

## 現在コードとの接点

| 現在のコード | 次のスライスで必要な変更 |
| --- | --- |
| `domain/note/entity.ts` の Note はhtml/title/versionのみ。`editNote` は呼出ごとにversion加算 | 表示styleと由来、意味のある保存の判定、保存原因・実行者を追加する |
| `application/note/saveNote.ts` は受信versionを利用者間競合判定に使わず、transaction内の最新noteから保存 | 同一利用者の後勝ちは維持し、別利用者変更の確認契約を別に追加する |
| note save、`import/processJob.ts`、`reference/processJob.ts` がそれぞれnoteを更新 | 共通のrevision保存へ集約する。I/Oやjob orchestrationは各usecaseに残す |
| reference worker はactive job・noteVersion・現権限・leaseを厳密に確認 | style/restoreでもguardを緩めない。新しい状態へ必要なjobを再scheduleする |
| `editorMedia.ts` のframeDocumentは既定CSSを常時挿入 | 表示style引数を追加し、既定CSSだけを切り替える。本文CSSやCSPを消さない |
| `NoteContent.tsx` は完成srcdocのみmountし、source/keyで旧responseを不採用にする | styleをsource/keyに含め、preview/detail/reloadで同じrender契約を使う |
| `note_asset_references.version=0` が現在参照、正数は版pin用の予約契約 | immutable revision pinを実装する。current読取と保持判定を混ぜない |
| richFragmentは未対応要素を平坦化し、styleを捨てる。textareaはhighlight/構文診断なし | visualとは別にWYSIWYG schemaとopaque block、HTML診断を完成させる |

## 最小順序

1. P2b-D: note表示style・初回判定・preview・保存・移行。
2. P2c-1: 共通保存、現在を含む20版、asset pin、履歴閲覧・復元、競合/退避。
3. P2c-2: Text-only visual、HTML構文診断/補正preview、共通モード遷移。
4. P2c-3: WYSIWYG基本操作、unsupported block、損失警告設定、prelossy snapshotと復元。

各スライスを本体UIと実DBで個別に受け入れる。版の安全網より先にWYSIWYGの破壊的正規化を拡張しない。visualとWYSIWYGで同じcontenteditable HTML serializerを共有しない。

## P2b-D: 表示styleの最小完了

### 保存値と描画

noteに `default | original` の表示値と設定由来を保持する。由来は `automatic | user | legacy` を区別する。自動判定待ちだけ別の初期化状態を持つ。表示値はnoteの永続設定、ユーザーの編集モード既定値は端末設定であり別物とする。

既定CSSと隔離を分ける。originalでは現在frameDocumentに埋めているfont/色/margin/blockquote/table/imgの既定装飾を適用せず、ブラウザの素の本文表示とsanitized本文自身のCSSだけにする。CSP、charset、iframe境界、inert link、認可assetと外部直読判定は両方で維持する。trusted既定CSSをHTML正本や参照候補へ混ぜない。

詳細の「表示スタイル」は現在値・由来を示し、選択中preview、適用、取消を提供する。適用はReact pending/optimistic表示を持ち、失敗は旧値へ戻して理由を示す。汎用saveNoteへ古いhtmlを丸ごと送り返さず、style専用commandで最新noteの本文/titleを保持する。本文編集側がstyleを変更しない保存では、clientが持つ古いstyleを上書きしない。

style変更は意味のある保存でversionを進める。現reference jobは古いversionの結果を不採用にし、現在対象へ新jobをscheduleする。既取得は同一note契約で再利用する。style変更だけを理由に古いworkerのversion guardを無視する例外は作らない。P2c-1でこの保存を同じrevision処理へ接続する。

### 初回判定の比較

| 案 | 現Cへの接続 | 失敗/off/後on/利用者選択 |
| --- | --- | --- |
| A: 最初の取り込み結果で一度判定 | conversion結果と最初のreference jobのterminal commitへ初期化状態を追加。active generation/lease/versionと同じtransactionで確定 | 実際に残るCSSに合わせられる。pendingと途中操作の終端化が必要 |
| B: 元sourceの装飾候補だけで即判定 | prepare時に非空style/style属性/stylesheet候補を見て一度保存。追加pending状態不要 | 失敗したCSSだけでもoriginalになり得る。offも「元source装飾あり」扱いか別規則が必要。後onや利用者選択は変更しない |

Aを第一候補とする。原ED11の「取り込み時の装飾判定」と、外部CSSは実取得しなければ装飾が当たらないED03の結果を揃えられる。Bは実装が短いが、装飾なしの結果を装飾ありと説明しないためにUIの意味を変える必要がある。

Aの最小状態は初期化pendingと初回reference jobの識別、初回安全本文の判定結果。任意の後続jobを「初回」と認めない。HTML文字列内のmarkerを識別根拠にしない。

- 新規白紙はdefaultで確定する。後でHTML/CSSを書いても自動変更しない。
- 機械変換後の安全本文に有効なstyle属性/非空stylesheet宣言が残ればoriginal。class名だけ、見出し・strong等の意味要素だけでは装飾ありとしない。除去済CSSを根拠にしない。
- 初回onのstylesheet取得対象がある場合、初回reference結果までpendingを保持する。pending中はdefaultの仮表示と「初回の装飾を確認中」を示す。
- 初回結果が部分成功なら、実際に適用されたCSSを含む安全本文で一度確定する。全失敗/上限/取消でCSSが残らなければdefault。後のretryは再判定しない。
- 初回offはconversion完了で確定する。外部CSSだけならdefault。後からonでCSSが取得されても既存設定を維持する。
- pending中の利用者によるstyle選択はuser由来で直ちに確定し、遅い初回jobが変更できない。
- pending中に通常本文/title編集で初回jobがsupersedeされる場合、記録済みの初回安全本文の判定で初期化を終える。編集後HTMLや新jobで再判定しない。UIには初回処理未完了時の判定だったことを示せる理由を残す。
- 初回jobがHTMLを変えない失敗でもpendingを終端化する。boot再開・claim上限・通常取消・version supersessionで永久pendingを作らない。

装飾判定は全computed style解析ではない。安全な宣言の存在による明示的規則である。初回reference結果によるHTMLとstyleの変更は一度のnote更新にまとめる。後の通常保存・CSS再取得・復元では判定し直さない。

### migration

既存noteは現在の見た目を維持して `default + legacy` にする。「既存ノートの設定を保持」と表示し、取り込み時の自動判定済みとは説明しない。現在のHTML/CSSを再取得しない。既存の進行中conversion/reference jobにもpendingを後付けしない。

新規importでだけ初回判定を開始する。移行でnote本文/title/versionやasset/原本を変更しない。Dで版履歴を先行実装せず、P2c-1移行時にその時点のstyleを含むbaselineを1版作る。

### Dの具体的合否

| 操作 | 合格条件 |
| --- | --- |
| 無装飾HTML/MDとinline装飾HTMLをimport | 前者default、後者original。初回由来を表示 |
| 遅い外部CSSをon import | pending表示→初回成功でoriginal。reload/bootでも一度だけ確定 |
| 外部CSS失敗、off import→後on、初回取消 | 初期結果で一度確定。後の成功/通常編集で勝手にstyleが変わらない |
| CSS取得中に手動style切替 | 遅いjobが手動値を上書きしない。jobの部分結果/cleanupは現C契約を維持 |
| originalをpreview→取消→適用 | 取消は永続値不変、適用は即時表示・pending・再読込保持。権限喪失ならrollback |
| 同時tabで本文編集とstyle切替 | style専用commandは新しい本文を失わず、本文保存は新しいstyleを戻さない |
| default/originalの悪性CSS・内部asset・link | 両方とも同じ安全判定。原本文のCSSを外側DOMに入れない |
| 既存note migration | 見た目維持、由来legacy、本文/asset不変。migration後の通常saveで自動再判定なし |

共有/public/export反映は同じnote値を後続のrender入口へ渡す契約だけ残す。未実装ページをDの合格に含めない。

## P2c-1: 共通保存・20版・復元

### 保存単位

NoteRevisionはimmutableなhtml/title/displayStyle、note内の順序、保存日時、実行者、原因、必要なasset pinを持つ。原因はmanual/autosave/title/style/import/reference/restoreを区別する。現在を含む直近20版であり、「過去20+現在」にはしない。復元は新しい版を作り、既存版を書き換えない。

意味のある値の変化だけを版にする。保存済みの明示保存、同値autosave、reference進捗/lease/失敗台帳だけの更新で空版を増やさない。HTML正本の保存値が変わるreference commitは1版。200参照の各progressごとに200版は作らない。HTML保存と後のreference反映は別の意味のある保存なので別版とする。安全化済み正本の同値を判定し、HTML byte不変を新しいユーザー要件にしない。

共通のtransaction内処理を note save、import commit、reference commit、title/style、restoreから使う。順序は最新状態/権限/各固有guard確認→正本変更→revisionとpin保存→current ref差替→20版超の行/pin削除→未参照猶予更新→job/outbox。storage I/Oやparser/HTTPをこのtransactionへ移さない。referenceのlease/generation条件は共通保存への入口で維持する。

既存noteには移行時のhtml/title/styleをbaseline1版として作る。過去のversion番号から実在しない履歴を捏造しない。version0=current参照のsentinelと、note初期version0をhistory pinに直結しない。revision用の正の保持番号または別revision IDとの明示mappingを持つ。

### asset pinと履歴表示

current参照とrevision pinを分ける。GCは両方がなくなってから7日猶予を始め、deletingへのfenceと実object削除後の容量解放を維持する。20版が同じassetを参照しても物理容量は1個分。20版を超えた古い版のpinを外した時、最後のpinがなくなるなら、その時点から未参照期間を数える。

「pinがあるから現在note asset URLで読める」にはしない。現在URLは現ref必須のまま。履歴previewは現在のnote閲覧認可＋指定revision所属＋そのrevisionのasset参照を毎回確認する読み取りscopeを持つ。履歴専用URLを表示時だけ生成してCSPへ渡し、正本の安定note asset URLへ混ぜない。HTTP GET/HEAD/Range/416の認可先行とFetch Metadata入口guardにも厳密に接続する。汎用asset全許可・bearer grantは作らない。

restoreは同じnoteの保持中revisionを権限根拠にassetを再添付できる。現在refにはないが版pinで保持されているassetを、7日graceだけで誤拒否しない。other note、削除済revision、deleting/不存在assetは拒否する。新upload24h期限は延長しない。既存の同一note編集draft由来7日再添付は別経路で維持する。

現在Cの小さいdata URI認可はcurrent ledgerに依存する。履歴preview/restoreではsnapshot内のdata URIを同じ検査器で再確認するか、検査済hash/MIMEをrevisionに紐づける必要がある。単にhistory htmlをcurrent renderNoteへ渡すと画像が欠落するため、asset pinと同じスライスで対処する。

### 復元とreference worker

restoreする値はhtml/title/style。取得on/off設定、失敗履歴、90日job履歴を過去へ巻き戻すとは解釈しない。原本・bundle関係も現在のnoteに属するまま保持する。

復元中の旧jobはversion/generation不一致で結果不採用にし、cleanupへ進む。復元HTMLから現在参照集合を作り直し、恒久台帳の過去記録は残す。埋込済CSS/内部assetを、現在版の別のCSS/別assetへ自動置換しない。`reuseReferences` は通常旧editor保存とrestoreで目的が異なるため、restore専用の検証モードを分ける。

復元後の未取得参照は現在のon/offに従って新jobへ渡せる。ただしUIで「復元を保存」と「復元後の未取得参照処理」を分け、後者が本文を更新したら新しいreference版を残す。過去に取得できたCSSを現在ネットワークから再現できる保証は置かない。既にsnapshotにある装飾はsnapshotを正とする。

### 競合・退避

ED01の同一利用者複数tabは後保存優先、他方へ通知。ED02/08の別利用者変更は確認を要求する。system/reference更新を「別の誰かが手編集」と同一に扱わない。workerのversion防御と利用者間競合は別の判定である。

clientのactorや上書き許可booleanを権限根拠にしない。base revisionとserver側の更新履歴/actorを照合する。直近のlastAuthorだけを見ると、別利用者更新後に本人が更新した間の競合を見落とすため、base以後の他利用者変更を判定できる契約にする。個人のみの現UIでは同一利用者の正反を実証し、別利用者判定は権限を差し替えたapplication testで確認する。workspace実装前に共有UI合格を主張しない。

上書き確認は現在revisionに結び付け、確認後にさらに更新されたら再確認する。通信/権限喪失/GCによる失敗はlocalbackupを残し、理由とダウンロードを示す。discardは最新の確認済み保存状態へ戻す。復元操作の前にもdirtyをsave/discard/cancelで解決する。

### C1の具体的合否

- baselineから21回の意味ある保存を行い、現在を含め20件。復元でversion増加・新しい現在が先頭。失敗保存・同値保存は版を増やさない。
- 手編集保存→遅いreference完了の2版、旧workerの結果不採用→版なし/cleanupを実DBで対にする。
- assetを現在本文から除去し、現在URL拒否・履歴preview許可・20版内restore再許可を確認する。別note/revision/匿名とRangeも拒否する。
- 時計portで7日超を進めても保持版pinがあればGC不可。最後の版pin除去後の7日猶予→fence→実削除/失敗再試行を確認する。物理quotaを20倍しない。
- 旧版のCSS、小さいdata SVG、大きいdata由来asset、参照offのbundleをrestoreし、snapshotの意味と現在台帳設定が混線しない。
- 同一利用者2tab後勝ち＋通知、base以後の他利用者変更＋確認、確認中の追加更新、権限喪失＋退避を分ける。

## P2c-2: Text-only visualとHTML

visualの正本は編集sessionのcanonical AST。画面DOM全体のinnerHTMLを保存しない。親trusted codeは、対応が確認できた既知Textに対する置換だけを受け取り、ASTのText値だけを更新する。要素/属性/CSS/node順序をpatch対象にしない。保存境界でもtext patchの対象・base・サイズを検証する。

現在renderはa→inert spanやasset URL除去などを行うため、レンダリングDOMの単純な全Text ordinalをcanonicalへ直結しない。canonicalとrenderの対応表を同じ処理で生成し、利用者入力のdata属性/IDを権限や対応根拠に使わない。tableの暗黙tbody等、browserとserver parserの構造差を検査する小gateを先に置く。必要なHTML5正規化の方式/依存は実装前に公式資料とbounded fixtureで確定する。本調査では新parser採用を確定していない。

beforeinput/paste/drop/key操作で構造編集を拒否し、本文選択を跨ぐ削除・改行・HTML pasteをText操作に限定する。MutationObserverによる事後rollbackだけを安全境界にしない。日本語IMEのcompositionを壊さず、完了後にText patchとして保存する。script/styleは対象にせず、media挿入UI/file dropも提供しない。

空になったTextはsession AST内で残す。親の選択/入力機構で全消去後にも再入力/undoできる。renderへ編集用wrapperやcontenteditable属性を加える場合も保存ASTへ混ぜない。HTML save/reloadを跨ぐ空Text nodeIdやbyte同一性は要求しない。本文空/編集可能Textなしのvisual選択不可を一貫させる。

HTML modeはhighlight、構文診断と補正後preview、除去一覧を完成させる。現在の800 KiBとCSS/parser予算を維持し、重い入力の診断をUI event loopへ無制限に載せない。通常canonical安全化による変更と、visualが構造を壊した変更を区別して表示する。

モード遷移は共通state machineとする。dirtyならsaveしてから切替を確認し、保存失敗/取消/未完了uploadなら元モードを維持する。保存後にserver canonicalを新モードへ渡す。端末の利用者単位local設定で既存noteの既定modeを保存し、新規は必ずWYSIWYG。visual不能時は理由付きでHTMLへfallbackする。

C2の受入対は、nested Text/class/style/data属性・リンク・表・日本語・全消去/再入力/undo、非Text変更拒否、schema不一致、権限/競合、HTML構文補正・除去、dirty切替成功/失敗。保存前後の要素/属性/tree比較と実描画を併用し、HTML文字列のbyte比較だけで合否を決めない。

## P2c-3: WYSIWYGとprelossy復元

既存richFragmentの平坦化を拡張し続けず、対応schemaとunsupported opaque blockを分ける。表/画像/コードブロック/リンクの基本編集を実装し、未知要素は安全化済みの元HTMLを保持するblockにする。未知blockの生CSS/HTMLをアプリ外側DOMへ挿入しない。挿入mediaの安定URL・alt・video nodeをtyping/normalizeで落とさない。

WYSIWYGへの移行は元HTML由来と変換損失を示し、確認しなければ変換しない。「今後表示しない」は警告表示の利用者設定だけで、snapshotや安全化を省略する権限ではない。設定画面で再表示に戻せる。保存前の自動版保持は警告を非表示にしていても行う。

prelossyは正規化直前の安全canonical状態を指す。既に保存済みならその現在revisionを基準にする。未保存HTML変更があるなら、共通mode遷移で先に保存し、そのrevisionを基準にする。変換済みDOMを先にautosaveしてからsnapshotを取る順序にはしない。

baselineは通常の20版枠に含む。別の永久隠し履歴や「20+復元用1」は作らない。損失保存直後はbaselineが残り、「元に戻す」はそのrevisionを新しい版として復元する。その後20版から外れた場合まで無期限復元を約束しない。UIは復元先が保持中か確認し、ない場合は理由を示す。

C3の受入対は、警告cancelでHTML不変、了解後初回typing/save→元に戻すで構造/属性/装飾/asset復元、警告非表示でもsnapshot保持、設定で再表示、未知block前後のtypingでblock保持、table/image/code/linkの操作とHTML再表示。巨大表/深いnestは理由付きHTML誘導とし、内容を無言で平坦化しない。

## Managerの採用判断が必要な点

1. 初回装飾判定はA（初回取り込み結果確定）を採用するか。pending外部CSS、途中user選択、編集による初回supersessionの終端規則は上記の小状態で固定する。
2. 既存noteはdefault + legacyで現在表示を維持する移行を採用するか。自動判定済みとは表示しない。

20版の現在含有、復元が新保存、Text-only/空Textのsession保持、byte同一性非要求は採用済みのまま。その他は既存契約を満たす実装順の提案であり、数や保持期間、共有/public/AIの要件を増やさない。

## 作業状態

本体候補は518files / `2fcdb382a1e07761d3aee209a54e038203b66d496b2dd8f236f75ca0e57508da` を固定対象として扱った。本体/依存/DB/環境/browserへの書込みなし。この提案書だけを作成した。検証候補の不具合確認へ介入していない。実装開始の委譲を待つ。

2026-09-06 09:06:14 JST、既存read-only fingerprint scriptをNode22.22.3で一度実行し、518files/同hash/HEAD91c68d4/lock7551535b…543e6の不変を確認した。遅延していた自身のsource検索execは完了回収済み。未完了の自身execはない。doc-style/markdown-styleで、採用済み条件と未採用案・未検証を分けて記録した。
