# P3c-R1 独立再検証

## 結論

2026-09-11 11:06:46〜11:20:36 JST に検証した固定候補の P3c-A/G は合格。現在認可された通常 read、受付からの総 3 秒、子の終了確認後の結果受理と枠解放、不成功後の同 executor 回復が成立した。新しい差戻しはない。既受入の 30 変更枝は維持する。

元 R1 の 09:43〜09:56 の失敗時に、実際に親子の時計原点がずれていたかは未証明。今回の合格は、その過去原因を確定したという意味ではない。独立に再現した時計比較の構造欠陥の解消と、現在候補の通常・拒否・回復動作を根拠とする。旧 report の失敗ログ、再起動回復、10:20 の不正 `q` fixture による再発認定撤回は保持した。

| ID | 判定 | 独立した根拠 | 適用範囲・未確認 |
|---|---|---|---|
| P3c-A | 合格 | 同 host 親子時計 5 対、旧方式 ±60 秒失敗と新 monitor 正常、期限 wire 境界、現在認可 read、終了前の結果非受理、期限・取消・異常終了後の回復、本体個人・WS・空・再試行 | OR-01/03 と既定検索 runtime の変更部分。SQL・normalizer・projection・認可 policy 本体は不変。過去 R1 の時計差の実在は未確認 |
| P3c-G | 合格 | 7 path の依存・資源所有レビュー、独立 deadline 3 件と runtime 9 件、observer 例外・未知 progress・payload 制限、本体 fixed bundle、旧データ・資材・識別保全 | 規定 checks/673 unit/build と通常 production drain は実装者の最終候補根拠を借用。今回再 build、全 256 Node、長時間 soak、全 OS 性能試験は行っていない |

## 対象識別と変更レビュー

開始識別は 11:07:54.646 JST、終了識別は 11:19:29.848 JST。開始終了の値はすべて一致した。製品の unstaged/cached 差分は 0。ソースは dedup/sort した tracked + untracked の実在 file を対象とし、AGENTS symlink の参照先 bytes を含む従来方式。`.goal-implement/` を除き、path + NUL + bytes + NUL を SHA-256 に渡した。

| 対象 | 固定値 |
|---|---|
| commit | `c5bcfc920d018c45353066b42dd3f63dfbe3d010` |
| source 762 files | `6746668eb04802ea472a9047397756dfead7e5daf7e941b1da1ee516c222587f` |
| pnpm lock | `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` |
| server bundle | `cb8827bdc2fe39c1054558650cd4950155d577146198184bc817e5ea7f5316af` |
| search monitor | `c64c52954e3c50b8c22a2d24de708025bc58ed205568e38ea24383286b05116d` |
| search query | `f2d66b8887ee1273d5396362adc6befd89a37998d1bc7f8bf76ee6d47050c275` |
| projection | `55a3ab762a09b7b22abaf091dd1f8f1a3334942a1eb549929cd2714778694133` |

正式 `phases/P3c-runtime-revision.md` 全 121 行、採用 design の時計条件、元 report、runtime recurrence plan と一次資料補足を読んだ。7 製品 path（deadline/diagnostic/execution/supervisor と限定 test/fixture）を全文確認した。query/projection の hash は不変。業務 port、DI、SQL、schema、依存、snapshot、normalizer、stop 順は変更していない。

- deadline は受付で `hrtime.bigint()` から一度作り、queue 待ちも同じ絶対期限を消費する。wire は最大 20 桁 decimal。期限比較は BigInt、残時間の timer/診断変換だけ Number を使う。expired/不正/残時間 3 秒超を拒否し、100 ms の終了余裕を残して開始可否を決める。
- 固定 diagnostic kind/stage と有限数値だけを採る。診断を final result と扱わず、未知 stage は不正 reply。追加 payload は schema で落とす。observer の同期例外を捕捉し、資源所有や正常結果を変更しない。
- final reply の到着だけでは成功しない。close code 0 と期限内を確認して受理し、close 後に active slot を解放する。取消・期限・不正 reply の終了要求は冪等。停止の所有と UI/業務 port は不変。
- 同 host/boot/Node 22.22.3/clock namespace に限定した採用である。Node の `HrtimeBigIntImpl` が `uv_hrtime()` を使い、固定版 macOS libuv が `mach_continuous_time()` を換算することを一次資料で照合した。任意の異なる host/boot へ値を持ち出せる保証にはしない。[Node 22.22.3 実装](https://raw.githubusercontent.com/nodejs/node/v22.22.3/src/node_process_methods.cc)、[同梱 libuv Darwin 実装](https://raw.githubusercontent.com/nodejs/node/v22.22.3/deps/uv/src/unix/darwin.c)、[Node process API](https://raw.githubusercontent.com/nodejs/node/v22.22.3/doc/api/process.md)

## 独立実行と初回失敗

本体・tests・一時 child は Node 22.22.3。製品の test、期限、bundle を変更していない。Vitest は `--maxWorkers 1 --no-file-parallelism`。管理資料の除外は既存 root 設定を維持した。

| 実行 | 結果 |
|---|---|
| `searchDeadline.test.ts` | 3/3 成功。精度・decimal/期限境界・diagnostic 境界 |
| `searchExecution.integration.test.ts` の runtime 9 件（projection 除外）初回 | 7 成功、2 件は Vitest test 全体 5,000 ms 超過。全体 35.40 秒。通常 DTO は 5,117 ms、queue/native 対は 5,555 ms。初回失敗を保持 |
| 通常 DTO の同条件 1 回分離 | 成功、test 3.71 秒。正常 2 read と session 削除後の現在認可拒否 |
| queue/native 対の同条件 1 回分離 | 成功、test 3.41 秒。期限・枠解放と後続 reader |
| 独立 `timing.ts`、final monitor/query と clone DB | setup 2.595 ms。read 250.610 / 224.540 ms、copy の専用 session 削除後 `SESSION_REQUIRED` 378.388 ms。close は各 code 0、残 2749.538 / 2775.526 / 2621.700 ms |

初回 2 件は複数要求を含む test 全体の timeout であり、単一製品要求が 3 秒を超えた assertion の失敗ではない。分離再実行と独立要求計測は成功したが、初回の負荷原因は未確定。後の高速結果を初回時点の内訳とみなさず、製品期限違反とも環境原因とも断定しない。

実行コマンドは `pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/node/__tests__/searchExecution.integration.test.ts --maxWorkers 1 --no-file-parallelism --testNamePattern ...`。初回は `does not compare|keeps final|rejects a result|counts queue|cancels in-flight|keeps the dedicated|reads finite|bounds queue|cancels a live`、分離 2 対はそれぞれ `reads finite current DTO` と `bounds queue and terminates` を指定した。unit は `pnpm exec vitest run packages/core/src/adapters/node/__tests__/searchDeadline.test.ts --maxWorkers 1 --no-file-parallelism`。

限定 runtime 群は ±offset、exit 7/throw/不正 reply 後の同 executor 正常、reply 後の長い native 実行を期限終了、queue 待ち込み・expired 不 fork、live/queued 取消と close 順、query-only INSERT 拒否を含む。同じ無変更 projection の重い負荷試験は再実行していない。

## 独立した時計・診断境界

独立資材は新 private root `p3c-r1-verifier-NhVCsF` に置いた。旧 commit の supervisor source を `git show` で読み、一時 bundle を同 root 内だけに生成した。checkout や元資材変更はない。offset は自己 child の `performance.timeOrigin` のみを変え、OS 時計を変えていない。

| 対 | 独立観測 |
|---|---|
| 旧方式 offset 0 | code 0、110.021 ms |
| 旧方式 +60,000 / -60,000 ms | SIGKILL、80.025 / 42.379 ms |
| 固定新 monitor offset 0 / +60,000 / -60,000 ms | 全 code 0、146.318 / 92.443 / 90.813 ms。monitor/worker/result/ack/exit の progress |
| 同 host 直接 child 5 対 | 各 child の hrtime 値が親 fork 前〜close 後の区間内。実装側の receive 区間測定とは別の観測 |
| observer が毎回 throw | valid progress と final result の成功を保持 |
| progress に追加 query payload | observer event に synthetic payload が出ない |
| progress-only exit 0 / 未知 stage | 両方拒否し、それぞれ次の同 executor 正常 read が成功。5 close を確認 |

時計対の小 worker は synthetic result を返す一時境界 fixture であり、実 native DB の証拠ではない。DB/現在認可は前節の固定 query worker 対、本体は次節に分けた。observer の正常/拒否対も test-only adapter fixture である。自己 watchdog は close を待ち、全 child が終了した。

## 固定本体の実操作

新専用 browser `p3c-fresh-r1-independent` で、HTTP normal Chrome UA を明示設定した。承認済み helper の `fill owner` 後に通常サインインを押した。固定 `credentials-filled` と field の hasValue だけを確認し、認証値や helper 全文を取得・記録していない。Headless bot 経路の追加観察とは分ける。

- 個人一覧 64 件・初期 50 リンク、alert なし。検索 palette を pointer で開き、通常入力の結果 50 件を確認。
- 自分の tab のみで synthetic query `r1nomatch` の fetch を一度拒否し、結果 0 と再試行案内を確認。wrapper を解除し、実「再試行」から alert なし・該当結果 0 へ回復。Escape は通常 key 操作。
- 同 fixed runtime の WS hard open/reload は 6 件・6 リンク、alert なし。正規 `query=r1nomatch` は個人 0 件・リンク 0・alert なし。
- 390×844 の WS と空結果画像を独立に保存して目視した。header/scope、WS の 516 B、個人の 2,143 B、件数、検索条件が表示され、横 overflow はなかった。保存した画像はページ上部であり、画像だけで全結果本文の目視確認とは称さない。

`ui.cjs` は eval の regex escape 誤りで 1 回中断した。製品例外ではない。wrapper はその前に解除済み。元 helper/結果を保持し、新しい `ui-finish.cjs` の正しい selector で上記 6/0 件を確認した。画像は `workspace.png` / `empty.png`。実装者が保存した未目視画像を独立の視覚根拠として借用していない。

## 保全と借用範囲

開始/終了 online backup は新 private evidence root に 0600 で保存した。比較と DB 試験はコピーだけを開いた。11:19:29 JST の比較で 52 表すべての旧行欠落・変更 0。差分は通常サインインの新 session 1 行だけ。FTS shadow を含む表数であり、旧業務列と shadow の変化を混同していない。今回は shadow 差分も 0。

- notes 71、assets 2、originals 3、revisions 79、projection 71、tags 8、relations 133 を保持。FK 0、integrity `ok`。
- object 6 個 / 2,659 B、各 key/bytes/SHA が開始終了で完全一致。自己物理追加・削除は 0。57 B の運用 lock は集計外。
- コピー上で現 repository の capacity query を実行し、5 scope は 2,143 / 516 / 0 / 0 / 0 B。対応する全旧入力行も不変。
- writer/conversion/reference/display pending は受領 0 を保全した。object_writes 9 行と conversion_jobs 3 行の既存終了履歴を active 件数と混同しない。active notes が 0 という意味ではない。
- 実装側 fixed evidence 56 files の実 bytes を manifest 順で照合し、`189c1fc10ea5b9e63a052d16e1a06d80e4b9ea2abd4f4f152194940c4a55eaf8` と一致。DB/sidecars/manifest/owner lock は対象外。
- 自己 evidence 29 非 DB files は `4483de718579ce0a3c1557194109fc9206e5185b14c622d530a318929eb915e1`。相対 path を `localeCompare(en)` で sort し、path/NUL/bytes/NUL。自己 manifest 自身・DB/sidecars・空 DB fixture を除外した。root 0700、証拠 file 0600。

実装者の最終 checks/673 unit/関連 Node 24/build、最終同 bundle の正常 drain/exit 0 と再起動は借用した。今回独立で全 checks/build や production TERM を反復していない。直接 executor stop/child close は独立 test、production 通常停止は借用、と区別する。既受入 30 枝、無変更 codec/PM/20版/pin/FD/icon backend は今回の再検証数に含めない。

## 停止・引渡し

専用 browser は 11:19 JST に close 完了。自分の fetch hook は解除済み。自己 listener は作成していない。全 test/helper/child/exec は終了し、未回収 session はない。最終 source/hash/git/文書作業の終了後は追加操作しない。

production は変更・再起動せず PID `12333` / session `67941`、Node 22.22.3、同 fixed bundle のまま維持。11:20:36 の既知 PID 存在確認は成功。fresh root は `/Users/hikaru/.local/share/hollow/verification/p3c-20260911-dyHGjx`、DB/objects/mailbox/key path は受領設定を保持した。自己証拠 root は `/Users/hikaru/.local/share/hollow/verification/p3c-r1-verifier-NhVCsF`。環境所有を Manager へ返却する。
