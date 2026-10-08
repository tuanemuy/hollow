# ZIP の期限跨ぎ・成功実体・PDF需要の最小接続案

## 要約

2026-09-26、Asia/Tokyo の source 読取に基づく後続準備。既存 [ZIP 接続判断](../design.md#一括zipの接続判断) と [保持の具体案](P4f-zip-proposal.md#成功-spool-の最小保持) は、必要な成功 spool だけの保持、未完成失敗へ7日を流用しないこと、期限内 PDF hold から専用 spool へ copy する方針まで採用済みである。本書は残る参照・型・期限判定だけを具体化する未採用案であり、正式 P4f 実装や新しい gate ではない。

推奨は、親の履歴期限と明示 retry の受理記録を分離し、成功 spool の保持を現在の組立・有効 retry・実 reader の参照から導く構成。PDF は `zip-child` の明示需要を追加し、本人/匿名 request・履歴・配信へ偽装しない。

Manager の採否は末尾の2点に絞る。資源値・新 library・依存変更・全件 snapshot 基盤は提案しない。

## 正本と現コード

| 根拠 | 維持する意味・接続上の差 |
| --- | --- |
| [EX-02/03](../../spec/scenario/export.md#ex-02-複数のノートを一括ダウンロードする)、[JB-02](../../spec/scenario/jobs.md#jb-02-失敗した処理を再試行する) | 成功 ZIP と失敗一覧、完成物7日、失敗子だけ同対象/設定で retry、assembly 中の retry 全拒否。成功子を再生成して failed-only と呼ばない |
| [ZIP 接続準備](P4f-zip-contract.md#retry部分失敗寿命)、[ZIP 具体案](P4f-zip-proposal.md#成功-spool-の最小保持)、design ZIP 節 | 親 createdAt+90日固定。新 attempt と実 close の最小参照は別保持。完成物と never-published failure を区別する |
| [batchRepository](../../packages/core/src/adapters/libsql/repositories/batchRepository.ts)、[batch usecases](../../packages/core/src/application/batch/usecases.ts) | 既存 batch は新子/active で親一覧を残し、旧子 title を別に消す。ZIP の「旧親表示期限は延ばさない」へそのまま転用しない。lease/同内容受理/latest-failed/親generation排他は再利用できる |
| [PDF entity](../../packages/core/src/domain/pdf/entity.ts)、[request prune](../../packages/core/src/adapters/libsql/repositories/pdfRequestRepository.ts) | request の historyExpiresAt、artifact の publishedAt/expiresAt、compute の workspaceRemoved は別。prune は現在本人/匿名の参照を検査するが ZIP 参照はない |
| [PdfDemand port](../../packages/core/src/application/pdf/anonymousPorts.ts)、[共用 demand repository](../../packages/core/src/adapters/libsql/repositories/pdfDemandRepository.ts)、[worker](../../packages/core/src/application/pdf/worker.ts) | union は account/anonymous のみ。find は有効候補1件、running/succeed/fail は集合処理。publish と succeed は同 UoW で、有効需要0なら公開しない |
| [artifact repository](../../packages/core/src/adapters/libsql/repositories/pdfArtifactRepository.ts)、[storage owner](../../packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts) | cached は期限内だけ。cleanup/cleaned は既存 delivery と active owner を検査するが、内部 copy 前の予約 hold は知らない。新 hold を cleanup・物理 delete・prune の全境界へ接続する必要がある |
| [PdfTransfers](../../packages/core/src/adapters/node/pdf/transfers.ts)、[delivery stream](../../packages/core/src/application/pdf/deliveryStream.ts) | 現在の runtime Map は本人/匿名の実配信2枠。内部 copy の待機/読取をこの配信へ偽装しない。実 reader/withOwner 終了前に解放しない順序は共有する |

## 1. 親90日を延ばさない最小参照

以下は論理 entity の形であり、table 数や SQL 列の確定ではない。既存案の親・子・assembly・artifact へ必要な項目を置き、同じ情報を複製しない。

| 記録 | 最小内容・用途 |
| --- | --- |
| `ZipParentShell` | id / actorId / command と inputDigest、元 createdAt / historyExpiresAt、固定 target ordinal・note ID / options、現在 generation / cancel fence。履歴期限後は旧 title・説明・旧 attempt 詳細を返さない。現在試行と同内容受理の照合に必要な値だけ残す |
| `ZipRunReceipt` | parentId / 明示受理 generation、acceptedAt、受理 digest、当該新 attempt IDs、state、今回 outputArtifactId。初回は親受理、failed-child retry は明示再受理が起点。内部 assembly や自動的な単調除外は新受理に数えない |
| `ZipTargetAttempt` | parent/ordinal/note、attempt ID / retryOf / createdAt、snapshotIdentity/profile、現在結果・定型理由、spoolRef 又は PDF待機 ref。成功を再生成せず、最新版への無言差替えを防ぐ |
| `ZipRetentionRef` | spoolId と owner（受理generationの active work / retry support / assembly reader）、必要な ordinal。retry support の失効時刻は下表の既存寿命から導出し、poll/閲覧/lease renewal で延ばさない |

`ZipRunReceipt` は既存の受理 generation に束縛した最小記録を指す。汎用履歴サービスや別の親 job を増やす案ではない。新 attempt の履歴は受理したその attempt の createdAt+90日、同時に受理された試行群の表示はその範囲だけとする案を推奨する。旧親の historyExpiresAt は変更しない。組立だけの明示 retry は採用済みどおり新親/retryOf を作り、新親自身の履歴を持つ。

元 JB-01/02 から決まるのは90日履歴・同対象/設定の新試行・失敗子retryによる親再開である。親の固定期限、新 attempt の新時刻、期限跨ぎの最小 shell 保持は既存 design が補っている。期限後の専用表示 DTO、試行群の履歴を新 attempt の createdAt+90日でまとめる exact shape は未指定であり、本書の提案とする。古い親をそのまま一覧へ再掲する実装は推奨しない。

同 command / 同 digest の再送は元 receipt・acceptedAt・generation を返し、保持期限を再計算しない。poll、旧成功の再通知、空の retry、最新 failed がない retry は新しい保持根拠を作らない。純粋 assembly retry も現在の実失敗・有効な再試行元と明示新 command を要し、成功済みや取消済みを失敗へ偽装しない。実際の失敗を現在確認して受理する新 attempt と、no-op 再要求による滑動保持を区別する。

### 期限跨ぎの取得と表示

例: D0 の親で子の一部が失敗し、当該 generation は一度も ZIP を公開できず、D89 時点にも有効な failed-child retry の根拠が残っている。この前提で D89 に失敗子 retry を受理し、D90 を跨いで D91 に終端する。D90 に旧親の通常履歴と旧 title/詳細を隠す。D89 の試行は現在本人の「再試行の処理」として最小 receipt/件数/新 attempt の状態を返し、実 close まで継続する。古い成功子は ordinal と必要な spool ref で扱い、過去 title を note から補完しない。

完成 partial ZIP がある場合は、artifact と失敗履歴の両方が有効な間に retry を受理する。例えば D0 公開・D7 失効なら受理は D7 の失効時刻より前であり、D89 の新 receipt による再試行・復活はできない。期限内に受理した retry の継続と、期限切れ後の新規 retry 受付を区別する。

- D91 に ZIP を公開できたら、その artifact は D98 まで取得可能。現在本人 + artifact 期限 + 全含有 note の現在 read/content を検査する。旧親の履歴期限を成果物の7日取得拒否へ流用しない
- D91 に子が再失敗した場合、新 attempt の有効履歴から現在確認して retry できる。元親の title や旧履歴を復活させない
- D91 に子が全成功し assembly だけ失敗した場合、failed 子がないことを理由に spool を捨てない。D89 の受理記録へ未完成 assembly の失敗を束縛し、同記録の有効期間内の明示新親再試行に必要な ref を残す
- D89 の新 attempt / receipt の履歴期限も過ぎた後は、進行中/実 close、まだ有効な成果物、回収負債に必要な shell だけ残す。旧履歴の表示や新しい failed-only retry の根拠にはしない

表示と worker 認可を分ける。受理済みの有限実行は親履歴の cutoff だけで取消さず、現在 actor/read、明示取消、外部失効、実行世代・工程期限を検査する。shell の存在だけでは取得を認可しない。

新親へ成功実体を引き継ぐ場合は、新親が必要な固定 target/options・成功結果・spool ref を自分で所有する。`retryOf` は来歴 ID であり、旧親→祖先全履歴を永遠に保持する強い依存にしない。同一 physical key の共有参照は保持し、二重 copy を必須にしない。

## 2. 必要な成功 spool だけの保持と prune

成功 spool は portable file の key/bytes/hash/format/profile/sourceIdentity と組立に必要な安全な entry 名・ordinal だけを持つ。元本文、媒体 pack、Chrome workspace、失敗子の未完成 bytes を retry 保持へ混ぜない。

| 保持根拠 | 取得・引継ぎ条件 | 解放条件 |
| --- | --- | --- |
| active run / assembly | 受理時に再利用する成功 spool の ref を同 Tx で確保。新成功の確定時も同 Tx で追加 | 次の retry support 又は公開後の不要判定へ引き継ぎ、全 reader/writer close 後に解放 |
| 今回 generation が一度も publish していない失敗 | 初回は親の有効失敗履歴、受理済 retry はその新 attempt / receipt の有効履歴を根拠に必要な成功実体だけ保持 | 有効な retry 根拠がなく、active/reader 参照もなくなった時。7日では切らない |
| partial ZIP の failed-child retry | 現 artifact の有効期限と当該失敗履歴の両方が有効な間、成功 spool を保持 | 期限内 retry が受理済みなら active run へ同 Tx 引継ぎ。それ以外は retry 不可となった時点で不要 ref を解放 |
| 全成功 ZIP | publish と全 close まで spool を保持 | 全 close 後に子 spool は不要。完成 artifact 自体は publishedAt+7日を維持 |
| 明示取消/対象の失効・単調除外 | 当該将来利用を fence。ほかの正当な親/reader の ref は残す | 実 close と当該 ref 終了後。削除失敗は容量付き負債 |

「今回 generation が未完成」を判定し、親の過去 generation に完成 ZIP があったかだけで切らない。例: partial ZIP の期限直前に受理した retry が assembly 失敗した場合、旧 ZIP の expiresAt はその失敗の retry 期限ではない。必要 refs を新試行の有効失敗履歴へ引き継ぐ。逆に期限前 retry を受理していない完成 ZIP の期限切れは、採用済みどおり明示新要求とし、裏で再組立しない。

回収は有限候補と indexed な存在検査で進める。全 bytes や全履歴を JS に集めない。

1. 各記録の表示期限で title/詳細を消す。active / 有効成果物 / 有効 retry / 実所有 / delete debt に必要な最小参照は消さない
2. retry support の終了を判定する。新 retry の受理と同 UoW で ref を引き継ぎ、prune との隙間で成功実体を失わない
3. spool の cleanup claim は利用 ref・非closed reader/writer が0のときだけ成功する。cleanup 世代へ進めた後の新 hold は拒否する
4. 実 remove と削除 receipt の確認後だけ bytes を解放し、removed にする。lease 期限や中断要求だけで容量を戻さない
5. parent/attempt/compute/artifact shell は、子・成果物・hold・実所有・回収負債から参照されなくなってから prune する。履歴親の cascade で実資源を失わない

同じ key は参照数にかかわらず一度だけ容量計上する。PDF→spool の copy 中は実際に2実体あるため両方を計上する。保持を約束した partial/never-published の成功 bytes を、容量不足によって自主的に早期回収しない。新受付の容量判定・pure cleanup と本人 active 枠の分離は既存設計を維持する。

## 3. zip-child需要と短命PDF hold

### 最小型と遷移

`PdfDemand` へ `kind: "zip-child"` と `attemptId / parentId / acceptedGeneration / actorId / noteId / sourceIdentity / profile / computeId` を持つ branch を追加する候補。正本は ZIP の子 attempt であり、同じ需要を第三の独立 demand table に複製しない。本人/匿名 row・cookie・ticket・本人単件履歴は作らない。

PDF 関連の子状態は `waiting-pdf → copy-ready → copying → succeeded(spoolRef)` として区別する案。共用 PDF が ready になっても ZIP 子成功ではない。`copy-ready` は対象 artifact の有効期限内取得済み内部 hold を必須にし、copy の検証・終了・spool 公開が済んで初めて成功となる。

hold は `id / childAttemptId / acceptedGeneration / artifactId / artifactGeneration / acquiredAt / state(held|reading|closing|released) / runtime・claim` を最小形とする。artifact の期限は複製した業務 TTL として更新せず、取得時に ready・expiresAt>now・identity/profile・現在 ZIP read・取消世代を同 Tx 照合する。

### 共用PDFへの差分

| 現在の接続先 | 最小差 |
| --- | --- |
| `PdfDemandRepository.find/running/succeed/fail`、`currentAnyPdfDemand` | ZIP attempt の現在有効な waiting-pdf branch を追加。最大1候補/集合処理を維持し、無効な先頭のZIP需要で有効な本人/匿名兄弟を止めない |
| PDF worker の snapshot dispatch | zip-child では actorId の現在 read と identity を確認する ZIP adapter/application helper を明示呼出し。匿名 branch への fallback を避ける。元 source scope 固定や親履歴期限を現在readの代用にしない |
| 共用 artifact publish + demand succeed | ZIP へ渡す場合、publish と同 Tx で現在有効子を copy-ready にし内部 hold を確定する。有効需要更新数に ZIP を含める。PDF取得準備だけをZIP子 succeededと数えない |
| cache join | 期限内 cached の取得と ZIP hold 作成を同 Tx にする。cache miss は既存同 note/identity/profile の計算へ合流する。期限切れ実体へ新 hold を付けず、元 artifact の publishedAt/expiresAt を延ばさない |
| PDF claim/renew/recover・object owner の current predicate | ZIP の取消/外部失効/実行世代を含める。oversize/取消は当該 ZIP 需要だけ外し、兄弟需要があれば共用計算を残す。復旧も本人/匿名だけを失敗化して ZIP を orphan にしない |
| artifact cleanup/cleaned・request側の artifact/compute prune | 非released ZIP hold、ZIP attempt の compute/artifact 参照、実 zip-source owner を存在検査へ追加。型 union 追加だけで完了としない |

### copyと実close

期限内 hold を得た後は、ZIPの有限工程所有の下で `zip-source` read owner を開き、期待 bytes/hash を検証して専用 spool へ逐次 copy する。取得後に元 PDF の24hを跨いでも既存 hold でその copy を完了できる。新しい用途への hold 再発行や通常 PDF 配信は許可しない。

spool 側 writer と source reader の実 close / withOwner 終了を確認し、現在 ZIP 認可・identity・generation を再確認して spool 成功と ref を確定する。runtime の所有解放後に DB hold を released とする。DB 解放が失敗すれば保持が残る安全側にし、実 close 不明なら hold/容量を残して既存の所有不明回復へ渡す。取消時も同じ順序で、未公開 spool を通常 cleanup する。hold 期限/lease timeout は abort の理由であり close 証明ではない。

現在の `NodePdfTransfers` は実配信2枠と delivery 寿命を持つため、その union に内部 copy を足すだけの接続は推奨しない。ZIP の既存設計上の工程 owner で内部 copy を監督し、共通 ObjectStorage の owner/実 close/回収を再利用する。本人/匿名の配信2枠や単件120秒は変えず、ZIP側の有限実行・容量予約と接続する。新しい具体枠・期限値は本書では決めない。

## Manager判断と未検証

採否を求めるのは次の2点だけである。

- 親90日後の表示を「新 retry の受理generationと新 attempt の最小 receipt」に限定し、新 attempt の createdAt+90日と active/成果物の現在寿命から取得可能性を判定する形。親の旧履歴・title・作成日を延長せず、純粋 assembly 失敗も当該 receipt から新親へ再実行する
- ZIP子を共用PDFの明示第3需要とし、copy-ready と専用内部 hold を同 Tx で確定する形。PDF配信とは別の ZIP 工程 owner を使い、既存実配信枠は不変更にする

成功 spool の必要範囲保持、PDF期限内 hold→検証copy→実readerclose→解放、完成7日/親90日不変は再決議しない。具体 DTO 名、table配置、index/DDL、有限処理の数値、library は正式担当の詳細案へ残す。容量負担のため有効 retry を短期で打ち切る変更はこの案に含まない。

本書以外の書込はない。コード・DB・test・build・git・runtime・browser・proof・鍵・外部サービスを変更/実行していない。P4e実装のレビューや独立検証にも参加していない。提案の型・参照・容量・移行・実 close は未実装/未測定であり、成立済みとは扱わない。全文確認後、文書を含む全操作を停止する。
