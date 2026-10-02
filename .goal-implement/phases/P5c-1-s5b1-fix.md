# P5c-1 S5b-1 V1 修正候補

2026-09-30 18:23 JST。候補 `97075ca3a5b02d3c1e4711bc4d76e9614b1b07b3`。親 `6ac02ce1e30dbb9be1a03e4e24c855d4366a3e69` に対する変更は `DrivePickerPage.tsx` と `DrivePickerPage.test.tsx` の 2 path、52 行追加だけ。P5c-1-E の V1 静的差戻しを修正し、局所 59 対・規定 checks・追加通常 build 1 が成功した。独立再受入前であり、Drive 全体完成ではない。

## 修正と局所根拠

`driveSettingsFn()` 後、応答 DTO の `actor.accountId` を専用文書の `accountId` と照合する。不一致なら既存 `clear()` で世代・設定・receipt・controller を破棄し、有限の認証変更案内を表示して終了する。設定採用、receipt GET、Picker 開始へ進まない。同本人の応答は従来どおり採用する。domain/application/port/DDL の契約変更はない。

fixture は実 DTO の actor shape（accountId/authVersion/browserEpoch）と設定フィールドを持つ。追加 1 対は currentUser=A、settings.actor=B、router 用 fixture.actor=A のままという初回読取を確認する。続いて同本人応答で明示開始できること、pagehide で旧 controller を破棄した後、BFCache 復帰の同じ read が B 応答を拒否することを確認した。不一致時の設定 null、開始ボタン不在、初回 controller/open 0、復帰時の追加開始 0、receipt GET 0、旧 current false、遅着 receipt 不採用を直接 assert している。

これは mocked hook/server-function と synthetic pageshow の局所対であり、実 BFCache/DOM/cookie 切替/Google token 発行の証拠ではない。元 Verifier の V1 は静的所見で、外置き補助反例は製品 assertion 未到達だった。今回も元候補を動的に失敗再演したとは表記しない。client の観測済み本人相違の拒否であり、server 認可を client へ移していない。

## 実行

再利用 root は `/Users/hikaru/.local/share/hollow/verification/p5c1-s5b1-20260930-mz67xJ`。開始時 0700/no-symlink、27 files / 1,500,592 B。dist 8,014 files / 202,484,846 B、空き 216,505,192,448 B を再確認した。既存 run/seal は上書きせず、`fix-run.cjs` / `fix-config.mts` / `fix-reporter.cjs` / `fix-seal.cjs` と排他 `fix-*` label を使用した。cache:false、既 root 内 TMPDIR、秘密・raw body/error/stack 出力なし。

順序は `fix-type-01` → `fix-lint-01` → `fix-format-01` → `fix-unit-01` → `fix-build-01` → `fix-type-02`。全 6 run は初回 exit0、診断0、overflow0。unit は 59 pass / 0 fail / 0 skip / 0 unhandled / 10 files、全 source test 名集合一致。内訳は Picker10、Settings10、Result12、transport12、document8、page5、shutdown2。通常 build 追加1成功、生成後 type 成功。build 後の製品変更0、routeTree 追加差0、lint/format の所有外変更0。

許可された source 探索で初めに `application/drive/read.ts` と誤記して ENOENT が1回あった。`rg --files` で正しい `application/integration/drive/read.ts` を特定し全文確認した。製品検査の失敗ではない。

## 識別と停止

seal 時刻 2026-09-30T09:23:25.401Z。aggregate は JS 既定 sort、repo 相対 path ごとの小文字 SHA256＋二空白＋path＋LF。source 集合は `git ls-files -- apps/web/app apps/web/scripts packages/core/src`、apps はその apps/web 部分集合。所有外は source から今回 2 path を除いた集合で、親からの全 tracked diff が今回 2 path 内であることも確認した。

| 集合 | files / bytes | SHA256 |
| --- | --- | --- |
| 今回 owned | 2 / 21,730 | 0583df8aec3717eee98fe537364def4a97637b1a005edfcea869f531de3aa028 |
| S5b-1 owned | 21 / 193,065 | db6d546c80744e552a44b188e63fcb82c7ec9bbae46dfbc1877b6c613f941bea |
| source 所有外 | 1,209 / 15,491,418 | 1aeafdf19afaf72e045b2a1c35269ddb1485a0dc9b39a78433cfbefefad18cc4 |
| source | 1,211 / 15,513,148 | 3d0101da946f77124a55998e8efb48c31d7a9e65c124b2e0748fb8da892e822d |
| apps | 398 / 2,207,705 | 2fbeeb109b04efd9809b36f10b3d3c46f2fe8661558c7e29f6b3b516601857c7 |
| entry server.node.js | 1 / 3,607,288 | 5a5019499d760ca7f84082f992ef7afa7046753a8da62c4f5889cff6c5a4c389 |
| nodeShutdown.mjs | 1 / 757 | 2de9a259cd47304c93dfe7a8086d9642e9def0ed55a5bd2401d99ffd69cd940c |
| dist | 8,022 / 203,149,244 | c2e7e19fe6ce325de8e81eb66ab032872472fead83f5fb892772ee2e08014b96 |
| pnpm-lock.yaml | 1 / 327,560 | 613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498 |

0038 SQL `d305836ed40bd36d9febf05aaab9c8b1552dbf7b80b23c097110adc428670112`、snapshot `653718f0094ce5651e6f6897669c8290446a7af0d2913e6eb3ea3f5fb84944fb`、journal `83885ffaf002e254a1f983ec61714e587b06c10dcbad4061a284875484b2e5a8` は旧候補と同一。migration/lock/所有外 tracked 差0。製品 dirty0、未追跡は `.goal-implement/` のみ。

新 `fix-final-seal.json` は 1,670,663 B、書込後 root は 44 files / 3,187,762 B（other8MiB 内、DB/material0）。dist は 256MiB 内。全6 runner＋6直接childの既知12PIDは ESRCH。全6runで child exit/close、両 stdout/stderr EOF/close/readableEnded/destroyed を確認。seal 自体も tool session exit0、継続 session0。旧結果/旧sealの内容再読0、上書き0。

DB/移行/HTTP/browser/本体boot/鍵/外部API/actualfresh0。未知 process/port 走査・kill0。元 S5b-1 と今回 fix の証拠を分離して保持する。実 SSR/hydration/production本体停止/390px/keyboard/Google SDK/jobs共存は S5b-2 以降の未検証のまま。

この報告を全文 EOF 確認後、製品・dist・root・報告を含む全 read/write/run を停止して Manager へ所有を返却する。goal-implement の独立再検証へ返すための停止であり、全体 goal の完了ではない。
