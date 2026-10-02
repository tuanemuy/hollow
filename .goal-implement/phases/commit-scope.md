# 候補コミットの所有範囲

2026-09-10（Asia/Tokyo）の読み取り専用整理。stage・commitは未実行。本体検証の完了やコミット許可を意味しない。

## 結論

[P0](P0.md)は`main / 91c68d4`の開始時cleanと、既存の要件・シナリオ・画面案を記録している。[P1](P1.md)以降の報告は実装を未コミット・新規ファイルを未追跡として保持している。Managerから、Verifierの再開時580ファイル識別一致と、9月6日候補以後の製品差なしの報告を受領した。今回独自にhashを取得していない。

この根拠と現inventoryから、現在の製品差分はP1〜C3の累積成果としてコミット候補に分類できる。ユーザーの開始時未コミット変更と同じfileで混在する確定例は見つかっていない。ただしGitだけから作成者を証明することはできず、各行を今回新たに監査した結果ではない。

## 分類

集計は本資料作成前。tracked変更23ファイル、untracked321ファイル（管理58、web85、core177、docs1）。untracked製品候補は263ファイル。短縮statusのdirectory件数と実ファイル数は異なる。cached diffは空で、stage済み成果はない。

| 分類 | 範囲 | 根拠・扱い |
| --- | --- | --- |
| ユーザー既存・変更なし | `spec/**`、`CLAUDE.md`、`AGENTS.md`、既存template | trackedであり今回status差なし。P0以前の入力。今回新規成果としてstageしない |
| 今回の新規製品成果 | `apps/web/app/adapters/wys/**`、`components/hollow/**`、Hollow presentation/routes/styles、`docs/hollow_local.md` | P1/P2/C1〜C3報告の実装範囲。各新規fileを明示した候補manifestに含められる |
| 今回の新規core成果 | Hollow domain/application、HTML/Node adapters、libSQL repositories/schema/UoW、tests、migration | P1〜C3の型付き実装・テスト・移行報告と対応。既存template全体の所有を主張する分類ではない |
| 今回の共有tracked変更 | 下記22ファイル | 初期clean、各phase報告、再開時識別一致が根拠。共有libSQL/outbox等の小diffも今回確認。新規成果と同じ累積候補へ |
| 設定sample・要確認 | `apps/web/.env.example`（追加3行） | path/numstatだけ確認し内容は読んでいない。phase環境設定に対応する候補だが、後の許可時に公開sample値だけであることを確認してから含める |
| 管理・検証資料 | `.goal-implement/**` | Manager/Implementer/Verifierの共同成果。製品hash対象外で、製品commitとは別分類。root直下管理文書・独立reviewの所有者承認なしに一括stageしない |
| 対象外 | ignored build/node_modules、DB/WAL/SHM、env、mailbox、credentials、`/tmp`の自己/独立資材 | 内容・一覧を探索していない。製品候補へ含めず、`git add -f`等もしない |

### tracked共有変更22ファイル

- `README.md`、`docs/runtime_node.md`
- `apps/web/app/presentation/appServerErrorAdapter.ts`、`errorDisplay.ts`、`errorResponse.ts`、`errorResponseMiddleware.ts`
- `apps/web/app/routeTree.gen.ts`、`routes/__root.tsx`、`routes/index.tsx`、`server.node.ts`、`styles/index.css`
- `apps/web/package.json`、`apps/web/vite.config.node.ts`、ルート`package.json`、`packages/core/package.json`、`pnpm-lock.yaml`
- `packages/core/src/adapters/libsql/client.ts`、`schema.ts`
- `packages/core/src/application/di/types.ts`、`execution/unitOfWork.ts`、`workers/eventRelayWorker.ts`、`packages/core/src/config.ts`

P1のUoW汎用化・構造的error、P2aのlocal client全資源直列化とoutbox、P2bのcss-tree runtime解決、C1〜C3のschema/依存/route接続と対応する。今回確認した小diffに、別作業の変更と判定できるhunkはなかった。未確認の全diffや設定値まで秘密なしと保証しない。

## 生成物・第三者fixture

`routeTree.gen.ts`はtrackedのroute生成物。既存生成規約に従い実装と一緒に含める候補で、今は再生成しない。libSQL migrationの0000〜0008とmetaは未追跡。0000等のtemplate由来生成内容と後続機能migrationを、新しい製品コードの著作者と混同しない。fresh checkoutの移行再現に必要な系列として扱い、現在の系列を独断で削除・再生成しない。

`packages/core/src/adapters/node/import/__tests__/fixtures/`は今回収集・生成した試験資材であり、全て独自著作ではない。`README.md`、`MEDIA.md`、`sources.json`と`licenses/`を一組で候補にする。POI/PDF.js/libpng/Tabler/Noto等の出所・権利表記を落とさない。ここでは出所文書だけを読んでおりbinary再hashや外部再取得は行っていない。

## コミットの最小案と不明点

P0からC3まで同じ未コミットfileへ連続して変更している。現在内容をP1/P2/C1/C2/C3の過去候補へ機械的に分割しない。C3独立受入後に、受け入れ済み累積製品を一つのbaseline候補として記録し、それ以降のフェーズごとにcommitする案が最小。過去のphase hash根拠は報告へ保持し、過去にcommitがあったとは書き換えない。

- stage時は再開時点の明示的なfile一覧と許可範囲を照合する。`git add .` / `git add -A` / root一括path指定は使わない。新しく現れたfileやhunkは別分類へ戻す。
- `.env.example`の公開sample確認が残る。秘密値を含む場合はそのhunkを分離し、今回調査を秘密監査済みとして使わない。
- `.goal-implement/`を履歴管理へ含める方針はManager判断。独立reviewと進行中の管理資料を製品baselineへ暗黙同梱しない。
- 明確なユーザー既存dirtyや同file混在は未検出。発見時はfile/hunkごと分離要として返し、既存内容のrevert・checkoutはしない。

## 実施範囲

`git status --short`、`git diff --stat / --name-status / --numstat / --name-only --cached`、`git ls-files --others --exclude-standard`、限定pathの`git ls-files`/status、小さい共有fileのdiffを使用した。P0/P1/P2a/P2b/C3報告とfixture出所文書を参照した。`git check-ignore`は指定pathの該当なしでexit1となり、その後のdiffは別呼出で読み取った。

全差分のdump、秘密ファイルの読取、hash、build/test、DB、browser、プロセス操作、依存変更は未実施。書込は本資料だけ。文書の分類完了後は操作停止し、C3固定候補のstage/commitは行わない。

## 公開sample確認と累積manifest

2026-09-10T10:20:36+09:00。C3-V1独立再確認中の読み取り専用準備。対象コードのhash、依存、test/build、DB、browser、process、stage/commitは操作していない。今回の書込みは本節と次の管理manifestだけ。

- [commit-product-files.tsv](commit-product-files.tsv): 288 pathすべてのGit状態・分類・相対path。
- [commit-product-paths.txt](commit-product-paths.txt): 同じ288 pathを1行ずつ列挙した製品候補。ディレクトリ指定・wildcard・管理資料を含まない。

### 公開sample

`apps/web/.env.example` の差分は hunk `@@ -19,0 +20,3 @@`、追加3行・削除0行。値を表示しないローカル判定で次を確認した。

| キー | 判定 |
| --- | --- |
| `HOLLOW_MAIL_MODE` | 公開のローカル配送モード列挙値 |
| `HOLLOW_MAILBOX_DIR` | 汎用のディレクトリ名だけからなる相対保存先 |
| `HOLLOW_STORAGE_DIR` | 汎用のディレクトリ名だけからなる相対保存先 |

保存先には絶対利用者path、上位ディレクトリ参照、補間、認証URL・credential構文がない。追加hunkは公開可能な非秘密sample設定として製品候補に含める。実際の `.env`、mailbox、credentials、ignored設定を読んだものではなく、全リポジトリの秘密監査を完了したという判定でもない。

### 明示manifestの分類

| 分類 | 件数 |
| --- | ---: |
| tracked変更 | 23 |
| untracked製品成果 | 265 |
| 合計 | 288 |
| 出所文書（上記に含む） | 3 |
| LICENSE / NOTICE（上記に含む） | 6 |
| fixture本体・生成script（上記に含む） | 37 |
| migration・meta（上記に含む） | 19 |

前回の製品候補286 pathに対する追加は、C3-V1報告の `apps/web/app/components/hollow/wysDiscard.ts` と `wysDiscard.test.ts` の2 path。`NoteEditor.tsx` は既存の累積未追跡成果へのV1修正であり、新規3つ目のpathと数えない。tracked23 pathは前回の共有22と公開sample1に対応する。cached diffは空。

fixture権利文書は次をmanifestへ含める。`README.md` / `MEDIA.md`を再読し、`sources.json`と各LICENSE / NOTICEのpathが同じ候補一覧に存在することを確認した。外部再取得、binary再hash、licenseの新たな法的判定はしていない。

- `packages/core/src/adapters/node/import/__tests__/fixtures/README.md`
- `packages/core/src/adapters/node/import/__tests__/fixtures/MEDIA.md`
- `packages/core/src/adapters/node/import/__tests__/fixtures/sources.json`
- `packages/core/src/adapters/node/import/__tests__/licenses/libpng-LICENSE`
- `packages/core/src/adapters/node/import/__tests__/licenses/noto-LICENSE`
- `packages/core/src/adapters/node/import/__tests__/licenses/pdfjs-LICENSE`
- `packages/core/src/adapters/node/import/__tests__/licenses/poi-LICENSE`
- `packages/core/src/adapters/node/import/__tests__/licenses/poi-NOTICE`
- `packages/core/src/adapters/node/import/__tests__/licenses/tabler-LICENSE`

P0開始clean、P1〜C3の累積報告、C3-V1の3ファイル変更報告とinventoryが対応し、分類外の製品pathは0。新しい無関係なpathや、別作業との混在を示すhunkは検出していない。ただしsample以外の全hunkを今回再監査したという保証ではない。

`.goal-implement/**` は取得時61ファイルを別分類とし、今回のmanifest自体も製品候補に含めない。既存trackedで変更のないspec / CLAUDE.md / AGENTS.md、ignored DB/env/build/node_modules/mailbox/tempも対象外。

### 利用条件

manifestは現在の固定候補に対する事前一覧であり、stage/commitの指示ではない。C3独立受入後の別委譲で現statusと照合し、差分や新規pathがあれば分離して再確認する。管理資料・既存specを追加しない。ファイル指定後もcached diffを確認し、未知hunkがあれば分離する。製品の累積baselineを過去phaseごとに作成したcommitと表記しない。

文書作業を完了し、製品・検証環境への無操作とstage/commit停止を維持する。

## 累積製品baseline commit

C3-V1独立受入後のManager委譲により、2026-09-10T10:25:27+09:00に累積製品baselineを記録した。P1〜P2c-3とC3-V1の受入済み成果をまとめた最初のcommitであり、過去の各phaseでcommitしたという記録ではない。

- commit: `b74a8ad0b5586dcbce301ce066ea82731a173738`
- 件名: `feat: establish Hollow P1-C3 product baseline`
- parent: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`
- 対象: 明示manifestの288 files。23 tracked変更と265追加、51,683 insertions / 64 deletions。

10:24:46.038+09:00の事前照合で、manifest288一意 / 現製品status288 / 新path0 / 欠落0 / cached空を確認した。固定582 filesのsource hashとHEAD / lockも一致した。公開sample3行と出所・LICENSE / NOTICE9文書を含め、管理資料・既存spec / CLAUDE.md / AGENTS.md・ignoredファイルは含めていない。

manifestを1行ずつ読み、288のregular fileを `git --literal-pathspecs add -- <各file>` の個別引数として指定した。ディレクトリ一括、`git add .` / `-A` / force addは使っていない。10:25:14.141+09:00にcached288 pathのmanifest完全一致、管理/spec混入0、unstaged tracked0を確認。`git diff --cached --check`も成功した。通常の `git commit` を使用し、hookを無効化していない。

10:25:52.036+09:00のcommit後照合:

- commitに含まれるpath288とmanifestが完全一致。
- sourceは582 files、`8dfe16a5410cbbf7d66fc271f5bd6c0e5724c44053c3b1ff18f992bb545d8aa8`で不変。
- lockは`d48aeda94b6cf2e8f2ec1298733b05fff3419f775b86b3aab303498ebb9dae53`で不変。
- 製品status差分0、cached空、unstaged tracked空。残る64 pathはすべて `.goal-implement/**` の未追跡管理資料。
- hook等による製品内容の変化は検出していない。manifestのGit状態列はstage前の記録として保持する。

push / PR / 公開、DB / browser / process / build / test / 依存変更は未実行。production PID31825 / session59378と受領データ496 notes / 62 assets / 805 revisionsはこのcommit作業で再操作・再集計していない。報告追記後に全操作を停止し、P2dは別委譲まで開始しない。
