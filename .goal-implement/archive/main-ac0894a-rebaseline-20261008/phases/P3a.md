# P3a ワークスペース作成とscope基盤

P3a-A〜Fの完了候補。6項目と共有36項目の変更境界について自己検証を完了し、独立検証へ返す。招待・role管理UI、移動、全文検索、WS削除は後続。Managerへの追加判断依頼はない。最終識別と操作停止は末尾を参照。spec/spec-implementとgoal APIは使用していない。

## 開始保全

開始HEAD `449068f35871fa8c07bd36d0d7921f56d937e255`。開始製品差分0、lock `7789972514666bf5fbc61f775887a43b0c71678cd854f9758459cf9aa385b3bf`、bundle `0c81aafa1c49a590e52f93db9cc57c00afb5fb017d6fa7ac5df78760b3eecc4b` は照合。633path/source `a0e3cd27f2f482a73e47df50e5b96023e6fd57618f49074eeb3dde3f121dec54` は独立受領値であり、実装前の自己再hashは未実施。

新online backup `/tmp/hollow-workspace.CgEtgi/baseline.db`。2026-09-10T15:46:14.091+09:00、旧513notes/64assets/847revisions・非active11、原本/asset/companion計439objectsのbytes/hash一致、旧35tableの全旧列EXCEPT差0、FK0。前段取消11noteと385B原本を含む。旧資材・backup・objectは保持。

0012はWS/membership、note creator unknown、batch/draft/bundle/reference objectの受付scope。0013はempty固定scope、purgeのscopeとnullable人物欄。旧purgeは全旧列を保持し、cause=expiredは旧人物欄をsystemの権限根拠にしない。新manualは人物必須、新期限はsystem/人物null。generated0013の新列SELECTは移行元に未存在のためNULLへ修正し、未適用cloneから検査。

2026-09-10T16:07:35.962+09:00、Node22.22.3/libSQL0.18.0の公開migrationで `/tmp/hollow-workspace.CgEtgi/clone.db` 適用。旧35table全列差0、439objects一致、FK0。16:08:29.799、個人14accountの旧3repo容量と新scope容量を同clockで照合し総29,370,757B・差0。旧creator513件はunknown。manual actor CHECKを追加後の新cloneは最終移行前に再検査する。

## 実装接続

- WS作成・参加先ページ・slug照会・metadata一覧・専用容量readの型付きport/DTO。現存creator20、入力codepoint/slug、50keyset、60/min、slug候補。現在membershipとowner scopeを分離する。
- note save/history/style/preview/WYS context、current/history媒体と原本、import受付/遅いcommit、reference workerを現在scope policyへ接続。draftは作成者限定。原本uploader・note creator・job actorは容量ownerと別。
- 別editorの取消済原本reimportは現在actorの新batch/job。旧本人job read/retry/cancelを開放しない。初回display整合回収も記録actorと現在権限で判定。
- scope容量は既存provenance行から集計し、物理object/claimを複製しない。同梱は保持scopeごと全量1回、受付予約→保持で二重計上しない。未採用reference object、未bind media、failed cleanupも保持する。
- scope trash/restore、empty集合、manual/期限purgeへ接続。本文/版/pin数・物理claim/FD方式は変更しない。
- `/notes` は非await RSC promise＋Suspenseを維持。scope/usage/itemsを同queryから親clientへseedする。`/trash` の既存typed loader例外はそのまま。

UI補助はweb31fileのみ担当し、16:11までに型・限定82tests・整形成功後停止。DB/build/browserは未操作。mainが全体統合・最終検証を担当する。

## 途中検証

- 16:06、新WS実DB7件のうち5成功。新thumbnail queryの誤列revision_noをversionへ修正。media試験のinline検査port欠落を実adapterへ修正。
- 16:07:36開始、修正後新WS7＋既存references35、計42成功。role/current actor conflict、creator/uploader保持、別actor reimport、scope容量競合、system期限を含む。
- 16:10、追加跨scope companion/最後scope cleanupの実storage故障→回復は成功。未採用object fixtureはterminal後の新upsertを既存fenceが拒否したため、正当なrunning時保存→cancel順へ修正。
- 16:11:38開始、新WS実DB9件成功。held companionの最後実削除前charge保持・actual removal後解放、未bind/failed/reference objectの154B維持を含む。
- 16:11、typecheck→lint:fix→format成功。既存Biome22warning/29info、error0。新routeTree生成後のweb型も成功。最終sourceは後続変更後に再実行する。

## 未完と後続境界

16:18:24.981、manual actor CHECK を含む `clone-final.db` は旧35table全旧列差0・439objects一致・FK0。16:21:00.926、同cloneの個人14account旧新容量29,370,757B一致。16:20:21開始、新WS実DB11件成功（追加history current分離、別scope unbound draft拒否、現在権限失効後のpurge再受付拒否、参照actor/取得中失効不採用を含む）。

全unitは16:14:04開始515成功。全Nodeの途中並列185/189は失敗4件であり合格に数えない。無変更認証5秒timeout、原本error code不一致、自己期限fixtureの誤変更位置2件を分離する。原本は従来の非権限/不存在ORIGINAL_NOT_FOUND、認可済み原本の非active NOTE_NOT_FOUNDを維持する修正で、旧assert自体は変更しない。途中直列184/189はrequireNote import追加前のbundleを実行した失敗。追加import後、16:20:59開始の最終直列Nodeは190/190成功（55.99秒、timeout未変更）。16:20の規定typecheck→lint:fix→formatも成功。

16:21、既知PID93756のcwd・同DBを照合してTERM、旧session84577 exit0/drain。`lsof` のDB絞込みでオプション順誤りを一度出したが、対象PID/DBのみの照合結果であり他processは調査していない。buildと0012/0013本体適用を開始した段階。actual UIはまだ未実施。

owner UIと多role隔離DBを区別する。招待/role UI、検索等、scope移動、WS削除、public/Driveは未実装。Q2の移動中I/O世代は契約のみで実装成功を主張しない。codec/SSRF/PM/20版数/FDは不変方式の既存根拠を適用し、今回変更した認可/容量/actor/read/runtime接続を検証する。

## 本体接続と局所回帰（16:44時点・未固定）

本体0012/0013移行後16:22:40.914、旧35table全旧列差0・439objects一致・FK0・旧513/64/847/非active11を確認。16:24:41.379、個人15account（今回自己の空accountを含む）の旧新容量29,370,757B一致。旧未知creator513を維持した。

16:28:58開始の直列unit515/51suite成功、16:31までの規定checks/build成功。scope-aware jobs/upload/toastリンクとmetadata画像thumbnailを追加した同bundleをPID5548/session83443で起動した。16:42:27開始の新WS実DB11件は全成功。原本はuploader本人に限定せず、現在owner/editor/viewer全員成功、membership失効はORIGINAL_NOT_FOUND、trashは既存NOTE_NOT_FOUNDを維持する。

自己account `p3a-owner-0910@example.test` のみで以下を実操作した。機械的待機/故障hookは本人tab限定でfinally解除し、trusted入力と区別する。

- WS作成・重複slug候補・候補採用・作成POST失敗の入力保持→再試行成功（16:35:45.293）。不正scopeから個人へ回復。
- WS新規WYS title/body→同ID autosave、媒体1個のみ→同ID/stable asset/再表示。媒体のみのserver既定titleは「無題」。初回helperの空title期待は誤りであり修正後の継続helperで表示を確認。
- HTML/CSS/PNGの明示companion batch→同WS原本・CSS・PNG内部asset、現在2/2 acquired、青い文字と画像をiframeで表示。通常PNGを明示companionへ変更した。
- 390px一覧、detail→trash→直後undo。HTML→visualで選択Textを直接編集・保存・detailの完成iframeを確認。CLIのCM fillは全文置換でなく追記になったため、全文置換成功とは扱わない。
- 別自己WSに通常create/save usecaseで51件（147.1ms）を作り、実UI50+1・重複0・2ページreload・前頁/390px成功（16:34:05.381）。最初のhelperは閉じたchooserの同名ボタンを誤選択したため、可視要素選択を修正して再実行した。
- 受付済みWS uploadのXHR保留中にpointerで個人を選んだ試行は、解放後にWS詳細へ遷移した。ただしpointerによる離脱・confirmの成立が未確認だったため、製品不具合の実再現という初期分類を撤回した。修正後の同pointerでも同様で、既知ボタンfocus＋trusted Spaceならconfirmを1回観測できる。mountedだけでは遷移中の旧完了を排除できないコード上のriskに対し、承認済み離脱refを局所追加した。旧bundleの再構築・実不具合再現成功とは扱わない。最初の保留fixtureはsend前abortがabort eventを起こさず、取消受付後もclient待機が残った。これは送信前hookの問題で、当該自己batch取消→reloadと新しい試行を分けた。旧データへのcancelは行っていない。

16:43以降は同局所修正のchecks成功、PID5548を正常TERM/drain/exit0して再build中。最終bundleの元再現・取消/通常完了と残UI、最終保全・commitはまだ未完了。

## 最終結果（2026-09-10）

上記は途中時点の記録。以降は最終製品sourceとbundleへの自己検証結果であり、独立合格ではない。時刻はすべてJST。実行helper・fixture・画像は `/tmp/hollow-workspace.CgEtgi` に保持した。

| 項目 | 実装と自己根拠 | 後続との境界 |
| --- | --- | --- |
| P3a-A | 型付きWS/membership、作成・切替・slug照会候補。実DBの入力/creator20/一意競合・候補、実UIの新規作成、duplicate候補、失敗入力保持→retry、keyboard/390px。 | 複数role UI・招待は未接続。creatorは旧unknown/新actorを区別。 |
| P3a-B | 同一queryのscope/usage/metadataをRSCから親islandへseed。updatedAt＋IDの50keyset、現在membership、scope cursor検証。実DB同時刻51と別scope拒否、実UI50+1/重複0/reload/back、遅い旧scope応答不採用。 | 全文検索/タグ/任意sortは未実装。/notesの非await promise＋Suspenseを維持。 |
| P3a-C | 新規/media-only/HTML-CSS-PNG companion取込を受付scopeへ保持。3mode本文保存、両display、参照off/on既取得reuse、原本、履歴媒体/復元。承認済みupload離脱の遅い成功/失敗、取消なら正常完了移動。 | 実UIは自己owner。原本/内部媒体は本体認可経路。外部fetchは今回のWS試験ではtest portのDB根拠と区別。 |
| P3a-D | read/edit/actor/current-activeを共通policy化。実DB owner/editor/viewer/非member、creator/uploader・jobactor分離、別editor reimport、他actor exact確認、draft非公開、current/history分離、遅い失効commit拒否。実UIのviewer/非member失効は自己membership行の故障fixtureで最新4key回収→owner復帰→同note保存。 | P3bのrole操作UI・招待成功とはしない。旧20版・pin数/PM方式は変更していない。 |
| P3a-E | 個人5GiB/WS20GiBの専用capacity port、DB provenanceによる受付/保持/cleanup charge。実DB境界/競合・最後companion・失敗削除154B保持、scope trash/restore/purge/empty/system期限。実UI原本52B単一purgeと2原本108B emptyの物理不存在・容量0。 | scope移動のgeneration実行は後続。物理claim/FDを再設計せず、元uploaderをcharge ownerにしない。 |
| P3a-F | 0012/0013のbackup→2clone→旧全列/個人charge→本体移行、最終515unit/190Node/checks/build、同bundle実操作・画像自己確認、旧35table/439objects保全、明示99path commit。 | 全OS/全browser保証はしない。通常IME/nativepaste/OSdropの以前の未確認は保持。 |

### 最終コマンドと適用

repo root、Node22.22.3、既存libSQL0.18.0。依存/lockは変更なし。単位系はGiB＝1024³、容量比較は実bytes。

```sh
pnpm typecheck && pnpm lint:fix && pnpm format
pnpm exec vitest run --exclude '.goal-implement/**' --no-file-parallelism
pnpm exec vitest run --config vitest.config.integration.node.ts --no-file-parallelism
pnpm build
```

- 最終規定checksは16:43台、session10935 exit0。Biome error0、既存warning22/info29。最終ImportUploadの離脱所有修正と原本role回帰を含む。
- 最終buildはPID5548を正常TERM/drainした後、session61434 exit0（16:44台）。16:45の最初の最終bundle UI以前に起動済み。新production71966/PID34171。これ以後、製品sourceの変更はない。
- 最終unitは16:59:20開始、27.31秒、515/51suite、session54458 exit0。管理用suiteだけを明示除外し、製品test除外なし。
- 最終Nodeは17:00:19開始、70.29秒、190/16suite、session30292 exit0。新WS11・既存purge/reference/empty等を含む全Node。以前の並列失敗と直列成功は別記し、5秒制限を緩めていない。
- 新WS11は16:42:27開始、4.76秒で成功し、最終全Nodeでも再実行。owner/editor/viewerの原本成功と失効拒否を含む。helperのschemafixture誤り/CLI選択誤りを製品成功の代用にしていない。
- 全製品変更は `P3a-product-paths.txt` の99path（既存78＋新21）。schema2本とmeta、workspace11実DB、transport純粋test、backup scope testを含む。生成routeTreeも対象。管理資料、旧spec、ignored DB/env/build/temp、lockはstage対象外。

### DB・port検証の対応

`packages/core/src/adapters/libsql/__tests__/workspace.integration.test.ts` の11対は小さい隔離DBと実storageを使う。実ブラウザや実外部サービスへ読み替えない。

1. 名前/slug/creator20の境界・競合、一意判定と代替候補を分離。
2. 51同時刻metadata keyset、cursor scope不一致・非member・個人の正常対。
3. owner/editor/viewer/nonmemberのread/save/style/trashとcreator保持、異なるactorのexact-current確認後再進行で再確認。
4. 原本は現在owner/editor/viewerに成功し、uploader限定にしない。失効はORIGINAL_NOT_FOUND、非activeは従来NOTE_NOT_FOUND。別editorのcancelled reimportは新actor batch/jobとし、旧履歴/retry/cancelは旧actor専用。creator/uploader不変、conversionの遅い失効結果不採用。
5. draft creator-private、現在editorの媒体参照。current除去でcurrent URL拒否、保持history pin＋現在viewerなら履歴URL成功、失効なら両方拒否。
6. unbound draftの別scope保存はatomic拒否。既存purge requestの再受付も現在edit権限を再検証し、既fenceの回収を取り消さない。
7. 実NodeReferenceProcessor＋test公開fetch portの正常PNG scope chargeと、取得中失効でcancel/no採用を確認。実外部fetch/SSRF方式は無変更根拠を適用。
8. scope trash/restoreの本文/版/updatedAt保持、emptyの個人分離、新期限initiator system/人物null。
9. 正当な隔離予約を用いたWS20GiBの容量境界・競合・cancel後charge保持。巨大binary生成や本体巨大quota改変なし。
10. companionを2WSで保持し、同scopeの複数noteでも全量1回、最後scopeのremove失敗でcharge保持、再試行実削除後解放。cross-scope関係はDB fixtureであり、未実装のmove成功ではない。
11. 未bind媒体71B＋未採用reference83Bをcancel/cleanup前にも受付scopeへ154B保持。note joinから消えたことをcharge0にしない。

### 最終bundle実操作

本人account `p3a-owner-0910@example.test`、専用 `p3a-main` のみ。fixtureの遅延・network失敗・membership一時変更は操作到達を測り、finally復帰。パス/IDは再検証用で、認証値・Cookieは記録しない。

| 実時刻 | 対象/資材 | 結果 |
| --- | --- | --- |
| 16:34:05.381 | pages.cjs、WS `01a08a3a-062f-73bf-985e-a4719772fcba` | public create/save usecaseで51自己note作成147.1msと、実UI50+1/全51一意・reload/戻る/390pxを分離。全51のtrusted作成とはしない。 |
| 16:35:45.293 | creation-recovery.cjs | 重複slugに3候補、作成POST失敗の値保持→同入力retryでWS3作成、不正scopeから個人へ回復。 |
| 16:45:48.853 | captured-upload.cjs leave | XHR保留→既知chooserボタンfocus＋trusted Space→confirm1→解放、個人の選択を維持。元受付/job/noteはWS1に残る。 |
| 16:46:44.949 | 同 cancel | confirm false1回で離脱しない。旧modeを暗黙queueせず、正常upload完了は同WS詳細へauto navigate。 |
| 16:46:46.494 | 同 fail | 承認済み個人離脱→当該XHR失敗でも個人を維持。後の新uploadは通常完了移動し、旧finallyが新操作をresetしない。 |
| 16:49:20.355 | lifecycle.cjs/purge-proof.mjs | 自己原本52B attachment実download一致→trash404→残30日/restore200→再trash→purge取消→実行。note/object/原本は実消去、intent/object done。 |
| 16:49:46.250 | history-media.cjs | media-only noteへtitleだけ保存→履歴1の同assetを履歴URLで実描画→restore「無題」・reload・iframe1。 |
| 16:52:39.544 | style-reference.cjs | 同媒体をoriginal/defaultで実描画、表示設定reload維持。bundleの取込off→onでも既取得2をreuse、同asset/青色CSS維持。 |
| 16:54:15.561/794 | empty-ui.cjs/empty-proof.mjs | 新自己2原本54Bずつ、2件固定確認の取消/実行、物理2消去と完了/容量0を別確認。初期54B処理中を成功にせず再読込。 |
| 16:55:26.764/779 | recovery-ui.cjs | 自己WS3だけowner→viewer→nonmember。current/reload両状態で最新title/html/modeを4key JSONへ回収。server本文/versionは失敗中不変。membership全列ownerへfinally復帰確認。role UI成功ではない。 |
| 16:57:37.292 | 同復帰後継続 | 退避復元→既存WYS確認→enabled完了→同noteへ最新本文保存。helperの旧ボタン名/確認待ち不足を修正した継続操作で、追加製品修正ではない。 |
| 16:59:09.761 | scope-race.cjs | WS1のGET応答1件だけ保留→trusted操作で個人へ戻る→旧応答解放、個人scope/WS本文不表示を維持。 |
| 17:00:58.046 | new-backup-scope.cjs | WS新規保存失敗の退避を個人newで表示せず、WSへ戻って元mode復元→同WS stable/両key cleanup。個人newへの無入力訪問はnote非作成。 |
| 17:01:40.418 | 個人正常対 | 個人new WYS title/body→同ID autosave/reload、個人header/bodyを確認。 |
| 17:03:32.252/17:04:14.869 | final-mobile.png/final-desktop.png | 自己画像確認。390px metadata thumbnail、1280px bundle青色CSSとPNG、単一iframe/allow-same-origin、横overflowなし。 |

新規media-onlyは `01a08a35-84b9-779b-a735-41f9bb423e6b`、asset `01a08a35-7c8f-72b1-bce8-80297fbc42a4`。本人title/body文字なしで挿入→stable→reload、後のhistory/styleにも同assetを使用。bundleは `01a08a36-74bd-72d2-b6c2-e163cc342953` とasset `01a08a36-7ffa-73ae-80f6-a1cdd6217877`。WYS/HTML/visualは共同note `01a08a34-3217-71f1-948d-def340c8cd61`。失効回復は今回自己 `01a08a50-759c-72af-ab50-b58f7e3aef89` だけ。

ImportUploadの局所変更は承認済み離脱だけをrefへ記録し、取消では記録しない。新upload開始時のみ初期化、完了navigate直前にmounted＋departedを確認、finallyからはclearしない。物理受付/取消/leaseは変更なし。旧pointer観測は撤回したままであり、元製品不具合が実再現したとの記述は無効。送信前abortがイベントを発しない旧fixture失敗と、今回の正常Space/confirm1対を区別する。

### 共有36項目の変更影響

以下は今回変更した条件だけ。各行のIDを全方式再検証済みという意味で使わない。

| 対象ID | 今回変更した責務と根拠 |
| --- | --- |
| P1-B/C/D/E | current scopeでsave/read/backup/render、0012/13永続化、scope shell/RSC一覧。旧35table保全、最終unit/Node/UI。 |
| P2a-B/D/E/F | import受付scope・現在actor commit・容量・本人job/reimport・UI。新WS11と既存import/reference全Node、bundle/遅延離脱。 |
| P2b-A/B/C/D | current/history mediaのrole、creator-private draft・upload scope、reference actor/quota/reuse、display current role。新WS11、実媒体/両style/off-on。 |
| P2c-1-A/B/C/D/E | common commit current role/actor、Bは保持mediaのscope chargeだけ、history認可/restore/backup。20版数/物理pin規則不変。実history媒体＋全Node。 |
| P2c-2-D/E | mode/退避のscope・失効対応、新規scope namespace。投影・Text hostの方式は不変。3mode実操作/最新失効回収。 |
| P2c-3-D/E | WYS contextの現在policy、saved origin/最新backup、別scopeへの再基準化なし。既存WYS方式とorigin20版規則を維持。 |
| P2d-1-A/B/C/D | scope trash/undo/restore、active先行通常read/原本/media、scope一覧。実原本・undoと新WS11。 |
| P2d-2-A/B/C/D/E | begin current scope、system initiator、新旧snapshot人物/履歴read、purge UI。Bは実回収前scope charge保持のみ。実52B消去と隔離companion。 |
| P2d-3-A/B/C/D/E/F | empty固定scope/current admission・actor retry/read/ticker/UI/schema。既存全Node＋本体2件empty/取消/容量0。 |

計36。物理storage claim/write ownership/FD、codec/SSRF取得、20版数/GC時刻、PM/converter/textarea方式には変更を加えていない。既存独立合格を適用する範囲と、現在scope・容量・actor接続の再確認を分離する。

### 保全・新規削除・保留

17:02:03.663の最終保全で旧35table全旧列EXCEPT差0、439objectsのbytes/SHA一致、FK0。現在573notes/66assets/921revisions/nonactive11。17:02:15、displaypending/active conversion/active reference/未完了purge/writerは各0、snapshot120。旧513/64/847・前段取消11は一切削除・復元していない。

今回の不可逆操作は新自己3note・3原本計160Bだけ。`01a08a48-860b-70f8-a8c7-dc5572807a0a` の52Bと、`01a08a4d-f4d7-7598-8afe-b867be75c061` / `01a08a4d-f58c-74e6-8263-ea7d712beffc` の各54B。物理不存在とDB完了を確認した。旧objectやbackupは削除していない。新規データ増分は最終時点でnote+60/asset+2/revision+74、51metadata fixtureと正常自己操作を含む。

未送信の自己予約2件104Bは、期限前の正当な受付scope chargeとして保持する。WS1 `01a08a33-dec4-759a-a23e-00c8f74fc42b` に属し、17:04確認で各storage keyの実体なし。手動消去・期限改変はしていない。

| reservation ID / storage key | 状態・bytes | expiresAt | 既存5分cleanup猶予後 |
| --- | --- | --- | --- |
| 01a08a3f-dc77-75fa-bffd-a924e75c7bca | cancelled / 52B | 2026-09-10T17:37:16.148+09:00 | 17:42:16.148以降 |
| 01a08a48-8b68-7064-82a7-59d3fc442e1f | failed / 52B | 2026-09-10T17:46:45.223+09:00 | 17:51:45.223以降 |

通常sweepによる不存在確認→予約解放が期待される。引継ぎ時にはまだ期限前であり、残存を未完了障害・物理回収成功のどちらとも扱わない。accepted予約9件計1224Bは原本保持への移行と重複計上しない。全旧データとともにこの自己保留も次の保全対象とする。

### 限界と停止

本体owner UIと、隔離DBの複数role/Q3跨scope保持、自己membership一時故障を分離した。招待/role UI・移動・WS全削除・検索/OR整理・public/Driveは未着手。通常OS IME/nativepaste/OSdropは今回も未確認で、合成入力成功へ読み替えない。Browser errors一覧の最終読取には内容空の2エントリが残り、console完全0とは主張しない。期待した失効/故障操作以外の原因をこの空出力から断定しない。最終画像/実操作は上記範囲で成立。

17:10:07.143、専用tabの自己hook0/iframe1を確認し、自己network route解除・`p3a-main` close成功。補助p1_uiは16:11以後全停止、自己listenerはなし。通常productionは稼働を維持し、候補引継ぎ後は製品/DB/browser/helper/test/buildへの全操作を止める。

## 固定候補と環境引継ぎ

2026-09-10T17:13:34+09:00、明示99pathのcached一致・想定外0を確認して通常commitした。

- commit: `b093802e4037282855c133d0fe68a3147de70e0c`
- subject: `feat(workspaces): add scoped workspace creation and note workflows`
- 親commit: `449068f35871fa8c07bd36d0d7921f56d937e255`
- 製品manifest: [P3a-product-paths.txt](P3a-product-paths.txt)。99path、既存78＋追加21。commitは10816追加/656削除を含み、大きい生成migration snapshot2本も対象。
- source: 654path、SHA256 `a30746e485e16936e81ed51704e9db417f2c73a35eb2c19986d0c474574c1d29`
- lock: SHA256 `7789972514666bf5fbc61f775887a43b0c71678cd854f9758459cf9aa385b3bf`（開始と不変）
- bundle: `apps/web/dist/server/server.node.js`、SHA256 `c20494989908edcdef81a1be1f3168f8d07ac8ce4fe09f9e4f4bee13f6851d24`
- 自己資材: `/tmp/hollow-workspace.CgEtgi`、44file、SHA256 `bbd36137db69e2f9878df78a6e2923b6e16674246de5513c64733af084b6f3a4`。17:14:09.490取得、[相対path/bytes/hash一覧](P3a-temp-manifest.json)。baseline/clone/SQLite sidecar/自己HTML download/画像/helperを含み、node_modulesを除外する規則（今回なし）。

source集約は従来どおりgit tracked＋untrackedの非管理regular fileをpath順に `path + NUL + bytes + NUL` でSHA256。statSyncによりAGENTS symlinkの参照先bytesを含む。commit後17:13:45.952に同source/lock/bundle一致、旧35table全旧列差0、439objects bytes/hash一致、FK0、573notes/66assets/921revisions/非active11を再確認した。hookによる製品変更なし。17:14:09.607、製品working tree/cached差分0、残りは未追跡管理資料99pathのみ。push/PR/公開なし。

自己tempのhelperは今回の試行/局所修正を含む。初期pointer観測は `pointer-observation.md` に操作と撤回を記録したが、過去helper bytesのimmutable copyではない。旧P2d自己/独立固定tempと全旧backupは変更していない。現在44fileの固定以後は編集しない。

通常productionは **session71966 / PID34171 / Node22.22.3**。16:44台build後、16:45までにlisteningを確認し、17:14のHTTP200を確認した。起動秒単位の時刻は未取得なので推測しない。旧PID93756/2383/5548は正常TERM/drain終了、停止対象として再利用しない。

- URL: `http://localhost:3000`
- storage: `/tmp/hollow-p2.sj33Bk/originals`
- mailbox: `/tmp/hollow-p1-S1piZT/mailbox`
- schema: 0013まで適用済み。新backup `/tmp/hollow-workspace.CgEtgi/baseline.db`、`clone.db`、`clone-final.db` を保持。

既存の起動設定を維持した。

```sh
APP_URL=http://localhost:3000 HOLLOW_MAIL_MODE=local \
HOLLOW_MAILBOX_DIR=/tmp/hollow-p1-S1piZT/mailbox \
HOLLOW_STORAGE_DIR=/tmp/hollow-p2.sj33Bk/originals \
HOSTNAME=127.0.0.1 PORT=3000 pnpm start
```

稼働serverは引継ぎ対象として残す。補助を含む製品書込、自己browser/helper/hooks、test/build、DB操作は停止済み。最終操作後の文書だけを仕上げてManagerへ返却する。P3a6項目＋共有36の独立判定前に完了扱いせず、次フェーズはManagerの別委譲を待つ。
