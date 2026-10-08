# P4f-1 ZIP delivery限定統合テスト

## 結果

2026-09-26T20:52:53+09:00時点。新規[zipDelivery.integration.test.ts](../../packages/core/src/adapters/libsql/__tests__/zipDelivery.integration.test.ts)の限定5対が成功した。限定Biomeは指摘0。変更は同testと本報告だけであり、既存製品・共有port・既存testは変更していない。

自己DB・自己storageで`prepareZipDelivery`と`getZipFile`の接続差を確認した。HTTP/UI・実配備・独立Verifierの受入結果ではない。

## 確認範囲

| 対 | 結果 |
| --- | --- |
| 2配信枠と同ID取得 | 2件をsending/runtime activeにし、同IDの再取得を`ZIP_NOT_FOUND`で拒否する。3件目prepareは`ZIP_DELIVERY_BUSY`で拒否し、DB行とownerを増やさない。2件のclose後に新prepareを受け付ける |
| body cancel中のnative close待機 | 実FileHandleのfdが有効な間、cancel Promiseは未完了、runtime ID・DB nonclosed・active object ownerを保持する。gate解放後の元native closeでfd=-1となり、DB closed・runtime/owner解放へ進む |
| AbortSignal中のnative close待機 | 同じ実close保持を確認する。解放後のbodyは`ZIP_DOWNLOAD_CANCELLED`となり、成功本文にしない |
| 期限等号 | delivery.expiresAtとartifact.expiresAtの等号で取得を拒否する。新規readerを開かず、runtime枠を取得しない。ticket期限切れとartifact期限切れを区別する |
| 全含有noteの現在read | 2つの私有WSにviewerとして生成したZIPで、後方1scopeだけを正式membership変更で失権させる。先方scopeのviewer資格が残っていても、旧ticket取得と新prepareの両方を拒否し、storageを開かない |

失権対は現在の`currentZipArtifact`/`canScope`入口検査の根拠である。作成時点で主担当のmembership変更とZIP取消の同Tx接続は未編集のため、その接続を本結果から成立済みと扱わない。viewerの初期所属は自己fixtureのrepository操作で設定し、失権は`changeWorkspaceMember`を呼ぶ。

## fixtureと実所有の観測

[zipFlow.integration.test.ts](../../packages/core/src/adapters/libsql/__tests__/zipFlow.integration.test.ts)の自己fixtureを局所再利用した。`createTestContainer`の新規file-backed libSQL、自己`mkdtemp` storage、実CoordinatedObjectStorage、実STORE writer、NodeZipExecution/Transfers、NodeZipSourceReader、純粋document plannerを接続する。成功2形式・反復取得の既存行列は複製していない。

close gateは返却resourceの見かけのcloseだけを遅延させず、当該自己artifactを開いた実FileHandleのcloseへ置く。元のnative openを呼ぶtest wrapperから自己handleだけを観測する。gate解放後は元のnative closeを実行し、fd=-1を確認する。EOFやraw.body.cancelによる実closeの先行を避けた観測である。

本testにunknown故障注入はない。故意に遅延した正常OS closeと、DB/runtimeの所有保持を確認している。OS close失敗・永久pending・未知PIDの回復は検査していない。

afterEachは自己gateを解放し、自己request signalをabortしてbody cancelと追跡中Promiseを回収する。execution/transfersのstopと全自己handle終了後、active object owner 0と`pragma foreign_key_check`の違反0を確認する。DBをcloseしてhelperが記録した自己DB/WAL/SHMを回収し、正確な自己`hollow-zip-delivery-test-`rootだけを削除する。利用者データは含まれない。

## 実行と修正

| 日時 | 実行 | 結果 |
| --- | --- | --- |
| 2026-09-26T20:51:15+09:00 | 専有Node test初回 | 4/5成功、1fixture前提誤り、exit1。session17385終端回収 |
| 2026-09-26T20:52:30+09:00 | 同専有Node test、fixture修正後 | 5/5成功、2.04s、exit0。session49003終端回収 |
| 2026-09-26T20:52:53+09:00 | 限定Biome | 1file・指摘0、exit0 |

Nodeコマンドは`pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipDelivery.integration.test.ts --fileParallelism=false`。Biomeコマンドは`pnpm exec biome check packages/core/src/adapters/libsql/__tests__/zipDelivery.integration.test.ts`である。

初回fixtureは3枚のticketを先にprepareできると仮定していた。現repositoryはready/sendingを含むnonclosed全体を2枠に制限する。fixtureを2件の実取得、3件目prepare拒否、close後再受付へ修正した。製品側の期待を変更した修正ではない。初回の残る4対と自己回収も成功した。

## 未検証と返却

HTTP header・実UI・通知・member変更の同Tx取消・履歴/retry・purge・再起動・最大入力・全体型と全量検査は主担当へ残す。expiryの確認は入口の拒否であり、期限切れready行の後段sweep/pruneの成立を含まない。小fixtureから全1GB・全OSの資源保証はしない。

主担当と単独Node枠を調整し、終端回収後に返却した。既存fresh・proof・本体DB/storage・runtime・browser・PID・秘密・依存・git・全量検査は未操作。専有ソースと本報告を全文確認し、未回収exec0で全操作を停止して所有を主担当へ返却する。統合と最終commitは主担当が行う。
