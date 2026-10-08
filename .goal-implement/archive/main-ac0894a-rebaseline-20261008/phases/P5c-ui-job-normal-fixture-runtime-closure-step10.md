# normal PUBLIC runtime closure step10 — ws 正式 package exports

2026-10-06。Root 採用の step9（4075 B / SHA256 `11d569dfff515c9b2653998a3404115067f09eb18306eca1fd5b149cb82192f8`）と、その ws sibling alias の字句 target を基点に、今回許可された package.json 一つだけを直接読んだ。step9 本文や alias は再読していない。

## 直接読取結果

| exact PUBLIC path | bytes | SHA256 | actual mode / UID / nlink |
| --- | ---: | --- | --- |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/package.json` | 1753 | `c642fa2a61006bd082f620bbaab30df014340f96c429bbe97c718df5bad3c968` | 0644 / 501 / 1 |

32768 B 上限内。canonical path 同値、regular / nonlink / self UID、O_NOFOLLOW 読取 FD の fstat 前後と path lstat 前後について dev・inode・mode・UID・nlink・size・mtime・ctime が一致し、全文 byte 数と SHA256 を確認した。native entry や addon の metadata / 本文は読んでいない。

package は `ws` / `8.20.1`。正式 `exports["."]` は宣言順で `browser: ./browser.js`、`import: ./wrapper.mjs`、`require: ./index.js`。`main` は `index.js`、`type` の宣言はない。Node ESM の通常 import で browser 条件を追加しない既定経路を対象とすると、browser は選択せず import 条件の `./wrapper.mjs` が次 entry となる。exports にある選択を優先し、main / require / browser を fallback として先読みしない。実 resolver / runtime の条件集合は今回起動しておらず、この判断は正式宣言と対象 Node ESM 契約の静的対応である。

## 次の有限読取提案（まだ未採用・未読取）

| exact target | kind | 提案上限 | 根拠 |
| --- | --- | ---: | --- |
| `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ws@8.20.1/node_modules/ws/wrapper.mjs` | PUBLIC JS | 65536 B / unique 65536 B | 上記 `exports["."].import` の exact relative literal |

次はこの一つの canonical / regular / self UID / nlink1 / actual mode / full stable SHA と formal import / export / require edges を確認する案である。target の存在・metadata・本文・相対依存は現在未確認。次正式 edges から導出できる path だけを別途 Root に提示する。unknown fallback、extensionless 候補、周辺 directory walk / glob は行わない。

`dependencies` と `optionalDependencies` はない。optional peer として `bufferutil: ^4.0.1`、`utf-8-validate: >=5.0.2` が宣言されている。この宣言だけでは runtime 選択・addon 初期化・不在時分岐を確定できない。両 target の探索・metadata・本文・native load は 0。wrapper 未読取の段階で通常 closure 成立を主張しない。

## 限界・停止

今回直接根拠は package JSON 一つ、1753 B のみ。旧 JS32 / 2MiB の whole closure と新 runtime / material 予算は未成立・別採用のまま。通信、WebSocket、DNS、HTTP、child、native、Node import / eval、default / preflight、DB、build、root probe / create は 0。全 generated SOURCE / build / TMP / results / key / proof / cache / validation-private roots は成功・失敗とも NOOPS。C0 / S5 / P5d SOURCE / helpers、main、Manager 正本の読取・変更は 0。本提案だけ wx600 で固定し、ALL read STOP。
