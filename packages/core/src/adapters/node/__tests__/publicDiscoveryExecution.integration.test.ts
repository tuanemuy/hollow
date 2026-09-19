import { mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PublicDiscoveryRequest } from "@repo/core/application/publication/ports";
import { build } from "esbuild";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  createTestContainer,
  type TestContainer,
} from "../../libsql/__tests__/helpers";
import type { SearchDiagnostic } from "../browse/searchDiagnostic";
import { NodeSearchExecution } from "../browse/searchExecution";
import { NodePublicDiscoveryExecution } from "../publication/execution";

describe("dedicated public search process lifetime", () => {
  let directory: string;
  let base: TestContainer;
  let databaseUrl: string;
  const executors: { stop(): Promise<void> }[] = [];
  const root = path.resolve(import.meta.dirname, "../../../../../..");
  const request: PublicDiscoveryRequest = {
    kind: "list",
    scope: { kind: "all" },
    conditions: { query: "", tags: [], zone: "UTC" },
  };
  beforeAll(async () => {
    directory = await mkdtemp(
      path.join(os.tmpdir(), "hollow-public-discovery-test-"),
    );
    await symlink(
      path.join(root, "packages/core/node_modules"),
      path.join(directory, "node_modules"),
    );
    await build({
      entryPoints: ["searchSupervisor", "publicQuery", "searchQuery"].map((n) =>
        path.join(root, `apps/web/app/worker/node/${n}.ts`),
      ),
      outdir: directory,
      outExtension: { ".js": ".mjs" },
      platform: "node",
      format: "esm",
      target: "node22",
      bundle: true,
      external: ["@libsql/client", "libsql", "css-tree"],
      logLevel: "silent",
    });
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  beforeEach(async () => {
    base = await createTestContainer();
    databaseUrl = `file:${String((await base.client.execute("pragma database_list")).rows[0]?.file)}`;
  });
  afterEach(async () => {
    for (const e of executors.splice(0)) await e.stop();
    base.close();
  });
  function execution(busy = false, events: SearchDiagnostic[] = []) {
    const e = new NodePublicDiscoveryExecution({
      childPath: path.join(directory, "searchSupervisor.mjs"),
      workerPath: busy
        ? path.join(import.meta.dirname, "fixtures/searchBusyWorker.mjs")
        : path.join(directory, "publicQuery.mjs"),
      databaseUrl,
      observe: (event) => events.push(event),
    });
    executors.push(e);
    return e;
  }
  it("runs the bundled public SQL worker and resolves only after actual child close", async () => {
    const events: SearchDiagnostic[] = [];
    const reader = execution(false, events);
    expect(await reader.execute(request)).toMatchObject({
      kind: "list",
      page: { total: 0, items: [] },
    });
    expect(events.at(-1)).toMatchObject({ stage: "close", code: 0 });
    await expect(
      reader.execute({
        ...request,
        scope: { kind: "profile", handle: "missing" },
      }),
    ).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
    expect(await reader.execute({ kind: "sitemap-index" })).toEqual({
      kind: "sitemap-index",
      paths: [],
    });
  });
  it("bounds one active plus sixteen queued requests and closes busy SQL within the common deadline", async () => {
    const events: SearchDiagnostic[] = [];
    const reader = execution(true, events);
    const start = performance.now();
    const results = await Promise.allSettled(
      Array.from({ length: 18 }, () => reader.execute(request)),
    );
    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(events.filter((e) => e.stage === "accepted")).toHaveLength(17);
    expect(performance.now() - start).toBeLessThan(4500);
    await reader.stop();
    expect(events.at(-1)?.stage).toBe("close");
    expect(events.some((e) => e.signal === "SIGKILL")).toBe(true);
  });
  it("cancel and stop never release the live slot; authenticated search has an independent slot", async () => {
    const events: SearchDiagnostic[] = [];
    const reader = execution(true, events);
    const controller = new AbortController();
    const result = reader.execute(request, controller.signal).catch((e) => e);
    controller.abort();
    expect(await result).toMatchObject({ code: "PUBLIC_SEARCH_BUSY" });
    await reader.stop();
    expect(events.at(-1)?.stage).toBe("close");
    await expect(reader.execute(request)).rejects.toMatchObject({
      code: "PUBLIC_SEARCH_BUSY",
    });
    const blocked = execution(true);
    const active = blocked.execute(request).catch((e) => e);
    const app = new NodeSearchExecution({
      childPath: path.join(directory, "searchSupervisor.mjs"),
      workerPath: path.join(directory, "searchQuery.mjs"),
      databaseUrl,
    });
    executors.push(app);
    await expect(
      app.execute({
        kind: "notes",
        sessionHash: "not-signed-in",
        conditions: {
          query: "",
          tags: [],
          zone: "UTC",
          layout: "list",
          sort: "updated-desc",
        },
      }),
    ).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
    await blocked.stop();
    await active;
  });
});
