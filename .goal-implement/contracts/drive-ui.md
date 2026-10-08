# P5c-1の残UI検証

[S5b-3独立評価](../reviews/P5c-1-s5b3.md)の部分根拠を受け入れ、残るfolder付き失敗/成功再連携、同ID folder作成、pagehideからBack/文書寿命は後続候補で確認する。[S5b-4](../reviews/P5c-1-s5b4.md)は工具の文書遷移競合で初回callback前に停止・保全済み。同候補87d0defの補助試行は反復しない。既合格の未構成解除・trash/missing・normal ACKは関連変更がある範囲だけ再確認する。

新0700 root `p5c1-s5b4-20260930-XXXXXX` に空DB/0038/account1/keys128B/RSA1を作る。boot/browser/probe各1、attempt3/control12/cancel1/issue3/selection1/generateId1/createPOST2同ID、logicalDB3/64MiB（active16・opaque/audit各8MiB）、材料256KiB/helper8MiB/browserTMP128MiB、Hollow1500/32MiB・provider24/6MiB同時1・背景150/1MiBを上限とする。notes/WS/assets/LLM/実backup/実外部通信0。旧rootのpublic helperは既知exact pathをmetadata照合→全文確認→新rootへ適応するだけとし、旧DB/鍵/resultsの読取・旧helper実行はしない。終了後は停止証拠とopaque保全、更なるauditだけの接続を記録する。

既知provider認可文書では既知origin/pathと一意で有効な予定anchorだけを観測し、アプリ専用snapshotを実行しない。観測はcallsite付き有限codeで分類する。pause中の明示結果GETと別のresume判定、契約class bridge、自己origin限定proxyは既受入境界を維持する。

Playwrightの既定 `--disable-back-forward-cache` だけを `ignoreDefaultArgs` で除外する。他の既定flag/CSP/外部denyは変えず、新profileを使う。実際の `pageshow.persisted` と通常のBackを区別し、合成eventや再試行の反復でBFCache成功を作らない。single bootで未到達なら未検証として残す。
