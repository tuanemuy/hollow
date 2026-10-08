# P5d 現行コードへの退会境界接続案

2026-10-01。最初の15分区切りの静的提案。基点は `fd4a2476a60a3ad4db3da2ac92235b0334e7e895`、Drive 永続化は 0041。入力は [退会の共有境界](P5d-boundaries.md) 全文。製品・DDL・実行計画の採用ではなく、Root が後続詳細化の対象を決めるための最小比較である。

## 結論

第一候補は既 account ID を保つ不可逆な縮小枝と、ログイン可能 account / opaque 人物状態の別 projection。存続 WS の原本や素材の FK を動かさずに本人を利用不能にできる。別 identity anchor 表は認証との物理分離が明確だが、現段階では provenance FK の付替えが広く、最小差にはならない。

ただし、accounts の状態列だけでは足りない。個人 current scope、member/owner 集計、公開プロフィール、worker の現在認可へ同じ失効条件を接続する必要がある。0041 の head は退会 fence ではなく、record/target の秘密を回収する API もない。認可失効・人物 anchor・物理回収 debt・Drive 秘密の寿命を分けて詳細化する。

本人メール一致、唯一 owner の active WS があれば同 Tx 拒否、現在個人所有だけの削除、現在 WS/他人へ移動済みデータ保持、個人 URL 404、既知退会者の表示、外部物保持は固定する。退会猶予、退会取消、再登録禁止期間、永久 handle 予約、自動 WS 譲渡、外部 delete/move/revoke は追加しない。

## 1. 現行に残る具体的な差

| 公開コード | 現在の境界 | P5d で必要な差 |
| --- | --- | --- |
| `domain/account/entity.ts`、`hollowSchema.ts`、`repositories/accountRepository.ts` | Account は verified/unverified、email 非 null、認証方法が両方ない row は `AUTH_METHOD_MISSING` | deleted row を通常 Account に変換しない。架空 email/password を埋めない |
| `account/session.ts`、`account/context.ts`、`drive/current.ts` | session と account の現在読取を持つ | active-only projection に統一し、遅い session 発行・callback 採用・資格更新の保存条件にも active と世代を要求 |
| `workspace/access.ts:scopeRole` | personal は account ID 一致だけ。WS は membership を読む | actor の active と personal owner の active を共通に確認。creator の退会で WS scope を失効させない |
| `repositories/sharingRepository.ts:scope` | personal owner は accounts 行の存在だけで有効 | retained deleted anchor は scope を成立させない。公開/限定 URL と媒体等の current 判定へ到達させる |
| `repositories/workspaceRepository.ts:role/ownerCount/join/membership` | active WS/生 membership を使用し、account 退会状態はない | owner 数は active account の owner を数え、退会済みへの join/昇格を拒否。退会 fence と同 Tx で本人 membership を失効 |
| `repositories/displayNameRepository.ts:author`、`note/getNote.ts` | 行なしを deleted、残る行を named/unset。private creator は unavailable もある | 明示状態から既知 deleted を投影。unknown/未設定/WS 脱退/非可視を混同しない |
| `publicProfileRepository.ts`、`publication/reading.ts` | profile row/handle と creator ID を読んで著者 URL を作る | 退会 profile/旧 icon の公開を拒否し handle を解放。存続 note の identity は変更せず、再取得 handle を旧著者へ接続しない |
| `note/purge.ts`、`domain/purge/entity.ts` | manual/expired/workspace-deletion の専用入口 | session 不要の account-deletion intent に束縛した内部入口を追加。期限到来や manual 権限を偽装しない |

`AccountRepository.save` は現在 insert であり、無差別 upsert ではない。ただし `authenticationRepository.ts` の setPassword/linkGoogle/unlinkGoogle や `saveSession` は退会状態を条件に持たない。読取の null 化だけを変更完了としない。

## 2. account 縮小枝と別 anchor 表の比較

| 案 | 最小の型/永続差 | 利点 | 必要な注意 |
| --- | --- | --- | --- |
| A: accounts に active/deleted 枝（推奨） | state/退会 intent 参照と不可逆制約、deleted 時の email/password/verifiedAt 等の縮小、active-only mapper、人物状態 projection | originals/assets 等の既 account ID/FK を保持。WS 原本の uploader 来歴を変えない | 「行がある＝認可可」の読取を全て是正する。nullable 化には正式な accounts 移行と既 FK/trigger/旧全値の確認が必要 |
| B: identity anchor 別表＋active account | identity に同一 opaque ID/退会状態、認証 account を別に保持。存続データの FK は identity へ、認証専用 FK は account へ分類 | ログイン情報と存続来歴を物理的に分離できる | originals/assets/import batch/job/profile/WS 等の各 FK 用途を分類し付替える範囲が広い。別表だけ追加して account を消す案では既 RESTRICT/CASCADE が残る |

A でも、認証用の `Account` 型へ deleted を混ぜて全呼出側に資格 null を押し付けない。最小の候補は次の分離である。名前・列・port 配置は未採用。

```ts
type AccountIdentityState =
  | { kind: "active"; id: string; authVersion: number }
  | { kind: "deleted"; id: string; deletionId: string }
  | { kind: "missing" };

// Account は現行の認証可能 projection のまま。
// cleanup の失敗/再試行で deleted を active へ戻さない。
type AccountDeletionWork = {
  id: string;
  accountId: string;
  phase: "queued" | "running" | "waiting-owners" | "completed";
  version: number;
};
```

認証 lookup は deleted を null として返し、人物表示/回収だけが明示 deleted を読める。保存側は active→deleted 専用 CAS を持ち、deleted→active、同 ID の再作成、退会済みへの資格/session/profile 再挿入を拒否する。email unique は active 値に対して維持し、退会後は null にして新 account の同メール登録を妨げない。Google identity と handle も旧 ID への復活キーにはしない。

anchor の残存情報は opaque ID、不可逆状態、必要な intent/世代参照に限定する。email、password、Google login identity、公開 profile/icon は anchor のために残さない。createdAt 等を deleted 枝で保持する必要性も別途確認し、型を満たす偽値で置換しない。creator 等には非 FK の参照もあるため、FK がなくなっただけで anchor を消す判定はできない。存続来歴がある間の anchor 保持は handle 永久予約ではない。

## 3. 不可逆受理と共通 fence の最小候補

一つの UoW に、現在本人/メールの再確認、active WS の唯一 owner 存在検査、account active→deleted CAS、session/認証 attempt/連携採用の失効、公開 profile の失効、membership の失効、取消/回収 intent を置く。大量の note をこの Tx で JS 全件列挙しない。membership 更新・二人 owner の同時退会・note 移動と同じ正本へ書き込み、競合時は再読を要求する。

現 `membership.ts:mutateMembership` は一 WS の ownerCount を同 UoW で確認している。退会用には「本人が唯一の active owner である active WS が存在するか」を有限な EXISTS で検査する port が最小候補。後続 worker で owner 検査する案や、削除済み本人を ownerCount に残す案は不可。既 UoW は `db.transaction` を使うが、本照合から特定の BEGIN モードや並行成功の証明までは主張しない。退会・role 更新双方の相反順序を後続の局所対で検証する必要がある。

共通 primitive は人物の `AccountIdentityState` 読取と active 判定を候補とし、アプリ層では次の三つの用途を分ける。

1. actor fence: 本人に新規受付・新session・callback 採用・新しい外部処理を許すか。
2. scope fence: note の現在 owner が有効か。personal owner は active account、WS owner は現在 active WS を見る。creator/uploader は所有判定に使わない。
3. cleanup authority: 永続削除 intent が現在その対象を回収できるか。退会者 session や通常 canScope を迂回する汎用権限ではなく、intent/現在 owner/世代/対象 locator に束縛する。

接続先は `requireAccount/captureAuthentication`、`scopeRole/canScope`、`sharing.scope`、profile/author projection を共通の入口とする。ただし直接 SQL の claim/current/結果採用/delivery、匿名公開取得、保存済み auth attempt の更新も対象になるため、「canScope 一箇所で全経路を覆った」とはしない。新共通判定を呼ばない下位 adapter の保存条件には同じ active 条件を要求し、純ドメインに SQL や runtime registry を入れない。

個人公開/限定 URL は profile 削除だけに依存させず、current scope が失効した時点で既 NotFound へ落とす。発行済み grant/媒体 URL/export artifact/delivery も current fence で再判定する。受理前に他人/WSへ移動済みの note は保持し、受理後は退会 personal scope への移入/移出・新規作成/bind/publish を拒否する。原本や asset の `accountId` による横断 DELETE は使わない。

## 4. 0041 record / target / purge の接続差

| 現契約 | 退会で維持すること | 必要な差 |
| --- | --- | --- |
| head は `(originalId, accountId, subject)` の current target、複合 deferred FK | 退会を理由に head を別 actor/sub へ付け替えない。旧 target/record locator を新 account に再帰属させない | admission/claim/current/record 採用の account fence。head 有無は人物 active の代用にならない |
| 0039 target は folder/subject 等不変、confirmed 更新禁止。0041 は historical target UPDATE を拒否 | 成功/未知の保存先来歴を失わず、新しい同 ID/別 ID 転送を退会後に始めない | 秘密の縮小には別途正式保存型・guard 移行が必要。今の row に null を書く運用では対応不能 |
| record は version=1、全 UPDATE 禁止。note/original/target RESTRICT、record.accountId 自体は非 FK | WS/移動済み note の record を取得不能な来歴として保持 | 現在編集権限の確認後、record actor の deleted を有限な利用不能へ投影。current `forNote(noteId, actorId)` だけでは他メンバー向け退会来歴案内を実装できない |
| `purgeNote` は全世代 jobs を匿名化→head→record→transfer→target の順に消す | 正当に回収する個人 note にだけ使用。WSに残る退会者 record の整理に流用しない | account-deletion の note 用 intent を既 purgeへ接続し、原本/素材/companion の既共有関係・容量処理を維持 |
| 0041 head DELETE は note purging、未終端jobなし、held/pin/refreshなし、active object writeなしを要求 | 退会でも unknown を closed とみなさず、所有保護を短絡しない | retired actor の収束処理だけは再認証なしに続行できるよう cleanup authority を分離 |

`driveBackupRequests.accountId` は accounts RESTRICT FK のまま。target/job/transfer/record が opaque accountId を持つことだけで account の物理 DELETE が可能にはならない。A 案の anchor はこの FK を保ったまま資格を失効できる。

現在の `cancelDriveBackups({kind:"account", accountId})` は epoch 省略で全世代を指定でき、afterCommit は exact owner への abort/wake だけを行う。pending job は集合 UPDATE。一方 transfer の `live(scope)` は最大101件であり、この取消 API 一回を将来の任意履歴数に対する全回収証明へ拡張しない。先に account fence と永続 intent を確定し、必要な閉鎖対象を keyset/cursor で進める候補が必要。既 S1/S3 の容量上限内契約の欠陥を、この将来条件から推定しない。

afterCommit 失敗でも退会は成立し、runner が永続 intent を再発見する。callback に DB 更新・network・close待ちを追加しない。業務結果が terminal でも unknown/pin/object write があれば回収完了にしない。現在の purge hasWriters と 0041 guard の全世代保護を再用する。

## 5. opaque anchor と秘密回収の分離

account anchor と cleanup intent に token/resource-key/session を格納しない。受理時に新利用を止めることと、既 owner の実終了後に不要な秘密を回収することを分ける。全体の AES key を捨てて一人分だけ消去したことにする案は、他者や未終了処理へ影響するため不可。

Drive では record の `resourceKeyEnvelope` だけでなく、record.folder、target.folder、transfer.identity、job.admissionIdentity、連携/attempt/control にも秘密または資格に結び付く snapshot がある。record だけの null 化ではコピーが残る。0041 は historical target 更新も禁止するため、次の二案のどちらも新しい正式移行が要る。0039–0041 を遡って書換えない。

- 専用縮小遷移: actor deleted と実 owner 終了を条件に、秘密 field だけを不可逆 redacted 状態へ縮小する。小さい表追加で済む可能性はあるが、複数の JSON snapshot と immutable guard の例外を厳密に定義する必要がある。既 version=1 record を無条件可変にはしない。
- 秘密 sidecar: target/record の取得不能 shell と秘密 payload を分け、全 snapshot は secret reference を参照する。来歴不変と秘密削除が明確になるが、既コピーの移行・read mapper・binding/guard の到達差は広い。新表を作るだけで旧 envelope を残す案では足りない。

初回の推奨は account A 案の採用可否を先に決め、秘密保存方式は全コピー/閉鎖時に必要な最小項目の表を作ってから採用すること。Google login identity を消しても、backup tuple には別用途の生 subject が残る。これを最小来歴として保持する範囲と、将来 opaque provider-binding ID へ縮小する要否は明示的な採否点であり、anchor が残るから生 subject を永久保持してよいとはしない。後者を選ぶなら head/target/job/transfer/record の identity 対応を含む移行になる。

## 6. Root へ返す最小採否点

1. accounts の縮小 deleted 枝＋active-only Account projection＋別人物状態読取を第一候補にするか。別 anchor 表へ広い FK 付替えを今行う理由がなければ A を推奨する。
2. 退会受理は即時不可逆 fence、物理回収は新 account-deletion intent と専用 note purge cause で続行する方向を採るか。唯一 owner は同 Tx EXISTS、profile/handle/session は即時失効し、未終了 owner の回収待ちを退会猶予にしない。
3. Drive 秘密を専用 redacted 遷移と sidecar のどちらで回収するか。現 evidence から一方を最小と断定できないため、全コピーと guard 差の短い比較を次の詳細化に限定する。生 subject の保持範囲もここで確定する。

上記は実装方式の採否であり、確定済みの利用者要件を再質問する必要はない。P5c1工具準備/P5c3案の受入や実行許可を本案から導かない。P5c3が扱う場合は記録ownerと実行actorの失効を別軸で参照する契約だけを共有し、当該機能を本案で設計し直さない。

## 照合範囲と停止

公開 source と本書の根拠文書だけを読み、上記接続点を静的に照合した。全 repo 認可入口/FK/秘密コピーの網羅監査、SQL移行成立・並行性・退会UIの実証は未実施。局所対の候補は「二人ownerの同時退会」「個人URL即時404とWS/移動済み保持」「遅いcallback/新session再発行拒否」「通知失敗/unknown/pin保持」「0041全世代recordと秘密縮小」の各境界であり、実行数や資源予算はまだ定めない。

変更は本書だけ。製品/DDL/test/build/import、DB/runtime/HTTP/browser、秘密/旧private、管理正本、`spec` / `spec-implement` の操作は0。提案を返却し、全 read/write/run を停止する。

EOF
