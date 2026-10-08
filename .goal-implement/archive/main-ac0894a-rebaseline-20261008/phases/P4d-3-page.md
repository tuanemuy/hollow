# P4d-3匿名PDF状態ページ

## 結果

状態ページの純粋rendererと専用unit testを実装した。2026-09-20T12:38:41+09:00の限定unitは31件成功、失敗0件、140ms、exit0。対象2ファイルの最終Biome検査も指摘0・exit0となった。実HTTP、390pxの実画面、keyboard操作、CSP、全体型検査は未検証で、主担当の統合範囲に残る。

変更先は次の新2ファイルと本報告だけである。

- `apps/web/app/presentation/anonymousPdfPage.ts`
- `apps/web/app/presentation/anonymousPdfPage.test.ts`

goal-implement/manager-loopとCLAUDE.mdは同日の前委譲で全文確認した同版を適用する。brief.mdの匿名PDF節、design.mdの匿名接続判断、現在の`application/pdf/anonymousUsecases.ts`を読み、固定unionとの一致を確認した。spec/spec-implementは使用していない。前委譲の署名器2ファイルは変更していない。

## 接続契約

`renderAnonymousPdfPage(status, links, busy?)`は固定`PdfAnonymousStatus`をtype importし、完全HTML documentと`refresh: { seconds: 2, path } | null`を返す。HTTP処理、時刻、DB、I/Oは持たない。linksは主担当が検証したrelative内部pathに限定する。rendererはURL認可やroute検証を代行せず、HTML属性と文字列のcontextをescapeする。Refresh用pathはHTML escapeせず、そのままHTTP担当へ返す。

| 状態 | busy | Refresh | 主な操作 |
|---|---|---|---|
| expired | 任意 | null | 元画面へ明示的に戻る |
| failed | 任意 | null | 固定説明と元画面への明示的な戻り |
| pending | 任意 | 2秒後status | 状態の手動確認 |
| ready・automatic=false | 任意 | null | manual POST。busyでもボタンを残す |
| ready・automatic=true | false | 2秒後receive | 自動受取の案内とmanual POST fallback |
| ready・automatic=true | true | 2秒後status | 取得処理の待機理由とmanual POST fallback |

expired/failedはフォーム、取得先、状態照会、期限metadataを追加しない。ready・automatic=falseではbusyでも自動受取とpollingを復活させない。終端やlatchの優先順位はbusy表示より上に置く。

failureは既知の内容変更・制限時間・取消・混雑コードだけを固定の一般説明へ写像する。未知コードは同じ一般説明にし、任意のfailure文字列を表示しない。タイトル、本文、token、秘密を新たな表示項目にしない。リンク先は属性だけに使い、URLそのものを表示しない。

公開・共有画面からのPDFは、サインイン中も同じbrowserでの期限付き取得となり、処理履歴に追加されないと明記する。自動受取開始を端末保存完了とは表示しない。

## HTMLと分担

lang=ja、charset、viewport、main/h1、通常anchor/button、focus-visible、44px以上のbutton、折返しと可変幅を持つ。静的inline styleだけを使用する。script、event handler、meta Refresh、外部asset、別の自動処理は出力しない。

主担当はinline styleを許すHTTP CSPを接続する。Refreshヘッダ送信、現在期限と認可の判定、busy時のlatch未消費、manual POSTの検証、native attachmentは主担当が所有する。rendererの返値だけでは自動取得の実成立を証明しない。

## 検証

実行コマンドは対象限定である。

```text
pnpm exec vitest run apps/web/app/presentation/anonymousPdfPage.test.ts
pnpm exec biome check apps/web/app/presentation/anonymousPdfPage.ts apps/web/app/presentation/anonymousPdfPage.test.ts
```

31件は状態5枝×busy有無の10組、busy省略、完全document、終端非消費、latch済みmanual-only、自動受取fallback、busy待機、HTML属性と期限textのescape、固定failure説明、未知failureの非表示、Date.now非依存を含む。過去時刻のpendingをrendererがexpiredへ置換しないことも確認する。

初回の限定`biome check --write`はglobal名`escape`のshadowを1件検出してexit1となった。helperを`escapeHtml`へ変更し、最終read-only検査は指摘0・exit0となった。unitの失敗はない。Vitest成功を全体型検査成功とは扱わない。

## 未確認と返却

390px実描画、focus移動、Space/Enter、ブラウザnative取得、2秒HTTP Refresh、CSP、期限/認可喪失、実latch/slot競合は未検証である。DOM/CSS文字列の検査を実画面の観測と扱わない。

DB、鍵、製品runtime、browser、Chrome、build、依存、git、既存proof、秘密、管理正本は操作していない。専用fixture fileは作らず、unitは固定文字列だけを使う。readと検証は1execずつexitまで回収し、無出力待機中に重複起動や中断をしていない。未回収execは0本である。

製品2ファイルと本報告の全文確認後、主担当へ所有を返却し、文書を含む全操作を停止する。全体checksと統合commitは主担当が所有する。
