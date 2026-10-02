# P5c-2 Retarget 実装・検証

状態: 完了候補・独立検証へ返却（2026-10-01 02:40 UTC時点）。製品 `4b3995711c94957454cfbaf6863b6e9695abfb4a` 固定。主の純116一意、移行1、app7群（5＋2、別DB）、native1、build計2/posttype成功。唯一UI1bootは正式upload/conversion/signin後の前提commandで停止し、retarget UI未到達。安全保全は成功、シナリオは未完。RT-I1/I2/B/H/Jを主の自己申告で受入doneにしない。旧候補 `9c77f047b6ffbc678190efb4c0dfeb8e698d3a9e` の根拠を修正へ遡及しない。基点 `8cb478b8639816751f40ab62ac2ea255e2057ad0`。旧S3成功は不変更部分だけ借用する。

| 固定条件 | 主の直接合格候補 | 残る独立確認 |
| --- | --- | --- |
| RT-I1 / I / A | 永続未開始F1→F2受付、旧値保持、新成功、正常初回の誤案内なし（pure/Panel） | 新候補実UI確認取消→新受付→GET/link/reload、正常初回実DOM |
| RT-I2 / I / C / D | source FD/caller保留中拒否、実close/closed/ACK後受付、trash後F2成功（native） | native根拠の独立照合、未被覆競合だけ比例 |
| RT-B / B / F / G | head初回/同command/CAS、capture/bulk digest/旧retry拒否（app群） | app7群の同一新DB通常順と双方競合の未被覆 |
| RT-H / E / H | 旧全値保持、90日job解放後head/transfer保持、全世代purge | 保護中purge拒否等の未被覆、実UI旧結果保持 |
| RT-J / J | 0041/backfill/rollback/deferred FK、型/lint/format/比例対/build | 新候補指紋・移行直接根拠の独立検証 |

## 採用境界

採用計画 `P5c-2-retarget-plan.md` 253行31,556B SHA256 `3f1fe2da0ad13ba7e64909cf2be15f47b2e8b86bdd3344618eaf845385f27407`、独立計画レビュー81行12,516B SHA256 `d7704e29a549686b70aedc468ca32b66c50cf04ef77b297a70fc86f697243b8e`。§9のpathと0041 head1表だけ。closedOwners typed keyset100、既clock2000ms/最大100page、旧全値比較は新runner前の新受付Tx前後に限定する。通常prune/redactionは別観測。SQL preemptionは保証しない。

root `/Users/hikaru/.local/share/hollow/verification/p5c2-retarget-20261001-e7g0RV`。排他mktemp、新0700（wrapperのlstat/realpath確認済み）。初期320MiB/10logicalDB152MiB→v2追加344MiB/11DB176MiB→v3追加368MiB/12DB200MiB→v4追加392MiB/13DB224MiB。旧失敗は保持。app原本は3＋18＋3＋6＝累計30、上限30。原本8MiB、新秘密128B/material256KiB、helper/log8MiB、NodeTMP8MiB、ChromeTMP128MiB、provider32/native8+UI24/8MiB、Hollow600/32MiB、背景100/1MiB。build計2承認（初回成功＋V1後追加1）/dist別256MiB、UI1boot/Chrome1、writer/testworker1。

唯一runtime ownerは主。補助retarget_webは予約web6path（Input/ServerFn/Panel各本体+test）だけ公開read/apply_patch、実行0。core/DDLは主。spec/spec-implement・旧private/DB/key/results/cache・実外部・actualfreshは操作0。goal/管理正本はRoot所有。

## 実装到達

- head/tuple/evidence型、専用初回insert/replaceHead、全歴史EXISTS証拠、typed closed owner keysetを追加。
- 0041 head/backfill/deferred複合FK/追加current guardと、initial/capture/admission/retry/current/pinへ接続。生成snapshot差はhead表追加とtarget unique index置換だけを機械照合した。
- preview/confirmは現在actor/原本/新folder意味/旧head版を束縛し、receipt先行、maintenance内でcaller/ACK待機0、GET副作用0。
- 既fixtureのactive noteに対するtarget消去はhead delete条件に不適合。成功cleanupは既beginNotePurgeを通すpurging・全世代回収と新note/original IDへ変更。失敗は保持する。retarget opt-inは7群・累計原本24まで。
- web補助は確認Panel/Input/ServerFn各本体+testの6pathを返却し全停止。追加18対は後述の主pure一意合計に含む。
- 新owner/deadline純11対、application7群を登録。移行1対は正常と3rollbackを含む。

## 検査

- 新有限runner/reporter smoke1対: 成功、exit0、stdout/stderr両pipe終端、stderr0。DB/HTTP/browser0。
- type-01: 旧移行fixtureのinsert呼出し1診断で失敗。旧0040baselineは公開schemaによる作成へ修正。
- type-02: 成功、exit0、両pipe終端。
- type-03: fixture provider引数のfield誤り/新test未使用importの2診断で失敗。type-04修正後成功。
- lint-01〜03: 新retarget.tsの複数const宣言1箇所で失敗。初回既warningが先に表示され原因codeはlint-03有限投影で識別。lint-04/format-01成功。
- unit-01: 108対中104成功/4失敗/skip0。新head guard用isCurrentを旧recovery mockに追加していなかった4対のTYPE_ERROR。fixture追従と旧head拒否1対を追加し、後述unit-02で再確認。
- migration-01: 通常1対成功、baseline0040/成功0041/rollback3の5logical DB。旧全値/旧guard/4state backfill/deferred FK commit拒否を確認、exit0/両pipe終端。
- application-01: 第1群afterEachがFIXTURE_CLOSE、0合格/1失敗/6skip。失敗DBは保持、再実行/cleanupなし。元close例外の段階は欠測。afterAllと外側子/両pipe終端を確認。
- probe-01: 採用済み自己application.sqliteだけreadOnly/query_only、10query各1行、close/exit0/両pipe終端。ledger42/FK0、active note3/purging0/purgeintent0、head1/target2/job2(cancelled1+succeeded1)/transfer2(live0/held0/pin0/refresh0)/record1/object_writes総1、2,117,632B。ID/内容/秘密/hash出力0、copy0/更新0。
- 静的確定欠陥: endWriteがactive=falseとして保持する終了済み行も、新retarget証拠と0041 head update/delete guardが実所有ありとしていた。3箇所にactive=1を追加。初回FIXTURE_CLOSEとの個別因果は未保存につき未確定。旧migration成功は不変更構造/backfill/rollbackだけ借用し、新guard成功へ遡及しない。
- application-v2計画では全7群を通常順で確認、失敗appの3原本を残し、v2最大21原本/累計24を予約した。実消費は18原本で第6群失敗。active write拒否・inactive保持許可・全世代purgeの直接結果は成功した先頭5群に含む。
- type-05: synthetic history queued jobのliteral型1診断で失敗。型注釈を追加しtype-06/lint-05/format-02成功。
- unit-02: recovery32/32成功、既unit-01と重複を除き純109対成功。旧mock追従を実動作証拠へ拡大しない。
- application-02: v2通常順7群中5成功、第6失敗/第7skip、exit1/両pipe終端。第6はcaptureだけを単独Tx commitしjob/transferのないheadを作ってからinitialへ進む非正規fixture。request.ts:243のUNKNOWN拒否へ到達。正規initial→cancel→capture同head再利用へ修正し、旧captureのretarget後拒否は維持。製品変更なし。第7の90日はcaseのclockを起点へ追従。採用された新v3で残2群だけ通常順に確認する。7群同一DBで全成功した根拠ではない。
- native artifact-only補助はnewroot/native.test.mtsだけ作成し全停止、主が全文EOF/regular22,320B/SHA256 `fddcfdf946b2a8d8494965dc32e6324640b0444bfa77eb98c3c9e991e1ac5f19` を確認。補助実行0。主の予定6要求はF1folder trash→F2folder usable→generate→start→chunk→inspect、実結果はnative-02へ記録。
- ui-metadata-01: 採用済み統合UI2の公開26source/188,054Bをregular/non-symlink/全SHA照合。旧実行/import/private追跡0。必要sourceの全文読解と新root適応をその後完了した。
- metadata生成/限定差照合: 成功。型成功とは別。
- budget-01: 新root19file/853,928B、DB0/NodeTMP0、320MiB/各枠内。
- budget-02: 92file/14,492,707B、DB13,217,312B、helper1,275,395B、NodeTMP0、各採用枠内。
- application-03: v3第6群失敗/他6skip、actual code欠測。古いF1 epoch/settingsの入力が文脈比較より先に拒否される静的fixture不整合を確認。現在epoch/settingsのまま旧job/headだけを渡す対へ補正し、製品は変更しなかった。
- application-04: v4で残第6/7群を通常source順に2成功、5は明示filter skip。v2の不変更5成功と合わせ7群の到達根拠であり、同一DB全7成功とはしない。失敗v1〜3は保持し再実行なし。type-07/lint-06/format-03、type-08/lint-07/format-04成功。
- native-01: CLI準備失敗、marker0/DB不存在/HTTP未到達/exit1/両pipe終端。原stdout未保持で個別原因は確定しない。公開Node --import loaderへ訂正し新label native-02を使用した。
- native-02: 成功。F1trash→F2usable→generate→start→chunk→inspectの実6要求、body2,243B/wire5,455B/逐次1/外部0/1KiB1upload。FD close保留中のread可能/caller pending/preview拒否、実close→DB closed→caller終了/ACK後のF2受付、成功record/currentを確認。旧全mapped行は受付Tx前後/新成功後も不変。source open2/close2、FD/caller/proof/pin/execution/listener/socket/DB全終端、timer0/exit0/両pipe終端。
- build-01/postbuild-type-01: 成功。旧候補 `9c77f047b6ffbc678190efb4c0dfeb8e698d3a9e` を25pathだけcommitし製品を固定。独立静的レビューでV1を受け、初回の正常head/target0を旧結果不明と表示する不整合を修正している。旧buildへ修正成功を遡及しない。
- V1: retarget.tsの既exact original lookupで正常nullだけnot-started、Panelは理由非表示。履歴targetあり/head欠測・head先target欠測はrepository rejectionを維持。別ID受付は初回nullでも拒否し、通常初回ボタンは残す。製品2＋対応test2path、新port/DDL0。
- V1 type-09/lint-08/format-05、unit-v1-01 40/40成功（旧33＋新application-port5/Panel2、skip0）、追加build-02/postbuild-type-02成功、exit0/両pipe終端。旧109と一意合計116。欠測対は既repository rejectionを渡すapplication契約対であり、新DB破損状態のSQL実行とは区別する。
- UI準備: 公開allowlist26を照合し必要20sourceを主が全文EOF読了して新rootへ適応。旧場所実行/参照private追跡0。setup69/69、serializer等119/119、endpoint57/57、構文19/19成功（工具根拠）。初回endpoint56/57は古い関数alias期待の器具不整合として保存。これら純確認時点ではUI/Chrome/新UI DB/秘密生成0、その後の唯一UI結果は別節。

## 主UIの固定操作表（起動前）

| 段階 | 実行/観測 | 上限・区分 |
| --- | --- | --- |
| 前提 | 正規signup/本人確認mail memory1、retarget.md 1KiB正式upload/conversion、plain note1、signout | 新account1/note2/original1、setup要求49/4MiB以内。外部mail0 |
| 本人 | Chrome新空profileで通常signin、現在ACTIVITY actor/authVersion/epochと自己所有statusを照合 | 既profile/CDP0。shell/menu/tags/listboardを必要条件にしない |
| 旧状態 | 同candidate公開UoWで自己資格/検証済F1・永続未開始job取消→検証済F2 | owner0、旧terminal全値をmemory固定。OAuth/Picker/実folder変更のUI成功には数えない |
| 確認 | note detailのpreview/current、原本・新F2・旧記録保持の説明、confirm取消1→再確認1 | 取消時retargetPOST0/provider0。acceptは正規可視buttonから新command1のみ |
| 転送 | actualadapter→自己provider folder/generate/start/chunk/inspect | 正常5要求/1upload/1KiB、UI枠24内。native6と合計11/32、8MiB以内 |
| 結果 | receipt→保存状態→現在GET→F2link、旧取消保持、reload同値、390px/Tab | provider/mutation増加0をendpoint別に観測。read-render POSTをmutationに混ぜない |
| 停止 | Chrome正規close、自己group/pipe/control終端→app drain/DBclose→provider/proxy終端→opaque→audit | コピー排他、active/opaque非接続。audit query_only。DB bytesはmemory比較のみ、秘密hash0 |

UI全体は既1boot/Chrome1/context1/page1。Hollow600/32MiB、背景deny100/1MiB、origin固定proxyをChrome起動前指定、外部forward0。prep60秒、操作120秒、個々のDOM待機5〜15秒/結果20秒、stop全体40秒、外側210秒で有限化。失敗時は新mutationを止め、有限診断と正常停止・保存を行い追加bootしないという起動前計画。実際に前提commandで停止し、V1初回表示を含む未到達UIは独立へ渡す。

準備時のGNU statへのBSD書式指定はmetadata照会失敗（exit1）として保持。root正規性は新wrapperで独立に確認した。秘密/原例外stack出力なし。

## 借用・未完

不変更provider/Range/同IDsessionの旧根拠を借用。V1は2製品/2testだけで、既native/移行/app7群の構造/挙動は不変更部分へ借用し、正常nullの追加lookupをその旧結果で直接実行したとはしない。実Google/Picker/relink残UIは本段で成功扱いしない。旧folder回復をF2への再受付成功へ読み替えない。新代表UIは前提で未到達のため独立へ引き継ぎ、主で再bootしない。

## 唯一UIの結果・停止保全

- 新空UI DB正式0041初期化1は成功。128B鍵・自己account material、新1KiB原本1、plain note1。前提は正常signup/mail memory/正式upload/conversion/signout、Chromeの通常signinまで2 checkpoint。Hollow81要求/815,285B、背景17要求/3,450B、外部forward0。current foreign0。本人操作後の `APP_COMMAND` により追加mutationを止めた。retarget確認/受付/link/reload/390/Tabは未実行、provider転送成功もこのUIでは未観測。
- `ui-result.json` は元の失敗 `APP_COMMAND` / `SAFETY_PAUSED` を保持。Chrome exit0/signalなし/fd1〜4close/group不在/control bind確認、app正常exit/close/stdout-stderr end+close、proxy/provider正常close、外側supervisor exit1（シナリオ失敗）/両pipe終端を直接記録。例外message/stackは保存していないため個別causeは未確定。BROWSE_RENDERのrequest1 active1というobserver末尾はブラウザの中断と両立し、React未完了やsocket残存の証明にしない。
- 既知writer/自己Chrome終了を再照合後、active→opaque→auditを排他コピー。各logical集合2,084,864B、byte同値をmemory内比較、DB hash出力/保存0。active/opaque driver再open0、auditだけquery_only。ledger42/table110/backup6/FK0、account1/verified1/session1bound1、note2/original1/conversion成功1。backup request/job/transfer/record0、owner/pin/active-write0、原本保持true。audit close、active/opaque不変、preservationPassed=true/scenarioPassed=false。失敗DB/結果とopaqueを削除しない。
- UI後sealはsource/dist/fixed/entry/toolsすべて上表と一致。容量DB28,278,304B（audit末尾metadata計測では28,311,072B）、original分類3,209B/material232B/helper4,520,448B、NodeTMP/ChromeTMP0、dist223,796,694Bで各採用枠内。13logical DBを使用し、新root追加0。原本分類はnative/入力/保管済原本等のfilebytesであり、app DB内synthetic原本30件と混同しない。

### 検証器具の静的原因と限定補正

公開helperはraw parentをinsert後、そのままcancel replaceへ渡していた。公開schemaのread値にはbulkSummary=null/rootRequestId=null/generation=1が含まれ、RequestRepository.replaceの全値比較に対し省略rawは不一致になる。これは再現可能な器具不整合であり、元停止のstage/codeが欠測なので今回個別因果を確定しない。setupのUoWがrollbackした場合にauditのbackup全0は整合するが、それだけで到達stageを断定しない。

Root採用の新root内限定補正: `ui-boot.mts` / `setup-contract.cjs` のみで、insert後同Tx findした正規parentをcancelへ渡す。identity/original/owner/connection/parent/capture/cancel/folder/statusの有限stageと既知serialized kind/codeだけを投影し、message/cause/bodyは落とす。外側supervisorは新排他labelを追加。DBなしpure1回82/82（旧69＋新13）成功、raw/正規shape差、正規値保持、欠測/世代違い拒否、有限エラー投影を確認、exit0/両pipe end+close/自己PID不在。これは実repositoryの追加DB成功でも修正版UI成功でもない。修正版ui-bootを再import/bootしていない。

以後の製品編集/追加build/DB/HTTP/Chromeは0。主の全子/pipe/socket/caller/FD/DBはそれぞれ取得できた直接根拠で終了。補助retarget_webも全read/write/run停止済み。本文と公開source一覧をEOF確認後、文書を含む全read/write/runを停止し所有を返す。

## 公開候補指紋（UI前）

全source/diff cleanを確認。canonical sorted `{path,bytes,sha256}` 配列JSONのSHA256で、工具だけ旧canonical行方式。秘密/DBはhashしない。

| 集合 | 件数/bytes | SHA256 |
| --- | --- | --- |
| source | 1292 / 18,220,734 | `7d7d8cd78e3003288ac7335741b85fab843a9ad993981beeed7cd8906086d04a` |
| dist | 9116 / 223,796,694 | `4f1bc6cf7df2198c4628fbdfd898b42f4707f0cd054594b1c22606f841ed40c6` |
| DDL/lock等固定 | 91 / 7,675,683 | `8bc76f2114f685497bb0185b16eb75b75d4adb9542d77b1a052bfce808b91832` |
| entry/shutdown/RSC/listen/lock | 5 / 4,103,446 | `11f388bad8615266f285a358a8b0140b4f7a4344b7a180df73d63117ff2b9fda` |
| 公開Playwright工具 | 179 / 18,550,212 | `dc520408fcfe3e1951e46ca6a2a03d31d24b554ee21abe1249c094356fad3cc5` |

旧9c77f04: source `c99bcee286b7cecb7f37f811b11d8532172b2cf85c7fa8278655482f0536765f` / dist `d366333e85a7fcb4dc63af59fd96929f323c6ecdcf71b9ad98b3a8ee6127efd3`。DDL/lock集合は新旧同値。新preflight時容量はDB22,023,712B/helper4,504,465B/original1,024B、NodeTMP/material/browser0、採用枠内。新bundle endpoint57/57成功。旧public seal/失敗ラベルは排他保持し上書きしない。

## 公開helper exact allowlist

共通prefix `/Users/hikaru/.local/share/hollow/verification/p5c2-retarget-20261001-e7g0RV/` に下表basenameを結合したexact path。全24 sourceはregular/non-symlink、計190,423B。主は全文EOFを読了し、実秘密/私的body/原例外/実nonceを埋め込んでいないことを確認。合成fixtureの固定文字列と、実行時に新materialを読むコードは含む。現在rootで再実行する許可ではなく、独立側は別採用後にmetadata/全SHA→全文→新rootcopy/adaptする。参照するprivate/material/DB/resultsへ追跡しない。

| basename | bytes | SHA256 |
| --- | ---: | --- |
| ui-common.cjs | 9753 | `eff15647515b3e8d89946a638f2fadee9f8466e5cf60e1638d3d18b1422986be` |
| ui-boot.mts | 14956 | `23caee371162ebe04bcb72a5fe51f65c2de5cb8744b5cdda81282dc18d58c473` |
| ui-s3.cjs | 25902 | `f49bce5cc626704ad6b3609545479b1aae36a3d512c5f44fefe9246386059464` |
| ids.cjs | 2007 | `4c974de7e15042da73bd77bbc3d80f42a625833b22db7a663e2e8c7590a9f5cd` |
| protocol.cjs | 3279 | `388c4e9b76810f857cc6997fccd4fce07282f0ea8e5d54365dcd47d57279b554` |
| request-input.cjs | 3503 | `d0d6e9d40d8e172ac9486d2445e7ec45737115b33a8a91bba6ecc1a8ea7622d9` |
| ui-observer.cjs | 5090 | `9ae9485e55c6134dcac2b480054bad142a1ecc6f3325d94d69628fa3416dbd93` |
| prepare.cjs | 8278 | `e4ae95a51ac4cc6d075ddb2a6f79bcf8affc0e1e544281281a66f555b26f2da2` |
| setup-contract.cjs | 7323 | `c3e7446b49bc71fd9f8203ddbece6bc224900e89a64fae521ce3a973c4e07854` |
| identity-gate.cjs | 6509 | `30d2febdccb3ef9d9d065cabda01f65890270fdf52c3795fa0aa55ac2a16e7a2` |
| ui-provider.cjs | 21120 | `e41fa02b7adcdfee7179da52c0feb336f3cbba51571ac6a70c178cae8e6874cf` |
| supervise.cjs | 11665 | `e819b4220cc21512ba40960aece9a761069bdf67039548c84ee4503a7261f285` |
| preserve.cjs | 2044 | `62de7b2d57d2b6a5b9a3a52d9db0926cd79f9074e21bfe3ef4d26ee56cda9aa9` |
| worker-observe.cjs | 1559 | `e22b785d32388080a1a79dea1bcaf590ab0021bae6ffbe4a55e13e81b2f4e430` |
| ui-audit2.cjs | 7178 | `732b7cc6f3367290c3d3dff3f0a3c97bd91863880f1827f64c15cf1721125f64` |
| handoff-diagnostic.cjs | 11318 | `e7e8abccb573e082baeb84e32fd0b59e152a86fc3a5d5722d18b574d6838106b` |
| serializer.cjs | 12108 | `ae1b9426803f5384d41bddc1b21e44e5c3e5c9672cbbf6a1251838723a1a9f6c` |
| ui-checks.cjs | 2013 | `952ac1c70666db2a645a2a8a2a9e13eb6f6f412788307ed5ef9e54cdcd072000` |
| syntax.cjs | 1056 | `77c1c9295e493563283bc851cf41a87979f9a275c9c706e1dfbc4fbbf1e99980` |
| preflight.cjs | 293 | `b227d1d1110bb0c6310c7ddd305f18178d834f2950f34d3c18b15efcda1b87ae` |
| contract-checks.cjs | 704 | `10b2042c032f698f4397c1313b485e3b553aff295fe6c7648a0f7a74d8cb8f3e` |
| run.cjs | 8506 | `71213eae985b2ce0d25153f4fd983c8cfdcb4f6abc1aa8b50f56a27ac65880e3` |
| reporter.mjs | 1939 | `b442557e745c2de95decf8043cec48cef49b803c1585d712287e38abbaf04043` |
| native.test.mts | 22320 | `fddcfdf946b2a8d8494965dc32e6324640b0444bfa77eb98c3c9e991e1ac5f19` |

allowlistには公開論理sourceだけを含む。`ui-s3.cjs`という旧basenameでも内容は今回のnote detail Retargetシナリオだけ。旧S3全枝を再演しない。bootは新candidate built entryと公開source adapterの契約compositionで、通常Google configured productionではない。成功側だけを使いcross-bundle例外bridgeは介在しない。Seroval/PlaywrightはRootが別採用したexact公開集合のみ、install0。新rootへ適応する際はhardcoded root/candidate/label/active entryを更新し、旧結果上書き/旧root実行をしない。

EOF
