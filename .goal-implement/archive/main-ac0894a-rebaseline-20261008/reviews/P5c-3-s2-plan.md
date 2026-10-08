# P5c-3 S2 着手案の独立静的レビュー

対象は [S2案](../phases/P5c-3-s2-plan.md) 99行17,760B、SHA256 `714162af18879fa576ca338ebd0c606d3846ee7bc23005377a414710bd3876e0`。全文EOFを確認。現製品 `8902b48bca04ade91696e851bb3b5df707348665`、tracked clean。S1-A/B/C/Dの受入と [F1/F2修正](P5c-3-s1-fix.md) を前提に、IN-07/IM-06・designの所有/入力寿命・CLAUDEの内向き型/portへ照合した。

判定は **方向は採用可能、実装開始前に M1/M2 の保存・証拠境界を明文化する補正が必要**。特に§5のactive/unknownだけのSQL集計とclosed未ACK保持は、そのままでは両立しない。0043や新資源の予約・実装を本報告で許可しない。S1を不合格へ戻す指摘ではなく、次sliceで変更する共有契約を閉じるための補正である。

goal-implementの独立静的レビューとして公開source/管理報告だけをread-only shell（login:false）で読取。本報告以外の編集、test/import/DB/helper結果/private/native/HTTP/browser/外部仕様調査、新root/資源作成は0。主/製品/helper/runtimeは固定。spec/spec-implement/goalAPIは不使用。

## 判定の内訳

| 範囲 | 判定 | 最小の条件 |
| --- | --- | --- |
| 正規consumer→取得→text準備→activeの入力だけ解放 | 採用可 | 主目的に直接つながる小integrationとし、通常runner/DI/UI/本文採用へ公開しない |
| 3consumerに各1 nullable input receipt、追加0043 | 補正後採用可 | M2の遷移・旧NULL非0・proofのCAS確定寿命を固定。9 triggerだけの限定差と旧全値原子移行を保つ |
| source targetとbackup共通data枠 | M1補正必須 | DBのclosed未caller/未ACKを全入口で保持、ACK後DB失敗で証拠を捨てない |
| 同consumer逐次read/worker終了 | 採用可 | 一つのgeneration/予約内でreadを直列化し、前readの親参照/worker clone終了を次readより先に確定 |
| exactpaths/7DB144MiB/HTTP24/worker4 | 範囲として妥当、実行前具体化 | M1のsource限定ACK境界は既予定ports/execution/runner内で実装可能。有限時間と自己要求列を起動前に固定 |
| 全再生成、PDF/machine/通常LLM接続 | 後続未完 | S2成功をUI・本文CAS・全取消/purge・実Googleへ拡張しない |

## M1: closed未ACKの持続とACK後DB失敗を閉じる

現 `adapters/node/drive/execution.ts:125–132` のacceptingは同instanceの未ACK proofとpredecessorを止める。`:371–384` のacknowledgeはcaller endedのentry/previousProofを削除する。したがって案§5の「execution ACK→DB acknowledged」の後半CASが失敗すると、現executionには案が前提とする同runtimeの再照合台帳が残らない。absenceをACK成功の代用にもできない。

さらに現 `adapters/libsql/repositories/driveRepository.ts:53–85`、`driveBackupRepository.ts:67,1015–1024` のheldはactive/unknownだけ。`application/integration/drive/runner.ts:376–398,479–503` のscan/先任empty判定もこの集合に基づく。S2でsourceのclosed-unackedを同じ扱いに落とすと、永続owner保持と再起動時の拾い直しを証明できない。旧backup/controlの契約を全体再設計する必要はないが、新source側の持続状態をlocal memoryだけへ委ねてはいけない。

最小補正は次の一案とする。

1. sourceのSQL/repository共通held述語を `owner active/unknown OR (terminal closed AND (callerEnded!=true OR acknowledged!=true))` とする。queued/never-ownedの未受付取消やclosed/caller/ACKすべて成立した終端は含めない。既shape違反/欠測は安全に拒否し、0扱いで通さない。
2. source claim、backupの相互data guard、authorization/controlの正規claim集計、held scan、reconcile、predecessor empty判定へこの同じ集合を使う。data global1/account1（accountはbindingのcredential owner）、control global2/account1、合算global3/account2を維持する。source/backupどちらが先でも拒否が対称であること。active/unknownだけへ戻す文言は削除する。
3. bounded scanはclosed-unackedを含み、残件/上限越えは「empty」ではなくclaim拒否。既limitをsource追加分へ黙って流用せず、data合算最大1に対するoverflow sentinel等、正常上限を検出できる有限集合を使う。特定runtimeだけを除いて枠を空けない。
4. sourceに限り、exact target/owner/evidenceに対応するACK段階の証拠をDB acknowledged CASの確定まで保持する。実装一案はNode executionのsource entryを「native closed→caller ended→execution ACK済/DB確認待ち→DB確認済破棄」の閉じた段階にする。現acknowledgeの即削除をsourceへそのまま適用しない。applicationはexact行/proofを先に保存、execution ACK、DB CAS、確定通知の順。DB失敗/応答不明ならbufferを渡さず証拠とheldを残す。同じproofの再照合は外部要求/新claimを起こさず、DBが既にexact acknowledgedなら同値確定だけ行う。
5. process再起動でregistryが失われた場合、DB closed/未ACKを成功や解放へ推定しない。現 `runtimeOwnership.ts:137–170` の正式predecessor証明とsource heldの照合が揃う回復枝だけを定義する。新runtime・証拠欠測・不一致は保守保持/通常claim拒否。実前任子の起動は本段不要で、注入した正式proof interfaceの保持/拒否対で型分岐を確認し、実回復成功は未検証とする。

この補正はRootが実装前blocking条件として採用した。source専用の有限なACK保存境界で足り、全provider共通の新所有framework/新表を要求しない。既backup/controlに対する変更はsourceHeldの相互集計とunion全分岐に限定する。Drive attempt ACKとinput buffer終了を同一のproofにしない。

## M2: input receiptとproofの有限遷移を固定する

§3は必要な字段を挙げているが、旧owner.closed経路と新receiptの相互優先、proof消費とDB CASの順序、再起動時の不明状態が未確定。現在0042のmemory減少はconsumer closed＋attempt安全だけなので、新stage active/unknownへこの旧経路を無条件ORするとinput終了証拠を迂回できる。以下を明文化すれば追加列1×3の方針で実装可能である。

| 永続状態 | 合法操作/保持条件 |
| --- | --- |
| receipt NULL / memory0 | 未利用/legacy。新予約は現在認可・exact consumer owner/currentを照合し、generation1 activeと50MiBを同Txで保存 |
| receipt NULL / memory50 | 移行前legacy非0。新stageを後付けせず、S1のconsumer closed AND attemptsafeだけで保守回収。新read/generation開始は禁止 |
| receipt active / memory50 | exact consumer kind/id＋consumer runtime/token＋安全整数generationを固定。単一read/準備adapterの管理下。二重read/所有入替/NULL化を拒否 |
| receipt unknown / memory50 | timeoutだけで解放しない。実終了のexact proofが後から揃う場合だけclosedへ。proof欠測/別runtime/別世代は保持 |
| receipt closed / memory0 | proofIdと旧owner/generationを残す。同値完了確認は副作用なし。新予約は現在consumer owner/currentを再検査しgeneration+1、旧proof再用禁止 |

active/unknownはproofIdなし、closedだけ有効proofIdを持つstrict unionとする。NULL/未知shapeの黙示補完、generationの巻戻し・上限超え・owner/token差替えは拒否する。generationはconsumer receipt内で単調、source attempt ordinalとは別物。Drive native attemptのruntime/tokenとconsumer inputのruntime/tokenのnamespaceも区別し、互いのproofを流用しない。

新stageを使った50→0は、同generation/ownerのadapter実終了proof＋全必要attempt安全を確認して `receipt closed + memory0` を同Tx/CASで確定するのが最小。旧consumer.closed経路はreceipt NULLのlegacyに維持する。receipt非NULLのactive/unknownは、consumerだけclosedでも解放しない。新stage closed経路でconsumerがactiveのままの早期解放を許し、consumer unknownでは許さないという案の条件を保つ。これにより旧経路維持と新stage未知保持が矛盾しない。

registryのproofはDB CASより前に破棄しない。CAS不一致/commit失敗なら同じopaque handleを未消費として保持し、新readは開始しない。exact receiptが既にclosed/0なら同値照合後だけ消費する。別世代へ進んだ行へ旧proofで書かない。再起動後はJSONのproofIdだけを実終了証拠として採用せず、旧runtimeの非0を保守保持し、既所有回復でconsumer終了が確認されるまで新予約へ回さない。このsliceで新process回復の成功を要求しない。

redaction/prune/deleteはinput.closedだけで許さない。S1のconsumer terminal/実owner終了/memory0/attempt安全、Driveだけのsource消去、consumed raw結果不変を保持する。source解除時にreceiptを無言NULL化して世代/証拠を捨てない。入力stageの保存は業務receiptのresult/job/recipe/quota/本文を更新する口ではない。

## 実adapter・逐次readと現在性

案の実text範囲は妥当。`node/llm/sourcePreparer.ts:171–183` はpreparationVersion2/3/4を別adapterへ先に分岐し、`:222–296` のversion1だけが今回のworker枝。現在finishはexitだけでresolveし、stdout/stderrはresumeするがend完了を条件にしない。version1の正規結果＋terminate完了/exit＋両pipe endを別に保存する限定変更が必要。message成功後の意図したterminateを自然exitと偽らず、abort/timeoutの安全終了と正常結果を区別する。pipe欠測時の有限close期限を決め、proofは発行しない。

NodeLlmSourceReaderはowned read.close/closedと全量hashを待つがbytes返却後の寿命は所有しない。新serviceがparent inputとworker clone1本を内部に閉じ込め、外部callback/usecaseへraw bytesを逃がさず、adapterが参照を解除した後だけinput proofを作る案でよい。GC時刻の保証は不要。prepared outputの既上限は維持し、新input leaseに全出力所有frameworkを追加しない。

同consumer逐次readは同generation/予約で、前readの実adapter終端・親参照解除後だけ次へ進める。最終finishInputだけが50→0。fence/失権後の次readは拒否するが、既資源の安全releaseまで現在編集権限に依存させて漏らさない。取得はbinding/record exact、記録本人同sub/epoch資格、実行者の現在編集権限を分離し、current folder/head/記録者WS所属を新gateにしない。

refreshは既subscriber契約を再用し、待機中data ownerを持たない。今回の自己HTTP24要求は取得要求の内訳なので、refresh wireも実行するなら同枠内のexact列へ明記する。期限内の有効synthetic資格と純subscriber対だけなら新refresh HTTPを要求しない。新token/Google/OAuth実接続は不要である。

## DDL・exactpaths・資源

案冒頭の基点87055fb7/「S1独立中」は陳腐化している。実装基点は受入済8902b48bとし、F1のSQL3 Drive限定・F2のconsumed4列限定SETを新9trigger/mapperへ維持する。S1の根拠は純40と不変更部分だけ借用し、0043到達の移行/安全条件を直接確認する。「pure50」は誤表記で、旧50は純40＋移行1＋app9、修正候補は直接11＋不変更純40で51である。

0043は新3列と限定9source triggerの置換、新相互claim guardだけ。旧列/versionへのbackfill不要、旧行NULL/非0の保持をmigration試験に含む。旧identity/readyをDROPせず、F1のorigin条件を戻さない。故障3位置（列後・置換後・FK末尾）の旧schema/data/ledger/非変更trigger原子rollbackと、変更9定義の限定差を確認する。0042/0037を書換えない。物理down/FK OFF/rebuildは不要。

§6のexact群はこの縦sliceに概ね必要十分。source用ACK保持のport/execution/runner差はその既予定path内に収められる。型追加に伴う既fixture exact追従は実装前に列挙。runtimeOwnership本体/新DI/通常worker/UI/全purgeへ追加変更が必要になった場合は黙って拡張せずRootへ返す。Node native型・crypto/Worker・registryはadapter、現在認可/保存順はapplication、閉じた値型はdomainの内向き方向を維持する。

7logicalDB144MiB（16+16+3×16+32+32）、helper8/TMP8/local原本4/material0.25の合算164.25MiBはroot192内に収まり、baseline/成功/3故障/application/nativeを分離する理由もある。source/metadataは1KiB中心でselfHTTP24要求/2MiB、text3形式＋取消の計4worker/同時1で代表範囲として妥当。50MiB全量転送/576MiB実RSS/実PDF/実machineの成功は未検証に残す。余枠を失敗再実行へ転用しない。

実行前には各DB・caseのfinite phase、HTTP exact要求列（現在の内訳は合計24）、worker4の割当、各case/外側/通常closeの期限を数字で固定する。既SQL-only legacy/owner/ACK/再起動拒否と制御fakeはHTTP/workerを消費しない組へ置き、24/4の予算で既成功を反復しない。未知close/期限超過で結果を成功にせず、全自己終了→DBclose→子/pipe終了を区分し保全する。今は資源を作成していない。

## 後続と返却

M1/M2を計画へ反映・採用後、この小integrationを実装開始できる。通常LLM/PDFへのlease接続、PDF逐次再読/ready解放、machine parser/body lock、取消/impact/pin/prune/purge全入口、final-check後本文CAS/undo、通常quota/dispatch、UI/同bundle/実Googleは本段後の未完を保持する。大量kernelのみの先行完了や、このsliceを全再生成完成とする扱いは不可。

本文に挙げた補正以外の一般化機能/新gateは要求しない。公開静的確認だけを完了し、報告固定・EOF確認後は文書を含む全read/writeを停止してRootへ返却する。実装/0043予約/実行へ自動移行しない。

EOF
