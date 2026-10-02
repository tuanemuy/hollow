# P4b 契約案: HTML / Markdown 単件書き出し

2026-09-19。Manager採否前の読取設計案。EX全文・JB全文・design P4-Q2の22:10補足・P4-export-feasibility全文と現sourceを確認した。製品/DB/runtime/browser/test/build/gitは操作していない。本書だけを新規作成する。P4a独立検証へ介入せず、正式P4b委譲まで実装しない。

## 結論と採否が必要な点

EX-01/04のHTML/Markdown単件は、現在閲覧認可→固定入力→同期生成→応答直前の再認可/内容照合→attachment取得の縦スライスとして成立し得る。HTML/MDを仮job・履歴・ティッカーに置換しない。PDF/ZIP/public/handle/SH-07/表示名以外profileは未提供のまま。

次の4点を最小の採用判断として提案する。

1. Markdownの現画像をdata URIの参照定義で同一 `.md` に含め、非対応要素は安全なHTMLのまま残す。別添媒体/ZIPを導入しない。HTML非対応またはdata URIを禁止するMarkdown閲覧器まで同じ見た目を保証しない。
2. 再取得可能なcacheではなく、1回の同期操作の出力だけを短命spoolへ保存する。本文/媒体を全量メモリへ積まない。spoolの書込所有/実回収負債は永続追跡するが、所有者/WS保存容量へ課算しない。
3. 外部本文・媒体をexportが自動再取得しない。既知の安全判断と構文に基づく正当な外部URLは埋込不能なら原URL保持、blocked/内部/history/draftはfallback不可。未確認外部URLを「安全確認済み」とは表示しない。
4. EX04専用rateと有限実行資源の下記初期値を採用するか。単件の新1GB制限や閲覧専用のdownload禁止設定は追加しない。

実装候補ETAは正式着手から4〜6時間。同期spoolの既存writer/削除接続とnative downloadの実UIが主な成立確認点。今はコード読取であり、性能・実ファイル・移行・ブラウザーの成立を確認した見積ではない。

## 現sourceから再利用できるもの

| 読取先（packages/core/src基準） | 事実と必要な差分 |
| --- | --- |
| `application/workspace/access.ts`、`account/session.ts` | `requireNote` はactive/current ownerのread権限を扱う。editorでなくviewerを含むreadで呼ぶ。外からactor IDを受けて認可しない |
| `application/sharing/reading.ts` | token hash/grant epoch/期限/current scopeと採用前再snapshotがある。private helperの意味を小さな共通application関数へ抽出する候補。`readSharedNote`のtoken入りURL/表示HTMLはexport入力にしない |
| `domain/asset/entity.ts`、reference entity | ready assetにbytes/sha256/MIME、current referenceに状態/finalUrlがある。current本文から到達した素材だけを固定可能。history/draft/原本/companionをIDだけで直接読む経路は作らない |
| `adapters/node/htmlSanitizer.ts` | `render`はanchorをspan化するためDLには不適合。構造sanitize/HTML・CSS ASTを再利用し、download専用serializerで安全なanchorを保持する |
| `adapters/node/reference/htmlDocument.ts` | 入力800KiB、解析node/depth予算がある。base64挿入後の巨大出力を再parse/serializeしない。小さい入力ASTと遅延媒体スロットからstream化する |
| `application/ports/objectStorage.ts`、Node objectStorage | bounded putとstreamがある。`read`全量bufferは媒体埋込には使わない。assetの正確なsha/bytesをstream中照合する |
| `adapters/node/coordinatedObjectStorage.ts`、`domain/purge/entity.ts` | begin/register/canPublish/endWrite、同key直列化と正常stopがある。ただしexportのWriteOwner/PurgeObjectOwnerは未提供。名称だけ流用して認可/回収を省略できない |

新HTML→MDライブラリ、PDF/ZIP依存、rendererはこのsliceには不要。既存AST上の有限機械変換をNode adapterとして実装する案。現在の`marked`は逆方向なので再利用しない。

追加portはapplicationの`ExportSnapshotReader`（authorityとsnapshot/revalidate）、`ExportDocumentWriter`（固定snapshotと解決済み媒体stream→format別stream/filename/profile）、UoW内の`ExportOperationRepository`（短命所有/ready/送信claim/cleanup世代/専用rate）、Node資源を隠す`ExportExecutionBudget`（slot/byte予約/deadline/abort/stop）を最小候補とする。既存Clock/ID/TokenHasher/ObjectStorageは再利用し、独自ambient時刻・path・provider例外を内側へ入れない。rate repoをoperation repoから独立interfaceにするかは実装時の責務分割で決める。

## Authority / snapshot / identity

transport入力はnote IDと`format: html | markdown`だけ。HTML/title/asset一覧/storage key/actor ID/ownerをclientから受けない。限定入口は現在のtoken pathと専用browser cookieから認可し、passwordそのものを再入力DTOへ載せない。

内部authorityは次の排他的unionを提案する。

- `account`: 現在sessionから導いたaccount IDとsession束縛。prepareと取得でsession有効/verified/current owner readを再検査。
- `link`: 受信tokenを境界でhash化して導くnote ID/token hash/linkGeneration/grantEpoch、必要ならbrowser hashとgrant期限。元のlink根拠だけを再検査し、後でaccount/public認可へ差し替えない。token原文はHTTP入口の短いscope以外へ渡さず、file/通常DTO/DB本文/ログへ保存しない。

一つの短いUoWでactive note/current owner（deleted WSなら拒否）と正本本文/title/display/current reference/ready asset manifestを取得する。各媒体は`asset ID・storage key・bytes・sha256・MIME・出力スロット`、既に本文へ埋込済みのdata URIはcurrent acquired provenanceとの一致を確認する。勝手なdata URI、他note/過去版/draft URLは採用しない。

`contentIdentity`はnote ID、実際に出力するHTML/title/safe filename、display modeとCSS、assetの正確なdigest/bytes/MIME/スロット、外部fallback方針、HTML/MD変換profile版をcanonical hash化する。生成時刻やsessionを本文に追加しない。author/tags/updatedAt等を出力へ追加するなら必ずidentityへ含めるが、EX-01にないメタデータの追加は初期案には含めない。note.version/updatedAt/share.version/owner scopeはidentityそのものにしない。

認可fenceはidentityと別に保持する。生成中の移動後も現在権限を再検査し、同内容の正当移動だけを無用な内容変更にしない。read-only操作なので権限を失った瞬間を永久blacklistにせず、応答時の有効根拠を評価する。client旧actor/旧noteの応答採用は別のepoch guardで拒否する。

## 同期生成と物理所有

推奨フローは以下。DB TxをI/O中開き続けない。

1. 現在認可と空本文拒否、限定入口のrate予約、固定snapshot/manifest取得。
2. 内部資源枠を確保し、noteに束縛した短命export operationと一意spool keyを登録。新operationはJB jobではなく、同期要求の物理所有/cleanupのためだけの記録。
3. ASTからHTML/MDを順次書出し。1媒体ずつstreamしbase64をchunk境界の余り最大2B付きで処理する。bytes/digestがmanifestと違う/不存在/途中cancelならspool全体を不採用にする。missing内部媒体を外部原URLへ置換して成功にしない。
4. stream完了後、短いUoWで同じauthority/current owner/readと現在contentIdentityを再照合。認可喪失は共通not found、現在閲覧可能だが内容不一致なら「内容が更新されました。最新の内容で再実行」を返す。自動再生成ループは作らない。
5. 完全なspoolだけをrequest内のready状態へし、attachment開始直前にも同照合。失効/更新ならbytesを送らない。送信開始後に既に配信したbytesの回収は保証しない。
6. 正常送信/abort/期限/失効でspoolを回収。write終了・実remove・同operation/世代の確定まで物理負債を消さない。起動時は前processの終了を既存所有機構で確認してから、未完operationを再公開せず回収へ収束する。

元媒体への新holdは必須としない。元のbytesはassetのsha/bytesに束縛して読み、途中purge/変更なら不採用、最後にも現在参照を再認可するため、元媒体を長く保持して成功を保証する必要がない。開いたread streamはabort/finallyで閉じる。immutable storage keyに対する部分read/置換もdigest不一致を成功にしない。

出力spoolだけは新writer ownerとcleanup対象が必要。最小追加は専用operation repository（note/authority binding/input identity/spool metadata/状態と世代/固定期限/cleanup debt）と、専用rate repository。具体DDLは正式着手時に現在purge/FKと合わせて確定する。将来PDF artifact/cache、ticket、ZIP parent/childの全schemaを先に作らない。

spoolを`account/WS usedBytes`・bundle holding・ユーザーupload quotaへ課算しない。匿名downloadで所有者のuploadを容量超過にしない。内部disk予約/負債は別のservice資源計数とし、実removeまで予約を解放しない。既存ObjectStorageを使うなら容量repoへ暗黙にownerを流さず、export専用所有種別として明示する。

purge/WS削除はcurrent noteの新export受入/register/publish/取得を止め、spoolの未終端writeとcleanupを収束させる。元WSから先に移出したnoteは元WS IDだけで停止しない。出力spoolが残ったまま「関連実体を全回収」としない。ownerの永続追跡なしの任意tmp書込/起動時全ディレクトリ削除ではこの条件を満たせない。

## HTML / Markdown の出力

HTMLはUTF-8の完全な1document。安全なtitle、charset、no-referrer、script/form/base等を禁止するmeta CSP、現在displayに従うdefaultまたはoriginalの安全CSSを含める。閲覧iframe用の「anchor→span」を使わず、許可されたhttp(s)/mailto/文書内fragment linkは文脈に応じたescapingで保持。任意JavaScript/event/script/styleの危険構文は既存safe policyと同等に拒否する。

current ready画像・poster・srcset・CSS背景/取得済みfont等の参照をmanifestのdata URIへ置換する。SVGは既存安全化されたasset bytesだけを使い、export時に未安全化原本へ戻らない。current video/audioも単件をportableにするため同じstream埋込を提案するが、原文の必須は画像/styleであることを区分する。既に取り込み済みCSSはinline保持、未取得stylesheetを勝手にfetchしない。

URLは種類を先に分ける。内部 `/api/...`・絶対同origin・`/s/...`・history/draft・`bundle:`・原本・他note参照は外部fallback不可。既知blocked参照/危険scheme/credential入りURL/制御文字は除去または安全な欠落説明にし、原URLを有効なリンクへ戻さない。参照履歴の任意human reason文字列だけから安全を推論せず、現policyで確実に分類できない内部/blocked候補はfail closed。

正当な未取得・外部参照は原URL保持（相対なら保存済みの正当なbaseが確定する時だけ解決）。serverからfetch/DNS inspectを無言で追加しない。この場合の「原URL保持」は利用者が外部参照を持つfileを受け取るという意味で、offline完全表示/外部到達性の保証ではない。未知外部参照を厳密な現在DNS安全検査まで求めるなら、別採用の有限inspect-only契約が必要で、現案の実装に隠して入れない。

ここは未確認URLを全許可する提案ではない。localhost/明示private IP/credentials/同origin aliasなど、既存のURL分類で確定できる禁止を先に適用し、元台帳で既知blockedのものは保持しない。原文の「埋め込めなかった参照」を現在DNSで許可済み外部だけに限定する採用なら、最大候補数・全体deadline内のinspect-onlyを明示的に追加する必要がある。downloadから新たな外部body fetchはどちらの案にも含めない。

Markdownは見出し/段落/強調/リンク/リスト/引用/code等を機械変換し、複雑なtable/任意装飾/subtreeなど損失なく表現できない部分をsafe HTMLで残す。textの`\\`/backtick/記号/改行、link destination/title、code fenceの長さを構文別にescapeする。単純な正規表現置換だけで変換しない。

通常画像は`![alt][hollow-asset-N]`と末尾の生成専用reference definitionにdata URIを1回出力する案。ユーザー文と衝突しないIDを選ぶ。寸法/srcset/pictureなどHTMLでなければ表せない要素はsafe HTML内に同じdata URIをstream挿入する。Markdown内部にアプリ認証必須のURL、共有token、storage key、ローカルpathは残さない。data URIを制限するMarkdown閲覧器では画像が出ない点を短く説明し、普遍的な表示互換を完了条件にしない。

## HTTP / UI

アプリ入口は現在詳細メニューの「ダウンロード」からhtml/markdownだけを選ぶ。prepareは既存session認証とstrict input/Origin検査を持つ新server action、結果は`operationId/noteId/format/filename/bytes/固定期限`等の最小DTO。DTOに本文/base64/token/storage keyを返さない。ready応答後にnative attachment GETへ接続し、JS Blobへ全出力を積まない。

限定入口はP4aのno-JS server HTMLにnative formを追加し、`POST /s/{token}/download`のformatだけを受ける案。同じ同期生成を完了してから短命operationの取得GETへ303、GETでも元token/grant/現在contentを再認可する。HTTPのtoken path/Locationをloggerへ流さない。Origin:null例外が必要ならunlockの既存例外を一般化せず、このnative endpointだけに同じ厳密Fetch Metadata検査を明示して新規検証する。

取得operation IDは単独bearer認可やPDF署名ticketの代わりではない。アプリは同session/account、限定は元link/browser根拠に束縛し他人のIDで取得不可。HEAD/Range/再送を提供するなら都度同認可/identity/期限を要求し、最初は新単件attachment GETだけを提供して未提供methodを明示拒否する案。短命spoolの再取得で期限は延長しない。

Content-Typeはhtml=`text/html; charset=utf-8`、md=`text/markdown; charset=utf-8`。Content-Dispositionはattachment、検証済みASCII fallbackとUTF-8 filename*を用意し、制御文字/CRLF/path separator/予約名/末尾dot/長さを処理する。titleから有効stemが残らなければnote ID、最後にformatから固定拡張子を付ける。no-store/private、no-referrer、nosniff。匿名不許可はtitle/filename/bytesを含まない同じ404。

アプリのpendingは現在actor+epoch/note+操作世代に所有させ、旧success/catch/finallyがdownload開始・通知・busyへ作用しない。保存済み本文を対象と明示し、dirty editorを保存/送信/破棄しない。失敗は安全理由/明示再実行、通信不明は「開始を確認できません」とし成功/自動再送にしない。native GET開始をファイル保存完了とは表示しない。匿名native navigationのpendingと安全なerror page/元画面導線を同bundleで検証する。390/keyboard/取消/focusと既存共有dialogの共存を確認する。

## 初期運用値案と限界

| 対象 | 採用前提案 |
| --- | --- |
| EX04専用rate | 元note+browser識別で6操作/固定60秒、note全体で30操作/固定60秒。初予約から固定、blocked要求で延長なし。成功でも予約を戻さない。password rateとは別table/namespaceで、token再発行でnote全体枠をresetしない |
| rate認可/回収 | 現在link認可・password通過確認後だけ予約。429+Retry-After、raw token/IP非保存。現在cookieをhash化した識別とnote全体枠を併用。100行/60秒の期限掃引/index、note purge cascade。再起動後も期限/計数維持 |
| 同時実行 | Node全体2生成、追加要求は待機queueを作らず503/明示retry。HTML/MDだけの同期枠で、EX03の本人ZIP1件とは別 |
| 期限 | prepare全体30秒（parse/媒体read/write/最終照合を含む）、生成から送信/cleanup開始までを含む操作有効期限は受付から固定120秒。再取得で延長しない。期限は終了証明ではなくabort/実close/cleanupを別に確認 |
| メモリ/stream | 本文は既存800KiB境界、媒体1本+出力1本、chunk目安64KiB/各high-water256KiB。base64全量string化を禁止。AST作業は隔離workerのheap128MiBを初期候補、deadline/終了を親が監督。nativeメモリ全量をheap値だけで保証したとはしない |
| 出力量 | 本文/escaping/default CSSとmanifestの各bytesからbase64長`4*ceil(n/3)`・出現回数を数えた有限上界を計算し、実writeでも予約超過を拒否。全素材を読み終えて初めて判定しない |
| service一時disk | process全体2GiBの内部spool予約を初期候補とし、同時操作/cleanup debt合計で使う。user/WS quotaとは別。新しい単件1GB制限ではない。予約不能は資源不足として正直に失敗し、部分fileを成功で返さない。設定変更可能な運用値として代表小実体/境界fakeで妥当性を判断する |

原文「閲覧できるノートは常にdownload可能」は閲覧者だけを恣意的に禁止する設定を作らない意味で守り、無制限のRAM/disk/時間を保証するとは読まない。一方、ある正当な巨大noteが常にこのservice資源枠を超えるなら再試行だけでは解消しない。上界と設定不足を明示する必要があり、この2GiB値を採用せず全noteの成功を保証するなら、より大きい配備枠/別方式の判断が必要。単件にEX02の1GBを適用して要件を簡単にしない。

PDF24h/ZIP7dは完全保存・取得可能化のpublishedAt起点、job90日は元createdAt起点という採用designを変更しない。P4bの同期spool120秒はそれらのartifact寿命/本人履歴ではなく、操作内部の一時保持案。

## 最小の独立検証対

- 小さいHTML本文、既存safe CSS、数byte級画像2種で実 `.html`/`.md` を生成し、展開data bytes/hash、title/filename、リンク保持、非対応HTML、default/original差を読む。巨大実fixtureやPDFを作らない。
- filename CRLF/空白/絵文字/path/予約名、text/code/link escape、重複媒体reference定義、unsafe SVG/script/CSS、blocked/内部/history/draftのfallback拒否、外部URL保持で通信0。
- 元asset streamを保留しcurrent本文/style/asset metadata変更→旧file不採用、private/再発行/password epoch/trash/WS削除→共通404、元WS移出後同内容・現在read許可→成功。asset bytes差/短read/不在で部分file非公開。
- 無所属/現在viewer/owner、別actor/同actor ABAとnote切替、dirty入力、ACK不明/手動retry、匿名noJS form、390/keyboard、native attachment開始と保存完了の区分。
- fake clockで専用rate6/7・30/31/固定期限/restart/prune100、fake streamの上界/超過/遅延/abort、2同時/3番目busy。小実spoolでlate write/正常stop/crash回復/remove失敗→負債保持→再回収を確認し、元objects/owner quota不変を比較。
- 新migrationだけをcloneへ適用して旧全列/trigger/FK/objects/chargesを保全。最終checks・同bundle実UI・product-only commit・全停止。今はどの対も未実行。

## 実編集時だけ再openする候補

P4a-D/G（匿名認可抽出/新取得と失効）、P4a-E（共有server UIへdownload入口）、P4a-H（schema/DI保全）、P1-E（HTTP/runtime/pending）、P2c-1-E（editor共存）、P2d-2-B/C/E/FD（writer/実回収/新migration/stop）、P3f-D/H（current所有spool/保全）が候補。P2b-A/Dは共通sanitize/styleを実際に抽出変更した場合だけ。既存所有者quota/chargeを変えない案なのでP2a-D/P3a-Eを新課算のために再openする提案はしない。新入口だけで既存P3f-Bを自動再openせず、実変更責務を正式着手時に現台帳へ再照合する。

以上は契約提案のみ。P4aの合否・製品source・検証環境は変更していない。本書確認後に全操作を停止し、採否と正式委譲を待つ。

## 22:30 読取補足: inline画像・通常リンク・外部媒体の保護境界

本節は前掲の曖昧な3点だけを補正する。製品変更、通信/DNS、実生成、テストは行っていない。

### 1. 正当に保存された小data URIはasset行なしでも認める

実契約の根拠は `application/reference/processJob.ts:207,313,362`。data URIをdecodeして既存`inlineMedia.inspect`で実内容を検査し、元decoded dataが32KiB以下なら安全化SVGまたは検査済みbytesをdata URIへ再encodeし、`asset: null`のacquired参照として本文へ反映する。`application/reference/reuse.ts`は既存acquiredのdata URIを通常保存で再利用する。`application/note/history.ts:87`以降の`checkedSnapshot`はasset行を要求せず、版内のdata URIを最大200件、decoded32KiB以下で既存inspectに通し、安全なdata URIと`assetId:null`のresourceを構成する。

一方、通常`saveNote.ts:45`の最初のsanitizeやimportの本文保存それ自体を、全data URIが同期で内容検査済みという証明にはしない。参照取得は後続jobになり得る。したがって「現在acquired provenanceがなければ一律拒否」は狭過ぎるので撤回し、**現在正本本文の小data URIについては、asset行/参照台帳の有無にかかわらず既存の内容検査で安全と確認できれば認める**案に補正する。MIME宣言だけを信頼せず、SVGは検査結果の安全化bytesを出力する。検査不可・不正・32KiB超は安全なメディア再挿入案内等へ分け、正当な小inline画像を消さない。

入力本文は既存800KiB内のままparseし、小inline値は1件ずつdecode/inspect、同値は重複検査しない。`decodeDataUri`は800KiB文字数/形式境界を持つが、それを32KiB decoded制限の代わりにはしない。200件と30秒全体signalの範囲で処理する。出力側でassetから生成する大きいbase64は別の遅延streamスロットであり、これをHTML parserや小inline検査へ再投入しない。inlineの検査後bytes/MIMEもcontentIdentityへ含める。

### 2. アプリが挿入する認可情報と利用者の通常本文を区別する

「tokenをfileへ出さない」は、アプリがexportのために共有token/認可cookie/取得capabilityを新規挿入しない契約である。「内部URL fallback不可」は、画像src/srcset/poster、CSS url/@import、video/source等の**媒体取得参照**を対象とする。アプリが発行した内部媒体URLは正当current bytesへ変換するか拒否し、認可を迂回する取得URLとして残さない。

利用者が正本本文のtext/codeや通常anchorに書いた文字列を、token風の形だけで秘密と推測して削除しない。安全な通常hyperlinkはhttp(s)/mailto/fragment等の既存scheme規則とescapeを守って保持する。同originの通常ページへのanchorも正当なlinkとして保持し、相対ページlinkは必要なら既知APP_URLに対して絶対化してportableにする。anchorが同originだから媒体manifestに入れたり、ページをfetchして埋めたりしない。利用者自身が書いたURLを別の認可URLへ変換しない。

利用者が自ら書いた共有linkや内部URLのanchor/textも無差別なsecret detectorで抹消しない。これを理由にアプリが共有panelの秘密値を出力へ注入することは認めない。unsafe scheme/eventは通常のsafe HTML規則で除去する。URLの役割（通常link / 媒体取得）をAST属性の文脈で決め、文字列一括置換で混同しない。

### 3. 外部媒体は明示有限inspect-onlyを推奨する

`application/asset/references.ts:147`以降は外部候補を最大200へ絞り、`inspectMany`で許可されたimage/video/background/fontだけを表示許可へ入れる。stylesheetはこの直接表示許可へ入れていない。`adapters/node/reference/safeFetcher.ts`のnormalize/approveはURL形式・credential/port・特殊hostを拒否し、DNSの全回答にprivate/special等が混じれば拒否する。`inspectMany`は重複除外、最大200件、同時最大8、全体5秒、caller signalを共有する。未検査/timeout/超過はallowed=falseである。

前掲の構文だけで外部媒体を有効化する案は、普通のhostnameが現在private addressへ解決する場合に、P4aが止める参照をdownloadで再有効化し得る。このため同じ保護境界を守る採用案としては不十分であり、**既存inspect-onlyを明示的に再利用する案を推奨**する。新body fetch/redirect追跡/再取り込みは不要で、既存inspectはDNS検査だけを行う。

最小案は、外部媒体の能動的なfallback候補を現在の表示と同じ順序・最大200件で集め、同時8/検査全体最大5秒の`inspectMany`へprepare全体30秒の同じabort signalを渡す。個別URLごとに30秒を積み上げない。生成後の採用前にも残す外部媒体を同じ有限方式で再確認し、最初から数えた30秒を延長しない。readyからnative GETまで時間が空く場合も、取得開始前のcurrent認可/内容照合と一緒に最大5秒かつ固定operation残時間以内のinspectを行い、許可集合が変わっていれば古いspoolを渡さず明示やり直しへ戻す。新しいinspect結果で現在本文/素材を生成途中に差し替えない。

許可済みで埋込不能な外部媒体だけ原URLを能動参照として保持する。DNS拒否/失敗/未検査/200件超/timeout、既知blocked、内部/history/draftは有効fallbackへ戻さず、安全な欠落説明にする。現在表示で直接読まない未取得stylesheetを新たにactive `<link>`/`@import`へ復活させない。通常anchor/textはこの媒体DNS検査の対象ではなく、前項の意味を維持する。`externalReading=false`の入口ではP4aと同様に外部能動参照を許可しない。

この方式も、ダウンロード済みfileを後で開く時点のDNS変化や外部内容を固定しない。serverによるinspect時点と利用者が後日行う外部アクセスの差を明示し、取得済みbytesの回収/将来の外部通信安全まで保証しない。ここでは実DNS/通信/テストを行わず、既存sourceの境界だけを照合した。
