# C1-P1 CAPTURE-REENTRY1: Tx invocation 単位の capture

2026-10-06。新補正文書だけを固定する設計 delta。SOURCE／helper／既 completion-plan・fields・capture／レビューは不変更。既 scope12SOURCE/3tests の候補実装に先立つ再入契約であり、runtime／native／DB／tests／default／root probe・作成／Git／source import／全旧 private 操作は0。LLM 提供可能性、native closure、proof/ACK 成功、UI/P5d 全受入を主張しない。

## 根拠と差分

直接 stable fullread した PUBLIC2 は、reviews/P5c-3-drive-llm-c1-completion-capture.md 11820B/SHA256 6364bc1844b5ae97531d2bfa3650b1c23eed461ff473c4a90cfdb43746a962b6 と phases/P5c-3-drive-llm-c1-completion-capture.md 22900B/9e2fb4f53219440678d5669aceec417d589633edff5f4848a8b08ef3f73d089f。各 canonical regular/nonlink0600/UID501/nlink1/O_NOFOLLOW、path/FD 前後 dev/ino/mode/UID/nlink/bytes/mtime/ctime一致、full SHA、実 FDclose を確認した。

CAPTURE-REENTRY1 の差戻し対象は、record一回を pending entry 全体に適用すると、正規 exact rollback 確認後の同 callback 再入も拒否してしまう点である。旧文書の FIRSTWRITE 前 prewrite と terminal-call の分離、元 write 順、failure fail後/scrub前 quota入力、型 unknown排除は既限定 static PASS を借用する。新案は一回の単位と遷移だけを置換する。元 SOURCE14/135814B/fullSHA/Gitblob と固定 C0 176ea15b572c610e97f99a021ea94e2ba60637c7 は上記二文書の証跡を借用し、今回 SOURCE 実物を再読しない。

採用する方式は **同じ元UoW callbackの一回の Tx invocation ごと record1**。旧 attempt が未確定のまま recordを reset／update する方式や、旧 expected を新 observed に合わせる方式は採らない。新 domain port/proof brand/DDL/storage codec/Native capability は不要という設計方向で、実際の既12SOURCEへの型実装は独立レビュー・候補 typecheck で確定する。

## 保持する単位

- pending completion は元 job/lease、genuine proof、same consumed(proof,lease)、元 withOwner callback/awaiter、生成済み immutable outcome、body/projection closure、原 saved-closure/voidACK の状態を保持する。これらの参照は再入で clone／置換／再発行しない。private data snapshot の一致から能力を作らない。
- invocation は同原 terminal callback を **一つの原 UoW Tx context に一回呼ぶ区間**。別 Tx へ移るときは新 invocation。単なる polling/read確認や callback内の sibling write は invocation を増やさない。
- attempt record はその invocation に束縛した prewrite + terminal-call の readonly data。一回の記録後は immutable。元 callbackが FIRSTWRITE 前 currentを拒否して terminal-call に達しなければ record0であり、正常 completion recordを捏造しない。
- 原 callback は再入時も同じ関数参照と閉じた immutable job/outcome/body入力を使う。UoW が渡す新 Tx と invocation-local recorder だけが次呼出の値になる。新 callbackを作って元 outcomeを observed saved data に合わせない。

invocation の区別は工具・private completion内部の普通の local object/reference bookkeeping であり、外部へ送る nonce/ID、native proof、新 public brandではない。recorder は生成された invocationの元 Tx にだけ結び付ける。未確定 recordを外部 callerから resetする API は作らない。同callbackとTxの同一性は型引数だけを信じて guessed boolean へ落とさず、元 callsite の private 参照に束縛する。

## 型状態例

以下は設計用の局所型。原 domain/port型の追加を意味せず、private coordinator 内で違法遷移を分ける例である。既 DriveLlmPrewrite／DriveLlmTerminalCall は旧 capture の明示data copy型を使い、unknown object/getter/constructor/toSerialized を実行しない。

```ts
type RecordedAttempt = Readonly<{
  prewrite: DriveLlmPrewrite;
  terminalCall: DriveLlmTerminalCall;
}>;

type InvocationState =
  | Readonly<{ phase: "before-record" }>
  | Readonly<{ phase: "recorded"; record: RecordedAttempt }>
  | Readonly<{ phase: "returned"; record: RecordedAttempt }>
  | Readonly<{ phase: "response-unknown"; record: RecordedAttempt }>
  | Readonly<{ phase: "unrecorded-unknown" }>;

type PendingState =
  | Readonly<{ phase: "invoking"; invocation: InvocationState }>
  | Readonly<{ phase: "confirming"; record: RecordedAttempt }>
  | Readonly<{ phase: "rollback-confirmed"; record: RecordedAttempt }>
  | Readonly<{ phase: "saved-confirmed"; record: RecordedAttempt }>
  | Readonly<{ phase: "held"; record: RecordedAttempt | null }>;

type RecordAttempt = (record: RecordedAttempt) => void;
```

これらは callback本体を再生成するための interface ではない。既 typed Tx recorder を使う実装位置で、recorder閉包が保持する invocation state を一度だけ before-record→recorded に移す。二回目、別Tx、別callback、完了済/失効invocationからの遅延callは拒否してheld。recordはvoidで commit/result/proof を返さない。normal successを booleanで返す新protocolを足さない。

`rollback-confirmed` は retry permitを外部に発行する型ではない。原 read-confirm callbackが **同record全prewrite／同CAS版／元 atomic predicate** の一致を確定した内部状態のみ。この状態から新 invocationへ移るコードだけが old record を active comparison slotから外せる。old expected を変更する操作はない。unrecorded-unknown はterminal recordを後から作れずheld。既known FIRSTWRITE前 current拒否はこのunknownに潰さず元failure経路へ進める。

実装で recordを close overする元 callback型に recorder引数を渡す場合、その callbackは最初の作成時に固定し以後同じ参照を使う。元 Tx callbackのthis/args/outcomeとcompleteLlmの元 args/result/Promise意味を保持する。原 withOwner/worker finallyは coordinatorが人工deferred resolveを実行しただけでは閉鎖扱いせず、既同awaiter正常returnから自然に進む。

## invocationごとの二時点・clock

invocation N は同Tx current/final fence後、**FIRSTWRITE前** に6領域の明示prewriteを一回captureする。LLM全data/generic全data/dispatch全data/reservation全data/Original全data/sourcebinding全dataを元Txから固定する。successは旧 worker533 commitNote前、failureは628 dispatch.fail前。source/static根拠のない列や versionを作らない。

同invocationが元 completeLlm 呼出点に達したときだけ、そこで **元 container.clock.now() 一回** を取得する。同じ元Date/argsをcompleteLlmへ渡し、その epochMs と実base/outcome/原release入力をterminal-callに固定し record1。そのclockをprewrite/prepareへ前倒ししない。failureのdispatchはfail後/scrub前であり、prewriteと混同しない。

原success write順は body→Original→notices→terminal-call/completeLlm、原failureは dispatch.fail→closed/cancel/delivery判定→terminal-call/completeLlm。completeLlm の元LLM CAS/generic terminal→releaseUnsent→scrub→Original非success復元の順も保持する。local/PDFには新capture/read/retry/clock変更を入れない。

rollback-confirm後の invocation N+1 では、**その新Tx** の原 FIRSTWRITE 前prewriteを取得し、**その新原 completeLlm 呼出時点** のnowを一回取得する。NのclockをN+1の元callへ流用しない。原callbackのimmutable job/outcome/bodyは同じでも、再Txの資格/currentと元clockは新呼出の値である。Nのexpectedは既にrollback-confirm済みであり、N+1の期待に更新せず別recordとする。過去attemptを無限historyに保持せず、既private2/livependingとholdingbytesの未採用予算内でactive recordを切替える設計とし、最大retry回数/保持量/runtimeは候補段階で別Root採用が必要。

clockが複数回進んで値を合わせる、readback updatedAtからnowを逆算する、末尾に今のclockを足して旧expectedを修正する操作は禁止。terminal-call未到達ならそのclock/expectedも未取得のままである。

## state table

|現在状態と原観測|次状態／許可|禁止・保持|
|---|---|---|
|初回invocation、FIRSTWRITE前全capture成立|before-recordで元callback進行|fake closed/proof、preparedからclock前倒し0|
|同invocation terminal-call到達|record1→recorded、同元completeLlm呼出|同invocation二回recordは拒否。既record上書き0|
|元UoW正常return|returned→元completion continuation/finally|再callback/write/ACK/consume0。returnだけでnative closure推定0|
|record後、元Tx結果不明|response-unknown→confirming同record|old prewrite/terminal/now不変、新invocation/時計取得0|
|readonly同Tx確認がexact saved terminal + 同consumed proof/lease|saved-confirmed→同元awaiterに確認結果を届ける|生成/project/body/Original/ACK/consume/callback再演0|
|全6prewrite＋元CAS/atomic predicate exact一致|rollback-confirmed|LLMだけ一致、部分row、absence、別version、readerrorはこの状態にしない|
|rollback-confirmed、再用開始|同originalcallback/job/lease/proof/outcome/bodyの新invocation|old record自体変更0。previousunknown時の無条件reset0|
|readがterminal/prewriteいずれにも完全一致しない|held又は既recover-onlyで同record再確認|observedからexpected更新0、newclock/callback/claim/ACK0|
|capture途中error又はrecord前write errorで閉鎖/rollback不明|unrecorded-unknown/held|あとからterminalrecord合成0、ordinaryreject→native資源release合成0|
|旧attempt exactrollback後、次success callbackのcurrentがFIRSTWRITE前known拒否|原failure handlerの別Tx invocation|旧successrecord/outcomeを書換えてfailure期待にしない|
|同invocation duplicate/reentrant recorder/異Tx call|held、元拒否/未知境界保持|二回目をsameだから成功にしない|
|stop中latepending/応答unknown|既Drive timer1のrecover-only、原stopPromise待機/拒否保持|newclaim/generate/project/newlease/proof/ACK追加0|

exact saved terminal は旧 capture の predicateを保持する。immutable LLM/source/job identity、terminal base.version+1、同runtime/token/closed receipt、原outcome/noteVersion、now、generic終端/leaseNULL、dispatch scrub/release入力、quotaを原期待から確認する。terminal後の current edit/cancel/credential差で旧bodyを再採用したり、保存済commitをrollbackと分類し直したりしない。

rollbackは全prewrite＋元Tx/CAS/atomic契約から確定する。unknown rejectionやtimeoutだけをrollback証拠にしない。sourceBinding／Originalを含む合法な外部変更で一致しない場合もheld。現 observedにrebasingして再入はしない。原 proof/caller/lease/consume/readconfirm の条件は data-only状態型とは別に全て維持する。

## rollback後current拒否と原failure

例: success N が記録後応答不明。全prewrite exactrollbackを確認して N+1 に同元callback再入。新原 currentguardが資格/取消/期限/source epoch/versionの既known codeでFIRSTWRITE前拒否したときは、原workerのfailure handlerが同withOwner内で進む。Nのsuccess outcome/bodyclosureは不変の履歴で、N+1にbody採用はない。failure Txは同job/ownerの元判定に従って自己のFIRSTWRITE前prewriteとterminal-call/outcome/clockを持つ別invocationとしてrecord1する。

failure outcomeは元cancel優先とdelivery分類から作る。old success expectedをfailureへ書換えない。closed deliveryunknownはkindunknown、failed.codeからOWNERSHIP_UNKNOWN/DELIVERY_UNKNOWN双方を除外、native/read/voidACKunknown/closed=falseはheld。取消後のfailure保存にsuccessのactive資格を再要求しない。旧successの未commit確定前にはこのfailure移行を許さない。

failure invocation自体のcommit応答不明も、そのrecordのexact saved/全prewrite確認に従う。再入が原currentguardのknown拒否か未知DBerrorかは原 source classificationを保持し、broadcatchで成功/failure保存へ変換しない。失敗のnormal-returnをnative ownership releaseのproofに使わない。

## 意味ある論理対（準備だけ、未実装・未実行）

|対|正方向の有限期待|負方向|
|---|---|---|
|record N→exactrollback→同callback N+1|callback参照/job/proof/lease/body/outcome同一、原Txは別、record各1、新元clock各complete点で1、N期待不変更。正常原return後finally自然終了|pending全体record1でN+1を拒否する旧案、又はrollback未知でresetする案|
|同invocationのduplicate|record1だけ正常|同Tx/callbackでも二回目は拒否、expected/now不変|
|readunknown|同record固定でrecover-only、nextcallback/clock/record0|mismatch値を使って旧terminal期待/updatedAt/baseを補正|
|commitresponse-loss savedconfirm|原completion continuation1、callback/write/project/ACK追加0|savedcommitをprewriteからretryして二重本文・二回consume|
|rollback後knowncurrent拒否|success bodywrite0→原failure別invocation、failureprewriteはdispatch.fail前、failure時計はその原complete点1|oldsuccess expectedをfailureへ上書き、取消currentを再active化|
|fail not-sent quota例|N prewrite=intent/consumed、terminal-call=not-sent/consumed、saved期待=released。rollbackなら旧intent/consumed確認後のみN+1|fail後not-sentをrollback-beforeとして利用、intentからterminalquota維持を計算|
|success body例|Original processing/response全prewriteとready/scrubbed savedを分離。次invocationのsamebodyは元CAS/currentでだけ保存|post-body Originalをprewrite、read noteVersionを元outcomeへ逆注入|
|invocation境界の遅延call|active invocationの原Tx-local recorderだけ利用|終了済recorderをN+1 recordとして利用、異callback/lease/proofclone|

これらは既 driveRequest.test.ts／inputStage.test.ts／driveRegeneration.integration.test.ts の採用3test内でtyped data/current/orderを検査する候補。論理モックのsaved/rollback判定を genuine private proof/Driver commit/native閉鎖の正例にしない。元withOwner callback自然終端とstop recover-onlyのSOURCEテストは候補実装で確認する。native actual/DB応答損失/holdingbytes/private2/runtimecasesは別有限scopeが必要であり、現在未許可。

## 残条件と固定

今回の補正はrecord一回の単位と確定後遷移の設計を閉じるもの。明示data fieldcopy、Tx-local recorder/source APIの最終型、exactterminal/allprewrite predicateの原repo query、oldattempt→newinvocationのprivate保持量、sameawaiterの通知位置、原knowncurrent rejectionのnarrowing、duplicate errorの元error境界、retry/case/runtime boundsは実装候補で固定する。新port/path/native能力が必要なら編集前Rootへexact提案する。未知のまま型cast／observedexpected／新prooffactory／schema追加で成立させない。

元12SOURCE/3tests以外の編集、SOURCEや工具実装、wholechecks、runtimeをこの文書で許可しない。旧completion文書2+capture/reviewsはimmutable、main/S5/P5d/UI/helper/Manager不変更。新phaseはwx0600/fsync/実FDclose/postread fullstable SHAで固定し、固定後ALL SOURCE/helper/Git/private/runtime/reader/writer STOP。別Verifierの独立設計レビューへ返す。
