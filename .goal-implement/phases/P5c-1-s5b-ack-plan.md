# S5b ACK 遮断の工具提案

2026-09-30。静的提案のみ。helper 作成・評価・import・実行、HTTP / browser / app / DB / 鍵生成は 0。製品 V1 修正には触れていない。

## 結論

`route.fetch()` を使わず、通常の browser request を `route.continue()` で一度だけ流し、既存の exact 自己 Hollow HTTP proxy 内で対象応答を落とす案は、現在の CONNECT 全拒否設定と両立する。必要な変更は、route 側の一度限りの本人・page・command 束縛と、proxy 側の対象 request だけの buffered-response 分岐である。CONNECT 許可、proxy bypass、任意 CDP、製品の変更は不要。

ただし成立は静的な見通しであり、backend forward / native 終端 / browser ACK 欠落の実成功は未検証。先に Node だけの toy 対で同じ proxy 分岐を確認し、その後に app/browser 付きで確かめる。旧試行の `faultForwarded=1` を backend 到達の証拠へ変更しない。

## 確認した根拠

主報告 `phases/P5c-1-s5b2.md` と独立報告 `reviews/P5c-1-s5b2.md` を全文読了した。旧試行は route.fetch 呼出後、backend acceptance の確認前に停止。原例外・status は非保存で、実原因の確定はできない。

許可された公開 helper 1 file だけを metadata → hash → 全文の順で確認した。参照先の common / DB / material / result 等は読んでいない。

- path: `/Users/hikaru/.local/share/hollow/verification/p5c1-s5b2-20260930-yEJfKd/harness.cjs`
- regular / no-symlink、23,757 B。
- SHA-256: `d78a1aaaed3b6c9ad802f033a944afc376902b5178d3931b1139572f0b2e218e`。

固定 Playwright 1.63.0 の公開 source は、隔離 tooling の `playwright-core/lib/coreBundle.js` と `utilsBundle.js` を必要箇所だけ静的に読んだ。

| 根拠 | 意味 |
| --- | --- |
| coreBundle.js 8824–8845 | HTTP URL に対しても createProxyAgent が HttpsProxyAgent を返す |
| coreBundle.js 26402–26418 | APIRequestContext fetch はその agent を使用する |
| utilsBundle.js 48022–48068 | HttpsProxyAgent は接続先が HTTP でも先に CONNECT を送る。secureEndpoint は CONNECT 成立後の TLS 分岐 |
| harness.cjs 16–25 | 通常 browser HTTP は absolute URL を proxy が検査し、固定 `node:http.request` で exact 自己 origin へ転送する |
| harness.cjs 27 | CONNECT は自己宛を含めてすべて 403 |
| harness.cjs 66–68 | fault 対象だけ route.fetch へ分岐し、通常要求は route.continue |

以上は旧失敗と整合する静的因果経路であり、非保存の旧例外を復元したものではない。通常 forward の `state.forward++` も native request 作成前に増えるため、accepted / complete / closed とは別カウンタにする必要がある。

## 最小変更案

### 1. route は対象を束縛するだけ

既存の `FAULT_CONTEXT / FAULT_BOUND / FAULT_SINGLE` を維持し、次の条件を追加・明確化する。

- exact origin / path / POST、現在の専用 Picker document、対象 page と main frame が一致する。別 page / popup / ServiceWorker からは bind しない。
- 通常の settings/current GET で確認した expected actor と、今回の独立 account / auth scope / document generation が一致している。観測元はその通常応答と現在の app 操作であり、storageState や既存 cookie 保存ファイルは使わない。
- normal folder ID、今回発行済み Picker receipt ID、今回 command ID を既存どおり照合する。正確な body byte 列は最大 16 KiB、Cookie / Origin / Referer / Content-Type は memory 内だけで束縛する。Cookie はその同一 request の `allHeaders()` 等の正規 API で取得し、ログ・hash・ファイルへ出さない。
- `commandId` の正規表現だけで本人一致を代用しない。現在 actor の観測を失った場合は bind 前に中断する。

bind 成立後は fault slot を `bound` へ一度だけ進め、`route.continue()` を 1 回呼ぶ。`route.fetch()` / `APIRequestContext` / response.dispose / route.abort はこの分岐から外す。URL・method・body・Cookie の上書きはしない。

route と proxy は同じ harness process にあるので、内部 marker header は不要。closure に一つだけ置いた bound snapshot を proxy が消費すればよい。資格や command を追加 header として製品へ送る必要もない。

### 2. 既 proxy の対象分岐だけで forward と drop を行う

既存の ordinary streaming forward は維持し、bound の exact selection POST だけを別分岐にする。

1. absolute request URL が fixed origin と一致し、userinfo / fragment がなく、method/path/query が snapshot と一致することを確認する。
2. incoming body を 16 KiB 以内で最後まで受け、byte 列と必要 headers を snapshot と memory 比較する。actor / document generation も forward 直前に再照合する。不一致なら backend へ送らず有限失敗とする。
3. slot を `forwarding` に不可逆に進めてから、`http.request` を一度だけ作る。protocol / hostname / port は自己 listener の固定値、path は確認済み pathname+search、agent=false、Connection: close。Cookie / Origin / Referer は保持し、Proxy-Authorization / Proxy-Connection 等の proxy 専用 header は転送しない。body は再シリアライズせず同一 bytes を送る。
4. 対象 response は browser 側へ writeHead / write / pipe を一切しない。最大 64 KiB / header 16 KiB の範囲で受信する。`response.complete` と end を確認する。
5. HTTP 200 に加え、実 selection endpoint の正常 envelope と受け付けた receipt / command の対応を、main が現製品契約から決めた有限 predicate で確認する。200 だけで business acceptance としない。response 全体を保存せず、predicate 結果と有限 receipt phase だけを残す。
6. upstream ClientRequest close、IncomingMessage end+close+complete、取得済み native socket close を独立して待つ。登録直後の既終了 state も照合し、イベント順序で証拠を失わない。
7. `accepted && upstreamComplete && upstreamClosed` のときだけ、browser 側 ServerResponse を 1 回 destroy して ACK を落とす。downstream response/socket の実 close も別に待つ。

server acceptance は「操作が受け付けられた」証拠であり、folder 保存完了そのものとは別。ACK 欠落後の通常純 GET で receipt と現在状態を確認して、初めてその結果を評価する。GET のために selection POST を再送しない。

最小の状態列は `idle → bound → forwarding → accepted-and-closed → dropped → observed`。timeout / mismatch / incomplete / native 未終了は `failed` とし、arm を戻さない。scope が途中で失効した場合も自動再試行しない。

### 3. redirect・重複・失敗時の扱い

- `node:http.request` は redirect を自動追従しない。対象 response が 3xx の場合は acceptance 不成立として終端し、Location を fetch しない。browser へ Location も渡さない。
- CONNECT は引き続き全面拒否。通常通信の route allowlist と自己 proxy の origin allowlist は緩めない。Playwright の HTTP redirect が route handler を迂回する既知境界も、外部 proxy forward 許可にはしない。
- bound command の二つ目の POST は backend へ送らない。browser / frontend が自動再送を起こしたなら有限 duplicate counter を立て、検証を失敗にする。backend 一回という保証と browser 自動再送ゼロは別の判定として両方記録する。
- status 非200、正常 envelope 不一致、body 上限超過、read error、接続終了の欠落は ACK fault 成功ではない。自身が作った request/socket を通常の abort/destroy で終了させ、終端を確認して停止する。未知 PID / 他 listener / 他 socket へ操作しない。
- drop 前に対象 response header を一つでも browser へ送ってしまった場合は、今回意図した ACK 全欠落とは別の試験なので不合格とする。

## 実 app/browser より前に行う最小 toy 対

まだ未採用・未実行。標準 Node だけで、tiny backend と proxy の自己 loopback server を逐次用意する。Playwright / Chrome / app / DB / account / 鍵は不要。proxy の本番用 fault 分岐を小さな副作用なし module に抜き出すなら、その同じ関数を toy と既 harness から使う。巨大 runner や proxy 全面書換えを作らない。harness 全体を import して toy に流用してはならない。

一例として、2 組の server lifecycle を逐次実行し、最大同時 server 2、client 1、HTTP client requests 合計 4 / backend requests 合計 3 に収められる。

| ケース | 操作と根拠 |
| --- | --- |
| T1 通常 ACK | 未armの固定 POST を Node client→proxy→backend へ流す。backend 1 回、client 200+完全文書、両方向 native close を確認する |
| T2 ACK 欠落 | 同じ自己 pair で別 command を arm。backend が memory counter を1回進めて正常 receipt を返す。proxy の response complete/native close 後にのみ downstream を落とす。client は response headers 未受領で error/close、backend accepted=1、drop=1を確認する |
| T3 重複拒否 | T2 と同一 command/body の POST をもう1回だけ送る。proxy が有限拒否し、backend counter が増えないことを確認する。これは意図的な toy 入力であり、本体の自動POSTゼロ証明ではない |
| T4 redirect拒否 | 上記 pair を全停止後、独立した新 slot/pair で backend が302を返す。target acceptance=false、drop成功扱い=false、Location 先への要求0、CONNECT0、外部forward0を確認する |

toy の current actor/page/frame は固定の synthetic facts として渡すだけであり、本物の本人・page 束縛の証明にはならない。それは後続実 UI で確認する。byte/header 不一致や古い generation の拒否は、同じ module の純 predicate 対で HTTP を増やさず確認できる。

提案予算は新専用領域、公開 helper 合計 32 KiB 以下、有限結果 16 KiB 以下、wire 1 MiB 以下、request body 16 KiB / response body 64 KiB / headers各16 KiB、1ケース10秒・全体60秒。新 keys/material/DB/browser は0。既定は既存の正しく両 pipe EOF/close を待てる記録パターンを使い、新しい汎用 runner を設計しない。適用前に Manager が対象新rootと予算を採用する必要がある。

## 後続 UI の受け入れと出力

V1 修正済みの同 built と新 contract root を使う段で、まず通常 current GET の native forward と応答を確認する。その後、本人に見える normal selection を1回行い、上記 slot を実 request に束縛する。

少なくとも次を別々に出力する。値は bool/count/有限codeだけにし、URL query、Cookie、token、command/receipt の実値、body、raw error をログへ出さない。

- bound/current actor/page一致、対象selection POST数、proxy target match数。
- upstream request生成数、socket接続、response受領、end+complete、正常receipt predicate、request/response/socket close。
- response未送信、drop実行数、downstream close、browser request failure。
- duplicate拒否数、外部forward0、CONNECT許可0、raw bytes / bounded body bytes。
- unknown表示、以後の純GET結果、selection POSTの増分0。単なる networkidle を処理完了としない。

公開標準 API だけでこの観測は組み立てられる。ただし現時点では toy も実 UI も実行しておらず、旧失敗の原因確定もしていない。main は実 selection 応答 envelope の受理 predicate と actor観測元を現製品に照合してから実装する。

## 停止

編集はこの提案報告だけ。許可された公開 helper の参照先、旧 private/results/cache/材料/DB は読んでいない。新 helper、HTTP listener、process child、browser、DB、鍵は生成していない。全文 EOF 確認後、全 read/write/run を停止して Manager に所有返却する。

EOF
