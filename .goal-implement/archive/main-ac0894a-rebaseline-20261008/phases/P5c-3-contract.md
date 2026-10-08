# P5c-3 source・receipt・owned read の具体契約候補

2026-10-01。Root 採用前の静的提案。基点は `fd4a2476a60a3ad4db3da2ac92235b0334e7e895` / migration 0041。入力は [共有案](P5c-3-plan.md) と [独立レビュー M1–M5](../reviews/P5c-3-plan.md)。本書は両者の方向を具体化する一案であり、DDL・実装・実行許可ではない。0042 は次番号候補にすぎず、予約しない。

## 最小構成と段階

新表は 3 表を提案する。Drive source binding、各実取得 attempt、機械再生成 receipt を分ける。既 record の列・version・immutable guard・暗号 purpose は変更しない。Original の storageKey を書き換えず、新 Original・永続 spool・取得 bytes の DB 保存を追加しない。

最初の縦切りは text/HTML/Markdown の local/Drive 選択、HTML/Markdown の機械再生成、既テキスト LLM 再生成、本文限定 commit/undo・本人 receipt。機械と LLM は同じ source を使うが、quota と実行結果は別にする。続く差分で Office/画像と PDF preview・本体再取得・全頁 proof を接続する。音声と P5d 本体は対象外。

## M1：候補と現在認可

既 `DriveBackupRecordRepository.forNote(noteId, accountId)` は本人 backup 用のままにする。再生成用 port を別に追加する。

```ts
type RecordCursor = Readonly<{ createdAt: Date; recordId: string }>;
type RegenerationRecordPage = Readonly<{
  items: readonly RegenerationRecordCandidate[];
  next: RecordCursor | null;
}>;
// application 内で current editor を確認した UoW からだけ利用する。
interface RegenerationRecordRepository {
  pageForNote(noteId: string, after: RecordCursor | null): Promise<RegenerationRecordPage>;
  findExact(recordId: string): Promise<DriveBackupRecord | null>;
}
```

候補は note 内の全記録者を対象に `(createdAt, recordId)` 昇順 keyset、1 page 25 件、投影後 JSON 16 KiB 以下。cursor は note ID に束縛して transport で厳格検査する。cursor は認可代替ではなく、各 page ごとに現在 editor を再確認する。DTO は record locator、内容形式/量、記録日時、`mine`、有限 availability/reason のみ。provider file/folder ID、sub、メール、resource-key、他人の job ID を返さない。GET は外部取得・分類・資格 refresh を開始しない。DB 上の候補可否は Drive の現在可読性を保証しない。

受理・claim・各再取得・最終採用で現在 executor の verified/editor、note active、本文版、ownershipGeneration、exact record→note/original/target、Original と record の format/bytes/hash、記録者の存続・linked 同 sub・受理 Drive epoch を検査する。記録者の現在 WS membership、現在 backup folder/settingsVersion、current head との一致を新しい継続条件にしない。別 record・別 sub・local へ自動 fallback しない。

## M2：型と保存

### 内容 identity とアクセス方法

既 `LlmSourceIdentity` の original/format/bytes/hash と recipe は保持する。アクセスの union を application 共有 source port の入力にする。

```ts
type SourceAccess =
  | Readonly<{ kind: "local-original"; originalId: string }>
  | Readonly<{
      kind: "drive-record";
      bindingId: string;
      recordId: string;
      executorId: string;
      credentialOwnerId: string;
      subject: string;
      driveEpoch: number;
      noteId: string;
      originalId: string;
      ownershipGeneration: number;
      fingerprint: string;
    }>;

type SourceConsumer =
  | Readonly<{ kind: "llm-conversion"; jobId: string }>
  | Readonly<{ kind: "pdf-preview"; previewId: string }>
  | Readonly<{ kind: "machine-regeneration"; requestId: string }>;
```

上記文字列/数値は transport の任意入力として受けない。client は source kind と record locator を選び、server が exact record・current account/connection から binding を構築する。fingerprint は version 1 の固定 canonical 内容 tuple の SHA256。record の既 identity を束縛する値であり、record を更新可能にする version ではない。local は現在 Original から storageKey を解決する。`redacted` は履歴専用の保存状態であり実行用 `SourceAccess` に含めない。

### 新表 3 と既表差

| 保存先 | 最小保存内容と制約 |
| --- | --- |
| `regeneration_source_bindings` 新表 | PK id、recordId RESTRICT FK、executorId/credentialOwnerId、noteId/originalId、subject、受理 Drive epoch、ownershipGeneration、fingerprint、cancelGeneration、version、createdAt。`llmJobId` / `previewId` / `machineRequestId` は各対応表への nullable UNIQUE FK で、ちょうど一つだけ非 NULL。identity/consumer は immutable、cancelGeneration/version だけ単調 CAS。鍵・token・bytes は保存しない |
| `regeneration_source_attempts` 新表 | PK id、bindingId RESTRICT FK、ordinal、purpose acquire/final-check、phase、version/cancelGeneration、deadline、実使用 credential binding、runtime/ownerToken、close proof/caller-end/ACK、有限 failure と取得観測 digest。`(bindingId, ordinal)` UNIQUE、binding ごとに未 ACK/unknown の attempt は最大一つ。再取得は旧 ACK 後の別行。attempt の bytes は実 bytes 本体ではなく検証済み count/hash のみ |
| `machine_regenerations` 新表 | PK id、executorId、noteId/originalId、commandId/requestDigest、source identity、sourceOrigin/bindingId、noteVersion/ownershipGeneration、旧 revisionNo・旧 Original state/coverage/activeJobId、createdAt/deadline/terminalAt、phase/outcome/failure、resultVersion、owner/runtime/token/cancelGeneration/version、source memory reservation。`(executorId, commandId)` UNIQUE、note ごとの live/unknown 部分 UNIQUE。quota/OR epoch/LLM dispatch 列なし |
| `llm_conversions` 既表 | `source_origin`、nullable `source_binding_id` FK、`source_memory_bytes` を追加。既 recipe、quota、source identity、Original linkage、responseBudget、owner、resultVersion は維持 |
| `llm_pdf_previews` 既表 | 上と同じ 3 列を追加。既期限/actor-note live guard、selection proof、consume linkage を維持 |

`source_origin` は保存上 local-original / drive-record / redacted。local は binding NULL、Drive は binding 非 NULL、redacted は terminal かつ実 owner 終了・memory 0 のときだけ binding NULL。consumer と binding は双方向の一致を adapter mapper と SQL guard で検査する。binding 側の 3 owner FK は `DEFERRABLE INITIALLY DEFERRED`、consumer 側 binding FK は通常 FK とする。受理 Tx は binding を先に挿入し、その consumer を同 Tx で挿入する。片方だけの commit、別 consumer への使い回し、Drive discriminator の後付け/消去は拒否する。SQLite/Drizzle の表再構築・deferred FK 表現の成立は DDL 実装前の確認点として残す。

機械 receipt は既 `conversion_jobs` の batchId/import semantics へ偽装しない。現在 `Original.activeJobId` は NOT NULL text で FK はないため、機械 request ID を設定し、共通の `BodyOperation` resolver を import / LLM / machine の閉じた union にする。受理 Tx で Original の前値を CAS し、active/unknown の別 operation と競合させる。machine のテーブル内 UNIQUE だけで LLM/import との排他を保証した扱いにしない。共通 SQL claim/受付 guard も各 live set を検査する。

本文編集/save/history restore/style に伴う変換操作、trash 確認、move/ownership、既 import job cancel/retry の Original 参照を同じ resolver に接続する。ID が machine だから既 import 取消を実行する構成は不可。失敗時は exact current activeJobId と世代を照合して旧 Original state/coverage/activeJobId に復帰する。成功は既本文 commit と同 Tx で resultVersion を記録する。既 revision 保持期限は延長せず、undo はその版がまだ存在する場合だけ。title/style/tags/公開 identity は巻き戻さない。

### 旧 row と rollback

既 conversion/preview はこの migration が対象とする既存 row に限り local-original / binding NULL / memory 0 と明示 backfill する。新 INSERT は origin 必須で、mapper の NULL→local 補完を置かない。新 Drive row の binding 欠測は有限 source-invalid とし、実行・返金判断を止める。保存済み legacy response の回復では元の local identity/recipe を維持する。

既 CHECK/trigger/index/FK は全保持する。クロス列 CHECK・deferred FK・新 live guard のため既 2 表の再構築が必要なら、その 2 表だけの再構築候補を Root に提出する。record/target/head の再構築は不要。未知旧 owner がある状態で列を backfill して安全を仮定せず、既正規停止・前任終了・backup を先行条件にする。

rollback は二段階に分ける。migration Tx の失敗は全変更 rollback。適用後でも新機能未受理なら、元 schema/guard を復元する検証済み down 手順を用意できる。新 Drive/machine 行を受理した後は旧 binary への即時 downgrade 禁止。新受付停止→既正規取消/全 owner ACK→対応版で history redaction/prune→復元可能性確認を経る。unknown が残れば schema と安全行を保持し、強制削除で rollback を成立させない。

## Port 配置

domain の regeneration source 型は identity/consumer/状態 union と不変条件だけ。repository は application の regeneration ports に定義し、UoW に binding/attempt/machine repository を追加する。実装は libSQL adapters。Drive 固有 provider は `application/integration/drive` の port、Node 実装は `adapters/node/drive` に置く。

`RegenerationSourceReader.read(consumer, access, identity, signal)` は local と Drive を application で明示分岐する。戻り値は検証済み buffer と memory lease。Drive 分岐は独立 `DriveSourceProvider.inspect` / `download` の閉じた入力だけを使い、任意 URL/request を内向き port にしない。`download` は expectedBytes/hash、exact file/folder/resource-key、現在資格、signal、既 Drive execution の resource registration を受ける専用 owned binary read。既 JSON `NodeDriveHttp.read` の body 上限は変更しない。

成功 reader は実 HTTP/socket/response close の保存・caller-end・ACK 後にだけ buffer を返す。close 不明は bytes を返さず、専用有限 error `{code, closed:false}` と durable unknown を残す。resource-key は既 record 用 `account/sub/recordId/fileId` purpose で都度復号し、target.folderEpoch や現在 folder AAD を用いない。

機械 branch は `OwnedMachineRegenerator` application port を追加する。既 `DocumentExtractor.extract` は signal/owner/実 close を持たないため、直接呼んだ Promise の timeout を終了証明にしない。Node の有限 worker 内で既 extractor/sanitizer を再用し、worker exit/stdout/stderr 終端が証明された後だけ結果を返す。既 note-owned 素材の map を渡し、任意外部 URL の取得を新規に開始しない。

## M3：状態・lane・終了順

`DriveOwnerTarget` に `{kind:"regeneration-source", attemptId}` を加える。明示 `laneOf(target)` は backup/source=data、authorization/control=control。data global 1 / credential-owner account 1、control global 2 / account 1、合算 global 3 / account 2。新 download pool は作らない。DB claim/held/refreshPending、Node runtime entry/resource 数、deadline、proof、caller ACK、前任復元、reconcile/maintenance/stop の全入口を同じ union に接続する。

attempt は以下の合法状態に分け、列の自由な組合せを認めない。

| 状態 | 採用/保持 |
| --- | --- |
| queued | native owner なし。期限付き待機、current 再照合後に claim |
| active | runtime/token/使用資格版/期限必須、data 枠保持。cancel は送信を fence するが所有を消さない |
| unknown | exact owner 識別子保持、data 枠/purge pin を保持。成功結果を返さない |
| closed-unacked | 実 close proof 保存済み。caller 終端/ACK が揃うまで保持 |
| terminal-acked | proof・caller 終端・ACK が揃う。成功観測又は有限 failure。data 枠解放可能 |

一 acquire attempt の順は current/資格 CAS→metadata 前検査→全 bytes download/hash→metadata 後検査→全 native close→証明保存→caller 終端→ACK。各 native request は逐次一つ。期待 bytes 超過即中止、EOF count/hash は record と Original の両方に一致必須。前後 metadata は exact file・元 parents/folder・非 trash・binary/非 shortcut・size・canDownload を確認する。redirect/export/abuse 自動許可/途中 retry はなし。取得 30 秒/各 HTTP、close 猶予 5 秒、metadata 64 KiB/header 16 KiB、合計最大 3 HTTP。logical deadline を越えて新 HTTP は開始しない。

Drive ACK 後に分類/機械/LLM へ進む。生成中は最初の Drive owner を保持しないが、source binding の取消 fence は terminal 採用まで生きる。本文採用前に別 final-check attempt を同じ data 枠で取得し、1 metadata request→実 close→保存→caller-end→ACK→DB current/CAS→本文 commit。外部観測から DB commit までの競合を分散 Tx として遮断できるとは保証しない。

通常 refresh は同 epoch/sub 内で実使用 credentialVersion CAS を更新し、新 source の refreshPending も同じ排他へ含める。遅い旧 401 は現資格を失効させない。subscriber は owner 通信枠を借りず、待機期限/signal で終了する。先行 acquire が unknown なら final-check/再取得は claim しない。再試行は新 command/現在確認であり、同 command GET に自動再 POST/再取得を隠さない。

### 合算メモリ予算候補

data 1 枠だけでは 50 MiB buffer を持つ複数生成を制限できない。追加の download pool ではなく、既 LLM/preview と新 machine に共通する source memory reservation を提案する。各 consumer の `source_memory_bytes` は 0 又は 50 MiB。global 合計 100 MiB、最大 2 consumer。acquire 前に予約し、local read にも同じ予約を適用する。既 LLM global 2/account 1 は変更しない。機械 worker は global 1、全準備 worker/child は共有予約の最大 2 内で動かす。preview も別枠を加算しない。空き待ちは logical deadline 内だけ、unknown は予約を保持する。

| 非 PDF 最初の縦切りで同時保持し得る対象 | 提案する計上 |
| --- | --- |
| 親の全 bytes 検証済み入力 | 50 MiB × 2 = 100 MiB。data 通信中 buffer もこの内数 |
| Worker structured clone 入力 | 50 MiB × 2 = 100 MiB。現 text preparer は transferList なしであり copy を省略計上しない |
| text/machine Worker V8 枠 | (old 128 + young 16 + stack 4) MiB × 2 = 296 MiB。machine wrapper もこの上限候補 |
| 準備 output/親コピー/LLM request/response | 合計上限 64 MiB の別管理予算候補。既 segment 16 × 64 KiB、request 12 MiB、response 2 MiB の最大 2 実行と UTF-16/serialization copy を含めて実装時に割当照合する。既個別上限は緩めない |
| HTTP header/metadata/chunk/hash scratch | 合計 2 MiB 以内。全 body を連結して二重保持しない |
| 上の合算 | 562 MiB。管理対象の丸めた上限候補 576 MiB。主 process の通常 heap、既 import、DB、allocator/native overhead は別であり process RSS 上限の主張ではない |

memory 予約は consumer の既 owner/runtime/token と結び付け、source ref の破棄と準備 worker/pipe の実終了が揃ってから 0 にする。Drive native close だけで解放しない。prepared result の採用待ち・LLM HTTP の別予算も保持し、slot を返した後に input bytes を closure に残さない。JS の参照破棄は即時 GC/RSS 解放保証ではない。機械 output の具体的上限を既 extractor/note の出力契約と照合し、64 MiB 別予算内で収まることを固定するまでは machine wrapper の実装開始条件が未充足。

後続 Office/PDF では現 document preparer の V8 枠が 256+16+4 MiB なので、上表より最大 256 MiB 増え、同じ計算法でも 818 MiB となる。画像 PNG 8 MiB、PDF 一頁 4 MiB の chunk+concat+base64 copy、child 入力コピー/renderer native memory はさらに別計上が必要。PDF の全頁 64 MiB は manifest 上の生成総量であり一括保持を許す予算と解釈しない。現 pages child は spawn で Worker resourceLimits と同一ではない。したがって非 PDF 576 MiB を PDF に流用しない。後続差分の child/native/親 copies の上限と機械出力上限は今回の未固定部分であり、有効化前に補完する。

## 機械・LLM・PDF の receipt

machine phase は queued→acquiring→preparing→final-check→terminal、outcome は pending/succeeded/failed/cancelled/unknown。owner closed と outcome cancelled を別に表す。受付で旧 revision と Original snapshot を保存し body lock、成功で resultVersion、失敗/取消で旧本文維持。受理 ACK 不明は同 command の純 GET receipt のみ。再試行は旧 source/方式/本文版を表示して新確認・新 command。機械 quota は常に 0。

LLM は同じ sourceReader と final-check/current を差し込み、既 preparationVersion/prompt/model 選択、論理 1 file 1 回、月 30 回、予約/dispatch intent/unknown/undo を変更しない。worker の初回分類・通常準備・PDF 各頁再準備の全 source.read 入口を origin 分岐へ接続する。一箇所だけ Drive を読んで後続は original.storageKey に戻す実装を避ける。

PDF は preview 用 binding/attempt と conversion 用 binding/attempt を別に作る。preview 5 分、quota 0/body lock 0、confirm Tx で既 proof consume+conversion+予約+旧版保存。conversion は exact record/identity をコピーした新 binding と新 owner で再取得する。preview の owner/buffer を移管しない。source binding は同じ record を指してよいが consumer owner は共有しない。PDF の実装は上記予算差分と比例対を固定してから委譲する。

## M4：同 Tx 取消と確認集合

共通 application fence は binding を `credentialOwner + driveEpoch`、`executor`、`note`、`scope/ownershipGeneration` で選べる。該当 binding.cancelGeneration と consumer cancel/新 dispatch 禁止、各 active attempt の取消を同 Tx で保存し、commit 後に exact owner abort/wake を通知する。通知失敗で永続 fence が失われない。

| 発火元 | 対象 |
| --- | --- |
| Drive 明示再連携の成功 / 解除 | 記録者の旧 epoch に属する全 executor の preview/machine/LLM source。失敗した連携候補では旧要求維持 |
| 通常 access refresh / backup folder 設定変更 | 同 sub/epoch の source は取消しない |
| executor 失権・note trash/purge・WS 削除・ownership 変更 | 対象 note/scope の source と consumer。pump の current 検知だけに依存しない |
| executor OpenRouter 解除/成功 relink | LLM と PDF preview の既取消に、その Drive source owner を追加。machine と backup は OR に依存させない |
| 記録者だけの WS 脱退 | 他 executor が有効なら record を永久失効しない。記録者本人が executor の要求は executor 失権として扱う |

再連携確認に `regenerationImpact: {previewCount, machineCount, llmCount, fingerprint}` を追加する。server の集合は live consumer と active/unknown/未 ACK source owner の和集合、consumer ごとに重複排除し、ID は digest にだけ使う。他人の job ID/本文/モデル/原本名は DTO に含めない。件数は安全整数、走査は DB keyset で有限 page とし、上限/期限内に完全 digest が作れなければ確認を出さず有限 unavailable とする。

新 Drive binding 受理は記録者 connection の既 admissionSequence を同 Tx で増やす。preview→conversion も集合が変わるため増やす。confirm は sequence と現集合 digest の両方を同 Tx で再照合する。取消・完了で集合が変われば digest 不一致により再確認。旧 confirmation に新 impact がない場合は現在の新集合が空のときだけ互換受理し、非空を無確認取消しない。backup の既 impact と混ぜず両方を確認する。

P5d への接続点は、将来の account active predicate と credential-owner 全 epoch fence 呼出しだけ。本フェーズで deleted 状態・秘密 redaction・退会 intent/猶予を追加しない。

## M5：全世代 purge/prune

note purge intent の同 Tx で binding/consumer の新取得・dispatch・本文採用を fence する。`hasWriters` は新 machine owner、source attempt active/unknown/未 ACK、memory reservation、既 LLM/preview owner の和集合を検査する。source だけが閉じても consumer worker 未終了なら purge は進まない。

全所有終端後、同 Tx で consumer sourceOrigin を redacted / binding NULL にし、閉鎖済み attempt→binding の順に除去する。その後に既全世代 head→record→transfer→target の回収へ進む。consumer の note/original FK と本文旧版参照は既 purge 方針に合わせ履歴削除/有限 redaction し、terminal receipt が永久 pin にならないようにする。現 head だけに限定しない。Drive 外部 delete/move は追加しない。

通常の履歴 prune は 90 日と実安全条件を両方満たすときだけ同じ source 参照解除を行い、receipt を削除する。record は存続 note から新要求を受けられるよう残す。preview の 5 分は使用期限であり owner 安全行の削除期限ではない。unknown/未 ACK は 90 日を越えても残す。未知の閉鎖を時刻だけで証明せず、既正規前任終了/reconcile へ接続する。

## 15 分区切りの成果・残

M1–M5 に対し、3 新表、既 2 表の列追加候補、機械 activeJobId 共通 resolver、owned download の終了順、共有 lane、別 executor への fence/確認 digest、全世代 purge の一案を提出した。公開 source の静的照合のみ。型/DDL 実現性・動作・資源上限の実測は未検証。

Root の採否が必要なのは、3 表と双方向 deferred FK、既 2 表の限定再構築可否、global 2 source-memory reservation と machine worker global 1、既確認 envelope の impact 加算。ユーザー仕様の再質問は不要。

実装委譲前の残は、(1) cross-table guard/SQLite migration と逆移行の exact SQL 案、(2) 共通 body-operation resolver の全既入口一覧、(3) machine output を含む 64 MiB 別予算の exact 割当、(4) PDF/Office/画像 child/native copy の差分上限、(5) 新規 DB/HTTP/worker/UI の検証資源と exact path。非 PDF の最初の実装に必要な (1)–(3) と検証許可だけ先行し、(4) は後続 PDF 差分の開始条件とする。

根拠は `adapters/libsql/llmSchema.ts`、`hollowSchema.ts`、`driveSchema.ts`、既 migrations 0039/0041、`application/llm/{request,current,worker,pdfPreview,ports}.ts`、`application/ports/documentExtractor.ts`、`application/note/{commitNote,trash}.ts`、`application/integration/drive/{connection,ports}.ts` と backup admission/record repository、`adapters/node/drive/execution.ts`、`adapters/node/llm/{sourceReader,sourcePreparer,documentPreparer,pdfClassifier,pdfPagesPreparer}.ts`、domain LLM/PDF/Drive limits。Google 文書/API は入力案の過去調査前提であり再照合していない。実 Google・actualfresh・実 LLM/費用は未検証。

製品/DDL/test/DB/runtime/HTTP/browser/秘密/旧 private 操作、外部実接続、音声作業、spec/spec-implement 呼出しは 0。本書以外の編集 0。Root 採用前に実装しない。EOF 確認後に全 read/write/run を停止する。

EOF
