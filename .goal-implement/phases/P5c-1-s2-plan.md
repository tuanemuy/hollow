# P5c-1 S2 静的接続案

## 現在位置

2026-09-29。S1候補 `f50d88a43f3fa44c4f342f8b3a9bef34064ce52c` を対象とする静的案。採用正本は `design.md` のDrive節、固定条件は `plan.md` のP5c-1-A〜F、S1実結果は `P5c-1.md` を参照する。

本書だけを編集し、製品・既報告・管理正本は不変更。DB、テスト、HTTP、ブラウザー、新root、旧proof、外部通信は実行していない。環境所有はVerifier。以下の共有契約補足は未採用であり、S2実装許可を意味しない。spec/spec-implement、goal APIは使用しない。

S2は新Drive portに対するapplicationとfake契約試験まで。S3の実HTTP、設定配備、Picker/UIを仮実装でつながない。Googleログイン、LLM、backup転送、Drive再生成は対象外。autoBackupはfalseを維持し、trash自動再作成と実backup再連携取消は利用者回答待ちのまま残す。

## 静的に確認した接続上の不足

| 現在の公開source | S2へ接続する際の不足・境界 |
| --- | --- |
| `domain/integration/drive.ts`、`driveRepository.ts` | 受付時expected版、owner、合法unionはある。ownerが実際に使用したcredential版と、本人が確認した取消対象集合の束縛を補足する必要がある |
| `application/integration/drive/{ports,current}.ts` | authorization/folder/execution portはある。実HTTP所有の開始・閉鎖をapplicationに渡す責務、通常refresh後のcurrent判定を具体化する |
| `adapters/libsql/repositories/driveRepository.ts` | claimは受付時credentialVersionも完全一致。全受付がadmissionSequenceを進める。globalの有限claim/prune取得口はない |
| 同repositoryのfolder-create更新 | sendsを旧値以上・旧値+1以下に制限するが、reconcilingから新runningへ同sendsでclaimする経路を禁止していない。新たなcreate送信intentを同じ回数で繰り返せる静的到達可能性をManagerへ報告済み。実再現・修正は未実施 |
| 同repositoryのready遷移 | readyからcompleted/failedだけ。shortcutの明示確認後にtargetを再照会する新HTTP所有を表せない。所有を作らずproviderを呼ぶ迂回は不可 |
| `application/account/context.ts` | captureAuthenticationはlegacy sessionのbind/ensureを行い得る。純GETへそのまま流用しない |
| `adapters/libsql/repositories/authBrowserRepository.ts` | Google/OpenRouter attemptのbrowser参照はpinされるが、新Drive attempt/controlの2種類は未接続 |

これらは主の静的所見。作成中にManagerから、独立DBでV1（failed+closedから同failedをnew ownerでclaim）とV2（reconciling+closed/sends1からrunning/sends1をclaim）がともにtrue/held1と観測された旨を受領した。独立の保存境界反例であり、実無限HTTPの観測ではない。主による実再現・製品修正は0。S1 V1/V2の限定修正は本書のS2契約補足と分離して別委譲する。

## usecaseと責務

新規applicationの配置候補は `packages/core/src/application/integration/drive/` に閉じる。名称は実装時に重複を避けて確定し、責務のためだけに汎用job基盤を追加しない。

| path候補 | 公開usecase・内側の責務 |
| --- | --- |
| `connection.ts` | begin/callback/adopt。現在本人とbrowser、認可attempt一回性、候補検証、再連携の旧接続保持 |
| `credentials.ts` | purpose付きsecretの復号・再封印、owner内の単一refresh、使用credential版の照合。DTOを返さない |
| `folders.ts` | Picker発行、選択検査、shortcut確認、事前ID作成、同ID照会、明示追加送信、保存先確定 |
| `control.ts` | command単位取消、独立disconnect。DBの取消intentと外側abortを分離 |
| `read.ts` | 設定、本人receipt、専用historyの純GET。provider呼出・refresh・ensure・prune・wakeを行わない |
| `runner.ts` | 有限claim、結果/closeの別照合、cancel/期限、candidate採用待ち、prune。S2ではfake executionだけ |
| 既 `current.ts` | actor/session/browser/authVersion/epoch/settingsと使用credential版を用途別に照合 |

cross-cuttingの時刻/ID/state/nonce/verifier/hashは既clock/idGenerator/tokenGenerator portを使用する。Googleログイン用attempt/secret/HTTP ownerは流用しない。実行ポートのruntimeGenerationは将来の専用runner構築時に明示注入し、ambient値や別機能のownerから推定しない。

### 認可

1. begin POSTで認証capture、現在接続、対象folder集合、rate/queue、同actor+command receiptをTx内照合。state/nonce/S256材料を専用purposeで封印しpendingを保存する。外側でauthorization URLを構成し、同commandの明示再照会POSTでだけ必要なURLを再提供する。GETはURL/secretを出さない。
2. `verifierEnvelope`の平文はversion付き閉じたpayloadとしてstate/nonce/verifierと確認集合のdigestを持たせる案。candidateへ進む際に必要な確認情報だけ再封印する。これは既envelopeの具体内容の提案であり、URLやtokenのDB平文保存を追加しない。
3. callbackはstate hashから検索し、現在session/browser/actor/authVersion、期限、epoch、未消費をTx照合。pending→exchangingのclaimで一回だけ外部交換を所有する。codeを履歴/DTOへ残さず、応答不明を自動再交換しない。
4. token応答とclaims/scope/refresh不足の検証は同じexchanging owner内、Tx外で完了させる。未検証claimsをcandidateへ保存しない。refresh tokenが省略された場合の既token再利用は同sub等の採用契約に適合する場合だけで、別subへ持ち越さない。
5. resultと実closeを別々に受け、閉鎖済みの検証済candidateだけを保存する。candidateのwaitingはHTTP枠0、認可admission/currentは保持する。
6. adoptは現在条件と確認集合を再照合し、旧held ownerが0のときだけconnection採用と旧非held folder操作取消を同Txで行う。旧unknownがあればcandidateはclosedのまま待つ。candidate自体がaccount1枠を占めて解消を妨げない。旧接続は失敗だけで破棄しない。

旧active/unknownをcandidateが自動的に閉鎖扱いにすることはない。利用者が旧操作を別途取消した場合もabort後の実closeまで待つ。実backup取消の未回答方針をfolder操作へ紛れ込ませない。

### folder・Picker・create

Picker tokenは明示POSTに限定し、actor/browser/epochと5分以内の有効期限へ束縛する。短命access tokenだけをmemory/no-store用途に返し、refresh tokenを返さない。combined scopeを専用downscopeと表示しない。ACK喪失でGETからtokenを再配布しない。現在性を失った待機Pickerを終了させても旧HTTP unknownを解放しない。

folder選択はfile ID/resource keyを候補入力として受け、同subのserver metadataでfolder・非trash・canAddChildren・driveIdを確認する。resource keyは専用purposeで封印する。shortcutは一段のtargetを提示し、明示確認後にactual targetを再照会する。chain/不明metadataを無言でfolder扱いしない。404は所在/権限不明、trashは採用不可であり削除確定や自動代替をしない。

readyから再照会する所有を表す最小union補足候補は、folder-selectの `verifying-target`（sourceId/targetId/key/確認済readyVersion保持）と、folder-createのread-only reconciling claim。readyと同じowner tokenを復活させず、新claimを発行する。結果採用は同claim/現在版/target一致のみ。これに伴うCHECK・mapper・遷移変更は別許可を要する。

folder-createはallocate ID→永続prepared→送信intentの順を守る。createへの新intentごとにsendsを厳密に+1、最大2とし、2回目は明示同ID再試行だけ。metadata照会はsendsを増やさず、createの再実行と区別する。409は成功と決めず同ID/sub/marker/metadataを確認する。応答不明や再起動から別IDを生成しない。親が見つからないだけで旧root配置と推定しない。

同actor+commandは最初のoperationを識別する。既receiptを返すことと新payloadを受理することを区別し、kind不一致は拒否する。遷移で元入力が失われた後に「今回payloadとの一致を検証した」とはしない。payload一致も契約に必須とする場合は、operationのimmutable intentDigestを明示追加する判断が必要であり、applicationのメモリだけでは代替できない。

## credential版境界の比較

受付時のexpectedEpoch/settingsVersion等を一般的に更新して別操作へ付け替える方式は採らない。

| 案 | 利点 | 不足・影響 |
| --- | --- | --- |
| refreshを常に独立operationにし、元操作を新規受付し直す | 既expectedCredentialVersion一致を保ちやすい | 元commandのACK/再開を複雑にし、正常refreshで利用者確認をやり直す。元操作の無断置換は不可 |
| 受付版をimmutableな監査値として残し、HTTP owner stepの使用版を別に束縛する（推奨） | 同epoch/subの正常refreshで確認済folderや認可を失効させず、旧応答を厳密に拒否できる | 新専用CASと型/CHECK/mapper対が必要。全用途のexpectedVersionを更新する汎用APIにはしない |

推奨する概念型は次の限定union。保存形・field名は未採用である。

```ts
type CredentialUse =
  | { kind: 'none' }
  | { kind: 'bound'; ownerToken: string; version: number }
  | {
      kind: 'self-refreshed'; ownerToken: string;
      fromVersion: number; version: number;
    };
```

初回claimが現在actor/epoch/sub/settingsを照合して使用版を固定する。running/unknownの使用版は外部のrefresh結果へ自由に付け替えない。自己ownerのrefresh成功時だけ、同owner/from版一致、connection credential CASとstep証明を同Txで更新する。commit失敗なら新tokenを後続requestへ使わない。遅い401は使用版が現在版と一致する場合だけconnectionをneeds-relinkへ進め、旧版401で新credentialを失効させない。

closed preparedから明示された次stepへ進む場合は新claim tokenと現在使用版を固定する。旧stepの遅い結果を新claimへ採用しない。通常refreshはepoch/sub/settings/確認集合を変えず、認可code交換は旧access tokenを使用しないため、その受付の失効を単なるcredentialVersion増分に結び付けない。

## admission・確認集合の比較

現在S1のadmissionSequenceは認可begin自身やrefresh/Pickerでも進む。これを再連携確認値としてそのまま比較すると、自分の受付や通常refreshで再確認ループになる。

| 案 | 保存差 | 評価 |
| --- | --- | --- |
| 既admissionSequenceをfolder-select/createの新規受付だけの世代へ限定（推奨） | 列追加なし。全admissionのrowVersion CASは維持し、非folder受付ではsequenceを進めない専用操作へ分ける | 現0038はactualfresh未適用なので候補修正は可能。ただしS1の意味/DB対を変更するためManager採用・独立再確認が必要 |
| 現sequenceを維持しfolderAdmissionSequenceを加算 | connection列・VO/mapper/CHECKを追加 | S1意味は保つが似たcounterを二重に持つ。既rowVersionでもqueue直列化できるため現段階では第一案を推奨 |

確認対象は取消可能なlive folder-select/createのIDをsortした有限集合。terminalでもheld ownerなら除外せず、同IDの進捗/owner active→unknownだけで別集合にしない。件数だけで確認しない。beginにsequenceと集合digestを束縛し、採用直前に同一集合を再計算する。旧folder終了→別folder開始の同件数ABAはID差とsequence増分で検知する。保守的に集合減少も再確認とし、自分の認可受付・refresh・Picker待機はこの集合へ含めない。

新folderの受付だけがsequenceを進めるため、同じ集合への戻りも新受付があれば検知する。認可beginが新しいconfirmationを要求する場合は旧commandの確認内容を上書きせず、明示の新commandを使う。候補採用でfolder取消を確定するTxと確認照合は分離しない。

0038の旧保存証跡を書き換えたり再適用したりしない。意味補足を採用する場合は最新source/SQLの新synthetic根拠を別に取り、S1旧3DBの根拠範囲を保持する。未本体適用だから自由に変更できる、という扱いにはしない。

## current・close・有限取得・prune

純GETはaccount/session/authBrowser/connection/receiptの読取だけでcurrentを投影する。legacy sessionにbrowser bindingがない場合はGETでensure/bindせず、明示POSTの認証captureへ返す。既ログイン/ログアウト本体は変更しない。callbackやrunnerは保存contextのsession/browser/authVersionを前後で照合し、取消・logout・別actor・epoch変化後の結果採用を拒否する。

result Promiseの終了、abort送信、timeout、期限切れはcloseの証明ではない。cancel intentをTx保存→外側abort→実closed通知を照合→閉鎖更新の順とする。失敗結果でもheld/unknownは保持する。再起動で実前任終了を証明できなければunknownのまま枠を保持する。S2 fakeのclosedはOS close根拠ではない。

global取得の最小port案は以下。既account別historyを全account列挙へ流用しない。

- `listClaimable(now, cursor, limit<=100)`：attempt/controlの実行可能phaseだけ。createdAt、種別、IDの全順序、有限ページとcursor。待機candidate/Picker、held/unknownはclaim集合から除く。
- `listHeld(limit<=3)`：global2にoverflow検出1を加えた集合。cancel/close reconciliation専用で、unknownが先頭に居続けてもclaim候補ページを占めない。実行枠自体はunknownを含めglobal2/account1を守る。
- `listAdoptionReady`相当：closed candidateの採用待ちをHTTP queueと区別して有限取得する。新candidateが旧unknownを解消するためのHTTP枠を持ち続ける形にしない。
- pruneはattempt/control合計100/回。片方の100を二重計上せず残budgetを渡す。期限切れheldは消さず、閉鎖済terminalのcontextを24h後に消去し、その後90日historyを有限回収する。取得順の公平性はbounded cursorで確保し、無制限scanを追加しない。

disconnectは専用local fenceでHTTP queue枠外、live1/account。同Txでepoch/資格/attempt/candidate/関連controlを失効し、外側abortだけ通知する。未知ownerの枠は解放しない。Googleログインsession/identity、既Drive物、combined grantへのrevokeを変更しない。

### authBrowserの2種類のpin

`authBrowserRepository.ts` のcontext削除NOT EXISTSへ `drive_authorization_attempts` と `drive_control_operations` のbrowser参照を追加する。両実table名はS1 `driveSchema.ts` で静的確認済み。terminal直後にphase条件でpinを外さず、receiptのcontext保持中はpinする。Drive側の24h scrub後にだけ既auth pruneが回収可能となる。既session/Google/OpenRouter参照、100件budget、世代保持は変更しない。

## 有限の直接試験案

以下は実行前の集合案であり、今回のpass数ではない。まず型成功後、既S1のfake portと逐次DBを使う。実HTTP/native/browser/外部APIは0。新表の保存形補足を採用した場合は、S1のnormal/SQLfault/FKfaultを最新SQLへ束ねる別集合を事前申告する。

| 群 | 最小代表ケース |
| --- | --- |
| 認可6 | begin同command一回、callback一回、claims/scope/refresh不足、logout/epoch遅延、交換unknown非再送、candidate待機枠0/旧接続維持 |
| 版・確認6 | 自己refresh成功、旧401拒否、他owner版付替え拒否、begin自身/refreshで再確認不要、folder同件数ABA拒否、同ID進捗で集合不変 |
| folder6 | metadata正常/shared/key、shortcut明示target再照会、trash/404非代替、create事前ID+409、明示sameID追加1回、同sends新送信claim拒否 |
| 所有・取消5 | result先行close遅延、unknown枠保持、取消後遅い結果拒否、queue満杯disconnect/二重拒否、再起動前任未証明保持 |
| 読取・回収5 | 純GET副作用0/秘密0、他actor receipt非開示、Drive2種browser pin、24h scrub後回収、合計100/prune順/unknown非削除 |

上記28代表は実装のテスト粒度で分割し得るが、無断で実行集合を増やさない。既auth prune代表は新pinの直接影響だけ再検証し、全OAuthを反復しない。S1純型/保存対の変更部分を別に示し、28や全体unitへ重複加算しない。

予定資源は既S1同等の逐次active DB1/16MiB、総DB64MiB、material256KiB、other8MiB。保存3とactive1で開始できるかは実装許可時のactualを確認する。失敗DB保持後は最大数を超えて続行せず追加予約を申告する。今回新root・容量測定・fixture生成はしない。

## actual pathと旧条件の限定影響

| 編集候補 | 直接対応・再検証 |
| --- | --- |
| 上記新application6path＋既drive/current.ts | 新P5c-1-A/B/C/D/F。未接続UI/実HTTPのE完成とはしない |
| `domain/integration/{drive,driveRepository}.ts`、application drive/ports.ts、libsql driveSchema/repository、0038とそのsnapshot | 採用時だけowner-step/確認世代/合法phase/有限取得を補足。旧P5b-1-Aは加算保存/UoW共存だけ。旧LLMの意味変更なし |
| `adapters/libsql/repositories/authBrowserRepository.ts` | 旧P5a-C/G、P5b-1-Aのbrowser参照pin/有限pruneだけ |
| `adapters/libsql/__tests__/authenticationPrune.integration.test.ts`、Drive既pure/persistenceと新application tests/fixture | 上記直接正負。既期待の無関係な緩和0 |

S2で既認証交換、Google callback、session作成、OpenRouter connection、LLM owner/runtime、設定配備、presentation/UIを編集しない。S3が必要となるport差は本書の共有補足を先に採否判断し、stubで完成扱いしない。

## Manager判断待ち・返却境界

1. 独立が実証したS1 V1/V2は限定修正/負対を別委譲する。S2の追加設計と混ぜて修正範囲を広げない。
2. 通常refreshのowner-step使用版、folder限定admissionSequenceと取消集合digest、ready後再照会phase、有限global取得portを最小共有補足として提案する。保存field/DDLへの反映は採用後にexact差を申告する。
3. commandのfirst-request receipt契約で十分か、immutable intentDigestによるpayload一致も要求するかを明示する。未保存情報の一致を装わない。
4. S2の契約成功は実Google/Picker/HTTP close・配備・同bundle UIの成功ではない。実backup方針・音声未成立は解決扱いしない。

本書EOF確認後、文書を含む全read/write/runを停止してManagerへ返却する。S1候補・既proof・環境への操作は0、S2実装は未着手。
