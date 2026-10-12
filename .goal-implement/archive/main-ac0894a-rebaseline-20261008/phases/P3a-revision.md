# P3a-V1: mobile scope chooser

## 完了候補

2026-09-10のP3a-A/F、P1-Eの共通shell mobile表示部分だけを修正した。自己検証は成功、独立再確認待ち。製品変更は `apps/web/app/components/hollow/workspace.css` 1ファイル、26行追加・1行削除。component、state、transport、backend、依存、schemaは変更しない。P3b-1・鍵生成は未着手。

| 対象 | 自己結果 | 根拠 |
| --- | --- | --- |
| P3a-A | 成功 | 元390pxの欠けを同矩形で再現。最終bundleで個人・WS・作成が可視、通常pointer/keyboardで選択できる |
| P3a-F | 成功 | 390/479/480/481/599/600/601/1280pxの通常名、100codepoint名、開閉、読取中、失敗・再試行、再訪。規定checks/buildと関連28テスト |
| P1-E mobile表示 | 成功 | brand・scope・accountがモバイルheader内で重ならず、account menuの通常開閉ができる。desktopの既存アンカー・component構造は不変 |

採用入力は `reviews/P3a.md` 全文、`phases/P3a-revision-plan.md`、`design.md` のmobile配置契約。goal-implement/manager-loop、manual-testを適用した。単独環境所有とローカル証跡保持を優先し、補助・外部Issue・global cleanupは使用していない。報告の整理にmarkdown-style/doc-styleを用い、必要な失敗・時刻・借用根拠は保持する。

## 修正

- 600px以下だけheaderをrelative、scope detailsをstaticにする。menuはheader下端・right 1rem・幅min(28rem,100%−2rem)。幅と配置原点を同時に制限する。
- mobileのsummaryだけnowrap/ellipsisにする。100codepointの保存値、既存aria-labelの全名、menu内の折返し全文は保持する。
- mobile navはmin-width:0/nowrap、scopeはmin-width:0、account detailsはflex-shrink:0にする。480px以下の旧wrapだけ除去する。名前が空き幅で縮み、accountを次行の左へ押し出さない。
- desktop、menuの縦scroll/max-height、button44px、tab順序、Reactのscope/page/request generation/pending/error/navigationは不変。

### 元再現と局所追加対

自己accountの既存WS `01a08a33-dec4-759a-a23e-00c8f74fc42b` を読取のみ使用した。390pxの元menu x=-74.765625/right283.234375/width358、個人button x=-57.765625/right6.234375/width64。作成linkもx=-57.765625だった。`before.png` を画像として確認した。

新自己WS `01a08a8d-3557-70b4-b83e-68c0f89f4d01` を通常作成UIで追加した。名前は「長名表示境界」16回＋「長名表示」の100codepoint、空白なし。note・媒体を追加せず、旧WS名を変更していない。ellipsis前はsummary y=-71.921875〜104.828125、account y112.828125〜134.921875。ellipsisだけではaccountが次行左へ回り、実際に開いたpopupはx=-51.40625〜188.59375。これらの実測をManagerへ返し、mobile flexの限定補強を採用した。

## 最終bundleの実操作

一時資材は `/tmp/hollow-scope-revision.Q0F1aF`。`browser.cjs` は旧自己helperのコピーで、専用 `p3a-main` セッションだけを操作する。pointerは表示中の対象矩形を読んだ後のtrusted mouse、keyboardは実Tab/Space/Enterであり、DOM clickイベントの合成ではない。

| 実時計（JST） | 操作・観測 | 資材 |
| --- | --- | --- |
| 18:07:18 | 100CP名：summary x109.83〜283.23、account x291.23〜370、双方y20.45〜42.55。menu x16〜374、全名button x33〜357、高さ130.47。account popup x130〜370 | `keyboard-long.cjs` / `keyboard-long-result.json` |
| 同上 | pointer brand→Tab/Space→個人→Tab/Enter/Space→100CP WS→Tab/Enter→作成。全名aria/menu、account pointer開く→Space閉じる成功 | 同上 |
| 18:08:35 | 通常名の390/479/480/481/599/600/601/1280px。各menu/button/createのleft>=0/right<=viewport。390px個人x33〜97、作成x33〜160.53。pointer個人→WS→作成成功 | `geometry.cjs` / `geometry-result.json`（実ISO時刻を収録） |
| 18:11:10 | 自分tabのfetch保留中「参加ワークスペースを確認中…」、明示abort後「エラーが発生しました」、解除→更新でerror消失。全状態menu x16〜374。desktop pointer、通常個人reload・WS reload成功 | `states.cjs` / `states-result.json` |
| 18:12:04 | 100CP名390/479/480/481/599/600px。brandと両summaryがheader内、横重なりなし。601/1280の通常名・長名候補buttonはgeometry側の根拠 | `long-boundaries.cjs` / `observations.json` |

`final-390.png`、`final-1280.png`、`long-final.png`、`account-final.png` を自身で画像確認した。名前の省略、全名の折返し、個人・WS・作成の見切れなしを確認した。長名を選択したdesktop header全般の改善は今回に含めず、desktop宣言は変更しない。新しいOS/全browser/IME保証は加えていない。

### 失敗・補正と未確定観測

- 最初のfocusedコマンドの `--project unit` は未定義projectの指定ミス。製品testは未実行だった。既存configを読み、同じ2ファイルを通常vitestで実行して28成功。
- keyboard helperの「最新WSが先頭」という順序仮定、pointer helperの読取中・disabled完了待ち不足、個人labelを「個人」に固定した仮定を修正した。実際の通常labelは「個人のスペース」にもなる。製品stateを変更してassertに合わせていない。最終helperは表示/操作可能条件・対象の実順序を待つ。
- ビルド前から残した同tabを新bundle起動後に使った際、WS表示名が「ワークスペース（確認中）」のまま15秒待機失敗となった観測が2回ある。reloadまたは同じ自己sessionのclose→新tabで復帰した。原因は未確定。最終新tabの同bundleで通常WS/個人reload、pointer/keyboardが成功したことと区別する。新しい製品不具合やCSSが原因と断定しない。
- 完了時の追加count SQLで `object_writes.state` を仮定した照会は失敗。正しい `active` 列へ直した読取でwriter0を確認した。最初のlsof option位置も訂正した。いずれも製品/DBへの書込なし。
- 通信abortは自己tabの合成故障。実ネットワーク障害・OS操作の全面検証には数えない。fetch wrapperとnetwork routeはfinally相当で解除済み。

## checksと借用範囲

Node22.22.3で最終CSS後に以下を直列実行し、exit0。test開始は2026-09-10T18:06:09+09:00、2files/28tests、378ms。`final-checks.log` に最終出力を保持する。lintは既存22warnings/29infos、unsafe fixは適用せず、lint/formatの追加製品変更なし。buildの既存CSS同名出力warningは残り、build自体は成功した。

```sh
pnpm typecheck && pnpm lint:fix && pnpm format && pnpm exec vitest run apps/web/app/presentation/workspaceInput.test.ts apps/web/app/components/hollow/editorSave.test.ts && pnpm build
```

最初の13行案、ellipsisのみ案の途中checksは最終成功と混同しない。最終26追加/1削除のCSSと同bundleで上記UIを実施した。`git diff --check` も成功。

既存515unit/190Nodeと独立40条件は今回再実行していない。backend/現在policy/認可/容量/物理claim/FD/codec/safe-fetch/20版/PM方式はソース差分0のため旧受入根拠を適用する。今回は共有port・依存・DB migrationなし。個人/WSの通常選択状態は関連pure28と実UIで狭く再確認した。

## 保全

実編集前17:58:07確認：HEAD `b093802e4037282855c133d0fe68a3147de70e0c`、654source `a30746e485e16936e81ed51704e9db417f2c73a35eb2c19986d0c474574c1d29`、lock `7789972514666bf5fbc61f775887a43b0c71678cd854f9758459cf9aa385b3bf`、bundle `c20494989908edcdef81a1be1f3168f8d07ac8ce4fe09f9e4f4bee13f6851d24` が受領値と一致。製品差分0/cached空で開始した。

- 新online backup：`/tmp/hollow-scope-revision.Q0F1aF/baseline.db`。SHA256 `7df4df779b3410496fe8ff2e5df23d94002cd902a2fa53e3faaf4dc13ea474b9`。
- 開始629notes/68assets/987revisions/nonactive11、37table、FK0。DB provenanceとstorage root内の全実object453個、29,375,173bytesを記録した。`.hollow-writer-owner` はruntime lockでありobjectから除外。最初のUUID-only inventoryはsuffix付き52objectsを除いていたため、編集前に全keyへ補正して453を固定した。
18:13台の正しい再集計はsnapshot123、writer/incomplete purge/conversion active/reference active/display pendingすべて0。
- 今回の追加は自己100CP WSとowner membership。旧note/版/asset/WS/取消11・原本を変更/削除していない。旧2予約の自然解放済み値は開始backupを基準に保持。独立の59B failed予約 `01a08a73-6000-70e3-bc6f-97826d864456` は全旧列差0、物理なしのまま保持。cleanup予定18:38:32.159以後の自然変化のみ後続へ委ねる。
- 旧自己44files `bbd36137db69e2f9878df78a6e2923b6e16674246de5513c64733af084b6f3a4`、独立43nonDBfiles `6696822aeb1ba2589e1e043323bdda4e57b8fd878d8c6a22ed9ec34d2c7c5bed` を18:12:05に全個別hash/aggregate照合、一致。旧固定DBをdriverで開いていない。

## 固定識別と引渡し

- 候補commit：`f519dfa155b39153604392ee16833156c17b9d4d`、2026-09-10T18:12:44+09:00。
- commit対象は `apps/web/app/components/hollow/workspace.css` だけ明示stageしcached照合。管理資料・既存資料・DB/env/tempを含めず、push/PR/公開なし。hookによる製品追加変更なし。
- commit後654source SHA256 `32364619b746d6e48d2bc44220566aaf774cb4736d2e455fa0846bbe60baf7fc`。sorted git tracked+untracked paths（管理除外）、path+NUL+bytes+NUL、statSyncでAGENTS参照先を含む従来方式。commit前後content hash同一。
- lock SHA256 `7789972514666bf5fbc61f775887a43b0c71678cd854f9758459cf9aa385b3bf`、配布server bundle SHA256 `40486da02f83df4ae7cd9076b8fcea8b88bc16577c0b2a5a1c4df619e19a3445`。
- 新temp24 nonDB files SHA256 `5a71513fa470ac7e3e40483161e79e8845bcc0c5986d1de61c32cbacf48c8f4f`。個別一覧 `/tmp/hollow-scope-revision.Q0F1aF/manifest.json`。DB/manifest/node_modulesを除き、relative path+NUL+bytes+NUL。backup hashは別記。
- 現production session **95908 / PID3268**、Node22.22.3、開始2026-09-10T18:06:27+09:00、http://localhost:3000。
設定/鍵追加なし。旧34171、途中90754/97500はknownPIDのTERMで終了、各buildは終了後だけ行った。途中own sessions27053/56188はdrain/exit0を回収済み。
- ブラウザ `p3a-main` は18:13:02より前にclose済み。すべての自己helper/exec/hookは終了、追加listenerなし。productionだけを保持する。補助は起動していない。`git status --short` は未追跡 `.goal-implement/` のみ、製品差分0。

2026-09-10T18:16:49+09:00の実時計確認。報告を全文照合し、この文書確定を最後に製品・DB・browser・helper・git操作を停止する。独立確認へ環境を返却する。
