# P5b-2b2 未構成 smoke の限定静的判定

## 要約

2026-09-28T22:23:00+09:00 時点の限定判定。**今回の fresh 本人画面未確認は未確認のまま残すが、保護 owner helper の再試行を P1-E の新たな必須手順にする必要はない。** 現在の実変更に対しては、旧不変更認証/UI の受入根拠、現 bundle の default 未構成 boot・signin 表示・正常停止、同候補の隔離 password UI、実 DB/usecase の未構成・機械継続対を区分して合成適用できる。

これは P1-E・P5b-2b1-I/J の証拠適用性に関する事前評価であり、画像 phase 全体や固定 30 条件の正式合格判定ではない。最終候補の source/bundle と各根拠の同一性は正式独立検証時に確定する。製品欠陥を示す追加根拠は今回観測していない。

## 範囲と方法

goal-implement / manager-loop、plan 固定行、design の未構成/機械継続と単画像採用節、元 requirements / IM 形式表、主報告 `phases/P5b-2b2.md` の 21:30 比例試験・22:02 最終 build・22:12–22:15 smoke 節を照合した。公開 source と git 差分だけを独立に読んだ。

読取時 HEAD は `b968e9cd291ccb7874c6cef4967ae3ac94f588d0`。比較基点は既受入 `b36ab9bf5976d03035db0a60266ae42aa66038fb`。正式委譲前の読取識別であり、主の最終候補・証拠全指紋を独立固定したとはしない。主は自己回収/保全を単独実行中で、私はその環境を操作していない。

Node / tests / build / runtime / browser / DB / fixture / proof 実体 / credential / 保護 helper の読取・hash・実行は 0。製品・管理正本の書込は 0、本報告だけを編集した。

## 固定条件との対応

- P1-E は起動・認証 shell 等の基盤条件で、今回の再 open 理由は imageChildPath / fixed Node entry / build-search の配備変更。同 bundle の旧文書・未構成・機械継続と実終了への比例確認が対象である。全認証の再実装や protected owner の特定資格情報によるログインを今回だけの必須手順にはしていない。
- P5b-2b1-I/J と新 P5b-2b2-H も、固定 child/native 配備、未構成での従来機能継続、実終了・検査・保全を要求する。単に「boot したから全部正常」では満たさない。
- 元 IM 形式表は HTML/MD の常時機械処理、Office/text/文字 PDF の未連携時機械処理、画像未連携時の原本・metadata 保持を区別する。design:935–937 は未構成でも password/既機械を維持し、所有回復を省略しない契約。今回この完成条件を緩めない。

## 独立した source 照合

1. `server.node.ts:269` の追加は `imageChildPath: dist/server/llm/imageChild.mjs` の 1 行。`config.ts` は options と preparer constructor にその path を渡す。configured の式 `validLimit && profiles !== undefined`、未構成 profiles の有限拒否、ownership acquire、既 source/generator/result の組立は従来のまま。
2. `sourcePreparer.ts` の新 image preparer は path を保持し、`imagePreparer.ts:111–138` の child spawn は画像の `prepare` 内でだけ行う。password / settings GET / 機械取り込みが image child を無条件起動する差分ではない。固定 child を esbuild で追加する build script は既 source/document Worker を置き換えない。
3. `acceptUpload.ts:193–211` は AI 対象へ image を追加するが、admit 条件は `llmWanted && llmReady && connection.state === linked`（`:297` 付近）を維持する。llmReady は configured・OpenRouter・現在 linked/期限を要求。HTML/MD は llmWanted に入らず、未構成は従来 job の queued/機械処理へ残る。
4. 認証・session・signout・OpenRouter settings read/control 本体は今回の source 差分にない。`OpenRouterSettings.tsx` の差分は説明 1 段落だけ。`settings.ts:38–75` の本人照合と configured projection、画面の bootstrap→settings GET、未構成時 catalog GET をしない分岐、未構成案内と disable は不変更である。新 `llmServerFn` のモデル kind 入力変更は IM-06 の別 endpoint であり、この settings bootstrap の置換ではない。
5. 主報告の機械回帰は単なる mock の受付分岐ではない。`llmDocument.integration.test.ts:485–545` は実 `IsolatedDocumentExtractor` と `runImportJob` を使い、HTML/MD の LLM 0、DOCX の AIoff/unlinked/unconfigured の機械完了・本文成立を検査する。`llmImage.integration.test.ts:612–640` は未構成画像を false success にせず needs_ai、AIoff を failed、生成 0 / quota 0 とする。configured=false は隔離 container の設定で、default 起動そのものの試験とは区別する。

## 証拠の適用範囲

| 観点 | 使用可能な根拠 | 今回成功と称してはいけない範囲 |
| --- | --- | --- |
| default 未構成の起動/停止 | 主 22:12:58 ready、通常 signin のメール/password/button 表示、22:14 正常 close・実終了と保全。新 path 追加の eager-load/起動阻害を確認する直接根拠 | 本人認証・一覧読取・settings GET・signout 成功 |
| password・本人画面 | 同候補隔離 contract の通常 signup/verify/signin・画像 UI、旧 P5b-1/P5b-2b1 の明示借用付き受入、auth/session/route 本体不変更の独立差分確認 | 隔離 configured UI を今回 fresh 未構成 UI の再実行と呼ぶこと |
| 未構成 settings | 既受入の未構成 UI と不変更 settings read/表示/guard。今回 settings の変更は機能説明だけ | 今回 fresh で実 GET したという記録 |
| 機械継続 | 主 21:30 の 9files/133 内の document/image 実 DB/usecase 対。最後の表示修正後も backend 非変更、主 1841unit/build と差分適用を照合 | 未構成 actualfresh の upload を今回実施したという記録、全媒体互換性 |
| child/native 配備 | 主 built child smoke、同 bundle 契約画像生成・実 close、default 未構成 boot と配備 source の狭い差分 | 正式独立による新 child/codec/全資源試験の代わり、全 OS/RSS 保証 |

今回私は各動作を再実行していない。主 133 / 1841 / build の成功は報告に基づく借用候補であり、正式独立段階で固定 source/bundle への適用と必要な比例対を確認する。旧 unit 等と数を加算しない。

## 未確認と追加検証の要否

保護 owner fill の exit 1、続く inputs/forms 0・pathKind other は、認証成功でも認証失敗でもない。製品の認証不具合、CLI の原因、特定 URL への遷移を断定しない。本人一覧・未構成 GET・signout が未確認だった事実を主報告と正式独立報告へ残す。既 session/旧値保持は保全証拠であって認証成功証拠ではない。

上記 source 不変更と主の同候補・旧受入根拠の適用が正式固定で確認できれば、今回実変更の P1-E 受入に対し追加 fresh 認証は必須ではない。**保護 helper の反復・本文探索・資格情報探索・旧 fixture 復元は提案しない。** 新 gate 追加も不要。

正式照合で未構成 branch/認証配線の追加変更や、既機械対の候補不一致が見つかった場合だけ、該当部分の根拠は不足として残す。その際の最小代替は、許可を取り、新専用空 DB/自己 credential で通常 default boot（OpenRouter 設定なし、provider 差替なし、許可 local mail のみ）→通常 password signin →本人一覧/settings 未構成表示→signout の小対である。機械経路の根拠まで不足なら自己小 HTML 1 件を加え、LLM 0/本文読取と停止保全・通常回収を確認する。今回その環境・fixture の作成/実行はしておらず、自動的に必須化もしない。

## 返却

本評価は正式 P5b-2b2 レビュー前の限定 read-only 判断。その他条件・画像 phase 全体は未判定。本文を EOF まで確認してから、文書を含む全 read/write/run を停止する。未回収 exec 0、検証用 process / DB / runtime / browser / fixture 作成 0。主の実行環境所有へ介入せず、限定読取担当を Manager へ返却する。
