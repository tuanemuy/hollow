# P5c-1 S2 auth browser 参照 pin

## 範囲

2026-09-29。主 Implementer の実装補助であり、独立 Verifier の受入結果ではない。採用 design の Drive S2 browser pin、[保存契約](P5c-1-s2-storage.md) と現公開 source を静的照合した。

変更は次の既存 2 path と本報告のみ。

- `packages/core/src/adapters/libsql/repositories/authBrowserRepository.ts`
- `packages/core/src/adapters/libsql/__tests__/authenticationPrune.integration.test.ts`

製品差は authBrowser context 削除候補の `NOT EXISTS` に `drive_authorization_attempts.browser_hash` と `drive_control_operations.browser_hash` の 2 参照を追加したことだけ。phase・epoch の一致を pin 条件にせず、terminal 後も browser 参照が残る限り保持する。Drive 側の正規 24h context scrub 後に既 auth prune の候補となる。

session / Google / OpenRouter の既存参照、retainUntil の厳密比較、生存 epoch、expired bound session の先行削除、context との合算最大 100、並び順、各 repository API は不変更。Drive schema / domain / repository / fixture / application は変更していない。

## 静的に作成した 8 対

| ID | 対象 | 期待 |
| --- | --- | --- |
| AP-1 | 既 browser cookie | ensure で epoch を戻さず、延長した保持期限後だけ回収 |
| AP-2 | 既 session / context | 2 件 budget の合算、legacy 行全値不変、active session 保持 |
| AP-3 | 既 Google exchanging | 固定期限前保持、期限後に protected material と試行を削除 |
| AP-4 | Drive attempt | pending / failed / browser epoch 進行でも pin、terminal+24h 直前不可、境界でも scrub 前不可、正規 scrub 後に context 回収 |
| AP-5 | Drive folder-create control | queued / failed の同じ境界。失敗履歴と terminalAt は scrub・browser 回収後も保持 |
| AP-6 | Drive + Google | Drive scrub 後も Google 参照を保持。Google の正規期限回収後のみ browser 回収 |
| AP-7 | Drive + OpenRouter | Drive scrub 後及び OpenRouter expired→failed 後も pin。既 OpenRouter 24h receipt 回収後だけ browser 回収 |
| AP-8 | 合算上界 | 99 expired bound sessions と 2 free contexts、Drive pin 1。budget 0 は削除 0、1000 指定でも初回 100・次回 1、Drive context は残る |

既 3 対を含む合計 8 対。追加 5 対の期待を旧 3 対の成功実績へ合算しない。全値比較が必要な legacy 行は boolean 比較とし、合成 token / envelope の assertion diff を出さない。新 Drive 行は型付き fixture と正規 insert / prune を使い、terminal / context を直接 SQL で偽装しない。Google prune の `expiresAt < now` と Drive / OpenRouter の期限境界を区別する。

## Fixture と実行引渡し

Manager・主の許可に従い、この test file の lifecycle だけを既 `driveFixture` へ差し替えた。`driveFixtures.ts` は主所有・非編集。fixture 初期生成の未参照 browser 1 件だけを専有 beforeEach で除き、旧 3 対の初期 context 集合と件数期待を維持する。旧 account seed と相対時間条件を保ち、時計の基準日だけ Drive の固定 fixture 日へ合わせる。

主の実行時には `DRIVE_TEST_ROOT === path.join(TMPDIR, 'db')` の専用空 root が必要。既 fixture の逐次 active 1、残存 / failure 後の新生成拒否、DB/WAL/SHM 16MiB、FK 検査、client close、正常時だけ exact 自己ファイル cleanup を利用する。テスト失敗時は close 後に自己 DB を保持する。一般 auth helper や他 test の lifecycle は変更しない。

本補助は静的読取・apply_patch のみ。Node / Vitest / typecheck / Biome / formatter / migration / DB / runtime / browser / 外部 API は未実行。従って 8 対の pass、FK 0、実容量、実 close / cleanup は未検証。主が統合した現 schema / fixture で型・限定 DB 対・整形を実行する。Drive held / unknown の実所有や全 application 回収 loop、HTTP 認証を本対だけで証明しない。

## 返却

専有 source 2 path と本報告を全文静的再読して返却する。自己 DB / process / Worker / handle は生成 0、未回収 exec 0。返却後は本報告を含む全 read / write / run を停止し、主と Manager に所有返却を通知する。
