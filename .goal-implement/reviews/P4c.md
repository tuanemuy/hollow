# P4c 独立検証

## 2026-09-20 03:09 JST 初期報告

Verifier: resume_verifier。対象は P4c-A〜K と指定の先行20条件、計31。製品・管理正本は非変更、goal は Manager 所有。goal-implement / manager-loop に従い、原文 SH/DS/AC-07/WS-07〜09/EX-04、採用 design P4c、固定 plan、主担当報告全文を読んだ。P4b-C と未提供 PDF/ZIP/Google 等を成功範囲へ追加しない。

- HEAD `6e9731c28f65503c424295a112c46811c66c4054`、source970 `378d72a699cdbdda130fe9ca6cd00f487365f13e51afac52e83b0b57dc2cb6a9`、bundle `a095546bf8b6c29c89f71b3e898243a195577c9d70f97bfbe35fbeef43887481`、lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` が独立一致。製品差0。
- 03:05:06 ports3000/3001・fresh DB sidecar handles空。新private proof `/Users/hikaru/.local/share/hollow/verification/p4c-independent-20260920-MvR7oC` に03:05:36.712停止下開始保全。12objects/3107B、原本DBへdriver直結なし。
- 独立 clone は主startを新before/afterコピーへ複製して27→28へ移行。旧67表522列の欠落0、旧72trigger差0、103notes、FK0、export/rate0。67/522は管理ledgerとsqlite_sequenceを含み、主65/517との包含差はこの2表5列。
- 現candidate既存試験の独立再実行: Node8files/80件成功（03:05:53開始8.52秒）、profile/model/render/publicHTML pure4files/120件成功（03:06:38、336ms）。これはVerifier新作testではない。全935unit/475Node/checks/buildは主担当借用範囲であり、全量独立再実行とはしない。
- 同bundleを03:06:38.991起動、PID27882 / exec session99698。現在本Verifierが環境を単独所有。新browser `p3c-fresh-p4c-review`、新rootの実行専用account helperで新自己account1を通常signup/local確認。新profileと新note1だけを実UI操作中。旧5account/profile・旧103notes・主自己残存タグは変更対象外。
- 現時点は独立source読解と実UI進行中。31条件の最終合否は未確定。残は公開主要経路・実file・新自己対象の保全後回収・最終比較/固定/正常停止。初期返却見込み04:00〜04:30 JST。

秘密値・秘密hash・private helper本文・rawlog・cookie・token・旧事故環境の閲覧なし。引数なしhelper呼出は入力検証エラーだけで終わり、引数順をManager経由の既知使用例で確認してから新登録を行った。

## 2026-09-20 03:16 JST 独立実UI・HTTP/file

- 新自己account2/profile2、note1、WS1を通常UIで作成。自己note `01a0bada-9c8c-76ad-a6d8-7c26f8253691`、canonical `/p/01a0badc-1c3b-7183-baa4-d5b5898b6e41/1`、自己WS `01a0bae1-1b91-75cc-a36e-47ca19fa9e03`。新PNG203Bは通常media挿入、個人iconは同203B入力から86B static WebP。既存を破壊対象にはしない。
- 安全上の検証手順訂正: `p3c-fresh-p4c-anon` / `p3c-fresh-p4c-second` の初回openが `restore loaded` だったため保存session名衝突の可能性を検知。当該匿名UIを証明から除外。second helper createの入力失敗・登録送信0・account/profile変更0を確認し、開いた2sessionだけclose、保存stateは非削除。以後は固有名 `p3c-fresh-p4c-independent-anon-mvr7oc` / `p3c-fresh-p4c-independent-second-mvr7oc`（ともにrestore missing）。新rootのsecond排他privateを再作成せずfill→通常signup/local確認。保存session内容は探索していない。
- 03:11:21 cookieなし独立HTTP: 親/本文SSR200、canonical/current本文、scriptなし、親style非侵入。媒体GET203B全byte一致・HEAD空200・Range206先頭16B一致。個人初期index、条件検索/discover noindex、匿名内部設定リンクなし。混合`東京駅 cloud`＋updatedAt日付条件で自己1件、sitemap leafに唯一の自己canonical、子/tokenなし。422と0件を区別。`public-initial.json`。
- 固有匿名browserでも本文表示、script0、親背景rgb(250,250,250)/子rgb(221,238,255)、本人向け編集リンク0を確認。owner profileには本人バナー・設定リンクと同1件を表示。
- profile icon保存は未保存bioを保持。handle変更確認をEscape取消するとdraft保持・保存buttonへfocus復帰、その後明示確定。03:13:37 old handle404/new200、old icon404/new icon200/86B WebP、canonical不変/現在著者を独立HTTP確認（`rename.json`）。新secondが旧handleを通常保存で取得。
- 固有匿名browserのcanonical→選択GET→明示native POST→303→実file: HTML1272B、MD911B、両方に保存本文と元PNG203Bの完全一致data URI、内部API参照/scriptなし。03:14:43.875/.099のlauncher metadataはOrigin null/site same-origin/mode navigate/dest document全true。MDのhyphen escapeを生文字列一致としたVerifier初期assertを修正し、表現の差を不具合扱いしない。`native-files.json`。
- 390幅native形式選択は横overflowなし、2buttonは高さ55px、script0/通常POST form。全JS無効ブラウザーや全MD閲覧器への保証ではない。残は新自己移動/WS設定/現在失効、保全後回収と最終比較。

## 2026-09-20 03:20:08 JST 不合格発見

P4c-F/G 不合格。P4c-C/K の完成候補にも影響する。

- 要件出所: WS-07/09、P4c-F の「実WS説明を表示」、P4c-G の正常公開query、design.md 263行の説明0〜2000 Unicode code point。
- 再現: 新自己WSだけを公開し、一般設定の説明を `😀` 1201個（1201code points / 2402UTF-16 units）に変更して通常保存。画面を再読込し、保存された入力が1201/2402であることをcountだけで確認。cookieなしの通常Chrome UA GET `/w/independent-ws-mvr7oc`。
- 期待: 合法な保存済み説明を表示して200。実際: 503、Retry-After3、一般エラー画面。再試行では解消しない。`unicode-workspace-confirmed.json` は03:20:08.677の確定観測。前の `unicode-workspace.json` の200は保存完了前を観測したため不具合根拠から除外し、上書きしていない。
- 原因: `packages/core/src/adapters/node/publication/wire.ts` の `ownerBase.description: z.string().max(2400)` はUTF-16長制限。domain/workspace/entity.ts はcodepoint2000、transportは8000を許し、正常な保存データを `LibsqlPublicDiscoverySnapshot.read` のresponse parseが拒否する。worker境界で `PUBLIC_SEARCH_BUSY` へ変換されるためHTTP503。
- 影響: 説明のUTF-16長が2400超の公開WSは公開ノートが0件でも一覧を閲覧できない。非公開漏洩や既存データ破壊は観測していない。
- 最小修正候補: 許可された2000codepointを損失なく通す有限response境界（最大4000UTF-16等）へ整合し、補助文字の合法境界を含むquery/worker HTTP回帰を追加する。表示文を切り詰めて成功させるのは採用契約に合わない。製品変更はVerifierが行わずManager/Implementerへ返す。
- 直前の通常経路は独立成功: public自己noteを新privateWSへ通常バッチ移動。canonical200・著者はcreatorの新handle・旧個人profileから除外・privateWS名/説明/slug非漏洩/WS404（`move.json`）。WS公開の明示確認後は同note1件/保存説明が公開表示され、匿名member/internalリンク0。旧handle再取得者は新second profile・0note・旧iconなし。

上記発見時runtimeはPID27882 / session99698。現候補を全31合格とは扱わない。

## 2026-09-20 03:27 JST 影響限定・保全後の残対

- 03:21:00.959にPID27882正常drain exit0。03:21:27.365停止下 `before-delete` 保全は14objects3396B（旧12/3107B＋自己asset203B/icon86B）。新自己WS1/note1/member1/revision3を含む。新copy比較で旧5account/2publicProfile/3displayName/39sessionは全列欠落0、旧103note/111revision/95head/32tag等保持、旧14scope charge一致。2表のFTS物理segmentとsqlite_sequenceだけは自己新note追加で変化、最終論理比較は別途行う。
- 同bundleを03:21:30.970 PID37297 / exec session81307で再起動。失敗状態の限定HTTP比較は03:21:54: WS公開503だけ、discover200/個人profile200/個別note200/WS sitemap200。`unicode-impact.json`。
- 同じwireの文字列境界をdomain上限と限定照合: WS名100cp→400、profilebio300cp→2400、note title200cp→800、author/tag50cp→200、query200cp→800、snippet160cp→800は包含。追加の同型不成立なし。独自4境界はBMP2000/astral1200を受理し、astral1201/2000を `page.owner.description` だけで拒否（`unicode-boundary.json`）。全repo監査や最大scale試験ではない。
- 自己WS説明を通常UIで元へ戻すと200へ回復。そのままpagePublicの未保存falseを保持して一般slugだけ保存すると、現在URLへ同期・false維持・旧dialogなし。旧slug404（redirectなし）、新slug200、note canonical200。これは現bundleの先行UI修正を独立確認したもの。
- ProfileEditorに本Verifierがfetch応答200後のTypeErrorを注入: POST1/GET0で結果不明・保存disabled・draft保持。明示「現在の設定を確認」後POST1/GET1でも元結果不明を保持し、新明示saveだけが可能。明示save後POST2/GET4・success/unknown解除。GET4は保存成功後のloader再検証を含み、自動POSTではない。人工ACK対であり自然故障の観測ではない。
- native取得HTMLをfile://で実表示: 本文/64×48画像ロード成功、script0/横overflowなし。390px公開WSページの表示も横overflowなし、input/説明/検索buttonを画像で目視確認。export metadata実時刻の第2件は03:14:44.099（前節の秒省略表記を補正）。
- 停止下保全後、新自己icon86Bを通常確認UIで削除。旧icon・旧accountには触れない。残自己note/WSの失効・回収と最終全停止を継続中。

## 最終判定

現固定候補は不合格。31条件の内訳は合格29、不合格2（P4c-F/G）、条件全体の未検証0。合格は記載した借用・独立の組合せによる判断であり、全分岐を本Verifierが実ブラウザー再演したという意味ではない。P4c-Cは公開設定command/認可/二版/slug/失効を、P4c-Kは構造・保全・証拠と停止を判定し、F/Gの公開ページ説明不成立を打ち消す合格にはしない。修正後は新candidateの再固定・影響再検証が必要。

根拠記号: C=本Verifierの現source読解、T=候補既存試験の独立再実行、Q=本Verifier新作の限定境界probe、U=独立実UI/HTTP/file、D=独立新copy移行/保全比較、B=主担当の固定候補報告または変更外の先行受入根拠を借用。

| 条件 | 判定 | 根拠と限定 |
| --- | --- | --- |
| P4c-A | 合格 | C profile同Tx/name+profile OCC、creator/current profile。T publication8/publicReading7/profile12。U新2profile保存・変更取消/focus・old404/new200・旧handleを別自己accountが再取得し0note/旧iconなし・canonical不変。B未設定から共有設定への明示復帰/dirtyとdeleted/unknown分岐。 |
| P4c-B | 合格 | C current profile/session/expiry、writer登録・採用・pointer/fence・実remove後解放/FK。T profileIcons9の遅延・失効・故障・quota・boot・cancel。U PNG203B→WebP86B、dirty bio保持、旧handle/icon404、通常削除。D86B物理回収、旧objects/容量不変。5MiB実画像最大は再生成していない。 |
| P4c-C | 合格 | C owner/currentactive+settings/publication二版/slug制約。T publication/HTTP。U自己privateWS404→明示公開1note、未保存falseを保持したslug一般保存後URL同期、旧slug404/new200/no redirect、匿名memberリンク0、削除失効。表示説明の合法上限不成立はF/Gに明示。B非owner UI readonly/公開中slug解除拒否。 |
| P4c-D | 合格 | C current sharing/identity/accessEpoch同Tx、token不変・public離脱revoke。T publicReading7/exportFlow30。U private→public同canonical、publicのまま通常move成功・所有先だけ変化、private404→再public200。旧export epoch非復活はT/Bで、実fileは新public authorityだけを確認。 |
| P4c-E | 合格 | C二snapshot/currentmedia/独立document/headers。T publicationHttp6/publicReading7/HTML69。U匿名親/全文本文/画像203B/HEAD/Range206、親CSS隔離/script0/編集リンク0、private404/trash410/undo同URL200、WS削除404、非公開WS metadata非漏洩。両styleはT、外部検索掲載は未測定。 |
| P4c-F | 不合格 | U同じ合法説明1201補助文字を通常保存・再読込できるが公開WSが503。期待は保存説明を表示する200。通常範囲のUはprofile実名/bio/icon、current ownership移動、本人バナー・匿名同集合・旧handle新取得者を確認。これらの成功で合法境界失敗を免除しない。 |
| P4c-G | 不合格 | C/T専用前段predicate・51行選択/50投影・2snapshot・1枠16待機/3秒actualclose・固定30/300rate等、U混合検索/日付/0件422区別は成功。ただし合法WS説明がresponse wireで503。Q BMP2000/astral1200成功、astral1201/2000拒否。下記複合cursor追加観察も修正時に扱う。 |
| P4c-H | 合格 | C current catalogue/SQL500/OFFSET・XMLescape/byte上限・実lastmod。T discovery11に501=500+1/重複0/次404、HTML69。U自己canonicalだけsitemap、private/trash/削除で除外、profile/index・検索/discover/noindex。全catalogue原子性/最大規模/外部掲載は未測定。 |
| P4c-I | 合格 | C public authority/epoch/browser・既存nonce非置換・explicit POST/metadata。T exportFlow30に旧6/5+1/lastslot並行/旧link保持/初回nonce race等。U固有匿名native HTML/MD実file・203B完全埋込・4metadata true/script0/390、HTML実表示。全JS無効設定や全MD閲覧器ではない。 |
| P4c-J | 合格 | C actor ID+epoch/token/mounted/finally、WS loader版同期、dirty/unknown状態。T model/render39。U profiledirty+icon/ハンドル取消focus・WSdirtyfalse/現在URL・独立ACK200後人工throw→POST1/GET0→明示GETでもunknown→新明示POSTだけ成功、390表示、公開解除/削除失効。actor ABA旧success/catchはT/B、今回実session ABAは未再演。 |
| P4c-K | 合格 | C inward ports/Clock/ID/UoW/new0027、worker/physical ownership/rate配線。D clone旧67表522列/72trigger、新backup旧全列/objects/charge/FTS。T80Node+120pure、Q境界、不合格を含むU現bundle、B935/475/checks/build/db差0。最終指紋/正常停止一致。phase全体受入はF/G修正待ち。 |
| P1-E | 合格 | C shell/profile/discover導線、U新local signup/確認・profile/WS/native390/pending/エラー、B規定checksと変更外認証基盤。公開WSの503はF/Gの具体欠陥として分離。 |
| P2a-D | 合格 | C scopeCapacityへpersonal iconを同じ個人容量unionで追加、T profileIcons9のquota/debt保持。D既存原本9/旧job/holding/全scope容量不変。B変更外の取込100件/500MB/形式上限と混在job、今回巨大取込は再演しない。 |
| P2b-D | 合格 | C public独立documentが保存display.styleへ接続、T publicationHttp両style/HTML、U親子CSS隔離/同saved内容のHTMLfile。B変更外の初回装飾判定と編集切替保存。 |
| P2d-2-B | 合格 | C profile-icon write owner/currentclock/claim/debt/FK、T9+既存coordinated所有契約B。U/D203Basset+86Bicon実回収、activewriter/未完objectdelete0。期限だけを物理終了とはしていない。 |
| P2d-2-E | 合格 | D clone・旧全列/trigger/原本/objects、C内向き/Clock、T限定正常/故障対とU390/keyboard/file、B全checks。自己289B削除・undo不可・backup復元未実施を明示。 |
| P2d-2-FD | 合格 | C新public readonly client/tx finally.close・supervisor actualclose/stop、T execution3、U2runtime正常drain/DBhandles0。B既存FD300回/commitrollbackと単独worker証明を変更外として保持、今回は300回を再演していない。 |
| P3a-E | 合格 | C personal icon reservation/ready/cleanupをunion charge。T9でquota/故障/debt、D旧14scope全一致と自己289B回収、Utrash/undo。B変更外20GiB/5GiB/80%表示等。 |
| P3b-1-E | 合格 | C WS一般設定と公開slug制約、U合法1201cp保存と再読込・一般slug変更後現在URL/dirty同期・note canonical保持。一般保存自体は成功し、公開表示失敗はF/G。B既存権限/予約語/OCC分岐とT publication。 |
| P3f-E | 合格 | C deletion cleanupにworkspace_public_settings回収、current active predicateで即失効。U自己WS削除時新入口404・公開集合除外、D追加intent/purge成功・public setting0・旧receipt/無関係rows保持。B旧招待/全actor job取消等変更外対。 |
| P3f-H | 合格 | C新0027のみ/ports/clock/UoW、D新copy保全・deleted縮小・旧全列/holding/receipt・自己回収、T/Bchecksと現bundleU/最終全停止。 |
| P4a-A | 合格 | C共有正本/現在確認版/原子的identity、T publicReading/publication・move、Upublicのまま移動/非公開/再public、D旧103private行全列保持。B変更外通常writer/履歴・viewer境界。 |
| P4a-C | 合格 | C public時password解除確認とgrantEpoch更新、T publicReadingの未確認拒否・原子確定。B旧private保護・8cp/1024B/hash/grant24h/rate/kdf対を維持し、再度秘密入力/鍵操作は行わない。 |
| P4a-D | 合格 | C /s noindex保持・public URLは別selector・resource guardへの明示経路追加。T publicationHttpの/s noindex、exportFlowの旧link保持/current失効。U public現在media/失効、B旧/s媒体再認可/原本history拒否全体は変更外。 |
| P4a-E | 合格 | C共有panel public操作/前提リンク/copy・旧actor guards保持。U詳細共有の確認・非公開/再public・保存済み表示、T sharing model/currentprofile。B旧copy失敗/ABA/note切替/ACK広範囲、P4c新profile ACKは独立U。 |
| P4a-F | 合格 | C displayName/profile OCC同Tx/creator正本・認可return note、T12/8/7、U新本人実名保存と現在著者・旧handle再取得でも著者は元creator。B0〜50cp/unset/deleted/unknownと元共有復帰実UI。 |
| P4a-H | 合格 | C境界/ports/UoW、新0027、D旧共有/全列/trigger/版/objects/charge、T/Bchecks、現bundleUと全停止。秘密helper/key本文や値の証拠化なし。 |
| P4b-A | 合格 | C public selector→独立authority/epoch/browser、content identityはP4b仕様維持。T exportFlow30/current read、U新public実file、B元account/linkの変更外serializer・spool認可対。 |
| P4b-E | 合格 | C nonce Path=/s維持/未発行初回topGET・strict POST・303/current取得、T30に6/30rate・最終slot/nonce競合。U実native4metadataとattachment、B既存account範囲/method/rate全体。 |
| P4b-F | 合格 | C新public no-JS form/script-none/native取得、U実HTML/MD/390/file表示・説明・再POSTなし。T/B旧account/link dirty/ABA/ACK取消を維持、PDF/ZIPは未提供のまま。 |
| P4b-G | 合格 | C publicauthority/Node dispatch/DI/worker/0027、D旧export0/全列/charge/object、T80/120・U同bundlefile・Bchecksと最終指紋/停止。最大資源量を小fixture成功へ拡大しない。 |

### 同wire境界の追加観察

03:32:04の `cursor-boundary.json` は、合法tag50件（各50codepoint、NFDで伸びる音符）＋200codepoint query（NFKCで伸びる文字）で、domain受理/transport conditions受理、初回URL query31920（32768以下）にもかかわらず、cursorが18789（16384超）になることを示す。cursor自体は `publicDiscoverySnapshot.ts` 内のinline JSON生成式をVerifier helperに手製再構成したもの。製品のSQL cursor生成関数を呼び出した結果ではない。製品 `tagName` / `searchQuery` / `NodeTagNormalizer.key` / `publicConditionsSchema.safeParse` を直接呼び、合法値・conditions受理を確認した。03:35追補 `cursor-boundary-wire.json` は同手製cursorを製品 `publicResponseSchema.safeParse` へ渡し、`page.nextCursor` の `too_big` だけで拒否されることを確認する。

単独文字列欄の確認とは別の複合上限である。51一致noteをDBに用意したSQL/HTTP経路は実行していないため、2件目のHTTP再現済み欠陥とは数えない。固定P4c-Gの有限cursorに関する追加観察としてManagerへ通知済み。修正担当は条件identity全文をcursorに含める方式と有限上限の整合を検討し、必要な限定回帰を提案する。新しい受入条件や全repo監査は追加しない。

## 2026-09-20 03:30:54 JST 最終保全・停止

- 03:28:12、自己noteの通常非公開化で親/本文/media/Rangeが404、検索から除外/sitemap leaf404。再publicは03:28:30同canonical200・media203B完全一致・Range206・検索/sitemap復帰。03:28:46通常trashで全4入口410、03:29:06通常undoで同canonical200/media203B完全一致。最後のWS削除後03:29:29は全4入口404、検索/sitemap除外（`lifecycle-*.json`）。通常trash undo成功と、不可逆削除からのbackup復元を混同しない。
- 03:21:27保全済みの新自己WS1/note1/member1/asset203Bと個人icon86Bを通常UI・正規workerで回収した。原本0、計2objects289B物理削除。WS削除・完全回収の通常undo不可、保全コピーからの復元は未実施。自己2account/profile/displayName/session/local確認と自己batch履歴等は残る。旧/main追加profileも保護した。
- 自己browser3session close。PID37297は03:29:47.896 TERM/drain→.902 exit0/systemErrors0、exec session81307終了。PID27882も先の正常exitを回収済み。03:30:53再確認で両PID不在、ports3000/3001・fresh DB/-wal/-shm handles0。server再起動/追加build/lock操作はしない。
- `final/` は03:29:48.412停止下保全。比較03:29:51.679はdriver新copyだけ。旧12objects3107Bのkey/bytes/payload全一致。旧103active notes/111revisions/95heads/9originals/2assets/32tags/9activeWS/15members、旧batch19/48/51の全旧行を保持。旧5account/2publicProfile/3displayName/39session全列欠落0、旧outbox全列欠落0。追加自己batch1/target1/attempt1・purge1・deletedWS1を既存へ混同しない。
- 許容差: FTS物理2表のsegmentのみ自己作成/削除で変化、`fts-final.json` の論理postings8253→8253/欠落0/追加0・integrity正常。note_projections sqlite_sequence145→148、extraction_notices1不変。旧displayName3行はversion12/1/1全保持、旧unset行も維持。主baselineの2profileと本Verifier新2profileがあるため全profile未設定とは主張しない。
- 旧14scope（元12＋主自己account2）容量はすべて一致、provenance違反0。全workspace deletion13/purge14成功、未完object delete0・activewriter0・profileIcon0・export operation/rate/reserved0、FK0/integrity ok。現在public discovery rate3行は自己HTTPの固定窓記録で、期限付き。削除債務と混同せず、rateだけを消すための追加起動をしない。
- 最終HEAD `6e9731c28f65503c424295a112c46811c66c4054`、source970 `378d72a699cdbdda130fe9ca6cd00f487365f13e51afac52e83b0b57dc2cb6a9`、bundle `a095546bf8b6c29c89f71b3e898243a195577c9d70f97bfbe35fbeef43887481`、lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` は03:30:53.822に開始固定値と再一致。製品差0、`git diff --check` 成功。変更は本reviewと新proof helperだけで、管理正本/goalは非変更。

### 借用・未測定・返却

Tの80Nodeはpublication8/profileIcons9/publicReading7/publicDiscovery11/execution3/publicationHttp6/discoveryHttp6/exportFlow30。120pureはprofile12/model+render39/publicHTML69。Bの935unit/475Node/型lint36warning34info/format/build/db差0は現固定source・lock・bundleへ適用し、独立全suiteとはしない。主の修正前bundle5dd9c1ceのWS URL表示は成功根拠に使わず、現a095546bの独立afterで確認した。変更外の旧FD300・巨大batch39MB等は再演しない。

最大800KiB×最大媒体、2GiB消費、native全RAM/OOM、全catalogue原子性、巨大検索SLO、全Markdown閲覧器、外部SEO掲載、他runtime実起動、PDF/ZIP/public一括/退会/Google/Drive/LLMは未測定または後続。小fixtureと既存限定試験の成功をこれらへ拡張しない。外部API/メール送信/課金/公開deploy/Issue/PR/pushは行っていない。旧事故環境/D01は無操作。

環境は正常停止済み。Managerが本報告を受領した時点で所有を返却し、Verifierは文書を含む全操作を停止する。現候補はF/Gの修正と独立再検証が終わるまで受け入れない。

03:38:32 JSTの実時計確認後、Verifierが本報告を全文通読。31条件の重複なし・合格29/不合格2を照合した。停止後の追加確認は上記の非実行環境cursor純粋probeと報告編集のみで、runtime/browser/DB原本/製品の再操作はない。本報告をもって環境所有をManagerへ返却し、文書を含む全操作を停止する。

## 2026-09-20T04:07:06+09:00 — F/G 修正候補の独立再検証開始・進捗

Managerから正式再開・環境単独所有を受け、前回不合格は履歴として保持する。対象はF/Gのみ。他29条件は実差分と依存を確認し、無関係な全面再検証を行わない。goal-implementとmanager-loopを再読、主報告03:52:41/03:59:24節、採用design P4c、固定plan F/Gを照合した。

- commit `a2fe9cf640db58dccfa293fdd56489c4d484198b`、source971 `8737a563cd248f3c629293ab9a9eb2f874067c5343aac9d19dae2c30e48c0dd6`、bundle `645967273932c043ed9e513bddcec2561b68de58a24b16fbe4377319d709be57`、lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` が独立一致。source集約は既知形式をManagerへ確認後04:05:39.717に再現し、推測した別形式の値を不一致とは扱っていない。通常sourceだけ・秘密path guardを通し、製品worktree差0。
- 新0700 proof `/Users/hikaru/.local/share/hollow/verification/p4c-recheck-20260920-wfXWrU`。04:04:02.013停止下start保全、ports/DBsidecar handles空・旧46595不在。12objects3107B、前回同manifest。DB/sidecarはコピーだけをdriverで開く。
- 独立コード確認: 製品差はwire description2400→4000とcursor version1/domain-separated SHA256条件identityだけ。SQL predicate・LIMIT・並び順・認可の二snapshot・URL上限は不変更。sorted deduplicated tag keys/normalized query/scope/zone/from/untilを固定順JSONとしてhashし、strict形状とidentity照合を行う。digestは秘密/署名/認可ではなく条件照合。新boundary test全文も確認した。
- 04:04:02開始の独立再実行は4files27Node成功（7.59秒）。新boundary7＋既存SQL11/HTTP6/actual execution3。実SQLで51一致note×50合法tag、actual worker/HTTPによる50+1・重複なし、next URL有限、別条件/旧形式拒否を含む。これは候補既存試験の独立再実行であり、Verifier新作fixtureとはしない。旧475全Node、修正版全482Nodeの独立全量成功とは扱わない。
- 同bundle runtime PID48997/session61801、04:04:20.719起動。自身の前回accountへ既知helper fillで通常signin、新固有browser `p3c-fresh-p4c-recheck-wfxwru` はrestore missing。新自己WS `01a0bb0f-29de-7599-b355-0d3c12bf4384`、slug `recheck-wfxwru` だけを通常UI作成/公開。新account/profile/note/mediaなし。
- 1201補助文字を通常作成→明示公開→設定reload後、正しい `textarea[name=workspace-description]` が1201cp/2402UTF16完全一致。04:06:02.772 cookieなしChrome HTTPは200/全文一致/Retry-Afterなし。2000へ通常保存→reloadでも2000cp/4000UTF16完全一致、04:06:25.853 HTTP200/全文一致。公開実browser `.pd-description` も2000cp/4000UTF16完全一致・空0件を確認。`http-1201.json` / `http-2000.json`。
- browser close後04:06:56.715 TERM/drain→.722正常exit0/systemErrors0、session回収。04:07:03.477停止下before-delete保全は12objects3107Bで追加物理0B、新WS1/member1/note0。新copy比較04:07:06.140は旧全行欠落0/trigger差0、旧16scope容量一致。既存7accounts/4profiles/5namesは不変更。保全後通常削除・最終比較/停止を残し、この時点では最終受入を申告しない。

## 2026-09-20T04:10:20+09:00 — F/G 独立再検証の最終判定

修正候補 `a2fe9cf640db58dccfa293fdd56489c4d484198b` の **F/G はともに合格**。前候補の不合格を取り消して履歴を消すものではなく、新candidateでの修正確認である。今回の差分から、既受入29条件を追加で再オープンする根拠は認めなかった。

| 条件 | 修正候補の判定 | 独立根拠と借用の境界 |
| --- | --- | --- |
| P4c-F | 合格 | description有限wire上限4000UTF16がdomain2000codepointを含み、保存入力・表示の切詰めがないことを差分/接続sourceで確認。独立27件のうち1200/1201/2000補助文字・BMP2000が実SQL/worker/HTTP200全文一致、2001cpは従来domain拒否。独立新自己WSの通常UIでは1201と2000を保存・正しいtextarea再読込・cookieなしHTTP200全文一致、公開画面は2000全文一致。profile/creator/現在所有/非公開metadata/バナー等は前回独立根拠を保持し、無変更枝を再演していない。 |
| P4c-G | 合格 | 前回手製JSON観察だけだったcursor境界を、新製品boundary testの独立再実行で実SQL生成→actual worker→production HTTPまで確認。合法50tag/正規化で伸びるquery、51一致noteを50+1へ分割し重複なし/total51、実next linkは有限URL上界内・両応答200。別scope/query/tag/zone/from/until・旧形式/version/identity拒否を確認。新identityはdomain-separated SHA256/64hex、version1 strict、現在公開predicateは不変更。既存SQL11/HTTP6/execution3も独立成功。前回独立検索/失効と主担当rate/queue/current二snapshot等の変更外根拠を維持。 |

再実行コマンドはrepo rootで `pnpm exec vitest run --config vitest.config.integration.node.ts` に次の4fileを明示したもの。

- `apps/web/app/worker/node/__tests__/publicDiscoveryBoundary.integration.test.ts`
- `apps/web/app/worker/node/__tests__/publicDiscoveryHttp.integration.test.ts`
- `packages/core/src/adapters/libsql/__tests__/publicDiscovery.integration.test.ts`
- `packages/core/src/adapters/node/__tests__/publicDiscoveryExecution.integration.test.ts`

試験のfixtureは製品testが新temp DBと新worker bundleを専用生成し、afterEachでexecution.stop/client.close、afterAllで専用tempを回収する。freshへ51noteや50tagを追加していない。HTTPテストはproduction handlerをRequestで呼ぶ隔離対であり、51noteをfresh実browserで閲覧した対とは区別する。独立実browserは上記同production bundleの0note新WSである。

### 最新保全と環境返却

- startのDB/WAL/SHMは主fix proof finalとのbyte一致を独立確認し、双方のsole保全をdriver-openしていない。比較は新proof内の `compare-before-delete` / `compare-final` へさらにコピーしたDB/sidecarsだけ。
- 04:07:48.195に同bundle PID51293/session51902を起動。自身の同固有browser sessionだけを再open（ここでは自身の保存stateをrestore loaded）、自己WS一般設定→通常削除確認へ進み、対象名 `Recheck wfXWrU` を完全一致で入力して確定。04:09:13前に個人notesへ戻り「回収が完了」を確認。既存/main/前回Verifierのaccount/profile/WS/memberは変更しない。
- 削除対象は今回新WS1・そのmember1、note0/original0/asset0/icon0/object0B。04:07:03.477の削除前保全は保持。アプリの通常undo不可、backupからの復元は未実施。物理ファイル削除は0件0Bであり、前回の289B回収と混同しない。
- 自分のbrowser close→04:09:13.086 TERM/drain→.091正常exit0/systemErrors0、session51902回収。最初の48997も正常exit0回収済み。04:09:40時点で両PID不在、ports3000/3001・fresh DB/WAL/SHM handles空。最終runtime停止後にbuild/起動/lock操作をしていない。
- `final/` は04:09:13.442停止下保全、`comparison-final.json` は04:09:16.120。旧72表555列の旧全行/全列欠落0、旧82trigger本文差0、FK0/integrity ok。旧7accounts/4publicProfiles/5displayNames/103active notes/111revisions/95heads/32tags/9originals/2assets/9activeWS/15members/batch20/49/52を保持。profile/name版と旧outbox全列にも変更なし。
- 意図した追加差は通常本人signinのsession42→43、今回の縮小deleted行追加によるworkspaces総数23→24（active9不変、deleted14→15）、deletion/receipt14→15の各1だけ。全15WS deletion成功・14note purge成功、未完deletion/purge0・activewriter0・export operation/rate/reserved0・public discovery rate0。rateを消す目的の追加起動は行っていない。
- 旧12objects3107Bはkey/bytes/payload全一致。旧16scope容量（personal7＋activeWS9）全一致・provenance違反0。`fts-final.json` 04:09:40.144はlogical postings8253/欠落0/追加0、integrity正常、旧outbox processed遷移0、name版12/1/1/1/1保持、note sequence148とextraction sequence1不変。今回はFTS物理表も旧全行を保持した。
- 04:09:40.446最終照合: commit `a2fe9cf640db58dccfa293fdd56489c4d484198b`、source971 `8737a563cd248f3c629293ab9a9eb2f874067c5343aac9d19dae2c30e48c0dd6`、bundle `645967273932c043ed9e513bddcec2561b68de58a24b16fbe4377319d709be57`、lock `ffced3cf47c7dd36738306d86cc87c8cf30970408599469bd097579a3022870a` が開始固定値と一致。製品worktree clean、管理 `.goal-implement/` だけ未追跡、`git diff --check` 成功。製品・管理正本は非変更。

### 根拠の適用範囲

修正candidateの935unit/型/lint36warning34info/format/build/db差0は主担当借用、独立実行は上記27Nodeと同bundleの新UI/HTTP・保全比較。旧全475Nodeは前candidateの借用であり、修正版全482Nodeを実行したという主張はしない。他29条件は前回独立合格と変更外根拠を維持し、この二つの有限境界修正で認可・所有・DB schema・export serializer・資源所有・UI状態機械を変更していないことを差分で照合した。

最大DB規模/SLO・全catalogue原子性・全最大media/RAM/OOM・全MD閲覧器・外部検索掲載・他runtime実稼働・PDF/ZIP/一括public/退会/Google/Drive/LLM等の前回未測定・後続区分は維持する。未測定を今回の小隔離fixture成功で埋めない。秘密/helper本文・credential/key/private値・cookie/token/password・rawlog/HAR・旧事故環境/D01への操作なし、外部送信/課金/deploy/Issue/PR/pushなし。

F/Gに残る既知欠陥・必須未検証はない。Managerによる受入判断へ返す。以下の最終通読をもって環境所有を返却し、文書・読取を含む全操作を停止する。

2026-09-20T04:11:53+09:00 の実時計確認時に今回追記を全文通読した。対象F/G・借用区分・全停止・保全と旧行保持・前回不合格履歴を照合し、workspaces総数とdeleted数の表現だけを明確化した。本記録をもって正式返却・文書込み全停止とする。
