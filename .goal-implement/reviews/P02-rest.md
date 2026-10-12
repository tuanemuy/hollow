# P02 第二候補の独立検証

判定: **ED-01/02/03/04/05/06/07/08/10 の全9 ID pass**。候補 `4efe160c70cefa4fd5d0cf64c2236a4960ed61dd`、code `1c8c48dca1d51d70919bae83bad29fd03a6283e5`。全 3964 pass / skip 0、公開 e2e 9 項目 pass。第一候補 code `9671f3d8314e8f317572e7060f8872920f85e24d` と独立受入済み 17 項目の根拠を維持する。2026-10-09 06:35 UTC 最終報告。

## 環境

候補の公開 tracked source のみを新規 git checkout に展開した。原文は元 root の brief/design/plan と `spec/scenario/editing.md` から照合した。

- root: `/Users/hikaru/.local/share/hollow/verification/p02-rest-independent-1791525807614559000`
- checkout: root の `checkout/`
- 短 persistent TMPDIR: `/Users/hikaru/.local/hwt/r14559000`
- ログ: root の `logs/results.json`、各 command log、`logs/browser.jsonl`
- sanitized environment: HOME/PATH/LANG のみから Nix shell を起動し、TMPDIR/TMP/TEMP と CI/WRANGLER_SEND_METRICS を明示する。

新規 DB/objects/mailbox/合成鍵の公開 editing harness を使う。実外部サービス接続・送信・課金・公開は行わない。local Google/メール/reference は代替契約であり実到達性とは区別する。

## レビュー

第一候補からの製品変更は `WorkspaceScope.tsx` の 11 行の trash Link だけ。`scopeSearch(workspaceId)` と既存 `canEdit` で個人/編集可能 workspace の入口を示す。mutation を増やさず、既存 application の権限拒否を維持する。その他は公開 CLI e2e、2 件の integration、docs/scripts/管理記録。assertion 削除・skip・対象縮小なし。共通 selector/title/reference DI と ED-09/11 実装は不変。

新 e2e は owned regular synthetic manifest と loopback origin を検証し、owner/editor の専用 browser session を作る。製品のサインイン・編集・workspace 設定・download UI を通り、直接 DB/objects を操作しない。offline と競合の前提を実操作で作り、入力/保存済み本文/local backup・実 JSON download を照合する。finally でロールを editor へ戻し専用 session を close する。通常 suite の件数へ加算しない。

追加 workspace integration は editor→viewer と除名の双方で manual/autosave/confirmedVersion を拒否し、current note/head/20 revisions の実永続 snapshot が不変であることを照合する。provider-native error や権限秘密の新たな露出はない。

## 原文の異常条件との対応

以下の repository tests と公開 e2e は独立再実行で成功した。異常条件をすべて手動 browser へ増やす扱いはしない。

| ID | repository / 公開 e2e の対応 |
| --- | --- |
| ED-01 | hollow integration の blank/size、same-user later-save、editorSave の scope 別 backup/橋渡しと失敗不変、useEditorMedia の遅い旧 scope 拒否。e2e の offline/再送/2 tab 通知。 |
| ED-02 | editorAnalysis/regression の class/style/data/CRLF と空 text 保持、script/style 除外、構造/配置改変拒否。e2e の書式拒否と別 actor 競合。workspace/revisions の exact confirmation。 |
| ED-03 | hollow integration の危険要素/属性/URL 除去と exact 800 KiB UTF8 境界、editorAnalysis の syntax 行列/補正/深さ、references integration の opt-out→on、stable asset/CSS snapshot と stale 保存再利用。 |
| ED-04 | WYS model/session の表/リンク/コード/media/未知 opaque と重い表/深い構造保持、wysRecovery/wysDiscard と wysOrigin/revisions integration の不変元版・明示復元・prune/競合/権限。 |
| ED-05 | editorMode/Request の既存の端末既定/新規 WYS/要求世代、公開 e2e の dirty 保存失敗・別 browser 非継承・reload・空 visual 拒否。 |
| ED-06 | editorMedia の 20/200 MiB inclusive 境界/unsupported/空、assets integration の worker corruption/disguise 拒否・retry・SVG 除去・GC/pin/quota・他 scope 拒否。 |
| ED-07 | hollow integration の 200 codepoints・空無題・重複許容、本文不変。 |
| ED-08 | revisions integration の 20版/preview/restore/pins/OCC、公開 e2e の offline/退避再入場/破棄/離脱/競合/rolelost 実 JSON、追加2 integration の保存拒否/20版不変。 |
| ED-10 | trash integration の削除順/scope/公開共有復元/exact30日期限、purge の real cleanup/原本/media/history/失敗回復、emptyTrash の 0/50/51/501 と非同期 threshold、workspaceDeletion の連鎖削除、Drive backup application の remote 保存保持。 |

## 独立実行と browser

| command | UTC 開始–終了 | 結果 |
| --- | --- | --- |
| `pnpm install --offline --frozen-lockfile` | 06:03:36–06:03:51 | exit 0 |
| runtime probe | 06:03:51–06:03:54 | Node v22.22.3 / Unicode16.0、同固定 Nix Node の pnpm |
| `pnpm typecheck` | 06:03:54–06:04:01 | exit 0 |
| `pnpm lint` | 06:04:01–06:04:03 | exit 0 |
| `pnpm format:check` | 06:04:03–06:04:04 | exit 0 |
| `pnpm test` | 06:04:04–06:09:55 | exit 0、350.87 秒 |
| `pnpm build` | 06:09:55–06:10:02 | exit 0、7.15 秒 |
| `pnpm test:e2e:editing --root <root>/browser` | 06:10:20–06:10:56 | exit 0、9 成立 assertion |

通常 test は build 前に実行した。Unit177 files/2567 tests、Node108 files/1327 tests（5 native groups）、Cloudflare10 files/70 tests、合計295 files/3964 tests が成功、skip0。checkout tracked diff は空。build 後は成果物を変更せず、same checkout で own fresh harness `127.0.0.1:54631` を起動した。

e2e は `browser/editing-e2e-e10764b5.jsonl` に実操作と成立 assertion を残した。offline autosave と dirty mode の失敗保持、online 再送・保存後 reload、backup 再入場/reload/復元、破棄/離脱取消と破棄承認、visual 書式拒否、別 actor 競合取消/明示上書き、viewer 降格後の拒否と実 JSON download、同 actor2tab 通知と later winner、端末 mode/default と新規/空 visual の 9 件が成立。ロールを editor へ戻した reload 確認、専用 owner/editor session close も成功。通常3964件へ加算していない。

Manager から network permission に伴う担当 turn 終了通知が来たため状態を照合した。権限変更・回避は行わず、readonly/同 loopback の実行が成功し、既起動 harness と e2e 完了結果を保持して続行した。

### ED-01: pass

06:11–06:12 UTC、新規の WYS 空入力から離脱して一覧が2件のまま（空下書きを作らない）と確認。再度新規を開くと WYS。保存先候補は個人と編集可能な「編集fixture」だけで、閲覧専用 workspace を含まない。入力前に編集可能 workspace を選び、本文を入力すると先頭行の自動タイトルで非公開保存され、完了から当該 workspace の詳細へ到達した。

06:29–06:30 UTC、個人の新規 HTML 下書きに実 PNG と失敗する unsupported.txt を選び、draft asset の挿入と未解決アップロードを作った。タイトルと通常本文を入力し保存先変更の確認を取消すと、個人の選択・タイトル・本文・draft 画像がすべてそのまま残る。再度変更して承認すると draft 画像と未解決項目を除去し、タイトル「保存先変更の独立確認」と本文「保存先変更後も残す本文」を保持して編集fixtureへ非公開保存、完了から scoped 詳細 URL へ到達した。媒体のあった空段落は残った。

scope 別 offline backup/古いアップロードの拒否は独立 suite、同 actor2tab の変更通知と後の保存優先・offline 再送は実 browser e2e の成功根拠に対応する。全正常/異常条件を満たす。

### ED-03: pass

06:31–06:32 UTC。新規 HTML editor に local reference の CSS/画像/動画と onclick/script を入力した。CodeMirror の要素名/文字列/数値の異なる span と、リアルタイムの安全な preview を観測。除去一覧は onclick/script と未取得 media を示し、自動保存後 canonical から onclick/script が除去される。保存結果の除去内容を確認して閉じる操作も成功した。

参照取り込み off で保存すると CSS/画像/動画3候補が未試行のまま残り、取得0/未取得3、preview には危険 script/属性も未取得 media src もない。詳細の「参照取り込みをオンにする」から取得3/未取得0となり、画像/動画が同じ note ID の永続 asset URL、CSS が安全化した style snapshot になる。元スタイルで紫 `rgb(120, 40, 160)` を確認。自分が起動した loopback reference fixture の style.css を緑へ変更して reload しても、紫と media URL を含む iframe HTML が変更前と厳密に一致し、保存済み snapshot を保持した。

800 KiB exact/+1 境界、syntax の行列/補正確認と保存制御は成功済み editorAnalysis/hollow integration に対応する。trusted reference adapter は専用 loopback の既知 path だけを使用し、実外部取得は未実行。原文正常/異常条件を満たす。

### ED-02: pass

06:26–06:27 UTC。共同編集 fixture を HTML で開き、`<style>.kept{color:red}</style><p class="kept" style="font-weight:bold" data-v="keep">編集前本文</p><p>次の本文</p>` を保存した。visual へ切り替えると編集可能文字一覧は2つの段落だけを示し、style 本文を含まない。先頭段落を選択して `変更後の本文😀` へ変更し、自動保存後 HTML へ戻った。元 HTML との厳密比較で当該 text 以外が一致し、class/style/data 属性と2段落・style 構造を保持した。

空 text と属性/構造維持は editorAnalysis/regression、書式操作拒否と別 actor の競合取消/明示上書きは独立成功した公開実 browser e2e に対応する。全3964件と e2e9件の成功を合わせ、原文正常/異常条件を満たす。

### ED-05: pass

06:12–06:14 UTC。new note は WYS で入力/自動保存。既存編集は既定 HTML で開いたので、HTML source を変更して preview 準備後に visual を選ぶと「未保存の内容を保存して切り替えますか？」と確認された。取消で HTML mode/input を保持し、再選択→保存して切替で変更本文が visual に表示される。HTML に戻しても同じ `<p>` 本文を保持した。WYS/HTML/visual の共通正データを確認した。

dirty 保存失敗時の mode 維持、利用者の別 browser 非継承、reload の同端末既定、新規は WYS、空 visual 拒否は実 UI e2e の成立根拠を保持する。HTML file の WYS 警告の最終 browser 確認は ED-04 で継続するが、当該既存 warning/normalization implementation と自動回帰は不変で成功。

HTML file 由来ノートの HTML→WYS 選択でも、装飾・構造の正規化の warning と明示受諾を 06:17 UTC に確認した。

### ED-07: pass

06:13–06:17 UTC。実 title 入力へ201非BMP文字を入れると200 codepoints/UTF16 400 に制限され、自動保存後の detail h1、一覧、calendar/timeline のノート表示へ同じ200文字が反映された。製品共有設定から専用 loopback の限定 URL を発行して guest session で開くと shared h1 も同じ200文字だった。外部公開・共有送信は行わない。共有 dialog 内の CLI pointer 操作は変化を起こさなかったため、公開 DOM の同 button click と実 confirmation を使い通常 handler を通した。

空タイトル→無題・重複許容・200 codepoint domain/transport 境界・本文不変は `hollow.integration.test.ts` の独立成功根拠。既存 title からの更新、autosave と全表示への反映が成立した。

### ED-06: pass

06:18–06:21 UTC。WYS toolbar の file input へ専用 root の PNG/JPG/JPEG/GIF/WebP/SVG/MP4/WebM を8件投入した。「メディアをアップロード中…」と保存・完了 disabled を即時観測し、各 actual processor 完了後は画像6/動画2を挿入した。全画像 alt と動画 aria-label は入力した説明を保持する。SVG の実行/未対応要素の除去案内を確認して閉じた。WYS の canonical 差替え案内から再準備後 HTML mode で、全8件が same-note `/api/notes/<id>/assets/<id>`、draft URL なし、6img/2video であることを実本文から照合した。完了→detail→reload でも6img/2video と同 alt が残った。

WYS DOM の raw img 数には src のない内部 img も含まれたため、最初の「DOM img==6」という観測条件は不適切だった。実 asset src と保存 canonical/再読込 iframe の6件へ照合を訂正した。保存結果による WYS 再準備の間も最新入力を保持する既存案内を確認した。これらの操作補正は製品 defect に数えない。

unsupported/上限/空、SVG、native worker の disguised/corrupt 拒否と同 draft の正常 retry、removed media/history pin と GC は上の独立自動根拠が成功。未完了メディアは useEditorMedia の unresolved 状態・取消/native abort と既存 NoteEditor navigation guard の対象で、入力保持/離脱取消は actual browser e2e でも通った。visual の要素追加禁止と media controls 非提供は既存 branch/自動境界を維持する。異常条件をすべて新たな browser 必須条件にしていない。

### ED-04: pass

06:17–06:23 UTC。HTML file 由来で WYS を選び、装飾・構造の正規化 warning と「確認してWYSIWYGで編集」を確認した。「次回から警告を表示しない」を選んで了承すると、style/未知構造は opaque 保持 block、本文は編集可能になった。toolbar からコード・リンク・2x2 表を操作し、画像/動画8件を実挿入・保存した。canonical には style、class/data を持つ code/pre、リンク、表、media が保存された。選択していた未知 block は media の挿入位置で置換されており、この操作後の全文を未知 block 不変の根拠とは扱わない。未知要素の保持・undo・1001-cell/depth16 の HTML 推奨は model/session の自動テスト成功根拠を使う。

再入場→WYS で warning が非表示になり、HTML→編集設定→警告再表示→WYS では warning が再出現した。変換前の版2を確認する link から、current は変えず元 class/style/data/aside を preview できた。明示復元後は新しい版5になり、元の h1/p/style/aside を戻し、追加 link/table/media を取り除いた。版・origin/現在権限・重い構造は前記 actual integration/unit の成功と対応する。

### ED-08: pass

06:11–06:24 UTC。新規 WYS の autosave と保存済み表示、mode 切替の明示保存を実操作済み。履歴 fixture の現在を含む20版（22〜3）を UI で表示し、版3を選ぶと current iframe は本文「版21」のまま、preview iframe だけ「版2」になった。「この版への復元を確認」→「復元して保存」で本文が「版2」、新しい現在版23となり、保持数20（23〜4）になった。続けて HTML を変更し、autosave 前の「保存」を押すと保存済みになり、history に版24・手動保存が記録された。

破棄/離脱確認の取消で入力保持、破棄承認で最後の保存本文へ戻る主要操作は actual browser e2e で成立した。offline の退避と復元案内/再送、別 actor 競合の取消/明示上書き、viewer 降格後の保存拒否・未保存保持・実 JSON download は同 e2e 成功。除名と manual/autosave/confirmedVersion 保存後の実20版不変は追加 integration 成功。実 download 内容の title/html/mode を解析して照合しており、単に button の存在で回収成功とは扱わない。

対象9 IDの正常 browser と原文異常対応が揃った。既受入17項目を再オープンする差分/回帰根拠はない。

### ED-10: pass

06:32–06:34 UTC。編集fixtureのノートを削除し、現在のscope tokenメニューの「現在の保存先のゴミ箱」から scoped trash URL へ到達。残り30日と期限・削除日を表示する。復元ボタンから以前のtitle/scoped詳細へ戻り、再度削除→完全に削除の確認は取消不能と原本/media/全版削除を示し、checkbox未確認では実行不可。確認後実行すると空状態、処理状況の完了履歴で「完全削除が完了」を確認した。

個人でもscope token入口から personal trash に到達し、「ゴミ箱を空にする」はscopeと固定1件の取消不能確認を示す。確認後空状態になり、一括処理履歴で固定1/完了1/失敗0/取消0/未開始0/処理中0を確認。追加で個人の2つのnoteを削除すると、06:34:12.853 と .540 の順に新しい方が先頭、双方残り30日だった。一方を復元し、個人のノート一覧のcalendarにtitleが再表示されることも確認した。

別sessionのviewerを実サインインし、編集fixtureのscope menuにtrash linkがないこと、直接同workspace trash URLを開くと「表示できませんでした / 対象が見つかりません」、trash row 0 で権限境界拒否を確認した。permission UIの文言を誤って「ありません」と待機した20秒timeoutは観測条件の誤りで、実拒否画面を改めて記録した。

公開/共有/tag復元、exact30日期限処理、元file/media/版cleanup、workspace連鎖、50超非同期と0/50/51/501、Drive backup維持は成功済み integration 対応。Drive remoteは代替port契約であり実接続未検証。原文正常/異常条件を満たす。

## 未検証と停止

実 Google/SMTP/Drive/OpenRouter/外部参照の接続は未実行。音声は既定の保留を維持し調査・設計・実装しない。自起動環境は停止済み。

2026-10-09 06:35 UTC、manual sessions `p02r-7614559000-a/b` を各 close exit0。own rootに対応する harness node PID83079 を ps で照合して SIGTERM、親 runner の harness_exit0を確認。own process group83013 の残processなし、application54631/reference63987 の loopback接続はともに拒否。e2e専用sessionsは06:10:55にclose済みで、editor roleへの復帰を先に確認済み。checkout tracked diff exit0、成果物再buildなし。停止根拠は同root `logs/stop.json` / `stop-target.txt`。旧保全資料・旧data・別担当processを操作していない。
