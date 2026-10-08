# P2c-2 C2-V1 独立再確認

## 結論と対象

2026-09-06 / Asia/Tokyo。18:25:46 JST開始、18:37:14 JST自己browser終了。C2-V1は解消。P2c-2-D/E/Fと共有6項目を合格とする。新しい必須不具合は検出していない。前回 `reviews/P2c-2.md` の不合格資料を保持し、この修正候補の結果と区別する。

要件ED01/05等、採用design C2、修正案 `phases/P2c-2-revision-plan.md`、正式報告 `phases/P2c-2-revision.md` を全文確認した。goal-implementの独立検証、manual-testの実操作/失敗分類、pr-reviewの契約・所有・テスト実効性、markdown-styleを利用。Managerの固定候補・単独所有指示を優先し、source修正/依存変更/Issue/追加agent/全局cleanup/spec・spec-implement/goal APIは行わない。

18:26:03.592 JSTの開始照合は559実files、SHA256 `12963eec15b2d807866bfe8f7aae7da6a49a6457a1ecf7ff650480f5df83cfd1`、HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、lock `ab5726f19ce660ffdc599821edbb1f115cb114fae8987dcfbab33d8d9190e68f` で一致。dedup/sort tracked+untracked実file、`.goal-implement/`除外、path+NUL+bytes+NULの同じ規則。Node24はhash CLIだけ、app・独立tests・UI helperはNode22.22.3。

自己tempは `/tmp/hollow-c2-recheck.j5FB1j`。操作前にsqlite online backup `baseline.db` を作成した。受領421notes/43assets/568revisionsを全て保全対象とし、前回の自己account `c2-independent-20260906@example.test` の新規追加noteだけを操作した。前フェーズで自作したnoteも含め、baselineの旧421notesは変更しない。認証値・mail token・未知clipboardを取得/出力していない。

## コードと重点unit

確認した製品変更4filesは `NoteEditor.tsx`、`editorModeRequest.ts`、`editorModeRequest.test.ts`、`editorSave.test.ts`。呼出し側のsave/prompt/conflict/history/recovery、変更されていないVisualEditorの取消済みcallback拒否も照合した。既存server・schema・parser等の無変更範囲は前回独立根拠と正式変更報告を適用する。

| 境界 | 独立確認 |
| --- | --- |
| mode所有 | component-local要求objectのidentityとAbortSignal。`begin`が同mode/拒否判定前に旧要求を失効するためABAも区別。mode名やsource同値だけで採用しない |
| await/反映 | render成功後に所有確認してからproject、project後に再確認、同期commit一群の前にも確認。旧catchはnoticeを書かず、finallyは要求固有analyzerをdispose。projectへsignalを接続する。render HTTPを物理abortしたとは主張しない |
| 採用時入力 | source同値のほか現在composition/visual composition/unresolved mediaを再評価。拒否要求をqueueへ保持しない。現在host/入力をmode処理でresetしない |
| 失効境界 | 同mode、拒否、新要求、破棄、history/finish、復元/退避破棄、context/unmount、signout。旧VisualEditorのasync callbackは既存cancelledチェックで不採用になる |
| 保存所有 | `persisted/saved/submitted/current/backup`のacceptとinFlight解除をmode ticketで捨てない。既存settleを共用し、取消後も最新入力までcontinueSaving。existingのmode準備はnavigating lockにせず、new→stableは最新の現在modeを採用する |
| prompt/conflict | promptはticketを保持し、旧promptの清掃はidentity一致時だけ。NOTE_CONFLICT読取後と確認retry時にobsolete targetを落とし、通常保存へ戻す。これはコード/owner unitで確認し、今回は実別actorのconflict UIを再演していない |

独立実行は18:27:12 JST開始、4files/53tests、980ms、全成功。

```sh
pnpm test:unit --exclude '.goal-implement/**' --maxWorkers 1 apps/web/app/components/hollow/editorModeRequest.test.ts apps/web/app/components/hollow/editorSave.test.ts apps/web/app/components/hollow/editorMode.test.ts apps/web/app/components/hollow/BrowserHtmlEditor.test.ts
```

新owner10件、保存取消後のcreated ID/最新入力1件と、mode/backup/Worker/V5の必要回帰を含む。owner testのcomposition/upload/history等の名称は同じcancel契約の純粋試験であり、Reactの各ボタン配線を直接試すものではない。次の本体操作を別に行った。source変異は固定指示により行わず、元V1の実失敗を検出した独立再現を修正候補で再演した。

## 独立本体操作

専用agent-browser `hollow-c2-verify --restore` を再開し、自己accountの認証を維持。新規seedは `01a0760b-f0c6-74e5-845a-b8013cc85046`。操作はChromeのtrusted pointer/keyboard/typingを用い、自己tabのfetch/Worker/XHR保留、合成compositionは試験条件として分離する。helperは一つずつ実行し、終了を回収してから次へ進めた。

### 元V1と非同期要求の正常・拒否対

| 実日時 JST / 資材 | 観測 |
| --- | --- |
| 18:28:49.806 / `independent-mode-race.cjs` | 元独立再現を新tempへコピーし自己新規note IDだけ差替、期待拒否assertを追加。旧render保留1043.6ms→HTML/CM/device=html 1609.2ms→旧成功解放1617.4ms→2237.5msでもHTML/CM/device=html。元58a885…の資材は不変 |
| 18:29:08 / `mode.cjs failure` | 旧render応答後に試験用失敗を返しても、最新HTML/CM/device=htmlと現在案内を保持。古いエラーnoticeなし |
| 18:29:10 / `mode.cjs keep` | WYS→visual保留→WYS再選択でWYSを保持。明示route WYSと既存device htmlを区別し、同mode再選択で余分なdevice書込なし |
| 18:29:14 / `mode.cjs reverse` | visual A→HTML→visual B、B→Aの逆順解放でBのvisual/deviceだけを維持。A/Bのheld番号を別に採取 |
| 18:29:16 / `project.cjs` | 実Workerのproject送信を保留→HTML選択→旧送信解放。旧Worker terminate1、HTML/CM保持、alert0。終了解放は元prototypeへ復帰 |
| 18:29:18/20 / `composition.cjs` | render待ち中の合成composition start。採用直前の拒否と、追加HTML要求そのものの拒否の両方でWYS/同host保持。旧応答が拒否理由を消さない。endはfinallyで送信し解除。実OS IMEではない |
| 18:29:22/25/27 / `navigation.cjs` | 保留中の破棄、history移動、完了。破棄は試験追記を捨ててWYSを保持。history/finish後はdetail/iframe1/alert0、旧応答で再遷移なし。SPA unmount後に旧promiseを解放している。confirmは自己tabの既知操作だけ試験用trueでありnative確認操作とは区別 |
| 18:30:03 / 独立 `no-text.cjs` | 新規title-only noteで空canonicalのrenderを保留→HTML→旧応答解放。HTML空原文/device=html、旧project開始0、旧noText/失敗noticeなし。静的media toolbarの案内は除外して判定 |
| 18:32:36/38 / `late-upload.cjs` | render待ち中にPNGをfile inputへ設定しXHR送信保留。late採用はWYS/同uploadを維持し拒否理由。解放して実upload/save完了後もWYSのままで、visual要求の暗黙queueなし |

### 保存結果とmode要求を分離する対

| 実日時 JST / 資材 | 観測 |
| --- | --- |
| 18:30:05 / `save-ticket.cjs` | 実際の初期modeはWYS、targetはvisual、最新選択はWYS。同helperの正式報告表にある「dirty visual」表記と混同しない。dirty→保存して切替のPOST応答保留→WYS再選択→trusted追記→解放で、同note/両追記/保存済み/backup0 |
| 18:33:27.538 / 独立 `visual-save-ticket.cjs` | 初期visual→target HTML→保存して切替。save応答1606.1msで保留→visual再選択→1904.9〜1929.4msにtrusted最新入力→解放。visualfirst/visuallatest両方、同ID、visual/保存済み、backup0。元helperとは別の本当にvisualから始まる対 |
| 18:34:40.605 / 独立 `new-mode-ticket.cjs` | 新規WYS dirty→visual要求→保存して切替。create応答639.5msで保留、自己titleのDBで作成済IDを確認→WYS再選択→993.4〜997.2msにtrusted追記→解放。初回と継続の2POST、同createdID `01a07611-e74d-775c-a745-4a611107d659`、newfirstnewlatest、stable WYS/保存済み、新旧backup key0。mode取消が作成結果を捨てない |
| 18:30台 / `race.cjs html/wysiwyg cancel-mode` | 新規初回WYSを確認。title autosave応答後invalidate保留中の新mode要求を拒否/失効し、本文を二段追記。HTMLはhold2540.7→trusted本文2965.7〜3008.6ms、次hold3372.3→3657.6ms以降。WYSはhold2218.9→3108.9ms以降、次hold3447.7→3870.1ms以降。両modeで同createdID/最新title本文/保存済み/new key0。title fillのsyntheticと本文trustedを区別 |
| 18:30:25/35 / `new-failure.cjs html/wysiwyg` | 作成応答受領後の次saveを自己通信失敗。mode要求拒否後の最新本文/mode/createdIDがnew退避に残る。reload→作成済みnoteを開く→復元で両modeとも同ID/最新本文/保存済み/new key0 |
| 18:32:29/34 / `media-resume.cjs` | 新規media-onlyのPNGはtitle無題/DB version0で作成済み。CLI中断後にその同noteを開き、stable URL/画像幅91/保存済みを確認。HTML dirty→visual保存で通信失敗はHTMLに留まり、reload/復元→visualで同asset `01a0760e-2f06-7163-bcdb-486846b02875`、最新本文/画像91/保存済み/backup0 |

新規V5のHTML noteは `01a0760d-c132-76de-b651-afb09908175c`、WYSは `01a0760d-d354-7028-b5a1-d962e60a97d5`。失敗復元は `01a0760d-eab6-75c3-a9b6-6728d1426f86` / `01a0760e-0eb1-745e-a182-be695c7323f7`。媒体は `01a0760e-38ec-767b-9fc0-c1e097ca828f`。全て今回の追加noteであり旧421の変更ではない。

### 画像と操作環境の限界

18:36 JSTのHTML画面は保存済み、最新title、mode HTML、CMあり、iframe1、同PNG幅91、sandbox allow-same-origin、backup key0。`final-html.png`をVerifier自身で見て、1280pxで保存状態・最新title・HTML選択・toolbarが整合することを確認した。画像は画面上部であり、下部previewのPNG幅は別DOM観測の根拠。下部追加撮影は後述のcontext復帰により未実施で、見たと記録しない。前回mobile/keyboard/全C2解析・SVG/動画等の不変な受入を保持する。

実IME候補確定/取消、native clipboard、OS file dropは前回どおり未確認。今回の合成composition/通常trusted日本語/file inputをその成功に読み替えない。OS設定・入力サービス・未知clipboard・他browserへ調査を広げなかった。

## 試験手順と環境事象の区別

- 初回seedのtitle selectorに存在しないaria-labelを使い、未操作で停止。実snapshotのtextboxと既存 `#note-title` を使って回復した。製品フォーム不良ではない。
- media helperの最初の状態evalが30秒でSIGTERM。既存execを回収し、自己sessionのsnapshotがnotes一覧へ復帰していることとDBで当該新規無題note作成済みを確認した。重複uploadをせず同noteから`media-resume.cjs`へ続けた。CLI待ちと製品保存失敗を合成しない。
- 終了時の追加scrollでもCMが存在しないcontextへ復帰しており追加画像は未実施。自己browserを単独closeする別コマンドで確実に終了した。context復帰のOS/process原因は調査していない。本文/保存状態の消失はDB保全・同note再表示では観測していない。
- 固定時間待ちを製品応答期限の保証としない。save完了の必要箇所ではstatusを確認した。未回収execを増やさず、全実行を回収した。source/production環境への恒久hook・設定変更なし。

## 借用根拠と判定

最終製品unit356/356（18:09:58開始、80.55秒）、規定checks/build（18:11:39確認）は実装報告の借用根拠。最終559hashとNode22 productionを照合し、重点53の独立再実行と実UIを加えた。直列で成功した試験上限を緩めていない。新buildが必要な変更はしておらず、今回はbuild/checksの全再実行・production再起動をしていない。

Node124はC2最終backend16:39:40の既存根拠を借用し、今回未再実行。schema/server function/application/domain/adapters/lockに変更なしの報告と今回のfrontend-only境界を照合。C1 actor再確認/rollback/pin/GC/認可/参照worker、全parser/codec/容量を無関係に反復しない。NOTE_CONFLICTのobsolete target除去は今回コードとowner/保存unitで確認し、実別actor UIまで今回再証明したとはしない。

| 対象 | 判定 | 根拠 |
| --- | --- | --- |
| P2c-2-D | 合格 | 元V1解消、最新要求だけのmode/notice/device、同mode/ABA/旧noText/旧失敗、composition/upload/破棄/移動、dirtyと新規保存の取消 |
| P2c-2-E | 合格 | ticket取消後の正当なsave accept/createdID/最新入力/退避を独立3経路で確認。両mode V5/失敗reload/同assetを維持 |
| P2c-2-F | 合格 | 型付きcomponent-local owner、AbortSignalと要求固有dispose、独立53＋実project取消、保全、最終配布借用。OS入力未確認は前回どおり |
| P1-B | 合格維持 | 両mode新規V5、new dirty mode-save取消でも同ID最新、両mode失敗復元 |
| P1-E | 合格維持 | 最終hash/lock/Node22 runtime、checks/build借用、独立実UI/Workerと53tests |
| P2b-B | 合格維持 | media-only作成済み同note/stable表示、mode-save失敗復元で同asset、late upload採用拒否と非queue |
| P2c-1-A | 合格維持 | 共通settle/acceptを複製せず、mode失効後も有効な保存を採用。20版/rollback/backendは無変更根拠 |
| P2c-1-E | 合格維持 | 最新入力/createdID/退避/復元の実交差、conflict target失効コード。既存actor判定を弱めない |
| P2c-1-F | 合格維持 | schemaなし、受領旧行/object保全、配布/本体操作/終了所有を確認 |

C2-A/B/C、他共有項目、P2a、C1-B pin/GC等の無変更部分は前回独立受入を維持する。C3・WS・公開等の後続要件を今回合格へ含めない。

## 固定資材と最終引継ぎ

元独立 `mode-race.cjs` のhash **`58a88509ddcad7f9f93b8103558c0a8e1352f571f86e1d6e874ab07b507b06af`**、元32資材aggregate **`bdb4f9ccc62b9417a4cc34145913dee7bf81ce5bf1ca9d51e8b7b89e7bf01792`** は18:36:48に不変確認。Implementerのmode/race/new-failure/save-ticket/late-upload 5 helper hashも正式報告値と全一致。元資材へ書き込まない。

自己19資材（cjs/mjs/json/png、baseline.db除外）のsorted basename+NUL+bytes+NUL aggregateは **`5f35bcdd08b2f373baf1044fd2a13f4a66f23093e0f69530f5668823bf9aa7cd`**。既存helperの新temp派生は自己note.json/一意titleに差替え、media helperの元tempへのfs書込を除去した。独立の元再現・空結果・visual save・new mode ticketを追加し、手順依存と失敗資材を保持する。任意の旧noteへ無条件に再実行しない。

18:36:17.218 JSTのNode22保全は、受領baselineのnotes/assets/note_revisions/note_asset_references/note_revision_heads/originals全列差0。baselineのoriginal＋ready asset **389objects** は実storage bytes/SHA256全一致。不一致0。実装側baseline412/40/541の386objectsとは別の、今回受領421/43/568に対する検査である。

最終 **429notes/45assets/589revisions/display pending0/conversion queued-running0**。増分は自己8notes/2assetsと21revisions。全旧backup/原本/固定gate/前回レビューを保持し削除なし。

18:36:25.028 JSTの終了fingerprintは559files **`12963eec15b2d807866bfe8f7aae7da6a49a6457a1ecf7ff650480f5df83cfd1`**、HEAD **`91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`**、lock **`ab5726f19ce660ffdc599821edbb1f115cb114fae8987dcfbab33d8d9190e68f`** で開始と一致。その後は追加画像の未実施となった自己browser操作、資材hash読取、自己browser終了、本書書込み・読取確認だけを行った。正式報告の最終確認clockは18:43:36 JST。

自己session `hollow-c2-verify` はclose成功、直後clock **18:37:14 JST**。自己fetch/Worker/XHR/confirm/input listenerはfinallyで復帰し、残る自己contextも終了。listener/HAR/別tab/route interceptionは開始していない。全自己helper/execはexit回収済み。全局cleanupや他sessionへの操作なし。実装/source/DB操作は停止した。

production **session68259/PID62968/Node22.22.3/http://localhost:3000** を維持。18:36 JSTに既知PID数値で稼働を確認。DB `/tmp/hollow-p2b.dAfzgS/app.db`、storage `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox`。自己online backupは `/tmp/hollow-c2-recheck.j5FB1j/baseline.db`。環境所有をManagerへ返し、次の正式委譲まで全操作を停止する。
