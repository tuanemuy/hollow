import type { VisualSource } from "@repo/core/application/ports/htmlEditor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserHtmlEditor } from "./BrowserHtmlEditor";

type Request = Record<string, unknown> & { id: number };
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  requests: Request[] = [];
  terminate = vi.fn();
  postMessage = vi.fn((request: Request) => {
    this.requests.push(request);
  });
  constructor(
    readonly url: URL,
    readonly options: WorkerOptions,
  ) {
    FakeWorker.instances.push(this);
  }
  reply(value: unknown, id = this.requests.at(-1)?.id) {
    this.onmessage?.({ data: { id, ok: true, value } } as MessageEvent);
  }
}

const visualSource: VisualSource = {
  generation: "g",
  canonical: "<p>A</p>",
  rendered: "<p>A</p>",
  document: "<html><head></head><body><p>A</p></body></html>",
};
let analyzer: BrowserHtmlEditor;
const worker = () => {
  const instance = FakeWorker.instances.at(-1);
  if (!instance) throw new Error("Worker was not created");
  return instance;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal("Worker", FakeWorker);
  FakeWorker.instances = [];
  analyzer = new BrowserHtmlEditor();
});
afterEach(() => {
  analyzer.dispose();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("BrowserHtmlEditor worker lifecycle", () => {
  it("actually times out at 1000ms, terminates, and recovers with a fresh worker", async () => {
    const pending = analyzer
      .diagnose("unchanged input")
      .catch((error: unknown) => error);
    const first = worker();
    expect(first.url.pathname).toMatch(/htmlEditor\.worker\.ts$/);
    expect(first.options).toEqual({ type: "module" });
    await vi.advanceTimersByTimeAsync(999);
    expect(first.terminate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const failure = await pending;
    expect(first.terminate).toHaveBeenCalledTimes(1);
    expect(first.onmessage).toBeNull();
    expect(first.onerror).toBeNull();
    const retry = analyzer.diagnose("unchanged input");
    expect(worker()).not.toBe(first);
    worker().reply([]);
    await expect(retry).resolves.toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain("制限時間");
  });

  it.each([
    "project",
    "patch",
  ] as const)("uses a 2000ms deadline for %s", async (operation) => {
    const pending = (
      operation === "project"
        ? analyzer.project(visualSource)
        : analyzer.patch("g", [])
    ).catch((error: unknown) => error);
    const first = worker();
    expect(first.requests[0]?.operation).toBe(operation);
    await vi.advanceTimersByTimeAsync(1999);
    expect(first.terminate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBeInstanceOf(Error);
    expect(first.terminate).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("terminates an aborted operation, removes its listener and can retry", async () => {
    const controller = new AbortController();
    const removed = vi.spyOn(controller.signal, "removeEventListener");
    const pending = analyzer
      .project(visualSource, controller.signal)
      .catch((error: unknown) => error);
    const first = worker();
    controller.abort();
    expect(await pending).toEqual(
      expect.objectContaining({ message: expect.stringContaining("取り消し") }),
    );
    expect(first.terminate).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    const retry = analyzer.diagnose("retained");
    expect(worker()).not.toBe(first);
    worker().reply([]);
    await expect(retry).resolves.toEqual([]);
    await vi.advanceTimersByTimeAsync(3000);
    expect(worker().terminate).not.toHaveBeenCalled();
  });

  it("does not create a worker or timer for an already aborted request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      analyzer.diagnose("retained", controller.signal),
    ).rejects.toThrow("取り消し");
    expect(FakeWorker.instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores stale IDs and reuses the healthy worker without stale timers", async () => {
    const first = analyzer.diagnose("one");
    const active = worker();
    active.reply([]);
    await expect(first).resolves.toEqual([]);
    const second = analyzer.diagnose("two");
    active.reply(["stale"], active.requests[0]?.id);
    expect(vi.getTimerCount()).toBe(1);
    active.reply([]);
    await expect(second).resolves.toEqual([]);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(active.requests[1]?.id).toBeGreaterThan(active.requests[0]?.id ?? 0);
    await vi.advanceTimersByTimeAsync(3000);
    expect(active.terminate).not.toHaveBeenCalled();
  });

  it("rejects overlap without interrupting the active analysis", async () => {
    const first = analyzer.diagnose("one");
    await expect(analyzer.diagnose("two")).rejects.toThrow("完了を待って");
    expect(worker().requests).toHaveLength(1);
    expect(worker().terminate).not.toHaveBeenCalled();
    worker().reply([]);
    await expect(first).resolves.toEqual([]);
  });

  it("cleans up parser rejection and reuses the worker for recovery", async () => {
    const pending = analyzer.diagnose("bad");
    const active = worker();
    active.onmessage?.({
      data: {
        id: active.requests[0]?.id,
        ok: false,
        message: "input rejected",
      },
    } as MessageEvent);
    await expect(pending).rejects.toThrow("input rejected");
    expect(vi.getTimerCount()).toBe(0);
    const retry = analyzer.diagnose("good");
    active.reply([]);
    await expect(retry).resolves.toEqual([]);
    expect(FakeWorker.instances).toHaveLength(1);
  });

  it("terminates a crashed worker and creates a fresh worker on retry", async () => {
    const pending = analyzer
      .diagnose("retained")
      .catch((error: unknown) => error);
    const first = worker();
    first.onerror?.();
    expect(await pending).toEqual(
      expect.objectContaining({
        message: expect.stringContaining("開始できません"),
      }),
    );
    expect(first.terminate).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    const retry = analyzer.diagnose("retained");
    expect(worker()).not.toBe(first);
    worker().reply([]);
    await expect(retry).resolves.toEqual([]);
  });

  it("explicit dispose rejects pending work and is idempotent", async () => {
    const pending = analyzer
      .diagnose("retained")
      .catch((error: unknown) => error);
    const first = worker();
    analyzer.dispose();
    analyzer.dispose();
    expect(await pending).toBeInstanceOf(Error);
    expect(first.terminate).toHaveBeenCalledTimes(1);
    expect(first.onmessage).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
