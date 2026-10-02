# P4d-3匿名PDFチケット署名器

## 結果

新規署名器と専用unit testを実装した。2026-09-20T12:13:16+09:00の限定実行は50件成功、失敗0件。2026-09-20T12:13:23+09:00までの対象2ファイルのBiome検査は成功した。全体型検査・application接続・実HTTP/PDFは未検証であり、主担当と独立Verifierの範囲に残る。

製品の変更先は次の2ファイルだけである。

- `packages/core/src/adapters/node/pdf/anonymousTicketSigner.ts`
- `packages/core/src/adapters/node/pdf/anonymousTicketSigner.test.ts`

goal-implement、manager-loop、CLAUDE.md、design.mdの匿名PDF接続判断、P4d-3.mdの初回共有契約を適用する。内向きの`domain/pdf/anonymous.ts`と`application/pdf/anonymousPorts.ts`は読み取りだけで、型やportは変更していない。管理正本、既存製品ファイル、DB、browser、runtime、Chrome、build、git、旧proof、製品用の鍵と秘密は操作していない。

## 固定契約

`NodePdfAnonymousTicketSigner.load(path: string | undefined)`は設定を一度読み、同期の`activeKeyId/sign/verify`を提供する。環境変数をadapter内で読まず、鍵やpathをログへ出さない。未設定と設定異常は全体を未構成にし、activeKeyIdはnull、verifyはnull、signは固定説明の`BusinessRuleError(PDF_NOT_CONFIGURED)`を返す。不正claimsや未保持kidでのsignは`PDF_TICKET_INVALID`となる。driver例外、raw path、秘密を外へ渡さない。

設定はstrictな`{activeKeyId, keys:[{id,path}]}`で、最大16KiB・16件、IDは1〜32文字のASCII英数字・underscore・hyphenと一意性を検査する。設定と鍵はregular file、0600、同uid、直接親は0700・同uid・非symlinkを要求する。openはO_NOFOLLOWを使い、親とfileのlstat/fstatのinode・deviceを照合する。読取は上限+1byteまでとし、読取前後のsize/mtime/ctimeとpathの同一性を検査する。鍵は32byteに限定する。handleはfinallyで閉じる。

主担当との確認により、鍵の相対pathは設定fileの親基準で解決し、絶対pathも許可する。requestIdは既存UUID、browserHashとauthorityDigestはlowercase SHA-256 hex64文字とする。generationは正の安全整数、時刻は非負のepoch ms安全整数、expiresAt-issuedAtは600000に固定する。

ticketは`v1.base64url(canonicalJSON).base64url(HMAC-SHA256)`で、MAC対象はprefixを含む`v1.payload`とする。claimsの順序は固定portの宣言順で、余分なfield・欠落・別purposeを拒否する。decoded payloadは最大1024byteで、UTF-8・base64url・JSONの再encode一致を検査する。MACは32byteのcanonical base64urlを要求し、timingSafeEqualで比較する。

signは指定された保持kidを使う。旧kidの再署名でもissuedAt/expiresAtを書き換えない。verifyは現在時刻を読まず、期限後でもMACとshapeが正しければclaimsを返す。現在期限、browser、保存row、世代、元authorityと現在readの照合はapplicationの責務である。

## 実行根拠

| 日時 | コマンド・対象 | 結果 |
|---|---|---|
| 2026-09-20T12:12:13+09:00 | `pnpm exec vitest run packages/core/src/adapters/node/pdf/anonymousTicketSigner.test.ts` | 48件成功、271ms、exit0 |
| 2026-09-20T12:13:16+09:00 | 同コマンド、境界・binding改変の2件追加後 | 50件成功、252ms、exit0 |
| 2026-09-20T12:13:23+09:00まで | `pnpm exec biome check packages/core/src/adapters/node/pdf/anonymousTicketSigner.ts packages/core/src/adapters/node/pdf/anonymousTicketSigner.test.ts` | 2ファイル、指摘なし、exit0 |

対象限定の`biome check --write`で整形した。追加テストの文字列結合に対するuseTemplateのinfoはapply_patchで修正し、最終read-only検査では指摘0となった。unitの失敗はない。Vitestによる実行成功をTypeScript全量型検査成功と扱わない。

各unitは専用mkdtemp directoryに公開された固定fixture bytesだけを置く。製品用の新鍵は生成していない。各テストのafterEachで自分のdirectoryだけを再帰削除し、fixtureを回収する。テストは鍵・ticketの実値を診断出力せず、MAC一致はbooleanで検査する。

50件には次を含む。

- canonical署名と独立HMAC計算、期限後verify、Date.now非依存、旧kid再署名、kid撤去
- 32文字kid、最大安全generation、epoch 0の境界
- request/kid/generation/両時刻/browser/authorityの改変拒否
- JSON field順序・重複・空白・数値表記、余分field・欠落・不正型の拒否
- purpose、UUID、digest、整数、固定10分shape、base64url別表記、prefix、segment、MAC長、UTF-8、1024byte超の拒否
- 未設定・欠落・不正設定、重複kid、16/17鍵、16KiB境界、32byte鍵境界
- file mode、別親mode、uid不一致、設定・鍵・直接親のsymlink、directory fileの拒否

## 未測定と所有返却

権限変更とpath交換の同時race、CPU負荷下の時間、OS別動作、全量型検査、実環境のkeyring配備・rotation・HTTP・DB・PDF生成は未測定である。uid不一致のunitは現在uid取得のstubで検査し、他userの実fileへアクセスしていない。署名器は認可や固定10分経過の判定を代行しない。

開始時の自己read exec6本は無出力後にCtrl-Cし、各exit130で回収した。再開した必須資料readは1本ずつexit0まで待機した。負荷原因や環境故障は断定しない。実装・検証・最終readを含め未回収execは0本である。

新2製品ファイルと本報告の全文確認後、主担当へ所有を返却し、文書を含む全操作を停止する。単独commitは行わず、全量checksと統合候補のcommitは主担当が所有する。
