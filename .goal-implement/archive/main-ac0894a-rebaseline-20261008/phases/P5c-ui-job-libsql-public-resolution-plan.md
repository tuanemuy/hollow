# UI browse4 公開解決経路の限定計画

固定日時: 2026-10-06T09:48:39.144057+00:00

判定: 現候補の declared source/dependency closure に **STATIC 不足1件**。最小補正案を提示する。startup2 の実失敗原因は UNKNOWN のままであり、補正採用・新候補固定・独立 preflight・新 ONE 実行はこの文書では行わない。製品機能、UI、native closure の合格判定ではない。

## 固定対象と根拠の区分

- immutable source: `79ef126edd5d3440cde20dbe8fd372e7235010c5`、selected source 327 files / 1,920,009 B、sourceManifest SHA `4b397da14b37df3bc09abb656259572c7c55f2159055d4f31bd7a238753bf206`。
- 公開 runner `p5c-ui-job-libsql-build.py`: 26,503 B / `9b55aa9ffc7bca02e8aa447be3706c17573a7e4274639d1a6cedf4a0c9ed74d2`。
- 公開 driver `p5c-ui-job-libsql-build-driver.mjs`: 10,061 B / `6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac`。
- 公開 packed manifest `p5c-ui-job-libsql-build-manifest.json`: 117,105 B / `d2b84a5a01c5ac2ea756bab5df138222fd25db892432d1ccd2cf0d6a2a631fa8`。decoded payload 1,557,935 B / `4d8897419e971a24158e850d11d01e6289f09cc5953c1c21acad2122848c38ca`。

上記3ファイルを canonical / regular / nonlink / mode0600 / UID / nlink1 / NOFOLLOW / dev-inode・size・mtime・ctime の前後一致 / 全文 SHA で直接確認した。生成 SOURCE / BUILD / TMP は読取も stat もしていない。

今回直接読んだ source body は、manifest-listed immutable Git blob の `apps/web/package.json`、`packages/core/package.json` と node worker の `searchSupervisor.ts`、`searchQuery.ts`、`publicQuery.ts`、`noteProjection.ts` の6個だけ。各 size / SHA256 / Git blob ID を照合した。Root が許可した公開 Git `cat-file --batch` の有限読取1回は actual exit0、自己 knownPG absent、両 PIPE actual EOF、stdin/stdout/stderr actual FD close、force0。Node/helper/fixture/build の実行は0。

source327の全bodyや dependency707の全bodyを今回再読した根拠にはしない。既公開 preflight を借用し、runtime edges788 / reachable source66 / declaration edges2532 の有限表と、既知の7 package.json および4 alias を直接照合した。実行結果は Root の安全報告と既独立 review の借用である。

## RESOLVE-ZOD1: web importer の正規解決リンク欠落

`searchQuery.ts`、`publicQuery.ts`、`noteProjection.ts` は runtime `import { z } from "zod"` を持つ。`searchSupervisor.ts` の zod import は type-only である。web package.json に zod dependency が書かれていても、ディレクトリ解決のリンクにはならない。

現 `linkTargets` の6項目は web の `@repo/core`、root の esbuild、core の temporal / drizzle / parse5 / zod である。web importer の祖先上にある `apps/web/node_modules/zod` または source root `node_modules/zod` は declared closure にない。`packages/core/node_modules/zod` は web importer の祖先ではない。

runner line91 は aliases10 / linkTargets6 を検査し、line296–298 の `packageAliases` は元公開 alias の canonical target 検査である。driver line113–119 の元 build options は `bundle:true`、`platform:"node"`、web `absWorkingDir`、四 entryPoints、external `@libsql/client` / `libsql` / `css-tree`。`alias` / `nodePaths` / resolver plugin の設定はなく、child env に NODE_PATH もない。従って packed edge の zod target や aliases10 は stock esbuild の web import 解決へ渡されない。Node ESM loader hook は native esbuild child の TypeScript package resolver の代替ではない。

esbuild 0.27.7 の正式 resolver は package self-reference と exports を処理し、importer の祖先 `node_modules`、その後 NODE_PATH を探索する。core の node_modules を別 web importer へ検索する契約ではない。[esbuild 0.27.7 resolver（loadNodeModules, lines2281–2346）](https://raw.githubusercontent.com/evanw/esbuild/v0.27.7/internal/resolver/resolver.go)。追加 nodePaths が必要な場合も明示設定する API である。[esbuild Node paths](https://esbuild.github.io/api/#node-paths)。

これは **declared closure / 正規解決経路の静的欠陥**。未知の外側 ancestor の物理不存在・ambient tsconfig の不存在、失敗した実 build がこの import で拒否された事実は調べていないため、実原因を確定しない。

## 有限表内の残 package 対応

| importer | runtime bare package | 固定公開契約との対応 |
| --- | --- | --- |
| web | `@repo/core/*` | declared web/core link と core `exports: {"./*":"./src/*.ts"}` |
| web | `zod` | RESOLVE-ZOD1 の不足 |
| core | `@repo/core/*` | core package name / exports による self-reference |
| core | zod / parse5 / drizzle-orm / temporal | declared core の4 links、正式 import exports |
| canonical parse5 | entities/decode、entities/escape | 既知 PUBLIC pnpm entities alias の exact canonical target と正式 exports |
| canonical temporal | jsbi | 既知 PUBLIC pnpm jsbi alias の exact canonical target、既 manifest target |
| canonical drizzle / parse5 | 自己 package | package self-reference / exports |

canonical zod package.json 3,796 B / SHA `c630bd10b52dcf71c112a2bf78dbf2734b9db58d62de663b8d86c2ec2c8cda2e` を stable fullread。`name:zod`、`type:module`、`exports["."].import:"./index.js"` が packed runtime target と一致する。parse5 / drizzle / temporal / entities / jsbi / esbuild の既知正式 package.json もそれぞれ manifest size/SHA と安定性を確認した。entities/jsbi/platform-esbuild の既知 alias は exact canonical target と一致した。未知 ancestor 探索をせず、既 runtime edge 表内では web zod 以外の source 側 package リンク不足を発見していない。全実 resolve / 全 transitive runtime の成功を証明した判定ではない。

## 最小候補 scope

1. packed `linkTargets` に **1項目だけ**追加する。

   `apps/web/node_modules/zod` → `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/zod@4.4.3/node_modules/zod`

   target は既 dependency707 に含む canonical PUBLIC package。別 zod install、別 package version、未知 alias、NodePaths、一般 fallback を追加しない。source327 / immutable Git blobs / dependency707 / edges788 / reachable66 / declaration2532 / aliases10 の内容は維持する。
2. runner の固定 `len(linkTargets)==6` を `==7` へ最小更新。source作成・expected_links strict guard は元 manifest-driven 処理を保つ。packed payload / envelope SHA、および runner が要求する packed SHA / size を新実 bytes から固定する。新ハッシュはまだ生成しておらず、この提案から値を捏造しない。
3. **新 SOURCE / BUILD / 派生 toolTMP の memory-only 予約**を Root が指定し、manifest と runner の既 sourceRoot/root bindings を一致させる。startup2/source と original/source・全旧 BUILD/TMP は永久非操作を保つ。driver の元 build options / service identity / receiver / arguments / Promise / close gates の変更は不要。

製品 source、package.json、lockfile、通常 exports、main79 の変更は0。新 link は一時コピー source 内の package接続なので、Git source manifest の外側に1 entryだけ追加する。web/node_modules は既 @repo/core link のため既作成であり追加 directory を要求しない。zod target bytes は dependency707 に既計上され、新 dependency body / native resource / child は増やさない。expected link set は正確な7項目と target に固定し、一般 symlink 許可へ広げない。

新 packed payload は2MiB、material は256KiB、source32MiB / output16MiB / TMP8MiB / log2MiB / root192MiB、body60s + tail30s / guard200ms / Python1 Node1 esbuild-service1 を維持する。現 material190,533 B は借用した旧値であり、更新後 envelope / driver / runner / 32KiB / 4KiB の実計算で新上限内を固定する。リンク件数 +1 を strict capacity/entry guard に含める。新 bytes/SHA/capacity は候補提出前に確定する必要がある。

## 採用と実行の gate

この文書は候補作成 scope の提案のみ。Root が採用し、担当が固定 PUBLIC helper/manifest と full inverse / hashes / fresh bindings / capacity を提示した後、独立比例 review を行う。その後 Root が別途 public metadata precheck → existing default preflight（executed:false/newRoot:0）→ finite SOURCE / BUILD ONE を採用できる。現候補の無変更再実行や、単なる BUILD_PROMISE_RETURNED 診断の追加による再演は推奨しない。

## 未成立と操作停止

Root 借用 startup2 は header → service1/ownedPG match/stderrNULL → held{UNKNOWN, BUILD_PENDING, UNKNOWN}、Python1、監督 TERM による Node -15、knownPG absent、2EOF/controlEOF/4FD close。`BUILD_PENDING` は元 build 呼出/await 領域を示すが同期 throw / Promise reject / 元 await pending のいずれか、exact throwing callsite を確定しない。raw906Bは読んでいない。service個別 exit/stdio、built/closed、四 outputs、native build 正常閉鎖は欠測である。

本 STATIC 補正案を、実失敗原因、renderer / UI 成功、privateproof / ACK / admission、通常 parser resource閉鎖の証拠へ昇格しない。生成 SOURCE/BUILD/TMP・全旧 private・S5/P5d/main working source・DB/key/環境は操作0。Node/helper/import/default/preflight/build/rootprobe/sourcecreate/browser/runtime0。本文固定後、全対象の読取を停止する。
