# P06 IM-05 第2候補 独立検証

候補 `26448057f52d92c7a7e54241c63d3b2f3d214228`、製品・テストコード `e2141c30d38ffe7c89e320a1228a996dd3d12e27`。IM-05 はpass／Manager受入済み（f719370、done66/review0）。第1候補の公開・限定reader恒久一覧不足を対象とする。コードレビュー・独立4093pass/skip0全suite・型/静的/build・主要正常browserすべて成功。既done65を再openする具体根拠なし。Managerの追加判断なし。自己browser/runtime/provider/reference/workerはnative停止・own ports閉・own PID終了を確認済み。

## 環境・範囲

2026-10-09 14:10 UTC開始。新persistent root `/Users/hikaru/.local/share/hollow/verification/p06-readers-independent-1791555035065074000`、TMPDIR `/Users/hikaru/.local/hwt/ir5065074000`。候補の公開tracked sourceだけを別git checkoutへ展開。旧DB/objects/D01/保全archive/旧worktrees/.env、spec/.goal-implementをコピーしていない。親環境はHOME/PATH/LANGのみを継承し、固定flakeと短persistent TMPDIRでfrozen install/型/静的/通常test/buildを実行。通常testは事前build無し。Verifierは製品・テスト・設定・phase・Manager管理filesを変更しない。

正本：spec/scenario/import.md IM-05正常1–4/全edge、brief利用者決定、design P06の第2reader採用境界（538af1b）、CLAUDE規約。第1候補の独立根拠20827c9/reviews/P06.mdを引継ぐ。IN01/02音声・D01保全・P07・live接続は対象外。

## 独立コードレビュー

製品・test・公開docs差分14path。framework-free application/reference/viewはkind/state/current/source(URL又はdata mediaType要約)/bytes/reasonだけを明示mapし、entry/note/asset/job/actor ID・location・finalUrl・日時・data payloadを投影しない。coreにWeb/React依存・新port/schema/endpoint/migration・通常application広catchなし。

sharing/publicationは既存認可とlifecycle/password grant検証後の同UoWで既存entries読取1回を再利用。gate応答は既存のkind:gateのみ。body/asset/data URI許可を維持し、referencesをdataに追加した結果、既存JSON snapshot stampのdata/noteVersion/owner又はscope/shareVersion/accessEpoch/acceptedを減らさず参照のみの変更も検出する。外部renderを挟む2snapshot/有限2試行/競合時安全errorの既存構造を保持。

Web純表示modelを認証ReferenceLedgerとreadonly HTMLで共有。認証側のReact transition/poll/操作所有は維持。readonly shellでは本文iframe後のsection/anchorへescaped plaintextのみを描画し、URL/reason/mediaTypeをescapeAttributeでescape。参照一覧内にfetch/link/画像/video/操作button/form無し。既存本文iframe/CSP/cache/index/body/assets/外部optinの差分なし。

追加8case（renderer2/core4/HTTP2）を確認：悪意URL/reason/mediaTypeのescapeと無active要素、過去CSS除去/空一覧、exact safe projection/内部情報非含有/91日job prune後永続、参照だけの更新採用と継続競合拒否。既存edgeへの追加assertはpassword未通過/期限切れ/revoked/private/trash/purgeのentries読取0、復元後一覧保持、HTML shellの一覧/anchorとprivate情報非含有。既存期待を弱めず、terminal pruning・snapshot/body・asset・header assertionは維持。テストfixtureのcreatedAtを1msずらして順序を明示し、exact array/機密非含有期待を維持。

## 原文異常対応

取得失敗/opt-out未試行/理由とURL保持/既成功ref再利用はreferences.integration。CSSsnapshot/背景-font外部依存/覆う配置・追加import除去/相対companion/data URI/internal URL/100MB・200件/既storage不差替は同integration＋NodeReferenceProcessor/NodeSafeReferenceFetcherの実native suiteと既domain限界tests。取得pipeline差分なし、第1候補の独立成功根拠を継承し今回全suiteでも確認する。新readerへの認可・永続・snapshot・HTML境界は上記追加assertを直接照合。

## 未検証

主要正常HTML/Markdown取込→owner/viewer→匿名limited/public→password gate/change/newgrantは下記で成功。91日後・悪意escape・snapshot競合・全拒否は手動browserへ追加せず実DB/HTTP/renderer自動根拠に対応。実外部資格情報・Google/SMTP/Drive/OpenRouter・live script・課金・外部公開は実行しない。音声方式は調査しない。自己環境停止は最終操作後に記録する。

## 独立全チェック — 2026-10-09 14:17 UTC

|コマンド|UTC開始 → 終了|exit|
|---|---|---|
|`pnpm install --offline --frozen-lockfile`|2026-10-09T14:10:43.887036+00:00 → 2026-10-09T14:11:00.571216+00:00|0|
|`pnpm exec node -p JSON.stringify({node:process.version,unicode:process.versions.unicode,execPath:process.execPath})`|2026-10-09T14:11:00.571916+00:00 → 2026-10-09T14:11:03.524802+00:00|0|
|`pnpm typecheck`|2026-10-09T14:11:03.525332+00:00 → 2026-10-09T14:11:10.398376+00:00|0|
|`pnpm lint`|2026-10-09T14:11:10.398801+00:00 → 2026-10-09T14:11:13.061207+00:00|0|
|`pnpm format:check`|2026-10-09T14:11:13.061567+00:00 → 2026-10-09T14:11:14.024314+00:00|0|
|`pnpm test`|2026-10-09T14:11:14.024755+00:00 → 2026-10-09T14:17:18.819705+00:00|0|
|`pnpm build`|2026-10-09T14:17:18.820317+00:00 → 2026-10-09T14:17:26.851427+00:00|0|

Unit2646/188files + Node1377/109files全5native group + CF70/10files＝4093 pass / skip0 / fail0。Node v22.22.3/Unicode16.0、pnpm内execPathは固定Nix Node slim22.22.3。通常test364.77秒、事前build無し。build8.03秒。全check後の自己checkout git diff --exit-code0。削除・skip・deadline緩和無し。

## 主要正常 actual browser — pass

2026-10-09 14:17–14:21 UTC、公開test:browser:integrationで起動した新DBの実製品HTTP/RSCをagent-browser所有2sessionから操作。owner/viewerのsigninは逐次実行。workspace選択→実HTML/Markdown file選択→通常アップロード受付→実worker完了→note detailで確認。自己loopback app54837/reference55300、外部live接続無し。詳細UTCとDOM/iframe観測はroot logs/browser.jsonl・manual-observations.jsonlに保持。

- HTML `/notes/01a12107-298b-7278-9e65-cb2bcd1dad83`：owner/viewerで現在4件・取得済み3（CSS/image/video）・未取得1（missing.png）。全4行の元URL・種類・取得状態・bytes・失敗理由を確認。viewer input/retryはdisabled、owner操作/pollは既存維持。実iframe本文「IM05 保存参照本文」、保存asset image naturalWidth32/video readyState4、取得CSS `.local-reference{color:rgb(120,40,160);border:2px solid purple}`を確認。
- Markdown `/notes/01a12107-3f25-773c-9653-b2cd38de4913`：owner/viewerで現在2件・取得済み2・未取得0、image/video各元URL/bytes/状態。実iframe本文「IM05 Markdown参照」、内部保存image32px/video readyState4、既定style保持。
- viewerが通常アカウントメニューからsignout→topした同sessionを匿名readerに使用。ownerの一般設定で新slug `p06r-065074000`を通常保存、各noteの共有設定→限定/公開→実確認確定。HTML `/s/7cS5mrq1ZqletPOckHxWaSeTcVMvy3_jbcAj-shjP-Q` と `/p/01a12109-02fc-76b9-be97-472c2805e11b/1`、MD `/s/pZrQ7vf-uiZ1yOM5ArWQb_4d6H1tx5JeSgYxOV4wVbM` と `/p/01a12109-cc20-71cf-ba09-e5e47ac99964/1`で認証側と同じ件数/元URL/状態/理由を確認。「参照リソース一覧へ」の実clickでhash #reference-ledgerへ移動。section内のinput/button/select/aは0、本文後の純読取一覧。private location/管理操作を描画しない。本文/保存image-video/CSS/sandboxを維持。
- 両noteを限定へ戻し、通常共有UIから合成password設定→確認確定。匿名未通過は#reference-ledger無し・iframe0。通常native formで正しいpassword→同一覧・本文/assetが現れる。ownerが新passwordへ変更確認確定→同tokenを同browserで再訪すると旧grantはgate（一覧0/iframe0）、新password通常submit後に同件数/本文/assetが復旧。HTML 14:20UTC、MD 14:21:46–48UTC観測。token変更や内部APIによる状態設定はしない。

第1候補failの「本文は読めるのに全reader恒久一覧が無い」は同原文normal4の公開・限定・password readerでも解消。正常1–3のHTML/Markdown検出・object保存/URL差替・CSS本文snapshotを実native pipeline/browserで確認。全edgeは既存pipeline＋新readerassertの独立4093passで成功。合格判定に異常browserの全手動再現を追加していない。

## 追加のCSS注意表示・driver観測

2026-10-09 14:25–14:26 UTC、自己owned reference fixtureの配布CSSだけへ `.cover{position:fixed;inset:0}` を入力し、対応するp.coverを含むHTMLを通常upload。これは自己合成入力データで、製品/test/configを変更しない。実nativeworkerが危険な宣言を除去し、owner detailと匿名/s・/pの同readonly一覧に「安全化・CSS除去 · 制限で未適用 · 過去の参照」、position:fixed/inset:0の各理由2行を表示。現在4件は過去2行を含めず、取得済3/失敗1を維持。本文CSSは `.cover{}`となり、本文・保存image/videoも読める。配布fixtureは元の自己保存内容へ戻した。

最初のbody selector入力は取り込みfragment内の実対象に一致せず、過去行生成の入力として成立しなかった。実DOMと既存processor testcaseのmatching selectorへ照合して通常入力を修正した。selector待ちtimeoutを製品欠陥や成功へ読み替えない。共有確認buttonのCLI click ACKでも未確定だった操作は実snapshot refへfocus＋通常Enterで確定し、実URL/結果を確認。password設定後labelが「新しいパスワード」へ変わったためDOM snapshotに合わせて正常操作した。これらdriver/入力観測は新受入gateにしない。

## 既受入65への影響・未検証

共有/公開認可・grant/epoch・本文/asset/style・CSP/cache/indexの成功条件を破る差分/失敗なし。既storage/data URI許可は同entries readから維持。認証ReferenceLedgerの操作所有/React pending/error/pollを保持し、application safe projection・UoW/OCC/snapshot・HTTP safe boundariesと型/静的/fullsuite/buildが成功。既done65を再openする具体根拠なし。IN01/02非音声の旧成功を保持し、音声を含む全ID完成は主張しない。音声・D01・P07未着手。

実外部Google/SMTP/Drive/OpenRouter資格情報・live scripts・送信/料金/外部公開は未実行。loopback合成参照の契約成功と実サービス到達は区別。旧DB/objects/保全資料/.env/old worktreesは読変更削除無し。検証root・DB・objects・合成鍵・原本・全logを保持。

## 自己native停止 — 完了

2026-10-09T14:29:05.869521+00:00 に自己actual Node94318だけへSIGTERM。公開launcherのcreateNodeShutdownがbooted.shutdown（owned native workers/execution）をawait後、editing/reference.close・integrationProvider.closeをawaitして終了。自己harness session48802はexit0。自己browser p06r-065074000-a/bのcloseは各exit0。2026-10-09T14:29:25.604924+00:00 に自己127.0.0.1 app54837/reference55300/LLM provider55301の全connect_ex=61、own起動tree94252/94282/94311/94318/94319/94320の全PID終了を確認。自己checkout git diff --exit-code0。稼働checkout再build無し、他利用者のprocess停止無し。DB/objects/合成鍵/原本/全log/native-stop.jsonを新persistent rootに保持。
