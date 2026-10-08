# C1 Drive HTML/Markdown LLM plan — 条件付き計画判定

2026-10-06。対象 PUBLIC plan `P5c-3-drive-llm-c1-plan.md` は 24158 B / SHA256 `fb729a8a5ffec19b85fb9661112b559d8c3a998ce0bef56512e929b7e5a7d94b`、regular600/nlink1/full stable を直接確認した。controlled SOURCE は記録 candidate `5214cf94bfd4df7b9da002775d65394c9c17b9d3`。plan の named20 / 247559 B について canonical・regular・self UID・nlink1・NOFOLLOW FD/path 前後同値・全文 SHA256・Git blob が正式 table と一致した。全1473 walk / Git current HEAD・clean scan はしていない。C0-F2 作者修正中の machine runner は読んでいない。

**契約方向は条件付き PASS。未実装を FAIL としない。ただし現案は implementation-ready ではない。** no-DDL generation と必須 finalizeDrive の方向は既型・schema・source lifecycle に接続可能である。原 callback / proof を保持する応答不明回復の具体 port と maintenance 順序は、以下 C1-P1 として writer 採用前に固定する必要がある。C0-F2 の独立受入は別の必須依存である。

## PASS: no-DDL generation と同Tx source snapshot

`domain/llm/entity.ts` の non-PDF branch は pdfProof=null / sourceOwnershipGeneration=null、`llmSchema.ts` の llm_conversion_preparation CHECK も pdfSelectionManifest=null の行に同列 null を要求する。現 llmRepository codec の null/PDF 分岐と一致する。ここへ Drive generation を入れる案は既保存契約と矛盾するが、今回 plan はそれを行わない。

SourceAccess の drive-record bindingId と保存済 sourceBinding.ownershipGeneration を使う案には、この列の変更は不要。`regeneration/current.ts` の inputConsumer は現 LLM branch で row.sourceOwnershipGeneration を返し、currentDriveSource は binding.ownershipGeneration と入力値を厳密比較する。このため「provider だけを注入する」では null が渡り正常 Drive capture に到達できない。plan の同Tx resolver はこの具体不足を正面から扱っている。

resolver は exact bindingId / llm-conversion consumer.jobId / executor / note / original / requestDigest fingerprint / cancelGeneration / source sha+bytes を束縛し、保存 binding generation と現在 driveBackupTransfers.sourceGeneration を同Txで照合して正の値を返す必要がある。現在世代をそのまま binding の代替にせず、null wildcard にもしない。LLM current と inputConsumer/capture が同じ resolver を使うと、active lease と closed final Tx の両方へ同 snapshot を通せる。PDF preview 世代・local・machine の意味を保持する計画と整合する。動作・実DB互換の証拠はまだない。

## PASS: 正規 admission・current・サービス依存

- 新 Drive request が selected exact record→target→original を用い、executor OpenRouter と recorder Drive を別資格として検査する。regenerationRecordState / currentDriveSource の既 account・subject・epoch・record qualification と整合する。
- 同 command readback を新受付の noteVersion/livejob 検査より前に置き、現在 actor/edit は再検査する。同 digest・Drive access の既 receipt を返し、machine↔LLM と changed content を conflict にする方向は既 machine command の対と一致する。cross-kind 並行競合は実証前に成功扱いしない。
- binding/job/batch/original と admitLlm を同 UoW に置く。local の公開 request を nested run で呼ばず、既 admitLlm の recipe・admissionSequence・quota/dispatch を保つ方針は適切。なお monthly limit の既正常挙動は failed terminal row を保存して返すので、plan の「失敗は全 rollback」は insert/repo 等の例外に適用し、この既 terminal outcome を rollback に変えない。
- retryLlmJob の Drive→local fallback を明示 conflict に限定する。Drive 適格判定を leasedLocal/leasedText の単なる全体緩和にせず、Drive専用 branch として置く。
- provider+drive の半構成を拒否し、既 regenerationServices の SourceExecution required confirmSourceAcknowledged validation を再用する。finalizeDrive は typed Drive-capable stage に必須とし、optional-call absence を成功扱いしない。Promise<void> ACK の成功は原 await return、拒否/不明は unknown/held とする。
- shared regeneration を一度構築した後、single NodeDrive pair を LLM stage と recoverLlm より先に提供する。現 server は createNodeLlm→recoverLlm→createNodeDrive の順であり、stage を再構築する代わりに順序を直す必要がある。既 objectStorage/base と forward wake を使い、input/execution/ownership の original references と2枠を維持する方向は実装可能。custom factory が同型の必須 capability を提供するかは将来 candidate checks で確認する。

## C1-P1: 原 callback を保った回復の具体契約が必要

これは未実装を欠陥扱いする所見ではなく、現 source の能力と計画上必要な挙動の間の、writer 採用前の境界補正である。

現 NodeRegenerationInput.prepare は retained prepared を保存してから finish を await し、そこで prepare 用 storage.withOwner callback が返る。Driveだけ finish を後置する変更には、plan が要求する通り、dispatch / restore / sanitize / projection / finalCheck / finish を同 original withOwner callback 内に置く必要がある。既 prepare-only callback を保持したまま leaseだけ長くする変更では original storage owner が先に終了する。

現 input.finish は WeakMap の同 original proof を再用し、finishInput が DatabaseError のときに保存 row を読み、owner unknownでない・memory0・same receipt・原 input.verify を確認できた場合だけ consume する。保存 transaction rollback や読戻不明では proof/lease/retained が残り、正常 return しない。現 input.resume は begin admission intents の回復であり、finish proof の保存回復や original processing callback の completion deferred を提供しない。

現 worker は catch で finish を試み、その失敗を unproven として owner/outcome unknown に保存する。sweepLlm は unknown owner を skip する。したがって、この既コードをそのまま使って「応答不明は元 callback を保持して正常回復する」とは言えない。単に withOwner 内 catch が reject したこと、lease map が消えたこと、rowが終端であることを閉鎖・自然finallyの証明にしない。

最小補正は次を明文化すること。

1. finalizeDrive の正常 postcondition: same active lease finalCheck の actual closure→saved read/callerEnded→原 void ACK→same original input finish proof→closed receipt/memory0 の確定読戻/consume。closed lease へ新 read/新 proof を作らない。
2. input finish 取得後の保存応答不明だけを扱う typed pending completion/recovery 契約: original lease/proof と source/runtime/token/g/consumer に束縛し、original withOwner/execution callback の deferred を保持する。read/native/Drive ACK 不明は held のままで、この成功回復へ混入しない。
3. exact saved receipt/proof・current/outcome確認後だけ同 deferred を解き、原 callback return と原 storage/execution finally を進める。取消/期限/stopを根拠に success resolve しない。final body transaction の成否と入力閉鎖の成否を分け、possible-delivery と quota を not-sent に戻さない。
4. active execution / stop待機中も admit=false の回復が進む。C0-F2 corrected stopだけに依存して LLM側の新循環を作らない。

ports.ts / services.ts / worker.ts / NodeRegenerationInput は既11source scope内でこの契約を具体化できる候補である。既 LLM runner の maintenance/stop が追加 recovery wake を必要とするなら、最小追加 exact path `packages/core/src/adapters/node/llm/runner.ts` を **編集前** に通知・採用する。shared execution の machine専用 confirmClosed を LLM boolean/clone callback に流用する案、private runtime/proof factory 増設は認めない。今回は補正実装も source import もしていない。

## 確定範囲と次の判断

11 source + 3 tests は admission/current/no-DDL/Drive lifetime の SOURCE phase として比例的な範囲である。必要 port の契約補正後に exact diff を固定し、whole typecheck→lint:fix→format と型/codecの正常・拒否対を別採用できる。論理 test は genuine native closure/ACK を代行しない。native所有/応答不明回復、body/refs rollback、取消・期限・失権、通常boot-stop、後続 C2/C3/main/build/browser の実根拠は未検証である。

S5 B/C/E と F backend の一部への方向整合を確認したに留まる。S5 A/D/F、IN-07 の通常利用者経路、IM-06既LLM、R03/R08/R10の全条件を完成へしない。local machine独立menu、新POST、PDF/image/audio追加、DDL、実Google/OpenRouter/認証/費用の接続は今回範囲外のまま。

根拠の直接部分は plan、named20 source、criteria S5（6285 B / fc37135e92fbff63fd8de9a40357efbbdb6641bb65555a8946b22179c115e3f0）、採用 Slice C plan（17974 B / a2206304353805a8d79558129fe10f2676c669901eeee1a0cf102b9d0d922b13）。先行 C0停止不足・S5/Parser受入・wholechecks 等は既報告借用であり再演していない。current main / B / 全 generated-private / 旧 roots は非操作、runtime/default/probe/import/test/DB/native/browser/worktree create 0。管理正本・製品・helper変更0。本レビューだけ wx600 固定し、ALL read STOP。
