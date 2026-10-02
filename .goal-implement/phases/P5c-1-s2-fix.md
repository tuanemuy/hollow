# P5c-1 S2 V1–V4 修正

## 現在地

2026-09-29。候補 `d946225ce80b983b0b9ee0f30d56442b73042075` を返却する。独立報告 `reviews/P5c-1-s2.md` 全文と現brief/design/planのDrive採用範囲を確認し、51f350c2のA/C/F反例4件を訂正した。application36/pure15/persistence18/authprune8、計77対が直接成功。型→lint:fix→format成功。S3は未着手、管理正本・共有port/domain/DDLは非変更。goal-implementのImplementer境界を使用し、spec/spec-implement/goal APIは非操作。自己候補の成立であり独立合格・全A〜F完成ではない。

新専用rootは `/Users/hikaru/.local/share/hollow/verification/p5c1-s2-fix-20260929-k1djvh`（mktemp排他0700）。DB/WAL/SHM64MiB、active16MiB、最大5DB、材料256KiB、other8MiB。正常自己tempだけ既fixtureのfinallyで回収し、失敗は保持・非再接続・後続停止。旧proofは許可公開helperの必要な静的読取/copyだけ、独立失敗DBは非操作。

## 修正範囲

- V1: connection.tsの既command再利用でも現在DriveActor全fieldを一致させ、URL構築前に拒否する。同actor同payloadの冪等性を保持。
- V2: folders.tsのcreate後曖昧404をreconcilingのまま保持。同ID明示send2だけを許し、削除断定・自動再送・第三送信なし。
- V3: 未観測parentの照会結果は既readyへ保存。現在候補への明示confirmと再照会後だけ採用する。receiptは必要最小の候補参照を投影。
- V4: runner.tsの結果採用中に確定した有限protector拒否だけを、元Txのrollback後の別Txで同exact ownerのfailed/closedへ確定。DB不明やrawerrorを有限成功へ偽装せず、terminal/cancel/currentを再照合する。

直接testは既driveApplication.integration.test.tsへ8件追加しapplication36。新DDL差0なので独立S2の0038正常782/SQL故障783/FK故障783と旧保持を借用し、新移行反復0。

音声は未完保留。trashは確認後の復元/再選択/新規作成、明示再連携は成功時だけ旧backup取消という利用者決定を維持。backup実転送はP5c-2、通常token refreshはその取消対象外。

## 4反例への直接根拠

| 対象 | 直接確認 | 維持した境界 |
| --- | --- | --- |
| V1 / A・F | 同account別live session/browserの同commandをURL構築前拒否、元actorの再操作は同id/URLを返す | exchange0、sameDriveActorのaccount/session/authVersion/browser/epoch全一致、旧payload変更拒否 |
| V2 / C | unknown create→曖昧404照会でもreconciling/closed/非terminal、GET canResend=true、queue自動送信0、同ID明示send2、第三intent拒否 | allocate1、別ID作成/削除確定0、S1厳密send+1/terminal非復活 |
| V3 / C | 未観測parentのinspectはready/未採用、wrong target拒否、現在版のconfirmで再照会し採用、旧confirm再操作拒否、確認後parent変更はconflict失敗/closed | 保存observedParent/fileId/sends/expectedVersionへ確認を束縛、初回digest不変 |
| V4 / C・F | resource-key/candidateの固定有限protect拒否後failed/closed、旧設定/資格維持、取消競合ではCANCELLEDのterminal保持 | fake active0とDB closedを別assert。元Tx rollback後、同exact owner/currentを別Txで再照合。DB側が別errorへ変わる対はrun拒否/DB activeを保持し、commit成功を偽装0 |

V3の同根追加として、Manager採用後に初回createの`conflict`（409契約）も親未観測ならready確認へ進めた。既conflict対を確認→採用へ訂正し、通常`created`初回は直接採用できる正経路を新V3対内で確認した。旧metadata outage対の「inspectだけで採用」という不適切な期待もready/未採用へ訂正した。実409 wireや実Google上の移動の検証ではない。

V4の捕捉はsuccess callback内で発生した既有限`BusinessRuleError(DRIVE_UNAVAILABLE)`と、その同一errorがUoWから伝播した場合だけ。別DB error/commit不明は捕捉対象にしない。再保存は一回だけで、再失敗を自動反復しない。局所adoptionFailed区分によりcreate再照会へ戻さずfailedへ収束する。内部失敗のdeliveryはunknownであり、HTTP未送信の証明として使わない。S3のlate-close proof/ACKや一般DB障害回復は追加していない。

## 実行履歴と包含

| 実行 | 結果 | 適用範囲 |
| --- | --- | --- |
| 事前型 | exit0 | 新test実行前。製品/テスト型エラー0 |
| gen1 回帰filter | 2pass/1fail/33skip、exit1 | V1/V2成功後、新V3の末尾再confirm期待が失敗。旧28はfilter除外。全成功とはしない |
| gen2 回帰filter | 8pass/28skip、exit0 | V3期待訂正後。同根409追加前の節目で、下記最終36に包含 |
| 最終typecheck→lint:fix→format | 全exit0 | 5所有path以外tracked差0、診断原文/stack非出力 |
| 最終application | 36/36、exit0 | 既28＋新8。初回409確認・created正常の追加を含む、実SQLite/UoW＋fake provider/protector/execution |
| pure | 15/15、exit0 | 既型/純粋境界 |
| persistence | 18/18、exit0 | S1修正terminal/send境界と現S2保存契約 |
| auth prune | 8/8、exit0 | 既3＋Drive pin等5、旧Google/OpenRouter/session保持 |

最終77対は非重複の上記4群。filter8や初回2を加算しない。各runのknown child実close/ESRCH、stdout/stderr終端、外側exec exitを回収。active DB/storage/native/HTTP0、正常caseは既fixtureのFK確認/client.close/finally cleanup、fake execution.stop/active0後に次caseへ進んだ。

gen1失敗は新testが成功採用後のsettingsVersion進行を落とし、同confirmをstale返却と期待した差。入口のcurrent guardがDRIVE_CONTEXT_CHANGEDで拒否する公開source経路に従い、期待を「有限拒否＋追加要求0」へ訂正した。初回は細分stage未観測であり、原因は静的経路と訂正後成功に基づく。製品guardを弱めたものではない。失敗DB/WAL/SHM計2,290,536Bを保持し、再接続/再移行/削除0。旧独立V1〜V4の失敗証跡は読取も行っていない。

## 候補の識別

所有5pathだけをcommitした。管理/proof/private/無関係dirtyを含めていない。公開sourceの作業bytesとcommit bytes全一致、tracked dirty0。個別commit bytesを正本とし、aggregateはJS既定`.sort()`でrelative pathを並べ、各`lowercase SHA256 + two spaces + relativepath + LF`を連結してSHA256とする。

| path（packages/core/src/から） | bytes | SHA256 |
| --- | ---: | --- |
| adapters/libsql/__tests__/driveApplication.integration.test.ts | 44834 | f17f3a3b57ad23982de3d97d2dac14147c4eabd66b097e975b3046b03b2d9a2f |
| application/integration/drive/connection.ts | 14957 | 5fce8690dbb6550155366c0ca90a58ca656734f2301372bbaddfe2f9a4999514 |
| application/integration/drive/folders.ts | 18745 | 8b5dc2553545a1a8dbc9a355eb8c229f1662f1ea7f919f643d1416fd39709beb |
| application/integration/drive/read.ts | 4316 | 62a61218c66197e310f4e449b0a88475247fde2000d2b1510a57a415b2afd942 |
| application/integration/drive/runner.ts | 11911 | db90cc639f7e1371379e679dedc381100e4c92ca6efa7ceafd7b93fe9b7d1967 |

- 所有5path aggregate: `74a5f3412523caeb5d74184cbde208b4bb76ef0f72912bbbb6b74686a6f01c96`。
- S2元公開20pathの現bytes aggregate: `77e55dfd8717b2765b79be052d7457a34050dec4514234f50f31fc99a8f8a14d`。
- 0038 SQL: `d305836ed40bd36d9febf05aaab9c8b1552dbf7b80b23c097110adc428670112`。
- 0038 snapshot: `653718f0094ce5651e6f6897669c8290446a7af0d2913e6eb3ea3f5fb84944fb`。

SQL/snapshotは51f350c2の独立値と同一。旧0037以前/旧schema/認証/LLM/依存/lock/dist/本体freshは非変更。

## 再検証・保全・限界

新Rの公開logic allowlistは次の4本のみ（全regular/no-symlink確認）。秘密・DB・結果・cacheの共有を含まない。独立は必要なlogicだけ新rootへ読解/copy/adaptし、旧Rで実行しない。

| 新R相対path | bytes | 用途 |
| --- | ---: | --- |
| reporter.cjs | 1313 | code/countだけのVitest結果 |
| test-run.cjs | 3882 | root完全一致/DB容量/逐次1/bail1/cache無効/終了guard |
| check.cjs | 1228 | 型/lint/formatの有限結果 |
| seal.cjs | 2715 | 公開commit bytes/正規aggregate/自己metadata集計 |

旧1ft0Wwからは許可reporter1313B/test-run3822Bだけmetadata→静的read→排他copy後に新Rへ適合した。synthetic helperは不要につきcopy/実行0。再実行は新root適合後、`test-run.cjs application`（36）、`pure`（15）、引数なし（保存18）、`auth`（8）。`application-fix`の8は全36の部分集合であり必須重複runではない。新R失敗gen1は保持し、正常gen2のdb空/runner残0を確認した。

最終seal後の実量はDB/WAL/SHM **2,290,536B**（保存失敗1DB＋sidecar2、active0）、other **12,350B**、保存材料/原本/notes0。DB64MiB/active16MiB予約・最大5、other8MiB、material256KiB以内。容量確保のための証跡削除0。新R限定lsofはhandles0（exit1・stdout/stderr空）、既known child全ESRCH/全pipe終了、未回収exec0。新Rのファイルは保持する。

実Google/API/資格情報/HTTP/UI/native/build/fresh/既鍵/旧保全操作は0。移行/旧100表保持は不変DDLの独立S2根拠借用であり今回のactualfresh検証ではない。S3実HTTP所有・late-close/restart proof/ACK、Picker/CSP、全A〜FのUI/配備は未完。未知DB failure対ではDB owner activeを成功に見せず保持することを検証しただけで、S3回復の完成ではない。

本文を最終EOF全文確認後、文書を含む全read/write/runを停止して所有を返却する。追加実装・試験・S3開始は行わない。
