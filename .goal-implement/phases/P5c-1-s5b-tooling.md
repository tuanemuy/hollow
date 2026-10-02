# P5c-1 S5b 隔離 browser tooling

2026-09-30 17:52 JST。Manager が追加採用した公式 `playwright@1.63.0` / `playwright-core@1.63.0` の隔離導入が 1 回で成功。取得 tarball の SHA-512 と lock の integrity は事前の公式 registry 期待値に一致し、実依存はこの 2 件だけ。ブラウザ import / launch / connect、本体 boot、製品編集、DB、鍵、SDK 取得はすべて 0。

隔離 root は `/Users/hikaru/.local/share/hollow/verification/p5c1-browser-tooling-20260930-RaaaPD`。排他作成、通常 directory、mode 0700。tooling + npm-cache は 57,875,354 B / 上限 128 MiB、helper/config/TMPDIR は 1,360,038 B / 上限 8 MiB。インストール子の exit 0 / stdout close / stderr close を観測し、自己 runner/子 PID 14003 / 14004 は後続の限定確認で両方 ESRCH。未回収 exec / child / browser / listener は 0。

重要な残条件: `BrowserServer.close()` は通常終了専用 API ではない。固定版実装は graceful 失敗・30 秒経過などで自己 process group の SIGKILL にフォールバックする。強制終了なしという既存条件との整合を Manager が決めるまで、導入成功を起動許可や UI 検証成功として扱わない。

## 導入と照合

`P5c-1-s5b-browser-plan.md` を全文読了して実行。既知 Node の bin symlink は `/nix/store/m73kcssdrviw0jabgrvqb87k4sd7h8qv-nodejs-slim-22.22.3/bin/node` を指し、実体は通常 file / executable / 58,219,168 B。対応 npm bin は `../lib/node_modules/npm/bin/npm-cli.js` を指し、実体は通常 file / executable / 109 B。公開 package.json の npm version は **10.9.8**。以前の提案が参照した npm v11 の実行ではない。

実行 Node は `/nix/store/4gl9pclv6ygwmgpg1gijza978bqbmpga-nodejs-22.22.3/bin/node`、npm は同 store の `lib/node_modules/npm/bin/npm-cli.js`。新 root の `tooling` だけを prefix / cwd とし、`install --save-exact --ignore-scripts --omit=optional --audit=false --fund=false --progress=false --registry=https://registry.npmjs.org/ --fetch-retries=0 --fetch-timeout=30000 playwright@1.63.0` を 1 回実行した。

専用 `npm-cache`、空設定として LF だけの user/global npmrc、専用 TMPDIR を指定。子 env は PATH / TMPDIR / LANG / LC_ALL / PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD / npm update-notifier/logs-max/ignore-scripts の許可集合のみ。HOME を置換していない。npx、ブラウザ download、install-deps、package lifecycle 実行はなし。

runner は子 PID を生成直後に記録し、同じ同期区間で exit/close と両 pipe close の監視を登録。stdout は 24 B、stderr は 0 B、内容は保存・表示しなかった。120 秒 deadline と 128 MiB 容量監視を設定したが、中断・SIGTERM は発動していない。取得失敗・再試行は 0。

| package | version | 圧縮取得量 | SRI / lock / installed metadata |
| --- | --- | ---: | --- |
| playwright | 1.63.0 | 899,597 B | 一致 |
| playwright-core | 1.63.0 | 3,123,044 B | 一致 |

事前の公式 registry 期待値は [playwright](https://registry.npmjs.org/playwright/1.63.0) と [playwright-core](https://registry.npmjs.org/playwright-core/1.63.0)。今回、専用 npm cache 内の当該 content-addressed tarball を SHA-512 で独立に再計算した。

- playwright: `sha512-+7ziBLidS4NaNCdt57SUDT+wYmmd5fmiQejUic/kb+YsYSCPyOOE9sebzMjNmQrsnNpDJqd4WHvV/8lfKfUDUg==`
- playwright-core: `sha512-rYCsBF/M5HjUch52bbtVONEFjv6Xu8sm8h72dNlR5bzIE1fvC/bxgspzkjSfU+MweEMmPM8KJebG6nnyxo5mCg==`

lock の packages は空 root と 2 package のみ。installed package.json も同 version、playwright の dependency は core exact 1.63.0 のみ、core dependency は空。両方 scripts / optionalDependencies なし。実 node_modules の package directory 集合も 2 件だけ。bin symlink は `../playwright/cli.js` と `../playwright-core/cli.js` の 2 件で、領域内を指す。

| 対象 | bytes |
| --- | ---: |
| tooling（通常 file 179 個と bin symlink 2 個） | 18,550,257 |
| npm-cache | 39,325,097 |
| TMPDIR（npm が生成した node-compile-cache） | 1,353,016 |
| install.cjs | 3,293 |
| verify.cjs | 3,727 |
| config | 2 |

TMPDIR の compile cache はこの導入で新規生成されたもの。旧 cache を読み込んだり複製したものではない。旧 profile/config/credentials/proof/results/DB を探索・参照・コピーしていない。新 root は後続の再現用に保持し、削除していない。

## 公開 fingerprint

以下は公開 package と自己公開 helper のみ。秘密値の hash ではない。

| 対象 | SHA-256 |
| --- | --- |
| tooling/package-lock.json | `f03e14df78c5edd2a3eb09834cca06c2141ea879eac557b71b900e0ad2d9aa93` |
| tooling 通常 file 179 個の aggregate | `dc520408fcfe3e1951e46ca6a2a03d31d24b554ee21abe1249c094356fad3cc5` |
| core/lib/coreBundle.js（3,477,183 B） | `549070af3acabb3efcc4f55bfe6210f9f7c2fcf633cf7eaa59bfe60719969171` |
| core/types/types.d.ts（1,131,883 B） | `2806f6d7810fba0306066d500cd716a6d1128d90af2c3cf71723e3ea0a8904c4` |
| install.cjs | `32b6461afd7bc3c682afd4b6aba94e29852d232bd927808e311d95bee06ce0e1` |
| verify.cjs | `d51c160361f8044157873fa1edbff281d4b44ac7effbd9b3c3cba864a1d61364` |

aggregate は tooling 相対 path を JS 文字列昇順に並べ、`lowercaseSHA256 + two spaces + path + LF` を結合して SHA-256。symlink は aggregate 外で上記 target を別記した。

## 固定版公開 source の静的確認

以下の行番号は `tooling/node_modules/playwright-core/lib/coreBundle.js`。package を import/require せず、ファイルとして読んだ。types の記載より runtime source を優先して確認した。

### 起動・自己所有・終了

- 57169–57223: launchServer は新 browser を launch 後、PlaywrightServer を listen し、`BrowserServer.process()` に実 ChildProcess を返す。host / port は公開 option。`close()` はその browserProcess.close に結び付く。
- 39749–39791: profile と未指定 artifacts directory は `os.tmpdir()` 配下へ mkdtemp。**launch option の env だけでなく、Playwright を実行する Node 自身の起動前から専用 TMPDIR を指定する必要がある。** 既存 profile / `_userDataDir` / persistent context を指定しない案で新 profile になる。
- 9312–9330: macOS では `detached: true` により、新たに spawn した browser が新 process group の leader になる。stdio は stdin ignore、stdout/stderr と CDP 用 fd 3/4 の pipe。通常の 2 pipe だけでは全 pipe を証明しない。
- 9340–9374: stdout/stderr を library が consume。ChildProcess `close` で processClosed を立て、登録済み終了関数から除外し、自己 tempDirectories の cleanup 完了を待つ。
- 9387–9421: graceful close の再入、attempt の拒否で killProcess へ進む。kill の対象はこの spawn の捕捉済み PID に負号を付けた process group。`spawnedProcess.pid` があり、`killed` と `processClosed` が false の場合に実行する。未知 PID の探索や既存 browser の名前による kill ではない。ただし process group / descendants / PID 再利用の実観測は未実施で、この静的条件を OS 全体保証としない。
- 39831–39849 と定数 4594: `closeOrKill()` は graceful 待機と 30,000 ms timer を競合し、timeout 時にも kill()。launch 失敗時の cleanup も同経路へ進み得る。
- 9271–9301: Node の process exit hook も残存の自己 killSet を呼ぶ。handleSIGINT / SIGTERM / SIGHUP を false にするだけでは exit hook をなくせない。private test hook や dependency patch で回避する案は採用していない。
- 57219–57223: browserProcess の close callback は server.close() を呼ぶが await せず、BrowserServer の close event を emit する。従って BrowserServer.close の resolve やイベントだけで control listener / accepted socket の実 close まで証明したとはしない。

後続の観測案は、launchServer 成功後すぐ実 ChildProcess の PID / exitCode / signalCode / stdout/stderr/fd3/fd4 の close を捕捉し、終了済み状態も同時に検査する。通常停止は新操作停止 → pending handler 収束 → context.close → server.close の 1 回だけとし、再入停止をしない。終了失敗・timeout・未捕捉 PID・未終了 pipe / control socket があれば有限失敗として残す。実 descendants 全終了と制御 listener 全終了の追加観測方法は未確定であり、成功宣言の根拠にしない。

### 通信 interception

- 62511–62519: context.route と routeWebSocket は interception pattern 更新を await。newPage の前に両方を登録する。
- 62385–62409: 一致 handler がない HTTP は continue、WebSocket は connectToServer に進む。従って単一 catch-all predicate `() => true` と handler 内の exact allowlist が候補。page.route 等で上書きしない。
- 59840–59948: WebSocketRoute は未接続で始まり、connectToServer を呼ぶと server に接続。close は page 側を閉じるが内部 rejection を catch するため、close resolve 単独を通信遮断証明にしない。
- 51606–51609: serviceWorkers block は register を置換する init script を設定する。Chromium service worker 管理側にも block 分岐がある（38295）。既存 profile を持ち込まず fresh context とする理由になるが、実挙動はまだ未確認。
- `types/types.d.ts` の routeWebSocket 例には runtime と異なる `routeSend` / `connect` の記述がある。固定版 runtime と WebSocketRoute の具体的定義で確認した `close` / `connectToServer` の範囲に限定する。

これらは page/context interception であり、Chrome 起動時の背景通信、DNS、OS 全 egress を遮断する保証ではない。OS firewall / proxy / system 設定は追加していない。

## 次の最小 capability 案（未採用・未実行）

Manager が終了契約と背景通信の境界を決めた後、新たに承認した browser TMPDIR / profile 容量で 1 回だけ起動する案。既存 Chrome の限定 metadata / 版差は前報告を参照し、今回は再調査・起動していない。Chrome 154 と Playwright 同梱想定 Chromium 153 の互換性は未確認。

最小内容は synthetic document 1 件 ≤ 1 KiB、synthetic JS 1 件 ≤ 4 KiB、最大 4 requests / 64 KiB。DB/account/key/app boot は 0。loopback 固定 origin の document と exact synthetic SDK URL のみ fulfill し、JS MIME / nosniff / nonce CSP を保った script 実行結果を有限 boolean で確認する。他の HTTP は abort、WebSocket は接続しない catch-all、serviceWorkers block を page 作成前に設定。実 Google SDK や認可 endpoint へは接続しない。popup / redirect / SW / WebSocket の逃げ道を実際に確認するなら、この 4 requests 枠とは別の明示ケースが必要。

これは tooling の起動互換・fixture fulfillment の能力確認であり、本体 Drive UI / 実 Google Picker / CSP 許可 origin の完成証明ではない。

## 停止状態

製品 package / lock / node_modules、他担当の検証 root、管理 4 正本は変更していない。自己インストール 1 回と標準 Node による file/metadata/hash 検査だけを実行。公開 package の評価実行 0、browser launch/connect 0、SDK / Google / DB / key / app boot / product test/build 0。Chrome metadata の追加読みも 0。

静的探索時に存在しない旧 layout の source path を読もうとした 1 件と、workdir typo による spawn 前の拒否 1 件があった。導入再試行や製品障害ではなく、現在の bundle path と正しい隔離 workdir で静的 read だけを完了した。

未終了の自己 exec はなく、インストール子と runner は ESRCH を確認済み。報告を全文読了後、全 read/write/run を停止し、Manager に所有返却する。

EOF
