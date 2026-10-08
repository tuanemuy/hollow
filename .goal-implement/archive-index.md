# 旧記録の退避

今回の依頼による退避先: `archive/main-ac0894a-rebaseline-20261008/`。

Python `Path.rename()` で次の既存パスをこの配下へ移動した。`brief.md` は整理前の本文を `brief.original.md` としてコピー保存した。削除は行っていない。既存の archive 配下はそのまま保持した。

| 元のパス | 退避先 |
| --- | --- |
| `phases` | `archive/main-ac0894a-rebaseline-20261008/phases` |
| `reviews` | `archive/main-ac0894a-rebaseline-20261008/reviews` |
| `criteria` | `archive/main-ac0894a-rebaseline-20261008/criteria` |
| `plan.md` | `archive/main-ac0894a-rebaseline-20261008/plan.md` |
| `status.json` | `archive/main-ac0894a-rebaseline-20261008/status.json` |
| `design.md` | `archive/main-ac0894a-rebaseline-20261008/design.md` |
| `assumptions.md` | `archive/main-ac0894a-rebaseline-20261008/assumptions.md` |

`du -sk <旧reviewsの直接子ディレクトリ>` のサイズ一覧は [temporary-directories.md](temporary-directories.md)。退避内容を一括で読み込まず、必要な箇所だけ参照する。今回は旧 plan の再開制約と criteria/requirements.md の R01–R12 対応を確認し、旧 done 判定や検証根拠は引き継いでいない。

削除前調査では指定された一時ディレクトリ3個の由来を局所参照した。旧 DB のバックアップを含むため、3個とも保全し、検証環境本体はコミット対象から除く。詳細は [cleanup.md](cleanup.md)。
