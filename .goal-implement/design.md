# 採用する設計

全体の設計方針と共有契約の入口。担当する機能の契約だけを読む。受入状態と次の作業は [plan.md](plan.md) を正本とする。

実行基盤は macOS arm64 上の Node 参照配備。HTML を正データとし、ドメイン・アプリケーションを純粋に保ち、I/O・時刻・ID をポートへ分離する。入力は transport と値オブジェクトの境界で検証する。

再生成のS1/S2は受入済みの隔離基盤。S3は[補正版](phases/P5c-3-s3-resume-plan.md)を採用し、通常local text/HTML/Markdown version1の入力接続を実装する。Drive受付/UI・残形式の新leaseは後続。退会はaccounts active/deleted保存枝とDrive専用redacted枝の方向を採用し、正式移行・実装範囲は後続で確定する。音声は保留する。

契約の詳細化・設計案の採用と、製品の完成・新しい実行範囲の許可は別に判定する。終了済みの検証資源や古い予算は新しい実行へ引き継がない。

## P5c-2 原本バックアップ

共有契約: [P5c-2 原本バックアップ](contracts/drive-backup.md)。

## P5c-1の残UI検証

共有契約: [P5c-1の残UI検証](contracts/drive-ui.md)。

## 実行基盤と境界

共有契約: [実行基盤と境界](contracts/runtime.md)。

## HTML と編集

共有契約: [HTML と編集](contracts/html-editing.md)。

## UI

共有契約: [UI](contracts/ui.md)。

## 認証と外部連携

共有契約: [認証と外部連携](contracts/auth.md)。

## 検証

共有契約: [検証](contracts/verification.md)。

## P2a の共有契約

共有契約: [P2a の共有契約](contracts/import.md)。

## P2b の境界と実装順

共有契約: [P2b の境界と実装順](contracts/content-media.md)。

## P2b-C の永続化と資源境界

共有契約: [P2b-C の永続化と資源境界](contracts/content-media-storage.md)。

## P2b-D の表示設定

共有契約: [P2b-D の表示設定](contracts/display-style.md)。

## P2c 以降の保存契約

共有契約: [P2c 以降の保存契約](contracts/save.md)。

### P2c-1: 20版と復元

共有契約: [P2c-1: 20版と復元](contracts/history.md)。

### P2c-2: Text-only編集とモード接続

共有契約: [P2c-2: Text-only編集とモード接続](contracts/text-editor.md)。

### P2c-3: WYSIWYGの準備・保持・変換前復元

共有契約: [P2c-3: WYSIWYGの準備・保持・変換前復元](contracts/wysiwyg.md)。

## P2d: ゴミ箱と完全削除

共有契約: [P2d: ゴミ箱と完全削除](contracts/trash.md)。

### P2d-3 の集合と親子回収

共有契約: [P2d-3 の集合と親子回収](contracts/trash-batch-purge.md)。

## P3 の所有と容量の接続条件

共有契約: [P3 の所有と容量の接続条件](contracts/workspace-storage.md)。

### P3aの入力と移行

共有契約: [P3aの入力と移行](contracts/workspace-create.md)。

## P3bの招待・メンバー・設定

共有契約: [P3bの招待・メンバー・設定](contracts/workspace-members.md)。

## P3cの検索・日付・タグ共有契約

共有契約: [P3cの検索・日付・タグ共有契約](contracts/search.md)。

### P3cの方式採用

共有契約: [P3cの方式採用](contracts/search-engine.md)。

### P3cの一覧と読書UI

共有契約: [P3cの一覧と読書UI](contracts/browse-ui.md)。

## P3dのタグ書込・管理と単一移動

共有契約: [P3dのタグ書込・管理と単一移動](contracts/tags-move.md)。

### P3d-1のタグ実装境界

共有契約: [P3d-1のタグ実装境界](contracts/tags.md)。

### P3d-2の有限確認と所有移管

共有契約: [P3d-2の有限確認と所有移管](contracts/move.md)。

## P3eの選択と一括操作

共有契約: [P3eの選択と一括操作](contracts/bulk.md)。

### P3eの永続受理とcommand接続

共有契約: [P3eの永続受理とcommand接続](contracts/bulk-persistence.md)。

## P3fのワークスペース削除

共有契約: [P3fのワークスペース削除](contracts/workspace-delete.md)。

## P4の接続判断

共有契約: [P4の接続判断](contracts/publishing-export.md)。

### 単件PDFの製品接続

共有契約: [単件PDFの製品接続](contracts/pdf-single.md)。

### 本人PDFの永続接続

共有契約: [本人PDFの永続接続](contracts/pdf-owner.md)。

### 匿名PDFの接続判断

共有契約: [匿名PDFの接続判断](contracts/pdf-anonymous.md)。

### 一括ZIPの接続判断

共有契約: [一括ZIPの接続判断](contracts/zip.md)。

### PDF一括ZIPの接続判断

共有契約: [PDF一括ZIPの接続判断](contracts/zip-pdf.md)。

### 一括公開範囲変更の接続判断

共有契約: [一括公開範囲変更の接続判断](contracts/bulk-sharing.md)。

### P4a の限定共有と表示名

共有契約: [P4a の限定共有と表示名](contracts/sharing.md)。

### P4b のHTML・Markdown単件書き出し

共有契約: [P4b のHTML・Markdown単件書き出し](contracts/export-single.md)。

### P4c の公開・発見とプロフィール

共有契約: [P4c の公開・発見とプロフィール](contracts/public-discovery.md)。

## P5 の成立条件

共有契約: [P5 の成立条件](contracts/integration.md)。

### Google Driveの連携境界

共有契約: [Google Driveの連携境界](contracts/drive.md)。

### OpenRouterの連携境界

共有契約: [OpenRouterの連携境界](contracts/openrouter.md)。

#### P5bの分割と直近の保存・実行境界

共有契約: [P5bの分割と直近の保存・実行境界](contracts/llm-stages.md)。

#### P5b-2の本文生成と月間枠

共有契約: [P5b-2の本文生成と月間枠](contracts/llm-text.md)。

#### P5b-2b の提供前gate

共有契約: [P5b-2b の提供前gate](contracts/llm-input-gate.md)。

#### P5b-2b1 文書の製品接続

共有契約: [P5b-2b1 文書の製品接続](contracts/llm-documents.md)。

#### P5b-2b2 単画像の製品接続

共有契約: [P5b-2b2 単画像の製品接続](contracts/llm-image.md)。

#### P5b-2b1 V2 文字PDFの寛容回復拒否

共有契約: [P5b-2b1 V2 文字PDFの寛容回復拒否](contracts/llm-pdf-recovery.md)。

#### P5b-3a0 全ページPDF・音声の提供前gate

共有契約: [P5b-3a0 全ページPDF・音声の提供前gate](contracts/llm-pdf-audio-gate.md)。

#### P5b-3a1 全ページPDFの受付・分類・製品接続

共有契約: [P5b-3a1 全ページPDFの受付・分類・製品接続](contracts/llm-pdf.md)。

### Google認証の接続契約

共有契約: [Google認証の接続契約](contracts/google-auth.md)。

#### P5aの保存・実行・検証境界

共有契約: [P5aの保存・実行・検証境界](contracts/google-auth-storage.md)。

## P5c-3: Drive 原本からの再生成

共有契約: [P5c-3: Drive 原本からの再生成](contracts/drive-regeneration.md)。

### S2の実取得・入力終了契約

共有契約: [S2の実取得・入力終了契約](contracts/drive-regeneration-input.md)。

### S3の通常local text接続

[補正版](phases/P5c-3-s3-resume-plan.md)のM1–M4を採用する。通常claimとinput receiptを同Txに束ね、初回確定no-claimと不明intentの再照合を分ける。取消/期限/失権は容量待機の前にnever-read終端を選ぶ。前任の正規由来を版付きprivate recordへ保存し、限定opaque capabilityと確定CASで解放する。これにより既S2の保守保持を維持したまま通常処理を進める。

変更範囲は補正版の列挙pathと運用文書に限定する。新DDL・旧migration/lock/server entry変更を行わない。比例legacy期待は新appDBへ移し、既integration suiteは型追従だけとする。有限資源は同案の新root192MiB・4logicalDB80MiB・Worker6/同時1・自然終了子1・新build256MiBと期限を採用する。追加path/資源/契約は実装前にManagerへ通知する。受入条件は[S3-A–E](criteria/P5c-3-S3.md)。

`application/llm/completion.ts`を追加し、workerとinputStageが同じ正規job/quota/original/display終端を再用する。queued idle専用のnever-read終端と既owned終端を区分し、循環importと処理の重複を避ける。既owned契約・response返金条件は維持する。

candidate取得はread-only Tx、reserve/bindは同期、exact claimは別Txとする。Node facadeが自身でawaitするUoWへ初回settleを閉じるためである。保存の原子性はowner/receipt/jobを更新するexact Txで維持し、同候補のversion/currentを再検査する。間の取消/失権/期限はnever-read fenceへ進め、別候補へfallbackしない。

`pendingInputProofs(runtimeId)`は自身のregistryに残る未consume opaque proofを最大2件返す。前任cleanupがcommit済みで応答不明の場合、owned行の探索だけでは見つからないterminal/closed行をexact同値再照合し、proofを確定後にconsumeしてからownership ACKを行うためである。JSON復元や別registry/runtime/consumerへの流用は認めない。

[S3事前照合](reviews/P5c-3-s3-preflight.md)のF1/F2を修正する。active/unknown両前任でowner closed→input closed0を正規同Tx/CASに束ねる。通常queued取消が確定したterminal version fenceは、元opaque intent/consumer/source/旧receipt/未readへ束縛して認識し、terminal再終端をせず同intentだけを解放する。別version一般・読取だけ・replay false・応答不明は保持する。

F2の`cancelled-fence`は元queued/idle/memory0のprivate未lease/未read admissionに限定する。saved operationは正規取消によるphase/outcome/cancelGeneration+1/version+1/updatedAt差だけを許し、consumer/job/source/owner/旧receipt等の全値を一致させる。同read Txでquota releasedとdispatch0を確認し、facade自身のUoW完了後だけ同admissionを返却する。通常の取消が更新するgeneric job/原本状態は別に確認する。外部boolean、他intent、不確定保存、別version一般からの解放は認めない。

新buildは[build計画](phases/P5c-3-s3-build-plan.md)を採用する。修正後fixed candidateをarchiveで新copyへ展開し、そこで通常build:nodeを一回実行する。build専用256MiB/600秒と有限停止・pipe期限、宣言済みpublic依存97link（上限100、@repo/coreは新copy）とtracked AGENTS.md linkだけを例外として許可する。検証rootのregular/nosymlink条件へこの例外を広げず、旧dist/privateは操作しない。全source/entry/Worker/DDL/lock/distの同candidate manifestを固定し、起動可能性は実成果の配置で確認する。

### Node RSC buildの空CSS chunk参照

新buildのRSC assets一覧に、Viteが除去したpure-CSS空JS chunkのpreload参照が残るため、Node build専用pluginを追加する。変更は `apps/web/vite.config.node.ts`・`apps/web/scripts/rscAssets.ts`・同testの3pathに限定する。plugin-rsc公開 `getPluginApi(config).manager.buildAssetsManifest` と型を使い、clientの通常generateBundleで空AST・exports0・非entry・CSS moduleのみ・importedCss有の候補を記録する。post hookでfinal bundleへ照合し、記録済み純CSS候補かつ全CSSが現存する欠落JSだけを一覧から除く。

存在JS、CSS、bootstrap/serverResourcesを保持し、未知/非empty/未記録の欠落やCSS消失はbuildを失敗させる。dev/nonclientに作用させず、生成distを直接修正しない。公開APIの版限定を運用根拠に明記する。有限pure対と規定checks、新候補の別archive build一回を独立照合し、再生成backendの不変更根拠は借用する。S3-Eのbuild不足として扱い、全既app/nativeの自動再演はしない。

### build検証工具の展開と終了

新公開generator `.goal-implement/helpers/s3-build-generator.py` の独立preflight合格版を固定して使う。生成側の先頭umask0077、regular fileの排他作成0600・directory0700、archive前のmode/nosymlink/構文確認により権限設定漏れを事前検出する。git archiveは新gzip（8MiB以内、source/cache32MiBに計数）へ出力し、PIPEを使用しない共通200ms supervisorでarchive60秒・全体600秒、自己PGへの有限停止、actual exit/PID/PGとredirect FD closeを正常異常とも記録する。PIPE不使用をEOF成功へ読み替えない。完成gzipからの展開も60秒・64KiBごとの期限/容量、既知path/blob・排他writeに限定する。失敗環境は再読せず保持する。

## Drive残UIの同bundle接続準備

[実行計画案](phases/P5c-ui-execution-plan.md)のUI-P1に対し、compiled/source間のBusinessRuleErrorはexecution work捕捉前のbuilt→sourceと、backup provider等のapplication捕捉前source→builtに限定する。正規class/prototype/serializerと対象codeの一致、未知/transport/lifetime errorの非変換、往復identity、成功/closed/proof/ACKの非変更を起動前の純対で確認する。正式helper/実行資源は計画preflight後に採用する。

依存しない準備として `apps/web/app/server.node.ts` 一pathから既存 `NodeDriveBackupSource` のnamed exportを追加する。built storage→built source→built backup runnerのprivate closure Symbol/classを同じmodule graphで保ち、source execution.registerは実closed拒否時のreleaseを保留するためである。新error型や論理変更を加えず、規定checks・新候補の独立delta・別buildのexport/manifest確認へ進める。S3 backend不変更根拠を維持する。現fae1buildは無変更で保全し、新候補の根拠へ流用しない。候補c2a3d45fの規定checksと独立deltaは合格し、既S3 A–DとE source根拠を継承する。別新archive buildは既採用generatorを変えず、別公開helperへ候補/prefix/新export確認だけ適応する。新候補のmanifest・namedexport・privateSymbol同graphは新成果で確認し、旧fae1成果を転用しない。

[独立UI-P3レビュー](reviews/P5c-ui-plan.md)により、公開Puppeteer25.11/@puppeteer/browsers3.2.2のlaunch/process/CDP/interception/ARIA/dialog/goBackは代案として成立可能。自己launchのprocessを所有し、mutationは一意ARIA handleの単発click、custom userDataDirを明示して自動削除を避ける。Chromiumの通常profile制御link/socketにはexact新profileの有限例外が必要で、通常データの700/600条件と区分する。独立補正版のGoogle Chrome154公開metadataとPuppeteer launch案を採用する。child限定MAC_CHROMIUM_TMPDIR/TMPDIRを同じ新ChromeTMPへ束縛し、pipe/CDP・custom profile・SIG自前監督・単default context/初期page再用とする。profile入口/root/ChromeTMPは700を維持し、profile内部だけ同UID regular{600,644}/dir{700,755}を有限許可する。制御例外はexact三名のSingleton linkと、一登録700dirの対応cookie/socketだけ、字句target/同cookie/自己PIDPG/no-followを検査する。socketは同UID/group-other権限0、mac target UTF8最大253bytes、他link/mode/特殊entryは拒否する。後付chmod・既profile探索・追加probeを行わない。installed binaryでの配置/modeは初回guardの観測条件として残す。

正式案の新5helper作成と純対設計まで採用する。U0–U7/12分・UIroot256MiB/Chrome128MiB/3logicalDB48MiB・native uploads8同時2/search16逐次・有限mutation/HTTP/close台帳を同案へ束縛し、BFCache単一不成立は該当条件を欠測として残して正常取消/停止へ進む。実helperと新B bindingの独立preflight後に、一つの新UIrootで実行を委譲する。helper実装中のDB/runtime/browser起動は0とする。

新候補c2a3d45fのbuild3488完成成果を独立static合格として採用する。release manifest SHA93d264f61ab5ae6b5ab53088a7600518ca7ca24f930a93c4f8c66a78eb5533e0へ新source/asset/bindingを束縛し、built storage→named BackupSource→backup runnerが同mainのclosure class/privateSymbol/guardを使うこと、closed拒否でregister release0・元closed Promise保持、RSC/必要assets欠落0を直接確認した。actual build/終了/資源はprimary根拠借用、実UI成功へ昇格しない。 auditは新copy一つだけ公開node:sqlite DatabaseSync(readOnly)＋query_onlyで開き、logical3/48MiB枠を維持する。Chrome自己knownPID集合のPPID/PG照合は既probe1枠の単一ps呼出に限定し、広域process/argv/envを取得しない。新5helperの分担はboot/provider/contract-pureをImplementer、browser/stop-auditを既補助へ固定し、全writer停止後に独立preflightへ渡す。

## P5d: 退会の共有設計

共有契約: [P5d: 退会の共有設計](contracts/account-delete.md)。正式案と独立P5d-P1補正（再生成read/currentのshell先分岐）を採用し、P5d-A–Hを固定する。新保存型/0044/全入口fence/専用永続回収を隔離worktreeで実装し、基本11とresources0のCR5に局所成功根拠がある。mainへは未統合で、残るnative・legacy・全コピー・並行競合・ブラウザの完成条件を保持する。


### P5dの隔離実装

独立した退会実装は `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006`、branch `goal-implement/p5d-c2a3d45f-20261006`、固定基点c2a3d45fから正規git worktreeで進める。main候補・UI生成物・helpersは固定し、tracked source以外のuntracked/private/data/envをコピーしない。新root700/umask0077、declared public dependencies97link（@repo/coreは新tree）とtracked AGENTS内部linkだけを使い、install/downloadを行わない。規定checksのpnpm自動依存検査は正式設定で自treeだけ無効化するpreflightを必要とする。公開pnpm11 bundleの環境変数設定/依存検査分岐に基づき、単発child継承 `pnpm_config_verify_deps_before_run=""` と `--config.verify-deps-before-run=false` を新treeの規定checksだけへ指定する。main/global設定を書き換えず、autoInstall/networkを実行しない。DB/runtime/test実行は候補後の有限条件固定まで0。exact変更集合は正式案＋再生成read/current補正、報告のみmain .goal-implement/phases/P5d-implementation.mdへ置く。UI候補の検証と独立したworktree変更を並行し、受入前にmainへ取り込まない。


### UI検証とparserの終了条件

parser修正と同treeのmain b6e567bから新Bを生成し、正常build・有限停止・全source/output manifestを局所受入した。releaseは工具metadataとして、schemaVersion/candidate/sourceManifestSha/buildManifestSha/artifactsManifestSha/source{files,bytes}/artifacts{files,bytes}の7keysだけを実manifestから検算する。421Bのwx600生成、fsync/実FDclose/元write inodeに束縛したpostreadを確認した。renderer・native閉鎖proof・UI成功の情報はこのmetadataから推論しない。新Bのmanifest-listed source/distとmetadataだけを有限read scopeにし、旧B/private資材を参照しない。新UIは同Bの参照・compiled class/factory graphとbindingsを別に確認する。

Drive UIはmain b6e567bと新B c18a6f02に束縛する。[compiled UI候補](phases/P5c-parser-ui-bindings.md)の13named RPC、history factory、RSC参照、同一compiled class graphは[独立静的レビュー](reviews/P5c-parser-ui-bindings.md)で局所合格。browser/pure/providerのruntime/type絶対import5箇所とrunner従属3SHAを新Bへ修正し、全helperの静的import/export/動的literal/require参照の束縛も独立確認した。exact新pairのONE実行はpure24・登録/ログイン・upload1完了後、upload2開始時のNode非0/-6でheldとなった。実PG不在と外PIPE/controlFD閉鎖は正常UI・nativeproof・auditを示さず、ChromeへのTERMも正常closeから区別する。原因は未確定のまま、公開入力/コードから有限の次診断を設計し、failedpairやrawlogを後から読まない。元strict noEmitが旧importを解決した可能性と、実resolver I/Oの未観測を区別し、旧Bも後から検査しない。既CLIに引数無しpreflightはないため余分な試行は行わない。通常UI・正常閉鎖監査の受入は未成立である。

公開helperはknown childの早期登録、自己PGとleaderの区分、実PIPE EOFとFD close、control regular FDの終了を個別観測する。Chrome154.0.8037.98の正式metadata/binary gateとexact profile metadata許可、loopback proxyによる外部通信拒否、有限fault enumを維持する。unknown/強制/非0を正常close・proof・ACKへ補完しない。数値上限・各一巡のexact bindingは担当報告へ置く。

R03のparser admissionは結果messageだけで解放せず、実Worker exit・stdioの終了後にcallerをsettleする。documentExtractor.tsと既testの2pathでprovisional outcome/late error/timeout/正規terminateを管理し、閉鎖未確定の枠を再利用しない。出力型・既港・30秒timeout・同時2/待機8を維持する。候補C818は実Worker3ケース・正規fork/Worker閉鎖・Node/PG/EOF-FD正常終了と独立照合で局所受入した。旧UIのNode終了原因は未確定のまま保持する。修正2sourceを取り込んだUIには新candidate/buildと同bundleの検証が必要となる。

watch無効のparser工具では、Viteが任意依存として読むfseventsをnative初期化前に利用不可とする。fseventsはmodule初期化でthreadを作るため、addonの許可追加は行わない。exact binary・fsevents.js・Vite親edgeを束縛し、認証済みmain/fork各一回だけ明示tool-policy Errorを元optional catchへ返す。有限のexpected-disabled通知は通常deny・native閉鎖proofと区分する。未知module・直接dlopen・別parent・繰返しはheldとし、native exportsやbrandを合成しない。

plaintextのparser3ケースでは、Vitest正式inline `css: { postcss: { plugins: [] } }` を使い、不要なPostCSS設定の自動探索を省く。またVite正式 `server.forwardConsole: false` により、この工具が使わないブラウザへのconsole転送と、それに付随するagent自動検出を省く。後者の既定値は公開固定literalへのaccessを呼ぶ静的経路がある。起動時accessのREAD_SCOPE OUTSIDE拒否は確認したが具体actual callsiteは未確定であり、設定から原因確定やFS許可拡大を推論しない。guardと実Worker終了条件を維持する。

## P5c-3-S4: 通常local残形式

[正式案](phases/P5c-3-formats-plan.md)の20pathsと[固定S4-A–F](criteria/P5c-3-S4.md)を採用する。preview保存のpdfPreviewRepository.ts・domain/llm/pdfPreview.ts、既S3 testの型追従、pdfClassifier.tsのdata-only projectionを加えたeffective24pathsで隔離実装する。版付きwork/result、PDF readerのfresh世代、native birth/knownPID正本、record3能力、前任2CAS/ACKを維持する。native管理能力をWorker payloadへ渡さず、元ownerへ保持する。新DDL0、V1/S1–S3/P5b policy不変更。

preview回復は正規terminal＋ownerclosed CASとinputclosed0 CASを同Txに束ね、第二失敗はrollbackする。応答不明は元opaque proofを保持し、同値確認後だけconsume/ACKする。一般runningclosed状態を増やさない。redrawのinput receiptは既schema/claim/previewと同じgeneration→state順で生成し、復元後の同値guardを正規経路で満たす。guard/private capability/CASの条件を緩和しない。[現候補](phases/P5c-3-s4.md)と[独立レビュー](reviews/P5c-3-s4.md)で残るnative/preview根拠を判定する。

両隔離worktreeは自己tracked source、105宣言依存＋canvas/pdfjs/sharp hoist3のpublic108link、AGENTS内部linkだけを使う。必要ならS4 buildのvite hoist1を別明示採用する。Cloudflare環境型はtracked wranglerと正式workers-typesから固定Python helperで強いEnvを生成し、旧untracked資材やweak stubを借用しない。install/download/private dataコピーをしない。規定checksと機能の実行根拠は区分する。

実行監督では、稼働登録Node PG所有下の専用TMPだけ、入口のinode/dev/0700/UIDが固定確認されたwalkの列挙済entry/descendant消失を有限計数する。innerのP+A合算128、outer128を上限とし、入口自体・cache・DB/sidecar・records・objects・unknown・非ENOENT・link/mode/容量違反は保持する。全PG終了・実EOF-FD close後のstrict走査を次group/copy/監査/正常結果の必須条件にする。live計数をquiescent監査やnative寿命証明へ代用しない。

正常native fixtureの閉鎖では、execution/stage停止・FK/integrity・pin0の確認後、所有clientへ `PRAGMA main.wal_checkpoint(TRUNCATE)` を一回だけ実行する。busy/log/checkpointedの3列・1rowがnumberの安全整数で厳密に0/0/0の場合だけ進む。失敗fixtureには実行せず、不明・busy・欠列・非WALの-1はheldとする。元finallyのclient.close、全PG実不在・EOF/FD close・wal/journal非空拒否・copy前strict gateを維持する。checkpoint結果やclient.closedだけから物理閉鎖・監査成功を推定しない。

[C正常系9ケース案](phases/P5c-3-s4-c-proposal.md)は既app test一箇所とrunner/configに限定して候補実装する。V2/V3/V4のno-claim確定と応答不明保持、V4の取消/失権/期限によるfresh reader前停止、部分応答後possibleとprepare/intentのnot-sentを正規job/UoW/OwnedRead/memory/runtime ownershipで区別する。data-only codecの代替結果は契約検証でありnative閉鎖の新証拠にはしない。正規workspace role変更が取消も行うため、失権ケースからrole単独効果を推論しない。期限停止の既currentLlmSourceはLLM_SOURCE_CHANGED/not-sent/closedtrueを返すため、TIMEOUTという提案推定は採用せず、failed/released/read0/dispatch0を確認する。既正常familyの本体、製品ports/DDLは変更しない。C fixtureにも上記正常checkpointを一回だけ採用し、execution/stage/memory/pin0の後に行う。行数・quota・previewの期待値は候補seedから静的確定し、実観測から後付けしない。候補固定・独立レビュー後に実一巡を別採用する。

C9とsummary最小修正の正常一巡により、固定S4 A–Fを受入済み。JSON reporterのfullNameはsuite祖先とtitle、fileは別nameで束縛する。公開TestCase.fullNameの区切りとgetNamesのfile追加を同じ表現として扱わない。過去heldrootの欠測は補完せず、正常一巡のafterAll/実Node・fork閉鎖/内外strict/有限copy/readonly監査を[独立根拠](reviews/P5c-3-s4.md)にする。[S5固定条件](criteria/P5c-3-S5.md)と[機械・共通本文契約](phases/P5c-s4-integration-machine-plan.md)を採用する。machine exactclaim/history、MachineRegenerationInput extends既RegenerationInputのrequired prepareMachine、機械前任の既private proof対象追加、OpenRouterより前の単一共有Node factory、既LLMの必要差だけの共通bodyを固定する。テキスト境界ONE一巡のsafe receipt固定と全reader/writer/runtime停止により、main writerを解放して受入S4の22pathsを統合する。79ef126の[独立main統合PASS](reviews/P5c-s4-main-integration.md)でParser2とoutside22不変更を受入。S5は[計画preflight PASS](reviews/P5c-3-s5-plan.md)後、新隔離sourceの[1999181 backend候補](phases/P5c-3-s5.md)を固定し、独立レビュー中。正常finishInput保存後のreceiptclosed0/owneractiveという合法前任形も起動回復の対象にする。既閉鎖receiptの原proofId・record3・exact機械snapshotからownerを回復し、新input閉鎖proofを発行して成功させない。[修正版e25ab10](phases/P5c-3-s5-d1.md)はopaque owner回復分岐でこの形を扱い、[独立静的PASS](reviews/P5c-3-s5-d1.md)を得た。原receipt/proofIdを保持するowner1CASと、未closed入力の既2CASを区別し、確定読戻後に同能力をconsume/共有ACKする。PURE4/APP7/native正常2の局所根拠を受入済みだが、native前任回復はheldで実原因UNKNOWN、全S5受入は未完。共通factoryはextended input実instanceを一度作り、LLMへも同参照をbase型で渡す。note/history.ts checkedSnapshot exportのみを追加scopeとし、履歴処理は変えず共通bodyで再用する。機械の内部local producerはDrive IN-07基盤の検証用で、通常利用者entryとpending/error/undoは後続Slice C/P5dと同featureで完了する。backend局所成功だけでS5-Fをdoneにしない。

S5のunknown execution確認はMachine専用typed confirmClosed(jobId, SourceInputProof)に限定する。元proof/leaseのconsume成功と全source/owner/g・保存terminal/receiptclosed0同値をprivate factoryで検査し、同held operation actualdone settled後だけ解放する。新WeakMapは同消費済み能力の記録であり、新proof/brand/journalやbytes/pin/nativehandleを作らない。genuine finish proof取得済みの保存応答不明には同lease/proof exactdeferredを使って元withOwner Promiseを保持し、正常保存読戻/consume/terminal確認後に元finallyから自然にpin/executionを解放する。未知read/codec/nativeには適用せず、maintenanceはactive中も回復できる。ObjectStorage追加解放APIは採用しない。必要追加sourceはNode execution.tsと既repo fake型追従1pathだけ。新own CF型は正規helperのONE生成で986B/strong Env、Python0/EOF-FD/force0を得た。

Drive通常接続は[独立設計レビュー](reviews/P5c-3-drive-slice-c-plan.md)の段階C0–C3へ分ける。C0はDrive HTML/Markdown機械バックエンドの11source+2test候補を721bc7ad基点の別隔離SOURCEで実装する。selected recordのbinding/job同Tx保存、同shared resourcesへのlate typed provider pair合成、Drive枝だけbody準備→lease-active final-inspect/保存ACK→元finish→closed最終TxDB fenceを固定し、既local枝の意味を維持する。終了時の公開quiesceは同tickでmachine/LLMの新queueを止めてcaller drainを開始し、Drive側のHTTP/定期queueも止める。その間に必要なDrive final-checkを受け付け、同quiesce Promiseの完了後に共有Drive executionを最終停止する。C0-F修正scopeはserver.node.ts、driveRuntime.node.ts、Node drive/runner.ts、driveRuntime.node.test.tsに加え、Node regeneration/runner.tsとapplication regeneration/worker.tsの6path。machine runnerはsweep発行Promiseだけを終了根拠にせず原execution.stopをawaitする。原callbackがpendingCompletionを待つ間も既runner資源で正規recover-onlyを継続し、停止中に新jobをclaimしない。execution.stop完了後だけの回復sweepはdeferredとの待機循環を作るため採用しない。原Drive能力/未知保持を緩めず、重複quiesce/stopの同Promiseと論理停止順を確認する。C1は[条件付き独立計画](reviews/P5c-3-drive-llm-c1-plan.md)に従い、既LLM非PDFのgeneration=nullを維持し、Drive generationはsourceBinding.ownershipGenerationと同Txのcurrent resolverで確定する。DDLを変更せず、typed finalizeDriveとprovider/drive/ACKの一組、同shared resourcesへのNode DI接続を必須とする。原withOwner callbackを同genuine proofのpendingCompletion/保存済exact読取/consume後に自然終了させる回復契約は[再入補正の独立静的PASS](reviews/P5c-3-drive-llm-c1-completion-reentry.md)まで受入。最初のwrite前snapshotと終端callを分け、全prewrite rollback確定後だけ同callbackの次Tx invocationを許す。実装型・query・private保持量は12source/3tests候補で確定する。C2はP5d StoredAccount/current型接続、C3はGET/既POST3strict union/React19 UIとmain統合とする。C0のSOURCE候補をactual proof又は通常UIの成功へ転用しない。通常DB/job工具は[補正計画](phases/P5c-ui-job-normal-fixture-plan-correction.md)のruntime依存閉包、同期preload、原hasher.stop、通常認証counts、service stderr=NULLを固定して候補化する。 規定pnpm checksはPUBLIC原コードのauto-install抑止設定を起動ごとに固定し、global/package設定を変更しない。新C0の先行工具起動で宣言aliasの変更が発生したため、alias復元・PUBLIC metadata/ソース同値確認後の正規3checksだけを候補根拠に使う。


UI Node-6の次診断は[公開テキスト境界案](phases/P5c-ui-node-abort-proposal.md)のparser4＋mixed8、DB/browser0に限定して候補helperを作る。pinned Node24.15の公開worker_threads diagnostics_channelは原Worker観測用に採用し、start後のpublishをconstructor許可に転用しない。source API前の実閉鎖permit2と、原handleの実exit/両stream end-closeを別に束縛する。production admissionの解放時刻は欠測、保守的なtool limiterの実行をUIと同じtimingと主張しない。terminate wrapperは採用せず、独立Promise観測はnullに保持する。独立補正PASS後のONE miniはstartupでINNER_HELD/SCOPE/UNKNOWNとなり、ケース結果とWorker登録は0件。actualWorker不在の証明にはせず、guard site/原因を未確定に保持する。NodeTERM/actualexit-15/PG不在/外EOF-FD閉鎖は工具の強制閉鎖で、UI/nativeproof正常受入へ転用しない。固定receipt後main writerを解放し、次はPUBLIC-only guard調査を別委譲する。failed rootは永久非操作。

[TEXT-STARTUP2](phases/P5c-ui-text-startup-proposal.md)のexact alias realpathSync透明委譲・有限fault context・archive-only guardを独立preflight後にONE採用し、2case/12実Worker exit・両stream終端・保守的2permitとNode0/PG不在/外EOF-FD/force0を[独立局所PASS](reviews/P5c-ui-text-boundary.md)で受入。manifest-listed archive source1457と固定metadata/Gitblobを照合し、main HEAD/source依存0・物理unknown entry不存在の推測0を維持する。Worker terminate Promise/stream error/production admission releaseはNULL、fulltermination/nativeproof/UIの成功には転用しない。旧Node-6原因は未確定。[次診断の計画](phases/P5c-ui-node-native-followup-plan.md)はimmutable Git79の通常createLibsqlClient→serializeLocalClient/元processJob/importRunnerと正常shutdown境界を使う。b6/79のclient wrapperは同値で、旧UI工具も元createLibsqlClientを使う。DBなしminiから通常libSQL/UoW/background jobへ検証範囲を広げる理由と、未確定の旧abort原因を区別する。旧privateと実外部は非操作。

前任previewのactive/unknown対では、owner subprocess自身が実native子をspawnし、正規birth予約とactualPID登録を済ませる。owner終了後も子がaliveなら回復を拒否し、登録済みPIDの実ESRCH後だけ正規predecessor proofで2CASへ進む。同proofで第二CAS失敗のrollback、commit後の応答不明、同値読戻後のconsume/ACKを確認する。累積owner2/native2・同時2、同logicalDBのowned client最大2をこのfamilyに限り採用する。孫のstdioはignore＋IPCで、owner死亡後の元handle・exit code・FD閉鎖は欠測として保持し、PIPE EOFを合成しない。固定release markerは終了要求として扱う。

S4の内部V4検証は、通常previewで得た現sourceのmanifestから正規claimし、同execution内のsourcePreparer内部pages.prepareを直接通す。保存finish応答喪失の画像対では、実memory/inputを既portsから配線し、原本read実閉鎖・同opaque lease/proofの保持・派生typed outcomeのprepare未resolve・pin/executionを別々に観測する。同g保存値の確定後だけ元consumeとresolveを進める。派生Mapの物理到達性やGCは観測値にしない。2ケースにWorker1/業務child3各同時1を採用し、正常終端後の監査まで既有限枠を維持する。個別Vitestforkは元forkの同handle公開イベントを早期登録し、stock stopとouter強制終了を区分する。公開IPCのdisconnect/channel解放を確認し、ReadableのないIPC EOF/物理FDは欠測のまま保持する。候補と実一巡の採用は分ける。

### P5dのローカルTLS契約検証

[HTTP計画](phases/P5d-native-http-plan.md)と[独立補正](reviews/P5d-native-http-plan.md)を採用する。新credentialLocalTlsDial.tsと既OpenRouter http/provider/configの4製品pathに閉じ、Nodeの元https.request/private transport能力と公式logical URLを維持する。元https.createServerで生成・所有するloopback listener/certificate/addressにprivate registry上のopaque dialを束縛する。通常JSON/env/DIにはoverrideを追加しない。

opaque dial時だけHostをopenrouter.aiへ固定し、lookupのall:true配列/通常address+familyの両形式を明示する。unknown hostnameのDNS fallbackを拒否し、per-request trust materialだけを使う。stock hostname/chain検証とrejectUnauthorized=trueを維持する。global DNS/hosts/CA、元request wrapper、手製proof/brandを使わない。鍵・証明書・listener・ケースの実行はexact工具/新root/有限資源/終了条件を別固定し、独立preflight後の一回採用で行う。

実request/response/socket close、whole callbackのlate採用UoW終了、exact closure保存/同値読戻/ACK/consumeを別に確認する。resources0のCR5成功をHTTP資源の閉鎖や全コピー回収へ代用しない。Google・legacy whole cutover・65/67・全コピー・ブラウザの残条件は維持する。

失敗箇所の診断は、既HTTP01内の固定checkpoint最大24個から一値と、Vitestの正式TestCase.result().errorsから有限のerrorClass/code/indexだけを投影する。元errorをそのまま再throwし、秘密値・SQL・message・stack・期待値/実値を報告しない。失敗時のcheckpointを正常閉鎖frameへ読み替えず、元fixtureの失敗抑止・closure/proof/ACK条件を維持する。実行は新候補と新隔離rootの独立preflight後に別採用する。

OpenRouterのever_linked_at不変guardは通常active状態で維持する。connected native-v1の退会縮小は、同accountのdeleted anchor・running intent・authVersion・現在cursor、epoch/version各+1、unlinkedと全秘密列NULL、元originとcallerEnded/実閉鎖/ACKが一致する場合に限る。通常unlink後にeverLinkedだけ残る単一系列も、OLD全秘密NULL・everLinked非NULL、origin epoch=OLD epoch-1、同じintent/leaseとgenuine native-v1 closed callerEnded ACKを満たす時だけ履歴を回収する。このNULL枝では既retirement全NOT EXISTSとaccountHeld全EXISTS拒否を明示し、Drive/LLM/input/object-write/資格debtがある間は進めない。active状態の縮小拒否と単一通常unlinkの実正例を確認済み。legacy・origin欠測・複数epochの閉鎖は推定しない。

ACK未確定の退会停止は、資格proofのclosed保存/同値読戻TxとACK Txを分けて検証する。元acknowledge成功後でもACK Txのcommit前に失敗した場合、保存済みcallerEnded/closedとACKfalse・同private pending proofを保持する。通常sweepはintent claimより先にrecoverを行うため、継続fault中はintent/cursor/version/leaseとdebt集合を変更しない。fault解除後に同proofの正規read/ACK/consumeを経て同intentを再開する。aftercommit応答喪失のACKtrueと区別し、cursor強制・recovery省略・欠測からのclosed推定を行わない。

[複数資格use案](phases/P5d-multiple-debt-proposal.md)は新test/fixture2と新runner/loader2だけを候補実装する。同accountの正規attempt3から、実native whole callback2を元failed-UoWの返却位置で保持し、第三rowは通常closed/callerEnded/ACKまで終了させる。per-row cleanupは第三rowだけを回収し、global accountHeldと実verifyの非empty判定は残2によってwaiting-owner/succeeded0を保持する。元callbackを解放し、通常save/read/ACK/consumeの後、fixture時計の2001ms前進と同intentの正規sweepで再開する。durable credential use義務2はliteral account_deletion_debts2と異なり、unknownやACKfalseの正例にも転用しない。既製品のaccountHeld範囲・recover-before-claim順序、gate5秒/native10秒は維持する。候補固定・独立レビュー後に実一巡を別採用する。

複数useの最初の一巡はAssertionErrorでheldとなり、失敗位置・原因と正常fixture閉鎖/監査は欠測のまま保持する。[24固定stage診断](phases/P5d-multiple-debt-diagnostic-proposal.md)は既testの操作・assert群へ入った地点だけを一値で投影し、外catchから元errorをそのままrethrowする。正常successには診断frameを出さず、診断の存在はnormal/auditへの昇格を永久に拒否する。fixture・元assert/await/finally・loaderの正式error mapperを維持し、未知/重複frameを拒否する。エラー本文・行・秘密・proofは記録せず、失敗rootも後から読まない。write失敗でも元errorを保つ最小補正の独立PASS後、ONE実行はfailed-attempts群でAssertionError/Node1となった。群内predicate・実値・原因・正常fixtureclose/auditは未観測。failed rootは永久非操作に保持する。PUBLIC契約から空codeのdurable provider failureとcaller ConflictErrorを区分し、test内同A/B保存行の2期待だけをPROVIDER_REJECTEDへ補正した。548a8fのONE EF01は正常passとsameDB readonly監査を得て[独立局所PASS](reviews/P5d-multiple-debt.md)を受入。元callback/同proof/save-read/ACK/consume/同intent再開のassertion成功を個別rawproof監督receiptへ補完せず、use義務2・resources0・literal debt2/nativeHTTPの別条件を維持する。

通常容量CA67のUoW工具上限は[SOURCE算出](phases/P5d-drive-capacity-uow-budget-plan.md)の正常837回・単一追加settle68回を含む保守905回から1024回とする。既completeごとのadopt guardとreturn phase読取を含め、実観測のcounterから期待を作らない。fixture guardとtest上限の二箇所だけ変更し、製品のregistry67・history/ACK各68・元proof/ACK・client上限12288・時間・正常閉鎖/監査の条件を維持する。新helperと新rootの候補を独立確認してから一巡を採用する。

通常DB/job fixtureの新Node/Workerプロセスだけ、最初のimport前にWS_NO_BUFFER_UTIL=1とWS_NO_UTF_8_VALIDATE=1を固定する。[正式ws分岐](phases/P5c-ui-job-normal-fixture-runtime-closure-step13.md)によりoptional bare requireの評価を避け、原JS/builtin経路を使う。親global・製品設定・exportsは変更しない。optional packageの存在/不在・builtin値・WS/native閉鎖又はUIの成功は推定しない。全PUBLIC依存の有限去重・SOURCE由来予算・libSQL必須addonの正式bindingは別に確定する。

通常DB/job runtimeの公開依存は[有限去重](phases/P5c-ui-job-normal-fixture-runtime-closure-step14-plan.md)で221files/1209890B。JS256・JSON24・合計2MiB以内の各exact列挙候補とし、読み込み許可は未知prefixへ広げない。新Node/WorkerのLIBSQL_JS_DEVは最初のimport前から未設定に固定し、原libSQLのordinary native routeへ限定する。必須addonは正式alias/package entry/ABI/contextの確定前にはloadせず、1file・8MiBの別枠候補として扱う。helper material256KiBは全unionの実計測後に固定する。

C1の保存応答喪失は[補正capture契約](phases/P5c-3-drive-llm-c1-completion-capture.md)で、最初のwrite前のrollback期待と、元completeLlm直前のterminal引数・dispatch/quota期待を分ける。成功はcommitNote前、失敗はdispatch.fail前に不変snapshotを取り、元write順・同proof・原callbackを保持する。delivery unknownとownership unknownをfailed型から除外し、quota解放はfail後の元状態から算出する。[再入補正の独立静的PASS](reviews/P5c-3-drive-llm-c1-completion-reentry.md)と8edbbac7の[独立SOURCE CODE局所PASS](reviews/P5c-3-drive-llm-c1-candidate.md)を受入。製品契約を変更せず、PURE18とgenuine coordinator4familyの[検証計画](phases/P5c-3-drive-llm-c1-validation-plan.md)を独立レビューへ渡す。constructor恒等guard、総holding heap、genuine nativefixtureは未確定であり、SOURCE CODEの受入を実動作の受入へ転用しない。

[OWNER-RACE1](phases/P5d-owner-race-candidate.md)は一DBに元client二つを接続し、callback外の開始gateと受動要求overlap観測で最後のownerの退会拒否を検証する。二つのwrite lock同時獲得を主張しない。元Promise/Txを保持し、driver errorや欠測はheld。正常二client閉鎖・checkpoint・PG/EOF-FD・同DB readonly監査を別々に確認する。

通常DB/jobの既runtime222filesに、元factoryがimportするsanitize-html・uuid・dom-serializer・domhandler・htmlparser2の未閉包がある。[正式metadata5](phases/P5c-ui-job-normal-fixture-runtime-closure-step19.md)からentryと依存を有限展開し、class unionを確定してから新工具を作る。旧成果物の再利用やfactory置換は行わない。

[C0停止・回復の論理4対](reviews/P5c-3-drive-machine-c0-stop-test-actual.md)は正常fork/内外PG・EOF-FD/force0/strictと共に局所受入。genuineproof/DriveACK/server全停止をこの結果から補完しない。OWNER-RACE1の[7固定入場点ONE](reviews/P5d-owner-race-predicate-actual.md)はRACE_TRANSACTION_RECEIPT群でAssertionError、五fieldの不一致項目・実値・原因UNKNOWNでheld。次診断は元endRace typed戻値の五fieldだけをassert前に保持し、単一失敗frameへbool又は0..64 safeintegerのnullable値を投影する。元fixture/Promise/handle/原assert/await/閉鎖・監査条件を維持し、診断値から期待値を作らない。

通常DB/job依存の[static途中union](phases/P5c-ui-job-normal-fixture-runtime-closure-step33-interim-union.md)は359regular（JS313/1402701B、JSON46/516221B、計1918922B）。これは静的読取範囲であり、旧runtime件数上限JS256/JSON24を変更しない。未閉包のliteral子依存を確定し、BUILD/SOURCE/alias/出力との全union・materialとSOURCE由来API/resource予算を算出してから新工具候補を固定する。
