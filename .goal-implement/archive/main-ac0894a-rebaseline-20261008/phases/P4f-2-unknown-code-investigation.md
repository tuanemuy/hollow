# P4f-2 unknown の静的経路調査

2026-09-27 20:10 JST。Implementer 補助。製品変更・再現実行・独立受入ではない。

## 結論

`ZIP_EXECUTION_UNPROVEN` は、PDF の終了を証明できない binding を残す二次的な停止理由になり得る。これだけでは初発の PDF エラーを特定できない。第三需要の経路にも、本人・匿名と同じ実 PDF planner / workspace / supervisor が接続されている。

主担当の追加観測に `output.pdf` と Chrome profile があるため、「artifact が 0 なので renderer 開始前」とは判断できない。静的に優先して切り分ける対象は、実 supervisor の終了通知・protocol・所有検査と、出力読取の native close である。現在の材料から単一原因は確定しない。

## 入力事実と調査範囲

以下は Manager / 主担当から受領した観測であり、この補助が runtime / DB を再読した結果ではない。

- 19:59:46、通常 UI から本人の 2 note PDF ZIP を要求し、数秒内に停止した。
- 20:03:58、ordinal 0 は running / waiting-pdf、compute は stopping / generation 2 / reservedBytes 435566784 / workspaceRemoved=false。ordinal 1 は cancelled。run は stopping / ZIP_EXECUTION_UNPROVEN / finishedAt=null。artifact / hold / spool / object owner は 0。
- 最初の note は媒体なしの日本語本文と original style。次の note は default style と表・code・PNG。
- 20:05:36 の主担当の supervisor check は closed=true。後続の主担当報告では runtime の OS 終了・FD 0 を確認した。
- 主担当が自己 workspace のファイル名だけを確認し、resources.pack / manifest.json / admission.json / output.pdf と native Chrome profile を観測した。内容はこの補助では読んでいない。

読取対象は現在の非秘密 source と既存自己 fixture のコードだけ。実配備設定値、生成ファイル、ログ、DB、旧 proof、資格情報、プロセス状態は読んでいない。source と実行 bundle の同一性もこの補助では検査していない。

## 第三需要から停止まで

1. [`pdfGeneration.ts`](../../packages/core/src/application/zip/pdfGeneration.ts) は ZIP attempt に compute binding を付ける。PDF_BUSY / PDF_STOPPING の取得前 poll と、取得後の waiting-pdf は別段階である。
2. [`pdf/worker.ts`](../../packages/core/src/application/pdf/worker.ts) の `current` は `zip-child` に対して `readZipPdfSnapshot` を使う。その後は通常 PDF と共通の preparePdfSources → writer.plan → workspace reservation と artifact.begin の同 Tx → writePack → supervisor.render → output copy → publish の順になる。
3. PDF worker は `PDF_OWNERSHIP_UNKNOWN` だけを `ownershipKnown=false` として扱う。artifact があれば retire し、需要を fail、compute を stopping にするが `pdfComputations.closed` は呼ばない。
4. [`pdf/execution.ts`](../../packages/core/src/adapters/node/pdf/execution.ts) は work Promise の終了後に Map を削除する。したがって PDF execution 非 active と compute の終了証明は同義ではない。
5. ZIP の `releasePdfDemand` は binding の detach ができず、PDF execution も非 active、再取得した compute が closed でない場合に `ZipExecutionUnprovenError` を投げる。
6. [`zip/worker.ts`](../../packages/core/src/application/zip/worker.ts) はこの typed unknown で run を fail / stopping にし、`finishClosed` を省略する。[`zip/lifetimes.ts`](../../packages/core/src/adapters/node/zip/lifetimes.ts) も unknown を保持する。

この鎖は今回の waiting-pdf / stopping / binding 保持と整合する。ただし 3 の初発コードを実ログで確認しておらず、今回すべてがこの鎖だったと断定しない。compute が closed でない別経路でも 5 の防御は働く。

## 実経路と fake fixture の差

[`server.node.ts`](../../apps/web/app/server.node.ts) は IsolatedPdfDocumentWriter、FilePdfWorkspace、FilePdfSourceReader、NodePdfSupervisor を使用する。一方、[`zipPdfFlow.integration.test.ts`](../../packages/core/src/adapters/libsql/__tests__/zipPdfFlow.integration.test.ts) の planner は `planPdfDocument` の直接呼出で、workspace は予約値・書込・削除を fake にし、supervisor は固定 bytes / hash を返す。

既存の小 flow は需要、DB、実 object copy と hold の接続根拠である。Worker thread の起動 / 終了、固定 font の実読取、Python preflight、Chrome / CDP、WNOWAIT と process group 検査、監督 protocol の根拠ではない。typed unknown 注入の取消対も「未知を保持する」根拠であり、実 supervisor がなぜ unknown を返したかの根拠ではない。

## unknown を生成する条件

### 実 supervisor の終了境界

[`supervisor.ts`](../../packages/core/src/adapters/node/pdf/supervisor.ts) の `execute` は次の場合に固定文言の PDF_OWNERSHIP_UNKNOWN へまとめる。

- child close の exit code が null。
- stdout の JSON / strict schema / 順序違反、重複終端、終了後イベント、末尾未完行、256 KiB 超などで invalid になった。
- `render` が有効な `supervisor-closed.closed=true` を得られない、または supervisor process の exit が 76 / 77。

有効な closed=true と実 child close が揃い、単に render が失敗 / resource-limit / deadline だった場合は通常の BusinessRuleError になる。したがって通常の描画失敗だけでは今回の typed unknown を説明できない。

[`supervisor.py`](../../packages/core/src/adapters/node/pdf/supervisor.py) は engine の終了に加えて pipe EOF、process group の残存、既観測 descendant の逸脱、WNOWAIT で保持した leader の状態・reap を検査する。`process_table` の取得失敗・2 秒以内に取得できない・不正応答、`waitid` / session / group の証明失敗、残 pipe、残 descendant などは ownership-unproven / close-unproven に繋がる。後から group が消えたことと、その生成時点で証明できなかったことは両立する。

[`engine.ts`](../../packages/core/src/adapters/node/pdf/engine.ts) は renderer 内の sink / Chrome / channel cleanup 後、成功時に output.partial.pdf を output.pdf へ rename してから render-closed を通知する。今回の output.pdf 観測は、この経路へ到達した可能性を強めるが、監督の後段 group / protocol 検査成功までは証明しない。生成終了後に監督証明だけが失敗する経路はコード上存在する。

### native file close

[`workspace.ts`](../../packages/core/src/adapters/node/pdf/workspace.ts) は font / pack / manifest / admission / output の FileHandle.close 拒否を PDF_OWNERSHIP_UNKNOWN にする。[`source.ts`](../../packages/core/src/adapters/node/pdf/source.ts) も媒体の close 拒否を同じ code にする。

ordinal 0 が媒体なしでも、font / workspace / output の FD は実経路に残る。媒体なしはこれらを除外しない。writePack 前の単純な入力 / planner / 予約失敗は通常エラーであり、即 unknown になるとは読めない。

artifact は retire 後に参照がなくなれば回収・prune され得る。現在 artifact=0 / object owner=0 を理由に、過去の artifact.begin や renderer / output copy 到達を排除しない。

## 過剰判定・証明欠落の別候補

これらは静的な改善検討点であり、今回の原因認定ではない。

- Python `main` は run_engine 前の拒否にも一律 closed=false を出す。previous_generation の証明後に引数 / workspace 検査で拒否し、新 child がまだない場合も unknown へ畳まれる。既所有不明や active-lock を含むため、全 preflight error を無条件に closed 扱いへ変える修正は不適切。今回の output.pdf 観測とは主経路として整合しにくい。
- Node supervisor は protocol invalid と native 所有未証明を同一 code にする。実 group close が別途証明された場合でも protocol 不正だけで unknown になる経路がある。安全側の現挙動を、理由不明のまま通常失敗へ弱めない。
- [`documentWriter.ts`](../../packages/core/src/adapters/node/pdf/documentWriter.ts) は Worker.terminate の拒否を通常 PDF_DOCUMENT_FAILED にする。実 exit 未証明を独立 typed unknown として残す処理はこの adapter にない。これは今回の unknown の直接説明ではなく、逆方向の証明不足候補。実 renderer 到達が確認されればその試行の plan は既に返っているが、全 thread の終了証明をこの補助が行ったわけではない。

## 主担当へ渡す最小切り分け

新しい PDF 要求や所有解除はこの調査では行わない。必要な追加観測・製品変更は Manager / 主担当の承認と所有範囲で判断する。

1. 既存の安全な記録から、PDF worker の固定 code と ownershipKnown、および supervisor の event 種別・reason・closed・exit・invalid 判定理由だけを得られるか確認する。本文 / path / token / raw stdout / stderr の公開は不要。
2. 初発が supervisor なら、render-closed 到達有無と supervisor-closed の closed / reason / exit を区別する。監督 check の後日の成功を、失敗時の有効 protocol 受信へ置き換えない。
3. supervisor が正常 return 済みなら output の native close 側を次候補にする。fake renderer 再実行だけでは両者を切り分けられない。
4. 初発理由が取得できない場合は原因未確定を維持する。主担当が別途得た実終了証明と正規 recovery の判断を、この静的調査による presumed closed で代替しない。

## 完了範囲

変更はこの報告 1 path のみ。実行テスト・build・browser・runtime・DB・process 観測・外部通信・製品編集は 0。read exec はすべて終端回収済み、未回収 exec 0。自己 Worker / FD / DB / tmp は作成していない。推定 path / glob の不成立は実在 source の読取で補完した。全操作を停止し、報告所有を返却する。
