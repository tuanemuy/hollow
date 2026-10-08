# P5d 共通Cloudflare型tooling独立レビュー

2026-10-05T23:42:44Z: 固定Python helperの独立静的preflight PASS。helper9336B/600/regular/nonlink/nlink1、SHA256 `24f6e754e7d159b9360ce0539d44a2a35443def2922fc5c8b439cd93ec08e006`、報告33810B/SHA `efee0213ed0fcce9682ef3520e68ec231e4399a233a682383e1fbdd34f664904` を直接一致確認。生成/root/runtime/typecheck実行0。P5d product修正中source読取0。

正式workers-types index480354B/hash `b2e69e6ab70aa354fec99eee7bca72d63f5979539df6c4202981f4a7f90ae79c` とtracked wrangler.toml6235B/hash `0a599c80196b5f1250227071d56770df2af94179293ca172be23a1e54f166886` を直接確認。helperをimport/実行せず、ASTと別のTOML集計で5環境のbinding/type/literal、namedenv/entryとMANIFEST一致、共通requiredがAPP_URL/DBのみと照合。その他global fieldはoptional、4role fieldは各正規config全bindingrequired。triple-referenceは正式Fetcher/D1Database/Queue/global DO/cloudflare:workersを導入し、Cloudflare.Env・global Env・GlobalProps.mainModuleは既exportへ接続。own configにDO bindingなし、DO aliasやany/stubを創作しない。

直接argvは報告のPython3.14.3 -I -S/env -iとown tree/owntoolrootに固定する。stdlib import閉包にNode/Wrangler/esbuild/子/Worker/socket/provider/DB/app実行/env探索がない。fresh gate→toolroot0700/空前後→exact宣言wx600/O_NOFOLLOW→fsync/file inode→parent fsync→bounded再読/hash→tree inode再確認、FDはfinally close、入力/出力2MiB・内部alarm30secが成立。未知config/hash/type/bindingは拒否、失敗root/output保持で再利用しない。外40sec actualexit/両stdout/stderr EOFは実行担当の別観測条件であり、未実行の成功summaryはclosure根拠へ借用しない。

生成前に再確認する有限gate: 固定helper SHA、selected isolatedtreeのcanonical/UID/700、5exact entryのregular/canonical、宣言とtoolroot不存在、ownworkers-types linkが同public canonical。すべてhelper/固定argvの対象で旧main生成型を参照しない。S4別treeも自分のgateを通す必要がある。生成成功・web typecheck成功・runtime環境整合は未検証のまま。

2026-10-05T23:35:33Z。実行/生成/製品編集0、旧main untracked生成型・旧private・DB/workerd/app/env/metrics/provider操作0。新helper固定通知待ち。現時点は正式型の接続方向の確認で、tool実行preflight・web typecheck合格ではない。

直接確認: 公開installed Wrangler4.90.1とworkers-types4.20260511.1のpackage metadata/source、tracked own wrangler.toml/wrangler.do.toml/package、既CF entryの型/export該当部。workers-types index.d.tsはD1Database/Fetcher/Queue/DurableObjectNamespace/DurableObjectState、Cloudflare.Envの宣言merge点、cloudflare:workers正式moduleを提供する。triple-referenceでこれらを導入し、tracked TOML由来のEnvを正式型へ結ぶ方向は成立する。any/空stub/custom代用品は不要。DO mainにはTodoStateObjectの実named re-exportがある。

採用方向は新Python stdlib tomllibによるexact TOML→正式型1file。Wrangler/Node/esbuild/Worker/child/cache/networkを実行せず、required/optional、named environmentとD1/DO別入口・exportの整合を固定helperで確認する。型生成成功をruntime binding/DB動作の証拠にしない。

## 不採用Wrangler API案の静的所見

Wrangler cli.d.ts276–318とcli.js322042のexperimental_generateTypesは{content,env,path,runtime}を返し、API自体は生成fileを書かない。absolute configはconfig探索/redirectを避け、envFile ['/dev/null']は.dev.vars/default.envを避けるが、CLOUDFLARE_INCLUDE_PROCESS_ENV=trueならprocess.envがEnvへ混入する。includeRuntime:falseはgenerateRuntimeTypesを外す。

getTypesEntrypoint→getEntry→guessWorkerFormatはesbuild.build(bundle:false/write:false)を行うため、補助service child0とはいえない。警告のlogger.formatMessageはformatMessagesSyncへ入り、別sync thread/child分岐もある。WRANGLER_LOG=noneでもdoLogはlogfile appendを行う。own TOMLにcustom build/pipelinesがないため通常のcustom shell/provider fetchは必要ないが、このAPI案を副作用0のtoolへ代用しない。現在は上のPython案が採用方向で、API案の実行条件を追加せず不採用として区分する。

Wranglerの正式namedenv集計では全top/namedenvにあるbindingだけrequired、その他optionalで型のunionを作る（cli.js298707/298930）。これを弱めず、今回exact configの型・presence・namedenvを固定helperで照合する。未確認のhelper hash/有限容量・停止・出力mode/exclusive/ownrootのpreflightは固定通知後に追記する。
