# C0 logical4 工具 LOGICAL-DIAG1 限定再レビュー

判定: **LIMITED static PASS — 二行79Bの診断補正のみ**。
元独立レビューの LOGICAL-DIAG1（DBを除いた工具に残る未定義 sqlite3.Error 参照）は解消した。通常 error=None が未定義名 lookup へ落ちる経路は除去され、既 normal gate／receipt／SOURCE binding／case4／stockFork／Promise／native handles／終了監督／caps は全文 inverse から不変更と確認できる。これは Root が別 precheck/default/actual を採用するための工具差分判定であり、logical4 実合格、same proof recovery／Drive ACK／native closure／C0 全停止実証ではない。

Reviewer は元 C0 SOURCE author だが、本件工具と今回補正の実装には非参加。今回の独立範囲を新診断 delta に限定する。SOURCE の意味／wholechecks／official reporter と stockFork の元判定は既候補レビューから借用し、SOURCE を再読していない。helper 全体・safe_diagnostic の実行も行わない。default/preflight/test/Node import/runtime/DB/native/Worker/root probe/create/private 操作はゼロ。新レビュー一ファイルのみ wx0600 作成、他工具・SOURCE・元 report・Manager/main/S5/P5d/UI は変更しない。

## PUBLIC 固定入力

|入力|bytes|SHA256|
|---|---:|---|
|phases/P5c-3-drive-machine-c0-stop-test-diagnostic-fix.md|3982|44cdb13d120e4a4281eab0cf674ff7548c1ab1d2765bf5addcd832900143cd09|
|helpers/p5c-machine-stop-runner.py|281151|63c82cfd92ba8dbbd79045b26a92c3e6dbf43482e700abd290762b3476f30c21|
|helpers/p5c-machine-stop-config.mts|380456|f2a843ed240aee1c628c39537e8db4a9ceafd94a5ebe4afe4147775e9973b8d9|
|reviews/P5c-3-drive-machine-c0-stop-test-candidate.md|13114|7ea91b408ec2c5e62925c377ee862e966b2f80fb0b9e667e34f6e9f48f5cf24b|

各 exact PUBLIC file は canonical、regular、nonlink、mode0600、UID501、nlink1、O_NOFOLLOW fullread、path/FD 前後 dev/ino/mode/UID/nlink/bytes/mtime/ctime 同値、full SHA、実 FD close を直接確認。未知 file/root は読まない。

## 全文逆差分と name lookup

現在の唯一 `    elif error is not None:` anchor の直前へ次の二行を一回だけ戻した。

```python
    elif isinstance(error, sqlite3.Error):
        code = "audit-driver-error"
```

この追加が79Bで、復元全文281230Bの SHA256 は 3ce0fdfe9ec4974f40b3c40f7688da7129d85f2b1dc2f4037338cb668d8483d9 に直接一致。元候補 runner 全 bytes の SHA と同じであり、局所 snippet／文書説明だけの照合ではない。config は元380456B/full SHA と直接一致。従属 CONFIG_SHA を変える必要がないことも一致から支持される。

現 runner Python AST parse／compile は cache0/noexec で成功。AST の sqlite3 Name は0。safe_diagnostic は Boundary の既 exact code 又は unknown-boundary、OSError の既 errno 固定 enum、非 None の unknown-fault、None の NULL のみを選ぶ。原 DIAGNOSTIC fields の copy と faultEnum を返す構造は保持。None 経路で未定義 sqlite3 を評価しない。SQLite import 復活、広い catch、unknown 正常化、diagnostic extra field、normal gate の緩和、unused audit-driver-error enum の削除は混入していない。

作者の isolated10vectors（None、既知/未知/複数Boundary、EPERM/EACCES/ENOENT/EEXIST/その他OSError、unknown）成功は固定 author 報告の借用である。自分の直接 evidence は AST／原 Python 分岐の静的因果／全文 inverse までであり、作者の isolated exec を独立再演していない。helper compile 成功のみでは name lookup 欠陥を検出できない点は元レビューと同じだが、今回は該当参照0を直接確認した。

## 不変更範囲と次 scope

全文逆差分により SOURCE1474regular+AGENTS/21303283B、PUBLIC108/83、CF、C176ea binding、exact4 case/fullpath gating、Reporter/ObservedFork、receiver/args/Promise/stock argv、cacheFsfalse/pool1、native Worker/businesschild/DB/http0、strict normal、original Node/known PG/PIPE EOF/actual FD close と force 欄は今回 delta の外で同値。これらの現在の物理 SOURCE/public target は再walk/hashしていない。

body30/outer60/sharedtail30、case/hook10、poll200ms、TERM10/KILL10/PIPE10、root192/cacheTMP8/log2/material256KiB、records58368、configPUBLIC readonly1MiB の既候補予算は不変更。IPC EOF/FD NULL は NULL のまま、native proof を補完しない。root f82c613a と派生 TMP の存在 probe はゼロ。全旧actual/generated/private roots 永久NOOPSを維持する。

既元候補レビューの不合格点 LOGICAL-DIAG1 に対するこの最小補正を受入可能とする。工具本体・SOURCE/tests の actual はまだ未実行。Root の別 explicit scope まで起動しない。

固定後 ALL SOURCE/helper/report reader/writer/runtime STOP。
