# ZIP writerの依存候補と最小成立確認案

## 結論

2026-09-26、Asia/Tokyoの読取調査。正式P4f実装・製品依存採用・動作検証ではない。推奨は、Node adapterの直接依存として`archiver@8.0.0`と公開確認済みの型`@types/archiver@8.0.0`を固定し、小さな`ZipWriter` portへ閉じ込める案。初期出力はSTORE方式を候補とする。圧縮はEX-02/03の必須条件ではなく、STOREなら圧縮率・zlib負荷を前提にしない出力予約を導ける。

採否が必要なのは直接依存8.0.0とSTORE方式の2点。公開型定義のexact版とnamed exportは確認済み。推移依存の解決結果、実closeとNode22での接続は未確認であり、正式probeに残る。ローカルの5.3.2を暗黙利用せず、`.pnpm`内部path、ExcelJSの内部API、独自ZIP実装を代替にしない。追加library候補は広げない。

元の[EX-02/03](../../spec/scenario/export.md)と[採用済みZIP契約](../design.md#一括zipの接続判断)を維持する。固定500件、1,000,000,000 bytesの圧縮前entry＋manifest、全体超過時の分割案内、部分成功、本人1件、完成7日、取消と実closeは変更しない。[保持](P4f-retention-proposal.md)と[保存構造](P4f-storage-contract-proposal.md)をwriter libraryの都合で変更しない。

## ローカルと公式一次資料

公式資料はすべて2026-09-26に閲覧した。版付きsourceを優先し、masterや汎用APIページを取得済みpackageと同一視しない。

| 観測 | 根拠と扱い |
| --- | --- |
| ローカルはArchiver5.3.2の推移依存 | [lock](../../pnpm-lock.yaml)はExcelJS→archiver5.3.2→zip-stream4.1.1→compress-commons4.1.2。core/webに直接archiverやその型の宣言はない。local packageはCommonJS、Node>=10、MIT。読取のみでimportは実行していない |
| 8.0.0は公式リリース済み | [公式release](https://github.com/archiverjs/node-archiver/releases/tag/8.0.0)と[変更履歴](https://raw.githubusercontent.com/archiverjs/node-archiver/8.0.0/CHANGELOG.md)は2026-05-08、ESM/Node18以上への変更を示す。Node22は宣言範囲内だが本製品での成功証拠ではない |
| 8.0.0の入口は旧factoryと異なる | [版固定index](https://raw.githubusercontent.com/archiverjs/node-archiver/8.0.0/index.js)は`ZipArchive`などのnamed export。[package](https://raw.githubusercontent.com/archiverjs/node-archiver/8.0.0/package.json)はESM/exportsを持つ。`import archiver from "archiver"; archiver("zip")`をそのまま移植しない |
| 8系の型sourceは存在 | [DefinitelyTyped定義](https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/archiver/index.d.ts)はnamed `ZipArchive`と`finalize(): Promise<void>`を定義。[定義package](https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/archiver/package.json)の8.0.9999はsource管理用であり、そのままインストール版ではない |
| 型の公開exact版は8.0.0 | 2026-09-26、別経路のread-only GETで[公式registry metadata](https://registry.npmjs.org/@types%2farchiver)を確認。8系公開版は8.0.0、latestも8.0.0、type=module、types=index.d.ts、license=MIT。dependenciesは`@types/node:*`と`@types/readdir-glob:*`。解決後のexact推移版は未確認 |
| 公開tarballの型も対応 | registryが示す[8.0.0配布物](https://registry.npmjs.org/@types/archiver/-/archiver-8.0.0.tgz)をGETし、保存せずstream展開で`archiver/index.d.ts`だけを読取。named `export class ZipArchive extends Archiver`、options constructor、append/abort、`finalize(): Promise<void>`を確認。インストール・import・型検査成功とは別 |
| ライセンス | Archiver8.0.0の[公式LICENSE](https://raw.githubusercontent.com/archiverjs/node-archiver/8.0.0/LICENSE)はMIT。配布時のcopyright/license notice保持を行う。推移依存の最終版一覧・noticeは依存解決後に確認する。本調査は全依存のlicense/security監査ではない |

[core package](../../packages/core/package.json)はESM、[tsconfig](../../packages/core/tsconfig.json)はbundler resolution/strict/exactOptionalPropertyTypesを使う。8.0.0のESM入口と方向は合うが、型確認やbundle成功は未実行。coreのNode adapterがimportするため直接dependencyはcoreへ置き、web側だけの宣言や公開されない推移依存解決に頼らない案とする。

公式8.0.0 packageにはzip-streamの範囲指定がある。Archiverだけをexact化しても推移版は一意にならない。正式依存変更時にはlockの解決版・integrityと対応sourceを確認する。今回参照した[compress-commons7.0.0 source](https://raw.githubusercontent.com/archiverjs/node-compress-commons/7.0.0/lib/archivers/zip/zip-archive-output-stream.js)は実装構造の根拠であり、未作成lockの解決結果を証明しない。

## stream・finalize・abortの境界

Archiverの公開APIはstream append、entry通知、finalize、abortを提供する。abortは残sourceをdrainしないbest effortであり、finalize呼出し前に終了監視を登録する必要がある。[公式API](https://www.archiverjs.com/docs/archiver/)

版固定8.0.0 sourceでは入力queueは逐次処理、finalizeのPromiseは内部moduleのend/errorに接続する。保存先や元ObjectStorage readerの実closeを返す契約ではない。外部adapterはprivate `_module`等にアクセスせず、公開APIと自分が所有するsource/sinkだけで終了を管理する。[8.0.0 core](https://raw.githubusercontent.com/archiverjs/node-archiver/8.0.0/lib/core.js)

writerの最小接続案は次の順序とする。

1. seal済みentry metadataとowner付きlazy openerを受け取る。全500本文や全spoolをbufferへ集めない
2. source/sink/archiveのerror・close監視を先に登録し、所有済み出力sinkへ接続する。sourceは一件ずつ開く
3. sourceの実bytes/hashを逐次照合してappendする。entry通知とsource実closeの両方を待ち、次のsourceを開く
4. 全entry後にfinalizeする。archive終端だけでなく出力sinkの実保存・hash・closeと全source closeを確認する
5. writerは検証済み出力情報を返す。現在認可・内容・generationの最終照合とartifact公開は外側の既存application/UoW責務とする

error/warning、hash不一致、短読/過読、取消時は追加openを止める。archive abortとowned source/sinkへの中断を行い、実closeを待つ。未公開出力はcleanupへ渡す。finalize Promiseが中断で未settleでも、実closeを観測した独立した終端管理で失敗を確定する案とし、Promise.raceだけでowner/容量を返さない。未close/終了不明は既存stopping・負債保持へ渡し、成功や回収済みとしない。

Node22のpipelineはsignalでstreamを破棄するが、finishedのsignalは監視を中断するもので、source自体を必ず中断する保証ではない。highWaterMarkは厳密なメモリ上限でもない。Node/Web stream bridgeと保存adapterの実closeを別に扱う。[Node22.22.3 stream](https://nodejs.org/download/release/v22.22.3/docs/api/stream.html)

read-onlyで確認したlocal5.3.2にもfinalizeの内部end依存とbest-effort abortがある。旧版へ戻すだけではこの所有責務は消えない。公式quickstartの取得は一度失敗しており、そのページのサンプルを今回の根拠にしない。

## ZIP64・サイズ上界

ZIPのdata descriptorはstream出力を支える。通常のsize/offset字段が収まらない場合やentry数が表現範囲を超える場合はZIP64が必要になる。ZIP64は小ファイルにも使える。[PKWARE APPNOTE 4.3.9、4.4.1、4.4.22〜24](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)

本製品はnote最大500と必要時manifest1件であり、無制限entryではない。採用済みpayload1GBは通常ZIPのsize範囲より小さい。STORE、制限されたflat名、commentなし、固定されたextra fieldの下では、archive上界を次のように導ける。

```text
archiveBytes = sum(entryPayloadBytes)
             + sum(localHeader + UTF8Name + localExtra)
             + sum(dataDescriptor)
             + sum(centralHeader + UTF8Name + centralExtra)
             + endRecords
```

ヘッダー等の形式長は仕様と実際に固定したwriter依存版から計算する。entry payloadにmanifestも含む。最終ZIPへ二重の1GB業務制限を課さず、上式から導く出力予約と実出力上限を別に持つ。STOREでもheaders分の追加diskが必要である。pointerだけを保存bytesの正本にしない。

初期案は`forceZip64:false`で必要時のlibrary自動対応を妨げず、製品上界が通常形式内に収まることを固定依存のheader/extra構成で確認する。falseがZIP64の禁止を意味するとは扱わない。小fixtureのforceZip64=true出力を任意の互換確認に使えるが、4GB実生成や大量entryを新gateにしない。[ZIP option](https://www.archiverjs.com/docs/archiver/)、[下位writer source](https://raw.githubusercontent.com/archiverjs/node-compress-commons/7.0.0/lib/archivers/zip/zip-archive-output-stream.js)

STOREは圧縮CPUとdeflate膨張率の見積りを避ける一方、圧縮可能HTML/MDのdisk/転送量は減らない。圧縮率を保証しないEXの最小実装候補であり未採用。将来deflateへ変える場合は圧縮後最悪上界・native buffer・CPUを別に確認し、平均圧縮率から予約を減らさない。

中央directoryのmetadataはentry数に比例して保持される。streamであることを定数メモリの証明にしない。固定500＋manifestのmetadataと最大名、source/sink buffer、保持中実体を測る対象とする。全体disk/RSS/期限の値は本案で作らない。

## flat名と依存方向

採用済みNFC表示・安全化・拡張子/suffix確保・元ordinal順・manifest予約を維持する。libraryのpath正規化に入力検査を任せず、flat通常fileだけをappendする。file/directory/glob/symlink APIは使わない。

衝突比較に幅mapping→NFD→full case fold→NFDを使う場合、既存[Unicode16データ](../../packages/core/src/adapters/node/browse/unicodeData.ts)と[純粋key処理](../../packages/core/src/adapters/node/browse/tagNormalizer.ts)の共通部分をNode adapter内の中立helperへ抽出する案とする。ZIP domain/applicationからbrowse adapterやTagNormalizerPortへ依存させない。既存タグの版assert・key意味は変えず、ZIP表示名へcase fold/NFKCを適用しない。具体mapping再利用は正式判断に残る。

## 正式実装前の最小probe候補

以下は方式を選ぶための合成対であり、既定の受入条件追加ではない。専用fixtureと環境所有者の調整下で一度に一つのprobeを行う案。今回すべて未実行。

| 対 | 確かめる差・根拠 |
| --- | --- |
| 固定依存と小さな日本語ZIP | Node22の公開named import・型・実streamを接続。HTML/MD/PDF相当の合成bytes、重複名/元suffix/manifest予約を使い、既存yauzlでentry名・順序・bytes/hashを照合する。PDF bytesはrenderer成功を意味しない |
| 遅いsinkと逐次source | 小さな複数entryで同時open数・backpressure・source/sink close順を観測。500件は小さなentry metadataの代表対に限る。finalize/entry通知だけで所有を返していないことを確認する |
| 1GB−1/等号/+1の算術境界 | 確定entry bytesとmanifest UTF-8 bytesのpure集計で境界を検査。actual streamは同じ累積検査器の小上限fixtureで最終chunk超過・短読・過読・hash不一致を通す。合計超過を子失敗のpartialへ変えない。1GB実bytesの全資源試験をこのprobeに追加しない |
| 正常closeと中断close | active source中/出力終端前の取消、source error、sink error、close遅延/close失敗を注入。新sourceを開かず、未公開・未返却ownerを保持し、実close後だけ返却する。中断でfinalize Promiseが残る場合も観測し、無理に成功へ合わせない |
| STORE上界とZIP64小対 | 実出力長を固定版のheader計算と照合。通常出力と必要なら小さなforceZip64出力を既存readerで読む。未知extraや計算不一致があれば予約式の未成立として返す |

小fixtureから1GB全体の性能成立を外挿しない。初期配備値を決める別の測定では、実RSS/外部buffer/FD、event loop遅延、CPU、spool＋assembly＋完成物＋負債のdiskを採る。既存PDF/HTMLMDのslot/容量を借りず、それらの処理を圧迫しない範囲を環境所有者が定める。新OS試験や全1GB資源試験をこの提案の必須gateにはしない。

## 未決と返却

Managerへ返す採否は`archiver@8.0.0`と公開型`@types/archiver@8.0.0`の直接固定、初期STORE方式。型の公開確認は完了し、推移依存・noticeの確定と上の小probeによるNode22/strict型/owned stream成立は未実行のまま残る。配布型に内部anyが含まれていても、内向きportへ流さず、未確認の入口差をunchecked castで隠さない。

インストール・tarball保存・import実行・ZIP生成・型/test/build・依存編集・DB・runtime・fresh/旧proof・秘密・外部への成果送信は行っていない。外部操作は委譲範囲の公開一次資料・registry metadata・配布型の非変更GETだけ。製品/管理正本/既存報告は未変更。goal-implementの役割分離、doc-style/markdown-styleに従い、採用済み契約と未採用案・未実証を分けた。本書全文を確認後、文書を含む全操作を停止する。
