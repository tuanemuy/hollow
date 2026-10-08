# P2c-3 接続契約案

2026-09-06 17:14:13 JST 完了時計。読み取り専用の設計提案。C3の方式・依存・運用値は未採用、実装・試験は未実行。C2候補の独立合格を示す文書ではない。

対象は ED-04/05/08 と ED-01/06 の共有編集条件。正本HTML、現在を含む20版、同値保存の扱い、現在認可と履歴pinの分離、C2の最新入力保持は変更しない。C2の受入とManagerの委譲前に本体へ接続しない。

## 現在の再利用点と不足

| 接続点 | 現在の実装 | C3で加える責務 |
| --- | --- | --- |
| `NoteEditor.tsx` の `RichText` / `richFragment` | 許可tagを再構築し、その他は平坦化。styleを除去し、内部画像・動画は維持。`execCommand`とDOMの`innerHTML`を保存入力にする | 型付きschemaと独自のHTML変換境界。未知の安全な内容を保持し、表・コード・リンク・altの操作を提供 |
| `requestMode` / `changeMode` | WYSへの明示切替だけnative confirm。dirty保存より前の警告。初期既定・退避modeの解決は別経路 | 全WYS入口を一つの準備・警告契約に接続。dirty settle後のcanonicalで判定 |
| `settleEditorSave` / `editorSave.ts` | 保存中の追加入力を同noteへ集約。退避mode、new→stableの両key、失敗復元、JSON download | WYSの変換済み最新集合と未確定入力を既存read/acceptへ接続。保存ループを複製しない |
| `saveNote` / `commitNote` | 現在認可、actor競合、参照再利用、asset関係、版・pin・20pruneを同じUoWで整合 | 最初の損失保存で変換元revisionの保持を確認し、応答へ復元対象を返す小さい契約 |
| `history.ts` / `NoteHistory` | server-loaded版、現在認可・正確pin、CSS snapshot・小data再検査、exact version復元、同値無効 | 「WYS変換前に戻す」を既存のpreview・確認・復元へ案内 |
| `renderNote` / `frameDocument` | 安全canonicalと表示HTMLを区別。current asset・外部URL判定・inert link・sandbox/CSP | 未知要素の表示はこの経路の完成文書だけを利用。保存用fragmentと表示用HTMLを混同しない |
| `useEditorMedia` / `editorMedia` | draft・stable URL、進捗・retry、alt、容量・内容検査 | schemaのimage/video nodeへ挿入し、前後typing・表操作・undoで保持 |

現`NoteView.original`にformatはない。HTML由来を厳密に表示するなら、既存`Original.format`を認可済みDTOへ加える。ファイル名や利用者の`data-*`から由来・権限を推測しない。現在のroutesに設定画面はなく、警告再表示には最小の「この端末の編集設定」導線が必要。

## 編集モデルの候補

ProseMirrorの必要な小構成を第一候補にする。HTML全体を汎用DOMParserへ渡し、読み落としを事後に推測する方式にはしない。Hollowの安全canonicalから明示的なschema変換を行う。ライブラリのモデル・view型はweb adapter内に閉じ、domain/applicationへ持ち込まない。

候補schemaは段落、見出し、引用、箇条書き・番号付きリスト、改行、コードブロック、表・行・見出しセル・通常セル、image/video、strong/em/underline/code/link。見出しレベル、開始番号、セルspan、alt、URL等は項目別の型と境界検査を持つ。操作は見出し・リスト変更、表作成と行列追加削除、セル文字編集、コード編集、リンク作成変更解除、画像alt変更を最小完了範囲にする。複雑表の全操作や全CSS編集を約束しない。

モデルのatom指定・内容制約を使えることは[公式schema実装](https://raw.githubusercontent.com/ProseMirror/prosemirror-model/master/src/schema.ts)、custom node viewを持つことは[公式view実装](https://raw.githubusercontent.com/ProseMirror/prosemirror-view/master/src/viewdesc.ts)で確認した。表moduleにはrowspan/colspanと行列操作がある。[公式tables README](https://github.com/ProseMirror/prosemirror-tables) これらは採用可能性の根拠であり、Hollowでの保持・安全・Node22/build成立の証明ではない。

公式docsサイトは403だったため公式repositoryを参照した。参照日は2026-09-06。masterは可変であり製品versionは未選定。実装前gateで必要packageだけを固定し、license・exports・Node22・SSR/client境界・lock・bundleを確認する。依存導入は今回行っていない。

### 未知要素と装飾

`opaqueBlock`と`opaqueInline`を区別する。未知inlineをblockへ強制変換し、段落・表の意味を変えない。保存対象は安全canonicalの部分木であり、表示側のinert linkや認可URL変換結果ではない。

- セッション内の型付きsidecarがgeneration、fragment ID、元の安全AST部分木、配置種別を保持する。利用者の同名属性を予約IDとして解釈しない。IDは認可tokenではない。
- 通常の未知blockはtrustedなラベル・選択枠として表示する。選択、明示削除、undo、HTMLで編集する導線を持つ。内部の直接編集はしない。選択前後のBackspace/Deleteで意図せず内部を平坦化しない。
- 未知inlineは短いtrustedラベルをatomicなinlineとして扱う。前後の文字やmarkと境界を保てない入力は、親の最小の安全な部分木をopaqueとして保持する。通常の段落・表まで無条件に全opaque化しない。
- 正常な未知属性・class・装飾は、保持可能な部分木ならsidecarへ残す。対応nodeの属性を消す必要があるときは損失項目に含める。すべての属性を親DOMへコピーする保存方法は採らない。
- stylesheetなど編集対象でない安全な文書装飾は、boundedな文書sidecarとして保持する候補にする。親DOMへstyleを挿入しない。DOM構造変更時は既存CSS policyを再適用するため、保存時の除去noticeとWYS表現損失は区別する。
- namespaceや不正nestをschema内で一意に保持できなければ、該当部分のopaque保持またはHTML編集を案内する。生HTMLを親へ戻すfallbackは禁止。通常table、未知inline混在、SVGを含む安全部分木をgateで対にする。

opaqueの詳細表示は、既存renderの完成文書を別preview枠で表示する。初期案は一つの選択対象previewに限定し、opaqueの数だけiframeを同時生成しない。保存は独自serializerでschema nodeとsidecar部分木を組み合わせ、その結果を既存の安全化・参照・保存へ渡す。DOMの`innerHTML`やライブラリJSONを正本へ変更しない。

親のeditable DOMはtrusted schemaの生成結果だけにする。linkは編集用の非遷移表現で保持し、「開く」は既存のtrusted親検証による明示操作だけにする。外部mediaやopaque由来のURLを親DOMで直接読ませない。内部mediaもサーバーの現在認可を通し、scope一致だけで認可済みとはしない。挿入・表示のためにsandbox flag、SameSite、grant、Fetch Metadata境界を緩めない。

## 型付き状態とモード切替

概念型の候補は次の責務までとする。具体的なschema JSON型はadapterが定義する。

```ts
type WysPreparation =
  | { kind: 'preparing'; generation: string; source: EditorDraft }
  | { kind: 'blocked'; generation: string; source: EditorDraft; reason: string }
  | { kind: 'confirmation'; plan: WysPlan }
  | { kind: 'editing'; plan: WysPlan; documentChanged: boolean };

type WysPlan = Readonly<{
  generation: string;
  source: EditorDraft;
  base: { noteId: string; version: number; revisionNo: number } | null;
  loss: readonly WysLoss[];
  opaque: readonly OpaqueFragment[];
}>;

type WysLoss = Readonly<{
  kind: 'element' | 'attribute' | 'style' | 'structure';
  location: string;
  reason: string;
}>;
```

`base:null`はまだ保存されていない新規だけに使う。既存noteの変換元はserverの認可済みheadとcanonicalから得る。任意client HTML＋revisionNoを「その版の内容」として採用しない。sidecarをPOSTする専用保存権限は作らず、最終HTMLは従来の未信頼入力として検査する。

遷移は `旧modeの最新入力 → dirtyならsettle保存 → server canonical → WYS準備 → 警告 → WYS host mount`。準備や警告だけでHTML、note、revision、jobを変更しない。titleだけの変更ではWYSの未編集本文を正規化せず、元canonical HTMLを保存する。

警告取消は旧modeと最新入力を保持する。先行したdirty保存が成功していても、それを取り消すための古い版保存は行わない。準備中や警告中に入力が進んだ場合、古いplanを採用せず最新集合から準備する。composition・upload・未完了patch中は既存の案内とhost保持を使う。失敗時は旧mode・raw退避を維持する。

最初のschema本文編集から変換後HTMLをdirtyとして扱う。モデルが変わらないselection・focus・mode選択ではautosaveしない。複数入力のserializerが遅延しても入力集合を捨てず、C2と同じく置換してよい解析結果と保持すべき入力を分ける。自分の保存応答で対応構造が同じならundo・selectionを維持し、外部workerや安全化で構造が変わったら最新入力を保持して再準備を求める。

### 警告の全入口と端末設定

新規の空WYS初回は警告不要。既存noteの明示切替・端末既定・明示route、退避復元によるWYS入口は同じ準備を通す。初期mode設定だけで`RichText`を先にmountしない。既定WYSで取消した場合はHTMLを代替表示し、端末既定を勝手に書き換えない。

HTML取込由来と構造・装飾の損失候補を説明する。安全化による危険要素除去、WYS schemaによる表現損失、opaqueとして保持するが直接編集不可な内容を別欄にする。「今後表示しない」はこの端末のこの利用者の警告だけを抑止する。例として`hollow:wys-warning:<userId>`のversion付き小設定を候補とし、mode既定・backupmodeと分ける。不正値・storage拒否は警告表示へ戻し、抑止を記録したと偽表示しない。

設定導線は認証済みshellから開く「この端末の編集設定」とし、警告再表示の一項目から始める。全account設定や外部連携を前倒ししない。reset直後とreload後の再表示、利用者A/Bとmode/backupへの非干渉を確認する。

## 実質損失とprelossy

損失の判定は、安全canonicalとschema変換・再合成結果の型付き差分に限定する。属性順、引用符、既知の同値tag等のserializer差と、要素・属性・style・構造の消失を分ける。opaqueとして保持した部分木は消失に数えない。全computed style・cascade・pixel同値は保証しない。判定が資源上限で完了しない場合は「損失なし」にせず、rawを保持してHTML編集を案内する。

この差分は利用者への説明であり、C1の`sameNoteContent`を別の曖昧な意味比較へ変更しない。cleanなmode準備は元canonicalを維持し、本文編集で正規化を伴うHTMLが保存された時は既存の共通版にする。警告非表示でもprelossyの確認を省かない。

prelossyは正規化前の安全canonicalを持つ既存の保持revisionであり、別snapshot tableや本文を複製する永久backupではない。未保存HTML/visual入力は先にC2 settleで保存し、そのserver headを変換元にする。新規空WYSの最初の入力前に空baselineを作らない。

最小追加は、最初の変換保存に任意の`wysOriginRevisionNo`をshape検査して渡す契約を候補にする。保存usecaseは現在認可・同note所属・変換元保持を検査する。この値で本文・asset認可を付与しない。`commitNote`が新revisionNoを決める際、その保存直後の20pruneでも変換元が残ることを同じUoWで確認する。残らない場合は無断で21版にせず、未保存と退避を維持して最新状態で再準備を案内する。実装時はこの不足を通常の競合と区別した安全な理由にする。

同ownerの他tab更新は通常の後保存優先を維持する。ただし提示した変換元が保持されなくなる場合の回復手段を偽らない。他人actorの確認は既存のexact current versionを使い、確認後の再更新で再確認する。遅いreference結果は既存version/lease guardで不採用とする。

保存応答は実際に残った変換元revision識別を返す。本文を複製せず、新版に`wysOriginRevisionNo`等の任意由来metadataを持たせる案ならreload後も「変換前へ」の導線を再構成できる。prune済みの参照はUIで無効にする。これは新たな保持pinではない。最初の変換保存以降の通常typingで同じ元版を無期限pinしない。

「元に戻す」はserverの保持確認→履歴preview→現在版確認→既存`restoreRevision`。DOM undoと永続版復元を区別する。dirtyなら既存save/discard/cancelを先に解決する。復元はHTML/title/styleを新しい版にし、user/complete、CSS snapshot・data再検査・current assetをC1どおりに扱う。現在と同値なら復元無効。on/off・台帳・bundleは巻き戻さない。prune済みなら期限切れ理由と現在の履歴を示し、隠れた本文から復元しない。

## 保存失敗・reload・退避復元の補足

2026-09-06 17:18:13 JST 補足完了時計。以下も未採用の接続案であり、実装・試験は行っていない。

### 最新本文と変換元を別に保持する

退避の`title/html/mode`は最新の未保存入力を表す。prelossyの識別はそれとは別の任意metadataであり、変換前本文をlocalStorageへもう一つ永久保存する契約ではない。現在の4key download、`format/title/html/mode`は変更しない。downloadにはorigin、認証情報、他人のデータを追加しない。downloadからは最新本文をHTMLで回収できるが、変換前版の識別が付属すると約束しない。

local backupの任意metadata候補を次のようにする。modeとは独立し、変換済み入力をHTMLモードへ切り替えても変換前由来を勝手に付け替えない。

```ts
type WysBackupContext = Readonly<{
  version: 1;
  contentStage: 'wys-transformed';
  origin:
    | {
        kind: 'revision-hint';
        noteId: string;
        revisionNo: number;
        capturedNoteVersion: number;
      }
    | { kind: 'new-without-baseline' };
}>;
```

`revision-hint`は照会の手掛かりであり、sourceの真正性・利用者の承認・現在権限・asset pinを証明しない。整数・UUID・version等のshapeを検査し、認可済みの同note保持revisionをserverで読み直す。clientの`capturedNoteVersion`もserverの版と照合する比較値にすぎない。実際にその変換器を経たという事実をclient値だけで永続監査へ記録しない。候補の新版由来metadataも「serverが所属・保持を確認した復元先」として扱う。

metadataは最新HTMLと同じbackup JSONへ一度に書く。opaqueの保存対象はHTMLへ再合成して含め、session fragment IDしか退避に残らない状態を作らない。由来metadataの更新だけで`sameDraft`の内容比較を変え、autosaveや版を発生させない。

既存の利用者namespace、stable key先書き→new bridgeの順序を維持する。new→stableの移行途中も同じ本文とmetadataを両keyへ渡す。新規空由来の`new-without-baseline`は、note IDが発行されたという理由だけで最初の保存版を「変換前」に置換しない。元から存在しない空baselineは作らない。

旧mode無し、旧new-only、metadata無し退避は既存どおり読める。不正metadataだけを理由に有効なtitle/htmlを捨てない。由来は未確認にし、本文回収を残す。storage拒否や一方keyの書込み失敗では成功cleanupを行わず、最新入力と既存4key downloadを維持する。

### 復元の順序と状態

1. backup候補を読み、復元/破棄の選択が済むまでWYS hostをmountしない。本文と任意metadataを一緒に選択する。破棄はserver canonicalから通常のWYS入口をやり直す。
2. 復元する最新本文をrawとして先に確保し、downloadを利用可能にする。origin照会やschema準備が失敗しても、この値をserver本文や空文字へ置換しない。
3. `revision-hint`を現在認可・note所属・保持版・captured versionへ再照合する。結果は`checking / available / unavailable`のsession状態にし、localStorageに残った`available`を信用しない。「元に戻す」の実行時も既存history経路で再認可する。
4. `contentStage:wys-transformed`は新たな変換元canonicalとして扱わない。最新本文の安全化・schema再構成は行うが、originは確認した元のrevisionのまま維持する。再構成で追加損失が出る場合は説明してHTML回復を残し、最新本文を黙って再正規化しない。
5. 既存HTML由来・既定WYS・復元modeの警告契約を通し、「未保存のWYS編集を復元する。変換前に戻せる版は確認済み/未確認」を区別して表示する。取消はrawをHTMLで扱える状態にし、退避を消さない。
6. 同noteへの保存成功後も、より新しい入力があればその本文とorigin contextを退避し続ける。settleで全入力が保存されてから両key/移行情報を既存どおりcleanupする。保存応答が失われた場合は成功と決めつけず、認可済み現在値を再取得して既存no-op/競合契約で再試行する。古いresponseで新しい本文・origin contextを消さない。

保存成功応答でserverの由来metadataを受け取ったら、それを保持中の復元先表示へ反映する。sessionの未確認hintを成功応答より優先しない。再読込後の由来が不明なら、現在版を変換前と推定して補わない。

### 確認できないoriginと回復

| 状態 | 最新本文 | 「変換前に戻す」・保存 |
| --- | --- | --- |
| 通信失敗・照会中 | raw/退避/downloadを保持 | 未確認表示。由来付き初回変換保存は照会・再試行待ち。勝手に新baselineを作らない |
| 別note・不正metadata・保持版なし | 有効な本文の回収を維持 | 復元先は無効。別noteの版/assetを借用しない |
| 現在権限喪失 | 最新4key downloadを利用可能にする | 本体保存と履歴取得・復元を拒否。過去に読めたmediaを新しい権限として使わない |
| 他tab進行で元版がprune済み、または今回の保存でpruneされる | 変換済み本文を未保存のまま退避 | prelossy保証付き保存は拒否。最新本文をHTMLで回復する明示導線を残す |
| 通常の保存後20版進行で元版が消えた | 現在の保存済み本文は維持 | 由来表示だけ「保持期間外」にする。通常編集を過去originのため永久に停止しない |

HTML回復は、退避の最新本文をそのままHTML編集へ渡す操作であり、消えた変換前本文を復元した扱いにはしない。「変換前の版は確認できません。最新の未保存HTMLを回復します」と明示する。利用者が選んだ後のHTML保存は現在認可・最新確認・安全化・asset関係の通常契約に従う。自動fallbackでorigin guardを迂回しない。元HTMLが復活したと偽表示せず、別note新規作成も勝手に行わない。

metadata無しの旧WYS退避も同様に、元版不明のまま本文を回復できる。既にschema変換済みか不明な古い退避を、現在版に由来すると推測しない。未確認内容のWYS再構成は追加損失説明と取消可能な準備に限定し、HTML回復を常に残す。

## Gateの分離と補足合否

実装前gateは一時モデル・converter・host・退避codecの成立を扱う。本体接続gateは実認可・C1 UoW・20版・C2 settle・reloadを扱う。前者の固定test-only originを後者の認可成功に読み替えない。

| 境界 | 実装前gate | 本体接続gate |
| --- | --- | --- |
| 警告と無変更 | HTML由来/explicit切替のplanに損失を表示。新規空は免除。selection/focus/no model changeでserializer結果を保存入力へ採用しない | dirty settle→警告取消で旧mode/最新入力。新規無入力はnote0。titleのみは正当なtitle版1件だが本文不変、WYS変換に起因する版・jobを余分に作らない。既存参照schedule契約は変更しない。既定/backup入口も同じ警告 |
| opaque保持と削除 | 未知inline/blockの前後typingで元部分木維持。明示選択→削除は利用者の編集として反映し、undoで同じ部分木・属性・順序へ戻る | 保存/reload/再編集でも未削除opaqueを保持。明示削除は版に残り、版復元でmedia/CSSも既存認可経路へ戻る。serializerの無言欠落を明示削除と偽らない |
| 表・namespace | 非対応部分から最小の有効な祖先までだけopaque化。隣接する正常段落/表を編集可能に保つ。table全体の整合を要する場合だけ当該table単位とし、本文一律opaque化は不採用 | 実sanitizer/render前後で安全部分木を保持し、両styleで再表示。HTML勧奨は非対応理由と範囲を示す。通常入力の恒久非対応はgateだけで採用しない |
| origin/prune競合 | 指定originとpost-commit保持集合の境界判定。20版の最古が今回外れる対と直後も残る対。schema再構成でoriginが新値へ置換されない | 実DBで確認後の他tab保存→由来付き初回保存を拒否/退避。成功直後origin保持。以後通常20pruneで表示無効、現在本文・通常保存は維持。21版・追加pin0 |
| 失敗復元 | typed backupの任意metadata、旧mode無し/new-only、不正metadataでも本文保持、opaque含むHTML再合成、4key download不変 | 変換編集→保存失敗→追加入力→reload→同note最新本文＋元originを復元。new/stable両key、返答紛失、権限喪失/prune、成功cleanup、HTML回復を実UI/DBで対にする |

## 運用境界と実装前gate

既存の800KiB HTML、DOM1万・深さ128、CSS512KiB・AST10万・照合200万、mediaの内容・容量・認可制限を維持する。schema変換・差分・source再合成はWorker/adapterでboundedに処理し、UIの編集transactionとサーバーUoWへ解析I/Oを入れない。

追加候補値は変換・差分2秒、損失一覧100件＋総件数、undo100操作か8MiB、opaque preview同時1件。表はまず1000セル超、リスト等の編集深さ16超をHTML推奨の候補にする。いずれも未測定の運用候補であり受理上限ではない。推奨閾値を超えた正常内容は削除せずopaque/HTMLで保持する。総byte/時間超過で内容を切り詰めない。

gateは次の二つに限定する。C2固定検証中には実行しない。

1. 変換・保持gate: 通常見出し/リスト/表・セル結合・日本語/CRLF/コード/リンク/image/video、未知inlineとblockの前後typing、style/class/data-*、namespace、不正nestを対にする。無編集・titleのみ・取消で元HTML保持。対象編集後のHTMLと安全再表示、実損失分類、opaque欠落0を確認する。表moduleの自動補正が既存内容を消す、未知inlineが無言block化、未信頼CSSが親へ入る方式は不採用。
2. 実host・保存gate: desktop/mobile/keyboard、toolbar/selection/undo、HTML+plain pasteのplain化、fileは既存media経路、composition期間のhost保持を実Chromeで確認する。real IME/nativepaste/OSdropは利用可能な実手段と合成guardを区別する。dirty切替・警告取消・抑止/reset・既定/backup入口、V5保存待ち追加入力、変換前revision保持→初回保存→reload→復元、20prune境界と失敗退避を本体接続で確認する。

gateで失敗した通常入力を恒久非対応と勝手に確定しない。曖昧部分のopaque化・HTML誘導の範囲と、基本編集が成立する対をManagerへ戻す。全schemaや全clipboard HTMLを手製で解析する代案には拡張しない。

## 検証と影響再open候補

| 対象 | C3で必要な合否 |
| --- | --- |
| ED-04 | 基本操作の保存再表示、unknown前後編集保持、複雑表/deepnestの説明、警告取消/抑止/reset、変換前に戻す |
| ED-05 / C2-D/E/F | dirty最新入力を保存してから警告、失敗stay、全初期入口、端末user設定とbackup互換、restored canonicalでhost再初期化 |
| ED-01/08 / P1-B / C1-A/C/D/E/F | V5同ID・両key、titleのみ本文不変、無入力非作成、現在含む20・no-op、保存失敗/退避download、exact競合、prune後理由 |
| ED-06 / P2b-A/B / P1-C/D | media-only/draft→stable、alt/video/同asset、opaque内media、currentとhistory認可、HTML保存/restore時の再安全化 |
| ED-11 / P2b-C/D | 両style、CSS・参照worker更新中の準備世代、取得済再利用、変換前CSS snapshot復元、損失noticeと安全化notice |
| P1-E | 新editor依存・Worker・Node22・SSR/client split・production build/start |

C1-Bのpin方式、quota、codec、safe-fetch、認証方式自体は変更しない。prelossy由来metadataとprune guardはC1-A/F、媒体を含む実結果は既存pin契約への回帰として扱う。新しいschema列が必要なら任意metadataだけを候補にし、旧正本/version/display/revision/assetをbackup・cloneで不変比較する。schema不要と決まる前にmigrationを増やさない。

## Manager判断点

1. schema editorはProseMirror小構成＋明示converter＋opaque inline/blockを第一候補としてgateへ進めるか。推奨はこの案。既存`execCommand`への表・未知要素追加ではschema・undo・境界の責務が曖昧になる。
2. 警告は新規空だけ免除し、既存の全WYS入口で共通準備、HTML由来/損失ありは明示警告、他の既存入口も一般的な注意を出すか。推奨は全入口共通とし、抑止は端末userの設定だけにする。損失0の推定を理由にHTML由来警告を省かない。
3. reload後の「変換前へ」は新版の任意`wysOriginRevisionNo` metadata＋通常20版内の保持確認で提供するか。推奨はこの案。変換保存直後にも元版が残るprune guardを持ち、古すぎる準備では保存を止めて退避/再準備を案内する。20+1や無期限pinにはしない。

## 調査・引継ぎ状態

調査はspec/design/関連sourceの読み取りと公式一次資料の読み取りのみ。test、build、依存導入、fixture、DB、browser、listener、process操作は未実施。この提案以外のfileは変更していない。doc-style / markdown-styleに従い、既存契約、未採用候補、未検証を分けた。

引継ぎ基準はManager受領値の557 files / `48d71be5514c3ba6d1547388b3e71cd0d539e3d61fe9ba29c98e73afb745b883`、HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、lock `ab5726f19ce660ffdc599821edbb1f115cb114fae8987dcfbab33d8d9190e68f`。本作業では再hash・DB再集計していない。production session77181 / PID41320、404 notes / 38 assets / 487 revisionsはVerifier引継ぎ値であり本作業の再確認値ではない。本体・DB・storage・mailbox・旧backupへ無操作。C3の正式委譲まで実装・環境操作を停止する。
