# Slice A formal plan — 独立preflight

2026-10-05T22:57:55Z。**A-P1/A-P2補正版は計画preflight pass。Managerの契約採用・実装委譲判断へ返す。製品実装/動作/機能受入は0。** [正式案](../phases/P5c-3-formats-plan.md)12,988B/SHA256 `ce2200520b51375c2ee5a70ec4295fbd455061ed991ad0e1bd9dbf12d9f82b88`、regular600/nonlink/nlink1を直接固定確認した。現C c2a3d45fの公開sourceと[前案のA-P1/A-P2](P5c-3-next-plan.md)、既PDF/文書/画像/入力寿命契約へ比例照合した。

## A-P1 pass: capability・child出生・前任proof

runtimeOwnershipをexact集合へ追加し、新record3/leased-local-v2だけがV1–4・pdf-pending・pdf-previewの閉じたbindingを提供する。旧record2/leased-text-v1はfixedV1だけ、legacy-unverifiedはproofなしという区分を保持する。consumer/id・executor/note/command/source/owner/receipt gと合法recipe/manifest/pageのexact束縛、opaque registry最大2、前任64、active/unknown同Tx owner closed→receipt closed0の2CAS・第二失敗rollback・不明結果の同proof保持・確定後consume/ACKは既S3-Dの条件に沿う。

image/PDFは親PID不在だけで閉鎖しない。spawn前birth reservationを元runtime正本へpersist→actual PID同bindingをpersist→その後だけ原本pipeline開始とする案は妥当。登録失敗時も元handleを保持し、actual exit/child close/pipeline完了/4pipe close後だけslot closeする。前任は記録済親・全known childのESRCHを別照合し、birth未確定/EPERM/生存/PID疑義はheld/proof0/ACK0。この限定normal recoveryをbirth-gap全crash保証へ広げないため、未確定不在推測による偽解放を避けられる。

実装時の同graph配線は必須確認点。現sourcePreparerはprivateなimage/pages adapterを内部生成し、configは別pdfPagesも生成する。新lease prepare/classify/redrawの全native呼出を元runtimeのbirth/knownPID/close callbackへ接続し、旧無観測factory枝へ戻さないことを確認する。提示config/input/memory/imagePreparer/pdfPagesPreparer内で型付きwork routingを構成する余地はあり、sourcePreparer全体再設計は要求しない。実装上その内部dispatcherの変更が必要になれば、案どおり追加exactpathを先に申告する。現在の計画に推測のpath不足majorは追加しない。

## A-P2 pass: fresh g・actual finish・dispatch current

固定V1–3準備、pending分類、preview分類、V4各頁redrawをwork/resultの対応した型として分け、原本adopt/busy/reading/unknownと実Worker/child閉鎖を同leaseへ結ぶ。pending/preview分類はfinish同g closed0確定/consume後だけseal/ready CAS、strictV2再準備も新g、V4はmanifestだけをread終了証拠にせず頁ごとfresh gを取得する。confirm後conversionは別consumerでありpreview proofを借りない。各頁は同g/current/source/manifest/取消を再照合してからその頁だけ発注するため、旧proofの次read解放とreceipt外の従来readを残さない契約になる。

正式0043のconversion/preview guardを直接読み、NULL→active g1、closed0→active g+1、同g active/unknown→closed0、unknown ownerでのmemory解放拒否が既に成立することを確認した。sealPdfも現在owner/token/version/source/epoch/取消・dispatch不在のCASを持つ。案の「実finish CAS後に最新保存値を再照合してseal/ready/dispatch」はこれらに整合する。これだけで新repository実装成功やDDL不要の動的証明にしない。

finish応答不明は同opaque proof/lease/execution/object pinを保持し、same consumer/runtime/token/g/proofId/closed0だけでconsumeする。別g/read/JSON/current GETは解放根拠にしない。current認可失効と物理終了cleanupを分け、次begin/dispatch0、先行送信の論理消費1/旧本文保持、全未送信正式dispatch集合＋実close時だけ返却という条件も維持される。ready quota0/本文lock0、ready失効dispatch0、確認同Tx消費と元recipe/policy/hash保証は不変。

派生raster8MiB/頁PNG4MiB/文書segments/manifestを原本memory/pinと別に保持し、既executionの生成/応答処理終了で参照を落とす。原本closed0を派生消失・GC/RSS保証へ転用しない。全頁PNG cache0、取消/finish unknownでdispatch0のまま保持、未知child/pipeの原本・pin・execution heldも明示され、前案の所有混同を解消する。

## 範囲・有限条件・未検証

20exactpathsはapplication port/current/worker/preview、Node input/memory/config/runtime/native factory、preview exact claim repositoryと新比例testsに限定され、既prepared V1–4 union・codec/renderer/recipe/prompt/保存型/旧DDLを増やさない。Machine/Drive受付は後続、音声は保留。旧S1–S3/旧P5b成功は不変更byte/hash/policyの報告借用だけで、新receipt/native proof接続の直接成功へ転用しない。

検証予算案はroot192MiB、app32/native32/opaque8/audit8のDB80MiB、原本8MiB/派生8MiB/log-material-tools16MiB、Worker最大6・同時1、native child最大6・同時1、ledger最大2slot。文書/画像30秒・PDF120秒・頁10秒/stop60秒を短縮せず、pure30/群120・app10/群180・native360/外480・自己既知child TERM10/KILL10/pipe10を別期限としている。signal要求を終了へ数えない。具体root・公開fixture・各case順・candidateを実行前に固定するgateが残る。small fixture/fake generatorを32頁64MiB上限・RSS・全PDF互換・外部品質の直接証明にしない点も妥当。

計画の重大不足は今回有限照合で残っていない。birth-gap/legacy unknownの一般回復、実native終了、新CAS/guard/型・module配線・資源実測は未検証で、実装候補の独立照合と正式実行が必要。旧private/D01/actualfresh/failed roots・退会writer中treeを読まず、root/DB/runtime/test/browser/probe/実外部/音声・製品/管理正本/goal/spec操作0。本レビューだけ保存し自己read/report writerを停止する。
