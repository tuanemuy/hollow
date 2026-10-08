# P2c-3 本体接続の独立受入準備

## 対象と状態

2026-09-06 / Asia/Tokyo、20:13 JSTからのread-only準備。台帳P2c-3-A〜FのうちC/D/Eを中心に、元ED-01/04/05/06/08、design C3、`P2c-3-contract.md`、`P2c-3-runtime-contract.md`、既存gateの独立根拠を照合した。現在の実装sourceやtempは読まず、DB/browser/production/依存/hash/test/build/APIは無操作。本書だけを書き込み、独立検証成功とは扱わない。markdown-styleで観測順と判定を整理する。

元GV1/GV2の代表経路は受入済み。G11-R1は未解消のままC3-Aへ差戻されている。旧gateのMap/固定origin/裸timer save/固定mediaを本体合格根拠にせず、新しいC1/C2との接続を検証する。runtime文書のjournal/IndexedDB/async checkpoint案は未採用であり、最新designの「完全HTML検査後accept」「測定後の実行境界」を正本とする。

## 必要な小fixture

| 用途 | 正式候補後に用意する内容 |
| --- | --- |
| F1 入口・警告 | 実HTML取込由来の自己note。class/style、通常p/表、opaque inline/block、CRLF/entityを持つ小本文。HTML由来で損失0の対と、候補が実際に説明する小さい構造損失の対を分ける。危険除去/表現損失/保持内容を同じ意味で数えない |
| F2 変換前復元 | 自己noteの保持版Rを認可済み保存経路で作る。title/body/style、固定小PNG/MP4、取得済CSS snapshotを識別可能にする。現在含む20版と、Rが今回の追加で残る/外れる二境界を隔離DBで作る |
| F3 退避・新規 | 未保存の変換済み最新HTML、元R hint、opaque再合成済み内容。metadata無し/旧mode無し/new-only、壊れたhint、別note hint、新規由来を派生する。有効な本文とhintの破損を別々に変える |
| F4 競合・権限 | 自己Aの二tab、別の合成actor、現在権限失効の隔離DB対。実際の既存利用者データは変更しない。候補受領後の新規自己noteだけでUI確認し、DB十分な枝は隔離DBに留める |
| F5 A/B共有 | R1の「一度入力→実ack→backupなし→拒否toolbar」入力と、白紙から新規表作成・実媒体挿入の小対。既存固定媒体を再利用し、全codecや大容量fixtureは収集しない |

今はfixtureを生成/収集していない。正式候補・採用された上限・保存APIの形を受領してから、固定元資材を変更せず独立tempへ派生する。

## 短い実行順

1. Aの実行境界と受領固定を確認する。完全HTML/退避が一致しない方式のままC/D/E合格へ進まない。R1、拒否後の小入力、採用epochの本文/selection/origin/opaque保持を先に置く。
2. F1でCの全入口・警告・取消・設定resetを確認する。cleanの本文・版数不変を基準にし、dirty settleの成功分と警告取消を分ける。
3. F2の通常初回保存→reload→変換前preview→復元を一つの実UI経路で確認する。続けてDの境界・競合・現在権限を隔離DB/handlerで確認する。
4. F3でEの変換済み保存失敗→追記→reload復元を確認する。hint照会失敗・無効・pruneと明示HTML回復を対にし、本文の回収を先に証明する。
5. new→stable/V5・media-only・Cの再入口と交差させる。最後に変更範囲だけmobile/keyboard、保全、配布、終了状態を確認する。

## C: 全WYS入口と警告

| 対 | 実行・合否基準 | 最低証拠 |
| --- | --- | --- |
| C1 全入口/新規空 | 明示切替、利用者端末既定、直接編集route、退避復元で同じ準備/必要警告を通す。HTML由来・loss0でも由来警告を省かない。選択前にWYS hostを先行mountしない。新規空は既定に関係なくWYS・警告免除、無入力離脱でnote0 | 4入口の実UI、警告前後host、sourceと保存要求/版数。全組合せを重複網羅せず入口差を示す |
| C2 dirty/取消/世代 | HTMLまたはvisual dirty→保存して切替→実canonical準備→警告取消。成功したdirty保存は取り消さず、最新本文/旧modeを維持。準備/警告待ちに追記・新mode要求・古いsuccess/failureを交差させ、最新要求だけ反映する。既定WYS取消のHTML代替で端末既定を勝手に変えない | 自己tabだけの応答保留、trusted入力時系列、canonical/version/backupと現mode・端末値。C2保存acceptと要求取消の分離 |
| C3 抑止/reset | Aで抑止→別WYS入口/reload、設定からreset→直後/reloadで再警告。Bには引き継がず、mode既定・backupmodeは別。storage拒否/不正値は警告表示へ戻し、記録成功を偽らない。抑止してもDのprelossy検査は残る | 実設定UIと専用storage値、A/B分離、保存API側のorigin検査。通常設定成功だけを根拠にしない |

無変更の了解・selection/focus・mode選択で本文を正規化しない。titleのみは正当なtitle版を作ってよいが、本文不変でWYS準備起因の余分な版/jobなし。既存参照scheduleが正当に起きる場合を「job0」という新要件で妨げない。

## D: 通常20版内の変換前復元

| 対 | 実行・合否基準 | 最低証拠 |
| --- | --- | --- |
| D1 初回保存/復元 | dirty原文は先にC2 settleで保存し、そのserver版Rを変換元にする。意味のある最初のWYS本文保存後もRが保持され、reloadで「変換前へ」を再構成。Rのpreview/取消は未保存、確認復元は新しい現在版。title/body/style/媒体/CSS snapshotがRと一致し、現在on/offや台帳は巻き戻さない | 実UI一往復＋DB current/revisions/pins/由来。DOM undoと永続復元を別操作として確認 |
| D2 no-op/新規 | 準備・titleのみ・本文編集をundoして元本文へ戻した保存を、意味ある初回本文変換と混同しない。同値の共通版規則を維持。新規空に空baselineを作らず、ID付与や最初の保存を架空の変換前版へ付け替えない | 隔離DBの版/由来差と新規実UI。候補のmetadataを内容変更と数えない |
| D3 prune二境界 | Rが保存直後も残る対は成功。今回の新revisionで20件から外れる対、確認後の他tab進行で既に外れた対は、由来保証付き初回保存を拒否し最新入力を退避。既存正本/版/pinを部分commitせず21件/永久pinを作らない。成功後の通常20版進行でRが消えた場合は復元先表示だけ無効にし、通常編集を永久停止しない | 実UoW/rollback/競合の隔離DB対＋期限外案内/HTML回復の実UI。純粋集合関数だけで合格にしない |
| D4 provenance/現在権限/actor | hintのshape、同note所属、保持版、基準versionをserverで検査。別note/保持なし/無効version/失効を拒否し、hintだけでasset権限を付けない。同ownerの後保存優先、別actorの確認、確認後再更新はC1の既存policyどおり。事前照会のavailableを実行時認可に代用しない | 隔離DB/handlerで十分な拒否枝、UIは一つの失効理由/downloadとactor再確認。WS共有本体を既に完成したと扱わない |

F2の媒体は保持版pinから復元できることを確認し、current URLの拒否とhistory URLの許可を混同しない。同URLのCSSが後で変わっても、Rのsnapshotを復元する正常対を一つ持つ。全safe-fetch/codec/GCの反復は不要で、変更した保存/復元境界だけを確認する。

## E: 変換済み退避・旧互換・新規同ID

| 対 | 実行・合否基準 | 最低証拠 |
| --- | --- | --- |
| E1 失敗reloadと元hint | WYS変換編集→save失敗→追記→reload→復元。最新title/html/modeと元originを同時に選択し、旧hostを先行mountしない。opaqueはsession IDだけでなくHTMLに再合成済み。hint照会/準備が失敗しても最新raw/downloadを先に保持。復元済み変換本文を現在版由来へ再baseline化しない | 実UI/実save、DB拒否、backup JSON全体、復元mode/最新本文/元Rを比較 |
| E2 無効/旧形式/回復 | 壊れたhint、別note、保持版なし、旧metadataなし/旧modeなし/new-onlyで有効本文を捨てない。originは未確認/無効として扱い、消えた元版を復活済みと表示しない。明示HTML回復で最新本文を渡し、その後の通常保存も現在認可/C1確認を通す。自動fallbackでprelossy guardを迂回しない | codec/adapterでshape枝、実UIで無効hint・取消・HTML回復・4key download。4keyへorigin/秘密を増やさない |
| E3 新規/保存accept/cleanup | 新規WYSの実create応答受領後、invalidate/次save待ち中に二段追記。mode要求取消後もcreatedIDと正当なsave acceptを保ち、最新完全HTMLまで同IDへsettle。次save失敗→reload復元も同ID。stable key先書き→new bridge、最新入力がある間はcleanupしない。新規由来はID発行で置換しない | 元V5派生のtrusted時系列、実DB note数/ID、両key、mode/origin/本文。POST応答全喪失のexactly-once等の新保証は追加しない |
| E4 storage/epoch/媒体 | storage拒否/片key失敗、ack後追記、epoch整理前の退避失敗で最新本文を消さず、誤ったsaved/cleanup/履歴破棄なし。採用epochは利用者了承と完全退避後だけ。media-onlyと同assetの失敗復元を一つ交差させる | 自己storage境界/隔離adapter＋実UIの代表、doc/selection/origin/opaque/履歴/asset URL。未採用journal等の試験を前提にしない |

## A/B/Fへ残す共有必須条件

- R1を実保存で再演する。一度編集してack・backup消去→上限等でtoolbar全拒否→model/DOM/ack/dirty/両backup/undo/版/jobが直前どおり。入力初回からchanges0の対だけで代用しない。旧819,200bytes入力が採用WYS範囲外なら、原文保持・HTML案内を確認し、受理可能な境界で同じ原因となる拒否対を構成する。
- 白紙から通常表を新規作成し、セル/行列操作→保存→reload。旧gateの既存表編集を新規作成UIの合格としない。
- 本体の画像/動画挿入、alt、進捗/失敗再試行、draft→stable、媒体前後typing、同asset再表示を確認する。固定GET200ではなく現在認可・履歴pinを通す。
- C/D/Eの警告/設定/復元/回復のkeyboardと390pxの代表、旧行/object保全、最終配布/終了hash・所有をFでまとめる。実OS IME/nativepaste/OSdropは従来未確認で、合成入力と混同しない。

## 確定したversion照合

Manager確認済み。`capturedNoteVersion`は指定origin revisionにserverが記録する対応versionとの整合を検査し、現在headとの無条件一致を要求しない。現在認可、C1 actor競合とexact-current確認、postcommit20pruneのorigin保持は別々に検査する。D4に「同owner他tabでheadが進んでもorigin保持かつC1 policyが許せば保存可能」を正常対として必ず入れる。異なる利用者の競合確認や確認後再更新の拒否を弱める解釈にはしない。

その他は新たな方式条件を増やさず、採用designに従う。全computed CSS、全codec、全platform、任意モデルの低遅延保証を追加しない。今回の文書確認を本体合格に含めない。本書完成後は全操作停止し、Implementerの環境所有を維持して正式候補を待つ。
