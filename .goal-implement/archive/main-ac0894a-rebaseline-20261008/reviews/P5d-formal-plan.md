# P5d 正式案の独立比例レビュー

## 管理補正版の最終計画 preflight

2026-10-05T20:44:50Z。[共有契約の正式採用範囲](../contracts/account-delete.md#正式p5dの採用範囲)と[固定 P5d-A–H](../criteria/P5d.md)を限定再照合し、**計画 preflight 最終合格**。元 P5d-P1 は管理補正版で解消した。exact 集合へ application/regeneration/read.ts/current.ts の二 path を加え、retained record/target の秘密 locator 検査前の分岐、一覧/単件の recorder-unavailable、ID/note/original/account/時刻/sha/bytes 保持、通常 usable 保証、shell の read/claim/retry 禁止、架空 locator/cast/秘密保持による回避禁止が明記されている。原提案本文を担当が遡って変更した扱いにはしない。

本合格は計画の十分性だけであり、製品・SQL・実 owner 閉鎖・browser・全体 R 要件の受入ではない。新有限資源の実行担当/manifest/停止条件は委譲時固定、一般提供前に新合成 DB の独立検証が必要。製品/管理/goal 編集、新 root/DB/runtime/test/build/browser、旧 private 資材操作はすべて0。自己の再照合は終了し、次の UI helper 候補提出待ちへ戻る。

## 原提案の独立判定

2026-10-05T20:32–20:42Z。公開候補 `c2a3d45f1097533c6344346aca303dc1d2aef368` と [正式案](../phases/P5d-formal-plan.md)、[採用済方向](../contracts/account-delete.md)、固定 R11/AC-09・R07/R08/R12 を静的照合した。**設計方向は成立可能。exact 変更集合と shell 読取接続に一件の重大不足があり、最小補正後の採用を推奨する。** 製品候補の動作不合格を意味しない。計画未採用・新実装/実行未着手を維持する。

製品/管理正本/goal 変更0。新 root/helper/DB/runtime/build/test/browser/Worker/外部削除/音声操作0。spec/spec-implement 不使用。途中は依頼された新 UI artifact の比例照合を優先し、完了後に本レビューへ戻った。

## 差戻し P5d-P1: retained record の実 caller が許可集合から漏れている

対象は P5d-D（案内 D04 仮名）、R08/R11、および型安全。正式案は subject/fileId/folder 等を持たない `RetainedBackupRecord` を加え、shell を「記録者退会による取得不能」として返すが、exact 集合には `C/application/regeneration/read.ts` と `C/application/regeneration/current.ts` がない。

現 source の因果列は次のとおり。

1. `application/regeneration/ports.ts` の `page/find` は通常 `DriveBackupRecord` を返し、`read.ts:77` の candidate と一覧/単件の両入口がこの型を受ける。
2. `current.ts:56` の `regenerationRecordState` も通常型を受け、target の存在/confirmed と subject・fileId・folder の一致を、人物の退会判定より先に検査する。
3. 存続 WS/移動済みノートの confirmed record/target を計画どおり秘密なし shell にすると、通常 mapper は構築できない。shell を落とす projection では一覧から記録が消え、通常型に寄せても target 不在等により `source-invalid` が先に返る。retained union を port に正しく接続するだけでも、現二 caller は型と分岐が対応しない。

最小対応は **上の二 path を exact 集合へ追加し、retained discriminant を通常秘密 locator 検査より先に分岐する契約を固定すること**。一覧と単件の両方で既 ID・note/original/account・作成時刻・成功 bytes/sha256 の保存来歴を保ち、有限 DTO は `availability:unavailable/reason:recorder-unavailable` とする。usable 枝の既 subject/target 整合・現在認可は維持し、shell を通常 read/claim/retry へ流さない。架空 subject/folder/fileId、cast、秘密保持で通常型へ合わせない。既 P5d-D の正例/負例にこの一覧・単件の差を含めればよく、ケース群や native 再演の追加は要求しない。

target の保存 shell を通常 `DriveBackupTarget` へ渡さない mapper 境界も同じ補正契約で固定できる。active-only target projection と回収専用 shell 読取、又は正式 retained target 型のいずれかを選び、通常 target の subject 非 null 型は維持する。型定義を既許可 port 内へ置けるため、別の広い domain 再設計を求めない。音声/他 format 提供の追加とも無関係。

Manager はこの二 path と先分岐契約を採用する方向を通知した。元提案の補正自体は本レビュー時点で未反映・製品編集0であり、補正後の正本を Manager が採用する。

## その他の主要条件

| 条件 | 計画上の判定と根拠 |
| --- | --- |
| P5d-A: 本人受理・保存人物 | StoredAccount active/deleted と認証 Account の分離は妥当。nullable を保存境界で検証し、deleted は認証 null、人物 identity は deleted/missing を区別する。ID/FK/成功来歴を保持し email 再利用を旧著者へ結び付けない。active Google-only を壊さず authVersion fence を同 Tx に置く |
| P5d-B: 最後 owner・存続 WS | active WS×owner membership×active accounts を同 Tx 正本にし、account 退会と owner 降格/削除の両入口を guard する。二 owner の競合と WS deletion fence の限定除外を区別している。creator/uploader だけの削除権限は追加せず、他 member の存続データを保持する |
| P5d-C: 即時失効・現在所有 | requireAccount/canScope に加えて匿名 current scope、直接 repository claim、callback/result adoption、メール再取得前の actor/target/result ID/version を対象にする方針は妥当。personal current owner と過去 author を分け、move の両 commit 順序を条件へ含める。全 public usecase/直接 claim 台帳は実装後の受入根拠であり、今回の source 全入口完成判定ではない |
| P5d-D: 取得不能 shell | matching intent の不可逆専用 retention、通常 usable の tuple/AAD/不変保証、confirmed 成功来歴保持は妥当。上の P5d-P1 補正が必要 |
| P5d-E: 実所有の閉鎖 | Drive connection/authorization/control/job/transfer/target/record、source binding/attempt/consumer、OR/Google 補助のコピーを列挙している。active/unknown、callerEnded/ACK 未確定、receipt/memory、readPinned/refreshPending/object_writes を残存として扱い、通常 terminal/expiry/cancel を close 証拠へ昇格しない。sourceHeldSql と正式 0042/0043 の閉鎖条件を維持し、旧 owner の限定 close/ACK は actor fence と分ける |
| P5d-F: 複数 debt・有限回収 | 専用 intent と stage/table の有限 cursor、claim1/page25、blocked row の debt 化と他 row 継続、再起動/応答喪失時の exact 再照合、最後の全世代 EXISTS は妥当。debt の kind/owner locator は実装の正式型/DDLで有限に固定し、同じ人物 ID だけで異なる runtime/token/generation の未閉鎖証拠を上書きしない。計画はその保持を要求しており、現時点の具体矛盾は確認しなかった |
| P5d-G: migration/guard | 新 0044＋新 snapshot/journal のみ、0032–0043 の既 SQL/snapshot は保持。0032 の password/Google 最後認証手段 guard の例外を matching deletion intent の縮小に限定し、auth_version_monotonic を残す。専用 account-deletion purge cause/current personal owner 同 Tx・既 purge cause 非上書き・FK/index/trigger 列挙維持は妥当。正負 CHECK/通常 active の有限影響テストは実装後に必要 |
| P5d-H: UI/検証資源 | canonical email、pending/error、最後 owner 説明、cookie 失効と旧 cookie 再読込拒否を含む。新 synthetic fixture と logical3DB/合計64MiB・root192MiB/page51・期限/bail/失敗保全の有限提案であり、今回の実行許可へ使わない。browser 未検証を全体受入へ繰り上げない |

全体要件 R07/R08/R11/R12 の合格は宣言しない。

P5d-P1 を補正すれば、保存境界→原子的受理→全入口 fence→永続回収→UI の内部順で一フェーズ実装可能と判断する。部分 fence の一般提供は禁止したまま、無関係な S3/backend/legacy suite の再演、全 provider-binding 基盤、他 runtime 改変は不要。実コードで必要な追加 path が判明した際は元案の規則どおり Manager へ理由を返し、許可集合を暗黙に拡張しない。

SQL の実 FK/integrity、型/checks、全コピー sentinel counts、実 owner closure、停止/再開、browser UI は未検証。独立静的レビュー以外の実行を借用して合格へ補完していない。自己の調査操作は終了、共有 runtime 操作は0のまま。
