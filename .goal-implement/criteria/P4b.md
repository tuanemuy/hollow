# P4b: HTML/Markdown単件書き出し

項目状態の正本: [plan.md](../plan.md#p4b-htmlmarkdown単件書き出し)。以下は固定IDごとの完了条件と検証根拠。

## P4b-A

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4b-A | R09/R06 / EX-01/04、design現在認可・内容identity | 現在のaccount/sessionまたは元link/browserの根拠で保存済み正本/current ready媒体だけを取得し、本文なし/無権限を拒否する。I/O外の短いUoWでsnapshotを固定し、生成採用と取得前に同根拠と現在内容を再照合する。失効は共通404、閲覧可能な更新は明示やり直し、同内容移動は現在権限で成功。原本/history/draft/他noteへ昇格せず、旧根拠を新public等に付け替えない （P4f-1実変更: snapshot内容抽出の狭い影響を[報告](../phases/P4f-1.md)に従って再確認） （[P4f-1独立受入](../reviews/P4f-1.md)） |

## P4b-B

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4b-B | R09/R02 / EX-01、designsafe HTML・媒体境界 | HTMLはtitle/現在style/取得済み画像を埋込んだUTF-8単一fileとし、通常anchorを保持、script/event/危険CSSを出さない。正当小data URIはassetなしでも既存内容検査で認め、SVG安全化と有限境界を守る。外部媒体は採用済み有限inspect-onlyで許可された原URLだけ保持し、新body取得/未取得stylesheet復活/blocked・内部媒体fallbackをしない。検査上限/不能を黙った成功にせず、後日外部変化の限界を示す |

## P4b-C

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4b-C | R09 / EX-01/04、designportable変換・秘密分離 | MarkdownをASTから構文別escapeで機械変換し、非対応要素はsafe HTMLで残す。現画像は衝突しないdata URI参照またはHTML埋込で単一fileに含め、全媒体base64を一括buffer/reparseしない。アプリ付与token/cookie/capability/内部媒体URLを挿入せず、利用者の通常anchor/textを秘密らしい形だけで削除しない。実HTML/MD fileの文字・リンク・style/画像bytes・fallbackを確認し、閲覧器の非対応を区分する |

## P4b-D

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4b-D | R09/R04/R07/R12 / EX-01/04、design有限spool・物理所有 | 同期spoolのowner/世代/固定期限/cleanup debtを永続追跡し、利用者/WS quotaへ課算しない。manifest bytes/shaで順次照合し、途中消失/改変・失効・late writeは全不採用。purge/WS削除は現在所有で失効・回収し、先移出を巻き込まず、実close/remove前に予約解放や全回収表示をしない。crash/boot/abort/remove失敗から回収する。2操作slot/30秒生成/120秒操作・上界予約/実write・2GiB運用枠を小実体/fakeで確認し、恒常枠不足を単なるretryとしない （P4f-1実変更: source reader共有closePromiseの狭い影響を[報告](../phases/P4f-1.md)に従って再確認） （[P4f-1独立受入](../reviews/P4f-1.md)） |

## P4b-E

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4b-E | R09/R06 / EX-04、designHTTP・rate・秘密保護 | accountは同session、限定は元link/browserへoperationを束縛し、IDだけで取得不可。native POSTのOrigin/null+厳密metadata、未提供method拒否、取得直前認可、attachment/MIME/安全filename/no-store/no-referrer/nosniffを確認する。匿名不許可にtitle/bytesを出さない。専用6/browser-note・30/noteの固定60秒rate、並行/再起動/非延長/再発行非reset/429Retry-After/prune100を検証し、password rateと分離する |

## P4b-F

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4b-F | R09/R12 / EX-01/04、CLAUDE.md mutation・design旧応答 | アプリ詳細と限定画面からHTML/MDを選び、同期生成とnative取得へ到達する。pending/取消/失敗理由/明示再実行、390/keyboard/focus/戻り導線が動く。dirtyは保存/送信/破棄せず、actor ABA/note/操作世代の旧success/catch/finallyを拒否する。ACK不明で成功/自動再送とせず、download開始を端末保存完了と表示しない。匿名no-JSでも成立し、PDF/ZIPの仮成功・仮jobを作らない |

## P4b-G

| ID | 要件・出所 | 観測できる完了条件 |
| --- | --- | --- |
| P4b-G | R12 / CLAUDE.md、design境界・移行・保全risk | 型/port/Clock/ID/UoWと新migrationだけで接続し、新snapshot/writer/cleanup/rateをruntimeへ配線する。cloneで旧全列/trigger/版/pin/holding/receipt/objects/chargeを保持し、実変更した先行条件だけ再検証。規定checks/unit/関連Node/build・同bundle実file/UI・commit/source/最終保全/正常全停止を揃える。秘密・自己破壊量/復旧可否・借用/未検証/運用限界を区分し、他runtime/外部接続や最大規模を未実測で成功にしない （P4f-1実変更: Unicode共通化又は0030追加の影響範囲を[報告](../phases/P4f-1.md)に従って再確認） （[P5a独立受入](../reviews/P5a.md)） |

## 検証報告への参照

- [P4f-1独立受入](../reviews/P4f-1.md)
- [P5a独立受入](../reviews/P5a.md)
