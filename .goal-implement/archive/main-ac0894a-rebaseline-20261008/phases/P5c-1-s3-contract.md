# P5c-1 S3 実装前契約案

## 対象・現在地

2026-09-29。S2修正候補 `d946225ce80b983b0b9ee0f30d56442b73042075` の独立確認中に、最新design Drive節、[補助案](P5c-1-s3-plan.md)、[caller補足案](P5c-1-s3-closure-clarification.md)を全文確認して本書だけを更新した。製品・管理・他報告変更、DB/test/新root/旧proof/外部API操作は0。環境ownerはVerifier。spec/spec-implement・goal APIは非操作。

B（exact実close証拠→DB CAS→commit後ACK）＋C（専用前任の実終了証拠）を方向採用した設計の具体案である。以下のexact型・数値・実行集合はManagerの採用待ち。S3実装・S5本体起動/移行の許可ではない。音声は未完保留、backupはautoOFF、実転送取消はP5c-2のまま。

## 1. 終了証拠の最小内向き型

現 `DriveExecution.run(owner, work)` にはoperation IDがない。正常DB commit後にACKだけを失うと、対象行はheld scanから消える。applicationの可変Mapやownerからの新DB検索を追加するより、最初から既operationの参照を渡す。

```ts
type DriveExecutionTarget = Readonly<{
  kind: 'authorization' | 'control';
  id: string; // 既UUID
  owner: Readonly<{ runtimeGeneration: string; token: string }>;
}>;
type DriveClosedProof = Readonly<{
  target: DriveExecutionTarget;
  evidenceId: string; // adapter発行opaque ID。DTO/logへ出さない
  source: 'local-close' | 'predecessor-exit';
}>;
type DriveClosureState =
  | Readonly<{ kind: 'unproven' }>
  | Readonly<{ kind: 'held' }>
  | Readonly<{ kind: 'closed'; proof: DriveClosedProof }>;
type DrivePredecessorProof = Readonly<{
  runtimeGeneration: string;
  evidenceId: string;
}>;
```

`DriveExecution` の変更候補は次のexact面だけ。PID・native Error・socket・secretを内側へ渡さない。

```ts
accepting(): boolean;
withCaller<C, T>(
  target: DriveExecutionTarget,
  claim: () => Promise<C | null>,
  settle: (claimed: C) => Promise<T>,
): Promise<
  | Readonly<{ kind: 'not-claimed' }>
  | Readonly<{ kind: 'settled'; value: T }>
>;
caller(target: DriveExecutionTarget): 'pending' | 'ended' | 'untracked';
coordinate<T>(
  phase: 'claim' | 'settle' | 'maintenance',
  work: () => Promise<T>,
): Promise<T>;
run<T>(target: DriveExecutionTarget,
  work: (signal: AbortSignal) => Promise<T>): {
  result: Promise<DriveOwnedResult<T>>;
  closed: Promise<void>;
  abort(): void;
};
closure(target: DriveExecutionTarget): DriveClosureState;
unacknowledged(limit: number): readonly DriveClosedProof[];
acknowledge(proof: DriveClosedProof): Promise<void>;
predecessors(): readonly DrivePredecessorProof[];
acknowledgePredecessor(proof: DrivePredecessorProof): Promise<void>;
abort(owner: DriveOwner & {state: 'active' | 'unknown'}): void;
stop(): Promise<void>;
```

targetは既operationのkind/idと、applicationが今回生成したfresh ownerを用いてrow CAS前に作る。client申告をownerへ転用しない。準備のreadはclaim認可の代替ではなく、applicationのclaim callback内で現在actor/phase/版/資格/DB global2/account1を再照合し、そのtargetと同じownerをrowへCASする。adapterはcallbackの成否とlifecycleだけを所有し、DB repository/driverをimportしない。実registryはkind/id/generation/tokenの全一致で照合する。単なる同名objectをclosureの証拠にせず、`acknowledge` は発行済みevidenceId/target/sourceの一致を検証する。未知targetのclosureはunproven、callerはuntrackedであり、いずれもclosed/endedではない。ACK済みの再ACKは状態変更0の冪等no-opにできるが、absenceを新しい閉鎖証拠として返さない。

`withCaller` は次の順序だけを担当する。`settled` はcallback Promiseの成功であって、業務成功・DB commit・実closeの保証を追加する値ではない。rejectは元のrejectとしてcallerへ伝播し、registryには値・例外本文・資格を保存しない。

1. adapterがclaim critical section内でacceptingと既2owner headroomを再検査し、exact targetをpending登録する。登録成功後だけapplicationのclaim callbackを一度呼ぶ。登録より前のrow CAS/native開始を許さず、二重targetも拒否する。pendingからendedまでのdrain用Promiseは値/例外を保持しないPromise<void>とする。
2. `claim` のnullは、UoWが正常に完了しclaim不成立が確定した場合だけ返す契約。HTTP0で登録予約を解除しnot-claimedを返す。claimのreject/commit不明をnullへ変換しない。後者は登録と証拠を保持し、HTTPを開始せず、finallyへ進む。実rowが同ownerなら後の証拠照合対象、missing/別owner/不可読なら保存完了と推測せず停止保持する。
3. claim lockを解放した後にsettle callbackを直接呼ぶ。callbackはrun→result/closed→最終DB保存→正常経路の最初のACK試行までを含む。HTTP全体をlock内で待たない。runはこのexact pending callerかつclaim成功の登録からだけ開始でき、直接runによる迂回0。別ownerの次stepは別withCallerへ分離する。
4. claimまたはsettle callbackのresolve/reject後、adapterのfinallyが短いsettle critical sectionで、保持中のexact entryだけをendedにする。正常nullで解放済みの予約は再生成せずuntrackedのまま。callbackが使ったlockの解放後に行い、nested coordinateにしない。このend処理はDB/ACKを待たない。ACK再試行の全寿命を元callbackへ戻さず、終了証拠と未ACK保持を分離する。
5. run未開始で終端した場合でもendedだけではclosedにしない。adapterがnative factory未呼出・要求生成0・今後のrun開始不能を封じたことを明示記録した場合だけ、資源0のlocal-close証拠を発行できる。開始の有無が不明ならunprovenを保つ。登録不在・時間経過・application例外自体は未送信/閉鎖証拠でない。

ACK済みでもpending caller entryはfinally endまでdrain用に保持し、endでproofを再生成しない。endedかつ未ACKのentryは既64+2保持枠に残す。新しいcaller別台帳・保存列・application可変registryは作らない。

`closed` はworkがsettleし、以後request生成不能、登録済みrequest/response/socketが全部実closeしたときだけresolveする。30秒operation deadlineでresultを有限失敗へ確定しabort、追加5秒でも実close不明ならclosedをrejectする。遅いwork結果は破棄する一方、そのPromiseとresourcesはregistryに残す。後で本当に全終端が揃ったらclosed proofを作る。resolve済みPromiseを再resolveする経路ではない。

## 2. proof→DB CAS→ACK と有限保持

新DDL/列を追加せず、既find(id)/replace(expectedVersion)を使うapplication関数 `reconcileDriveClosures` を既 `application/integration/drive/runner.ts` へ置く案。

1. `unacknowledged(100)` のclosed proofと、held scanのexact targetに対するclosureを取得する。列挙値は最大66。applicationは受領値だけを処理しregistryを持たない。
2. 同じmaintenance critical section内でexact proofとcaller状態を確認する。local-closeの代行回復はcaller endedとの両方を必要とし、pendingなら元callerの正常保存/ACKを優先して保留、untrackedならendedを推測せず停止保持する。短いUoWでkindに応じたfind(id)、保存ownerのgeneration/token完全一致を確認する。
3. 同owner既closedなら保存済candidate/ready/completed/failedを変更せずACKだけ。active/unknownの既terminalではfailed/cancel/terminalAt・credentialUse・初回digest・create identity/sendsを保存し、ownerを同identityのclosed、rowVersion+1/updatedAtだけ進める。expired/current失効は閉鎖証拠の否定ではなく業務成功不採用の理由である。
4. caller endedかつ実closeの揃ったlocal active/unknown、又は専用前任実終了を証明した未終端行では、認可exchanging/refresh/Picker/選択は既有限失敗 `DRIVE_UNAVAILABLE` とclosedへ収束する。createの送信済みidentityがあり取消/失効/terminalでなければclosed reconcilingへ進め、後続metadata照会は明示操作だけ。cancel/失効ならidentityを残した既failedへ。late business value・再発注・候補採用は0。前任のcaller不在だけを実終了証拠へ読み替えない。
5. UoW commit後にのみproof ACK。CAS不成立は再読して同owner既closedならACK候補、それ以外は保持して次の有限照合へ。missing row・別owner・破損recordから保存完了を推定せず、有限停止とする。DB失敗/commit不明ではACK0。

通常の `executeDriveAttempt/Control` は同じsettle critical section内で、実closed＋DB保存commit→同targetのproof ACK awaitまで行う。正常ACKはcaller pendingのまま可能で、endedを待って循環しない。ended必須なのは代行回復だけ。保存済みの正常candidate/ready/completedをACKで失敗へ変えない。ACK失敗はproofを残してlockを解放し、元callbackはreject/end、後の同proof/同rowの再照合へ分ける。callbackから返るreceiptと所有のACK完了は別である。

保持上限案は未ACK closed proof64＋global owners2のheadroom＝合計66entry。metadataだけを保持し、結果value/資格token/bodyはproofへ残さない。各entryのJSON UTF-8 metadata最大2KiB、計135,168Bを保守予約する。owner識別子のescapingも計量し、JS objectのRSS保証とはしない。unknown実資源は最大2ownerで、TTL/容量都合で追出し0。

`accepting()` はstop中・未解決前任・closed未ACKが1件でもある場合にfalse。64+2はhard保持上限で、新claim許可閾値ではない。withCallerがclaim lock内でこの純状態を再検査し、未ACKを先に照合してからpending登録/claimする。lock外の予備判定だけで進めない。登録はCAS前、runはそのclaim成功後であり、handoffの空白を作らない。lifecycle pending最大2とDB global2/account1は別に照合し、registry空き数をaccount枠の代替にしない。予想外の66超過は新実行を停止し、既証拠を削除しない。

とくにready/closedから次ownerへ進む前に旧owner proofをACKする。そうしないとcommit後ACK喪失→新claimでowner更新→旧proofのDB照合不能になる。absenceだけで閉鎖を証明するのではなく、既保存closed・単一runtimeのACK順序・未解決前任0を前提に次claimを行う。

`coordinate` はこの順序用のDrive専用有限critical sectionで、可変待ち列はNode adapter/rootだけが所有する。claimの短Tx、settlementの短Tx＋commit後ACK、maintenanceの照合/ACK/pruneを直列化し、HTTP/work全体をlock内に入れない。global2/account1の同時実行は維持する。direct callback/手動継続/runnerも同じinstanceのcoordinateを必ず通し、UIだけの外側lockにしない。applicationは受領した関数を呼ぶだけでmodule global/可変registryを持たない。

coordinator待ち列はclaim100＋settle用予約2、maintenance1（重複wake合流）の最大103を候補とし、claim過多はclaim前の有限BUSY、settleを新規claimが飢餓させない。これは新しい永続job基盤やaccount quotaではない。callbackの無限待ち列を作らないためのadapter資源上限であり採用待ち。nested coordinateは禁止し、runDriveQueue全体をlockせず各claim/settlementだけを包む。

proofの期限pruneは設けない。ACK成功したexact proofだけを回収する。Drive行pruneは「新claim停止→lock外でcaller保存Promise drain→未ACK証拠照合/commit/ACK→prune」の順を必須にする。settle/end laneを生かし、maintenance lockを持ったままcallerを待たない。通常の周期maintenanceはpendingを待たず保留し、未ACK又はpendingで安全な順序を確定できない回はDrive pruneをskipする。unknownから遅いcloseが発生しても、その行はDB上heldのままで次の照合までpruneされない。未ACKが残る/対象行が読めない場合はDrive pruneも進めない。既authBrowser pruneはDrive行参照が残るためpinを保つ。

## 3. C: 専用前任の実終了

新 `adapters/node/drive/runtimeOwnership.ts` だけで専用領域を所有する。LLM/SSO/OpenRouterのowner record・鍵・private環境を読まない。S5でlocal DBのcanonical configured pathに束縛した `.drive-runtime` を構成し、DB bindingと領域の一致を要求する。DB path由来のbindingもログへ出さない。別DBへ同recordを流用しない。

record候補はstrict version1、current runtime UUID/PID、未ACK predecessor UUID配列最大64、databaseBinding。16KiB以内/0600/同uid、親0700/no-symlink、排他recovery.lock。PID存在確認はrecordが示すexact前任だけ。ESRCH＋record全再一致＋同領域排他の3つを必要とし、live/EPERM/破損/lock不明/PID再利用では保持停止する。PID探索・force kill・lease期限による回収0。

新runtime recordと未ACK predecessor集合をtemp排他write→file sync→rename→directory syncで確定するまでDrive HTTP発注0。前任のnative socket/workは前任process内に閉じる設計なので、実process終了が確認できたgenerationだけclosure(target)からpredecessor-exit proofを発行できる。対象のkind/id/tokenはそのDBの実rowから得る。PIDをapplicationへ渡さない。

前任世代の最大2 held（＋異常検知1）を両表から照合して2節の同経路で閉じる。個別proof ACKだけではgenerationを忘れない。最後のUoWで両表に同generationのactive/unknownが0と確認、commit後 `acknowledgePredecessor` で耐久recordから削除する。DB失敗・ACK不明・再crashでも未ACK集合を新recordへ引き継ぐ。対象行missingだけから個別proofをACKしない。既closed行のまま前任が終了した場合も、DB照合の完了前にgeneration ACKしない。

同DBの別Drive runtime起動は禁止する単一所有を前提とする。runtime領域だけが異なる二重起動を合法化しない。S5配備でDB binding/lock配置を確認する必要があり、S3部品試験で本体全shutdownの成立とはしない。

## 4. 通常stopとS2最小接続差

adapter/rootは新wake/claimを止め、coordinator lockを保持せず `execution.stop()` を開始して全exact ownerへabortする。このPromiseを保持したまま、登録済callerのresult/closed/DB保存/最初のACK試行/finally endまでをdrainする。settle/end/maintenance laneは閉じず、先にcallerだけをawaitしてabortへ到達しない順序は禁止。stop内からcoordinateを再帰取得せず、withCallerのcallbackへACK再試行寿命を戻さない。HTTP停止とDB最終closeは同じPromiseとみなさない。

次に全native close、未ACK照合とDB commit、個別/generation ACK、timer/listener/自己server資源0を確認する。`stop(): Promise<void>` が所有未確定の有限errorでrejectした場合、rootは停止成功/DB close/process exit0へ進まない。遅いcloseの証拠とcallerを保持して有限な再照合だけを可能にし、HTTPを再発注しない。未知所有をkillして成功へ変えない。最終DB closeはrootがこれら全完了後に行う。

| 既path（core/srcから） | S3接続に必要な最小差 | 既S2根拠への直接影響 |
| --- | --- | --- |
| application/integration/drive/ports.ts | target/proof/ACK/capacity/coordinate＋withCaller/caller | execution fakeの型と所有契約 |
| application/integration/drive/runner.ts | caller wrapper、commit/ACK同settle、ended active回復、prune順序 | result/closed/cancel/unknown、A/C/F |
| application/integration/drive/connection.ts | fresh target、claim callback内への現在認可/CAS移動、登録後run | callback/候補保存、A/F |
| application/integration/drive/folders.ts | fresh target、claim callback内への現在認可/CAS移動、登録後run | ready/保存先採用、B/C/F |
| adapters/libsql/__tests__/driveApplication.integration.test.ts | fakeのcaller/proof形、S2修正36期待維持 | 直接比例再確認 |
| 新adapters/libsql/__tests__/driveClosure.integration.test.ts | 8節のproof6群・計10対案 | 新DDLではなく既replace契約の直接確認 |

domain/repository/0038/既authBrowserには現案で差不要。既scan/find/replaceでは不足すると判明した場合にだけ先に申告する。旧P5a-C/Gのpin実装は無変更借用可能。S2 normal/SQLfault/FKfaultのSQL指紋不変なら再移行不要。将来server/DI/boot接続の旧runtime影響はS5のactual path申告へ分離する。

S2修正候補d946225はV1別live actorの旧認可URL再配布拒否、V2曖昧404後の同ID明示send2保持、V3親未観測のinspect/conflict明示確認、V4有限protect拒否後の閉鎖保存を実装した。主77対成功だが独立受入待ちであり、本書は再検証・合格判定を兼ねない。S1のterminal非復活/send厳密+1/最大2も不変更に保つ。

S3で追加するのは、S2が安全に伝播して保存成功と称さないDB例外/commit不明の後、元caller endedと実closeの両証拠を使って有限照合する経路。既closed成功はACKだけ、未保存activeは既current/terminal規則で収束し、S2の有限protect救済を汎用catchへ拡張しない。実装基点は独立受入した最終S2候補で固定する。

## 5. config/keyring exact案

環境指定は `HOLLOW_DRIVE_CONFIG_FILE` 1つ。内容は次のstrict JSON（記載値は形の説明で、実資格値ではない）。

```ts
type DriveConfig = Readonly<{
  version: 1;
  clientId: string;      // UTF-8 1..1024B
  clientSecret: string;  // UTF-8 1..4096B
  keyringFile: string;   // absolute、最大4096B
  picker: Readonly<{ appId: string; apiKey: string }>;
}>;
type DriveKeyring = Readonly<{
  version: 1;
  activeKid: string;
  keys: readonly Readonly<{kid: string; keyFile: string}>[];
}>;
```

config16KiB、keyring16KiB、鍵1〜8本。kidはASCII `[A-Za-z0-9_-]{1,32}`、重複0、activeKidはexact1件。keyFileはabsolute/4096B以下、各raw32B AES鍵。同一鍵pathの重複、異kidでの同key bytes重複を拒否する。picker appIdは数字1〜32文字、apiKeyはASCII1〜256文字を候補とし、実Google project/client整合は設定者の前提で検証済みと称さない。

config/keyring/鍵は同uid、regular/no-symlink/0600、直親0700。O_NOFOLLOWでopen→fd fstatとpath lstatのdev/inode一致→有限read→size/mtime/ctime/permissions/uid/dev/inode再一致→全fd実close。親置換も再照合する。秘密bufferは使用後zero化するが、JS文字列/KeyObjectの完全memory消去保証とはしない。旧key探索・環境全量dump・path/key/error cause表示0。

callbackは注入APP_URLだけから `/auth/drive/callback` を生成。configにredirectUri/originを重複保存しない。APP_URLはhttp(s)単一origin、userinfo/query/hashなし、pathはrootのみ。productionはhttps、loopback HTTPはローカル構成として明示した場合だけ。認可URL/code交換で同一値を使う。未設定はDrive非構成、明示不正設定は有限configuration失敗として区別し、既password機能を停止させない。S5が公開するのはconfigured bool/有限理由だけ。

鍵rotationは新暗号化がactiveKid、復号はenvelope kid。旧接続credentialは無期限に残り得るため、history90日を根拠に旧鍵を自動削除しない。鍵除去/再暗号化は本段階に追加しない。

## 6. envelopeとUTF-8 bytes

形式案はASCII `d1.<kid>.<iv>.<ciphertext>.<tag>`。AES-256-GCM、random IV12B、tag16B、canonical unpadded base64url。kidを含むversion/purpose/AAD固定配列を認証し、未知kid・非canonical・部品数違い・改変・UTF-8不正は安全な有限失敗にする。AADは既DriveSecretBindingの全field、namespace `hollow-drive-v1`、format version/kidを含む。object列挙順へ依存しない。

平文UTF-8実bytesをn、kid長をkとすると、暗号文はnB、IVのbase64url長16、tag長22、version長2、区切り4。総長は **44+k+ceil(4n/3)**。最大kid32では固定部76、保存上限65,536から暗号文本体65,460文字、従って共通平文最大 **49,095B**。49,095は3の倍数なのでbase64url丸め後65,460、総長65,536となる。ASCII文字数ではなくJSONをserializeした後のUTF-8 bytesで検査する。

protectは1..49,095B、暗号化後もASCII65,536B以下を検証する候補。revealは同形/復号bytes/UTF-8を再検査する。既domainの64KiBは保存envelopeと論理payloadの上限であり、平文64KiBの暗号保存保証ではない。この実効上限はManager採用を要し、型値を無言で広げたり大きい暗号文を切捨てたりしない。

verifier/確認集合（最大11 UUID）/resource keyは通常この予算内。token2field JSONとcandidate（subject/scopes等追加）はresponse64KiB内でも49,095Bを超え得るため、両方を独立に事前計量する。過大時は暗号化/保存前の有限失敗、旧credential不変更、再発注0。candidate保存/credential再封印/自己refreshの途中で失敗しても、実closeと業務結果の不採用を4節の境界で確定する。単に64KiB型検証成功を実protect成功としない。

## 7. OIDC/cache/固定HTTP

既 `google-auth-library` の公開署名検証とNode crypto/http(s)を使う案で、新依存install0。Google SSOのadapter instance/cache/keyを共有しない。

- JWT最大16KiB、3 canonical base64url segment、RS256/kid1..256文字、署名後iss固定2表現/aud exact/azp存在時exact/iat・exp safeかつnow範囲/sub/nonce hashを照合。emailは任意表示値、subの代替0。at_hash存在時はaccess token結合を検証。
- cert GETは固定 `https://www.googleapis.com/oauth2/v1/certs`、256KiB、1〜32キー、各PEM32KiB以下、kid重複0/解析可能RSA公開鍵。自作SPKI PEM試験は実Google X509配信成功とは別。
- completed cache1集合/合計256KiB、TTLは有効なCache-Control max-age−Ageと6hの小さい方。no-store/no-cache/不正/期限切れは保存0。expired key fallback0。ownerごとcert fetch最大1回、unknown kid再取得もこの1回以内。in-flight Promiseを異ownerで共用しない。
- token expiryはproviderのfinite positive expires_inから算出、固定1hの捏造0。初回refresh不足は旧token転用0、通常refresh省略だけS2同owner CASへ。

endpoint/method/fieldsは補助案の固定集合を維持する。ただしcreate bodyは **parentsを省略** し、既採用My Drive root契約を正本とする。`parents:['root']` は採用しない。2xx/409後は同ID・marker・実parents・現在権限をS2が照合し、未知parentをrootと補完しない。shared Driveへの既存folder選択、resource-key header、単段shortcut確認は維持。全Drive検索/別scope/upload/delete/untrash/revoke endpoint追加0。

HTTPのrequest body16KiB、token/metadata64KiB、cert256KiB、request/response header各8KiB、redirect/retry0、agent:false、HTTPS443、Accept-Encoding identity。HTTP10秒/operation30秒/close観測5秒。bodyの超過chunkは追加保持前に拒否する。Content-Lengthも検証するが、値だけで受領済みを証明しない。request socket responseの各closeをlistener設置時から記録し、body end/finish/abort/destroy呼出をcloseとしない。close listenerはunprovenでも外さない。

signal→exact target scopeはadapterの内部registryだけ。未登録signalでは送信前拒否する。native factory呼出以前だけnot-sentを証明し、以後の通信不明はunknown。provider→executionはadapter-local有限Errorでcode/delivery/credentialRejectionだけを運び、raw message/body/causeを内側へ送らない。resource401/access-token、通常refresh invalid_grant/refresh-token、code交換invalid_grant/nullを厳密に分ける。403/404/rate/network/一般拒否で既資格を無条件失効させない。

## 8. 実装・実行集合の事前案

新root候補は `p5c1-s3-20260929-XXXXXX` 排他0700。まだ作成しない。公開sourceを直接使い、旧proof/helper/DB/key/resultのコピーは不要。新node/drive/{http,authorization,provider,execution,runtimeOwnership,secretProtector,config,runner}.ts と直接tests、4節の内向き差を候補とする。

自己鍵は保存AES2本×exact32B＝64B（active/retired）。別にRS256署名用RSA2048 keypair1組をmemoryだけで生成し、保存private0、出力0。private DER予算2KiB/public SPKI予算512B、実エンコード量は生成時に内部検査し超過停止。config/keyring合計32KiB以内、自己runtime record16KiB、合成素材総256KiB、script/log/cache8MiB。旧資格0、公開synthetic応答だけを使い、secret/ciphertext/JWT/body/assert diffは非出力。

24形の有限adapter試験案を以下に固定する。列のrequest数は最大で、0要求対をHTTP成功に数えない。表内で明記した境界variant以外は追加しない。

| # | 形・明示variant | HTTP上限 |
| --- | --- | ---: |
| 1 | 認可URL scope/S256/consent/account/callback | 0 |
| 2 | code交換＋正常RS256/email省略 | 2 |
| 3 | nonce/aud/azp/期限/署名/unknown kidの6否定、各cert1以内 | 12 |
| 4 | scope不足/refresh不足、旧token転用0 | 4 |
| 5 | 通常refresh省略/rotation | 2 |
| 6 | code invalid_grant/refresh invalid_grant/resource401 | 3 |
| 7 | personal/shared Driveのusable | 2 |
| 8 | resource key/shortcut＋単段target再検証 | 3 |
| 9 | trash/explicitlyTrashedの2形 | 2 |
| 10 | 403/404/429/403rate/5xx/networkの6形 | 6 |
| 11 | generateIds正1/不正複数 | 2 |
| 12 | create2xx/409と各同IDmetadata | 4 |
| 13 | metadata64KiB exact/+1、cert256KiB exact/+1 | 4 |
| 14 | 不正JSON/圧縮/redirect | 3 |
| 15 | 応答途中切断 | 1 |
| 16 | pre-abort要求0/HTTP timeout | 1 |
| 17 | body完了と実close遅延を分離 | 1 |
| 18 | unknown→通常自己close→証拠保持 | 1 |
| 19 | exact abort/別owner no-op/同target二重開始拒否 | 1 |
| 20 | 専用前任record＋自己process実終了、未知/live拒否 | 0 |
| 21 | AES2kid roundtrip/旧kid復号 | 0 |
| 22 | 全purpose/AAD差/改変/unknown kid/49,095境界 | 0 |
| 23 | config未構成/strict/サイズ/uid・mode・symlink | 0 |
| 24 | stopのabort先行/settle-end lane drain、未ACK保持/DB相当失敗/ACK冪等 | 1 |

最大55 HTTP要求。各要求が最大cert負対262,145B＋request16,384B＋双方向header16,384Bを使う保守上界でも16,220,215Bで、累積wire16MiB内。wireはclient側HTTP平文の送受信bytes（server側を二重加算しない）。TLS/kernel/RSS保証ではない。実testではsocketのbytesWritten/Readを集計し超過前停止、body/header上界が変われば先申告する。

自己HTTP serverは127.0.0.1/port0でlistenし、割当portを起動前集合へ記録、実要求は逐次1。production factoryには固定HTTPS入口しかなく、trusted test factoryだけがこの自己loopbackへ置換する。Google/他listener/3100・3000の探索操作0。前任対だけ自己短命Node1をspawnし通常IPC終了→実exit/pipecloseを観測、他のHTTPと同時実行しない。未知PID/forcekill0。能力不足やclose未証明は後続admissionを止め、資源/証跡を保持する。

DBを要しないadapter24形と、実SQLite＋制御fake lifecycle/proofを使う追加6群を区分する。caller不足を埋めるため従来の6対案を次の計10対へ精密化する候補で、実行許可ではない。各family内で明記したvariantだけを実施し、偽の実HTTP終了証明として使わない。

| 群 | 対数 | 保存・順序の直接期待 |
| --- | ---: | --- |
| 1. pending/untracked | 2 | exact実closeでもpendingなら元保存を待つ、untrackedならendedとみなさず停止。DB activeを先回りしてfailedへ変えず、ACK0 |
| 2. ended active | 2 | 最終保存rollback後、ended＋exact closeでactiveを有限failed/closedへ収束。取消済terminalの別対では既code/時刻/cancelを保持。DB失敗時proof保持、late business採用0 |
| 3. committed closed/ACK競合 | 1 | 元callerのcommit→ACKを同settle内で観測。ACK失敗で次claimがlock内accepting拒否。ended後に再読closedをACKだけし、保存済成功を書換えず、ACK後だけ次ownerを許可 |
| 4. ended unknown/late close | 1 | endedだけ/実closeなしでは解放0。後のexact proofでunknown→closed CAS→commit→ACK。closed Promiseのrejectを後で成功へ書換えず、遅いvalueを再採用0 |
| 5. claim前登録/未開始 | 2 | 正常nullはnative0・予約解放、untrackedをendedとしない。claim commit応答不明の別対は登録保持・HTTP0・finally ended＋明示native未開始の証拠を得て同owner実rowを再照合。実row missingなら保持停止 |
| 6. 前任/照合不能 | 2 | 専用前任実終了証拠でactive回復し、全対象閉鎖commit後だけgeneration ACK。別対でwrong ownerとmissing rowを各有限rowに用意し、証拠消去/ACK/pruneを拒否 |

追加DBは新逐次1/active16MiB、総32MiB、最大2（保存失敗1＋承認後のactive1）、各case account2/attempt4/control4以下。正常自己DBは正規finally cleanup、失敗はclose後保存し次作成前に停止・報告する。新migration生成0、既正式0038を自己DBへ適用するだけで、旧DBや証跡copy不要。証拠サイズ/row数は6群10対でも同じ上界に収まり、DB用fakeのHTTP要求0なので24形/55要求・wire16MiB・material256KiB・other8MiBは据置。新fixture/test記述のother予約は合計128KiBを8MiB内に含める。

SQL指紋が不変ならnormal/fault3再演は不要。S2修正application36を新fake caller/proofへの比例再確認候補とし、V1〜V4/S1の既拒否/正常期待を弱めない。pure15/auth8/persistence18はactual差がある分だけとし、wholeunitを無条件反復しない。S3部品のDB10対とruntime前任/HTTP実closeのadapter24形は別根拠であり、本体boot/stop/移行はS5へ残す。

## 9. 未検証・引渡し

実Google同意/Picker/CSP/API key restriction/審査/組織policy/combined grant/長期refresh/Drive可視性は未検証。本書では新しい公式仕様の取得・外部調査を行わず、補助案の2026-09-29公式確認範囲を参照した。数値・暗号長の式・所有protocolは実装候補であってGoogle側保証ではない。

採否が必要なのは、1節のexact port/withCaller/callerとtarget、66entry/prune順序、専用前任scope binding、config/keyring JSON、49,095B実効平文上限、24形/55要求＋proof DB6群10対の集合。S2 V1〜V4修正の独立判断を先に受け、S3と無言で混ぜない。現資料だけで新依存・追加DDLの必要はない。

本書の全文と最終訂正をEOFまで再読し、全文書/read/write/runを停止して返却する。製品・DB・テスト・runtime・新root・鍵・HTTP・外部・旧proofの生成実行0。自己資源0、未回収exec0。S3部品実装、S5本体boot/移行は別の正式委譲まで開始しない。
