# P2c-2 V1 モード要求世代の修正準備

2026-09-06 17:43:07 JST 完了時計。固定候補のread-only調査。正式レビューと環境返却前の修正案であり、コード・試験・browser・DB・processは無操作。実修正はManagerの別途委譲で開始する。

## 確認した根拠

独立再現はManagerから受領した値。WYSからvisual要求のrender応答を747.7msで保留し、HTML選択・CodeMirror表示が1503.4ms、旧visual応答解放1514.7ms、2146msでvisualへ戻る。本文不変のclean操作。これらは本作業の再実行値ではない。

`NoteEditor.tsx` の `changeMode` はrenderとWorker projectをawaitするが、採用条件は本文同値とcompositionだけである。後からHTMLを選んでも本文が同じなら、古いvisual要求が`setMode`、`currentMode`、入力hostのstate reset、error clear、device既定書込みへ進む。`requestMode` のcatchも無条件でmodeNoticeを書き換える。現`finally`は要求固有analyzerをdisposeするだけであり、共有busy解除の誤りが実在するとまでは確認していない。

`requestMode` の先頭に `next === mode` の早期returnがある。現在WYSのままvisual待ち中にWYSを選び直しても、古い要求は失効しない。この枝はコード上同じ欠落を持つが、独立の実再現は未実施。

入力の世代・同値比較は、準備した本文を採用してよいかを判断する。モード要求の世代は、どの選択が有効かを判断する。両者を分けて確認する。

## 最小の所有者と状態

所有者は`NoteEditor`の一つのrefとする。純粋な小helperで状態遷移を試験できる形は候補だが、mode管理を新しいglobal storeへ移さない。EditorDraft、server API、C1保存、local backup schemaは変更しない。

概念上は `requestId / target / phase / cancelled` とコンポーネントの生存epochを持つ。phaseは確認待ち・保存待ち・準備中程度に留める。React stateはprompt/notice表示、同期refは要求の所有確認を担う。`modePrompt`はmode文字列だけでなく要求IDとtargetを保持し、古いpromptや保存継続が新しい要求を消さないようにする。

有効性は「同じcomponent生存epoch・最新requestId・未取消」で判定する。mode名だけではvisual→HTML→visualの古いvisualを区別できない。要求IDをserverに送って認可根拠にしない。

新しいモード操作を受け取った時点で前要求を失効させる。その後に現在mode一致、pending/upload/composition、WYS確認、dirty確認を処理する。これにより後の拒否や取消で古い成功が復活しない。拒否された新modeを自動queueして後から適用せず、現在hostを維持して理由を出す。

## 非同期境界

`changeMode(next)`を、要求ticketを受け取ってそのticketにだけ結果を適用する準備処理へ変える。次の場所で所有確認する。

1. 準備開始前。古いdirty promptからの呼出は処理しない。
2. `renderNoteFn`の成功直後、Worker生成/実行前。古いrender結果で新しいWorkerを起動しない。
3. `analyzer.project`の成功直後。所有確認の後に現行の本文同値・composition・noText/issue判定を行う。
4. mode/currentMode/host state/error/noticeを変更する直前。同期commitの一群にawaitを挟まない。
5. device defaultの書込みと、その失敗のstorageError表示。最新要求のcommitだけが行う。
6. catchとfinally。旧要求の失敗は新modeのnotice/errorを上書きしない。旧finallyは自分のresourceだけ解放し、共有pending/promptを消すなら同じticketの時だけにする。

失効時は要求が所有するanalyzerをdisposeし、既存のoptional AbortSignalをprojectへ渡せる。renderが物理abort可能かは現在のcallsiteから断定しない。追加API調査・変更なしでも、遅いrenderの採用拒否とWorker未起動で正しさを保てる。ネットワークを取り消したという虚偽表示はしない。

resource cleanupは旧要求でも必要であり、所有確認に失敗したからdisposeを省く実装にはしない。ただし古いfinallyが最新要求のcontroller/analyzer refをdisposeしないよう、resourceを要求ごとのlocal値として保持する。disposeの二重呼出やabortによるrejectは最新UIへエラーとして出さない。

## 失効境界

| 操作・状態 | 古いmode要求 | 保持するもの |
| --- | --- | --- |
| 新しい別mode選択 | 最初に失効。新IDで判定・準備 | 現在の本文/host/退避。新要求が成功するまで現在mode |
| 表示中と同modeを選び直す | early return前に失効。確認待ちpromptも解消 | 現在mode。余分なdevice書込み・版・jobなし |
| visualを続けて選ぶ | IDを更新し、先の成功/失敗は不採用 | 最新visual要求だけのnoticeと結果 |
| dirty確認の取消 | promptのticketが最新なら失効。古い取消callbackは新promptを触らない | 旧mode・最新入力・退避。保存を始めない |
| WYS native確認の取消 | その要求を失効。旧要求へ戻さない | 旧mode・最新入力。C3警告方式へは変更しない |
| pending/upload/compositionによる拒否 | 古い要求を失効してから理由を表示。拒否modeは後日自動実行しない | 現在入力host、composition対象、uploadと退避。入力全体disableは追加しない |
| 破棄操作 | 明示操作時点で古い準備を失効。破棄自体が取消/拒否でも古いmodeを復活させない | 破棄取消なら最新入力。受理なら既存のsavedへの復帰 |
| 履歴への移動/確認、完了、復元・退避破棄 | 旧準備を失効。以後mode確認を再開するには新要求 | 既存save/discard/cancel・復元選択・未保存退避 |
| unmount、note/user/context置換 | epoch失効と自分resource解放 | 次Editor instanceのmode/入力/defaultへ干渉しない |

履歴移動がdirty確認で取消された場合も、以前のvisual待ちへ戻さない。現在の編集modeを維持する。通常の本文typingはmode要求を一律に取消す必要はなく、既存の本文同値検査で準備結果を採用しない。本文変更後に元の文字列へ戻したケースでもモード要求の新旧は別IDで判断する。

## C2 settle / V5への接続

保存とmode採用の所有権を分離する。mode取消は、すでに送った正当な保存を未実行扱いにする権限ではない。`persisted`、`saved`、最新入力比較、退避更新はC1/C2の保存結果として処理する。モード目的の成功/失敗/cleanupだけをticketで抑止する。

- 「保存して切替」はprompt ticketを保存継続へ渡す。保存開始前と、settleが最新入力を保存し終えた後にticketを確認する。
- `settleEditorSave`を複製しない。既存read/persist/acceptと最新入力のループを維持し、`shouldNavigate`/`navigate`のmode部分だけを最新ticketへ結び付ける。
- 既存noteで失効したtargetは`changeModeRef`を呼ばず、新promptも消さない。保存済み表示と最新本文は正当な保存結果に従う。
- new→stableはmode要求が失効しても作成済みIDを捨てない。必要な通常移行は現在modeで行い、古いtargetをroute searchへ入れない。本文の追加入力・両key・同ID再保存・cleanupのV5契約を維持する。
- mode要求だけのpreflight失敗を保存失敗と混ぜない。保存本体が失敗した場合は既存の未保存・retry/退避を表示する。失効したtargetをNOTE_CONFLICT再確認後に復活させないよう、conflictのmode継続もticket確認する。
- mode準備待ち全体を`navigating`で入力ロックする変更は避ける。既存の短いstable移行lockと、visual render/Workerの待ち時間を分ける。必要なら準備をlock区間外へ置き、採用直前だけ最新入力/ticketを再確認する。保存待ちの通常入力は維持する。

保存callbackの`finally`にある`inFlight=false`等をmode ticketだけで無効化しない。それは保存所有者の解放である。反対に、mode専用finallyから共通保存所有者を解放しない。既存の通常autosave・1800ms・既存API・履歴/pin・render認可は変更しない。

## コード上の関連可能性

確定は独立C2-V1のclean逆転だけ。以下はread-onlyで同じ欠落が波及し得ると分かる箇所で、実再現済みとはしない。

- 古いvisual失敗/空Text結果が新しいHTML/WYSのmodeNoticeを上書きする。
- 現在mode選び直しの早期returnで待ち中要求を取消せない。
- render待ち中のmedia開始・composition開始は、開始時の拒否条件を後の採用時まで保証しない。少なくとも最新のunresolved/compositionを採用前に再確認する。入力/媒体の異なる正常状態を勝手にリセットしない。
- 破棄で本文が準備前と同値へ戻った時、旧visual結果が通る可能性がある。
- `VisualEditor.onUnavailable`はmodeを直接HTMLへ変える。現在hostのcallbackと、新しいmode要求/hostの世代を取り違えない必要がある。子の既存disposed判定を正式修正時に確認し、実在しない子raceを確定扱いしない。
- dirty保存経由のtargetModeとprompt消去は現在ticketを持たない。cleanの一か所だけのguardでは全入口の最新選択契約を覆わない。

これらを別機能の改善として広げず、正式レビューの再現と同じmode所有境界で対を追加する。C3の新warning/schemaや全editor再設計は対象外。

## 正式修正後の最小検証案

| 経路 | 正常・遅延対 |
| --- | --- |
| clean逆転 | 独立操作と同じ本人tab render保留→trusted HTML選択→旧成功解放。HTML/CM/currentMode/device既定を維持。旧失敗/noTextも新errorを触らない |
| 同mode・連続要求 | WYS→visual待ち→WYS選び直し。visual A→HTML→visual BをA/B逆順で解放しBだけ採用。前resourceだけ解放 |
| dirty確認 | 新要求でprompt置換、取消、保存待ちの最新入力、古いprompt callback、conflict後target失効。保存の成功/失敗とmode結果を区別 |
| 入力・取消境界 | 待ち中のtyping/複数Text・composition/upload開始と新選択拒否、破棄/履歴取消、unmount。最新host/backup/noticeを旧応答が変更しない |
| V5・媒体 | new title autosave→invalidate待ち中両mode追加入力→同ID最新版。media-only/draft→stable、失敗reload/同asset/両key。新mode取消で保存自体を捨てない |

小helperの単体試験はticket/取消/旧finallyの正常対を担うが、実Reactのawait/catch/route遷移を証明しない。正式修正後のproduction本人tabによるtrusted入力と保留解除でV1を確認する。追加の重い全parser試験をこのread-only準備では実行しない。

影響候補はC2-D/E/Fと共有P1-Bの保存→mode採用、P2b-Bのnew/media移行。modeだけのguardならDB/schema/認可/pin/codec/安全HTML方式は不変。実修正の変更面に応じManagerが再open範囲を確定する。

## 停止状態

本書以外の変更なし。実行したのは関連sourceのread-only表示・検索と時計取得だけ。新しいtest/fixture/helper/ブラウザ/プロセスを起動していない。固定candidateのhashやDBは再集計していない。Verifierの残検証へ介入せず、正式reportと環境返却・修正委譲を待つ。
