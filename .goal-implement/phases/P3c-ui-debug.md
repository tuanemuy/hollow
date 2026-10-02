# P3c hardopen の RSC promise 調査

## 結論

主担当の観測では `ScopedNotesBoard` は未 mount であり、`NotesPage` の `Deferred` に渡る `loaderData.notes` が pending のままである。今回の直接原因を `matchesBrowseLocation`、page seed の参照比較、`BrowsePreparation` に求める根拠はない。外側の deferred promise を解決する SSR serialization と、内側の Flight stream を切り分ける必要がある。

狭い候補は `renderServerComponent` に渡す tree の根へ同期 `Suspense` を置き、その内側に async `NotesFragment` を残す構成。現 RSC decoder は Suspense 内の lazy を待たないため、外側 proxy を先に解決して内側本文を遅延配信する意味がある。主担当へ source 根拠を共有済み。修正成功、失われた serialization script の根本原因、製品合否は未確認である。

調査開始は `2026-09-11T08:09:37+09:00`。source と実参照先 package の読み取り、主担当への一度の観測照会、公式資料の確認、本書の作成だけを行った。主担当は実 browser/環境/製品修正を所有する。本書以外は無変更。DB/storage/browser/server/process/build/test/依存変更/秘密ファイル/goal API の操作はない。純粋再現 script も実行していない。

## 主担当の実観測

以下は主担当から提供された観測であり、本調査で再実行した結果ではない。

- 完全条件の `/notes?query=&tags=%5B%5D&zone=Asia%2FTokyo&layout=list&sort=title-asc` を hardopen すると、SSR HTTP200 には50件の本文があるが、client で外側 `notes` promise が長時間 pending に残る。
- fiber 上で `ScopedNotesBoard` が未 mount。表示は `NotesPage` の Suspense fallback であり、Board の URL guard による skeleton ではない。
- 同 cookie の HTML 取得は49,383 bytes、50件の SSR 本文。script は theme 919 bytes、`$_TSR` initial 2,694 bytes、module import 35 bytes の3本のみで、後続 resolve/Flight script が見当たらないとの報告。
- `/notes` の未確定条件から Preparation→client navigation は57件表示へ進む。表示後の通常 select による title-asc も成功し、同じ URL の hardreload で pending が再現する。
- 検索 child 直 read は695ms成功。signup/save/palette「東京 cloud」→keyboard detail も成功している。

したがって「DB の検索が遅い」「query/tags 省略だけが問題」「常に title-asc が失敗する」とは説明できない。HTTP200 と本文 HTML の存在も、client の deferred promise 解決を保証しない。

## URL と seed の照合

読取対象は [browseInput](../../apps/web/app/presentation/browseInput.ts)、[model](../../apps/web/app/components/browse/model.ts)、[requestState](../../apps/web/app/components/browse/requestState.ts)、[BrowsePreparation](../../apps/web/app/components/browse/BrowsePreparation.tsx)、[ScopedNotesBoard](../../apps/web/app/components/hollow/ScopedNotesBoard.tsx)、[notes route](../../apps/web/app/routes/notes.index.tsx)。

| 論点 | 現 source の意味 | 今回との関係 |
| --- | --- | --- |
| query の key 順 | `browseIdentity` は固定順 tuple を stringify する | URL/object の property 順だけでは不一致にならない |
| 空 query/tags の省略 | route schema が `query:''`、`tags:[]` を補完する | 両側を同 schema で扱えば同じ意味。主担当の完全条件 URL でも再現する |
| URL encode | Board は `location.search` を schema で読む。percent-encoded 生文字列を seed と比較しない | slash の `%2F` などの表記差を理由に guard を緩めない。実 router decode 値の採取は主担当の範囲 |
| tag 順/重複 | schema が dedup/sort、identity も sort | 真に同じ選択集合なら順だけでは不一致にならない |
| zone/layout/sort 未確定 | `NotesFragment` が Preparation を返し、client preference/zone が揃って URL を確定する | 完全条件の SSR Board と外側 pending には該当しない。未確定 zone を UTC 完成表示へ変えない |
| seed object の参照 | `dataSeed` は `useRef(page)`、初回 state も page 由来。新 seed 時は `pageForDisplay(page)` へ fallback する | 初回から server object と client object の参照を比較する設計ではない。Board 未 mount より後の処理 |
| request guard | generation/meaning identity/seed reference/location を現在要求と比較する | A→B→A や invalidate 後の旧応答を防ぐ。今回の外側 promise を解決する役割ではない |

URL 意味の比較と、特定 navigation に属する非同期処理の location equality は別用途である。後者の raw href 差は古い要求を捨てる保守的 guard であり、今回の hardopen 原因を示さない。scope/tag/month/day/cursor を identity から除いたり、旧 seed を新 scope の画面へ採用したりしない。

## renderNotes と hydration の現構造

[renderNotes](../../apps/web/app/routes/-hollow.tsx) は async handler 内で `notes: renderServerComponent(<NotesFragment .../>)` を返し、内側 promise を await しない。[notes route](../../apps/web/app/routes/notes.index.tsx) はその外側 server function response を loader として返す。[Deferred](../../apps/web/app/components/ui/Deferred/index.tsx) は `React.use(promise)` を返す。

これは [既存 todo route](../../apps/web/app/routes/todo/index.tsx) と [todo server function](../../apps/web/app/routes/todo/-action.tsx) の deferred 形と同じである。loader を明示 async にして外側 response だけ await/再梱包しても、`notes` の意味を変える修正にはならない。[TanStack の deferred loading](https://tanstack.com/router/latest/docs/guide/deferred-data-loading) も、loader response に未解決 promise を含める方法を示す。内側 `renderServerComponent` を await して blocking loader へ変える案は採らない。

todo には production の `staleTime: Infinity` がある一方、notes にはない。ただし実参照 `router-core` の通常 SSR hydration は、全 match が SSR かつ lastMatchId が一致すれば `router.load()` を起動せず終了する。よって `staleTime:0` だけで今回を説明しない。Infinity のコピーは current policy の鮮度へ影響するため、この症状への根拠なしの修正にしない。match mismatch/SPA fallback で別 loader が始まる場合だけ、新旧 promise の取り違えを別途照合する。

実参照 symlink は react-start1.167.65、react-start-rsc0.0.44、react-router/router-core1.169.2、start-client-core1.168.2 へ解決した。RSC 側も同じ router-core/react-router/start-client-core を参照しており、別版の存在だけから runtime 二重化を原因とはしない。bundle 内の実行 graph までは検証していない。

## 内側 Suspense 候補の根拠

実参照 package source の該当経路は次のとおり。package は読み取りだけで、実行・変更していない。

- `apps/web/node_modules/@tanstack/react-start/../react-start-rsc/src/renderServerComponent.ts`: router request の SSR 経路では Flight を `ReplayableStream` にし、`await ssrHandler.decode(stream)` 後に renderable proxy を返す。
- 同 `serialization.server.ts`: decode は `await ssrDecode(...)` と `await awaitLazyElements(decodedTree)` を通る。proxy の serialization は `$RSC` adapter から replay stream を `RawStream` として返す。
- 同 `awaitLazyElements.ts`: React Suspense 要素に到達したら再帰を止める明示分岐がある。境界外の pending/blocked lazy payload は待つ。
- 同 `createServerComponentFromStream.ts`: client は別途 Flight decode/lazy を処理し、変換後 tree が未完成ならそこで suspend する。これは loaderData の外側 promise と別である。

提案の構造は次の形。製品への適用は主担当専有である。

```tsx
notes: renderServerComponent(
  <Suspense fallback={<BrowseSkeleton layout={data.layout ?? 'list'} />}>
    <NotesFragment search={data} />
  </Suspense>,
)
```

根を通常の `div` にするだけでは lazy traversal は止まらない。現在ある route 側 Suspense も Flight tree の外にあるため、この decoder の待機境界とは異なる。同期 Suspense なら async NotesFragment の query 待機を内側へ移せる。fallback は有効条件の skeleton のみで、scope 名・件数・本文を推測しない。Preparation のタイムゾーン確定と、Board の current scope/response guard は保持する。

これは外側 root promise が遅く解決する場合と、早く解決して child Flight が後続する場合を切り分ける局所候補である。元の deferred serialization 自体の不具合を解消したとの証明ではない。内側境界を加えても後続 Flight が欠ければ、本文表示は引き続き解決しない。[公式 Server Components 資料](https://tanstack.com/start/latest/docs/framework/react/guide/server-components) は RSC を experimental としており、最新版の例だけで現固定版の成功を主張しない。

## 未確定の原因候補と主担当の次の確認

優先候補は SSR serialization の後続出力が発行されないか、stream へ注入されない経路である。`router-core/src/ssr/ssr-server.ts` の `crossSerializeStream.onSerialize` は scriptBuffer へ追加し、`onDone` は終端を enqueue/flush する。一方 `onError` は serialization error を記録して完了を通知する。既に初期 payload で pending とした client promise を、この分岐だけで reject する処理はない。遅い値の serialization error は、SSR 本文あり・外側 promise pending の組合せを説明し得る。ただし実際の error 発生は未確認。

`transformStreamWithRouter` は serialization 完了/HTML buffer/stream 終了を別に扱う。後続 script 欠落だけから request abort、CSP、transform timeout、adapter error のどれかを断定しない。HTTP本文の全scriptに resolve がないという主担当観測は、単なる CSP 実行拒否より生成/注入側を先に見る根拠になる。機密を含む raw serialized payload 全体をログへ出す必要はない。

主担当が既存の観測手段で進める場合の狭い順序を提案する。新しい合否 gate ではない。

1. 同期 inner Suspense 候補で、外側 notes promise の解決と内側本文の到着が分離するか、完全条件 hardopen と client navigation の同 URL で確認する。script 本数だけで成功にせず、Board mount と操作まで見る。
2. 失敗が残る場合、同 request の serializer error 有無、initial/resolve/RawStream/end の発行・注入有無だけを確認する。note本文/session/token を記録しない。外側が fulfilled なのに inner が pending なら Flight decode/chunk へ絞る。
3. hydrated match ID/lastMatchId が不一致の場合だけ、hydrated promise と追加 loader の promise が置き換わったか確認する。URL の語順差を先に原因扱いしない。

Board/URL/Preparation の変更、guard 削除、loader await、設定 route の例外処理コピー、全 query の client fetch への置換は今回の提案に含めない。主担当の source 変更後は、この読取時点の根拠をそのまま修正版へ流用しない。

## 停止

実 UI 再現、修正、test、build、環境計測は未実行。doc-style/markdown-style に従って事実と仮説を分離し、本書を通読後に全操作を停止する。主担当へ返すのは原因の局所化と inner Suspense の候補のみである。
