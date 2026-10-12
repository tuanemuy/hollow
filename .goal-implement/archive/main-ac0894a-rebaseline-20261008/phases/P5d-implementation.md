# P5d 隔離実装候補

## CR01–05 一回実行結果（resources0 局所PASS・全P5d受入未完）

Root採用・CR-FD1独立再preflight PASS後、fixed public候補のbytes/SHA・regular600/nonlink/nlink1/ownUIDを確認し、別precheckはexit0/preflight=true/executed=false/DB0/newRoot0だった。結果確認後、main cwdでPython3.14.3 `-I -S .goal-implement/helpers/p5d-credential-runner.py --execute` を一度だけ実行した。exact新ROOT `goal-implement-p5d-cr-20261006-793e2c50` と派生toolTMPだけを使用した。製品C `ccb3ec83112613549df7663310ebb6cc114718b1` / source86manifest `4f63012f45cb7c31c2476ec91bcb0e82eff06a2804c50511f69f3bbf5cf3544c`、runner24228B/SHA `ffd4ead11bf38311bfc790c8dce499dcfb3d49b5d8446efcde98cd06ebeec0af`、loader20149B/SHA `c927328894a85eac7fcdb77eb51ab3ffdd5a33e9c28afd8c00e5f8e93a490ea3` は不変更。実行前static/sourcechecks失敗なし。製品/helper編集・checks再演0。

safe summaryはok=true/failure=null/normalExit=true/actualExit=0、elapsed1923ms/output1066B、case5passed/filePassed=true/afterAllCompleted=true、tool fork1/forksActualClosed=true、workerCount0/denied=false、forceTERM/KILL=false、held=falseだった。fixture-closedのexecutionStopped/clientClosedは両true。実stdoutEOF/stderrEOF、pipeHandlesClosed、supervisorPGObserved/helperOwnPGObservedはtrue、登録ownPGとleaderは別々にabsentだった。正常監査前の独立normalPipeCloseReceiptはstdoutCloseReturned/stderrCloseReturned/stdoutClosed/stderrClosedが全true。EOFとstream実close、資源0のcredential閉鎖を別根拠として扱う。

| 実測case | 同一canonical DB・正規APIの局所根拠 |
| --- | --- |
| CR01 PASS | 通常missing-code callback303、attempt failed/OPENROUTER_CANCELLED、use/proof0。入口取消をnative proofへ代用していない |
| CR02 PASS | 内部empty-codeのfailed採用UoWの実commit後もwholecaller保留中active/callerEnded=false/proof無し。解放・wholecaller終了後genuine resources0閉鎖の保存/同値read/ACKconsume、verifier/candidate NULL |
| CR03 PASS | closure保存Txの実commit後だけ応答喪失。saved closed/callerEnded/ACK=falseと元private proof保持、通常wakeで同target/evidence読戻→ACK→consume |
| CR04 PASS | ACK Txの実commit後だけ応答喪失。saved closed/ACK=trueと元proof保持、intent-independent wakeで同値読戻→consume。65前任/67容量の根拠ではない |
| CR05 PASS | 通常nonempty callbackのnative beginUse実commit後・prepared採用前に正規退会受理。current fenceがlate revealを拒否、resources0閉鎖/read/ACKconsume・旧入口303・origin0。本人2の退会と有限64sweep後、ACK済み4source/useは回収されuse0、CR01 failed/no-useの1attemptだけ残った。残存rowのverifier/candidate NULLは実assert済み |

全正常case/file/afterAll同期client.close・fork実exit/EOF・Nodeexit0・ownPG不在・両Popen stream実close gate後だけ、runnerが同fresh DB1をdirect readonly/query_onlyで監査した。safe結果はforeignKeys/integrity/anchorFence/readonlyClosed全true。追加logical DB0。実行後root/TMP/鍵/DB/resultsの再read/stat/hash/copy/import0、自動retry0、既成功ea566・全失敗root/TMPも非操作。外部HTTP/DNS/TLS/listen0、businessWorker/child0、原https.request identity/native factory/private capabilityは製品のまま。

このPASSはOR genuine resources0 wholecaller・current fence・closure/ACK commitloss・局所attempt/use回収の証拠である。realHTTP request/response/socket閉鎖、native adopted origin/全秘密copies、Google、acquire-confirmed前任65/closed未ACK、通常67容量、8MiB copy、legacy cutover、unknown genuine purge、UI/全A–H受入は未成立。HTTP次案は [P5d-native-http-plan](P5d-native-http-plan.md) 8656B/SHA `d7fb1b46f64a9d91ee3402ec8cb70b4d2ba69b11d17f9dcfff305c74d191eb62` へproposalのみ固定し停止している。今回実行へ混入していない。safe結果固定後、対象全writer/read停止。

## 実行前固定記録：CR-FD1 最小修正候補

独立review [P5d-credential-runner](../reviews/P5d-credential-runner.md) のCR-FD1をrunnerだけで修正した。正常全case/file/fixture frame・Nodeexit0・ownPG absent・両EOFの既gateを通過した後、**readonly audit呼出前**にPopen stdout.close()とstderr.close()を実行する。両call実return後だけstdoutCloseReturned/stderrCloseReturned/各closedを独立normalPipeCloseReceiptへ記録し、四値trueをgateにする。例外/closed未確認ならaudit0・held、normal receiptは未確定のまま。異常finallyの両closeは維持し、正常経路の重複closeも標準streamのidempotent動作で閉鎖状態を保つ。EOFとFD閉鎖を混同しない。

runner24228B/SHA `ffd4ead11bf38311bfc790c8dce499dcfb3d49b5d8446efcde98cd06ebeec0af`、regular600/nonlink/nlink1。差分はreceipt初期値1行・正常close/gate4行・safe summary receipt1fieldのみ。三splicesをメモリ逆適用すると元23857B/SHA `cbf012ff1de30b56d8a4482ccebcd853941d134f3a3523867cd91090312f962e` の全文とbyte同値。Python AST/compile PASS（コード評価/pycache0）。loader20149B/`c927328894a85eac7fcdb77eb51ab3ffdd5a33e9c28afd8c00e5f8e93a490ea3` 不変、C ccb3ec831/source86/manifest4f63012f・ROOT793e2c50/資源/argv/診断/ケース/force期限不変更。規定sourcechecks再演0、Node/DB/鍵/root生成・probe・実行0。CR対象全writer/read停止し、独立比例review待ち。nativeHTTP別提案はまだ未完・製品追加0。

## 実行前固定記録：CR01–05 実装候補

新C `ccb3ec83112613549df7663310ebb6cc114718b1`、親 `476dd475b405573715589ea5b1e2f3c61b609d5f`。隔離branchへ新test/fixture2pathだけcommitし、製品84paths・0044・main HEAD `c2a3d45f1097533c6344346aca303dc1d2aef368` は不変更。86source manifest `4f63012f45cb7c31c2476ec91bcb0e82eff06a2804c50511f69f3bbf5cf3544c`、元84manifest `7b0647c36d2a454996278dd6bda6153d5e89b16c371243ee6ce817d90b684d9b` 同値。新2sourceはcommitblob/実file一致、regular600/nonlink/nlink1。規定whole typecheck→whole lint:fix→whole formatを正規public108依存/verify-deps falseで完了（全workspace型PASS、Biome1215file/lint安全整形1file・unsafe260未適用、format変更0）。diff2fileチェックだけをwhole成功へ書換えていない。tracked既84差分0。

CR01正規missing-codeはAPI固有終端 **failed/OPENROUTER_CANCELLED・use0**。非pending/no-useをcredentialSourceHeldが保留するため、退会後1attempt保持を暫定expectedへ固定した。verifier/candidateはNULLで、genuine closed/ACKを合成しない。これは静的予測で **actual hold未観測**。CR02–05はgenuine native owner/resource0/wholecallback終端・閉鎖保存/同値read/ACKconsume・実commit応答喪失の再照合を測り、ACK済み4source/useの局所回収をexpectedとする。秘密なしunlinked connectionはcleanup predicate/final EXISTS対象外で、そこからorigin欠測holdを要求しない。通常intent succeededが実際観測されてもadopted全資格copies/HTTP/legacy/全P5d受入へ補完しない。P5d-E/F/Gの未確定nativeHTTP/前任/67/全copies/wholelegacy依存を残す。

実行root予約は `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-cr-20261006-793e2c50`、toolTMPは同literal+-tool-tmp。新root/toolrootのprobe/生成、DB/key/config/owner record作成、テスト/native実行0。成功ea566・全失敗root/TMP非操作。独立review後Rootの一回実行採用まで `--execute` しない。

| 新source exact path | role / bytes | SHA256 |
| --- | --- | --- |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentials.integration.test.ts` | CR新test/fixture・10122B | `3c873d8b854efff29c301a9bf1e19c532f81ffa975730b15ca6c91ce695b24ee` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentialsFixtures.ts` | CR新test/fixture・13272B | `5af0bf9e452b9a3842d81afe697dcbd7e6907965d2896184ebc24a87711e4c5e` |

公開helpersは新wx600・既700 helpers dir内regular/nonlink/nlink1、未実行。既公開runner/loader813ff5c8/75c3407bのfullhashを確認してsourceだけ再用し、旧生成物へアクセスしていない。

| helper exact main path | bytes | SHA256 |
| --- | --- | --- |
| `.goal-implement/helpers/p5d-credential-runner.py` | 24228 | `ffd4ead11bf38311bfc790c8dce499dcfb3d49b5d8446efcde98cd06ebeec0af` |
| `.goal-implement/helpers/p5d-credential-loader.mjs` | 20149 | `c927328894a85eac7fcdb77eb51ab3ffdd5a33e9c28afd8c00e5f8e93a490ea3` |

Python AST/Node --check PASS（helper起動/新root preflight probeなし）。genuine公式Vitest4.1.6 ForksPoolWorker/PoolRunnerInitializerのcacheFs=false、標準fork argv/IPC/result/stopを保持し、tool fork1/同時1だけ登録する。Node24.18 canonical actual execPath/version gateはmain/forkともfixture/Vitest副作用前。provider/https.request関数同一性・公式URLを差替えず、資源guardとしてDNS/HTTP socket/TLS/listen/Worker/別childをdenyする。

FS許可は専用fresh DB1とsidecars、AES32/config16KiB各wx一回、owner dir1/正規recovery.lock/UUID tempだけ。owner native mkdirの既root EEXISTは元APIのactual rejectionを維持し、record tempのexclusive open時inodeを捕捉→元inode一致のrename→owner.json/currentinode保存、lockも捕捉inode一致時だけ元unlink。Node元durable acquire/fsync/記録exact前後照合は製品のまま。master keyを後付writeFile/appendへ許可しない。outerはnewroot inode/同UID/0700、owner metadata/各16KiB・DB sidecar32MiB・root192MiB・toolTMP8MiB/log2MiBを200ms監督。正規temp/lockの原子的rename/unlinkに伴う元known-nameのENOENTだけmetadata absenceとして扱い、未知file/link/他errorを許可しない。作成中keyのmetadata0..32を認めるがprotector/fixture/final auditで32bytes exactを要求する。

CR02のfailed UoWは実commit後のdelegate barrierでwholecallerが戻らない状態を作り、native active/callerEnded=false/closure=nullを確認する。CR03/04は正規repoの成功method実行とUoW実commitの後だけ一度throwする。ownerは捕捉元LibsqlUoW/dbへのnative private acquireのまま。CR05はHTTP preliminary/capturedの2UoW後・native beginUse実commit後にprepared delegateを一度保留→別の同canonical元UoWから正規退会→current拒否を測る。gateは5秒boundedで、afterAllで解除してexecution.stopを実awaitする。

normal afterAllはexecution.stop→passwordHasher.stop→FK/checkpoint→actual synchronous client.closeの後だけsafe固定fixture-closed frameを出す。loaderは登録した実fork stdoutのexact1frameとhooks.afterAllEnded、fork actualexit+2EOF+closeを合わせる。outerはallcase5pass/summary・同1fixture frame・fork1・Nodeexit0/実2PIPEEOF-FDclose・ownPG ESRCH absent/force0の後だけsamefresh DB1をPython sqlite3 readOnly/query_onlyで一度開き、FK/integrity/journal45/guard79・deleted anchors2・旧session0・ACK済source/use回収・CR01 unproven1row保持・origin0/adopted secret0を監査して実closeする。extraDB0。frameをHTTP実closeやprivate proofへ代用しない。actual HTTP request/response/socket close0件を明示する。

case/hook40秒・suite/body180秒・outer240秒、shared TERM10/KILL10/PIPE10を同240内にclampし、通常工具closeの猶予を含む監督loopは210秒で切る。正常auditも240内。leaderとownPGは別absent/alive/unprovenで記録し、登録ownPGしかsignalしない。非0/deny/diagnostic/強制/未知では正常audit0・後続case0・root/key/TMP全held・再read/hash/copy/import/retry0。未観測closureをstdout frame/TTL/deadlineから補完しない。

固定候補を独立reviewへ提出し、全writer/read停止。DB1/genuine proof/copy回収の実観測はまだ0。

## CR01–05 採用実装範囲と後続未採用HTTP境界

CR01–05/test2/helper2限定scopeはRoot採用済み、上記新候補は実行未着手。製品source commit `476dd475b405573715589ea5b1e2f3c61b609d5f` / 84manifest `7b0647c36d2a454996278dd6bda6153d5e89b16c371243ee6ce817d90b684d9b` は固定。製品変更・新root/DB/key/runtime生成・実行0、正常ea566と過去全失敗root/TMPへの操作0。次の独立preflight/Root実行採用前に開始しない。優先はP5d-C/E/F/Gの **OR current-owner・whole caller・保存/ACKの部分根拠**。実HTTP・native adopted origin・全資格コピー回収・65/67境界・legacy cutoverの成功には数えない。

通常のGET `/auth/openrouter/callback` は correlation43字/単一値・browser cookie・正規session/current contextを確認する。codeが欠落/空/UTF8 4096bytes超/複数、またはerror付きなら `cancelOpenRouterAttempt` →303で終了し、complete/beginUseには到達しない（`openRouterHttp.node.ts:59–70`）。ServerFnにもcomplete入口はなく、route validateSearchやdomain非空value-objectを通す別complete経路はない。従って **empty-codeは通常ユーザーcallback正例ではない**。application `completeOpenRouter(...,code:string)` の内部契約countercaseとしてのみ扱う。非空callbackの正規競合は、native beginUseの実commit後・prepared UoW前に退会が受理される順で、HTTP/reveal前のcurrent fenceを測る。

| 予定case順（新suite1、bail1） | 正規操作 / 観測する範囲 |
| --- | --- |
| CR01 transport missing-code | 正規beginOpenRouter→Cookie/correlationを使うGET callback・code無し→303/attempt failed(OPENROUTER_CANCELLED)。credential use/proof0、HTTP0。入口の拒否をnative閉鎖へ代用しない |
| CR02 内部empty-code基本閉鎖 | 同account正規begin→application complete(code='')。元verifierは実protectorでreveal、exchanging CAS→providerがHTTP前にreject→failExchange UoWがfailedを保存。whole callbackが終わる前proof無し、終端後だけgenuine local-close→closed/callerEnded/evidence exact保存・読戻→ACK保存・読戻→private consume。exchanging encoderによるverifierEnvelope NULL、candidate未生成。成功adopt/native origin0 |
| CR03 closure commit応答喪失 | 次の正規attemptでCR02同経路。container UoWの公開delegateが実saveCredentialClosureを含むTxのcommit完了後だけ一度throw。owner取得時の元canonical UoWは差替えない。saved closed/callerEnded/ACK=false、同proof保持→通常sweepAccountDeletionsが同値read/ACK/consume、proof再発行0 |
| CR04 ACK commit応答喪失 | 次の正規attemptでACK Txの実commit後だけ一度throw。saved closed/ACK=trueと元private proof保持→次通常sweepがexact同値再照合後consume。退会intent無しでもregistry解放を観測し、後続claimが可能なことをCR05開始で確認。67件境界の証拠ではない |
| CR05 通常callback/退会競合 | 別account正規begin→非空code/単一correlationのGET callback。prepared UoWの実開始前をcontainerのdelegateで一度保留する（owner beginUseは元UoWで実commit済み）。active use/wholecaller未終了/proof無しを正規repo読取で確認→別正規deleteAccount受理→resumeしてpreparedのversion/current actor fence拒否→303、HTTP/reveal0。wholecaller終端後のgenuine閉鎖/ACK保存・読戻/consume、旧session再入口拒否を確認 |

CR02–04のfault/barrierは型を維持する公開UoW/repository delegateで、元methodを一度実行して結果を保つ。対象saveClosure/ACK呼出を有限phaseでarmし、SQL/message/private registryを解析しない。Tx commit前throwや保留Txをcommit応答喪失と呼ばない。元evidence/target binding/source version/browser/account authVersion/runtime/generation/tokenをexact比較し、stateだけから閉鎖を推定しない。withCredentialUse finallyの保存がthrowしてもnative proofは保持され、正規sweepのintent-independent最初の25枠で再読/consumeする。closed未ACKはcurrent-owner局所正例のみ、acquire-confirmed前任回復は別slice。

CR05終了時に本人1の正規退会を受理し、genuine closed/callerEnded/ACK済CR02–05のsource attempt除去・use FK順回収を有限pageで観測する候補とする。CR01 failed/OPENROUTER_CANCELLED・no-use1rowは非pending未知保存枝により保持を暫定expectedに置き、実観測まではactual holdと言わない。unlinked connectionのcredentialEnvelope/providerUserId/everLinkedAtが全NULLならcleanup predicate/final EXISTS対象外であり、origin欠測holdを要求しない。通常intentの合法succeededを否定せず、このsliceからadopted全copies/HTTP/legacy成功は主張しない。CR05 pending never-revealed verifierは正式未所有分岐で縮小可能なため「ACK前verifier保持」へ誤用しない。caller/actual resources以外の既debtも解除しない。

### Genuine transportの静的限界と次のHTTP候補

`NodeOpenRouterHttp` とGoogleHttpは公式https URL/port443/agent:false、native transportは `factory===node:https.request` の実関数同一性をprivate登録する。任意loopback factory/bind/wrapperはtransport=nullであり、現constructor/configにper-request lookup/CA/dial注入はない。現portsだけでは **外部DNS0のgenuine realHTTP loopback正例は成立しない**。global patch、hosts/DNS切替、URL変更、port443借用、rejectUnauthorized:false、globalCA、manual register/release/proof/closed row/native-origin代行は提案しない。実adapter finallyがrequest/response/socketの各実closeをawaitしてreleaseする一次sourceはあるが、未実行。

実HTTP＋credential/candidate/providerUserId全コピー回収の後続OR familyには、元https.request関数・公式logical URL・TLS hostname/chain検証・元provider identityを保持する **別採用の限定native-localTLS dial境界** が必要。未採用/未実装。必要なら既 `adapters/node/openrouter/http.ts` / `provider.ts` のexact変更案を先に提出し、factory/config波及は実必要が判明したpathだけ再提案する。証明発行条件を緩めない。TLS certificate生成も現public依存から未確定で、NodecryptoだけでX509生成可能と補完しない。

後続HTTP familyの資源案は新DB1/同fresh root1、TLS listener1（127.0.0.1 ephemeralだけ）/request2 sequential/実socket最大2同時1、body各4KiB/response各64KiB/合算256KiB、TLS key/cert各1合算64KiB内（生成tool/child provenanceは別preflight）を上限とする。logical公式URLとHost/SNIを維持し通常certificate検証を通す。server accepted socket close + native request/response/socket closeを別実観測し、IO終了後もlate採用UoW barrier中はproof無し→wholecaller終了→exact privateproof→保存/read/ACK/consumeの順を要求する。正常adoptでのみnative originを保存し、退会中closed未ACKの全envelope/subject copy保持→ACK後依存順縮小→final EXISTS0を確認する。今sliceのresources0をこれへ転用しない。

### 採用fixture/helperの限定scope・停止案（上記候補作成済・実行0）

採用exact追加4path:

- isolated tree `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentials.integration.test.ts`
- 同 `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentialsFixtures.ts`
- main公開 `.goal-implement/helpers/p5d-credential-runner.py`
- main公開 `.goal-implement/helpers/p5d-credential-loader.mjs`

既p5d-test-runner/loaderのsocket/FS許可setは変更せず、標準公式Vitest fork/cacheFs=false APIを新helperへsource-boundで最小適用する。fresh root名はRoot採用時に1literal固定。fixtureはcreateLibsqlClient(file)→getDatabase exact object→LibsqlHollowUnitOfWorkProvider→acquireCredentialRuntime(openrouter namespace)→readNodeOpenRouter正規factoryで同provider/transport/executionを束縛し、偽owner/protector/nativeproofを使わない。正式journal45/0044 migrate、DB接続追加0。owner durable record取得完了後だけclaimする。

| 資源 | CR01–05の提案上限 / 実行前gate |
| --- | --- |
| storage | fresh root1 exclusive0700/同UID/nosymlink。DB1 wx600・sidecar込み32MiB、root合算192MiB、objects0、material256KiB/log2MiB/toolTMP8MiB。旧root全非操作 |
| secrets / owner | 新synthetic AES key32bytes1/config≤16KiB1、各wx600/parent0700。秘密/ID/body/hashを出力しない。OR owner dir1/owner.json1≤16KiB・既正式lock/temp有限、file identity/canonical DB/private acquire確認。Google owner0/TLS key/cert0 |
| DB business | accounts2、browser2、WS0/note0/job0、attempt5、credential use最大4（同時1）。各browser recent≤5/active≤3、expectedEpoch0/version1・current authVersion/browser/期限一致。fake linked/adopt/origin0。履歴51/page25の全境界再演0 |
| process/network | actual canonicalNode24.18 master1/標準testfork1同時1、nativeWorker/別business child0、HTTP/TLS/socket/listen/DNS/外部0。python supervisor1/tool Node child1/fork1の実数を工具台帳へ計数 |
| deadline | case/hook40秒・suite/body180秒・outer240秒、200ms metadata/資源監督。共有TERM10/KILL10/PIPE10をouter内、強制停止はnormal成功にしない。未知/denial/bail後後続case/audit0・root/key/TMP全held・再read/copy/hash/import/retry0 |
| normal closure/audit | afterAllでexecution.stopが全wholecallback settle、owned DBのFK/checkpoint・actual synchronous client close。標準fork stop actualexit/IPC EOF、Nodeexit0/実stdoutstderr EOF-FDclose、ownPG ESRCH absent・force0を別記録。その後のみsamefresh DB1 readonly query_only/FK/integrity/事前5case expectation audit→実close、extraDB0。resources0はsocket actualclose0件と明記 |

容量/前任/全コピーの不足は別受入に残す。CR03/04は25 drainの1件経路であり25/51page境界や未知legacy starvationを証明しない。recoverableRuntimeIdsはcurrent1のみで、最大65/current+acquire-confirmed64の実回復0。OR private entries+predecessorProofs上限67の ordinary 67成功/68番claim、Drive別registryのready67保存/prune、両namespace前任closed未ACK/ACK-loss、Google actor-null global debt/late adoption、legacy whole cutover、8MiBコピー、unknown personal purge genuine owners、同候補browserは未検証。新fresh成功をlegacy gate解除へ代用しない。

### public-only read台帳

今回必要範囲のsourceは下記28path（全て隔離tree内public source、管理入力はcriteria/P5d.md・contracts/account-delete.md）。private root/helper生成物・成功DB・cache/environmentの読取0。

| 群 | exact source paths（worktree相対） |
| --- | --- |
| HTTP/native owner（10） | `packages/core/src/adapters/node/auth/googleHttp.ts`; `packages/core/src/adapters/node/auth/googleOidc.ts`; `packages/core/src/adapters/node/auth/config.ts`; `packages/core/src/adapters/node/auth/credentialRuntimeOwnership.ts`; `packages/core/src/adapters/node/authenticationExecution.ts`; `packages/core/src/adapters/node/openrouter/http.ts`; `packages/core/src/adapters/node/openrouter/provider.ts`; `packages/core/src/adapters/node/openrouter/execution.ts`; `packages/core/src/adapters/node/openrouter/config.ts`; `packages/core/src/adapters/node/openrouter/secretProtector.ts` |
| application/domain（8） | `packages/core/src/application/account/ports.ts`; `packages/core/src/application/account/google.ts`; `packages/core/src/application/account/deletionWorker.ts`; `packages/core/src/application/account/deletion.ts`; `packages/core/src/application/integration/openRouter/connection.ts`; `packages/core/src/application/integration/openRouter/ports.ts`; `packages/core/src/domain/account/deletion.ts`; `packages/core/src/domain/account/ports/accountDeletionRepository.ts` |
| DB/normal factory/source fixture（7） | `packages/core/src/adapters/libsql/client.ts`; `packages/core/src/adapters/libsql/hollowUnitOfWork.ts`; `packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts`; `packages/core/src/adapters/libsql/repositories/openRouterRepository.ts`; `packages/core/src/adapters/libsql/__tests__/accountDeletionCredentials.integration.test.ts`; `packages/core/src/application/di/serverHollow.ts`; `apps/web/app/server.node.ts` |
| public callback/transport shape（3） | `apps/web/app/presentation/openRouterHttp.node.ts`; `apps/web/app/presentation/openRouterServerFn.ts`; `apps/web/app/presentation/openRouterInput.ts` |

以上は採用CR01–05候補と未採用HTTP境界の静的固定。製品dial追加・新root予約probe/生成・テスト/DB/native HTTP実行0。fixture/helper新4pathsだけ実装、全writer/read停止。

現在候補: commit476dd475/source84manifest7b0647c3で第五有限一巡11case/3suite PASS（4609ms）。3afterAll正規close・knownfork3 actualexit/EOF・Nodeexit0/2PIPEEOF-FDclose/ownPG ESRCH absent/force0の後、samefresh正常DB3 directreadonly auditのFK/integrity/anchor/readonlyclose全PASS。denial/diagnostic0。0044 six-copy修正後のfresh実移行と正常personal回収・WS保持・入口fence・lastowner・再登録・legacyheld負例を観測。nativeHTTP/wholecutover/closed未ACK/67receipt/copies/unknowngenuine/browserは未成立で、A–H全完了へ補完しない。規定checks PASS、source無変更、全writer停止。

固定commit `476dd475b405573715589ea5b1e2f3c61b609d5f`、親/main HEAD `c2a3d45f1097533c6344346aca303dc1d2aef368`。既隔離branchへ正確な製品84pathsだけcommitし、main未merge/HEAD不変。CF生成型・工具・helper/reportはcommit対象外。前後84manifest/各file fullhash/commitblob一致、追加source変更0。

2026-10-06。基点 `c2a3d45f1097533c6344346aca303dc1d2aef368`、branch `goal-implement/p5d-c2a3d45f-20261006`、worktree `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006`。main 製品・P5c B・UI helpers は変更しない。承認正本は [account-delete](../contracts/account-delete.md)、[P5d A–H](../criteria/P5d.md)、[formal plan](P5d-formal-plan.md)、[独立計画レビュー](../reviews/P5d-formal-plan.md)。本書は source 候補の報告で、A–H の受け入れ成功ではない。

## 保存と入口

StoredAccount は active/deleted、通常 Account は active-only。退会 Tx は本人 canonical email・active 最後 WS owner を正本確認し、account authVersion fence と deleted anchor、session/profile/membership 失効、取消・永続 intent を同 Tx に保存する。accepted DTO は `{status:'accepted'}` だけで、内部 ID を公開しない。afterCommit 通知の例外は受理結果を巻き戻さない。再登録は新 account ID で旧著者を付け替えない。

| 入口群 / public 接続点 | authoritative fence と差分 / 既接続 |
| --- | --- |
| requireAccount/currentUser/captureAuthentication/issueSession | accountRepository の findById/findByEmail/findSession active-only、session SQL admission。deleted/missing は別 identity projection |
| Google callback/finishGoogleProof/link/setPassword、OR callback/check/retry | authenticationRepository/googleAuthAttemptRepository/openRouterRepository の active/authVersion/browser/source CAS。Google verified/proof-required の実 claims.subject→identity/account を completed/claimsNULL より先に同採用 Tx で照合。result account は immutable actor-null use と独立 FK に一度だけ束縛 |
| Drive actor/current/admission/reveal/late result | 既 readDriveActor/storedDriveContext/current の active account projection と driveRepository の直接 claim guard。旧 epoch/session/token を再登録者へ付け替えない |
| canScope/requireNote/requireScope、move/create/publish | workspace/access actor active、workspaceRepository active membership/ownerCount、0044 notes/membership guards。move の旧所有/新所有とも active を確認。過去 creator/uploader を cleanup authority にしない |
| public profile/note/discovery/link/grant | publicProfileRepository/publicNoteRepository/publicDiscoverySnapshot/sharingRepository current personal owner active。既公開 usecase はこれらの current 正本を再読。deleted 個人 URL は返さない |
| media/history/original/export、PDF/ZIP artifact/delivery/anonymous | asset access の requireNote/canScope、exportRepository、pdfHelpers/pdfAnonymousHelpers/zipHelpers。anonymous actor NULL でも current note owner fence。ZIP delivery は current artifact entries を IO 前に再確認 |
| import/reference/batch conversion direct claim | jobRepository/batchRepository/referenceRepository active actor・current note lifecycle・current personal owner を eligible に追加。deleted 先頭行を選ばず queue を塞がない。finish/cleanup は元 exact 所有証拠 |
| LLM/PDF preview/machine/source | llmRepository claim、regenerationRepository claim、regeneration/source/current/read と 0044 admission/claim guard。executor と credential owner active、usable binding、current note。retained record は locator 検査より先に recorder-unavailable、通常 read/claim/retry へ渡さない |
| PDF/ZIP computation/delivery/export/media/icon IO | 既 public request の requireAccount/canScope と正式 0044 direct guards。objectOperationRepository ownerActive に current personal owner と当該 actor active を追加し、既 write の IO 前にも fence |
| invitation claim/delivery/adopt | invitationRepository issuer active・WS active・正式 owner role を eligible へ追加。delivery は current issuer 再照合後に token reveal、IO 前にも再読。既 cleanup/terminal は維持 |
| cleanup / runtime 駆動 | account intent exact version/token/lease/current personal owner、既 object delete token/done、closure/inputclosed0/ACK。purgeRunner の既 wake/periodic/stop へ専用 sweep を接続。新 timer/別 boot/runtime0 |

上の表は source に基づく入口候補台帳。独立 Verifier による public callsite 全列挙と direct bypass の動作照合は未実行で、網羅性の受け入れを主張しない。

## コピー回収台帳

| 保存コピー | 処置と閉鎖前提 / 最終検査 |
| --- | --- |
| accounts email/password/displayName/verifiedAt、sessions/profiles/membership | 受理 Tx に縮小/失効、ID/deletionId anchor と来歴参照を保持、account createdAt は属性縮小で NULL。public profile/icon/handle は本人失効と有限 cursor、shared auth browser を無差別削除しない |
| drive_connections credential/folder/lastUsed | actor fenceで新 reveal0、accountHeld の全 owner/input/object 閉鎖後 unlinked/null。元世代・tuple は閉鎖確認まで保存 |
| drive_authorization_attempts data/candidate/verifier/confirmedFolderIds | none は正式取消、owned は actual closure/callerEnded/ACK receipt 待ち、terminal row 全体を削除。data 内 subject/email/envelope を別コピーとして残さない |
| drive_control_operations subject/data/credentialUse | 同 exact owner 閉鎖 receipt 後削除。通常 immutable replace は緩和しない |
| drive_backup_transfers identity/sessionEnvelope | terminal・readPinned0・refreshPending0・object_writes0・closed actual ACK receipt 一致後 row 削除。sessionEnvelope だけ NULL にして identity を残さない |
| drive_backup_target_heads/targets | 全 job/transfer/source dependency を待って head 除去、target を matching deletion の recorder-deleted shell へ。ID/note/original/account/version/time/state の不変を guard |
| drive_backup_jobs admission_identity | 正式 queued cancel と owner closure 後 admissionIdentity NULL/shell。recordId/outcome/成功来歴を維持。normal prune は退会 intent なしだけで dedicated cursor/debt locator を失わせない |
| drive_backup_records subject/fileId/folder/webViewLink/resourceKeyEnvelope | matching target shell と実 dependencies 閉鎖後全コピー NULL。存続 WS/移動 note は recordId/sha/bytes 来歴を維持、read は recorder-unavailable |
| regeneration_source_bindings subject / attempts completion | terminal never-owned cancellation 又は実 closed/callerEnded/ACK 後 attempt 除去、binding は retained subjectNULL。consumer unknown を failed としない。normal removeReleased の実 DELETE RETURNING と捕捉元tupleだけで debt 解放 |
| consumer inputReceipt/sourceMemory、personal originals/body/media | sourceReceipt closed0、owner 閉鎖、source attempts実 ACK、object writes0後だけ正常回収。consumer redacted→consumer→attempt→binding→record/original→note の正式 FK 順。個人未知結果は下記の採用済限定 privacy purge 枝（unknown source_origin更新0/直接DELETE）、正負DBcase未実行 |
| Google identities/attempt claims/verifier/proof/challenge email、email verifications | actual adopted origin/native use 全閉鎖/callerEnded/ACK、actor-null unresolved global debt、legacy no-use gate を確認して cursor25削除。subject/emailから actor を推測しない |
| OR connection/candidate/verifier/providerUserId/all epoch uses | actual saved adopt/current connection epoch の origin と全過去 use閉鎖/ACKを確認。legacy origin 上書き0、closure前秘密縮小0 |
| credential_origins / credential_uses | provider namespace/source/browser/actor/authVersion/runtime/token/key immutable、resultAccountId独立FK一方向。business credentials/attempt→origins→uses の FK順、final全世代EXISTS |
| account_deletion_drive_acknowledgments | 全 account ready native receipt を intent-independent25件 drain→exact保存→同値read→privateconsume。business依存縮小後 receipt削除、normal pruneは business+matched receipt同Tx。finalEXISTSに含む |
| unbound本人 uploads/media/profile icon/export | 専用 owner/current refs/current personal scope 再照合、removeClaimed前後 intent lease/version/current owner/write を検査、実 object_deletes done token 後 storageCleaned/rowcleanup。WSと移動済み note に一致しない creator だけで削除0 |

個人 purge debt は matching account_deletion_purges link・現 personal owner・不可逆 account fence を同 Tx 再読し、hasWriters の actual closure/ACK/inputclosed0 と元 locator tuple を確認してから解放する。row不存在/terminalstateだけを closure としない。通常 prune/drain 容量は dedicated retirement intent 本人だけを cursorへ譲り、退会なしの67receipt恒久fenceを作らない。

## Native 資格所有と競合

configured Google/OR は別 namespace/version1 credential-use-v1 を claim 前に acquire。createLibsqlClient actual local-file client→getDatabase exact db object の private provenance、実 UoW 同 db、canonical path/fileidentity が一致する。nonfile/fake/clone/direct drizzle/欠測は ownedcapを発行しない。owner record は最大64 acquired-confirmed 前任、currentを含む回復対象≤65。exact既知record PID absence・private前任cap・sameDB/namespaceに束縛し、一般runtimeID/PID探索/Drive世代を借りない。

native HTTP request/response/socket の実closeと whole callback（claims/inspectの後の採用UoWも含む）の終了、opaque exact tupleを保存CAS→同値read→ACKへ結ぶ。closed/callerEnded未ACKとcommit応答不明は元proofを保持し同値再読で収束する。callbackを始めず beginUseTxが実 settleした entry は同 ordered DB exact不存在を確定した時だけ cancelUnclaimed 元capをconsumeし67枠解放。abort/deadline/promise resolve/TTLをactualcloseへ代用しない。

Drive receipt は acquireDriveRuntime が登録した同 ownership object/元bindingからだけ発行。clone/fake/constructor/defaultstore/generation文字列一致0。通常actual ACK順とsource opaqueproofは維持する。purge sweep は Drive maintenance lane内で全account25drainし、normal pruneは未保存private receiptがあれば停止。同 lane で commitlost保存再読を行い、private receiptはDB確定後だけconsume。row削除推測0、closed missing ACKはhold。lane所有/停止/normal67件後の容量と退会競合の実証は未実行。

## 0044 と規定チェック

Drizzle-kit 0.31.10 公開 APIで28 schema宣言の静的閉包だけを importし、DB接続なしで0044/snapshot/journal生成。registerHooks+stripTypeScriptTypesで拡張子解決、外部は既publicdeps/owncoreのみ。57生成DDLと既guard257再構築、追加P5d79guard、113table snapshot。binding3 compositeFKの DEFERRABLE INITIALLY DEFERRED を保持。legacy originsは legacy-unproven backfill。旧0032–43/他既migration差分0。正式libsql migratorはFK OFF外Tx→FK ON finally、0044末尾FK checkのCHECK0で違反時rollback。SQL実行・移行成功の証拠ではない。

静的確認: P5d79guardのquote-aware括弧不整合0、snapshot113tableへのNEW/OLD不明列0。FK/index/triggerのDB正負動作は未検証。

公用依存は [P5d-public-tooling](P5d-public-tooling.md) の **105declared+3hoist=108links**（AGENTS別）。以前97+12=109は計数誤差、数合わせの新dep0。toolは公開tsgo7.0.0-dev.20260513.1、Biome2.4.15、tsc6.0.3、pnpm11.1.2。単発 owncwd/PATH公開bins前置+元PATH継承、pnpm_config_verify_deps_before_run空文字/CLI false、recursive children同env。install/network/main設定0。

| 規定check | 現結果 |
| --- | --- |
| pnpm typecheck | CF正式型生成後の一巡 exit0、root tsgo/core/web/infraCF/infraAWS全workspace成功。先行worker-configuration.d.ts欠測21件は解消。退会UI/fixture source誤りも修正済。DB/動作受入の証拠ではない |
| pnpm lint:fix | 初回59file安全整形、native lock finally直throw1errorを専用exact inode teardownへ補正。latest --diagnostic-level=error exit0、SQL type importソート1fileのみ。型check後の実ロジック変更0、unsafefix未適用 |
| pnpm format | exit0、1file整形。最終 format:check --diagnostic-level=error exit0/Fixes0 |

初回tsgo commandnotfoundとinfra missing declarationsはpublictool/PATH/link前提の失敗、fixture accounts.insert/owner kindとUI useActionState/不在routeはsource失敗として区分。Cloudflare type-onlyはWrangler API案を不採用とし、固定Python/tomllib helper+正式workers-types生成をRoot採用後に1回実行、成功。weak宣言stub/旧cacheddeclコピー0。

## 検証用 source と未完

新test sourceは accountDeletionFixtures/schema/application/credentials、UI input/component の既正式paths。fresh明示root0700/DBwx600・logical3/各32MiB/合計64MiB/root192MiB、accounts6/WS2/note12・history51/page25、Worker/child0、case40s/suite180s/bail1、失敗DB再使用0/失敗物unlink0の境界を持つ。root/DB/test/browser/Worker/runtime実行0。新fixtureは旧helperをimport/reuseしない。

source cases: G01wrongfence/G02anchor/session/FKguard、A01email mismatch/B01soleowner/A02通知throw/WS保持/B02direct lastowner/A03email再登録、F01履歴51/page25+原本/objectなしpersonal note publicpurgeport回収、E01fake/nativecap拒否/E02Googleonlylegacyheld/E03legacyoverwrite拒否、UI transport/input/pending tests。いずれも未実行。HTTP/browser integration、native actualowner/closed未ACK predecessor/ACKlost、67正常receipt/drain race、原本/media8MiB回収、move両順序・directclaim全入口・mapper全枝・全世代copyの動作caseは不足しており受け入れ未完。

legacy whole Node cutover capability（旧run.stop外Google/OR遅採用を含む）がなく、legacy no-use/origin missing/unprovenを fresh ownerからnever-ownedと推定しない。safe upgrade gateでheld、P5d-E/F/G該当未完。永久秘密保持を完成としない。

unknown machine/Drive-bound LLM personalpurgeにはRoot採用のprivacy purge限定枝を実装。purgeRepository.hasWritersは当該account-deletion/currentpersonal/deletedanchor/intent↔purge↔trashoperationの同値と、current input receiptのconsumer/runtime/token/generation・closed0だけでunknown-only blockerを除外する。phase/response/quota/sourceattempt実closed/callerEnded/ACK/object/readpin/refresh/PDF/ZIPの既blockerを維持。archiveJobsはunknownのsource_origin/outcomeを更新せず、consumer→attempt→bindingの依存順で直接DELETE。0044のmachine_regeneration_delete、machine_regenerations_source_delete、llm_conversions_source_deleteだけに同Txの限定DELETE例外を加え、旧migration/通常source_update/outcome guardsは変更0。WS/movednote/ordinary machine・Drive-bound LLM unknownは保持。正負DBcaseとgenuine native closed proofの受入は未実行で、型/source照合をE/F完成に代用しない。

A–Hは source候補/部分check の段階。独立レビュー・有限実行条件の採用・DB正負case・同候補browser確認が必要。

## 差分 scope と source fingerprints

C=`packages/core/src`、L=`C/adapters/libsql`、W=`apps/web/app`。正式案exact集合＋regeneration read/current2pathsが基礎。追加採用: node/purgeRunner、fakeUoW2tests、credential10paths、CU1owner/config/server.node4、objectOperationRepository、Driveports/execution/runtimeOwnership/runner、jobRepository、invitationRepository、client.ts。server.nodeはcredentialfactoryだけでnamedBackupSourceexportを保持。撤回serverHollow/todo/outbox runner変更0。他runtime製品変更0。以下の実差分を各根拠へ照合した候補manifest。

実差分84paths。manifest SHA256 `7b0647c36d2a454996278dd6bda6153d5e89b16c371243ee6ce817d90b684d9b`（sorted relativepath+space+sha256+LF）。隔離branch commit `476dd475b405573715589ea5b1e2f3c61b609d5f`、親c2a3d45f/mainHEAD不変。source/report全writerを停止して独立レビューへ渡す。six-copy修正後の新候補DB/runtime/testは未実行。

| exact path | 採用根拠 | SHA256 |
| --- | --- | --- |
| `apps/web/app/components/hollow/AccountDeletion.test.tsx` | formal-plan exact集合 | `fa1e89fccfd1de45da5246b1ec43b1f043d784bada3c52eb525aa50d42bd8cc1` |
| `apps/web/app/components/hollow/AccountDeletion.tsx` | formal-plan exact集合 | `cc851eb54a632f6094bc9f3b055eb1304c479e0a3a51a358244f91914af74b6c` |
| `apps/web/app/presentation/accountDeletionInput.test.ts` | formal-plan exact集合 | `30d1d8c8eaf2586aeb8b470a5f1da03800bddc3f8038191b6c04fc8cdef04d7d` |
| `apps/web/app/presentation/accountDeletionInput.ts` | formal-plan exact集合 | `0a5075d2da9a7cc4e5b533168e8ce240aea936e38bc9613affbe2ad77458dc0d` |
| `apps/web/app/presentation/accountDeletionServerFn.ts` | formal-plan exact集合 | `3da967ff5914f274d8a6f194634c8ceae1be04bd23448202cadbcb18d055e35e` |
| `apps/web/app/routes/settings.profile.tsx` | formal-plan exact集合 | `55a193e4dcf6391cd9744dd7e868a4a47622f849d14cbfc667008bc656effb6c` |
| `apps/web/app/server.node.ts` | CU1 Root採用configuredfactoryのみ | `6ad03065decfcdf2b906901766a7328654a37378dc51597336cfc64af6112b85` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletion.integration.test.ts` | formal-plan exact集合 | `5a79dd087f225769841015ae47d0f0acf0ab18bbff763c0640f3fc63d65f334c` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionCredentials.integration.test.ts` | formal-plan exact集合 | `c4bf84d1b87b2c9f2fe1708219e33beca4360676d4d3e80b6f29ceb291d5e66e` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionFixtures.ts` | formal-plan exact集合 | `5876ca9e38a788c471e59f7ea3d5a023140952f788bb410535a80553760d299a` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionSchema.integration.test.ts` | formal-plan exact集合 | `55f93dfbe053823593df1c0e23a3cbf432a78ba89ff346c71e89c65b906766b6` |
| `packages/core/src/adapters/libsql/accountDeletionSchema.ts` | formal-plan exact集合 | `bc7da68fd7647053d93a42b753ac5e485d699cf4545831c84b34df9cca853451` |
| `packages/core/src/adapters/libsql/client.ts` | Root採用private localDB provenance | `0fa9c5f6b9e81a0b5c0733f7cf908833bac74c08461eef9d42cdde6bb49a0b75` |
| `packages/core/src/adapters/libsql/driveBackupSchema.ts` | formal-plan exact集合 | `f57f9940a5ed8c6f93bf97dd2da312947be73f5ad96c7646b8ac6e5dc768b36f` |
| `packages/core/src/adapters/libsql/hollowSchema.ts` | formal-plan exact集合 | `cd704a1f2ebcb567a5cd4af15b69935d8cbd4ec75246d99350e601df7c7643f4` |
| `packages/core/src/adapters/libsql/hollowUnitOfWork.ts` | formal-plan exact集合 | `b6434a068b8cbcb8780592390e9bdab5697bb0ed1e938ec220976982eac5036e` |
| `packages/core/src/adapters/libsql/migrations/0044_account_deletion.sql` | formal-plan exact集合 | `cedcab4dd315dab2f25ce5d691ebbf7b13a01f6a9a842dce5246329825605e33` |
| `packages/core/src/adapters/libsql/migrations/meta/0044_snapshot.json` | formal-plan exact集合 | `77460304b5f310a4e6befed6fbdc0f59e19a36de5e9fd4156c5ad28e778d01b3` |
| `packages/core/src/adapters/libsql/migrations/meta/_journal.json` | formal-plan exact集合 | `1d97708f2cc7ab3fe9060115883863cf1f708e2f8b28a803fc8ffad787465ffe` |
| `packages/core/src/adapters/libsql/publicDiscoverySnapshot.ts` | formal-plan exact集合 | `965e2084e69a8655c830c12e567af4966fd5a8b779d6bd04aca41f9e273a2849` |
| `packages/core/src/adapters/libsql/purgeSchema.ts` | formal-plan exact集合 | `958c282df9162c3070778105afa3b4f20a7fdc89e256c5bfeefbefde38c6b80f` |
| `packages/core/src/adapters/libsql/regenerationSchema.ts` | formal-plan exact集合 | `56b373b0a7a76542eeb6df1ba448d5d4568555fadbf9f14aa3339346ec52d5f7` |
| `packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts` | formal-plan exact集合 | `23a03b0d1414cd2d83e9c5d48beae198a573f71a2d6efb186b98929cdf255f49` |
| `packages/core/src/adapters/libsql/repositories/accountRepository.ts` | formal-plan exact集合 | `00fbdf4e1250f2d1fa6e0684631488cad64757396f6fb3142bb2958f03d62de3` |
| `packages/core/src/adapters/libsql/repositories/authenticationRepository.ts` | formal-plan exact集合 | `621c99454ff9679645b48d3136d5388fc9ca1fecdf53bdcdfcbe99c2bf51388d` |
| `packages/core/src/adapters/libsql/repositories/batchRepository.ts` | formal-plan exact集合 | `baae8440e0402ee6503010b4d51725c6d6e7a9c98e3a843b4c02d50c92fbb535` |
| `packages/core/src/adapters/libsql/repositories/displayNameRepository.ts` | formal-plan exact集合 | `ee8846b6b7e3b5a3219a67022dbd654018e7dd3a6dc361749031086ab192eba3` |
| `packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts` | formal-plan exact集合 | `f636f47a644dafcef83dfa1acb54ca29632802d098f9a8e12e2e49ad9f5fa274` |
| `packages/core/src/adapters/libsql/repositories/driveRepository.ts` | formal-plan exact集合 | `89c4ca9fbab28adc7290610036668931ccb3587d8b42705d1f62215774be7572` |
| `packages/core/src/adapters/libsql/repositories/exportRepository.ts` | formal-plan exact集合 | `c78de2f182afa4237a0e2a2832df0053d12df348bbc6e9fb0aa86df556de0d42` |
| `packages/core/src/adapters/libsql/repositories/googleAuthAttemptRepository.ts` | credential-use10 Root採用 | `49aed45b56c377187e6d998b52d45b7ec6f0b2214b80c9593e1855d9e46c7234` |
| `packages/core/src/adapters/libsql/repositories/invitationRepository.ts` | Root採用direct invitationclaim | `3e5ebfff626adc66c6b9d4ea418e49e3ef846271957f974658cee95604809317` |
| `packages/core/src/adapters/libsql/repositories/jobRepository.ts` | Root採用direct conversionclaim | `e839ccf2ae90053ad68207e20d2c7e9d8070040d68cb87238d4195c5afb84c85` |
| `packages/core/src/adapters/libsql/repositories/llmRepository.ts` | formal-plan exact集合 | `3fac8cab0f7e7482457a0c6f8ef627fb38bfe82ea56e8f67bb676334b38fa499` |
| `packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts` | Root採用IO前fence | `02a91a28b69855bd4288b870b17b1f234c8756e2138800a749b873e894c83969` |
| `packages/core/src/adapters/libsql/repositories/openRouterRepository.ts` | formal-plan exact集合 | `abe57355c1f675da94bb0f6b071e5dae687456558b496b3c4103bf51552fbcb3` |
| `packages/core/src/adapters/libsql/repositories/pdfAnonymousHelpers.ts` | formal-plan exact集合 | `b365d7cbfc9fa7d44dbe893656a61b5e4fd864ca31adb557dda72f2880d3f347` |
| `packages/core/src/adapters/libsql/repositories/pdfHelpers.ts` | formal-plan exact集合 | `8318526e98c61ad2e6f35fdf39d5af19a323de1af740245e611a14b61d12bcf4` |
| `packages/core/src/adapters/libsql/repositories/publicNoteRepository.ts` | formal-plan exact集合 | `daec53385e7cea3072abec8919b69e121fd85849c086a3bb025dcc2a4fb25cf2` |
| `packages/core/src/adapters/libsql/repositories/publicProfileRepository.ts` | formal-plan exact集合 | `f4347860f47a5cdbc98b69189177d5454b856ff643052991daaa9da0bb12de8c` |
| `packages/core/src/adapters/libsql/repositories/purgeRepository.ts` | formal-plan exact集合 | `025cede11e220a34f266dfb86fb9ea1f3bd6a9dfa9a5be02ed5796a743096fcb` |
| `packages/core/src/adapters/libsql/repositories/referenceRepository.ts` | formal-plan exact集合 | `4e22e4b6fe8df1b7300f5c8a5af60d4db749e75682e62bdcaa993e23bbea6ea1` |
| `packages/core/src/adapters/libsql/repositories/regenerationRepository.ts` | formal-plan exact集合 | `75faacac2b2046f1b75cf360d348c6243545bb6c3f5859340874b0520e6de565` |
| `packages/core/src/adapters/libsql/repositories/sharingRepository.ts` | formal-plan exact集合 | `09f920e7f9569d75abb2b015721187bf9e18497b009fc5f3529e4797f08495c9` |
| `packages/core/src/adapters/libsql/repositories/workspaceRepository.ts` | formal-plan exact集合 | `9849b60c65631911b731bf28af9b82c925f86c9176905a24e3a430cdf240e6e4` |
| `packages/core/src/adapters/libsql/repositories/zipDeliveryRepository.ts` | formal-plan exact集合 | `3bdad157afb583e38a7e58a6f33b9e8979439f03df5ecbab36928cc58c0c2b7d` |
| `packages/core/src/adapters/libsql/repositories/zipHelpers.ts` | formal-plan exact集合 | `68c26cd212c2de85070efeb431e1deed992106af0a4c77c96e5e4c58290cb134` |
| `packages/core/src/adapters/libsql/repositories/zipWorkRepository.ts` | formal-plan exact集合 | `e4fd34fc71bd481edc27e075b57b0ea789ca2bdff427ce9536be6c837af89850` |
| `packages/core/src/adapters/libsql/schema.ts` | formal-plan exact集合 | `9a94c65f2fa63719e120a3863abf68ba746a3e16564e226cb191cbc6d2f98f14` |
| `packages/core/src/adapters/node/__tests__/coordinatedObjectStorage.test.ts` | Root採用requiredUoW型追従のみ | `871b2a0a3714ed005d3bc77a98ee85d962f2a68b1ceaf2e10e74f158b37e3951` |
| `packages/core/src/adapters/node/auth/config.ts` | CU1 Root採用Googlefactory | `4b6cace2b6f45dd9e13c0e3c31fc60409853d68e1ed6ec0b5fd639ee67083490` |
| `packages/core/src/adapters/node/auth/credentialRuntimeOwnership.ts` | CU1 Root採用nativeowner | `e07cd78565fe7e7b94480fc1253495d3360f24cc3b11c5027f6ad1a83dfb9dcc` |
| `packages/core/src/adapters/node/auth/googleHttp.ts` | credential-use10 Root採用 | `a89479a2729bfd49d4a866239d35e38bd56bae37ba2c94e43b48d1bfb4266d14` |
| `packages/core/src/adapters/node/auth/googleOidc.ts` | credential-use10 Root採用 | `7d2a3427afeb06ee304821b8979443a90d97b47c16249533a0b982852ad186a7` |
| `packages/core/src/adapters/node/authenticationExecution.ts` | credential-use10 Root採用 | `a4cf2349d298d315ee609dcb4ca2d9ef5f4862ee194220912629309921bcdb7b` |
| `packages/core/src/adapters/node/drive/execution.ts` | Root採用actualACKreceipt | `de88261f15b303732f095e85f626cc722d8b88486c52b628ee72cdd0ef958d09` |
| `packages/core/src/adapters/node/drive/runtimeOwnership.ts` | Root採用privateactualacquire | `f9d04799b5da89f5306abbe2459f20eec188be81fad187dd6b5889295a1890c5` |
| `packages/core/src/adapters/node/openrouter/config.ts` | CU1 Root採用ORfactory | `0a449463f45ff3e71eae682c9a7ddf4e5baffbab9d085ee5d45bbfc35e5e004e` |
| `packages/core/src/adapters/node/openrouter/execution.ts` | credential-use10 Root採用 | `4f6977a3ab2dbd0c861f39c24a1ad4242758f6706baf0a3572de58fec138706f` |
| `packages/core/src/adapters/node/openrouter/http.ts` | credential-use10 Root採用 | `8fccdbb778bdba69dc11215eae6fc7aecd8d04cab6df76ffaf4a3046448bde86` |
| `packages/core/src/adapters/node/openrouter/provider.ts` | credential-use10 Root採用 | `93c48e26dc03e0c0f5367cb58279931a22e252d1ce008fee45bb32607ac610ed` |
| `packages/core/src/adapters/node/purgeRunner.ts` | Root採用既purge sweep | `ee5ddf0c958d93343cf343aa3e2e9c35ea6e5d3541be6fc198c56e0b23634a22` |
| `packages/core/src/adapters/node/zip/ownedStorage.test.ts` | Root採用requiredUoW型追従のみ | `a08866400fff123555fbbc5505978328b44f0cd5901541fdb2761598b706364f` |
| `packages/core/src/application/account/deletion.ts` | formal-plan exact集合 | `da08ec61121843b2e1734609ece2050aa6c4544b20c81db648af40e55345c021` |
| `packages/core/src/application/account/deletionWorker.ts` | formal-plan exact集合 | `efe1164dbe04e57368955b9b6387c7cca121ae6b11f53774436934766f6cacfb` |
| `packages/core/src/application/account/google.ts` | formal-plan exact集合 | `da9cf5609e0a6ef79f4e6631668c99c879ec13574225c95ef85b5243fd174ca3` |
| `packages/core/src/application/account/ports.ts` | credential-use10 Root採用 | `a2cab0e0551497dac82a0225013dc6dfb052e53b43081148f27c622158f3c3cf` |
| `packages/core/src/application/execution/hollowUnitOfWork.ts` | formal-plan exact集合 | `df283ea3e7e50d76f982dbd6848494234502a220b7d16fc4ff1b0abf64a0854f` |
| `packages/core/src/application/integration/drive/ports.ts` | Root採用receiptport | `c6e47c5541c4bd8b9299efa1cf482b5e8484fd9957431fc8d8e4f7225dd8d97f` |
| `packages/core/src/application/integration/drive/runner.ts` | Root採用normalprune/前任ACK2guards | `d8aca1e28924ec29f5f626bce2f5501c9c4c47489f15652b49747dc47f1f93bf` |
| `packages/core/src/application/integration/openRouter/connection.ts` | formal-plan exact集合 | `3d9ad014cc51d204b190bfa809d08ada1dc266c73d5ed66fbedd3c34fd5a5afe` |
| `packages/core/src/application/integration/openRouter/ports.ts` | credential-use10 Root採用 | `2e09844e0a28e194133ef20aa9269b1f077a9ed3de8ba022bf46a463aa8702b6` |
| `packages/core/src/application/note/purge.ts` | formal-plan exact集合 | `9cb3636376fd575fb6b6ecf95215fe561675a2e6ecce8a694d509ccae99992f0` |
| `packages/core/src/application/regeneration/current.ts` | 正式P1 shell先分岐 | `edf3d64c07ecbb6aefb910f4d60d32568972369dff151f4340f7d926012eb443` |
| `packages/core/src/application/regeneration/ports.ts` | formal-plan exact集合 | `28f9cb42110e538307f2dc3b0ff3b146c33c3edf78878699836bbe438f03768d` |
| `packages/core/src/application/regeneration/read.ts` | 正式P1 shell先分岐 | `a2179df7f048ef0ee9a43b97c0b8a892aa5297252b6a1ba1e50fcb5ebded06f3` |
| `packages/core/src/application/regeneration/source.ts` | formal-plan exact集合 | `b8b5d5a9ea85036788fe96480d73496a9e64c02d251bc67ac2a96f16c7a883fb` |
| `packages/core/src/application/workspace/access.ts` | formal-plan exact集合 | `b95a3b77babd2754496d0e72cfeaa107f92a3019453e825809806f99331b4c64` |
| `packages/core/src/application/workspace/delivery.ts` | formal-plan exact集合 | `78f644005ebfd35573c2fb10d9a904326c066e6b0f152820b94d53f903863fee` |
| `packages/core/src/domain/account/deletion.ts` | formal-plan exact集合 | `49bdd4e4c17e66b660a22cb12aac40d62967295509b79ba20599bfa3efdd977c` |
| `packages/core/src/domain/account/ports/accountDeletionRepository.ts` | formal-plan exact集合 | `dfc03e777c476c667edec875dcf82bcc4c9728398415e213e12cb0e03761b411` |
| `packages/core/src/domain/account/ports/accountRepository.ts` | formal-plan exact集合 | `18fb8a4498ceedcf0d04985f782d0cc4d921305935c96589f6037283131fc6fd` |
| `packages/core/src/domain/integration/driveBackupRepository.ts` | formal-plan exact集合 | `399f1b91efb0b1ccf72ac154d8cfef5cb5af0217920fb384c2d66f60943b4fcf` |
| `packages/core/src/domain/purge/entity.ts` | formal-plan exact集合 | `62b20045c30c37ef230f1c6fe84a78b8202ed5a1b52e1f5250bb965e27a9c91d` |

## CF 正式型生成 helper の固定 preflight と実生成

Wrangler API案を不採用とし、公開 helper `.goal-implement/helpers/cf-env-types-generator.py` 1pathを独立preflight PASS後に採用。9336B、mode600/regular/nonlink、SHA256 `24f6e754e7d159b9360ce0539d44a2a35443def2922fc5c8b439cd93ec08e006`。必要か検討したlauncher sourceは未実行のまま除去し、Node/Wrangler/esbuild/formatMessagesSync/Miniflare/workerd moduleを呼ばない。stdlibだけ（argparse/hashlib/json/os/pathlib/re/signal/stat/sys/tomllib）、Python3.14.3公開binding `/etc/profiles/per-user/hikaru/bin/python3` の `-I -S` でsite/user/PYTHONPATH読取0。子/Worker/socket/network/metrics/log/cache/env探索/DB/app source実行0は、これらをimport/invokeしない閉包に束縛する。未知config/binding/typeはfailclosedでany/stubへ落とさない。

実行argv（Popenのexact引数/minimal env）: `env -i PATH=/etc/profiles/per-user/hikaru/bin:/usr/bin:/bin /etc/profiles/per-user/hikaru/bin/python3 -I -S /Users/hikaru/github.com/tuanemuy/hollow/.goal-implement/helpers/cf-env-types-generator.py --tree /Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006 --tool-root /Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006/.public-cf-types-tool`。HOME/CODEX_HOMEを設定/転用しない。実行工具はouter Python supervisor process1→helper child1、helper内部child0。呼出側は30sec alarm/外40sec・actualexit0/標準出力標準エラーEOFを確認し、unknown/timeoutを成功にしない。出力summaryはfinitecode/count/hashだけ、sourcebody/ID/privateenv出力0。

新toolroot exact1 `.public-cf-types-tool` をtree直下へwx相当不存在gate/0700で1directory生成、内容0files/0Bを前後確認。generated output exact1 `apps/web/worker-configuration.d.ts` は不存在gate/wx600/O_NOFOLLOW/fsync/親dirfsync/exact inode+hash再読、2MiB以下。上限超過/失敗後はroot/output保持、unlink/chmod再試行0。tree0700/UID/realpath同値を前後照合。Root採用後にtoolroot1/output1を実生成し成功、rootは空のまま保持。

入力exactはown tracked `apps/web/wrangler.toml` SHA256 `0a599c80196b5f1250227071d56770df2af94179293ca172be23a1e54f166886` と正式 workers-types4.20260511.1 public canonical `.../.pnpm/@cloudflare+workers-types@4.20260511.1/node_modules/@cloudflare/workers-types/index.d.ts` SHA256 `b2e69e6ab70aa354fec99eee7bca72d63f5979539df6c4202981f4a7f90ae79c`（480354B）。own declared dependencyが同canonicalへ自己解決することを照合。main/private/cachedgeneratedtypeを読まない。all referenced entry modulesはexact既知5trackedpathsのregular/realpathだけを検査し、import/build/executeしない。configにはDO binding0なのでDO aliasを創作せず、正式public DurableObjectState/cloudflare:workers宣言があることを検査する。

Cloudflare.Envは5環境の実binding union、全環境共通 `APP_URL`/`DB` だけrequired、`ASSETS`/`RELAY`/`EVENTS_QUEUE`/各OUTBOX変数はoptional。型は正式Fetcher/D1Database/Queue、varsはexactliteral union。RelayEnv/ConsumerEnv/PrunerEnv/DlqEnvは個別configの全bindingrequired。global EnvはCloudflare.Envを継承、GlobalProps.mainModuleはtypeof import('./app/server.cloudflare')へ正式mapping。soleconfig hash・knownkey/重複binding・literalmanifest checkerを持ち、namedenv未定義/未知binding/未対応typeは生成拒否。正式workers-types triple-referenceを付け、weak declarationやEnv.DBのany fallback0。S4へはpublichelper/hash/argv契約だけを渡し、別tree自身の同trackedconfig/publicbindingへ結ぶ。P5d writer中source/tree共有0。

静的AST parseと独立preflight PASS後、Root採用の一巡実生成が成功。helper自身は変更0。actual証拠は以下。

未実行app/nativecase manifestは上記6testsource（schema2/app6/credential3/UI2suite）を新logicalDB3/account6/WS2/note12/履歴51/page25内へ束縛する。sourcecaseはpublic repository/UoWと正式migrationだけ、native HTTP呼出0。native owner/acquire/closed未ACK/commitloss/正常67receiptsは別の有限sourcecase設計が未完で、この3DBケース成功へ代用しない。HTTP/browserは別採用scopeまで0。

## 承認済 privacy purge 差分の固定

purgeRepository.ts と0044だけを既84path内で更新し、規定format exit0（1file整形）後に全product writerを停止。例外は同じ正規UoW内の現在のpurge lease/intent/owner/anchorと保存済inputreceiptに束縛する。JSON/型文字列を新proof発行に使わず、proofを保存した既正規経路の閉鎖値を照合する。unknown結果をfailedへ置き換えず、unknownのsource_origin UPDATEを行わない。新許可path0・旧migration変更0・DB/runtime/test/Worker/browser実行0。SQL336triggersの括弧静的balanceを照合、3変更DELETE内NEW/OLD列は既snapshot宣言へ一致。json_each alias new/oldのvalueをNEW/OLD疑似rowと誤分類した全体scanner4件は独立した実SQL成功根拠ではない。

## 一巡の CF 工具と規定 check の実証

固定 helper9336B/SHA `24f6e754e7d159b9360ce0539d44a2a35443def2922fc5c8b439cd93ec08e006` を mode600/regular/nonlink/UID/nlink1・O_NOFOLLOW/元inode/前後mtimeで再確認。Python3.14.3 `-I -S` outer supervisor1から exact argv/minimalenv helperchild1を Popen(start_new_session=True,stdinDEVNULL,stdoutPIPE,stderrPIPE)。自己PGをos.getpgid(0)、helperPG=既知childPIDをos.getpgid(childPID)で実確認し、未知PID探索0。inner alarm30sec/outer communicate40sec、actual elapsed105ms・exit0・標準出力EOF/標準エラーEOF・stderr0B・両pipe handles closed、forcedTERM/KILL0。Popen.communicateが両PIPEのEOFまで読み、waitによるactualreturncode0を確認した実根拠で、業務promiseや期限からexitを推測しない。helper内部子/Worker/DB/network0。

新root exact1 `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006/.public-cf-types-tool` は0700/UID/realpath・empty前後一致。output exact1 `apps/web/worker-configuration.d.ts` は986B/mode600/regular/nonlink、SHA `1803d60aa0818e5a3a7630807466ffaae8fdeb0fd85b7fa59431638fc5a479fa`、wx/O_NOFOLLOW/fsync/parentfsync/元inode/再読をhelperが確認。formalconfigHash/actual publictypesHash/bindingchecker成立。unknown/timeout/retry/unlink0。summaryはcount/hash/有限codesだけ、ID/body/privateenv0。

直後の規定 typecheck一巡はexit0（root/core/infraCloudflare/web/infraAWS）。続く規定lint:fix exit0がpurgeRepositoryのdrizzle SQL type import順序1fileのみ変更し、実ロジック変更0。最終format:check exit0/nochanges、generated型986B/hash不変。製品84path manifestをimportソート後へ更新し、generated outputは公開tooling付随1fileとして製品manifestと区分。新commit0/HEAD基点のまま。

全product/helper/report writer停止。DB migration/SQL正負動作・application/native/HTTP/browser/tests/Worker/runtime/build/外部送信/削除/旧private操作は未実行。規定静的check成功をA–H受入やlegacy cutover/unknown正例/native閉鎖の動作成功へ置き換えない。独立reviewと将来の有限条件採用へ渡す。

## 初回有限 DB ケースの実行準備（実行未採用）

製品84path/manifest `5c4eb649d7b7b56f8aa4dd0fae40a9c730a72994525e0873a417b4553f188cb9` と固定CF生成型は変更0。承認済追加helper2pathは `.goal-implement/helpers/p5d-test-runner.py`（Python outer）と `.goal-implement/helpers/p5d-test-loader.mjs`（Node/Vitest監督）。両方wx600で新規作成、regular/nonlink/UID、Python AST parseとNode24.15.0 `--check` 成功だけ。helper自体のpreflight/run/newroot/DB/Worker/子test起動はまだ0。公開s3/native helperとの比較は不要で、旧helper/旧private生成物は非操作。

新root予約は `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-normal-20261006-3f68bb73-9883-4b76-91ee-0163e292a5aa`。未生成/未再読。Python helperは正確な不存在gate後に0700/umask0077で1rootだけ生成し、既fixtureがschema.db/application.db/credentials.dbをwx600で各1生成。logicalDB3/各sidecar込み32MiB/総64MiB/root192MiB/entry≤9、account総6（schema1/app4/credentials1）/WS2/note≤12/history51/page25。rootはDB/WAL/SHM以外を拒否し、失敗物unlink/chmod/reuse/retry0。旧root/files/private.env/data/import/helperを利用しない。

| 正確な suite 順 | case 順 | 範囲 |
| --- | --- | --- |
| accountDeletionSchema.integration.test.ts | G01→G02 | fence不一致拒否、不可逆anchor、session admission、正式FK/guard |
| accountDeletion.integration.test.ts | A01→B01→A02→B02→A03→F01 | email確認、lastowner拒否、即時session/auth fence、存続WS/本文/creator保持、再登録別ID、履歴51/page25、正常個人note回収 |
| accountDeletionCredentials.integration.test.ts | E01→E02→E03 | fake ownership拒否、Google-only退会入口fence、legacy unprovenコピーhold/上書き拒否。native/cutover合格を主張しない |

正式各suite180sec/run12minの内側へ、具体上限各file/suite180sec・case/hook40sec・body300sec・normalcleanup+audit込みouter360secを置く。11×40secの最悪時間がbody300を超えればdeadlineでholdし、延長/再試行/成功補完0。200msの外監督がrootのmode/type/entry/sizeと期限を照合。成功経路は正常afterAll→Vitestclose→正規工具子停止→Nodeactualexit/両EOF→登録ownPGの実不在→DBreadonlyaudit。失敗時TERM10s/KILL10s/PIPE10s tailはnormal成功に数えず、実EOFがなければfalseを保持。失敗後同DBを原因解析の前提として再使用しない。failureは固定stage/case/code enumでstdoutへ保持し、例外body/ID/email/hash以外の秘密を出力しない。

argv（採用後だけ）: `/etc/profiles/per-user/hikaru/bin/python3 -I -S /Users/hikaru/github.com/tuanemuy/hollow/.goal-implement/helpers/p5d-test-runner.py --execute`。preflightのみの同argvから--execute除去でもroot/DB/子生成0、現未実行。外Python1→Node24.18.0公開固定canonical binary1→Vitest4.1.6正規fork各file1/最大3/同時1。config bundler/esbuild子0は `createVitest(config:false,configLoader:native)` とVite `configFile:false,envFile:false` の正式API指定に束縛する。Vite8の宣言と一次sourceを確認したがactual transform child0を未実行のまま実証とはしない。未知spawn/Worker/socketはguardで拒否しhold。NodeWorker0（ネイティブSQLite/crypto/rolldown内部OSthreadsはNodeWorkerと混同しない）、HTTP/provider/browser0。

全toolforkにofficial execArgv --importで同loaderのboundary guardを渡す。child_processはexact public Vitest dist/workers/forks.jsだけを標準fork観測し、戻り値/IPCを改変しない。その他spawn/exec/Worker/socket connect/serverlisten拒否。元native HTTPS requestのfunction identityは変更0。fs書込は新rootの既知DB/WAL/SHMのみ、他mkdir/cache/artifact/unlink/chmodを拒否、未知書込が必要ならhold。config envFilefalse/minimalenv（fixed PATH/HOLLOW_ACCOUNT_DELETION_ROOT/NODE_ENV/CI/NO_COLORだけ）は.env/secret探索0。cachefalse、optimizer noDiscovery、明示single-file include/filtersなので旧全suite収集/自動db:generate/install0。public dependency/selfcoreと84manifest/config/migration0044を実行前照合する。

Vitest ForksPoolWorker.stop の一次sourceは fork.kill()（SIGTERM）→actualexit待機を正規工具teardownに使う。この正常工具SIGTERMと、外監督deadline/失敗時forcedTERM/KILLは別に記録する。各knownfork PIDは外Pythonがos.getpgidで正規Node工具PGへ一致確認、stdout/stderr end+child exit/closeをloaderが実handleから観測。DBcloseの証拠は既fixtureのafterAll中同期client.close（公開libSQL client.closeはpool.close実呼出）と公式file-result pass/close後工具actualexit/EOFを組み合わせる。source呼出があるだけをactualclose成功へ補完しない。直接client物理handleの独立イベント観測は持たず、hook完了と公開close semanticsに依存することを区分する。

readonlyauditは全normal case/file/afterAll完了・3forkactualclosed・Nodeexit0/両EOF・登録ownPGの実不在が揃った後だけ、既知新DB各1をPython標準sqlite3 mode=ro/query_onlyで開閉。追加logicalDB0、FK/integrity/正式migration件数/79guard/anchor同intent/authfence/session0を検査。appはactive3/WS2/存続note1+旧本文/creator deletedanchor/個人note除去/退会intent succeeded/本人履歴0、credentialsはlegacyidentity/origin残存・nativeuse0/intent未succeededを検査。ID/秘密列をexpectedへSELECT転写0、aggregateだけを有限既知fixture仕様へ照合。各DBの元inode/size/mtimeとroot境界を前後照合し、connection.closeを実行後に報告。FK/audit失敗はhold、DB変形補修/再open再試行0。

まだ実schema/app/credential DBcase0。全A–Hsuccessへ代用せず、legacy wholecaller cutover/nativeHTTP/closed未ACK/commitlost/原本media8MiB/normal67receipt/unknown genuineproof正例/UI browserは別不足のまま保持。最初のhelper候補を固定して独立preflightへ渡し、未知transform/closure条件は有限失敗として残す。

## R-PG1 監督 delta の固定

独立reviewのR-PG1だけをrunner1pathへ補正。initial正規Node childの getpgid(childPID)=childPID と supervisorPG別を確認後に ownPG を登録する。leaderはactual poll/waitから absent/alive/unproven、登録ownPGはPOSIX negative kill0相当の `os.killpg(ownPG,0)` から alive/ESRCH absent/EPERMその他 unproven に分ける。要求signal/leader exit/TTL/EOFをPG不在へ代用しない。通常DB監査の前にactual exit0/両EOF/全case+afterAll/file pass/3forkcloseとownPG実absentを必須にする。

leaderが退出済みでもownPG aliveなら、その登録PGだけへTERM10sec→まだaliveならKILL10sec→PIPE10secを実行する。各待機は200msでexactPGのみnegativekill0を再観測し、ESRCH競合は次の実probeで確定する。unprovenを成功に補完せず未知PG/PIDを探索/転用しない。forced・failed・unknownはaudits=NULL/held、同失敗DB読取・再試行0。最終summaryはleaderStateとownPGStateを独立に返し、両absent以外はokにならない。

Rootが撤回したopaque1/audit1は追加しない。正式normal fresh DB3のみへ、全正常閉鎖根拠とPG実absent後にmode=ro/query_onlyでdirect readonly audit、追加logicalDB0。account属性createdAt NULLと、retained target/recordの作成時刻不変を区分しコピー台帳を訂正した。製品84path/CF型/loader8034B SHA `d7a3851a312997eb3b48de8ea0b572a49713848848b26fdb87261f20fce3e713` は不変。runner16839B/mode600 SHA `4cb800474c12aa9dde76bcef42dc186f3a37a4b0040395cdf680f86d9fc5edf1`、Python AST parse成功、helper/preflight/実PGprobe/root/DB/test/runtime実行0。全writer停止して影響deltaの独立preflightへ渡す。

## 初回有限 DB 一巡の実結果

Root採用後に固定runner16839B/SHA4cb80047…、loader8034B/SHAd7a3851a…、phase45203B/SHA95dd82ef…のregular/nonlink/mode600/UID/nlink1/bytes/fullSHAとPython3.14.3、新root不存在gateを実照合し成功。exactargvでrunner --executeを1回起動したが、preflightの固定公開Node `NODE.resolve(strict=True)==NODE and NODE.is_file()` 境界が safe failure `public-node` で拒否。工具exec結果は actualexit1（elapsed約9ms）、有限JSON `{ok:false,failure:public-node,held:true}`。raw exception/PATH/privatebodyは出力0。

新root作成・DBopen・NodePopen・Vitestfork・ownPGprobe・case・readonlyauditはいずれもpreflight終了後のコードなので今回0。rootの後付再読/DB失敗物再読/hash/copy/import/reuse/自動retry0、public-node gateの拒否原因をcanonical metadata未確認のまま断定しない。G01/G02から未着手、11case未実行、DB移行成功/actualDBclose/PGclose/nativeproofの補完0。製品84path/staticchecks/CF型helper/runner/loaderは変更0。公開Node bindingの最小根拠修正と独立再preflightはRootの次採用へ残す。report固定後に全writer停止。

## 公開 Node binding の最小 delta（再実行未採用）

Root採用のreadonly metadata調査だけを実施。現在のpublic profile `/etc/profiles/per-user/hikaru/bin/node` は `/nix/store/a5sxfwnzi3kzxrgj3zfngcqamdhnr161-nodejs-24.18.0/bin/node` へ解決し、canonicalはsymlinkでないregular、UID0/mode555/nlink2/68720016B、SHA256 `861d0000f2c22731a59a5bce1ad2d3d085bff708f2d91a7cefc7a416c0344715`。shell command-vの3mv…24.15/bin/nodeはsymlinkで別4366…nodejs-slim canonicalへ解決するため、初回public-node gateのresolve==NODE拒否をsource/metadataから説明できた。public tool metadataだけで旧private/失敗root操作0。binaryのfilename/version文字列をactualruntime版の証拠にしない。

runnerは明示canonical a5sxfwn…24.18/bin/nodeを使い、preflightでregular/nonlink/resolve同値/UID0/mode555/nlink2/exactsizeを照合。loaderはmainと全official forkの最初のbuiltin-only bootstrapで `realpathSync(process.execPath)===canonicalNode` と `process.versions.node==='24.18.0'` をgateし、Vitest dynamic import・fixture/DB副作用より先に拒否する。失敗codeは有限 `P5D_NODE_BINDING`、未知execPath/versionをfake proofへ転用しない。実Nodeprobe/actualversion観測はこの段階0、次の採用runでこのgenuine startup gateを通ることを実証する。

新rootはmemory literal `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-normal-20261006-3f68bb73-9883-4b76-91ee-0163e292a5aa` へ変更し、旧never-created rootの探索/再読0、新rootの生成/DBopen/run0。case11順/全resource caps/3fork元argv/native ownership/proof/0044/DBclose/audit/PG停止は変更0。変更前helper全bytesをmemory保持し、Nodebinding/rootliteral/loaderhash/failureenum/loaderstartupgateの許可deltaを逆適用して元runner4cb80047…/loaderd7a3851a…の全bytesへ一致するassertに成功。製品84path/manifest5c4e…/CF型変更0。

固定runner17088B/mode600 SHA `1de4c292730bfacf6dd7712b7636c1115911507f9ca48ccc9eafb3b47bf81cd6`、loader8353B/mode600 SHA `cd2e96ed9775de4bc5da42ec9618176d6545d7d6e41c224d0291a3457fc40afc`。Python AST parseのみ成功、実Nodeprobe/root/DB/newrun未実行。全writer停止、独立preflight PASSとRootの次の明示一巡採用まで再実行しない。

## 新 canonical Node・新 root の一巡結果

新候補独立preflight PASS後、Rootの明示一巡採用で固定runner17088B/SHA1de4c292…、loader8353B/SHAcd2e96ed…、phase48746B/SHAa7398c9e…のfullbytes/hash/regular/nonlink/600/UID/nlink1を再確認、新3f68bb73…root不存在gateを確認してexact Python-I-S runner--executeを1回実行。

結果は FAILED/held。工具exec actualexit1。安全な有限eventsは schema stage開始→official knownfork1/sameOwnedPG true→P5D_CASE_FAILURE/schema/case none→summary completed[]/cases[]/forks1/forksActualClosed true/workerCount0/denied true。mainは副作用前actualexecPath canonical/versions.node24.18.0 gateを通過してschema stageへ到達。未知外部claim/proofは発行していない。

Nodeleader actualexit1/leaderState absent、両stdoutstderr EOF・pipeHandlesClosed true、登録ownPGState実absent。監督forcedTerm/forcedKillはfalse、elapsed457ms、raw output279B（本文/例外を転写せずfinite code/countだけ保持）。rootは1生成済。最初のG01にも未到達し、app/credential suites未起動、ケース結果0。DB生成数はsummaryで観測されておらず、後付failedroot再読で0へ補完しない。具体的にどのresource APIがdenyされたかは現safe enumで欠測なので原因を断定しない。

allcase/file/afterAll成功未成立のためaudits=NULL。工具child actualclose/EOF/PG absenceをDB/native owned closureのproofへ転用しない。失敗root全held・再read/hash/copy/import/retry/補修/unlink0。Source84path/CF型/runner/loader変更0、11case successをA–H受入へ読み替え0。失敗root読取によらない公開source限定のguard/工具起動因果調査はRootの次の採用に残し、report固定後に全writer停止。

## guard 診断と正規 memory-fork 候補

3f68 failedroot/DB/results/cache を一切操作せず、公開helperと正式Vitest4.1.6一次sourceだけで比例調査。`dist/chunks/cli-api.B5majYba.js:3047` の標準ForksPoolWorkerはcacheFs=true、同2829のPoolRunnerはこれをcreateMethodsRPCへ渡す。同2656/2669で通常fetchのmakeTmpCopiesへ伝わり、同1000–1016はfull fsModuleCacheが無効でもtransformed codeをtmpDir mkdirSync→cacheResult/atomicWrite/renameへ書く。この必須fork transport IOと現非DB filesystem denyは静的不整合で、schema→fork→caseNone/deniedtrueの強い原因候補。ただし初回の実deny APIが記録されていないため実原因確定にせず、失敗root再読もしない。

Root採用の最小toolpoolを実code化。public `vitest/node` のForksPoolWorkerを継承し、constructor中の合法field初期化でname=p5d-memory-forks/cacheFs=false、public PoolRunnerInitializer.name/createPoolWorkerをcreateVitest.poolへ渡す。標準constructor/start/on/off/send/deserialize/stopをoverrideしない。`dist/node.d.ts:161–183` はcacheFsをreadonly booleanと宣言しtrue literalへ固定しない。`dist/chunks/reporters.d.CtLUhkkA.d.ts:2053–2074` は正規initializer/options/readonly optional booleanを定義、同2843はpoolへinitializerを受ける。cli-api3526はこれを標準PoolRunnerへ接続し、falseはModuleFetcher1005でcodeをそのまま正規RPCへ返す経路になる。readonly後付代入/型cast/private member/clone/fake能力は使わず、公開class constructorfieldのfalseだけを選ぶ。fork entry/argv/IPC/result/actualstop/実閉鎖・3fork/NodeWorker0は維持し、cache disk/新toolchild/network/新allow path0。tooling用public codeのmemory transportを業務secret closure/nativeproofへ代用しない。

型の比例確認はpublic TypeScript6.0.3のcreateProgramでactualhelperのclass blockをmemory virtual moduleに抽出し、正式Vitest declarationのcreateVitest.poolへ代入してsemantic errors0/noEmit0。strict+skipLibCheck（public library内部を別再検証せず、このpublic API割当を検査）、as/cast/weak ordinary型0、virtual file実生成0。Node --check/runner Python AST parseも成功。これは静的compiler工具だけでVitest/DB/app runtime実行ではない。

欠測補正は全deny callsiteに固定method enumを渡す。fs.open-write/openSync-write/fs.promises.open-write、fs/fs.promisesのwrite/append/truncate/mkdir/mkdtemp/rm/rmdir/unlink/rename/copy/link/symlink/chmod、socket-connect/server-listen/tls-connect/datagram-create/node-worker、child.spawn/spawnSync/exec/execSync/execFile/execFileSync/fork、固定harness境界だけ。外部path/argv/env/SQL/message/例外bodyを診断へコピーしない。roleはnode-main/vitest-forkだけ、副作用を呼ぶ前に既所有stdout PIPEへ有限`P5D {event:denial,method,context}` frameをwriteして必ずthrow。標準Vitest RPCへ独自messageを注入せず、既所有PIPEを安全な診断IPCに使う。各processでdistinct4以内/全4Node process計16以内、既outer40event/2MiB boundを維持。outerはexact3keys/method union/contextを検査し、denial frameが1件でもnormal監査のpredicateを不成立にする。child側denyをmainのdenied=falseやexpected test failureで成功へ補完しない。

pool選択とenum/loaderhash/normal no-denial predicateの採用deltaをmemoryで逆適用し、runner元1de4c292…/loader元cd2e96ed…の全bytes SHAへ一致するassert成功。case順/caps/config/no-env/signal/PG/DBclose/audit/publicNode24.18/source84/CF型は変更0。新root名は未採用なのでliteralを変更せず、現在helperをpreflight/--execute呼出するとheld root metadataへ触れうるため実行しない。次の明示fresh-root採用と独立候補preflightまでrun/root/DB/未知cache操作0。

固定loader9257B/mode600 SHA `cc39c614d608fd9bb6c2eb6b662433bc5f504f8f6c2dfd53e35f80bddcf35d8c`、runner18213B/mode600 SHA `54c2a5616dae2a0322909a1d085dd4bd85d97bfe28c934a6b6829777a31a21f5`。全writer停止。finite次実行は新rootが採用された後の同11case/既case40/suite180/body300/outer360/guard200msの一巡だけを候補とし、memoryRPC経路の実成功・具体denyAPI・DB数/closeは未観測のまま保持。native/legacy/UI/A–Hの全受入へ代用0。

## memory-fork 候補の fresh root literal 固定

Root採用の次回予約は `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-normal-20261006-57597b61-9f8f-4b8c-83df-a6d64704ec62`。runnerのROOT literalだけを変更し、予約pathの存在確認/probe/生成、actual preflight/executeは行っていない。旧held 3f68とnever-created 1666も非操作。上段の未採用root記述は前候補の記録であり、現在候補にはこのliteralが適用される。実一巡の採用は別途必要。

runner変更前全bytesをmemory保持し、唯一の新literalを元literalへ逆適用して完全一致、SHA `54c2a5616dae2a0322909a1d085dd4bd85d97bfe28c934a6b6829777a31a21f5` に一致するassert成功。runner Python AST parse成功。loader全bytes/SHAは不変。cacheFs=falseの公式型diagnostics0/標準fork IPC・stop、DB11case/3suite順/各件数・全cap、publicNode24.18、leader/ownPG absent・alive・unproven区分、直接same-fresh DB3 readonlyaudit条件は変更0。製品84paths/manifest/CF helper/outputも変更0。新実行・root/DB生成0、実memoryRPC成功・具体deny API・DB閉鎖は未観測のまま。

固定runner18213B/mode600 SHA `793f1f86a154dd9918db3779d7b0e24d76cdefc010bd146d9dd4b1a93f2d8773`、loader9257B/mode600 SHA `cc39c614d608fd9bb6c2eb6b662433bc5f504f8f6c2dfd53e35f80bddcf35d8c`。両helperとreportはregular/nonlink/nlink1を再照合。報告固定後は全writer停止し、API/root deltaの独立preflightへ提出する。

## 第三有限一巡の safe 結果

公式memory-fork/API/root delta独立PASS後のRoot明示採用で、runner18213B/SHA793f1f86…、loader9257B/SHAcc39c614…、phase56463B/SHA731b1d04…をregular/nonlink/nlink1/mode600/fullhashで再照合。Python3.14.3 -I -Sで `p5d-test-runner.py --execute` を1回だけ実行。helper内部の固定Node/publicsource84/manifest/新root不存在gateを通過し、予約57597b61…root作成後にschema stageとknown ownPG fork1開始frameを観測。旧held3f68/never-created1666非操作。

実safe frameは schema→fork(sameOwnedPG=true)→G01 skipped→G02 skipped→P5D_CASE_FAILURE(case=none)→denial(method=fs.promises.rm,context=node-main)→summary(ok=false,completed=[],forks=1,forksActualClosed=true,workerCount=0,denied=true)。初回より具体API欠測を補正できたが、rm denialがschema初回失敗の原因か後段closeで発生した拒否かは未断定。外部path/argv/env/SQL/errorbodyを報告へコピーしていない。G01/G02は未合格、application/credentials未開始、11case/3suite全体未合格。

監督結果は failure=tool-exit-or-eof、normalExit=false、actual Node exit1、stdoutEOF=true/stderrEOF=true/pipeHandlesClosed=true、supervisorPGObserved=true/helperOwnPGObserved=true、leaderState=absent/ownPGState=absent、200ms監督、elapsed1475ms/output553B。正常tool SIGTERMの実発生値は今回safe summaryに無く未観測とし、forcedTerm=false/forcedKill=falseを実観測。実fork1の標準stop/actualexit/EOF閉鎖をsummaryで確認し、実Nodeの2PIPE EOF/FD closeとownPG ESRCH absenceを監督が確認した。exec工具はPython runner exit1を返した。DB実生成数/afterAll fixture実closeは未観測であり、DB0/正常closeへ補完しない。

正常条件不成立によりaudits=null。追加DBopen/readonly監査0。新57597 root全部heldとし、終了後stat/read/hash/copy/import/retry/unlink0。失敗rootの結果/DB/cacheを原因解析に再利用しない。製品84paths/CF/helper sourceは無変更。実一巡再試行0、native/cutover/copies/67capacity/unknowngenuine/browserおよびA–H全受入は未成立を保持。公開report固定後、全writer停止。

## 第三一巡後の public-only 診断候補

失敗57597/3f68/never-created1666 rootはread/stat/hash/copy/import/retry0、新root/run/DB0。許可された公開helper793f1f86…/cc39c614…をfullhash照合後、固定product source/testと公開Vitest4.1.6 sourceだけを読んだ。schemaのbeforeAllは正式fixture作成→account発行の2await、fixture作成はroot境界→guardFiles→DBwx生成/fsync/close→local client→PRAGMAs→正式migrate0044まで→container/password hash→countguard。beforeAllのcallback内失敗は未観測のままで、migration/nativeSQLite/password/fixtureguard等へ推定して断定しない。fixture catchはclient.close後にthrow、afterAllはfが割当済みの場合だけcloseする。両test skippedとcase=noneはbeforeAll失敗と整合するが、具体段階・nativecode・DB生成数・実closeの根拠にはならない。

公式cleanupは `vitest/dist/chunks/cli-api.B5majYba.js:10886–10896` TestProject.closeがthis.clearTmpDirを無条件併行呼出、10976–10979は`rm(this.tmpDir,{recursive:true})`をtry/catchする。cacheFs=falseでも呼出は残る。exacttargetはTestProject readonly tmpDir、10624でconstructor引数または`join(os.tmpdir(),nanoid())`。root project10997は内部Vitest._tmpDir（13004で同生成規則）を渡される。config cacheDirはresolver/cache保存場所で、このtmpDirを変更する正規設定ではない。現在fs.promises.rm wrapperは副作用前denyし、clearTmpDir自身がcatchするためfailure frame後のrm denialと整合。初回業務/hook失敗と後段cleanup拒否を分け、rmを初因と断定しない。

safe診断だけhelper2paths内に実装。正式Reporter `onHookStart/onHookEnd` と `onTestSuiteResult/onTestModuleEnd`、正規`errors()`、`state.getUnhandledErrors()`を使い、beforeAll/afterAllのstart/end4boolean・harness phase(create/start/results/close/wait-closed/bootstrap)・error source(suite/module/unhandled/harness/none)をmemoryで保存。`onHookEnd`は失敗終了にも呼ばれうる通知であり、hook成功/DB閉鎖proofにはしない。ReportContext型はpublicreporters declaration237–252/1109–1113、dispatch一次source12653–12666。最初のcatchでfailureより前にdiagnostic1frameだけを既stdout PIPEへ出す。suite→module→unhandledの最初のerrorsを最大3、cause chain深さ3/全detail3の限度で投影し、classはError/TypeError等の固定11種+unknown、codeは正式SQLite primary strings/固定filesystem・moduleロードcode+noneだけにする。rawmessage/stack/SQL/path/ID/rawcode数値/argv/env/任意extendedcodeは出さない。Libsqlのnativecode対応一次sourceは公開`@libsql/client/lib-esm/sqlite3.js:649–690`（SqliteError→LibsqlError、rawCodeから既定primary code）。未対応/serialize欠測はunknown/noneのまま。1frameでもnormal/audit predicateを不成立にし、hook通知やerrorをclosureへ代用しない。

outerはdiagnostic exact keys/enum/4bool/errors配列3以内/detail exactkeysを検査、全run1frame上限を追加。既40packet/2MiBは増やさず、旧最大normal21+deny16+failure2に診断1で40のまま。guarddenial全allowset/DBcase11/3suite順/caps/deadline/signal/PG/publicNode24.18/Nodeexecversiongate/標準fork IPC・stop/cacheFs=false/product84manifest/直接DB3ro監査条件は不変。既ROOT literalはheld57597のままで、actualpreflight/executeは呼ばない。許可set拡張0/rm実装許可0。

変更前helper2本のfullbytesをmemory保持し、診断・対応LOADER_SHA・normal no-diagnostic predicateだけを逆適用して元runner SHA `793f1f86a154dd9918db3779d7b0e24d76cdefc010bd146d9dd4b1a93f2d8773`、loader SHA `cc39c614d608fd9bb6c2eb6b662433bc5f504f8f6c2dfd53e35f80bddcf35d8c`へ一致するassert成功。Python AST/Node24.18 --check PASS。実Vitest/DB/root/diagnostic frame観測0、次候補が得られるのはhook通知phaseと有限error class/codeだけであり、callback内の細分段階/fixture実close/DDL成功は依然別根拠が必要。

cleanupは未実装の限定提案。次の明示採用時だけDBrootとは別のexclusive0700同UIDの新toolTMP1を正確literalで作り、Nodechildのwhitelist TMPDIRをそのrootへ固定、正式os.tmpdir()のsource規則に結ぶ。cacheFs=falseと全write/mkdir denyを維持し、このroot内は空、public `active.getRootProject()`と`active.projects`の各readonly tmpDirをcreateVitest return直後か正式onInit（cli-api13327以降、root init済み13249–13251）に捕捉・重複除外して有限最大3 generation/3distincttargetのregistryへ登録。rootとの字句parent一致、basename単一component、exactpublicproject object↔target↔stage bindingと新rootのno-follow inode/mode/UIDを確認。内部_tmpDirを書換え/private API/readonly変更を使わない。createVitest returnより早い失敗で未登録cleanupが来ればdeny/heldとし、late登録や推定登録をしない。

未作成targetの正規終了はwrapperで成功を合成せず、登録exacttargetのlstatがENOENTである場合だけ元fs.promises.rm(target,{recursive:true})を呼び、native ENOENTをそのままrejectさせて公式clearTmpDir自身のcatchへ返す案。既存target（dir/file/symlink）やunknowntarget/optionsを見たらdeny/heldにするので、実recursive削除へ入る枝は許可しない。wrapperはfork側で全rm denyを継承し、allowはNode-mainの登録capだけ。監督200msは新toolroot identity/mode/空entry/上限を照合、未知侵入/rollback/forceではtoolrootとDBroot全部held、cleanup unlink/rmdir/retry0。正常runでも新toolroot本体の削除は不要で保持する。標準project close/pool stopを省略しない。

ただしENOENT確認からnative rm呼出までの同UID侵入raceは原子的に閉じていない。0700/exclusive/全write禁止/単一所有process前提だけで足りるかを正式検証する必要があり、Node native rmの不存在時内部経路がexported wrapperを再呼出しないこともこのsource-only調査では未確認。侵入を許す脅威モデルではこの案を採用できず、より強い正式toolroot/cap境界が必要。既存dirをrecursive許可する案へ拡張しない。新toolTMP1・registry捕捉タイミング・tmpdir actualbinding・native ENOENT/子継承/監督を別preflightと有限工具条件で固定するまで実装/実行0。

固定loader12060B/mode600 SHA `58d757de828203f753f73e31907a4b75d7af6d8ff8e9add40518425c3c17db61`、runner20211B/mode600 SHA `bd8ff3bb3eb1c9f2d38f15716bab084a9ca287bbcf06c51e855511b7b8d5caa2`。全writer停止。beforeAll具体errorは欠測、cleanup解決未採用、全failedroot非操作/newrun0を保持し、独立診断delta reviewへ提出する。

## cleanup 比較1の限定実装候補

Root採用によりpublic helpers2pathsだけ実装。製品84paths/manifest5c4eb649、DBcases11/正式0044、公式memory-fork・標準fork IPC/result/stop、Node24.18/versiongate、case40/suite180/body300/outer360/guard200ms、PG三値/停止、直接samefresh DB3 readonlyaudit条件は不変。diagnostic候補58d757de…/bd8ff3bb…をfullhash確認後に編集。実run/root生成/probe0、57597/3f68/1666の全root非操作。現在ROOT literalはheld57597のままなので起動不可、新fresh literalと独立preflight/実一巡採用が別途必要。

runnerは将来freshROOTに対応するsibling `${ROOT}-tool-tmp`1だけをTOOL_TMPに固定し、preflightの別exclusive不存在gate→実行時Python umask0077/os.mkdir0700→lstat実dev/inoをmemory固定する。TMP根はDBrootのentries9とは別で、同canonicalparent下・logicaltoolTMP1として計数。whitelist childenvへTMPDIR=TOOL_TMPと非秘密のdev/ino JSONだけを追加し、元forkenv/argv/stdioは変更しない。toolTMP actualdev/ino/UID/700/nonlink/realpathと空entryを既200ms guardで照合、TMP metadata size≤8MiBかつDBbytes+TMPmetadata≤192MiB。DB each32/sum64は不変。TMP書込/子dir/file生成を許さず、unknownentryは即held。成功/失敗ともtoolTMP本体unlink/rmdir/再利用0、early mkdir失敗もrollback削除せずheld。今回そのpathの存在確認も行っていない。

loaderはguard変更前に元native `fsPromises.lstat.bind(fsPromises)` とsync lstat/readdirを保持。main/forkともDBfixture/Vitest import前にTMPDIR==導出root==正式os.tmpdir、memoryで受けたparent dev/ino、ownUID/700/nonlink/realpath/空entryを検査。metadataの任意欠測/例外は有限fs.promises.rm denyとしてheldへ流す。これは今回toolTMP所有binding専用で業務nativeclosure capabilityにはしない。fork側はtmp環境の同根bindingを検査するだけで、rmは全拒否。全write/mkdir/rename等の旧guardは維持する。

正規createVitest return直後（start前）と正式Reporter.onInitで、public `vitest.getRootProject()` と `vitest.projects` をSetで重複排除し、各readonlyproject.tmpDirをprivate memory Mapへ登録する。正規API declarationsはreporters.d.CtLUhkkA.d.ts:1253/1328/1954、root getRootProjectはcli-api13249–13251。全run最大4project object、tmpDirはTMP根の直下単一component/absolute normalized exactpathのみ。projectobject・元readonlytmpDir・当該stageを不変照合し、clone/generalstring/privateoverride/readonly差替え0。create中にregistry未捕捉のcleanupが起きればdeny/held、失敗後の後付捕捉0。環境同根bindingは事前、registryはreturn/onInitの正規境界で得るので観測欠測を正常へ補完しない。

`fsPromises.rm`だけを限定wrapperへ変更。mainかつ登録exactprojectobject/currentstage/元readonlytmpDir一致、exactstringpath、optionsの唯一key recursive=true、TMP metadata一致/空entryが成立する時だけ、保存済みnative lstat(path)を実awaitする。lstatが実際にrejectしたerror objectのcode===ENOENTの場合にrootmeta再照合して同error object自身をthrowし、元公式clearTmpDirのcatchへ返す。それ以外のnativeerror/成功lstat（既存dir/file/link）はdeny/held。元native rmは一度も呼ばず、recursive削除/成功Promise合成/ENOENT error新造0。不存在確認後に別entryが侵入しても削除APIを呼ばないため、前案のlstat→rm削除raceは作らない。root変更/侵入を検出した場合はENOENTも返さずheld。標準closeは省略せず、ENOENTをtool/fixtureの実close成功へ借用しない。全casepass・afterAll実close・forkactualexit/EOF・Node0・2PIPEEOF/FD・ownPGabsentの既成功条件が別途必要。

この候補で期待する新観測は、未作成登録TMP targetについて実lstat ENOENTが公式catchへ渡るため後段rm denialを発生させず、safe beforeAll error class/nativecode診断が初因を限定できること。ただし実onInit時点のroot/projects列挙、forkenv TMPbinding、nativeENOENT同object/既存対象deny、正常toolcloseは未実行であり、sourcecodeからPASSへ補完しない。未知/tmpregistry4超/実existingtargetは失敗heldを維持する。

Python AST/Node24.18 --check PASS。public TypeScript6.0.3 compilerでactual registerProjectTmp blockをvirtualmemoryへ抽出し、Vitest/TestProject/Reporterの正式decl型へ割当してstrict/noEmit/skipLibCheck diagnostics0、virtualfile書出し0。普通型weakening/cast/private API0。全deltaをmemory逆適用して元loader fullhash58d757de828203f753f73e31907a4b75d7af6d8ff8e9add40518425c3c17db61、runner fullhashbd8ff3bb3eb1c9f2d38f15716bab084a9ca287bbcf06c51e855511b7b8d5caa2へ一致するassert成功。

固定loader14567B/mode600 SHA `6ed6784bfcdad49ae98d0c8d02bed8d0328f17327dab9138d6c0aed3a285c1e9`、runner21083B/mode600 SHA `764aaca14f8a4e36c58de14ef05096c31bef1d1991ad75b2f111be990adef885`。regular/nonlink/nlink1再照合。公開report固定後に全writer/read停止し、限定cleanup/診断候補の独立preflightへ提出。beforeAll実原因/DB実数/実閉鎖は欠測を保持、実run採用0。

## cleanup 候補の次 fresh binding

Root採用のROOT予約literalを `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-normal-20261006-910ec8cf-696c-4be3-8a9e-724ab62e6c96` へ1箇所だけ変更。派生TOOL_TMPは同parentのROOT名+`-tool-tmp`、exact予約は `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-normal-20261006-910ec8cf-696c-4be3-8a9e-724ab62e6c96-tool-tmp`。両pathの存在確認/probe/生成、actualpreflight/Node/DB/Vitest実行0。failed57597/3f68/1666および旧toolTMP名は非操作。

前候補runner21083B/SHA764aaca1…、loader14567B/SHA6ed6784b…、phase70817B/SHAdf98345f…のfullhash/regular/nonlink/nlink1/mode600を確認。新literalをmemory逆適用して元runner全bytesと完全一致、SHA764aaca14f8a4e36c58de14ef05096c31bef1d1991ad75b2f111be990adef885一致assert、Python AST PASS。loader全bytes/hash不変。source84/cases11/診断・nativeENOENT同error cleanup・公式pool/標準forkIPCstop・Node24.18・全resourcecaps/body300/outer360/同deadline内sharedtail・PG/PIPEEOF/正常直接DB3roauditは変更0。新実一巡の採用は別途必要。

固定runner21083B/mode600 SHA `0bb94f14b7cf1293b7f0badd7bd743f30dcb7803fef8a06414831707ba9bf691`、loader14567B/mode600 SHA `6ed6784bfcdad49ae98d0c8d02bed8d0328f17327dab9138d6c0aed3a285c1e9`。報告固定後に全writer/read停止し、freshbindingのみの独立比例preflightへ提出。

## 第四有限一巡の safe 結果

cleanup限定/fresh比例独立PASSとRoot明示一巡採用後、runner21083B/SHA0bb94f14…、loader14567B/SHA6ed6784b…、phase72256B/SHAacfad590…をfullhash/600/regular/nonlink/nlink1再照合し、Python3.14.3 -I -S directrunner --executeを1回だけ実行。内部固定Node24.18/publicsource84/manifest/ROOT・TOOL_TMP freshgateを通過し、ROOT910ec8cf…と派生sibling-tool-tmpをexclusive0700生成したrunとしてschema/fork frameを観測。旧failedroot/private資材非操作。

実safe frameは schema→fork(sameOwnedPG=true)→G01 skipped→G02 skipped→diagnostic(stage=schema,phase=results,beforeAllStarted=true,beforeAllEnded=false,afterAllStarted=true,afterAllEnded=true,source=suite,errors=[LibsqlBatchError/SQLITE_ERROR,SqliteError/SQLITE_ERROR])→P5D_CASE_FAILURE(case=none)→summary(ok=false,completed=[],forks=1,forksActualClosed=true,workerCount=0,denied=false)。beforeAll callbackに由来するnative SQLite primary errorを初めて有限観測できた。具体SQL/migration番号/fixture内段階は未特定で、rawmessage/SQL/path/IDは報告しない。afterAll通知完了はf未割当の場合のno-opにもなるのでfixture実closeproofへ代用しない。

今回denial frame0/summary denied=falseで後段rm拒否は無かった。ENOENT lstat同error wrapperの個別frameは設けていないため、同error実観測をsummaryから補完しない。root/TMP bindingやregistry等のguard例外は出ていないが、静的意図を業務nativeclosure/受入成功へ転用しない。G01/G02未合格、application/credentials未開始、11case/3suite全体未合格。

監督safe結果はfailure=tool-exit-or-eof/normalExit=false、actualNode exit1、stdoutEOF/stderrEOF/pipeHandlesClosed=true、supervisorPGObserved/helperOwnPGObserved=true、ownPGState=absent/leaderState=absent、poll200ms/elapsed1481ms/output783B、forcedTerm=false/forcedKill=false。known fork1 actualclose/exit/EOFをsummaryから、Node2PIPE EOF/FD closeとregisteredownPG ESRCH absenceを監督から得た。Python exec工具exit1。正常tool SIGTERMの個別値は未観測として保持。DB実生成数/fixture実closeはsafe frame欠測のためDB0/正常closedへ補完しない。

正常条件不成立によりaudits=null、directreadonly監査/追加DB0。新ROOT910ec8cf…と派生toolTMP全部held、終了後stat/read/hash/copy/import/retry/unlink0。旧1666/3f68/57597/root/toolTMP資材も非操作。helper/product84/CFsource変更0。publicreport固定後全writer/read停止。beforeAllの具体SQLite原因は公開sourceだけで次の限定分析が可能だが、この一巡でmigration成功やA–H/native/cutover/copies/67capacity/unknowngenuine/browserを受入補完しない。

## 公開 migration 分析と six-copy / statementIndex 候補

固定公開fixtureのbeforeAllはcreateAccountDeletionFixture→accountで、最初のnativebatch候補はDrizzle正式migrate。public drizzle-orm/libsql/migrator.jsはmigration table CREATE/最新row SELECTを単独executeし、その後全未適用migration SQL+各migration row INSERTを一つのstatementToBatchへ追加。LibSQLSession.migrate（session.js:62–73）がclient.migrateへ渡し、serializeLocalClientは値を変えず直列化する。@libsql/client/lib-esm/sqlite3.js:286–328はFK OFFをBEGIN外で実行→deferred BEGIN→statement loop→COMMIT、例外時finally ROLLBACK/FK ON。loop中SqliteErrorがLibsqlErrorへmapされ、同:307で実iをLibsqlBatchError.statementIndexへ固定する。BEGIN/COMMIT/FK pragma失敗はこのloopのbatchindex証拠にはならない。fixtureではその後accountUoWにもbatchがありうるので、class/indexだけからmigration由来を無条件確定しない。

正式journal actualは45entries（0000–0044）、fresh全SQLbreakpoint chunk+各row INSERTは1534要素、migration0044先頭はglobal0=878。元依頼の28はこのjournal件数ではなく、既schema宣言閉包28との計数を混ぜない。公開migrator.js readMigrationFilesの正式splitを同形で静的計数しただけでSQL engine/runtime/DB0。次helper preflightもjournal45/tag whitelist/public SQL各file≤2MiB・同split計数1534を照合する。旧migrationは参照だけで変更0。

静的確定したcopy欠陥は0044:651 records、:687 targets、:724 note_purges、:748 accounts、:794 source_bindings、:841 jobs。0039/0032/0023/0042の旧tableに無いretention/deletion_id/redaction_version、accounts state/deletion_id、purges account_deletion_id/deleted_account_idを旧tableからSELECTしていた。先行ADDも無い。double-quoted identifierの実DQS設定次第でSQLITE_ERRORまたは文字列fallbackになり、少なくとも既保存行を正しい通常状態でコピーできない設計不整合。今回実初因との一致はindex/native詳細未観測で未断定。

Root採用の最小修正は当該6SELECTだけ。records/targets/sourcebindings/jobsへusable・NULL・0、accountsへactive・NULL、purges新2列へNULL・NULLをコピーし、全既存列の参照/順は保持。新列は旧schemaに存在せず、旧通常合法行の正式初期値として追加し、deleted/retired/closureを推測しない。snapshot/schema/journal/旧0000–0043/79guards/全lifetime/privacy契約変更0。6copy反転で元SQL全bytes/hash14639cdd…一致をmemory検査した。最初copyはlocal0=274/global0=1152、以後281/1159、287/1165、293/1171、298/1176、306/1184。target新table/DDL自体は不変で追加path0。

DROP-orderの比較では0044初頭DROP後に既公開prior triggerの残存0（CREATE/DROP台帳）を確認。accounts DROP中の既trigger未除去を今回の第一候補にはしない。FKはnative migrateのBEGIN前OFF/最後ONと0044末尾__p5d_foreign_key_guard CHECK0を保持し、accounts等DROPを通常FK ONで実行する枝へ変更しない。実FK/trigger再構築/既データ移行の成功は未検証のまま。

helper diagnostic error detailへstatementIndex:number|nullを追加。正規LibsqlBatchError.nameかつ実propertyが整数0..1533の時だけ出力、その他はnull。LibsqlCore public api.js/api.d.tsのnativeclass自己propertyに由来する有限診断で、rawmessage/SQL/path/ID/statement内容は出さない。wrapper/手作業でbatchindexを合成しない。outerもexact3keys/LibsqlBatchError条件/int非bool/範囲を照合、packet/log/case/resource上限は増やさない。将来indexが得られれば公開1534slot表へ候補照合できるが、accountUoW等の別batchでない確認を別根拠で行う必要がある。次actualrun/newrootは未採用、held910ec ROOT literalのまま起動不可。

今回checksはownworktree/public108deps/CF既生成型/元PATH継承・mainpublicbins前置、pnpm_config_verify_deps_before_run空文字＋CLI falseで実行。規定pnpm typecheck exit0（root/core/web/infraCF/infraAWS）。pnpm lint:fix --diagnostic-level=error exit0、1213files/No fixes、260unsafe候補は未適用。pnpm format --diagnostic-level=error exit0、1213files/No fixes。git diff --checkのtracked migration範囲はexit0。全84row source内容hashをpostcheck照合し、0044以外83hash不変、CF型/依存/lock/install/network/main変更0。SQLはBiome対応対象ではなく、formatter成功をSQLite構文成功へ代用しない。Python AST/Node24.18 --check PASS。診断/LOADER_SHA/manifest/currentpublicbatch-countの採用deltaをmemory逆適用し、元runner0bb94f14…/loader6ed6784b…のfullbytes SHA一致を確認。

固定0044 SQL358844B SHA `cedcab4dd315dab2f25ce5d691ebbf7b13a01f6a9a842dce5246329825605e33`、source84manifest `7b0647c36d2a454996278dd6bda6153d5e89b16c371243ee6ce817d90b684d9b`。loader14750B/mode600 SHA `75c3407b0c0ac2a4df5a3d1552de1e34a917200ad64840f53d742d54a2ef7c36`、runner21758B/mode600 SHA `7919a3d56646fa69b17f6ee75eb97bd559f2a76460648f4a4b9bed0a4ee2c9f0`。helpers/report regular/nonlink/nlink1再照合。DB/root/runtime/test実行0/全failedroot非操作。公開report固定後全product/helper/report writer/read停止し、source+有限index診断の独立reviewへ提出する。

## 第五一巡候補の fresh binding

Root採用のROOT予約literalは `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-normal-20261006-ea566a89-af45-4c96-8902-8c093a3b2f6d`、派生TOOL_TMPは同path+`-tool-tmp`。前候補runner21758B/SHA7919a3d5…/loader14750B/SHA75c3407b…/phase81505B/SHA771c39f2…のfullhash/regular/nonlink/nlink1/mode600とownpubliccommit476dd475…を確認。runner1literalだけを変更し、memory逆適用で元全bytes+fullSHA7919a3d56646fa69b17f6ee75eb97bd559f2a76460648f4a4b9bed0a4ee2c9f0一致assert、Python AST PASS。loader fullbytes/hash不変。

製品commit `476dd475b405573715589ea5b1e2f3c61b609d5f`、source84manifest `7b0647c36d2a454996278dd6bda6153d5e89b16c371243ee6ce817d90b684d9b`、SQLsixcopy、cases11/statementIndex診断/nativeENOENT cleanup/公式pool/forkIPCstop/Node24.18・全cap/body300/outer360/sharedtail/PGEOF/正常directDB3readonlyauditは変更0。source追加edit/規定checks再演0。failed1666/3f68/57597/910ecと旧TMP全非操作。新予約ROOT/toolTMPのprobe/不存在確認/生成、actualpreflight/Node/DBrun0。一巡の実行採用は比例preflight後に別途必要。

固定runner21758B/mode600 SHA `813ff5c80d6f75027a97635130e6176c1e1fc43e8d2497d706360eeea3ec47b1`、loader14750B/mode600 SHA `75c3407b0c0ac2a4df5a3d1552de1e34a917200ad64840f53d742d54a2ef7c36`。公開report固定後に全writer/read停止。

## 第五有限一巡 PASS と正常 readonlyaudit

source+statementIndex/fresh比例独立PASSとRoot明示一巡採用後、runner21758B/SHA813ff5c8…/loader14750B/SHA75c3407b…/phase82919B/SHA4e3961aa…のfullhash/mode600/regular/nonlink/nlink1再照合。Python3.14.3 -I -S direct --executeを1回だけ実行。sourcecommit476dd475/84manifest7b0647c3/Nodecanonical24.18 actualversion/publicbindings、journal45/batch1534、ROOT ea566a89…/派生TOOL_TMP fresh gate後のexclusive0700とTMP identity/空entry境界を保持した一巡。旧failed1666/3f68/57597/910ec/TMP全非操作。

exactcase順でschema G01/G02、application A01/B01/A02/B02/A03/F01、credentials E01/E02/E03の11case全passed。各file passed/afterAll completed/forksClosed frameが順序通り3件、completed=[schema,application,credentials]、standardknownfork3 actualclosed、workerCount0、denied=false、failure/denial/diagnostic frame0。全casepassとafterAllのfixtureclose実awaitにより通常fixtureのpasswordHasher stop・FK/integrity/WAL checkpoint・同期client.closeを観測した境界。toolcleanupのENOENTをこのDBclose証拠へ代用しない。source各caseはaccount nativecredential閉鎖のpositiveproofを発行しない。

監督結果はok=true/failure=null/normalExit=true、actualNode exit0、stdoutEOF/stderrEOF/pipeHandlesClosed=true、supervisorPGObserved/helperOwnPGObserved=true、leaderState=absent/ownPGState=absent、poll200ms/elapsed4609ms/output1848B、forcedTerm=false/forcedKill=false。標準fork3のexit/両PIPE EOF/closeをhandle registryで待ち、Node正常exit+実2PIPE EOF/FD close+登録ownPG negativekill0 ESRCH absenceを満たしてからauditへ進んだ。正常tool各SIGTERMまたはexit0の個別値はsafe要約に出しておらず未公開で、監督force0とは区別する。Python exec工具もexit0。deadline/tail延長/再試行0。

logicalDB3をafterAll実close後にsamefresh正常rootで各1direct readonlyopen、query_only=1、FKcheck0、integrity=ok、migrationrow45/P5dtrigger≥79、deletedanchor intent/authversion一致/session0、nativeproof row0を照合してclose。applicationはactiveaccount3/WS2/note1/存続本文・deletedcreatorのWSnote保持/personalnote回収/intent succeeded/本人emailverification0を照合、credentialsはlegacyidentity1/legacyorigin1/succeeded0を照合。safe auditsはschema/application/credentialsそれぞれforeignKeys=true/integrity=true/anchorFence=true/readonlyClosed=true。DBfileidentity/size/mtime前後同値と最終root/TMPguard成立、追加logicalDB/copy0、held=false。実DB3生成・afterAll同期close・正常audit成功をこの一巡の正式観測とし、nativeHTTP/callerclose/cutover証拠へ流用しない。

今回は正式0044 six-copy修正後のfresh経路成功を確認できたが、前failedSQLite_ERRORのstatementIndexは引き続き未観測なので旧失敗statementを特定したとは言わない。既保存データのcutover移行・全媒体8MiB/67registry容量・閉鎖commitlost・未知outcome genuineproof・browser/CU1legacyは未検証/未成立を維持。11normalcasesをA–H全完了にしない。正常新ROOT/TMPは保持し、終了後の追加stat/read/hash/copy/import0。製品/helper/CF source変更0、commit476dd475/mainHEADc2不変/未merge。公開safe結果を先頭に固定後、全product/helper/report writer/read停止。
