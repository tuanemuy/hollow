# 匿名単件 PDF の接続案

2026-09-20 09:29 JST 作成。P4d-2 本人 PDF と並行する読取準備であり、正式フェーズ開始・採用・実装・受入ではない。製品・環境・外部 API・テストは操作していない。

## 根拠と対象

原文 `spec/scenario/export.md`、`sharing.md`、`jobs.md` を全文確認した。採用契約は `design.md` の P4-Q1/Q2、単件 PDF・本人 PDF、P4a/P4b/P4c の関係節、実装報告は `phases/P4b.md`、`P4c.md`、`P4d-2.md` を全文確認した。以下の「採用済み」は設計契約を指し、実匿名 PDF の成立を指さない。

| 区分 | 根拠・保持する意味 |
| --- | --- |
| 原文 EX-01/04 | 現在の公開ページ、又は有効な限定リンクと必要なパスワード通過から単件 PDF。画面内進捗後に自動取得。同ノート生成中は合流し、完成 PDF は公開保存時点から 24 時間再利用。空本文は不可。 |
| 原文 EX-04 | 匿名の進捗・取得は期限付き署名 ticket。本人 JB-01 履歴には載せない。進捗・取得のたびに現在認可を確認し、非公開・削除・旧リンクは共通 not-found。ticket 期限切れ・生成失敗は元のダウンロードからやり直す。匿名 ZIP は対象外。 |
| 原文 SH-03/04/06 | パスワード変更・解除、リンク再発行で旧通過根拠を失効。通過は端末別 24 時間。失効した入口からタイトル・本文を漏らさない。 |
| 採用 SH-07/P4-Q1 | 公開 note URL は handle・slug・所有移動で維持。SH-04 は限定リンク token の再発行であり canonical public identity を変更しない。公開を外すと accessEpoch が進み、再公開しても旧 public 操作は復活しない。 |
| 採用 P4-Q2 | 匿名 ticket は受理から固定 10 分、専用 HMAC 鍵、元 authority・browser に束縛。poll/replay で延長しない。現在内容一致と現在認可は別条件。 |
| 採用 P4b/P4c | `/s` の既存 cookie、browser-note 6 回/note 30 回の固定 60 秒窓を共用。PDF 初回だけで nonce・窓を作り直さない。明示新要求は cache hit/合流でも 1 回計数し、照会・取得は再計数しない。 |
| 原文 JB との境界 | 本人履歴 90 日・本人 ticker/toast を匿名へ移植しない。匿名用永久 account は作らない。原文は匿名 cancel ボタンや匿名通知センターを要求していない。 |

## 現在の接続点と不足

| 現在の source | 借用できる部分／そのままでは使えない部分 |
| --- | --- |
| `application/export/ports.ts`, `snapshot.ts` | `ExportAuthority` の public/link と現在 token・grant・public identity の確認。HTML/MD snapshot identity と `ExportFormat` は PDF に流用・拡張しない。 |
| `application/sharing/reading.ts` | browserHash、linkGeneration、grantEpoch、期限付き grant の確認。匿名 PDF 用の「受理時根拠を固定した現在認可」port は未提供。 |
| `application/pdf/snapshot.ts` | PDF 固有 profile・現在本文/style/媒体と sourceIdentity、小 inline の検査。`readPdfSnapshot` の入口は verified account 必須なので匿名 account 偽装は不可。認可解決と同じ PDF snapshot 構築を分離する小変更が候補。 |
| `domain/pdf/entity.ts`, `adapters/libsql/pdfSchema.ts` | computation/artifact は共用候補。一方 request/delivery は必須 account FK、本人 command、90 日履歴に結合している。nullable account を足すだけでは既存不変条件を満たさない。 |
| `application/pdf/worker.ts`, `repositories/pdfHelpers.ts` | 単一計算・現在内容確認・保存・cleanup は再利用候補。ただし demand と current SQL は本人 request だけ。匿名だけの計算は現状維持できない。 |
| `repositories/pdfDeliveryRepository.ts`, `objectOperationRepository.ts` | claim・register・publish の現在認可も本人に結合。配信上限 2 件の集計も本人 delivery 表だけ。別表追加だけでは安全性も共用容量も成立しない。 |
| `application/pdf/delivery.ts` | prefix、bytes/hash、backpressure、abort、iterator.return、actual close 後の所有解放は共通化候補。外側の本人 session 認可は匿名用に置換せず別入口にする。 |
| `presentation/exportHttp.node.ts`, `pdfHttp.node.ts` | 前者の `/s` cookie/native POST/303/共通 rate を借用。後者は本人 API のみ。匿名署名・進捗・取得 HTTP は未実装。 |
| `pdfRequestRepository.ts`, `purgeRepository.ts` | 現在の prune・purge は本人 request/delivery と物理所有を参照する。匿名参照と実 read owner を追加しないと早期削除・FK 停止・回収漏れになる。 |

## 最小 port/schema 案（未採用）

本人 90 日履歴を変えず、`PdfAnonymousRequest` と `PdfAnonymousDelivery` をそれぞれ独立表・repository にする案を第一候補とする。既存表を polymorphic にする案より、本人体験と既存 CHECK/FK への変更が小さい。ただし共有 demand・容量・publish・purge の変更は必要で、HTTP だけの追加ではない。

- anonymous request: id、明示操作の command/form nonce、入力 digest、target/current note、PDF sourceIdentity/profile、compute/artifact 参照、state/generation、acceptedAt、固定 expiresAt、凍結した public 又は link authority、browserHash。account/session/90 日履歴は持たせない。タイトルの複製は必須にせず、表示するなら現在認可後だけ取得する。
- anonymous delivery: request/artifact 参照、browser/authority binding、createdAt/expiresAt、claim/generation、ready/sending/closing/closed。本人 delivery と併せた同 Tx の総数制限、同じ transfer 管理、実 object read owner を使う。
- 共有 demand: account/anonymous の判別可能な型で、現在有効な需要の存在確認・計算結果の配布・最後の需要消失・取消・期限・復旧を扱う。既存本人 demand の件数制限を匿名の新業務 cap にしない。全要求を JS 配列へ集めず、DB の存在確認と有限処理で扱う。
- signer/verifier: 採用済み専用 32B keyring、HMAC-SHA256、purpose と canonical claims 上限 1 KiB。request/generation、元 acceptedAt/expiresAt、browser binding、authority digest、kid を検証する候補。署名は暗号化ではないので raw token/password/session/title/body を claims に入れない。未知 kid・不正 shape・期限・MAC は閉じる。既存共有 token 暗号鍵は流用しない。
- authority resolver: `publicId/urlGeneration/accessEpoch/browserHash` 又は `tokenHash/linkGeneration/grantEpoch/browserHash` を受理時に固定し、毎回現在値へ照合。パスワードを必要とした場合は元 grant の期限も固定する候補。後の再通過で古い要求の権限寿命を延長しない。

同じ note/sourceIdentity/profile の compute/artifact は本人と匿名で共用できる。authority は出力内容の identity に混ぜず、各要求の有効性として独立に確認する。worker の claim/renew/current、結果 publish/succeed、失敗/取消、物理 write-owner の DB fence を両需要に接続する。本人最後の取消だけで匿名の有効な兄弟を止めず、匿名の失効でも本人兄弟を取り消さない。全需要失効後は stopping にし、実 renderer/channel/stream 終了を確認するまで資源を解放しない。

## 期限と現在認可

| 寿命 | 採用済み／今回の提案 |
| --- | --- |
| 匿名要求・署名 ticket | 受理 +10 分固定。poll・合流・再表示・署名の返却で延長しない。 |
| 元 password grant | verifiedAt +24 時間が上限。現在 grant の有効性に加え元 proof の期限を要求へ保存する案。ticket が残っていても元 proof 失効時は許可しない。 |
| 計算 | 現行 PDF の受付残時間・生成期限・停止契約を共用。匿名に別の無限待ちや自動新計算を足さない。 |
| artifact | publishedAt +24 時間。新要求・再取得で延長せず、内容が同じでも現在認可は別に確認。 |
| 匿名 delivery | 本人の 120 秒を借り、`min(作成+120秒, ticket期限, artifact期限, 必要なら元grant期限)` とする案。匿名の具体 delivery 寿命は今回未採用。10 分 ticket と実送信の時間予算を混同しない。 |
| 本人履歴 | createdAt +90 日のまま。匿名 request を本人履歴に追加しない。 |
| 物理保持 | 論理期限後も実 reader/writer/renderer が閉じるまで owner・予約・回収負債を保持。匿名記録の削除は参照と実 close がなくなってから。新しい業務履歴 TTL は追加しない。 |

現在認可の確認箇所は、受理、ticket/command 再提示、進捗、delivery 準備・claim、実 source open/先頭採用、worker の更新・公開、送信中の取消 sweep。認可を失った要求へ現在タイトル・失敗対象名・生成有無を返さない。認可を保つが内容が変わった場合は元出力を返さず、現在内容の明示新要求へ案内する。

| 変更 | 旧匿名 authority の扱い |
| --- | --- |
| public → private/link → 再 public | 旧 accessEpoch は復活しない。新要求なら同内容 artifact 再利用候補。 |
| SH-04 限定リンク再発行 | 旧 token/generation 要求を失効。canonical public authority には波及させない。 |
| password 変更・解除／private 化 | 旧 link grantEpoch を失効。新しい通過、public 化、後の本人 login へ旧要求を無言で昇格させない。 |
| 同内容の所有移動 | 元 WS 固定比較で一律取消しない。現在 note・現在 owner/scope が有効で元 public/link 根拠も有効なら維持。移出済 note を旧 WS 削除に巻き込まない。 |
| 現在 owner/WS の削除、note 削除・ゴミ箱 | 現在認可を失効し、取消確定した旧需要は復活させない。一般共有 grant の復元挙動と PDF の終端 request は別。復元後は明示新要求。 |
| 内容変更 | 旧内容 PDF の新取得を拒否。現在認可のない相手には内容変更の詳細も示さない。 |

## HTTP・ACK・画面内完結

既存 HTML/MD の厳密 form や `ExportFormat` を緩めず、同じ公開/限定ダウンロード選択画面に PDF 用 form/handler を別接続する案。公開側は既存 `/s/export-public/{id}/1` 系、限定側は `/s/{token}` 系に置き、ticket 進捗/取得も cookie の Path `/s` 内に置く。具体 suffix は可逆な実装判断として未決。

native POST は現在の Origin/Fetch-Metadata 例外をそのまま用い、`Origin:null` 全許可にしない。cookie の HttpOnly/SameSite/Secure 条件、重複 cookie 拒否を保持する。public は nonce binding だけで password grant を作らず、現在 public の確認後に既存規則で cookie を設定する。初回並列 cookie 応答でも POST が実際に持つ browser に固定し、後から rebind しない。

新要求 POST → 署名 ticket 付き画面へ 303 → 期限内の有限 Refresh/照会 → ready 後 native attachment 取得が最小候補。status GET は新計算・rate 予約・ticket 延長を行わない。ready の自動取得は同じ受理操作で一度だけ開始し、redirect loop や失敗時自動再 POST を作らない。Refresh 間隔・ready 一回性の具体実装は正式段階で選ぶ。端末保存成功とは表示しない。

新明示操作の rate 予約と受理 receipt は同じ command に対して一度にする。cache hit/生成合流でも計数し、lookup は計数しない。新 UUID を自動生成して ACK 不明を成功・未受理へ変換しない。

ACK 不明時は次の比較が残る。

- 最小案: ticket を保持できた場合だけ同じ ticket で照会。応答を失って ticket を持たない場合は「結果不明」とし、元画面から利用者が明示的に新要求する。EX-04 のやり直しに沿い、旧需要は固定期限で収束する。新要求は新しい明示操作として rate 対象。
- 回復強化案: 元 form command と同 browser/authority を照合する読取専用 receipt lookup を追加し、元 acceptedAt/期限の ticket だけを返す。署名 ticket なしで一般進捗を閲覧できる入口にはしない。null は未受理の証明にせず、自動 POST・期限更新・別 browser への再束縛は禁止。

どちらを匿名へ採用するかは未決であり、本人 UI の pending 永続化をそのまま匿名へ要求しない。原文が求める画面内進捗以外の履歴・ticker/toast・cancel ボタンも追加採用しない。tab/HTTP 切断だけで需要を取消す案は、no-JS navigation と生成継続を壊すため避ける。技術上の期限切れ・失効・最後の需要停止と、利用者向け取消操作は分ける。

## 共用資源・影響候補

本人と匿名は同じ compute 単位・同じ artifact・同じ service 予算を使う。現在の計算 1 件・配信 2 件・同要求配信 1 件、PDF 4 GiB/HTMLMD 2 GiB の区分を匿名用に複製しない。現行の上限を匿名向け新業務 cap と説明しない。24 時間 artifact、進行中 pack/output、返却待ち read owner、失敗 cleanup の予約を重複・過少計上せず、実 close/削除まで残す。renderer、固定 font、binary pack、外部参照禁止、HTML/MD serializer はこの準備で変更する理由がない。

正式実装時に実差分が生じる場合だけ、以下を再確認対象とする。受入済み正本の再 open はまだ行っていない。

- P4d-2 A/C/F/G: request/delivery の追加、混合 demand、同 Tx publish/取消、容量・purge・actual close。P4d-2 自体は現在進行中であり「受入済み」の再 open とは扱わない。本人 D/E の UI/90 日履歴は維持。
- P4b-A/E、P4c-I: 共通 authority resolver・`/s` native HTTP・cookie/rate を変更する場合。HTML/MD の既存形式・自動取得・scope move を回帰対象とするが、serializer 全体の再設計は不要。
- P4a-C/D/G、P4c-D: grant/current read や失効 hook を実変更する場合だけ。password hash、プロフィール、検索/sitemap まで広げない。
- P2d-2/P3f の current-note purge・物理 owner と migration/DI: 新匿名 FK/reader/demand に必要な枝だけ。古い WS を根拠に移出済 note を削除しない。

## 未決・未成立

1. 独立二表と小さな共通 demand port の採否、元 grant 期限の保存形、匿名 delivery の 120 秒 clamp。
2. ACK 不明時の最小明示やり直しと同 command receipt 回復の選択、具体 route・有限 Refresh・自動取得一回性。匿名通知/履歴を新設する要件は確認できない。
3. 専用署名鍵の配備・旧 key 保持・安全なログ経路は必要だが、現在秘密設定の存在や稼働は確認していない。今回 key/config は読んでいない。
4. public/link の両 style、失効後非復活、元 grant 期限、rate/初回 cookie、本人との兄弟需要、current-content move、native/no-JS、stream actual close は、実装後に成立確認が必要。これは新しい独立受入 gate の追加ではなく上記契約の未実証部分。

この報告は source と既存報告の読取に基づく。匿名 PDF の実生成、署名 ticket、配信、移行、混合需要の動作成功は主張しない。
