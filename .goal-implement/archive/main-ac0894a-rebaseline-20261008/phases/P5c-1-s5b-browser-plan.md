# P5c-1 S5b browser tooling 静的提案

確認日: 2026-09-30 JST。実装・独立検証ではない。モデル変更に伴う一時停止指示により、既確認事項だけを記録して返却する。導入案の採用と実行許可は未取得。

## 結論

公式 `playwright@1.63.0` を、新たに承認された隔離検証領域だけへ exact で追加する案を推奨候補とする。公式 `route.fulfill` は status / headers / contentType を指定でき、SDK 代替 JS の MIME を明示する目的に対応する。製品 package / lock / node_modules は変更しない。

既存 Chrome の単一候補は通常 file・実行可能だった。ただし Playwright 同版の bundled Chromium と版が異なり、実互換性は未確認。インストール・import・launch・接続・新 root 作成・fixture 生成はすべて 0。ブラウザ download による自動代替は提案しない。

## 公開 package metadata

公式 npm registry の必要 fields だけを非変更 GET で確認。tarball 本体は取得していない。下記 integrity は registry の期待値であり、取得物との SRI 照合成功ではない。

| package | exact version | dependencies | unpacked bytes | files |
| --- | --- | --- | ---: | ---: |
| playwright | 1.63.0 | playwright-core 1.63.0 | 5,094,512 | 62 |
| playwright-core | 1.63.0 | なし | 13,453,369 | 114 |

両方 Node `>=20`、metadata 上 scripts / optionalDependencies はなし。合計展開量は 18,547,881 bytes / 176 files。圧縮取得量・cache 量・実インストール量は未測定。

- playwright integrity: `sha512-+7ziBLidS4NaNCdt57SUDT+wYmmd5fmiQejUic/kb+YsYSCPyOOE9sebzMjNmQrsnNpDJqd4WHvV/8lfKfUDUg==`
- playwright-core integrity: `sha512-rYCsBF/M5HjUch52bbtVONEFjv6Xu8sm8h72dNlR5bzIE1fvC/bxgspzkjSfU+MweEMmPM8KJebG6nnyxo5mCg==`

一次資料: [playwright metadata](https://registry.npmjs.org/playwright/1.63.0)、[playwright-core metadata](https://registry.npmjs.org/playwright-core/1.63.0)。調査時の latest metadata が 1.63.0 を返したが、導入時に latest を指定する案ではない。

## 既存 browser の限定 metadata

Manager が許可した次の 2 path だけを lstat / 公開 version metadata で確認した。起動や `--version` 実行はしていない。

| path | 結果 |
| --- | --- |
| `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | exists / no-symlink / regular / executable、367,696 bytes、Mach-O x86_64 + arm64 |
| 同 bundle `Contents/Info.plist` | exists / no-symlink / regular、18,856 bytes、CFBundleShortVersionString = 154.0.8037.59 |

末端 file の確認であり、親 directory 全鎖や起動互換性の検証ではない。他 browser / profile / cache / preferences / credentials の探索は 0。

Playwright 1.63.0 の公開 browsers.json は Chromium revision 1243 / version 153.0.8010.12。既存 Chrome 154 との版差がある。公式 API は `executablePath` を提供するが任意版との互換を保証しない。不成立時に新 browser を download せず、停止して報告する。

一次資料: [固定版 browsers.json](https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/packages/playwright-core/browsers.json)、[BrowserType](https://playwright.dev/docs/api/class-browsertype)。

## 承認後の導入候補と変更範囲

以下は未実行の案。新領域を `P` とし、製品外の `P/tooling` に package.json / lock / node_modules、`P/npm-cache` に cache、`P/config` に空の専用 npm user/global config、`P/browser-tmp` に fresh profile、`P/artifacts` と `P/results` に自己出力を閉じ込める。既 profile / storageState / 既存 CDP 接続を使わない。

既知の Node/npm だけを使い、`--save-exact --ignore-scripts --omit=optional --audit=false --fund=false` と registry 固定・有限 fetch timeout / retry 0 を指定する。npm config と process env は許可集合で構築し、既認証設定の読取・出力をしない。`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` も設定し、`playwright install` / `install-deps` / npx による追加導入を行わない。取得後の lock は上記 2 exact package / integrity だけであることを確認する。

`ignore-scripts` は package lifecycle を止めるが、明示 `npm run` 等の実行まで禁止する機構ではない。導入と検証 helper の実行許可を分離する。[npm install 公式](https://docs.npmjs.com/cli/v11/commands/npm-install/)

量の確定根拠は上記展開量のみ。tool/cache、fresh profile、script/log の個別予算は導入前に Manager が確定する必要がある。既存 script/log 8 MiB 枠へ 18.55 MB の package を無言で混ぜない。profile 増大量や peak RSS の硬保証は未測定であり、今回数値を採用しない。

## 正規 API による通信と応答代替

候補は `chromium.launchServer({executablePath:上記固定path, host:'127.0.0.1', port:0, ...})` と、その自己 server にだけ `chromium.connect` する構成。`BrowserServer.process()` により自己 ChildProcess を取得できる。制御 endpoint は memory 内だけに保持しログへ出さない。fresh profile の生成先を専用 TMPDIR に収める導線は実行前に固定版実装と確認する。

起動後は isolated context を作り、`serviceWorkers:'block'`、downloads 不要を指定する。`context.route('**/*', ...)` と `context.routeWebSocket('**/*', ...)` を **newPage 前**に登録する。固定 loopback app origin だけを必要に応じて通し、SDK / 認可代替は exact method / origin / path に対する fixture fulfill、未知は abort。外部 mock に `route.fetch` / continue を使わない。popup も context 単位で覆い、page.route で gate を上書きしない。

SDK JS は例えば `route.fulfill({status:200, contentType:'application/javascript; charset=utf-8', headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}, body:syntheticSdk})` として明示する。認可文書は HTML の MIME を指定する。製品 CSP を除去せず、`bypassCSP` を使わない。

固定版 WebSocketRoute は `connectToServer()` を呼ばなければ実 server へ接続しない。全 WebSocket を閉じる候補とし、現在 main branch の API 例ではなく固定版を使用する。ServiceWorker は route を迂回し得るため block が必要。

一次資料: [Network](https://playwright.dev/docs/network)、[固定版 Route](https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/docs/src/api/class-route.md)、[固定版 WebSocketRoute](https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/docs/src/api/class-websocketroute.md)。

重要な未証明境界: context route は page の通信制御であり、Chrome 起動時の背景通信・DNS・その他 OS 全通信を遮断する sandbox ではない。したがってこの案だけで「全外部 packet 0」と断定しない。文字通り OS 外部送信 0 が必須なら、起動前に別の許可済み egress 制御が必要であり、今回勝手に system network 設定や proxy を追加しない。redirect / popup / SW / WebSocket の逃げ道がないことも実行未確認。

## 所有終了と最小の次手

自己 ChildProcess の exit/close と BrowserServer close の観測を早期登録し、新操作停止 → 自己 pending handlers の収束 → context.close → server.close → actual process close の確認を行う案。公式 `BrowserServer.close()` は graceful に process 終了を保証する説明を持つ。単なる接続切断や timeout を actual exit とみなさない。終了不明なら成功 / cleanup 完了とせず残存を報告し、他 PID 操作・強制 kill を行わない。全 descendant / pipe の実終了確認範囲は主の owned runtime 検査と整合が必要。

一次資料: [固定版 BrowserServer](https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/docs/src/api/class-browserserver.md)。

再開後に必要なのは、導入領域と容量 / egress 境界の承認、取得 integrity 照合、既存 Chrome との最小起動互換、MIME/nosniff と現 CSP 下の fixture 実行、未知通信拒否、自己全終了の有限確認。これは本体 UI や実 Google Picker 成功の証明ではない。既要件に新業務 gate を追加する提案でもない。

## CLI 代案と停止状態

Manager 確認済みの agent-browser v0.38.1 parse_network は abort/body/resource-type だけで、headers/status/content-type の転送なし。短い公式資料照会では dispatcher の既定 MIME を確認できなかった。CLI に必要な fulfillment があると推測せず未確認のまま残す。既 resolver / tool import 失敗の同手順反復はしていない。

本報告は中断時点の静的候補。製品変更 0、install/import/launch/connect 0、新 root/profile/key 0、Node/test/build/DB/browser 実行 0、外部 API 認証/生成/課金 0。公開 docs/registry の読取以外の外部接続なし。自己 child/server/socket 生成 0、未回収 exec 0。全文確認後、報告を含む全 read/write/run を停止し Manager へ所有返却する。

EOF
