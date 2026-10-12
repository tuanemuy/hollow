# P5d: 退会の共有設計

[現行接続案](../phases/P5d-current-plan.md)の accounts 縮小 deleted 枝を第一候補として採用する。認証用 Account は active-only projection を維持し、既知退会者の表示と回収には別の人物状態読取を使う。既 account ID と存続 WS・移動済みノートの provenance FK を保持し、架空メールや偽 password を入れない。別 identity anchor 表へ全 FK を付け替える方式は、現時点では変更範囲が広いため採らない。正式な型・DDL・移行検証は P5d 詳細化で確定する。

退会は本人確認・唯一 active owner の同 Tx 検査・不可逆 account fence・認証/公開プロフィール/membership の失効・取消/回収 intent を原子的に受理する。物理回収は永続 account-deletion intent と専用 purge cause から有限 cursor で続け、実所有の終了待ちを退会猶予にしない。actor、現在所有 scope、cleanup authority の判定を分離し、creator/uploader 一致だけで WS や移動済みデータを削除しない。個人 URL は current scope 失効で404とし、handle を解放しても旧著者を再取得者へ付け替えない。

退会用のDrive秘密縮小は[再開詳細化案](../phases/P5d-resume-plan.md)の限定redacted枝を第一候補として採用する。不可逆退会後、既実所有の閉鎖/ACKを確認してcurrent headを除き、既target/record IDを持つ取得不能shellへ縮小する。全コピーと生subjectを有限keysetで回収し、anchor存続を秘密の永久保持理由にしない。通常activeのsubject tuple/AAD/不変保証を維持し、全accountへのprovider-binding/sidecar基盤は導入しない。新保存guard・移行・exact変更path・全入口fenceと有限検証資源はS3受入候補との差を確認して正式確定する。この方向採用では新移行・製品編集・実データ退会/回収・外部物削除を開始しない。

## 正式P5dの採用範囲

[正式案](../phases/P5d-formal-plan.md)の保存型・専用intent/purge cause・0044新migration/guard・全入口fence・有限回収を採用する。既migrationは変更せず、通常active型/認証手段guard/Drive tuple不変保証を維持する。exact変更集合は同案に `packages/core/src/application/regeneration/read.ts` と `current.ts` を追加する。retained record/targetは通常秘密locator検査より先に分岐し、一覧/単件で既ID・note/original/account・作成時刻・sha/bytesを持つ `recorder-unavailable` を返す。通常read/claim/retryへshellを流さず、架空locator/cast/秘密保持で通常型へ合わせない。 正規Hollowの回収駆動には `packages/core/src/adapters/node/purgeRunner.ts` を追加し、既workspace deletion sweepのwake/periodic/stop所有へaccount-deletion sweepを接続する。新timer/boot改変や無関係todo/outbox配線変更を行わない。

accounts/Drive縮小は新合成DBで独立検証するまで一般提供しない。正式案の有限資源は実装委譲前に固定し、P5c UI候補の製品/生成物を変更しながら検証しない。実データ退会、外部Drive削除/revoke、旧資材への操作を許可するものではない。

## 通信中の資格情報回収

[credential-use案](../phases/P5d-credential-use-plan.md)のnative HTTP実close・whole callback終了・opaque exact use保存/ACKを採用する。Google callbackとOR checkは結果採用UoWまで実行所有へ含め、account/authVersion fence後のclaim/reveal/adoptを拒否する。未解決Google loginはaccountを推測せずimmutable actor-null枝へ束縛し、全関係useの閉鎖/ACKまでGoogle identity/copy縮小をdebtとして保留する。他の有限回収を進め、通常active契約を保つ。同案列挙10additional pathsを実装集合へ追加する。

[独立CU1追補](../reviews/P5d-credential-use-plan.md)で、`packages/core/src/adapters/node/auth/credentialRuntimeOwnership.ts` 新1、同`auth/config.ts`、同`openrouter/config.ts`、`apps/web/app/server.node.ts` 既3を隔離実装集合へ追加する。configured providerだけがclaim前にdurable acquireし、canonicalDB/fileidentityとGoogle/OR別namespace・version1 credential-use-v1へ束縛する。現ownerとacquire-confirmed前任のtyped private capability、closed/callerEnded未ACKを含むexact旧tupleの収束を実装する。Drive自身のproofやPID不在だけを借用しない。

legacy no-useからnever-ownedを推定せず、旧run.stop外のlate採用も終えたwhole Node cutover capabilityがなければupgrade gateでheldにする。一般legacy保持移行と最終EXISTS0は未解決で、P5d-E/F/Gの該当受入は保留する。新合成DBの成功を代替へ使わず、PID不在/TTL/attempt state/永久保持を成功根拠へ代用しない。

0044内のcredential_originsはprovider/account・legacy-unprovenまたはnative-v1・nullable use FKを持つ。既Google identity/秘密OR connectionはlegacy-unprovenへbackfillし、origin欠測もheldにする。新native-v1はwhole callbackのactual saved adopt accountまたはexact OR epoch/connectionとuseを照合して束縛する。unresolved Google useのaccount NULLは変えず、emailから推測しない。既legacyを通常check/new recordでnativeへ上書きせず、originとuseの実closed/callerEnded/ACKが一致してから縮小する。最終回収のFK順とEXISTS収束を検証する。

credential useの独立nullable result_account_id FKは、actual saved同Google attempt/version/resultを照合して一度だけ固定する。actor-null binding/account_idとproof keyは変更せず、origin最新use以外の過去adopt useも25件keysetと最終EXISTSで回収する。adoption応答不明は正規同attempt再読とgenuine閉鎖回復でのみ補い、legacy originを上書きしない。

beginUse未成立の枠解放はnative private exact entryのwhole callback未開始・実resource0と元target bindingに限定する。facade自身がbeginUse UoWの実settle/Tx終了を待ち、同ordered canonical DBでexact不存在を確定した場合だけcancelUnclaimedの元opaque capabilityをconsumeする。不明/commitlost未収束/別DB/外部booleanだけ不存在/未終了Txは保持し、closed/ACK行を合成しない。

`packages/core/src/adapters/libsql/client.ts` を追加し、実local clientからgetDatabase exact objectへ元file URLのprivate provenanceを結ぶ。実UoWと同db、canonical path/fileidentity一致でのみcredential ownerを発行し、fake/clone/direct drizzle/nonfileの欠測を保持する。追加DBopen0と通常client挙動を維持する。

Googleの追加本人確認後の正常採用は、同採用UoWで既native-v1 useのdurable closed/callerEnded/ACK・元same attempt/source/browser/actorと合法proof-required→completed遷移・今回result account/subjectをexact照合してoriginへ結ぶ。私proof再発行や別attempt/retry・版一般・email推測・legacy origin上書きを認めない。

`packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts` を追加し、既write中の各IO前ownerActive再照合へ現在personal ownerと当該操作actorのactive fenceを接続する。WS/移動済みデータの保持とcleanup/releaseのexact証拠を保ち、過去creator/uploader一致だけで削除しない。INSERT guardだけを既write中のfenceへ代用しない。

Drive ACK競合には `packages/core/src/adapters/node/drive/execution.ts` と `packages/core/src/application/integration/drive/ports.ts` を追加する。actual ACK・callerEnded・実resource closeが全成立したexact native tupleの退会用opaque receiptをprivate registry上限67で保持する。専用sweepはintent claimより前に全accountのready receiptを25件ずつ正規保存・同値再読・consumeし、通常accountでも解放する。commit応答不明は元opaque receiptを保持し、pruneは保存前business rowを削除しない。通常履歴pruneとmatched receipt削除を同Txに束ね、恒久台帳と67件後の恒久fenceを作らない。退会のcopy縮小前dependencyと最終EXISTSにも照合し、全matched業務rowの縮小後にreceiptを回収する。既ACK順・source private proofを保ち、fake/legacy発行やrow消失推測を認めない。

native acquisitionの発行元確認に `packages/core/src/adapters/node/drive/runtimeOwnership.ts` を追加する。acquireDriveRuntimeだけが返却ownership objectと元generation/runtime bindingをprivate registryへ登録し、executionは同object/元binding一致でのみretirement receiptを発行する。公開constructor/fake/defaultstore/clone/文字列やgeneration一致だけを根拠にせず、既acquire・record・前任proofの挙動を維持する。

`packages/core/src/application/integration/drive/runner.ts` のmaintenance/pruneと前任ACK入口にも限定guardを追加する。同maintenance laneで未保存private receiptのあるowned closed行をpruneせず、前任ACK前にsaved closedと同前任receiptを照合する。通常のACK順・容量とlane所有を維持し、deadlockや通常利用の恒久fenceを作らない。

`packages/core/src/adapters/libsql/repositories/jobRepository.ts` の直接conversion claimにも、job actor active・current note lifecycle・current personal owner activeのeligible条件を追加する。deleted先頭jobがqueueを塞がないよう選択時にfenceし、cleanup/cancel/finishのexact例外と正常active・WS保存物保持を維持する。

`packages/core/src/adapters/libsql/repositories/invitationRepository.ts` のclaimはissuer active・WS active・現在の正規招待権限をeligibleへ含める。既許可roleとcleanup/terminalを保ち、deleted先頭queueを避ける。正式集合内deliveryはcurrent issuer再照合より前にtokenをrevealしない。

## 個人領域の結果不明履歴

account-deletion専用purgeは、現在の個人note・trash operation・intent/purge link・deleted account/auth fenceが同Txで一致する場合に限り、結果不明のprivate履歴を結果変更なしで回収する。全実ownerのclosed/callerEnded/ACK、同世代inputclosed0、quota/response/object/readpin/refresh/source attemptの終了条件は維持する。未知結果だけのblockerを限定的に除き、対象rowをsource redacted更新せず直接DELETEする。0044のmachine_regeneration_delete・machine_regenerations_source_delete・llm_conversions_source_deleteへこのexact限定例外を置き、consumer→attempt→binding→record/original→noteのFK順を守る。通常source_update/outcome guard、通常purge、WS/移動済みnoteの履歴は変更しない。実閉鎖欠測・未知commitはheldのままとし、fakefailedやproof合成で回収しない。
