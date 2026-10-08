# normal PUBLIC runtime closure step11 — ws wrapper formal edges

2026-10-06。PUBLIC static source-only / runtime0。Root訂正後の exact step10 `.goal-implement/phases/P5c-ui-job-normal-fixture-runtime-closure-step10.md`3371B/SHA2565b0b4f133b45b535b9042581be40c88bafdd9a4cc869af323cb772171df38ace を fullstable600/nonlink/nlink1/UID501/canonical/NOFOLLOW で確認した。先行委譲名の fixture 抜けを推測探索せず、Rootの正式名訂正後に読んだ。既 package1753B/SHA c642fa2a61006bd082f620bbaab30df014340f96c429bbe97c718df5bad3c968 と Node ESM import→wrapper.mjs は step10 の直接 static 根拠を借用し、package/aliasを再読していない。

## 許可された一つの SOURCE

| Exact PUBLIC path | Bytes | SHA256 | Mode / UID / nlink |
|---|---:|---|---|
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/wrapper.mjs` | 554 | fe154662301fd558f935f9c217fccbe7a7dac02ff39e648a000589403ff27c7f | 0644 / 501 / 1 |

65536B cap内、canonical samepath、regular/nonlink。lstat before・open FD fstat・read後fstat・close後path lstatは全フィールド一致：dev16777233 / inode103430680 / actual mode0644 / UID501 / nlink1 / size554 / mtimeNs1779202363619827121 / ctimeNs1788622717112130461。O_NOFOLLOW FD本文554Bを全量readしてSHAを計算し、FDを実closeした。pathnameの途中parent/walk/unknownentry/readlink/probeは行っていない。新提案targetはmetadata/body未読取、存在・canonical・nlink・mode・hashを推定していない。

## 正式 static import/export

wrapperは以下八つの exact relative default import を持つ。全八 bindingを named exportし、WebSocketを default exportする。dynamic import、require、additional export-from、自前native entryはこのwrapper本文にない。これらはJS module評価の依存edgeであり、利用するnamedexportだけを読み最終closure扱いにはしない。module評価、constructor呼出、通信/Watch/Worker/nativeaddon初期化の有無は未観測。

| Binding | Formal literal | Next exact target (unread) | Proposed body cap |
|---|---|---|---:|
| createWebSocketStream | `./lib/stream.js` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/stream.js` | 65536 B |
| extension | `./lib/extension.js` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/extension.js` | 65536 B |
| PerMessageDeflate | `./lib/permessage-deflate.js` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/permessage-deflate.js` | 65536 B |
| Receiver | `./lib/receiver.js` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/receiver.js` | 65536 B |
| Sender | `./lib/sender.js` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/sender.js` | 65536 B |
| subprotocol | `./lib/subprotocol.js` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/subprotocol.js` | 65536 B |
| WebSocket | `./lib/websocket.js` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/websocket.js` | 65536 B |
| WebSocketServer | `./lib/websocket-server.js` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/lib/websocket-server.js` | 65536 B |

次提案は既wrapper literalからだけ導出した PUBLIC JS8 exact files、各65536B / unique総524288B。次Root採用時に各exact targetのcanonical/regular/nonlink/UID501/nlink1/actual mode/fullstable NOFOLLOW metadata+SHAを確認し、本文の formal static import/export/require edgeだけを次scopeへ導出する案。今回のmode644はwrapper実modeであり、未読取八つへ事実として一般化しない。未知 fallback/extensionless candidate/package-store walk/glob/ancestor probe/全ws source探索0。次のbody/readはRoot採用前禁止。

step10が確認した optional peer bufferutil/utf-8-validate 宣言はmetadata借用のみ。wrapper本文には直接native importがなく、先の八本文や optional pathを読んでいないので、optional選択・不在・初期化無し/nativeclosureは未確定。宣言だけからaddon探索/read/importを開始しない。

## 閉包状態・未採用条件

このroundの直接 SOURCE1 /554B と参照文書1/3371B（計3925B）だけ。ws ESM entryの八依存edgeは判明したが、そのJS本文/二次依存/native optional経路は未閉包。旧 whole JS32 capは既69候補超過、whole2MiB/material予算は未成立という前段制限を維持し、八targetを既成closure count/hashへ補完しない。八つの最大524288Bは次roundの提案値で、whole/source/helper/import許可ではない。全runtimeclosure成立、constructor/nativeresource/network無しの証明、normal fixture実装ready/PASSとはしない。

Node import/eval/default/preflight/build/DB/browser/network/WebSocket/DNS/HTTP/native/child/rootprobe/create0。旧generated SOURCE/build/results/TMP/全private成功失敗root/log/key/proof/cacheは permanent NOOPS stat/read/hash/copy/import/replay/cleanup0。C0-F2 candidate/source/helperは読取変更0のSTOP維持、main/S5/P5d/Manager編集0、新fixture3helper作成0、spec/spec-implement/agents0。今回一つのwx600 reportだけfsync/actualFDclose/postread fullSHA固定、ALL reader/writer STOP。
