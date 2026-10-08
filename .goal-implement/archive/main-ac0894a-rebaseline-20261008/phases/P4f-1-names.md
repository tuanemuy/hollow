# P4f-1 ZIP名前allocator実装補助

## 結果

2026-09-26T19:34:01+09:00。P4f-1-Dの名前割当部分を実装した。単独pure unitは41/41成功、専有2ファイルのBiomeは指摘なし。製品統合・実ZIP・独立受入ではない。

変更は以下の新規2pathと本報告だけである。

- [names.ts](../../packages/core/src/adapters/node/zip/names.ts): `NodeZipNames: ZipNames`
- [names.test.ts](../../packages/core/src/adapters/node/zip/names.test.ts): 41 pure cases

## 接続と振る舞い

固定[内向きport](../../packages/core/src/application/zip/names.ts)、主担当の[widthFoldKey](../../packages/core/src/adapters/node/unicode/fold.ts)、`ZIP_MANIFEST_NAME`と`ZIP_MAX_TARGETS`を使用する。共有型・Unicode data/helper・既存exportFilenameは変更しない。

全入力をNFC・禁止文字/制御/format/孤立surrogateのunderscore化・末尾dot/space除去・DOS予約prefix・空stemの`note-<ordinal+1>`で安全化する。最後のASCII dot以降を拡張子として保持し、stemをcode point境界で短縮する。suffixを含む出力全名は200 UTF-8 bytes以内とする。長い通常titleは拒否せず短縮する。

安全化・短縮後の全元候補とmanifestのcanonical keyを先に予約する。ordinal昇順で重複へ2以降のsuffixを付け、予約済み元suffix名と割当済み名を避ける。入力配列を変更せず、ordinalとfilenameの対応を返す。表示名へ幅変換/case foldを適用せず、比較だけ固定helperを使う。

500超、ordinal範囲外/非整数/重複、非stringなどの不正構造は`BusinessRuleError("ZIP_ENTRY_NAMES")`で拒否する。人工的に拡張子だけが長くstem＋suffixを収められない入力も同codeとする。この扱いは主担当へ確認済みであり、通常のhtml/md/pdf/txt候補へ新しい業務title上限を課すものではない。

## 実行根拠

| 日時 | コマンド | 結果 |
| --- | --- | --- |
| 2026-09-26T19:33:08+09:00開始 | `pnpm exec vitest run packages/core/src/adapters/node/zip/names.test.ts --fileParallelism=false` | exit0、1 file、41/41成功、duration1.57s、tests1.40s |
| 2026-09-26T19:34:01+09:00 | `pnpm exec biome check packages/core/src/adapters/node/zip/names.ts packages/core/src/adapters/node/zip/names.test.ts` | exit0、2 files、指摘なし、変更なし |

実行前に主担当へ通知し、主担当のNode/fullunit実行0を確認した。初回限定Biomeのhelper名`fit`にfocused-test警告2件が出たため、`composeName`へ改名した。再checkで警告は解消した。unitの失敗はない。

確認した対は、ordinal対応/入力不変、元(2)/(3)予約、case/width/ß/ligature/sigma/半角kana/結合文字の同値、丸数字/互換単位/kana/アクセント非同値、manifest予約、DOS名、path/禁止文字/control、fallback、200B等号、multibyte短縮、短縮後衝突、500重複、一意ordinalと不正構造である。性能値はこの一回の合成unit実行の観測であり、製品の最大負荷保証ではない。

## 未検証と返却

全体型検査・全量tests・build・実ZIP writer・DB・migration・browser・runtimeは未実行。NodeZipNamesへのDI接続、既存exportFilenameからの製品経路、全体Unicode runtime版assert、全量検証とcommitは主担当が所有する。独立Verifierではなく実装補助である。

製品2pathは作成前に不存在を確認し、主担当の共有変更は保持した。git操作、依存変更、全体format、DB/storage/旧proof/秘密/環境操作はない。専有sourceと本報告を全文確認し、未回収exec0で全操作を停止する。専有2pathと報告の所有を主担当へ返却する。
