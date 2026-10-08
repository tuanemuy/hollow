# P3c の /tmp 回収ポリシー調査

## 結論

この Mac には `/tmp` の古い regular file を回収する Apple の `tmp_cleaner` が存在する。現有 script は atime・mtime・ctime のすべてに `+3` 日を要求し、launchd plist は 0 時台を指定する。提示された「古い 407 objects の欠落、新しい 50 objects の残存、directory mtime が 00:00」という境界に整合する有力な仮説である。

実削除主体は未確定。plist の存在と policy の一致は、当該 job がその時刻に起動し、407 objects を削除した証明ではない。job の実行履歴、当該 filesystem の atime 更新方針、欠落 object の削除直前の atime/mtime/ctime は確認していない。

実機調査と本文確認は `2026-09-11T00:51:07+09:00`〜`2026-09-11T00:54:53+09:00` の限定 read-only。報告以外のファイルは変更していない。OS cleaner、launchctl、find の探索・削除、DB、storage、browser、test、build、process 操作は実行していない。全体管理文書と goal API、spec/spec-implement は扱わない。報告には doc-style と markdown-style を適用する。

## 実機で確認した事実

`sw_vers -productName` は macOS、`sw_vers -productVersion` は `26.4.1`。

| 対象 | 現有状態 |
| --- | --- |
| `/etc/defaults/periodic.conf` | 不在 |
| `/etc/periodic.conf` | 不在 |
| `/etc/periodic/daily/110.clean-tmps` | 不在 |
| `/usr/sbin/periodic` | 不在 |
| `com.apple.periodic-daily/weekly/monthly.plist` | `/System/Library/LaunchDaemons` 内の指定 3 path は不在 |
| `/System/Library/LaunchDaemons/com.apple.tmp_cleaner.plist` | 存在。ProgramArguments は `/usr/libexec/tmp_cleaner` のみ。LowPriorityIO=true、Nice=1、StartCalendarInterval は Hour=0 |
| `/usr/libexec/tmp_cleaner` | 存在。1142 bytes の shell script。全文を読み、実行していない |
| `/usr/share/man/man8/tmp_cleaner.8` | 存在。`/tmp` の古い内容を日次で確認する用途、macOS 14.0 から存在、手動起動しない旨を明記 |
| `/System/Library/LaunchDaemons/com.apple.bsd.dirhelper.plist` | 別 job。CLEAN_FILES_OLDER_THAN_DAYS=3、RunAtLoad=true、03:35 の StartCalendarInterval。tmp_cleaner とは区別する |

旧 path の不在後は、`/etc`、`/System/Library/LaunchDaemons`、`/usr/libexec`、`/usr/sbin`、`/usr/share/man/man8` の直下名から periodic/tmp/clean/dirhelper 関連名だけを抽出した。全 disk やユーザーディレクトリは探索していない。`dirs_cleaner.8` は引数に渡された directory の内容を消す別 utility の説明であり、今回の起動元や対象の証拠には使わない。

## 現在の tmp_cleaner の条件

ローカル script の設定は対象 `/tmp`、日数 `3`。regular file は local filesystem に限定し、atime・mtime・ctime の三条件を AND で検査する。名前による除外は X 関連 lock/socket directory 名と quota.user/quota.group。object storage の directory 名を保護する設定は script 内にない。

regular file の削除条件に、親 directory が新しいことや利用 process が生存していることの例外はない。別の走査で古くて空の directory を回収する。ファイルの年齢判定に DB の createdAt や inode birthtime は使わない。この policy は [Apple 公開 tmp_cleaner source](https://github.com/apple-oss-distributions/diskdev_cmds/blob/main/tmp_cleaner/tmp_cleaner) と意味が一致する。公開 source とインストール済みファイルの byte/hash 同一性は検査していない。

ローカル `/usr/share/man/man1/find.1` は、無単位の atime/mtime/ctime を開始時刻からの差を次の 24 時間単位へ切り上げて比較し、`+n` は n より大きい値と定義する。標準 macOS find の仕様では、三時刻がそれぞれ約 72 時間を超えて古いことが必要になる。GNU find の丸め規則から「必ず丸4日待つ」とは推定しない。実 cleaner を起動して境界測定はしていない。

plist に Minute=0 はない。ローカル `/usr/share/man/man5/launchd.plist.5` は未指定項目を wildcard とする。確認できる設定は Hour=0 の時間帯であり、「毎日00:00に一度だけ確実に実行」とは断定しない。sleep 中の calendar interval は wake 後にまとめられる仕様で、実際の起動時刻は別に確認が必要になる。[Apple 公開 plist](https://github.com/apple-oss-distributions/diskdev_cmds/blob/main/tmp_cleaner/com.apple.tmp_cleaner.plist)、[Apple launchd の説明](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)。

## 与件との照合

以下は Manager から与えられた観測値であり、本調査で storage/DB を再走査した値ではない。時刻は同じ JST と仮定する。

| 与件 | policy との関係 |
| --- | --- |
| 457 基準中 407 objects、28,225,506B が不存在 | 個々の timestamp が三条件を満たしたかは不明。件数・bytes だけでは主体を識別できない |
| 欠落側の latest created が 9/6 22:09 頃 | 9/11 00:00 まで約97時間51分。mtime/ctime/atime も同程度に古いなら、72時間の条件と整合する |
| 残存 50 objects、1,150,842B、oldest created が 9/10 09:29 頃 | 9/11 00:00 まで約14時間31分。新規実ファイルの mtime/ctime がこの時刻なら古さの条件を満たさない |
| directory mtime が 9/11 00:00 | 設定された 0 時台と整合する。unlink や directory 内容変更による時刻更新だけでは actor を区別できない |
| 旧 DB 43 表の差0、object_deletes 該当0 | filesystem 側の回収が DB を更新せず参照だけを残すこととは整合する。他の filesystem 削除でも同じ状態になり得る |

9/6 と9/10の間に観測対象がないため、この境界だけから回収日数を逆算できない。直近の hash 検査等がある場合も、実 filesystem が atime を更新したか、そのアクセスがどの object に対するものかを分ける。DB createdAt、birthtime、mtime、ctime、atime は同一ではない。

## 不明と次の限定確認

- `com.apple.tmp_cleaner` が有効にロードされ、対象の 0 時台に実行されたかは不明。launchctl の状態や実行ログは本調査では読んでいない。実行回数や last exit が得られても、407 件の削除を直接証明するものではない。
- 対象 mount の種類・atime 更新方針は未確認。欠落 object の三時刻を保持する既存証跡があれば、回収候補だったかを read-only で照合できる。新しい copy の ctime を欠落元の証拠にしない。
- 実削除行を含む cleaner の出力・監査記録が既に保存されていれば、job 名と9/11 00:00前後の短い時間帯に限定して確認する余地がある。広範なログ検索や OS job 操作の提案ではない。記録がなければ主体は未確定のまま残す。
- 永続 object と唯一の保全資料を `/tmp` 配下へ置く運用は、この現有 policy と両立しない。永続領域への配置は Manager と主担当の復旧・運用判断に残す。本調査ではコピー・移動・復元・touch・権限変更・policy 無効化を行わない。

本書の確認後に全操作を停止する。主担当の helper/provenance/backup 調査は重複していない。
