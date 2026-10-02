# P5c-1 S5b synthetic capability

2026-09-30 18:02 JST。起動前の redirect 制約を報告後、Manager が「redirect 先は route ではなく自己 deny proxy で拒否する」期待へ変更採用した。未実行枠の **1 回**を実行し、追加 browser 試行はしていない。

Chrome 154 の起動 / Playwright 接続 / synthetic JS の MIME と nosniff / nonce CSP 下の script 実行と nonce なし inline 拒否は成立。HTTP redirect 先は route handler を通らず、自己 deny proxy の対象カウンタ 1 件と固定 403 処理、外部 forward 0 により拒否した。ブラウザ側 response status は取得できず、page.goto の拒否として観測した。これは期待した拒否を否定する結果ではない。

自己 Chrome は exit 0 / signal null、fd 1/2/3/4 close を確認。proxy は close / socket 0、fresh profile は cleanup 後 0 B。単発 runner の集計は stderr close flag を採取した時点で false だったため、**runner の両 pipe EOF / close 観測は不十分**。この不足を ESRCH で置換せず、全検証成功とはしていない。本体 Drive UI / 実 Google SDK の検証ではない。

## 実行結果

前段 root `RaaaPD` 配下に `capability/` と専用 `capability/tmp/` を作成し、Node 起動前に TMPDIR を固定した。既存 profile / persistent context / 既存 CDP / ユーザー Chrome は使用していない。新 browser tree 1、context 1、page 1。proxy は自己 `127.0.0.1:0` に新規 bind し、外部へ接続する実装を持たない。

| 観測 | 結果 |
| --- | --- |
| Chrome exact binary / Info.plist | 通常 file、367,696 B / 18,856 B、version 154.0.8037.59 |
| tooling 179 files aggregate（import 前） | 前段 `dc520408…fad3cc5` と一致 |
| document / JS / redirect 元 / redirect 先 | 各 1 件、page requests 4 件 |
| route handler | 3 件。redirect 先は入らない |
| proxy の exact redirect 先拒否 | 1 件。固定 403 / Connection: close、forward 0 |
| proxy の背景通信拒否 | 9 件。HTTP / CONNECT をすべて拒否、forward 0 |
| proxy 受信 bytes | 2,924 B |
| proxy 応答計上 | 5,120 B（1 応答 512 B の保守的計上。実 wire 計測ではない） |
| page request 集計 / synthetic body | 1,483 B / 311 B（full wire 計測ではない） |
| JS MIME / nosniff / CSP header | すべて一致 |
| external script による DOM 更新 | true |
| nonce なし inline script の DOM 更新拒否 | true |
| route 未知要求 / WebSocket handler | 0 / 0 |
| proxy close / 残 socket | true / 0 |
| Chrome exit / signal / ChildProcess close | 0 / null / true |
| Chrome stdio fd 1/2/3/4 close | すべて true |
| context.close / BrowserServer.close resolve | true / true |
| fresh profile 観測 peak / final | 1,392,961 B / 0 B |

HTML は 1 KiB 以下、JS は 4 KiB 以下。HTML 内の external script が許可された nonce で DOM を更新し、nonce のない別 inline script は更新できなかったことを locator の text / attribute から確認した。任意 evaluate、CSP bypass、実 SDK 読込、cookie/storage inspection はしていない。

redirect 先は合成 `.invalid` の exact URL を memory 内で比較し、raw URL / request body / headers / proxy target を出力していない。page.goto の詳細 error は保存せず、有限分類 `FAILED_REDIRECT` のみを記録した。helper は response status 403 を返すことを成功条件にしたため `pass:false` / exit 1 になったが、Manager の変更採用した「proxy で拒否」という条件は proxy の直接観測で別に評価できる。ブラウザ側の HTTP status は null のまま残し、403 を受信したとは主張しない。

背景無効化の Playwright 既定 flags は変更していない。deny proxy は転送しないが、Chrome の DNS や OS 全通信の完全遮断までは証明していない。WebSocket / ServiceWorker block は page 作成前に設定したが、今回その異常系通信を生成していないので実拒否テストの成功には数えない。

## 所有終了と未証明境界

known PID は runner 18824、capability Node 18825、自己 Chrome 18826。後続のこの 3 PID だけの確認で全件 ESRCH。未知 PID / 広域 process / port scan はしていない。

Chrome の ChildProcess と fd 1/2/3/4 の close は BrowserServer.process() 取得直後に監視登録し、実イベントと stream.closed で確認した。Chrome の exit signal は null で、標準 fallback の SIGKILL 発動は観測していない。手動 kill は 0。自動生成 profile / artifacts は正規 library cleanup により専用 TMPDIR から除去された。削除対象は今回の空 profile から生成した自己 synthetic browser データのみで、ユーザーデータは含まない。

runner は子 stdout/stderr の close と ChildProcess close を同期区間で監視登録している。しかし ChildProcess close の callback 内で即座に集計を出し、その時点で stdoutClosed=true、stderrClosed=false だった。記録は stderrBytes=0、child exit 1 / signal null。後から stderr close が来たかを再出力する処理はない。従って「stderr が実際に開いたままだった」とも「観測順序だけだった」とも断定できない。単発 exec は終端、PID は ESRCH だが、失われた pipe EOF / close の直接証拠を補うものではない。次の実行を行うなら runner の両 stream close を独立に await してから集計する必要があるが、今回の再試行はしていない。

Playwright 制御 listener / accepted socket の個別 close イベントと OS 全 descendants の終端は独立に観測していない。Node runner の自然終端は自己 runtime が event loop を保持していない根拠だが、全 OS 子孫の証明へ拡大しない。

## 容量と公開 helper

| 対象 | bytes / SHA-256 |
| --- | --- |
| capability directory（2 regular files、symlink 0） | 12,045 B |
| 前段 helper/config/TMPDIR と今回 helper の合計 | 1,372,083 B / 上限 8 MiB |
| 新 browser TMPDIR final | 0 B / 上限 128 MiB |
| RaaaPD 全体 | 59,247,437 B、regular files 745、既知 bin symlink 2 |
| capability/run.cjs（1,459 B） | `0c88a21989860d81ac72cdac6f424afa18c37a28ba5aef935ca91e7897d4d1f9` |
| capability/capability.cjs（10,586 B） | `e33c118319dc3d676a553487fa1b2be8803666e590c8f60165eefd2319baedc0` |

容量監視は 500 ms ごとの観測値であり、瞬間 peak の厳密上限保証ではない。proxy 予算超過、profile 予算超過、deadline は発動していない。helper と公開 tooling は再現・監査用に保持した。

## 起動前に判明した制約

採用案は synthetic document → JS、synthetic HTTP redirect → unknown request の合計 4 requests を、単一 context catch-all route で fulfill / abort するものだった。

隔離導入済み `playwright-core@1.63.0` の公開 source `lib/coreBundle.js:36251–36258` は、Chromium の request に `redirectedFrom` がある場合、`RouteImpl` を作成せず `Fetch.continueRequest` を送る。新規 request だけがその次の分岐で `RouteImpl` を持つ。これは page/context の route handler より内側の Chromium network manager 共通経路であり、context catch-all の predicate を広げても redirect 後の handler 呼出しにはならない。

同 package の `types/types.d.ts:4413` にも、redirect response の場合は最初の URL にだけ handler が呼ばれる制約が記載されている。

従って次の二つは別の判定であり、初回の差分報告では後者を前者へ読み替えなかった。その後 Manager が後者を別の観測条件として変更採用した。

- 指定された検証: redirect 後の unknown request が context route に入り、`route.abort()` で拒否される。
- 別案になり得る検証: redirect 後は route を通らず、転送しない自己 deny proxy で 403 にする。

JS による `location` 遷移へ置換することも、HTTP redirect の検証ではなくなるため行っていない。private CDP・dependency patch・system firewall での迂回も行っていない。

## 根拠の再照合

元 tooling 報告を全文確認し、今回の静的確認後に source の公開 hash を再計算。前段 fingerprint と一致した。

| 公開 file | bytes | SHA-256 |
| --- | ---: | --- |
| core/lib/coreBundle.js | 3,477,183 | `549070af3acabb3efcc4f55bfe6210f9f7c2fcf633cf7eaa59bfe60719969171` |
| core/types/types.d.ts | 1,131,883 | `2806f6d7810fba0306066d500cd716a6d1128d90af2c3cf71723e3ea0a8904c4` |

根拠領域: `/Users/hikaru/.local/share/hollow/verification/p5c1-browser-tooling-20260930-RaaaPD/tooling/node_modules/playwright-core`。初回差分の時点では package 全体の再 aggregate や Chrome metadata 再確認へ進まず返却した。変更採用後には、先頭の実行結果にあるとおり両方を確認して起動した。

## 初回差分時点の停止記録

今回の追加作業は公開 source と報告の read、およびこの報告だけ。capability directory / helper / TMPDIR / profile の新規作成 0、Playwright import / launch / connect 0、deny proxy bind 0、HTTP/CONNECT 0、page request 0、製品編集 / DB / account / key / SDK / 本体 boot 0。

既存 Chrome / profile / process / port の追加探索はしていない。自己継続 child / listener / socket / exec は生成していない。source hash 検査の単発 Node は同期 exec の exit 0 で終了済み。再試行 0。

上記は起動前差分を返した時点の記録。その後の変更採用と 1 回の実行結果は本報告の先頭に記載した。

## 最終停止・返却

製品 / 主担当 root / DB / account / key / 実 Google SDK / 本体 boot は 0。今回の試行は終了し、再試行 0、未回収 exec 0。報告を全文 EOF まで確認後、全 read/write/run を停止して Manager に所有を返却する。

## 追加修正: runner の EOF / close smoke

2026-09-30 18:07 JST。Manager が許可した自己 public helper の修正と、秘密なし Node 子 1 回だけの smoke を実施。追加 browser 起動 / 元 capability 再試行 / profile / DB / key / 製品操作は 0。

`capability/run.cjs` は、生成直後の同期区間で stdout/stderr の `end` と `close`、子の `exit` と `close` をそれぞれ監視し、すべてを独立した Promise で待ってから最終集計する。登録直後に `readableEnded` / `closed` / `exitCode` / `signalCode` の既終了状態も照合する。child close callback 内の stream 状態と最終状態を分けて出力する。有限 deadline は smoke 15 秒 / capability 120 秒。deadline は不成功の有限結果を出すだけで、未知終了を成功扱いせず、手動 kill はしない。

smoke は標準 Node の `-e` で stdout / stderr に各 1 メッセージ（各 13 B）を書いて自然終了する。外部接続、Playwright import、追加 dependency、既存 root の private data 読取はない。

| 観測 | 結果 |
| --- | --- |
| 実行回数 | 1 |
| runner / child PID | 22417 / 22420 |
| child exit / signal / close | 0 / null / true |
| stdout 既知メッセージ / bytes | 一致 / 13 B |
| stderr 既知メッセージ / bytes | 一致 / 13 B |
| child close callback 時点 | stdout end/close=true、stderr end=true / close=false |
| 最終独立待機後 | 両 stdout/stderr end/close=true |
| spawn / stream error、overflow、deadline | すべて false |
| runner 最終結果 / exec | pass=true / exit 0 |
| 上記 2 PID だけの後続確認 | 両方 ESRCH |

今回の smoke では child close より遅い stderr close を直接観測し、修正がそれを待つことを確認した。これは **元 browser 試行の失われた EOF / close の履歴を修復する証拠ではない**。前節の元結果・未証明境界は変更しない。

`capability.cjs` は変更採用済みの判定へ合わせ、redirect navigation 拒否を有限 boolean として記録し、exact redirect proxy count=1 / route count=3 / forward=0 を確認するようにした。ブラウザ側 response status=403 という追加の必須条件は除いた。実行回数・通信・終了条件は増やしていない。この修正版 capability は **実行していない**。

| 修正後の公開 helper / 容量 | bytes / SHA-256 |
| --- | --- |
| capability/run.cjs | 3,963 B / `61a0f3b8b30f0171bf2709feacf52d9a78425a5976f981c63b68e4ba95f3f52b` |
| capability/capability.cjs | 10,758 B / `36d4ae60c68c2b5cef2777b17ead1b103a8f4ab8f647c508ee9f2a9e774904d0` |
| capability directory | 14,721 B、regular files 2、symlink 0 |
| helper/config/TMPDIR 合計 | 1,374,759 B / 上限 8 MiB |
| browser TMPDIR | 0 B、files 0 |
| RaaaPD 全体 | 59,250,113 B、regular files 745、既知 bin symlink 2 |

smoke の全子・runner は終端で、未回収 exec 0。今回も全 read/write/run を停止し、Manager に所有返却する。

EOF
