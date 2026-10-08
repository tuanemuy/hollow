# P4f-1 ZIP source reader実装補助

## 結果

2026-09-26T20:42:51+09:00時点。[sources.ts](../../packages/core/src/adapters/node/zip/sources.ts)の`NodeZipSourceReader`と[sources.test.ts](../../packages/core/src/adapters/node/zip/sources.test.ts)を実装した。最終限定unitは31/31成功、限定Biomeは指摘0。変更は新規2ファイルと本報告だけである。

固定`ZipSourceReader`・`ExportSource`・`OwnedObjectRead`を変更していない。既存inline reader、単件書き出し、ObjectStorage、DI、生成・assemblyの接続は主担当の所有範囲である。本報告は実装補助の結果であり、独立Verifierの受入ではない。

## 実装契約

- constructorは`Pick<ObjectStorage, "openOwnedRead">`と`Pick<ZipSourceReader, "openOwned">`を受ける。未構成owned storageは`ZIP_NOT_CONFIGURED`とする
- objectは`storage.openOwnedRead(key, signal)`だけから取得する。CoordinatedObjectStorageによる登録を迂回してファイルや外部URLを開かない
- raw chunkを最大64KiB単位で処理し、0〜2bytesを次のchunkへ持ち越す。base64途中のpaddingを避け、data URIを逐次出力する。出力bodyのhigh-water markは1とする
- 実入力bytesとSHA-256をEOF前に完全照合する。短読・過読・hash不一致・body read失敗は安全な`EXPORT_MEDIA_UNAVAILABLE`とする
- raw readerのcancelとnative closeを並行開始する。errored bodyのcancel拒否はnative close失敗と混同しない。`raw.close()`と`raw.closed`の両方が終了するまで、共有closeと返却`closed`を完了しない
- native close又はclosedの拒否は返却close/closedへ保持する。本文側は安全な失敗にし、外側`trackZipSources`が所有未証明を集約できるようにする。adapter内でownerを新設しない
- pre-abortはstorage open前に拒否する。取得中にabortされた場合はowned resourceを返し、閉鎖の証拠を外側へ渡す。取消・二重close・EOFは共有closeへ収束する
- inlineは入力とsignalをそのまま`inline.openOwned`へ渡し、同じowned resourceを返す。`open()`は`openOwned().body`を返す

後のsourceへ進む側は返却closeの完了を待つ。adapterは閉鎖証拠を先行成功にせず、呼出元の逐次処理を独自のglobal queueやslotへ変更しない。

## 検査

| 日時 | コマンド | 結果 |
| --- | --- | --- |
| 2026-09-26T20:42:02+09:00 | `pnpm exec vitest run packages/core/src/adapters/node/zip/sources.test.ts --fileParallelism=false` | 初回29/29成功、160ms、exit0 |
| 2026-09-26T20:42:36+09:00 | 同単独unitコマンド、片側close待機2対追加後 | 最終31/31成功、155ms、exit0 |
| 2026-09-26T20:42:51+09:00 | `pnpm exec biome check packages/core/src/adapters/node/zip/sources.ts packages/core/src/adapters/node/zip/sources.test.ts` | 2file・指摘0、exit0 |

主担当の単独unit枠で実行し、終端回収後に返却した。unit失敗と製品側の固定契約不成立は検出していない。全体型は本担当では実行していない。

確認範囲は次のとおりである。

- 1/2/3bytes分割と混合分割、空chunk、末尾padding、1〜150,003bytesの完全一致
- 65,535/65,536/65,537bytes境界と大きめのraw chunkの分割。固定media MIMEのbase64出力segmentが87,384bytes以下であること
- object key/signalの委譲、短読・過読・hash不一致、read失敗後のerrored reader.cancel拒否と正常closeの分離
- raw.closeとraw.closedそれぞれの拒否の保持、両方待機、一方だけ未完了の場合のEOF/closed先行防止
- 明示close・body cancel・signal abort・pending read中取消・二重closeの共有Promiseと待機
- pre-abortのopen0、取得中abort後のowned resource返却、inlineの完全委譲、`open`の出力と未構成拒否

全対は小synthetic bytesとin-memory owned-resource fixtureである。afterEachは自己gateを解放し、返却済みresourceのcloseを全件待つ。新tmp・実ファイル・PID・外部接続は作成していない。native closeの故障注入はPromise契約の証拠であり、実OS故障の再現ではない。

## 未検証と返却

CoordinatedObjectStorage・実FileObjectStorage・生成worker・DB owner・spool publishとの組合せ、既存inline readerの全挙動、全体型・全量unit・buildは主担当の統合検査へ残す。永久に終了しないnative closeを成功へ変換せず、timeoutを閉鎖証明にしない。全1GB・全OSの成立は本検査から主張しない。

専有ソースと本報告を全文確認した。既存製品・管理正本・本体DB・fresh・proof・runtime・browser・依存・秘密・gitは未操作である。未回収exec0で全操作を停止し、新2pathと報告の所有を主担当へ返却する。統合と最終commitは主担当が行う。
