# 実行基盤と境界

Node.js + libSQL を採用する。TanStack Start / React 19 RSC、transport validation、構造的なエラー変換、Unit of Work、outbox、lease と冪等な consumer を既存テンプレートから再利用する。

認証、ノート、ワークスペース、タグ、ジョブ、外部連携を責務ごとに分離する。集約をドメインに、リポジトリと外部処理の契約を内側のポートに置き、libSQL・filesystem・外部 API はアダプターが所有する。DTO は application で投影する。全データを単一の JSON 状態へ集約しない。

ノート所有先は個人 / ワークスペースの判別可能な union とする。公開状態と変換状態は独立して表現する。application の各操作でセッションと現在の所有・membership・role を評価し、保存時には版競合も検出する。公開・共有・asset・export の閲覧判定を共通化する。

WS-05/06の除名・脱退はmembership由来のアプリ閲覧・編集・非公開権限を即失効させる。SH-05/07の公開・共有リンク閲覧は独立した根拠とし、現在の公開状態・lifecycle・token・パスワード条件を評価する。元メンバーだけの公開禁止や共有リンクの一括失効は行わず、公開閲覧からアプリ権限への昇格も認めない。[P3-Q1](../reviews/P3-prep.md)の適用範囲として採用する。

元ファイル、メディア、生成物は ObjectStorage ポートの filesystem アダプターで保持する。保護対象は公開静的ディレクトリに置かず、取得時に認可する。Job を DB に永続化し、outbox は起動通知を担う。処理終了時にも権限とキャンセル状態を確認して結果を適用する。

Job の正本は永続レコードとする。起動時と周期的な sweep が queued / lease 失効を拾い、outbox consumer は起動を早める通知だけを担う。通知の重複・欠落や consumer の処理済み記録のタイミングに、ジョブ完了の正確性を依存させない。結果の反映は lease の所有・現在の状態・権限を条件にした transaction とし、古い実行の完了がキャンセルや新しい試行を上書きしない。
