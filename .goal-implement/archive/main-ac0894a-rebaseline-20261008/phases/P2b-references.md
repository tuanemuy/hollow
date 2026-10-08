# P2b-C 参照取り込み 実装候補

2026-09-06 08:55 JST。Implementer 自己検証結果。独立受入は未実施。

## 固定対象

- HEAD: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、main。今回 commit は作成していない。
- Node: `v22.22.3`。最終 build/start/checks はこの runtime。以前の一時 Node 24 方式 spike と区別する。
- 全 tracked / untracked 実ファイル 518 件（`.goal-implement/` と ignored 成果物を除く）、path + NUL + bytes + NUL の sorted SHA-256: `2fcdb382a1e07761d3aee209a54e038203b66d496b2dd8f236f75ca0e57508da`。採取 2026-09-06 08:50:23 JST、08:55:11 JSTに不変再確認。
- lock SHA-256: `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`。
- git porcelain: tracked modified 23、untracked entries 88。untracked entry はディレクトリ集約なのでファイル数ではない。以前の P1/P2 の未コミット実装も含む。既存ユーザー変更・focus-debug は保持した。
- 開始基準: 489 files / `deb0ae0a12248bb263b33fe89cdbe72053434a8141e8edd0fde287041414c0ef`。C で実ファイルは 29 件増加。既存未追跡ファイルの編集は git diff --stat に出ないため上記全体 hash を正本とする。

## 受入対象と根拠

| 対象 | 実装・自己検証 |
| --- | --- |
| P2b-C 安全取得、IM05 | URL/DNS/socket/redirect/stream 制約、内容検査済み内部画像・動画、data URI 検査、失敗公開 URL の直読、private/未解決参照の描画停止。safeFetcher unit と本体 HTTP/UI、公開 binary hash 照合 |
| P2b-C CSS、ED03 | sanitized DOM の静的対象へ宣言集合を合成。CG1 数値正規化、split selector 遮蔽除去、通常装飾保持、final URL 相対解決、未適用・除去台帳。processor unit、実同梱/remote CSS UI |
| P2b-C 同梱、IM01/02/03/05 | 明示 companion role/path、HTML/MD と CSS/画像の一括受付、100件/500MiB・個人 quota 合算、seal/失敗兄弟/孤立回収。実 DB/storage と本体4ファイル UI |
| P2b-C 台帳・job、JB01–03 | note-readable 恒久台帳、off/on/retry、本人履歴、進捗・取消。DB lease/version guard、boot+sweep、部分結果保存。実 DB と本体 restart/cancel UI |
| P1-B | HTML 保存から既定 on の schedule、同一 note の旧 editor source URL 再保存で取得済み再利用。手編集を遅い job が上書きしない実 DB 回帰。三モード/20版の完成は含めない |
| P1-C | 実 sanitizer/CSS/frame render、初回 inert link、same-origin 単独 sandbox、script 禁止維持。SSR 起点の表示・SPA・preview・reload、本体 metadata fallback を確認 |
| P1-D、P2b-A/B | reference asset provenance/current ref 認可、別 note 借用拒否、GET/HEAD/Range/416 認可先行。既存 draft/committed/media insertion 回帰を Node 全件で確認 |
| P1-E | css-tree の runtime external 解決を修正。Node22 の最終 pnpm build → pnpm start と実ノート再表示成功 |
| P2a-A | caller signal を admission/stream/media worker へ伝播。既存 optional signal 呼出、document normal/deadline/queue 解放を含む unit 全件成功。parser の抽出方式自体は変更していない |
| P2a-B/D/E/F | source bundle と予約/物理容量、cleanup 完了までの quota 保持、job/worker接続変更。import/asset/outbox/P1 を含む Node 全件成功 |

認証、既存 codec/SVG sanitizer の根本方式、sandbox の許可 flag は変更していない。その既存受入を全方式再証明へ拡張しない。新しい CSS/参照認可/資源/起動境界の根拠は本報告で更新する。

## 実装境界

`domain/reference` に状態・repository port、`application/reference` に schedule/read/reuse/process/quota を置いた。LibSQL の typed tables/repository を Hollow UoW に追加し、ReferenceQueued は note/job/台帳と同一 transaction で outbox 保存する。取得・内容検査・storage I/O は UoW 外。Node runner は DB を正とし、outbox は wake-up のみ。

主な新規実装は `packages/core/src/application/reference/`、`packages/core/src/adapters/node/reference/`、`referenceRunner.ts`、LibSQL reference schema/repository、`apps/web/app/presentation/hollowReferences.ts`、`ReferenceLedger.tsx`。既存 note save/import commit/asset render/Node entry/UI と接続した。単一 JSON 状態や巨大汎用 service には統合していない。

### 資源制約

| 分類 | 境界 |
| --- | --- |
| 要件上限 | 現在参照集合 200 件・100 MiB、CSS も対象。過去失敗は現在件数へ累積しない。取得済みを重複取得・計上しない |
| 要件上限 | upload 100 件・500 MiB、companion も含む。入口通常50 MiB/音声200 MiBを維持し、ED06動画200 MiBを import へ拡張しない |
| 要件上限 | 個人5 GiBに original、media、companion物理原本、各 reservation を合算。原本と生成assetは別物理容量として計上 |
| 追加運用境界 | HTTP(S)、default80/443、URL8192文字、redirect5回。credentials/特殊scheme/内部host/非公開IPを拒否 |
| 追加運用境界 | 1取得30秒、実stream bytes、identity encoding。CSS取得1 MiB、埋込CSS512 KiB、HTML既存800 KiB |
| 追加運用境界 | DOM 10,000要素/depth128、CSS AST100,000、静的照合2,000,000。超過装飾は安全な未適用・noticeとし、本文を失わせない |
| 追加運用境界 | job実行5分（claimから、queued待ちを除外）、最大3claim。worker2、各job逐次取得、lease60秒/heartbeat10秒/sweep5秒 |
| 描画準備 | 外部候補最大200、DNS検査並列8・全体5秒。未検査超過を安全な描画停止として報告 |

追加境界の拒否は理由付きで台帳に残す。5分 deadline は fetch/body/admission/media 処理へ伝播し、既に取得できた安全な部分は保存する。後の retry は新 job として未取得分を対象にする。

### URL と socket

WHATWG 正規化 → scheme/credentials/host/port → 全DNS回答の公開IP判定 → 検証IPへ custom lookup で socket 固定。original Host、TLS SNI、証明書 hostname は元 hostname を維持する。各 redirect で一連をやり直す。literal IP の表記変形にも同じ公開IP判定を行う。

production に allowPrivate/public-ticket を持たせていない。実 socket の unit fixture は test-only transport で loopback へ写像するが、production 判定に例外を追加しない。private/mixed/special DNS と private redirect は接続0、遅いDNS、body停滞、圧縮、過大bytes、binary一致、TLS hostname、caller取消を試験した。

### 保存と asset

候補収集は sanitizer が候補を捨てる前に行う。取得した画像/動画は既存 bounded 内容検査後、private storage と reference job provenance を持つ committed asset にする。reference asset は source note/job を持ち、draftId は持たない。

読取は現在の note 認可と現在参照を必須とする。同一 note 由来の取得済 source URL は再保存時に再利用できるが、他 note の marker/台帳/asset を権限根拠にしない。既存同一 note 7日猶予の限定再添付、ready/GC deleting 条件を維持する。将来20版 pin は未接続。

data URI は decoded32 KiB超だけ asset 化する。小さい data URI も検査済みでなければ描画しない。off の小さい悪性 SVG の安全化、大きいSVGのasset化、破損PNG拒否を実DBで確認した。

### CSS

css-tree AST を sanitized DOM/static selector/style属性と照合し、同一対象に一致する宣言集合で遮蔽を判定する。CG1 の Number/Dimension/Percentage 数値比較を正規化し、`inset:0px 0px`、`0.0`、`100.0vw/100.0vh` は既存 literal と同じ拒否になる。保存DOM/class/styleが変わると再判定する。

通常の local absolute、grid/flex、非全面 transform、color var は保持する。@import、escaped import、root Raw、nesting、未解析 selector/構文、動的な位置 var/calc 等は notice 付きで制限する。CSS URL/image-set の文字列は stylesheet final URL 基準で解決する。背景画像/font は取得asset化せず、外部依存としてカテゴリー別に記録・描画判定する。

これは全 cascade/画面意味解析ではない。小さい親内の正当な inset-zero、後の宣言に上書きされる位置指定、条件分岐の排他性、未知の動的位置構文などを保守的に失う。normal normalize.css でも制限された宣言・コメント等が notice となる。全 position 一律削除や headless layout 判定にはしていない。

失敗/optout stylesheet を外部 link に戻さない。marker は後の再取得候補であり権限証明ではない。CSS過大・DOM/AST/照合超過で装飾を省いても本文を保持する。

### bundle、reservation、回収

companion は明示 role。CSS は参照専用、通常画像を自動で companion に変更しない。HTML/MD と同名の通常 note を許可し、duplicate normalized path の曖昧さだけ拒否する。source directory から `../` を正規化して bundle 内なら利用し、escape は未解決とする。companion-only batch は明確に拒否する。

note settings に永続 bundle 関係を保存するため、off/参照失敗/現在画像参照なしでも原本を保持する。upload兄弟の失敗/cancelでも seal して永久待ちにしない。失敗 upload の object 削除が失敗した場合、予約を実削除/不存在確認まで保持する。再試行で object が除去された後に解放する。容量競合時の過剰受理なしを storage + DB で確認した。

孤立 companion の回収条件は sealed、関連 note settings 0、awaiting/uploading reservation 0。seal後の新規受理を拒否し、未完了本文 upload/将来note作成を先に回収しない fence にする。storage実削除または不存在確認の後だけ row/quota を解放し、失敗時は保持して sweep 再試行する。off note がある対では原本保持を確認した。最後の note 完全削除 hook 自体は将来 P2d の対象であり、今回の完成には含めない。

### job と台帳

note-readable ledger は owner-only90日job履歴とは別に保持する。現在対象集合・取得済/未取得/失敗/取消/上限未試行、URL、理由、CSS除去を表示する。過去参照/除去通知も note に残る。job pruning 後の台帳保持を実 DB で確認した。

commit は元 note version、現権限、試行generation、lease を確認する。遅い worker の手編集上書き・後の試行上書き・別note借用を拒否し、採用できない object は cleanup に回す。通常取消は現在の1取得を待ち、安全な完了部分を保存、未開始を取消状態にする。cancelled は job failure=null。権限喪失/古い版は hard取消として遅い結果を採用しない。

## 描画・入口用途 guard

外部失敗画像/動画は検査済み公開URLを表示に残す。private hostname/literal、未解決relativeは src を落とし、raw URL/理由をテキスト台帳に残す。CSP は img/media/font/background の検査済み exact URL 集合を使い、全http許可にしない。小さいdata画像も検査認可を要する。

CSP redirect は path 制約を保持しないため、保証は「HTTP到達0」ではなく「非asset動的処理を認証/業務前に拒否」。Node入口で image/video/audio/font 用途は厳密な保護assetか実在staticだけを許す。asset subresource は Sec-Fetch-Site=same-origin 必須で、same-site も拒否する。拒否は403/private/no-store、Vary destination/site。判定は request DI/auth/import/media/serverFn の前にある。広い prefix や static fallback では動的pathを許可しない。

HTTPS/trustworthy localhost、対応 browser、metadata を保つ proxy が前提。render transport が metadata と信頼可能originから externalReading を決め、client payload で true へ昇格できない。欠落時は外部直読だけoff、本文/内部assetは維持。通常 navigation や serverFn を一律拒否しない。明示documentでのasset閲覧は通常の認可を使う。

same-origin 単独 sandbox、script/object/frame/connect/form/base閉鎖、初回からinertなリンク表現を維持。HTML正本のURLは保存し、trusted親の明示リンク操作だけを許す。今回、全browser/OS/非trustworthy HTTP/全proxyの互換性は保証していない。ブラウザの外部DNS再解決・外部追跡リスクは残る。server fetch のDNS固定とは別境界である。

## 検証コマンドと結果

| 実行 | 最終結果 |
| --- | --- |
| `pnpm typecheck && pnpm lint:fix && pnpm format` | 08:45 JST回収、成功。343 files、既存 useLiteralKeys unsafe提案23件は情報のみで未適用 |
| `pnpm exec vitest run --config vitest.config.integration.node.ts --maxWorkers=1` | 08:44:49 JST開始、23.52秒、10files / 87tests成功。最新孤立回収変更を含む |
| `pnpm test:unit --maxWorkers=1` | 08:50:33 JST開始、14.75秒、24files / 257tests成功。最終コード |
| `pnpm build` | 08:45–08:50 JSTに実行・完了回収、成功。旧serverをstopしてからbuild |
| `pnpm start` | 08:50 JST起動、session57043/PID8248。実ノート再表示・内部画像width32・横overflowなし |

Node全件には reference14件、P1認証/認可/永続化、import、asset、outbox/processed_events 等を含む。reference二claim試験は実DB/shared UoW の並行 claim と stale token/conditional commit を確認するもので、二独立processのclaim試験と称さない。既存importの複数client回帰と本体worker並行動作は別根拠。

主要試験: `references.integration.test.ts` の provenance/current ref、再利用/別note拒否、stale worker/手編集、cancel、bundle、data、orphan cleanup、現在200件、5分deadline、boot wake欠落、ledger pruning、物理quota。`safeFetcher.test.ts` と `referenceProcessor.test.ts` の攻撃/正常対、render metadata/入口guard tests、共有admissionと既存parser/media unit を含む。

途中失敗も区別する。

- 初回production起動は css-tree の `../data/patch.json` 解決に失敗した。Vite SSR external と web の明示runtime依存 css-tree3.2.1 へ修正し、最終 build/start と CSS実表示が成功した。
- CSS AST生成の空白正規化で旧期待値1件が失敗。意味を保つ空白許容期待へ修正し、安全性/値のassertは保持した。
- unit/Node/buildを重ねた際に既存XML深さ試験とP1 lockoutの5秒 timeout が各1件発生。並列負荷を止めてmaxWorkers1で実行し、最終全件成功。timeoutを隠す本体変更はしていない。
- 初回cancel操作は取得完了後で取消成立の証拠ではない。別20秒fixtureでrunningを確認して操作し直した。

## 本体ブラウザ・HTTP 根拠

Chrome Headless152/macOS、localhost HTTP（trustworthy）、専用session `hollow-p2b-media`。desktop1280幅とmobile390×844。画像は Implementer 自身が開いて確認した。成果物は `/tmp/hollow-reference-guard.3VY0yg/`。

1. `01a073dd-eec0-725d-b684-14aebbbad900`「P2b-C 本体参照試験」: HTML既定on、公開PNG/SVG/MP4内部化、MP4 duration5.055秒/seek3秒/206、公開失敗URL保持・127.0.0.1 src除去。local absolute保持、fixed/inset全体遮蔽除去。編集完了SPA・reloadで本文/asset再表示。同じraw sourceを再保存して同じassetを再利用。`production-detail.png` / `production-detail-full.png`。
2. `01a073e0-3d08-7538-bb19-93f9e6b1c680` bundle.html、`01a073e0-3d5b-751b-9b2e-b60e44dd55ec` bundle.md: 4filesを本UI投入、CSS/PNGを明示companion。2notes+2companionsで終端化、../CSS/grid/colorと画像width32を表示、escapeは理由台帳。split selectorのposition/insetが除去される。`production-bundle.png` / `production-md-mobile.png`。最終GC build後も本文・内部画像が保持されることを08:51 JST再確認。
3. `01a073e1-3f4d-762c-8234-4e67ef19571e` external-off.html: offで取込、公開PNG直接表示・CSS外部linkなし。SPA/reload/HTMLpreviewで外部直読が誤って常時offにならない。後からonでPNG内部化とremote normalize.css取得/安全埋込/除去notice表示。
4. 実公開redirect→本体 `/notes` はImage403、別の許可済note assetへのredirectもImage403。直接同originの自notePNG/SVG200、MP4 Media206は同時成功。元redirect queryは報告しない。本体HARはSec-Fetch/Cookieを省いているため、欠落値から実header欠落と断定しない。exact metadata + handler counter0は別test-only gateで確認、本体ではstatusと入口コード順序を根拠とする。
5. 実serverFn wireで metadataなし: 200、fallback=true、本文/内部assetあり、外部srcなし。正規empty/cors/same-origin: fallback=false、本文/内部/外部保持。client入力によるtrue昇格の禁止はtransport/schema実装とunit根拠であり、未知全payloadの侵入試験とはしない。
6. 実productionHTTP: 動画GET200/HEAD200/Range0-99→206/不正Range416。匿名不正Range401で認可先行、same-site/cross-site asset subresource403、明示document Range206。動的 `/notes` `/signin` `/verify-email` /unknown serverFn のimage用途は403/private/no-store/Vary。
7. server停止中に本DBへqueued2件を保存。一方はexpired running claimにして再起動。`01a073e9-777e-7068-aeea-e2051909cd99` はattempt2/succeeded、`01a073e9-7788-727a-b37a-7f79fe585649` はattempt1/succeeded、各asset1。タイトルの説明は逆転したためここでは実DB状態を正とする。本体outboxを削除した試験ではない。wake欠落はDB runner testで確認した。
8. `01a073ec-c9e1-754f-bade-dee9d8945870` cancel-wait.html: 20秒取得のrunningをDB read-onlyで確認しUI取消。取消待ち0/2→現在取得完了後cancelled/completed1/total2/failureNULL、現在JSONは形式失敗、未開始PNGはcancelled。`production-cancel-wait.png` / `production-cancelled-mobile.png`。今回UIの現在取得は成功ではなく形式失敗。正常取得を部分保持する取消は実DB試験の別根拠。

複数import + worker/sweep + note保存/一覧を本体で重ねた範囲にSQLITE_BUSYやevent-loop停止のproductionログはない。全100件負荷や全ネットワーク障害の網羅を行った主張ではない。

## 資料、依存、fixture

AST/HTML parserは core に exact css-tree3.2.1、ipaddr.js2.5.0、htmlparser2 10.0.0、domhandler5.0.3、dom-serializer2.0.0。web は external css-tree3.2.1 のruntime依存を持つ。writer/動画生成ツールはproductionへ追加していない。

一次資料: [css-tree](https://github.com/csstree/csstree)、[ipaddr.js](https://github.com/whitequark/ipaddr.js)、[htmlparser2](https://github.com/fb55/htmlparser2)、[domhandler](https://github.com/fb55/domhandler)、[dom-serializer](https://github.com/cheeriojs/dom-serializer)、[Vite SSR external](https://vite.dev/config/ssr-options)、[CSP3 URL matching](https://www.w3.org/TR/CSP3/#match-url-to-source-expression)、[Fetch Metadata](https://www.w3.org/TR/fetch-metadata/)。CSPのredirect path省略、Metadataの全URLchain origin比較を採用境界へ反映した。

実公開取得は読み取りのみ。課金・メール送信・外部writeなし。以下は取得binary SHA-256一致を確認した。

| fixture | bytes / SHA-256 / 条件 |
| --- | --- |
| [libpng v1.6.50 pngtest.png](https://raw.githubusercontent.com/pnggroup/libpng/v1.6.50/pngtest.png) | 8831 / `b7a468324556bf6924058acb0fb477320355da0d864728e614be83ffa6966148` / PNG Reference Library License、既存repo license保持 |
| [Tabler v3.31.0 photo.svg](https://raw.githubusercontent.com/tabler/tabler-icons/v3.31.0/icons/outline/photo.svg) | 541 / `202d6c6dad7b8fd9a6a83241654786bd6f384b9cb5e8c2a57d619434e13aaf6b` / MIT、既存license保持 |
| [MDN flower.mp4](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4) | 1128375 / `0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451` / CC0、既存MEDIA.md/source記録 |
| [normalize.css8.0.1](https://raw.githubusercontent.com/necolas/normalize.css/8.0.1/normalize.css) | 6138 / `580818700724d42d7fcc4979b0197971fca1c6d2e0286769237a0ac897df5512` / [MIT](https://github.com/necolas/normalize.css/blob/8.0.1/LICENSE.md)、08:45 JST再取得一致 |

自作bundle fixtureは同tempに保持: bundle.html `3bff5e4aa337bb2e0a4fd634287d4ae63e4579abb5e68b5375daf0e1c81789e7`、bundle.md `2303684b058c4a500efc60d65bc695750639bf406e7e9add0ee57191baf9b1b0`、site.css `f456e02b6d0280d48695a94f926c028d6467d24a6c03060adaff7abcb7a374d0`。picture.png は既存writer fixture（writerは生成専用）`d27bc1f52c93f1e436006787df3680db28ffb9b3126e9b7e6728efe538429e82`。公開redirect/delayは [httpbin](https://httpbin.org/) の小さい読み取りを使用。

固定旧spikeは変更していない。本体AST/HTTP接続は新unit/DB/UIで検証した。test-only private socketやhandler counterの試験を本体認可成功と取り違えない。

## 移行、残条件、handoff

移行 `0005_mysterious_franklin_richards.sql` は online backup、clone migration検査、旧production停止、final backup、本DB migrationの順に適用した。バックアップは `/tmp/hollow-p2b.dAfzgS/pre-references-backup.db` と `pre-references-final-backup.db`、cloneは `reference-migration-check.db`。旧337notesのhtml/versionと旧15assetsのsha/storageKey差分0、FK違反0。最終DBは345notes/24assets。既存originalを削除していない。

P2b-D 表示style切替、P2c 全三モード/20版・pin、trash完全削除hook、workspace/public/export/AIは未対象。現WYSIWYGは内部media安全nodeを保持するが、未取得external/CSSの保持はHTMLモードを使い、モード変換の損失確認を維持する。これを全三モード編集完成と扱わない。

起動維持: http://localhost:3000、production session **57043** / PID **8248**、Node22.22.3。

```sh
DATABASE_URL=file:/tmp/hollow-p2b.dAfzgS/app.db \
APP_URL=http://localhost:3000 HOLLOW_MAIL_MODE=local \
HOLLOW_MAILBOX_DIR=/tmp/hollow-p1-S1piZT/mailbox \
HOLLOW_STORAGE_DIR=/tmp/hollow-p2.sj33Bk/originals \
HOSTNAME=127.0.0.1 PORT=3000 pnpm start
```

再buildはこのproductionだけを停止してから行う。DB/storage/mailbox設定は従前を保持した。helperは書込停止済み、Implementer専用browserは08:53 JSTにclose済み。独立Verifierへ環境を渡し、次P2b-Dへ進まない。

一時の本人 browser-state export と本人採取 HAR は08:55 JSTに削除した（復元用コピーは作成していない）。Cookie/queryを報告へ転記していない。画面・fixture・安全な検査scriptは保持したが、transport-check/redirect scriptを再実行する場合はVerifier自身のsession exportが必要。自身のtest-only listenerは停止済み。全コード/browser操作をここで停止する。

## V1–V4 revision — 2026-09-06 10:15 JST

独立レビュー `reviews/P2b-references.md` の V1–V4 を修正した自己検証候補。上記の初回候補と独立レビューの失敗根拠は保持する。この節の成功を独立受入とは扱わない。

### 固定対象と変更範囲

- 開始: 09:46:48 JST、518 files / `2fcdb382a1e07761d3aee209a54e038203b66d496b2dd8f236f75ca0e57508da`。
- 固定: 10:13:13 JST、10:15:51 JST再照合一致。Node `v22.22.3`、main、519 files / `7aad4d35f5077614c4eebf22f9773468707bde3e3242e2f6773df03bf52bfca7`。
- HEAD: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。このフェーズで commit は作成していない。
- lock SHA-256: `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`、依存・schema・migration は変更していない。
- fingerprint は既存 `/tmp/hollow-p2b.dAfzgS/fingerprint.mjs` を実行。tracked と untracked の全実ファイルを path/NUL/content/NUL のソート列で集計し、Manager 所有 `.goal-implement/` を除外。git status の集計は modified 23 / untracked entries 88（ディレクトリ表示を含み、519 ファイル数とは異なる）。既存ユーザー変更を含む候補全体の識別子である。

変更は reference scheduling/reuse/worker、依存台帳 helper、reference processor の snapshot 識別、SafeReferenceFetcher の optional signal、HTML save/import/control の接続、台帳表示ラベル、関連 tests。新規 `application/reference/dependencies.ts` を追加した。editor の状態管理、media insertion、admission、codec/SVG sanitizer、socket pinning、sandbox/入口 guard は変更していない。

### 修正契約と根拠

| 項目 | 修正 | 自己検証 |
| --- | --- | --- |
| V1 現在200件 | 現在の取得可能な取得済み集合を先に確保し、新規対象に残枠だけ割当。依存背景/font を集合から除外、同対象の alias/重複を除く。過去履歴を累積上限にせず、取得済みを追い出さない | 実 DB/usecase/storage で通常200 CSS取得後、前後追加・重複・背景依存を併置して acquired200維持、新規limited。既取得1件除去で枠復帰し1件取得、さらに CSS/image混在も200 |
| V2 依存台帳 | 最終 HTML/CSS に残る background/font を取得対象外として同期。取得後 CSS の依存も worker の元版/lease/権限 guard と同じ commit に含める | CSS取得で公開背景/fontと inline private/relative の計4依存を保存。off/on/save で重複なし、本文除去で過去参照へ。実UIでも分類・URL・理由と再読込を確認 |
| V3 CSS再取得 | 取得済み台帳だけでは再利用しない。現在同note本文に利用可能 CSS snapshot がある場合のみ再利用。除去後の raw link は新規未取得へ戻る | 実DBで旧raw保存は追加取得0/同asset維持、除去→再追加はCSS再取得。同じ経路を本体 UI で job1→job2、CSS1764字復元、PNG同assetで確認 |
| V4 SVG変換後 bytes | 482 B原本から520 B安全SVGへ増える前に、final bytes の current100 MiB上限と追加38 Bの5 GiB予約を再評価。追加予約はUoW、storage除去/書込は外側。asset/ledger/current使用量はaccepted bytes | 実isolated inspector＋実storageで520 B成功。不足は理由付き失敗、object削除失敗時は予約保持しsweep実削除後に解放。同時2 workerの追加予約は一方のみ成功 |

依存 URL 検査の I/O は UoW 外で行い、保存側は現権限・元版を再検査する。理由は「前回の確認では公開接続先」「内部・特殊ネットワーク」「公開URL基準を解決できない」「未確認」を区別する。公開判定は永久の表示許可ではなく、描画時に DNS/metadata/CSP を再評価する。背景/font は新たな取得対象にも200件枠にも加えず、bytes0の依存台帳とする。marker や前回の DNS 理由を認可根拠にはしない。

CSS snapshot の `materialized` は現在HTMLの final-base marker と内容から得る表示状態であり、権限ではない。再利用には同noteの既存台帳を要求する。旧候補で生成され得た空placeholder＋acquiredは再取得可能にする。正常なコメントのみstylesheet（適用CSSは空、取得結果baseあり）は再取得ループにしない正常対を追加した。任意の履歴CSSを永続保持する変更や新migrationではない。

V4 の100 MiB根拠は巨大物理fixtureではない。実520 B結果の後の取得に `100 MiB - 520` が渡ることと、純粋境界関数のちょうど上限成功・38 B超過拒否を確認した。5 GiB根拠は実DBの正規 `beginUpload` 予約を5 GiB−482まで積み、実SVGだけをstorageへ置く試験。巨大payloadやproduction quotaの改変はない。削除失敗時は原本482 Bと予約を保持し、新規1 Bの受理も `IMPORT_QUOTA` で拒否。clockを11分進め、実削除/不存在確認後に予約を解放した。同時試験は同processの独立worker処理と共有DB/UoWであり、2 OS processの再試験ではない。

### 検証コマンドと結果

実行runtimeはすべて Node22.22.3。

| 最終実行 | 結果 |
| --- | --- |
| `pnpm typecheck && pnpm lint:fix && pnpm format` | 10:02頃完了、成功。344 files、既存 informational 23件。追加した non-null assertion の警告は解消 |
| `pnpm test:unit` | 10:04:00開始、258 tests / 24 files成功、14.65秒 |
| `pnpm test:integration:node` | 10:04:25開始、migration生成込み94 tests / 10 files成功、26.28秒 |
| `pnpm build` | 旧production停止後、10:03頃成功 |
| 同設定 `pnpm start` | 10:04頃起動成功、実UI使用とproductionログにSQLITE_BUSY/worker errorなし |

`references.integration.test.ts` は21件。V1–V4の追加7件に加え、既存の別note拒否/current ref、stale/version、通常cancel、bundle、原本cleanup、wake欠落等も含む。最終unitは既存 parser/media、HTML/CSS、metadata/private URLを含む。`safeFetcher.test.ts` に停止したDNSへのcaller abortを追加し、結果がcancelledとなり待機中の追加lookupを開始しないことを確認した。

途中のNode93件成功と最終94件は区別する。追加cleanup試験は当初誤った期待code `STORAGE_QUOTA` で失敗し、既存入口の契約 `IMPORT_QUOTA` へ期待を訂正した。productionのquota判定を緩めた変更ではない。独立固定testは上書きせず、本体へ期待拒否/正常対の回帰を追加した。Cloudflare等の未採用runtime integrationは今回未実行。

### 本体ブラウザ確認

標準 agent-browser0.36.0 の自分専用 `hollow-p2b-media --restore` を使用。desktop1280×633、mobile390×844。スクリーンショットは自身で画像確認した。

1. V2: `01a0743f-497d-7292-b249-49622ce7f14d` / revision.html。新規HTML＋明示CSS companionの2ファイルを実File inputで取り込み（参照on/AI不使用）。台帳は現在5/取得1/依存4。取得CSS内の公開Tabler背景とfontを恒久表示し、inline `127.0.0.1` と未解決 `../` には表示停止理由。iframe computed backgroundは公開URLだけ残り、private/relativeはnone。公開背景の画像も実描画。fontは未使用宣言なのでfont payload読込成功とは扱わない。off→on→reload後も5/1/4で重複なし。
2. V3: `01a07444-389f-7081-8e04-108a481234d2` / P2b-C CSS再追加修正。normalize.css8.0.1＋libpng PNGをHTMLで保存し、CSS acquired6138 B/適用1764字、PNG8831 B。元raw HTML再保存でjobは1件のまま・asset `01a07444-b526-72db-a221-2509cedead21` 維持。CSSを除去保存するとcurrent stylesheetなし/本文134字。元link再追加onでjobが2件となりCSS1764字を復元、assetは同一。完了SPA→reload→mobileでCSSとPNGを確認。
3. 本体のV1大集合/V4巨大quotaは作成していない。これらの合否根拠は上記の実DB/usecase/storage試験。

一時成果 `/tmp/hollow-ref-revision.aK3Lna`:

- 自作CC0 revision.html SHA-256 `dfb0f22033a2e3d03d29dd6d2724d182f6e8c574434c96213fbe6c510a62f32d`、revision.css `4c0dd9d0088d8f35529469de19757c314dee2de12eb4ae3760da2963d3070939`。
- `v2-dependencies-390.png` / `e0323937b5a7d06874879102cc4a558a39b3c50e8edf8da3b38f26077f233054`。
- `v3-readded-mobile.png` / `fe3f5978a49803d6084571a8445ec22dd3726dd83b4f37e236fd3ec954d502de`。
- `v2-mobile.png` は名前に反して1280px desktop撮影。`v3-readded-desktop.png` はreload直後のstreaming skeletonであり、完成描画根拠には使わない。後続DOM検査とmobile画像で完成を確認した。

公開fixtureの出所・条件は上記初回節と同じ固定version。実SVG482 Bの正常対は独立fixtureのCC0安全SVG（gradient/clipPath）の本体test内コピー、SHA-256 `9d0f19525d8ee5baf630ebae3879a866b3fd5ead7e0a7d10f9517706d691b642`。固定独立test `/tmp/hollow-p2b-reference-verify.Butwfg/independent.test.ts` は変更していない。

### 影響と独立確認へ残す観測

今回更新する根拠は P2b-C、P1-Cの依存描画/台帳、P2a-B/D/FとP2b-Bの関連参照・容量境界。Manager判断でP2b-Aの共通 `inspectMany` URL検査だけ再openする。従来renderNoteはoptional signalを指定しない。workerの依存検査だけjob signalを渡す。既存undefined/private/metadata回帰と追加abortを通過し、socket pinningやmedia認可を変更していない。P2a-A admission・直接挿入の容量処理は不変。

付随観測として、10:10頃 `/notes/new` のHTMLモードでタイトルを入力し、先行autosaveが新規noteからedit routeへ移行する付近に本文fill→保存を重ねた初回は、後続snapshotでtextareaが空・保存済みになった。DBは対象note version0/html空、reference job0だった。route移行完了を待っていなかった。localbackup内容とin-flight payloadはその時点で採取していないため、そこまで消えたとは断定しない。移行済みedit画面で同本文を再入力した後は保存/取得成功した。実ユーザーのtyping速度・確定待機を制御した再現試験は未実施。editor状態管理は本revisionで無変更。ManagerがP1-Bの新規→保存移行境界を別途再openし、独立再現へ渡す。V1–V4の成功とは分離する。

### データ保全と引継ぎ

変更前にSQLite online backup `/tmp/hollow-ref-revision.aK3Lna/pre-revision.db` を作成。旧production PID10535だけ停止してbuildし、同DB/storage/mailboxで再起動した。schema変更なし。本DBは351 notes / 29 assets。backupの349 notesは欠落0・html/version/title差分0、28 assetsは欠落0・全column差分0。integrity_check=ok、foreign_key_check違反0。原本/既存assetを削除せず、本人の新規UI試験2notes/1assetを保持した。

引継ぎproduction: http://localhost:3000、session **12923** / PID **12295**、Node22.22.3。DB `/tmp/hollow-p2b.dAfzgS/app.db`、storage `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox`。起動コマンドは初回節と同じ。再build前にはこのproductionだけを停止する。

10:15 JST時点で自分専用browserをclose済み。今回追加listenerなし、helper書込なし、秘密値を含むHAR/session exportは作成していない。コード・browser操作を停止して独立Verifierへ返す。P2b-D以降は開始しない。
