# P5c-3-S3 新build提案

2026-10-05 18:44 UTC。実行0の静的提案。候補11a7703b9ef1571eb73787ad5429f4c0af3b365bの公開sourceとlockに対応するinstalled dependencyだけを確認した。code/test/docs変更0、旧dist/旧root/privateのread/write/hash/import0、新root/DB/runtime/Worker/子/build/helper生成0。前任activeと通常取消terminal fenceのレビュー指摘を修正し、新候補Cを固定した後にManagerが実行を採用する。

## 採用する形

製品config/exportを変えず、Cのtracked archiveを新build専用root Bへ展開し、そのcopyで通常`build:node`を一回実行する。ViteだけをoutDir上書きしてもbuild-searchは元apps/web/distへ書くため、この部分的override案は使わない。archive方式なら通常config、RSC環境、build-searchのimport.meta.urlから求めるrootの全てが新copyに揃う。

- R = `/Users/hikaru/github.com/tuanemuy/hollow`（公開repository）。
- C = 修正後、Managerへ引き渡した完全commit SHA。11a7703は静的照合対象であり実build対象として確定しない。
- B = `/Users/hikaru/.local/share/hollow-validation/goal-implement-s3-build-<新UUID>`。採用後に一度だけmkdir排他生成、0700。ここでは生成しない。
- S = `B/source`、W = `B/source/apps/web`、D = `B/source/apps/web/dist`。B/material・B/logs・B/tmpも新規0700。
- root合計256MiB、source/links/cache/material32MiB、dist208MiB、logs8MiB、TMP8MiB。現候補tracked1455file/20,957,244Bなのでsource32MiBへ収まる。最終Cの件数/bytesも実行前に再固定する。

build一回、writer/外側runner1、実アプリboot/DB/HTTP/実Worker/外部0。build外600秒、TERM後10秒、KILL後10秒、pipe終了10秒を提案する。終了要求、actual exit、両pipe終了、known PID消失を別記する。容量監視は200msごと、許可symlinkを辿らず、超過/期限で自身のprocess groupだけを停止してfailed rootを保全する。失敗後追加build/reuse/削除0。

## Archiveと依存linkのexact境界

setup supervisorは固定argv `git -C R archive --format=tar C` のstdoutをtar streamとしてSへ直接展開する。tar保存0、working tree/untracked/.env/data/node_modules/distの取り込み0。Cのtracked treeのみで、archive前にtracked dist/data/.env実ファイルが無いことをpath manifestで確認する。tar memberはS内相対pathだけ許し、現在唯一のtracked symlink `AGENTS.md -> CLAUDE.md` を同一copy内の例外として固定する。展開regular file600、directory700。Cの全blob hash・modeと展開後source manifestを一致させる。

依存はinstall/download/copy0。通常検証rootのregular/nosymlink契約と別に、build専用の次のlinkだけを許す。

| 新linkの配置 | 名前のexact集合 | target |
| --- | --- | --- |
| S/node_modules | Cのroot package.jsonのdependencies ∪ devDependencies（現7） | R/node_modules/各名前のcanonical installed package |
| W/node_modules | Cのapps/web/package.jsonのdependencies ∪ devDependencies（現48）、@repo/coreだけ下記例外 | R/apps/web/node_modules/各名前のcanonical installed package |
| S/packages/core/node_modules | Cのpackages/core/package.jsonのdependencies ∪ devDependencies（現38） | R/packages/core/node_modules/各名前のcanonical installed package |
| W/node_modules/@repo/core | @repo/coreのみ | S/packages/core（必ず新candidate copy） |
| S/node_modules | pdfjs-dist、sharp、@napi-rs/canvasの3個 | 前2個はR/packages/core/node_modules、canvasはR/node_modules/.pnpm/node_modulesの各canonical target |
| W/node_modules/.bin/vite | viteのCLI1個 | R/apps/web/node_modules/vite/bin/vite.jsのcanonical target |

現集合は97link、上限100。名前/pathはwildcard探索せずCの3個package.jsonと上記4固定例外から決定する。@repo/core以外のcanonical targetはR/node_modules/.pnpm以下の公開installed packageに限定し、prefix/realpathとlock versionを検査する。新node_modules directory自身はsymlinkにせず、named package linkだけを作る。公開依存側へwrite0、workspace packageの旧sourceへのlink0。link manifestへ全97個のabsolute link→canonical targetを実build前に書き、Supervisorはこのexact集合以外のsymlinkを拒否する。

確認済み固定版：pnpm11.1.2、Vite8.0.12、esbuild0.27.7、react-start1.167.65、start-plugin-core1.169.20、router-generator1.166.42、plugin-rsc0.5.26、Hono Node2.0.2、libSQL client0.18.0、css-tree3.2.1、pdfjs6.3.289、sharp0.35.4、canvas1.0.8。transitive dependencyは各canonical pnpm packageが固定済みの自分のdependency graphを使う。install/update/prune/新lock生成0。

## Exact build invocation

有限supervisorのPopen argvは次の一個に固定する。shell展開/候補探索/他buildへのfallback0。

```text
argv = ["pnpm", "--dir", W, "run", "build:node"]
cwd  = W
```

child envは名前を固定して構成し、process.env全列挙0。公開tool PATHのみ継承、`NODE_ENV=production`、`TMPDIR=B/tmp`、`TSR_TMP_DIR=B/tmp/router`、LANG固定。NODE_OPTIONS/認証/外部provider/旧data関連envは注入しない。stdout/stderrはB/logs/build.log新wx600へ接続し、上限8MiB。source package scriptsは変更せず、実際の順は`vite build --config vite.config.node.ts`→成功時のみ`node scripts/build-search.node.mjs`。通常Vite config bundlingの`.vite-temp`はnearest node_modulesである新W/node_modules内に作られ、旧cacheを参照しない。TanStackのtmpはTSR_TMP_DIRへ固定し、routeTree生成先も新copy W/app/routeTree.gen.tsになる。

Wに.env実ファイル0、Cに対応するconfig/entry/DDL/lock/sourceのhashを前後で一致させる。generated routeTreeが変わった場合も同candidateの成功buildとは扱わず、差を保全して報告する。公開original sourceの変更0。configはdefault plugin構成のままで、Vite root Wから各default relative outputを新Dへ解決する。

## 成果物と正規消費側

| 新成果物 | 出力元 | 正規消費側 |
| --- | --- | --- |
| D/client/assets/* とpublic assets | Vite client environment | server.nodeのserveStaticAsset、resourceRequestGuard、HTML/RSCのasset manifest |
| D/server/server.node.js、SSR chunks | Vite ssr environment、通常server.node.ts entry | exact launcherの唯一のentry import |
| D/server/rsc又はD/rsc、RSC chunks/manifest | TanStack provider outDirとplugin-rscが解決するrsc environment | plugin生成の環境間relative importsとassets manifest |
| D/server/nodeShutdown.mjs | build-searchのnodeShutdown.ts esbuild | exact launcherの正規createNodeShutdown |
| D/server/browse/{searchSupervisor,searchQuery,publicQuery,noteProjection}.mjs | build-searchの4 entry | NodeSearchExecution/NodePublicDiscoveryExecution/IsolatedNoteProjection |
| D/server/export/document.mjs | build-searchのexportDocument/worker.ts | IsolatedExportDocumentWriter/ZIP writer |
| D/server/pdf/{engine,documentWorker}.mjs、supervisor.py | build-searchのPDF2 entry＋公開source copy | prepareNodePdf、IsolatedPdfDocumentWriter、PDF supervisor |
| D/server/llm/{sourceWorker,documentWorker,imageChild,pdfPagesChild}.mjs | build-searchのLLM4 entry | bootからcreateNodeLlmへ渡す明示path |

start-plugin-core/output-directoryはclient=D/client、ssr=D/serverを解決する。RSC providerはplanningでD/server/rscを加え、plugin-rscは既environment outDirを優先する。静的段階でrscの最終merge順を成果物存在の根拠にしない。実buildのenvironment別logと実成果物/環境間importsから最終配置をmanifestへ記録し、全outputと全RSC import先が新D内に収まることを確認する。別resolveConfig呼出しや全config/env dumpは追加しない。

通常Node bootのWorker/export/PDF/search pathはcwd相対`dist/server/...`。将来起動のcwdをWへ固定すれば全て新Dを指す。HTTP側はbundleのimport.meta.urlから`../client`を解決するため、boot/asset-servingの実生成chunkがD/server直下にあり、新D/clientを解決することをpost-buildで静的に確認する。bootが深いchunkへ移された場合はasset path成立を仮定せず、このbuildを起動可能候補へ昇格しない。

## Manifestと後続UIの無変更再利用

build success後、B/material/build-manifest.jsonへC/track tree、Node/pnpm/依存version、config/Node entry/publicWorker source/正式DDL0043/lockのhash、97link manifest、観測したenvironment/output配置、dist regular filesのrelative path/bytes/hash、entry/RSC imports、client asset references、build exit/期限/容量peakを記録する。secretや生成RSC encryption keyの本文は表示せず、file metadata/hashだけを扱う。regular成果物は新distだけをinventoryし、旧distとの比較0、symlink traversal0。runtime bare importsが公開pinned dependenciesへ解決し、@repo/core/旧source/.tsへの未bundle importが残っていないことを確認する。

後続UIはこのCとmanifestに束縛したDをread-onlyで使う。再build/新asset生成/manifest書換/旧distfallback0。UI製品修正でCが変わった場合はこのdistを新candidateの証拠へ流用せず、別採用を求める。UI用DB/storage/mailbox/keys/runtime ownership等は後続phaseに新規割当し、absolute env pathへ設定する。Bのsource/distをruntime data領域にしない。

現`listen.node.ts/.mjs`は元repositoryのdist存在探索を含むので実行しない。後続で採用するB/material/listen-exact.mjsは公開listen.node.mjsのserve/drain/signals構造を維持し、loadBundledだけを次のexact importsへ置換する新helperとする。製品export/config変更は不要。

```text
cwd = W
Hono serve = canonical public @hono/node-server/dist/index.mjs（link manifestの固定target）
server = import(fileURL(D/server/server.node.js))
shutdown = import(fileURL(D/server/nodeShutdown.mjs))
resolve server.boot or server.default.boot; absentなら即失敗、候補探索0
boot() → serve({fetch,port,hostname}) → createNodeShutdown({quiesce,closeListener,shutdown})
SIGTERM/SIGINT → drain → actual process exit、失敗時は保全して報告
```

bootには既`fs.existsSync('.env')`があるが、cwd Wとarchive-only copyに.envがないので旧.envを読まない。entryからのRSC imports/asset manifestsも同新Dのまま保持する。実HTTP/browserでasset配信を確かめるのは後続UI phaseの別許可・有限資源であり、今回のbuild計画は起動/外部接続/音声操作を許可しない。

## 現在の判断待ち

Managerはarchive copy＋正規buildの方向を採用可能と確認済み。正式採用時に、最終C、B absolute path、build専用97link例外、256MiB内訳、600秒期限、success後manifest/後続exact launcherの範囲を固定する。現時点は報告1pathの編集だけで、全product writer/runtimeは停止を維持する。

2026-10-05T18:58:00+00:00 Manager正式採用後、C=`c425c2a1f452b2c505534e48e9b1b0fbc0a14c54`、B=`/Users/hikaru/.local/share/hollow-validation/goal-implement-s3-build-20261006-e9e304ce-6f84-43a9-bdd5-2786aead0b09`へ固定。生成前に全97linkのabsolute/canonical tupleを決定し、canonical JSON sha256=`784d2eb233e8b5251c643c9cedb93a68acfe1e5b22a29378139690a3a63dbf36`を通知した。全public dependenciesと新copy @repo/coreだけ、上限100。256MiB/600/stop10+10/pipe10を採用、code/test/docs停止のまま新copy buildだけを進める。

## 正式採用の補正結果

2026-10-05T19:18:00+00:00。初回pnpm runはverify-deps-before-run default installが起動してguard停止、Vite/search開始0。失敗Bは非操作保持。Managerは同package script/config/C/lockを維持した直接Node argv二個、Vite成功時だけsearchへ進む補正を採用した。新Bは`/Users/hikaru/.local/share/hollow-validation/goal-implement-s3-build-direct-20261006-1fca339f-b377-491c-b8af-c63fb7f1d427`、97link manifest sha256 `4ff69c4cfdf1d19095e488a81a6a19ff21238dffd88bcd4f1bdf410f7956455c`。root256MiB/600秒/ownPG10+10/pipe10、install/download入口0。

両build actual exit0、5.411秒、Cのarchive1455blob前後同値、492成果物/23,206,117B、root peak50,448,914B。RSC最終配置はD/server/rsc。full manifestはB/material/build-manifest.json。詳細停止/容量/型と失敗履歴は[P5c-3-s3](P5c-3-s3.md)の最新記録を正本とする。

AST mandatory imports/relative closureは成功したがRSC90asset中JS1（workspace-settings-Bd0ykgXv.js）不足。固定plugin SSRのdeps preloadへ56client referenceから到達する静的欠陥をManagerへ返した。CSS空chunk除去とRSC manifestの時点差が公開コードの機序に整合するが、実HTML/requestは未観測。新BをUI起動可能と確定する条件は未成立、source/dist修正・再build0。optional PDF proxy-agentは固定依存の明示optional+catch fallbackでありmandatory不足へ数えず別記。後続UIはexact新Bの参照解決判断を先行gateにする。

## 最新E新候補のarchive有限化

Managerは新C=863097fの新archive buildを採用。工具mode不備とlocal抽出の重複全tree走査による期限停止は製品compileの失敗へ混ぜず、全失敗Bを非操作保持した。

現在の固定公開generatorは `.goal-implement/helpers/s3-build-generator.py`、13,811B/SHA256845db9b682fefeb57a8cb4a81ea6cdd60c12ae90bcb9f28e68cfe5a2618d152c/600。最新差は独立再点検待ちで新B生成0。新fileはすべてwx/O_EXCL/明示600、dir700、最初umask0077、python-B/自作moduleimport/pycache0。archiveは新wx600 gzipへgit archive --format=tar.gz --output、gzip8MiBをsource/cache/material32MiB内へ計数する。archive子1/外60/全600、共通200ms supervisor/knownPG TERM10 KILL10/正常異常のactualexit/PIDPG/redirectFDclose。PIPE構造的不使用をEOF成功へ読み替えない。

完成gzipのlocal抽出60/64KiB、1457knownpath/唯一AGENTS link、wx原本source上書き0。抽出前計測のgzip/material込みoverheadを固定し、各chunkの加算bytesはsource32/root256とdeadlineを即検査する。全tree guardはmonotonic next時刻へ達した時だけ走査し終了後+200msへ更新、member/chunk入口は共通gateを使用、抽出前後strict mode/path/blobを維持する。新B一つの生成前固定→directVite/search各一回→新AST/assets照合の採用資源は変えない。codeC/backend/UI実行変更0。

## 最新正式実行の完成候補

2026-10-05T19:46:24+00:00。独立cadence generator preflight合格後、新B=`/Users/hikaru/.local/share/hollow-validation/goal-implement-s3-build-modechecked-20261006-fae1de7c-4c33-4fba-957d-6cc367e1082e`でC863097fの1457blob/97linksを固定し、新archive→directVite→success search一巡成功。source前後同C、492outputs23,200,692B、archive/Vite/search actualexit0/knownPIDPG ESRCH/redirectFDclose/PIPE不使用、各資源期限内。両RSC69clientreference/bootstrap1/JS82+CSS7全89asset存在・AST3329edges欠落/escape0、static_asset_ready=true。旧B欠落は履歴保持、新dist patch0。

正本release-manifest.json sha2567ad07fccdc3d60e211d1ffdcf4f34557ab34a070b1e2e7834462ab0d8d9e90b1とphase報告先頭にexactsource/link/output/entry/client/rsc/aux/closure/未検証を固定。全writer停止、Cとsource/dist無変更、後続UIはこの新Bを無変更で消費する候補。E独立受入とManager別指示までUI root/helper/boot/HTTP/browser作成起動0。旧全B/root非操作。
