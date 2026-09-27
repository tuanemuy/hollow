import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await build({
  entryPoints: [
    "searchSupervisor",
    "searchQuery",
    "publicQuery",
    "noteProjection",
  ].map((name) => path.join(root, "app/worker/node", `${name}.ts`)),
  outdir: path.join(root, "dist/server/browse"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outExtension: { ".js": ".mjs" },
  external: ["@libsql/client", "libsql", "css-tree"],
});

await build({
  entryPoints: [
    path.resolve(
      root,
      "../../packages/core/src/adapters/node/exportDocument/worker.ts",
    ),
  ],
  outfile: path.join(root, "dist/server/export/document.mjs"),
  banner: {
    js: 'import { createRequire as exportCreateRequire } from "node:module"; const require = exportCreateRequire(import.meta.url);',
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["css-tree"],
});

const pdfSource = path.resolve(
  root,
  "../../packages/core/src/adapters/node/pdf",
);
const pdfOutput = path.join(root, "dist/server/pdf");
await mkdir(pdfOutput, { recursive: true });
await build({
  entryPoints: ["engine", "documentWorker"].map((name) =>
    path.join(pdfSource, `${name}.ts`),
  ),
  outdir: pdfOutput,
  banner: {
    js: 'import { createRequire as pdfRequire } from "node:module"; const require = pdfRequire(import.meta.url);',
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outExtension: { ".js": ".mjs" },
  external: ["css-tree"],
});
await copyFile(
  path.join(pdfSource, "supervisor.py"),
  path.join(pdfOutput, "supervisor.py"),
);

await build({
  entryPoints: [
    path.resolve(
      root,
      "../../packages/core/src/adapters/node/llm/sourceWorker.mjs",
    ),
  ],
  outfile: path.join(root, "dist/server/llm/sourceWorker.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
});
