# P4f-1 再開照合

## 現在の結論

2026-09-27T14:28:53+09:00更新の限定read-only照合。P4f-1は未完成・正式独立未検証であり、新8条件/既open23条件を合格へ進めない。現HEADは前回受入 `7d14cde63db81d50049365880a9f1c92a920747c` のまま、未commit製品差分は25 tracked変更＋47新file。内容はZIP/共有storage/0030/Unicode抽出と新runtime配線に対応し、今回読取では無関係な変更は認めていない。ただし全差分の正式レビューではない。

主21:00報告の「runtime/HTTP未接続・物理purge未編集」は古い記録で、9/27再開棚卸により訂正済み。21:13〜14のbatch fingerprint/document writer/server/HTTP配線は存在するが、その統合検査は未確認。採用済み `putOwnedBounded` はまだport/Node実装へ存在せず、子生成/assemblyは従来 `putBounded` 接続のまま。これは実装途中の未完了点であり、完成候補の不合格判定を先行するものではない。

主の14:25:31全停止・未回収exec0の棚卸を受領し、HEAD/source/lockが独立値と一致した。Managerによる凍結解除と所有の明示後、製品実装と限定検査を続けられる。現sourceを前日型成功/clone成功/実UI成功済みとは扱わない。主の環境所有を維持し、VerifierはDB/driver/保全原本/runtime/browser/install/testを一切操作していない。追加再open候補はP3e-C/D、P2d-2-FD、P1-Eの実変更部分だけ。Managerから4条件を再open予定との通知を受領したが、この報告では管理状態を変更していない。

## 指紋と差分

2026-09-27T14:23:52.968+09:00、git tracked/untracked非ignored・管理文書除外・existing regular・秘密path guard後の相対path/NUL/bytes/NUL集約を独立read-only実施。

| 対象 | 現在 |
| --- | --- |
| HEAD | `7d14cde63db81d50049365880a9f1c92a920747c` |
| source | 1096 files、`4eba7c057be33f6beba651446a47fc98fd02abec239e652045233b63110df86d` |
| lock | `613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498` |
| tracked diff | 25files、493追加/1833削除（Unicode data移設を含む） |
| untracked製品 | 47files、管理`.goal-implement`を除く |

前回受入source1049/`38e865a2…`、lock`2205b121…`からの差はP4f-1実装中の変更で、前回指紋一致を主張しない。lock差は259追加/削除0で、coreのarchiver8.0.0/@types8.0.0と推移依存追加。旧entry変更を示す削除行はないが、製品での解決配布物/noticeの最終固定は別途必要。

- 新47files：ZIP domain/application、node writer/names/sources/document/config/runner/lifetimes/diskとtests、libSQL10表/schema/0030/snapshot/5repoとtests、HTTP入口、共有ownership Error、Unicode中立helper。
- 既存25files：server Node、Unicode生成元/旧tag re-export、core依存、schema/UoW/journal、objectOperation/purge repo、共有storage/export source/snapshot、batch processing、note commit/trash/purge、membership、port/DI/purge owner型、明示UoW test fixture。
- Unicode dataはファイル全byte一致ではないが、license参照commentを除く全textがHEAD旧表と一致（14:25:06）。幅mapping→NFD→fullfold→NFDの抽出をコードで照合。29旧tag unitは主の前日成功であり今回再実行していない。
- `documentWriter.ts`4412B/mtime21:13:15、test8418B/21:14:49、server.node/zipHttp21:14:51、batch/processing21:13:14、0030 SQL21:05:34（全て9/26 JST）。mtimeは変更時刻の補助情報で、試験時source一致の代わりにしない。

## 証拠の適用範囲

goal-implement/manager-loop全文、現plan新8/旧23、design ZIP契約、主報告と名前/writer/owned-storage/sources/delivery/lifecycle/document-writer各報告を照合した。以下の数字は前日担当者の検査記録であり、今回独立再実行した件数ではない。

| 根拠 | 引き継げる内容 | 今の成功へ拡張できない部分 |
| --- | --- | --- |
| P4f-0受入19項目 | 固定Archiver STORE/限定close試作の成立、依存式・限界 | 製品writer変更、所有/DB/公開/回復/名前全体の成立 |
| names41、writer36、sources31、owned-storage22 | 各専有候補の小unit/限定Biomeと型付きclose/名前境界 | 現runtime統合・最新全体型/全量checks・自然OS故障・最大1GB |
| schema8/repo7 | 当時の0030/repo状態guardと自己DB | results等追記後の最終0030全境界 |
| clone-v1 20:01 | 当時の旧76表651列・109trigger保持、ledger+1/FK0との主記録 | 最新0030（results/後続guard追加）とfresh ledger31成立。今回backup/DBは未読 |
| export source5＋owned22の20:32再実行27 | 旧単件size拒否を維持した局所修正とclose契約 | 後続putOwnedBounded、server/HTTP/worker現在統合 |
| flow5＋delivery5の21:04:40、flow6の21:06:15、flow7の21:07:34 | 主棚卸で各exit0を確認。実ZIP読取保持中のpurge待機→body close後回収、再assemblyで旧source/sink closeとCONTENT_CHANGED除外を含む。同一flow拡張であり合計21独立caseではない | 純粋document planner・媒体なしの対。実isolated document worker、HTTP/browser/UI、最新全候補成功ではない |
| delivery5/5 20:52 | 実FileHandle close gate中のDB/Map/owner保持と入口current-read | 後続membership同Tx hook、期限sweep/boot/unknown回復全体 |
| lifecycle9/9 21:08:53 | queued ordinal hook・完成artifact退役/保持、自己fixture/実usecase | running native close、物理purge全sweep・現在HTTP/UI・全retry世代 |
| document-writer再開棚卸 | 新2path/15対の記述が存在、同担当はテスト未起動・自己Worker/tmpなしとの起動記録 | 15成功ではない。型/Biome/unitは未実行、terminate settlement/exit双方永久pendingの有限応答も未証明 |

主21:00の全体型exit0を21:14以降へ適用しない。主再開報告による最後の全体型session53416はfixtureのbaseVersion誤記によりexit2。その箇所をversionへ修正後flow7は成功したが、全体型は再実行されていない。後続runtime/HTTP/execution型/document writerも未検証。完成build/同bundle実UI/最終保全/候補commitはまだ存在するとの根拠がない。現在sourceを識別したが、個々の前日test時source fingerprintは報告に揃っていないため、内容の連続性を各限定再検査で固定する必要がある。

## 未完了位置と安全な再開順

1. 主棚卸は14:25:31で完了、主/helper未回収exec0・文書込み全停止。主のOS metadataによるports3000/3001 listener0、fresh全配下handle0、今回proof全配下handle0、自己ZIP合成tmp open0を借用する。Verifierはports/DBhandles/旧PIDを独自探索しておらず、DB内容/ledger/監督の現在状態は未確認。停止metadataを移行成功や新実行の安全保証へ拡大せず、Managerの凍結解除後は主が起動前提を再確認する。
2. document writer15対の未実行とruntime/HTTP/config/runner配線を現在型・限定検査へ接続する。現在codeでworker実exit前に成功を返さない構造は読めるが、実成立は未判定。主が必要な所有と実行枠を明示してから補助を再開する。
3. 採用済みputOwnedBoundedを実装・統合する。現 `ObjectStorage` にはopenOwnedReadだけが追加され、`zip/generation.ts`/`zip/storage.ts`はputBoundedを使用、sink.closeはresultの失敗を吸収して待つ現段階である。新出力native closeの区分とowner/予約保持は、このまま完成扱いにしない（P4f-1-C/D/H内）。
4. 最新0030・purge/ref・trash processingFingerprint・boot/drain/prune・現scope認可を局所検査で固める。旧clone成功を最新migrationへ流用せず、新copyで再照合する。freshは主の新保全・旧基準照合後にだけ通常手順で進める。Verifierは本turnで移行可否を実行保証しない。
5. 未編集の選択/ZIP確認/履歴/通知/取得/取消/retryのUI縦接続（P4f-1-G）、規定checks/build、同bundle実ZIP/自己回収/旧比較・commit固定と全停止を揃え、初めて正式独立へ渡す。

これらは固定8条件の残作業で、新gateではない。PDF第三需要・全1GB/全OS・後続機能を前倒ししない。既に受入済みP4e/P4f-0の不変部分は保持する。

## 追加再openの提案（Manager採否待ち）

| ID/出所 | 実変更と限定再確認 |
| --- | --- |
| P3e-C / OR-09・JB-02、表示集合/確認値 | `application/batch/processing.ts`にZIP現在request/generation/ordinalをfingerprintへ追加。usecasesのpreview/acceptで同関数を使うため、確認後のZIP入替/新世代と既存同要求収束に直接影響。既存500/旧operation全matrixの再演ではなく処理集合の差分に限定。 |
| P3e-D / OR-09・JB-03、新処理の無断取消禁止 | 同fingerprintをbatch workerが実行時にも参照し、共通trash coreはactive ZIPのhasProcessing/取消hookへ変更。ZIP追加/入替時の古い取消確認拒否と同値維持に限定。tag/move core全面再開ではない。 |
| P2d-2-FD / R12・既存「全writer drain後DB close」 | `server.node.ts`のshutdown先頭へ `await zipRunner?.stop()`、boot/recover/config guardを追加。ZIP stop失敗を正常DB/lock終了にしない統合と重複stopの影響に限定し、旧300回DB FD行列は変更外として保持。 |
| P1-E / R12・起動/設定/Node配線 | `server.node.ts`のZIP設定読取・未設定guard・runtime構築/回復・HTTP dispatchへの追加。起動時の既存入口と新設定の接続部分に限定し、旧認証shellやUI全面を再検証する提案ではない。主提案を同差分の独立読解で確認。 |

既open23に含まれるpurge物理/共有storage/snapshot/Unicode/移行条件は再度追加しない。新HTTP入口が存在するだけで未変更の旧UI/全HTTP条件を無制限に再開しない。製品修正は行わず、追加の確定不具合も本turnでは認定していない。

## 所有・停止

この報告だけを編集し、管理/製品/既存報告は非編集。テスト/install/build/runtime/browser/DB driver/保全copy/旧proof/鍵/opaque helper/秘密/.env/生ログは非操作。D01/sole recovery/旧tmp/旧PIDも非操作。実行は有限read-only shellだけで、各exec終端回収後に次へ進めた。環境所有は開始から主のままで、Verifierへ移譲されていない。主最終棚卸を反映した本報告を全文確認し、未回収exec0でread/report操作を含め全停止してManagerへ返却する。正式検証は完成候補と別途委譲を待つ。
