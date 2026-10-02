# P3 の所有と容量の接続条件

IM共通前提は個人5 GB・WS20 GBの別scope上限を定める。AC-10は個人とowner/editorが参加する各WSの使用量・上限・更新時刻を表示する。所有scope、作成者、upload実行者を分離し、WS-05/06の除名/脱退とAC-09の退会で残存WS noteの原本・媒体・版・companionを失わない。

[P3接続案](../phases/P3-contract.md)のQ2/Q3を以下の契約で採用する。原文未指定の容量ルールはbriefの仮定とする。P2d-3にWS実装を前倒ししない。

- Q2: 移動後の所属先の使用量と予約が上限を超える場合、移動全体を拒否する。同UoWで両側の現在編集権限・対象version・容量を照合し、所有・タグ・容量を一括変更する。個人は既存5×1024³ bytesを維持し、WSは20×1024³ bytesとする。表示はGiBまたは実bytesとの対応を明記する。
- 移管対象はnote由来の原本、現在/保持版のasset、同noteの未参照猶予asset、bound staging、未完了予約、回収待ち負債である。未bind・note未生成の予約と兄弟noteは移管しない。provenanceを正本とし、本文中のURLやuploader一致から所有を推定しない。
- 物理keyと回収claimは移動で変えない。旧writerのpublishは所有世代で拒否し、finally/cleanupは所有行IDから現在の容量所有へ接続する。予約はwriter終了と実回収まで保持する。変換/再生成中は原文どおり移動を拒否する。その他の実行中I/Oを理由とする追加拒否は未採用であり、接続不能なら具体的な根拠と代替をManagerへ返す。
- Q3: 各scopeが保持する同梱素材全量を一度ずつ数える。同scopeのnote数・版数では重複計上しない。off/失敗でも再利用可能な恒久bundle関係を保持対象に含める。全scopeの使用量合計は物理disk量とは異なる。素材から生成したassetは別実体として数える。
- 最後の元scope関係を解除しても別scopeが保持する間は物理削除しない。元scopeの論理chargeだけ解除し、残scopeのchargeを保持する。全scopeの最後の関係を外したときは一意のcleanup所有へchargeを残し、writer収束と実削除確認後に解放する。失敗中は回収対象のscope tombstoneを保持できるが、本文・資格情報・期限外job詳細を保持する理由にはしない。
- 作成者・upload実行者・job実行者と資源所有scopeを分離する。移動や脱退で人物を書き換えず、元uploaderの退会によって残存WSのファイルを削除しない。job履歴は本人限定、未保存draftは作成者限定を維持する。
- 移動はnote.versionを進めて旧非同期結果を拒否する。本文/title/display、作成/更新日時、20版とpin、revisionNo、保存済み変換元は保持し、本文版を追加しない。保持revisionの記録versionを移動後headに付け替えない。

P3は作成・scope接続、招待/役割、一覧/検索、タグ/移動、選択操作、WS削除の順に分割する。各段階の実変更だけを既存条件の再確認対象にする。公開/link、download、Drive、退会本体はP4/P5へ残し、型や設定だけの接続を完成と扱わない。
