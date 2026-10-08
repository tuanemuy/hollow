# P5b-3a1 PDF renderer 静的実装補助

## 返却要約

2026-09-29T03:50:13+09:00。固定 C/E/G の renderer/child 候補と 17 代表テストを作成した。全検査は未実行。成功件数は 0、17 件は未実行であり、gate や製品受入の成功へ加算しない。独立 Verifier ではなく Implementer 補助である。

主担当へ返す所有は次の 4 path だけ。その他の製品・管理正本・既報告・共有型・宣言・lock・旧 proof は変更していない。

- `packages/core/src/adapters/node/llm/pdfPagesRenderer.mjs`
- `packages/core/src/adapters/node/llm/pdfPagesChild.mjs`
- `packages/core/src/adapters/node/llm/pdfPagesRenderer.test.ts`
- `.goal-implement/phases/P5b-3a1-pdf-tests.md`

主担当は declaration/親/identity/classifier/配備、型・Biome・unit・実 close・source/dist 検査を所有する。raw PDF/画像/stack/hash のログ出力、外部通信、fixture 生成、Node/native/test/build/DB/runtime/browser の実行は行っていない。静的 read exec は終端回収済み。自己 child/Worker/FD/temp/DB と未回収 exec は 0。

## 固定入口と child protocol

主担当と合意した module export は以下。原本 identity・recipe・manifest の構築や検証は親だけが担う。

```ts
type Page = Readonly<{
  ordinal: number;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}>;
inspect(bytes: Uint8Array, signal: AbortSignal): Promise<readonly Page[]>;
redraw(bytes: Uint8Array, ordinal: number, signal: AbortSignal):
  Promise<Page & Readonly<{ png: Uint8Array }>>;
```

child は固定 `HOLLOW_PDF_PAGES_ACTION=prepare|redraw` と、redraw だけ `HOLLOW_PDF_PAGES_ORDINAL`（canonical 十進 0〜31）を読む。prepare へ ordinal を渡した場合も拒否する。

| channel | 契約 |
| --- | --- |
| stdin | 原本 binary。50 MiB 以下、64 KiB 単位消費 |
| stdout | 最大 64 KiB の JSON 一件。prepare は `{version:1,ok:true,pages}`、redraw は `{version:1,ok:true,page}` |
| fd3 | redraw 成功時だけ最大 4 MiB の PNG。prepare/拒否時は空で close |
| failure | stdout `{version:1,ok:false,code}`。raw cause/本文/警告引数なし、exit code 1 |
| stderr | child は console 引数を保存/出力しない。native stderr の 4 KiB 有限破棄・拒否と process/全 pipe の actual close 判定は親が担う |

有限 code は `LLM_DOCUMENT_CORRUPT`、`LLM_DOCUMENT_ENCRYPTED`、`LLM_DOCUMENT_UNSUPPORTED`、`LLM_RESOURCE_LIMIT`、`LLM_TIMEOUT`、`LLM_UNAVAILABLE`。外部 signal/SIGTERM は UNAVAILABLE、child 全体 timer は TIMEOUT。所有未証明をこの code で closed 化せず、親の実 process/pipe close から別の ownership 判定へ渡す。

## 実装した境界

- inspect は全頁を順に描画し、ordinal/dimensions/bytes/hash だけを蓄積する。PNG/canvas は一頁ずつ解放する。末尾拒否でも部分 manifest を返さない。
- redraw は同原本の指定頁だけを再描画する。親が prepare の固定 manifest と再照合する前提で、renderer 内に原本 identity や cache を持ち込まない。
- PDF.js 6.3.289 は `@repo/core/package.json` anchor から解決し、canvas はその dependency resolution を使う。固定 `cmaps/standard_fonts/wasm` は解決された PDF.js 配下だけ。source/dist の実解決は未検証であり主担当へ残す。
- 144 dpi、白背景、CropBox/既定 rotation、display intent、Square＋AP の限定 annotation 方針を移植した。form/action/attachment/OCG を拒否する。空 Order の OCG も group iterator で拒否する。raw name の hex escape は拒否検査前に復号する。一般 PDF 互換性や任意 feature の網羅保証ではない。
- 長辺 1728 px、3M px、32 頁、4 MiB/PNG、総 PNG 64 MiB、頁 10 秒、全体 120 秒を検査する。3M px は長辺制約に包摂される。切抜き・縮小・頁省略で上限を回避しない。
- render cancellation、encode settle、page cleanup、task.destroy、残る operation Promise の settle を待つ。race の rejection や timeout 発火だけを終了証拠にしない。解放不能なら親が unknown として保持する必要がある。
- console warning 捕捉は単一 request の child だけで行う。renderer 自体には global console hook がなく、単独呼出しだけで warning0 を保証しない。child は library import から page cleanup/task.destroy、binary 送出、beforeExit まで引数を保存せず warning 有無を保持し、最後に metadata を返す。late warning で binary が既に送出されていても失敗 metadata を優先し、親はそれを破棄する。
- child で fetch/http/https/net/tls/dns の Node API を拒否する。OS network sandbox や任意 native code の通信不可という保証ではない。固定 local PDF 資材以外の任意 font/resource を許可しない。

PNG の native encoder 内部 buffer/RSS は 4 MiB の硬保証ではない。固定 pixel 数の canvas を encode し、返却 PNG サイズを検査する境界である。native encode が取消で即終了する保証もせず、その Promise settle と child 実終了を別に待つ。

## 未実行の 17 代表

| 代表 | 期待 |
| --- | --- |
| text/vector/blank 3 頁 | 全 ordinal、600×800、prepare binary0 |
| 同 3 頁の redraw | 各 metadata/hash/PNG bytes 一致、白紙末尾も含む |
| image/mixed/columns | 3 頁を順序付き raster として保持 |
| rotation/CropBox/Square AP | 800×600、520×680、AP 付き頁を保持 |
| 末尾 stream fault | CORRUPT、部分 manifest/binary0 |
| 末尾 width over | RESOURCE_LIMIT、全体拒否 |
| 1728 px exact | 解像度を落とさず 1728×20 |
| AP 欠落 | UNSUPPORTED |
| action | UNSUPPORTED |
| OCG（Order 空） | UNSUPPORTED |
| AcroForm | UNSUPPORTED |
| encryption dictionary | ENCRYPTED、raw exception0 |
| 32/33 頁 | 32 small pages 成功、33 は RESOURCE_LIMIT |
| malformed bytes | CORRUPT、有限 metadata のみ |
| 存在しない redraw 頁 | UNSUPPORTED、binary0 |
| 非 canonical ordinal | library 作業前に UNSUPPORTED |
| pre-aborted inspect/redraw | UNAVAILABLE、呼出元 console 不変 |

合成入力は 14 形、memory のみで保存原本0。試験 helper は各入力 64 KiB 以下、累計入力 2 MiB 以下、送受累計 64 MiB 以下、child 同時 1 の guard を持つ。原本/PNG/hash の assert deep diff は行わず、finite code/count/boolean だけを比較する。未実行なので正確な入力/派生実 bytes は未計測。

自己 child は stdout/stderr/fd3 を有限消費し、process close＋4 pipe close を待つ。test-only 15 秒の timeout は既知自己 child への SIGTERM を一度要求するための上限であり、timedOut は必ず失敗条件。OS 既定 signal kill を正常 renderer cleanup と扱わない。child/pipe が未終了なら pending を残し次の child admission を拒否し、未知 PID 操作・SIGKILL・timeout 成功化は行わない。通常 abort handler による render/encode/destroy settle と親 unknown 保持は主担当の実検証へ残す。

頁 10 秒/120 秒の実期限、4 MiB/64 MiB encode 実限界、late cleanup warning 注入、遅い encode/pipe、native close 不明、最大原本負荷、配備/source-dist、実モデル/品質は今回の 17 代表で実証したと扱わない。特に renderer warning 境界と real close は静的 candidate の段階である。

## 参照・適用範囲

`CLAUDE.md`、goal-implement/manager-loop、PDF SKILL/REFERENCE、採用 design の P5b-3a1 節、phase/proposal と固定 C/E/G を確認した。技能は独立受入との分離、担当 path 限定、PDF local 処理の境界に適用し、禁止された spec/spec-implement・goal API は使用していない。

主が regular/no-symlink/size 再照合して新 P に copy した公開 gate の `pdf-child.cjs`、`pdf-probe.cjs`、`fixtures.cjs`、`common.cjs` を静的参照した。P は `/Users/hikaru/.local/share/hollow/verification/p5b3a1-pdf-20260929-1Vnk1D`。旧 G/R/proof の読取・実行・書込は0。新 P の PDF 原本本文/hash も読み出していない。既 `documentPdf.mjs`、`imageChild.mjs`、公開型/依存 declaration は読取のみ。

既 strict2/documentPdf、単画像3、親 manifest/identity、classifier は未編集。実装候補の検証・受入は主の最新統合 source に対して別途行う必要があり、過去 gate の成功をこの新実装へそのまま移していない。

## 全停止

3 製品 path と本報告を EOF まで静的再読して所有を返却する。Node/test/type/Biome/format/build/native/DB/runtime/browser は全未実行。静的 read の不存在 declaration は有限 read error のみで、共有 path を代作していない。未回収 exec0、生成自己資源0。本報告を含む全 read/write/run を停止し、以後の変更・検査は主担当の統合所有下で行う。
