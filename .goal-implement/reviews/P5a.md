# P5a 独立検証

## 現在の要約

固定20条件はすべて合格と判断する。製品不具合・未判定条件・追加再open提案はない。最終環境証跡は2026-09-28 00:25:26.756 JST。独立Node40+54（別run、計94）、66 unit、移行正常/2故障clone、同bundleの代表契約UIと代替DIなしdefault bootを確認した。全unit1364・型/lint/format/buildと一部の主実UIは明示借用であり、全20を独立実UIで反復したという意味ではない。実Google/TLS/外部メールは未実行・未許可で、今回の契約検証合格を実接続完了へ拡張しない。

新専有領域 I は `/Users/hikaru/.local/share/hollow/verification/p5a-independent-20260928-RbrMRW`（0700）。既存freshは起動していない。I/contract の新空DBへ通常移行し ledger33/FK0/accounts0を確認、新合成credentialはalpha/gammaの2組だけ。現在2account/2Googleidentity/4session、WS/note/member/object0、FK0。既存11accountの方法・秘密は変更なし。契約runtime PID37580/session14771、default boot PID40914/session36029はいずれも自己cwd確認→TERM1回→closed/exit0。自己4browserは個別close済み。

## 開始照合

- 00:04:44.597: HEAD `6e3401108ead1880e5c0c57aa666e826993321ea`、source1171 `f0a58c7456da53556d26173bd4e719f8913c55801485a12cf323b952848aaeaf`、全manifest entry差0、lock `613e2f8c70aeb34101c644c52884f7a75e5fa2d642bef51cb2cececee425e498` 一致。秘密path guard後、symlink非追跡・管理領域除外で検算。
- 00:04:51.158: readonly監督checked closed=true。停止下保全のguardでports3000/3001、fresh DB全sidecar handles0。
- 00:04:57.515: I/start、15files3809B、manifest `95141ec6059bf8f9d58ed8cd27df98131e458d76394c5fdf5576aec2a29213f3` が主finalと一致。原本へのdriver接続なし。
- 00:05:48.238: dist6964全entry差0、aggregate `74a0f7165e25e9d0abf9c80c9b637e5af526399fb0b22fc605c3c2ba512e51de`、bundle `b069f214021c8fc0a6211e8c400c95bea621b9db7b85aec2067e116405e46e61` 一致。

時刻は各JSONの実測値。Managerへの初報にあった「00:09頃」は概算が先行した誤表記であり、完了時刻には採用しない。

## 独立再実行と適用範囲

I/node-tests.json: authSchema14、authenticationMethods14、authenticationPrune3、googleAuthentication9の40/40。I/unit-tests.json: native OIDC41、config23、execution2の66/66。全終了exit0。既存試験の独立再実行であり、新規試験ではない。Node対は自己隔離DB、native HTTP対は自己loopbackと自己署名。実Google/TLSの保証へ拡張しない。

主の全unit1364・型/lint/format/buildは借用であり独立全量実行ではない。関連Node94は後述の40+54別runで独立再実行した。補助OIDC報告の旧no-cache拒否記述は最終sourceと異なる履歴であり、現sourceのfresh keys一操作利用・非保存を読解し66対で確認した。

## 固定20条件の判定

根拠略号: N40＝独立schema/methods/prune/Google usecase40対、N54＝独立HTTP4＋既hollow/invitations/invitationLimits計54対、U66＝独立nativeOIDC41/config23/execution2、M3＝独立旧DB clone正常/2rollback、V＝下記独立契約実UI/default boot、D＝独立製品コード読解、B＝固定同bundleの主実UI・規定checks借用、O＝実変更外の先行受入維持。主補助の報告は実装補助であり独立Verifierとは扱わない。

| 条件 | 判定 | 根拠・今回の範囲 |
| --- | --- | --- |
| P5a-A | 合格 | D内向きmethods union/専用CAS/insert-only保存、N40最後の方法/stale保存/shape、M3旧全列/FK/ledger/171trigger、fresh開始・最終91表差0。偽passwordなし |
| P5a-B | 合格 | D issuer/sub優先→email初回候補、N40新規/authoritative/third-party/unverified/競合・email変更、V alpha proof前非発行/gamma Google-only。利用者の追加本人確認決定を必須として照合 |
| P5a-C | 合格 | D purpose/固定期限/actor版/epoch/一回性/許可戻り先/秘密投影、N40 ABA/不明一回、N54遅いcookieとbrowser fence、U66実RSA/claims/有限HTTP、B同bundle別タブABA/late response。実Google未検証 |
| P5a-D | 合格 | N40 password/mail別目的・元binding・同Tx一回消費/期限・再送、V mail GET未signin/別browser拒否/元browser確定。通常AC-02の別browser許可はN54＋B、Google追加proofと混同しない |
| P5a-E | 合格 | N40方法並行解除/同sub期限proof/変更・reset・他sessionと固定expiry、V最後の方法disabled/390再認可→password追加。B通常変更/解除confirm/reset/他端末signoutの同bundleUI、D Drive/全sessionをGoogle解除と混同しない |
| P5a-F | 合格 | V通常登録/Google入口/追加proof/方法管理/390keyboard/未構成default password、D新UI pending/error/ticket/元招待selector照会、N54招待認証・共通fence。B reset/unknown明示再開/招待明示参加/他端末signout。旧dirty・actor全行列はOで維持 |
| P5a-G | 合格 | U66 actual request/response/socket close・cache/no-store・鍵保護/サイズ/encoding/署名、N40/N54 race/期限/不明/ABA/終端/prune、D開始5/10m・active3・hash2/HTTP4queue0・mail60sとdocs条件付き実接続。自然全OS/実TLS保証ではない |
| P5a-H | 合格 | 独立再実行/新限定UI/旧全列容量FTS保全/最終指紋と停止。B最終type/lint/format/unit1364/build。自己2accountを保護保持、破壊対象0、外部送信0 |
| P1-A | 合格 | V通常password登録→同browser確認→認証成立、default boot signin、N54通常verification一回/別browser/expiry/既存保存/失敗制限・固定30日、B fresh旧owner通常signin/read/signout。M3 account/session旧値保持 |
| P1-D | 合格 | N54二利用者notes read/write拒否・close/reopen永続化と新cookie移植/欠落/epoch拒否、D共通fenceがresource guardの後・保護処理の前。B同bundle2利用者private noteの互いの拒否。独立UIにnotesを追加していない |
| P1-E | 合格 | V同bundledefault boot・通常ローカル確認・390操作、D Node配線/admission停止→auth runner/実HTTP/hash drain→他worker/DB、M3通常migrationとFK復帰、B全規定checks/build。不変shell/dirtyはO |
| P3b-1-B | 合格 | D招待signupの同Tx epoch発行・Google return selector/continuation再照会、N54既存招待signup/explicitjoin/一回consume/receipt境界。B同bundle招待A/B入替拒否・元招待明示参加。独立新WSを増やしていない |
| P2d-2-E | 合格 | 今回は0032による旧列/FK/trigger保全のみ。M3・最終比較・objects/容量/FTS一致、その他O |
| P3f-H | 合格 | 同上。旧deleted最小shell/負債を含む全旧列・171trigger保持、主finalからの91表184trigger差0。旧削除workerはO |
| P4a-H | 合格 | 同上。共有/版/receiptを含む旧全列とobjects/容量保持。旧共有UI/rate/鍵はO |
| P4b-G | 合格 | 同上。旧export寿命/認可/負債行を含む旧列/FK/trigger保全。HTML/MD serializerとUIはO |
| P4c-K | 合格 | 同上。旧profile/公開/holding/receiptとFTS8253の保全。公開検索/URL境界はO |
| P4d-2-A | 合格 | 同上。旧PDF request/compute/artifact/deliveryの全旧列/FK/triggerを保持。旧renderer/worker/ACK/UI行列はO |
| P4f-1-A | 合格 | 同上。旧ZIP親/run/固定target/attempt/spool/assembly/artifact/deliveryを保持。writer資源行列はO |
| P4f-2-A | 合格 | 同上。第三需要/binding/hold/期限/nullable互換の全旧列/FK/trigger保持。旧実PDF ZIPの成功/初回unknown原因未確定の区分はOとして変えない |

## 独立コード確認の要点

`domain/account/authentication.ts`は認証方法0をunionから除き、login/link/reauth、challenge目的、attemptの秘密/完了状態を区別する。`accountRepository.save`はinsert-only、変更は専用authentication repositoryのauthVersion CAS。`methods.ts`は二解除を同Txの現在版とlast-method guardで拒否し、追加は同sub/current actor/proof/version、変更は元hash確認後current context再照合。変更は他sessionだけ、resetは全旧session削除、unlinkは方法だけでGoogle Driveには触れない。

`google.ts`はpending→exchangingをTx内CASで一回claimし、外部交換はTx外、戻りをcurrent attempt/browser epoch/actor/session/authVersion/expiryで再照合する。署名済issuer/sub既存identityをemailより先に解決する。third-party既存対象はproof-requiredへ止め、password又は別purposeのmailだけを`proof.ts`から同Tx確定する。追加mailはparent/claims期限以下で再送延長せず、`accountChallengeRepository.insert`が同account/purposeの旧challengeを消費済みにする。通常verificationとは別表・目的である。

`authenticationHttp.node.ts`はcallback GETの後、コード/stateを含まないresult IDだけへ303しno-store/no-referrer、重複/過大code・browser欠落を拒否。`fenceAuthenticationRequest`と`findSession`のcurrent epoch joinが、遅いSet-Cookieでも認証を復活させず別browser転用も拒否する。拒否時は当該requestのsession cookieだけを外し、元browserのDB sessionを削除しない。新bootstrapは既epochを巻き戻さず、旧NULL bindingのsessionは期限を変えず一回bindingする。

`googleHttp.ts`は固定token/cert URL・agent=false/retry0・identity encoding・有限body、取得直後の各close listener、destroy後にrequest/response/socket全終了を待つ。`googleOidc.ts`はRS256/kid/issuer/aud/azp/nonce/時間/verified email、unknown kid一操作一refresh、共有refresh、provider鮮度/6hを確認し、失敗時の旧cache fallbackはない。no-cache/no-store/不正max-ageの新取得鍵は当該操作だけ利用し保存しない。U66の期限対は人工timer進行と実loopback終了の組合せで、実Google10秒経過の観測とはしない。

設定/秘密保護は16KiB/32B、専用0600・親0700・O_NOFOLLOW、AAD attempt/mode/browser/epoch、元例外causeを露出しない境界。実秘密の読取を検証手段にはしていない。HTTP4/password2の枠は基礎Promise終了まで保持し、timeout/abort要求を終了としない。pruneは有限行数、旧legacy sessionを削除せず、exchangingは固定期限まで保持。旧proposalのboot一括recover/gaxiosは採用コードにない。

`useAuthenticationOperation`のmount/revision/route/actor epochと、GoogleEntry/Result/Forms/Methodsの返却時valid確認を読解した。新操作の古いcallbackを共有state/遷移へ適用しない。未知交換は保存結果GETと明示新開始だけで自動code再交換がない。招待returnは固定selector/continuationとlandingを再照会し、membership作成は既存の明示参加へ残す。旧dirty保存・全actor/UI行列を新実証したとはしない。

## 借用・未検証の境界

主P5aのcandidate/build-applicability・20索引と最新証拠を照合した。旧gaxios close失敗、旧no-cache拒否、途中schema/clone-v1は最終成功根拠に混ぜない。主全unit1364と規定checks/buildは借用、最終追加integration testは独立N54を含む現在94対で確認した。現在bundleは独立開始/停止の双方で一致し、主同bundleUIのreset/解除/他端末signout/unknown/ABA/招待・private読取を狭く借用できる。

未検証は実Google/TLS/consent設定/外部メール、別uid・全ancestor/全OS/ACL・自然HTTP全障害・最大負荷・分散DB競合、主旧dirty/actor全行列の独立再演。これらを今回の契約合格に含めず、追加gateにもしていない。実Googleとmailは`docs/google_auth_node.md`の承認・専用運用設定・通常bootでの条件付き手順が残る。P5全体やアカウント退会/Drive/LLMが完成したとはしない。

## 最終保全・返却

freshは独立検証中に一度も起動/移行せず、原本driver-openもしていない。I/finalは00:24:28.842、final-comparisonは00:24:34.113、final-details-independentは00:24:42.866。91表826列全row・184trigger・旧ledgerの差0、FK0、11account/62session/103notes/111revision/32tag/9original/2asset/15memberを保持。20scope使用量差0、FTS8253→8253。全15files3809Bのmanifestは開始と同じで通常12objects3107B＋既runtime3files702Bを保持した。

主phaseでのauth_browser_context1追加、期限切れclosed delivery1のpruneは主finalより前の正当差であり、今回の独立操作で起こした差ではない。今回fresh開始→最終は全旧row差0。移行cloneの88表783列は旧ledgerを含み、現在監査91表826列はledger/sequenceを除外するため包含範囲を混同しない。

I/final-seal.json（00:25:26.756）のHEAD/source1171/bundle/dist6964/lockは開始値すべて一致、全source/dist entry差0、製品dirty0。ports3000/3001・全fresh配下handle・全I配下handleは0、I/final-ownership.jsonで監督closed=true。実行した2runtimeは正常closed/exit0、4自己browserは個別close済み、単発exec未回収0。キー様値の過去chunkや広域process情報を探索していない。

自己contractはI/contract-final-v2とさらに別auditで2account/2Googleidentity/4session/notes0/WS0/member0/object0/FK0。専用2credential・2鍵・local mailはI/contractの保護領域へ保持し、値/個別hashを証拠へ出していない。退会・領域全削除は行わず、物理削除0、backup復元未実施。個別testsが作成した再生成可能な合成tmpの回収は既存teardownの範囲だけ。

報告全文確認後、コード・proof・環境・文書の全読取/書込/実行を停止し、環境所有をManagerへ返却する。

## 独立実UIと追加監査

主の公開helper4本と必要2本についてManagerの明示許可でソースを確認し、自己copyのnamespaceをp5a-independent-rbrmrwへ変更、credential生成labelをalpha/gammaの2組へ限定、各操作のChrome HTTP UAを明示した。旧credential/DB/key/mail/browser状態は複製していない。製品bootと同bundleは変更せず、contractClaims/provider/local mailをtrusted DIで置換した契約UIであり実Googleではない。

- alphaを通常password登録/規約同意し、同browserでAC-02のGET→確認POST→方法画面へ。password-only・最後password解除disabledを確認。
- 別の新browserからalphaの第三者email Googleログインを開始。追加password/mail proofが必要で、proof前にsession未発行。確認mailを送信後、元と異なるbrowserの確認POSTは「権限がありません」で拒否。
- 元browserで同mail GETを開いた時点はsessionCookie=false/browserCookie=true。明示POST後は方法画面でpassword/Googleの両解除ボタン有効、bothへ遷移。GETを消費と数えていない。
- gammaを通常Google入口から新規作成。Google-onlyの最後Google解除disabled、パスワード追加はGoogle本人確認だけ。390x844へ変更し、同sub選択後Tab/Tab/Enterで認可、期限内に2入力→通常追加、両方法へ。
- 代替authenticationFactory/mailerを渡さないdefault bootでGoogle入口0・未設定案内を確認。新たな自己browserでgammaの追加済みpasswordを通常入力し、方法画面まで到達。旧fresh ownerの変更・再signinはしていない。

proof確定後のbatch内networkidle待機が1回timeoutとなった。全execを回収し、次の現snapshotでログイン方法画面の両方法を確認した。待機timeoutを成功とはせず、現UIの成立を別観測として採用。Node絶対pathの一度の転記欠落は起動前exit127、製品/認証の失敗根拠から除外。

00:13:34.100のI/start-comparison.jsonは、主P/finalとI/startからさらに別copyを作り91表826列全旧row差0、184trigger全保持、ledger33/旧ledger欠落0/FK0。直接driverで原本を開いていない。

00:15:53.852のI/clone-v1/results.jsonは主P/start（ledger32）の新排他保全copyから更に3copyを作成し、現0032 SQLとpublic client.migrateで実行。正常はledger33/新4表、途中SQL故障・末尾FK故障はledger32/新表0へrollback。3対とも旧88表783列（ledger1表3列を含む）の値差0、旧171trigger保持、FK ON/FK0。schema14のCAS対とは別証拠で、00:09概算通知の「移行rollback」を40Nodeに含めた表現は撤回し、この追加clone3対へ正しく対応する。

独立追加4 Node file54/54（I/http-legacy-tests.json）は実loopback callback/fence4とhollow/invitations/invitationLimits。94は40+54の別実行合計であり、単一runの全量Nodeとは呼ばない。HTTP代替provider/protectorの対ではheld成功Set-Cookie→signout→旧cookie到着の非復活、cookie移植/欠落/重複拒否、legacy一回binding、code上限/重複拒否を確認した。nativeGoogle adapterの実closeは別の66unit内41対。

00:14:03.661のcontract-finalは最初の契約UI停止時checkpoint。初版summaryのobjects=1はwriter markerを含む直下entry数、workspace_membershipsは存在しない表名だった。最新00:17:30.153のI/contract-final-v2/別auditが正本で、正しいworkspace_members0とwriter marker除外objects0を確認。2account/2identity/4sessionと専用secret/materialを0700/0600領域で保護保持、自己削除0・復元0。古いcheckpointを最新とはしない。

## 完了確認

上記の判断は固定20条件だけに適用する。独立レポートの全文通読、実時刻・借用区分・自己fixture・最終停止の整合を確認して返却する。製品/管理正本の変更0、外部操作0、未回収exec0。以後の操作再開はManagerの正式委譲まで行わない。
