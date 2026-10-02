# P4c 公開・発見とプロフィール

担当 implementer_resume。P4c-A〜Kと実変更先行20条件の自己完成候補。項目索引・固定・安全引継ぎは末尾。独立受入は未実施でManagerへ返す。全体goal/管理正本はManagerが所有し、spec/spec-implementは使用していない。

## 2026-09-20T00:52:42+09:00 開始と共有境界

最新brief全文、designのP4c採用節全文、固定plan11条件全文、SH/DS全文、AC-07/WS-07〜09/EX全文、CLAUDE規約と独立P4b報告全文を照合した。準備案より採用正本を優先する。現在は全製品・検証環境を主担当が単独所有する。補助は未起動。

新private proofは `/Users/hikaru/.local/share/hollow/verification/p4c-public-20260920-FBjuZk`。00:51:42.898に開始保全を作成。事前ports3000/3001とfresh DB/sidecarsのhandlesなし、製品worktree clean。start DBは独立P4b final DBとcmp一致した。唯一保全DBへdriver直結していない。旧12objects3107Bを保持し、lock/秘密/keyは複製・hash・出力しない。

- HEAD `6539a61e4852dd08cf52a85c451c5d4aed867bc8`
- source920 `72f6a7d05485315e5c6d86e45aa75008b39251af878adc7fc6352d296bd73083`
- bundle `88376b6014a32e0907f575f859fdf6642d0177a15359356c6631f6a8013ee278`
- lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`

独立基準の103active notes/31tags/9originals/2assets/111revs/95heads/activeWS9/member15/batch19/48/51/12scope charge/FTS8253、deletedWS11、profile unset/version12を保護する。新自己PurgeQueued未処理1は通常worker対象で、未完物理回収とは扱わない。環境はまだ起動・移行していない。

### 実装前の具体port/schema

採用五責務を新 `publicationSchema.ts` と新migrationに置く。既存name/sharing/WS行は書き換えず、次の最小repoをHollow UoWへ明示追加する。

| repo / table | 最小形と実接続 |
| --- | --- |
| PublicNoteRepository / note_public_identities | note ID PK+FK cascade、public ID unique、URL世代1、access epoch0、発行日時。初public同Tx発行。sharing public INSERT/UPDATE時のidentity必須、発行後ID/URL世代不変を新triggerで閉じる。access epochだけ公開解除時に進める。note purge時のcascadeとrollbackを隔離対で確認 |
| PublicProfileRepository / account_public_profiles | account PK/FK、nullable unique handle、bio、nullable icon pointer、profile version。名前は既存displayNames repo。合成commandはnameVersion/profileVersionを同Tx照合。handle解除のpublic数はtrashも含む現在個人所有をSQL集計 |
| ProfileIconRepository / account_profile_icons | account FK RESTRICT、operation ID、元session hash、profile確認版、入力bytes/MIME、storage key、予約/実bytes、出力sha/dimensions、awaiting/processing/writing/ready/cleanup、期限/次試行。秘密hashはDB内のguard専用、UI/logへ返さない。profile-icon-upload ownerでregister/publish/adoptを現在session/profileと照合、cleanupは実close/remove証明まで行と課算を保持 |
| WorkspacePublicationRepository / workspace_public_settings | WS PK/FK、pagePublic、独立version。欠落はprivate/version0。現在owner/active/slugとsettingsVersion/publicationVersionを同Tx照合。一般slug解除guardとWS回収へ接続 |
| PublicDiscoveryRateRepository / public_discovery_rates | browser/global固定window、subject hash、attempts、期限index。30/300毎60秒、返金/延長なし、100行prune。認証付きapp検索とは別request/DTO/1枠16待機3秒へ接続 |

個人iconは既存画像processorを共用し、WS repo/policyは流用しない。使用量unionへ個人予約/ready/debtを明示追加する。元session失効やprofile OCC変更では新採用を拒否し、物理writer終了は期限だけで証明しない。新owner kindを既存object guard/cleanupへ接続する際に具体的な先行影響を報告する。

public readとpublic検索はcurrent-publicの専用application/read adapterとし、既存app認証をoptionalにしない。外部HTML/媒体は現安全renderer/current reference境界を再利用し、採用前再照合を維持する。public exportは採用どおり/s/export-publicの形式選択GET→POST→303→nativeGET、既存nonce/hash/rate行を維持する。root cookie/2bucket/bridgeは作らない。

実装順はprofile/identity/WS基盤→icon物理所有→public read/SSR→public検索/sitemap→public export/全UIと異常系。初期完成候補は開始から8〜12時間、独立検証は別。保全以外の製品実編集はこの記録時点0、先行reopen提案はまだない。具体port/schemaの採用逸脱は現時点なし。clone移行・各機能・test/build/実UIは未実行で、未検証のまま残す。

## 2026-09-20T01:04:06+09:00 基盤実編集

新domain profile/publication型と五repo port、application/publication DTO、libSQL五repo、新五表を追加し、application/execution/hollowUnitOfWork.ts と adapters/libsql/hollowUnitOfWork.ts/schema.ts へ接続した。新0027_panoramic_komodo.sqlだけを生成し、旧migrationは未変更。identityの単独DELETE禁止（note存在時）、ID/URL世代不変、public sharingのidentity必須、別account/非ready icon pointer禁止、参照中ready object変質禁止、WS page公開のactive/slug guardを新triggerに置いた。正当note purge cascadeは次の隔離対で検証するため、現時点で成立済みとはしていない。

先行実影響は P2d-2-E / P3f-H / P4a-H / P4b-G の新migration・UoW・旧schema/trigger保全責務（具体既存pathは上記3file）。sharing/settings・capacity・writer・read・UIの既存実編集はまだなく、その条件を一括reopenする提案ではない。Managerの採否を待つ。

最初の局所Biomeはbioの制御文字regexを6診断として検出し、コードポイントの明示検査へ修正した。最初の全体typecheckは既存coordinatedObjectStorageの明示fake UoWに新五repoがないTS2739の1件で失敗。新型の隠蔽ではなく当該fakeへ未使用repo sentinelを追加し、再実行予定。他の製品型エラーはこのrunでは出ていないが、全体成功とはしない。clone/test/build/実UIは未実行、freshはledger27のまま・runtime停止を維持。

Manager承認後、p3f_prepareへ新components/publication/**だけを専有委譲した。ProfileEditor/WorkspacePublicationPanelのpropsとserver DTOを固定、actor ID+epoch/currentActorとoperation/mount guard、dirty通知、ACK不明の明示GETと入力保持を渡した。補助のUIはまだ未完成・未統合で、成功を借用していない。主担当はDB/runtime/browser/build/gitを単独所有する。

次は新migrationのclone/整合性対、profile/WS commandとicon writer guardを実接続する。現時点で採用契約との不成立は未発見、物理fenceは未接続。候補8〜12時間の初期見込みを維持し、実UI開始見込みは主要backend接続後に更新する。

## 2026-09-20T01:18:20+09:00 clone・個人icon・公開読取

01:06:46.168の新proof/migration-clone（startの作業copyのみ）で0027を適用。旧65表517列の全値差0、旧72trigger本文を全保持、新5表10trigger、FK0/integrity ok/ledger28。比較は `migration-clone/comparison.json`。独立sole保全/本体DBはdriverで開いていない。freshは引き続きledger27、サーバー未起動、objects無変更。

全体typecheckはfake UoW修正後成功。sharing DTOにpublicUrl/publicPrerequisiteを追加後、既存model.testの必須2field欠落で一度失敗し、fixtureを追随した後01:16台のrunは全体成功。専有型の隠蔽やoptional化はしていない。

新 `publication.integration.test.ts` は初回7/8成功、失敗1は人工trash rowのpurgeAfter/trashOperationId不足。既存lifecycle CHECKを維持してfixtureを修正し、01:11:43開始の再実行は8/8成功（1.30秒）。identity未発行public拒否/単独削除・改変拒否/正当note cascade、rollback、name/profile二版、handle再利用・候補非予約、trashを含む解除条件、別account/非ready icon pointer、WS二版/slug、公開検索30/300固定窓の並行予約を確認。domain profile pureは01:11:44開始12/12（142ms）。

個人iconの実接続は新application/publication/icons.tsとprofileIconRepository、既存scopeCapacityRepositoryの個人union、objectOperationRepository/profile-icon-upload、coordinatedObjectStorageの呼出ごとのClock.now、既存workspaceIconRunnerの次段有限20件sweep。Manager採用どおりcanPublish/registerKeyのDateを必須化し、begin時刻の使い回しをしない。現session/verified/profileVersion/期限をregister/publish/adoptで照合する。WS policyや既存owner分岐の意味は変えない。

`profileIcons.integration.test.ts` は01:14:39開始7/7成功（1.97秒）。隔離小PNG→実static WebP/個人課算、差替・remove後の旧URL失効と実回収、handle変更/現pointer、処理中profile OCC、登録後session期限の現在Clock拒否、実putを保持してsession取消→active writer中のcharge/実体保持→finally後回収、remove故障→30秒retry、quota/破損入力を確認。これらは隔離試験で、freshの新account/実ブラウザーとは分ける。

実編集による先行追加はManager受領済みP2d-2-B/FD・P2a-D/P3a-E・P3b-1-E・P3f-E・P4a-A/C。具体的には上記writer/capacity/runner、membershipの公開WS slug解除guard、workspaceDeletionRepository.finishStepの専用設定row削除、sharing entity/settingsのpublic分岐/同Txidentity/password解除確認/grant失効/access epochである。既存testのDate引数追随は期待結果を緩めていない。

さらにこの時点で `sharing/reading.ts` の現tokenでpublicを読む分岐、sharingInput、editorMediaの厳密public asset URL許可、新publication reading/HTTPを実編集した。P4a-D（現/sと媒体CSS境界）、P2b-D（共通frameDocumentの許可URL集合）への実影響を提案する。新publicHTTPはまだserver dispatchに未接続・未実HTTPで、完成扱いにしない。

補助は01:12:47に新publication UI8filesの専有を返却して全操作停止。借用結果はpure/render35件/291ms・限定型・Biome成功。ProfileEditor/WS panelのactor epoch・dirty/入力保持・icon callback・availabilityはprops接続済みの部品で、親route/backend callback/実UIは未統合。主担当のみが全製品と環境を所有する。次はpublic current/失効/SSRの隔離対とHTTP接続、検索reader/sitemap、公衆export、UI親接続を進める。候補初期8〜12時間を維持。

## 2026-09-20T01:34:37+09:00 公開HTTPとUI親接続

`publicReading.integration.test.ts` は01:21:10開始7/7成功（1.42秒）。初publicのhandle/slug条件と原子発行、password解除の明示確認、同token維持、private/link後の同identityとaccess epoch失効、handle変更/SH04でcanonical不変、current所有先移動とprivate WS metadata非漏洩、trash410/restore、render中の公開解除を隔離DBで確認した。crypto protector/workは代替で、fresh実key・実HTTPの根拠ではない。

`publicationHttp.integration.test.ts` は初回3/5成功、2失敗はfixtureのnoteVersion固定0で共有OCCを誤指定したため。fixtureをgetSharingの現在expectedへ直し、01:24:02開始5/5成功（1.20秒）。親metadata/canonicalと独立document全文SSR、通常browser/crawler同本文、script除去、current媒体GET/HEAD/Range/416、private404・trash410の非漏洩、suffix/query拒否、保持した媒体stream中の解除とcloseを確認した。server.nodeへdispatchを接続し、ManagerがP1-Eの実影響を受理済み。

profileIconHttpを接続し、公開WS slug解決をactive/pagePublic/current unique slugに限定した。storage後の再照合には現在settings/publication版とicon pointer/世代を含める。旧slug再取得や同版のpointer差替を旧画像採用へ流用しない。これらの実browser対はまだ未実行。

既存SharingPanelへpublic確認・password解除確認・canonicalコピー/閲覧と前提設定への導線を追加し、settings.profileを実ProfileEditorへ接続した。name/profile二版、handle availability、icon ticket/PUT/remove、refresh、actor epochとdirty離脱guardを親で接続した。WS settingsへ公開panelを接続。全体型は01:29台までの統合で成功したが、公開検索port追加後は再実行前。実編集先行影響としてP4a-E（共有panel操作/旧応答/dirty）、P4a-F（表示名の二版保存と共有画面復帰）を追加提案する。P3b-1-EのWS settingsは既再開範囲。

公開検索は採用されたPublicDiscoveryExecution.execute(request,signal)の判別scope/request/responseとworker境界schemaを追加した段階。専用1枠16待機3秒、同deadline内の現在note・profile/handle・WS公開設定/slug/iconの再照合へ続ける。reader/実worker/search・sitemap HTTPは未接続、公衆HTML/MDも未接続のままで成功扱いしない。freshはledger27/停止を維持、旧データ・objects無操作。候補初期8〜12時間は維持し、主要接続が揃い次第実UI開始見込みを更新する。

## 2026-09-20T01:49:02+09:00 公開検索workerとpublic export接続

新LibsqlPublicDiscoverySnapshotは現在public/active/owner存在をcount/facet/snippet/画像より先にSQLへ適用。最大50keyset、同正規化tag name、updatedAtのIANA半開、関連度+ID、現在handle/WS public page選択を実装した。二つの独立したread transactionで結果・選択元版・creator/profile/owner/iconを比較し、変更時の最大2試行も親共通deadline内。全文をJS配列へ返さず、本文抜粋は選択済み51行以下からSQL substrで取得する。sitemap indexは種別counts、leaf500件の有限SQL、旧名前や子documentを列挙しない。

`publicDiscovery.integration.test.ts` は初稿fixtureのrepo method誤名（insert/issueではなくcreate）と、人工public設定時のtoken列不足で失敗した。DB CHECKや製品条件は維持しfixtureだけ修正、01:42:34開始7/7成功（1.30秒）。公開条件がcount/facet/snippetより先、51件のkeyset、現在handle/creator、半開境界/不正zone/date、正規化name tagとprivate-only facet非漏洩、sitemap即時解除、projection欠落を0件成功にしない対。

NodePublicDiscoveryExecutionは既存appとは別instanceの1枠/待機16/受付3秒。共通supervisorを使い実closeまで枠を再利用しない。実publicQuery bundle試験の初回は2/3成功、1失敗はstrict worker IPC schemaが親のworkerPath設定を定義し忘れた接続不整合。親の固定configだけから渡すworkerPathをschemaへ追加し、外部requestにworkerPathを追加していない。01:44:33開始3/3成功（4.41秒）、実worker正常結果/404/sitemap、18並行の17受付/超過拒否/SQL期限killとclose、cancel/stop/独立app枠を確認した。既存app全量や大規模SLOの試験ではない。

server.nodeで別public worker設定/停止を接続、sharePrunerの同60秒周期へ公開rateの100件pruneを接続した。既存P1-E/P2d-2-FDの現在再開範囲。新publicDiscoveryHttpは厳密path/条件、browser/global予約、429/503、SSRとXMLへ接続中。描画だけはManager承認の新publicDiscoveryHtml.tsと同pure testの2fileを補助に専有させ、補助は環境/既存file無操作。01:46台全体型は作成中補助testのall/iconUrl union不整合1で失敗、補助自身が修正し、01:48台runは全体成功した。補助完了/実UIはまだ未受領。

public exportの実編集はexport/ports.ts・snapshot.ts・usecases.ts、presentation/exportHttp.node.ts。publicId/URL世代/accessEpoch/browserHashをoperation JSONに保存し、現在public認可と内容identityを別照合。既存account/linkを付替せず、current publicの現限定tokenもlink authorityとしてだけ読む。同nonce/noteの6/30固定窓をpublicとlinkで共有する。GET /s/export-public/id/1の形式選択は現在公開metadata再照合後のみ、既存/s cookieは再発行せず、初回nonceは採用navigate/document/same-origin又はnoneだけ。POST→303→native GET、strict Origin/null metadata、重複cookie拒否、nonce変化時旧operation404へ接続した。root cookie/bridge/追加clickは作っていない。新JSON unionは既存columnなので新migration不要。

この実編集でP4b-A（authority/内容identity）/C（匿名rate）/E（native HTTP/取得失敗）/F（異authority・失効等回帰）を再開候補として提案する。share cookieの重複拒否は既再開P4a-D内。public追加4隔離対を実行中で、成功未確定。実使用serializer bundleは未変更のP4b候補既存artifact、P4c同bundle実UIとは区分する。freshは未移行・未起動、旧データ無操作。残は公開HTTP/rate/page/公開exportの限定異常系・全体checks/build→新自己accountの同bundle実UI→保全/固定。候補初期見込みは維持する。

## 2026-09-20T02:03:36+09:00 全体checks・本体移行

先のP4b-C対応は誤りだった。匿名rateはP4b-E、現在authorityはA、既存native/失効回帰はFで、Manager採用はA/E/Fだけ。Cの変換serializer・埋込は未変更で既受入を保持する。public追加4対は01:49:02に4/4成功（1.51秒、旧22対を選択対象外）しており、前節の実行中をここで確定する。

補助は01:49:05にpublicDiscoveryHtmlと同pure testの2filesを返却して全停止。借用69pure/344ms・限定型・Biome成功を受け、主担当がHTTP統合した。初期profile/WSだけindex、検索/絞込/discoverはnoindex。後から追加した本人/現member導線は主担当実装で、内部viewerSessionHashを現在Clock/session/verified/membershipと二回照合し、公開集合は変えない。hashはDTO/HTMLへ出さない。Shell/WorkspaceScopeの公開導線は既存scope/filterを変えず、P1-E既再開内。__rootのapp noindexと別dispatchの公開SSRを区別する。

SQL10/HTTP6の16対は01:55:45に成功（1.63秒）。現所有移動/private WS情報非漏洩、handle/slug/現在viewer、期限失効/重複cookie時の内部導線非表示、永続rate窓/prune100を確認。全体typecheck成功、lint:fixは36warning/36infoで新fixture由来template2infoを局所修正した（36/34への最終run照合は未実行）。format成功。全unit931/83filesは01:57:11（9.22秒）、Node467/37filesは01:57:32（38.21秒）に成功し、全量を並行負荷にしていない。その後のHTTPエラー応答のVary/新cookie保持という小差分は、HTTP6+実worker3を01:59:16に9/9再検証（4.50秒）。全量runと小差分後を分離する。

正常停止/ports・DB handles空でbuild成功、db:generate:nodeは差0。01:59:45.516のpremigrate保全: source970 b99e946c42597f1d5e639a0a9bb0fd873e0e8546b6dfb722b337ed8a2e04dd33、bundle5dd9c1ce3554ebdd2492bf827a3bf95e8ab44b4c3c2227ecdf9ab79e016ed26a、HEAD6539a61e4852dd08cf52a85c451c5d4aed867bc8/lock不変、旧12objects3107B。02:03:36.263の本体移行はledger27→28、旧65表517列全値差0・旧72trigger本文全保持・新5表10trigger、FK0/integrity ok。根拠は新proofのpremigrate/とfresh-migration.json。

全製品/環境の単独所有を維持し、新bundle起動と新自己accountの通常ローカル登録/確認へ進む。実ブラウザー成功はまだない。主要実装は接続済みだが、同bundle実UI・本人profile/iconと現在公開の異常系・新自己対象回収/旧保全・最終固定が残る。現時点の実UI開始見込みは02:10〜02:30、候補ETAは実UIの成立を見て次報告で更新する。

## 2026-09-20T02:21:06+09:00 同bundle実UI・局所修正

02:04:17.180にPID2263/session98289を起動、02:20:40.219 TERM/drain→02:20:40.225 exit0、systemErrors0、ports/DB handles空を確認して停止した。この間はbundle5dd9c1ce。新自己owner/secondの2accountだけを通常signup/local mailbox確認で登録し、既存account/profile/memberを変更していない。新秘密は新proof/privateだけ、値/URL/cookie/passwordは出力していない。通常招待もこの新2account間・新WSだけへ受理したが、招待helperによる新メール選択は未成立で参加成功とはしていない。

実profileでname/handle/bio保存、HTML風bioのescape、本人バナーと匿名非表示、公開0件を確認。195B小PNG→84B static WebPを実保存し、同時に入力していた未保存nameが保持され、匿名profileは保存済みnameのまま。390で横幅390、handle確認Escape後の保存button焦点復帰。公開中noteがあるhandle解除は実business拒否・入力保持。handle変更02:11:23で旧404/新200、別自己accountが旧handle再取得02:11:45で旧200/別profileとなり、既存公開note canonicalと実creatorは不変。根拠はhttp-ui-initial.json/handle-renamed.json/handle-reclaimed.json。

新note 01a0baa2-a8fe-73fa-8559-2f5ebf871d16、public ID 01a0baa3-af57-7516-ac4f-54cf9673f33c。本文保存直後に共有を開いた最初の公開commandはnote版競合となり、明示現在GET→新確認→公開が成功。旧確認を自動再送していない。通常UA/crawlerの独立document本文一致・親canonical・script CSP・app noindexが公開へ混入しないこと、公開検索/sitemap現在掲載を実HTTPで確認。390の匿名canonical→形式選択→native HTML875B/MD548B実DL（02:08:53）、本文/通常anchor/noticeを実fileで確認。サーバー実観測metadataはOrigin null/Site same-origin/Mode navigate/Dest document全true。外部検索掲載の実績とは扱わない。

新自己WS 01a0baa9-c8fd-77df-93bf-91bba025e52eへ通常UI移動し、同canonical/著者維持、個人ページから除外、非公開WS名/説明/slugをnote/discoverへ漏らさずWSページ404（02:16:15）。WS page公開後は200/index/現在note掲載、一般slug変更後旧404/新200でもnote URL不変（02:17:51）。ws-private/public/renamed.jsonのnoteLeaksWorkspaceは「metadata存在」のbooleanであり、public/renamedのtrueは公開設定に従う許可された表示である。新WS icon195B入力→92B出力も通常UI保存した。

検証CLIのowner sessionだけキー操作後にheader timeoutが発生。自己session close/restoreで回復、他anon/second/runtimeを停止していない。製品のdialogは不在、データ消失や製品障害とは未判定。空文字fillでReact changeが発火しない操作差はx入力→Backspaceで再試験した。最初のfixture生成はweb packageからsharpを解決できず失敗し、core package起点で修正した。これらを製品成功/失敗へ混ぜない。

実不具合: WS一般slug保存後、WorkspacePublicationPanelの初期stateが新loader propsを無視し、旧公開URLを表示/コピーしていた。Manager採用の修正範囲はP4c-C/Jと既open P3b-1-E（最初にB/Eと通知したIDは訂正）。model/Panel/同pure testの3filesだけを変更。同actor/WS・二版非退行のloader metadata/URLを同期、dirty toggle保持、確認取消、loader変化前の旧async結果/focus拒否。busy中のmetadata変化は明示GETを要求し、pending mutationは不明保持。通常loader更新からACK成功判定や自動再送をしない。02:20:18局所39pure/render/225ms・全体type成功。新4pureはURL同期、dirty選択、別actor/WS/版退行、同版の権限喪失を確認した。実afterは新bundle再起動待ち。

02:21:06.346 before-ui-fix保全に新2account/profile・新WS/note/タグ/招待・14objects3283Bを保存。旧12objects3107Bと新icon2objects176Bを分離。破壊回収はまだ実施していない。保全source970 ab21419c83e59872108971e86196b28ad5011b0642025a153deda6370220aab3は修正後、bundle5dd9c1ceは修正前で、対応を混同しない。停止下でbuild中。残は修正after/公開media/現在member・解除/ACK/actor/限定異常系と最終保全・固定。候補ETAを実測で04:30〜06:00へ更新し、独立検証は別とする。

## 2026-09-20T02:35:15+09:00 修正afterと異常系（各根拠の実時刻は本文）

02:22:30.563 PID12824/session21404でbundle a095546bf8b6c29c89f71b3e898243a195577c9d70f97bfbe35fbeef43887481を起動。WS公開toggleを未保存falseにしたまま一般slugをfinalへ保存すると、手動GETなしで現在URLへ同期し、false選択を保持、旧確認/旧URLを残さないafterを実UI確認した。新通常招待は配送済みだった。helperがinvitation-*.jsonを対象外にしていた原因を修正し、02:23:18にlocal新メールから通常参加画面→参加を実施、新WSの2memberだけが増えた。viewerの外部表示バナー/設定導線からreadonly設定（toggle/saveなし）を確認。既存15membershipには触れていない。

profileの実POST200を受信後にclient fetchだけTypeErrorへ置換し、ACK喪失を注入。POST1/GET0で不明・入力保持、明示GET後はPOST1/GET1のまま不明説明/入力保持/明示新操作可を確認。その後実保存200を保持したままA→B→Aへ通常signout/signinし、02:26:43に旧successを返しても現在draft/通知/textarea焦点/busy0を変更しなかった。この対のPOST5はプロフィール1+認証4である。02:27:18の別対では旧A保存の実200後を遅いcatchへ置換し、Bの入力/alerts空/busy0/focusを保持（POST3=保存1+認証2）。実送信結果と人工応答故障を区分し、二重保存や実ネットワーク断の自然発生とは扱わない。

新noteに通常media uploadで195B PNGを保存。02:28:48のmedia-public.jsonは現在画像200/image/png/195Bと元fixture全byte一致、Range206/16B一致、documentのpublic current URL・private/api URLなしを確認。02:29:13のprivate化後は親/子/media/Range404、metadataなし、search/WS一覧/sitemapから消失。同ID再public後02:29:31は全部回復（media-restored.json）。公開URLclipboard拒否注入後は手動選択fallbackが全長を選択した。初回buttonへのupload指定はfile inputではないとCLI失敗し、観測済みinput[type=file]を指定して成功、製品失敗とは分ける。

public HTML/MDを現在PNG込みで再取得しpublic-media.html/mdへ保存した。390の公開WS上部/下部はworkspace-public-390*.pngを目視し、名前/説明/icon・入力・取得結果/thumbnail/authorが重ならず幅内。WS公開設定にも実200 ACK喪失を注入、02:30:41にPOST1/明示GET1・不明説明と選択保持・現在URL非表示を確認。WS pageだけprivateにしてもnote200/同canonical/著者・横断検索は維持し、WS page404・note/discoverへのWS metadataは非表示（ws-revoked.json）。

lintの再実行は36warning/34infoで新増分なし。固定P4c-Iに対する不足4隔離対をexportFlow.integration.test.tsへ追加した（製品serializer等は不変）。02:33:39開始4/4成功、旧26除外、1.67秒。既存6回後の初public準備でnonce再発行なし/POST429/slot0、最後の1枠のpublic/link並行で一方だけ成功、public準備を挟んでも旧link readyを元authorityで取得可能/publicへ付替不可、初回nonce2発行の実POSTcookie束縛/異cookie404/120001ms後actual cleanupを確認。これは手製HTTP/隔離Clockの対で、実browser native対とは分ける。

残はiconの期限/boot根拠・sitemap500と両styleの狭い不足を索引化/補完し、新自己対象の停止下直前保全→trash/復元/WS回収/個人icon回収と旧全比較、最終checks/commit/固定。現時点の新資源はnote PNG195B+個人icon84B+WSicon92B、旧12objects3107Bは保護対象。大規模・外部検索掲載・AC09は未提供/未実測のまま。候補04:30〜06:00を維持し、進んだ時点で前倒し更新する。

## 2026-09-20T02:45:57+09:00 狭い不足補完と自己対象回収

02:40:56、profileIcons/publicDiscovery/publicationHttpの3files/26Node対が成功（2.52秒）。新4対は501件の実SQL sitemapが500+1・重複/欠落なし・page2は404、original/defaultの独立documentと親CSS非混入、期限切れ未送信iconをrunner起動microtaskで回収、caller abortが旧iconを保持して新予約だけ回収する対。bootは同processの新runner起動と隔離Clockであり、OS crash再起動の実験ではない。既存actual writer/finally/removal fault対と併せる。製品変更はなくtestだけ追加。

実DL public-media.htmlは1385B、MDは974B。ともに埋込PNG195Bが入力fixture全byteと一致、/api内部媒体URLなし、noticeあり。02:29:48.456/.725のサーバー実POSTはOrigin null/Site same-origin/Mode navigate/Dest documentが全true。

PID12824を02:41:35.048 TERM/drain→.056 exit0/systemErrors0、ports/DBhandles空。before-delete-ui保全02:41:35.611は15objects3478B（旧12/3107B+新3/371B）と新2membersを含む。PID20385/session23261で同bundle再起動し、新noteだけ通常trash→02:42:16.646親/子/media/Range410・検索/sitemap除外、通常「元に戻す」→02:43:01.529同canonical/195B全byte/Range206復帰。helperの既存media-restored.jsonへの排他保存がEEXISTになったため、既存証跡は上書きせず別名media-trash-restored.jsonで再観測した。

新WS pageを再公開し、新secondの現在memberバナー/設定導線ありを確認。通常owner UIでこの新secondだけ除名後、同公開WSのnote集合を保ちつつmember導線を消した。confirm表示中のheader設定はCLI側で拒否されたため、すでに設定済みChrome HTTP UAを保持したままdialog acceptだけ実行した。別WS/旧memberには触れない。02:44:13.956 TERM/drain→.962 exit0後、before-workspace-delete保全02:44:14.512（現member1、新旧全資源保持）を作成。

PID21868/session42971同bundleで、新自己WS名を入力し通常削除を受理。02:44:39.266公開親/子/media/Range404・検索/WS/sitemapから除外、個人へ遷移した。新WS1/note1/残member1（先に通常除名したnew member1を含め本phase追加membership2が消滅）、note asset195BとWS icon92Bが回収対象。新owner個人icon84Bも通常確認UIで削除した。02:45:56.037 TERM/drain→.043 exit0/systemErrors0、ports/DBhandles空、before-final-checks保全.584で12objects3107Bへ戻った（371B実物理回収）。アプリからのWS削除undoは不可、保全コピーからの復元は未実施。新2account/profileと新個人タグは残存し、旧baselineと区別する。残債務/旧全列の詳細は停止下copy driver比較中で、資源件数だけを全保全成功へ拡大しない。

現在runtimeは停止、全体typecheckから最終規定checks/unit/Node/buildを順次実行中。次は旧全比較・項目索引・product-only commit/fingerprint・全停止返却。新不具合がなければ候補を03:20〜04:00へ前倒しする（独立検証は別）。

## 2026-09-20T02:57:27+09:00 最終固定と旧保全（各実行時刻は本文）

規定 `pnpm typecheck`、`pnpm lint:fix`（36warning/34info・修正0）、`pnpm format`（750files・修正0）が成功。全unitは02:47:18開始935/83files、9.20秒。全Nodeは02:47:47開始475/37files、39.39秒。unit/Node/buildは順次実行し、検索deadlineに別build負荷を重ねていない。Node前db:generate:nodeは差0、02:49:26に開始済みbuildは成功し、bundle hashは実UIのa095546bと同一。`git diff --check`/cached check成功。これ以降の製品差はない。

最後の根拠不足は新ProfileEditor→元共有への実明示復帰だった。PID24013/session65165を02:50:21.455に同bundle起動し、新個人note `01a0baca-dc7d-741a-b003-21664f2ec093`（媒体/原本0）を通常UI保存。未保存note titleのまま共有を開くと保存済みtitleを表示し、editor入力は保持された。入力を利用者操作で元に戻し、認可対象noteId+resume=sharing付きprofile routeへ移動。未保存bioを書いて「ノートの共有設定へ戻る」を押すと確認が出て、取消後はbio/route保持。入力を元に戻して明示復帰すると02:52:22に元noteの共有panelが開き、privateのまま、自動共有変更なし。profile routeへの入場は既知の検証済み復帰URLを直接開いた対であり、未設定用link表示の旧P4a実UIを新たに実行したとはしない。profileの保存/ACK/ABAは前節の現在bundle対を参照する。

02:52:38.784 TERM/drain→.789 exit0、ports/DBhandles空、before-return-note-delete保全02:52:39.252後にPID25562/session74296で同bundle再開。追加noteだけ通常trash→確認checkbox→完全削除し、ゴミ箱空/未完了なしを確認した。新WS側noteを含む本phaseの完全回収は新note2、WS1、追加membership2（1は通常除名）、asset1/195B・WS icon1/92B・personal icon1/84Bの計3objects371B。追加noteは0B。WS削除/完全削除のアプリundo不可、保全からの復元は未実施（先の通常trash undo成功とは別）。

02:54:04.589に最後のPID25562をTERM/drain→.593 exit0/systemErrors0、ports3000/3001・fresh DB/sidecar handles空。自己browser owner/second/anonの3sessionだけclose成功、global cleanupなし。補助は01:49:05以降停止のまま。製品only90filesをcommitし、管理文書はstageしていない。worktreeに残るのは未追跡 `.goal-implement/` だけ。

| 固定対象 | 最終値 |
| --- | --- |
| commit | `6e9731c28f65503c424295a112c46811c66c4054` |
| source970 | `378d72a699cdbdda130fe9ca6cd00f487365f13e51afac52e83b0b57dc2cb6a9` |
| bundle server.node.js | `a095546bf8b6c29c89f71b3e898243a195577c9d70f97bfbe35fbeef43887481` |
| lock | `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` |
| 最終保全 | 新proof `final/`、02:54:25.488、12objects3107B |
| 最終比較 | 新proof `comparison-final.json`、02:54:28.930、driverは新copyだけ |

比較の旧67物理表522列は、移行比較の旧65表517列にledger/sequenceの2表5列を含めた数。旧製品データ集合の差ではない。旧列定義は全一致、旧72trigger本文差0、新10trigger。旧103active notes/31tags/9originals/2assets/111revs95heads/9activeWS15members/batch19/48/51の旧行全列を保持し、旧profile unset/version12も不変。旧12objectsの全key/bytes/payload SHA一致、旧12scope（account3+activeWS9）の容量は2320/0/0/516/0/0/0/75/0/113/83/0で全一致、provenance違反0。容量比較の旧copyにだけ新profile-icon空TEMP表を作って現queryの追加unionを評価し、旧DB/sole保全は書き換えていない。

許容差は、開始時pendingだった旧outbox1件のprocessed_atが通常workerで更新（他旧列差0）、note_projections sequence139→145、FTS物理segmentの更新。FTS論理8253postingsは失われたもの0/追加0、FK0/integrity ok。新2account/profile/name/session/local確認・新個人tag1（総32）、新招待/処理履歴、deletedWS追加1（計12）、purge追加2等は自己検証の追記。新profile2はhandleを保持しiconなし、個人icon行0。全workspace deletion12成功、purge13成功、active writer0/未完object delete0/export op・rate・reserved0、self WSはdeleted/note0。旧物理DB全byte同値や全表行数同値とは主張しない。

### 固定条件と検証索引

以下は全て自己確認の合格候補であり独立Verifierの合格ではない。Tは最終475Node/935unitに含まれる現在sourceの試験、Uは本report記載の同bundle実UI/HTTP/file、Dはclone/最終保全。補助が作った35pure/69pureは統合後の主担当全unitにも含めて再実行した。旧P4a/P4bの変更外条件は受入根拠を借用し、新UIの成功に拡張していない。

| 対象 | 現実装・最終根拠 | 限界/区分 |
| --- | --- | --- |
| P4c-A | domain/account/profile、publication/profile、ProfileEditor/route。T publication8・profile pure12・UI39で二版/handle重複候補/解除trash/再利用/入力保持。U新2account実保存/旧handle別人再取得/著者不変、02:52明示復帰とdirty取消 | AC09本体は後続。deleted/unknownは既存型/読取とtest、実退会はしていない |
| P4c-B | icons/repo/current writer guard/個人capacity/runner。T profileIcons9で実staticWebP、予約→ready→debt、遅いput/session/OCC/期限/abort/remove fault/起動sweep。U84B保存・入力保持・削除、D実回収とcharge | bootはrunner起動対、OS強制crash実測でない。巨大画像/native全RAM保証ではない |
| P4c-C | workspace command/repo+WS settings二版panel。T publication8/HTTPとU owner公開・slug旧404/新200・viewerreadonly、URL同期before/after/dirtytoggle保持、ACK不明、pageだけprivateでもnote維持 | 局所UI修正の前後bundleを前節で分離 |
| P4c-D | sharing/settings＋immutable public identity/epoch。T publicReading7/export30で初回原子/保護解除確認/既token保持/SH04/再public/epoch旧結果拒否/現在移動。U同note move/handle/slug/解除/再public URL不変 | crypto代替の隔離対とfresh専用実key接続は区別 |
| P4c-E | reading/publicationHttp/editorMedia。T publicReading7/HTTP6で描画中失効/current媒体/HEADRange416/両style/親隔離。U通常UA/crawler同全文、currentPNG195B/Range16B、private404/trash410/restore同URL/WS削除404 | 外部検索掲載・配信済bytesの撤回は未保証 |
| P4c-F | PublicDiscoverySnapshot/Html/現在viewer。T SQL11/HTTP6/HTML69で現在所有/creator/公開metadata/facets/cursor/current session。U個人→WS移動/非公開WS情報なし/公開WS/旧handle別profile/現在viewerバナー/通常除名後内部導線だけ消失 | 認証は集合を増やさず表示導線だけ。既存scope/filter変更外は旧受入＋全回帰 |
| P4c-G | discovery専用port/SQL/worker/rate。T SQL11/HTTP6/execution3/publication8でprivate前段除外/JP部分一致・ASCIIprefix/mixedAND/関連度/tag/update IANA/cursor、現在二snapshot、0≠失敗、1+16/3s/actualclose、30/300固定窓並行/再構築/prune100。U日本語/英語検索・解除後消失 | 50件page/SQL substr、全文配列なし。最大DB規模SLOは未測定 |
| P4c-H | 同SQL sitemap/HTML XML。T501→500+1/no欠落、HTML69のescape/protocol上界throw、HTTP index/noindex。U現note/profile sitemap・private/trash/削除除外 | 全catalogue原子性/外部掲載/最大50MiB実生成を保証しない |
| P4c-I | export public authority/厳密/s形式選択HTTP。T export30中public8でepoch/authority/5+1/旧6/最後枠並行/旧linkready/初nonce race+120s回収、既存22回帰。U390nativeHTML/MD実file・currentPNG一致・POSTmetadata4boolean true | noJSはscript-none native form/HTTPで成立、browser全JS設定を無効化した対ではない。PDF/ZIP未提供 |
| P4c-J | UI operation actor/epoch/note/route/確認guard。T純粋UI39/共有回帰。Uprofile/WS実200喪失→明示GET入力保持/非自動POST、A→B→A旧successとB旧catch/finally拒否、390/焦点/Escape/copy拒否fallback、dirty復帰、WS削除失効 | 人工fetch hold/throwを自然な通信断と呼ばない。未提供機能の仮成功なし |
| P4c-K | ports→application/domain、providerはadapter、Clock/ID/UoW/new0027。D旧列/trigger/objects/charges/FTS、最終checks/935/475/build・product commit・同bundleUI/正常stop | 他runtimeは全体型確認のみ、外部接続/公開deployなし |

| 再開された既存条件 | 今回の実影響と根拠 |
| --- | --- |
| P1-E | server dispatch/DI/build publicQuery/Shell公開導線。T HTTP/execution+全checks、Uapp noindexと別SSRindex/390/通常登録localmail/正常起動停止 |
| P2a-D | scopeCapacity個人icon unionだけ。T profileIcons9 quota/予約/実体/debtと旧import全Node、D旧原本/asset/容量保持。取込上限自体は不変更 |
| P2b-D | editorMediaに厳密public asset URL許可。T publicationHTTP両styleと旧style回帰、U現在SSR・画像。既定style保存契約を変更していない |
| P2d-2-B | objectOperationRepository/profile-icon writerの現在Clock guard。T actual write保留/失効/finally/remove faultとcoordinated storage回帰、D旧charge保持/active writer0 |
| P2d-2-E | 新schema/ports/clone旧列と自己資源回収、D＋最終checks/commit/同bundleUI。旧migration不変 |
| P2d-2-FD | public worker停止・profile sweep停止待機。T execution実child close/cancel/stopと既存資源回帰、U正常drain全回/DBhandles空。無関係FD300回を別途追加していない |
| P3a-E | 個人icon予約/ready/debt課算、WS quota不変更。TprofileIcons9、D旧12scope完全一致/新371B実回収、export非課算維持 |
| P3b-1-E | WS一般slug解除guard＋公開panel並存。T二版/slug条件、U一般slug保存後URL同期修正after/readonly/dirtytoggle/現在WS metadata |
| P3f-E | WS削除finishStepのworkspace_public_settings回収。T旧workspaceDeletion回帰とU新公開WS削除→全public入口404/metadata非漏洩、D設定/資源回収・旧member保持 |
| P3f-H | 新UoW/migration/旧schema保全。D65表517列移行差0・72trigger/FK/版/holding/receipt、最終旧67表522列比較とchecks |
| P4a-A | sharing正本のpublic分岐と新expected。TpublicReading/旧sharing/移動回帰、U通常保存・移動/共有OCC明示GETと旧note全列保持 |
| P4a-C | public化時password解除確認/grant失効。TpublicReading保護解除原子と旧sharing password全回帰。key/計算枠/rate機構自体は不変更 |
| P4a-D | 現/s tokenがpublicを読める分岐/重複cookieとpublic媒体URL。T publicationHTTP /s noindex・旧sharingHTTP/media回帰、U共通renderer現在PNG/親隔離 |
| P4a-E | SharingPanel public追加/現在確認/copy。T共有pureとU共有OCC、private/republic/copy fallback、editor dirty保持。旧actor切替基盤は維持し新profile/WS ABAを実確認 |
| P4a-F | nameをprofile二版保存へ接続、元共有復帰。T二版rollback/既displayName回帰、U本人保存/未保存入力/ACK/02:52明示復帰とprivate維持 |
| P4a-H | 新0027/共有identitytrigger/UoW/移行保全、D＋全checks/current artifact/秘密非出力 |
| P4b-A | public authority分岐を既存account/linkと分離、current content別照合。Texport30/既旧22、同内容移動/epoch/旧link付替拒否、U現在PNG入りfile |
| P4b-E | /s共通nonce/native public dispatch/current browser binding。T旧匿名HTTP/rate+public8、U実metadata/attachmentDL。旧6/30窓保持、password rate非流用 |
| P4b-F | 公開native形式選択追加、既存app/限定制御は回帰。Texport30、U390/copy/nativeHTML/MD/Back、未提供PDF/ZIP/仮jobなし |
| P4b-G | authority port/Node dispatch/DI worker、新migration旧export保全。Dexport0/旧charge/objects/列保持、checks/build同bundlefile/commit/全停止 |

P4b-Cはserializer無変更のため提案を撤回済みで再開対象外。対象外の条件をこの表で新たに受入扱いしない。

### 独立検証への安全引継ぎ

- freshは既知 `p3c-20260911-dyHGjx`、ledger28。旧0027以前の再適用やlock手削除は不要。起動前ports/DBhandles空を再照合し、live dist上書きはしない。
- 実行専用launcherは新proof `server.mjs`。Node実パス `/nix/store/4gl9pclv6ygwmgpg1gijza978bqbmpga-nodejs-22.22.3/bin/node` で起動する。APP_URL localhost:3000/HOSTNAME127.0.0.1/PORT3000/NODE_ENVproduction、DB/objects/localmailboxは既知fresh。launcherは安全なPID/drain/exit/error数とmetadata booleanだけを出す。正常停止は表示されたchild PIDへTERM、unified session終了回収、ports/DBsidecars handles空を確認する。
- 共有key IDは `p4a-first,p4a-second`、active `p4a-second`、key dirはfresh/private/sharing。招待keyはfresh/private/invitation.keyのpath指定だけ。値・秘密hash・env/argv全文・cookie・token/password・rawログ/HARを読取/出力しない。旧keyを変更/廃棄していない。
- browser実行専用 `browser.cjs` はsession `p3c-fresh-p4c-*` に限定、各HTTP操作にChrome UA、20秒timeout/120秒idle、秘密URLをredactする。native dialog表示中はheader設定が不能なので、同sessionの既設定UAを維持したdialog accept/dismissだけを行った。global cleanup禁止。独立担当は自分のsessionだけを管理する。
- 新profile検証accountはowner/secondの2件のみ。新proof `account.cjs` は本人新privateファイルを内部読取し `fill` / `verify` / `invite-fill` / `invite-open` を秘密非出力で実行する。既存認可helperも従来どおり実行専用。新登録が必要なら新private proofへhelperを新copyし、そこでcreate（排他作成）する。既存private JSON/旧helperの全文を読まない。
- sole保全DBへdriver直結しない。`compare.ts` はstart/finalをさらに新copyして比較し、出力はcount/差分数/非秘密metadataだけ。すでにあるcomparison directoryやJSONは上書きしない。独立driverは新名/新rootを使う。
- 再利用可能な製品試験は上記Tのsource files。全量は `pnpm typecheck` → `pnpm lint:fix` → `pnpm format` → `pnpm test:unit` → `pnpm test:integration:node` → 停止下 `pnpm build`。外部接続や本番操作は不要。freshで新破壊試験をする場合は新自己対象だけ・停止下事前保全・量/回復区分を維持する。
- 根拠の入口は新proof `final/manifest.json`、`comparison-final.json`、`migration-clone/comparison.json`、`fresh-migration.json`、`http-ui-initial.json`、`handle-*.json`、`ws-*.json`、`media-*.json`、`public-media.html/md`、390の2PNG。token入り画面証跡は保存していない。

独立レビュー/操作は未実施。外部検索エンジン掲載、全catalogue原子性、最大入力/DB規模SLO、OS crash実profile回収、他runtime実稼働、PDF/ZIP/一括公開/退会本体/Google/Drive/LLMはここで成功扱いしない。採用P4c条件に既知の未接続/不具合は残しておらず、上記限界を分離して候補を返す。

02:57:51 JSTに製品worktree clean（管理 `.goal-implement/` だけ未追跡）、ports3000/3001・fresh DB/sidecar handles空を再照合した。この末尾記録をもって主担当は製品・DB・runtime・browser・test/build・git・報告文書の全操作を停止し、環境所有をManagerへ返却する。正式P4c受入はManager/独立Verifierの判断待ち。

## 2026-09-20T03:52:41+09:00 — F/G 限定修正

独立 `reviews/P4c.md` 全文を読み、29条件の受入を維持したまま F/G だけを再開した。新private proofは `/Users/hikaru/.local/share/hollow/verification/p4c-fix-20260920-3Bm1To`。03:42:01.259開始保全のDB/WALは独立finalと一致、開始commit/source970/bundle/lockは独立固定と一致、12objects/3107B。最初の検査copyにWALを含めなかったため古いcheckpointのcountが出たが、別名へDB/全sidecarを新copyして訂正した。fresh/sole保全は変更していない。正しい開始値は7accounts/4publicprofiles/5displaynames/41sessions、103active notes/111revs/95heads/32tags/9activeWS/15members、batch20/49/52、deletedWS13/purge14、writer/delete/export未終端0。開始全16scope（7account+9WS）を今回の比較対象にする。独立が保持した旧14scopeを含む。

実変更は製品2pathだけ: `adapters/node/publication/wire.ts` のdescription wire上界を4000UTF16へ整合し、domain2000codepoint/保存入力/表示を不変更。`adapters/libsql/publicDiscoverySnapshot.ts` は条件全体のcursor複写をdomain-separated SHA-256の64hexへ変更、version1 strict shapeでscope/normalized query/sorted tags/zone/from/untilを照合する。旧形式/他条件/改変identityを明示拒否し、現在公開SQL predicateを認可正本として保持。URL32768/response16384の上界は変更しない。Manager採用済みのF/G範囲で、新port/schemaや他29条件の実変更はない。

新 `publicDiscoveryBoundary.integration.test.ts` は実SQL・実public query/supervisor worker bundle・production HTTPを通す7対。修正前03:44:09は4合格/3失敗（1201/2000補助文字と最大条件cursorが503）、03:44:39の実51note/50tag生成cursorはresponse parseの `page.nextCursor too_big` を確認した。Verifierの手製JSON観察とは別の製品SQL/HTTP再現である。説明だけ修正後03:45:41は6合格/1未実行、両修正後03:46:59は新7+既存SQL11/HTTP6/実execution3の計27Node合格（7.62秒）。1200/1201/2000補助文字・2000BMP無損失、2001cpの既存domain拒否、51件50+1/重複欠落0、最大条件の実next linkがURL上界内、別scope/各条件/旧形式/version/identity改変拒否を確認した。全体型成功、lint36warn/34info（増分0）、format差0。

実beforeは新自己WS `01a0baff-8531-7509-a13b-270a6791be35`（slug `p4c-unicode-fix-3bm1to`）だけを通常UIで作成/公開。新profile/accountは作らず変更もしていない。description 😀1201は作成入力で1201cp/2402UTF16を確認し、旧bundle実公開GETが03:49:08.767に503/Retry-After3となった。再読込後の最初のtextareaを取る補助probeは別textareaを拾い0を返したため、保存再読込の実証には借用しない。修正版で正しい対象を明示して再確認する。対象は0note/0object/1自己member。PID43584を03:52:13正常TERM/drain/exit0、ports/DBhandles0を確認し03:52:23 before-build保全（source971 `8737a563cd248f3c629293ab9a9eb2f874067c5343aac9d19dae2c30e48c0dd6`、bundleは旧版）を取った。

残は最終unit/影響Node・build、同bundle実after1201/2000、自己WS0Bの事前保全後回収、旧全比較/commit/全停止。候補見込み04:15〜04:45 JST、独立再検証は別。既合格29条件の無関係な全UI/大規模試験は反復しない。

## 2026-09-20T03:59:24+09:00 — F/G 修正完成候補

F/G の2不具合を修正し、自己検証・同bundle実UI・旧保全比較を完了した。追加変更や判断待ちはない。既受入29条件は独立 `reviews/P4c.md` の合格根拠を借用し、今回再検証したとは扱わない。最終採否はManager/独立Verifierへ返す。

| 固定 | 今回候補 |
| --- | --- |
| product-only commit | `a2fe9cf640db58dccfa293fdd56489c4d484198b`（製品2path＋新boundary testだけ） |
| source | 971 files / `8737a563cd248f3c629293ab9a9eb2f874067c5343aac9d19dae2c30e48c0dd6` |
| server bundle | `645967273932c043ed9e513bddcec2561b68de58a24b16fbe4377319d709be57` |
| lock | `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`（不変） |
| 最終保全 | 新fix proof `final/`、03:59:03.785。比較 `comparison-final.json`、03:59:07.184 |

### 修正対象と根拠

| 対象 | 今回の直接根拠 | 借用・未検証 |
| --- | --- | --- |
| P4c-F | 新boundary対の実SQL→worker→HTTPで1200/1201/2000補助文字、2000BMPを全文一致200。2001cpは既domain拒否。実新WSでは旧bundle1201→503、修正版03:54:36.789→200/1201cp2402UTF16完全一致。設定ページ再読込後 `textarea[name=workspace-description]` を明示し同値一致。通常UIで2000へ保存→再読込4000UTF16一致、03:55:07.146公開HTTP200、同公開実画面の `.pd-description` も2000cp一致 | 他のprofile/WS公開集合・creator・metadata非漏洩・viewer導線等は独立既合格および影響SQL/HTTP既存対。最大DB規模や外部掲載を追加保証しない |
| P4c-G | 新51note×50tagの正当NFD/NFKC最大条件を実SQL生成。before実response cursor too_big/HTTP503から、after初回50件・次1件・重複欠落0/total51へ。実HTMLnextリンクが32768以内、両HTTP200、固定64hex/version1。別scope/query/tag/zone/from/until、改変identity、旧形式/version2はPUBLIC_CURSOR/422。条件正本の切詰め・入力上界の縮小/無限拡大なし | 最大合法条件は小隔離DBで実worker/HTTPを通したもので、fresh既存DBへ51noteを追加していない。認可は既存現在公開predicate、digestは認可secretや署名ではない。検索rate/finite queue/snapshot/sitemap等の変更外は既存対＋独立受入 |

### 最終試験と実行区分

- `pnpm typecheck` 成功（03:48:31回収）。`pnpm lint:fix` 成功・36warn/34info、fix差0。`pnpm format` 751files差0、`git diff --check` 成功。
- `pnpm test:unit` 03:52:35開始、83files/935成功、9.18秒。
- 影響Nodeは新boundary7、既存 `publicDiscovery.integration` 11、`publicDiscoveryHttp.integration` 6、`publicDiscoveryExecution.integration` 3、計27成功（03:46:59、7.62秒）。同sourceの最大cursor単独再実行も03:53:38開始で1成功/他6選択外、5.19秒。旧全475Nodeは前候補の借用であり、修正版全Node482を再実行したとは書かない。
- `pnpm db:generate:node` 差0、新migrationなし。停止下 `pnpm build` 成功、同bundle実UIをPID45774で03:54:25.507から行った。live dist上書きなし。
- PID45774のTERM後はbrowser接続が残りdrainが継続した。主担当の保全試行はopen-db guardで拒否、先走った別launcher PID46475も起動拒否/exit1だった。保全/DB変更/lock削除は行われず、製品不具合とは扱わない。自己browserを閉じた後03:56:30.294に旧PID正常exit0を確認し、ports/handles空→保全→次起動の順を回復した。
- 比較driver初回の未導入tsx/不正module alias起動は実DB接続前に失敗。新proofの比較用bundleへ正しいsrc aliasを接続後、start/finalの新DB+全sidecar copyだけを読み、成功結果を保存した。sole保全へdriver直結していない。

### 自己対象の回収と旧データ

03:56:38.465 `before-delete-ui/` は停止下の新WS/自己member1/説明2000cpを含む。新note0、original0、asset0、icon0、物理対象0B。03:57:24通常確認UIから名前完全一致で削除し、個人notesへ遷移・回収完了表示を確認。最終DBで新WSだけdeleted、全14deletion成功、旧purge14成功、writer/delete/export負債0。アプリundo不可。保全copyは保持し、バックアップ復元は実行/検証していない。

最終比較は旧72表555列（ledger/sequence含む）・82trigger本文同一、FK0/integrity ok。旧103active notes/111revs95heads/32tags/9originals2assets/9activeWS15members/batch20/49/52、旧7accounts/4publicprofiles/5namesを保持。旧12objects3107B全byte一致、16scopeの容量全一致（account2320/0/0/0/0/0/0、WS516/0/0/0/75/0/113/83/0）、FTS8253全posting差0、note sequence148不変、旧outbox全列不変。許容差は期限切れdiscovery rate3行の通常prune、本人通常signinのsession1追加、今回新WSのdeleted縮小行1/intent1/receipt1追加だけ。既存profile/member等への変更なし。

### 再検証引継ぎ

新fix proofの `server.mjs` は既知安全launcherのcopyで、metadata監査だけ元主proof `p4c-public-20260920-FBjuZk/metadata.mjs` を参照する。Node22.22.3実パス、fresh/ledger28、share key IDs first/second（active second）、鍵pathのみ・秘密非出力、各browser呼出ChromeHTTP UA/20秒/idle120秒、全global cleanup禁止の既定を維持。`browser.cjs` は新自己sessionだけ使用した。認証は既存自分のmain P4c `account.cjs <session> owner fill` の実行だけで、helper本文/秘密JSON/鍵を読まない。

根拠は新proof `unicode-before-1201.json` / `unicode-after-1201.json` / `unicode-after-2000.json`、`before-delete-ui/`、`final/manifest.json`、`comparison-final.json`。再現用の新製品boundary testは新規小隔離DB/actual workerを自己生成し終了時にその専用tempだけを回収する。fresh既存データは再現用に変更しない。修正後実1200/BMP2000は隔離対であり、fresh UIでは1201/2000補助文字だけを実施した。

最終PID46595/session92335は03:57:34.677 TERM→03:57:34.682正常exit0、自己browser close済み。03:59:24までにports3000/3001・fresh DB/sidecar handles空、製品worktree clean（管理 `.goal-implement/` のみ未追跡）を照合。この記録をもって製品・DB・runtime・browser・test/build・git・報告文書の全操作を停止し、環境をManagerへ返却する。
