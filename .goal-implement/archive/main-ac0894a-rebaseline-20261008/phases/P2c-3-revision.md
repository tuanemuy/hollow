# P2c-3 / C3-V1 明示破棄の修正

## 対象と状態

2026-09-10 JST。P1-B / P2c-3-B・E、ED-08 の保存失敗後の明示破棄を対象とする。Manager 採用の初回準備 metadata 補強に限り P2c-3-D も対象とした。自己検証を完了した修正候補であり、独立受入は未実施。本フェーズでは stage / commit を行わない。

開始識別は HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、580 files `80cef79dbb95e7a9d42e50886530cf7d90cdee304335c52ae0becd2301c444dc`、lock `d48aeda94b6cf2e8f2ec1298733b05fff3419f775b86b3aab303498ebb9dae53`。開始データは464 notes / 56 assets / 753 revisions。P2d は未着手。

## 原因と変更境界

従来の明示破棄は親の draft を saved へ戻すが、WYS の session を保持した。WysEditor の通常外部更新ガードは dirty な PM 内容を保護するため、この props 変更も外部更新として拒否し、未保存本文を残した。

明示破棄だけで既存 host を unmount し、最後に保存した完全 HTML から新しい編集モデルを準備する。親 draft / saved metadata は既存値を使い、新たな origin / 変換警告を作らない。保存済み HTML の CRLF / 属性 / opaque 部分木は無編集で正規化しない。準備結果の source 完全一致、既存 mode request 所有、現在本文・WYS metadata・mode・composition・未完了 media を採用前に確認する。

準備失敗・取消は未保存 PM を「保存済み」として残さず、保存済み本文の退避 JSON / HTML 回収と再試行を提供する。後続 mode / 履歴 / unmount が古い準備を失効させる。古い成功・失敗は現在 host / error / backup を更新しない。実行中 save の破棄は拒否し、正当な save accept と作成済み ID は既存処理が所有する。

変更は `NoteEditor.tsx`、`wysDiscard.ts`、`wysDiscard.test.ts`。通常 WysEditor 外部更新保護、backend / schema / migration / 依存 / C1 20版・pin・認可 / 保存 API は不変。

## 自己検証

一時資材は `/tmp/hollow-c3-discard.m6u6Q1`。既存独立・旧自己 helper は変更せず、新規自己 note だけを試験対象とした。browser は専用 `hollow-c3-main`、Chrome / agent-browser 0.36.0。日本語は trusted typing、composition は合成イベント、confirm は本人 tab だけの明示 stub。OS IME / native paste / OS drop の未確認を更新しない。

| 実時刻 JST | 根拠 | 結果 |
| --- | --- | --- |
| 09:47:14.061 | `discard-before.cjs`、新規自己 note | 元 V1 再現。保存失敗後の破棄で PM 追記が残り contenteditable=false、保存済み / key0 と不整合 |
| 09:52:33.889 | `discard-after.cjs`、修正 bundle | 同操作で PM 保存本文 / editable=true / key0。一度の破棄で反映要求なし。その後 trusted 追記保存成功 |
| 09:54:28.019 | `reset-cases.cjs` | 取消は dirty / backup 保持。Worker 準備失敗は dirty host を除去、saved 本文保持 / key0、再試行成功。保留した古い成功の解放後も新 HTML mode を保持 |
| 09:55:53.918 | `media-discard.cjs` | 画像1個・無題の new→stable。説明変更の保存失敗→破棄で同 ID / asset / HTML / version0 / key0。後続説明変更は version1、保存再読込・画像32px・同 asset 成功 |

試験 helper の初回失敗は、再試行ボタン名の相違と new host mount 待機不足・selector 文字列 escaping。製品成功に数えず訂正後の結果を上表へ記録した。

### 自動検証

```sh
pnpm typecheck && pnpm lint:fix && pnpm format
pnpm test:unit apps/web/app/components/hollow/wysDiscard.test.ts apps/web/app/components/hollow/editorModeRequest.test.ts apps/web/app/components/hollow/editorSave.test.ts apps/web/app/components/hollow/WysEditor.test.ts --maxWorkers 1
pnpm test:unit --exclude '.goal-implement/**' --maxWorkers 1
pnpm build
```

- 初回関連51件、全438件 / 42 files、build成功。
- 取消後の再試行案内の補強後、09:58:16開始の全438件 / 42 filesが22.42秒で成功。同 source の typecheck / lint:fix / format 成功、format変更なし。既存 lint 11 warnings / 27 infos は不変で、無関係な unsafe fix は適用していない。
- 管理 `.goal-implement/**` のみを追加除外し、製品 unit は除外していない。Node22.22.3。新6件は reset 準備と PM model の局所テストであり、React 全体の自動テストではない。本体実操作を併用する。
- backend 不変。先行 C3 の最終 Node integration 134 件と独立 backend 根拠を適用し、codec / SSRF / pin を今回再実行したとは扱わない。

## データ・環境保全

`/tmp/hollow-c3-discard.m6u6Q1/baseline.db` は開始時 online backup。09:47:09.102 JST の `preserve.mjs` で notes / assets / note_revisions / note_asset_references / note_revision_heads / originals の開始行全列差0、404 physical objects の bytes / SHA256 全一致。全旧 backup / fixture を保持する。

旧 production PID20632 の開始日時・cwd=`apps/web`・既知 DB path を読み取り確認後に停止して build。新一時 production PID26953 / session67528 を起動し上記実操作を行った。取消案内補強の final build 前に同 PID を停止した。DB / storage / mailbox の所在と設定は変更しない。

## 初回 pending origin の限定補強

10:05 JST に、初回 canonical 準備後・初めての WYS 本文保存前の破棄で、初期 saved Draft に存在しない pending origin が落ちる境界を実本体で確認した。破棄後の追記は保存できるが origin=null となった。Manager が P2c-3-D / ED-04 を再openして採用した次の限定 fallback を追加した。

- 最新要求により採用された clean canonical preparation の source / noteId / 未変換 metadata だけを保存する。変換済 backup の準備はこの baseline を生成しない。
- WYS の明示破棄だけで、saved.wys がない・同 note・saved.html と source が完全一致・baseline 未変換の場合に既存 pending metadata を戻す。
- saved metadata があれば常に優先する。別 source / 別 note / 変換済 baseline / baseline なしは利用しない。HTML / visual の通常破棄へ適用しない。
- 新しい origin 取得・版作成・最新 head への再基準化は行わない。capturedNoteVersion は既存 hint のまま、初回 meaningful 保存で既存 server guard が同 note / 保持版 / version を再照合する。明示破棄だけでは revision / origin を保存しない。

通常外部更新の dirty 保護、client hint を権限根拠にしない規則、20版・prune の server 契約は不変。新3 unit で保存済 metadata 優先、同一 source の既存値引継ぎ、別 source / note / 変換済 / 不在を対にした。

## 最終同一 bundle の実操作

以下は上記 origin 補強後の同一 source / build に対する結果。各 helper の `time` は UTC ISO、表は JST に変換した。保存失敗・Worker 応答保留・confirm は本人の専用 tab だけに設定し、finally で復帰した。

| 実時刻 JST | helper / 対象 | 最終結果 |
| --- | --- | --- |
| 10:09:27.855 | `discard-final.cjs` / 初回 entry | trusted 追記→保存失敗→破棄で saved 本文 / editable=true / key0。context/version 不変。追記保存後の正しい origin=1 |
| 10:09:32.571 | `origin-preserved.cjs` / 保存済 origin | 初回 meaningful 保存の origin1/version1→二度目の保存失敗→破棄。本文、context、版番号、origin1 が完全一致。既存の変換前復元導線を保持 |
| 10:09:38.246 | `reset-cases.cjs` | 取消で dirty と退避を保持。Worker 準備失敗は old dirty PM を除去し saved 回収・再試行。保留した reset 成功を HTML 選択後に解放しても mode/本文を上書きしない |
| 10:09:43.501 | `late-failure.cjs` | 同じ保留境界で古い失敗 protocol を解放。最新 HTML mode と notice を上書きせず、古い理由を表示しない |
| 10:09:49.074 | `ownership-cases.cjs` | 合成 compositionstart→trusted 破棄は host/入力を保持して拒否。別 server 保存を検知しても dirty 本文/退避を維持。破棄して履歴へ移動で reset host を復活させず key0 |
| 10:09:56.621 | `media-discard.cjs` | 画像のみ new→stable、失敗 alt を破棄、同 ID / asset / saved HTML / version0 / key0。その後 alt 保存 version1 / reload / 同画像32pxを確認 |
| 10:10:01.912 | `finish-reset.cjs` | reset 保留中の完了は準備を取消し、saved 回収・再試行を残す。古い結果不採用。trusted 退避 JSON 操作の Blob は format/title/html/mode の4key、完全 saved HTML。再試行→追記保存 / key0 |
| 10:11:20.097 | `pending-guards.cjs` | 実 upload 応答保留中は new のまま、破棄確認の取消で upload 保持、保存/完了は無効。解放後に stable。同じ画像の次保存応答保留中は破棄無効、解放後の正当 save accept / 同 ID / asset / key0 を維持 |

`reset-recovered.png` は最終 bundle の再試行後・追記保存済み WYS host。自身で画像を開き、編集面に「完全次保存本文」が表示されることを確認した。ダウンロードの4keyは実クリックで生成された Blob を観測したもので、ダウンロード先のファイル再読込みをしたとは扱わない。画像ファイル選択は CLI upload、OS file-drop ではない。

補助側の試行失敗として、ボタン表示名相違2箇所、host mount 待機不足、selector escaping、CLI 起動遅延による mouse up timeout、再起動後 about:blank での相対 module import 失敗があった。既知 exec を回収し、本人 session をアプリへ開いて再実行した。製品の試験成功へ混ぜていない。`dialog accept` の回収結果は No dialog is showing。無関係な process / OS / browser の操作はしていない。

## 最終自動検証・適用範囲

- 10:07:43 JST から最終 source の `pnpm typecheck && pnpm lint:fix && pnpm format` 成功。401 files、fixなし。既存11 warnings / 27 infos。
- 10:07:49 JST 開始、23.75秒、全 **441 / 441 tests、42 files** 成功。新9件を含む。438件は origin 補強前であり、最終結果と区別する。
- 10:08 JST に既知 PID28343 を停止して `pnpm build` 成功。10:08:50 JST 開始の Node22.22.3 production で上表全8経路を実行。規定 checks 後に製品ファイルを変更していない。
- Node/backend は無変更。C3 先行134件、独立 origin/revisions 28件等の根拠を適用する。今回 Node integration や schema generation を再実行したという報告ではない。frontend の source、生成 bundle、主たる実操作は今回の final 441件と一致する。
- P1-B / C3-B/E は元破棄・再編集・失敗回収・mode/save 所有で自己合格。C3-D は限定 origin 引継ぎの正常拒否対で自己合格候補。その他の codec / 認可 / sandbox / SSRF / 20版・pin 方式の独立合格を変更しない。

## 最終保全・固定識別・handoff

10:11:31.738 JST、開始 baseline の6表旧全列差0、404 objects 全件 bytes / SHA256 一致。DB integrity_check=ok。最終 **487 notes / 60 assets / 790 revisions**。開始464/56/753との差23 notes / 4 assets / 37 revisions は本フェーズの自己操作で追加した分。失敗した helper の新規自己 note も削除していない。conversion queued/running=0、reference queued/running=0、display initialization conversion/reference=0。旧原本 / media / pin / backup を保持し、migration は行っていない。

10:12:03.533 JST、既存と同じ sorted/dedup `git ls-files -co --exclude-standard -z` の regular files、`.goal-implement/`除外、`path + NUL + bytes + NUL`:

- main **582 files**: `8dfe16a5410cbbf7d66fc271f5bd6c0e5724c44053c3b1ff18f992bb545d8aa8`
- HEAD: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`
- lock: `d48aeda94b6cf2e8f2ec1298733b05fff3419f775b86b3aab303498ebb9dae53`
- client `NoteEditor-BdU1wyjp.js`: `5a07d8f8784e582a702ed89c79f36b690db15c15623e32c5f1ab3b5ab1b2956f`
- `dist/server/server.node.js`: `14f6b903e05267123de15e16e238191c156cf14058fe290982eef01ca760ac0b`
- 新自己14資材: `72cf7adfd351efc74f863bfcc047c14ea78cab821b065829e8e78e52e2a41c46`。全個別 hash は一時 `artifacts.json`。DB / credentials / 自己 artifacts.json は集計外。
- 旧自己39資材: `787cffafdc645edc5d2f511dd0a58c3b88c2bfb684f2c2754536c51e5ec3e18f` 不変。
- 独立35資材: `c4f24003162f20ee38d2aeecc8825869ee9851d07b18fefbe18c66520e27de1d` 不変。

production は **session59378 / PID31825、開始2026-09-10 10:08:50 JST、Node22.22.3**。APP_URL=http://localhost:3000、HOSTNAME=127.0.0.1、PORT=3000、HOLLOW_MAIL_MODE=local を維持した。旧67528 / 44132 は SIGTERM drain 後 exit0 を回収済み。最初の旧20632も build 前に停止済み。最終 production は起動維持する。

10:11〜10:12 JST に自身の browser `hollow-c3-main` を close、key0 を確認。実 browser は HeadlessChrome/152.0.0.0、macOS。全自己 fetch / XHR / Worker / confirm / download hooks を finally で復帰し、helper exec は完了。一時 listener は作成していない。補助 agent を起動・再開していない。製品・test・browser・helper の操作を停止し、Manager と独立 Verifier へ返却する。

OS IME / native paste / OS drop、全 browser / OS 性能保証は従来どおり未検証。今回の修正に未解決の製品不具合は検出していないが、最終独立検証は未実施。P2d、追加 rich editor、backend 変更へ進まない。

報告作成後の最終照合は **2026-09-10 10:14:42.500 JST**。main / 新自己資材 / 旧自己 / 独立資材 / HEAD / lock は上記と一致、production HTTP200。以後、文書報告を含め全書込み・環境操作を停止する。
