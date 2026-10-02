# S5b-3 C3 起動前 guard 静的レビュー

2026-09-30。初回判定は **限定工具修正待ち（blocking 1件）**。末尾の差分再確認でG1を解消済みと判定した。製品欠陥の指摘ではない。実行・import・HTTP・browser・DB・秘密参照先の読取は行っていない。

## 対象と根拠

新root `/Users/hikaru/.local/share/hollow/verification/p5c1-s5b3-20260930-nZZe1Y` の次の3公開fileだけをmetadata/hash照合後、全文EOFまで読んだ。全てregular/nosymlinkで申告と一致した。

|file|bytes|SHA256|
|---|---:|---|
|harness-c3.cjs|33,080|34b81a871a2a9d8f8377fce40b239216b65c799490d2802a07e94b52969ebe27|
|pause-v3.cjs|2,909|6a5e85fb3973a8c30c521dc9f48bd394857fba4e623cc7e416efe7b49b4553cb|
|observations-c3.cjs|5,665|bec99f5c30e44104a4556401b56e3c98e2367eb4debbae2467605e312d42a4f0|

主申告のpause純20/20、predicate4、serializer18、構文5成功は借用根拠であり、独立再実行していない。C2失敗経緯はManager提供の事実として扱い、旧結果は読んでいない。

## Blocking G1: 未取得結果のGET診断が全mutation解除になる

`harness-c3.cjs:75` の `explicit-get-required` は、現在actor・receipt未取得・一意visible/enabledの結果確認button・選択観測だけで成立する。その診断を `pause-v3.cjs:10` が通常resumeとして受理してpendingを消し、`harness-c3.cjs:78` が `mutationPaused=false` にする。

その後、command入口の制限（63行）とroute側のnon-GET拒否（100行）がともに外れる。通常 `click`（85行）などから新POSTを開始できるため、純GET診断を「未取得結果を解決済み」と同等の解除根拠にしている。二重resume拒否自体が正しくても、この最初の解除は広すぎる。

Managerは今回のレビュー中に、`explicit-get-required` は結果確認GETだけの権限であり、未取得のまま新mutation/全POSTを許可しないと確定した。この分岐ではpause/GET専用制限を維持する。既存 `read-result` がGETを実行できれば十分で、全解除を経由する必要はない。GET後に現在scopeと取得済み有限結果を確認して新mutation可否を別判断する。GETを許可する条件に期待業務結果の成立を戻さない。

修正対象は工具のみ。レビュー担当は修正していない。

## 静的に確認できた改善

- `harness-c3.cjs:63–71` はpause中でも `read-result` を許可する。入口にtrash等の業務結果成立は要求していない。許可routeと一意visible/enabledの正規「結果を確認」buttonを確認している。
- `pause-v3.cjs:6–10` はpauseId・actor/page/generation・POST件数の一致を要求する。readは一度だけclaimでき、旧scope・POST増加・二重read/二重resumeを拒否する。
- `observations-c3.cjs:10–18` はnavigationでgenerationを更新し、現generationのsettingsとuser一致からactorを構成する。旧generationの観測を現在のreceipt/settingsへ採用しない。
- `harness-c3.cjs:100` はpause維持中のGET/HEAD以外をabortする。`read-result` 後にも総POST・selection POST・issue POSTの不増を確認する。元selection POSTを再送する分岐は `read-result` にない。
- `evidence` はpause中でも利用できる。取得済み結果を有限観測し、`observation-settled` を別途判断できるので、GET到達前にtrash成立が必須となる元の循環は残っていない。
- 非必須begin応答のbody取得不能は `harness-c3.cjs:106` の内側catchで `BEGIN_BODY_UNAVAILABLE` として分離する。一方、有限serializer/shape等の失敗はpauseへ残す。body取得不能と未取得の業務結果成立を同一扱いしていない。

## 追加観察・未検証

`read-result` の `accepted:true` / `paused-pure-get` は、クリックが受理されPOSTが増えなかった根拠であり、receipt GETの完了・同command/receipt・期待業務結果の成立を単独では証明しない。実行担当は後続の観測結果と区分する必要がある。現在の250ms待機とtask snapshotだけをGET完了へ読み替えない。

上記G1以外に、今回指定された同じ循環・純GETへの過剰制限のblockingは検出していない。TOCTOUを含む実ブラウザ挙動、実GET件数/応答、製品動作、停止契約全体の受入を主張しない。C3起動前にG1の限定修正を再確認する。

この報告だけを編集した。全文EOF確認後、全read/write/runを停止してRootと主へ返却する。

## G1差分の静的再確認

同日。**G1解消、指定差分の限定静的受入可**。次の公開2fileをmetadata/hash照合後に全文EOFまで読み直した。regular/nosymlink・bytes・SHA256は申告と一致した。

|file|bytes|SHA256|
|---|---:|---|
|harness-c3.cjs|33,667|c06df8aa5bf53cef67d3500e6a0e19f083735854127d42f1c777ace54ef307cf|
|pause-v3.cjs|3,600|6c246b868e8b86d3eca22ab4c88a2f615b8cfd120b2754b6c118cf4714cbd040|

`observations-c3.cjs` は不変更とのManager申告で、前回の全文読取を借用した。再読・再実行していない。主申告の純26/26と構文2成功も借用であり、今回の独立根拠は静的読取だけである。

- `pause-v3.cjs:11` の `explicit-get-required` はdiagnosedだけを設定し、pendingを消さない。二度目の同診断を拒否する。`harness-c3.cjs:79` も全解除を `observation-settled` 受理時だけに限定した。純GET診断後もpause・command制限・routeのnon-GET拒否が維持される。
- `harness-c3.cjs:64–72` の `read-result` は業務結果成立を入口条件にせず、一意visible/enabled・同pauseId/scope/posts・一度だけのclaimでクリックできる。クリック直後は `getComplete:false` を明示する。
- クリック前のsequenceを保持し、最大30秒の有限待機で、現在actor・同generation・sequence増加したreceipt観測を別に確認する。既読 `observations-c3.cjs` のreceiptイベントは通常GET・現generation・正常envelope/shape確認後にだけ追加される。さらに総POST/selection/issue不増と、`observeRead` での同pauseId/actor/page/generation/posts一致を必要とする。
- `pause-v3.cjs:10–11` はclaim済みの完了観測を `readObserved` に一度だけ記録する。別の明示 `observation-settled` はそれがないと解除できず、harness側も取得後の期待条件を確認する。元の「GETを行うためにtrash成立を要求する」循環は復活していない。

G1の範囲内に残るblockingは検出していない。完了観測は同scopeのreceiptイベント増加という採用された証拠であり、静的レビューから実HTTP件数・実クリックとの厳密なrequest因果・ブラウザ競合の不存在までは主張しない。30秒内に未完了なら `getComplete:false` のまま停止制限を維持し、自動GET再試行やPOST解除で補わない。実行時の業務結果と新mutation可否の判定は別である。

工具修正・実行・import・HTTP・browser・DBは0。本追補を含む全文EOF確認後、全read/write/runを停止してRootと主へ返却する。

EOF
