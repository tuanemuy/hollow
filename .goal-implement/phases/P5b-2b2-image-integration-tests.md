# P5b-2b2 画像縦接続の実装補助

## 所有と範囲

専有は `packages/core/src/adapters/libsql/__tests__/llmImage.integration.test.ts` と本報告のみ。独立Verifierではない。製品/既test/共有型/管理正本/旧proofは非編集。

実DB、CoordinatedObjectStorage、SourceReader、SourcePreparer recipe3、実image child、resultProcessor、sanitizer、commitを使用する。外部profile/generator/credential protectorは合成fake。機械経路のmediaValidatorはbodyを最後まで読みcancel/releaseし、外部検証を行わないfake。runtime predecessor証明と応答ACK喪失だけ旧公開fixtureと同じ局所fakeであり、実再boot/電源断試験ではない。

## 集合

11対が全て成功した。期待と実結果は次の通り。

| 対 | 期待・観測 | 主な固定条件への限定対応 |
| --- | --- | --- |
| 1 | 正規beginUpload/acceptUploadがsettings.imageを選択。recipe3/prompt2、単PNG、画像profileをfake generator入口で確認。sanitize後commit、正規化notice、消費1 | B/C/E/F |
| 2 | IM-06成功→undoが本文だけ復元、title/style保持、消費1保持、二重undo拒否 | E/F |
| 3〜5 | AIoffはfailed、未連携/未構成はneeds_ai。空本文/原本を保持しdispatch0/消費0 | E/Gのusecase部分のみ |
| 6 | 原本CRC破損はLLM_IMAGE_CORRUPT、dispatch0、旧本文不変、消費/予約0 | B/E/F |
| 7 | 月間枠0はLLM_MONTHLY_LIMIT終端。機械/画像dispatch0、原本failed、消費0 | E |
| 8 | 保存応答ACK喪失後、同PNG再準備で後処理だけ成功。generator総1回 | D/F |
| 9 | 保存応答後のinputIdentity不一致はLLM_SOURCE_CHANGED。旧本文不変、generator総1回、消費1保持 | D/E/F |
| 10〜11 | role降格/取消後、遅延fake応答gate中owner active/実Execution枠保持。gate解除後cancelled、本文不変、消費1保持。role降格後の新要求も否認 | D/E/F |

対9は実PNG再準備後のport返却identityへの故障注入であり、別native encoder版の実byte driftを発生させた試験ではない。画像profileのlive catalog・鮮度・default fallback・実HTTP wireは本C補助の範囲外。実UI G/配備Hの合格へ読み替えない。

元画像は自己3×2白PNG一つとそのCRC破損派生だけ。各64KiB未満、全body供給累計2MiB以内をguardする。画像/sha/base64/本文をassert差分へ出さない。

`TMPDIR=/Users/hikaru/.local/share/hollow/verification/p5b2b2-images-20260928-qJ7aAe/test-tmp` をexactに要求する。各case前に一時DB/storage0を確認し、逐次DB1/storage1だけ作成する。自己DB/WAL/SHMは16MiB未満を確認する。主保存3DB約5.3MiBとは非接触であり、全64MiB枠内の余白を残す。公開source/reportは8MiB枠内。正常時はExecution.stop→FK0/active owner0→DB close→自己storage削除→一時0確認。assert失敗時は実work停止を待ち、client.closeのみでDB/storageを保持し、以降のfixture admissionを止める。

## 実行

主から2026-09-28 21:25:19 JSTにNode枠を受領。専有Biomeは1file整形/exit0。単独Nodeは2026-09-28 21:26:52 JST開始、11/11成功、4.32s（tests3.10s）、session74380をexit0まで回収した。再実行なし。枠返却後、主から全型63403成功の通知を受領した（こちらの単独検査とは別根拠）。全体整形/buildは主へ残す。

```sh
pnpm exec biome check --write packages/core/src/adapters/libsql/__tests__/llmImage.integration.test.ts
TMPDIR=/Users/hikaru/.local/share/hollow/verification/p5b2b2-images-20260928-qJ7aAe/test-tmp pnpm exec vitest run --config vitest.config.integration.node.ts packages/core/src/adapters/libsql/__tests__/llmImage.integration.test.ts --fileParallelism=false --maxWorkers=1 --bail=1
```

全caseのExecution.stop、FK0、active object_writes0、自己DB/WAL/SHM上限、DB close、自己storage cleanup、一時DB/storage0 guardが成立した。失敗保持分岐は発火していない。実childの閉鎖証明は製品imagePreparerの全pipe/実exit後resolve契約を経由し、その後work終端を待った。ここで別途PID探索や既runtime操作は行っていない。

Node枠と製品書込は成功通知時に返却。test/report全文読取後、2path所有を返し文書を含む全操作を停止する。未回収exec0、自己DB/storage/実作業0。製品ソース不具合の検出・変更は0。

## 限界

外部OpenRouterの画像認識・品質・費用、実署名/秘密、OS耐久、全量画像上限負荷、独立受入を証明しない。fake predecessorをnative終了証明と呼ばない。型付きunknownをclosedへ変換せず、既存回復入口への明示終了証明だけをfixtureで供給する。
