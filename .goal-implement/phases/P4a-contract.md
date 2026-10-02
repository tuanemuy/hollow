# P4a 限定共有の共有契約案

2026-09-19T19:35:45+09:00 時点の採否用提案。P3f review 中の製品を読み取っただけで、P4a の実装・方式採用・検証成功を意味しない。変更対象は本書のみ。

## 提案の要約

最初の slice は private↔限定、リンク取得/再発行、任意password、匿名の現在本文/current媒体、実creatorの表示名、本人表示名設定から元共有panelへの復帰、失効までとする。SH-01〜06/08 の該当部分と AC-07 の表示名だけを接続する。SH-05 のdownload、public、公開プロフィール、公開検索、handle/初回世代、アイコン/bio、EX、Google/Drive、AC-03 は残す。

採否をお願いする最小案は次の7点。

1. note 1対1の sharing row を唯一の正本とし、現在 Note/DTO のprivate固定を同row読取へ統一する。通常保存/変換/復元/移動は共有状態を書かない。
2. 限定routeは `/s/{token}`、媒体は `/s/{token}/assets/{assetId}`、unlockは `/s/{token}/unlock`。public note routeは決めない。
3. 32ランダムbytesのtokenを検索用hash＋再表示用AEAD envelopeで保存する。共有専用key ringを使い、招待key/招待portは変更しない。rotationはURL/token/grantを変えない。
4. passwordは8文字以上、既存scrypt primitiveを利用し平文再表示なし。匿名browserに束縛したDB grantを認証成功から固定24h、visibility/private・password操作・明示再発行で失効する。
5. password試行はDB永続のlink/browser制限＋link全体制限、Nodeのhash同時実行枠を持つ。具体値は後述。IPや未検証proxy headerを必要条件にしない。
6. creator表示は `named / unset / deleted / unknown` を区別する。本人表示名設定のみ先行し、未設定を「表示名未設定」とする。email・架空名・known creatorのunknown化で補わない。
7. 外部readはserver正本snapshotから組み立て、Tx外描画/媒体I/O後にも現在認可とsourceを再確認する。共有操作はshareVersion＋note/所有確認版、UIはactor epoch＋note＋panel operationで束縛する。

いずれも新提案の細部は未採用。特に表示名未設定文言、private時grant失効、private中の再発行、入力上限、rate値、key運用、具体routeはManagerの採否対象。

## 入力と現在の接続事実

[P4-plan](P4-plan.md)全文、[SH原文](../../spec/scenario/sharing.md)全文、[AC-07](../../spec/scenario/account.md#ac-07-プロフィールと公開ハンドルを編集する)、designのP3f/P4採用判断、planの関係IDを読んだ。

- `domain/note/entity.ts` / `application/note/view.ts` / `noteRepository.ts` はvisibilityがprivate固定。DBには共有列がない。`noteRepository.save` は本文/lifecycle/display/version/updatedAtだけを更新するので、別共有rowと相性がよい。
- `getNote.ts` のapp用creator表示は自分/email/閲覧不可。匿名へ流用できない。accountsは表示名を持たず、creator_idは保存されているがaccount FKではない。既知IDのaccount不存在と旧creator記録なしを区別できる。
- browseの有限DTO/readerは公開状態をまだ持たない。共有状態をprojectionに複製せず、現在共有rowをread snapshotでjoinする。
- `TokenGenerator` はrandom32bytes/base64urlとSHA256、`PasswordHasher` はscrypt(N32768,r8,p1,maxmem64MiB)。再実装せずprimitiveを再利用する。ただしaccount password validationの12文字/英数字条件は流用しない。
- 現 `TokenProtector` は招待専用AAD/エラー/32B単一key。共有用にinvitationIdを偽装したり同keyを暗黙借用しない。
- `renderNote` はsessionと投稿HTMLを受けるeditor用。`renderAuthorizedHtml` は安全化済み描画を共用できるが、外部inspectのawaitがある。
- `NoteContent` iframeは`allow-same-origin`のみでscript不許可・no-referrer。`frameDocument` と `resourceRequestGuard.node.ts` は現在app media URLだけを許可する。匿名URL用の明示allowlist接続が必要。
- `mediaHttp.node.ts` はGET/HEAD/single Range、storage stat/streamを認可後に実行する。匿名版は専用認可入口とし、既存app/history/draft入口を緩めない。
- `noteMoveRepository.apply` はowner/version/ownership_generationを更新するがcreator/updatedAtは保持。`purgeRepository.finish` は同Txで削除WS対応を確定してnoteを削除する。
- Node fetch入口は現状Requestだけで、信頼できるclient IPはapplicationに渡していない。未検証X-Forwarded-Forやclient指定IPをrate正本にしない。

## 正本・schema・型

新migrationだけで以下を追加する案。0024以前のSQL・snapshotは不変。番号は正式着手時HEADから決める。

| 正本 | 最小fields/制約 | 寿命・更新者 |
| --- | --- | --- |
| `note_sharing` | note_id PK/FK ON DELETE CASCADE、visibility(private/link/public)、share_version、link_generation、token_hash UNIQUE nullable、token_envelope nullable、password_hash nullable、grant_epoch。token3項目の整合CHECK、linkならtoken必須 | noteと同寿命。専用SharingRepositoryだけが共有値を更新。P4a mutationはprivate/linkのみ、public値を入力可能にしない |
| `share_grants` | note_id FK cascade、browser_hash、link_generation、grant_epoch、verified_at、expires_at、PK(note_id,browser_hash)、expires index | expires=認証成功時刻+24h。read/媒体取得で延長しない。再認証の成功だけ新24h。期限過ぎは読取時拒否、有限prune |
| `share_password_rates` | note_id FK cascade、bucket_kind(browser/link)、subject_hash、window_start、attempts/blocked_until、updated_at | 過去履歴ではなく現rate状態。15分無活動後reset、不要rowを有限prune。平文token/password/IPを保存しない |
| `account_display_names` | account_id PK/FK cascade、display_name nullable、profile_version | 表示名だけの専用正本。未設定row不在はunset。現在本人だけwrite、既存account行/password/sessionを再構築しない |

public identity/URL generation列はこのsliceでは追加・発行しない。note IDと共有link identityの移動不変を守り、publicの未決世代をlink_generationやownership_generationで代用しない。後続publicでは新migrationで独立identity/世代を加える。

既存noteにはprivate・share_version0・tokenなし・passwordなしを移行で追加する。新規note insertと初期共有row insertを同UoWで行う。移行途中を通常起動しない。移行後のsharing row欠落は「privateだろう」とsilent fallbackせず整合性エラーにする。

`Note.visibility` は共有rowから組み立てる読取値にし、DB正本を重複させない。`notes.save` は共有値を受けても書かないことをport契約へ明記するか、より明確に本文専用保存型へ分離する。既存revisionはtitle/html/styleだけを保持し、過去版restoreがvisibility/token/passwordを戻すことを禁止する。共有設定変更は本文版・updatedAt・20版/pinを進めない。app一覧/detailは同snapshotの共有DTOを表示し、検索projectionのbody更新を要求しない。

提案する内向きportは `SharingRepository`（設定read、version条件付き変更、grant/rate）、`ShareTokenProtector`（目的・note・世代付き暗号化/復号）、`AccountDisplayNameRepository`（本人更新と最小著者read）。乱数/hash/clockは既存ports、HTTP/cookie/clipboardはpresentation、crypto実装はNode adapterに置く。外部閲覧の認可はapplication内の独立policyとし、汎用skipAuthorizationを加えない。

## token・鍵・rotation

tokenは32bytesのCSPRNGをbase64url化した43文字。境界ではこの正規形だけ受け、照合hashをindexed lookupする。tokenの原文は専用panelの現在編集者への取得結果にだけ返し、一覧/通常NoteView/ログ/outbox/job/一般receiptへ入れない。共有URL自身が秘密bearerであることは表示する。

envelopeはAES-256-GCM、ランダム12B nonce、16B tag、version/kidを持ち、AADを`hollow-note-share-v1 + noteId + linkGeneration`へ固定する。既存招待の実装方式を踏襲するが、専用port/key用途を分ける。一般のtoken検索はhashだけで成立し、匿名readで復号しない。

運用案は共有専用key directory（owner0700）＋kidごとの32B key file（owner0600、regular file/symlink拒否）とactive kid設定。値はコード/DB/ログ/argvへ出さない。起動時に許可されたkidだけloadし、active keyを生成/encryptに、ringの旧keyをdecryptに使う。鍵の自動生成や既存招待keyへのfallbackを起動処理に入れない。

- 通常rotation: 新kidを追加→新active指定で正常再起動→旧kidは保持。既存tokenのhash/generation/URLは不変、明示panel read時または有限50rowの保守処理でenvelopeだけ新keyへ再保護する。compare-and-swapで再発行競合を上書きしない。残旧kid参照0を確認してから旧keyを廃棄する。key rotationはgrant失効理由にしない。
- keyの保持期限は任意TTLで決めず、現存envelope参照と保全世代の復元要件に従う。DB backupとkey backupは分離し、復元時に対応kidを必要とする。key全廃棄を通常rotationとは呼ばない。
- key未設定/誤key: 発行/再発行/既存copyは明確な運用エラー、平文保存や恒久的な「再表示不可」で代用しない。private化と既存hashによる匿名認可/既存grantの照合は継続可能にする。正しい旧key復旧で同URLを再表示できる。全必要kidを用意して同key再起動を検証できるまで本slice完成とはしない。
- key漏洩時の緊急リンク全失効は通常rotationと別。有限一括再発行の新業務機能を本sliceへ追加しない。対象リンクの明示再発行/非公開化と運用手順を示す。

privateには既発行token/passwordを保持する。private→linkで同tokenが復活する。明示再発行だけtoken/generationを交換し、旧URLは永久無効、password設定は維持する。

原文SH-04は「発行済み」を前提にし、private中を禁止していないため、private中でも既発行tokenの明示再発行を許す案とする。状態はprivateのまま、秘密URLは表示しない。確認文は「再度限定公開にした場合も旧リンクは復活しない」とする。未発行privateに再発行は出さない。これは原文からの提案解釈であり採否対象。

## password・24h grant・rate

passwordは8 Unicode code points以上。勝手なtrim/正規化・英数字混在条件を加えず完全一致にする。transport DoS上限としてUTF-8 1024Bを提案し、入力画面にも明示する。これは原文の8文字以外の安全上限として採否を要する。hash primitiveは既存scrypt、平文はリクエストとhash計算中だけ、DBにはsalt付きverifierのみ保存する。

hash/verifyは長いDB write Tx内で行わない。事前snapshot→有限hash枠→commit用UoWでsession/current edit/note/owner active/lifecycle/shareVersion/確認版を再照合する。unlockも事前rate予約Tx→Tx外verify→現在token/generation/epoch/lifecycle/ownerを再確認するTx→grant確定の順とする。処理中に状態が変わった成功をgrantへ採用しない。

匿名browser cookieはrandom32B、DBはhashだけ。`HttpOnly; SameSite=Lax; Path=/s; Secure`（localhost HTTP検証だけSecure例外）、Max-Age24h。account sessionへ昇格させない。別noteをunlockしてcookie保持が更新されても既存grantのexpires_atは延長しない。cookieなし/破損は新しい匿名browserとして扱い、既存grantを推測で引き継がない。閉じ直し/reloadで有効grantを使い、期限境界 `now >= expires_at` はgateへ戻る。

unlock/共有設定/profile変更はPOSTだけとし、同一Origin確認と既存CSRF境界を維持する。tokenやpasswordをqueryへ加えない。unlockは本文サイズをJSON decode前にも制限し、passwordをerror payloadへ反射しない。cookieを書けない場合は24h保持を成功表示せず再入力の案内をする。

| 操作 | token | password | 既grant |
| --- | --- | --- | --- |
| 初回限定 | 新規発行 | 任意に設定 | 設定時は新epoch |
| 限定→private | 保持 | 保持 | epochを進め失効する案 |
| private→限定 | 同token復活 | 保持 | passwordありなら再入力。private前grantを復活させない案 |
| password変更 | 不変 | 新hash | epoch更新・全旧grant失効 |
| password解除 | 不変 | なし | epoch更新・旧grant失効。ただし以降tokenだけで全員閲覧可、事前確認必須 |
| 明示再発行 | 新token/新世代 | 保持 | token世代/epoch更新・全旧grant失効 |
| 所有移動 | 不変 | 保持 | 現在note所有で再認可。移動だけでは失効しない |

privateでのgrant回転はSH-01の即時停止とSH-06の通過状態を安全側に組み合わせた新提案。原文がprivate再限定時のgrant再利用を明示しているとは扱わない。trashは現在lifecycleで停止、restore時は同token/passwordを保持する。trashそのもののgrant epoch回転は追加せず、有効期間内のgrantは復元後に再利用可能とする案（privateとの違いを試験にする）。

rate初期値の提案:

- 有効token単位＋browser hash: 15分の連続失敗を数え、1〜2回は待機なし、3〜7回は1/2/4/8/16秒、8回で15分block。成功時そのbrowser bucketだけreset。
- 有効link全体: 15分に60回までのpassword検証予約。browser cookieを捨てても上限を迂回しない。61回目はRetry-After付き429、title/断片なし。既に有効grantを持つreadはこのpassword失敗制限で停止しない。
- Node password計算は同時2、待機8、待機3秒超/満杯は再試行可能503。ユーザーpassword不一致とは区別する。applicationは枠portを使い、account認証の既存規則/枠を変更しない。
- 存在しないtokenごとのrate行は作らず共通404、入力長もhash前に拒否する。既知linkへの悪意ある試行が新規unlockを一時的に止め得るtradeoffを運用説明に残す。bot無制限対策の完全保証ではない。proxy/IP基盤追加を本sliceの前提にしない。
- DB rate/grant pruneはexpiry indexから1step100件、既存周期処理に有限掃引として接続する案。rate不足を無制限DB増加で補わない。最終値は正常/連続/並行/再起動実測で確認し、不成立ならManagerへ代案を返す。

## 限定read・媒体・server snapshot

`readSharedNote(token, browserCredential, optionalAppSession)` の結果は `notFound | passwordGate | readable` のunion。無効/旧token/private/trash/purging/物理削除/現owner不存在・deletedは同じ404。passwordGateはgeneric titleと入力だけで、note ID/title/tag/著者/断片を先出ししない。protected媒体のgrant不足も本文なし404とし、assetの有無を漏らさない。

readable DTOはtitle/sanitized描画HTML/display/updatedAt/current tags/公開用author/current媒体の許可URL/任意の現在編集導線だけ。Original名/bytes、conversion内部、履歴、draft、membership人数、email、storageKeyを含めない。タグは現在noteのタグ名を表示するだけで、未実装public searchへ空リンクを作らない。

同read UoWでtoken→sharing→note/lifecycle→現在ownerの存続を確認する。WSはactive必須、personalはowner account存在必須。membershipの有無を匿名link認可へ混ぜない。脱退/除名された本人も有効link/passwordの独立根拠があれば読めるが、app編集へ昇格しない。

serverが保存HTMLを取得し、内部asset URLを当該noteのcurrent ref(version0)・readyに限定して列挙/匿名URLへ書き換える。入力にHTML・任意noteIdを受けるrender APIは作らない。history専用URL/draft/別note/refなしassetは承認しない。処理対象は1noteの既存800KiB境界と既存参照数境界であり、全note本文をJSへ集めない。

Tx外の外部inspect/安全化描画後に、応答採用前の同read UoWでtoken/epoch/grant期限/current owner/lifecycleと取得snapshotのnote版・HTML/title/display・tags・author現在値を照合する。変化したら古い本文を返さず、権限消失は404、依然読める内容更新は有限1回再読取、なお変化なら再試行案内にする。本文とmetadataを別世代で混ぜない。原文HTMLと描画用URLをDBへ逆保存しない。

媒体は毎GET/HEAD/Rangeで、同token＋現在grant＋現在note所有/lifecycle＋asset current ref/readyを照合する。stat/stream開始後にresponseを採用する直前にも同束縛を再確認し、失効ならstreamをcancelして404にする。Range/416のサイズ情報は認可後だけ。private no-store、no-referrer、nosniff、script不許可CSPを維持する。配信開始後に既に送ったbytesを回収する保証や無限監視は追加しない。

frameDocumentには型付きの匿名媒体allowlistを追加するか専用builderを設ける。既存app regexを広げて任意`/s/` URLを許す方式にはしない。resourceRequestGuardにも当該匿名媒体GET/HEADのsame-originを明示接続する。iframeはallow-same-originのみ、scripts/forms/connectを許可せず、外部参照失敗でも本文は残す。

全限定応答はnoindex/nofollow、Cache-Control private,no-store、Referrer-Policy no-referrer。token URLをcanonical/public sitemapへ出さず、analytics/access/error logではpathのtokenをredactする。SSRと通常ブラウザ・botで同じgate/404を返す。bot判定に依存するapp RSC経路を匿名成功の代替証拠にしない。

## 共有操作・表示名・UI

共有panel readは現在session＋read権限で、状態/保護あり/発行済み/現在scope説明を返す。member本人にだけmember countをSQL countで返し、匿名author DTOには入れない。viewerはreadonly。raw token reveal/copyと設定writeは現在editor/ownerだけに限定する案。readonly viewerへリンク再配布権を新設しない。

commandは `{noteId, expectedShareVersion, expectedNoteVersion, expectedOwnershipGeneration, expectedScope, operation}` の判別union。expectedScopeは現在所有とWS membershipRevision/表示name（personalはrevision0）を持ち、既存MoveScope型の責務を参考にする。設定変更、password解除、再発行の確認は該当versionへ束縛する。毎commit時に現在session/current edit/active owner/note lifecycleと表示した確認値を再検査し、旧panelからのrole喪失→再付与、移動往復、確認後本文/所属/人数変更は409再確認。本文なしprocessing/needs_aiから限定化を拒否し、現在本文のあるnoteは既存statusを共有不可へ乱用しない。private化はkey不要の失効操作だが、OCCを迂回して他人の新設定を上書きしない。

旧expectedの再送が二度tokenを回転させることを防ぐ。ACK喪失時は同noteの現在settings GETで状態を確認し、新token自動発行・password自動再送はしない。現在値が同じだけで元操作成功と断言せず、「前の結果は確認できません。現在の設定」を表示し、必要なら最新versionを確認して明示新操作。token生成はcommit成功前にUIへ出さない。

表示名の型は `{kind:'named',displayName}` / `{kind:'unset'}` / `{kind:'deleted'}` / `{kind:'unknown'}`。現在creatorIdがありaccountが存在すればnamedまたはunset、account不存在は「退会した利用者」、creatorId元からなしだけ「作成者不明」。現在owner/uploaderへ置換しない。本人がWSを脱退しても存続creatorの表示名を取得するため、公開用readはmembership依存の`getNote.creatorDisplay`とは別にする。

本人設定route案は `/settings/profile` の表示名sectionだけ。current sessionから本人を決定し、client accountIdをwrite認可へ使わない。入力はtrim後0〜50 Unicode code points、空はunset、制御文字/改行拒否を提案する（未採用安全境界）。表示名の一意性/handle式検査はしない。保存はprofileVersion OCC、pending/入力保持/競合を提供する。

共有panelに「自分の表示名を設定」を置く。既知creatorが別人の未設定ならそのまま「表示名未設定」で、editorが他人の名前を補う操作は出さない。未設定を限定化の新しい禁止条件にはしない。`returnNoteId`＋固定`resume=sharing`だけを境界検査して保持し、設定後に現在session/current note readを再確認してpanelへ戻る。任意URL/open redirectは受けない。復帰は古い共有変更の自動再実行ではない。失効時は個人への導線と未保存保護を残す。

UI所有者は存続するnote detail側のclient island。actorId一致だけでなくactor epoch＋noteId＋route/dialog operationIdで旧success/catch/finally/copy通知/focus復帰を拒否する。設定経由の帰還やA→B→Aでも同様。未保存本文があれば既存guardへ接続し、共有操作のために暗黙保存/破棄しない。共有対象は保存済み本文と説明する。390px、keyboard、copy拒否時の選択可能text、取消、二tab競合を実操作する。

SH-07のpublicにするbuttonを成功風の仮実装で置かず、後続未提供を明示する。表示名更新はnote URL/token/本文版/更新日時を変更しない。AC-07全体やプロフィール公開を完成としない。

## 移動・削除への接続と影響ID候補

移動後もsharing row/token/password/grantは保持し、current ownerで読取/編集を評価する。移動確認の「失う人」はmembership由来のapp accessと外部link accessを区別する。限定リンクを持つ旧memberは匿名根拠では読めるため、全面的な閲覧喪失と表示しない。MoveExpectedへshareVersion/visibility/password有無を加える案とし、確認後共有変更は再確認にする。token値はmove/batch payloadへ入れない。単一moveと一括moveのinspect/expected/receipt鎖比較に同じ型を接続する。

trashはsharing rowを残してURLを現在lifecycleで止め、restoreは同tokenと設定を保持。purgeではsharing/grant/rateをFK cascadeまたはfinishの明示削除で同Tx除去し、note削除をFKで塞がない。WS削除は全note sharingの同期一括更新を加えず、匿名read/媒体/unlockのcurrentWS active fenceでadmission前から停止させる。先に移出した存続noteは元WSの削除で失効しない。

以下は実編集前の影響候補で、まだreopenを要求しない。正式実装時にfile/責務が確定した行だけManagerへ返す。

| 対象ID | 実変更時の責務 |
| --- | --- |
| P1-B/D、P2a-B/C、P2c-1-D | note insert/読み取り型とprivate既定、変換/保存/版restoreで共有状態保持。本文空の公開拒否 |
| P2b-A/D、P2c-1-C | 匿名frame/mediaとdisplay共用、既存app/history認可を緩めない。history側無変更ならCの再open不要 |
| P3c-B/F/G | 一覧/detailの現在共有badge/creator/説明、有限snapshot joinとUI、移行保全。検索語意味/FTS自体は変更しない |
| P3d-2-A/B/F、P3e-C/E | 移動確認の共有版/閲覧者説明、単一・一括expected同内容/receipt鎖比較の接続。物理ownership/charge方式は不変 |
| P2d-1-A/B、P2d-2-C/E | trash/restoreの同リンク保持、purge新FK cleanup、clone旧全列保全 |
| P3f-B/D/H | 匿名新入口のcurrent owner fence、先移出/移入/削除順、共有row追加migrationと保全。既存削除workerの全件更新は加えない |
| P1-E、P3e-B | Node共有key/HTTP入口・設定route/root現在actorに実編集がある場合のruntime/UI境界のみ |

P3b-1-Fは招待key/portを変更しない限り再open不要。P2d-2-FDもDB adapter/停止方式を変えない限り不変。「近くのfileだから」という理由で全先行を再openしない。

## 正式着手後に必要な成立確認

1. 新migration clone: 全旧列/trigger本文/FK/20版/pin/holding/objects/chargeを保持、既存note sharing private一意、account/password/session無変更。通常save/変換/復元後もshareVersion/token/password保持。
2. 個人とWSのowner/editor/viewer/非member/匿名を対にし、member-loss後もlink根拠だけは独立、編集導線は現在editorのみ。別note/current refなし/history/draft/原本の漏洩0。
3. private→限定同token、private中再発行、再発行password保持、旧token404、password変更/解除/privateによるgrant失効、24h境界・非延長、同key再起動・key欠損回復・旧kidからrotation後同URL。
4. 外部inspect・媒体stat/stream前後・passwordverify中のprivate/再発行/trash/WS削除/移動/本文更新競合。古いsnapshot/旧grant/旧編集権の採用拒否と、配信済bytesの限界を分離。
5. 本文/title/tag/著者なしのgateと共通404、SSR/bot/通常Chrome、script/CSS隔離、外部失敗継続、GET/HEAD/Range/416/no-store/referrer、rate並行/再起動/有限prune。
6. 実表示名変更→限定閲覧反映・設定帰還、unset/deleted/legacy unknown区別、copy fallback、未保存保護、actor A/B/A/閉じ直し/旧finally、390/keyboard。download/publicは残条件として明示。

数値・schema・portは未実行の詳細案。P3f受入と正式P4a委譲、上記採否後にのみ製品実装を開始する。goal-implement/manager-loopに従い役割と所有境界を維持した。本タスクではgoal API/spec/spec-implement/agent/外部API/テスト/build/git/DB/runtime/browser/既存証拠を操作せず、sourceと要求文書の読取、本書の作成だけを行った。本文の最終確認後は読取・文書書込も止め、環境は引き続きVerifierの単独所有とする。
