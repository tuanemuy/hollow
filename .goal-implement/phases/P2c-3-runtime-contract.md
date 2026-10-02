# P2c-3 本体接続時の実行・退避・undo 境界案

## 状態と結論

2026-09-06 19:30:16 JST時点のread-only調査である。固定gate、依存、本体、環境、DB、browserに変更・実行を加えていない。bench/test/fixture生成は未実施であり、以下の運用値・方式は未採用。本書だけを追加する。

19:33 JSTにManager経由の独立観測を追記した。Verifierは19:32:39 JSTにC3-GV1を確定した。小pへ既知plain `<` 170000文字を挿入すると再合成680007bytesで成功し、40000文字追記でmodel210000文字を受理表示した後にserializeが800KiB超でthrowした。raw/download/backupは旧680007bytesのまま、noticeも旧plain案内のままだった。さらにtrusted `最新z` を追記してもmodelだけ210003となり、例外が増えた。undoで170000文字へ戻れる点は別に成立している。本担当は再現を実行しておらず、正式レビュー報告の受領前に修正を始めていない。

この観測により、以下で述べる「serializer例外後にlatestが古いまま」の懸念は、該当境界について独立確認済みの保持不良となった。修正の受入候補は、commit前に説明付き拒否してmodel/画面/回収値をすべて直前状態に保つか、超過した最新入力を明示的な完全HTMLとして回収し保存だけを拒否するかである。modelだけを進め、旧HTMLを最新回収として出す第三の状態は許容しない。

第一候補は、PMの入力・selection・historyを主threadが所有し、完全な入力状態を回収できるcheckpointを保ったうえで、HTML再合成と診断をWorkerへ分離する構成。既存C2の「即時に最新HTMLを返す」契約を、古いHTMLのまま満たしたことにしてはならない。再合成待ちを型とdirty状態に含める。

undoはPM公開APIを維持し、100を正確な操作数/heap上限と呼ばない。gateの累積8MiB拒否は本体へ持ち込まない。入力・undoを永久に拒否する代わりに、完全checkpoint後の明示的な履歴epoch更新を最小候補とする。古い履歴だけをbyte単位で削る独自history実装は推奨しない。

## 現コードから分かる差分

固定tempの `host.ts:dispatchTransaction` はroot transactionのstep JSON bytesを加算し、PM apply/update後に同期serialize、全文UTF-8計数、JSON stringify、localStorage書込を行う。prepareだけをWorker化しているため、入力後の主threadコストは残る。serializer例外時に最新PM stateは存在しても、`latest` HTML/退避が直前値のままになる可能性がある。これはコード上の可能性であり、新しい実再現結果ではない。

`converter.ts:pack` はdoc全体と、saved部分木ごとのnode.toJSONを作る。PMのimmutable木で共有されていた子孫がJSONでは重複する。さらにsaved rawも祖先ごとに含まれるため、source bytesだけでは転送量を上限づけられない。深い木での増幅率、worker→mainのunpack/PM node構築、再転送のclone量は測定が必要である。

本体 `VisualEditor.tsx` はText変更時に最新HTMLを親へ渡し、別途desired/acknowledged集合をWorkerへ同期する。`NoteEditor.tsx` はそのHTMLを `EditorDraft` とbackupへ入れ、busy中のsaveを待つ。`settleEditorSave` のread/accept/refresh再比較はHTMLの一致を使う。C3で未materializeなPM入力をこの一致判定から隠すと、saved表示・backup cleanup・mode移行のV5再発につながる。

## 最小責務分離

| 境界 | 同期で保持する正本 | 非同期処理と採用条件 |
| --- | --- | --- |
| PM入力 | 全apply結果のdoc、selection、composition、session/generation、単調editSeq。opaque/source辞書の参照を保持 | appending transactionも含めて変更を記録。見た目の反映にWorkerを必須にしない |
| 退避checkpoint | baselineと未ack操作の完全性、最新title/mode/origin hint。古いHTMLはhtmlSeq付きで区別 | 操作journal/圧縮checkpointの永続化ackを別管理。未退避を「退避済み」としない |
| Worker同期 | 最後のworkerAckSeqと未送信/未ack集合 | 解析要求は置換可。入力操作は順序連結し、連番欠落時は完全snapshotから再同期 |
| serialize | 要求したsession/editSeq。主threadは最新PMを破棄しない | HTML+bytes+sourceSeqを返す。最新Seqと一致した時だけ親draftを更新し、busyを解除 |
| diagnostic / preview | 最新HTMLの世代 | 古い結果は捨てる。本文やbackupを書き戻す権利を持たない |
| save / mode / history | 完全HTMLの世代と最新入力Seqを照合 | C1保存入口・C2 settleを再利用。待ち中の追加入力を含めて再materializeし、安定後だけ移行 |

一時内部型の候補は `InputCheckpoint{schemaVersion,sessionId,editSeq,baseline,operations,sidecarDelta}` と、`Materialized{sessionId,editSeq,html,bytes}`。WorkerのPM JSONはtyped validationを経る内部DTOであり、認可やsource真正性の証拠ではない。libraryのany型をtransportの信頼境界に伝播しない。

baseline source/opaque保存用辞書はIDをキーに一度だけ保持する。savedノードの不変部分木同値検出はbaseline docへのorigin参照を使う候補とし、毎要求の全saved subtree JSON複製を避ける。辞書をWorkerだけに置くとterminate時に最新内容を回収できないため、復旧checkpoint側にも必要な原文を残す。undoにだけ残るopaqueをcurrentに無いという理由で消さない。

主threadの `step.toJSON`、`doc.toJSON`、JSON stringify、TextEncoder、postMessageのstructured clone、localStorageの同期書込は無料ではない。全docのJSON化はcheckpoint/worker再同期時へ寄せ、通常入力は連番付き操作の小バッチを基本候補とする。データ量上限とschema検査を持ち、巨大paste/表操作を単なる「小step」と見なさない。

## 最新本文の回収を欠かさない条件

Worker timeoutだけでは最新完全HTMLを直ちに得られるとは言えない。主threadが最新PM+sidecarを保持していれば再試行は可能だが、reload耐性は別である。次の条件を本体成立gateで確認する。

1. baselineと全未ack操作を含むcheckpointが永続化され、再合成HTMLより新しい入力Seqを記録できる。保存/移行情報と同じ利用者・note namespaceを使い、旧modeなし/new-only退避はそのまま読める。
2. Worker crash後は最新checkpointから一度再生成する。queue待ち・処理deadline・retry回数を区別し、無限restart loopにしない。最新モデルは保持し、古いHTMLを最新としてdownloadしない。
3. 再Workerも使えない場合は、同じ明示serializerの処理を小chunkでyieldする回復経路を候補とする。別のDOM serializerや親innerHTMLへのfallbackは作らない。回復中に新入力が来たらsnapshot Seqを固定し、最新との差を示す。全文回復後だけ4key download/HTMLモードへ渡す。
4. 無効sidecar、メモリー不足、未退避のままtab強制終了など、回復を証明できない条件では「最新HTMLを回収できる」と保証しない。host/チェックポイントを保持し、離脱と保存を止め、理由を示す。最新モデルを別形式で救済する追加downloadは現4key契約に混ぜず、必要になった時点でManager判断へ返す。

候補は従来backupの `html` を最後の完全HTMLとして保ち、任意のversion付きpending checkpointを追加する方式。`htmlSeq < editSeq` を明示し、復元では先にcheckpointを再合成する。最新HTMLとWYS origin hintを同じJSONへ確定する既存方向は維持する。originはserverの保持版へ再照合する未確認hintのまま。

checkpointが大きく既存localStorageへ収まらない場合、同期書込を増やして解決しない。小さい連番journalとIndexedDB等の非同期永続化の比較が必要となる。ただし非同期ack前の強制終了を無損失保証にはできない。未ack警告・beforeunloadとstorage失敗時の最新downloadを分離して測る。この保存形式追加は本書の提案であり、採用済みではない。

serializerは保存用800KiB境界と救済用完全HTML生成を区別する必要がある。通常model編集で出力が上限を超える場合、入力を切り詰めず保存拒否と最新raw退避を両立させる。巨大opaque複製等の明らかな過大commandは事前の有限量検査で拒否できるが、composition中に既に受け入れた文字を後から捨ててはならない。全legal modelが回復serializerで扱えることを示せなければ、C3本体の完成を阻む条件として返す。

### 入力acceptとadmissionの順序

19:31のManager通知を受け、順序を明示する。通常toolbar/paste等のcommandは、現在stateを直接置換せず候補transactionのshape、参照するopaque集合、source量、展開後の出力量を検査する。appended transactionを含む候補stateと復旧checkpointを準備し、必要な辞書の完全性が確認できてからview/current editSeqをacceptする。単にforward stepのbytesだけを見て受理しない。上限拒否は説明して元stateを保つ。

ただし通常typing/compositionではブラウザDOMに入力が先行する。PMへの不採用だけで入力を消す案にはしない。主threadに未受理入力の回収bufferを残す必要があり、そのbufferを含む回復手順を実証できなければ、汎用的な事前拒否で解決したとは言えない。table修正のappend結果もroot transactionだけで代表させない。

既存4key HTMLdownloadを入力直後から必ず提供する条件なら、model checkpointだけでは不足する。候補の追加対は、同じ明示serializerの変更部分キャッシュで最新完全HTMLをaccept時に作る同期fast pathである。重い診断/安全previewはWorkerへ送り、full rebuildはWorkerへ残す。これはJSON転送を含む主thread量と共に測り、資源を満たす場合だけ採用する。任意treeを毎入力全文serializeするgate実装をそのままfast pathとは呼ばない。

fast pathが成立せず非同期checkpoint方式を選ぶ場合、再合成待ちのdownloadは「最新HTMLを準備中」であり、古い4keyを最新として出せない。永続ack前の強制終了では最新入力喪失の窓が残る。model-onlyの救済ファイルも従来4key互換の代替ではない。この差は未解決の採用判断であり、主thread測定と復旧実証前にはC3の完全な保存復旧成功を宣言しない。serialize失敗後のrollbackでaccepted入力を捨てる順序は、どちらの方式でも採用しない。

## C2/C1への接続点

新WYS hostは `onInputState(editSeq, composing, pending, recoveryError)` と、完全HTMLだけを返す `onMaterialized(editSeq, html)`、最新Seqまで待つ `flush()` を持つ候補とする。既存EditorDraftとserver save APIはPMを知らないまま維持する。

NoteEditorのdirty・離脱・署名out guard・autosaveにWYS pendingを含める。save前にflushし、待ち中に増えたeditSeqも含む最新HTMLをcurrentへ反映する。その後は既存 `settleEditorSave` を使い、独自の同note保存ループを作らない。save acceptで正当なcreated ID/savedを保持しつつ、追加入力またはpending checkpointがあれば両backup keyを消さない。最後の短いnavigate lockにも未materialize入力の再確認が必要である。

mode要求IDと入力/保存Seqは独立。旧mode要求の取消で入力journal・正当なsave acceptを捨てない。clean切替、titleだけ、selection/focus、取消で本文変換や履歴追加を起こさない。dirty→履歴/復元もflush→既存保存または明示破棄/取消へ接続する。参照worker等でcanonical構造が変われば新generationとして扱い、最新入力を上書きせず確認する。

## undo公開契約と候補比較

PM history 1.5.0のdepthはgrouped eventの数であり、キー入力数ではない。隣接性・500ms既定・compositionでgroupingし、実装はoverflow20を超えた時に古いeventをまとめて落とす。inverse step、map、selectionを保持し、redo branchも存在する。`closeHistory` はgroupを閉じるだけで履歴を削除しない。`addToHistory:false` も既存履歴のmap保持を伴う。したがってforward step JSON累積とheap/保持bytesは一致しない。[固定history 1.5.0実装](https://raw.githubusercontent.com/ProseMirror/prosemirror-history/1.5.0/src/history.ts)

固定gateでは8MiB累積にundo/redoのtransactionも含め、古い履歴がPM側でpruneされても累積値を減らさない。一方appended transactionや削除内容のinverseの大きさは計数しない。このため「undoが拒否される」「小さなdelete stepで大きなinverseを保持する」の両方向の不足がある。これは静的確認であり、固定gateを実行して新たな失敗を再現したものではない。

| 候補 | 評価 |
| --- | --- |
| PM depthのみ、単一command/本文量を有限化 | 最小。ただし長い単一group・map・sidecar量はdepthで制限できず、単独では資源境界が不足 |
| PM depth＋checkpoint済み履歴epochの明示更新 | 第一候補。一定量で新規通常操作を一時停止し、現在完全本文の退避を確認して「古い元に戻す履歴を整理して続ける」。doc/selection/opaque/originを保持し履歴だけ再初期化。undo/redo自体を同じ累積門で永久拒否しない |
| private history branchをbyteごとに切る | 不採用推奨。公開APIに任意byte pruneはなく、inverse/map/group境界を独自維持する負担が大きい |

公開 `EditorState.reconfigure` は同じplugin stateを保持し、除外したfieldは落とし、追加fieldをinitする。historyを外した中間stateから再追加する候補なら、doc/selectionを保ったままhistory再初期化を検討できる。viewのdestroyやhost remountを前提にせず、composition中は実施しない。[state 1.4.4実装](https://raw.githubusercontent.com/ProseMirror/prosemirror-state/1.4.4/src/state.ts)

epoch更新は直前のundo履歴をすべて失うため、黙って行わない。通常20版/prelossyは代わりの無制限履歴にせず、C1意味ある保存条件を維持する。現在docから参照されないsidecarもundo可能なepoch内は保持し、epoch終了後に現在/baselineに必要な集合へまとめる。byte基準はforward+inverseの概算、maps数、sidecarの一意原文量、操作数/経過時間を別指標とし、いずれもheap保証と呼ばない。

100/8MiBは現時点では測定候補である。正確100イベントに固執せず、有限epochとUI説明が原要件の編集/undo体験に適合するかをManagerが判断する。拒否時も最新本文・HTML回収を失わないことを先に確認する。

## 採用前に必要な測定と停止条件

測定は現在未実施。通常段落/日本語/IME、800KiB近傍text、1万node近傍、深い通常木、1000cell/結合表、属性の多いopaque、削除→undoを同じhostで比べる。

- input event→transaction生成→applyTransaction（appendedを含む）→view update→次paintを分ける。PM DOM差分処理をserializer時間へ混ぜない。
- step/doc JSON化、source辞書構築、UTF-8計数、clone、worker queue、worker実処理、response採用、backup write/ackを個別測定する。通常/最大のp50/p95/maxと反復回数を記録する。
- 連続入力中に主threadの50ms級長taskや入力遅延が発生したら原因を分ける。50msは観測用の暫定閾値で、全端末の採用済SLOではない。Worker2秒timeoutがあっても主threadの2秒停止を許す根拠にはならない。
- workerを入力直後、queue中、serialize中、HTML受領前に止め、最新全入力/opaqueの回収とreload復元を確認する。旧HTMLだけの退避は不合格。受領前の旧response/旧errorは最新Seqへ作用しない。
- 120超の独立group、長い隣接group、composition、巨大deleteとundo、row/colのappended transactionを観測する。undo/redo量、map量、sidecar量、history epoch後の解放傾向を分離し、累積門でundo不能にならないことを確認する。
- epoch更新後のdoc/selection/origin/opaque一致、直前checkpoint失敗時に履歴を消さない対、C2 mode取消・V5二段追記・media-only同asset・historydirtycancelを本体で確認する。

主threadの低遅延を示せない、合法modelの最新HTML回収がtimeout後に成立しない、pending checkpointがreloadで失われる、undo整理が通常編集を頻繁に中断する場合は、本体方式の阻害として返す。旧HTMLへ戻す・入力切詰め・DOM保存・無制限retryでは合格にしない。

## 判断点と停止

判断は2点に絞る。第一は、完全HTML未生成の入力を保持する任意pending checkpointと復旧手順の採用。第二は、公開PM historyを維持した明示epoch整理のUX採用。いずれも実装前/本体接続測定を経て確定する。固定gateの代表成立を本体性能合格へ読み替えない。

本書以外はread-onlyのまま。新benchmark、test、dependency install、hash helper、DB照合、browser/listener操作は行っていない。C3本体は開始せず、Managerの採用と正式委譲を待つ。
