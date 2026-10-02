# P5c-3: Drive 原本からの再生成

[接続案](../phases/P5c-3-plan.md)と[独立レビュー](../reviews/P5c-3-plan.md)の共有契約を採用する。現在編集者の認可、記録本人の同 sub Drive 資格、実行者本人の OpenRouter 資格/月間30回を分離する。利用者が選択した immutable record を正本とし、backup の current head や現在保存先へ差し替えない。Drive 全 bytes/hash/元 parents と現在認可を確認し、取得失敗時の local fallback を禁止する。記録本人の単なる WS 脱退を永久失効条件にしない。

既 record の immutable identity と epoch 非依存の専用 key binding は再用し、同じ内容の列を追加しない。source-origin は local-original/drive-record の耐久 union とし、既 local 行の限定互換と新 Drive binding 欠落拒否を分ける。機械再生成は専用 receipt を持ち、既 LLM recipe/quota/本文版・undo を再設計しない。preview は発注/quota/本文lockなし、受理後の失敗/取消は旧本文を保持する。音声は保留を維持する。

取得は backup と data global1/資格owner account1 を共有し、control global2/account1・合算3を維持する。新 kind を足すだけで control に誤分類しないよう、DB claim、refresh、実 close/caller/ACK、前任終了、stop、prune/purge の全入口を同じ lane 契約へ接続する。Drive枠を解放した後に残る生成buffer/workerの保持量は別途合算する。

M1–M5の具体化は[first-slice案](../phases/P5c-3-first-slice-plan.md)と[独立S1レビュー](../reviews/P5c-3-first-slice-plan.md)を採用し、最初は保存型・正式移行・認可付き候補読取・既local互換だけを実装する。native/共有lane/worker/memory lease/取消全入口/全世代purge/本文lock/UIの機能接続は後続とする。本文採用直前の外部観測とDB commitの間に分散transaction保証は付けない。

S1はregeneration_source_bindings・regeneration_source_attempts・machine_regenerationsの3表と、llm_conversions・llm_pdf_previewsのsource_origin/source_binding_id/source_memory_bytesを追加する。record/Original/head再構築なし、sourceはdomainで必須union、旧行だけ明示local backfill、新NULL/未知値拒否、production writerはlocal/null/0。相互FKはbinding側deferred composite/consumer側immediateとし、consumer直接DELETEはbinding非NULL又はmemory非0なら拒否する。terminal/実所有終了/memory0/全attempt安全確認後だけversion CASでredactedへ移し、attempt→bindingを削除する。never-owned取消と実unknown/未ACKを区別する。S1のmemory非0→0はconsumer実所有終了と必要なattempt安全終了を共に要求し、Drive attemptのclose/ACKだけでbuffer解放を推定しない。dispatch active中のinput単独解放はS2のstage別lease/実consumer終了proof接続まで未実装とし、既ownerを早期closedへ変更しない。

0042正式移行の同一停止下transactionに限り、既llm_conversion_identity・llm_pdf_preview_identity・llm_pdf_preview_readyのexact3を一時DROPし、新列のみbackfillして元と同一定義で復元する。旧version/updatedAt/全列不変、0037不変更、恒久guard緩和/FK OFF/rebuildなし。移行内末尾FK assertionでcommit前に検証し、DROP後/backfill後/再作成-FK段階の失敗はschema/data/ledger/triggerごと原子的に戻す。追加trigger例外は個別判断、適用後downmigration機能は追加しない。

候補は既本人backup portと分離し、各page/exactを現在verified本人・active note/WS・personal owner又はWS owner/editorのUoW認可で読む。全記録者の(createdAt,recordId)昇順keyset25・note-bound cursor・JSON16KiB上限を持ち、recordとOriginal/targetのidentity・bytes/hashを検証しformatはOriginalから導出する。記録者のlive/linked同subは有限availabilityとし、WS脱退/現在folder/head変更だけでは失効させない。DTOはlocator/format/bytes/date/mine/availability/reason/cursorに限り秘密を出さず、外部refresh/download/所有開始なし。未接続Drive sourceを既local readerへ渡すfallbackは禁止する。
