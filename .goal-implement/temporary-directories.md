# 旧 reviews 内の一時ディレクトリ

`du -sk <path>` を今回実行した結果。単位は KiB（割当量）。削除は行っていない。

利用者は D01 の旧データを含まないことを条件に削除を承認した。削除前調査で3個とも旧 DB のバックアップを含むと判明したため、削除せず保全する。検証環境本体はコミット対象から除く。調査のコマンドと結果は [cleanup.md](cleanup.md)。

| ディレクトリ | KiB |
| --- | ---: |
| `.goal-implement/archive/main-ac0894a-rebaseline-20261008/reviews/p3b-1-independent.QtYhXV` | 13964 |
| `.goal-implement/archive/main-ac0894a-rebaseline-20261008/reviews/p3b-2-independent.qGd0HC` | 59068 |
| `.goal-implement/archive/main-ac0894a-rebaseline-20261008/reviews/p3b-2-v1-independent.ZLdUG3` | 54252 |
