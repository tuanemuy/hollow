# P5c-1 S1 V1/V2 限定修正

## 現在

2026-09-29 09:40:41 JSTの最終照合まで完了。独立 `reviews/P5c-1-s1.md` を全文読了し、C/Fの保存境界V1/V2だけを訂正した候補 `d812e1c69a6353d56e0eb7d9a8dc5fddf3724dcd` を返却する。独立再受入前であり、S1全体・A〜F全phaseの完成ではない。ManagerによるS2設計採用の通知は受領したが、今回S2の編集・実装は0。

新root: `/Users/hikaru/.local/share/hollow/verification/p5c1-s1-fix-20260929-vCpQ63`（排他0700）。旧proofの実行/書込、独立失敗DBの読取、fresh/HTTP/UI/build/native/fullunit/外部操作0。

## 修正範囲

- `packages/core/src/adapters/libsql/repositories/driveRepository.ts`：terminal controlのclaimをfalseで拒否。新running intentのclaimはsends厳密+1。
- `packages/core/src/adapters/libsql/migrations/0038_drive_connection.sql`：terminalから新ownerへの復活をattempt/control両guardで禁止。create新running intentの+1とmetadata照会据置きをguardで分ける。旧0037以前/旧table/新state/列/port変更0。
- `packages/core/src/adapters/libsql/__tests__/drivePersistence.integration.test.ts`：旧11対を保持、新2対でrepository/直接SQL拒否と正常close・metadata所有・追加送信を確認した。

修正前の拒否不成立は独立の実DB反例を参照する。主が修正前再実行したとはしない。実無限HTTPの観測ではなく保存契約違反の修正。

## 実行と履歴

公開4helperだけをeGRH4Qから選択copyし新rootへ適合：synthetic.test.mjs 6380B、synthetic.config.ts 502B、reporter.cjs 1117B、test-run.cjs 3381B（コピー元bytes）。新rootのみ実行する。guard診断モードは無効化。旧DB/result/private/cache/manifestコピー0。

準備時にBSD形式statをGNU statへ渡したためmetadata確認呼出が不成立。続く同一呼出内で許可4helperの静的読取が先行した。次のGNU statで4通常file/no-symlink/全bytes一致とroot0700を確認してからcopyした。対象拡張・秘密読取0。今後のcopy前照合は成立済みmetadataに基づく。

型→lint:fix→format、pure10、DB旧11+新2、最新0038 synthetic normal/SQLfault/FKfaultの順で実行した。DBは最大保存3+逐次active1/合計64MiB/active16MiB、other8MiB/material256KiB。TMPDIR直下db・compile cache無効・worker1/bail1。正常tempは既fixture finally、失敗保持分岐の発火0。

## 実結果と条件対応

| 対象 | 直接結果 | 適用境界 |
| --- | --- | --- |
| workspace typecheck → lint:fix → format | 全exit0、自己子close/ESRCH | formatter後も今回3path以外製品差0。型diagnostic0 |
| Drive pure | 10/10 | 既純型対を最新sourceへ適用。pure製品変更なし |
| Drive persistence | 13/13（旧11＋新2） | 実DB/UoW/repository/正式0038。新2は複数assertを含むが独立caseへ水増ししない |
| 最新0038正常 | 782/782、ledger39、104表（台帳込み）、追加3表/5trigger/9index、FK0 | 新rootの通常runner。旧100業務表＋台帳のschema/全合成値/PK-FK保持 |
| 最新0038 SQL故障 | 783/783、ledger38、101表、追加0、FK0 | runner注入だけ、全rollback。正式SQL不正改変0 |
| 最新0038 FK故障 | 783/783、ledger38、101表、追加0、FK0 | runnerのorphan注入と正式assertion、全rollback |
| diff/commit | 所有3pathだけ、diff-check成功 | 管理/proof/private非包含。旧0037以前・既snapshot/journal/旧schema不変更 |

V1はfailed+active→同owner unknown→closedを保持し、closedからnew ownerへのclaim=falseを直接確認。raw SQLによるcontrol/attemptのterminal owner復活も拒否。attemptのactive→failed+closed正経路と既terminal claim拒否を確認した。失敗receiptの保存や実closeへの収束を禁止していない。

V2はprepared0→running1→reconciling1 closed→新metadata ownerのreconciling1→closedを確認。新running1据置きはrepositoryとraw SQLで拒否し、metadataのsends増分も拒否。明示running2は成功し、再度running2据置きは両境界で拒否。既11に含むsends3/ID差拒否も保持する。fake ownerの保存試験であり実HTTP送信/OS closeの実証ではない。

固定C/FのV1/V2保存部分は実装者候補合格。他S1の直接回帰は上表、P5b-1-Aへの旧加算共存はsynthetic旧保持で限定確認。Google/Drive実接続、S2usecase、UI/build/配備/actualfresh移行、全体unitは未実施。独立の修正前不合格は履歴として保持し、今回成功と合算しない。

## 候補識別

commit: `d812e1c69a6353d56e0eb7d9a8dc5fddf3724dcd`。

S1公開18pathをJS既定pathsortし、各 `lowercase SHA256 + two spaces + relativepath + LF` の連結をSHA256とする独立方式へ統一した。個別通常fileのcommit bytes一致を正本とし、旧S1方式不明aggregateと同値推定しない。

- 18path aggregate: `27f424c0e771a5bf418751b83d2a03945ae42bd2f37a1e786e64d5d20ed5cf68`
- 最新0038 SHA256: `01a299663df579de8f72ee0e059464cf921296cd2f833416c434f131d0294dae`
- 全18path commit bytes一致true、前S1からの製品差は今回3pathだけ、他15path不変。
- 個別path/bytes/SHA256の正本は新R `seal-final.json`。snapshotはtable定義を変更しておらず不変更、今回のguard訂正は正式0038内だけ。

## 最終資源・公開再利用境界

09:40:41 JST、seal書込後の新R実量はDB3＋sidecar2で5,671,792B、other21,318B、素材0。DB64MiB/active16MiB予約、other8MiB/material256KiB以内。各synthetic終了直後のsidecar込み値はnormal2,063,936B/故障各1,940,336Bであり、外側最終合計とは測定時点が異なる。後者を同時最大RSSや瞬間WAL計測としない。

全試験/check子はclose後ESRCH、test-tmp-gen1/db空、runner残存0、自己root限定lsof PID0。未回収exec0、起動したHTTP/browser/native/app0。fresh/旧proof/保護helperは非操作。保存3DBと全結果は保持し、回収・削除0。

新Rの以下だけは秘密非内包の公開logicであり、独立が静的読取後に自身の新rootへ選別適合できる。通常file/no-symlinkとbytesを照合済み。旧R実行やDB/result/cache/manifestコピーを許可する一覧ではない。

| exact basename（全て新R直下） | bytes | 用途 |
| --- | ---: | --- |
| synthetic.test.mjs | 6387 | 最新正式SQL/旧全値比較/故障注入の公開logic |
| synthetic.config.ts | 516 | 自己include/reporter固定 |
| reporter.cjs | 1117 | bool/count/finite分類だけ |
| test-run.cjs | 3366 | 逐次guard/有限collect/close/予算。旧guard診断モード無効 |
| check.cjs | 1263 | type/lint/formatの有限結果 |
| seal.cjs | 2518 | 公開18path/commit bytes・採用aggregate・自己容量/handles |

最小DB/pure/移行再現は上4点を新rootへ適合し、公開製品testsを実行する。secret/credential/bodyを含むhelperはない。S2の共有契約や後段fixtureを混ぜない。

本報告を全文EOF再読してから、文書を含む全read/write/runを停止し所有をManagerへ返却する。
