# P4c 公開・発見の接続案

2026-09-20 JST。P4b の独立検証と分離した読取設計準備。採用・実装開始・実行時合格ではない。Manager が最新 brief/design と原文を照合して正式条件を決める。

## 対象と正本

`spec/scenario/sharing.md`、`discovery.md` の全文、account の AC-07/09/10、workspace の WS-07/08/09、P21 のプロフィール入力、最新 brief/design P4-Q1/Q2/Q3、`P4-public-contract.md` と関連 source を確認した。goal-implement と manager-loop は全文を読み、本作業では次フェーズの接続提案だけに使用した。spec/spec-implement は使用していない。

優先する確定事項は次のとおり。

- note の public identity/URL 世代、限定 token、creator は現在所有と別物。handle 初回設定・変更、WS slug 変更、所有移動、creator の脱退で変えない。再 public は同 identity/URL 世代、SH-04 は token だけを再発行する。
- 著者は creator account ID から現在の人物を解決する。個人/WS の公開一覧は現在所有で決める。旧 handle は変更元へ転送せず、未割当404、別人が再取得した後は別人のプロフィール。著者を旧文字列の再取得者へ付け替えない。
- WS ページの公開と各 note の public は完全に分離する。非公開 WS の public note は閲覧・横断検索できるが、WS 名・説明・icon・member 等を新たに露出させない。
- 公開操作時だけ現在個人 owner の handle / 現在 WS の slug を要求する。既 public note の移動を追加の公開操作にせず、移動先の未設定を理由に拒否・非公開化しない。
- AC-09 の実退会、個人データ回収、退会後 URL の実失効は P5 の残条件。今回の creator ID 保持・deleted 読取対を、その実削除機能の完成とは扱わない。

## 推奨する一 slice

AC-07 の表示名・handle・bio・icon の実保存、WS 公開設定、単件の public 変更、中立 URL の匿名 current 本文/媒体、現在所有の個人/WS 公開ページ、ページ内検索・横断検索・タグ/更新期間・sitemap、公開解除、public HTML/Markdown 取得までを一つの縦 slice とする。設定画面の空成功や未接続の download ボタンを置かない。

public HTML/Markdown は現 P4b では未提供であり、この候補で authority と native 入口を実接続する。PDF/ZIP、一括公開変更、Google/Drive/LLM 接続、AC-09 本体は含めない。SH/DS/EX の全体完成、R09 全体完成にはしない。

この範囲は限定共有より広い。正式委譲から自己完成候補まで初期 8〜12 時間を見込む。最初に identity/profile/icon/WS 設定の基盤、次に public read と SSR、検索/sitemap、export と異常系の順で接続する。独立検証時間は別。SSR 方式・icon 課算・handle 解除・検索運用値の採否が未確定のため、これは実測 ETA ではない。

## 現 source の接続点

以下は読取根拠であり、今回 test/build/DB 操作をして成立確認したものではない。

| 現在の file / 責務 | 読取結果と最小差分 |
| --- | --- |
| `packages/core/src/domain/sharing/entity.ts`、`adapters/libsql/sharingSchema.ts` | visibility 型と DB は public を含むが、操作型は private/link のみ。未発行 row は private だけ、public は password 禁止。既存 CHECK を保って public 初回に必要な token と別 identity を同 Tx 発行する案が最小 |
| `application/sharing/settings.ts` | current session/edit/lifecycle、共有版/note版/所有世代/WS確認値を同 Tx 照合済み。public 操作と前提、password 解除確認、public 時の token 取得を追加。普通の本文保存・復元に共有設定を書かせない |
| `application/sharing/reading.ts`、`presentation/sharingHttp.node.ts` | 現 token reader は link のみ。current ref/ready 媒体、Tx 外 render 後の再照合、noindex の隔離頁がある。public 専用入口と `/s/` の public 許可は分けて接続し、旧 token を canonical へ転送して救済しない |
| `repositories/displayNameRepository.ts`、`routes/settings.profile.tsx` | 名前だけの version/OCC と named/unset/deleted/unknown、共有 panel への検証済み復帰が実装済み。profile 拡張でこの版と戻り先/旧 actor guard を壊さない |
| `workspaceSchema.ts`、`repositories/workspaceRepository.ts` | active/deleted 縮小、settingsVersion、現 slug unique はあるが公開フラグはない。deleted slug の既存予約を変更しない |
| `application/workspace/icons.ts`、`domain/workspace/icon.ts` | 5MiB 入力、PNG/JPEG/WebP、30秒処理、512KiB 出力、現在 owner/OCC、writer/実回収までの課算がある。画像処理だけを再利用し、個人 icon を WS row や note draft に偽装しない |
| `repositories/scopeCapacityRepository.ts` | 現容量 union に WS icon が含まれ、個人 profile icon はない。個人課算を選ぶなら明示追加が必要で、自動的に既存集計へ入るわけではない |
| `application/browse/ports.ts`、`adapters/libsql/browseReadSnapshot.ts` | 全 request が sessionHash を要求し、app 用 DTO は scope/容量/calendar を含む。匿名のために認証を optional 化せず、新 public request/DTO/read predicate を用意する |
| `adapters/node/browse/searchExecution.ts`、`searchDeadline.ts` | 子 process の有限実行、待機上限、受付から3秒、abort/kill後の実closeがある。語規則・索引とこの仕組みを共用できるが、新公開入口の資源配分は別に決める |
| `application/export/ports.ts`、`application/export/snapshot.ts` | ExportAuthority は account/link のみ。contentIdentity は本文/媒体内容から決まり authority と独立。public を別判別子で追加し、旧 authority の読み替えはしない |

## 最小 schema / port 案

新 migration だけで以下の五責務を追加する。物理表名は候補。既存 account/workspace 大表の再構築や全公開 note の fanout は第一案にしない。

| 新責務 | 最小正本と整合 |
| --- | --- |
| `note_public_identities` | `note_id` 一意/FK、別 `public_id` unique、`url_generation`、`access_epoch`、発行日時。visibility は既存 note_sharing だけに保持。public 受理前に identity を同 Tx 作り、public row の identity 必須を trigger/整合検査で閉じる。削除は note purge と同 Tx、元 owner/creator への cascade にしない |
| `account_public_profiles` | account ID 一意、nullable unique handle、bio、nullable current icon ID、profile version。既存 display name row/version は保持。未設定は handle null/bio空/iconなしの明示状態、架空名・email から補完しない |
| `account_profile_icons` | 所有 account、upload operation/世代、storage key、入力予約/実 bytes、sha/MIME、状態/期限/cleanup debt。現在 icon pointer と物理所有を分離。account への FK は物理回収を bypass する cascade にしない。RESTRICT とし、将来 AC-09 は実回収後の account 確定削除へ接続する案 |
| `workspace_public_settings` | WS ID 一意、pagePublic、独立 version。未作成は private/version0。既存 deleted 縮小行を変更しない。active と current slug と flag の三条件で公開を判断 |
| `public_discovery_rates` | 検索用の browser/global 固定 window counter と有限 prune 用 index。password/download rate と別。人物認可や公開可否の正本にはしない |

必要 index は current-public と note 所有/更新順、handle 一意、rate 期限、icon cleanup を対象に実 query plan で絞る。旧 migration を直さない。clone で旧全列・trigger 本文/FK・display name version・sharing token/envelope・旧容量/objects を比較する。現在 DB 内に public row が存在しないことは本読取では確認していないため、移行は例外 row の検査方針も持つ。勝手な handle/公開 identity の補完で異常を隠さない。

内向き port は PublicIdentityRepository、PublicProfileRepository、ProfileIconRepository、WorkspacePublicationRepository、PublicDiscoveryReader、PublicSearchExecution、PublicDiscoveryRateRepository を候補とする。画像 process/storage/clock/id/token の既存 port を可能な範囲で再利用する。SQL/Node stream/driver 例外を application DTO へ流さない。PublicNoteReader は application の snapshot/usecase とし、単なる skipAuthorization option を作らない。

### identity、初回発行と失効

推奨 canonical は `/p/{publicId}/{urlGeneration}`。別 publicId は既存 ID port、URL 世代は初回1、今回それを増やす操作は作らない。内部 note ID の直接露出案より外部 identity を独立させるが、公開 ID 自体を秘密/閲覧認可とは扱わない。

public 初回は現在 edit・本文・確認版・owner の handle/slug を照合し、identity と必要な token/envelope を共有変更と同 Tx で確定する。既発行 token は維持。password がある場合は確認入力の「public 化で解除」を照合し、password null と旧 grant 失効を同 Tx にする。public→link で古い password を復元しない。key 不在で初回 token を用意できなければ全部失敗、private 化と既存 canonical 認可は key 復号へ依存させない。

URL 世代と別に `access_epoch` を置く案を推奨する。明示 public→private/link で増やし、旧 public export operation を再 public で復活させない。canonical 自体は再 public で同 URL を使える。SH-04・handle/slug・同内容移動では epoch を変えない。この「短期 operation 失効の世代」は新技術仮定であり、原文に数値の要求があるわけではない。共有 version を流用すると無関係な token 再発行で canonical export まで壊すため分ける。

## handle / profile の判断

| 項目 | 出所と推奨案 / 保留 |
| --- | --- |
| 文字規則 | AC-07 は不正文字/予約語拒否、P21 は小文字・数字・ハイフンの例。trim後ASCII小文字化、3〜63字、先頭末尾英数字・内部ハイフンを推奨。長さと正規化は WS slug に合わせた新仮定であり原文確定値ではない |
| 予約語 | `settings/api/login` を含む固定集合を handle の正規化後完全一致で拒否する案。一般単語の部分文字列まで拒否しない。root の静的 namespace と合わせた明示集合を実装前に固定する |
| 重複候補 | 入力中の有限照会で最大3候補。照会は予約ではなく、確定 Tx の unique/OCC が正本。メール由来の自動 handle は作らない |
| 設定解除 | 未設定は許す。設定済みの解除は本人所有の public note が0件のときだけ明示確認して許す案を推奨。public note があれば非公開化/移動等を案内し、勝手な一括変更はしない。解除操作自体を今回提供しない案も可能で、Manager 判断待ち |
| 変更/旧名 | 変更で旧 handle を即時解放。元本人へ redirect しない。再取得は通常一意規則、独自 TTL/永久 tombstone を追加しない。これは採用済み P21 方針 |
| 退会後 | P5 の最終 account/profile 削除後に handle を解放する案を推奨。現 WS deleted slug の永久保持を一般化しない。退会フローと削除順は今回未提供/未検証 |
| bio | P21 maxlength300 を Unicode code points として採る仮定。plain text、改行可、NUL等の制御を拒否し HTML 実行なし。trim は保存規則として明示する。空を許す |
| 名前/OCC | P4a の trim0〜50/名前未設定と既存 version を維持。名前+handle+bio の合成フォームは nameVersion/profileVersion を同 Tx 比較・保存。一方だけの失敗で部分保存しない。旧 P4a 名前 command と競合しても無断上書きしない |
| icon の公開 | handle のある現在 profile の current icon だけを公開 URL で返す。handle変更/解除・icon差替/削除で旧取得URLを拒否。名前未設定を架空名で補わない。creator の handle がない note は実名前状態だけ、profile link なし |

profile 編集は pending/失敗時入力保持、ACK不明→現在GET→明示再操作、actor ABA/操作世代を持つ。handle設定から共有 panel へは検証済み note ID だけで戻り、最新確認を取り直してから利用者が public を実行する。未保存本文を自動保存/破棄せず既存離脱 guard を通す。

公開 route は原文の `/@{handle}`、`/w/{slug}` を維持し、横断検索は新 `/discover` を候補とする。検索条件は query/tag-name/updated-from/to/zone/cursor だけを境界で検査し、profile/WS識別子は route に固定する。公開 DTO は表示用profile、現在public note metadata、有限next cursorだけ。email/member/使用量/原本/job/tokenを含めない。本人編集DTOと匿名DTOは型から分離する。

本人profile保存は現在sessionからactorを決め、名前/handle/bio/両expectedVersionだけを受ける。handle空き確認も本人sessionと有限候補に限定し、確定予約と混同しない。WS toggleはWS ID/pagePublic/両確認版を受け、現在roleをserverで確認する。アイコンは別upload operationとして採用し、未送信の名前/bio入力をアップロード成功で保存済みにしない。

DS-01〜03のアカウント/スコープメニューから公開ページへの導線、外部表示バナーと設定導線、作業一覧への戻りを含める。公開note自体には本人でも編集リンクを出さない。空ページには公開方法とWS所有noteが個人へ並ばない説明を出す。作業scope切替のlayout/sortを保ち、filterは文脈を跨いで流用せず、現在権限喪失時は既存の個人への回復に接続する。匿名へ本人専用banner/設定先を無条件に付けない。

### 個人 icon の物理所有・課算

AC-07 の5MBを優先し、既採用 WS と同じ5MiB入力/PNG-JPEG-WebP/512px以下static WebP/512KiB出力/30秒隔離を再利用する案。P21 の2MB表記とは差があるため、2MBへ縮めた扱いにしない。画像加工 port の実体は共用可能だが、WS owner policy/repository を個人へ流用しない。

upload 予約→処理→writing→ready の各段で現在 session/account と profile version/operation 世代を照合する。coordinated writer に `profile-icon-upload` を追加し、実 I/O の register/publish/最後の pointer 採用を閉じる。profile の最新 icon pointer を切り替えるまで旧 icon を保持し、失敗では既存表示を失わない。差替・削除後は旧 URL を直ちに拒否するが、物理 row は cleanup debt として保持する。

個人5GiBへ input予約・ready・cleanup待ちを課算する案を推奨する。AC-10 の「新しいアップロード」及び既存 WS icon との整合による提案であり、AC-07 原文が icon の課算を明記していると偽らない。課算しない代案なら独立した service icon disk 予約/上限/cleanup が必要になるため、無課算・無追跡にはしない。いずれも匿名 export spool とは別の保存資源で、export quota を変更しない。

input予約から実出力へ移る際は、使用中 buffer/writer と既存物理 object を先行解放しない。cleanup claim、active writer 収束、実 remove、同 operation/世代照合後にだけ行と課算を消す。期限切れ/abort/late second put/remove失敗/boot再開を小実体で確認する。account FK を理由に debt を cascade 消去せず、P5 の削除ではこの収束が前提になる。今回 account削除 UI は作らない。

### WS ページ設定 OCC

現在 owner だけが `pagePublic` を変更でき、settingsVersion と publicationVersion を確認する。公開時に同 Tx の current slug を要求し、確認後の改名/slug変更・owner喪失・deleted化を拒否する。一般設定とは別表だが、設定画面では最新の双方を渡す。OCC のために membership 全員や公開 note 全件を DTO へ出さない。

ページ公開中の slug 解除は、先にページ非公開化を求める案を推奨する。slug変更は公開設定を維持して新ページURLへ、旧URLから元WSへredirectしない。ページ非公開化は note の visibility/token/public identity を一切更新しない。WS削除commit直後は publication row が残っていても active fence で全公開 metadata/icon/page を拒否し、後続有限回収で新設定行を削除する。

## 公開 read と SSR の比較

public snapshot は identity、public visibility、active note、現在 owner 存続、source/current媒体、現在 creator 表示を同 Tx で取得する。元 owner/creator の在籍を閲覧条件にしない。render は Tx 外、その後 current authority と出力対象内容を再照合する。媒体GET/HEAD/Rangeも同じ現在公開 predicate と current ref/ready を照合し、原本/history/draft を認めない。現 WS が非公開なら DTO に WS 名/説明/icon/member/slugリンクを含めない。

| 表示方式 | 成立範囲・判断 |
| --- | --- |
| 現 `srcdoc` だけをコピー | CSS隔離は既存方式だが、独立本文HTTPもなく、検索向け本文の成立根拠として不足。srcdoc が特定crawlerで必ず index されるとは推測しない |
| 独立 public document URL を iframe src にする | 推奨。親 `/p/id/generation` に SSR title/author/tag/update/description/image/canonical と利用者が使える「本文を別画面で開く」通常anchor。子 `/p/id/generation/document` は同じ現在認可で全文SSR、styleModeと隔離を維持し、canonical は親。通常browser/crawlerで同じHTTP/情報を返す。子URLから単独で本文を読める。親/子それぞれ失効時404/410、媒体も現在認可 |
| 親に安全な構造化本文、元装飾だけ別document | 親HTTPで全文が明確になる代案。ただし元styleを親へ入れず、常に見える本文表示と元装飾表示の切替が必要。二重表示/読みやすさと既存styleModeの意味を変えるため、最小案よりUI変更が大きい。bot専用・隠しSEO本文にはしない |

推奨案でも、親 canonical への本文統合や外部検索への実掲載は未検証。Google の一次資料は、HTTP本文/通常hrefの取得と server rendering、HTML canonical を説明しているが、この iframe 構成の掲載保証にはならない。[Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)、[canonical の指定](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)。正式受入は実HTTPの親metadata・子全文・同current内容・通常anchor・canonical・失効を対象にし、外部検索への登録/掲載をローカル成功に加えない。

子 document は user CSS を親 UI へ持ち出さず、scriptなし/objectなし/baseなし/formなし、iframe sandbox と直接取得時の CSP を併用する。parent frame-src self、frame-ancestors は親で none・子は必要なselfのみを候補とする。既存rendererが認めた外部参照だけを子に許し、metadata は現在取得済みの安全な代表画像か既定画像とする。外部URLを metadata 用に新fetchしない。親の通常navigation/export form は本文CSSの影響を受けない。

public親/子と個人/WS公開ページは index可能、`/s/` は public note の現tokenでも noindexを維持。横断検索の条件結果・作業一覧・設定は noindex とし、robots.txt のクロール拒否だけを秘密保持やnoindexの代わりにしない。private/link/purging/削除ownerは共通404、現在publicのtrashだけ情報なし410、restoreで同URL。公開解除前の配信済みbytes/検索engine cacheの即時撤回は保証しない。応答は当初 no-store として失効を優先し、長期CDN cacheはこのsliceで導入しない。

## 検索・ページ・sitemap

新 request は個人handle / WSslug / global の判別子と validated query/tag-name-key/updated期間/cursor を持ち、sessionをpublic結果の増幅に使わない。ページは最大50 metadata、current-public filterをLIMIT・件数・facet・抜粋・代表画像より前にSQL適用する。personalは現在owner=本人、WSはpagePublic+active+currentSlug、globalは全public。private WSの公開noteはglobalへ出せるが、その所属metadataは返さない。

語処理は既存検索の2文字以上・日本語部分一致・英数字語頭・混合AND・関連度を共用する。タグはIDではなく採用済み正規化name keyでscope横断一致。期間はDS-05どおり updatedAt で、appのcreatedAt月filterを流用しない。日付とIANA zoneをURLへ明示して半開区間にする案。タグだけ/ページ初期一覧は短いqueryエラーと区別する。profile/WSページは通常更新降順、検索時関連度、同順位IDで有限続き読込する。

検索の SQL/worker 接続は app 認証を残した新discriminantとする。第一案は公開専用の実行枠1・待機16・受付から3秒（既存方式）を設け、既存app枠と合わせ最大2 process。匿名で app の唯一の実行枠を占有させない代わりに総process数を増やす判断であり、採用待ち。timeout/queue満杯は503と回復導線、失敗を空集合にしない。公開部分の索引未完成も成功0件で隠さない。

rate初期案は30/browser/固定60秒＋300/global/固定60秒、永続Tx予約、blocked要求で延長なし、prune最大100/60秒。browser cookie破棄による迂回はglobal枠で抑えるが厳密な人物/IP制限ではない。信頼されていない X-Forwarded-For を使わない。password/downloadのcounterを共用しない。入力中の検索を無制限送信せず、明示検索または有限debounce/abortを使う。初期一覧/ページ検索にも共通global枠を適用し、sitemapのcookieなし要求はglobalだけで制限する案。通常note/媒体GETを検索rateへ混ぜない。これらの数値は原文要求ではなく運用提案。

render後に結果を採用する際は、同じ有限queryを再実行してbounded DTO/件数/facet/sourceと公開認可を照合する案。全catalogue epochの新正本や全note配列を作らず、同じ親deadlineを共有する。公開解除競合は旧本文/タグ候補を返さず再試行又は現在結果へ。profile/WS設定自体も同時に再確認する。

### sitemap の有限案と残判断

canonical note、現在handleのprofile、公開中currentSlugのWSだけを列挙する。private/link/trash/deleted、旧handle/slug、document子URL、token URLを含めない。sitemap は権限表ではなく、各リンク先も現在認可する。lastmod は実変更日時が正しく得られる対象だけに付け、生成日時を捏造しない。

第一実装案は root の `/sitemap.xml` index と、同じrootの `/sitemap-notes-{page}.xml` 等の種別ごとの500 URL葉ページ。公開URLのpath範囲を覆わない深いdirectoryにsitemapを置かない。SQL count と有限LIMIT/OFFSETのmetadata-only readerを専用deadline下で用い、XML全本文noteを読まない。大offsetの実行時間は保証せず、期限で失敗を確定する。索引に新正本を作るkeyset境界表方式は、保守/失効が増えるため最初から加えない。500は応答処理単位であり公開note総数の業務上限ではない。

protocol上、単一 sitemap/index は各50,000 entries・非圧縮50MiB以内で、複数indexも可能。同host、UTF-8/XML escapeも必要。[Sitemaps protocol](https://www.sitemaps.org/protocol.html)。実装ではprotocol以下の明示response予算とdeadlineを設定し、超過時は切れた成功XML/先頭だけの完全一覧を返さない。恒常超過は運用分割が必要と示す。初期500葉・3秒・index上界の実query方式はManagerの採否対象で、最大規模の成立は小fixtureで主張しない。

公開/非公開の並行更新でindex取得と葉取得は完全な同時snapshotにならない。各応答時の現在公開性と有限性を保証し、snapshot間の一時的重複/欠落まで「全サイト原子的列挙」とはしない。leaf取得直前/採用前にcurrent predicateを再照合する。cacheやoutbox反映待ちを公開解除の認可として使わない。

## public export 接続

authority に `public { publicId, urlGeneration, accessEpoch, browserHash }` を追加する。browserは操作取得の束縛で、public閲覧権限を発行する秘密ではない。canonicalは `/p/`、public exportの準備GET/POST/nativeGETは `/s/export-public/{publicId}/{urlGeneration}` 配下へ置く追補案を推奨する。当初の `/p/.../exports` 案は撤回する。旧account/link operationをpublicへ変換せず、canonicalと限定tokenを出力本文へのアプリ付与URLに使わない。

prepare/生成採用/native GETの各時点で元public identity/世代/epochと現在public/owner/lifecycleを確認し、source identityはP4bどおり別比較。同内容移動は現在公開が続けば成功、本文/媒体変更は明示新要求、非公開/epoch失効は共通404。profilehandle/WSslug変更やSH-04だけでpublic operationを壊さない。

既存2操作slot・30秒生成・120秒操作・stream/SHA/実close・service spool予約/cleanup debtをそのまま使う。現 `hollow_share_browser` のPath=/sを変更せず、public/linkの書き出し要求をともにその配下で受ける。両者のbrowser hashと元note IDが同じ既存counterを参照し、6/browser-note・30/noteの固定窓を保持する。

当初提案した新root download cookie＋link最大2bucketは、旧/s窓を消費した後に初めてpublicへ来るbrowserを捕捉できず、窓保持が成立しないため撤回した。root cookie、2bucket予約、cookie bridgeは不採用案として残し、実装しない。具体比較と新nonce並行時の限界は末尾追補を参照する。

native formのstrict Origin/null metadata境界、no-JS、ACK不明/手動再実行を維持する。password rateは別。token経由で現在publicを閲覧/取得する場合も、元linkの現token/世代と現在scopeを照合し、過去のpassword grant/旧tokenをpublicへ昇格して受け付けない。

## 正式受入候補と影響候補

以下はManagerが固定する前の候補であり、台帳の追加・reopenはまだ行わない。

1. profile実保存と現在公開表示: nameの旧OCC保持、handle重複/候補/変更/解除、bio、iconの正常/異常/容量/物理回収、ACK/actor/設定復帰。
2. public commandとidentity: current編集者・本文・所有前提、password確認解除、同Tx rollback、初回/再public/SH04/handle初回変更/移動のURL不変。
3. public current read/SSR/media: 親/独立document・両style・metadata・creator実表示、privateWS情報非漏洩、GET/HEAD/Range/失効/遅い応答。
4. 現所有profile/WSページ: authorとownerの分離、WSページだけの公開解除、旧handle再取得の誤帰属なし、slug変更、空/検索/タグ/戻りscope。
5. 発見: public専用語規則/updated期間/関連度/有限page・count/facet、rate/期限/再起動、sitemapの現在集合/XML/失効。外部掲載は未検証として分離。
6. public HTML/MD: 元authority固定・内容一致・同内容移動・epoch失効、実file/current媒体、no-JS/native/失敗/既存P4b回収。
7. lifecycle/UI/基盤: trash410/restore同URL、purge/現在WS削除と先移出保持、390/keyboard/旧actor、clone全旧列/trigger/objects/charge、最終checks/tests/build/同bundle/commit/全停止。

| 実編集時に候補となる先行ID | 責務と限定する再確認 |
| --- | --- |
| P4a-A/B/C/E/F/G/H | public追加による共有正本/token/PW/UI/profile/OCC/移動lifecycle/移行。実際に変えるfile責務で絞る |
| P4a-D、P2b-A | `/s/` public許可とcurrent媒体/HTTP/隔離を共通化した場合の旧限定認可。新publicだけなら既存の全媒体試験は反復しない |
| P3b-1-E、P3a-A/B | WS settings/publicOCCとslug解除/アプリ公開導線の実編集時。招待/role内部を無変更でreopenしない |
| P3a-E、P2a-D、P2d-2-B/E/FD | 個人icon課算、coordinated writer/cleanup/停止/移行の実変更時。既存parserやFD全量試験を機械的に反復しない |
| P3c-A/C/D/G | 検索の既存語処理/query/worker/wireを変更した範囲。新public readerのみならapp全calendarを巻き込まない |
| P3d-2-A/B/F、P3e-C/E | public状態・影響確認/表示またはpersisted payloadを実変更する場合だけ。identity不変をread側で確認するだけなら移動commandのreopen理由にはしない |
| P3f-B/E/H | 既存WS削除fence/新公開設定回収/icon取得portを実編集した場合だけ。新匿名入口の失効自体はP4c新条件 |
| P4b-A/D/E/F/G | public authority/元入口/rate/cookie/UI/cleanupの実変更。serializerとHTML/MD本文を無変更ならB/Cは保持 |
| P1-E、P3c-F、P2c-1-E | 新route dispatch/シェル/詳細/設定復帰が実際に触るpending・dirty保持・起動責務 |

最小の独立対は自己専用account/WS/note/小PNGのみで組む。名前/handle再取得は既存利用者の設定を書き換える破壊fixtureにしない。creator deleted readerは隔離DBで確認し、AC-09 UI成功へ拡張しない。WS削除とicon/purge試験は自己新規だけを保全後に実行し、不可逆量と保全コピー・復元未実施を区別する。

## Manager に返す採否点

- 上記一sliceにAC07の全4項目とpublic HTML/MDを含め、PDF/ZIP/一括公開/AC09本体を残す。
- 別public IDと `/p/id/generation`、初回同Tx token発行、URLと別の短期public access epoch。
- handle3〜63/ASCII正規化/完全一致予約語、解除条件、退会後の解放案。bio300 code points。
- profile icon の個人5GiB課算、既存画像処理の再利用、独立writer/debtとFK RESTRICT。WS public二版OCC、公開中slug解除拒否。
- 独立SSR document＋通常anchor＋親canonical方式。親への本文index統合や外部掲載を未確認と明示する受入範囲。
- 公開検索枠1/待機16/3秒・30browser/300global毎60秒、sitemap500葉/有限SQL・protocol上界/恒常超過の扱い。
- public exportだけを既存/s cookie配下へ置く追補案。新root cookie/2bucket/bridge案は撤回し、現在public認可と既存nonceのrate/操作束縛を分離する。

製品・依存・git・DB・runtime・browser・test/build・既存証跡・P4b報告・管理正本には操作していない。一次資料の閲覧だけを行い、外部サービスへの登録/送信/公開はしていない。この新報告だけを apply_patch で作成した。提出時の実時計を別途付し、全文確認後に全操作を停止する。

2026-09-20 00:37:10 JST の tool 時計で、本文全文と追記箇所の読取照合を完了した。本追記の確認後、読取・文書を含め停止して Manager の採否へ返す。先の進捗通知「00:26」は概算見出しであり、実観測時刻へ読み替えない。

## 追補: download nonce の移行を不要にする最小入口

2026-09-20 00:39:12 JST に再開した読取追補。Manager の反例を確認し、当初2bucket案では既存browser窓保持が成立しないと訂正する。製品/DB/runtime/browser/test/build/gitは停止を維持し、この報告だけを更新した。

### 反例と原文への対応

既存linkで6回消費済みのbrowserが初めて `/p/` を訪れると、Path=/s cookieはその要求へ送られない。そこで新root nonceを作るとpublic側は0回の別bucketになる。後で/sに戻る際の2bucket検査では、既に受理したpublic要求を取り消せない。EX-04原文はdownloadのrateを求め、P4b-E/designは6/browser-note・30/note・固定60秒・再発行非resetを採用している。移行時の1回限りのresetを原文必須ではないという理由で黙認する案は採らない。

CookieがPathに一致する要求に送られること、並行Set-Cookieにraceがあることは[RFC 6265](https://www.rfc-editor.org/rfc/rfc6265#section-4.1.2.4)に基づく。Pathを閲覧認可のsecurity boundaryとみなすわけではない。下記で権限を決めるのは現在public predicateとoperationの元authorityである。

| 案 | 結果 |
| --- | --- |
| root nonce＋link2bucket | 上記初public経路で既存窓を引き継げない。撤回 |
| /sを経由するcookie bridge | 旧nonce hashにrateを束ねる永続alias、未初期化root nonceの並行、限定return先、cookie不受理時の有限停止が追加で必要。raw値のPath拡張/複製では代用不可。原文がexportの/p配下を指定していないため、この追加基盤を採る理由が薄い。今回不採用 |
| public exportも/s配下 | 新cookie/移行/aliasなし。旧nonceが初要求から届き同じrate rowを使う。canonical/body/mediaは/pのまま。推奨 |

### 利用者の順序とroute

1. canonical `/p/{id}/{generation}` の「ダウンロード」は通常anchorで `/s/export-public/{id}/{generation}` の形式選択GETへ進む。/pの本文・metadata・crawler閲覧にはcookieを要求せず、ここではnonceを発行しない。
2. 形式選択GETでidentity/世代・現在public・active note・現在ownerを確認する。失効は共通404、title等を返さず、nonceも新発行しない。有効な既存/s nonceは変更せずSet-Cookieもしない。未設定の場合だけ同名・同Path=/s・既存属性で新nonceを発行し、HTML/Markdownのnative formを表示する。
3. 形式選択POSTは同base routeで、requestに実際に戻ったnonceを確認してからpublic authorityを固定する。現nonce hashとnote IDに既存 `reserveDownload` を一度適用する。準備GETではdownload回数を消費しない。cookieなし/不正なら操作を作らず、その画面でcookie有効化と明示再試行を案内する。
4. 同期生成が成功した場合だけ303で同配下の `/{operationId}` へ進み、native GETがattachmentを返す。生成後の追加clickは作らない。生成/GET失敗を準備POSTへ自動転送しない。戻り先は検証済みpublic ID/世代から組み立てるcanonicalだけで、任意return URLは受けない。

namespace `export-public` は既存43文字token segmentと異なり、厳密な新route parserで区別する。現 `server.node.ts` はexport dispatchをsharing dispatchより先に呼ぶため、その順序で新export routeを終端処理する。既存 `/s/{token}`、unlock、assets、`/s/{token}/exports/{operation}` は形・認可・cookieを変更しない。不正suffix/余剰query/methodは受け付けず、旧token readerへpublic fallbackしない。

### 認可、metadata、no-JS

public authorityは `publicId/urlGeneration/accessEpoch/browserHash`。nonceはrateとoperationの取得束縛にだけ使用し、public準備/生成/取得はpassword grantを検索・作成・延長しない。valid grantがあってもprivate/link化されたcanonical由来operationは拒否する。旧link operationは元token/世代/grant条件を守り、新public operationへ付け替えない。

準備GET、POST、303、attachment/errorはnoindex/no-store/no-referrer/nosniff。準備GETにもcurrent predicateとmetadata採用前の再照合を適用し、非公開WSのmetadataを出さない。crawlerはcookieなしでcanonical/独立documentの同じ本文を読める。download操作頁はsitemapに含めず、crawler識別によって本文や認可を切り替えない。

nonce初回発行はtop-levelの準備GETに限定する案とする。Sec-Fetch-Mode=navigate/Dest=documentで、Site=same-origin又はaddress-bar由来のnoneなら発行可能。cross-site subresourceやmetadata不整合/欠落の要求に無条件でSet-Cookieしない。該当しない要求にはcookie準備の説明と固定canonicalへの通常linkを返し、auto-redirect loopを作らない。通常canonicalからクリックしたmodern browserのno-JS経路を正式実UIで確認する。metadataを送らないbrowserの自動download互換を未確認のまま成功にしない。

POSTは既存のOrigin完全一致、又は文字列null＋Sec-Fetch-Site=same-origin/Mode=navigate/Dest=documentの厳密例外だけを維持する。GETのSite=noneをPOSTの例外へ広げない。redirectが混ざった要求のmetadataを正常だと推測せず、実requestで観測して判定する。Fetch Metadataはredirect chain全体に基づくため、外部経由で戻ったというだけではsame-originへ戻らない。[Fetch Metadata Redirects](https://www.w3.org/TR/fetch-metadata/#redirects)。本案の正常系は外部redirectを含まない。

### 初回並行、既存operationと有限性

旧nonceが存在するbrowserでは、準備GETが再発行しないため既存link grant/operation/6回windowは不変である。最初のpublic POSTも同じhashを参照し、旧窓6回後は同じretryAtで429になる。public↔linkの往復、token再発行、複数tabでもnote全体counterを一度だけ予約する。

nonceが本当にないbrowserの初回GETが並行すると、N1/N2のSet-Cookie順序はserverから原子的に固定できない。準備GETはoperation/slot/spoolを作らず、POSTが実際に送ったnonceにだけoperationを束縛する。POST後に遅いSet-Cookieでjarが別nonceへ変わった場合、旧operation GETを別nonceへ再bindせず404とする。現cookieでの明示新操作以外は受けず、旧spoolは既存120秒/cleanupに従い実close/removeまで追跡する。隠れた再POST/新nonce追従/成功表示はしない。

この初回cookie raceは「既に存在する旧nonceの6回窓を移行でresetする」問題とは区別する。cookie削除/拒否や初回並行をまたいだ物理browserの恒久同定は保証せず、既存の30/note global counterと2操作slotを残す。raw cookie値をHTML/hidden input/URL/logへ出してjarとの照合を代用しない。重複同名cookieは先頭順への依存で別人物扱いせず安全側拒否を候補とする。

自動遷移は正常POST成功時の303一回だけ。準備GET→POSTは明示操作で、cookie不足/metadata拒否/期限切れ/不明応答の自動round tripは0回。このnonce方式のための追加migration/table/key/永続alias/独自TTLは不要。P4c本体のpublic identity/profile等の新schemaとは区別する。元P4bの生成30秒・受付120秒・2操作slot・回収負債とrate pruneを変更しない。

正式実装時の最小対は、旧/s nonceのみ・旧6回後の初public429とretryAt不変、旧5回→public1回→次link429、同時link/public最後の1枠、旧link operation取得の保持、public→privateかつ旧grant存在で拒否、no-JS選択POST→303実file、cookie拒否と並行Set-Cookie後の旧operation404/有限回収。今回はsource/一次資料の読取案であり、いずれも未実行である。

2026-09-20 00:44:56 JST のtool時計で追補全文を確認した。本文の旧root cookie/2bucket/bridge推奨も撤回へ訂正済み。本段の確認後、読取・文書を含め全停止してManagerへ返す。
