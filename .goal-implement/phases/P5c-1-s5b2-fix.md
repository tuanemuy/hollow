# P5c-1 S5b-2 V1 局所修正

2026-09-30。候補 `87d0defbcf9e0689c4c062cad39aa28821eff184`。親は `97075ca3a5b02d3c1e4711bc4d76e9614b1b07b3`。指定4pathのみ、422追加/15削除。独立受入待ちであり、S5b-2のconfigured残件・実UI再検証を完了扱いしない。

## 修正

[独立V1](../reviews/P5c-1-s5b2.md) とdesignの「DriveSettingsとDrivePickerPageのmutation後再読」に対応した。固定D/E・IN-09・React reconcileが出所。

- SettingsとPickerPageのmutationは従来どおり現在ticketのままworkとrouter.invalidateを実行する。invalidate後に失効した旧ticketでreadしようとする分岐を削除した。
- 各画面のonResolvedで同href・現在actorの新ticketを発行し、純GETとしてsettings/receiptを再読する。旧ticketを新世代へ付け替えない。Settingsの入力中chooseAccount/consentは再読で初期化しない。
- 各画面のreadを実行中1件/待機1件に集約する。待機の置換は古い待機promiseを解決し、実行直前と各await後に現在性を確認する。待機requestは自身のread closureを持ち、異なるlocator/accountの古いclosureを流用しない。
- receiptは現在lookup identityとticketへ束縛する。unknown command locatorと自動POST禁止を維持する。subscriptionsはcleanupで解除する。
- PickerのonBeforeNavigate/pagehide/sign-outによるgeneration失効・controller disposeは維持。onResolvedはGETだけで、自動Picker発行やselection再送はしない。BFCache復帰は従来の純GETと明示開始、currentUser/settings DTOのdocument account照合を維持した。
- 共有useAuthenticationOperation、domain/ports/adapters、nonce/document政策、DDL/lock、routeTreeは変更0。

変更pathは `DriveSettings.tsx` / `DriveSettings.test.tsx` / `DrivePickerPage.tsx` / `DrivePickerPage.test.tsx`。製品/testだけをcommitし、管理/proofを含めていない。最終git statusは未追跡 `.goal-implement/` のみ。

## 局所根拠

実installed TanStack Routerとmemory historyを使用するcomponent制御対を両既存test fileに追加した。component関数・handlers/effects・実router.load/invalidateを実行し、invalidateが実際にonBeforeNavigateを通知して旧ticketを失効させる。React hooksは既構造fixture、認証ticketもfixtureのrevision/actorでモデル化している。onResolvedは公開Transitionerの契約に合わせて実router.emitで明示通知する。実DOM/React commit/ブラウザ再現とはしない。

|追加6対|直接確認|
|---|---|
|Settings mutation|未構成unlink1回→同href invalidate→新GETでunlinked、同command receipt、dirty2値保持|
|Settings read集合|resolve連続通知でread最大1実行/1待機、置換応答不採用、unmount後queued未実行/subscription解除|
|Settings ABA/route|A→B→Aの旧応答不採用、最新ticketだけ採用、別hrefでonResolved GETなし|
|Picker mutation|receipt work1回→実invalidateの旧generation破棄→新GET/receipt再取得、Picker追加発行0|
|Picker read集合|実invalidate連続通知の集約、遅着/queued/unmount拒否|
|Picker ABA/actor|A→B→A旧応答拒否、再読settings DTOのforeign actorは不採用/開始不可|

修正前対は新proofのVite load pluginで、指定2製品sourceだけを公開git blob `97075ca...` に差し替えた。worktree巻戻し0。新mutation対2件はいずれもAssertionError、0 pass/2 fail/61 skip、unhandled0。これは期待した修正前失敗として保持する。failureのraw message/stackは出していない。

修正後の初回局所は63/63成功。その後ABA2対を追加し、規定順 `type-01` → `lint-01` → `format-01` → `unit-02` → `build-01` → `type-02` を全て初回exit0で完了した。最終65 pass/0 fail/0 skip/0 unhandled、10 files、source test名集合一致。内訳は既59＋新6。既Picker/Settings/Result/transport/document/page/shutdownの比例範囲を維持し、外部/DB全枝の再演0。既foreign DTO/BFCache局所、dirty、unknown locator、receipt A/B・actor拒否、SDK dispose/期限境界も成功。

type/lint診断0、overflow0、lint/format所有外差0。format後の製品手編集0、通常build1成功後に生成後type成功、routeTree追加差0。独立Verifierは新65対のうち必要範囲を直接検証し、不変更部分を借用できる。ブラウザでのunlink即時反映、configured ACK/作成/relink/pagehide等は次の明示委譲・実UIの未完条件として残す。

## 実行・保全境界

新root `/Users/hikaru/.local/share/hollow/verification/p5c1-s5b2-fix-20260930-2D1C7D`。0700排他/nosymlink、DB/鍵/material/browser/HTTP/外部/actualfresh 0。新root内TMPDIR・cache:false/compile cache無効。既private/DB/results/資格読取copy0、旧root実行/書込0。

公開既helperのmetadata/hash→全文EOF読取後、run/reporterだけを新rootへ排他copy/adapt。旧rootの既run結果・sealは読まない。config/sealは新規。新root最終22 regular files / 1,664,845 B、helper/log上限8MiB内。材料0。distは開始8,022 files / 203,149,244 B、空き220,618,588,160 Bを確認し、別枠256MiB内でbuildした。

全8run（修正前対、初回63対、規定6run）はchild exit/closeとstdout/stderr EOF/closeを独立記録し、overflow0・pipe error0・signal0。修正前対だけ意図したexit1、残りexit0。最終既知16PIDはESRCH。tool継続session0、自己server/socket/browser起動0、未知PID/port照会・kill0。raw error/stack/body/秘密出力0。

## 固定識別

JS sort・SHA256＋二空白＋repo相対path＋LF。新root `final-seal.json` に公開file配列、`final-summary.json` に以下と終了値を排他保存した。所有外sourceは4pathを除いた同tracked集合。commit差と最終statusから所有外変更0も確認した。

|集合|files / bytes|SHA256|
|---|---:|---|
|所有4path|4 / 66,422|`895dbff05c673d463e8eb4963fd9653b55448ee9621e7e480ed5adc1cbb27e6c`|
|source|1,211 / 15,527,343|`fffd2a74cf321887869e208455cae7cca58f9b99acb144756db79d932ad8aecb`|
|apps|398 / 2,221,900|`cbc6fafde3e58e7dfce934c3e73006601d801c36307f49724022e18a0f348421`|
|所有外source|1,207 / 15,460,921|`4d689550bcae701eb495bc9b98ac0c2c77007a53b78e5fb178e5c466d9773407`|
|dist|8,033 / 203,832,789|`adbd279738e38509456f138b67a116b5c6b5afb93cf3053bda0808912932a098`|
|server.node.js|1 / 3,607,288|`085bddeb458f84c3bd4aed8cc4a38a843b732e16a26a6676a78718fcf6e7a5a1`|
|nodeShutdown.mjs|1 / 757|`2de9a259cd47304c93dfe7a8086d9642e9def0ed55a5bd2401d99ffd69cd940c`|
|lock|1 / 327,560|`613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498`|
|0038 SQL|1 / 33,297|`d305836ed40bd36d9febf05aaab9c8b1552dbf7b80b23c097110adc428670112`|
|0038 snapshot|1 / 382,618|`653718f0094ce5651e6f6897669c8290446a7af0d2913e6eb3ea3f5fb84944fb`|
|journal|1 / 5,762|`83885ffaf002e254a1f983ec61714e587b06c10dcbad4061a284875484b2e5a8`|

報告全文確認後、製品・dist・proof・文書の全read/write/runを停止し、所有をManagerへ返却する。独立受入前に次browser/DB段を開始しない。
