# P5d 公開依存・静的 tooling

隔離 worktree: `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006`。tracked5packageの宣言依存105本＋追加public hoist3本（root @napi-rs/canvas / pdfjs-dist / sharp）＝公開 symlink 計108本。従来の97＋12＝109は計数誤差として訂正し、第四linkを追加しない。AGENTS→tracked CLAUDE linkは別計数。private/untracked/.env/data/validation rootを参照しない。

| worktree 内 source | 公開 canonical target |
| --- | --- |
| `node_modules/@biomejs/biome` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@biomejs+biome@2.4.15/node_modules/@biomejs/biome` |
| `node_modules/@cloudflare/vitest-pool-workers` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@cloudflare+vitest-pool-workers@0.16.4_@cloudflare+workers-types@4.20260511.1_@vitest+r_b182946997a1aed0cef92859d771b30d/node_modules/@cloudflare/vitest-pool-workers` |
| `node_modules/@napi-rs/canvas` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@napi-rs+canvas@1.0.8/node_modules/@napi-rs/canvas` |
| `node_modules/@types/node` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+node@25.7.0/node_modules/@types/node` |
| `node_modules/@typescript/native-preview` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@typescript+native-preview@7.0.0-dev.20260513.1/node_modules/@typescript/native-preview` |
| `node_modules/esbuild` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild` |
| `node_modules/pdfjs-dist` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/pdfjs-dist@6.3.289/node_modules/pdfjs-dist` |
| `node_modules/sharp` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/sharp@0.35.4_@types+node@25.7.0/node_modules/sharp` |
| `node_modules/typescript` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript` |
| `node_modules/vitest` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/vitest@4.1.6_@opentelemetry+api@1.9.0_@types+node@25.7.0_vite@8.0.12_@types+node@25.7.0_4c045a538af06962bfc9bc6cdc886256/node_modules/vitest` |
| `packages/core/node_modules/@aws-sdk/client-lambda` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@aws-sdk+client-lambda@3.1047.0/node_modules/@aws-sdk/client-lambda` |
| `packages/core/node_modules/@aws-sdk/client-secrets-manager` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@aws-sdk+client-secrets-manager@3.1047.0/node_modules/@aws-sdk/client-secrets-manager` |
| `packages/core/node_modules/@aws-sdk/client-sqs` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@aws-sdk+client-sqs@3.1047.0/node_modules/@aws-sdk/client-sqs` |
| `packages/core/node_modules/@cloudflare/workers-types` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@cloudflare+workers-types@4.20260511.1/node_modules/@cloudflare/workers-types` |
| `packages/core/node_modules/@google-cloud/pubsub` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@google-cloud+pubsub@4.11.0/node_modules/@google-cloud/pubsub` |
| `packages/core/node_modules/@google-cloud/secret-manager` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@google-cloud+secret-manager@5.6.0/node_modules/@google-cloud/secret-manager` |
| `packages/core/node_modules/@js-temporal/polyfill` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@js-temporal+polyfill@0.5.1/node_modules/@js-temporal/polyfill` |
| `packages/core/node_modules/@libsql/client` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client` |
| `packages/core/node_modules/@types/archiver` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+archiver@8.0.0/node_modules/@types/archiver` |
| `packages/core/node_modules/@types/css-tree` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+css-tree@3.2.0/node_modules/@types/css-tree` |
| `packages/core/node_modules/@types/node` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+node@25.7.0/node_modules/@types/node` |
| `packages/core/node_modules/@types/sanitize-html` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+sanitize-html@2.16.1/node_modules/@types/sanitize-html` |
| `packages/core/node_modules/@types/yauzl` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+yauzl@3.4.0/node_modules/@types/yauzl` |
| `packages/core/node_modules/archiver` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/archiver@8.0.0/node_modules/archiver` |
| `packages/core/node_modules/cfb` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/cfb@1.2.2/node_modules/cfb` |
| `packages/core/node_modules/css-tree` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree` |
| `packages/core/node_modules/dom-serializer` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/dom-serializer` |
| `packages/core/node_modules/domhandler` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/domhandler@5.0.3/node_modules/domhandler` |
| `packages/core/node_modules/drizzle-orm` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/drizzle-orm@0.45.2_@cloudflare+workers-types@4.20260511.1_@libsql+client@0.18.0_@opentelemetry+api@1.9.0/node_modules/drizzle-orm` |
| `packages/core/node_modules/exceljs` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/exceljs@4.4.0/node_modules/exceljs` |
| `packages/core/node_modules/fast-check` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/fast-check@4.8.0/node_modules/fast-check` |
| `packages/core/node_modules/fast-xml-parser` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/fast-xml-parser@5.11.1/node_modules/fast-xml-parser` |
| `packages/core/node_modules/google-auth-library` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/google-auth-library@9.15.1/node_modules/google-auth-library` |
| `packages/core/node_modules/htmlparser2` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/htmlparser2` |
| `packages/core/node_modules/ipaddr.js` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/ipaddr.js@2.5.0/node_modules/ipaddr.js` |
| `packages/core/node_modules/mammoth` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/mammoth@1.12.2/node_modules/mammoth` |
| `packages/core/node_modules/marked` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/marked@18.0.11/node_modules/marked` |
| `packages/core/node_modules/mediabunny` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/mediabunny@1.55.7/node_modules/mediabunny` |
| `packages/core/node_modules/music-metadata` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/music-metadata@11.13.0/node_modules/music-metadata` |
| `packages/core/node_modules/parse5` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/parse5@7.3.0/node_modules/parse5` |
| `packages/core/node_modules/pdfjs-dist` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/pdfjs-dist@6.3.289/node_modules/pdfjs-dist` |
| `packages/core/node_modules/puppeteer-core` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/puppeteer-core@25.11.0_yauzl@3.4.0/node_modules/puppeteer-core` |
| `packages/core/node_modules/sanitize-html` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/sanitize-html@2.17.7/node_modules/sanitize-html` |
| `packages/core/node_modules/sharp` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/sharp@0.35.4_@types+node@25.7.0/node_modules/sharp` |
| `packages/core/node_modules/uuid` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/uuid@14.0.0/node_modules/uuid` |
| `packages/core/node_modules/vitest` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/vitest@4.1.6_@opentelemetry+api@1.9.0_@types+node@25.7.0_vite@8.0.12_@types+node@25.7.0_4c045a538af06962bfc9bc6cdc886256/node_modules/vitest` |
| `packages/core/node_modules/yauzl` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/yauzl@3.4.0/node_modules/yauzl` |
| `packages/core/node_modules/zod` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/zod@4.4.3/node_modules/zod` |
| `apps/web/node_modules/@aws-sdk/client-lambda` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@aws-sdk+client-lambda@3.1047.0/node_modules/@aws-sdk/client-lambda` |
| `apps/web/node_modules/@aws-sdk/client-secrets-manager` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@aws-sdk+client-secrets-manager@3.1047.0/node_modules/@aws-sdk/client-secrets-manager` |
| `apps/web/node_modules/@aws-sdk/client-sqs` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@aws-sdk+client-sqs@3.1047.0/node_modules/@aws-sdk/client-sqs` |
| `apps/web/node_modules/@cloudflare/vite-plugin` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@cloudflare+vite-plugin@1.36.4_vite@8.0.12_@types+node@25.7.0_esbuild@0.27.7_jiti@2.7.0_0b9c972281865744ffdb75c18dceef0d/node_modules/@cloudflare/vite-plugin` |
| `apps/web/node_modules/@cloudflare/vitest-pool-workers` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@cloudflare+vitest-pool-workers@0.16.4_@cloudflare+workers-types@4.20260511.1_@vitest+r_b182946997a1aed0cef92859d771b30d/node_modules/@cloudflare/vitest-pool-workers` |
| `apps/web/node_modules/@cloudflare/workers-types` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@cloudflare+workers-types@4.20260511.1/node_modules/@cloudflare/workers-types` |
| `apps/web/node_modules/@codemirror/commands` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@codemirror+commands@6.11.0/node_modules/@codemirror/commands` |
| `apps/web/node_modules/@codemirror/lang-html` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@codemirror+lang-html@6.4.12/node_modules/@codemirror/lang-html` |
| `apps/web/node_modules/@codemirror/language` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@codemirror+language@6.12.4/node_modules/@codemirror/language` |
| `apps/web/node_modules/@codemirror/state` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@codemirror+state@6.7.4/node_modules/@codemirror/state` |
| `apps/web/node_modules/@codemirror/view` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@codemirror+view@6.43.11/node_modules/@codemirror/view` |
| `apps/web/node_modules/@google-cloud/pubsub` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@google-cloud+pubsub@4.11.0/node_modules/@google-cloud/pubsub` |
| `apps/web/node_modules/@google-cloud/secret-manager` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@google-cloud+secret-manager@5.6.0/node_modules/@google-cloud/secret-manager` |
| `apps/web/node_modules/@hono/node-server` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@hono+node-server@2.0.2_hono@4.12.18/node_modules/@hono/node-server` |
| `apps/web/node_modules/@libsql/client` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client` |
| `apps/web/node_modules/@repo/core` | `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006/packages/core` |
| `apps/web/node_modules/@tailwindcss/vite` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@tailwindcss+vite@4.3.0_vite@8.0.12_@types+node@25.7.0_esbuild@0.27.7_jiti@2.7.0_tsx@4.21.0_/node_modules/@tailwindcss/vite` |
| `apps/web/node_modules/@tanstack/react-router` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@tanstack+react-router@1.169.2_react-dom@19.2.6_react@19.2.6__react@19.2.6/node_modules/@tanstack/react-router` |
| `apps/web/node_modules/@tanstack/react-router-devtools` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@tanstack+react-router-devtools@1.166.13_@tanstack+react-router@1.169.2_react-dom@19.2._3317ecc8b0e52fdf92b0eb4759fcb5c3/node_modules/@tanstack/react-router-devtools` |
| `apps/web/node_modules/@tanstack/react-start` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@tanstack+react-start@1.167.65_@vitejs+plugin-rsc@0.5.26_react-dom@19.2.6_react@19.2.6__d071f769a0082e8b8414ec8c9be6188a/node_modules/@tanstack/react-start` |
| `apps/web/node_modules/@types/aws-lambda` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+aws-lambda@8.10.161/node_modules/@types/aws-lambda` |
| `apps/web/node_modules/@types/node` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+node@25.7.0/node_modules/@types/node` |
| `apps/web/node_modules/@types/react` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+react@19.2.14/node_modules/@types/react` |
| `apps/web/node_modules/@types/react-dom` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+react-dom@19.2.3_@types+react@19.2.14/node_modules/@types/react-dom` |
| `apps/web/node_modules/@vitejs/plugin-react` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@vitejs+plugin-react@6.0.1_vite@8.0.12_@types+node@25.7.0_esbuild@0.27.7_jiti@2.7.0_tsx@4.21.0_/node_modules/@vitejs/plugin-react` |
| `apps/web/node_modules/@vitejs/plugin-rsc` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@vitejs+plugin-rsc@0.5.26_react-dom@19.2.6_react@19.2.6__react@19.2.6_vite@8.0.12_@type_61abc89b72ec675395db58c8ff292304/node_modules/@vitejs/plugin-rsc` |
| `apps/web/node_modules/css-tree` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/css-tree@3.2.1/node_modules/css-tree` |
| `apps/web/node_modules/dom-serializer` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/dom-serializer@2.0.0/node_modules/dom-serializer` |
| `apps/web/node_modules/drizzle-kit` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/drizzle-kit@0.31.10/node_modules/drizzle-kit` |
| `apps/web/node_modules/drizzle-orm` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/drizzle-orm@0.45.2_@cloudflare+workers-types@4.20260511.1_@libsql+client@0.18.0_@opentelemetry+api@1.9.0/node_modules/drizzle-orm` |
| `apps/web/node_modules/google-auth-library` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/google-auth-library@9.15.1/node_modules/google-auth-library` |
| `apps/web/node_modules/htmlparser2` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/htmlparser2@10.0.0/node_modules/htmlparser2` |
| `apps/web/node_modules/prosemirror-commands` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/prosemirror-commands@1.7.1/node_modules/prosemirror-commands` |
| `apps/web/node_modules/prosemirror-history` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/prosemirror-history@1.5.0/node_modules/prosemirror-history` |
| `apps/web/node_modules/prosemirror-keymap` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/prosemirror-keymap@1.2.3/node_modules/prosemirror-keymap` |
| `apps/web/node_modules/prosemirror-model` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/prosemirror-model@1.25.4/node_modules/prosemirror-model` |
| `apps/web/node_modules/prosemirror-schema-list` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/prosemirror-schema-list@1.5.1/node_modules/prosemirror-schema-list` |
| `apps/web/node_modules/prosemirror-state` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/prosemirror-state@1.4.4/node_modules/prosemirror-state` |
| `apps/web/node_modules/prosemirror-tables` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/prosemirror-tables@1.8.5/node_modules/prosemirror-tables` |
| `apps/web/node_modules/prosemirror-transform` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/prosemirror-transform@1.10.5/node_modules/prosemirror-transform` |
| `apps/web/node_modules/prosemirror-view` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/prosemirror-view@1.41.7/node_modules/prosemirror-view` |
| `apps/web/node_modules/react` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/react@19.2.6/node_modules/react` |
| `apps/web/node_modules/react-dom` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/react-dom@19.2.6_react@19.2.6/node_modules/react-dom` |
| `apps/web/node_modules/tailwindcss` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/tailwindcss@4.3.0/node_modules/tailwindcss` |
| `apps/web/node_modules/tsx` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/tsx@4.21.0/node_modules/tsx` |
| `apps/web/node_modules/vite` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/vite@8.0.12_@types+node@25.7.0_esbuild@0.27.7_jiti@2.7.0_tsx@4.21.0/node_modules/vite` |
| `apps/web/node_modules/wrangler` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/wrangler@4.90.1_@cloudflare+workers-types@4.20260511.1/node_modules/wrangler` |
| `apps/web/node_modules/zod` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/zod@4.4.3/node_modules/zod` |
| `infra/aws/node_modules/@repo/web` | `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006/apps/web` |
| `infra/aws/node_modules/@types/node` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+node@25.7.0/node_modules/@types/node` |
| `infra/aws/node_modules/aws-cdk` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/aws-cdk@2.1132.0/node_modules/aws-cdk` |
| `infra/aws/node_modules/aws-cdk-lib` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/aws-cdk-lib@2.261.0_constructs@10.7.0/node_modules/aws-cdk-lib` |
| `infra/aws/node_modules/constructs` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/constructs@10.7.0/node_modules/constructs` |
| `infra/aws/node_modules/tsx` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/tsx@4.21.0/node_modules/tsx` |
| `infra/aws/node_modules/typescript` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript` |
| `infra/cloudflare/pulumi/node_modules/@pulumi/cloudflare` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@pulumi+cloudflare@6.20.0_typescript@6.0.3/node_modules/@pulumi/cloudflare` |
| `infra/cloudflare/pulumi/node_modules/@pulumi/pulumi` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@pulumi+pulumi@3.261.0_typescript@6.0.3/node_modules/@pulumi/pulumi` |
| `infra/cloudflare/pulumi/node_modules/@types/node` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@types+node@25.7.0/node_modules/@types/node` |
| `infra/cloudflare/pulumi/node_modules/tsx` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/tsx@4.21.0/node_modules/tsx` |
| `infra/cloudflare/pulumi/node_modules/typescript` | `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript` |

`@repo/core` は `apps/web/node_modules/@repo/core` から同worktreeの `packages/core` を指す。既public dependencyを借用し、install/network/main modules/lock変更0。

規定scriptの公開tool binding: main `node_modules/.bin/tsgo`（native-preview7.0.0-dev.20260513.1）、`biome`（2.4.15）、`tsc`（typescript6.0.3 shim）。PATHはその公開 `.bin` を単発envの先頭へ追加し元PATHを継承する。PATH実全値は記録しない。

```sh
env PATH="/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.bin:$PATH" pnpm_config_verify_deps_before_run= /nix/store/5xwgha9mcl3x41zs1yf3cxjcl4866mvk-pnpm-11.1.2/bin/pnpm --config.verify-deps-before-run=false typecheck
```

pnpm11.1.2の公開pnpm.mjs: 明示falsy envの `pnpm_config_verify_deps_before_run` はrecursive childrenに継承される。CLI falseを併用し、singlecmdだけverify-deps-before-runによるautoInstallを抑止する。main/global/worktree設定ファイル書換え0。lint:fix/formatも同env/argv/cwd境界。静的script以外やinfra cloud操作は実行しない。
