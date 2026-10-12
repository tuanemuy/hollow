# 受入S4 main統合の独立static review

**局所PASS**。candidate末尾22blob/modeは受入S4と全一致、outside22差0、Parser2保持、main tracked cleanと正規modeを独立確認した。既受入S4 A–FとParser2の直接検証根拠を継承できる。新merged compiledB／通常UIは未検証であり、統合静的PASSを実運用／UI成功へ転用しない。

確認日時: 2026-10-06T06:39:06.130661+00:00。全writer停止の固定候補を公開source/Git objectだけで照合した。本報告固定後、全対象read STOP。

## 固定基点

- candidate `79ef126edd5d3440cde20dbe8fd372e7235010c5` / tree `8e7d976977a094e360a9d97e48e7dd3588337077`
- 単一parent `b6e567b24e24c78e26bb1bbb147bdf0fc6588bd3` / tree `fa7f4fb746268b7d6ada09ff3264e73800634310`
- accepted S4 `4cba22b7a62121b32bf72964cd62c15a9774c26f`、common `c2a3d45f1097533c6344346aca303dc1d2aef368`
- public phase `phases/P5c-s4-main-integration.md`: 9,025 B / SHA256 `48829968521d2b7a9b34a1aa18d86305b9d5d6f86c3a41f6ea17f3c2e019b4c9`
- 採用proposal `phases/P5c-s4-integration-machine-plan.md`: 29,736 B / SHA256 `e404b65981180f68f176b345c1bf04bc84c5d770daea7a3c6415a8aabf289f6f`

両public文書はregular600/nonlink/nlink1/UID/canonical、NOFOLLOW実読取前後dev/ino/size/mtime/ctimeと全文hashを直接確認した。現在Git HEAD/parent/tree、tracked cleanを直接確認し、source読取後もHEAD/clean不変を確認した。

## 直接確認した統合条件

| 条件 | 独立結果 |
| --- | --- |
| common→accepted net delta | 列挙22pathのみ。Parser2との交差0。22targetの親main/common blob同値、新規3pathは親/common不存在。 |
| candidateのtarget22 | 全22のGit mode100644と末尾blobがaccepted 4cbaと一致。working bytesのGit blobとSHA256も一致。 |
| outside22 | parent→candidateのGit差分集合がexact22、outside22 tree全同値。package/lock/DDL/server.node.tsを含む対象外を変更していない。 |
| candidateとacceptedの全tree関係 | 差は既main Parser2のみ。S4途中helper/旧生成物をaccepted sourceへ混ぜた差はない。 |
| main working source | Git tracked1460entry＝regular1459＋AGENTS内部link1。全regularは100644→actual644／100755→actual755、UID・nlink1・canonical・NOFOLLOW前後stable・working Git blob一致。source合計21,155,046 B、採用32MiB内。untrackedを探索／読取していない。 |
| AGENTS | 唯一tracked linkは `AGENTS.md→CLAUDE.md`。link文字列／Git blobとrepo内canonical targetを確認。未知tracked link/special0。 |
| manifest22 | `[path,Gitmode,Gitblob,bytes,SHA256]` compact JSONをworking sourceから独立再構成。SHA256 `f19cd59f33402b451769f710f6fb01d4f8a2cdc32404bfc53a28ff2f6d27e3df` 一致。 |

Parser2は親/candidate Git blob同値に加え、working source bytesを独立確認した。

| path | bytes | SHA256 |
| --- | --- | --- |
| `packages/core/src/adapters/node/import/documentExtractor.ts` | 10,244 | `2a3ca8d16a9e67ea9c3f262712c93b8fdc0544638d51ee26043a25155767053f` |
| `packages/core/src/adapters/node/import/__tests__/documentExtractor.test.ts` | 22,526 | `51774d8b6db91cb5b5b9cfd4ebf0ba7a8ffbd7cd7210722a37e032a853283b2e` |

## 借用した実行根拠と未検証

主報告のmain `typecheck→lint:fix→format` 各実exit0、型修正0、新CF生成0、No fixes appliedとoutside22不変更を借用する。Verifierによる再実行は0。既lint warning/infoを今回の統合欠陥へ読み替えない。

受入S4 A–FのPA／Native／D／E／C／正常F一巡とParser2局所3ケースは既独立レビューの根拠を借用し、今回はsource同一性・適用範囲・結合先wholechecksの統合条件を確認した。未変更suiteの再演は不要で、受入条件へ影響する新差分／欠陥は確認されなかった。

現merged candidateのarchive build、compiled graph/asset/Worker serving、通常Drive/UIは未検証。旧Bを新candidateへ流用しない。S5共有契約preflight PASSは別報告であり、S5 source/A–Fの実装合格ではない。音声・実外部保留を維持する。
