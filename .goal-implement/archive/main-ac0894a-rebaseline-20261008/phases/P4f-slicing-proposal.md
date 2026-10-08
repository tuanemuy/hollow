# ZIP製品接続の縦スライス案

## 推奨と判断範囲

2026-09-26、Asia/Tokyoの非秘密source読取に基づく未採用案。推奨は「HTML/Markdownの完全な縦接続→PDF第三需要・内部holdの追加」の二段階。最初からZIP共通の親/run/attempt/spool/assembly/artifact/履歴/回収を使い、PDFだけを未提供として残す。HTMLだけを試験的に保存する横断基盤段階を利用者向け完成とはしない。

理由は、HTML/MDの文書生成と逐次source読取が既にあり、ZIP完成後の取得・履歴は形式に依存しない一方、PDF追加は既受入の共有compute・需要・物理回収へ跨るためである。受入の分割はManagerが決める。本案は正式製品実装や新しい受入条件ではない。P4f-0の独立検証結果を先取りせず、依存採用・writer成立は同フェーズの正式結果に従う。

比較する代替は全形式一体だけとする。公開時から全形式が必須なら一体接続は可能だが、共通ZIPの失敗とPDF共有需要の失敗を同時に切り分ける必要があり、最初の利用者向け成果が遅れる。現sourceからは一体でなければ避けられない保存上の制約は見当たらない。分割による未提供期間を明示できるなら先行案が小さい。

## 最初に観測できる結果

所有者・メンバー・viewerは既存一覧の固定選択からHTML又はMarkdownのZIPを受理し、画面を離れても進行を追跡できる。親と対象別結果、部分成功ZIPと失敗manifest、完了通知、現在認可・内容一致を確認した7日内の反復取得までが先行段階の到達点となる。以下は先送りしない。

- 選択500以下、空本文の除外件数、圧縮前entry＋manifest合計1GB、超過は全体拒否・分割案内
- account横断でなく本人account内のscope/format横断1 active、別ZIP待機列なし、同command/digestのACK再照会
- 原親90日非延長、新受理attemptの90日receipt、partial artifact期限後の新retry拒否、受理済みretryへの同Tx参照引継ぎ
- latest failedだけの再確認retry、assembly/closing中の全拒否、純粋assembly失敗の明示新親、成功子の無言再生成なし
- 取消・現在認可喪失・削除・内容変更、公開前の単調除外、公開後の旧ZIP全体拒否、実closeと物理回収負債

これは[EX-02/03](../../spec/scenario/export.md)、[JB-01〜03](../../spec/scenario/jobs.md)、[採用ZIP契約](../design.md#一括zipの接続判断)をHTML/MDに適用する段階であり、全形式のEX-02/03完了ではない。PDF一括・匿名ZIP・Driveを成功表示やplaceholder jobで補わない。匿名ZIPは元から対象外である。

## 型と保存境界

既存`ExportFormat = "html" | "markdown"`は[単件document port](../../packages/core/src/application/export/document.ts)の契約なので、PDFを足して既存writerに未実装分岐を作らない。ZIP専用の保存formatは最初から`html | markdown | pdf`を表現する案とし、最初の受付可能formatは実装済みの`html | markdown`へ明示的に絞る。UI表示とPOST境界の両方でPDF未提供を示し、未対応値のHTML fallbackを作らない。

保存上の三形式対応はPDF実行の提供を意味しない。最初のmigrationで共通format CHECK・固定options/profile/identity・run/ordinal/spool参照を形式非依存にする。全成功ZIPで子spoolを解放しても成功履歴は残る形と、runのpublished事実を保持する形を先行段階で採用する。これらを後からPDF用に移し替えない。[保持案](P4f-retention-proposal.md)、[保存構造案](P4f-storage-contract-proposal.md)

PDF専用のwaiting-pdf/copy-ready/copyingとholdは後続migration・型branchで追加できる。HTML/MDの共通attemptとPDF待機の関係はtyped拡張として設計し、今は存在しないcompute/hold列へ偽の値を保存しない。正式DDLでstate CHECKの拡張が必要なら、既存HTML/MD rows・FK・cleanup refsを維持した移行とする。未採用DDLを今回確定しない。

共通spoolは可搬ファイルのbytes/hash/format/profile/identityだけを持ち、元HTML/媒体packやrendererの情報を必須にしない。後続PDFも検証copy後に同じspool結果へ合流する。過去HTML/MDのprofile・digest・commandを新形式追加で書き換えない。旧runtimeへ戻す場合はPDF行を既知形式へ解釈し直さず、claimを止めて未対応とする必要がある。rolling downgrade対応を新要件にはしない。

## sourceに基づく変更境界

| 領域 | 先行HTML/MDで必要 | PDF後続だけで必要 |
| --- | --- | --- |
| 文書と現在read | [export document/stream](../../packages/core/src/application/export/stream.ts)、source・filename・媒体検証を再利用。ZIP用のdurable actor/current-read snapshot入口を接続 | [PDF snapshot](../../packages/core/src/application/pdf/snapshot.ts)のactor/current-public読取・固有profile/identityで共用computeへ接続 |
| 受付・実行 | ZIP専用application/UoW/repos/worker、親/run/子、spool、assembler、短期delivery、回収。既存[prepareExport](../../packages/core/src/application/export/usecases.ts)を500回呼ばない | ZIP子を明示第三需要へ追加し、cache/publish→copy-ready＋内部holdを同Tx確定、copy/実close後に共通spoolへ合流 |
| PDFへの影響 | PDF需要・配信・render実行の変更は不要。共通ObjectStorage/purgeのZIP owner追加影響は先行段階から説明する | [需要port](../../packages/core/src/application/pdf/anonymousPorts.ts)、worker、currentAnyPdfDemand、compute recover、artifact cleanup、key削除、pruneのZIP参照防御。本人/匿名需要・配信枠は不変更 |
| 選択・確認 | [BatchSelectionBar](../../apps/web/app/components/batch/BatchSelectionBar.tsx)の一括download未提供表示をHTML/MD入口へ置換。選択集合の所有を再利用し、受理/結果はZIP専用。viewerにも表示 | 同じformat選択へPDFを追加。実adapter・容量が使用可能な場合だけ受理し、未構成をreadyにしない |
| 履歴・通知 | [notes.jobs](../../apps/web/app/routes/notes.jobs.tsx)へZIP本人履歴・子結果・取得/取消/retryを併記。[ImportJobs ticker](../../apps/web/app/components/hollow/ImportJobs.tsx)へZIP親件数/通知を合算。独立dismiss/actor guardを維持 | 共通ZIP履歴へPDF形式と待機/copy工程を反映。ZIP子を単件PDF本人履歴へ500件追加しない |
| 起動・回収 | DI、UoW、Node workerのclaim/renew/stop/recover/pruneとZIP HTTP配信を接続。実closeまでactive ownershipを維持 | PDF compute需要とZIP工程の所有引継ぎを接続。source PDF24hをZIP7日へ流用しない |

現在の[readExportSnapshot](../../packages/core/src/application/export/snapshot.ts)はaccount sessionを要求し、元単件authorityにもsessionHashを保存する。durable ZIP workerへsessionを保持する案は不適切であり、本人accountと現在readを持つ別入口が必要となる。HTML/MD先行を理由にcurrent-publicの独立read根拠や内容不変move再利用を省略しない。一方、[readPdfSnapshot](../../packages/core/src/application/pdf/snapshot.ts)の内部buildはPDF構成を要求するため、HTML/MDの認可helperとしてそのまま呼ばない。共通化するなら現在note/read取得だけを中立application helperへ分け、各形式のsnapshot/identity生成を維持する。

既存[batch worker](../../packages/core/src/application/batch/worker.ts)は現在edit・元source edit・scope一致を要求する。選択集合UIは再利用できるが、ZIPを既存batch operation enumへ足して同workerで実行しない。`BatchSelectionProvider`のmutation用accept/receiptとZIP受理を混同せず、選択解除・画面離脱で受理済みZIPを取消さない。

[PdfActivityProvider](../../apps/web/app/components/pdf/PdfActivityProvider.tsx)の本人/epoch guard・観測中ID・未取得を完了扱いしない責務は参考になる。PDF固有API/DTOをZIPへ流用せず、ZIPの親/runとartifact可用性を別表示する。新しい汎用job frameworkは必要ない。

## 未決資源パラメータの種類

数値は未採用。既存本人1 activeや業務500/1GB、履歴90日、artifact7日は可変技術値として扱わない。

| 種類 | 決める対象と非流用箇所 |
| --- | --- |
| global実行枠 | 全本人を跨ぐZIP実行、子生成/媒体I/O、assembly、PDF内部copyの同時所有。本人1件とは別。既存HTMLMD短期operation枠・PDF compute枠・本人/匿名PDF delivery2枠をZIPの組立/copy枠へ転用しない。PDF生成自体は既存computeの受付・枠を守って共用し、別rendererを重複起動しない |
| 実容量と予約 | 成功spool・assembly出力・完成7日artifact・delivery hold・cleanup負債・一時copyの合計とheadroom。STORE上界による出力予約。共有PDFは物理key一回、copy中の別実体は両方計上する |
| 配信 | ZIPの同時readerと短期delivery所有、切断時close、backpressure。PDF/HTMLMDの配信120秒をZIPへ無断流用しない |
| 有限工程と回復 | generation/assembly/copy/配信の期限、lease/renew、cleanup再試行と有限page。lease切れを実close証明にせず、履歴/保持期限を延長しない |
| buffer・実行負荷 | chunk/HWM、entry metadata、source同時open、CPU/RSS/event-loop影響。writer probeの小fixtureを全1GB資源保証へ外挿しない |

HTML/MDだけでも共通diskが埋まるため、ZIP専用上限だけで既存処理が保護されるとは限らない。既存export/PDFの予約会計と実diskの共有関係を明示し、配備上の予算分割又は同じ実容量を二重予約しない受付制御を正式担当が選ぶ。新しい汎用容量サービスを本案の前提にはしない。容量不足でも約束済み7日/有効retry spoolを早期回収しない。

## 提供・受入の区分

先行受入候補はHTML/MDのEX-02/03とJBの該当観測だけ。PDF一括の未提供表示・server側受付拒否を残し、単件PDFが動くことをZIP PDF完成の根拠にしない。既存単件HTML/MD/PDFも継続提供し、ZIP導入で短期operationを7日へ延命しない。

後続受入候補では第三需要/内部holdの追加影響を受ける既存PDFの範囲を明示する。共有computeの兄弟需要保持、期限内hold、copy実close、取消、回収・pruneは後続の実装/検証対象として残す。PDF後続が未完なら全形式のZIP機能は未完であり、全体goalの完成とはしない。

Manager判断は二段階の製品接続を選ぶかだけ。正本へ採用されるまではphase分割・条件・型・migrationを変更しない。根拠は上記非秘密sourceと既採用文書の読取のみ。製品・既存probe・DB・runtime・test/build/install・外部・管理正本は操作していない。doc-style/markdown-styleに従って採用済み制約と提案を分け、本書全文の再読後、文書を含む全操作を停止する。
