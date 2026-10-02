# P5c-1 S4 E/F V1 局所修正

## 現在の候補

2026-09-29 14:07 JST。候補 `a85ccdd84bd1a690e68e752e8d38cf904d11aebf`。基点は `c4c5eb08560488433d0eff0a81b235dcd6b25683`。独立[元報告](../reviews/P5c-1-s4.md)を全文読了し、Eのresult route/currentとFの同境界だけを修正した。所有2pathのみcommit、製品dirty0。Managerの独立受入は未実施。

元反例の期待を維持し、修正前fail1、修正後pass1を別証跡で保持した。最新component30＋transport12の42対、workspace型、lint:fix、formatは成功。DB/HTTP/実ブラウザ/build/native/fresh/移行/鍵/note/実APIは全て0。S5、Dの未構成/needs-relink解除は未実装・未完のまま。

専有root: `/Users/hikaru/.local/share/hollow/verification/p5c1-s4-fix-20260929-ekFQtr`。0700、14regular files/30,730B、DB0、material保存0、other8MiB以内。既失敗/独立結果を上書き・削除しない。

## 製品差と適用範囲

`DriveResult.tsx` はidごとのscope objectを持ち、読取結果と有限エラーをそのscope及び既authentication operation ticketへ束縛する。同じidへの通常再renderではscopeを保持し、A→B→Aでは新scopeへ切り替える。現在scope/ticketに一致する結果だけを表示し、旧resultのhandlerもwork実行前に拒否する。

各非同期処理のfinallyは取得時のscopeだけを解放するため、遅いAがBのflightを解除しない。遅いAの成功/失敗/後続GET、actor失効後の結果を新画面へ採用しない。通常同idの明示取消・ACK不明後の純GET・30回までのpoll・React transition pendingは維持する。receiptやerrorの生内容を保存/ログへ追加していない。

`auth.drive-result.tsx`と`useAuthenticationOperation.ts`は不変更。route keyによる強制再mountで独立反例の前提を消さず、同componentへidだけを変更したときにも成立する修正である。route key追加の効果は今回検証根拠に数えない。server current/認可/CASをclient判定で代替しない。

testは旧6対を維持し、state/refを同mountの再render間で保持するharnessへ補強した。旧エラー文字列の期待は同じまま、scope付きstateのmessageをassertする。新6対は次の集合。

1. 表示済A→B GET拒否、即時旧panel非表示、保持した旧handlerのread/POST拒否。
2. 遅いA GET成功→B待機枠を解放せず、Bだけを表示。
3. A→B→AのABAで旧A不採用、id欠落時は旧panel/自動GETなし。
4. 遅いA mutation失敗でBのerror/flight/後続GETを汚染しない。
5. actor変更後の旧表示/操作/遅いGET拒否と、新actorからの明示純GET。
6. 正確なid/versionで取消、route変更後の遅い成功を不採用、現在idのACK不明は再POSTせず純GETで回復。

構造・hook代替・event呼出の根拠であり、実DOM/hydration/390px/Tabの成功ではない。既Settingsのdirty等はcomponent回帰で確認し、共有hook/Settingsを変更していない。

## 直接結果と履歴

|証跡（新root直下）|結果|包含/意味|
|---|---|---|
|`before-v1.json`|元独立1対fail、unhandled0|readB=true/rejected=true、staleA=true、cancelledOld=true、mockPOST1。製品欠陥の修正前直接根拠|
|`after-v1.json`|同1対pass、unhandled0|readB=true/rejected=true、staleA=false/cancelledOld=false/mockPOST0。期待/操作を変更していない|
|`type-before-tests.json`|workspace型exit0|新6対実行前|
|`result-12.json`|12/12|旧Result6＋新6。後の42に内包|
|`lint-final.json`|lint:fix exit0|既severity設定不変更、有限error diagnostics0|
|`format-final.json`|format exit0|無関係formatter差0|
|`component-transport-42.json`|42/42、7files、skip/fail/unhandled0|旧component24＋新6＋旧transport12。12や元反例を足して42と称さない|
|`type-final.json`|workspace型exit0|整形後最終source|

新独立反例1の修正後成功は42とは別実行。事前failを合格数へ足さない。今回追加の準備失敗・DB失敗・HTTP試行はない。主のV1修正を独立検証済みとは扱わない。

実行入口は新rootの`run.cjs`だけ。既Node `/nix/store/4gl9pclv6ygwmgpg1gijza978bqbmpga-nodejs-22.22.3/bin/node`。modeは`independent`、`unit`（明示7file）、`type`、`lint`、`format`。checksはそれぞれ`pnpm typecheck`、`pnpm lint:fix --diagnostic-level=error --max-diagnostics=100`、`pnpm format`。順序は型→lint→format→42→型で最新差を確認。出力はcount/bool/有限code/公開pathだけ、元assert diff/stack/rawerrorなし。

新runnerは許可modeへ限定しDB modeを拒否、旧独立runnerに不足するlint/formatを明示追加。子envは既safe allowlist、compile/tsx cache無効、TMPDIRは新rootの`temp-gen2`、worker1/bail1。結果はwx、2MiB出力上限とother8MiB事前guard。各selfchildの実close後にESRCH/両pipeClosedを確認して次へ進んだ。

## 固定条件・借用・未実施

|条件|今回の候補判定|根拠/境界|
|---|---|---|
|P5c-1-E route/current|局所修正成立|元反例の正負、新6、component30/transport12。遅い旧id/actor/ACKを分離|
|P5c-1-F 同境界|局所修正成立|型/checks/42、限定commit/全終了。build/同bundle実UIはS5未実施|
|S4 A/B/C、構成済みD、P1-E Shell/P2a-E履歴|不変更根拠を借用|2path以外の全tracked差0。独立元121のapp48/pure17/persistence20、S3 wire26/closure10、authprune8、DDL3は再実行していない|

Dのneeds-relink/未構成解除は元報告どおり未完。S5静的案へ引き継いだが今回control/Settings/ports/DDLを修正していない。Drive backend、原本、LLM、Google SSO、移行、配備、秘密設定の意味を変更していない。全体A〜F完成や実Google成功へ拡張しない。

## 識別

canonical aggregateはJS既定`.sort()`のrepo相対path順に、各`lowercaseSHA256 + two spaces + path + LF`を連結したSHA256。個別commitbytesが正本。31path配列はS4公開集合を保ち、所有2以外の29は基点と同値。全tracked diffもこの2pathだけで、管理/proof/privateをcommitしない。

|所有path|bytes|SHA256|
|---|---:|---|
|`apps/web/app/components/hollow/DriveResult.tsx`|12330|`d573935a50c9a9fb5761723a1058df7090e5341959d18e01d4a326ec8dc0785a`|
|`apps/web/app/components/hollow/DriveResult.test.tsx`|16049|`624f9d95c50b52d63552e95d85f208d275b4335510bdf1a2e4619f180fbd7134`|

- 所有2 aggregate: `0aa938b60014614cdc87038382985d069fa3014de33e0ee2c8accb5ad8420184`
- S4集合31 aggregate: `59c6969c19f2f75c73296c4d7af7057c82650005eed34dc710bfc28b336cec31`
- SQL: `d305836ed40bd36d9febf05aaab9c8b1552dbf7b80b23c097110adc428670112`
- snapshot: `653718f0094ce5651e6f6897669c8290446a7af0d2913e6eb3ea3f5fb84944fb`
- journal: `83885ffaf002e254a1f983ec61714e587b06c10dcbad4061a284875484b2e5a8`
- lock: `613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498`

新`final-seal.json`8039Bに完全31配列/commitbytes/immutable比較/所有2/資源を保持。SQL/snapshot/journal/lockはS3基点とも同値。distは今回非操作/build0であり、新bundle生成・検証と称さない。旧fresh/保全はread/copy/driver-openも0。

## 公開再現資材と停止返却

旧Iの許可5本だけをlstat regular/no-symlink/正確bytes→全文read→COPYFILE_EXCLで新rootへcopyし、path/許可checks/candidate sealを適応した。旧Iの実行/write/result/private/DB読取0。新root直下の公開allowlistは下記。各regular/no-symlink確認済み、秘密なし。独立側が再利用する場合も新rootへの選別copy/適応だけで、元root実行や結果一括copyはしない。

|path|bytes|用途|
|---|---:|---|
|`independent.test.tsx`|3415|元V1期待不変更。hook保持型、同actor A→B拒否後の旧取消防止|
|`independent.config.ts`|494|上記exact1test、新root/includeへ適応|
|`run.cjs`|3720|有限mode/allowlist/checks/子env/実close/出力抑止|
|`reporter.cjs`|883|finite case/count/endのみ|
|`seal.cjs`|6999|公開31配列/owned2/commit/不変更/資源照合|

14:07:27 JST時点でroot14files30,730B、DB/WAL/SHM0、temp DB空、other/material予算内。8selfchildすべてESRCH・両pipeClosed。HTTP/server/socket/browser/nativeを作成しておらず、広域process/port走査・未知PID/forcekill0、自己未回収exec0。補助を起動していない。

本書をEOFまで再読した後、製品/test/helper/文書を含む全read/write/runを停止しManagerへ所有を返却する。S5や未構成解除の実装は開始しない。
