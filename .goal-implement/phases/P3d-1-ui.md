# P3d-1 タグ UI 実装補助

2026-09-11 11:37 JST 開始。対象は P3d-1-B/C/D/F の UI と、OR-06/07/08 の確定 server function 接続。独立 Verifier ではなく Implementer 補助である。実装を主担当へ返し、型・試験・実 UI・製品合否は未確認とする。

## 実装内容

- 一覧の tile / list / calendar にタグ追加と個別解除を接続した。既存 tag filter と削除は維持した。tag delta の `useTransition` / `useOptimistic` / error / rollback / invalidate は `ScopedNotesBoard` が所有する。filter から leaf が消えた場合も親にエラーと再試行を残す。
- 詳細の `NoteTags` は現在 DTO の scope / canEdit とタグを使う。現在 detail scope のタグ付き一覧へリンクし、viewer に追加・解除を出さない。本文、編集、履歴、backup、TOC は変更していない。
- `TagPicker` は使用0を含む実 reader に接続した。250ms debounce、最大50件のページ置換、独立した selected / exact、部分一致だけの場合の明示 create を実装した。tag 名の trim / 1〜50 code point を UI で案内し、正規化と現在認可の正本は server に残した。
- 作成中の表示には `pending:` ID を使い、URL / attach / detach に送らない。作成・同名競合後は server の正規 ID / tag 集合へ置き換える。候補 query を変更した瞬間に旧候補を外し、旧 exact を選ばせない。
- `/tags` は `tagRouteSchema` と query / workspace / unusedOnly / cursor を使う。非 await `renderServerComponent` promise → `Deferred` / `Suspense` / `TagSkeleton` を維持した。RSC と現在 URL の意味条件が違う間は操作画面を出さない。
- `TagManager` は rename、同名の `merge-required`、delete、表示中の全関係0件最大50 cleanup を接続した。source / target の revision、通常・trash・purging・total、重複数と統合後件数を確認へ表示する。note を削除しない旨を示す。
- 管理成功後は先頭へ rebase して invalidate する。merge-required と通常失敗では現在 page を invalidate し、確認・理由を保持する。`TAG_CHANGED` は古い確認を閉じ、最新影響の再確認または現在一覧からの選び直しへ戻す。自動再確認・自動書込はしない。
- `TAG_NOT_FOUND` を scope 全体のアクセス喪失と区別した。権限・session・note の喪失では操作 UI を閉じる。read timeout / busy は未結果と再試行であり、候補不存在や成功へ変えない。

## 変更 path

専有製品 path は16ファイル。既存ファイルは担当した責務だけを変更し、主担当の変更を保持した。

| path | 変更 |
| --- | --- |
| `apps/web/app/components/hollow/ScopedNotesBoard.tsx` | 親 tag mutation、filter membership projection、picker、管理入口 |
| `apps/web/app/components/hollow/NoteList.tsx` | 3表示の追加/解除 callback、作成中 ID のリンク拒否 |
| `apps/web/app/routes/notes.$noteId.index.tsx` | 既存タグ表示を `NoteTags` へ接続 |
| `apps/web/app/routes/tags.tsx` | 検証済み URL、非 await RSC loader、fallback / error |
| `apps/web/app/routes/-tags.tsx` | `renderTags` server bridge |
| `apps/web/app/components/tag/model.ts` | 純粋な tag delta、page AND filter 反映、現在 page への rebase、scope / manager identity |
| `apps/web/app/components/tag/model.test.ts` | pure 11対を作成。未実行 |
| `apps/web/app/components/tag/errors.ts` | tag 単体消失と scope 喪失を分離 |
| `apps/web/app/components/tag/TagDialog.tsx` | native modal、Esc、pending、既存 opener への focus return |
| `apps/web/app/components/tag/TagPicker.tsx` | 有限候補 / selected / exact / create / request guard |
| `apps/web/app/components/tag/NoteTags.tsx` | 詳細の親 mutation と tag link |
| `apps/web/app/components/tag/TagManager.tsx` | 管理 page・確認・楽観表示・現在条件 guard |
| `apps/web/app/components/tag/TagsFragment.tsx` | 認可済み管理 read と scope / discriminant 照合 |
| `apps/web/app/components/tag/TagSkeleton.tsx` | 管理の読込 fallback |
| `apps/web/app/components/tag/TagRouteError.tsx` | 未結果、先頭再取得、個人一覧への導線 |
| `apps/web/app/components/tag/tag.css` | 390px を含む狭幅用レイアウト、modal、focus-visible、chip / candidate / 管理一覧 |

変更した文書は本報告だけ。`index.css` の CSS import、root の tagServerFn / -tags manifest 登録、routeTree は主担当所有である。主担当から CSS / manifest 登録済みとの連絡を受けたが、補助側では変更も実行確認もしていない。

## API と静的な整合確認

[確定 DTO](../../packages/core/src/application/tag/ports.ts)、[domain 型](../../packages/core/src/domain/tag/entity.ts)、[validation](../../apps/web/app/presentation/tagInput.ts)、[server functions](../../apps/web/app/presentation/tagServerFn.ts)、[P3d-1 計画](P3d-1-plan.md) を読んだ。port / DTO の変更は要求していない。

- `readTagsFn` の page / impact を分け、picker は scope / purpose と request generation、追加 page は identity も照合する。候補は蓄積せず最大50件に置き換える。
- `changeNoteTagsFn` へ expectedScope と delta を送り、返却 tags を正本へ反映する。note.version / updatedAt / 本文版へ UI から触れていない。
- `manageTagsFn` は source / target stamp と明示 action を送る。cleanup の readonly target 配列を transport の配列へコピーする。
- board の optimistic tag 反映は、古いクリック時集合ではなく現在の base page のタグから delta を計算する。無関係な他利用者のタグ変更を、rebase 時に消さない構成にした。
- 旧 scope / URL / query の success / catch を新しい画面へ適用しない。finally の busy 解放は所有 token と照合する。条件移動後に旧要求を再開しない。

これらは source の読取と論理確認である。TypeScript、lint、DOM、React 実行で成立を確認した結果ではない。

## 作成した pure test

11対は重複 attach、指定 detach、pending ID、元 page と日時/usage/cursor 保全、filter leaf 脱落と rollback 元保全、calendar 件数、未読込 note 非追加、最新タグへの rebase、AND / unknown filter、trim / Unicode code point、scope、manager の省略 default / 旧条件の区別を扱う。1対が複数 assertion を含む。

test runner、型検査、Biome、formatter は一切実行していない。作成数を成功数として扱わない。

## 修正した論理上の問題と残る確認

次 page で rename が merge-required になった直後に先頭へ遷移すると、統合確認が消える。merge-required は同 page invalidate に限定した。主担当からも同じ経路の指摘を受け、対応内容を共有した。

タグ単体の not found を汎用 browse の access-lost 判定へそのまま渡すと、管理や一覧全体を閉じる。`TAG_NOT_FOUND` を除外し、最新の候補・影響の再取得へ残した。current scope / note / session の失効は別に扱う。

未確認は全体型・import整形・Biome、11 pure test、実 RSC の hard-open / navigate、native dialog と keyboard/touch/focus、390px、50→51境界、他 scope / role 喪失、同名作成競合、filter 脱落 rollback、次 page の merge確認、TAG_CHANGED / unknown応答、cleanup 競合、本文/job/版/pinの保全である。製品の既知欠陥なし・完成合格とは報告しない。規定 format と検証は主担当へ渡す。

## 停止と返却

専有ファイルの実装と本報告以外は変更していない。DB / storage / browser / server / worker / process / build / dependency / test実行 / 型実行 / git / 全体format / 秘密 / 認証helper / 旧temp / goal API / 全体管理文書は操作していない。実行中の自己 process はない。

本報告の全文確認後、文書を含む全操作を停止し、専有 whole files を主担当へ返却する。以後の型修正・format・実 UI 修正は主担当が所有する。補助による再編集は新しい明示委譲を待つ。
