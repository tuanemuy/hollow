# P4b 実装報告

P4b-A〜Gの完成候補を固定し、Managerへ返却する。独立検証とManager正式受入は未実施。採用正本は design.md「P4b のHTML・Markdown単件書き出し」、brief.md、plan.md の固定7条件。契約提案の末尾22:30補足を採用入力とし、design を優先する。EX-01/04のHTML/Markdown単件のみで、PDF/ZIP/public等は対象外。

## 開始保全

2026-09-19T22:39:15.061+09:00 に新private proof `/Users/hikaru/.local/share/hollow/verification/p4b-export-20260919-OUtxpb/start` を作成した。開始前 ports3000/3001、fresh DB/sidecar handles は0。独立P4a final とDBのcmpが一致した。proofのsole DBは直接driverへ渡さない。

- HEAD `4b668c3707fd893cf85dde7c268a706f1f7bfd33`
- source 892 files `8ea20d74524e9c6a832d1a2d2adbb4ac66142ef7456a8a6518f61b3654cf2595`
- lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`
- bundle `633545ce9943e862361206137dc92584c853c331c2d209aeacc0e53ba2aa858a`
- 12 objects / 3107 B。旧103active notes等のP4a独立最終基準を保護する。

## 2026-09-19T22:49:00+09:00 初期実装

時刻は進捗記録時刻。開始保全以降、fresh は未移行・未起動。新0026は生成だけで、本体ledgerは26のまま。

新 `export_operations` と `export_download_rates` の2表、専用repository、UoW、typed ports、export-operation物理writer、purge capture/完了収束を追加した。operationはservice所有であり、共通object_writesのnote ownershipGenerationへbindしない。新ownerだけをop→current note/active scopeで判定し、既存note writerの世代guardは変更しない。最終認可/内容照合は未接続。同内容移動は世代変更だけで不採用にしない。

2slotはpreparing/ready/sendingと、終了していないwriterを数える。cleanup debtは実remove確認まで予約量を保持する。現在新repoの隔離動作試験は未実行。新schemaのclone旧全列保全も未実行。

初回typecheckはunused importとfake UoWの新repo不足の2件で失敗。両者を補完した再run `pnpm typecheck` は成功。build/unit/Node/実UIは未実行。

実編集による先行影響の採否をManagerへ報告した: P2d-2-B（物理owner/register/publish）、C（purge capture/complete）、E（schema/UoW）、P3f-D（current note資源とWS失効）、H（新migration/型）。共有row/既存UI/HTTPは未変更。

独立補助は `adapters/node/exportDocument/**` の新serializer/worker/専用unitだけを専有する。固定DocumentWriter portを渡し、環境・DB・runtime・browser・既存製品の書込は禁止。統合・worker packaging・全検証は主担当。補助成果は未返却・未検証。

次は隔離slot/rate/cleanup/purge対、現在認可snapshotと逐次source照合、HTTP/UI接続。初期候補見込みは2026-09-20T02:35〜04:35+09:00であり、実測完了時刻ではない。

## 2026-09-19T23:04:00+09:00 基盤接続

- 22:53:27開始の隔離Node 5対/1.35秒成功。ready/sendingを含む2slot・二重send拒否、cleanup物理証明までのdisk予約、旧claim拒否、current lifecycleとnote世代非依存、固定6/30 rate窓を確認。初回は試験config名誤りで起動失敗、次はsaveNote戻り値のfixture誤りで5失敗、修正後の成功と分離する。先行移出/WS削除の実対はまだ未実行。
- 22:59:41.607 cloneで新0026を適用。旧63表497列全値差0、72trigger本文一致、FK0/integrityok、ledger27。新表は2表のみ。本体はledger26・未起動を維持。
- 補助最終22:56:57、専有8files/26unit成功・全停止を受領。単体serializer/小protocol workerの借用根拠であり、実worker.ts bundleは未検証。全体型で発見したunknown guard1件は補助が返却前に修正。
- 主担当23:00:25開始、source逐次read5対+serializer/protocol26対の31unit/361ms成功。300001Bのchunk base64・sha差異・不足/欠損・abort/cancel・小inlineを確認。大規模全量成功や実browserではない。
- 再typecheck成功。SourceReaderは元媒体にwriter登録せず、同private objectディレクトリをadapterだけがO_NOFOLLOWでopenし、64KiB未満read・sha/bytes照合とactual handle closeを行う。内側へNode型/provider例外を渡さない。
- 現在認可snapshot、prepare/adopt、単一send claim、120秒lifetime/30秒generation、boot orphan回収、runtime stop、worker packaging、app/限定nativeHTTPを接続した。HTTP実対と実worker起動は未検証。export POSTはRequest abortと接続し、匿名画面にはnative formを追加。通常style文字列は共有pure定数へ移し、既存previewと同じ値を使う。

新たな実編集影響の候補は P2b-D（editorMedia既定style共通化）、P2d-2-FD（server shutdown/drain）、P1-E（新HTTP境界と既存server dispatch）、P4a-D（匿名server HTMLへexport form/cookie接続）。検索workerの内容は変更せず、同build scriptへexport worker bundleを追加した。

補助初稿のnode10000/depth128/媒体総数200/任意出力閾値は採用済業務上限ではない。Manager判断に従い、本文由来の保守上界とisolated heap/deadlineへ見直し中。外部inspect200・小inline200は別の採用境界として保持する。

残: serializer深い木と入力由来上界、実worker/stream/purge/authority異常の統合対、アプリUI、同bundle実ファイル/390/actor/ACK/dirty、fresh移行/旧保全、最終checks/commit/全停止。候補ETAは初期02:35〜04:35を維持し、実UI開始後に更新する。

## 2026-09-19T23:18:00+09:00 実workerと入口

実worker entry の初回bundleは依存CJSのdynamic requireにより8対失敗。fixtureだけの安全なboolean診断で実因を確認し、export worker bundleへNode createRequireを明示して修正した。23:11:59の実worker・file/authority/HTTP 8対は成功、23:16:23のrepoを含む13対も成功。serializer後の局所変更を反映したworkerを23:17台に再bundleし、同13対を再実行中。

成功8対はHTML/Markdown実file・UTF8長、anchor非span、別sessionと変更内容の拒否、同内容移動→旧WS削除後の同spool取得、限定browser/password epoch失効、inspect許可集合変更時の不採用（body fetch禁止fake）、boot回収/owner quota不変、native form null Originの厳密metadata対。匿名password grantは人工DB fixtureであり、通常unlockや実browserの根拠ではない。

初稿の独自node/depth/媒体総数/固定text・segments・URL合計閾値を撤去した。HTML既存800KiB、外部inspect200、小inline200、128MiB worker heap、30秒deadlineは維持。plain textの検査上界は入力UTF8総量sから32s²+4096、segmentは4s+2mediaCount+1、manifest URL量は本文等のescape上界6倍+外部4種類×200×8192から導く。実出力sizeは各textUTF8長+各出現mediaの4ceil(bytes/3)+prefixを合算してreserveし、書込実bytesで検査する。単件1GBや新quotaは追加していない。

HTML serializer/text/Markdownの走査を反復処理へ変更し、Markdown fallback配下の未使用image definition混入を修正。既存CSS保護が規模超過で装飾を除去する場合はその境界を維持してnoticeを残し、文書全体を新上限で拒否しない。23:16:21 pure23対は深さ800のHTML/Markdown fallbackと15000個brを含め成功（905ms）。800KiB最大本文/最大媒体規模の成功をこの小対から主張しない。

23:17:08 lifetime4unit成功。readyも含む2枠、abort後のactual task収束まで保持、受付起点の残120秒を延長しない、stopの新規拒否とsend close待ちを確認。idsは最大2のruntime正本候補だけを返し、runnerがDB消失を照合して孤児を止める。DB照会失敗は消失扱いにしない。

アプリdetail/editへprops駆動ExportActionを追加し、current actor epoch/note/path/operation所有、旧success/catch/finally拒否、準備中・中止・ACK不明（自動再送なし）・native取得・保存完了非断定を接続した。未保存editor入力へsave/resetを呼ばない。実UIは未実行。実編集影響としてP3c-F（detail書き出し導線）とP2c-1-E（edit route内共存/dirty非破壊）の採否をManagerへ報告する。既存SharingActorProvider/共有panel/boardは変更していない。

typecheckはHTTP試験をcoreに置いた初回でweb alias依存を検出したため、試験をweb側integrationへ移し、内向き依存を維持した再runで成功。本体は未移行・未起動のまま。次は残故障対と規定checks→build→同bundle実UI/実fileへ進む。初期ETAは維持。

## 2026-09-19T23:32:00+09:00 生成とnative取得・初回移行

前節の再runは23:17:45開始13対/2.25秒で成功。23:27:30開始の実worker+repo17対/5.41秒は、空本文をoperation確保前に拒否、viewer現在readで取得→membership取消後拒否、asset行なしの正当に保存された小SVGをHTML/MDへ埋込、厳密native POST→303→GET attachmentを含めて成功。viewer/grantは隔離DBfixtureであり、通常招待/通常unlockや実UIの代用にはしない。

EX-01の形式選択直後に生成/取得へ進む契約を再照合し、二段目の手動取得buttonを撤去した。アプリはready確認後にcurrent actor/epoch/note/operationを再照合してnative anchorをclickし、target別contextでdirty編集画面を残す。匿名は採用済303へ接続。アプリ取得GET404/期限/通信失敗時のdirty非破壊・旧応答は実UIでこれから確認する。開始は保存完了と断定しない。

局所lintの初回14errorは複数変数宣言、3新warningはoptional storage methodのnon-null assertion、3新infoはtest文字列連結だった。自分のpathだけを修正し、23:28の新path19files Biomeは診断なし。全体lint最終はこれから固定する。途中型失敗はstorage narrowingとDOM appendの型衝突であり、明示local guard/bindとappendChildへ修正後に全typecheck成功。全format成功。

23:28:16開始の全unit813/9.01秒成功、続いて23:28:38開始の全Node405/34.81秒成功。db:generate差なし。これらは下記notice補完前のbyteに対する根拠であり、最終候補では再固定する。

匿名303で個別noticeが失われる不足を補完し、Manager採用後、元本文から分けた「書き出しについて」区画をHTML safe aside/MD blockquoteで出力する。定型の除去/後日外部変化/MD閲覧器限界だけを含め、元URL/内部ID/secretは付記しない。profile v2を現在内容identityとworker protocolに含め、noticeも正確なUTF8上界・実bytesへ含めた。匿名formにも一般限界を事前表示。23:30:45のprotocol fixture旧v1による1失敗はfixtureをv2へ更新し、23:31:17のserializer/protocol29対/906msで成功。GET失敗を空file成功へ置換していない。

ports/DBhandles0の再照合後、23:31:19.554 premigrate保全を作成。23:31:58.101にfreshへ新0026だけを適用し、旧63表497列全値差0/72trigger本文一致/FK0/integrityok、ledger27を確認。旧12objects3107Bは保持。23:31台のfull build成功後、新bundleで実worker17対を再実行中。本体runtimeはこの節記録時点では未起動。次は新自己WS/noteだけで同bundle実file/dirty/actor/native/390へ進む。候補ETAは実UI未着手のため初期02:35〜04:35を維持。

## 2026-09-19T23:44:29+09:00 実fileとdirty異常対

23:32:40.376のbefore-ui保全はsource920 `0563181ee9b6f1e6aae998341528846467fe9ac5c220774a30aeb839f9cdd198`、bundle `88376b6014a32e0907f575f859fdf6642d0177a15359356c6631f6a8013ee278`、旧12objects3107B。PID71390/session53944は23:32:40.727 listening。share active second/旧2keyを保持、runtimeは主担当だけが所有する。

notice後の最初のflow17対は、除去がない正常HTMLにもnoticeを必須としたfixture期待で1失敗。noticeがある場合だけの期待へ修正し、実除去HTML/MDを別の2対で追加した23:33:33の19対/4.33秒は成功。23:41:55の22対/4.17秒はさらにremove故障後の予約残存と5秒backoff、active export readerをpurgeが待機→actual close後のspool/note回収、別DB接続で固定rate持続/prune203中100件のみを含め成功。故障注入は隔離fixtureで、fresh破壊の根拠ではない。notice後の全typecheckも成功。

新自己WS `01a0ba18-117e-74d7-9ad3-fab51c3d33fe` / note `01a0ba19-6f4c-74fa-8e2a-8106c3419e30` を通常UIで作成した。新asset `01a0ba1a-4c92-70e4-8a86-b1b917aeffac` は自己SVGの通常uploadによるもの。旧WS/note/member/resourceは破壊対象にしない。現時点で自己対象も削除していない。

23:38:13にapp HTML1347B、23:38台にMarkdown936Bをnative downloadでproofへ保存。HTMLは日本語/通常same-origin anchor/利用者のtoken風text/defaultstyleを保持し、SVG117Bをdata URIに埋込、内部asset URLなし。MDは見出し/code/通常リンク/非対応table safe HTML/同画像/noticeを保持。端末保存完了は製品表示で断定せず、要求した旨だけを表示した。実fileは`app-current.html`・`app-current.md`。元SVGアップロードファイル量と安全化後117Bは区別する。

dirty異常対は自己noteでautosaveのPOSTをbrowser内で保留し、未保存titleを保持した状態で実exportを操作した。23:40台の人工404取得先、23:43台の実固定期限経過130374ms後の取得（同URL照会404）、取得GETだけのnetwork abortで、元edit route/titleが保持され、保存完了表示なし。native要求はtarget別context、明示GET照会でも404/abortを確認。保留autosaveは対の終了後に一度だけ解除して通常保存へ戻した。これらは故障注入のbefore/afterで、通信断を自然発生として報告しない。

最初のbrowserはlaunch UAオプションのみで再作成され空page/認証helper失敗となった。以前の認可済wrapper方式を新proofへコピーし、各操作でHTTP User-Agentを明示してから正常signin。helper全文/credential/secretは読まない。networkidle待機の1回timeoutは新note画面への遷移自体成功であり、snapshotで確認してselector待機へ切替。browser失敗を製品不具合へ拡大しない。

残は限定native/password/no-JS・390/keyboard、actor/note/操作旧応答とACK、source/late採用の狭いfault、自己WSの保全後回収、旧比較/最終checks/commit/全停止。実UI基礎が進んだため候補見込みを2026-09-20T01:00〜02:00+09:00へ更新する。見込みであり終了時刻ではない。

## 2026-09-19T23:59:28+09:00 匿名・viewer・旧応答

同bundleで通常のprivate password準備→限定化→通常native password formを操作し、匿名ページのscript0/CSP script-none、HTML1349B/MD936Bの実downloadを確認。password/リンクはbrowser内だけで扱い、証跡へ保存しない。390幅でoverflowなし、HTML/MD双方のhit、Tab移動とEnter取得が成功。同じ固定windowで6取得成功後の7要求目は制限表示、Backで元画面へ戻った。CDPにはOrigin:nullだけが現れ、Sec-Fetchの3値は省略されていたため、偽の不一致とせず次の正常再起動でserver側booleanを観測する。

Manager許可のviewer fixtureを23:50:58.094に新自己WSだけへ作成。既存editor accountをこのWSだけviewerへ追加し、既存15membershipを保持、同Txでmembership_revisionが1増加した。通常招待/参加の根拠にはしない。viewerで編集導線なし・実HTML取得成功。追加rowも削除直前保全に含める。

actor Aのready200をbrowser fetch境界で保留し、通常signout/signinのA→B→A後に解除した。Bのviewer取得と新Aの操作UIはbusyにならず、旧A解除前後のnative取得数は1のまま、旧statusも出ない。実server200に対する人工遅延であり自然通信障害ではない。

現Aの別requestはserver200後にbrowser境界で故意に失敗へ変換。POST1/取得0で応答不明を表示し、明示復帰操作はPOSTを増やさず、次の利用者明示Markdown操作だけが新POST/実取得へ進んだ。元操作成功を推定せず自動再送しない。note切替旧failure対は途中で120秒idleによりbrowser contextが再生成されたため未完了とし、新しい小対でやり直す。selector記法1回の失敗は要求を発生させていない。

23:59時点で製品追加変更なし、PID71390を単独所有。残は小対と最終固定、候補見込み01:00〜02:00を維持する。

## 2026-09-20T00:07:14+09:00 残小対・自己対象回収

旧failure対を再実行。first noteの実ready200を保留したまま同WSへ新note `01a0ba2f-84c4-7599-b44b-ed90822419c0`（P4b second self）を通常UIで作成し、旧responseを人工rejectへ変換して解除。新note editはidle2button/unknownなし/native0を保持。別の人工pending（server送信前）では中止のfocus/hit/Enter、AbortSignal発火、旧catch非反映、元route保持を確認。前回context消失分を成功へ混ぜない。

00:02:39開始のreal worker/repo統合26対/5.12秒成功。新4対は生成途中の本文変更・trashed、manifest由来sourceを試験adapter境界で欠損/異なるshaへ変える実stream故障。ready/sending採用なし・actual終了後のspool/op回収を確認。source/sha単体に加えた小統合対でありfresh原本を壊していない。

PID71390は00:02:40.689正常TERM/exit0（systemErrors0）。ports3000/3001/DBhandles0後、00:03:11.718 `before-delete-ui`保全。新自己WS1/note2/member2/asset117Bを含み、全13objects3224B。旧12objects3107Bから自己assetを区分する。source920 `34fcedc74846d555a91944f6d9c71a925f0ee5fd023f1085800c91a93e9df344`、同bundle88376b…。

proof専用server preloadはrequestの秘密値/pathを出さずboolean4値だけ観測し、製品は変更しない。00:03:50.033にPID81624/session97887で同bundle再開。00:05:13.455の実native export formはOrigin:null、Sec-Fetch-Site=same-origin/Mode=navigate/Dest=documentの全boolean true。実HTML `native-metadata.html`取得に成功。手製headerの隔離対と区別する。

保全済み新自己WSだけを通常UIで削除。00:06:15に受理/個人へ遷移、00:06:18にnote2/2と回収完了、00:07の明示更新で確認。自己WS/member2/note2/asset117Bを回収し、アプリundo不可・削除前保全コピー有・復元未実行。旧対象は削除しない。

PID81624は00:07:00.665正常TERM/exit0/systemErrors0。ports/DBhandles0後、00:07:14.637 `before-final`保全。12objects3107Bはstartとkey/bytes/sha完全一致、自己asset117Bのみ減少。copy driver比較は旧63表497列/72trigger本文保持、notes103/member15/assets2/originals9/revs111/tags31、export_operations0/rates0、FK0/integrityok。旧FTS物理segment差とoutbox旧1行の処理進行は別途論理/field比較で区分する。旧全文全byte不変とはまだ宣言しない。

## 最終根拠索引

Tは主担当による今回の再実行、Uは同bundleの実UI/実file、Cはコード・型の照合、Dは専用copy driverの保全比較。補助の初期26unitは借用Bとして前節に記録し、最終表のTへ無条件に置換していない。最終の全unit/Nodeには統合後の補助pathも含まれる。

| 固定条件 | 自己判定・根拠 | 限界・根拠の区別 |
| --- | --- | --- |
| P4b-A | 合格候補。T `exportFlow.integration.test.ts`: empty本文、別session、現在viewer→membership取消、変更内容、生成途中変更/trashed、限定browser/grant epoch、同内容移動→旧WS削除後取得。C `snapshot.ts` のcurrent read/ready asset/reference照合・identity、`usecases.ts` の採用Tx/GET再認可。U app owner/viewer、通常password通過匿名で実file。 | grant取消・同内容移動は隔離実DB、viewer追加は許可されたfixture。通常招待の試験ではない。history/draft/source原本への昇格禁止はsnapshot/serializer Cと既存read policy Tの範囲。 |
| P4b-B | 合格候補。T `exportDocument/plan.test.ts` のdefault/original style・dangerous CSS・通常anchor・未許可媒体/slot・安全notice、flowのassetなし小SVG/HTML removal notice/201→200上限と3回再検査。U current117B SVG埋込HTML、scriptなし匿名実取得。既存 `reference/safeFetcher.test.ts` の8並行/5秒/200超過/caller abort/private DNSを今回全unitで再実行。 | DNS対はmock/fake timer、実外部通信なし。fresh画像は安全化後117B、元upload111B。外部上限超過・不能は除去notice、未取得stylesheetは復活しない。800KiB最大媒体組合せの実成功を主張しない。 |
| P4b-C | 合格候補。T planのMarkdown syntax escape/URL percent・entity/definition collision/marker衝突/HTML fallback/厳密bytes、flowのHTML/MD実worker・小inline・notice。U app-current.md936B/limited-current.md936B、code/table/画像data URI・通常ページanchor。C `stream.ts` はtext16000 UTF-16単位/媒体65535B chunk、base64全量AST保持なし。 | 利用者の `/s/user-written-text` はHTMLで保持、MDでは構文escapeされたテキストとして保持する。アプリ由来内部asset URLは除去、secretは出力へ挿入しない。任意MD閲覧器のdata URI/HTML対応保証なしをUI/fileに表示。 |
| P4b-D | 合格候補。T repoのready/sendingを含む2slot/二重claim/旧cleanup token/予約維持/恒常設定不足、flowのlate内容/trashed・missing/sha・active reader purge待ち・remove失敗backoff・boot recovery/容量不変。T source300001B逐次sha/bytes/cancel、lifetimeのactual task/close待ち・fixed期限・stop、workerの30秒fake timer/terminate await。U ready130374ms後404/dirty保持、正常drain2回、自己WS2note/117B回収。 | 128MiBはWorker old-generation設定のCであり、故意OOMやプロセス全RAM上限を実測していない。30秒はfake timerと親Abort接続、120秒は実経過とfakeの両根拠。2GiB実消費/最大規模試験なし。恒常不足はsmall設定のrepo Tで管理者調整message分類を確認。 |
| P4b-E | 合格候補。T flowの認可済HEAD405/Range416→同readyGET200、MIME/Content-Disposition/no-store、native strict metadata→303、cross-origin拒否、429/Retry-After60/匿名title非露出。T filenameの空stem→ID/CRLF・path/予約名/Unicode、repoの並行8中6受理・世代/発行token変更後非reset・30全体・非延長/接続再開/prune100。U 実native metadata4boolean true、固定6→7拒否/Back、実attachment。 | 世代変更は隔離DB fixtureであり通常共有再発行UIの再試験ではない。rateは専用表でpassword rate非共用。CDPに現れないheaderをfalseと扱わず、server観測を別記した。 |
| P4b-F | 合格候補。U 詳細/編集/限定のHTML・MD native実file、390/Tab/Enter/hit、pending中止、dirty404/期限/abort保持、A→B→A旧success非反映、note切替旧failure非反映、ACK200喪失→明示復帰POST0→新明示操作、匿名script0。C `NoteExportAction.tsx` current actor epoch/note/path/serial/mount guard・React transition。 | browser faultは注入である。途中idle context消失は失敗/未完として残し、後の小対で完了。開始を端末保存完了とは表示しない。PDF/ZIP・仮job・公開は未実装。 |
| P4b-G | 合格候補、最終固定値は次節。T 型/全unit/全Node/新worker bundle、D clone新0026だけ・旧63表497列全値/72trigger一致、fresh移行前後一致。D 最終旧本文/版/pin/holding/receipt/共有/profileの旧行保持、objects/charges/FTS論理一致。U 同bundle。 | 新migrationのみ、lock/依存追加なし。Node単一runtimeだけが実接続・実検証対象。他runtime、外部サービス、大型fixture/SLO、独立検証は未実施。 |

実変更した先行11条件の再確認は変更境界に限る。P1-Eは新HTTP dispatch/serialize、P2b-Dは同値DEFAULT_DOCUMENT_CSSとstyle pure対、P2c-1-Eはedit共存/dirty/旧応答U、P2d-2-B/Cは新writer/claim/purgeのT、Eは新schema/UoWとD、FDはlifetime actual終了待ちTと正常TERM U、P3c-Fはdetail導線U、P3f-D/Hは現在note purge/旧WS先移出Tと新移行D、P4a-Dは匿名form/cookie/元grant束縛のT/U。既存全FD耐久試験等を機械的には再反復していない。

00:09:50.859の `comparison-extra.json` は両copy FTS integrity成功、term/doc/column/offset8253件全一致。旧FTS segment物理行は一致しない。旧outbox1行の差はprocessed_at null→setだけ、他旧列は同一。新自己イベント2と処理済み記録の進行、sqlite_sequence note_projections132→137、自己回収/物理writer履歴の追加を意図差として分ける。旧12scope容量は2320/0/0/516/0/0/0/75/0/113/83/0で全一致、capacity provenance違反0、active writer0/未完物理delete0。補足driver初回は列名をstateと誤ったSQLが失敗し、実schema active/doneへ修正してcopyだけで再実行した。

## 2026-09-20T00:15:08+09:00 完成候補固定

- 製品のみ44filesのcommit: `6539a61e4852dd08cf52a85c451c5d4aed867bc8`（管理文書はstageしない）。製品worktree clean、残は未追跡 `.goal-implement/` だけ。
- source920: `72f6a7d05485315e5c6d86e45aa75008b39251af878adc7fc6352d296bd73083`。
- lock: `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a`（開始と不変、新依存なし）。
- bundle: `88376b6014a32e0907f575f859fdf6642d0177a15359356c6631f6a8013ee278`。最終build後も同bundleであり、前記U/実fileへ対応。追加変更は試験だけなので実UI全量の再反復はしていない。
- 最終private保全: proof `final/`、00:15:08.274 JST。main DBは `before-final/` とcmp一致、12objects3107B。finalはdriver直結しない。

最終checksは `pnpm typecheck` 全package成功（00:14台の最終再runも成功）、`pnpm lint:fix` 702files/no fixes/旧36warnings34infos、`pnpm format` と最終 `format:check` no fixes、`git diff --check` 成功。新3対の2filesも限定Biome clean。db:generate:nodeはschema差0、新0026以前のmigration/snapshotは変更しない。

全unitは00:08:20開始79files/815tests成功、8.76秒。全Nodeは00:09:13開始30files/414tests成功、34.92秒。根拠索引で不足していたexternal201→200、並行8中6/再発行非reset、認可済HEAD/Rangeの3対を追加した初回00:10:54は28成功/1fixture失敗（未発行共有rowのgenerationだけを変えて既存CHECKに違反）。token fixtureと発行世代を整合させた後、00:11:49開始30files/417tests成功、34.90秒。HTTPの429/Retry-After60/title非露出も同runに含む。

終了出力回収時点で前runがまだrunningを返したため、その後開始したbuildとの末尾負荷重なりを最終条件の根拠にしない。build成功後、他のheavy checkを同時起動せず00:12:55から全Nodeをもう一度実行し、30files/417tests、34.99秒で成功。閾値緩和/skip/並行失敗の隠蔽はない。最終buildは00:12台成功、既存bundle指紋と一致。

保持確認は `migration-clone/comparison.json`、`fresh-migration.json`、`comparison.json`、`comparison-extra.json`。旧63表497列・旧72triggerの内容/型保持、全旧行保持の例外はFTS物理segmentと前記outbox processed_atのみ。旧note103は全active、31tags/9originals/2assets/111revisions/95heads、activeWS9/member15、batch19parents/48targets/51attemptsを保持。最終workspaces19のうちactive9/deleted10。自分の新WS1/note2/member2/asset117Bだけを回収、object13/3224B→旧12/3107B、export op/rate/active writer/未完deleteは0。通常undo不可、`before-delete-ui/` に復旧用コピーを保持、復元は未実施。

### 安全な再開手順と所有返却

Node実パスは `/nix/store/4gl9pclv6ygwmgpg1gijza978bqbmpga-nodejs-22.22.3/bin/node`。同Nodeでproofの `server.mjs` を実行すれば、現在fresh `p3c-20260911-dyHGjx`、localhost3000、production、既存share key IDs `p4a-first,p4a-second` / active `p4a-second` へ接続する。key値/secret hash/環境全文/argvを出さず、旧keyを保持する。wrapperと `metadata.mjs` は秘密を出さないboolean観測・正常stop markerだけを出す。再検証用に編集する場合は新private proofへコピーして使う。新0026は適用済みledger27で、再適用・lock手削除は不要。

起動前にports3000/3001とfresh DB/sidecar handles0を確認。終了はchildへ通常TERM→wrapper close0→ports/handles0の順とし、live distにbuildを重ねない。sole保全DBでdriverを動かさず、新copyを作る。検証は新自己WS/note/resourceだけ、破壊前は停止下保全し対象量/undo不可を明示。既存103notes・旧12objects・別WS member/profileは破壊試験へ使わない。

認証は既知fresh `helpers/auth.cjs` の実行専用 `fill owner|editor|outsider`。helper全文・秘密値は読まない。新しい自己session `p3c-fresh-p4b-...` とproof `browser.cjs` を使えばHTTP Chrome UA/20秒timeout/120秒idleとtoken URL redactionが入る。共有password/tokenはbrowser内だけで生成/入力し、snapshot/URL/network/cookieをraw出力しない。自分のsessionだけ閉じ、global cleanupをしない。外部メール/API/有料接続/旧環境D01等への接続は一切不要で未許可のまま。

再利用可能な非秘密手順は、通常UIで自己WSとHTML/SVGnote作成→app HTML/MD download→sharing private password準備/限定化→匿名通常unlock→native form実file、同じcurrentでtitle/body/style/link/data URI/内部媒体URL除去を確認する。proofの小実fileは利用者secretを含まない。境界故障はcommit内の29export Node対、source/lifetime/plan/writer/safeFetcher unitで再実行可能。最大本文/巨大媒体/全RAM/OOM/native全SLO/全MD閲覧器・後日外部変化・他runtimeは未検証または保証外であり、成功範囲を拡大しない。

最後のruntime81624/session97887は00:07:00.665正常exit0。71390も正常終了、自己browserは00:11台にclose済み。00:15:08固定時ports/DBhandles0。これ以降、全文確認と最終停止通知だけを行い、全製品/DB/runtime/browser/test/build/git/報告書の操作を停止してManagerへ所有を返す。
