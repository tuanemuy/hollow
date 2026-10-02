# P5c-1 S3 実close・保存caller・ACKの補足案

2026-09-29。実装前の静的補助。対象は [S3契約案](P5c-1-s3-contract.md) 1〜4節と、[designのDrive境界](../design.md#google-driveの連携境界)。本書の署名・順序修正は採用待ちであり、S2製品の修正・S3実装・独立受入ではない。

## 結論と不足する証拠

S3案2節の「local-closeはunknownだけ」「activeは元callerを優先」は、元callerの保存がDB例外で終端しactiveが残った場合に収束しない。実close後の保存rollbackは、実資源unknownとは別の状態である。

現 `application/integration/drive/ports.ts` のrun/result/closed/stopには外側保存Promiseの状態がない。S3案の `coordinate(phase, work)` もtargetを識別せず、`run` のworkはprovider処理であって `runner.ts` の後続UoWではない。したがって、closed proof、DB active、coordinatorが空という情報だけで「まだ保存を始めていないcaller」と「保存失敗で終了したcaller」を区別できない。時間・Map不在・DB leaseで補完しない。

最小修正は、adapterがexact targetの**元callerのPromise終端も所有して観測する**こと。applicationに可変registryを置かず、native終了証拠とcaller終了証拠を別に保つ。rootの既drain集合だけで同じことを行う場合も、target付き登録・照会をapplicationへ渡す面が必要であり、現portのままでは完結しない。

## 最小port案と登録位置

S3案のtarget/proof/ACK/coordinateを維持し、DriveExecutionへ次の2面だけを加える候補とする。`C` は正規claimが返す型付きrow等であり、native値や秘密のregistry保存用型ではない。

```ts
withCaller<C, T>(
  target: DriveExecutionTarget,
  claim: () => Promise<C | null>,
  settle: (claimed: C) => Promise<T>,
): Promise<
  | Readonly<{ kind: 'not-claimed' }>
  | Readonly<{ kind: 'settled'; value: T }>
>;
caller(target: DriveExecutionTarget): 'pending' | 'ended' | 'untracked';
```

`settled` はcallback Promiseが成功した意味だけで、業務成功やclose証明ではない。callbackのrejectは同じrejectとして伝播する。registryは値・例外本文・tokenを保存せず、exact識別子、値/例外を保持しないdrain用Promise<void>と有限状態だけを持つ。

1. applicationが既operation参照とこれからCASするfresh ownerをtargetにする。client値をownerへ転用しない。元案の「claim済みrowからだけ作成」を、この事前登録のために修正する。claimはそのtargetと一致するrowを確定する。
2. `withCaller` 自身が `coordinate('claim', ...)` を使う。lock内でacceptingとadapterの既2owner headroomを照合してpending登録し、短いclaim Txへ進む。既DBのglobal2/account1照合はclaim callback内に残し、registryの空きをaccount枠の代替にしない。登録に失敗したらclaimもHTTPも0。登録はclaim結果の外側callerへのhandoffより前であり、claim→runの空白を作らない。
3. claimがnullで不成立を確定した場合だけ、未実行の登録予約を解除する。claim例外・commit不明はHTTPを開始せず証拠を保持する。missing rowを保存成功ACKへ読み替えない。元案の不明時停止は維持する。
4. claim lockを解放した後、adapterがsettle callbackを直接呼ぶ。callbackは当該ownerのrun開始、result/closedの受領、最終DB保存、正常経路の**最初のACK試行**までを含む。後日のACK再照合・再試行の全寿命までは含めない。次ownerの処理は別targetのwithCallerとし、このcallbackの外へ分ける。
5. callbackのresolve/reject後、adapterのfinallyが短い `coordinate('settle', ...)` でendedを記録する。このend処理にはDB/ACK待ちを含めない。元callback内のsettle critical sectionが解放された後に行い、nested coordinateにしない。queued endよりmaintenanceが先ならpendingとして保留するだけで、正当結果を先取りしない。
6. run開始前の失敗も同じfinallyを通る。ただしcaller endedだけでclosedにしない。adapterが未開始・native factory未呼出・将来開始不能を封じたことを明示記録できる場合は、所有対象0の終了証拠を作れる。request等を一度でも作った場合は全実close証拠が別途必要。不明な登録不在を「要求0」の証明にしない。

withCallerはHTTP全体をcoordinator lock内で待たない。二重target登録を拒否し、登録からendまでを既global2の同じentryで数える。新しい無制限caller集合・第三の実行枠・保存列は作らない。ACK済みでもcaller pendingのentryはendまでdrain用に残し、endでproofを再生成しない。ended後の未ACK証拠は既64＋2案の同一entryを継続保持し、値を複製しない。

## 六つの代表状態遷移

以下は試験候補となる静的期待であり、実行結果ではない。localの判定は同じmaintenance critical section内でcaller状態とexact proofを確認してから行う。untrackedはendedではない。

| # | exact targetの状態 | 許される遷移・禁止事項 |
| --- | --- | --- |
| 1 | 実close証拠あり、caller pending、DB active/unknown | 元callerの保存を優先して保留。結果破棄・回復CAS・ACKを先回りしない。終了時間を推測しない。 |
| 2 | 実close証拠あり、caller ended、DB再読で同owner active | rollback等で未保存のownerを回復対象に加える。既cancel/terminalを保持。認可・refresh等は有限失敗＋closed、送信済createは既identity/sendsを保つclosed reconciling（取消/現在失効なら既failed）。late結果採用・外部再送0。 |
| 3 | 実close証拠あり、caller ended、DB再読で同owner closed | 保存済candidate/ready/completed等を変更せずACKだけ。commit後のACK例外やcommit応答不明でも、再読で確認できた業務成功を失敗に書き換えない。 |
| 4 | caller ended、実close証拠なし、DB active/unknown | 保持。native実終了未証明を保存失敗回復で迂回しない。stop成功・枠解放・DB close不可。 |
| 5 | caller ended、DB unknown、後からexact実close証拠成立 | 元の失敗/cancel/terminal等を保存してclosed CAS→commit→ACK。DB不可読/CAS不明なら証拠を保持。late business valueは再採用しない。 |
| 6 | pending登録→claim成立→provider開始前に元処理失敗 | endedと、明示的な未開始・将来開始不能の証拠を別々に得る。両方成立時だけ同owner activeを#2へ。不明なnative開始があれば#4。単にrunを呼べなかったというapplication例外だけで閉鎖しない。 |

前任実終了proofは既3節の経路を維持する。local callerの不在で前任扱いせず、専用runtime終了証拠がある世代だけを回復する。DB復旧待ちを時間上限だけでACKに変えない。

## 正常commit後・同operation継続前のACK順序

元案のcoordinateは、次の厳密な包含関係なら競合を阻止できる。単なる「claim直前」のlock外accepting確認では不足する。

- 元callerの `coordinate('settle')` は、正常UoW commitから同proofのACK awaitまでを含む。ACKをfire-and-forgetにしない。
- 同operationの次owner claimは `coordinate('claim')` 内でacceptingを**再検査**してからrow/CASへ進む。直接callback・手動継続・runnerのいずれも同じinstanceを通す。
- ACK成功ならlock解放後に次claim可能。ACK失敗ならproofを残してlockを解放し、次claimはaccepting=falseで拒否する。旧ownerはDB照合可能なまま残る。ACK不明時にadapterが先にproofを忘れる実装は不可。
- maintenanceも同じ順序で既closedを確認してACKする。callerがendedになる前の通常ACKは正当であり、endedを正常ACKの必須条件にして循環待ちを作らない。endedが必須なのは**代行回復**の開始である。

したがって同operation継続を新しい機能で止める必要はない。既案の「settle＝commit＋ACK」「claim lock内再検査」を明文化すればよい。純receipt GETはこの新claim判定で外部操作へ変えない。

## stopと影響path

rootは新claimを閉じてexact owner abortを開始するが、settle/end/maintenance laneを閉じず、coordinator lockも保持しない。登録済caller callbackをdrainしてからended/proofを有限照合し、DB commit/ACKを進める。caller drain中に同callerを待つmaintenanceや、ACK再試行の全寿命をwithCallerのcallbackへ戻す構成は禁止する。stop内から同じcoordinatorを再帰取得しない。

実close未証明・DB不可読・ACK未確定は保持停止であり、stopのrejectを正常終了にしない。callback終了、全native実終了、保存/ACKがそろう前にrootがDBを閉じない。ACK失敗によるcaller reject自体はdrain観測可能だが、未ACK証拠の保持とは別に扱う。

最小変更候補は `application/integration/drive/ports.ts`（上記2面）、`runner.ts`（exact caller wrapper、local ended activeの回復分岐）、`connection.ts` / `folders.ts`（claimのwrapper内移動）、新Node Drive execution/root（登録・end・drain）に限る。既domain/repository/0038/authBrowserに追加差は提案しない。具体claim callbackをこの境界へ移せない箇所があれば実装前に主/Managerへ返す。

## 確認範囲・返却

根拠はS3契約案1〜4節、採用designの「caller最終保存まで所有」「application可変registryなし」「exact実close→CAS→commit後ACK」、現ports.ts/runner.tsの静的照合。S2主担当の並行修正を評価・変更せず、S3案のlifecycle不足だけを扱った。

製品/test/DB/runtime/build/format/外部/旧proof操作0。新規実行資源0、静的読取execはすべてexit0で終端回収。六代表は未実行、型/有限DB/実HTTP終了の証明ではない。本書だけを作成し、全文EOF確認後に文書を含む全操作を停止して所有を返却する。
