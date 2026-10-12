# LD01 literal Drive debts — 独立candidate preflight

**限定PASS（ONE実行前の静的判定）**。確認日時 2026-10-06T07:16:01.353746+00:00。Root採用の新test/fixture2path、限定Drive/storage FS cap2集合と専用工具を比例照合した。起動blockerは確認しなかった。literal debt2・閉鎖・ACK・same-intent resume・readonly auditのactual成功は未観測。本report固定後、全対象read STOP。

## 固定対象と直接根拠

source `e1e07e51d0726d92b54e14dcd05adc4efcfe11cb` / parent `548a8fefe53444ff6ee032fb9e22be7d7f9efbf2`。隔離P5d treeのGit HEAD/親と差分exact2を直接確認した。current94 manifestを正式sorted `path + ' ' + SHA256 + newline` で再構成し、`0301b5c743dcf36197e127acab5be9232507611e9bca149dd788b86aa84b98e3` 一致。94source合計1,851,779 Bのstable読取/fullhash/現HEAD blob、既92のparent blob同値を直接確認した。新2はregular600/nonlink/nlink1/canonical/UID。既92の公開sourceは600又は644であり、専用runnerも新test/fixture2だけを600必須にする。private工具／新validation fileの600条件と既tracked公開sourceのmodeを混同していない。

| 公開候補 | bytes | SHA256 |
| --- | --- | --- |
| `phases/P5d-literal-debt-implementation.md` | 26,756 | `ebedadc17d12e34c35c55682f376efc7af6b08ca0ce8a6c5691937f5aefc1507` |
| `phases/P5d-literal-debt-proposal.md` | 14,987 | `3ab9041d768e39aa83adf335ca0132e6de07803600269a276abfd5f2ae126f3b` |
| `helpers/p5d-literal-debt-runner.py` | 25,876 | `48f54648fbadd39a9a4dc3106ecf78558b5688a3dd50879023a41827469a201d` |
| `helpers/p5d-literal-debt-loader.mjs` | 24,600 | `9d6103dfd8e8b2c52ea039dfe466adc9eccefd5f3941b276f7138c264d90723a` |
| `accountDeletionLiteralDebt.integration.test.ts` | 11,219 | `4f7f4df2cf30c9f32824ff18665698437344337dc2ed86ff978cb0764c8ac79d` |
| `accountDeletionLiteralDebtFixtures.ts` | 18,417 | `50133913a3dc8c7faf4059ee3c1ff4963bfc3b7b65ac8de2f743b0693d3861fb` |

public helper/reportはNOFOLLOW前後dev/ino/size/mtime/ctime・regular600/nonlink/nlink1/canonical/UIDと全文SHAを確認、固定直前再確認した。元**公開**base c6befa10 runner25,203 B／19177532 loader22,845 Bも同じ静的方法で読み、全差分を確認しメモリ逆適用の全文一致を直接確認した（私有helper/結果の再利用0）。runner main supervisor ASTはcase/envのexact置換を戻すと元と同値。Python AST/compileのみ直接PASS、pinned Node syntax-onlyとwhole typecheck/lint:fix/format各exit0は主報告借用。これらをDBケース成功にしていない。

## 正規producer・literal debtの成立前提

- 元createNodeDriveはconfig/current canonical DBを検査し、acquireDriveRuntime→そのownershipを元NodeDriveExecutionへ渡す。fixtureは元CoordinatedObjectStorageのexclusive runtime/recoverOwnersを先にawaitし、factoryのwithOwner/openOwnedRandomRead ABIも満たす。native instance／private retirement registryを新造・模倣していない。
- 正常folder confirmation/beginからC/A/B3attemptを作る。空codeの元exchangeがnative HTTP前にDRIVE_UNVERIFIEDへ進むresources0対であり、利用者transport code正例／HTTP閉鎖正例ではない。
- typed generic withCaller委譲は元instanceをbindし、target/claimを元へ渡す。同settleをawaitした**後**、値を返す直前だけA/B gateを待つ。元withCallerはclaim lane終了後にsettleを呼ぶためgateはlane外。元finallyがcallerEnded→retirementreceiptを作る順を保つ。A/B closed row＋元native acknowledge完了でもcaller pending／closure held／退会receipt未発行が成立する設計。Cは先にwhole finally終了してgenuine receipt1を得る。
- original acknowledgeを実await後に記録するが、その記録をretirement receiptへcastしない。native receiptのproofは元registryがcopyするため、testはtarget/evidence/source同値とverify、receipt自身のidentityを比較する。未ACKやunknownをabsenceからclosedへしない。
- deletion workerはgenuine receiptを元repositoryへ保存し、別正常UoWのexact saved-read後にconsumeする。fixture providerは元this/args/結果/UoWのawaitと元method復元を保つ透明observerで、save/stepの値・proofを改造しない。
- 正式repositoryのdrive-attempts pageはowner active/unknown又はclosedでmatching durable retirement ACKなしをblockし、元durable rowのversion/runtime/token/cancelGeneration locatorからliteral debtをINSERTする。LD01はこの正規stepだけを呼ぶ。C削除progress1とA/B同row保持block2、matching intent/debt locator2、verifyのglobal EXISTS blocked1→waiting-ownerを直接assertする。fixtureのSQLはread-only projection/countのみ。
- gate release後は元caller finally→元receipt A/B→save/read/consumeへ進む。not-due wakeのintent/debt全文不変、logical2001後の同intent再開、attempt/debt/ACK全0・verify/succeeded、元never-linked connection epoch0/version1/credential-folder NULLを要求する。use2等の義務をliteral debt2へ取り違えた既EF対とは別根拠になる設計。

## FS・資源・閉鎖gate

追加はexactDrive owner/key/config/keyringとexactStorage owner/recoveryの2cap集合のみ。新objects directory700のexclusive mkdir、same dev/inoの元recursive mkdir1回、元stock open(wx,600)各1、empty recoveryだけの元unlinkを許可し、persistent writer-owner unlinkは拒否する。Drive temp/recoveryは元EXCL/NOFOLLOW numeric flags、同inode/prepostと元renameを保持。元FileHandle／native mkdir/rename/unlink/openの結果と例外を返し、同じreadonly alias/DB3/official TMP nativeENOENT/その他deny境界を維持する。未知既存entry／link／mode／UID／cap違反はheld。

原storage exclusiveRuntimeのwriter.close/recovery.closeは元finallyでawait、recoverOwnersは元ready/UoWをawaitすることを公開sourceで確認した。storageにはdispose/stopがないため、一般FDclosed receiptや全metadata handleの個別監督閉鎖を合成しない。正常fixture-closedはexecution.stop→passwordHasher.stop→正常FK/checkpoint/fileguard→client.close完了後だけ、失敗はnormalframe/監査なし。checkpoint値をnative proofにしない。

通常toolFork1/cacheFs=false/元argv・IPC・停止とPG3値は公開baseから継承。Node0／knownPGabsent／2EOF／Popen stdout-stderr各close actual return＋closedの独立4flags／force0／fixtureclosed／file-case-afterAll全成功後だけ、同DB1 direct mode=ro/query_only FK/integrity/anchor/debt/attempt/ACK0・never-linked connection検査へ進む。DB追加0。unknown/non0/timeout/denial/diagnosticは永久normal/auditdeny・held・次case／retry0。

予算はaccount1/browser1/attempt3/native whole caller同時2/receipts≤3、DB1 sidecars32MiB/総64以内、root192MiB、Drive owner合算16KiB・storage owner256 B＋empty recovery1、AES32 B/config-keyring合計16KiB、toolTMP8MiB空・log2MiB/material256KiB・frames40、Node1/stockfork1/business Worker-child-network0を維持。native work30s/close5s、gate ready/wait5s、case-hook40/body180/outer240（TERM10/KILL10/PIPE10内）を延長していない。

26 cursor tablesを元順序で確認した。各pageは25未満のseedで1wakeごとに次tableへ進み、first26＋not-due drain1＋resume26＝nominal53wakes、code上の上限64に収まる静的導出。実時間に初回26wakesがgate5sへ収まるか、native factory／actual literal rows／close／readonly auditが成功するかは未観測。static件数をactual成功へ補完しない。

## 引渡しと未完

起動前にRootが候補固定・standalone public precheck→専用runner defaultpreflight→ONE actualを別採用する。予約2b864a9c／派生toolTMPのprobe/create/defaultpreflight/import/run/key/DBは未実行。製品/helper/Manager文書変更、goal/spec/spec-implement/追加agent0。

LD01が成功してもresources0はnative HTTP・未知work・ACKfalse・legacy・前任65／通常capacity67・全secretコピー閉鎖・Google/UI／全P5d A–Hを証明しない。既basic/CR/HTTP/F02/EF局所受入の再演は不要。candidate限定PASSをRootのONE判断へ返し、全対象read停止する。
