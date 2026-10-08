# P5b-2b2 単画像 codec / child 実装補助

## 範囲

Implementer補助。独立受入ではない。専有は `imageCodec.mjs`、`imageChild.mjs`、`imageCodec.test.ts` と本報告のみ。共有型/declaration、親preparer、manifest、DB、生成wire、UI、配備は主担当。

2026-09-28 21:08:26 JST、最終単独unit 25/25成功、exit0。専有3pathのBiomeもexit0。全体検査・実環境・旧proof・秘密・外部接続は操作していない。実行枠は主へ返却済み。製品書込停止後、報告と全文確認だけを行った。

変更パス:

- `packages/core/src/adapters/node/llm/imageCodec.mjs`
- `packages/core/src/adapters/node/llm/imageChild.mjs`
- `packages/core/src/adapters/node/llm/imageCodec.test.ts`
- `.goal-implement/phases/P5b-2b2-image-tests.md`

`imageCodec.d.mts` は主担当が作成し、こちらは非編集。型の全体適用は主担当の検査へ残す。

## 実装

- 静止PNG/JPEG/WebP/GIFを全container境界まで検査する。PNG全chunk CRC、JPEG entropy/EOIとMPF、WebP RIFF長/chunk/animation、GIF subblock/一画像/trailerを確認する。APNG、複数GIF frame、animated WebP、MPFは先頭画像へ縮退しない。
- 原本50MiB、4096px、16,000,000pxを境界検査し、sharp 0.35.4で全decode・autoOrient・sRGB・白背景・alpha除去・metadata除去・PNGを生成する。出力PNGを再decodeし、寸法/三channel/metadata非保持を照合する。
- PNG streamは8MiB超chunkを保持配列へ追加せず拒否する。固定sharpの `dist/output.mjs` はnative encode完了後にBufferをpushするため、これは外側受領/保持の上限でありnative内部peak/RSSの硬上限ではない。入力50MiB/16Mpx/三channel/一frameで有限化するが、最大負荷の測定根拠ではない。この区分は主担当が採用済み。
- childはstdin原本、stdout PNG、fd3有限JSONの一個＋EOFを使う。consoleとNodeのネットワーク入口を拒否し、例外は有限codeのみ。原本identity/credentialを受け取らず、hashはfd3内部metadataのみ。stdoutは64KiB単位のbackpressure、全自有streamのclose後に正常終了する。親の実exit/全pipe観測、abort/timeout/unknown分類は主担当の別所有。

## 検査範囲

メモリ原本24例、合計2MiB以内、保存tmp0。派生PNG/転送の累計24MiB以内をtestで制限し、両上限assertが成立した。実行は逐次。codec23対は正常4codec、EXIF向き6、CMYK、alpha白背景、4096実decode、4097/16M超のheader拒否、APNG/GIF/WebP/MPF、CRC/切断/4codec末尾余剰/未知/空/未知criticalを含む。animated GIF/WebPは別途metadata.pages=2を確認した。APNGは二frameのCRC付きchunk構成、MPFはAPP2識別子注入であり、実撮影機器のMPO集合を網羅した証明ではない。

実childの正常binary＋fd3hash/byte照合と有限失敗を各一対。実child closeとstdin/stdout/stderr/fd3のclose四件を全て待ち、2件ともsignalなしの通常終了、stderr0を確認した。正常対ではPNGのreadable到達時にまだdata消費0というbooleanを確認し、50ms後にresumeして全量を照合した。これは有限pipeでの実待機対であり、OS pipe全容量や全native threadの硬保証ではない。自己deadlineは失敗扱いであり、今回は発火0。未知PID/SIGKILL操作0。

16Mpx exact、8MiB exact/+1・超過chunk実注入、12MiB JSON、50MiB最大入力の実高負荷・実認識品質・OS隔離・全RSS・実OpenRouter・DB/current認可・本文commitは本小codec検査の証明範囲外。親abort/timeout/未終了unknownもこの二つの通常終了対では証明しない。親/生成adapterのpure境界と本codec小実入力を分離する。静止先頭への縮退0と全container終端/再decodeの直接部分は固定B、binary childの通常実終了は固定Dの補助根拠に限定する（返却後、主が旧H表記を現planへ訂正。検査内容不変）。

## 結果と回収

実行コマンドは次の限定二つ。全量checkではない。

```sh
pnpm exec biome check --write packages/core/src/adapters/node/llm/imageCodec.mjs packages/core/src/adapters/node/llm/imageChild.mjs packages/core/src/adapters/node/llm/imageCodec.test.ts
pnpm exec vitest run packages/core/src/adapters/node/llm/imageCodec.test.ts --fileParallelism=false
```

- 初回21:07:31 JST、25/25、522ms、exit0。Biomeは3filesを整形しexit0。
- 初回のpauseはspawn基準であり実出力より先に解除し得た。主許可のtest-only補強でreadable到達基準へ変更した。製品guard変更0。
- 最終21:08:26 JST、25/25、492ms、exit0。直前Biomeは3files/no fixes/exit0。初回と最終の25を合算しない。

両runともコマンド呼出内で終端回収し、未回収session/exec0。自己childは実close/全pipe close後にtracking mapから除去、afterAll時0。timerはfinally clear、原本mapもclear、自己DB/tmp/file作成0。source2files/test/report全文確認後、全4path所有を主へ返し、文書を含む全操作を停止する。新たな受入条件や独立合格を宣言しない。
