# P5a Google認証・ログイン方法管理

## 現在の結果

2026-09-27T23:54:10+09:00。P5a実装候補 `6e3401108ead1880e5c0c57aa666e826993321ea` を固定した（正式受入前）。fresh正常0032→ledger33、旧11認証値/62session固定期限・171trigger保持/FK0、全15objects3809Bのmanifest一致。既存owner通常signin/read/signout、隔離同bundle契約UIとGoogle未構成default bootが成功。承認された自己note2/WS1/member3は通常回収し、account5/専用DB/鍵/mail/backupを保護保持。最終影響Node8files94/94、全unit107files1364/1364、全型/規定Biome/build成功。最後のruntimeは23:45:47正常exit0、23:54再確認で全browser/ports/配下handles0・既知自己PID0/foregroundexec0、監督closed。20条件の証拠対応と未検証を下記に固定する。Google/TLS/外部mailは未接続で、条件付き手順はdocs/google_auth_node.md。管理正本/goal API/spec/spec-implement不使用。

## 最終候補・20条件対応

### 固定値と検査適用性

`P/candidate-seal.json` は2026-09-27T23:53:49.403+09:00。製品68path（生成migration snapshot含む）をcommitし、管理文書 `.goal-implement/` はcommit外。製品worktree clean、管理文書は未追跡のまま保持。

| 対象 | 固定値 |
| --- | --- |
| commit | `6e3401108ead1880e5c0c57aa666e826993321ea` |
| source 1171 regular files | `f0a58c7456da53556d26173bd4e719f8913c55801485a12cf323b952848aaeaf` |
| apps/packages 1046 files（test含む） | `36ab6bff301f039de11046249a483b8bb8091485a8cb045f4ffcde68401185e4` |
| server.node.js bundle | `b069f214021c8fc0a6211e8c400c95bea621b9db7b85aec2067e116405e46e61` |
| dist 6964 files | `74a0f7165e25e9d0abf9c80c9b637e5af526399fb0b22fc605c3c2ba512e51de` |
| pnpm-lock.yaml | `613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498` |

sourceはgit tracked/unignoredのregular file集合から管理文書とAGENTS.md symlinkを除き、link先を追わない。各file SHA256、2spaces、repo相対path、LFをsource lexical順で連結してSHA256。distは同形式のen locale順。再現用の全path/hashはP/candidate-source.json、candidate-dist.jsonにある。opaque helper/credential/key/mail/DBはこの製品指紋集合に入らない。最初のsealはAGENTS.md symlinkで安全停止し、除外修正時の構文誤りも出力作成前に停止した。成功した上記sealだけを候補とする。

最新全体typecheck→lint:fix→format→unitはsession23739 exit0。Biome938files/no fixes、既存38warnings/36infos（新error0）。unitは23:49:31開始、107files1364/1364、8.61秒。buildは22:52:48.286生成bundleで、その後の全契約UI/fresh smokeと同一。追加docsはbuild入力ではなく、後続runtime-tree変更はGoogle applicationのtest1pathだけ（P/build-applicability.json）。日時比較だけを唯一の同一性証拠とはせず、製品編集履歴/規定no-fixes/固定bundleと合わせる。

最終B補完は既Google application6→9対。linked subのemail変更優先/同email別sub拒否/交換中password signupの現在分岐を追加。最初9/9の後、全型でtest callback内のoptional session narrowing不足を検出し、nonnull確認後のaccountIdへ局所修正した。最終限定Biome(no fixes)→全体typecheck→影響Node集合はsession70394 exit0、23:51:53開始、8files94/94、35.49秒。旧8files91と9単独と最終94は重複集合で、合算しない。型修正後を含む94が最終Node正本。全unitはこのintegration-only test追加前だが、単体対象/product sourceは不変更である。

選択Node集合はauthSchema14、authenticationMethods14、authenticationPrune3、googleAuthentication9、authenticationHttp4と既hollow/invitations/invitationLimitsの計94。全Node行列ではない。Schema/Methods/Config/OIDC補助の初回根拠は各専用reportにあり、今回主が統合して再確認。config23/nativeOIDC41/execution2は単体1364に含む。補助は最終Verifierではない。

### 証拠区分

- **N**：主の最終Node8files94/94。実自己DB/UoW、HTTP adapter、代替provider等の境界は各testどおり。
- **U**：主の全unit1364/全型/Biome。native OIDC41（loopbackの実request/response/socket終了）、config23（自己鍵/AES）、execution2を含む。実Google/TLSではない。
- **M**：主のclone-v2正常/中途失敗/末尾FK違反3対、fresh0032、停止下premigrate/postmigrate/finalと更なるcopy全旧列/trigger/FK/FTS/objects比較。
- **C**：主の同bundle隔離契約UI。Google/mailはtrusted constructor代替、通常serverFn/callback/fence/DB/UIを接続。新account最大5、WS1/note2だけ。
- **R**：主の同bundle default boot（Google未構成）とfresh既存owner通常signin/read/signout。provider代替なし、実Google開始なし。
- **S**：各補助の専用単体/Node報告。N/Uで最終統合済みの集合は重複計数しない。
- **O**：受入済み不変部分の借用。今回はnullable accounts/sessions/認証導線の実影響に限定し、旧renderer/全worker/全UI行列は再演していない。

| 固定ID | 現候補へ直接適用する根拠 | 借用・未検証の境界 |
| --- | --- | --- |
| P5a-A | N schema14/methods14、M旧認証列・session期限保持/clone rollback、Account union/CAS/UoW | Sは作成補助。別process同一DB競合は対象外、単一writer前提 |
| P5a-B | N Google9、C新規/authoritative/third-party proof/unverified/別sub再認可、既subメール変更と後発signup再評価 | 実Googleのclaims発行/TLSは未接続。provider合成入力をGoogle実成功としない |
| P5a-C | U OIDC41/protector23/execution2、N HTTP4/Google9、C実serverFn遅いSetCookie→signout→拒否、匿名→本人→匿名ABA交換0増分/cookie移植拒否 | HTTP4内bootstrap/legacyはfixture経由。Cは実serverFn/通常UI。全OS/全browser硬保証ではない |
| P5a-D | N methods14、C third-party password/mail proofのGET非消費・別browser拒否・元browser一回、AC02別browser確認のみ成立 | local mailbox/合成provider、実mail scanner/配送は未接続 |
| P5a-E | N methods14/schema14、C same-sub password追加/change/reset/最終方法disabled/Google解除、R他session終了と現在保持 | Google解除はlocal identityのみ。Drive/provider全project revokeは対象外 |
| P5a-F | C入口/result/proof/reset/methods/unknown明示新開始/390keyboard、A→B拒否と元A/B正常明示join、R未構成とpassword維持 | dirty/actor操作guardは既editor離脱契約O＋新operationのroute/actor/revision照合。全dirty中OAuth操作の網羅UI再演は未実施 |
| P5a-G | U有限nativeHTTP/秘密/AAD/期限、N目的/送信間隔/prune/現在fence、C不明再交換なし、docs条件付き実接続手順 | 実Google認証/HTTPS到達/consent/外部mail/別uid権限・TOCTOUは未検証。外部承認と実設定が必要 |
| P5a-H | M最新I→start→premigrate→final、U/N/R/C、候補commit/全指紋/通常回収/正常停止 | 契約account5とprivate fixture/key/mailは退会未提供のため保護保持。全体受入はVerifier/Manager待ち |
| P1-A | M 0032正常/2rollback、旧表値・FK・trigger保持、N型/CAS、R通常boot | O旧schema/worker不変範囲 |
| P1-D | N既hollow認証/私有認可、C2利用者私有note相互拒否とsession移植/欠落拒否、R既存owner | O旧認可全対象行列、不変範囲のみ |
| P1-E | R構成なしpassword継続/default boot、N/U有限停止/期限prune、M停止と保全 | 認証中断の未証明exchangeをboot一括recoverしない。新process排他機構は追加していない |
| P2d-2-E | M旧purge/owner含む全列・FK/trigger、自己通常purge完了/負債0 | O既物理削除故障/旧保全行列。今回は移行保全部分だけ |
| P3f-H | M旧WS/member全列・20scope根拠保持、C自己WS通常回収 | O既WS削除全行列、認証FK保全部分だけ |
| P4a-H | M旧媒体/owner/予約/objects全列とbyte保持 | O既原本/媒体worker不変部分 |
| P4b-G | M旧参照結果/負債/所有全列保持 | O既参照取得/外部identity全行列、今回認証保存のFK保全部分だけ |
| P4c-K | M旧writer/媒体/版/FTS全列・objects保持 | O既編集/隔離生成全行列、今回移行保全部分だけ |
| P4d-2-A | M旧PDF単件request/artifact/owner全列・FK保持 | O既実PDF/UI/寿命。不確定だった過去PDFunknown原因を今回解消したとはしない |
| P4f-1-A | M旧ZIP親/run/attempt等全列/FK保持 | O既HTMLMD ZIP生成/保存形。不変worker再演なし |
| P4f-2-A | M旧PDF binding/holdの全列/FK/triggerと予約0保持 | O既第三需要/copy/実PDF縦接続 |
| P3b-1-B | N invitations/invitationLimits、C A/Bselector取り違え拒否＋元招待正常復帰/明示join、signup招待既存経路 | O既配送/retry/暗号全行列。Googleを招待proofへ流用しない |

### 最終差分・再開・引渡し

最新fresh baselineは **P/final 23:45:47.750** とfinal-comparison/final-details/final-delivery-delta。旧I/P4f2基点へ戻さない。fresh全object manifestは開始一致。差分のclosed ZIPdeliveryはaudit-copy実読取で `01a0e2c8-1c79-76a4-9bd6-695252f0475c` と確認（推測でない）、期限1790511760441に対する既存有限pruneの正当差。新auth_browser_contexts1以外の旧認証値変化はなく、旧session62全行保持。

最新隔離fixture baselineは **P/contract-final-v1 23:42:21.920** とcontract-final-v1-inventory/final-details。account5と専用credential/key/mailを保護保持し、認証値の本文・hashはreportへ出さない。自己note/WS回収はUI不可逆、停止backupを保持。復元操作は実施していない。

独立担当は新private proofへ必要helperを排他copyし、P/Iの証跡へ出力しないこと。契約UIはcontract-server.mjs（trusted factory・local provider/mail）とunconfigured-server.mjs（default boot）を分ける。契約fixtureはroot上限/権限の再確認なしにaccountを追加しない。fresh smokeはfresh-smoke内の既知6helper、既知protected owner fill→通常UIだけ。使用prefix/restore/timeout20000/idle120000、APP_URL localhostとbind127を保持。helper本文/鍵/mail URLの出力・hashを行わず、既知自己PID数値のみを確認する。実Google/mailはdocsの前提承認が揃うまで開始しない。

今フェーズでFigma/外部資格情報を利用・再読・保存・hashしていない。過去ps incidentの値を再取得せず、PID/PPID数値限定を維持した。外部接続の未提供は隠さず、契約検証候補として独立受入へ返す。

### 全停止・所有返却

2026-09-27T23:57:40+09:00のclock実測で最終精算。fresh最終schemaは91表826列（ledger除く）/184trigger/ledger33。候補source1171/dist6964は保存したfile別SHAと再比較して全一致、git状態は管理文書 `.goal-implement/` だけ未追跡。全P配下lsofも出力0、既知runtime/foreground execは全て終端回収済み。主報告235行相当の全文を再読し、最終schema/この停止追記のみを後続追加した。

本追記と確認を最後に、主は製品・test・docs・phase報告・proof・runtime・browser・DBを含む全読取/書込み/実行を停止し、環境と候補の所有をManagerへ返却する。補助は全て返却済み停止中。Managerの明示差戻しまで変更・再起動しない。P5a完了候補であり、全プロジェクト/実Google・実mailの完了や正式受入は主張しない。

## 2026-09-27T23:47:34+09:00 未構成・通常回収・fresh移行とsmoke

### 同bundleの未構成と自己通常回収

最初の契約runtime95003は全7自己browser名の通常close後、23:34台にSIGTERM→exit0。fresh監督closed/ports0/自己contract全handles0。`contract-checkpoint-v1` は23:35:06.767、13files4,880,357B、objects0。private DB/identity/key/mailを排他copyし、秘密の本文出力やhashは行っていない。

新 `unconfigured-server.mjs` は同bundleの `boot()` を引数なしで使用し、authenticationFactory/mailerの代替注入なし、Google設定なし、自己local mailboxだけを明示。PID11004はsigninで「Google認証は現在設定されていません。通常のパスワード認証をご利用ください。」、Google button0を表示。alphaの現在passwordで通常signin→方法画面、通常「他のセッションを終了」の実confirm全文照合→acceptにより旧alpha sessionはsigninへ、現在sessionは方法画面を維持。通常停止exit0後の `contract-before-delete-v1` は23:37:08.724、13files4,979,237B/objects0。

更なるcopyの `contract-before-delete-v1-inventory.json` は自己account5、note2（各title+HTML62B）、WS1/member3、original/asset/activeowner0/FK0。初回auditはobject_writesの存在しないstate列で失敗し出力なし、client.close済み。実sourceのactive=1へ訂正し新audit-v2 copyで成功した。失敗copyは保持し、v2だけを正本とする。

Managerが利用者へ説明後、次のexact対象だけを通常UIで回収した。

- alpha note `01a0e33f-1521-71c0-a8c1-e8c4ec1ddfed`。
- gamma note `01a0e33f-cf33-7589-b14e-b3ee80f1526b`。
- alpha WS `01a0e339-843f-773b-9708-689ce044bae9` とそのmember3。

PID11575のdefault bootで各ownerの通常trash→完全削除。各dialogの対象名/不可逆説明を読み、確認checkbox→実行。WSは当該名前を入力し通常削除し、UIで保存データの回収完了/0ノート、note未完了0を確認。raw DB削除/手動object削除なし。通常停止exit0後 `contract-final-v1` は23:42:21.920、13files5,477,757B/objects0。別copy監査でnotes0/member0/activeWS0、当該WSのdeleted最小shell1、original/asset/activeowner0、未完了purge/WSdelete/purge_objects各0、FK0。account5/session5/Googleidentity5/browsercontext8は専用認証fixtureとして保護保持し、領域全削除/未提供退会は行っていない。

### freshの0032と既存password

freshは契約DBとは別。23:38:45.630監督closedと全handles0の後、`P/premigrate` を23:38:46.187に排他保全。全15/3809B manifest `95141ec6059bf8f9d58ed8cd27df98131e458d76394c5fdf5576aec2a29213f3` はI/finalおよびP/startと一致。premigrateの更なるcopy監査では旧87表780列の値差0/171trigger全一致/ledger32/FK0。

検証済み通常 `apps/web/scripts/migrate.node.ts` を専用停止connectionで実行しexit0。既存 `.env` を読み込むCLI引数は使わず、fresh exact DATABASE_URLだけを明示した。23:39:14.103のpostmigrate保全と別copy監査はledger33、旧87表780列のmissing0/added0、旧171trigger全保持（総184）、accounts nullable/auth_versionとsessions新browser列の構造差だけ、FK0/旧ledger欠落0。objects全manifest不変。固定clone-v2の正常/途中失敗/末尾FK違反3対と合わせ、復帰FK ONとschema/data/ledger原子性の根拠を分ける。

既知Verifier引継ぎの6helperを新 `P/fresh-smoke` へ排他opaque copyし、旧本文/hashの追加読取なし。新固有session `p3c-fresh-p4c-anon-p4f2-p5a-owner`、restore/timeout20000/idle120000を維持。既知保護account helperのowner fillだけ→通常UI submitでnotes到達→login-methodsのpassword設定済/Google未連携をboolean確認→通常signout→同保護画面signin拒否。新account/旧11のpassword・方法変更は0。runtime12202/session94907は23:45:47.066正常exit0/systemErrors0、browser通常close・全fresh handles0・監督closed。

`P/final` は23:45:47.750、全15/3809B/manifest開始一致。別copyの `final-comparison.json` と `final-details.json`（23:47:34.288）でaccounts11/notes103/member15/activeWS9、personal11と合わせ20scope、FTS8253 term/doc対、sessions62全legacyNULL・旧expiry全一致、Googleidentity0/authVersion1が11、旧認証列全値不変を確認した。新browsercontext1は通常signin/signoutの正当deltaで、session自体は通常signoutで削除済み。旧87表の全列差はclosed ZIPdelivery1の期限pruneだけ。基点rowはstate=closed、created_at=1790511160441、expires_at=1790511760441で起動前に期限経過済み、既存zipDeliveryRepository.pruneのclosedかつexpires_at<=now条件と一致する。旧row全一致とは記載しない。activeowner/未完了purge/WSdelete/purge_objects各0、FK0。詳細helper初回はverifiedという誤列で失敗・close済み、verified_atへ修正した最終出力が正本。

### 最新検査と残作業

23:43:07開始、影響Node集合8files91/91（35.71秒、session78871 exit0）：authSchema/methods/prune/googleAuthentication/authenticationHttpと既hollow/invitations/invitationLimits。各testは自己DB/契約portの根拠で、Google実接続ではない。23:52ではなく前節記載の22:52全unit1364・buildと取り違えない。製品sourceはそのbuildから変更しておらず、追加は運用docsだけ。

`docs/google_auth_node.md` に明示設定/専用鍵、通常bootと代替DIの区分、外部承認・test client・実mail adapterを前提とする条件付き実接続手順、秘密非出力、unknown時の新開始/非再交換を追加。Google/TLS/consent/実mail未検証を明記した。最終type/lint/format、20条件の最新/借用/未検証対応、candidate commitと指紋を残す。全操作停止handoffまでは報告編集だけでなく最終check実行が残るため、現runtime0/exec0を最終返却とは扱わない。

## 2026-09-27T23:32:35+09:00 正常招待・私有認可・実UI ABA

23:18節以降も製品source/bundleは変更していない。同じ隔離契約runtimeと通常UIで次を確認した。

- A開始→Bcookie競合の拒否後、guestは元Aの通常招待linkへ戻り、明示「参加する」でviewer参加。別deltaはBから通常Google開始→完了→元Bへの継続→明示参加でeditor参加。WS1/member3（owner含む）となり、OAuth完了だけでmembershipを作らない。競合拒否の根拠と正常joinの根拠を分ける。
- alpha/gammaが各1件の私有personal noteを通常UI保存。相互の通常note URLでは「表示できませんでした」、相手の本文検出false。本人の通常URLでは本人本文true。媒体/WS noteは追加していない。
- 別自己browserにalphaのsession cookieだけを秘密非出力helper内で移し、異なるbrowser contextのまま通常note URLを開くとsignin。sessionとbrowser cookieの両方があることはbooleanだけで確認。さらに当該browser cookieだけを期限切れにしてもsignin/私有本文false。正当なalpha元browserは引き続き本人noteを読め、他browserのDB sessionを破棄していない。最初のhelper cookie setterはCLI expiry引数不一致で適用前に拒否され、値非出力で局所修正した。これは製品失敗ではない。
- betaは通常signup後の未確認状態でauthoritative claims契約入力のGoogleを試し、AUTH_UNVERIFIED/継続なし。別browserで通常確認mailのGET→明示POSTを完了しても、そのbrowserはsigninのまま。betaが明示的に新Googleを開始した後は追加proofなしで完了。実Googleのメールauthorityを検査した根拠ではなく、型付きprovider契約の分岐検証である。
- Google開始を保留した同browserの別tabで通常password signin→通常signoutを行い、匿名→alpha→匿名の後に旧callbackを返した。結果は安全な競合/継続なし。自己provider exchange件数は4→4で、古いcodeを交換していない。starts5は新開始数であり成功数ではない。

自己accountはalpha/gamma/guest/delta/betaの5、WS1/member3/note2。ownerという未使用credential labelはaccount未生成。秘密値/URL/本文を証跡へ出さず、制御helperがboolean/件数/安全文面だけ返した。通常mail/Googleはlocal代替、外部送信0。次は7つの既知自己browserを通常closeしruntime正常停止→保全、未構成の同bundle表示とfresh0032/旧比較を進める。fixtureの削除はexact対象量と停止下backupをManagerへ通知するまで行わない。

## 開始保全

最新比較元は `I=/Users/hikaru/.local/share/hollow/verification/p4f2-independent-20260927-jlNBt1/final`（21:18:20.497）。旧P/Jへ戻さない。新専有 `P=/Users/hikaru/.local/share/hollow/verification/p5a-auth-20260927-1XyLi2` は0700排他作成。公開安全helperだけをcopyし、この新Pだけへ出力した。

- 21:48:49.455 `P/check-stopped.cjs start`：監督closed=true、exit0。fresh全配下lsof出力0（exit1は該当handleなし）、ports3000/3001とDB/sidecarはpreserveでも確認。
- 21:48:59.544 `P/start`：全15files3809B、manifest `95141ec6059bf8f9d58ed8cd27df98131e458d76394c5fdf5576aec2a29213f3`。I/finalと一致。通常旧12objects3107Bとruntime3files702Bを区別する。
- 21:49:28.794 `P/audit.cjs start`：I/finalとP/startを更なるaudit-start/before/afterへcopyしてdriver-open。旧87表780列・171trigger、全旧列値差0、ledger32/旧ledger欠落0、FK0。backup本体/freshは監査driver未open。任意本文/認証hash値の出力なし。既helperのpdf_computes空shapeは旧誤名で全表比較に影響なし。
- 開始HEADは `ec6a64669419e4407c3935be9c70825bda059ec8`、製品clean、未追跡.goal-implementを保持。source/bundle/dist/lockの受入値はP5a-proposal冒頭/Manager最新引継ぎ、開始時全指紋の再採取は未実施。

## 21:57 基盤変更・clone原子性

実変更は `domain/account/entity.ts` と新authentication型、`adapters/libsql/authSchema.ts/hollowSchema.ts/schema.ts`、`repositories/accountRepository.ts/authenticationRepository.ts/authBrowserRepository.ts`、UoW定義/配線、`application/account/verifyEmail.ts`、0032 SQL/meta、Node migration runner。

- password-only/Google-only/bothをAccountのunionにし、authVersionを持つ。汎用saveはinsert-only、確認更新はmarkVerifiedへ分離。既存hashを空/架空値へ変換しない。
- 4新表/nullable session browser列、最後の方法・immutable identity・単調browser epoch・session初期束縛・生存context削除拒否triggerを追加。専用methods CASとbrowser ensure/advance/bindLegacy/pruneを同UoWへ配線。
- 共通findSessionはbound sessionの現在browser epochをJOINで確認し、旧null legacyを従来どおり返す。ensureは既存epochを更新しない。実HTTP bootstrap/遅いcookieの成立はまだ未確認。
- 21:53台の最初の全体 `pnpm typecheck` はexit0。これは後続2repo追加前の根拠。schema/CASの限定補助は新authSchema.integration.test.ts＋専有報告だけ、製品非編集・独立Verifierとは別役。

### 移行実行の固定版根拠

固定 `@libsql/client 0.18.0` の公開 `Client.migrate` を使用する。`packages/core/node_modules/@libsql/client/lib-esm/sqlite3.js:287` からの実装は1接続をpoolから専有し、Tx外 `foreign_keys=off`、BEGIN、全statement、COMMIT、finally未終端ROLLBACK＋`foreign_keys=on`＋接続返却。`drizzle-orm/libsql/migrator.js` はschema SQLとledger INSERTをまとめ、`libsql/session.js:48` は公開client.migrateへ渡す。内部APIを呼び出す実装は追加しない。

0032末尾に一時CHECK guardへ `pragma_foreign_key_check` 件数を挿入し、schema/data/ledgerと同Txで違反をrejectする。Node runnerはfinally FK ON/再check/closeを確認し、URLやdriver原因をログへ出さない。全migrationへ新たなFK緩和を加えていない。生成器が新列を旧SELECTへ含めた箇所は適用前に旧accountへ1、旧sessionへNULLを明示して修正した。

`node P/clone-auth.cjs clone-auth-v1` は21:54:47.591、exit0、`P/clone-auth-v1/results.json`：

| 対 | schema/data/ledger | FK/旧データ |
| --- | --- | --- |
| 正常0032 | ledger32→33、新4表 | FK ON復帰、FK0、旧全列差0/171trigger保持 |
| 中途SQL故障 | schema/data/ledger rollback、ledger32/新表0 | FK ON復帰、FK0、旧schema/全列/trigger一致 |
| 末尾FK違反 | CHECKで失敗し同rollback、ledger32/新表0 | FK ON復帰、FK0、旧schema/全列/trigger一致 |

cloneの88表783列はledger1表3列込み。開始監査の87表780列と混同しない。各cloneはP/startから更なる排他copyだけを開き、finally client.close済み。旧password/session値はメモリ比較だけ、値/個別hashは出力していない。freshへの0032適用はまだ行わない。

P1-A/D/Eの実影響はManagerへ通知済み。旧migration保全条件は該当ID/直接理由を別途整理して通知し、予定だけで全過去条件を再openしない。次は4repo完成・schema/CAS小対、有限password/OAuth port、browserのHTTP契約へ進む。

この時点でruntime/browser/外部OAuth/mail/既存11account方法変更0。未提供退会の専用fixtureを勝手に削除しない。

## 22:07 4repoと現在context

GoogleAuthAttemptRepository/AccountChallengeRepositoryを追加し、4repo全てUoWへ接続した。attemptはstate unionのencode/decodeとversion CAS、challengeはpurpose別一回消費/再送時前世代失効、各prune100上限。actor/browser contextのcapture/現在比較/session遷移をapplicationへ置いた。password signInはhash検証をTx外へ移し、後続短Txで現在hash/authVersion/throttle/contextを再確認する。Node認証hash実行2/queue0、Google交換4/queue0/10秒signalの専用実行adapterを追加したが停止配線は後続。

全体型は最初の2repo追加で既ownership fake2pathの未使用getter不足を検出、同じthrow getterを追加して修正。その後4repo/補助test/現在context/signInを含む全体typecheckは最終session76507 exit0。さらに後から作成したsecretProtectorはまだ型/動作未検査。失敗回を成功件数へ含めない。

補助 `P5a-schema-tests.md` は21:59:38 JST、14/14（2.37秒）、限定Biome成功、自己DB/FK0/close/unlink・exec0/全停止/所有返却。実方法CAS/最後の方法trigger/stale save拒否、Google-only正規作成/一意、browser ensure/advance/legacy session、pending形/10分/reauth期限を限定確認。補助静的指摘でreauth proofExpiresAt NULLがSQLite CHECKのUNKNOWNで通る点を主がIS NOT NULLへ修正した。この1CHECK差はclone-v1後なので最終clone再確認対象。

旧保全の再確認対象はP2d-2-E/P3f-H/P4a-H/P4b-G/P4c-K/P4d-2-A/P4f-1-A/P4f-2-Aの追加migration旧列/FK/trigger保持部分。accounts/sessions再構築が参照元note/profile/PDF/ZIPのFK保全へ直接影響するためで、旧worker/UIの不変大行列へ拡大しない。P1-A/D/Eと合わせ旧11＋新8が現在対象。

Google実adapter補助は新auth/googleOidc.ts/.test.ts＋専有reportだけ、固定port/既存library/公開fetch注入/実ネットワーク0。主がprotector/usecase/環境を所有し、独立Verifier枠を保つ。両者ともfake providerを本番env/routeへ追加しない。

## 22:16 OAuth/applicationと通信所有の修正案

22:07:23、schema14＋既存hollow認証/私有note15の合計29/29が成功（6.88秒、73498 exit0）。22:12:00、新Google application6/6（1.65秒、93126 exit0）：新規Google-only/既存third-party proof前非login/authoritative link/既unverified拒否/交換unknown一回・scrub/開始後browser ABA拒否。いずれも自己DB＋代替providerで、実Google/実HTTP/ブラウザの根拠ではない。

主はOAuth開始/交換CAS/採用分岐と第三者password/mail proof、方法追加/変更/解除、reset、専用AES-GCM protectorを作成中。4repo含む前回全型は成功だが、後続google.tsのIdGenerator名とproof state narrowingを型検査で検出・修正したところで、最新全型再実行は残る。メソッド/PDF/UI完成は主張しない。

補助の初案は固定gaxios/node-fetchでsize消費拒否まで34対成功、loopback2対はfinallyabort後のbody close待機5秒で失敗（22:13:07、36対中34、7164 exit1/自己回収/exec0）。上限rejectを通信終了と混同しない。この失敗によりManagerはHTTPだけ専用native https.requestへ切り出す局所案を採用した。GoogleOidc port/既OAuth2Client認可URL/公開署名検証は維持し、新依存なし。固定token/cert HTTPS、agent:false/retry0/redirect0、Content-Encodingはidentityのみ、bounded unknown JSON。request/response/自己socketのcloseを初期登録し、全経路destroy/実close await後だけ外側HTTP4枠を返す。trusted test factoryだけ自己動的loopbackへ差し替え、環境/本番env/routeへ任意URL入口を作らない。

新auth/googleHttp.tsを補助所有へ追加し、3製品path＋自報告に限定。修正版はまだ未実行。主は依存しないmethods/proof/resetとHTTP/UIを進める。fresh/runtime/browser/外部Google/mail0、全検査execは終端回収済み。次22:31を目安に具体進捗を報告する。

## 22:33 native通信修正版・browser入口・追加本人確認

補助 `P5a-oidc-adapter.md` は22:23:21、40/40成功（433ms）、3製品path限定Biome成功、全自己loopback/request/response/socket終了・exec0/所有返却。最初のgaxios34成功/2close失敗とは別の修正版根拠である。主の全体型46183はexit0でnative修正版とpassword/signup/verifyEmailのHTTP呼出接続まで含む。22:24:56、schema14＋Google application6の20/20（2.44秒、81674 exit0）が成功。追加0032のstate/元binding immutable/challenge guard、正規reauth modeで作るschema fixture、0032 snapshotのproof非NULL整合を含む。前のclone-v1へこれらの成功を遡及させない。

主はGET tokenless result、begin/proof/methods/reset server functions、callback専用GET→303を追加中。password/signup同browser verification・招待即時signupのsession発行はepoch更新と同Txへ統一。P3b-1-Bは認証導線だけ実影響としてManagerが再open、旧12＋新8の20条件となった。Google callbackの確定したtyped業務拒否は採用Tx rollback後の別短Txでfailed/PKCEscrubへ収束し、DB/運用faultを業務拒否へ偽装しない。

bound sessionはfindSessionの現DB epoch確認だけではcookieの別browser移植を拒否できないため、採用済Node共通fetch入口でbrowser cookie hashも確認する。不一致は当該requestのsession cookieだけを匿名化し、他browserのDB sessionを削除しない。既存Origin/resource guardを先に維持し、その後ページ/RSC/serverFn/resource/callback全てに同じfenceを通す。legacy NULLは互換、最初の認証操作で現在browserへ一回bindする。実HTTPのcookie喪失/移植/遅いSetCookie/並行bootstrapはまだ未実行。

root照合で、補助のno-cache/no-store/無効max-ageを一律拒否する挙動は元契約より強いと判明。取得した新しい証明書は当該fetchの検証素材として利用し、保存/reuseはしない局所修正と小対を主が追加した。期限切れ保存cacheへのfallback禁止は維持。この後続差分は40対成功後の未再実行である。

boot recoveryの既存排他はstorageDirectory単位で、同DBを別storageDirectoryの別processが使わない証明ではない。採用条件に従い、全exchangingを一括failedにするrecover port/接続は追加しない。中断試行は結果未確認として同code再交換禁止、固定10分でscrub/prune、旧結果の採用はepoch/actor/authVersion/期限でfenceする。期限を実HTTP終了証拠にせず、現在processの4枠は実Promise/3所有close終了まで保持する。

次はmethods/proof/reset14対の結果、現在型/局所HTTP対、60秒有限pruneとruntime停止配線、UIへ進む。補助は新 `__tests__/authenticationMethods.integration.test.ts`＋専用報告だけ、HTTP GET非消費/実Google/共有環境は非対象。現在主exec0、補助の限定Nodeだけが実行枠を所有する。fresh/旧proof/11accountsの認証変更0、秘密/外部0。

## 22:53 HTTP fence・有限回収・現在checks

- methods補助14/14（22:30:42、2.68秒）とconfig/protector補助23/23（22:42:51、335ms）は全文報告確認、自己DB/keys/tmp回収・exec0で返却済み。型も現在全体成功へ含む。第三者mailのHTTP GET非消費は補助対象外で実UIへ残す。
- 証明書非cache修正の41対は22:35:51成功。さらにnative JSONの不正UTF8をfatal decodeで拒否し、22:51:11にOIDC41＋config23＋execution2の66/66、472ms、exit0。最初のgaxios失敗とnative修正版40、main後続41は同対の更新で重複加算しない。
- 22:43:20のHTTP4対は自己loopback＋実DB/UoWでproduction callback/fenceを使用。bound cookie無し/別browser/重複cookie、実303と遅いSetCookie、並行bootstrap/legacy初回bind、callback不正shapeを確認。bootstrap/signoutのfixture routeはapplication直呼びであり、同bundle serverFn/UI実証とは分ける。
- browser cookieは新規発行時から固定30日、既存cookieへensureでSetCookieを再発行しない。DB contextのretainだけをensure時now＋30日へ延ばして生存cookie中epochの消失/再生成を防ぐ。session固定30日・attempt固定10分を延長しない。
- 採用どおりauthBrowsers.pruneは新bound sessionのexpiresAt<=nowだけを先に物理回収し、残budget内で参照0/retain<now contextを回収する。合計limit100、旧NULL legacy行は対象外。22:47:14、HTTP4＋prune3の7/7（1.74秒、48399 exit0）：生存cookie/現在epoch保持、bound期限境界とlegacy不変/合計budget、次tick収束、exchanging固定期限後pruneを確認。失効判定は既存current epoch/expiryで即時、物理削除は後続pruneと区別する。
- 規定全体checksは最初のlint17errorを修正した後、今回35158でtypecheck→lint:fix→formatがすべてexit0。938files、修正0、既存38warnings/36infosは残る。途中94321の型失敗はHTTP fixtureのHono ServerTypeをinstanceof Serverで絞る修正後に解消。unsafe fixは適用しない。
- runtimeはGoogle設定不正なら非提供を安全booleanで投影し、通常password/mailを維持。trusted constructor DIだけ代替provider/mailを許容し、本番env/HTTP fake入口なし。停止時は受付503→auth timer停止→HTTP/hash実Promise終端→後段終了。実shutdown/UIはまだ未実証。

主/補助exec0、runtime/browser0、fresh未移行。次は最新cloneとbuild、専用空DB/保護鍵/最大6accountの契約UI準備へ進む。外部Google/TLS/実メールは未接続、既存11accounts認証変更0。残見込みは契約UI・既存保全・統合固定を中心に6〜10時間＋独立別。

## 23:04 最新clone/build・同bundle契約UI初動

この節と先頭を当初23:07と記したのは時計未照合の誤記。Managerの23:04:28実測指摘後、主のclock 2026-09-27T23:04:49+09:00で見出しを訂正した。各検査自体の実行時刻/根拠は変更していない。

22:52:33.971 `P/clone-auth-v2/results.json` は追加guardを含む最新0032で3/3。正常ledger33/新4表、途中SQL・末尾FK faultはledger32/新表0、旧全列値/171trigger保持、FK ON復帰/FK0。22:52:34の全unitは107file/1364対成功、8.85秒。その後同exec7345でbuild成功/exit0回収。規定checks35158・66限定対から製品source変更なし。

`P/contract` を0700排他作成、DBは完全空から通常最新migrationでledger33/account0/FK0。6identity分の合成資格情報は0600 private file、専用PKCE/招待32B鍵を別fileにし既鍵流用0。現在作成済みaccountはalpha1だけ、WS/note/media0。DB/鍵/資格情報は認可済み保護保持であり削除しない。contract launcherは同dist bootのtrusted factory/mailerだけを差替え、製品env/HTTP fake入口なし。3001の明示「実Googleではない」認可/メール画面はproof専用。state/code/nonce/URLは専用helper内だけ、browser出力は既知合成秘密・URL/opaque/emailを除去する。通常launcher/実Google/TLSはこのUI根拠に含めない。

初回runtime81421/session5302でsignup→元browserメール確認→notes→methods→通常signoutが成功。初回Google1要求だけはhelperが公開GoogleClaims.subjectへ誤ってsubを返したため採用Txが成立せず、結果未確認のまま。製品補正・同code再交換は0。自己browser通常close→現在PID/PPID確認→TERM1回→closed/exit0、PID不存在/ports0/契約root handles0、23:00:52監督closedを確認。helperを型付きcontractClaims:GoogleClaimsへ分離し、subject/Date/有効期限の局所shape確認後に再起動した。

現在runtime84532/session14312、browser `p5a-auth-alpha` と `p5a-auth-alpha2`。実UIの新要求では既存第三者メール→追加proof画面、proof前 `/notes` GETは/signinへ戻る。通常password proof POST後だけ完了/両方法表示へ進んだ。別browserで通常password signinした後、元browserの通常password変更が成功し、元画面に固定expiry維持の説明、他browser reloadは/signinとなった。Google解除の実confirm全文を照合して通常accept、Google非連携・最後のpassword解除disabledへ収束。原callbackの再交換や直接DB認証変更は行っていない。

次はmail proof GET非消費/元browser、Google-only同sub reauth、新しい認証の明示開始、招待selector/390keyboard、同bundle遅延response境界を進める。fixture account上限6/WS1/note2以内、fresh/外部/旧proof変更0。既helper誤りを製品障害や認証成功へ読み替えず、起動2回の根拠を分離する。

## 23:18:54 追加proof・Google-only・実SetCookie fence

以下は同22:52 build、専用空DB、代替Google port＋製品cookie/HTTP/serverFn/UoW/暗号処理の契約UIである。実Google認可/実メール/本番資格情報は使用しない。

- alphaのGoogle解除後に第三者Google認証を明示開始。google-link mailのGETでは/notesは/signin、別browserの確定POSTは拒否。その後元browserで同じmailのGET→明示確定POSTだけが成功し、/notes取得可となった。誤browser POSTがconsumeしたとは扱わない。
- gammaをGoogle-onlyで作成。方法画面はpassword未設定、最後のGoogle解除disabled。390pxの実画面scrollWidth<=innerWidth、本人確認buttonへfocus→Enterで開始。別linked subでは拒否/新password input0、改めて同subで新flowを行うとpassword追加画面となり明示POSTで両方法へ。
- 別browserからgamma resetを申請。secret URLのGETだけでは元gamma sessionで/notes取得可、明示新password確定後の元browser reloadは/signinへ。resetがリンク閲覧だけでconsume/session失効したとは扱わない。
- 代替providerの交換結果不明を1件注入。安全な『同じコードは再送せず、新しい認証を開始』説明を表示。reload前後の交換件数6→6、明示新開始後のみ7となって通常完了。初回helper誤りとは別に意図したunknown境界で、外部ACKの実障害を再現した主張はしない。
- runtime84532は自己browser3通常close→TERM→session14312 exit0/closed、契約root handles0/ports0、23:12:55.471監督closed。その後proof-only応答gateを追加して95003/session38196で再開した。製品source/dist変更なし。

### 同bundleの遅いSetCookie

Manager承認のgateは自己launcherが次の実POST/session SetCookie応答1件だけを保留する。製品boot.fetchの処理/Tx完了後、返却Responseを改変せず待つ。armから30秒で自動release、shutdownでも必ず解除、当該対はmanual release/expired=falseであり経過msの精密計測は行っていない。

同browserのt1に既存方法画面を残し、t2の通常signout→password signinを実UIから実行した。gateの`held=true,matched=1,released=false,expired=false`を観測してからt1の通常signoutをクリックし、/signinへ収束。release後、t2も/signinとなり、/notesと/settings/login-methodsの実GETはいずれも/signinへredirectされた。専用cookie-presence helperは値/個別hash非出力でsessionCookie=true/browserCookie=trueを観測した。cookieが消えたためでなく、DB epochとbrowser bindingのserver fenceで旧SetCookieの復活を拒否した根拠である。最終gateは`matched=1,released=true,expired=false`。非holdの通常signup/password/Google/proof/reset成功とは区別する。任意resource全行列は未再演。

現在はalpha ownerでWS1を通常作成しguest/deltaの招待2件を通常受付。guestの招待AからGoogleを開始し、同browser別tabでBを開いた後にA callbackを完了すると、結果画面は競合/continue link無しでBへ付替えなかった。ownerのメンバー更新後は本人1だけ。Google新規guestのaccount/session作成とWS membership追加は別で、無断join無し。正常招待joinの後段は継続中。正確なID/最終件数・物理量は停止下監査で後ほど固定する。
