# P5c-3 S2 F1：排他的 begin admission の限定修正案

2026-10-01。基点 `d0af7c24e945958a9f944a33d79b33d4ba418179` はfreeze。独立 `reviews/P5c-3-s2.md` 全86行13,722B（SHA256 `5624297d1db94e9ffa1364b731040ddd8f0c67383d4902b06064fa505d9e0908`）を全文確認した。本書はS2-A/DのF1に限る採用待ち案。製品/DDL/helper/test/DB/runtime実行0、独立の旧gap/helper/privateも読取0。S3は保留。

## 1. 修正する不整合と保持する契約

F1は、旧finishがclosed/0をcommitしたが応答不明でproof未消費のとき、次beginが先にDBをgeneration+1/50へ進め、registry重複で拒否することで旧proofの同値再照合を失う。未消費proofを保持するfinish側は正しく、その照合を緩めない。0043の世代CAS/閉鎖guardを変更して順序不整合を隠さない。

同consumerの開lease・未知lease・未消費proof・進行中/不明begin intentが一つでもあれば、次beginはUoW起動前に拒否する。global100MiB/max2にはDB予約前のbegin intentも数える。予約を取得する処理は同期・有限で待ちqueueを持たず、capacity超過は保存前拒否。consumerはkind＋idの組であり、ownerだけやidだけで衝突判定しない。

## 2. 既 RegenerationInput 内の限定 API

既 `open(receipt)` を廃止し、次の4操作に置換する。新port種類・新table・汎用lock/transaction frameworkは作らない。handleは実registryが発行し、参照identityと所属registryを検証する。JSON同値・別registryのhandleを採用しない。

```ts
interface SourceInputAdmission {
  readonly consumer: RegenerationConsumer;
}
interface RegenerationInput {
  reserveBegin(consumer: RegenerationConsumer): SourceInputAdmission;
  bindBegin(admission: SourceInputAdmission, receipt: ActiveInputReceipt): void;
  commitBegin(admission: SourceInputAdmission): SourceInputLease;
  holdBegin(admission: SourceInputAdmission): void;
  // 既 startRead/endRead/adopt/prepareText/finish/verify/consume/unknown は維持
}
```

- `reserveBegin` はconsumer/capacity確認とreserved entry挿入を一つの同期区間で行う。チェック後にawaitせず、他beginが間へ入れない。予約は50MiBの論理枠でありbytesは生成しない。
- `bindBegin` は正規currentから計算したactive receiptを、そのintentへ一度だけ固定する。同consumer・active・runtime/token/generationの妥当性を検査する。driverが同じUoW callbackを再実行したときは全receipt同値だけを冪等受理し、別世代/ownerへの再bindは拒否する。bindは同期・I/O0。
- `commitBegin` はbound状態だけをleaseへ同期置換する。capacityを解放して取り直さず、同じ1枠を引き継ぐ。delete→後でopenという隙間を作らない。新immutable leaseを返した後、旧admissionのcommit/bindは拒否する。
- `holdBegin` は失敗時の同期settle操作とする。自身のregistryに存在し、一度もboundになっていない`reserved`だけは、DB write未呼出の証拠としてconsumer indexと1枠を返す。`bound`以降はexact namespace/runtime/token/generationを変えずunknownへ保守保持し、read/adopt/finish用leaseを返さない。未知intentもcapacity1を消費し、新beginを拒否する。偽handle・他registry・既settle済み・commit済みへの呼出はno-opで、別entryやleaseの枠を解放しない。元例外を隠さないno-throw境界とし、二重終了で容量を二重減算しない。

Node adapter内部は既Entryとbegin intentの閉じた状態union又は同じconsumer indexで管理する。stateは`reserved`（consumerのみ）→`bound`（exact receipt）→`lease`、失敗枝は`reserved`→終了・枠返却、`bound`→`unknown-begin`。boundからreservedへ戻る遷移はなく、writeはbind成功後にしか呼ばない。既leaseのproof生成→DB確定→consumeまでconsumer indexを保持する。unknown-beginはbyte所有のunknownとは区別するが、両方とも枠を保持する。

## 3. application と DB-CAS の順序

`beginInput` は以下へ限定変更する。

1. `reserveBegin(consumer)`。拒否ならDB read/write0、旧receipt/版/予約量不変。
2. 既UoWのcurrentInputで認可・owner active・memory0・receipt NULL又はclosedを確認。generationを計算する。
3. 同callback内、DB write前に`bindBegin(intent, exactReceipt)`。このlocal副作用は通知/外部I/OではなくDB結果不明に備える所有記録であり、callbackの再試行では同一intent/receiptしか許さない。
4. 既row.write(receipt,50MiB)のversion CAS。false又は例外で成功化しない。旧row/version条件は維持。
5. UoWが確定成功として返ったときだけ`commitBegin(intent)`しleaseを返す。
6. 2–5の失敗はこの所有境界だけでcatchし`holdBegin(intent)`、元のerrorをそのままthrowする。任意例外をDatabaseErrorや成功へ翻訳しない。settleはregistryの実stateだけで未bind解放かbound保持かを決める同期no-throw操作とし、errorの種類やcaller申告のwrite未到達boolから判断しない。

UoW失敗の原因からrollbackを推定しない。認可/read失敗でも一度もbindされていないreservedならwrite未呼出なので枠を返す。DB read自体の呼出を0とは扱わず、write/CAS0と新世代/予約変更0を確認する。driver callbackが先行試行で一度でもbindした場合は、後続試行のread失敗でもboundを保持する。bind後はCAS falseを含めexact receiptを保持し、commit応答不明の場合に新世代を自動発行する、旧proofを消費する、DB50を0へ戻す操作はない。一般的なbegin回復APIは追加せず、bound以降の不明開始は明示未回復の保守保持とする。後段の通常admission設計で回復要件が必要なら別途判断し、今回のF1修正へ混ぜない。

既finishInputは変更不要。旧closed/0応答不明後の新beginはreserve段階で止まり、DBは旧generationのままなので、旧proofのexact同値再照合→consume→次beginが可能。consume完了と次reserveは同期なので、旧proofの確認と新世代確定を交差させない。proofId/runtime/token/generationの一致は一切緩和しない。

| 状況 | 保存・registryの結果 |
| --- | --- |
| 同consumerの並行begin | 最初のintentだけがUoWへ進み、後続はDB0で拒否 |
| 別consumer3件の並行begin | reserve時点で2件だけ通り、3件目はDB0で拒否。既lease/不明intentを含め最大2 |
| 一度もbindされていないDB/current失敗 | write/CAS0・新DB世代/予約変更0を保ち、reserved枠を返却。次の正当begin可 |
| bind後write false/DB失敗 | exact receiptのintent保持、lease0、DB状態を推定せず後続begin拒否 |
| active/50 commit後応答不明 | 同じexact intent保持、lease0/取得0、新世代/予約追加0 |
| closed/0 commit後応答不明 | 旧proof保持、新begin保存前拒否、旧finish同値確認可能 |
| 正常finish確定→consume | 1枠解放後、次beginがgeneration+1を正規保存 |

registryが失われるprocess restartの実終了proofやunknown-beginの回復成功は今回提供しない。JSON receiptだけで所有終了・復活を推定しない。source ACK/Drive lane、consumer取消、consumed raw結果保存は不変更。

## 4. Exact変更予定

| exact path（repo相対） | 最小差 |
| --- | --- |
| `packages/core/src/application/regeneration/services.ts` | SourceInputAdmission型・既RegenerationInputの4操作、open削除 |
| `packages/core/src/application/regeneration/memory.ts` | beginInputのreserve→bind→CAS→commit/hold。finish/unknownの既認可・proof条件不変更 |
| `packages/core/src/adapters/node/regeneration/memory.ts` | consumer/capacityの排他的intent状態、leaseへの同期確定、未bind失敗だけ枠返却、bound以降unknown-begin保持 |
| `packages/core/src/adapters/node/regeneration/input.test.ts` | 既6対のopen fixtureを正規admission3段へ機械追従、元期待を保持 |
| `packages/core/src/application/regeneration/memory.test.ts` | 実Node memory＋memory型UoWによるF1/control/並行/結果不明の追加10対。既finish6対維持 |
| `packages/core/src/adapters/libsql/__tests__/regenerationInputAdmission.integration.test.ts`（新規） | 正式新空0043の限定3対、既InputFixturesを読取再用し変更しない |

6pathのみを第一案とする。新domain/DDL/schema/lock/runner/DI/UI変更0。既 `NodeRegenerationInput` はbeginInputへのdelegateのまま。fakeはPartial/closed-worldで使うportだけを持つため一律no-op追従不要。未知の必須型追従pathが出れば編集前に通知する。新testで既fixture label `application` を新rootだけに使い、旧application DBを開かない。

## 5. 最小比例検証

新DBなし10対は、(1)control、(2)F1修正対、(3)同consumer並行、(4)3consumer容量競合、(5)開/unknown lease保持、(6)未bindの認可/read失敗でDB write0・枠返却・次の正当begin可、(7)CAS false保持、(8)保存済みcommit不明保持、(9)未保存write例外保持、(10)他registry/JSON handle/再bind/二重commit拒否と偽handle・二重settle・commit後誤settleで枠を解放しないことを有限表で確認する。(6)では2件の未bind失敗でも全容量が塞がらず、(9)では先行bind後のcallback read失敗でも枠を戻さないことを区分する。新source read/prepare/HTTP0、DB write回数とgeneration/memory/opaque proofのboolだけ記録。実adapterを使い、fixtureだけで排他動作を実装し直さない。

DB3対は正式0043で(1)closed/0 commit応答不明→次begin拒否で旧全typed値不変→旧finish再照合→次generation成功、(2)同consumer並行beginで1つだけwrite、(3)active/50保存後応答不明で新begin拒否/1予約のみ、を同一新DBの通常順で確認。3は意図した未回復intent/予約を保全し、cleanupで消さない。逐次writer1であり複数SQLite writer競合の実証とはしない。

既Node memory6＋既finish6＋追加10＋DB3＝25対を直接予定。case数と内部assertion数を分ける。S2旧source/domain/SQL移行/native/workerは不変更根拠を借用し137全再演0、今回25へ重複加算しない。native13はbegin内部順変更に届くため独立側が必要と判断した代表対を別枠で選べるが、本修正の主HTTP/worker予算は0。既begin通常成功は実SQLite3対で確認する。

規定typecheck→lint:fix→format→上記局所。build0（通常DI未接続/本段未許可）、source/旧DDL43まで/lock/distの前後指紋とcandidate commitを固定する。対の失敗を範囲拡張や期待緩和で埋めない。

## 6. 新資源の提案（未許可）

新root0700 prefix `p5c3-s2-fix-20261001-XXXXXX`、64MiB。logicalDB1/16MiB（正式新空0043、WAL/SHM含む）、helper/log8MiB、NodeTMP8MiB、material256KiB、余裕31.75MiB。fixture原本はDBのsynthetic metadataだけ、実原本file/鍵/HTTP/textworker/native/appboot/Chrome/外部0。testworker1/DBwriter1。失敗DB保持・同DB再試行0、追加DBが必要ならRootへ返す。

case pure2秒/群60秒/外側90秒、DB各10秒/群120秒/外側180秒、type/lint/format各180秒、通常close5秒・自己child/pipe終了10秒、停止猶予60秒。先の新版supervisor/finite reporterは主報告末尾exact公開表から許可された場合だけmetadata/fullSHA→自分の同一性記録→新root適応。旧root実行・旧private/result/DB/key/cache読取0。compile cache無効、rawerror/stack/秘密0、各子/両pipe/close/group終端を別観測。toolwait50秒以下。新helper/reporter smoke1はDBなしで先行する。

## 採用判断点

Rootに求める採用は、既RegenerationInputの4操作への限定差、holdBeginを未bind時だけ同期解放する失敗settleとしbound以降のunknown-beginは最大2枠内で保守保持して自動回復を追加しない方針、exact6path/主25対/新1DB枠。S2-A/D以外の要件変更なし。独立F1の2対は反例根拠として保持し、修正後成功へ書換えない。

本書のみ編集。全文EOF確認後、製品freezeを維持し文書を含む全read/writeを停止してRootへ返却する。

EOF
