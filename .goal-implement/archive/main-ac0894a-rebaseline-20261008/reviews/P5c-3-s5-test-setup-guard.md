# S5-TG1 minimal delta independent preflight

判定: **PASS（工具静的gateのみ）**。前レビューのS5-TG1はこの限定差分で解消した。S5項目完成・実startup/realm/import/native閉鎖・DB/audit成功には昇格しない。default/明示preflight/actual/root probe/create/import/DB/Workerは0。全対象読取を停止した。

検証時刻: 2026-10-06T08:41:44.027392+00:00

| 公開固定対象 | bytes | SHA256 |
| --- | ---: | --- |
| helpers/p5c-s5-test-config.mts | 389704 | 631f4cf095f20fff771c98866e1aa5382daa0173d3918cf9f3e6cde0d72335cd |
| helpers/p5c-s5-test-runner.py | 289768 | 49de11e5187baa63af3eaf44c3f648d3e7d889e9f1eee8cf56f38dd3264100f1 |
| phases/P5c-3-s5-test-setup-guard.md | 3576 | 26911f20378516365829fbfd10b2cb0f2a058c84d833704303827a49310175d9 |

3ファイルの全文・canonical regular600/nonlink/nlink1/ownUID、NOFOLLOW FDと前後dev/ino/size/mtime/ctime、全文SHAを直接確認した。

config227行の既sourceGuard呼出は、162行のsetup branch内でProxy・afterAll登録の後、setupが戻ってfixture収集へ進む前に置かれた。既workerId正整数/pool1・Node execPath/version/group/root gateを通る同worker realmの単一setup entry末尾で一回呼ぶ。親config branchには追加呼出を置かず、元D1 spawn前後/afterAll/family tailのguardは保持する。前レビューで直接照合した公開Vitest collectTestsの「setup import完了→fixture collect」順を継承する。実際のsetup import/realm到達を観測したものではない。

この追加17Bをそのsetup末尾のexact文脈から逆適用し、旧config全文389687B/SHA13dd50e505c00cd0e4813ceb25593ea2cff26630c265751814b00d912f6f203eに一致した。runnerはCONFIG_SHA代入の1値だけを逆適用し、旧全文289768B/SHAa365763b796fa27e38543dcabf4f54320f4fed5865dbf0210f789a23927e5c10に一致した。新CONFIG_SHAは新config全文SHAと一致する。本文・制御差分はこの二点に限られ、元guard/proof/error/constructor/this/args/handle/Promiseの契約を変更しない。

sourceGuard例外は元エラー経路へ流れる。fixture import/beforeAllへ渡す前の静的checkpointを満たし、未知/相違を正常へ補完しない。元Reporter/case/native/fork/Node/PG/EOF/実FDclose/strict/copy/audit gatesを弱めず、監督による停止とclosure成功を混同しない。現source変化・guard例外発生・旧failure原因を推定していない。

前レビュー8870B/SHA6a5d98cbbecfbfd374774669d9827324e48c932d84499365f67ebbe76ad20aaeの直接source1470/HEAD/Gitblob/manifest/public108/CF/13関数/監督loops・family counts/正式skip/finite caps照合は不変更として借用。source1470・依存の全走査、whole product checksは繰り返していない。公開config389704Bは採用readonly1MiB内、private256KiBへコピー0。元4family roots/caps/cache/normal gatesとe25製品候補は不変更。

直接checks: fullstable metadata/hash・両全文inverse・Python AST/compile-in-memory。借用checks: 固定phaseのstrict型/Node syntax各exit0（実import/cacheなし）。今回tsgo/Node/Vitest/Python helper CLIは起動していない。

次はRootが公開固定precheck→明示 --preflight <exactfamily>→一つのfresh family --supervise <exactfamily>を各別に採用する。PASS自体は実行許可を意味しない。family連続runや新caseを追加しない。

全validation/private成功・失敗roots、results/key/DB/cache/proof/B、main、UI/P5dはstat/read/hash/import/copy/reuse0。製品/helper/Manager正本編集0、spec/spec-implement/goal/agent追加0。本公開reviewだけを新規保存し、ALLread STOP。
