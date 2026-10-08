# C0-F2 LOGICAL-DIAG1 最小補正

固定日時: 2026-10-06T13:12:28.001805+00:00

safe_diagnosticの未定義sqlite3.Errorを参照する二行elif枝だけ削除。未使用enum/import/catch/normalgate/receiptは不変更。config/SOURCE/case4/Reporter/stockFork/原Promise/終了監督/caps不変。default/preflight/test/import/DB/native/Worker/ROOTprobe/create/私領域操作0。

## 固定入力・現候補

| PUBLIC path | bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-3-drive-machine-c0-stop-test-candidate.md（不変更） | 17221 | 09e2ef6a727cc3d8e3c5b90caaaa408420b584337ad4336b066e0eb3e2236d96 |
| reviews/P5c-3-drive-machine-c0-stop-test-candidate.md（直接全文read） | 13114 | 7ea91b408ec2c5e62925c377ee862e966b2f80fb0b9e667e34f6e9f48f5cf24b |
| helpers/p5c-machine-stop-runner.py（親） | 281230 | 3ce0fdfe9ec4974f40b3c40f7688da7129d85f2b1dc2f4037338cb668d8483d9 |
| helpers/p5c-machine-stop-runner.py（現候補） | 281151 | 63c82cfd92ba8dbbd79045b26a92c3e6dbf43482e700abd290762b3476f30c21 |
| helpers/p5c-machine-stop-config.mts（全文同値） | 380456 | f2a843ed240aee1c628c39537e8db4a9ceafd94a5ebe4afe4147775e9973b8d9 |

直接全文はcanonical/regular0600/selfUID/nlink1/NOFOLLOW/fstat前後安定/fullSHA確認。変更は一箇所の二行79B削除のみ。

```python
    elif isinstance(error, sqlite3.Error):
        code = "audit-driver-error"
```

唯一 `elif error is not None` の直前へ再挿入する全inverseは親281230B/SHA3ce0fdfe9ec4974f40b3c40f7688da7129d85f2b1dc2f4037338cb668d8483d9に全文byte一致。前後anchor件数1をassert。AST内sqlite3 Name参照0。audit-driver-error enumは要求どおり残す。

## 隔離診断確認

全文Python AST parse/compile成功。helper全体をexec/importしない。safe_diagnostic関数ASTだけを隔離namespaceで定義し、DIAGNOSTICはliteral、BOUNDARY_CODESは原frozensetのliteral引数をast.literal_eval後にfrozensetへ構築。Boundaryは原同形のException派生空型。他のhelper関数/main/default/環境/source/runtimeを実行しない。

| vector | faultEnum | result |
| --- | --- | --- |
| none | NULL | PASS |
| boundary-known | agents | PASS |
| boundary-unknown | unknown-boundary | PASS |
| boundary-multiple | unknown-boundary | PASS |
| os-eperm | io-permission | PASS |
| os-eacces | io-permission | PASS |
| os-enoent | io-not-found | PASS |
| os-eexist | io-exists | PASS |
| os-other | io-error | PASS |
| unknown | unknown-fault | PASS |

各返値のその他fieldもDIAGNOSTIC原literalとexact同値をassert。これらは純診断name resolution/有限返値の直接結果であり、logical4/test/native/stockFork/DriveACK/正常停止の実証ではない。

初回自前解析ではfrozenset Callをast.literal_eval全体へ渡して停止した。runner書込前/新報告0で、現在のliteral引数限定処理へ修正して10vectors成功後にrunnerだけを書き込んだ。候補の実行/runtime障害ではない。Python AST/compileはcache0、隔離関数以外helper実行0。config全文不変のためNode/TS/wholechecks再演0。

SOURCE wholechecks・C176ea/1474regular21303283B+AGENTS・4case意味は元candidateと既独立SOURCEレビューの借用。SOURCE実物/旧rootを今回再読しない。root f82c613a/派生TMPはmemory-only全操作0。DB0/businessWorker0/businesschild0/Node1stockfork1/root192/cacheTMP8/material256K/log2/records58368/body30outer60/sharedtail30/200ms/TERM10KILL10PIPE10、IPC EOF/FD=NULL、actualPIPE EOF/FDclose/PGabsence/force0/finalstrictの正常条件不変更。

決定的静的name lookup欠陥の修正に限る。actual成功や原因証明へ昇格しない。新報告wx0600/O_EXCL/O_NOFOLLOW/fsync/実FDclose固定。runner以外config/SOURCE/元phase/review/Manager/main/S5/P5d/UI変更0。全旧private/generated/actual恒久NOOPS。固定後ALL SOURCE/helper/report reader/writer/runtime STOP。独立比例review＋Root別採用まで起動0。
