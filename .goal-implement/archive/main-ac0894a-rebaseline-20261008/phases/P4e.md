# P4e 一括公開範囲変更

## 現在の状態

P4e-A〜G＋実影響旧9条件の完了候補を固定。commit `7d14cde63db81d50049365880a9f1c92a920747c`、source1049 `38e865a2…`。1088unit、影響Node 8files/91対、最終規定checks/build成功。実UI bundle `143f180c…` は最終buildと一致。自己3notes/WS1/member2を保全後の通常UIで回収、対象物理0個0B。旧12objects3107B/20scope/論理FTS8253、全旧業務rowを保持（FTS物理とsqlite sequenceは差を別記）。現在11accounts51sessions、全負債0、FK0、integrity ok。17:42:56 runtime正常停止、自己browser全close、17:43:11監督closed、ports/DBhandles0・一時exec0。下記候補固定/安全CLIを独立へ引き継ぐ。独立未実施、全体goalの完了ではない。

## 2026-09-26 開始と共有 core

- 新専有 proof: `/Users/hikaru/.local/share/hollow/verification/p4e-sharing-20260926-Akv9X8`。開始保全 `start/` は 16:25:18.776 JST、通常 object と runtime を含む 15 files / 3809 B、manifest `228ae733aa5789a873426fc6775e4c13aad740a750997dff6f6fbdb43b6723a9`。ports 3000/3001 と DB 全 sidecar handles が空であることを保全 script が確認した。
- 独立基準 `/Users/hikaru/.local/share/hollow/verification/p4d3-independent-20260926-lQkAMA/final` と DB 全 sidecar を含む 18 payload files を byte 比較し一致。旧 backup/proof は無変更、fresh を driver-open していない。
- 開始 HEAD `2b7c3d2328294cfd83e83e2624183ca976515a21`、source 1040 files `e711325ed7b3759b234deacc2c4b3522b39df0187efc5d205aa28b60f4908836`、lock `2205b121339949ab38a99e8841337cf994e8d6512a3eaafa4d2c493d9755aa21` が基準と一致。
- 実編集: `packages/core/src/application/sharing/visibility.ts` を新設し、現在 verified actor/edit note・scope/OCC・本文・public 前提・password 同意・public identity を同 Tx で確認する。`single-reapply` は従来の再適用、`batch-converge` は検査後同値なら token/epoch/version を進めず保存結果を返す。domain は application 型へ依存しない。
- 実編集: `application/sharing/settings.ts` の visibility 分岐だけ上記 core へ接続。session は単件 wrapper 内で現在確認する。password hash の事前検査/計算/再確認、再発行、解除は従来分岐を保持。既存 `requiredSharing`/`shareServices` import は再 export で保持する。
- 型検査初回は snapshot の actor narrowing だけ不一致。比較関数の入力を実際に必要な note/settings/scope の Pick に修正後、`pnpm typecheck` 全 package exit 0。実 DB/回帰対は未実行。
- 実変更の先行条件影響提案: P4a-A（共有同 Tx・現在確認）、P4a-B（visibility での token 初回/再限定）、P4a-C（visibility での password/grant epoch）、P4c-D（public identity/解除 epoch）。各条件の変更部分だけで、鍵 rotation/媒体/rate/renderer を全面再実行する提案ではない。batch 条件は実編集後に追加報告する。
- 次: batch discriminant/snapshot/同意/保存結果と旧 JSON・digest 互換、単件・core の隔離回帰、受理/worker 同 Tx 接続。初期全体見込み 6〜9 時間は維持、独立検証は別。

## 追加実変更・統合型

- 実編集 `domain/batch/entity.ts`、`application/batch/{ports,usecases,worker}.ts`、新 `application/batch/sharing.ts`: sharing operation / preview snapshot / 子版束縛同意 / durable expected / sharing result を分離。受理と retry だけ sharing 用固定順 canonical payload を使い、旧 operation の JSON/digest と legacy move digest は変更しない。現在 source の公開前提を全体検査し、各子は visibility core と finish を同一 UoW で確定する。
- 実編集 `adapters/libsql/repositories/batchRepository.ts`、新 `adapters/libsql/batchResult.ts`: 旧 `{noteId,holdingSequence}` を内部 existing に型投影し、保存時は旧 shape のまま。sharing だけ discriminant/visibility/変更有無/前後版を永続保存。malformed result は integrity error。schema/migration は無変更。
- 実編集 `apps/web/app/presentation/batchInput.ts` は strict sharing payload/consent の境界を追加。`components/batch/model.ts` は同意を serialize で落とさず label を追加。操作 UI/現在文脈 guard は後続。
- `batch.integration.test.ts` の旧 move fixture は sharing なし旧 JSON を意図した型変換と nested union narrowing だけ追随。途中の全体型不一致は fixture に限定され、修正後 `pnpm typecheck` 全 package 成功。新 batch test を追加した後の型/実行はまだ未確認。
- 追加の実影響提案: P3e-C（preview/受理 strict payload/digest）、P3e-F（worker 変更と finish 同 Tx/保存結果）、P3e-G（retry/本人履歴の保存結果投影）、P3e-H（内向き型/旧 JSON 互換）。P3e-D の旧 tag/trash core は無変更、P3e-B の UI 所有は未編集としてまだ影響へ数えない。
- core 補助は新 `batchSharingCore.integration.test.ts` のみ専有、初回 11/12、故意 throw の既存 UoW 翻訳を test が誤期待した 1 件を修正中。主担当は全量/限定 Node を重ねていない。新 `batchSharing.integration.test.ts` は自己 DB と fake protector の境界で 7 対を作成中、実 crypto/runtime/browser 成功とはしない。

## UI 接続と実検査（16:45まで）

- 補助 core の最終12/12、限定Biome、自己DB/key/tmp回収・全停止を受領し、主担当も test/report 全文照合。初回故意throwの翻訳不一致11/12は fixture 修正で解消。正式独立検証とは別。
- 16:36:22 の直列 run: 旧 `batch.integration.test.ts` 26/26成功（旧JSON/digest・move結果互換を含む）。新 sharing は2/7で、5件は `getBatch` の第三引数へ `{id}` でなくidだけを渡したfixture誤り。修正後16:37:15に新7/7成功（1.27秒）。changed/no-op保存、空本文兄弟、public前提、子版同意、canonical再送、finish rollback、stale/retry、waiting取消を確認。
- 16:42:12: codec/旧model/activity/moveInput 44 pure、16:43:40: 新strict payload/50・500境界/同意保持/context ABA 6 pure成功。
- 実編集 `components/batch/{BatchOperationPicker,BatchConfirmation,BatchHistory,BatchSelectionProvider,BatchSelectionBar,BatchDialog}.tsx`。公開範囲3種、現在→変更先、scope名/人数、ページ内保護件数と子版束縛同意、空本文理由、前提設定への通常リンク、保存結果のchanged/unchangedを接続。未提供Drive/一括downloadは未提供表示のまま。profile/settings route自体は未変更。
- provider の actor/epoch/context を子へ渡し、旧応答/finally/focusを現在文脈で拒否。履歴mutation busyはoperation所有とし、旧finallyで新操作を解放しない。設定遷移による選択解除・自動復元なしを維持。実影響追加はP3e-B、履歴/同意は既再開P3e-C/G内。実UIの非同期対はまだ未実行。
- 規定 `pnpm typecheck && pnpm lint:fix && pnpm format` exit0、822files/22files整形、warning36/info34、format追加差0。16:45:25全unit 94files/1088成功（8.31秒）。以後の新500共有fixtureはこのunit根拠に含めない。
- 旧dist6178 `b68078c72345503019286d1ef2bdd4347d4eb6aa7b287881c1b71fc00fd2b13c` / bundle `6d9dfd1a65c4d087d99b46da7195825345e9d815695c54583f4f14ac61a00eda` はbuild前照合一致。16:47:34.854 supervisor readonly check exit0/closed=true。fresh/旧proofに書込していない。
- manual-test Skill/必須参照を読了。主担当環境単独所有/非秘密観測/永久証跡という指定を優先し、generic browser委譲・global cleanup・Issue作成・証跡削除は行わない。opaque launcherの新copyに対し許可済みimport/metadata path構造だけを限定照合して起動する。旧wrapperの旧proof計測書込は許可しない。
- 次: policy補助の単一自己DB対、500共有対、停止下build回収と新launcher契約照合、同bundle実UI。実UI開始は17時前後の見込み、候補は初期6〜9hから短縮可能だが未実UIのためまだ確定しない。

## 2026-09-26T17:05:26+09:00 実UIと追加対

- 新sharing 8/8は16:55:42 run/2.14秒/exit0。追加500件を50件ずつ確認・受理し先頭子の変更不要を確認、対象外はIDだけ。旧7対も同run成功。policy補助7/7（1.90秒）/限定Biome/自己tmp・exec回収/全停止を受領。暗号/実worker/実UIとは別の隔離DB根拠は `P4e-policy-test.md` に参照する。
- build session59263 exit0回収後、bundle `143f180cdeaef00cf0471629496b37b31941d4a970b50a7042da3e4397a39ef0` / lock不変を `P/ui-build.json` へ固定。16:55:52 preboot supervisor check exit0/closed。16:55:57.442 PID16903、.947 listening、session3981。以後dist/DB保全copyなし。
- launcherは新P/server-base.mjs opaque実行用copy。許可範囲の静的照合だけで絶対metadata import・fresh/port・process.env継承・旧proof書込なしを確認。baseのPDFconfig参照はCTIxyw/reference-deployment（R設定と非秘密byte一致）、P/server.mjsは既知Oの専用ticketkeyring path参照のみ追加。鍵/opaque全文は読まず出力せず。既存ownerをO/account.cjsでfill・通常signin、新account作成なし。
- copy ui-browser.cjsは追加prefix `p3c-fresh-p4c-anon-` を要求。初回短いprefixは起動前拒否で画面操作0、正しい自己session `p3c-fresh-p4c-anon-p4e-main` で成功。Node絶対pathの1字誤記によるsave未実行1件も修正後に通常clickした。製品失敗とはしない。
- 新自己note alpha `01a0dcb8-3223-72df-b6a9-c422c51044c1`、empty `01a0dcba-b2e6-743a-8ef1-9cc260755605`。alphaの通常単件UIでlink＋合成password、emptyは本文なし。新媒体/原本なし。秘密URLを出力/保存していない。
- 2件public確認は保護済み1件のcheckbox未同意で開始disabled、emptyの理由付き子失敗予告を表示。同意後Tab2回で開始buttonfocus→Enter受付。390×844でdialog clientWidth=scrollWidth=354、縦scroll。`P/consent-390.png`目視済み、`public-consent-before.txt`に本文根拠。
- 17:02:24処理はalpha成功/empty失敗、一覧public/passwordなしとempty private維持。終了通知と本人履歴の子ごと理由/保存済みchanged表示を `first-batch-result.txt` / `first-history-children.txt` へ記録。下部receiptが編集buttonを覆ったclickは失敗として保持、receiptを通常閉じて編集へ進んだ。
- emptyへ通常保存で本文を追加、履歴の失敗子1件だけ新previewで現在本文を再確認（空本文warning消失）→明示retry受付。`retry-current-preview.txt`。retry終端はまだ未確認、ACK/currentcontext対も後続。候補目安は残2〜4時間＋独立別へ更新、次定期17:20。

## 2026-09-26T17:20:47+09:00 retry/ACK/role/current context

- `P/retry-result.txt`: empty子だけ試行2で成功、alpha試行1の成功保持、親2/2。`noop-preview.txt`/`noop-history.txt`: 同publicは確認後変更不要として保存表示。
- `ui-fault.cjs`は自己browserのaccept相当POST（items/sharing）に限定して実response200を1回読取後人工TypeError。`ack-observations.txt`: count1/dropped1で維持、明示「同じ要求の結果を確認」後count2/200×2・body byte同一（同ID/payloadを含む）。raw bodyはbrowserメモリのみ、最後に消去・fetch復元true。`ack-unknown.txt`。自動再送や新要求への置換はなし。
- public alpha現read200/bodyあり、discover/profile一覧とq=alpha検索でcanonical linkあり。最初のrawHTML title一致falseはhighlight markupのためで、DOM text検査でtrueを確認（検索不具合ではない）。`public-reader-before.txt`/`public-list-search-before.txt`。別自己anon readerの通常native HTML download `public-alpha.html` 成功、内容/bytes最終照合は後続。PDF全面再生成はしていない。
- 新WS `01a0dcc5-2fac-73f6-8f92-fe84ec5417d0` / 自己note `01a0dcc7-0799-753a-93f4-5ae47fcc370d`（0媒体）を通常作成。slugなしpublic確認は全体中止/開始0件disabled。通常設定linkは390でinline折返しの中心clickが遷移せず、focus＋Enterで成立（追加計測差、障害を隠さない）。新WS slugだけ `p4e-20260926` に通常保存、WS page非公開のまま。戻った一覧はselectionなし/dialog0、`workspace-prerequisite.txt`/`settings-return-no-selection.txt`。
- P4d-2.md:235/340/348の自己second残存根拠をManager確認後、CTIxyw/account.cjs second fill→通常signin/local招待受諾だけ実施。新account登録や旧member/profile変更なし。新WSへmember2人、editor通常batch link成功（`editor-confirmation.txt`/`editor-result.txt`）。ownerがこの新memberをviewerへ変更後、selectionは可能だがmutation buttonなし・未提供download説明のみ（`viewer-selection.txt`）。主browser/second/anon-readerの3自己sessionに限定。
- `ui-hold.cjs`: 現public preview実200を1件hold→browser backでsettings/context B・dialog0→forwardで元list A・selection初期化→新picker表示/SELECTfocus→旧response解放。旧success/finally/focusが新pickerを置換せず、新SELECTfocus維持。`context-return-before-old.txt`/`context-old-success-rejected.txt`/`context-hold-observations.txt`。最後held1/released1/fetch復元true。これは同actor context A→B→A実対であり、実signin actor ABAとは称さない。actor識別はpure/current guardと旧変更外根拠を別索引にする。
- 一時exec全回収、runtimeのみ3981継続、16903稼働。現在共有contract/製品追加変更なし、UIbundle143f180cのまま。次は実解除現在read/旧download、残関連check、停止下保全と自己3notes/WSだけの通常回収。次定期17:35、残2〜3時間＋独立別。

## 2026-09-26T17:33:45+09:00 解除と現在読み手の接続

- 17:26:02 `pdfAnonymousPruneHttp.integration.test.ts` の追加1対成功（既存3対はこのrunではskip）。実batch preview/accept/claim/worker→public受付/ready delivery→batch privateで旧ticket/配信HTTP404→同canonical再publicでも旧根拠404・新command303。実DB/storage/HTTPとfake signer/workspace/rendererの境界。製品PDF変更なし、同bundle維持、最終型/限定file全4対は後続。
- policy7はsourceを再照合し、実 `NodeShareTokenProtector`/`NodeSharePasswordWork` とcontainerの `NodePasswordHasher` を使用。主sharing8対のfake protectorと混同しない。署名/Chromeの全面再証明はしていない。
- browser idle120秒のrestoreで元WS秘密URLメモリは失われた扱いとし、再構成/保存/旧proof参照をしなかった。非秘密canonicalから新鮮なHTML formを開く→mainの通常batch privateで個人2件成功→元formの通常native POSTで「書き出せませんでした」を確認。`private-batch-result.txt`/`public-old-form-after-private.txt`。同一の連続操作列で期限を改変していない。初記載の「1分程度」は計測値ではないため削除した。
- canonicalへ通常navigationしたresponseStatus404/本文metadataなし、q=alphaは200で自己alpha/empty非掲載。`public-canonical-after-private.txt`/`public-search-after-private.txt`。最初のdownload errorページ内fetch計測はCSPによりFailed to fetchで、HTTP成功根拠に数えず通常navigationへ切り替えた。
- この節の追加製品差はtestのみ。残は最終影響checks、停止下の正確対象/bytes監査→Managerへの回収通知→通常UI自己回収、旧20scope/全旧データ比較と候補固定。次定期17:50、候補目安18:30〜19:30（独立別）。

## 2026-09-26T17:48:01+09:00 最終検査・通常回収・保全

- 17:34規定 `pnpm typecheck && pnpm lint:fix && pnpm format` exit0。823filesのうち追加test1fileだけ整形、warning36/info34は既存、format追加差0。17:35:10の新sharing/core/policy/匿名prune HTTP 4files/31対が成功（6.81秒）、17:45:35の既存sharing/publication/publicReading 3files/34対も成功（5.55秒）。16:36:22旧batch26と合わせ8files/91対の異なる成功集合。1088unitは16:45:25成功を借用し、その後の差はNode testだけ。全量Node全fileを再実行した主張はしない。
- 全自己browser3を通常close、PID16903は17:36:01 drain/exit0/SystemError0。17:36:15.517監督check closed。ports/DBhandles0確認後 `P/before-delete` を17:36:22.433に排他保全。監査は別 `audit-before-delete` copyだけdriver-openした。
- 正確対象: personal alpha/empty 2notes、新WS `01a0dcc5-2fac-73f6-8f92-fe84ec5417d0` とnote `01a0dcc7-0799-753a-93f4-5ae47fcc370d`、新member2。original/asset/icon/PDF/exportすべて0個0B。`before-delete-targets.json` v1はobject_writes/object_deletesの終端履歴まで負債へ数えた計測誤り。`before-delete-targets-v2.json` がactive=1/done=0の正規predicateで全負債0/FK0を示す。両証跡保持。
- Managerへの対象/量/不可逆/backup通知後、同bundle PID36866/session24226を17:38:43起動。通常WS名入力確認からWS削除、personal2件は通常trash→個別完全削除（各不可逆checkbox）。`own-workspace-deleted.txt`/`own-notes-deleted.txt`/`own-purge-finished.txt`。自己account/profileと旧memberは不変更。17:42時点UI未完了0、最終copyで対象note0/member0/WSdeleted/purge3成功。削除した物理objectは0個0B。UI undo不可、backup保持、復元は未実施。
- 最終自己browserclose、17:42:56.166正常drain/exit0/SystemError0、17:43:11.080監督checked closed、全ports/DBsidecar handles0。新最終保全 `/Users/hikaru/.local/share/hollow/verification/p4e-sharing-20260926-Akv9X8/final` は17:43:17.799、通常12objects3107B＋runtime3files702B、manifest `228ae733aa5789a873426fc6775e4c13aad740a750997dff6f6fbdb43b6723a9`（開始と同一）。元proofは変更しない。
- `comparison-final.json` 17:43:34.483: 実start全構造78表656列109triggerが最終と一致、追加/変更0。従来保護76表618列96triggerとの差はP4d-3で追加済み匿名2表38列13triggerでありP4e移行差ではない。ledger30無変更。旧業務rowの変更/欠落0、現11accounts51sessions/103notes111revs95heads32tags9originals2assets/15members/activeWS9。旧20scope（11account＋9WS）使用量差0、旧12objects全byte保持。
- 許容追加は自己signin session2、招待history/rate/receipt/invitation各1、batch parent5/target7/attempt8、purge3、削除WS shell1/deletion関連各1、自己HTML writer2/key2/delete1、outbox/processed各10。sqlite_sequence1row更新とFTS物理data/idx差は自己note追加/回収によるため全物理row一致とはしない。`fts-final.json` 17:44:05.721で論理posting8253、lost0/added0。全PDF/writer/delete負債0、FK0、integrity ok。
- 最終コード差分レビューで追加製品修正なし。停止下17:45台の最終build exit0、17:46:12.636 bundle `143f180cdeaef00cf0471629496b37b31941d4a970b50a7042da3e4397a39ef0` は実UI値に一致。最終dist6369files `4b2427e81337757a41c1e52c5b979749a23471704e5edf87e14e7e5efb0b4b27`。全distのUI前指紋は未採取なのでbundle一致と製品変更なしで適用を示す。旧dist6178は開始値であり現distと同一とはしない。

## 固定16条件の根拠索引

| 条件 | 最新根拠・借用範囲 |
| --- | --- |
| P4e-A | `batchSharingInput` 4/`batchResult` 13 pure、sharing8の500/50・canonical同内容/異内容、旧batch26の501/旧tag-trash-move/legacy digest。旧DB batch行は最終全列同値。 |
| P4e-B | core12のsingle-reapply/batch-converge/Tx rollback、sharing8のfinish失敗rollback/旧lease再配送、既存sharing/publication/publicReading34。 |
| P4e-C | core12＋sharing8の子版consent/空本文private許可/兄弟継続/public前提/no-op。実 `public-consent-before`/`first-batch-result`/`workspace-prerequisite`/`settings-return-no-selection`/`noop-history`。 |
| P4e-D | policy7のeditor降格/離脱/再参加非復活/source移出ABA/WS削除/本文修復fresh retry、core12のactor/member ABA、sharing8のstaleとwaiting取消/claimed結果。実retry結果は失敗子attempt2・成功兄弟attempt1保持。 |
| P4e-E | 同bundle実owner/editor/viewer、current→target、保存changed/unchanged/安全失敗、通知と履歴、390スクリーンショット全画面目視/keyboard。実200喪失後自動送信なし→明示同ID/body再送、実context ABA oldsuccess/finally/focus拒否。actor signin ABA全再演はせずnew pure＋旧provider不変根拠を借用。 |
| P4e-F | policy7の実cryptoでtoken/canonical/grant、追加匿名PDF HTTP対のbatch書き手→epoch→旧ticket/delivery拒否と再public非復活。実公開read/list/search/HTML file→新鮮formのbatch private後拒否/canonical404/search非掲載。SH04専用再発行/renderer/font/rate全matrixは不変の旧受入を借用。 |
| P4e-G | 本文最終checks/run集合、同bundle UI、before-delete/final・comparison/FTS、下記候補固定と全停止。schema/dependency追加なし、独立検証は未実施。 |
| P4a-A | 抽出した現在verified/edit/OCC/scope/本文coreをcore12＋policy7＋既存sharing34内で確認。save/restore/移動自体は不変、旧103note/111rev/95head/版pin全列保持。 |
| P4a-B | visibilityの初回token/再限定維持をcore/policy。明示SH04/rotation/key管理は未変更の受入根拠を借用し、秘密をDTO/証跡へ出さない。 |
| P4a-C | visibility変更のpassword解除同意/grant epochをcore/policy＋実保護note→publicで確認。gate/rate/媒体資源の旧不変根拠を借用。 |
| P4c-D | public identity初回/同canonical/離脱epoch/旧export非復活をcore/policy＋追加HTTP、通常UIのsingle設定とbatch両入口。handle/slug/profile自体は変更なし。 |
| P3e-B | 新currentContext guard純粋対＋同bundlecontext往復旧preview/focus対・390/keyboard/viewer。filter/layout/page/既存optimisticの変更外条件は旧受入を借用、設定離脱選択復元なしを今回実証。 |
| P3e-C | strict共有payload/consent、canonical共有digest・legacy digest保持、500/50、実ACK同ID同payload再送。対象外はIDだけ。 |
| P3e-F | 子共有mutation/finish同Tx・rollback/re-deliveryをsharing8、同bundle親部分失敗→兄弟継続。runner/lease/boot/正常drainの不変部分は旧根拠＋今回正常drain2回。 |
| P3e-G | saved結果codec/現在値から補完しない投影、実親履歴/通知/failed最新子retry、policy外部取消非復活、sharing8通常取消。90日寿命/独立dismissは不変の旧受入を借用。 |
| P3e-H | 内向きdomain型/同UoW/strict transport、旧result2key保存互換、schemaなしを既存row/構造差0で確認。規定checks/関連91Node/1088unit/build/UI/保全/候補固定。 |

検証境界: core/policy補助は実装補助の自己検証。sharing8はfake protector、追加PDF HTTPはfake signer/workspace/rendererと実DB/storage/HTTP。実UIは実Node/libSQL/既存共有keyで行い、外部送信なし。新PDF生成/全font/全OS資源試験や変更外Google/Drive/ZIPは今回行わず、未提供機能を提供済みと表示しない。既存PDF期限closed=false原因未確定は変更外の既報事項で、今回成功で解消したとはしない。

## 2026-09-26T17:51:25+09:00 候補固定と独立引継ぎ

- 製品only commit `7d14cde63db81d50049365880a9f1c92a920747c`（25files）。管理/phase文書はcommitに含めない。`git status --short`は既存管理 `.goal-implement/` だけ、製品未commit差0。
- source1049files `38e865a20fc7b54fa0e072b506e4cc69fd603105bcafabd08a7f40f0a462f143`。計算はgit tracked/untracked非ignored・管理除外・existingregular重複排除・JSsort・秘密候補guard後、各path UTF8→NUL→filebytes→NULを単一SHA256へ連続update。個別hash連結ではない。
- bundle `143f180cdeaef00cf0471629496b37b31941d4a970b50a7042da3e4397a39ef0`、dist6369files `4b2427e81337757a41c1e52c5b979749a23471704e5edf87e14e7e5efb0b4b27`、lock `2205b121339949ab38a99e8841337cf994e8d6512a3eaafa4d2c493d9755aa21`。`P/candidate.json`。同bundle native HTML fileは776B/SHA256 `96f3f5ba80decbf4581a13d4a1a58178070ca25a53ae7721d2726bba2e9cce9a`、doctype/title/自己本文一致。ファイル照合は17:48の停止後、実取得は17:07:56 native記録で区別する。
- 非秘密証跡51filesの `P/evidence-manifest.json`、aggregate `8cded63f03422865b1ca3209bedd64090125b00bbc3a8bc7d0b6f9c24d376006`。形式はJS path sort後の `sha256 + ASCII space2個 + relative path + LF` のSHA256。製品source形式とは異なる。明示allowlistだけで、DB/全sidecar/object/監査copy・opaque server-base/browser/ui-browser/account/private/credentials/keyは対象外。失敗計測の一部txtはmanifestへ入れておらず、成功根拠へ混ぜない。
- P=`/Users/hikaru/.local/share/hollow/verification/p4e-sharing-20260926-Akv9X8`。開始基準V=`/Users/hikaru/.local/share/hollow/verification/p4d3-independent-20260926-lQkAMA/final`、今回最終基準はP/finalとcomparison-final/fts-final。新監査は新copyだけへ。旧proof/backupは変更せず、fresh ledger30の再移行は不要。
- Nodeは `/nix/store/4gl9pclv6ygwmgpg1gijza978bqbmpga-nodejs-22.22.3/bin/node`。起動はこのNodeで新copyの `server.mjs`、引数なし。wrapperとopaque実行専用 `server-base.mjs` を同じ新proofへcopyし、元を実行して計測を旧proofへ書かない。APP_URL localhost:3000 / HOSTNAME127.0.0.1 / PORT3000 / production / freshは既知base契約。PDF configは既知CTIxyw/reference-deployment、匿名keyringは既知O/private/pdf-ticket/keyring.jsonのruntime参照だけ。設定内容/鍵/opaque全文のread/hashは禁止。Node参照PDF/固定Chrome/font/Python配備はP4d-3から不変、P4eで追加起動/変更なし。
- Browserは新copyの `ui-browser.cjs run <SESSION> <agent-browser args...>`。SESSIONは `p3c-fresh-p4c-anon-` prefix、内部browser.cjsは `<SESSION> <args...>`。各呼出の既知restore/ChromeUAが必要で、別PATH同名binaryへ推測接続しない。通常snapshot/click/fill等はui-wrapperの秘密redactionを保持、secret URLは同process/browserメモリのみ。idle120秒は最後の明示open先へ復帰し得るためrefはsnapshotで再取得する。20秒有限呼出、未終端execを回収して次へ。
- 既存ownerは `/Users/hikaru/.local/share/hollow/verification/p4d-anonymous-20260920-QtZ1Fa/account.cjs <SESSION> owner fill`→通常signin。既存自己secondは `/Users/hikaru/.local/share/hollow/verification/p4d-pdf-product-20260920-CTIxyw/account.cjs <SESSION> second fill`→通常signin。必要な新自己WS招待のみ同helperの `<SESSION> second invite-fill`（owner画面）/`invite-open`（second画面、local mailbox）を使用。createで既存資格情報を上書きしない、本文/private JSONは読まない。今回の3browserはすべてclose済み。
- 受理済みself batch/history/purge/deletedWS shell/session2は期待する寿命データで、自己回収対象を広げて削除しない。旧actor/profile/既存workspace/member/通常objects不変更。現在実稼働なし、hook/holdなし、実行session全終端回収済み。最終文書全文照合後、文書を含む全操作を停止しManagerへ所有返却する。

最終停止記録: 2026-09-26 08:51:59 UTC（UTC、JSTは+9時間）。本節追加後の文書全文再照合を最後のreadとし、製品・文書・proof・DB・runtime・browser・tests/build/gitの全操作を停止して所有を返却する。未回収exec0、補助core/policy全停止、独立判定待ち。
