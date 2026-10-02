# P4e 一括公開範囲変更・実装前詳細案

## 現在要約

2026-09-26T15:45:10+09:00、read-only準備を返却。全文照合済み、未回収exec0。正式P4e開始・共有契約採用・検証成功ではない。P4d-3候補/環境/proofは凍結し、独立Verifierの単独所有を維持した。変更は本書のみ。新しい利用者判断事項はない。採用済み500件・版束縛解除同意・retry再確認・変更不要の非更新・公開前提不足全体中止・空本文子失敗/private許可・ACK同ID明示再送・設定後選び直しを実装へ落とす案である。

推奨は既存batchにsharing variantを追加し、単件visibility部分だけを同Tx coreへ抽出するもの。新table/列/migration/依存/worker基盤/資源枠は不要と判断するが、正式実装時の旧JSON互換・制約試験で確定する。正確な以下の型/signatureはManager採用前。正式委譲後の工程見込みは6〜9時間＋独立検証。

根拠: [採用design](../design.md#一括公開範囲変更の接続判断)、[brief](../brief.md)、[9/26接続報告](P4e-batch-sharing-contract.md)、[OR-09](../../spec/scenario/organize.md#or-09-複数のノートを選択して一括操作する)、[SH](../../spec/scenario/sharing.md)、[JB](../../spec/scenario/jobs.md)。SH-07の古いURL失効文は既決のnote URL維持で上書きされ、新条件へ戻さない。

## 1. Tx内共有coreと単件保持

現 [settings.ts](../../packages/core/src/application/sharing/settings.ts) は `changeSharing` 自身がsession認可とUoWを持ち、visibility/password/reissueを同関数内で扱う。workerからこの外側関数を呼ぶと子finishとの原子性が失われる。visibility以外までbatchへ公開せず、次の内部application関数を新 `application/sharing/visibility.ts`（候補）へ置く。

```ts
type VisibilityOperation = Extract<ShareOperation, { kind: "visibility" }>;
type VisibilityResult = Readonly<{
  kind: "changed" | "unchanged";
  noteId: string;
  visibility: NoteVisibility;
  previousShareVersion: number;
  shareVersion: number;
}>;

readSharingForActorInTransaction(
  u: HollowUnitOfWorkContext,
  actorId: string,
  noteId: string,
): Promise<SharingEditSnapshot>;

changeVisibilityInTransaction(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  actorId: string,
  input: Readonly<{
    expected: ShareExpected;
    operation: VisibilityOperation;
    mode: "single-reapply" | "batch-converge";
  }>,
): Promise<VisibilityResult>;
```

`SharingEditSnapshot`は内側専用の現在note/settings/scopeを持ち、transportへそのまま渡さない。raw token/password hash/envelopeをbatch DTOへ漏らさない。coreは現在verified account、active note、現在edit、ShareExpectedの全項目を検査する。shareVersion/noteVersion/ownershipGeneration/workspaceId/membershipRevision/name/memberCountの比較を既存 `checked` と共通化し、sessionをworkerへ渡さない。Clock/ID/token/protectorは注入済みcontainerのportだけを使う。

順序は現在認可→厳密expected→本文/public前提/解除確認/既存整合性→同visibility判定→必要なmutation。`batch-converge`だけ同値をunchangedで返し、save/public identity発行/token発行/epoch更新を行わない。空本文のlink/publicや現在handle/slug不足をno-opで通さない。不正public identity等を新発行して「変更不要」に見せない。

`single-reapply`は現在単件の同値再適用を維持する。単件wrapperは同じTx内でrequireAccountからactorIdを得てcoreを呼び、commit後getSharingで従来DTOを返す。password hashの事前確認→有限passwordWork→Tx再確認、regenerate/remove-passwordは既存意味を保持し、必要な確認関数だけ共用する。単件全APIをbatch modeへ切替えない。

batch workerは [worker.ts](../../packages/core/src/application/batch/worker.ts) のactivePolicy/同一fixed source/leaseを先に確認し、このcoreと `batches.finish` を同UoWで実行する。finish失敗時は共有mutationもrollback。ack喪失・再配送時は既存running/leaseToken/terminal fenceにより再mutationしない。共有変更だけでnote本文版/holding/move receiptを更新しない。public identity/token維持・grantEpoch/public accessEpoch失効は単件と同じコードを通す。

## 2. 型・同意・成功結果と旧row互換

親intentは `BatchOperation` へ `{kind:"sharing", visibility:NoteVisibility}` のみ追加する。password設定・任意解除・SH04再発行・一括リンク取得を含めない。binding/destinationはnull、holdingSequenceはnull、move receiptは作らない。

### snapshotと同意を分離する候補

```ts
type SharingConfirmationSnapshot = Readonly<{
  share: ShareExpected;
  visibility: NoteVisibility;
  hasPassword: boolean;
  hasLink: boolean;
  body: "present" | "empty";
}>;
type PasswordRemovalConsent =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "remove-password"; noteId: string; shareVersion: number }>;

// Previewだけ。consentはserverが生成しない。
type SharingPreviewExpected = Readonly<{
  kind: "sharing";
  snapshot: SharingConfirmationSnapshot;
}>;
// 永続子attemptのBatchExpected sharing枝。
type SharingAttemptExpected = Readonly<{
  kind: "sharing";
  snapshot: SharingConfirmationSnapshot;
  consent: PasswordRemovalConsent;
}>;
```

既存tag/trash/moveのexpected shapeは維持し、preview側を `BatchPreviewExpected`、永続側を既存 `BatchExpected` として区別する。ready previewは既存共通noteId/title/latestAttemptId/baseSequenceにSharingPreviewExpected、move:nullを持つ。excludedは従来のnoteIdだけ。本文空はreadyのsnapshot.body=emptyとして公開不可理由を表示し、非開示excludedへ落とさない。

`BatchConfirmation` は既存ready/excluded互換を保ち、sharing ready枝だけ `{expected:SharingPreviewExpected, consent:PasswordRemovalConsent}` を必須にする。tag/trash/move/excludedにconsentを許さない。target publicかつsnapshot.hasPassword=trueならremove-passwordのnoteId/shareVersion完全一致、それ以外はnoneだけを許す。privateに準備済みのpasswordも対象。clientがsnapshotを書き換えて同意を省いてもserverの再snapshot比較で拒否する。

snapshot/title/latestAttemptId/baseSequenceの厳密比較とconsent検査を別関数へ分ける。確認済みsnapshotと検証済みconsentを組み合わせてSharingAttemptExpectedを作り、親操作へ永久同意booleanを置かない。workerもexpectedのshareVersion照合後にだけconsentを `confirmPasswordRemoval` へ変換する。public全体の最終確認ボタンは公開/検索対象化・WS page非公開との独立を説明し、保護P件への明示解除確認からP件分の同意を作る。未知対象への包括同意はない。

### 成功result候補

内部 `BatchSuccessResult` は次のdiscriminated unionを推奨する。

```ts
type BatchSuccessResult =
  | Readonly<{ kind: "existing"; noteId: string; holdingSequence: number | null }>
  | Readonly<{
      kind: "sharing";
      noteId: string;
      holdingSequence: null;
      visibility: NoteVisibility;
      change: "changed" | "unchanged";
      previousShareVersion: number;
      shareVersion: number;
    }>;
```

DB旧result `{noteId,holdingSequence}` はshapeを検証し内部kind:existingへ投影するだけで、旧JSONを書換えない。tag/trash/moveの新保存も既存wire JSONを維持するencoderを使える。sharingだけ新kind付きJSON。holding照合はexisting枝だけを明示的に扱い、sharingを旧moveのsequenceへ混ぜない。unknown kind/不正shapeはintegrity errorで閉じ、現在noteを読んで旧resultにvisibilityやchangedを補わない。

`getBatch` は現在resultを返さないため、保存済resultから `outcome: null | {kind:"existing"} | {kind:"sharing", visibility, change}` を本人子DTOへ追加する。共有版の内部監査値はUIへ不要なら出さない。後から別操作でprivate化されても、過去結果は「当時公開へ変更済み」のまま。旧成功は従来「完了」であり「変更済み/不要」の判定対象にしない。90日title消去・本人限定・retry可能性は既存時計/状態規則を保持する。

## 3. preview・受理・retry・digest

現 [usecases.ts](../../packages/core/src/application/batch/usecases.ts) のfixed ID/source・preview50/accept500・parent generation/latestAttempt・same-request先行収束を再利用する。

1. `validateOperation` のsharing/public枝で現在sourceのowner handle又はactiveWS slugを検査する。不足ならpreview/新accept/retryとも親/子を作らず全体中止。WS pagePublicは前提にしない。scope editを先に検査し、読めない他scope情報を案内しない。
2. `previewOne` に明示sharing枝を置く。現在末尾のtag fallbackへ流さない。現在title/ShareExpected/visibility/保護/link/本文有無だけを返す。本文空をreadyとして受理後の理由付き子失敗へ繋ぐ。preview後本文が変わればnoteVersion差なので再確認が必要。
3. `compareConfirmation` はsnapshotだけを比較し、別途consentを検査。newAttemptでは永続expectedへconsentを移す。受理前に500件全snapshotを同UoW再比較し、1件でも古ければ全体未受理。受理後の子変更は個別failure/cancelledとして兄弟を続ける。
4. sharingだけ固定key順のcanonical input builderをserver/client transportに用い、source/operation/items順序・excluded・snapshot・consent・latestAttempt/baseSequenceをdigestへ含める。tag/trash/moveの既存JSON順序/digestと `legacyMoveDigest` は変更しない。retry digestも同じsharing項目とparent ID/generationを含む。unknown ACK後に再previewして同ID payloadを差し替えない。
5. 初回既受理同ID/digestは現在共有値から判断せず既存receiptを返す。再試行既受理はgeneration+1とretryDigest一致で同じ受付へ収束。新retryは同parent target、最新failed子だけ、新preview/新解除同意、同ordinal/retryOf、新attemptであり成功/取消子を復活しない。

failure whitelistへ少なくとも `SHARE_BODY_REQUIRED`、`SHARE_PUBLIC_PASSWORD_CONFIRM`、`SHARE_PUBLIC_HANDLE_REQUIRED`、`SHARE_PUBLIC_SLUG_REQUIRED`、`SHARE_CONFIRMATION_CHANGED`、`SHARE_CONFLICT`、`SHARE_KEY_UNAVAILABLE` の固定安全説明を追加する。開始後のhandle/slug喪失は子失敗。activePolicyの失権/非activeは従来cancelledでfailureなし、同source不一致/確認版変化はfailed。原例外/token/envelopeを保存しない。鍵未構成で未発行tokenの初発行が必要な子はfailedだが、private化まで全面禁止しない。

## 4. UI/current contextとschema

[batchInput.ts](../../apps/web/app/presentation/batchInput.ts) のstrict unionへ新operation/preview expected/consent付きconfirmationを追加。UUID/正整数/既存scope shape、preview50/全体500/重複拒否を保つ。新HTTP routeやaccount job基盤は作らずbatchServerFn入口を再利用する。

`BatchOperationPicker/SelectionBar/model` はsharingの目標3種とlabelを追加し、「公開変更は未提供」だけを成立後に置換する。Drive/一括downloadは未提供のまま。`BatchConfirmation` は現在→目標audience、現在sourceのmemberにだけ人数、空本文理由、保護P件解除確認、保存済み対象/検索対象化/WS非公開pageとの独立を表示する。public前提不足は安全error codeに応じ既存profile又はWS設定へ案内し、editorへowner操作権限を与えない。設定往復後は選び直しで、選択永続化/継続ticketなし。

`confirmationInput` は現在sharing consentを保持できないので、初期previewから確認を作る関数と、既確認payloadをstrict serializeする関数を区別する。retry/unknown再送でnoneへ戻したり、古い同意を新previewへ自動コピーしない。`BatchHistory` はsaved sharing outcomeを表示し、retryでは新previewに進む。未知ACKは現在の同ID/payload明示再送を継続し、read-only lookupという説明へ変えない。

現在Confirmationはids/source/operation/parent keyのepoch、ProviderはactorEpoch/selection epoch、Historyはcontext epochを持つ。新経路には `{actorId, actorEpoch, contextKey, contextEpoch}` と `currentContext()` の読取contractを親から渡す候補。各async success/catch/finally/focusはmount＋このcontext＋自分のoperation tokenを照合する。再render前に別actorのstateを見せないため親epoch key又は同期owned-view判定も併用する。Historyの無条件finally invalidate/busy=false、Dialog cleanupのisConnectedだけのfocus復帰、Confirmationの旧finally busy解除を局所的な照合対象とする。静的リスクであり実不具合再現の主張ではない。React transition/pendingは残し、新actorのbusyを旧operationで解除しない。tickerを別実装せず既存batch kindへ参加させる。

現 [batchSchema.ts](../../packages/core/src/adapters/libsql/batchSchema.ts) と [0022](../../packages/core/src/adapters/libsql/migrations/0022_dashing_the_hand.sql) はoperation/expected/resultがJSON textでkind列挙CHECKなし。既存triggerは親intent/子expected不変・result存在/terminal/state/lease・500上限を守るため新variantを妨げない。新列/table/index/migrationは不要という最小案。sharing result/consentの型とDB JSON読取境界を具体化し、既存rowを更新するmigrationを作らない。採用済みpublic identity/共有整合はTx coreと既存DB guardを使い、batch専用SQLでvisibilityだけ書き換えない。

## 5. 完成条件案・影響候補・工程

次の7項目はOR/SH/JBと採用リスクだけを観測する候補で、Manager固定前。新機能/数値上限/外部gateではない。

| 案 | 観測する結果 |
| --- | --- |
| A 型・互換/有限受理 | 新union/strict schema/旧tag-trash-move JSONとdigest/旧move補完を維持。固定500/501検知・50preview・同sourceと対象外非開示が成立 |
| B 単件共通core | 現在認可/OCC/初回token/public identity/epochが単件とbatchで一致、単件同値再適用を維持。mutation＋子finish rollbackと再配送非再実行 |
| C 確認と混在条件 | 版束縛解除同意/public全体前提不足未受理、同値no epoch churn、本文空public/linkだけ子失敗・private許可、正当兄弟継続 |
| D current/取消/retry | 本文/共有/member/移動ABA・source変更・失権/WS削除を現在判定。waiting取消/running結果・最後のretry generation・新同意と旧attempt非復活 |
| E 操作/履歴UI | owner/editor導線、viewer操作非表示、現在→目標説明、変更済み/不要保存結果、失敗理由/本人履歴/通知。390/keyboardと現在actor/context/focus/ACK同payload再送 |
| F 共有結果の外部観測 | link/private/public切替が既存reader/公開一覧・検索/ダウンロード現在認可へ反映。token/canonical維持、元grant/export/ticket失効、SH04を一括で発火しない |
| G 統合/保全/固定 | 規定checks・関連隔離/実UI・旧データ/JSON/共有/identity保持、自己対象だけの事前保全/通常回収、同bundle候補/commit/全停止 |

先行条件への実影響候補はP3e-B/C/D/F/G/H（共通batch型/受付/worker/結果/確認UI）、P4a-A/B/CとP4c-D（Tx visibility抽出）。P4a-E/P4c-Jは新context/focus接続で既存共有UIを実編集する場合だけ。P3e-A/Eは選択/holdingを再利用し、実変更がなければ受入を保つ。P4c-A/Cは設定案内先だけで保存機能再openを推奨しない。P4c-F/G/H/I・P4b-E/F・P4d-3-B/C/Fは新mutation結果の関連読取/失効確認であり、現時点でrenderer/検索/配信portを編集する理由はない。管理上のreopenは正式実編集後に具体path/責務を報告してManagerが判断する。

工程見込み: 型/Tx core/互換と小対1.5〜2h、preview/受理/worker/同意/retryと隔離対1.5〜2h、UI/history/current guard1〜2h、同bundle実UI/旧共有関連・保全/候補固定2〜3h。計6〜9h、独立別。正式初回に共有型/signature採用→旧JSON/core回帰→少数混在DB対→親UI→通常自己noteの実公開/解除→固定の順が最小。外部メール/OAuth/Drive/ZIPは不要。最大500を新負荷枠へ拡大しない。

未実証は新型の実コンパイル、JSON decoder互換、Tx core抽出後の回帰、UI非同期guard、実batch mutationからの公開失効、最終保全である。本準備ではtest/build/DB/HTTP/browser/proof/git/鍵へ一切操作していない。実装の成否ではなく接続案だけを返す。本書全文を確認後、文書読取・編集も含め全停止し、正式委譲を待つ。
