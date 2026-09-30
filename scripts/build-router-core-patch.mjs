import assert from "node:assert/strict";
import { readFile, realpath, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stop, transform } from "esbuild";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const MagicString = require(
  path.join(
    repo,
    "node_modules/.pnpm/magic-string@0.30.21/node_modules/magic-string",
  ),
);
const remapping = require(
  path.join(
    repo,
    "node_modules/.pnpm/@jridgewell+remapping@2.3.5/node_modules/@jridgewell/remapping",
  ),
);

async function compile(source, name, format) {
  const extension = format === "esm" ? "js" : "cjs";
  const filename = `${name}.${extension}`;
  const result = await transform(source, {
    loader: "ts",
    format,
    target: "es2022",
    sourcemap: "external",
    sourcesContent: true,
    sourcefile: `../../../src/ssr/${name}.ts`,
    legalComments: "inline",
  });
  assert.equal(result.warnings.length, 0);
  const code = new MagicString(result.code);
  const internalExports = [
    ...result.code.matchAll(/^  dehydrateMatch(?:,|: \(\) => dehydrateMatch,)\n/gm),
  ];
  assert.equal(internalExports.length, name === "ssr-server" ? 1 : 0);
  for (const match of internalExports) {
    code.remove(match.index, match.index + match[0].length);
  }
  const bootstrap = /__toESM\(require\("\.\/tsrScript\?script-string"\)\)/g;
  const interop = [...result.code.matchAll(bootstrap)];
  assert.equal(interop.length, format === "cjs" && name === "ssr-server" ? 1 : 0);
  for (const match of interop) {
    code.overwrite(
      match.index,
      match.index + match[0].length,
      'require("./tsrScript.cjs")',
    );
  }
  for (const match of result.code.matchAll(/"(\.{1,2}\/[^"\n]+)"/g)) {
    if (
      interop.some(
        (entry) =>
          match.index >= entry.index &&
          match.index < entry.index + entry[0].length,
      )
    )
      continue;
    const specifier = match[1].replace(/\?script-string$/, "");
    assert(!/\.[cm]?js$/.test(specifier));
    code.overwrite(
      match.index,
      match.index + match[0].length,
      JSON.stringify(`${specifier}.${extension}`),
    );
  }
  const map = remapping(
    [
      JSON.parse(
        code.generateMap({ hires: true, source: filename, file: filename }).toString(),
      ),
      JSON.parse(result.map),
    ],
    () => null,
  );
  map.file = filename;
  assert.deepEqual(map.sources, [`../../../src/ssr/${name}.ts`]);
  assert.deepEqual(map.sourcesContent, [source]);
  assert(map.mappings.length > 0);
  const output = `${code.toString()}//# sourceMappingURL=${filename}.map\n`;
  assert(!output.includes("?script-string"));
  assert(!output.includes(repo));
  return { code: output, map: `${JSON.stringify(map)}\n` };
}

async function main() {
  assert.equal(process.argv.length, 3);
  const directory = await realpath(process.argv[2]);
  assert(!directory.includes("/node_modules/"));
  assert((await stat(directory)).isDirectory());
  const manifest = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
  assert.equal(manifest.name, "@tanstack/router-core");
  assert.equal(manifest.version, "1.169.2");
  let bytes = 0;
  for (const name of ["ssr-server", "transformStreamWithRouter"]) {
    const source = await readFile(path.join(directory, "src/ssr", `${name}.ts`), "utf8");
    for (const format of ["esm", "cjs"]) {
      const output = await compile(source, name, format);
      assert.deepEqual(await compile(source, name, format), output);
      const extension = format === "esm" ? "js" : "cjs";
      const target = path.join(directory, "dist", format, "ssr", `${name}.${extension}`);
      await writeFile(target, output.code);
      await writeFile(`${target}.map`, output.map);
      bytes += Buffer.byteLength(output.code) + Buffer.byteLength(output.map);
    }
  }
  process.stdout.write(`${JSON.stringify({ code: "GENERATED", runtimeFiles: 4, maps: 4, reproducible: true, bytes })}\n`);
}

main()
  .catch(() => {
    process.stdout.write('{"code":"GENERATION_FAILED"}\n');
    process.exitCode = 1;
  })
  .finally(() => stop());
