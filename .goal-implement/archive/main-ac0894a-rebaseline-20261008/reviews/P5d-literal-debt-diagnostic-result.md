# LD01-DIAG actual借用結果と公開契約の限定照合

**LD01機能判定: 未成立／held。静的判定: 最終test期待の不整合1件。** 通常3beginで進むDrive connection versionを末尾testが1と期待している。製品欠陥はこの有限範囲では確認しなかった。実際のfailed predicate/実値/native causeは未観測で、静的期待違いを今回のactual原因へ断定しない。

確認日時: 2026-10-06T07:38:21.517686+00:00。Root採用のLDdiag preflight `038ed8285f5cd92d917f92e5f2514ce016f45db712dd0f3a53ea68d4f56f0df9` の後、公開4precheck PASS（actualfalse/rootprobe false/exit0）、default `{preflight:true,executed:false,database:0,newRoot:0}`、sole --executeのRoot safe stdout通知だけを借用した。Verifier自身は実行/defaultpreflight/import/DB/key/native/root probe/createをしていない。

候補 `c5f570524342359ce9c216ef62a29f5e12aa80ec`、source94 manifest `55721abae3950a3515e1e686de289d51b282206bdec2abdac733ba1eae840ebb`、runner `4a06f2f50772bb9af12d2814e52daae722b87d759f9637230eb32b9a1a246032`、loader `9d6103dfd8e8b2c52ea039dfe466adc9eccefd5f3941b276f7138c264d90723a` は既静的preflightを継承。今回は最終test・fixture pages/debts/drains/count、正常account deletion step/verify、Drive repo/Node receipt、currentUser/session、通常beginの必要public9pathsをNOFOLLOW/stable metadata/fullread/Git HEADblobで直接確認した。新test600/他publicsourceの元modeは維持。source/helper/Manager文書・S5/main/B変更0、goal/spec/spec-implement/追加agent0。

## Root借用のsole safe stdout全文

次はRootが通知したJSON全文をそのまま固定したもの。旧raw/private resultの読戻・hash・SQL・row/proof再取得ではない。

```json
{"ok":false,"failure":"tool-exit-or-eof","normalExit":false,"forcedTerm":false,"forcedKill":false,"actualExit":1,"stdoutEOF":true,"stderrEOF":true,"pipeHandlesClosed":true,"normalPipeCloseReceipt":null,"supervisorPGObserved":true,"helperOwnPGObserved":true,"ownPGState":"absent","leaderState":"absent","pollMs":200,"elapsedMs":2026,"outputBytes":836,"events":[{"event":"stage","stage":"literal-debts"},{"event":"fork","sameOwnedPG":true},{"event":"case-failure","case":"LD01","checkpoint":"final-verify-and-cleanup"},{"event":"case","stage":"literal-debts","code":"LD01","state":"failed"},{"event":"diagnostic","stage":"literal-debts","phase":"results","beforeAllStarted":true,"beforeAllEnded":true,"afterAllStarted":true,"afterAllEnded":true,"source":"case","errors":[{"errorClass":"AssertionError","nativeCode":"none","statementIndex":null}]},{"event":"failure","stage":"literal-debts","code":"P5D_CASE_FAILURE","case":"LD01"},{"event":"summary","ok":false,"completed":[],"cases":[{"code":"LD01","state":"failed"}],"forks":1,"forksActualClosed":true,"workerCount":0,"denied":false}],"audits":null,"held":true}
```

Root通知ではPython/Nodeは1、2026ms。known Node PG/leader absent、両PIPE EOF/simple handlesClosed true、force falseを借用。normalPipeCloseReceipt=NULL、normalExit=false、audit=NULL、held=trueを維持する。fixture-closed成功frameもない。stock fork actual-closed booleanはwhole normal合格の代用にしない。actual root54b3ca27／派生TMP及び旧全privateは永久stat/read/hash/import/copy/reopen/DB/cleanup/retry 0。成功根やB実物、S5 sourceも完全非操作。

## LD01-FINAL-VERSION1: 元正常受付と末尾version期待の矛盾

**source因果:** `LibsqlDriveConnectionRepository.ensure` の初期rowはunlinked/epoch0/version1/credentialNULL/folderNULL。testは異なるcommandで正規beginDriveAuthorizationを3回（C/A/B）呼ぶ。通常beginはDriveAttemptRepository.insertを使い、insertはadmitを呼ぶ。admitは元connection repository.replaceで同現在rowのversion+1を保存し、authorization admissionではepoch/credential/folderを変えない。したがって正常3beginが完了したconnection versionは4。

元exchangeは空code→DRIVE_UNVERIFIEDでlinked credential採用へ進まない。退会repo cleanupPageのdrive-connection predicateは `credential is not null or folder is not null`。既unlinked/null/null行は対象外で、epoch/versionを加算するcleanupCopy UPDATEを呼ばない。通常verifyも同秘密存在predicateを使い、この空shellをsucceededの阻害とはしない。repo.findは正式driveConnectionSchemaからその行を返す。この条件下でversion1へ戻す正常APIはない。

現在test finalgroupの `.toMatchObject({state:"unlinked",epoch:0,version:1,credential:null,folder:null})` は通常受付保存契約と矛盾する。これを正常結果に合わせるためにadmission version更新をなくす／retirement shellを巻き戻す製品変更は不要。最小candidateは既test1pathの期待versionをsource-derived4へ修正するか、3begin直後の正規findでcaptured versionを保存し、末尾で同version/epoch/secret-null不変更をassertする。後者を選ぶ場合もdriver/raw SQL書換え、native/ACK proof、fault/timing/resource追加は不要。helperのcaseやschemaは不変更、source manifest依存と必要fresh bindingだけが従属差になる。

この不整合は静的に確定する。ただしsafe frameはfinalgroupへのentryを示すだけで、version assertの実行／実値／その箇所がactual failureだったことは示さない。先行groupへ進むsourceの直列control flowは先行await/assertionを正常通過する構造だが、各domain row/proof/ACK/pinの独立raw receiptをここから補完しない。

## その他の最終群の比例照合

| 最終assertion | 公開正常契約との対応 | actual限界 |
| --- | --- | --- |
| same intent succeeded/verify/null lease | 正規claim→stepCopies→verifyは残EXISTS又はaccountHeldがない場合succeeded/table verify/afterId null/lease nullを保存。f.advanceは既logical2001、64wake上限は維持。 | 最終while/該当assert完了は未観測。 |
| last page `{0,0,true}` | fixtureは元step正常returnをTx commit後だけpagesへ追加。stepCopiesはverifyのprogressed/blocked/finishedの3fieldへ射影するので、この期待shapeは整合。 | 実last page内容は取得しない。 |
| debts0/attempts3消失 | cleanupCopyは各rowのclosed/同runtime-token ACKを要求、正規削除後same intent/owner/locatorをunblock。verifyは残attempt/debtのEXISTSを要求する。 | 削除row実物・同proof個別receiptは未観測。 |
| acknowledged/unacknowledged0 | 元saveDriveAcknowledgmentsはgenuine receiptのsave→DB確定読戻後だけconsume。Node acknowledged map/receipt bindingsから削除し、ended/ACK済entryは元経路で退場する。drainsは正規save/commit結果を観察するだけ。 | DB/native閉鎖やreceipt0の独立観測に格上げしない。 |
| ACK/use/origin table counts0 | f.countは3正式table限定のread-only count。既verifyも対象accountの残rows EXISTSを要求。今回use/originは未seedで、空件数をgenuine credential closure証明にしない。 | 任意値/SQL/raw rowsを読んでいない。 |
| Drive unlinked/NULL/epoch0 | 空code・元未linkedconnectionには整合。version1だけが不整合。 | 全Drive秘密コピーや別linked/legacy familyの受入ではない。 |
| currentUser NULL | deleteAccountの即時account/session fenceとcurrentUser正式readに整合。 | 原password/secret/actor結果の再取得0。 |

この有限scopeで他に明白な期待違い又は製品欠陥は確認しなかった。今回は静的確定のversion不整合があるため、追加subcheckpoint/allowlistを先に広げる必要はない。最小期待修正版候補を独立レビューし、必要な別一巡をRootが採用する場合だけ実行へ進む。修正後も失敗位置が不明なら、現finalgroupを固定subgroup enumへ分ける別最小提案を考えられるが、現在未採用・未実装・実行0。

結論: LDdiag診断は最終groupという有限観測を提供した。LD01/literal2/ACK/caller/resume/監査/全P5dの機能受入は保留。実cause未確定、旧failed heldを維持。報告固定後、対象の全read STOP。

## Root採用追補: runner auditの同じ期待値

RootはLD01-FINAL-VERSION1を修正必須として採用。追加の許可された公開runner全文stable readは25,898 B/SHA `4a06f2f50772bb9af12d2814e52daae722b87d759f9637230eb32b9a1a246032` と一致し、auditの `audit-never-linked-no-copy` にも `d.version=1` のliteralを直接確認した。正常3beginのSource contract（初期1＋admit3回＝4）と同じ不整合である。

最小補正scopeは既testの末尾期待＋既 `.goal-implement/helpers/p5d-literal-debt-runner.py` の当該audit literal。runner側は独立source-derived **d.version=4** と固定し、actual DBの観測値からexpectedを作らない。epoch0/unlinked/credentialNULL/folderNULL/autoBackup0/deletedanchor/one-row、normal PG/EOF/独立FD/fixture gate/query_only/FK/integrityの意味を維持する。test側は4literal又は正規3begin後のversion capture→末尾保持比較を選べる。seed、driver/query操作、資源、期限、業務assertion、native proof/ACK、他audit predicatesを追加・弱化しない。source manifestとrunner binding従属差だけを合わせる。

今回actualではaudit未到達のため、runner literalの不整合を実際のaudit failureとは呼ばない。既EF01の別source/局所PASSを再openせず、LD01の3正規Drive admissionだけに限定する。final page/result/debt/cursorのsource対応は上記のとおりで、他の確定不足なし。修正実装・別実行はRoot handoff後の新scope。全read STOP。
