# P2b-A/B 独立検証の事前準備

## 範囲と状態

独立fixtureと最小観測matrixを準備した。本体の実装レビュー・動作検証・合格判定はしていない。

- Verifier `/root/verifier`、2026-09-06 05:17:58〜05:23 JST（Asia/Tokyo）。spec ED-01/03/06/08 と現在designのsame-origin単独・実サニタイザー・初期リンク無効化・draft認可を入力にした。
- 専用dir: `/tmp/hollow-p2b-media-prep.cMNtO0`。`mktemp -d` と `apply_patch` で生成したSVG8個/HTML2個/README。実装担当へ渡しておらず、本体repoへ追加していない。
- 読み取ったrepo文書は指定spec/designのみ。本体コード・依存・production・DB・storage・browser・OS設定は読取/操作なし。全process引数/envも取得していない。spec/spec-implement不使用、goal変更なし。
- Markdownの構造・空行整理にmarkdown-styleを使用。許可された本報告以外の管理文書は変更していない。

## 出所・固定hash

全入力はVerifierが今回手書きしたsynthetic fixture、CC0-1.0。第三者SVG/HTMLや実ユーザーの情報は含まない。scriptは専用 `data-p2b-*` markerを書くだけで、Cookie/storage/本文/秘密値を読み取らない。10入力の合計5,619 bytes。

SHA-256はmacOS標準 `/usr/bin/openssl dgst -sha256` で取得した。

| ファイル | bytes | SHA-256 |
| --- | --- | --- |
| safe-art.svg | 916 | 20b0b6021e1e98f6ee3e0c853e00dba2c8ab6bf5d23aabc65b5cce555e4768c8 |
| safe-fragments.svg | 371 | 8590b1a10ef701922cae11bd641c33dbe5b022c817c8a5b26a17f1bf9e5697b1 |
| active-script-event.svg | 503 | 7d00a34bbe1ab09c360da1fc019b055f0248fc850d027efeee03c9e958d55e14 |
| foreign-object.svg | 656 | 54daca67326613ed5d2e034d61a941bf7d7edea6d9441d31cd20b0f070c5bf84 |
| external-href-css.svg | 792 | 4023ba5a665ea6b099187079a22dce97effad3452933f4e6726329040c551c30 |
| entity.svg | 278 | 78d15ab8b6525ae83c718eee5f8819e63558065dc2525f2076132bee13ea2845 |
| namespace.svg | 526 | 5806a14ad0769e0cfb1c775c9fcbd6fb3e7ad42a70e055694a074ef8ddda6945 |
| malformed.svg | 105 | c5c07b618c7996398141bd29750d8a67a7181b07a4616e3cd47a8cd011a54c83 |
| preview-links.html | 640 | 07238462d4e0f35e1bc6a6b73d9aa4cadf3eb1a3fb55a57377ceda6cbd590a8f |
| preview-active.html | 832 | 1b307418b824afeb3b998358dfd2e6236524d4c795c5fdc52b03e62fb77c7e64 |

05:21:12に `xmllint --nonet --noout` でsafe-art / safe-fragments / active-script-event / foreign-object / external-href-css / namespaceの6個が整形式XMLであることだけを確認、exit0。DOCTYPEを持つentityと意図的な不整形式malformedはこの検査から除外した。サニタイザー・SVG描画・ブラウザdecodeの成功根拠ではない。

動画は新たに取得・生成していない。後の候補引継ぎで既存MDN CC0-labelled flower.mp4のpath/source/hashを確認し、その固定bytesを再利用する。今回はそのfile/hashを読んでいないため、動画fixtureを独立照合済みとは記録しない。追加codec全網羅は準備しない。

## spy URLの扱い

`http://127.0.0.1:65534/__p2b_spy__/` は構文上有効な置換用placeholderであり、空きportの保証ではない。今回listenerも通信も開始していない。このURLのまま入力を開かない。

後の検証時は自分専用loopback listenerをOS割当portで開始し、そのoriginへ別コピーで置換して派生hashを記録する。fixtureのpathごとにhitを区別する。取得先は所有listenerだけに限定し、他の通信はbrowser route/ネットワーク境界で遮断する。appの実API、他サービス、file URL、外部インターネットをspyとして使わない。ネットワーク遮断によるhit0と、実サニタイズ結果から危険参照が消えた事実を別々に記録する。

## SVG最小matrix

すべてP2b-A/B・ED-06対象の予定。まず実サニタイザーの結果bytes/DOMを調べ、その結果を使ったimg表示・必要な直接配信経路を確認する。raw悪性SVGを既存noteや無防備なtop-levelへ開かない。

| 入力 | 期待する観測 |
| --- | --- |
| safe-art.svg | viewBox 320×180の比率、青→緑の角丸panel、clipPathで切れた黄色circle、白い三角形、日本語ラベル。sanitize後も視覚的意味が残る。byte同一は要求しない。 |
| safe-fragments.svg | hrefとxlink:hrefによる内部fragment参照の青/緑diamond2個。外部参照除去の副作用で内部fragmentまで全消去していない。 |
| active-script-event.svg | script/onload/onclickが保存結果に残らず、script/event/parent markerが変化しない。受理して安全化する場合は緑背景とSAFE REMAINDERが残る。 |
| foreign-object.svg | XHTML foreignObjectとそのscript/img/formが除去または入力が理由付き拒否。受理時の青背景/ラベルは残る。SVG imgモードでscriptが動かないだけをsanitize成功としない。 |
| external-href-css.svg | image href/xlink、外部use、feImage、style import、paint/filter URL、escaped URL経路を評価。危険な外部参照がsafe SVGへ残らずspy hit0。受理時のSAFE LABELを確認する。 |
| entity.svg | DTD/external entityを展開・取得しない。境界拒否なら明確な理由を表示し、空SVGの成功へ偽装しない。内部entityはtinyで、展開爆弾ではない。 |
| namespace.svg | 同じSVG namespaceのprefix付きscript、未知namespace要素、文字参照で綴ったjavascript xlinkを安全化。単なるtag文字列や未decode URL比較の取り逃しを確認する。 |
| malformed.svg | XMLタグ不整合を破損/不正として扱う。安全に補正する契約なら補正/除去結果が明示され、無言の空成功でない。 |

通常ケースに対する全体拒否と、安全化で内容を失う場合を区別する。正常SVGの全機能対応や新たなpixel完全一致を要求するmatrixではない。描画後はVerifier自身が画像を確認する予定であり、今回は画像を生成・確認していない。

## HTML previewと初回リンクmatrix

P1-Cの再オープン影響、P2b-A/C、ED-03に対応する。HTML正本と描画用変換結果を別々に保持して比較する。

| 手順 | 期待する観測 |
| --- | --- |
| preview-linksを最初のsrcdocへmount | load後handler登録前も、self/blank/top/downloadがraw遷移可能な表現でない。trusted親操作だけが検証済みURLを扱う。現在URLとページ数・spy hitを初回から観測する。 |
| 表示リンクを通常click / middle-button auxclick / Tab→Enter | iframe自身/親の任意遷移、新規window、downloadが発生しない。単なるdispatchEvent成功だけでなく実入力とnavigation観測を組み合わせる。 |
| fragment-link | アプリURLへ誤解決しない。本文内移動を残すかtrusted親導線へ変換するかは採用契約に合わせる。安全なhref自体をHTML正本から失わない。 |
| HTML編集→preview→保存→再読込 | 描画専用のhref無効化/補助属性を保存HTMLへ混入しない。安全なURLと本文が保持され、iframe sandboxはallow-same-origin単独。 |
| preview-activeを実sanitizerへ通す | base/meta refresh/script/event/form/frame/objectを初回mount前に制限。親/子marker不変、自己/親遷移なし。passive-imageは内部spy URLなので描画無効化を確認し、原URL/理由の扱いは候補の部分範囲に合わせて記録する。 |

HTML previewのSVG添付成功で本体SVG sanitizerの全安全性を代替しない。初期loadのrace・auxclick・keyboardは単一のclick handler試験へ畳み込まない。

## 画像だけの新規draft matrix

P2b-B・ED-01/06/08、P1-B/Dへの影響確認。通常safe-art SVGだけを選び、最初にタイトル・本文の文字を入力しない。

- 新規WYSIWYGで画像挿入→upload progress→表示。alt入力前後を分け、文字がないことだけを理由に本文を空として捨てない。新規WYSIWYGの画像保持だけの確認で、三モード全体の完成とは扱わない。
- 自動保存待ち→完了→詳細→reload。画像だけでもnoteが1個作成され、draftからnoteへ参照が確定し、非公開・画像/altが保持される。無入力で離脱した対照は空noteを作らない。
- 保存前draftと保存後noteのasset URLを、Aの別draft・別note、B、匿名、失効sessionで比較する。A所有の全assetを無条件で読めない。保存時移行後に旧draft権限が過剰に残らない。
- upload失敗/中断ではplaceholderが残らず、再試行できる。upload中離脱に確認、完了後の不要な未保存警告はない。画像だけの通信失敗退避→復元が旧P1の文字入力条件に依存していない。
- 保存後はWYSIWYG再入場とHTML previewで画像が消えない。動画seekは既存固定flower.mp4で1回、200/206と認可を確認する予定。新たなcodec matrixは足さない。

## 未検証と停止

今回実行したのはfixture生成、固定hash、6個のXML構文チェックだけ。実サニタイザー、保存/容量/認可、SVG表示/直接配信、動画decode/Range、初期リンク/keyboard、draft・退避、mobile画像確認はすべて未検証。候補hashと環境所有の正式引継ぎを受けてから実施する。

本体やImplementerへのfixtureコピー/送信はしない。事前準備をここで停止し、コード・環境・browserの所有を取得しない。
