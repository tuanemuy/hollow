# P2c-2 C2-V1 修正候補

2026-09-06 / Asia/Tokyo。Implementer の自己検証結果。独立再検証・Manager 受入は未実施。

## 対象と判定

正式レビュー `reviews/P2c-2.md` と採用済み `phases/P2c-2-revision-plan.md` に基づき、clean mode 切替の古い非同期結果が最新選択を上書きする C2-V1 を修正した。C3 は未着手。

| 対象 | 変更・自己根拠 |
| --- | --- |
| C2-D/E | mode 要求の独立所有、最新要求だけの採用、同 mode 再選択・拒否・取消による旧要求失効。最終本体の render/project 遅延、旧失敗、ABA、dirty 取消・失敗・retry が成功 |
| C2-F / P1-B / C1-A/E/F | 保存所有と mode 所有を分離。要求取消後も正当な保存応答・作成 ID・最新入力・退避を受理。両 mode の V5 二段追記、同 ID の失敗 reload 復元、実 mode-save 継続の取消、dirty history 取消を確認 |
| P2b-B | media-only の新規作成移行と同 asset の退避復元、upload 中の遅い mode 採用拒否と完了後の非 queue 化を確認 |
| P1-E | 最終 source の規定 checks・直列 unit・build・Node22 production 起動が成功 |

不変の C2-A/B/C、P2a、C1 pin/GC/認可、parser/codec/safe-fetch、backend の試験を全面再実行していない。追加の共有契約変更はない。

## 最小修正

製品変更は frontend の 4 ファイルだけ。schema・依存・lock・server function・application/domain/adapters は変更していない。

- `NoteEditor.tsx`: 新要求を拒否・同値 return より先に発行する。render/project の各 await 後、mode/host/notice/error/device default への反映前に所有を確認する。obsolete catch は新状態へ反映せず、その要求の analyzer は finally で解放する。
- `editorModeRequest.ts`: 型付き要求オブジェクトの identity と AbortSignal を持つ component-local owner。入力の世代やサーバーの権限・version とは別。sidecar や client request を認可に使わない。
- `editorModeRequest.test.ts`: owner 正常・失効・ABA・古い成功/失敗・resource 解放の 10 件。
- `editorSave.test.ts`: mode 要求を取り消しても created ID と追加入力を共通 settle で保存する 1 件。

dirty prompt と conflict の切替先は要求オブジェクトを保持する。旧 prompt/error/device 書込を抑止し、取消後の conflict retry は通常保存として最新入力を失わない。finish/history、破棄、退避選択、unmount/利用者・編集対象変更も失効境界とした。未実行だった関連可能性を別の確定不具合とは扱っていない。

`settleEditorSave` は複製していない。保存 accept の persisted/saved/created ID/最新入力/backup 清掃は mode 取消で捨てない。既存 note の mode preflight を navigating lock にせず、new→stable は取消済み target ではなく現在 mode で移行する。composition/media は採用時にも現在状態を確認し、拒否した切替は暗黙 queue しない。

## 最終ソースとコマンド

開始基準は Manager 受領値 557 files / `48d71be5514c3ba6d1547388b3e71cd0d539e3d61fe9ba29c98e73afb745b883`。修正前の同 hash を今回独自に再取得したとは主張しない。

最終 fingerprint は 18:11:51 と 18:20:21 JST の 2 回で一致した。

- HEAD: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。commit なし。
- 製品 tracked + untracked 実ファイル: **559 files**。
- SHA256: **`12963eec15b2d807866bfe8f7aae7da6a49a6457a1ecf7ff650480f5df83cfd1`**。
- lock: `ab5726f19ce660ffdc599821edbb1f115cb114fae8987dcfbab33d8d9190e68f`、開始値から不変。
- porcelain: tracked 23 entries / untracked 94 entries。ディレクトリを含む git 表示件数であり実ファイル件数ではない。既存未コミット変更を保持。
- 再現: `/tmp/hollow-c2-v1.V2Ktz2/fingerprint.mjs`。`git ls-files -co --exclude-standard -z` を重複除去・sort、管理文書 `.goal-implement/` を除く実ファイルの `path + NUL + bytes + NUL` を集計。

```sh
pnpm typecheck && pnpm lint:fix && pnpm format && pnpm test:unit --exclude '.goal-implement/**' --maxWorkers 1 && pnpm build
```

最終実行 session 17030 は exit 0。Node **22.22.3** / pnpm **11.1.2**。管理用 suite だけ除外し、製品 test の除外なし。unit は 18:09:58 JST 開始、**356/356、34 files、80.55 秒**。最終 conflict retry の obsolete target 除去も含む source で成功した。checks/build 完了は 18:11:39 JST 確認、最終 bundle は `NoteEditor-DNt6cPGM.js`（94.97 kB / gzip 23.10 kB）。deadline や試験上限を緩めず、build と unit は直列。

18:01 開始の先行 unit 356/356（17.19 秒）と build も成功したが、最後の conflict retry 条件追加前なので最終根拠と区別する。初期 test の mock 引数型、hook dependency lint は実装中に修正し、最終規定 checks は成功。既存 Biome info 23 件は不変。

Node integration は今回未再実行。backend/schema/ports 不変のため、受入済み C2 最終 **124/124（16:39:40 JST）** を借用する。owner helper の unit は実 React 全体の自動試験ではなく、次の本体 trusted 操作と組み合わせた根拠である。

## 最終 bundle の実ブラウザ

専用 Chrome / agent-browser 0.36.0、session `hollow-c2-v1`。本体 Node22、通常 localhost 認証、今回作成した自己 account/note だけを使用した。fetch/Worker/XHR の遅延・失敗 wrapper は自分の tab だけで finally により復元。body/title 入力と mode ボタンは trusted 操作。合成 composition は明記し、実 OS IME とは扱わない。

| 実日時 JST | ケースと結果 | 一時再現資材 |
| --- | --- | --- |
| 18:15:05–14 | WYS→visual render 保留→HTML→旧成功/旧失敗解放でも HTML/CM/device=html。WYS 再選択で WYS 保持。visual A→HTML→visual B、B→A 応答でも B を維持 | `mode.cjs success/failure/keep/reverse` |
| 18:15:16 | project Worker 保留→HTML、旧要求の Worker 1 個解放、HTML 保持、error 0 | `project.cjs` |
| 18:15:19–21 | render 待ち後の合成 composition 中は採用拒否。途中 HTML 要求も拒否し旧 visual を失効、同 WYS host/入力を保持 | `composition.cjs [choose]` |
| 18:15:43 | dirty 切替取消、保存失敗で WYS と最新 backup、retry→HTML 保存済み。dirty history を取消して最新 HTML を保持し保存 | `dirty.cjs` |
| 18:15:46–52 | 旧 visual 待ち中に破棄/history/完了。破棄後 WYS、history/完了後 detail の iframe は 1 個、旧応答による再遷移・alert なし | `navigation.cjs discard/history/finish` |
| 18:16:54–59 | 無題/media-only→stable 同 note・画像幅91。mode-save の通信失敗→reload→退避復元→visual、同 asset URL・幅91・最新本文・保存済み・backup key 0 | `media.cjs` / `media.json` |
| 18:17 前後 | 新規 title autosave の invalidate 保留中に別 mode 要求を拒否/失効、trusted 本文を二段追記。HTML/WYS 双方で同 created ID・最新 title/body・保存済み・new key 0 | `race.cjs html cancel-mode` / `wysiwyg cancel-mode` |
| 18:18:24–26 | render 待ち中に実 PNG upload を開始して XHR 保留。採用拒否後 upload 解放、WYS のまま保存済み。別 mode は暗黙 queue されない | `late-upload.cjs` |
| 18:18:52 / 18:19:02 | 新規 save continuation 失敗→new backup の created ID と最新本文/mode→reload→同 ID 復元。HTML/WYS 双方で保存済み/new key 0 | `new-failure.cjs html/wysiwyg` |
| 18:19:31 | 実 dirty visual「保存して切替」の保存応答保留→WYS 再選択で要求取消→さらに追記。正当な save accept と共通 settle が同 note の最新本文を保存、WYS/backup key 0 | `save-ticket.cjs` |
| 18:20 | 最後の自己 note に upload した 2 枚とも current URL、naturalWidth91。HTML へ通常 clean 切替、保存済み/CM/backup key 0。自身で画像確認後に browser close | `final-wys-media.png` / `final-html.png` |

V5 両 mode の最終 note は `01a07601-c653-705f-8578-3c6b6dee6ef3` / `01a07601-dc0d-737d-8113-50c7e18b1234`。失敗復元は `01a07603-5362-752a-b764-b44cc0bf9083` / `01a07603-7c0e-7752-a5df-f8a108ea74f3`。media-only 復元は `01a07601-a423-701a-9b2c-5c4f148c3674`、asset `01a07601-9a60-7642-9a66-82a31956ba79`。すべて今回の自己検証データ。

試験の失敗・未実行は次のとおり。

- late-upload の初回は 2.8 秒固定待ちで「未保存」のため assertion 失敗。再読込で保存済みを確認した。状態待ちへ変更した再試行の 1 回は CLI open が 30 秒で SIGTERM、製品ケース未実行。同 exec を回収後の 1 回は上表の状態待ちで成功。最終同 note・2 asset・current mode・backup 0 も確認した。製品待ち時間は変更していない。
- 途中 CLI の browser 接続 socket 不在が 1 回あり、同 session の一度の再 open で回復した。他 process/OS を変更していない。
- 初期自己 signup 手順は確認リンクを開くだけで確認ボタンを押しておらず未確認だった。ボタン操作で回復した試験手順の不足であり、製品認証失敗とは扱わない。秘密値は報告しない。
- 実 OS IME/native clipboard paste/OS drag-drop は前回同様未確認。今回 composition は合成 guard、PNG は file input、本文は trusted typing。mobile/全 C2 解析/旧 noText の独立遅延 fixture は今回再実行しておらず、旧独立合格・共通失効対との範囲を分ける。

## データ保全と環境

変更前 online backup:

```sh
/usr/bin/sqlite3 /tmp/hollow-p2b.dAfzgS/app.db ".backup '/tmp/hollow-c2-v1.V2Ktz2/baseline.db'"
```

baseline は **412 notes /40 assets /541 revisions**。schema 変更・migration なし。18:16:43 と 18:20:21 JST の保全検査で baseline の notes/assets/note_revisions/note_asset_references/note_revision_heads/originals の全列 EXCEPT 差分はすべて 0。baseline originals + ready assets の **386 objects** は実 storage の bytes/SHA256 が全件一致、失敗0。再現 `preserve.mjs`。旧版・pin と物理 object の検査を分けている。

終了 DB は **421 notes /43 assets /568 revisions /display pending 0 /conversion queued-running 0**。旧 data と backup 群、独立固定資材、既存未コミット変更を保持。今回増分は自己 account/note/asset と通常保存だけ。

既知旧 production PID41320/session77181 と中間 PID60500/session66510 は build 前に正常停止し exit0 を回収。最終 production は **session68259 /PID62968 /Node22.22.3**、`http://localhost:3000` で起動維持。終了時の既知 PID 数値確認で生存。稼働中の同 worktree build なし。

```sh
DATABASE_URL=file:/tmp/hollow-p2b.dAfzgS/app.db APP_URL=http://localhost:3000 HOLLOW_MAIL_MODE=local HOLLOW_MAILBOX_DIR=/tmp/hollow-p1-S1piZT/mailbox HOLLOW_STORAGE_DIR=/tmp/hollow-p2.sj33Bk/originals HOSTNAME=127.0.0.1 PORT=3000 pnpm start
```

`.env not found` は従前どおり明示環境変数で起動する条件。DB/storage/mailbox の場所は不変。Node24 はこの revision では使用していない。

自己 browser は 18:20 JST に close 成功。hook 復元確認済み、自己 listener はなし、test/helper exec は全回収、補助 agent は使用していない。production 以外の自己 browser/helper は停止。最終 source・依存・DB・browser の操作を停止して独立再確認へ返却する。C3 へは進まない。

報告確定時計: **2026-09-06 18:23:41 JST**。一時資材は `/tmp/hollow-c2-v1.V2Ktz2` に保持し、旧独立資材は上書きしていない。主要自己 helper の SHA256:

| ファイル | SHA256 |
| --- | --- |
| mode.cjs | `7b4568d400187411892885fe92550421b009b06072de7a082e62d00d1e4c6892` |
| race.cjs | `26ddd847eea7e99c55897943b2ebc8bc6449fd420c06a41b0d1cd9fe0d4095c6` |
| new-failure.cjs | `3f68d06f120dcf3d617f04266cfa604c792a23f140577d8ce82bee021decc951` |
| save-ticket.cjs | `94ff4f01c98fef7221ef4a79288611825dcf7a8caa4d54c07cda8c8022a41586` |
| late-upload.cjs | `f1509f4164ca4af8c5f34fd115fdfc52390d2f35ee342a5f767718f387eb3e20` |
