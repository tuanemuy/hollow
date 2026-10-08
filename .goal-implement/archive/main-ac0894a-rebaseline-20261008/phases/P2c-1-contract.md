# P2c-1 保存・版・復元の接続契約案

2026-09-06 12:15 JST（Asia/Tokyo、実 clock 12:15:15）。D 候補の source を読むだけの設計整理。機能実装、DB、test、build、server、browser 操作は未実施。D の独立合格を示す報告ではない。

入力は ED-01/07/08、採用 design、[C1 の既存提案](P2b-D-P2c-proposal.md)。現在を含む 20 版、復元は新しい保存、意味のある変更だけの版、現在認可と履歴 scope の分離は変更しない。C2/C3 の設計を作り直さず、WS/public/AI を実装対象へ追加しない。

## D 後の差分

| 接続点 | 現在 | C1 の最小変更 |
| --- | --- | --- |
| `domain/note/entity.ts` | `editNote` は常に note.version を加算 | 意味のある正本比較と履歴 append を分ける。note.version は既存 worker の concurrency clock として維持 |
| `domain/note/displayStyle.ts` | 表示値と初回 job/由来を union で保持 | revision snapshot は表示値を保持。運用中の pending/job ID を復元対象にしない |
| `note/saveNote.ts` | 安全化・同 note 再利用・asset 確定後に note 保存 | その最終正本を共通 commit へ渡す。V5 の新規 ID/退避移行は維持 |
| `setDisplayStyle.ts` | 最新本文に user 設定を反映し version 更新・再 schedule | 本文/title/style の変更時だけ版を append。由来だけの更新を空版にしない |
| `settleDisplay.ts` | 初回の終端/消失を回収。値が変わる場合だけ version 更新 | original/default の値が変わる時は system 版。完了理由だけなら版なし |
| import/reference commit | 個別 guard 後に HTML/display を同一 UoW 保存 | 成功した最終正本を共通 commit。lease/進捗/失敗台帳だけなら版なし |
| `assetRepository.ts` | current=0、正数 pin の型契約のみ。GC は全 ref 不存在を確認 | immutable revision の正数 pin 書込/削除、最後 pin 解除時刻の更新を追加 |
| `asset/references.ts` | render の asset/data 許可は current ref/ledger | history 専用の server-loaded snapshot と許可 scope を追加。現 route を緩めない |
| `reference/reuse.ts` | 旧 editor の空 CSS に現在同 note CSS を再利用 | restore では呼ばない。保存対象 revision の CSS と取得情報を正にする |

## 版を増やす条件

比較対象は、安全化・参照解決後の `{title, html, displayStyle}`。同じ canonical 保存値は no-op とする。別表記の HTML を全意味解析して同一と証明する処理や、byte 同一性の新保証は加えない。

| 変更 | revision | note.version / 初回処理 |
| --- | --- | --- |
| 初回作成・移行 baseline | 1 版 | 新規 note.version=0 を維持。移行は既存 version 不変 |
| manual/autosave/title の正本変更 | 1 版 | 既存の現在値・認可に基づく version 更新 |
| 同値 manual/autosave・保存済みの明示完了 | なし | 不要な version 更新/同じ reference job の取消再作成を避ける |
| style 値の変更 | 1 版 | version 更新、必要な最新 job を schedule |
| default/automatic/pending → default/user/complete | なし | 手動優先を永続化する。D の厳密 guard を成立させる version 更新・再 schedule は維持可能。revision 番号とは別に扱う |
| 初回 default → original、HTML は同値 | 1 版 | system 初期判定として version 更新 |
| pending → complete、値/本文は同じ | なし | D の metadata-only 保存を維持。初回失敗を再試行不能にしない |
| HTML と初回 style が同時に変わる worker commit | 合わせて 1 版 | guard 成功時だけ採用 |
| job progress/lease/failure/台帳のみ | なし | note 正本を更新しない |
| 選択した過去版への復元 | 新しい 1 版 | 現在の後ろに保存。過去行を更新しない |

revision は運用 metadata の監査ログではない。由来や初回 job の変化は現在 NoteDisplay に残す。保存日時・原因・actor は各 revision の provenance として immutable に保持するが、pending を過去へ戻す情報にはしない。

現在版への「復元」は UI で無効にする。古い版でも三つの復元値が現在と同一なら「現在と同じ内容」として無変更で終える案を推奨する。復元で空版を増やす例外は設けない。この同値時の表示文言は下記の小さい採用確認点に含める。

## 共通 commit の責務

新しい application 内関数は既存 UoW context を受け、note 正本・revision・pin の原子的保存だけを担当する。各 usecase の認可や job orchestration を巨大 service に移さない。

1. 呼出元が最新 note と現在権限を取得し、利用者競合または job の固有 guard を確認する。
2. I/O 外で準備した HTML/asset/data/CSS の結果を、現在 note または指定保持 revision との関係で検証する。
3. 共通 commit が保存値を比較し、note と必要な revision を書く。
4. 新 revision の pin を作り、current ref を差し替える。
5. 20 件を超える古い revision とその pin を除き、最後の ref を失った asset の猶予時刻を更新する。
6. 同じ UoW で呼出元が job/settings/恒久台帳/outbox を整合させる。commit の成否を見て、正本不変時に不要な再 schedule をしない。

HTTP/DNS、media/SVG 検査、storage stat/stream/remove は UoW 外に残す。共通 commit は「検証済み」と称する client boolean を受け付けない。復元対象と pin は server が repo から取得する。

`HollowUnitOfWorkContext` に typed RevisionRepository を追加し、libSQL provider の同じ transaction から構築する。append/list/find/prune を持ち、retention pin の query は AssetRepository と明示的に協調する。共通 commit の戻り値は note、現在 revision、正本変更有無を区別し、各 caller が version/job の扱いを誤解しないようにする。

manual/autosave の原因表示は UI 入力を shape 検証してよいが、actor は認証 session から決める。import/reference は system actor と initiating account/job ID を区別する。復元は現在の操作 account と復元元 revision を記録する。C3 の prelossy はこの通常履歴を使う接続だけを残し、隠し 21 版目を作らない。

## 番号と移行

`note.version` と revision の正数連番を分ける。note.version は既存 worker/保存の guard に使い、revisionNo は pin と履歴順に使う。

- 新規 note.version=0 の最初の保存は revisionNo=1。
- 既存 note.version=37 の移行 baseline も revisionNo=1。`capturedNoteVersion=37` を記録する。
- metadata-only 操作で note.version が進んでも revisionNo は増やさない。現在の正本は直近 revision と同値のまま。
- 次の意味のある保存は revisionNo=2。連番は再利用しない。note 側の currentRevisionNo/採番値を同じ UoW で更新する。
- `note_asset_references.version=0` は常に current、正数は revisionNo。`note.version + 1` の機械的 mapping は使わない。

baseline は移行時点の title/html/displayStyle を 1 版保存する。actor は legacy/unknown とし、昔の利用者や版を推測しない。記録日時と旧 note.updatedAt を混同せず、「移行時の保持版」と説明する。旧本文/title/version/updatedAt、display の由来/初回状態、original/job/asset を変えない。

baseline の pin は現在本文に対応する正当な current ref から作る。存在しない asset や別 note を HTML marker から復活させない。不整合があれば移行検査で記録して止め、保持 pin を捏造する修復は含めない。旧進行 job の pending を baseline snapshot へ実行状態として埋めない。移行後の初回 worker は D の現在状態を見て処理し、意味のある結果なら次の版になる。

移行時は online backup → clone → baseline/pin/旧値の比較 →停止した本体の migration とする。既存データに今回の read-only 作業から migration を実行していない。

## pin と 7 日 GC

現在 URL の認可は `isReferenced(noteId, assetId)` の version=0 条件を維持する。revision pin は保持の根拠であり、current URL の閲覧許可ではない。

新 revision の pin を先に作ってから current ref を外す。prune では削除した版の pin だけを除く。他の保持版/current に一つでも ref があれば `unreferencedAt=null` を維持する。最後の ref がなくなった transaction の clock から 7 日を数える。過去の古い unreferencedAt を復活させない。

既存 `replaceCurrentReferences` の最後の ref 不存在更新は、current 差替だけでなく revision prune 後にも適用する必要がある。明示的な ref 集合更新の責務としてまとめる。no-op 保存ごとに未参照時刻を延長しない。20 版が同一 asset を参照しても asset 行/object は一つで、物理 quota を 20 倍にしない。

既存 GC の ready→deleting fence、全 ref 不存在確認、期限内 draft 保持、storage 実削除/不存在確認後の行と quota 解放を維持する。restore が先に pin/current を確定すれば GC は除外し、GC fence が先なら restore は deleting を拒否する。object を transaction 内で削除しない。

保持 revision からの復元は、同 note の現在編集権限・指定 revision の存在・その pin・ready asset を確認する。版が保持している asset を 7 日以上経過だけで拒否しない。一方、通常の古い editor 用 draft→note bind による再添付は従来の 7 日猶予と current 権限を維持する。期限切れ draft の新 upload は再開しない。

## 履歴 preview の scope

history 表示は `{noteId, revisionNo}` を受け取り、HTML/title/style は server が保持版から読む。client 任意 HTML に revisionNo を添えるだけの入口にはしない。

媒体 URL の候補は `/api/notes/:noteId/revisions/:positiveRevisionNo/assets/:assetId`。表示時にだけ canonical の安定 current URL から変換し、保存 HTML には混ぜない。毎回、現在 note の閲覧権限→指定 revision の note 所属と存在→同 revision の asset pin→ready を確認する。

`mediaHttp.node.ts` の GET/HEAD/単一 Range と認可先行 416 を再利用する。`AssetReference` は current/draft/history を判別可能に拡張し、revision を current として parse しない。入口の Fetch Metadata guard にはこの厳密な route だけを追加し、same-origin subresource 条件を維持する。外部 redirect、同 owner 別 note、他 revision、prune 済み、匿名を拒否する。公開用の grant/bearer は作らない。

`NoteContent` は revision scope を source/key に含め、保存用 HTML preview と server-loaded history preview の入口を分ける。完成 srcdoc 一回 mount、選択変更時の遅い応答不採用、両 display の CSP と inert link を維持する。history 読取中に prune された asset URL は次の取得で拒否される。既に読み込んだ画素まで遡って消す保証は置かない。

### 小さい data URI と CSS

現在 `renderNote` は小さい data URI を current/acquired ledger から許可する。history へこの判定をそのまま流すと、現在集合から消えた正常画像も欠落する。

最小案は保持版の data URI を表示準備時に既存 `decodeDataUri` と `InlineMediaProcessor.inspect` で bounded に再検査すること。decoded 32 KiB 上限・内容優先・SVG 安全化・deadline/admission を維持し、I/O/検査は UoW 外に置く。安全化が必要なら表示用の安全な bytes を使い、snapshot を無言で書き換えない。復元時も保存境界で同じ安全化と除去案内を使う。恒久キャッシュは初期 C1 の必須にしない。

大きい data URI は既存内部 asset/pin で保持する。任意の data URI を history 所属の説明だけで許可しない。metadata 欠落時の externalReading=false は履歴でも適用し、内部 asset と安全な小 data の表示は維持する。

CSS 本文は immutable HTML snapshot に含める。追加の snapshot manifest は、同 note の取得済み source identity/finalURL/安全化後の関連資源/計上 bytes を保持する小さい型付き情報とする。背景/font は取得対象外のまま。CSS 全文を manifest へ重複保存しない。

restore は `reuseReferences(currentNote, oldHtml)` を呼ばず、保持版 HTML と manifest から現在対象を組み直す。現在 ledger の同じ URL に別 CSS/asset/bytes があっても、それを旧版へ上書きしない。正常な空 CSS の materialized 状態も保持版で区別する。marker は server が保存した manifest と内容を照合する材料であり、単独の権限根拠ではない。

snapshot の accepted media bytes は保持 asset の最終 bytes と照合し、CSS の計上値も保存した取得情報に一致させる。現在集合 200 件/100 MiB と物理 quota を分け、過去全版の参照件数を現在枠へ累積しない。CSS V3 の旧 base 付き空 snapshot の移行制限を、履歴機能によって自動修復したとは説明しない。

## 復元と D / worker

復元する値は HTML/title/displayStyle。on/off、bundle/sourcePath、原本、現在の恒久失敗台帳、job 履歴は過去へ巻き戻さない。

復元は利用者が選んだ表示値として `source=user, initialization=complete` にする案を推奨する。過去の automatic/legacy は履歴の説明用 provenance に留め、初回 job ID と pending は復活させない。後の reference 取得で style が再自動判定されない。別 tab の新しい手動設定を含む競合では、復元確認を現在 version に結び付ける。

restore commit で現在 version を進めるため、遅い初回 reference job は既存 noteVersion/generation/lease/current 権限 guard で不採用になる。snapshot 中に残る正当な未取得参照だけを現在 on/off に従って新 job へ渡す。その結果が本文を変えれば独立した reference 版を作る。取得済み snapshot を再 download して装飾を再現する設計にしない。

conversion 処理中は既存本文編集と同じく restore を拒否し、完了待ち/既存取消への案内を出す最小案を推奨する。初回 conversion の実行中に過去の状態を上書きする新しい制御 API は増やさない。終端後の restore は user/complete にする。reference 実行中の restore は上記の厳密 supersession で扱える。

## 競合の型と個人段階の検証

同一利用者の複数 tab は後保存を優先し、他 tab に更新通知を出す。system/reference 更新を別利用者の手編集と混同しない。worker の guard は、この利用者向け判定と独立して厳密に維持する。

20 版の履歴だけでは、base 以後の他人編集が prune 済みの場合を判定できない。全変更の本文ログを無期限に保持する代わりに、note ごとの「直近の異なる人間 actor 2 名と、その各最終 mutation version」を小さい永続 metadata として持つ案を推奨する。

actor A の保存では、最新 actor が A ならその version を更新する。最新が別 actor なら A を先頭、前の最新を二番目にする。request actor と先頭が異なれば先頭の version、同じなら二番目の version を base と比較する。任意 actor にとって「自分以外の最新変更」はこの二つから求められる。A→B→A でも B の変更を見落とさず、履歴が 20 版から外れても判定を維持できる。

actor は user/system/legacy の union とする。system は initiating account が同じでも人間 actor の watermark を進めない。本文/title/style の意味ある人間保存が対象。同値の手動 style 確定は D の制御状態として別に保持し、本文の他利用者変更と偽装しない。移行前の actor を推測せず、移行時の確認可能な base floor より古い入力は再読込/再確認を求める。

上書き確認は現在の note version に限定する。単なる `overwrite=true` を次の変更へ使い回さない。確認後に追加更新があれば再確認する。base ID/actor は閲覧・編集認可の代わりにしない。

個人段階で実装/検証できるのは、型と純粋 actor reducer/policy、UoW 永続化、同一 owner 2 tab 後勝ち/通知、system 介在、20 版 prune 後の判定、unknown base、失効時の拒否と退避。A/B/C actor 列の純粋試験は共有権限の実装なしで可能。現個人 usecase に他 account の保存を許す test-only production 分岐は作らない。WS の実別利用者編集と role 変更の本体合格は後続に残す。

## 最小 UI と合否

詳細の「版の履歴」から最大 20 件を日時/原因/実行者区分付きで表示する。先頭に現在を明示する。選択した版を同じ隔離 render で preview し、復元前に現在版を新たな保存で置き換える旨を確認する。通常の pending/error と取り消しを提供する。

editor の dirty がある場合は save/discard/cancel を解決してから履歴操作へ進む。通信/権限/asset GC による失敗では最新の local backup を残す。V5 の作成済み ID、new/stable 両 key、mode 付き退避の移行を維持し、別 note を作って履歴を分断しない。履歴選択だけで editor に古い本文を autosave しない。

| 試験 | 合格条件 |
| --- | --- |
| baseline + 21 回の意味ある保存 | 現在を含め 20 件、正数 pin、履歴順、古い版削除。同値保存/進捗で件数増加なし |
| D 値変更/由来のみ/初回 pending 完了 | 上記の revision 数と version 条件。手動 user が遅い job で戻らない |
| manual/import/reference/style/restore | 同一 commit 不変条件。guard 失敗は版/pin/current 変更なし |
| 現在から画像除去 | current URL 拒否、保持版 URL 許可。別 note/revision/匿名/HEAD/Range/416 は認可先行 |
| 7 日以上の保持→最後 pin prune | 保持中 GC 不可。最後 pin 解除時から 7 日、deleting 競合、削除失敗の quota 保持/再試行 |
| 旧 CSS と小 data、大 data asset の復元 | 選択版の意味を保持。現在再利用による別 CSS への置換なし、危険 SVG は安全化/通知 |
| 2 tab 保存と通知 | 同一 owner は後保存。未保存入力を通知だけで上書きしない |
| A→B→A / prune / system 介在 | base 以後の他人変更判定、確認中の追加変更で再確認。共有本体の合格とは分ける |
| 履歴 preview/取消/復元/reload | 選択だけでは保存なし。復元で新現在、両 style・媒体・リンク隔離、mobile/keyboard を維持 |
| 失敗/失効/dirty/V5 | 理由と未保存/退避復元、同 note ID、空 note 非作成、media-only を保持 |

C2/C3 に渡すのは共通 commit/履歴/restore と prelossy 対象 revision の識別だけ。visual AST/WYSIWYG schema をここで実装しない。

## 小さい採用確認点

既存要件・保持数・認可方式を変える未決事項はない。実装前に次の UI/運用境界だけ Manager の確認を求める。

1. 同値の過去版は復元ボタンを無効にして「現在と同じ内容」とする案。代替の強制復元は空版を増やすため、意味のある保存の原則に例外が必要になる。
2. conversion 中は既存本文編集と同じく復元拒否、reference 中は厳密 supersession を使う案。代替の conversion 強制中止付き復元は original/active job の追加制御が必要になる。

復元時の user/complete、独立 revisionNo、actor 2 名の metadata、server-loaded history scope は上記の接続提案であり、この文書だけで採用/実装済みにはしない。

## 作業状態

D 固定対象は 529 files / `dca0be5beea01053f0c8bfeb4028052a7df1b88609eea450b80dc542a59d10de`、HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。本作業は source 読取とこの文書だけの書込み。固定本体・依存・DB・tests・build・環境・browser に変更なし。Verifier の D 試験へ介入していない。

遅延した二つの source 検索 exec は同 session を回収して完了した。新しい診断、listener、helper は起動していない。doc-style/markdown-style を用い、現実装・提案・将来の検証条件を分けた。次実装の委譲まで書込みを停止する。
