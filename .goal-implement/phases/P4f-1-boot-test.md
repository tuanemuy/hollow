# P4f-1 ZIP configuration / boot guard 限定テスト

## 結果

2026-09-27T14:49:36+09:00開始の単独Node検査は15/15成功、exit 0。全体1.56秒、テスト709ms。2026-09-27T14:49:55+09:00の限定Biomeは1 file / no fixes / exit 0。未処理エラーとafterEach失敗の報告はない。

固定H / P1-Eの実装補助根拠。独立受入検証ではない。編集は新規`packages/core/src/adapters/libsql/__tests__/zipBoot.integration.test.ts`と本報告だけ。既存製品、既存テスト、管理正本は非編集。製品不具合は観測していない。

## 設定境界の5対

対象は`adapters/node/zip/config.ts`の実exportである`readNodeZipConfiguration(filename, existingPoolBytes)`。

- 未指定はnull、正しいversion 1 / capacityは値を保って返す
- version不一致、top-level / capacityの余分field、必須field欠落、非正・小数・unsafe整数・文字列値、timer上限超過を拒否
- protected容量は6 GiBと既存poolの大きい方を保護。実pool超過、無効pool metadataを拒否し、timer上限値を許可
- 正しいJSON＋空白の16 KiBちょうどを許可し、1 byte超過を拒否。固定エラーへ自己pathを含めない
- JSON不正、ファイル不存在、directory、自己symlinkを`ZIP_CONFIGURATION_INVALID`で拒否

設定は自己`mkdtemp`配下の合成ファイル。環境変数一覧、配備設定、秘密ファイルを読んでいない。

## 未構成起動ガードの10対

対象は`assertZipBootConfiguration(db, configured)`。実schema / triggerを有効にした自己DBで確認した。

| fixture | 観測 |
| --- | --- |
| ZIP行なし | 未構成でも許可 |
| queued受付 → 資源なし取消履歴 | 受付中は拒否、取消完了後は許可 |
| terminal failed runと生存spool参照 | 拒否 |
| nonclosed assembly → closedだがkey / 予約あり | どちらも拒否 |
| standalone writing / cleanup spool各1対 | 拒否 |
| active zip-spool / zip-assembly / zip-delivery owner各1対 | 他のZIP行がなくても拒否 |
| ready artifact、ready / sending / closing delivery、cleanup artifact → 資源0履歴 | 各生存状態で拒否。removed spool / artifact、key・予約0のclosed assembly、closed delivery、terminal親、成功run、inactive ownerだけなら許可 |

拒否コードは`ZIP_CONFIGURATION_REQUIRED`。各拒否fixtureでconfigured=trueはこの設定ガードを通るが、runtime起動・回復成功の証明とはしない。

ガード前後にZIP 10表と`object_writes`の全行を比較し、不変を確認した。全10 DB対の`pragma foreign_key_check`は0件。refやdeliveryは他の生存資源と整合して存在するfixtureであり、各SQL OR節を独立に無効化するmutation coverageではない。

## fixtureと実行

`zipRepository.integration.test.ts`の最小metadata fixtureを局所参照した。受付・claim・spool publish・assembly close・artifact publish・delivery・cleanupは実repositoryを利用する。standalone debt / ownerと物理削除receiptは、schemaに適合する合成metadataを自己DBへ挿入する。CHECK / FK / triggerの解除はない。

本対はbytesを生成しない。合成削除receiptを実物理削除の成功根拠にしない。runtime、Worker、HTTP、browserは起動していない。

```sh
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/zipBoot.integration.test.ts --fileParallelism=false
pnpm exec biome check packages/core/src/adapters/libsql/__tests__/zipBoot.integration.test.ts
```

主担当から単独Node枠を受領し、session 73596をexit 0まで回収した。再実行は不要。終端後に枠を返却済み。自己設定tmpはafterEachで回収、各自己DBはFK確認後にcloseし、helperが自己DB / WAL / SHMを回収した。

## 限界と返却

設定ファイルの同時書換えによるmtime / size競合、native runtimeのboot順序、旧process終了証明、回復処理、実資源の削除、HTTP / UI、全体型検査は未検証。設定pathの親symlink等、このAPIが保証していない新しい制約を追加していない。fresh / proof / 秘密 / 外部サービスは非操作。

テストと本報告を全文確認し、主担当へ所有を返却する。未回収execは0。返却後は担当ソース・報告を含め全操作を停止する。
