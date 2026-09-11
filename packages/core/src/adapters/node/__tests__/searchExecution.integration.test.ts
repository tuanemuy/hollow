import { mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BrowseRequest } from "@repo/core/application/browse/ports";
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
import { IsolatedNoteProjection } from "../browse/isolatedProjection";
import { NodeSearchExecution } from "../browse/searchExecution";

describe("owned search process and projection worker", () => {
  let directory: string;
  let base: TestContainer;
  let databaseUrl: string;
  const executors: NodeSearchExecution[] = [];
  const root = path.resolve(import.meta.dirname, "../../../../../..");
  const request: BrowseRequest = {
    kind: "notes",
    sessionHash: "synthetic-search-session",
    conditions: {
      query: "",
      tags: [],
      zone: "UTC",
      sort: "updated-desc",
      layout: "list",
    },
  };
  beforeAll(async () => {
    directory = await mkdtemp(
      path.join(os.tmpdir(), "hollow-search-runtime-test-"),
    );
    await symlink(
      path.join(root, "packages/core/node_modules"),
      path.join(directory, "node_modules"),
    );
    await build({
      entryPoints: ["searchSupervisor", "searchQuery", "noteProjection"].map(
        (n) => path.join(root, `apps/web/app/worker/node/${n}.ts`),
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
    databaseUrl =
      "file:" +
      String((await base.client.execute("pragma database_list")).rows[0]?.file);
    await base.client.execute({
      sql: "insert into accounts values(?,?,?,?,?)",
      args: [
        "synthetic-search-account",
        "search@example.test",
        "unused",
        Date.now(),
        Date.now(),
      ],
    });
    await base.client.execute({
      sql: "insert into sessions values(?,?,?)",
      args: [
        "synthetic-search-session",
        "synthetic-search-account",
        Date.now() + 60000,
      ],
    });
  });
  afterEach(async () => {
    for (const executor of executors.splice(0)) await executor.stop();
    base.close();
  });
  function execution(long = false) {
    const executor = new NodeSearchExecution({
      childPath: path.join(directory, "searchSupervisor.mjs"),
      workerPath: long
        ? path.join(import.meta.dirname, "fixtures/searchBusyWorker.mjs")
        : path.join(directory, "searchQuery.mjs"),
      databaseUrl,
    });
    executors.push(executor);
    return executor;
  }
  it("reads finite current DTO and releases resources before the next request", async () => {
    const reader = execution();
    for (let i = 0; i < 2; i++)
      expect(await reader.execute(request)).toMatchObject({
        kind: "notes",
        page: { items: [], total: 0 },
      });
    await base.client.execute("delete from sessions");
    await expect(reader.execute(request)).rejects.toMatchObject({
      code: "SESSION_REQUIRED",
    });
  });
  it("bounds queue and terminates native SQL before allowing a new reader", async () => {
    const reader = execution(true);
    const tasks = Array.from({ length: 18 }, () => reader.execute(request));
    const results = await Promise.allSettled(tasks);
    expect(results.every((r) => r.status === "rejected")).toBe(true);
    await reader.stop();
    expect(await execution().execute(request)).toMatchObject({
      kind: "notes",
      page: { total: 0 },
    });
  });
  it("cancels a live native query and stop is idempotent", async () => {
    const reader = execution(true);
    const controller = new AbortController();
    const pending = reader.execute(request, controller.signal);
    setTimeout(() => controller.abort(), 80);
    await expect(pending).rejects.toMatchObject({ code: "EXTERNAL_API_ERROR" });
    await Promise.all([reader.stop(), reader.stop()]);
    await expect(reader.execute(request)).rejects.toMatchObject({
      code: "EXTERNAL_API_ERROR",
    });
    expect(await execution().execute(request)).toMatchObject({ kind: "notes" });
  });
  it("validates full HTML and preserves exact input at the 800KiB boundary", async () => {
    const projection = new IsolatedNoteProjection(
      path.join(directory, "noteProjection.mjs"),
    );
    const html = "<p>" + "a".repeat(819193) + "</p>";
    expect((await projection.project({ title: "self", html })).sourceHtml).toBe(
      html,
    );
    await expect(
      projection.project({ title: "self", html: html + "x" }),
    ).rejects.toMatchObject({ code: "HTML_TOO_LARGE" });
    const controller = new AbortController();
    controller.abort();
    await expect(
      projection.project(
        { title: "self", html: "<p>small</p>" },
        controller.signal,
      ),
    ).rejects.toBeDefined();
    expect(
      (await projection.project({ title: "self", html: "<p>次の正常入力</p>" }))
        .body.display,
    ).toBe("次の正常入力");
  });
});
