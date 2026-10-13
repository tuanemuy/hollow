# Hollow 統合の独立検証1

検証対象は候補`3696e0966217fb9f45b6ba0777ffae68147ff05d`、製品コード`ff15c55aa41c5495a7f4fd05082a2bfb1f3b05b9`。全93固定項目（79シナリオ＋14体験・非機能・品質）への独立した読み1回目で、7条件への反例は4件、必須未観測は0件。反例の効く項目は15項目。残る78項目に規定の形を取る反例は特定していない。項目や全体の成立を認定する報告ではない。

独立した全テスト4368件が成功し、skip0・unhandled0。品質ゲートは全exit0。自身の正常ブラウザ操作、既独立根拠の現在適用、反例の再現を下記に分ける。自己browser・runtime・proxyは2026-10-13T18:41:03Zまでに正常終了し、自己19PID残0・10listener閉鎖を確認した。製品・テスト・設定・管理文書を変更していない。

| 反例 | 条件 | 効く固定ID | Managerに返す内容 |
| --- | --- | --- | --- |
| B1 | 4 | IN-01、IN-02、IM-01、IM-02、IM-03、IM-06 | 最終生成機能と運用文書の未提供案内が矛盾する |
| B2 | 2 | IM-01、IM-02、IM-03、IM-06 | 音声本文の64KiB分割境界が変わっても関連34テストが赤くならない |
| B3 | 6 | OR-01、OR-02、OR-11、SH-05、SH-06、SH-07、UX-READING | 一覧3形式と読む画面の幅が正準トークンに一致しない |
| B4 | 1、6 | WS-02、UX-LOCATION | 本文へスクロールすると現在のワークスペース名が画面外へ消える |

## 正本と実行境界

[要件](../../spec/requirements.md)、[全シナリオ](../../spec/scenario/index.md)、[デザイン方針](../../spec/design/index.md)、[正準トークン](../../spec/design/tokens.md)、[brief](../brief.md)、[採用設計](../design.md)、[固定台帳](../plan.md)、[CLAUDE](../../CLAUDE.md)、backend/frontend実装例を照合した。台帳から読むのは固定ID・原文・完了条件・依存・観測方法で、Manager/Implementerの成立評価は根拠に使わない。`phases/*.md`を読んでいない。既独立reviewsは下記の適用照合に限る。子goal、別agent委譲、spec/spec-implementは使用していない。

異常系は利用者overrideどおりrepository integration/e2e、主要正常とUXはブラウザ。実Google/SMTP/OpenRouter/Driveへの認証・送信・操作・課金・外部公開は0。所有loopback providerとローカル契約を実サービス成功へ読み替えない。STTのfallback禁止、実認識品質、瞬間RSS最大値、最大200MiB/2GiB負荷の保証は主張しない。

新persistent rootは`/Users/hikaru/.local/share/hollow/verification/integration01-20261013T1806`（以下F）。候補を新規`F/checkout`へ固定し、`F/diagnostic`を変異専用にした。HOMEは`F/home`、短いpersistent TMPDIRは`/Users/hikaru/.local/hwt/i01-1806`。DB・objects・mailbox・鍵は今回新規。旧DB・objects・秘密env・保全root・他worktreeを再利用していない。

sanitized HOME/PATH/LANG/TMP/TEMP/TMPDIR、Nix Node22.22.3/Unicode16.0、同Nodeのpnpm11.1.2を使用。FFmpeg/ffprobe8.0.1、Python3.13.12をprivate工具configへ明示した。Chrome144.0.7559.96、agent-browser0.38.2、空config、毎CLI同owned拒否proxy55762。外部DNS/connect/forward無し、既知loopbackのみ。allowed-domains、製品CSP/deadline/guardの変更無し。PDF用Chromeと公開Noto CJK fontsを今回のrootへ配置し、公開harnessの通常設定を使用した。build後だけruntimeを起動し、稼働checkoutを再buildしていない。

## B1: 生成機能を未提供とする運用文書

条件4、IN-01/IN-02/IM-01/IM-02/IM-03/IM-06。規定は「変更が触れたdocsの記述は変更後の実装を述べる」「利用と検証の再実行に必要な手順がプロジェクトに残る」。`docs/runtime_node.md`は今回の変更対象に含まれる。

原文IN-01基本フロー5は「以降、画像・音声・テキストのないPDFのアップロードでLLMによる構造化が使える」。採用設計P11は「専用LlmTranscriber.transcribe」「acceptUpload/processJob/admitLlm/request/retryへaudioを縦接続」とし、`design.md:275`は`HOLLOW_AUDIO_TOOLS_FILE`による通常Node配備を定める。

一方、[runtime_node](../../docs/runtime_node.md#L332)は「Connection management does not yet provide LLM generation」と断言する。[llm_node](../../docs/llm_node.md#L21)のSupported inputs表も「Animated/multiple images and audio | Not provided; originals remain available」、同`:97`は「Audio conversion remains unavailable」とする。

最終実装は`server.node.ts:369–374`で通常のaudio工具設定を読み、`adapters/node/llm/config.ts:65–72`でpreparer/transcriberを構成する。`application/llm/audioWorker.ts:154–223`が専用STTと保存、後段構造化へ接続する。自身の18:29–18:35Zの通常UIでは音声6件・静止画像1件・text1件が生成成功し、用途モデル・履歴・本文・原本を表示した。STTとchatは実製品adapterからowned loopbackへ届いた。音声再生成とundoも成功した。

再現は候補で`docs/browser_audio.md`の工具設定と公開harnessを使用し、通常OR同意・用途保存・WAV取り込みを行い、上記3文を読むこと。期待は構成条件を含む実際の提供機能と再実行入口を案内すること。実際は生成済み機能を未提供と案内する。非音声を含むruntimeの断言も誤る。新しい機能や実サービス接続の要求ではない。

## B2: 64KiBちょうどの音声本文分割を固定しないテスト

条件2、IM-01/IM-02/IM-03/IM-06。設計`design.md:265`は「structure既16segment、1transcript64KiB/全transcript1MiB」「予算超過をtruncateで通さず」と定める。`audioWorker.ts:56–68`はescape後のUTF-8 bytesに段落タグ7bytesを加え、`:60`の`bytes + size > AUDIO_LIMITS.transcriptBytes`で次のsegmentへ分ける。

具体値は1chunkのSTT text=`x`×65519。`区間 1\n`、末尾改行、`<p></p>`を含むHTMLが65536bytesちょうどとなる。原コードは1segment/65536bytes。診断sourceで`:60`を`>=`へ変えると2segments/`[65535,8]`へ変わる。

`audioWorker.test.ts:104–121`は過大な全transcriptだけを拒否し、`:123–134`は短い2区間の順序/escapeを主張する。64KiBのHTML分割境界・境界直後の内容保持・分割後のordinal/identityを主張しない。`llmAudio.integration.test.ts`のworker/STT→structure経路も短いtranscriptだけで、この分岐を固定しない。

| 自身の診断 | UTC開始 → 終了 | 実際 |
| --- | --- | --- |
| `pnpm --filter @repo/web exec tsx F/transcript-probe.ts`、原コード | 18:09:43.898885 → 18:09:45.492554 | exit0、segments1、bytes[65536] |
| 同probe、`>`→`>=` | 18:09:45.493121 → 18:09:46.254875 | exit0、segments2、bytes[65535,8] |
| 変異で`pnpm exec vitest run packages/core/src/application/llm/audioWorker.test.ts` | 18:09:02.696623 → 18:09:05.007479 | 6/6pass、exit0 |
| 変異で`pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/llmAudio.integration.test.ts` | 18:09:05.007867 → 18:09:28.864006 | 28/28pass、exit0 |
| 対照: transcriberの`zdr:true`→`false`、同unit suite | 18:09:46.255602 → 18:09:47.255357 | 1fail/14pass、exit1 |

すべて2026-10-13Z。F/logs/mutation-results.jsonlと`split-*-corrected.log`、`split-boundary-mutant-{unit,integration}.log`、`privacy-zdr-red-control.log`に保存した。最初のprobeはrootにtsxが無いというdriver errorだったため、@repo/webの入口へ訂正した。失敗ログも保持し、成功へ数えない。

変異は停止済み診断sourceだけで行い、finallyで復元。候補/診断の`git diff --exit-code`はexit0。全4368passは現在の実装の回帰根拠であり、この不足を解消する根拠ではない。追加テストはImplementerへ返し、Verifierはテストを足していない。

## B3: 正準幅を使わない一覧と読む画面

条件6、OR-01/OR-02/OR-11/SH-05/SH-06/SH-07/UX-READING。

`spec/design/index.md:98–106`は読む画面680px、list/設定780px、tile/calendar1100pxとし、「幅の切替は表示形式に紐づける」。`tokens.md:193–205`は正準の4幅とbar56pxを明示し、「幅は4段階だけ」「wide-maxはカレンダー表示とタイル表示、および処理履歴の親子ジョブ表にのみ」とする。

`hollow.css:98–101`は全アプリ画面を`width:min(880px,100%)`に固定し、`:46–55`はheader76px。公開/限定の`publicationHttp.node.ts:54`・`sharingHttp.node.ts`も別のmax-width960px＋padding24pxを使う。読者別に同じ種類の本文の行長が変わる。

| 自身の解決後観測、1280×720 | 正準の期待 | 実際 | screenshot |
| --- | --- | --- | --- |
| 個人list | list-max780 | main880、header76 | 1280-notes-list |
| 個人tile/calendar | wide-max1100へ切替 | 両方ともmain880 | 1280-notes-tile/calendar |
| 保存した個人note | content-max680 | main880、iframe816、実本文p768 | desktop-note-body、1280-own-note |
| 匿名public note | content-max680 | main1008、iframe962、実本文p912 | 1280-public-note |
| 同じ自作本文の限定/パスワード後 | 同じ読む画面のcontent-max680 | main1008、iframe962、実本文p912 | desktop-limited-body、desktop-protected-body |

18:17–18:29ZのF/logs/browser.jsonl・route-observations.jsonlに実値を保存した。375/320は各画面のpage幅がviewportと一致する。このモバイル正常結果でdesktopの正準不一致を解消したとは扱わない。

既決定`design.md:215/217/219`の現Shell最小修復・375/320の限定修復・追加標準を条件へ足さない方針を照合した。680/780/1100/56を880/960/76へ置換する採用決定は記録されていない。Managerへの照合でも同じ引用を確認した。新しい美観基準ではなく、既正準と同種画面の比較による反例である。

## B4: 読んでいるワークスペースを常時判別できない

条件1・6、UX-LOCATIONとWS-02。requirements/台帳は「現在の個人/ワークスペースを常に判別できる」。WS-02基本フロー1も「現在の文脈名を常時表示している」。`spec/design/index.md:53`はheaderを`position:sticky;top:0`、`:60`はscope tokenを「常時表示」「省略しない」とする。

最終`hollow.css:46–55`のheaderはstickyでなく、`components/hollow/workspace.css:70–73`はmobileでrelativeにする。`Shell.tsx:38–48`のscope selectorと`notes.$noteId.index.tsx:118`のscope説明は通常の上部flowへ置かれる。`:254–263`の読むbarは「現在のワークスペース権限に従って閲覧できます」とだけ表示し、固有名を出さない。

通常signin後、編集fixture WSのnoteを開き、本文へ通常scrollした。期待は本文を読んでいる間も現在のWS名が画面から分かること。実際は名前のある2か所とも画面外になり、本文と操作barだけが残る。URLのUUIDから名前を推測することは画面根拠にしない。

| viewport | UTC観測 | scrollY | header bottom | scope summary bottom | scope説明 bottom | screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 1280×720 | 18:38:19.194 | 596 | -520 | -547.453125 | -348.125 | desktop-workspace-reading-context |
| 375×812 | 18:36:45.221 | 544 | -480 | 画面外 | 画面外 | 375-workspace-reading-context |
| 320×760 | 18:38:19.628 | 544 | -480 | -501.453125 | -332.125 | 320-workspace-reading-context |

全時刻2026-10-13Z。F/logs/browser.jsonlにURL・rect・visible観測、F/screenshotsに画像。375のcomputed positionはrelative。本文を読む普通のscrollであり、CSSやCSPの上書き、特殊なviewport、未解決loaderの観測ではない。

## 自身の品質・全テスト

F/logs/results.jsonlに各command・ISO8601開始/終了・exit、`gate-00.log`〜`gate-09.log`に出力を保持する。

| command | 2026-10-13 UTC開始 → 終了 | 結果 |
| --- | --- | --- |
| Node/Unicode実測 | 18:04:47.652953 → 18:04:47.697108 | v22.22.3、Unicode16.0、exit0 |
| `pnpm install --frozen-lockfile` | 18:04:47.697493 → 18:05:03.157898 | exit0 |
| `pnpm exec node -v` | 18:05:03.159553 → 18:05:03.495689 | v22.22.3、exit0 |
| `pnpm typecheck` | 18:05:03.496125 → 18:05:12.802774 | exit0 |
| `pnpm lint:fix` | 18:05:12.803335 → 18:05:17.791274 | exit0 |
| `pnpm format` | 18:05:17.791623 → 18:05:18.815032 | exit0 |
| `pnpm lint` | 18:05:18.815404 → 18:05:20.452252 | exit0 |
| `pnpm format:check` | 18:05:20.452807 → 18:05:21.480173 | exit0 |
| `pnpm build` | 18:05:21.480537 → 18:05:30.730366 | exit0 |
| `pnpm test` | 18:05:30.730897 → 18:15:45.496803 | 全4368pass、skip0、unhandled0、exit0 |
| `pnpm test:e2e:editing --root F/runtime` | 18:25:54.990119 → 18:26:23.197401 | 下記9群のassertion成功、exit0 |

Unit199files/2764、Node128files/1534（通常＋formats-app/app-c/native/native-d/native-e）、CF10files/70。CFのworkerd WebSocket disconnected診断とVitest unhandledを区別する。全assertion成功とexit0を取得した。

編集e2eは固定Chrome/空config/同拒否proxyを注入する自己CLI wrapperで公開scriptをそのまま実行。offline退避・失敗mode保持、online retry/reload、remount退避復元、leave/discard、visual書式拒否、別actor競合、viewer失権JSON/保存本文不変、同actor2tab通知、端末mode/新規WYS/空visualの9群。ロール変更は通常WS設定から行い、scriptのfinallyで復元・専用browser close。ログはF/logs/editing-e2e.logとF/runtime/editing-e2e-3d5c9392.jsonl。異常browser追加を新しい完了条件にしていない。

## 自身の主要正常とUX

各CLIはF/browser.pyが同session/config/Chrome/proxy引数・ISO8601・exit・DOMをF/logs/browser.jsonlへ保存する。18:38Z以降はreturnedAtも保存。期待は原文と設計から取り、途中loaderやdriverの結果を成立へ数えない。画像はF/screenshots/以下。

| 原文からの期待・効く範囲 | 自身の実際（2026-10-13Z） | 主な画像/出力 |
| --- | --- | --- |
| AC-04、ED-01/07/08、OR-07、NFR-HTML: signin→新規WYS自動保存→本文/タグ | 18:17–18:18、通常passwordとEnterでsignin、新規のタイトルと本文「統合本文 東京駅 Cloudflare 2026」を入力、自動保存→完了→同note iframe本文。統合タグを通常作成・付与 | desktop-notes、desktop-note-body、1280/375/320-own-note/editor、編集e2e |
| SH-01/02/03/05/06/08: 限定・明示確認・匿名本文・password gate | 18:18–18:21、通常共有panel→限定confirm→実URL→別匿名browserで同本文。password追加confirm→同URLのgate→正しいpassword後の同本文。375/320 page幅一致 | desktop-limited/protected-body、375/320-protected-body |
| EX-01、JB-01: 3形式、PDF進捗/完了と取得 | 18:21–18:25、HTML727bytes/MD450bytes/PDF23801bytesをbrowserから実取得。PDF受付→完了通知→本人履歴/24h期限。HTML/MDに原題と本文。PDFは1頁、抽出した字形・空白をNFKC/空白除去すると入力本文と一致 | desktop-pdf-progress、F/tools/export.*、logs/pdf-content-final.log（parser task終了/exit0） |
| OR-01/02/11、DS-01/02/04/05、WS-02/07/08/09、UX全種: 正しい画面・状態・範囲・主要入口 | 正常URLで20認証route＋5匿名routeをdesktop/375/320で解決後に測定。一覧3layout、詳細/編集、個人/WS tags/trash/upload/settings、履歴、profile/login/連携/usage、discover/profile/publicWS/emptyWS/publicnote。page scrollWidth/bodyWidthは各viewportと一致。5変換状態・3公開範囲・readonly/permission・日本語入口/空状態を確認 | `<width>-<route>.png`、logs/route-observations.jsonl。B3/B4を除く範囲 |
| IN-01/02、IM-01/02/03: 連携/用途反映/全形式/成否/公開保留 | 18:29–18:31、通常owned OR同意→待機1件→text-v2/image-v2/STT-v2保存。WAV/MP3/M4A/Ogg/FLAC＋121秒WAV＋PNG＋textを限定希望で8件受付。8完了/失敗0/取消0、8使用/予約0、本人履歴。原本と音声本文を実noteで確認 | desktop/375/320-audio-eight-selection/results、320-audio-models/iframe-body |
| IM-01/02、IN-02: 全区間と論理1回、用途privacy | 実FFmpeg/nativeから7STT＋6音声chat、image1/text1。121秒は1,920,000＋16,000frames。モデルは保存したSTT/text/image-v2。STT deny/zdr=true、chat deny/allow_fallbacks=false/require_parameters=true | runtime/integration-local/requests.jsonl、closures.jsonl |
| IM-06、NFR-ASYNC: 2モデル/指示→再生成、close/revisit、undo/原本/共有維持 | 18:34–18:36、121秒noteからWhisper/Gemini/LOCAL_INSTRUCTION_MARKERと本文置換confirm→音声準備中・8使用/1予約→正規browser close。通常再signin/同noteでGemini本文と9使用/0予約。375でundo confirm→旧text-v2本文、使用9維持。320匿名の限定URLも同旧本文 | 320-audio-regenerate-models/before-close、desktop-audio-after-revisit、375-audio-undo-body、320-audio-limited-body |
| UX-LOCATION、WS-02: WS現在名を読む間も識別 | 編集fixture WSの正本URL/上部scopeと編集権限は正常。一方、本文scroll後の名前消失はB4 | desktop/375/320-workspace-reading-context |

route観測の初回listはprefs/RSC準備中のheadingだったため、準備headingを除外して解決後に再取得した。最初の`/upload`・`/notes/upload`は誤ったdriver URLで、正式`/notes/import`へ訂正して両scope×3幅を観測した。これらの404/error画像を正常uploadや製品反例へ数えない。stale ref、custom確認をnative dialogと誤認した試行、iframe準備前のeval、CLI auto-scrollで読むbarに覆われたclickはログへ残し、通常scroll後の実操作で確認した。到達不能とは扱わない。PDF parserの初回package解決/終了APIのdriver失敗も、訂正後task destroy/exit0と分けた。

## 既独立根拠の現在適用と変更到達先

候補と製品ff15c55の間は管理/独立報告だけで、製品・test・config差分は0。P13製品`ada077e`からの変更は音声domain/ports/preparer/transcriber/worker・用途UI・native一括予約・Drive streaming、0047移行とそのテストに集中する。削除/改名export・route・query key・env/APIは無い。全既suiteを今回再実行した。

| 根拠群 | 旧独立引用・対象code | 現在へ適用する理由と届く先 |
| --- | --- | --- |
| E01 認証 | [P01修復](P01.md)の「対象browser」「受入と未検証」「AC-04/08」、Unicode12/128・同browser確認・旧session失効 | P11でaccount authentication/session/password/mail/Google callback契約の変更無し。P10 native credential終了は[P10](P10.md)の独立実測へ照合。current認可・serializationは現全suite、通常signinと編集e2eでも使用 |
| E02 編集 | [P02-first](P02-first.md) ED-09/11、[P02-rest](P02-rest.md)「原文の異常条件との対応」/ED-01〜08/10、code1c8c48d | saveNote/VO200codepoint/3mode/20版/media/移動/trash/purge規則は不変。P11が触るのはdetail conversion表示にoriginal.formatを渡す部分で、編集body採用やsave/cacheを変えない。現unit/DBと自身9群e2e・新規保存で補完 |
| E03 WS | [P03](P03.md)「原文異常系との対応」/WS各節、code0e13e93 | member/role/invitation/settings/public-discoveryのportは不変。P10削除trigger/current fenceは[P10](P10.md)のnative/rollbackと現suiteへ照合。WS文脈・role・全原文異常を既assertに対応。scopeの常時可視だけは旧上部観測を拡張せずB4 |
| E04 整理 | [P04](P04.md) OR-01〜12、「原文異常系のリポジトリ対応」、codeb64a3bb | browse/tags/keyset/検索・filters/zone/sort/move/batchの規則と公開API不変。P13 mobile CSSは既独立[P13](P13.md)と現再観測へ対応。source200MiBはaudio原本だけ、既50MiBバッファ/搬送を維持。B3の正準幅を旧passで埋めない |
| E05 共有/公開 | [P05](P05.md)「原文異常の自動根拠」/各正常、code4e0362fe、[baseline-content](baseline-content.md) SH-04/06・応答比較 | sharing/publication型・token/grant/current公開HTTP・canonical/SEO/privacy fence不変。P06の恒久参照は次行、P09初回intent/P10退会取消は下記。現HTTP/DB suite・自身限定/password/匿名本文へ照合。header/rootの日本語・wrapを現routeで補完。B3の読む幅は旧passの適用外 |
| E06 非音声連携/取り込み | [P06](P06.md) IN-01/02の非音声、IN-03/08/AC-10/IM-04、[P06-readers](P06-readers.md)全reader恒久一覧、codee2141c3 | OR callback/state/epoch/reconnect/disconnect、用途catalog、quota、scope/refsの既規則を保持。P11のSTT profile追加・音声200MiB・用途UIを旧非音声へ拡張せず、現provider/transcriber/audio integrationと自身モデルwire/全形式で補う。audio未提供の古いdocsはB1 |
| E07 Drive | [P07](P07.md) IN-04〜07/09、「原文正常ブラウザ」、code49d6a56 | folder確認/retarget/refresh/token/reconnect/backup/記録者epoch/現在の権限/原本不変の契約を保持。新readIntoと旧read双方へ届くsink閉鎖は旧buffer根拠を流用せず、[P11修復](P11.md) B1の4モード/閉鎖実証と今回driveSourceClosure4件・sourceProvider/current/Drive全suiteに対応 |
| E08 書き出し | [P08](P08.md) EX-01〜04、「原文異常対応」、code0482b27 | PDF/ZIP planner/worker/ChildPin/匿名ticket/cache/delivery/保持期限の製品差分無し。新source/typeは本文成功後の通常HTMLになり、同採用/認可へ接続。全native5groups/HTTP/DBと自身3形式の実生成・取得/本文で補完 |
| E09 ジョブ/初回公開 | [P09](P09.md)修正1正常・異常、code66cbd96、JB各節 | initial requestedVisibilityのstamp・手動共有優先・同親failed-only retry・全体timeline・90日・閉じた後の継続を保持。音声stage/モデル投影・回復/currentを現llmAudio28件・read/ImportJobs testsと自身8件/2段/revisit/undoへ対応 |
| E10 退会/async | [P10](P10.md)「原文・規約のコード照合」/AC-09/JB-03/NFR-ASYNC、code0c8ec7e | credential/sole-owner/退会・literal debt/current cancel/回収/Drive ACK/recoveryの製品差分無し。audioが既LlmExecution/current/owner/stageへ入る到達先は現llmAudio worker異常・runtimeOwnership一括予約と既accountDeletion/native suiteで検査。旧同DB再起動を新実行とは述べない |
| E11 音声 | [P11](P11.md)「修復1の独立再検証」「原文全条件・影響先・7条件の照合」、同製品ff15c55 | code完全同一。旧自身5codec/WS別editor/auto-backup/owner Driveからeditor生成/noAI初回/failed retry/cancel/回復を現在へ引用と理由付きで適用。現全4368と新自身8file/モデルwire/再生成/undo/匿名/viewportで補完。旧4red変異はその引用範囲だけで、新B2の未固定分岐へ拡張しない |
| E13 UX | [P13](P13.md)「主要正常」「原文異常系」「UX各節」、codeada077e | 白無彩色・日本語root/wrap/select/fieldsetの製品差分をP11へ照合。追加モデル/方式/状態は現UIと自身audio/3幅で補う。旧の機能視覚入口/keyboardは現在の同callerと現編集e2eへ対応。旧scope/幅の成立記述でB3/B4を閉じない |
| EQ 品質 | [P00](P00.md)のtest分類/Node固定と[baseline-quality](baseline-quality.md)は比較だけ | 品質の成立根拠を今回のfrozen install、規定順ゲート、4368全実行、実browser runtime起動に置き換えた。旧件数・旧Node結果を新結果へ加算しない |

## 条件4・5の構造比較

新設物は既存の集約先と比較した。audioRecipe/Plan/Chunk/Transcriptは既LlmSourceContract/dispatch/model用途へ判別型として延長し、chat/STTの混用をruntime任意プロパティだけへ委ねない。audioPorts/workerは既inputStage/current/UoW/dispatch/quota/final commitへ接続し、別のconversion/課金/権限台帳を作らない。FFmpeg preparer/tools/samplerは既native birthsとreserveManyを拡張し、image/PDFのcount1とaudioのcount2を同所有で閉じる。transcriberとgeneratorは既HTTP送信/closeをownedHttpへ集約し、用途wire/responseは別にした。Drive streamは既exchangeへpendingWriteの終了待ちを加え、非音声readは同streamへbuffer sinkを付ける。UIは既LlmNoteAction/用途設定/ImportJobs/NoteConversionStatusを拡張し、別mutation controllerを作らない。

想定する次変更はSTT既定モデル/対応codecの追加。モデルは既用途catalog/adopted-defaultへ、codecはaudio工具/preparerの境界と版付きrecipeへ届く。quota/current/publication/共有・退会へ規則を散らす必要がない。工具policyとTypeScript値の同期はimmutable decoderPolicyで設計に拘束する。これらの規定形を取る条件5反例は特定していない。CLAUDEの内向き依存、transport→VO、UoW/ports、React19のpending/ticket/invalidate、driver翻訳・workerの行単位catchをコード/既patternと照合した。規約/設計の成立認定ではなく、B1以外の条件4反例を特定していないという範囲である。

## 全93項目の対応

各行の原文と完了条件/依存は[固定台帳](../plan.md)の同ID。正常系末尾だけに縮めず、原文の境界・空/null・重複・順序・再実行・認可・異常を上記E群のassertion対応と今回全suiteへ照合する。「未観測0」は旧独立観測の現在適用と自身補完を合わせた必須範囲で、全操作を今回重複実行した意味ではない。

| 固定ID | 原文 | 反例 | 必須未観測 | 現在へ照合した根拠 |
| --- | --- | --- | --- | --- |
| AC-01 | [account.md](../../spec/scenario/account.md) | 0 | 0 | E01 |
| AC-02 | [account.md](../../spec/scenario/account.md) | 0 | 0 | E01 |
| AC-03 | [account.md](../../spec/scenario/account.md) | 0 | 0 | E01 |
| AC-04 | [account.md](../../spec/scenario/account.md) | 0 | 0 | E01 |
| AC-05 | [account.md](../../spec/scenario/account.md) | 0 | 0 | E01 |
| AC-06 | [account.md](../../spec/scenario/account.md) | 0 | 0 | E01 |
| AC-07 | [account.md](../../spec/scenario/account.md) | 0 | 0 | E05 |
| AC-08 | [account.md](../../spec/scenario/account.md) | 0 | 0 | E01 |
| AC-09 | [account.md](../../spec/scenario/account.md) | 0 | 0 | E10 |
| AC-10 | [account.md](../../spec/scenario/account.md) | 0 | 0 | E06 |
| IN-01 | [integration.md](../../spec/scenario/integration.md) | B1 | 0 | E06＋E11 |
| IN-02 | [integration.md](../../spec/scenario/integration.md) | B1 | 0 | E06＋E11 |
| IN-03 | [integration.md](../../spec/scenario/integration.md) | 0 | 0 | E06 |
| IN-04 | [integration.md](../../spec/scenario/integration.md) | 0 | 0 | E07＋E11 |
| IN-05 | [integration.md](../../spec/scenario/integration.md) | 0 | 0 | E07＋E11 |
| IN-06 | [integration.md](../../spec/scenario/integration.md) | 0 | 0 | E07＋E11 |
| IN-07 | [integration.md](../../spec/scenario/integration.md) | 0 | 0 | E07＋E11 |
| IN-08 | [integration.md](../../spec/scenario/integration.md) | 0 | 0 | E06 |
| IN-09 | [integration.md](../../spec/scenario/integration.md) | 0 | 0 | E07＋E11 |
| IM-01 | [import.md](../../spec/scenario/import.md) | B1、B2 | 0 | E09＋E11 |
| IM-02 | [import.md](../../spec/scenario/import.md) | B1、B2 | 0 | E09＋E11 |
| IM-03 | [import.md](../../spec/scenario/import.md) | B1、B2 | 0 | E09＋E11 |
| IM-04 | [import.md](../../spec/scenario/import.md) | 0 | 0 | E06 |
| IM-05 | [import.md](../../spec/scenario/import.md) | 0 | 0 | E06 |
| IM-06 | [import.md](../../spec/scenario/import.md) | B1、B2 | 0 | E09＋E11 |
| ED-01 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| ED-02 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| ED-03 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| ED-04 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| ED-05 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| ED-06 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| ED-07 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| ED-08 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| ED-09 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| ED-10 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| ED-11 | [editing.md](../../spec/scenario/editing.md) | 0 | 0 | E02 |
| OR-01 | [organize.md](../../spec/scenario/organize.md) | B3 | 0 | E04 |
| OR-02 | [organize.md](../../spec/scenario/organize.md) | B3 | 0 | E04 |
| OR-03 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | E04 |
| OR-04 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | E04 |
| OR-05 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | E04 |
| OR-06 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | E04 |
| OR-07 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | E04 |
| OR-08 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | E04 |
| OR-09 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | E04 |
| OR-10 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | E04 |
| OR-11 | [organize.md](../../spec/scenario/organize.md) | B3 | 0 | E04 |
| OR-12 | [organize.md](../../spec/scenario/organize.md) | 0 | 0 | E04 |
| SH-01 | [sharing.md](../../spec/scenario/sharing.md) | 0 | 0 | E05 |
| SH-02 | [sharing.md](../../spec/scenario/sharing.md) | 0 | 0 | E05 |
| SH-03 | [sharing.md](../../spec/scenario/sharing.md) | 0 | 0 | E05 |
| SH-04 | [sharing.md](../../spec/scenario/sharing.md) | 0 | 0 | E05＋E06 |
| SH-05 | [sharing.md](../../spec/scenario/sharing.md) | B3 | 0 | E05 |
| SH-06 | [sharing.md](../../spec/scenario/sharing.md) | B3 | 0 | E05＋E06 |
| SH-07 | [sharing.md](../../spec/scenario/sharing.md) | B3 | 0 | E05 |
| SH-08 | [sharing.md](../../spec/scenario/sharing.md) | 0 | 0 | E05 |
| WS-01 | [workspace.md](../../spec/scenario/workspace.md) | 0 | 0 | E03 |
| WS-02 | [workspace.md](../../spec/scenario/workspace.md) | B4 | 0 | E03 |
| WS-03 | [workspace.md](../../spec/scenario/workspace.md) | 0 | 0 | E03 |
| WS-04 | [workspace.md](../../spec/scenario/workspace.md) | 0 | 0 | E03 |
| WS-05 | [workspace.md](../../spec/scenario/workspace.md) | 0 | 0 | E03 |
| WS-06 | [workspace.md](../../spec/scenario/workspace.md) | 0 | 0 | E03 |
| WS-07 | [workspace.md](../../spec/scenario/workspace.md) | 0 | 0 | E03 |
| WS-08 | [workspace.md](../../spec/scenario/workspace.md) | 0 | 0 | E03 |
| WS-09 | [workspace.md](../../spec/scenario/workspace.md) | 0 | 0 | E03 |
| WS-10 | [workspace.md](../../spec/scenario/workspace.md) | 0 | 0 | E03 |
| DS-01 | [discovery.md](../../spec/scenario/discovery.md) | 0 | 0 | E05 |
| DS-02 | [discovery.md](../../spec/scenario/discovery.md) | 0 | 0 | E05 |
| DS-03 | [discovery.md](../../spec/scenario/discovery.md) | 0 | 0 | E05 |
| DS-04 | [discovery.md](../../spec/scenario/discovery.md) | 0 | 0 | E05 |
| DS-05 | [discovery.md](../../spec/scenario/discovery.md) | 0 | 0 | E05 |
| DS-06 | [discovery.md](../../spec/scenario/discovery.md) | 0 | 0 | E05＋E10 |
| EX-01 | [export.md](../../spec/scenario/export.md) | 0 | 0 | E08 |
| EX-02 | [export.md](../../spec/scenario/export.md) | 0 | 0 | E08 |
| EX-03 | [export.md](../../spec/scenario/export.md) | 0 | 0 | E08 |
| EX-04 | [export.md](../../spec/scenario/export.md) | 0 | 0 | E08 |
| JB-01 | [jobs.md](../../spec/scenario/jobs.md) | 0 | 0 | E09 |
| JB-02 | [jobs.md](../../spec/scenario/jobs.md) | 0 | 0 | E09 |
| JB-03 | [jobs.md](../../spec/scenario/jobs.md) | 0 | 0 | E09＋E10 |
| UX-LOCATION | [requirements.md](../../spec/requirements.md) | B4 | 0 | E13＋自身3幅 |
| UX-STATE | [requirements.md](../../spec/requirements.md) | 0 | 0 | E13＋自身3幅 |
| UX-KEYBOARD | [requirements.md](../../spec/requirements.md) | 0 | 0 | E13＋自身3幅 |
| UX-VISUAL | [requirements.md](../../spec/requirements.md) | 0 | 0 | E13＋自身3幅 |
| UX-READING | [requirements.md](../../spec/requirements.md) | B3 | 0 | E13＋自身3幅 |
| UX-MOBILE | [requirements.md](../../spec/requirements.md) | 0 | 0 | E13＋自身3幅 |
| NFR-PRIVACY | [requirements.md](../../spec/requirements.md) | 0 | 0 | E05＋現HTTP/DB |
| NFR-HTML | [requirements.md](../../spec/requirements.md) | 0 | 0 | E02/E05＋自身iframe |
| NFR-ASYNC | [requirements.md](../../spec/requirements.md) | 0 | 0 | E09/E10/E11＋自身revisit |
| NFR-JAPANESE | [requirements.md](../../spec/requirements.md) | 0 | 0 | E13＋自身全route |
| QA-BUILD | [CLAUDE.md](../../CLAUDE.md) | 0 | 0 | EQ＋自身gate/runtime |
| QA-TYPECHECK | [CLAUDE.md](../../CLAUDE.md) | 0 | 0 | EQ＋自身gate/runtime |
| QA-LINT | [CLAUDE.md](../../CLAUDE.md) | 0 | 0 | EQ＋自身gate/runtime |
| QA-TEST | [CLAUDE.md](../../CLAUDE.md) | 0 | 0 | EQ＋自身gate/runtime |

## 必須未観測と7条件外

必須未観測は0。B2は単に未実行の項目ではなく、既テストの検出力不足という反例として残す。実外部サービス接続・配送到達・実provider認識品質/費用/fallback・検索エンジン登録/回収・clipboard直接read・最大負荷/瞬間RSS保証は、この依頼の契約段階の外。old passを未観測の穴埋めに使わず、変更された音声/sink/native/用途UIは現在のassertion/観測へ対応させた。

形を取らない磨きの指摘は返していない。driverのstale ref/待機/誤URL/初期RSC/スクロール位置、PDF文字抽出のfont glyph/ligatureと可視本文の違いを、要件外の新しい品質条件にしない。

## 正常終了・停止

2026-10-13T18:40:45Z、自己browser a/bを正規closeし両CLI exit0。自己actual server PID86032のcommand/専用rootを照合して18:40:45.398392ZにTERMを送った。`account-browser.node.ts:534–576`のquiesce→listener close→booted.shutdown/native drain→所有fixture closeをawaitする入口が18:40:45.455205Zにexit0、tool callerも`runtime exit 0`で終わった。

自己proxy PID77835もcommandを照合して18:41:03.105214ZにTERM。`server.close/closeAllConnections`の「UX rejecting proxy closed」、18:41:03.127689Zにexit0、callerも`proxy exit 0`を回収した。取消要求・PID消失だけ・exit1/130/143を正常終了根拠にしない。

18:41:03.200035Zに事前取得した自己19PID（全wrapper/tsx/esbuild/browser/Chrome子を含む）が残0。自己listener55761/55762/60098/60099/60100/60101/60250/60251/60589/60591の全connect_ex=61。候補/診断のtracked差分0。終了後のPDF artifact読取helperもtask.destroyをawaitしexit0。根拠はF/logs/cleanup-before.json、runtime/proxy-signal.json、harness-results.jsonl、cleanup-after.json、pdf-content-final-result.json。

新source/DB/objects/合成鍵/mailbox/工具config/公開fonts/取得物/診断失敗ログ/画像はFに保持する。mainは報告だけを精密commitし、既存resume.mdを触らない。報告commitと停止通知後は全read/write/runを停止し、稼働環境を引き継がない。
