# P5c-1 S5a 接続・停止・local-only解除

## 現在地

2026-09-30、S5a実装者候補完成。候補 `96f5c33705f10fe14e7115c9c0ffa975b9047734`、基点 `a85ccdd84bd1a690e68e752e8d38cf904d11aebf`。採用範囲は[S5a exact案](P5c-1-s5-plan.md#2026-09-30-s5a-exact追補接続とlocal-only解除)の13path、新22＋比例25＝非重複47/47直接成功。最新型→lint:fix→format成功、所有外製品/移行/lock不変更。独立合格やP5c-1 A〜F全体完成ではない。補助はSettings2pathの静的実装のみ、返却済み・文書含む全停止・実行0。

新rootは `/Users/hikaru/.local/share/hollow/verification/p5c1-s5a-20260930-GGvsOF`（umask077、mktemp排他）。DB32MiB/active16MiB/max2、material256KiB/other8MiB、AES2×32B、runtime4directory/acquire5、専用前任child1/restart1、自己HTTP同時1。初回上限12/2MiBはR2再確認5件だけの追加許可で17/2.25MiBへ拡張、保守17×128KiB=2,228,224B。旧proof/read/copy/run0、CSP/build/本体boot/browser/fresh/移行/実外部0。goal/spec/spec-implement/管理正本非操作。

Node factory、専用root lifecycle、launcher quiesce、受信body取消、local解除を接続。初回factoryの申告外127.0.0.1:443試行可能性・接続成立不明は保持、443探索/再接触/kill0。累積要求17（この未確定1を含む）、全wireの直接実測ではなく保守2,228,224B。最終sealで既知57PID全ESRCH、DB0/material1,356B/other38,235B＋観測cache保守29,375B。初期type2の未記録PID/outcome不明は別の過去限界であり、全実行の完全追跡とはしない。S5b以降へ自動で進まない。

## 準備履歴

`type-01` は型child exit0/診断0だが、harnessがstderr close前にsummaryを固定したためouter exit1。全終了証明を伴う型成功とはしない。`type-02`はclose eventへの後付待機によりsummary未記録のままouterが自然終了し、child PID/結果は不明。未知PID探索・kill・成功推定0。

開始時PID/時刻のwx+fsync保存、spawnと同じ同期区間の全listener登録、両pipeのend/closeとchild exit/close/ESRCH、必須終了summaryへrunnerを訂正。固定`smoke-01`はchild32926、exit0、出力6B、両pipe EOF/close/readableEnded/closed/destroyed、ESRCH、outer終了を直接確認した。DB/HTTP/鍵0で製品47対に含めない。Managerはこの結果を受領して製品試験再開を許可した。

`type-03`はexit2・診断投影不足、`type-04`で新application testの895/898/956行TS2345を有限path/lineとして確定。exactOptionalPropertyTypes下での`drive:undefined`をproperty省略へ訂正した。両runともchild/両pipe全終了・ESRCH、DB0。固定binaryパスの転記誤りによる`--version`起動失敗1も製品未到達の準備失敗として区分する。

13許可path内の製品と新22対の静的初稿を作成した。Settings補助は2path/全文EOF/実行0で返却済み。factoryは実構成・fixed endpointのtest-only loopback写像、rootは5非DB＋3実DB、local解除は6DB＋2componentであり、新fixture familyや製品HTTPの送信先設定は追加しない。型・規定整形後に限定実行する。

## 規定checks・非資源対

type05/06は診断0/exit0/childと両pipe全close/ESRCH。lint01/02は新test7箇所のsingle-var宣言規約違反（初回診断投影不足）、局所訂正後lint03→format01成功。無関係製品差0。

settings01/transport01はexit0/全終了だが旧`onFinished` reporterが現Vitest4で発火せず件数不明。公開installed `onTestRunEnd`/`children.allTests()`へ適合し、runnerは実名完全一致と件数/未処理error0/module成功を必須化。settings02は2pass/6選択外、transport02は12pass/3files。先行件数不明を合算しない。

## factory初回失敗・範囲外接続試行の可能性

factory01は1pass(F1)/1fail(F2 AssertionError)/4skip、製品成否は未成立。test-only URL写像でport0へ変更した一方、既NodeDriveHttpが固定する`options.port=443`をnative `http.request`へ残した静的欠陥を発見した。127.0.0.1:443への試行可能性をManagerへ即時報告し後続HTTP/DBを停止した。元例外本文は未保存/未読、実接続先や応答内容は未確定。443を許可先へ追加せず、探索/再接触/killをしない。

入力種別は新自己AES鍵と合成client設定、合成access token、公開合成folder metadataのみ。利用者/旧環境の資格値0。失敗結果の有限分類はAssertionErrorだけで、F2内部のどのassertだったかは未取得。server.close/自己socket close待ちはtest finallyにあるが、その個別boolは元runから未保存なので直接観測済みと補完しない。runnerはchild73749のexit1・両pipe EOF/close・ESRCHを直接保存。追加known-PID照合ではrunner/child双方ESRCH。factoryに子孫spawnはなく、自己listener/socketを保持する生存process0。未知PID調査0。

要求は応答未確定でも1件/128KiB保守予約消費とする。F2再検証1を含める場合、既計画の残10件と合わせ最大12件/1,572,864B保守予約、既2MiB内。actual wireの直接値ではない。新root実量DB0/material797B/other19,229B（この文書はrepo側）、ファイル39。鍵2本/config/既owner保持・削除0。

同時に公開installed Vitest型からdefault結果cacheが`node_modules/.vite/vitest`であることを確認した。metadata限定照合でregular1file/29,375Bを観測、内容未読・削除0。開始前baselineがないため全量を今回新規とは断定しない。以後test.cache=falseと新root cacheDirへ限定するharness差をManagerへ申告し、これもother予算内に保守加算する。

### 再実行前の最小案（当時未実行の履歴）

test-only native factoryで固定production URL/headersを先にassertし、URLと最終optionsのprotocol=http、hostname=127.0.0.1、port=自己listenerのactualaddress.portを明示束縛する。socketPath/任意host/port等の迂回0。native呼出し直前にserver.listening/actualaddressとの全一致を有限boolでassertする。製品HTTP/endpoint/configは不変更。

F2は未使用runtime/collisionで新取得、F5もその同一live recordへ拒否対を行う。既configured記録は保持非取得。自己鍵/configは排他作成済み通常file/bytesを照合して正規factory読取だけ再利用し、鍵生成/内容出力/既record書換え0。これなら成功acquireは既configured1＋新collision1＋partial1＋predecessor2＝5、directory4を維持できる。各stage番号、要求/受信件数、最終native一致、server/client socket close、有限result kind/code、child終了をsummaryへ追加する。Managerの再実行許可待ち。

## factory再検証・root初回

上記最小案をManager採用後、test.cache=false/P内cacheDirを適用した。既cache exactは`node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json`、regular/no-symlink/29,375B、factory初回以降mtimeをmetadataだけ観測した。内容read/削除/再利用0、otherへ保守加算。

factory02は6/6、F1の初回成功と合算しない。F2要求1/自己受信1、最終native actualaddress全一致、usable/proofclosed/ACK、stage5、serverClosed true/server/client socket0、execution stop、child90562・両pipe実close/ESRCH。824Bはheader/body部分値であり全wire直接実測でない。累積要求2を256KiB保守計上、configured保持/collisionとpartialの新記録保持。

root01はR2 0pass/1fail/4skip。有限resource summaryは要求5/response close5/listenerClosed true/server0/client0/pending0。child94526・両pipeclose/ESRCH、known runnerもESRCH。fixture Cookieの短い合成値に対して、実`authenticationCookie`が43文字を要求するためcallbackが本人判定前に返る静的原因を確認した。元R2のassert内部値は未取得なので、失敗がそのassertだったという直接実測とは区分。既auth guard/製品意味は変更しない。

Managerは合成Cookieだけ正規43文字へ訂正し、R2各結果boolを保存する案を採用。R4 callbackのCookie/actor/state、R5 picker POSTのJSON途中入力/同origin、R8 fake旧dispatch/fallback pathも公開sourceで静的照合した。既HonoはautoCleanupIncomingのstream wrapperを使い、R5はcancelだけをnativecloseにせずclient.end/response close/server socket closeを別に待つ。R2再5＋未実行R4/R5/R8の5だけ許可され、累積17要求/2.25MiBへ明示拡張。予約単価128KiBは変更しない。新scenario/自動retry0、再失敗/unknownなら停止する。

root01終了時P実量はDB0/material1,171B/other23,885B。観測済みrepo cache29,375Bを別内数として保持。実DB対/前任childは未着手である。

## 最終直接結果

すべて同候補の公開sourceを使用。各最終runは実試験名集合完全一致、fail/unhandled/moduleFailed=0、child exit0/exit+close、両pipe EOF+close、ESRCH、DB専用directory空を確認した。選択外は未実行であって失敗ではない。先行失敗・件数不明・重複再実行を47へ加算しない。

|run label|直接pass|範囲|
|---|---:|---|
|settings-02|2|新D7/D8、旧6は選択外|
|transport-02|12|既driveInput/driveServerFn/driveHttp.nodeの3file|
|factory-02|6|新F1〜F6、初回F1との重複を加算しない|
|root-02|5|新R2/R4/R5/R7/R8、loopback実受信＋application fake|
|application-01|9|新D1〜D6＋旧独立解除/取消/純読取3、旧45は選択外|
|rootdb-01|3|新R1/R3/R6、実DB・前任child・owner回復|
|closure-01|10|既proof/閉鎖10、製品S3所有契約不変更|
|合計|47|新22＋比例25、非重複|

`type-final` → `lint-final` → `format-final` は順番どおりexit0/全自己終了。`git diff --check`成功。公開sourceの型/整形だけでありbuild成功へ拡張しない。

実行入口は新Pの `run.cjs`。引数は `type type-final`、`lint lint-final`、`format format-final`、`unit settings-02 settings`、`unit transport-02 transport`、`unit factory-02 factory`、`unit root-02 root`、`db application-01 application`、`db rootdb-01 rootdb`、`db closure-01 closure`。規定checksは内部で `pnpm typecheck`、`pnpm lint:fix --diagnostic-level=error --max-diagnostics=100`、`pnpm format` を呼ぶ。限定testはinstalled Vitest4.1.6、worker1/bail1/cache無効、TMPDIRとDRIVE_TEST_ROOTを新Pの別専用directoryへ束縛する。

### 修正・接続の確定境界

- factoryは未構成ならDrive資源を作らず、構成時だけ専用config/crypto/provider/execution/runtime ownerを組み立てる。固定production送信先は不変更。構築失敗で取得済owner記録を推測削除しない。
- rootは前任回復・proof保存ACKの確認後に受付を開始する。Drive専用requestは最初のawait前に登録し、quiesceとのraceで未登録dispatchしない。停止は新受付拒否→自己abort→受信task終了とS3runner.stopを監督する。失敗/unknownをDBclose許可にしない。
- launcherはquiesce開始とnative listener.closeを並行させ、両方が成功してから従前のshutdown順へ渡す。body reader.cancel、handler終了、outbound実close、caller保存ACK、native listener/socket終了は別々の証拠。一般requestへの新強制破棄/timeout成功扱い0。
- local解除はDrive config/復号/providerを必要としない。linked/needs-relinkの本人current/command/epoch/CASを確認し、credentials/folderのlocal失効と既owner保持を同Txで扱う。Google SSO/revoke/旧認証を変更しない。UIの解除だけを未構成disabled領域外へ出し、busy/actor/ACK保護を維持する。

### 固定条件・旧影響への適用

|条件|直接根拠|借用・未検証|
|---|---|---|
|A 本人認可|root R2のcallback/actor/cookie形・登録、transport12|実Google OAuth/実SSO/同bundle未実施、既認可意味は不変更|
|B server保存先|factory実adapter構築と自己loopback metadata、既transport|実Drive/Picker/CSP/審査未実施。S3 wire26、S4純型17/persistence20の無変更部分を借用|
|C 冪等/current|application既取消/純読取、rootDBとclosure10のcurrent/owner保存|create/409/親確認の新実HTTP0。既application選択外45は以前の受入を無変更部分へ適用|
|D 独立解除|新D1〜D8、旧解除対、config無し/needs-relink/owner保持|実画面/Google連携解除未実施。実backup取消はP5c-2、autoOFF|
|E 秘密/画面|Settings2＋transport12、callback/picker受信の有限DTO/停止|componentは構造/イベントだけ。390/keyboard実layout・SDK・CSP・実UI未実施|
|F 保存/配備|factory6、root8、closure10、型/規定checks、前任実終了→DB保存ACK|DDL3/authprune8は不変更借用。build/mainboot/actualfresh0038は未実施|
|旧P1-E|Node source boot/stop wiring、launcher順序・有限root停止対|配備済bundle/本体boot/実UI未実施|
|旧P5a-C|既dispatch/fenceとの順序保持、R8 fake旧auth/OpenRouter共存|実SSO/既外部連携の再接続0。P5a-G OIDC/JWKS/pruneは不変更|

S4fixのResult route、S3のcrypto/HTTP/owner実装、domain/repository/UoW/共有portは不変更。音声は未完保留。trashは確認→Google側復元/再選択/新規作成、無断untrash/代替0。明示再連携成功時だけ旧backup取消という利用者決定はP5c-2へ維持し、通常refreshへ適用しない。

## 最終資源・保存

root R2再試験は5要求、secure/issued/repeated/selected/callback/foreignの有限boolすべてtrue、exchange1。R4/R5/R8と合わせ最終root10要求、response close10、server/client socket0、listenerClosed=true。R5は不完全bodyを受信中にquiesceしapplication未到達、reader cancelだけで閉鎖成功にはしていない。factory再試験1要求は最終native optionsが自己actualaddressと一致し、実close/proof/stop成立。

|対象|最終計数・区分|
|---|---|
|HTTP|17試行＝初回F2未確定1＋F2再1＋初回R2の5＋最終root10。保守17×128KiB=2,228,224B≤2.25MiB。824B/11,119B等は一部header/body値で全wire実測ではない|
|自己server|7 lifecycle（F2初回/再各1、R2初回1、最終R2/R4/R5/R8各1）。固定port再利用ではなく各自port0。旧失敗の個別socket未保存は履歴のまま|
|runtime|4directory、成功acquire5（configured1/collision1/partial1/predecessor2）。F5と前任生存中の拒否2は成功数へ含めない|
|前任child|専用1、正常IPC終了→exit0/disconnect/両pipe EOF-close/ESRCH、出力0B。parent restart1。childはDB/HTTP未使用|
|test runner|上記前任と別。最終sealは記録済runner/child計57PID全ESRCH。type1はexit0だが当初pipeclose証拠不全、type2はPID未記録/outcome不明を保持し、全履歴終了証明へ拡張しない|
|DB|新fixture22＝新業務9（D6＋rootDB3）＋既回帰13（app3＋closure10）。逐次active1、各正規finally成功cleanup。失敗DB0/残DB-WAL-SHM0。0038 fixture初期化は本体移行/移行受入再試験でない|
|材料|1,356B、AES2×32Bを含む新自己config/runtime記録保持。RSA0、note/original/assets0|
|other|final-seal込み38,235B＋repo cache保守29,375B＝67,610B≤8MiB。材料とは別。cache内容未読/未削除/未再利用|
|残資源|既知自己child/server/client/pipe/caller/in-flight0、DB0。未知PID/3000/3100/3101の探索・操作0。初期type2の履歴限界は別記|

失敗/準備証跡・自己鍵/config/owner記録・外cacheを保持し、容量のための削除0。自己成功testの専用tempだけ既正規cleanup。最新actualfresh正本 `oMeLTO/final` は非操作・不変更借用であり本rootで置換しない。

## 候補と公開指紋

commitは所有13pathだけ。管理/phase/proof/privateを含まない。2026-09-30 12:50:56 JSTのsealで基点からの所有外apps/packages差0、migration全体/lock差0。commit後tracked dirty0。

正本はcommitと個別bytes/hash。aggregateはJS既定pathsort後、各 `lowercaseSHA256 + '  ' + relativepath + LF` の連結をSHA256したもの。13path aggregate: `f9616e709b5371c921c0d9326db8d012be78d9d1f7cb08f4dcf9b4df58e75fbf`。

|relativepath|bytes|SHA256|
|---|---:|---|
|apps/web/app/components/hollow/DriveSettings.test.tsx|13617|781071b8d65d9e6f060cf239c5c2b8502777ebdaa9aa0edd2f2923e485aaf3f4|
|apps/web/app/components/hollow/DriveSettings.tsx|15221|e1edb1f9a992f4ddcad81fb89b764d13a788e77a92021218cf78ec48f342f589|
|apps/web/app/driveRuntime.node.test.ts|15788|e77c7a7df5121f7d6888c7bc6a70152ef428ee6dca8edf9ce9752945d7d2bc0b|
|apps/web/app/driveRuntime.node.ts|3502|6368f5da96273d5873d3eb21eb0c9b24eb87338dba535e00ae2c6f06f9c0b9ed|
|apps/web/app/presentation/driveHttp.node.ts|6597|c26e4e7d141f8646a8dc8f0e92b7b206be18319660af5e761c8f7f34fd354b29|
|apps/web/app/server.node.ts|26967|df45cbea2c633beb13320d9896384a8cc9553b0b7ca401c1d0fd33dada46bdcd|
|apps/web/scripts/listen.node.ts|3097|67dbfb96f16ec6700ef6988a7fff48e4b4f7237337245b22766940e7dd91d29a|
|apps/web/scripts/nodeShutdown.ts|880|1a0cb8ca559a0b3da0a7e3c1028a84a52d23a970cd69db61de71362a5eb00f6b|
|packages/core/src/adapters/libsql/__tests__/driveApplication.integration.test.ts|71189|af0a1a1a8a05c8d6ea6cb5e16e917bb8ab124c363d2d5954739d770e5790b657|
|packages/core/src/adapters/libsql/__tests__/driveRoot.integration.test.ts|11480|21e467cbd6b1c030b36e4fec86c03faa7abb6eeb6db9ba675ca8e49ee9a194b9|
|packages/core/src/adapters/node/drive/factory.test.ts|13152|c9b8e3fdb740583369b0344a3bd9c85090fc4a49406cc3a8c2a5068aeefed6ac|
|packages/core/src/adapters/node/drive/factory.ts|2412|c44a0602786c0bfd10e311cdef4c818ca63982f65d9f047697d5d739f6b57287|
|packages/core/src/application/integration/drive/control.ts|10560|e6ea7b9c556ddda7de562336fcc54094f058a39998b6624ada0a06eec6c248cb|

不変更0038 SQL33,297B: `d305836ed40bd36d9febf05aaab9c8b1552dbf7b80b23c097110adc428670112`。snapshot382,618B: `653718f0094ce5651e6f6897669c8290446a7af0d2913e6eb3ea3f5fb84944fb`。journal5,762B: `83885ffaf002e254a1f983ec61714e587b06c10dcbad4061a284875484b2e5a8`。旧SQL/snapshot含むmigration全体不変更。

## 独立向け公開helper allowlist

以下4本だけは秘密を含まない公開logicとして全文確認済み、最終lstat regular/no-symlink。基底exactは `/Users/hikaru/.local/share/hollow/verification/p5c1-s5a-20260930-GGvsOF/`。

|exact相対名|bytes|用途|
|---|---:|---|
|run.cjs|6535|開始PID記録/全pipe終了/有限report/容量guard付き単一child runner|
|config.mts|533|installed Vitest設定、worker1/cache無効、新P固定|
|reporter.cjs|1871|実名集合/件数/有限failure投影|
|seal.cjs|4046|公開13path/SQL指紋・既知自己PID/容量・所有外不変更確認|

独立は許可後にmetadata→静的全文read→新rootへ排他copy/adaptする。旧rootで実行しない。fixed Nodeは `/nix/store/4gl9pclv6ygwmgpg1gijza978bqbmpga-nodejs-22.22.3/bin/node`、pnpmは `/nix/store/8m6jlv18xxxzx9idfl2ik1jxpva6ik1x-pnpm-11.1.2/bin/pnpm`。helperのrepo/root/baselineは独立の対象へ適合が必要。fresh独立ではfactory/rootの再試行用 `*-02` labelを使わず、自己key/config/runtimeを新規生成する正規初回経路を使う。test sourceはcommitを参照する。

copy対象外: `config/`、`runtime/`、key/mail/資格値/DB、startmeta/results/final-seal/cache等の証跡一式。合格証跡の複製や旧秘密の流用はしない。新root/実行/fixture生成はManagerが独立へ別途許可するもので、この文書自体は実行許可ではない。

## 返却

既知自己資源の終了確認・候補固定・本書全文EOF再読の後、製品/test/helper/文書を含む全read/write/runを停止して環境所有をManagerへ返す。未回収tool exec0、補助全停止。S5b以後は未着手。歴史的type2の未記録結果、旧F2の接続成立不明は未確認のまま引き継ぐ。
