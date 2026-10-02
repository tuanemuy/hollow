# P2b 設計の独立レビュー

## 結論と範囲

分割案は採用可能。B0を小さく実証してからB1へ進める順序、原本attachmentとinline mediaの分離、恒久台帳、版によるasset保持、trash時の旧worker反映拒否は元要件と整合する。以下の境界を確定してから該当スライスへ進める。設計レビューであり、実装・ブラウザ動作の合格ではない。

- 担当: `/root/verifier`。2026-09-06 03:44〜03:49 JST（Asia/Tokyo）。
- 入力: `phases/P2b-design-proposal.md` 全文、`design.md` P2b末尾、`spec/scenario/import.md` IM-05と共通/IM-01/02、`spec/scenario/editing.md` ED-02〜11。
- P2a修正中のコード・依存・環境・ブラウザは調査/操作していない。goal・管理直下ファイルも変更していない。書き込みは本報告のみ。
- 提案のライブラリ候補・リンク先API・未実行spikeを独立実証済みとは扱わない。

## 実装前に必要な判断

### D1: 「全面配置」の除去を位置指定全体の禁止へ拡張しない

提案の `fixed/sticky/absolute`、inset、z-index、transform/animation等の広い制限は、全面を覆わない図の注釈・画像上の短いcaption・重ねた図形まで壊し得る。IM-05は取り込んだ装飾の保持を基本とし、例外は「ページ全体を覆うような配置」である。ED-02もテキスト編集で元の装飾を保つ。`design.md`末尾の「危険な全面配置」は妥当だが、提案のproperty一覧を無条件禁止として採用すると範囲が広がる。

最小判断は、保護対象を外側のアプリUIと本文viewportに分け、iframe containmentを維持したうえで、全面遮蔽の定義と静的に判断できない場合の扱いを明示すること。通常の局所absolute配置・grid/flex・非全面transformを残す正常fixtureと、viewportを覆う配置・custom property/animation等の迂回fixtureを対で置く。CSSの完全な視覚意味解析を新たな完成条件にはしない。保守的に落とす構文が必要なら、その範囲・失われる装飾・noticeをManagerが明示して採用する。「fixedだけ落とす」でも「位置指定を全部落とす」でも要件充足の説明にはならない。

### D2: companionのrole・件数・容量・重複pathを確定する

相対path manifestとbatch sealingは必要。ただし、CSS/画像/videoを別roleにしただけではIM-02の100ファイル/500MBを回避できてしまう。選択されたcompanionも物理upload件数・bytes・個人容量予約へ含める。IM-05の200件/100MBは参照取り込みの別境界であり、companionを無制限に扱う理由にはならない。

- 画像の通常uploadは1ファイル1noteである。参照されているという理由だけで無言にcompanionへ変更し、生成されるnoteを減らさない。利用者のrole指定または明示されたbundle規則が必要。
- CSSだけを独立noteへ変換しない判断は妥当。CSSの未参照/失敗/取消と保管期限、原本扱いか一時companion扱いかを明示する。受理済みの通常原本を7日回収へ混ぜない。
- 重複path拒否は参照解決の曖昧性に限る。同じbasenameを2回uploadする正常操作までbatch全体拒否するとIM-01の「同名は別note」と矛盾する。曖昧な参照を未解決にすることと、通常fileの受理拒否を分ける。
- `../assets/a.png`がbundleルート内に収まる場合とルート外へ出る場合を区別する。参照元HTML/CSSのディレクトリをbaseに正規化し、basename推測はしない。
- sealingは兄弟の成功だけでなく失敗/取消でも終端化する。1companion失敗で正常HTMLのjobが無期限待機にならない。

50MB（通常import）、20/200MB（ED-06 media）、100MB（参照合計）のどの入口の制約をcompanionに適用するかは明示が必要。ここで新しい数値を発明しない。また「note budget」が全履歴の累積取得回数を意味すると、過去の失敗retryや参照の入れ替えだけで永久に200件へ達する。取得済み/予約/今回参照の重複除去と、20版が保持する物理容量を分け、どの集合へ200件/100MBを適用するか確定する。

### D3: 元URL保持と「既知の内部宛てを描画しない」を両立する

未取得画像/videoとCSS背景/fontの外部直読、失敗CSSだけlinkを残さない処理、未試行と失敗の恒久表示は原文どおり。これを全proxy化/全削除へ変更しない。正本/台帳で元URLを保持することと、危険なURLを実際のDOM/CSSへ有効な参照として出すことは別である。

提案の「内部literal URLは描画でも無効化」だけでは不足する。取得時のDNS検査でprivateと分かったhostnameや内部名を、取得失敗だからという理由でブラウザ直読へ戻してはいけない。HTML属性、srcset、CSS url/image-set/font、相対URLの誤った自サービス解決に同じ既知unsafe方針を適用し、元文字列と拒否理由は台帳へ残す。

一方、公開hostnameが閲覧者側DNSで別IPへ変わることまで、サーバー事前検査やCSPで防げるとは主張できない。直読に伴う追跡・ブラウザ内ネットワーク到達の残余リスクは提案が認識しており、Manager判断として残す。原文の直読を維持したまま「ブラウザを含む任意内部到達を完全防止」とする合格条件は置かない。

### D4: B0はcookie経路を先に実証し、grantとvisual権限を混ぜない

空sandbox・現行SameSiteを維持し、必要originだけCSPへ追加する第一候補は妥当。cookie送信と描画成功を推測で決めない。最小B0は実行可能な対象browserで、認可PNG/SVGとseek可能動画、詳細/previewのSPA・再読込、他利用者/失効/別noteasset/Range拒否を観測すること。未指定の全browser・全OS・全cookie設定を必須へ増やさない。HTTPS/他engineとの差は確認範囲と未確認を記録する。

短期grantはcookie不成立時だけ比較する。現在権限を都度確認しても、有効なgrantのコピーだけで第三者が取得できるならbearer権限であり、「取得者本人のsession認可」と同じではない。この権限拡張を明示承認し、対象asset/note限定・失効・ログ/Referrer非露出・HTML正本/版/exportへのtoken非永続化をgateにする。既読画素/bufferの回収不能と、新しいRange取得の失効を区別する。

B1の新規draftはまだnoteがないため、noteId参照関係だけの認可ではupload直後previewが成立しない。account＋期限付きdraft upload sessionによる限定閲覧を契約に含め、保存時のnote relation確定と未使用回収へ接続する。ownerの全assetを無条件に読む権限へ広げない。

visual用 `allow-scripts` はB0/B1から切り離し、C2直前の独立判断とする。固定script/CSP、allow-same-origin不使用、未信頼script除去、source/nonce/schema検査に加え、server側のbaseVersion/oldText/node対応検査が必須。iframeから届いたHTML/DOM全体を保存の権威にしない。IME・paste・cross-node削除・undo、DOM clobbering/偽messageでtext以外が変わらない小さいgateを先に通す。閲覧sandboxへ同じscript権限を広げる必要はない。

### D5: 空Textの跨再読込identityを新要件にしない

ED-02は空にしたTextを削除せず構造を保持する。セッション内ASTに空Textを残し、他のnode/属性を変えない設計は必要。一方、「同じ内部nodeIdがHTML保存・再読込後も存在する」ことやbyte完全一致は原文に明記されない。ED-05は編集可能Textがなくなればvisualを選べない状態も定義する。

提案はHTML serializationの限界を正しく未決としているが、sidecar/markerを必須にする前に、観測する契約をManagerが決める。最小gateは文字を全削除→セッション内で再入力/undo可能、保存後に要素・属性・装飾が不変、モード切替/再読込後の空本文とvisual可否が一貫すること。永続identityまで採用する場合だけ、sidecarをbodyVersionと一体に保存・復元・pruneし、HTML編集/サニタイズ後の古いmapを流用しない。HTMLとは別の第二正本にしない。

### D6: 版・asset・タイトル操作の漏れをC1へ接続する

現在本文/保持20版/trashが参照中のassetをpinし、未参照から7日後に回収する判断はED-06/08/10と整合する。7日は原文で未指定の運用仮定、20版は要求値。現在版を20に含めるかはUI文言とともに確定し、復元は新versionで記録する。初回lossy WYSIWYG保存の直前本文（既存P1 noteを含む）を復元できることを受け入れに含める。

提案の「本文変更をcommitするUoW」だけでは、タイトルのみの保存やstyleMode変更の版記録が抜け得る。どの意味のある保存を版にするかを統一し、reference workerによる差替も同じ版/asset relation整合へ接続する。旧版を復元してから最終relation参照があるか確認するまでGCを進めない。完全削除は版ごと除去するが、他noteが参照する共有assetは誤削除しない。

ED-07が分割表/残編集節で明示されていない。詳細または編集画面でタイトル変更→入力終了時自動保存、空なら無題、200文字入力制限、重複可、一覧反映をC1等の受け入れへ対応付ける。今回コードを検査していないので「現実装が欠ける」とは断定しないが、既存完了根拠を参照するか未完として残す必要がある。共有ページ反映は後続公開フェーズとの依存に残してよい。

## 追加必須条件にしないもの

- 500件chunkは実装候補。要求は「50件超は非同期一括削除、進捗が分かる」であり、chunk数値を受け入れ条件にしない。
- 32KiB data切出/7日GCはdesign末尾で採用済みの仮定。元要件の数値とは区別する。
- 80/443のみ、圧縮応答拒否、各timeout値は提案段階。安全上採用するなら明示した失敗理由と対応範囲にする。通常http(s)リソースの取得を狭める判断を原文由来と説明しない。
- 全形式フルdecode、全ブラウザ、OS hardRSS、全CSS視覚意味解析、永続DOM identityを自動的に追加しない。
- public/workspace/実AI/Drive連携を今回B0/B1の完成条件へ前倒ししない。ただしprincipal/lifecycle/asset relationの契約を後続で再利用できるようにする。

## 記録と引き継ぎ

03:47:34 JST の入力SHA-256:

| 入力 | SHA-256 |
| --- | --- |
| P2b-design-proposal.md | `0c3a8879fca45b420403e338fab230ab6aaa358ddf6f2636b006caba979077f7` |
| design.md | `929006fb21922951b2ae31ae32ab7ae1a5ce286c4a1ee28040bf4e89213d0924` |
| spec/scenario/import.md | `6900b9cf586f3c7ae943bfc7ec861ec15dbf7f2dd8e46c28eead1412630d6874` |
| spec/scenario/editing.md | `a366e48f0a7665f7a035250231dc8d5ee6515bb4fd1aa0c12f53f9e5a6665156` |

Managerへの次手: B0の対象browserとD4認可契約を小さく確定し、B1を開始可能にする。D1〜3はB2前、D5〜6はC1/C2前に判断する。P2a修正担当の環境・ブラウザ所有を変更していない。追加のコード/依存/実動作検証は行わず、本報告で読み取り専用レビューを終了する。
