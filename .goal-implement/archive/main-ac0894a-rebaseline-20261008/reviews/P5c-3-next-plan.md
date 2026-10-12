# 通常再生成の次slice — 独立計画preflight

2026-10-05T22:43:04Z。**3slice分割は妥当。Slice AはA-P1/A-P2の寿命契約とexact集合の補正が必要で、現案のまま実装開始passにはしない。** 実装未着手の計画照合であり、機能・動作受入ではない。レビュー入力は[次slice案](../phases/P5c-3-next-plan.md)9,213B/SHA256 `b40f2c16ccce58b5827dbd80c94c2c9d70edfc616dc2eb65c6999b939370f921`、regular600と現固定C c2a3d45fの公開source。UIhelpers/runner/C/Bを変更せず、旧資材と退会writer中worktreeは読まない。

## A-P1: 新recipeの前任入力回復に必要なpathがない

対象条件はR08/IM-06・R10、既S3-Dの正規runtime由来/exact前任/DB確定後ACKとAの「legacy本文/opaque前任区分を維持」。`adapters/node/llm/runtimeOwnership.ts:binding`はlocal-original・fixed・preparationVersion1/promptVersion1・llm-conversion receiptだけを受理し、`inputPredecessor`/`verifyPredecessorInput`はそのbindingとleased-text-v1/acquire-confirmed前任に依存する。

因果列: AでV2–4を同receiptの通常claimへ接続→prepare/finishが不明となりmemory/pinを保持→そのruntimeが実終了→後任のbindingは新recipeを拒否→前任proofを発行できず、保持を正規収束できない。安全にheldすることと通常回復提供は別である。現exact集合にこのpathがない。

最小対応は同pathを追加し、新runtime capabilityの提供範囲と版別source/recipe/manifest/receipt束縛を固定すること。旧leased-text-v1/legacyの記録を新形式対応と推測せず、2CASの原子性・不明時同proof保持・確定後consume/ACKを維持する。preview/pendingも対象にするならconsumer別proofの扱いを同契約に明記する。回復を今回提供しない枝がある場合はheldと未完成条件を明示し、Aの完成へ流用しない。DDL追加や全crash保証を求める指摘ではない。

## A-P2: PDF manifest準備後の各reader寿命が未固定

対象条件はR03/R08/IM-06・R10と[既PDF契約](../contracts/llm-pdf.md)の分類実close、逐次再描画/hash照合、ready/confirm現在照合、全未送信/実close時だけ返却。`LlmPreparedSource`は既にV1–4の閉じたunionを持つため、単なるunion追加では寿命を接続できない。

現`llm/worker.ts`はpdf-pendingをsource.read→classifier→sealと処理し、通常V4は保存manifestをpreparedにする。その後、各頁で新しいsource.read→pdfPages.redrawを実行する。`pdfPreview.ts:processPreview`も独立source.read/classifyとready CASを持つ。V4のmanifestは原本bufferや後続readerの終了証拠ではない。一方`NodeRegenerationMemory.finish`はreading/busy/bytes/unknownがない自分のleaseだけからproofを作り、consumeでentryを除く。

因果列: prepareをV4まで拡張→manifest時点でfinish/closed0→従来の頁read/redrawを残すと、その新readerは解放済receipt外となる。原本を保持し続けるだけならdispatch側の入力closed0と衝突する。pending/previewは現fixed version predicateの対象外であり、recipe判定を広げるだけでは通常claimを接続できない。

最小対応は、pending分類・preview分類・固定V2/3準備・V4の各頁redrawについて、通常leaseの取得/逐次read/世代更新/実close/finish確定点とdispatch前条件を短い型付きprotocolとして固定すること。同consumer予約を使う場合も、finish済leaseの再利用や旧世代proofの新read解放を許可しない。manifest/current一致による分類再利用と後続readerの新寿命を分け、各child/Worker/pipe終了不明はmemory/pin/executionを保持する。readyでquota0/本文lock0、confirmの同Tx消費、preview失効→dispatch0は保持する。必要な変更は既worker/pdfPreview/pdfClassificationPorts/regeneration memory等の提示pathsで比例整理し、別transportや全形式再設計へ広げない。

## 成立部分と実行gate

V2 document segments、V3 raster、V4 manifestを具体prepared型で扱い、原本buffer・prepared raster・manifest・object pin・executionを別所有にする方針は妥当。現document/image/pdfPages preparerの結果はWorker/child/pipe実終了後に返り、終了未証明はclosed=falseになる。このadapter契約は保持するが、旧P5b成功を新receiptの寿命成功へ転用しない。原本解放後もV3 rasterはdispatch用入力として残るため、その有限bytes保持とexecution終了は入力原本closed0から独立して証明する。

PDF childは固定Node entry、stdio4、入力pipeline完了/actual exit/child close/各pipe closeを要求する。文書30秒とPDF全準備120秒など既期限は暫定pure/test30秒へ一律縮めない。案にある新child数・派生bytes・stop/pipe・memory枠の詳細化は実行前gateとして妥当で、現計画が追加process/rootを許可した扱いにはしない。generator fakeと実parser/renderの直接寿命対を分ける方針、旧S1–S3全再演0も妥当。

Bのmachine/本文全量採用/undo、Cのimmutable record・記録本人資格/実行者quota分離・現在fence・取得失敗localfallback0・正規UIへの順序に、今回有限確認で別の具体majorは見つけていない。B/Cは粗い次段計画であり、exact/API/case/資源とP5d受入を各slice前に固定するgateが残る。全面future実装調査は行わない。

実root/browser/process/DB/pure/build/外部実接続は0。製品/管理正本/goal/spec/spec-implement操作0。本レビューだけ保存し自己操作を停止する。
