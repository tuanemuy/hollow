# P5c 保存先フォルダの永久削除判別

確認日: 2026-09-30。対象は IN05 の「永久削除と確認できた保存先だけ自動再作成」と、採用済み `drive.file` スコープの両立。Google 公式公開資料だけを確認した。製品・実行・実 API・DB・資格情報には触れていない。

## 結論

確認した公開仕様には、`drive.file` のまま外部での永久削除をアクセス喪失から十分に判別できる根拠は見つからない。`files.get` の 404 と `changes.removed` は明示的に両方を含む。したがって、この観測だけで IN05 の自動再作成条件を満たしたとは扱えない。

これは全公開 API の不可能性証明ではない。今回確認した標準経路に、採用条件内で使える肯定的な永久削除証明がないという限定結論である。

## 公式資料で確認できた事実

| 経路・観測 | 公式仕様 | この要件への判定 |
| --- | --- | --- |
| `files.get` 等の `404 notFound` | ファイルが存在しない場合だけでなく、利用者に読み取り権限がない場合も返る。 | 永久削除を証明しない。[エラー処理](https://developers.google.com/workspace/drive/api/guides/handle-errors#404_errors) |
| `File.trashed` / `explicitlyTrashed` | 自身または親のゴミ箱状態と、自身が明示的にゴミ箱へ入れられた状態を表す。 | 永久削除と区別する。採用済みの確認付き復元・再選択・新規作成の案内を維持する。[Files resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) |
| `Change.removed` | 変更一覧から除外されたことを表し、削除またはアクセス喪失を含む。理由を区別するフィールドはこのリソース仕様にない。 | `removed=true` だけでは永久削除を証明しない。[Changes resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes) |
| `changes.list` | `drive.file` は許可スコープに含まれる。`includeRemoved` は削除とアクセス喪失の両方。`includeCorpusRemovals` は、一覧から除かれても要求時点でアクセス可能ならファイルリソースを含める。 | 変更追跡を導入しても、この仕様から不在理由を一意には決められない。ファイルリソースが付かないことも永久削除証明ではない。[Changes list](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/list) |
| Drive Activity `Delete.type` | `TRASH`、`PERMANENT_DELETE`、`TYPE_UNSPECIFIED` を区別する。 | 永久削除というイベント種別自体は公開されている。[Delete](https://developers.google.com/workspace/drive/activity/v2/reference/rest/v2/activity/delete) |
| Drive Activity `activity.query` | 必要スコープは `drive.activity` または `drive.activity.readonly`。`drive.file` は列挙されていない。 | 現採用スコープのまま使える代替ではない。追加スコープは採用しない。[Activity query](https://developers.google.com/workspace/drive/activity/v2/reference/rest/v2/activity/query) |

## 推論・未確認の境界

- 上記仕様から、連続した 404、以前は取得できた事実、自アプリで作成した履歴、`removed=true`、変更情報やファイルリソースの欠落を組み合わせても、永久削除の肯定的な証明とはしない。
- Drive Activity は別スコープであるため、イベントの可視性・保持・遅延・網羅性が当該保存先の自動再作成に十分かまでは調査・採用していない。種別の存在を、常に取得できる保証へ置き換えない。
- 自アプリから `files.delete` を発行して未知状態を削除確定へ変える案は採らない。外部削除を読み取りだけで識別する今回の目的と異なる。
- 実 Google 環境での挙動検証は 0。公開文書の確認を実接続成功とは数えない。

## Manager が判断する残件

既に決定済みの「削除と権限喪失を区別できない場合は確認して再選択・新規作成を案内」「ゴミ箱と確認できた場合は確認して復元・再選択・新規作成を案内」は変更しない。

その上で、IN05 の永久削除時自動再作成を未完として残すか、現権限を維持して保存先を取得できない場合は常に確認付きとするよう利用者へ仕様判断を求めるかは Manager の判断とする。今回の根拠だけで自動再作成分岐を実装済み・検証済みとしない。追加スコープや新たな自動操作を本資料では承認しない。

作業はこの資料の作成のみ。全文 EOF 確認後、全 read/write/run を停止して返却する。
