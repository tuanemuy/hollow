# P3c: 一覧・全文検索・タグ読取・カレンダー

項目状態の正本: [plan.md](../plan.md#p3c-一覧全文検索タグ読取カレンダー)。以下は固定IDごとの完了条件と検証根拠。

## P3c-A

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3c-A | R05 / OR-03、design索引・実行期限・移行リスク | 採用runtimeで2文字日本語・英数字語頭・混合ANDを欠落なく検索する方式を成立確認し、実装へ接続する。SQLで現在認可と正確照合後にorder/keyset/LIMITを適用する。代表入力の索引量/更新/query planと実計算の期限収束を区別して示す。現在内容とprojectionを同UoWで確定し、再開可能backfillは原note全旧列を保持し、未完成索引を完成検索と表示しない |

## P3c-B

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3c-B | R05 / OR-01/02/10、WS-02 | 個人/WSのタイル・リストで本文先頭由来の安全なサムネイル、title/更新日時/tag/現在公開・変換状態を表示し、最大50件のmetadata pageで続きを読める。更新/作成/titleの昇降順と検索時関連度、同値ID順、URL/再訪/preferenceを確認する。空/条件0件/初期skeleton/追加読込失敗と再試行を提供する |

## P3c-C

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3c-C | R05/R12 / OR-03、design検索意味・highlight・旧応答拒否 | ⌘K/Ctrl+K・上部trigger・絞り込みchipから現在scope固定のpaletteを開き、title/現在本文の一致抜粋を安全にhighlightし、候補選択でdetail、条件適用で一覧へ戻せる。2文字/日本語部分一致/英数字語頭/混合AND/本文未生成titleのみ、0件/短語/無term/期限/再試行を確認する。URLのqueryとtag/月を組合せ、scopeやquery変更後の旧成功/失敗を表示しない |

## P3c-D

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3c-D | R05 / OR-04、OR-06同名基盤、designtag共有契約 | 実tag正本とnote関係から現在scopeの使用頻度順候補・候補検索/page・複数AND filter・選択chip/個別解除/URLを提供する。使用0件は候補から外し、選択tagの消失/不明/他scopeは情報を漏らさず0件と解除導線になる。採用した版固定の幅限定/fullCF keyとscope一意性を接続する。通常作成・付与・管理の実UIはP3dで完成させ、P3cのfixture読取検証と区別する （P4f-1実変更: Unicode共通化又は0030追加の影響範囲を[報告](../phases/P4f-1.md)に従って再確認） （[P4f-1独立受入](../reviews/P4f-1.md)） |

## P3c-E

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3c-E | R05 / OR-02/05/10、designcivil日付/URL | 月filterとcalendarを同じcreatedAt/IANA-zone条件で表示し、月切替/解除・0件月・各日の有限初期件数と他N件の続き展開を提供する。日/月の夏時間・境界・存在しない日をUTC半開区間で扱い、件数と表示集合を揃える。calendar中sort無効/通常sort保持、URLzone優先/初回zone準備と回復、再訪・scope切替を確認し、月全noteをclientへ読み込まない |

## P3c-F

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3c-F | R05 / OR-11の読書残条件、designHTML隔離 | 一覧/検索から開いたdetailでtitle/本文/tag/現在公開状態/更新日時/creatorと元ファイル名・形式・size・現在backup状態を表示する。長文は全文を読み、補助の見出し一覧から該当箇所へ移れる。現在認可・styleMode隔離・本文skeleton・変換中から完了への更新と失敗導線を保つ。後続の共有/移動/download/Drive/LLM再生成は未接続を明記し、架空の成功状態や操作を置かない |

## P3c-G

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P3c-G | R12 / CLAUDE.md、design保全/資源/現在policy | 型/内向き依存/port/外部入力validation、通常notesのRSC streaming/client owner/pending/invalidateを守る。実個人/WS/非memberと失効後の候補・抜粋・件数・tag/calendarを確認する。390pxとkeyboardでpalette/三表示/条件解除/見出し操作を通す。新online backup/cloneで旧全列/版/pin/object/chargeを保持し（旧事故37未復元はD01）、規定checks/tests/build・同bundle・commitと停止状態を独立検証へ渡す |

## 検証報告への参照

- [P4f-1独立受入](../reviews/P4f-1.md)
