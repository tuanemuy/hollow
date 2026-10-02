# P5c-1 S4 storage helper

2026-09-29。親 Implementer の限定委譲により、goal-implement と採用済み S4 exact 追補に従って静的編集した。共有契約差を親へ通知してから着手した。spec/spec-implement、goal API、追加 helper は使用していない。

## 変更した所有範囲

- `packages/core/src/domain/integration/drive.ts`: folder-select ready/verifying-target と folder-create creationIdentity の全枝に、UTF-8 1〜4096 bytes の optional nullable targetName を追加。
- `packages/core/src/domain/integration/driveRepository.ts`: attempt の history(accountId, since, limit) read port を追加。
- `packages/core/src/adapters/libsql/repositories/driveRepository.ts`: attempt history を実装。attempt/control とも account 一致、createdAt >= since、createdAt DESC / id DESC、safe integer 1〜100。範囲外は DRIVE_STATE_INVALID。control の folder-select/create/disconnect filter は維持。既 prune/scan の limit 処理は不変更。
- `packages/core/src/domain/integration/drive.test.ts`: pure 2 件追加、既 15 件を維持。計 17 件。
- `packages/core/src/adapters/libsql/__tests__/drivePersistence.integration.test.ts`: persistence 2 件追加、既 18 件を維持。計 20 件。

decodeControl は既 parseDrive による optional field の欠落保持をそのまま利用し、null default や backfill を追加していない。ready→verifying-target は sourceId/targetId/key に加え targetName も一致させる。undefined と null の変更も拒否する。旧 terminal の data 不変 guard、owner 閉鎖 guard、create ID/marker/sends/観測親の制約は不変更。新 DDL・migration・fixture の編集なし。

## 追加した未実行の検証

pure は旧名称欠落・nullable/名称あり・対象 phase 限定、UTF-8 境界/空/過大/型違い、未知 field、全体 64 KiB 超過、create failed identity の境界を扱う。

persistence の第 1 件は missing/null/named の ready→verifying 同一性、名称変更拒否、合法な確認、旧 create terminal identity の欠落保持、null 補完拒否、実 owner 閉鎖前後の保存 data JSON 完全一致を扱う。第 2 件は failed/pending/completed・context 世代違い・scrubbed・旧 connection epoch の履歴、DESC 同時刻 tie、since/limit、他 account 照会非開示、内部 Picker/refresh 除外を扱う。追加 fixture material/note/HTTP は不要。

## 実施した確認と引渡し

公開 source、採用設計、差分、直接 test 件数だけを静的確認した。型検査・test・Node・formatter・DB・runtime・HTTP・browser・build・旧 proof・秘密・commit の実行は 0。新 test の整形と実行は親の許可済み検証段階へ引き継ぐ。成功結果・資源削除・実接続成立を主張しない。

親は app transitions で新名称を明示し、DTO でだけ欠落を null に投影する。追加履歴の最大 200 行 merge と合計 100 件投影は親所有の application 側。fixture、UI、runtime、lastUse は本 helper の変更範囲外。

本報告を EOF まで確認した後、全 read/write/run を停止し、上記 5 paths と本報告の所有を親へ返却する。自己の常駐 process/exec、DB/root、HTTP/socket は作成していない。
