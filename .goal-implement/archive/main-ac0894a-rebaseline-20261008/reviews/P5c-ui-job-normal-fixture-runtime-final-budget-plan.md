# Normal final budget PLAN: 中断時点の独立部分レビュー

判定: PARTIAL / 全体合否未確定。利用者の「一旦タイミングの良いところで中断」に従い、新読取・新検証を開始せず、既調査だけを固定する。計画をactual-ready、full runtime closure、native permission、fixture実装許可へ昇格しない。

## 固定入力と直接操作

- phases/P5c-ui-job-normal-fixture-runtime-final-budget-plan.md: 192,870 B / SHA256 557a91be959110f916e19a355ded13b6ba1e3b3c624b793bdbe694e420470729。
- phases/P5c-ui-job-normal-fixture-runtime-closure-step36-interim-union.md: 2,148 B / SHA256 7726ab4613c5a7fd496c3b032ec3f79f0b778491fd96ec6e107a3d5a8f595dd7。
- PUBLIC build runner26,497 B / 088b558ff2b4f0bf611b4b649561ebb28f8b766cff7638c8fbe49b30974d00e6、driver10,061 B / 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac、packed117,169 B / 4ad86e83ac189da016ba255f901aeb55ed05a0078c2d49a8b3ffe77f4e7a3927。runner ASTのDRIVER/MANIFEST exact bindingsから元known filenamesを照合した。

上記だけをregular600/nonlink/selfUID/nlink1、O_NOFOLLOW fullread/fullSHA、前後dev/ino/size/mode/mtime/ctime一致・実FDcloseで読んだ。sourceSeedsは未読、SOURCE/main/package/alias/binary/Git/currentNodeの実物再観測0。旧generated/private rootsはすべて非操作。分析Pythonは本文/JSON/ASTの静的処理だけで、helper import/eval/CLI実行0。

初回表示はappendixを含む巨大出力でtruncatedとなったため、以降はnarrativeとJSON集計だけに絞った。appendix encoded/private dataの表示はない。全narrativeは後続の有限表示で確認した。

## 直接成立した局所照合

| 項目 | 直接結果 |
| --- | --- |
| runtime typed rows | path unique363、sum1,943,953 B |
| class集計 | JS317 /1,427,732 B、JSON46 /516,221 B |
| compact sorted [path,bytes,SHA] | 71,909 B / 594996be069df3a0d85edf5e15ebede2548bd9593fee3a4a71f259bc8d839676。Root interimと一致 |
| recorded mode/owner | table内0644が362、0755が1、UID501/nlink1全行。package実metadataの再確認ではない |
| runtime aliases | unique48、元rawTarget byte合計2,475 B、dirname(alias)+rawTargetのlexicalTarget mismatch0 |
| build aliasesとのpath交差 | recorded10とruntime48のexact alias path overlap0。raw-link schemaとcanonical-binding schemaは別 |
| original payload decode | 1,558,286 B /26da3fd037952186edc84700ebcceba809333856bbc75bfa762b6684049e213a、bounded zlib EOF・trailing/unconsumed0 |
| original payload構造 | SOURCE327、dependencies708、aliases10、links7、edges788、declarations2532、reachableSource66、entries4を確認 |

Original payloadのclosurePending=falseはBUILD familyの旧flagであり、normal runtimeのfullContextClosure=falseを上書きする能力ではない。将来metadataを共有するときにもcontextを別にする必要がある。ここからSOURCE実importやbusiness許可は導かない。

## material算数

以下は記録値・proposal値の算数であり、未作成helperの実容量PASSではない。

- Original COPY gate: 117169 +10061 +26497 +32768 +4096 =190591 B。
- runtime compactを単純加算: 190591 +71909 =262500 B。256KiBより356 B超過。
- 提案 component cap: envelope144KiB +runner32KiB +driver/fixture40KiB +control32KiB +allowance4KiB =258048 B。256KiBの残4,096 B。
- 記載の測定envelope144072 Bは144KiB cap147456 Bより3,384 B小さい。新role/context/root bindings・新コードのactualサイズは未成立。
- 同時raw buffersの記載下限: 144072 +143924 +107942 +1647129 =2043067 B。
- runtime body cap2MiBの残: 2097152 −1943953 =153199 B。
- prospective libsql native7,837,712 Bは別8MiB capの残550,896 B。binary disk bytesからheap/thread/FD/ABI/closureを推定しない。

encoded disk COPY、decoded text/objectsの保持、PUBLIC package body、native resource、生成SOURCE/output/ROOTは別class。計画が分離している点は妥当。raw buffer下限はJSON objects/string/duplicate arrays/index maps/library/DB/native/response/callback等を含む総heap上限ではない。全体heap・未作成3helpers・残normal counter/budgetは未確定のまま。

## 未完の独立確認

BUILD708のcanonical rowとruntime363の全交差/class unionおよびSOURCE327 seed8との全metadata一致は、今回直接確認を完了していない。分析コードがdependency rowのpathという誤ったkeyを参照し、canonical schemaに達した時点で停止した。これは静的分析側の未完であり、候補helper/実BUILD/元fixtureの失敗根拠ではない。中断指示後は再読・補正実行しない。planに記載されたunion1071/15,957,984 B/交差0は今回の直接照合済みとしない。

拡張圧縮実験の「元payload全field保持」、decoded1,647,129 B/SHA236bd60c…、zlib107,942 B/base64143,924 B/envelope144,072 B/SHA99be6fde…はauthorの固定報告借用。実験payload自体の独立同値再現は未完。記載の足算の一致とcompression field equalityは別である。

literal/context表に記載されるrequire(ESM)/TLA/constructor/options/PostCSS FS/own output parent/Worker artifact/source imports/native initializationの解決は未検証。37package roots、JSON46内のnested5/data4の独立identity区分も部分レビューでは全行確認していない。SOURCE seedsを読取許可と解釈せず、build708をbusiness loader allowlistへ拡張しない。旧capsは今変更0。

## 次に採用可能な境界

再開時はこの未完部分だけをPUBLIC bound reports/helpersの静的表で補う。新SOURCE327分析・require(ESM) body再読・native delegation/helper authoring/actualは別exact scope・独立判断を要する。今は新採用、fixture implementation-ready判断、blind retryを提案しない。

本書以外のSOURCE/helper/product/Manager編集0、runtime/import/default/preflight/DB/native/network/browser/環境変更/全root probe/create0。分析owned subprocessesはすべて終了、business children0。この固定後にALL readers/writers STOP。
