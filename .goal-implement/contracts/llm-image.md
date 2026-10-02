# P5b-2b2 単画像の製品接続

[単画像案](../phases/P5b-2b2-proposal.md)を次の境界で採用する。静止JPEG/PNG/WebP/GIFの原本から完全decode・正規化・画像用途profile・単一dispatch・既本文commit/undo・本人履歴まで接続する。全ページ/混在/順序不明PDF・音声はP5b-3の必須残件であり、先頭像への縮退をしない。

image/preparationVersion3/promptVersion2を閉じたunion枝として追加し、旧V1/V2とprompt1のwire/保存/回復を不変にする。preparedはsingle-raster、profile/generateはchat-imageとし、架空HTMLやdocument recipe2へ偽装しない。原本identity・recipe・正規化policy・元/結果寸法・frame1・PNG byte hashを固定manifestへ束縛して親が再計算する。ordinal0の既dispatch永続化を再用し、PNG/base64をDBや履歴へ保存しない。具体transport shape/hash順は主担当の狭い型案で確定する。

次の正式0036でllm_conversions一表のCHECK再構築を許可し、全34列の旧値/PK/FK/trigger/index/ledger/owner/期限を保持する。旧text/html/markdownはNULL又は1＋prompt1、文書は明示2＋prompt1、画像は明示3＋prompt2のみ合法とする。新枝のNULLをIS NOT NULLで拒否し、recipe/prompt immutable/CASを維持する。既migration編集/backfill/他表再構築なし。通常環境への適用は停止backup・別cloneの正常/SQL故障/FK故障・旧全比較が成立してから別許可とする。

初期提供は全容器/CRC/animation/MPF検査、全decode、EXIF向き補正→sRGB→白背景alpha→metadata除去→PNG→再decode。縮小/切抜き0、原本50MiB、長辺4096px・16,000,000px・PNG8MiB・全JSON12MiB。小codec/4096境界とpure exact/+1の証明を最大負荷/RSS保証に読み替えない。固定専用native child、allowlist env、外部接続0、有限metadataとbackpressure付きbinary pipeを分離し、原本FD/child/IPC/全pipeの実exit/closeまで所有する。30秒source期限やabort/messageでclosedにしない。global2/account1/job30分/dispatch90秒/停止監督60秒を維持する。

image入力/text出力/chat/max_tokensの現在profileをsettings.imageで選ぶ。live custom15分又は版・期限付き画像default、完全catalogの明示非対応/廃止をfallbackで復活させない。imageTokens=null/contextGuaranteed=falseのresource-onlyとし画像token式を捏造しない。prompt2はtext先行＋自前PNG data URI一つ、任意URL/file/OCR pluginなし。固定chat endpoint/nonstream/redirect0/retry0/privacy条件、既応答/output上限を維持し、全JSONを組立時と送信前に有限検査する。実認証付き画像送信・課金・認識品質は未許可/未検証。

coverageは単frameの全画素入力だけを意味し、文字認識/内容品質を保証しない。向き/色/白背景の変換と認識誤りの可能性を説明し原本を確認可能にする。画像asset自動追加・生成srcの外部取得なし。既sanitizer/commitNote/FTS/pin/本文限定undo・現在認可/epoch/取消/予約/消費を再用し、保存済全応答は再準備hash一致時だけ後処理再開、不一致又はintent-onlyは非再送とする。

AI＋連携構成済み画像はLLMへ接続、未連携/未構成は原本とmetadataを保持した要LLM連携。AIoffは成功やneeds_aiではなく失敗とし、AI使用の再取り込み又はIM-06を案内する。画像quota超過は翌月案内であり機械変換を勧めない。静止先頭へのfallbackなし。現在actor-route/receipt GET/自動POST0/pending/390px/keyboardを維持する。具体fixture・fresh移行・通常回収はexact申告と個別許可、旧proof再実行と唯一backup driver-openはしない。

P5b-2b2の[具体型案](../phases/P5b-2b2.md#共有型と責務の具体案編集前判断)を採用する。input identityはprepared-raster/ordinal0、dispatchは同conversionの合法source/recipe/promptとのjoinから復元する。profiles.inspectはmodelIdとchat-text/chat-imageを明示し、用途別cacheとresource-only画像枝を使う。画像defaultは確認日から30日というローカル検証期限を付け、期限後はlive完全確認を要する。これは提供継続保証ではなく旧text defaultを変更しない。IM-06のモデル一覧もtransport境界で検証したchat-text/chat-imageをapplicationへ明示し、UIは原本formatの用途を渡す。現在actorを再照合し、一覧kindを変換対象/原本の認可根拠やclient指定model能力の保証には使わない。

画像childのstdinは原本binary、stdoutはPNG、fd3は16KiB以内の単一metadata JSON、stderrは内容を破棄し4KiB超過で失敗とする。全pipeに有限byte/backpressureとEOF照合を適用し、childが返すPNG hashを親の再計算で検査する。原本identityをchild引数/envへ渡さず、原本identity込みの最終manifestは親が固定配列で構成する。childと親のhash helper共用はこの責務差を曖昧にしない。Node APIのnetwork拒否はOS隔離の保証とは区分する。正式0036は旧34列を値のままcopyし、0035のNULL導入SELECTを流用しない。
