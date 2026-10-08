# P5c-3 契約案の限定静的確認

2026-10-01。対象は `phases/P5c-3-contract.md` 全 180 行と `reviews/P5c-3-plan.md` の M1–M5。公開 source の必要箇所だけを照合した。製品・DDL・helper・管理正本の変更、test/import/runtime/DB/browser/HTTP、旧 private 読取は 0。本書だけを作成した。

判定は「方向は採用可、下記の接続順・guard 例外を実装委譲前に具体化」。設計を成立不能にする矛盾は確認していない。SQL・型・実行の成立を証明したものではなく、独立した動的受入でもない。

## 採用可

- M1/M4：現在の実行者の編集権限と記録本人の Drive 資格を分離し、immutable record を明示選択する。現在の backup head/folder や記録者の WS 在籍を取得条件へ流用しない。二軸の永続 fence、取消確認の consumer 単位集約、admissionSequence の接続はレビューと整合する。
- M2：local/Drive の耐久 discriminator と旧行限定 backfill、machine 専用 receipt、共通 body-operation resolver の方向は妥当。`application/llm/current.ts:47` は `Original.activeJobId === jobId` を現在性に使うため、machine ID を格納するだけでは不十分だが、案の共通 resolver・受付 CAS・全 live set の SQL guard はその不足を認識している。
- M3/M5：Drive native owner と buffer/consumer owner を分け、Drive ACK 後も必要な memory/pin を保持する方向は矛盾しない。取得と final-check を別 attempt にし、unknown/未 ACK を時間だけで解放しない。全所有終端後の参照解除→全世代 purge はレビューに合う。

## 実装前の具体化が必要

### 1. 双方向 FK と合法な redaction の例外

案 L73 の「双方向一致・discriminator 消去拒否」を常時即時 guard として実装すると、同案 L164 の `redacted / binding NULL` への移行を拒否し得る。これは現製品欠陥ではなく、未作成 SQL の例外定義がまだ文章上閉じていない点である。

binding を先に INSERT する時点と、安全終端後に consumer の参照を先に外す時点では、一時的な片側関係が必要になる。deferred FK だけで独自 trigger の即時検査も遅延した扱いにはしない。既定拒否と、同 Tx の正規受付／安全 redaction の許可条件を分け、commit 時の完全性を維持すること。binding→consumer の削除動作も明記し、consumer を先に物理削除して即時 RESTRICT に抵触する順序にしない。

案の順序（安全確認→consumer redaction→attempt 削除→binding 削除→既全世代回収）は成立可能な方向。通常 90 日 prune も同じ参照解除を先行し、unknown/未 ACK/memory 保持中は開始しない。FK 無効化や binding の別 consumer への付替えは不要。

### 2. caller-end と buffer 返却を同じ callback 内で待たない

`adapters/node/drive/execution.ts:214–224` は `await settle(value)` の終了後、`finally` で caller を ended にする。したがって settle callback 内でその caller-end を待ってから buffer を返す実装は循環待ちになる。

必要な順序は、内側 attempt の native 終了・proof 保存を終え、`withCaller` を返して caller-end を成立させ、その外側で正規 ACK を完了し、最後に reader が buffer+lease を返すこと。consumer 全体の終了をここで待たない。`execution.ts:371–383` の acknowledge 自体は caller-end を待つ API ではないので、「呼べた」ことだけで順序を証明しない。

memory lease はこの中間区間も保持し、ACK の前提を buffer 解放にしない。buffer は ACK 後の分類に必要なので、解放は分類 worker/pipe 終了・参照破棄側で行う。この分離なら案 L93/L113/L130 に不可避な循環はない。取消・close 不明時は返却を拒否しつつ、所有解放は実終了条件で判定する。

### 3. source memory の単位と既 local の待機意味

global 2 consumer を local にも適用すると、machine/preview と競合した local LLM の実行待ちが増える。既 LLM global 2/account 1 を変更しないことと、実効的な並行可能数が常に不変であることは同義ではない。資源制御として採用可能だが、原本選択・recipe・quota・preview 期限を再定義しない接続が必要。

既 LLM は受付で quota を reserve する（`application/llm/request.ts:193`）。source 枠待ちを再受付・追加 quota 消費・無期限待ちにしない。既 pending PDF は同じ consumer 内で分類用 read と準備用 read を逐次実行する（`application/llm/worker.ts:191,236`）。同一 lease の再利用か、参照/worker 終了後の解放・再取得かを固定し、自分の予約を保持したまま第二の予約を要求しない。

既 preview は分類終了後に ready / owner closed を保存する（`application/llm/pdfPreview.ts:397–427`）。その時点で入力参照と worker が終わっていれば source memory を返し、利用者が確認する 5 分間の ready receipt と memory 所有を同一視しない。これらは案 L119/L130 の実現方法の具体化であり、新しい利用制限を追加する要求ではない。

### 4. machine の共通 lock は既入口一覧で閉じる

案 L75–77 の三種 resolver と共通 guard を採用する。実装前の exact path 一覧では、本文採用・編集・restore・変換取消/retry・trash/move と Original の失敗復帰が同じ所有判定を通ることを対応付ける。新 machine 表の UNIQUE だけで既 import/LLM との競合を解消した扱いにはしない。前値復帰は exact activeJobId/世代 CAS のままとし、成功した別処理の値を戻さない。今回、全入口の広域監査は行っていない。

## Root 方針との文言上の不整合

案 L174 の「逆移行の exact SQL」を実装開始の必須条件に含める読みは、Root 決定と一致しない。必須は正式 migration の原子的失敗 rollback と旧値・guard 保全。適用後 downmigration の新機能は要求しない。新行受理後の無条件旧 binary 起動や unknown 強制削除を許さない安全上の注意は維持できる。

以上は一周の静的確認であり、案の再作成・SQL 作成・新要件追加は行っていない。本書 EOF 確認後、全 read/write/run を停止して Root へ返却する。

EOF
