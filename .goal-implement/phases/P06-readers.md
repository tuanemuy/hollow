# P06 第2候補 — IM-05 の公開・限定 reader

2026-10-09 14:04 UTC、IM-05だけの第2候補を提出する。code commitは `e2141c30d38ffe7c89e320a1228a996dd3d12e27`、reportは本ファイルだけの別commit（candidateReady通知にhashを記載）。最終 `pnpm test` は **unit2646＋Node1377＋CF70＝4093pass/skip0**、全5Node形式groupを含む。型・lint:fix・format・lint/format:check・build成功、HTML/Markdownのowner/viewer・匿名public/limited・password前後/変更grant失効から新grantまでの主要正常browser成立。13:56:17–31 UTCに自己browser/runtime/reference/provider/workerのnative終了を確認、14:03:23 UTCにfullsuite exit0。新port/schema/endpointなし。候補通知から本体/helperの全code/test/config/report変更・環境操作をfreezeする。独立受入はManager判断待ち。

対象は IM-05 基本フロー4の「そのノートを読める人なら誰でも見られ、いつまでも残る」。第1候補 `7dab02d` / code `17e0d21` と独立レビュー `reviews/P06.md` の履歴を保持する。AC-10 / IM-04 / IN-03 / IN-08 は受入済みで変更しない。IN-01 / IN-02 は非音声成立・音声条件未完のまま保持する。今回は IM-05 だけを第2候補として提出する。

## 修復

既存の public/shared reader が visibility・token・password grant・current scope・trash/purge を確認した後、同じ UoW で既に読んでいた `references.entries` を表示投影にも使う。新しい読取 endpoint、port、schema、migration、一般 noteId lookup、`readReferences` 認可緩和は追加しない。許可された content response だけに `references` を付け、gate は従来の gate response のままにする。

純投影は core application/reference/view。表示用の kind/state/current/source/bytes/reason だけを返し、entry/note/asset/job/actor ID、location、finalUrl、private storage path、日時、data URI payload は返さない。data URI は mediaType の短い要約だけにする。投影を既存 snapshot stamp に加え、既存 body/asset/grant/共有epoch等の stamp 要素は減らさない。参照だけが変化した場合も再読取し、繰り返し変化した snapshot を拒否する。

Web の純表示モデルを認証済み ReferenceLedger と readonly HTML renderer が使う。認証済み画面の既存取り込み操作・poll・pending・error 所有は保持する。public/shared shell は既存 iframe 本文の後に件数・全一覧・元 URL・状態・失敗理由・過去の CSS 除去結果と注意を表示し、ページ内 anchor で一覧へ移動する。元 URL / reason / mediaType は HTML escape した plain text であり、外部 fetch / link / 再試行 / 設定操作は増やさない。core は Web / React に依存しない。既存 CSP、cache/index headers、isolated body、asset / data URI 認可、外部読込 opt-in は維持する。

## 正常 browser と異常自動根拠

| 対象 | 2026-10-09 UTC の actual product browser | 自動根拠 | 候補判断 |
| --- | --- | --- | --- |
| HTML + Markdown の保存参照 | 13:48:13–25、通常の WS import で2原本をアップロード。HTML4件（CSS/image/video取得3、404画像失敗1）と MD2件（image/video取得2）。本文 marker、保存 asset URL、CSS埋込、失敗理由・本文保持を確認。 | 既存 references integration36: 保存/差替/snapshot、404/timeout/拒否/cap/未試行、CSS除去・背景/font、relative companion/data URI/internal URL/SSRF/上限。第1候補の既存異常対応を保持。 | 正常・異常根拠成立 |
| 認証済 owner / viewer | 13:48:14 owner と13:48:34 viewer が同じ2ノートの全記録を閲覧。 | 既存 references integration の別 actor/editor/viewer 読取と除名拒否。認証 control/poll の ownership 不変。 | 同上 |
| 匿名 limited / public | HTML13:55:15–16、MD13:55:52–53。通常共有設定で限定/公開を確定し readonly URL から別未認証 browser で開く。counts/sourceURL/status/reason、一覧 anchor、HTML失敗1件・本文 marker、image 実ロードと video 保存先を確認。一覧内に link/input/button はない。 | 新 core4case: exact safe fields/internal非投影、history/data要約、91日後job pruneでもledger保持、reference-only snapshot再確認と競合拒否。新 HTTP2case: source/reason/count/anchor、internal除外、既存headers/body/asset維持。 | 同上 |
| password gate と grant | HTML13:55:18–19、MD13:55:55–56。未通過は一覧/元URL/件数/理由なし。通常password formで通過後は全一覧と本文/asset。ownerがpasswordを変更すると古いgrantはgateへ戻り、新passwordの通過後に同じ一覧を表示。 | sharing HTTP: gate0、valid表示、変更grant拒否、private404。core既存24h grant期限/取消/再公開/private/trash/purging拒否にunauthorized entries read0とrestore保持を補足。public private/link/trash/purge拒否を維持。 | 同上 |
| escape と readonly | 上記匿名一覧で既存 body/assets だけを読み、表示元URLへの新通信や管理操作を追加しない。 | 新 renderer unit2: source URL/reason/mediaType adversarial escape、CSS除去/history/count/空、active elementなし。 | 同上 |

正常操作は実 HTTP/RSC、通常 DOM focus + Enter による button/form 操作、readonly URL/本文 DOM 観測を使った。CLI座標 click が成功返却しただけの試行、非認証の初回 upload 失敗、現在選択済み visibility の disabled button 待機、非表示 settings tab の入力は成功根拠に含めない。driver を表示/受付可能状態に揃え、HTML・MDそれぞれ上表の正常一巡で成功した。製品コード修復を増やしていない。

## fresh 環境と実行

persistent root: `/Users/hikaru/.local/share/hollow/verification/p06-1791552977522388000`。tracked source と対象新規 source だけから別 checkout を作り、DB/objects/鍵/mailbox/原本/配布元/合成 provider は新しい runtime root で生成した。秘密 .env、旧 DB/objects、D01、保全 archive3、既存5 worktree は読取・変更していない。親環境は HOME/PATH/LANG のみ、短い persistent TMPDIR `/Users/hikaru/.local/hwt/s7522558000` を明示した。Nix flake/lock の固定を使用し frozen offline install した。flake.lock の nixpkgs は `d99b013d5d1931ad77fe3912ed218170dec5d9a4`、systems は `da67096a3b9bf56a91d16901293e51ba5b49a27e`。13:56:50–13:57:30 UTC の `node -p` と `pnpm exec node -p` はどちらも Node v22.22.3 / Unicode16.0、exit0。

| UTC開始–終了 | コマンド | exit / 結果 |
| --- | --- | --- |
| 13:36:33–13:37:02 | `pnpm install --frozen-lockfile --offline && pnpm typecheck`、renderer unit、shared/public HTTP integration | 0、型成功/unit2/HTTP19 pass |
| 13:40:30–13:41:48 | 型/静的 → publicReading/sharing/references局所 → build | 1、型/静的成功、68中62pass/6fail（新3entry同createdAtのfixture順序期待）、build未到達。references36はpass。 |
| 13:42:40–13:43:39 | `pnpm typecheck && pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check` → core2file局所 → `pnpm build` | 0、型/全静的/build成功、publicReading+sharing32/32pass |

同createdAtの順序は repository で未規定なので、新fixtureを正規 UoW saveEntry で1msずつ時系列にした。製品順序契約、新sorting仕様、exact projection/internal除外/snapshot競合 assertion を変更していない。最終checks logは `command-1791553360963192000.log`。局所件数は全suiteへ重複加算しない。

13:44:14、固定build後に `node --import apps/web/node_modules/tsx/dist/loader.mjs apps/web/scripts/integration-browser.node.ts --root <root>/runtime --port 4326` を sanitized Nix 内で起動した。稼働中checkoutをrebuildしていない。2自己browser sessionをcloseし、13:56:17自起動runtimeへSIGINT、native exit0を待った。13:56:31 UTC、自己PID終了・app4326/reference52951閉鎖を確認した。owned provider/workerも同bootのnative drain対象である。helperは書込/読取を終了して停止済み。

公開再実行入口は `docs/browser_integration.md` の新checkout + fixed Nix + build → `pnpm test:browser:integration --root <新persistentroot>/runtime --port 4326` と操作8–9。原文正常は既存起動口/共有設定/WS一般設定を使い、新しいtestdoor/fixture依存は追加しない。匿名viewerのpassword cookieはsession別で管理する。認証control/retryは既存権限を保持する。

## 最終全suiteと提出

`pnpm test`: 2026-10-09 13:56:31.676–14:03:23.313 UTC、411.62秒、exit0。unit2646/188files（19.96秒）＋Node1377/109files（335.68秒、全5formats group app/app-c/native/native-d/native-e）＋CF70/10files（4.48秒）＝4093pass/skip0。第1候補4085へ新8case（renderer2・core4・HTTP2）を加え、局所件数を重複加算しない。最終logは `command-1791554191676128000.log`。test削除・skip・対象縮小・deadline緩和なし。

14対象pathsだけを明示stageし、code `e2141c30d38ffe7c89e320a1228a996dd3d12e27` をcommitした。reportはこのファイルだけを別commitする。helper `integration_fixtures` は指定core test2filesの作業を完了して全操作停止、局所型/実行は本体がfresh環境で完了した。自己browser2session/runtimeのnative exit0・owned ports閉・own PID終了を確認済み。candidateReadyから本体/helperの全code/test/config/report書込・環境操作を停止し、P07や別作業を開始しない。

## 対象外・未検証

実OpenRouter/Google/SMTP/Drive・実参照配布元への接続/配送/費用/公開は未実行。ローカル代替での成功を実外部の成功とは扱わない。音声条件は未完/保留、P07とD01は未着手。IN-01/02は音声残条件を保持し全IDdoneにはしない。既受入65の再open根拠なし。Manager管理文書・resumeは変更しない。最終全suite成功後に code/report を対象pathだけでcommitし、candidateReadyで本体/helperの全変更と環境操作をfreezeする。
