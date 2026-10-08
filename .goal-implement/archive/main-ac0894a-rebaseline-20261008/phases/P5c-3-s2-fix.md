# P5c-3 S2 F1 修正候補

2026-10-01。候補 `2a03fe592f8a11b25caefdc838fef9e0bb8ab9c6`（commit時刻 `2026-10-01T19:07:02+09:00`）、基点 `d0af7c24e945958a9f944a33d79b33d4ba418179`。採用済みF1案のexact6pathだけを変更した。S2-A/Dの差戻しに対して主25対成功・skip0、規定checks成功、独立受入待ち。B/C/Eや全P5c-3を新たにdoneとはしない。S3保留、通常runner/DI/UI・本文採用・実外部は未接続のまま。

## 条件と直接根拠

| 条件 | 今回の結果 |
| --- | --- |
| S2-A/F1：旧closed/0・未消費proofを次beginで破壊しない | 実Node registry＋application純対、正式0043 SQLite対で、新beginはUoW前拒否、旧全typed値不変、旧finish同値確認→consume→generation2の正規開始/終了を確認 |
| S2-A：同consumer並行beginと容量競合 | 同期reserveでintent/開lease/unknown/proofを含め排他。純対で3consumer中2件のみ受付、3件目DB0。DB対で同consumer並行のUoW/replace/saved各1 |
| S2-D：未bind失敗とbound後不明を区分 | 未bind認可/read失敗2件はwrite0・枠返却・次の正当begin可。false CAS/未保存write失敗/先行bind後callback read失敗/commit応答不明はexact intent保持、次begin拒否 |
| S2-D：opaque identityと旧finish安全条件 | JSON/他registry handle、再bind別owner/世代、二重commit、二重settle/commit後settleを拒否又は非解放。既finish6対・Node memory6対の期待を維持 |
| 規定checks/固定 | type-04→lint-03→format-02→純22→DB3成功。製品変更はそれ以後0。oldDDL0043まで・journal・lock・dist/entry不変、build0 |

独立F1のDBなし2反例は旧candidateの反例として保持し、今回成功へ書き換えない。今回新13対（純10＋DB3）と既比例12対を合わせ25対であり、旧S2の137対へ重複加算しない。

## 実装

既RegenerationInputのopenをreserveBegin/bindBegin/commitBegin/holdBeginに置き換えた。reserveは同期でconsumer kind＋idと100MiB/max2論理枠を確保し、所有registryに発行したhandleだけを採用する。receiptはwrite前にbindしてimmutable化し、driver callback再実行の全receipt同値だけを受理する。UoW確定成功後、同じ枠をleaseへ同期転換する。

失敗境界のholdBeginは実stateがreserved（一度もboundなし）なら返却し、bound以後はexact receipt付きunknown intentを保持する。error名からrollbackを推測しない。偽handle・既終了・commit済みhandleはno-opで他entryを解放しない。元例外はそのまま再throwする。begin中にDBが確定したか不明なintentの自動回復/自動解放は提供しない。finishInput/markInputUnknownの認可・proof/attempt安全照合は変更していない。

| exact path（repo相対） | 差分 |
| --- | --- |
| packages/core/src/application/regeneration/services.ts | 限定admission型/4操作、open削除 |
| packages/core/src/application/regeneration/memory.ts | reserve→current→bind→write CAS→commit、失敗settle |
| packages/core/src/adapters/node/regeneration/memory.ts | 同期intent状態/枠、immutable receipt、leaseへの転換 |
| packages/core/src/adapters/node/regeneration/input.test.ts | 既6対の受付fixtureだけ4操作へ追従 |
| packages/core/src/application/regeneration/memory.test.ts | 既finish6対を維持し実Node memoryの追加10対 |
| packages/core/src/adapters/libsql/__tests__/regenerationInputAdmission.integration.test.ts | 新正式0043 DBの追加3対 |

retarget_webは新integration testの1pathだけsource作成し実行0、主が全文を読んで型/例外診断/終了処理を統合した。補助の作成を独立検証とは扱わない。補助は返却済み・全操作停止。

## 検証と失敗履歴

| label | 結果・適用範囲 |
| --- | --- |
| smoke-01 | 新root reporter1対成功、DB0。検証器具であり主25対外 |
| type-01 | 失敗：新純fixtureのgeneric mockにTS2322が1件。明示generic UoW＋別call counterへ修正。unsafe二重castなし |
| type-02/03 | 成功。後続lint修正前の根拠として保持 |
| lint-01 | 失敗。既warningの既定表示で新error位置が欠測 |
| lint-02 | error限定有限投影で新test6件（noUnsafeFinally1、useSingleVarDeclarator5）を特定。finallyでthrowせずclose後に再throw、const分離に修正 |
| format-01 | 中間整形成功。最終規定順の代替にはしない |
| type-04→lint-03→format-02 | 最終規定順成功。lintは `--diagnostic-level=error --max-diagnostics=100`、既warningをerrorと誤認せず、新error0。formatによる無関係差0 |
| pure-01 | 2file/22対全成功（Node6＋既finish6＋新10）、failed/skip/suiteerror0 |
| application-01 | 1新空DB/3対全成功、stages209/309/409、failed/skip/suiteerror0。実正式migrator0043、FK0/ledger44 |
| seal-01/02/03 | 公開source/dist初期/最終照合成功。02→03はhelperの新root beforeモード再利用修正と別名seal保存のみ、製品/DB再実行なし |

新純10対は、正常finish再照合、F1割込み拒否、同consumer並行、容量3件競合、開/unknown lease、未bind認可/read失敗、CAS false、保存済みcommit不明、未保存write例外/再callback read失敗、偽/旧handleと別owner/世代の有限表で構成。DB3対は同一新DB通常順で、(1)旧finish応答不明の再照合とgeneration2完了、(2)並行開始1件だけ保存/完了、(3)active50 commit応答不明保持。最後は1件50MiBの論理予約を意図的に保存している。実source buffer/worker/HTTP/FDが未終了なのではなく、未消費の開始intentについてDB確定後の呼出元応答が不明という保守状態を表す。JSONだけで回復したとは扱わない。

各DB caseのclosed=trueは**単一共有DBについてafterAllのclient.closeとexecution.stop完了後に同じ3metaへ反映**した値であり、各caseで別接続を閉じた証拠ではない。case3はFK/ledger/合算予約の照合も含むが、内部assertionを対数に加算しない。testworker/writer各1、複数SQLite writer競合や実consumer thread並行の実証ではない。

準備時statのBSD書式をGNU statへ訂正した。最初の出力は公開path/filesystem metadataだけで秘密なし。application後のwrapper末尾容量分類はregex過剰escapeでDBをotherへ数えた（旧記録のDB0/logical0は誤り）。総量4,427,052Bは正しく、test側の正規inputCapacityによりDB≤16MiB/全体≤64MiBは検査済み。helperだけをendsWithへ訂正し、DB再openせずseal metadataでDB2,215,936B/logical1と確定した。旧誤分類は上書きせず保持した。

## 資源・終了

新root `/Users/hikaru/.local/share/hollow/verification/p5c3-s2-fix-20261001-c88DXw` は排他0700/nosymlink。許可64MiB、DB1/16MiB、helper/log8MiB、TMP8MiB。唯一DBは `application.sqlite`、正式新空0043初期化1回。旧rootのDB/key/results/cacheは読取/hash/実行0、旧public helperは採用5本だけregular/bytes/fullSHA一致と自身EOF同一性を確認してapply_patch適応した。旧場所実行0。独立gap helperも読取/実行0。

最終seal-03末尾（supervisor結果保存前）は総7,866,898B、DB/WAL/SHM計2,215,936B、other5,650,962B、TMP0、logical1。末尾結果は有限小JSON1件で各上限内。前後metadata監視であり全書込のhard quota実装とは主張しない。公開seal追加前/追加後の容量は区分して保持。

全wrapperはcompile cache無効。type/lint/format180秒、pure外側90秒・case2秒・群60秒超を不合格化、DB外側180秒・case10秒・群120秒、通常close5秒。純群の60秒は終了時の有限時間照合であり強制中断のdeadlineは外側90秒、DB群はphaseごとの有限時間確認と外側180秒。いずれもdeadline/interrupt/terminate0。新source実ファイル/鍵/HTTP/実worker/Chrome/appboot/build/外部0。

pure子22793・DB子23052・最終seal子66415は各専用PGID=PID、自然exit0・childclose・stdout/stderr end・groupGoneを確認。失敗type/lintを含む今回全labelの子/両pipe/専用groupは同様に実終端、signal送信0。stop失敗や期限到来を自然終了へ読み替えていない。旧S2 type-06の歴史的欠測は本修正の終了結果で補完しない。今回DB・全結果は保全し、追加copy/audit再openなし。

## 公開固定指紋

canonicalはpath昇順の `{path,bytes,sha256}` 配列をJSON化してSHA256。tracked regular公開sourceに今回新testを含め、AGENTS symlink/管理/proof/node_modules/distはsource集合から除外。初期changed0、初期source＝基点、dist前後同値を確認。候補のtracked treeはclean、未追跡は管理`.goal-implement`のみ。6path以外の製品差/削除0。

| 対象 | 件数 / bytes | SHA256 |
| --- | ---: | --- |
| 基点source | 1447 / 20,768,071 | 40ea6b08205bbbc6948279808c963e0f37bbc1242da85d8210a023abd8c0b238 |
| 候補source | 1448 / 20,794,805 | a2d5bae3e039919255dea9a66eba7225d4d0842356adf46eb4b228d6a7db5bf1 |
| 旧DDL0043まで＋meta/journal、全同値 | 89 / 8,299,749 | a80ba3c298df718e94ce274df3595d5c74ec9d657bc0750f0a133bba12c76ef8 |
| pnpm-lock.yaml、同値 | 1 / 328,991 | 037740a80c95f580b0287c63a072862a0ba646a79133a0d30f048dc1b2bc5131 |
| dist、前後同値 | 9116 / 223,796,694 | 4f1bc6cf7df2198c4628fbdfd898b42f4707f0cd054594b1c22606f841ed40c6 |
| server/server.node.js、同値 | 1 / 3,732,860 | e159ac0c3aadc6206cc0ca8f60af06a75b4154ae163652ff010e88a534edb519 |
| server/nodeShutdown.mjs、同値 | 1 / 757 | 2de9a259cd47304c93dfe7a8086d9642e9def0ed55a5bd2401d99ffd69cd940c |

旧S2 source取得/ACK/worker13・SQL移行guard・S1 redaction/consumed等の不変更根拠を借用し全再演していない。begin順変更に届く正常受付は今回実SQLiteで確認したが、native13は本候補で再実行していない。build0の旧distにはS2/F1が未搭載であり、同bundle UI成功根拠にはしない。通常DI/UI・未知begin復旧・実接続は未提供/未検証。

## 最新公開helper allowlist

prefixは上記新rootのみ。以下5本は全てregular/nosymlink・主自身EOF確認済み、秘密埋込なし。元S2 sourceとのmetadata/hash一致確認後に新rootへ適応したもの。旧public source以外のprivate参照は行っていない。次担当は許可された新rootへ適応して用い、今回DB/resultsを再利用しない。

| basename | bytes | SHA256 |
| --- | ---: | --- |
| run-v2.cjs | 7595 | 356d85f7d9006c5200c31098ac79ae8c21ee5c00f5230a15f01c0af838e47857 |
| tests.mjs | 4807 | bf04974dc8fe87f7e547a7f10db0b8411e3198f408b44199157992d0e0aae9f6 |
| inspect.cjs | 4620 | c973ac2d69056adad8305eb2dfa0fc7a9212baf0f4106d52a5b7bd67a79474be |
| seal.cjs | 3966 | 892f4eee9b107e2de6495ad2d335c4bc0445de623c958b87456e78173ebc9659 |
| smoke.test.mjs | 157 | 128fe5f6bcb23a63760c6a5e38a84412a21a3723191be87892a53a6c48c81a56 |

run-v2の未使用旧action名（native/text/supervisor smoke等）は新実行許可ではなく、この5本で実行可能な本段はtype/lint/format/pure/application/sealだけ。sealは固定baseとpublic集合の比較、beforeモード→candidateモードの順が必要。初期before成功は旧版、最新before分岐修正は静的照合、最新candidate実行はseal-03成功。旧版seal-02も保全した。

補助/主の製品・test・helper writerと全新実資源は停止済み。本報告EOF確認と通知をもって文書を含む全read/write/runを停止し、独立検証へ所有を返す。

EOF
