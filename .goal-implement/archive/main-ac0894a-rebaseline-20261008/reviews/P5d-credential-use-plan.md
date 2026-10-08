# P5d credential-use契約の独立静的レビュー

## CU1 exact4path案の限定追補

2026-10-05T22:08:32Z。Managerの固定追加案だけを独立照合した。新plan全文/製品実装の再reviewはしていない。**追加4pathの新規native credential-owner方向は限定採用可。legacy一般移行/収束は未解決、P5d-E/F/Gの該当受入を保留する。** 追加4pathはまだ未編集で、実取得/閉鎖/再開の成功ではない。

exact集合は新 `packages/core/src/adapters/node/auth/credentialRuntimeOwnership.ts`、既 `packages/core/src/adapters/node/auth/config.ts`、`packages/core/src/adapters/node/openrouter/config.ts`、`apps/web/app/server.node.ts`（P5d isolated treeだけ）。Google/OR別namespaceを `dirname(canonicalDB)/.credential-runtime/{google,openrouter}` に固定し、version1/credential-use-v1/canonical DB file identityへ束縛する。configured native各factoryでuse claim前に正規acquireを完了し、no-follow/mode/exclusive/fsync/exact前後一致からprivate typed current/acquire-confirmed predecessor capabilityを発行する。closed/callerEnded済み未ACKも元runtime/token/generationのexact照合で収束させる。この限定案は直前CU1の新規owned use/crash枝を閉じる設計として妥当で、Driveのproofや他service namespaceを流用しない。

legacy use無行は新owner recordからnever-ownedへ昇格せず、正規旧whole-Node cutover capabilityが無ければupgrade gateでheldとする。この拒否は安全性を守るが、legacy debt最終EXISTS0と一般保持移行の成功証拠ではない。fresh DBでnative new-useが成功しても既Google/OR unknown/未ACK/無use行を回収できるとはしない。旧whole callback/native終端と有限exact legacy集合のprovenanceを得る正規handoffが未確定のため、そのCU1依存を消さず、P5d-E/F/Gの該当条件は未完成のまま残す。

この追加案に新たな設計majorは検出しなかった。native/fake枝・actualclose/wholecallback end・private proof/ACKの前段制約とlegacy heldを維持する限り、既10path＋追加4pathの限定実装へ進める。path予算/新phase採用はManager正本で確定し、恒久heldやTTLを完成へ数えない。source/製品/別worktree読取0、runtime/新root/PID探索/旧資材/実接続0。本書追補だけ保存してwriter/readを停止し、所有権を返す。

## 初回固定案の静的評価

2026-10-05T22:06:47Z。[固定案](../phases/P5d-credential-use-plan.md)=7,474B/SHA256 `3839fc13083167e573c527393b0c01d7f05567ed9ec6bf68dab13ceaee72edb0`、regular/nonlink/nlink1。**native閉鎖/whole callback/opaque proof/actor fenceの方向と提示10pathの最小補正は計画採用可。CU1のownership/factory/legacy閉包は未確定、P5d-E/Fの機能受入は不可。** Managerは中間報告から前者を採用済み。追加ownership/factoryはexact案前・製品未編集を維持する。

[P5d-A–H](../criteria/P5d.md)、[account-delete契約](../contracts/account-delete.md)と、main公開既sourceのGoogle/OR HTTP、provider/execution、callback/採用、既Drive runtime ownershipを必要範囲でread-only照合した。P5d backendは別担当の別worktreeで実装中、本書はその完成候補レビューではない。新追加機能は未実装/未検証、製品基点C c2/new3488Bに対する既P5c合格を退会受入へ転用しない。

## 静的に妥当な最小方向

| 対象 | 根拠・採用境界 |
| --- | --- |
| HTTP実所有 | 既googleHttp/openrouter HTTPはagent:falseのClientRequest、IncomingMessage、socketを所有し、finallyでdestroy後にrequestClosed/各実closeを待つ。abort/timeout/attempt failedやPromise settledだけで閉鎖を認めない案は正しい。provider別の新HTTP proofは不要 |
| whole callback | 現Googleはexchangeだけexecution内で、その後claims採用UoWは外側。OR complete/retryは全体を囲むがcheckConnectionのreveal/採用UoWは外側。reveal前のuse保存からprovider、結果採用/失敗保存、callback finally終端まで囲む補正は必要範囲に合う |
| exact proof/ACK | native provider＋execution＋use元tupleをprivate registryへ結合し、real closeとcallback endの後だけclosed/callerEnded/versionをCAS/再読してACKする。公開boolean/state/fake providerの成功を証明へ昇格しない。commit/ACK応答不明は同exact proofを保持しsaved同値を再照合する。別use/別version一般の推測解放0 |
| 退会/遅採用 | known accountはdeleted/authVersion fence後のclaim/reveal/refresh/adoptを禁止し、元ownerのclose/失敗保存/ACKだけ許す。Google未解決account-nullは後からemailでaccountへ付替えずbrowser hash/epoch＋元attempt/versionへ束縛する。全未解決useの閉鎖/ACKまでidentity/copy縮小をglobal debtへ残す方向は安全 |
| 全コピー/進行 | OR candidate/verifier/credential/providerUserId、Google identity/claims/verifier/challenge等を、関係するactive/unknown/callerEnded未確定/未ACK useの閉鎖前に縮小しない。他table/pageは進め、最後のEXISTSにglobal debtも含める。native return時にcredential/claimsをpublic resultへ返さず、JS文字列zeroizationを証拠にしない |

この案のattestationは正規native factory/transportからだけ発行する必要がある。現GoogleOidc/OR providerはrequestFactory注入が可能なので、class名/instanceof/型一致だけをnative capabilityへ昇格しない。fake/legacy run(work)はheld枝へ置き、実ClientRequest/response/socketの終了とwhole callback終端が登録されたowned枝だけを証明にするという案の制約を維持する。

## CU1: 正規credential-ownerとlegacy収束の閉包が未固定

重大不足は案自身が残したこの依存一つ。現Google/OR executionにはuse claim前に保存するruntime ownership/provenanceがない。追加10pathだけでは、crashでprivate proofが失われたunknown useやuseのないlegacy attemptを安全に回収完了へ収束させられない。永続held/debtは早期秘密縮小を防ぐが、P5d-Fの最終EXISTS0/succeededを満たさない。

最小補正の範囲は以下に限定できる。

- credential-owner adapterと正規factoryのexact pathを固定し、canonical DB binding、credential service namespace、owner runtime/token/generationを正規acquireでclaim前にdurable保存する。既Driveのregular/no-follow/mode/exclusive/fsync・保存record再照合・acquire-confirmed predecessorの方式を再用できる。Drive自身のgenerationや他serviceのproof、PID不在/lease expiryだけをGoogle/OR証拠へ流用しない。
- legacy cutoverをadmission fence→正規旧callback全終端/native全close→有限exact attempt集合のprovenance保存に束縛する。現execution.stop()だけはGoogle/OR checkのrun外late採用を待たないため、それだけで旧callback全終端とはいえない。whole callbackの正規handoff境界が取れない行はlegacy-unproven debtのまま、cleanup succeededを拒否する。
- exact predecessor capabilityから元owner tupleを変えずにowner-closed→closed-useを同Tx/CASで保存し、そのsaved同値をACKする。active/unknownだけでなく、closed/callerEnded済み未ACKのままcrashした行も同exact前任束縛で収束可能にする。commit/ACK応答喪失時の再読は同intent/use/version/provenanceを保持し、再終端・他ownerへの付替えをしない。

既protocolの再用で限定的に閉じられる不足であり、provider全体の汎用基盤・新HTTP proof・新外部接続は不要。具体adapter/factoryとlegacy handoffの正当束縛を採用するまで、追加未定pathを黙示に編集しない。未解決loginの新attemptが旧identity縮小後に旧accountへ遅採用されないことも、use終端後の元attempt actor/target/result/authVersion再検査と全入口fenceに含め、active-only projectionのnullを「identity不存在」に置き換えない。

## 未実装と受入の区分

提示10pathと既正式集合内のgoogle.ts/OR connection/deletion schema/repo/worker/0044へ閉鎖・fence・held枝を接続する最小採用は妥当。P5d-C/Dの遅採用拒否と秘密なしshellは、この方向だけで実装済みにはならない。CU1が未閉包の間はP5d-E/Fと退会全完成を受け入れず、追加owner案の固定→製品候補の型/guard/実closure/ACK/有限回収検証を別委譲に残す。別backend担当の作業を本計画レビューで成功判定しない。

自己の新DB/runtime/provider接続/test/pure/root/browser/build/probe0、旧private/validation/D01/DB/結果/秘密資材読取0、外部/音声0、P5d別worktree source0、製品/全体管理/goal編集0、spec/spec-implement使用0。本書だけ保存し、全read/report操作を停止。Managerへ所有権を返す。
