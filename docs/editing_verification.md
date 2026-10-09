# 編集のローカル検証

Node 22.22.3 / Unicode 16.0 を `nix develop` で使う。新規checkoutで `pnpm install --frozen-lockfile`、`pnpm build` を実行し、未作成のpersistent rootと短いTMPDIRを指定する。

```sh
mkdir -m 700 -p "$HOME/.local/hwt/editing-01"
env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop --command sh -c '
  export TMPDIR="$HOME/.local/hwt/editing-01" TMP="$HOME/.local/hwt/editing-01" TEMP="$HOME/.local/hwt/editing-01"
  pnpm test:browser:editing --root "$HOME/.local/share/hollow/verification/editing-01" --port 4319
'
```

製品画面は `http://127.0.0.1:4319`、確認用の案内は `/__fixture/editing`。既存DB・objects・秘密envは使わない。停止には起動terminalでCtrl-Cを使い、再検証では新規rootを指定する。Google・外部メール・外部参照サービスへ接続しない。

合成アカウントは `owner@editing.fixture.invalid` / `editor@editing.fixture.invalid` / `viewer@editing.fixture.invalid`。共通パスワードは `local-editing-password-123`。製品のサインイン画面から使う。fixtureは既存applicationで登録・メール確認・招待参加・ノート保存・HTMLアップロードを行う。

「編集fixture」はowner/editorが編集でき、viewerは閲覧だけできる。「閲覧専用fixture」ではownerアカウントもviewerとして参加するため、新規ノートの保存先候補に出ない。20版の履歴ノート、共同編集ノート、HTMLファイル由来ノートへのリンクも案内にある。

rootの `editing-files/` にPNG / JPG / JPEG / GIF / WebP / SVG / MP4 / WebM、装飾付きHTML、参照付きHTMLを生成する。JPG / JPEGは同じ形式の別名。SVGには除去確認用のscriptがある。これらは専用rootだけから選んでアップロードする。

| ID | 正常操作 | 境界・回復操作 |
| --- | --- | --- |
| ED-01 | 新規WYSIWYG、保存先の個人/編集可能workspace選択、入力、自動保存、完了、非公開detail | 無操作離脱、未保存本文を保持した保存先変更、media変更確認の取消/受諾、同ユーザー2tab更新通知 |
| ED-02 | 共同編集ノートをビジュアルで文字だけ変更、保存しclass/style/data属性を確認 | 空文字、構造操作拒否、style/script非対象、別editorによる更新後の上書き/破棄 |
| ED-03 | HTMLソースとlive preview、危険要素の除去一覧、参照付きHTMLの保存 | 壊れたmarkupの補正preview、800KiB超拒否、外部CSS取込off/on |
| ED-04 | HTML由来ノートの警告、WYSIWYG表/画像/コード/リンク、保存、変換前に戻す | 今後非表示と設定から再表示、opaque保持、大きな表/深い構造のHTML案内 |
| ED-05 | dirty本文でmode切替の保存確認、同じ本文で三modeを切替 | 空visual無効、同profileの既定継承、別profile非共有、新規はWYSIWYG |
| ED-06 | 生成media各形式を挿入、進捗、alt、保存、reload | 未対応/上限、SVG除去、upload失敗retry/remove、中断/離脱確認、visualでは追加なし |
| ED-07 | title変更、自動保存、一覧反映 | 空で無題、200文字境界、重複許可 |
| ED-08 | 自動/明示保存の状態、破棄、履歴preview/復元 | 通信失敗から退避/再試行/復元、離脱確認、権限失効時download、別actor競合 |
| ED-09 | 共通削除確認、一覧から除去、元に戻す | 公開/共有URL閲覧不能の案内、処理取消確認、閲覧者の操作なし |
| ED-10 | scopeのゴミ箱、残日、復元、永久削除、空にする | 空表示、確認取消、30日期限/50件超非同期/原本media履歴回収/Drive保持はintegration |
| ED-11 | style preview、取消/適用、reload、編集後設定保持 | viewerに切替操作なし、公開/共有/HTMLexportのstyle一致はintegration |

参照の取得にはtrusted Node bootへ既存SafeReferenceFetcherポートのローカルadapterを注入する。専用loopback originの既知CSS/image/video pathだけ許可し、他URLは通信前に拒否する。製品NodeSafeReferenceFetcherのprivate address・任意port拒否は維持され、公開transportやenvから許可を広げられない。

`references.html` の参照取り込みをoffにして保存するとCSS装飾は適用されない。onへ戻して保存すると既存reference jobsがCSSを埋め込み、画像/動画を専用object storeへ取り込む。取り込み完了後にrootの `editing-files/style.css` を変更しても、保存済みノートのCSSは変わらないことを確認する。fixtureのlistenerはharnessと一緒に閉じる。

原文の異常条件はrepository integrationとローカルe2eで確認し、通常 `pnpm test` で実サービスへの通信を有効にしない。upload/networkの一時障害は所有browserのloopback requestだけに限定し、確認後に解除する。role/clock/allowPrivateを変更する製品HTTP endpointは追加しない。

起動中の専用harnessに対する異常UIの再実行は、同じNix shellと短いpersistent `TMPDIR` で行う。`agent-browser` がPATHに必要。

```sh
pnpm test:e2e:editing --root "$HOLLOW_EDITING_ROOT"
```

この個別コマンドはowner/editorの専用browserを起動し、offline自動保存・保存失敗時のモード保持・ブラウザ退避からの復元・離脱/破棄確認・ビジュアル書式拒否・共同編集競合・権限喪失時のJSONダウンロード・同利用者の2タブ通知・利用者/端末ごとの既定モードを通常UIで確認する。ロール変更は通常のワークスペース設定で行い、終了時に戻して専用browserを閉じる。各操作と成立したassertionはroot内の `editing-e2e-*.jsonl` に残る。通常 `pnpm test` はbrowser CLIを必要とせず、権限喪失後の永続内容・20版の不変性などのintegrationを実行する。
