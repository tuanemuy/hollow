# S5 PUREstartup2 local actual independent review

判定: **局所PURE4 PASS**。固定pure unit4と工具正常終了の範囲だけ受入可能。S5 A–F全体、DB/current finalTx/undo、native閉鎖・original proof/ACK・全UIの成立にはしない。旧PURE341の実失敗原因UNK2026-10-06T08:58:25.502246+00:00Nを保持。全対象読取を停止した。

検証時刻: 2026-10-06T08:58:25.502246+00:00

## 根拠の区分

公開phase P5c-3-s5-pure-startup2-actual.md4880B/SHA497ec2f5f3091175c80a33a90b03f7674740ad71b76fdc09cc37f34648a82c11を、canonical regular600/nonlink/nlink1/ownUID、NOFOLLOW前後dev/ino/size/mtime/ctime・全文SHAで直接照合した。このphaseは **Rootのsole原stdoutから選択したprojection** と明記されており、全stdoutのcopyではない。Verifierの今回contextに原stdout全文はなく、省略fieldsを再構成・推定しない。

actualはすべてRoot実行報告の借用。公開5/source1470/108 fullstable precheck PASS→明示pure preflight PASS→SOLE --supervise新6074fe8c、という実行順も借用。固定source e25/manifestd1b9、runnerc257/config8802は前独立review4699B/SHA4e35755b9b5f98790d9db8556522b599aed935abcdcb4b69dac8d0869b6aa450の不変更deltaを継承する。CLI/helpers/source1470/depswalkの再実行・再走査は0。

直接source: ownSOURCEのapplication/regeneration/machine.test.ts全文2434B/SHA583a2bda02cfbd6dadae52efcb362507fbb2f2f3ff5f3a25ed1c3bef91331695、およびその必要domain imports machine.ts/entity.ts。canonical regular600/nlink1/ownUID/NOFOLLOW前後identity/fullSHAを確認し、当該assertionと純粋predicate/schemaだけに照合した。mainや別worktree/privateには触れていない。

## 実4caseとsourceの対応

| 固定case | 直接source assertion | 受入できる局所範囲・限界 |
| --- | --- | --- |
| admits only HTML and Markdown | html/markdown/text/pdf/audioをmachineFormatでfilterしhtml/markdownだけ | 実sampleの許可・拒否。全formatの製品prepared/preview/native pipeline証明ではない |
| binds source revision rather than mutable operation progress | version2/phase preparingでもsameMachineSource=true、noteVersion変更・source sha変更はfalse | source identityと進行状態の純粋比較。実DB current/revision/finalTx、全identity fieldsの個別動的対を証明しない |
| keeps unknown completion held | terminal/outcome unknown/owner unknownのデータにmachineHeld=true | このunknown-owner组合のheld predicate。closed proof/actual wholecallback/ACK未解決や他状態全体の回復・閉鎖能力ではない |
| cannot encode success without a captured resulting note version | queued-derived terminal/succeeded/resultVersion nullをschema.safeParseしfalse | 不正データのboundary拒否。entity172行のsucceeded↔resultVersion invariantと整合。実成功採用・note version commit・body rollback/undoは証明しない |

借用Reporter ready4/result4/sameIdentitytrue/全4passed、skip0/errors[]/runReasonpassedと公式JSON total4/passed4/failed0/pending0/todo0/fourpassedは、このexact unit assertionの完了に対応する。公式suite count2を「追加実case」へ補完しない。predicate用のdata-only queued factory/変更objectはnative能力・opaque proofや合法DB遷移の新証明ではない。

## 正常工具・終了の局所整合

選択safe receiptはinner Node0/knownNodePGabsent/両rawPIPE EOF・実FDclosed/forcefalse/faultnull、outer Python0/ownPGabsent/registeredNodePGabsent/両EOF-FDclosed・TERM/KILL0/faultnull/heldfalse/strictClosedGuardtrue。ActualNodeBindings2は固定Node canonical/version gateに親/workerが到達した根拠として扱い、全realm不在や全OS FD閉鎖へ広げない。

stockfork詳細はsame actualhandle1/knownPID absent/actualexit-close、正常requestedStop+SIGTERM/codeNULL、killRequestedfalse、stdinClosed、read1/2EOF-close、public disconnect/connectedfalse/channelReleased。元stock tool正常stopとouter強制を分ける。stdinFinishfalse、IPC EOF/FDnullを明記したまま受入可能な元契約に一致する。原stdinのfinishをcloseで補完せず、IPC欠測を独立EOFにしない。

native ledger valid/normal/restoredtrue/observerFaultfalse、workerAttempts0/active0/workers[]/owner attempts/handles0は本PURE familyのobserver正常結果。inactive owner fieldsは実owner閉鎖receiptではない。sourcepureにfixture afterAllはなくafterAll not-used、別config observerはhook1start/endとして報告されており矛盾しない。schema/plain pure4とこのフック正常だけでnative parser/input/memoryの寿命を証明しない。

capacity total1474B/records1474/entries9、original/TMP/cache/database各0、volatile missing0、auditNULLは計画PURE DB0と一致。DB監査が成功したとは扱わない。case/closure/normal flagsは原Root selected projectionの借用であり、私が6074実領域のrecords/raw値を確認したものではない。

## 残条件・停止

PURE unit部分だけ局所PASSとして返す。app7/native2/D1oneは未実行で、それぞれの通常DB/API、同Tx2CAS/保存読戻、actual input/parser/owner閉鎖・privateproof/ACK、current/source/account fence、body atomicity/rollback/resourceundo、全F UI等は今回未証明。S5全体をdoneにしない。新成功から旧341失敗のthrow/causeを遡及確定しない。

今後の別familyはRootが固定候補の公開/preflightと一回actualを別途採用する。本reviewは追加実行許可ではない。成功6074fe8c/root/cache/records/results/TMP、旧341と全新旧private roots/B/keys/proofs/DBは永久nonoperation方針を借用記録し、Verifier自身のstat/read/hash/import/copy/reuse/reopen/replay/cleanupは0。default/preflight/runtime/import/Worker/browser/root probe/createは0。main/UI/P5d/管理正本/source/helper編集0、goal/spec/spec-implement/agent追加0。この新公開reviewだけwx600保存しALLread STOP。
