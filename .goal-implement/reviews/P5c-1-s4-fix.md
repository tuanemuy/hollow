# P5c-1 S4 V1 独立再検証

## 判定

2026-09-30 11:57 JST。候補 `a85ccdd84bd1a690e68e752e8d38cf904d11aebf` の **S4 E/F・結果route V1修正範囲は合格**。元独立反例の操作・期待・3415Bのtest本体を変更せず、旧A表示false・旧A取消false・POST呼出0を確認した。関連42対と型検査も独立成功。新たな不合格はない。

これはA〜F全体の完了ではない。S5実配備/同bundle実UI、Dの未構成・needs-relink時のlocal解除は未完のまま。実Google/HTTP/browser/DB/fresh/buildを今回検証したとはしない。初回不合格の根拠は [S4独立報告](P5c-1-s4.md) に保持し、今回の成功で履歴を消さない。

専有I: `/Users/hikaru/.local/share/hollow/verification/p5c1-s4-fix-independent-20260930-Ciiy0j`（0700）。主の停止確認をManagerから受領するまでは報告・公開sourceの非mutating照合だけとし、確認後にI作成/実行へ進んだ。主の9/29終了事実は保存報告と停止回答の借用であり、独立が当時の資源を再実測したものではない。

| 条件 | 今回の判定・適用 |
| --- | --- |
| P5c-1-E | S4 route/current修正範囲で合格。元反例1、Result12を含むcomponent30、transport12、直接コード読解。実DOM/390px/Tabは未実施。 |
| P5c-1-F | 同境界の比例試験・型・固定・終了で合格。規定lint/formatは同候補の主成功を借用。S5配備/保全等の全体条件は未完。 |
| P5c-1-A/B/C | 変更外29pathとDDL等の同一性を確認し、前独立のS4局所合格を維持。今回DB/HTTP再実行0。 |
| P5c-1-D | 構成済みlinkedの既局所根拠を維持。未構成/needs-relink解除は未完で本修正の合格に含めない。 |
| P1-E / P2a-E | Shell導線/履歴併設の前静的局所判定を維持。Shell・route・History・backendは変更なし。全実画面範囲へ拡張しない。 |

## 独立コード確認

designの既current契約（929行付近）と固定E/F、採用S4案のactor/route/generation一致・旧finally分離に照合した。差分は `DriveResult.tsx` と同testの2pathだけで、route keyや共有hookの変更により元反例を隠していない。

- `DriveResult.tsx:220`〜222: idが変わるたびscope objectを置換。A→B→Aも旧Aとは別identityとなる。
- 223〜232・269〜272: receipt/errorをscopeとactor ticketの両方へ束縛。新BのGET拒否時にも旧Aを表示しない。id無しでも旧receiptを持ち越さない。
- 235〜265: refreshは旧closure/current flightを拒否。遅いreadの適用はscopeと既認証ticketの一致が必要。finallyは取得時のexpectedだけを解放し、新Bのflightを消さない。
- 306〜335: 既表示Panelから保持した古いhandlerもscope/currentで拒否。通常取消は現在receiptのid/versionを送り、成功後のGETもcurrentを再照合。ACK不明の明示再照会は純GETで、自動mutation再送を加えていない。
- 不変更 `useAuthenticationOperation` はmount/revision/route href/actor id・epochを照合する。新scope判定はこの既guardを置換せず追加する。

新6対はB read拒否、遅いA readとB flight、ABA/id欠落、旧mutation failure/finally、actor変更、同route exact取消・ACK不明の純GETを扱う。元6対と合わせResult12。hook代替でstate/refを保持する構造・イベント試験であり、native React schedulerや実ブラウザの完全実証とはしない。

## 直接実行

旧muMITOの許可5public logicだけ、regular/no-symlink/exactbytes確認→全文読了→COPYFILE_EXCLでIへコピーした。元 `independent.test.tsx` はbyte同一。configだけincludeをIへ変更し、runnerからDB/非対象test経路を除去、type/unit/independentだけを許可した。lint/format書込経路なし。新TMPDIR、cache無効、worker1/bail1、単一execを終端まで回収した。旧rootでの実行/書込、旧結果/private/DB/cacheコピーは0。

| 終端時刻（JST、自己記録mtime） | 独立結果 | 証跡 |
| --- | --- | --- |
| 11:55:19 | 元V1 1/1、失敗/skip/unhandled0。sameActor/readB/readBRejected=true、staleAVisible/cancelledOld=false、postCalls=0 | original-v1.json |
| 11:55:40 | component30＋transport12=42/42、7files、失敗/skip/unhandled0。Result12は内数 | related-42.json |
| 11:56:39 | workspace typecheck exit0、有限diagnostics0 | type.json |

元反例は同actorのA receipt表示後、state/refを保持してBへ移り、BのGETだけ拒否して通常取消handlerが旧Aを操作できるかを確認する。旧候補のfalse期待不成立を新候補で同じ期待のまま解消した。実server取消の成否を試験したものではない。

主42/checksを独立件数へ合算しない。前独立121のうち変更外pure17/application48/persistence20、旧S3 wire26/closure10/authprune8/移行3はsource同一性に基づく借用。今回DDL再実行/旧失敗DB再接続は0。型だけ直接再実行し、主lint/format成功を借用した。

## 固定・容量・停止

11:55:05のstart-sealと11:57:05のfinal-sealは31個別path全配列・immutable全配列が同一。全pathの現在bytesがHEAD blobへ一致し、変更外29はc4c5eb0と同一。製品dirty0。集約はJS sortしたrepo相対pathごとの `SHA256 + two spaces + path + LF` を連結してSHA256。

- commit: `a85ccdd84bd1a690e68e752e8d38cf904d11aebf`
- owned2: `0aa938b60014614cdc87038382985d069fa3014de33e0ee2c8accb5ad8420184`
- S4全31: `59c6969c19f2f75c73296c4d7af7057c82650005eed34dc710bfc28b336cec31`
- SQL: `d305836ed40bd36d9febf05aaab9c8b1552dbf7b80b23c097110adc428670112`
- snapshot: `653718f0094ce5651e6f6897669c8290446a7af0d2913e6eb3ea3f5fb84944fb`
- journal: `83885ffaf002e254a1f983ec61714e587b06c10dcbad4061a284875484b2e5a8`
- lock: `613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498`

SQL/snapshot/journal/lockは旧S3基点とも同一。mainのowned2個別bytes/hashとも一致。管理既存dirtyは保持し編集0。

最終自己Iは10files/35,143B、全てother、DB/WAL/SHM0・materials0。256KiB/8MiB予算内、削除0。自己3runner children（5931/6163/6317）は各close時とfinalでESRCH、全stdout/stderr pipeClosed。temp DB空、exact DB handles0、未回収exec0。HTTP/socket/browser/native/app/fresh/鍵/note/外部サービス0。試験失敗・新準備失敗・秘密/rawerror/stack出力なし。広い公開資料検索の表示切れは必要な採用条項を限定再読して補った。

再現入口は既Node22.22.3で `I/run.cjs independent original-v1`、`unit <unique-label> <許可7test>`、`type <unique-label>`。既結果はwxで再上書き拒否する。再実行する場合も新rootへのコピー適応と別の明示権限が必要。

報告EOFを全文確認後、文書を含む全read/write/runを停止してManagerへ所有を返却する。独立側で製品修正やS5着手は行わない。
