# P02 第一候補の独立検証

判定: **ED-09 pass、ED-11 はブラウザ確認中**。候補 `bec816a16e6954ef25c4a4303755eceb41ea4f9c`、実装 `9671f3d8314e8f317572e7060f8872920f85e24d`、baseline `a0c665d`。既 done 15 項目を再オープンする根拠はない。2026-10-09 05:12 UTC の中間報告。

## 独立環境とコマンド

公開 tracked source だけを候補から新規 git checkout へ展開した。旧 archive・DB・objects・D01・秘密 env・spec・goal 管理ファイルはコピーしていない。原文は元 root の許可されたドキュメントから照合した。

- root: `/Users/hikaru/.local/share/hollow/verification/p02-first-independent-1791522253353676000`
- TMPDIR: `/Users/hikaru/.local/hwt/v53676000`
- ログ: root の `logs/`、`results.json`、`browser.jsonl`
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

## ED-11: 確認中

独立全 suite は成功。閲覧者では保存済みスタイルと新規設定の由来説明を表示し、radio 0・表示スタイル summary なし・適用/取消なしを観測した。所有者の装飾 HTML 自動判定、preview/cancel/apply/reload、編集後保持は継続中。

## コードレビューと既受入への影響

baseline からの 28 paths を照合した。assertion を弱める変更はなく、既存 application/domain/ports/migration と SafeReferenceFetcher の production 実装は不変。

`NoteDisplayStyle` は readonly を mutation hooks のない表示 branch に分け、route が実際の `scope.canEdit` を渡す。編集 branch は leaf が `useOptimistic` / `useTransition` と局所 error を所有し、保存成功で `router.invalidate()` する。削除は既存 `ScopedNotesBoard` の親が一覧 membership/optimistic 状態を所有し、root `TrashProvider` が遷移後の Undo を所有する。新説明は共通確認 dialog にある。

trusted Node boot の `referenceFetcher` 注入は内部 DI のみ。省略時は既存 NodeSafeReferenceFetcher のままで、production の private-address / arbitrary-port 拒否を変更していない。scripts 専用 local adapter は専用 origin と既知 path だけを通信前に認め、credentials/query/hash と他 URL を拒否する。finite deadline・maxBytes・AbortSignal・response/body cancel に伴う native connection close を native tests で確認した。fixture 以外の許可を増やす HTTP endpoint/env はない。

共通 scope selector は editable role の候補だけを選び、application の scope guard を使う。draft media の世代を切り、遅い旧 scope Promise が新 upload を開始しない regression がある。title は domain/transport と同じ 200 codepoints を UI に適用する。これらは他 ED の共通実装の追加観察であり、ED-01/02/03/04/05/06/07/08/10 は未受入のまま。

既 done 15 の認証 product code は不変。SH-04/SH-06/NFR-PRIVACY/NFR-HTML、QA-TEST/BUILD/TYPECHECK/LINT と AC 既受入の契約を再オープンする根拠はない。全 suite・型/静的/build 回帰は成功。過去の認証正常 browser を好みで繰り返していない。

## 未検証と停止

実外部サービス接続・SMTP 配送・Google OAuth・外部参照取得は実行していない。local Google/メール fixture と loopback reference adapter は契約代替であり実サービスの到達性を証明しない。

現在、Verifier が自起動した harness と 2 browser session は検証継続中。全対象完了後にこの環境だけを停止し追記する。
