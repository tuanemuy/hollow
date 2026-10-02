# P5b-3a0 全ページPDF・音声の提供前gate

[全ページPDF・音声案](../phases/P5b-3-proposal.md)の「製品非変更gate → 全ページPDF縦接続 → 音声縦接続」を採用する。P5b-2b2/V1とP5b-2b1/V2の独立受入を前提に、gateは新専用領域の小prototypeと合成資料・公開一次資料の確認だけを行う。製品/旧migration/lock/配布物・既実環境は変更しない。gate成立を媒体の提供完了や実認識品質の成功にしない。全ページ/混在/順序不明PDFと音声は必須範囲に保持する。

PDFの第一候補は全頁local rasterの別source/recipeで、既strict文字PDF recipe2と静止単画像recipe3を変えない。全頁の連続ordinal、page box/rotation、renderer/policy、寸法、raster bytes/hashを発注前に確定し、白紙も初期gateでは入力へ残す。全頁PNG/base64を同時保持せず、逐次再描画/hash照合の成立を先に確かめる。spoolが必要なら所有・容量を含む別案を返す。有限解像度の描画は元画像全画素と同義ではない。可視annotation/form/layer/cropのpolicyと全頁・全量・処理時間・運搬上限を根拠付きで提案し、既単画像値/文字PDF頁数/16ordinalを無断転用しない。外部resource/PDF JavaScript/添付の任意実行、黙った頁省略や先頭頁だけの成功はしない。

音声は原本からowned full decode、全sampleを覆う区間manifest、専用STT全応答、本文構造化、既sanitizer/commitの別段階を候補とする。STT modelと本文modelを受理時に固定し、transcriptをchat HTML型へ偽装しない。channel/track、delay/padding、sample境界と末尾を検証し、純波形とmock transcriptの成立を認識品質の証明にしない。全decode量/時間・区間数/bytes・wire・全transcript・CPU/期限は原本upload上限とは別に根拠化する。

STT endpointのdata_collectionとallow_fallbacksは[公式tutorialのprovider routing節](https://openrouter.ai/blog/tutorials/transcription-on-openrouter/)で非適用と明記され、per-request data policyも利用不可である。require_parametersの適用は未確認。2026-09-29の利用者決定により音声は保留し他機能を先行する。別方式の調査・設計・製品接続も再開指示まで行わず、privacy条件を緩和しない。chat input_audioへの無言代替・実送信・課金0。音声は未完の保留であり提供済み・単なる実接続待ちにはしない。既PDF受入やローカル全sample coverageの根拠は維持し、現在はDrive等の非依存機能を進める。

論理1file/再生成1回・最初のdurable intentで消費・証明できた全未送信/実closeだけ返却を維持する。新stage/ordinal/複数modelと保存型・recipe/prompt/DDLはgateの成果として提案し、0036の一表例外を拡張しない。必要な全stage応答保存後だけ後処理を再開し、STT済みから新chatを自動発注する回復を既定へ加えない。部分応答/intent-onlyは非再送、旧本文と原本を保持する。[Eの静的状態案](../phases/P5b-3a0-state-contract.md)をpure検証の材料とし、全required集合の双方向一致・全job未送信・current/再準備/実所有の別判定を確かめる。状態表の成立はDB原子性や正式DDLの検証ではなく、提案値の採用でもない。

gateの合成資料はPDF4本（各2〜3頁）と音声4本（各10秒以内）を候補とし、正確な数/bytes/派生量/工具/期限/新rootを作成前に申告する。新依存install/native配備/DB/runtime/browser/製品UI/外部認証・生成は別許可なしに行わない。公開helperの既許可は旧proofの再実行を許可しない。実close/所有不明の小対と最大負荷/RSS/OS隔離の未実証を区分し、音声未成立理由と次PDF縦接続の具体差を別判定で返す。
