# P4f-1 owned storage限定テスト

## 結果

2026-09-26T20:20:43+09:00時点。新規[ownedStorage.test.ts](../../packages/core/src/adapters/node/zip/ownedStorage.test.ts)の22/22対が成功した。主担当の型指摘を局所修正した後の再実行も22/22成功、限定Biomeは指摘0。変更は同testと本報告だけであり、既存製品・共有APIを変更していない。実装補助の検査であり、独立Verifierの受入ではない。

## 確認範囲

| 対象 | 確認した振る舞い | 根拠の範囲 |
| --- | --- | --- |
| `FileObjectStorage.openOwnedRead` | EOFのbytes一致、chunk最大64KiB、実close Promiseと終了後fd=-1 | 自己tmp内の最大150,003bytesの実ファイル |
| EOF・明示close・body cancel・AbortSignal | 実close前は`closed`や完了を返さず、reentrant closeは同一Promiseで一度だけnative closeを呼ぶ | 同じ実FileHandleのcloseだけをgateで遅延し、解放後は元のnative closeを実行 |
| 即時abort | `OBJECT_ABORTED`の拒否時には取得したFileHandleが閉じている | 自己tmpの実ファイルとfd=-1 |
| `NodeZipExecution` | cancelでsignalを中止してもactiveを保持し、work完了までstopを待つ。typed unknown後はactiveを保持し、新規拒否・stop拒否を続ける | 小さな明示gateとI/Oなし故障注入 |
| `NodeZipTransfers` | 同ID・全2枠を守り、cancelやstop開始でrelease扱いにしない。typed unknownはrelease不可・新規拒否・stop拒否。異なるownerをretainしない | 小さな明示gateとI/Oなし故障注入 |
| `CoordinatedObjectStorage` | ownerなしowned readを拒否し、登録したkeyの実read close後だけ通常のendWriteへ進む | 新規自己root、実ファイル、fake UoW |
| 型付き所有保持 | 同kind/idの`zip-spool`・`zip-assembly`・`zip-delivery`だけendWriteを省略する | fake UoWのbeginWrite/endWrite観測 |
| 従来所有終了 | 通常例外、型なし同code、異なるid、異なるkind、非ZIP ownerではendWriteを行う | fake UoW。実DBの保持・回収は未検証 |

native closeの成功対と、`ObjectOwnershipUnprovenError`の注入対を分離している。後者はOS close失敗を再現した証拠ではない。leaseやdeadline経過をclose成功にする検査はない。

## 実行

| 日時 | コマンド | 結果 |
| --- | --- | --- |
| 2026-09-26T20:18:20+09:00 | `pnpm exec vitest run packages/core/src/adapters/node/zip/ownedStorage.test.ts --fileParallelism=false` | 1file、22/22成功、432ms、exit0 |
| 2026-09-26T20:18:39+09:00 | `pnpm exec biome check packages/core/src/adapters/node/zip/ownedStorage.test.ts` | 1file、指摘0、exit0 |
| 2026-09-26T20:20:32+09:00 | 同単独unitコマンド、型指摘修正後 | 1file、22/22成功、408ms、exit0 |
| 2026-09-26T20:20:43+09:00 | 同限定Biomeコマンド、最終ソース | 1file、指摘0、exit0 |

主担当から全量検査と重ならない単独実行枠を受け、終了後に返却した。主担当の全体型検査でtestの`FileHandle.on`にTS2339を検出した。実Nodeでは成功したevent観測を削除し、型にある実close Promiseとfd=-1へ証拠範囲を限定した。製品不具合の再現や製品修正はない。全体型の再実行・全量unit・buildは主担当へ残す。

## fixtureと回収

既存[coordinatedObjectStorage.test.ts](../../packages/core/src/adapters/node/__tests__/coordinatedObjectStorage.test.ts)のfake UoW構成をread-onlyで参照した。既存のPID・子process・recovery行列は実行していない。

`mkdtemp`で作成した`hollow-zip-owned-test-`接頭辞の正確な自己rootだけを使用する。`open`のtest wrapperは元のnative openを呼び、自己FileHandleを観測する。closeの待機対は自己handleだけにspyを置く。

afterEachはgateを解放し、spyを復元する。自己reader closeとruntime stopを全件待ち、取得済みhandleの残りを閉じてから、記録済み自己tmpを削除する。unknown注入で残るものはtest内のメモリ上の所有記録だけであり、実ファイルhandleや実DB負債ではない。検査成功時に全自己tmpを回収した。作成した小synthetic資材だけを削除しており、利用者データは含まれない。

## 限界と返却

実DBのbegin/endWrite、回収競合、runtime再起動、withOwnerからworker公開Txへの接続、最大入力、OS closeが永久に終了しない状態は本testの範囲外である。全1GB・全OSの資源保証はしない。

本体DB・fresh・既存proof・既存runtime・browser・秘密・依存・git・全量検査は未操作。専有ソースと本報告を全文確認し、未回収exec0で全操作を停止して主担当へ所有を返却する。全体型と統合検証、最終commitは主担当が行う。
