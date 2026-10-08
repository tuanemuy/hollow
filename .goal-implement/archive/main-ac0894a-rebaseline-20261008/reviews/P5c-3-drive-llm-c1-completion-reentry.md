# C1 completion reentry correction independent review

固定 2026-10-06T13:29:48.362129+00:00。判定 **LIMITED STATIC PASS / CAPTURE-REENTRY1 補正**。record1をpending entry全体から原Tx callbackの一invocationへ限定し、全prewrite exactrollback確認後だけ新invocationを許す契約は、前回の再入矛盾を解消する。候補SOURCEの型実装・DB/native正例・LLM/UI提供可能性は未検証であり、この文書を全C1/S5受入へ転用しない。

## 独立scopeと直接入力

私は原C1-P1方向及び旧CAPTURE-REENTRY1差戻しレビューの作者。新reentry補正文書の作成には参加していない。独立判定はrecord単位・old expected保持・確定後再入・元clockの補正deltaだけ。FIRSTWRITE位置、terminal-call分離、write-set、proof/ACK/withOwner、Drive-only timer方向の根拠は既レビュー借用。SOURCE14の再読・Git・追加source探索は0。

PUBLIC3をcanonical regular/nonlink0600/selfUID/nlink1でO_NOFOLLOW全文読取した。path/FD前後dev/ino/mode/UID/nlink/bytes/mtime/ctime一致、実FDcloseと全SHAを直接確認した。

| 入力 | Bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-3-drive-llm-c1-completion-reentry.md | 15711 | 4ae0ba74b4f16944437e57f100fdba2bddc8b12db44efc3d2bd1685cabebb019 |
| reviews/P5c-3-drive-llm-c1-completion-capture.md | 11820 | 6364bc1844b5ae97531d2bfa3650b1c23eed461ff473c4a90cfdb43746a962b6 |
| phases/P5c-3-drive-llm-c1-completion-capture.md | 22900 | 9e2fb4f53219440678d5669aceec417d589633edff5f4848a8b08ef3f73d089f |

## 個別判定

| 条件 | 判定 | 根拠と限界 |
| --- | --- | --- |
| recordの一回単位 | STATIC PASS | invocationは一原Txへの一原callback呼出。sibling write/polling/readで増やさず、Tx-local recorderがbefore-recordからrecordedへ一度だけ遷移する。同pendingのN+1をentry-global onceで拒否する旧矛盾を除去 |
| unknown中のexpected保持 | STATIC PASS | response-unknown/confirmingは旧prewrite・terminal・nowをimmutable保持。全6領域＋原CAS/atomic predicateのexactrollback前にreset、新clock、newcallback、expected rebasingを許さない。absence/部分一致/readerrorはheld |
| rollback確認後の再入 | STATIC PASS | 同原callback/job/proof/lease/body/outcomeを保持し、新原Tx/local recorderだけ切替える。old recordを書換えずN+1別record。rollback permitを外部能力にしない |
| 元clockと取得順 | STATIC PASS | 各invocationのFIRSTWRITE前prewriteと、元completeLlm点now一回を分離。同元Date/argsを原completeへ渡す。NのclockをN+1へ流用せず、readback updatedAtから逆算しない。terminal-call未到達はrecord0/clock未取得 |
| exactsaved commit | STATIC PASS | 同recordのsaved terminalと同consumed proof/lease確認後だけ同awaiterへ結果を届ける。body/project/write/ACK/consume/callback再演0。terminal後current変更で旧body再採用しない |
| rollback後knowncurrent拒否 | STATIC PASS | 旧success未commit確定後、新current guardがFIRSTWRITE前known拒否なら原failure handlerの別Tx invocationへ進む。旧success expectedをfailureへ更新しない。failure自身のprewriteはdispatch.fail前、terminal入力はfail後/scrub前で元cancel/delivery分類を維持 |
| 不正recorder・不足record | STATIC PASS | duplicate/late/異Tx/異callback/終了済invocationは拒否held。同じ値を二度記録したことを正常化しない。record前write/read不明はunrecorded-unknownでterminal expected後生成0 |
| 原資源寿命・停止 | BORROWED + delta整合 | 原withOwner/awaiter/proof原参照を保持し、data recorderはvoidでcommit/proof/Booleanを返さない。原finallyへ自然に進む条件とDrive timer1 recover-only、stop拒否/firsterror保持を変更しない。実callback/nativeclosure/ACK成立は未検証 |

正負机上対では、N record→応答不明中はN+1禁止、exactrollback→N+1 record各1を許可、savedconfirm→再callback0、duplicate/異Tx/lateはheldとなる。N+1のcurrent既知拒否は本文write0のまま原failureの独立invocationへ移る。failure前intent/consumedとfail後not-sent/consumedを分けるため、rollbackは旧intent、terminalはreleasedという元quota期待を維持できる。closed deliveryunknown/ownershipunknown/read/ACK不足を通常failed又は正常releaseへ変換する補正はない。これらは文書遷移の静的評価であり、実値・実DBrollback・private proofの監督receiptではない。

## 候補実装へ残るgate

今回deltaに具体的な設計blockerは残らない。元12SOURCE/3tests内で、明示field copy・Tx-local参照束縛・原全prewrite/exactterminal query・同awaiter通知位置・knowncurrent拒否の型narrowing・duplicateの元error境界を実装候補として固定する必要がある。例示PendingState/InvocationStateはprivate coordinatorの設計例であり、現SOURCEに実装済み又は既port型として型check済みではない。

private2の保持bytes、active record切替、retry回数/時間/case上限は未確定。これは文書の一回単位を再度FAILにする理由ではないが、無限retry/無制限保持を許可する根拠にもならない。有限候補予算をRoot別採用してから工具/actualへ進む。old record未知中の破棄、新public能力、別proof/clone、possible quota返却、local/PDF時計・順序の変更は許可しない。新path/API/DDLが必要なら編集前exact提案が必要。

既3testsに準備予定のrecord N/N+1、unknown保持、savedcommit再演0、rollback後knowncurrent拒否、duplicate/late対は未実装・未実行。論理mock/codec対をgenuine commit/native/proof/ACK正例にしない。SOURCE/runtimeの発生を推測せず、旧FAILは旧案の根拠として保持する。

## 保全・停止

新reviewだけwx0600/O_EXCL/O_NOFOLLOW/fsync/実FDclose/postread fullstableで固定。元3文書、SOURCE/main/helper/Manager/goalは変更0。default/preflight/import/test/DB/native/browser/runtime/rootprobe/create及び成功失敗を含む全private/root/log/cache/TMP/key/proof操作0。全reader/writer STOP、session0。次候補実装の採用とactualの許可はRootが別判断する。
