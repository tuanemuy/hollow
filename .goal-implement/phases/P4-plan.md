# P4 最初の接続スライス案

2026-09-19T19:23:30+09:00。P3f 接続後 source の読み取り専用準備。P3f は未受入であり、本書は P4 の着手・方式・追加受入条件を採用しない。変更対象は本書だけ。

## 結論

最初の委譲候補は「現在の編集者が限定公開にし、匿名の有効リンクで現在本文・媒体を読み、非公開化・再発行・password・現在所有 WS 削除で失効する」縦スライスとする。公開・限定・private の独立した閲覧根拠は共用契約に含めるが、SH-07 未決を永久 URL 案にも creator 連動案にも固定しない。

次の候補は「公開への変更 → 匿名 note → 現在所有の公開ページ内検索／横断検索 → 公開解除」である。検索だけ、公開ボタンだけを先に完成扱いしない。個人 handle・著者プロフィールと WS 公開設定が現 source にないため、SH-07 の回答だけでこの全経路が接続可能になるわけではない。

プロフィール本体と PDF/ZIP、Google/OpenRouter/Drive は後続へ残す。著者表示・個人公開前提を必要とする最小プロフィール読取／設定復帰はその後続との接続依存として明示し、初回スライスのために一括実装を始めない。SH-05/07 の download も後続 EX 接続まで残条件であり、初回スライス受入を SH 全体の完成としない。

## 照合した入力

[sharing 全文](../../spec/scenario/sharing.md)、[discovery 全文](../../spec/scenario/discovery.md)、[export 全文](../../spec/scenario/export.md)、AC-07、WS-08/09、[brief](../brief.md)、[design の P3f/P4](../design.md#p3fのワークスペース削除)、[P4-shared-contract 全文](P4-shared-contract.md)、[P4-prep 全文](../reviews/P4-prep.md)を確認した。既存準備の T1〜13 を再定義せず、現 source への接続差と最初の分割だけを補う。古い共有契約の「未採用」表記より現在 design の採用状態を優先する。

## 現 source の接続点と不足

| 境界 | 現在の実形 | P4 の最小差分候補 |
| --- | --- | --- |
| note 状態 | `domain/note/entity.ts`、`application/note/view.ts`、`adapters/libsql/repositories/noteRepository.ts` は visibility が private 固定。`hollowSchema.ts` に共有状態・token・公開世代列なし | 3状態を正本にし、read DTO／保存・変換・復元が private に戻さない。所有世代・本文版と共有世代を分離 |
| 所有移動 | `application/move/usecases.ts` は現在 source/destination の編集認可と再確認。`noteMoveRepository.ts:271` は owner・version・ownership_generation を更新し、creator/updated_at を変更しない | 新しい公開 identity・公開世代・共有 token を移動 UPDATE に入れない。公開前提不足を移動拒否に追加しない。移動後 audience 表示を 3状態へ拡張 |
| 削除 WS | `workspaceSchema.ts` は同 ID の active/deleted CHECK と nullable profile。`workspaceRepository.ts:35` の find と role は active 限定。削除受理後、note の有限 admission は別処理 | note が active のまま残る期間でも、公開 reader は同 read snapshot の現在 owner WS が active か検査。物理回収・membership 行削除を待たない |
| app 認可 | `application/workspace/access.ts` の requireNote は現在 note owner の個人所有／WS role を使用 | 公開根拠を通常 membership 認可に混ぜない。外部 reader を別入口にし、公開から編集／history／draft へ昇格させない |
| 本文描画 | `application/asset/references.ts` の renderNote は認証必須かつ入力 HTML を受け取る editor 用。renderAuthorizedHtml は安全化済み描画処理を共用可能 | anonymous は note identity と閲覧根拠だけを入力し、正本 HTML を server で取得。任意 HTML 投稿・noteId 偽装を public render の API にしない |
| iframe/CSP | `NoteContent.tsx` は renderNoteFn を呼び、script を許さない sandbox。`editorMedia.ts:120` の frameDocument は既存 app media/history URL だけを許可 | 安全化／frame の契約は再利用するが、既存 NoteContent をそのまま匿名へ置かない。外部閲覧 DTO と媒体 URL の安全な対応が必要 |
| 媒体／原本 | `asset/access.ts` の getAsset は session＋requireNote。current ref・history・draft は別判定。`mediaHttp.node.ts` は private no-store、GET/HEAD/Range。私有 original は別入口 | 外部入口は現在 note の current ref の ready asset のみ。history/draft/source original は公開しない。公開 URL／token/password 世代を媒体取得にも束縛 |
| 検索 | `browseReadSnapshot.ts` は同 read Tx で session／active WS を確認し、scope・active を SQL 候補に適用。SearchExecutionPort の request は sessionHash 必須 | 既存 app 認可を外さず、public 専用 read request／snapshot を追加。public＋現 owner 存続を LIMIT/count/snippet/tag/thumbnail の前に適用 |
| 公開プロフィール | accounts は email/password/認証のみ。AccountRepository に handle／表示名／bio／public 読取なし | 公開 DTO は email を表示名として流用しない。既知 creator を unknown と偽らず、後続の public profile port と不足時の表示契約を正式化 |
| WS 公開ページ | slug／name／description／icon は存在。Workspace 型・schema にページ公開状態なし | note visibility と独立した WS ページ公開設定、active＋current slug で解決する public page reader が必要 |
| 現 actor | `WorkspaceDeletionProvider.tsx:61` は route context の actor と epoch、currentActor、actor 別 state を使用 | 共有設定、copy、password、旧 catch/finally、lookup、notice を actor＋note＋dialog/route の操作世代に束縛。A→B→A も ID 一致だけで復活させない |

この source 確認は実行時成立の証拠ではない。schema 移行、HTTP、UI、race の検証は未実施。

## 依存グラフと分割候補

```text
P3f 固定 source の独立受入
  └─ 現在 note/owner/lifecycle を同 Tx で読む共有 policy
       ├─ A: 限定/private・token・password・匿名本文/current媒体・失効
       │    └─ 著者表示: public profile 読取の実 prerequisite
       ├─ B: 公開変更・公開 note・HTTP/meta
       │    ├─ 公開前提: 個人 handle / WS slug
       │    ├─ 著者表示: public profile 読取（email は不可）
       │    └─ note URL policy 承認（SH-07 の未決枝は別）
       └─ C: 公開ページ・ページ内検索・横断検索・sitemap
            ├─ B の現在 canonical URL
            ├─ 個人 public profile / WS ページ公開設定
            └─ 既存 projection・Unicode/tag key・civil date・隔離 read

A/B/C の現在閲覧根拠・current媒体 snapshot
  └─ 後続 EX: HTML/MD、PDF・ZIP・ticket/job/artifact
```

A/B/C は提案名であり、正式フェーズ ID ではない。

### A: SH-07 非依存の最初の縦スライス

アプリ詳細／一覧の共有状態と説明 → 編集者の限定/private 変更 → copy/fallback → 匿名リンク本文と current 媒体 → 非公開・再発行・password 変更・trash・削除 WS の拒否までを接続する。匿名画面には SH-05 のタイトル・著者の実表示名・更新日時・タグを必要とする。password の設定は利用者にとって任意だが、提案 A は設定／変更／解除／通過を含む。分割する場合は SH-03/06 を別小スライスの残条件へ明示し、未提供の toggle を動作済みに見せない。

個人／WS の現在認可、viewer readonly、member 本人にのみ人数、リンクからの現在編集者だけの編集導線、noindex、共通 404、通信失敗／取消／keyboard／390px を対象にする。限定→private→限定は同 token 復活、明示再発行は永久置換。password は8文字以上で保存済み値を再表示せず、再発行時は設定を保持する。変更・解除で旧 grant 無効、匿名でも通過状態を端末に24h保持、gate でタイトル／本文断片を出さず、誤入力共通エラー・連続失敗rateを必要とする。

これは SH-01/02/04/08 と SH-05 の閲覧部分等の部分受入候補である。著者の実表示名がまだ取得できない場合の UI は未決として返す。仮の公開プロフィールや「作成者不明」への付替えで SH-05 完成を偽装しない。download 未接続も残条件にする。

### B/C: 公開・公開ページ検索の最小縦スライス

実公開変更 → 現在 canonical の公開 note → 現所有 timeline → そのページ内タグ／検索 → note 再閲覧 → 公開解除後の本文・候補・抜粋・件数除去を一組にする。WS 所有では現在 slug 前提と、WS 自体の公開設定を分ける。非公開 WS の public note は直接公開閲覧と横断検索の対象だが、WS 公開ページは 404 のまま。

個人 `/@handle` と WS `/w/slug` は原文で固定済み。note route の具体文字列は未採用。個人ページの handle 設定→元共有操作へ復帰を mock や空 route で代用しない。プロフィールを後続のままにするなら、その依存枝は受入待ちのままにする。WS 系を先に進めても著者表示の依存は残る。

ページ内検索は現在所有＋public＋active、横断検索は全所有＋public＋active で同じ語規則を使う。後者は tag の scope 内 ID ではなく Unicode16 の名前 key、期間は updatedAt、2文字以上、関連度順、URL 復元、rate・0件・失敗再試行を必要とする。app の createdAt 月絞込み・選択500件・現在 user が読める private を流用しない。SQL の有限 page を保ち、全 HTML を JS 配列へ取得しない。

HTTP では現 public＋trash の有効公開 URL だけ 410、private／限定／purging／物理削除／削除 WS／旧世代は 404。共有リンクは trash も 404。410 に title/本文を含めない。復元時の同 URL、現 canonical・meta・sitemap、private/link/app/settings の noindex を接続する。外部検索エンジンへの実掲載はローカル成功に含めない。

## 共用 port／schema の最小提案

以下は採用前の責務案であり、列名・暗号方式・運用値の決定ではない。

| 対象 | 提案する契約 | 避ける結合 |
| --- | --- | --- |
| 閲覧根拠 | `app(session)` / `public(identity,generation)` / `link(token,grant?)` の判別 union。application が同 Tx の現在状態から可否を決める | 公開を読むために member 化、旧 link を current public へ暗黙昇格、client の canRead を信用 |
| 共有正本 | note 1対1の共有 row または note 列に visibility、独立 public identity／URL generation、token identity、password verifier／grant epoch、共有 OCC version | ownership_generation や note.version を公開 URL 世代に兼用。通常 save/restore が古い共有状態を上書き |
| 書込 port | UoW 内で現在編集者・owner active・lifecycle・本文公開可否・handle/slug 前提を検査し、共有 version 付き状態変更／再発行／password 操作 | UI 確認時点だけの認可、password解除同意が古い状態へ作用、旧 mutation 応答を成功表示 |
| token 保持 | 推測困難な発行と照合の責務を token port に置く。後日共有 panel で同リンクを再表示できる保存／再構成方式が必要 | hash だけ保存すれば常に再表示可能という仮定、secret を一覧/ログ/receipt に混入 |
| password grant | note/link identity、password epoch、期限に束縛された通過状態。24h、変更/解除/再発行時の旧状態拒否 | account login password の12文字規則を流用、password 平文再表示、汎用 session への昇格 |
| 外部 read DTO | current title/安全本文/display/updatedAt/tag/author public fields/許可 current媒体/canonical のみ。unavailable と password gate は本文 DTO と別型 | NoteView.original/notices、email、member一覧、history/draft/未保存本文を丸ごと serialize |
| public profile/page | current handle→account の public profile、current slug→active/public WS。個人所有 timeline と creator 表示は別取得 | creator 一致の所有判定、削除主体の名前再利用による creator 付替え、deleted WS slug 予約行の公開 |
| public search | public 専用 search request、同 read snapshot に認可＋候補/total/facet/snippet。projection は既存内容 source 照合と正規化を共用 | 全件 app browse 後の JS filter、古い projection を公開認可の正本化、匿名への選択/job操作提供 |
| 外部媒体 | 閲覧根拠＋note＋asset の束縛を毎 GET/HEAD/Range で現在照合。current ref version=0、ready、現在 owner active | public URL 一度解決後の無期限 asset key、元 uploader/元 WS による許可、history ref の公開 |

共有 row を分離する案は、P3 既存 note save が共有を private へ戻さない利点がある。一方、現在 Note.visibility の正本を二重化しないよう repository/DTO 読取を統一する必要がある。note 側へ列追加する案なら全 save/変換/復元 writer の保存保持を確認する。選択は正式実装で比較する。

新 row の note purge 時削除、P3f の削除 WS fence、page 公開設定の deleted profile 縮小、検索索引の可視条件まで同時に接続する。大量 note を同期 private 更新する方式を P3f に追加しない。metadata を残しても削除 receipt/intent を公開認可として使わない。

## 全入口の現在状態と失効

| 入口 | 読む現在値と拒否 | 移動／遅い結果 |
| --- | --- | --- |
| status/link/password 書込 | 同 UoW の session、note、現在 owner role/active、共有 version | 移動後は移動先で現在編集可能か。旧確認先の role だけで commit しない |
| 公開本文／meta／canonical | 同 snapshot の公開 identity/世代、visibility、lifecycle、現在 owner の存続 | 元 WS deleted を参照しない。現 WS deleted は admission 前でも 404 |
| link/password gate | 同 snapshot の現在 token、visibility、grant epoch/期限、owner/lifecycle | 旧 token/旧 grant は現在 public でも救済しない。private→限定だけは現 token の再有効化 |
| public page/search/sitemap | current handle/slug、page 公開可否、現在 note owner、公開状態・lifecycle・owner active を候補 SQL へ | moved-out は元 timeline に残らず、新所有 timeline へ。count/snippet/tag/image も同条件 |
| asset／thumbnail／代表画像 | 外部閲覧根拠＋current ref＋ready と current owner を取得前に再確認 | 原本 uploader、draft admission WS は許可根拠にしない。長期 cache／署名だけで失効を迂回しない |
| render の遅い戻り | 外部リソース検査など Tx 外 await があれば、公開応答採用前に取得した共有状態と現在 source/認可を照合する設計が必要 | 旧本文の応答を新公開状態／別 note に転用しない。受信済 bytes の回収や無限監視は保証しない |
| UI result/catch/finally | actor epoch＋note＋route/dialog operation identity | A→B→A、閉じ直し、遅い再発行、membership喪失時に旧成功／通知／busyが現画面を変えない |
| 後続 export poll/受取 | ticket/job の要求者束縛に加え、現在閲覧根拠と出力 snapshot 一致 | 元 link/世代を別入口へ昇格しない。現 WS deleted は cache があっても拒否 |

## SH-07 への本当の依存

| 判断 | SH-07 回答との関係 |
| --- | --- |
| 3状態・現在 owner 認可・private失効・token再発行・password・public候補 filter | 非依存。回答前でも設計・限定スライスの提案が可能 |
| 中立 note identity、移動で identity/世代/token/creator 不変 | 採用済み。SH-07 を理由に再決議しない |
| `/@handle`、`/w/slug`、旧個人/WSページ404、WS slug変更はnote URL不変 | 原文／採用済み。SH-07 の note 世代枝と別 |
| 公開 note route の文字列構文 | 中立 identity＋世代を表せる候補はどちらの回答でも設計可能。ただし現在 design は回答後確定と明記しているため、本書はその留保を解除せず route を採用しない |
| handle を初めて設定できる入力・一意性・個人公開の前提 | SH-07 非依存。AC-07 の port/UI/validation は未接続であり別依存。初回設定に既存 WS note 世代更新を伴わせるかは SH-07 関連の未決 |
| creator の既存 handle 変更時に、他 owner/WS の存続 note を回転させるか | 真の未決。どちらも実装・受入期待へ採用しない。変更警告、対象列挙、世代更新の原子性/有限処理も回答後に具体化 |
| URL 世代の生成・照合自体 | 移動世代と独立させる契約は採用済み。初期値／発行タイミング／handle変更との操作結合は正式詳細化。現在 owner 名で URL を組み直して留保を迂回しない |

したがって「SH-07 が未回答だから共有も検索も全て設計不能」ではない。一方、「具体 route を決めて handle 変更だけ無視すれば SH-07 も完了」でもない。実装開始範囲と、公開 route 採用の留保を Manager が分けて委譲する必要がある。

## 受入に必要な実条件と後続境界

正式着手には P3f 固定 source の受入と、最初の対象範囲・route/secret/password/rate の未指定方式の決定が必要。プロフィール未接続を含む R06 の残条件を台帳に保ち、既存 T1〜8 の今回変更分を検証へ渡す。本書は数値や方式を新たに採用しない。

実確認では個人/WS owner/editor/viewer/非member/匿名を用い、同語・同tagの private/link/public と非公開WSの public を対にする。移動先 handle/slug なし、元WS削除／現WS削除、削除受理後かつ note admission 前、public trash410／shared trash404／復元／purging404、旧token/password、A→B→A の遅い成功を区別する。public projection、候補件数、thumbnail・HEAD/Range まで漏洩がないことを確認する。

公開匿名 HTTP の status/meta/canonical と実本文、通常ブラウザと bot/SSR 経路は別に確認する。現在 NoteContent が認証 POST 後に本文を出す形をそのまま SEO 完成と見なさない。画像/CSSの親漏れ・script不実行・外部失敗でも本文継続を公開実描画で確認し、既存 editor/codec 全量を無根拠に再openしない。

EX は現在閲覧根拠と current媒体に束縛した出力 snapshot port だけを共有する。HTML/title/filename/styleMode/style/媒体内容を含む内容 identity、PDF24h/ZIP7d/job90d、匿名ticket、同note実生成合流、旧snapshot拒否、ZIP一部失効時の全体拒否＋明示新要求は現在 design のまま。renderer・artifact schema・期限起点・運用値は後続委譲で決める。P3e の500選択を検索 cap へ転用しない。

プロフィールは public identity と現在 public fields、handle変更通知の接続契約を残す。Google/OpenRouter/Drive は共有 UI の成功条件に組み込まず、credential・外部API・既存Driveファイルへ触れない。関連 backup も P3f intent の内部権限を一般の外部閲覧権限へ流用しない。

## 作業境界

goal-implement と manager-loop を全文確認して使用した。spec/spec-implement、goal API、新規 agent、外部資料検索/API は使用していない。製品 file、DB、browser、runtime、test、build、git は操作していない。実行証跡を作らず、既存準備資料と現 source を設計入力として扱った。P3f の受入、P4 着手・完成・公開成功は宣言しない。
