# P5d: 退会の共有設計

[現行接続案](../phases/P5d-current-plan.md)の accounts 縮小 deleted 枝を第一候補として採用する。認証用 Account は active-only projection を維持し、既知退会者の表示と回収には別の人物状態読取を使う。既 account ID と存続 WS・移動済みノートの provenance FK を保持し、架空メールや偽 password を入れない。別 identity anchor 表へ全 FK を付け替える方式は、現時点では変更範囲が広いため採らない。正式な型・DDL・移行検証は P5d 詳細化で確定する。

退会は本人確認・唯一 active owner の同 Tx 検査・不可逆 account fence・認証/公開プロフィール/membership の失効・取消/回収 intent を原子的に受理する。物理回収は永続 account-deletion intent と専用 purge cause から有限 cursor で続け、実所有の終了待ちを退会猶予にしない。actor、現在所有 scope、cleanup authority の判定を分離し、creator/uploader 一致だけで WS や移動済みデータを削除しない。個人 URL は current scope 失効で404とし、handle を解放しても旧著者を再取得者へ付け替えない。

退会用の Drive 秘密縮小方式は未決とする。0041 historical target と immutable record を現場判断で更新せず、全 envelope コピー・閉鎖証拠・生 subject の必要最小保持を整理してから、限定 redacted 遷移と secret sidecar の最小差を比較する。opaque anchor の保持を秘密の永久保持理由にしない。新移行、製品編集、実データ退会/回収、外部物削除はこの設計採用では許可しない。
