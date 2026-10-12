# P5c-3-S5 採用共有契約の独立事前レビュー

計画preflight: **PASS（実装可能性・採用契約の限定判定）**。重大な型／既DDLとの矛盾、今回の基盤実装を阻む確定したexact path不足は確認しなかった。S5 source実装・直接検証は未着手で、A–Fの機能合格ではない。

確認日時: 2026-10-06T06:36:23.199975+00:00。独立Verifierが公開文書と受入S4 Git objectだけを読んだ。runtime/defaultpreflight/test/DB/browser/build/root probe/create、製品・helper・Manager文書変更、goal/spec/spec-implement/追加agentは0。以下の記録固定後、対象の全readerを停止する。

## 固定基点と直接／借用の区分

- 採用案 `phases/P5c-s4-integration-machine-plan.md`: 29,736 B、SHA256 `e404b65981180f68f176b345c1bf04bc84c5d770daea7a3c6415a8aabf289f6f`。criteria `criteria/P5c-3-S5.md`: 3,963 B、SHA256 `46c8706ed132e2becc78aa4f79d205575dee1b6dd9a72c6a4906080fcfa7f1c5`。両文書のregular600/nonlink/nlink1/canonical/UIDとNOFOLLOW読取前後のdev/ino/size/mtime/ctime、全文hashを直接確認した。
- source基点は受入S4隔離treeのimmutable commit `4cba22b7a62121b32bf72964cd62c15a9774c26f`。domain/regeneration entity/source、application regeneration ports/services/current/memory/source/read、Node regeneration memory/input・LLM config/runtimeOwnership、libsql machine/job repo・正式0043、既commitNote/history・LLM undoの必要範囲をGit objectから直接照合した。現在main working source/fullHEAD guardは読んでいない。
- design/planはS5採用節だけを照合。S4 A–F、Parser2実終了と受入局所3ケース、integration22/Parser2交差0は既独立報告・採用表の借用。後着のmain統合候補 `79ef126edd5d3440cde20dbe8fd372e7235010c5` 完成通知は借用情報で、統合受入の独立レビューをこの報告に混ぜていない。

## 契約別の比例判定

| 範囲 | 直接静的照合と結論 | 完成候補で残る確認 |
| --- | --- | --- |
| A/B 保存・受付・job | 既MachineRegenerationはHTML/Markdown、executor/command/digest、原本previous、revision/resultVersion、owner/receiptを保存できる。machine repoの候補／exact CAS／live／本人history追加とgeneric job同id同Tx、stock import claimへのmachine除外は列挙scope内で実装可能。現在stock claimはLLMのみ除外するため、この追加を省略できない。 | 同digest再受付・異digest拒否、編集lock、本人history、quota/dispatch不変更をsource/実DBへ結ぶ。通常利用者entryはSlice C。 |
| C 共有入力・current | currentInputは既machine consumerのverified executor/edit/active owner/noteVersion/ownership/source identityを検査する。共通memory上限は2×50MiB。typed prepareMachineをservices＋Node memoryへ追加し、原owned bytesを通常DocumentExtractorへ渡す案はLLM prepared text／segmentsを機械HTMLへ流用しない。通常leaseからのreadとread実閉鎖を先に確定する契約は既portに沿う。 | exact queued/owned/response-unknownのclaim protocol、初回confirmed no-claimだけ返却、unknown falseを保持、final current再検査。Parser2の実終了前にbusy/admissionを返さない。 |
| D 前任・private proof | source receiptは既machine consumerを含む。0043はmachine memory取得にもcurrent検査と共有上限を要求し、OpenRouter資格を条件にしていない。unknown ownerからの直接memory縮小／receipt closeは拒否する。提案の同Tx「exact owner closedへ第1CAS（receipt/memory保持）→同receipt closed0へ第2CAS」は合法。machine exact snapshotを既ownership ports/runtimeOwnershipへ追加するscopeも明示されている。 | native record3/acquire-confirmed前任束縛、private proof非偽造、rollback／commit応答不明の同proof saved読戻→consume/ACKをmachine対象で直接証明。legacy/unknown birthを不在推測で閉じない。 |
| E 本文・undo | 既commitNoteは本文/version、参照asset/pin、revision head/prune、browseを同UoWで採用する。参照・sanitize・projection準備を外、callerのauth/current/jobを最終Txで再検査し、本文と原本／notice／job／machine終端を同Txへ結ぶ案は実装可能。undoは保存resourcesの安全確認とresultVersion/edit/livejob/revision fenceを保ち、現在title・tags・public/shareを巻き戻さない。 | 準備失敗／final Tx失敗の全rollback、正常refs/revision/notice/browse、両形式のundo。既LLM worker/controlの共通化はcaller guard・quota/recipeの意味を変えない必要差だけ。 |
| F 通常Node・後続UI | OpenRouter判定より前に単一factoryを構築し、同input/local/native ownership/executionをLLMとmachineへ明示注入する採用契約は必要で、config/ports/DI/server/新runnerの列挙scope内で実装可能。現在LLM config内にある資源生成を共通factoryへ移す具体差は未実装。 | 同2枠と停止所有者一人、wake/boot/persistent historyを直接確認。Drive IN-07 entry・警告・pending/error・取消/undo/invalidateとP5d依存まで全Fはpending。backend成功をUI成功にしない。 |

## 実装scopeと次gate

共通bodyは既commitNote／参照／履歴の公開処理を再用し、caller guardを肩代わりする汎用実行frameworkへ広げない。既historyの安全snapshot内部関数は非exportである。実装がその関数の移動／exportを選び、列挙外 `note/history.ts` 編集を必要とする場合は、採用案の追加path通知gateを使う。現時点でそれを必須修正として差戻さない。NodeRegenerationInputのLLM専用Mapやprivate proofを抽出してmachineへ渡す必要もなく、共有memoryの通常opaque port＋新machine orchestrationで実装できる。

normal JB cancel/retry・移動/削除の不足が実candidateで確定した場合だけ、条件付きpathsまたは最小追加pathを先にManagerへ通知する。提案から新local menuや既LLM/S4 suitesの全面再演は導かない。IM-06はLLM-onlyを維持し、IN-07は後続通常Drive entryから形式に応じmachine又はLLMへ接続する。

提示root192MiB／DB最大4・合計80MiB／共有input2枠、native HTML/Markdown各1・同時1・最大Worker6、case40/group180/body430＋closure50/outer480と正常PG/EOF-FD/strict閉鎖後の有限copy/query-only監査は予算案として整合する。root名の存在確認や工具作成／実行はしていない。候補固定後にsource由来ケース・expected counts・typed ownership/normal stop・helper bindingsを独立precheckし、実行はRootの別採用後に限る。実閉鎖欠測やSQL値からprivate proof／ACKを生成しない。

結論: 採用共有契約の実装着手を妨げる確定majorなし。S5 A–Fは未実装／pendingのまま、main統合の独立受入とS5実装候補・有限検証を別gateにする。音声と実外部接続の保留を維持する。
