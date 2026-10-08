# P5b-2a identity限定結合テスト

## 結果

限定Nodeテスト5対がすべて成功した。対象はP5b-2a-E/Fと、P3a-D・P3b-1-C/D・P2c-1-Aへの新LLM呼出元の直接影響である。製品変更、不具合検出、外部通信は0。本報告は実装側補助の根拠であり、独立受け入れではない。

対象は[llmIdentity.integration.test.ts](../../packages/core/src/adapters/libsql/__tests__/llmIdentity.integration.test.ts)。主担当がbuild18906以後のcore変更0を通知し、本検査中も共有製品を固定した。Vitestはソースを実行しており、build18906の配布物・HTTP・実UIを実行した根拠ではない。

## 検査範囲

| 対 | 対象 | 期待と実結果 |
| --- | --- | --- |
| 1 | E、P3a-D、P3b-1-C/D | fake生成応答を保留し、正規changeWorkspaceMemberでeditorを除名。現在要求はNOTE_NOT_FOUND。issueInvitations→copyInvitation→beginInvitation→joinInvitationでeditorへ再参加しても旧cancelGeneration=1を保持し、遅い旧応答はcancelled・本文/版不変。明示新要求だけ成功し、累積消費2を保持 |
| 2 | E、P3a-D、P3b-1-C/D | 実cancelScopeActorのDB更新後に合成ConflictErrorを返す。roleと対象LLM/job行は元に戻る。別actorの同WSと同actorのpersonal行も不変。その後の正常除名は対象だけをfenceし、兄弟2件を変更しない |
| 3 | F | 正規公開操作・タグ付与後の生成はtitle/style/tag/public ID/link hashを保持。生成後にタグを追加し公開から限定へ変更しても、直後undoは元本文だけを復元し現在title/style/owner/creator/tag/visibility/public identity/共有設定全体を保持。消費は1のまま |
| 4 | F、P2c-1-A | 同値保存でbaselineを確立し、同じ本文の生成と同値undoを実行。revision集合を増やさず、本文を保持し、生成消費1は返却しない |
| 5 | F、P2c-1-A | 19回の小本文保存で現在を含む20版を確立。LLM成功後はrevision2〜21、undo後は3〜22の20件。undo最新版はrestore/from20で、直前本文を復元 |

対3のtitle/styleは生成前から現在値として保持する。生成後の通常title/本文変更によるundo拒否は既control対の別根拠である。生成後のstyle変更対は本検査では実行せず、現在版guardを迂回しない。同値対は履歴revisionの不増を検査し、内部note.versionが増えないとは主張しない。

## 実部分と代替部分

- 各対でcreateTestContainerによる自己file-backed libSQL DB、最新migration、自己mkdtempの小原本を使用する
- 実CoordinatedObjectStorage・FileObjectStorage・NodeLlmSourceReader・NodeLlmExecution・NodeLlmResultProcessor・sanitizer・worker・commitNote・revision repositoryを使用する
- account/session/OpenRouter linked状態と開始時のWS membershipは正規repoで作る合成fixture。除名と再参加は正規usecaseを使用する
- source preparerは固定1segment、profile/generator/OpenRouter/runtime ownership/invitation protector/share protectorは合成port。実LLM、暗号、メール配送、実SourceWorkerの証明ではない
- 取消ABAのgeneratorはabort後も遅い応答を返す合成deferred。afterEachで必ず解除し、execution.stopの実Promise終端後にDBを閉じる
- rollbackは実repoを呼んだ後だけ故障注入する。Txを別のfake UoWへ置き換えず、libSQL rollbackを検査する
- 本文は小HTML/text、媒体なし。asset pinと原本raw媒体対応は既[媒体結合報告](P5b-2a-media-tests.md)の別根拠とする

## 実行

2026-09-28T06:21:09+09:00開始、2.25秒、5/5成功、exit0。session92023は終端まで回収済み。初回失敗・再実行はない。限定Biomeもexit0、1ファイルを整形した。

```bash
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/llmIdentity.integration.test.ts
pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/llmIdentity.integration.test.ts --fileParallelism=false
```

主担当の通常環境停止・保全とNode枠移譲を受けた後だけ実行した。主のNode/formatter/buildとの並列実行はない。全体型検査・全量Node・build・ブラウザは未実行。

## 回収と返却

5対ともexecution.stop後にFK違反0・active object_writes0を検査し、自己DBをcloseし、当該mkdtempだけを回収した。未回収exec、自己deferred、execution、FD、DB、tmpは0。所有不明を通常closedへ変換する処理はない。

対象テストと本報告の全文を確認し、2pathの所有権を主担当へ返却する。製品・既存テスト・共有fixture・管理正本・fresh・旧proof・秘密は非変更。全文確認後は文書を含む全操作を停止する。
