# P5b-2b1 文書の製品接続

[最終差案](../phases/P5b-2b1-proposal.md)の型・版・保存・文書準備・表示契約を採用する。提供対象はDOCX/XLSX/PPTXと限定文字PDFの取り込み・原本からのIM-06。単画像は次の製品phase、画像/混在/順序不明PDFと音声はP5b-3の必須残件であり、原文の全媒体対応を完了にしない。未提供範囲は原本を保持して説明する。

SourceContractは旧text/html/markdown＋preparationVersion1/promptVersion1と、新文書4形式＋preparationVersion2/promptVersion1の判別unionにする。準備はtext-blocksの版別union、生成はchat-textとTextModelProfileの対応を型で固定する。coverageと有限noticeはapplicationの契約、XML/PDF解析・safe HTML・hash・HTTP変換はadapterへ置く。画像枝/recipe3/画像CHECKやthrow-only実装を今回追加しない。既profile.inspect/catalog/設定の契約は変えない。

旧保存NULLはeffective recipe1として読み、新規の旧形式は明示1で保存する。replaceはpreparation_versionをSETせず、正規化版をCAS条件へ含め、不一致は成功にしない。旧NULLのbackfill・旧V1 hash/出力順の変更はしない。文書は明示2のみ、旧形式2・文書NULL/1・未知版をDB/mapper/受付で拒否する。prompt1は既system文言・user JSON/ordinal・送信規則が同値の場合だけ維持し、同一入力のwire byte一致を検証する。新しい指示を足す場合は別版の提案へ戻す。

recipe2の準備identityは最終差案の固定順manifest（format、原本identity、全単位/頁coverage、全notice、全segmentのordinal/範囲/HTML）と各segmentの親manifest hashで束縛し、親が再計算する。旧V1の算法へ逆適用しない。保存済応答の回復でも再準備一致を要求し、不一致やintent-onlyを新しい送信へ変えない。全文/全頁を検査する前に発注せず、table/pre/codeの単体64KiB超を切り捨て・分割で隠さない。

製品の旧表再構築禁止に対する例外は、新0035_llm_document_preparation.sqlによるllm_conversions一表だけのC案とする。旧33列全値・関連FK/5trigger/4index・旧ledgerを保持し、nullable preparation_version列と形式/版組合せCHECK・版不変guardを加える。文書NULLは明示IS NOT NULLで拒否し、SQL三値論理による通過を許さない。旧0034以下と既snapshotを編集せず、固定libSQL公開migrateの停止専用接続・同TxのDDL/末尾FK assertion/ledger・失敗rollback・FK再有効化を使う。正式SQLでsynthetic正常/途中SQL/末尾FKの3対、旧新repository/CAS/回復/undoの比例対を実行する。最新Jからの停止backupと更なるaudit copyのclone・旧全値照合を揃えるまで通常fresh適用は許可しない。実環境のbackup/移行/fixture操作は具体対象をManagerへ事前申告し、別の実行許可後に行う。

V2専用文書Workerを既preparerの版dispatcherへ接続し、既機械parserとV1 Workerを変更しない。全package/page走査・境界検査と有限資源、owned source FD・Worker exit・pipe終了までの所有を必須にする。message/abort/期限だけでclosedへしない。原本50MiB、ZIP実展開128MiB・XML16MiB・4096entry/depth128、PDF/slide200・sheet100・走査cell200000、source30秒、64KiB×16を適用する。heap256MiBはRSS硬保証ではない。固定local PDF資材のみ、network/remote template/OLE/macro実行はしない。

Officeで文字/構造が網羅され非textだけ未解釈なら成功＋有限noticeを保存し、Original.coverageをpartialへ投影する。hidden単位も含め、文字欠落/未知part/壊れた関係は成功にしない。PDFは全頁text-covered/proven-blankのみ許可し、全白紙は文字なし失敗、1頁でもvisual/順序不明なら全文を発注せず有限理由を表示する。既V1のcoverage/noticeは保持する。新codeと日本語messageは固定し、raw error/part path/XML/鍵をDTOへ出さない。

PPTXのparagraph内は文字と明示a:brをXML文書順に扱い、run間へ架空境界を足さず、先頭/末尾/連続改行を保持する。table cellも同じ抽出を使い、単一plain paragraphの旧HTML byteを維持しながら、明示改行と複数/空paragraphの境界を区別する。扱えない本文境界を無言で捨ててtextComplete成功にしない。[V1限定修正案](../phases/P5b-2b1-v1.md)を採用し、共通serializer/recipe2/prompt1/DDL/hash算法は変更しない。修正対象の準備HTMLに伴うhash差は既保存all-responseのSOURCE_CHANGED fenceで非再送・旧本文保持とし、未影響資料のidentityと正常回復は不変にする。旧terminal成功を自動修復・再発注しない。

AI指定・有効連携の新文書はLLM受付へ接続し、未連携/未構成/AI不使用の既機械経路と通常HTML/MDの常時機械0回を保持する。LLM受理後の失敗を無言で機械成功へ置換しない。現在認可・quota・再連携・intent/unknown・本文commit/undoの既契約を再用し、新入力からの比例回帰を行う。全実外部/品質/費用は未検証の契約段階である。

同bundleの最大fixtureは新account2/WS1/member2/note6/原本10MiB。最小開始はaccount1・WS0・DOCX note1/原本64KiB以下。4文書正常、PDF gate失敗1、機械Markdown1を上限内で再利用し、他異常のWorker/DB/表示unit検証を実UI成功と混同しない。作成・保全・通常回収は事前exact申告と停止backupを条件にし、account/DB/key/mail/backupを保持する。新Pの契約実UIと最新Jを基点とするfresh移行/保全を区分し、旧proofや唯一backupをdriver-openしない。
