# P4d-2 独立検証準備

## 状態と範囲

2026-09-20T09:00+09:00。候補固定前の文書準備のみ。下記24条件はすべて未実行・未判定であり、合格/不合格を付けない。固定条件の追加・緩和・再オープン提案はない。

goal-implementとmanager-loopを全文再確認した。planのP4d-2-A〜Hと実変更16条件、designの「単件PDFの製品接続」「本人PDFの永続接続」、主報告P4d-2.md（08:49:41節まで全文）、authorization/ui/activity/supervisor補助報告全文、EX/JB/WS/SH原文を読んだ。design515の所有不明時request失敗/compute負債保持の追補も確認した。途中の出力省略部分は別読取で補完済み。

製品コードの調査/編集、test/build、DB/保全原本/proof実体、Chrome/runtime/browser、鍵、外部操作は0。記載された試験結果と指紋は報告上の主担当・補助の自己申告で、今回独立に照合していない。環境所有は引き続き主担当。更新対象は本準備文書だけ。

## 固定24条件の観測matrix

各行は正式候補後に確認する観測範囲であり、新たな条件ではない。重なる観測は同じ証拠を参照する。

| ID | 必要な観測と期待する区分 |
| --- | --- |
| P4d-2-A | 4責務の型/port/UoWと永続一意・世代を照合。同command同内容は同受理/照会、内容違いは拒否。同note active/stopping一つ。新0028の最終cloneで旧全列/trigger/FKを保持し、期限/削除後shellと未close/負債をcascadeで消さない。 |
| P4d-2-B | 保存済みsnapshotと実媒体→現在製品renderer→両styleの実PDF/全page。codeなし本文、空本文、安全filename、font/profile/license、改変/部分read、原URL/file/cookie拒否。配備self-checkと未構成説明を確認し、probe成功だけを製品成功にしない。 |
| P4d-2-C | owner/editor/viewer/権限外、account所有でlogout/session満了/画面離脱後も継続（WS脱退とは別）。兄弟需要と本人取消、同note合流、一致cache、同内容moveの現在認可再利用、異内容旧版不配信。 |
| P4d-2-D | 同bundleの実UI→native実PDF。dirty保持、同ID ACK不明照会、再mountのGET限定、旧actor/epoch/note/op応答拒否、自動取得1回。prepare120秒とartifact期限clamp、claim/open/応答前の現在session/read/content/期限、切断/重複readerとactual closeを対応付ける。 |
| P4d-2-E | 本人限定履歴/summary/ticker/通知、再訪、failed retryの同対象/設定と現在snapshot、取消独立状態。publishedAt+24h/accepted createdAt+90dの等号境界と非延長。active50外の公平追跡・古いmissing棄却、既存job共存/dismiss。 |
| P4d-2-F | 全role降格/除名/脱退・trash・現在WS削除の同Tx取消/rollback、再参加でも旧未終端非復活。完了済み/他actor/先移出/有効兄弟は保持。最後の需要とpublish直列化、close中取消/期限/遅い結果を不採用。 |
| P4d-2-G | 単一storage/専有workspace、HTMLMD2slot/2GiB保護、PDF予約/ready/reader/debtの実所有。remove失敗・close未証明で解放しない。未知所有request failedとcompute stoppingを区別、retry/late publishで迂回不可。boot監督check→共通recoverWrites→PDF回復、purge/WS/drainで未知killや先行削除なし。 |
| P4d-2-H | 最終規定checks/関連試験/同bundle実UI・file、配備manifest/commit/source/bundle/lockを固定。最終停止下保全と旧物理/容量/FTS、自己破壊量/回復可否、全担当停止を照合して正式検証へ移る。 |
| P1-E | 新Node設定/preflight/HTTP/build packagingの実接続、未構成と所有不明boot拒否の違い、shell/pending/skeleton/狭幅と必須コマンドの変更影響だけ。 |
| P2a-E | jobs/root/providerへのPDF追加が旧import/batchの件数・状態・通知・取消/retryを損なわず共存する。全旧job機構の全面再演にはしない。 |
| P2d-1-C | trash UoWへのPDF取消追加後も旧変換/参照取消・restore旧lease不採用・兄弟保持が維持される接続差分。 |
| P2d-2-B | 新pdf-artifact/pdf-delivery ownerが既存claim/fenceを緩めず、copy/reader/遅いwrite・実remove前に予約/chargeを消さない。 |
| P2d-2-C | purgeのPDF workspace/artifact/reader待機、実回収後だけlive-note FK解消と最小shell。旧revision/原本/companion保持の実影響を限定確認。 |
| P2d-2-E | 新4repo/schema/0028と追加ownerの内向き依存・旧clone保全・小故障対。最終checksと新自己回収を共通証拠へ対応付ける。 |
| P2d-2-FD | PDF preflightをDB open前へ置く順、HTTP受付終了→PDF/既存writer/reader drain→DB close、二重stop/standalone共存の差分。変更のない300回全対は機械反復しない。 |
| P3b-1-D | membershipへ全降格/離脱のPDF専用取消を追加しても、従来job・残member・他actor/scope・既fence purgeの責務を変更しない。 |
| P3f-D | 現在note所有でPDF回収し先移出を保護。bound資源と未bind admission、writer/reader/失敗debtの区分を保つ。 |
| P3f-E | WS削除のPDF同Tx取消と遅い結果拒否、成功済み/兄弟保持、不可逆cleanup継続。既存招待/icon等の無関係な全再試験を増やさない。 |
| P3f-H | 新migration/削除FK・負債接続の旧行/trigger/objects/charge保持。共通最終検査・保全・自己回収報告を参照。 |
| P4a-H | schema/migrationへの追加が旧sharing/profile/holding/receipt等の全列・writer所有を保持する。共有機能全体を再オープンしない。 |
| P4b-D | PDFを別root storageで競合させず、既存HTMLMDの2slot/2GiB・期限・cleanup debt/実closeを保護。PDFの120秒deliveryとHTMLMD操作寿命を同一実体にしない。 |
| P4b-F | NoteExportActionへの隣接PDF island後もHTML/MD選択・native取得・dirty/旧response guards/keyboard/390pxを維持。匿名PDFの仮成功を追加しない。 |
| P4b-G | 新snapshot/writer/cleanup/runtime配線・packagingの実影響とclone/最終manifest。既存serializer/rate未変更の全負荷反復は不要。 |
| P4c-K | 新schema/worker/物理所有と旧public/profile/FTS等の保全、最終checks/source/bundleへの対応。公開検索並行失敗は理由未確定と分け、条件外の全面再監査はしない。 |

## 引継ぎで特に分離する境界

- 本人deliveryは`min(prepareAt+120秒, artifact.expiresAt)`。24hはpublishedAt起点、再prepareでは延長しない。10分は匿名ticket側で今回未実装。claim後の失効/期限でabortしてもreader finally/withOwnerが閉じるまではDB sending/slot/負債を保持する。
- 旧未終端requestの同Tx取消は、再参加・current-publicでも復活しない。一方、既完了artifactの新取得/明示新commandは現在本人sessionと独立current-publicを評価する。永久blacklistにしない。他人requestやlink-only authorityの流用は拒否する。認可補助のready metadata fixtureを実PDF/配信成功に数えない。
- 所有不明はrequestだけfailed(PDF_OWNERSHIP_UNKNOWN)として説明し、compute stopping/排他/予約/debtと共通boot fail-closedを維持する。UI terminal、execution Promise終了、PID不在、監督closed証明を同義にしない。late publish非復活と明示retry迂回拒否が必要な新確認対象（固定F/G、design515）。
- UIはunknown/nullを未受理扱いにしない。同commandを保持しGET照会、pending保存失敗はPOST前拒否だが既存lookup/cancelを妨げない。新POSTがacceptedの当該mountだけnative自動取得1回、unknown回復/再mountは明示取得。端末保存完了とは表示しない。
- activity pureモデルのrequestedIds/versionだけでは古いmissingを弾けない。親providerのactor/epoch/revision/1flight fence、receipt後の旧missing応答、51件以上の公平watch、既存import/batch通知との独立dismissを実統合で確認する。exactly-once/永続通知や初回terminal一斉通知は新gateにしない。

## 借用可能な既受入根拠と今回の新確認

P4d-1の両style全page・binary/channel・font・秘密非残留・有限reader・V1 close取消修正は、正式候補の差分と移植対応が一致する部分だけ借用できる。今回は新製品document planner・snapshot・worker・durable publish・配信と、WNOWAIT/ChildPinによる監督へ実装が変わっている。旧probeの正常終了/lock証拠をそのまま製品監督の証明にせず、最終sourceの実owned-child/固定Chrome/旧ledger拒否・close/boot/debt接続を新確認する。逆に、不変機構の全SIGKILL matrixや巨大入力を理由なく反復しない。

既受入のHTMLMD serializer、検索本体、旧FD300回、sharing/WS一般操作等は実変更枝に対応する根拠を保持する。今回の16条件のどの部分へ適用するかを正式報告で明記し、既存全条件の再審査へ広げない。

## 現報告から見える不足・訂正の扱い

以下は未固定途中報告の不足/要更新で、製品不合格や新gateの追加ではない。

1. 本人deliveryは08:49:41節で120秒とCHECK/trigger/schemaへ訂正済みと報告される。08:38節の10分試験は歴史的記録。08:43:25中間CHECK失敗や認可補助の17/18結果を隠さず、訂正後25Node/flow15/認可18と最終0028・最新cloneを対応付ける必要がある。
2. 08:20:20の期限対はrendered後の明示stageでengine closeしても監督closed=falseで不採用。08:25:35の後続成功・08:36:18の旧ledger不変check成功は別事実で、元の原因を解消した証拠ではない。未解明を維持しつつ、unknown時非公開/負債保持/boot拒否→明示回復の経路を候補根拠へ含める。
3. design515のrequest failed/compute stopping分離は主報告08:49:41より後の採用。旧報告の「要求running保持」を現仕様とせず、遅いpublish・retry迂回・物理資源保持の新対と失敗表示を待つ。
4. 主報告の最初のdefault1page/original2pageは後続font明示load修正前。codeなし本文の正常1pageは修正後だが、これだけで最終同bundle両styleの製品file/UIを証明しない。最終成果物とsource/packaged engine/font manifestの適用範囲を区分する。
5. UI補助11pure/activity13pureはeffect/native/親永続化/provider実統合を未検証と明記。現主報告でも実アプリUIは未開始。dirty/ACK/native1回、StrictModeの残GET、古いmissing、notification共存は正式実UIの残確認である。
6. 主の08:49:41時点で987unit/type/lint/format/db差0は自己成功、並行Node525/526の検索deadline失敗は未解明でserial実行中、build未完。負荷原因とは断定せず、閾値/skip無変更と単独/全体最終結果・最後の編集後の適用範囲を待つ。
7. supervisor補助は静的候補で実行0、pack0600とした旧説明は主統合時にpack0400へ訂正済み。最終source/permission契約は統合報告を優先する。初期clone70表550列はledger/sequence除外、旧72表555列とは包含差で、旧ledger28行保持＋新1行追加を全行不変と呼ばない。
8. 最終commit/source/bundle/lock/runtime manifest、最新clone/停止下保全、本体移行/旧objects/charge/FTS比較、自己破壊対象と量/復旧未実施、主担当と補助の全停止が未固定。これらを受領後にだけ正式独立検証を開始する。

## 返却

準備自体を妨げる未決事項はない。原文SH-07の旧handle URL記述など、今回対象外の旧分岐を本人PDFの新条件へ混ぜない。匿名PDF/ZIP/P5/退会本体、OS全隔離/native hardcap/全合法最大入力は今回へ追加しない。

本書全文読取後、文書・読取を含め全停止する。環境所有は一度も取得しておらず主担当が維持する。正式候補/全停止/委譲を受けるまでは、製品調査・試験・合否判定を開始しない。
