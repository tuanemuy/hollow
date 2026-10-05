import { getPluginApi } from "@vitejs/plugin-rsc";
import type { AssetsManifest } from "@vitejs/plugin-rsc/plugin";
import type { Plugin, Rollup } from "vite";

type EmptyCssChunks = ReadonlyMap<string, readonly string[]>;
type Chunk = Pick<
  Rollup.OutputChunk,
  "type" | "fileName" | "isEntry" | "exports" | "moduleIds" | "code"
>;
type Bundle = Readonly<
  Record<string, Chunk | Pick<Rollup.OutputAsset, "type" | "fileName">>
>;
type Parse = (code: string) => { body: readonly unknown[] };
const failure = () => Error("RSC_ASSET_REFERENCE_INVALID");
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

function manifestShape(value: unknown): value is AssetsManifest {
  if (
    !record(value) ||
    typeof value.bootstrapScriptContent !== "string" ||
    !record(value.clientReferenceDeps) ||
    !Object.values(value.clientReferenceDeps).every(
      (deps) => record(deps) && strings(deps.js) && strings(deps.css),
    ) ||
    (value.cssLinkPrecedence !== undefined &&
      typeof value.cssLinkPrecedence !== "boolean")
  )
    return false;
  return (
    value.serverResources === undefined ||
    (record(value.serverResources) &&
      Object.values(value.serverResources).every(
        (deps) => record(deps) && strings(deps.css),
      ))
  );
}

function cssOf(chunk: Chunk): readonly string[] {
  if (!("viteMetadata" in chunk) || !record(chunk.viteMetadata)) return [];
  const css = chunk.viteMetadata.importedCss;
  if (!(css instanceof Set)) return [];
  const values: unknown[] = [...css];
  if (!strings(values)) throw failure();
  return values;
}

export function snapshotEmptyCssChunks(
  bundle: Bundle,
  parse: Parse,
): EmptyCssChunks {
  const empty = new Map<string, readonly string[]>();
  for (const output of Object.values(bundle)) {
    if (
      output.type !== "chunk" ||
      output.isEntry ||
      output.exports.length ||
      !output.moduleIds.length ||
      !output.moduleIds.every((id) => /\.css(?:\?|$)/.test(id)) ||
      parse(output.code).body.length
    )
      continue;
    const css = cssOf(output);
    if (css.length) empty.set(output.fileName, [...css]);
  }
  return empty;
}

function fileOf(href: unknown, base: string): string {
  if (
    typeof href !== "string" ||
    !base.startsWith("/") ||
    base.startsWith("//") ||
    !base.endsWith("/") ||
    !href.startsWith(base)
  )
    throw failure();
  const file = href.slice(base.length);
  if (
    !file ||
    file.split("/").some((part) => !part || part === "." || part === "..") ||
    /[%?#\\]/.test(file)
  )
    throw failure();
  return file;
}

export function reconcileManifest(
  value: unknown,
  bundle: Bundle,
  emptyCss: EmptyCssChunks,
  base: string,
): AssetsManifest {
  if (!manifestShape(value)) throw failure();
  const entries: Array<
    [string, AssetsManifest["clientReferenceDeps"][string]]
  > = [];
  for (const [id, deps] of Object.entries(value.clientReferenceDeps)) {
    for (const href of deps.css) {
      const file = fileOf(href, base);
      if (!Object.hasOwn(bundle, file) || bundle[file]?.type !== "asset")
        throw failure();
    }
    const js = deps.js.filter((href) => {
      const file = fileOf(href, base);
      if (Object.hasOwn(bundle, file)) return true;
      const css = emptyCss.get(file);
      if (
        !css?.length ||
        !css.every(
          (name) =>
            Object.hasOwn(bundle, name) && bundle[name]?.type === "asset",
        )
      )
        throw failure();
      return false;
    });
    entries.push([id, { ...deps, js }]);
  }
  return { ...value, clientReferenceDeps: Object.fromEntries(entries) };
}

export function reconcileRscAssets(): Plugin[] {
  let emptyCss: EmptyCssChunks = new Map();
  let base = "/";
  let manager: ReturnType<typeof getPluginApi>;
  return [
    {
      name: "hollow:rsc-assets-snapshot",
      apply: "build",
      configResolved(config) {
        base = config.base;
        manager = getPluginApi(config);
        if (
          !manager ||
          typeof manager.manager !== "object" ||
          manager.manager === null
        )
          throw failure();
      },
      generateBundle(_options, bundle) {
        if (this.environment.name !== "client") return;
        emptyCss = snapshotEmptyCssChunks(bundle, (code) => this.parse(code));
      },
    },
    {
      name: "hollow:rsc-assets-after-css",
      apply: "build",
      generateBundle: {
        order: "post",
        handler(_options, bundle) {
          if (this.environment.name !== "client") return;
          if (!manager) throw failure();
          // Vite removes CSS-only JS after RSC has collected preload URLs.
          manager.manager.buildAssetsManifest = reconcileManifest(
            manager.manager.buildAssetsManifest,
            bundle,
            emptyCss,
            base,
          );
        },
      },
    },
  ];
}
