# P4f-1 Node直接起動の限定診断

## 結果

2026-09-27T16:48:03+09:00に、既知Node実行ファイルをnative Perlから`--version`だけで1回直接spawnした。stdoutは`v22.22.3`、stderrは空、wait statusは0。自己子プロセスの生成から回収まで0.257秒だった。

対象は`/nix/store/m73kcssdrviw0jabgrvqb87k4sd7h8qv-nodejs-slim-22.22.3/bin/node`。`/usr/bin/file`は`Mach-O 64-bit executable arm64`と報告し、exit 0で終了した。

この観測は指定実exeの直接起動成功だけを示す。既存runtime、pnpm、Vitest、build、ブラウザの復旧を示す結果ではない。

## 起動と観測

- ツール起動は既定shell / `login:false`
- native `/usr/bin/perl`のfork後、子で指定exeと引数`--version`を直接exec。Node起動にshellのコマンド解決を挟まない
- stdinは`/dev/null`、stdout / stderrは別pipe。取得上限は各8192 bytes
- 生成した自己Node子PIDは16604、Perl親PIDは16602
- 0.25秒後、native `/bin/ps`で自己Node子だけのpid / ppid / state / wchan / etime / commを取得
- ps結果は`16604 16602 Z - 00:00 <defunct>`。この時点では終了済み・親によるwait前の子であり、実行中の停止位置ではない
- その後にwaitで正常終了を回収。ps子も回収済み。観測対象にlsofは使用しない

無応答時の保護はNode子9.5秒でTERM、0.2秒以内に終了しなければ同じ自己PIDだけKILLしてwaitする構成。ps子にも1.5秒の上限を置いた。今回は両方とも自然終了し、signal送信は0件だった。

Perl診断自体もexit 0で完了した。作業スクリプトやtmpは作成していない。

## 未確定事項と再開条件

以前の無応答の原因は未確定。実exeが現在起動できることと、shell起動経路が原因であることは別である。今回の結果だけでshell設定、環境変数、既存process、OS負荷を原因と断定しない。

製品検証の再開にはManagerによる実行禁止範囲の変更と、主担当による単独実行枠の調整が必要。実行を再開する場合も既存の無応答execの回収状態を別に確認し、今回の自己probe回収と混同しない。サーバー・テスト・ブラウザの起動は本診断の権限に含めない。

## 保全と返却

製品、DB、runtime、設定、依存、管理正本は変更していない。fresh / 旧proof、秘密、認証helper、ユーザーファイル内容、環境変数一覧は読んでいない。未知PID・既存processへのsignalは送信していない。

全自己子プロセスとpipe、execを回収した。未回収execは0。本報告を全文確認し、文書を含む全操作を停止する。
