# P2b-A/B media implementation

## Status

Completion candidate, 2026-09-06 06:12 JST. Independent Manager/Verifier acceptance is pending. Implementation code and browser operations are stopped. P2b-C/D, full three-mode editing, 20-version history, trash, workspaces, public sharing and AI integration remain outside this slice.

## Changes and acceptance scope

| Scope | Implementation and current evidence |
| --- | --- |
| P2b-A / P1-D | Typed asset, upload, draft and note-reference repositories in the Hollow UoW. Each GET/HEAD/Range checks current account, note/draft authorization, exact reference and ready state. Integration tests cover other account, anonymous, other note, other draft, revoked session, removed reference, 206 and authorized-only 416. |
| P2b-A / P2a-D | Original bytes, media bytes and outstanding reservations share the 5 GiB quota. A real DB race admits only one of two competing final-byte reservations. Storage and media inspection occur outside transactions. Failed cleanup retains reservation until sweep succeeds. |
| P2b-A | Seven-day unreferenced collection marks an asset deleting before storage I/O and retries interrupted deletion. Reference version 0 is current; positive immutable version pins prevent collection, reserved for future history. Existing original attachment retention is unchanged. |
| P2b-B / ED-06 | HTML/WYSIWYG toolbar and File drop insertion, alt text, progress, pending-leave guard, retry/remove failure placeholders. New draft is independent of a note; successful note save rewrites draft asset URLs to stable note asset URLs and commits references atomically. Media-only HTML is nonblank. |
| P1-C | Canonical HTML passes the real sanitizer. Rendering removes live href/target and unapproved src/poster before mounting the completed srcdoc. Trusted parent presents validated explicit links separately. Sandbox has only allow-same-origin. CSP rejects script, object, frame, connect, form and base; img/media sources are exact authorized asset URLs. |

The shared libSQL resource queue and auth/session implementation are unchanged. Existing outbox/processed-event tests remain included in the 68-test Node run. FileObjectStorage adds stat and bounded streaming; original attachment responses are unchanged. The existing image/audio worker exports its validator for inline raster reuse; all prior media and document regressions run again.

## Parser boundaries

- Images: PNG/JPEG/GIF/WebP/SVG, 20 MiB; video: MP4/WebM, 200 MiB. File extension and supplied MIME do not decide success. Raster payload inspection reuses the accepted bounded sharp/structure pipeline.
- SVG uses XMLValidator and preserve-order XMLParser, strict SVG root namespace, no entity declarations, bounded depth/nodes/bytes, followed by a structural sanitize-html XML allowlist. Executable, foreignObject, external references, event handlers, style elements and style attributes are removed. Safe viewBox, shape geometry, local gradients, clipPath and Japanese text survive. Sanitized SVG alone is decoded by sharp and persisted; unsafe source bytes are removed before asset commit.
- This SVG subset deliberately loses stylesheet/class-based decoration, embedded raster images and unsupported elements, with removal notices. It does not claim full SVG feature fidelity. Direct SVG navigation additionally receives response CSP with sandbox and script/connect denial.
- Video uses maintained Mediabunny 1.55.7, a bounded CustomSource, track/packet limits and every encoded packet with key-packet verification. This verifies container/packet structure, not complete codec decoding. Additional files and network access are unavailable. Worker heap limits, 30-second deadline, shared admission queue and unconditional termination bound inspection; source upload retains the existing five-minute storage deadline.
- No FFmpeg production dependency was added. MDN CC0-labelled MP4/WebM and pinned MIT Tabler SVG provide independent normal fixtures; hashes and license are retained in `packages/core/src/adapters/node/import/__tests__/fixtures/MEDIA.md` and `../licenses/`.

Official adoption references: [Mediabunny input sources](https://mediabunny.dev/guide/reading-media-files), [packet sinks](https://mediabunny.dev/guide/media-sinks), [package/Node exports](https://github.com/Vanilagy/mediabunny/blob/main/package.json), [security advisories](https://github.com/Vanilagy/mediabunny/security/advisories). Exact dependency is fixed in pnpm-lock.yaml. Node runtime declaration remains >=22.13.0; actual final checks so far use 22.22.3.

## Commands and results

| Time (2026-09-06 JST) | Check | Result |
| --- | --- | --- |
| 05:23 | Focused inline processor | 20/20; independent normal files, truncated payloads, SVG safety/structure, deadline and worker reuse |
| 05:25 | New asset DB integration | 7/7; quota race, draft-only upload, media-only save, reference auth, Range, cleanup, future pins |
| 05:19 | UI helper focused regression | 6/6; URL/markup and rendering contract |
| 05:27–05:30 | `pnpm typecheck`, `pnpm lint:fix`, `pnpm format` | Typecheck passed. Initial lint found one control-character regex diagnostic; replaced with character-code validation. Rerun lint and format passed. Existing 23 informational suggestions unchanged. |
| 05:30:45 | `pnpm test:unit` | 20 files, 207 tests passed |
| 05:30:56 | `pnpm test:integration:node` | Migration generation included; 9 files, 68 tests passed |
| 05:31–05:32 | Clone migration, `pnpm build` | Passed, Node production bundle generated |
| 05:33 | `pnpm audit --prod --json` | Existing aggregate 5 low / 33 moderate / 20 high, 0 critical. No advisory for mediabunny, sharp, sanitize-html or fast-xml-parser. This is not a clean whole-workspace security audit; unrelated dependency remediation not performed. |

## Environment snapshot at 05:37 JST

- Original P2a DB `/tmp/hollow-p2.sj33Bk/app.db` remains untouched. macOS sqlite3 `.backup` created `/tmp/hollow-p2b.dAfzgS/app.db` online; migration 0003 applied only to the clone. Clone retained 5 accounts and 330 notes before new test signup.
- Old production session 6016 stopped normally before build; new session 11623 is running on port 3000, HTTP 200. Storage remains `/tmp/hollow-p2.sj33Bk/originals`, mailbox `/tmp/hollow-p1-S1piZT/mailbox`.
- Dedicated browser session `hollow-p2b-media`, agent-browser 0.36.0. Signup for `p2b-media@example.test` succeeded; password/token are not recorded. UI authentication verification and media scenarios are still pending due intermittent command startup delays. No unrelated browser/OS process was changed.

```sh
DATABASE_URL=file:/tmp/hollow-p2b.dAfzgS/app.db \
APP_URL=http://localhost:3000 \
HOLLOW_MAIL_MODE=local \
HOLLOW_MAILBOX_DIR=/tmp/hollow-p1-S1piZT/mailbox \
HOLLOW_STORAGE_DIR=/tmp/hollow-p2.sj33Bk/originals \
HOSTNAME=127.0.0.1 PORT=3000 pnpm start
```

This early environment snapshot is superseded by the final observations and handoff below.

## Production browser observations, 05:38–05:44 JST

- Real signup and local-mail confirmation succeeded after the delayed command returned. No DB auth bypass was used. Browser CLI requests between batches sometimes returned to about:blank; explicit current-task session, restored cookies and an explicit start URL per complete scenario kept tests reproducible. Same-batch SPA transitions were measured separately from those start URLs.
- No-title/no-text PNG insertion created no initial note, then autosaved the image-only body to note `01a0734b-244b-76b3-9fba-d48c3486635e`. Stored media URL uses that note ID. Complete → SPA detail loaded a 91-pixel-wide PNG in the real allow-same-origin-only iframe; reload repeated that result. I inspected `media-only.png` directly.
- Three concurrent actual file uploads (MDN MP4, MDN WebM, malicious SVG) finished and autosaved in production without new server errors. Four media nodes survived subsequent Japanese typing and the WYSIWYG → HTML switch. HTML preview reported both videos at width 960, durations 5.059/5.055 seconds.
- Both video elements sought to 2 seconds in the detail iframe. Actual cookie-bearing HTTP Range returned 206 with 16 bytes, HEAD returned 200 with zero body, out-of-bounds Range returned 416, exact MIME and private/no-store were present. I inspected the 390×844 screenshot `media-mobile.png`: PNG and both flowers videos were visibly rendered without horizontal overflow.
- Malicious HTML was entered using the actual controlled textarea and passed the real production sanitizer. At preview and after Complete → SPA detail: parent sentinel unchanged; iframe href count 0; script/form/base/meta-refresh/nested-frame/object/onerror count 0; authorized PNG/SVG widths 91/300; trusted parent exposed only the explicit `https://example.com/` link. Canonical HTML retained safe hrefs; render-only spans were not written back into it.
- DevTools request list showed attempted CSS image URLs without status. That list alone does not prove bytes reached the server. Exact-source CSP was observed, but an explicit blocked-request/disposition observation is still pending; this is not yet recorded as a successful no-request proof.
- Broken GIF produced a failure placeholder, retry, remove and same-file reselection worked; Complete after removal returned to the list with the test account still having exactly one note. Initial error text was overly generic: the raw HTTP error envelope was being fed to the server-function error extractor without its structural wrapper. The new focused test and helper preserve business reasons while hiding unknown/system details. This UI-only fix awaits final production confirmation.
- Removal notices now accumulate for the current editor session through autosave, block automatic route replacement that would discard them, and have an explicit confirmation/dismiss button. Discard or leaving the editor ends this operation-local notice scope; no persistent audit feature is added.

Temporary scripts/fixtures/screenshots are under `/tmp/hollow-p2b.dAfzgS`. They are local verification aids, not production dependencies.

## Final contract refinements and automated checks

At 05:55 JST, Manager adopted a narrow same-note reattachment contract. Asset reads still require a current reference. A save may reattach an unreferenced ready asset only when the authenticated user can edit the note, the asset's original draft is durably bound to this same note, and the unreferenced period is less than seven days. It cannot borrow assets from another note or an unbound draft. The save exception does not renew an expired draft's 24-hour new-upload permission. Deleting, collected and grace-expired assets remain unavailable. Twenty-version pin integration remains P2c work.

- 05:56:39 JST: final typecheck, lint:fix, format and focused UI 7/7 passed.
- 05:56:41 JST: final Node integration, including migration generation, 9 files / 69 tests passed. The added real DB case separates GET 404 after removal, same-note later save, GET 200 after reattachment, other-note/unbound denial, expired new-upload denial, and deleting/grace-expired/collected denial.
- 05:58 JST: final production build passed, restarted as session 25138 with the same clone DB and retained storage. All these app checks use Node 22.22.3. The unit 207-test run predates the final UI error helper/notice and reattachment edits; final changed paths have the focused 7-test and full 69-test integration results, not an invented 208-test full-run claim.
- 05:52 JST: the final HTTP-envelope UI fix displayed the specific broken-GIF message, including resaving advice, instead of the generic unknown-error text.
- 05:53 JST: malicious SVG-only draft reached 保存済み while remaining on `/notes/new` with visible removal categories and the explicit confirmation/dismiss button. No notice-discarding route replacement occurred. Its saved note is `01a07358-1370-711a-9daa-89703b67b49a`.
- Direct SVG navigation displayed the saved safe SVG. Observed script/foreignObject/style/event/image count 0, marker absent, one gradient, one clipPath, viewBox `0 0 320 160` and Japanese text preserved. I inspected `svg-direct.png` directly.
- Explicit CSP instrumentation on the real sanitized iframe observed `securitypolicyviolation` for a same-origin CSS image URL with `effectiveDirective=img-src`, `disposition=enforce`. Synthetic auxclick/Enter events on rendered inert spans left parent location unchanged and frame at about:srcdoc. Initial live hrefs were already absent, so protection does not depend on event timing or navigate-to.
- Actual anonymous GET, HEAD and invalid-Range requests returned 401; a same-account wrong-note URL returned 404. Other-account denial is covered by real DB HTTP tests; a separate production B-account browser run has not yet been performed.
- HTML drop used a real File inside a DataTransfer and dispatched its drop event to the textarea. This tests the actual File/drop handler, not an OS drag gesture. The PNG-only note `01a07354-fb43-71dc-87de-cba51cbd3350` autosaved and reloaded with a 32-pixel-wide preview image. The initial script queried the textarea during route transition and failed its observation; the explicit follow-up confirmed the saved HTML and real preview.

## Target identity, 05:58:36 JST

- Branch `main`; commit `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`. No commit created.
- Whole in-scope code fingerprint: `b9f13b9aeb52986515fc55edae4e9f26040d2d1131673f206ddcd08e7dc570b8`, 487 files. Sorted, deduplicated `git ls-files -co --exclude-standard -z`; `.goal-implement/` excluded; SHA-256 of path + NUL + file bytes + NUL. Includes all tracked modifications and untracked files, not only this phase.
- Worktree has 21 tracked modified entries and 75 untracked porcelain entries (directories may be grouped); prior phase/user changes are retained.
- Lockfile SHA-256 `02ee47aa5787fe11fb3b49d819a8283c1cdd7778803985e29d0a3d7cc209680e`.
- A Node 22 browser orchestration command was interrupted after several minutes of no output; the known Node 24.19.0 executable subsequently ran the final browser orchestration scripts. It invokes the same agent-browser CLI; the application and all automated checks remain on Node 22.22.3.

## Final browser results, 06:07–06:11 JST

The browser reports `HeadlessChrome/152.0.0.0` on a Macintosh user agent. Desktop 1280×633 and mobile viewport 390×844 were tested. Mobile means viewport emulation, not a separate iOS device.

| Scenario | Final observation |
| --- | --- |
| Same-note two-tab later-save-wins | Two live tabs `t1`/`t2` in the same restored browser session. B retained the old image HTML and a distinct unsaved title. A removed the image and saved; GET returned 404. B's real Save button restored the old HTML; 保存済み, no alerts, GET 200. Complete → SPA detail showed B's title and the 32-pixel PNG. |
| Controlled two-tab timing | B's 1800 ms autosave timer alone was delayed by test instrumentation so A could commit first; B used the actual UI save and real HTTP authorization. No backend result was mocked. Earlier trials used obsolete numeric tab IDs or an unchanged title, so they were not counted as passes. |
| Missing/expired asset UI | A missing asset ID under the current authorized note produced 未保存です with deletion/expiry, re-read and reinsertion advice. The complete typed HTML matched the localStorage backup. Discard restored the persisted safe SVG and Complete displayed it at width 300. The browser uses a missing-ID fixture; exact seven-day expiry, deleting and GC-deleted states are tested in real DB integration. |
| Notice persistence and dismissal | Actual `<script>` removal remained visible after autosave with 保存済み. The explicit confirmation button dismissed it; normal completion then navigated. This is operation-local notice state, not a persistent audit ledger. |
| HTML → WYSIWYG and normalization | Confirmed the supported-mode conversion, kept the SVG node, typed new Japanese text with the real bold toolbar, saved and completed. Detail retained the SVG at width 300 and bold text `切替後の太字入力`. |
| Pending upload navigation | Test instrumentation held the actual XHR body send to create deterministic in-flight time. Clicking the real upload navigation link invoked confirmation once; cancelling kept `/notes/new` with メディアをアップロード中. Releasing the real send completed insertion and image-only autosave to note `01a07368-3aea-72e8-a039-62bbd3493726`. No empty note was created by upload initiation. |
| Restart persistence | After production rebuild/restarts, the same PNG/SVG and both videos loaded again from the clone DB and private storage. Final HTTP health is 200; final production log contains startup only, no new resource-queue/SQLITE_BUSY errors. |

The tested own account is `p2b-media@example.test`; four own notes were created. Earlier A/B accounts, original files and notes remain intact. Passwords, cookies and mail verification tokens are intentionally omitted. Test scripts under `/tmp/hollow-p2b.dAfzgS` document controlled timing, actual File/drop, the missing-asset fixture and UI sequences.

## Limits and existing acceptance impact

- P2b-A/B and ED-06 are ready for independent acceptance. P1-C is reopened only for actual sanitizer/render/preview isolation; P1-D for asset authorization/persistence; P2a-D for aggregate quota/reservations. The expanded 69-test Node suite includes existing account/session, note authorization, import, outbox and processed-event regressions.
- A separate production B-account browser session was not run. Other-account GET/HEAD/Range denial is tested with real sessions and real DB through the actual HTTP handler; anonymous and wrong-note paths also have production browser HTTP evidence. The independent verifier can reuse its preserved A/B accounts.
- Real File/drop was tested with a DataTransfer, not an OS desktop drag gesture. Auxclick/Enter on inert spans used synthetic events; absence of live hrefs exists before first mount and does not rely on those events. No navigate-to or after-load click interception is the security boundary.
- Full video codec decoding, all MP4/WebM variants, encrypted-video fixture coverage, every browser/OS, production HTTPS and exact Node 22.13.0 minor-version execution were not claimed. Declared floor remains >=22.13.0; actual Node tests/build/server use 22.22.3. SVG styling subset losses are disclosed above.
- Seven-day grace GC and positive version-pin fencing are implemented and tested. User-facing 20-version history and its pin integration are not implemented. No P2b-C/D external fetching/CSS processing, AI connection, shared/public grant or trash work was added.
- Scope-local audit found no advisory for the adopted parser/sanitizer/image packages; unrelated workspace advisories remain explicitly open, not silently treated as resolved.

## Final handoff

- 2026-09-06 06:11:17 JST: dedicated `hollow-p2b-media` browser closed, including its own tabs. `p1_ui` helper had already completed and stopped writing. No unrelated browser session or OS process was closed.
- Code fingerprint was rechecked after browser completion: **487 files, `b9f13b9aeb52986515fc55edae4e9f26040d2d1131673f206ddcd08e7dc570b8`**, unchanged from 05:58. Commit, worktree and lockfile identity are listed above. Only this report was updated after that check.
- Production remains running: **session 25138 / PID 68987**, `http://localhost:3000`, HTTP 200. DB `/tmp/hollow-p2b.dAfzgS/app.db`; private storage `/tmp/hollow-p2.sj33Bk/originals`; local mailbox `/tmp/hollow-p1-S1piZT/mailbox`. The launch command above applies unchanged.
- Original pre-P2b DB `/tmp/hollow-p2.sj33Bk/app.db` is retained and unmodified. The production clone contains preserved prior data plus this phase's four own test notes. No original attachment was made inline or deleted.
- All implementation code, dependency, environment and browser mutations are stopped for independent verification. No next-phase work has started.
# V1 revision — draft staging と現在本文参照の分離

2026-09-06 06:58:25 JST に修正候補を固定した。独立レビュー `reviews/P2b-media.md` の V1 のみと、その HTTP / preview / migration への影響を修正した。下記が今回の最終根拠であり、以前の「draft の本人認可で十分」とする根拠を置き換える。P2b-C の本体実装には進んでいない。

## 変更と読み書きの契約

`Asset.committedToNote` を永続化した。新規 upload の検査・保存完了時は false。本文への初回確定は `saveNote` の note / current reference / draft bind と同じ UoW 内の `replaceCurrentReferences` で true にする。参照除去・再添付・GC の経路に false へ戻す処理はない。`unreferencedAt` の時刻比較を履歴の代用にはしていない。

| 状態 | 旧 draft URL の読取 |
| --- | --- |
| bind 前・未確定 | 本人・同 draft・24 時間内・ready を確認して許可 |
| 既存 note に bind して始めた draft の新規未保存 asset | 上記と現在 note の閲覧認可を確認して staging を許可 |
| 本文へ一度確定した asset | 上記に加え bind 先 note の現在本文 ref を確認 |
| 確定後に現在 ref を除去 | GET / HEAD / Range / 範囲外 Range をすべて 404、Content-Range なし |
| 現在 note が閲覧不可・他人・別 draft・期限切れ・deleting | 拒否 |

`application/asset/access.ts` の `canReadDraftAsset` を HTTP 用 `authorizedAsset` と `renderNote` の許可 URL 判定で共有する。呼び出す前に `requireDraft` と account/asset ready の検査を行う。preview だけ旧 draft を許可し続ける条件差も解消した。配信 handler、Range parser、sanitizer、iframe sandbox/CSP、SVG processor、Cookie 属性は変更していない。

保存限定再添付は既存契約を保持する。同一 note への現在の編集認可、永続 origin draft→note bind、ready、未参照 7 日未満が必要である。再添付によって current ref が復活した後は旧 draft URL も期限内だけ現在 ref に基づいて読めるが、staging 権利へ戻るわけではない。24 時間の新規 upload 期限を復活させない。将来 20 版 pin の実接続は未対象。

変更ファイルは domain asset entity、libSQL schema/repository、application asset access/references/uploads、assets integration test、migration `0004_previous_garia.sql` とその生成 snapshot/journal。共有 UoW / transaction resource queue / parser / dependencies / UI code は変更していない。

## Migration と既存データ

旧 schema は「過去に本文へ確定したか」を持たない。migration 0004 は新 boolean column を追加し、既存の bind 済み draft に属する asset を保守的に true へ backfill する。unbound は false を保持する。現在 ref を失った asset を、時刻や owner 一致から staging と推測して許可しない。

移行時点で bind 済み note の未保存 staging が存在した場合、その旧 draft URL は読めなくなることがある。原本 object、HTML、local backup を削除せず、再挿入が必要となる。既存の `ASSET_NOT_FOUND` 表示は「入力内容を退避してノートを再読み込みし、メディアを挿入し直してください」と案内する。旧未保存 asset の再挿入を自動実行したと偽らない。stop-before-migrate/build/restart とし、旧ソフトとの rolling 混在運用は今回行っていない。

変更前に macOS sqlite3 の online `.backup` で `/tmp/hollow-p2b.dAfzgS/pre-v1-backup.db` を作成した。backup の integrity_check は ok、335 notes / 11 assets。production 25138 / PID 68987 を SIGINT で正常 drain（launcher exit 130）した後、指定 DB へ正式 migrator を適用した。migration 後も 335 notes / 11 assets、11 committed、integrity ok。元の P2a DB、storage と mailbox は保持した。

実 DB 回帰は旧 column を持たない schema を再現し、正式 migration SQL を実行した。既存確定、参照除去済み、unbound、bind 済み旧未保存 staging の 4 ケースを確認した。前 2 件と旧 bound staging は true、unbound は false。現在参照の取得・unbound staging は 200、参照除去済み・旧 bound staging は 404。4 object の stat/bytes と既存 HTML の保持を確認した。

## 自動検証

| JST / コマンド | 結果 |
| --- | --- |
| 06:50〜06:52 `pnpm --filter @repo/web db:generate:node` | migration 0004 / snapshot 生成成功。Node/PATH 初期遅延は既存 session 回収で復帰 |
| 初回 `pnpm typecheck` | 追加 test の optional noteId が exactOptionalPropertyTypes に違反。test の条件付き property 展開へ修正。製品コードの型エラーなし |
| 06:53 `pnpm typecheck && pnpm lint:fix && pnpm format` | 最終 exit 0。Biome の既存 unsafe suggestion 23 infos は適用せず、今回 3 files の通常整形のみ |
| 06:53:12 `pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/assets.integration.test.ts packages/core/src/adapters/libsql/__tests__/hollow.integration.test.ts --no-file-parallelism` | 26 / 26、10.33 秒。assets 11（今回 3 追加）＋既存 account/note 15 |
| 06:53:49 `pnpm exec vitest run apps/web/app/components/hollow/editorMedia.test.ts apps/web/app/presentation/mediaHttp.node.test.ts --no-file-parallelism` | 9 / 9、600 ms |
| 06:53:57〜 `DATABASE_URL=file:/tmp/hollow-p2b.dAfzgS/app.db pnpm db:migrate:node && pnpm build` | 正式 migration と production build 成功。既存の同名 CSS emit warning は継続 |

assets の追加 3 test は V1 の現状 200 を期待値にコピーせず、除去後の 404 を期待する。bind 前/後、GET/HEAD と通常/部分/範囲外、preview 許可集合、既存 note の新規 staging、確定→除去→再添付→再除去、note 閲覧不可、24 時間、backfill の正反を確認する。既存の他人/匿名/別 draft/note、7 日・deleting・GC、quota、version pin 保持も同じ 11 件内で成功した。最初の integration 実行後の source 差は test の optional property の型修正と整形であり、実行時の対象条件は変えていない。

重い document/media parser 全件、全 runtime integration、全 unit 207 件の再実行はしていない。これらの無変更部分は既存受入の根拠を保持する。

## 実本体の最小操作

Node22.22.3 production、agent-browser 0.36.0 の専用 `hollow-p2b-media`、HeadlessChrome 152 / Mac UA、1280×633 で実施。起動完了前に一度 navigation が connection refused となったが、listener ready 後の再試行は成功した。異なる Node runtime へアプリを切り替えていない。

1. 新規空 note へ実 file input から正常 PNG を upload。タイトル/文字入力なしで「無題」「保存済み」へ自動移行し、draft URL から安定 note URL へ変換された。生成 note は `01a07391-ef92-717e-971d-967af678e346`、初回 asset は `01a07391-e62f-733d-9a08-1140c9d4c074`。HTML mode の実 preview は naturalWidth 32。
2. 自身 note の HTML を実 fill で `<p>V1 removed media</p>` に変更し autosave。旧 draft と安定 note の両 URL で GET/HEAD × Range なし/0-9/範囲外の全 12 通りが 404。Content-Range は全件なし、HEAD body は 0。preview の画像数も 0。
3. 保存済み同一 note URL を本文へ実 fill で再添付。autosave 後に preview 幅 32、旧 draft と note URL は通常 200、部分 206（GET 10 bytes）、範囲外 416 へ戻った。保存限定再添付が読取条件を緩めず成立した。
4. ページを再読み込みして既存 note の編集 draft を新たに作り、別 PNG を実 upload。観測のため自分のタブだけ autosave timer 1800 ms を 15000 ms へ延長した。未保存状態で既存 stable image と新 draft image がともに preview naturalWidth 32、追加 draft GET 200。DB は 13 assets / 12 committed。これは test-only の観測待機であり、製品 timer の変更ではない。
5. 延長した timer の自動保存後、両画像が stable note URL / naturalWidth 32、「保存済み」、13 assets / 13 committed へ移行した。実「完了」の SPA 詳細と reload の両方で幅 32 の画像 2 件を保持した。reload で test-only timer/XHR 観測の変更も消えている。

`/tmp/hollow-p2b.dAfzgS/v1-browser.mjs` が操作・読取 matrix の再現用補助。XHR の正常応答から自身 asset URL だけを記録し、Cookie/token を出力していない。`v1-staging.png` は未保存 UI の上部、`v1-detail.png` は reload 後の本文。両画像を自ら開き、前者の未保存表示、後者の画像 2 件を確認した。staging の画像寸法は画面外だったため screenshot の視覚証拠とせず DOM 観測の根拠とする。

最終 DB は 336 notes / 13 assets、integrity_check ok。追加したのは自分の note 1 件と PNG 2 件で、既存 335 notes / 11 assets を削除していない。

## 項目への影響・残条件

- P2b-A/B、P1-D: draft staging / current ref 境界、migration、HTTP の認可先行を今回の候補根拠へ置き換える。独立再検証を依頼する。
- P1-C: asset 許可 URL の判定だけ今回再検証対象。HTML/SVG sanitizer、リンク表現、CSP、sandbox は無変更で、既存の独立悪性 fixture 根拠を保持する。
- P2a-D: quota/reservation/storage I/O 契約は無変更。asset repository の追加 marker 書込みに関連する既存 quota/GC test は再成功。原本も削除していない。
- 未指定 browser/mobile、独立 B browser、production 7 日経過/実 GC、migration 時に残る実ブラウザの旧未保存 staging は今回 UI 再実行していない。権限・期限・GC と旧 staging の移行結果は実 DB test による。20 版 pin と P2b-C 以降は未対象。

## 固定対象・handoff

06:58:25 JST、HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a` / main、commit 作成なし。tracked modified 21、untracked porcelain entries 75。`.goal-implement/` 除外で全 tracked/untracked 実ファイルを含む fingerprint は 489 files / `deb0ae0a12248bb263b33fe89cdbe72053434a8141e8edd0fde287041414c0ef`。06:57:25 と終了時の 2 回一致。lock hash `02ee47aa5787fe11fb3b49d819a8283c1cdd7778803985e29d0a3d7cc209680e` は前回から不変。

production は session `45804` / PID `85615`、http://localhost:3000。DB `/tmp/hollow-p2b.dAfzgS/app.db`、storage `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox`。起動環境変数は本報告の既存起動例と同一。バックアップ `/tmp/hollow-p2b.dAfzgS/pre-v1-backup.db` を保持する。

自身 browser は 06:58:25 JST に個別 close 成功。補助 agent / listener は起動していない。起動遅延 session・test・build は回収済みで、実行を維持するのは引継ぎ対象 production だけ。直近 production log に新規 error / SQLITE_BUSY はない。focus-debug / 他 OS process に触れていない。manual-test は委譲範囲の観測・専用 session 管理に限定して使用し、global cleanup / 外部 Issue / 追加担当 / 全体 goal 更新を行わない。

この報告をもって全コード・browser 操作を停止する。
