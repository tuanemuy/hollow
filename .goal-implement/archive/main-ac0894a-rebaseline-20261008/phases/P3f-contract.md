# P3f ワークスペース削除の共有契約案

2026-09-11 10:08 JST 開始の読み取り専用調査。対象は WS-10 と関連する JB、所有・回収契約である。製品実装の開始、P3c 固定候補の検証、追加受入条件ではない。観測対象は現在の source であり、候補 commit の内容一致を git で確認していない。

## 結論

ワークスペースの不可逆な論理失効と、資源回収の完了を別状態として扱う案を推奨する。削除を受理した同 UoW で現在アクセス・新しい処理・旧結果採用を失効させる。回収はその削除 intent に束縛した内部処理として継続し、旧 membership を権限根拠にしない。

回収対象は削除受理時点でその WS に所属する note と、その WS が現在所有する資源である。既に移動済みの note、他 scope の共有 companion 保持、移動済み資源を旧 creator / uploader / job の WS から引き戻さない。容量は writer 終了と実削除確認まで必要な所有行に残す。

Manager の主判断は、全 note の同期更新か scope fence と有限 admission か、回収負債だけを保持する tombstone の形である。以下の提案は未採用・未測定である。

## 原文・採用済み契約

| 出所 | 維持する意味 |
| --- | --- |
| [WS-10](../../spec/scenario/workspace.md#ws-10-ワークスペースを削除する) | 現在 owner が WS 名を入力して確認する。note・tag・membership・公開ページを削除する。全メンバーがアクセスできなくなり個人文脈へ戻る。公開・限定 URL は not found。変換・backup 等を取消す。取り消せない。事前の note 移動を案内する |
| [JB-01〜03](../../spec/scenario/jobs.md) | 本人だけの90日履歴、取消は理由のない独立状態、削除による関連 job の自動取消、削除済み対象への通常 retry 不可。通常取消では実行済み結果を残す |
| [P2d 回収設計](../design.md#p2d-ゴミ箱と完全削除) | 不可逆 fence、共通 object claim、writer 収束、実削除前の容量保持、物理成功の先取り禁止。回収 intent と90日表示履歴の寿命を分離する |
| [P3 Q2/Q3](../design.md#p3-の所有と容量の接続条件) | 現在の所有 provenance、scope ごとに companion 全量を一度計上、他 scope が保持する間は物理削除しない。最後の保持を外した後も一意 cleanup 所有へ charge を残す |
| [P3d 単一移動](../design.md#p3dのタグ書込管理と単一移動) | 両側 current edit と所有世代、note/version、tag、容量の同 UoW。移動済み note の物理 key / creator / 公開 identity を保持する。P3d-2 は未実装の依存 |
| [P3e 固定集合](../design.md#p3eの選択と一括操作) | OR-09 は最大500の明示 ID と対象別 job。WS 全体削除に500上限を移さない。対象別結果・receipt は接続候補であり、P3e 未実装を完成済み基盤と扱わない |
| [P4/P5 と brief](../brief.md) | 現在 lifecycle / 認可と URL / artifact / credential を分離する。公開と Drive の実接続は後続であり、今回の準備で提供済みにはしない |

WS-10 の確認は「その時点の WS 全体」に対する不可逆操作である。OR-09 の検索結果 snapshot や P2d のゴミ箱だけに対象を狭めない。active / trashed / 既に purging の note、使用0の tag、未完了予約や icon も処理対象の分類に含める。

## 現在の source と接続差

- [Workspace 型](../../packages/core/src/domain/workspace/entity.ts) と [schema](../../packages/core/src/adapters/libsql/workspaceSchema.ts) は `active | deleted` を持つ。name / description / slug / creatorId と membership 行は別である。削除受付・回収状態の型は未提供である。
- [WorkspaceRepository](../../packages/core/src/domain/workspace/ports/workspaceRepository.ts) は削除 command を持たない。[実装](../../packages/core/src/adapters/libsql/repositories/workspaceRepository.ts) の `role` / `list` は active WS を join するが、`find` は deleted 行も返す。全入口が `find` だけで許可してよいとはいえない。
- [現在認可](../../packages/core/src/application/workspace/access.ts) は `role` へ接続し、[owner 確認](../../packages/core/src/application/workspace/membership.ts) は active と現在 owner を検査する。通常の脱退/除名にある最後の owner 制約を、WS 全体削除の membership 除去へ流用しない。
- `cancelActorJobs` は現在 WS 所属 note の conversion / reference を actor ごとに取消す。WS の全利用者・未 bind 資源・後続 P3e/P4/P5 job を一括で扱う port ではない。全メンバーを JS に集めて反復する代替にしない。
- [beginNotePurge](../../packages/core/src/application/note/purge.ts) は trashed と trash operation ID、manual の現在 edit を前提とする。[PurgeIntent](../../packages/core/src/domain/purge/entity.ts) の cause は manual / expired だけである。WS 論理失効後の回収には、そのまま使えない。
- [PurgeRepository 実装](../../packages/core/src/adapters/libsql/repositories/purgeRepository.ts) は共通 claim / writer 待ち、最後の bundle 関係、job snapshot 移送を持つ。Q2/Q3 の移動後 provenance と WS tombstone の完成済み実装ではない。
- [ObjectOperationRepository](../../packages/core/src/adapters/libsql/repositories/objectOperationRepository.ts) の icon owner は active WS を見る。note 系は主に note lifecycle / job state、未 bind upload は自身の状態を見る。WS state だけの変更で全 writer の register / publish が失効するとは、この source からは言えない。
- [icon repository](../../packages/core/src/adapters/libsql/repositories/workspaceIconRepository.ts) の `fence` / `finishCleanup` は current icon として参照されていないことを要求する。削除時に pointer を外す必要がある。icon 行には出力・予約・writer の provenance を残す。
- [invitation port](../../packages/core/src/domain/workspace/ports/invitationRepository.ts) と [icon port](../../packages/core/src/domain/workspace/ports/workspaceIconRepository.ts) は issuer / actor 単位の失効を持つが、WS 削除の専用入口はない。配送側の現在 role 確認だけで、秘密 envelope の即時失効や全種別回収を実装済みとはしない。
- [容量 SQL](../../packages/core/src/adapters/libsql/repositories/scopeCapacityRepository.ts) は note / draft / reservation / reference / icon / companion を集計する。note 不在時の旧 WS fallback と、移動後の明示 personal 所有を区別する Q2 の接続は P3d-2 依存として残す。

## 提案: 不可逆な受理境界

確認 UI は現在認可済みの WS 名と削除される種類を表示し、先に移動できることを案内する。入力は現在の保存名との一致で検査する案とし、tag の幅変換や case folding を借用しない。確認中に改名された場合は更新した名前で再確認する。icon 等の無関係な設定変更だけで再確認するかは必須ではなく、最小案は current name と現在 owner の検査である。

削除受理は同 UoW で次を確定する案とする。

1. session / account、WS active、現在 owner、確認名を照合する。二重送信は同じ削除 receipt へ収束させ、非所有者に削除の内部情報を返さない。
2. WS を不可逆に deleted にし、削除 intent と再開可能な回収状態を記録する。現在 membership と招待からのアクセスを失効させる。後から owner を残して復活できる状態を作らない。
3. 対象 WS への新規作成、bind、移入・移出、tag mutation、公開変更、job の新規受理・採用を拒否する境界を有効にする。関連する実行 job を取消し、遅い結果は採用しない。
4. current icon pointer を外し、招待 token / continuation / 未送信配送の利用を失効させる。資源行・writer 情報を消して成功扱いにしない。
5. 回収を通知する outbox 等の永続契機を残す。応答は「WS は削除されアクセス不可、データ回収は処理中」とし、storage の削除完了と混同しない。

この受理後は undo を提供しない。通信失敗で受理の有無が不明なら、本人の削除 receipt を照会して状態を確かめる。認証済みの任意 WS ID から削除結果を列挙できる入口にしない。receipt は操作の重複防止と結果照会用であり、再利用できる workspace 権限 token ではない。

## 全 note 同期更新と scope fence の比較

| 案 | 即時失効の条件 | 影響・不足 |
| --- | --- | --- |
| 同期で全 note を purging へ進める | WS deleted と対象 note lifecycle / version、取消、intent を同 Tx で更新する | 現在の note lifecycle 検査を活かせる。active note を purge へ移す専用入口と既 purging の共有処理が必要。note/job 件数に比例する write Tx になり、未 bind upload・icon・招待は別途 scope fence が必要 |
| WS fence を共通接続し有限 admission | WS deleted を全 current read / write / register / publish / accept が同じ UoW 内で検査する。その後 note を有限件ずつ purge へ接続する | 受付 Tx で全 note の version を進める必要を減らす。ただし現行 `ownerActive` の note 系や未 bind 系への接続が不足。過去版 read、媒体、原本、検索、trash / restore、job retry を含む入口の成立確認が必要 |

後者を第一候補とする。前者でも WS 全体の fence は必要であり、note 全更新だけで WS-10 を満たすとはしない。どちらも SQL による集合更新・有限 query を使い、全 note 本文や全 membership を JS 配列へ展開しない。性能・Tx 時間・追加 query の成立は未測定である。

「即時」は、削除 commit 後の現在認可・変更・結果採用が拒否される意味とする。以前に端末へ配布した bytes の消去、旧画面の遠隔消去、配信途中の無制限監視は保証しない。削除を実行した画面は個人文脈へ遷移し、他の画面は次の取得・操作で旧 scope を使わず個人への導線を示す。scope/filter/選択の解除と古い応答 guard を維持する。

## 移動競合と閉じた回収集合

削除と移動は同じ現在 scope の状態を同 UoW で検査し、commit の順序で所属を決める。

- 移出が先に commit: note は新 scope に属し、旧 WS の削除対象に含めない。中立公開 identity / token / creator / 物理 key も巻き込まない。資源の旧 batch / uploader / draft WS は対象判定の正本にしない。
- 削除が先に commit: 移出・移入とも拒否する。以前の move preview が一致していても、deleted scope の current edit を通さない。
- 移入が先に commit: note は削除時点の WS に属するため対象になる。確認画面の古い件数から除外しない。
- P3e の一部移出だけが完了: 成功子は新 scope に残す。旧 WS に残る未開始子は失効し、別 ID を補充しない。成功子や無関係な scope の兄弟を一括で取消さない。

scope fence 後は、所有の出入り・新規 bind を禁止して集合を閉じる。これを根拠に、現在 WS 所有の note ID を keyset 等で有限 admission する案とする。全件の本文 snapshot や500件 cap は不要である。既 purging は同じ一意 intent へ接続し、回収中に行が消えたことを新規成功や失敗と推測しない。必要な対象 receipt / counters は永続の入場と既存 intent の対応から確定する。

この案は全入口が fence を守ることに依存する。未接続なら安全な閉集合とは呼ばず、同期対象固定案へ戻すか接続を先行する。原文の「WS 全体」を確認時の古い検索結果だけに置き換えない。

## 回収の権限と遅い writer

専用の内部 `workspace-deletion` 原因を持つ回収入口を提案する。入力は永続削除 intent ID と、その intent の対象として認めた note / resource である。deleted WS と対象の現在所有・削除世代を同 UoW で照合し、既存の共通 purge / object claim へ接続する。任意 note ID に対する `skipAuthorization` や、manual purge の現在 edit を無条件 bypass する API は作らない。

回収実行者はシステムで、削除を承認した owner は操作履歴の実行者である。membership を消した後や、実行者がサインアウトした後も受理済み回収は続く。WS の復元、別の note への削除権限、新しい変換 retry をこの内部入口から得られない。

job の cancelled と、writer の終了を分ける。取消・lease 失効だけで object write を終了扱いにしない。既存 put / 再 put の終了、register / publish の拒否、finally / cleanup の現在 charge への接続、同一 key の一意削除 claim を維持する。最初の not found、期限経過、job 終端だけで容量を解放しない。

WS 削除による取消対象は通常の変換・参照・backup・公開/export・一括操作の関連 attempt である。既に不可逆 fence を越えた purge / cleanup は取り消さず完了へ進める。WS 削除自身の回収 job を「関連 job 全取消」で止めない。取消済みの通常 job には理由を付けず、回収失敗の retry と分離する。

現在 WS が所有する未 bind draft / upload / icon 予約も受理と採用を止め、専用 provenance で回収する。本人が同じという理由で personal の未保存 draft を削除しない。移動済み note に bind された行は現在所有を優先し、note 不在を personal 所有と同一視しない。

## 共有 companion と最小 tombstone

削除 WS の note A と別 WS の note B が同じ companion C を保持する例では、A の削除で旧 WS の論理 charge を解除しても C の物理 key は削除しない。B の charge と再利用可能な bundle 関係を保持する。全 scope の最後の保持が外れたときだけ、一意 cleanup 所有へ C の charge を残して回収する。

未完受理・未終了 writer・回収失敗がある間は、対応する reservation / holding / cleanup 所有を残す。bundle の作成 WS や uploader だけで全 companion を削除しない。兄弟 note が他 scope にある場合、その使用可能性を示す正当な永続関係を消さない。P3d-2 の provenance / holding 表現と所有世代の接続が前提である。

最小 tombstone は「削除済み scope の識別子、削除 intent / 世代、未回収 charge・claim への参照、再開位置」を保持する案とする。実 bytes / key / writer 詳細は必要な既存資源行に残し、二重の台帳を増やさない。通常利用可能な Workspace と回収専用状態を DTO と port で分ける。

membership、招待秘密、プロフィール説明、本文、期限外の job 詳細を tombstone の要素にしない。物理 FK の整理まで membership 行が一時的に残る場合も、deleted WS は active join に一致せず、認可は一切成立させない。推奨は失効受理後の有限 cleanup でこれらを除去し、回収継続の根拠を削除 intent だけへ移すことである。

最低限の存続方法は二つある。既存 WS 行を deleted として縮小し、内部回収参照だけ残す方法が変更範囲は小さい。専用 charge tombstone へ移して通常 WS 行を除去する方法は状態分離が明確だが、FK / 容量 / writer の参照移管を広げる。後者を必須 gate にせず、P3d-2 の実形で決める。

全資源回収後の WS 行・slug 予約の扱いは未決である。現在 `slugExists` と unique 制約は deleted 行も対象にする。削除を機に slug を空にして再利用を許す変更は、この案では行わない。P4 の旧公開ページ URL の意味と整合させ、必要な予約だけを通常データや charge と分離する。

現在 `countCreated` は active WS だけを数える。deleted への遷移で作成枠が空いても、旧資源の物理負債は解放されていない。tombstone の保持だけで作成・削除反復時の disk 使用を抑止できるとはしない。追加の作成禁止や新 quota は未採用であり、この点は運用上の資源リスクとして Manager に返す。

## タグ・招待・icon・履歴

- Tag: 削除直後から current scope reader / command で拒否する。使用0を含む tag を対象とし、note 関係の purge と整合させて有限削除する。移動先へ付け替え済みの tag や他 scope の同名 tag を消さない。旧 filter ID を自動除去して別 scope の全件一覧へ広げない。
- 招待: pending 世代、token、AuthContinuation、未送信配送の利用を失効させる。既に外部送信中のメールの撤回完了は保証しない。遅れて届いた URL も参加・icon 取得を許可しない。既採用の秘密 envelope 失効と bounded prune へ接続し、新しい保持期限を作らない。
- Icon: current pointer 解除と cleanup への遷移を同じ受理に接続する。upload 中・変換中・書込済み・旧 icon の資源行と charge を writer 収束まで保持する。表示用の signed cookie や過去 membership は配信許可にならない。
- Job 履歴: 各 job の実行者本人へ最小 terminal snapshot を残す。WS owner が他メンバー全員の履歴を読めるようにせず、元 job の actor / 作成時刻を保持する。削除時点から90日を数え直さない。本文・CSS・原本・raw参照台帳は複製しない。
- 削除結果: WS 削除を実行した本人には、自分の受理 receipt と回収進捗を示す案とする。メンバー一覧を保存して進捗の権限根拠にしない。履歴 prune や本人のアカウント削除後も、未回収 intent / charge はシステムが保持して回収する。通常の note retry とは別の回収再開として扱う。

## 後続 P4/P5 と最小 port 提案

P4 の WS ページ・公開/限定 note・媒体・原本・export 取得は、現在 note lifecycle と現在所有 WS の active を検査する。削除した WS に残る note は token / cache / 公開状態だけで読めない。削除前に移動した note は新 scope の current policy と中立 identity を使う。WS 削除を旧 creator / issuer namespace の全 URL 失効へ広げない。

P4 の完成済み ZIP に削除 note が含まれる場合は旧 ZIP を配らず、採用済みの明示的新要求へ接続する。PDF24時間・ZIP7日を削除後の閲覧権限にしない。P5 backup は関連 job と遅い結果を失効させるが、個人 Google 連携を解除しない。既存の外部 Drive ファイル削除は WS-10 の許可に含めない。これらは未接続 port 契約であり、今回は実証していない。

最小の追加責務は、application の削除確認/受理、domain の不可逆削除 intent と状態遷移、UoW 内の scope fence / intent 作成 / 関連失効、内部の有限回収 admission、本人向け削除結果 read である。既存 UoW の依存方向、共通 purge / object claim / writer ownership を再利用する。正式な型名、schema、page 件数、期限、並行数は決めない。

## 依存と Manager 判断

- P3d-2 の現在所有・移動世代・companion holding / charge を先に接続する。旧 source WS を頼る回収を先行実装しない。一括移動の自己 receipt 計画が未決でも、削除との競合は各子の現在 scope commit 境界で定義できる。
- P3e の receipt / 子結果・取消との接続は正式実装時に合わせる。WS 全体削除は500選択や通常取消可能な batch をそのまま流用しない。
- 第一判断: scope fence と有限 admission を第一候補にするか。全入口の current lifecycle 接続が成立しない場合、同期 note 更新を含める案と影響を再比較する。
- 第二判断: deleted WS の縮小行を回収 tombstone として使うか、専用 tombstone へ移すか。どちらも旧 membership は認可に使わない。charge 解放は実回収後に限る。
- 第三判断: 回収中/完了後に残す本人向け削除 receipt と slug 予約の最小範囲。元の90日履歴を延長せず、slug 再利用の新しい期限・挙動は無断で固定しない。

## 未実行と停止

要件・採用設計と必要 source の read のみを行った。製品、test、helper、git、build、DB、storage、browser、process、network、環境、秘密/鍵/認証 helper、旧環境、recovery/D01、既存 evidence は操作していない。全体管理文書と goal API は変更していない。

変更は本報告だけである。doc-style / markdown-style に従い、原文・採用済み・提案・未決を分けた。実アクセス失効、移動競合、writer、回収、容量、UI、SQL 性能、公開 URL、Drive は全て未検証である。全文確認後、文書を含む全操作を停止して Manager に返す。
