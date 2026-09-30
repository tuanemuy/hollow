import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { createNodeShutdown } from "./nodeShutdown";

describe("production Node shutdown integration", () => {
  it("builds and loads the same-directory helper and awaits both drains before shutdown", async () => {
    const launcher = await readFile(
      new URL("./listen.node.mjs", import.meta.url),
      "utf8",
    );
    const builder = await readFile(
      new URL("./build-search.node.mjs", import.meta.url),
      "utf8",
    );
    expect(launcher).toContain(
      'path.join(path.dirname(found), "nodeShutdown.mjs")',
    );
    expect(launcher).toContain("quiesce: booted.quiesce");
    expect(launcher).toContain("await drain()");
    expect(builder).toContain('path.join(root, "scripts/nodeShutdown.ts")');
    expect(builder).toContain('"dist/server/nodeShutdown.mjs"');
    let resolveQuiesce = () => {};
    let resolveListener = () => {};
    const quiesce = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveQuiesce = resolve;
        }),
    );
    const closeListener = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveListener = resolve;
        }),
    );
    const shutdown = vi.fn(async () => {});
    const drain = createNodeShutdown({ quiesce, closeListener, shutdown });
    const first = drain();
    expect(drain()).toBe(first);
    expect(quiesce).toHaveBeenCalledOnce();
    expect(closeListener).toHaveBeenCalledOnce();
    resolveListener();
    await Promise.resolve();
    expect(shutdown).not.toHaveBeenCalled();
    resolveQuiesce();
    await first;
    await drain();
    expect(shutdown).toHaveBeenCalledOnce();
  });
  it("retains failed ownership and permits explicit later drain without reclosing the listener", async () => {
    const quiesce = vi
      .fn()
      .mockRejectedValueOnce(Error("synthetic"))
      .mockResolvedValue(undefined);
    const closeListener = vi.fn(async () => {});
    const shutdown = vi.fn(async () => {});
    const drain = createNodeShutdown({ quiesce, closeListener, shutdown });
    await expect(drain()).rejects.toThrow("NODE_DRAIN_UNPROVEN");
    expect(shutdown).not.toHaveBeenCalled();
    await drain();
    expect(quiesce).toHaveBeenCalledTimes(2);
    expect(closeListener).toHaveBeenCalledOnce();
    expect(shutdown).toHaveBeenCalledOnce();
  });
});
