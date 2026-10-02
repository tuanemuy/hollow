# P5c-1 S5b-2 V1 独立再確認

2026-09-30。候補 `87d0defbcf9e0689c4c062cad39aa28821eff184`。判定は局所 V1 修正の受入可。新しい差戻し事項なし。S5b-2 全体および実 UI 残件の合格ではない。

## 根拠と判定範囲

[主報告](../phases/P5c-1-s5b2-fix.md)、[元独立 V1](P5c-1-s5b2.md)、採用 design の Drive mutation 後再読を照合した。親 `97075ca3a5b02d3c1e4711bc4d76e9614b1b07b3` との差は Settings / PickerPage の source / test 計 4 path のみ。共有認証 hook、domain / ports / adapters、document nonce、routeTree、DDL / lock は不変更。

- Settings の `readOnce` / read queue / `onResolved`（68 / 94 / 168 行）と PickerPage の同処理（65 / 92 / 151 行）は、旧 mutation ticket を復活させず、同 href の現在 actor から新 ticket を発行して純 GET する。mutation 後の失効済み ticket による再読分岐は両画面から除かれている。
- read は実行 1 件・待機 1 件。置換された待機 promise を解決し、各 request が自身の read closure と current predicate を持つ。実行前・await 後・lookup identity の確認により、旧 actor / ABA / locator / unmount の応答を採用しない。cleanup は購読を解除する。
- Settings の入力中 2 値、unknown command locator、receipt の現在性、自動 POST 禁止を維持する。Picker の onBeforeNavigate / pagehide による世代失効と controller dispose、currentUser と settings DTO の document actor 照合を維持し、新しい onResolved は Picker を自動発行しない。秘密文字列の物理消去や Google token 失効まで保証する変更ではない。

独立で影響 2 test file の全 21 対（Settings 13、PickerPage 8）を直接実行し、初回 21 pass / 0 fail / 0 skip / 0 unhandled、test 名集合一致、module failure 0。workspace typecheck も 1 回実行し exit 0、診断 0。新 6 対は同 href mutation 後再読、dirty 保持、旧 controller 失効、read 集約、unmount、A→B→A、別 route / foreign DTO 拒否を確認する。既 15 対の locator / receipt / dirty / unknown / BFCache 局所根拠も成功した。

実 installed TanStack Router の load / invalidate と component 関数・handler・effect を実行している。一方 React hooks と認証 ticket は構造 fixture、onResolved は実 router.emit で明示通知する。公開 Transitioner.tsx の pending 解消時 onResolved 契約（117 行以降）とは整合するが、実 React commit / DOM / hydration / browser の成功根拠にはしない。元候補に対する新 2 対の失敗は主報告の借用であり、今回の独立再現とは記載しない。

不変更 44 対の旧独立成功、および主候補の lint / format / build 成功は指紋一致と変更集合の確認により借用した。今回の全 65 対再実行、build、DB、HTTP、browser、本体 boot、鍵、外部アクセスは 0。

## 固定と終端

新排他 root は `/Users/hikaru/.local/share/hollow/verification/p5c1-s5b2-fix-independent-20260930-D7HLtP`。0700 / directory / no symlink。選別済み公開 helper の metadata と全文を確認後、排他 copy / adapt した。旧 root の result / seal / cache / DB / credentials 読取、旧 root での実行は 0。新 TMP、cache:false、compile cache 無効で検証した。

開始・終了の公開配列を直接比較し、HEAD、owned 21、所有 4、所有外 source、source、apps、dist、entry、shutdown、DDL / lock が全一致。主報告の集合・file count・hash とも一致し、所有外製品変更 0、tracked dirty 0。

|集合|files / bytes|SHA256|
|---|---:|---|
|所有 4|4 / 66,422|`895dbff05c673d463e8eb4963fd9653b55448ee9621e7e480ed5adc1cbb27e6c`|
|所有外 source|1,207 / 15,460,921|`4d689550bcae701eb495bc9b98ac0c2c77007a53b78e5fb178e5c466d9773407`|
|source|1,211 / 15,527,343|`fffd2a74cf321887869e208455cae7cca58f9b99acb144756db79d932ad8aecb`|
|apps|398 / 2,221,900|`cbc6fafde3e58e7dfce934c3e73006601d801c36307f49724022e18a0f348421`|
|dist|8,033 / 203,832,789|`adbd279738e38509456f138b67a116b5c6b5afb93cf3053bda0808912932a098`|
|owned 21|21 / 207,260|`c287d7bb0aa4fdd851a99bd4235431be738b0af81a64a0e65d19e32062d78781`|

entry / shutdown / lock / SQL / snapshot / journal の個別値は主報告と一致し、独立 `fix-start-seal.json` / `fix-final-seal.json` に保存した。集計は canonical JS sort、SHA256＋二空白＋repo 相対 path＋LF。

独立 root 最終 10 regular files / 3,358,862 B、symlink 0、8 MiB 内。DB / material 0。2 run とも exit / close、stdout / stderr の EOF / close を独立確認し、overflow / pipe error / signal / raw error / stack 出力 0。既知自己 4 PID は全 ESRCH、継続 session 0。未知 process / port scan、kill は 0。

次は明示委譲された実 UI で、未構成 unlink の完了後表示が reload なしで unlinked になることをまず確認する。configured selection ACK、同 ID 作成、relink、pagehide / BFCache 等の残件は元 S5b-2 の未完条件として維持する。今回追加 browser / DB 環境は開始していない。

本文を EOF まで確認後、製品・dist・独立 proof・文書の全 read / write / run を停止し、所有を Manager へ返却する。
