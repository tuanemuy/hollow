# P2b-D 表示スタイル

2026-09-06 12:04 JST（Asia/Tokyo）。Implementer の完成候補。独立検証・Manager 受入は未実施。

## 対象

ED-11 / IM-05 のノート単位表示設定を実装した。新規白紙、初回取り込み、初回 CSS 待ち、手動選択、表示 preview、取消・適用、再表示、永続化を接続した。P2c の版履歴・全三編集モード、trash、workspace、公開・export の本体機能は含まない。

| 受入 ID / 境界 | 自己検証結果 |
| --- | --- |
| P2b-D / ED-11 | 初回のみの安全宣言判定、由来、pending、手動優先、detail preview/取消/適用、失敗 rollback、mobile/keyboard、reload 成功 |
| P1-B | style 専用 command が最新本文/title を保持し、古い本文 editor は現在 style を保持。実 DB と本体 2 tab の双方向成功。新規白紙の無入力非作成・入力後の同 note 保存成功 |
| P1-C | trusted 既定 CSS の有無だけを変更。detail / HTML editor preview / 再 mount / reload で同じ frame 契約。script 0・本文内 active link 0・sandbox 同一を確認 |
| P1-D | migration の旧 372 notes / 31 assets 保全、default/legacy、独立 style 永続化・認可拒否の実 DB 成功 |
| P2a-B/F | 初回 conversion 成功/失敗/needsAI/AI 不使用/取消/置換、reference の初回終端・boot 回収・権限回復を実 DB で確認 |
| P2b-C | 初回 CSS 成功/失敗/部分成功/取消/claim 上限/no HTML change、off→on、手動優先、version guard、取得済再利用を確認。V1–V4 回帰を含む全 Node 成功 |
| P2b-A | 両 style の認可済み画像、既存 SVG、iframe 表示と統一 render を確認。codec・HTTP 認可・sandbox 方式自体の旧合格は維持 |

P2b-B の挿入/退避、P2a-D 容量、認証・SVG/HTML sanitizer・URL 検査・fetch guard の方式は変更していない。V5 の保存ループ/backup 実装も変更していない。今回は NoteEditor の preview に display 値を渡す差分だけ。

## 固定対象

| 項目 | 値 |
| --- | --- |
| branch / HEAD | `main` / `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a` |
| 開始対象 | 521 files / `a6bfa0752314a8505acca70b8fa6a276aeb66072fbb9776a57c63e9661771c5e` |
| 完成候補 | 529 files / `dca0be5beea01053f0c8bfeb4028052a7df1b88609eea450b80dc542a59d10de` |
| lock SHA-256 | `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`（不変） |
| runtime | Node `v22.22.3`、agent-browser `0.36.0` |
| fingerprint 実時計 | 最終再照合 `2026-09-06T03:04:17.182Z` / 12:04:17 JST。11:58:45 から本体 hash 不変 |
| worktree | 未コミット tracked 23 status records、untracked 88 records。既存変更を含み、新規 commit なし |

fingerprint は既存 `/tmp/hollow-p2b.dAfzgS/fingerprint.mjs`。`git ls-files -co --exclude-standard -z` の重複を除き、`.goal-implement/` を除外した実在ファイルを path 順に `path + NUL + bytes + NUL` で SHA-256 化する。未追跡の本体ファイルと migration を含む。status の untracked directory 表示数と 529 ファイル数は別の数。

## 実装契約

### 状態と保存

`NoteDisplay` は `default | original` と `automatic | user | legacy`、完了理由または初回 job ID を持つ discriminated union。初期化中は `default/automatic` のみ。conversion 待ちと reference 待ちを区別し、reference 待ちには初回の安全本文で確認した装飾の有無を記録する。小さい型付き設定列であり、note 全体を JSON 状態へ移していない。

新規白紙は `default/automatic/blank`。後から装飾 HTML を入力しても自動変更しない。取り込みは機械変換後の安全本文を判定する。初回 on の未試行 stylesheet がある場合だけ、その初回 reference job の結果まで既定表示を維持する。失敗・部分成功・上限・取消でも一度だけ確定する。

通常保存が初回 job を置換する場合、保存前に記録済みの初回判定で終端化する。後の本文や retry/on の job を新たな初回にはしない。手動選択は直ちに `user/complete` になり、遅い初回結果は戻せない。

`setDisplayStyle` は note ID と style だけを受け取る。I/O 前の認可に加え、最後の UoW で現在 account と note を再読し、最新の title/html に設定を適用する。古い client HTML を保存しない。普通の本文保存は現在 note の display を継承する。style 更新は note version を進め、必要な reference job を最新 version で再 schedule する。conversion 中の手動選択も最新 version の job を新規 schedule し、旧 worker の厳密 guard を維持する。

style 用 DNS 検査は UoW 外。検査待ちの間に本文が変わっても、最後に保存する本文は現在 DB 値。新しく現れた依存を以前の検査済みと偽装しない。参照設定/取得済みの同 note 再利用、現在 asset ref、lease/generation/current 権限の条件を緩めていない。

### 装飾判定

既存 `NodeReferenceProcessor.prepare` による HTML/CSS 安全化・budget 適用後、style 属性と style 要素の実 AST declaration を調べる。class、h1/strong 等の意味要素、空 style、未知 property、既知構文として無効な値、custom property 定義だけでは装飾ありにしない。通常の color/margin、escaped property、条件付き宣言、有効な color 変数参照は残す。

`<style style="">p{color:red}</style>` は属性と stylesheet の双方を別々に検査する。`c\6flor` は property 名を正規化し、`var()` は無効値として除外する。既知の宣言構文を判断する境界であり、全 computed style、selector の実視認性、cascade、未定義変数の最終値、全 viewport を評価するものではない。安全に残る条件付きの有効宣言は装飾候補として数える。[css-tree の一次資料](https://github.com/csstree/csstree) の AST / lexer validation を利用し、依存追加はない。

### 永久 pending 防止

reference runner の boot/sweep で最大 100 件を回収する。repo の候補取得時点で verified personal owner と終端済み/消失した初回 job を絞り、UoW 内で note と job の永続関係・現在 account を再確認する。先頭の権限不適合 note が正常候補の枠を占めない。

queued/running の job、新 lease、手動 user 選択は変更しない。未確認 account は据置し、権限回復後に確定する。HTML/asset を書き替えたり、取得/原本 cleanup の権限を拡大したりしない。style 自体が変わる場合だけ version を進め、metadata のみの失敗確定では既存 retry の version 契約を維持する。

### 表示

`NoteDisplayStyle` が menu、preview、React optimistic/pending、server command、rollback を所有する。取消は保存しない。失敗は保存済み style へ戻し、安全な error を表示する。適用後は invalidate で再同期する。

`NoteContent` / `frameDocument` の `displayStyle` に集約した。original は Hollow の trusted default CSS だけを外し、本文側の安全化済み CSS と素の browser 表示を使う。sandbox は `allow-same-origin` 単独、script/object/frame/connect/form/base の閉鎖、inert link と trusted 親側リンク、transport 由来 externalReading 判定はそのまま。HTML 正本に preview 設定や bearer 情報を混ぜない。

共有/公開/export は未接続。同じ note の永続 display と frame 入力型を使える契約だけを残す。

## 変更範囲

- Domain: `domain/note/{displayStyle,entity}.ts`、note repository port、display 状態 test。
- Application: `note/{view,saveNote,setDisplayStyle,settleDisplay}.ts`、`import/{acceptUpload,processJob,controlJobs}.ts`、`reference/{processJob,read}.ts`、reference processor port。
- Adapter: libSQL note schema/repository/migration、Node reference processor/classifier test、reference runner。shared UoW resource queue・parser・media validation は不変。
- Presentation/UI: `NoteDisplayStyle`、`NoteContent`、`NoteEditor` の preview prop、`editorMedia` と test、note detail route、`hollowNotes` / `hollowSchemas`。
- 実 DB 回帰: `references.integration.test.ts`、`imports.integration.test.ts`。

UI helper `p1_ui` は UI/presentation の上記 8 ファイルだけを担当し、11:30 前に停止した。main が契約統合・worker・migration・実環境を担当した。

## 自動検証

| コマンド / 実時刻 JST | 結果 |
| --- | --- |
| `pnpm typecheck && pnpm lint:fix && pnpm format` 最終 11:57 | 成功。352 files、既存 infos 23。最後の 1 file 修正は追加 test の整形 |
| `pnpm test:unit` 11:51:37 開始 | 27 files / 291 tests 成功、7.59 秒。最終 production source を含む。後続変更は integration test 追加・整形のみ |
| focused display/domain/frame | 初期 15 件＋frame 11 件成功。classifier の正常/無効値対追加後は classifier 13 件、domain 5 件を上記全 unit に含む |
| focused Node references 11:53:13 | 33 件成功。最後に追加した初回 CSS 部分成功/正常 running 取消の 2 件を含む |
| `pnpm exec vitest run --config vitest.config.integration.node.ts` 最終 11:57:37 | 10 files / 106 tests 成功、26.66 秒。最終 test と formatter 対象を含む |
| `pnpm build` 最終 11:58 | 成功。`server.node.js` mtime 11:58:15、classifier source 11:50:43。旧 production を先に停止 |
| 同設定 `pnpm start` 11:58 | Node22.22.3、listen 成功。最終 build の original/legacy/認可済み画像を実 browser で再表示 |
| migration clone → 本 DB | `pnpm --filter @repo/web db:generate:node` で 0006 生成後、clone と本 DB の `pnpm db:migrate:node` 成功。下記保全確認 |

実 DB の追加対は、初回 safe/plain/inline/remote/off、HTML 非変更 failure/retry、queued 取消、claim 上限、通常本文置換、手動選択中の遅い CSS、style I/O 待ち中の本文更新、初回 conversion の手動再 schedule、失敗/要 AI/AI 不使用、boot wake 欠落、終端/消失 job の回収、live/new lease/user を据置、未確認先頭の非飢餓と権限回復、初回 CSS の部分成功と現在取得を待つ running 取消を含む。CSS 取得時の取消は現在分を安全保存して original に一度確定し、未開始分を取消、job failure は null。

途中の失敗は最終成功と区別する。最初の型検査は notices のメソッド名と account schema 列の誤りで失敗し、`listNotices` / `verifiedAt` に修正した。誤った列の時点では recovery を通る Node 4 件も失敗し、修正後の focused 29 件と最終 106 件は成功した。全 unit を typecheck/Node と並列実行した一度だけ、無変更の日本語 PDF test が既存 5 秒 timeout（290 成功・1 失敗）になった。timeout/codec/資源上限を変更せず、他処理完了後の直列 291 件は成功した。

全 runtime integration、全 OS/browser、故障した実 production DB の boot 改変、すべての codec/高負荷は実行していない。初回 job の消失/失効/権限回復は実 DB test の根拠であり、本体 UI でそれらを破壊的に再現したとは扱わない。

## 本体 UI

Chrome headless / agent-browser 0.36.0、本人専用 `hollow-p2b-media --restore`。desktop 1280×900、mobile 390×844。通常の click/fill/type/upload、2 tabs、frame DOM の読み取りを使用した。Cookie 値・認証 body は取得/記録していない。

| ケース / note ID | 結果 |
| --- | --- |
| Markdown 無装飾 `01a07492-cfdd-777e-9c95-d33e69c1b452` | h1/strong だけの初回は default/automatic/import |
| inline 装飾 `01a07492-d055-72b8-a72d-2a03fbfa6cd5` | 初回 original/automatic。段落の青色・背景と W3C PNG を保持。default preview は trusted style 1、original は 0。computed color は双方 rgb(23,90,166)、image naturalWidth 72 |
| remote CSS `01a07492-d0cc-741c-9cbe-f736437d0981` | 初回 CSS 取得後 original/automatic。取得 13,906 bytes、表示 CSS 10,233 chars。default preview 2 style →取消で 1、適用で default/user/version3、reload でも保持 |
| CSS 失敗 `01a07492-d142-7349-8212-cf257e9ed621` | 同じ実 upload batch で不足 stylesheet が失敗。本文保持、default/automatic/import、台帳 failure。判定値と failure の詳細は DB でも照合 |
| off→on `01a07495-676e-741d-9f46-231b349fdffe` | off 取り込み時 default で確定。detail の on を実操作して CSS 取得成功後も default/automatic のまま、version2、本文 CSS と trusted CSS の双方を表示 |
| 初回 pending 中の手動優先 `01a07495-d48f-7068-9802-213b5652de9a` | CSS companion の本人 tab upload だけを保留。HTML 変換済み・bundle 未 seal・初回 reference queued の実状態で「初回の装飾を確認中」を表示。別 tab で default を明示適用して user に確定。companion 解放・seal・最新 job 成功後も default/user/version3、CSS 文字と装飾あり |
| 通信失敗 rollback | remote note の本人 tab で次の POST だけ throw する fetch wrapper。preview 変更→適用失敗で保存済み default と 2 style に戻り、保存失敗/戻した旨を表示。DB 値は不変、wrapper 復元済み |
| 2 tab 本文/style | plain note の古い HTML editor を維持し、他 tab で original を保存。古い editor から新 title/body を保存して original を保持。続いて古い detail tab から default を保存し、最新 title/body を保持。最終 title `D-two-tabs-latest`、version4、default/user |
| HTML editor preview | inline note の default は trusted style 1、original は 0。双方で同 asset、naturalWidth72、青色本文を保持。detail→edit の SPA 遷移と reload で確認 |
| mobile/keyboard | inline の radio を矢印キーで original→default に変更し、即時 preview と checked 状態を確認。取消/適用へ到達、overflow=false。最終 original/user/version6 |
| 新規白紙 | `/new` 無入力待機で 378 notes のまま。装飾 HTML と title 入力・完了後は一つの `01a074a1-7179-7678-8887-d56d02b31e54`、version0、default/automatic/blank。detail 本文あり、backup keys 0 |
| 最終 build 再表示 | inline original は styles0 / img72 / script0 / active anchor0 / sandbox `allow-same-origin`。旧 `V5-media-restored` は legacy の説明、styles1 / SVG naturalWidth270 / `V5-media-continuation`、backup0 |

2 tab 最終本文は `<h1>D concurrent latest</h1><p>本文側から最新を保存。表示設定は維持。</p>`。style command が stale detail の本文へ戻さないことを DB で照合した。

pending 試験は test-only の `XMLHttpRequest.send` wrapper で本人 tab の 2 番目の companion upload を保留したもの。production に private fetch 例外や worker 遅延条件を追加していない。手動選択後に original send を呼び、wrapper と hook を復元して upload/seal を完了した。送信失敗試験も本人 tab だけ。最終 reload と browser close で残る hook はない。

mobile の `mobile-menu.png` / `mobile-style.png` を自身で画像確認した。radio、preview 案内、取消/適用、本文の青色装飾、画像が見える。自動 locator の scroll が一度下部固定 bar に radio を重ねたため、通常 scroll で移動して操作した。実画面の全機能が無 scroll で見えるとの主張ではない。CLI 遅延中に順序がずれた最初の keyboard 観測は採用せず、既存 exec 回収後の直列操作で確認し直した。

## Fixture と一次出所

一時 dir は `/tmp/hollow-style.fmPmfD`。HTML/Markdown/companion CSS は本試験用の小さい自作 fixture。外部 CSS は [W3C Core Styles の公式利用方法](https://www.w3.org/StyleSheets/Core/) に従い `https://www.w3.org/StyleSheets/Core/Steely` を通常取得した。W3C はこれらが時間や User-Agent で変わると記載しているため、固定版 fixture と扱わない。safe output と実取得 bytes は上記 note に保持される。

W3C 由来の CSS/ロゴは本体コードや再配布用 fixture として追加していない。公式 source の [ライセンス条件](https://www.w3.org/copyright/software-license-2023/) は既存 notice と変更表示の保持を要求する。後に fixture として再配布する場合はその notice を添付する。今回の logo は `https://www.w3.org/Icons/w3c_home.png` の正常な取得/表示だけの試験で、権利譲渡や推奨を示すものではない。

| 一時成果 | SHA-256 |
| --- | --- |
| plain.md | `bb2de28e396bd8feecf15c378da292275ef8d7c255ea72187f04f03d1522f682` |
| inline.html | `837d71ecaa537a8f4cc6abdbfe96eddf0dd28473f1973644c4ca49d03e9e9771` |
| remote.html | `874c36ad6bd0673e6edd4888f9262e92cab56dcb56ccce5a454daf403bb05c40` |
| failed.html | `c79532099b39f0465773d1af2c72171cc7f9e985a2d540fc3900d3d5b6b1b029` |
| off.html | `65bd1d98fad3747eeadce7242610aba0dcdaafc0bf419658710ca8342d301dc1` |
| pending.html | `a11ed628aabc27c87b18ef232ca1924a38e3e788a3f57e8f493d62ba51dc9e57` |
| pending.css | `8bd4b4cf0486729ef77cdf7536f1248ca9065bcb9e642333209046ddbde4de72` |
| mobile-menu.png | `5f41295bbbd256347f1f3a7e34ca8170c66603e046fa4b2769e819761a857803` |
| mobile-style.png | `7f133deb604f0ad1ff1351bf21e17d86b6888b7b012a9522da68c2ff0a20306e` |

## Migration・データ保全

11:32 JST に SQLite online backup `pre-style.db` を作り、その backup から `clone.db` を作成して先に migration を検証した。本 DB は既知の旧 production PID15854 を停止し、build/migration 後に再起動した。最終 classifier 修正後も既知の本人 PID22572 を停止してから build、現在の PID27981 を起動した。

0006 は `notes.display` の追加だけ。既存 note は全て default/legacy/complete、初回判定済みとは表示しない。進行中の旧 job に pending を後付けしない。

| migration file | SHA-256 |
| --- | --- |
| 0006_graceful_patriot.sql | `3defaadcbcea0e0acfba14c88393bd890784af469de3ce6e3b277d330e3e09bb` |
| meta/0006_snapshot.json | `bc8096b87ec81f1bee76db1c3e85519d854c5d4811188a41d23700f29360e01e` |
| meta/_journal.json | `c008da0a4afc87686c78381297ff8b0da73967fd924d002f1df9779f5f9f7db8` |

clone と移行後本 DB で、旧 372 notes の欠落・html/title/version/updated_at 差分 0、旧 31 assets の全列 EXCEPT 差分 0。11:57 最終保全確認も同じ。旧 note 全 372 件が default/legacy。全体は **379 notes / 32 assets / pending 0**、integrity_check=ok、foreign_key_check 違反 0。追加 7 notes / 1 asset は上記本人試験データ。旧原本、storage object、mailbox、pre-v5 等の旧 backup を削除していない。全 object 内容の再 hash までは行っていない。

## 環境引継ぎ

production は **session33247 / PID27981**、Node22.22.3、http://localhost:3000 で維持する。

```sh
DATABASE_URL=file:/tmp/hollow-p2b.dAfzgS/app.db \
APP_URL=http://localhost:3000 HOLLOW_MAIL_MODE=local \
HOLLOW_MAILBOX_DIR=/tmp/hollow-p1-S1piZT/mailbox \
HOLLOW_STORAGE_DIR=/tmp/hollow-p2.sj33Bk/originals \
HOSTNAME=127.0.0.1 PORT=3000 pnpm start
```

DB `/tmp/hollow-p2b.dAfzgS/app.db`、storage `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox`。migration 再現は clone を使用し、再 build 前に現在 production だけを停止する。

本人 browser の両 tab を session close で 12:00 JST 前に終了した。UI helper も停止済み。追加 listener なし、検査 exec は回収済み。残すのは production だけ。全 process 名/args/env の調査、別 focus-debug 操作、global cleanup、外部 Issue/メール送信/課金操作は行っていない。

manual-test の操作/観測手順、doc-style/markdown-style の報告整理を使用した。Manager 指示に従い自分の session だけを閉じ、production は次の独立検証用に残した。コード・helper・browser 操作を停止し、P2b-D と表に記載した狭い共有境界を独立検証へ引き継ぐ。
