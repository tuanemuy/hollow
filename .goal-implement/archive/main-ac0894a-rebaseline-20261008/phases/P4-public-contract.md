# P4 公開・発見の接続契約案

2026-09-19。P4b と独立した source 読取準備。最新の利用者決定を反映した提案であり、次フェーズの開始・製品実装・実行時成立を意味しない。採用は Manager が行う。

## 固定する条件

- [brief](../brief.md)「利用者が確定した仕様」と [design](../design.md) P4-Q1 が正本。公開 handle の初回設定・変更で、既存 note の公開 identity・URL 世代・限定 token を変更しない。他人・WS 所有へ移動済み、WS を脱退した creator、退会済み creator の存続 note も同じ。
- 変わるのは本人のプロフィール URL と、存続する creator の現在の著者リンク先。旧プロフィール URL は変更元プロフィールへ redirect しない。旧文字列を後で再割当できるかは、この条件とは別に判断する。
- 個人公開ページは `/@ハンドル`、WS 公開ページは `/w/スラッグ`（DS のタイムライン表）。note の具体 route は未採用。現在 owner の handle/slug を note URL の組立材料にしない。
- 公開操作時は現在の個人 owner の handle、または現在 owner WS の slug を確認する。creator の handle や WS 自体の公開は必要条件にしない。公開済み note の移動は公開操作ではなく、移動先 handle/slug 不足でも URL・公開状態を維持する。
- 作品の著者は creator、個人/WS タイムラインの集合は現在 owner。公開権限・著者・掲載先・URL identity を別々に扱う。unknown/退会済み creator を owner・uploader・同名 handle の再取得者へ置き換えない。

## 現在 source の根拠と不足

以下は repo root からの source 相対パス。P4b の作業中 source を読んだ事実であり、固定候補への実検証ではない。

| 接続点 | 現在の根拠 | 次 slice で必要な差分 |
| --- | --- | --- |
| note / creator | `packages/core/src/adapters/libsql/hollowSchema.ts:167` は owner と `creator_id` を分離。creator は account FK ではない。`repositories/noteRepository.ts:78` は null creator を unknown にする | public identity は note に結び付け、creator/元 owner/元 WS への cascade にしない。退会実装時も存続 note の creator 識別を保持する |
| 共有正本 | `adapters/libsql/sharingSchema.ts:14`、`domain/sharing/entity.ts` に private/link/public、共有版、限定 token 世代、grant epoch がある。public identity/URL 世代はない | 独立 public identity の追加と、public 設定の境界が必要。enum に public があるだけで提供済みではない |
| CHECK の影響 | `sharingSchema.ts` の `note_sharing_token_fields` は未発行状態を private のみに許す。public も現 CHECK では token/hash/envelope が必要。public password は禁止 | public 初回受理と token 発行を同 Tx にするか、CHECK と発行操作を明示的に変えるかを決める。public row だけ挿入する案は成立しない |
| 操作 / URL | `application/sharing/settings.ts` の ShareOperation は private/link のみ。`getShareLink` は link のみを許し `/s/{token}` を返す。再発行は token 世代だけを変える | public 操作・公開前提・password 解除確認、public 時の SH-02 リンク取得、canonical 取得を追加。canonical と秘密 token を同じ DTO フィールドにしない |
| 外部 read | `application/sharing/reading.ts` の current は link のみ。`sharingRepository.ts:37` scope は note の現在 owner account の存在、または現在 owner WS の active を確認 | public 専用の入口を追加。現在 owner 判定を共用し、旧 token 失効を public への自動切替で救済しない |
| 著者 | `repositories/displayNameRepository.ts` の author は creator account ID から named/unset/deleted/unknown を返す。メール補完なし | account ID → 現在 profile の handle を結合してリンクを作る。handle → creator の逆推定は禁止。icon/bio/handle の public profile は未実装 |
| 移動 | `repositories/noteMoveRepository.ts:277` apply は owner・note version・ownership generation を変え、creator・updatedAt・sharing row を変えない | public row も変更しない。掲載先だけ現在 owner で変える。移動確認の sharing 版は既存のまま使える |
| WS | `workspaceSchema.ts` は active/deleted、slug unique、nullable profile。ページ公開状態はない。`workspaceRepository.ts:95` は deleted も slug 重複対象 | ページ公開フラグと current slug 解決が必要。deleted WS は note admission 前でも拒否。既存 deleted WS slug 保持を account handle へ無断一般化しない |
| slug 変更 | `workspaceRepository.ts:126` は現 slug を直接置換する。旧 slug の履歴予約はない | account handle の再利用設計とは分ける。今回 WS の既存予約方式を変更しない |
| 検索 | `application/browse/ports.ts` の request は sessionHash 必須。`browseReadSnapshot.ts:167` は session と現在 membership を確認。projection と検索語規則は存在 | public 専用 request/read snapshot を追加。既存 app reader の認証を外さない。全件取得後の JS filter は不可 |
| HTTP / 描画 | `presentation/sharingHttp.node.ts` は `/s/` の noindex・隔離 iframe と current 媒体取得。公開 route / sitemap は現 route 一覧にない | 安全化・default/original 表示は共用。public は編集導線なし、canonical/meta/検索用 SSR の実成立を別途確認する。iframe に入れただけで SEO 完成とはしない |
| export 接続 | 作業中 `application/export/ports.ts` の ExportAuthority は account/link のみ | public を現在提供済みとしない。後続で public identity/世代に束縛した authority を追加し、元 ticket 入口・現在内容一致を維持する |

## 推奨する最小 identity / port

採用前の技術案として、`note_public_identity(note_id UNIQUE FK notes, public_id UNIQUE, url_generation)` を一対一で追加し、初回の public 受理時だけ同 UoW で発行する。public_id は既存 ID port による独立した値、世代の初期値は 1 を第一候補とする。既存 note ID の直接利用なら列数を減らせるが、内部 ID と外部 identity の結合が強くなる。どちらも URL 自体は閲覧認可ではない。

中立 route の第一候補は `/p/{publicId}/{generation}`。採用済み P4-Q1 の独立 URL 世代を明示できる。`/@handle/notes/...` や `/w/slug/...` は採用しない。世代を route に表示しない案も実装上は可能だが、その場合の generation 照合場所を正式契約に書く。route 文字列は可逆な実装判断であり、新たな SH-07 業務選択ではない。

URL 世代を handle 変更・初回設定・所有移動・WS slug 変更・SH-04 の token 再発行に連動させない。今回、世代を進める新操作を追加する理由はない。共有版、所有世代、本文版、grant epoch と兼用しない。public identity がないことを note 欠損や private row 欠損と混同しない。

最小 port の責務は次のとおり。

- PublicIdentityRepository: note ID による取得、初回作成、public ID と世代による解決。作成競合は同 note 一意制約と同 Tx で解消する。
- PublicProfileRepository: current handle の解決、account ID の公開フィールド取得、本人の handle 設定/変更を OCC 付きで保存。予約の確認と確定は同 Tx、入力中の重複確認は助言のみ。
- PublicNoteReader: identity → 現 sharing/lifecycle/現在 owner を同 snapshot で検査し、許可された現在本文/媒体/meta を返す。Tx 外描画後に source と現在認可を再確認する。
- PublicDiscoveryReader: 個人/WS/全公開の判別入力。候補・件数・タグ候補・抜粋・代表画像・sitemap に同一の current-public predicate を適用する。プロフィール用 DTO に email、member 数、内部 job、原本、history/draft を含めない。

個人 handle と display name の版を共用するか独立させるかは schema 詳細判断。既存 display name の OCC を古いプロフィールフォームが上書きしない構造を選ぶ。初回 handle をメールから自動生成したり、空のプロフィール成功画面で代用したりしない。

## 初回 handle と変更の流れ

1. 初回個人 public 操作は、現在 session・編集権限・note 所有/共有確認版・公開可能本文を確認する。現在 owner の handle がなければ、保存済み note を保持したまま本人設定へ案内する。WS 所有なら WS slug を使い、creator の未設定 handle には誘導しない。
2. 本人の明示入力を正規化/検証し、一意性と予約を Tx 内で確定する。設定後は検証済み note ID の共有画面へ戻り、最新状態を取得して再確認する。旧 public command を自動実行しない。
3. handle 変更は本人 profile のみ更新する。全 creator note の列挙、URL 世代 fanout、他 owner の承認、旧 note alias の大量更新は不要。著者リンクを current profile から作るので、他所有の note にも新しいリンク先が反映される。
4. profile の旧 URL から新 URL へ転送しない。新 URL の canonical・sitemap を更新する。ノートの canonical は不変。A→B→A の actor epoch、note/route/dialog 操作世代で古い success/catch/finally/copy を拒否する。

AC-07 は無効文字・予約語（settings/api/login 等）の拒否を要求するが、長さ・大文字小文字・Unicode・解除可否を確定していない。既存 WS slug は 3〜63 英小文字/数字/内部ハイフンだが、その規則や予約語集合を handle にそのまま採用した扱いにしない。正式実装では handle 専用規則と候補生成を固定する必要がある。初回から空は未設定として扱える一方、設定済み handle の解除と既存公開ノートの扱いは未決。無断の一括非公開化はしない。

## 旧 handle の予約 / 再利用

| 根拠・案 | 整合と注意 |
| --- | --- |
| AC-07 / DS-04 原文 | 変更前 URL の失効/404、現在 handle の一意性は明記。旧文字列の再割当まで永久禁止するとは明記していない |
| 画面案 `spec/design/pages/P21-settings-profile.html:260–265` | 「変更前の URL は他の人が使えるようになります」と明記。解放時期は数値で規定していないが、変更後の再利用可能性は明確に表現している。予約/tombstone 案を単なる未指定補完とは呼べない |
| 再利用可能案 | 変更元 account には到達しない、未再割当中は404、再割当後は別人の current profile と読む。原画面案との変更が最小。古い外部ブックマークが別人に到達する注意は必要。「旧 URL は永久404」という説明とは両立しない |
| 永続 tombstone 案 | 旧 profile URL を404のまま保ち、なりすまし的な再取得を抑制できる安全側の代案。ただし利用可能名が減り、上記画面案を変更する明示判断が必要。元本人の再取得も許すなら永久404ではなくなる |
| 有限保留後の再利用 | 安全性と名前回収の折衷だが、保留時間・起点・本人の取り戻し可否という追加ルールが要る。独自 TTL は本書では提案値を置かない |

本書は原画面案を維持する再利用可能案を推奨する。旧 profile の恒久404は利用者の明示決定ではなく、最新決定の中心は note URL の維持である。DS-04 と警告文を「旧本人へ転送しない、未割当は404、他人の再取得時は別本人」と明確化すれば、現在 handle だけを unique にする構造で整合できる。独自の保留期間や恒久 tombstone は第一候補に加えない。正式採否と brief/design の表現調整は Manager が行う。アカウント削除後の handle 保持/解放は別の未指定点であり、現 WS の削除後 slug 予約を自動適用しない。

どの案でも note.creator は不変の account ID で結ぶ。A の旧 handle を B が取得しても、A 作成 note の著者リンクを旧文字列から B へ解決しない。A が存続して新 handle を持てば A の現在 URL、A が退会済みなら deleted 表示でリンクなし。unknown は人物を推定しない。これにより handle 再利用と note identity/著者の誤帰属を切り離せる。

## 共有状態・削除・所有移動の対応

| 操作・現在条件 | 公開 note URL / 共有 token / 発見への結果 |
| --- | --- |
| creator/owner の handle 変更、初回設定 | note identity/URL/token 不変。本人 profile と current 著者リンクだけ変化 |
| 現所有/元所有 WS の slug 変更 | WS ページのみ変化。note identity/URL/token 不変 |
| 個人→WS→別 WS→個人 | 公開 URL と token は不変。旧所有 timeline から除き現在所有 timeline へ。著者ページの一覧にその note がなくても creator リンクとは矛盾しない |
| 元 owner/元 WS 削除 | 現在そこにない note には不影響。元 namespace・uploader を公開 fence に使わない |
| creator 退会、note は別 owner で存続 | 退会した利用者と表示し著者リンクなし。現在 owner が存続する note の公開/限定 URL は維持。現在 account 削除 UI の実成立まで検証済みとはしない |
| 現 owner WS 削除受理 | 現 note が active のまま admission 待ちでも404。本文、meta、媒体、検索、sitemap、後続 export を current owner で拒否 |
| public→private または link | canonical public 入口は404。公開検索/ページ/サイトマップから除く。private は限定入口も拒否。検索エンジンの既取得コピーを即時回収できない旨を示す |
| private/link→再 public | 同 identity/URL 世代を保持する案を第一候補とする。原文は再 public 時の identity を明記しないが、利用者の URL 安定方針と整合する。状態による読取可否と URL の寿命を分離する |
| public のまま trash→restore | trash の公開入口だけ410（本文/titleなし）、復元後は同 URL（DS-06）。限定入口は trash 中404。private/link、purging、完全削除、削除 owner は404 |
| SH-04 再発行 | 推測不能な共有 token が対象、canonical public identity は対象外と読む案を第一候補とする。旧 token は現在 public でも404、新 token だけ使う。SH-02/04 の文脈に最も小さく整合する |

public 発行の第一候補は public identity と必要な限定 token を同 Tx で確定し、既存 token は維持する方法。現 CHECK を保て、SH-02 の public 時にも token URL を取得できる。初回発行時の鍵利用不可は安全な失敗となるが、既存 token のある note の private 化や匿名 canonical 認可を鍵復号に依存させない。token を後から発行する案なら CHECK 変更と明示 mutation が別途必要であり、GET の暗黙発行にはしない。

public 化は既存 password の解除を確認し、同 Tx で password を null、旧 grant を失効させる。public→link で以前の password を無言で復元しない。`getShareLink` と限定 current reader は public 時にも現 token を扱えるよう拡張が必要だが、入口は `/s/` のまま区別する。限定入口の token 再発行と canonical public URL の安定を両立させ、旧 token の要求を canonical へ転送して復活させない。

## 公開・発見の最小縦 slice と実受入条件

依存は「本人 handle 設定/現在公開 profile、WS ページ設定 → 公開変更＋中立 identity → 匿名 note/current 媒体/meta → 現 owner ページとページ内検索/横断検索/sitemap → 公開解除時の全入口拒否」。公開ボタンや検索 UI だけを成功扱いしない。profile icon/bio は DS-04 に必要な未実装依存として残し、メール・架空値で代用しない。全面 AC-07 や Google/Drive をこの準備だけで開始しない。

公開 predicate は少なくとも public＋active＋現在 owner 存続。個人ページはその account の現在所有、WS ページは active＋現 slug＋ページ公開を加える。非公開 WS の public note は単体/横断検索では読めるが、WS ページは404。SH-07 の WS ページリンクは公開中の current WS ページだけを出す案を推奨し、非公開 WS の profile 情報を追加漏洩しない。

検索は既存 projection/語規則を共用し、2文字以上、日本語部分一致・英数字語頭一致・関連度順・タグ名 key 横断一致・updatedAt 期間・URL 復元を保つ。current-public filter は LIMIT、件数、facet、snippet、thumbnail より前に適用する。既存 app の createdAt 月、selection 500、本人閲覧可能な private を匿名検索へ流用しない。有限 SQL page と rate/中断境界を正式実装時に固定する。

受入では少なくとも、handle 変更と初回設定の前後で同一 note URL/世代/token、移動先 handle/slug 未設定、脱退 creator と別 owner/WS、creator 退会、handle 再利用時の誤帰属なし、元 WS 削除/現在 WS 削除の対を実確認する。public→private/link は本文だけでなく meta、GET/HEAD/Range 媒体、検索の件数/抜粋/タグ/画像、sitemap、準備後の遅い応答を拒否する。trash410/restore同URL、private404、共有token再発行とcanonical不変を区別する。

公開本文は現在の HTML 隔離・script 不実行・default/original 表示・current ref/ready 媒体を保つ。原本/history/draft を公開しない。通常ブラウザーと匿名 SSR の本文・canonical・meta は独立に確認し、外部検索エンジンへの実掲載をローカルの成功に含めない。公開ページには本人にも編集導線を出さず、アプリ内の編集認可は従来のままにする。

## 元仕様・旧準備から変更/明確化が必要な箇所

| 対象 | 必要な反映 |
| --- | --- |
| SH-07 最終エッジ | 「著者 handle 変更で旧 URL 失効」を、note URL 不変・profile URL/著者リンクのみ変更へ置換。利用者決定による明確な仕様変更 |
| AC-07 旧 URL 警告 | 旧プロフィール URL と明記。note/限定 URL は維持する旨を加える。未設定公開前提は現在個人所有に限定し、WS slug と公開済み移動の採用例外を参照 |
| DS-04 旧 URL404 | profile の条件として維持。再割当を採用する場合は「元 profile への転送なし、未再割当中404、再割当後別 profile」を明文化する判断が必要 |
| P21-settings-profile.html | 「共有済みリンクも辿れなくなる」をプロフィールに限定。「旧 URL は他人が使える」は handle 再利用判断に合わせる。安全 tombstone を採用するならこの明示文言の変更が必要 |
| SH-02/04 | public の canonical と token 共有リンクを区別。SH-04 は token だけを再発行し canonical 不変という推奨解釈を明記 |
| SH-01 / DS-06 | 公開→private/link で読めなくなることと identity 保持を分離。再 public は同 URL 案、public trash/restore は原文の同 URL・410/404 を保持 |
| AC-09 | 退会済み creator の別人個人所有 note も現在所有に従って存続し、作者を付け替えないことを明確化。handle 解放/予約は未指定のまま採用判断へ |
| OR-12 / WS-07 | 挙動変更は不要。所有移動と WS slug 変更で note URL 不変、slug 失効は WS 公開ページだけという採用済み補足を参照 |
| P4-shared-contract.md の Q1 | creator handle 変更で G1→G2 とする案・例表、「永久 note URL は SH-07 と不適合」の比較は最新決定で失効した旧提案。Q2 の元入口・現在内容一致契約まで取り消さない |
| P4-plan.md の未回答表 | SH-07 未回答・初回 handle で note 世代変更が未決という記載は最新決定で解消。未決として残るのは具体 schema/route、handle 再利用/解除などであり、creator fanout ではない |

## Manager へ返す判断点

1. 中立 route、public ID の別発行、独立 URL 世代の表現と初回発行を技術判断として確定する。
2. 再 public は同 identity/世代、SH-04 は token のみという第一候補を採用するか。現 schema CHECK と SH-02 を満たす token 発行接続も併記する。
3. handle の正規化/長さ/予約語・設定解除・再利用・退会後保持を決める。P21 の再利用可能文言を保持する案と、安全 tombstone へ変更する案を混同しない。
4. profile icon/bio と WS ページ公開設定、公開 SSR/meta/媒体、ページ検索/横断検索/sitemap をどこまで次 slice に含めるか。含めない依存は未提供として残す。

goal-implement と manager-loop は全文確認済み。原文 SH/DS/AC を全文確認し、現在 brief/design と関係 source を読んだ。製品・既存管理正本・DB・runtime・browser・git・依存・test/build・既存証跡には操作していない。Web/外部 API、goal API、spec/spec-implement、新規 agent は使用していない。本報告のみ保存し、全文確認後に全操作を停止する。
