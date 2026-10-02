# P3a 独立受入準備

2026-09-10T15:40:58+09:00。文書準備のみ。P3a-A〜Fの全観測は未実行であり、実装・移行・動作の合否は未判定。正式固定候補の委譲後に実行する。

正本は [plan P3a](../plan.md#p3a-ワークスペース作成とscope基盤)、[design](../design.md#p3-の所有と容量の接続条件)、[P3接続契約と末尾具体化](../phases/P3-contract.md)、[既存P3準備](P3-prep.md)。元の条件は [WS-01/02/05/06](../../spec/scenario/workspace.md)、[OR-01/11](../../spec/scenario/organize.md)、[ED-01〜11](../../spec/scenario/editing.md)、[IM共通前提/01〜05](../../spec/scenario/import.md)、[JB-01〜03](../../spec/scenario/jobs.md)、[AC-10部分](../../spec/scenario/account.md)。goal-implement/manager-loopの条件の出所、spec-manual-testの正常/異常対、markdown-styleの表構造を使い、この文書だけを作成した。

## 今回の境界

- ownerによる本体UIと、owner/editor/viewer/非memberの実UoW・隔離DB/HTTP相当契約を分ける。roleを設定したfixtureは招待・role管理UI成功の証拠ではない。
- Q1は採用済み。membership由来のprivate read/editだけを扱い、元member blacklistや公開URLからapp権限への昇格を作らない。公開/リンクの独立認可はP4で接続する。
- Q2/Q3も採用済み。5×1024³/20×1024³ bytesとscope別論理chargeを期待値に使う。移動先超過拒否・移管集合は後続移動の契約で、P3aに移動UIや旧writer移動raceの成功を要求しない。
- P3aでQ3のscope保持・最後関係・cleanup chargeを隔離DBで確認する。正当な関係のfixtureを任意client bundle IDで関係を作る製品APIへ置き換えない。
- 招待/参加/role変更/除名/脱退の実UIと最後owner管理、全文検索/タグ/月/三一覧/任意sort、移動/500選択、WS削除、P4/P5は未接続のまま。WS-01の招待導線とOR-01の後続表示部分、AC-10全設定画面/LLM枠をP3a合格へ読み替えない。

## 正式確認前の保全と最小fixture

受領時にImplementer停止・環境単独所有・候補source/HEAD/lock/bundleを照合し、新online backupを取る。現在の変更中sourceを準備段階で調査しない。

前フェーズの受入値は [P2d-3独立報告](P2d-3.md) の513notes/64assets/847revisions/snapshot117、nonactive11、未回収purge/writer/active/display pending0。既存502noteだけでなく、前回の取消11noteと原本385Bも全て旧保全対象とする。旧428objectsに取消11原本を加えた集合を候補のmanifestと開始backupから照合する。今回まだ再集計しておらず、現在の総objects数を断定しない。

正式検証でのみ、独立本人Aと新WS W1/W2、新個人note Pを作る。owner B/editor C/viewer D/非member Xは隔離DBの正当なmembershipで用意する。UIの失効回収を要する場合も、正式委譲で許された新自己noteに限定したfixture操作を使い、既存noteや実認証情報を変更しない。

最小入力は短いHTML/MD/text、既存固定の小PNG/MP4、HTML＋CSS＋正常SVGの小bundleを派生利用する。fixtureはこの準備では作らない。役割・上限・同時刻51件・20WS・90日/期限・容量境界は隔離metadata/clockで足り、productionへ20GiBや大量WSを作らない。

## 観測matrix

各行はplanの完了条件を小さい対に分解したもの。全行の実行状態は未実行。

| 群 / 完了ID・出所 | 正常の操作と期待 | 拒否・競合の対 | 最低限の証拠 |
| --- | --- | --- | --- |
| A1 / P3a-A、WS-01/02 | 個人のscope token→作成。名前「検証 W1」、説明、slugを入力→非公開W1・自分owner、現在scope名とURLがW1になる。個人/W1/W2切替→reload/再訪して同scopeへ | 参加WS0では個人＋作成。作成通信失敗で名前/説明/slug保持・理由と再試行。URLの非member/削除WSはアクセス不可案内と個人への回復。cookie/端末設定欠落だけで個人新規を他WSに保存しない | owner実UI、作成UoWのWSとmembership同時成立、URL/reload。招待導線はP3b未完として表示を評価 |
| A2 / P3a-A、WS-01、design入力 | trim後1/100 code point名、0/2000説明、slug空null/3/63文字、表示された小文字化を許可。現存creator WS19→20成功、参加数は作成数と別 | 空/空白名、101/2001、slug2/64・端hyphen/非ASCII/予約語完全一致拒否。予約語を含むだけの有効文字列は不当に拒否しない。同slug競合は1件だけ成立、19件から同時2作成は上限超過を残さない。空き照会旧success/failureと保存競合を区別 | VO/transport・実DB。300ms/毎分60/最新応答だけは採用運用値の境界で確認。UI重複検出と代替候補はWS-01原文、空き照会失敗を利用可能としない |
| B1 / P3a-B、OR-01/WS-02 | 個人/W1/W2に同名noteを置き、scope別更新順metadata一覧/空状態の作成・upload導線。51同時刻noteを50＋1で重複欠落なく読む。scope chooserも参加数20で打ち切らない | 異scope cursor、上限超page、不正cursorを拒否。A一覧待ち→B切替→旧A成功/失敗解放でB一覧・scope・errorを上書きしない。読取時失効/削除scopeは本文や件数を漏らさず回復。空と通信失敗を混同しない | keyset実DBとowner実UIの切替/続き/再試行、metadata DTO、skeleton。検索・タグ・月はこの行で作らない |
| C1 / P3a-C、ED-01〜08、V5/C2/C3接続 | W1新規白紙は無入力離脱でnote0。title先行保存中に本文追記→同ID最新版。三modeの短い編集→保存/reload。媒体だけも同asset・stable URL。取消/明示破棄で保存状態へ戻る | 作成応答受領後の入力中にscopeを切替えても受付W1を個人/W2へ付替えない。保存失敗→reload→同ID/latest mode・origin必要hintを回収。modeの遅い旧応答や失効で最新input/backupを捨てない | owner実UI、note scope/creator/ID/HTML・revision/backup整合。V5/破棄/modeの既存helperを派生し、全PM/全DOM方式は再試験しない |
| C2 / P3a-C、IM-01〜05/JB-01〜03 | W1へ短い通常原本＋HTML/同梱CSS/SVGのimport。on/off・off→on、原本名/bytes、本文/参照台帳、current/history媒体・表示styleを再訪で利用。同bundle2noteの役割と取り込み済み兄弟保持 | upload受付後に表示scope変更しても投入先固定。途中失効では未受理兄弟や遅い結果を勝手に他scopeへ受理せず、既に受理した正常兄弟を巻き戻さない。任意scope/bundle/draft IDで越境しない | owner実UIのimport→job→detail、実UoWのscopeとrequestedBy、原本/asset hash。外部URLは旧safe fetch契約を保持し全SSRF/codec再証明をしない |
| D1 / P3a-D、WS-05/06/OR-11、現在policy risk | owner/editorは編集、viewerはactive note読取。作者でないeditorも同note確定mediaを正当に利用。current/historyの正確なref/pinがある媒体・原本を現在権限で取得 | viewerのsave/style/restore/trash拒否、非member/失効memberの一覧/detail/preview/current/history/original拒否。GET/HEAD/Rangeは認可を先にし、無権限に416で存在を漏らさない。stagingは他editorにも非公開、committed旧draftはcurrent refを迂回しない | 隔離DB＋本物UoW/HTTP相当handler、UIはowner正常線。job実行者/asset容量ownerを閲覧者と同一視しない。viewerのtrash readはED-10どおり拒否 |
| D2 / P3a-D、ED-08/C1、採用worker risk | AとCが同noteを保存。他actor変更のexact-current確認→成立、同actor更新は既存後勝ち。WS内でも元actor/job履歴を保持 | 確認後さらに別actor更新なら再確認。claim後やDNS等I/O待ち中の編集権限失効・note状態/version/lease/generation変化で遅い結果不採用。ownerが存続しているだけで元依頼者の失効を補わない。失効拒否でも最新title/html/mode/originとdownloadを回収 | 多role実UoW、遅いconversion/reference/display対。回収は小さい実editor対または既存UI合格＋今回の実serialized拒否を明確に分離。実role管理UI成功とはしない |
| E1 / P3a-E、IM容量/AC-10部分、Q3 | 個人5GiB/W120GiBで原本・asset・参照・同梱・猶予・予約・回収待ちを別計数。W1に同bundle2noteなら素材全量1回、生成assetは別加算。受付charge→最初の保持chargeで増殖なし | 上限一致/1B超過、同scope同時upload予約の競合、safe変換後bytes増加を照合。途中失敗で既成功保持、failed/unbound/sealed/cleanupを無料にしない。個人が満杯でも余裕のあるW1を人物共通5GiBで拒否しない | 正規予約port/実UoW＋小storage、UI保存先/GiB/予約含む量/80%ちょうどと超過/更新時刻。表示集計の遅延と受理判定の正確さを分離 |
| E2 / P3a-E、Q3/IM保持、ED-10 | 正当なbundle関係をW1/W2へ隔離DBで用意し各scope全量1回。W1最後関係解除でもW2の素材を保持、全scope最後だけcleanup charge→実削除後解放 | 同scope複数note/off/失敗関係を現在img URLだけで落とさない。最後解除と再保持/削除失敗は既存一意claimの安全範囲で対にする。uploaderを別人物にしてもWS保持を失わない。任意client markerで他scope素材へ権限を作らない | Q3の型/集計/最後関係の隔離DBと小object。scope移動/WS削除/退会の実commandは後続。disk bytesと全scope charge合計が異なる理由を記録 |
| E3 / P3a-E、ED-09/10/JB-01〜03 | ownerのW1 note trash→直後undo→trash/reload→期限内restoreを実UI。単一purgeと小emptyはscope限定で実回収。元import結果・本人job・他memberのnoteを混同しない | viewer/非memberのtrash一覧/操作拒否。W2/個人をemptyへ混入しない。scope切替中の旧一覧/receipt/poll応答を拒否。失敗中charge保持→回復後解放。system期限はsessionなしで現在期限/lifecycle/fence確認、creator/ownerの人物jobへ偽装しない | owner実UI＋期限境界/競合/typed initiatorの隔離DB。親子50/51/501やFD全負荷は旧P2d受入を保持し、scopeとactorが変わった枝だけ再確認 |
| F1 / P3a-F、移行risk/CLAUDE.md | 新backup→新clone migration、全旧列/版/pin/原本key/hashと個人容量を照合。新creatorは実行者、裏付け不足の旧creatorはunknown/作成者不明で閲覧できる | owner/最新actor/uploaderを無条件に過去creatorへ補完しない。unknownを退会済みに偽装しない。新scope行と旧行の重複加算、失敗/未bind/cleanup charge脱落を拒否条件にする | migration前後差分と新列の明示backfill根拠、規定checks/同固定bundle/明示commit。全旧個人行と前回取消11を保全 |

## 優先実行順と合否の最低証拠

1. F1の開始保全・clone移行とA2/D1/E1の実UoW境界を先に確認する。scope認可やquotaが不成立なら危険な本体破壊操作へ進まない。
2. A1→B1→C1/C2のowner実UIを一本の新WSで通す。各段階で保存先/ID/actor/本文とUI状態を照合する。390pxとkeyboardは作成・scope切替・保存・trashの代表操作へ重ねる。
3. D1/D2で現在role、stagingと確定media、本人job、遅いworker/保存競合を確認する。多roleの実UI未接続を隠さない。
4. E1/E2/E3で容量・保持・lifecycleを小fixtureへ適用する。Q3跨scopeは隔離DB、ownerによるWS trash/purge/emptyは本体という証拠の違いを記録する。
5. 最終旧保全/容量/固定値と自己操作終了を揃える。IDごとに独立実行・借用・未確認を区別し、対象6の結果と変更した先行条件だけを返す。

fixtureは未知の実データを使わず、故障注入・消去は正式検証で新作した自己対象だけ。旧データの権限変更、原本の破壊、OS時刻変更、大量production作成を標準手順にしない。

## 先行合格への限定適用

| 変更される責務 | 再確認する接続 | 保持する既存根拠 |
| --- | --- | --- |
| scope read/saveとactor | P1-B/C/D、C1保存/復元、C2-D/E、C3-C/D/E/Fの現在認可・同ID/退避 | 全三mode入力方式、VG/GV、PM性能、20版数そのもの |
| media/original/reference quota | P2a-B/D/F、P2b-A/B/C、C1履歴媒体のscope・exact ref/pin・作者限定draft | codec全形式、safe fetch/CSS解析、sandbox方式、Range parser自体 |
| conversion/reference/display | 元依頼者の現在権限、scope/lease/version、初回確定/手動優先、本人job | parser admissionや初回style判定全組合せ |
| trash/purge/empty | P2d-1〜3のscope固定/現在認可/typed initiator/charge/履歴readとticker | 一意physical claim、writer drain、FD pool、全親子件数境界・長期回復方式 |
| migration/query/runtime | P1-D/E、P2a-E、旧列/容量/objects/通知/起動、親pending/error | 不変な全runtime/全プラットフォームの再配備試験 |

正式候補の変更manifestで影響の有無を確定する。上表のIDを文書準備だけで再openしたり、無変更の全量試験を要求したりしない。

## 省略と残条件

現時点で採用Q1/Q2/Q3と原文の新しい矛盾は見つけていない。契約案に残る「未採用」は過去案の表記であり、現在designで採用された入力/運用値を優先する。

WS-01の重複slug時の代替候補は原文にある一方、P3a補足の表では空き照会/一意制約ほど明示されていない。A2で確認対象として残す。これは新機能の創作ではない。もし今回省略する判断なら、WS-01の未完導線としてManagerが後続へ明示分離する必要があるが、この準備だけで現製品を不合格としない。

招待/role実UI、最後ownerの変更競合、WS全体削除、検索/移動/一括、公開/限定URL、退会後の実保持、Drive/実メール/LLM接続は後続。P3aのscope・quota型だけでそれらの完了を主張しない。

入力/境界/特殊文字はA2、認証/権限はA1/D1/D2/E3、空/初期はA1/B1/C1、重複/競合はA2/B1/D2/E1/E2、削除/変更波及はD2/E2/E3、離脱/取消はC1/E3、通信/pending/retryはA1/B1/C1/C2/E3へ対応する。採用値以外の上限や新SLOは追加しない。

本書以外は書き込んでいない。製品source・DB・browser・process・依存・test・build・hash・git・固定tempは調査も操作もしていない。全fixture未作成、全観測未実行のまま提出し、正式候補の委譲まで停止する。
