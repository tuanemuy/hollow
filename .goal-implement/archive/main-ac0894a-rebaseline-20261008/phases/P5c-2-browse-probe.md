# P5c-2 一覧分岐診断候補

## 現在結果

2026-10-01 JST。候補 `574ef4704de74e39392e1d273e2f7e2169d2d88c`、基点 `d71ab6f14eeb007fef44269e6581e91b6db3c5d7`。診断DOM属性のみの4pathコミット。規定typecheck→lint:fix→format→局所14対→build1→postbuild typecheckは全成功。製品の一覧不成立の原因修正・R05/OR01/02/09・S3 G/Hの受入完了は主張しない。新候補の実UI・hydrationは未検証。

- `data-browse-stage="route-suspense"`: NotesPageのSuspense fallback。Flight promise以外のclient module/lazy等の待機も含み得るため、Flight待機とは断定しない。
- `data-browse-stage="location-mismatch"`: 既存の全条件identity比較がfalseとなったBoardの安全guard。
- stage省略時は属性なし。enum以外の値、actor、検索条件、秘密を属性に出さない。
- route/query/state/fetch/retry/invalidate、条件比較、表示text/layout/ARIA、Deferredは変更していない。S3 B/C/D/Fの実装へ到達する差はない。過去受入は借用で、新候補で再演していない。

## Exact変更

1. `apps/web/app/components/browse/BrowseSkeleton.tsx`: optional union2値とrootのdata属性。
2. `apps/web/app/routes/notes.index.tsx`: 既Suspense fallbackへroute-suspense指定。
3. `apps/web/app/components/hollow/ScopedNotesBoard.tsx`: 既`!locationMatches`分岐へlocation-mismatch指定。比較関数・入力・条件は不変。
4. `apps/web/app/components/browse/BrowseSkeleton.test.tsx`: 新9対。

既管理文書以外のuser差は開始時なし。管理正本・core・DDL・lock・設定の変更0。コミットは上記4pathだけ。

## 直接検証と限界

| label | 結果 | 根拠 |
| --- | --- | --- |
| smoke | exit0 | 新wrapperのstdout/stderr有限計数・両pipe end |
| type | exit0 | pnpm typecheck |
| lint | exit0 | pnpm lint:fix、出力はbyte countのみ。stderrありを隠さず保持、warning詳細の分類は未実施 |
| format | exit0 | pnpm format、対象外差なし |
| test | 14/14、failed0、skip0 | 新DOM7＋caller公開source対応2、既requestState5 |
| build | exit0 | pnpm build、追加1回、S3系列計3 |
| posttype | exit0 | 生成後pnpm typecheck |

DOM7対は省略時の旧markup一致1、2stage×3layoutの属性以外のmarkup同値6。class/role/ARIA/text/span数を保持する。caller source2対は指定位置とguardを静的確認するもので、実component遷移・hydration・stream成立の証拠ではない。既requestState5はcurrent identity/旧応答拒否等の比例純対。全labelでknown child close/exit0、stdout/stderr endを取得し、signal終了0。各wrapper自身も通常exit0。チェック失敗・再実行0。app/browser/DB/HTTPを起動しておらず、それらの終了証拠を推測で追加しない。

## 公開指紋

今回の集約方式はpath昇順の`{path,bytes,sha256}`配列をJSON.stringifyしてSHA256。sourceはgit tracked apps/packagesと新test、distは相対path。以前の報告の異なるcanonical方式のSHAと直接比較しない。開始時source/distの件数・bytesはd71ab6f報告と一致。

| 集合 | before count/bytes/SHA256 | after count/bytes/SHA256 |
| --- | --- | --- |
| source | 1280 / 17061055 / `0719661d76bada610515cbc066a1cb79f57cd697023894eb6d9e38bdce373f93` | 1281 / 17063567 / `2630ab32f62e6f4782c7db2b9937910092fca61188a9cbec6991d09f53fa2fd8` |
| dist | 8609 / 214637767 / `24c27d1a09bca0b363a79953ae4680d7ec785133ada561ace83f47def6c97e06` | 8659 / 216010119 / `17cfdb397c539566470e4d4416a79ff153ae25b1a0eed4d0b20652e53bafdde8` |
| migrations全体＋pnpm-lock | 84 / 7236273 / `455c0658fd5201ff12ee72349abe75490e496279e2e5ab3ff382c8f8714a9e09` | 同一 |

source行比較は変更4・削除0・許可外変更0。0040以前を含むmigration/meta/journalとlockは全行同一。

- `apps/web/dist/server/server.node.js`: 3723330B、before `2749b15b1db69788dcd82c0d3266eaebdd6bf0f04825750372e5b3fdef473e04` → after `8d82b08d97810002ce52a8cc9fd01e63bdd1ccb33a5cc8e50208e117b9a812d4`。
- `apps/web/dist/server/nodeShutdown.mjs`: 757B、両方 `2de9a259cd47304c93dfe7a8086d9642e9def0ed55a5bd2401d99ffd69cd940c`。

## 資源・器具

新排他root `/Users/hikaru/.local/share/hollow/verification/p5c2-s3-browse-probe-20261001-yS1sZw` はdirectory0700/non-symlink。最終3,526,293B、NodeTMP0、dist216,010,119B。root32MiB、helper/log8MiB、TMP8MiB、別dist256MiB内。DB/key/原本/app/browser/network0。既proof/private/helper/DB/key/results/cacheの参照・実行0、補助なし。

新公開helper allowlistは上記rootの`run.cjs`だけ。regular 7238B、SHA256 `f907ecc586a7584748033d8f763e56297716047d9f387da7017fa7a513b11033`。資格/秘密埋込なし。新wrapperは外側require catch、子processのraw stdout/stderr非表示、test JSONはmemory内から有限count/boolだけへ投影して破棄。保存したsealは公開source/dist/hash配列、結果はcode/count/boolのみ。全wrapperでNODE_DISABLE_COMPILE_CACHE=1、TSX_DISABLE_CACHE=1、新TMP指定、Vitest cache無効。旧helper流用0。次担当が使う場合はmetadata/fullhash→全文確認を先行し、参照先の私的成果物を無断に読む許可にはしない。

## 引継ぎ

本属性は次の独立実UIで原因分岐を識別する手段だけである。新candidate/distの指紋を使用し、d71ab6fでの過去UI成功・失敗へ遡及しない。次のbrowser/DB/HTTP資源は未許可。候補返却時点で全read/write/run停止、known検査子/両pipe/wrapperは通常終了済み。管理正本の更新と独立検証への委譲はRootが行う。
