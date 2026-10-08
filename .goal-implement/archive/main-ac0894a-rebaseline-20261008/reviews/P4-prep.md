# P4 原文受入準備

2026-09-10T15:45:53+09:00。P4未実装の文書準備。全観測は未実行で、製品・方式の合否を示さない。正式フェーズIDはManagerが後で定義するため、以下のP4-T番号は観測群に限る。

[brief](../brief.md)、[採用design](../design.md)、[共有SH全文](../../spec/scenario/sharing.md)、[発見DS全文](../../spec/scenario/discovery.md)、[書き出しEX全文](../../spec/scenario/export.md)、[OR-09/12](../../spec/scenario/organize.md)、[WS-08/09/10](../../spec/scenario/workspace.md)、[ED-09/10](../../spec/scenario/editing.md)、[JB-01〜03全文](../../spec/scenario/jobs.md)を照合した。Q1/Q2/Q3は既採用として扱い、再決議しない。

## 独立した閲覧根拠

| 対象 | 成立する閲覧根拠 | 他条件への昇格を認めない対 |
| --- | --- | --- |
| 個人/WSのアプリ内note | 個人ownerまたは現在WS membership、active lifecycle。編集は現在編集権限も必要 | 公開URLや共有tokenだけでアプリ編集・履歴・設定権限を得ない |
| 有効な共有リンク | 現在の限定公開/公開状態、現在token、必要なら有効なパスワード通過状態 | 旧token、非公開化、trashを公開状態というだけで迂回しない。signin済み編集者の編集導線はSH-05に限る |
| 公開note | 現在公開かつactive。所有WS自体の公開は不要 | 所有WSが非公開でも公開noteは読める。共有パスワードやmembershipを必須にしない。編集者本人にも公開ページの編集導線は出さない |
| 個人公開timeline | 現在の個人所有かつ公開のnote | その人が作ったWS所有noteをcreator一致だけで掲載しない |
| WS公開timeline | WS自体が公開かつ現WS所有の公開note | WSを公開しても非公開/限定公開noteを掲載しない。WSを非公開にしても個々の公開noteは非公開化しない |
| export生成物 | 正当な実行/取得要求と、その時点の閲覧可否。匿名PDFは署名ticketも必要 | 24h/7d保存や署名ticketだけを現在閲覧権限の代替にしない。job履歴は実行者本人、匿名PDFは履歴外 |

Q1によりmember除名/脱退はmembership由来の権限を失効するが、公開・有効リンクの独立条件が成立すればその経路は利用できる。除名者だけのblacklistや全リンク一括失効は追加しない。所有scope、creator、job実行者、公開URLの主体は同じ値とは仮定しない。

## 最小fixtureと実行順

正式委譲後、個人所有PとWS所有Wに、同じ語・タグを持つ公開/限定/非公開noteを少数用意する。作成者Aと現在所有者Bが異なるnote、作成月と更新月が異なるnote、WS公開/非公開の対、本文なしnoteを含める。小HTML/CSS/画像、媒体current ref、同名タイトル、表やHTML-only要素を使う。現時点ではfixtureを作成しない。

順序は、共有状態/token/password→外部表示とlifecycle→timeline/検索→単体export→匿名PDF→ZIP/本人job→移動/失効統合とする。UIは主要操作と取消・再試行・390px/keyboard、境界・時刻・競合は隔離DB/clock/typed adapterを使う計画。外部検索エンジンへの実掲載、実公開サイトへの配備、クラウド送信はローカル検証成功へ含めない。

## 観測matrix

| 群 / 元ID | 正常の操作・期待 | 拒否・異常・競合の対と最低証拠 |
| --- | --- | --- |
| P4-T1 / SH-01/08 | アプリ詳細/一覧badge→共有panel。個人とWSで誰が見られるか、password/link有無を表示。非公開→限定→公開、公開の検索対象化確認。WS非公開でもnote公開の説明 | 個人handle/WS slug不足は設定へ誘導し元操作へ復帰。変換中/要LLM本文なし公開拒否。無編集権限はreadonly、直接commandも拒否。公開解除は直ちにapp由来の公開読取・検索へ反映、変更通信失敗で誤成功表示なし。member数はmember本人だけ |
| P4-T2 / SH-02/04 | 限定/公開で推測困難なtokenリンク表示・copy通知、clipboard拒否は選択可能text。再発行確認→新link、旧link失効、password設定保持 | 非公開ではlinkを表示しない。再発行取消は旧link維持、連続再発行・遅い応答は最終tokenのみ有効。限定→非公開で無効、再限定で同token復活（再発行なし）。一時無効化とtoken永久置換を分けてDB/実viewerで確認 |
| P4-T3 / SH-03/06 | 8文字password設定、正しい入力→本文。24h以内の同端末通過、変更・解除の確認。公開へ変更時はpassword解除を説明 | 7文字拒否、保存済みpasswordを再表示しない。誤入力共通error/連続失敗rate、入口でtitle/本文断片なし。24h期限、変更/解除/再発行後の旧通過状態失効をclock/実viewerで確認。解除後は新password不要で閲覧できることと旧通過状態の無効化を混同しない |
| P4-T4 / SH-05/07、ED-11、design隔離 | 匿名で共有/公開noteのtitle/著者/更新日時/tag/styleを読む。original/default、CSS/画像の内部取得と外部失敗でも本文継続。共有ページの編集者だけ編集導線、公開ページは本人でも編集導線なし | 無効token/非公開/trashで共通not found。本文script非実行、CSS親漏れなし、現在note/refのassetだけを公開閲覧policyに接続。私有原本・過去版・未保存draftまで自動公開する解釈は加えない。旧sandbox/media方式全量ではなく公開の実描画と読取許可境界を確認 |
| P4-T5 / DS-01〜04、WS-08/09 | 個人公開pageとWS公開pageに所有先の公開noteだけ。本人/memberも外部表示とbanner。タグ・page内検索、0件説明、作業一覧との往復。WS公開切替はnote状態を変えない | handleなし/不存在/削除account、非公開/削除/不存在WS slugはnot found。creatorがAでもWS所有noteはA個人timelineに並べない。WS member一覧は外部非表示。DS-03の形式/sort引継ぎとscope絞込解除はP3完成機能に接続して確認 |
| P4-T6 / DS-05 | 全個人/WSの公開noteを関連度順、title/抜粋/著者/更新日時/tagで検索。タグはscopeを跨ぐ名前一致。期間は更新日時。URLを再訪して条件復元 | 非公開/限定はsignin所有者でも除外。1文字実行なし/2文字開始、日本語部分一致、cloud→Cloudflare一致・flare不一致。作成月と更新月が別のnoteでOR-05作成日時との混同を防ぐ。0件提案/エラー再試行/rate、公開解除後の候補/抜粋/件数除去。ranking方式や新閾値は採用前に固定しない |
| P4-T7 / DS-06、SH-04/05/07、ED-09/10、WS-10 | 公開note/pageのtitle/description/代表画像/canonical・sitemap。公開trashは本文なし410、復元で同URL本文復活。限定trashは共有link404、復元で同linkと元設定復帰 | 非公開/限定へ戻った旧公開URL404、完全削除404、WS削除後は公開/限定URL404。公開だけをsitemap/検索index対象にし、private/link/app/settingsを除く。実HTTP/metaと永続状態を対応付ける。外部検索エンジン即削除の保証はしない |
| P4-T8 / OR-12、SH-08、DS所有表、WS-10 | 個人→WS→別WSへ正当移動し、公開/共有URL不変、app URLと閲覧範囲/所有timelineは新scopeへ。元creatorは書換えない。移動前に閲覧者増減を警告 | 移動拒否/取消で所有・URL・公開状態を半端に変更しない。移動元WS削除で移動済み別scope noteを巻き込まず、現所有WS削除ではそのnoteの公開/限定URL失効。URL主体の決定は下記Q1採用後に具体化。P3aへ移動/URL実装を前倒ししない |
| P4-T9 / EX-01/04、ED-11 | 閲覧可能な本文をHTML/MD/PDFへ。HTMLはstyleと画像を含む単一file、埋込不能参照は元URL。MD不能要素はHTML保持。title由来安全filename、空ならID。PDFは進捗→完了、保持24h内再取得 | 本文なし拒否、PDF失敗理由/再試行。同名/禁則文字/画像失敗を小fixtureで照合し、単に拡張子が正しいだけを成功にしない。styleModeと取得済CSSのsnapshotを成果物で確認。現在閲覧権限を失った取得は拒否。未取得内部参照をexportが安全境界なしにfetchしない |
| P4-T10 / EX-04、SH-06、JB-01 | 匿名public/password通過link→HTML/MD/PDF。PDF画面内進捗、短期署名ticketでpoll/受取。ticket切れから操作やり直し→残PDF再利用。同note進行中は新生成せず同結果を待つ | ticket改変/期限/対象違いと、各poll/受取時の非公開化・trash・token再発行・password変更を対にする。ticket有効でも現権限なければnot found。匿名jobは本人履歴にも他人履歴にも出さず、一括downloadを出さない。rateと同時要求合流は実DB＋代表viewer UI |
| P4-T11 / EX-02/03、OR-09、JB-01 | 現scopeで選択/絞込全体の全選択→HTML/MD/PDF ZIP。親1＋子結果、離脱後継続・再訪受取。空本文を件数付き除外、部分失敗は成功fileと失敗一覧同梱、同名を連番化、7日内再取得 | 500/501、合計1GB境界、不正対象/混在権限、選択中filter変更で解除。生成中note削除はその対象を除外し兄弟継続。実行中1件制限/待機列なし、完了後再要求。7日期限切れ・90日job履歴を別clockで確認。全選択を読込済みpageだけへ縮小しない |
| P4-T12 / JB-02/03、EX-02/03 | 失敗子だけ明示retry→親再実行中・最新内訳/ZIP組立直し。取消確認→未開始停止、開始済み処理の収束と中間生成物破棄、再訪でcancel独立状態 | ZIP組立中の失敗子retryは全件拒否・完了後再試行、二重要求抑止。削除/現在権限失効対象retry不可。完了/cancel済は元操作から新要求。他人にはWS ownerでもjob不可。遅い旧結果/旧noticeがcancel/新attemptへ戻さず、cleanup失敗を実体解放済みとしない |
| P4-T13 / OR-09、SH-01、JB-01〜03 | 複数noteの公開状態変更を親子結果で確認。一部不適合でも正当な兄弟は結果を保持、失敗理由と対象数を示す | viewerはdownload以外の操作なし。公開前提不足/本文なし/途中権限失効、取消/再試行、500上限を対象別policyと照合。WS slugと個人handleの混在要件は下記Q3採用後に固定。P3タグ/移動/Driveの未完を同時に完成扱いしない |

## HTTPと保持期限の読み分け

| 状態・経路 | 原文で固定できる期待 |
| --- | --- |
| 現在公開・activeの公開URL | 本文表示。所有WS非公開でもnote公開は独立 |
| 公開状態を維持したtrashの公開URL | 410相当、本文なし。同じnoteを復元すれば同URLで表示 |
| 非公開/限定へ戻った旧公開URL | 404相当。過去の公開取り下げを区別して漏らさない |
| 無効/再発行済/非公開化/trashの共有token URL | SH-05共通not found。公開trashの410を共有経路へ横展開しない |
| 完全削除されたnote、削除WSの対象note公開/限定URL | 404相当。過去公開を示す追加墓標を要求しない |
| PDF24h・ZIP7d・job90d・password通過24h・匿名ticket短期 | 別々の寿命。物理生成物の保持期間内でも現閲覧権限/ticketは別確認。期限境界の起点と実運用秒数は採用後に固定 |

SH-07の「削除されたURLは見つかりません」とDS-06の公開trash410は、DS-06の詳細分岐を使えば区別できる。論理的矛盾として新しい判断を求めない。SH-04の非公開化によるlink無効とSH-01の再限定で同link復活も、一時非公開と明示token再発行の差で両立する。

## Manager判断が必要な具体化

以下は現在の製品欠陥ではない。P4の実装・受入条件を確定する前の未指定点で、方式や追加拒否をVerifierが採用しない。

### P4-Q1: 公開URLの主体と世代

元IDはOR-12、SH-07、DS-01/04、WS-07/09。OR-12は移動時の公開/共有URL不変、SH-07は著者handle変更で旧URL失効、DSは所有scopeによるtimeline所属を定める。creatorとowner scopeが異なるため、「現在ownerのhandle/slugを毎回URLへ埋める」だけでは移動不変を説明できない。

原文から固定できるのは、移動直後に同じ公開URLを読めること、明示した著者handle変更後の旧URL失効、timeline所属はcreatorでなくownerで決まること。URLのanchorがcreator/初回公開主体/現在所有先/安定note IDのどれか、handle/slugがcanonical表示用aliasなのか、どの主体の世代変更でどの旧URLを拒否するかは未指定。

具体対は、A作成のWS noteをB個人へ移して同URL維持→A handle変更、B handle変更、元WS slug変更を別々に行う場合。creator unknownや退会済み、移動先slug/handleなしでもOR-12にない新しい移動拒否を作らない場合も判断対象となる。安定IDとcanonical alias等は実装候補であって本書で採用しない。原文が必ず両立不能だとは断定せず、採用した主体/世代と公開入口の正規URLの観測を結び付ける。P3aへの先行URL実装条件にはしない。

### P4-Q2: 保持生成物と現在本文・現在権限

元IDはEX-01/03/04、JB-01〜03、designの取得時現在認可。保持24h/7dは現閲覧権限の免除ではない。一方、PDF生成中/保持中に本文・title・styleが変わった場合、再取得が元snapshotか最新版か、同note進行中生成への合流がどのsnapshot単位かは明記されていない。

ZIPの一部noteが生成後にprivate化/権限失効した場合、現在権限を確認しても既存ZIPをそのまま渡すと失効対象を含む。全体拒否、許可分からの再生成、期限内の別artifact等の具体挙動は採用が必要であり、Verifierが追加拒否を固定しない。生成中の削除はEX-02の対象除外＋兄弟継続を維持する。公開/共有という独立根拠がなお有効な利用者を、membership失効だけで常に拒否する新条件は作らない。

PDF/ZIPのsnapshot識別、再利用/再生成の表示、元jobと新要求、部分失効時の利用者への回復案内を決める必要がある。生成物の保持をprivate履歴/原本公開や現権限の代替にしないという安全条件と、UXの選択肢を分ける。

### P4-Q3: 一括公開のWS前提

SH-01はWS所有noteの公開前提を個人handleの代わりにWS slugとする。一方OR-09は一括公開で「公開ハンドル未設定なら設定を促して中止」とだけ記す。個人handleなし・WS slugありのeditorがWS noteを一括公開する対では、単体公開と一括公開で前提が異なる読み方ができる。

提案はSH-01のnote所有scope別前提を一括対象にも適用する解釈。ただし採用前にOR-09の全体中止/対象別失敗の具体的な範囲を決めない。混在scopeが操作入口で成立するかもP3の採用選択契約による。P3aのslug作成や現在roleの受入をこの判断待ちにしない。

### 運用値の未指定部分

署名ticketの「短時間」、token十分長、password/download/公開検索rate、PDF deadline/同時合流の上限、ZIP同時1件の主体、1GBの実bytesと計数時点、保持期間の起点は正式P4で採用値と根拠を明記する。既存個人5GiB/WS20GiBからZIP1GBを自動的に1GiBへ読み替えない。新たな全件上限・匿名署名の特定方式・生成物quota方式をこの準備で採用しない。

## 後続依存と検証の線引き

- P3のscope/現在role/creator unknown、移動、タグ・選択をP4へ接続する。P3aの限定受入に公開機能や移動を前倒ししない。
- AC-07のhandle/プロフィールとWS slugは公開前提/URL失効へ接続する。未接続なら設定誘導を完了扱いせず該当元IDの残条件にする。P5の実Google/メール/Drive/OpenRouterは別。
- HTML/CSS/媒体の既存安全化と現在ref、C1保存style/snapshotをpublic/exportに適用する。未変更の全codec/FD/PM/20版方式を再試験しない。新しいPDF rendererが外部URLへアクセスする場合の安全取得/resource境界は、designの既存リスクに結び付けたP4実装時の確認対象とする。
- PDF/ZIPの生成中/結果commit/取得時の認可、取消/古いlease、cleanupと期間切れは実DB/小storage/実viewer UIで確認する。第三者サービスへの実生成や公開配備を勝手に発注しない。
- sitemap/noindex/meta/HTTPをローカルで確認しても検索エンジン実indexの成功や即時削除とはしない。公開・共有のsecret/token/passwordを報告や画像へ保存しない。

入力/境界はT1〜3/T6/T9〜11、認可はT1〜13、空/通信/retryはT1/T3〜6/T9〜12、競合・取消・削除はT2/T7/T8/T10〜13へ対応する。全OSや全browserの追加保証を受入条件にしない。

goal-implement/manager-loop、spec-manual-test、markdown-styleに従い、条件の出所と未指定点を分けた。作成したのは本書だけ。製品code・DB・browser・process・test/helper・hash/git・temp・外部サービスは調査も操作もしていない。2026-09-10T15:48:48+09:00、全観測未実行・fixture未作成のまま文書を提出し、全操作を停止する。
