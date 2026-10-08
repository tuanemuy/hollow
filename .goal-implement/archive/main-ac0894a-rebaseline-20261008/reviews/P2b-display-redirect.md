# P2b-C redirect 表示境界の独立判断

## 結論

HTTP 入口の用途別拒否は、今回の最小補強として条件付きで採用できる。保証は「対応 browser の subresource 要求を非 asset 動的ルートの認証・業務処理へ渡さない」であり、「app への Cookie 付き要求が送信されない」ではない。CSP の exact path 保証を復活させる仕組みでもない。

IM-05 の公開外部画像・CSS 背景/font の直読と、非 asset 動的処理の遮断を両立する候補である。別 origin/blob/bearer/proxy への全面変更を必須にしない。本体コード・環境・browser を調べておらず、実装の合格判定ではない。

## 一次資料の根拠

調査日は 2026-09-06 JST。Fetch Metadata は 2025-04-01 Working Draft、Fetch は参照時点の Living Standard を確認した。

- CSP3 §6.7.2.8 は path 照合を redirect count=0 の場合に限定する。scheme/host/port まで無条件に無視する仕様ではないが、同 origin の別 path を CSP の exact asset URL だけで拒否し続ける根拠にはならない。[CSP3 URL 照合](https://www.w3.org/TR/CSP3/#match-url-to-source-expression)
- Fetch の HTTP-redirect は同じ request の URL list 等を更新して再 fetch し、destination を変更しない。したがって通常の redirect では image/font 等の用途は継続する、という仕様上の推論になる。CSS 背景は image、font-face は font、fetch/XHR は空 destination、通常 navigation は document と区別される。[Fetch redirect](https://fetch.spec.whatwg.org/#http-redirect-fetch)、[request destination](https://fetch.spec.whatwg.org/#concept-request-destination)
- Sec-Fetch-Dest はその request destination を送る。空 destination の値は `empty`。通常の Web JS は Sec- request header を指定・改変できない。ただし HTTP client・中継装置・特権拡張まで偽造不能な認証情報ではない。[Fetch Metadata](https://www.w3.org/TR/fetch-metadata/)、[Fetch forbidden request-header](https://fetch.spec.whatwg.org/#forbidden-request-header)
- Fetch Metadata は potentially trustworthy URL に対する送信へ限定される。HTTPS のほか loopback と条件を満たす localhost は該当するため、「HTTP なら必ず欠落」も誤り。通常の非 localhost HTTP や未対応 browser に同じ保証を置かず、採用 browser・HTTPS/localhost の実観測を残す。[Metadata §3](https://www.w3.org/TR/fetch-metadata/#integration)、[Secure Contexts §3.1–3.2](https://www.w3.org/TR/secure-contexts/#is-origin-trustworthy)

## 採用条件

以下は資料に基づく今回の設計判断であり、本体を確認した事実ではない。

- guard は認証、session 更新、server function/SSR loader、業務用 DB 処理より前に置く。拒否は副作用なしの応答とし、app へ到達した件数と保護 handler/UoW へ進んだ件数を別に数える。proxy/access log・TCP/HTTP 到達までゼロとは言わない。
- image/video/audio/font を少なくとも対象にし、style 等を許す表示構文があればその用途も塞ぐ。`same-origin` という Site 値を理由に用途 guard を迂回させない。destination は許可の認証ではなく、当該ルートに不適切な用途を拒否する材料にする。
- 例外は厳密な asset route と実体のある静的配信に限定する。asset は例外通過後も本人・note 現在参照・ready・Range 前の認可を維持する。`/api/` 全体、拡張子風 path、static 不在時に SSR へ落ちる catch-all を例外にしない。正規化/encoded separator/末尾 path/query の扱いは実 router と一致させる。
- 正常 navigation の document、app fetch/XHR の empty は通常の認証・CSRF 等へ進める。親 app の JS/CSS・favicon/font は厳密 static として保持する。destination guard は script/form/navigation 禁止や既存 asset 認可の代わりではない。
- allowlist 内の別 asset/static へ redirect が届く余地は残る。各 asset URL の認可が成立しても、CSP が描画元 note の exact URL だけを強制し続けたことにはならない。この補強で主張するのは非 asset 動的ルートの遮断である。

## 欠落・運用上の限界

ヘッダー欠落/未知・不正値の扱いを明示する。互換性のため通常処理へ通す場合、その要求には同等の redirect 防御がない。browser JS がヘッダーを自由に消せるという意味ではないが、未対応 browser、非 trustworthy HTTP、header を除去する proxy ではこの前提を満たさない。全 legacy browser 対応や欠落時の別方式を今回自動追加せず、対応条件外と残す。

中継層が guard より先に認証・業務処理する構成、広すぎる static 例外、Cache が用途違いの応答を再利用する構成でも「保護処理 0」は主張できない。用途で応答が変わる cache には適切な Vary、または非 cache の方針が必要である。[Fetch Metadata deployment §5.1](https://www.w3.org/TR/fetch-metadata/#vary)

## 最小 gate

| 試験 | 必須の観測 |
| --- | --- |
| 採用 browser・有効 session の画像/CSS 背景/font から公開外部 redirect → app の非 asset 動的 path | 各 directive がその redirect 先を許す条件で、最終入口の destination、Cookie の有無を秘密値なしで記録。到達があっても認証/session 更新/対象業務 handler は 0。CSP が先に拒否したケースは入口 guard の実証と分け、描画失敗や CORS エラーだけで合格にしない |
| 同じ拒否を unit/入口 integration で確認 | GET/HEAD/Range、URL 正規化・static 風不正 path、非 asset API を拒否。これは注入 header による guard 試験であり、browser の header 挙動証拠とは別 |
| 正常 path の回帰 | document のサインイン/詳細/通常遷移、empty の保存/fetch、実 static JS/CSS/font/favicon、本人 asset と動画 Range/seek を維持。asset の他人/未参照は既存認可で拒否 |
| 欠落と配信条件 | 欠落/不正値の実装方針を test で固定。HTTPS/localhost の採用 browser、proxy の header 保持、cache 方針を確認。未確認条件を同等保護にしない |

影響する受入は P2b-C の取得/描画境界、P1-C の HTML 隔離、P1-D・P2b-A の asset 認可を弱めないこと。実認可 test、実ブラウザ gate、HTTP 入口の配置確認は Implementer と正式 C 独立検証へ残す。

本調査では一次資料の web 参照とこの報告だけを行った。コード/依存/設定/DB/storage/browser/listener/process に変更なく、goal と全体管理文書も変更しない。markdown-style に従って根拠と条件付き判断を分けた。

開始 2026-09-06 07:51:46 JST、報告確認 07:55:18 JST。実環境検証は未実行のまま、操作を停止する。

## 追確認: redirect chain の Site と保護 asset

2026-09-06 07:59:12 JST に §2.3 の algorithm と §4.1 を再確認した。`Sec-Fetch-Site` は全 URL list を request origin と比較する。一度別 origin の URL が現れると、後の app URL では continue するだけで same-origin に戻さない。別 origin が同じ site 内なら same-site、異なる site が一つでもあれば cross-site で終了する。§4.1 の例も、外部経由で元 origin に戻った最終要求が cross-site のままであることを明示している。[Fetch Metadata §2.3](https://www.w3.org/TR/fetch-metadata/#sec-fetch-site-header)、[§4.1 Redirects](https://www.w3.org/TR/fetch-metadata/#redirects)

したがって、app origin を持つ iframe → 外部 origin → app 保護 asset の subresource 要求に `Site == same-origin` を必須とする補強は、仕様上この混入を拒否できる。same-site も許可してはならない。これを既存の非 asset 動的 path 拒否に追加すれば、上で残条件とした「外部 redirect から allowlisted 別 note asset」も、対応 browser の有効 metadata を前提に拒否対象へできる。Site は note ID を認証しないため、現在 note/ref/本人の既存認可は維持する。

直接同 origin の asset/Range は URL list が同 origin だけなのでこの条件を通る想定。明示 document navigation は今回の subresource 制限と分け、通常の認可へ進める。欠落/未知 metadata に同じ保証は加えず、拒否か互換 fallback かを別途明示する。公開/export の外部埋込は後続 policy とする。

追加 gate は、同 origin 直接 asset/Range の正常系と、別 origin 経由の同じ asset・別 note asset の拒否を対にするだけでよい。後者の最終 Site と asset handler 到達を実 browser で観測する。これは仕様上の採用判断であり、並行する Implementer の実観測を独立実行済みと数えない。本体/env/browser 不干渉のまま追記を終え、操作を停止した。
