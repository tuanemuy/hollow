# Drive machine C0 製品候補：独立SOURCEレビュー

判定：**FAIL（C0-F1：machine callerより先に共有Drive executionを停止する）**。同Tx受付、DB current fence、原proof/ACK、同shared資源の型付き合成には以下の限定STATIC PASSを認めるが、C0の正常boot/stop候補としては差戻す。actual tests/runtime/provider/DB/native/build/browserは実行0。実際のshutdown障害が発生したという観測ではなく、固定SOURCEから到達可能な停止順の欠陥である。

## 固定候補と直接照合

- 候補SOURCE `/Users/hikaru/github.com/tuanemuy/hollow-p5c-drive-machine-721bc7ad-20261006`。HEAD `204482e52c6e8bfc4828a56aba4800c6fa13bbd3`、parent `721bc7ad2741b673db9b2ab22023b7071e283212` を直接Git照合。
- 提出phase `phases/P5c-3-drive-machine-c0.md`：164378 B / SHA256 `1c28145383cf2be71e72ab6c2af7aab6f433e8a54920b1b3728d0e039c959b6a`。全文読取、0600 regular。巨大compressed manifestは出力せずmemory decode。281985 B / `0451cc353dc4fd474be40bb67a64a5b117cda7c46b8be2a4152ee73450d4180b`、6column row `[path,Gitmode,Gitblob,bytes,SHA256,kind]` を直接照合。
- 正式Slice C proposalと独立設計レビュー `reviews/P5c-3-drive-slice-c-plan.md` のC0 scopeを使用。Drive HTML/Markdown machineだけを対象とし、未採用のC1 LLM、C2 P5d shell、C3 GET/POST/UIを本候補へ要求しない。
- 全1473 regular / 21295912 Bとsole AGENTS内部linkを、既manifestのexact named pathsのみでlstat・O_NOFOLLOW・fstat前後・bytes/SHA256・Gitblobに照合。regularはselfUID/nlink1、Git100644→0600、唯一Git100755→0700。AGENTS.md→CLAUDE.mdのlink bytes/Gitblobを検査。未知entryのwalk/absence検査はしていない。
- pair `914388b38acb83a7fcd6c260850d3f10d9bb697711a0f1335e5dd6e1cc14ab50`、shape `846e3c4b64c57631fcf53c385aa4e713c6b98518891829a2a09f973ed415f1a6` が直接一致。親との差はexact13（product11/test2）、outside13=1461 entriesのGitmode/blob不変。tracked/index差0。package/lock/DDL/Parser2/既native testsはoutside同値から継承する。
- 最初のmanifest検査scriptはkindを誤ってsymlinkと仮定して停止した。公開manifestのsole kindがlinkであることを確認して検査scriptを訂正し、上記全照合に成功。候補SOURCEの変更やguard緩和は行っていない。

## C0-F1：停止順が新Drive machine callerをunknownへ送る

重大度：blocking。採用設計は新begin拒否→machine/LLM caller drain→共有Drive停止を要求する。新pairを使用するmachine workerに、既shutdown順をそのまま適用できない。

SOURCE根拠：

- `apps/web/app/server.node.ts:631` quiesceはfrontdoor accepting=falseの後にdriveRuntime.quiesceを返す。shutdownの`:640`でこれをawaitし、`:645`で初めてmachineRunner.stopへ進む。
- `apps/web/app/driveRuntime.node.ts:88` quiesceがDrive runner.stopを開始する。
- `packages/core/src/adapters/node/drive/runner.ts:67` stopは同execution.stopを先に開始して、終了確認とreconcileを行う。
- `packages/core/src/adapters/node/drive/execution.ts:444` stopはstopping=trueとし、既entriesだけをabort/ended待機する。`:179` withCallerの新claimは!accepting()でunavailable（DriveTransportError）となる。
- `packages/core/src/application/regeneration/worker.ts:312` acquireは原sourceのclosure/save/read/ACK後に返る。`:361` final-checkはextractor/body準備後、同lease activeで新source withCallerを必要とする。
- `packages/core/src/adapters/node/regeneration/memory.ts:229` prepareMachine成功時`:249`にbytes=nullを置き、busyを元finallyで戻す。この時点では正常なactive leaseであり、原finish proof取得前である。
- worker`:368`はDriveTransportErrorをBusinessRuleError又はclosed LlmOperationErrorとして扱えないため、input.unknown→LLM_OWNERSHIP_UNKNOWNへ進む。外側`:510`以降も元unknown保持へ進み、普通の取消/成功として解放しない。

具体的に到達可能な交差：Drive acquireとACKが終了し、機械extract/bodyが進行中→shutdown/quiesce開始→その時点のDrive source entryは既ACK済でなくなっており、Drive stopはstopping=trueのまま終了可能→機械処理が戻りfinal-checkに入る→停止済の同Drive executionが新claimを拒否→正常入力がproof無しunknownに保全される。unknownを解放しない現workerのfailclosed動作自体を緩める修正は不可。新合成によりこの停止順の問題が通常machine callerへ広がる。

最小修正方向：通常frontdoor/Drive HTTP新begin拒否と、共有Drive executionの最終停止を分離し、元machine callerとそのfinal-check/ACKが正規終了又は正規取消/未証明保持へ確定するまで同Drive資源を残す。単にshutdownのawait順だけ入れ替えても、公開quiesceを先に呼ぶlauncher経路が同executionを止める点を残してはならない。server.node.tsの既採用pathだけで成立しない場合は、exact `apps/web/app/driveRuntime.node.ts` 等の必要最小scopeをRootへ先に提案する。DriveExecution.accepting/原proof/ACK/private能力/unknown releaseの条件は変更しない。

比例回帰の必要境界：acquire ACK済・機械準備中から正規quiesce/stopを開始し、machine final-checkと原closure/save/read/ACKの因果又は正規取消を観測し、Drive最終stopが先行しないことを確かめる。fake callback成功をnative closureへ転用しない。今回はそのtest/runtimeを作成・実行しない。Rootへfindingを通知し、RootはC0-F blockerとして採用済み。

## 限定STATIC PASSの範囲

| 境界 | 直接SOURCE根拠と結論 |
| --- | --- |
| admission/同Tx | driveRequest.tsはrequireRegenerationNote→既machine/LLM command照会→exact record/target/original/recorder/linked subject→binding insert→admitMachineRegenerationを一つの原UoW内で行う。machine/generic同ID、useAi=false、original.processing、revision baselineを同Txへ置く。binding consumer FKは0042のDEFERRABLE INITIALLY DEFERREDで、先binding/後machineの循環を同Tx内で解く。wakeは原run成功後だけ。 |
| intent/local保持 | driveMachineIntentはversioned recipe/note/noteVersion/record/machineの固定配列、generated ID/進行を含めない。同executor+command同内容は元receipt、変更又は既LLM commandはconflict。local request digestと既head→job→batch→generation→write順はdiff上維持。selected record.originalIdから採用し、findByNoteへのfallback無し。 |
| current/finalTx | currentDriveSourceはbinding consumer/executor/cancel/original/note/generation/fingerprint、immutable record/target、recorder資格、linked epoch/subject、hash/bytesを再検査。currentMachineは既actor/edit/workspace/noteVersion/revision/ownershipGeneration/generic lease/original currentを検査した後、machine fingerprint付き同helperを呼ぶ。closed入力のDB fenceにactive receiptを要求しない。active captureは別途receipt/runtime/token/generation/memoryを検査する。 |
| final-inspect/receipt | Drive限定でprepareMachine→prepareBody→final-check phase→原readInput(final-check)→原input.finish/finishInput→最終Tx。prepareMachine成功後bytes=nullのため既startReadと矛盾しない。closed receiptへ新read/proofを作らない。local acquire/prepare→finish→prepareBodyの順は維持。0043は全source attemptsのcallerEnded/acknowledged確定なしにmemory減少を許さず、本経路はACKを先にawaitする。 |
| ACK不明 | 原acknowledgeSourceClosureはoriginal proofのclosure identity/caller-ended→保存→original acknowledge→保存/readback→confirmSourceAcknowledged(proof) Promise<void>を一回だけawaitする。新catchは同leaseをunknownにしclosed=falseのLlmOperationErrorを投げ、finish/adoptへ進まない。voidをbooleanへ変換せず、元private proof/ACKを複製しない。既finish応答不明のdeferred/正規readback/consume/finallyは変更されない。 |
| provider | sourceProvider既ファイルの差はmetadata応答後checkCurrent一呼出のみ。既同read内のbefore/after remote version比較とhash/bytes/parent/trash/canDownloadを維持。final inspectはrecordとの再照合であり、別attempt間のremote version同値・遠隔変更との原子的Txを新たに保証しない。 |
| shared refs/型 | MachineServicesは既RegenerationServicesのall-or-none provider/drive unionを組み込み、required SourceExecution ACK能力は既factory guardで検査。createNodeMachineは元shared input/local/execution/ownership/progress/extractorを再用し、元NodeDriveHttp/DriveExecutionのpairだけ合成。Node shared生成はOpenRouter判定前の同一回で、後段はwrapper合成だけ。半pair/別memory/新native能力無し。 |
| control/scope | Drive retryはREGENERATION_RECONFIRM_SOURCEで明示拒否しlocal-originalへ落とさない。C1 LLM用current/inputStage/DI/requestはoutside不変で未対応。新POST/GET/UI/menu/port/DDLは無し。 |

## 準備test・借用checks・未検証

純粋3件、論理repository6件のSOURCE/assertを直接読取した。HTML/Markdown両受付、同binding/generic ID・useAi=false・同資源参照、same receipt/changed content conflict、live-job拒否時binding rollback/wake0、active receiptを要求しないbinding取消fence、queued cancel/retry reconfirmを準備する。SOURCE testは実行0。reject-only provider/ObjectStorageからgenuine native completionを発行する構成ではない。

selected recordがlatest localと異なる対、executorとcredential ownerが異なるWS対、実machine workerのfinal-inspect拒否/ACK不明、prepare中のactor/epoch/version変更とclosed後最終Tx、本文/adopt/undo/rollbackの直接対は現在の新testで実行も準備も完成していない。これらは後続の有限証拠scopeをRootが採用する必要があり、今回のsource-limited読取からactual PASSへ格上げしない。特にC0-F1経路は現testがworker/正規shutdownへ入らないため覆っていない。

作者の最終typecheck→lint:fix→format 0/0/0を借用し、本reviewで再実行しない。pre-script9 callsの内部install入口/104alias drift後の復元とfinal3採用、unknown generated dirs/cache未観測は提出phaseの限界として維持。最終argvの明示--config.verify-deps-before-run=falseとalias復元に関する作者記録を、内部install非発生の新直接証拠へ読み替えない。全tracked SOURCE/Gitblob照合は本reviewの直接根拠、PUBLIC108 dependency target/package/shimの新全面照合はしていない。

## 停止

書込はこの新review一fileのみ、wx0600/nlink1/same-inode全文hash/fsync/実FDcloseで固定する。controlled SOURCEのnamed manifest/pathと採用PUBLIC文書以外の読取無し。全旧private/actual/generatedSOURCE/build/cache/DB/key/proof/results/rootのstat/read/hash/import/copy/reopen/cleanup0。SOURCE/product/helper/manager/main/S5/P5d変更0、skill spec/spec-implement0、追加agent0、default/preflight/test/runtime/import/DB/native/browser/build/rootprobe0。

レビュー固定後ALL source/Git/helper/report reader/writer/runtime STOP。作者への修正はRootへ返し、自身では実装しない。FAILはC0候補の停止順だけを差戻し、全S5 A–F/IN-07完成や未採用後続featureへの判定ではない。

固定日時: 2026-10-06T11:32:35.041288+00:00
