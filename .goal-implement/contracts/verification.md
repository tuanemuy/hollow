# 検証

domain / application の業務ルールは単体テスト、libSQL の transaction・認可・永続化は integration、主要操作は独立 Verifier のブラウザで検証する。外部 API と難しいファイル変換は実装前に公式仕様と実形式を確認する。基準テストの Node integration は標準の migration 生成込みコマンドで実行する。

通常のunit探索は製品testを対象とし、`.goal-implement/**` の管理・独立検証資料を除外する。資料自体は保持し、個別検証の証跡を標準unitの結果と区別する。apps/packagesの製品testやintegrationの対象範囲はこの除外で変えない。

長期稼働の検証DB・objects・local mailbox・鍵/自己資格情報・唯一の保全資料は、OS一時領域外の専用private rootへ置く。旧保全rootを稼働rootにせず、DB driverを接続する移行cloneとfresh機能環境を分ける。保全コピーは新規排他作成・currentuid/非symlink・directory0700/file0600とし、objectのbytes/SHAとDB整合を確認する。短命なunit testの専用tempは別用途として許容する。

P3cの通常ブラウザ検証はChromeのUser-Agentを明示する。固定依存のbot判定でHeadlessChromeがbot経路に入り、SSR後続Flightが届かない観測を通常ブラウザ経路と区別する。認可・URL条件・DB・bundleは同じ対で確認する。bot経路の未解消を成功とせず追加観察へ残し、通常notesのSSR/RSC streamingを変更しない。P4公開画面ではこの経路への影響を別途確認する。
