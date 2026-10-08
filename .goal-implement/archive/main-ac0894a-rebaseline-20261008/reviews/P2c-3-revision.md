# C3-V1 修正の独立再確認

2026-09-10 10:16〜10:22 JST（Asia/Tokyo）。結論はP1-B/P2c-3-B/D/E合格。元C3-V1は解消し、新しい必須不具合は検出しなかった。旧不合格資料とhelperを保持し、本書で固定修正版への結果を分離する。

## 基準と範囲

[ED-08/04](../../spec/scenario/editing.md)、[採用designの明示破棄resetと限定clean preparation](../design.md)、[台帳](../plan.md)、[修正報告全文](../phases/P2c-3-revision.md)、[元独立C3-V1](P2c-3.md)を照合した。修正はNoteEditorの明示破棄/resetとclean baseline、`wysDiscard.ts`およびtest。通常外部更新保護、backend/schema/deps/C1認可・20版・pinは不変の報告を、今回の呼出境界レビューと合わせて適用する。

新機能・性能gate・全C3再証明は追加していない。goal/spec/spec-implementを呼び出さず、製品/管理直下/依存/buildを変更していない。agent-browser-cleanupはManagerの所有条件を優先し、全体掃除や全process列挙をせず自己sessionだけを終了した。

## 固定対象

| 対象 | 識別 |
| --- | --- |
| main | 582 files / `8dfe16a5410cbbf7d66fc271f5bd6c0e5724c44053c3b1ff18f992bb545d8aa8` |
| HEAD | `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a` |
| lock | `d48aeda94b6cf2e8f2ec1298733b05fff3419f775b86b3aab303498ebb9dae53` |
| NoteEditor-BdU1wyjp.js | `5a07d8f8784e582a702ed89c79f36b690db15c15623e32c5f1ab3b5ab1b2956f` |
| server.node.js | `14f6b903e05267123de15e16e238191c156cf14058fe290982eef01ca760ac0b` |

main/HEAD/lockは開始10:17:15.562、終了10:20:32.522 JSTに一致。bundleは終了時に修正報告の値との一致を確認。再buildしていない。main集計はsorted/dedup `git ls-files -co --exclude-standard -z`、実regular files、`.goal-implement/`除外、path+NUL+bytes+NUL。hash CLIだけNode24、アプリ/検査helper/unitはNode22.22.3。

## 独立実行

### 関連unit

10:17:16 JST開始、1.44秒、4files/54成功。

```sh
pnpm test:unit apps/web/app/components/hollow/wysDiscard.test.ts apps/web/app/components/hollow/editorModeRequest.test.ts apps/web/app/components/hollow/editorSave.test.ts apps/web/app/components/hollow/WysEditor.test.ts --maxWorkers 1
```

新9ケースでexact source/CRLF非正規化・fresh undo・dispose・遅い成功失敗・取消・再試行・saved metadata優先・同source/note未変換baselineのみ継承を確認した。これはPM/pure helperの試験で、React全体試験とは扱わない。以下の実操作を併用した。全441件・checks/buildは最終候補の自己報告を借用し、438件の補強前成功と区別する。無変更backendは先行Node134と独立origin/revisions28等を適用し、今回再実行していない。schema生成も行っていない。

### 本体の8経路

独立資材は`/tmp/hollow-c3-v1-verify.sZOtUh`。元不良`discard.cjs`と修正版helperを読み、同じtrusted操作の条件を確認した。修正版helperを別tempへ複製し、独立sessionと新規自己noteへ適用して自ら実行。変更はtitle・自己browser adapter・自己画像先だけで、製品/元helperは変更なし。手順定義の出所はImplementer資材であり、独立に全手順をゼロから作ったとは称さない。

すべて2026-09-10 JST。seedは正規アプリAPIによる自己新noteで、UI入力とは区別する。typingとボタンはtrusted mouse/keyboard、通信/Worker/confirm/composition/XHRは本人tabだけの制御である。

| 完了時刻 | helper / 自己note | 観測結果 |
| --- | --- | --- |
| 10:18:01.434 | discard-final / `01a088e4-937f-749c-82d0-7d39ddd91481` | 元V1と同じ保存失敗→trusted破棄。PM「保存済本文」/editable=true/保存済み/key0、追加の反映要求なし。破棄でcontext/version不変。その後trusted「再編集」を保存しorigin1保持 |
| 10:18:13.910 | origin-preserved / `01a088e4-c5cc-77d3-8345-aa27fdf00381` | 初meaningful保存済みorigin1/version1→次の失敗追記→破棄。saved PM HTML/context/version完全一致、変換前復元導線とkey0を保持 |
| 10:18:27.793 | reset-cases / `01a088e4-fa03-7766-a957-0db02132e910` | 確認取消はdirty/backup保持。Worker準備失敗は旧dirty hostを除去、saved回収/再試行。再試行でsaved editable host。次reset成功を保留しHTML選択後解放しても新mode/HTMLを上書きしない |
| 10:18:49.848 | late-failure / `01a088e5-4ec5-723a-bb89-2c667e337422` | 同じ境界で古い失敗応答を解放。新HTML mode/noticeを保持し、旧失敗理由を表示しない |
| 10:19:00.450 | ownership-cases / `01a088e5-78ba-7078-9430-2a50257f5b21`、`01a088e5-8330-7154-9940-9ef679e91222` | 合成compositionstart中のtrusted破棄は入力/hostを保持して拒否。別server保存後の通知でもdirty/backupを保持。別自己noteで破棄して履歴へ移動するとreset hostは復活せずkey0 |
| 10:19:18.775 | media-discard / `01a088e5-c1c5-72d1-a012-93de188e998d` | PNG1個・無題new→stable。alt失敗→破棄で同ID/asset/saved HTML/version0/key0。後続alt保存version1→reload、自然幅32・同asset・説明一致 |
| 10:19:31.119 | finish-reset / `01a088e5-f18f-7228-ac61-6618a6061f37` | reset応答保留中の完了は旧準備を取消し、saved回収/再試行を残す。古い応答でhost復活なし。trusted退避クリックが生成したBlobの4keyと完全saved HTMLを確認。再試行→trusted追記保存/key0 |
| 10:19:46.902 | pending-guards / `01a088e6-39f5-75df-856b-8d74ab84e77f` | 実PNG upload応答保留中の破棄確認取消はupload保持、save/完了無効。解放後同ID stable。次save応答保留中は破棄無効、解放後の正当save accept/同asset/key0を維持 |

画像`reset-recovered.png`を10:19:43 JSTに自分で開き、再試行後の編集面に「完全次保存本文」が表示され、toolbar・編集枠が通常状態であることを確認した。今回mobile/全toolbarを再検証せず、旧C3独立画像/keyboard/mobileの不変範囲を適用する。4keyは実クリックで生成されたBlobの観測であり、OSダウンロード先ファイルの再読込みではない。

今回8helperにassert失敗なし。開始backupを通常`sqlite3 -readonly`で読んだ一度だけopen errorが出た。原因は確定していない。ファイル存在を確認し、自己online backupを`immutable=1`で読むと487/60/790を確認でき、保全helperの通常接続も成功した。製品障害や欠損としない。未回収execは残していない。

## コードで確認した採用条件

- `discard`は進行中saveとcompositionを拒否し、確認取消時は本文/媒体を変更しない。明示了承後だけsaved snapshotへ親を戻し、旧plan/ack/reprepareを外して新modelを準備する。通常WysEditorの外部dirty保護そのものは変更していない。
- `prepareDiscardedWys`はexact source一致と現在request所有/abortを確認し、成功・例外双方でdisposeする。NoteEditorはさらにmode/current HTML/metadata identity/composition/unresolved mediaを採用直前に確認する。古い成功失敗は現在notice/hostへ入らない。
- resetを受理したmodelはfresh undo。失敗/取消では旧dirty PMを「保存済み」の編集面として残さず、saved回収と再試行を提示する。完了/履歴/mode/unmountによる失効は既存mode requestで管理し、save accept/persisted IDとは分離している。
- `acceptWys`が最新要求のclean canonical preparationを採用した場合だけsource/noteId/未変換metadataをbaselineに置く。変換済backupはbaselineを生成しない。fallbackはWYS明示破棄かつsaved.wys不在、saved HTML完全一致、同note、未変換の場合だけ。saved metadataが常に優先し、別source/note/converted/不在を除外する。HTML/visual通常破棄はfallbackを使わない。
- fallbackは新しいserver照会やorigin/版作成ではない。初回meaningful保存時の現在権限・保持版・記録version照合を既存serverへ残す。captured versionを現在headへ付け替えず、旧originを新規生成したと偽らない。

## ID別合否と共有影響

| ID | 判定 | 根拠・適用範囲 |
| --- | --- | --- |
| P1-B | 合格 | ED-08の一度の破棄でsaved表示/編集/backup整合、再追記保存。失敗/取消/進行中saveの正常拒否対。旧V5全成功は保持 |
| P2c-3-B | 合格 | 元host不整合を解消。画像only stable/同asset/reloadとfresh編集面を独立確認。無変更schema/opaque/通常表/隔離は旧合格保持 |
| P2c-3-D | 合格 | 初回clean pending originの限定引継ぎ、保存済みmetadata優先、別source/note/変換済拒否。実origin/version保持とunit9。20版/prune/認可serverは無変更の旧独立根拠 |
| P2c-3-E | 合格 | 破棄後saved回収/4key/再試行/最新追記、media-only/同ID/key、save所有を維持。旧両mode二段V5/失敗reloadの全反復はしない |
| P2c-1-E | 共有影響合格 | 外部dirty保持、履歴移動、save所有を独立確認。actor/実認可はbackend無変更の旧根拠。追加再open不要 |
| P2c-2-D/E | 共有影響合格 | 遅いreset成功失敗→新mode優先、完了/履歴取消、upload/save中保護。HTML/visualの無変更入力・診断を再試験しない。追加再open不要 |
| P2c-3-C/F | 共有影響合格 | 明示破棄を新変換警告へ回さず準備・回収を提供。型付きhelper/最終unit/build適用・本人画像/保全。全入口警告/性能は旧受入を保持。追加再open不要 |

G11-R1とC3-A、その他無変更codec/SSRF/metadata/current-history認可/pin/GCの先行受入は維持する。実OS IME/nativepaste/OSdrop、全browser・heap/RTT保証は未確認のまま。合成compositionやCLI uploadを実OS成功にしない。今回新たな方式gateを合格条件に加えていない。

## 保全とhandoff

- `/tmp/hollow-c3-v1-verify.sZOtUh/baseline.db`は開始online backup。487notes/60assets/790revisions。終了10:19:56.822 JSTの`preserve.mjs`でnotes/assets/note_revisions/note_asset_references/note_revision_heads/originalsの旧全列差0、408物理objectsのbytes/SHA全一致。旧backup・元helper・試験noteを削除していない。
- 最終496notes/62assets/805revisions。差分9notes/2assets/15revisionsは自己追加試験。display pending/conversion active/reference active各0、integrity_check=ok、FK違反0。
- 終了hashは上記main/HEAD/lock/bundleと一致。旧Implementer14files `72cf7adfd351efc74f863bfcc047c14ea78cab821b065829e8e78e52e2a41c46`、旧39files `787cffafdc645edc5d2f511dd0a58c3b88c2bfb684f2c2754536c51e5ec3e18f`、元独立35files `c4f24003162f20ee38d2aeecc8825869ee9851d07b18fefbe18c66520e27de1d`も受領値と一致。
- 今回独立tempは11files `36623ff18c7e99f80ba114616ff2c69a9dd4c6573bcfebff03f995716542041a`。basename sort+NUL+bytes+NUL、DB/WAL/SHM/credentials/artifacts除外。元C3-V1不良helperは旧tempのまま保持した。
- 自己browser `hollow-c2-verify`を10:20:32.320 JSTにclose。本人tabのfetch/Worker/XHR/confirm/download hooksはfinally復元、全自己helper/exec完了、listenerなし。他browser/process/OSに操作なし。
- production session59378 / PID31825、Node22.22.3、開始10:08:50 JSTを維持し、終了HTTP200。DB `/tmp/hollow-p2b.dAfzgS/app.db`、storage `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox`。停止/再build/migrationなし。環境所有をManagerへ返し、全操作停止する。
