# P3c 再開時の限定照合

2026-09-11 07:44〜07:49 JST。Verifier による source 識別・差分 path・既存報告と受入範囲の読み取り照合。P3c の完成候補レビュー、動作検証、合格判定ではない。

## 再開基準

| 識別 | 今回の独立取得 |
| --- | --- |
| HEAD | `47a030446152fe8de91ef8059072d4c3830f91d6` |
| source | 758 files / `76a2480b32ac17f5ea1984f3759db1a640ff93d08a42eb3922dea6a9c0ad2071` |
| lock | `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` |
| source/lock 実取得時刻 | 2026-09-11T07:47:42.844+09:00 |

従来どおり `git ls-files -co --exclude-standard -z` の重複排除・path sort・実在 file を用い、path＋NUL＋bytes＋NUL を SHA-256 に入力した。AGENTS symlink の参照先を含む。`.goal-implement/`、ignored の秘密・DB・build 出力は対象外。製品配布 source の Unicode mapping・migration snapshot は対象に含む。Node 24 は今回の hash CLI のみで、製品 Node 22 の動作証拠ではない。

最初の安全な path guard は公開 `.env.*.example` と `secretsLoader.ts` も広く検出して、内容を hash する前に停止した。path metadata で公開 template / adapter と確認して guard を限定し、上記を取得した。資格情報・秘密 file・DB の値や hash は取得していない。

最後の受入 P3b2-V1 は同じ HEAD、707 source `e4745b28f902a0442cb000727d7f85df202cdee3d562d8222aba973c64d7971a`、lock `7789972514666bf5fbc61f775887a43b0c71678cd854f9758459cf9aa385b3bf`。現在はその上の未 commit P3c 実装であり、受入 source と同一ではない。Manager 確認では 07:42 再開直前の working-source hash は未取得。今回値を再開初期基準とし、01:10 頃の停止時点からの byte 同一性や各変更の時刻・作成者までは立証しない。

## 差分と報告の対応

`git status --short`、`git diff --name-only`、`--numstat` と untracked product path の一覧を確認。既存 32 path 変更、新規 51 path、計 83 path。削除 path はない。P3c 主担当報告 43 行、UI 報告 99 行、normalizer 報告 98 行、storage incident 報告全文を読んだ。

- UI: NoteList / NotesFragment / ScopedNotesBoard / Shell、notes routes、browse components / validation / serverFn / CSS。詳細の NoteContent / getNote / view と root 接続は検索文脈・metadata・目次に対応する。
- core / DB: browse ports / query / projection、UoW、0018/0019 / FTS / index repository、save / commit / import / reference / history の投影接続と限定 regression fixture。scopeCapacity の SQL 共用抽出も報告範囲内。
- runtime: Node read / projection / supervisor / backfill、build-search script と server.node。normalizer / civil date / Unicode data・license・generator は補助 8 path の責務に対応する。
- package / lock の実 diff は Node search build 接続と `@js-temporal/polyfill` exact 0.5.1、その依存 `jsbi` 4.3.2 の追加。既存 libSQL 等の版変更はない。

この path・責務照合では P3c と無関係な追加変更を確認していない。ただし全 source 行のコードレビューや実装者帰属の証明ではなく、不具合の不存在も意味しない。旧 accepted `workspace.css` の icon / 長名修正 path は今回の変更一覧にない。

## 既受入 25 条件の再 open

07:46 更新の plan と変更責務を対応させた。各行は再検証する変更境界であり、条件全体の全量や旧方式を再試験する指示ではない。

| 対象 | 件数 | 今回の適用境界 |
| --- | ---: | --- |
| P1-B/C/E | 3 | 保存投影と失敗、詳細隔離表示、Shell / Node 起動・停止・build |
| P2a-B/E/F | 3 | 初期取込・変換完了の準備 / 同 UoW 採用、関連 job と接続保全 |
| P2b-A/C/D | 3 | 詳細 renderer / 目次、reference 本文更新、style-only 投影版追従 |
| P2c-1-A/D/E/F | 4 | 共通 commit / 復元 / 競合・退避に接する prepared source guard、同 transaction 索引と移行 |
| P2d-1-A/D | 2 | 新 board が所有する trash / rollback / undo / invalidate・再訪 |
| P2d-2-C/E/FD | 3 | 派生 FK / FTS 削除 trigger、移行、専用検索 child / Worker と停止順序。旧 physical claim・FD 方式の全面再証明ではない |
| P3a-A/B/C/D/F | 5 | Shell scope 表示、scope page / 新規・import 動線、現在 read 認可、UI / migration 接続 |
| P3b-2-A/D | 2 | 検索 trigger 追加後の既存 current icon / 長名 / header と keyboard・mobile の局所表示 |

計 25。既存報告・差分 metadata に基づく限り明確な不足・過大はない。backend icon 認可・招待暗号・全 codec / SSRF / PM / 20版数 / physical claim は新しい変更証拠がなければ従来合格を保持する。P3c-A〜G は別に全て未受入。P3d tag 書込 / 移動、P3e 一括、P4 公開 / export、P5 backup 実接続を前倒し条件にしない。

## 借用と未実施

主担当の Node 256 / 21 files、UI 45 pure/static・限定型 / Biome、normalizer 54・再生成一致は既存自己報告であり、今回再実行していない。全体 checks / build / 同 bundle 本体 UI / current policy / 独立検証 / candidate commit は未完了のまま。旧 clone の移行・backfill 根拠と fresh 環境の今後の機能検証を区別する。


旧環境・DB・storage・recovery root・credential helper・key・browser・process は一切操作していない。test / build / migration / install / 外部サービス / goal API / spec / spec-implement は未実行。新環境の準備・所有は Implementer に残す。製品・全体管理ファイルは変更していない。

07:48 JST 台に初期 source 照合終了と識別を Manager へ通知。本報告の書込みを最後に全操作を停止し、正式候補の独立検証委譲を待つ。
