# P2c-2: Text-only編集とモード接続

[C2接続案](../phases/P2c-2-contract.md)、[本体独立レビュー](../reviews/P2c-2.md)、[修正独立再確認](../reviews/P2c-2-revision.md)に基づき、現htmlparser2正本を保持し、parse5 7.3.0のHTML5投影/診断と親trusted textarea入力を採用する。正本parserや全sanitizerを置き換えない。HTML highlightはCodeMirror6のstate/view/commands/language/lang-htmlの小構成とし、固定版は[本体報告](../phases/P2c-2.md)とlockで識別する。Node22の本体build/Worker/実操作で成立を確認した。

通常の表・日本語・反復文字・リンク変換・foster合流・HTML5再構築をsource由来で対応させ、実DOMの型/namespace/属性/Text/順序を照合する。CRLF/CRとpre先頭改行はsource/表示offsetを分けて扱い、未編集Textと無変更inputの正本を変えない。編集対象Textの値はLF基準で保存し、preの既知非表示prefixと他Textは保持する。DOM不一致を正本の無断正規化やiframe script/contenteditableの無制限許可で解消しない。一意でない対応は理由を示して止め、通常入力まで拒否する互換性不足は修正する。代表gateを全HTML5/全CSS配置の対応証明へ広げない。

空Textはsession ASTに保持し、入力hostを閉じた後も同sessionで再選択できる導線を用意する。composition中は対象/host/generationを保持し、Escape・保存・切替で破棄しない。遅い終了を別対象へ適用せず、取消は元source、一回composition/pasteは一回undoとする。HTML+plain clipboardはplainのみ受理し、HTML-only/fileは説明付き拒否。実IME/nativepaste/OSdropはgate未確認であり、合成guardとtrusted日本語入力を分け、本体の実入力確認へ残す。

dirtyなmode切替は共通保存を安定化してからserver canonicalを渡し、失敗時は元mode/最新入力/退避を保持する。端末の利用者既定と作業中backup modeを分け、新規は常にWYSIWYG、編集可能なTextがない場合はvisualを選択できない。HTMLのraw input・構文診断・安全化previewを分離し、古い応答で新入力を上書きしない。C3の損失変換/opaque blockは後続へ残す。

mode要求は本文の世代と別の所有IDを持つ。新しい選択は、現在modeと同じ場合や拒否・取消の場合も古い要求を失効させる。各await後と画面/端末既定への反映は最新要求だけに限定し、古い失敗は最新の案内を上書きしない。要求固有resourceは失効後も解放するが、正当な保存結果・最新入力・退避・new→stableの同note IDはmode取消で捨てない。詳細な失効境界は[V1修正案](../phases/P2c-2-revision-plan.md)による。

本体は型付きportと入力検査、世代/資源境界を持ち、gateのMap/any/固定asset権限/一時saveを移植しない。全modeの保存・履歴・認可・asset・退避はC1の共通契約を使う。自分の保存応答で固定構造が同じならText ID/undoを保持し、構造が変わる場合は最新入力を失わない再初期化/確認へ進む。HTML診断・投影はUIやUoWを長時間占有しない隔離と取消を持ち、800KiB超を切り詰めず退避/分割を案内する。
