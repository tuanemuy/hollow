# P5d credential caller の閉鎖契約案

P5d-E/F の早期秘密縮小防止と有限回収に必要な追加案。製品への追加 path は未採用・未編集。DB、provider、runtime、test は未実行。本案は HTTP ごとの別 proof を作らず、Node の正規 Google/OR provider と既 execution の組を使う。

## 閉鎖の境界

`node/auth/googleHttp.ts` と `node/openrouter/http.ts` は `agent:false` の自己所有 request/response/socket を finally で destroy し、各実 close を待ってから戻る。abort、timeout、attempt failed、Promise settled だけでは閉鎖にしない。Google provider の exchange/JWKS 読取と OR authorization exchange/inspect の全 native 呼出をこの正規 transport に限定する native attestation を、adapter 内 private WeakMap で provider instance と execution instance に結合する。公開 boolean、業務 state、偽 provider から attestation を生成できない。

execution が囲む範囲は reveal 前の exact use 保存から、provider work、結果採用 UoW、失敗保存、callback の最後の finally まで。Google `completeGoogleCallback` は現 exchange だけを囲む構造から全体へ移す。OR complete/retry は現 whole execution を維持し、`checkOpenRouterConnection` は credential reveal と inspect 後の採用 UoW も内側へ移す。callback 外へ credential/claims を返さず、戻り値は現有限 public result のまま。秘密文字列の JS メモリ zeroization は証拠にしない。以後使える caller を残さず、native handle の実 close と callback 終端を証拠にする。

## 最小保存型と opaque capability

0044 に `account_deletion_credential_uses` を追加する案。subject/email/credential は保存しない。

- PK use ID、provider `google|openrouter`、固定 operation `callback|retry|check`、owner runtime ID/token/generation、version、state `active|unknown|closed`、callerEnded、acknowledged。
- account 枝は account ID/authVersion と、元 attempt ID/version 又は OR connection epoch/version を reveal 前に同 Tx 固定する。actor、target、result の既 ID は exact 元 tuple と照合し、email から付替えない。
- 未解決 Google login は account ID NULL の専用枝。attempt ID/version と browser hash/epoch のみに束縛する。後で account 枝へ更新しない。採用時は既 identity/target/authVersion と新 use の元 tuple を同 Tx 再読する。
- closed proof は private WeakMap に execution/native provider/exact use tuple を保持する opaque object。same registry の exact saved closed/callerEnded/version を検証してから ACK。DB commit 応答不明は proof を保持し、次 wake の saved 同値再照合で consume/ACK。DB 不一致・不明では保持する。
- closed/ACK 保存後に account deletion worker が実 use を解放する。通常 attempt prune は active/unknown と未 ACK use を削除できない。unknown から closed への保存は同 proof 又は以下の exact predecessor capability のみ。

retirement port は既 `AuthenticationExecution` と `OpenRouterControlExecution` の型安全な owned 枝へ限定し、従来 `run(work)` を許す legacy/fake 枝を閉鎖証明として扱わない。account deletion は owned 枝が欠けると held/debt を保存する。ordinary provider 全機能の汎用基盤にしない。

## 退会と遅採用

account 枝は deleted/authVersion fence 後に claim/reveal/refresh/adopt 不可。owner の正規 close、失敗保存、exact proof ACK は許す。退会 worker は caller pending、active/unknown、closed でも未 ACK の use があれば関係する Google/OR copies を回収しない。その他の table/page は進める。

未解決 login の account は推測しない。全未解決 Google use を finite keyset で閉鎖/ACKするまで Google identity と Google copy 縮小を global debt として保留する。subject UNIQUE identity が残る間、旧 callback は退会済み旧 ID に出会い active projection を得られず、メール再登録者へ自動接続しない。use 終端後も元 attempt が deleted actor/target/result 又は missing なら reject。新登録・新認証は新 attempt/ID を使う。

## 停止・再開と legacy

正常 return は native transport close と callback finally を両方待ち、closure DB CAS→saved 再読→opaque ACK を一度行う。未知結果は取消を閉鎖へ代用せず use unknown/debt を残す。same process の stop は admission fence→abort→全 callback finally/native close 待ち→exact saved closure/ACK の順。pending use は有限一覧（既 execution 同時上限4）から再照合する。

process crash 後の復旧には **正規 acquire を use claim 前に durable 保存した runtime ownership と、exact predecessor の実終了を確認した opaque capability** が必要。PID 不在、lease expiry、他 service の runtime ID、schema 文字列だけでは代用できない。この acquisition/provenance が現 Google/OR execution には無いため、ここは追加採用が必要な依存である。Node の既 runtime ownership の regular/no-symlink/mode/exclusive/fsync と acquire-confirmed predecessor 方式を再用する限定 credential-owner adapter/factory 配線を提案する。unknown 復旧は元 owner tuple 不変の owner-closed→closed-use CAS を同 Tx で行い、commit 応答欠落は保持 proof の saved 同値で収束させる。

legacy attempt に保存 use が無いことを never-owned 証拠にしない。移行境界では現 execution/native callback を admission fence して正常 stop/全 native close の実証後に、その停止対象の有限 exact attempt 集合を migration/ownership provenance へ束縛する。それが取れない行は legacy-unproven debt とし、この候補の cleanup succeeded を拒否する。TTL や permanent retain を完成へ数えない。移行・crash の正規 provenance が採用されるまで P5d-E/F は未完成と報告する。

## exact 追加候補

既正式集合内の `application/account/google.ts`、`application/integration/openRouter/connection.ts`、deletion port/repo/schema/worker と0044に接続する。追加候補は以下。新 runtime ownership adapter/factory exact path は設計採用時に別途固定し、未編集とする。

- `packages/core/src/application/account/ports.ts`
- `packages/core/src/domain/account/ports/authAttemptRepository.ts`
- `packages/core/src/adapters/libsql/repositories/googleAuthAttemptRepository.ts`
- `packages/core/src/adapters/node/authenticationExecution.ts`
- `packages/core/src/adapters/node/auth/googleOidc.ts`
- `packages/core/src/application/integration/openRouter/ports.ts`
- `packages/core/src/adapters/node/openrouter/provider.ts`
- `packages/core/src/adapters/node/openrouter/execution.ts`
- `packages/core/src/adapters/node/auth/googleHttp.ts`
- `packages/core/src/adapters/node/openrouter/http.ts`

主要観測は native/fake 結合拒否、callback 採用 UoW 中の退会、OR check 採用 UoW中の退会、close 未到達、ACK 保存応答喪失、未解決 login/再登録、legacy unknown 保留、exact predecessor 復旧。後日の新有限 fixture に限定し、実 Google/OR 接続・秘密・既DB・旧root・runtime 起動は0。本報告作成後も上記追加製品 path の writer は0。
