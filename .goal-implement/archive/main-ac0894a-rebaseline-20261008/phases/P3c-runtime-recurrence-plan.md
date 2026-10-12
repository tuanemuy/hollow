# P3c read runtime の未解決観測と局所調査案

## 対象と事実の訂正

固定候補 `01b55c9294eb2bf77d41c06f5db7a67fb0d5dcd6` の source を読み取った。git/hash の再取得はしていない。製品・依存・test/build・DB/storage・browser/process/session・helper/env・既存証拠は無操作とし、変更は本書だけである。

元の未解決観測は独立側09:43〜56の正規個人/WS一覧とtyped paletteの反復失敗である。通常Chrome UA、認証・HTML新規保存・previewは正常。同distとbackup派生cloneの直接childは個人61件1.19秒、WS6件0.493秒、empty341msで成功した。元production68891のログは SystemError、`server.node.js:5807` の unavailable と `:5912` の child close共通分岐だった。通常TERM/draining/exit0後、同bundle/設定で起動した87071は正常一覧と後続操作に成功した。これらは受領した独立/先行poll根拠で、今回の調査による再現ではない。

10:20の版復元後の「再発」は撤回する。Verifierの訂正では誤fixtureの `q=` がstrict URL schemaに拒否され、正式 `query=Revisionmarkerunique` は復元後0件・alert0、新SystemError0である。通常notesも63件で成功し、再起動は不要だった。q再演だけのroute汎用errorを、元のchild close失敗・復元処理・DB障害の証拠にしない。

現時点で元09:43〜56の根本原因は未確定。restartによる回復は原因の特定でも恒久修正でもない。専用sourceの時計比較、child異常終了、SQL/終了処理の待ちを区別するための局所案を示す。

## Source で確認した状態遷移

| 境界 | 現在の実装 | 判断できる範囲 |
| --- | --- | --- |
| HTTP executor | `adapters/node/browse/searchExecution.ts`。受付時deadline3秒、active1/queue16、待ち時間込み。cancelはreject後に所有childをkill、activeはcloseまで保持 | 元close位置のstackは、その要求についてclose handlerに到達した根拠。close未達による永久slot占有やstoppedだけでは同位置を説明しない |
| close | code0かつ親のnow<=deadlineなら受領result、それ以外は新しいunavailable。signalは記録しない | code非0/null、期限経過、どちらか両方を現ログから区別できない |
| 子monitor | `worker/node/searchSupervisor.ts`。DBをmain threadへimportせず、期限100ms前に自己SIGKILL。Worker error/非0exit/不正入力/IPC断/送信失敗も同じ終了 | 親でSIGKILLだけを観測してもnative timeoutとWorker異常を区別できない |
| 正常終了 | Workerの最初のmessageを送信し、send callback成功とWorker exit0の両方でmonitorがexit0 | SQLの結果作成だけでHTTP成功にしない。Worker/IPC終了も3秒へ含む |
| query Worker | `worker/node/searchQuery.ts`。専用client/transactionのreadをawaitし、resultまたは共有errorをpost、parentPort.close | monitorがpost前/Worker exit前で止まったか現ログでは不明 |
| read snapshot | `adapters/libsql/browseReadSnapshot.ts`。public transaction('read')、同tx query_only=ON、現在session/account/scope/SQL/finiteDTO、finally tx.close→client.close | 現在認可・readonlyは維持される。結果のreturnもfinally完了後。共有main clientを読み取り専用へ変えない |
| write/周期処理 | `adapters/libsql/serializedClient.ts`、`application/browse/backfill.ts`、`adapters/node/browse/backfillRunner.ts` | mainの既存UoWはclient内で直列。backfillはactive1・1秒tick、projectionはUoW外、source再照合後同Tx保存。検索childとは別client/process |
| boot/drain | `server.node.ts` はboot時に一つのsearchExecutionを注入。shutdownはsearch stop/close→backfill stop→既存writer/runner stop→DBclose | 通常query/保存/履歴復元からexecutor.stopを呼ぶ接続はない。停止方式の新設は不要 |

packages配下の省略pathは `packages/core/src/`、worker/serverは `apps/web/app/` を基準とする。

親はchild messageのbusiness/auth/notFound/forbidden/conflictを型付きで返す一方、systemのcodeはunavailableへ集約する。adapterのSQLITE原因も通常SystemErrorへ変換される。したがって「元ログにSQLITE_BUSY等の文字列なし」はSQL待ち/driver障害の除外根拠にならない。取得した5件・終了直前2件のSystemErrorの件数だけで、一つの根本障害の回数も断定しない。

## 未確定仮説

| 仮説 | Source/観測との関係 | 不足している事実 |
| --- | --- | --- |
| process間の絶対deadline基準差 | 親と新規monitorが各自 `performance.timeOrigin + performance.now()` を作り直接比較する。長寿命親のepoch換算と新childの基準がずれれば、親では残3秒でも子が即期限扱いになる。restart回復と整合する一候補 | 実際の親子差、残予算、forkから終了までの時間は未取得。sleep/時計補正の発生や原因を断定しない。10:20の誤URLは根拠に使わない |
| SQL/接続/終了の待ちが予算を消費 | mainとcloneでは同時writer/WAL等の状態が異なる。queryはauth/SQL/DTOだけでなくtx/client closeとWorker終了を含む | 同じ要求で停止した段階、DB errorの固定分類、実closeの時点。clone正常だけでは除外できない |
| Worker/IPC異常・資源上限 | Worker error/非0exitをmonitorがSIGKILLへ集約する。終了code7後の次要求正常は、一般的なexecutor回復の一対 | 元失敗のcode/signal、Worker errorかtimerか、message受領/Worker exit有無。native資源事故を現在確定したとはしない |
| 親event loop遅延/queue予算消費 | child計算が正常でも親close callback処理時にdeadlineを過ぎれば不採用。複数readは同queueを共有 | queue/startup/read/IPC/親callbackの時間差。通常少数noteだから必ず3秒内とも、main writeが原因ともいえない |

元stackと同じclose分岐に限ると、単なる停止済みexecutor/受付時queue満杯は低優先である。これらはexecute入口で返り、該当closeで新しいunavailableを作らない。未処理の旧cancelが新activeを解放する形も、active identity比較とclose待ちの現sourceからは見つかっていない。

## 最小の原因識別案

正式返却後の許可を前提に、同一要求を追える非秘密の小さい診断recordをadapter境界へ加える。今は実装しない。UI errorは既存の安全な共有errorを維持し、内部のclock/終了分類を外部へ漏らさない。

- HTTP側はprocess内連番だけをcorrelationにし、受付/queue開始/fork/message/closeのelapsed、queue長、code/signal、結果受領有無、cancel原因の固定enumを記録する。note/user/session/query/HTML/SQL/DB path/env/argvを記録しない。
- monitorは入力受領時の残予算、Worker開始/結果受領/Worker exit/送信ack、終了原因の固定enumを有限個だけ送る。deadline/IPC断では診断送信のackを待たず自己終了する。診断不達はunknownとして残す。
- Workerはopen/transaction/query-only/auth/scope/query/DTO/tx-close/client-close/postの段階だけを通知する。driver情報は既知のコード分類だけに限定し、message/cause/stack/SQL値を丸ごと渡さない。progress messageとfinal resultはwireの別kindで、progressを最初のresultとして扱わない。
- 親子clockは数値差・残予算のみを比べる。入力payloadや実時計の全面ログを作らない。共通requestのstage別結果が得られれば原因分岐を閉じ、無期限のdiagnosticや大量stressへ広げない。

実装path候補は `searchExecution.ts`、`searchSupervisor.ts`、`searchQuery.ts`、`browse/wire.ts`、read snapshotのresource境界。logger/observerは内側の既存portまたはadapter専用の型付き注入にし、applicationへnode APIを持ち込まない。productionの恒久ログpathや新管理UIを今回の解法にしない。

## 原因が確認できた場合の局所修正候補

clock基準差なら、同hostの親子で比較可能な単一monotonic基準へdeadline表現を統一する案が第一候補である。`process.hrtime.bigint()` 等の共有基準をNode/libuvの公開契約と限定親子対で確認してから採用を求める。今このAPIのprocess間保証を確認済みとはしない。各processの起動時wall epoch換算を混ぜず、受付時からqueue/startup/SQL/DTO/終了まで同じ期限を持つ。child受信時に3秒を再発行する相対予算だけの案やDate.nowへの無条件置換は、startup/時計変化時の期限保証を証明せず採らない。

SQL/cleanup待ちなら、stageと安全なdriver codeに対応する一つのresource境界だけを修正する。read-onlyやWAL/既存write UoWを無根拠に変更せず、busy timeout/総期限延長で成功にしない。現在のfinallyはtx.closeがthrowするとclient.closeへ到達しない構造なので、例外時にも外側clientをcloseするnested finallyは具体的な候補である。ただしこれは条件付きのsource上の不足で、元障害の原因や発生済みclose例外を証明したものではない。

Worker/IPC異常なら固定終了分類を維持したまま、その異常だけを直す。closeをexit/messageへ置き換えず、code非0や期限外resultを採用しない。異常後にslotが解放され次の正常要求が進む既存条件も保持する。

親callback遅延なら、実計算終了とHTTP応答遅延を別に記録し、既存の総3秒判定を満たさない結果を成功へ格上げしない。root原因を測定なしに全write移設・全FD再監査へ拡大しない。

## 次の狭い検証と返却

許可後の最初の一対は、新自己環境で通常query/空queryと安全な故障を同じexecutorへ通し、最終成功/失敗と診断recordが一意に対応することを確認する。元の正規list/palette障害が再現すれば、その要求のclock差・code/signal・最終stageを優先し、restart前に保存する。現候補で正常なら未解決観測を維持し、誤URLや別errorを同じ原因として扱わない。

採用修正後は、通常read、期限中のnative SQL→子終了/close→次正常、queue待ち込み期限、取消とWorker結果/closeの両順、readonly/現在session、通常drainを影響に応じて狭く再確認する。clock修正では親子基準差を有限の注入で再現する案を使い、OS全体の時計/sleepや他processを操作しない。cleanup修正では自己例外対だけを追加する。backend全codec/PM/20版/容量/FD300の無変更合格を全面再試験しない。

今回の読取開始時計は2026-09-11 10:20:56 JST。doc-style/markdown-styleに従い、受領事実・撤回事実・source上の構造・未確定仮説を分けた。診断/修正コード、実験、candidate識別更新は未実行。本書を全文確認後、文書を含む全操作を停止し、正式修正の別委譲を待つ。

## 公式一次資料による時計候補の補足

2026-09-11の追加許可でNode/libuv公式docs/sourceだけをnetwork経由で調査した。対象実装は受領runtimeと同じNode `v22.22.3` tagに固定する。latest-v22 docsは取得時に22.23.2だったため、版固有の結論は固定tagのsource/docsを使う。製品・ローカル実行・OS時計・sleep・DB・process・session・環境値には触れていない。

### API文言と実装を分ける

Node22.22.3の文書は、`performance.now()` の0を現在processの開始、`timeOrigin`をprocess開始時のUnix時刻と定義する。独立process間で両者の和が誤差なく同じ軸になる、起動後の時計補正へ再同期する、という保証はこの定義にはない。[固定版Performance docs](https://raw.githubusercontent.com/nodejs/node/v22.22.3/doc/api/perf_hooks.md)

実装ではprocess開始時の `uv_hrtime()` と `GetCurrentTimeInMicroseconds()` を別々に記録し、nowは現在uv_hrtimeから開始時値を引く。公開timeOriginは開始時timestampを返す。timestamp関数はuv_gettimeofdayを使う。[node_perf.cc](https://raw.githubusercontent.com/nodejs/node/v22.22.3/src/node_perf.cc)、[performance.js](https://raw.githubusercontent.com/nodejs/node/v22.22.3/lib/internal/perf/performance.js)、[utils.js](https://raw.githubusercontent.com/nodejs/node/v22.22.3/lib/internal/perf/utils.js)、[util.cc](https://raw.githubusercontent.com/nodejs/node/v22.22.3/src/util.cc)

単位を揃えた導出は `P_i(t) = W_i + M(t) − M_i`。W_iはprocess i起動時のwall値、M_iは起動時monotonic値で、親子比較には両processの `W_i − M_i` の一致が必要になる。これはsourceからの推論であり、元障害の実測ではない。時計補正や起動時の別採取の差をこの式だけでは排除できない。長寿命であること自体がずれを発生させる、とも断定しない。

Nodeのhrtime/bigint文書とlibuvのuv_hrtime文書は、時刻表現を「任意の過去点に相対的」「time of dayと独立」「主用途は間隔測定」とする。bigintはns整数値を返す。これだけから全OS・全process・別boot間の共通epoch保証へ飛躍できない。[固定版Process docs](https://raw.githubusercontent.com/nodejs/node/v22.22.3/doc/api/process.md)、[libuv uv_hrtime docs](https://docs.libuv.org/en/v1.x/misc.html#c.uv_hrtime)

ただしNode22.22.3の `HrtimeBigIntImpl` は起動時値を差し引かずuv_hrtimeの値をそのままbufferへ返す。Unix側uv_hrtimeはUV_CLOCK_PRECISEを選ぶ。したがってprocessごとのwall換算offsetを除けることには固定実装上の根拠がある。[node_process_methods.cc](https://raw.githubusercontent.com/nodejs/node/v22.22.3/src/node_process_methods.cc)、[同梱libuv core.c](https://raw.githubusercontent.com/nodejs/node/v22.22.3/deps/uv/src/unix/core.c)

### OS差とsleepの限界

| Node22.22.3同梱libuv | 読み取った実装 | この調査で保証しないこと |
| --- | --- | --- |
| Darwin | mach_continuous_timeとtimebaseの換算。process起動値の減算なし | 古いmach_absolute_timeを前提に、現runtimeがsleep中に停止したとは説明しない。現在OSのsleep実挙動・今回のsleep/補正発生は未確認 |
| Linux | PRECISEはCLOCK_MONOTONICをclock_gettimeで取得。COARSEはFAST側の候補 | 同hostでも別time namespace/VM・suspendを含む時間の同一性をNode APIの保証へ拡張しない |
| Windows | QueryPerformanceCounterをQueryPerformanceFrequency由来の係数でnsへ換算 | 全OS共通のns精度・suspend契約・他host間比較を保証しない |

根拠は固定tagの [Darwin](https://raw.githubusercontent.com/nodejs/node/v22.22.3/deps/uv/src/unix/darwin.c)、[Linux](https://raw.githubusercontent.com/nodejs/node/v22.22.3/deps/uv/src/unix/linux.c)、[Windows](https://raw.githubusercontent.com/nodejs/node/v22.22.3/deps/uv/src/win/util.c)。Node/libuv資料に共通のsleep包含保証は確認できない。monotonic、wall時計補正からの独立、suspend中にも進むこと、別processの同一起点は別の性質として扱う。libuvの古いDarwin修正 [PR2894](https://github.com/libuv/libuv/pull/2894) は現行障害の再現証拠ではない。

同host・同boot・同Node22.22.3の直接forkされた親子で、同じOS clock値を起点減算なしで使う案には実装上の根拠がある。ただしこれは固定実装に限定した推論であり、公開API単独のportable cross-process契約ではない。現在のbinaryの親子差・scheduler遅延・clock由来の失敗は未測定のままである。

### deadline候補を成立させる条件

hrtimeを採るなら、受付時に一度だけ絶対deadlineを決め、queue・fork/startup・SQL/DTO・Worker/IPC終了・親closeで同じ値を比較する。同hostの比較基準を限定対で確認し、ns値は有限decimal文字列等で受け渡してNumber丸めやJSON bigint非対応を避ける。child起動・IPC受信時に残3秒を再設定しない。100msの終了余裕、期限後結果の不採用、closeまでのslot保持は維持する。これは候補条件で、修正採用ではない。

setTimeoutは停止を促す機構であり、指定時刻ちょうどのcallback実行保証ではない。Node公式もcallbackの正確な時刻を保証しないとする。clock変更だけでOS全体の停止中やscheduler停止中にprocessを終了できるとは主張しない。通常実行時の予算判定、期限切れ結果の拒否、実close時点を分ける。[固定版Timers docs](https://raw.githubusercontent.com/nodejs/node/v22.22.3/doc/api/timers.md)

結論は「現式のprocess別wall換算には未保証の比較条件がある」「固定Node/libuvのraw hrtimeはその換算を除く候補」「原因・sleep条件・全OS保証は未確定」の三点である。元障害を時計原因と確定せず、先の非秘密code/signal/stage/clock差の限定識別を先行させる。公開保証不足を隠して新方式を実装しない。

追加調査終了時は公式文書の閲覧と本節追記のみ。実測・Node/pnpm・ローカルコマンド・製品/環境操作はゼロ。本節を確認して再び全操作を停止する。
