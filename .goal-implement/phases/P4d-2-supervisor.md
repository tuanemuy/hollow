# P4d-2 PDF supervisor 限定補助

対象: P4d-2-G/B の監督部分。新規製品は `packages/core/src/adapters/node/pdf/supervisor.py` だけ。報告はこの文書だけで、他製品・共有 port・package・管理正本・旧 proof は不変更。

## 実装候補

`python supervisor.py check <runtimeRoot>` と `run <runtimeRoot> <workspaceUUID> <deadlineMs> <termGraceMs>` を実装した。deadline は run の monotonic 開始から 1〜3,600,000 ms、TERM grace は 1〜30,000 ms。main の今回設定は残時間 120,000 ms 以下／grace 3,000 ms。

- root/workspaces/workspace/native は本人 0700・no-follow で検査する。runtime.json、lock、ledger、manifest/pack と既存 output は本人 0600 の通常 file を検査し、hardlink も拒否する。root の symlink を含む別名を拒否し、内部 open は directory fd から行う。
- runtime.json は 16 KiB 以内、node/engine は絶対通常 file、node は実行可能とする。他の engine 設定を stdout に出さない。engine は指定 argv、new session、lock fd の明示継承、PATH/TMPDIR/LANG だけの環境で起動する。cwd も runtime root に固定する。
- flock 後に ledger を重複 key／余剰 field／型／値まで厳密に読む。旧 group 生存は 76 で拒否し、信号を送らない。壊れた ledger は 78、形が不正でも読める group に残存がある場合は 77。JSON null を欠損 ledger と混同しない。
- generation を増やし、`closed:false` と所有根拠を file/親 directory に fsync してから `go\n` を送る。開始前 cancel/EOF／既に期限切れなら GO しない。
- cancel 行、親 EOF、期限、監督自身への SIGTERM/SIGINT を同じ停止収束へ接続する。まず所有中の直接子へ TERM、grace 後に所有を証明できる group だけ KILL。子孫と pipe EOF を照合してから直接子を reap し、ledger を closed にする。
- stdout は固定 event のみ。engine の JSON は 64 KiB line、UTF-8、重複 key、未知 field／shape、二重 terminal、terminal 後の出力を検査する。stage は指定 4 値だけ、重複 stage は再出力しない。render-closed の identifier は固定 literal で、任意値ではない。
- engine stderr は内容を保存・表示せず drain/count だけを行う。成功は valid render-closed(ok/allClosed/sha)＋子 exit 0＋実終了＋期限内の全条件。render-closed だけでは成功にしない。

## 所有契約

Manager が採用した `os.waitid(P_PID, pid, WEXITED | WNOHANG | WNOWAIT)` により、engine が終了しても group 照合まで直接子 PID を reap しない。`Popen.poll()` を engine に使わない。PID を再利用不能に保ち、session/group と親子関係を確認した連続所有の間だけ signal する。ps の秒単位開始時刻を出生証明に使わない。

ledger は次の厳密な version 1。

```text
{ version: 1, generation: positiveSafeInteger, group: pid,
  workspace: uuid, closed: boolean,
  owner: { kind: 'unreaped-child-v1', supervisor: pid, child: group,
           session: group, spawnMonotonicNs: decimalString } }
```

spawnMonotonicNs は記録であり、再起動後の signal 許可証ではない。旧 ledger は常に「旧 group がいれば拒否」のみで、再起動後に所有を再獲得しない。

`/bin/ps` は pid/ppid/pgid/stat だけを 2 秒／8 MiB の有限取得にし、本文を出力しない。これは監督内部の技術上限で、ノート・媒体の業務上限ではない。観測した子孫が group 外に残れば fail-closed にする。固定 engine/Chrome が同 group を維持する参照配備が前提で、観測の間に任意 setsid で逃げる敵対的子孫の OS 封じ込めを保証しない。

KILL 後の実終了照合は最大 5 秒、pipe EOF drain は最大 2 秒。確認できなければ 77／closed:false とし、ledger・workspace を成功扱いで消さない。supervisor は output.partial.pdf／output.pdf を削除しない。native-temp の実量 polling と artifact 検証・削除は main の engine/workspace 所有。

## 出力と exit

| 場合 | stdout／process exit |
| --- | --- |
| check 正常 | `{event:'checked',closed:true}`／0 |
| 実行開始 | `{event:'spawn',group,generation}` |
| 進捗 | `{event:'stage',name}` |
| engine 終端 | 固定 render-closed 全 field を厳密検査後に転送 |
| supervisor 終端 | `{event:'supervisor-closed',closed,reason,exit,group,generation,elapsedMs,stderrBytes}` |
| run 正常／終了済み失敗・取消 | process exit 0／1 |
| lock／旧 group／close 未証明／config-ledger 不正 | process exit 75／76／77／78 |

supervisor-closed の exit は子 returncode（signal は負数、未起動は null）。supervisor 自身の exit ではない。起動前 group/generation は null。preflight 拒否は closed:false を出し、未知の既存実行が無いとは主張しない。reason はコード内固定 literal に限る。

## 静的確認と未検証

goal-implement と manager-loop を全文確認し、採用 corrected prototype の `supervisor.py` と現在製品 `engine.ts` を読取参照した。本文の書込は apply_patch のみ。途中全文照合で親 cancel parser の配置を修正し、正常／例外 cleanup の双方へ pipe EOF 検査を揃えた。

main の 2026-09-20T07:21:22+09:00 報告によれば、明示 Python 3.14.3 に waitid/P_PID/WEXITED/WNOHANG/WNOWAIT が存在することを子 spawn なしで確認済み。これは main の能力確認を借用したもので、本補助が実行した検証ではなく、WNOWAIT の実挙動の成功でもない。

本補助は Python 実行・compile・test・Chrome・PDF生成・runtime/DB・ネット接続・proof 書込・commit を一切実施していない。構文と分岐は目視の全文確認のみ。main への引継ぎは、実子 pin/未reap終了、正常・TERM/KILL・EOF・deadline、旧 group 生存と壊れた ledger、stderr flood／不正 protocol、実 Chrome の group と pipe 終了、同一 lock の二重開始、途中 supervisor 事故の既存監督契約の統合対である。新しい受入 gate の追加ではない。

P4d-2 全体・実 PDF 成功の報告ではなく、監督 source の静的実装候補である。返却時に両ファイルを全文確認し、書込・読取を含む全操作を停止する。
