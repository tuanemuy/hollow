# OWNER-RACE1 OR-RECEIPT5 JSON bytes 最小補正

Root採用の独立レビューF1を直す候補。変更は既未実行NEW runner269のJSON比較一式へ `.encode("utf-8")` を加える一箇所だけ。SOURCE100/test/fixture/loader/旧helpers/ROOT/REPORT/MANIFEST/全schema/limits/frames/normalgates/監督/監査は不変更。候補/元失敗のdefault/preflight/actual/DB/Node/rootprobe/private操作0。独立再レビューは別担当へ委譲する。

## Exact delta と現在binding

対象 `.goal-implement/helpers/p5d-owner-race-predicate-receipt-runner.py` は25412B/SHA256 `b5f13abff953100e8066b9a5fe39a551b8350542c0d1c999d8edcae180dbd6f9`、canonical regular600/selfUID/nlink1。前後stable fullread/devino/mode/size/mtime/ctimeと実FDcloseを確認した。stat_resultの全field同値を要求した初回確認scriptで一回の照合失敗があった。content identityはatimeを含めず、正式前後signatureで確認した。初回の個別差fieldを推測しない。対象を重ねて書換えたり条件を変えたりしていない。

旧式の左辺 `json.dumps(packet, separators=(",", ":"), ensure_ascii=False)` はstr、右辺 `line[4:]` はbounded stdoutのbytesであった。今回左辺を同文字列のUTF-8 bytesにし、同元右辺と比較する。packet/source/header/decoderの表記、比較対象、条件短絡順を変更しない。新型変換は正規compact producerを比較可能にするもので、未知schemaを通すものではない。

この一式を逆変換した全bytesは旧25396B/SHA256 `35afd7718d237491c5ef040a5bcb33dc09a2ed4278d11bc894b09ebe2828d048` と直接同値。増分16B。固定loader19301B/SHA256 `3fdebe6c26735c6dd6ee6ff31ba4a1281acd8f7124249db500790b5e8cafa316`、SOURCE `516af3ba5e64f0ba1a7e3c9da697ca21d2b576f7`/SOURCE100pair `d94f54469a1bc2548378fdba11b0988fcf5fef4fe36f07591845f963350f8440` は元候補根拠を借用し、再sourcewalk/whole3はしていない。今回SOURCE変更0。

元候補phase `P5d-owner-race-predicate-receipt-candidate.md` 28183B/SHA256 `dd135792183cc4806e03ac0ae72ae5c56d6e4ec5a2b65fe67c08a2b4e7eb5a65` はimmutableのまま、runnerが参照するREPORTとsource100 uniqueheadingは不変更。本補正版がrunnerの現在bytes/SHAを上書きする管理根拠となる。旧phaseのrunnerSHAと一致するという主張はしない。

## 記述の限定補正

元候補の「キー順の非正規packetを拒否」は広すぎる。JSON roundtrip比較はduplicate key/noncompact/表記差を拒否するが、parseで保持される任意のunique-key順を再serializeも保持するため、wire上の固定キー順までは要求しない。exact keyset/range/typeは別predicateで維持し、元SOURCEproducerの順は不変更。今回固定順を強制する新gateを加えない。未知keyを許可するという意味ではない。

## 隔離した18境界式

ASTから純粋な `valid_race_receipt` と既 `case-failure-frame` predicateだけを抜き出し、json/builtinsと固定allowlistで評価した。helperのmain/top-level import/FS/network/default/fixture/監督は実行していない。全helper AST/compileはnoexecで成功。

| 隔離入力 | 結果 |
| --- | --- |
| 元typed normal receipt | accept |
| receipt全体null／各field null | accept（診断UNKNOWNのまま） |
| count各0／64 | accept |
| -1／65／bool整数／float整数／string整数 | reject |
| 未知nested／top key | reject |
| OR02 wrongcase／boolean fieldへ整数 | reject |
| duplicate nested／top JSON key | reject |
| 二つ目のcase-failure event | reject |
| unique-key順の置換 | accept（fixed orderは要求しない） |

これらは純粋なparser式の結果で、native競合/closure/fixture/audit/原receiptの観測を代用しない。nullを期待0へ合成せず、元case-failure persistent held/正常audit拒否は不変。原onTestFailed/write失敗境界/元erroridentity/SOURCE/bodyは変更0。

max source frame240B/outer229B≤512、新frame0/packet40を借用。不変loader19301＋旧REPORT28183＋現runner25412の材料は72896B、旧72880Bから16B増だけで≤262144。本PUBLIC補正文書は現在のruntime copy対象に追加されていない。仮にRootが別途材料へ含めても 77727 B≤262144。ROOTc8bd52a4と派生TMPは文字列予約のみ、未stat/probe/create。全旧actual/success/failure/private/root永久非操作。

元SOURCE whole3/Node syntax根拠は不変bytes範囲だけを借用し、新Python ASTと隔離18vectorを直接確認した。実テスト/型期待の緩和/診断正常化/新actual許可はない。全author reader/writerは固定後STOP。別担当の独立delta再レビュー→Root公開precheckと既default結果全inspect→別Root ONE判断という境界を維持する。
