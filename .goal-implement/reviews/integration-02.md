# 統合読み2の修復候補・独立再検証

対象candidate `287c73325bff10d7b64fae13a0bfb0a00982fd00`、product `11a25f4aa3c51327512970bededac978c8232092`。指定19IDと変更到達8IDへの同readerの狭い再読み。第3fresh全体読み・成立認定は行っていない。原文と利用者briefを正本とし、Manager/Mainの受入評価・phasesは根拠に使っていない。

規定形反例は1件（R1、条件2）、効くIDはIM-01/02/03/06・UX-VISUALの5件。IN-01/02/07、OR-06/07/08/12、ED-09/10、SH-01/02/03/04/08は反例0。変更到達OR-09、IN-06、EX-02、WS-10、JB-03、AC-07、WS-07/08も反例0。必須未観測は27IDとも0で、下記の旧actual限定適用を含む。原本noticeの実AI表記正常を、分岐を守る自動テストへ読み替えない。

必要なManager判断はR1の5IDを条件2の反例として扱うこと。元B1の31999は新固定値テストで赤くなる。元B2/B3のtoken・配置・UI対訳は今回の実画面で同じ反例を再観測していない。これらを成果全体の成立認定とはしない。残る66IDは新しく全量読み直さず、下段wholeの原文・独立actualを45path差分と共有到達に照合した。

環境引継ぎは稼働0。新root R=`/Users/hikaru/.local/share/hollow/verification/integration02-repair-20261014T040716Z`。ブラウザ正規close0、自己runtime58365/proxy58358はsuccess-only drain経路でcaller/harness実0。04:34:27.821646+00:00の自己process/記録PID残0・known loopback listener拒否61・checkout/diagnostic diff0を記録。失敗した診断変異とbrowser driverは別保持し、exit1を正常終了へ数えない。報告だけを変更し、resumeは非commit。実command/browserのUTCを正本とする（中間通知の推測時刻04:36は使用しない）。

## R1: 原本noticeのUI対訳分岐を守らないテスト

条件2の「実装した正常・境界・エラー・null/空・重複・順序・再実行・認可の各分岐を主張するテスト」「条件反転等の意味ある変異で赤」を問う。原[IM-01/02/03/06](../../spec/scenario/import.md)の原本保持・形式別個別結果・非同期の結果確認・再生成と、[design index:325–329](../../spec/design/index.md)の「次の対訳表を正」「LLM | AI」に効く。UX-VISUALは利用者に見える詳細結果の同種表記として届く。

`apps/web/app/routes/notes.$noteId.index.tsx:216–221`は原本noticeを表示し、`n.code === "LLM_DISABLED" ? (llmDocumentMessage(n.code) ?? n.message) : n.message`の新分岐を持つ。具体値は自分の通常AI不使用audioアップロードで永続化されたcode=`LLM_DISABLED`、location=`原本`、message=`LLMなしでは取り込めません。LLMを使う設定で取り込み直してください。`。`processJob.ts:123–126`のraw messageを`getNote.ts:49`が原本noticeに載せ、このrouteに届く。既知codeはUIでAIに訳し、任意の外部noticeは変更しない期待である。

停止診断copyで判定だけ`!==`に反転すると、この具体値はfalse側に入りraw LLMが表示される。反転前の3幅実browserは原本・変換状況とも「AIなしでは取り込めません。」でLLM可視0。変異後の画面を正常candidateの機能不具合とは述べない。

関連repositoryテストは`NoteConversionStatus.test.tsx:18–58`が変換状況componentへのLLM_DISABLED入力を主張するが、原本routeをrenderしない。ImportUpload7、NoteConversionStatus6、importSelection18、ImportJobs5の4files36testsが判定反転下で全pass/exit0になった。`LLM_DISABLED`/route/原本noticeのtest参照を追い、当該route表示の具体値assertが無いことを照合した。全4406を変異下で通したとは主張しない。独立ブラウザprobeがAIを確認してもrepository回帰を代替しない。

| 診断・復元 | UTC開始→終了（2026-10-14、+00:00） | 実exit/結果 |
| --- | --- | --- |
| route判定反転、上記4files | 04:18:56.702024→04:18:57.724971 | 0、36green、red0、PID58183 caller実終了 |
| finally原bytes復元、同4files | 04:18:57.755374→04:18:58.776515 | 0、36green、PID58195 caller実終了 |
| 診断git diff --exit-code | 04:18:58.806337→04:18:58.891281 | 0、完全復元 |
| 通常runtime起動 | 04:19:32.517808 | 診断caller終了・復元後、別通常checkoutを起動 |

根拠はR/mutants.py、R/logs/d-notice-route-{red,restored}-0.log、extra-results.jsonl、raw-original-notice.json（04:22:00.304840+00:00）、browser.jsonl、`<width>-ai-off-detail.png`。元IN-01/02/07のSTT入力検査にこの新表示不足を拡張しない。

## 規定ゲートと診断

fresh persistent checkout/DB/objects/HOMEと短TMPDIRを使った。sanitized環境、NixNode22.22.3/Unicode16.0・同Node pnpm11.1.2、FFmpeg/ffprobe8.0.1、frozen install。通常quality/fullの実caller終了・関連test process0を確認してからだけ診断、さらに診断実終了/復元後だけruntime/browserを起動した。稼働checkoutの再build、同時品質/fullとbrowser、skip/timeout/guard/CSP緩和はない。

commandの全argv/start/end/exitはR/logs/results.jsonl、extra-results.jsonl。通常fullはunit2798/204files＋Node1538/128files（ordinaryと全5formats）＋CF70/10files=4406、skip0/unhandled0。full caller実0、R/logs/full-completion.jsonの関連process残0。修復後の通常full成功を画面根拠にしていない。

| 通常command | UTC開始→終了（2026-10-14、+00:00） | 実exit |
| --- | --- | --- |
| `node -p process.version+" Unicode "+process.versions.unicode` | 04:08:22.284505+00:00→04:08:22.330483+00:00 | 0 |
| `pnpm install --frozen-lockfile` | 04:08:22.330865+00:00→04:08:36.231485+00:00 | 0 |
| `pnpm exec node -v` | 04:08:36.232154+00:00→04:08:36.501476+00:00 | 0 |
| `pnpm typecheck` | 04:08:36.501767+00:00→04:08:43.339714+00:00 | 0 |
| `pnpm lint:fix` | 04:08:43.340038+00:00→04:08:47.058984+00:00 | 0 |
| `pnpm format` | 04:08:47.059322+00:00→04:08:47.781117+00:00 | 0 |
| `pnpm lint` | 04:08:47.781444+00:00→04:08:48.932698+00:00 | 0 |
| `pnpm format:check` | 04:08:48.933047+00:00→04:08:49.658546+00:00 | 0 |
| `pnpm build` | 04:08:49.658869+00:00→04:08:57.051752+00:00 | 0 |
| `pnpm test` | 04:08:57.052075+00:00→04:17:30.849154+00:00 | 0 |

停止診断copyは既存の集約・制約を狙って変異した。期待はテストの固定具体値を読み、実装helperから生成していない。各mutantはfinally原bytesへ復元し、同関連test greenと最終diff0を取った。

| 変異 | 赤の具体結果 | 復元 |
| --- | --- | --- |
| transcriber byteRate32000検査guard削除 | unit17の1red（31999をrejectせずtranscript成功）・DB31の1red（failed/LLM_SOURCE_INVALID期待にsucceeded）。coherent monoPCM16/16000Hz・byteRate31999、identity/hash/RIFF/data長は整合 | unit17/DB31green、実0 |
| SharingDialog showModal削除 | 6testsの2red、native modal起動をassert | 6green/0 |
| uiTerms AI→LLM | 関連31testsの4red。具体AI表記assert | 31green/0 |
| TagManager current/accessLost guard除去 | 9testsの1red、URL移動後に旧triggerへfocusする変異 | 9green/0 |
| EmptyTrashControl pending guard除去 | 5testsの1red、discard pending完了前focus/二重focusが固定期待と相違 | 5green/0 |
| 原本notice判定反転 | 36green/red0 | R1、完全復元36green/0 |

各診断のPID/実開始・終了はextra-results.jsonl、各assert/failureはd-*.log。31999新テストはboundary±1と明示send0/closed/no保存成功/旧本文・quota・spool保持を追う。元wholeで生存したB1変異は候補テストで赤くなる。既production transcriber/port/audioWorker/nativeは45path差分で不変なので、wholeの自己2段STT→chat wire/原本保持/回復とE11actualをこのtest差分へ限定適用する。

## 実ブラウザと原文比較

公開入口はdocs/browser_audio.md、browser_ux.md、browser_drive.md、llm_node.md。public audio wrapperを同Node・絶対installed tsx loaderで`--organize-local --ux-local --export-local`を付けて起動した。wrapperがchdirするため相対loader継承は使わない。PDF通常tools配備profileも公開引数で渡した。Chrome144.0.7559.96/agent-browser0.38.2・空config・各CLI同自己reject-onlyproxy56022/no allowed-domains。known loopback56021とfixture originsだけを使い、外部DNS/connect/forward、実service auth/send/op/charge/publishは行わない。

browser.jsonlに全CLI argv/start/end/exit/stdout/stderr、dialog-observations.jsonlに実computed、screenshotsに画面を保存。期待は原design §3.10の12px/shadow-lg/白/desktop8vh・sm未満bottomsheet上角/handle、error文字/透明背景と、scenarioの保存・取消・固定対象。説明を付けて操作を成立させたとは数えない。

| 正常経路 | 自分の直接観測と期待/実際 |
| --- | --- |
| AI不使用audio初回・詳細 | 32044bytes原本を保存、親failed1、AI使用0/予約0、旧機械retryなし・設定への導線。原本/変換状況がAI表示、3幅LLM0。未連携やSTT成功と混同しない |
| AI不使用upload選択 | audio.wavを選択・checkboxオン。3幅「1件はAIなしでは…」「AIを使わず…」「音声・AI不使用では失敗」、mainLLM0、横幅各viewport一致。2回目の選択は送信しない |
| tag picker/管理delete/rename | 通常一覧からpicker、管理deleteのimpact await、rename→Escape。3幅native modal/規定形、各現triggerへ戻る。delete/merge/cleanupの実保存規則はE04限定適用 |
| trash/purge/empty-trash | 通常cancelled.htmlをゴミ箱へ移動、確認の原文内訳/30日表示。purge3幅は取消だけ。empty snapshot1件3幅→discard完了後opener focus、通常復元成功。完全回収の旧actualはE02/E10 |
| sharing/move | limited detail→共有設定3幅→Escapeで起点復帰。320内部scroll後password button681.015625–725.015625、通常確認→設定済み。move候補3幅→Escapeで移動trigger復帰。privacy/token更新契約と権限はE05/E04限定適用 |
| batch/ZIP/Drive | organize.md/failed.htmlの固定2件を選び、各共用dialogを3幅で開いて取消。selection2/500保持、ZIP形式と7日期限、Drive候補内訳2/新規2/保存先localの結果を読む。実ZIPfile/Drivewire送信は今回再操作せずE08/E07限定適用 |
| profile/WS公開・削除 | profile handle draft→確認3幅→取消で保存triggerへ戻る。WS公開off draft→確認3幅→取消、WS削除3幅→取消で起点復帰。保存・公開・削除を実行していない。WSslugの既window.confirmは通常dismissし原draftへ戻した |

全dialog実computedは:modal=true、pageWidth=1280/375/320、background白、desktop top57.59375（8vh）、角12、shadow rgba(.1)0/16/48、mobile bottom=812/760、上角12/下角0・handle可視。sharingはdesktop bottom695.984375/mobile bottom812/760に収まり、本文内部overflow:autoで末尾操作に届く。画像を自分で閲覧しcomputedと照合した（tag/trash/sharing/password/purge/empty/batch/Drive/profile/WSdelete/upload）。mobile長い本文の内部scrollを、全操作が初期viewportに常時見えるという新要件へ変更しない。

失敗したdriver操作はbrowser.jsonlの実exit1を保持する。password設定は既確認段階を飛ばした待機条件でtimeoutし、通常「変更を確定」後に設定済みとなった。古いref・未解決RSC直後のselector・320の自動scroll click未発火は、明示scrollでhitがbutton自身となることを読んで通常clickしpurgeが開いた結果と分ける。失敗driverを製品正常やruntime正常閉鎖へ読み替えない。

## 七条件と差分到達

Sは下段wholeの各ID原文・scenario・briefと、今回同対象本文の独立再読。Gは上記通常quality/full。Mは上記意味ある変異と復元。Oは今回直接browser。Dは45pathのcode/caller/style/共有状態と採用designの照合。E番号は下段wholeの独立actualの限定適用理由で、先行受入評価ではない。

| 条件 | 探索した規定形と根拠 |
| --- | --- |
| 1 要件 | 完了条件はSから固定。対象の正常/異常/契約段階はO/G/E。core契約と外部adapter/native/DI/schemaが不変、原本保持とUI結果はO。scopeの必須機能にTODO/FIXME/stub/仮実装/未接続の新反例を特定せず。Drive削除未接続はbriefの明示対象外 |
| 2 全振る舞い | Gと固定値assert、Mのguard/判定反転/取消current/pending。新DialogActionFocus9/EmptyTrashFocus5/SharingDialog6/TrashDialogFocus4/NoteSharingAction4などの同actor・ABA・URL移動・disabled/disconnected・pending・errorの具体値を読む。R1だけ変異生存を引用した。存在/否定assertだけを全分岐成立の根拠にしない |
| 3 既存維持 | Dの四到達（変更caller、削除改名export/query/route/env/API参照、共有状態/style、既受入ID）。削除query/route/env/portなし。hollow-dialog selectorを使用する全component、native/pending/current owner、uiTerms全consumer・原本noticeを追いO/Mで変更到達を観測。共有native/Drive/export/認可の不変範囲だけEを適用 |
| 4 規約/設計 | AGENTS/CLAUDE・backend/frontend例、domain/applicationの内向き依存/純粋性/ports、既ownerのReact transition/optimistic/router.invalidateを照合。新presentation uiTerms/純粋DialogHandle、existing native dialog再利用。G全実0、docs/config不変更・公開再実行入口残存。触れたcommentsはWHY/current制約・documentationのみ |
| 5 新負債 | Dで新構造を既存に比較。stylesは共通layoutへ集約し各既classの寸法だけ変数化、native owner/refの有限RAF復帰を再利用し新focus一般抽象なし。uiTermsは複数consumerの同UI語彙単一用途、DialogHandleも複数consumer。role/access/location/generation/current guardは既ownerに保ち、境界decode/副作用は既層不変更。不正combination型、命名、死branch/一consumer抽象/未来一般化の規定形反例を特定せず |
| 6 UI | Sのdictionary/§3.10/token/同種画面をO全3幅に厳密比較。元B2/B3の相違を再観測せず。各cancel起点とdestructive error文字、限定password操作の到達はO。domaincode LLMや任意messageを一律書換えない。テストpassは画面根拠にしない |
| 7 実観測 | 主要正常と利用者結果はO、異常は利用者overrideどおりG/M/repo integration。旧actual適用理由を各rowと次表へ明示し、今回未取得のZIP/PDF/native audio成功・live外部を新観測へ置換しない。規定段階の必須未観測0はE適用を含む |

## 19対象と8到達の原文・七条件matrix

各列はその条件の探索根拠を示す。0は規定形反例を特定していない値で、成立認定ではない。必須未観測0は自分の直接観測と旧actual適用を分けた値。元wholeの原文引用を維持する。

| ID・原文完了条件 | C1 | C2 | C3 | C4 | C5 | C6 | C7・観測範囲 | counter/必須未観測 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [IN-01](../../spec/scenario/integration.md) — 連携を待って本文の生成が止まっていたノートがあれば、その件数が示され、一覧へ移動できる。以降、画像・音声・テキストのない PDF のアップロードで LLM による構造化が使えるようになる。 | S/O/E06/E11 | G/M/E06/E11 | D/O/E06/E11 | G/D | D | O/S/D | E11自己STT2段/用途wire不変＋G/M | 0/0 |
| [IN-02](../../spec/scenario/integration.md) — 用途ごとにモデルを選ぶ。保存すると、以降の変換に反映される。 | S/O/E06/E11 | G/M/E06/E11 | D/O/E06/E11 | G/D | D | O/S/D | E11自己STT2段/用途wire不変＋G/M | 0/0 |
| [IN-07](../../spec/scenario/integration.md) — 元ファイルが Drive から取得され、変換ジョブが実行される。完了後、新しい本文でノートが更新される。タグ・公開設定・共有リンクは維持される。 | S/O/E07/E11 | G/M/E07/E11 | D/O/E07/E11 | G/D | D | O/S/D | E11自己STT2段/用途wire不変＋G/M | 0/0 |
| [IM-01](../../spec/scenario/import.md) — 変換が完了すると本文が現れ、一覧の表示も更新される。非公開以外の公開ステータスを指定していた場合は、この時点で適用される（変換が完了するまでノートは非公開のまま）。自動バックアップ（IN-05）が有効な場合、変換の成否とは独立してバックアップジョブが登録される。 | S/O/E06/E09/E11 | R1/G/M | D/O/E06/E09/E11 | G/D | D | O/S/D | O upload/detail; E06/E09/E11 | 1/0 |
| [IM-02](../../spec/scenario/import.md) — アップロードを開始すると、ファイルごとに個別の進捗が表示される。完了後、成功件数と失敗件数の内訳が表示され、失敗分は理由つきで一覧される。 | S/O/E06/E09/E11 | R1/G/M | D/O/E06/E09/E11 | G/D | D | O/S/D | O upload/detail; E06/E09/E11 | 1/0 |
| [IM-03](../../spec/scenario/import.md) — 完了すると通知が表示され、ノート一覧に反映される。処理履歴（JB-01）から過去の取り込み結果を確認できる。 | S/O/E06/E09/E11 | R1/G/M | D/O/E06/E09/E11 | G/D | D | O/S/D | O upload/detail; E06/E09/E11 | 1/0 |
| [IM-06](../../spec/scenario/import.md) — 完了後、新しい本文に更新される。タグ・公開設定・共有リンクは維持される。直前の本文に「元に戻す」で戻せる。 | S/O/E06/E09/E11 | R1/G/M | D/O/E06/E09/E11 | G/D | D | O/S/D | O upload/detail; E06/E09/E11 | 1/0 |
| [OR-06](../../spec/scenario/organize.md) — 選ぶと即座にタグが付き、一覧の表示に反映される。付いているタグはその場で外せる。 | S/O/E04 | G/M/E04 | D/O/E04 | G/D | D | O/S/D | O共用dialog; E04 | 0/0 |
| [OR-07](../../spec/scenario/organize.md) — OR-06 と同じ入力・候補・新規作成の操作でタグを付ける。付いたタグを選ぶと、そのタグで絞り込んだ一覧へ移動できる。 | S/O/E04 | G/M/E04 | D/O/E04 | G/D | D | O/S/D | O共用dialog; E04 | 0/0 |
| [OR-08](../../spec/scenario/organize.md) — タグを削除すると、すべてのノートから外れる（ノートは消えない）。既存のタグと同じ名前に変更した場合は統合するかを確認し、統合すると両方のノートが片方のタグにまとめられる。 | S/O/E04 | G/M/E04 | D/O/E04 | G/D | D | O/S/D | O共用dialog; E04 | 0/0 |
| [OR-12](../../spec/scenario/organize.md) — 移動先を選ぶと、移動後に誰が閲覧できるようになるか / できなくなるかが具体的に示される。確定すると即座に移動する。公開ページと共有リンクの URL は変わらない（アプリ内でのノートの URL は、新しい所属先の文脈のものに変わる）。 | S/O/E04 | G/M/E04 | D/O/E04 | G/D | D | O/S/D | O共用dialog; E04 | 0/0 |
| [ED-09](../../spec/scenario/editing.md) — 確認のうえ実行すると、ノートはゴミ箱に移り、一覧から消える。削除直後は画面上の「元に戻す」で取り消せる。 | S/O/E02/E10 | G/M/E02/E10 | D/O/E02/E10 | G/D | D | O/S/D | O共用dialog; E02/E10 | 0/0 |
| [ED-10](../../spec/scenario/editing.md) — 個別に「完全に削除」を選ぶと、確認のうえ復元できなくなる。「ゴミ箱を空にする」ですべてを完全削除できる。 | S/O/E02/E10 | G/M/E02/E10 | D/O/E02/E10 | G/D | D | O/S/D | O共用dialog; E02/E10 | 0/0 |
| [SH-01](../../spec/scenario/sharing.md) — 公開を選ぶと、公開タイムラインと検索の対象になる旨の確認が出る。変更は即座に反映される。 | S/O/E05 | G/M/E05 | D/O/E05 | G/D | D | O/S/D | O共用dialog; E05 | 0/0 |
| [SH-02](../../spec/scenario/sharing.md) — 共有リンクが表示され、「コピー」でクリップボードにコピーできる。コピーされたことがその場で示される。 | S/O/E05 | G/M/E05 | D/O/E05 | G/D | D | O/S/D | O共用dialog; E05 | 0/0 |
| [SH-03](../../spec/scenario/sharing.md) — 以降、共有リンクを開いた閲覧者にはパスワードの入力が求められる。設定済みのパスワードは変更・解除できる。 | S/O/E05 | G/M/E05 | D/O/E05 | G/D | D | O/S/D | O共用dialog; E05 | 0/0 |
| [SH-04](../../spec/scenario/sharing.md) — 既存のリンクが使えなくなる旨の確認を経て実行する。新しいリンクが発行され、古いリンクは無効になる。 | S/O/E05 | G/M/E05 | D/O/E05 | G/D | D | O/S/D | O共用dialog; E05 | 0/0 |
| [SH-08](../../spec/scenario/sharing.md) — バッジを選ぶと、現在の設定で誰が閲覧できるかが具体的に説明される（例: 「ワークスペース『設計』のメンバー 5 名とリンクを知っている人」）。パスワード保護の有無、共有リンクの有無もあわせて示される。 | S/O/E05 | G/M/E05 | D/O/E05 | G/D | D | O/S/D | O共用dialog; E05 | 0/0 |
| [UX-VISUAL](../../spec/requirements.md) — コマンドパレット以外にもすべての機能への視覚的な導線がある | S/O/E13 | R1/G/M | D/O/E13 | G/D | D | O/S/D | O共用dialog; E13 | 1/0 |
| [OR-09](../../spec/scenario/organize.md) — 操作を選ぶと、必要に応じて確認ダイアログを経て実行される。完了後、成功件数と失敗件数の内訳が表示される。 | S/O/E04 | G/M/E04 | D/O/E04 | G/D | D | O/S/D | O共用dialog; E04 | 0/0 |
| [IN-06](../../spec/scenario/integration.md) — バックアップジョブが登録され、進捗が表示される。完了すると、ノートに「バックアップ済み」の表示と Drive 上のファイルへのリンクが付く。 | S/O/E07/E11 | G/M/E07/E11 | D/O/E07/E11 | G/D | D | O/S/D | O共用dialog; E07/E11 | 0/0 |
| [EX-02](../../spec/scenario/export.md) — ZIP を生成するジョブが登録され、進捗が表示される。完了すると通知が表示され、ダウンロードできる。 | S/O/E08 | G/M/E08 | D/O/E08 | G/D | D | O/S/D | O共用dialog; E08 | 0/0 |
| [WS-10](../../spec/scenario/workspace.md) — 確認のためワークスペース名を入力する。実行すると、メンバー全員がアクセスできなくなり、個人の文脈へ遷移する。 | S/O/E03/E10 | G/M/E03/E10 | D/O/E03/E10 | G/D | D | O/S/D | O共用dialog; E03/E10 | 0/0 |
| [JB-03](../../spec/scenario/jobs.md) — 待機中の子ジョブは取り消され、既に実行中のものは完了を待って結果を残す。状態が「キャンセル済み」になり、内訳（完了 / 取り消し）が表示される。 | S/O/E09/E10 | G/M/E09/E10 | D/O/E09/E10 | G/D | D | O/S/D | O共用dialog; E09/E10 | 0/0 |
| [AC-07](../../spec/scenario/account.md) — 表示名、アイコン画像、自己紹介、公開ハンドル（公開ページの URL に使う一意の文字列）を編集する。保存すると、公開ページとタイムラインの表示に反映される。 | S/O/E05 | G/M/E05 | D/O/E05 | G/D | D | O/S/D | O共用dialog; E05 | 0/0 |
| [WS-07](../../spec/scenario/workspace.md) — 名前、説明、アイコン、公開ページのスラッグを編集する。保存すると、スコープトークン・タイムライン・公開ページの表示に反映される。 | S/O/E03 | G/M/E03 | D/O/E03 | G/D | D | O/S/D | O共用dialog; E03 | 0/0 |
| [WS-08](../../spec/scenario/workspace.md) — 公開に切り替えると、公開ページの URL が表示され、コピーできる。非公開に戻すと、公開ページは見られなくなる。 | S/O/E03 | G/M/E03 | D/O/E03 | G/D | D | O/S/D | O共用dialog; E03 | 0/0 |

## 旧独立actualの現在適用理由

| 独立根拠 | 45path差分後に適用する範囲・新観測との区別 |
| --- | --- |
| 自分c4060ab whole・E01–E13 | product19aef→candidate287cの45pathsはpresentation/UI/styleとtests。core production/domain/application/ports/DI/native/adapters/config/schema/docs差分0。Eの不変契約・実入出力だけ適用し、共用dialog/current/pending/UI表記の変更はO/Mで補う。下段全93rowは元candidateの記録として保持 |
| E02/E04 | saveNote/history/3mode/media/browse/tag/move/batch/purgeの規則・server boundary・repo不変。TagManager/NoteMoveAction/TrashDialog/EmptyTrashとsharedstyleの変更は今回O3幅・取消/pending/current Mで補う。旧画面を新native dialog画面根拠にはしない |
| E03/E05 | WSrole/public/profile/sharing token/password/privacy/public read/discoveryの契約不変。新SharingDialog/PublicationConfirmationとownerfocus・destructiveclassはO/M。WSGeneralのwindow.confirm/slug coreは45paths外で、今回dismissも観測。JSconfirmをPublicationConfirmation3幅へ読み替えない |
| E06/E09/E11 | 非音声LLM/reference、import/job正常・異常、5codec/STT用途/privacy/2段保存回復/Drive再生成のproduction不変。今回変化したAI文言・raw original noticeはO/R1、WAVtest追加はM redで分離。wholeの自己actualSTT2区間→chat、初回原本/再生成/undo・3幅modelを新取得と述べない |
| E07/E08/E10 | Drivebackup・ZIP/export/native cancel/closed/ACK/退会のproduction不変。sharedBatchDialogとPublication/WSDeletion入口だけO3幅。今回Drivewire/ZIPfile/PDFfile/nativechildを再取得したとは述べず、全通常5formats/CF Gと不変契約で旧actualを適用 |
| 66残ID | 新全体読みはしない。下段各原文/七条件/E適用を維持し、45path diffと全hollow-dialog/uiTerms consumer・既変更callerへ照合。新CSSはhollow-dialog/handle/destructiveに限定、非dialogpalette/reader/editorを変更せず。原本routeのR1到達は5IDへ限定。全UI旧評価を変更箇所へ追認しない |

7条件外は実Google/mail/OpenRouter/Drive接続・auth/send/op/課金/公開/deploy、実音声認識品質、providerの実fallback保証、最大負荷peak実証。tokensのmobile sheet shadow-md用例とdesign indexのdialog shadow-lg指定は両方読み、採用designの共通dialog shadow-lg・index明示規定に照合した。用例の別shadowを新基準の反例として追加しない。

## 正常閉鎖と精密保存

`account-browser.node.ts:542–577`のdrainはbooted.quiesce、listener close、organize/native shutdown、client close、全fixtureのclose/reject監査をawaitした成功だけprocess.exit(0)に至る。audio public wrapperはこの同入口を使用する。proxyもlistener close完了後実0。PID消失やTERM由来143を正常根拠にしていない。

| 自己環境 | 正規操作と実結果（UTC、2026-10-14） |
| --- | --- |
| i2ra browser | 全CLI同ownedproxy。正規close実0、browser.jsonlに実時刻保存 |
| runtime58365 | 04:19:32.517808+00:00開始。browser先close後TERM04:34:12.151797、caller/harness実0 at04:34:12.172423。success-only native quiesce/drain/fixtureclose経路 |
| rejectproxy58358 | 04:19:31.380208開始。browser先close後TERM04:34:12.152419、実0 at04:34:12.157163、closed出力 |
| 最終自己確認 | 04:34:27.821646+00:00、self process残0/記録PID残0、56021/56022/57065/57066接続拒否61、両source gitdiff0、R/logs/closure.json |

runtimeにnavigation中のRSC render abort出力がある。実利用結果/通常Gのunhandled0と分けて保持し、shutdown failureへ改名していない。browser driver失敗と診断red caller実1も全終了しており、新環境起動失敗rootは無い。旧wholeの失敗rootは今回操作しない。報告だけ精密commitし、既resumeは非commit維持する。最終commit通知後に全read/write/run STOPする。

以下はc4060abで保存した元wholeの詳細。対象candidateと観測時刻は今回とは異なり、今回の新しい直接観測とは扱わない。

<!-- integration02-repair-history -->
# Hollow 最終統合の独立読み2

対象候補 `3a3d20c4aa19e9ae1eb0893bfaf12941143557de`、製品 `19aef0b12c9ed866745a1dcd480f35ea7373dd3a`。全93固定ID（79シナリオ＋14体験・非機能・品質）を原文から読み、同じ7条件の反例を探索した。確定反例は3件、効くIDは18件。条件別は条件2にB1、条件6にB2/B3、他条件の規定形の反例は特定していない。成立認定を行う報告ではない。

必須未観測は0件。自身が今回ブラウザで再操作した範囲と、旧独立の実観測を現在へ限定適用した範囲は93行の表で分ける。特に今回のPDF端末fileは未取得で、開始表示やdelivery closedをfile成功へ読み替えない。EX-01は統合読み1の実取得23801bytesと本文観測を、PDF関連製品・共用nativeの差分0と今回の変更到達UI実測によって適用する（E08）。「全93を今回新しく実操作した」「全分岐が証明された」とは述べない。

各IDのcounter/必須未観測は次のとおり。必須未観測0はEの既actual限定適用を含む値である。

| ID | counter | 必須未観測 |
| --- | --- | --- |
| IM-01/02/06 | 2（B1/B3） | 0 |
| UX-VISUAL | 2（B2/B3） | 0 |
| IN-01/02/07、IM-03 | 1（B1） | 0 |
| OR-06/07/08、ED-09/10、SH-01/02/03/04/08 | 1（B2） | 0 |
| AC-01、AC-02、AC-03、AC-04、AC-05、AC-06、AC-07、AC-08、AC-09、AC-10、IN-03、IN-04、IN-05、IN-06、IN-08、IN-09、IM-04、IM-05、ED-01、ED-02、ED-03、ED-04、ED-05、ED-06、ED-07、ED-08、ED-11、OR-01、OR-02、OR-03、OR-04、OR-05、OR-09、OR-10、OR-11、OR-12、SH-05、SH-06、SH-07、WS-01、WS-02、WS-03、WS-04、WS-05、WS-06、WS-07、WS-08、WS-09、WS-10、DS-01、DS-02、DS-03、DS-04、DS-05、DS-06、EX-01、EX-02、EX-03、EX-04、JB-01、JB-02、JB-03、UX-LOCATION、UX-STATE、UX-KEYBOARD、UX-READING、UX-MOBILE、NFR-PRIVACY、NFR-HTML、NFR-ASYNC、NFR-JAPANESE、QA-BUILD、QA-TYPECHECK、QA-LINT、QA-TEST | 0 | 0 |

通常品質gateは全exit0、通常 `pnpm test` はunit2770＋Node1537（通常＋全5 formats）＋CF70＝4377、skip0/unhandled0。診断copyのbyteRate guard削除では関連15unit＋30integrationが赤くならず、原31999/send0から変異31999/send1へ変わった。診断は完全復元している。

7条件外・実行禁止の範囲は、実Google/SMTP/OpenRouter/Driveの認証・配送・送信・操作・課金・外部公開・本番deploy、検索エンジンへの実公開、実音声認識品質、STT fallback禁止の保証、瞬間RSS peak/200MiB・2GiB最大負荷の実証。これらを契約検証の成功から推定しない。公開primaryの supplied snapshotは下記で読んだ。

環境引継ぎは稼働0。成功runtime/browser/proxyは実exit0で正常閉鎖した。準備失敗2rootのexit1は正常閉鎖へ含めず保持する。2026-10-14T00:26:20.396871+00:00の自己process0/knownPID0/7listener接続拒否61・source/diagnostic diff0を、success-only native drain経路のcaller/harness exit0と併記する。報告以外の製品/tests/config/docs/管理filesは変更せず、既存resume.mdは未commitのまま。

| 反例 | 条件 | 効く固定ID | 実観測と到達追跡 |
| --- | --- | --- | --- |
| B1 | 2 | IN-01/02/07、IM-01/02/03/06 | coherent identityのWAV byteRate31999を拒否するguard削除が15＋30 testsを通過し、実STT送信0→1 |
| B2 | 6 | OR-06/07/08、ED-09/10、SH-01/02/03/04/08、UX-VISUAL | tag/trash/dialogのtoken・配置・mobile sheet規定不一致、sharing初期見切れ。OR-08/ED-10等は同component/styleへのcaller適用 |
| B3 | 6 | IM-01/02/06、UX-VISUAL | 原designのdomain LLM→UI AI対訳に対し、public uploadのLLM labelとAI/LLM混在 |

## 正本と方法

[requirements](../../spec/requirements.md)、[idea](../../spec/idea.md)、[scenario index](../../spec/scenario/index.md)と全10カテゴリ本文、[design index](../../spec/design/index.md)、[tokens](../../spec/design/tokens.md)、参照画面、[brief](../brief.md)、[design](../design.md)、AGENTS/CLAUDE、backend/frontend実装例、各runtime/reexecution docsを照合した。planから読むのは固定ID・原文の完成条件・依存・観測方法だけ。Manager/Mainの自己評価やphasesを根拠にしていない。goal-implement SKILLとreview-lensesに従い、修復設計・実装へ参加せず、子agentを追加しなかった。

異常は利用者決定のrepository integration/e2e、正常・UXはbrowser。存在assertや単にthrowしないassertだけで条件2を閉じず、固定した具体値のassertと意味ある変異を追った。旧独立reportsの成立評価ではなく、実操作/出力/変異/閉鎖と現在sourceのdiff・callerを適用理由に使う。C6をテストpassから推定しない。

新persistent root（R）は `/Users/hikaru/.local/share/hollow/verification/integration02-20261013T234626Z`。candidateのfresh clone `R/checkout`、停止診断専用 `R/diagnostic`、新HOME/DB/objects/合成鍵/mailbox。短persistent TMPDIRは `/Users/hikaru/.local/hwt/i2-234626`、browser socketはその `ab`。sanitized HOME/PATH/LANG/TMP/TEMP/TMPDIR、Nix Node22.22.3/Unicode16.0、同Node pnpm11.1.2/frozen install、FFmpeg/ffprobe8.0.1、audio Python3.13.12。private工具directory700/file600。PDFは通常Python3.14.3/waitidと固定Chrome・Arial Unicode/Courier Newの配備profile。build後だけruntime/browserを起動し、同時gate/rebuildはない。

Chrome144.0.7559.96/UA実測、agent-browser0.38.2、各専用session、空config、毎CLI同owned reject-onlyproxy55922、no allowed-domains。proxyはHTTP/CONNECT403だけでDNS/connect/forwardなし。known loopback55921とfixture URLだけ。製品CSP/guard/deadline/testtimeout/skipを緩和していない。

command/start/end/実exitの正本は `R/logs/results.jsonl`、`mutants.jsonl`、`extra-results.jsonl`、`browser.jsonl`、`harness-results.jsonl`（UTC ISO8601）。browser-cli.pyが全CLIの固定argsとstdout/stderrを保存する。画面はR/screenshots、実computedはbrowser.jsonl/dialog-observations.jsonl。独自probe期待値はproductionの検査・header helperから生成していない。

## B1: byteRate拒否分岐を守らない既存テスト

条件2の「境界・エラーを含む実装した全分岐」「guard削除等の意味ある変異で赤」を問う。原[IN-01](../../spec/scenario/integration.md)は音声アップロードから構造化が使えること、[IM-01/02/03/06](../../spec/scenario/import.md)は原本保持・個別結果・非同期・再生成を要求する。採用designの音声規則は16kHz PCM16 WAVの有限分割、原本identity・manifestを固定し、無言の切り詰めや壊れたsourceを送信成功へ置換しない。`transcriber.ts:59–78`は受け取ったWAV形式/identityを外部送信前にdecodeし、`:70`が `wav.readUInt32LE(28) !== 16000 * chunk.channels * 2` ならLLM_SOURCE_INVALIDとする。Coded operation契約はnot-sent/closedを区別する。

独立値はmono/16000Hz/PCM16、100frames、244bytes、RIFF長/data長/blockAlign/bits/identity.bytes/SHA256すべて整合し、byteRateだけ31999（境界32000−1）。正常32000の既wire testはあるが、この coherent identityかつ不正byteRateを固定したtestはない。`transcriber.test.ts:128`以降の15caseと `llmAudio.integration.test.ts` の30caseを読み、header fixtureから正常sourceを構成するassertだけでは当該guardを守れないことを変異で確認した。audioWorker→transcriberはupload、initial generation、retry/regen、Drive audio再生成が共有する。IN-02の用途設定も同transcriberへ渡るため6音声IDとIN-07へ届く。

| 操作と期待 | 実際・時刻（UTC 2026-10-13） |
| --- | --- |
| 原code＋独立31999。LLM_SOURCE_INVALID/not-sent/closed=true/send0 | 23:56:46.790969–23:56:47.303913、exit0、期待どおり拒否。wav-original-probe.log |
| 停止copyのbyteRate guard1行のみ削除、同値 | 23:56:47.304682–23:56:47.476733、exit0、transcript成功/send1。wav-mutant-probe.log |
| 関連unitを変異下で実行 | 23:56:47.477117–23:56:49.196257、exit0、15pass、red0 |
| 関連integrationを変異下で実行 | 23:56:49.196671–23:57:08.031448、exit0、30pass、red0 |
| 原bytes完全復元、unit再実行 | 23:57:08.032021–23:57:08.782501、exit0、15pass |
| 送信/closeを独立wireで追記 | 23:58:53.202710–23:58:53.389021、exit0、実POST `/api/v1/audio/transcriptions`、Whisper、provider deny/zdr=true、復号WAV byteRate31999、request/response/socket/server close全true |
| 再復元して同独立wire probe | 23:58:53.389299–23:58:53.561696、exit0、LLM_SOURCE_INVALID/not-sent/closed=true/count0、wireなし、server close=true。作られていないrequest/response/socketをclose成功へ数えない |

probeは `R/diagnostic-probe.mts`、driverはR/mutate.py。`finally`で原bytesを戻し、診断gitdiff実0と最終再確認diff0を残した。raw logsはwav-mutant-unit/integration、wav-mutant-wire-close、wav-restored-wire-close、wav-wire-restoration.json。この不足はテストの反例で、最終製品codeが31999を送信する不具合とは述べない。

## B2: ダイアログの明示規定と実画面の不一致

条件6の「project tokens/design方針・同種の置き方」「3幅で見切れ・重なり・届かない操作なし」を問う。[design index:171–175](../../spec/design/index.md)は「パレットと同じ視覚言語」「--radius-lg / --shadow-lg / 白地 / 上から8vh」、sm未満は「ボトムシート（下端…上端のみ角丸、ドラッグハンドル付き）」を指定する。[tokens:218/223/254](../../spec/design/tokens.md)はradius-lg12px、14px等の中間値を作らず、shadow-lg `0 16px 48px rgba(0,0,0,0.1)`。同種 `pages/common-dialogs.html:73/139–141` は指定tokenと上端角丸sheetを使う。current paletteも同12/16/48/8vhで、比較対象の規定は実装都合から追加していない。P13の最小修復は14px/8pxや中央配置を採用する具体決定ではなく、design:304/306も旧dialog維持をtoken規定の置換理由にしない。

通常の一覧「cancelled.htmlにタグ追加」、候補解決待ち、Escape、削除確認、Escape、通常note詳細の限定公開「共有設定」で実測した。確認途中のpending画像をresolved proofへ数えない。

| UI | 1280×720 | 375×812 | 320×760 | 原規定と異なる値 |
| --- | --- | --- | --- | --- |
| tag | top0/left0/width544/height404.34375 | top0/left0/width341/height396.34375 | top0/left0/width286/height396.34375 | radius14px、shadow rgba(.133) 0/18/70、8vhでなくtop0。mobileも下端sheet/handleでない |
| trash確認 | top228.546875/width544/bottom491.453125 | top239.46875/width341/bottom572.53125 | top213.46875/width286/bottom546.53125 | radius8px/shadownone、中央配置。mobileもsheetでない |
| sharing | top321/width582/height688/bottom1009 | top319.765625/width325/height796/bottom1115.765625 | top293.765625/width270/height744/bottom1037.765625 | 初期viewport下端を超える。shadow rgba(.2)0/18/70、background255,254,251、mobile非sheet |

page scrollWidthは3幅ともviewportと一致した。横overflowゼロだけでは縦の見切れと同種規定不一致を埋めない。UTC2026-10-14T00:03:21–00:03:48のdialog-observations.jsonl、1280tag resolvedはbrowser.jsonl。画像は `<width>-tag-dialog.png`（1280は `1280-tag-dialog-resolved.png`）、`<width>-trash-dialog.png`、`<width>-sharing-dialog.png`。画像を自身で閲覧して実computedと照合した。

`tag/tag.css:6/10` が14px/18–70、native TagDialog:21/31がこのclass。trash.css:23–32はmargin:auto/radius0.5remでshadowなし。sharing.css:1–9はfixed inset0/flex中央、:28は異なるshadow。SharingDialogはportalを使わずinline描画し、詳細route:254/264→NoteSharingAction:66→SharingPanel:273を経て `.hollow-reading-bar` 内に置かれる。hollow.css:448–462のsticky祖先のbackdrop-filter blur12がfixedの包含範囲を変え、320のoverlay実rectはx17/y584.515625/w286/h162.484375となる。

320でpanel末尾scroll412へ移動しても初期password button958.875–1002.875は下端760を超えた。ただしページ末尾scrollY1928へ進むとdialog top15.75/bottom759.75、password button680.859375–724.859375へ届く（00:05:28.200499–00:05:28.209416、CLI/eval exit0、320-sharing-page-and-panel-end.png）。したがって永久操作不能/SH-03機能不成立とは数えず、初期見切れ・配置/tokenの反例として記録する。

| 到達ID | 原文とcaller |
| --- | --- |
| OR-06/07 | organize:112–116「選ぶと入力欄が開き…候補」「選ぶと即座にタグ」、:134–136「同じ入力・候補」。ScopedNotesBoard:710/NoteTags:204→TagPicker:141→TagDialog。自身picker観測 |
| OR-08 | タグrename/delete/mergeの確認。TagManager:434も同TagDialog/classへ届く。自身pickerのtoken反例を同style callerへ適用し、管理dialogを新実観測と述べない |
| ED-09 | editing:175–176「詳細または一覧…確認」。ScopedNotesBoard:972/NoteTrashAction:95→NoteTrashDialog:55。自身確認観測 |
| ED-10 | editing:196「完全に削除…確認」。TrashList:374→PurgeConfirm:27が同hollow-trash-dialog。caller/style適用のみ |
| SH-01/02/03/04/08 | sharing各「共有パネル」「共有リンク」「パスワード」「再発行」「公開範囲」。同SharingPanelが全controlsを保持する。detail limitedを自身実観測、編集NoteEditor:1348にも同Panelが届く |
| UX-VISUAL | 原requirementsの全機能の視覚導線へ現dialog実画面と明示designを対応。新しい主観的磨き込み条件は追加しない |

## B3: UI対訳LLM→AIの不一致

条件6の同種文言/design方針を問う。[design index:325–329](../../spec/design/index.md)は「ドメイン語彙とUI表記が異なる語…次の対訳表を正」「実装では…辞書1箇所」、表は `LLM | AI`。シナリオのdomain語LLMを、そのままUI表記を許可する利用者決定へ読み替えない。

public `/notes/import` のcheckboxは3幅すべて「LLMを使わずに取り込む」（ImportUpload:364）、同説明:367はAIとLLMを混在させる。UTC00:08台の3viewport evalはpageWidth1280/375/320を記録。320の通常scroll850後、label rect277.5625–301.359375を画面内で実測した（00:09前後browser.jsonl、320-upload-llm-visible.png）。設定 `/settings/openrouter` の同用途説明は実「AI変換」、LlmNoteActionも「AI変換」であり同種比較ができる。例示filename/model名や外部本文の英語を新翻訳条件にしない。

IM-01の機械変換選択、IM-02:83の「IM-01と同じ扱い」の複数受付へ同ImportUploadが届く。IM-06のnoAI初回・失敗から生成する入口は同upload説明とNoteConversionStatusのLLM変換/連携文言へ届く（後者はcaller/source適用、今回failed画面の新実操作ではない）。UX-VISUALと合わせ4ID。これはUI表記の反例で、受付・生成の機能不具合として数えない。

## G: 自身の通常品質・診断

品質/full中はruntime/browserを起動せず、実test driver exit0と関連process終了を確認してから診断・runtimeへ進んだ。R/logs/full-test-completion.jsonの2026-10-13T23:56:33Zには関連test process=[]。

| command | UTC ISO8601開始–終了 | 実exit |
| --- | --- | --- |
| `node -p JSON.stringify({node:process.version,unicode:process.versions.unicode})` | 2026-10-13T23:46:30.545187+00:00 → 2026-10-13T23:46:34.892455+00:00 | 0 |
| `pnpm install --frozen-lockfile` | 2026-10-13T23:46:34.892885+00:00 → 2026-10-13T23:46:50.955574+00:00 | 0 |
| `pnpm exec node -v` | 2026-10-13T23:46:50.956345+00:00 → 2026-10-13T23:46:51.924962+00:00 | 0 |
| `pnpm typecheck` | 2026-10-13T23:46:51.925259+00:00 → 2026-10-13T23:46:59.351522+00:00 | 0 |
| `pnpm lint:fix` | 2026-10-13T23:46:59.351861+00:00 → 2026-10-13T23:47:03.679082+00:00 | 0 |
| `pnpm format` | 2026-10-13T23:47:03.679368+00:00 → 2026-10-13T23:47:04.809851+00:00 | 0 |
| `pnpm lint` | 2026-10-13T23:47:04.810162+00:00 → 2026-10-13T23:47:06.423956+00:00 | 0 |
| `pnpm format:check` | 2026-10-13T23:47:06.424264+00:00 → 2026-10-13T23:47:07.572213+00:00 | 0 |
| `pnpm build` | 2026-10-13T23:47:07.572534+00:00 → 2026-10-13T23:47:15.600715+00:00 | 0 |
| `pnpm test` | 2026-10-13T23:47:15.601017+00:00 → 2026-10-13T23:56:09.572111+00:00 | 0 |

停止診断の対照redはSTT zdr true→false（unit1red/14pass、復元15pass）、tag50文字 >→>=（1red/1pass、復元2pass）、viewer guard削除（workspace3red/11pass、復元14pass）、private guard削除（sharing2red/20pass、復元22pass）。期待は各wire exact shape、固定50 Unicode codepoints、具体viewer保存/復元/retry拒否、privateのSHARE_NOT_FOUNDであり存在assertだけではない。実時刻/command/exitはmutants.jsonl。各redのexit1を通常full失敗や正常停止へ混ぜない。

## A: 7条件を全体へ問う読み

| 条件 | 全体で照合した根拠と限界 |
| --- | --- |
| 1 要件 | 原文全scenario/briefから完成条件を固定し、79正常＋異常分岐と14横断条件をmatrixへ対応。外部依存はowned契約段階を守り、primary supplied snapshotのSTTRequest/用途を読んだ。mandatory TODO/FIXME/stub検索はtemplate todo識別子や明示不対応branchと区別。Drive原本保持の仕様に従う案内を未接続機能にしない。必須code未接続の引用形は特定しなかった |
| 2 全振る舞い | 各E群のdomain/VO/transport/application/DB/native/HTTP/UI testsを現fullで実行し、正常・境界±1・空/null・重複・順序・retry・認可を原期待へ対応。独立4red対照とB1 survive。旧transcript65519/65520およびscope same/different/undefinedのredはcode/tests差分を限定して適用。fullpassや過去redをB1未保護分岐の証明にしない |
| 3 既存維持 | 変更関数/型/componentのcaller、route/query/API/env/exportの参照、shared state/style、旧完成条件の4到達をE表とcandidate diffで追った。FF15→candidateの23pathではcore production/ports/native/DI/config/schemaは不変更。width/sticky/palette/viewの影響は旧UIをそのまま適用せず今回3幅と旧近接repairの実測へ限定。追加の回帰の規定形は特定しなかった |
| 4 規約/設計 | G全0、AGENTS/CLAUDEの純粋内層/ports/UoW/transport・VO validation/構造error/React19 pending ownershipを照合。00:27:50.860211Zのproduction domain/application293file literal import監査で外向き/framework/node imports0（tests/DI除外、dynamic/callerは手読み）。これは全call graphの自動証明ではない。触れたruntime docsは現用途・配備/再実行を述べる。JSDoc/WHY以外の新comment違反の引用は特定しなかった |
| 5 新負債 | 下記Dの既集約との比較を行い、value/type/関数1意味、判別unionでstage/provider/chat混用を排除、boundarydecode、副作用adapter、quota/UoW/current/dispatch再利用を追った。次変更の差分が広がる新不要抽象・deadbranchの具体反例は特定しなかった。UIのB2/3は明示design不一致として条件6へ返し、新負債の別成立認定へ置換しない |
| 6 UI | tokens/index/同種画面と1280×720/375×812/320×760のbrowser比較。説明/状態/権限/iframe本文・視覚入口・合法長名ellipsisを原文範囲で照合。B2/B3を返す。3幅page横幅一致や通常testpassをdialog全体の画面根拠にしない |
| 7 実観測 | 下記Oの自分のbrowser期待/実際とEの既独立actual操作/成果物を区別。異常はrepo integration/e2e。今回PDF端末fileは未取得と残し、E08の近いactualfileとsource/current共用到達差分の理由を明記。未実行の実サービス・認識品質を必須のローカル観測へ数えない |

## D: 新規構造と既集約の比較

| 構造 | 拡張可能だった既構造との比較・次変更の到達 |
| --- | --- |
| account/session/credential/retirement | 既account UnitOfWork/typed errors/credential ownershipへ接続し、Google/mailはadapter portのprovider decode。退会は既retention/current gatesを拡張、別認可ledgerや未来provider registryではない。次credential-close規則は既owned transport/ACKとdeletion workerへ届く。E01/E10/P10のnative実観測と現fullを照合 |
| editor/history/media/trash | 既note/version/UoW・既media reservationsとparent list所有を使用し、WYS/HTML/文字編集は各編集契約へ分離。次採用HTMLルールは既sanitizer/planner/saveNoteに届き、3mode任意metadataでillegal stateを後付けしない。E02と今回保存/iframe/modeを照合 |
| workspace/browse/tag/batch/publication | 既scope/current access・TagName/ID/50cap・keyset/search session/filterへ集約。公開全体検索を別権限cacheへ分岐しない。current scope名だけ既browse/model pure projectionで更新しcapturedquery identityを保存する設計理由はdesign末尾とrepairの独立same-openを照合。次名前表示はmodel/binding、次token値は既Hollow consumer限定 |
| OpenRouter/audio/Drive | AudioRecipe/Plan/Chunk/Transcriptは既source contract/dispatch/model用途の判別型を延長。STTとchatは別wire/response、quota・conversion・current ownerを共有。FFmpeg工具と監視は既native births reserveManyを拡張しaudio2/non-audio1を同閉鎖契約で扱う。Drive readIntoは既exchange/owned streamへsinkを接続。次privacyは用途profile/adapter、次audio stageは既audioWorker/plan、別台帳や全provider抽象を追加しない。E06/E07/E11とB1を照合 |
| PDF/ZIP/jobs | 既snapshot/ChildPin/transfers/native reservation/artifact/UoWに接続し、deliveriesとrequest/cacheは各意味を保持。次expiry/visibility規則は既current snapshot/repository/delivery routes、次export formatは既document plannerへ届く。P10取消とP11native一括予約を含む近接FF15統合のactual exportをE08で照合 |
| UI dimensions/tokens/日本語 | 既route/layout所有の幅とHollow token consumer、既palette/sessionへ拡張。全template共通radius/shadowを変更する案や新universalwrapperと比較し、影響をconsumerへ限定したdesign理由を読む。B2の独立各dialog CSSとB3対訳不一致は現在counterとして残る |

## O: 自身の主要正常・3幅

R/logs/browser.jsonlの全CLIはUTC ISO8601/実exit、原文期待を独立に取る。製品HTML/応答を書換えるevalは使わず、evalはDOM/rect/textの読取だけ。通常click/fill/press/select/upload/scroll/scrollintoview/dialogで操作した。

| 期待・ID範囲 | 自身の観測 | 根拠 |
| --- | --- | --- |
| AC-04/ED-02/03/04/07、NFR-HTML | ordinary owner email/password/Enter→notes。共同ノートのHTMLへ独立『統合読み2 保存本文』『比較する本文2026-10-14』を入力→保存済み→完了→同本文がdetail iframe。tool fillは既本文を末尾に残したため、その実HTMLを期待に固定し完全置換と述べない。WYS警告を通常確認、ready contenteditable、HTML preview、文字編集iframeへ切替 | UTC00:09–00:12、ready mode snapshot/aria-pressed、<width>-editor-*-ready.png、detail actual text、sandbox allow-same-origin。早すぎる初期frame画像はready proofへ数えない |
| SH-05/07/UX-READING | 匿名bのpublic/limited URLから原題・本文。public1280main680、375/320pageWidth一致、iframe本文『東京駅の記録Cloudflare…』、sandbox境界 | UTC00:11台、<width>-anon-public.png、320-anon-limited.png、browser.jsonl |
| OR-06/ED-09/SH-01〜04/08/UX-VISUAL | 通常tag候補・trash確認取消・限定共有を3幅で観測 | B2のresolved画像/実computed。永久操作不能を追加しない |
| IM-01/02/UX-VISUAL | public upload保存先/希望範囲/方式/原本警告・3幅。LLM表記はB3 | <width>-upload-llm.png、320-upload-llm-visible.png、settings AI実text |
| IN-01/02/IM-01/03/06 | audio用公開wrapper/newDBでowned consent連携→121秒audio-chunks.wav受付→本文。初回STT2区間3840044/32044bytes、1920000/16000frames、Whisper deny/zdr、chat Gemini deny/fallbackfalse/requiretrue、1使用/0予約。2区間でも論理1回 | UTC00:13:54–00:14:29、runtime-audio/integration-local/requests.jsonl、browser iframe本文/usage |
| IN-02/IM-06/UX-MOBILE | 普通の用途catalog更新・select STT-v2/text-v2・追加指示→本文置換confirm→両モデル実wire→text-v2本文。通常戻すconfirm→旧Gemini本文。再生成で2使用、復元しても2使用/0予約 | UTC00:15:25–00:15:57、<width>-audio-models-visible.png（通常scrollintoview後rectを測定）/320-audio-restored.png、実wire/purpose/privacy、3幅pageWidth一致 |
| EX-01/JB-01 | PDF ordinary request→進捗→完了通知/24h期限/取得入口。320通常scrollintoviewでbutton358.484375–402.484375/hitはbutton自身。通常取得POST503予約busy→期限後200、UI開始、delivery closed。今回端末PDFfileは未取得 | UTC00:12/00:17–00:25、PDF切り分け節/E08。actualfile成功は旧近接観測の限定適用のみ |

## E: 既独立の実根拠を現在へ適用する理由

R/logs/legacy-applicability.json（2026-10-13T23:56:13.096154+00:00）のgroup別gitdiff実0、current-applicability-and-audit.json（2026-10-14T00:27:50.860211+00:00）のFF15→candidate23path差分を読む。各reportのpass/合格/Manager受入文を証拠にせず、下記actual段落/出力へ限定する。原文正常/異常を今すべて再操作したとは述べない。

| 群・原根拠 | 具体観測・現適用理由 | 現test/caller（Gで実行） |
| --- | --- | --- |
| E01 [P01](P01.md) 対象browser/Unicode/FIFO | 同browser確認・Unicode12/128・reset旧session失効・localGoogle、realSMTP契約。db096a4→currentのnativecredential/Google/P10変更はE10へ分け、Auth/PasswordFields不変更と自身普通signinを照合 | authenticationHttp、authenticationMethods、account/VO/transport・mail native tests |
| E02 [P02-first](P02-first.md)/[rest](P02-rest.md) 各ED実操作・原文異常 | 3mode、保存/離脱/警告/20版/media/移動/trash/purge。1c8c48dからeditor/WYS/media不変更、getNote/conversion/history/purge/saveNote後続はP04/P09/P10と現DB/e2e、今回HTML保存/3mode/同iframeで補う。dialogstyleはB2で限定 | revisions、hollow/imports、editor source/visual/WYS e2e、TrashActions |
| E03 [P03](P03.md) WS各実操作・原文異常 | 招待/role/settings/slug/public/退会。0e13e93からworkspace settings核心不変更、access/deliveryはP10currentfence・現workspace14caseと独立viewer redへ照合。scopeの幅/常時可視はE13/current近接repairで補う | workspace、smtpInvitation、input/role/current guards |
| E04 [P04](P04.md) OR各正常と原文異常 | tile/list/calendar/keyset/AND語境界/tag50Unicode/batch/move/zone/sort。b64a3bbからbrowse/tag/batch/move規則不変更、palette/sessionは近接repairのsame-open/新名/query/active/focus実3幅。tag50境界を自身red→green | browse、batch、tag entity、move、SearchPalette/model/SearchExecution |
| E05 [P05](P05.md) SH/DS実正常・HTTP異常 | public/link/password/reissue、profile/WS/discovery/SEO/generic404。4e0362fe→currentのreader参照P06・retired author P10・shell幅を分離。現private guard独立redと自身匿名public/limited本文。B2のPanel geometryは旧画面判定の適用外 | sharing/publicReading/publicDiscovery、sharing/publication/discovery HTTP、SharingPanel/model |
| E06 [P06](P06.md)/[readers](P06-readers.md) 非音声/恒久参照 | OR callback/epoch/reconnect/unlink/model/quota/non-audio/参照ledger。e2141c3後のcredential/P10とSTT/P11はE10/11へ分け、P06の非音声をSTTへ推定しない。source/live reader/CSS欄/currentrefs保持は現testsとactual読者差分へ照合 | openRouterApplication/Http、llm text/image/localformats/PDF、references/HTTP |
| E07 [P07](P07.md) Drive原文正常/取得物 | folder確認/retarget/auto/manual原本backup/current権限/記録者。49d6a56後のACK/ownershipはP10、readInto/audioはP11 B1の4 stream closure/別editor owner原本実取得に置換。旧buffer成功を新sink閉鎖へ流用しない | driveBackupAutomatic/Application/Closure、driveRegeneration、driveSourceClosure、native machine regeneration |
| E08 [P08](P08.md) EX各取得物、[統合読み1:122/144](integration-01.md) | P08の69708bytes/sameSHA/匿名三形式は後続P10/P11 native共用到達を統合読み1のactualHTML727/MD450/PDF23801bytes・1頁本文parser終了0で補う。FF15→candidate23pathsにPDF/ZIP domain/application/adapters/DI/native births/ChildPin/server/Panel/client/delivery/schema/configは無い。従ってP10/P11を含む現在に近いnative/保存期限/認可/cache実取得を適用。共有layout/読者shellは変わるため今回正常button rect/hit/clickと匿名本文、近接repair3幅を補う。PDF fileの今回再取得未観測は残す | exportFlow、export/pdfFlow/PDFsupervisor/zipFlow/retirement、全native5groups。PdfHistory関連UI変化は近接diff/caller限定 |
| E09 [P09](P09.md) 修正1と各JB正常/原文異常 | 初回public/link保留・手動共有優先・同親failed-onlyretry・timeline90日・browserclose後30秒完了/再訪。同sourceのnon-audio規則は66cbd96から不変更、audio受付/投影はP11/現full/自身2stageへ分ける。ImportJobs CSSだけの23path差分は現在UIとE13へ照合 | imports、job timeline/read/detail、LLM inputstage/current/retry、initialPublication/saveNote |
| E10 [P10](P10.md) AC09/JB03/NFR実native | R3/R6実child exit0/IPC/pipes・同DBACK/closed、退会本人/別session失効・最終debt0/PII null・WS原本259bytes保持。0c8ec7eからdeletionworker/repo/credentialownership製品diff0、P11cancelは同current/runtime契約を通る現fullに対応。旧同DB再起動を今回再実行と述べない | accountDeletion Credentials/DriveAcknowledgment/native/zipRetirement、runner/current shutdown |
| E11 [P11](P11.md) 修復1の独立再検証 | 5codec/WS別editor/auto-backup/ownerDrive取得/noAI初回/failedretry/cancel/2stage回復のactual。ff15c55からaudio/domain/adapters/Drive source製品diff0、testsだけboundary修復。現在自身2区間/用途別wire/再生成/undo/3幅を加える。旧4redやtranscriptredをB1 byteRateへ拡張しない | transcriber15、llmAudio30、audioWorker、audioPrepare/native/runtimereserve/source/current/DBmigration |
| E13 [P13](P13.md)、[近接repair:60–102](integration-01-repair.md) actual3幅 | 白無彩色/日本語root/visual/keyboard/wrap、23route×3幅とpalette12px/16–48/8vh、current scope rename/same-open/longellipsis/戻りfocus。追加scope2token/modelと今回caller/3幅を照合。old全UIpassをB2/3や未操作dialogのgeometryへ適用しない | current browse/UI/input/permission/e2e、G、Oと原design/token |

## PDF再観測の欠けと準備失敗の分離

自身のEX-01再観測は生成完了・取得入口・原HTTP200/開始UI/delivery閉鎖までで、端末PDFfileの取得は新しく観測していない。統合読み1のactual三形式/本文（候補FF15、既P10/P11統合済み）へE08のsource差分0とsharedUI到達実測を適用するため、原完了条件の必須未観測は残さない。今回file未取得を隠すために古いpass評価やclosedをfile成功へ読み替えていない。

`agent-browser download @e47` は待機し、CDP Target.closeTargetで自己pageだけ解放した後に実exit1（role/button locate不可）。正規d closeは実0。download helperの待機結果は製品反例/正常取得根拠ではない。別freshbrowser eの通常clickをCDP Networkで原応答観測し、00:21:36.221908–00:21:40.870808 exit0でPOST503/PDF_DELIVERY_BUSY（ready予約120秒）、00:22:35.807074–00:22:40.004508 exit0でPOST200/id,url,filename,expiresAtを確認。UI開始、native delivery closedへ進んだ。Browserの保存先だけ指定するobserverは15秒イベント0/exit1、context指定はunknown contextのエラーを保持し、CSP/HTTP原応答/製品guardは改変しなかった。Page保存先設定のdiagnosisはexit0だがfileなし。最後のdirect URL診断は既closed deliveryなので正常取得証拠へ数えない。関連logsはpdf-http-observer/2、pdf-log-observer、pdf-page-download、browser-download-diagnosis/release、browser.jsonl。

起動準備で直Nodeの相対 `--import tsx` をharness chdir/workerへ継承した2rootは、fixture「State fixture job missing」とIMPORT_CORRUPTで実exit1（runtime90716/23:59:01.463032、runtime-ux91102/00:00:00.431320）。各failedroot/DB/ログを保持し、00:01:28.858634Zに両PID/child残0・55921拒否61を確認。これを正常製品観測/閉鎖0へ含めない。インストール済み絶対tsx loaderを同source/tool/通常公開UX wrapperへ指定した新rootはHTML/MD正常本文になった。本文/応答の改変やerror/native guardを回避するtestdoorは追加しない。

browserのown HOME socket path106>103の準備失敗は短persistent socketへ訂正。誤route `/import`・`/notes/upload`、存在しないselector、RSC/frame初期、stale ref、WYS警告確認前、wrong option limited（正規link）、wrong待機文言、ordinaryPDFauto-scrollのbar被覆は実logsへ保持し、解決済み通常操作/ready画像と分けた。audio取り込みはprivateであり、誤selectをlimited希望成功へ数えない。旧近接read1の初回limited希望実観測は同不変intent経路に限り適用する。

## 93固定IDの原文・7条件・観測範囲

各行の原文完成条件はscenario本文の正常終端に全異常節を合わせて読む。横断14はrequirements/CLAUDEに固定する。`S`=当該原文全節とbrief、`E`=上記実根拠の限定適用、`G`=自身品質/full、`A`=上記全体監査、`D`=既集約比較、`O`=今回browser、`R13`=近接repair actual3幅。C1〜C7は「根拠と探索範囲」で、0は反例を特定しなかった件数であり成立認定ではない。必須未観測列は旧actual適用を含めた値。counter列は各IDに効く確定反例だけ。

| ID・原文 | 原文の完成条件（全異常節も対象） | C1 | C2 | C3 | C4 | C5 | C6 | C7/今回範囲・旧適用 | counter/必須未観測 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [AC-01](../../spec/scenario/account.md) | 受信したメールのリンクを、確認を要求したのと同じブラウザーで開くと、メールアドレスが確認済みになりサインイン状態でノート一覧に着地する。ノートが 1 件もないため、最初のファイルをアップロードするよう促す案内が表示される。 | S/E01 | G/E01 | E01/diff/caller | G/A | D/E01 | E13/R13 | E01；今回再操作なし；E01の旧actual限定適用 | 0/0 |
| [AC-02](../../spec/scenario/account.md) | 確認メールのリンクを開く。確認を要求したのと同じブラウザーで開いた場合は、確認が完了しサインイン状態でノート一覧に遷移する。 | S/E01 | G/E01 | E01/diff/caller | G/A | D/E01 | E13/R13 | E01；今回再操作なし；E01の旧actual限定適用 | 0/0 |
| [AC-03](../../spec/scenario/account.md) | サービスに戻り、初回であればアカウントが作成され、2 回目以降は既存アカウントにサインインする。ノート一覧に着地する。 | S/E01 | G/E01 | E01/diff/caller | G/A | D/E01 | E13/R13 | E01；今回再操作なし；E01の旧actual限定適用 | 0/0 |
| [AC-04](../../spec/scenario/account.md) | サインイン画面でメールアドレスとパスワードを入力する。認証に成功し、直前に開こうとしていた画面（なければノート一覧）に遷移する。 | S/E01 | G/E01 | E01/diff/caller | G/A | D/E01 | E13/R13 | E01；O普通signin | 0/0 |
| [AC-05](../../spec/scenario/account.md) | メールのリンクを開き、新しいパスワードを 2 回入力して確定する。完了後、他のすべてのセッションが無効化され、新しいパスワードでサインインする。 | S/E01 | G/E01 | E01/diff/caller | G/A | D/E01 | E13/R13 | E01；今回再操作なし；E01の旧actual限定適用 | 0/0 |
| [AC-06](../../spec/scenario/account.md) | パスワードが設定済みの場合は「変更」を選び、現在のパスワードと新しいパスワードを入力して更新する。不要な方法は「解除」を選び、確認ダイアログを経て削除する。 | S/E01 | G/E01 | E01/diff/caller | G/A | D/E01 | E13/R13 | E01；今回再操作なし；E01の旧actual限定適用 | 0/0 |
| [AC-07](../../spec/scenario/account.md) | 表示名、アイコン画像、自己紹介、公開ハンドル（公開ページの URL に使う一意の文字列）を編集する。保存すると、公開ページとタイムラインの表示に反映される。 | S/E01 | G/E01 | E01/diff/caller | G/A | D/E01 | E13/R13 | E01；今回再操作なし；E01の旧actual限定適用 | 0/0 |
| [AC-08](../../spec/scenario/account.md) | 上部バーのアカウントメニューから「サインアウト」を選ぶ。セッションが破棄され、トップページに遷移する。 | S/E01 | G/E01 | E01/diff/caller | G/A | D/E01 | E13/R13 | E01；今回再操作なし；E01の旧actual限定適用 | 0/0 |
| [AC-09](../../spec/scenario/account.md) | 確認のため自分のメールアドレスを入力する。実行すると即座にサインアウトされ、アカウントと関連データが削除される。 | S/E10 | G/E10 | E10/diff/caller | G/A | D/E10 | E13/R13 | E10；今回再操作なし；E10の旧actual限定適用 | 0/0 |
| [AC-10](../../spec/scenario/account.md) | owner または editor として参加しているワークスペースについても、ワークスペースごとの使用量と上限が表示される。当月の LLM 実行回数と上限が表示される。 | S/E06 | G/E06 | E06/diff/caller | G/A | D/E06 | E13/R13 | E06；今回再操作なし；E06の旧actual限定適用 | 0/0 |
| [IN-01](../../spec/scenario/integration.md) | 連携を待って本文の生成が止まっていたノートがあれば、その件数が示され、一覧へ移動できる。以降、画像・音声・テキストのない PDF のアップロードで LLM による構造化が使えるようになる。 | S/E06/E11 | G/E06/E11/B1 | E06/E11/diff/caller | G/A | D/E06/E11 | E13/R13 | E06/E11；O owned連携/音声2段 | B1/0 |
| [IN-02](../../spec/scenario/integration.md) | 用途ごとにモデルを選ぶ。保存すると、以降の変換に反映される。 | S/E06/E11 | G/E06/E11/B1 | E06/E11/diff/caller | G/A | D/E06/E11 | E13/R13 | E06/E11；O2用途選択/実wire3幅 | B1/0 |
| [IN-03](../../spec/scenario/integration.md) | 解除後にできなくなること（LLM を要する変換・再生成）の説明を読んで確定する。保存されていた鍵が破棄され、未連携の表示に戻る。 | S/E06 | G/E06 | E06/diff/caller | G/A | D/E06 | E13/R13 | E06；今回再操作なし；E06の旧actual限定適用 | 0/0 |
| [IN-04](../../spec/scenario/integration.md) | サービスに戻り、連携済みと表示される。バックアップ先フォルダの設定（IN-05）へ進む導線が表示される。 | S/E07 | G/E07 | E07/diff/caller | G/A | D/E07 | E13/R13 | E07；今回再操作なし；E07の旧actual限定適用 | 0/0 |
| [IN-05](../../spec/scenario/integration.md) | 「アップロード時に元ファイルを自動バックアップする」のオン / オフを切り替える。保存する。保存先不明時は確認後に再選択/新規作成し、無断で再作成しない（briefの利用者決定を優先）。 | S/E07 | G/E07 | E07/diff/caller | G/A | D/E07 | E13/R13 | E07；今回再操作なし；E07の旧actual限定適用 | 0/0 |
| [IN-06](../../spec/scenario/integration.md) | バックアップジョブが登録され、進捗が表示される。完了すると、ノートに「バックアップ済み」の表示と Drive 上のファイルへのリンクが付く。 | S/E07 | G/E07 | E07/diff/caller | G/A | D/E07 | E13/R13 | E07；今回再操作なし；E07の旧actual限定適用 | 0/0 |
| [IN-07](../../spec/scenario/integration.md) | 元ファイルが Drive から取得され、変換ジョブが実行される。完了後、新しい本文でノートが更新される。タグ・公開設定・共有リンクは維持される。 | S/E07/E11 | G/E07/E11/B1 | E07/E11/diff/caller | G/A | D/E07/E11 | E13/R13 | E07/E11；今回再操作なし；E07/E11の旧actual限定適用 | B1/0 |
| [IN-08](../../spec/scenario/integration.md) | 連携ごとの設定（モデル、バックアップ先）への導線が表示される。連携に関わる処理の結果は処理履歴（JB-01）で確認する。 | S/E06 | G/E06 | E06/diff/caller | G/A | D/E06 | E13/R13 | E06；今回再操作なし；E06の旧actual限定適用 | 0/0 |
| [IN-09](../../spec/scenario/integration.md) | 解除後もバックアップ済みのファイルは Drive に残ること、再生成（IN-07）ができなくなることの説明を読んで確定する。トークンが破棄され、未連携の表示に戻る。 | S/E07 | G/E07 | E07/diff/caller | G/A | D/E07 | E13/R13 | E07；今回再操作なし；E07の旧actual限定適用 | 0/0 |
| [IM-01](../../spec/scenario/import.md) | 変換が完了すると本文が現れ、一覧の表示も更新される。非公開以外の公開ステータスを指定していた場合は、この時点で適用される（変換が完了するまでノートは非公開のまま）。自動バックアップ（IN-05）が有効な場合、変換の成否とは独立してバックアップジョブが登録される。 | S/E09/E11 | G/E09/E11/B1 | E09/E11/diff/caller | G/A | D/E09/E11 | B3 | E09/E11；O音声原本→2段本文 | B1/B3/0 |
| [IM-02](../../spec/scenario/import.md) | アップロードを開始すると、ファイルごとに個別の進捗が表示される。完了後、成功件数と失敗件数の内訳が表示され、失敗分は理由つきで一覧される。 | S/E09/E11 | G/E09/E11/B1 | E09/E11/diff/caller | G/A | D/E09/E11 | B3 | E09/E11；O upload3幅（今回single；旧mixed） | B1/B3/0 |
| [IM-03](../../spec/scenario/import.md) | 完了すると通知が表示され、ノート一覧に反映される。処理履歴（JB-01）から過去の取り込み結果を確認できる。 | S/E09/E11 | G/E09/E11/B1 | E09/E11/diff/caller | G/A | D/E09/E11 | E13/R13 | E09/E11；O通知/旧離脱再訪 | B1/0 |
| [IM-04](../../spec/scenario/import.md) | 既定値は、直前に表示していたタイムラインの文脈（個人 / ワークスペース）に一致する。選択した先にノートが作成される。 | S/E06/E09 | G/E06/E09 | E06/E09/diff/caller | G/A | D/E06/E09 | E13/R13 | E06/E09；今回再操作なし；E06/E09の旧actual限定適用 | 0/0 |
| [IM-05](../../spec/scenario/import.md) | スタイルシートは、取得できた内容をノートの本文に直接埋め込む。読み込み元への参照は残らないため、後から配布元が消えても中身が変わっても、取り込んだ時点の見た目がそのまま保たれる。ノート詳細に、取り込んだリソースの件数と一覧を表示する。この表示は**そのノートを読める人なら誰でも見られ、いつまでも残る** — 取り込みを実行したのが自分でなくても、ワークスペースの他のメンバーが取り込んだものでも見られる。 | S/E06/E09 | G/E06/E09 | E06/E09/diff/caller | G/A | D/E06/E09 | E13/R13 | E06/E09；今回再操作なし；E06/E09の旧actual限定適用 | 0/0 |
| [IM-06](../../spec/scenario/import.md) | 完了後、新しい本文に更新される。タグ・公開設定・共有リンクは維持される。直前の本文に「元に戻す」で戻せる。 | S/E09/E11 | G/E09/E11/B1 | E09/E11/diff/caller | G/A | D/E09/E11 | B3 | E09/E11；O再生成2model/undo3幅 | B1/B3/0 |
| [ED-01](../../spec/scenario/editing.md) | 入力すると自動保存され、非公開のノートとして作成される。「完了」を選ぶとノート詳細に遷移する。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | E13/R13 | E02；今回再操作なし；E02の旧actual限定適用 | 0/0 |
| [ED-02](../../spec/scenario/editing.md) | 文字を書き換えると、対応するテキストノードのみが更新される。保存すると、元の構造・装飾を保ったまま本文が更新される。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | E13/R13 | E02；O WYS警告/ready | 0/0 |
| [ED-03](../../spec/scenario/editing.md) | 編集すると、隣（または切り替え）でプレビューが更新される。保存すると、サニタイズを経て本文が更新される。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | E13/R13 | E02；O HTML保存/本文 | 0/0 |
| [ED-04](../../spec/scenario/editing.md) | 警告を了解して進むと、リッチテキストとして編集できる。保存すると、エディタの表現に沿って正規化された HTML で本文が更新される。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | E13/R13 | E02；O visual iframe3幅 | 0/0 |
| [ED-05](../../spec/scenario/editing.md) | 未保存の変更がある場合は、保存してから切り替える旨の確認が出る。切り替えると、同じ本文が新しいモードで開かれる。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | E13/R13 | E02；今回再操作なし；E02の旧actual限定適用 | 0/0 |
| [ED-06](../../spec/scenario/editing.md) | 完了すると、保存先の URL を参照する要素が挿入される。画像は代替テキストを入力できる。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | E13/R13 | E02；今回再操作なし；E02の旧actual限定適用 | 0/0 |
| [ED-07](../../spec/scenario/editing.md) | ノート詳細または編集画面でタイトルを選んで書き換える。入力を終えると自動保存され、一覧・タイムライン・共有ページの表示に反映される。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | E13/R13 | E02；O保存済み/完了本文 | 0/0 |
| [ED-08](../../spec/scenario/editing.md) | 明示的に「保存」を選ぶこともできる。「破棄」を選ぶと、最後に保存した状態に戻る。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | E13/R13 | E02；今回再操作なし；E02の旧actual限定適用 | 0/0 |
| [ED-09](../../spec/scenario/editing.md) | 確認のうえ実行すると、ノートはゴミ箱に移り、一覧から消える。削除直後は画面上の「元に戻す」で取り消せる。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | B2 | E02；O trash確認3幅 | B2/0 |
| [ED-10](../../spec/scenario/editing.md) | 個別に「完全に削除」を選ぶと、確認のうえ復元できなくなる。「ゴミ箱を空にする」ですべてを完全削除できる。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | B2 | E02；caller同PurgeConfirm/style | B2/0 |
| [ED-11](../../spec/scenario/editing.md) | 切り替えると、その場で表示が変わる。設定はノートごとに保持され、共有ページ・公開ページ・HTML の書き出しにも反映される。 | S/E02 | G/E02 | E02/diff/caller | G/A | D/E02 | E13/R13 | E02；今回再操作なし；E02の旧actual限定適用 | 0/0 |
| [OR-01](../../spec/scenario/organize.md) | 各ノートはサムネイル（本文の先頭部分から生成）、タイトル、更新日時、タグ、公開ステータスとともに表示される。スクロールすると続きが読み込まれる。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | E13/R13 | E04；今回再操作なし；E04の旧actual限定適用 | 0/0 |
| [OR-02](../../spec/scenario/organize.md) | カレンダー: 月表示で、作成日ごとにノートを配置する。選んだ形式は次回以降も引き継がれる。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | E13/R13 | E04；今回再操作なし；E04の旧actual限定適用 | 0/0 |
| [OR-03](../../spec/scenario/organize.md) | 各結果に、一致箇所の抜粋がハイライトつきで表示される。候補を選ぶとそのノートが開き、検索語を条件として一覧に持ち帰るとチップ列に積まれてタグ・月の絞り込みと組み合わせられる。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | E13/R13 | E04；今回再操作なし；E04の旧actual限定適用 | 0/0 |
| [OR-04](../../spec/scenario/organize.md) | 複数選んだ場合は、すべてを持つノート（AND）に絞り込まれる。選択したタグはチップとして表示され、個別に解除できる。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | E13/R13 | E04；今回再操作なし；E04の旧actual限定適用 | 0/0 |
| [OR-05](../../spec/scenario/organize.md) | その月に作成されたノートに絞り込まれる。選択は解除できる。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | E13/R13 | E04；今回再操作なし；E04の旧actual限定適用 | 0/0 |
| [OR-06](../../spec/scenario/organize.md) | 選ぶと即座にタグが付き、一覧の表示に反映される。付いているタグはその場で外せる。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | B2 | E04；O picker実3幅 | B2/0 |
| [OR-07](../../spec/scenario/organize.md) | OR-06 と同じ入力・候補・新規作成の操作でタグを付ける。付いたタグを選ぶと、そのタグで絞り込んだ一覧へ移動できる。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | B2 | E04；caller同picker/旧詳細付与 | B2/0 |
| [OR-08](../../spec/scenario/organize.md) | タグを削除すると、すべてのノートから外れる（ノートは消えない）。既存のタグと同じ名前に変更した場合は統合するかを確認し、統合すると両方のノートが片方のタグにまとめられる。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | B2 | E04；caller同TagManager/style | B2/0 |
| [OR-09](../../spec/scenario/organize.md) | 操作を選ぶと、必要に応じて確認ダイアログを経て実行される。完了後、成功件数と失敗件数の内訳が表示される。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | E13/R13 | E04；今回再操作なし；E04の旧actual限定適用 | 0/0 |
| [OR-10](../../spec/scenario/organize.md) | 選択が即座に一覧へ反映される。選択は URL に反映され、次回以降も引き継がれる。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | E13/R13 | E04；今回再操作なし；E04の旧actual限定適用 | 0/0 |
| [OR-11](../../spec/scenario/organize.md) | 編集権限があれば、編集・共有・タグ付け・移動・ダウンロード・削除の操作が表示される。元ファイルがある場合は、その名前・形式・サイズと、バックアップの状態が表示される。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | E13/R13 | E04；今回再操作なし；E04の旧actual限定適用 | 0/0 |
| [OR-12](../../spec/scenario/organize.md) | 移動先を選ぶと、移動後に誰が閲覧できるようになるか / できなくなるかが具体的に示される。確定すると即座に移動する。公開ページと共有リンクの URL は変わらない（アプリ内でのノートの URL は、新しい所属先の文脈のものに変わる）。 | S/E04 | G/E04 | E04/diff/caller | G/A | D/E04 | E13/R13 | E04；今回再操作なし；E04の旧actual限定適用 | 0/0 |
| [SH-01](../../spec/scenario/sharing.md) | 公開を選ぶと、公開タイムラインと検索の対象になる旨の確認が出る。変更は即座に反映される。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | B2 | E05；O limited panel3幅/旧設定 | B2/0 |
| [SH-02](../../spec/scenario/sharing.md) | 共有リンクが表示され、「コピー」でクリップボードにコピーできる。コピーされたことがその場で示される。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | B2 | E05；O限定link欄/旧copy | B2/0 |
| [SH-03](../../spec/scenario/sharing.md) | 以降、共有リンクを開いた閲覧者にはパスワードの入力が求められる。設定済みのパスワードは変更・解除できる。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | B2 | E05；O password controls初期見切れ/末尾到達 | B2/0 |
| [SH-04](../../spec/scenario/sharing.md) | 既存のリンクが使えなくなる旨の確認を経て実行する。新しいリンクが発行され、古いリンクは無効になる。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | B2 | E05；O reissue入口/caller/旧実再発行 | B2/0 |
| [SH-05](../../spec/scenario/sharing.md) | タイトル、著者の表示名、更新日時、タグが表示される。ダウンロードのボタンからノートを保存できる（EX-04）。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | E13/R13 | E05；O匿名limited320本文 | 0/0 |
| [SH-06](../../spec/scenario/sharing.md) | 正しいパスワードを入力すると本文が表示される。通過した状態は一定期間（24 時間）その端末で保持され、再入力を求められない。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | E13/R13 | E05；今回再操作なし；E05の旧actual限定適用 | 0/0 |
| [SH-07](../../spec/scenario/sharing.md) | 著者の公開ページ、ノートに付いたタグ、（ワークスペース所有なら）ワークスペースの公開ページへのリンクが表示される。ダウンロードのボタンからノートを保存できる。公開handle変更後もnote URLと限定tokenを維持する（briefの利用者決定を優先）。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | E13/R13 | E05；O匿名public3幅本文 | 0/0 |
| [SH-08](../../spec/scenario/sharing.md) | バッジを選ぶと、現在の設定で誰が閲覧できるかが具体的に説明される（例: 「ワークスペース『設計』のメンバー 5 名とリンクを知っている人」）。パスワード保護の有無、共有リンクの有無もあわせて示される。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | B2 | E05；O閲覧範囲3幅 | B2/0 |
| [WS-01](../../spec/scenario/workspace.md) | 作成すると、自分が owner として参加した状態のワークスペースができる。作成直後のワークスペースに切り替わり、メンバー招待への導線が表示される。 | S/E03 | G/E03 | E03/diff/caller | G/A | D/E03 | E13/R13 | E03；今回再操作なし；E03の旧actual限定適用 | 0/0 |
| [WS-02](../../spec/scenario/workspace.md) | 選ぶと、その文脈のノート一覧に切り替わる。選択は URL に反映され、次回の訪問時にも引き継がれる。 | S/E03 | G/E03 | E03/diff/caller | G/A | D/E03 | E13/R13 | E03；今回再操作なし；E03の旧actual限定適用 | 0/0 |
| [WS-03](../../spec/scenario/workspace.md) | 招待リンクを含むメールが送られ、保留中の招待として一覧に表示される。招待リンクをコピーして自分で共有することもできる。 | S/E03 | G/E03 | E03/diff/caller | G/A | D/E03 | E13/R13 | E03；今回再操作なし；E03の旧actual限定適用 | 0/0 |
| [WS-04](../../spec/scenario/workspace.md) | サインインしていない場合はサインイン / サインアップを求められ、完了後に招待の確認へ戻る。「参加する」を選ぶとメンバーになり、そのワークスペースの一覧へ遷移する。 | S/E03 | G/E03 | E03/diff/caller | G/A | D/E03 | E13/R13 | E03；今回再操作なし；E03の旧actual限定適用 | 0/0 |
| [WS-05](../../spec/scenario/workspace.md) | ロールのセレクターから別のロールを選ぶと即座に反映される。「除名」を選ぶと、確認のうえメンバーから外れる。 | S/E03 | G/E03 | E03/diff/caller | G/A | D/E03 | E13/R13 | E03；今回再操作なし；E03の旧actual限定適用 | 0/0 |
| [WS-06](../../spec/scenario/workspace.md) | 脱退後はノートにアクセスできなくなる旨を確認する。実行すると、個人の文脈へ遷移する。 | S/E03 | G/E03 | E03/diff/caller | G/A | D/E03 | E13/R13 | E03；今回再操作なし；E03の旧actual限定適用 | 0/0 |
| [WS-07](../../spec/scenario/workspace.md) | 名前、説明、アイコン、公開ページのスラッグを編集する。保存すると、スコープトークン・タイムライン・公開ページの表示に反映される。 | S/E03 | G/E03 | E03/diff/caller | G/A | D/E03 | E13/R13 | E03；今回再操作なし；E03の旧actual限定適用 | 0/0 |
| [WS-08](../../spec/scenario/workspace.md) | 公開に切り替えると、公開ページの URL が表示され、コピーできる。非公開に戻すと、公開ページは見られなくなる。 | S/E03 | G/E03 | E03/diff/caller | G/A | D/E03 | E13/R13 | E03；今回再操作なし；E03の旧actual限定適用 | 0/0 |
| [WS-09](../../spec/scenario/workspace.md) | タグでの絞り込みと検索ができる。ノートを選ぶとノートの公開ページ（SH-07）へ遷移する。 | S/E03 | G/E03 | E03/diff/caller | G/A | D/E03 | E13/R13 | E03；今回再操作なし；E03の旧actual限定適用 | 0/0 |
| [WS-10](../../spec/scenario/workspace.md) | 確認のためワークスペース名を入力する。実行すると、メンバー全員がアクセスできなくなり、個人の文脈へ遷移する。 | S/E03 | G/E03 | E03/diff/caller | G/A | D/E03 | E13/R13 | E03；今回再操作なし；E03の旧actual限定適用 | 0/0 |
| [DS-01](../../spec/scenario/discovery.md) | 外部から見えるとおりの自分の公開ページが表示される（公開ノートのみ、新しい順）。「これは外部に公開されている表示です」というバナーと、設定への導線が表示される。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | E13/R13 | E05；今回再操作なし；E05の旧actual限定適用 | 0/0 |
| [DS-02](../../spec/scenario/discovery.md) | ワークスペース設定の「公開」から公開ページへの導線を選ぶ。WS-09 と同じ内容が表示され、外部向けの表示であるバナーが出る。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | E13/R13 | E05；今回再操作なし；E05の旧actual限定適用 | 0/0 |
| [DS-03](../../spec/scenario/discovery.md) | 選んだ文脈の一覧に切り替わる。公開タイムラインへは、個人ならアカウントメニューの「自分の公開ページ」から、ワークスペースならスコープトークンのメニューから移る。作業用の一覧へは同じ経路で戻る。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | E13/R13 | E05；今回再操作なし；E05の旧actual限定適用 | 0/0 |
| [DS-04](../../spec/scenario/discovery.md) | タグでの絞り込みと、そのページ内の検索ができる。ノートを選ぶと SH-07 の表示へ遷移する。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | E13/R13 | E05；今回再操作なし；E05の旧actual限定適用 | 0/0 |
| [DS-05](../../spec/scenario/discovery.md) | 各結果にタイトル、抜粋、著者、更新日時、タグが表示される。タグと期間で絞り込める。タグは所属先をまたいで名前で一致させる。期間は**更新日時**（結果に表示される日時と同じ軸）で絞り込む。個人のノート一覧の月絞り込み（OR-05）が作成日時を軸にするのとは基準が異なる。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | E13/R13 | E05；今回再操作なし；E05の旧actual限定適用 | 0/0 |
| [DS-06](../../spec/scenario/discovery.md) | 検索エンジンの結果からノートの URL を開く。ノートの本文が表示される（SH-07）。 | S/E05 | G/E05 | E05/diff/caller | G/A | D/E05 | E13/R13 | E05；今回再操作なし；E05の旧actual限定適用 | 0/0 |
| [EX-01](../../spec/scenario/export.md) | HTML と Markdown は即座に生成されてダウンロードが始まる。PDF は生成に時間がかかるため、進捗を表示したうえで完了後にダウンロードが始まる。 | S/E08 | G/E08 | E08/diff/caller | G/A | D/E08 | E13/R13 | E08；O request/取得click; 今回file未取得、旧近接actualfile適用 | 0/0 |
| [EX-02](../../spec/scenario/export.md) | ZIP を生成するジョブが登録され、進捗が表示される。完了すると通知が表示され、ダウンロードできる。 | S/E08 | G/E08 | E08/diff/caller | G/A | D/E08 | E13/R13 | E08；今回再操作なし；E08の旧actual限定適用 | 0/0 |
| [EX-03](../../spec/scenario/export.md) | 完了すると通知が表示され、履歴からダウンロードできる。生成物は一定期間（7 日）保持され、その間は何度でもダウンロードできる。 | S/E08 | G/E08 | E08/diff/caller | G/A | D/E08 | E13/R13 | E08；今回再操作なし；E08の旧actual限定適用 | 0/0 |
| [EX-04](../../spec/scenario/export.md) | 形式（HTML / Markdown / PDF）を選ぶ。EX-01 と同じ手順でダウンロードされる。 | S/E08 | G/E08 | E08/diff/caller | G/A | D/E08 | E13/R13 | E08；今回再操作なし；E08の旧actual限定適用 | 0/0 |
| [JB-01](../../spec/scenario/jobs.md) | 親ジョブを開くと、子ジョブごとの結果を確認できる。ジョブが完了・失敗するとトーストで通知され、ティッカーの件数から外れる。 | S/E09/E10 | G/E09/E10 | E09/E10/diff/caller | G/A | D/E09/E10 | E13/R13 | E09/E10；O音声通知/PDF完了 | 0/0 |
| [JB-02](../../spec/scenario/jobs.md) | 親ジョブの画面からは、失敗した子ジョブだけをまとめて再試行できる。失敗した子だけを再試行すると、いったん完了 / 失敗として終わっていた親ジョブは再び実行中に戻り、進捗が計算し直される。 | S/E09/E10 | G/E09/E10 | E09/E10/diff/caller | G/A | D/E09/E10 | E13/R13 | E09/E10；今回再操作なし；E09/E10の旧actual限定適用 | 0/0 |
| [JB-03](../../spec/scenario/jobs.md) | 待機中の子ジョブは取り消され、既に実行中のものは完了を待って結果を残す。状態が「キャンセル済み」になり、内訳（完了 / 取り消し）が表示される。 | S/E09/E10 | G/E09/E10 | E09/E10/diff/caller | G/A | D/E09/E10 | E13/R13 | E09/E10；今回再操作なし；E09/E10の旧actual限定適用 | 0/0 |
| [UX-LOCATION](../../spec/requirements.md) | 現在の個人/ワークスペースを常に判別できる | S/E13 | G/E13 | E13/diff/caller | G/A | D/E13 | E13/R13 | E13；O scope/旧R13 scroll長名 | 0/0 |
| [UX-STATE](../../spec/requirements.md) | 変換状態と公開範囲を一覧と詳細の両方で判別できる | S/E13 | G/E13 | E13/diff/caller | G/A | D/E13 | E13/R13 | E13；O保存/非公開/変換表示 | 0/0 |
| [UX-KEYBOARD](../../spec/requirements.md) | キーボードとポインティングデバイスの双方から主要操作に到達できる | S/E13 | G/E13 | E13/diff/caller | G/A | D/E13 | E13/R13 | E13；O Enter/Escape/警告confirm＋旧R13focus | 0/0 |
| [UX-VISUAL](../../spec/requirements.md) | コマンドパレット以外にもすべての機能への視覚的な導線がある | S/E13 | G/E13 | E13/diff/caller | G/A | D/E13 | B2/B3 | E13；O dialog/upload/各入口3幅 | B2/B3/0 |
| [UX-READING](../../spec/requirements.md) | 読む画面は本文を主役にし、操作が本文から分離されている | S/E13 | G/E13 | E13/diff/caller | G/A | D/E13 | E13/R13 | E13；O隔離本文/操作bar | 0/0 |
| [UX-MOBILE](../../spec/requirements.md) | モバイル幅でページ全体の横方向のはみ出しがない | S/E13 | G/E13 | E13/diff/caller | G/A | D/E13 | E13/R13 | E13；O3幅page width/各mode/モデル | 0/0 |
| [NFR-PRIVACY](../../spec/requirements.md) | 公開取り下げや無効な共有リンクの応答から過去の存在・現在の状態を推測できない | S/E05/E06/E09/E10/E13 | G/E05/E06/E09/E10/E13 | E05/E06/E09/E10/E13/diff/caller | G/A | D/E05/E06/E09/E10/E13 | E13/R13 | E05/E06/E09/E10/E13；O匿名許可本文＋現private-red/旧HTTP拒否 | 0/0 |
| [NFR-HTML](../../spec/requirements.md) | アップロード/生成HTMLのCSSやscriptがアプリUIへ影響しない境界で表示される | S/E05/E06/E09/E10/E13 | G/E05/E06/E09/E10/E13 | E05/E06/E09/E10/E13/diff/caller | G/A | D/E05/E06/E09/E10/E13 | E13/R13 | E05/E06/E09/E10/E13；O iframe sandbox/本文 | 0/0 |
| [NFR-ASYNC](../../spec/requirements.md) | 画面を閉じても長時間処理が継続し、進捗と結果を追跡できる | S/E05/E06/E09/E10/E13 | G/E05/E06/E09/E10/E13 | E05/E06/E09/E10/E13/diff/caller | G/A | D/E05/E06/E09/E10/E13 | E13/R13 | E05/E06/E09/E10/E13；O native2段＋旧close/revisit/同DB | 0/0 |
| [NFR-JAPANESE](../../spec/requirements.md) | 利用者向けUIが日本語で提供される | S/E05/E06/E09/E10/E13 | G/E05/E06/E09/E10/E13 | E05/E06/E09/E10/E13/diff/caller | G/A | D/E05/E06/E09/E10/E13 | E13/R13 | E05/E06/E09/E10/E13；O日本語入口/状態/404 | 0/0 |
| [QA-BUILD](../../CLAUDE.md) | mainで pnpm build が終了コード0となり生成アプリをローカル起動できる | S/G/A | G/G/A | G/A/diff/caller | G/A | D/G/A | 対象外（CLI条件） | G/A；G自身実exit0（通常順序） | 0/0 |
| [QA-TYPECHECK](../../CLAUDE.md) | mainで pnpm typecheck が終了コード0となる | S/G/A | G/G/A | G/A/diff/caller | G/A | D/G/A | 対象外（CLI条件） | G/A；G自身実exit0（通常順序） | 0/0 |
| [QA-LINT](../../CLAUDE.md) | mainで pnpm lint と pnpm format:check が終了コード0となる | S/G/A | G/G/A | G/A/diff/caller | G/A | D/G/A | 対象外（CLI条件） | G/A；G自身実exit0（通常順序） | 0/0 |
| [QA-TEST](../../CLAUDE.md) | mainで pnpm test が終了コード0となる | S/G/A | G/G/A | G/A/diff/caller | G/A | D/G/A | 対象外（CLI条件） | G/A；G自身実exit0（通常順序） | 0/0 |

反例ID集合は18、counter延べ22（B1=7、B2=11、B3=4）。原文全93と表のID集合は一致し、新ID/フェーズは追加していない。matrixの旧適用はE表の変化範囲・callerで制限され、B2/3の現在の実画面を旧評価で打ち消さない。

## 自己環境の実正常閉鎖と引継ぎ

| 自己成功process | browser正規closeとnative/harness/caller実終了 | 実exit |
| --- | --- | --- |
| UX2 actual91919 | a/b各正規CLI close0→自己PID TERM。2026-10-14T00:12:52.772496+00:00終了 | 0 |
| Audio actual3200 | c正規close0→自己PID TERM。00:16:24.419173+00:00終了 | 0 |
| UX3 actual4519 | dの自己page解放後正規close0、e正規close0→自己PID TERM。00:25:44.663218+00:00終了 | 0 |
| reject proxy actual90715 | 全browser閉鎖後自己PID TERM。00:25:44.648904+00:00 listener close完了 | 0 |

account-browser.node.ts:542–577のsuccess-only signal routeはbooted.quiesce→listener close→organize close/native shutdown→fixtures close（smtp/editing/provider/Drive全PromiseAllSettledのrejectを失敗とする）をawait後にprocess.exit(0)。今回の実caller/harness0をこの経路へ対応し、PID消失や1/130/143を正常閉鎖にしない。failed起動2rootは実exit1/normalShutdown=falseで別保持。診断wireもrequest/response/socket/server終了とcaller0を別記する。

`R/logs/final-stop.json`（00:26:20.396871+00:00）は自己root/shortTMP/browser該当process=[]、known actual/failed/browser PID残0、55921/55922/61766/62062/62063/62171/62182 connect_ex61、fresh sourceとdiagnostic gitdiff実0。関連診断/observer/工具helperの実終了を取得した。外部serviceや他worktree/PID/秘密へ触れず、failedroot・新DB/objects/合成keys/工具config/ログ/画像を保持する。

本報告だけを精密commitし、既resume.mdを含む他fileはstage/commitしない。報告commitと完了通知の後は全read/write/runを停止する。稼働環境の引継ぎはない。
