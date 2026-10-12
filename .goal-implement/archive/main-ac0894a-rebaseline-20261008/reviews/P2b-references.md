# P2b-C 独立検証

## 結論

P2b-C は不合格。V1〜V4 の修正が必要。安全取得、描画隔離、認可、同梱取込、通常の既取得再利用、退避復元、再起動後の保持には独立した成功根拠がある。これらを不具合の再現と分けて保持する。

- V1: 取得済み200件の先頭に新規参照を追加すると、現在の取得済み集合が201件になる。
- V2: 取得CSSの背景/font依存が恒久台帳と件数表示から欠落する。inline CSSの内部/未解決参照は安全に停止するが、理由が「外部サービスから表示」と誤表示される。
- V3: 取得済みstylesheetを本文から除去してから再追加すると、CSSが空のまま取得済みとなり、再取得jobも作られない。
- V4: SVG安全化後のbytes増加を追加予約せず成功し、正規の他upload予約と合計して個人5GiBを超過する。

独立実行は既存focused 72件成功、新規独立ケース2件成功・4件失敗。失敗を再現できたことを安全合格件数に数えていない。全体の最終受け入れと修正委譲はManagerが判断する。本報告はP2b-D/P2c以降の完了を示さない。

## 時刻と固定対象

- 検証開始: 2026-09-06 08:57:28 JST。
- 開始fingerprint照合: 09:02:38 JST。終了照合・専用browser終了: 09:35:38 JST。
- 報告整理時のclock: 2026-09-06 09:40:42 JST（UTC 00:40:42）。
- HEAD: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。
- 実ファイル518件、開始/終了SHA256とも `2fcdb382a1e07761d3aee209a54e038203b66d496b2dd8f236f75ca0e57508da`。
- lock SHA256: `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`。
- 算出: tracked + untracked、重複排除・path順、実ファイルのみ、`.goal-implement/`を除外し、各path + NUL + bytes + NULを連結。
- アプリとVitestはNode 22.22.3。Node 24.19.0はbrowser CLI・hash・HTTP補助だけに使用。補助runtimeの成功をNode22アプリの代用とはしていない。

実装報告 `phases/P2b-references.md` 全文、brief、planの対象条件と四範囲、designのP2b契約、IM-01〜05、ED-03、JB-01〜03、既存独立prep/表示境界/媒体レビューを照合した。前候補489件 `deb0ae0…` からの共有変更は契約・現コード・実装報告で照合した。前候補の全ファイル別manifestは持っていないため、489件すべてのbyte差分監査とはしない。

## 項目別判定

| ID | 判定 | 今回の独立根拠・影響範囲 |
| --- | --- | --- |
| P2b-C | 不合格 | 四範囲を確認。安全取得/同梱役割/認可/遅いcommit拒否は成功。現在件数V1、依存台帳V2、CSS再挿入V3、容量V4が不足 |
| P1-B | 合格維持 | 白紙離脱で空noteなし、画像のみ自動保存、通信abort時の退避→再読込→復元→保存を本体UIで成功。既存の破棄/未保存離脱等は旧合格を保持 |
| P1-C | 不合格（共有CSS保存） | 初回完成srcdoc、リンク無効化、アプリ隔離、preview metadata制御は成功。HTML編集からのCSS除去・再挿入でV3。依存案内はV2 |
| P1-D | 合格維持 | 現在ref/本人認可を実DBとHTTPで再確認。旧確定draft回避修正のassets回帰成功。実process再起動で本文/asset保持 |
| P1-E | 合格維持 | css-tree runtime外部化/依存を確認しNode22 production再起動後にCSS処理成功。mobile表示を自ら確認。全規定checks/buildは固定候補の実装報告を適用 |
| P2a-A | 合格維持 | 共有admissionの既存無signal利用・mediaとの枠解放をfocusedで再実行。無変更の実形式抽出/出所/破損判定は受入済み根拠を保持 |
| P2a-B | 不合格影響（参照結果・容量） | HTML/MD単体と同梱取込、原本・本文保持は成功。取込後の参照CSS再保存V3、生成assetの共有容量V4に影響。基本のtext変換まで不合格としない |
| P2a-D | 不合格（個人合算容量） | V4で実upload予約と生成assetが5GiB超過。その他の100件/500MiB/形式上限・混在部分成功は既存根拠を保持 |
| P2a-E | 合格維持 | 本人job/恒久台帳の分離、取消、retry/claim、90日削除後の台帳保持を実DB回帰。V2は参照依存情報の不足であり履歴90日契約の失敗とは分ける |
| P2a-F | 不合格影響（共有参照worker容量commit） | claim/lease/version/権限・起動回復の根拠は成功。V4の条件不足で参照workerが容量超過を成功commitする。一般の取りこぼし/二重反映を観測したわけではない |
| P2b-A | 合格維持 | SVG/画像表示、隔離、GET/HEAD/Rangeと認可先行、metadata欠落fallback、実redirect先403。既存の動画seek/別利用者browser根拠を保持 |
| P2b-B | 不合格影響（共有asset容量） | 画像only draft→stable保存・両表示経路・退避復元は成功。V4の変換後bytes/予約境界が共通asset容量保証を破る。直接手動挿入の同じ超過経路を別途再現したとはしない |

P2a-B/F・P2b-Bの差戻し影響は共有参照assetの容量境界に限定する。既存の独立合格を破棄して全機能を未検証へ戻すものではない。

## 必須修正

### V1 — 現在取得済み集合の200件上限が追加順序に依存

対象: P2b-C / IM-05、ED-03。主なコードは `packages/core/src/application/reference/schedule.ts`。

独立の実libSQL・実object storage・本体usecaseで次を実行した。ネットワークのみ小さいCSSを返す注入fetcherを用い、実サービスには送信していない。

1. stylesheet 200本の通常HTMLを保存し、参照workerを実行する。200本が取得済みになる。
2. そのHTMLの先頭に新しいstylesheet 1本を追加し、取得onで通常保存する。
3. workerを実行すると新規1本を取得し、現在の取得済みが201件になる。

期待は既存200件を保持し、新規分だけを未試行・上限理由付きとし、追加取得しないこと。現在の実装は出現順の `++index > 200` より既存acquiredを優先するため、新規が先頭枠を使い、後方に押し出された既取得も保持される。

最初の探索では200行seedで再現したが、最終根拠はseedを使わず「通常保存→200成功→先頭追加」で到達している。新規を前後どちらに置くかで契約が変わってはならない。過去履歴を200件で切ることや、既取得assetの追い出しは修正要求ではない。

100MiBについてはworker開始時に現在acquired bytesを合算しており、同じ並び順だけでの迂回はコード検査では見つからなかった。100MiB境界の実再現はしていない。V4の変換後bytes差分という別の不足は残る。

### V2 — CSS依存の欠落と安全停止理由の誤表示

対象: P2b-C / IM-05、ED-03。主なコードは `application/reference/processJob.ts`、`schedule.ts`、描画検査からの投影と `ReferenceLedger.tsx`。

取得CSSには背景/fontを取得せず解決済みURL・外部依存を保持する契約がある。背景/fontを新たな媒体fetch対象や200件課金対象へ増やす要求ではない。

取得CSSの再現:

- 独立同梱bundleを本体UIで取り込み、CSS内の公開SVG背景が実際に表示された。fontにも元の外部URLが残り、iframeのCSS resourceとして参照された。
- note `01a0740b-8f4a-70b4-9658-60174177d730` のUIは現在8件・取得済み3件・未取得5件・外部依存0件。DBにも取得後CSSから見つかった背景/fontのcurrent行がない。再読込後も同じ。
- workerは取得CSSをHTMLへ反映するが、そこで得たprepared candidatesを恒久current台帳へ反映していない。新規独立testもこの欠落で失敗した。

内部/未解決inline CSSの再現:

- note `01a0740f-bfb4-74df-b3c7-66a071ce6b66` に既知loopback URLと `../missing.svg` のbackgroundを含めた。
- 描画後は対象宣言が除去され、該当resourceは発生しない。安全な描画停止自体は合格。
- UIとDBのreasonは両方「背景画像・フォントは外部サービスから表示します。」。内部拒否・基準URL未解決の状態を伝えていない。

修正条件は、取得対象外の外部依存を取得済み/未試行/取得失敗の媒体と分け、耐久的なURL・分類・正しい停止理由をUIへ反映すること。前者はdurable行そのものの欠落、後者はURLを保持しているがreasonが誤っている点を区別する。

### V3 — 除去したstylesheetの再追加が空の取得済みになる

対象: P2b-C、P1-C / IM-05、ED-03。主なコードは `application/reference/reuse.ts` と `schedule.ts`。

独立DB testと本体HTML編集の両方で確認した。

1. 取得onで外部stylesheetを取り込み、本文にCSSが埋め込まれていることを確認する。
2. HTML編集でstylesheet参照を除去して保存する。
3. 元のstylesheet参照を再挿入し、取得onで保存する。

実際は空の `style[data-hollow-stylesheet]` となり、台帳は取得済みのまま、参照jobは作られない。本体の上記off/on試験noteではnormalizeの元bytes 6138、通常の埋込CSSは1764文字だった。再挿入後はCSS 0文字、jobは初回の1件のみ、UIは「取得済み 6.0 KB」と表示した。詳細SPAとpreviewの両方でCSSがなく、本文marginもnormalize適用時と異なる。

現在本文のCSSを読むreuseと、過去のacquired行を再利用可能とするscheduleが一致していない。利用可能な現在snapshotがなければ再取得可能な未取得状態に戻す必要がある。恒久的な過去CSS snapshot保存を新しい必須条件にはしない。

正常対として、現在本文にCSSが存在するときの旧raw HTML再保存はCSS 1764文字と既存PNGを保持し、追加job/assetを作らなかった。この「通常の既取得再利用は再取得0」を修正後も維持する。

### V4 — SVG安全化後のbytes増加で合算予約を超える

対象: P2b-C、P2a-D。共有asset/quota境界としてP2b-B・P2a-B/Fに影響。主なコードは `application/reference/processJob.ts` の予約、SVG置換、commit、used加算。

独立の正常SVG 482 bytesは実安全化後520 bytesになる。本体の正常同梱表示でもこの差を観測した。容量境界の再現は隔離DB/storageだけで行い、本体の容量や既存データを変更していない。

- 本体 `beginUpload` APIを用い、13 batch・26件の正規音声upload予約を作った。各ファイル200MiB以下、各batchは400MiB以下。合計は5GiB−482 bytes。
- 小さいSVG参照の通常保存→workerを実行した。fetchだけを固定482 bytesへ注入し、実InlineMediaProcessorと実FileObjectStorageを使った。
- 520 bytesの安全化SVGがacquiredとして保存され、`storageUsage` は5GiBの5368709120に対し5368709158、38 bytes超過した。

予約metadataのDB直接seedや大量の実bytes生成は使っていない。予約自体が容量に含まれる契約を、通常のAPIと変換処理で破っている。

現在は元bytesの予約/書込制限後に安全化SVGへ置き換える際、accepted bytes増加分の追加予約を取得しない。さらにjob内used加算が元bytesのため100MiB側にも同じ過小評価が影響する。100MiB境界はコード影響のみで、実境界再現とはしない。

変換後accepted bytesを保存前/commit前に再評価し、必要な追加予約を競合安全に取得するか、拒否してcleanupすることが必要。元bytesを過小計上したまま成功してはならない。全codec decodeやOS hardRSSの追加試験はこの修正条件に含めない。

## 独立コマンドと適用範囲

以下はNode22のrepo Vitestを、`--maxWorkers=1` で実行した。無関係な全parser負荷や全unitは再実行していない。

| JST | 実行 | 結果と主な範囲 |
| --- | --- | --- |
| 09:03:54 | integration configで `references.integration.test.ts` と `assets.integration.test.ts` | 25成功。参照14・asset11。実DB/storage、現在ref、認可、不可逆確定、再添付、予約/回収、companion、claim/遅いcommit、取消、台帳/履歴 |
| 09:06:32 | `safeFetcher.test.ts`、`referenceProcessor.test.ts`、`resourceRequestGuard.node.test.ts`、`externalReading.test.ts`、`staticAssets.node.test.ts` | 45成功。socket/TLS・CSS集合/CG1・root/AST budget・表示metadata/入口guard |
| 09:11:08 | documentExtractor/mediaValidatorを `-t 'admission|releases'` | 2成功・69skip。既存無signal呼出と共有枠解放。全形式の再検証ではない |
| 09:25:12 | temp `independent.test.ts` の当時5ケース | 2成功・3失敗。権限変化commit拒否、最大claim拒否が成功。V1/V2/V3が失敗 |
| 09:34:02 | 同tempへ追加したケースを `-t 'SVG expansion'` | 1失敗・5skip。V4。最終6ケースを一括再実行したとはしない |

Vitest入口は `node_modules/vitest/vitest.mjs`。integrationには `--config vitest.config.integration.node.ts`、追加ケースには `--config /tmp/hollow-p2b-reference-verify.Butwfg/vitest.config.mts` を指定した。追加testの最終SHA256は `9cfbb235cf207f79744dfd23c721622e1f0275b33281c6ae30438dad6cbd8f62`（9182 bytes）。途中のtemp config解決/構文ミスは修正してから本試験を実行し、製品不具合や合格件数には含めていない。

独立新規の成功2件は、versionを変えずに現在の所有/権限を変更した遅いworkerのcommit拒否とcleanup、lease失効後の第4claimでfetchせず3回上限理由となること。自己隔離DBだけで実行した。

### 安全取得・workerの根拠の限界

- safeFetcher testは実HTTP/TLS socketを使うが、公開IP宛の接続をtest transportでloopback listenerへ対応させる。lookup pin、Host/SNI、証明書不一致拒否、redirect再検査、private混在・実bytes・cancelを検証する根拠であり、本番allowPrivateではない。productionにその許可はない。
- 30秒/5秒などのdeadline testはfake clockを含む。実時間を超過する負荷試験としては数えない。SVG/画像/公開CSSの本体取得は別の実通信根拠。
- 実DBの同時claimは同じserialized resource上の並行呼出。二つのOS processを独立起動した試験とはしない。
- 正常取得の途中取消は、今回再実行したDB testで「現在1件成功asset保持→残り取消→job failureなし」を確認した。実装者の取消UI試験はJSONの形式失敗を保持したケースであり、正常取得成功のbrowser根拠と混同しない。今回同じ正常取消を本体UIで再演していない。
- queue/boot/期限切れclaim/5分起点/90日job削除後の台帳は実DB回帰を適用。今回の本体再起動時はactive job 0で、実行中job回復は実装者の報告を借用する。

## 本体ブラウザ・HTTPで確認したこと

### 同梱取込、CSS、on/off

独立5ファイルをUIで選択し、HTMLとMarkdownをsource、別dirのCSS 2件とSVGをcompanionにした。5ファイルから2 note、3 companionをDBでも確認した。bundle内に収まる `../` は解決し、root外escape/不足参照は失敗理由を残した。同じSVGを2 noteで使うとassetは別々になり、同note内重複は増殖しない。曖昧path・seal・失敗兄弟と孤立bundle回収は独立再実行したDB testを適用する。

実iframeで通常grid/flex/color var、有限absolute配置を保持し、同一要素split、important、CG1の小数/符号付きzero/同値viewport、inlineとの合成による全面配置を除去した。root未知構文/AST budgetは実DOM/style属性を通すfocused testも成功。小さい親のinset-zero caption等を保守的に失う既知subsetのassertは互換性損失の記録であり、完全cascadeやpixel再現性の合格証明ではない。

初期offでは公開画像を外部直読し、stylesheetは空、台帳はoffの未試行理由を表示。onで公開PNGとnormalizeを取得し、内部asset/埋込CSSへ変わった。CSS失敗は空style、画像失敗は元公開URLを保持する差も確認した。V2の背景/fontと拒否理由、V3の除去後再追加はこの通常成功と分ける。

### 初回preview・リンク・metadata

初回の完成srcdocでcanonical HTMLと描画用HTMLが分離され、元のlinkは保存用sourceに残るが描画ではhrefを持たない要素になる。実左click・Enter・middle buttonを行い、親markerとURL、frameの `about:srcdoc` が変わらないことを確認した。

自分tabのpreview要求を一時的にメモリ内で捕捉し、同じ本体render入口へmetadataあり/なしを送った。欠落時は本文と許可された内部画像を保持し、外部画像を止めてnoticeを返す。正常same-origin metadataでは内部/外部を表示する。wrapperは復元し、秘密値・cookie・要求bodyをファイルへ保存していない。

### 認可とredirect

自身の現在PNGに本体HTTPでGET 200、HEAD 200、Range 206、範囲外416を確認した。same-site/cross-site/欠落Siteのimage用途は403、cross-site不正Rangeは403でContent-Rangeなし、匿名不正Rangeは401で認可先行。document用途のRangeは正常。通常SSR/SPAは動き、非asset動的pathのimage/fontと未知staticは403。

実browserで公開redirect URLから本体signinと別noteの保護assetへ遷移する画像を読み込んだ。直接の現在assetは200、redirect後のsignin/別note assetは403だった。HTTP到達は発生しており、「CSPで送信0」とはしない。既存guard unitのhandler counter 0は入口順序の別根拠で、production業務counterをinstrumentしたとはしない。

status取得用の一時HARはresponse contentなしで扱い、必要なstatusだけ抽出して削除した。HARで省略されたSec/Cookie項目を「ブラウザが送らなかった」と解釈しない。Fetch Metadataのredirect chain semanticsは既存一次資料レビュー、実装者の別gate、今回の実browser statusを分けて適用する。外部redirect fixtureは試験後の本文から除去済み。

### 白紙media・退避・mobile・再起動

- 白紙WYSIWYGから無入力で一覧へ戻り、note数348のままで空noteなし。
- 正常SVGのみ挿入して無題が自動保存され、stable note URLと確定assetへ移行。画像natural width 270を確認。
- 自分browserのserverFnだけをabortし、タイトル変更で未保存/再試行/退避を表示。routeを解除して再読込すると復元操作が出て、復元後にタイトル・SVGを保存、backupは0件になった。
- 390px mobileで親scroll width 390、iframe幅350、台帳URLは折り返し、画像と編集導線を確認した。
- active参照/変換job 0を確認して既知production PIDだけを停止・同設定で再起動。上記画像noteと同梱CSS noteを再表示し、SVG・タイトル・grid/CSSが残った。

確認画像は `bundle-css.png`、`mobile-ledger.png`、`restarted-media-mobile.png` 等をVerifier自身が画像ツールで開いた。正常SVGのgradient/clipPath、白い山・黄色い円、局所配置、実背景画像、mobileの折返しと保存後画像を確認した。fixtureの有限absolute配置による局所重なりや全面寸法除去後の余白をアプリUIへの侵入と混同していない。画像をManagerに判断委譲していない。

## 保存状態と独立fixture

派生fixtureと追加検査は `/tmp/hollow-p2b-reference-verify.Butwfg`。元の独立prep `/tmp/hollow-p2b-reference-prep.1Ccimv` は変更していない。手書き入力は独立synthetic/CC0。placeholder `.invalid` は送信せず、公開の小さい固定入力を使う派生copyにした。

| 派生入力 | bytes | SHA256 |
| --- | ---: | --- |
| main.html | 1501 | `70a82321a74a30305a189a6c94a3dd8734446c827a2966e64e203fe50b64c919` |
| notes.md | 375 | `95a89a2fb4f5f63feda034799675a4ffc503d7af950453ad3ed3d7fe40211a03` |
| main.css | 841 | `7cae029fe80d2448e6ba63db0944dc575cca0aa0a05869033aeb6d8bf6aabb2c` |
| accent.css | 370 | `400d06cede7d6acc8a3302d0403dc58d0264ed0bc300a80f3944d7b0ca475d28` |
| safe.svg | 482 | `9d0f19525d8ee5baf630ebae3879a866b3fd5ead7e0a7d10f9517706d691b642` |
| off.html | 552 | `c1a301d68873e509429b0bbe7363ccd40fc2af0fea2a8e9c9cf6c99cc5ba967d` |

公開PNGはlibpng v1.6.50の `pngtest.png`（PNG Reference Library license）、実保存8831 bytes、SHA256 `b7a468324556bf6924058acb0fb477320355da0d864728e614be83ffa6966148` を確認した。背景はTabler v3.31.0 `photo.svg`（MIT）、stylesheetはnormalize.css 8.0.1（MIT）。公開出所/license記録は既存fixture報告を適用し、今回未再取得のsource hashを独立照合済みとはしない。MDN CC0 flower動画は既存の固定fixture/実seek根拠を保持し、今回全codec/動画seekを繰り返していない。

本体に追加した自己試験note:

- HTML bundle: `01a0740b-8f4a-70b4-9658-60174177d730`。
- Markdown bundle: `01a0740b-9005-778b-9fde-7579734ca8de`。
- on/off・V2/V3: `01a0740f-bfb4-74df-b3c7-66a071ce6b66`。
- 画像only・退避復元: `01a0741c-5e89-749b-95bb-ba762b27fc9b`、タイトル `P2b-C退避回帰`。

最終349 notes/28 assets、開始345/24から自己試験4/4を追加。自己asset 4/4、原本3/3、companion 3/3について実保存bytes/hashとDBが一致した。`pre-references-final-backup.db` の旧337 notes/15 assetsとの比較は、note欠落/本文・title・version変更0、asset欠落/bytes・sha・object key変更0。integrity_check正常、FK違反0。旧全storageの再hashではない。

## 借用根拠と未実行

固定候補の実装報告にある最終unit257、Node87、typecheck/lint/format/build成功を借用する。独立72件はその変更リスクに絞った再実行であり、全件を自分で再実行したとはしない。css-tree 3.2.1のSSR外部化・web runtime依存を読み、今回Node22 startと実CSS処理を確認したがbuildは独立再実行していない。

以前の並列build/parser実行に伴うVitest 5秒timeoutと、その後のserial成功は実装報告どおり区別する。今回、製品30秒deadline失敗や枠未解放を観測したわけではない。

現在候補で別accountの専用browser操作、全Office/PDF/media codec、100 PDF負荷、実行中の正常取得取消UI、二OS process同時claimを再演していない。既存受入済みbrowser/抽出根拠と今回の実DB/worker focused根拠を適用する。未知/欠落metadataを同等に安全な外部表示と保証せず、欠落時外部停止を確認した。公開/exportの政策、全browser/全IP分類/完全CSS意味解析は後続または非要求の範囲とする。

## 環境引き継ぎ

コード・依存・設定・全体管理文書は変更していない。終了hash一致後の変更はこの独立報告だけ。`manual-test`の操作/証拠整理と`markdown-style`を使用し、Manager指示に従い外部Issue起票・global cleanup・追加agentは行っていない。

- 旧production session57043/PID8248は永続化確認のため停止した。
- 現在productionは **session38585 / PID10535**、Node22.22.3、`http://localhost:3000` で稼働を保持。
- storage: `/tmp/hollow-p2.sj33Bk/originals`。
- mailbox: `/tmp/hollow-p1-S1piZT/mailbox`。
- 同じDATABASE_URL、APP_URL、local mail、storage、HOSTNAME 127.0.0.1/PORT 3000で `pnpm start` を再実行した。秘密値は報告/出力していない。
- 専用browser `p2b-reference-independent` は09:35:38 JSTにclose成功。自己route interception解除済み、preview wrapper復元済み、一時HAR削除・不存在確認済み。
- 自己test listener/検査execは完了。意図的に残すのは上記productionだけ。別focus-debug/browser/processには触れていない。
- 自己試験4 note、固定fixture、追加test、画像を再検証用に保持。既存note/object/backupは削除していない。

本報告をもってコード/環境/browser操作を停止し、所有をManagerへ返却する。修正後はV1〜V4とその正常対・共有容量/参照保存の影響に絞って再検証できる。

## V1〜V4 revision 独立再検証 — 2026-09-06 10:31 JST

本節が修正候補の最新判定。上記の旧候補の不合格・試験・画像・hashはそのまま保持する。

V1〜V4は合格。V3には旧base付き空CSSの自動未修復という限定的な移行制限があり、以下の条件でManagerが採用した。別件V5をHTML/WYSIWYGの本体で確定し、P1-Bは不合格。V5を理由に参照取り込みP2b-C全体を不合格へ連動させない。

### 固定対象・実行

- 開始clock: 2026-09-06 10:18:07 JST。開始hash出力の時刻: 10:19:44.999 JST。
- 終了hash: 10:31:06.158 JST。報告整理clock: 10:31:17 JST。
- HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、519 files、開始/終了とも `7aad4d35f5077614c4eebf22f9773468707bde3e3242e2f6773df03bf52bfca7`。
- lock `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`。前節と同じ算出定義。依存/schema/migration変更なし。
- 実装報告の「V1–V4 revision — 2026-09-06 10:15 JST」を全文読んだ。schedule/reuse/dependencies/processJob、保存・import/control接続、processor snapshot、optional signal、renderNote呼出、共通editorの保存移行をコードで確認した。
- Node22のhashとNode24 browser補助が最初に無出力session化したが、3010/16612を回収して両方正常終了。同じ起動を重ねず、待ち中は読取だけを進めた。OS/process一覧診断は行っていない。

| 開始JST | 独立再実行 | 結果 |
| --- | --- | --- |
| 10:20:43 | 旧独立6ケースの派生copy、temp Vitest config、Node22、1 worker | 6成功、3.03秒 |
| 10:21:09 | `references.integration.test.ts`、Node integration config、Node22、1 worker | 21成功、8.62秒 |
| 10:21:52 | `safeFetcher.test.ts`、`referenceProcessor.test.ts`、`externalReading.test.ts`、Node22、1 worker | 43成功、1.59秒 |

独立自動試験は合計70件成功。V5のbrowser不合格をこの件数に含めない。規定checks/build、全unit258/Node94は固定候補の実装報告を借用し、全件を独立再実行したとはしない。以前の安全取得/認可/全形式/隔離等の成功は無変更範囲に適用する。

旧 `/tmp/hollow-p2b-reference-verify.Butwfg/independent.test.ts` は変更していない。派生先は `/tmp/hollow-reference-reverify.e1grfM/independent.test.ts`。新たに必須利用されるfetcher `inspectMany` の公開URL応答stubを加え、V1修正でjobが作られない正常時に `runReferenceJob(null)` を呼ばないようrunnerを適応した。旧6ケースの期待値は弱めていない。stubの公開判定は実DNS検証ではなく、実fetcherの43件と分ける。

### 修正の判定と正常対

| 対象 | 判定 | 独立根拠 |
| --- | --- | --- |
| V1 / P2b-C | 合格 | 旧の通常200取得→先頭追加が200維持。実DB21件で前後追加/重複/背景依存を除いた残枠、除去後の枠復帰、CSS/image混在を確認。既取得を追い出さない |
| V2 / P2b-C、P1-C | 合格 | CSS取得後の依存をguard付きcommitへ同期。公開依存の前回確認と描画時再評価、内部/未解決理由を本体UI・DB・再読込で確認 |
| V3 / P2b-C、P1-C、P2a-B | 合格・移行制限あり | 現在snapshotがある旧raw再保存は追加jobなし。除去→再追加は未取得からjobを作りCSSを復元。コメントのみ空CSSは実DB正常対で追加取得なし。旧base付き不良状態の扱いは次節 |
| V4 / P2b-C、P2a-D/B/F、P2b-B | 合格 | 正規5GiB−482予約＋実482→520B処理で超過成功を拒否。追加予約競合、削除失敗時予約保持と実cleanup後解放、accepted bytesの次remainingを実DB/storageで確認 |
| P2b-Aの共通URL検査 | 合格 | renderNoteは引き続きsignal省略、参照worker依存検査だけcaller signal。undefinedの通常DNS、既知private拒否、metadata判定、caller abort後lookup追加なしをfocused再実行。実preview/詳細でも公開背景を残しprivate/relativeを停止 |
| P1-Bの新規保存移行 | 不合格 | V5。HTML/WYSIWYG共通の保存応答後の入力がroute移行で画面から消え、空の保存済みになる |

V4の100MiBは巨大fixtureでの実超過試験ではない。実SVG520 bytesがledger/asset/storage/usageに一致し、次の取得へ `100MiB−520` が渡ることを確認した。上限ちょうど成功・38 bytes超過拒否は純粋境界関数のassert。5GiB側は正規 `beginUpload` 26件の予約と実storageで確認した。2 workerの追加予約は同process・共有DB/UoWで競合させ、一方だけ成功。2 OS process試験とはしない。削除失敗で原本482 bytes・予約を保持し、新規1 byteの入口が `IMPORT_QUOTA`、11分後の実削除後に解放する正常対も再実行した。

新規依存検査はI/OをUoW外に置き、保存/import/control/workerの各commitで現在認可・必要な元版/leaseを再確認する。前回の理由は永続的な表示許可ではない。`renderNote` は毎回URLを検査し、metadata不足では外部停止する既存契約を維持している。今回新たに全認可HTTP/Rangeや実redirectを反復してはいない。

### V2/V3 本体操作

旧独立HTML bundle `01a0740b-8f4a-70b4-9658-60174177d730` をUIでoff→on→再読込した。現在10/取得済み3/未取得5/外部依存2となり、CSS内Tabler背景とfontの2 URLがbytes0の恒久依存としてDB/UIに現れた。理由は「前回の確認では公開接続先」「表示時にも安全性を確認」。実iframeのbackgroundは公開URLを保持する。fontの読込成功を保証する文言ではなく、今回もfont payloadの成功を主張しない。

旧off/on note `01a0740f-bfb4-74df-b3c7-66a071ce6b66` のHTML保存後、内部backgroundと未解決 `../` は別々の停止理由へ更新された。iframeでは両方background none、再読込後のUIにも「内部・特殊ネットワーク」「公開URLの基準を解決できない」が残る。現在4/取得済み2/未取得0/外部依存2。依存を追加取得せず、PNG assetは `01a07410-a2da-74ab-8d2e-5584b2a24543` を保持した。

V3はこの自己noteで次の対を確認した。

1. 旧base付き空状態から、stylesheetをHTMLで完全除去して保存。current stylesheet 0。
2. 元raw linkを再追加on保存。job1→2、normalize取得6138 bytes、適用CSS1764文字、body margin 0、PNG natural width 91を復元。
3. 現在CSSがある状態で元raw HTMLを再保存。job2のまま、CSS1764文字/PNG同assetを保持。
4. 正常CSSからもう一度除去→再追加。job2→3、CSS1764文字を復元し、現在候補の通常lifecycleで再発しない。
5. 完了操作のSPA詳細→再読込→390px mobileでもCSS/PNGを保持。

`revision-css-mobile.png` をVerifier自身が開き、本文見出し・PNG・inert link・編集導線を確認した。親scroll widthは390でviewportと一致。コード/画像の判断をManagerへ委譲していない。

### V3 移行制限の訂正

実装報告の「旧候補の空placeholder＋acquiredを回復」は、base属性がない旧空markerに限定して受け入れる。今回の旧実不良noteには `data-hollow-stylesheet-base` 付きの空styleとacquired6138 bytesが残っていた。開始時version8、元raw HTML再保存後version9でもCSS0/job1のままで、自動修復されなかった。

この外形は正常な空stylesheetや利用者が空へ編集したCSSとも区別できない。Managerは「base付き空は自動推測で修復せず、明示除去保存→元link再追加で回復できる移行制限」として採用した。前節の実UI回復と正常な空CSSの非ループを両方確認した。自動修復済みとは記録せず、既存全noteのHTMLを一括変更していない。追加の恒久CSS snapshot/migrationを今回の必須条件にしない。

### V5 — 新規保存応答後の追加入力をroute移行が落とす

対象: P1-B / ED-01、07、08。HTMLとWYSIWYG共通。`apps/web/app/components/hollow/NoteEditor.tsx:263` で算出した `unchanged` を、284行の `await router.invalidate()` 後も再評価せず286行からnavigate条件に使っている。入力欄は保存中も編集可能。新routeは保存済みの空本文を読み込んで別のNoteEditorをmountする。

再現は `/tmp/hollow-reference-reverify.e1grfM/race.cjs`。アプリコードは変更していない。自分tabの `window.fetch` だけで、タイトル保存応答直後の次のserverFn GET応答を保留した。最大12秒の自動解除を備え、実際は入力観測後約0.45秒で手動解放した。ネットワーク全体やDB/processは遅延させていない。wrapperは各回復元し、後続full reloadで存在しないことも確認した。

操作:

1. 空の `/notes/new` でモードを選び、タイトルを入力して1800ms autosaveを開始させる。
2. タイトル保存応答後、次の読取応答が保留され、画面は `/notes/new`・「保存中…」であることを観測する。
3. 有効な本文欄へCLIの `type` で続けて入力する。入力ごとの `input` eventはすべて `isTrusted=true`。DOMとnewキーの退避に同じ本文があることを確認する。
4. 読取応答を解放する。edit URLへ移り、本文欄が空・「保存済み」・復元案内なしとなる。

| mode | save応答 | GET保留 | trusted input | GET解放 | 移行直後 |
| --- | ---: | ---: | ---: | ---: | --- |
| HTML | 46485.8ms | 46497.7ms | 46904.0〜46919.4ms | 46941.9ms | textarea空、保存済み、復元UIなし |
| WYSIWYG | 10576.4ms | 10582.1ms | 10998.0〜11011.3ms | 11033.5ms | contenteditable空、保存済み、復元UIなし |

時刻は各pageのperformance.nowで、別page間の絶対比較には使わない。操作実時刻は10:23〜10:25 JST。HTML本文 `<p>V5-html-CONTINUED</p>`、WYSIWYG本文 `V5-wysiwyg-CONTINUED` は各回new用localStorageに残った。DBはそれぞれversion0/html空、参照job0。edit用の退避キーには引き継がれず、edit画面に復元導線がない。完全な物理消失ではなく、「保存されたと誤認させる表示上の入力喪失と、作成済みnoteへの保存/復元の断絶」である。`/new` へ戻るとnew用復元案内が現れることも確認した。

自己試験note:

- 最初の探索: `01a0744e-befe-7339-9c5c-38f582fef9ab`、`V5-HTML-REVISION`。GETを最大12秒保留、type成功と最終DB/退避を確認したが途中evalはbatch引用エラーだったため、決定根拠は次の2回。
- HTML確定: `01a07450-6616-7116-833c-7661497ded79`、`V5-html-TRUSTED`。最終もDB空/version0で保持。
- WYSIWYG確定: `01a07450-ee1e-7583-a6e5-e7439421ba28`、`V5-wysiwyg-TRUSTED`。空/version0を採取後、正常対としてstable editで `V5-STABLE-ROUTE-NORMAL` をtypeすると自動保存成功、version1になった。

期待は保存待ち中に続けた本文を保持し、すでに作成した同noteへ保存して安全に遷移できること。保存していない本文を空の「保存済み」で置き換えてはならない。修正はImplementerへ差し戻す。今回無遅延で競合の発生頻度を測定しておらず、通常通信で必ず起きるとはしない。約0.45秒の読取待ちで到達可能な状態を、実入力・本体保存・DBで確定した。

2回目以降の新規試験の前には、自分の直前new退避だけをUIの「退避内容を破棄」で消去した。DB noteや他者の退避は削除していない。最終WYSIWYG失敗のnew退避は再検証用に保持している。CLI quoting/古いrefで出た試験操作エラーは製品不具合に数えず、誤って開いた破棄confirmはdismissし、破棄を実行していない。

### 最新ID判定と引き継ぎ

| ID | 最新判定 |
| --- | --- |
| P2b-C | 合格。V1〜V4解消、V3旧base付き自動未修復は上記採用制限 |
| P2b-A | 合格維持。共通URL検査の変更影響を確認 |
| P2b-B | 合格。V4共有容量の差戻しを解消。直接挿入/editorの旧成功を保持 |
| P1-C | 合格。参照CSS保存/依存表示の差戻しを解消。新規移行V5はP1-Bとして分離 |
| P2a-B/D/F | 合格。参照結果/合算容量/worker条件commitの共有影響を解消 |
| P1-B | 不合格。V5を新規差戻し。旧の保存・退避・白紙無入力等の正常条件は保持 |
| その他の旧合格 | 無変更範囲に前節・受入済みレビューを適用 |

終了時354 notes/29 assets（開始351/29、自己V5 noteを3件追加）、active参照job0、integrity_check正常、FK違反0。変更前backupの旧349 notes欠落0、今回操作対象の自己2 noteを除いてtitle/html/version差分0。旧28 assetsの欠落/bytes/sha/storage key差分0。既存原本/assetの削除、schema移行、依存更新、production再起動は行っていない。

専用browser `p2b-reference-independent` は10:31:06 JST頃close成功。wrapper復元済み、最後のreload後 `window.__v5restore` はundefined。今回HAR/session exportなし、network routeなし。focused socket testの自己listenerは試験終了時に閉じられ、全検査execを回収済み。元fixture/testは不変。派生test・race helper・自己画像だけをtempに保持した。

Productionは受領時の **session12923 / PID12295、Node22.22.3、http://localhost:3000** を稼働保持。バックアップ `/tmp/hollow-ref-revision.aK3Lna/pre-revision.db` も保持。別focus-debug/browser/全process情報には触れていない。

終了hash一致を確認し、以後の編集はこの報告追記だけ。`manual-test`で操作/観測を整理し、`markdown-style`で追記を構造化した。全コード/環境/browser操作を停止し、所有をManagerへ返却する。次の必要な修正はV5の新規保存移行に限定できる。
