# 統合読み1の修復に対する独立フェーズ検証

検証者は統合読み1と同じ独立読み手。修復の設計・実装には参加していない。これは対象を絞ったフェーズ式検証で、fresh全体統合読み2回目ではない。成立認定ではなく、7条件への反例と必須未観測を報告する。

- Candidate: `5a06d1ca1593c2db6f74d0651df18b57d06e22de`
- Product: `9000f81dbac5665ccd0d90e2626ee2807397cc6c`
- 比較元: [統合読み1](integration-01.md)、報告commit `73686288f1f987d52a0b0e38f6a63822c449c5bb`、product `ff15c55aa41c5495a7f4fd05082a2bfb1f3b05b9`
- F: `/Users/hikaru/.local/share/hollow/verification/integration01-repair-20261013T194744`
- 期間: 2026-10-13T19:47:44Z〜2026-10-13T20:15:41.973702Z。記録はUTC ISO8601。

対象16ID中、IN-01/02・IM-01/02/03/06にB1の条件4反例が残る。他10IDは7条件反例0・必須未観測0。変更到達先のOR-03/UX-VISUALにB5の条件6反例を追加した。対象18IDに未観測は残さない。7条件外の修復提案はない。

## 入力と環境

正本[requirements](../../spec/requirements.md)、[scenario](../../spec/scenario/index.md)、[design index](../../spec/design/index.md)/[tokens](../../spec/design/tokens.md)、brief/design末尾のB1–4修復方針、planの固定ID・原文・条件・依存・観測方法を照合した。CLAUDE/AGENTSとbackend/frontend実装例、goal-implementの完了条件・manager-loop・review-lensesを適用した。phasesの完了報告とManager/Mainの自己評価を根拠にしていない。旧独立根拠の適用は後述する。

F/checkoutとF/diagnosticはcandidateのfresh clone。DB/objects/鍵/HOMEは新規、TMPDIRは`/Users/hikaru/.local/hwt/ir-044744`。sanitized HOME/PATH/LANG、Nix Node22.22.3/Unicode16.0、同Node pnpm11.1.2、frozen install。工具設定はowner-only directory700/file600、FFmpeg/ffprobe8.0.1とPython3.13.12を明示し、通常bootの検査を通した。PDF工具・fontも専用設定へ渡した。

品質build後に同checkoutの公開account browser harnessを起動。`--ux-local --editing-local --organize-local --sharing-local --integration-local --export-local --jobs-local --retirement-local --audio-local --drive-local`を合成し、正常Node bundle/HTTP/RSC/nativeを使用した。外部providerは明示owned loopback代替。実Google/SMTP/OpenRouter/Driveの認証・送信・操作・課金・公開は実行していない。

Chrome144.0.7559.96はUAでも確認した。専用session a/b、明示空config、全CLIへ同じreject-only proxy55862を付けた。proxyにDNS/外部connect/forwardはない。allowed-domains、CSP/deadline/guardの緩和はない。F/browser.pyはcommand/時刻/exit/DOMをlogs/browser.jsonlへ保存する。

## B1: runtime文書に未提供の旧段階が残る

条件4、IN-01/02・IM-01/02/03/06。完了条件は「変更が触れたdocsの記述は変更後の実装を述べている」。採用designのB1修復方針も、Node手順書をtext/image/PDFと専用STT・本文構造化の実装へ揃える。

`docs/runtime_node.md:130`のFile imports節に **「No AI provider is connected in this phase.」** が残る。このphaseを旧段階として区切る見出しはない。同文書`:332`は「A linked account and normal generation configuration enable supported text, document, static-image and audio conversion and regeneration」と述べる。

現在コードの`server.node.ts`音声工具/LLM composition、`audioWorker.ts`のSTT→structure経路、自身の正常連携→6音声生成→再生成で、configured Nodeが生成を提供することを照合した。自身wireは初回STT7/chat6、再生成込みSTT9/chat7。未提供の文書案内は実装・同文書の現在案内と不一致である。

再現はcandidateで`sed -n '128,132p' docs/runtime_node.md`と`:332`を読み、下記通常連携・生成を実行する。製品機能の仮実装ではなく、変更対象文書の条件4反例として記録する。旧B1のllm_node table/末尾・runtime:332・openrouter_nodeのaudio未提供案内は修復されているが、この残案内をそれらの修復で埋めない。

`runtime_node.md:142`のproduction **validation** がFFmpegを呼ばない説明は、audio generationの工具使用と区別して読む。そのvalidation自体を本反例へ加えない。

## B2: transcript境界の不足を現在テストへ照合

旧B2に効くIM-01/02/03/06。製品`audioWorker.ts:60`の`bytes + size > AUDIO_LIMITS.transcriptBytes`は比較元と同一。新unit`:135–175`/DB integration`:1434–1520`は65519/65520 ASCIIを固定値として置き、framingを含む期待HTML・65536/8bytes・ordinal・全文連結・hash/永続selection/seal・旧note/original/sharing/revisions/quotaを主張する。分割関数やproduction定数から期待分割を生成していない。

停止済みF/diagnosticだけで同guardを`>=`へ変異した。65519の原1segment65536bytes、65520の原[65536,8]に対し、両境界assertがunit/DBとも実際に赤くなった。finallyで復元し、tracked差分0と同testsの再成功を得た。製品sourceへの変更はない。

| command（F/diagnostic、全時刻2026-10-13Z） | 開始 → 終了 | 結果 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` (install) | 2026-10-13T19:48:22.924334+00:00 → 2026-10-13T19:48:37.322116+00:00 | exit0 |
| `pnpm exec vitest run packages/core/src/application/llm/audioWorker.test.ts` (unit-red) | 2026-10-13T19:48:37.323738+00:00 → 2026-10-13T19:48:40.021746+00:00 | 2 failed / 6 passed、exit1 |
| `pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/llmAudio.integration.test.ts` (integration-red) | 2026-10-13T19:48:40.022089+00:00 → 2026-10-13T19:49:05.960711+00:00 | 2 failed / 28 passed、exit1 |
| `git diff --exit-code` (restore) | 2026-10-13T19:49:05.961281+00:00 → 2026-10-13T19:49:06.184668+00:00 | tracked diff0、exit0 |
| `pnpm exec vitest run packages/core/src/application/llm/audioWorker.test.ts` (unit-restored) | 2026-10-13T19:49:06.184992+00:00 → 2026-10-13T19:49:07.039669+00:00 | 8 passed、exit0 |
| `pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/llmAudio.integration.test.ts` (integration-restored) | 2026-10-13T19:49:07.040006+00:00 → 2026-10-13T19:49:26.336013+00:00 | 30 passed、exit0 |

根拠はF/logs/mutation-results.jsonl、diagnostic-unit-red/integration-red/restore/unit-restored/integration-restored.log。旧B2の「34件全passでも分割が変わる」反例は、この実redと復元成功へ置き換わる。B2の条件2反例は現在0である。

## B3・B4とタグ回帰の自身観測

正本index:102–106は読む680/list780/tile・calendar1100、tokens:193–205はpalette620/bar56。index:60はscope常時表示と「モバイルでもラベルを残し、長い名前は省略記号で詰める」。requirements:42とWS-02基本フロー1の現在文脈常時表示に従い、合法長名の全文常時可視は追加しない。

| 原文からの期待 | 自身の現在観測 | 根拠 |
| --- | --- | --- |
| Desktop list780、tile/calendar1100、bar56 | 1280×720で780/1100/1100、header56。通常表示buttonで切替、URLも形式を保持 | logs/route-observations.jsonl、tag-observations.jsonl、1280-notes-* / 1280-*-tags.png |
| 内部・公開・限定・password後の読むmain680 | 内部WS/個人・公開・限定/password後main680、解決後iframe616。公開本文p568。375/320はmain375/320、iframe343/288、同本文 | detail-observations/route-observations、1280/375/320 reader画像 |
| 正しいpassword後の本文と再訪保持 | 匿名browser bでgate→通常入力local-share-password→保護本文。後の375/320再訪で同本文、再入力なし | 1280-password-gate/password-reader、375/320-password-reader |
| 個人/WS本文scroll後も現在名が画面内 | scrollY620で全3幅header y0/height56、scope y16.453125〜38.546875。320は合法ellipsisで個人/編集名を表示 | `<width>-workspace-reading/personal-reading.png`、detail-observations |
| 合法100文字WS名もラベルを残す、menu操作可能 | 通常一般設定で「統合検証」＋96個の「長」を保存。解決済本文scroll620後、scope幅288/114.40625/59.40625、ellipsis。全3幅scope/account menuのpage幅一致。個人buttonへfocus→Enterで通常個人URLへ遷移 | `<width>-long-scope-resolved/scope-menu/account-menu.png`、browser/detail logs |
| 全対象モバイルでpage overflowなし | 認証18route＋匿名5routeを1280/375/320で解決後観測。追加WS detail/editor/個人long detailと上記reader・menusもpage幅一致 | route-observations、detail-observations、`<width>-<route>.png` |
| タグchipとbadge/操作が幅内、通常付与とfilter | 通常タグdialogでGitHub作成/付与。list/tileの375/320でchip48.84375、親76.4375、page375/320。通常chip選択で当該audio note1件へfilter | tag-observations、375/320-list/tile-tags、320-tag-filtered |
| Calendar日内の追加ノートへ到達 | 320で10月8日55件の初期3件→「他52件」の通常click→追加ノート表示、page320 | 320-calendar-expanded、browser/detail logs |

Calendarのtags非表示（browse.css:321–325）は比較元と同一。非表示chipのrect0を新しい回帰やtag overflowの成立根拠に数えない。Drive設定の独立HTTP shellのdesktop main1280も比較元と同一で、今回のhollow/layout styleをimportしていない到達外である。

初回editor3幅はHTML上部だけを観測していたため、previewの必須未観測をいったん明示した。Managerの追加観測指示後、同じ検証済buildを再buildせず、新F/preview-runtime/DB/objects/HOME、socket s2・proxy55872・空config・専用browser cで不足だけを補完した。

通常signin→decorated.html編集→WYSIWYGへの変換確認→「安全な本文プレビュー」を展開。期待はcontent-max680の上限、元の3本文が安全なiframeで読めること、page overflow/操作欠落なし。2026-10-13T20:14:16.594〜20:14:17.181Z、frame幅674/301/246（fieldset内の可用幅）、computed max-width680px、main780/375/320、page1280/375/320を実測。「取り込み見出し」「編集可能な本文」「保持内容未知の構造」が3幅のDOMと画面に一致。確認/取消buttonsを同画面で確認した。通常「変換を取消」でHTML mode/保存済み/元HTML sourceを保持。`<width>-editor-preview.png`、logs/preview-browser.jsonl/preview-observations.jsonlへ固定した。この補完後、UX-READING/UX-MOBILEの必須未観測は0である。

## B5: 変更到達先の検索パレットが上端へ密着する

条件6、追加のOR-03/UX-VISUAL。OR-03基本フロー1はControl+K・上部trigger・絞り込みからパレットを開く。正本index:80全文は **「上から8vhの位置に置き、画面中央には置かない（入力欄が視線の高さに来るため）」**。垂直中央を避けて8vhへ置く規定として読む。同種の正準画面`spec/design/pages/P10-notes.html:413–418`も`.palette { ... margin-top:8vh; ... }`を持つ。

今回変更対象の`browse.css:381–398`はpalette幅を620へ修復したが、top/marginの位置指定がない。自身Control+Kで開いた実画面は次のとおりで、3幅とも上端へ密着した。

| viewport | 規定の期待top | 実rect x/y/width | screenshot |
| --- | --- | --- | --- |
| 1280×720 | 57.6px | 0/0/620 | 1280-palette.png |
| 375×812 | 64.96px | 0/0/341 | 375-palette.png |
| 320×760 | 60.8px | 0/0/286 | 320-palette.png |

2026-10-13T20:05:13.761/20:05:14.204/20:05:14.596Z。20:07:07.410Zの320再観測はcomputed position=fixed/top=0px/margin=0px。F/logs/browser.jsonlに原rect・computed、F/screenshotsに画面を保存した。Escapeの通常閉鎖は成功している。

design:215/217/219の現Shell/既dialog・最小修復方針を照合した。8vhを0へ置換する具体採用決定はなく、Managerへの既決定照合でも同前提を確認した。旧位置からの維持なので条件3の新回帰とは区別するが、幅変更が届くpaletteへの条件6反例として残す。index:80から横中央の追加条件は作らない。

## 品質・全テストの自身実行

F/run.pyをsanitized環境で実行。全commandの出力はlogs/gate-00〜09.log、ISO8601/exitはlogs/results.jsonl。稼働checkoutの再buildはない。

| command | 開始 → 終了 | 結果 |
| --- | --- | --- |
| `node -p JSON.stringify({node:process.version,unicode:process.versions.unicode})` | 2026-10-13T19:47:50.913820+00:00 → 2026-10-13T19:47:50.955087+00:00 | v22.22.3/Unicode16.0、exit0 |
| `pnpm install --frozen-lockfile` | 2026-10-13T19:47:50.955417+00:00 → 2026-10-13T19:48:04.427453+00:00 | exit0 |
| `pnpm exec node -v` | 2026-10-13T19:48:04.428073+00:00 → 2026-10-13T19:48:04.704639+00:00 | v22.22.3、exit0 |
| `pnpm typecheck` | 2026-10-13T19:48:04.704982+00:00 → 2026-10-13T19:48:11.462250+00:00 | exit0 |
| `pnpm lint:fix` | 2026-10-13T19:48:11.462952+00:00 → 2026-10-13T19:48:17.253473+00:00 | exit0 |
| `pnpm format` | 2026-10-13T19:48:17.253767+00:00 → 2026-10-13T19:48:18.014586+00:00 | exit0 |
| `pnpm lint` | 2026-10-13T19:48:18.014891+00:00 → 2026-10-13T19:48:19.150248+00:00 | exit0 |
| `pnpm format:check` | 2026-10-13T19:48:19.150553+00:00 → 2026-10-13T19:48:19.869783+00:00 | exit0 |
| `pnpm build` | 2026-10-13T19:48:19.870120+00:00 → 2026-10-13T19:48:29.278682+00:00 | exit0 |
| `pnpm test` | 2026-10-13T19:48:29.279218+00:00 → 2026-10-13T19:57:50.205011+00:00 | 4372pass/skip0/unhandled0、exit0 |

Unit199files/2766、Node128files/1536（通常＋formats-app/app-c/native/native-d/native-e）、CF10files/70。Vitestの全assertionとexit0を取得した。CFのWebSocket peer disconnected診断はunhandled test errorではない。今回の新4境界casesを旧4368へ加算して4372となる。旧passを新gateへ読み替えていない。

## 主要音声正常と利用者に見える結果

2026-10-13T19:53〜19:57Z、通常owned OpenRouter同意→linked・AI待ち1件→text-v2/image-v2/STT-v2を選択保存。設定保存だけでは生成されない。通常uploadでWAV/MP3/M4A/Ogg/FLAC＋121秒WAVを限定希望で6件受付した。通常履歴に処理終了・完了6/失敗0/取消0、6使用/0予約、モデル名を確認。121秒は実FFmpeg/nativeから1,920,000＋16,000framesの2区間、初回STT7/chat6、保存した用途モデルとSTT deny/zdr・chat deny/no-fallback/require-parametersを確認した。

121秒noteから2model・LOCAL_INSTRUCTION_MARKERを選び、通常本文置換confirmを承認。Whisper/GeminiのSTT2/chat1をwireに確認し、実iframeのGemini本文と7使用/0予約を観測。通常undo confirmで旧text-v2本文、同限定URLを320匿名browserで開いて同旧本文を確認。原本・題名・共有URLを保持。今回再生成込みSTT9/chat7をlogs/runtime provider requestsで照合した。

期待は原文IN-01/02、IM-01/02/03/06と用途privacyの利用者override。根拠は375-link-result.png、320-models-saved.png、320-audio-selection/results/detail/regenerated/undo/anonymous.png、browser/detail logs、runtime/integration-local/requests.jsonl・closures.jsonl。実サービスの品質/費用/保持・STT fallback保証は範囲外である。

## 変更到達先と旧独立根拠の現在適用

`git diff 3696e096 5a06d1ca --name-status -- apps/web packages/core docs`の製品到達は16files。core productionの差分は0で、audioWorker unitとllmAudio DB testsだけが増えた。削除/改名したexport/query key/route/env/APIはない。CSS共有状態とraw公開shellの届く先は次の範囲へ照合した。

| 届く変更 | caller/範囲と現在確認 | 旧独立根拠の適用理由 |
| --- | --- | --- |
| layout.css/index.css、hollow main/header、workspace.css | 全Shell認証route、WS/current scope、詳細iframe/editor preview、menus、長名・scroll。全3幅と上記正常操作 | 旧report E01/E02/E03/E13のauth/save/role/mode・P13入口/日本語は規則/transport差分0。今回のwidth/sticky/previewを旧画面では埋めず現在観測へ置換 |
| ScopedNotesBoard data-layout、browse-tags | 3layoutとURL/prefs、タグ/公開badge/削除・共有入口。current browse/tag unit/DB、全suite、通常3形式/タグ付与・filter/calendar追加 | 旧report E04/P04の検索/AND/zone/keyset/空・エラー・認可の実装差分0。新styleの形式/タグ幅だけ自身観測。B5を旧palette keyboard passで閉じない |
| ImportJobs/DriveBackupHistory/ZipHistory child class、既batch-child-history | 処理履歴の親子展開wide。importの実6子・状態/モデル/履歴を全幅確認、DB/UI child assertionsも現全suite | 旧report E07/E08/E09/P07/P08/P09のcurrent認可/retry/親子/期限・batch/Drive/ZIP action規則は差分0。幅の集約selectorは既親子DOMへclassを追加するだけ。新import child幅・mobileを現在実測 |
| publicationHttp publicPage、sharingHttp page | public discovery/profile/WS、本文/metadata、limited/password gate・本文、認可error/匿名export | 旧report E05/P05/baseline-contentのtoken/grant/password/current/body/SEOのportとhandlers差分はstyle/raw import・読むclassだけ。現HTTP/DB全assertと匿名3種・gate/再訪3幅で補完 |
| docs/runtime/openrouter/llm、境界tests | 六音声/連携ID、STT/chat/tools/finite limits/recovery、B2のguard/永続seal | 旧report E06/E09/E11とP11修復の同ff15c55 productでの非音声/Drive/別editor/noAI/retry/cancel/recoveryはsource完全同一として引用適用。現在全suiteと自身6file/regen/undo/匿名を補完。旧B2不足を流用せず現在redへ置換、B1は残す |

条件4・5は新設物ごとに比較した。layout.cssの6値は既design tokensをappとraw匿名shellの両方へ供給する集約先で、二つのshellへ数値を複製しない。既tokens.css全体をraw shellへ入れる案と比べ、Hollowに不要なtemplate色/fontを巻き込まずレイアウトだけを共有する。data-layoutは既conditions.layoutをDOMへ写し、別画面種別/保存状態/汎用wrapperを作らない。reading/child selectorsは既所有componentと既batch classへ接続する。pageのreading flagはgate/errorと本文の表示境界に閉じ、共有domainの新状態を作らない。

次の同種job child追加は既componentにhollow-job-childrenを付ける範囲、幅の変更はlayout.css一か所へ届く。新抽象/意味の混用/境界違反/副作用混在/重複規則の規定形を取る条件5反例は特定しなかった。新business logicやportsはない。触れた製品コメントの追加はなく、AGENTSの型/内向き依存・既React pending/owner/controllerを変更しない。条件4ゲートは自身全0、docsの不一致だけB1として残る。

## ID対応と必須未観測

各IDの全正常/異常/境界条件は[固定台帳](../plan.md)の原文から取り、上記旧根拠の適用範囲・現全suite・自身の変更到達正常を合わせて問う。未変更規則へ旧観測を適用することと、変更された見た目の未観測を区別した。

| 固定ID | 原文 | 7条件への反例 | 必須未観測 | 現在根拠 |
| --- | --- | --- | --- | --- |
| IN-01 | [integration.md](../../spec/scenario/integration.md) | B1 | 0 | 音声正常/用途・docs |
| IN-02 | [integration.md](../../spec/scenario/integration.md) | B1 | 0 | 音声正常/用途・docs |
| IM-01 | [import.md](../../spec/scenario/import.md) | B1 | 0 | B2 red/6音声/本文・共有 |
| IM-02 | [import.md](../../spec/scenario/import.md) | B1 | 0 | B2 red/6子・成否 |
| IM-03 | [import.md](../../spec/scenario/import.md) | B1 | 0 | B2 red/履歴・計数 |
| IM-06 | [import.md](../../spec/scenario/import.md) | B1 | 0 | B2 red/2model・regen/undo |
| OR-01 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | 一覧/タグ・幅・現suite |
| OR-02 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | 3layout/日内展開・現suite |
| OR-11 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | 内部読む幅/本文・操作 |
| SH-05 | [sharing.md](../../spec/scenario/sharing.md) | 0 | 0 | 限定読む幅/匿名本文 |
| SH-06 | [sharing.md](../../spec/scenario/sharing.md) | 0 | 0 | gate/password後・再訪 |
| SH-07 | [sharing.md](../../spec/scenario/sharing.md) | 0 | 0 | 公開読む幅/本文 |
| UX-READING | [requirements.md](../../spec/requirements.md) | 0 | 0 | 同種reader/展開editor preview |
| WS-02 | [workspace.md](../../spec/scenario/workspace.md) | 0 | 0 | scroll/長名/menu/Enter切替 |
| UX-LOCATION | [requirements.md](../../spec/requirements.md) | 0 | 0 | scroll後個人/WSラベル |
| UX-MOBILE | [requirements.md](../../spec/requirements.md) | 0 | 0 | 全route/タグ/menus/展開preview |
| OR-03 | [organize.md](../../spec/scenario/organize.md) | B5 | 0 | 変更到達paletteの位置 |
| UX-VISUAL | [requirements.md](../../spec/requirements.md) | B5 | 0 | 変更到達paletteの位置 |

対象16のうちOR-01/02/11・SH-05/06/07・UX-READING・WS-02・UX-LOCATION・UX-MOBILEは7条件反例0/必須未観測0。六音声/連携IDは動作/B2根拠が揃っているが、条件4のB1で反例あり。追加OR-03/UX-VISUALは条件6のB5で反例あり。B5を条件3の新回帰として数えない。残る必須未観測は0。

初回のeditor観測不足はiframe:null/未展開のまま0へ読み替えず、追加preview環境で閉じた。driverの初回socket長、初期RSC/検索準備案内、default設定未変更でsave disabled、誤ったready文言/selector、CLI auto-scrollのsticky overlay、calendar非表示chip待機はログへ保持し、解決後の通常操作/画面と分けた。一度だけhelperが重なったtag試行は根拠へ数えず、終了後のserialized最終観測へ置換した。製品不具合・gate失敗に数えない。

## 自己環境の実正常閉鎖

初回はbrowser a/bの正規close exit0後、自己actual server PID67250のcommand/rootを照合し、20:08:07.955936ZにTERMを送った。account-browser.node.ts:542–570のcreateNodeShutdownはquiesce→listener close→organize close/booted.shutdown native drain→全fixture closeをawaitしてからexit0へ進む。caller/harnessは20:08:07.998714Zに実exit0。proxy67227もserver.close/closeAllConnections→caller/harnessが20:08:35.489660Zに実exit0。

20:08:35.626264Z、21自己PID（a/b daemonのowned socketとChrome子を含む）全閉鎖、8listeners（55861/55862/64433/64434/64435/64438/64476/64602）のconnect_ex61を確認した。F/checkout/F/diagnostic tracked差分0。logs/cleanup-before/after.json、runtime-term/proxy-term.json、harness-results.jsonlに固定した。

追加previewはbrowser cの正規close0後、自己actual server10278へ20:15:07.383602Z TERM→同quiesce/drain/caller/harnessが20:15:07.415208Z exit0。proxy10269も20:15:41.859889Z exit0。20:15:41.973702Zに13自己PIDと8listeners（55871/55872/65404/65405/65406/65407/65415/65416）全閉鎖/connect_ex61を確認。logs/preview-cleanup-before/after.json、preview-runtime-term/preview-proxy-term.json、preview-harness-results.jsonlへ記録した。

PID不在だけやexit1/130/143を正常終了の根拠にしていない。停止したのは自己環境だけ。失敗変異fixtureもFのpersistent HOME下へ保全し、他worktree/秘密値/PIDに触れていない。初回と追加previewの閉鎖根拠は独立に保持した。製品code/tests/config/docsは変更していない。報告のみの精密commitを通知した後、全read/write/runを停止する。
