# P4e 独立検証

## 現在状態

2026-09-26 18:21:02 JSTの最終環境照合までで、固定16条件を全て合格と判断する。不合格0・条件単位の未検証0、新gate/追加再開提案なし。独立57 Node/39 pure、差分コードレビュー、同bundle実UIのpassword解除同意付きpublic部分成功→private変更/変更不要→匿名reader失効、390幅/keyboard、保存履歴を根拠とし、主担当/旧受入からの借用と未実測を下表・末尾で分離する。自己2noteは停止下直前保全後に通常UIで完全削除し、最終copy監査でnote/revision/head各0、対象objects 0Bを確認した。18:14:09 runtime正常exit0、自己browser全close、18:14:28最終保全。78表656列109trigger・旧全行（sequence/FTS物理を別計上）・20scope・旧12objects3107B・論理FTS8253を保持。18:20候補指紋再一致、18:21 ports/DBhandles0・既知自己PID不在/exec回収済み、監督readonly closedを確認。実装不参加・製品修正なし。全文確認後に文書込み全停止し、Managerへ環境を返却する。

- 新proof V=`/Users/hikaru/.local/share/hollow/verification/p4e-independent-20260926-VpislP`、0700。
- 17:56:12にcommit `7d14cde63db81d50049365880a9f1c92a920747c`、source1049 `38e865a20fc7b54fa0e072b506e4cc69fd603105bcafabd08a7f40f0a462f143`、bundle `143f180cdeaef00cf0471629496b37b31941d4a970b50a7042da3e4397a39ef0`、lock `2205b121339949ab38a99e8841337cf994e8d6512a3eaafa4d2c493d9755aa21`一致、製品diff空。
- 17:56:18監督readonly closed=true、ports/DB全sidecar handles0のguard下で17:56:24 start保全。15objects/runtime3809B、manifest `228ae733aa5789a873426fc6775e4c13aad740a750997dff6f6fbdb43b6723a9`。主P/finalから18payloadすべてbyte一致。
- 主非秘密manifest51entryのうちopaque server.mjsはhash禁止を優先して除外。残50entryは再hash差0。51全件独立再hashとはしない。
- 独立既存試験再実行: 17:56:33、sharing8/core12/policy7/旧batch26/pruneHTTP4の5files57Node全成功。旧batchの既存大型case1回を含むが、追加巨大対や全renderer再試験はしない。17:56:54、sharing input/model/result codecの3files39pure全成功。fake/実crypto/実browserの境界は最終報告で分ける。
- 共有core/一括canonical/codec、UoW accept/retry/worker、UI current context/focus/operation ownership差分を読解した。主要実UI・自己回収・最終比較は以下のとおり完了。

## 独立実UI・回収・保全（18:17追記）

- 専用session `p3c-fresh-p4c-anon-p4e-verifier-vpislp`、既存本人へ通常signin。新account/profile/WS/memberは作成・変更していない。新noteは `01a0dcf1-384f-77cc-bb8d-112283012747`（本文あり）と `01a0dcf3-0e21-701d-baa1-e2da7d6f125d`（空本文）の2件だけ。
- 本文ありnoteをprivateのままpassword準備し、一覧・panelで保護を確認。2件public previewでは解除同意前に開始disabled、空本文の子失敗予定理由を表示。390×844でdialogのclientWidth=scrollWidth=354、checkbox後のkeyboard Tab/Enterで開始した。18:04:53に1成功/1失敗。匿名credentials omitのcanonical GET200・本文/title一致をURL非出力で確認。
- 同じ2件をprivateへ。空本文private→privateは許可され、18:08に2成功、保存子resultは1変更/1変更不要。先のpublic receiptを再訪しても当時のpublic結果を保持し、現在privateから作り直していない。同canonicalの匿名GETは404、本文/titleなし。詳細は `partial-result.txt`、`public-reader.txt`、`private-preview.txt`、`private-result.txt`（旧public receiptの再訪）、`changed-and-noop.txt`、`private-reader.txt`。
- 18:09:51 PID42802/exec97538を正常TERM/drain/exit0、18:10:10.674 `before-delete` 保全。更なるcopy監査 `own-before-delete.json` は2note/2revision/2head、媒体・PDF・export全0、物理0B、負債0。18:10:51にManagerへexact対象と不可逆性を通知し、回収承認を受領。
- PID49148/exec71498で通常trash→完全削除確認を各1回、18:13:09/35のpurge成功。undo不可、`before-delete` 保全は保持し、backup復元は未実施。`own-purge.txt` と `own-final.json` で対象2note/revision/headが0。旧対象の削除なし、物理object削除0B。
- 18:14:09.290 runtime正常exit0/systemErrors0、自己browser close。18:14:21.324 `final-ownership.json` closed=true、18:14:28.936 `final` 保全。最終15objects/runtime3809Bのmanifestは開始と同値。監査driverは `final-audit` と `own-audit-final` の追加copyだけを使用。
- 18:17:39.207 `comparison-final.json`（監査copyは `final-audit`）：構造78表656列109trigger差0、旧行欠落・変更0（sqlite_sequenceとFTS物理表を除く）、旧20scope容量差0、通常旧12objects3107B全byte保持、103notes/111revisions/95heads/32tags/9originals/2assets/15members/9activeWSを保持、FK0/integrity ok、writer/delete/PDF負債0。自己session+1、batch親+2/targets+4/attempts+4、purge+2、outbox+4/processed+3は今回操作の追加。既存outbox全列も不変。
- 18:17:44.575 `fts-final.json`：旧/現在8253posting、lost0/added0。FTS物理segmentとsequenceの変化は自己create/save/purgeの期待差であり、全物理byte不変とはしない。新outboxの未処理1件を消す目的で再起動しない。

goal-implement/manager-loop全文と固定条件/designを照合。manual-testは手順書実行という起動条件には該当しないためワークフローは起動せず、skillとagent-browser参照を全文確認して既知安全CLIを利用する。単独所有、秘密非出力、専用session、証跡保持という明示指定を優先し、global cleanup/Issue/補助への環境委譲は行わない。spec/spec-implementと個別goal APIは不使用。

## 独立根拠と借用の区分

- I1（独立コード）：`application/sharing/visibility.ts` と単件 `settings.ts` 抽出差分、`application/batch/{sharing,usecases,worker,ports}.ts`、domain判別型、libSQL result codec/persistence、transport strict schemaを確認。現在verified actor/edit権限/確認版を同値判定より先に検査し、共有変更とfinishを同UoWで確定する。失権・lease失敗は変更をrollbackする。旧operationだけのcanonical/legacy move照合を拡張共有へ流用していない。共有snapshot・consentを固定してもsecret token/passwordはjob/DTOへ出ない。
- I2（独立再実行）：`pnpm exec vitest run --config vitest.config.integration.node.ts` に `batchSharing.integration.test.ts` 8、`batchSharingCore.integration.test.ts` 12、`batchSharingPolicy.integration.test.ts` 7、`batch.integration.test.ts` 26、`pdfAnonymousPruneHttp.integration.test.ts` 4を指定し、5files57成功（8.76秒）。sharing8はfake protector、policy7は実 `NodeShareTokenProtector`/`NodeSharePasswordWork` とcontainer password hasher。HTTP4は実DB/storage/HTTPだがsigner/workspace/rendererはfixtureであり、実Chrome描画成功の追加根拠ではない。旧batchの巨大既存caseは1回だけで、transport/decoder上限一般の新証明ではない。
- I3（独立pure）：`batchSharingInput.test.ts` 4、`components/batch/model.test.ts` 22、`batchResult.test.ts` 13の3files39成功。strict共有consent、旧result2keyのwire互換、保存resultの判別、actor/context epoch・選択/ACK純粋状態を確認。
- I4（独立UI）：前節の2noteだけによる通常操作。mainの操作を独立実行したものと混ぜない。今回独立の実ブラウザはowner/個人scopeの代表経路で、editor/viewer・WS公開前提・retry・人工ACK/context holdは下記M1を借用。
- I5（独立保全/識別）：開始・回収前・最終の停止下DB全sidecar/objects保全、追加copy全旧列・20scope・論理FTS比較、最終指紋/正常全停止。
- M1（主担当同bundle実UIを借用）：owner/editor/viewer、WS slug不足の全体未受理/設定往復で選択解除、失敗子だけattempt2へretry・成功兄弟attempt1保持、公開一覧/search/HTML native776Bからprivate失効。`ack-observations.txt` は実200を人工TypeErrorで隠し、count1の維持後、明示再送でcount2/200×2/body同一・fetch復元true。これは同ID同payloadの明示POST再送で、readonly GET回復とは称さない。`context-*-observations`/`context-return-before-old`/`context-old-success-rejected` を直接読み、同actor A→B→Aで新picker/SELECT focusを旧preview成功・finallyが上書きしない根拠を確認。
- M2（主担当検査を借用）：1088unit、影響8files91 Nodeの各実行集合、型/lint/format/build。91は単一全量Node実行ではない。独立57はその部分集合を別実行したもので、合算148個の別テストとはしない。単件sharing/publication/publicReading34の主成功と変更外の先行受入も適用範囲内で利用。
- M3（先行受入を維持）：SH04再発行・key rotation・password rate・媒体・renderer/font/channel/hardstop、本人/匿名PDFの変更外、90日/receipt寿命、旧一覧3表示と既存optimisticの変更外。今回コード差分はそれらの実装を変更せず、visibility/epochの接続境界をI1/I2/I4で確認した。OS隔離/全合法最大入力等を再証明していない。

## 固定16条件の判定

各行の合格は独立確認と明示した借用を合わせた固定条件内の判断であり、全分岐の実UIを今回繰り返した意味ではない。

| 条件 | 判定 | 適用根拠と範囲 |
| --- | --- | --- |
| P4e-A | 合格 | I1/I3でstrict判別型・旧JSON/result/canonical互換、I2 sharing8の正確500/50・対象外IDだけ・同内容/異内容、旧batch26の501/旧move digestを再確認。I5で旧batch全列保持。 |
| P4e-B | 合格 | I1 coreはsingle-reapplyとbatch-convergeを分離し現在確認を先行。I2 core12の同値/Tx rollback・sharing8のfinish lease喪失rollback/再配送非更新、policy実cryptoを確認。単件34の主成功M2も適用。 |
| P4e-C | 合格 | I2で子note/共有版consent、公開催行前提、空本文private許可/no-op。I4でprotected publicのcheckbox必須・1成功1失敗・兄弟継続、private2成功/1変更不要。WS前提全体未受理はM1。 |
| P4e-D | 合格 | I2で本文/共有stale・member役割ABA・source移出往復・降格/離脱後再加入非復活・WS削除・通常取消のclaimed結果保持・fresh failed retry。実UI retryはM1、旧attempt/成功兄弟非復活のコード/DBを独立確認。 |
| P4e-E | 合格 | I1/I3でactor/context epoch・keyed owner・busy Symbol・guarded finally/focus、I4で現在→目標/保存結果/通知/履歴・390/keyboard。editor/viewerとACK/同actor context ABAはM1の限定どおり借用。実signin actor ABAは未再演だが新guard純粋対・同期epoch更新/旧provider受入との組合せで範囲を満たす。 |
| P4e-F | 合格 | I2 policy7のtoken/canonical維持・古いgrant拒否、HTTP4の旧ticket/deliveryと再public非復活（fake renderer境界）。I4で匿名public200→private404/本文非漏洩。list/search/nativeHTMLはM1、SH04/rate/renderer不変はM3。 |
| P4e-G | 合格 | I1〜I5＋M2。製品/schema/依存指紋固定、自己2件だけ保全後回収、旧全列/容量/FTS保持、正常全停止。opaque server1件は非hashであることを明示し、mainmanifest51全件を独立再hashとはしていない。 |
| P4a-A | 合格 | I1単件core抽出の現在verified/edit/OCC/scope比較、I2 stale/equal・役割ABA・single再適用、I4 private保護準備。旧103note/版/pin/111revision/95headの全列をI5で保持。save/restore本体不変はM3。 |
| P4a-B | 合格 | I1/I2でtoken初回発行・再限定で同token・共有job secret非格納。I4 private時URLを表示しない保護準備を確認。SH04/rotation/key自体不変はM3で、既存鍵のread/hash/置換なし。 |
| P4a-C | 合格 | I2実cryptoでprivate/public/password/grant epoch、I4 privateのまま保護準備→子版に束縛されたpublic解除同意。password境界/rate/gate/媒体の未変更全対はM3を保持。 |
| P4c-D | 合格 | I1/I2で現在所有handle/slug・同Tx identity/password/epoch、canonical不変・private後旧operation非復活。I4 public/非公開reader結果、M1 nativeHTML失効。profile/handle自体の未変更条件は先行受入を維持。 |
| P3e-B | 合格 | I1 provider/dialog/bar/historyのactor-context所有・unmount/旧finally対策、I3選択/epoch境界、I4 390/keyboard。M1の実context往復はsignin ABAと区別。変更外のtile/list/calendar/optimistic条件はM3。 |
| P3e-C | 合格 | I1 strict finite確認と固定source、I2正確500/50/除外/同一digest・旧legacy、I3secret非付加と同要求再送、I4表示集合/同意、M1実ACK同payload明示再送。固定IDを検索結果へ置換しない。 |
| P3e-F | 合格 | I1 workerの現在actor/共有mutation/finish同Tx、I2 rollback/lease再配送・cancel対、I4部分失敗後兄弟継続。runner/boot/永続leaseの不変部は旧受入、今回2回の正常drainで統合動作を確認。 |
| P3e-G | 合格 | I1保存結果codecと履歴投影、I2 failed最新子fresh retry/外部取消非復活、I4現在private後も旧public receipt保持・新changed/no-op/通知。retry実UIはM1、90日/独立dismiss/未終端寿命はM3。 |
| P3e-H | 合格 | I1 inward型/UoW/境界validation・旧JSON互換、I5構造/全旧業務列/版/pin/objects/charge保持、M2規定checks＋独立部分実行、I4主要UI/保全回収/候補固定。新migrationなし。 |

## 不成立試行・未実測の扱い

- UI準備中の存在しない参照path、CLI `find role link` の未対応操作、CodeMirrorに対するtextarea probe、panel文言の別表現によるfalse判定は製品不合格/成功証拠へ採用しない。正しい一覧/HTML編集表示/preview/実resultで確認し直した。旧receiptを開いた観察は新private結果と混同せず、当時結果の保持として記録した。
- 実signin actor ABAの全遷移、変更外全3表示の再演、全500件実UI、全旧renderer/font/rate/hardstop、OS全隔離/native hardcap/最大合法媒体を今回独立再実行していない。固定条件の実変更境界にI1〜I4、未変更にM2/M3を適用し、これら未実測を新成功へ拡大しない。
- core/policy補助は実装参加者であり独立Verifierとして数えない。こちらのコード読解と既存試験の別再実行を独立根拠とした。外部連携/メール/OAuth/API/有料/公開deployは未接続。

## 最終識別・返却

- `candidate-final.json` 18:20:00.525：HEAD `7d14cde63db81d50049365880a9f1c92a920747c`、製品diff空、source1049 `38e865a20fc7b54fa0e072b506e4cc69fd603105bcafabd08a7f40f0a462f143`、bundle `143f180cdeaef00cf0471629496b37b31941d4a970b50a7042da3e4397a39ef0`、dist6369 `4b2427e81337757a41c1e52c5b979749a23471704e5edf87e14e7e5efb0b4b27`、lock `2205b121339949ab38a99e8841337cf994e8d6512a3eaafa4d2c493d9755aa21` 全一致。source/distは相対path→NUL→bytes→NUL、sourceの秘密path guardをhash前に適用。主manifestの非opaque50entryも再一致、opaque server1は除外のまま。
- `handoff-ownership.json` 18:20:33.813 readonly監督closed=true。`handoff.json` 18:21:02.543はports3000/3001 PID0、freshDB存在sidecar handles0、既知自己runtime42802/49148不在。exec97538/71498は正常exitを回収済み、自己browser close、未回収exec0。未知PIDへのsignal/全browser cleanupなし。
- 独立証跡は明示非秘密27filesの `V/evidence-manifest.json`、aggregate `b187983e69fb5e55749f83ab863581e84852bf908018ce7fdf7cf690de4aa04b`。形式はJS path sort後 `lowercaseSHA256 + two spaces + relativepath + LF` のSHA256。DB/sidecar実体・opaque helper/credentials/key/privateはこのmanifestへ入れない。DB保全は各manifestと追加copy監査で別記した。
- 次工程のbaselineは `V/final` 18:14:28.936、`V/comparison-final.json` 18:17:39.207、`V/fts-final.json` 18:17:44.575。受理済みbatch/history/purge/session/outboxの寿命データを保持する。通常objects12/3107B、runtime別3/702Bで合計15/3809B。
- 自己2noteは通常UI完全削除済み、媒体物理削除0B、通常undo不可。直前backupは `V/before-delete` に保持し復元未実施。旧note/WS/account/profile/memberの削除・変更はない（signinによる新session1だけ追加）。この報告全文確認後は文書を含む全操作を停止し、環境所有をManagerへ返す。全体goalの完了宣言ではない。
