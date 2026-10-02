# P4f-1 STORE writer実装補助

## 結果

2026-09-26T19:58:18+09:00時点。P4f-1-DのNode STORE writerと専有unitを実装した。限定unitは36/36成功、限定Biomeは指摘0。製品のDB・実ObjectStorage・公開処理へ接続した結果ではなく、独立Verifierの受入結果でもない。

変更対象は[writer.ts](../../packages/core/src/adapters/node/zip/writer.ts)と[writer.test.ts](../../packages/core/src/adapters/node/zip/writer.test.ts)の新規2ファイル、および本報告だけである。共有port・constants・名前allocator・Unicode・DI・依存・管理正本は変更していない。

## 固定契約への接続

- [ZipWriter port](../../packages/core/src/application/zip/writer.ts)を実装する`NodeZipWriter`をexportする
- `ZipArchive`のSTORE、通常ZIP、64KiB high-water mark、逐次sourceを使用する。entryはmanifest込み501以下、payloadは既存`ZIP_MAX_PAYLOAD_BYTES`の1,000,000,000bytesとする
- STORE上界は`payload + Σ(92 + 2 × UTF8(name)) + 22`。安全整数・件数・名前・payload合計の不成立は`ZIP_CAPACITY`とする。最終ZIPに別の1GB業務上限を追加しない
- entryごとの実bytesとSHA-256を照合する。短読・過読・hash不一致は`ZIP_SOURCE_CHANGED`、実chunk累積のpayload超過だけを`ZIP_TOO_LARGE`とする
- sink書込みをawaitし、前sourceのbridge終了とowned closeの後だけ次sourceを開く。出力の実bytes/hashを計算し、予約上界を超えた出力を成功にしない
- 正常・失敗の両方で全取得済みsourceとsinkのcloseを待つ。close呼出しは各ownerの共有Promiseにまとめる。失敗時はsource/sink closeを並行開始し、archive/bridgeのclose、出力consumerの終了も待つ
- 取消は`ZIP_ABORTED`、その他の入出力失敗は安全な`ZIP_WRITE_FAILED`へ変換する。close拒否は`ZIP_CLOSE_UNPROVEN`を最優先にし、他ownerのcleanupを省略しない。finalize・finish・abortの返却だけで所有終了にしない

入力のsafe flat名割当は主担当へ返却済みの`NodeZipNames`が担う。writerの上界検査は固定ZIP形式の技術前提であり、利用者titleの新しい上限ではない。

## 検査

| 日時 | 実行 | 結果 |
| --- | --- | --- |
| 2026-09-26T19:57:42+09:00 | `pnpm exec vitest run packages/core/src/adapters/node/zip/writer.test.ts --fileParallelism=false` | 1file・36/36成功、297ms、exit0 |
| 2026-09-26T19:58:18+09:00 | `pnpm exec biome check packages/core/src/adapters/node/zip/writer.ts packages/core/src/adapters/node/zip/writer.test.ts` | 2file・指摘0、exit0 |

初回限定Biomeでは待機用async generatorの`yield`不足を検出した。専有testへ空chunkを追加し、再検査で解消した。unitの失敗はない。

検査範囲は次のとおりである。

- 日本語entry、空entry、manifestの順序・STORE method・bytesの読戻し。実出力bytes/hashと固定上界の一致
- 製品の1GB未満・等号・超過metadata算術、manifestの加算、501/502entry、safe integerとflat名の技術境界
- 実source closeを保留した間の次source未open、遅いsinkによる読出し停止、短読・過読・hash不一致と兄弟未open
- 開始前取消、open待機後の取消、source/sink I/O待機の取消、出力終了後のfinish/close待機の取消
- source/open/write/finish失敗時のcleanup、finish後のclose待機中は成功を返さないこと
- source/sink/両方のclose拒否の最優先分類。他ownerのclose呼出しと、次source未open
- test-only module mockでpayload上限を4bytesに縮小した3/4/5bytesの実chunk対。合計超過と過読の優先分類

1GB±は製品定数の算術検査である。4bytesの実chunk対は分類ロジックの縮小検査であり、製品設定を変更していない。backpressure対は同じ64KiB chunkを64回読む4MiBの小synthetic streamである。全1GB資源・全OSの成立を主張しない。

## 借用根拠と未検証

[採用設計](../design.md#一括zipの接続判断)と、受入済みprobeの`/Users/hikaru/.local/share/hollow/verification/p4f-writer-20260926-aQjLPa/contract.ts`・`writer.ts`をread-onlyで参照した。probeは変更・実行していない。指定名の`test.ts`は該当しなかったため、製品差を専有unitに記述した。probeのbigint/可変limit/forceZip64から、固定portのsafe integer/製品定数/通常ZIPへ接続している。

実native reader/sinkのclose、withOwner、DB保持・予約解放、公開Tx、DI、全体strict型・全量unit・build・実ブラウザは主担当の統合検査へ残す。固定ライブラリの全故障経路やOS資源上限を本unitで再証明していない。

owned closeが拒否され、さらにpending I/Oも終了しない場合は、bridge/consumer終了待機が残り得る。この場合に未証明の所有を成功として返さない。実adapterの中断可能closeと、外側の所有保持・回復の成立は接続側の確認対象である。unitのclose拒否対は、I/Oが終了済みの状態で所有証明だけが拒否される場合を扱う。

## 返却

主担当と単独unit枠を調整し、終了後に枠を返却した。製品DB・storage・runtime・browser・既存proof・秘密・依存・git・全量検査は未操作である。専有ソースと本報告を全文確認し、未回収exec0で全操作を停止して主担当へ所有を返却する。最終統合とcommitは主担当が行う。
