## Lookup all/single の追加契約照合

HTTP-P2: logical hostnameを127.0.0.1へ返すだけの記述では、Node24.18 autoSelectFamilyのall:true枝に必要なcallback shapeが未固定。stock net.jsはfamily未指定/4・6以外、localAddressなし、autoSelectFamily時にall=trueへしてaddresses配列を消費する。最小はopaque dialのlookupを正式net.LookupFunctionで型付けし、exact openrouter.aiかつ有効current registryの時だけall:true→[{address:'127.0.0.1',family:4}]、通常→address string＋family4を返す有限契約。未知hostname/明示不適合family/current endpoint失効はerror、system lookup fallback0。autoSelectFamilyを無効化する追加options/複数IP/外部DNSを導入しない。[Node v24.18.0 net lookupAndConnect/lookupAndConnectMultiple](https://raw.githubusercontent.com/nodejs/node/v24.18.0/lib/net.js) L1337–1414。

公開installed @types/node net.d.ts:6–10はcallback addressをstring | dns.LookupAddress[]、http.d.ts:181はlookupをnet.LookupFunctionとしている。unionがあるためsingle-only実装も型だけではall:true対応を証明しない。source/helper提出時に両branch/stockTLS hostname・chain検証の保持を静的照合し、実成功は実handshake後に区分する。この補正も四path内で閉じ、共有application/domainへのNodeoptions漏出0。Node/DNS/HTTPS/lookup runtime評価0。

# P5d resources0根拠照合とnative HTTP計画レビュー

2026-10-06T02:03:30.415507+00:00。CR01–05局所PASSの借用根拠は既固定source/test/終了監査契約と整合。native HTTP案は四adapter pathの限定方向を条件付き採用可能、Host保持の最小契約補正 HTTP-P1 が必要。実装/鍵工具/case/helper固定前の計画で、起動preflight・実HTTP/全P5d受入ではない。自己新旧actualroot/TMP/key/DB/resultsのstat/read/hash/copy/import・runtime/probe/外部/audio/D01操作0。

直接: CR public phase111185B/SHA `6931b01c182c7c8add10e79ab0885df1780732a062ca9cc9489e23067bec72e9`、HTTP案8656B/`d7fb1b46f64a9d91ee3402ec8cb70b4d2ba69b11d17f9dcfff305c74d191eb62`を600regular/nonlink/nlink1/canonical/自己UID/全文hash確認。runnerffd4ead1/loaderc927全文hash不変。Cc cb3ec831/86manifest4f630/source全checks不変更は前独立staticと主報告を継承し全source再演0。

CR実結果は主借用: 5case全pass、file/afterAll/execution.stop/同期client.close、fork1 actualexit/EOF-close、Nodeexit0/登録ownPGとleader別absent/両EOF-FDclose/normalPipeCloseReceipt四true/force0/heldfalse。same正常DB1 readOnly/query_only監査のFK/integrity/current anchor/実auditclose成功はrunnerの既限定SQL期待を満たすsafe receiptと整合。CR01正常missing-codeのfailed/OPENROUTER_CANCELLED・use0、その一row保留/秘密NULL、CR02 wholecaller保留中proof0、CR03 closure commitloss・CR04 ACK commitlossの同opaque proof saved read/consume、CR05 native beginUse後current fence拒否とACK済四source/use回収はテストassertに対応する。自己直接実根拠ではない。resources0で実request/response/socket閉鎖はゼロ件。Google/全copies/native adopted origin/65前任/67容量/legacy/browser/unknown purge・P5d A–H全完了へ補完0。

HTTP-P1: Node24.18 ClientRequestはoptions portがdefault443と違い既Host未指定なら自動Hostへportを付ける。現http.tsはheadersにHostを持たず、dialのport/lookup/ca/servername投影だけではHost=openrouter.aiを保存できない。最小補正はopaque dialが正規registryで認証された枝だけ、既http.tsのheadersへexact `Host: openrouter.ai` を固定し、任意header入力・options上書きを許さないこと。未注入production枝は従来の自動Host/443を維持する。一次根拠: [Node v24.18.0 ClientRequest](https://raw.githubusercontent.com/nodejs/node/v24.18.0/lib/_http_client.js) L338–352。SNI/stock hostname-chain validationとは別契約であり、CA注入からlogical Host保持を推定しない。四path内で閉じられる補正で、domain/application port追加は不要。

方向のpass範囲: 元https.request identity→nativeCredentialTransportの同registry、元provider/owner/UoW/source/current actor bindingを維持し、adapter内opaque owned-server capabilityから有限per-request Node optionsだけへ投影する案は成立可能。JSON keyFile strict/四argument production呼出/default dialなしを維持し、env/HTTP入力/通常DIからlistener/CAを作らない。global DNS/CA/hosts/wrapper/lookup fallback/checkServerIdentity override/rejectUnauthorized falseを禁止し、official logical URL/path・SNI・stock TLS検証を保つ。新privatecapのclone/handmade castを認めず、closed/revoked endpointで新admission0をsource実装gateに残す。

初回の一callback familyは二request sequential→metadata後late採用UoW barrier→wholecaller終端→native proof→閉鎖保存/read→ACK/read→consume→本人退会/copy回収の部分根拠を最小に組める。ACK前hold/commitlossを含めるなら同attempt/use・元proof/元commit後の正規delegateで具体化し、現在stateに実在するcandidate/credential/providerUserId等コピーを確認する。verifierは既exchanging codecでNULLになるので、既合法縮小をACK前保持の偽fixtureへ置換しない。originは正常同attempt/currentepoch採用でのみ生成し、retirement後late採用拒否・closed未ACKコピー保持・依存順削除/final EXISTSを別assertへ固定する必要がある。family数/clock/afterAllは実source提出時のgateであり、今回追加caseを義務化しない。

実装・工具の未確定gate: 元HTTPS server生成後listen前からTCP accepted handle/handshake前error/secure TLS wrapperを早期所有し、公開actualcloseをhandle別に取得する。server.close return/Promise resolve/destroy要求を実socket closeへ代用しない。physical pair最大2/同時1とTLS wrapper別ledger・request2/body4KiB/response64KiB/合算256KiBをhelperの生成前admissionと200ms監督へ結ぶ。stock lookupのone/all overload、同certificate bytes/identity/current listen tuple、SAN/EKU/trust chainの実TLS条件とrejectUnauthorized trueを新実装staticで確認する。4formal product paths/newtest/helperのexact候補・証明保存/ACK barrier・正常EOF/FD/DBclose後sameDB auditはまだ未提出。

Certificate工具はpublic openssl metadata候補だけで、exact argv/版/生成child/chain/key数・64KiB/30秒/0700-0600-exclusive/actualexit-PG-EOF-FDの採用は未確定。NodecryptoでX509生成成功と補完しない。署名CA key追加なら現key/cert数/容量へ勝手に足さず再採用が必要。こうしたgateを固定してからnative-localTLS実行を判断し、CR resources0/fixture frameでHTTP actualcloseを代行しない。

報告固定後公開HTTP/CR対象read/write停止。次source/helper採用前に製品/tooling編集・新runは行わない。
