# S5-C provider close contract: finite PUBLIC static plan

判定: **成功 commit 後の serialized wrapper.close no-op は、照合した原 @libsql/client local-driver 契約と整合。ここを source欠陥/leak とする根拠なし。** client.closed は物理DB閉鎖の証明ではない。4e91 actual の WAL-or-journal残存の種類/原因は UNKNOWN。source/helper変更・テスト・診断実装・実行は未採用。

## PUBLIC binding / bounded method

current固定runner290461 / SHA256 `db87311aa7caa58d7d802d6a9427c27ad5b1b5aed50024e7701280fb05dff753` をNOFOLLOW/fullstable readし、Python AST literalのPUBLIC_LINKS / PUBLIC_PACKAGE_METADATAだけを抽出した。helpersのeval/import/defaultは0。

宣言されたcore @libsql/client targetは `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client`。同packageJSON既expectedsize/hashを直接確認。formal exports["."].import.node（およびdefault）は `./lib-esm/node.js`。そのexact relative import `./sqlite3.js`へだけ進み、http/ws/core他実装を探索しなかった。各bodyは canonical/regular/nonlink/mode644/selfUID/nlink1/NOFOLLOW、lstat-open-fstat前後-close後path dev/ino/size/mtime/ctime/mode/UID/nlink一致、fullSHAを固定した。

| package-relative path | bytes | SHA256 |
| --- | ---: | --- |
| package.json | 3615 | 6f28e8e2aed00e442f436657888623245b2edd90c8856f01559133041e93d679 |
| lib-esm/node.js | 806 | 37a8115c013d5f5e5ada112059a6abb42dcc24b207e54240c57ced13fffb96e0 |
| lib-esm/sqlite3.js | 23847 | 453ca868a8f8e9d87362e97ef1d2aabf2039b6afd82b92409c4fee5a5b5a98a0 |

実body読取3files / 28,268 B。上限6files / 1MiB内。JSはstatic読取のみ、Nodeimport/moduleeval/CLI/native .node/read/dlopen/build/runtimeは0。HashはこのPUBLIC installed実装の固定証跡で、同versionのupstream一般実装とbytes同値を主張しない。未来counter/fixtureがこの契約へ依存するなら、このexact3body hash bindingが必要。

Own source client.ts1882 / `17ed1f017f4ea39496f3eb9c3210a1542235995d79d7c13788b095755b4c1035`、serializedClient.ts3121 / `44e29b4c33f2e314649222b9b86b4c24457e443afbff1e069f1f85e04ba70dcb`、hollowUnitOfWork.ts11983 / `83037f439b915e4e921c3bd3608bdf2e6d326c150b8bb8a95a69c8a843bba7ae` の選択source factsは前独立review `reviews/P5c-3-s5-final-fence-actual.md`12189 / `b22ea3f06dd0e0b8cba0beeb73cfa0e8c87d6a57a9a409586051f130aa0fee2d` の直接stable read証跡を借用する。今回はsource1470/body全再読やGit/mainHEAD検証は0。

## Raw local provider semantics / wrapper comparison

node.js rows1–26はformalcreateClient→expandConfig→file等をsqlite3 _createClientへ渡す。sqlite3.js rows11–67はfile schemeに限定したlocal pool/clientを構築する。ここでは呼び出さず静的経路だけを確認した。

原 Sqlite3Client.transaction rows323–336はpool.acquire(true)後BEGINし、Sqlite3Transactionにconnectionとpool.release callbackを渡す。transactionはconnectionを所有し、#settle rows402–409がdatabase=nullにしてrelease callbackを一度だけ呼ぶ。

| API / branch | original implementation | wrapper relation |
| --- | --- | --- |
| successful commit | rows467–473: original COMMIT、finally #settle | wrapper await originalcommit後unlock。既settledのtransactionをさらにcloseしないのは整合 |
| failed commit | 同finally #settleはthrowでも実行、originalerrorは維持 | wrapperは成功時だけunlock、失敗時はlogical ownershipをrollback/closeまで保守的保持。rawがsettledでもsuccessへ変換しない |
| rollback | rows453–465: null/closedならsettle/return、通常ROLLBACK finally settle | wrapper originalrollback→finally originalclose→unlock。settled closeはidempotent |
| transaction.close | rows475–489: nullならreturn、open/inTransactionならROLLBACK、finally settle | unfinished wrappercloseは透明delegate→unlock、finished wrapperclose no-opは同idempotent意味 |
| transaction.closed | rows491–496: database null / !db.openならtrue、その他 !db.inTransaction | wrapper finishedまたはoriginalclosed。原public logical transaction stateを強めたphysicalcloseと読まない |
| client.close | rows369–372: closed=true→pool.close | wrapper originalclient.closeを直接呼ぶ。閉鎖戻り値からsidecar不存在を証明しない |

pool.release rows147–173はborrowed/held setから除去し、open/inTransactionならrollbackし、原poolclosed又はdbclosedならcloseQuietly、通常はidleへ返す。commit後はconnectionがpoolownerへ移るためtransaction.closeを追加しなくても、client.closeがidle/borrowed両方を処理する原経路がある。原UoW repositoryはそのtransactionを注入して使う。新Cproducerは別standaloneclientを生成していない。

pool.close rows175–192はclosedflagを設定しidleとborrowedへcloseQuietly、配列/setをクリアしwaitersをrejectする。closeQuietly rows208–216はdb.openなら原db.closeを呼ぶが例外をcatchする。Sqlite3Client.closedはbooleanのlogicalstateで、rawnativecloseに失敗していないことを証明するreceiptではない。これをprovider公開契約の意味として区分し、実nativefailure/閉鎖漏れを推定しない。

結論: wrapperのsuccessfulcommit→finished→close no-opと、原providerのCOMMIT-finally-settle→poolownerreturnは整合。原providerはfailedcommitでもfinallysettleするがwrapperがcleanupまでlogicalownershipを保持することは安全側の待機であり、本経路の不一致/ordinarysuccess偽造ではない。source-only照合から最小productfixを正当化できなかった。

## Additional libsql edge: stopped, binding未確定

sqlite3.jsのknownbare import Database from libsqlとpackageJSON dependency `libsql:^0.5.28`から、exact installed alias `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/libsql`のlstat/readlink/canonical化だけを試みた。暫定選択canonical libsql@0.5.28と一致しなかったため、Rootの未知binding停止条件に従い、targetpackageJSON/JS/metadata/bodyへ進まなかった。aliasの後stat一致証跡も取得していないのでstabletarget受入は0。

`^0.5.28`はexactversion定数ではなくsemverrange。今回の暫定比較はformalconsumerのversiongateでない。この未一致を依存drift/製品欠陥や4e91原因と扱わない。unknownstorewalk/祖先探索/他versionglob/nativeaddonstat/read/importは0。必要ならRootがこのknownalias由来canonical metadata/expected targetの有限確認を別採用してから、formalpackageJSON→exactexport JSへ進める。現時点でこの追加chainを完了したとは主張しない。原 @libsql/clientのtransaction settle契約確認には追加nativepackage実行は不要。

## Cause / minimal next contract

4e91 case3PASS/7formalSKIP/afterAll/innerNode0・noforce・knownPG/2EOF-FDは前reviewで局所受入済みだが、outerheld/auditNULL/database-unclosed-journalは依然未解消。faultは-WAL又は-journalの総称でexactsuffix不明。checkpoint000/client.closedからsidecar不存在を合成しない。原driver closeQuietlyの存在だけで実closeexceptionやleakを断定しない。原API sourceを、過去のnativehandlesを観測した証拠にしない。

新sourcefixは **提案なし**。close後transaction.close追加・nativeABIshim・clientconstructor交換・journalguard弱化・unlink/cleanupは根拠不足で採用対象にしない。次の候補は原契約から選ぶ。現source契約が整合したため、まず既lexistsの同一返り値からdbfamily/suffix/siteの有限projectionを準備する案、又はexactlibsql publicexport-close delegationの不足bindingを別静的scopeで補う案が最小。いずれもRoot別採用前は実装/新run0。

追加regressionが必要になった場合の最小scopeは、同formalcreateLibsqlClient/serializeLocalClientと原UoWを使うcommit→後続originalexecute、rollback→後続execute、clientclose/closedの既API意味の有限case。原this/args/result/errorをdelegate、成功commit後のtransaction.closedと再利用の整合をassertする。wrapperfake/rawdriverreplacementやnativeevent合成は不要。物理sidecar閉鎖を受入するには別freshownedfixtureと既normalPG/EOF-FD完了後の正式metadata guardが必要であり、このlogicaltestだけでは足りない。source/test/toolscope、DB/nativeallowedscope/cap/freshrootはRootが事前採用しなければ作らない。

## Fixed STOP

この新PUBLIC docのみwx600/fsync/actualFDclose/fullstablehash。全source/helper/main/P5d/UIwriterは停止状態を維持。runtime/default/CLItest/Nodeimport/native/DB/rootprobe/create0。4e91/671等すべて既privateは恒久NOOPS stat/read/hash/copy/import/reopen/replay/cleanup0。doc固定後ALLreader/writer/runtime STOP。実causeUNKNOWN、wholeC/nativeproof/ACK/audit完了0を保持する。
