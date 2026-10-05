import type { AssetsManifest } from "@vitejs/plugin-rsc/plugin";
import { parseAst, type Rollup } from "vite";
import { describe, expect, it } from "vitest";
import {
  reconcileManifest,
  reconcileRscAssets,
  snapshotEmptyCssChunks,
} from "./rscAssets";

function chunk(fileName: string, code = "", moduleIds = ["/style.css"]) {
  return {
    type: "chunk",
    fileName,
    isEntry: false,
    exports: [],
    moduleIds,
    code,
    viteMetadata: { importedCss: new Set(["assets/style.css"]) },
  } satisfies Pick<
    Rollup.OutputChunk,
    "type" | "fileName" | "isEntry" | "exports" | "moduleIds" | "code"
  > & { viteMetadata: { importedCss: Set<string> } };
}
const asset = (fileName: string) => ({ type: "asset" as const, fileName });
function manifest(): AssetsManifest {
  return {
    bootstrapScriptContent: 'import("/assets/entry.js")',
    clientReferenceDeps: {
      first: {
        js: ["/assets/entry.js", "/assets/style.js"],
        css: ["/assets/style.css"],
      },
      second: {
        js: ["/assets/style.js", "/assets/entry.js"],
        css: ["/assets/style.css"],
      },
    },
    serverResources: { layout: { css: ["/assets/style.css"] } },
    cssLinkPrecedence: false,
  };
}
const css = asset("assets/style.css");
const entry = chunk("assets/entry.js", "export const app = 1;", ["/entry.ts"]);
const style = chunk("assets/style.js", "/* stylesheet */");
const before = {
  [entry.fileName]: entry,
  [style.fileName]: style,
  [css.fileName]: css,
};
const after = { [entry.fileName]: entry, [css.fileName]: css };

describe("RSC CSS-only preload reconciliation", () => {
  it("does not touch non-client output and is excluded from development", () => {
    for (const plugin of reconcileRscAssets()) {
      expect(plugin.apply).toBe("build");
      const hook = plugin.generateBundle;
      const handler = typeof hook === "function" ? hook : hook?.handler;
      if (typeof handler !== "function") throw Error("missing build hook");
      const untouched = structuredClone(after);
      expect(
        Reflect.apply(handler, { environment: { name: "ssr" } }, [
          {},
          Object.freeze(untouched),
        ]),
      ).toBeUndefined();
      expect(untouched).toEqual(after);
    }
  });

  it("removes only disappeared empty CSS chunks while retaining all other manifest values", () => {
    const source = manifest();
    const saved = structuredClone(source);
    const result = reconcileManifest(
      source,
      after,
      snapshotEmptyCssChunks(before, parseAst),
      "/",
    );
    expect(result.clientReferenceDeps).toEqual({
      first: { js: ["/assets/entry.js"], css: ["/assets/style.css"] },
      second: { js: ["/assets/entry.js"], css: ["/assets/style.css"] },
    });
    expect(result.bootstrapScriptContent).toBe(source.bootstrapScriptContent);
    expect(result.serverResources).toBe(source.serverResources);
    expect(result.cssLinkPrecedence).toBe(false);
    expect(source).toEqual(saved);
  });

  it("retains an existing CSS chunk JS reference", () => {
    expect(
      reconcileManifest(
        manifest(),
        before,
        snapshotEmptyCssChunks(before, parseAst),
        "/",
      ),
    ).toEqual(manifest());
  });

  it.each([
    chunk(style.fileName, "globalThis.executed = true;"),
    chunk(style.fileName, "", ["/source.ts"]),
    { ...style, isEntry: true },
    { ...style, exports: ["binding"] },
    { ...style, viteMetadata: { importedCss: new Set<string>() } },
  ])("rejects a disappeared chunk without empty CSS-only evidence", (candidate) => {
    const bundle = { ...before, [candidate.fileName]: candidate };
    expect(() =>
      reconcileManifest(
        manifest(),
        after,
        snapshotEmptyCssChunks(bundle, parseAst),
        "/",
      ),
    ).toThrow("RSC_ASSET_REFERENCE_INVALID");
  });

  it("rejects an unobserved missing JS", () => {
    expect(() =>
      reconcileManifest(manifest(), after, new Map(), "/"),
    ).toThrow();
  });

  it("rejects disappearance of referenced CSS", () => {
    expect(() =>
      reconcileManifest(
        manifest(),
        { [entry.fileName]: entry },
        snapshotEmptyCssChunks(before, parseAst),
        "/",
      ),
    ).toThrow();
  });

  it("requires all CSS evidence even when the missing CSS is not listed in that reference", () => {
    const source = manifest();
    for (const deps of Object.values(source.clientReferenceDeps)) deps.css = [];
    expect(() =>
      reconcileManifest(
        source,
        { [entry.fileName]: entry },
        snapshotEmptyCssChunks(before, parseAst),
        "/",
      ),
    ).toThrow();
  });

  it.each([
    "/assets/../style.js",
    "/assets/%73tyle.js",
    "https://foreign.test/style.js",
  ])("rejects a non-canonical asset reference %s", (href) => {
    const source = manifest();
    source.clientReferenceDeps.first = { js: [href], css: [] };
    expect(() => reconcileManifest(source, after, new Map(), "/")).toThrow();
  });

  it("rejects malformed or runtime-evaluated API values", () => {
    const source = manifest();
    expect(() =>
      reconcileManifest(
        { ...source, clientReferenceDeps: [] },
        after,
        new Map(),
        "/",
      ),
    ).toThrow();
    expect(() =>
      reconcileManifest(
        { ...source, bootstrapScriptContent: { runtime: "evaluated" } },
        after,
        new Map(),
        "/",
      ),
    ).toThrow();
    expect(() =>
      reconcileManifest(Object.create(source), after, new Map(), "/"),
    ).toThrow();
  });
});
