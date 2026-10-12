# P5c-3-S3 再開照合

2026-10-06。独立Verifierによる公開tracked sourceと指定記録の静的照合。受入基点 `a013479e748fb755baf21af8f3765c888458e884`、現在HEAD `a2434806594007a6ca8cd1609c910451bfba7066`。

判定：既受入S1/S2の条件へ影響する製品差分はない。既受入を維持し、S3の補正・固定後に実装へ進められる。S3製品接続の合格を示す報告ではない。

## 根拠

`git diff --name-status <基点> HEAD` は空、`git diff --quiet <基点> HEAD` はexit 0、tracked作業木もclean。基点後の2commitは管理文書整理と管理記録のlocal化で、現在のtracked treeは基点と同一である。DB・lock・製品/testへの変更はないため、S1/S2の受入を再演・差戻しする根拠はない。

[brief](../brief.md)、[plan](../plan.md)、[design](../design.md)の担当箇所と[S2共有契約](../contracts/drive-regeneration-input.md)、[S2最終独立報告](P5c-3-s2-f2.md)の要約・限界を照合した。S2-A–Eの隔離基盤合格は維持し、通常runner/DI/UI/本文採用・unknown-begin回復・全purge接続・実外部の未提供を維持する。旧distを通常接続の根拠には使わない。

## S3の実装前補正

[接続案](../phases/P5c-3-s3-plan.md)と[独立静的レビュー](P5c-3-s3-plan.md)を照合した。必要補正は以下の4点であり、既受入S2の欠陥へ読み替えない。

- M1：正規new leased-text runtimeのdurableな由来と、exact前任終了確認に束縛したopaque capabilityを確定する。legacy文字列/任意receipt/booleanから発行せず、未ACKの由来保持とDB確定後のownership ACKを明記する。
- M2：初回の確定writeなしno-claimだけを枠返却へ流す。不明intentの再CAS false・readのみ・別version・応答不明は保持し、exact saved又は確定version fenceによる回復と型で分離する。
- M3：初回候補の取消/期限/失権確定を容量待機と分離し、never-readの正規終端・旧claim fence・quota/jobの処理を同Txに束ねる。cleanupの権限再要求を避け、dispatch/body側のclosed0 guardを維持する。
- M4：比例R12は既8integration suiteを通常再実行せず、新appDBの共通fixtureへ必要期待を移植する。A/R共有appDB・nativeDB・opaque/auditの4logicalDBと固定資源/期限、case別fixture割当を実行前に確定する。54/60対は提案数であり受入や追加資源の許可ではない。

案冒頭の「S2正式報告待ち」は旧時点の記述であり、既受入と矛盾する製品不具合ではない。M1–M4反映後の共有契約・固定受入ID・変更path・有限資源はManagerが採用し、候補固定と全writer停止後に別途独立検証する。

## 操作範囲と限界

本照合で製品変更/DB/runtime/test/native/build/外部実行は0。旧PID探索・広域process/env一覧・signal0。編集は本報告のみ、goal APIと全体管理文書の変更0、補助agent起動0。

EOF
