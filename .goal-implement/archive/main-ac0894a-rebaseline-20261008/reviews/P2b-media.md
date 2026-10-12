# P2b-A/B 独立レビュー

## 結論

V1 は修正必須。P2b-A/B と P1-D は差し戻し、P1-C と P2a-D の今回部分条件は合格。保存済み note から参照を除去しても、24 時間内の元 draft URL が GET / HEAD / Range を許可する。保存時の同一 note 再添付とは別の読取認可の欠落である。他の必須不具合は確認していない。

対象は [plan](../plan.md) の P2b-A/B、再オープン P1-C/D、P2a-D。原文 ED-01/03/06/08、IM-02/05 と [採用設計](../design.md) を照合した。[実装報告](../phases/P2b-media.md) を全文確認し、[独立 fixture 準備](P2b-media-prep.md) を使用した。P2b-C/D、20 版 pin 接続、三編集モード完成、共有・workspace・削除・AI 接続は今回の合格条件に加えていない。

## 対象と実行条件

- 開始: 2026-09-06 06:15 JST。clock の独立確認 06:22:52 JST、15 分報告 06:29:51 JST。途中連絡の「06:25」は推定時刻であり、06:22:52 に訂正した。以下の test 開始時刻は runner 出力による。
- 開始時 487 ファイル SHA-256: `b9f13b9aeb52986515fc55edae4e9f26040d2d1131673f206ddcd08e7dc570b8`、指定値一致。`git ls-files -co --exclude-standard -z` の重複除去・ソート、`.goal-implement/` 除外、各 path + NUL + bytes + NUL の連結を hash 化した。
- HEAD: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。独立照合一致。
- Production: `http://localhost:3000`、session `25138` / PID `68987`、Node 22.22.3。既存データを保持し、自身の新規 note だけを編集した。
- 独立成果: `/tmp/hollow-p2b-verify.ZdOLp6`。別の一時 libSQL DB・object storage は test 終了時に回収した。本体コード、依存、設定、全体管理文書は変更していない。
- 専用ブラウザ: `p2b-independent` / `p2b-independent-b`。既存 A / B アカウントを画面からサインインした。秘密値は成果物に含めない。
- 初期 Node / git / CLI 起動遅延は中断・回収した。Node 24.19.0 は hash 補助のみ成功。Vitest は macOS の異なる Team ID による native binding 拒否で起動せず、依存を変更せず Node 22 へ戻した。temp config の絶対 package subpath 解決ミスを修正した後、以下はすべて Node 22 で実行した。

## 項目別判定

| ID | 判定 | 独立根拠と残条件 |
| --- | --- | --- |
| P2b-A | FAIL | 本人 SVG の安定 note URL、詳細 SPA/reload、SVG response policy、他人/匿名の GET/HEAD/Range 拒否、実動画 seek、mobile は成立。V1 は旧 draft による現在 ref 迂回 |
| P2b-B | FAIL | SVG の画像のみ無題 autosave、alt、安定 URL、両モード文字入力後の media 保持、復元、正常/悪性 SVG parser、破損理由/retry/reselect が成立。draft 認可に V1 の影響 |
| P1-C | PASS | 本物 sanitizer の canonical / inert 表示分離、親への script/CSS 非干渉、実 click / auxclick / Enter と明示親リンクの区別が成立。既存の本文/title 上限の根拠を保持 |
| P1-D | FAIL | asset 認可に V1。別利用者/匿名/不正 Range と実 DB 容量・参照 transaction は成立。既存 note 認可と永続性の旧合格は保持 |
| P2a-D | PASS | 合算 quota の最終 assets integration 8 件と旧 imports integration 16 件を独立成功。既存 100 件/500 MiB・混在失敗の独立根拠を保持 |

## V1: bind 後の旧 draft URL が現在本文参照を迂回する

影響: P2b-A、P1-D、P2b-B の draft 認可。原因箇所は `packages/core/src/application/asset/access.ts` の `authorizedAsset` draft 分岐。`requireDraft` は期限と bind 先 note 本人認可を確認するが、bind 後の現在本文参照を確認しない。

独立再現は `/tmp/hollow-p2b-verify.ZdOLp6/independent.test.ts` の `reproduce bound draft read after current note reference removal`。本物の登録/確認 usecase、libSQL UoW、filesystem storage、inline processor、saveNote、`mediaHttp` handler を接続する。モック HTTP 認可ではない。DB と storage は production と別の一時領域である。

1. 本人 draft を作成し SVG を upload する。
2. SVG だけを note に保存し、draft→note bind を作る。安定 note URL の GET は 200。
3. 同じ note の本文を `<p>removed</p>` に保存する。
4. note URL の GET は 404。一方、最初の draft URL の GET は 200、HEAD は 200、`Range: bytes=0-9` は 206。
5. 保存時の正当な同一 note 再添付を行うと、note URL は 200 に戻る。

期待: 参照除去後は旧 draft URL も 404、または bind 済み draft の直接読取を拒否する。保存時の限定再添付を許可しても、未参照 asset の直接読取を復活させない。24 時間未満の元 draft の本人だけに限定されるため、他アカウントへの直ちの漏えいは再現していない。採用契約の現在参照確認には明確に違反する。

このケースはバグの現状を assert して test runner 上は成功する。安全合格件数へ含めない。既存 assets integration は note URL の除去後 404 を確認するが、同時点の旧 draft URL を確認していない。

06:31:40 JST に V1 一件だけを verbose で再実行して数値を採取した。note GET は 404 / error body 148 bytes、旧 draft GET は 200 / SVG 914 bytes、旧 draft HEAD は 200 / body 0、旧 draft Range は 206 / 10 bytes / `Content-Range: bytes 0-9/914`。同じケースの再実行であり独立件数を水増ししない。

## 独立コマンド

| 開始 JST | 対象 | 結果 |
| --- | --- | --- |
| 06:24:33 | temp `independent.test.ts`、Node 22 / Vitest 4.1.6 | 10 群、8.32 秒。安全境界 9 群成功、V1 現状再現 1 群 |
| 06:25:07 | `inlineMediaProcessor.test.ts`、`editorMedia.test.ts`、`mediaHttp.node.test.ts`、`--no-file-parallelism` | 29 / 29、2.35 秒 |
| 06:25:33 | `assets.integration.test.ts`、Node integration config、`--no-file-parallelism` | 8 / 8、2.75 秒 |
| 06:30:14 | `imports.integration.test.ts`、Node integration config、`--no-file-parallelism` | 16 / 16、20.04 秒 |

重い parser を別 test process と並行実行していない。製品 30 秒 deadline と runner 5 秒 timeout の混同はない。全 unit 207 は最終 UI / 再添付変更前なので固定候補全件の独立成功とはしない。最終 UI 7、Node 69、typecheck/lint/format/build 成功は実装報告の借用根拠。今回再実行した局所ファイル以外へ独立成功を拡張しない。

## SVG・HTML の独立観測

正常 `safe-art.svg` は viewBox、linearGradient、clipPath、内部 paint 参照、日本語を保持した。`safe-fragments.svg` は内部 `href` / `xlink:href` を 2 個保持した。悪性 script/event、foreignObject、外部 href/CSS、namespace 混在の 4 fixture は実 worker を通り、出力に script、prefix script、event、foreignObject、style、image、spy URL、javascript URL がないことを確認した。entity 定義は `MEDIA_UNSAFE_SVG`、壊れた XML は `MEDIA_CORRUPT` で拒否した。

SVG の安全化 subset は class/style、foreignObject、外部 image、filter、未対応タグ/属性を保持しない。これは通常の gradient / clipPath / 内部 use まで失う実装ではない。標準 SVG 全体の見た目保持や完全な XML namespace 正規化を証明していない。対応 subset を超える装飾の損失は除去 notice とともに分類し、すべてを破損扱いする新要件は追加しない。

本体新規 note `01a07376-2e20-709f-bf7a-e6801128ed86` の画像のみ autosave は「無題」「保存済み」、alt は「独立SVGの代替説明」。保存後の src は `/api/notes/{noteId}/assets/01a07376-25ea-75db-8e13-1bd0ff1c7fb1`。除去 notice の確認後、実「完了」による SPA 詳細、reload の両方で 320×180 の画像を観測した。notice がある間は `/notes/new` に留まり、本文と src は既に保存済みだった。

本体配信 SVG は SHA-256 `193a96820cfea4c262cbf340064dbe2132af2ab97c1c9c59a23306906a1860f2`。GET 200、MIME `image/svg+xml`、`private, no-store`、`nosniff`、response CSP の script/object/frame/connect/form/base 禁止と空 sandbox を確認した。保存後 bytes を DOMParser で検査し、viewBox `0 0 320 180`、gradient 1、clipPath 1、unsafe selector 0。これは response / bytes 証拠であり、直接 navigation の視覚確認とは区別する。

HTML の独立 preview fixture は spy URL を専用 loopback listener `127.0.0.1:65206` へ置換し、外部宛先を使っていない。元の placeholder port へ送信していない。初回表示後に spy request 0、script/form/iframe/object/base/refresh/event 0、href 0、親 marker unchanged、親背景に本文 CSS の影響なし。canonical HTML には安全な href、target、本文 CSS が残り、表示専用の span 化は永続化されない。

iframe の実 mouse click / middle auxclick / Enter は `isTrusted: true` を観測し、`about:srcdoc` と親 note URL を維持した。Tab により親側の明示リンクへフォーカス移動後の Enter は、専用 spy のみへ別タブを開いた。これは許可された親の明示操作であり、本文リンクの抜け道ではない。開いた専用タブを閉じ、再度 iframe 操作だけを実行した際は新規タブなし。

自身で `image-only.png`、`detail-desktop.png`、`preview-desktop.png` を画像として確認した。詳細の青緑 gradient、白い山、黄色い clip された円と日本語ラベルが見えた。preview の淡い青背景は iframe 内に収まり、親側リンク一覧とアプリ部分は影響しなかった。画像は上記 temp にあり、Manager に画像確認を委譲していない。

## 認可・容量・資源境界

別 B の本体ブラウザで、本人 A の note asset に GET / HEAD × Range なし / `0-9` / 範囲外の 6 通りを送り、すべて 404、Content-Range なし、HEAD body 0 を確認した。B の実サインアウト後は同じ 6 通りが 401。これは匿名確認であり、保存した旧 B token を再送する失効確認とは区別する。失効 token・wrong draft・wrong note は独立再実行した実 DB handler test の根拠がある。

合算 quota は import と media reservation を同じ UoW 内で読み、競合する最後の 1 byte を一方だけ受理する。失敗 object の cleanup 完了まで予約容量を解放せず、SVG は安全化後の実 bytes へ置換して再計算する。参照変更と note 保存、bind は同じ transaction 内。GC は I/O 前に deleting へ fence し、現在参照・将来 version pin・未期限切れ draft を確認する。削除途中の再試行と冪等 remove を実 DB test で確認した。20 版の実保存から pin する接続は P2c の未完成条件である。

inline media は shared admission の同時 2 / 待機 8 を使用し、stream の実 bytes / 宣言一致を検査する。画像 20 MiB、動画 200 MiB、SVG XML node/depth、画像 pixel 上限、動画 track/packet/read budget と 30 秒 worker deadline がある。staging は private temp、worker terminate と temp 削除は finally にある。動画は全 encoded packet の構造確認であり、全 codec の全 frame decode ではない。V8 heap 制限は native decoder を含む OS 総 RSS hard limit ではない。この限界を過剰な保証へ言い換えていない。

worker 内で Node net/tls/http/https/dns/fetch を拒否し、SVG は entity を解析前拒否、外部参照を保存前除去する。これはアプリ/worker の防御境界であり OS syscall sandbox の証明ではない。MDN CC0-labelled flower MP4/WebM の hash は MEDIA.md と再照合一致。独立 SVG の入力 hash は事前準備記録と一致する。

## 未検証・引継ぎ

production process 再起動、実 File drop、upload 中の離脱確認、明示的に保持した旧 token の本体再送、同一利用者 2 tab の実操作は今回独立再実行していない。実装報告の最終 UI 根拠、今回の実 DB / handler 再実行、P1/P2a の既存合格を適用する。特に 2 tab について、同一 note 再添付・別 note/未 bind/7 日期限/deleting/GC 後拒否は独立実 DB で再検証したが、実 browser の後保存優先は実装報告の条件付き実操作を借用する。P2c の 20 版 pin 連動を完了扱いしない。

全 codec、全 browser、SVG 全仕様の pixel 完全一致、OS hard RSS の確認は行っていない。今回の原文にない追加必須 gate としていない。

## 後半の独立表示・永続性確認

06:34〜06:40 JST に専用 browser を復旧して継続した。HTML の追記を WYSIWYG へ切り替え、実 `type` で「WYSIWYG独立追記」を追加した。HTML 追記と画像 src/alt/320×180 は保持された。ブラウザ再開時に表示された退避復元を実操作し、画像を含む内容を保存できた。CLI の連続 key 操作後には改行の多い入力が残ったため、自身の入力を正常化して続行した。この現象を製品の保存破損と断定していない。

同じ note に正常 internal use SVG、悪性 script/event SVG、MDN flower MP4 を実 input file 選択で追加した。SVG の natural dimensions は 300×150 と 300×133、video は 960×540、duration 5.055 秒。実「完了」の SPA 後も保持された。詳細の実シークバーをクリックし、2.5275 秒、`seeking=false`、`readyState=4` を確認した。`seek-mobile.png` で花の 0:02/0:05 フレームとシーク位置を自ら確認した。

390×844 viewport で document 幅 390、iframe 幅 350、動画表示幅 302。`media-mobile.png` と `seek-mobile.png` を自ら確認し、青/緑の内部 href 図形と安全化した緑の SAFE REMAINDER、動画 controls、固定編集導線を確認した。画像・動画を含む本文は iframe 内をスクロールできる。横はみ出しはなかった。

悪性 SVG asset `01a0737f-501f-745f-9ab1-36fd9f73c708` を本体の直接 URL で別タブに開いた。root は svg、viewBox `0 0 180 80`、script/event/foreignObject 0、実行 marker なし。`unsafe-svg-direct.png` で SAFE REMAINDER だけを自ら確認した。img 内表示と直接 navigation は別操作で確認している。

06:39:28 JST の独立実 DB test では、参照を再添付した後に libSQL client を close し、同じ実ファイルから新 client / 新 DI を作り直した。既存 session の認可と note asset GET 200、安全化済み SVG の保持を確認した。これは実 DB 接続再生成であり、production process 再起動とは区別する。production 再起動は実装報告の借用根拠を保持する。

本体の `/_serverFn/` だけを専用ブラウザで abort し、HTML へ追記した。未保存と再試行/ダウンロード導線を表示し、localStorage に追記本文・画像 3 / 動画 1 を保持した。preview 失敗と保存失敗は別表示になった。経路の abort は解除済み。

経路解除→reload→「復元する」の実操作後、追記本文・画像 3 / 動画 1 を保持し「保存済み」となり、退避 key は 0 になった。壊れた SVG の upload は「メディアが破損しているか、必要なデータが欠けています。元のアプリで保存し直してください。」と表示した。再試行は同じ安全な拒否、除去後の同一 file 再選択も再び処理された。失敗項目を除去して完了へ進めた。

追加の本体 HTML 試験では、親の `data-p2b-parent` を変更する script と onclick を実ソース入力に含めた。完成 iframe 待機後、親値 unchanged、iframe script/event 0、保存 canonical script なしを確認した。先の任意 sentinel だけでなく、payload が実際に対象とする marker で確認した。

一覧の実「新規作成」→タイトル/本文/メディア無入力→「完了」で一覧へ戻った。前後の note URL 配列は同一、71 件のままであり、新しい空 note は表示されなかった。試験終了時の自身 note は上記 marker 見出し、復元本文、画像 3 / 動画 1 を保存済みで保持する。

## 修正後の最小再検証

- V1 の bind 前/後の draft GET・HEAD・Range、現在参照除去と再添付を対にして確認する。元 draft で未参照読取を許可しない。note が閲覧不可になった場合も同じ現在認可へ従う。
- note 由来の保存再添付、別 note/未 bind 拒否、7 日境界、deleting/GC 後拒否、新規 upload 24 時間期限を維持する。
- draft→note 移行中の画像のみ autosave と preview、既存 note への追加 upload に表示回帰がないことを確認する。必要な影響以外の成功済み重い parser 全件を無根拠に繰り返さない。

## 環境引継ぎ

- 終了: 2026-09-06 06:45:32 JST。終了 HEAD は指定値一致、487 ファイル SHA-256 は `b9f13b9aeb52986515fc55edae4e9f26040d2d1131673f206ddcd08e7dc570b8` で開始値一致。
- 自身の browser `p2b-independent` / `p2b-independent-b` は個別 close 成功。試験 listener session `62188` / port `65206` は停止・終了コード 0。未完 exec を残していない。別作業 browser/process に触れていない。
- production session `25138` / PID `68987`、DB/storage/mailbox は引継ぎ時のまま維持した。production の停止・再起動・設定変更は行っていない。
- 自身の新規 note 1 件とその asset 4 件を保持した。破損 SVG の試行は失敗として扱い、画面の失敗項目は除去済み。既存利用者のデータを削除していない。
- SVG 入力 8 件の最終 SHA-256 は事前準備とすべて一致した。temp の独立 test / CLI helper / screenshots は再検証用に保持する。本体へ fixture や test を追加していない。
- manual-test の観測・セッション管理を、委譲された Verifier の範囲に限定して使用した。追加担当、外部 Issue、global cleanup、production 停止は行わない。Markdown の判定表と未検証の区別は markdown-style に従った。
- この報告後はコード・環境・browser 操作を停止し、Manager の受領をもって環境所有を実装担当へ戻す。V1 修正以外の実装判断を代行していない。

## V1 revision 独立再検証

2026-09-06 07:03:27 JST 開始。V1 は解消し、新しい差し戻し事項は確認していない。上記は修正前の証拠として保持し、この節を最新判定とする。[実装報告](../phases/P2b-media.md) の V1 revision 全文、更新された採用設計、原文・台帳の対象 ID を照合した。

### 対象と判定

- HEAD `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`、489 ファイル SHA-256 `deb0ae0a12248bb263b33fe89cdbe72053434a8141e8edd0fde287041414c0ef` を独立照合した。算出方法は前回と同一。lock は `02ee47aa5787fe11fb3b49d819a8283c1cdd7778803985e29d0a3d7cc209680e` で一致。
- Production は session `45804` / PID `85615`。DB/storage/mailbox は今回の引継ぎ指定と同じ。本体コード、依存、設定、他担当の作業領域は変更していない。
- 独立 test/helper/画像は `/tmp/hollow-p2b-revision.9GMbm4`。旧 V1 再現ファイルを変更せず、認可ケースを別ファイルへコピーし、旧 draft の拒否期待と以下の追加観測を入れた。

| ID | 最新判定 | 今回の影響と根拠 |
| --- | --- | --- |
| P2b-A | PASS | V1 の現在 ref 迂回を実 DB/handler と本体 HTTP で解消確認。旧 SVG・動画・mobile の成功根拠を保持 |
| P2b-B | PASS | 画像だけの無題 autosave、既存 note に追加した未確定画像の preview、安定 URL への保存が成立。確定後の除去で旧 draft も拒否 |
| P1-D | PASS | marker/ref/note/bind の原子的更新、故障 rollback、現在 note 認可、移行保全、接続再生成後の読取を確認 |
| P1-C | PASS | 共有 `canReadDraftAsset` により preview にも現在 ref を適用。canonical/inert/SVG/CSP の旧合格は保持 |
| P2a-D | PASS 維持 | 変更対象外。最終 assets 11 件内の合算 quota/race/cleanup/GC 回帰も今回再実行成功 |

P2b-C/D、P2c の 20 版 pin、共有/workspace/削除、三編集完成を今回の合格へ広げない。

### 独立実行とコード確認

07:09:55 JST、Node 22.22.3 / Vitest 4.1.6 で `node node_modules/vitest/vitest.mjs run --config /tmp/hollow-p2b-revision.9GMbm4/vitest.config.ts` を実行し、2 ファイル 12/12、4.46 秒で成功した。内訳は自身が変更・追加した認可 matrix 1 件と、最終 `assets.integration.test.ts` の既存 11 件。前回の「バグの実際を成功 assert」に対し、今回は安全な拒否を assert している。重い parser 全件、全 SVG/codec、全 unit を繰り返していない。

独立 matrix は本物の account/usecase、libSQL transaction、filesystem storage、inline processor、`mediaHttp`、`renderNote` を使う。以下を一つの状態遷移で確認した。

1. 未 bind・未確定画像は本人 draft の GET/HEAD 200、部分 206、範囲外 416、preview 1 件。marker=false。
2. `replaceCurrentReferences` が marker を true にした後、bind 直前で自身の故障を注入する。transaction rollback 後に note 0、draft 未 bind、marker=false へ戻る。
3. 正常な画像だけの保存は無題・stable note URL・marker=true。現在 ref がある旧 draft の読取と preview は許可される。
4. 参照除去後、旧 draft と note URL は GET/HEAD × Range なし/0-9/範囲外の全組合せで 404、Content-Range なし、HEAD body 0。preview の許可 asset は 0。
5. 正当な同 note 再添付で読取が戻り、再度参照を除去すると再び拒否する。marker は両方の除去後も true。
6. 既存 note に bind 済みの新しい draft へ追加した未保存画像は marker=false、draft で読取/preview 可。画像を含めず note だけ保存しても false のまま。
7. この未確定状態でも note の現在認可を失うと GET/HEAD/Range を拒否し、preview は NOTE_NOT_FOUND。本人認可を戻して画像を保存すると marker=true。
8. draft 24 時間後は旧 draft の読取と新 upload を拒否し、現在参照の stable note URL は許可。DB client を close して同一ファイルから新 client/DI を作り直すと marker=true と PNG の同一 bytes を保持する。

最終 assets 11 件の独立再実行は、別 user/匿名/失効/wrong note/draft、同 note 7 日猶予・別 note/未 bind/deleting/GC 拒否、後保存優先、将来 pin/GC fence、quota race、失敗 cleanup と期限切れ commit、旧 4 状態の SQL migration を含む。実装報告の DB 26、focused UI 9、規定 checks/build 成功は借用根拠として保持する。hollow 15 や UI 9 を今回自分が再実行したとは扱わない。

コード上、upload は false を明示し、`replaceCurrentReferences` だけが true を設定する。参照除去・再添付・GC に false へ戻す経路はない。note 保存/ref 更新/bind は同じ UoW 内であり、実故障注入でも部分確定しない。`requireDraft` の本人・24h・現在 note 認可と ready/asset owner 判定を通した後、HTTP と preview が共通 helper を使う。helper 単独が全認可を行うと誤認せず、両 caller の前提を確認した。読取に 7 日再添付例外を混ぜていない。

### 移行の保全と制限

`0004_previous_garia.sql` は列追加後、note に bind 済みの旧 draft に属する全 asset を true にする。旧履歴から未保存 staging と確定後除去を区別できないため、旧 bound staging も安全側に拒否する。Manager が採用した制限であり、現時点の新しい未保存 staging を拒否する変更ではない。object/HTML/local backup を削除せず、再挿入が必要になる既存データだけがある。旧 runtime と新 runtime の混在稼働はこの移行の保証に含めない。

独立再実行した最終 migration test は、現在参照あり/確定後除去/未 bound staging/bound 未保存 staging の 4 状態から列を外し、実 0004 SQL を適用した。marker と 200/404 の期待、4 object bytes の存在、元 HTML 保持が成功した。正式な production migrator の再実行は行っていない。

production は sqlite3 readonly で `pre-v1-backup.db` と比較した。backup は 335 notes / 11 assets / integrity ok。旧 note の ID 欠落・HTML/title 差分は 0、旧 asset の ID 欠落・DB 内 sha256/storage_key/bytes 差分は 0、旧 11 assets はすべて marker=true、現在 DB も integrity ok。これは DB メタデータと本文の比較であり、旧 11 object の全 bytes 再 hash と言い換えない。

### 本体ブラウザの独立観測

A を実画面でサインインし、自身の新規 note `01a0739f-5f43-77ca-a9e9-91b88f29f87f` を作った。PNG だけの upload はタイトル・本文文字を入力せず「無題」「保存済み」、`/notes/{id}/edit?mode=wysiwyg` へ移行し、img は stable note URL / naturalWidth 32 だった。HTML モードへの切替と「完了」の SPA 詳細を経て、既存 note の編集へ入り直した。

追加 upload の未保存状態を観測するため、自身の tab 内だけで 1800ms autosave timer を 120000ms に延ばした。本体ファイルは変更していない。新しい PNG は本文に draft URL として追加され、「未保存」、preview は旧 stable 画像と新 draft 画像の 2 個とも naturalWidth 32、新 draft GET 200。直後の readonly DB は既存 marker=1、新画像 marker=0、現在 ref は 1 件だった。

CLI 起動遅延中に延長 autosave が実行され、その後「保存済み」、両 src が stable note URL、preview の両画像 naturalWidth 32、DB marker は両方 1 / ref 2 件となった。試行した手動「保存」コマンドは起動前に中断しており、手動保存成功とは数えない。timer は元関数へ復旧した。

実 HTML 入力を `<p>V1 独立参照除去</p>` に変えて autosave 後、2 画像 × 旧 draft/stable note URL × GET/HEAD × Range なし/0-9/範囲外の 24 通りを本人 browser の fetch で確認した。すべて 404、Content-Range なし、GET error body 148 bytes、HEAD body 0。readonly DB の両 marker は true のままだった。新規時の draft と既存 note 追加時の draft の両方で V1 が解消している。

`image-only.png` と `staging.png` は上部/ソース側の画面で、画像そのものが画面外だった。これらを画像表示の視覚証明には使わない。iframe を中央にスクロールした `saved-preview.png` は自身で画像として確認し、プレビュー内に 2 個のカラーバー PNG が表示され、下部の保存/完了導線も見えた。画像確認を Manager へ委譲していない。

### 未検証と環境引継ぎ

production process の再起動、別 B の本体再サインイン、production 時刻を進める 7 日 GC、旧 bound staging の本体復元操作は今回繰り返していない。関連する実 DB tests、修正前の独立合格、実装報告の最終結果を区別して適用する。無変更の sanitizer/UI/Range parser/queue へ新たな総当たり試験を課さず、marker/read 許可への影響だけを再オープンした。

最後に同じ note の stable URL 2 個を実 HTML 入力へ再添付し、「保存済み」→実「完了」の SPA 詳細→reload を行った。07:18:19 JST 更新の「無題」、画像 2 個の stable src / naturalWidth 32、退避 key 0 を確認した。`final-detail.png` を自ら見て、非公開・保存済みの詳細にカラーバー PNG 2 個が表示されることを確認した。自身 note は再添付済みで保持する。

- 終了: 2026-09-06 07:19:16 JST。終了照合は HEAD 指定値、489 ファイル SHA-256 `deb0ae0a12248bb263b33fe89cdbe72053434a8141e8edd0fde287041414c0ef`、lock 指定値で開始と一致した。
- 自身の独立 revision test SHA-256 は `6900893c316e098da26662f6d4a84c2d073092c84c9de58d2c4f198272153834`。固定候補へ test/helper を追加していない。
- 専用 browser `p2b-independent` は個別 close 成功。別 browser を開かず、global cleanup や他作業 process 調査を行っていない。未完 exec はすべて完了または Ctrl-C で回収した。
- production session `45804` / PID `85615` を停止・再起動せず維持する。起動引数/環境設定の変更なし。DB は最終 337 notes / 15 assets、integrity ok。今回の自身追加分は note 1 / PNG asset 2、両 ready / committed=true / 現在 ref 2。旧データ削除なし。
- timer の局所変更は復旧し、reload で消えている。ネットワーク route や listener を今回追加していない。独立 test の一時 DB/storage は test の finally で回収済み、再現用 test/helper/画像のみ保持する。
- Node 22 初期 hash、rg、複数 CLI 起動に無出力の遅延があり、未完を回収して既知 Node 24.19.0 を CLI/hash 補助に使った。アプリと成功した Vitest は Node 22。CLI の未起動・中断を製品不具合や成功操作に数えていない。
- manual-test の scoped 観測と専用 session 管理、markdown-style の判定/根拠/未検証区分を使用した。追加担当・外部 Issue・実装修正は行わない。この追記後は全操作を停止し、Manager へ環境所有を返す。
