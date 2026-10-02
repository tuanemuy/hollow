# S5b ACK proxy Node-only toy

2026-09-30 19:36 JST。先行 toy を初回 1 回で実行し、HTTP の T1〜T4 と純 predicate 4 対がすべて合格した。client HTTP **4** / backend HTTP **3** の枠を使い切っており、追加 HTTP や再試行はしていない。

これは proxy の backend 応答確認・native 終端・downstream ACK 欠落を確かめた結果である。本物の browser、Hollow、本人確認、command/receipt、ACK 後純 GET、製品 V1 の成功ではない。それらは後続の実 UI で確認する必要がある。

## 隔離・公開 artifact

新 root は `/Users/hikaru/.local/share/hollow/verification/p5c1-s5b-ack-toy-20260930-C0NvJq`。排他作成、通常 directory、mode 0700。現在 regular file 3、symlink 0、材料 / DB / key / browser profile は 0。製品、主 fix root、旧 root は変更していない。

| 公開 artifact | bytes | SHA-256 |
| --- | ---: | --- |
| `ack-fault.cjs` | 9,183 | `09b3e42e848681b52aff6b382aa65e171ca64be05a57d5f4e3cc8e6a7cc9a722` |
| `toy.cjs` | 9,548 | `9e806e2751c2a4b12e85811d13b4a0d46908bbffad89a489f8b3447ada490e99` |
| `run.cjs` | 2,137 | `718dbef10b55cd2dc310e8aaacc2f930805142ae68f81f324fdc2a421a3c4a71` |

helper 合計は **20,868 B / 32 KiB**。3 file の `node --check` が exit 0。toy と pipe collector が出した結果は有限 JSON のみで、toy stdout は 2,016 B、stderr 0 B、collector の有限出力を含めても 16 KiB 未満。raw body、Cookie、URL query、error/stack を出力していない。結果の根拠は今回の有限 tool 出力と本報告であり、元 S5b-2 の非保存結果を復元したものではない。

## reusable module の契約

`ack-fault.cjs` は import 時に listener / request を起動しない。標準 `node:http` だけを使い、次を export する。

- `createAckFault({ origin, pathname, current, accept })` → `bind(snapshot) / handle(request,response) / state()`。
- `sameBoundRequest(expected,actual)` → byte 列、Cookie/Origin/Referer/Content-Type、actor/page/generation を memory 内で比較する純 predicate。

`origin` は exact `http://127.0.0.1:<port>`、対象は query なしの固定 POST path。`current()` は main が現在の本人/page/document generation を返す関数、`accept(bytes)` は main が実 endpoint の正常 receipt envelope を確かめる関数として注入する。toy の両関数は synthetic facts であり、Hollow の実契約と同一ではない。

bind は一度のみ。対象 response は proxy 内に最大 64 KiB だけ保持し、正常 acceptance と request/response/socket 終端が揃った後で downstream を1回だけ destroy する。headers/body を browser へ送ってから落とす実装ではない。対象 native request は固定自己宛、agent=false、Connection: close、redirect/retry の実装なし。private CDP、Playwright route.fetch、CONNECT 許可は使わない。

統合時の注意:

- main は現在の page/main frame/actor と command/Picker/folder を実 request から検証してから `bind` し、同一 request を `route.continue()` で一度だけ流す。
- `handle()` の false は「非対象」であり「拒否済み」ではない。outer proxy の exact origin/method/path/query guard を必ず維持する。fault 中の selection POST が別 query/userinfo 等を持つ場合に ordinary forward へ落としてはならない。
- `current()` と `accept()` は秘密を出力せず、失敗を有限に扱う必要がある。実 actor の取得元と selection response schema は main が現製品で確かめる。
- 二つ目の対象 POST は409で拒否し、backendへ送らない。browserの自動再送ゼロは、この防御とは別に観測する。
- global request/wire budget と CONNECT 全拒否は既存 outer proxy が担う。module 自体を汎用の許可 proxy として使わない。

## 直接結果

標準 Node client 1、自己 backend/proxy server 最大同時 2。最初の pair を完全停止してから redirect 用 pair を作った。実行は既知 Node 22.22.3、子 env は PATH/LANG/LC_ALL/TMPDIR/NODE_DISABLE_COMPILE_CACHE の許可集合のみ。既存設定・資格・cache を読んでいない。

| 対 | 直接観測 |
| --- | --- |
| T1 通常 ACK | client 200、response end/complete/close、client request/socket close。通常 proxy upstream の request/response/socket close=1 |
| T2 ACK 欠落 | target match1、upstream POST1、socket connected、200正常synthetic receipt、response end+complete+close、request/socket closeの全 true。accept1 の後に drop1。downstream headers 未送信、response/socket close。client は response 未受領・error、request/socket close |
| T3 重複拒否 | 同一 body の二つ目の要求に409、完全文書。duplicate1、backend request 増分0 |
| T4 redirect拒否 | upstream302は end+complete/native全 close。accept0/drop0、有限 outcome=`redirect_rejected`。client502、Locationを転送しない。redirect先への追加要求0 |

T2 の `status=200` だけではなく、toy 固有の正常 receipt predicate が true になったことを確認している。backend の memory commit は T1 と T2 の合計 2。T4 は正常受付に数えていない。

純対は sameBoundRequest の一致、body 不一致、Cookie header 不一致、古い generation の4対。HTTP を追加せず同じ export 関数で確認した。実 browser の Cookie / actor の正当性や frame identity を証明するものではない。

## 予算・終端

| 項目 | 実測 |
| --- | ---: |
| client HTTP | 4 / 4 |
| backend HTTP | 3 / 3 |
| backend memory commits | 2 |
| server start / close | 4 / 4（2 pair逐次） |
| accepted socket open / close | 7 / 7 |
| accepted socket read+write 合算 | 2,408 B / 1 MiB |
| redirect follow / CONNECT許可 / external forward | 0 / 0 / 0 |
| known runner / child PID | 25661 / 25662 |

wire値は各自己 listener の accepted socket の bytesRead+bytesWritten を終端で合算したもの。proxy側とbackend側の両legを含み、full OS packet計測ではない。自分が作った loopback peer 以外へ接続する経路はない。CONNECT 拒否コードは維持したが、今回の4要求に CONNECT の実拒否対は含めていない。

request/body は最大16 KiB、response body は64 KiB、headerは16 KiBで有限化。各HTTP対は10秒、全体55秒の自己監督と60秒の collector deadline を設定し、いずれも発動しなかった。手動 process kill は0。限定 request/socket の destroy はT2の意図した ACK 欠落に用いた。

runner は生成直後に子 exit/close と stdout/stderr end/close を登録し、両 stream の既終了 state も照合する。今回の最終出力は子 exit0/signal null、child close、両 stdout/stderr end/close がすべて true、collector pass=true / exec exit0。後続の上記2 PIDだけの照合で双方 ESRCH。失われた過去の EOF をこの成功で埋めたとはしていない。

## 未検証と返却

未検証は、本物の Chrome 通常 proxy path と page/本人/command 束縛、Hollow正常receiptの判定、ACK欠落UIとその後の純GET、実自動POST増分0、同ID作成、relink、製品 V1 修正後UIである。toy4対の合格をこれらへ広げない。応答超過・timeout・途中切断などの追加 fault は実行していない。

公開 artifact 3 file と本報告を全文 EOF まで確認した。HTTP枠に余りはなく、追加試行0。未回収 exec / child / 自己 listener / accepted socket は0。全 read/write/run を停止し、artifact 所有を Manager に返却する。

EOF
