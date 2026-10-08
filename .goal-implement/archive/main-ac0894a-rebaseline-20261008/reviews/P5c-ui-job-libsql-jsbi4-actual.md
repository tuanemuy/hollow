# UI browse4 JSBI4 actual 独立局所分類

固定日時: 2026-10-06T10:12:27.551985+00:00

判定: **局所 bounded browse4 build NORMAL PASS**。Root safe actualを借用し、固定PUBLIC helperのnormal predicatesとの整合を直接確認した。新DB/job fixture・製品・UI・IN07・S5-Fの合格ではない。旧失敗原因はUNKNOWNのまま。

## 固定根拠

- Root safe全文: `phases/P5c-ui-job-libsql-jsbi4-actual.md` **3719 B / 5ca568fe62e359c11cd50f35a96d339cf2255ba34368a5492cad5e417e21cb25**。
- runner **26497 / 088b558ff2b4f0bf611b4b649561ebb28f8b766cff7638c8fbe49b30974d00e6**。
- driver **10061 / 6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac**。
- packed **117169 / 4ad86e83ac189da016ba255f901aeb55ed05a0078c2d49a8b3ffe77f4e7a3927**。

このPUBLIC4ファイルを全文 stable readした。canonical/regular0600/nonlink/selfUID/nlink1/NOFOLLOW/dev-inode-size-mode-UID-nlink-mtime-ctime前後同値/close後path/全文SHAを直接確認し、固定直前にも同値だった。candidate review6134/b4258628の全inverse・source/deps・capacity根拠を継承し、source327/deps708の全再walkは0。

Root directPUBLIC3/strictpacked/inverse/pinnedmeta → existingdefaultPASS（source327/deps708 fullstable、executed:false/sourceCreated:false/rootProbed:false）→ SOLE --run の actualはすべて **借用**。Verifierはdefault/実行をしていない。生成SOURCE/BUILD/TMP/output/metafile/manifestを再読していない。

## 実サービス閉鎖と outer閉鎖

| 局所条件 | Root safe観測（借用） | 固定PUBLIC契約（直接静的） |
| --- | --- | --- |
| original build戻り・入力集合 | built entries4 / inputs264 / warnings0 | driver123–130のerrors/warningsとexact canonical knownInputs gate後にbuiltをemit |
| 原service ownership | service1 / registeredtrue / actualOwnedPGMatchtrue / after-start | 元spawn sameChildを登録する既observer。不足permission先行を主張しない |
| 原service閉鎖 | actualexit0 / signalNULL / childclose / stdoutEnd+Close / stdinFinish+Close | driver143–147が全条件・exit0・streamError無しを要求 |
| 実制御と原stop | originalstdin.end1 / originalStopCalledtrue / rootForcefalse | Root明示採用のpostbuild stdin.end1後に閉鎖を待ち、元esbuild.stopをawaitした後だけclosed frame |
| outer終了 | Node0 / PGabsent / 2PIPEEOF / controlEOF / 4独立FDclose / forcefalse / TERM-KILL not-attempted | runner530がfault無し・force無し・exit0・PGabsent・全EOF/FDclose・4frame exact順をnormal条件に要求 |

postbuild originalstdin.end1はRoot工具の制御であり、esbuild default stopの自然timingを観測した主張ではない。originalStopCalledはこの採用操作後の元stop呼出・await成立に対応する。監督TERM/KILL成功で閉鎖を合成していない。

stderrは inherit=NULLのまま。個別service stderrのEOF/FDは未観測であり、outer rawDiscard[0,0] / outer stderrEOFを代用しない。stdoutEnd/CloseとstdinFinish/Closeは公開streamイベントによる局所receiptであり、追加の非公開OS FD探索をした根拠ではない。

Root phaseのsafe frame順は header/service/built/closed の正確な4つ、normaltrue/heldfalse/databaseAuditfalse。Python0 / elapsed0.312072791秒。個別source bodyやprivate proofの独立実receiptを得た主張ではない。

## 正常生成manifestの bound

runner542–558はmonitor正常後にcapacityを検査し、既entries4のexact `.mjs` をstable全文読取し、各サイズ/合計16MiB以下を要求する。元candidate/sourceManifest/driverSHAと4name/size/SHA recordsを載せ、4096B以下のcompact manifestをwx生成した後だけsafe output fieldsを出す。

借用safeは outputFiles4 / outputBytes **3094226 B < 16MiB** / outputManifestSha **576b96b55023c994dcb5671cef8d518f50c87d0238d860a9ac05a8bd6c05c372**。これは同操作内のhelper normalgate通過によるbound生成根拠であり、Verifierが実manifest・個別outputの内容/ハッシュを再照合した根拠ではない。

固定 source79ef126 / source327・1920009B / sourceManifest4b397 / deps708・14014031B / linkTargets7 / aliases10 / entry4、material190591<262144、source32/output16/TMP8/log2/root192MiB、body60+tail30等はcandidate STATIC PASSのまま。source-derived countsを観測後に合わせ直していない。

## 限界・停止

旧zod3 INPUT_SCOPE拒否path・startup2 BUILD_PENDINGの原因はUNKNOWN維持。このNORMAL成功から旧実失敗値を遡及確定しない。DB/nativeDBaddon/signup/upload/import/job、通常本文採用、browser/P6/IN07/全S5-Fへ転用0。後続fixtureは別の新操作内でbuildする採用計画が必要であり、この成功artifactの再利用を許可しない。

全671ce834 SOURCE/BUILD/toolTMP/outputs/metafile/manifestと成功失敗含全旧privateは永久NONOP、stat/read/hash/copy/import/reopen/replay/cleanup0。Verifier default/actual/import/rootprobe/sourcecreate/DB/browser/Gitreader0、helper/source/main/S5/P5d/Manager編集0。新reviewだけwx0600で固定して、全対象読取STOP。
