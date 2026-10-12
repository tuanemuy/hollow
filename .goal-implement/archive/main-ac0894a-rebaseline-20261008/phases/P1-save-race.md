# P1-B 新規保存移行 V5

## 結果と固定対象

V5 修正の自己検証候補。HTML/WYSIWYG の保存待ち中の入力、続く追加入力、明示完了、通信失敗後の同note再試行・退避復元を確認した。P2b-B の media-only / draft→stable / 復元の狭い影響範囲も確認した。独立受入は Manager / Verifier の判断を待つ。受入済み V1〜V4 と P2b-D 以降は変更していない。

- 最初の実clock: 2026-09-06 10:36:08 JST。
- コード固定・専用browser終了: 2026-09-06 10:57:26 JST。
- 開始: 519 files / SHA-256 `7aad4d35f5077614c4eebf22f9773468707bde3e3242e2f6773df03bf52bfca7`。
- 候補: 521 files / SHA-256 `a6bfa0752314a8505acca70b8fa6a276aeb66072fbb9776a57c63e9661771c5e`。
- main / HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。新しい commit は作成していない。
- lock SHA-256 `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`。依存・schema・migration は不変。
`.goal-implement/` は Manager 文書を含むため除外。git status の集計は modified23 / untracked entries88（ディレクトリ表示を含む）。既存の未コミット・未追跡変更も候補識別に含む。

## 変更

変更は `apps/web/app/components/hollow/NoteEditor.tsx` と、新規 `editorSave.ts` / `editorSave.test.ts` の3ファイル。

### 保存から移行まで

独立再現の原因は、save応答時に算出した `unchanged` を `await router.invalidate()` 後も使うことだった。待ち中の新しい本文は new用退避に残るが、古い空本文で新しい edit component がmountし、空の保存済みになる。

新しい処理は次の順で進む。

1. 最新snapshotを保存する。作成応答を受けた時点で `persisted.current` に同note ID/versionを確定する。
2. 応答までに変更がなければ、安全化後の本文を受け入れる。変更があれば入力中の本文/titleを保持する。
3. invalidate完了後に最新入力を再比較する。新規または明示完了では、差分があれば同ID・直近versionへ最新snapshotを続けて保存する。さらに次の入力も同じ経路でまとめる。
4. 入力が安定した場合だけ、移行中の短い入力ロックをDOMへ同期反映する。同期反映で直前の入力が適用された場合も再比較する。
5. stable edit / 詳細へ移行する。移行失敗時はロックを解き、同noteへ再試行できる。保存エラーは自動的に反復せず、未保存・再試行・退避を維持する。

通常の保存・invalidate待ち中は title、HTML、WYSIWYG を入力できる。入力handlerは最新refを同期更新する。ロック中だけ入力欄・編集モードを無効化する。既存noteの通常autosaveでは差分を次の1800ms debounceへ残し、全autosaveを即時連続保存へ変更していない。安全化の除去案内がある場合は、既存どおり画面に残して確認できる。

DOM同期には [React の flushSync](https://react.dev/reference/react-dom/flushSync) を使う。非同期route移行へ入る直前だけに限定し、通常のtypingや保存応答ごとには使わない。Reactが同期反映時に保留中の更新を反映できるため、その直後にも入力を再比較する。

### 退避の移行

- namespaceは従来どおり `hollow:draft:{userId}:{noteId|new}`。
- 作成応答後の最新入力は stable noteキーへ保存し、その後newキーへ移行先IDを記録する。元ID/versionを再利用する認可根拠ではなく、本人の通常edit routeを開くための情報である。note取得・保存・asset認可は既存server境界を通る。
- new画面でreloadした場合は「作成済みノートを開いて復元する」を表示する。stable画面で既存の「復元する」を選び、最新内容を同noteへ保存できる。
- stable画面へ到達すると一致するnew移行情報を消去し、保存済みになったstable退避も消去する。別利用者・別noteの退避は消去しない。
- title/html/draftId/参照on-offと一時的な編集modeだけを保存する。modeは `html|wysiwyg` のみ認識する。これは退避復元のmodeであり、未実装ED-05の利用者既定設定ではない。
- 旧modeなし・移行先なしのnew退避も読み取れる。不正mode/非UUIDの移行先は採用しない。移行先で保存権限を省略しない。
- storage書込失敗は警告を表示する。stableへの書込が失敗した場合は移行先を先に公表せず、既存new退避を残す。ブラウザstorage自体が利用できない場合の再起動後復元や、初回POSTのcommit済み応答が丸ごと失われた場合のexactly-once作成まで新たに保証する変更ではない。V5は作成応答を受信済みの移行競合を対象とする。

## 自動試験

Node22.22.3。仮想DOM依存やreact-test-rendererは追加していない。抽出したcomponent保存・退避ロジックの13件と、実React本体のtrusted入力を組み合わせる。13件だけをReact component全体の自動試験と呼ばない。

| 実行 | 結果 |
| --- | --- |
| `pnpm typecheck && pnpm lint:fix && pnpm format` | 最終10:56頃、成功。346 files、既存infos23。最後のformat変更はtestの整形だけ |
| `pnpm test:unit` | 10:50:31開始、271 tests / 25 files成功、8.52秒。mode保持実装を含む。後続変更はmode型注釈と不正modeの追加assertのみ |
| `pnpm exec vitest run apps/web/app/components/hollow/editorSave.test.ts apps/web/app/components/hollow/editorMedia.test.ts` | 最終10:56:46開始、22件成功（保存・退避13、既存media9）。型注釈/不正mode assertを含む最終対象 |
| `pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/assets.integration.test.ts packages/core/src/adapters/libsql/__tests__/hollow.integration.test.ts` | 10:45:43開始、26件成功、4.23秒。note保存/認可・asset/draft/ref等の無変更サーバー正常対 |
| `pnpm build` | 最終10:51頃、成功。NoteEditor source mtime10:50:10、editorSave source10:50:44、server成果物10:51:16。以後production入力source変更なし、test assertだけ追加 |
| 同設定 `pnpm start` | Node22.22.3で成功。最終productionでmedia-onlyと通信失敗/復元を確認 |

保存ロジックの根拠は、HTML/WYSIWYG相当本文、save応答中/refresh中/次のrefresh中の変更、lock同期反映時の追加入力、移行失敗のunlock、同ID再試行、除去案内時の滞在、既存noteの通常cadence。退避は旧形式、stable先書込、両key cleanup、利用者分離、storage失敗、別移行先の保持、不正ID/modeを確認した。

途中の型検査はmode returnの型拡張で `string` へwidenされ1回失敗した。`EditorMode | undefined` の注釈で修正し、最終型検査は成功。独立再現helperは変更していない。無関係な全Node94件・全runtime integration・全codec負荷を再実行していない。共通backend/source/依存の無変更範囲には前候補の独立合格を適用する。

## 本体操作

agent-browser0.36.0、自分専用session `hollow-p2b-media --restore`。実入力はCLI `type` を使い、競合区間の `input.isTrusted=true` を確認した。タイトルの準備用 `fill` にはsynthetic clear eventも含まれるため、全イベントがtrustedという主張ではない。

独立helperの派生 `race.cjs` は本人tabのfetchだけで、タイトルsave応答後の次のGETを最大12秒保留する。実際は約0.43〜0.49秒で入力・解放した。`continued.cjs` は2回のGET待ち、明示完了、作成後の次POSTだけ失敗する条件を追加する。body/Cookie/認証情報をファイルへ保存せず、入力・phase・scope・note IDだけを観測した。

| ケース | 本体結果 |
| --- | --- |
| HTML 1回待ち | `01a07464-51c7-7654-97c3-c6f9ba82b74c`、version1、`<p>V5-html-CONTINUED</p>`、同note edit/保存済み、backup0 |
| WYSIWYG 1回待ち | `01a07464-9428-717b-9c6e-b97abd1ac795`、version1、`V5-wysiwyg-CONTINUED`、同note edit/保存済み、backup0 |
| HTML 2回待ち＋title追加 | `01a07465-9abd-76b7-99d8-dd76c3fd4afe`、3 save/1 note/version2、title `V5-html-multi-LATEST`、FIRST/LATESTの両段落、backup0 |
| WYSIWYG 2回待ち＋title追加 | `01a07465-f91c-743b-98bf-84d8ba9e09c6`、3 save/1 note/version2、title `V5-wysiwyg-multi-LATEST`、`V5-FIRST V5-LATEST`、backup0 |
| HTML 明示完了中に追記 | `01a07466-59a6-715a-b753-c63ca38b3e0c`、version1、最新本文V5-FIRSTを保存し詳細iframeへ到達 |
| WYSIWYG 明示完了中に追記 | `01a07466-8560-74fc-9744-cc9bc6537c83`、version1、最新本文V5-FIRSTを保存し詳細iframeへ到達 |
| HTML 次保存失敗→reload→復元 | 最終mode保持版は `01a0746c-1d71-7493-a0cb-a719eaea321d`。失敗中はnew/未保存、newとstableに同じ本文＋mode=html。reload後HTML modeを保持し、作成済noteへの導線→復元→完了で同ID/version1・backup0。初回確認用 `01a07466-c189-72b8-afbb-0eaeede455d4` も保持 |
| WYSIWYG 次保存失敗→その場再試行 | `01a0746d-09bc-734f-bfad-60f6b0a5902e`。失敗中の本文/移行先を保持。fetch復元後「再試行」で同ID/version1・edit本文V5-FIRST・backup0 |
| 無入力 | newを開き何も入力せず完了。前後361 notesで新規作成なし |
| media-only / draft→stable | SVGだけを実File inputで挿入。upload開始時は361 notes/29 assetsのまま、完了後に無題1 note/version0を作成。`01a0746a-a792-7139-a33c-62de63110d32`、stable asset `01a0746a-9f50-7436-b5ba-1ae625847724`、描画成功、backup0 |
| media typing＋通信失敗→reload復元 | 同media noteでWYSIWYG追記とtitle変更、本人sessionのserverFn通信をabort。未保存・stable退避mode=wysiwyg。route解除→reload→復元→完了でversion1、title `V5-media-restored`、追記と同assetを保持。mobile390×844の画像を自身で確認 |

最初の6ケースは保存ロジック修正後・mode保持追加前のproductionで確認した。mode追加後はHTMLのreload復元とWYSIWYGその場再試行、media-only/復元を再確認した。保存状態遷移自体はmode追加で変更していない。最後のfull reloadで `window.__v5restore` はundefined、backup数0。network routeも解除済み。

## 一時成果と保全

一時dir: `/tmp/hollow-save-race.yABnL1`。新たな外部write・メール送信・課金処理は行っていない。

| 成果 | SHA-256 |
| --- | --- |
| 派生 `race.cjs` | `909a0d16996a1eb258f9c6677bcab9bf305d768128801ea67e17d229bda8dacd` |
| `continued.cjs` | `274306cfd2fd8b1464825c5892ec0806765985a5713804451dfdf3dbb0d17db6` |
| `media-recovered-mobile.png` | `203cef8427894ef6685eb8c3999412e5609a8f388e9a5ba9fdf6b604b1e80b73` |
| 不変の元独立 `race.cjs` | `c521c6be8722560942cada6556ae3fd81d346503fa0d54a4dfe04ae17754dfad` |

media fixtureは既存独立CC0 `safe.svg`（482 bytes、gradient/clipPath、SHA-256 `9d0f19525d8ee5baf630ebae3879a866b3fd5ead7e0a7d10f9517706d691b642`）。新codec/サニタイザー合格を意味せず、保存移行・認可された同assetの復元を確かめる正常対として使用した。

変更前にSQLite online backup `pre-v5.db` を作成した。schema/migrationは変更せず、毎回既知の本人productionだけを停止してからbuildした。最終364 notes / 30 assets。backupの旧354 notesは欠落0・html/title/version差分0、旧29 assetsは全column差分0。integrity_check=ok、foreign_key_check違反0。追加10 notes / 1 assetは上表の本人試験データとして保持した。旧backup、原本、既存objectを削除していない。全旧objectの再hashまでは行っていない。

## 影響範囲と引継ぎ

P1-B / ED-01、07、08の新規→stable保存移行と退避を更新した。P2b-Bはmedia-only/draft→stable/復元だけを再確認する。media検査、HTTP GET/HEAD/Range、SVG/HTML sanitizer、sandbox、current ref、参照workerのversion/権限、容量予約は不変。サーバーAPI再設計・版履歴・ED-05利用者設定・P2b-D以降を含めない。

productionは **session36409 / PID15854**、Node22.22.3、http://localhost:3000 で起動を維持する。

```sh
APP_URL=http://localhost:3000 HOLLOW_MAIL_MODE=local \
HOLLOW_MAILBOX_DIR=/tmp/hollow-p1-S1piZT/mailbox \
HOLLOW_STORAGE_DIR=/tmp/hollow-p2.sj33Bk/originals \
HOSTNAME=127.0.0.1 PORT=3000 pnpm start
```

再buildする場合はこのproductionだけを停止する。

自分専用browserは10:57 JSTにclose済み。helper agent未使用、listener追加なし、検査execは回収済み、残すのはproductionのみ。全process名/args/env診断、別focus-debug操作、global cleanupは行っていない。最初のrg遅延は同sessionを回収して完了。起動直後の一度のconnection refusedはlisten開始後に解消した。

manual-testの観測手順とdoc-style/markdown-styleの報告整理を使用した。Manager指示に従い独立操作の再委譲や外部Issue作成はせず、終了時にコード・browser操作を停止する。次はV5と上記の狭い共有影響の独立再検証へ引き継ぐ。
