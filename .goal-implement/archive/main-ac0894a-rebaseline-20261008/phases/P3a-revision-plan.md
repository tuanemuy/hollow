# P3a-V1: mobile scope chooserの配置

2026-09-10T17:46:40+09:00の実時計確認。正式返却前のread-only修正案。P3a-A/Fの既知不合格を対象とし、製品・環境・test・browser・git・hash・固定tempは無操作。P3b-1の開始ではない。

## 根拠と原因

独立Verifierは390pxのWS一覧でmenu左端x=-74.77、個人button x=-57.77〜6.23（幅64pxのうち6.23pxだけ可視）と作成linkの左欠けを実測・画像確認した。これは独立提供の根拠であり、Implementerの再実行ではない。document.scrollWidth=390だけでは負方向の不可視部分を検出できない。

読み取り対象は以下に限定した。

- `components/hollow/workspace.css`: switcherはrelative、menuはabsolute/right:0、幅min(28rem,100vw−2rem)。390pxでは358pxになる。
- `WorkspaceScope.tsx`: summaryを持つdetailsの内部にmenuを配置。label/現在scope、open、page、request generation、pending/navigationはReactが所有する。
- `Shell.tsx` と `styles/hollow.css`: headerは中央寄せmax1040pxのflex。account nav内にscope detailsとaccount detailsが横並び。各detailsはrelative。600px以下のheaderは64px/padding20px、480px以下のswitcherはmax11rem、navはwrap可。

menu右端はviewport/header右端ではなく、実幅158.84pxのsummary/detailsの右端に束縛される。そこから358pxを左へ展開するためviewport外へ出る。幅だけviewport以下にしても配置原点が保証されず、overflow-x:hiddenやさらに小さい固定幅で隠すだけでは解消しない。

## 最小修正案

mobile領域（既存headerの600px breakpointに合わせる候補）だけ、scope menuのcontaining blockをsummaryからheaderへ変えるCSS修正を第一案にする。desktopの既存summaryアンカー、component構造、scope/request/navigation/optimistic状態は保持する。

1. mobile headerをposition:relativeにする。
2. `.hollow-account .hollow-scope-switcher` に限りposition:staticへ。既存 `.hollow-account details` より確実に優先するselectorにし、CSS import順に依存しない。account menuのdetailsはrelativeのまま。
3. scope menuをheader下端 top:100% に置き、right:1rem、width:min(28rem,calc(100% - 2rem)) とする候補。header内の左右余白で幅と原点を同時に制限し、summaryの短長/位置から切り離す。
4. 既存z-index、縦overflow/max-height、button44px、keyboard/tab order、open/閉じる動作は維持する。portal/newPopover/JS座標計測/route変更を導入しない。

headerのrelative追加で他の絶対配置へ影響がないか周辺account menuを狭く確認する。header fixed-heightと長名summaryの組合せは未実測なので、既知不具合を追加確定しない。長名がheaderから縦にはみ出して重なる場合に限り、mobile summaryを省略表示へ限定する最小対策を検討し、既存aria-labelの全名とchooser内の折返し全名を残す。保存値を切り詰めず、全headerの配置刷新へ広げない。

この案が実矩形で成立しなければ、同じmobile限定のviewport左右固定配置を代替候補として返す。一般overlayライブラリ導入や独立の新方式gateは不要。

## 正式修正後の狭い再確認

| 条件 | 操作 | 観測する合否 |
| --- | --- | --- |
| 元390px/同名WS | chooser開く→個人/WS/作成導線を実tap相当pointer操作 | menu、個人button、作成linkのleft>=0/right<=390を個別に測る。可視部分の中心hit targetと画像、実遷移を確認。scrollWidthだけで合格にしない |
| 通常keyboard | summaryへTab→Enter/Space、個人/WS/作成へTab→Enter/Space | focusが見え、意味どおり選択/遷移。新しいscopeが常時表示され、操作前後のopen/closeが一致 |
| 長い正当WS名 | 100codepointの日本語/空白なし文字列をlabel/候補として表示 | menu原点が名前の実幅で左へ移動しない。summary/他account操作が重ならず、候補内全名は折返しで確認可能。新しい文字数仕様は作らない |
| desktopと境界 | 1280px、mobile境界の前後でchooserを開閉 | desktop配置/通常選択を保持。breakpointでmenuが両方のoffsetを残さない。account menuの既存アンカーも変わらない |
| 前後状態 | 個人→WS→個人、開閉→再open、読み込み/失敗→再試行、ページ切替 | 既存page/error/pending/generationを壊さず、選択後の現在scope/URLが一致。CSS修正で旧応答採用条件は変更しない |

データは正式返却後の自己対象だけ、旧WS/nameをテストのために変更しない。長名や待ち状態は本人tabの限定検証か新自己fixtureと区別して報告する。原本・quota・actor・job・DB schema・20版は無変更見込みで、全面再実行を要求しない。必要な規定checks/build、同最終bundleの実操作、明示修正path commitは正式実装委譲後に行う。

## 範囲・見込み・停止

製品変更見込みは `workspace.css` のmobile配置のみ。header ruleを同fileの限定media内へ置けば `hollow.css` や `Shell.tsx` の変更を避けられる。componentのdata/state/認可責務は変えない。P3a-A/Fと共用scope headerの表示部分だけが影響対象であり、他の受入項目を好みで磨かない。

正式環境返却後、元矩形の再現→CSS修正→390px/desktop/keyboard/長名の同bundle確認と規定checks/build/固定まで30〜45分を初期目安とする。これは独立受入時間を含まない。未実行の案を修正成功とは扱わず、文書作成後は停止して正式報告・修正委譲を待つ。
