# 残B1/B5修復の独立フェーズ検証（現在候補）

統合読み1と同じ独立読み手による残8IDと変更到達先の検証。修復の設計・実装には参加していない。fresh全体統合読み2回目ではなく、成立認定ではなく7条件への反例を探した結果である。

- Candidate: `efccb110c2b717e4354d38600a134c3ecb0189df`
- Product: `abde1e8a3bc12fddad6ef06dea52979b4dbc05fc`
- 比較元: 下記旧候補の自身独立報告、報告commit `a41558b6d3352c6c688865fde57fdd4422684ee8`、product `9000f81dbac5665ccd0d90e2626ee2807397cc6c`
- R: `/Users/hikaru/.local/share/hollow/verification/integration01-repair2-20261013T204931`
- 時刻・command・exit: R/logs/results.jsonl、browser.jsonl、harness-results.jsonl。UTC ISO8601。

残8IDの旧B1/B5は現在反例0。ただし全7条件では、必須fullがexit1のため条件4のD1（QA-TEST共通gate反例）が残8IDとQA-TESTに残る。OR-03/UX-VISUALには条件6のB6も残る。旧候補で0を返した10IDへ変更による具体回帰は特定しなかった。7条件外の提案は0。下記の旧B1/B5は旧候補について保持し、現在候補の残反例として数えない。

## 正本・変更範囲・環境

正本は[requirements](../../spec/requirements.md)、[scenario](../../spec/scenario/index.md)、[design index](../../spec/design/index.md)/[tokens](../../spec/design/tokens.md)、brief/designの採用方針・末尾B1/B5修復方針、planの固定ID・原文・条件・依存。AGENTS/CLAUDE、backend/frontend実装例、goal-implementの完了の定義・review-lensesを適用した。phasesとManager/Mainの自己評価を根拠にしていない。

`git diff 9000f81 abde1e8 --name-status -- apps/web packages/core docs`は`apps/web/app/styles/browse.css`と`docs/runtime_node.md`の2filesだけ。CSSは既`.browse-palette`のmargin-top追加とmax-height変更の2宣言。core・JS/TS・tests・config・その他docsはbyte差分0。export/query key/route/env/APIの削除・改名はない。candidateとproductの製品範囲にも差分0。

R/checkoutをcandidateのfresh persistent cloneに固定。新DB/objects/HOME、短TMPDIR `/Users/hikaru/.local/hwt/ir2-054931`、sanitized HOME/PATH/LANG、Nix Node22.22.3/Unicode16.0、同Node pnpm11.1.2/frozen install。private tool directory700/file600、FFmpeg/ffprobe8.0.1/Python3.13.12とPDF工具/fontを明示し通常boot検査を通した。品質build後に同sourceの通常Node bundle/HTTP/RSCとaccount browser harnessを起動し、稼働sourceの再buildはない。

通常harnessに`--ux-local --editing-local --organize-local --sharing-local --integration-local --export-local --jobs-local --retirement-local --audio-local --drive-local`を合成。Chrome144.0.7559.96/UA確認、専用session a、空config、毎CLIへ同owned reject-only proxy55882。外部DNS/connect/forward・allowed-domains・CSP/deadline/guard緩和はない。実Google/SMTP/OpenRouter/Driveの認証・送信・操作・課金・公開は実行していない。

## B1: 変更文書を現実装へ対照

条件4、IN-01/02・IM-01/02/03/06。「変更が触れたdocsの記述は変更後の実装を述べている」を問い、runtime全文と関連llm_node/openrouter_node/browser_audio/browser_driveの構成・操作・再実行案内を通読した。

| 現runtime_node.mdの記述 | 現code/独立観測との照合 |
| --- | --- |
| :130–134 個人/WS owner/editor、成功時の希望共有・手動共有優先、HTML/MD機械変換、linked/configured AI、image/audioと専用工具。旧「No AI provider is connected in this phase.」なし | server.nodeの通常構成、application import/LLM/audioWorker:96–122、transport/current認可・visibility規則は9000と同一。下記旧自身6音声→STT/body→再生成/undo/匿名本文を同一codeへ適用。関連文書の生成未提供案内も再検索でなし |
| :146 「Import validation does not invoke system FFmpeg. Audio generation separately uses configured FFprobe/FFmpeg」 | importの構造検証とnative audio generationを分ける実装。llm_node:69–79の工具・全原本decode・二段用途/privacyと一致。自身旧5形式・6音声files正常/native frame証拠を同一codeへ適用 |
| :240 owned-loopbackでDrive destination/backup/recovery/recorded-original regeneration。実migration/Google/Picker SDK未検証 | browser_drive/browser_audioのloopback置換と従前P11/自身旧reportの実source adapter・worker観測へ対応。実Googleの成立を主張していない |
| :289 shared100MiB、claim50MiB、audio200MiBはstream/private scratch | llmRepository:804–813とpdfPreviewRepository:442–454はconversion/PDFpreview/machineのsumに52,428,800を加え104,857,600超なら待機。sourceReader/inputStage/audio準備のstream経路は同一 |
| :291 source-bound leases、確認済closure・current source/credential、unknown時reserve保持 | application inputStage/workerのowned input/closure/re-read、repositoryのfinish fenceと一致。通常終了の自身現在drainと現integrationのunknown/close/ACK分岐も照合 |
| :293 owner version3/leased-local-v2、native births最大2、v2/leased-text-v1 matching legacyのみ | runtimeOwnership:85–111/385–432のschema・acquireと:660–724のlegacy/current receipt/provenance/termination/binding/zero memory判定へ一致。旧v2を現在protocolと誤記していない |
| :336 normal generationはconfigured/linkage、保存だけで生成せず、audio工具別途 | llm_node/openrouter_nodeのpurpose別・生成手順へ一致。現在にも同一の手動開始controller、旧自身link/model-save/no-dispatch観測を適用 |

旧B1残案内の引用箇所と現在修正文を対照した。生成を機械validationへ混同する記述やlive接続済みの主張を特定しなかった。リンク先は存在し、local再実行入口は今実行した通常harness/package scriptsに対応する。必須のTODO/FIXME/スタブ/未接続をこの変更・到達範囲に特定しなかった。

## B5: 8vh位置と検索の自身正常観測

正本index:80全文は「パネルは `--palette-max` / `--radius-lg` / `--shadow-lg`。上から 8vh の位置に置き、画面中央には置かない（入力欄が視線の高さに来るため）」。垂直中央を避ける位置規定として引用する。P10-notes.html:413–418の同種paletteもmargin-top8vh。横中央の追加条件は作らない。

現在browse.css:381–400は`margin-top: 8vh`、`max-height: min(760px, calc(100dvh - 8vh - 24px))`、既palette-max620を使用する。3幅で通常Ctrl+Kを操作し、空/多数結果/タグ/WS/合法長名を実観測した。

| viewport | 8vh期待 / computed margin-top | 実rect top / width | 多数結果height / bottom | 横/縦overflow |
| --- | --- | --- | --- | --- |
| 1280×720 | 57.6 / 57.6px | 57.59375 / 620 | 638.390625 / 695.984375 | panel618=client618、scroll3938>client636。page/body1280 |
| 375×812 | 64.96 / 64.96px | 64.953125 / 341 | 723.03125 / 787.984375 | panel339=client339、scroll4917>client721。page/body375 |
| 320×760 | 60.8 / 60.8px | 60.796875 / 286 | 675.1875 / 735.984375 | panel284=client284、scroll4954>client673。page/body320 |

computed CSS位置は8vhの値そのもの。rectはChromeの1/64 CSSpx単位のlayout値をそのまま記録した（上記各値は8vhを1/64へ切り下げた値）。期待を概略一致へ置き換えていない。既radius/shadow/色/入力/候補配置は9000から差分0。位置の修復と、後述B6の明示token不一致を分ける。縦は既panel内scroll、close/input/適用/candidateへ操作可能でページの横はみ出しなし。

| 原文からの期待と操作 | 自身の実際・screenshots（R/screenshots） |
| --- | --- |
| OR-03個人の文脈を固定、開くと入力focus、東京駅部分一致候補 | 3幅scope「個人のスペース」、INPUT/aria「ノートの検索語」。fixture個人東京駅61件中先頭50、WS混入なし。`<width>-palette-empty/results.png` |
| 一覧タグを引き継ぎscope/tag検索、Escapeは適用しない | 通常filterで頻出4を選択→Ctrl+K→Cloud。seed整理notes0–3の4候補だけ、hint「一覧のタグ1件で絞り込み中」。3幅Escapeでdialogなし・検索triggerへfocus、query空/選択tag保持。`<width>-tag-cloud-results/tag-escape.png` |
| WS候補だけ検索、ArrowDown/Enterで対象ノート本文へ | 3幅scope「編集fixture」、共同編集はseed共同編集fixture1候補。Enter後URLはediting.noteIdとworkspaceId、h1「共同編集fixture」に一致。候補抜粋はseedの「文字編集fixture 本文」。`<width>-workspace-candidate/enter-workspace-note.png` |
| モバイルの長名はラベルを残しellipsis（index:60） | 通常一般設定で「統合検証」＋96個の長（100文字）を保存。3幅paletteラベルは画面に「統合検証長…」等、text-overflowellipsis/client162/83/67、input/候補/操作は幅内。全文常時可視を追加しない。`<width>-long-workspace-candidate/long-workspace-escape.png` |
| 視覚chipから同palette、Escapeで起点focus | 320「＋絞り込み」を通常click→同8vhと入力focus。Escape後chip focus、header y0/56と現在長名ellipsisはscrollY593でも画面内。`320-chip-open/chip-escape.png` |

時刻は空/多数結果・tagのR/logs/palette-observations.jsonl、WSは2026-10-13T20:56:39.752Z〜20:56:48.125Z、長名・chipは20:59:47.403Z〜20:59:53.738Z。期待/候補ID/URL/本文/geometry/focus/DOMと画面をbrowser.jsonl/palette-observations/detail-observationsへ保存し、画像を自身で比較した。OR-03/UX-VISUALのB5反例は現在0。

## B6: パレットの明示された角丸と影の正準不一致

条件6、OR-03/UX-VISUAL。index:80は同paletteに`--palette-max`/`--radius-lg`/`--shadow-lg`を明示する。tokens:218/254の原標準はradius12px、shadow`0 16px 48px rgba(0,0,0,0.1)`。同種P10-notes.html:116/132/413–418も12px/同shadowを定義し、paletteのborder-radius/box-shadowへ使用する。

current browse.css:387は`border-radius: 15px`、:396は`box-shadow: 0 24px 90px #0003`。この2値は9000と同一だが、design:215/217の現Shell/既dialog採用には具体的なradius/影の置換決定がない。最新scope指示に従い、同paletteの明示された全tokenを元標準へ対照する。旧値の維持を条件3の新回帰には数えず、条件6の不一致として残す。主観の影の強弱や横中央の新基準を使わない。

CF終了後、同abde1e8の既buildを再buildせず、新R/style-runtime/DB/objects/HOME・TMP `/Users/hikaru/.local/hwt/ir2s-064500`・空config・専用d・reject-onlyproxy55892を作った。通常signin→Ctrl+K→東京駅検索→Escapeを3幅で実行し、全tokenのcomputedと画面を採取した。

| viewport / UTC時刻2026-10-13 | 正準max620/8vhの実値 | 正準radius12の実値 | 正準shadow alpha0.1/16/48の実値 | screenshot |
| --- | --- | --- | --- | --- |
| 1280×720 / 21:47:31.877Z | --palette-max620px、width620、margin57.6px/top57.59375 | 全4角15px | `rgba(0,0,0,0.2) 0px 24px 90px 0px` | 1280-palette-token-style.png |
| 375×812 / 21:47:32.945Z | --palette-max620px、width341、margin64.96px/top64.953125 | 全4角15px | 同上 | 375-palette-token-style.png |
| 320×760 / 21:47:35.021Z | --palette-max620px、width286、margin60.8px/top60.796875 | 全4角15px | 同上 | 320-palette-token-style.png |

R/logs/style-observations.jsonl/style-browser.jsonlに原computed/rect/DOM/command/exit、R/screenshotsに3画像を保存し自身で閲覧した。#0003の実alphaは0.2。max620/8vhは正準と一致、radius/影は正準と不一致。3幅page/bodyは各viewport一致、panel横scrollWidth=clientWidth、縦はpanel内scroll、input focus/個人scope/先頭50候補/通常Escapeと起点focusは正常だった。

computedの一般template変数はradius-lg1rem、shadow-lg`0 12px 24px -6px oklch(0% 0 0/.15)`だが、実paletteは前記literal値を描画している。これら一般template値をHollow正準12px/0.1-16-48の値として読み替えない。再現は同candidateの通常Ctrl+Kで`.browse-palette`のcomputed borderRadius/boxShadowを取得し、前記正本と比較する。追加新IDはない。

## 7条件と既独立根拠の現在適用

| 条件 | 今回問う範囲と根拠 |
| --- | --- |
| 1 要件 | 正本OR-03/6連携音声IDと位置/視覚導線の条件。変更は文書と既palette2宣言。現実装/正常/下記旧同一codeの挙動根拠へ対照し、完了条件を実装から作らない。外部段階はowned loopback契約 |
| 2 全振る舞い | SearchPalette/BrowseContext/model/input/SQL/worker/認可のcodeとtestsは9000と同一。P04:23–29の独立text/語境界/AND/unknown/null/timeout/認可、:70–84の候補/空/一覧適用/scope/tagを適用。旧B2の同guard変異は新境界unit2/DB2実red→復元差分0→unit8/DB30pass（下記時刻・ログ）で、guard/testsは現在同一。新business分岐なし。今の全suiteで現在assertを再実行し、変更CSSは独立8vh/620/viewport期待と実geometry/操作を照合 |
| 3 既存 | 唯一styleのcallerはSearchPalette:184、BrowseContext:172–237の個人/WS/current location/triggerとSearchTrigger/chip:244–259。到達する開閉/検索/本文遷移を今観測。既document/body/list/tile/calendar/reader/preview/scope/tagのselectors・component・layout tokensはbyte差分0。削除改名なし、現在全suiteはD1のため不通過、同一code/直接到達の確認とgate未達を分ける |
| 4 規約/設計 | B1全文と関連docsを現protocol/構成へ照合。AGENTSの内向依存・boundary/type・React pending/ownerを変更しない。製品comment追加なし。自身現在type/lint/format/buildはexit0、fullはD1でexit1 |
| 5 新負債 | 新型/関数/抽象はない。追加値8vhは既正準の位置、heightはそのoffsetを既計算へ反映する。既palette classを拡張し新wrapperや共通dialog全体の位置変更案と比較した。限定した既所有selectorでoffsetと可用heightを同一場所に持ち、他dialog/本文へ副作用なし。次のpalette位置変更は同2宣言だけ、viewport高さは既CSS計算、620は既token。規則重複/二意味/死branchを規定形で特定せず |
| 6 UI | 同種P10 palette/index80とcurrent3幅画像、label/purpose/hint/controls・ellipsis・幅・8vhを照合。旧accepted680/780/1100/620/bar56を置換する新条件なし。切れ/重なり/届かない操作の具体反例なし。ただしradius/影はB6の条件6反例 |
| 7 利用者に見える | 変更到達正常は通常browser3幅の期待/実結果/スクリーンショットで観測。異常は利用者overrideの現integration/e2e。未変更の音声/本文/preview等は過去passで未観測を埋めず、code差分0を限定して旧自身の実観測へ適用 |

旧10ID OR-01/02/11・SH-05/06/07・UX-READING・WS-02・UX-LOCATION・UX-MOBILEは下記旧報告B3/B4/タグ/preview追加の根拠を適用する。layout.css/index.css/hollow.css/workspace.css/raw public/sharing shell/ScopedNotesBoard/editor preview/componentの差分0。既list780/tile/calendar1100・読む680・header56・320/375タグ/日内展開・個人/WS scroll/長名/menu・匿名public/limited/password本文・preview674/301/246/max680と通常取消の実観測は、その同じDOM/CSS/処理へ届く。今回selectorは`.browse-palette`だけで、それらの要素は同classを持たずpreview iframeへ適用されないため、追加preview再実行を必須にしない。検索paletteだけは旧top0を流用せず現在3幅に置き換えた。

六連携/音声IDのbody/domain/adapter/runtime/config/testsは同一なので、下記旧6file全codec/121秒STT7-chat6/privacy/usage6→2model regen/undo/匿名同本文と旧P11非音声・Drive recoveryの独立根拠を現在へ適用。今回docsへその提供範囲を対照する。現在実Google送信や再生成を新たに実行していない。旧preview追加・B2red・初回/preview正常閉鎖の原記録は別期間の証拠として保持する。

## 現在candidateの自身quality/full

R/run.py、出力R/logs/gate-00〜09.log。対象の全testsは通常Nodeと全5formats groups、CFを含む。通常fullはNode失敗でCFへ到達せず、CFは後述の単独観測に分ける。旧成功数を現在成功として転記しない。

| command | 開始 → 終了 | 結果 |
| --- | --- | --- |
| `node -p 'JSON.stringify({node:process.version,unicode:process.versions.unicode})'` | 2026-10-13T20:49:39.589743+00:00 → 2026-10-13T20:49:39.652049+00:00 | v22.22.3/Unicode16.0、exit0 |
| `pnpm install --frozen-lockfile` | 2026-10-13T20:49:39.652662+00:00 → 2026-10-13T20:49:54.943236+00:00 | exit0 |
| `pnpm exec node -v` | 2026-10-13T20:49:54.944121+00:00 → 2026-10-13T20:49:55.327760+00:00 | v22.22.3、exit0 |
| `pnpm typecheck` | 2026-10-13T20:49:55.328105+00:00 → 2026-10-13T20:50:04.178697+00:00 | exit0 |
| `pnpm lint:fix` | 2026-10-13T20:50:04.180201+00:00 → 2026-10-13T20:50:08.732673+00:00 | exit0 |
| `pnpm format` | 2026-10-13T20:50:08.733006+00:00 → 2026-10-13T20:50:09.636789+00:00 | exit0 |
| `pnpm lint` | 2026-10-13T20:50:09.637117+00:00 → 2026-10-13T20:50:11.237320+00:00 | exit0 |
| `pnpm format:check` | 2026-10-13T20:50:11.237674+00:00 → 2026-10-13T20:50:12.155600+00:00 | exit0 |
| `pnpm build` | 2026-10-13T20:50:12.156390+00:00 → 2026-10-13T20:50:21.415593+00:00 | exit0 |
| `pnpm test` | 2026-10-13T20:50:21.415898+00:00 → 2026-10-13T21:03:08.417404+00:00 | unit2766pass、Node1534pass/2fail、CF未到達、exit1 |

通常fullは上記初回と下記再実行の双方でexit1。4372全passとは報告しない。unitは199files/2766、Nodeは通常＋formats-app/app-c/native/native-d/native-eの全128files/1536casesを実行した。

### D1: 通常fullのfailedgateと診断を分ける

QA-TESTの原文完了条件は「mainで pnpm test が終了コード0となる」。main候補を固定したfresh checkoutで問う。

初回`pnpm test`は2026-10-13T20:50:21.415898Z〜21:03:08.417404Z、exit1。unit199files/2766pass、Node128files/1534pass・2fail、skip0/unhandled0。CFは未到達で、これをCF成功や全4372へ数えない。

- publicDiscoveryBoundary.integration.test.ts:231、合法normalization-expanding query＋50tag＋51matches。期待HTTP200→実503、stderrは`{ kind: 'System', code: 'PUBLIC_SEARCH_BUSY' }`。test表示9187ms。失敗fixtureはR/home/.local/share/hollow/verification/suite-wbUg45。
- driveBackupBulk.integration.test.ts:547、500-child parentのadmitted-transfer cap。元test timeout5000msで失敗、test表示9044ms。失敗fixtureは同suite-yn7dGE。

初回gate/log/fixtureを保全した。public executionはsearchDeadlineの3000ms/close margin100ms、Drive testは元5000msのまま。guard/deadline/timeout/skip/test/codeの変更なし。PUBLIC_SEARCH_BUSYは検索を完了できなかった安全な503で、合法入力を構造不正とした証拠には読み替えない。初回負荷値や単一requestのphase別timingは未取得なので、失敗原因をCPU負荷と断定しない。

browser/runtime/proxy正常閉鎖後、同source/同sanitized環境で以下を実行した。source差分0。failed-suite-state.jsonは初回suiteの観測済6PID不在と現在owned root/socket関連process0を固定し、その後の新実行と分けた。failed-suite-owner-pids.jsonでは保全Drive fixtureのowner41recordsが指すPID48529も不在を実証した。recheck-pre-node-state.jsonでも旧native supervisor/query残留0を確認した。

| 再実行 | 時刻（2026-10-13Z） | 実結果 |
| --- | --- | --- |
| 2files同時、元全cases | 21:05:00.112963 → 21:05:36.490665 | 48pass/skip0/unhandled0、exit0。公開境界5076ms/HTTP200、500-child2177ms |
| public boundary単独file | 21:06:49.105404 → 21:07:02.442639 | 7pass/skip0/unhandled0、exit0。境界5356ms/HTTP200 |
| Drive bulk単独file | 21:07:02.443059 → 21:07:47.269213 | 41pass/skip0/unhandled0、exit0。500-child3244ms |

診断loadavg(1/5/15)は8CPUでpublic単独開始2.05/5.44/5.88、終了2.40/5.35/5.84、Drive終了3.28/5.18/5.75。初回との因果比較には使わない。各値はwhole-test時間でありnative HTTP1requestのdeadline値と混同しない。command/time/exitはtarget-recheck-result.json/recheck-results.jsonl、出力target-recheck.log/recheck-0/1.log。再fullはこの単独成功の後に新suite fixtureで開始し、初回failedgateを消さず結果を別に残した。

通常再fullは21:07:47.269775Z〜21:16:27.692951Z、exit1。unit2766pass、Node1535pass/1fail、skip0/unhandled0、CF未到達。初回公開/Driveの2ケースは再full内で成功（4862ms/HTTP200、2377ms）。新失敗はllmInputStage.integration.test.ts:1428のS3-R monthly30→31st unread拒否ケースで、fixture.finish→guardFilesが`S3_FIXTURE_FILE_CHANGED`をthrowした（885ms）。fixtureはR/home/.local/share/hollow/verification/suite-oqEvJ8として保全。再fullのloadavg開始3.28/5.18/5.75→終了3.11/3.74/4.79で、因果は断定しない。

元guardの反例形は、QA-TESTの「mainで pnpm test が終了コード0となる」に対する上記実exit1×2とfailedgate出力。条件4の規定形であり、残8IDにも必要な共通gateが未達。CSS/docsだけの変更からこの失敗が新規製品回帰と決め付けない。B1/B5の個別修復が観測できたことから、全7条件が0とは認定しない。

llmInputStageFixtures.ts:102–159はlstat→open-handle.statのisFile/dev/ino/sizeが違うとFILE_CHANGEDをthrowする。元guardは差分field/file/hashを保存しない。:760のfinishはterminal/active=falseを待つ前にguardを呼ぶが、このコード順序だけでは失敗時に何が変わったか特定できない。元file単独は21:19:31.888008Z〜21:19:36.607584Z、23pass/skip0/unhandled0/exit0（input-single-result.json/log）。

停止済みfresh R/diagnosticへ観測を追加し、diff・元helperをlogsへ保存、各実行のfinallyで元helperへ復元した。判定/例外/assert/deadline/testtimeoutは一切弱めず、診断greenを現在通常gate成功へ流用しない。

| 診断 | 時刻2026-10-13Z / 実結果 | 差分・限界 |
| --- | --- | --- |
| 失敗時stat/file/hash＋DBoperation/finish active観測、単独10回 | 21:23:17.148802〜21:24:15.291563、各23pass/exit0 | diagnostic-diff.patch。DB Promise観測が順序へ影響し得るため原因解消ではない。復元diff0 |
| 同観測で元full隣接authenticationHTTPとの2-worker pair5回 | 21:25:34.533134〜21:26:00.276504、各29pass/exit0 | 元config/maxWorkers2。field snapshotなし、復元diff0 |
| readonly hash追加採取、WAL/DB/元open前all-file | 21:27:24.942483〜21:31:17.676948、各23pass/exit0 | diagnostic-sampling/db-sampling/before-open-sampling-diff.patch。採取IOで順序が変わり得る診断。failure snapshotなし、各復元diff0 |
| 元FILE_CHANGED分岐に入った後だけstat/file/hash記録する最小Node全体1回 | 21:34:12.405159〜21:43:04.330309、128files/1536pass/skip0/unhandled0、exit0 | diagnostic-minimal-diff.patch。成功経路の元操作を変更しない。分岐へ入らずsnapshotなし。21:43:04.351219復元diff0 |
| 未改変checkoutのCF単独 | 21:43:30.757681〜21:43:39.817990、10files/70pass/skip0/unhandled0、exit0 | `pnpm test:integration:cf`。cf-standalone-result.json/log。通常fullのCF未到達とは別の現在根拠 |

正確なcommand/start/end/exitはinput-single-result、input-diagnostic-results、input-diagnostic-pair-results、input-diagnostic-sampling-result、input-db-sampling-results、input-before-open-sampling-result、minimal-node-diagnostic-result、cf-standalone-resultのJSON/JSONLに保存した。最小Nodeの成功経路は元のままだが、helperの診断差分がある実行を通常`pnpm test` exit0へ読み替えない。追加の無目的full反復は行っていない。

D1の失敗時field/file/主体/時点は未特定。期待hashは元guardで採取されておらず、失敗後の状態から復元しない。保全DBをmode=ro/immutableで読み、前後のino/size/mtime/hash不変をfailed-stage-immutable-read.jsonへ固定。failed-stage-terminal-state.jsonでは全34conversionがterminal、latest3はclosed/source_memory_bytes0だった。この終了後状態を失敗時snapshotや月31st断りassert成功へ読み替えない。元full失敗根拠を保持し、検証者は製品/test/guardを修正していない。

## ID対応・反例・必須未観測

| 固定ID | 原文 | 7条件反例 | 必須未観測 | 現在へ適用する根拠 |
| --- | --- | --- | --- | --- |
| IN-01 | [integration](../../spec/scenario/integration.md) | D1（条件4共通gate。B1自体0） | 0 | B1全文/code対照・旧同一用途/生成・現suite |
| IN-02 | [integration](../../spec/scenario/integration.md) | D1（条件4共通gate。B1自体0） | 0 | B1構成/目的/保存のみ非生成・旧同一正常・現suite |
| IM-01 | [import](../../spec/scenario/import.md) | D1（条件4共通gate。B1自体0） | 0 | B1validation/generation・旧B2red/6file/共有・現suite |
| IM-02 | [import](../../spec/scenario/import.md) | D1（条件4共通gate。B1自体0） | 0 | B1正常/異常案内・旧B2red/子状態・現suite |
| IM-03 | [import](../../spec/scenario/import.md) | D1（条件4共通gate。B1自体0） | 0 | B1quota/protocol・旧B2red/履歴計数・現suite |
| IM-06 | [import](../../spec/scenario/import.md) | D1（条件4共通gate。B1自体0） | 0 | B1source/recovery・旧B2red/regen undo・現suite |
| OR-03 | [organize](../../spec/scenario/organize.md) | D1（条件4）＋B6（条件6）。旧B5位置0 | 0 | B5正準8vh/3幅検索scope/tag/Enter/Escape・B6 radius/影・現suite（D1保持） |
| UX-VISUAL | [requirements](../../spec/requirements.md) | D1（条件4）＋B6（条件6）。旧B5位置0 | 0 | B5位置正常・B6明示tokens/3幅/視覚chip/操作、旧同一機能入口 |
| QA-TEST | [CLAUDE](../../CLAUDE.md) | D1（条件4・full exit1） | 0 | 初回failedgate保持・2file/各単独・最終full再実行、source/guard/timeout不変 |

残8IDの修復対象B1/B5は0だが、7条件を同じ硬さで問うとD1により残8ID＋QA-TESTの9IDは0を返せない。旧10IDへ変更による追加具体回帰0。7条件の必須未観測は0（CFも単独実行で補完）。D1の変化file/field/主体/時点は診断未特定として残し、推測で埋めない。7条件外0。driverの初回root取り違え・read path不存在・tag index文字列/整数・WS「共同」の期待候補数1（実2）への誤ったwaitは修正したdriver試行としてログを残す。後者は検索語を原文由来の期待対象「共同編集」へ限定し、実1候補と遷移を全3幅で観測した。これらを製品の失敗や未観測解消根拠へ数えない。

## 今回自己環境の実正常閉鎖

初回はbrowser a正規close0（21:01:26.552303〜21:01:26.730115Z）後、自己actual runtime46742をcommand/root/listenerで照合して21:01:34.394203Z TERM。同createNodeShutdownのquiesce→listener close→organize/booted.shutdown native-drain→fixtures closeをawait後、caller/harnessが21:01:34.511977Z exit0。proxy46732も21:01:41.803293Z TERM→server.close/closeAllConnections→21:01:41.854511Z caller/harness exit0。21:01:57.382828Zに自己16PID/8ports（51313/51314/51319/51321/51345/51347/55881/55882）全閉・connect_ex61。cleanup-before/after、runtime-term/proxy-term、harness-resultsへ固定した。

通常failedsuiteのexit1を正常suite終了とは記録しない。failed-suite-state/owner-pidsは自己観測済suite PIDとowner41recordsのPID48529不在、関連process0を実測する。診断・単独実行はそれぞれ実caller exit0とrestore diff0を別に記録。全minNode終了後のdiagnostic-stop-stateはcheckout/diagnostic差分0・関連自己process0。

追加styleはbrowser d正規close0後、actual runtime4592へ21:49:54.533368Z TERM→同quiesce/native-drain/caller/harnessが21:49:54.563126Z exit0。proxy4577へ21:49:54.624258Z TERM→close/caller/harnessが21:49:54.639293Z exit0。21:51:26.410026Zに新自己16PID/5ports（54392/54440/54441/55891/55892）全閉・connect_ex61、Rと両TMP関連自己process0、checkout/diagnostic差分0。fixturehelper SHA256は両sourceとも`111b77ab495b2f93673e03a7c6326c39e69527cac5d9c52f786c106ab188ff0d`。style-cleanup-before/after、style-runtime-term/style-proxy-term、style-harness-resultsへ固定した。初回と追加は別環境・別証拠として残す。

PID不在だけやexit1/130/143を正規browser/runtime/proxy閉鎖の根拠にしていない。停止したのは自己環境だけ。他worktree/秘密値/PIDには触れていない。sourceはcandidateへ固定、稼働source再buildなし。保全failed fixtures・診断patch/元helper・全出力はpersistent Rに残す。

製品code/tests/config/docsへ変更なし。レビュー報告だけの精密commit後、全read/write/runを停止する。

## 旧候補9000f81に対する独立報告（現在への適用を上記で限定）

検証者は統合読み1と同じ独立読み手。修復の設計・実装には参加していない。これは対象を絞ったフェーズ式検証で、fresh全体統合読み2回目ではない。成立認定ではなく、7条件への反例と必須未観測を報告する。

- Candidate: `5a06d1ca1593c2db6f74d0651df18b57d06e22de`
- Product: `9000f81dbac5665ccd0d90e2626ee2807397cc6c`
- 比較元: [統合読み1](integration-01.md)、報告commit `73686288f1f987d52a0b0e38f6a63822c449c5bb`、product `ff15c55aa41c5495a7f4fd05082a2bfb1f3b05b9`
- F: `/Users/hikaru/.local/share/hollow/verification/integration01-repair-20261013T194744`
- 期間: 2026-10-13T19:47:44Z〜2026-10-13T20:15:41.973702Z。記録はUTC ISO8601。

対象16ID中、IN-01/02・IM-01/02/03/06にB1の条件4反例が残る。他10IDは7条件反例0・必須未観測0。変更到達先のOR-03/UX-VISUALにB5の条件6反例を追加した。対象18IDに未観測は残さない。7条件外の修復提案はない。

### 入力と環境

正本[requirements](../../spec/requirements.md)、[scenario](../../spec/scenario/index.md)、[design index](../../spec/design/index.md)/[tokens](../../spec/design/tokens.md)、brief/design末尾のB1–4修復方針、planの固定ID・原文・条件・依存・観測方法を照合した。CLAUDE/AGENTSとbackend/frontend実装例、goal-implementの完了条件・manager-loop・review-lensesを適用した。phasesの完了報告とManager/Mainの自己評価を根拠にしていない。旧独立根拠の適用は後述する。

F/checkoutとF/diagnosticはcandidateのfresh clone。DB/objects/鍵/HOMEは新規、TMPDIRは`/Users/hikaru/.local/hwt/ir-044744`。sanitized HOME/PATH/LANG、Nix Node22.22.3/Unicode16.0、同Node pnpm11.1.2、frozen install。工具設定はowner-only directory700/file600、FFmpeg/ffprobe8.0.1とPython3.13.12を明示し、通常bootの検査を通した。PDF工具・fontも専用設定へ渡した。

品質build後に同checkoutの公開account browser harnessを起動。`--ux-local --editing-local --organize-local --sharing-local --integration-local --export-local --jobs-local --retirement-local --audio-local --drive-local`を合成し、正常Node bundle/HTTP/RSC/nativeを使用した。外部providerは明示owned loopback代替。実Google/SMTP/OpenRouter/Driveの認証・送信・操作・課金・公開は実行していない。

Chrome144.0.7559.96はUAでも確認した。専用session a/b、明示空config、全CLIへ同じreject-only proxy55862を付けた。proxyにDNS/外部connect/forwardはない。allowed-domains、CSP/deadline/guardの緩和はない。F/browser.pyはcommand/時刻/exit/DOMをlogs/browser.jsonlへ保存する。

### B1: runtime文書に未提供の旧段階が残る

条件4、IN-01/02・IM-01/02/03/06。完了条件は「変更が触れたdocsの記述は変更後の実装を述べている」。採用designのB1修復方針も、Node手順書をtext/image/PDFと専用STT・本文構造化の実装へ揃える。

`docs/runtime_node.md:130`のFile imports節に **「No AI provider is connected in this phase.」** が残る。このphaseを旧段階として区切る見出しはない。同文書`:332`は「A linked account and normal generation configuration enable supported text, document, static-image and audio conversion and regeneration」と述べる。

現在コードの`server.node.ts`音声工具/LLM composition、`audioWorker.ts`のSTT→structure経路、自身の正常連携→6音声生成→再生成で、configured Nodeが生成を提供することを照合した。自身wireは初回STT7/chat6、再生成込みSTT9/chat7。未提供の文書案内は実装・同文書の現在案内と不一致である。

再現はcandidateで`sed -n '128,132p' docs/runtime_node.md`と`:332`を読み、下記通常連携・生成を実行する。製品機能の仮実装ではなく、変更対象文書の条件4反例として記録する。旧B1のllm_node table/末尾・runtime:332・openrouter_nodeのaudio未提供案内は修復されているが、この残案内をそれらの修復で埋めない。

`runtime_node.md:142`のproduction **validation** がFFmpegを呼ばない説明は、audio generationの工具使用と区別して読む。そのvalidation自体を本反例へ加えない。

### B2: transcript境界の不足を現在テストへ照合

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

### B3・B4とタグ回帰の自身観測

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

### B5: 変更到達先の検索パレットが上端へ密着する

条件6、追加のOR-03/UX-VISUAL。OR-03基本フロー1はControl+K・上部trigger・絞り込みからパレットを開く。正本index:80全文は **「上から8vhの位置に置き、画面中央には置かない（入力欄が視線の高さに来るため）」**。垂直中央を避けて8vhへ置く規定として読む。同種の正準画面`spec/design/pages/P10-notes.html:413–418`も`.palette { ... margin-top:8vh; ... }`を持つ。

今回変更対象の`browse.css:381–398`はpalette幅を620へ修復したが、top/marginの位置指定がない。自身Control+Kで開いた実画面は次のとおりで、3幅とも上端へ密着した。

| viewport | 規定の期待top | 実rect x/y/width | screenshot |
| --- | --- | --- | --- |
| 1280×720 | 57.6px | 0/0/620 | 1280-palette.png |
| 375×812 | 64.96px | 0/0/341 | 375-palette.png |
| 320×760 | 60.8px | 0/0/286 | 320-palette.png |

2026-10-13T20:05:13.761/20:05:14.204/20:05:14.596Z。20:07:07.410Zの320再観測はcomputed position=fixed/top=0px/margin=0px。F/logs/browser.jsonlに原rect・computed、F/screenshotsに画面を保存した。Escapeの通常閉鎖は成功している。

design:215/217/219の現Shell/既dialog・最小修復方針を照合した。8vhを0へ置換する具体採用決定はなく、Managerへの既決定照合でも同前提を確認した。旧位置からの維持なので条件3の新回帰とは区別するが、幅変更が届くpaletteへの条件6反例として残す。index:80から横中央の追加条件は作らない。

### 品質・全テストの自身実行

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

### 主要音声正常と利用者に見える結果

2026-10-13T19:53〜19:57Z、通常owned OpenRouter同意→linked・AI待ち1件→text-v2/image-v2/STT-v2を選択保存。設定保存だけでは生成されない。通常uploadでWAV/MP3/M4A/Ogg/FLAC＋121秒WAVを限定希望で6件受付した。通常履歴に処理終了・完了6/失敗0/取消0、6使用/0予約、モデル名を確認。121秒は実FFmpeg/nativeから1,920,000＋16,000framesの2区間、初回STT7/chat6、保存した用途モデルとSTT deny/zdr・chat deny/no-fallback/require-parametersを確認した。

121秒noteから2model・LOCAL_INSTRUCTION_MARKERを選び、通常本文置換confirmを承認。Whisper/GeminiのSTT2/chat1をwireに確認し、実iframeのGemini本文と7使用/0予約を観測。通常undo confirmで旧text-v2本文、同限定URLを320匿名browserで開いて同旧本文を確認。原本・題名・共有URLを保持。今回再生成込みSTT9/chat7をlogs/runtime provider requestsで照合した。

期待は原文IN-01/02、IM-01/02/03/06と用途privacyの利用者override。根拠は375-link-result.png、320-models-saved.png、320-audio-selection/results/detail/regenerated/undo/anonymous.png、browser/detail logs、runtime/integration-local/requests.jsonl・closures.jsonl。実サービスの品質/費用/保持・STT fallback保証は範囲外である。

### 変更到達先と旧独立根拠の現在適用

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

### ID対応と必須未観測

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

### 自己環境の実正常閉鎖

初回はbrowser a/bの正規close exit0後、自己actual server PID67250のcommand/rootを照合し、20:08:07.955936ZにTERMを送った。account-browser.node.ts:542–570のcreateNodeShutdownはquiesce→listener close→organize close/booted.shutdown native drain→全fixture closeをawaitしてからexit0へ進む。caller/harnessは20:08:07.998714Zに実exit0。proxy67227もserver.close/closeAllConnections→caller/harnessが20:08:35.489660Zに実exit0。

20:08:35.626264Z、21自己PID（a/b daemonのowned socketとChrome子を含む）全閉鎖、8listeners（55861/55862/64433/64434/64435/64438/64476/64602）のconnect_ex61を確認した。F/checkout/F/diagnostic tracked差分0。logs/cleanup-before/after.json、runtime-term/proxy-term.json、harness-results.jsonlに固定した。

追加previewはbrowser cの正規close0後、自己actual server10278へ20:15:07.383602Z TERM→同quiesce/drain/caller/harnessが20:15:07.415208Z exit0。proxy10269も20:15:41.859889Z exit0。20:15:41.973702Zに13自己PIDと8listeners（55871/55872/65404/65405/65406/65407/65415/65416）全閉鎖/connect_ex61を確認。logs/preview-cleanup-before/after.json、preview-runtime-term/preview-proxy-term.json、preview-harness-results.jsonlへ記録した。

PID不在だけやexit1/130/143を正常終了の根拠にしていない。停止したのは自己環境だけ。失敗変異fixtureもFのpersistent HOME下へ保全し、他worktree/秘密値/PIDに触れていない。初回と追加previewの閉鎖根拠は独立に保持した。製品code/tests/config/docsは変更していない。報告のみの精密commitを通知した後、全read/write/runを停止する。
