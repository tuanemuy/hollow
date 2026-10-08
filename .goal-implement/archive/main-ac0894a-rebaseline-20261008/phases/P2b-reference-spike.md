# P2b-C 外部取得 / CSS AST 成立試験

## 結論と範囲

2026-09-06 04:13〜04:19 JST、Implementer `/root/implementer`。Node22.22.3 の実 HTTP/TLS socket で、元 hostname を維持した検証IP固定、redirect毎の再検査、deadline時のsocket切断が成立した。css-treeでURL/escaped import/Rawを区別し、局所absoluteを残して既知の全面配置を除去できた。ただし単一rule判定を別selectorのcascadeで迂回できることも実証した。CSS安全policyの完成、production取得pipelineの完成、P2bの受入ではない。

入力は `design.md` のP2b境界、`plan.md` のP2b分割、`reviews/P2b-design.md` 全文。本体・依存・DB・storage・production・browserには変更/操作していない。書き込みはこの報告と一時dir `/tmp/hollow-reference-spike.mQRlfO` のみ。

## 再実行と固定対象

一時dirを `mktemp -d /tmp/hollow-reference-spike.XXXXXX` で作成し、package/scriptsはapply_patchで用意した。

```bash
cd /tmp/hollow-reference-spike.mQRlfO
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

- 固定依存: css-tree3.2.1、ipaddr.js2.5.0。前者engineは `^10 || ^12.20.0 || ^14.13.0 || >=15.0.0`、後者は `>=10`。本体のNode22.13下限と宣言上互換だが、22.13ちょうどでは未実行。
- TLS fixtureはOpenSSLで生成した1日有効の自己署名証明書。`media.test` / `cdn.test` SANを持ち、test clientだけに `ca` として渡す。`rejectUnauthorized:false` は使わない。期限後の再実行には `openssl req -x509 -newkey rsa:2048 -nodes -keyout fixture-key.pem -out fixture-cert.pem -days 1 -subj /CN=media.test -addext subjectAltName=DNS:media.test,DNS:cdn.test` で再生成が必要で、証明書hashは変わる。秘密鍵は一時test専用0600で、本番credentialではない。
- すべて手製の小さなsynthetic CSS/HTTP fixture。第三者データや実アカウントを使っていない。依存のlicenseはインストールしたpackage内に保持する。

| 一時成果 | SHA256 |
| --- | --- |
| package.json | `f9eaeb43ffcd34a6000b7a3931bc2fd831dbda8efc30bbd788e6956f023c7af6` |
| package-lock.json | `396c5b31f6b8bf660a0908e94334d221ccb8617c598911a175b3b39ccd87312c` |
| fetch.mjs | `01b97a2091370fac5f8cc1fd6ca302ff9dfdfabc68748dd1eac1d0e73c0c2db8` |
| css.mjs | `2041055bb55c1a8d0dca6b0db5d38b907b76105a42a651d139a76738a7fdca96` |
| spike.test.mjs | `ecd5f90fa7fa6693ef16e0d36c149db56885f40a13e24221e7b30d71166aeb54` |
| fixture-cert.pem | `5b44f77c3bbcb206a1984197832bf337b262d876443cf13d8165d7ecc7c3a0a9` |

## HTTP/TLS の実結果

`fetch.mjs` のtransportはURLをIPへ置き換えず、Node requestの `lookup` に検証済みのaddress/familyだけを返す。one-shot `agent:false` を使用し、別取得のDNS判断を共有socketで迂回しない。次の7testsが成功した。

1. URLの短縮IPv4/整数/hex/octalをWHATWG URLで正規化し、ipaddrの分類でprivate/reservedを拒否。`127.1`、`2130706433`、`0x7f000001`、`0177.0.0.1`、IPv6 loopback/mapped/ULA/link-local、metadata IP、CGNAT、unspecified、documentation IPv4を拒否。公開IPv4/IPv6は許可し、公開+privateの混合DNS回答は全体拒否。
2. 仮想hostname `media.test` を実loopback listenerへpinし、response.socket.remoteAddressが `127.0.0.1`、受信Hostが元の `media.test:port`、lookup引数が `media.test`、承認resolver呼出が1回であることをassertした。
3. HTTPSでもSNIは `media.test`。fixture CAによる通常のhostname検証が成功し、同じ検証IPでも `wrong.test` の証明書hostname不一致は失敗した。
4. relative redirectを毎回再承認し、private literalへのredirectは接続前に拒否した。listenerの `/secret` へのhitは0。redirect loopは上限で失敗。
5. 応答bodyが停止したsocketは40msの全体deadlineでabortされ、server側closeを確認した。
6. DNS承認の停止も同じdeadlineへ含め、15ms経過後に遅れて承認が返っても接続しない。resolver処理自体のOS cancelは保証しない。
7. Content-Lengthに依存せずchunked実bytesで上限を拒否した。初回は `destroy()` 後のend競合によりsuccessが先にsettleする失敗を検出した。超過判定時に明示rejectしてからdestroyする修正後に成功した。

private listener許可は `spike.test.mjs` の `testOnlyApprove` だけに閉じる。公開用の `publicTicket` はloopbackを許可しない。本番の `allowPrivate` flagや環境変数例外は作っていない。tests終了時に専用listenerをcloseし、localhost:3000は触っていない。

本体採用案は、専用adapterが scheme/credential/hostname/port を検査し、全DNS回答を公開判定して一つへpinする。HTTP Host/TLS SNI/証明書検証は元hostnameに残す。redirectも同じ全体deadline/件数・bytes budgetで再検査し、streaming原本保存の成否と恒久noticeへ接続する。必要ならsocket remoteAddressとの一致を追加assertする。全resolverの本番実装・proxy環境・HTTP圧縮/圧縮展開量・接続pool再利用・TLS公的CAの外部実取得・IPv6実socketはこのspikeでは未検証。今回のencoding拒否/redirect4回/1KiB/1秒はfixtureの仮値で、製品制限として採用していない。

API根拠は [Node22.22.3 HTTP一次資料](https://raw.githubusercontent.com/nodejs/node/v22.22.3/doc/api/http.md) のlookup/agent/abort/streamと、[TLS一次資料](https://nodejs.org/docs/latest-v22.x/api/tls.html#tlsconnectoptions-callback) のservername/hostname検証。IP分類は [ipaddr.js公式](https://github.com/whitequark/ipaddr.js) のparse/process/rangeを確認した。公開IP判定の全特殊rangeや将来更新の完全性を、この小さなfixture集合の合格から断定しない。

## CSS AST の実結果と最小候補

8testsが成功した（うち1件は既知の迂回が残ることをassertする限界fixture）。[css-tree3.2.1 parsing](https://raw.githubusercontent.com/csstree/csstree/v3.2.1/docs/parsing.md) の `parseCustomProperty` / Raw と、[utils](https://raw.githubusercontent.com/csstree/csstree/v3.2.1/docs/utils.md) のident decodeを使用した。

- `.caption{position:absolute;left:12px;top:8px;width:120px;height:24px;transform:translateX(2px)}`、relative親、grid/flexをそのまま保持。
- `@\69mport` と `@media` 内のimportを識別して除去し、元の文字列とreasonをnoticeへ残す。背景/字体URLを新しいサーバー取得対象へ増やしていない。
- `url(../font.woff2)`、nested `image-set("../a.png" 1x,url(b.png) 2x)` をstylesheet URLから絶対解決した。image-setのStringも候補であり、Url nodeだけの巡回では足りない。
- URL payloadのescapeはdecodeされる一方、関数名が `u\72l(...)` だとcss-treeがRawとして保持する実例があった。未知Rawをそのまま戻さず宣言単位で落としnoticeにする。文字列regexでURLを拾って成功扱いしない。
- literal `fixed;inset:0` と `absolute;width:100vw;height:100vh` の既知全面配置は位置・端・z-index/transformを落とし、background等の内容装飾を残す。
- 動的配置 `var/calc/env`、custom property、animation/keyframesは本spikeでは保守的に落とし、各reasonを残す。ただしcustom property全削除は色変数も失うため、そのままの本体採用を推奨しない。位置に関係する参照だけを制限できるか、未解析の変数値を宣言単位で落とすかを本体詳細設計で判断する。

単一rule判定の反例は `.x{position:absolute}.fill{inset:0;width:100vw;height:100vh}`。同一要素が両classを持つと全面配置になるが、spikeは両ruleを残す。これを隠さず `known limitation` testで固定した。selector条件・継承・shorthand・logical property・pseudo element・transform/scale・重要度・custom property・animationを含む全cascade/視覚意味解析は追加要件にしない。

本体への最小候補は次の二段階である。外側アプリの保護は既存sandbox containmentを正本とし、このCSS処理をsandbox代替と説明しない。

1. AST上のimport除去、URL正規化、Raw/未知URL構文の制限、既知privateDNS宛ての描画無効化を独立した確実な境界にする。元URL/位置/理由は恒久台帳へ保持する。CSS失敗を空successに変えない。
2. 全面配置制限は既知pattern群と保守的な曖昧配置制限に限定する。局所absoluteのliteralな小寸法/端指定・非全面transform、grid/flexは保持する。位置関連var/calc/envやanimationで静的に判断できない配置は位置の宣言群を落とし、失った配置とnoticeを示す。複数ruleで同じ対象の位置/寸法を合成する既知迂回は、位置に関係する候補宣言の集合として比較する小さな追加gateを置く。selector完全評価やheadless全CSS解析へ拡張しない。

失う可能性がある装飾は動的に移動/伸縮するcaption、CSS変数で位置を制御する図、animationで配置を変える内容、parserがRawにする未知の合法構文。通常のabsolute全禁止ではない。集合判定の範囲と未判定の組み合わせはManager判断が必要で、現在の `css.mjs` を完成policyとしてcopyしてはならない。強い意味で「どんな本文viewport遮蔽も絶対に残らない」という保証は本spikeで得ていない。

## 終了状態

04:17:43 JSTの最終 `npm test` は15tests成功 / 0failed / 0skipped（571ms）。初回14/15のbytes競合は一時script内で修正済み。対象scriptを本体へcopyしていない。本体のtypecheck/build/testやbrowser gateは今回実施していない。

開始時のP2a固定対象は461files、fingerprint `8b20b45bdee8aeae4a0f2641df4018f99c6c8433c3be2bd817796e889209b10c`。04:17:43 JSTの再算出も一致した。tracked+untrackedのpath+NUL+bytes+NUL、`.goal-implement/` 除外。HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。production6016/PID30665とVerifierのbrowser所有には干渉していない。

この報告でspikeを止め、次のManager判断を待つ。P2b-Bのcookie/inline表示gate、asset認可/台帳/UoW/worker接続、CSS companion/UIは未実装・未検証。
