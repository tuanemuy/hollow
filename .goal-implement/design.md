# 採用する設計

全体の設計方針と共有契約の入口。担当する機能の契約だけを読む。受入状態と次の作業は [plan.md](plan.md) を正本とする。

実行基盤は macOS arm64 上の Node 参照配備。HTML を正データとし、ドメイン・アプリケーションを純粋に保ち、I/O・時刻・ID をポートへ分離する。入力は transport と値オブジェクトの境界で検証する。

再生成の S1/S2 は受入済みの隔離基盤。通常処理・Drive受付/UI・本文採用は未完。S3 は [接続案](phases/P5c-3-s3-plan.md) と [独立レビュー](reviews/P5c-3-s3-plan.md) の補正・採用待ち。退会は共有方向だけ採用し、保存型・秘密縮小方式は未決。音声は保留する。

契約の詳細化・設計案の採用と、製品の完成・新しい実行範囲の許可は別に判定する。終了済みの検証資源や古い予算は新しい実行へ引き継がない。

## P5c-2 原本バックアップ

共有契約: [P5c-2 原本バックアップ](contracts/drive-backup.md)。

## P5c-1の残UI検証

共有契約: [P5c-1の残UI検証](contracts/drive-ui.md)。

## 実行基盤と境界

共有契約: [実行基盤と境界](contracts/runtime.md)。

## HTML と編集

共有契約: [HTML と編集](contracts/html-editing.md)。

## UI

共有契約: [UI](contracts/ui.md)。

## 認証と外部連携

共有契約: [認証と外部連携](contracts/auth.md)。

## 検証

共有契約: [検証](contracts/verification.md)。

## P2a の共有契約

共有契約: [P2a の共有契約](contracts/import.md)。

## P2b の境界と実装順

共有契約: [P2b の境界と実装順](contracts/content-media.md)。

## P2b-C の永続化と資源境界

共有契約: [P2b-C の永続化と資源境界](contracts/content-media-storage.md)。

## P2b-D の表示設定

共有契約: [P2b-D の表示設定](contracts/display-style.md)。

## P2c 以降の保存契約

共有契約: [P2c 以降の保存契約](contracts/save.md)。

### P2c-1: 20版と復元

共有契約: [P2c-1: 20版と復元](contracts/history.md)。

### P2c-2: Text-only編集とモード接続

共有契約: [P2c-2: Text-only編集とモード接続](contracts/text-editor.md)。

### P2c-3: WYSIWYGの準備・保持・変換前復元

共有契約: [P2c-3: WYSIWYGの準備・保持・変換前復元](contracts/wysiwyg.md)。

## P2d: ゴミ箱と完全削除

共有契約: [P2d: ゴミ箱と完全削除](contracts/trash.md)。

### P2d-3 の集合と親子回収

共有契約: [P2d-3 の集合と親子回収](contracts/trash-batch-purge.md)。

## P3 の所有と容量の接続条件

共有契約: [P3 の所有と容量の接続条件](contracts/workspace-storage.md)。

### P3aの入力と移行

共有契約: [P3aの入力と移行](contracts/workspace-create.md)。

## P3bの招待・メンバー・設定

共有契約: [P3bの招待・メンバー・設定](contracts/workspace-members.md)。

## P3cの検索・日付・タグ共有契約

共有契約: [P3cの検索・日付・タグ共有契約](contracts/search.md)。

### P3cの方式採用

共有契約: [P3cの方式採用](contracts/search-engine.md)。

### P3cの一覧と読書UI

共有契約: [P3cの一覧と読書UI](contracts/browse-ui.md)。

## P3dのタグ書込・管理と単一移動

共有契約: [P3dのタグ書込・管理と単一移動](contracts/tags-move.md)。

### P3d-1のタグ実装境界

共有契約: [P3d-1のタグ実装境界](contracts/tags.md)。

### P3d-2の有限確認と所有移管

共有契約: [P3d-2の有限確認と所有移管](contracts/move.md)。

## P3eの選択と一括操作

共有契約: [P3eの選択と一括操作](contracts/bulk.md)。

### P3eの永続受理とcommand接続

共有契約: [P3eの永続受理とcommand接続](contracts/bulk-persistence.md)。

## P3fのワークスペース削除

共有契約: [P3fのワークスペース削除](contracts/workspace-delete.md)。

## P4の接続判断

共有契約: [P4の接続判断](contracts/publishing-export.md)。

### 単件PDFの製品接続

共有契約: [単件PDFの製品接続](contracts/pdf-single.md)。

### 本人PDFの永続接続

共有契約: [本人PDFの永続接続](contracts/pdf-owner.md)。

### 匿名PDFの接続判断

共有契約: [匿名PDFの接続判断](contracts/pdf-anonymous.md)。

### 一括ZIPの接続判断

共有契約: [一括ZIPの接続判断](contracts/zip.md)。

### PDF一括ZIPの接続判断

共有契約: [PDF一括ZIPの接続判断](contracts/zip-pdf.md)。

### 一括公開範囲変更の接続判断

共有契約: [一括公開範囲変更の接続判断](contracts/bulk-sharing.md)。

### P4a の限定共有と表示名

共有契約: [P4a の限定共有と表示名](contracts/sharing.md)。

### P4b のHTML・Markdown単件書き出し

共有契約: [P4b のHTML・Markdown単件書き出し](contracts/export-single.md)。

### P4c の公開・発見とプロフィール

共有契約: [P4c の公開・発見とプロフィール](contracts/public-discovery.md)。

## P5 の成立条件

共有契約: [P5 の成立条件](contracts/integration.md)。

### Google Driveの連携境界

共有契約: [Google Driveの連携境界](contracts/drive.md)。

### OpenRouterの連携境界

共有契約: [OpenRouterの連携境界](contracts/openrouter.md)。

#### P5bの分割と直近の保存・実行境界

共有契約: [P5bの分割と直近の保存・実行境界](contracts/llm-stages.md)。

#### P5b-2の本文生成と月間枠

共有契約: [P5b-2の本文生成と月間枠](contracts/llm-text.md)。

#### P5b-2b の提供前gate

共有契約: [P5b-2b の提供前gate](contracts/llm-input-gate.md)。

#### P5b-2b1 文書の製品接続

共有契約: [P5b-2b1 文書の製品接続](contracts/llm-documents.md)。

#### P5b-2b2 単画像の製品接続

共有契約: [P5b-2b2 単画像の製品接続](contracts/llm-image.md)。

#### P5b-2b1 V2 文字PDFの寛容回復拒否

共有契約: [P5b-2b1 V2 文字PDFの寛容回復拒否](contracts/llm-pdf-recovery.md)。

#### P5b-3a0 全ページPDF・音声の提供前gate

共有契約: [P5b-3a0 全ページPDF・音声の提供前gate](contracts/llm-pdf-audio-gate.md)。

#### P5b-3a1 全ページPDFの受付・分類・製品接続

共有契約: [P5b-3a1 全ページPDFの受付・分類・製品接続](contracts/llm-pdf.md)。

### Google認証の接続契約

共有契約: [Google認証の接続契約](contracts/google-auth.md)。

#### P5aの保存・実行・検証境界

共有契約: [P5aの保存・実行・検証境界](contracts/google-auth-storage.md)。

## P5c-3: Drive 原本からの再生成

共有契約: [P5c-3: Drive 原本からの再生成](contracts/drive-regeneration.md)。

### S2の実取得・入力終了契約

共有契約: [S2の実取得・入力終了契約](contracts/drive-regeneration-input.md)。

## P5d: 退会の共有設計

共有契約: [P5d: 退会の共有設計](contracts/account-delete.md)。
