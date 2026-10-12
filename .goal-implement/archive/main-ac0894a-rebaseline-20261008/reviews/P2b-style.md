# P2b-D 表示スタイル独立レビュー

## 結論

2026-09-06 12:06〜12:21:52 JST（Asia/Tokyo）に検証した。P2b-D と今回再オープンした狭い共有境界を合格とする。新たな差戻し事項はない。共有・公開・HTML export の本体接続、P2c の版・三編集モード完成を、この部分受入に含めない。

基準は `spec/scenario/editing.md` ED-11、`import.md` IM-05、`plan.md` P2b-D、`design.md`「P2b-D の表示設定」。`phases/P2b-style.md` 全文を確認した。現在の初回結果・由来・手動優先・終端回収の採用 subset を判定基準とし、完全な CSS cascade / computed style 解析を追加条件にしていない。

| 受入 ID | 判定 | 独立根拠と適用範囲 |
| --- | --- | --- |
| P2b-D | 合格 | 初回装飾判定、blank/default、automatic/user/legacy の説明、pending、手動優先、preview/取消/適用/rollback/reload、keyboard/mobile を確認 |
| P1-B | 合格 | 本体 2 tab で古い本文 editor の保存が現在 user style を保持し、古い detail の style command が最新 title/body/asset を保持。新規白紙の非作成・装飾入力後 default 固定も確認。無変更 V5 loop/退避は前回合格を保持 |
| P1-C | 合格 | original は trusted default CSS のみ除外。detail と HTML preview の両 style で本文 CSS と同じ SVG を保持。sandbox/CSP と初回完成 srcdoc の構成をコード・frame tests・本体 DOM で確認 |
| P1-D | 合格 | clone への実 0006 migration、既存 372 notes / 31 assets の保全・legacy、本体設定の永続化、実 DB command の本人認可拒否と他人 note の UI 非表示 |
| P2a-B/F | 合格 | 初回 conversion の失敗/取消/needs-AI/no-AI、手動変更時の同原本再 schedule、旧結果の拒否を実 DB focused とコードで確認。codec/admission 等の無変更方式は旧根拠を保持 |
| P2b-A | 合格 | 両 style の現在認可済み SVG 表示、統一 frame 入力の影響を確認。全 codec / HTTP Range / 全媒体認可を再試験した判定ではない |
| P2b-C | 合格 | 初回 CSS 終端・手動途中優先・off→on の非再判定、supersession、lease/version/current owner、bounded 回収と DNS 待ち中の新依存を確認。V1〜V4・safe fetch・容量の無変更境界は旧合格を保持 |
| P2b-B、P2a-D 等 | 既存合格を保持 | 挿入/退避・合算容量・codec などの無変更部分。今回の独立挿入は表示確認用の小 SVG 1 件だけ |

## 固定対象・実時刻

- HEAD: `91c68d4de1ea49106dc22a5ac28fa1c0fd5fae6a`。
- 529 files / SHA-256: `dca0be5beea01053f0c8bfeb4028052a7df1b88609eea450b80dc542a59d10de`。
- lock: `7551535b05df8a1b1993219181440f77b442b81cac6a09da795f07cab66543e6`。
- 開始 fingerprint は 12:10:42.021 JST、終了は 12:21:52.369 JST に同値。既存 `fingerprint.mjs` を Node 22.22.3 で実行し、tracked+untracked の実 files を sort・重複排除、`.goal-implement/` を除外して `path + NUL + bytes + NUL` で照合した。
- 最初の独立 clock 採取は 12:06:58 JST。開始側 Node / rg / browser 起動が数分無出力で遅延した。既存 sessions `36619` / `64593` / `77665` を回収し、同じ起動を重ねなかった。以後の実行は復帰した。
- アプリは Node 22.22.3 production `http://localhost:3000`。既存 session `33247` / PID `27981` を再起動・再 build せず使用。
- agent-browser 0.36.0 の専用 session `p2b-reference-independent`、本人の `t1` / `t2` のみ。CLI helper の Node 24.19.0 と production / test の Node 22 は区別する。

## コードレビュー

Domain の `note/displayStyle.ts`、Application の `setDisplayStyle.ts` / `settleDisplay.ts` / `saveNote.ts`、import の結果 commit / cancel / retry、reference の schedule / dependencies / commit、libSQL note repository / schema / migration、reference runner、presentation schema/command/detail、`NoteDisplayStyle` / `NoteContent` / `editorMedia` / NoteEditor の preview 接続を読んだ。

### 初回判定と終端

`hasDecoration` は `prepare` による安全化・budget の後、style 属性と style 要素を別々に走査する。property escape を decode し、既知 declaration の lexer 判定と妥当な var 参照を使う。class・意味要素・空 CSS・custom property 定義だけ・既知無効値を数えない。独立の malformed `var(--x red)`、有効な空 fallback、未解決だが構文上有効な変数、未知 property、局所 grid、除去対象 overlay の対も確認した。

これは宣言構文と安全化結果による判定であり、selector が実際に一致するか、未定義変数の computed value、全 viewport、cascade の結果が視認可能かまで証明しない。未知 property を css-tree の対応外として数えない制限も実装報告と整合する。

初回 conversion は安全本文の装飾を記録し、on の未試行 stylesheet がある場合だけ first reference job に待機を引き継ぐ。結果 commit は該当 kind/jobId の場合だけ一度確定する。失敗・needs-AI/no-AI・取消・HTML 非変更も終端へ進む。通常編集による supersession は記録済み初回判定で interrupted にし、後の on/retry を新しい初回にはしない。user 選択の遅い上書きはない。

### 保存・認可・復旧

style command の入力は ID/style のみ。I/O 前と最終 UoW で現在 account と note 所有権を再確認し、現在の title/html に設定を適用する。通常本文保存は現在 display を継承する。style 変更に伴う conversion の再 schedule は同じ原本情報を引き継いで新 ID/version の job を作り、activeJobId を切り替える。古い worker の active ID/version/lease/current owner 条件を弱めていない。

DNS の I/O は UoW 外。最後に現在本文で参照集合を再計算し、新しい URL を以前の結果で公開確認済みとしない。独立 test では待機中の本文を新たな private 背景 URL に変更し、最新本文/title の保持と、その current 台帳に内部宛て拒否理由が残ることを確認した。テスト用 port の判定であり、実 DNS / socket 接続の再試験とは区別する。

`unsettledDisplays(100)` は repo 側で verified personal owner と終端/消失 job を絞る。UoW 内でも note/account/job の永続関係と状態を再確認する。queued/running、新 lease、user 選択、失効中の所有者を変更しない。独立実 DB の 101 候補は 100→1→0 件で回収し、本文/title/version を変更しなかった。先頭未確認の非飢餓と権限回復は既存実 DB test を独立再実行して確認した。取得・cleanup の guard の代替処理にはなっていない。

### 描画・UI

表示値は `NoteContent` の source identity と `frameDocument` の引数に加わる。original で外すのは trusted default CSS の文字列だけで、CSP/sandbox/asset URL/外部直読の transport 判定/親リンク処理は変更しない。NoteEditor は display preview prop を渡し、前回 V5 の最新入力比較・短い navigation lock・new/stable 退避の保存ロジックを変更するものではない。

`NoteDisplayStyle` は preview と保存を分離し、`useOptimistic` / transition pending / command error rollback / invalidate を持つ。保存後の読取失敗は保存失敗と異なる文言になる。後者の read failure 分岐はコード確認であり、今回の本体故障注入は保存 POST 失敗のみ。

## 独立自動実行

全て Node 22.22.3。合計 55 件の異なる最終成功ケース（29 + 12 + 4 + 10）を今回実行した。同じケースの再実行や fixture 誤りを件数へ足していない。

| 実行 / JST | 結果 | 意味 |
| --- | --- | --- |
| display classifier/domain + editorMedia / 12:11:43 | 29 成功、3 files、706 ms | 初回判定と state、両 style の frame 構成 |
| references.integration の D 関連 name filter / 12:12:56 | 12 成功、21 skip、7.74 秒 | 初回 conversion/CSS、失敗/取消/claim 上限、supersession/手動/認可、復旧/非飢餓、DNS 競合、boot、部分成功・running 取消 |
| imports.integration の狭い共有 filter / 12:13:39 | 4 成功、13 skip、4.47 秒 | corrupt failure、needs-AI/no-AI、owner/version/active job 拒否、旧 retry と手動本文 |
| 新規独立 `independent.test.ts` / 最終 12:12:25 | 10 成功、1.22 秒 | 宣言 subset 8 対、新依存 DNS 競合、101 件 bounded 回収 |

使用コマンドの `node` は既知 Node 22 絶対 path。全体の test timeout を変更していない。

```sh
node node_modules/vitest/vitest.mjs run packages/core/src/adapters/node/reference/displayStyle.test.ts packages/core/src/domain/note/displayStyle.test.ts apps/web/app/components/hollow/editorMedia.test.ts --maxWorkers=1
node node_modules/vitest/vitest.mjs run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/references.integration.test.ts -t 'classifies only|finishes no-HTML|preserves recorded initial|style-only commands|terminates failed|keeps a manually|settles only|excludes an unverified|preserves a body update|boot discovers an initial|initial .* results' --maxWorkers=1
node node_modules/vitest/vitest.mjs run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/imports.integration.test.ts -t 'distinguishes needs-AI|retains corrupt|rejects completion after owner|manual edits when retrying' --maxWorkers=1
node node_modules/vitest/vitest.mjs run --config /tmp/hollow-style-verify.Ql07f6/vitest.config.mjs
```

追加 test の初回は 9 成功 / 1 失敗。Verifier が NoteView DTO を domain Note として seed insert し、owner がないため失敗した。temp test 内で repository から domain Note を読み直すよう修正し、全 10 件成功。製品コードは変更していない。これは製品不具合でも製品の修正後成功でもない。

Implementer の最終全 unit 291 / Node 106 / checks / build / start は借用根拠。全 unit の並列時に無変更 PDF 1 件だけ既存 5 秒 timeout、他 290 成功、その後上限を変えず直列 291 成功という条件を保持する。今回、全 parser と他重処理を並列で再実行せず、製品の実行 deadline 不具合として扱わなかった。migration・本体稼働は後述の独立根拠を持つが、全 build/106/291 の再実行とは称さない。

## 本体 UI・DB の独立根拠

本体には本人の 5 notes / 1 asset を追加した。原文 HTML、CSS は小さい自作 fixture。外部 URL の実送信や可変 W3C stylesheet の再利用は今回行っていない。

| ケース / note ID | 実操作と最終観測 |
| --- | --- |
| blank `01a074b3-999a-74d9-87b1-9bc6739de59f` | 白紙で待機・HTML mode 切替まで 379 notes のまま。装飾付き本文を入力し完了、1 note だけ作成。default/automatic/blank、version 1。original preview は style 要素 0、緑 h1 を保持。取消後 DB の default/automatic は不変 |
| plain import `01a074b5-be43-749c-a068-5711d8f9b336` | class/h1/strong、空 CSS、custom 定義と既知無効色の HTML を UI upload。default/automatic/import、version 1。装飾ありと誤分類しない |
| decorated import `01a074b5-c1fa-73ed-9d17-a157bb22c11d` | grid・color var・escaped color を含む HTML を UI upload。original/automatic/import、version 1。初回説明を表示、本文 p は青 rgb(23,90,166) と緑 rgb(0,128,0)、style 要素 1 |
| 初回 pending の手動優先 `01a074b9-7e78-761c-9a3d-766ab80b2101` | 同 bundle の CSS upload だけ自 tab で保留。実 DB は default/automatic/reference、version 1。別 tab の詳細に「初回の装飾を確認中」、default を明示適用。その後 upload を解放・seal・取得完了。default/user、version 3、CSS の青色・背景・padding を本文へ保持 |
| off→on `01a074ba-68d3-7729-88cc-ad25d1e595ad` | 同じ HTML+CSS を off で UI upload。空 stylesheet marker、default/automatic/import、version 1。詳細の「参照取り込みをオンにする」を操作して成功後 reload。取得済み 1、CSS と trusted CSS の 2 style、青色表示、default/automatic のまま version 2 |

decorated note は本体 2 tabs で次を確認した。tab t1 は detail、t2 は古い HTML editor を維持した。

1. t2 で小 SVG を挿入して version 2。t1 の古い detail から default を適用し version 3。最新本文の asset は保持された。
2. original を読んだままの t2 から新 title/body を保存し version 4。DB の現在 style は default/user のまま。
3. 新 title/body をまだ読んでいない t1 から original を適用し version 5。最新 title `D-INDEPENDENT-LATEST-TITLE` と `D-INDEPENDENT-LATEST-BODY`、同 asset を保持した。
4. default preview の描画を待って、本人 tab の次の POST だけを失敗させた。UI は「表示スタイルを保存できませんでした。保存済みの表示に戻しました。エラーが発生しました」。radio と style 要素数が original / 1 に戻り、DB は version 5 / original のまま。wrapper は一度で自身を解除した。
5. 390×844 で radio の ArrowLeft により default を preview。Tab→Tab→Enter で適用し、reload 後 version 6 / default/user。HTML editor の reload も同設定を反映し、style 要素 2・同 asset の naturalWidth 270・最新本文・退避 key 0。

SVG は asset `01a074b6-89d2-715d-96c9-25e534c94e23`。original の detail/HTML preview は本文 style 1、default は trusted CSS を加えた 2。両方で naturalWidth 270 と本文の青/緑を確認した。sandbox は `allow-same-origin` 単独、script 0、active anchor 0。CSP は `default/script/object/frame/connect/form/base` 閉鎖と同 note asset の具体 URL を維持した。この fixture に悪性 script を UI 注入したものではなく、危険入力の方式は旧検証・今回の frame unit とコードレビューの範囲。

`mobile-preview.png` は Verifier 自身が画像表示して確認した。選択中 radio と focus、取消/適用、未保存 preview の案内、青・緑の本文、追記、gradient の山 SVG が見え、横 overflow は false。縦方向は通常 scroll を要する。初期の locator 自動 scroll で radio が固定 reading bar に覆われた一度は、通常 scroll と viewport 調整後に操作し直した。全機能が無 scroll で見えるとの判定ではない。CLI の `tab 0` は非対応として拒否されたため、取得した stable tab ID `t1` / `t2` へ切り替えた。いずれも製品の保存失敗に数えない。

他 account 所有 note `01a07270-88cc-72c9-9204-3e0205706f4d` を現在の本人 browser で開くと「表示できませんでした」で、本文・style 操作は出ない。command の他人/null token 拒否は今回再実行した実 DB test。公開 viewer 用 UI は未接続のため本判定へ含めない。

旧 note `01a0747a-607c-762e-83bf-a89e36b248a5` は読み取りだけ行った。「既存ノートの設定を保持しています。取り込み時の自動判定ではありません」の表示、trusted style 1、旧 SVG naturalWidth 270、本文 `V5-MEDIA-CONTINUED`、退避 key 0 を確認した。

## Migration・データ保全

`pre-style.db` を read-only で開き、SQLite online backup で自身 temp の `migration.db` を作った。この clone へ実 `0006_graceful_patriot.sql` を適用した。migration は `notes.display` の既定 legacy 列追加だけであり、旧進行 job に初回 pending を設定する更新はない。

clone の 372 notes は全件 default/legacy/complete。旧 title/html/version/updated_at の差分 0、31 assets の全列 EXCEPT 差分 0、integrity_check=ok、foreign key 違反なし。本 production に再 migration はしていない。

終了時も同 backup と本 DB を比較し、旧 note 欠落 0、同 4 列差分 0、旧 372 件が default/legacy/complete、旧 assets の全列差分 0。全体は開始 379 notes / 32 assets / pending 0 →終了 384 / 33 / 0。増加は今回の 5 notes / 1 SVG asset。HTML/CSS 原本と companion は対応する取り込み試験のデータとして保持した。旧原本・backup・storage を削除していない。全 storage object の再 hash はしていない。

0006 SHA-256 は `3defaadcbcea0e0acfba14c88393bd890784af469de3ce6e3b277d330e3e09bb` で実装報告と一致。

## 独立資材

自身の資材は `/tmp/hollow-style-verify.Ql07f6`。HTML/CSS は本確認用の自作小 fixture（CC0）。SVG は前回の自身の CC0 `safe.svg` を読み取り再利用した。`latest.html` は今回作成した同 note の asset URL を含むため、この試験データの存続を前提とする。外部の可変 stylesheet を固定 hash fixture と混同しない。

| file | SHA-256 |
| --- | --- |
| plain.html | `c737e8c94059d42337162a18d7a56bfd83477f4895567f2af43708c8b5cc4c03` |
| decorated.html | `e743268eaeaa2dcac7462555471defa59fd125ed2824e514a32a18f312d9f088` |
| pending.html | `b8646b0d537a7f5f7f94351ac2bec065f3c95e7581f7b7a71b1b210ae2353146` |
| pending.css | `4542eb0b48928862783073456d222597027cffcbfdc32007a529d5ba404a9a66` |
| blank.html | `7ed26b9b2711bba4550c60efb642c4f5a69be60f8f8da43d996ac1ded75984fe` |
| latest.html | `0615320da3a234a47f1422d2a2a5cee4f80703cda17309371dc5f21e912d17a8` |
| independent.test.ts | `422408ab4944ba3aefaf9b1b435b172f4ab01a5671ada973a6e615fd1dfc2219` |
| mobile-preview.png | `f83a2b87b5ad1b01cff333491a2aaa23cc43c3332ef643eb77078aff8fb3bf6d` |

companion 保留は本人 tab の `XMLHttpRequest.send` 2 回目のみ。120 秒の自動解放を持たせ、実際には手動選択後に解除し原本送信を完了した。prototype と hook/timer を復元し、その後 full navigation で `__styleRelease` / `__styleHold` が undefined と確認。失敗 POST wrapper も解除済み。production に遅延・private fetch 例外を加えていない。

## 未検証・引継ぎ

実 production の job を消す・失効させる破壊的な故障注入、全 browser・全 runtime・全 computed CSS・全 media/Range/codec/容量の再証明、共有/公開/export 本体、P2c は今回未実施。永久 pending・missing job・権限回復の実証は一時実 DB tests、boot は focused runner test であり、production を故障させた根拠ではない。初回 CSS 部分/失敗/上限/取消の全枝は focused DB 根拠とし、全枝を本体 UI で重ねたとは扱わない。

12:21:52 JST に専用 browser の両 tab を close 成功。全自己検査 exec 回収済み、追加 listener なし、wrapper/timer 復元済み。HAR・Cookie・認証 body の export なし。コード・依存・設定・管理直下 file・goal は変更していない。manual-test の操作/観測を使い、Manager 指示に従って global cleanup・他 browser・production 停止・Issue 起票を行わなかった。報告の判定と証拠は markdown-style に沿って分離した。

production は session `33247` / PID `27981` のまま保持。backup `/tmp/hollow-style.fmPmfD/pre-style.db` と既存 backups は保持。全コード・環境・browser 操作を停止し、Manager へ所有を返却する。
