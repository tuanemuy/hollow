# P3b-1 独立受入準備

文書だけの受入matrix。P3b-1-A〜Fの全観測は未実行で、製品の合否を示さない。実装中source、DB、browser、helper、test、build、key、env、git、hash、固定資材は調査・操作していない。環境所有はImplementerのまま。本書だけを編集し、正式候補の委譲を待つ。

## 正本と範囲

[plan P3b-1](../plan.md#p3b-1-招待参加メンバー一般設定)、[design P3b](../design.md#p3bの招待メンバー設定)、[brief](../brief.md)、[P3b契約・補足全文](../phases/P3b-contract.md)、原文[WS-01/03〜07](../../spec/scenario/workspace.md)と[AC-01/02/04](../../spec/scenario/account.md)を照合した。契約初稿の「候補」は、採用済みdesignとplanに従って読む。

P3b-1は実招待から参加・メンバー管理・一般設定へ接続する段階。P3aのrole DB fixtureは、実参加UIの代用にしない。アイコンはP3b-2、公開中slug警告/旧公開URL失効はP4、外部メール到達はP5に残す。Q1のpublic/link独立policy、Q2の移動、Q3の容量は再決議しない。

goal-implement/manager-loopに従い、受入条件の出所を各観測へ付ける。doc-style/markdown-styleは計画の重複を避けるために使用する。spec/spec-implement、goal API、全体管理文書の変更は行わない。

## 実行順と最小対象

1. 固定候補の識別、自己online backup、全旧列/object/各scope容量を確保する。秘密の値を取得・出力せず、設定の有無・保管権限・対象識別だけを確認する。
2. Aが新しい自己WSを作り、実招待からB owner、C editor、D viewerを参加させる。同メール新規、既存signin、異メール参加をこの導線へ配分する。
3. 一つの自己noteに本文・小媒体・原本・保持履歴を準備し、C1の他actor競合、role変更、除名/脱退、最新回収、残member正常対を重ねる。別WS/別actorの小jobを非影響対にする。
4. DB/portで期限・rate・二重consume・lastowner・配送・job ABA・秘密寿命を確認する。本体へ大量行や巨大ファイルを投入しない。
5. 一般設定の二者競合、390px/keyboard、同key通常再起動、最終保全と全自己操作終了を確認する。

新規/既存未確認account、期限切れ/旧世代招待、51件のmetadata、有限配送の故障は隔離DB/clock/目的別adapterで作る計画とする。実用browserで4accountを招待から参加させた証拠と、合成役割/clockの枝を報告で分ける。新規signup確認省略を、既存accountへtokenだけでsessionを発行する手段にしない。

## A〜F 観測matrix

| ID・出所 | 正常・拒否・競合の最小対 | 必要な観測場所・合格基準 |
| --- | --- | --- |
| P3b-1-A / WS-01/03/04、招待世代・rate risk | 作成直後と設定から3roleを招待。owner付与は説明/確認、未確認flag・非owner直接command拒否。local mailとownerの明示copy、保留/送信失敗/期限/失効/取消/再送を分離。正規化重複・既memberは非送信、既pendingは新世代再送。 | 実UI＋local mailboxとDB。受付失敗で入力保持、受付後の配送失敗を未受付へ戻さない。copyは現在owner/有効現世代だけ。tokenや本文を一般reportに保存しない。 |
| P3b-1-B / AC-01/02/04、WS-04、認証復帰risk | 招待GET/reloadで未参加・未消費、明示join/declineだけ終端。同メール新規は規約/password検査後verified/sessionだがまだ未参加。異メールは通常verification、未確認sessionなし。既存verified/unverifiedは確認省略・password省略login不可。異メールsigninは相違確認の取消/参加。 | 実招待→signup/signin→同じ確認→joinを複数browserで通す。DBでは同/別accountのconsume競合と応答喪失を確認。成功者の現在membershipがある場合だけ「参加済み」へ回復し、既memberのroleを上書きしない。 |
| P3b-1-C / WS-05/06、lastowner/owner-loss risk | ownerが他memberを変更/除名、本人が確認して脱退→個人。非owner画面はreadonly/server拒否、自role変更拒否。2ownerの相互降格/除名/同時脱退で少なくとも1ownerを維持。発行者owner喪失で未使用招待を失効、復帰だけでは復活せず残owner再送で新世代。 | 実UIで説明・取消・pending/rollback・再訪。lastowner競合は実UoW。名前/メール/role/参加日を現在値で表示し、不明を創作しない。note creator/uploader/本文/版/pin/chargeは変更しない。 |
| P3b-1-D / WS-05/06、ED-08、JB、C1/ABA risk | 実参加B/Cで同note保存→他actor exact確認→確認後さらに更新→再確認。C降格/除名/脱退後の次save拒否・latest回収。editor→viewerは閲覧を保ち編集だけ拒否、除名/脱退はmembership閲覧も拒否。旧job失効→再参加→旧lease不採用、新job正常。 | 本体でlatest title/html/mode/hintの退避/4keydownload・reload回収・同ID回復、Bが同note/原本/媒体を利用する対。DB/遅延portでconversion/referenceの遅い結果、兄弟・別scope非影響、既fence purge継続を確認。 |
| P3b-1-E / WS-07部分、P3a入力/設定version | ownerがname/description/slugを保存しscope表示・一覧・設定へ反映。空名/不正/予約語/重複と代替、取消/通信失敗入力保持、非ownercommand拒否。二者が同設定versionを開き、一方保存後の旧formが新設定を上書きしない。 | 実UI二者＋DBの現在owner/expected version。一般設定の変更でnoteの本文/title/display/updatedAt/revision/pinを変えない。role変更は一般設定versionと何を共有するか固定候補で説明を照合し、独自に一律version一致条件を増やさない。 |
| P3b-1-F / CLAUDE.md、秘密/有限配送/移行risk | 永続key/用途別envelope、同key再起動、鍵なし/誤keyのfail-closed。通知欠落/重複通知/旧世代worker/finite retry/local同delivery重複防止。旧DB/objects/charge・joinedAt由来の移行を保全。 | コードと目的別port/隔離DB、local mailbox実adapter、本体通常再起動・clone。型/依存方向/UoW外I/O/境界/React pending、同bundleのmulti-account/keyboard/390pxと自身の画像確認。規定試験の最終source適用を照合する。 |

## 招待・認証の小さい境界対

### 世代・受付・期限（A/B/C）

- 同request同内容の二重click/受付応答喪失は1受付・1課算へ回復。異内容同IDは拒否。別ownerから同宛先へ競合してもactive招待・現世代は一つ。既memberのroleを招待値に変えない。
- 正規化後10/11宛先、WS100/101・actor20/21、同宛先60秒直前/一致を隔離clockで確認。actor窓は別WSへの送信も含め、枠不足の一括要求は部分変更しない。失敗/取消・履歴pruneで窓内の枠が戻らず、内部retryでは増えない。
- 14日直前と一致、改ざん、取消、decline、使用済み、再送旧token、削除WSを区別する。cron未到達でも期限切れは参加/copy不可。再送の14日は新発行時起算、旧tokenを延命しない。
- 発行者owner→editorでは未使用招待が失効するが、その人物のnote編集権限は残る。owner復帰だけで招待を戻さず、残ownerの明示再送で別世代として使える。既accepted membershipを未使用招待の失効へ巻き込まない。
- member一覧と保留/期限切れ招待の50+1・同時刻cursorをDBで確認し、古い未完了へ再訪できるUI入口を少数の代表で確認する。単に最新100件が表示されるだけを回復成立にしない。

### 認証と明示参加（B）

- 新規同メールsignup成功後、account verified/sessionあり・membershipなし・招待pendingを確認してからjoinする。規約未同意/不正passwordは拒否。password hash待ち中の取消/期限/再送でも半端な確認済みaccountを作らない。
- 既存同メールへの再signupは、verified/unverifiedのいずれも通常AC-01の存在非開示応答と案内を維持する。既存未確認をinviteだけで確認済み/loginへ昇格させない。通常signinの未確認/再送・共通誤認証・throttle/lockoutは変更境界の狭い回帰に留める。
- 異メールsignupは確認前sessionなし。同browser確認から招待へ復帰する対と、別browserでは確認だけ成立して自動loginせず、signin後linkを開き直す対を取る。異メールjoinの確認取消では消費しない。
- 参加成功応答喪失と、新規account作成成功応答喪失を別にする。前者は同account/現在membershipで参加済みへ回復、後者はtokenで再び自動sessionを作らずpassword signinで回復する。
- continuationはbrowser-bound、発行24時間とinvite期限の早い方、非sliding。古い世代/期限/別browser/任意URL/古い復帰応答を拒否し、新しい招待選択を上書きしない。期限切れでaccount自体を消さず、元linkからやり直せる。
- 既memberの明示joinはrole不変でtoken消費。別accountの使用済み表示に成功者のprivate member情報を出さない。同じ利用者が脱退した後、古いaccepted linkだけでは再参加できない正常な拒否対を含める。

## 現在権限と非同期結果（C/D）

実role変更は新自己対象だけで行う。A/B owner、C editor、D viewerという参加結果をUIから作り、その後の変更に対してDBと画面を観測する。

| 操作 | 失効するもの | 維持する正常対 |
| --- | --- | --- |
| owner→editor | owner専用設定/招待、当人が発行した未使用招待 | note read/edit、編集権限を失っていない当人のnote job |
| editor→viewer | note edit、対象actor/scopeの旧conversion/reference採用 | viewerとしてcurrent/history/原本read、他actorの仕事 |
| 除名/脱退 | membership由来のapp read/edit、旧job採用、旧linkによる再参加 | WS note/creator/uploader/版/pin/charge、残memberの同じデータ利用 |
| 再招待から新規参加 | 旧終端job/旧leaseは復活しない | 新参加時刻・新権限による新job/現在read/edit |

current/historyの正確な参照/pin、draft作成者限定、原本非uploaderの現在roleを、P3aの方式で狭く確認する。失効後Range/HEAD/不正Rangeで認可を迂回しない。全codecや全歴史pin規則を再証明しない。Q1の公開・有効共有linkは独立policyであり、membership失効を元member blacklistや共有link一括取消へ広げない。

job ABAは、旧running試行を保留→権限失効→新招待/join→旧結果解放の順で取る。単に再参加直前の現在roleがfalseだったというassertでは足りない。旧lease/世代の拒否と、新試行の成功を対にする。失効に伴うoriginal activeJob・初回display・reference objectの終端/cleanup/chargeを確認し、無関係なactor/scopeを巻き込まない。同値role更新やcommand再実行で新jobを取り消さない。

未開始empty admissionは現在権限で拒否し、既fence purgeは完了まで継続する。これは取消方式・write claim/FDの再設計要求ではない。大量jobを全配列へ持ち込む実装かどうかは採用resource riskとしてコード/件数根拠を確認し、未採用の厳密時間SLOは足さない。

## 配送・秘密・保全（F）

| 境界 | 最小観測と合格基準 |
| --- | --- |
| key保管 | path設定・専用0700/0600・既存keyを上書きしないことを値非出力で確認。key bytesをargv/log/report/fixture/commitへ出さず、repo/DB/object/mailboxと別に保管する。今はkey生成/探索しない。 |
| envelope | hashによる認可検索と復号による明示copy/配送を分離。用途・invite ID・generationを変えたenvelope、誤key/改変を拒否。同key再起動で同delivery/copyが成立する。暗号方式の公式根拠は正式候補で照合し、今回は方式評価しない。 |
| key不可 | 招待の秘密依存処理は構成エラーでfail-closed、平文/固定key/毎起動新keyへfallbackなし。通常auth・秘密不要の取消/member操作まで停止させない。構成待ちでmail attemptを消費せず、設定回復後の通常再起動から再開する。 |
| durable delivery | outbox encode/decode/dispatchとwakeを確認。wake欠落/重複・再起動でもDB正本から回復。localの同delivery・同payload再配信は同一配送物で、別世代は別配送として扱う。一般event/log/snapshotにtoken/メール正文を複製しない。 |
| 競合と期限 | 送信直前/commitの世代再確認、取消/owner-loss/再送後に旧workerを解放して旧token利用不可。既に配送中のメールを回収できたと主張しない。30秒I/O/90秒lease、初回I/Oから24時間以内/最大6回、前失敗から1/5/15/60/240分を隔離clockで確認する。 |
| 失敗と手動回復 | retry上限後はfailed・copy/明示再送の導線。delivery失敗でも有効tokenの14日は独立して使える。明示再送は新世代/rate課算、内部retryは同世代/追加課算なし。外部到達exactly-onceや全provider送信成功は主張しない。 |
| secret寿命 | sent中の有効copyに必要なenvelopeを維持。accepted/declined/cancelled/owner-loss/supersessionは同Txで削除または参照不可。期限は即read拒否＋bounded sweep削除。terminal最小metadataは世代ごと90日、旧世代再送でTTL延長なし。90日後invalidでもaccount/membershipを消さない。 |
| receipt/rate寿命 | actor/request/payloadの24時間receiptとrate窓を分離。異内容再利用拒否、期限後は現一覧から新要求へ。履歴削除で窓内rateを戻さず、窓外行だけ有限cleanup。 |
| clone/旧保全 | 正式候補開始時の全旧列・object・現在個人/各WS chargeを別snapshotで保全。joinedAtは裏付けのある旧creator由来だけ、他はunknown、displayName未設定は代替を明示。移行日を参加日と捏造しない。 |

## 既存根拠と終了時の記録

P3aの受入済み現在scope/複数role DB/原本・媒体/companion容量、C1/C2/C3の保存・20版・latest退避、P2dのclaim/既fence/有限readは、実変更のない責務で保持する。今回再検証するのは実招待/実membership変更からその既存契約へ到達する境界。P3a-V1 CSSの修正検証は別委譲であり、本書に合格結果を追加しない。

P3a終了受領値は629notes/68assets/987revisions/snapshot123/nonactive11、旧447objects保全、2予約104B自然解放、自己新3原本137B削除という記録。本書では再集計していない。正式P3b候補では、P3a修正後に増えた行/objectも含む新inventoryを保全正本にする。未送信59Bの通常期限後cleanupはexact行・時刻・chargeを記録し、古い総数だけを固定期待へ使わない。

正式reportはA〜Fと実変更した共有IDごとに、実UI/隔離DB・自分の実行/借用・未確認を分ける。元要件・採用risk・規約に対応しない追加観察を必須差戻しにしない。秘密値を含まない再現順、開始終了識別、旧保全、自己対象の変更量、自己browser/hooks/listener/exec終了、production引継ぎを揃える。

## 判断事項と停止

現時点で、採用designと原文の明確な矛盾、新しい必須gateの提案はない。契約初稿の配送時刻「相対予定」は、designの「前の失敗確定から」に従う。icon・公開slug URL・外部メール未接続はplanに明記された段階分割であり、P3b-1の不足へ繰り上げない。

2026-09-10T17:58:30+09:00の実時計を確認。本書の全P3b観測は未実行。文書参照と本書の編集だけを完了し、製品/環境に介入せず停止する。
