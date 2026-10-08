# P5c-2 S3 独立静的レビュー

判定: **具体補正後に採用可**。待機 job と transfer admission の分離、二段枠、直接 root による親 retry、auto と変換の独立、待機を含む取消/影響確認は採用可能。下記 V1〜V5 は既完成条件を成立させるための計画補正であり、新機能の追加要求ではない。製品の合格判定・実装開始許可ではない。

対象: HEAD `c660ced51319175a8c506be1cce5cd7a743d85ad`。提案 [P5c-2-s3-plan.md](../phases/P5c-2-s3-plan.md) は 142 行、SHA256 `c553b31e23d04bd1fbac259695c25cfa796fe7442a3ed4329896534f3b821869`。検証日時 2026-10-01T03:09:48+09:00。Verifier は公開 source/DDL/spec/管理資料の静的読取だけを行い、この報告だけを新規作成した。

Manager 判断: V1〜V5 の推奨を一つの補正案として採用し、実装委譲時の共有契約へ反映する。V4 の synthetic actor 上限だけ資源案の変更を伴う。利用者への新しい選択要求はない。S2 retry UI は他担当の報告待ちとして扱い、本レビューの根拠へ転用していない。

## 項目別判定

| 正本 ID | 静的判定 | 根拠・必要差 |
| --- | --- | --- |
| P5c-2-F | 補正必須 | auto 同 Tx・本人・変換独立・OFF の将来適用は適合。V1/V2 で待機と即時失敗の保存/retry を閉じる |
| P5c-2-G | 補正必須 | 最大500・固定集合・二段枠・最新 ordinal 集約・再 cancel は適合。V1/V2/V3/V4 |
| P5c-2-E | 採用可、実装未検証 | 全待機を外部取消/影響確認に含め、relink 成功時だけ取消、refresh 除外、実 close 保持。下記採用条件を維持 |
| P5c-2-H | 補正必須 | 90日表示と record 寿命分離は適合。V3 と V5。activity/秘密/サイズ境界の実装は未検証 |
| P5c-2-I | 補正必須 | 保存先の確認→再選択/新規作成、trash 復元案内、無断代替0は適合。V5 で検証対応を正す |
| P5c-2-J | 補正必須 | requests/jobs に限定する0040方針は適合。V1〜V4 を型/guard/移行対へ反映。全 checks/build/実行は未実施 |

A〜D の既候補を本レビューで再受入・差戻ししない。ただし S3 が変更する request/current/read/cancel/prune/共有 fixture には計画どおり比例検証が必要である。

## 必須補正と推奨する一案

### V1: 待機 job の target 確定時点を受付 Tx に固定する

対象 G/F/J。提案31〜34行は `admission_identity` と非終端 target の partial unique を定めるが、待機 job の `targetId` をいつ確定するかが明記されていない。これは実装時の自由な選択にはできない。

公開根拠: [0039_drive_backup.sql](../../packages/core/src/adapters/libsql/migrations/0039_drive_backup.sql:268) の job insert guard は target がある場合の actor/note 一致を検査し、同277行の update guard は非終端 job の `target_id` 変更を禁じる。transfer insert は同305行で job の target と queued 状態を要求する。[driveBackupRepository.ts](../../packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts:212) も通常 replace の target 変更を拒否する。SQLite の nullable target に対する unique だけでは、target 未作成の待機同士を排他できない。

最小補正: 実行対象の新 auto/bulk 子は受付 Tx で dedup target を exact 解決し、未存在なら `unallocated` target を保存してから、固定 `targetId` と完全な `admission_identity` を持つ job を insert する。これは file ID 発行/HTTP/owner/pin を伴わない。admission は target を付け替えず transfer だけを作る。既 record 子は同じ target の成功子として保存する。原本/actor/sub/target identity の相互一致、queued 子の非null snapshot/target、snapshot 不変、terminal purge 時だけの snapshot redaction を新型/mapper/insert・update guard で揃える。旧単件の null snapshot は既 transfer を根拠とする明示 legacy 分岐に留める。

この固定で、既 target/transfer/record DDL と旧 job target 不変条件を保ったまま、待機の重複抑止・取消・purge が成立する。`targetId=null` を後から埋めるための一般 update 緩和は不要になる。

比例根拠: 同原本への並行 bulk/manual/auto、待機→admission と cancel/purge の両 Tx 順序、snapshot/target 不一致の直接 SQL 拒否、旧単件 null 値保持。

### V2: transfer 未作成/未開始の失敗と S2 recovery を分ける

対象 F/G/I/J。提案45行の「直前failed・owner close済み」、47行の「元失敗に transfer があるなら S2を必ず再利用」、55行の即時 auto failure をそのまま一つの入口にすると、実 owner を一度も取得していない失敗が retry できない。

公開根拠: [request.ts](../../packages/core/src/application/integration/drive/backup/request.ts:140) の S2 retry は priorTransfer を要求し、`owner.state === "closed"`、exact `forJob` 一致を要求する。[recovery.ts](../../packages/core/src/application/integration/drive/backup/recovery.ts:100) も closed が必須である。一方、[runner.ts](../../packages/core/src/application/integration/drive/backup/runner.ts:1033) は current 不一致の queued/none transfer を failed にできる。したがって「transfer が存在する」だけでは S2 recovery が実行可能とはいえない。[driveBackup.ts](../../packages/core/src/domain/integration/driveBackup.ts:65) の identity は subject/epoch/folder が必須である。

最小補正: retry の公開 locator は失敗 job とその版を起点にし、server 内で以下を閉じた union として区別する。

1. exact transfer 不在を証明した新 snapshot 付き待機失敗: 同 source/target/folder 意味のまま新 attempt を受付。元 job は不変。新 attempt の受付から30分とし、同 attempt の admission で期限を延ばさない。
2. transfer があるが永続未開始: target unallocated/fileId null、該当する全旧 transfer が owner none、received0/session null/statusAttempts0/readPinned0/refreshPending0、送信 intent/既 allocated ID がないことを exact に証明する専用経路。closed を捏造せず新 attempt を受付する。失敗と取消の入口は区別し、取消は JB-02 の元操作やり直しに留める。
3. 既開始/割当済み/ACK不明: 既 S2 の一意 transfer、実 closed 証明、旧 binding reveal→新 binding protect、同 ID、maintenance/withCaller を通す。unknown/複数/legacy 欠測を1または2に分類しない。

auto の即時業務失敗にも再試行に必要な完全 snapshot/target を保存する。既 CHECK では auto=true は linked/needs-relink かつ folder 非nullに限定され、unlink/adopt は OFF を要求する（[0039](../../packages/core/src/adapters/libsql/migrations/0039_drive_backup.sql:29)、同49行）。従って提案55行の「auto=true・保存先なし」は現在の正常永続状態からは到達しない。外部の保存先不可視/権限喪失は snapshot がある状態の有限 failure とし、folder null を扱うために偽 identity や connection CHECK 緩和を追加しない。構成不可・枠不足・needs-relink は、保存済み snapshot を持つ failed job と原本/変換を同 Tx で保持できる。

新 retry の資格 epoch は S2 と同様に現在資格へ bind できるが、source/target/folder/sub を無断差替えしない。要再連携や保存先解決の導線を先に示し、現在条件を満たさない retry は受付しない。

比例根拠: transferなし期限切れ・混雑即時 failure・needs-relink 即時 failure、queued/none failed の明示 retry、none と unknown の拒否差、旧 terminal 不変、同 attempt 期限維持、既 started retry の S2 条件保持。

### V3: root の FK 保持に加え、集約に必要な ordinal の保持を定める

対象 G/H/J。提案48行は root FK と active/held retry 依存の prune 延期を定めるが、元親の「再試行していない ordinal」の行が集約に必要な期間を明記していない。原親 request だけを保持しても500件の内訳は保持できない。

公開根拠: [driveBackupRepository.ts](../../packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts:264) の現 prune は古い terminal job を個別に選び、直接 `retryOf` の非terminal/held 依存だけを除外する。その後、retryOf を null にし、job と空の request を削除する。root_ordinal を導入しても、このままでは retry 対象でない成功/取消 ordinal が90日境界で先に消える。提案の bulk_summary は除外内訳であり、これらの最新実行結果の代替ではない。

最小補正: root family の表示・実行に必要な latest ordinal 集合を保存する。原親が表示期間内、または family に非terminal/実 owner保持子・表示期間内の retry receipt がある間は、root と各 ordinal の latest job を集約依存として物理保持する。非latest旧 attempt は、既 S2 の直接 retryOf と owner 保持条件を満たしてから通常 prune できる。旧親の public 一覧/題名/期限を復活させず、新 receipt の表示に必要な最小値だけを現在認可して返す。

root FK は直接1段のまま、参照 receipt を先に回収できる状態になってから root を回収する。root/ordinal 世代の最新判定は receipt の固定 generation（初回子だけ1）で行い、可変 root generation を旧子へ継承させない。root と retry receipt の双方が相手の存在だけで永久に prune を拒否する条件にしない。保持判定は直接 root family と直接 retryOf の EXISTS で足り、再帰探索は不要である。

比例根拠: 原親90日直前に一部失敗だけ retry→90日通過、非retry成功/取消と前世代 started の集約維持、期限切れ原親非表示、新 receipt 表示、全依存解消後の leaf→root 回収、存続 record 無変更。root自己参照/別actor/非root参照/世代飛び/同ordinal同世代重複と、一般 replace による取消解除の拒否も0040の直接対へ含める。

### V4: global 100 の比例対に必要な actor 数を資源案と一致させる

対象 G/J。提案99行は admitted 10/100 と二段枠を確認する一方、115行の app fixture は actor 最大3である。account上限10を維持した同一DBでは、3 actor から作れる live admitted/未完親は最大30であり、global100/101の境界へ到達できない。

最小補正: app synthetic actor 上限を11へ変更し、同じ application DB・note/original最大540・DB32MiBの範囲で、account10/11とglobal100/101の親受付/admissionを直接確認する。500子の代表親・全件送信不要という方針は維持する。global50,000子を実作成する負荷試験は新 gate にしない。容量の見積りが収まらない場合は実行前に具体差を返し、上限を黙って超えない。

これは test 件数追加のための要求ではなく、採用する二段10/100を本来の値で検証するための fixture 修正である。実行条件を10/100から小さい値へ差し替えた pure 対だけを、永続 global100 の直接根拠にしない。

### V5: H/I の対応を正本へ揃える

対象 H/I/J。[正本 plan](../plan.md:45) では H が本人履歴/ticker/toast/90日/秘密、I が trash/所在不明/権限/容量/rateの理由と再選択・retry導線である。提案12行と102行の I は H に訂正する。I には既 provider failure と待機/auto failure の理由表示、trash 復元案内、確認付き再選択/新規作成、外部delete0を対応させる。全理由を新しい実HTTP/UIで再演する要求ではなく、変更された経路を既 S1/S2 根拠と結び直す。

## 補正とともに採用できる契約

- 最大500固定選択、排他的な分類、既recordを再送なしの成功子、全除外で空親0、preview digest の同 Tx 再計算は OR-09/IN-06 と整合する。`selected = 除外 + 既保存 + 新処理`、request.count は実子数として一貫させれば新表は不要である。
- 未完親 account10/global100、各親500、admitted10/100、実 backup owner global1/account1、control込みglobal3の二段枠は有限である。cancel済でも started/unknown が残る間の未完親集計を、公開 state ラベルだけから決めない。実 owner は既 transfer guard と Execution のまま保持する。
- actor round-robin と actor内FIFO、先頭100の陰性判定を廃止する方針は必要かつ適切。現 [runner.ts](../../packages/core/src/application/integration/drive/backup/runner.ts:1014) は先頭scan内で actor を選び、[Node runner](../../packages/core/src/adapters/node/drive/runner.ts:20) は前actorをmemory保持する。S3 はこの実装をそのまま公平性の証明に流用できない。計画が既に要求する exact actor選択、再起動後進行、有限turnを実装根拠で確認する。
- 30分に待機を含める判断は既運用値を保ち、500件全成功の新保証を追加しない。期限後の terminal 化とunknown ownerの実解放を分ける。manual cancel は未admission/queued-noneだけを止め、startedの結果を待つ。外部取消は世代に依存せず現在scopeをfenceする。
- 全pendingを unlink/relink成功/folder変更/trash/全role降格・除名・脱退/move/WS削除/purgeへ含める方針は採用可。現 [cancellation.ts](../../packages/core/src/application/integration/drive/backup/cancellation.ts:12)、[noteMoveRepository.ts](../../packages/core/src/adapters/libsql/repositories/noteMoveRepository.ts:184)、[purgeRepository.ts](../../packages/core/src/adapters/libsql/repositories/purgeRepository.ts:322) は transfer 主体であり、変更予定pathの共通hook/直接SQLを両方更新する必要がある。待機取消だけのときも wake/処理結果を失わない。
- stable job ID と jobなしheld transfer の namespaced ID、完全集合のfingerprintに移る判断は適切。現 [drive.ts](../../packages/core/src/domain/integration/drive.ts:46) の backupIds はmax11で500を表現できない。旧receipt欠測かつ非空を拒否し、進捗によるIDの変更0、新attemptで確認更新、他actorの情報非露出を維持する。
- autoを [acceptUpload.ts](../../packages/core/src/application/import/acceptUpload.ts:175) の原本/変換/acceptedと同Txへ加える場所は適切。companion対象外・upload本人・ON以後・変換成功/失敗/needs_ai独立は IM-01/02 と一致する。DB/ACK不明を業務failureへ握り潰さない方針を維持し、既 object cleanup 境界をこのreviewから広げない。
- `backupCurrent` の settingsVersion 完全一致だけの除去は採用可。[runner.ts](../../packages/core/src/application/integration/drive/backup/runner.ts:80) の epoch/sub/source/現在認可と [recovery.ts](../../packages/core/src/application/integration/drive/backup/recovery.ts:25) の folder ID/driveId/旧AADと現在AADで復号したresource-key意味比較を保持すれば、auto-settingだけの更新を分離できる。folder採用Txの取消・同sub新epochの取消・失敗relink旧保持・通常refresh非取消は緩めない。control側settingsVersionは不変更とする。
- 0040を requests/jobs の加算列・必要guard/indexに限定し、0038/0039・connection/control・targets/transfers/recordsを変えない方針は成立する。旧requestの取消後更新禁止は bulk rootの専用CASだけを例外とし、legacy単件の一般replaceは維持する。移行時の旧値/null/全guard/FK/ledger保持、3 rollback位置は未実行として残す。
- activityの本人束縛・新current GET・1flight/1queued・遅着拒否・visible poll/hidden停止・親generation単位toast、DTO64KiBと最大50ページは採用可。履歴で現在権限喪失時の題名マスクを現 [read.ts](../../packages/core/src/application/integration/drive/backup/read.ts:167) と同等に行い、子snapshot/locator/keyを返さない。

## 追加観察（差戻し条件ではない）

1. page最大50は64KiBの十分条件ではない。titleは最大1000文字、UTF-8は可変長なので、詳細DTOのbyte予算による可変件数と続きcursorを実装時に選べる。計画は既に64KiBを要求しており、別の利用者機能やgateは不要である。
2. root受付の同command再読と再retryは、可変root generationを受付digestへ混ぜると旧receipt照会を壊し得る。固定受付digestと新retry commandの世代束縛を分けることは既冪等条件の具体化であり、本段で別API方式を指定しない。
3. 500件実転送の速度/30分完遂、200MiB全量/RSS、Google実接続はこの資源案で証明しない。計画が明示している契約検証範囲を維持し、未検証を成功に読み替えない。

## 実施範囲と停止

自ら実施したのは、skill全文とmanager-loop全文、CLAUDE.md、brief/design/planのP5c-2関連部分、P5c-2旧案/S3案、IN-05/06・IM-01/02・OR-09・JB-01〜03、および上記公開コードの静的照合である。`git rev-parse HEAD`、対象計画のSHA256、read-onlyのcat/sed/nl/rg/wc/metadataを用いた。DB/HTTP/browser/import/test/build/鍵/private proof/cache/旧結果操作・製品/DDL/dist/lock変更・外部送信は0。既実行報告の成功を自ら再実行したとは扱わない。

規定checks・migration・型/runtime・UI/停止保全は未実施。静的な成立可能性と、V1〜V5の必要性だけを報告する。Manager管理正本は編集していない。報告全文の確認後、文書を含む全操作を停止してRootへ返却する。

EOF
