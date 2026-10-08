# C1: PURE と genuine coordinator の次の有限検証案

## 判定と採用境界

SOURCE-only proposal。最初は既存 PURE 2 files / 18 cases の工具候補を作る案であり、実行許可ではない。計画の独立レビュー、Manager採用、NEW helper候補の独立preflight、RootによるPUBLIC precheck→既存の候補CLI preflight結果の全文確認→別採用したONE実行を順に必要とする。現在helper作成、CLI default/preflight、test/import/runtime、DB/native/browser、root probe/createはすべて0。全success/failure/generated/private rootsは恒久非操作であり、旧C0 f82c・S5・UI・P5dの結果を再読・再演しない。新SOURCE変更はこの計画では行わない。

既レビュー [C1 SOURCE CODE](../reviews/P5c-3-drive-llm-c1-candidate.md) 13,311 B / SHA256 c11af63aa65ea53d9e90c9d6c2b7936a282515fd07b576d3ff84c08a2db43fda は LIMITED SOURCE CODE PASS。作者のP1方向を借用したうえで新CODEを独立確認した根拠であり、C1機能・genuine proof・S5 A–F完了の根拠ではない。本書のPUREケースと静的import graphの導出は直接確認。既S5 APP/nativeの局所結果はC1 coordinatorへ転用しない。

## 固定入力

- Controlled SOURCE: /Users/hikaru/github.com/tuanemuy/hollow-p5c-drive-machine-721bc7ad-20261006。
- HEAD 8edbbac7c342353adf9949b8c5e6ccc2ba2aee34 / parent 176ea15b572c610e97f99a021ea94e2ba60637c7。1476 regular / 21,350,117 B ＋ AGENTS内部link1、Git100755唯一provision.shの実mode700、その他SOURCE600。
- 全1477-row manifest 282,565 B / SHA256 1a57de0c7e91a136e377773dc64fa8d47ba7ef82ce2aa5e125382099e1eac97f、formal pair f1d849538f5b50b26364c0cf8bfb1ad3f94c44ddc407b060ce3cf2ca86f98760。前CODEレビューで直接照合済み。今回全SOURCE walk/再guardはしていない。
- criteria/P5c-3-S5.md 6,285 B / SHA256 fc37135e92fbff63fd8de9a40357efbbdb6641bb65555a8946b22179c115e3f0、採用capture/reentry契約とC1候補phaseを正本とする。IN-07通常Drive経路と全F UIは本PUREから除外する。
- 今回選択test: driveRequest.test.ts 971 B / 30122f92a0b4e5d1aba1c0c907185585523a28adba8b171508b6c99850165f0a、inputStage.test.ts 14,786 B / f2b6c61c94cd983a83f83259b7a12584df398f01e344b2b8e1ca14aeba41b918。計15,757 B。
- PUBLIC parent工具: .goal-implement/helpers/p5c-machine-stop-runner.py 281,151 B / 63c82cfd92ba8dbbd79045b26a92c3e6dbf43482e700abd290762b3476f30c21、p5c-machine-stop-config.mts 380,456 B / f2a843ed240aee1c628c39537e8db4a9ceafd94a5ebe4afe4147775e9973b8d9。regular600/nonlink/nlink1/selfUID・NOFOLLOW/fullSHA・前後stableを直接確認した。旧工具は変更・実行しない。logical4内容や旧ROOTを選択しない。
- 原工具のNode24.18.0 canonical a5sxfwnzi3kzxrgj3zfngcqamdhnr161-nodejs-24.18.0/bin/node、Vitest4.1.6、PUBLIC108 links/package metadataは既正式根拠を借用する。現在alias/canonical/bytes/SHAの成立は将来Root precheckで改めて判定する。型/lint/format全3成功は候補報告借用であり、この計画で再実行0。

## PURE18: ケースと範囲

Group P1: packages/core/src/application/llm/driveRequest.test.ts、suite「Drive LLM command identity」、6 cases。

1. keeps the selected source intent independent of a newly allocated command
2. requires new intent after source, body, credential or recipe changes: %j — recordId: other-record
3. 同一title template — noteVersion: 8
4. 同一title template — expectedEpoch: 4
5. 同一title template — modelId: other-model
6. 同一title template — instruction: Different instructions

it.eachの入力5行と順序はSOURCEから確定。%j展開後のofficial TestCase fullNameとJSON assertion fullNameの字句形式は、候補作者が固定Vitest公開formatterから導出し独立preflightへ示す。実観測からexpected namesを作らず、template文字列だけで5件を同一名として扱わない。Reporter suite/titleとJSON file名を分け、file prefixの付け方を混同しない。未固定のままactualには進まない。

Group P2: packages/core/src/application/llm/inputStage.test.ts、12 cases。先頭4はsuite「Drive completion data predicates, without native closure capabilities」、後半8はsuite「S3-P input admission and exact fences」。

1. separates first-write rollback from fail-after quota inputs
2. does not accept same-token terminals with an unrecorded version, outcome or clock
3. requires all prewrite domains while terminal confirmation keeps immutable source identity separate from later cancellation
4. never admits ownership or delivery unknown as failed terminal evidence
5. S3-P01 releases only a first no-claim after the enclosing transaction resolves
6. S3-P02 keeps unknown replay false and capacity occupied
7. S3-P03 migrates the same unknown admission to one lease after saved equality or replay fence
8. S3-P04 releases an unknown admission only after the terminal version fence commits
9. S3-P05 rejects copied admissions and second settles without touching the authentic reservation
10. S3-P06 closes cancelled and expired candidates without requesting current permission or a reader
11. S3-P07 confines source equality and new leases to local fixed text
12. S3-P08 accepts only the exact queued cancellation transition and retains unknown capacity if its acknowledgement is lost

P1はcommandId変更による同intentと、元source/body/credential/recipe選択の異値を確認する。P2先頭4は6-domain prewrite/terminalのdata predicates、quota dispatch前後の別snapshot、clock/outcome/versionのexact equality、unknown ownership/deliveryをfailedへ入れない条件だけを確認する。P2後半8はpure UoW delegateのcommit/unknown、opaque admission/leaseの正規Map照合、取消/version fenceとunknown保持の条件を確認する。fake UoW data callbackによるcommit-error枝はpure境界負例であり、実DB transaction・native closure・保存済原proof・void ACKの正例ではない。prepare注入はUNEXPECTED_PREPAREを拒否し、選択ケースにgenuine prepare/finish/consume成功はない。

NodeRegenerationMemoryは選択testから原constructorを呼ぶが、注入4依存とMap/WeakMapのみで原preparer/resourceを生成しない。constructor wrapperは追加しない。選択casesはDB/native proof mint/Worker/spawn/HTTP/DNS/business child0。今は未実行なので実import時のnative0/DB0は工具のobserver/denialと正常終了で別確認が必要。

## SOURCE runtime import の有限導出

Formal static import/export fromをSOURCE本文から列挙し、import typeとnamed type-onlyを除外、@repo/core/*の正式flat export・既manifest relative .tsへ対応した結果は29 TS / 197,599 B、bare runtimeはvitestとzodのみ、manifest外relative0。全29は既manifest regular pathのNOFOLLOW read、各64KiB/合計2MiB以内、selfUID/nlink1、前後dev/ino/size/mode/mtime/ctime/fullSHAを直接照合した。今回regular29は各600。元Git blobは既manifest/前CODE guardに束縛する。追加Git操作0。

この一覧はSOURCEの宣言辺であり、Vitest/Vite/Zodの全runtime JS closureや実resolverの成功を証明しない。side-effect import/require/createRequire/実dynamic importの追加literalはこの29本文に見つからず、import(...)2箇所はTS型位置、唯一NodeRegenerationMemory newは既testの注入constructor。regexのみの一般closure証明ではなく、一覧のnamed declarationsと該当行の静的照合である。候補が別SOURCE/依存を取り込むならexact追加表を採用前に提示する。

| SOURCE path | bytes | SHA256 | manifest Git blob |
| --- | ---: | --- | --- |
| packages/core/src/application/llm/driveRequest.test.ts | 971 | 30122f92a0b4e5d1aba1c0c907185585523a28adba8b171508b6c99850165f0a | 2f069649157e1f9a15ac1658cf6e4986d08687b6 |
| packages/core/src/application/llm/inputStage.test.ts | 14786 | f2b6c61c94cd983a83f83259b7a12584df398f01e344b2b8e1ca14aeba41b918 | bfbd16bf44664ada29a4d90110026470a0ba19ca |
| packages/core/src/application/llm/driveRequest.ts | 5840 | 1b70b91f88ea15fffa875a914deaba0ac2420a0d53259d097329f06b67fda9ad | 2e17bc9681e41511661d48afff3c896a1c6896cc |
| packages/core/src/adapters/node/regeneration/memory.ts | 15434 | 2264632b4eb4703e2b445a21e66980545b8d74ef7b77e303909617edaf715bbd | ff942a1c81ab2512b45b310dd0e644af904260d0 |
| packages/core/src/application/llm/inputStage.ts | 12181 | 84f11577400b52f9064a5568d8827f157e76731efdb0472e5a54361ba6fca85e | 9d1193a3cb2224fbee17504432396ca645c1fee8 |
| packages/core/src/domain/error.ts | 1914 | 4c734a0010826e072ea9698baa22be49b4171a8db7446af703a30b89895ca7cb | 9795fe18aee9c24fc9f18bfb90ec0f8a7190d241 |
| packages/core/src/domain/regeneration/entity.ts | 6214 | e8302bbfc23d4d9baebd704466e00c2ba13629f721de366d2a720668d128af79 | ba2a056fbce432d46dbfca925bb63b12993fecf0 |
| packages/core/src/application/errors.ts | 5355 | d3a266afa7502b96ef88aefca46e1f9c191136527c708d6fea424ac4137ba577 | 07a10ddbf118f90b656b40775c8bd933510877f0 |
| packages/core/src/application/regeneration/current.ts | 12518 | fba11375896b2f32e6794705181adcbd5a113f4277260f1ec2ef526b42a5958c | 565c5a3886ea95d35518831d4ec1c5fff9f68c87 |
| packages/core/src/application/llm/request.ts | 16650 | c5abfdec67c75c4897c8d7453a334720d8db47d4cf99d6fb3840b2acd30127ee | 9bc1fbb9dd734c2fd28cf1f4f40ad2fd75489a96 |
| packages/core/src/application/llm/ports.ts | 12437 | 4c4c25034547240e9065e54a0222a086ca6d6c892e4c8d47eb3f30e47dc4fca0 | 75cc18a5561d65922059cedcda6a51050dc72c12 |
| packages/core/src/application/regeneration/services.ts | 9713 | 657b34347525567295cd4ab5e85a136881a646aace734ea011882fbd9294d561 | 85bf4fe1d2ba2ef6437adbf992a8aa170ecc05a4 |
| packages/core/src/domain/regeneration/source.ts | 3296 | 65704cc89ec4c57e6a72f6c39873fa46dd3fc25d81c69ac7c5065da2cff496c0 | 42de64a82c5f19002b3a072a52d6dc3e54880a6b |
| packages/core/src/application/llm/completion.ts | 3105 | 47f05252131da3f64705885c7c71a57a2c83e2fdf65dfb8e5505c4f547574e08 | 0d9611438d32fe35180b68ba21445251248c3e4c |
| packages/core/src/application/llm/current.ts | 5650 | 338bdc0b88500c0fcef3b39866f3e2ddb90fcc24fd49b42fe943d18c5095055a | 9b6127515f37b95063861a37d36775c0b2dc1b85 |
| packages/core/src/lib/error.ts | 960 | d7c6de69cd0b6d8bbd5fc7057092e162b64ee01a44191888fdd8286401575f0d | dd428589abc9e4c0bfd98b14374e2eb020de27c3 |
| packages/core/src/application/account/session.ts | 2714 | da6abc18ed13ba468aa617735c99d554377dc83ad41cac34affcc34f5a3b3118 | 7687e4d15cdc84c83b2f60ad69933eef8721795f |
| packages/core/src/application/workspace/access.ts | 2616 | 627a529df725fd1fae951c40762b744a416bbd00383eee331d197f2f9639831a | 7f7eb4e0659a072eaa4d5e4c3273cd877e17d090 |
| packages/core/src/domain/llm/entity.ts | 7524 | 29fc41d9f9e7f66724547cfc7de61726f45752c006ca184326e28993e155c8fd | 54e930cabbcbb4e8efc1647968c5187dc3ad4301 |
| packages/core/src/domain/llm/pdfPreview.ts | 8721 | d356c2144d536c3edeb665c7b403b31ba0ed3fbab9d041c2a8f0c71fcb0f3ab7 | 273321d06dac01ba9184022d5aad8ffcf694a3ba |
| packages/core/src/domain/note/displayStyle.ts | 1436 | 26c270f9d7a3b4691acf70e593de52961c2cc36895053559d4cacee8be9d38c1 | a429752f6d58645b4af5a3cb82a0480b22a2c940 |
| packages/core/src/application/note/commitNote.ts | 6916 | 56aa9524a4c6750073ca09c50b6daf11abc2afcdc96915993f6e5719577d8c68 | a7ba8e31fc8c35149aec98422fafe8e46ec1bced |
| packages/core/src/application/llm/pdfPreview.ts | 22894 | 31f665724c2a4d712b93dd05ace2e91855ac05c897defd891e88f1d36e8205f6 | 562233e4d2509c0dba8d738771b9e5a7ebf8260a |
| packages/core/src/domain/asset/entity.ts | 2801 | eecb519811a44c39f0ed20d84e41897b62ac4cc4bcf94b0259cc424826bf76a2 | c060f8f1aa41c134c87d78673b8a0742fb819435 |
| packages/core/src/domain/workspace/entity.ts | 2465 | e96c8f5448e2dec4e525015c00466adb351965517639ca44034c3905020c0fef | 9acb25b033a8b4936e978e188bd98f62939f4356 |
| packages/core/src/domain/note/revision.ts | 3022 | 7073fadb009753301dd6be21deb8953a70ed7f09ae5aa9fed0b9f0f5c4117f4d | db1b55b5bac69ef9c57bd57070d2038ee7c756e9 |
| packages/core/src/application/asset/access.ts | 4246 | e25aed0ba0aa3483a58c81d516137979f06cd1c58856737d4827028d01d08b70 | f5dc9cdad92ee9b589e48de9014d2191cd213829 |
| packages/core/src/domain/integration/openRouter.ts | 3995 | 61359f94d811ee146efe43d03b955fe54440f1eb26199d458e27c7eb9e2652e2 | ffbb6957159458d1d27c6c393087cde194f2a431 |
| packages/core/src/application/llm/ownershipError.ts | 1225 | 60af00651432af0449c192c5e6ab45e557381e3d667c245a9f92975e7b454439 | 254dce96bfbb30d4e51a7b2bbf747d9fbdc27a2f |

静的辺のexact表は次節JSONに固定する。PUBLIC packagesの実解決は既108 tableのうち packages/core/node_modules/vitest と packages/core/node_modules/zod の原canonicaltargetへ束縛し、Zod4.4.3 package metadata 3,796 B / c630bd10b52dcf71c112a2bf78dbf2734b9db58d62de663b8d86c2ec2c8cda2e、Vitest4.1.6 package metadata 5,918 B / 16e78981f0c4f0b28c7056c06c0d87ee7c65821c721915df941996437a4267a9 を元PUBLIC tableより直接抽出した。workspace core package exportsは元flat ruleを維持する。依存追加/install/未知ancestor探索は提案しない。PUBLIC108/83の全byte検査は今の計画では借用、future候補とprecheckがその正式serialization/target表を固定する。

## NEW PURE工具の変更範囲案

候補作成時だけ NEW .goal-implement/helpers/p5c-drive-llm-c1-pure-runner.py ＋ p5c-drive-llm-c1-pure-config.mts の2 pathsを提案する。元C02helpersはimmutable。SOURCE/test2の変更0。根本的工具再設計は不要で、manifest/C1 HEAD・family2/file/title/count・fresh roots・guards/caps/dependentSHAを変更し、元CLI/IPC/Fork/outer正常predicateを残す。変更後、親全文inverseをmemory内で示し、不可逆なPURE固有deltaは各spliceごとに列挙する。

2 one-file groupをP1→P2の順に実行し、各stockForksPoolWorker cacheFs=false/maxWorkers1/maxConcurrency1/watchfalse/fileParallelismfalse。各original CLIは1初期fileだけなのでsetup workerId0/poolId1、config親realm未setup・fixture前same-worker-setup-end sourceGuardを保持する。2 filesを同forkへ広く許可する形やworkerId一般範囲化は採用しない。各groupに別exclusive private ROOTを必要とし、group1完全正常閉鎖前にgroup2を作らない。plan段階ではsuffix予約しない。candidate提出時にRootがMEMORY-only名2つを採用し、preflightのfresh検査・実exclusive createは別許可とする。

将来CLIは候補に存在するexact --preflight P1/P2、--supervise P1/P2を作者が文書化する。現在NEW CLIは存在しないので使用可能とは主張しない。Root採用ONE familyを2 sequential groupまでと定義するか、P1正常後P2を別ONE採用するかはManagerが候補固定時に選ぶ。前者でも2 group各正常receiptを必要とし、P1成功/P2欠測を18passにしない。

元custom poolはnonbuiltin名をC1専用にし、stockfork receiver/args/env/return・実ChildProcess同handle・temporary Proxy復元・original start/stop/normalSIGTERMを維持する。fork作成以外のspawn/exec/fork/Workerは禁止。親config 162–168は原Worker constructorをProxy denyへ置換するので、今回constructor wrappers 0の条件下ではその部分を無条件に継承しない。static SOURCE graphのbusiness builtin import0を実resource0へ補完しない。候補作者はconstructor恒等を保つSOURCE-bound import/port拒否のexact実装案と、Worker/spawn0否認・正常stockforkのみ許可・復元の根拠を先に示す。import guardを使うならknown SOURCE29のImporterとstock Vitest toolのImporterを区別し、unknown/bypassはheld、一般builtin能力は追加しない。原constructor/effectの呼出observer・fake事件/privatebrandは0。新negative guardの候補が未固定なので、これは工具前残務でありactual-readyではない。親のbusiness-load原fieldを異なる観測意味でそのまま使わず、否認attemptとactualspawn/Worker欠測を区別する。DB driver・ObjectStorage・credential・外部clientのimport/構築も選択外で拒否し、DB0/audit0を正常summaryで別fieldsに保持する。

各file exactly6/12、ready=result/同TestCase identity各1・順序exact・skip/todo/pending0・officialJSON単一file/合計一致・errors/unhandled0を必要とする。hooksはSOURCEのtest hook0＋工具setup/afterAll由来で、実callback対応を確認する。hook数を先験的にC0の9へコピーせず、candidate sourceから導出してstarts/endsを必須とする。選択以外のfixture/global setup/他test実start0。native ledgerの「resource0」をclosure proof成功にしない。

## PURE資源と停止の提案上限

値は許可cap案であり、計測値ではない。SOURCE最大file1,128,375 B、総21,350,117 Bなのでsource32MiB/各2MiB guardに収まる。selected runtime29は197,599 Bで、runtime import検査本文cap2MiB/各64KiB内。全manifest、PUBLIC metadataはread-only public config側に置き、private materialへ282,565 B manifestをコピーしない。

| 項目 | 上限案・導出 |
| --- | --- |
| business DB/objects/key/Worker/child/network | 全0。監査DB/copyも0 |
| 工具 | outer Python1＋inner Python1、Node CLI total2 sequential / 同時1、stock toolFork total2 / 同時1。工具外Python/Node spawn0 |
| private ROOT | 各16MiB、2 roots合算32MiB。TMP/cache各group合算8MiB＋records/material 0.25MiB＋metadata余白。未知file拒否、dirs700/regular600/nonlink/nlink1。上限余白は生成許可ではない |
| private records | per group: node-bindings2×512 B＋Reporter8KiB＋stockfork8KiB＋business-load8KiB＋summary32KiB = 58,368 B、2 groups116,736 B＋outer aggregate32KiB = 149,504 B。全material256KiB以内。未使用native-ledgerは生成0 |
| public config | parent380,456 B＋C1 manifest差/18 title/table差を候補でactual byte算出、1MiB以内。private256KiB materialとは分離 |
| 原stdout/stderr | total2MiB/group以内、raw message/body/SQL/path/IDs/stackは保存・表示0。有限fieldsだけsummaryへ |
| control | node ownership/finishedを各group exactly2枠、outer aggregate1枠の計5が正常基本形。既line cap32KiB、max64frames/total32KiB以内を候補でworst-case encoded bytes算出。ledger8KiBとnode-binding512 Bを混同しない |
| case/hook/tool teardown | 10s/10s/10s、test6/12のSOURCEにはtimer wait/retryなし。group30s / 2groups work60s＋shared TERM10/KILL10/PIPE10でouter90s案。sourceGuard各10sはoverall内。候補でfullprecheck・setupの有限timer開始点を示し、90sの成立が静的に不足ならactual前に正当化する |
| 監督 | 200ms、actualspawn直後early PID/PG所有、getpgid/kill(-PG,0) alive/absent/unknown三値、leaderexit≠PGabsence。known-only TERM/KILL finite、absence tombstone再signal0 |
| normal | 各group Node0＋knownPGabsent＋2rawPIPE actualEOF＋2独立FD close-return/closed flags、stockfork actualexit-close/PIDabsence/stdinclose/readable end-close/公開disconnect-connectedfalse-channelrelease、KILL/outerforce0、sourceGuard・quiescent rootStrict。outer Python0/ownPGabsent/2EOF＋独立FD flagsも別receipt |
| public IPC | stockfork IPC EOF/FDは元公的shape NULL・unobservedを保持。公開disconnect/connectedfalse/channelrelease/actualexit-closeを原条件で確認し、NULLをtrueへ補完0 |

source_guard/fullPUBLICprecheck→fixture前worker-end guard→result後/fork閉鎖→strict root guardを維持する。TMP volatileな有限例外を引き継ぐ場合、own PG alive/既登録anchor/列挙済entryのENOENT条件と欠測ledgerを含むexact parent範囲を候補で明記し、正常quiescent strict必須。raw outputを捨てたことやfinallyのclose要求でactualEOF/actualFDcloseを埋めない。force/non0/unknown/receipt/schema欠測時はheld、後続groupやcopy/audit0。failure ROOTは即恒久非操作、blind fresh replayを提案しない。

## genuine coordinator の別family案

PUREの結果に依存せず、次の独立SOURCE test proposalは NEW packages/core/src/adapters/libsql/__tests__/driveLlmCompletion.integration.test.ts ＋ NEW packages/core/src/adapters/libsql/__tests__/driveLlmCompletionFixtures.ts の2 pathsとする。既driveRegeneration.integration.test.tsのprepared admission4を再演してnative正例へ転用しない。製品12SOURCE/DDL/ports変更0を出発点とし、正規original provider/Drive/input/storage/ownership/execution/UoWのtest DIが不足する場合は、exact必要pathと現contract差を先にManagerへ示す。旧P5d fixture/privateproof/materialのコピー/clone/発行流用0。この2-file scopeの採用は未済み。

| family | 原操作・必要な直接対 | 正負期待 |
| --- | --- | --- |
| GC1 normal | 原withOwner1をdispatch/body/final inspect/void ACK/finish-save/exact-read/samelease consume→closed final Txまで保持。genuine finish SourceInputProofを原factoryから取得しsame original reference/consumer/runtime/token/gをSOURCE native validatorで検証 | 元callbackがfinal exact確定までpending、同proof normalconsume後だけ自然callback return→原storage finally/endWrite→原execution finally。body/refs/revision/job/quota/result currentを実DBでassert。row nonnull/boolean能力0 |
| GC2 lost terminal reply | 元final Tx commit実完了後・戻り直前だけ外response-loss gate。samewithOwner/awaiter/immutable record/proofを保持し、原readonly terminalSavedで全expected/current/outcome/owner/input/Drive/dispatch/quota/revisionを読む | saved exactだけ元sameawaiterを解放。body write/finalcheck/void ACK/consume/clock/dispatch/quota再演0を元methodの受動counterで確認。rollbackやunknown missing/mismatchはpending held |
| GC3 rollback/reentry | first FIRSTWRITE前record→exact6-domain unchanged rollback、同originalcallback次original Tx newrecord/newclock。second allowed invocation中known current guard拒否はoldrecordを上書きせず元failure別invocationへ | 原success/failure FIRSTWRITE前の順・fail後release前のterminal snapshot、同complete now/args/outcomeをassert。exactrollback6 domainsのどれかunknownならreset0。反復3回目はinvocation cap2のheldを保持し、liveness成功にしない |
| GC4 stop/recovery | 同原timer1/2sとmicrotaskだけ、originalexecution.stop中のlatependingをDrive recover-onlyで解消、same cached stopPromiseのreturn/rejectとsticky maintenance errorを直接確認 | stop中new claim/prepare/generate/project/ACK0、savedexact recoveryは継続。同proof不確定・originalstop拒否・未知native/read/ACKは解放0。新private execution API/timeout resolve/追加timer0 |

GC3のrollback境界は「callback実行した」では不足で、原beforeWrite6 domains全戻り/同Tx rollback完了のexact saved stateを必要とする。GC2とGC3を同fault機構で同時発火しない。GC4の論理stop4受入はスケジューリング参照として借用し、C1 genuine callback/proof recoveryをその成功へ足さない。legacy/old-runtime proof/unknownbirthにはcurrent-runtime WeakMap正例を流用しない。possible-delivery/ownership unknownをfailedへ変換したりquotaをnot-sentへ戻したりしない。

正規Drive owned read/current inspectionとOpenRouter providerのlocal native positive、callbackendと保存ACKは、現在SOURCEのnormal native capability取得が成立するfixtureだけで使う。external service/本人credential/emailは禁止。loopback TLS/HTTP等を必要とするなら originalhttps/native identity・owned local listener/socket/response/wholecaller閉鎖の正式契約、listener/accepted/client原handleの閉鎖capを別候補で採用する。現2-file fixtureだけでそれを作れるかは未確定であり、fake provider JSON/dummy privatebrand/手製opaque receiptで代用しない。genuine fixtureのstartup/import/normalrole/resources/key/TLS closure予算は未確定、GC1–4 actual-readyはNO。

## retained references / holding の未確定を残す

製品のdrivePending max2と各callback immutable Tx invocation max2はcount安全境界であり、heap byte上限を導出しない。保存応答不明中は元callback closure/body/projection/response/prepared/media/error/Promise参照が残り、prepared又はresponseの同一bytesをsnapshotにも保持した場合もdomain単位で別に数える。GC fixtureでは1 pendingずつから始め、必要な二枠の境界のみ後段にする。

fixture値案は非PDF text原input128 B以内、prepared text128 B/segment1、provider response128 B、採用body128 B、projection128 B、media0/reference0、source Original1、dispatch1、quota1、LLM1/genericjob1、Drive binding1、Tx invocation<=2。これは機能仕様変更ではなく有限test値案で、genuine preparer結果がこのshapeになるかは候補でSOURCEから導出する。no mediaでもOriginal/source/recipe/hash/runtime/token等scalar参照は残る。

各pendingの全保持表には (a)原lease/proof/source/callbackとfinish deferred、(b)prepared/text/segment DTO、(c)raw response/result body/projection/reference/media、(d)6 prewrite domains×2 invocationsのdeep-data snapshot、(e)terminal-call/outcome/nowとsavedterminal/read projection、(f)original error/expected-error/callback/Promise closures、(g)original storage/execution finally待機参照を別行で載せる。Dates epoch/scalar snapshotだけで(genuine proof等) private objectまでdeepcloneしない。共有参照はaliasとして示し、親参照が残る間に「free済み」として差し引かない。

128×5=640 payload octets/pendingというfixture案は、UTF-16 string/copies/objects/arrays/Promise/error/engine heap込みのpeakではない。max2 pending×max2 invocations×6 domains=24 domain snapshotsというcountもbyte峰値ではない。original Errorのmessage/stackを読まずopaque参照で保持する以上、一般heapはUNKNOWN。この計画では総retained heapのactual上限を偽って数値化しない。GC候補には全plannedvalues/native reader/preparerの形式別上限と参照表、工学的heap/プロセスbudgetの採用方法を提示する必要がある。成立しない段階ではUNKNOWN/NOT READYを維持し、private material256KiB・ROOT容量とheapを取り違えない。pending2/callback2だけをholding byte capの代わりにしない。

## 受入への対応と次の入口

PURE18はBのintent/digest data条件、Cのadmission/current/cancel fenceのpure負例、Dの「unknownをfalseで返却しない」data条件とC1 capture/reentry predicatesの一部だけを支持し得る。Aの原owned extraction/fullbody/undo、D genuine closure/save-read/ACK/2CAS/reply-loss、E実DB atomic refs/body/job/rollback/undo、F通常Drive UI/boot/stop/historyは未検証。既S5の受入根拠は変更しない。PURE通過をGC1–4や全criteriaへ昇格しない。

次のManager判断はこのplanの独立レビュー→PURE NEW工具2作者へ上記limited scope委譲。ケース名展開・候補実bytes/material/controlworstcase・source/HASH依存・2 group予算・normal gatesを候補固定して再独立preflightする。genuine fixtureはその後の別SOURCE scope採用であり、PURE実行に混ぜない。現在SOURCE/helper/Manager edits0、future names予約/probe0、全reader STOP後にplanだけ返却する。

## Exact static edges

行は [importer, formal specifier, manifest target 又は bare]。type-only adjacencyはruntime表へ入れない。

```json
[
["packages/core/src/application/llm/driveRequest.test.ts","vitest","bare"],
["packages/core/src/application/llm/driveRequest.test.ts","./driveRequest","packages/core/src/application/llm/driveRequest.ts"],
["packages/core/src/application/llm/inputStage.test.ts","@repo/core/adapters/node/regeneration/memory","packages/core/src/adapters/node/regeneration/memory.ts"],
["packages/core/src/application/llm/inputStage.test.ts","vitest","bare"],
["packages/core/src/application/llm/inputStage.test.ts","./inputStage","packages/core/src/application/llm/inputStage.ts"],
["packages/core/src/application/llm/driveRequest.ts","@repo/core/domain/error","packages/core/src/domain/error.ts"],
["packages/core/src/application/llm/driveRequest.ts","@repo/core/domain/regeneration/entity","packages/core/src/domain/regeneration/entity.ts"],
["packages/core/src/application/llm/driveRequest.ts","../errors","packages/core/src/application/errors.ts"],
["packages/core/src/application/llm/driveRequest.ts","../regeneration/current","packages/core/src/application/regeneration/current.ts"],
["packages/core/src/application/llm/driveRequest.ts","./request","packages/core/src/application/llm/request.ts"],
["packages/core/src/adapters/node/regeneration/memory.ts","@repo/core/application/llm/ports","packages/core/src/application/llm/ports.ts"],
["packages/core/src/adapters/node/regeneration/memory.ts","@repo/core/application/regeneration/services","packages/core/src/application/regeneration/services.ts"],
["packages/core/src/adapters/node/regeneration/memory.ts","@repo/core/domain/regeneration/source","packages/core/src/domain/regeneration/source.ts"],
["packages/core/src/application/llm/inputStage.ts","./completion","packages/core/src/application/llm/completion.ts"],
["packages/core/src/application/llm/inputStage.ts","./current","packages/core/src/application/llm/current.ts"],
["packages/core/src/application/llm/inputStage.ts","./ports","packages/core/src/application/llm/ports.ts"],
["packages/core/src/domain/error.ts","@repo/core/lib/error","packages/core/src/lib/error.ts"],
["packages/core/src/domain/regeneration/entity.ts","zod","bare"],
["packages/core/src/domain/regeneration/entity.ts","../error","packages/core/src/domain/error.ts"],
["packages/core/src/domain/regeneration/entity.ts","./source","packages/core/src/domain/regeneration/source.ts"],
["packages/core/src/domain/regeneration/entity.ts","./source","packages/core/src/domain/regeneration/source.ts"],
["packages/core/src/application/errors.ts","@repo/core/lib/error","packages/core/src/lib/error.ts"],
["packages/core/src/application/regeneration/current.ts","../account/session","packages/core/src/application/account/session.ts"],
["packages/core/src/application/regeneration/current.ts","../errors","packages/core/src/application/errors.ts"],
["packages/core/src/application/regeneration/current.ts","../workspace/access","packages/core/src/application/workspace/access.ts"],
["packages/core/src/application/regeneration/current.ts","./services","packages/core/src/application/regeneration/services.ts"],
["packages/core/src/application/llm/request.ts","@repo/core/domain/error","packages/core/src/domain/error.ts"],
["packages/core/src/application/llm/request.ts","@repo/core/domain/llm/entity","packages/core/src/domain/llm/entity.ts"],
["packages/core/src/application/llm/request.ts","@repo/core/domain/llm/pdfPreview","packages/core/src/domain/llm/pdfPreview.ts"],
["packages/core/src/application/llm/request.ts","@repo/core/domain/note/displayStyle","packages/core/src/domain/note/displayStyle.ts"],
["packages/core/src/application/llm/request.ts","../account/session","packages/core/src/application/account/session.ts"],
["packages/core/src/application/llm/request.ts","../errors","packages/core/src/application/errors.ts"],
["packages/core/src/application/llm/request.ts","../note/commitNote","packages/core/src/application/note/commitNote.ts"],
["packages/core/src/application/llm/request.ts","../workspace/access","packages/core/src/application/workspace/access.ts"],
["packages/core/src/application/llm/request.ts","./pdfPreview","packages/core/src/application/llm/pdfPreview.ts"],
["packages/core/src/application/regeneration/services.ts","@repo/core/domain/error","packages/core/src/domain/error.ts"],
["packages/core/src/domain/regeneration/source.ts","zod","bare"],
["packages/core/src/domain/regeneration/source.ts","../error","packages/core/src/domain/error.ts"],
["packages/core/src/application/llm/completion.ts","@repo/core/domain/note/displayStyle","packages/core/src/domain/note/displayStyle.ts"],
["packages/core/src/application/llm/completion.ts","../note/commitNote","packages/core/src/application/note/commitNote.ts"],
["packages/core/src/application/llm/completion.ts","../workspace/access","packages/core/src/application/workspace/access.ts"],
["packages/core/src/application/llm/completion.ts","./ports","packages/core/src/application/llm/ports.ts"],
["packages/core/src/application/llm/current.ts","@repo/core/domain/asset/entity","packages/core/src/domain/asset/entity.ts"],
["packages/core/src/application/llm/current.ts","../regeneration/current","packages/core/src/application/regeneration/current.ts"],
["packages/core/src/application/llm/current.ts","../workspace/access","packages/core/src/application/workspace/access.ts"],
["packages/core/src/application/llm/current.ts","./inputStage","packages/core/src/application/llm/inputStage.ts"],
["packages/core/src/application/llm/current.ts","./ports","packages/core/src/application/llm/ports.ts"],
["packages/core/src/application/account/session.ts","../errors","packages/core/src/application/errors.ts"],
["packages/core/src/application/workspace/access.ts","@repo/core/domain/workspace/entity","packages/core/src/domain/workspace/entity.ts"],
["packages/core/src/application/workspace/access.ts","../errors","packages/core/src/application/errors.ts"],
["packages/core/src/domain/llm/entity.ts","../error","packages/core/src/domain/error.ts"],
["packages/core/src/domain/llm/pdfPreview.ts","../error","packages/core/src/domain/error.ts"],
["packages/core/src/application/note/commitNote.ts","@repo/core/domain/asset/entity","packages/core/src/domain/asset/entity.ts"],
["packages/core/src/application/note/commitNote.ts","@repo/core/domain/note/revision","packages/core/src/domain/note/revision.ts"],
["packages/core/src/application/note/commitNote.ts","@repo/core/domain/workspace/entity","packages/core/src/domain/workspace/entity.ts"],
["packages/core/src/application/note/commitNote.ts","../asset/access","packages/core/src/application/asset/access.ts"],
["packages/core/src/application/note/commitNote.ts","../errors","packages/core/src/application/errors.ts"],
["packages/core/src/application/llm/pdfPreview.ts","@repo/core/domain/error","packages/core/src/domain/error.ts"],
["packages/core/src/application/llm/pdfPreview.ts","@repo/core/domain/integration/openRouter","packages/core/src/domain/integration/openRouter.ts"],
["packages/core/src/application/llm/pdfPreview.ts","@repo/core/domain/llm/entity","packages/core/src/domain/llm/entity.ts"],
["packages/core/src/application/llm/pdfPreview.ts","@repo/core/domain/llm/pdfPreview","packages/core/src/domain/llm/pdfPreview.ts"],
["packages/core/src/application/llm/pdfPreview.ts","../account/session","packages/core/src/application/account/session.ts"],
["packages/core/src/application/llm/pdfPreview.ts","../errors","packages/core/src/application/errors.ts"],
["packages/core/src/application/llm/pdfPreview.ts","../workspace/access","packages/core/src/application/workspace/access.ts"],
["packages/core/src/application/llm/pdfPreview.ts","./inputStage","packages/core/src/application/llm/inputStage.ts"],
["packages/core/src/application/llm/pdfPreview.ts","./ownershipError","packages/core/src/application/llm/ownershipError.ts"],
["packages/core/src/application/llm/pdfPreview.ts","./ports","packages/core/src/application/llm/ports.ts"],
["packages/core/src/domain/asset/entity.ts","@repo/core/domain/error","packages/core/src/domain/error.ts"],
["packages/core/src/domain/workspace/entity.ts","../error","packages/core/src/domain/error.ts"],
["packages/core/src/domain/note/revision.ts","../error","packages/core/src/domain/error.ts"],
["packages/core/src/application/asset/access.ts","@repo/core/domain/asset/entity","packages/core/src/domain/asset/entity.ts"],
["packages/core/src/application/asset/access.ts","@repo/core/domain/workspace/entity","packages/core/src/domain/workspace/entity.ts"],
["packages/core/src/application/asset/access.ts","../account/session","packages/core/src/application/account/session.ts"],
["packages/core/src/application/asset/access.ts","../errors","packages/core/src/application/errors.ts"],
["packages/core/src/application/asset/access.ts","../workspace/access","packages/core/src/application/workspace/access.ts"]
]
```
