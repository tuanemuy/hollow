# P2b 外部取得・CSS spike 独立レビュー

## 結論

方式選定の根拠と限界の説明は概ね妥当。固定15 testsは独立に全成功したが、実行環境復帰後のNode24.19.0による結果であり、Node22の独立実行保証・P2b本体合格とは扱わない。CSSは既知split-selector迂回に加え、動的position値・端指定・宣言優先度を小さな集合gateへ含める必要がある。

- Verifier `/root/verifier`。2026-09-06 04:28〜04:34:35 JST（Asia/Tokyo）。補助なし。
- 対象は `/tmp/hollow-reference-spike.mQRlfO` と [実装者報告](../phases/P2b-reference-spike.md)、[design](../design.md) のP2b境界。元spike・本体コード・依存・設定・管理直下文書を変更していない。production3000、DB、storage、browserには接続・操作していない。
- markdown-styleは報告の見出し・空行・根拠の区分にのみ使用。spec / spec-implement不使用、goal変更なし。

## 固定対象と依存

macOS標準 `/usr/bin/openssl dgst -sha256` で次の6件が報告値と完全一致した。再実行後04:34:35の再計算も一致。

| ファイル | SHA-256 |
| --- | --- |
| package.json | f9eaeb43ffcd34a6000b7a3931bc2fd831dbda8efc30bbd788e6956f023c7af6 |
| package-lock.json | 396c5b31f6b8bf660a0908e94334d221ccb8617c598911a175b3b39ccd87312c |
| fetch.mjs | 01b97a2091370fac5f8cc1fd6ca302ff9dfdfabc68748dd1eac1d0e73c0c2db8 |
| css.mjs | 2041055bb55c1a8d0dca6b0db5d38b907b76105a42a651d139a76738a7fdca96 |
| spike.test.mjs | ecd5f90fa7fa6693ef16e0d36c149db56885f40a13e24221e7b30d71166aeb54 |
| fixture-cert.pem | 5b44f77c3bbcb206a1984197832bf337b262d876443cf13d8165d7ecc7c3a0a9 |

package/lock/インストール済みpackage metadataのcss-tree3.2.1 / ipaddr.js2.5.0が一致。lockの推移依存はmdn-data2.27.1 / source-map-js1.2.1で、integrity値を保持する。直接依存はMIT。宣言engineはそれぞれ `^10 || ^12.20.0 || ^14.13.0 || >=15.0.0` / `>=10`。Node22.13下限と宣言上整合する。今回はregistry tarball全体やinstalled全ファイルの再取得照合はしていない。

証明書の公開metadataを標準opensslで確認。CNはmedia.test、有効期間は2026-09-05 19:15:58〜09-06 19:15:58 GMT（JSTでは09-06 04:15:58〜09-07 04:15:58）。現在時刻で有効。報告の1日fixture契約と一致。秘密鍵の内容は出力していない。期限後は原spikeを上書きせず、別tempコピーでfixtureを再生成しhash差を明示する必要がある。

## 実行した範囲と未実行

`node --version` と続く `node --test spike.test.mjs` をNode22.22.3の既知絶対pathで試みたが、version出力前で停滞した。別の既存Node binaryによる単発試行も同様。Node22.22.3で15件成功という根拠はImplementerの04:17:43報告であり、今回の独立成功ではない。

PATH経由date/sedを含む読取コマンドも停滞し、`/bin/cat`、`/usr/bin/tail`、標準opensslは即時完了した。アプリやspike自身の失敗とは判定しない。自分の未完exec sessions31477 / 95931 / 15109 / 81527をすべてCtrl-Cで回収しexit130を確認。test runnerの出力は一度も出ず、自分のHTTP/TLS listenerは開始していない。環境診断はManager/Implementerへ返し、他processの終了や設定変更はしていない。

その後Managerから復帰したNode24で一度の再実行を許可された。`/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --version` はv24.19.0、同binaryの `--test spike.test.mjs` は15成功 / 0失敗 / 0skip、403.54ms、exit0。依存の再installや元fixtureの変更はない。実HTTP/TLS listenerはこの最終再実行で起動し、各testのfinallyでcloseしてrunnerが正常終了した。

報告・fetch/css/testの全コード・lock・design対応箇所は独立に読了。以下の固定assertはNode24での実socket再実行にも対応する。Node22.22.3の実行成功は引き続きImplementerの既存根拠であり、Node22.13ちょうどは未検証。

## HTTP/TLS根拠の評価

| 主張 | コード/既存assertから確認できる範囲 |
| --- | --- |
| socket pin / Host | URL自体をIPへ置換せずrequestのlookupにticketのaddress/familyを返す。agent:false / autoSelectFamily:false。実装者testは元Host・lookuphostname・remoteAddress・承認1回をassertしており、主張に対応する。 |
| SNI / 証明書拒否 | HTTPS testは元hostnameのSNIとfixture CA成功、wrong.testのhostname不一致拒否。rejectUnauthorized:falseはない。「証明書拒否」はこのhostname不一致の根拠であり、未信頼CA/失効/全TLS policyを個別試験済みではない。 |
| redirect / private接続前拒否 | 各hopでnormalize→approveを再実行。private literalへのredirectでtestOnlyApproveが拒否し、secret endpoint hit0をassert。全DNS回答の公開判定はpublicTicketの別unitでmixed回答拒否をassert。実resolver→publicTicket→socketを一続きに検証するproduction経路はまだない。 |
| deadline | 単一AbortController/timerが承認待ちと全hopを覆う。遅いapprove後のthrowIfAbortedで接続を防ぐ。停止bodyのserver-side closeと遅いDNS承認後hit0をassert。resolver処理自体のOS cancelではないとの限界説明は正しい。 |
| bytes | 最終200応答のdata chunk合計でmaxBytesを判定し、先にrejectしてrequest/responseをdestroyする。Content-Lengthだけに依存しない。redirect応答は直ちにdestroyし本文を取得していないため、全hopの受信wire bytesを累積制限した根拠ではない。 |

本体採用前の小さい追加gateは、production同形のresolver/承認adapterに公開・private混合回答とredirect先private回答を注入し、接続0を確認すること。URL literalではlookupが使われない経路も想定し、literal自身の公開判定とticketとの一致を明示する。ticketをcallerが任意生成するテストcapabilityをproductionから渡せる形にしない。

scheme/credentialはnormalizeで検査するが、hostname/portの製品policy、実DNS取得、MIME/バイナリstream保存・容量予約・恒久noticeの接続は未実装。bodyをUTF-8 stringへ変換する現在の戻り値を画像asset用にそのまま採用できない。encoding拒否、4hop、1KiB、1秒はspike仮値。圧縮を許可するなら展開後bytesの境界を別途必要とする。全IP分類・実IPv6 socket・proxy・全公開CA取得を今回の追加必須にしない。

## CSSの重要な不足とB2 gate案

15 testsのうちCSS8件、最後の1件はsplit-selector迂回が残るassert。したがって15成功でも「安全policyが完成した」とは解釈できない。この留保は報告とdesignに明記されている。

ASTのimport/keyframes除去、Url/image-set Stringのstylesheet基準解決、Raw宣言除去、正常な局所absolute/grid/flex保持には対応するassertがある。ただし未知RawはDeclaration値内だけを調べているため、未知のstylesheet/rule/at-rule構文全体のfail-closed証明ではない。URL台帳とknown-private描画無効化は本体接続が必要。

単一rule以上の完全cascadeエンジンを追加するのでなく、以下の小さい正負対を集合gateに含める。

- 同一要素に静的に対応する `.x{position:absolute}.fill{inset:0;width:100vw;height:100vh}` を位置・寸法の集合として見る。反対側には別要素/局所親のcaptionを置き、全stylesheetの無差別な宣言合成で正常配置を落とさない。
- 現コードはpositionがliteral absolute/fixed/stickyでなければ早期returnする。したがって `position:var(--p,absolute);inset:0` のようなfallback値は動的配置チェックに入らない。custom property定義の全削除でもfallback自体は残る。位置valueの未知判定をliteral filterより前へ置く必要がある。
- 動的値チェックの対象はposition/inset/width/height/transformのみ。top/right/bottom/left側のcalc/env/varは対象外。たとえばfixedと4端のうちbottomだけcalcにした候補を「動的配置は落とせた」のassertに加える。これはコードからの不足判定で、この追加候補のCSS runtime実行はしていない。
- `get()`は同propertyの最後の宣言だけを見るため、先行 `!important` と後続通常宣言の優先度を反映しない。property名はdecodeするがvalueのidentifierはgenerateした文字列の小文字化なので、escaped absolute等もliteral判定範囲として定義する。完全selector specificity計算でなく、静的に対応する候補集合の危険宣言を末尾だけで捨てないgateにする。
- 色など無関係のcustom propertyは保持する正fixtureを置く。動的な位置に参照される変数/未知値だけに保守的な制限を限定し、落とした配置と理由をnoticeにする。現spikeのcustom property全削除をそのまま採用しないというdesign判断は妥当。

logical property・pseudo element・animation等すべての視覚意味を新たに完全解析する要求ではない。対応集合と非対応時の保守的な処理を明記し、通常の局所配置を不必要に壊さない対照fixtureを持つことが最小条件。外側アプリの保護はsandbox containmentを正本とし、このheuristicを代替と説明しない。

## 引き継ぎ

Manager判断案: hash/依存一致、Node24での15件独立再実行、上記コードレビューをspike成立根拠として保持する。本体採用時は本体Node22環境で影響境界を検証する。元spikeの変更・npm ciによる上書き・全分類/全CSS解析への拡張は不要。CSS追加候補はコードからの不足判定であり、今回の固定15件に追加して実行したものではない。

全コード・環境・browser操作を停止する。P2b表示gateの環境所有はImplementerのまま。今回の結果をP2b本体・asset認可・CSS安全性完成・production取得pipelineの合格へ広げない。
