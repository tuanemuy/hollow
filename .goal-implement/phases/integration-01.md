# 全体統合読み2の必要修復 — 19ID修復候補 — 4406pass/品質0/正常・自己終了

2026-10-14 03:58UTC。対象19IDは OR-12、IN-01/02/07、IM-01/02/03/06、OR-06/07/08、ED-09/10、SH-01/02/03/04/08、UX-VISUAL。独立報告 `c4060ab56149f98744cc23e9f8c5c164af4931a8` のB1–3と採用designを修復する。元93項目/13phaseは不変。code `11a25f4aa3c51327512970bededac978c8232092` は03:58:09.104723UTCに明示45pathsのみcommit済み。報告候補は本fileだけの次commitで確定する。最終fullは03:41:19.906415–03:50:26.928916UTC実exit0・4406pass（unit2798/204files＋Node1538/128files/通常1506＋全5formats32＋CF70/10files）、failed0/skip0/unhandled0。規定typecheck→lint:fix→format→lint→format:check→build全exit0。局所122＋31をfullへ加算しない。最終normalと全自己native実0・全PID/listener終了成立、自己把握の残反例/必須未観測0、独立未受入。Managerfiles/reviews/resumeは変更しない。

## 修復の範囲

| 反例 | 差分と守る境界 |
| --- | --- |
| B1 条件2 | 既WAV byteRate検査は不変更。unitに固定244B/16000Hz/100frame PCM16の正常32000と不正31999を追加。bad側hash/frame/bytesも整合する。workerは既合法8frameを2×4frameへ分割し、そのprepared byteRateだけ31999へ変更して同manifest/hashを固定。実NodeLlmTranscriberのwire0・not-sent/closed、terminal SOURCE_INVALID、旧本文/原本/版/共有/当月0/予約返却・receipt closed/memory0と回復再送0を確認する |
| B2 条件6 | 既layout.cssのHollow専用12px/16–48/白地へ既dialog classを集約。desktop8vh/可用height、640未満は下端sheet/上端角丸/handle/内側scroll。SharingDialogとPublicationConfirmationだけ既native showModal patternへ接続し、sticky/filter祖先のfixed包含をtop layerで解消。既current/epoch/busy/取消/Tab/Escape/実trigger/ネスト確認のownerは保持。paletteは別classで不変更 |
| B3 条件6 | presentation/uiTermsの小対訳を既5consumerへ接続。UIのAI表記、noAI案内と既LLM_DISABLED公開文言だけを整合。domain変数/型/code/モデル/ブランド/保存recipe/任意利用者文字列は変えない |

共通表示に届く既callerはTagPicker/TagManager、NoteTrashDialog/PurgeConfirm/EmptyTrashControl/EmptyTrashHistory、SharingPanel（detail/NoteEditor）、MoveDialog、BatchOperationPicker/BatchConfirmation/BatchHistory/DriveBackupSelection、WS-delete、ProfileEditor、WorkspacePublicationPanel。既modalを揃えるだけで新操作・state・endpoint/port/DTO/schema・認可・native契約を加えない。破壊確定buttonだけHollowの正準errorテキスト#c43e3e/非塗りへ揃え、rename入力・非破壊保存はprimaryのまま。汎用template token/本文/別profile/semantic statusを上書きしない。

## B1の独立期待と有効な変異

旧unit15とworker30は保持し、新unit2/worker1を追加した。unitは正常32000の送信1/専用STT privacy deny+zdr/実HTTP閉鎖に対し31999のrequestFactory0/send0を固定。workerは拒否後の旧本文・original hash/bytes・revisions・sharing・models・account・connection・batchとquota/receipt/native/object-writeを直接比較する。期待値はproduction header helperや定数から生成しない。

停止済R4のtranscriber byteRate guard1行だけ削除した変異は、unit invalid31999のreject期待がresolveへ変化して1fail/1pass、workerのfailed/SOURCE_INVALID期待が実succeededへ変化して1fail、両exit1。workerは有限の後段generatorへ進み、closed/sourceMemory0のまま直接assertで赤となる。NoIOによるOWNERSHIP_UNKNOWNでcleanupがmaskしたR3診断は有効redへ数えない。どちらもfinallyで原bytesへexact restore、診断caller終了。filtered未選択caseを通常fullskipへ混ぜない。R4/R5/R6の当該core/tests3pathsはbyte一致し、このguardredを最終sourceへ適用する。

## 環境・局所と失敗の分離

全環境は新持続root/source/HOME/DB/objects/鍵/工具設定、短persistent TMPDIR。sanitized HOME/PATH/LANG、NixNode22.22.3/Unicode16.0・同Node pnpm11.1.2、FFmpeg8.0.1、frozen/offline install。旧DB/保全root/他rootのデータは再利用しない。実外部接続/生成/送信/操作/費用/公開無し。環境操作/実行/commitは本体だけ、helperはtranscriber.test.tsとllmAudio.integration.test.tsの2paths編集だけを完了して全停止。

| root | 実結果 |
| --- | --- |
| R1 integration2-repair-1791938481897913000 | 初回typeexit2。completion notice unionに存在しないcodeを参照したUI変更を撤回。raw任意notice全文は機械置換しない |
| R2 integration2-repair-1791938606292960000 | 型0、native dialogの冗長role2件でlintfixexit1。roleだけ除去しnative aria/ownerを保持 |
| R3 integration2-repair-1791938724316018000 | 全quality/build0、unit102/12files・worker31。初期worker変異はNoIOでunknownとなり有効red未成立、fixture後段を有限成功へ訂正 |
| R4 integration2-repair-1791939084887659000 | 全quality/build0、unit102/worker31。guard削除のunit/worker direct red→exact restore。TagManager renameを破壊色にせず確定delete/merge/cleanupのみへ境界補正後のR5へ進む |
| R5 integration2-repair-1791939241786959000 | 00:55:03.192434–00:56:22.981312UTCの規定quality/build/局所全0。同source full4386（unit2778＋Node1538/全5formats＋CF70）、skip0/unhandled0/exit0。正常runtime開始はtest caller終了後だけ。共有dialogの旧緑literalが実有効なので色修復前sourceの結果として保持し、新sourcegateへ流用しない |
| R6 integration2-repair-1791940526663632000 | dialogだけcolor inherit/白button/neutral border/focus/link inherit・下線保持へ修復。別profile/status不変更。fresh規定quality/build0・unit102/worker31。38paths main/source一致後、01:17:03.457275–01:26:36.213828UTCに同source全pnpm test実exit0/4386pass（unit2778/201files、Node1538/128files＝通常1506＋全5formats32、CF70/10files）、skip0/unhandled0。runtime/browser0で完走し、caller終了・関連testprocess0確認後だけ正常環境へ。normal未確認 |

## R5共有dialogの因果観測と正常終了

通常owner signin→同限定note detail→共有設定でnative `:modal=true`、1280×720はtop57.59375/width620/bottom695.984375、375×812はtop16/width375/bottom812、320×760はtop16/width320/bottom760。desktop12px全角/mobile12/12/0/0、shadow rgba(.1)0/16/48、白地、内側auto scroll、handle desktop無し/mobile32×4、page scrollWidthは各viewportと一致。内側scrollを確認し、末尾password操作の到達は最終環境の正常操作で確かめる。sticky祖先からのdialog枠の見切れはtop layerで解消した。evidence/sharing-before-<width>.json/pngとbrowser.jsonlに実computed/操作を保存。

実ink rgb(38,40,36)・全button背景rgb(244,246,239)の旧literalが有効だったためB2採用範囲でdialog限定neutralへ修復した。R5値を修復後の成功へ読み替えない。先行click直後navigateによるsignin中断は通常signin成功と分離、再操作後同noteへ通常認証成功。

R5専用browser close0→actual73443(runtime)/73603(proxy)へTERM→両native/caller/harness実exit0。01:15:06.714226UTCに捕捉5PID不存在・4341/4350接続拒否61をshutdown-end.jsonで確認。runtime/proxy外側execcallerも実0。不存在だけをnative閉鎖証明へ置換しない。

## R6の追加反例とR7の最小修復

R6最終full4386は品質gate成立後のsourceであるが、通常起点へfocus→Enter→EscapeでもSharingDialog閉鎖後はBODYとなった。TagPickerの同操作は実起点「タグを追加」へ戻り、trash確認はBODYへ戻った。native top layer中の共有owner即時focusと、trash effectのclose-onlyを原因として区別する。3幅の配置成立からfocus成立を推定しない。

採用46b7e73/8ea2d7eに従い、NoteSharingActionの既単一trigger ownerで閉じた後のRAFに同actor/epoch/location identityとconnected実起点を再確認して復帰。trash/purge/empty4consumerは既Tag/Move/Batchと同じ起点捕捉→cleanup close→connected起点だけfocusへ揃える。EmptyTrashControlは既opener refを起点として捕捉する。新state/port/DTO/schema無し、既current/busy/cancel/mutation/認可・ネスト確認は不変更。共有dialogはreading-barのmutedを誤継承しないよう、既--hollow-inkを参照する。別profile/status/本文は変更しない。

R6の白buttonと3幅native配置は成功、ink inheritの実値110/110/115とfocus反例は未合格として保持。01:31:39.475112UTCまでに専用browser正規close→actual86145/runtime・86315/proxy TERM→両native/caller/harness0。捕捉5PID全gone・4341/4350/650xx相当の当該fixture実ports4閉。exact portsはR6/shutdown-end.json（4341/4350/50001/50002）。外側execcallerも実0。

R7は `/Users/hikaru/.local/share/hollow/verification/integration2-repair-1791941567559688000`。初回quality0後、既openerの起点捕捉へ1行整合して最終規定quality/buildを揃え直した。局所unit108/13files＋worker31、skip0/unhandled0。最終41paths main/source一致・runtime0で同source全pnpm test実行中。R6 gateを新source最終成功へ流用しない。

停止R7 sourceの旧共有即時focus変異は3fail/1pass・exit1、close前focus0/切断起点0が直接赤。trashの旧close-only変異は1fail/3pass・exit1、close後connected起点へのfocus期待が直接赤。両finally exact restore、診断caller終了。新unitは次frameの実起点、同actorのepoch変更後focus0、connected/切断起点を固定し、trash/purgeはclose→focusの順と切断時close-onlyを固定する。元2trigger/30worker/15transcriberassertは保持。B1のR4 guard redはR7のcore/tests3paths byte不変更として適用。

## 非同期入口の起点とR8/R9

R7共有/private→public→link、リンク再発行、password設定・変更・解除、Tab/ShiftTab循環、ネスト確認のEscape保持とbadge/共有設定の実起点復帰は成功。最終3幅のink29/29/31・白button、12px/16–48/8vh/下端sheet、tag picker/softtrashの起点復帰も成功。タグ作成・改名・統合・削除の業務結果は成立した。delete取消だけはBODYへ戻り、await中のdisabled起点をDialogが後から捕捉する不足を実観測した。通常移動の候補読取→取消もBODY。rename/WS-delete/Profile・WS公開確認/Batch picker・confirmation/ZIP・Drive selectionは各3幅と実取消起点が成立した。ZIP構成はreadonly診断200/configured=true/HTML-MDで確認しただけで、生成・取得の新正常へ読み替えない。

採用6aaa141/224d351でTagManagerとNoteMoveActionの2ownerだけを補完。await前に実buttonをref捕捉し、閉鎖後RAFで既generation/location/scope/current mounted/context/request/canEditとconnected/enabledの実起点を再確認する。他の成立callerへ新ownerを加えない。OR-12は具体取消focus回帰として同固定IDを追加再検証し、19ID。新React data state/port/DTO/schema/汎用focus抽象無し。

R7全suiteは01:38:56.503333–01:48:23.640393UTCに実0/4392（unit2784/202files、Node1538/128files/全5formats、CF70/10files）、skip0/unhandled0。Tag/Move追加前sourceの結果であり新source最終gateへ流用しない。実browser後の自己actual96763/runtime・96686/proxy TERM→両native/caller/harness0、02:07:01.248160UTC全捕捉5PID・4341/4350/51422/51423閉。新root/source/HOME/keys/DB/objects以外のデータは再利用しない。

R8 `integration2-repair-1791944063649282000` は型・静的/build0、unit113pass/4fail。4failはTag test用Router mockのLink export欠落で製品のTag renderへ到達しなかった。Move5caseは通過。mockへLinkだけ追加し、期待値/原guard/期限を緩めず次freshR9へ進む。R8失敗log/sourceを保持、full未実行。

R9 `integration2-repair-1791945112184293000` は02:31:52.954847–02:33:09.811040UTCに規定品質/build全0、unit117/14files・audio31/31を実exit0。新9unitは非同期read中disabled→完了後元button復帰、別location・消失・disabled・move readonlyで復帰0を固定する。02:37:06.717882–02:38:14.472030UTCの停止sourceではTag/Move各起点captureだけを外した変異が各1fail/8pass・exit1となり、次frameの実起点focus期待が直接赤。各finally exact restore、診断caller終了。43paths main/source一致後、runtime無し通常fullを開始した。同最終sourceの全pnpm testは02:38:20.165970–02:47:26.861668UTCに実exit0/4401pass（unit2793/203files、Node1538/128files/全5formats、CF70/10files）、skip0/unhandled0。02:47:46.688740UTCに43paths一致・testprocess0確認後だけ固定buildの正常runtimeを起動した。未観測normalはまだ未成立である。

## R9の正常・残反例と実正常終了

R9は全suite終了/関連testprocess0後だけ固定buildの正常環境を起動した。desktop1280×720・375×812・320×760でTagPicker/TagManager delete・rename・merge・unused cleanup、共有detail/editor/別editor/viewer、softtrash/purge、Move candidates/impact、Batch picker/confirmation、ZIP、Drive selection、WS-publication/WS-delete、Profile confirmationの配置・12px/16–48/白地・下端sheet/handle/内側scroll・pageoverflow0を実DOM/computedとscreensで保存した。可読な書き出し/本文/role/currentを型や静的候補だけで成功へ読み替えない。

通常操作はtag create→rename→merge→delete・unused cleanup、private/public/link切替、リンク再発行、password設定/変更/解除（確定値非再表示）、copyack、Tab/ShiftTab循環、inner Escape/main維持、各実trigger復帰を確認。MoveはWS→personalの実previewでeditor/viewer2人のlost audienceと「共通→共通」tagmappingを表示し、取消focus→確定→同限定URL本文を確認。Batch新tagの実付与結果、HTML ZIP実成功1件/1035B・本文HTMLとreportの2entry・testzip正常、Drive実backup成功1/待機実行失敗取消0、WS公開解除と空WS exactname削除、profile handle取消focusと保存も成立。softtrash→復元→再trash→purge受付/回収、EmptyTrash実1件完了/失敗取消0・未開始実行0を確認した。

AI upload/noAI選択、実audio.wav受付/原本保持/失敗理由/使用0、OR各用途モデル表示を3幅で確認。viewerはWS3members・閲覧専用・変更/秘密URL取得操作無し、editorは既権限で共有panelを操作でき、双方の実起点復帰を確認した。

未合格は2つに限定する。EmptyTrash確認→Escape→discard終了ではnative modal閉鎖/起点再enabled/対象保持が成立してもfocusはBODY。静的にtransition中resolve→setOpen(false)→cleanupの順を確認したが、実focus callee時のdisabled値は採取していない。AI変換状況の既知LLM_DISABLEDはAI表示に整合する一方、同detailの原本noticeは旧LLM文言だった。R9の4401/他正常をこの2点の修復後成功へ流用しない。

driverは候補250ms待ち不足、WS tagをpersonal管理URLで探した誤scope、aria-labelとbutton textの誤比較、推測q/jobs URL、transient toast covered-pointer、既sessionのsignin redirectを、それぞれ実候補/正規WS・query/処理履歴リンク/実aria起点/keyboard/正規signout後の成功から分離する。試行logは削除しない。R9/evidenceとbrowser.jsonlに全操作/UTC/期待actual/screensを保存した。

03:26頃、browser正規close0→actual29128/runtime・29263/proxyへTERM→両native/quiesce/drain/caller/harness実0。03:27:12.712663UTC、捕捉全自己PID不存在と4341/4350/53438/53439閉を確認した。wrapper中断やPID消失だけをnative成功へ置き換えない。

## 最後の2補完とR10/R11

採用c529284/0ec241fでEmptyTrashだけ既opener/mountedと既useAuthenticationOperationのactor/epoch/location/current ticketを使う。native close cleanupで実起点とcurrent判定をref保存し、open=false/pending=false後にcurrent/connected/enabledを確認して復帰。再open・文脈変更・消失・disabledなら復帰0、React data state/port/DTO/schema追加無し。discard/confirm/unknown/旧受付controllerは不変更。note詳細の原本noticeは既知LLM_DISABLED codeだけ既llmDocumentMessage/UI対訳で表示し、他code/任意message/永続notice/domainを変更しない。全文replaceや新抽象を加えない。

新EmptyTrashFocusの5caseは実discard/readの呼出しを保ち、native close前/transition pending中focus0、完了後1回、context/disconnected/disabledと再open0を固定。停止R11 sourceで旧cleanup即時focusを戻す変異は03:39:50.119601–03:40:23.720498UTCに5fail/exit1、native close後pending中focusが1回呼ばれて直接赤となった。finally exact restore（SHA0a3a96f7c72c5f20c9a4e028d42ff22a4fc609489d347020f7cff0d0c158dbf1）、診断caller実終了。filteredskipは無い。

R10 `integration2-repair-1791948771784905000` はtype0/lintfix1error（新testのassignment-in-expression）。期待/guardでなくstatement分離だけ訂正して失敗source/log保持。R11 `integration2-repair-1791949039680999000` は03:37頃–03:38:39.767948UTCに規定全品質/build0・unit122/15filesとaudio31/31。45paths main/source一致・変異restore後、runtime無し同source全pnpm testを開始。R4 byteRate/R7 shared-trash/R9 Tag-Moveの有効redは該当core/test/owner paths byte一致のため現在へ適用する。

## 最終sourceの正常と終了

R11最終fullは03:41:19.906415–03:50:26.928916UTCに実exit0、unit2798/204files（20.97秒）、Node1538/128files（485.18秒、通常1506＋全5formats32）、CF70/10files（4.47秒）、合計4406・failed0/skip0/unhandled0。03:51:50.377879UTCに45paths main/source一致・関連test/diagnosticprocess0確認後だけ固定buildのruntime/proxyを起動。buildやfullを稼働中に再実行しない。

正常は新rootの通常owner signin→正規softtrash→Trash→確認→Escape/discard/readを各幅で実行。1280×720・375×812・320×760とも最終active=BUTTON/text「ゴミ箱を空にする」/disabled=false/modal=false/pageWidth=viewport。native閉鎖＋pending完了後に実起点へ復帰し、対象は保持される。新audio.wavを実noAI受付し、失敗終端後の「元ファイルと取り込み結果」は3幅とも「原本: AIなしでは取り込めません。」。旧LLMなし/LLMを使う文言無し、32044B原本/現機械retry非表示/AI生成guide/ページ横はみ出し0。evidence/empty-focus-fixed-*/ai-original-fixed-* のcomputed/JSON/screensとbrowser.jsonlに時刻・実操作を保存した。mutation/元notice保存/他code/任意本文は不変更。

自己browser正規close0→actual48058/runtime・48190/proxyへTERM→native/quiesce/drain/caller/harness両実exit0。03:55:44.000793UTCに捕捉18自己PID全gone、4341/4350/55562/55563/CDP55575閉。outer exec callersも0。R11/shutdown-start/end.json/runtime-exit/proxy-exit/browser-close.txtが実根拠。PID不存在だけを成功へ置換しない。45paths byte一致は最終normal後も確認済み。

R9のgeometry/current-role/model/共有/各通常操作は、最後の差分がEmptyTrash復帰タイミングとnote原本既知code表示＋回帰testだけであり、当該CSS/controller/ports/domain/worker/各操作はbyte不変更を理由に現在へ適用する。R9の2反例はR11の直接正常と回帰で閉じ、R9の旧full4401を最終gateへ流用しない。B1/音声の既独立whole-read2実5codec/2段privacy/1計数/Drive-source/undo・readonlygatesは、core production完全不変更・既guard維持を理由に保つ。今回新guard testはunit/workerの実ownedwireとbad31999の検出力を追加したもので、実外部認識品質の評価ではない。

### 対象19IDと到達先

| ID | 今回の正常・回帰根拠 |
|---|---|
| IN-01 / IN-02 | R9用途設定3幅/AI表記、既音声実モデル・privacy・連携の独立根拠をcore不変更で保持。unit/transcriber17・provider既inspect/全suite |
| IN-07 | R9実Drive backup成功と既source再取得/音声2段/epoch/closureの独立根拠をcore不変更で保持。bad WAV worker31と既Drive-source/native integration |
| IM-01 / IM-02 / IM-03 / IM-06 | R9/R11実音声noAI受付・32044B原本保持/失敗理由・AI guide/用途model/3幅、既全codec/WS別editor/同親retry/再生成undo/取消の独立正常をcore不変更で保持。31新旧audio worker/全suite、coherent byteRate guardのunit/worker直接red |
| OR-06 / OR-07 | R9 detail TagPicker3幅・作成/付与/除去/readonly。listの既正常は同TagPicker/TagDialog classと不変更parent controllerの適用根拠で保持し、新しいlist直接操作と混同しない。既tag controller/pending/rollback integration不変更 |
| OR-08 | R9 rename/merge/delete/unused-cleanupの実影響と業務結果、非同期起点取消focus3幅。Tag owner9unitと旧capture直接red |
| OR-12 | R9 destinations/impact3幅・具体2人lost・同名mapping・取消起点・実移動後scope/同限定URL。Move owner9unit/旧capture直接red、既permission/version/epoch/quota/identity integration |
| ED-09 | R9 softtrash確認3幅/取消起点→実trash/restore、既原本・版/期限/失権 integration不変更。native focus4unit/旧close-only red |
| ED-10 | R9 purge確認3幅/取消起点・実受付回収、EmptyTrash実1件完了。R11 discarded確認の3幅実起点・対象保持、新5unit/旧pending中即時focus直接red。既5000/bounded/unknown/ACK等integration維持 |
| SH-01 / SH-02 / SH-03 / SH-04 / SH-08 | R9 owner/detail/editor/別editor/viewer3幅・audience3members/readonly/秘密操作無し・private-public-link/password/reissue/copyack・Tab/Escape/inner確認/actualtrigger。新SharingDialog3＋owner4unit、旧即時focus直接red。現認可/epoch/unknown/gate/read資源/URL失効は既integrationを不変更で維持 |
| UX-VISUAL | R9/R11全影響modalと共通callerのcanonical/white/semantic error/keyboard/3幅・AI対訳、旧native fixed包含のtop-layer解消。palette8vh/620/12/16–48・680/780/1100・bar56/longname/mobile既正準は関連selector不変更で保持 |

共通primitiveへのOR-09/IN-06/EX-02/WS-10/AC-07/WS-07/08/JB-03等の到達は、R9のBatch/Drive/ZIP/WS-delete/Profile/WS公開確認の各通常・取消・起点・3幅と全unit/Nodeで確認し、具体回帰無し。新modal操作や共有契約/port/DTO/schemaを加えない。未開始EmptyTrash-history取消等の原文異常は既integrationへ対応し、異常browserを追加必須にしない。

再実行入口は docs/browser_audio.md / docs/browser_ux.md、既 `pnpm test:browser:audio --root <new-owned-root> --port 4341 --audio-tools <owned600-json> --organize-local --ux-local` と既reject-only proxy。fresh source/HOME/TMPDIR、NixNode22.22.3/Unicode16.0/pnpm11.1.2/FFmpeg8.0.1、offline frozen install→規定品質/build→通常pnpm testを完走/実終了してからだけruntime、Chrome144/emptyconfig/毎CLI同proxy/no allowed-domains。R11各quality/full-start/end/exit、paths/full-source.json、evidence/browser.jsonlとnormal-final.pyに実根拠。実外部認証/接続/生成/送信/操作/費用/公開は未実行、loopback契約と分離する。新音声の認識品質・本番性能をlocal結果から主張しない。

本体/helperは候補通知後に全product/tests/config/docs/report変更と全環境操作をFREEZEする。helperは完了/全停止、自己test/diagnostic/runtime/proxy/browser/caller/child/listener全終了。次の作業はManager正式依頼まで開始しない。

# 統合読み1の修復 — 11ID候補、4377pass・品質0・自己正常終了

2026-10-13 23:09UTC。code `19aef0b12c9ed866745a1dcd480f35ea7373dd3a` は明示11pathsだけcommit済み。報告candidateは本fileだけの次commit（通知でfull SHAを確定）。対象はQA-TEST、IN-01/02、IM-01/02/03/06、OR-03、UX-VISUAL、UX-LOCATION、WS-07。独立report `b8f67719cc8668d3be824715408343007dbcb171` / reviews/integration-01-repair.md、採用design末尾のD1/B6・同ID名称投影が正本。最終R4の全 `pnpm test` は22:52:21.292227–23:01:54.225052UTC、exit0・4377pass（unit2770/200files、Node1537/128files＝通常1505＋全5formats32、CF70/10files）、skip0/unhandled0/failed0。規定型・lint:fix・format・lint・format:check・buildすべてexit0。局所unit12/Node80をfullへ重複加算しない。

同open paletteの旧100文字名→新名publishを実DOMで観測し、同時にspan/titleが新名へ更新・open/input focus維持。3幅の正準radius/shadow/8vh・検索/Escape、長名sticky/許可ellipsis/メニュー・候補Enter→本文を確認。23:08:00.434232UTC browser正規close0を先に確認→actual94295(runtime)/94419(proxy)へTERM→native/quiesce/drain/caller/harness両実exit0。23:08:14.638225UTC、捕捉自己8PIDとouter callers・browser/関連testprocess残存0、fixture由来5listeners閉。11対象source pathsはmainとbyte一致、起動は全suite caller終了後だけ。未特定の元失敗fieldをWALと断定しない。自己把握の残反例/必須未観測0、独立未受入。候補通知後は本体/helperの全code/tests/config/docs/report変更と環境操作をFREEZE。

## D1: 再現したfixture順序raceと元failedgateの限界

独立の通常fullは2回exit1。最初の公開検索503/500-child timeout、次のS3 FILE_CHANGEDについて、元failedrunのfield/file/主体/時点は未特定のまま保持する。後から保全DBのterminal状態や診断greenを失敗時snapshotへ読み替えない。元fullを負荷原因と断定しない。

S3 fixtureのfinishは、sweepLlmで非同期発進したworkerがDBへ書く間に全file guardを開始できた。新testで正規generatorを保留し、本人jobのWAL lstatの後に正規worker/UoWで完了・inactiveへ進め、元Statsを戻して本物open/fstatを実行するインターリーブを固定。これは原本/DB値の偽造ではない。pollの最初の本人readでもgeneratorを解除するため、修復順序ではsleep/負荷反復に頼らず完了後のsnapshotを検査できる。

停止済み診断sourceに先行guardを戻すと、旧FILE_CHANGEDが140msで赤（exit1）。正規WAL sizeが3,728,632→3,835,752Bへ変化した。最終testではdev/ino一致も実assertして旧順序を再検証する。診断filterで残23casesが未選択なのはfull skipとは別に記録。finallyでhelperをbyte復元。元独立失敗のfieldがWAL/sizeだったとは断定しない。

修復はfinishの先行guardを1行削除し、terminal＋当該execution.active=falseを待った後の全file guardを維持。O_NOFOLLOW/isFile/dev/ino/size/permission/root容量/DB容量/seed件数、閉鎖不明拒否・正常close/FK/checkpointの判定は不変更。単一writerの新回帰で本文採用/receipt.closed/sourceMemory0/inactiveと同guard成功を確認。元app23casesとnative8casesも同じguardで全通過した。

500-child caseは業務のbulk→fillBackupQueueを変えず、同じ全500 transfersの観測を500別read UoWから1つのread UoWへまとめる。全500件・found10・末尾original ordinal・unfinished1を維持し、500件の長さを追加assert。原5秒timeoutのまま。元単独2234ms、変更後単独2233msで、測定から速度向上や元失敗原因は主張しない。変更後4file並行の同caseは2453ms。余分なtransaction境界を除き、一貫したread snapshotで確認するtest-only変更であり、新bulk API/製品変更無し。

公開境界testは既NodePublicDiscoveryExecution.observeでsafe stage/elapsed/remainingだけを採取し、失敗のstatus期待に添える。deadline3000ms/close100ms・期待HTTP200/all50tags/51matches/cursor/assertsは不変更。局所実HTTPは成功し、first requestのcloseまで約1262ms・残budget約1738msを観測。元failedrunの未採取timingへ流用しない。最終fullはbrowser/runtime/proxy無しで直列実行する。

## B6: 同名template tokenとHollow正準を区別

index.md:80の明示3tokensをtokens.md/P10-notesの定義・利用箇所まで通読。palette-max620、radius-lg12px、shadow-lg `0 16px 48px rgba(0,0,0,0.1)`。既layout.cssへHollow専用radius/shadowを追加し、.browse-paletteだけで利用。汎用templateの同名radius-lg1rem/shadow-lgの値やtodo等には変更を波及させない。max620/8vh・可用height/内部scroll・検索controller/現在scope/タグ/Enter/Escape focusは維持。B6の3幅computed/操作・screensは最終全suite完了後のR4で観測した。

## 追加の実反例: publish後のscope名

R3の通常操作でWS一般設定の100文字名を保存→同WS notesへ戻る→直後Ctrl+Kを実行。キャッシュした旧BrowsePageが表示される間に開いたPaletteSession.scopeは旧nameを保持する。新pageの `.hollow-eyebrow` とheader summaryが新nameへ更新した後にも、同open paletteのspan/titleだけ旧nameを維持する実DOMを確認（old-scope-after-published.png）。同scope UUID/検索対象は同じ。Esc→再openや次回の通常訪問では新name。恒久DB cache破損ではなく、displayがopen時のsession snapshotを使い続けることが原因。

OR-03の現在scope表示、UX-LOCATION、WS-07保存後反映への具体反例としてManager採用。既browse model内のpure paletteScopeNameで、同workspaceIdの現在の認可済scope.nameだけを表示へ投影。別ID/metadata無しはsession名を保持。SearchPaletteには表示propを渡してspan/titleだけ更新し、session/条件/対象/権限/actor/location/ticket/候補/query/focus/effectsは変更しない。新共有state/port/DTO/schema無し。

unitは同ID更新/別WSとpersonal拒否/metadata無しの3分岐、実SearchPalette SSRは現nameのescape/title/text・既query/対象/権限維持を独立literal期待で検証。旧session名をspan/titleへ戻す停止sourceの変異は1fail/exit1（20ms）、finallyでexact restore。元名称変更後の同open publish前後は最終fixed runtimeで確認した。

R3はbrowser先close0→actual47443(runtime)/46901(proxy)へTERM→両native/caller/harness実exit0。22:46:46.222003UTCに自己12PID全gone、fixture由来4341/4350/56507/56508全closed、関連process0。R3のB6半径/影/3幅操作の成功は保持するが、追加scope表示の失敗は正常へ読み替えない。mobile幅driverの初回351期待はUA max-widthを含む実効341pxの取り違えであり、前候補の実測341/286と比較して修正。製品width不変更、これを新style修復とはしない。

最終R4は `/Users/hikaru/.local/share/hollow/verification/integration1-gate-1791931760823364000`。22:49:21.234650–22:50:49.203153UTCで規定全品質/build0。model11＋SearchPalette1＝unit12/2files/390ms、Node対象80/4files/45.07秒、skip0/unhandled0。全11source paths一致・変異復元後、22:52:21.292227–23:01:54.225052UTCに全pnpm testを完走し、exit0/4377pass/skip0/unhandled0。R3の全suite4373（unit2766/199files、Node1537/128files/全5formats、CF70/10files）は22:18:36.596182–22:29:36.550070UTC exit0/skip0/unhandled0。display修復後のR4 gateへ無条件流用しない。

## 今回の環境・実コマンドと失敗の分離

| root | 実結果 |
|---|---|
| R1 integration1-gate-1791929309273332000 | frozen install。新testのgenerator signal引数漏れで初回typecheck exit2。補正後へ成功を流用しない |
| R2 integration1-gate-1791929422225933000 | type0。新case初回はgenerator到達待ちがtimeout、22pass/2fail＋close unknown。共有fixtureに残る原本形式/当月利用を引き継がず、合法textと新月を明示するsetupへ訂正して同file24pass。旧先行guardだけ復元した診断1caseは実WAL size変化で140ms FILE_CHANGED/exit1、finally復元。元bulk単独2234ms/5秒 |
| R3 integration1-gate-1791929716580903000 | 22:15:16.905624–22:16:34.561254UTC、規定型・静的/build全0。app24/native8/public7/bulk41=80pass/4files、38.57秒・skip0/unhandled0。最終sourceの旧順序redも再確認→finally復元、変更後bulk2233ms/5秒。22:18:36.596182UTCに同source全pnpm test開始 |

R3絶対rootは `/Users/hikaru/.local/share/hollow/verification/integration1-gate-1791929716580903000`、sourceは同root/source。持続TMPDIRはtmp-pathに記録。HOME/PATH/LANGだけを引継ぎ、Nix Node22.22.3/Unicode16.0とpnpm exec Node一致、FFmpeg8.0.1、frozen/offline install。旧DB/保全root/他rootのデータは再利用しない。全実行は本体のみ、helperはreadonly調査を完了して全停止。helper書込/環境操作無し。実外部接続/生成/配送/費用無し。

再実行はfresh tracked source＋明示11pathsから、短persistent TMPDIRを設定して `env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop`。`pnpm install --offline --frozen-lockfile` → `pnpm typecheck && pnpm lint:fix && pnpm format` → `pnpm lint && pnpm format:check && pnpm build` → `pnpm test`。全suite caller終了後だけ docs/browser_audio.mdの製品harnessとdocs/browser_ux.mdのreject-only proxy/固定Chrome144/emptyconfig/毎CLI同flagsでB6を観測する。起動checkoutをrebuildしない。逆順でbrowserを実close→actual runtime/proxyへTERM→native/caller/harness exit0/全自己child/listener終了を確認する。

## 既受入への現在の適用

前独立a41558b/b8f6771のB1文書/B5位置の反例0を、文書・margin-top8vh/max620・controller/route/認可/worker全不変更を理由に現在へ適用。別freshの本文preview3幅・各reader680/list780/tile-calendar1100/bar56/長WS名ラベル＋許可ellipsis/mobileタグは、関連selector/値不変更を理由に維持。今回CSS到達はpalette自身のradius/shadowと共通rootの未使用専用varsだけ。新port/DTO/schema/共有native境界変更無し。S3 helper変更はapp/native両callerへ局所/全suiteで回帰する。残8IDの音声実処理/用途wire/原本・本文・undo・共有intent/privacy/取消/回復は製品完全不変更を理由に前独立へ適用し、共通QA gateは今回全suiteで改めて問う。

## 最終R4の正常・gate・影響と終了

R4 source/rootは `/Users/hikaru/.local/share/hollow/verification/integration1-gate-1791931760823364000`。`quality.log/start/end/exit` は22:49:21.234650–22:50:49.203153UTCに全0。停止sourceの旧label変異は22:51:42.814668–22:52:21.284636UTC、実SearchPaletteのtitle/text期待で1fail/exit1、finally exact restore。全11paths一致後にfull開始。unit2770/200files/30.44秒、Node1537/128files/495.65秒、CF70/10files/4.51秒、合計4377、end-to-end572.93秒。全5formatsは既app12/app-c9/native7/native-d2/native-e2。full.log/start/end/exit、post-full-state.jsonに実終了を記録。旧R3 full4373とは別の最終source結果である。

full caller終了と関連process0の後だけ、既public `pnpm test:browser:audio --root R4/runtime --port 4341 --audio-tools R4/tools/audio.json` とreject-only proxy4350を起動。Node22.22.3/Unicode16.0、同pnpmNode、FFmpeg8.0.1、fresh合成seed、固定Chrome144.0.7559.96/空config/毎CLI同proxy、allowed-domains無し。ブラウザは通常signin/DOM入力/submit/リンク/キー操作であり、内部state/APIを操作しない。`browser.jsonl` が全実コマンド・UTC・exitを記録、画像はevidence/。

| viewport | 正準top期待 / 実top | 実width / page | radius / shadow / 操作 |
|---|---|---|---|
| 1280×720 | 57.6 / 57.59375px | 620 / 1280px | 12px / rgba(0,0,0,0.1) 0px 16px 48px、東京4候補・Escape起点focus |
| 375×812 | 64.96 / 64.953125px | 341 / 375px | 同じ正準値・4候補・起点focus |
| 320×760 | 60.8 / 60.796875px | 286 / 320px | 同じ正準値・4候補・起点focus |

`normal-style.json` とevidence/<width>-palette-final.pngに実rect/computed/page/UA/フォーカスを保存。8vh/620/角丸/影だけでなく、内側auto scroll・box-sizing border-boxを維持する。幅の期待は既UAでのborder-box実効値、横中央の新基準は追加しない。

通常scopeメニューから編集fixture→WS一般設定、100文字の合法名「統合検証」＋長95＋新を保存→同WS notesへ通常リンク→直後Ctrl+K。次に末尾を次へ保存し同経路で戻る。`scope-published-final.json` は旧page/旧labelを3回、新page/新labelを4回目に実観測。page見出しは名称＋「 / ノート」、span/titleは名称そのもの。**同open sessionを閉じず**、page publish後にspan/titleも現在nameへ更新、open=true/input focus「ノートの検索語」を維持。旧R3反例の同タイミングと比較し、単なる再open成功を修復根拠にしない。scope-published-final.pngで実表示を記録。

同100文字名を1280/375/320でpaletteに表示、DOM/title全文と可視の文字ラベル・原文許可ellipsisを区別して確認。palette閉鎖→通常scroll500→header top0/height56、page同幅、scopeメニューも到達。`long-scope-final.json` と<width>-scope-final.png / <width>-scope-menu-final.png。共同編集検索1候補→ArrowDown/Enter→同WS detail/iframe本文・page320へ実遷移。条件/検索対象/権限を最新名へ付け替えていない。

driver失敗は製品と分離する。初回optionsを数値4と誤期待したが実出力は4候補の配列、固定len4へ訂正。Ctrl+KをBODYから起動した際の復帰先をsearch-triggerと誤期待したため、実起点triggerへfocusを置く通常操作へ分離しEscape復帰を検証。ページ見出しの「 / ノート」suffixを名称完全一致と誤期待した試行は、実name含有とspan/title完全一致へ訂正。製品をこれらdriver期待に合わせて変更しない。

| ID/到達先 | 最終根拠と現在適用 |
|---|---|
| QA-TEST | 順序raceの旧red→新24pass、app/native同guard、bulk/public原assert・期限保持、最終4377全pass/skip0/unhandled0 |
| IN-01/02・IM-01/02/03/06（6ID） | B1旧案内反例0の前独立をdocs/core/worker/native/config不変更として適用。今回fullは現在音声/非音声分岐を回帰。音声2段/用途wire/privacy/quota/取消/回復/原本版/undoは既独立の不変経路へ適用 |
| OR-03・UX-VISUAL | B6同種正準token、3幅位置/幅/候補/Escape/Enter実正常。radius/shadow以外のwidth/8vh/内側scroll/検索controller不変更 |
| UX-LOCATION・WS-07 | 同ID現在name projectionのunit3/SSR1・旧label変異赤、通常rename→同open publish前後の最新名/focus、3幅長名scope/scroll/menu。別ID/metadata無しは元名維持 |

既独立a415/b8fの本文preview3幅、680/780/1100/bar56・各reader/匿名/限定/password・合法長名/タグmobileは、到達するselector値/renderer/auth/URL/prefsが今回不変更という理由で適用。追加projectionは同ID表示propのspan/titleのみで検索session/effectsを変えない。accepted10IDへ無根拠reopen無し。新state/共有port/DTO/schema/認可/native境界変更無し。

23:08:00.434232UTC、専用browser正規close0→actual94295/94419 TERM→両native/caller/harness0。shutdown-tree/final.jsonに捕捉8PID（94005/94253/94289/94295/94296/94298/94419/94420）とactual servers・portsを記録。outer runtime/proxy exec callersも実exit0。23:08:14.638225UTCに全自己PID/関連root・browser/testprocess0、4341/4350/57897/57898/57899 connect拒否61。PID消失のみをclosed proofと称さない。code11paths main/source一致、23:09:31.447596UTCの最終照合でも管理領域を除くtracked source1633filesが全byte一致、関連process0。source再build/変更無し。helper停止・実外部未実行。本体/helper全変更と環境操作を候補通知からfreeze、Managerfiles/reviews/resume非変更。

# 前候補B1/B5の記録 — 4372pass・品質0・自己正常終了

2026-10-13 20:46UTC。code `abde1e8a3bc12fddad6ef06dea52979b4dbc05fc` をCSS/Node文書2pathsだけcommit済み、報告candidateは本fileだけの次commit（通知でfull SHAを確定）。残8ID（IN-01/02、IM-01/02/03/06、OR-03、UX-VISUAL）のB1/B5を修復。型・静的/build全exit0、B5の通常Ctrl+K/trigger/タグ・scope検索/Escape focus/3幅正常を実観測、自己native/caller/harness/proxy正常exit0・12PID/5ports閉。最終同source全suiteは20:33:28–20:44:19UTC exit0、4372pass（unit2766/199files、Node1536/128files＝通常1504＋全5formats32、CF70/10files）、skip0/unhandled0。最終core/product/config/lock/script1525filesとmain一致、変更docsも一致。独立未受入。

## 今回の正本と差分

独立修復検証は `a41558b6d3352c6c688865fde57fdd4422684ee8` / `.goal-implement/reviews/integration-01-repair.md`、採用design末尾は `a44e5ea`。同93項目/13phase、helper無し。製品変更はbrowse-paletteのmargin-topと可用max-heightだけ。docs/runtime_node.mdを関連LLM/OpenRouter/音声手順と実Node compositionに対照して通読し、File importsの旧段階案内と用途・構成条件を整合。文書mirror testは追加しない。

| 反例/ID | 修復と現在の根拠 |
|---|---|
| B1 条件4、IN-01/02・IM-01/02/03/06 | Node手順書全332行とllm_node119/openrouter_node63/browser_audioを通読。File importsのpersonal/private限定・image/audioの状態・旧未接続phaseを実編集可能scope/希望公開の保留/連携＋生成構成/明示noAIへ整合。validationはFFmpegを呼ばず、音声generationは設定式FFprobe/FFmpegを使うことを区別。所有節は現在version3/leased-local-v2・旧text provenance互換・source-bound lease/閉鎖ACKへ整合。Driveのlocal実Node経路と実Google/SDK未検証を区別し、既運用先データの成功は主張しない。server.nodeのreadNodeAudioTools/createNodeLlm、runtimeOwnershipのversion3/current predecessor proof、processJob/LLM入力stageと現在docsを照合 |
| B5 条件6、OR-03/UX-VISUAL | 正準index.md:80の上から8vh。既.browse-paletteへmargin-top:8vh、max-heightをmin760px/100dvh−8vh−24pxへ限定。width/色/入力/検索/認可/controller/route条件は不変更。Ctrl+K/通常trigger/絞込chipから開き、検索→候補/Enter、Escape→実起点focusを3幅で確認。横中央を新条件にしない |

## 最終source・品質・再実行

F5 `/Users/hikaru/.local/share/hollow/verification/integration1-palette-1791923142462136000`、sourceは新tracked展開＋明示browse.css/runtime_node差分、DB/objects/鍵/工具設定は新規。短persistent TMPDIR `/Users/hikaru/.local/hwt/ir1p82342000`。sanitized HOME/PATH/LANG、Nix Node22.22.3/Unicode16.0・pnpm exec Node一致、FFmpeg/ffprobe8.0.1/Python3.13.12、frozen/offline install。新工具JSONは700親/600通常file。build-before-runtime・稼働checkout再build無し。既DB/保全root/他runtime/秘密envを再利用しない。

20:26:07–20:26:35UTC、`pnpm install --offline --frozen-lockfile`→Node/Unicode/pnpmNode/FFmpeg実測→`pnpm typecheck`→`pnpm lint:fix`→`pnpm format`→`pnpm lint`→`pnpm format:check`→`pnpm build`すべてexit0（quality.log/start/end/exit）。変更2filesとmainのbyte一致をruntime終了後確認。型/port/schema/DTO・core生成処理・CSP/guard/deadlineの追加変更無し。

browser入口は既 `docs/browser_audio.md` / `docs/browser_ux.md`。F5で `pnpm test:browser:audio --root NEW_RUNTIME --port 4341 --audio-tools /absolute/owned/audio.json` と `pnpm --filter @repo/web exec tsx scripts/ux-browser-proxy.node.ts --port 4350` を使用。Chrome144.0.7559.96/空config/毎CLI同reject-only proxy・allowed-domains無し。proxyはforward/DNS/外部socketを作らない。正常は合成ownerの通常signinと既fixtureのみ、実外部生成/認証/送信/操作/課金/公開未実施。

## B5の期待と実観測

時刻・操作・exitはF5 browser.jsonl、位置/幅/focus/条件はpalette-measurements.jsonl、回帰はregression-measurements.jsonl、画像はevidence/。DOM rect/input/computed styleだけを観測し、app内部stateやAPIでUIを代替しない。

| viewport | 独立した仕様期待top | 実rect top / width / bottom | 実margin / max-height / page |
|---|---:|---|---|
| 1280×720 | 57.6px | 57.59375 / 620 / 335.5625px | 57.6 / 638.4px / 1280 |
| 375×812 | 64.96px | 64.953125 / 341 / 366.90625px | 64.96 / 723.04px / 375 |
| 320×760 | 60.8px | 60.796875 / 286 / 380.34375px | 60.8 / 675.2px / 320 |

期待はspecの8vhと固定viewportから置いた57.6/64.96/60.8で、production CSSから生成しない。CSS subpixel丸め差は0.03px以内。UAのdialog可用幅も含む実border-box値を記録し、token620をmobile全幅と混同しない。実top0の独立旧反例と現在のrect/画像で因果を確定。新しい横位置条件は追加しない。

通常owner signin→個人6notesのfragment解決後、search triggerへfocus→Ctrl+K→入力focus「ノートの検索語」→東京入力→4候補→Escape。全3幅でwidth/page/上記top、focusが実browse-search-triggerへ戻る。evidence `<width>-palette-8vh.png` / `<width>-palette-search.png`。

通常共通tag chipで4notesへ絞り込み→「＋ 絞り込み」→東京4候補。paletteの個人scope・一覧のタグ1件・既URLの1tagを保持し、Escape後browse-chipへfocus復帰（320-palette-tag-scope.png）。通常scope menuから編集fixtureへ切替→3合法seed notes→検索trigger→共同編集fixture1候補、current WS scopeを保持。Escapeでsearch triggerへ戻り、再度Ctrl+K→ArrowDown/Enterで実WS detail/iframe本文へ遷移（320-workspace-palette.png）。

通常WS一般設定で「統合検証」＋「長」96個のlegal100文字名を保存。WS detail/scroll620→Ctrl+Kの全3幅でも上記8vh、page同幅、stickyheader top0/height56、scope token rect top16.453/bottom38.547・幅288/114.40625/59.40625。文字ラベル＋原文許可ellipsisを保持し、palette内fixedScopeの同文脈と操作を確認（`<width>-long-scope-palette.png`）。全文常時可視は要求しない。

薄い到達回帰：通常list/tile/calendar buttonでmain780/1100/1100を1280幅で確認、375/320のpage・badge/tagは同幅。WS detail iframe/bodyを320幅で読める。browse-paletteのみの2宣言差なので、a41558bの認証18route/匿名5route・preview3幅・public/limited/password reader680・scope長名sticky56・タグ回帰・独立6音声/用途wire/regen/undoは現在適用する。raw/public/layout.css/hollow.css/workspace.css/ScopedNotesBoard/全core/native/recipe/dispatch/quota/認可は9000f81から不変更。変更が届くpaletteの以前top0は継承せず、今回実測へ置換する。

driverの失敗は実成功と分離：JSON eval戻りが二重encodedなのに一段だけdecodeした診断TypeError、WS seedを1件と誤期待したwait timeoutは未合格試行。既fixtureの共同編集/共同限定/非公開WS個別公開の合法3notesに合わせて通常DOMを再確認し、特定検索共同編集fixture1候補から実遷移した結果を根拠とする。製品/CSS/controllerをこの誤期待に合わせて変更しない。

## 7条件と今回の到達先

B1は実構成/提供機能/未実外部の事実とdocsを通して照合し、条件4の残案内を修復。B5は既spec・同種palette・3幅・controlsの条件6を実測し、条件1/7の通常検索・scope/tag/keyboard/focusを観測。既primitiveを保ちCSS2宣言だけなので不正状態型/境界変換/重複集約を増やさない。幅token・sticky・認可・shared state/controllers不変更を列挙し、既独立10IDの条件3/5適用を説明する。旧B2 literal境界と同変異red→restore、P11のsource/native/privacy/failure/回復・各異常integrationは不変更を理由に適用。文書mirror test/新受入基準無し。最終全suiteで現在の呼出元・共有状態・既受入を回帰する。

## 自己環境の正常終了と最終full

20:33:27.237UTC、専用browser aの正規close exit0を先に確認→actual17277(runtime)/17285(proxy)へTERM→両quiesce/drain/caller/harness実exit0。事前自己tree12PIDすべて不存在、4341/4350/49351/49352/49358全listeners closed。shutdown-start/final.jsonに時刻/actual/tree/portsを記録。browser bは未起動。OS不存在だけをnative/receipt閉鎖証明にしない。

同source `pnpm test` は20:33:28–20:44:19UTC、実exit0・10分51秒。full-start/log/end/exitに記録。局所/旧独立の数を重複加算しない。

| suite | files | pass | 実測duration |
|---|---:|---:|---:|
| unit | 199 | 2766 | 29.23秒 |
| Node通常＋全5formats | 128 | 1536 | 608.46秒 |
| CF | 10 | 70 | 5.82秒 |
| 合計 | 337 | 4372 | end-to-end651秒 |

全5formatsはapp12/app-c9/native7/native-d2/native-e2、残Node通常1504。skip0/unhandled0/failed0。テスト削除・skip/対象縮小・deadline/guard緩和無し。前4372とcase集合・assertions不変更で、最終CSSを含む全suiteを自身で再完走した。

20:45UTCの最終process確認でもF5/runtime/proxy/browser/test/quality processおよびheadless Chrome/agent-browser daemon残存0。指定Chrome binaryの実versionは144.0.7559.96（version commandもexit0）。browser b未起動・旧環境未再開。改変した2sourceおよびruntime関連1525filesとmainがbyte一致。本文preview/公開・限定読者3幅は独立a41558bの別fresh実測を、到達外のCSS/renderer完全不変更という理由で適用。B5の変更controlsは今回自身の実正常へ置換。

code `abde1e8a3bc12fddad6ef06dea52979b4dbc05fc` は明示browse.css/runtime_nodeだけ。報告は自身本fileだけを別commitし、candidate SHAをManagerへ通知する。本体の全code/tests/config/docs/report変更と環境操作をcandidate通知後freeze。helper無し・既helper停止維持。実外部未実行。B1/B5の元8IDについて本体で残反例/必須未観測と把握したものは0、独立判定は別。Managerfiles/reviews/resumeは変更しない。

## 前候補の記録

2026-10-13 19:45UTC。code `9000f81` を明示16pathsだけcommit済み。報告candidateはこのfileだけの次commit（通知でfull SHAを確定）。独立未受入。元93項目のうち、今回対象は16ID（IN-01/02、IM-01/02/03/06、OR-01/02/11、SH-05/06/07、UX-READING、WS-02、UX-LOCATION、UX-MOBILE）。独立報告 `.goal-implement/reviews/integration-01.md` / `73686288f1f987d52a0b0e38f6a63822c449c5bb`、採用設計design末尾 / `8ff0ec9` を正本として修復。元93項目・フェーズを増やさない。

最終sourceは `/Users/hikaru/.local/share/hollow/verification/integration1-repair-1791919518578723000/source`（以下F3）。mainの明示16 product/test/docs pathsとbyte一致して実行開始（後述の最終文書1文修復前）。型→lint:fix→format→lint/format:check→buildすべてexit0。局所unit13/13、audio Node30/30 skip0。browser主要正常成立後、19:34:10UTCに自己runtime/proxy/caller/harness実exit0、12PID/5listeners閉鎖確認。全 `pnpm test` は19:34:11–19:43:33UTC exit0、4372pass（unit2766/199files、Node1536/128files＝通常1504＋全5formats32、CF70/10files）、skip0/unhandled0。最終文書1文込みF4品質/buildも19:44:11–19:44:42UTC全exit0。19:44:57UTC自己test/root/browser process残存0を確認。元反例B1–4と追加UX-MOBILEを閉じた16IDの本体候補、実外部は未実行。

## 第一候補の元反例・対象・修復・有効な観測

| 元反例 | ID | 修復と根拠 |
|---|---|---|
| B1 条件4 | IN-01/02、IM-01/02/03/06 | `runtime_node.md`/`llm_node.md`/参照元`openrouter_node.md`の旧音声/LLM未提供案内を、実工具構成・用途別2モデル・STT/chat privacy・全frame/有限制限・quota/取消/回復・再実行入口へ整合。実sourceのconfiguration/worker/native/transcriberと照合。文書mirror testは増やさない。実121秒→2STT→chat、選択モデル保存・本文・同note再生成/undoの縦断観測を関連付ける |
| B2 条件2 | IM-01/02/03/06 | 元product分割規則不変更。unit旧6＋新2、Node旧28＋新2で文字数65519/65520をliteral固定。framing後 `[65536]` / `[65536,8]`、全文再結合、ordinal `[0]` / `[0,1]`、独立SHA256 identityをassert。停止F1だけで `>`→`>=` がunit2fail・Node2fail（ともにexit1）、finallyでexact restore |
| B3 条件6 | OR-01/02/11、SH-05/06/07、UX-READING | framework内の単一`layout.css`（content680/list780/wide1100/palette620/padding16–32/bar56）をappとescaped public/shared HTMLに使う。既一覧layout属性、既読書class、既履歴child領域に紐付け、同種画面のouter border-boxを実測。本文DEFAULT_DOCUMENT_CSS不変更。内部/public/limited/password後が同main680/iframe616/body568（desktop） |
| B4 条件1/6 | WS-02、UX-LOCATION | 既Shell headerをsticky top0/bar56、mobile relative解除、scope文字ラベルを残す。legal100文字名を通常WS一般設定で保存→読む間scroll後も可視。index.md:60の括弧どおり長名はellipsis許可、全文可視とは主張しない。scope/menu/auth/URL/prefs不変更 |
| 修復中の実反例 | OR-01、UX-MOBILE | F2 375px listでprotected/limited badgeに並ぶタグgroupが0basis flexにより2.1875pxに縮み、52.59375px chipが409.40625pxまでoverflow。既`flex:1`→`flex:1 1 auto`の1宣言でintrinsic幅による折返しへ。F2正常native停止後に変更、F3同6note解決後375/320でpage375/320・全chip右端内。タグ実除去→同候補再付与、他layout/readersも正常 |

## 第一候補のsourceと依存の適用範囲

製品shared port/DTO/schema/endpoint/worker/認可/原本/生成規則/時間上限変更は無し。新CSSはweb presentation内、core→web/React依存無し。public/sharedは既認可後HTML shellだけにCSSをinlineし、escape、CSP/headers、外部opt-in、本文/asset/grant/ledger snapshot stampを保持。body生成・FFmpeg・2段stage/epoch/recipe/dispatch/quota/lastUse/Drive copy+close+DBACKは不変更。

到達する呼出元を列挙：Shell配下の認証・個人/WS一覧・詳細・編集preview・upload・tags/trash・account/WS設定・用途モデル・処理履歴、ScopedNotesBoardのlist/tile/calendar、ImportJobs/BatchHistory/DriveBackupHistory/ZipHistoryの親子領域、publicPage配下のprofile/WS/discover/note、sharing pageのgate/許可済reader/error、command palette。既権限・mutation owner/pending/error/ticket/epoch/invalidateに変更無し。skiplinkのz-indexをstickyより上に揃え、keyboard到達を覆わない。

P01–P10/P11の独立根拠は、変更していないdomain/usecase/adapter/nativeの正常・異常条件へ適用。現在CSSの到達先については今回のdesktop/375/320・scroll・読者比較、実音声取り込み/同note再生成/undo・匿名限定本文で補完。既acceptedの好み再実装や全正常反復を追加条件にしない。全suiteで現呼出元・native/退会/Drive/原本/引用認可を回帰。F2とF3の製品差はbrowse-tags 1宣言のみなので、F2の他幅/読者/長名sticky/メニュー観測は不変selectorと値を理由にF3へ適用し、タグはF3の実解決済みnoteで再確認する。

## 第一候補の環境と実コマンド

| root | 短persistent TMPDIR | 結果 |
|---|---|---|
| F1 `/Users/hikaru/.local/share/hollow/verification/integration1-repair-1791918250639026000` | `/Users/hikaru/.local/hwt/ir139811000` | 新tracked source/patch。品質/build0、unit8/8、Node audio30＋HTTP19=49/49、17.99秒。runtime未起動。停止sourceでB2 mutant red→restore |
| F2 `/Users/hikaru/.local/share/hollow/verification/integration1-repair-1791918646013473000` | `/Users/hikaru/.local/hwt/ir113664000` | 既履歴child marker追加後の新checkout。品質/build0、unit13/13、Node49/49/23.07秒。375 list overflowを実観測して非合格として残し、自己runtime/proxyは正常終了 |
| F3 `/Users/hikaru/.local/share/hollow/verification/integration1-repair-1791919518578723000` | `/Users/hikaru/.local/hwt/ir1483814000` | 1宣言修復後の最終checkout。品質/build0、unit13/13/527ms、audio Node30/30/17.70秒。主要正常/browser/自己native0。最終full4372/skip0/unhandled0 |

すべてgit archive tracked HEAD＋明示対象差分、新DB/objects/鍵・工具設定、sanitized HOME/PATH/LANG、Nix固定Node22.22.3/Unicode16.0、pnpm exec Node一致、FFmpeg/ffprobe8.0.1、frozen/offline install。自己OS一時領域へ永続データを置かず、既secret env/旧worktrees/旧DB/保全root/他rootを再利用しない。build-before-runtime、稼働checkout再build無し。工具設定`tools/audio.json`は700親/600通常file。

規定コマンド（各source root内）：

```sh
pnpm install --offline --frozen-lockfile
node -p 'process.version + " Unicode " + process.versions.unicode'
pnpm exec node -v
ffmpeg -version
pnpm typecheck
pnpm lint:fix
pnpm format
pnpm lint
pnpm format:check
pnpm build
pnpm exec vitest run --config vitest.config.ts \
  packages/core/src/application/llm/audioWorker.test.ts \
  apps/web/app/components/hollow/ImportJobs.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts \
  packages/core/src/adapters/libsql/__tests__/llmAudio.integration.test.ts
pnpm test:browser:audio --root NEW_OWNED_RUNTIME --port 4341 \
  --audio-tools /absolute/owned/tools/audio.json
pnpm --filter @repo/web exec tsx scripts/ux-browser-proxy.node.ts --port 4350
pnpm test
```

F3の局所scriptは誤った`vitest.config.unit.ts`を指定して起動exit1（製品/テスト実行前）。正規`vitest.config.ts`へ訂正しunit13/13を確定。HTTP局所pathも初回誤指定で選択されなかったため、F3の局所数へHTTP19を加算しない。F2の正規`apps/web/app/worker/node/__tests__/sharingHttp.integration.test.ts`19成功と最終fullで補完。製品変更/skip/対象縮小による緑化ではない。局所数をfull数へ重複加算しない。

## 第一候補の実browser正常（期待と実際、全時刻UTC）

毎CLI同Chrome144.0.7559.96・空config・owned reject-only proxy4350、allowed-domains無し。専用session F2 `hollow-i1r-a/b`、F3 `hollow-i1r3-a/b`。`browser.py`が開始/終了・操作・exitを`browser.jsonl`へ記録（fill値非記録）。DOM rect/computed style/input valueだけを観測、app内部stateやAPIで正常操作を代替しない。measureは2animation frame後、outer main/iframe/body/pageを別記録。screenshotsは各rootの`evidence/`、一覧`measurements.jsonl`。

| 主要画面 | desktop1280実値 | 375 / 320実値と操作 |
|---|---|---|
| 個人list / tile / calendar | main780 / 1100 / 1100、bar56 | 各main375/320・page同幅。F2のlist375は409で非合格、F3タグ修復後全3形式同幅。通常layout button/URL切替 |
| 認証detail / public / limited / password後 | main680 border-box、padding32×2、iframe616/body568 | main375/320、padding16×2、iframe343/288・body295/240・page同幅。隔離本文とshared公開範囲/asset/controls保持 |
| password gate | main780、許可前iframe無し | page375/320。通常password入力→閲覧button→同reader680。許可前後の別layoutは意図通り |
| WS読書/100文字名 | scrollY1000後headersticky/top0/height56、scope top16.453/bottom38.547、幅288・文字＋ellipsis | 375 scrollY1846/token114.406、320 scrollY1890/token59.406。文字ラベルをbar内に常時残し、全文をDOM/menuに保持。token/menu押下で個人/WS・tag/trash/設定入口到達。原文許可のellipsisを全文可視とは扱わない |
| profile/用途モデル/WS設定/upload/tags/trash/publicprofile/discover | 作業main780。実job親子main1100。paletteCtrl+Kで620 | 各page375/320。設定は通常正規routeの実heading/controls解決後、scopeと本人入口を区別。F2誤route404測定は正常根拠へ加算しない |
| F3 protected badge/タグ | listの既tag groupがintrinsic幅で折返す | 375 actual6cards/page375/chip最大right351.875、320 page320。dialog開閉/Escape・実共通除去→検索候補3件から再付与→chip復帰/375保持 |
| F3実音声upload→完了→regen/undo | main680/iframe616/body568（本文）、親履歴1100 | 375/320全page同幅、両用途select/catalog/confirm操作・原本link・通知/history・本文/undo・限定読者に到達 |

F3実音声：通常OpenRouter連携→owned consent同意→結果の設定link→文章/image/STT用途を各v2へselect（DOM value確認）→保存。通常uploadで121秒`audio-chunks.wav`、希望限定公開。19:30:37UTC 実FFmpeg/native→STT2request（1,920,000/16,000frames、3840044/32044bytes、fixture/stt-v2、deny/zdr）→chat1（fixture/text-v2、deny/no-fallback/require-parameters）→同note完了1/失敗0/取消0、使用1/予約0・限定適用。19:31:16UTC同note置換confirm→同2STT+chat→完了・再生成前の本文に戻す操作confirm→旧本文保持。使用回数は戻さない。通常共有panelの実readonly URLを匿名Bで開き、実iframe本文・秘密編集操作無し・desktop375320共通read幅を確認。実provider wireはF3`runtime/integration-local/requests.jsonl`の安全model/privacy/frame/timeのみ。

既原文の音声全異常、5codec/WS/Drive/別editor・初回intent/月間枠/unknown/no-resendはff15c55のP11独立根拠に今回不変更のcore/native/authorityを理由に適用し、B2追加はSTT応答→構造化sealの実DB経路に対応。ローカル合成結果を本番STT認識品質/料金/privacyの実証とはしない。実外部通信・生成・送信・操作・課金未実施。

CLI試行は実観測と分離：F2 `.command-palette`誤selectorwait timeoutの後、実`.browse-palette`open/width620を確認。F3callback結果で設定へ自動移動すると誤期待したwait、未提供optionの初期待機、find-select未対応、undoの誤ラベルwait、tag exact候補の誤期待waitは正常結果にしない。実route/link/select値/save/wire、実undo button/confirm、実tag候補clickと最新DOMで成立した操作だけを根拠とする。JavaScript confirmはdialog acceptで通常承認し、blocking snapshotを製品失敗と扱わない。navigation直後skeleton幅は解決済み6/7cardsの幅と分ける。

## 第一候補の同じ7条件による候補根拠

1. 元要件・採用designへB1–4と追加UX-MOBILEだけを対応。shared CSSを既real HTTP/RSC/escaped readerへ接続し、実frame/scroll/タグ/音声workerまで観測。stub/未接続へ置換無し。
2. B2は仕様由来literal境界＋全文/identity/ordinal、同変異unit/実DB双方red→restore。B3/4/mobileは独立旧反例/現F2失敗→実ブラウザの幅/scroll/操作/スクリーンショットで因果。文書mirror testを増やさない。既P11の別分岐4redと全異常integrationはcore/native不変更を理由に適用し、今回B2の代用にしない。
3. 全共有到達先と各CSS ownerを上段に列挙。認可/HTML・asset・grant stamp/retirement/native/生成・retry・publicintentの既受入はproduct不変更の意味と最終全suiteで適用。タグ1宣言は解決済みcard/実操作/全layout/readersで回帰を確認。
4. 型/静的/build全0と同source全suiteを確定し、既Node/音声/UX再実行docsからpublic入口を使う。今回docsの古い3参照元の案内を実装へ照合。説明のためだけのコメントや公開testdoor追加無し。
5. 共有契約/意味型/集約/副作用は不変更。presentation layout値の正本を1CSSへ集約し、既display conditions/classだけで幅を選ぶ。次のlayout値変更はlayout.css、表示形式への割当変更は既board/class selectorに局所化し、公開/限定も同正本へ波及する。重複のmagic幅/新domain state無し。
6. 同種reader4種類・3layout・gate/作業/履歴・長WS名をdesktop375320で比較。操作/値/ラベル/許可ellipsis・keyboard menu/paletteと日本語を保持。現mobileの具体overflowだけを修復、好みや別a11y標準を条件へ足さない。
7. 通常signin/link/save/upload/regen/undo/tag/panel/password/scrollを実browserで行い、期待/actual/screenshot/JSONLを上段に記録。CLI ACK/未解決fragment/誤wait・未実外部は成功観測へ混ぜない。

## 第一候補の所有・正常停止

F2：19:24:54.204UTC、browser A/B close exit0を先に確認→actual93914/runtime、94090/proxyへTERM→両session exit0。自己9PID群不存在・4341/4350/61602/61603/61605すべてclosed。375overflow rootは保持して成功へ読み替えない。

F3：19:34:10.592UTC、browser A/B close exit0→actual3210/runtime、3209/proxyへTERM→native/caller/harness両session exit0。事前に収集した自己tree12PID（3124/3127/3132/3160/3166/3197/3198/3209/3210/3211/3212/3213）すべて不存在・4341/4350/62035/62036/62038 closed。native終了はsession exit0とdrainで判断し、OS不存在だけをreceipt閉鎖証明へ転用しない。`shutdown-start.json`/`shutdown-final.json`に時刻・actual/tree/ports記録。

補助1名は2test pathsだけを書込し完了停止。環境/報告/commitは本体のみ。Managerfiles/reviews/resume/旧worktrees/旧DB/保全root/実外部/goal API操作無し。候補後、helper含む全code/tests/config/docs/report変更と環境操作をfreezeする。

## 第一候補の最後の文書1文と全suiteの適用範囲

全suite中の最後の参照検索で `openrouter_node.md:3` にも旧「Audio generation is not provided」1文が残ることを確定。B1同scopeとしてWAV/MP3/M4A/Ogg/FLACの専用文字起こし→本文構造化と工具構成へ訂正。F3稼働時のproduct/test/config/lock/scriptは不変更、既全通常操作とfull実行対象に追加製品差分は無い。

Managerはこの文書だけの差について、精密比較と最終品質を条件に同じ全suiteの追加反復不要を採用。F3と最終mainのtracked product/tests/config/lock/script/infra1524files＋新layout.cssがすべて一致することを比較し、差分は `docs/openrouter_node.md` の1文だけ。新fresh F4 `/Users/hikaru/.local/share/hollow/verification/integration1-repair-1791920250682223000` / TMPDIR `/Users/hikaru/.local/hwt/ir1089970000` に最終文書込みsourceを再構築して規定品質を19:44:11–19:44:42UTCに実行し、typecheck/lint:fix/format/lint/format:check/build全exit0。mainの明示16pathsと最終F4 source一致。F4はruntimeを起動しない。F3の全suiteは実行sourceとしてそのまま記録し、文書修復後の最終候補へ適用する理由をこの同一性に限定する。

## 第一候補の最終full・候補

F3 `full-start` 19:34:11UTC、`full-end` 19:43:33UTC、`full-exit` 0。合計9分22秒。単一最終fullの内訳（局所を加算しない）：

| suite | files | pass | 実測duration |
|---|---:|---:|---:|
| unit | 199 | 2766 | 20.70秒 |
| Node通常＋全5formats | 128 | 1536 | 531.68秒 |
| CF | 10 | 70 | 4.64秒 |
| 合計 | 337 | 4372 | end-to-end562秒 |

Nodeのformatsはapp12/app-c9/native7/native-d2/native-e2、各groupが既configの別projectで成功。残通常1504。skip0/unhandled0/failed0。既baseline4368に既fileへ新unit2＋Node2の4caseを加えた4372で、既test/guard/deadlineを削除・弱めていない。

code `9000f81` は16 product/test/docs pathsだけ明示stage/commit。報告は本fileだけを別commitしてcandidate SHAをManagerへ通知。全helper停止・本体全code/tests/config/docs/report変更と環境操作を候補通知後freeze。最終自己プロセス確認19:44:57.919UTCでF2/F3 runtime/proxy/browser/全test-root processなし。F1/F4はruntime未起動、全quality/test execも正常終了。実外部生成・接続・送信・操作・課金無し。残反例/必須未観測を本体で新たに確認したものは0、独立合格は別判定。

再実行はcandidateのtracked archiveを新persistent sourceへ展開し、上段環境・規定commandsを使う。正常入口は `docs/browser_audio.md` / `docs/browser_ux.md`、工具構成と回復は `docs/llm_node.md`。browser用新rootのfixture.jsonから本人/WS/note/共有URLを取り、同じviewport1280/375/320・resolved fragment・border-box rectで比較する。長WS名は通常一般設定でlegal100文字を保存し、reading scroll後のheader0/56と文字＋許可ellipsis/menuを観測。今回F2/F3のroot・measurements.jsonl・evidence/・browser.jsonl・provider安全wire・shutdown proofは上段の根拠で、旧rootを再起動する手順ではない。
