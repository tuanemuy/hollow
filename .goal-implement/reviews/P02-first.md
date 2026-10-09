# P02 第一候補の独立検証

判定: **ED-09 pass、ED-11 pass**。候補 `bec816a16e6954ef25c4a4303755eceb41ea4f9c`、実装 `9671f3d8314e8f317572e7060f8872920f85e24d`、baseline `a0c665d`。3962 pass / skip 0、型・lint・format・build 成功。既 done 15 項目を再オープンする根拠はない。2026-10-09 05:15 UTC、Verifier 自起動環境は停止済み。

## 独立環境とコマンド

公開 tracked source だけを候補から新規 git checkout へ展開した。旧 archive・DB・objects・D01・秘密 env・spec・goal 管理ファイルはコピーしていない。原文は元 root の許可されたドキュメントから照合した。

- root: `/Users/hikaru/.local/share/hollow/verification/p02-first-independent-1791522253353676000`
- TMPDIR: `/Users/hikaru/.local/hwt/v53676000`
- ログ: root の `logs/results.json`、`logs/browser.jsonl` と各コマンドの `.log`
- 実行: sanitized environment の `nix develop --command env TMPDIR=… TMP=… TEMP=… <command>`
- Node `v22.22.3` / Unicode `16.0`、pnpm も同じ Nix Node。

| コマンド | UTC 開始–終了 | 結果 |
| --- | --- | --- |
| `pnpm install --offline --frozen-lockfile` | 05:04:19–05:04:34 | exit 0 |
| runtime probe | 05:04:34–05:04:37 | exit 0、固定 Node/Unicode |
| `pnpm typecheck` | 05:04:37–05:04:44 | exit 0 |
| `pnpm lint` | 05:04:44–05:04:47 | exit 0 |
| `pnpm format:check` | 05:04:47–05:04:48 | exit 0 |
| `pnpm test` | 05:04:48–05:10:40 | exit 0、3962 pass / skip 0 |
| `pnpm build` | 05:10:40–05:10:48 | exit 0 |

test は build 前に実行した。Unit 177 files / 2567 tests、Node 108 files / 1325 tests（5 native groups）、Cloudflare 10 files / 70 tests が成功した。検証後 tracked diff は空。

## ED-09: pass

原文 `spec/scenario/editing.md` の ED-09 基本フロー・異常系を照合した。fresh 公開 `test:browser:editing` harness を loopback `127.0.0.1:54630` に起動し、所有者と閲覧者の独立 browser session を製品サインインから操作した。05:11–05:12 UTC。

所有者が共同編集 fixture の詳細で「削除」を選ぶと確認 dialog が出た。「公開ページや共有リンクからも閲覧できなくなります」と、30 日以内の復元を説明する。確認後 workspace 一覧は「ノート 0件」となり、削除対象が消える。直後の「元に戻す」で復元通知が出て「ノート 1件」、同じ共同編集ノートが一覧へ戻った。閲覧者では詳細の削除 button・編集 link がなく、閲覧専用表示を確認した。

原文の異常条件は独立全 suite に含まれる以下の根拠で成功した。

- `trash.integration.test.ts`: actual application の public/shared read が trash 中に `PUBLIC_TRASHED` / `SHARE_NOT_FOUND` を返し、Undo 後は同じ公開 identity・共有 token・displayStyle・本文・履歴を復元する。default/original 両設定を照合する。
- `trash.integration.test.ts`: 確認後に処理 job が増えた場合の `TRASH_PROCESSING` と無変更、cancelProcessing の明示受諾後の取消、権限・古い intent/Undo generation・同時 Undo の拒否。
- `references.integration.test.ts` / `llmControl.integration.test.ts`: held 参照変換・再生成を trash で取り消し、Undo 後も遅い完了結果が本文を復活・上書きしない。
- `workspace.integration.test.ts`: viewer の save/style/trash を拒否し、現 editor と権限失効・scope 境界を検証する。
- `TrashActions.test.tsx`: 公開/共有アクセス不能の確認説明、処理中の確認受諾、失敗からの回復を検証する。

公開・限定公開の実外部 URL へアクセスしたとは扱わない。製品の actual public/shared read 契約・real libSQL と復元の検証である。複数削除 OR-09 は原文の別対象で、この ID に追加していない。

## ED-11: pass

原文の基本フロー・異常条件を fresh 同環境から 05:12–05:14 UTC に確認した。

所有者が actual HTML upload/conversion 由来の `decorated.html` を開くと「元の装飾のみ」で、取り込み時の安全な装飾による自動判定と説明された。iframe は `.imported{color:red}` 20 文字の style を持ち、見出しが赤色だった。既定スタイル preview にすると 266 文字の既定 CSS が追加され、取消で元の style だけへ戻った。適用して reload すると「既定スタイルを適用」が保持され、利用者が選択した設定と説明された。反対方向の original preview/cancel でも既定 CSS が外れ、取消で保存済み default に戻る。original を適用して reload しても original が保持された。

同ノートの HTML 編集画面で装飾のない `<h1>` と `<p>` だけへ本文を置換し、自動保存・完了・detail reload を行った。装飾除去後も original が保持された。iframe の body は編集した本文、style 0、見出しの font は素のブラウザ設定だった。default preview では既定 CSS 1 件と `system-ui, sans-serif` に切り替わり、取消した。CLI の CodeMirror `fill` は一度先頭追加となったため、実キーボード `Meta+a` と入力で全文置換し、snapshot で本文が意図どおり置換されたことを確認した。このドライバ操作補正を製品不具合とは扱わない。

閲覧者は共同ノートで保存済みスタイルと新規設定の由来説明を表示し、radio 0・表示スタイル summary なし・適用/取消なしを観測した。

原文異常と公開/shared/HTML 出力の保持は独立全 suite の次の契約根拠が成功した。

- `references.integration.test.ts`: 初回取り込みの装飾検出、class のみでは default、inline/取得 CSS では original、遅い参照 jobs、明示設定後・本文編集後に displayStyle を自動変更しないこと。authoritative saved body の競合も検証する。
- `trash.integration.test.ts`: default/original の両設定で actual public/shared DTO の displayStyle と本文が一致し、trash 中はアクセス拒否、復元後も同設定を保持する。
- `exportFlow.integration.test.ts`: real HTML export を実際に読み、default だけ `DEFAULT_DOCUMENT_CSS` が入り、original には入らないこと。出力後の本文・題名・style・version は不変。
- `workspace.integration.test.ts`: viewer の style mutation と失効後の操作を application で拒否する。
- `NoteDisplayStyle.test.tsx`: automatic/explicit/legacy/blank/interrupted 等の由来表示と readonly controls 非表示、編集可能な controls。

単なる DTO stub や表示文字列のみで style 一致と判定していない。real libSQL/application/export bytes と iframe CSS/計算済み font を照合した。実外部公開や共有送信は行っていない。

## コードレビューと既受入への影響

baseline からの 28 paths を照合した。assertion を弱める変更はなく、既存 application/domain/ports/migration と SafeReferenceFetcher の production 実装は不変。

`NoteDisplayStyle` は readonly を mutation hooks のない表示 branch に分け、route が実際の `scope.canEdit` を渡す。編集 branch は leaf が `useOptimistic` / `useTransition` と局所 error を所有し、保存成功で `router.invalidate()` する。削除は既存 `ScopedNotesBoard` の親が一覧 membership/optimistic 状態を所有し、root `TrashProvider` が遷移後の Undo を所有する。新説明は共通確認 dialog にある。

trusted Node boot の `referenceFetcher` 注入は内部 DI のみ。省略時は既存 NodeSafeReferenceFetcher のままで、production の private-address / arbitrary-port 拒否を変更していない。scripts 専用 local adapter は専用 origin と既知 path だけを通信前に認め、credentials/query/hash と他 URL を拒否する。finite deadline・maxBytes・AbortSignal・response/body cancel に伴う native connection close を native tests で確認した。fixture 以外の許可を増やす HTTP endpoint/env はない。

共通 scope selector は editable role の候補だけを選び、application の scope guard を使う。draft media の世代を切り、遅い旧 scope Promise が新 upload を開始しない regression がある。title は domain/transport と同じ 200 codepoints を UI に適用する。これらは他 ED の共通実装の追加観察であり、ED-01/02/03/04/05/06/07/08/10 は未受入のまま。

既 done 15 の認証 product code は不変。SH-04/SH-06/NFR-PRIVACY/NFR-HTML、QA-TEST/BUILD/TYPECHECK/LINT と AC 既受入の契約を再オープンする根拠はない。全 suite・型/静的/build 回帰は成功。過去の認証正常 browser を好みで繰り返していない。

## 未検証と停止

実外部サービス接続・SMTP 配送・Google OAuth・外部参照取得は実行していない。local Google/メール fixture と loopback reference adapter は契約代替であり実サービスの到達性を証明しない。

2026-10-09 05:15:55 UTC に停止を確認した。所有 browser session `p02v-3353676000-a` / `-b` を close、PID 14029 が今回 root の editing harness であることを確認して SIGTERM した。harness は graceful exit 0。所属した process group 13964 は残っておらず、application port 54630 と reference fixture port 59840 はともに ConnectionRefusedError。確認ログは `logs/stop.json`。他環境の process は停止していない。旧保全資料と untracked archive 3 directory / resume は保持した。
