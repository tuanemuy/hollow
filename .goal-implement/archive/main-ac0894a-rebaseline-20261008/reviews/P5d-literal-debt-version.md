# LD01 version期待補正 — 独立preflight PASS

記録時刻: 2026-10-06T07:47:23.682872+00:00。source候補 `040b07cf6ad18c08a2137535b34613adde2ba1d5`、親 `c5f570524342359ce9c216ef62a29f5e12aa80ec`。本判定は公開source/helper/reportの静的な最小差分に限定する。実行・機能受入・原因確定の判定ではない。レビュー保存後、全readを停止する。

## 結論と契約

Root採用のtest末尾version1→4とrunner監査version1→4はPASS。前独立レビュー [LD診断結果](P5d-literal-debt-diagnostic-result.md)（9788B/SHA256 `772e4b6f26ada248b8fec28e5502ec0be21f7b8f50176b2f8316d4b7354e275c`）の公開producer照合を継承する。drive接続ensureが初期version1を作り、同accountの正規begin3回が各admissionでversionを1ずつ増やすため、期待は1+3=4。今回のempty-code未検証callbacksは接続credential/folderを採用しない。退会cleanupの接続更新対象はcredential又はfolderを保持する行であり、NULL/NULL shellにUPDATEを行わないため、epoch0・version4・unlinked・NULL秘密を保持する期待と整合する。監査の4はこのsource由来の定数であり、実観測値から期待を生成していない。

前回54b3一巡のAssertionError実値・具体predicate・原因はUNKNOWNのまま保持する。final-verify-and-cleanup checkpointへの到達を当該group全assertの合格にしない。今回の静的矛盾修正を、前回失敗原因の遡及的な確定にしない。既EF局所受入を再openしない。

## 直接照合

own P5d公開sourceのHEAD/親・tracked clean・1pathの1literal差分を確認した。testはcanonical regular600/nonlink/nlink1/UID、NOFOLLOW fullreadの前後identityが一致し、12505B/SHA256 `e0690ee7097b2e86fa15c455f04f7ee3dd17dc3ee9d13af05aef34db29447e50`。末尾version4を1へ戻した全文は親の12505B/SHA256 `66c6fa21f5b18c5c95461e762f499924ebfc84359224801aab0c81fc5238c7c6` とbyte同値だった。source94全listed pathのHEAD blob/working bytes/SHAとpublic metadataを照合し、manifest `a293920f3546ca927fda68a7fd834064451fc3ff5fe0321462f83e13fdc57f21` を再計算した。他93pathは親と同値であり、製品・fixture・schema変更はない。

public runnerはcanonical regular600/nonlink/nlink1/UID、NOFOLLOW前後identity/fullhash固定25920B/SHA256 `0045eab31afb6504841a6c97eacf35f296460af0d8c28a1880d31cbcd09d7d85`。audit `d.version=4` 一箇所、ROOT一箇所、report path一箇所、manifest一箇所、unique markerのcount/split二参照だけをmemoryで逆適用し、旧全文25898B/SHA256 `4a06f2f50772bb9af12d2814e52daae722b87d759f9637230eb32b9a1a246032` と一致した。新marker `## LD01-FINAL-VERSION current source94 manifest` はreportに一箇所であり、94表を選択するbindingと整合する。runner Python ASTは解析PASS、評価/import/実行は0。

loaderは24600B/SHA256 `9d6103dfd8e8b2c52ea039dfe466adc9eccefd5f3941b276f7138c264d90723a` の全文不変を直接確認した。正本phaseはcanonical regular600/nonlink/nlink1でfullstable 20816B/SHA256 `3fed67ca2874843d32bdfd50b7ce4cb1b16f2d5ab447df05a7452883e9d66185`。現候補・source94表・runner/loader hashと新ROOTの静的bindingが一致する。

## 継承と未検証

既LD/diagnostic preflightのtyped同target/this/args・UoW/private proof・lane/gates・checkpoint/原error・finally・normal/audit拒否・stockfork・FS two-cap setsは逆適用全文一致から不変として継承する。元case/hook40秒・body180秒・outer240秒（TERM10/KILL10/PIPE10含む）、64wakes、200ms、root192MiB/DB1各32MiB・sum64MiB/TMP8MiB/output2MiB/material256KiBも変更なし。成功case/afterAll/fixture停止client閉鎖/fork実終了/NodePG不在/両EOFと独立FD閉鎖/force0を満たした後だけ同DB readonly監査へ進む条件は保持され、failure/diagnostic/non0/unknownを成功へ補完しない。全workspace3checksと既syntax成功は実装担当の報告を借用し、ここでは再演しない。

新 `goal-implement-p5d-literal-version-20261006-63a91fc2` と派生toolTMPは文字列bindingだけ確認し、存在探索・生成・defaultpreflight・実行・source import・DB・key・native操作は0。全旧/成功/失敗private、B、main、S5への操作も0。actual LD01再実行、version4実値、正常cleanup/監査、HTTP/legacy/65–67/全copies/全P5d受入は未検証。今回起動前の最小補正に残blockerは見つからず、次の有限一巡はRootの別採用判断へ返す。
