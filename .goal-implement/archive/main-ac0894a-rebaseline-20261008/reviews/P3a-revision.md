# P3a-V1 独立再確認

P3a-A/F と P1-E の共通shell mobile表示部分は合格。元390pxの負方向クリップは、同じWS・同じ幅の独立実操作で解消した。個人/WS/作成への通常pointerとkeyboard、100codepoint名の全文保持、account配置、境界幅・通常再訪・通信状態も成立。新しい不具合は確認しなかった。[元不合格](P3a.md#p3a-v1390pxで所属先選択肢が画面外へ欠ける)は旧候補の根拠として保持する。

開始 **2026-09-10T18:18:55+09:00**、終了識別 **2026-09-10T18:24:38.782+09:00**。初期見込み20〜30分に対し、必要な狭い対が成立したため追加gateや待機を増やさず終了した。Verifierが単独で環境/browserを操作した。製品・依存・build・schema・管理直下・goalを変更せず、spec/spec-implement、Issue/commit、他process/他browser/global cleanupを使用しなかった。

## 固定候補と変更レビュー

[正式修正報告](../phases/P3a-revision.md)と[修正案](../phases/P3a-revision-plan.md)を全文読み、planの3対象、採用designのmobile配置契約、元WS-01/02と既存P1-Eへ照合した。goal-implement/manager-loopの独立検証手順とmanual-testの実UI確認を適用し、文書にはmarkdown-style/doc-styleを使った。許可された独立temp/report以外を編集していない。

| 識別 | 独立開始・終了一致 |
| --- | --- |
| commit | `f519dfa155b39153604392ee16833156c17b9d4d` |
| source | 654path、`32364619b746d6e48d2bc44220566aaf774cb4736d2e455fa0846bbe60baf7fc` |
| lock | `7789972514666bf5fbc61f775887a43b0c71678cd854f9758459cf9aa385b3bf` |
| server bundle | `40486da02f83df4ae7cd9076b8fcea8b88bc16577c0b2a5a1c4df619e19a3445` |

18:19:54.453と18:23:36.507に同じ値を独立取得。sourceは従来のsorted/dedup tracked＋untracked実在file、管理除外、`path + NUL + bytes + NUL`。AGENTS symlink参照先bytesを含む。旧commit `b093802e4037282855c133d0fe68a3147de70e0c` との差分pathは `apps/web/app/components/hollow/workspace.css` 一つだけ、26追加/1削除と確認した。

600px以下のheader relative＋scope details staticにより、menu幅と右端が同じheaderを基準にする。summaryだけellipsis、navのnowrap/min-widthとaccount shrink禁止を限定する。480px以下のwrapを除去する一方、desktop宣言、縦scroll/max-height、button44px、既存aria全文とDOM順は不変。`hollow.css` の既存header/account positioningと `WorkspaceScope` のsummary aria-labelを読み、詳細要素のselector優先とaccount固有アンカーを照合した。

component/state/route/request generation、backend/現在認可/容量/20版/PM/codec/FD/claimは差分なし。旧40合格を再設計・全面再実行する根拠はない。

## 独立実UI

Node22.22.3、固定production、自己 `hollow-c2-verify` だけを使用した。元WSは `01a08a69-ff6e-7308-bccd-d639616afce3`、名前 `Independent P3a 日本😀`。pointerは可視DOMの矩形中心がhit targetに含まれることを確認し、実mouse move/down/upを送った。DOM clickイベント合成ではない。keyboardはaccountの実pointer focusからSpaceで閉じ、Shift+Tabでscopeへ戻った後、Tab/Enter/Spaceで選択した。プログラムfocusだけでkeyboard到達成功とはしていない。

### 元390pxの正常化

**2026-09-10T18:21:13.766+09:00**、独立 `ui.cjs` 成功。

| 対象 | 元候補 x〜right | 修正版 x〜right | 結果 |
| --- | --- | --- | --- |
| menu | -74.765625〜283.234375 | 16〜374 | 左右とも画面内、幅358px |
| 個人button | -57.765625〜6.234375 | 33〜97 | 幅64px全体と文字が可視、高さ44px |
| 元WS button | -57.765625〜188.171875 | 33〜278.9375 | 名前/roleと操作領域が可視 |
| 作成link | -57.765625〜69.765625 | 33〜160.53125 | 全文と選択領域が可視 |

390/480/481/599/600/601/1280pxで、menu・全候補・作成linkのleft>=0/right<=viewportを個別に確認。600pxではmenu136〜584、601pxでは18.234375〜466.234375となり、限定mediaの切替が成立する。1280pxは旧正常と同じmenu577.234375〜1025.234375、個人594.234375〜658.234375。document.scrollWidthだけの判定は使っていない。

390pxの通常pointerで「個人」→元WS→「ワークスペースを作成」と順に遷移し、URL/scope・menu閉鎖が一致した。メニュー可視性と操作結果を両方確認した。

### 長名・account・keyboard

実装者の100CP WSは別account所有の保全対象なので操作を流用せず、自己accountで100CP名のWSを通常作成UIから一つだけ追加した。新IDは `01a08a9f-071c-7127-a80d-b4038dad32d0`、slugは `independent-scope-revision-0910`。名前は「長名表示境界」16回＋「長名表示」。DBにも100codepointを保持し、既存100CP WS `01a08a8d-3557-70b4-b83e-68c0f89f4d01` の旧列は不変。

100CP名のsummary textとaria-label、chooser候補の全文を照合した。summaryだけ省略され、menu内では折り返して全文を表示する。390pxのbrand x20〜93.828125、scope summary109.828125〜283.234375、account291.234375〜370。両summaryのy20.453125〜42.546875はheader内で、横重なりなし。account popupは130〜370で画面内、pointerで開く/Spaceで閉じる操作も成功した。

**18:22:20.810**、独立 `keyboard.cjs` 成功。実Tab/Shift+Tab/Enter/Spaceで個人→100CP WS→作成へ到達した。長名選択時の390/480/481/599/600pxを再確認し、brand/scope/accountは全て画面内・同header内・非重複。新しい名前上限や別のdesktop長名設計は追加していない。

### 再訪と通信状態

同 `keyboard.cjs` で長名WS reload、通常WS hard open/reload、個人hard open/reloadが成立した。「ワークスペース（確認中）」の15秒停滞は今回の新しいpageで再発していない。実装報告のビルド前から残した古いtabにおける2回のtimeoutは原因未確定のまま保持し、今回それを修正した/再現したとは主張しない。通常再訪の実成功と別の観測である。

**18:23:07.029**、独立 `states.cjs` 成功。本人tabのserver-function fetchだけを保留して「参加ワークスペースを確認中…」、解放後に当該routeをabortして「エラーが発生しました」、解除→更新でerror/statusなしへ復帰した。全3状態でmenu x16〜374。読み込み/失敗を空一覧と混同せず、同じ可視領域に回復操作がある。fetch wrapperとrouteはfinallyで解除し、実ネットワーク/全OS障害の検証とはしない。

### 自身で見た画像

- [390px通常](/tmp/hollow-scope-verify.5bYLB5/normal-390.png)：個人・各WS・作成の左欠けなし。元V1と同名・同幅。
- [390px長名](/tmp/hollow-scope-verify.5bYLB5/long-390.png)：summary省略と候補内全文の折返し、account位置を確認。本文fragmentは撮影時まだloadingで、長名本文のロード完了証拠とはしない。後続reload成功は別記の操作根拠。
- [390px account](/tmp/hollow-scope-verify.5bYLB5/account-390.png)：popupがviewport内、headerの名前/brandと重ならず開閉可能。
- [1280px通常](/tmp/hollow-scope-verify.5bYLB5/normal-1280.png)：既存右寄せ配置・全候補の可視性を確認。

四枚を自分で開いて見た。画像確認をManagerへ委ねず、数値だけの合格にしなかった。

## 判定と借用範囲

| ID | 判定 | 独立根拠・限界 |
| --- | --- | --- |
| P3a-A | 合格 | 元390pxの各bbox/画像/通常pointer、keyboardの個人/WS/作成、全文aria/menu、新scope再訪。作成/認可等の旧正常は不変として保持。 |
| P3a-F | 合格 | 1CSS差分レビュー、7幅の通常名/5幅の長名、pending/error/retry、自己画像、開始終了識別/旧保全。規定checks/buildは下記借用。 |
| P1-E mobile表示 | 合格 | mobile共通shellのbrand/scope/account非重複、account固有popup、desktop正常・600px前後・通常reload。backend/runtimeの無変更方式は旧合格を保持。 |

最終28unit/typecheck/lint/format/build成功は実装者の借用根拠。最終26追加/1削除CSSと同bundleへの適用を照合した。既存22warnings/29infos、CSS同名出力warningは報告どおり残し、error0/build成功と区別する。独立再実行は上記本体UI3helperとread-only保全であり、純粋28や515unit/190Nodeを再実行したとはしない。JS/入力/helperの製品差分がないため、無関係な全試験を追加していない。

全OS/全browser/IME/nativepaste/drop、無変更codec/SSRF/20版/PM/FD、P3b鍵/招待は今回未検証。既存40合格の適用を維持し、新たな受入条件へしない。

## 保全と資材

新online backup `/tmp/hollow-scope-verify.5bYLB5/baseline.db` を本体操作前に取得。18:19:54.453の開始照合は旧37table全旧列差0、受領629notes/68assets/987revisions/snapshot123/nonactive11、453実object・29,375,173Bのbytes/SHA一致、FK0。実装者inventoryのsuffix付きkeyも含めて照合し、runtime `.hollow-writer-owner` はobjectから除外した。

18:23:36.507終了時も629/68/987/snapshot123/nonactive11、453/453objects全bytes/SHA一致、FK0。追加は自己100CP WSとそのowner membershipだけで、note/object削除量0B。旧100CP WS・旧notes/原本/asset/版/membershipは変更していない。

旧37table比較では **auth_throttlesの自己slug照会行だけ1差**、残36table差0。これは今回の新WS通常作成時に、自分の既存accountの期限切れslug照会窓を更新した結果。key `workspace-slug:01a075c3-93f3-701c-805a-ff7a70086de1` の旧attempts2/blockedUntil1789028748668/lastAttempt1789028689143から、新attempts1/blockedUntil1789032132835/lastAttempt1789032072835へ変化した。秘密の認証値ではなく自己rate補助行であり、全旧列差0と偽らない。手動resetや他account変更は行っていない。

未送信59B予約 `01a08a73-6000-70e3-bc6f-97826d864456` はfailed/cleaned0/expiresAt1789032812159で全旧列不変。物理なし・charge保持、18:38:32.159以後の通常cleanupへ引き継ぐ。期限待ちだけのgate、手動解放/時刻変更はしていない。writer/incomplete purge/conversion active/reference active/display pendingは各0。

| 資材 | 開始18:21:23・終了18:24:38の照合 |
| --- | --- |
| 元 `/tmp/hollow-workspace.CgEtgi` | 44file、`bbd36137db69e2f9878df78a6e2923b6e16674246de5513c64733af084b6f3a4` |
| 旧独立 `/tmp/hollow-p3a-verify.UvTYeF` | 43非DBfile、`6696822aeb1ba2589e1e043323bdda4e57b8fd878d8c6a22ed9ec34d2c7c5bed` |
| 修正 `/tmp/hollow-scope-revision.Q0F1aF` | 24非DBfile、`5a71513fa470ac7e3e40483161e79e8845bcc0c5986d1de61c32cbacf48c8f4f` |
| 今回独立 `/tmp/hollow-scope-verify.5bYLB5` | 8非DBfile、`bbf6dc17f4fb2d43c250716cae583c4c28ef2d2256d6228d19dc089df7455eb8`、同dir `manifest.json` に全個別SHA |

全固定資材の個別bytes/hashとaggregateを照合し、一致。元固定DB/sidecarはdriverで開かず、今回取得した自己baselineだけを比較に使った。今回manifestはsorted basename＋NUL＋bytes＋NUL、DB/sidecar/manifest自体を除外する。manifest作成CLI初稿の括弧syntax errorは検査側の誤りで、修正した単発CLIで照合・manifest作成を完了した。製品変更ではない。

## 全操作停止・引継ぎ

**2026-09-10T18:23:34.923+09:00**、自己wrapper不在を確認、network route解除、`hollow-c2-verify` close成功。自己listenerなし、全helper/execを回収済み、browser再開なし。agent-browser-cleanupは他session保護の制約に従い自分のsession終了に限定し、global cleanup/全process探索をしなかった。

productionは **session95908/PID3268/Node22.22.3**、同DB `/tmp/hollow-p2b.dAfzgS/app.db`、storage `/tmp/hollow-p2.sj33Bk/originals`、mailbox `/tmp/hollow-p1-S1piZT/mailbox` を維持。18:23台HTTP200・既知PIDへのkill0成功。restart/build/migrationを行わず、旧34171/90754/97500へ操作していない。

最終識別・保全を記録後、文書だけを仕上げ、全検証操作を停止して環境をManagerへ返却する。P3b実装や追加検査を開始しない。
