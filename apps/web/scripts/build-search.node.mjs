import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await build({
  entryPoints: ["searchSupervisor", "searchQuery", "noteProjection"].map(
    (name) => path.join(root, "app/worker/node", `${name}.ts`),
  ),
  outdir: path.join(root, "dist/server/browse"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outExtension: { ".js": ".mjs" },
  external: ["@libsql/client", "libsql", "css-tree"],
});
