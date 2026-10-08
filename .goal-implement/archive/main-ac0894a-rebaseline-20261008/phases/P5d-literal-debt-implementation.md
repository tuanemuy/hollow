# LD01 literal Drive caller debts — fixed candidate

候補は source `e1e07e51d0726d92b54e14dcd05adc4efcfe11cb`、親 `548a8fefe53444ff6ee032fb9e22be7d7f9efbf2`。新 test/fixture 2path のみを commit した。source94 manifest `0301b5c743dcf36197e127acab5be9232507611e9bca149dd788b86aa84b98e3`。既92sourceは親HEAD blob・現HEAD blob・現regular sourceの全文同値。製品/ports/0044/既受入source・report/helpers/mainの変更0。

LD01は正規native Drive factoryとoriginal executionから得るresources0 local-close/ACKを使い、work終了後・whole caller終了前のA/Bを保持する。退会用retirement receiptが未発行の間にliteral `account_deletion_debts` 2件を正規sweepで生成し、第三行Cの回収、final EXISTSによるwaiting-owner、元caller解放後の同じprivate receipt保存・同値読戻・消費、同intent再開を確認する単一candidateである。実行前であり、literal2/closure/ACK/resume/DB監査のactual証拠はまだない。

whole own-worktree `pnpm typecheck` → `pnpm lint:fix` → `pnpm format` はすべて exit0。typecheckはroot tsgo＋4workspace packages、lintは1223files・新2filesのみfix・既存347warnings/61infos、formatは1223files/no fixes。既92sourceの変更0を全文確認した。Python AST parse と pinned public Node `--check` は exit0。DB/runtime/test/default preflight/root probe/key/config/source importは0。候補固定後ALL read/write/runtime STOP、次は独立preflightとRoot別actual採用待ち。

## Fixed scope and binding

- isolated tree: `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006`; branch `goal-implement/p5d-c2a3d45f-20261006`。
- new source: `packages/core/src/adapters/libsql/__tests__/accountDeletionLiteralDebt.integration.test.ts` 11219B SHA `4f7f4df2cf30c9f32824ff18665698437344337dc2ed86ff978cb0764c8ac79d`; new fixture 18417B SHA `50133913a3dc8c7faf4059ee3c1ff4963bfc3b7b65ac8de2f743b0693d3861fb`。両actualsource regular600/nonlink/nlink1、HEAD blob全文一致。Git mode100644はrepository tracked metadataであり、working file mode600とは区別する。
- public runner `.goal-implement/helpers/p5d-literal-debt-runner.py`: 25876B SHA `48f54648fbadd39a9a4dc3106ecf78558b5688a3dd50879023a41827469a201d`。
- public loader `.goal-implement/helpers/p5d-literal-debt-loader.mjs`: 24600B SHA `9d6103dfd8e8b2c52ea039dfe466adc9eccefd5f3941b276f7138c264d90723a`。
- adopted proposal `.goal-implement/phases/P5d-literal-debt-proposal.md`: 14987B SHA `3ab9041d768e39aa83adf335ca0132e6de07803600269a276abfd5f2ae126f3b`、履歴不変更。
- reserved memory-only root `/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-literal-20261006-2b864a9c`、派生 `-tool-tmp`。存在検査・生成0。全success/failed private root・TMP・DB・結果・secretは非操作。
- Python `/nix/store/3m28r8993i0af8m78s9z3r7l9xpby21v-python3-3.14.3/bin/python3.14 -I -S`; Node `/nix/store/a5sxfwnzi3kzxrgj3zfngcqamdhnr161-nodejs-24.18.0/bin/node`。Node actual execPath canonical/version24.18 gateは副作用前に維持。default preflight自体は未実行。

## Genuine producer and finite assertions

1. 正規public createLibsqlClient/getDatabase/migrate45/1534 → createHollowContainer、正常verified account/session/browser1、initial Drive connection epoch0/settingsVersion1。createNodeDriveは元canonical DB pathとfresh owner directoryでacquire-before-useし、native ownership object/private brandを維持。正規CoordinatedObjectStorageもfreshobjectsの元exclusiveRuntime/recoverOwnersを使う。
2. 元driveFolderConfirmationとnormalbeginDriveAuthorizationでC/A/Bの3attempt。URLの元stateをmemoryだけで使う。empty-code normal exchangeは元NodeDriveAuthorizationのDRIVE_UNVERIFIEDをnative HTTP前に返し、resources0。transport/user正常入口とはinternal callback inputを区別し、空codeをtransport正例と呼ばない。
3. Cを先にwhole終了。元local-close proofでclosed保存・exactnative ACK・caller finally → genuine acquired retirementreceipt C1。A/Bは透明なgeneric withCaller<C,T>委譲で元settleをawait済みにしてから、返却直前のlane外gateだけ保持する。original this/args/results/claim/settle/private proof/元finallyを維持。A closed後にB claimしDBaccountOwners1・control lane2を守る。
4. original acknowledge(proof)の実await後だけ同proofをmemory記録する。proof.source local-close/exacttargetをassertし、caller pending・execution.closure held・unacknowledged0・retirementreceipts onlyCを区別する。退会receiptのproofは元ACKproofのcopyなのでproof object identityの虚偽比較をしない。receipt自身はnative registryの元objectを保持する。
5. normal deleteAccount accepted → deleted anchor/currentUser NULL/normalbegin拒否。normal sweepsのmaintenance saveDriveAcknowledgmentsがC元receiptをexact保存し、別normalUoWで同値readを返した後のみ元workerがconsume。fixtureはoriginalsave/original.run settleを透明awaitし、receiptを改造しない。
6. drive-attempts正規page25はC progressed1、A/B blocked2。block privateproducerが元durable rowからlocator(table/id/version/runtimeId/token/cancelGeneration)を作りliteral2をINSERTする。fixtureのSQLはreadonly row projection/countのみ、handwritten INSERT/UPDATE/DELETE/forcedcursor/manualreceipt0。A/B row全文・intent bindingをmemory照合する。C row不存在と元receipt消費を別assertする。
7. normal verifyはglobal debt/attempt/accountHeld EXISTSによりprogressed0/blocked1/finishedtrue → waiting-owner。同intent元version+1/leaseNULL/cursor personal-notes/null/nextAttemptAt now+2000を全文assert、literal2保持。missing receipt/NULLsecretをclosed証明へ読み替えない。
8. 同original gates2解放 → original withCaller finallyがcallerEndedを実設定し元acquired retirementreceipt A/B2を発行。元receipt identity・target/evidence/source・verify trueをmemory照合。premature normal wakeはreceipt2をsave/read/consumeするがnot-due intent全文/literal2は不変。
9. logicalclock2001後のみnormal wake同intentresume。matching durable ACKでA/B cleanup/unblock、drive-acknowledgments cursorが実保存ACKを回収し、最後EXISTS空でsucceeded/verify/null lease。attempts3/debts2/ACK3は0、credential use/originはnever seeded0、initialunlinked Drive connection1は元epoch0/version1/secretNULLのまま。originalfinallyはgate解放とcaller promises settleをawaitしnative methodsを復元する。

固定sourceの26cursor tablesを各cycle25未満で一巡し、初回waiting26wakes＋not-due drain1＋再開26wakesでnominal53wakes（上限64）。Cのみ成功回収/A/B heldのpageはprogress1/blocked2、verifyheldはprogress0/blocked1、finalはprogress0/blocked0。これはstatic derivationであり、actual件数・durationを受領済みとは記さない。

## Bounds and FS grants

| Resource | Candidate maximum / expected seed |
| --- | --- |
| DB | samefresh1、DB＋wal/shm≤32MiB、formal総64MiB以内 |
| root | ≤192MiB、exact root entries≤8 |
| business | account1/browser1/attempt3、native whole callers同時≤2、literal debts2、ACKrows/receipts≤3、pages/wakes≤64 |
| never seeded | WS/note/providerorigin/credentialuse/objectpayload/objectwrites/objectdeletes/Drivebackup0 |
| native work | operation30s/close5sの元factory defaults、lane2、gate ready/wait各5s |
| case/tool | one LD01/case-hook40s/body-suite180s/outer240s including TERM10/KILL10/PIPE10 tail、guard200ms |
| child/network | tool Node1＋stock Vitest fork1、business child/Worker/socket/listener/HTTP/TLS/DNS0 |
| secrets | synthetic AES32B1、Driveconfig＋keyring≤16KiB、実secret生成はactual段階だけ |
| Drive owner | fresh0700dir1、record/recovery/temp exact3 entries最多、合算≤16KiB |
| Storage owner | fresh0700objectsdir1、writer-owner wx600≤256B1、recovery wx600empty1、normalrecoverOwners Tx1 |
| remaining | toolTMP8MiB（空）、output2MiB/frames≤40、material256KiB以内 |

二つのbounded FS cap setのみを追加した。第一はexactDrive owner/key/config/keyring、第二はexactStorage owner/recovery。DB3filenameだけの元writegrantとVitestprojectTMP nativeENOENT cleanupは維持。root-prefix/rootwalk/pathwildcard writeを許可しない。Drive tempはowner UUID単一component、original numeric EXCL/NOFOLLOW flags・mode600・元rename/recoveryunlink。同storageはfixtureのexclusive objects mkdir700一回、その同inodeへの元recursive mkdir一回、元open("wx",600)各1、knownemptyrecovery原unlinkのみ。元native lstatの実ENOENTを確認し、unknown既存entryはheld、旧owner/PID探索の入力を使わない。persistent writer-ownerのunlinkを許可しない。

FS wrappersはnative方法を先にbindし、元this/args/results/FileHandleを維持。メタデータの内容/秘密/ID/PIDをstdoutへ投影しない。storage original exclusiveRuntimeがwriter handle/recovery handle closeをawaitし、recoverOwnersが元Tx終了をawaitする公開sourceの意味を保持する。storageにdispose/stop APIはないため一般FDclosed receiptを合成しない。fixture正常closeはoriginal execution.stop → passwordHasher.stop → FK/WAL checkpoint → synchronous client.close後のみexact fixture-closed frameを発行する。失敗時は有限元stop/原closeを試し正常frame/監査を禁止する。

## Supervisor and targeted readonly audit

元reviewed supervisorはNode known ownPG/leaderを独立absent/alive/unprovenで観測、knownPGだけTERM/KILL。元stock fork1のexit/close/IPCstdoutstderrEOFが全部揃うまでwait。Nodeexit0・ownPG ESRCH・2EOFと独立Popen stdout/stderr close returned＋closed4flags・force0・casepassed・fixtureclosed・afterAll/filepassedが全成立した時だけ、samefresh DB1をmode=ro/query_onlyで一回open/closeする。SQLite正常FK/integrity、migration45、guards≥79、deleted anchor/auth/deletion intent succeeded/verify/leaseNULL、debt/purge/session/verification/use/origin/attempt/ACK/object0、browser1とnever-linked Driveconnection1の元epoch/version/secretNULLを検査する。追加DB0。native resources0 をHTTP positive/legacy/fullcopy成功へ転用しない。

unknown/non0/timeout/denial/diagnostic/case-failure frameは永久normal/auditdeny、root held、追加case・auto retry・同failedroot read/stat/hash/import/copy/reopen0。安全出力はfixedstage literal-debts、case LD01、元finite class/code/statementIndex mapperとbool/countだけ。raw SQL/error.message/stack/body/IDs/proof/key/secret/privatepathsを出力しない。元24checkpoint guardは既protocolのfailclosed処理として残るが、本caseからcheckpoint frameを新発行しない。checkpointは正常proof代行ではない。

## Public helper derivation and full inverse

PUBLIC basesをregular600/nonlink/nlink1/identity-prepost/fullbytes/hash確認後に読み、私有生成物を使わず新wx600helperへ導出した。

- base runner25203B SHA `c6befa104406bb1583d6738fe90f485594b1132a7d7b1dca5f03688fe3273d1d`。
- base loader22845B SHA `19177532a2dad558e00ce92a3d939ed873b68e93ef66e1cd911cc177cce32ba8`。
- loader deltaはrootenv/stage/test/case/prefix/stockpool nameとexactFS two-cap blockだけ。newFS blockを元translatedFS blockに戻しcasebindingsを逆適応して全文22845B/baseSHA一致をmemoryで確認した。元nativeENOENTcleanup・official ForksPoolWorker cacheFs=false・forkargv/IPC/stop・DNS/socket/Workerdeny・class/code mapper・failure永久normaldenyは全文同値。
- runner deltaはroot/loaderSHA/current94/report/marker/case/env/source filenamesとexactowner fileguard/targeted audit expectation blockだけ。元guard/audit blockへ逆適応しbindingsを戻して全文25203B/baseSHA一致。body180/outer240/sharedtail/PG/normalPipeCloseReceipt/case-success/audit gating/protocolは全文同値。
- public syntax checksのみ。defaultpreflight・fixtureimport・Vitest・DB・native runtime・root/key生成は未実行。no network/install/mainmodules/lock変更。

## Scope not accepted by this candidate

LD01はliteral Drive debts2/caller pending/resources0 sliceである。unknown実work、credential ACKfalse、legacycutover、genuine acquire-confirmed前任65、ordinary ready capacity67、credential adopt/copied secrets closure、native HTTPpositive、全copies、Google/UIおよびwholeP5d A–H完了を代替しない。既成功basic/CR/HTTP/F02/EF01を再演しない。正常gate5s内で53wakesが完了するactual feasible性・closure/auditactual成功は未観測のまま独立reviewへ渡す。

## LD01 current source94 manifest

current94は以下の唯一table。runnerはmarker occurrence===1後だけをparseし94uniqueとmanifest/headbytesをguardする。既92＋新2のsorted path SHA streamで `0301b5c743dcf36197e127acab5be9232507611e9bca149dd788b86aa84b98e3`。

| Path | Bytes | SHA256 |
| --- | --- | --- |
| `apps/web/app/components/hollow/AccountDeletion.test.tsx` | 6275 | `fa1e89fccfd1de45da5246b1ec43b1f043d784bada3c52eb525aa50d42bd8cc1` |
| `apps/web/app/components/hollow/AccountDeletion.tsx` | 6791 | `cc851eb54a632f6094bc9f3b055eb1304c479e0a3a51a358244f91914af74b6c` |
| `apps/web/app/presentation/accountDeletionInput.test.ts` | 3072 | `30d1d8c8eaf2586aeb8b470a5f1da03800bddc3f8038191b6c04fc8cdef04d7d` |
| `apps/web/app/presentation/accountDeletionInput.ts` | 507 | `0a5075d2da9a7cc4e5b533168e8ce240aea936e38bc9613affbe2ad77458dc0d` |
| `apps/web/app/presentation/accountDeletionServerFn.ts` | 796 | `3da967ff5914f274d8a6f194634c8ceae1be04bd23448202cadbcb18d055e35e` |
| `apps/web/app/routes/settings.profile.tsx` | 5782 | `55a193e4dcf6391cd9744dd7e868a4a47622f849d14cbfc667008bc656effb6c` |
| `apps/web/app/server.node.ts` | 28742 | `6ad03065decfcdf2b906901766a7328654a37378dc51597336cfc64af6112b85` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletion.integration.test.ts` | 8483 | `5a79dd087f225769841015ae47d0f0acf0ab18bbff763c0640f3fc63d65f334c` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionCredentials.integration.test.ts` | 5187 | `c4bf84d1b87b2c9f2fe1708219e33beca4360676d4d3e80b6f29ceb291d5e66e` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionFixtures.ts` | 6886 | `5876ca9e38a788c471e59f7ea3d5a023140952f788bb410535a80553760d299a` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionLiteralDebt.integration.test.ts` | 11219 | `4f7f4df2cf30c9f32824ff18665698437344337dc2ed86ff978cb0764c8ac79d` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionLiteralDebtFixtures.ts` | 18417 | `50133913a3dc8c7faf4059ee3c1ff4963bfc3b7b65ac8de2f743b0693d3861fb` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebt.integration.test.ts` | 15000 | `a257f2af17bf946444413f6f9e29eabe67f22bbd9ee7afaa3ef7da4966ecc8a5` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionMultipleCredentialDebtFixtures.ts` | 14909 | `d01de5db451c85a92780ce752561f95db13a7f954afc5953d68207ebd7864ba1` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentials.integration.test.ts` | 13381 | `96188340531e37caddc9eb5ed83e8d162b4543dd66038fedbc6a2abfcfa85f37` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeCredentialsFixtures.ts` | 13851 | `eca0093406477b44aad990fd8f73d5e949d7d1f44106636e31eb4516eb6f2874` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeHttp.integration.test.ts` | 8299 | `210022aeb600ad9c7b7ca3b1d0150af14365dfdf2a33731c2f33e2a61e87f0da` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionNativeHttpFixtures.ts` | 14547 | `0c444eb8950ebbb24785fb82bb94f4750d739a5218a20062cfceb5dc84f369a5` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionPaging.integration.test.ts` | 13738 | `301b0968baa56ea1d63cc0888f4bba3f008df3f6df4003f2d3d2f01394e67c66` |
| `packages/core/src/adapters/libsql/__tests__/accountDeletionSchema.integration.test.ts` | 3120 | `55f93dfbe053823593df1c0e23a3cbf432a78ba89ff346c71e89c65b906766b6` |
| `packages/core/src/adapters/libsql/accountDeletionSchema.ts` | 8494 | `bc7da68fd7647053d93a42b753ac5e485d699cf4545831c84b34df9cca853451` |
| `packages/core/src/adapters/libsql/client.ts` | 2372 | `0fa9c5f6b9e81a0b5c0733f7cf908833bac74c08461eef9d42cdde6bb49a0b75` |
| `packages/core/src/adapters/libsql/driveBackupSchema.ts` | 14707 | `f57f9940a5ed8c6f93bf97dd2da312947be73f5ad96c7646b8ac6e5dc768b36f` |
| `packages/core/src/adapters/libsql/hollowSchema.ts` | 11598 | `cd704a1f2ebcb567a5cd4af15b69935d8cbd4ec75246d99350e601df7c7643f4` |
| `packages/core/src/adapters/libsql/hollowUnitOfWork.ts` | 12224 | `b6434a068b8cbcb8780592390e9bdab5697bb0ed1e938ec220976982eac5036e` |
| `packages/core/src/adapters/libsql/migrations/0044_account_deletion.sql` | 366498 | `c74adb1b00cabbb81440a3fc9128d661fcd81696ad0ced1b52754ac158430df7` |
| `packages/core/src/adapters/libsql/migrations/meta/0044_snapshot.json` | 481396 | `77460304b5f310a4e6befed6fbdc0f59e19a36de5e9fd4156c5ad28e778d01b3` |
| `packages/core/src/adapters/libsql/migrations/meta/_journal.json` | 6651 | `1d97708f2cc7ab3fe9060115883863cf1f708e2f8b28a803fc8ffad787465ffe` |
| `packages/core/src/adapters/libsql/publicDiscoverySnapshot.ts` | 21131 | `965e2084e69a8655c830c12e567af4966fd5a8b779d6bd04aca41f9e273a2849` |
| `packages/core/src/adapters/libsql/purgeSchema.ts` | 4453 | `958c282df9162c3070778105afa3b4f20a7fdc89e256c5bfeefbefde38c6b80f` |
| `packages/core/src/adapters/libsql/regenerationSchema.ts` | 11980 | `56b373b0a7a76542eeb6df1ba448d5d4568555fadbf9f14aa3339346ec52d5f7` |
| `packages/core/src/adapters/libsql/repositories/accountDeletionRepository.ts` | 65709 | `23a03b0d1414cd2d83e9c5d48beae198a573f71a2d6efb186b98929cdf255f49` |
| `packages/core/src/adapters/libsql/repositories/accountRepository.ts` | 7363 | `00fbdf4e1250f2d1fa6e0684631488cad64757396f6fb3142bb2958f03d62de3` |
| `packages/core/src/adapters/libsql/repositories/authenticationRepository.ts` | 4573 | `621c99454ff9679645b48d3136d5388fc9ca1fecdf53bdcdfcbe99c2bf51388d` |
| `packages/core/src/adapters/libsql/repositories/batchRepository.ts` | 15856 | `baae8440e0402ee6503010b4d51725c6d6e7a9c98e3a843b4c02d50c92fbb535` |
| `packages/core/src/adapters/libsql/repositories/displayNameRepository.ts` | 2432 | `ee8846b6b7e3b5a3219a67022dbd654018e7dd3a6dc361749031086ab192eba3` |
| `packages/core/src/adapters/libsql/repositories/driveBackupRepository.ts` | 41690 | `f636f47a644dafcef83dfa1acb54ca29632802d098f9a8e12e2e49ad9f5fa274` |
| `packages/core/src/adapters/libsql/repositories/driveRepository.ts` | 39274 | `89c4ca9fbab28adc7290610036668931ccb3587d8b42705d1f62215774be7572` |
| `packages/core/src/adapters/libsql/repositories/exportRepository.ts` | 10021 | `c78de2f182afa4237a0e2a2832df0053d12df348bbc6e9fb0aa86df556de0d42` |
| `packages/core/src/adapters/libsql/repositories/googleAuthAttemptRepository.ts` | 7865 | `49aed45b56c377187e6d998b52d45b7ec6f0b2214b80c9593e1855d9e46c7234` |
| `packages/core/src/adapters/libsql/repositories/invitationRepository.ts` | 7975 | `3e5ebfff626adc66c6b9d4ea418e49e3ef846271957f974658cee95604809317` |
| `packages/core/src/adapters/libsql/repositories/jobRepository.ts` | 5427 | `e839ccf2ae90053ad68207e20d2c7e9d8070040d68cb87238d4195c5afb84c85` |
| `packages/core/src/adapters/libsql/repositories/llmRepository.ts` | 39213 | `3fac8cab0f7e7482457a0c6f8ef627fb38bfe82ea56e8f67bb676334b38fa499` |
| `packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts` | 18187 | `02a91a28b69855bd4288b870b17b1f234c8756e2138800a749b873e894c83969` |
| `packages/core/src/adapters/libsql/repositories/openRouterRepository.ts` | 11304 | `abe57355c1f675da94bb0f6b071e5dae687456558b496b3c4103bf51552fbcb3` |
| `packages/core/src/adapters/libsql/repositories/pdfAnonymousHelpers.ts` | 6154 | `b365d7cbfc9fa7d44dbe893656a61b5e4fd864ca31adb557dda72f2880d3f347` |
| `packages/core/src/adapters/libsql/repositories/pdfHelpers.ts` | 5924 | `8318526e98c61ad2e6f35fdf39d5af19a323de1af740245e611a14b61d12bcf4` |
| `packages/core/src/adapters/libsql/repositories/publicNoteRepository.ts` | 1914 | `daec53385e7cea3072abec8919b69e121fd85849c086a3bb025dcc2a4fb25cf2` |
| `packages/core/src/adapters/libsql/repositories/publicProfileRepository.ts` | 2597 | `f4347860f47a5cdbc98b69189177d5454b856ff643052991daaa9da0bb12de8c` |
| `packages/core/src/adapters/libsql/repositories/purgeRepository.ts` | 39949 | `025cede11e220a34f266dfb86fb9ea1f3bd6a9dfa9a5be02ed5796a743096fcb` |
| `packages/core/src/adapters/libsql/repositories/referenceRepository.ts` | 12544 | `4e22e4b6fe8df1b7300f5c8a5af60d4db749e75682e62bdcaa993e23bbea6ea1` |
| `packages/core/src/adapters/libsql/repositories/regenerationRepository.ts` | 13920 | `75faacac2b2046f1b75cf360d348c6243545bb6c3f5859340874b0520e6de565` |
| `packages/core/src/adapters/libsql/repositories/sharingRepository.ts` | 7900 | `09f920e7f9569d75abb2b015721187bf9e18497b009fc5f3529e4797f08495c9` |
| `packages/core/src/adapters/libsql/repositories/workspaceRepository.ts` | 8087 | `9849b60c65631911b731bf28af9b82c925f86c9176905a24e3a430cdf240e6e4` |
| `packages/core/src/adapters/libsql/repositories/zipDeliveryRepository.ts` | 4347 | `3bdad157afb583e38a7e58a6f33b9e8979439f03df5ecbab36928cc58c0c2b7d` |
| `packages/core/src/adapters/libsql/repositories/zipHelpers.ts` | 14096 | `68c26cd212c2de85070efeb431e1deed992106af0a4c77c96e5e4c58290cb134` |
| `packages/core/src/adapters/libsql/repositories/zipWorkRepository.ts` | 16051 | `e4fd34fc71bd481edc27e075b57b0ea789ca2bdff427ce9536be6c837af89850` |
| `packages/core/src/adapters/libsql/schema.ts` | 919 | `9a94c65f2fa63719e120a3863abf68ba746a3e16564e226cb191cbc6d2f98f14` |
| `packages/core/src/adapters/node/__tests__/coordinatedObjectStorage.test.ts` | 15123 | `871b2a0a3714ed005d3bc77a98ee85d962f2a68b1ceaf2e10e74f158b37e3951` |
| `packages/core/src/adapters/node/auth/config.ts` | 3235 | `4b6cace2b6f45dd9e13c0e3c31fc60409853d68e1ed6ec0b5fd639ee67083490` |
| `packages/core/src/adapters/node/auth/credentialLocalTlsDial.ts` | 10249 | `e8a97c5a8e4310b5a2c13b57858041450ac522a0f303ca5ee1f760d4994425e0` |
| `packages/core/src/adapters/node/auth/credentialRuntimeOwnership.ts` | 19325 | `e07cd78565fe7e7b94480fc1253495d3360f24cc3b11c5027f6ad1a83dfb9dcc` |
| `packages/core/src/adapters/node/auth/googleHttp.ts` | 4822 | `a89479a2729bfd49d4a866239d35e38bd56bae37ba2c94e43b48d1bfb4266d14` |
| `packages/core/src/adapters/node/auth/googleOidc.ts` | 8997 | `7d2a3427afeb06ee304821b8979443a90d97b47c16249533a0b982852ad186a7` |
| `packages/core/src/adapters/node/authenticationExecution.ts` | 4807 | `a4cf2349d298d315ee609dcb4ca2d9ef5f4862ee194220912629309921bcdb7b` |
| `packages/core/src/adapters/node/drive/execution.ts` | 17151 | `de88261f15b303732f095e85f626cc722d8b88486c52b628ee72cdd0ef958d09` |
| `packages/core/src/adapters/node/drive/runtimeOwnership.ts` | 8286 | `f9d04799b5da89f5306abbe2459f20eec188be81fad187dd6b5889295a1890c5` |
| `packages/core/src/adapters/node/openrouter/config.ts` | 3172 | `b14711a4086526e309ccf2ed04bc4aa27cc38972d5a25636818397923ab0860a` |
| `packages/core/src/adapters/node/openrouter/execution.ts` | 3711 | `4f6977a3ab2dbd0c861f39c24a1ad4242758f6706baf0a3572de58fec138706f` |
| `packages/core/src/adapters/node/openrouter/http.ts` | 6692 | `8de96984dc935315ce7b6ebcf00bbf36bf5cc69266e299449262dbbbac97d1b3` |
| `packages/core/src/adapters/node/openrouter/provider.ts` | 13688 | `1656363bdb117c2aaba51694f67c369bc7a3843e3f2cc167e6f1cd7f221c13d5` |
| `packages/core/src/adapters/node/purgeRunner.ts` | 1202 | `ee5ddf0c958d93343cf343aa3e2e9c35ea6e5d3541be6fc198c56e0b23634a22` |
| `packages/core/src/adapters/node/zip/ownedStorage.test.ts` | 20521 | `a08866400fff123555fbbc5505978328b44f0cd5901541fdb2761598b706364f` |
| `packages/core/src/application/account/deletion.ts` | 1542 | `da08ec61121843b2e1734609ece2050aa6c4544b20c81db648af40e55345c021` |
| `packages/core/src/application/account/deletionWorker.ts` | 8150 | `efe1164dbe04e57368955b9b6387c7cca121ae6b11f53774436934766f6cacfb` |
| `packages/core/src/application/account/google.ts` | 14366 | `da9cf5609e0a6ef79f4e6631668c99c879ec13574225c95ef85b5243fd174ca3` |
| `packages/core/src/application/account/ports.ts` | 3641 | `a2cab0e0551497dac82a0225013dc6dfb052e53b43081148f27c622158f3c3cf` |
| `packages/core/src/application/execution/hollowUnitOfWork.ts` | 7354 | `df283ea3e7e50d76f982dbd6848494234502a220b7d16fc4ff1b0abf64a0854f` |
| `packages/core/src/application/integration/drive/ports.ts` | 6949 | `c6e47c5541c4bd8b9299efa1cf482b5e8484fd9957431fc8d8e4f7225dd8d97f` |
| `packages/core/src/application/integration/drive/runner.ts` | 25186 | `d8aca1e28924ec29f5f626bce2f5501c9c4c47489f15652b49747dc47f1f93bf` |
| `packages/core/src/application/integration/openRouter/connection.ts` | 20313 | `3d9ad014cc51d204b190bfa809d08ada1dc266c73d5ed66fbedd3c34fd5a5afe` |
| `packages/core/src/application/integration/openRouter/ports.ts` | 3421 | `2e09844e0a28e194133ef20aa9269b1f077a9ed3de8ba022bf46a463aa8702b6` |
| `packages/core/src/application/note/purge.ts` | 14979 | `9cb3636376fd575fb6b6ecf95215fe561675a2e6ecce8a694d509ccae99992f0` |
| `packages/core/src/application/regeneration/current.ts` | 7956 | `edf3d64c07ecbb6aefb910f4d60d32568972369dff151f4340f7d926012eb443` |
| `packages/core/src/application/regeneration/ports.ts` | 1654 | `28f9cb42110e538307f2dc3b0ff3b146c33c3edf78878699836bbe438f03768d` |
| `packages/core/src/application/regeneration/read.ts` | 5318 | `a2179df7f048ef0ee9a43b97c0b8a892aa5297252b6a1ba1e50fcb5ebded06f3` |
| `packages/core/src/application/regeneration/source.ts` | 11589 | `b8b5d5a9ea85036788fe96480d73496a9e64c02d251bc67ac2a96f16c7a883fb` |
| `packages/core/src/application/workspace/access.ts` | 2693 | `b95a3b77babd2754496d0e72cfeaa107f92a3019453e825809806f99331b4c64` |
| `packages/core/src/application/workspace/delivery.ts` | 7389 | `78f644005ebfd35573c2fb10d9a904326c066e6b0f152820b94d53f903863fee` |
| `packages/core/src/domain/account/deletion.ts` | 4492 | `49bdd4e4c17e66b660a22cb12aac40d62967295509b79ba20599bfa3efdd977c` |
| `packages/core/src/domain/account/ports/accountDeletionRepository.ts` | 2987 | `dfc03e777c476c667edec875dcf82bcc4c9728398415e213e12cb0e03761b411` |
| `packages/core/src/domain/account/ports/accountRepository.ts` | 985 | `18fb8a4498ceedcf0d04985f782d0cc4d921305935c96589f6037283131fc6fd` |
| `packages/core/src/domain/integration/driveBackupRepository.ts` | 5396 | `399f1b91efb0b1ccf72ac154d8cfef5cb5af0217920fb384c2d66f60943b4fcf` |
| `packages/core/src/domain/purge/entity.ts` | 2641 | `62b20045c30c37ef230f1c6fe84a78b8202ed5a1b52e1f5250bb965e27a9c91d` |
