# Hollow 実装計画

## 現在地

- 更新: 2026-10-07T00:04:08+09:00
- 作業場所: `/Users/hikaru/github.com/tuanemuy/hollow/.goal-implement`
- 依頼範囲: [brief.md](brief.md)。要件全体の完成と独立した統合検証を目標とする。
- 中断状態: 利用者の「一旦タイミングの良いところで中断」に従い、Managerと全担当のreaders/writers/owned child/Git/runtimeを停止。C1 8edbbac7の[独立SOURCE CODE局所PASS](reviews/P5c-3-drive-llm-c1-candidate.md)を維持し、[PURE18/genuine4family計画](phases/P5c-3-drive-llm-c1-validation-plan.md)の独立レビューは途中。SOURCE29/197599Bと原工具の全文照合・6+12casesまで確認、総合合否とconstructor恒等guard・%j expected names・control/material算出は未完。OWNERは[mapper分析](phases/P5d-owner-race-db-error-mapper-analysis.md)まで固定。requested2/handle1は元driver transaction呼出・await拒否へ絞るが具体driver codeはUNKNOWN、元expected2handleは維持。通常DB/jobは[363files/1943953B静的予算案](phases/P5c-ui-job-normal-fixture-runtime-final-budget-plan.md)の[PARTIAL独立レビュー](reviews/P5c-ui-job-normal-fixture-runtime-final-budget-plan.md)を固定し、BUILD708全union/圧縮同値の独立確認は未完。immutable79 SOURCE327/1920009BのGitmode/blob/fullSHA照合は完了、API/context・通常資源上限は未完で新phaseなし。helper2/3・SOURCE追加・新actual/root/native許可0。全actual private（c8bd52a4/派生TMP含む）は恒久非操作。
- main統合候補: `79ef126edd5d3440cde20dbe8fd372e7235010c5`（親b6e567b、Parser2受入、[統合独立PASS](reviews/P5c-s4-main-integration.md)受入）。S1–S4の受入根拠を維持し、[S4 main統合報告](phases/P5c-s4-main-integration.md)の22末尾blob/outside22/wholechecksを独立確認する。
- 台帳: **255 / 294 done**、review 1、in_progress 36、pending 1、blocked 1。全体要件 R01–R12 の受入は 0 / 12。後続の未採番作業を含まないため、255/294を製品の完成率として使わない。
- S5: e25修正の静的受入と[PURE4局所PASS](reviews/P5c-3-s5-pure-startup2-actual.md)を維持。[監査テーブル補正](reviews/P5c-3-s5-test-audit-table.md)後の[APP7局所PASS](reviews/P5c-3-s5-app-audit2-actual.md)と[正常native2局所PASS](reviews/P5c-3-s5-native-actual.md)を受入。native2はHTML/Markdownの正常系のみで、APPの応答喪失ケースをnative実測へ転用しない。前任owner回復の[追加1結果](phases/P5c-3-s5-native-d1-actual.md)は元childがexit1、全体held。[起動処理の独立照合](reviews/P5c-3-s5-native-d1-actual.md)でも決定的不一致は未確認、実失敗原因はUNKNOWN。段階診断の[独立補正PASS](reviews/P5c-3-s5-native-d1-stage-dfa-candidate.md)後の[stage2 ONE](phases/P5c-3-s5-native-d1-stage2-actual.md)もcase1failed/9skip・owner自然exit1、stageNULL/count0でheld。原因を推測せず、新rootも恒久非操作。[最終current/source fence3対](reviews/P5c-3-s5-final-fence-actual.md)はassertionsとinner閉鎖の局所PASSだがWAL又はjournalの不存在guardでheld、監査未到達。原子参照/resource undo・native応答不明・通常Drive UIと全A–F受入は未完。成功・失敗の全actual private rootは恒久非操作。
- P5d: [LD01局所PASS](reviews/P5d-literal-debt-version-actual.md)に加え、e30bb94の[DA01候補](reviews/P5d-drive-ack-implementation.md)と[DA01実行の独立局所PASS](reviews/P5d-drive-ack-actual.md)を受入。正規Drive実行がclosed行を保存後、元ACK呼出前のfaultで同proofを保持し、C行を進めながらA行のliteral debtを保持、再照合同proofの正規ACK/receipt保存・consumeからlogical2001の同intent再開を支持する。Node/PG/pipe・stockfork閉鎖とreadonly監査は正常。resources0をnative HTTP正例にせず、個別rawproof/page/実測sweep数を補完しない。ACKはvoidでありfalse返値やtrue unknownではない。unknown/legacy/65-67/全copy/並行競合/ブラウザと全体受入は未完。[CA67次計画](phases/P5d-next-phase-plan.md)を採用し、intent0/active通常ready67→68容量拒否→25/25/17 drain→同68再開→1drain→matched pruneの候補と工具を固定。限定静的PASS後のONEはdrain67段階で失敗、独立SOURCE照合でも原因UNKNOWN。DRAIN-CODE1の独立静的PASS後ONEはuow-boundを観測し、元UoW上限768の不足を支持する。[SOURCE上限案](phases/P5d-drive-capacity-uow-budget-plan.md)の正常837/保守905からcap1024を採用。guardとtest上限の2literalだけを変え、[独立候補PASS](reviews/P5d-drive-capacity-uow-candidate.md)後の[ONE](phases/P5d-drive-capacity-uow-actual.md)はCA67/正常outer-fork閉鎖/readonly監査PASS、[独立局所PASS](reviews/P5d-drive-capacity-uow-actual.md)を受入。個別rawproofや最終実UoW値の欠測を補完しない。history/ACK各68をこのcaseの上限とし、元registry67/browserRecent制約を維持。全actual rootは恒久非操作。
- UI: [TEXT境界局所PASS](reviews/P5c-ui-text-boundary.md)を維持。Web側zod link1と正式JSBI-CJS入口1の補正後、[browse4 build局所NORMAL PASS](reviews/P5c-ui-job-libsql-jsbi4-actual.md)を受入。service1の実exit0/stdio閉鎖、outerNode0/PG/EOF-FD/force0、4outputs・3094226B/manifest生成を借用確認。stderrinheritの個別EOF欠測と以前の失敗原因UNKNOWNを維持。完成領域も恒久非操作とし、後続は新しい同一操作内build→通常DB/job fixtureを計画。[独立計画レビュー](reviews/P5c-ui-job-normal-fixture-plan.md)の補正を採用し、exact PUBLIC runtime閉包・同期preload・通常認証countsを候補前に固定する。通常UI/P6は未検証、新Bは既採用read scopeだけ保持。

## 残作業と依存関係

後続作業は以下の範囲に固定する。未採番の行も要件の残作業であり、台帳の294項目には含まれない。委譲時に固定IDを採番し、観測できる条件と依存を確定して台帳へ追加する。検証ケース数や報告ファイル数を作業項目数に加算しない。

| 作業範囲 | 出所 | 残る完成条件 | 依存・再開条件 |
| --- | --- | --- | --- |
| Drive本人連携・保存先・解除 | R01/R08/R12、IN-04/05/08/09 | P5c-1 A–Fの残UI/通常接続・移行/統合根拠を揃える | S1–S5bの局所受入を維持。[正式実行案](phases/P5c-ui-execution-plan.md)と[独立レビュー](reviews/P5c-ui-plan.md)のUI-P3（工具binding/profile制約）を確定後、同bundle・新工具・有限資源を採用判断する |
| 原本バックアップ | R08/R10/R12、IN-05/06/09 | P5c-2 A/E/I/Jの残UI・relink・同bundle根拠を揃える | B/C/D/F/G/Hの受入を維持。保存先変更の利用者決定を適用 |
| 受入S4統合・機械基盤S5・Drive製品接続（後続未採番） | R03/R08/R10、IM-06、IN-07 | 受入22pathsをmainへ統合し、S5機械/共通本文・Drive受付/候補/UI/本文採用/巻戻しを結ぶ | [S5固定条件](criteria/P5c-3-S5.md)と[採用案](phases/P5c-s4-integration-machine-plan.md)。テキスト境界一巡の固定後main writerを解放し、統合担当へ委譲。後続Drive Slice Cを別委譲し、基盤成功を通常利用者経路へ転用しない。音声は保留 |
| 退会（P5d-A–H） | R11/AC-09、R07/R08/R12 | 最後のowner拒否・即時認可失効・資格縮小・個人データ回収・存続WS/移動済みデータ保持を接続 | accounts縮小deleted/active-only読取とDrive専用redacted枝の方向を採用。正式案＋独立P5d-P1補正を採用。P5c UI候補の固定を維持し、別worktreeの隔離実装を委譲済み |
| 機能横断の残検証と統合検証（P6） | P1-E/P2a-E、R01–R12 | 全要件の根拠を照合し、主要シナリオを日本語/keyboard/mobileで確認。規定checks・起動/再実行手順と既知の必須不具合解消を揃える | 実装可能な必須範囲の接続後。影響のない既受入を再演しない |
| 音声入力（保留、未採番） | R03/IM-01、R08/IM-06 | privacy条件を満たす方式と製品接続・検証 | 利用者の音声再開指示が必要。別方式調査も保留。未完の必須要件として保持 |
| 旧データ保全残件 | D01/R12 | 未復元37objectsの扱いを確定 | 回復元又は利用者の明示判断が必要。旧資材を非操作で保持 |
| 外部実接続検証 | R01/R08ほか、[外部依存](brief.md#外部依存の検証段階) | Google/メール/OpenRouter/Driveの実サービスで確認 | 設定・検証アカウント・送信/操作/費用の承認が必要 |

## 終了条件

| 到達点 | 判定 |
| --- | --- |
| 実装可能な範囲の完了 | 残機能の契約検証とP6を終え、保留/外部条件待ちだけを具体的に列挙できる状態。全体完成とは区別して報告する |
| 完了（実接続待ち） | 必須の未完が外部実接続だけの場合に限る。音声の保留・D01・製品未接続が残る間はこの判定を使わない。設定と再実行手順を残し、goalはcompleteにしない |
| 全体完了 | R01–R12と全必須項目の合格・根拠が揃い、保留/未接続/未検証がない。Managerが受入後にgoalとterminalを完了へ更新する |

## 新しいセッションからの再開

利用者の再開指示まで新しい作業を始めない。goalは明示中断としてpaused、statusのterminalはnullとし、done255/total294・lastDoneAtを維持する。全担当STOPを確認済み。

再開時は現在の未完部分から継続する。

- C1: 計画36621B/SHA4bf823489c36707e692bb5e053937911c1904b6fed3ff604985601ee191e7741の独立レビュー総合判定を完了する。Implementerはplan/CODEreview/親工具/29SOURCEのfullSHA/blob/modeを確認済み、報告未作成。PURE工具2候補とgenuine fixture2はまだ未作成・未採用。
- OWNER: mapper5990B/SHAb88e95c272045827a18eec0411959c3e99541c6f992f8ec7276f058dbbd71487を読む。次はP5d formal PUBLIC108/83から@libsql/client/package.jsonのexact bindingを確定し、metadata→Node/file entry→literal bodyを限定採用する。Rootの表抽出はPUBLIC_PACKAGE_METADATAを83 raw rowsと仮定してassert停止し、target本文未読。元表は重複行を含みunique83を求めるschemaで再開し、期待target/SHAを実物から再生成しない。
- 通常fixture: PARTIAL review6163B/SHAb6c1dca51cb2ea13e8f8a39313085ff655f76c8d384a6ee092bb122396298aedのBUILD canonical-row schema/圧縮同値未完を継続。SOURCE327はimmutable79の既知manifest期待に全一致、最大66531B。Git3roleはexit0/knownPGabsent/各2PIPE EOF/3FDclose/force0。通常authはBoundedHasher→Node crypto.scrypt、JavaScript Worker0。ASCII2 flowのSOURCE期待はdetect2/initialProjection2/extract2/finalProjection2の8Workers。同withParserAdmission importを確認したがcanonical単一moduleのglobal上限は未証明。選択20本文132849Bを含むaggregate2052858Bを計上済み。API/bare-export/ownalias/CSS親/外部TLA・PostCSS引数とUoW512/client4096/poll60/sweep/heartbeat/正常count/actualcloseは未完。新helper3/SOURCEcopy/native/build/DB/root操作は行わない。

1. goal-implementスキルとmanager-loop、[brief](brief.md)、本計画と[status](status.json)を読む。[design](design.md)は担当範囲のリンク先だけを読む。archiveと全phases/reviewsの一括読込は行わない。
2. [S3最終独立報告](reviews/P5c-3-s3.md)と[S4独立報告](reviews/P5c-3-s4.md)の要約で受入対象と限界を確認する。現在のDrive UI候補はmain b6e567bと新B c18a6f02に束縛した[compiled UI候補](phases/P5c-parser-ui-bindings.md)。旧B・旧失敗rootは非操作、新BもRoot採用の限定metadata/source/dist scopeだけを扱う。parserの正常終了はUIの機能成功へ転用しない。
3. [Drive残UI案](phases/P5c-ui-resume-plan.md)と[独立計画レビュー](reviews/P5c-ui-plan.md)、存在すれば正式execution-planを読む。UI-P1のエラー型橋渡しを起動前に具体化する。旧helper・旧root・旧distを借用しない。
4. Managerがexact新helper/同bundle/有限資源・期限・操作数を固定し、Implementerへ一フェーズを委譲する。旧案の12分等は未採用の提案値である。candidate固定/全writer停止後にVerifierへ渡す。
5. 既担当を操作できなければ停止記録を確認して新担当を起動する。失敗root/DB/results/cache/proof/旧PIDの再利用・探索0。[検証環境の再開](brief.md#検証環境の再開)を適用する。

## 障害と再開

- 今セッションのgoal APIに既存goalはなかった。明示継続とスキルの全体goal指示に基づき、briefと全体完成条件を持つgoalを設定した。前回のpausedをAPIで変更した扱いにはしない。
- status.jsonのterminalはnull。休止と、代替手段のないblockedは別に判定する。
- 外部実接続と音声・D01の判断は未許可/未解決。依存しない作業を進め、代替のない停止は残項目と再開条件を報告する。

## フェーズ

P0調査→P1認証/編集→P2取り込み/編集/ゴミ箱→P3ワークスペース/整理→P4共有/公開/書き出し→P5外部連携/認証残件/退会→P6独立統合検証。現在はP5c-1/P5c-2の残UI診断、受入S4統合とS5基盤、P5d退会を進める。

## 管理文書の更新

- 項目状態の正本は本計画、status.jsonはその機械可読な写し。[criteria](criteria/requirements.md)には固定完了条件と根拠への参照を置き、項目状態を複製しない。
- 現在地・残条件・最新根拠は該当箇所を上書きする。解決した障害・古い予算・時系列・長いhash/資源一覧を入口へ追記しない。
- 報告はphases/reviewsの先頭に現在の結果・判断点・根拠を置く。実行ログや失敗履歴は担当報告へ保持し、Managerは判断に必要な詳細だけを読む。
- doneの変更には元の完了条件へ影響する差分/失敗の根拠が必要。追加観察・好み・不変の検証を差戻し理由にしない。
- 15分を停滞確認の出発点とする。新しい完了・障害・判断依頼又は停滞期限で確認し、定期報告のためだけに再試験しない。
- 利用者の必須要件・保留項目を進捗率や停止判定のために削らない。spec/spec-implementは呼び出さない。

## 項目台帳

全294の固定IDを以下に記載する。複数IDを一行にまとめた行では、列挙した各IDに同じ状態を適用する。完了条件の本文と根拠はリンク先を参照する。

## P5c-3-S4: 通常local残形式

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-3-S4-A, P5c-3-S4-B | done | [固定条件](criteria/P5c-3-S4.md)・[独立合格根拠](reviews/P5c-3-s4.md)。569b0906の5形式closed0・型対応、preview/fresh reader世代・別consumer・論理quota1を、Native7/pure12/app9・正常終了・copy/DB監査と独立静的照合で受入 |
| P5c-3-S4-D | done | [固定条件](criteria/P5c-3-S4.md)・[独立合格根拠](reviews/P5c-3-s4.md)。04e20ff3の実active/unknown前任対、出生予約/known PID・生存拒否とESRCH後取得、2CAS rollback/commit応答喪失・同proofのsaved exact回復を、実正常終了/DB監査と既P12拒否境界の静的照合で受入 |
| P5c-3-S4-E | done | [固定条件](criteria/P5c-3-S4.md)・[独立合格根拠](reviews/P5c-3-s4.md)。d0cc21aの内部V4正規lease/別pages・実原本close、画像応答喪失の同proof/leaseと派生pending・pin/execution→同g consume一回/正常終端解放、実Worker1/child3個別EOF-FDと既Native7配線を照合して受入。工具fork欠測とcopyaudit0はFに保持 |
| P5c-3-S4-C | done | [固定条件](criteria/P5c-3-S4.md)・[独立局所PASS](reviews/P5c-3-s4.md)。4cba22b7のC01–C05正規9ケースでno-claim確定/unknown保持、次reader前取消/失権/期限、partial possible消費とprepare/intent not-sent返却・旧本文保持を受入。finish応答不明は既E02根拠を継承。JSON集計拒否後の監査欠測はFに保持 |
| P5c-3-S4-F | done | [固定条件](criteria/P5c-3-S4.md)・[独立PASS](reviews/P5c-3-s4.md)・[正常閉鎖監査](phases/P5c-s4-c-summary-proposal.md)。4cba22b7とsummary最小修正で9pass/afterAll、canonical Node/Python0・実PG/EOF-FD・個別stockfork閉鎖、内外strict/sidecar/有限コピー/readonly FK・integrity・固定counts/auditclose/最終容量を受入。IPC EOF欠測と過去held監査を補完せず、追加S4再演は不要 |

## P5c-3-S5: 機械再生成と共通本文

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-3-S5-A, P5c-3-S5-B, P5c-3-S5-C, P5c-3-S5-D, P5c-3-S5-E | in_progress | [固定条件](criteria/P5c-3-S5.md)・[採用契約](phases/P5c-s4-integration-machine-plan.md)。e25の[独立静的PASS](reviews/P5c-3-s5-d1.md)、[PURE4](reviews/P5c-3-s5-pure-startup2-actual.md)、[APP7](reviews/P5c-3-s5-app-audit2-actual.md)、[正常native2](reviews/P5c-3-s5-native-actual.md)の局所PASSを受入。native2は正常HTML/Markdownのみ。原proofIdを保つclosed0/owneractive回復は実装済みだが、[追加1実行](phases/P5c-3-s5-native-d1-actual.md)は元child exit1でheld、実原因UNKNOWN。c137の[最終fence3対](phases/P5c-3-s5-final-fence-actual.md)はassertions/afterAll/Node-fork正常閉鎖を通過したがdatabase-unclosed-journalでheld、readonly監査NULL。[独立照合](reviews/P5c-3-s5-final-fence-actual.md)でrouting不一致は未確認、exactsidecarと原因はUNKNOWN。正規driver閉鎖契約を限定照合中。atomicrefs/resource undo/native応答不明と通常Drive UIは未完。全actual private rootは恒久非操作 |
| P5c-3-S5-F | in_progress | [固定条件](criteria/P5c-3-S5.md)。normalNode backendと後続Slice C/P5dの同IN-07通常Drive entry/UIを結ぶ。backendだけでdoneにしない |

## P5d: 退会

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5d-A, P5d-B, P5d-C, P5d-D, P5d-E, P5d-F, P5d-G, P5d-H | in_progress | [固定条件](criteria/P5d.md)・[共有契約](contracts/account-delete.md)・[基本/CRの局所根拠](phases/P5d-implementation.md)・[nativeHTTP局所根拠](phases/P5d-native-http-implementation.md)。基本11/正常3DB監査・CR5/正常FD閉鎖後DB監査/局所回収は成功。d02a512cのconnectedと3390291fの単一通常unlink履歴は、通常active縮小拒否・対象copy回収・正常閉鎖後readonly監査まで局所成功し独立照合済み。[HTTP独立根拠](reviews/P5d-native-http-implementation.md)。22fd3e1のACK precommit rollback保持→同proof正常ACK/consume・cursor再開も局所受入。c6964deの51履歴25page・commit応答喪失・cursor再開・verify/succeededも局所受入。[ページ独立根拠](reviews/P5d-paging-runner.md)。548a8fの複数active use・C-only perrow各page・非empty最終waiting拒否・同proof確定/ACKconsume後同intent再開も[独立局所PASS](reviews/P5d-multiple-debt.md)を受入。use義務2はliteral debt2ではなくresources0はnativeHTTP正例ではない。040b07の[LD01局所PASS](reviews/P5d-literal-debt-version-actual.md)でliteral debt2の正規生成/保持/C-only進行/非空verify拒否/同receiptconsume後同intent再開と正常監査を受入。e30bb94の[DA01独立局所PASS](reviews/P5d-drive-ack-actual.md)で正規Drive closed保存後のACK前fault保持・同proof再照合/正規ACK/receipt保存consume・同intent再開と正常監査を受入。ACKはvoidでありfalse返値やtrue unknownではない。[CA67通常容量とmatched prune](reviews/P5d-drive-capacity-uow-actual.md)はready67→同68拒否→25/25/17消費→同68再開→1消費→履歴68削除と正常監査を局所受入。unknown/nativeHTTP未ACK/legacy/複数epoch/全copy/並行競合/ブラウザ等は未完、全体受入0 |

## P5c-3-S3: 通常local textの入力接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-3-S3-A, P5c-3-S3-B, P5c-3-S3-C, P5c-3-S3-D | done | [固定条件](criteria/P5c-3-S3.md)・[独立合格根拠](reviews/P5c-3-s3.md)。候補c425c2aの正常接続/不明intent/取消/前任回復と停止監査を受入。 |
| P5c-3-S3-E | done | [固定条件](criteria/P5c-3-S3.md)・[独立合格根拠](reviews/P5c-3-s3.md)。候補863097fの規定checks/有限停止監査、新build fae1de7cの全source/assetsと参照欠落解消を受入。 |

## P5c-3-S2: 実取得と入力段階の安全終了

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-3-S2-A, P5c-3-S2-B, P5c-3-S2-C, P5c-3-S2-D, P5c-3-S2-E | done | [固定条件・検証根拠](criteria/P5c-3-S2.md)。不変更範囲の受入を維持 |

## P5c-3-S1: 再生成の保存型と候補読取

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-3-S1-A, P5c-3-S1-B, P5c-3-S1-C, P5c-3-S1-D | done | [固定条件・検証根拠](criteria/P5c-3-S1.md)。不変更範囲の受入を維持 |

## P5c-2: 原本バックアップ

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-2-B, P5c-2-C, P5c-2-D, P5c-2-F, P5c-2-G, P5c-2-H | done | [固定条件・検証根拠](criteria/P5c-2.md)。不変更範囲の受入を維持 |
| P5c-2-A | review | [固定条件](criteria/P5c-2.md#p5c-2-a)。Retarget後のhead到達差を同bundle UIで確認する。既バックアップの不変更根拠を維持する。 |
| P5c-2-E | in_progress | [固定条件](criteria/P5c-2.md#p5c-2-e)。relink UIが未完。旧バックアップの取消/実終了等の中核は既根拠の適用範囲を利用する。 |
| P5c-2-I | in_progress | [固定条件](criteria/P5c-2.md#p5c-2-i)。保存先利用不能の理由・確認付き再選択/新規作成・復元案内の主要UI。 |
| P5c-2-J | in_progress | [固定条件](criteria/P5c-2.md#p5c-2-j)。A/Iと同bundle等の統合根拠が未完。DDL/checks/build・運用文書は既根拠の適用範囲を利用する。 |

## P5c-1: Drive本人連携・保存先・独立解除

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5c-1-A | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-a)。認可callback・本人/browser/世代束縛の残UI・通常接続検証。局所受入済み範囲を再演しない。 |
| P5c-1-B | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-b)。保存先選択・確認・現在設定版の残UI検証。 |
| P5c-1-C | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-c)。同IDフォルダ作成と応答不明/再起動の残接続検証。 |
| P5c-1-D | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-d)。Googleログインから独立した解除・再連携と旧backup取消の残接続検証。 |
| P5c-1-E | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-e)。configured状態・Picker・current actor・dirty/ACK等の残UI。S5bの残3群を後続候補で確認する。 |
| P5c-1-F | in_progress | [固定条件](criteria/P5c-1.md#p5c-1-f)。同bundle UI・actualfresh 0038・停止保全・実接続手順の残検証。 |

## P5b-3a1: 全ページPDFの製品接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-3a1-A, P5b-3a1-B, P5b-3a1-C, P5b-3a1-D, P5b-3a1-E, P5b-3a1-F, P5b-3a1-G, P5b-3a1-H | done | [固定条件・検証根拠](criteria/P5b-3a1.md)。不変更範囲の受入を維持 |

## P5b-2b1 V2: 文字PDFの寛容回復拒否

固定条件は対応する項目節と[採用設計](design.md)を参照する。

## P5b-3a0: 全ページPDF・音声の提供前gate

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-3a0-A, P5b-3a0-B, P5b-3a0-C, P5b-3a0-D, P5b-3a0-E | done | [固定条件・検証根拠](criteria/P5b-3a0.md)。不変更範囲の受入を維持 |

## P5b-2b2: 静止単画像の製品縦接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-2b2-A, P5b-2b2-B, P5b-2b2-C, P5b-2b2-D, P5b-2b2-E, P5b-2b2-F, P5b-2b2-G, P5b-2b2-H | done | [固定条件・検証根拠](criteria/P5b-2b2.md)。不変更範囲の受入を維持 |

## P5b-2b1: Office・限定文字PDFの製品縦接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-2b1-A, P5b-2b1-B, P5b-2b1-C, P5b-2b1-D, P5b-2b1-E, P5b-2b1-F, P5b-2b1-G, P5b-2b1-H, P5b-2b1-I, P5b-2b1-J | done | [固定条件・検証根拠](criteria/P5b-2b1.md)。不変更範囲の受入を維持 |

## P5b-2b0: Office・文字PDF・単画像の提供前技術gate

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-2b0-A, P5b-2b0-B, P5b-2b0-C, P5b-2b0-D, P5b-2b0-E, P5b-2b0-F | done | [固定条件・検証根拠](criteria/P5b-2b0.md)。不変更範囲の受入を維持 |

## P5b-2a: テキスト本文生成・再生成・月間枠

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-2a-A, P5b-2a-B, P5b-2a-C, P5b-2a-D, P5b-2a-E, P5b-2a-F, P5b-2a-G, P5b-2a-H | done | [固定条件・検証根拠](criteria/P5b-2a.md)。不変更範囲の受入を維持 |

## P5a: Google認証・ログイン方法管理

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5a-A, P5a-B, P5a-C, P5a-D, P5a-E, P5a-F, P5a-G, P5a-H | done | [固定条件・検証根拠](criteria/P5a.md)。不変更範囲の受入を維持 |

## P5b-1: OpenRouterの認可・モデル設定

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P5b-1-A, P5b-1-B, P5b-1-C, P5b-1-D, P5b-1-E, P5b-1-F, P5b-1-G, P5b-1-H | done | [固定条件・検証根拠](criteria/P5b-1.md)。不変更範囲の受入を維持 |

## P4f-2: PDF一括ZIPの製品接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4f-2-A, P4f-2-B, P4f-2-C, P4f-2-D, P4f-2-E, P4f-2-F, P4f-2-G, P4f-2-H | done | [固定条件・検証根拠](criteria/P4f-2.md)。不変更範囲の受入を維持 |

## P4f-1: HTML/Markdown ZIPの製品縦接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4f-1-A, P4f-1-B, P4f-1-C, P4f-1-D, P4f-1-E, P4f-1-F, P4f-1-G, P4f-1-H | done | [固定条件・検証根拠](criteria/P4f-1.md)。不変更範囲の受入を維持 |

## P4f-0: ZIP writerの成立確認

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4f-0-A | done | [固定条件・検証根拠](criteria/P4f-0.md)。不変更範囲の受入を維持 |

## P4e: 一括公開範囲変更

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4e-A, P4e-B, P4e-C, P4e-D, P4e-E, P4e-F, P4e-G | done | [固定条件・検証根拠](criteria/P4e.md)。不変更範囲の受入を維持 |

## P4d-3: 公開・共有ページの匿名PDF

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4d-3-A, P4d-3-B, P4d-3-C, P4d-3-D, P4d-3-E, P4d-3-F, P4d-3-G | done | [固定条件・検証根拠](criteria/P4d-3.md)。不変更範囲の受入を維持 |

## P4d-2: 本人単件PDFの縦接続

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4d-2-A, P4d-2-B, P4d-2-C, P4d-2-D, P4d-2-E, P4d-2-F, P4d-2-G, P4d-2-H | done | [固定条件・検証根拠](criteria/P4d-2.md)。不変更範囲の受入を維持 |

## P4d-1: PDF素材供給と監督配備

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4d-1-A | done | [固定条件・検証根拠](criteria/P4d-1.md)。不変更範囲の受入を維持 |

## P4d-0: 単件PDFの成立確認

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4d-0-A | done | [固定条件・検証根拠](criteria/P4d-0.md)。不変更範囲の受入を維持 |

## 完了条件

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| R01 | in_progress | [固定条件](criteria/requirements.md#r01)。全体の根拠照合と統合受入が残る。 |
| R02 | in_progress | [固定条件](criteria/requirements.md#r02)。全体の根拠照合と統合受入が残る。 |
| R03 | in_progress | [固定条件](criteria/requirements.md#r03)。全体の根拠照合と統合受入が残る。 |
| R04 | in_progress | [固定条件](criteria/requirements.md#r04)。全体の根拠照合と統合受入が残る。 |
| R05 | in_progress | [固定条件](criteria/requirements.md#r05)。全体の根拠照合と統合受入が残る。 |
| R06 | in_progress | [固定条件](criteria/requirements.md#r06)。全体の根拠照合と統合受入が残る。 |
| R07 | in_progress | [固定条件](criteria/requirements.md#r07)。全体の根拠照合と統合受入が残る。 |
| R08 | in_progress | [固定条件](criteria/requirements.md#r08)。全体の根拠照合と統合受入が残る。 |
| R09 | in_progress | [固定条件](criteria/requirements.md#r09)。全体の根拠照合と統合受入が残る。 |
| R10 | in_progress | [固定条件](criteria/requirements.md#r10)。全体の根拠照合と統合受入が残る。 |
| R11 | in_progress | [固定条件](criteria/requirements.md#r11)。全体の根拠照合と統合受入が残る。 |
| R12 | pending | [固定条件](criteria/requirements.md#r12)。全機能の独立統合検証と残不具合の修正が未着手。 |

## 既存データの保全残件

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| D01 | blocked | [固定条件](criteria/preservation.md#d01)。未復元37objects/13,222Bの回復元又は利用者が明示した扱いが必要。保全対象へ操作しない。 |

## P1 の実装・検証項目

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P1-A, P1-B, P1-C, P1-D | done | [固定条件・検証根拠](criteria/P1.md)。不変更範囲の受入を維持 |
| P1-E | in_progress | [固定条件](criteria/P1.md#p1-e)。Drive設定導線への変更後のシェル・pending・モバイル・起動手順の残検証。既存の不変更根拠を維持する。 |

## P2 の分割

取り込み・メディア・編集の固定条件は以下のP2a–P2c、削除はP2dを参照する。

### P2a: ファイル取り込みと永続ジョブ

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2a-A, P2a-B, P2a-C, P2a-D, P2a-F | done | [固定条件・検証根拠](criteria/P2a.md)。不変更範囲の受入を維持 |
| P2a-E | in_progress | [固定条件](criteria/P2a.md#p2a-e)。Drive履歴併設後の履歴・ticker・再試行・取消の残検証。既存jobの不変更根拠を維持する。 |

### P2b: 参照・メディア・表示style

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2b-A, P2b-B, P2b-C, P2b-D | done | [固定条件・検証根拠](criteria/P2b.md)。不変更範囲の受入を維持 |

### P2c / P2d: 残編集とゴミ箱

固定条件は対応する項目節と[採用設計](design.md)を参照する。

### P2c-1: 共通保存・20版・復元

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2c-1-A, P2c-1-B, P2c-1-C, P2c-1-D, P2c-1-E, P2c-1-F | done | [固定条件・検証根拠](criteria/P2c-1.md)。不変更範囲の受入を維持 |

### P2c-2-G: Text-only方式の先行確認

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2c-2-G | done | [固定条件・検証根拠](criteria/P2c-2-G.md)。不変更範囲の受入を維持 |

### P2c-2: ビジュアル・HTML・モード遷移

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2c-2-A, P2c-2-B, P2c-2-C, P2c-2-D, P2c-2-E, P2c-2-F | done | [固定条件・検証根拠](criteria/P2c-2.md)。不変更範囲の受入を維持 |

### P2c-3-G: WYSIWYG方式の先行確認

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2c-3-G | done | [固定条件・検証根拠](criteria/P2c-3-G.md)。不変更範囲の受入を維持 |

### P2c-3: WYSIWYG・警告・変換前復元

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2c-3-A, P2c-3-B, P2c-3-C, P2c-3-D, P2c-3-E, P2c-3-F | done | [固定条件・検証根拠](criteria/P2c-3.md)。不変更範囲の受入を維持 |

## P2d の実装順

検証根拠: [独立観測準備](reviews/P2d-prep.md)。

### P2d-1: 個人ゴミ箱と現在認可

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2d-1-A, P2d-1-B, P2d-1-C, P2d-1-D | done | [固定条件・検証根拠](criteria/P2d-1.md)。不変更範囲の受入を維持 |

### P2d-2: 単一完全削除と期限回収

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2d-2-A, P2d-2-B, P2d-2-C, P2d-2-D, P2d-2-E, P2d-2-FD | done | [固定条件・検証根拠](criteria/P2d-2.md)。不変更範囲の受入を維持 |

### P2d-3: ゴミ箱を空にする

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P2d-3-A, P2d-3-B, P2d-3-C, P2d-3-D, P2d-3-E, P2d-3-F | done | [固定条件・検証根拠](criteria/P2d-3.md)。不変更範囲の受入を維持 |

## P3a: ワークスペース作成とscope基盤

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3a-A, P3a-B, P3a-C, P3a-D, P3a-E, P3a-F | done | [固定条件・検証根拠](criteria/P3a.md)。不変更範囲の受入を維持 |

## P3b-1: 招待・参加・メンバー・一般設定

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3b-1-A, P3b-1-B, P3b-1-C, P3b-1-D, P3b-1-E, P3b-1-F | done | [固定条件・検証根拠](criteria/P3b-1.md)。不変更範囲の受入を維持 |

## P3b-2: ワークスペースのアイコン

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3b-2-A, P3b-2-B, P3b-2-C, P3b-2-D | done | [固定条件・検証根拠](criteria/P3b-2.md)。不変更範囲の受入を維持 |

## P3c: 一覧・全文検索・タグ読取・カレンダー

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3c-A, P3c-B, P3c-C, P3c-D, P3c-E, P3c-F, P3c-G | done | [固定条件・検証根拠](criteria/P3c.md)。不変更範囲の受入を維持 |

## P3d-1: タグ付与・管理

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3d-1-A, P3d-1-B, P3d-1-C, P3d-1-D, P3d-1-E, P3d-1-F | done | [固定条件・検証根拠](criteria/P3d-1.md)。不変更範囲の受入を維持 |

## P3d-2: 単一ノートの所属先移動

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3d-2-A, P3d-2-B, P3d-2-C, P3d-2-D, P3d-2-E, P3d-2-F, P3d-2-G | done | [固定条件・検証根拠](criteria/P3d-2.md)。不変更範囲の受入を維持 |

## P3e: 選択と一括整理

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3e-A, P3e-B, P3e-C, P3e-D, P3e-E, P3e-F, P3e-G, P3e-H | done | [固定条件・検証根拠](criteria/P3e.md)。不変更範囲の受入を維持 |

## P3f: ワークスペース削除

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P3f-A, P3f-B, P3f-C, P3f-D, P3f-E, P3f-F, P3f-G, P3f-H | done | [固定条件・検証根拠](criteria/P3f.md)。不変更範囲の受入を維持 |

## P4a: 限定共有・表示名

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4a-A, P4a-B, P4a-C, P4a-D, P4a-E, P4a-F, P4a-G, P4a-H | done | [固定条件・検証根拠](criteria/P4a.md)。不変更範囲の受入を維持 |

## P4b: HTML/Markdown単件書き出し

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4b-A, P4b-B, P4b-C, P4b-D, P4b-E, P4b-F, P4b-G | done | [固定条件・検証根拠](criteria/P4b.md)。不変更範囲の受入を維持 |

## P4c: 公開・発見とプロフィール

| 固定ID | 状態 | 完了条件・残条件 |
| --- | --- | --- |
| P4c-A, P4c-B, P4c-C, P4c-D, P4c-E, P4c-F, P4c-G, P4c-H, P4c-I, P4c-J, P4c-K | done | [固定条件・検証根拠](criteria/P4c.md)。不変更範囲の受入を維持 |

## 判断記録

過去の判断と整理前の全文は[保全スナップショット](archive/20261002-before-cleanup/README.md)へ保持する。通常の再開では読まない。現在の判断は本計画・brief・designの該当箇所を上書きする。
