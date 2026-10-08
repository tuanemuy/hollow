# P3c 一覧・検索 UI 実装補助

## 結果と引き継ぎ

P3c-B/C/D/E と G の UI・入力接続の実装候補。5 ファイル・45 件の純粋テストと静的 React 描画、対象起点の型検査、対象 Biome は成功した。実ブラウザー、RSC 通信、本体 DB、既存削除の実操作は未検証。製品合格や独立検証の報告ではない。

開始は `2026-09-11T00:06:41+09:00`。最終限定テストは `2026-09-11T00:45:33+09:00`。本書を含む専有ファイルを主担当へ返却し、書込みと全操作を停止する。共有 DTO・公開 port の変更要求と未解決の型エラーはない。統合コミットは主担当が行う。

入力は [P3c の採用設計](../design.md#p3cの検索日付タグ共有契約)、[P3c 台帳](../plan.md#p3c-一覧全文検索タグ読取カレンダー)、[UI 接続案](P3c-ui-plan.md)、[共有契約](P3c-shared-contract.md)、元の [OR-01〜05/10/11](../../spec/scenario/organize.md) と [WS-02](../../spec/scenario/workspace.md#ws-02-表示中のワークスペースを切り替える)。goal-implement と manager-loop を適用する。報告の記法は doc-style、markdown-style に従う。spec・spec-implement は使用していない。

## 実変更ファイル

| 範囲 | ファイル | 責務 |
| --- | --- | --- |
| 既存一覧 | `apps/web/app/components/hollow/ScopedNotesBoard.tsx` | 三表示、条件操作、追加 page、親所有 trash、日別展開、最新 seed への再配置 |
| 既存一覧 | `apps/web/app/components/hollow/NotesFragment.tsx` | 準備状態または application の `browseNotes` を読む RSC |
| 既存一覧 | `apps/web/app/components/hollow/NoteList.tsx` | typed card の表示。削除 command の所有者は board |
| 既存 Shell | `apps/web/app/components/hollow/Shell.tsx` | 認証利用者ごとに分離する単一 palette provider と header trigger |
| 既存 route | `apps/web/app/routes/notes.index.tsx` | URL 入力、全条件の Suspense identity、表示別 skeleton、retry error |
| 既存 bridge | `apps/web/app/routes/-hollow.tsx` | `renderNotes` の検証入力と fragment props |
| 新規入力 | `apps/web/app/presentation/browseInput.ts`、`browseInput.test.ts` | URL/API schema、検索案内、zone 検証、条件 identity |
| 新規 UI | `apps/web/app/components/browse/BrowseContext.tsx`、`BrowsePreparation.tsx`、`SearchPalette.tsx` | 現文脈、利用者別設定、初期補完、単一 palette |
| 新規 UI | `apps/web/app/components/browse/TagFilter.tsx`、`BrowseSkeleton.tsx`、`BrowseError.tsx` | 実タグ候補、初期 loading、再試行と認可失効 |
| 新規 pure | `apps/web/app/components/browse/model.ts`、`requestState.ts`、`TextPreview.tsx` | 条件遷移・設定 codec、応答 ownership、安全な text/mark |
| 新規 test | `apps/web/app/components/browse/model.test.ts`、`requestState.test.ts`、`TextPreview.test.tsx`、`BrowseError.test.ts` | 純粋状態と静的描画の対 |
| CSS | `apps/web/app/styles/browse.css`、`apps/web/app/styles/index.css` | 新 UI と import 1 行 |

`WorkspaceScope.tsx`、既存 `workspace.css`、他 route、domain/application/DTO/serverFn、旧 normalizer 8 path は変更していない。専有外の主担当差分は保持した。型検査用の一時 `components/browse/tsconfig.check.json` は自己作成分だけ削除済み。

## 接続契約

### URL・端末設定・RSC

URL の正本は `query/tags/month/zone/layout/sort` と continuation。表示形式のキーは実 DTO と同じ `layout` を使う。`browseRouteSchema` は zone/layout/sort の未指定を保持する。`notes.index.tsx` は `SearchSchemaInput` を用い、省略可能な navigation 入力と、正規化後の query/tags を分ける。既存の `{}`・`{workspaceId}` のリンクを維持する。

未指定の条件は `BrowsePreparation` が利用者 ID 別の `hollow:browse:v1:{userId}` から補完する。保存対象は version/layout/通常 sort/zone のみ。URL の明示値を優先し、検索語・タグ・月・scope・cursor は端末設定に保存しない。storage 拒否は案内を表示し、URL と現在操作を継続する。

zone の準備前に一覧取得や UTC の完成カレンダーを表示しない。検出失敗時は明示的な UTC 選択、再検出、IANA zone 入力を提供する。完成画面にも現在 zone と端末地域の再検出を置く。月の現在値は指定 zone の civil year/month から求める。日/月の UTC 境界計算は既存の内側 port と実 adapter が所有する。

`renderNotes` は `renderServerComponent` の promise を await せず返す。`NotesFragment` の server read、`Deferred` と Suspense の形を維持する。補完の navigation は replace、明示条件変更は通常 navigation とする。通常 sort は検索中の sort で上書きせず、検索解除時に復元する。

### 親所有の一覧と calendar

`ScopedNotesBoard` が seed、追加 page、日別追加、削除 target、optimistic removal、rollback、receipt 通知、invalidate を所有する。追加読込は同一 owner 内で一件ずつ。成功・catch・finally は generation、seed object、opaque identity、現在 href を照合する。追加項目は ID で重複を排除し、client 側で全体順を再ソートしない。

更新された RSC seed は追加 page を捨てて正本へ戻す。条件変更は cursor/day を失効させる。URL と seed が一致しない間は skeleton とし、旧一覧を新 href の palette 文脈として公開しない。現在認可の失効が判明したら件数・抜粋・タグ・calendar を error へ置換する。後続応答の現在 scope/usage/selectedTags も表示へ反映する。サーバーの現在認可を UI の flag で置き換えない。

タイル・リストは同じ `BrowseNote` を描く。本文冒頭は typed text/mark、現在認可済みの thumbnail URL、媒体ラベルで表示する。親 DOM へ raw HTML、本文 CSS、raw 属性を挿入しない。抜粋は UI でも 160 code point に制限する。

通常 page は最大 50 件、末尾 sentinel と同じ入口の button で追加する。calendar は reader が返す日別初期 3 件・件数・日別 cursor を使い、追加は day+cursor の 50 件。月全本文の client 取得はない。day 応答の identity は月 seed と異なるため、要求 day/条件・現在 seed の照合を分ける。直接の day continuation URL は対象日と「続き」を明示し、月全体を先頭から読む操作を置く。

月 selector と calendar の月移動は createdAt/month/zone の同じ条件を使う。calendar 中の sort は理由つきで無効。月解除は list へ移る。既存 WorkspaceSwitcher が scope のみの URL に戻す動作は変更せず、初期補完から view/通常 sort/zone を戻す。calendar は新 scope の現在月を選び、古い filter を再利用しない。

calendar は広い画面で曜日付きの月グリッド、760px 以下で同じ月の作成日別縦一覧にする。狭い画面でも日ごとの note link、件数、続きを省略しない。これは未実測のレスポンシブ表現であり、390px の合格根拠ではない。

### 単一 palette と tag reader

header、⌘K/Ctrl+K、絞り込み chip は Shell 内の一つの palette を開く。list は現在 URL と一致する BrowsePage、detail/edit は現在 pathname と note ID に一致する成功 loader DTO の scope を使う。古い list の scope を detail へ持ち込まない。文脈未解決時は開始を無効にする。

draft と一覧 URL の確定 query を分ける。候補選択は detail、適用 button は条件付き一覧へ移動する。普通の移動は TanStack Router を通し、既存の離脱 blocker を回避しない。候補の修飾キー click は通常の Link に任せる。native modal dialog、Esc と focus return、combobox の上下選択、Enter、可視ヘルプを接続した。実 focus trap と blocker の操作確認は主担当へ残る。

250ms debounce を使い、trim 後 1 文字・200 code point 超過・16 term 超過・term なしでは候補 read を実行しない。空入力を全件候補へ変換しない。候補の response は open generation と scope/filter/query に束縛する。現在のタグ・月による条件は palette に明示する。

タグ候補は `browseTagsFn` の実 reader。usage 0 を表示せず、検索・50 件 page・AND・選択 chip・個別解除を提供する。unknown/deleted/foreign の選択 ID を落とさず、reader の 0 件と解除導線を示す。tag normalization や tag mutation は UI へ複製しない。

`SEARCH_PREPARING`、`BROWSE_CURSOR`、検索入力の business guidance、session/scope 失効を扱う。redact 済み system/unknown は時間切れ・混雑等による未取得として再試行を案内する。0 件や成功とは表示しない。notes cursor 16384、tag cursor 4096、tag query 200 UTF-16 code unit は既存 wire の上限と整合する。

## 限定検証

最終コマンドの時刻は `2026-09-11T00:45:30+09:00`〜`00:45:34+09:00`。対象ファイルへの Biome 整形後に型と tests を実行した。

```sh
pnpm exec vitest run apps/web/app/presentation/browseInput.test.ts apps/web/app/components/browse/model.test.ts apps/web/app/components/browse/requestState.test.ts apps/web/app/components/browse/TextPreview.test.tsx apps/web/app/components/browse/BrowseError.test.ts
pnpm exec tsgo --noEmit -p apps/web/app/components/browse/tsconfig.check.json
```

Vitest 5 ファイル・45 件成功、528ms。型検査は exit 0。型検査の一時 config は `apps/web/tsconfig.json` を extends し、専有 TS/TSX と `app/router.tsx` の型登録を起点とした。到達依存も検査対象になる。全 workspace の `pnpm typecheck` は実行していない。一時 config は検査後に削除した。

対象 Biome は専有 TS/TSX/CSS と一時 config の 23 ファイルで exit 0。`--write` は同じ対象に限定する。既存専有 path の `git diff --check` は exit 0。全体 lint:fix/format/build は実行していない。

| テスト範囲 | 根拠 |
| --- | --- |
| URL/API 入力 | 未指定 preference の保持、trim 後 2〜200 code point、1文字/記号/17term 拒否、未知 ID の保持、actor/role 注入拒否、zone/day/month/cursor、上限 |
| 条件遷移 | user 別 version codec、URL 優先、検索前 sort、zone による月境界、scope 復元、月解除、年を跨ぐ月移動、ID 重複排除 |
| 応答 ownership | A→B→A、別 seed、別 href、別 scope/day/query の拒否、日別 continuation、現在 detail note ID の一致 |
| 安全表示 | HTML 風文字列の escape、trusted mark のみ、160 code point、サロゲート対、空 segment |
| エラー | SEARCH_LENGTH/TERMS、準備中、cursor、redacted system、unauthorized/forbidden/notFound |

限定検査で検出した不成立は修正済み。route 登録を含まない初回の対象 config は Router 型を解決できなかった。登録を含めた検査では、省略可能な URL 入力と readonly/optional の型差、ARIA 要素と effect 依存が検出された。これらの修正後の型/Biome 結果が上記の成功根拠である。

## 未検証と実影響

未検証は、同 bundle の RSC 初回/再試行、serverFn manifest と実 runtime、実 DB の候補・タグ・日別 read、back/forward と scope 切替、storage 拒否・zone 検出失敗の実 UI、native dialog と離脱 blocker、390px、親 trash の実 pending/rollback/undo/invalidate、認可失効の実応答である。これらは主担当の統合検証と独立 Verifier に残る。純粋 tests は実 DOM や current policy の DB 合格を代替しない。

実変更が触れる既存条件は、P1-E と P3a-A/F の Shell/URL/一覧、P3a-B/D の scope DTO 表示接続、P2d-1-A/D の親所有 trash と invalidate。P3b-1/2 の招待・icon backend は無変更だが、header に検索 trigger を追加するため既存 scope icon/name の狭い表示回帰が必要になる。正式な再 open と合否は Manager が決める。

P3d tag 作成・管理・merge・移動、P3e 500 件選択、P4 公開・export、P5 Drive/LLM、詳細 TOC は実装していない。未提供機能の架空 success は追加していない。HTML 隔離 renderer、保存/変換/履歴、容量計算、会員権限、normalizer/date adapter の業務規則は変更していない。

DB、storage、production、browser、server、worker、process、既存 temp、秘密ファイル、credential helper は操作していない。インストール・lock・goal API・全体管理文書・stage/commit は変更していない。新依存と補助 agent はない。主担当所有の環境・ソースの検証根拠を本報告の実施結果へ混ぜていない。
