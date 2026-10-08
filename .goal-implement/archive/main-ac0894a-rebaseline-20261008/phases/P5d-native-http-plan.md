# P5d native HTTP: 最小OR契約候補

提案のみ。CR候補Cccb3ec831/source86、helpers、P5d-implementationは変更しない。新製品/test/key/cert/root/DB/socket/Node実行0、oldprivate全非操作。CR actual一巡を優先するため本案は短固定しread/write停止する。native HTTP実装/実行scopeはRootの別採用が必要。

## 先にORを選ぶ理由と現在の不足

ORは正規beginOpenRouter→非空codeのGET `/auth/openrouter/callback`（単一correlation43字、browser/session、code UTF8≤4096、error無し）→exchange POST1→inspect GET1→同wholecaller内のcurrent account/authVersion/browser/attempt/OR epoch・LLM admission再照合→採用UoWの二requestで正例が成立する。欠落/空codeは正規cancelなので使わない。Googleはtoken＋certsの二requestに加えJWT署名・issuer/audience/nonce/claimsとactor-null/result-account/deferred proofのfixtureを要する。まずORのP5d-E/F HTTP閉鎖/採用/コピー依存を測り、Googleを代替合格にしない。

現 `NodeOpenRouterHttp` は公式URL/port443/agent:falseで、`nativeCredentialTransport(factory)` は元node:https.requestの実関数同一性をprivate WeakMapへ束縛する。既requestFactoryをloopback wrapperへ替えるとnative capは失われる。現constructor/configにはper-request lookup/port/CA seamがなく、外部DNS0のgenuine HTTP正例は現在不可能。既実finallyはrequest/response/socket actualcloseをawaitしてreleaseし、wholecallbackはlate採用UoWまでawait→private proof→exact保存/read/ACK→consumeする。この終端条件を変えない。

## 明示adapter portとexact変更候補

追加formal製品scope候補は次の4pathだけ。application/domain portsへNode RequestOptionsを持ち込まず、adapter側の注入portに限定する。

| exact path | 最小差分 |
| --- | --- |
| `packages/core/src/adapters/node/auth/credentialLocalTlsDial.ts` 新 | 元node:https.createServerで生成/所有するlistenerとsame certificate/loopback addressをprivate WeakMapへ束縛したopaque LocalTlsDial capability。所有server/受理socket/実closeの有限ledgerを返し、普通のobject/clone/文字列だけではdialを発行しない |
| `packages/core/src/adapters/node/openrouter/http.ts` | 元https.request factoryのまま、opaque dialの元registry検証後だけstock RequestOptionsの有限fieldへ注入。通常は現公式URL/443/agent:falseそのまま。fake factory＋dialは拒否 |
| `packages/core/src/adapters/node/openrouter/provider.ts` | optional adapter dialをHTTPへそのまま渡す。authorization/provider object、follow/register/private native transport、response解析を変えない |
| `packages/core/src/adapters/node/openrouter/config.ts` | readNodeOpenRouterの明示optional adapter argument（defaultなし）だけ。通常JSON schemaはkeyFileのみstrictを維持し、env/JSON/URL入力からoverrideを作れない。正規acquire/元provider/execution同一性維持 |

既 production `apps/web/app/server.node.ts` は4argumentの既呼出のままで差分不要、DI `serverHollow.ts`/HollowContainer/OpenRouterServices共有型も不要の候補。testは元factoryに第5引数のgenuine local capabilityを明示する。このexportは外部資格production設定とは分離し、通常起動からlistener/cap/CAを生成しない。実必要が判明した追加pathは編集前に再提案する。Google adapterへの横展開は初回scope外。

型案はopaque `LocalTlsDial`＋`LocalTlsEndpoint`（close・有限ledger観測）と、adapter内部だけの `Pick<node:https.RequestOptions, 'port'|'lookup'|'ca'|'servername'>` 投影。token/capをpublic booleanで承認せず、registry上の同object・同server・同listen tuple・同元certificate identityだけを検査する。型のcast/readonly破り/手製privatebrandは用いない。

## TLS/hostname/loopbackの境界

logical URL/hostnameは常に `https://openrouter.ai/api/v1/auth/keys` または `/api/v1/key`。Host/SNIはopenrouter.ai、stock checkServerIdentityを維持しrejectUnauthorized=true。lookupはこのexact logical hostnameだけを登録127.0.0.1へ返し、unknown hostname/errorでfailclosed、system DNSへfallbackしない。stock request optionsのportだけを登録ephemeral listener portへ指定し、agent:falseは維持する。caは同新fixtureの≤64KiB synthetic trust materialにper-request限定。global DNS/hosts/CA/https wrapper、checkServerIdentity override、rejectUnauthorized:falseを使わない。

cap factoryは元HTTPS serverを自ら生成・127.0.0.1だけへlistenし、actual addressのfamily/address/port/同serverを確認してから発行する。既socket・未知server・external address/listenerを採用しない。certはNode X509Certificateでparse/checkHost等の公開検査をするが、X509生成可能とは仮定しない。clientの実handshakeも同SAN/chainをstock TLSで検証し、CA注入だけでhostnameの証明にしない。新selfsigned test chainは実OpenRouterのidentity/authentication成功ではなく、明示native transport契約検証として扱う。provider URL/actor/source identity・DB originの採用条件を変えず、普通のmock provider/fake ownerではcap/proofを発行しない。

owned listenerはaccepted TCP handleとTLS wrapperを区別して登録し、handshake前abortも逃さない。physical socketはclient/server pair最大2・同時1接続、TLS wrapperは同接続の公開handleとして別閉鎖観測を記録する。private _handle/FD値から同一性を推測しない。server.close returnはsocketcloseの代用にしない。closeはadmission停止→known request/socketだけdestroy→全actual close events→server actualcloseをawaitし、未観測ならheld。

## 初回positive slice・資源・不足

新finite familyで唯一のfresh canonical DB1を使う（既CR成功/失敗rootを再利用せず、source側で追加DBを開かない）。新root1/DBsidecars32MiB/root192MiB・account1/browser1/attempt1/use1/WS0/note0/object0、TLSlistener1/request2 sequential/同時1接続・physicalsocketpair2、各request body≤4KiB/response≤64KiB/aggregate≤256KiB、synthetic key/cert material合算64KiB、log2MiB/toolTMP8MiB/material256KiBを上限候補とする。Node24.18/tool fork1以外Worker/child0を第一候補、certificate tool childの必要性は別採用へ。

初回は二requestのactual req/response/socket closeとserver accepted handle closeを個別観測し、metadata終了後のlate採用UoWを正規delegateで一度待つ。その間private closure=null/caller未終了→同current採用UoW終了→genuine private proof→saved closed/read→ACK/read→consumeの順を要求する。閉鎖/ACK Tx commit-response lossは元proofを保持して同値readへ戻し、期限/abort/Promise resolveからclosedを合成しない。native-v1 originは実sameattempt completed/currentepoch採用とresultAccountIdに一度だけ結び、退会fence後の追加reveal/adopt0、資格/candidate/verifier/providerUserId全コピーの依存順縮小を通常25page/final EXISTSで確認する。

二requestでbodyを受け終えた後もcaller barrierが残る負対、ACK保存前の退会hold、commit lossは初回family内のcase候補だが、具体ケース数/clock/afterAll/正常readOnly監査はfixture sourceとRoot資源採用時に固定する。case/hook40・suite/body180・outer240/sharedTERM10KILL10PIPE10/200ms、knownserver/socket/Node/fork/ownPG/EOFとactualFDcloseを別記録し、全normal後だけsameDB1 readonlyaudit/extraDB0、失敗/強制/未知は全held/audit0/no retry。HTTPactualcloseをfixture.frameやCR resources0から借用しない。

Google actor-null/late proof、acquire-confirmed前任closed未ACK/65上限、ordinary 67 private registry/Drive別ready67 prune、legacy whole cutover、8MiBcopycap、unknown personal purge、browserは別sliceで未検証。初回正常synthetic HTTPをこれらや全P5d-E/F受入へ代用しない。

## Certificate工具の未確定点

候補は既知public `/usr/bin/openssl` のmetadataだけを確認した（CLI/version/鍵生成は未実行）。具体生成argv/module closure、selfsigned SAN/EKU/chain設計、同UID new0700/600 exclusive material、既key禁止、stdoutstderr EOF/actualchildexit/knownPG/30秒deadline・生成物≤64KiBを別preflightへ出す。CA signing keyが追加必要ならcount/pathを先に再提案する。NodecryptoでX509生成できると仮定しない。新cert/key/実listener生成0、提案全writer/read停止。
