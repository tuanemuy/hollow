# UI browse4 zod3 actual: INPUT_SCOPE held

2026-10-06T18:58:12+09:00。Root soleexecutionownerの一回 --run。判定はFAIL held。選別済みsafe stdout全量だけを以下へ固定し、raw stderr/生成source/build/TMP/outputs/metafileは再読しない。全e762bb91生成SOURCE/BUILD/toolTMPを恒久NOOPSへ移す。

PUBLIC3 fullstable/fulltext・packed payload/sourceManifest/counts/pinnedNodeGitmetadataをRootが直接確認。独立候補レビュー6834B/7b0b81ce1987f247ccf7140514a448c553fee082fcc921b5a7ece6e291bb69e8を受入。existingdefaultはexit0/preflighttrue/executedfalse/rootProbedfalse/sourceCreatedfalse/source327・1920009B/deps707・13984808B/entries4。Rootは追加でPUBLIC deps707のexactcanonical/fullstablehash13984808B、aliases10を直接照合した。source327のimmutableGit読取/hashはexistingdefaultのRoot直接実行結果。新root排他createは--runの既gateによる。

候補: runner26495/09903e6c8cfddebcb21c901cd060fd241734e13329b167c5db4668da4ab27876、driver10061/6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac、packed117101/cb0276b8f71d882593eb18746483498e88953ae8a916bd0f537c3c54e322c05e。wholeproductchecks0（product変更0）。build SOURCEはhollow-ui-job-source-79ef126e-zod3-20261006、BUILDはgoal-implement-ui-job-build-zod3-20261006-e762bb91、TMPは-toolTMP。文字列は束縛識別のみ、再probe不可。

Python exit1、elapsed 0.298040292 sec。safe stdout:

```json
{"schemaVersion":1,"executed":true,"normal":false,"held":true,"nodeExit":-15,"knownPGAbsent":true,"pipeEOF":[true,true],"controlEOF":true,"fdClosed":[true,true,true,true],"force":true,"signals":{"TERM":"sent-success","KILL":"not-attempted"},"rawDiscardBytes":[0,0],"frames":[{"event":"header","schemaVersion":1,"entries":4,"nativeWorkers":0,"database":false},{"event":"service","registered":true,"count":1,"stderr":null,"observation":"after-start","actualOwnedPGMatch":true},{"event":"held","kind":"UNKNOWN","phase":"INPUT_CHECK","reason":"INPUT_SCOPE"}],"databaseAudit":false}
{"schemaVersion":1,"normal":false,"held":true,"kind":"UNKNOWN","databaseAudit":false}
```

INPUT_CHECK/INPUT_SCOPEは元await esbuild.buildが戻り、state.buildDone設定後のmetafile.input canonical許可チェックでself guardが拒否したことを示す。何番目/どのpath/何件のinputsか、書き出し四filesの完全性、個別service閉鎖、build正常結果は欠測。unknownpath/virtualinput/conditionalmodule/extra dependencyのどれかはこの結果だけでは確定しない。built/closed/outputmanifest/DBaudit無し。outerNodeは監督TERM -15でforce=true、PGabsent/2EOF/controlEOF/4FDclosedは物理outer閉鎖だけで正常閉鎖ではない。rawDiscardBytes[0,0]を個別native stderr=NULLのEOF証拠へ転用しない。以前BUILD_PENDING/UNKNOWNの原因を遡及確定しない。

次はPUBLIC known package条件/元esbuildresolver/manifest限定表の静的照合を提案。default/actualの自動再実行0。全root/output/metafile/privateは恒久非操作。Manager statusは255/294のまま、UI/製品/P6合格0。
