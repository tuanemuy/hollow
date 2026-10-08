# P4d-3 独立検証準備

## 状態と対象

2026-09-20T13:17:11+09:00時計確認。候補固定前の文書準備のみ。固定P4d-3-A〜Gと実変更で再開された旧23条件、計30条件はすべて未実行・未判定であり、合格/不合格を付けない。完成条件の追加・緩和・新たな再オープン提案はない。

goal-implement/manager-loopを全文確認し、status更新13:06:45の全体R以外in_progressをplan固定行と突き合わせた。brief全文、design「匿名PDFの接続判断」全文、主報告P4d-3.mdの13:05:07節まで全文、署名/page補助全文、lifecycle補助13:08:51まで全文、元EX/SH/JB全文とWS-05/06/10・ED-09/10/11を読んだ。出力省略された補助/主報告先頭は別読取で補完した。製品ソースを読んだものとして数えない。

製品ソース/DB/proof/鍵の読取、test/build/git、runtime/Chrome/browser/外部操作は0。今回編集したのは本準備報告だけ。環境所有は主担当が保持し、こちらは取得していない。既存のP4d-2受入を変更しない。正式独立検証は新candidateの固定と主/補助の全停止をManagerから受領してから開始する。

## 最小観測ブロック

以下は固定条件をまとめて観測する索引であり、別の受入条件や全組合せ試験を増やすものではない。必要な追試は正式候補の差分・最終証拠の薄い箇所から選ぶ。

| 索引 | 今回新しく対応付ける観測 | 主な出所 |
| --- | --- | --- |
| M1 永続境界 | 独立匿名二表/二repo・判別可能な混合demand/transfer・同Tx/一意/世代/CHECK・13追加trigger版clone・本人型/90日履歴不変。terminalでも未close/debt/参照をcascadeで失わない | P4d-3-A/G、CLAUDE、design二表/移行 |
| M2 元認可と寿命 | ticketのstrict署名/purpose/kid/browser/DB bindingと元public又はlink/grantを別々に確認。固定10分、再unlock非延長、private/再発行/ABA/失権、期限切れよりnot-found優先、prune後404。SH-04はpublic非波及、login/current-publicへ旧linkを昇格させない | P4d-3-B、EX-04、SH-01/03/04/06 |
| M3 混合需要 | 本人/匿名・匿名兄弟の同内容single-flight/cache、無効先頭より有効兄弟、異内容activeはbusy/非queue、片方取消/失権が正当兄弟を止めない。最後の需要とpublish/遅い結果、24h非延長、同内容moveを現在所有で扱う | P4d-3-C、EX-01/04、JB、design共通需要 |
| M4 実所有 | 本人/匿名合算delivery2・同request1、120秒/ticket/artifact/元grantのmin clamp、claim/open/応答前認可、切断/実reader close。reader.return/completed/withOwner終了→同期Map.release→DBclosed、DB待機/失敗中予約保持・latch不消費。purge/WS/trash/移出/unknown/boot/drainへ接続 | P4d-3-F、ED-09/10、WS-10、design物理所有 |
| M5 native入口/一回性 | 同bundle public/link/password→POST/303/status→有限Refresh→実attachment。auto/auto競合・manual先行後の旧Refresh・manual再取得・busy/rollback・切断後に永続markerを戻さない。ACK不明は自動POSTせず元入口の明示やり直し、ログイン済でもbrowser束縛/履歴なし、390/keyboard。共有cookie/nonce/rate/Originを同時に対応付ける | P4d-3-D/E、EX-04、design no-JS/一回性 |
| M6 候補と保全 | 最終checks/関連Node/実file全page/設定/配備制限とcandidateを照合。停止下の新copyで旧全列/trigger/FK/objects/容量/FTS、自己作成/破壊量、最終指紋と全停止を確認する | P4d-3-Gと既存保全条件 |

## 固定30条件の検証索引

各行の状態はすべて「未判定」。借用は正式候補と差分の一致を確認できた部分に限る。

| 条件ID | 今回の最小確認範囲 | 維持・借用する範囲 |
| --- | --- | --- |
| P4d-3-A | M1。二表・UoW/混合portと本人history分離、旧76/618/96triggerからの移行、最小shell/FK | P4d-2の4責務/本人一意等の不変部。新mixed SQL/追加guardは借用だけで済ませない |
| P4d-3-B | M2。元authority・browser・kid/ticketGeneration・元grant期限、失権優先/SH-04 public非波及/現在内容 | P4a/P4cの既存閲覧認可の不変部分。署名50pureは認可/実HTTP成功の代わりにしない |
| P4d-3-C | M3。両種需要/匿名兄弟、same cache/join、異内容busy、最後需要とpublish、move | P4d-2の不変content profile/24h定数とrenderer。現在predicateの共通化は新確認 |
| P4d-3-D | M5。同bundle3入口の実PDF、no-JS有限Refresh/自動一回/manual/ACK/390/keyboard | page31pureは状態/escapeの根拠だけ。P4d-2本人UI全対を匿名UIへ転用しない |
| P4d-3-E | M5。HTMLMD/PDF×public/link合算6/30、最後枠競合/replay零/reissue非reset、nonce初回race、厳格Origin | 旧rate/serializerの不変実装。直接repo予約と実HTMLMD HTTP混在の根拠を区別 |
| P4d-3-F | M4。混合2slot/clamp/実close→Map→DB、purge/移出/unknown/boot、匿名鍵未構成 | 不変renderer/hardstop行列はP4d-2/P4d-1。新anonymous owner/共通deliveryStreamは新確認 |
| P4d-3-G | M6。最終checks/同bundle実file/保全/自己回収/設定key ID/配備/固定/停止 | 先行受入の限界を維持。鍵値/hash/秘密URLは証跡へ含めない |
| P1-E | M5/M6。匿名HTTP dispatch・key設定/preflightと未構成説明、狭幅/起動停止 | auth/shell全体の不変UIを全面再演しない |
| P2d-1-C | M2/M4。trash同Tx匿名invalidated、restore後旧ticket/同command非復活、新command現在cacheは可能 | 旧変換/参照取消・復元の不変lease機構は既受入 |
| P2d-2-B | M3/M4。artifact writer mixed需要・anonymous reader owner・実remove/close前の予約保持 | 旧全write/二重write行列は不変部を借用 |
| P2d-2-C | M4。両delivery/private workspace/artifact待機、実remove後だけlive FK切離し、terminal shell/prune | 旧revision/原本/companion一般回収の不変部分を借用 |
| P2d-2-E | M1/M6。0029 clone、型/内向き/clock、限定実UIと自己物理量、全checks | 新anonymous境界以外のPM/codec等を追加再検査しない |
| P2d-2-FD | M4/M6。共通deliveryStream/typed Mapと正常drain/DBcloseの順、未回収0 | 旧FD300回/standaloneと不変driverは保持、今回機械反復なし |
| P3f-D | M3/M4。現在note所有と先移出保護、匿名reader/debt/実remove待機 | 無関係scope/draft/importの不変所有規則を保持 |
| P3f-E | M2/M4。現在WSの匿名要求を同Tx失効、遅いpublish/旧ticket拒否、移出兄弟保持 | 招待/icon/通常jobの無変更全機構は既受入 |
| P3f-H | M1/M6。新二表/追加guardと旧全列/charge/objects保持、自己回収・最終固定 | 先行縮小row/一般WS削除受入の変更外を維持 |
| P4a-D | M2/M5。限定/password入口のPDF form/cookie追加と旧token/失権404/no-referrer等 | 旧共有本文/媒体/Range/隔離は変更外を借用。PDF HEAD/Range拒否とは分ける |
| P4a-H | M1/M6。旧sharing/profile/holding/receipt・通常writer保全と追加移行 | 共有設定/表示名の無変更UIは受入保持 |
| P4b-E | M2/M5。専用native PDF routeが共通nonce/rate/Origin/秘密保護を弱めない | 既存HTMLMD native file contractを保ち、PDF ticketを旧operationへ混ぜない |
| P4b-F | M5。既存形式選択にPDF専用form追加後もHTMLMD native/no-JS/戻り/390を維持 | 本人dirty/actor/操作世代UIとHTMLMD serializerの不変部を借用 |
| P4b-G | M1/M6。新匿名snapshot/owner/rate/runtime接続の影響と旧保全/最終配備 | 旧serializer/lifetimeの全負荷を反復しない |
| P4c-I | M2/M5。public選択→PDF専用POST、共通nonce/6/30/初回cookie競合、grant非流用 | canonical→旧HTMLMD導線と公開identityの不変部を保持 |
| P4c-K | M1/M6。新schema/worker所有と旧public/profile/FTS/charges全列保持 | 公開検索/description/cursorの受入済み不変部分は再open範囲外 |
| P4d-2-A | M1。共通demand/repo・匿名参照付きpruneが本人状態/90日/shellを保持 | 本人型のaccount必須/元寿命を維持。新二表制約は今回根拠 |
| P4d-2-B | M3/M6。snapshot identity抽出後、匿名と本人で同じ保存素材/profileが実描画へ接続 | renderer/font/channel/全pageの先行証拠を差分無関係なら借用。今回の実file全page確認は省略しない |
| P4d-2-C | M3。本人需要が匿名兄弟の参加/失権で誤取消・誤cacheしない、本人logoutは継続 | 既存本人認可UI全組合せの不変部は保持 |
| P4d-2-D | M4。本人/匿名共通streamのclaim/open/応答前guard、2slot/実closeと120秒維持 | 本人dirty/ACK同ID/ABA/native自動一回のUIは無変更なら前回受入を借用 |
| P4d-2-F | M3/M4。本人取消/role失効と匿名の有効兄弟・最後の需要/publish直列化 | membership旧取消処理の不変部分、原本の全role操作UIは保持 |
| P4d-2-G | M4。単一storage・混合owner・共有容量・close順変更、未知所有の負債/fail-closed | 旧OS/native限界と元closed=false原因未確定を保持。旧close順の観測を新版へ無条件流用しない |
| P4d-2-H | M6。新統合候補の規定checks/同bundle/保全/配備/固定/全停止 | 前候補988/527等は新候補全量の成功ではなく不変部の過去根拠 |

## 根拠を混同しない要点

1. 署名verify成功は現在認可/期限の成功ではない。旧kid再署名でもiat/exp固定、MAC正常のexpiredと失権/別browser/DB欠落は別結果。受理時grantの30秒など短い残期限はticket10分より先に切れ、再unlockで延長しない。EX-04/SH-03/06とP4d-3-Bの同じ条件内で照合する。
2. PDF24hはpublishedAt、ticket10分は受理、deliveryはprepareから120秒とticket/artifact/元grantのmin。runtime timer/DB期限/reader物理終了を同一視しない。P4d-3-F/P4d-2-Gでは実close後のMap解放→DBclosedという今回の変更順を確認し、前回の説明をそのまま借用しない。
3. 元link/public/browserを保つ要求は、後のlogin、public化、新grantで権限を付け替えない。一方SH-04のlink再発行は独立canonical public要求を失効させない。失権とticket期限が同時なら共通404優先、元read有効な単純期限だけ最小表示、prune後は404でよい。
4. autoDeliveryIdは配信完了証明ではなく、最初に実枠を取った取得intentの永続一回性。manual先行も消費し、古いRefreshが来ても別fileを自動配信しない。busy/rollbackは消費せず、DBclose待機/失敗も非closed枠を保持する。端末保存完了の保証には拡大しない。
5. 匿名ACK不明は本人の同command GET照会を追加しない採用契約。同form native再送は同receipt/rate追加0、元入口での明示新操作は新command/rate1。応答自体が届かない際に独自失敗画面を表示できる保証はない。no-JS Refresh/HTTP返値だけでブラウザnative動作が成立したとしない。
6. 「本人/匿名の取消独立」は相手の有効需要を守る意味で、匿名取消API/UIを追加する要求ではない。匿名は元認可失効/期限で需要を失う。匿名が本人履歴へ載らないことと、本人要求が通常logoutで消えないことを同じmixed対で区分する。

## 途中報告の不足・訂正と正式候補で待つ根拠

以下は未完成段階の残確認であり、不合格や新gateではない。製品ソース/proofを読んでいないので、実装に矛盾があると断定しない。

- P4d-3-A/G（移行/保全）: 12trigger版cloneと13trigger版cloneを分ける。13trigger版は旧76表618列/96trigger・全旧row差0、ledger29→30の1追加と報告される。現在freshはledger29停止で未移行という報告であり、clone成功を本体成功へ拡大しない。主開始outbox総数50と前回「旧49行保持」は包含差で、今回最終比較は開始50行を対象にする。旧18scope/FTS等も新開始・最終の同対象で揃える。
- P4d-3-B/C/F（認可/需要/回収）: main42隔離Nodeは実DB/実storage/reader＋fake supervisor、lifecycle7もfake workspace/renderer＋synthetic PDF bytes。元grant/rotation/物理removeの根拠には使えるが実Chrome/native PDF成功ではない。lifecycleは13:08:51に7/7・unhandled0・限定Biome成功へ更新されており、main13:05節の「作成中」と時点が異なる。最終統合・全量後の適用を待つ。
- P4d-3-B（期限表示）: main13:05はexpired＋prune後HTTP404未実行を明記。lifecycle7はterminal/prune/FKのrepo/用例対で、HTTPのexpired/minimal/not-found区分そのものとは別。正式候補で実HTTP根拠又は当該境界の独立小対へ対応付ける。永久期限画面という新要件は作らない。
- P4d-3-E/P4b-E/P4c-I（共通rate）: repoでHTMLMD相当5回をreserveした後PDF6回目の対は共通窓の根拠であり、実HTMLMD HTTPとPDF導線の混在成功とは違う。初回cookie競合・stale form/native Originは最終HTTP/UI根拠に分ける。
- P4d-3-D/P4b-F（画面）: page31pureはHTML/Refresh返値の状態表・escape・固定文言だけ。主のmonochrome微差、429/503の元入口anchor追加後の最終検査、同bundleのpublic/link/password・no-JS実取得・390/keyboard/一回性は未実施と報告されている。本人UIの旧成功で埋めない。
- P4d-3-G/P4d-2-H（候補固定）: 1069unit成功後にHTTP anchorとassertion、別lifecycle testが追加されている。全量Node/型/lint/format/build、最終commit/source/bundle/lock/config/key ID・正常停止/保全はまだ固定されていない。旧1069やP4d-2の988/527を最新候補の全量として記録しない。
- P4d-3-F/P4d-2-G（監督）: 元P4d-2の期限対closed=false原因未確定と後続成功の区分を保つ。今回の共通delivery順/anonymous recoveryがその原因を解消したとはしない。未知所有では新受付だけでなく共通recoverWritesのfail-closed、負債保持を現差分に対応付ける。
- P4d-3-B/E（署名/初期設定）: 署名補助の50pureはsynthetic key、uid不一致はstub。製品key配備・rotation HTTP・期限/DB bindingは主統合の別根拠。任意OSの鍵交換race全面検証を新gateにせず、採用macOS参照配備の秘密非露出/明示設定を確認する。

## 借用限界と返却

P4d-2の既受入renderer/font/channel/PDF安全化・P4d-1 hardstop・本人dirty/ACK/provider/tickerの無変更部分は、正式candidate差分で不変を確認できれば借用する。混合需要/共通deliveryStream/匿名HTTP/署名/nonceの新経路にはそのまま適用しない。旧FD300回や全SIGKILL行列、巨大入力を理由なく反復しない。

OS全egress/file隔離・native RAM/CPU硬上限・全合法最大媒体/入力・全font・他runtime・本番配備は先行と同じ未測定。ZIP/一括公開/P5/外部メール/OAuth/課金は範囲外。D01/旧proof/唯一保全/旧credentialsへ非操作を維持する。SH-07の原文旧URL失効は利用者決定で上書き済みで、今回の新条件に戻さない。

準備を妨げる未決事項や、Managerに追加条件採否を求める新提案はない。正式候補では30行ごとに合格/不合格/未検証と独立/借用/未測定を記録する。本書全文を確認し、未回収read exec0を確認した後、読取・文書を含め全停止する。環境所有は一度も取得せず主担当が維持する。
