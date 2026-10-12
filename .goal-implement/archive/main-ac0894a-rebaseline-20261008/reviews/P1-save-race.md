# P1-B 新規保存移行 V5 独立再検証

## 結論

2026-09-06 11:02:01〜11:14:36 JST に検証。V5 は解消し、P1-B と P2b-B の今回再オープン範囲を合格とする。新たな差戻し事項はない。元の失敗資料 `reviews/P2b-references.md` の 10:31 節と独立 race fixture は保持した。

| 受入項目 | 判定 | 今回の独立根拠 |
| --- | --- | --- |
| P1-B / V5 新規保存応答後の継続入力 | 合格 | HTML・WYSIWYG の trusted 本文入力を保存後 GET 待機中に行い、作成済み同 ID の version 1 に保存。stable 編集画面で本文・保存済み表示・退避キー消去を確認 |
| P1-B 継続保存と完了遷移 | 合格 | HTML の二回目本文・title 追記は同 ID の version 2。WYSIWYG の明示完了中の追記も詳細へ保持。遷移中の実 DOM 入力ロックとロック後再比較の unit を確認 |
| P1-B 作成済み退避・再試行 | 合格 | HTML は作成済み復元導線から reload 後に同 ID・HTML mode で復元完了。WYSIWYG は失敗後の再試行で同 ID に保存。旧 mode なし退避も実 UI 復元可能 |
| P2b-B media-only / draft→stable / 退避 | 合格 | 無入力の白紙へ SVG のみ挿入して無題の stable note を作成。通信失敗後の復元で同 asset の本文・表示・実 storage hash を保持 |
| P2b-A/C、P2a、P1-C/D/E 等 | 既存合格を保持 | 今回の変更対象外。V1〜V4 の受入結果を変更しない。認可・worker・codec・sandbox の全方式を再実行したという判定ではない |

## 固定対象と実行環境

- HEAD: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。
- 521 files / SHA-256: `a6bfa0752314a8505acca70b8fa6a276aeb66072fbb9776a57c63e9661771c5e`。
- lock SHA-256: `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`。
- 開始照合 11:03:34.773 JST、終了照合 11:14:20.415 JST とも一致。既存 `fingerprint.mjs` を Node 22.22.3 で実行した。tracked と untracked の実 file を重複排除・sort し、`.goal-implement/` を除外した `path + NUL + bytes + NUL` の定義。
- production: Node 22.22.3、`http://localhost:3000`、session `36409` / PID `15854`。再起動・build・設定変更なし。
storage: `/tmp/hollow-p2.sj33Bk/originals`。mailbox: `/tmp/hollow-p1-S1piZT/mailbox`。
- browser helper のみ既知 Node 24.19.0 を使用。これをアプリの Node 22 実行根拠と混同しない。
- 開始時の fingerprint session `76917` と browser session `16066` は無出力遅延後に回収できた。重複起動・全 process 情報取得・他作業への干渉は行っていない。

## コードレビューと自動試験

`phases/P1-save-race.md` 全文、元 V5 根拠、および `NoteEditor.tsx`、`editorSave.ts`、`editorSave.test.ts` を確認した。実装報告の変更範囲はこの 3 files。API・schema・依存の変更はない。

`settleEditorSave` は保存する snapshot と保存後の最新入力を比較し、新規作成・明示完了では必要な追加入力を同じ作成済み ID に継続保存する。安定後に短い `flushSync` ロックを置き、ロックで flush された入力も再比較する。`accept` は応答受領時点で ID を保持し、追加入力を初回 snapshot で戻さない。既存ノートの通常 autosave は継続 loop に入れず、従来の 1800 ms debounce を維持する。後者の正確な時間測定は今回の独立 UI 試験では行わず、コードと unit を根拠とした。

退避は stable key を先に書き、new key に作成済み `noteId` と mode を持たせる。復元値は mode と UUID の形を検査し、利用者単位の key を使用する。旧 mode なし退避は互換処理される。不正 mode / ID、別利用者 key、storage 書込み失敗、refresh 失敗後の同 ID 再試行、遷移失敗時のロック解除はコードと focused unit で確認した。これらをすべて実 browser で故障注入したという意味ではない。

11:04:24 JST、Node 22.22.3 で独立実行:

```sh
node node_modules/vitest/vitest.mjs run apps/web/app/components/hollow/editorSave.test.ts apps/web/app/components/hollow/editorMedia.test.ts --maxWorkers=1
```

22 tests / 2 files 合格（保存・退避 13、既存 media 9、438 ms）。これは純粋な保存 helper と media helper の試験であり、React 全体の仮想試験ではない。次節の実ブラウザ操作を併用した。

借用根拠は Implementer の全 unit 271、関連 Node 26、最終 checks/build/start。全 unit 271 は最後の型注釈・不正 mode assert 前のため、最終固定候補の無条件な全件成功とは記さない。今回の最終 22 件再実行で変更箇所を確認した。source mtime は NoteEditor 10:50:10、editorSave 10:50:44、test 10:56:48 JST。無変更の backend / parser / codec の大量再実行は行わなかった。

## 独立ブラウザ操作

専用 session `p2b-reference-independent` の自身データのみ操作した。下表の 8 notes が今回の追加で、既存他データは変更していない。version は終了時の実 DB 照合値。

| 操作 | 最終 note ID / version | 観測 |
| --- | --- | --- |
| 旧 mode なし退避の復元 | `01a07475-b7b3-74a5-a0c2-b5c01d8cfaa4` / 0 | 前回自身が残した WYSIWYG 退避の本文を復元し stable 化。旧退避の incidental `id` は新しい `noteId` 契約としては扱わない。元の既存 note は変更なし |
| 元 V5・HTML | `01a07476-24a6-7596-98c7-e4e444dc13a0` / 1 | title の作成後 GET 待機中に `<p>V5-html-CONTINUED</p>` を trusted typing。同じ作成済み ID の HTML 編集画面に保持、保存済み、両 key 消去 |
| 元 V5・WYSIWYG | `01a07476-82d3-772f-8986-30273b5c1e7c` / 1 | 同じ順序で `V5-wysiwyg-CONTINUED` を入力。stable 編集本文、保存済み、両 key 消去 |
| HTML 二回追記 + title | `01a07477-7f0d-703a-8eb0-f4183a8ccc3a` / 2 | 2 回の GET 保留にそれぞれ追記し、3 saves / 1 note。最終本文 `<p>V5-FIRST</p><p>V5-LATEST</p>`、title `V5-INDEPENDENT-html-multi-LATEST`。最後に改めて編集画面を開き、本文・保存済み・退避 0 を確認 |
| WYSIWYG 明示完了 + 追記 | `01a07478-0ac2-7409-b0a4-61da4c0cdb17` / 1 | 完了操作後の待機中にも trusted typing。2 saves / 1 note。詳細 iframe に `V5-FIRST`、退避 0 |
| HTML 保存応答後の次回 POST 失敗・reload 復元 | `01a07478-a669-73af-b2f9-c661552fdbd1` / 1 | 作成済み DB は本文空の version 0、画面は未保存、new/stable 双方に最新本文・mode・同 ID。reload 後「作成済みノートを開いて復元する」→ stable edit の「復元する」→完了で同 ID に `<p>V5-FIRST</p>`。詳細表示・退避 0 |
| WYSIWYG 保存応答後失敗・再試行 | `01a07479-8762-7162-adea-145ad3121ebe` / 1 | 作成済み ID と WYSIWYG 退避を保持。失敗 wrapper を解除して UI 再試行。同 ID の stable edit に `V5-FIRST`、保存済み。次の白紙新規に不要な復元表示なし |
| 画像のみ作成・同 asset の通信失敗復元 | `01a0747a-607c-762e-83bf-a89e36b248a5` / 2 | 白紙・title 未入力から SVG のみ挿入し無題で stable 化。自 tab の serverFn を abort して title/body 追記を失敗させ、route 解除→reload→復元→完了。追記本文と同 asset を保持。再読込した詳細でも表示 |

元 V5 の時系列は page 内 `performance.now()` による。HTML は保存応答 13203.5 → GET 保留 13210.1 → trusted 本文入力 13628.1〜13653.7 → 解放 13670.7 ms。WYSIWYG は保存応答 13311 → GET 保留 13317.8 → trusted 本文入力 13722.6〜13736 → 解放 13752.9 ms。旧失敗と同じ「作成応答受領後・読取待ち中の追加入力」を実際に通した。title の準備 fill まで全 event が trusted とは主張しない。

遷移直前の競合について、HTML 二回追記と WYSIWYG 完了の自 tab だけ、移動中の GET 応答を 500 ms 遅らせた。実 DOM で title と mode buttons が disabled、HTML textarea が disabled / rich input が `contentEditable=false` になることを確認。観測のための遅延であり通常のロック時間ではない。最初の HTML multi 結果採取ではまだ streaming 中だったため、その途中 snapshot を完成判定にせず、終了時の再訪問と DB で完成を確認した。

画像試験は自身の synthetic SVG を再利用した。元 fixture SHA-256 は `9d0f19525d8ee5baf630ebae3879a866b3fd5ead7e0a7d10f9517706d691b642`。asset `01a0747a-580d-706e-a0a8-81d608d39ac5` は 520 bytes、`ready`、`committed_to_note=1`。DB と実 storage file の SHA-256 は双方 `837c47c7f51a4612c2a9aaa7a561a13a1d5b402c598128741ac2f7ca4c16bab2`。復元後の本文 URL と naturalWidth 270 は同 asset を指した。追加 asset や別 note への付け替えはない。

`/tmp/hollow-save-verify.EEkadk/media-recovered-mobile.png` を Verifier 自身が画像表示して確認した。390×844 の詳細で追記テキスト、青緑の gradient、白い山、黄色い円が見え、画像欠落・横方向の切れ・操作ボタンの重なりはなかった。今回の確認は保存移行・復元の表示であり、SVG 全安全方式の再証明ではない。

## 試験資材と独立性

- 自身の追加資材は `/tmp/hollow-save-verify.EEkadk` のみ。本体コードは編集していない。
- `race.cjs` は旧独立 `/tmp/hollow-reference-reverify.e1grfM/race.cjs` のコピーを `apply_patch` で変更。session・識別 title・観測 field と、初回 GET のみ保留する条件を変更した。修正による正常な二回目保存を再度保留しないためで、旧入力順序は維持した。
- 旧 race SHA-256 は終了時も `c521c6be8722560942cada6556ae3fd81d346503fa0d54a4dfe04ae17754dfad`。新 race は `8e9f6e700a3f0d208ec5479cdfa4da48345424e5f23217e22f2860364e11ae78`。
- `continued.cjs` は Implementer の `/tmp/hollow-save-race.yABnL1/continued.cjs` を読み、独立コピーに session / title / 絶対 CLI path / 観測用の短い遷移遅延を追加。最終観測待ちを 1200→2000 ms にした。元資材は変更なし。コピー SHA-256 は `262645a5676b08d0c2ea888c574c0e0228241833c7c7d0e9a079a0b8184dfa8c`。harness 出所は借用だが、実操作・採取・DB と画像の確認は Verifier 自身による。
- GET 保留には最長 12 秒の解除 timer があり、元 V5 再演では実際の保留は約 435〜461 ms。failure wrapper と network abort は自 tab に限定し、各試験後に解除した。

## 保全・限界・引継ぎ

DB は開始 364 notes / 30 assets →終了 372 / 31。自身の 8 notes / 1 asset を追加した。`pre-v5.db` の旧 354 notes / 29 assets と read-only 比較し、欠落 0、note の title/html/version 差分 0、asset の bytes/sha256/storage_key/committed marker 差分 0。これは照合した列の保全証拠であって全 table の byte 同一比較ではない。`integrity_check=ok`、foreign key 違反なし。

作成応答を受領済みの競合が本判定の対象。初回 POST commit 済み応答の完全喪失に対する exactly-once、storage 利用不可時の再起動復元、全 browser、全入力方式の同時組合せは未検証かつ今回の追加必須条件ではない。新規未入力時に空 note を増やす挙動は今回の操作ではなく、8 notes はいずれも復元または明示入力/画像挿入に対応する。

11:14:36 JST までに自 browser の `close` 成功。終了前に full navigation 後の `window.__v5restore` は `undefined`、退避 key は 0。media 試験の `**/_serverFn/**` abort route は reload 前に解除済み。自己 listener なし、自己検査 exec は全て完了、HAR・認証情報の export なし。他 browser の global cleanup は行っていない。manual-test の操作・確認手順を使い、専用 session のみ閉じた。report は markdown-style に沿って判定・証拠・未検証を分離した。

production session `36409` / PID `15854` は停止・再起動せず保持。DB・storage・mailbox・backup の場所は上記のまま。コード・環境・browser 操作を停止し、Manager へ環境所有を返却する。
