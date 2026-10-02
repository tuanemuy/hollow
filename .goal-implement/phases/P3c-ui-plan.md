# P3c UI接続案

## 状態と入力

2026-09-10、P3b-2独立検証中のread-only提案。P3c-A〜Gの完成条件、designの検索・日付・タグ共有契約、`spec/scenario/organize.md`全文、`spec/design/index.md`全文と現製品の接続箇所を読んだ。実装・実測・合格根拠ではない。FTS/期限停止/Unicode版の成立調査は別担当であり、ここでは重複実行していない。

goal-implement/manager-loop、markdown-style/doc-styleを適用する。spec/spec-implementは使用しない。書込みは本書だけ。製品、DB、storage、mailbox、browser、process、test、build、依存、git/hash、旧temp、全体管理文書は操作・変更していない。P3b-2の不具合が通知されても正式差戻し前に修正を開始しない。

## 現在の再利用点と不足

| 責務 | 現コード | P3cで必要な差分 |
| --- | --- | --- |
| scope付き一覧の初期取得 | `routes/notes.index.tsx` → `routes/-hollow.tsx` → `NotesFragment.tsx` → `ScopedNotesBoard.tsx` | 非awaitのRSC promise/Suspenseを維持し、validated全条件を同一queryへ渡す |
| 一覧の操作所有 | `NoteList.tsx`のuseOptimistic/useTransition、親所有trash・receipt通知・invalidate | 追加page/3表示と削除を共通boardへ集約。leafへ削除所有を移さない |
| 現在のpage | `listScopedNotes`、`NoteRepository.listScoped`、scope/updatedAt/ID cursor、最大50 | sort/query/tag/month/zone/意味versionを含む新read契約とkeysetへ接続。全配列取得へ戻さない |
| 現在thumbnail | repositoryのcurrent image参照を`limit 1`で選択、親img表示 | 本文順の根拠がない。先頭由来projectionへ置換する。これは未完成OR-01の接続点であり既存認可不良の確定ではない |
| scope表示 | `WorkspaceScope.tsx`、scopeReadIdentity、generation検査、認可済scope DTO | paletteへ現在scopeを渡す。URL/request所有を拡張し、icon/chooser mobile既定を維持 |
| detail | `getNote`/`NoteView`、`notes.$noteId.index.tsx` | tag、format表示、creator表示名の安全な投影、backup状態の事実表示、見出し補助を追加 |
| 本文render | `NoteDisplayStyle` → `NoteContent` → renderNoteFn/frameDocument | sandbox/CSP/current媒体認可・style previewを維持。detailだけの見出しhostを任意に接続 |
| 端末設定の先例 | editorModeのuser別key/validator | 一覧用の独立codec/keyを設ける。editor mode/退避keyを流用しない |

画面mockのShadow DOM記述は採用済みiframe隔離へ読み替える。本文の任意HTML/CSS/URLを親UIへ移す方式は採らない。共通shell全刷新や、notes一覧のloader bridge例外は不要と見込む。

## B/C/D/E: URL・preference・client owner

### 型とread入口

内側に`NoteListQuery`と`NoteListPage`を置く。queryはscope、view、通常sort、検索sort、query、tag IDs、civil month、zone、cursorを型分離する。外部のURLはpresentation validateSearch、追加取得はvalidated GET server functionを通す。`serverData`へ外部入力を直接渡さない。

scope・正確検索条件・現在policyを共有query portへ渡し、metadata/count/tag/calendarを同じ意味で読む。FTS候補の内訳やSQLをUIへ漏らさない。初期RSCは同じ結果のscope/usage/metadataをclient ownerへseedし、二重に全noteを取得しない。後続pageは最大50件。tag候補とcalendar dayにも独立cursorを使う。

URLが確定条件の正本。端末preferenceはview/通常sort/zoneのみで、query/tag/monthや権限の根拠ではない。user IDで分離したversion付きcodecを新設する。型不正は無視、storage拒否時も現在操作とURLは成立させ、保存できなかったことを案内する。新規editorのalways WYS/backup modeには触れない。

URLに明示された有効値を優先し、欠けたpreferenceを一度だけ補完する。SSRにないbrowser zoneや端末設定は初期準備状態で解決し、古い補完応答が利用者の新しい選択を上書きしない。書換えはreplaceを使い、明示条件操作は戻る/進むで復元できるnavigationにする。初期値未保存の場合は既存list/updatedAt-descを起点とする最小案。calendarとzoneの採用規則はdesignに従う。

### 一覧の状態所有

`ScopedNotesBoard`を一覧全体のclient ownerにする。初期RSC seed、取得済みpage、次cursor、追加読込error、削除target、optimistic removalを同じownerへ置く。tile/listのleafは同じtyped cardの表示だけを担う。calendarも同じ親削除commandを使い、日別page/countの再読込はinvalidateへ接続する。

条件identityはscope/query/tag/month/zone/sort/意味versionを含む。条件変更時にgenerationを先に進め、旧成功/catch/finally/observer callbackを不採用にする。同条件の追加pageは直列一件、ID重複排除、失敗なら既取得分を残して同cursor再試行。invalidate時は旧pageと新first pageを混ぜず、最初から正本へrebaseする。失効が判明した応答では当該条件の既表示metadataを残さない。live cursorはリクエストを跨ぐ固定snapshotではない。

OR-01のスクロール継続は末尾sentinelで次pageを読む。同じ入口を「続きを読み込む」buttonとして残し、keyboard・失敗再試行・observer非利用時も成立させる。無制限に全pageを先読みしない。取得済みカードのwindowing/保持上限は通常長一覧の実測で必要な場合だけ決め、本文HTML50件をDOMへ積む実装は避ける。

状態はscope空、条件0件、page取得中、追加page失敗、現在認可失効を分ける。scope空はupload/new CTA、条件0件は各条件解除、tag不明/他scopeは詳細を漏らさず0件と解除。0件を全件一覧へ黙って広げない。処理中/要AI/失敗/cancelledは現在statusの文字付きbadgeで示す。公開状態は現private値を表示し、P4未接続のlink/public値を捏造しない。

### 三表示とpalette

tileは広幅の先頭preview、listは密なtitle/tag/date/status、calendarはcreatedAtのcivil dayごと。同じnote link/card DTOを使う。calendar中sortはdisabled理由を表示し、通常sort値は保持。月解除はlistへ、scope切替はfilter/cursor/day展開を解除し、calendarだけ現在月を新scopeへ適用する。検索適用は関連度を既定にし、解除時は検索前の通常sortへ戻す。

paletteはShell配下の一つのclient hostにする。上部trigger/⌘K/Ctrl+K/一覧chipから同じopen関数を呼び、認可済scope名を入力左へ固定表示する。detailのscopeはgetNoteのDTOから取り、過去の一覧scopeを流用しない。未解決scopeでは検索を始めない。

paletteの入力中queryと一覧確定URL queryを分離する。候補を開く操作はdetail navigation、条件適用は全条件を保持した一覧navigation。Escapeは未確定queryを捨ててtriggerへfocusを戻す。↑↓/Enter/新tab shortcut、focus trap、可視ヘルプ、390pxでの通常操作を原文の範囲で接続する。paletteのnavigationも既存editor/upload離脱blockerを通し、独自保存ループや強制window移動を作らない。

候補の成功/失敗/timeoutはopen世代+scope+query+filter identityで検査する。1文字/無termは検索しない説明、0件は現在scope内の結果だと明示。検索highlightは別担当の正規化offset対応済みtext/mark segment DTOだけをReact textとして描画する。raw HTML、FTS highlight文字列、URL属性をinnerHTMLへ入れない。debounceや候補件数は別担当の採用値と共通化し、ここで数値を確定しない。

## B: 本文先頭サムネイル

第一案は検索用の構造text projectionと同時に、現在本文の先頭を表す有限`LeadPreview`を作る。本文順のtext・見出し等の種別・最初の媒体位置を保つ。保存/変換/reference/restoreの同UoW projection確定へつなぎ、一覧でHTML全体を取り出して再解析しない。原文/保存本文/版をthumbnailのために変更しない。

表示はtrustedな縮小preview cardとし、先頭textをReact textで、使用する画像は正確なcurrent note/asset参照をサーバーで解決して表示する。属性/style/source URLを保存projectionから親DOMへコピーしない。既存の無順序画像選択を「先頭画像」と呼ばない。本文が未生成なら変換状態、空なら空本文、動画/非画像の先頭なら型付き媒体ラベルで表す。

これにより本文の冒頭内容からのサムネイルを提供するが、任意本文CSSのpixel縮小画像やraster screenshotの同一再現は保証しない。両displayStyleは詳細で維持し、一覧previewはtrustedな要約表示と明示する。CSS background/外部URLを追加fetchする口実にせず、容量所有や画像加工jobを新設しない。

小data画像/SVGだけの冒頭を実画像として扱う場合は、現在rendererの小data検査済み結果と既存image安全境界を通す必要がある。projection中のdata文字列を未検査のまま親imgへ入れない。第一実装は安全な媒体ラベルを含む先頭previewとcurrent認可済み画像に限定する提案。もし原文thumbnailに本文装飾やdata画像の画像再現まで必要と判断するなら、既存renderから有限先頭fragmentを得て隔離iframeへ表示する代案があるが、50iframe/検査I/O/表示資源の費用が増える。ここは実装前の表現確認点であり、未実測の別storage方式を前提にしない。

## F: 見出し移動と残metadata

### 見出し一覧

`NoteContent`にdetail用の任意見出し補助を追加する。iframe完成documentのonLoad後、親trustedコードが当該contentDocumentのHTML namespace h1〜h6を本文順に収集する。親へ渡すのは階層/安全text label/内部keyだけで、移動対象のElement参照は当該frame/generationのprivate refへ保持する。利用者のid/name/data属性をselectorやauthとして信頼しない。重複id/同じ見出し文字/空見出しでも別対象を誤選択しない。

本文直前の折りたたみ内に階層付きbutton一覧を置く。選択時に同じiframe/document/generation・connected elementを確認し、その要素へframe内スクロールと親の可視位置調整を行う。必要な一時focus属性は表示DOMだけに付け、正本へserializeしない。child script/postMessage/allow-scriptsは不要。現在sandbox allow-same-origin単独、CSP、inert本文link・安全な親link導線は維持する。

style preview/apply/cancel、本文再取得、履歴preview、reloadでsrcdocが変わると参照を破棄する。旧onLoad/旧見出しclickを新本文へ適用しない。未load/失敗/非表示で位置を持たない見出しは状態を説明し、別要素へ代替移動しない。CSSで表示されないheadingのラベル扱いはprojectionの構造text規則と区別し、実render上に移動先がないことを正直に扱う。

全文は既存800KiB/DOM資源内で一度に読み、TOC生成のために切り詰めない。見出しラベルの表示省略と移動対象の保持を分ける。見出し多数時の描画費用は既存上限内の代表実DOMで測定し、必要なら折りたたみ中の遅延構築/有限展開を使う。新しい全browser/byte-identical保証やC2 AST対応gateは追加しない。エディタ/履歴previewへTOCを必須にせず、共通NoteContentの未指定時は現挙動を保つ。

実装時の狭い確認は、両style/長文/画像後の移動、重複id・反復文字・entity・table内heading、style切替中の旧click、取消/再取得、390px/keyboard。sandbox/CSP/親CSS隔離を変えずに実frame内外の移動が成立するかだけを確認する。現時点で実DOMの成立は未検証。

### creator・元ファイル・backup

`NoteView`にはcreator account ID/unknownとoriginal name/bytes/format/coverage/noticesがある。formatは現在detailで未表示なので追加する。creatorは同じ現在note認可後の安全な表示名projectionへ接続する。退会/古い記録/unknownを現在ownerやuploaderで埋めず、「作成者不明」等を維持する。profile機能を先行実装せず、公開してよいaccount表示項目がない場合は識別不能を正直に示す。

原本保存と外部バックアップを型・文言で分ける。現在Original行はサーバー保持provenanceであり、Driveバックアップ記録ではない。現在実装にはDrive接続/バックアップ結果の永続正本がないため、「原本：Hollowに保存」「Driveバックアップ：未提供（状態未取得）」のように実装上確認できる事実だけを表示する。`backup: complete`、日時、未連携account情報や「失敗0」を捏造しない。原本なしは元ファイル項目自体を適切に省略する。

ローカルeditor退避はuser+note/deviceに限定された未保存内容であり、OR-11の原本バックアップ状態とは別物。detailのSSRでlocalStorageの不存在を推測しない。既存ED08回復入口/4key download/optional origin hintはそのまま維持し、今回のmetadata表示のために読み書き・削除しない。

本文loadingはshaped skeletonへ接続する。現在detail routeはgetNoteFnのblocking loader、本文はNoteContent内のrender待ちである。P3cでは本文skeletonと既存detail metadataの責務を分け、通常一覧の非await RSCは保持する。detail routeまで無根拠に取得方式を刷新しない。

processing/display pendingの現在2秒invalidate・完了後本文表示、needs_ai/failed/cancelledから処理履歴の導線を残す。既memberが別actorのjob操作をできるように履歴認可を広げない。LLM接続/再生成は後続未実装を明示し、機能しない成功buttonを追加しない。

## 後続境界と先行影響候補

P3dはtag作成/付与/rename/merge/deleteと移動の実UI。P3cは実tag正本/関係のread/filterを隔離fixtureと実queryで検証し、空配列固定にしない。P3eの全選択/集合固定/一括操作は実装しない。P4はpublish/link/public search/export、P5はDrive/LLM。現private・原本download・編集・trash・履歴・設定以外を成功操作として並べない。

| 先行ID候補 | 条件に触れる予定の責務 |
| --- | --- |
| P1-E、P3a-A/F | Shell palette/trigger、scope URL/一覧表示、RSC/client owner/390px |
| P3a-B/D | 現scope一覧/現在read policyと新候補・件数・tag/calendar query。認証方式全体は変更しない |
| P2d-1-A/D | 一覧親所有trash optimistic/rollback、追加pageとinvalidateの整合 |
| P1-C、P2b-A/D | NoteContent/detailの見出し補助と両style/iframe表示。sandbox方式自体は不変 |
| P2a-E/F、P2b-C | 変換status/current本文projection・完了反映。元worker/取得方式の変更がある箇所だけ |
| C1-A/D/F、C3-E/F等 | 同UoW current projectionのcommit/restore接続が実変更する場合のみ。UI案だけを根拠に全保存/PMを再openしない |
| P3b-1/2 | Shellのscope icon・設定到達の表示を実変更した場合の狭い回帰。招待/配送/画像変換・容量は不変 |

これは採用/reopen確定の台帳ではない。正式実装の実ファイル/責務変更を報告し、Managerが条件単位で決める。今回のread-only調査は既存受入を変更しない。

## 全P3cの実装順と見込み

| 順 | 縦スライス | 初回作業見込み |
| --- | --- | --- |
| 1 | 別担当Aの成立結果を採用し、query/projection/tag/calendar DTO・schema/backfill・同UoW接続を固定。旧列保全clone | 60〜90分 |
| 2 | B/Dの通常list/tile、先頭preview、URL/preference、tag read/filter、親所有page/trash・空/失敗対 | 50〜75分 |
| 3 | Cのpaletteと検索候補/安全highlight/一覧へ条件適用、scope/旧応答対 | 35〜55分 |
| 4 | Eのcivil月/日page/calendarとURL zone、Fのmetadata/見出し実frame移動 | 50〜75分 |
| 5 | Gの統合現在認可・late response・390/keyboard・最終checks/build/保全/commit/全停止 | 45〜65分 |

単独主担当で約4〜6時間を初回見込みとする。方式Aが未成立ならその依存を完成扱いにせず、metadata/一覧owner/見出し等の独立箇所だけ進める。採用済みportが揃った後にUIの書込み境界を分離できる場合も、環境所有は一人を守る。この文書作業では補助を起動していない。

現在判明した不成立前提は、無順序current画像を「本文先頭」と見なすことと、原本保存を「Driveバックアップ済み」と見なすこと。いずれも上記の有限projection/事実表示で回避できる。FTS実期限/Unicode版の採否・未指定数値を本書で決定しない。新しい必須機能や独立gateは提案していない。文書提出後は全操作停止し、P3b-2受入と正式P3c委譲を待つ。
