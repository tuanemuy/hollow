# P5c release metadata writer independent preflight

## Current borrowed actual metadata acceptance

判定: **新C/newB工具release metadataの一回正常生成は局所PASS**。publicphase17983B/SHA256 `2470f696174c3528a527ebc789f7e1721bb865c5bb69a495b25ba4193548ce9f` のcanonical/regular600/nonlink/nlink1・NOFOLLOW全文hash・前後metadata安定を直接確認。prefix除去は旧14756B/3ce9aca6全文SHAと直接一致。writer17161B/fc526f固定不変更、正常predicateは先行独立static PASSを継承する。actualはすべて担当safe公開報告の借用で、Verifierの新B/source/dist/release実物再読・stat/hashは0。

別current容量admissionは3276entries/97既知link＋AGENTS内部link1/unknown0、root55,504,646B・source_material26,370,751B・dist23,202,712B・log47,823B・TMP5,883,360B・archive4,711,314B、release421B reserve後も採用各枠内。内容を容量walkerで読む根拠ではなくmetadata-only検査として借用する。元helperのbuildpeak計算をcurrent全容量確認へ読み替えない。

正式default preflight actualWrite false/readFDClosed trueを確認後だけONE --runがexit0/actualWrite true、7keys/schemaVersion1/固定Cb6e/3manifest束縛・source1457/20,986,203B・artifacts492/23,202,712B、release421B/SHA256 `fc2a38fab7b652a2a09102aade8fb981f058c1501612382d83075bab7aa71818`・readFDClosed/writeFDClosed trueを返す。wx600/NOFOLLOW fresh write→全bytes/fsync→元outputFD dev/ino→実close→同inodeのpath/open/fstat前後/finalpath＋hash/bytes一致後のみ正常receipt、という修正版predicateに対応する。retry/partial/不明closeを成功化しない。

受入はmetadataに限定する。子process/PG/PIPE・native capability/proof/ACK・renderer/RSC全参照/UI機能の成功をreleaseから合成しない。databaseAudit falseのまま、新UI compiled graph/binding・browser受入は次Root別scope。対象read停止、writer実行/rootprobe・全新旧private操作・source/helper/Manager編集0。

## RELEASE-INODE1 corrected candidate

判定: **限定static PASS**。元write FDのdev/inoがclose後postreadへ渡され、Reader.fileのpath lstat→open fstat→終了fstat/final path signatureの等値に束縛される。同内容の別inode差替えもCHANGEDでheld。RELEASE-INODE1は解消した。実生成はRoot別採用まで0。

writer17161B/SHA256 `fc526f5471bd0632442b1977a0f693326c42d7f0168d8ea7d6abc5131dc41635`、phase14756B/SHA256 `3ce9aca66ead4740d730224baf50218bde9d66c20143052f2315b3c8dd960d08` のcanonical/regular600/nonlink/nlink1・NOFOLLOW全文hash・前後metadata安定を直接確認。Python AST/compileのみ直接PASS。4箇所のメモリ逆適用で旧16932B/a3f890全文SHAと直接一致、phase prefix除去で旧12825B/3bd28全文SHAも直接一致。

exact7keys/421B/期待fc2a38 SHA、固定C/tree/root/source/build/artifacts束縛、source登録blob/全dist集合・read/write実close・wx600/fsync・有限30s/caps・unknown heldは前preflightをそのまま継承する。current全root容量を工具が再走査した根拠はなく、Rootの別capacity precheck条件を残す。生成・default helper実行・新B追加read/stat/hash・root probe・全新旧private操作0。source/helper/管理編集0。対象readを停止し、Rootの別one writer判断へ返す。

## Original candidate finding

判定: **限定static FAIL / RELEASE-INODE1**。実生成の採用前に、書込FDとpostwrite読取FDの同一inode束縛だけを補正する。製品機能・新B完全受入の判定ではない。

固定対象は新public helper `p5c-release-metadata-writer.py` 16932B/SHA256 `a3f890f044ea87aeeb25e1909a81b0a9a81a35c10c82c154e61f04b84f212e4d` とphase 12825B/SHA256 `3bd28ec63aa04b7972028dddaa428300cf9feb1adb1719656ccfa394bee9000a`。canonical/regular600/nonlink/nlink1、NOFOLLOW全文readの前後dev/ino/size/mtime/ctime安定とfullSHAを直接確認。helperのPython AST/compileのみ直接PASS（helper評価・実行0）。候補 `b6e567b24e24c78e26bb1bbb147bdf0fc6588bd3`、新B c18a6f02への固定束縛である。

## RELEASE-INODE1

helper write():269–295はO_EXCL/O_NOFOLLOW600で元FDを生成し、fsync前後のdev/inoとsizeを照合して実closeする。しかし293行のpostreadへ元 `original.st_dev/st_ino` を渡さない。Reader.file():101–143はpostread時のpath lstat/open/fstat同士を比較するだけであり、元書込FDとの同一性を検証しない。

因果列: 元inode Aへwrite/fsync/close成功 → postread前に同一bytes/hash・600/UID/nlink1の別inode Bへpathを差替え → Reader.fileはB内の前後安定と期待hashを満たす → own書込inodeと異なるtargetで正常receipt。実際の差替えは未観測。phaseの「known own regular/inodeのpostwrite確認」に直接対応する不足で、現在の全writer停止はその検証の代用にしない。

最小修正は元dev/inoをpostreadへ束縛し、postreadのpath lstat・実open fstat・終了時pathが元inodeと同一の場合だけ正常化すること。異なる/unknownはheld。一般race工具の新設、広いroot走査や新policy追加は不要。

## 比例確認済みの条件

- 固定C/tree/root/cwd/dist、source/build fullSHA、outputs canonicalSHA、headblob canonicalSHA、source1457/20986203B・dist492/23202712B、required16とnamed export metadataをexact bind。duplicate keys/NaN/Infinity/unknown field/relative path escape、非safeintegerを拒否。登録sourceのblob/hash/bytesを照合し、唯一AGENTS→CLAUDE link文字列はfollowせず別検証する。Git755のactual600扱いも採用producer契約と一致する。
- manifest由来有限directory集合を使ってdist全entry集合を検証し、unknownをopen/hashせず拒否する。登録regularはNOFOLLOW/open、pathとFD前後metadata/fullhash、finallyの実close必須。read FD close失敗は正常へ補完しない。
- release exact7keys/schemaVersion1、独立静的計算421B/SHA256 `fc2a38fab7b652a2a09102aade8fb981f058c1501612382d83075bab7aa71818` 一致。source+input2metadata+releaseは21,391,316Bで32MiB内、dist208MiB/root256MiBの採用枠を維持。metadataのみでrenderer/normalclosed/native/proof/ACKを発行しない。
- Python1/stdlibのみ、child/network/socket/DB/Worker0。30s monotonic deadline、64KiB chunkの累積read budget、32768entry/pathdepth32、wx600 release4096B以内・fsync・実write FD close・期待bytes/hashのpostreadを維持。unknown/non0/partialwrite/close不明はheld、上書き/retry/成功補完なし。

新B実schema/HEADblob/manifest-listed全source/distの一致、元build閉鎖とpeakは担当の公開固定報告から借用。Verifierは今回、新B/source/dist/material実物へread/stat/hashしない。current全root/logs/TMP容量を再走査する工具ではなく、採用buildpeak+421B計算に限定する。Root所有者による現capacity precheckは別の起動条件として残る。

実行・release生成・root probe・新旧private操作0、source/helper/全体管理編集0。RELEASE-INODE1補正の限定再preflight後にRootが一回writer採用を判断する。対象readを停止した。
