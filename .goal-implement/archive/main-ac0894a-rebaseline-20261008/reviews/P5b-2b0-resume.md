# P5b-2b0 再開時の独立照合

## 結果

2026-09-28T15:58:35.277+09:00、受入済み製品と旧Pの公開probe25/原本24は固定指紋にすべて一致した。今回の作業はread-onlyの同一性照合だけで、B修正のコードレビュー・型検査・動作probe・DB検査は実施していない。既合格A/C/D/E/Fの旧根拠を取り消す変更は、この照合対象では認められない。B不合格V1は未解消扱いを維持し、修正候補の正式独立検証は別途必要。

## 対象と方法

goal-implement/SKILL.md と manager-loop.md を全文再確認。Manager委譲の公開hashlogicを事前に読み、新0700専有R `/Users/hikaru/.local/share/hollow/verification/p5b2b0-resume-20260928-LcZjFq` へ排他copyした。

- 旧独立Q `p5b2b0-independent-20260928-jAjTOp/clone.cjs` のcopyを `final` 引数で実行。公開manifestの個別hash/aggregateと原本byte/hashだけを検算し、資産copy0、R/final-copy-check.jsonだけを新規保存した。
- 旧P `p5b2b0-probe-20260928-TwAYeL/product-seal.cjs` のcopyをRで実行。秘密path guardを先行する既定方式で製品source/apps/entry/dist/lock/HEADを検算し、R/product-accepted-seal.jsonだけを新規保存した。
- 固定Node22.22.3 `/nix/store/m73kcssdrviw0jabgrvqb87k4sd7h8qv-nodejs-slim-22.22.3/bin/node` を使用。旧P/Q内scriptの実行・書込0。単一session85874をexit0まで回収し、未回収exec0。

## 一致値

公開指紋の時刻は2026-09-28T15:58:29.636+09:00、製品指紋は15:58:35.277+09:00。

| 対象 | 観測・受入値と一致 |
| --- | --- |
| 旧P 公開probe25 | `b55135963f6d900e075825fd45c45e5163f851ec207319f5ad5a9d7080c61338` |
| 旧P 原本24/34,653B | `863f8a52ebf62d7c1cff837cbecbd9a34087ccaae9b98a21b2df5a54d3373fd2` |
| HEAD | `3650ec61c45c4ad4ab0cf62b96c8dba08e70a34c` |
| source1246 | `49ed62b1ab785932d80439ece3465822d32998f9b6561563cb40c4933a1b9568` |
| apps/packages1119 | `53329b45cb0bb5c293ddc8cad26bb558ce35bb575f94f5a77edb8df357f9bfe9` |
| Node entry | `fd90576d565a2d026aa097a52c7843dffb3c304565eb2fce1ca902a79247a16c` |
| dist7512 | `ac00cac8e587e9e3465ae412ea5deb8857573392e7e40d1525651ac5d52d342e` |
| lock | `613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498` |

## 適用範囲と停止

A/C/E/Fは旧公開logic/inputと製品が同一であり、[前回の独立結果](P5b-2b0.md)の限定合格・主借用・未測定範囲を保持できる。同じ試験を今回再実行したとはしない。Dは先行受入を維持し、migration領域/DBは今回非読取・非実行である。修正中S（NEz2Xy）は非操作・未評価であり、その変更が既合格条件へ影響するかは新候補固定後に判断する。

主Sの環境所有と混在せず、新Rの純粋hash用execだけを使用した。報告全文確認後は自己exec0、文書を含む全read/write/run停止としてManagerへ返却する。
