# P4f-1 取得時退役の限定静的レビュー

## 結果

2026-09-27T16:34:00+09:00。固定P4f-1-E/Gの指定4pathを独立read-onlyで全文確認し、4つのSHA256が委譲値と一致した。**Eは限定範囲にコード上の不合格1件（V1）、Gの新要求案内は静的合格・独立実行未検証**。P4f-1全体やE/G全条件の正式受入判定ではない。

V1は外部媒体の一時DNS失敗・内部検査timeoutを、外部許可集合の確定変更と区別せず完成ZIPの不可逆retireへ使う経路。design「一括ZIPの接続判断」の「一時的なI/O失敗を失効根拠にしない」に反する。実行再現は禁止されており未実施。主・補助のDB一時例外非退役6対には外部identity不一致が未検証と明記されているため、その成功と矛盾する試験結果を主張しない。

ManagerへV1を通知済み。主もコード上の不成立を確認し、Managerは共有inspectionの既定best-effortを保ったZIP専用require-determinate案を採用したとの通知を受領した。ただし製品凍結中で、これは未実装の修正方針。現4SHAの不合格を修正済みへ変更しない。実行回復後、原因分類を維持した最小対による修正確認をImplementerへ返す。新しい受入条件は追加しない。

## 対象識別

`/usr/bin/shasum -a 256`、login:false、exit0で独立照合。管理正本・製品の変更なし。

| path | SHA256 |
| --- | --- |
| `packages/core/src/application/zip/delivery.ts` | `8c2623fa57b8cd592165481ee97aad73c8eb45b999cc8c478f899bf2d5157baf` |
| `packages/core/src/application/zip/worker.ts` | `b411b41a176581a536c4b70eef5f7e23966a08cc2dfbe7fd099fa95b031c9da7` |
| `apps/web/app/components/zip/client.ts` | `5aec39713a7d6fc37db7ed9b5a5b7e72d2fa50a34d797624307af22d2eac6f66` |
| `apps/web/app/components/zip/ZipHistory.tsx` | `b72e8e81dad5661c2a3dc5e8c5c7299533bfacaf5b4f6153966a57d927c052d6` |

goal-implement/SKILL.mdとmanager-loop全文を再読。plan固定E/G、design追加契約、主P4f-1の16:23節、retirement補助報告全文を照合した。必要な直接依存としてZIP snapshot、export content/inspection、session認可、workspace read、libSQL artifact repo/UoW、SafeReferenceFetcherのinspectionと期限、ZIP execution.withinを読んだ。DB・証跡原本・旧proofは開いていない。

## V1 — 一時的な外部検査失敗で不可逆退役

対象条件はP4f-1-E（EX-03、design現在read/内容一致と運用例外非退役）。Gの案内自体の誤りではないが、この誤退役でも利用者には新要求案内が表示される。

### コード上の最小経路

1. 現在read/保存内容を保つ本人の完成ZIPがあり、含有noteの外部媒体URLが生成時の`externalIdentity`許可集合に入っている。
2. 本人prepare又は既存ticket getの新取得時、外部媒体のDNS lookupだけが一時失敗する。他のnote/認可/期限は不変。
3. `node/reference/safeFetcher.ts:65`付近のlookup catchは`REFERENCE_DNS`へ変換し、`inspect:115`のcatchはthrowせず`allowed:false, reason:REFERENCE_DNS`を返す。`inspectMany:133`も内部5秒期限を`allowed:false, reason:REFERENCE_TIMEOUT`等の結果として返す。外側ZIP child/配信期限にはまだ余裕がある場合を考える。
4. `application/export/snapshot.ts:214–223`はinspect結果の`reason`を捨て、`allowed`だけで許可集合を構成する。従来含まれたURLが集合から抜ける。
5. `delivery.ts:63–77`はその集合hash差を`false`にする。`prepare:120–122`又は`get:203–205`は本人/現在artifactを確認したTxで`retire`してnull/falseを返し、Tx外で`ZIP_NOT_FOUND`を返す。
6. `zipArtifactRepository.ts:133–140`はready→cleanupと既存deliveryのclosed/closingを確定する。次の正常DNS結果では`currentZipArtifact`がready以外を拒否するため復活しない。

これは静的経路照合であり、DNS故障を実際に発生させた観測ではない。内部inspection timeoutと外側execution期限切れも区別する。外側signalが既にabortなら`within`は例外を投げて退役へ進まないが、5秒のinspection固有期限や直ちに返るDNS失敗では外側が継続し得る。

### 期待・実際・影響

- 期待：今回の取得は安全に拒否しても、一時的な検査失敗を恒久失効根拠にせず、artifact/run/成功履歴を保持する。正常な後続本人取得は再確認できる。
- 実際（コード）：一時失敗による集合欠落と確定した許可集合変更が同じfalseへ潰れ、artifactが不可逆cleanupへ進む。実close後の通常sweepでは物理回収対象にもなる。
- 影響：正当に7日保持する完成ZIPを、一時的な外部検査障害で失う。read/内容の本来の失効がなくても新要求の作成を要する。情報漏洩や実close前削除が成立する指摘ではない。
- 最小修正方向：ZIP取得のinspectionが運用上の未確定と確定した不一致を区別できるようにする。未確定は安全拒否のみ、確定不一致だけretire。既存単件exportの契約を無条件変更せず、共有戻り値/portへ影響する場合はManagerへ提案する。Verifierは実装しない。
- 再確認候補：既許可外部媒体を含む完成ZIPについてprepare/getそれぞれで`REFERENCE_DNS`又は内部timeout結果→拒否だが全artifact不変→正常結果復帰後同ZIP取得を確認し、実権限/内容不一致の不可逆退役対を保持する。外部実サービスを使う必要はなく、原因分類の既存adapter契約に従う有限注入でよい。

## そのほかの静的判定

| 観点 | 独立読解の結果 | 実行根拠との区分 |
| --- | --- | --- |
| 未認証・別actor非退役 | 合格。prepare初段はrequireAccount→request.accountId、get各初段はrequireAccount→delivery.accountId/状態/期限を先に検査。退役helperを呼ぶ前に拒否する | 独立実行なし。主補助6対の未認証/別actor全field不変を借用 |
| current-read/内容不一致のTx確定 | 合格。checked helperはZIP_NOT_FOUND/ZIP_CONTENT_CHANGED/EXPORT_EMPTYのみretire→null。各外側はUoW成功return後に非開示ZIP_NOT_FOUND。UoWは同transactionのrepoを使い、null/false returnではrollbackしない | 独立DB実行なし。補助の別Txcleanup確認とread復帰拒否を借用 |
| DB等の投げられた運用例外 | 合格。checked helperは非対象例外を再throw。retire書込やTx commit失敗も握りつぶさない | 外部inspectionの結果値に畳まれた失敗はV1であり、この合格に含めない |
| read復帰で旧artifact非復活 | 合格。retireはready→cleanup、currentはreadyだけ許可。repo退役にreadyへ戻す処理なし。成功run/results/attemptを変更しない | 補助の正式move往復2対・主同bundleviewer404記録を借用 |
| 内容不変move・本人read維持 | 合格。readZipSnapshotは現在note.ownerのcanScope(read)、内容identityはtitle/html/style/media/sources等で旧scopeを含まない | 補助実STORE bytes一致と主owner1079B一致は借用のみ |
| sweep・実close前回収禁止 | 合格（局所構造）。sweepもchecked helperをTx内で使い、false/例外ならtransfer cancel。retireはsendingをclosingにし、claimCleanupは非closed delivery/active object ownerを拒否。streamはnative close/closedとwithOwner完了後だけMap release→DB close。unknownではretain | 変更外の全owner/recover/DDLは再監査していない。native close gate中保持→解放後removeの補助実対を借用 |
| UIの安全な新要求案内 | 合格（静的）。ZipRequestErrorの限定codeをzipNeedsNewRequestで分類し、actor/epoch/revisionが現行の場合だけ案内表示。固定`/notes` Linkで明示再選択、自動POST/旧要求の自動再生成なし。取得pathはidからの固定形と照合 | 主新bundleのviewer案内/available=falseは借用、独立browserなし |
| 履歴available表示と現在認可 | 合格（限定）。availableは取得button候補として使用し、clickでprepareを呼んで現在認可を再確認する。取得開始を端末保存完了と称さない | prepare後native GETの全race/UI error表示を今回独立実行していない |

## 借用と未検証

主16:23報告の11file78Node（補助6を含む）、client24、全体型/規定checks/build成功と新bundle`4fe1f535…`UI記録を報告上の根拠として参照した。自己実行ではなく、proof原本やログの再hash/再読もしていない。retirement補助は実UoW/STORE/native FDを使うが、document plannerはpure/媒体なし。内容不一致はnote read注入であり永続本文変更の再現ではない。補助自身がHTTP/UI/外部identity不一致/全競合/close拒否等を未検証と区分している。

このレビューでは全テスト0、ブラウザ操作0、DB driver-open0、runtime操作0。型・最終build/配備・通常取消・全旧影響・回収/保全・全P4f-1受入は対象外。V1の最小動作対も未実行であり、修正後の正式候補で確認する必要がある。

## 実行障害と停止

最初のskill/reference読取は`/bin/sh`＋login:false＋`/bin/cat`でも無出力となった。自己session63682だけをCtrl-Cでexit130まで回収し、新execを重ねていない。Manager許可の`/usr/bin/sed`＋login:false（default shell）への1回切替は即時exit0で全文読了。その後native sed/grep/find/shasumの有限読取だけを逐次実行した。Node/browser等を診断再試行せず、shell差を原因と断定しない。参照path初回誤指定のsed/ls exit1は読取準備の失敗として区分し、製品不具合へ数えない。

本報告だけをapply_patchで作成。製品/管理正本/主補助報告は非変更。fresh/保全原本/秘密/opaque helper/旧proof/D01/外部資源/未知processは非操作。報告全文と対象4SHAを最終照合後、未回収exec0・文書/readを含め全停止してManagerへ返却する。限定実行不能を全体完成に読み替えない。
