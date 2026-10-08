# P4d-2-E PDF activity 純粋モデル補助

最終記録: 2026-09-20T08:22:56.000+09:00（clock実測）。限定pure実装候補であり、provider・HTTP・実PDF・フェーズ全体の受入報告ではない。

## 変更と契約

製品変更は `apps/web/app/components/pdf/activityModel.ts` と `activityModel.test.ts` の2ファイルのみ。既存PDFパネル3ファイル・共有DTO・管理正本は変更していない。goal-implement / manager-loop全文を確認し、spec/spec-implementは使用していない。

主担当と合意したexportは次のとおり。

```ts
type PdfActivityState = Readonly<{
  watch: ReadonlyMap<string, number>;
  turn: readonly string[];
}>;
type PdfActiveRow = Pick<PdfJobView, "id" | "version">;
type PdfWatchedRow = Pick<PdfJobView, "id" | "version" | "state" | "title">;

observeActive(state, rows): PdfActivityState;
nextWatch(state): { state: PdfActivityState; requestedIds: readonly string[] };
applyWatched(state, requestedIds, rows): {
  state: PdfActivityState;
  notifications: readonly PdfWatchedRow[];
};
```

実署名は各入力・戻り値をreadonlyで定義した。job状態は既存 `PdfJobView["state"]` とその元の `PdfRequest` unionを読取再利用した。

- observeActiveは既存順を保持し、新IDだけ末尾へ追加する。既存versionを下げず、scan pageにないwatchを削除しない。
- nextWatchは先頭最大50件を返して末尾へ回す。watch総数を50件へ切り詰めない。
- applyWatchedはrequestedかつ現在watch中のIDだけを扱う。低version応答はactive/terminalとも不採用で、missingともみなさない。activeはversion更新・保持、terminalは除去・通知、missingは除去のみ。
- requested外の行は無視し、requested外のwatchは維持する。重複IDのrequestedは一度扱い、重複responseは最高versionを採る。同ID同versionは先行行を保持する。通常HTTP DTOは一意IDの現在行を返す契約である。
- 各操作で入力Map・配列・response行を変更しない。削除後の同じterminal応答を再適用しても通知しない。初回未監視terminalを一斉通知しない。

## 検査

| 実行 | 結果 |
| --- | --- |
| `pnpm exec vitest run apps/web/app/components/pdf/activityModel.test.ts` | 2026-09-20T08:21:48+09:00、1 file / 13 tests passed |
| `pnpm exec biome format --write apps/web/app/components/pdf/activityModel.ts apps/web/app/components/pdf/activityModel.test.ts` | 専有2ファイルだけ整形 |
| `pnpm exec biome check apps/web/app/components/pdf/activityModel.ts apps/web/app/components/pdf/activityModel.test.ts` | 2 files、exit 0 |

テストは51/101件の公平性、空/小集合、新規追加、重複・単調version・missingのrequested範囲・全終端状態・通知再適用・入力非破壊を対象とした。全体型チェック、provider統合、HTTP/DB/runtime、ブラウザー、Chrome/PDF生成、ネットワーク、全suiteは実行していない。

## 親providerが所有する境界

actor変更ではStateを破棄する。actor/epoch/operation fence、単一flight、初回active scanとwatched応答の採用順は主担当が所有する。主担当から、受理receipt/確定terminal採用時にprovider revisionを進め、開始時revisionと異なる古いactivity response全体を不採用にする方針を受領した。HTTP同Txのactive page/watchedを直列採用する。

この固定モデルのrequestedIdsだけでは、GET開始後に別操作が更新した同IDに対する古いmissingを識別できない。上記provider fenceで整合を保証し、pureモデルへ無期限tombstone・永続通知表・全初回snapshot・新exactly-once条件を追加しない。明示receipt/cached terminalの通知も主担当の別処理である。

整形後の製品2ファイルと本報告を全文確認して所有を返却し、testを含む全操作を停止する。
