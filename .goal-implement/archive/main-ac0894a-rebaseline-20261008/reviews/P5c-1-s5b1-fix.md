# P5c-1 S5b-1 V1 独立再確認

2026-09-30 18:27 JST。候補 `97075ca3a5b02d3c1e4711bc4d76e9614b1b07b3` は今回の局所条件で合格。P5c-1-Eの静的V1は解消した。S5b-1の他の局所根拠は前回独立確認から維持する。Drive A〜F全体、実SSR/browser/SDK/production本体/freshの完成判定ではない。

主修正報告全文、元V1、固定E、採用designの修正条件を照合した。変更は親 `6ac02ce1e30dbb9be1a03e4e24c855d4366a3e69` に対するDrivePickerPage.tsx/test.tsxの2path・52行追加のみ。製品修正と管理4正本編集はしていない。

## 根拠

settings GET後、設定採用前にDTOの `actor.accountId` と文書の `accountId` を照合する。不一致は既存clearで世代を進め、設定/receipt/controller参照を捨て、有限案内でreturnする。後段のreceipt GETや選択開始表示へ進まない。同本人の正常経路は維持する。初回表示・明示再読・BFCache復帰はこの同じreadを通る。

新1対はcurrentUser=A/settings.actor=B/router fixture.actor=Aを保持し、初回拒否・controller/open/receipt GET 0を直接確認する。その後の同本人応答では明示開始でき、pagehide後のBFCache復帰でB応答を再び拒否する。追加開始0、旧current=false、遅着receipt不採用も確認する。fixtureは実DTOのactorと設定shapeを持つ。

これはmocked hook/server-functionと合成pageshowによる局所動作確認である。実tab/cookie/BFCache、実token発行の検証ではない。元候補を動的に失敗再演したとは扱わない。旧外置きfixtureは再実行していない。

## 直接実行・借用・未検証

- `fix-unit-01`: page5（新1＋旧4）成功。1file、全test名集合一致、fail/skip/unhandled/moduleFailed 0、初回exit0。
- `fix-type-01`: 全workspace型検査成功。診断0、初回exit0。
- 不変更54対は、親からの差が上記2pathだけであることを確認し、前回独立58対のうちpage旧4を除く54の成功を借用した。今回は59全再実行ではない。
- 主候補の59対・規定checks・追加build1と生成後type成功は報告の根拠として区分する。独立lint/format/buildは0。
- 実SSR/hydration/production listener停止/390px/keyboard/SDK/Google/jobs共存/actualfresh0038は未検証のまま。

## 識別と終了

自己I `p5c1-s5b1-independent-20260930-Sr9Gqs` を再利用し、排他fix helper/label/sealを追加した。旧記録を上書きしていない。cache:false、I内TMPDIR、unit対象はpage1fileだけ。主のprivate/result/finalsealは読取・コピー0。

開始18:26:47.068、終了18:27:33.237 JST。JS既定sort・SHA256＋二空白＋repo相対path＋LFの同一集合で、開始/終了の全配列と主報告が一致した。

| 集合 | 件数/bytes | SHA256 |
| --- | --- | --- |
| fix owned | 2 / 21,730 | 0583df8aec3717eee98fe537364def4a97637b1a005edfcea869f531de3aa028 |
| S5b-1 owned | 21 / 193,065 | db6d546c80744e552a44b188e63fcb82c7ec9bbae46dfbc1877b6c613f941bea |
| source所有外 | 1,209 / 15,491,418 | 1aeafdf19afaf72e045b2a1c35269ddb1485a0dc9b39a78433cfbefefad18cc4 |
| source | 1,211 / 15,513,148 | 3d0101da946f77124a55998e8efb48c31d7a9e65c124b2e0748fb8da892e822d |
| apps | 398 / 2,207,705 | 2fbeeb109b04efd9809b36f10b3d3c46f2fe8661558c7e29f6b3b516601857c7 |
| entry | 3,607,288 | 5a5019499d760ca7f84082f992ef7afa7046753a8da62c4f5889cff6c5a4c389 |
| shutdown helper | 757 | 2de9a259cd47304c93dfe7a8086d9642e9def0ed55a5bd2401d99ffd69cd940c |
| dist | 8,022 / 203,149,244 | c2e7e19fe6ce325de8e81eb66ab032872472fead83f5fb892772ee2e08014b96 |
| lock | 327,560 | 613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498 |

0038 SQL/snapshot/journalは前回独立・主報告・開始終了で全一致。製品dirty/所有外tracked差/migration差/lock差0。sourceは `git ls-files -- apps/web/app apps/web/scripts packages/core/src`、appsはそのapps/web部分集合。

今回2runner＋2childの4PIDを含め、自己記録の既知18PID全ESRCH。両runでchild exit/close、stdout/stderr EOF/close/readableEnded/destroyed、overflow0。tool session0。I全体33files/6,349,084B、DB/material0、other8MiB以内。DB/HTTP/browser/本体boot/鍵/外部/移行/actualfresh0、未知process/port走査・kill0。

報告全文EOF確認後、文書・製品・Iを含む全read/write/runを停止し、Managerへ所有を返却する。
