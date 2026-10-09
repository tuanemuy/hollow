# P02 第二候補の独立検証

判定: **ED-05 pass、ED-01/02/03/04/06/07/08/10 は正常 browser 確認中**。候補 `4efe160c70cefa4fd5d0cf64c2236a4960ed61dd`、code `1c8c48dca1d51d70919bae83bad29fd03a6283e5`。全 3964 pass / skip 0、公開 e2e 9 項目 pass。第一候補 code `9671f3d8314e8f317572e7060f8872920f85e24d` と独立受入済み 17 項目の根拠を維持する。2026-10-09 06:14 UTC 中間報告。

## 環境

候補の公開 tracked source のみを新規 git checkout に展開した。旧 DB/objects/D01・archive・秘密 env・spec・goal 管理ファイルをコピーしていない。原文は元 root の brief/design/plan と `spec/scenario/editing.md` から照合した。

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

### ED-05: pass

06:12–06:14 UTC。new note は WYS で入力/自動保存。既存編集は既定 HTML で開いたので、HTML source を変更して preview 準備後に visual を選ぶと「未保存の内容を保存して切り替えますか？」と確認された。取消で HTML mode/input を保持し、再選択→保存して切替で変更本文が visual に表示される。HTML に戻しても同じ `<p>` 本文を保持した。WYS/HTML/visual の共通正データを確認した。

dirty 保存失敗時の mode 維持、利用者の別 browser 非継承、reload の同端末既定、新規は WYS、空 visual 拒否は実 UI e2e の成立根拠を保持する。HTML file の WYS 警告の最終 browser 確認は ED-04 で継続するが、当該既存 warning/normalization implementation と自動回帰は不変で成功。

他 ID の正常 browser は継続中。

## 未検証と停止

実 Google/SMTP/Drive/OpenRouter/外部参照の接続は未実行。音声は既定の保留を維持し調査・設計・実装しない。終了時は自起動環境だけを停止して追記する。
