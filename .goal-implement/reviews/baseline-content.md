# main baseline: content Verifier A

対象commit: `ac0894acb78be85f8b10c3c7450fbb00a8c40561`。更新/最終観測: 2026-10-08T02:04:55.957986+09:00。

50項目: 動く/合格4、部分的46（既知不合格2:SH-08/UX-STATE、それ以外は必須条件の検証不足）。動かない0、未観測0。browser主操作は各シナリオで確認し、未確認の異常系を完了に数えていない。

Manager判断: SH-04/NFR-PRIVACYを追加pass候補、SH-06/NFR-HTMLは既受入。SH-08の閲覧範囲誤説明はUX-STATEにも影響。

## 環境と実行範囲

fresh main archive checkout、Node22.22.3 Unicode16.0、private DB/objects/mailbox/鍵は新規、Google/OpenRouter/Drive設定なし、localhost4312。PDF設定なしは配備未検証として区別。ZIPは文書どおりの新規local設定。`uname -sm`の今回出力はDarwin arm64（Managerが環境適用範囲を照合する）。Node24.15.0の初回環境は保持。Node24ではlibsql Workerがexit134/native bad file descriptorを起こし一覧失敗、Node22で一覧成功。この初回失敗を製品不動とは判定しない。ブラウザallowlist付き初回はWYSIWYG Worker準備timeout。自己session終了後allowlist無しのfresh自己sessionで解消、製品不動としない。

## 今回のコマンド結果

実行範囲:2026-10-08T01:38:00+09:00〜2026-10-08T02:04:55.957986+09:00。各logのStart atはこの期間のJST。コード変更/追加テストなし、archive根拠流用なし。build生成物、SVG入力、スクリプト操作記録、取得ZIP/HTMLは `~/.local/state/hollow/baseline-content-node22-20261008/`、Node24比較環境は `baseline-content-20261008/`。

`pnpm install --offline --frozen-lockfile --ignore-scripts`、`pnpm build:node`、fresh `DATABASE_URL=file:<root>/app.db pnpm db:migrate:node`:いずれもexit0。build/ migrateログは各root/logs。Node22binは`/nix/store/k1yy2d1h7pvpac7m14vmaw23j529fpza-nodejs-22.22.3/bin`をPATH先頭。実サービス連携変数なし。

### Content integration

Node22.22.3で次をfresh checkout rootから実行、exit1。10files120tests中79passed41failed。成功はsharing19,sharingHttp9,publication8,publicationHttp6,exportFlow30,export7。失敗41はbrowse14/tags14/publicDiscoveryBoundary7/publicDiscoveryHttp6のaccounts fixtureがtable6列/values5。ログ: `<root>/logs/content-integration-node22-unicode16.log`。

```sh
PATH=/nix/store/k1yy2d1h7pvpac7m14vmaw23j529fpza-nodejs-22.22.3/bin:$PATH pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/browse.integration.test.ts packages/core/src/adapters/libsql/__tests__/tags.integration.test.ts packages/core/src/adapters/libsql/__tests__/publication.integration.test.ts packages/core/src/adapters/libsql/__tests__/sharing.integration.test.ts apps/web/app/worker/node/__tests__/sharingHttp.integration.test.ts apps/web/app/worker/node/__tests__/publicationHttp.integration.test.ts apps/web/app/worker/node/__tests__/publicDiscoveryHttp.integration.test.ts apps/web/app/worker/node/__tests__/publicDiscoveryBoundary.integration.test.ts apps/web/app/worker/node/__tests__/exportFlow.integration.test.ts packages/core/src/adapters/libsql/__tests__/export.integration.test.ts --maxWorkers=1 --no-file-parallelism
```

### ZIP integration

2026-10-08T01:55:59+09:00、21.58s、exit0、5files33tests全成功。log:`<root>/logs/zip-integration.log`。

```sh
PATH=/nix/store/k1yy2d1h7pvpac7m14vmaw23j529fpza-nodejs-22.22.3/bin:$PATH pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipFlow.integration.test.ts packages/core/src/adapters/libsql/__tests__/zipLifecycle.integration.test.ts packages/core/src/adapters/libsql/__tests__/zipAdmission.integration.test.ts packages/core/src/adapters/libsql/__tests__/zipDelivery.integration.test.ts packages/core/src/adapters/libsql/__tests__/zipBatchConfirmation.integration.test.ts --maxWorkers=1 --no-file-parallelism
```

### Unit

Node24 main fresh checkout、2026-10-08T01:39:14+09:00、6.52s、exit0、37files452tests成功。log:`~/.local/state/hollow/baseline-content-20261008/logs/content-unit.log`。実行対象を省略しない。

```sh
pnpm exec vitest run apps/web/app/components/hollow/editorSave.test.ts apps/web/app/components/hollow/editorMode.test.ts apps/web/app/components/hollow/WysEditor.test.ts apps/web/app/components/hollow/wysDiscard.test.ts apps/web/app/components/hollow/wysRecovery.test.ts apps/web/app/components/hollow/editorMedia.test.ts apps/web/app/components/hollow/BrowserHtmlEditor.test.ts apps/web/app/components/hollow/htmlEditor.worker.test.ts apps/web/app/components/hollow/editorModeRequest.test.ts apps/web/app/components/hollow/TrashActions.test.tsx apps/web/app/components/tag/model.test.ts apps/web/app/components/browse apps/web/app/components/batch apps/web/app/components/move apps/web/app/components/sharing apps/web/app/components/publication apps/web/app/presentation/publicDiscoveryHtml.test.ts apps/web/app/presentation/mediaHttp.node.test.ts apps/web/app/adapters/wys packages/core/src/domain/note packages/core/src/domain/tag packages/core/src/adapters/node/browse --maxWorkers=1 --no-file-parallelism
```

### Browserと応答比較

browser:`agent-browser --session hollow-baseline-content-node22-20261008`。個別表にはclick/fill/focus+Enter/upload/download/open/evalでの主操作と観測を記録。各操作は上記commitの本番build/fresh DBが対象。自身が登録したローカルaccount・mailboxだけ使用。外部サービス接続なし。

非公開化後、`urllib.request.urlopen`でlocalhostのprivate pと不存在p、旧s/private s/不存在sを各取得、HTTPErrorもresponseとしてstatus/bodyを比較したcommand出力: `private_p_status=404, unknown_p_status=404, public_bodies_identical=true, old_s_status=404, private_s_status=404, unknown_s_status=404, shared_bodies_identical=true, title_body_leaked=false`。同じbrowserで匿名private pは「このページは利用できません」。再発行旧sは「このリンクは利用できません」。両種類内では不存在/非公開/旧リンクを区別しない。publicのままtrashのp410はDS06明示例外であり、private化後404と区別して記録。

`curl -sS http://127.0.0.1:4312/sitemap.xml`で公開時note/profilebucket、非公開化後profile/WSのみ。`curl -sS -w "status=%{http_code}" http://127.0.0.1:4312/sitemap/profiles/0.xml`は200/XML。notebucketが消えた後の旧note sitemapページは404。

browser downloadのZIPは`Python zipfile.ZipFile`でnames=`基準ノート Cloudflare.html,hollow-export-report.txt`、HTMLに日本語本文がある結果true。shared HTMLもdownload成功し、title/本文/style/CSP含む単一HTMLをhead commandで観測。

## 検証環境の停止

停止確認: 2026-10-08T02:07:09.709151+09:00。`agent-browser --session hollow-baseline-content-node22-20261008 close` はexit0、出力 `Browser closed`。自己4312 serverの起動PTY13403へCtrl+Cを送り、exit0で完了。初回Node24 server/browserも既に停止済み。fresh DB/storage/mailbox/鍵/build/logは両専用rootに保持し、削除していない。

## 項目別の最終判定

| ID | 動作/合否 | 今回の根拠 | 未充足・未検証条件 |
| --- | --- | --- | --- |
| ED-01 | partial / unverified | Node22 4312登録確認後、一覧＋新規作成→WYSIWYGタイトル/本文入力→保存→完了→詳細で本文と非公開状態を観測。 | 通信退避、空下書き非作成、複数tab通知の異常系が未検証。 |
| ED-02 | partial / unverified | Node22 HTMLでclass=keep/data-marker=original/style=color:red付きh1保存→visual→文字一覧「1:見出し」→選択表示テキスト変更→保存。iframe内h1のclass/data/styleが同一で文字だけ変更。media挿入操作がvisual中消える。 | 構造変更拒否、空ノード、script/style非対象、他者競合のbrowser未検証。直接heading中央clickは一意境界選択不可の案内、一覧経由成功。 |
| ED-03 | partial / unverified | Node24の同main新rootでHTML modeに切替、script要素を入力→保存→script除去一覧/安全previewを観測、class/data/style保持をソースで確認。 | 800KB拒否、外部CSS参照取り込み、壊れた構文警告の全異常系未検証。 |
| ED-04 | partial / unverified | Node22新規WYSIWYG本文入力/保存成功、表・画像・コード・リンクのtoolbarを観測。unit WysEditor/adapters/wys成功。 | HTML由来警告、警告再表示、版復元、重い表の案内のbrowser観測未検証。 |
| ED-05 | partial / unverified | 同main Node24で未保存タイトル変更→HTML切替→保存して切替確認→HTML表示→ビジュアル切替（media追加UIが消える）を観測。 | 利用者端末既定の再訪/別ブラウザ、新規WYSIWYG固定/空visual拒否まで未検証。 |
| ED-06 | partial / unverified | Node22 HTML editorへ新規safe.svg（script含む）upload→asset参照img挿入/保存→「SVGの実行・未対応要素」除去一覧。画像validator/mediaHttp unit成功。 | 全対応形式/20MB200MB/離脱/失敗placeholder/一定期間回収のbrowser全異常系未検証。 |
| ED-07 | partial / unverified | Node22新規タイトル 基準ノート Cloudflare→詳細見出し保存後表示。 | 空タイトル/200文字/重複/一覧共有反映の全条件未検証。 |
| ED-08 | partial / unverified | Node22自動保存/明示保存済み/版の履歴（20版表示）導線を観測。Node24保留入力をブラウザ退避→復元提案も観測。 | 通信再試行/権限喪失ダウンロード/競合解決/20版復元を未検証。 |
| ED-09 | partial / unverified | Node22publicノートdetail削除→確認→ゴミ箱→Undo導線表示、公開p取得410、trash復元後読める。 | 公開link失効について固有警告を確認できず（確認文は通常一覧/本文/原本/mediaの一般説明のみ）。processingjob取消/他者権限非表示未検証。 |
| ED-10 | partial / unverified | Node22現在WSゴミ箱→削除note/30日説明/復元→空状態/復元note導線を観測。完全削除/空にする/履歴進捗UIあり。 | 完全削除の実操作、媒体/版回収、期限自動削除、WS削除、50超非同期、viewer拒否未検証。 |
| ED-11 | partial / unverified | Node22detail表示スタイルsummary→元装飾only選択→適用→保存通知/設定保持/本文表示。publicationHttp6testsで両style本文文書とparent影響なし。domain displayStyle unit成功。 | import時装飾自動判定/後編集で自動変更しない/viewer非操作/HTML書出しへの反映の全条件browser未検証。 |
| OR-01 | partial / unverified | Node22 4312サインイン後0件一覧・新規/アップロード導線・タイル/リスト/calendar/sort観測。Node24一覧エラーと再試行を観測しNode22で解消。 | scroll pagination、processing/needs_ai、filter0件、loading skeletonが未検証。browse14testsはaccounts fixture列数不一致で失敗。 |
| OR-02 | partial / unverified | Node22list→tileでURLlayout=tile→calendarで作成日8日1件、月=2026-10 URL連動、sortdisabled、再訪の端末設定でcalendar復元を観測。 | 多数日otherN展開/別browser同URL完全復元未検証。browsefixture14失敗。 |
| OR-03 | partial / unverified | Node22CtrlK→個人固定表示/日本語2文字以上検索→抜粋候補、cloud語頭検索→Cloudflare候補、Esc閉じる。 | 1文字/flare不一致（flareは検索中まで観測し結果確定前変更）/timeout/processing/URL持帰り/filters0提案全異常未検証。browsefixture14失敗。 |
| OR-04 | partial / unverified | Node22listタグ「整理済み」で絞り込む→tags=[tagid]URL反映。WS移動前のタグは外れ、WSタグ使用件数も観測。 | AND複数選択/解除/タグ全外し0件/多数検索未検証。tag/browse fixture失敗。 |
| OR-05 | partial / unverified | Node22calendar currentmonth 2026-10/created8日1件・Asia/Tokyo・URL月連動、month解除チップあり。 | ユーザーtimezone境界/0件月/解除の全挙動未検証。 |
| OR-06 | partial / unverified | Node22WSlistタグ追加→整理作成→noteに付く、managerで整理済みrename→list/tagbadge反映。 | 楽観rollback/同タグduplicate/50上限/正規化/他者viewer/他文脈非共有を未検証。tag fixture失敗。 |
| OR-07 | partial / unverified | Node22詳細 タグ追加→Ｔｅｓｔ検索→新規作成付与→タグlink/解除button表示。 | 権限/楽観rollback/50上限/正規化duplicate/タグlink遷移未検証。tags14testsはaccounts fixture列数不一致で失敗。 |
| OR-08 | partial / unverified | Node22listタグ管理→件数つき整理tag→rename「整理済み」→list反映。未使用のみ/削除/未使用整理UI観測。 | 空白拒否/同名merge確認/削除影響件数/unused複数整理/viewer非表示未検証。tags14 fixture失敗。 |
| OR-09 | partial / unverified | Node22list選択mode→checkbox1note→1/500固定集合と全選択説明/操作バー→ZIP実行/成功1失敗0内訳→完了後選択解除。batchunit成功、zip33contracts成功。 | tag/public/move/delete/Driveの一括実動、部分失敗理由、viewer/500上限/条件変更選択解除未検証。 |
| OR-10 | partial / unverified | Node22list sortタイトル降順→URLsort=title-desc反映、再訪同選択復元。calendarのsortdisabled観測。 | 複数日本語titleの安定順、全sort6方向/検索関連度既定未検証。 |
| OR-11 | partial / unverified | Node22作成ノート詳細 タイトル・iframe本文・タグ・時刻・自分/非公開・編集共有移動DL削除を観測。 | processing/needs_ai/failed/失権/不存在/長文見出しなど全異常系未検証。 |
| OR-12 | partial / unverified | Node22個人public note→移動候補WS→閲覧変化0人/タグ外れる影響確認→確定→WS文脈/個人tag除去。保存publicURL同一。sharing19contractsのmove/creator/linkgrant維持等成功。 | viewer候補除外/同名tag付替/権限喪失/processing拒否等未検証。 |
| SH-01 | partial / unverified | Node22非公開→限定公開: 共有設定・閲覧人説明→変更確認→keyboard Enter確定→限定公開を観測。公開はhandle未設定でdisabled・設定導線。sharing19tests成功。 | public/nonpublic切替、WS公開slugs/processing/viewer browser未検証。 |
| SH-02 | partial / unverified | Node22限定link表示・選択可能input/コピーclickを観測、43文字tokenのURLが表示される。sharing19+HTTP9tests成功。 | clipboardコピー成功通知/権限denied fallbackのbrowser結果未観測、public linkとprivateへの戻し未検証。 |
| SH-03 | partial / unverified | Node22 short passwordでは保存disabled、19文字password→確認確定→新しいパスワードinput空で旧値非再表示。匿名gate/正しいpassで本文へ。sharing19tests成功。 | 変更後grant失効/解除確認/public切替解除をbrowser未検証。 |
| SH-04 | works / pass | Node22password付limited link→再発行確認/確定→旧URL404共通利用不能、新URL匿名password gate（password維持）。UIpublic→private後新/旧/未知s全404本文同一。sharing19+HTTP9成功。 |  |
| SH-05 | partial / unverified | Node22匿名limited正しいpass→title/author/time/tag/isolated本文/HTML DL表示、編集なし。HTML download取得内容確認。sharingHTTP9tests成功。 | owner edit導線、取れない外部resourceの本文継続、private/deleted/common error browser未検証。 |
| SH-06 | works / pass | Node22匿名password gateはtitle/body非表示、wrong→共通error、correct→本文、reloadで入力不要。sharing.integration19件で24h固定/失効/8失敗rate/保持期限契約成功。 |  |
| SH-07 | partial / unverified | Node22publicURL browser title/iframebody/authorprofile/tag/DL/metadataを観測。ownerでも編集linkなし、移動後同URL表示継続。publication8+publicationHttp6成功。 | creatorhandle変更のURL保持（brief優先）/完全削除等のbrowser未検証、PDFは配備なし。 |
| SH-08 | partial / fail | Node22listのpublic/link/passwordbadge、panel閲覧範囲と状態表示を観測。一方detailではpublicでも「自分だけが閲覧できます」、WS移動後は「現在のWS権限に従って閲覧できます」と誤説明。 | public閲覧人のdetail誤説明修正。具体WS人数/viewer/一覧badgeクリック未検証。 |
| DS-01 | partial / unverified | Node22profile handle設定→/@content-baseline、owner外部公開banner/設定/作業list導線/public1note。移動すると個人公開listから外れる。 | handle未設定誘導/0件にWS所有除外説明が原文どおり含まれるか未検証。 |
| DS-02 | partial / unverified | Node22WS作成(nonpublic)→公開設定切替確認→/w/content-baseline-wsで外部表示banner/設定・戻りlink/0件公開案内→移動後WSpublic1note。 | 非公開WS公開URL否認/メンバーでの全path未検証。 |
| DS-03 | partial / unverified | Node22scope tokenのsummary展開→個人button→personal /notes切替。WS移動後/個人切替前に現在文脈とpublicpage導線あり。 | layout/sort継続、tag/month文脈独立、失権→個人復帰未検証。 |
| DS-04 | partial / unverified | Node22authorlink・/@content-baselineでdisplayname/bio/tag・search・publicnote表示、owner外部bannerあり。 | 匿名表示/icon/不存在deleted/旧handle404/検索絞込のfullbrowser未検証。discoveryfixture失敗。 |
| DS-05 | partial / unverified | Node22/discover検索日本語+tag→URLq/tag反映・関連note、public→private後discover0件になり非公開note排除。 | crossaccount/crossWS多対象/期間updatedtimezone/短語/英語語頭/rate等未検証。discoveryfixture13失敗。 |
| DS-06 | partial / unverified | Node22publicpメタcanonical/og:title/description/image観測、sitemapindex profile/note/WS区分。publictrashp410→restore、privatep404、不存在p404本文同一。private後indexからnote区分消え、profile sitemap200。publicationHTTP成功。 | 完全削除404/非public内部設定noindexのfull検証不足、discoveryfixture失敗。 |
| EX-01 | partial / unverified | Node22内部detail/編集HTML・Markdown書出UI、PDFは配備なしとdisabled明示。exportFlow30+export integration7tests成功。 | PDF配備実生成/失敗/24h再DL、HTMLmedia埋込とMarkdown特殊要素のbrowser未検証。未設定を実装欠如とは扱わない。 |
| EX-02 | partial / unverified | Node22選択note→HTMLZIP確認/受付→履歴成功→ZIPdownload、PythonZipFileでnoteHTML+report確認/日本語bodyあり。zipFlow/Lifecycle/Admission/Delivery/BatchConfirmation計33tests成功。 | browser実集合は1件。複数・duplicate名/500/1GB/除外/部分失敗/途中削除/全選択/PDF未検証。 |
| EX-03 | partial / unverified | Node22ZIP受付後画面を離れjobs履歴で完了・成功1件・7日取得期限・結果通知→ZIP取得成功。zipLifecycle/Admission/Delivery等33契約成功。 | browser失敗→再実行/キャンセル/期限超過/進行中新要求拒否未検証。 |
| EX-04 | partial / unverified | Node22匿名password通過limited page HTML download成功。exportFlow30件でrevoke/own-browser/権限再確認/rateの契約成功。 | PDF未設定のため匿名ticket/進捗/再試行/共有generation待ち未検証。 |
| UX-LOCATION | partial / unverified | Node22上部個人spaceと詳細現在文脈表示。 | 全主要操作・全画面の完了条件は未検証。 |
| UX-STATE | partial / fail | Node22一覧と詳細にpublic/link/password状態・保存表示。SH08のdetailpublic閲覧範囲が自分だけ/WS権限と誤表示。 | SH08誤説明解消とprocessing/needs_ai/failed/cancelled状態全画面確認。 |
| UX-KEYBOARD | partial / unverified | Node22共有変更・再発行をfocus+Enterで到達/確定。 | 全主要操作・全画面の完了条件は未検証。 |
| UX-VISUAL | partial / unverified | Node22新規/アップロード/処理履歴/編集/共有/tagのbuttonlinkあり。 | 全主要操作・全画面の完了条件は未検証。 |
| UX-READING | partial / unverified | Node22読む詳細はtitle/isolated iframe本文と操作sectionを分離。 | 全主要操作・全画面の完了条件は未検証。 |
| UX-MOBILE | partial / unverified | Node22 375x812 viewport: editor/list/publicp/profile/settingsWS/trash/@profile/wWS/discover/jobs/uploadでdocument.scrollWidth=375（viewport375）。 | calendar/table長文/全dialog展開や未接続機能画面を含む全条件未検証。初期navigation直後の測定も含むため全画面合格とはしない。 |
| NFR-PRIVACY | works / pass | Node22 UIpublic→private・匿名p共通利用不能。GET command比較:privatep=不存在p=404本文同一、再発行旧s/private現s/未知s=404本文同一、title/body/tag漏出false。discover0件、sitemapnote区分消える。成功sharingHTTP9/publicationHTTP6/exportFlow30はmedia/revoke再確認も検証。public状態trashp410はDS06明示例外、公開撤回ではない。 |  |
| NFR-HTML | works / pass | 同main Node24 browser HTML script保存→除去一覧、安全preview sandbox=allow-same-origin（allow-scripts無し）、アプリbody dataset悪意値無し。Node22詳細/匿名も隔離iframe。publicationHttp6testsで両styleのparent非影響、SSR/crawler同一body/sanitizer成功。 |  |
| NFR-JAPANESE | partial / unverified | Node22登録/確認/一覧/編集/詳細/共有/匿名gateのUI日本語を観測。 | 全主要操作・全画面の完了条件は未検証。 |

## 以前の中間記録

以下は更新前の中間記録。最終判定は上表/JSONのみ。

# baseline content 検証（継続中）

対象commit: `ac0894acb78be85f8b10c3c7450fbb00a8c40561`。個別条件未充足はpartial、未操作はunverifiedとして保持。

Node22.22.3/Unicode16.0の新規DB/objects/mailbox/keys、localhost4312で検証。Node24の初回環境は保存して停止。旧環境と外部実サービスは利用なし。

## コマンド結果

- `pnpm build:node` とfresh DB `pnpm db:migrate:node`: exit0。
- content unit（editor/hollow/wys/browse/tag/batch/move/sharing/publication/domain等37ファイル）:452/452成功。
- Node22/Unicode16対象integration10ファイル:120件中79成功41失敗、4ファイル失敗。browse/tag/discoveryのraw account fixtureが6列/5values不一致で失敗。成功はsharing19,sharingHttp9,publication8,publicationHttp6,exportFlow30,export7。
- 正確なコマンドと長い出力は新隔離root `~/.local/state/hollow/baseline-content-node22-20261008/logs/content-integration-node22-unicode16.log`。

## 項目別結果

| ID | 結果/合否 | 今回の操作・観測/コマンド結果 | 残条件 |
| --- | --- | --- | --- |
| ED-01 | partial/unverified | Node22 4312登録確認後、一覧＋新規作成→WYSIWYGタイトル/本文入力→保存→完了→詳細で本文と非公開状態を観測。 | 通信退避、空下書き非作成、複数tab通知の異常系が未検証。 |
| ED-02 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| ED-03 | partial/unverified | Node24の同main新rootでHTML modeに切替、script要素を入力→保存→script除去一覧/安全previewを観測、class/data/style保持をソースで確認。 | 800KB拒否、外部CSS参照取り込み、壊れた構文警告の全異常系未検証。 |
| ED-04 | partial/unverified | Node22新規WYSIWYG本文入力/保存成功、表・画像・コード・リンクのtoolbarを観測。unit WysEditor/adapters/wys成功。 | HTML由来警告、警告再表示、版復元、重い表の案内のbrowser観測未検証。 |
| ED-05 | partial/unverified | 同main Node24で未保存タイトル変更→HTML切替→保存して切替確認→HTML表示→ビジュアル切替（media追加UIが消える）を観測。 | 利用者端末既定の再訪/別ブラウザ、新規WYSIWYG固定/空visual拒否まで未検証。 |
| ED-06 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| ED-07 | partial/unverified | Node22新規タイトル 基準ノート Cloudflare→詳細見出し保存後表示。 | 空タイトル/200文字/重複/一覧共有反映の全条件未検証。 |
| ED-08 | partial/unverified | Node22自動保存/明示保存済み/版の履歴（20版表示）導線を観測。Node24保留入力をブラウザ退避→復元提案も観測。 | 通信再試行/権限喪失ダウンロード/競合解決/20版復元を未検証。 |
| ED-09 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| ED-10 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| ED-11 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| OR-01 | partial/unverified | Node22 4312サインイン後0件一覧・新規/アップロード導線・タイル/リスト/calendar/sort観測。Node24一覧エラーと再試行を観測しNode22で解消。 | scroll pagination、processing/needs_ai、filter0件、loading skeletonが未検証。browse14testsはaccounts fixture列数不一致で失敗。 |
| OR-02 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| OR-03 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| OR-04 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| OR-05 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| OR-06 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| OR-07 | partial/unverified | Node22詳細 タグ追加→Ｔｅｓｔ検索→新規作成付与→タグlink/解除button表示。 | 権限/楽観rollback/50上限/正規化duplicate/タグlink遷移未検証。tags14testsはaccounts fixture列数不一致で失敗。 |
| OR-08 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| OR-09 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| OR-10 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| OR-11 | partial/unverified | Node22作成ノート詳細 タイトル・iframe本文・タグ・時刻・自分/非公開・編集共有移動DL削除を観測。 | processing/needs_ai/failed/失権/不存在/長文見出しなど全異常系未検証。 |
| OR-12 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| SH-01 | partial/unverified | Node22非公開→限定公開: 共有設定・閲覧人説明→変更確認→keyboard Enter確定→限定公開を観測。公開はhandle未設定でdisabled・設定導線。sharing19tests成功。 | public/nonpublic切替、WS公開slugs/processing/viewer browser未検証。 |
| SH-02 | partial/unverified | Node22限定link表示・選択可能input/コピーclickを観測、43文字tokenのURLが表示される。sharing19+HTTP9tests成功。 | clipboardコピー成功通知/権限denied fallbackのbrowser結果未観測、public linkとprivateへの戻し未検証。 |
| SH-03 | partial/unverified | Node22 short passwordでは保存disabled、19文字password→確認確定→新しいパスワードinput空で旧値非再表示。匿名gate/正しいpassで本文へ。sharing19tests成功。 | 変更後grant失効/解除確認/public切替解除をbrowser未検証。 |
| SH-04 | partial/unverified | Node22 password付limited link→リンク再発行→旧URLは共通利用不能、新URLは匿名password gate（設定維持）。sharing19+HTTP9tests成功。 | private化した旧リンクも同じ共通応答のbrowser観測を追加予定。 |
| SH-05 | partial/unverified | Node22匿名limited正しいpass→title/author/time/tag/isolated本文/HTML DL表示、編集なし。HTML download取得内容確認。sharingHTTP9tests成功。 | owner edit導線、取れない外部resourceの本文継続、private/deleted/common error browser未検証。 |
| SH-06 | works/pass | Node22匿名password gateはtitle/body非表示、wrong→共通error、correct→本文、reloadで入力不要。sharing.integration19件で24h固定/失効/8失敗rate/保持期限契約成功。 |  |
| SH-07 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| SH-08 | partial/unverified | Node22詳細非公開/limitedと共有panelの閲覧人・password/link状態を観測。sharing unit model成功。 | 一覧badgeクリック/WS具体人数/移動後/権限viewerを未検証。 |
| DS-01 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| DS-02 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| DS-03 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| DS-04 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| DS-05 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| DS-06 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| EX-01 | partial/unverified | Node22内部detail/編集HTML・Markdown書出UI、PDFは配備なしとdisabled明示。exportFlow30+export integration7tests成功。 | PDF配備実生成/失敗/24h再DL、HTMLmedia埋込とMarkdown特殊要素のbrowser未検証。未設定を実装欠如とは扱わない。 |
| EX-02 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| EX-03 | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| EX-04 | partial/unverified | Node22匿名password通過limited page HTML download成功。exportFlow30件でrevoke/own-browser/権限再確認/rateの契約成功。 | PDF未設定のため匿名ticket/進捗/再試行/共有generation待ち未検証。 |
| UX-LOCATION | partial/unverified | Node22上部個人spaceと詳細現在文脈表示。 | 全主要操作・全画面の完了条件は未検証。 |
| UX-STATE | partial/unverified | Node22一覧と詳細非公開/限定公開表示・保存済み表示。 | 全主要操作・全画面の完了条件は未検証。 |
| UX-KEYBOARD | partial/unverified | Node22共有変更・再発行をfocus+Enterで到達/確定。 | 全主要操作・全画面の完了条件は未検証。 |
| UX-VISUAL | partial/unverified | Node22新規/アップロード/処理履歴/編集/共有/tagのbuttonlinkあり。 | 全主要操作・全画面の完了条件は未検証。 |
| UX-READING | partial/unverified | Node22読む詳細はtitle/isolated iframe本文と操作sectionを分離。 | 全主要操作・全画面の完了条件は未検証。 |
| UX-MOBILE | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| NFR-PRIVACY | unverified/unverified | ac0894a mainの当該シナリオを今回まだ操作していない。対象unit37ファイル452件成功は個別シナリオ全体の合格には扱わない。 | 正常系・異常系全体を現環境で検証。 |
| NFR-HTML | works/pass | 同main Node24 browser HTML script保存→除去一覧、安全preview sandbox=allow-same-origin（allow-scripts無し）、アプリbody dataset悪意値無し。Node22詳細/匿名も隔離iframe。publicationHttp6testsで両styleのparent非影響、SSR/crawler同一body/sanitizer成功。 |  |
| NFR-JAPANESE | partial/unverified | Node22登録/確認/一覧/編集/詳細/共有/匿名gateのUI日本語を観測。 | 全主要操作・全画面の完了条件は未検証。 |
