# P4c: 公開・発見とプロフィール

項目状態の正本: [plan.md](../plan.md#p4c-公開発見とプロフィール)。以下は固定IDごとの完了条件と検証根拠。

## P4c-A

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-A | R11/R06 / AC-07、DS-01/04、利用者SH-07決定、design profile | 表示名/handle/bioを実保存し、既存name OCCとprofile OCCの同Txで部分成功/上書きを防ぐ。入力規則・予約語・重複候補/競合・変更/解除・旧handle再取得を確認する。著者はcreator IDから現在profileへ結び、脱退/別owner/unknown/deletedで誤帰属しない。初回/変更でもnote URL/token不変、設定から元共有への明示復帰とdirty保持が動く。退会本体は別の残条件 |

## P4c-B

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-B | R11/R12 / AC-07/10、design個人icon物理所有 | 自己iconの5MiB入力/許可形式/安全なstatic WebP生成・表示/差替/削除を実装し、旧iconを失敗で失わない。個人容量へ予約/実体/debtを課算し、writer/世代/現在session/profileでlate採用を防ぐ。期限/取消/故障/bootから実close/remove後だけ解放し、FK cascadeで負債を消さない。現在handle/iconだけ公開し、旧URLや再取得者への漏洩なしを小実体で確認 |

## P4c-C

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-C | R07/R06 / WS-07〜09、DS-02、design二版OCC | ownerだけがWSページ公開をsettings/publication確認版で変更し、slug/権限/activeを再確認する。noteのvisibilityを変更せず、空ページ・コピー/失敗と非公開化の説明が動く。slug変更は旧対象へ転送せずnote URL不変、公開中のslug解除拒否。非公開/削除WSのpage/icon/metadataは共通404、member一覧を匿名へ出さない |

## P4c-D

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-D | R06/R05 / SH-01〜04/07/08、OR-12、design独立identity | public変更の現在編集権限・本文・現在所有scope handle/slug・確認版を守り、初回identity/token/共有/password解除確認を同Txで確定する。再publicは同URL、SH-04はtokenだけ、handle初回/変更/移動/slug/元owner削除でURL不変。publicを離れるとaccess epochで旧export失効、public復帰で旧operationを復活させない。既public移動を再公開として拒否しない（[P4e独立根拠](../reviews/P4e.md)） |

## P4c-E

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-E | R06/R02 / SH-07、DS-06、designSSR/現在媒体 | 親canonicalのmetadata/著者/tag/更新日時/安全代表画像、独立document全文SSRと通常anchor、両styleの隔離表示が同じ現在保存内容を返す。script/CSSの親侵入なし、親/子/GETHEADRange媒体を現在public/current readyだけへ制限し、原本/history/draftなし。採用前再照合、private/link/削除404・public trash410/復元同URLを確認。非公開WS情報を漏らさず本人にも編集導線なし。外部検索掲載は未検証と区分 |

## P4c-F

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-F | R06/R05/R07 / DS-01〜04、WS-09 | 個人/WSの現在所有publicだけがページへ並び、creatorとの違い・移動・旧handle再取得・slug変更・空状態を正しく表示する。実profile名/icon/bio、WS名/icon/説明は公開可のときだけ表示し、架空値/email補完なし。ページ内tag/検索、本人/メンバーの外部表示バナーと設定/作業一覧への導線が動き、scope切替の表示/並び順と文脈別filterを壊さない |

## P4c-G

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-G | R06/R12 / DS-05、designpublic query/資源rate | public専用SQLでLIMIT/count/facet/snippet/画像前に現在可視条件を適用し、2文字/日本語部分一致/英数字語頭/混合AND/関連度/tag名横断/updatedAt期間・URL復元/有限cursorを確認。appのprivate検索やcreatedAt月を流用しない。公開解除/更新の採用前再確認、0件/失敗再試行、独立1枠16待機3秒・実close、30browser/300global固定60秒/並行/再起動/非延長/prune100を確認 |

## P4c-H

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-H | R06/R12 / DS-06、designsitemap/SEO | 公開note canonical・現profile・公開WSの有限sitemap index/500件leafをUTF8/XML escapeとprotocol以下の件数bytes/deadlineで返す。旧名前/token/子document/private/link/trash/削除を除き、失効を現在再確認する。lastmodを捏造せず、超過を切れた成功/完全一覧にしない。index対象とnoindexをHTTPで確認し、全catalogue原子性/外部掲載/最大規模を未実測で保証しない |

## P4c-I

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-I | R09/R06 / EX-04、designpublic authority/nonce追補 | canonical→/s/export-public形式選択GET→明示POST→303→HTML/MD実fileがno-JS/厳密metadataで成立し、現在public ID/世代/epoch/browserと内容を採用/取得時再照合する。既存/s nonce・旧6/30窓を維持し、旧6回後初public/5+1/最後1枠並行/旧link取得保持を確認。grantをpublic認可に使わず、cookie不足/重複/初回raceはfail-closed・非自動再POST/有限回収。P4b slot/期限/spool/serializerを保持しprivate/publicの旧結果を混ぜない |

## P4c-J

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-J | R12/R02/R06 / CLAUDE frontend、design操作世代/lifecycle | profile/WS公開/共有/検索/取得のpending・失敗時入力保持・取消・明示再試行・390/keyboard/focusを実操作する。actor ABA/note/route/確認世代の旧success/catch/finallyとACK不明自動再送を防ぎ、dirtyを勝手に保存/破棄しない。現在WS削除/先移出/公開解除時に全新入口を失効させ、未提供PDF/ZIP/一括/退会の仮成功を作らない |

## P4c-K

| ID | 要件・出所 | 完了条件 |
| --- | --- | --- |
| P4c-K | R12 / CLAUDE architecture、design移行/保全risk | 内向き型/port/Clock/ID/UoWを守り、新schema/worker/物理所有/rateをNodeへ接続する。新migrationのclone旧全列/trigger/版/共有/profile/holding/receipt/objects/chargesを保全し、実変更した既存条件だけ再検証。最終checks/unit/関連Node/build/同bundle実UI/file/commit/source/保全/正常全停止を揃え、借用/独立/未測定/自己破壊量と復元未実施を区分する （P4f-1実変更: Unicode共通化又は0030追加の影響範囲を[報告](../phases/P4f-1.md)に従って再確認） （[P5a独立受入](../reviews/P5a.md)） |

## 検証報告への参照

- [P4e独立根拠](../reviews/P4e.md)
- [P5a独立受入](../reviews/P5a.md)
