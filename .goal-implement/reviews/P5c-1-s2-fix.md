# P5c-1 S2 V1–V4 独立再検証

## 現在の判定

候補 `d946225ce80b983b0b9ee0f30d56442b73042075` の S2 修正範囲は合格。旧独立 V1–V4 の期待を変更せず、新しい合成 DB で全4対が成功した。固定 A/C/F の当該不成立は解消し、他の S2 根拠を維持できる。P5c-1 A〜F 全体の完成・実 Google/HTTP/UI の合格を意味しない。

独立実行は application 36対、元反例4対、V4 の current/exact-owner 追加2対、型検査。互いに重複する責務があり、重複なしの新規対として合算しない。旧独立 pure15/persistence18/auth-prune8・移行3対と主 lint/format は明示借用。新たな不合格は観測しなかった。

製品・管理正本・既報告は変更していない。旧不合格の履歴は [初回 S2 独立報告](P5c-1-s2.md) に保持する。S3 の実 HTTP 終了証明/late-close/ACK、後段 UI・実配備・actualfresh 移行は今回未実行である。

## 対象と同一性

- 独立領域: `/Users/hikaru/.local/share/hollow/verification/p5c1-s2-fix-independent-20260929-T8VXZJ`（排他作成、0700）。
- 正本: 現 brief/design/plan の Drive 契約、CLAUDE、主 `phases/P5c-1-s2-fix.md` 全文、初回独立報告。goal-implement / Manager Loop に従う限定再検証。
- 前候補 `51f350c2` から製品変更は5pathだけ: connection/folders/read/runner と driveApplication.integration.test。domain/port/repository/UoW/DDL/auth-prune は不変更。
- 開始 `2026-09-29T02:31:16.423Z`、最終 `2026-09-29T02:36:48.106Z` に候補 commit と公開20pathの working bytes を commit bytes と照合。変更5path集約と公開20path集約は開始/終端一致。

| 対象 | SHA256 |
| --- | --- |
| 変更5path | `74a5f3412523caeb5d74184cbde208b4bb76ef0f72912bbbb6b74686a6f01c96` |
| S2 公開20path | `77e55dfd8717b2765b79be052d7457a34050dec4514234f50f31fc99a8f8a14d` |
| 0038 SQL | `d305836ed40bd36d9febf05aaab9c8b1552dbf7b80b23c097110adc428670112` |
| snapshot | `653718f0094ce5651e6f6897669c8290446a7af0d2913e6eb3ea3f5fb84944fb` |

集約は相対 path を JavaScript sort し、`lowercaseSHA256 + two spaces + relativepath + LF` を連結して SHA256。証拠は自己領域 `start-seal.json` / `final-seal.json`。管理領域の既存 dirty を製品差としない。

## 四つの修正の独立結果

| 反例・固定条件 | 修正前の不成立 | 新候補の直接結果とコード根拠 |
| --- | --- | --- |
| V1 / A,F | 同accountの別live browserが同command再操作で旧authorize URLを受け取る | 拒否true / URL返却false / provider交換0 / active0。`connection.ts:139` は intent/current に加え `sameDriveActor` を検査し、URL構築前に拒否する。同actorの正当再操作は application 対で保持。旧callbackの拒否とbeginの拒否は別責務として確認。 |
| V2 / C | 応答不明後の同ID metadata 404を terminal-failed にし、明示再送不能 | reconciliation保持true / terminalFailed false / ownerClosed true / create1 / inspect1 / active0。曖昧な unavailable を reconciliation に残し、自動再送せず、同IDの明示send2を許す。application 対でsend上限・stale継続拒否も確認。 |
| V3 / C | 未観測parentをmetadata照会だけで自動採用 | parentUnknown true / adopted false / terminalCompleted false / ready / ownerClosed true。`folders.ts` は未観測親の409 conflictも確認対象にし、`read.ts` の有限confirmation DTOへ保存値を返す。通常createdは従来どおり完了。明示confirm時の再照会・親変更拒否・wrong target/stale拒否は application36 内で直接確認。 |
| V4 / C,F | provider終了済みでも protect の有限拒否でTx rollbackしactive ownerが残る | rejected false / terminalFailed true / ownerClosed true / ownerActive false / inspect1 / active0。`runner.ts:99` の結果採用境界が有限protection失敗を区別し、rollback後の別Txで同owner/currentを再確認してfailed+closedを保存する。 |

V4 は resource-key と candidate の protector 拒否、取消優先、DB例外の非偽commitを application36 内で再実行した。catch は採用callbackからの `BusinessRuleError/DRIVE_UNAVAILABLE` と同じ例外オブジェクトだけを対象とする。DB側で置換された例外や未知例外は伝播し、閉鎖保存済みとは返さない。再処理を無条件ループする実装ではない。

追加2対は自己 test 内の UoW interposition で、採用rollbackと閉鎖保存の間だけ競合を作った。実HTTP並行性の証明ではない。

- current失効: 合成本人sessionを通常 repository 経由で失効。再取得で `DRIVE_CONTEXT_CHANGED` / failed / closed となり active0。
- exact-owner置換: repositoryが許す ready/closed→新owner claim を介在させた。古い結果から新owner/token/versionが変更されない。新ownerのclosed=falseは期待した保護状態であり、実外部processを残したものではない。最後に fixture の正常終了で DB client を閉じ、自己tempだけ回収した。

## 条件別の S2 範囲

| 固定ID | S2範囲判定 | 根拠・残り |
| --- | --- | --- |
| P5c-1-A | 合格 | V1直接再現とapplication36。actor/current/command拘束を修正。実同意UI/HTTP/ACKは未接続・未実行。 |
| P5c-1-B | 維持・合格 | 未変更保存/portとapplication36の候補検証・旧接続保持。実Picker/Google metadataは未検証。 |
| P5c-1-C | 合格 | V2/V3/V4、正常created/409未知親/明示confirm/同IDsend2/非採用を直接確認。S1 terminal/send厳密guardは不変更の独立18対を借用。実wireのclose証明はS3残。 |
| P5c-1-D | 維持・合格 | 解除/取消/epoch責務は旧S2根拠と不変更コードを適用。V4 cancelled保持は直接。実backup取消はP5c-2、全revoke等の外部実験0。 |
| P5c-1-E | S2のDTO責務は合格、UI未検証 | ready確認DTOの条件と非秘密projectionを自読、application対で確認。日本語画面/Picker/memory/no-store/390/keyboardを実行済みとはしない。 |
| P5c-1-F | 合格（S2限定） | 型、比例DB、全資源終了、候補同一性を独立確認。DDL不変更につき前独立移行3対を借用。HTTP/build/UI/fresh保全・実Googleは今回対象外。 |

旧再openの P5a-C/G・P5b-1-A は S2 の局所影響に限り維持。Google認証本体/auth-prune、UoW・加算保存・DDLは変更されず、旧独立8対/保存18対/移行3対と current/取消/DB例外の今回直接確認を適用する。全OAuthや全既存機能を再実行した扱いにはしない。

## 実行・借用・安全境界

各実行は既知 Node 22.22.3 から新領域の `test-run.cjs application`、`test-run.cjs independent`（case2〜6）、`check.cjs typecheck`。独立4対の元期待は不変更。主helperの製品変更コマンドは自己copyで除外し型検査だけ許可した。主の lint/format 成功は借用であり、独立側は実行していない。

公開helperは通常file/no-symlink/指定bytesを確認後に全文を読み、排他copy・新path適合した。主から check1228B/seal2715B、旧独立から independent.test16668B/config510B/test-run4207B/reporter1798B だけを使用。同名上書きなし。旧rootでの実行/書込、旧DB/results/cache/private/secretコピーは0。既知失敗DBは開いていない。

移行の借用は旧ほぼ空の合成DBに対する保持/rollbackであり、actualfreshの保持証明へ拡張しない。provider/protectorはfake。実外部API/HTTP/UI/native/build/fresh/鍵/credential/notes操作0。S3の実終了proof/late-close/ACK未実装を、今回の保存修正の欠陥とも完成とも扱わない。

単一worker/bail1、TMPDIRの自己DB、cache無効、逐次実行と実close後のfixture正規cleanupを維持。新失敗/準備失敗なし。全実行childはclose/pipe終端・PID不在を確認、型検査もexit0。最後のsealはhandlesZero true、activeDbEntries0、runnerEntries0、DB/sidecar0B。最終metadata再集計は16files/35,875B、symlink0、material0。予算はDB64MiB/active16MiB/max5DB、material256KiB、other8MiBで、証拠削除による容量確保は行っていない。

## 最終返却

候補指紋一致、追加実験なし。報告全文確認後に文書を含む全read/write/runを停止し、未回収exec0でManagerへ所有を返却する。S2修正の受入判断はManagerに委ね、Drive全体や次phaseへ進まない。
